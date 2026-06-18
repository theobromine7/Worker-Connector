import { Router, type IRouter } from "express";
import { db, applicationsTable, workersTable, jobsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireWorker, requireAdmin, authenticate } from "../middlewares/auth";
import {
  ListJobApplicationsParams,
  ApplyToJobParams,
  UpdateApplicationParams,
  UpdateApplicationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /jobs/:jobId/applications (admin)
router.get("/jobs/:jobId/applications", requireAdmin, async (req, res): Promise<void> => {
  const params = ListJobApplicationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.jobId, params.data.jobId));

  const enriched = await Promise.all(apps.map(async (app) => {
    const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, app.workerId)).limit(1);
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
    return { ...app, worker: worker ?? null, job: job ?? null };
  }));

  res.json(enriched);
});

// POST /jobs/:jobId/applications (worker)
router.post("/jobs/:jobId/applications", requireWorker, async (req, res): Promise<void> => {
  const params = ApplyToJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const existing = await db.select().from(applicationsTable)
    .where(and(eq(applicationsTable.workerId, req.auth!.id), eq(applicationsTable.jobId, params.data.jobId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Already applied to this job" });
    return;
  }

  const [app] = await db.insert(applicationsTable).values({
    workerId: req.auth!.id,
    jobId: params.data.jobId,
    status: "pending",
  }).returning();

  res.status(201).json(app);
});

// PATCH /jobs/:jobId/applications/:applicationId (admin)
router.patch("/jobs/:jobId/applications/:applicationId", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [app] = await db.update(applicationsTable)
    .set({ status: parsed.data.status })
    .where(and(eq(applicationsTable.id, params.data.applicationId), eq(applicationsTable.jobId, params.data.jobId)))
    .returning();

  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  // If accepted, update job status to assigned
  if (parsed.data.status === "accepted") {
    const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, app.workerId)).limit(1);
    await db.update(jobsTable).set({ status: "assigned", assignedWorkerId: app.workerId }).where(eq(jobsTable.id, params.data.jobId));
    res.json({ ...app, worker: worker ?? null });
    return;
  }

  res.json(app);
});

// GET /workers/me/applications (worker)
router.get("/workers/me/applications", requireWorker, async (req, res): Promise<void> => {
  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.workerId, req.auth!.id));

  const enriched = await Promise.all(apps.map(async (app) => {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
    return { ...app, job: job ?? null, worker: null };
  }));

  res.json(enriched);
});

export default router;
