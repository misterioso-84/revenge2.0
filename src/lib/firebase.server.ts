import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, Firestore } from "firebase/firestore/lite";
import config from "../../firebase-applet-config.json";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

let dbInstance: Firestore | null = null;

export function getFirebaseDb(): Firestore | null {
  if (dbInstance) return dbInstance;

  try {
    if (!config || !config.apiKey) {
      console.warn("Firebase config not loaded or incomplete, skipping cloud sync");
      return null;
    }
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    if (config.firestoreDatabaseId) {
      dbInstance = getFirestore(app, config.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(app);
    }
    console.log("Firebase DB initialized successfully.");
    return dbInstance;
  } catch (err) {
    console.error("Failed to initialize Firebase DB:", err);
    return null;
  }
}

export async function loadDbFromFirebase(): Promise<Record<string, unknown[]> | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const collRef = collection(db, "app_tables");
    const querySnapshot = await getDocs(collRef);
    if (querySnapshot.empty) {
      console.log("Firestore app_tables collection is empty.");
      return null;
    }

    const data: Record<string, unknown[]> = {};
    querySnapshot.forEach((docSnap) => {
      data[docSnap.id] = (docSnap.data().data as unknown[]) || [];
    });
    console.log("Loaded tables from Firestore:", Object.keys(data));
    return data;
  } catch (err) {
    console.error("Error loading DB from Firebase:", err);
    return null;
  }
}

export async function saveDbToFirebase(data: Record<string, unknown[]>): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const promises = Object.entries(data).map(async ([tableName, list]) => {
      const docRef = doc(db, "app_tables", tableName);
      await setDoc(docRef, { data: list });
    });
    await Promise.all(promises);
    console.log("Successfully saved all tables to Firestore.");
  } catch (err) {
    console.error("Error saving DB to Firebase:", err);
  }
}
