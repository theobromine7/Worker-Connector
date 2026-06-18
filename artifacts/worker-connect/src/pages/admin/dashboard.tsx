import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetDashboardStats, useGetJobStats, useGetPayoutsReport } from "@workspace/api-client-react";
import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, DollarSign, TrendingUp, Activity, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) setLocation("/admin/login");
  }, [isAuthenticated, isAdmin, setLocation]);

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: jobStats, isLoading: jobStatsLoading } = useGetJobStats();
  const { data: payoutsReport, isLoading: payoutsLoading } = useGetPayoutsReport();

  const statCards = stats ? [
    { label: "Total Workers", value: stats.totalWorkers, sub: `${stats.activeWorkers} online`, icon: Users, color: "text-blue-600" },
    { label: "Total Jobs", value: stats.totalJobs, sub: `${stats.openJobs} open`, icon: Briefcase, color: "text-indigo-600" },
    { label: "Completed Jobs", value: stats.completedJobs, icon: Activity, color: "text-emerald-600" },
    { label: "Total Paid", value: `₹${Number(stats.totalPaidAmount).toLocaleString()}`, sub: `${stats.pendingPayouts} pending`, icon: DollarSign, color: "text-amber-600" },
  ] : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Platform overview and analytics</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            : statCards.map(({ label, value, sub, icon: Icon, color }) => (
              <Card key={label} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                    </div>
                    <Icon className={`h-5 w-5 ${color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Jobs by skill */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Jobs by Skill</CardTitle>
            </CardHeader>
            <CardContent>
              {jobStatsLoading ? (
                <Skeleton className="h-48" />
              ) : jobStats?.bySkill?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={jobStats.bySkill} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="skill" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split(" ")[0]} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              )}
            </CardContent>
          </Card>

          {/* Payout trends */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payout Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <Skeleton className="h-48" />
              ) : payoutsReport?.byMonth?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={payoutsReport.byMonth} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [`₹${Number(v).toLocaleString()}`, "Amount"]}
                    />
                    <Line type="monotone" dataKey="totalAmount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Jobs by status */}
        {jobStats?.byStatus && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Jobs by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {jobStats.byStatus.map(({ status, count }) => (
                  <div key={status} className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2">
                    <span className="text-sm font-medium capitalize">{status}</span>
                    <span className="text-lg font-bold text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
