/**
 * Cloudflare D1 Database Integration Adapter for 'revenge'
 * Provides high-performance, resource-optimized persistence for Cloudflare Pages / Workers
 * using Cloudflare D1 SQLite database binding or REST API.
 */

let d1ReadCooldownUntil = 0;
let d1WriteCooldownUntil = 0;

function isQuotaOrNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("resource limit")
  );
}

/**
 * Get the active D1 database instance from Cloudflare environment bindings
 */
export function getD1Binding(): any {
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (g.DB && typeof g.DB.prepare === "function") return g.DB;
    if (g.revenge && typeof g.revenge.prepare === "function") return g.revenge;
    if (g.REVENGE_DB && typeof g.REVENGE_DB.prepare === "function") return g.REVENGE_DB;
  }

  if (typeof process !== "undefined" && process.env) {
    const p = process.env as any;
    if (p.DB && typeof p.DB.prepare === "function") return p.DB;
    if (p.revenge && typeof p.revenge.prepare === "function") return p.revenge;
    if (p.REVENGE_DB && typeof p.REVENGE_DB.prepare === "function") return p.REVENGE_DB;
  }

  return null;
}

/**
 * Fallback via Cloudflare D1 REST API if environment variables are configured
 */
async function queryD1RestApi(sql: string, params: any[] = []): Promise<any> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  const databaseId =
    process.env.CLOUDFLARE_DATABASE_ID ||
    process.env.CF_DATABASE_ID ||
    process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken =
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    process.env.CLOUDFLARE_D1_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    return null;
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sql,
      params,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`D1 REST API error (${response.status}): ${text}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(`D1 REST API query failed: ${JSON.stringify(json.errors)}`);
  }

  return json.result?.[0]?.results || [];
}

/**
 * Load database state from Cloudflare D1 'revenge'
 */
export async function loadDbFromD1(): Promise<Record<string, any[]> | null> {
  if (Date.now() < d1ReadCooldownUntil) {
    return null;
  }

  const db = getD1Binding();

  try {
    if (db) {
      // Ensure state table exists
      try {
        await db
          .prepare(
            `CREATE TABLE IF NOT EXISTS d1_app_state (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);`,
          )
          .run();
      } catch (e) {
        // Table creation error ignored
      }

      const stmt = db.prepare(`SELECT value FROM d1_app_state WHERE key = 'global' LIMIT 1;`);
      const row = await stmt.first();

      if (row && row.value) {
        const parsed = JSON.parse(row.value as string);
        if (parsed && typeof parsed === "object") {
          console.log(
            "[Cloudflare D1 Sync] Successfully loaded database state from Cloudflare D1 ('revenge').",
          );
          return parsed;
        }
      }
      return null;
    }

    // Try REST API if binding not present
    const restResults = await queryD1RestApi(
      `SELECT value FROM d1_app_state WHERE key = 'global' LIMIT 1;`,
    );
    if (restResults && restResults.length > 0 && restResults[0].value) {
      const parsed = JSON.parse(restResults[0].value);
      if (parsed && typeof parsed === "object") {
        console.log(
          "[Cloudflare D1 REST Sync] Successfully loaded database state from D1 REST API.",
        );
        return parsed;
      }
    }
  } catch (err: any) {
    if (isQuotaOrNetworkError(err)) {
      d1ReadCooldownUntil = Date.now() + 5 * 60 * 1000;
      console.warn("[Cloudflare D1 Sync] Rate limit / quota reached on D1 reads.");
    } else {
      console.warn("[Cloudflare D1 Sync] D1 query attempt:", err?.message || err);
    }
  }

  return null;
}

/**
 * Save database state to Cloudflare D1 'revenge'
 */
export async function saveDbToD1(data: Record<string, any[]>): Promise<boolean> {
  if (Date.now() < d1WriteCooldownUntil) {
    return false;
  }

  const db = getD1Binding();
  const serialized = JSON.stringify(data);
  const now = new Date().toISOString();

  try {
    if (db) {
      // Ensure state table exists
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS d1_app_state (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);`,
        )
        .run();

      await db
        .prepare(
          `INSERT OR REPLACE INTO d1_app_state (key, value, updated_at) VALUES ('global', ?, ?);`,
        )
        .bind(serialized, now)
        .run();

      console.log("[Cloudflare D1 Sync] Saved database state to Cloudflare D1 ('revenge').");
      return true;
    }

    // Try REST API if binding not present
    await queryD1RestApi(
      `CREATE TABLE IF NOT EXISTS d1_app_state (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);`,
    );
    await queryD1RestApi(
      `INSERT OR REPLACE INTO d1_app_state (key, value, updated_at) VALUES ('global', ?, ?);`,
      [serialized, now],
    );
    console.log("[Cloudflare D1 REST Sync] Saved database state to D1 REST API.");
    return true;
  } catch (err: any) {
    if (isQuotaOrNetworkError(err)) {
      d1WriteCooldownUntil = Date.now() + 10 * 60 * 1000;
      console.warn("[Cloudflare D1 Sync] Write limit reached on D1.");
    } else {
      console.warn("[Cloudflare D1 Sync] Failed to save to D1:", err?.message || err);
    }
    return false;
  }
}
