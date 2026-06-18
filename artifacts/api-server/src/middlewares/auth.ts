import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "workerconnect-dev-secret";

export interface AuthPayload {
  role: "worker" | "admin";
  id: number;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireWorker(req: Request, res: Response, next: NextFunction): void {
  authenticate(req, res, () => {
    if (req.auth?.role !== "worker") {
      res.status(403).json({ error: "Worker access required" });
      return;
    }
    next();
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  authenticate(req, res, () => {
    if (req.auth?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
