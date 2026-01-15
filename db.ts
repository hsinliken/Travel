
import { KBDocument } from "./types";

declare var initSqlJs: any;

let dbInstance: any = null;
const DB_NAME = 'BigEagleSQLiteDB';
const STORE_NAME = 'database';

/**
 * Loads the database binary from IndexedDB
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
 * Saves the database binary to IndexedDB
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
 * Initializes the SQLite database
 */
export const initDB = async () => {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  const savedData = await loadDBFromIndexedDB();
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
    await persistDB();
  }

  return dbInstance;
};

const persistDB = async () => {
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

  await persistDB();
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
  await persistDB();
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
  await persistDB();
};
