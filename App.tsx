
import React, { useState, useEffect } from 'react';
import { ViewState, KBDocument, User, Language, KBSettings } from './types';
import Navigation from './components/Navigation';
import KnowledgeBase from './components/KnowledgeBase';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import UserManual from './components/UserManual';
import Background from './components/Background';
import { 
  fetchDocumentsFromDB, 
  saveDocumentToDB, 
  deleteDocumentFromDB, 
  updateDocumentInDB, 
  initDB, 
  clearAllDocumentsFromDB, 
  fetchSettingsFromDB, 
  saveSettingsToDB,
  syncToCloud,
  syncFromCloud,
  logQueryToDB
} from './db';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [settings, setSettings] = useState<KBSettings>({ id: 'global', systemInstruction: '', model: 'gemini-3-flash-preview' });
  const [lang, setLang] = useState<Language>('zh-TW');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('tp_lang');
    if (savedLang) {
      setLang(savedLang as Language);
    }
  }, []);

  // Initialize SQLite and Auto-Pull from Cloud
  useEffect(() => {
    const loadData = async () => {
      try {
        setSyncStatus("正在從雲端同步最新資料...");
        await initDB();
        
        // 自動從 Firebase 下載最新的資料庫檔案
        const pulled = await syncFromCloud();
        if (pulled) {
          console.log("Cloud data pulled successfully on start.");
        }

        const [docs, setts] = await Promise.all([
          fetchDocumentsFromDB(),
          fetchSettingsFromDB()
        ]);
        setDocuments(docs);
        setSettings(setts);
        setSyncStatus(null);
      } catch (error) {
        console.error("Initialization error:", error);
        setSyncStatus("同步失敗，將使用本地快取");
        setTimeout(() => setSyncStatus(null), 3000);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();

    const savedUser = sessionStorage.getItem('tp_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setView(ViewState.ADMIN_DASHBOARD);
      } catch (e) {
        sessionStorage.removeItem('tp_user');
      }
    }
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('tp_lang', newLang);
  };

  const handleLogin = (username: string) => {
    const newUser: User = { username, role: 'admin' };
    setUser(newUser);
    sessionStorage.setItem('tp_user', JSON.stringify(newUser));
    setView(ViewState.ADMIN_DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('tp_user');
    setView(ViewState.HOME);
  };

  // 自動同步封裝
  const autoSyncToCloud = async (actionName: string) => {
    try {
      setSyncStatus(`正在將「${actionName}」同步至雲端...`);
      await syncToCloud();
      setSyncStatus(null);
    } catch (error) {
      console.error("Auto-sync failed:", error);
      setSyncStatus("雲端同步失敗，資料目前僅存於本地");
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const addDocument = async (doc: Omit<KBDocument, 'id'>) => {
    try {
      const id = await saveDocumentToDB(doc);
      const newDoc = { ...doc, id } as KBDocument;
      setDocuments(prev => [newDoc, ...prev]);
      await autoSyncToCloud("新增文件");
    } catch (error) {
      console.error("SQLite save error:", error);
      alert("儲存失敗。");
    }
  };

  const updateDocument = async (id: string, updates: Partial<KBDocument>) => {
    try {
      await updateDocumentInDB(id, updates);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      await autoSyncToCloud("更新文件");
    } catch (error) {
      console.error("SQLite update error:", error);
    }
  };

  const removeDocument = async (id: string) => {
    try {
      await deleteDocumentFromDB(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      await autoSyncToCloud("刪除文件");
    } catch (error) {
      console.error("SQLite delete error:", error);
    }
  };

  const handleClearDocuments = async () => {
    try {
      await clearAllDocumentsFromDB();
      setDocuments([]);
      await autoSyncToCloud("清空資料庫");
    } catch (error) {
      console.error("Failed to clear documents:", error);
    }
  };

  const updateSettings = async (newSettings: KBSettings) => {
    try {
      await saveSettingsToDB(newSettings);
      setSettings(newSettings);
      await autoSyncToCloud("更新系統設定");
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  const handleLogQuery = async (citedNames: string[]) => {
    try {
      await logQueryToDB(citedNames);
      // 查詢日誌不需要立即自動推送雲端，可隨下次操作同步
    } catch (e) {
      console.error("Log query error:", e);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans selection:bg-sky-100 bg-slate-50/30 overflow-hidden">
      <Background />
      <Navigation 
        currentView={view} 
        setView={setView} 
        user={user} 
        onLogout={handleLogout}
        lang={lang}
        setLang={handleSetLang}
      />

      {syncStatus && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-white/10">
            <div className="w-2 h-2 bg-sky-400 rounded-full animate-ping"></div>
            <span className="text-xs font-black uppercase tracking-widest">{syncStatus}</span>
          </div>
        </div>
      )}

      <main className="flex-grow relative z-10 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-800"></div>
            <p className="text-slate-500 font-medium animate-pulse">Initializing SQLite Brain...</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {view === ViewState.HOME && (
              <KnowledgeBase 
                documents={documents} 
                lang={lang} 
                settings={settings} 
                onLogQuery={handleLogQuery}
              />
            )}

            {view === ViewState.USER_MANUAL && (
              <UserManual lang={lang} />
            )}

            {view === ViewState.ADMIN_LOGIN && (
              <AdminLogin onLogin={handleLogin} lang={lang} />
            )}

            {view === ViewState.ADMIN_DASHBOARD && user && (
              <AdminDashboard 
                documents={documents} 
                onAddDoc={addDocument} 
                onRemoveDoc={removeDocument} 
                onUpdateDoc={updateDocument}
                onClearAll={handleClearDocuments}
                lang={lang}
                settings={settings}
                onUpdateSettings={updateSettings}
              />
            )}
            
            {view !== ViewState.HOME && (
              <footer className="bg-slate-900/95 backdrop-blur-md text-slate-400 py-12 text-center text-xs border-t border-slate-800 relative z-10">
                <div className="container mx-auto px-4">
                  <div className="flex items-center justify-center gap-2 mb-4 opacity-70">
                    <div className="w-8 h-8 bg-sky-800 rounded-lg flex items-center justify-center text-white font-bold">🦅</div>
                    <span className="text-white font-black tracking-widest uppercase">Big Eagle Travel Knowledge</span>
                  </div>
                  <p>© 2024 大鷹旅遊知識庫. All rights reserved.</p>
                  <p className="mt-2 text-slate-600 italic">Global Sync Active via Firebase Storage</p>
                </div>
              </footer>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
