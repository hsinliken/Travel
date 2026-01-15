
import React, { useState, useRef, useEffect } from 'react';
import { KBDocument, ChatMessage, Language, KBSettings } from '../types';
import { queryKnowledgeBase } from '../services/geminiService';
import { translations } from '../translations';

interface KnowledgeBaseProps {
  documents: KBDocument[];
  lang: Language;
  settings: KBSettings;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, lang, settings }) => {
  const t = translations[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const trendingTopics = [
    lang === 'en' ? "Big Eagle Member Perks" : "大鷹會員優惠",
    lang === 'en' ? "2024 Japan Travel Guide" : "2024 日本旅遊指南",
    lang === 'en' ? "Big Eagle Office Locations" : "大鷹辦公室地點",
    lang === 'en' ? "Group Tour Insurance" : "團體旅遊保險"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-5xl mx-auto px-4 overflow-hidden">
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
                        {msg.sources.map(src => {
                          const isUrl = src.startsWith('http');
                          const doc = documents.find(d => d.url === src || d.name === src);
                          const displayName = doc ? doc.name : (src.length > 35 ? src.substring(0, 35) + '...' : src);
                          
                          return (
                            <a 
                              key={src} 
                              href={isUrl ? src : '#'} 
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
