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

export function getFirestoreDb() {
  const app = getFirebaseApp();
  return getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export async function loadDbFromFirestore(): Promise<Record<string, any[]> | null> {
  try {
    console.log("[Firestore Database] Loading application state from Firestore...");
    const db = getFirestoreDb();
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
  } catch (err) {
    console.error("[Firestore Database] Error loading state from Firestore:", err);
    return null;
  }
}

export async function saveDbToFirestore(data: Record<string, any[]>) {
  try {
    console.log("[Firestore Database] Saving application state to Firestore...");
    const db = getFirestoreDb();
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
  } catch (err) {
    console.error("[Firestore Database] Error saving state to Firestore:", err);
  }
}
