import { createServerFn } from "@tanstack/react-start";
import { loadDbFromD1, saveDbToD1, getD1Binding } from "./d1.server";
import * as mockDb from "../integrations/supabase/mock-db.server";

/**
 * Check Cloudflare D1 status and connection
 */
export const getD1StatusFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const binding = getD1Binding();
    const isBindingAvailable = !!binding;

    let hasRestApi = false;
    if (
      process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_DATABASE_ID &&
      process.env.CLOUDFLARE_API_TOKEN
    ) {
      hasRestApi = true;
    }

    let isConnected = false;
    let tablesCount = 0;
    let lastUpdatedAt: string | null = null;

    if (binding) {
      try {
        const stmt = binding.prepare(
          `SELECT updated_at FROM d1_app_state WHERE key = 'global' LIMIT 1;`,
        );
        const row = await stmt.first();
        if (row) {
          isConnected = true;
          lastUpdatedAt = (row.updated_at as string) || null;
        } else {
          isConnected = true;
        }

        const tablesRes = await binding
          .prepare(`SELECT count(*) as cnt FROM sqlite_master WHERE type='table';`)
          .first();
        if (tablesRes && typeof tablesRes.cnt === "number") {
          tablesCount = tablesRes.cnt;
        }
      } catch (e) {
        // Table might not exist yet
        isConnected = isBindingAvailable;
      }
    } else {
      // Check via REST API if configured
      try {
        const testLoad = await loadDbFromD1();
        if (testLoad) {
          isConnected = true;
        }
      } catch (e) {
        // Ignore
      }
    }

    return {
      databaseName: "revenge",
      isBindingAvailable,
      hasRestApi,
      isConnected,
      tablesCount,
      lastUpdatedAt,
    };
  } catch (err: any) {
    return {
      databaseName: "revenge",
      isBindingAvailable: false,
      hasRestApi: false,
      isConnected: false,
      tablesCount: 0,
      lastUpdatedAt: null,
      error: err?.message || String(err),
    };
  }
});

/**
 * Force sync current state to Cloudflare D1 'revenge'
 */
export const syncToD1NowFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const db = await mockDb.getSupabaseDb();
    const success = await saveDbToD1(db);
    return {
      success,
      message: success
        ? "Sincronizzazione D1 ('revenge') completata con successo!"
        : "Errore durante la sincronizzazione D1. Verifica le credenziali / binding.",
    };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
});

/**
 * Force load state from Cloudflare D1 'revenge'
 */
export const loadFromD1NowFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    mockDb.clearDbCache();
    const d1Data = await loadDbFromD1();
    if (d1Data) {
      await mockDb.saveSupabaseDb(d1Data);
      return { success: true, message: "Dati caricati con successo da Cloudflare D1 ('revenge')!" };
    }
    return {
      success: false,
      message: "Nessun dato trovato sul database D1 ('revenge') o D1 non raggiungibile.",
    };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
});

/**
 * Generate SQL seed script for D1 migration
 */
export const getD1SeedSqlFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await mockDb.getSupabaseDb();
    let sql = `-- Cloudflare D1 SQL Migration Seed for Database: revenge\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS d1_app_state (\n  key TEXT PRIMARY KEY,\n  value TEXT,\n  updated_at TEXT\n);\n\n`;

    const jsonStr = JSON.stringify(db).replace(/'/g, "''");
    sql += `INSERT OR REPLACE INTO d1_app_state (key, value, updated_at)\nVALUES ('global', '${jsonStr}', CURRENT_TIMESTAMP);\n\n`;

    for (const [colName, rows] of Object.entries(db)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const safeTableName = colName.replace(/[^a-zA-Z0-9_]/g, "_");
      sql += `-- Table: ${safeTableName}\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${safeTableName} (\n`;
      sql += `  id TEXT PRIMARY KEY,\n`;
      sql += `  data TEXT,\n`;
      sql += `  updated_at TEXT\n`;
      sql += `);\n\n`;

      for (const row of rows) {
        const idVal = row.id
          ? String(row.id).replace(/'/g, "''")
          : Math.random().toString(36).substring(2);
        const rowJson = JSON.stringify(row).replace(/'/g, "''");
        sql += `INSERT OR REPLACE INTO ${safeTableName} (id, data, updated_at) VALUES ('${idVal}', '${rowJson}', CURRENT_TIMESTAMP);\n`;
      }
      sql += `\n`;
    }

    return { success: true, sql, sizeKb: (sql.length / 1024).toFixed(2) };
  } catch (err: any) {
    return { success: false, sql: "", error: err?.message || String(err) };
  }
});
