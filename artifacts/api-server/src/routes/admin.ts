import { Router, type IRouter } from "express";
import { db, workersTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import {
  AdminListWorkersQueryParams,
  AdminGetWorkerParams,
  SuspendWorkerParams,
  SuspendWorkerBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /admin/workers
router.get("/admin/workers", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListWorkersQueryParams.safeParse(req.query);
  const filters: SQL[] = [];

  if (parsed.success) {
    if (parsed.data.skill) filters.push(eq(workersTable.skill, parsed.data.skill));
    if (parsed.data.subscriptionStatus) filters.push(eq(workersTable.subscriptionStatus, parsed.data.subscriptionStatus));
    if (parsed.data.isSuspended !== undefined) filters.push(eq(workersTable.isSuspended, parsed.data.isSuspended));
  }

  const workers = await db.select().from(workersTable).where(filters.length ? and(...filters) : undefined).orderBy(workersTable.createdAt);
  res.json(workers);
});

// GET /admin/workers/:workerId
router.get("/admin/workers/:workerId", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminGetWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid worker ID" });
    return;
  }
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, params.data.workerId)).limit(1);
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  res.json(worker);
});

// POST /admin/workers/:workerId/suspend
router.post("/admin/workers/:workerId/suspend", requireAdmin, async (req, res): Promise<void> => {
  const params = SuspendWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid worker ID" });
    return;
  }
  const parsed = SuspendWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [worker] = await db.update(workersTable).set({ isSuspended: parsed.data.isSuspended }).where(eq(workersTable.id, params.data.workerId)).returning();
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  res.json(worker);
});

export default router;
