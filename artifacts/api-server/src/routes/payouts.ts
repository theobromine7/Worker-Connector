import { Router, type IRouter } from "express";
import { db, payoutsTable, workersTable, jobsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { requireAdmin, requireWorker } from "../middlewares/auth";
import {
  ListPayoutsQueryParams,
  TriggerPayoutBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPayouts(payouts: typeof payoutsTable.$inferSelect[]) {
  return Promise.all(payouts.map(async (p) => {
    const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, p.workerId)).limit(1);
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, p.jobId)).limit(1);
    return { ...p, worker: worker ?? null, job: job ?? null };
  }));
}

// GET /payouts (admin)
router.get("/payouts", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListPayoutsQueryParams.safeParse(req.query);
  const filters: SQL[] = [];

  if (parsed.success) {
    if (parsed.data.workerId) filters.push(eq(payoutsTable.workerId, parsed.data.workerId));
    if (parsed.data.status) filters.push(eq(payoutsTable.status, parsed.data.status));
  }

  const payouts = await db.select().from(payoutsTable).where(filters.length ? and(...filters) : undefined).orderBy(payoutsTable.createdAt);
  const enriched = await enrichPayouts(payouts);
  res.json(enriched);
});

// POST /payouts (admin)
router.post("/payouts", requireAdmin, async (req, res): Promise<void> => {
  const parsed = TriggerPayoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [payout] = await db.insert(payoutsTable).values({
    workerId: parsed.data.workerId,
    jobId: parsed.data.jobId,
    amount: String(parsed.data.amount),
    status: "pending",
    transactionReference: null,
    paidAt: null,
  }).returning();

  // In production: call Razorpay Payouts API here
  // For now, simulate processing
  const txRef = `WC-${Date.now()}-${payout.id}`;
  const [updated] = await db.update(payoutsTable)
    .set({ status: "paid", transactionReference: txRef, paidAt: new Date() })
    .where(eq(payoutsTable.id, payout.id))
    .returning();

  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, updated.workerId)).limit(1);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, updated.jobId)).limit(1);

  res.status(201).json({ ...updated, worker: worker ?? null, job: job ?? null });
});

// GET /payouts/me (worker)
router.get("/payouts/me", requireWorker, async (req, res): Promise<void> => {
  const payouts = await db.select().from(payoutsTable).where(eq(payoutsTable.workerId, req.auth!.id)).orderBy(payoutsTable.createdAt);
  const enriched = await enrichPayouts(payouts);
  res.json(enriched);
});

export default router;
