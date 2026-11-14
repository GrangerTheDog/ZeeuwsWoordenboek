import { readFileSync, writeFileSync } from 'node:fs';

const pad = (p) => new URL(`../data/${p}`, import.meta.url);
export const leesJson = (p) => JSON.parse(readFileSync(pad(p), 'utf8'));
export const schrijfWoorden = (woorden) => writeFileSync(pad('woorden.json'), JSON.stringify(woorden, null, 1) + '\n');

export const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'woord';

export function uniekId(basis, bestaand) {
  let id = slug(basis), n = 2;
  while (bestaand.has(id)) id = `${slug(basis)}-${n++}`;
  return id;
}

/** Controleert de woordenlijst. Geeft een lijst foutmeldingen terug. */
export function valideer(woorden, regios, plaatsen) {
  const fouten = [];
  const regioIds = new Set(regios.map((r) => r.id));
  const plaatsNamen = new Set(plaatsen.map((p) => p.naam));
  const ids = new Set();
  woorden.forEach((w, i) => {
    const waar = `#${i} (${w.id ?? '?'})`;
    if (typeof w.id !== 'string' || !/^[a-z0-9-]+$/.test(w.id)) fouten.push(`${waar}: ongeldige id`);
    if (ids.has(w.id)) fouten.push(`${waar}: dubbele id`);
    ids.add(w.id);
    if (!w.zeeuws?.trim()) fouten.push(`${waar}: zeeuws ontbreekt`);
    if (!Array.isArray(w.nederlands) || !w.nederlands.length || w.nederlands.some((n) => !n?.trim())) fouten.push(`${waar}: nederlands ontbreekt`);
    if (!Array.isArray(w.regio)) fouten.push(`${waar}: regio moet een lijst zijn`);
    else for (const r of w.regio) if (!regioIds.has(r)) fouten.push(`${waar}: onbekende regio "${r}"`);
    if (!Array.isArray(w.plaatsen)) fouten.push(`${waar}: plaatsen moet een lijst zijn`);
    else for (const p of w.plaatsen) if (!plaatsNamen.has(p)) fouten.push(`${waar}: onbekende plaats "${p}" (voeg toe aan data/plaatsen.json)`);
    for (const veld of ['soort', 'voorbeeld', 'voorbeeldNl', 'toelichting', 'bron']) {
      if (w[veld] !== undefined && typeof w[veld] !== 'string') fouten.push(`${waar}: ${veld} moet tekst zijn`);
    }
  });
  return fouten;
}
