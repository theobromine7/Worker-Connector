import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useListJobs, useApplyToJob, useListMyApplications, getListJobsQueryKey, getListMyApplicationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import WorkerLayout from "@/components/worker-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MapPin, DollarSign, Briefcase, Search, Filter } from "lucide-react";
import { SKILL_CATEGORIES } from "@/lib/constants";

export default function WorkerDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isWorker } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [skillFilter, setSkillFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !isWorker) {
      setLocation("/login");
    }
  }, [isAuthenticated, isWorker, setLocation]);

  const { data: jobs, isLoading } = useListJobs({
    skill: skillFilter !== "all" ? skillFilter : undefined,
    location: locationFilter || undefined,
    status: "open",
  });

  const { data: myApplications } = useListMyApplications();

  const applyToJob = useApplyToJob({
    mutation: {
      onSuccess: () => {
        toast({ title: "Application submitted successfully" });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ status: "open" }) });
        queryClient.invalidateQueries({ queryKey: getListMyApplicationsQueryKey() });
      },
      onError: (err: { status?: number }) => {
        if (err?.status === 409) {
          toast({ title: "You already applied to this job", variant: "destructive" });
        } else {
          toast({ title: "Failed to apply", variant: "destructive" });
        }
      },
    },
  });

  const appliedJobIds = new Set(myApplications?.map((a) => a.jobId) ?? []);

  const filteredJobs = jobs?.filter((job) =>
    search
      ? job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.description.toLowerCase().includes(search.toLowerCase()) ||
        job.location.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <WorkerLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Available Jobs</h2>
          <p className="text-muted-foreground mt-1">Browse and apply to jobs matching your skills</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-jobs"
            />
          </div>
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-skill-filter">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Skills" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              {SKILL_CATEGORIES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full sm:w-44"
            data-testid="input-location-filter"
          />
        </div>

        {/* Job list */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : !filteredJobs?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No jobs available right now</p>
            <p className="text-muted-foreground text-sm mt-1">Check back later or adjust your filters</p>
            {(skillFilter || locationFilter || search) && (
              <Button variant="ghost" className="mt-3" onClick={() => { setSkillFilter(""); setLocationFilter(""); setSearch(""); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => {
              const hasApplied = appliedJobIds.has(job.id);
              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow" data-testid={`card-job-${job.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{job.title}</CardTitle>
                      <Badge variant="secondary" className="shrink-0 text-xs">{job.skillRequired}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                        <span className="text-primary">₹{Number(job.payoutAmount).toLocaleString()}</span>
                      </div>
                      <Button
                        size="sm"
                        disabled={hasApplied || applyToJob.isPending}
                        variant={hasApplied ? "secondary" : "default"}
                        onClick={() => !hasApplied && applyToJob.mutate({ jobId: job.id })}
                        data-testid={`button-apply-job-${job.id}`}
                      >
                        {hasApplied ? "Applied" : "Apply"}
                      </Button>
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
