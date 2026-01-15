
import React, { useState, useRef, useEffect } from 'react';
import { KBDocument, ChatMessage, Language, KBSettings } from '../types';
import { queryKnowledgeBase } from '../services/geminiService';
import { translations } from '../translations';
import * as XLSX from "xlsx";

interface KnowledgeBaseProps {
  documents: KBDocument[];
  lang: Language;
  settings: KBSettings;
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

  const fileExt = fileName.split('.').pop()?.toLowerCase();
  const isExcel = ['xlsx', 'xls', 'csv'].includes(fileExt || '');
  const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt || '');
  const isPdf = fileExt === 'pdf';

  useEffect(() => {
    if (isExcel) {
      fetchExcel();
    } else {
      setLoading(false);
    }
  }, [url, isExcel]);

  const fetchExcel = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      const data: { [key: string]: any[][] } = {};
      workbook.SheetNames.forEach((name: string) => {
        const sheet = workbook.Sheets[name];
        data[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      });

      setExcelData(data);
      if (workbook.SheetNames.length > 0) {
        setActiveSheet(workbook.SheetNames[0]);
      }
    } catch (err) {
      console.error("Excel Load Error:", err);
      setError("無法載入 Excel 檔案，可能是跨網域存取 (CORS) 限制。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-800 rounded-xl flex items-center justify-center text-white text-xl">
              {isExcel ? '📊' : isImage ? '🖼️' : isPdf ? '📄' : '📎'}
            </div>
            <div>
              <h3 className="font-black text-slate-800 truncate max-w-xs md:max-w-md">{fileName}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={url} download className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-500" title="Download Original">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
            <button onClick={onClose} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-auto p-2 md:p-6 bg-slate-50">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-sky-800/20 border-t-sky-800 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Loading Content...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-slate-800 font-black mb-2">{error}</p>
              <p className="text-slate-400 text-sm">請點擊右上方下載按鈕開啟原始檔案。</p>
            </div>
          ) : isExcel ? (
            <div className="h-full flex flex-col">
              {/* Sheet Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {Object.keys(excelData).map((name: string) => (
                  <button 
                    key={name}
                    onClick={() => setActiveSheet(name)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSheet === name ? 'bg-sky-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {/* Table Render */}
              <div className="flex-grow bg-white rounded-3xl border border-slate-200 overflow-auto shadow-inner">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-100">
                      {(excelData[activeSheet]?.[0] || []).map((cell: any, i: number) => (
                        <th key={i} className="px-4 py-3 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600 bg-slate-100">
                          {cell?.toString() || `Col ${i+1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(excelData[activeSheet]?.slice(1) || []).map((row: any[], i: number) => (
                      <tr key={i} className="hover:bg-sky-50/50 transition-colors">
                        {row.map((cell: any, j: number) => (
                          <td key={j} className="px-4 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">
                            {cell?.toString() || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isImage ? (
            <div className="h-full flex items-center justify-center">
              <img src={url} alt={fileName} className="max-w-full max-h-full object-contain rounded-2xl shadow-xl" />
            </div>
          ) : isPdf ? (
            <iframe src={`${url}#toolbar=0`} className="w-full h-full rounded-2xl border-none shadow-inner" title="PDF Preview"></iframe>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-slate-800 font-black mb-2">此格式暫不支援線上預覽</p>
              <p className="text-slate-400 text-sm">請下載後使用本機軟體開啟。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, lang, settings }) => {
  const t = translations[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await queryKnowledgeBase(input, documents, lang, settings);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        sources: result.sources
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: lang === 'en' ? "Error connecting to AI." : "與 AI 連接出錯。",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceClick = (e: React.MouseEvent, src: string) => {
    const isUrl = src.startsWith('http');
    if (!isUrl) return;

    const fileName = src.split('/').pop()?.split('?')[0] || 'Document';
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    // 如果是可預覽的檔案類型，則攔截點擊
    const previewable = ['xlsx', 'xls', 'csv', 'pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
    if (previewable) {
      e.preventDefault();
      setPreviewFile({ url: src, name: fileName });
    }
  };

  const trendingTopics = [
    lang === 'en' ? "Big Eagle Member Perks" : "大鷹會員優惠",
    lang === 'en' ? "2024 Japan Travel Guide" : "2024 日本旅遊指南",
    lang === 'en' ? "Big Eagle Office Locations" : "大鷹辦公室地點",
    lang === 'en' ? "Group Tour Insurance" : "團體旅遊保險"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-5xl mx-auto px-4 overflow-hidden">
      {/* 預覽 Modal */}
      {previewFile && (
        <FilePreviewModal 
          url={previewFile.url} 
          fileName={previewFile.name} 
          onClose={() => setPreviewFile(null)} 
        />
      )}

      <div 
        ref={scrollContainerRef}
        className="flex-grow overflow-y-auto pt-6 md:pt-10 pb-4 space-y-6 scroll-smooth scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="text-center py-10 animate-fade-in flex flex-col items-center justify-center min-h-[60%]">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-white/80 backdrop-blur-md rounded-3xl mb-6 text-sky-800 border-2 border-sky-100 shadow-xl shadow-sky-900/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-800 mb-2 tracking-tight">{t.subtitle}</h1>
            <p className="text-sm md:text-base text-slate-500 max-w-lg mx-auto mb-8 px-4 font-medium">
              {lang === 'en' ? 'Retrieving precision travel knowledge from official sources.' : '正在從官方渠道提取精準旅遊知識。'}
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto px-4">
              {trendingTopics.map(topic => (
                <button 
                  key={topic}
                  onClick={() => setInput(topic)}
                  className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl text-xs md:text-sm font-bold text-slate-600 hover:border-sky-400 hover:text-sky-800 hover:bg-white hover:shadow-lg transition-all active:scale-95"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in pb-10">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[90%] md:max-w-[80%] rounded-[28px] p-4 md:p-6 shadow-xl shadow-slate-900/5 transition-all ${
                    msg.role === 'user' 
                      ? 'bg-sky-800 text-white rounded-tr-none' 
                      : 'bg-white/95 backdrop-blur-md border border-slate-100 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-medium">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100/20">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {t.sourcesFound}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src: string) => {
                          const isUrl = src.startsWith('http');
                          const doc = documents.find(d => d.url === src || d.name === src);
                          const displayName = doc ? doc.name : (src.length > 35 ? src.substring(0, 35) + '...' : src);
                          
                          return (
                            <a 
                              key={src} 
                              href={isUrl ? src : '#'} 
                              onClick={(e) => handleSourceClick(e, src)}
                              target={isUrl ? "_blank" : "_self"}
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-slate-50/50 text-slate-500 rounded-xl text-[10px] font-bold border border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 transition-all truncate max-w-[240px] flex items-center gap-1.5"
                            >
                              {isUrl && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              )}
                              {displayName}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className={`text-[9px] mt-3 opacity-60 font-black uppercase tracking-wider ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/95 backdrop-blur-md border border-slate-100 rounded-3xl p-5 shadow-xl shadow-sky-900/5 flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-sky-800 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-sky-800 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-2 h-2 bg-sky-800 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                  </div>
                  <span className="text-xs text-sky-800 font-black italic uppercase tracking-widest">{t.consulting}</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      <div className="py-6 pt-2 bg-gradient-to-t from-slate-50/10 via-transparent to-transparent">
        <form 
          onSubmit={handleSubmit}
          className="relative group"
        >
          <div className="absolute inset-0 bg-sky-800/5 rounded-[32px] blur-2xl group-focus-within:bg-sky-800/10 transition-all"></div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="relative w-full bg-white border border-slate-200 rounded-[28px] md:rounded-[36px] py-5 md:py-6 pl-8 md:pl-10 pr-16 md:pr-20 shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all text-sm md:text-xl font-medium"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-sky-800 text-white rounded-[20px] md:rounded-[24px] flex items-center justify-center hover:bg-sky-900 disabled:opacity-50 transition-all shadow-xl active:scale-95 z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
        
        {documents.length === 0 ? (
          <p className="text-center mt-4 text-[10px] text-amber-600 font-black tracking-[0.2em] uppercase animate-pulse">
            ⚠️ {t.emptyKb}
          </p>
        ) : (
          <div className="text-center mt-4 flex items-center justify-center gap-3">
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Edge-RAG Ready</span>
             </div>
             <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
             <span className="text-[10px] text-slate-400 font-bold italic">{documents.length} sources indexed ({settings.model})</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
