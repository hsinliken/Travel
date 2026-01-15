
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL, getBytes, FirebaseStorage, settableMetadata } from "firebase/storage";

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyAmgZJ9XWOm5PyXU8axVj1_P9aZFJmoOa4";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "travel-ad466";

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
  storage = getStorage(app);
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

export { storage };

/**
 * 上傳原始文件並獲取下載連結
 */
export const uploadRawFile = async (file: File): Promise<string> => {
  if (!storage) throw new Error("Firebase Storage not initialized.");
  try {
    // 使用時間戳避免檔名衝突
    const filePath = `raw_documents/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);
    
    // 關鍵修復：手動指定 Content-Type
    const metadata = {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        'originalName': file.name,
        'uploadedAt': new Date().toISOString()
      }
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error("Raw File Upload Error:", error);
    throw error;
  }
};

export const uploadDatabaseFile = async (data: Uint8Array): Promise<void> => {
  if (!storage) throw new Error("Firebase Storage not initialized.");
  try {
    const storageRef = ref(storage, 'database/knowledge_base.sqlite');
    await uploadBytes(storageRef, data, { contentType: 'application/x-sqlite3' });
  } catch (error: any) {
    console.error("Firebase Upload Error Details:", error);
    if (error?.code === 'storage/unauthorized') {
      throw new Error("Unauthorized: Check Firebase Storage Rules.");
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
