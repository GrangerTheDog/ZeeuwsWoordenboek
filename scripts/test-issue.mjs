// Test het omzetten van een issue naar een woord: node scripts/test-issue.mjs
import assert from 'node:assert/strict';
import { leesIssue, maakWoord } from './issue-naar-woord.mjs';
import { leesJson } from './gedeeld.mjs';

const body = `### Zeeuws woord of uitdrukking

piepelepoentje

### Nederlandse betekenis

lieveheersbeestje; onzeker beestje

### Plaats waar het zo gezegd wordt

zierikzee

### Streek

_No response_

### Woordsoort

zelfstandig naamwoord

### Voorbeeldzin in het Zeeuws

_No response_

### Vertaling van de voorbeeldzin

_No response_

### Toelichting

Ook wel *pimpampoentje*.`;
const velden = leesIssue(body);
assert.equal(velden.zeeuws, 'piepelepoentje');
assert.equal(velden.regio, undefined);
const ctx = { woorden: leesJson('woorden.json'), regios: leesJson('regios.json'), plaatsen: leesJson('plaatsen.json'), issue: 7 };
const w = maakWoord(velden, ctx);
assert.deepEqual(w.nederlands, ['lieveheersbeestje', 'onzeker beestje']);
assert.deepEqual(w.plaatsen, ['Zierikzee']);
assert.deepEqual(w.regio, ['schouwen-duiveland']);
assert.match(w.id, /^piepelepoentje-\d+$/); // bestaat al, dus krijgt een volgnummer
assert.throws(() => maakWoord({ zeeuws: 'x', nederlands: 'y', plaats: 'Atlantis' }, ctx), /onbekend/);
console.log('Issue-tests geslaagd ✔');
