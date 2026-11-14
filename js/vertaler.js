// Vertaler Nederlands ⇄ Zeeuws.
// Werkt in de browser én in Node (voor tests). Geen afhankelijkheden.
//
// Werkwijze per woord:
//  1. Woordenboek-opzoeking, langste woordgroep eerst (max. 5 woorden).
//     Woorden uit de gekozen streek gaan voor.
//  2. Grammatica (js/grammatica.js): vervoegingen, meervouden, verkleinwoorden
//     en buigingen worden herleid tot een woord uit het woordenboek en daarna
//     in de andere taal opnieuw opgebouwd ("liep" → lopen → loope → liep).
//     Het onderwerp (ik, jij, wij…) bepaalt welke persoonsvorm gekozen wordt.
//  3. Optioneel (alleen NL → Zeeuws): klankregels als benadering voor
//     woorden die (nog) niet in het woordenboek staan.

import {
  plat, nlStam, nlParadigma, nlVormenIndex, nlMeervoud, nlVerkleinwoord, nlBuiging, NL_MV_ONREGELMATIG,
  zwStam, zwParadigma, leesVervoeging, zwMeervoud, zwVerkleinwoord, zwBuiging, persoonUitContext,
} from './grammatica.js';

export const normaliseer = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").trim();

// Regels per regiogroep. Dit is een grove benadering van de klankverschuivingen.
const KLANKREGELS = {
  eilanden: [
    [/^ge(?=[a-z]{2,}(d|t|en)$)/, 'e'], // voltooid deelwoord: gewerkt → ewerkt
    [/^h(?=[aeiouy])/, ''],      // h-weglating: huis → uis
    [/ij/g, 'ie'],               // tijd → tied
    [/ui/g, 'uu'],               // huis → uus
    [/aa(?=[rtdl])/g, 'ae'],     // jaar → jaer, straat → straet
    [/([^aeiou])en$/, '$1e'],    // lopen → lope
  ],
  'zeeuws-vlaanderen': [
    [/^ge(?=[a-z]{2,}(d|t|en)$)/, 'e'], // voltooid deelwoord: gewerkt → ewerkt
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

  // ---------- Grammatica ----------
  isWerkwoord(w) { return /werkwoord/.test(w.soort ?? '') && !/verleden|deelwoord/.test(w.soort); }
  isNaamwoord(w) { return /naamwoord/.test(w.soort ?? '') && !/bijvoeglijk|voornaamwoord/.test(w.soort); }
  isBijvoeglijk(w) { return /bijvoeglijk/.test(w.soort ?? ''); }

  morfologie() {
    if (this._morf) return this._morf;
    // Nederlandse infinitieven van alle Zeeuwse werkwoorden
    const infs = new Set();
    const zwVormen = new Map(); // plat(Zeeuwse vorm) → [{ woord, tag, nlInf }]
    for (const w of this.woorden) {
      if (!this.isWerkwoord(w)) continue;
      const nlInf = w.nederlands.map((n) => n.split(',')[0].trim().toLowerCase()).find((n) => nlParadigma(n));
      if (!nlInf) continue;
      infs.add(nlInf);
      const zw = w.zeeuws.trim();
      if (/\s/.test(zw)) continue;
      const p = zwParadigma(zw, nlParadigma(nlInf), leesVervoeging(w.toelichting));
      for (const tag of ['ott2', 'ott3', 'inv2', 'ovtEv', 'ovtMv', 'vd', 'ott1']) {
        const k = plat(p[tag] ?? '');
        if (!k || k === plat(zw)) continue;
        if (!zwVormen.has(k)) zwVormen.set(k, []);
        const lijst = zwVormen.get(k);
        if (!lijst.some((x) => x.woord === w && x.tag === tag)) lijst.push({ woord: w, tag, nlInf, p });
      }
    }
    return (this._morf = { nlVormen: nlVormenIndex(infs), zwVormen });
  }

  // Beste woordenboekregel voor een grondvorm, eventueel beperkt tot een woordsoort
  zoekGrond(map, sleutel, filter = () => true) {
    return (map.get(sleutel) ?? []).find((k) => filter(k.woord));
  }

  /** Probeert een woord grammaticaal te herleiden. Geeft { tekst, woord, uitleg, score } of null. */
  herleid(token, vorige, volgende, richting, map) {
    const w = normaliseer(token);
    if (w.length < 2) return null;
    const persoon = persoonUitContext(vorige, volgende);
    const meervoudOnderwerp = /^(wij|we|me|wulder|wudder|ons|oans|jullie|julder|gulder|zij|ze|zulder|ulder|hulder)$/.test(plat(vorige ?? ''));
    const { nlVormen, zwVormen } = this.morfologie();
    const res = (tekst, k, uitleg) => ({ tekst, woord: k.woord, uitleg, score: k.score });

    if (richting === 'nl-zeeuws') {
      // 1. Werkwoordsvormen: liep, loopt, kijk, gekeken …
      for (const { inf, vorm } of nlVormen.get(w) ?? []) {
        const k = this.zoekGrond(map, inf, (x) => this.isWerkwoord(x));
        if (!k) continue;
        const zp = zwParadigma(k.woord.zeeuws.trim(), nlParadigma(inf), leesVervoeging(k.woord.toelichting));
        let tag = vorm;
        if (vorm === 'ott1') tag = persoon === 1 ? 'ott1' : 'inv2';
        if (vorm === 'ott2' || vorm === 'ott3') tag = persoon === 'inv2' ? 'inv2' : 'ott3';
        const NAAM = { ott1: 'ik-vorm', inv2: 'stam', ott3: 'tegenwoordige tijd', ovtEv: 'verleden tijd', ovtMv: 'verleden tijd meervoud', vd: 'voltooid deelwoord' };
        return res(zp[tag], k, `${NAAM[tag]} van ${k.woord.zeeuws} (${inf})`);
      }
      // 2. Verkleinwoord: huisje, boompje, mannetje (ook meervoud: huisjes)
      const dim = w.replace(/s$/, '').match(/^(.+?)(etje|tje|pje|je)$/);
      if (dim) {
        const basis = dim[2] === 'etje' && /(.)\1$/.test(dim[1]) ? dim[1].slice(0, -1) : dim[1];
        const k = this.zoekGrond(map, basis, (x) => this.isNaamwoord(x));
        if (k) {
          const v = zwVerkleinwoord(k.woord.zeeuws.trim());
          return res(w.endsWith('s') ? v + 's' : v, k, `verkleinwoord van ${k.woord.zeeuws}`);
        }
      }
      // 3. Meervoud: huizen, boten, tafels, kinderen
      const onr = Object.entries(NL_MV_ONREGELMATIG).find(([, mv]) => mv === w)?.[0];
      for (const ev of [onr, /en$/.test(w) && nlStam(w), /en$/.test(w) && w.slice(0, -2), /'?s$/.test(w) && w.replace(/'?s$/, '')]) {
        if (!ev || ev.length < 2) continue;
        const k = this.zoekGrond(map, ev, (x) => this.isNaamwoord(x));
        if (k && nlMeervoud(ev) === w) return res(zwMeervoud(k.woord.zeeuws.trim()), k, `meervoud van ${k.woord.zeeuws}`);
      }
      // 4. Verbogen bijvoeglijk naamwoord: grote, mooie, dikke
      if (/e$/.test(w)) {
        for (const basis of [nlStam(w), w.slice(0, -1)]) {
          const k = this.zoekGrond(map, basis, (x) => this.isBijvoeglijk(x));
          if (k && nlBuiging(basis) === w) return res(zwBuiging(k.woord.zeeuws.trim()), k, `verbogen vorm van ${k.woord.zeeuws}`);
        }
      }
      return null;
    }

    // Zeeuws → Nederlands
    const p = plat(token);
    // 1. Werkwoordsvormen: kiekt, ekeeke, weunde …
    for (const { woord, tag, nlInf } of zwVormen.get(p) ?? []) {
      const nl = nlParadigma(nlInf);
      let vorm = tag;
      if (tag === 'inv2' || tag === 'ott1') vorm = 'ott1';
      if (tag === 'ott2' || tag === 'ott3') vorm = persoon === 2 || persoon === 'inv2' ? 'ott2' : 'ott3';
      if (tag === 'ovtEv' || tag === 'ovtMv') vorm = meervoudOnderwerp ? 'ovtMv' : 'ovtEv';
      const k = (map.get(normaliseer(woord.zeeuws)) ?? []).find((x) => x.woord === woord) ?? { woord, score: 1 };
      return res(nl[vorm], k, `vorm van ${woord.zeeuws} (${nlInf})`);
    }
    // 2. Verkleinwoord
    const dim = p.replace(/s$/, '').match(/^(.+?)(tje|pje|je)$/);
    if (dim) {
      const k = this.zoekGrond(map, dim[1], (x) => this.isNaamwoord(x));
      if (k) { const v = nlVerkleinwoord(k.doel); return res(p.endsWith('s') ? v + 's' : v, k, `verkleinwoord van ${k.woord.zeeuws}`); }
    }
    // 3. Meervoud (-s, -en, -zen → -s)
    for (const ev of [/'?s$/.test(p) && p.replace(/'?s$/, ''), /zen$/.test(p) && p.slice(0, -3) + 's', /en$/.test(p) && p.slice(0, -2), /e$/.test(p) && p.slice(0, -1)]) {
      if (!ev || ev.length < 2) continue;
      const k = this.zoekGrond(map, ev, (x) => this.isNaamwoord(x));
      if (k) return res(nlMeervoud(k.doel), k, `meervoud van ${k.woord.zeeuws}`);
    }
    // 4. Bijvoeglijk naamwoord met -e
    if (/e$/.test(p)) {
      const k = this.zoekGrond(map, p.slice(0, -1), (x) => this.isBijvoeglijk(x));
      if (k) return res(nlBuiging(k.doel), k, `verbogen vorm van ${k.woord.zeeuws}`);
    }
    return null;
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
   *  type: 'spatie' | 'woordenboek' | 'afgeleid' | 'andere-regio' | 'regel' | 'onbekend' | 'ongewijzigd'
   */
  vertaal(tekst, { richting = 'nl-zeeuws', regio = 'algemeen', regels = true } = {}) {
    const { map, maxLen } = this.index(richting, regio);
    // Woorden mogen apostrof bevatten ('k, da's), maar geen andere leestekens.
    const tokens = tekst.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*|['’][\p{L}]+|\s+|[^\s\p{L}\p{N}]/gu) ?? [];
    const uit = [];
    const isWoord = (x) => /[\p{L}\p{N}]/u.test(x ?? '');
    // Vorige/volgende woord binnen dezelfde zin (leestekens breken de context af)
    const buur = (i, stap) => {
      for (let j = i + stap; j >= 0 && j < tokens.length; j += stap) {
        if (isWoord(tokens[j])) return tokens[j];
        if (!/^\s+$/.test(tokens[j])) return null;
      }
      return null;
    };
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
      const vorige = buur(i, -1), volgende = buur(i, 1);
      // Een woord uit een andere streek: eerst kijken of de grammatica iets uit de eigen streek vindt
      // Ook bij "ik kijk": het woordenboek kent "kijk", maar na ik hoort de ik-vorm (kieke).
      const ikVorm = richting === 'nl-zeeuws' && gevonden?.eind === i + 1 && persoonUitContext(vorige, volgende) === 1 &&
        this.morfologie().nlVormen.get(normaliseer(t))?.some((x) => x.vorm === 'ott1');
      const afgeleid = (!gevonden || gevonden.hit.score < 1 || ikVorm) ? this.herleid(t, vorige, volgende, richting, map) : null;
      if (afgeleid && (!gevonden || afgeleid.score >= 1 || ikVorm)) {
        uit.push({ tekst: pasCaseToe(t, afgeleid.tekst), type: 'afgeleid', bron: t, woord: afgeleid.woord, uitleg: afgeleid.uitleg });
        i++;
        continue;
      }
      if (gevonden) {
        const { hit, kandidaten } = gevonden;
        let doel = hit.doel;
        // Zeeuwse infinitief na 'k is de ik-vorm: "'k kieke" → "ik kijk"
        if (richting === 'zeeuws-nl' && gevonden.eind === i + 1 && this.isWerkwoord(hit.woord) && persoonUitContext(vorige, null) === 1) {
          const p = nlParadigma(doel.toLowerCase());
          if (p && p.inf === doel.toLowerCase()) doel = p.ott1;
        }
        uit.push({
          tekst: pasCaseToe(gevonden.bron, doel),
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
