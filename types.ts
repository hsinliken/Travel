
export type Language = 'en' | 'zh-TW' | 'zh-CN' | 'ja';

export interface KBDocument {
  id: string;              // 系統內部唯一碼 (UUID)
  docId: string;           // 規章編號 (如 HR-001)
  name: string;            // 規章名稱 (原 Title)
  type: string;            // 類型 (人事/財務/內控...)
  department: string;      // 適用單位
  summary: string;         // 白話摘要 (AI 生成)
  content: string;         // 規章全文
  sourceType: 'file' | 'web';
  url: string;             // 原始檔案連結
  version: string;         // 版本 (V1.0)
  status: '草稿' | '審核中' | '生效' | '作廢';
  uploadDate: string;
  publishDate: string;     // 原始發佈日
  effectiveDate: string;   // 生效日
  expiryDate: string;      // 失效日
  owner: string;           // 負責人
  lastReviewDate: string;  // 最近一次檢視
  tags: string;            // 標籤 (逗號分隔)
  reviewer: string;        // 審核人
}

export interface KBSettings {
  id: 'global';
  systemInstruction: string;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

export interface User {
  username: string;
  role: 'admin' | 'user';
}

export enum ViewState {
  HOME = 'HOME',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  USER_MANUAL = 'USER_MANUAL'
}
