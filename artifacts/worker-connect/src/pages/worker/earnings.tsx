import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetWorkerEarnings } from "@workspace/api-client-react";
import WorkerLayout from "@/components/worker-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Briefcase, Clock } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "outline" },
  paid: { label: "Paid", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export default function WorkerEarnings() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isWorker } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !isWorker) setLocation("/login");
  }, [isAuthenticated, isWorker, setLocation]);

  const { data: earnings, isLoading } = useGetWorkerEarnings();

  return (
    <WorkerLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Earnings</h2>
          <p className="text-muted-foreground mt-1">Your earnings history and payout status</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : earnings && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">₹{Number(earnings.totalEarned).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{earnings.totalJobs}</p>
                    <p className="text-sm text-muted-foreground">Jobs Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-3">Payout History</h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : !earnings?.payouts?.length ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No payouts yet</p>
              <p className="text-muted-foreground text-sm mt-1">Complete jobs to receive payouts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {earnings.payouts.map((payout) => {
                const config = statusConfig[payout.status] ?? statusConfig.pending;
                return (
                  <Card key={payout.id} data-testid={`card-payout-${payout.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{payout.job?.title ?? `Job #${payout.jobId}`}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(payout.createdAt), "MMM d, yyyy")}
                            </span>
                            {payout.transactionReference && (
                              <span>Ref: {payout.transactionReference}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-bold text-foreground">₹{Number(payout.amount).toLocaleString()}</p>
                          <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
