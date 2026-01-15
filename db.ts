
import { KBDocument, KBSettings } from "./types";
import { uploadDatabaseFile, downloadDatabaseFile } from "./firebase";

declare var initSqlJs: any;

let dbInstance: any = null;
const DB_NAME = 'BigEagleSQLiteDB';
const STORE_NAME = 'database';

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

export const exportDBFile = async () => {
  if (!dbInstance) await initDB();
  const binaryArray = dbInstance.export();
  const blob = new Blob([binaryArray], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bigeagle_kb_${new Date().toISOString().split('T')[0]}.sqlite`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importDBFile = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  await saveDBToIndexedDB(data);
  dbInstance = null;
  await initDB();
  return true;
};

export const syncFromCloud = async () => {
  const remoteData = await downloadDatabaseFile();
  if (remoteData) {
    await saveDBToIndexedDB(remoteData);
    dbInstance = null;
    await initDB();
    return true;
  }
  return false;
};

export const syncToCloud = async () => {
  if (!dbInstance) await initDB();
  const binaryArray = dbInstance.export();
  await uploadDatabaseFile(binaryArray);
  localStorage.setItem('tp_last_sync', new Date().toISOString());
};

export const initDB = async () => {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  let savedData = await loadDBFromIndexedDB();
  
  if (!savedData) {
    savedData = await downloadDatabaseFile();
    if (savedData) await saveDBToIndexedDB(savedData);
  }

  dbInstance = savedData ? new SQL.Database(savedData) : new SQL.Database();

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

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      systemInstruction TEXT,
      model TEXT
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

export const fetchSettingsFromDB = async (): Promise<KBSettings> => {
  const db = await initDB();
  const res = db.exec("SELECT * FROM settings WHERE id = 'global'");
  
  const defaultSettings: KBSettings = {
    id: 'global',
    systemInstruction: `You are an expert travel assistant for "Big Eagle Travel" (大鷹旅遊). Use the provided context to answer accurately. If the information is not in the context, say you don't know based on current data.`,
    model: 'gemini-3-flash-preview'
  };

  if (res.length === 0) return defaultSettings;
  
  const values = res[0].values[0];
  return {
    id: values[0] as 'global',
    systemInstruction: values[1] as string,
    model: values[2] as string
  };
};

export const saveSettingsToDB = async (settings: KBSettings): Promise<void> => {
  const db = await initDB();
  db.run(`
    INSERT OR REPLACE INTO settings (id, systemInstruction, model)
    VALUES (?, ?, ?)
  `, [settings.id, settings.systemInstruction, settings.model]);
  await persistLocal();
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

export const clearAllDocumentsFromDB = async (): Promise<void> => {
  const db = await initDB();
  db.run("DELETE FROM documents");
  await persistLocal();
};
