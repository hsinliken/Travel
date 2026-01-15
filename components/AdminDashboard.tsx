
import React, { useState } from 'react';
import { KBDocument, Language } from '../types';
import { extractTextFromFile, extractTextFromUrl } from '../services/geminiService';
import { translations } from '../translations';

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
  const [urlInput, setUrlInput] = useState('');
  const [reviewerInput, setReviewerInput] = useState('');
  const [publishDateInput, setPublishDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [editingDoc, setEditingDoc] = useState<KBDocument | null>(null);

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

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    setIsProcessing(true);
    try {
      await onUpdateDoc(editingDoc.id, {
        name: editingDoc.name,
        content: editingDoc.content,
        reviewer: editingDoc.reviewer,
        publishDate: editingDoc.publishDate
      });
      setEditingDoc(null);
    } catch (error) {
      alert("Failed to update document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.updateDoc}</h2>
              <button onClick={() => setEditingDoc(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reviewer</label>
                  <input 
                    type="text" 
                    value={editingDoc.reviewer}
                    onChange={(e) => setEditingDoc({...editingDoc, reviewer: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Publish Date</label>
                  <input 
                    type="date" 
                    value={editingDoc.publishDate.split('T')[0]}
                    onChange={(e) => setEditingDoc({...editingDoc, publishDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.docName}</label>
                <input 
                  type="text" 
                  value={editingDoc.name}
                  onChange={(e) => setEditingDoc({...editingDoc, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.docContent}</label>
                <textarea 
                  rows={8}
                  value={editingDoc.content}
                  onChange={(e) => setEditingDoc({...editingDoc, content: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all text-sm leading-relaxed"
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setEditingDoc(null)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                {t.cancel}
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isProcessing}
                className="px-8 py-3 bg-sky-800 text-white rounded-xl font-bold hover:bg-sky-900 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Admin UI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 bg-white/40 backdrop-blur-md p-8 rounded-[32px] border border-white/60 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">{t.dashboard}</h1>
          <p className="text-slate-500 mt-1 font-medium">{lang === 'ja' ? "ナレッジベースの維持。" : "充實鐵道旅遊 AI 的知識庫。"}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto bg-white/60 p-4 rounded-2xl border border-white">
          <div className="flex flex-col gap-1">
             <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Reviewer Name</label>
             <input 
              type="text" 
              placeholder="Admin Name" 
              value={reviewerInput}
              onChange={(e) => setReviewerInput(e.target.value)}
              className="bg-slate-100 border-none rounded-lg px-3 py-2 text-xs font-bold w-32 focus:ring-2 focus:ring-sky-800/20"
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Publish Date</label>
             <input 
              type="date" 
              value={publishDateInput}
              onChange={(e) => setPublishDateInput(e.target.value)}
              className="bg-slate-100 border-none rounded-lg px-3 py-2 text-xs font-bold w-36 focus:ring-2 focus:ring-sky-800/20"
             />
          </div>
          <label className="relative cursor-pointer group mt-2 sm:mt-0">
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isProcessing}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
            />
            <div className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black transition-all shadow-md hover:shadow-xl active:scale-95 ${isProcessing ? 'bg-slate-200 text-slate-400' : 'bg-sky-800 text-white hover:bg-sky-900'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {t.uploadNew}
            </div>
          </label>
        </div>
      </div>

      {/* URL Import */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-6 mb-12 shadow-sm">
        <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-grow relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <input 
              type="url" 
              required
              placeholder={t.urlPlaceholder}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all font-medium"
            />
          </div>
          <button 
            type="submit" 
            disabled={isProcessing || !urlInput.trim()}
            className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-900 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {t.addUrl}
          </button>
        </form>
      </div>

      {status && (
        <div className="mb-12 p-5 bg-sky-50/80 backdrop-blur-sm border-2 border-sky-100 rounded-3xl flex items-center gap-5 text-sky-800 font-black animate-pulse shadow-inner">
           <div className="w-4 h-4 bg-sky-800 rounded-full animate-ping"></div>
           {status}
        </div>
      )}

      {/* Grid of Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {documents.length === 0 ? (
          <div className="col-span-full py-24 bg-white/60 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-[40px] text-center">
            <h3 className="text-slate-800 font-black text-xl">{t.noDocs}</h3>
            <p className="text-slate-400 mt-2 font-medium">SQLite Database is ready. Upload content to begin.</p>
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group relative flex flex-col min-h-[420px]">
              <div className="absolute top-6 right-6 flex gap-1">
                 <button onClick={() => setEditingDoc(doc)} className="text-slate-200 hover:text-sky-600 transition-colors p-2" title={t.edit}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                 </button>
                 <button onClick={() => onRemoveDoc(doc.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2" title="Remove">
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                 </button>
              </div>

              <div className="flex gap-2 mb-4">
                <span className="px-2 py-1 bg-sky-50 text-sky-700 text-[9px] font-black uppercase rounded-lg border border-sky-100">
                  By: {doc.reviewer || 'Unknown'}
                </span>
                <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase rounded-lg border border-slate-100">
                  Pub: {new Date(doc.publishDate).toLocaleDateString()}
                </span>
              </div>

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-inner ${doc.sourceType === 'web' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-800'}`}>
                 {doc.sourceType === 'web' ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                 )}
              </div>

              <h4 className="text-slate-800 font-black mb-1 truncate pr-16 text-lg" title={doc.name}>{doc.name}</h4>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mb-6">
                {doc.sourceType === 'web' ? t.webSource : t.fileSource} • {doc.type}
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-4 mb-8 flex-grow overflow-hidden relative">
                 <p className="text-xs text-slate-500 line-clamp-6 leading-relaxed font-medium italic">
                   {doc.content}
                 </p>
                 <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent"></div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                 <span className="text-[10px] text-slate-400 font-bold">
                    ID: {doc.id.split('-')[0]}...
                 </span>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                   <span className="text-[10px] text-green-600 font-black uppercase tracking-wider">SQL-INDEXED</span>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
