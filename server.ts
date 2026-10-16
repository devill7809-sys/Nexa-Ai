import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { createConversation, getConversations, addMessage, getMessages } from './src/db/chat.ts';
import { addDocument, searchDocuments } from './src/lib/rag.ts';
import ai from './src/lib/gemini.ts';
import { orchestrate } from './src/lib/agent.ts';
import { tools } from './src/lib/tools.ts';
import { getPendingCall, deletePendingCall } from './src/lib/session.ts';

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

app.get('/api/conversations', requireAuth, async (req: AuthRequest, res) => {
  const user = await getOrCreateUser(req.user!.uid, req.user!.email!);
  const convs = await getConversations(user.id);
  res.json(convs);
});

app.post('/api/conversations', requireAuth, async (req: AuthRequest, res) => {
  const { title } = req.body;
  const user = await getOrCreateUser(req.user!.uid, req.user!.email!);
  const conv = await createConversation(user.id, title);
  res.json(conv[0]);
});

app.get('/api/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const msgs = await getMessages(parseInt(id));
  res.json(msgs);
});

app.post('/api/documents', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  const user = await getOrCreateUser(req.user!.uid, req.user!.email!);
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  let content = '';
  if (req.file.mimetype === 'application/pdf') {
    const data = await pdf(req.file.buffer);
    content = data.text;
  } else {
    content = req.file.buffer.toString();
  }
  
  await addDocument(user.id, req.file.originalname, content);
  res.json({ success: true });
});

app.post('/api/chat', requireAuth, async (req: AuthRequest, res) => {
  const { prompt, conversationId, agentMode } = req.body;
  const user = await getOrCreateUser(req.user!.uid, req.user!.email!);
  const msgs = await getMessages(conversationId);

  try {
    if (agentMode) {
        const result = await orchestrate(ai, user.id, conversationId, msgs, prompt);
        res.json(result);
    } else {
        const contextDocs = await searchDocuments(user.id, prompt);
        const context = contextDocs.map(d => `Source ID: ${d.document_id}, Filename: ${d.name}\nContent: ${d.content}`).join('\n\n');
        
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Context:\n${context}\n\nQuestion: ${prompt}\n\nPlease cite your sources using the Source ID provided. If the information is not in the context, say you do not know.`,
        });
        
        await addMessage(conversationId, 'user', prompt);
        await addMessage(conversationId, 'ai', response.text || '');
        
        res.json({ response: response.text });
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

app.post('/api/tool/confirm', requireAuth, async (req: AuthRequest, res) => {
  const { toolName, args, conversationId } = req.body;
  const user = await getOrCreateUser(req.user!.uid, req.user!.email!);
  
  const pending = getPendingCall(user.id, conversationId);
  if (!pending || pending.toolCall.name !== toolName) {
    return res.status(400).json({ error: 'No pending confirmation or invalid tool' });
  }
  
  const result = await tools[toolName].handler(args, user.id);
  deletePendingCall(user.id, conversationId);
  
  await addMessage(conversationId, 'ai', `Executed ${toolName}: ${JSON.stringify(result)}`);
  
  const msgs = await getMessages(conversationId);
  const finalResponse = await orchestrate(ai, user.id, conversationId, msgs, '');
  res.json(finalResponse);
});

import { sql } from 'drizzle-orm';
import { db } from './src/db/index.ts';

// ...

app.get('/health', async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('DB_FAIL');
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
