import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useListJobs, useAdminListWorkers, useListPayouts,
  useTriggerPayout, useCompleteJob,
  getListJobsQueryKey, getListPayoutsQueryKey,
  useGetAdminProfile, useUpdateAdminProfile,
  getGetAdminProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CheckCircle2, Clock, Pencil, ArrowRight, Wallet } from "lucide-react";
import { format } from "date-fns";

type PayJob = {
  jobId: number;
  workerId: number;
  workerName: string;
  workerUpi: string | null;
  jobTitle: string;
  amount: number;
};

export default function AdminPayouts() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pendingComplete, setPendingComplete] = useState<{ jobId: number; title: string } | null>(null);
  const [pendingPay, setPendingPay] = useState<PayJob | null>(null);
  const [editingAdminUpi, setEditingAdminUpi] = useState(false);
  const [adminUpiDraft, setAdminUpiDraft] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) setLocation("/admin/login");
  }, [isAuthenticated, isAdmin, setLocation]);

  const { data: allJobs, isLoading: jobsLoading } = useListJobs({ status: undefined });
  const { data: workers } = useAdminListWorkers({});
  const { data: payouts } = useListPayouts({});
  const { data: adminProfile } = useGetAdminProfile();

  const workerMap = new Map(workers?.map((w) => [w.id, w]) ?? []);

  // Map jobId → existing payout (only paid ones count as "done")
  const payoutByJob = new Map(payouts?.map((p) => [p.jobId, p]) ?? []);

  // Jobs that are "assigned" (worker accepted, pending confirmation) or "completed"
  const activeJobs = (allJobs ?? []).filter(
    (j) => (j.status === "assigned" || j.status === "completed") && j.assignedWorkerId != null
  );

  const assignedJobs = activeJobs.filter((j) => j.status === "assigned");
  const completedJobs = activeJobs.filter((j) => j.status === "completed");

  const totalPaid = payouts?.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const updateAdminProfile = useUpdateAdminProfile({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetAdminProfileQueryKey(), data);
        setEditingAdminUpi(false);
        toast({ title: "UPI ID saved" });
      },
      onError: () => toast({ title: "Failed to save UPI ID", variant: "destructive" }),
    },
  });

  const completeJob = useCompleteJob({
    mutation: {
      onSuccess: () => {
        toast({ title: "Job marked as completed" });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        setPendingComplete(null);
      },
      onError: () => toast({ title: "Failed to complete job", variant: "destructive" }),
    },
  });

  const triggerPayout = useTriggerPayout({
    mutation: {
      onSuccess: () => {
        toast({ title: "Payment sent successfully!" });
        queryClient.invalidateQueries({ queryKey: getListPayoutsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        setPendingPay(null);
      },
      onError: () => toast({ title: "Failed to send payment", variant: "destructive" }),
    },
  });

  function buildPayJob(jobId: number): PayJob | null {
    const job = allJobs?.find((j) => j.id === jobId);
    if (!job || !job.assignedWorkerId) return null;
    const worker = workerMap.get(job.assignedWorkerId);
    if (!worker) return null;
    return {
      jobId: job.id,
      workerId: worker.id,
      workerName: worker.name,
      workerUpi: worker.upiId ?? null,
      jobTitle: job.title,
      amount: Number(job.payoutAmount),
    };
  }

  const isLoading = jobsLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Payouts</h2>
          <p className="text-muted-foreground mt-1">Mark jobs done and pay workers directly via UPI</p>
        </div>

        {/* Admin UPI ID */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Your UPI ID (payments sent from)</p>
            {editingAdminUpi ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={adminUpiDraft}
                  onChange={(e) => setAdminUpiDraft(e.target.value)}
                  placeholder="yourname@upi"
                  className="h-8 text-sm max-w-xs"
                />
                <Button size="sm" onClick={() => updateAdminProfile.mutate({ data: { upiId: adminUpiDraft } })} disabled={!adminUpiDraft || updateAdminProfile.isPending}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingAdminUpi(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {adminProfile?.upiId ? (
                  <span className="font-mono text-sm font-medium">{adminProfile.upiId}</span>
                ) : (
                  <span className="text-sm text-amber-600 italic">Set your UPI ID to enable payments</span>
                )}
                <button onClick={() => { setAdminUpiDraft(adminProfile?.upiId ?? ""); setEditingAdminUpi(true); }} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="h-4 w-4 text-amber-600" /></div>
              <div><p className="text-lg font-bold">{assignedJobs.length}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-lg font-bold">{completedJobs.length}</p><p className="text-xs text-muted-foreground">Completed</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-4 w-4 text-primary" /></div>
              <div><p className="text-lg font-bold">₹{totalPaid.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Paid</p></div>
            </div>
          </CardContent></Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : activeJobs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No active jobs with workers assigned yet</p>
            <p className="text-sm text-muted-foreground mt-1">Accept a worker application from the Jobs page to get started</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── In-Progress Jobs ── */}
            {assignedJobs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">In Progress — awaiting customer confirmation</h3>
                {assignedJobs.map((job) => {
                  const worker = workerMap.get(job.assignedWorkerId!);
                  return (
                    <Card key={job.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="mt-0.5 cursor-pointer"
                            onClick={() => setPendingComplete({ jobId: job.id, title: job.title })}
                          >
                            <Checkbox
                              id={`done-${job.id}`}
                              checked={false}
                              onCheckedChange={() => setPendingComplete({ jobId: job.id, title: job.title })}
                              className="w-5 h-5"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-foreground">{job.title}</p>
                                <p className="text-sm text-muted-foreground">{job.location} · {job.skillRequired}</p>
                                {worker && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                                    <span className="text-muted-foreground">Worker:</span>
                                    <span className="font-medium">{worker.name}</span>
                                    {worker.upiId && <span className="text-xs text-muted-foreground font-mono">({worker.upiId})</span>}
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-lg font-bold">₹{Number(job.payoutAmount).toLocaleString()}</p>
                                <Badge variant="secondary" className="text-xs">In Progress</Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">✓ Check when customer confirms work is done</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ── Completed Jobs ── */}
            {completedJobs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completed — ready to pay</h3>
                {completedJobs.map((job) => {
                  const worker = workerMap.get(job.assignedWorkerId!);
                  const existingPayout = payoutByJob.get(job.id);
                  const alreadyPaid = existingPayout?.status === "paid";

                  return (
                    <Card key={job.id} className={alreadyPaid ? "opacity-75" : "border-green-200 bg-green-50/30"}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <CheckCircle2 className={`h-5 w-5 ${alreadyPaid ? "text-muted-foreground" : "text-green-600"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-foreground">{job.title}</p>
                                <p className="text-sm text-muted-foreground">{job.location} · {job.skillRequired}</p>
                                {worker && (
                                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-sm">
                                    <span className="text-muted-foreground">Worker:</span>
                                    <span className="font-medium">{worker.name}</span>
                                    {worker.upiId && <span className="text-xs font-mono text-muted-foreground">({worker.upiId})</span>}
                                  </div>
                                )}
                                {alreadyPaid && existingPayout && (
                                  <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                                    {existingPayout.senderUpiId && <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{existingPayout.senderUpiId}</span>}
                                    {existingPayout.senderUpiId && existingPayout.receiverUpiId && <ArrowRight className="h-3 w-3 shrink-0" />}
                                    {existingPayout.receiverUpiId && <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{existingPayout.receiverUpiId}</span>}
                                    {existingPayout.transactionReference && <span className="ml-1">· {existingPayout.transactionReference}</span>}
                                  </div>
                                )}
                                {job.completionNotes && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">"{job.completionNotes}"</p>
                                )}
                              </div>
                              <div className="text-right shrink-0 space-y-2">
                                <p className="text-lg font-bold">₹{Number(job.payoutAmount).toLocaleString()}</p>
                                {alreadyPaid ? (
                                  <Badge className="bg-green-600 hover:bg-green-600 text-white">Paid</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="gap-1.5"
                                    disabled={!worker}
                                    onClick={() => {
                                      const payJob = buildPayJob(job.id);
                                      if (payJob) setPendingPay(payJob);
                                    }}
                                    data-testid={`button-pay-${job.id}`}
                                  >
                                    <Wallet className="h-3.5 w-3.5" />
                                    Pay Worker
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm mark-done dialog */}
      <AlertDialog open={!!pendingComplete} onOpenChange={() => setPendingComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Customer confirmed?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark <strong>{pendingComplete?.title}</strong> as completed? This confirms the customer is satisfied and enables payment to the worker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingComplete) {
                  completeJob.mutate({ jobId: pendingComplete.jobId, data: { completionNotes: "Customer confirmed via admin panel" } });
                }
              }}
              disabled={completeJob.isPending}
            >
              Yes, Mark Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm payment dialog */}
      <AlertDialog open={!!pendingPay} onOpenChange={() => setPendingPay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Payment</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Send <strong>₹{pendingPay?.amount?.toLocaleString()}</strong> to <strong>{pendingPay?.workerName}</strong> for <em>{pendingPay?.jobTitle}</em>?</p>
                {(adminProfile?.upiId || pendingPay?.workerUpi) && (
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">From (you):</span>
                      <span className="font-mono font-medium">{adminProfile?.upiId ?? <span className="italic text-amber-600">UPI not set</span>}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">To (worker):</span>
                      <span className="font-mono font-medium">{pendingPay?.workerUpi ?? <span className="italic text-amber-600">No UPI registered</span>}</span>
                    </div>
                  </div>
                )}
                {!pendingPay?.workerUpi && (
                  <p className="text-xs text-amber-600">⚠ Worker has no UPI ID — payment will be recorded but no UPI transfer will occur until they add one.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={triggerPayout.isPending}
              onClick={() => {
                if (pendingPay) {
                  triggerPayout.mutate({
                    data: {
                      workerId: pendingPay.workerId,
                      jobId: pendingPay.jobId,
                      amount: pendingPay.amount,
                      senderUpiId: adminProfile?.upiId ?? undefined,
                    },
                  });
                }
              }}
              data-testid="button-final-confirm-payout"
            >
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
