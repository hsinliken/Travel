
import { GoogleGenAI } from "@google/genai";
import { KBDocument, Language, KBSettings } from "../types";

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

export const extractTextFromFile = async (file: File): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-3-flash-preview';
  
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.readAsDataURL(file);
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType: file.type || 'application/octet-stream' } },
          { text: "Please extract all readable text from this document/image. Maintain structure if possible." }
        ]
      }
    });

    return response.text || "No text could be extracted.";
  } catch (error: any) {
    console.error("Error extracting text:", error);
    throw new Error(handleGeminiError(error, 'zh-TW'));
  }
};

export const extractTextFromUrl = async (url: string): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: `Perform a comprehensive travel information extraction for: ${url}. Cover itineraries, benefits, and pricing.` }] },
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
    const ai = getAiClient();
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

    const systemInstruction = `
      ${settings.systemInstruction}
      Always respond in ${lang}.
      Always list sources clearly at the end of your response.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: `Context:\n${context}\n\nQuestion: ${queryText}` }] },
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });

    const answer = response.text || "I processed your request but couldn't generate a text answer.";
    
    const usedSources = documents
      .filter(doc => answer.includes(doc.name) || (doc.url && answer.includes(doc.url)))
      .map(doc => doc.sourceType === 'web' ? doc.url! : doc.name);

    return { 
      answer, 
      sources: Array.from(new Set(usedSources)) 
    };
  } catch (error: any) {
    console.error("Critical RAG Error:", error);
    return {
      answer: handleGeminiError(error, lang),
      sources: []
    };
  }
};
