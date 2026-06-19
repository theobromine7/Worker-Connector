import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useListJobs, useCreateJob, useUpdateJob, useCancelJob, useCompleteJob,
  getListJobsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MapPin, DollarSign, Users, XCircle, CheckCircle2, Edit, Briefcase } from "lucide-react";
import { SKILL_CATEGORIES } from "@/lib/constants";
import { Link } from "wouter";

const JOB_STATUSES = ["open", "assigned", "completed", "cancelled"];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Open", variant: "default" },
  assigned: { label: "Assigned", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

type JobForm = { title: string; description: string; skillRequired: string; location: string; payoutAmount: string };
const EMPTY_FORM: JobForm = { title: "", description: "", skillRequired: "", location: "", payoutAmount: "" };

export default function AdminJobs() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editJob, setEditJob] = useState<{ id: number; form: JobForm } | null>(null);
  const [cancelJobId, setCancelJobId] = useState<number | null>(null);
  const [completeTarget, setCompleteTarget] = useState<{ id: number; notes: string } | null>(null);

  const [form, setForm] = useState<JobForm>(EMPTY_FORM);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) setLocation("/admin/login");
  }, [isAuthenticated, isAdmin, setLocation]);

  const { data: jobs, isLoading } = useListJobs({ skill: skillFilter !== "all" ? skillFilter : undefined, status: statusFilter !== "all" ? statusFilter : undefined });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });

  const createJob = useCreateJob({ mutation: { onSuccess: () => { toast({ title: "Job created" }); invalidate(); setCreateOpen(false); setForm(EMPTY_FORM); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });
  const updateJob = useUpdateJob({ mutation: { onSuccess: () => { toast({ title: "Job updated" }); invalidate(); setEditJob(null); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });
  const cancelJob = useCancelJob({ mutation: { onSuccess: () => { toast({ title: "Job cancelled" }); invalidate(); setCancelJobId(null); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });
  const completeJob = useCompleteJob({ mutation: { onSuccess: () => { toast({ title: "Job marked complete" }); invalidate(); setCompleteTarget(null); }, onError: () => toast({ title: "Failed", variant: "destructive" }) } });

  const filtered = jobs?.filter((j) => search
    ? j.title.toLowerCase().includes(search.toLowerCase()) || j.location.toLowerCase().includes(search.toLowerCase())
    : true
  );

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createJob.mutate({ data: { ...form, payoutAmount: parseFloat(form.payoutAmount) } });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editJob) return;
    updateJob.mutate({ jobId: editJob.id, data: { ...editJob.form, payoutAmount: parseFloat(editJob.form.payoutAmount) } });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Jobs</h2>
            <p className="text-muted-foreground mt-1">{jobs?.length ?? 0} total jobs</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2" data-testid="button-create-job">
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-jobs" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {JOB_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Skills" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              {SKILL_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : !filtered?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No jobs found</p>
            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create Job</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => {
              const config = statusConfig[job.status] ?? statusConfig.open;
              return (
                <Card key={job.id} data-testid={`card-job-${job.id}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{job.title}</p>
                          <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                          <Badge variant="outline" className="text-xs">{job.skillRequired}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{job.description}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                          <span className="flex items-center gap-1 text-primary font-medium"><DollarSign className="h-3 w-3" />₹{Number(job.payoutAmount).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {(job.status === "open" || job.status === "assigned") && (
                          <Link href={`/admin/jobs/${job.id}/applicants`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors" data-testid={`button-applicants-${job.id}`}>
                            <Users className="h-3.5 w-3.5" />
                            Applicants
                          </Link>
                        )}
                        {job.status === "open" && (
                          <>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditJob({ id: job.id, form: { title: job.title, description: job.description, skillRequired: job.skillRequired, location: job.location, payoutAmount: String(job.payoutAmount) } })} data-testid={`button-edit-job-${job.id}`}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => setCancelJobId(job.id)} data-testid={`button-cancel-job-${job.id}`}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {job.status === "assigned" && (
                          <Button size="sm" className="gap-1" onClick={() => setCompleteTarget({ id: job.id, notes: "" })} data-testid={`button-complete-job-${job.id}`}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete
                          </Button>
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

      {/* Create job dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Job</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-2"><Label>Title</Label><Input placeholder="e.g. Fix electrical wiring" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required data-testid="input-job-title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe the job..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required data-testid="input-job-description" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Skill Required</Label>
                <Select value={form.skillRequired || undefined} onValueChange={(v) => setForm({ ...form, skillRequired: v })}>
                  <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                  <SelectContent>{SKILL_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Payout (₹)</Label><Input type="number" placeholder="500" value={form.payoutAmount} onChange={(e) => setForm({ ...form, payoutAmount: e.target.value })} required data-testid="input-job-payout" /></div>
            </div>
            <div className="space-y-2"><Label>Location</Label><Input placeholder="Mumbai, Maharashtra" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required data-testid="input-job-location" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createJob.isPending} data-testid="button-confirm-create-job">{createJob.isPending ? "Creating..." : "Create Job"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit job dialog */}
      <Dialog open={!!editJob} onOpenChange={() => setEditJob(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
          {editJob && (
            <form onSubmit={handleUpdate} className="space-y-4 mt-2">
              <div className="space-y-2"><Label>Title</Label><Input value={editJob.form.title} onChange={(e) => setEditJob({ ...editJob, form: { ...editJob.form, title: e.target.value } })} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={editJob.form.description} onChange={(e) => setEditJob({ ...editJob, form: { ...editJob.form, description: e.target.value } })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Skill</Label>
                  <Select value={editJob.form.skillRequired || undefined} onValueChange={(v) => setEditJob({ ...editJob, form: { ...editJob.form, skillRequired: v } })}>
                    <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                    <SelectContent>{SKILL_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Payout (₹)</Label><Input type="number" value={editJob.form.payoutAmount} onChange={(e) => setEditJob({ ...editJob, form: { ...editJob.form, payoutAmount: e.target.value } })} required /></div>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input value={editJob.form.location} onChange={(e) => setEditJob({ ...editJob, form: { ...editJob.form, location: e.target.value } })} required /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditJob(null)}>Cancel</Button>
                <Button type="submit" disabled={updateJob.isPending}>{updateJob.isPending ? "Saving..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelJobId} onOpenChange={() => setCancelJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job</AlertDialogTitle>
            <AlertDialogDescription>This will cancel the job. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Job</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => cancelJobId && cancelJob.mutate({ jobId: cancelJobId })} data-testid="button-confirm-cancel">Cancel Job</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete dialog */}
      <Dialog open={!!completeTarget} onOpenChange={() => setCompleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Job as Completed</DialogTitle></DialogHeader>
          {completeTarget && (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Completion Notes</Label>
                <Textarea placeholder="Describe how the job was completed..." value={completeTarget.notes} onChange={(e) => setCompleteTarget({ ...completeTarget, notes: e.target.value })} data-testid="input-completion-notes" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCompleteTarget(null)}>Cancel</Button>
                <Button onClick={() => completeJob.mutate({ jobId: completeTarget.id, data: { completionNotes: completeTarget.notes } })} disabled={completeJob.isPending} data-testid="button-confirm-complete">{completeJob.isPending ? "Saving..." : "Mark Complete"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
