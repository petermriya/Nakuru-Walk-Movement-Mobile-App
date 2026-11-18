/* When the database has no free connection slot it refuses new connections
   outright. That happens before any query runs, so trying again is safe, and a
   slot usually frees within a second or two. Waiting briefly turns a busy
   moment into a slightly slower page instead of an error page. */

/** Postgres: too_many_connections, cannot_connect_now. */
const FULL = new Set(["53300", "57P03"]);

export const isDatabaseFull = (e: unknown) => FULL.has(String((e as { code?: unknown } | null)?.code ?? ""));

/** Run fn; if the database is full, wait and try again (about 2.5 s in all). */
export async function whenThereIsRoom<T>(fn: () => Promise<T>, waits = [150, 300, 600, 1200], sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isDatabaseFull(e) || i >= waits.length) throw e;
      // A little randomness, so copies that were refused together don't all retry together.
      await sleep(waits[i] * (0.75 + Math.random() * 0.5));
    }
  }
}
