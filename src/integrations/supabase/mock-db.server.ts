import initialDbStatic from "../../../mock-db.json";
import * as neonModuleStatic from "../../lib/neon.server";
import * as firestoreModuleStatic from "../../lib/firebase.server";

let getRequestModule: any = null;
async function getGetRequest() {
  if (getRequestModule) return getRequestModule;
  if (typeof window === "undefined") {
    try {
      const mod = await import(/* @vite-ignore */ "@tanstack/react-start/server");
      getRequestModule = mod.getRequest;
      return getRequestModule;
    } catch (e) {
      // Ignore
    }
  }
  return null;
}

async function getNeon() {
  return neonModuleStatic;
}

async function getFirestore() {
  return firestoreModuleStatic;
}

let fsModule: any = null;
let pathModule: any = null;

async function getFsAndPath() {
  if (fsModule && pathModule) return { fs: fsModule, path: pathModule };
  if (typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node) {
    try {
      fsModule = await import(/* @vite-ignore */ "fs");
      pathModule = await import(/* @vite-ignore */ "path");
      return { fs: fsModule, path: pathModule };
    } catch (e) {
      // Ignore
    }
  }
  return { fs: null, path: null };
}

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
    eventi_tickets: [
      {
        id: "ticket-1",
        citizen_id: "citizen-1",
        citizen_name: "Mario Rossi",
        category: "Ticket Fantino - Qualificazioni",
        price: 2500,
        event_phase: "Qualificazioni",
        issued_by: "Amministratore",
        created_at: new Date().toISOString(),
      },
      {
        id: "ticket-2",
        citizen_id: "citizen-2",
        citizen_name: "Giuseppe Bianchi",
        category: "Spettatore VIP - Qualificazioni",
        price: 750,
        event_phase: "Qualificazioni",
        issued_by: "Amministratore",
        created_at: new Date().toISOString(),
      },
    ],
    eventi_qualificazioni: [
      {
        id: "qual-1",
        citizen_id: "citizen-1",
        citizen_name: "Mario Rossi",
        minutes: 1,
        seconds: 21,
        milliseconds: 340,
        time_formatted: "01:21.340",
        time_ms: 81340,
        laps: 10,
        attempt_number: 1,
        notes: "Batteria #1 - Pista asciutta",
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: "qual-2",
        citizen_id: "citizen-2",
        citizen_name: "Giuseppe Bianchi",
        minutes: 1,
        seconds: 23,
        milliseconds: 110,
        time_formatted: "01:23.110",
        time_ms: 83110,
        laps: 10,
        attempt_number: 1,
        notes: "Batteria #1",
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ],
    eventi_scommesse: [],
    eventi_finalisti: [],
  };

  return db;
}

function ensureDbTables(db: Record<string, any[]>) {
  if (!db || typeof db !== "object") return db;
  const initial = getInitialDb();
  for (const table of Object.keys(initial)) {
    if (!db[table] || !Array.isArray(db[table])) {
      db[table] = initial[table];
    }
  }
  db.audit_logs = db.audit_logs || [];
  return db;
}

let cachedDb: Record<string, any[]> | null = null;
let lastLoadedTime = 0;
const CACHE_TTL_MS = 2000; // 2 seconds Cache TTL to prevent serving stale data in serverless environments
let isInitializing = false;
let initPromise: Promise<Record<string, any[]>> | null = null;

