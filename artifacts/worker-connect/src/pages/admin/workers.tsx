import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAdminListWorkers, useSuspendWorker, getAdminListWorkersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Phone, MapPin, Briefcase, ShieldOff, ShieldCheck } from "lucide-react";
import { SKILL_CATEGORIES } from "@/lib/constants";

export default function AdminWorkers() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<{ id: number; name: string; isSuspended: boolean } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) setLocation("/admin/login");
  }, [isAuthenticated, isAdmin, setLocation]);

  const { data: workers, isLoading } = useAdminListWorkers({ skill: skillFilter !== "all" ? skillFilter : undefined });

  const suspend = useSuspendWorker({
    mutation: {
      onSuccess: (_, variables) => {
        const action = variables.data.isSuspended ? "suspended" : "unsuspended";
        toast({ title: `Worker ${action} successfully` });
        queryClient.invalidateQueries({ queryKey: getAdminListWorkersQueryKey() });
        setSuspendTarget(null);
      },
      onError: () => {
        toast({ title: "Action failed", variant: "destructive" });
      },
    },
  });

  const filtered = workers?.filter((w) =>
    search
      ? w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.phone.includes(search) ||
        w.city.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Workers</h2>
            <p className="text-muted-foreground mt-1">{workers?.length ?? 0} registered workers</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-workers"
            />
          </div>
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-skill-filter">
              <SelectValue placeholder="All Skills" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              {SKILL_CATEGORIES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No workers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((worker) => (
              <Card key={worker.id} className={worker.isSuspended ? "opacity-70" : ""} data-testid={`card-worker-${worker.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                        {worker.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{worker.name}</p>
                          <Badge variant={worker.isOnline ? "default" : "secondary"} className="text-xs">
                            {worker.isOnline ? "Online" : "Offline"}
                          </Badge>
                          {worker.isSuspended && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{worker.phone}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{worker.city}</span>
                          <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{worker.skill}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={worker.isSuspended ? "outline" : "destructive"}
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => setSuspendTarget({ id: worker.id, name: worker.name, isSuspended: worker.isSuspended })}
                      data-testid={`button-suspend-worker-${worker.id}`}
                    >
                      {worker.isSuspended
                        ? <><ShieldCheck className="h-3.5 w-3.5" />Reinstate</>
                        : <><ShieldOff className="h-3.5 w-3.5" />Suspend</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!suspendTarget} onOpenChange={() => setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendTarget?.isSuspended ? "Reinstate Worker" : "Suspend Worker"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget?.isSuspended
                ? `Are you sure you want to reinstate ${suspendTarget?.name}? They will be able to apply to jobs again.`
                : `Are you sure you want to suspend ${suspendTarget?.name}? They will lose access to the platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={suspendTarget?.isSuspended ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
              onClick={() => {
                if (suspendTarget) {
                  suspend.mutate({ workerId: suspendTarget.id, data: { isSuspended: !suspendTarget.isSuspended } });
                }
              }}
              data-testid="button-confirm-suspend"
            >
              {suspendTarget?.isSuspended ? "Reinstate" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
