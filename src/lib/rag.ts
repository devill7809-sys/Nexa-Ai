import ai from './gemini.ts';
import { db } from '../db/index.ts';
import { documentChunks, documents } from '../db/schema.ts';
import { sql, eq } from 'drizzle-orm';

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-2-preview',
    contents: text,
  });
  if (!result.embeddings || !result.embeddings[0].values) {
    throw new Error('Failed to generate embedding');
  }
  return result.embeddings[0].values;
}

export async function addDocument(userId: number, name: string, content: string) {
  const doc = await db.insert(documents).values({ userId, name }).returning();
  const docId = doc[0].id;
  
  // Simple chunking
  const chunks = content.match(/.{1,1000}/g) || [content];
  
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    await db.insert(documentChunks).values({
      documentId: docId,
      content: chunk,
      embedding: embedding,
    });
  }
  return docId;
}

export async function searchDocuments(userId: number, prompt: string, limit = 3) {
  const embedding = await generateEmbedding(prompt);

  // Use pgvector cosine similarity
  // Since I stored embedding as text, need to cast it
  const results = await db.execute(sql`
    SELECT dc.content, d.name
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.user_id = ${userId}
    ORDER BY (embedding <=> ${embedding}::vector) ASC
    LIMIT ${limit}
  `);

  return results.rows as { content: string; name: string; document_id: number }[];
}
