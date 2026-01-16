
import React, { useState, useEffect } from 'react';
import { KBDocument, Language, KBSettings } from '../types';
import { extractTextFromFile, extractTextFromUrl, generateAISummary } from '../services/geminiService';
import { translations } from '../translations';
import { syncToCloud, exportDBFile, fetchQueryStats, QueryStats } from '../db';
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

type AdminSubView = 'analysis' | 'management';

// 編輯文件對話框
const EditDocModal: React.FC<{
  doc: KBDocument;
  onClose: () => void;
  onSave: (id: string, updates: Partial<KBDocument>) => Promise<void>;
}> = ({ doc, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<KBDocument>>({ ...doc });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(doc.id, formData);
    setIsSaving(false);
    onClose();
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-sky-800/20 focus:border-sky-800 transition-all";
  const labelClass = "block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-fade-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800">編輯規章屬性</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>Document_ID (規章編號)</label>
            <input type="text" value={formData.docId || ''} onChange={e => setFormData({ ...formData, docId: e.target.value })} className={inputClass} placeholder="如: HR-001" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Title (規章名稱)</label>
            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Type (類型)</label>
            <select value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })} className={inputClass}>
              <option value="人事">人事</option>
              <option value="財務">財務</option>
              <option value="內控">內控</option>
              <option value="法規">法規</option>
              <option value="業務">業務</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Department (適用單位)</label>
            <input type="text" value={formData.department || ''} onChange={e => setFormData({ ...formData, department: e.target.value })} className={inputClass} placeholder="全公司" />
          </div>
          <div>
            <label className={labelClass}>Owner (負責人)</label>
            <input type="text" value={formData.owner || ''} onChange={e => setFormData({ ...formData, owner: e.target.value })} className={inputClass} />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Summary (白話摘要 - AI 生成)</label>
            <textarea value={formData.summary || ''} onChange={e => setFormData({ ...formData, summary: e.target.value })} className={`${inputClass} h-24 resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Version (版本)</label>
            <input type="text" value={formData.version || ''} onChange={e => setFormData({ ...formData, version: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status (狀態)</label>
            <select value={formData.status || '生效'} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className={inputClass}>
              <option value="草稿">草稿</option>
              <option value="審核中">審核中</option>
              <option value="生效">生效</option>
              <option value="作廢">作廢</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Last_Review_Date (最近檢視)</label>
            <input type="date" value={formData.lastReviewDate || ''} onChange={e => setFormData({ ...formData, lastReviewDate: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Effective_Date (生效日)</label>
            <input type="date" value={formData.effectiveDate || ''} onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Expiry_Date (失效日)</label>
            <input type="date" value={formData.expiryDate || ''} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tags (標籤)</label>
            <input type="text" value={formData.tags || ''} onChange={e => setFormData({ ...formData, tags: e.target.value })} className={inputClass} placeholder="#ESG, #獎金" />
          </div>
          <div className="md:col-span-3 flex gap-3 mt-4">
            <button type="submit" disabled={isSaving} className="flex-grow py-4 bg-sky-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">
              {isSaving ? '儲存中...' : '儲存變更並同步雲端'}
            </button>
            <button type="button" onClick={onClose} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest">取消</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AnalysisDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<QueryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const data = await fetchQueryStats(period);
      setStats(data);
      setIsLoading(false);
    };
    loadStats();
  }, [period]);

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-800"></div>
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Loading Analytics...</p>
      </div>
    );
  }

  const maxCount = Math.max(...stats.timeChartData.map(d => d.count), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">查詢趨勢分析</h2>
          <p className="text-slate-500 font-medium">了解知識庫的實際諮詢頻率與文件熱度。</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {(['day', 'week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-white text-sky-800 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
              {p === 'day' ? '24 小時' : p === 'week' ? '7 天' : '30 天'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm hover:shadow-xl transition-all group">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">總諮詢次數</p>
          <div className="text-4xl font-black text-slate-800 group-hover:scale-110 origin-left transition-transform">{stats.totalQueries}</div>
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm hover:shadow-xl transition-all group">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">最熱門文件類型</p>
          <div className="text-4xl font-black text-slate-800">{stats.docUsage[0]?.type || 'N/A'}</div>
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm hover:shadow-xl transition-all group">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">平均引用數/次</p>
          <div className="text-4xl font-black text-slate-800">{stats.totalQueries > 0 ? (stats.docUsage.reduce((acc, d) => acc + d.count, 0) / stats.totalQueries).toFixed(1) : 0}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm h-80 flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8">分時查詢趨勢</h3>
          <div className="flex-grow flex items-end justify-between gap-1 px-4">
            {stats.timeChartData.map((d, i) => (
              <div key={i} className="flex-grow flex flex-col items-center group relative h-full justify-end">
                <div className="w-full bg-gradient-to-t from-sky-800 to-indigo-600 rounded-t-lg transition-all opacity-80" style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: '4px' }}></div>
                <div className="text-[9px] font-bold text-slate-400 mt-2 rotate-45 origin-left truncate w-8">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm h-80 overflow-hidden flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8">規章引用熱度榜</h3>
          <div className="flex-grow overflow-y-auto space-y-4 pr-2">
            {stats.docUsage.map((d, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <span className="text-xs font-bold text-slate-600 truncate mr-4">{d.docName}</span>
                <span className="text-xs font-black text-sky-800 shrink-0">{d.count} 次</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { lang, documents } = props;
  const t = translations[lang];
  
  const [activeSubView, setActiveSubView] = useState<AdminSubView>('management');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [reviewerInput] = useState('Admin'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDoc, setEditingDoc] = useState<KBDocument | null>(null);

  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (d.docId && d.docId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsProcessing(true);
    try {
      setStatus(`正在處理「${file.name}」...`);
      const cloudUrl = await uploadRawFile(file);
      const extractedText = await extractTextFromFile(file);
      setStatus("AI 正在分析內容並生成摘要...");
      const summary = await generateAISummary(extractedText);
      
      await props.onAddDoc({
        docId: '', 
        name: file.name,
        type: '其他',
        department: '全公司',
        summary,
        content: extractedText,
        sourceType: 'file',
        url: cloudUrl,
        version: 'V1.0',
        status: '生效',
        uploadDate: new Date().toISOString(),
        publishDate: new Date().toISOString(),
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        owner: reviewerInput,
        lastReviewDate: new Date().toISOString(),
        tags: '',
        reviewer: reviewerInput
      });
      setStatus("文件上傳成功！");
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) { setStatus(`錯誤: ${error.message}`); }
    finally { setIsProcessing(false); if (e.target) e.target.value = ''; }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault(); if (!urlInput.trim() || isProcessing) return; setIsProcessing(true);
    try {
      setStatus("正在深度抓取網頁內容...");
      const extractedText = await extractTextFromUrl(urlInput.trim());
      setStatus("AI 正在生成摘要...");
      const summary = await generateAISummary(extractedText);
      
      await props.onAddDoc({
        docId: 'WEB-' + Math.floor(Math.random() * 1000),
        name: new URL(urlInput).hostname,
        type: '網頁',
        department: '外部',
        summary,
        content: extractedText,
        sourceType: 'web',
        url: urlInput,
        version: 'V1.0',
        status: '生效',
        uploadDate: new Date().toISOString(),
        publishDate: new Date().toISOString(),
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        owner: 'System',
        lastReviewDate: new Date().toISOString(),
        tags: '#WebImport',
        reviewer: reviewerInput
      });
      setUrlInput('');
      setStatus(null);
    } catch (error) { setStatus(`錯誤: 抓取失敗。`); }
    finally { setIsProcessing(false); }
  };

  const SidebarItem = ({ id, label, icon }: { id: AdminSubView, label: string, icon: React.ReactNode }) => (
    <button onClick={() => { setActiveSubView(id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeSubView === id ? 'bg-sky-800 text-white shadow-xl shadow-sky-900/20' : 'text-slate-500 hover:bg-slate-100'}`}>
      {icon}{label}
    </button>
  );

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 z-[100] transition-transform duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="mb-12">
            <h2 className="text-sm font-black text-sky-800 uppercase tracking-widest mb-1">Admin Panel</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Big Eagle Travel KB</p>
          </div>
          <nav className="space-y-2">
            <SidebarItem id="analysis" label="查詢分析" icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>} />
            <SidebarItem id="management" label="上傳文件管理" icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>} />
          </nav>
          <div className="mt-auto pt-8 border-t border-slate-100">
             <button onClick={() => exportDBFile()} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mb-2">匯出本地資料庫</button>
             <button onClick={() => syncToCloud()} className="w-full py-3 bg-sky-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-900/20 active:scale-95 transition-all">同步至雲端</button>
          </div>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className="flex-grow overflow-y-auto pt-16 lg:pt-0">
        <div className="container mx-auto px-4 py-8 md:py-12">
          
          {status && (
            <div className={`fixed top-20 right-8 z-[200] p-6 border-2 rounded-[32px] flex items-center gap-4 animate-fade-in shadow-2xl ${status.startsWith('錯誤') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-sky-50 text-sky-800 border-sky-100'}`}>
              <div className={`w-3 h-3 rounded-full ${status.startsWith('錯誤') ? 'bg-red-500 animate-pulse' : 'bg-sky-500 animate-pulse'}`}></div>
              <span className="font-black uppercase tracking-wider text-xs">{status}</span>
            </div>
          )}

          {activeSubView === 'analysis' ? (
            <AnalysisDashboard />
          ) : (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight">規章文件管理</h1>
                  <p className="text-slate-500 font-medium">所有的規章變更將由 AI 自動生成摘要並同步雲端。</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="relative cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
                    <div className="flex items-center gap-2 px-6 py-3 bg-sky-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-900/20 hover:bg-sky-900 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {t.uploadNew}
                    </div>
                  </label>
                  <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 shadow-md">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                  </button>
                </div>
              </div>

              {/* Table Search */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4">
                 <div className="relative max-w-sm w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </span>
                    <input type="text" placeholder="搜尋規章編號或名稱..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3 text-sm font-medium focus:ring-2 focus:ring-sky-800/10 outline-none shadow-sm" />
                 </div>
                 <div className="flex items-center gap-6">
                    <form onSubmit={handleAddUrl} className="flex gap-2">
                      <input type="url" required placeholder="網頁連結導入..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-sky-800/20" />
                      <button type="submit" disabled={isProcessing || !urlInput.trim()} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md">抓取</button>
                    </form>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest hidden md:block">共 {filteredDocs.length} 份文件</p>
                 </div>
              </div>

              {/* Documents Professional Table */}
              <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1800px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Document_ID</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Title (規章名稱)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type (類型)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Department (單位)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest w-80">Summary (白話摘要)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Version (版本)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status (狀態)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Effective (生效)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Expiry (失效)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Owner (負責人)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Last Review</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tags (標籤)</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest sticky right-0 bg-slate-50 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredDocs.length > 0 ? (
                        filteredDocs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-6">
                              <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-tighter border border-slate-200">
                                {doc.docId || 'N/A'}
                              </span>
                            </td>
                            <td className="p-6">
                              <span className="font-black text-slate-800 text-sm">{doc.name}</span>
                            </td>
                            <td className="p-6">
                              <span className="px-2 py-1 bg-sky-50 text-sky-800 text-[10px] font-black uppercase rounded-lg border border-sky-100">{doc.type}</span>
                            </td>
                            <td className="p-6 text-xs font-bold text-slate-600">{doc.department}</td>
                            <td className="p-6">
                              <div className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-3 italic">
                                {doc.summary || 'AI 摘要生成中...'}
                              </div>
                            </td>
                            <td className="p-6 text-xs font-black text-slate-800">{doc.version}</td>
                            <td className="p-6">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                doc.status === '生效' ? 'bg-green-100 text-green-700' :
                                doc.status === '審核中' ? 'bg-amber-100 text-amber-700' :
                                doc.status === '作廢' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {doc.status}
                              </span>
                            </td>
                            <td className="p-6 text-xs font-medium text-slate-500">{doc.effectiveDate}</td>
                            <td className="p-6 text-xs font-medium text-slate-500">{doc.expiryDate || '-'}</td>
                            <td className="p-6 text-xs font-bold text-slate-700">{doc.owner}</td>
                            <td className="p-6 text-[10px] font-bold text-slate-400 uppercase">{doc.lastReviewDate}</td>
                            <td className="p-6">
                               <div className="flex flex-wrap gap-1 max-w-[150px]">
                                 {(doc.tags || '').split(',').filter(Boolean).map((tag, i) => (
                                   <span key={i} className="text-[9px] bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">{tag.trim()}</span>
                                 ))}
                               </div>
                            </td>
                            <td className="p-6 sticky right-0 bg-white shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] group-hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setEditingDoc(doc)} className="p-2 text-slate-400 hover:text-sky-800 hover:bg-sky-50 rounded-xl transition-all" title="編輯詳情">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                {doc.url && (
                                  <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-sky-800 hover:bg-sky-50 rounded-xl transition-all" title="查看檔案連結">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                  </a>
                                )}
                                <button onClick={() => { if(confirm('確定刪除此規章？')) props.onRemoveDoc(doc.id); }} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="刪除">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={13} className="p-20 text-center">
                            <div className="flex flex-col items-center gap-4 text-slate-300 italic font-bold">目前沒有任何規章文件</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingDoc && (
        <EditDocModal 
          doc={editingDoc} 
          onClose={() => setEditingDoc(null)} 
          onSave={props.onUpdateDoc} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;
