import { createConversation, getConversations, addMessage } from '../src/db/chat.ts';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('Running backend integration tests...');

  // Setup test user
  const user = await db.insert(users).values({ uid: 'test-user', email: 'test@example.com' }).onConflictDoNothing().returning();
  const userId = user[0]?.id || (await db.select().from(users).where(eq(users.uid, 'test-user')))[0].id;

  // Test Conversation Persistence
  const conv = await createConversation(userId, 'Test Conv');
  if (!conv[0].id) throw new Error('Conversation persistence failed');
  console.log('Conversation persistence: PASS');

  const convs = await getConversations(userId);
  if (convs.length === 0) throw new Error('Conversation retrieval failed');
  console.log('Conversation retrieval: PASS');

  // Test Message Persistence
  await addMessage(conv[0].id, 'user', 'Hello');
  console.log('Message persistence: PASS');

  console.log('All backend integration tests passed.');
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
