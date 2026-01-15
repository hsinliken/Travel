
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  updateDoc,
  Firestore
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { KBDocument } from "./types";

const hasFirebaseConfig = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_API_KEY);

let db: Firestore | null = null;
let docsCollection: any = null;

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
    docsCollection = collection(db, "kb_documents");
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
}

const LOCAL_STORAGE_KEY = 'tp_docs_fallback';

export const saveDocumentToFirebase = async (kbDoc: Omit<KBDocument, 'id'>): Promise<string> => {
  if (db && docsCollection) {
    const docRef = await addDoc(docsCollection, {
      ...kbDoc,
      uploadDate: new Date().toISOString()
    });
    return docRef.id;
  } else {
    const docs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const id = crypto.randomUUID();
    const newDoc = { ...kbDoc, id, uploadDate: new Date().toISOString() };
    docs.push(newDoc);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs));
    return id;
  }
};

export const updateDocumentInFirebase = async (id: string, updates: Partial<KBDocument>): Promise<void> => {
  if (db) {
    const docRef = doc(db, "kb_documents", id);
    await updateDoc(docRef, updates);
  } else {
    const docs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const index = docs.findIndex((d: any) => d.id === id);
    if (index !== -1) {
      docs[index] = { ...docs[index], ...updates };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs));
    }
  }
};

export const fetchDocumentsFromFirebase = async (): Promise<KBDocument[]> => {
  if (db && docsCollection) {
    const q = query(docsCollection, orderBy("uploadDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as KBDocument));
  } else {
    const docs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    return docs.sort((a: any, b: any) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }
};

export const deleteDocumentFromFirebase = async (id: string): Promise<void> => {
  if (db) {
    const docRef = doc(db, "kb_documents", id);
    await deleteDoc(docRef);
  } else {
    const docs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const filtered = docs.filter((d: any) => d.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  }
};
