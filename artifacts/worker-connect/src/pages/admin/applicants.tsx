import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  useListJobApplications, useUpdateApplication, useGetJob,
  getListJobApplicationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Phone, MapPin, Briefcase, Check, X, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function AdminApplicants() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const params = useParams<{ jobId: string }>();
  const jobId = parseInt(params.jobId ?? "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) setLocation("/admin/login");
  }, [isAuthenticated, isAdmin, setLocation]);

  const { data: job } = useGetJob(jobId, { query: { enabled: !!jobId, queryKey: ["getJob", jobId] } });
  const { data: applications, isLoading } = useListJobApplications(jobId, { query: { enabled: !!jobId, queryKey: ["listJobApplications", jobId] } });

  const updateApp = useUpdateApplication({
    mutation: {
      onSuccess: (_, variables) => {
        const action = variables.data.status === "accepted" ? "accepted" : "rejected";
        toast({ title: `Applicant ${action}` });
        queryClient.invalidateQueries({ queryKey: getListJobApplicationsQueryKey(jobId) });
      },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/jobs" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Applicants</h2>
            {job && <p className="text-muted-foreground mt-0.5">For: {job.title}</p>}
          </div>
        </div>

        {job && (
          <Card className="bg-secondary/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                <span className="flex items-center gap-1 text-primary font-medium"><Briefcase className="h-3.5 w-3.5" />{job.skillRequired}</span>
                <span className="font-medium">₹{Number(job.payoutAmount).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : !applications?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No applications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const config = statusConfig[app.status] ?? statusConfig.pending;
              return (
                <Card key={app.id} data-testid={`card-applicant-${app.id}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                          {app.worker?.name.charAt(0).toUpperCase() ?? "W"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{app.worker?.name ?? "Worker"}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                            {app.worker?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.worker.phone}</span>}
                            {app.worker?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.worker.city}</span>}
                            {app.worker?.skill && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{app.worker.skill}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={config.variant}>{config.label}</Badge>
                        {app.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1 text-primary border-primary/30 hover:bg-primary/5"
                              onClick={() => updateApp.mutate({ jobId, applicationId: app.id, data: { status: "accepted" } })}
                              disabled={updateApp.isPending}
                              data-testid={`button-accept-${app.id}`}>
                              <Check className="h-3.5 w-3.5" />Accept
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                              onClick={() => updateApp.mutate({ jobId, applicationId: app.id, data: { status: "rejected" } })}
                              disabled={updateApp.isPending}
                              data-testid={`button-reject-${app.id}`}>
                              <X className="h-3.5 w-3.5" />Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
