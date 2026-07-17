import fs from "fs";
import path from "path";
import { loadDbFromNeon, saveDbToNeon } from "../../lib/neon.server";
import { getRequest } from "@tanstack/react-start/server";

const DB_FILE = path.join(process.cwd(), "mock-db.json");

function getInitialDb() {
  const defaultUser = {
    id: "mock-user-id-1234",
    email: "beppemonti84@gmail.com",
    user_metadata: { username: "admin", display_name: "Amministratore" },
    created_at: new Date().toISOString(),
  };

  const db: Record<string, any[]> = {
    profiles: [
      {
        id: "mock-user-id-1234",
        username: "admin",
        display_name: "Amministratore",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    user_roles: [
      {
        id: "role-1",
        user_id: "mock-user-id-1234",
        role: "admin",
      },
    ],
    custom_roles: [
      {
        id: "crole-1",
        name: "Cassiere",
        description: "Gestione conversioni e incassi",
        permissions: ["conversioni.visualizza", "conversioni.crea", "conversioni.azzera"],
        created_at: new Date().toISOString(),
      },
      {
        id: "crole-2",
        name: "Croupier",
        description: "Gestione tavoli e corse cavalli",
        permissions: ["corse.visualizza", "corse.gestisci"],
        created_at: new Date().toISOString(),
      },
    ],
    user_custom_roles: [],
    citizens: [
      {
        id: "citizen-1",
        full_name: "Mario Rossi",
        nickname: "Il Capo",
        membership: "elite",
        membership_since: "2026-01-01",
        notes: "Cliente abituale di alta fascia.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "citizen-2",
        full_name: "Giuseppe Bianchi",
        nickname: "Pino",
        membership: "standard",
        membership_since: "2026-02-15",
        notes: "Giocatore serale.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    safe_boxes: Array.from({ length: 10 }, (_, i) => ({
      id: `safe-${i + 1}`,
      box_number: i + 1,
      citizen_id: i === 0 ? "citizen-1" : null,
      activated_at: i === 0 ? "2026-01-01" : null,
      expires_at: i === 0 ? "2026-12-31" : null,
      active: i === 0,
      notes: i === 0 ? "Cassetta vip" : null,
    })),
    badge_weeks: [
      {
        id: "week-1",
        label: "Settimana 1",
        active: true,
        started_at: "2026-07-01",
        ended_at: null,
        created_at: new Date().toISOString(),
      },
    ],
    badge_sessions: [],
    nights: [
      {
        id: "night-1",
        night_date: "2026-07-09",
        title: "Serata di Gala",
        total: 3500,
        notes: "Ottima affluenza.",
        is_closed: false,
        created_at: new Date().toISOString(),
      },
    ],
    conversion_settings: [
      {
        id: true as any,
        max_dobloni_per_day: 10000,
        max_eur_per_day: 2000,
        updated_at: new Date().toISOString(),
      },
    ],
    conversions: [],
    conversion_resets: [],
    stables: [
      {
        id: "stable-1",
        name: "Scuderia San Siro",
        owner_citizen_id: "citizen-1",
      },
    ],
    horses: [
      {
        id: "horse-1",
        name: "Vento di Ponente",
        stable_id: "stable-1",
        sponsor: "Rolex",
      },
      {
        id: "horse-2",
        name: "Saetta",
        stable_id: null,
        sponsor: null,
      },
    ],
    services: [
      {
        id: "srv-1",
        name: "Cena Gourmet",
        billing: "per_night",
        price: 150,
        category_id: "cat-1",
        include_in_nights: true,
        is_qty_editable: false,
        active: true,
      },
      {
        id: "srv-2",
        name: "Guardia del corpo",
        billing: "per_night",
        price: 300,
        category_id: "cat-2",
        include_in_nights: true,
        is_qty_editable: true,
        active: true,
      },
    ],
    service_categories: [
      {
        id: "cat-1",
        name: "Ristorazione",
        sort_order: 1,
      },
      {
        id: "cat-2",
        name: "Sicurezza",
        sort_order: 2,
      },
    ],
    purchased_services: [],
    sanctions: [],
    leave_requests: [],
    night_items: [],
    audit_logs: [],
  };

  return db;
}

let cachedDb: Record<string, any[]> | null = null;
let isInitializing = false;
let initPromise: Promise<Record<string, any[]>> | null = null;

async function loadDb(): Promise<Record<string, any[]>> {
  if (cachedDb) {
    return cachedDb;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log("[Neon Sync] Attempting to load database from Neon Postgres...");
      const pgData = await loadDbFromNeon();
      if (pgData) {
        console.log(
          "[Neon Sync] Successfully loaded database from Neon. Merging with initial DB and updating local cache...",
        );
        const initialDb = getInitialDb();
        const mergedDb = { ...initialDb, ...pgData };
        mergedDb.audit_logs = mergedDb.audit_logs || [];
        cachedDb = mergedDb;
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), "utf-8");
        } catch (e) {
          console.error("Error saving local DB cache:", e);
        }
        return cachedDb;
      }
    } catch (err) {
      console.error("[Neon Sync] Failed to load from Neon Postgres:", err);
    }

    console.log("[Neon Sync] Falling back to local mock-db.json...");
    let localDb: Record<string, any[]> | null = null;
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        localDb = JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error loading mock db from file:", e);
    }

    if (!localDb) {
      console.log("[Neon Sync] No local mock DB found. Creating initial DB...");
      localDb = getInitialDb();
    }

    localDb.audit_logs = localDb.audit_logs || [];
    cachedDb = localDb;

    console.log("[Neon Sync] Seeding Neon Postgres with database state...");
    try {
      await saveDbToNeon(localDb);
      console.log("[Neon Sync] Database state successfully seeded to Neon Postgres.");
    } catch (err) {
      console.error("[Neon Sync] Failed to seed Neon Postgres:", err);
    }

    return cachedDb;
  })();

  const result = await initPromise;
  isInitializing = false;
  initPromise = null;
  return result;
}

