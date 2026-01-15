
export type Language = 'en' | 'zh-TW' | 'zh-CN' | 'ja';

export interface KBDocument {
  id: string;
  name: string;
  type: string;
  sourceType: 'file' | 'web';
  content: string;
  uploadDate: string;
  reviewer: string;      // The admin who reviewed the content
  publishDate: string;   // The date it was officially published
  url?: string;
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
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}
