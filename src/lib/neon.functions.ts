import { createServerFn } from "@tanstack/react-start";
import { loadDbFromNeon, saveDbToNeon, checkNeonStatus } from "./neon.server";
import * as mockDb from "../integrations/supabase/mock-db.server";

/**
 * Check Neon PostgreSQL status and connection
 */
export const getNeonStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const status = await checkNeonStatus();
    return {
      databaseName: "Neon PostgreSQL",
      isConnected: status.connected,
      tablesCount: status.tablesCount || 0,
      lastUpdatedAt: status.lastUpdated || null,
      error: status.error || null,
    };
  } catch (err: any) {
    return {
      databaseName: "Neon PostgreSQL",
      isConnected: false,
      tablesCount: 0,
      lastUpdatedAt: null,
      error: err?.message || String(err),
    };
  }
});

/**
 * Force sync current state to Neon PostgreSQL
 */
export const syncToNeonNowFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const db = await mockDb.getSupabaseDb();
    const success = await saveDbToNeon(db);
    return {
      success,
      message: success
        ? "Sincronizzazione su Neon PostgreSQL completata con successo!"
        : "Errore durante il salvataggio su Neon. Verifica DATABASE_URL.",
    };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
});

/**
 * Force load state from Neon PostgreSQL
 */
export const loadFromNeonNowFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    mockDb.clearDbCache();
    const neonData = await loadDbFromNeon();
    if (neonData) {
      await mockDb.saveSupabaseDb(neonData);
      return { success: true, message: "Dati caricati con successo da Neon PostgreSQL!" };
    }
    return {
      success: false,
      message: "Nessun dato trovato su Neon o database non raggiungibile.",
    };
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
});