async function saveDb(db: Record<string, any[]>) {
  db.audit_logs = db.audit_logs || [];
  cachedDb = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving mock db:", e);
  }

  console.log("[Neon Sync] Saving database state to Neon Postgres...");
  try {
    await saveDbToNeon(db);
    console.log("[Neon Sync] Database state successfully saved to Neon Postgres.");
  } catch (err) {
    console.error("[Neon Sync] Failed to save database state to Neon Postgres:", err);
  }
}

function logOperation(
  db: any,
  operation: string,
  table: string | undefined,
  query: any,
  result: any,
) {
  // Only log write actions or important RPC calls
  const isWrite =
    ["insert", "update", "delete", "upsert"].includes(operation) ||
    (operation === "rpc" && ["perform_conversion"].includes(query.name));

  if (!isWrite) return;

  db.audit_logs = db.audit_logs || [];

  const session = getActiveSession(db);
  const userId = session?.user?.id || "system";
  const username = session?.user?.user_metadata?.username || "sistema";
  const userDisplayName = session?.user?.user_metadata?.display_name || "Sistema";

  let details = "";
  const tableLabel = table || query.name || "sistema";

  if (operation === "rpc") {
    if (query.name === "perform_conversion") {
      const dir =
        query.args?._direction === "cash_to_dobloni" ? "Euro ➔ Dobloni" : "Dobloni ➔ Euro";
      const amtStr =
        query.args?._direction === "cash_to_dobloni"
          ? `${query.args?._input} €`
          : `${query.args?._input} Dobloni`;
      details = `Eseguita conversione valuta (${dir}) di ${amtStr}`;
    } else {
      details = `Eseguita operazione di sistema: ${query.name}`;
    }
  } else if (table === "citizens") {
    if (operation === "insert") {
      const name = Array.isArray(query.insertData)
        ? query.insertData.map((x: any) => x.full_name).join(", ")
        : query.insertData?.full_name;
      details = `Registrato nuovo cittadino: ${name}`;
    } else if (operation === "update") {
      const name = query.updateData?.full_name || "";
      const extra = name ? `: ${name}` : "";
      details = `Aggiornato cittadino${extra}`;
    } else if (operation === "delete") {
      details = `Eliminato cittadino dal database`;
    } else {
      details = `Modificata anagrafica cittadini`;
    }
  } else if (table === "leave_requests") {
    if (operation === "insert") {
      const start = query.insertData?.start_date;
      const end = query.insertData?.end_date;
      details = `Inviata richiesta di congedo dal ${start} al ${end}`;
    } else if (operation === "update") {
      const status = query.updateData?.status;
      const statusLabel =
        status === "approved" ? "APPROVATO" : status === "rejected" ? "RIFIUTATO" : status;
      const userStr = result?.data?.[0]?.display_name || result?.data?.[0]?.username || "";
      const extra = userStr ? ` per ${userStr}` : "";
      details = `Congedo ${statusLabel}${extra}`;
    } else if (operation === "delete") {
      details = `Annullato congedo`;
    } else {
      details = `Gestito congedo`;
    }
  } else if (table === "conversions") {
    if (operation === "insert") {
      const dir =
        query.insertData?.direction === "cash_to_dobloni" ? "Euro ➔ Dobloni" : "Dobloni ➔ Euro";
      details = `Registrata conversione valuta (${dir})`;
    } else {
      details = `Modificato record di conversione`;
    }
  } else if (table === "nights") {
    if (operation === "insert") {
      details = `Creata nuova serata: ${query.insertData?.title || query.insertData?.night_date}`;
    } else if (operation === "update") {
      const isClosed = query.updateData?.is_closed;
      if (isClosed === true) {
        details = `Chiusa serata: ${result?.data?.[0]?.title || result?.data?.[0]?.night_date || "ID " + query.filters?.[0]?.value}`;
      } else {
        details = `Aggiornata serata: ${query.updateData?.title || "ID " + query.filters?.[0]?.value}`;
      }
    } else if (operation === "delete") {
      details = `Eliminata serata dal database`;
    } else {
      details = `Gestito record serata`;
    }
  } else if (table === "services") {
    if (operation === "insert") {
      details = `Aggiunto servizio a catalogo: ${query.insertData?.name}`;
    } else if (operation === "update") {
      details = `Aggiornato servizio: ${query.updateData?.name || "ID " + query.filters?.[0]?.value}`;
    } else if (operation === "delete") {
      details = `Eliminato servizio dal catalogo`;
    }
  } else if (table === "badge_sessions") {
    if (operation === "insert") {
      details = `Iniziata sessione di lavoro (timbratura ingresso)`;
    } else if (operation === "update") {
      const endedAt = query.updateData?.ended_at;
      details = endedAt ? `Chiusa sessione di lavoro (timbratura uscita)` : `Aggiornata timbratura`;
    } else if (operation === "delete") {
      details = `Eliminata timbratura`;
    }
  } else if (table === "sanctions") {
    if (operation === "insert") {
      const type = query.insertData?.type;
      const typeLabel =
        type === "richiamo_verbale"
          ? "Richiamo Verbale"
          : type === "warn"
            ? "Warn"
            : type === "sospensione"
              ? "Sospensione"
              : type === "espulsione"
                ? "Espulsione"
                : type;
      details = `Assegnato provvedimento disciplinare (${typeLabel})`;
    } else if (operation === "update") {
      details = `Aggiornato provvedimento disciplinare`;
    } else if (operation === "delete") {
      details = `Eliminato provvedimento disciplinare`;
    }
  } else if (table === "safe_boxes") {
    details = `Aggiornato stato cassette di sicurezza`;
  } else if (table === "custom_roles") {
    details = `Modificato ruolo personalizzato: ${query.insertData?.name || query.updateData?.name || ""}`;
  } else if (table === "profiles") {
    details = `Aggiornato profilo utente: ${query.updateData?.display_name || ""}`;
  } else {
    details = `${operation.toUpperCase()} su tabella ${tableLabel}`;
  }

  const logEntry = {
    id: "log-" + Math.random().toString(36).substring(2, 15),
    user_id: userId,
    username: username,
    user_display_name: userDisplayName,
    action: operation,
    table_name: tableLabel,
    details: details,
    created_at: new Date().toISOString(),
  };

  db.audit_logs.unshift(logEntry); // Add to beginning of array

  // Keep last 1000 logs to prevent infinite size growth
  if (db.audit_logs.length > 1000) {
    db.audit_logs = db.audit_logs.slice(0, 1000);
  }
}

