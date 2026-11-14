// Vertaler Nederlands ⇄ Zeeuws.
// Werkt in de browser én in Node (voor tests). Geen afhankelijkheden.
//
// Werkwijze:
//  1. Woordenboek-opzoeking, langste woordgroep eerst (max. 4 woorden).
//     Regiospecifieke woorden gaan voor "algemeen".
//  2. Optioneel (alleen NL → Zeeuws): klankregels als benadering voor
//     woorden die (nog) niet in het woordenboek staan.

export const normaliseer = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").trim();

// Regels per regiogroep. Dit is een grove benadering van de klankverschuivingen.
const KLANKREGELS = {
  eilanden: [
    [/^h(?=[aeiouy])/, ''],      // h-weglating: huis → uis
    [/ij/g, 'ie'],               // tijd → tied
    [/ui/g, 'uu'],               // huis → uus
    [/aa(?=[rtdl])/g, 'ae'],     // jaar → jaer, straat → straet
    [/([^aeiou])en$/, '$1e'],    // lopen → lope
  ],
  'zeeuws-vlaanderen': [
    [/^h(?=[aeiouy])/, ''],
    [/ij/g, 'ie'],
    [/ui/g, 'uu'],
    [/aa(?=[rtdln])/g, 'ao'],    // jaar → jaor
    [/([^aeiou])en$/, '$1e'],
  ],
};

