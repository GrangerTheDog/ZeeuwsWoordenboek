// Zet een goedgekeurd "Nieuw woord"-issue om in een regel in data/woorden.json.
// Gebruik: ISSUE_BODY="..." ISSUE_NUMMER=12 node scripts/issue-naar-woord.mjs
import { appendFileSync } from 'node:fs';
import { leesJson, schrijfWoorden, uniekId, valideer } from './gedeeld.mjs';

const LABELS = {
  'Zeeuws woord of uitdrukking': 'zeeuws',
  'Nederlandse betekenis': 'nederlands',
  'Plaats waar het zo gezegd wordt': 'plaats',
  'Streek': 'regio',
  'Woordsoort': 'soort',
  'Voorbeeldzin in het Zeeuws': 'voorbeeld',
  'Vertaling van de voorbeeldzin': 'voorbeeld_nl',
  'Toelichting': 'toelichting',
};

export function leesIssue(body) {
  const velden = {};
  for (const deel of body.replace(/\r/g, '').split(/^### /m).slice(1)) {
    const [kop, ...rest] = deel.split('\n');
    const sleutel = LABELS[kop.trim()];
    const waarde = rest.join('\n').trim();
    if (sleutel && waarde && waarde !== '_No response_') velden[sleutel] = waarde;
  }
  return velden;
}

const plat = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export function maakWoord(velden, { woorden, regios, plaatsen, issue }) {
  if (!velden.zeeuws || !velden.nederlands) throw new Error('Zeeuws woord en Nederlandse betekenis zijn verplicht.');
  const plaatsInfo = velden.plaats
    ? plaatsen.find((p) => plat(p.naam) === plat(velden.plaats))
    : null;
  if (velden.plaats && !plaatsInfo) throw new Error(`Plaats "${velden.plaats}" is onbekend. Voeg hem toe aan data/plaatsen.json of pas het issue aan.`);
  const regio = new Set();
  if (plaatsInfo) regio.add(plaatsInfo.regio);
  if (velden.regio) {
    const r = regios.find((x) => plat(x.naam) === plat(velden.regio) || x.id === velden.regio.trim());
    if (!r) throw new Error(`Streek "${velden.regio}" is onbekend.`);
    regio.add(r.id);
  }
  return {
    id: uniekId(velden.zeeuws, new Set(woorden.map((w) => w.id))),
    zeeuws: velden.zeeuws.trim(),
    nederlands: velden.nederlands.split(';').map((s) => s.trim()).filter(Boolean),
    soort: velden.soort?.trim() ?? '',
    plaatsen: plaatsInfo ? [plaatsInfo.naam] : [],
    regio: [...regio],
    voorbeeld: velden.voorbeeld ?? '',
    voorbeeldNl: velden.voorbeeld_nl ?? '',
    toelichting: velden.toelichting ?? '',
    bron: issue ? `GitHub issue #${issue}` : 'GitHub',
    toegevoegd: new Date().toISOString().slice(0, 10),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const woorden = leesJson('woorden.json');
  const regios = leesJson('regios.json');
  const plaatsen = leesJson('plaatsen.json');
  const nieuw = maakWoord(leesIssue(process.env.ISSUE_BODY ?? ''), { woorden, regios, plaatsen, issue: process.env.ISSUE_NUMMER });
  woorden.push(nieuw);
  const fouten = valideer(woorden, regios, plaatsen);
  if (fouten.length) throw new Error(fouten.join('\n'));
  schrijfWoorden(woorden);
  console.log(`Toegevoegd: ${nieuw.zeeuws} → ${nieuw.nederlands.join('; ')} (${nieuw.id})`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `id=${nieuw.id}\nzeeuws=${nieuw.zeeuws.replace(/\n/g, ' ')}\n`);
}
