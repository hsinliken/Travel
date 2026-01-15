
import { GoogleGenAI } from "@google/genai";
import { KBDocument, Language, KBSettings } from "../types";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "null" || apiKey === "undefined") {
    throw new Error("Missing API_KEY. Please set it in Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const handleGeminiError = (error: any, lang: Language): string => {
  const msg = error?.message || "";
  if (msg.includes("leaked")) {
    return lang === 'zh-TW' 
      ? "⚠️ API 金鑰已被 Google 封鎖（疑似外流）。請至 AI Studio 重新產生金鑰並更新環境變數。" 
      : "⚠️ API Key has been leaked and blocked by Google. Please rotate your key in AI Studio.";
  }
  if (msg.includes("API key not found") || msg.includes("invalid")) {
    return lang === 'zh-TW' ? "⚠️ 無效的 API 金鑰，請檢查設定。" : "⚠️ Invalid API Key.";
  }
  return `Technical difficulty: ${msg || "Unknown connection error"}`;
};

/**
 * 處理 Excel/CSV 檔案轉文字 (支援 .xls, .xlsx, .csv)
 */
const parseExcelToText = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  let fullText = "";

  workbook.SheetNames.forEach((sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
  });

  return fullText;
};

/**
 * 處理 Word 檔案轉文字 (支援 .docx)
 */
const parseWordToText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const model = 'gemini-3-flash-preview';
  
  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');
  const isWord = fileName.endsWith('.docx');
  const isText = fileName.endsWith('.txt') || fileName.endsWith('.md');

  try {
    let extractedRawText = "";

    if (isExcel) {
      extractedRawText = await parseExcelToText(file);
    } else if (isWord) {
      extractedRawText = await parseWordToText(file);
    } else if (isText) {
      extractedRawText = await file.text();
    }

    if (extractedRawText) {
      const response = await ai.models.generateContent({
        model,
        contents: [{
          parts: [
            { text: `I have extracted the following raw content from a file named "${file.name}". Please reorganize, clean, and format this information into a structured summary for a Travel Knowledge Base. Ensure all pricing, dates, and itineraries are preserved.\n\nRaw Content:\n${extractedRawText}` }
          ]
        }]
      });
      return response.text || extractedRawText;
    } 

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(file);
    });

    const response = await ai.models.generateContent({
      model,
      contents: [{
        parts: [
          { inlineData: { data: base64, mimeType: file.type || 'application/octet-stream' } },
          { text: "Please extract all readable text from this document/image. Maintain structure and specific travel details like prices and locations." }
        ]
      }]
    });

    return response.text || "No text could be extracted.";

  } catch (error: any) {
    console.error("Error extracting text:", error);
    if (fileName.endsWith('.doc')) {
      throw new Error("系統不支援舊版 .doc 格式。請將檔案另存為 .docx 或 PDF 後再行上傳。");
    }
    throw new Error(handleGeminiError(error, 'zh-TW'));
  }
};

export const extractTextFromUrl = async (url: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const model = 'gemini-3-pro-preview';
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Perform a comprehensive travel information extraction for: ${url}. Cover itineraries, benefits, and pricing.` }] }],
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    return response.text || "Failed to extract content from URL.";
  } catch (error: any) {
    console.error("Error extracting text from URL:", error);
    throw new Error(handleGeminiError(error, 'zh-TW'));
  }
};

export const queryKnowledgeBase = async (
  queryText: string, 
  documents: KBDocument[],
  lang: Language,
  settings: KBSettings
): Promise<{ answer: string; sources: string[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const model = settings.model || 'gemini-3-flash-preview';

    if (documents.length === 0) {
      return {
        answer: lang === 'en' ? "Knowledge base is empty." : "知識庫目前沒有資料，請管理員上傳文件。",
        sources: []
      };
    }

    const context = documents.map(doc => {
      const header = doc.sourceType === 'web' ? `[Source URL: ${doc.url}]` : `[Source File: ${doc.name}]`;
      return `${header}\n${doc.content}`;
    }).join('\n\n---\n\n');

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Context:\n${context}\n\nQuestion: ${queryText}` }] }],
      config: {
        systemInstruction: `${settings.systemInstruction}\nAlways respond in ${lang}. Always list sources clearly at the end.`,
        temperature: 0.2,
      }
    });

    const answer = response.text || "No response.";
    const usedSources = documents
      .filter(doc => answer.includes(doc.name) || (doc.url && answer.includes(doc.url)))
      .map(doc => doc.sourceType === 'web' ? doc.url! : doc.name);

    return { 
      answer, 
      sources: Array.from(new Set(usedSources)) 
    };
  } catch (error: any) {
    console.error("Critical RAG Error:", error);
    return { answer: handleGeminiError(error, lang), sources: [] };
  }
};
