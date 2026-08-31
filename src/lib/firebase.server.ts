import fs from "node:fs";
import path from "node:path";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore/lite";
import firebaseConfig from "./firebase-config";

// Circuit breaker state to prevent repeated quota errors
// Daily quotas reset once a day, so suppress attempts when quota is exceeded
let writeQuotaExceededUntil = 0;
let readQuotaExceededUntil = 0;

// Load persisted quota state on startup
try {
  const quotaFile = path.join(process.cwd(), ".firestore_quota.json");
  if (fs.existsSync(quotaFile)) {
    const data = JSON.parse(fs.readFileSync(quotaFile, "utf-8"));
    if (data.writeQuotaExceededUntil && typeof data.writeQuotaExceededUntil === "number") {
      writeQuotaExceededUntil = data.writeQuotaExceededUntil;
    }
    if (data.readQuotaExceededUntil && typeof data.readQuotaExceededUntil === "number") {
      readQuotaExceededUntil = data.readQuotaExceededUntil;
    }
  }
} catch {
  // ignore
}

function persistQuotaState() {
  try {
    const quotaFile = path.join(process.cwd(), ".firestore_quota.json");
    fs.writeFileSync(
      quotaFile,
      JSON.stringify(
        {
          writeQuotaExceededUntil,
          readQuotaExceededUntil,
          lastUpdated: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf-8",
    );
  } catch {
    // ignore
  }
}

// Debounce state to avoid excessive writes
let pendingSaveTimer: any = null;
let pendingSaveData: Record<string, any[]> | null = null;
let isWriting = false;

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(
    err?.message || err?.cause || err?.stack || err?.details || err || "",
  ).toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  return (
    code.includes("resource-exhausted") ||
    code.includes("quota-exceeded") ||
    msg.includes("quota limit exceeded") ||
    msg.includes("quota exceeded") ||
    msg.includes("free daily write units") ||
    msg.includes("free daily read units") ||
    msg.includes("free tier database") ||
    msg.includes("resource_exhausted") ||
    msg.includes("resource-exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit")
  );
}

function isFirestoreWriteDisabled(): boolean {
  return Date.now() < writeQuotaExceededUntil;
}

function markFirestoreWriteQuotaExceeded() {
  // Suppress write attempts for 4 hours since daily quota limits reset on a daily schedule
  writeQuotaExceededUntil = Date.now() + 4 * 60 * 60 * 1000;
  persistQuotaState();
  console.warn(
    "[Firestore Database] Write quota limit reached for free tier database. Writes will pause while relying on local and replica persistence.",
  );
}

function markFirestoreReadQuotaExceeded() {
  readQuotaExceededUntil = Date.now() + 4 * 60 * 60 * 1000;
  persistQuotaState();
  console.warn(
    "[Firestore Database] Read quota limit reached for free tier database. Reads will pause while relying on local and replica persistence.",
  );
}

// Safely initialize Firebase App
function getFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export function getFirestoreDb(useDefault = false) {
  const app = getFirebaseApp();
  const dbId = useDefault ? undefined : firebaseConfig.firestoreDatabaseId;
  return getFirestore(app, dbId);
}

export async function loadDbFromFirestore(): Promise<Record<string, any[]> | null> {
  if (Date.now() < readQuotaExceededUntil) {
    return null;
  }

  // Attempt reading with up to 2 retries
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const data = await loadDbFromFirestoreInternal(false);
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        return data;
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        markFirestoreReadQuotaExceeded();
        return null;
      }
      console.warn(
        `[Firestore Database] Attempt ${attempt} error loading from custom db:`,
        err?.message || err,
      );
      if (attempt === 2) {
        try {
          const fallbackData = await loadDbFromFirestoreInternal(true);
          if (
            fallbackData &&
            typeof fallbackData === "object" &&
            Object.keys(fallbackData).length > 0
          ) {
            return fallbackData;
          }
        } catch (fbErr: any) {
          if (isQuotaError(fbErr)) {
            markFirestoreReadQuotaExceeded();
          }
        }
      }
    }
  }

  return null;
}

async function loadDbFromFirestoreInternal(
  useDefault: boolean,
): Promise<Record<string, any[]> | null> {
  const db = getFirestoreDb(useDefault);
  const docRef = doc(db, "app_state", "global");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const payload = docSnap.data();
    if (payload && payload.data) {
      if (typeof payload.data === "string") {
        return JSON.parse(payload.data);
      }
      return payload.data;
    }
  }
  return null;
}

/**
 * Saves database state to Firestore with intelligent debouncing and quota guard
 */
export async function saveDbToFirestore(data: Record<string, any[]>) {
  if (isFirestoreWriteDisabled()) {
    return;
  }

  pendingSaveData = data;

  // Debounce writes by 5 seconds to avoid hitting daily write unit limits
  if (pendingSaveTimer) {
    return;
  }

  pendingSaveTimer = setTimeout(async () => {
    pendingSaveTimer = null;
    if (!pendingSaveData || isWriting || isFirestoreWriteDisabled()) {
      return;
    }

    const dataToSave = pendingSaveData;
    pendingSaveData = null;
    isWriting = true;

    try {
      await saveDbToFirestoreInternal(dataToSave, false);
    } catch (err: any) {
      if (isQuotaError(err)) {
        markFirestoreWriteQuotaExceeded();
        isWriting = false;
        return;
      }

      // If non-quota error, try fallback default database once
      try {
        await saveDbToFirestoreInternal(dataToSave, true);
      } catch (defaultErr: any) {
        if (isQuotaError(defaultErr)) {
          markFirestoreWriteQuotaExceeded();
        } else {
          console.warn(
            "[Firestore Database] Fallback write error:",
            defaultErr?.message || defaultErr,
          );
        }
      }
    } finally {
      isWriting = false;
    }
  }, 5000);
}

async function saveDbToFirestoreInternal(data: Record<string, any[]>, useDefault: boolean) {
  const db = getFirestoreDb(useDefault);
  const docRef = doc(db, "app_state", "global");

  // Keep audit logs and sessions bounded to stay safely within document limits
  const cleanData: Record<string, any[]> = { ...data };
  if (Array.isArray(cleanData.audit_logs) && cleanData.audit_logs.length > 200) {
    cleanData.audit_logs = cleanData.audit_logs.slice(0, 200);
  }
  if (Array.isArray(cleanData.user_sessions) && cleanData.user_sessions.length > 50) {
    cleanData.user_sessions = cleanData.user_sessions.slice(0, 50);
  }

  const serializedData = JSON.stringify(cleanData);

  try {
    await setDoc(
      docRef,
      {
        data: serializedData,
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (err: any) {
    if (isQuotaError(err)) {
      markFirestoreWriteQuotaExceeded();
      return;
    }
    throw err;
  }
}
