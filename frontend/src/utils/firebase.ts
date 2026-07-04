import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Guard: only initialise Firebase when a valid API key is present.
// During Next.js static build/SSR the NEXT_PUBLIC_* vars may be absent,
// which would otherwise cause "auth/invalid-api-key" at prerender time.
let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (typeof window !== "undefined" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID?.trim();
  const normalizedDatabaseId =
    databaseId && databaseId !== "(default)" && databaseId !== "default"
      ? databaseId
      : undefined;

  dbInstance = normalizedDatabaseId
    ? getFirestore(app, normalizedDatabaseId)
    : getFirestore(app);

  authInstance = getAuth(app);
}

// Cast them to their actual types so the rest of the application
// doesn't complain about nulls. They will be non-null on the client.
export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;
export default app;
