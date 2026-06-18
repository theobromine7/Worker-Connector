import { Router, type IRouter } from "express";
import { db, workersTable, jobsTable, payoutsTable } from "@workspace/db";
import { eq, sql, count, sum } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

// GET /analytics/dashboard
router.get("/analytics/dashboard", requireAdmin, async (req, res): Promise<void> => {
  const [workerStats] = await db.select({
    total: count(),
    active: sql<number>`count(*) filter (where ${workersTable.isOnline} = true)`,
  }).from(workersTable);

  const [jobStats] = await db.select({
    total: count(),
    open: sql<number>`count(*) filter (where ${jobsTable.status} = 'open')`,
    completed: sql<number>`count(*) filter (where ${jobsTable.status} = 'completed')`,
  }).from(jobsTable);

  const [payoutStats] = await db.select({
    total: count(),
    pending: sql<number>`count(*) filter (where ${payoutsTable.status} = 'pending')`,
    totalPaid: sql<number>`coalesce(sum(case when ${payoutsTable.status} = 'paid' then ${payoutsTable.amount}::numeric else 0 end), 0)`,
  }).from(payoutsTable);

  res.json({
    totalWorkers: Number(workerStats?.total ?? 0),
    activeWorkers: Number(workerStats?.active ?? 0),
    totalJobs: Number(jobStats?.total ?? 0),
    openJobs: Number(jobStats?.open ?? 0),
    completedJobs: Number(jobStats?.completed ?? 0),
    totalPayouts: Number(payoutStats?.total ?? 0),
    pendingPayouts: Number(payoutStats?.pending ?? 0),
    totalPaidAmount: Number(payoutStats?.totalPaid ?? 0),
  });
});

// GET /analytics/payouts-report
router.get("/analytics/payouts-report", requireAdmin, async (req, res): Promise<void> => {
  const bySkillRaw = await db
    .select({
      skill: workersTable.skill,
      totalAmount: sql<number>`coalesce(sum(${payoutsTable.amount}::numeric), 0)`,
      count: count(),
    })
    .from(payoutsTable)
    .leftJoin(workersTable, eq(payoutsTable.workerId, workersTable.id))
    .groupBy(workersTable.skill);

  const byMonthRaw = await db
    .select({
      month: sql<string>`to_char(${payoutsTable.createdAt}, 'Mon YYYY')`,
      totalAmount: sql<number>`coalesce(sum(${payoutsTable.amount}::numeric), 0)`,
      count: count(),
    })
    .from(payoutsTable)
    .groupBy(sql`to_char(${payoutsTable.createdAt}, 'Mon YYYY')`)
    .orderBy(sql`min(${payoutsTable.createdAt})`);

  res.json({
    bySkill: bySkillRaw.map((r) => ({ skill: r.skill ?? "Unknown", totalAmount: Number(r.totalAmount), count: Number(r.count) })),
    byMonth: byMonthRaw.map((r) => ({ month: r.month, totalAmount: Number(r.totalAmount), count: Number(r.count) })),
  });
});

// GET /analytics/job-stats
router.get("/analytics/job-stats", requireAdmin, async (req, res): Promise<void> => {
  const bySkillRaw = await db
    .select({
      skill: jobsTable.skillRequired,
      count: count(),
    })
    .from(jobsTable)
    .groupBy(jobsTable.skillRequired);

  const byStatusRaw = await db
    .select({
      status: jobsTable.status,
      count: count(),
    })
    .from(jobsTable)
    .groupBy(jobsTable.status);

  res.json({
    bySkill: bySkillRaw.map((r) => ({ skill: r.skill, count: Number(r.count) })),
    byStatus: byStatusRaw.map((r) => ({ status: r.status, count: Number(r.count) })),
  });
});

export default router;
