import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useListPayouts, useTriggerPayout, useAdminListWorkers, useListJobs, getListPayoutsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "outline" },
  paid: { label: "Paid", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

type PayoutForm = { workerId: string; jobId: string; amount: string };

export default function AdminPayouts() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [confirmPayout, setConfirmPayout] = useState<PayoutForm | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<PayoutForm>({ workerId: "", jobId: "", amount: "" });

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) setLocation("/admin/login");
  }, [isAuthenticated, isAdmin, setLocation]);

  const { data: payouts, isLoading } = useListPayouts({ status: statusFilter !== "all" ? statusFilter : undefined });
  const { data: workers } = useAdminListWorkers({});
  const { data: jobs } = useListJobs({ status: undefined });

  const trigger = useTriggerPayout({
    mutation: {
      onSuccess: () => {
        toast({ title: "Payout triggered successfully" });
        queryClient.invalidateQueries({ queryKey: getListPayoutsQueryKey() });
        setCreateOpen(false);
        setConfirmPayout(null);
        setForm({ workerId: "", jobId: "", amount: "" });
      },
      onError: () => toast({ title: "Failed to trigger payout", variant: "destructive" }),
    },
  });

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConfirmPayout(form);
    setCreateOpen(false);
  }

  const totalPaid = payouts?.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const pendingCount = payouts?.filter((p) => p.status === "pending").length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Payouts</h2>
            <p className="text-muted-foreground mt-1">Manage worker payouts</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2" data-testid="button-trigger-payout">
            <Plus className="h-4 w-4" />
            Trigger Payout
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-4 w-4 text-primary" /></div>
              <div><p className="text-xl font-bold">₹{totalPaid.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Paid</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"><Clock className="h-4 w-4 text-muted-foreground" /></div>
              <div><p className="text-xl font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground">Pending</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"><CheckCircle className="h-4 w-4 text-muted-foreground" /></div>
              <div><p className="text-xl font-bold">{payouts?.length ?? 0}</p><p className="text-xs text-muted-foreground">Total Payouts</p></div>
            </div>
          </CardContent></Card>
        </div>

        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {["pending", "processing", "paid", "failed"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : !payouts?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No payouts yet</p>
            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Trigger Payout</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => {
              const config = statusConfig[payout.status] ?? statusConfig.pending;
              return (
                <Card key={payout.id} data-testid={`card-payout-${payout.id}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{payout.worker?.name ?? `Worker #${payout.workerId}`}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{payout.job?.title ?? `Job #${payout.jobId}`}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(payout.createdAt), "MMM d, yyyy")}</span>
                          {payout.transactionReference && <span>Ref: {payout.transactionReference}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-lg font-bold text-foreground">₹{Number(payout.amount).toLocaleString()}</p>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create payout dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Trigger Payout</DialogTitle></DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Worker</Label>
              <Select value={form.workerId} onValueChange={(v) => setForm({ ...form, workerId: v })}>
                <SelectTrigger data-testid="select-payout-worker"><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>{workers?.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name} — {w.phone}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Completed Job</Label>
              <Select value={form.jobId} onValueChange={(v) => setForm({ ...form, jobId: v })}>
                <SelectTrigger data-testid="select-payout-job"><SelectValue placeholder="Select job" /></SelectTrigger>
                <SelectContent>{jobs?.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" placeholder="500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required data-testid="input-payout-amount" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.workerId || !form.jobId || !form.amount} data-testid="button-confirm-trigger">Review Payout</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm payout dialog */}
      <AlertDialog open={!!confirmPayout} onOpenChange={() => setConfirmPayout(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payout</AlertDialogTitle>
            <AlertDialogDescription>
              Trigger a payout of <strong>₹{confirmPayout?.amount}</strong> to the selected worker? This will initiate the payment process.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmPayout(null); setCreateOpen(true); }}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmPayout) {
                  trigger.mutate({ data: { workerId: parseInt(confirmPayout.workerId), jobId: parseInt(confirmPayout.jobId), amount: parseFloat(confirmPayout.amount) } });
                }
              }}
              data-testid="button-final-confirm-payout"
            >
              Confirm Payout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
