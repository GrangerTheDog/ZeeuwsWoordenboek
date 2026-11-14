// Tests voor de Nederlandse en Zeeuwse woordvormen: node scripts/test-grammatica.mjs
import assert from 'node:assert/strict';
import { nlParadigma, nlStam, nlMeervoud, nlVerkleinwoord, nlBuiging, zwStam, zwParadigma, leesVervoeging } from '../js/grammatica.js';

const p = (inf) => nlParadigma(inf);
assert.deepEqual([p('lopen').ott1, p('lopen').ott3, p('lopen').ovtEv, p('lopen').vd], ['loop', 'loopt', 'liep', 'gelopen']);
assert.deepEqual([p('maken').ott1, p('maken').ovtEv, p('maken').vd], ['maak', 'maakte', 'gemaakt']);
assert.deepEqual([p('wonen').ovtMv, p('wonen').vd], ['woonden', 'gewoond']);
assert.deepEqual([p('gaan').ott1, p('gaan').ott3], ['ga', 'gaat']);
assert.deepEqual([p('zijn').ott1, p('zijn').ott3, p('hebben').ott3], ['ben', 'is', 'heeft']);
assert.equal(p('wandelen').ott1, 'wandel');
assert.equal(p('leven').ott1, 'leef');
assert.equal(p('zeggen').ott1, 'zeg');
assert.equal(p('opruimen').vd, 'opgeruimd');
assert.equal(p('betalen').vd, 'betaald');
assert.equal(p('fietsen').ovtEv, 'fietste');
assert.equal(p('praten').ott3, 'praat');
assert.equal(nlStam('huizen'), 'huis');
assert.equal(nlStam('grote'), 'groot');
assert.deepEqual(['huis', 'boot', 'kat', 'tafel', 'auto', 'dag', 'been'].map(nlMeervoud), ['huizen', 'boten', 'katten', 'tafels', "auto's", 'dagen', 'benen']);
assert.deepEqual(['huis', 'boom', 'man', 'tafel', 'auto'].map(nlVerkleinwoord), ['huisje', 'boompje', 'mannetje', 'tafeltje', 'autotje']);
assert.deepEqual(['groot', 'dik', 'mooi', 'lief'].map(nlBuiging), ['grote', 'dikke', 'mooie', 'lieve']);
assert.deepEqual(['kieke', 'loope', 'gaon', 'doeë', 'zegge'].map(zwStam), ['kiek', 'loop', 'gao', 'doe', 'zeg']);
const kieke = zwParadigma('kieke', p('kijken'));
assert.deepEqual([kieke.ott1, kieke.ott3, kieke.inv2], ['kieke', 'kiekt', 'kiek']);
assert.equal(zwParadigma('weune', p('wonen')).vd, 'eweund');
assert.deepEqual(leesVervoeging("Onbepaalde wijs: raeke\nO.v.t (meervoud) : rochte\nVoltooid deelwoord: erocht"), { ovtEv: 'rochte', ovtMv: 'rochte', vd: 'erocht' });
console.log('Woordvormtests geslaagd ✔');
