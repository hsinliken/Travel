
import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../translations';

interface AdminLoginProps {
  onLogin: (username: string) => void;
  lang: Language;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, lang }) => {
  const t = translations[lang];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 確認帳號 admin, 密碼 leeken
    if (username === 'admin' && password === 'leeken') {
      onLogin(username);
    } else {
      setError(lang === 'en' ? 'Invalid credentials' : '登入資訊錯誤，請檢查帳號密碼');
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-20 bg-slate-100 relative overflow-hidden">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-200/40 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-300/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
      
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-slate-100">
        <div className="bg-sky-800 p-10 text-white text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
            <span className="text-3xl">🦅</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">{t.loginTitle}</h2>
          <p className="text-sky-100/70 text-sm mt-2 font-medium">{t.loginSubtitle}</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-10 space-y-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-3 animate-shake">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{t.userLabel}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all font-medium"
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{t.passLabel}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-sky-800/10 focus:border-sky-800 transition-all font-medium"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-sky-800 hover:bg-sky-900 text-white font-black py-5 px-4 rounded-2xl shadow-xl shadow-sky-900/20 transition-all active:scale-95"
          >
            {t.loginBtn}
          </button>
          
          <div className="text-center">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Big Eagle Internal Systems • Secure Access</span>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default AdminLogin;
