import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore/lite";
import firebaseConfig from "./firebase-config";

// Circuit breaker state to prevent repeated quota errors
let writeQuotaExceededUntil = 0;
let readQuotaExceededUntil = 0;

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err?.cause || err?.stack || err || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  return (
    code.includes("resource-exhausted") ||
    msg.includes("quota limit exceeded") ||
    msg.includes("quota exceeded") ||
    msg.includes("free daily write units") ||
    msg.includes("resource_exhausted")
  );
}

function isFirestoreWriteDisabled(): boolean {
  return Date.now() < writeQuotaExceededUntil;
}

function markFirestoreQuotaExceeded() {
  writeQuotaExceededUntil = Date.now() + 60 * 1000; // Only 1 minute cooldown
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
        readQuotaExceededUntil = Date.now() + 60 * 1000;
        console.warn("[Firestore Database] Read quota reached.");
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
            readQuotaExceededUntil = Date.now() + 60 * 1000;
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

export async function saveDbToFirestore(data: Record<string, any[]>) {
  if (isFirestoreWriteDisabled()) {
    return;
  }

  try {
    await saveDbToFirestoreInternal(data, false);
    return;
  } catch (err: any) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded();
      console.warn("[Firestore Database] Write quota limit exceeded.");
      return;
    }
    console.warn(
      "[Firestore Database] Error saving to custom db, attempting default db:",
      err?.message || err,
    );
    try {
      await saveDbToFirestoreInternal(data, true);
    } catch (defaultErr: any) {
      if (isQuotaError(defaultErr)) {
        markFirestoreQuotaExceeded();
      } else {
        console.error(
          "[Firestore Database] Final failure saving to Firestore:",
          defaultErr?.message || defaultErr,
        );
      }
    }
  }
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

  await setDoc(
    docRef,
    {
      data: serializedData,
      updated_at: new Date().toISOString(),
    },
    { merge: true },
  );
}
