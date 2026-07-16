import { Client } from "pg";

export async function getNeonClient(): Promise<Client | null> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[Neon Database] DATABASE_URL is not set.");
    return null;
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Necessary for AWS/Neon connection
    },
  });

  try {
    await client.connect();
    return client;
  } catch (err) {
    console.error("[Neon Database] Failed to connect:", err);
    return null;
  }
}

export async function loadDbFromNeon(): Promise<Record<string, any[]> | null> {
  const client = await getNeonClient();
  if (!client) return null;

  try {
    // Ensure state table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const res = await client.query("SELECT data FROM app_state WHERE id = 'global'");
    if (res.rows.length > 0) {
      console.log("[Neon Database] Loaded application state successfully.");
      return res.rows[0].data as Record<string, any[]>;
    } else {
      console.log("[Neon Database] No existing app_state found.");
      return null;
    }
  } catch (err) {
    console.error("[Neon Database] Error loading state:", err);
    return null;
  } finally {
    await client.end().catch((e) => console.error("[Neon Database] Error closing client:", e));
  }
}

export async function saveDbToNeon(data: Record<string, any[]>) {
  const client = await getNeonClient();
  if (!client) return;

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(
      `INSERT INTO app_state (id, data, updated_at)
       VALUES ('global', $1, NOW())
       ON CONFLICT (id)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [JSON.stringify(data)],
    );
    console.log("[Neon Database] Successfully saved application state.");
  } catch (err) {
    console.error("[Neon Database] Error saving state:", err);
  } finally {
    await client.end().catch((e) => console.error("[Neon Database] Error closing client:", e));
  }
}
