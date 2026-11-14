// Tests voor de vertaler: node scripts/test-vertaler.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Vertaler } from '../js/vertaler.js';

const lees = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const regios = lees('../data/regios.json');
const w = (zeeuws, nederlands, regio = ['algemeen']) => ({ id: zeeuws, zeeuws, nederlands, regio });
const testdata = [
  w("'k", ['ik']), w('bin', ['ben']), w('moeë', ['moe']), w('uus', ['huis']),
  w('gie', ['jij, je'], ['west-zeeuws-vlaanderen']), w('jie', ['jij'], ['walcheren']),
  w('petetten', ['aardappelen'], ['oost-zeeuws-vlaanderen']), w('aorpels', ['aardappelen'], ['walcheren']),
  w("wat 'n weer", ['wat een weer']), w('wit', ['weet']), w('nie', ['niet']),
  w('kot', ['huisje'], []), w('sebiet', ['straks'], ['west-zeeuws-vlaanderen']),
];
const v = new Vertaler(testdata, regios);
const t = (tekst, opties) => v.vertaalTekst(tekst, opties);

assert.equal(t('Ik ben moe.'), "'k Bin moeë.");
assert.equal(t('Jij', { regio: 'walcheren' }), 'Jie');
assert.equal(t('Jij', { regio: 'west-zeeuws-vlaanderen' }), 'Gie');
assert.equal(t('aardappelen', { regio: 'oost-zeeuws-vlaanderen' }), 'petetten');
assert.equal(t('aardappelen', { regio: 'walcheren' }), 'aorpels');
assert.equal(t('aardappelen', { regio: 'midden-zeeuws-vlaanderen' }), 'petetten'); // zelfde groep
assert.equal(v.vertaal('straks', { regio: 'tholen' })[0].type, 'andere-regio');
assert.equal(v.vertaal('huisje')[0].type, 'woordenboek');
assert.equal(t('wat een weer!'), "wat 'n weer!");
assert.equal(t('hond'), 'ond');                    // klankregel
assert.equal(t('hond', { regels: false }), 'hond');
assert.equal(t("'k Wit 't nie", { richting: 'zeeuws-nl' }), "Ik weet 't niet");
assert.equal(v.vertaal('blabla', { richting: 'zeeuws-nl' })[0].type, 'onbekend');

// Rooktest op het echte woordenboek
const echt = new Vertaler(lees('../data/woorden.json'), regios);
assert.ok(echt.vertaalTekst('lieveheersbeestje', { regio: 'schouwen-duiveland' }) === 'piepelepoentje');
assert.ok(echt.vertaalTekst('tuus', { richting: 'zeeuws-nl' }) === 'thuis');
console.log('Alle vertaaltests geslaagd ✔');
