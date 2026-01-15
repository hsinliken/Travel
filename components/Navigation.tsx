
import React, { useState, useRef, useEffect } from 'react';
import { ViewState, User, Language } from '../types';
import { translations } from '../translations';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  user: User | null;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, user, onLogout, lang, setLang }) => {
  const t = translations[lang];
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languageNames: Record<Language, string> = {
    'en': 'English',
    'zh-TW': '中文繁體',
    'zh-CN': '中文簡體',
    'ja': '日本語'
  };

  const NavLinks = () => (
    <>
      <button 
        onClick={() => { setView(ViewState.HOME); setIsSidebarOpen(false); }}
        className={`px-3 py-2 text-sm font-bold transition-colors text-left ${currentView === ViewState.HOME ? 'text-sky-600' : 'text-slate-600 hover:text-sky-600'}`}
      >
        {t.askAi}
      </button>
      <button 
        onClick={() => { setView(ViewState.USER_MANUAL); setIsSidebarOpen(false); }}
        className={`px-3 py-2 text-sm font-bold transition-colors text-left ${currentView === ViewState.USER_MANUAL ? 'text-sky-600' : 'text-slate-600 hover:text-sky-600'}`}
      >
        {t.manual}
      </button>
      {user && (
        <button 
          onClick={() => { setView(ViewState.ADMIN_DASHBOARD); setIsSidebarOpen(false); }}
          className={`px-3 py-2 text-sm font-bold transition-colors text-left ${currentView === ViewState.ADMIN_DASHBOARD ? 'text-sky-600' : 'text-slate-600 hover:text-sky-600'}`}
        >
          {t.dashboard}
        </button>
      )}
    </>
  );

  return (
    <>
      {/* Sidebar Drawer */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>
      <div className={`fixed left-0 top-0 bottom-0 w-72 bg-white/90 backdrop-blur-xl z-[101] shadow-2xl transition-transform duration-500 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-800 rounded-lg flex items-center justify-center text-white text-lg font-bold">🦅</div>
              <span className="font-black text-slate-800 uppercase tracking-widest text-xs">{t.menu}</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-800">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          
          <div className="flex flex-col gap-6">
            <NavLinks />
          </div>

          <div className="mt-auto pt-8 border-t border-slate-100">
            {user ? (
               <div className="flex flex-col gap-4">
                 <div className="bg-sky-50 p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 bg-sky-800 text-white rounded-full flex items-center justify-center font-bold text-xs uppercase">{user.username[0]}</div>
                    <div className="text-[10px] font-black uppercase text-sky-800 tracking-widest">{user.username}</div>
                 </div>
                 <button onClick={() => { onLogout(); setIsSidebarOpen(false); }} className="text-red-500 font-black uppercase text-[10px] tracking-widest hover:text-red-600 transition-colors p-2 text-left">{t.logout}</button>
               </div>
            ) : (
               <button onClick={() => { setView(ViewState.ADMIN_LOGIN); setIsSidebarOpen(false); }} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-all shadow-lg">{t.adminAccess}</button>
            )}
          </div>
        </div>
      </div>

      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              title={t.menu}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div 
              className="flex items-center gap-2 cursor-pointer group shrink-0"
              onClick={() => setView(ViewState.HOME)}
            >
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-sky-200 group-hover:scale-105 transition-transform">
                🦅
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
                {t.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            <div className="hidden md:flex items-center gap-6 mr-6">
               <NavLinks />
            </div>

            {/* Language Dropdown */}
            <div className="relative ml-2 pl-2 border-l border-slate-200" ref={dropdownRef}>
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
                aria-label="Select Language"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span className="text-xs font-bold uppercase hidden md:inline">{lang}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-1 z-[60]">
                  {(['en', 'zh-TW', 'zh-CN', 'ja'] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setLang(l);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${lang === l ? 'bg-sky-50 text-sky-800' : 'text-slate-600 hover:bg-slate-50 hover:text-sky-600'}`}
                    >
                      {languageNames[l]}
                      {lang === l && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
