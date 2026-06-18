import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcrypt";
import * as schema from "../../lib/db/src/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";

  const existing = await db.select().from(schema.adminsTable).where(
    // @ts-expect-error drizzle-orm eq import
    (await import("drizzle-orm")).eq(schema.adminsTable.username, username)
  ).limit(1);

  if (existing.length > 0) {
    console.log(`Admin '${username}' already exists`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(schema.adminsTable).values({ username, passwordHash });
  console.log(`Admin '${username}' created with password '${password}'`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
