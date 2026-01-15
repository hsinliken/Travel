
import { GoogleGenAI } from "@google/genai";
import { KBDocument, Language } from "../types";

// Always use process.env.API_KEY directly to initialize GoogleGenAI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const extractTextFromFile = async (file: File): Promise<string> => {
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
          { text: "Please extract all readable text from this document/image. If it's a structured document, maintain the structure as much as possible in text format." }
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
  // Use gemini-3-pro-preview for deep extraction simulation using search tool
  const model = 'gemini-3-pro-preview';
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Please perform a deep extraction of this URL: ${url}. 
      Act as a web crawler:
      1. Analyze the main page content.
      2. Identify and follow key navigation links (up to 2 levels deep) to gather more detailed travel information, itineraries, pricing, and FAQ details related to this specific entity or service.
      3. Provide a synthesized, structured knowledge base entry that covers all these details comprehensively. 
      Focus on travel schedules, member benefits, destination highlights, and pricing.`,
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
  query: string, 
  documents: KBDocument[],
  lang: Language
): Promise<{ answer: string; sources: string[] }> => {
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
    Language: Please respond in the language specified by the user's current preference: ${lang}.
    
    Use the provided context to answer the user's question accurately.
    If the answer isn't in the context, indicate that you don't have that information in your current database, but offer general travel advice based on your general knowledge if helpful.
    
    CRITICAL: Always mention specific sources you used (either filename or URL).
    Keep the tone professional, welcoming, and knowledgeable.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Context:\n${context}\n\nQuestion: ${query}`,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    const answer = response.text || "I encountered an error processing your request.";
    
    // Find sources used
    const usedSources = documents
      .filter(doc => {
        const nameMatch = answer.includes(doc.name);
        const urlMatch = doc.url && answer.includes(doc.url);
        return nameMatch || urlMatch;
      })
      .map(doc => doc.sourceType === 'web' ? doc.url! : doc.name);

    return { 
      answer, 
      sources: usedSources.length > 0 ? usedSources : [] 
    };
  } catch (error) {
    console.error("Error querying RAG:", error);
    return {
      answer: "Technical difficulty.",
      sources: []
    };
  }
};
