import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { whenThereIsRoom } from "@/lib/retry";
import * as schema from "./schema";

// An Aiven free plan allows 20 connections (17 usable). On Vercel several server
// copies run at once, each with its own pool, and Vercel pauses a copy between
// requests. A paused copy can't run its idle timer, so its connections used to
// stay open for minutes; in the 100 Days app, after a few deploys, that used up every
// slot and every page failed. attachDatabasePool keeps a copy awake just long
// enough to close idle connections before it's paused.
// In dev, one pool is reused across hot reloads.
const prod = process.env.NODE_ENV === "production";
const globalForDb = globalThis as unknown as { pool?: Pool };

// Aiven's URL asks for sslmode=require: encrypted, without checking the
// certificate against a CA (what the previous driver did too). Newer pg reads
// "require" as "verify-full", so say what we mean.
// The build loads this file too (to look at the API routes) but never queries,
// so it can run without the setting. Running the app without it is a mistake:
// say so plainly instead of failing later with "Invalid URL".
const building = process.env.NEXT_PHASE === "phase-production-build";
if (!process.env.DATABASE_URL && !building) {
  throw new Error("DATABASE_URL is not set. On Vercel: Settings → Environment Variables, add it, then redeploy.");
}
const url = new URL(process.env.DATABASE_URL || "postgres://build@localhost:5432/build");
const ssl = url.searchParams.get("sslmode") === "require" ? { rejectUnauthorized: false } : undefined;
url.searchParams.delete("sslmode");

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: url.toString(),
    ssl,
    // Up to 2 per server copy on Vercel, so more copies fit in the 17 slots;
    // 5 on your Mac, which is a single copy.
    max: prod ? 2 : 5,
    idleTimeoutMillis: prod ? 5_000 : 120_000,
    maxLifetimeSeconds: 60 * 30,
    connectionTimeoutMillis: 10_000,
  });

// If the database is full, wait for room instead of failing the page.
// Patched once per pool (in dev the pool outlives hot reloads).
const patched = pool as Pool & { waitsForRoom?: boolean };
if (!patched.waitsForRoom) {
  patched.waitsForRoom = true;
  // pg's own pool.query asks for a connection through pool.connect(callback),
  // so wrapping connect covers both plain queries and transactions. The
  // callback form is retried the same way and then answered once.
  const connect = pool.connect.bind(pool) as () => Promise<PoolClient>;
  type Done = (err: Error | undefined, client?: PoolClient, release?: (e?: Error | boolean) => void) => void;
  pool.connect = ((cb?: Done) => {
    const room = whenThereIsRoom(connect);
    if (!cb) return room;
    room.then(
      (client) => cb(undefined, client, client.release.bind(client)),
      (err) => cb(err),
    );
  }) as typeof pool.connect;
}

if (prod) attachDatabasePool(pool);
else globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export * as t from "./schema";
