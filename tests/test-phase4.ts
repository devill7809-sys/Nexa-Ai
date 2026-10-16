import { tools } from '../src/lib/tools.ts';
import { orchestrate } from '../src/lib/agent.ts';
import ai from '../src/lib/gemini.ts';

async function runTests() {
  console.log('Running Phase 4 agent integration tests...');

  // 1. Tool Registry Test
  if (!tools.calculator || !tools.date_time) throw new Error('Tool registry missing tools');
  console.log('Tool registry: PASS');

  // 2. Calculator Tool Test
  const calcResult = await tools.calculator.handler({ expression: '2+2' }, 1);
  if (calcResult.result !== 4) throw new Error('Calculator failed');
  console.log('Calculator tool: PASS');

  // 3. Date Time Tool Test
  const dateResult = await tools.date_time.handler({}, 1);
  if (!dateResult.now) throw new Error('DateTime failed');
  console.log('DateTime tool: PASS');

  // 4. Basic Orchestration Test
  const result = await orchestrate(ai, 1, 1, [], 'What is the date today?');
  if (result.status !== 'complete') throw new Error('Orchestration failed');
  console.log('Basic Orchestration: PASS');

  console.log('All Phase 4 integration tests passed.');
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
