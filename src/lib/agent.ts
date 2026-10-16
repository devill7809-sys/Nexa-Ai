import ai from './gemini.ts';
import { tools } from './tools.ts';
import { addMessage } from '../db/chat.ts';
import { setPendingCall } from './session.ts';

import { GoogleGenAI } from '@google/genai';

export async function orchestrate(ai: any, userId: number, conversationId: number, messages: any[], prompt: string) {
  let currentMessages = [...messages, { role: 'user', content: prompt }];
  
  for (let i = 0; i < 5; i++) {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: currentMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
      config: {
        tools: [{ functionDeclarations: Object.values(tools).map(t => t.declaration) }]
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const tool = call.name ? tools[call.name] : undefined;
      if (!tool) {
        currentMessages.push({ role: 'ai', content: `Tool ${call.name} not found` });
        break;
      }
      
      if (tool.requiresConfirmation) {
        setPendingCall(userId, conversationId, call);
        return { status: 'pending_confirmation', toolCall: call, conversationId };
      }
      
      const result = await tool.handler(call.args, userId);
      currentMessages.push({ role: 'ai', content: `Executed ${call.name}: ${JSON.stringify(result)}` });
      await addMessage(conversationId, 'ai', `Executed ${call.name}: ${JSON.stringify(result)}`);
    } else {
      await addMessage(conversationId, 'ai', response.text || '');
      return { status: 'complete', response: response.text };
    }
  }
  return { status: 'complete', response: 'Reached maximum steps' };
}
