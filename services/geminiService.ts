
import { GoogleGenAI } from "@google/genai";
import { KBDocument, Language, KBSettings } from "../types";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";

const handleGeminiError = (error: any, lang: Language): string => {
  const msg = error?.message || "";
  if (msg.includes("leaked")) {
    return lang === 'zh-TW' 
      ? "⚠️ API 金鑰已被 Google 封鎖（疑似外流）。" 
      : "⚠️ API Key leaked and blocked.";
  }
  return `Technical difficulty: ${msg || "Unknown connection error"}`;
};

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

const parseWordToText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

export const generateAISummary = async (content: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const model = 'gemini-3-flash-preview';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{
        parts: [{ text: `請將下列規章全文內容，轉化為大約 100 字以內的白話摘要，說明其核心要點：\n\n內容：\n${content.substring(0, 10000)}` }]
      }]
    });
    return response.text || "無法生成摘要。";
  } catch (e) {
    return "摘要生成失敗。";
  }
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
    if (isExcel) extractedRawText = await parseExcelToText(file);
    else if (isWord) extractedRawText = await parseWordToText(file);
    else if (isText) extractedRawText = await file.text();

    if (extractedRawText) {
      const response = await ai.models.generateContent({
        model,
        contents: [{
          parts: [{ text: `I have extracted the following content from "${file.name}". Please reorganize and format it into a structured summary for a Knowledge Base.\n\nRaw Content:\n${extractedRawText}` }]
        }]
      });
      return response.text || extractedRawText;
    } 

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    const response = await ai.models.generateContent({
      model,
      contents: [{
        parts: [
          { inlineData: { data: base64, mimeType: file.type || 'application/octet-stream' } },
          { text: "Extract text from this document. Maintain structure." }
        ]
      }]
    });
    return response.text || "No text could be extracted.";
  } catch (error: any) {
    throw new Error(handleGeminiError(error, 'zh-TW'));
  }
};

export const extractTextFromUrl = async (url: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const model = 'gemini-3-pro-preview';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Perform a comprehensive travel information extraction for: ${url}.` }] }],
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "Failed to extract content from URL.";
  } catch (error: any) {
    throw new Error(handleGeminiError(error, 'zh-TW'));
  }
};

export const queryKnowledgeBase = async (queryText: string, documents: KBDocument[], lang: Language, settings: KBSettings): Promise<{ answer: string; sources: string[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const model = settings.model || 'gemini-3-flash-preview';
    if (documents.length === 0) return { answer: lang === 'en' ? "Knowledge base is empty." : "知識庫目前沒有資料。", sources: [] };
    
    // 使用 (ID) 標註上下文
    const context = documents.map((doc, index) => `(${index + 1}) Source: ${doc.name}\n${doc.content}`).join('\n\n---\n\n');
    
    // 嚴格指示引用格式
    const systemInstruction = `${settings.systemInstruction}\nRespond in ${lang}. MUST cite sources using ONLY the number in parentheses at the end of relevant sentences, for example: (1) or (1, 2). DO NOT use "ID" prefix.`;
    
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Context:\n${context}\n\nQuestion: ${queryText}` }] }],
      config: { systemInstruction, temperature: 0 }
    });
    
    const answer = response.text || "No response.";
    const idSet = new Set<number>();
    // 匹配 (1) 或 (1, 2)
    const citationRegex = /\(([\d\s,]+)\)/g;
    let match;
    while ((match = citationRegex.exec(answer)) !== null) {
      match[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)).forEach(id => idSet.add(id));
    }
    
    const usedSources = Array.from(idSet)
      .sort((a, b) => a - b)
      .filter(id => id > 0 && id <= documents.length)
      .map(id => `(${id}) ${documents[id - 1].name}`);
      
    return { answer, sources: usedSources };
  } catch (error: any) {
    return { answer: handleGeminiError(error, lang), sources: [] };
  }
};
