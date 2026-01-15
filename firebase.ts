
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  Firestore
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getBytes, FirebaseStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { KBDocument } from "./types";

const hasFirebaseConfig = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_API_KEY);

let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (hasFirebaseConfig) {
  try {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    };
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
}

export { storage };

const LOCAL_STORAGE_KEY = 'tp_docs_fallback';

// This is now legacy since we move to SQLite-first, but keeping for compatibility
export const fetchDocumentsFromFirebase = async (): Promise<KBDocument[]> => {
  if (db) {
    const docsCollection = collection(db, "kb_documents");
    const querySnapshot = await getDocs(docsCollection);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as KBDocument));
  }
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
};

/**
 * Uploads the actual SQLite binary to Firebase Storage
 */
export const uploadDatabaseFile = async (data: Uint8Array): Promise<void> => {
  if (!storage) throw new Error("Firebase Storage not initialized");
  const storageRef = ref(storage, 'database/knowledge_base.sqlite');
  await uploadBytes(storageRef, data);
};

/**
 * Downloads the actual SQLite binary from Firebase Storage
 */
export const downloadDatabaseFile = async (): Promise<Uint8Array | null> => {
  if (!storage) return null;
  const storageRef = ref(storage, 'database/knowledge_base.sqlite');
  try {
    const buffer = await getBytes(storageRef);
    return new Uint8Array(buffer);
  } catch (e) {
    console.warn("No remote database found or access denied.");
    return null;
  }
};
