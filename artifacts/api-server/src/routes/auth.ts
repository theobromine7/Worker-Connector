import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, workersTable, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authenticate } from "../middlewares/auth";
import {
  WorkerLoginBody,
  AdminLoginBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// POST /auth/worker/login
router.post("/auth/worker/login", async (req, res): Promise<void> => {
  const parsed = WorkerLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone, password } = parsed.data;

  const [worker] = await db.select().from(workersTable).where(eq(workersTable.phone, phone)).limit(1);
  if (!worker) {
    res.status(401).json({ error: "Phone number not registered" });
    return;
  }

  if (!worker.passwordHash) {
    res.status(401).json({ error: "Account has no password set. Please re-register." });
    return;
  }

  const valid = await bcrypt.compare(password, worker.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  if (worker.isSuspended) {
    res.status(403).json({ error: "Account suspended. Contact admin." });
    return;
  }

  const token = signToken({ role: "worker", id: worker.id });
  res.json({ token, role: "worker", workerId: worker.id });
});

// POST /auth/admin/login
router.post("/auth/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ role: "admin", id: admin.id });
  res.json({ token, role: "admin", workerId: null });
});

// GET /auth/me
router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role === "admin") {
    res.json({ role: "admin" });
    return;
  }
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, auth.id)).limit(1);
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  res.json({ role: "worker", worker });
});

export default router;