function recalculateNightsTotals(db: Record<string, any[]>) {
  const nights = db.nights || [];
  const nightItems = db.night_items || [];
  const totals: Record<string, number> = {};

  nightItems.forEach((item) => {
    if (item.night_id) {
      totals[item.night_id] = (totals[item.night_id] || 0) + Number(item.subtotal || 0);
    }
  });

  db.nights = nights.map((night) => ({
    ...night,
    total: totals[night.id] || 0,
  }));
}

export async function queryMockDb(query: any): Promise<{ data: any; error: any }> {
  const db = await loadDb();
  const {
    table,
    operation,
    selectColumns,
    filters = [],
    orderBy,
    limitCount,
    insertData,
    updateData,
    isMaybeSingle,
    isSingle,
    name,
    args,
  } = query;

  // Check if maintenance mode is active (exclude changes to maintenance_settings itself, so admins can turn it off)
  const isMaintenanceActive =
    db.maintenance_settings?.some((s: any) => s.id === "global" && s.is_maintenance) || false;
  if (isMaintenanceActive && table !== "maintenance_settings") {
    let isAdmin = false;
    const session = getActiveSession(db);
    if (session && session.user) {
      const userId = session.user.id;
      const userRoles = db.user_roles || [];
      isAdmin = userRoles.some((ur: any) => ur.user_id === userId && ur.role === "admin");
    }

    // Block write operations for non-admins
    const isWrite =
      ["insert", "update", "delete", "upsert"].includes(operation) ||
      (operation === "rpc" && !["is_admin", "user_permissions", "has_permission"].includes(name));
    if (isWrite && !isAdmin) {
      return {
        data: null,
        error: {
          message:
            "Il sistema è attualmente in manutenzione. Tutte le operazioni di scrittura sono bloccate.",
        },
      };
    }
  }

  // Handle RPCs
  if (operation === "rpc") {
    if (name === "user_permissions") {
      const userId = args._user_id;
      // Get custom roles for user
      const userCustomRoles = db.user_custom_roles || [];
      const customRoles = db.custom_roles || [];
      const assignedRoleIds = userCustomRoles
        .filter((ucr: any) => ucr.user_id === userId)
        .map((ucr: any) => ucr.custom_role_id);

      const permissionsSet = new Set<string>();
      customRoles
        .filter((cr: any) => assignedRoleIds.includes(cr.id))
        .forEach((cr: any) => {
          (cr.permissions || []).forEach((p: string) => permissionsSet.add(p));
        });

      return { data: Array.from(permissionsSet), error: null };
    }
    if (name === "is_admin") {
      const userId = args._user_id;
      const userRoles = db.user_roles || [];
      const isAdmin = userRoles.some((ur: any) => ur.user_id === userId && ur.role === "admin");
      return { data: isAdmin, error: null };
    }
    if (name === "has_permission") {
      const userId = args._user_id;
      const perm = args._perm;
      const userRoles = db.user_roles || [];
      const isAdmin = userRoles.some((ur: any) => ur.user_id === userId && ur.role === "admin");
      if (isAdmin) return { data: true, error: null };

      const userCustomRoles = db.user_custom_roles || [];
      const customRoles = db.custom_roles || [];
      const assignedRoleIds = userCustomRoles
        .filter((ucr: any) => ucr.user_id === userId)
        .map((ucr: any) => ucr.custom_role_id);

      const hasPerm = customRoles
        .filter((cr: any) => assignedRoleIds.includes(cr.id))
        .some((cr: any) => (cr.permissions || []).includes(perm));

      return { data: hasPerm, error: null };
    }
    if (name === "conversion_usage") {
      const citizenId = args._citizen;
      const nightId = args._night;
      const direction = args._direction;

      const resets = db.conversion_resets || [];
      const resetsForDir = resets.filter(
        (r: any) =>
          r.citizen_id === citizenId && r.night_id === nightId && r.direction === direction,
      );
      let lastResetTime = 0;
      if (resetsForDir.length > 0) {
        lastResetTime = Math.max(
          ...resetsForDir.map((r: any) => new Date(r.reset_at || r.created_at).getTime()),
        );
      }

      const conversions = db.conversions || [];
      const relevantConversions = conversions.filter(
        (c: any) =>
          c.citizen_id === citizenId &&
          c.night_id === nightId &&
          c.direction === direction &&
          new Date(c.created_at).getTime() > lastResetTime,
      );

      const total = relevantConversions.reduce((sum: number, c: any) => {
        if (direction === "cash_to_dobloni") {
          return sum + Number(c.eur_amount || 0);
        } else {
          return sum + Number(c.dobloni_amount || 0);
        }
      }, 0);

      return { data: total, error: null };
    }
    if (name === "perform_conversion") {
      const citizenId = args._citizen;
      const nightId = args._night;
      const direction = args._direction;
      const input = Number(args._input);

      if (!citizenId || !nightId) {
        return { data: null, error: { message: "Seleziona cittadino e serata" } };
      }
      if (isNaN(input) || input <= 0) {
        return { data: null, error: { message: "Importo non valido" } };
      }

      const settingsList = db.conversion_settings || [];
      const settings = settingsList[0] || { max_dobloni_per_day: 10000, max_eur_per_day: 2000 };
      const maxEur = Number(settings.max_eur_per_day ?? 2000);
      const maxDob = Number(settings.max_dobloni_per_day ?? 10000);

      let eur = 0;
      let dob = 0;
      let limit = 0;
      let requested = 0;

      if (direction === "cash_to_dobloni") {
        eur = input;
        dob = input * 10;
        requested = eur;
        limit = maxEur;
      } else {
        dob = input;
        eur = input * 0.075; // 75% rate
        requested = dob;
        limit = maxDob;

        if (dob < 40) {
          return { data: null, error: { message: "Minimo 40 dobloni per la conversione" } };
        }
        if (dob % 40 !== 0) {
          return {
            data: null,
            error: { message: "L'importo deve essere un multiplo di 40 dobloni" },
          };
        }
      }

      const resets = db.conversion_resets || [];
      const resetsForDir = resets.filter(
        (r: any) =>
          r.citizen_id === citizenId && r.night_id === nightId && r.direction === direction,
      );
      let lastResetTime = 0;
      if (resetsForDir.length > 0) {
        lastResetTime = Math.max(
          ...resetsForDir.map((r: any) => new Date(r.reset_at || r.created_at).getTime()),
        );
      }

      const conversions = db.conversions || [];
      const relevantConversions = conversions.filter(
        (c: any) =>
          c.citizen_id === citizenId &&
          c.night_id === nightId &&
          c.direction === direction &&
          new Date(c.created_at).getTime() > lastResetTime,
      );

      const usage = relevantConversions.reduce((sum: number, c: any) => {
        if (direction === "cash_to_dobloni") {
          return sum + Number(c.eur_amount || 0);
        } else {
          return sum + Number(c.dobloni_amount || 0);
        }
      }, 0);

      if (usage + requested > limit) {
        return {
          data: null,
          error: {
            message: `Limite giornaliero superato: rimasti ${Math.max(0, limit - usage)} (richiesti ${requested})`,
          },
        };
      }

      const newConversion = {
        id: "conv-" + Math.random().toString(36).substring(2, 15),
        citizen_id: citizenId,
        night_id: nightId,
        direction,
        input_amount: input,
        eur_amount: eur,
        dobloni_amount: dob,
        created_by: "mock-user-id-1234",
        created_at: new Date().toISOString(),
      };

      db.conversions = [...conversions, newConversion];
      logOperation(db, "rpc", undefined, query, { data: newConversion });
      await saveDb(db);

      return { data: newConversion, error: null };
    }
    return { data: null, error: { message: `RPC ${name} not implemented in mock` } };
  }

  if (!table) {
    return { data: null, error: { message: "No table specified" } };
  }

  if (!db[table]) {
    db[table] = [];
  }

  const items = db[table];

  if (operation === "select") {
    let filtered = [...items];

    if (table === "badge_sessions") {
      filtered = filtered.map((item) => ({
        ...item,
        started_at: item.started_at || item.created_at || new Date().toISOString(),
      }));
    }
    if (table === "badge_weeks") {
      filtered = filtered.map((item) => ({
        ...item,
        started_at: item.started_at || item.created_at || new Date().toISOString(),
      }));
    }

    // Apply filters
    for (const filter of filters) {
      const { column, value, op } = filter;
      if (op === "eq") {
        filtered = filtered.filter((item) => {
          let itemVal = item[column];
          if (column === "active" && table === "services" && itemVal === undefined) {
            itemVal = true;
          }
          return itemVal === value;
        });
      } else if (op === "neq") {
        filtered = filtered.filter((item) => {
          let itemVal = item[column];
          if (column === "active" && table === "services" && itemVal === undefined) {
            itemVal = true;
          }
          return itemVal !== value;
        });
      } else if (op === "is") {
        filtered = filtered.filter((item) => {
          const itemVal = item[column];
          if (value === null) {
            return itemVal === null || itemVal === undefined;
          }
          return itemVal === value;
        });
      } else if (op === "in") {
        filtered = filtered.filter((item) => {
          let itemVal = item[column];
          if (column === "active" && table === "services" && itemVal === undefined) {
            itemVal = true;
          }
          return Array.isArray(value) && value.includes(itemVal);
        });
      } else if (op === "ilike") {
        filtered = filtered.filter((item) => {
          const itemVal = item[column];
          if (typeof itemVal !== "string" || typeof value !== "string") {
            return String(itemVal).toLowerCase() === String(value).toLowerCase();
          }
          const cleanValue = value.replace(/%/g, ".*");
          const regex = new RegExp(`^${cleanValue}$`, "i");
          return regex.test(itemVal);
        });
      }
    }

    // Apply sorting
    if (orderBy) {
      const { column, ascending } = orderBy;
      filtered.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const cmp = valA < valB ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }

    // Apply limit
    if (limitCount !== null && limitCount !== undefined) {
      filtered = filtered.slice(0, limitCount);
    }

    // Handle nested joins
    // e.g. select("*, citizens(full_name)") or select("*, custom_roles(name)")
    const cleanSelect = selectColumns ? selectColumns.replace(/\s+/g, "") : "";
    if (
      cleanSelect &&
      (cleanSelect.includes("citizens(") ||
        cleanSelect.includes("custom_roles(") ||
        cleanSelect.includes("user_roles(") ||
        cleanSelect.includes("nights(") ||
        cleanSelect.includes("service_categories("))
    ) {
      filtered = filtered.map((item) => {
        const newItem = { ...item };
        if (table === "profiles") {
          const userRoles = db.user_roles || [];
          const customRoles = db.custom_roles || [];
          const userCustomRoles = db.user_custom_roles || [];

          newItem.user_roles = userRoles
            .filter((ur: any) => ur.user_id === item.id)
            .map((ur: any) => ({ role: ur.role }));

          const assignedRoleIds = userCustomRoles
            .filter((ucr: any) => ucr.user_id === item.id)
            .map((ucr: any) => ucr.custom_role_id);

          newItem.custom_roles = customRoles
            .filter((cr: any) => assignedRoleIds.includes(cr.id))
            .map((cr: any) => ({ id: cr.id, name: cr.name }));
        }
        if (
          table === "safe_boxes" ||
          table === "stables" ||
          table === "conversions" ||
          table === "conversion_resets" ||
          table === "purchased_services" ||
          table === "night_items"
        ) {
          const citizens = db.citizens || [];
          const citizen = citizens.find((c: any) => c.id === item.citizen_id);
          newItem.citizens = citizen ? { ...citizen } : null;
        }
        if (
          table === "conversions" ||
          table === "conversion_resets" ||
          table === "purchased_services" ||
          table === "night_items"
        ) {
          const nights = db.nights || [];
          const night = nights.find((n: any) => n.id === item.night_id);
          newItem.nights = night ? { night_date: night.night_date, title: night.title } : null;
        }
        if (table === "user_custom_roles") {
          const customRoles = db.custom_roles || [];
          const customRole = customRoles.find((r: any) => r.id === item.custom_role_id);
          newItem.custom_roles = customRole ? { name: customRole.name } : null;
        }
        if (table === "services") {
          const categories = db.service_categories || [];
          const category = categories.find((c: any) => c.id === item.category_id);
          newItem.service_categories = category
            ? { name: category.name, sort_order: category.sort_order }
            : null;
        }
        return newItem;
      });
    }

    if (isSingle) {
      if (filtered.length === 0) {
        return { data: null, error: { message: "No rows found", code: "PGRST116" } };
      }
      return { data: filtered[0], error: null };
    }

    if (isMaybeSingle) {
      return { data: filtered[0] || null, error: null };
    }

    return { data: filtered, error: null };
  }

  if (operation === "insert") {
    const rowsToInsert = Array.isArray(insertData) ? insertData : [insertData];
    const insertedRows = rowsToInsert.map((row) => ({
      id: row.id || Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(table === "services" ? { active: true } : {}),
      ...(table === "badge_sessions"
        ? { started_at: row.started_at || new Date().toISOString(), ended_at: null }
        : {}),
      ...(table === "badge_weeks"
        ? { started_at: row.started_at || new Date().toISOString(), active: true, ended_at: null }
        : {}),
      ...row,
    }));

    db[table] = [...db[table], ...insertedRows];
    if (table === "night_items") {
      recalculateNightsTotals(db);
    }
    logOperation(db, operation, table, query, { data: insertedRows });
    await saveDb(db);

    return { data: Array.isArray(insertData) ? insertedRows : insertedRows[0], error: null };
  }

  if (operation === "upsert") {
    const rowsToUpsert = Array.isArray(insertData) ? insertData : [insertData];
    const results: any[] = [];

    db[table] = db[table] || [];

    for (const row of rowsToUpsert) {
      let existingIndex = -1;
      if (row.id) {
        existingIndex = db[table].findIndex((item: any) => item.id === row.id);
      } else if (table === "user_roles") {
        existingIndex = db[table].findIndex(
          (item: any) => item.user_id === row.user_id && item.role === row.role,
        );
      } else if (table === "user_custom_roles") {
        existingIndex = db[table].findIndex(
          (item: any) => item.user_id === row.user_id && item.custom_role_id === row.custom_role_id,
        );
      } else if (table === "maintenance_settings") {
        existingIndex = db[table].findIndex((item: any) => item.id === row.id);
      }

      if (existingIndex !== -1) {
        const updated = {
          ...db[table][existingIndex],
          ...row,
          updated_at: new Date().toISOString(),
        };
        db[table][existingIndex] = updated;
        results.push(updated);
      } else {
        const inserted = {
          id: row.id || Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...row,
        };
        db[table].push(inserted);
        results.push(inserted);
      }
    }

    logOperation(db, operation, table, query, { data: results });
    await saveDb(db);
    return { data: Array.isArray(insertData) ? results : results[0], error: null };
  }

  if (operation === "update") {
    const updatedRows: any[] = [];
    db[table] = db[table].map((item) => {
      let isMatch = true;
      for (const filter of filters) {
        const { column, value, op } = filter;
        if (op === "eq" && item[column] !== value) isMatch = false;
        if (op === "neq" && item[column] === value) isMatch = false;
      }

      if (isMatch) {
        const updated = { ...item, ...updateData, updated_at: new Date().toISOString() };
        updatedRows.push(updated);
        return updated;
      }
      return item;
    });

    if (table === "night_items") {
      recalculateNightsTotals(db);
    }
    logOperation(db, operation, table, query, { data: updatedRows });
    await saveDb(db);
    return { data: updatedRows, error: null };
  }

  if (operation === "delete") {
    const deletedRows: any[] = [];
    db[table] = db[table].filter((item) => {
      let isMatch = true;
      for (const filter of filters) {
        const { column, value, op } = filter;
        if (op === "eq" && item[column] !== value) isMatch = false;
        if (op === "neq" && item[column] === value) isMatch = false;
      }

      if (isMatch) {
        deletedRows.push(item);
        return false;
      }
      return true;
    });

    if (table === "night_items") {
      recalculateNightsTotals(db);
    }
    logOperation(db, operation, table, query, { data: deletedRows });
    await saveDb(db);
    return { data: deletedRows, error: null };
  }

  return { data: null, error: { message: `Operation ${operation} not implemented` } };
}

