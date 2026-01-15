
import React, { useState } from 'react';
import { KBDocument, Language } from '../types';
import { extractTextFromFile, extractTextFromUrl } from '../services/geminiService';
import { translations } from '../translations';
import { syncToCloud, syncFromCloud, exportDBFile, importDBFile } from '../db';
import { isCloudSyncEnabled } from '../firebase';

interface AdminDashboardProps {
  documents: KBDocument[];
  onAddDoc: (doc: Omit<KBDocument, 'id'>) => Promise<void>;
  onRemoveDoc: (id: string) => void;
  onUpdateDoc: (id: string, updates: Partial<KBDocument>) => Promise<void>;
  lang: Language;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ documents, onAddDoc, onRemoveDoc, onUpdateDoc, lang }) => {
  const t = translations[lang];
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showCorsHelp, setShowCorsHelp] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [reviewerInput, setReviewerInput] = useState('');
  const [publishDateInput, setPublishDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [editingDoc, setEditingDoc] = useState<KBDocument | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('tp_last_sync'));

  const checkIsCorsError = (error: any) => {
    const msg = error?.message || "";
    return msg.includes("Failed to fetch") || msg.includes("Network Error") || msg.includes("CORS") || msg.includes("CORS");
  };

  const handlePushToCloud = async () => {
    setIsProcessing(true);
    setStatus("Pushing SQLite physical file to Cloud Storage...");
    setShowCorsHelp(false);
    try {
      await syncToCloud();
      setLastSync(new Date().toISOString());
      setStatus("Success: Knowledge base published globally!");
      setTimeout(() => setStatus(null), 3000);
    } catch (e: any) {
      console.error(e);
      if (checkIsCorsError(e)) {
        setStatus(`Error: ${t.corsError}`);
        setShowCorsHelp(true);
      } else {
        setStatus(`Error: ${e.message || "Failed to push to cloud."}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsProcessing(true);
    setStatus("Downloading latest database from Cloud...");
    setShowCorsHelp(false);
    try {
      const success = await syncFromCloud();
      if (success) {
        window.location.reload(); 
      } else {
        setStatus("Cloud database is empty or unreachable.");
        setTimeout(() => setStatus(null), 3000);
      }
    } catch (e: any) {
      console.error(e);
      if (checkIsCorsError(e)) {
        setStatus(`Error: ${t.corsError}`);
        setShowCorsHelp(true);
      } else {
        setStatus(`Error: ${e.message || "Pull failed."}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportLocal = async () => {
    setStatus("Generating SQLite physical file for download...");
    try {
      await exportDBFile();
      setStatus("Success: SQLite file exported.");
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus("Error: Export failed.");
    }
  };

  const handleImportLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setStatus("Importing physical SQLite file...");
    try {
      await importDBFile(file);
      window.location.reload();
    } catch (e) {
      setStatus("Error: Import failed. Make sure it is a valid SQLite file.");
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus(`${t.processing} "${file.name}"...`);

    try {
      const extractedText = await extractTextFromFile(file);
      
      const newDoc: Omit<KBDocument, 'id'> = {
        name: file.name,
        type: file.type || 'unknown',
        sourceType: 'file',
        content: extractedText,
        uploadDate: new Date().toISOString(),
        reviewer: reviewerInput || 'Admin',
        publishDate: publishDateInput || new Date().toISOString(),
      };

      await onAddDoc(newDoc);
      setStatus(null);
    } catch (error) {
      console.error(error);
      setStatus(`Error: Failed to process document.`);
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isProcessing) return;

    const url = urlInput.trim();
    setIsProcessing(true);
    setStatus(t.extracting);

    try {
      const extractedText = await extractTextFromUrl(url);
      
      const newDoc: Omit<KBDocument, 'id'> = {
        name: new URL(url).hostname,
        type: 'web/summary',
        sourceType: 'web',
        url: url,
        content: extractedText,
        uploadDate: new Date().toISOString(),
        reviewer: reviewerInput || 'Admin',
        publishDate: publishDateInput || new Date().toISOString(),
      };

      await onAddDoc(newDoc);
      setUrlInput('');
      setStatus(null);
    } catch (error) {
      console.error(error);
      setStatus(`Error: Failed to fetch from URL.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* DB Management Hub */}
      <div className="mb-10 grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Cloud Sync Center */}
        <div className="xl:col-span-2 bg-gradient-to-br from-slate-900 to-sky-950 rounded-[40px] p-8 text-white shadow-2xl border border-sky-800/50 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 h-full">
            <div className="max-w-md">
              <div className="flex items-center gap-3 mb-2">
                <span className={`flex h-3 w-3 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]`}></span>
                <h2 className="text-xl font-black uppercase tracking-widest text-sky-400">Cloud Sync Center</h2>
              </div>
              <p className="text-slate-300 text-sm font-medium leading-relaxed">
                Connected to Firebase: <strong>travel-ad466</strong>. All data is persisted as a physical SQLite file in Cloud Storage.
              </p>
              {lastSync && (
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-4">
                  Last Global Sync: {new Date(lastSync).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={handlePullFromCloud}
                disabled={isProcessing}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Pull
              </button>
              <button 
                onClick={handlePushToCloud}
                disabled={isProcessing}
                className="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-30 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Push
              </button>
            </div>
          </div>
        </div>

        {/* Local File Management */}
        <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <h3 className="font-black uppercase tracking-widest text-slate-800 text-sm">SQLite Local File</h3>
            </div>
            <p className="text-slate-500 text-xs font-medium mb-6">
              Download or upload the physical <strong>.sqlite</strong> database file for manual portability.
            </p>
          </div>
          <div className="flex gap-3">
             <button onClick={handleExportLocal} className="flex-grow py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">Export</button>
             <label className="flex-grow relative cursor-pointer group">
               <input type="file" className="hidden" accept=".sqlite,.db" onChange={handleImportLocal} />
               <div className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-[10px] text-center font-black uppercase tracking-widest transition-all active:scale-95">Import</div>
             </label>
          </div>
        </div>
      </div>

      {/* Error & CORS Help Area */}
      {status && (
        <div className={`mb-8 p-6 border-2 rounded-[32px] flex flex-col gap-4 animate-fade-in shadow-lg ${status.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-sky-50 text-sky-800 border-sky-100'}`}>
           <div className="flex items-center gap-4">
             <div className={`w-3 h-3 rounded-full ${status.startsWith('Error') ? 'bg-red-500 animate-pulse' : 'bg-sky-500'}`}></div>
             <span className="font-black uppercase tracking-wider text-sm">{status}</span>
             {showCorsHelp && (
               <button 
                 onClick={() => setShowCorsHelp(!showCorsHelp)}
                 className="ml-auto bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
               >
                 {showCorsHelp ? "Close Help" : "Fix 404 Bucket Not Found?"}
               </button>
             )}
           </div>
           
           {showCorsHelp && (
             <div className="bg-white/90 p-6 rounded-2xl border border-red-200 text-xs text-slate-800 space-y-4 leading-relaxed shadow-inner">
               <div className="flex items-center gap-2 text-red-700 font-black uppercase tracking-widest mb-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                 {lang === 'zh-TW' ? "解決 404 Bucket Not Found" : "Fixing 404 Bucket Not Found"}
               </div>
               <p className="font-bold">如果指令出現 404，通常是因為 Bucket 名稱不對（新版 Firebase 為 <code>.firebasestorage.app</code>）。</p>
               <ol className="list-decimal pl-5 space-y-4 font-medium">
                 <li>前往 <a href="https://console.firebase.google.com/" target="_blank" className="text-sky-600 underline font-bold">Firebase Console</a> &gt; <strong>Storage</strong>。</li>
                 <li>查看畫面上方的 <code>gs://</code> 地址（例如 <code>gs://travel-ad466.firebasestorage.app</code>）。</li>
                 <li><strong>複製下方對應的指令</strong>並在 Cloud Shell 執行：
                   
                   <div className="mt-4 space-y-3">
                     <p className="text-[10px] font-black uppercase text-slate-400">方案 A (新版專案最常見):</p>
                     <div className="bg-slate-900 text-sky-400 p-4 rounded-xl font-mono overflow-x-auto select-all">
                       {`echo '[{"origin": ["*"], "method": ["GET", "POST", "PUT", "DELETE", "HEAD"], "responseHeader": ["Content-Type", "x-goog-resumable"], "maxAgeSeconds": 3600}]' > cors.json && gsutil cors set cors.json gs://travel-ad466.firebasestorage.app`}
                     </div>
                     
                     <p className="text-[10px] font-black uppercase text-slate-400">方案 B (舊版專案):</p>
                     <div className="bg-slate-900 text-sky-400 p-4 rounded-xl font-mono overflow-x-auto select-all opacity-60">
                       {`echo '[{"origin": ["*"], "method": ["GET", "POST", "PUT", "DELETE", "HEAD"], "responseHeader": ["Content-Type", "x-goog-resumable"], "maxAgeSeconds": 3600}]' > cors.json && gsutil cors set cors.json gs://travel-ad466.appspot.com`}
                     </div>
                   </div>
                 </li>
                 <li className="text-red-600 font-bold">注意：執行前請確認您的 Firebase Storage 已經點擊「開始使用」並選擇了區域！</li>
               </ol>
             </div>
           )}
        </div>
      )}

      {/* Main Admin UI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 bg-white/40 backdrop-blur-md p-8 rounded-[32px] border border-white/60 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">{t.dashboard}</h1>
          <p className="text-slate-500 mt-1 font-medium">充實大鷹旅遊 AI 的知識庫。</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto bg-white/60 p-4 rounded-2xl border border-white">
          <div className="flex flex-col gap-1">
             <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Reviewer Name</label>
             <input type="text" placeholder="Admin Name" value={reviewerInput} onChange={(e) => setReviewerInput(e.target.value)} className="bg-slate-100 border-none rounded-lg px-3 py-2 text-xs font-bold w-32 focus:ring-2 focus:ring-sky-800/20" />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Publish Date</label>
             <input type="date" value={publishDateInput} onChange={(e) => setPublishDateInput(e.target.value)} className="bg-slate-100 border-none rounded-lg px-3 py-2 text-xs font-bold w-36 focus:ring-2 focus:ring-sky-800/20" />
          </div>
          <label className="relative cursor-pointer group mt-2 sm:mt-0">
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isProcessing} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" />
            <div className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black transition-all shadow-md hover:shadow-xl active:scale-95 ${isProcessing ? 'bg-slate-200 text-slate-400' : 'bg-sky-800 text-white hover:bg-sky-900'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {t.uploadNew}
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-6 mb-12 shadow-sm">
        <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row gap-3">
          <input type="url" required placeholder={t.urlPlaceholder} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all font-medium" />
          <button type="submit" disabled={isProcessing || !urlInput.trim()} className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-900 transition-all shadow-md active:scale-95">
            {t.addUrl}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {documents.map(doc => (
          <div key={doc.id} className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group relative flex flex-col min-h-[420px]">
             <div className="absolute top-6 right-6 flex gap-1">
                 <button onClick={() => onRemoveDoc(doc.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div>
              <div className="flex gap-2 mb-4">
                <span className="px-2 py-1 bg-sky-50 text-sky-700 text-[9px] font-black uppercase rounded-lg border border-sky-100">By: {doc.reviewer}</span>
                <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase rounded-lg border border-slate-100">Pub: {new Date(doc.publishDate).toLocaleDateString()}</span>
              </div>
              <h4 className="text-slate-800 font-black mb-1 truncate text-lg">{doc.name}</h4>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mb-6">{doc.sourceType === 'web' ? t.webSource : t.fileSource} • {doc.type}</p>
              <div className="bg-slate-50 rounded-2xl p-4 flex-grow overflow-hidden italic text-xs text-slate-500 line-clamp-6">{doc.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
