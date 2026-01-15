
import { KBDocument } from "./types";
import { uploadDatabaseFile, downloadDatabaseFile } from "./firebase";

declare var initSqlJs: any;

let dbInstance: any = null;
const DB_NAME = 'BigEagleSQLiteDB';
const STORE_NAME = 'database';

/**
 * Loads the database binary from IndexedDB (Local Cache)
 */
async function loadDBFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get('sqlite_data');
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

/**
 * Saves the database binary to IndexedDB (Local Cache)
 */
async function saveDBToIndexedDB(data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(data, 'sqlite_data');
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Sync logic: Pull from cloud if local is missing or explicitly requested
 */
export const syncFromCloud = async () => {
  const remoteData = await downloadDatabaseFile();
  if (remoteData) {
    await saveDBToIndexedDB(remoteData);
    // Force re-init next time
    dbInstance = null;
    await initDB();
    return true;
  }
  return false;
};

/**
 * Sync logic: Push local DB to cloud
 */
export const syncToCloud = async () => {
  if (!dbInstance) await initDB();
  const binaryArray = dbInstance.export();
  await uploadDatabaseFile(binaryArray);
  localStorage.setItem('tp_last_sync', new Date().toISOString());
};

/**
 * Initializes the SQLite database
 */
export const initDB = async () => {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  // Try Local Cache first for speed
  let savedData = await loadDBFromIndexedDB();
  
  // If local cache empty, try one-time pull from Cloud
  if (!savedData) {
    savedData = await downloadDatabaseFile();
    if (savedData) await saveDBToIndexedDB(savedData);
  }

  dbInstance = savedData ? new SQL.Database(savedData) : new SQL.Database();

  // Initialize table
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      sourceType TEXT,
      content TEXT,
      uploadDate TEXT,
      reviewer TEXT,
      publishDate TEXT,
      url TEXT
    )
  `);

  if (!savedData) {
    await persistLocal();
  }

  return dbInstance;
};

const persistLocal = async () => {
  if (!dbInstance) return;
  const binaryArray = dbInstance.export();
  await saveDBToIndexedDB(binaryArray);
};

export const saveDocumentToDB = async (kbDoc: Omit<KBDocument, 'id'>): Promise<string> => {
  const db = await initDB();
  const id = crypto.randomUUID();
  const uploadDate = new Date().toISOString();
  
  db.run(`
    INSERT INTO documents (id, name, type, sourceType, content, uploadDate, reviewer, publishDate, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, 
    kbDoc.name, 
    kbDoc.type, 
    kbDoc.sourceType, 
    kbDoc.content, 
    uploadDate, 
    kbDoc.reviewer || 'System', 
    kbDoc.publishDate || uploadDate, 
    kbDoc.url || ''
  ]);

  await persistLocal();
  return id;
};

export const updateDocumentInDB = async (id: string, updates: Partial<KBDocument>): Promise<void> => {
  const db = await initDB();
  const fields = Object.keys(updates);
  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as any)[f]);
  values.push(id);

  db.run(`UPDATE documents SET ${setClause} WHERE id = ?`, values);
  await persistLocal();
};

export const fetchDocumentsFromDB = async (): Promise<KBDocument[]> => {
  const db = await initDB();
  const res = db.exec("SELECT * FROM documents ORDER BY uploadDate DESC");
  
  if (res.length === 0) return [];
  
  const columns = res[0].columns;
  return res[0].values.map((row: any[]) => {
    const doc: any = {};
    columns.forEach((col: string, i: number) => {
      doc[col] = row[i];
    });
    return doc as KBDocument;
  });
};

export const deleteDocumentFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  db.run("DELETE FROM documents WHERE id = ?", [id]);
  await persistLocal();
};
