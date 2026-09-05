/**
 * Neon PostgreSQL Database Integration Adapter
 * Primary high-performance, serverless PostgreSQL persistence layer.
 */

import pg from "pg";
const { Pool } = pg;

let pool: pg.Pool | null = null;
let lastKnownError: string | null = null;
let lastConnectedTime: number = 0;

export function getNeonPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    try {
      pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      pool.on("error", (err) => {
        console.error("[Neon Database] Unexpected pool error:", err.message);
        lastKnownError = err.message;
      });
    } catch (err: any) {
      console.error("[Neon Database] Failed to initialize pool:", err?.message || err);
      lastKnownError = err?.message || String(err);
      return null;
    }
  }

  return pool;
}

export async function getNeonClient(): Promise<pg.PoolClient | null> {
  const p = getNeonPool();
  if (!p) return null;
  try {
    const client = await p.connect();
    lastConnectedTime = Date.now();
    lastKnownError = null;
    return client;
  } catch (err: any) {
    lastKnownError = err?.message || String(err);
    console.warn("[Neon Database] Connection error:", lastKnownError);
    return null;
  }
}

/**
 * Load global database state from Neon PostgreSQL
 */
export async function loadDbFromNeon(): Promise<Record<string, any[]> | null> {
  const p = getNeonPool();
  if (!p) {
    return null;
  }

  try {
    const res = await p.query<{ data: any; updated_at: string }>(
      "SELECT data, updated_at FROM app_state WHERE id = 'global' LIMIT 1;",
    );

    if (res.rows.length > 0 && res.rows[0].data) {
      const rawData = res.rows[0].data;
      const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        lastConnectedTime = Date.now();
        lastKnownError = null;
        console.log(
          `[Neon Database] Successfully loaded database from Neon (updated at: ${res.rows[0].updated_at || "N/A"}).`,
        );
        return parsed;
      }
    }
  } catch (err: any) {
    lastKnownError = err?.message || String(err);
    console.warn("[Neon Database] Failed to load database:", lastKnownError);
  }

  return null;
}

/**
 * Save global database state to Neon PostgreSQL
 */
export async function saveDbToNeon(data: Record<string, any[]>): Promise<boolean> {
  const p = getNeonPool();
  if (!p) {
    return false;
  }

  try {
    const serialized = JSON.stringify(data);
    await p.query(
      `INSERT INTO app_state (id, data, updated_at)
       VALUES ('global', $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = NOW();`,
      [serialized],
    );

    lastConnectedTime = Date.now();
    lastKnownError = null;
    console.log("[Neon Database] Successfully synchronized database state to Neon PostgreSQL.");
    return true;
  } catch (err: any) {
    lastKnownError = err?.message || String(err);
    console.warn("[Neon Database] Failed to save database:", lastKnownError);
    return false;
  }
}

/**
 * Check connectivity and status of the Neon PostgreSQL database
 */
export async function checkNeonStatus(): Promise<{
  connected: boolean;
  lastConnected: string | null;
  tablesCount?: number;
  lastUpdated?: string;
  error?: string | null;
}> {
  const p = getNeonPool();
  if (!p) {
    return {
      connected: false,
      lastConnected: null,
      error: "DATABASE_URL non configurato",
    };
  }

  try {
    const checkRes = await p.query<{ count: string }>(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';",
    );
    const stateRes = await p.query<{ updated_at: string }>(
      "SELECT updated_at FROM app_state WHERE id = 'global' LIMIT 1;",
    );

    lastConnectedTime = Date.now();
    lastKnownError = null;

    return {
      connected: true,
      lastConnected: new Date(lastConnectedTime).toISOString(),
      tablesCount: parseInt(checkRes.rows[0]?.count || "0", 10),
      lastUpdated: stateRes.rows[0]?.updated_at || undefined,
      error: null,
    };
  } catch (err: any) {
    lastKnownError = err?.message || String(err);
    return {
      connected: false,
      lastConnected: lastConnectedTime ? new Date(lastConnectedTime).toISOString() : null,
      error: lastKnownError,
    };
  }
}
