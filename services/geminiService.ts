
import { GoogleGenAI } from "@google/genai";
import { KBDocument, Language } from "../types";

/**
 * Helper to get Gemini client. 
 * Using the provided key as default for local stability.
 */
const getAiClient = () => {
  const apiKey = process.env.API_KEY || "AIzaSyAmgZJ9XWOm5PyXU8axVj1_P9aZFJmoOa4";
  return new GoogleGenAI({ apiKey });
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
  } catch (error) {
    console.error("Error extracting text:", error);
    throw new Error("Failed to process document content.");
  }
};

export const extractTextFromUrl = async (url: string): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Perform a comprehensive travel information extraction for: ${url}. Cover itineraries, benefits, and pricing.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    return response.text || "Failed to extract content from URL.";
  } catch (error) {
    console.error("Error extracting text from URL:", error);
    throw new Error("Failed to fetch website content.");
  }
};

export const queryKnowledgeBase = async (
  queryText: string, 
  documents: KBDocument[],
  lang: Language
): Promise<{ answer: string; sources: string[] }> => {
  const ai = getAiClient();
  const model = 'gemini-3-flash-preview';

  if (documents.length === 0) {
    return {
      answer: lang === 'en' ? "Knowledge base is empty." : "知識庫為空。",
      sources: []
    };
  }

  const context = documents.map(doc => {
    const header = doc.sourceType === 'web' ? `[Source URL: ${doc.url}]` : `[Source File: ${doc.name}]`;
    return `${header}\n${doc.content}`;
  }).join('\n\n---\n\n');

  const systemInstruction = `
    You are an expert travel assistant for "Big Eagle Travel" (大鷹旅遊).
    Respond in ${lang}. Use the provided context to answer. 
    Mention specific sources used.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Context:\n${context}\n\nQuestion: ${queryText}`,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    const answer = response.text || "Error processing request.";
    
    const usedSources = documents
      .filter(doc => answer.includes(doc.name) || (doc.url && answer.includes(doc.url)))
      .map(doc => doc.sourceType === 'web' ? doc.url! : doc.name);

    return { 
      answer, 
      sources: Array.from(new Set(usedSources)) 
    };
  } catch (error) {
    console.error("Error querying RAG:", error);
    return {
      answer: "Technical difficulty.",
      sources: []
    };
  }
};
