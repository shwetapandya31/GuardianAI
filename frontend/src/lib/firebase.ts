import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { collection, getFirestore, type CollectionReference, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

let firebaseConfig: Record<string, string> | null = null;
export let isFirebaseConfigured = false;

/**
 * Set the Firebase web config once, fetched from the server so the API key can
 * stay in a runtime secret instead of being bundled into the client.
 */
export function setFirebaseConfig(config: Record<string, string>) {
  firebaseConfig = config;
  isFirebaseConfigured = Boolean(config["apiKey"] && config["projectId"]);
}

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured || !firebaseConfig) {
    throw new Error("Firebase is not configured. Connect a Firebase project first.");
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

export const COLLECTIONS = {
  users: "users",
  alerts: "alerts",
  cameras: "cameras",
} as const;

/** Per-user subcollection reference: users/{uid}/{name} */
export function userCollection(uid: string, name: string): CollectionReference {
  return collection(getDb(), COLLECTIONS.users, uid, name);
}

// GUARDIAN-AI: SHARED FIRESTORE CAMERA REGISTRATION
// Cameras belong to the police station / organization, NOT to an individual login.
// Every authenticated operator reads and writes the SAME top-level `cameras`
// collection that the Python backend already uses — no second camera database.
//
// STATION ACCESS INTEGRATION POINT:
// There is currently no station/organization field on the camera documents and no
// station-scoped Firebase Security Rule. When station-level access is introduced,
// add a `stationId` field on write and a `where("stationId", "==", ...)` filter here,
// backed by matching Firestore Security Rules. Do not fake access control in the UI.
export function sharedCameraCollection(): CollectionReference {
  return collection(getDb(), COLLECTIONS.cameras);
}

// GUARDIAN-AI: REAL-TIME FIRESTORE NOTIFICATIONS
// Alerts are shared, station-level incidents written by the Python detection backend
// into the SAME top-level `alerts` collection. Every authorized operator sees the
// same real alerts — no per-user copies, no sample data. Read/unread state is kept
// per-user OUTSIDE these documents (see useNotifications).
//
// STATION ACCESS INTEGRATION POINT: add a `stationId` field + matching Security Rule
// and filter here with where("stationId","==",...) when organization scoping lands.
export function sharedAlertCollection(): CollectionReference {
  return collection(getDb(), COLLECTIONS.alerts);
}
