
import React, { useState, useEffect } from 'react';
import { ViewState, KBDocument, User, Language } from './types';
import Navigation from './components/Navigation';
import KnowledgeBase from './components/KnowledgeBase';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import Background from './components/Background';
import { fetchDocumentsFromDB, saveDocumentToDB, deleteDocumentFromDB, updateDocumentInDB, initDB, clearAllDocumentsFromDB } from './db';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [lang, setLang] = useState<Language>('zh-TW');
  const [isLoading, setIsLoading] = useState(true);

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('tp_lang');
    if (savedLang) {
      setLang(savedLang as Language);
    }
  }, []);

  // Initialize SQLite and Fetch initial documents
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        const docs = await fetchDocumentsFromDB();
        setDocuments(docs);
      } catch (error) {
        console.error("SQLite fetch error:", error);
        setDocuments([]);
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

  const addDocument = async (doc: Omit<KBDocument, 'id'>) => {
    try {
      const id = await saveDocumentToDB(doc);
      const newDoc = { ...doc, id } as KBDocument;
      setDocuments(prev => [newDoc, ...prev]);
    } catch (error) {
      console.error("SQLite save error:", error);
      alert("Error: Failed to save to SQLite database.");
    }
  };

  const updateDocument = async (id: string, updates: Partial<KBDocument>) => {
    try {
      await updateDocumentInDB(id, updates);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    } catch (error) {
      console.error("SQLite update error:", error);
      alert("Failed to update document.");
    }
  };

  const removeDocument = async (id: string) => {
    try {
      await deleteDocumentFromDB(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error("SQLite delete error:", error);
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleClearDocuments = async () => {
    try {
      await clearAllDocumentsFromDB();
      setDocuments([]); // 即時清空 UI 狀態
    } catch (error) {
      console.error("Failed to clear documents:", error);
      throw error;
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

      <main className="flex-grow relative z-10 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-800"></div>
            <p className="text-slate-500 font-medium animate-pulse">Initializing SQLite Brain...</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {view === ViewState.HOME && (
              <KnowledgeBase documents={documents} lang={lang} />
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
                  <p className="mt-2 text-slate-600 italic">SQLite Edge Persistence Technology</p>
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
