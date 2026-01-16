
import React, { useState, useRef, useEffect } from 'react';
import { KBDocument, ChatMessage, Language, KBSettings } from '../types';
import { queryKnowledgeBase } from '../services/geminiService';
import { translations } from '../translations';
import { fetchTopDocuments } from '../db';
import * as XLSX from "xlsx";

interface KnowledgeBaseProps {
  documents: KBDocument[];
  lang: Language;
  settings: KBSettings;
  onLogQuery?: (citedNames: string[]) => void;
}

// 檔案預覽組件
const FilePreviewModal: React.FC<{ 
  url: string; 
  fileName: string; 
  onClose: () => void;
}> = ({ url, fileName, onClose }) => {
  const [excelData, setExcelData] = useState<{ [key: string]: any[][] }>({});
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getFileExt = (nameOrUrl: string) => {
    try {
      const baseUrl = nameOrUrl.split('?')[0];
      const parts = baseUrl.split('/');
      const lastPart = parts[parts.length - 1] || '';
      const decoded = decodeURIComponent(lastPart);
      const ext = decoded.split('.').pop()?.toLowerCase();
      return ext || '';
    } catch (e) {
      return '';
    }
  };

  const fileExt = getFileExt(fileName || url);
  const isExcel = ['xlsx', 'xls', 'csv'].includes(fileExt);
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt);
  const isPdf = fileExt === 'pdf';

  useEffect(() => {
    if (isExcel) fetchExcel();
    else setLoading(false);
  }, [url, isExcel]);

  const fetchExcel = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const data: { [key: string]: any[][] } = {};
      workbook.SheetNames.forEach((name: string) => {
        const sheet = workbook.Sheets[name];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        data[name] = rawRows.slice(0, 300); 
      });
      if (Object.keys(data).length === 0) throw new Error("EMPTY_SHEET");
      setExcelData(data);
      if (workbook.SheetNames.length > 0) setActiveSheet(workbook.SheetNames[0]);
    } catch (err: any) {
      console.error("Excel Load Error:", err);
      setError(err.name === "TypeError" || err.message.includes("fetch") 
        ? "由於 Firebase 安全性限制 (CORS)，無法在此直接預覽 Excel 內容。" 
        : "檔案格式解析失敗，或檔案內容為空。");
    } finally {
      setLoading(false);
    }
  };

  const displayFileName = decodeURIComponent((fileName || url).split('/').pop()?.split('?')[0] || 'Document');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 animate-fade-in notranslate" translate="no">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-white/10">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-800 rounded-xl flex items-center justify-center text-white text-xl shadow-inner">
              {isExcel ? '📊' : isImage ? '🖼️' : isPdf ? '📄' : '📎'}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-black text-slate-800 truncate max-w-[200px] md:max-w-md">{displayFileName}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure AI Knowledge Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={url} download target="_blank" rel="noopener noreferrer" className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
            <button onClick={onClose} className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-auto bg-slate-50 p-4 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-800"></div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">AI 正在讀取內容...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <p className="text-slate-800 font-bold mb-4">{error}</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="bg-sky-800 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-sky-900/20 hover:bg-sky-900 transition-all">直接開啟原始檔案</a>
            </div>
          ) : isExcel ? (
            <div className="h-full flex flex-col">
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(excelData).map(name => (
                  <button key={name} onClick={() => setActiveSheet(name)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSheet === name ? 'bg-sky-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                    {name}
                  </button>
                ))}
              </div>
              <div className="flex-grow overflow-auto border border-slate-200 rounded-2xl shadow-inner bg-white">
                <table className="w-full text-left border-collapse min-w-max">
                  <tbody className="divide-y divide-slate-100">
                    {excelData[activeSheet]?.length > 0 ? (
                      excelData[activeSheet].map((row, i) => (
                        <tr key={i} className={i === 0 ? 'bg-slate-50 sticky top-0' : 'hover:bg-slate-50/50'}>
                          {row.map((cell, j) => (
                            <td key={j} className={`p-4 text-sm ${i === 0 ? 'font-black text-slate-800' : 'text-slate-600 font-medium'}`}>{cell?.toString() || ''}</td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr><td className="p-20 text-center text-slate-400 font-bold italic">此分頁沒有內容</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isImage ? (
            <div className="h-full flex items-center justify-center p-4">
              <img src={url} alt={fileName} className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl" />
            </div>
          ) : isPdf ? (
            <iframe src={`${url}#toolbar=0`} className="w-full h-full rounded-2xl shadow-inner bg-white border-none" title="PDF Preview" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <a href={url} target="_blank" rel="noopener noreferrer" className="bg-sky-800 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-sky-900/20 hover:bg-sky-900 transition-all">點擊下載原始檔案</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, lang, settings, onLogQuery }) => {
  const t = translations[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [topDocs, setTopDocs] = useState<KBDocument[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    const loadTopDocs = async () => {
      const docs = await fetchTopDocuments(3);
      setTopDocs(docs);
    };
    loadTopDocs();
  }, [documents]);

  const handleSendMessage = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const query = typeof e === 'string' ? e : input;
    if (!query.trim() || isTyping) return;

    const userMessage: ChatMessage = { role: 'user', content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const { answer, sources } = await queryKnowledgeBase(query, documents, lang, settings);
      const assistantMessage: ChatMessage = { role: 'assistant', content: answer, timestamp: new Date(), sources };
      setMessages(prev => [...prev, assistantMessage]);
      
      // 紀錄計數
      if (sources && sources.length > 0 && onLogQuery) {
        onLogQuery(sources); // 傳遞 (ID) Name 格式
      }
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col container mx-auto px-4 py-8">
      <div className="flex-grow overflow-y-auto mb-6 pr-2 space-y-8 scroll-smooth" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-20">
            <div className="w-24 h-24 bg-sky-800 rounded-[32px] flex items-center justify-center text-white text-5xl shadow-2xl mb-8 animate-bounce shadow-sky-900/20">🦅</div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-4">{t.title}</h2>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">{t.subtitle}</p>
            
            {/* 熱門諮詢推薦 */}
            <div className="w-full mt-12 space-y-4">
               <div className="flex items-center justify-center gap-2 mb-6">
                 <div className="h-[1px] bg-slate-200 flex-grow"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🔥 熱門諮詢推薦</span>
                 <div className="h-[1px] bg-slate-200 flex-grow"></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topDocs.map((doc, idx) => (
                  <button key={doc.id} onClick={() => handleSendMessage(doc.name)} className="bg-white/60 hover:bg-white border border-slate-200 p-5 rounded-[28px] transition-all hover:shadow-xl hover:-translate-y-1 text-left flex flex-col justify-between group">
                    <span className="text-2xl mb-2">{['🏆', '🥈', '🥉'][idx] || '📝'}</span>
                    <span className="font-black text-slate-800 text-[11px] line-clamp-2 uppercase tracking-tight group-hover:text-sky-800 transition-colors">{doc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] md:max-w-[75%] rounded-[32px] p-6 md:p-8 ${msg.role === 'user' ? 'bg-sky-800 text-white shadow-xl shadow-sky-900/20' : 'bg-white text-slate-800 border border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${msg.role === 'user' ? 'bg-white/20' : 'bg-sky-800 text-white'}`}>{msg.role === 'user' ? 'U' : '🦅'}</div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>{msg.role === 'user' ? 'You' : 'Big Eagle AI'}</span>
                  <span className={`text-[9px] font-bold ${msg.role === 'user' ? 'text-white/40' : 'text-slate-300'}`}>• {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="prose prose-slate max-w-none leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className={`mt-8 pt-6 border-t ${msg.role === 'user' ? 'border-white/10' : 'border-slate-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>{t.sourcesFound} ({msg.sources.length})</p>
                    <div className="flex flex-col gap-2">
                      {msg.sources.map((src, sIdx) => {
                        // src 格式為 (3) Name
                        const match = src.match(/^\((\d+)\)\s+(.*)$/);
                        const id = match ? match[1] : '';
                        const label = match ? match[2] : src;
                        const isUrl = label.startsWith('http');
                        const doc = documents.find(d => d.url === label || d.name === label);
                        
                        return (
                          <button key={sIdx} onClick={() => { if (doc?.url) setPreviewFile({ url: doc.url, name: doc.name }); else if (isUrl) window.open(label, '_blank'); }} className={`flex items-center gap-2 text-[11px] font-bold transition-all text-left group ${msg.role === 'user' ? 'text-white/80 hover:text-white' : 'text-slate-500 hover:text-sky-800'}`}>
                            <span className={`flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-black shrink-0 ${msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'}`}>({id})</span>
                            <span className="truncate group-hover:underline">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
             <div className="bg-white border border-slate-200 rounded-[32px] px-8 py-6 shadow-sm"><div className="flex gap-1.5"><div className="w-2 h-2 bg-sky-800 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-sky-800 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-sky-800 rounded-full animate-bounce delay-150"></div></div></div>
          </div>
        )}
      </div>
      <div className="relative group">
        <div className="absolute -inset-2 bg-gradient-to-r from-sky-600 to-indigo-600 rounded-[40px] opacity-10 blur-xl group-focus-within:opacity-20 transition-opacity"></div>
        <form onSubmit={handleSendMessage} className="relative bg-white border border-slate-200 rounded-[36px] p-2 flex items-center gap-2 shadow-2xl overflow-hidden">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.searchPlaceholder} className="flex-grow bg-transparent border-none px-6 py-4 focus:ring-0 text-slate-800 font-medium placeholder:text-slate-300" />
          <button type="submit" disabled={!input.trim() || isTyping} className="bg-sky-800 text-white w-14 h-14 rounded-full flex items-center justify-center hover:bg-sky-900 transition-all shadow-lg active:scale-95 disabled:opacity-20"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
        </form>
      </div>
      {previewFile && <FilePreviewModal url={previewFile.url} fileName={previewFile.name} onClose={() => setPreviewFile(null)} />}
    </div>
  );
};

export default KnowledgeBase;
