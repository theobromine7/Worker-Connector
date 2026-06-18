import { Router, type IRouter } from "express";
import { db, jobsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { authenticate } from "../middlewares/auth";
import {
  CreateJobBody,
  ListJobsQueryParams,
  GetJobParams,
  UpdateJobParams,
  CancelJobParams,
  CompleteJobParams,
  CompleteJobBody,
  UpdateJobBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /jobs
router.get("/jobs", authenticate, async (req, res): Promise<void> => {
  const parsed = ListJobsQueryParams.safeParse(req.query);
  const filters: SQL[] = [];

  if (parsed.success) {
    if (parsed.data.skill) filters.push(eq(jobsTable.skillRequired, parsed.data.skill));
    if (parsed.data.status) filters.push(eq(jobsTable.status, parsed.data.status));
    if (parsed.data.location) filters.push(eq(jobsTable.location, parsed.data.location));
  }

  const jobs = await db.select().from(jobsTable).where(filters.length ? and(...filters) : undefined).orderBy(jobsTable.createdAt);
  res.json(jobs);
});

// POST /jobs
router.post("/jobs", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db.insert(jobsTable).values({
    title: parsed.data.title,
    description: parsed.data.description,
    skillRequired: parsed.data.skillRequired,
    location: parsed.data.location,
    payoutAmount: String(parsed.data.payoutAmount),
    status: "open",
  }).returning();
  res.status(201).json(job);
});

// GET /jobs/:jobId
router.get("/jobs/:jobId", authenticate, async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.jobId)).limit(1);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

// PATCH /jobs/:jobId
router.patch("/jobs/:jobId", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }
  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.description) updates.description = parsed.data.description;
  if (parsed.data.skillRequired) updates.skillRequired = parsed.data.skillRequired;
  if (parsed.data.location) updates.location = parsed.data.location;
  if (parsed.data.payoutAmount !== undefined) updates.payoutAmount = String(parsed.data.payoutAmount);
  if (parsed.data.status) updates.status = parsed.data.status;

  const [job] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, params.data.jobId)).returning();
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

// DELETE /jobs/:jobId (cancel)
router.delete("/jobs/:jobId", requireAdmin, async (req, res): Promise<void> => {
  const params = CancelJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }
  const [job] = await db.update(jobsTable).set({ status: "cancelled" }).where(eq(jobsTable.id, params.data.jobId)).returning();
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

// POST /jobs/:jobId/complete
router.post("/jobs/:jobId/complete", requireAdmin, async (req, res): Promise<void> => {
  const params = CompleteJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }
  const parsed = CompleteJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db.update(jobsTable).set({ status: "completed", completionNotes: parsed.data.completionNotes }).where(eq(jobsTable.id, params.data.jobId)).returning();
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

export default router;
