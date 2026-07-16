import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  Firestore,
} from "firebase/firestore/lite";
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
    // 1. Try to load from the optimized single-document structure first
    const docRef = doc(db, "app_state", "global");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const dbData = docSnap.data() as Record<string, unknown[]>;
      console.log("Loaded optimized single-document DB from Firestore:", Object.keys(dbData));
      return dbData;
    }

    // 2. Migration fallback: If not found, load individual tables and migrate
    console.log("Single-document state not found. Migrating legacy individual Firestore tables...");
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

    // Save the migrated state back as a single document immediately to complete migration
    await setDoc(docRef, data);
    console.log("Migration successful: Saved all legacy tables to optimized single-document.");
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
    const docRef = doc(db, "app_state", "global");
    await setDoc(docRef, data);
    console.log("Saved DB state to Firestore.");
  } catch (err) {
    console.error("Error saving DB to Firebase:", err);
  }
}
