import { useEffect } from "react";
import { useLocation } from "wouter";
import { useListMyApplications } from "@workspace/api-client-react";
import WorkerLayout from "@/components/worker-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, MapPin, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function WorkerApplications() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isWorker } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !isWorker) setLocation("/login");
  }, [isAuthenticated, isWorker, setLocation]);

  const { data: applications, isLoading } = useListMyApplications();

  const grouped = {
    accepted: applications?.filter((a) => a.status === "accepted") ?? [],
    pending: applications?.filter((a) => a.status === "pending") ?? [],
    rejected: applications?.filter((a) => a.status === "rejected") ?? [],
  };

  return (
    <WorkerLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Applications</h2>
          <p className="text-muted-foreground mt-1">Track your job application statuses</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", count: applications?.length ?? 0, color: "text-foreground" },
            { label: "Accepted", count: grouped.accepted.length, color: "text-primary" },
            { label: "Pending", count: grouped.pending.length, color: "text-amber-600" },
          ].map(({ label, count, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : !applications?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No applications yet</p>
            <p className="text-muted-foreground text-sm mt-1">Go to Jobs to apply</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((application) => {
              const config = statusConfig[application.status] ?? statusConfig.pending;
              return (
                <Card key={application.id} className="hover:shadow-sm transition-shadow" data-testid={`card-application-${application.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{application.job?.title ?? "Job"}</CardTitle>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {application.job?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {application.job.location}
                        </span>
                      )}
                      {application.job?.payoutAmount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          ₹{Number(application.job.payoutAmount).toLocaleString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Applied {format(new Date(application.appliedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
