import { setPendingCall, getPendingCall, deletePendingCall } from '../src/lib/session.ts';

async function runSecurityTests() {
  console.log('Running security audit...');

  // 1. Cross-user isolation test
  setPendingCall(1, 100, { name: 'document_search' });
  const pendingUser2 = getPendingCall(2, 100);
  if (pendingUser2) throw new Error('Cross-user confirmation bypass!');
  console.log('Cross-user isolation: PASS');

  // 2. Confirmation reuse/deletion
  setPendingCall(1, 101, { name: 'document_search' });
  deletePendingCall(1, 101);
  const pendingAfterDelete = getPendingCall(1, 101);
  if (pendingAfterDelete) throw new Error('Confirmation not deleted after use!');
  console.log('Confirmation reuse/deletion: PASS');

  console.log('All security tests passed.');
  process.exit(0);
}

runSecurityTests().catch(e => { console.error(e); process.exit(1); });
