import { Router, type IRouter } from "express";
import { db, workersTable, payoutsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireWorker } from "../middlewares/auth";
import {
  RegisterWorkerBody,
  UpdateWorkerProfileBody,
  ToggleAvailabilityBody,
  UpdateFcmTokenBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// POST /workers/register
router.post("/workers/register", async (req, res): Promise<void> => {
  const parsed = RegisterWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(workersTable).where(eq(workersTable.phone, parsed.data.phone)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Phone number already registered" });
    return;
  }

  const [worker] = await db.insert(workersTable).values({
    name: parsed.data.name,
    phone: parsed.data.phone,
    city: parsed.data.city,
    skill: parsed.data.skill,
    upiId: parsed.data.upiId ?? null,
    profileImage: parsed.data.profileImage ?? null,
    isOnline: false,
    isSuspended: false,
    subscriptionStatus: "inactive",
  }).returning();

  res.status(201).json(worker);
});

// GET /workers/me
router.get("/workers/me", requireWorker, async (req, res): Promise<void> => {
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, req.auth!.id)).limit(1);
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  res.json(worker);
});

// PATCH /workers/me
router.patch("/workers/me", requireWorker, async (req, res): Promise<void> => {
  const parsed = UpdateWorkerProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.city !== undefined) updates.city = parsed.data.city;
  if (parsed.data.upiId !== undefined) updates.upiId = parsed.data.upiId;
  if (parsed.data.profileImage !== undefined) updates.profileImage = parsed.data.profileImage;

  const [worker] = await db.update(workersTable).set(updates).where(eq(workersTable.id, req.auth!.id)).returning();
  res.json(worker);
});

// PATCH /workers/me/availability
router.patch("/workers/me/availability", requireWorker, async (req, res): Promise<void> => {
  const parsed = ToggleAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [worker] = await db.update(workersTable).set({ isOnline: parsed.data.isOnline }).where(eq(workersTable.id, req.auth!.id)).returning();
  res.json(worker);
});

// POST /workers/me/fcm-token
router.post("/workers/me/fcm-token", requireWorker, async (req, res): Promise<void> => {
  const parsed = UpdateFcmTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(workersTable).set({ fcmToken: parsed.data.fcmToken }).where(eq(workersTable.id, req.auth!.id));
  res.json({ message: "FCM token saved" });
});

// GET /workers/me/earnings
router.get("/workers/me/earnings", requireWorker, async (req, res): Promise<void> => {
  const paidPayouts = await db
    .select()
    .from(payoutsTable)
    .where(eq(payoutsTable.workerId, req.auth!.id));

  const totalEarned = paidPayouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalJobs = paidPayouts.filter((p) => p.status === "paid").length;

  res.json({ totalEarned, totalJobs, payouts: paidPayouts });
});

export default router;
