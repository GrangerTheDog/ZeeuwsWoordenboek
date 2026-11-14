// Controleert data/woorden.json: node scripts/valideer.mjs
import { leesJson, valideer } from './gedeeld.mjs';

const fouten = valideer(leesJson('woorden.json'), leesJson('regios.json'), leesJson('plaatsen.json'));
if (fouten.length) {
  console.error(`${fouten.length} fout(en):\n` + fouten.slice(0, 50).join('\n'));
  process.exit(1);
}
console.log('woorden.json is in orde ✔');
