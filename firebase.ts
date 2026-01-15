
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  Firestore
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getBytes, FirebaseStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const getEnv = (key: string, fallback: string) => {
  try {
    return (window as any).process?.env?.[key] || fallback;
  } catch {
    return fallback;
  }
};

const FIREBASE_API_KEY = getEnv("FIREBASE_API_KEY", "AIzaSyAmgZJ9XWOm5PyXU8axVj1_P9aZFJmoOa4");
const FIREBASE_PROJECT_ID = getEnv("FIREBASE_PROJECT_ID", "travel-ad466");

let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export const isCloudSyncEnabled = true;

try {
  const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: `${FIREBASE_PROJECT_ID}.firebasestorage.app`, 
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef" 
  };
  
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

export { storage };

export const uploadDatabaseFile = async (data: Uint8Array): Promise<void> => {
  if (!storage) throw new Error("Firebase Storage not initialized.");
  try {
    const storageRef = ref(storage, 'database/knowledge_base.sqlite');
    await uploadBytes(storageRef, data);
  } catch (error: any) {
    console.error("Firebase Upload Error Details:", error);
    if (error?.code === 'storage/unauthorized') {
      throw new Error("Unauthorized: Check Firebase Storage Rules (allow read, write: if true; for dev).");
    }
    if (error?.message?.includes("Failed to fetch")) {
      throw new Error("CORS Blocked: Please follow the Cloud Shell instructions in the Dashboard.");
    }
    throw error;
  }
};

export const downloadDatabaseFile = async (): Promise<Uint8Array | null> => {
  if (!storage) return null;
  try {
    const storageRef = ref(storage, 'database/knowledge_base.sqlite');
    const buffer = await getBytes(storageRef);
    return new Uint8Array(buffer);
  } catch (e: any) {
    console.warn("Firebase Download Warn:", e.message);
    if (e.code === 'storage/object-not-found') return null;
    if (e.message?.includes("Failed to fetch")) {
      throw new Error("CORS Blocked: Please follow the Cloud Shell instructions in the Dashboard.");
    }
    return null;
  }
};
