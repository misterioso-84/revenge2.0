import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore/lite";
import firebaseConfig from "./firebase-config";

// Circuit breaker state to prevent repeated quota errors
let writeQuotaExceededUntil = 0;
let readQuotaExceededUntil = 0;

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  return (
    code.includes("resource-exhausted") ||
    code.includes("quota") ||
    msg.includes("quota limit exceeded") ||
    msg.includes("quota exceeded") ||
    msg.includes("free daily write units") ||
    msg.includes("resource_exhausted")
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

  try {
    return await loadDbFromFirestoreInternal(false);
  } catch (err: any) {
    if (isQuotaError(err)) {
      readQuotaExceededUntil = Date.now() + 15 * 60 * 1000; // 15 min cooldown
      console.warn("[Firestore Database] Read quota limit reached. Using local cache.");
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
          "[Firestore Database] Read quota limit reached on default DB. Using local cache.",
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
  if (Date.now() < writeQuotaExceededUntil) {
    return;
  }

  try {
    await saveDbToFirestoreInternal(data, false);
  } catch (err: any) {
    if (isQuotaError(err)) {
      writeQuotaExceededUntil = Date.now() + 30 * 60 * 1000; // 30 min cooldown
      console.warn(
        "[Firestore Database] Write quota limit exceeded. Changes saved locally in mock-db.json.",
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
        writeQuotaExceededUntil = Date.now() + 30 * 60 * 1000;
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
