
import React, { useState } from 'react';
import { KBDocument, Language, KBSettings } from '../types';
import { extractTextFromFile, extractTextFromUrl } from '../services/geminiService';
import { translations } from '../translations';
import { syncToCloud, syncFromCloud, exportDBFile, importDBFile } from '../db';
import { uploadRawFile } from '../firebase';

interface AdminDashboardProps {
  documents: KBDocument[];
  onAddDoc: (doc: Omit<KBDocument, 'id'>) => Promise<void>;
  onRemoveDoc: (id: string) => void;
  onUpdateDoc: (id: string, updates: Partial<KBDocument>) => Promise<void>;
  onClearAll: () => Promise<void>;
  lang: Language;
  settings: KBSettings;
  onUpdateSettings: (settings: KBSettings) => Promise<void>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  documents, onAddDoc, onRemoveDoc, onUpdateDoc, onClearAll, lang, settings, onUpdateSettings 
}) => {
  const t = translations[lang];
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [reviewerInput, setReviewerInput] = useState('');
  const [publishDateInput, setPublishDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('tp_last_sync'));

  // Local state for settings form
  const [formPrompt, setFormPrompt] = useState(settings.systemInstruction);
  const [formModel, setFormModel] = useState(settings.model);

  const handlePushToCloud = async () => {
    setIsProcessing(true);
    setStatus("強制推送本地資料庫至雲端...");
    try {
      await syncToCloud();
      setLastSync(new Date().toISOString());
      setStatus("成功：雲端資料已與本地同步！");
      setTimeout(() => setStatus(null), 3000);
    } catch (e: any) {
      console.error(e);
      setStatus(`錯誤: ${e.message || "推送失敗"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsProcessing(true);
    setStatus("正在從雲端下載最新資料庫...");
    try {
      const success = await syncFromCloud();
      if (success) {
        setStatus("成功：已載入全球最新版本，即將重整...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setStatus("雲端尚無資料庫檔案。");
        setTimeout(() => setStatus(null), 3000);
      }
    } catch (e: any) {
      console.error(e);
      setStatus(`錯誤: ${e.message || "拉取失敗"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportLocal = async () => {
    setStatus("正在產生 SQLite 實體檔案...");
    try {
      await exportDBFile();
      setStatus("匯出成功。");
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus("匯出失敗。");
    }
  };

  const handleImportLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setStatus("正在導入實體 SQLite 檔案...");
    try {
      await importDBFile(file);
      window.location.reload();
    } catch (e) {
      setStatus("導入失敗，請確保檔案格式正確。");
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    const confirmMsg = lang === 'zh-TW' 
      ? "確定要清空所有知識庫內容嗎？這將會同步至雲端並影響所有設備。" 
      : "Are you sure? This will sync to cloud and affect ALL devices.";
    
    if (window.confirm(confirmMsg)) {
      setIsProcessing(true);
      setStatus("正在清空本地與雲端資料庫...");
      try {
        await onClearAll();
        setStatus("資料庫已清空。");
        setTimeout(() => setStatus(null), 3000);
      } catch (e: any) {
        setStatus(`錯誤: ${e.message || "清空失敗"}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleUpdateAISettings = async () => {
    setIsProcessing(true);
    setStatus("正在更新 AI 大腦設定並同步至雲端...");
    try {
      await onUpdateSettings({
        id: 'global',
        systemInstruction: formPrompt,
        model: formModel
      });
      setStatus("AI 設定已更新。");
      setTimeout(() => setStatus(null), 3000);
    } catch (e: any) {
      setStatus(`錯誤: 設定更新失敗。`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReIndexUrl = async (doc: KBDocument) => {
    if (!doc.url || isProcessing) return;
    
    setRefreshingId(doc.id);
    setIsProcessing(true);
    setStatus(`重新整理中: ${doc.url}`);

    try {
      const extractedText = await extractTextFromUrl(doc.url);
      await onUpdateDoc(doc.id, {
        content: extractedText,
        uploadDate: new Date().toISOString()
      });
      setStatus("內容已更新並同步！");
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      console.error(error);
      setStatus(`更新失敗: ${doc.name}`);
    } finally {
      setIsProcessing(false);
      setRefreshingId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus(`正在上傳與索引「${file.name}」...`);

    try {
      setStatus(`正在上傳原始檔案至雲端...`);
      const cloudUrl = await uploadRawFile(file);

      setStatus(`AI 正在提取與格式化內容...`);
      const extractedText = await extractTextFromFile(file);
      
      const newDoc: Omit<KBDocument, 'id'> = {
        name: file.name,
        type: file.type || 'unknown',
        sourceType: 'file',
        url: cloudUrl,
        content: extractedText,
        uploadDate: new Date().toISOString(),
        reviewer: reviewerInput || 'Admin',
        publishDate: publishDateInput || new Date().toISOString(),
      };

      await onAddDoc(newDoc);
      setStatus("檔案已成功同步至雲端知識庫！");
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      console.error(error);
      setStatus(`錯誤: ${error.message || "處理失敗"}`);
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
    setStatus("正在爬取網頁內容並同步...");

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
      setStatus(`錯誤: 網頁內容抓取失敗。`);
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
                <h2 className="text-xl font-black uppercase tracking-widest text-sky-400">雲端自動同步中心</h2>
              </div>
              <p className="text-slate-300 text-sm font-medium leading-relaxed">
                所有檔案與變更會<strong>自動同步</strong>至雲端儲存空間。不同設備登入時會自動拉取最新版本。
              </p>
              {lastSync && (
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-4">
                  上次全球同步時間: {new Date(lastSync).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={handlePullFromCloud}
                disabled={isProcessing}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2"
                title="強制從雲端下載最新版本"
              >
                強制下拉 (Pull)
              </button>
              <button 
                onClick={handlePushToCloud}
                disabled={isProcessing}
                className="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-30 flex items-center gap-2"
                title="強制將本地內容覆蓋雲端"
              >
                強制推送 (Push)
              </button>
            </div>
          </div>
        </div>

        {/* Local Storage Management */}
        <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <h3 className="font-black uppercase tracking-widest text-slate-800 text-sm">本地備份</h3>
              </div>
              <button 
                onClick={handleClearAll}
                disabled={isProcessing}
                className="text-red-500 hover:text-red-700 font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded hover:bg-red-50 transition-all active:scale-95 cursor-pointer"
              >
                清空全部
              </button>
            </div>
            <p className="text-slate-500 text-xs font-medium mb-6">
              導出 <strong>.sqlite</strong> 實體檔案進行離線備份。
            </p>
          </div>
          <div className="flex gap-3">
             <button onClick={handleExportLocal} className="flex-grow py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">匯出備份</button>
             <label className="flex-grow relative cursor-pointer group">
               <input type="file" className="hidden" accept=".sqlite,.db" onChange={handleImportLocal} />
               <div className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-[10px] text-center font-black uppercase tracking-widest transition-all active:scale-95">導入恢復</div>
             </label>
          </div>
        </div>
      </div>

      {/* AI Configuration Section */}
      <div className="mb-10 bg-white border border-slate-200 rounded-[40px] p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-800">AI 核心參數 (自動同步)</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase text-slate-400 tracking-wider">系統提示詞 (AI 身份定義)</label>
              <textarea 
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium h-48 focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all"
                placeholder="輸入 AI 的行為準則..."
              />
            </div>
          </div>
          
          <div className="flex flex-col justify-between">
            <div className="flex flex-col gap-1 mb-6">
              <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Gemini 模型選擇</label>
              <select 
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all cursor-pointer appearance-none"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash (快速、經濟)</option>
                <option value="gemini-3-pro-preview">Gemini 3 Pro (邏輯強、適合複雜行程)</option>
                <option value="gemini-2.5-flash-lite-latest">Gemini 2.5 Flash Lite (極速回覆)</option>
              </select>
            </div>
            
            <button 
              onClick={handleUpdateAISettings}
              disabled={isProcessing}
              className="w-full py-5 bg-sky-800 hover:bg-sky-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all shadow-xl shadow-sky-900/10 active:scale-95 disabled:opacity-50"
            >
              儲存 AI 設定並同步
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {status && (
        <div className={`mb-8 p-6 border-2 rounded-[32px] flex items-center gap-4 animate-fade-in shadow-lg ${status.startsWith('錯誤') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-sky-50 text-sky-800 border-sky-100'}`}>
           <div className={`w-3 h-3 rounded-full ${status.startsWith('錯誤') ? 'bg-red-500 animate-pulse' : 'bg-sky-500 animate-pulse'}`}></div>
           <span className="font-black uppercase tracking-wider text-sm">{status}</span>
        </div>
      )}

      {/* Upload Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 bg-white/40 backdrop-blur-md p-8 rounded-[32px] border border-white/60 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">{t.dashboard}</h1>
          <p className="text-slate-500 mt-1 font-medium">所有的變更將自動同步至 Firebase 全球儲存中心。</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto bg-white/60 p-4 rounded-2xl border border-white">
          <div className="flex flex-col gap-1">
             <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">審核人姓名</label>
             <input type="text" placeholder="審核人" value={reviewerInput} onChange={(e) => setReviewerInput(e.target.value)} className="bg-slate-100 border-none rounded-lg px-3 py-2 text-xs font-bold w-32 focus:ring-2 focus:ring-sky-800/20" />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">發佈日期</label>
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
                 {doc.sourceType === 'web' && (
                   <button 
                     onClick={() => handleReIndexUrl(doc)} 
                     disabled={isProcessing}
                     title={t.reIndex}
                     className={`text-slate-200 hover:text-sky-500 transition-colors p-2 ${refreshingId === doc.id ? 'animate-spin text-sky-500' : ''}`}
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                   </button>
                 )}
                 <button onClick={() => onRemoveDoc(doc.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div>
              <div className="flex gap-2 mb-4">
                <span className="px-2 py-1 bg-sky-50 text-sky-700 text-[9px] font-black uppercase rounded-lg border border-sky-100">審核: {doc.reviewer}</span>
                <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase rounded-lg border border-slate-100">更新: {new Date(doc.uploadDate).toLocaleDateString()}</span>
              </div>
              <h4 className="text-slate-800 font-black mb-1 truncate text-lg">{doc.name}</h4>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mb-6">{doc.sourceType === 'web' ? t.webSource : t.fileSource} • {doc.type}</p>
              
              {doc.url && (
                <a 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mb-4 inline-flex items-center gap-2 text-[10px] font-black text-sky-600 hover:text-sky-800 uppercase tracking-widest bg-sky-50 px-3 py-2 rounded-xl border border-sky-100 transition-colors w-fit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  檢視原始內容
                </a>
              )}

              <div className="bg-slate-50 rounded-2xl p-4 flex-grow overflow-hidden italic text-xs text-slate-500 line-clamp-6">{doc.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
