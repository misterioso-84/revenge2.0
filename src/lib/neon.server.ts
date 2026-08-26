export async function getNeonClient(): Promise<any> {
  // Neon database connection is disabled in favor of Firebase Firestore to prevent quota errors
  return null;
}

export async function loadDbFromNeon(): Promise<Record<string, any[]> | null> {
  return null;
}

export async function saveDbToNeon(_data: Record<string, any[]>) {
  return;
}
