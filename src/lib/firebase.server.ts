import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore/lite";
import firebaseConfig from "./firebase-config";
import fs from "fs";
import path from "path";

// Circuit breaker state to prevent repeated quota errors
let writeQuotaExceededUntil = 0;
let readQuotaExceededUntil = 0;

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err?.cause || err?.stack || err || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  return (
    code.includes("resource-exhausted") ||
    code.includes("quota") ||
    msg.includes("quota limit exceeded") ||
    msg.includes("quota exceeded") ||
    msg.includes("free daily write units") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota_exceeded") ||
    msg.includes("limit exceeded") ||
    msg.includes("429")
  );
}

function isFirestoreWriteDisabled(): boolean {
  if (Date.now() < writeQuotaExceededUntil) return true;
  try {
    const quotaFile = path.join(process.cwd(), ".firestore-quota-exceeded");
    if (fs.existsSync(quotaFile)) {
      const stat = fs.statSync(quotaFile);
      if (Date.now() - stat.mtimeMs < 24 * 60 * 60 * 1000) {
        return true;
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
}

function markFirestoreQuotaExceeded() {
  writeQuotaExceededUntil = Date.now() + 24 * 60 * 60 * 1000;
  try {
    const quotaFile = path.join(process.cwd(), ".firestore-quota-exceeded");
    fs.writeFileSync(quotaFile, new Date().toISOString(), "utf-8");
  } catch (e) {
    // ignore
  }
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
    return await loadDbFromFirestoreInternal(false);
  } catch (err: any) {
    if (isQuotaError(err)) {
      readQuotaExceededUntil = Date.now() + 15 * 60 * 1000; // 15 min cooldown
      console.warn(
        "[Firestore Database] Read quota limit reached. Using Cloudflare D1 / local cache.",
      );
      return null;
    }
    if (err?.message?.includes("does not exist")) {
      return null;
    }
    console.warn(
      "[Firestore Database] Failed to load using custom database ID, trying default database...",
      err?.message || err,
    );
    try {
      return await loadDbFromFirestoreInternal(true);
    } catch (defaultErr: any) {
      if (isQuotaError(defaultErr)) {
        readQuotaExceededUntil = Date.now() + 15 * 60 * 1000;
        console.warn(
          "[Firestore Database] Read quota limit reached on default DB. Using Cloudflare D1 / local cache.",
        );
        return null;
      }
      return null;
    }
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
      console.warn(
        "[Firestore Database] Write quota limit exceeded. Firestore sync paused for 24h. Data persists in Cloudflare D1 / local storage.",
      );
      return;
    }
    if (err?.message?.includes("does not exist")) {
      return;
    }
    try {
      await saveDbToFirestoreInternal(data, true);
    } catch (defaultErr: any) {
      if (isQuotaError(defaultErr)) {
        markFirestoreQuotaExceeded();
        console.warn("[Firestore Database] Write quota limit exceeded on default DB.");
        return;
      }
    }
  }
}

async function saveDbToFirestoreInternal(data: Record<string, any[]>, useDefault: boolean) {
  const db = getFirestoreDb(useDefault);
  const docRef = doc(db, "app_state", "global");
  const serializedData = JSON.stringify(data);

  await setDoc(
    docRef,
    {
      data: serializedData,
      updated_at: new Date().toISOString(),
    },
    { merge: true },
  );
}
