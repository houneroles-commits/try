/**
 * Simulate a full phone conversation against a running voice server —
 * no phone, no Africa's Talking account needed.
 *
 *   node voice/index.js        (terminal 1)
 *   node voice/simulate.js     (terminal 2)
 */
const BASE = process.env.VOICE_BASE ?? 'http://localhost:8791';

const turns = [
  { lang: 'en', text: 'When should I water my maize?' },
  { lang: 'en', text: 'And what about pests eating the leaves?' },
  { lang: 'zu', text: 'Ngitshale nini ummbila?' },
];

for (const turn of turns) {
  const res = await fetch(`${BASE}/voice/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...turn, sessionId: 'sim-conversation' }),
  });
  const json = await res.json();
  console.log(`\n[${turn.lang}] CALLER: ${turn.text}`);
  console.log(`     LIMA (${json.providers.ai}): ${json.answer}`);
}
console.log('\nSimulation complete.');
