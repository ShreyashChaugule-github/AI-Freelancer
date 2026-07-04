import * as dotenv from "dotenv";
dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let auth: any;
let isFirebaseReady = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";

// Only initialise Firebase if a project ID is provided
if (projectId) {
  try {
    const admin = require("firebase-admin");

    if (admin.apps.length === 0) {
      if (serviceAccountEnv && serviceAccountEnv.trim().startsWith("{")) {
        const serviceAccount = JSON.parse(serviceAccountEnv);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("Firebase Admin SDK initialized with Service Account Credentials.");
      } else {
        // Use Application Default Credentials (works on Cloud Run automatically)
        admin.initializeApp({ projectId });
        console.log(`Firebase Admin SDK initialized with project ID: ${projectId}`);
      }
    }

    const { getFirestore } = require("firebase-admin/firestore");
    db = databaseId !== "(default)" 
      ? getFirestore(admin.app(), databaseId) 
      : getFirestore(admin.app());
    auth = admin.auth();
    isFirebaseReady = true;
    console.log("Firestore ready.");
  } catch (err: any) {
    console.warn(
      "WARNING: Firebase initialization failed. Running in offline/mock mode.\n" +
      `  Error: ${err.message}\n` +
      "  Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT in .env to enable Firestore."
    );
    db = createMockFirestore() as any;
    auth = {} as any;
  }
} else {
  console.warn(
    "WARNING: FIREBASE_PROJECT_ID not set. Running in offline/mock mode. " +
    "API routes that write to Firestore will silently no-op."
  );
  db = createMockFirestore() as any;
  auth = {} as any;
}

// ─── Mock Firestore stub (for local dev without credentials) ─────────────────
function createMockFirestore() {
  const makeDoc = (data: any = {}) => ({
    id: "mock-id",
    data: () => data,
    exists: true,
    exists_: true,
    get: async () => makeDoc(data),
    set: async () => {},
    update: async () => {},
    delete: async () => {},
    ref: { update: async () => {}, set: async () => {} },
  });

  const makeCollection = () => ({
    doc: (_id?: string) => ({
      ...makeDoc(),
      collection: () => makeCollection(),
      set: async () => {},
      update: async () => {},
      get: async () => makeDoc(),
    }),
    add: async () => makeDoc(),
    where: () => makeCollection(),
    orderBy: () => makeCollection(),
    limit: () => makeCollection(),
    get: async () => ({ docs: [], empty: true, forEach: () => {} }),
  });

  return { collection: () => makeCollection() };
}

export { db, auth, isFirebaseReady };
