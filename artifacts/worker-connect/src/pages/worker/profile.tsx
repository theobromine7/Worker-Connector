import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetWorkerProfile, useUpdateWorkerProfile, getGetWorkerProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import WorkerLayout from "@/components/worker-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, MapPin, Briefcase, Edit2, Check, X, CreditCard } from "lucide-react";
import { format } from "date-fns";

export default function WorkerProfile() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isWorker } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", upiId: "" });

  useEffect(() => {
    if (!isAuthenticated || !isWorker) setLocation("/login");
  }, [isAuthenticated, isWorker, setLocation]);

  const { data: worker, isLoading } = useGetWorkerProfile();

  useEffect(() => {
    if (worker) {
      setForm({ name: worker.name, city: worker.city, upiId: worker.upiId ?? "" });
    }
  }, [worker]);

  const update = useUpdateWorkerProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorkerProfileQueryKey() });
        setEditing(false);
        toast({ title: "Profile updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update profile", variant: "destructive" });
      },
    },
  });

  function handleSave() {
    update.mutate({ data: { name: form.name, city: form.city, upiId: form.upiId || undefined } });
  }

  if (isLoading) {
    return (
      <WorkerLayout>
        <div className="space-y-4 max-w-lg">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <div className="space-y-6 max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Profile</h2>
            <p className="text-muted-foreground mt-1">Manage your worker profile</p>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="button-edit-profile">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {worker && (
          <>
            {/* Avatar & basic info */}
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                    {worker.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{worker.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={worker.isOnline ? "default" : "secondary"}>
                        {worker.isOnline ? "Online" : "Offline"}
                      </Badge>
                      <Badge variant={worker.isSuspended ? "destructive" : "outline"}>
                        {worker.isSuspended ? "Suspended" : "Active"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Member since {format(new Date(worker.createdAt), "MMMM yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        data-testid="input-edit-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        data-testid="input-edit-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>UPI ID</Label>
                      <Input
                        value={form.upiId}
                        onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                        placeholder="name@upi"
                        data-testid="input-edit-upi"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} disabled={update.isPending} className="gap-2" data-testid="button-save-profile">
                        <Check className="h-4 w-4" />
                        {update.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)} className="gap-2">
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{worker.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{worker.city}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{worker.skill}</span>
                    </div>
                    {worker.upiId && (
                      <div className="flex items-center gap-3 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>{worker.upiId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Subscription: <Badge variant="outline">{worker.subscriptionStatus}</Badge></span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </WorkerLayout>
  );
}