export async function handleMockAuth(query: any): Promise<any> {
  const db = await loadDb();
  const { action, payload } = query;

  if (action === "getSession") {
    const session = getActiveSession(db);
    return { data: { session }, error: null };
  }

  if (action === "getUser") {
    const session = getActiveSession(db);
    return { data: { user: session?.user ?? null }, error: null };
  }

  if (action === "signUp") {
    const { email, password, options } = payload;
    const username = options?.data?.username || email.split("@")[0];
    const display_name = options?.data?.display_name || username;

    const existingUser = db.profiles.find((p) => p.username === username);
    if (existingUser) {
      return { data: { user: null }, error: { message: "Utente già esistente." } };
    }

    const newUserId = "user-" + Math.random().toString(36).substring(2, 15);
    const newProfile = {
      id: newUserId,
      username,
      display_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.profiles.push(newProfile);

    // Auto-role assignment: first is admin, others are staff
    const role = db.profiles.length === 1 ? "admin" : "staff";
    db.user_roles.push({
      id: "role-" + Math.random().toString(36).substring(2, 15),
      user_id: newUserId,
      role,
    });

    await saveDb(db);

    // Save as current active mock session
    const mockUser = {
      id: newUserId,
      email,
      user_metadata: { username, display_name },
    };
    // Return session
    const session = {
      access_token: `mock-token-${newUserId}`,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh",
      user: mockUser,
    };

    return { data: { user: mockUser, session }, error: null };
  }

  if (action === "signInWithPassword") {
    const { email, password } = payload;
    const rawUsername = email.split("@")[0].toLowerCase();

    // Map common admin/user aliases to the actual database admin username
    const username =
      rawUsername === "admin" || rawUsername === "beppemonti84" ? "giuse84pro" : rawUsername;
    let profile = db.profiles.find((p) => p.username.toLowerCase() === username);

    // Dynamic robust fallback: If we look for the main administrator and "giuse84pro" profile
    // doesn't exist yet, fallback to finding "admin" or the first profile in the database
    if (
      !profile &&
      (username === "giuse84pro" || rawUsername === "admin" || rawUsername === "beppemonti84")
    ) {
      profile = db.profiles.find((p) => p.username.toLowerCase() === "admin") || db.profiles[0];
    }

    if (!profile) {
      return { data: { session: null }, error: { message: "Credenziali non valide." } };
    }

    const mockUser = {
      id: profile.id,
      email,
      user_metadata: { username: profile.username, display_name: profile.display_name },
    };

    const session = {
      access_token: `mock-token-${profile.id}`,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh",
      user: mockUser,
    };

    return { data: { user: mockUser, session }, error: null };
  }

  if (action === "signOut") {
    return { error: null };
  }

  return { data: null, error: { message: `Auth action ${action} not implemented` } };
}

function getActiveSession(db: any) {
  try {
    const req = getRequest();
    const cookieHeader = req?.headers?.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c: string) => {
        const parts = c.trim().split("=");
        return [parts[0], parts.slice(1).join("=")];
      }),
    );
    const userId = cookies["casino_userId"];
    if (userId) {
      const profile = db.profiles.find((p: any) => p.id === userId);
      if (profile) {
        return {
          access_token: `mock-token-${profile.id}`,
          token_type: "bearer",
          expires_in: 86400,
          refresh_token: "mock-refresh",
          user: {
            id: profile.id,
            email: `${profile.username}@revenge.local`,
            user_metadata: {
              username: profile.username,
              display_name: profile.display_name,
            },
          },
        };
      }
    }
  } catch (e) {
    console.error("[Supabase Mock Server] Error reading session cookie:", e);
  }
  return null;
}
