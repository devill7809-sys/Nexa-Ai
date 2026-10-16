import { db } from '../db/index.ts';
import { conversations, messages } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function createConversation(userId: number, title: string) {
  return await db.insert(conversations).values({ userId, title }).returning();
}

export async function getConversations(userId: number) {
  return await db.select().from(conversations).where(eq(conversations.userId, userId));
}

export async function addMessage(conversationId: number, role: 'user' | 'ai', content: string) {
  return await db.insert(messages).values({ conversationId, role, content }).returning();
}

export async function getMessages(conversationId: number) {
  return await db.select().from(messages).where(eq(messages.conversationId, conversationId));
}
