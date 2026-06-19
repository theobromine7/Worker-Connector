import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, workersTable, otpsTable, adminsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { signToken, authenticate } from "../middlewares/auth";
import {
  SendOtpBody,
  VerifyOtpBody,
  AdminLoginBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /auth/send-otp
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone } = parsed.data;

  // Invalidate old OTPs
  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.phone, phone));

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(otpsTable).values({ phone, code, used: false, expiresAt });

  req.log.info({ phone, code }, "OTP generated"); // In production, send via SMS
  res.json({ message: `OTP sent to ${phone}. (Dev mode: ${code})` });
});

// POST /auth/verify-otp
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone, otp } = parsed.data;

  const [otpRecord] = await db
    .select()
    .from(otpsTable)
    .where(
      and(
        eq(otpsTable.phone, phone),
        eq(otpsTable.code, otp),
        eq(otpsTable.used, false),
        gt(otpsTable.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!otpRecord) {
    res.status(401).json({ error: "Invalid or expired OTP" });
    return;
  }

  const [worker] = await db.select().from(workersTable).where(eq(workersTable.phone, phone)).limit(1);

  if (!worker) {
    res.status(401).json({ error: "Phone not registered. Please register first." });
    return;
  }

  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.id, otpRecord.id));

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
