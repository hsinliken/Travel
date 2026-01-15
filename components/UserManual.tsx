
import React from 'react';
import { Language } from '../types';
import { translations } from '../translations';

interface UserManualProps {
  lang: Language;
}

const UserManual: React.FC<UserManualProps> = ({ lang }) => {
  const t = translations[lang];

  const sections = [
    {
      title: t.manualUserGuide,
      icon: '👤',
      items: [
        {
          head: lang === 'zh-TW' ? 'AI 諮詢功能' : 'AI Consulting',
          body: lang === 'zh-TW' 
            ? '在首頁輸入任何旅遊問題，系統將結合「大鷹旅遊知識庫」內的精確文件，透過 RAG 技術提供專業回覆。' 
            : 'Enter any travel questions on the home page. The system combines precise documents from the Big Eagle Knowledge Base using RAG technology to provide professional responses.'
        },
        {
          head: lang === 'zh-TW' ? '參考來源追蹤' : 'Source Tracking',
          body: lang === 'zh-TW'
            ? 'AI 回覆後會列出參考的文件或網頁連結，點擊即可查看原始資料，確保資訊透明且可信。'
            : 'AI responses will list source documents or web links. Click to view the original data, ensuring transparency and credibility.'
        }
      ]
    },
    {
      title: t.manualAdminGuide,
      icon: '⚙️',
      items: [
        {
          head: lang === 'zh-TW' ? '知識庫建立 (文件/網頁)' : 'Knowledge Base (Files/Web)',
          body: lang === 'zh-TW'
            ? '管理員可上傳 PDF、Word 或圖片，AI 會自動提取文字並索引。亦可輸入官網 URL，系統將深度抓取行程與價格。'
            : 'Admins can upload PDF, Word, or images. AI automatically extracts and indexes text. You can also enter URLs for deep extraction of itineraries and pricing.'
        },
        {
          head: lang === 'zh-TW' ? '網頁自動更新 (Re-index)' : 'Re-indexing Web Content',
          body: lang === 'zh-TW'
            ? '若外部網站內容更新（例如價格變動），點擊卡片右上角的「循環圖示」即可重新整理內容，無需重複輸入。'
            : 'If external website content updates (like price changes), click the refresh icon on the card to update the content without re-entering the URL.'
        },
        {
          head: lang === 'zh-TW' ? '雲端同步中心 (Sync)' : 'Cloud Sync Center',
          body: lang === 'zh-TW'
            ? '系統使用 SQLite 邊緣運算。點擊 "Push" 可將本地索引上傳至雲端儲存；"Pull" 則可從雲端同步最新的全球資料。'
            : 'The system uses SQLite edge computing. Click "Push" to upload the local index to the cloud; "Pull" to sync the latest global data from the cloud.'
        },
        {
          head: lang === 'zh-TW' ? '本地 SQLite 管理' : 'Local SQLite Management',
          body: lang === 'zh-TW'
            ? '支援「導出 (Export)」與「導入 (Import)」實體 .sqlite 檔案，方便進行離線備份與資料轉移。'
            : 'Supports Exporting and Importing physical .sqlite files, facilitating offline backup and data transfer.'
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 animate-fade-in max-w-4xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">{t.manualTitle}</h1>
        <div className="w-24 h-1.5 bg-sky-800 mx-auto rounded-full"></div>
      </div>

      <div className="space-y-16">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-8">
            <div className="flex items-center gap-4">
              <span className="text-4xl bg-white w-16 h-16 flex items-center justify-center rounded-2xl shadow-lg border border-slate-100">
                {section.icon}
              </span>
              <h2 className="text-2xl font-black text-slate-700 uppercase tracking-wide">
                {section.title}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {section.items.map((item, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-8 hover:shadow-xl transition-all hover:-translate-y-1">
                  <h3 className="text-lg font-black text-sky-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-sky-800 rounded-full"></span>
                    {item.head}
                  </h3>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 p-8 bg-slate-900 rounded-[40px] text-white text-center shadow-2xl">
        <h3 className="text-xl font-black mb-2">Need More Help?</h3>
        <p className="text-slate-400 text-sm">Contact Big Eagle Travel IT Support team for system maintenance issues.</p>
        <div className="mt-6 inline-flex px-6 py-2 bg-sky-500 rounded-full text-xs font-black uppercase tracking-widest">
          Internal Version v2.0.4
        </div>
      </div>
    </div>
  );
};

export default UserManual;
