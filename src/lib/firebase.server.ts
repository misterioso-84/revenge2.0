import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore/lite";
import firebaseConfig from "../../firebase-applet-config.json";

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
  try {
    return await loadDbFromFirestoreInternal(false);
  } catch (err: any) {
    if (
      err?.message?.includes("Quota limit exceeded") ||
      err?.message?.includes("does not exist")
    ) {
      console.warn("[Firestore Database] Skipped loading due to quota or DB existence limits.");
      return null;
    }
    console.warn(
      "[Firestore Database] Failed to load using custom database ID, trying default database...",
      err?.message || err,
    );
    try {
      return await loadDbFromFirestoreInternal(true);
    } catch (defaultErr: any) {
      if (
        defaultErr?.message?.includes("Quota limit exceeded") ||
        defaultErr?.message?.includes("does not exist")
      ) {
        console.warn(
          "[Firestore Database] Skipped loading from default DB due to quota or existence limits.",
        );
        return null;
      }
      console.error(
        "[Firestore Database] Failed to load from default database as well:",
        defaultErr?.message || defaultErr,
      );
      return null; // Return null instead of throwing to prevent app crash
    }
  }
}

async function loadDbFromFirestoreInternal(
  useDefault: boolean,
): Promise<Record<string, any[]> | null> {
  console.log(
    `[Firestore Database] Loading application state from Firestore (useDefault: ${useDefault})...`,
  );
  const db = getFirestoreDb(useDefault);
  const docRef = doc(db, "app_state", "global");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    console.log("[Firestore Database] Loaded application state successfully from Firestore.");
    const payload = docSnap.data();
    if (payload && payload.data) {
      // The data is stored as a JSON string or parsed object
      if (typeof payload.data === "string") {
        return JSON.parse(payload.data);
      }
      return payload.data;
    }
  }
  console.log("[Firestore Database] No existing app_state found in Firestore.");
  return null;
}

export async function saveDbToFirestore(data: Record<string, any[]>) {
  try {
    await saveDbToFirestoreInternal(data, false);
  } catch (err: any) {
    if (
      err?.message?.includes("Quota limit exceeded") ||
      err?.message?.includes("does not exist")
    ) {
      console.warn("[Firestore Database] Skipped saving due to quota or DB existence limits.");
      return;
    }
    console.warn(
      "[Firestore Database] Failed to save using custom database ID, trying default database...",
      err?.message || err,
    );
    try {
      await saveDbToFirestoreInternal(data, true);
    } catch (defaultErr: any) {
      if (
        defaultErr?.message?.includes("Quota limit exceeded") ||
        defaultErr?.message?.includes("does not exist")
      ) {
        console.warn(
          "[Firestore Database] Skipped saving to default DB due to quota or existence limits.",
        );
        return;
      }
      console.error(
        "[Firestore Database] Failed to save to default database as well:",
        defaultErr?.message || defaultErr,
      );
    }
  }
}

async function saveDbToFirestoreInternal(data: Record<string, any[]>, useDefault: boolean) {
  console.log(
    `[Firestore Database] Saving application state to Firestore (useDefault: ${useDefault})...`,
  );
  const db = getFirestoreDb(useDefault);
  const docRef = doc(db, "app_state", "global");

  // Convert to JSON-safe structure and serialize to string to avoid deep nesting limits or key errors
  const serializedData = JSON.stringify(data);

  await setDoc(
    docRef,
    {
      data: serializedData,
      updated_at: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log("[Firestore Database] Successfully saved application state to Firestore.");
}
