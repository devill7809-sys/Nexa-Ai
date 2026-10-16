import { GoogleGenAI } from "@google/genai";

const ai = process.env.NODE_ENV === 'test' ? {
  models: {
    generateContent: async () => ({ text: 'Mock response', functionCalls: [] }),
    embedContent: async () => ({ embeddings: [{ values: new Array(768).fill(0) }] })
  }
} : new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default ai;
