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
  // Only back off for 5 minutes instead of 24h
  writeQuotaExceededUntil = Date.now() + 5 * 60 * 1000;
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

  try {
    const data = await loadDbFromFirestoreInternal(false);
    if (data) return data;
  } catch (err: any) {
    if (isQuotaError(err)) {
      readQuotaExceededUntil = Date.now() + 5 * 60 * 1000;
      console.warn("[Firestore Database] Read quota limit reached.");
      return null;
    }
    console.warn("[Firestore Database] Error loading from Firestore:", err?.message || err);
  }

  try {
    return await loadDbFromFirestoreInternal(true);
  } catch (err: any) {
    if (isQuotaError(err)) {
      readQuotaExceededUntil = Date.now() + 5 * 60 * 1000;
    }
    return null;
  }
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
  } catch (err: any) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded();
      console.warn("[Firestore Database] Write quota limit exceeded.");
      return;
    }
    console.warn("[Firestore Database] Error saving to custom db, attempting default db:", err?.message || err);
    try {
      await saveDbToFirestoreInternal(data, true);
    } catch (defaultErr: any) {
      if (isQuotaError(defaultErr)) {
        markFirestoreQuotaExceeded();
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