function pasCaseToe(bron, doel) {
  if (/^['’]/.test(doel)) return doel; // 'k, 't: blijft klein, zoals gebruikelijk
  if (bron.length > 1 && bron === bron.toUpperCase() && /[A-Z]/.test(bron)) return doel.toUpperCase();
  const eerste = bron.match(/[A-Za-zÀ-ÿ]/);
  if (eerste && eerste[0] === eerste[0].toUpperCase()) {
    const i = doel.search(/[A-Za-zÀ-ÿ]/);
    return i < 0 ? doel : doel.slice(0, i) + doel[i].toUpperCase() + doel.slice(i + 1);
  }
  return doel;
}

const isHoofd = (s) => /^[^\p{L}]*\p{Lu}/u.test(s);
const hoofd = (s) => s.replace(/\p{L}/u, (c) => c.toUpperCase());
const klein = (s) => s.replace(/\p{L}/u, (c) => c.toLowerCase());

// "Ik weet" → "'k Wit" en "'k Wit" → "Ik weet": de hoofdletter schuift mee
// naar het eerste woord dat niet met een apostrof begint.
function corrigeerHoofdletters(segmenten) {
  const woorden = segmenten.filter((s) => s.type !== 'spatie');
  for (let i = 0; i < woorden.length - 1; i++) {
    const s = woorden[i], volgende = woorden[i + 1];
    const bronApo = /^['’]/.test(s.bron), doelApo = /^['’]/.test(s.tekst);
    if (!bronApo && doelApo && isHoofd(s.bron)) volgende.tekst = hoofd(volgende.tekst);
    if (bronApo && !doelApo && isHoofd(volgende.bron)) {
      s.tekst = hoofd(s.tekst);
      volgende.tekst = klein(volgende.tekst);
    }
  }
  return segmenten;
}

export class Vertaler {
  constructor(woorden, regios) {
    this.woorden = woorden;
    this.groepVan = Object.fromEntries(regios.map((r) => [r.id, r.groep]));
  }

  // Score: hoe goed past een woord bij de gekozen regio? (hoger = beter)
  score(woord, regio) {
    if (regio === 'alle') return 2;
    if (woord.regio.includes(regio)) return 4;
    if (woord.regio.includes('algemeen')) return 3;
    const groep = this.groepVan[regio];
    if (woord.regio.some((r) => this.groepVan[r] === groep)) return 2;
    if (!woord.regio.length) return 1; // herkomst onbekend
    return 0.5; // alleen bekend uit een andere streek
  }

  index(richting, regio) {
    const sleutel = `${richting}:${regio}`;
    this._cache ??= {};
    if (this._cache[sleutel]) return this._cache[sleutel];
    const map = new Map();
    for (const w of this.woorden) {
      const score = this.score(w, regio);
      const bronnen = richting === 'nl-zeeuws' ? w.nederlands.flatMap((n) => n.split(',')) : [w.zeeuws];
      const doel = richting === 'nl-zeeuws' ? w.zeeuws : w.nederlands[0].split(',')[0].trim();
      for (const b of bronnen) {
        const k = normaliseer(b.replace(/\([^)]*\)/g, ' ').replace(/[.!?…]+$/, '')).replace(/\s+/g, ' ');
        if (!k) continue;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({ doel, score, woord: w });
      }
    }
    let maxLen = 1;
    for (const [k, lijst] of map) {
      lijst.sort((x, y) => y.score - x.score);
      maxLen = Math.max(maxLen, k.split(' ').length);
    }
    return (this._cache[sleutel] = { map, maxLen: Math.min(maxLen, 5) });
  }

  klankregels(woord, regio) {
    const groep = this.groepVan[regio] === 'zeeuws-vlaanderen' ? 'zeeuws-vlaanderen' : 'eilanden';
    let w = woord.toLowerCase();
    if (w.length < 3) return null;
    for (const [re, vervang] of KLANKREGELS[groep]) w = w.replace(re, vervang);
    return w === woord.toLowerCase() ? null : w;
  }

  /**
   * Vertaal tekst. Geeft een lijst segmenten terug:
   *  { tekst, type, bron, woord, alternatieven }
   *  type: 'spatie' | 'woordenboek' | 'andere-regio' | 'regel' | 'onbekend' | 'ongewijzigd'
   */
  vertaal(tekst, { richting = 'nl-zeeuws', regio = 'algemeen', regels = true } = {}) {
    const { map, maxLen } = this.index(richting, regio);
    // Woorden mogen apostrof bevatten ('k, da's), maar geen andere leestekens.
    const tokens = tekst.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*|['’][\p{L}]+|\s+|[^\s\p{L}\p{N}]/gu) ?? [];
    const uit = [];
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (!/[\p{L}\p{N}]/u.test(t)) { uit.push({ tekst: t, type: 'spatie' }); i++; continue; }
      // Probeer langste woordgroep: tokens i, i+2, i+4 ... (spaties ertussen)
      let gevonden = null;
      for (let n = maxLen; n >= 1 && !gevonden; n--) {
        const delen = [];
        let j = i;
        for (let k = 0; k < n && j < tokens.length; k++) {
          if (k > 0) { if (!/^\s+$/.test(tokens[j] ?? '')) break; j++; }
          if (!/[\p{L}\p{N}]/u.test(tokens[j] ?? '')) break;
          delen.push(tokens[j]); j++;
        }
        if (delen.length !== n) continue;
        const kandidaten = map.get(normaliseer(delen.join(' ')));
        if (kandidaten) gevonden = { hit: kandidaten[0], kandidaten, eind: j, bron: tokens.slice(i, j).join('') };
      }
      if (gevonden) {
        const { hit, kandidaten } = gevonden;
        uit.push({
          tekst: pasCaseToe(gevonden.bron, hit.doel),
          type: hit.score >= 1 ? 'woordenboek' : 'andere-regio',
          bron: gevonden.bron,
          woord: hit.woord,
          alternatieven: [...new Map(kandidaten.slice(1).map((k) => [k.doel, k.woord])).entries()]
            .filter(([d]) => d !== hit.doel).slice(0, 6).map(([doel, woord]) => ({ doel, woord })),
        });
        i = gevonden.eind;
        continue;
      }
      const benadering = regels && richting === 'nl-zeeuws' ? this.klankregels(t, regio) : null;
      if (benadering) uit.push({ tekst: pasCaseToe(t, benadering), type: 'regel', bron: t });
      else uit.push({ tekst: t, type: richting === 'zeeuws-nl' ? 'onbekend' : 'ongewijzigd', bron: t });
      i++;
    }
    return corrigeerHoofdletters(uit);
  }

  vertaalTekst(tekst, opties) {
    return this.vertaal(tekst, opties).map((s) => s.tekst).join('');
  }
}
