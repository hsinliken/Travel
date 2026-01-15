
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

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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

        <div className="flex items-center gap-1 sm:gap-4 ml-auto">
          <button 
            onClick={() => setView(ViewState.HOME)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${currentView === ViewState.HOME ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-600 hover:text-sky-600'}`}
          >
            {t.askAi}
          </button>
          
          {user ? (
            <div className="flex items-center gap-1 sm:gap-4">
              <button 
                onClick={() => setView(ViewState.ADMIN_DASHBOARD)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${currentView === ViewState.ADMIN_DASHBOARD ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-600 hover:text-sky-600'}`}
              >
                {t.dashboard}
              </button>
              <button 
                onClick={onLogout}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap hidden xs:block"
              >
                {t.logout}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setView(ViewState.ADMIN_LOGIN)}
              className="bg-sky-800 hover:bg-sky-900 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
            >
              {t.adminAccess}
            </button>
          )}

          {/* Language Dropdown - Placed at the far right */}
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
  );
};

export default Navigation;