async function loadDb(): Promise<Record<string, any[]>> {
  const now = Date.now();
  if (cachedDb && now - lastLoadedTime < CACHE_TTL_MS) {
    return ensureDbTables(cachedDb);
  }

  // 0. If in browser, load from localStorage first (for zero-loss static hosting like Cloudflare Pages!)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("casinorevenge_db");
      if (stored) {
        console.log("[Local Storage Sync] Loaded database from localStorage.");
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          cachedDb = ensureDbTables(parsed);
          lastLoadedTime = Date.now();
          return cachedDb;
        }
      }
    } catch (e) {
      console.error("Error loading db from localStorage:", e);
    }
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  let neonFailed = false;
  let firestoreFailed = false;

  isInitializing = true;
  initPromise = (async () => {
    // 1. Attempt Neon Postgres
    const neonMod = await getNeon();
    if (neonMod && neonMod.loadDbFromNeon) {
      try {
        console.log("[Neon Sync] Attempting to load database from Neon Postgres...");
        const pgData = await neonMod.loadDbFromNeon();
        if (pgData) {
          console.log(
            "[Neon Sync] Successfully loaded database from Neon. Merging with initial DB and updating local cache...",
          );
          const initialDb = getInitialDb();
          const mergedDb = { ...initialDb, ...pgData };
          mergedDb.audit_logs = mergedDb.audit_logs || [];
          cachedDb = mergedDb;
          lastLoadedTime = Date.now();
          try {
            const { fs, path } = await getFsAndPath();
            if (fs && path) {
              const dbFile = path.join(process.cwd(), "mock-db.json");
              fs.writeFileSync(dbFile, JSON.stringify(cachedDb, null, 2), "utf-8");
            }
          } catch (e) {
            console.error("Error saving local DB cache:", e);
          }
          return cachedDb;
        }
      } catch (err) {
        console.error("[Neon Sync] Failed to load from Neon Postgres:", err);
        neonFailed = true;
      }
    }

    // 2. Attempt Firestore (Ultra robust for Cloudflare Pages!)
    const firestoreMod = await getFirestore();
    if (firestoreMod && firestoreMod.loadDbFromFirestore) {
      try {
        console.log("[Firestore Sync] Attempting to load database from Firestore...");
        const firestoreData = await firestoreMod.loadDbFromFirestore();
        if (firestoreData) {
          console.log(
            "[Firestore Sync] Successfully loaded database from Firestore. Merging with initial DB and updating local cache...",
          );
          const initialDb = getInitialDb();
          const mergedDb = { ...initialDb, ...firestoreData };
          mergedDb.audit_logs = mergedDb.audit_logs || [];
          cachedDb = mergedDb;
          lastLoadedTime = Date.now();
          try {
            const { fs, path } = await getFsAndPath();
            if (fs && path) {
              const dbFile = path.join(process.cwd(), "mock-db.json");
              fs.writeFileSync(dbFile, JSON.stringify(cachedDb, null, 2), "utf-8");
            }
          } catch (e) {
            console.error("Error saving local DB cache:", e);
          }
          return cachedDb;
        }
      } catch (err) {
        console.error("[Firestore Sync] Failed to load from Firestore:", err);
        firestoreFailed = true;
      }
    }

    // 3. Attempt Local File (fs fallback, mainly for local dev without cloud connection)
    console.log("[Sync Fallback] Falling back to local mock-db.json...");
    let localDb: Record<string, any[]> | null = null;
    try {
      const { fs, path } = await getFsAndPath();
      if (fs && path) {
        const dbFile = path.join(process.cwd(), "mock-db.json");
        if (fs.existsSync(dbFile)) {
          const raw = fs.readFileSync(dbFile, "utf-8");
          localDb = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.error("Error loading mock db from file:", e);
    }

    // 4. Statically imported fallback (Perfect for zero-setup static or serverless deploys!)
    if (!localDb) {
      console.log(
        "[Sync Fallback] No local mock DB found on disk. Falling back to statically imported mock-db.json...",
      );
      try {
        localDb = JSON.parse(JSON.stringify(initialDbStatic));
      } catch (err) {
        console.error("Error loading statically imported mock db:", err);
      }
    }

    if (!localDb) {
      console.log("[Sync Fallback] Falling back to generating initial DB...");
      localDb = getInitialDb();
    }

    ensureDbTables(localDb);
    cachedDb = localDb;
    lastLoadedTime = Date.now();

    // Seed backends with initial/local state if we had to fall back to files/static and we are absolutely sure the load didn't just fail!
    console.log("[Sync Fallback] Seeding backends with database state...");
    if (!neonFailed && neonMod && neonMod.saveDbToNeon) {
      try {
        await neonMod.saveDbToNeon(localDb);
        console.log("[Neon Sync] Database state successfully seeded to Neon Postgres.");
      } catch (err) {
        console.error("[Neon Sync] Failed to seed Neon Postgres:", err);
      }
    }

    if (!firestoreFailed && firestoreMod && firestoreMod.saveDbToFirestore) {
      try {
        await firestoreMod.saveDbToFirestore(localDb);
        console.log("[Firestore Sync] Database state successfully seeded to Firestore.");
      } catch (err) {
        console.error("[Firestore Sync] Failed to seed Firestore:", err);
      }
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
  lastLoadedTime = Date.now();

  // 0. If in browser, save to localStorage (for zero-loss static hosting like Cloudflare Pages!)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("casinorevenge_db", JSON.stringify(db));
      console.log("[Local Storage Sync] Saved database to localStorage.");
    } catch (e) {
      console.error("Error saving db to localStorage:", e);
    }
  }

  // 1. Save to local file system
  try {
    const { fs, path } = await getFsAndPath();
    if (fs && path) {
      const dbFile = path.join(process.cwd(), "mock-db.json");
      fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");
    }
  } catch (e) {
    console.error("Error saving mock db locally:", e);
  }

  // 2. Save to Neon Postgres
  const neonMod = await getNeon();
  if (neonMod && neonMod.saveDbToNeon) {
    console.log("[Neon Sync] Saving database state to Neon Postgres...");
    try {
      await neonMod.saveDbToNeon(db);
      console.log("[Neon Sync] Database state successfully saved to Neon Postgres.");
    } catch (err) {
      console.error("[Neon Sync] Failed to save database state to Neon Postgres:", err);
    }
  }

  // 3. Save to Firestore
  const firestoreMod = await getFirestore();
  if (firestoreMod && firestoreMod.saveDbToFirestore) {
    console.log("[Firestore Sync] Saving database state to Firestore...");
    try {
      await firestoreMod.saveDbToFirestore(db);
      console.log("[Firestore Sync] Database state successfully saved to Firestore.");
    } catch (err) {
      console.error("[Firestore Sync] Failed to save database state to Firestore:", err);
    }
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

  const session = getActiveSessionSync(db);
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

function runAutoCloseActiveSessions(db: any): boolean {
  let modified = false;
  db.badge_sessions = db.badge_sessions || [];
  const now = new Date();

  db.badge_sessions = db.badge_sessions.map((s: any) => {
    if (!s.ended_at && s.started_at) {
      const startTime = new Date(s.started_at);
      const diffMs = now.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Auto-close sessions that exceed 12 hours of continuous run
      if (diffHours >= 12) {
        modified = true;
        const autoEndTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000).toISOString();

        // Clear badge_start_time for the user in profiles so they can start fresh
        const prof = (db.profiles || []).find((p: any) => p.id === s.user_id);
        if (prof) {
          prof.badge_start_time = null;
        }

        return {
          ...s,
          ended_at: autoEndTime,
          updated_at: now.toISOString(),
        };
      }
    }
    return s;
  });

  return modified;
}

function runAutoCreateJobs(db: Record<string, any[]>): boolean {
  let modified = false;
  try {
    const now = new Date();

    // Auto-close active sessions exceeding 12 hours
    if (runAutoCloseActiveSessions(db)) {
      modified = true;
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const dateMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const year = parseInt(dateMap.year);
    const month = parseInt(dateMap.month);
    const day = parseInt(dateMap.day);
    const hour = parseInt(dateMap.hour);

    const businessDate = new Date(
      year,
      month - 1,
      day,
      hour,
      parseInt(dateMap.minute ?? "0"),
      parseInt(dateMap.second ?? "0"),
    );
    if (hour < 3) {
      businessDate.setDate(businessDate.getDate() - 1);
    }

    const busYear = businessDate.getFullYear();
    const busMonth = String(businessDate.getMonth() + 1).padStart(2, "0");
    const busDay = String(businessDate.getDate()).padStart(2, "0");
    const targetNightDate = `${busYear}-${busMonth}-${busDay}`;

    db.nights = db.nights || [];
    const nightExists = db.nights.some((n: any) => n.night_date === targetNightDate);

    if (!nightExists) {
      console.log(`[Auto Job] Creating new business day (giornata) for date: ${targetNightDate}`);

      db.nights = db.nights.map((n: any) => {
        if (!n.is_closed) {
          modified = true;
          return { ...n, is_closed: true, updated_at: new Date().toISOString() };
        }
        return n;
      });

      const newNight = {
        id: "night-" + Math.random().toString(36).substring(2, 12),
        night_date: targetNightDate,
        title: `Giornata del ${busDay}/${busMonth}/${busYear}`,
        total: 0,
        is_closed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: "Creata automaticamente dal sistema",
      };
      db.nights.push(newNight);
      modified = true;
    }

    // Super-robust Europe/Rome calculation to find current week's Monday
    const weekdayShort = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      weekday: "short",
    }).format(now); // "Mon", "Tue", etc.
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDay = weekdays.indexOf(weekdayShort);
    const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;

    const romeMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const mondayDate = new Date(romeMidnight.getTime() + mondayDiff * 24 * 60 * 60 * 1000);

    const monYear = mondayDate.getUTCFullYear();
    const monMonth = String(mondayDate.getUTCMonth() + 1).padStart(2, "0");
    const monDay = String(mondayDate.getUTCDate()).padStart(2, "0");
    const currentMondayStr = `${monYear}-${monMonth}-${monDay}`;

    db.badge_weeks = db.badge_weeks || [];
    db.badge_sessions = db.badge_sessions || [];

    const activeWeek = db.badge_weeks.find((w: any) => w.active);
    const needsNewWeek =
      !activeWeek || (activeWeek.started_at && activeWeek.started_at < currentMondayStr);

    if (needsNewWeek) {
      console.log(`[Auto Job] Creating new badge week starting on Monday: ${currentMondayStr}`);

      if (activeWeek) {
        db.badge_weeks = db.badge_weeks.map((w: any) => {
          if (w.id === activeWeek.id) {
            modified = true;
            return {
              ...w,
              active: false,
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          return w;
        });

        // Automatically close all active badge sessions from the old week
        db.badge_sessions = db.badge_sessions.map((s: any) => {
          if (s.week_id === activeWeek.id && !s.ended_at) {
            modified = true;
            // Clear badge_start_time for the user in profiles so they can start fresh
            const prof = (db.profiles || []).find((p: any) => p.id === s.user_id);
            if (prof) {
              prof.badge_start_time = null;
            }
            return {
              ...s,
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        });
      }

      const monYearTwo = String(monYear).slice(-2);
      const monMonthStr = String(monMonth).padStart(2, "0");
      const monDayStr = String(monDay).padStart(2, "0");

      const sundayDate = new Date(mondayDate);
      sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);
      const sunYearTwo = String(sundayDate.getUTCFullYear()).slice(-2);
      const sunMonthStr = String(sundayDate.getUTCMonth() + 1).padStart(2, "0");
      const sunDayStr = String(sundayDate.getUTCDate()).padStart(2, "0");

      const weekLabel = `Settimana dal ${monDayStr}/${monMonthStr}/${monYearTwo} - ${sunDayStr}/${sunMonthStr}/${sunYearTwo}`;

      const newWeekId = "week-" + Math.random().toString(36).substring(2, 12);
      const newWeek = {
        id: newWeekId,
        label: weekLabel,
        active: true,
        started_at: currentMondayStr,
        ended_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "system",
      };
      db.badge_weeks.push(newWeek);
      modified = true;
    }
  } catch (error) {
    console.error("Error in runAutoCreateJobs:", error);
  }
  return modified;
}

function matchFilters(item: any, table: string, filters: any[]): boolean {
  for (const filter of filters) {
    const { column, value, op } = filter;
    let itemVal = item[column];
    if (column === "active" && table === "services" && itemVal === undefined) {
      itemVal = true;
    }

    if (op === "eq") {
      if (itemVal !== value) return false;
    } else if (op === "neq") {
      if (itemVal === value) return false;
    } else if (op === "is") {
      if (value === null) {
        if (itemVal !== null && itemVal !== undefined) return false;
      } else {
        if (itemVal !== value) return false;
      }
    } else if (op === "in") {
      if (!Array.isArray(value) || !value.includes(itemVal)) return false;
    } else if (op === "ilike") {
      if (typeof itemVal !== "string" || typeof value !== "string") {
        if (String(itemVal).toLowerCase() !== String(value).toLowerCase()) return false;
      } else {
        const cleanValue = value.replace(/%/g, ".*");
        const regex = new RegExp(`^${cleanValue}$`, "i");
        if (!regex.test(itemVal)) return false;
      }
    }
  }
  return true;
}

export async function queryMockDb(query: any): Promise<{ data: any; error: any }> {
  const db = await loadDb();

  const modified = runAutoCreateJobs(db);
  if (modified) {
    await saveDb(db);
  }

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
    const session = await getActiveSession(db);
    if (session && session.user) {
      const userId = session.user.id;
      const userRoles = db.user_roles || [];
      const profiles = db.profiles || [];
      const profile = profiles.find((p: any) => p.id === userId);
      isAdmin =
        profile?.role === "admin" ||
        userRoles.some((ur: any) => ur.user_id === userId && ur.role === "admin");
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

      const session = await getActiveSession(db);
      const creatorId = session?.user?.id || "mock-user-id-1234";

      const newConversion = {
        id: "conv-" + Math.random().toString(36).substring(2, 15),
        citizen_id: citizenId,
        night_id: nightId,
        direction,
        input_amount: input,
        eur_amount: eur,
        dobloni_amount: dob,
        created_by: creatorId,
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
    filtered = filtered.filter((item) => matchFilters(item, table, filters));

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

          const activeSess = (db.badge_sessions || []).find(
            (s: any) => s.user_id === item.id && !s.ended_at,
          );
          newItem.badge_start_time = item.badge_start_time || activeSess?.started_at || null;
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

    // Block duplicate citizens based on trimmed, case-insensitive full_name
    if (table === "citizens") {
      for (const row of rowsToInsert) {
        const fullName = (row.full_name || "").trim();
        const existingCitizen = (db.citizens || []).find(
          (c: any) => c.full_name?.trim().toLowerCase() === fullName.toLowerCase(),
        );
        if (existingCitizen) {
          return {
            data: null,
            error: { message: `Un cittadino con il nome "${fullName}" è già registrato.` },
          };
        }
      }
    }

    const insertedRows = rowsToInsert.map((row) => {
      const base: any = {
        id: row.id || Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(table === "services" ? { active: true } : {}),
        ...row,
      };

      if (table === "badge_sessions") {
        base.started_at = row.started_at || base.created_at;
        if (row.ended_at === undefined) {
          base.ended_at = null;
        }
        // Auto-close any existing active badge sessions for this user to prevent overlaps
        if (!base.ended_at) {
          db.badge_sessions = db.badge_sessions || [];
          db.badge_sessions.forEach((s: any) => {
            if (s.user_id === base.user_id && !s.ended_at) {
              s.ended_at = base.started_at || new Date().toISOString();
              s.updated_at = new Date().toISOString();
            }
          });
        }
        const prof = (db.profiles || []).find((p: any) => p.id === base.user_id);
        if (prof) {
          prof.badge_start_time = base.started_at;
        }
      }

      if (table === "badge_weeks") {
        base.started_at = row.started_at || base.created_at;
        base.active = row.active !== undefined ? row.active : true;
        if (row.ended_at === undefined) {
          base.ended_at = null;
        }
      }

      return base;
    });

    db[table] = [...db[table], ...insertedRows];
    if (table === "night_items") {
      recalculateNightsTotals(db);
    }
    if (table === "sanctions" || table === "leave_requests") {
      insertedRows.forEach((row) => checkAndTerminateActiveSessionsForUser(db, row.user_id));
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

    if (table === "sanctions" || table === "leave_requests") {
      results.forEach((row) => checkAndTerminateActiveSessionsForUser(db, row.user_id));
    }
    logOperation(db, operation, table, query, { data: results });
    await saveDb(db);
    return { data: Array.isArray(insertData) ? results : results[0], error: null };
  }

  if (operation === "update") {
    // Block duplicate citizens based on trimmed, case-insensitive full_name upon updating
    if (table === "citizens" && updateData && updateData.full_name !== undefined) {
      const newName = (updateData.full_name || "").trim();
      const matches = (db.citizens || []).filter((item: any) => matchFilters(item, table, filters));
      for (const m of matches) {
        const duplicate = (db.citizens || []).find(
          (c: any) => c.id !== m.id && c.full_name?.trim().toLowerCase() === newName.toLowerCase(),
        );
        if (duplicate) {
          return {
            data: null,
            error: { message: `Un cittadino con il nome "${newName}" è già registrato.` },
          };
        }
      }
    }

    const updatedRows: any[] = [];
    db[table] = db[table].map((item) => {
      if (matchFilters(item, table, filters)) {
        const updated = { ...item, ...updateData, updated_at: new Date().toISOString() };
        updatedRows.push(updated);
        return updated;
      }
      return item;
    });

    if (table === "badge_sessions") {
      updatedRows.forEach((row) => {
        if (row.ended_at) {
          const prof = (db.profiles || []).find((p: any) => p.id === row.user_id);
          if (prof) {
            prof.badge_start_time = null;
          }
        }
      });
    }

    if (table === "night_items") {
      recalculateNightsTotals(db);
    }
    if (table === "sanctions" || table === "leave_requests") {
      updatedRows.forEach((row) => checkAndTerminateActiveSessionsForUser(db, row.user_id));
    }
    logOperation(db, operation, table, query, { data: updatedRows });
    await saveDb(db);
    return { data: updatedRows, error: null };
  }

  if (operation === "delete") {
    const deletedRows: any[] = [];
    db[table] = db[table].filter((item) => {
      if (matchFilters(item, table, filters)) {
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
    const session = await getActiveSession(db);
    return { data: { session }, error: null };
  }

  if (action === "getUser") {
    const session = await getActiveSession(db);
    return { data: { user: session?.user ?? null }, error: null };
  }

  if (action === "signUp") {
    const { email, password, options } = payload;
    // Safely check both options (standard auth) and direct user_metadata (admin.createUser auth)
    const username =
      payload.user_metadata?.username || options?.data?.username || email.split("@")[0];
    const display_name =
      payload.user_metadata?.display_name || options?.data?.display_name || username;

    const existingUser = db.profiles.find(
      (p) => p.username && p.username.toLowerCase() === username.toLowerCase(),
    );
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
    // Safe username extraction that handles emails properly by removing the @revenge.local suffix instead of just splitting
    const rawUsername = email
      .replace(/@revenge\.local$/i, "")
      .trim()
      .toLowerCase();

    // Map common admin/user aliases to the actual database admin username
    const username =
      rawUsername === "admin" || rawUsername === "beppemonti84" ? "giuse84pro" : rawUsername;
    // Super robust trimming and case-insensitive check
    let profile = db.profiles.find(
      (p) => p.username && p.username.trim().toLowerCase() === username.trim().toLowerCase(),
    );

    // Dynamic robust fallback: If we look for the main administrator and "giuse84pro" profile
    // doesn't exist yet, fallback to finding "admin" or the first profile in the database
    if (
      !profile &&
      (username === "giuse84pro" || rawUsername === "admin" || rawUsername === "beppemonti84")
    ) {
      profile =
        db.profiles.find((p) => p.username && p.username.trim().toLowerCase() === "admin") ||
        db.profiles[0];
    }

    if (!profile) {
      return { data: { session: null }, error: { message: "Credenziali non valide." } };
    }

    const mockUser = {
      id: profile.id,
      email,
      user_metadata: {
        username: profile.username || "user",
        display_name: profile.display_name || profile.username || "Collaboratore",
      },
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

function getActiveSessionSync(db: any) {
  try {
    let cookieHeader = "";
    if (typeof window !== "undefined") {
      cookieHeader = document.cookie || "";
    } else {
      try {
        if (getRequestModule) {
          const req = getRequestModule();
          cookieHeader = req?.headers?.get("cookie") || "";
        }
      } catch (err) {
        // ignore
      }
    }
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c: string) => {
        const parts = c.trim().split("=");
        return [parts[0], parts.slice(1).join("=")];
      }),
    );
    let userId = cookies["casino_userId"];
    if (!userId && typeof window !== "undefined") {
      const storedStr = localStorage.getItem("casinorevenge_session");
      if (storedStr) {
        try {
          const parsed = JSON.parse(storedStr);
          userId = parsed.session?.user?.id;
        } catch (e) {
          // ignore
        }
      }
    }
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
            email: `${profile.username || "user"}@revenge.local`,
            user_metadata: {
              username: profile.username || "user",
              display_name: profile.display_name || profile.username || "Collaboratore",
            },
          },
        };
      }
    }
  } catch (e) {
    console.error("[Supabase Mock Server] Error reading session cookie synchronously:", e);
  }
  return null;
}

async function getActiveSession(db: any) {
  if (typeof window !== "undefined") {
    return getActiveSessionSync(db);
  }
  await getGetRequest();
  return getActiveSessionSync(db);
}

function checkAndTerminateActiveSessionsForUser(db: any, userId: string) {
  if (!userId) return false;
  const activeSanc = (db.sanctions || []).find((s: any) => {
    if (s.user_id !== userId || !s.is_active) return false;
    if (s.type === "espulsione") return true;
    if (s.type === "sospensione") {
      if (!s.expires_at) return true;
      return new Date(s.expires_at) > new Date();
    }
    return false;
  });

  const activeLv = (db.leave_requests || []).find((l: any) => {
    if (l.user_id !== userId || l.status !== "approved") return false;
    const todayStr = new Date().toISOString().split("T")[0];
    return todayStr >= l.start_date && todayStr <= l.end_date;
  });

  if (activeSanc || activeLv) {
    let closedAny = false;
    (db.badge_sessions || []).forEach((sess: any) => {
      if (sess.user_id === userId && sess.ended_at === null) {
        sess.ended_at = new Date().toISOString();
        closedAny = true;
      }
    });
    if (closedAny) {
      const prof = (db.profiles || []).find((p: any) => p.id === userId);
      if (prof) {
        prof.badge_start_time = null;
      }
    }
    return closedAny;
  }
  return false;
}
