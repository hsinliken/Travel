
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
      docId TEXT,
      name TEXT,
      type TEXT,
      department TEXT,
      summary TEXT,
      content TEXT,
      sourceType TEXT,
      url TEXT,
      version TEXT,
      status TEXT,
      uploadDate TEXT,
      publishDate TEXT,
      effectiveDate TEXT,
      expiryDate TEXT,
      owner TEXT,
      lastReviewDate TEXT,
      tags TEXT,
      reviewer TEXT
    )
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      systemInstruction TEXT,
      model TEXT
    )
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS query_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      document_ids TEXT
    )
  `);

  try {
    dbInstance.run("ALTER TABLE documents ADD COLUMN docId TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN department TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN summary TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN version TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN status TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN effectiveDate TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN expiryDate TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN owner TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN lastReviewDate TEXT");
    dbInstance.run("ALTER TABLE documents ADD COLUMN tags TEXT");
  } catch (e) { }

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
    systemInstruction: `You are an expert travel assistant for "Big Eagle Travel" (大鷹旅遊). Use the provided context to answer accurately.`,
    model: 'gemini-3-flash-preview'
  };
  if (res.length === 0) return defaultSettings;
  const values = res[0].values[0];
  return { id: values[0] as 'global', systemInstruction: values[1] as string, model: values[2] as string };
};

export const saveSettingsToDB = async (settings: KBSettings): Promise<void> => {
  const db = await initDB();
  db.run(`INSERT OR REPLACE INTO settings (id, systemInstruction, model) VALUES (?, ?, ?)`, [settings.id, settings.systemInstruction, settings.model]);
  await persistLocal();
};

export const saveDocumentToDB = async (kbDoc: Omit<KBDocument, 'id'>): Promise<string> => {
  const db = await initDB();
  const id = crypto.randomUUID();
  db.run(`
    INSERT INTO documents (
      id, docId, name, type, department, summary, content, sourceType, url, 
      version, status, uploadDate, publishDate, effectiveDate, expiryDate, 
      owner, lastReviewDate, tags, reviewer
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, kbDoc.docId || '', kbDoc.name, kbDoc.type, kbDoc.department || '', kbDoc.summary || '', 
    kbDoc.content, kbDoc.sourceType, kbDoc.url || '', kbDoc.version || 'V1.0', 
    kbDoc.status || '生效', kbDoc.uploadDate, kbDoc.publishDate, kbDoc.effectiveDate || kbDoc.uploadDate, 
    kbDoc.expiryDate || '', kbDoc.owner || '', kbDoc.lastReviewDate || kbDoc.uploadDate, 
    kbDoc.tags || '', kbDoc.reviewer || 'System'
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
    columns.forEach((col: string, i: number) => { doc[col] = row[i]; });
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
  db.run("DELETE FROM query_logs");
  await persistLocal();
};

export const logQueryToDB = async (docNamesOrUrls: string[]): Promise<void> => {
  const db = await initDB();
  const docs = await fetchDocumentsFromDB();
  // 強制去除如 "(3) " 這樣的前綴，只保留名稱進行匹配
  const cleanedNames = docNamesOrUrls.map(name => name.replace(/^\(\d+\)\s*/, '').trim());
  const foundIds = cleanedNames.map(val => {
    const d = docs.find(doc => doc.name === val || doc.url === val);
    return d ? d.id : null;
  }).filter(id => id !== null);
  
  if (foundIds.length === 0) return;
  db.run(`INSERT INTO query_logs (timestamp, document_ids) VALUES (?, ?)`, [new Date().toISOString(), foundIds.join(',')]);
  await persistLocal();
};

export interface QueryStats {
  totalQueries: number;
  docUsage: { docId: string; count: number; docName: string; type: string }[];
  timeChartData: { label: string; count: number }[];
}

export const fetchQueryStats = async (period: 'day' | 'week' | 'month'): Promise<QueryStats> => {
  const db = await initDB();
  const docs = await fetchDocumentsFromDB();
  const now = new Date();
  let startTime = new Date();
  if (period === 'day') startTime.setHours(now.getHours() - 24);
  else if (period === 'week') startTime.setDate(now.getDate() - 7);
  else if (period === 'month') startTime.setMonth(now.getMonth() - 1);
  const res = db.exec(`SELECT * FROM query_logs WHERE timestamp >= ?`, [startTime.toISOString()]);
  if (res.length === 0) return { totalQueries: 0, docUsage: [], timeChartData: [] };
  const logs = res[0].values;
  const usageMap: Record<string, number> = {};
  const timeMap: Record<string, number> = {};
  logs.forEach((row: any[]) => {
    const timestamp = new Date(row[1]);
    const ids = (row[2] as string).split(',');
    ids.forEach(id => { usageMap[id] = (usageMap[id] || 0) + 1; });
    let timeKey = period === 'day' ? `${timestamp.getHours()}:00` : timestamp.toLocaleDateString();
    timeMap[timeKey] = (timeMap[timeKey] || 0) + 1;
  });
  const docUsage = Object.entries(usageMap).map(([id, count]) => {
    const doc = docs.find(d => d.id === id);
    return { docId: id, count, docName: doc?.name || 'Unknown', type: doc?.type || 'File' };
  }).sort((a, b) => b.count - a.count);
  const timeChartData = Object.entries(timeMap).map(([label, count]) => ({ label, count }));
  return { totalQueries: logs.length, docUsage, timeChartData };
};

export const fetchTopKeywords = async (limit: number = 6): Promise<string[]> => {
  const stats = await fetchQueryStats('month');
  const docs = await fetchDocumentsFromDB();
  
  const keywordsSet = new Set<string>();
  
  // 從熱門文件的標籤中提取
  stats.docUsage.forEach(usage => {
    const doc = docs.find(d => d.id === usage.docId);
    if (doc?.tags) {
      doc.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => keywordsSet.add(t));
    }
  });

  // 如果關鍵字不足，從最新文件的標籤中補充
  if (keywordsSet.size < limit) {
    docs.slice(0, 10).forEach(doc => {
      if (doc.tags) {
        doc.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => keywordsSet.add(t));
      }
    });
  }

  // 如果還是不足，則放一些預設關鍵字或類型
  const defaults = ['人事規章', '財務報銷', '內控管理', '業務獎金', '請假流程'];
  let result = Array.from(keywordsSet);
  if (result.length < limit) {
    defaults.forEach(d => { if(result.length < limit) result.push(d); });
  }

  return result.slice(0, limit);
};

export const fetchTopDocuments = async (limit: number = 3): Promise<KBDocument[]> => {
  const stats = await fetchQueryStats('month');
  const docs = await fetchDocumentsFromDB();
  const topIds = stats.docUsage.slice(0, limit).map(d => d.docId);
  const topDocs = topIds.map(id => docs.find(d => d.id === id)).filter(Boolean) as KBDocument[];
  // 如果日誌數據不足，補齊最新上傳的文件
  if (topDocs.length < limit) {
    const remaining = docs.filter(d => !topIds.includes(d.id)).slice(0, limit - topDocs.length);
    return [...topDocs, ...remaining];
  }
  return topDocs;
};
