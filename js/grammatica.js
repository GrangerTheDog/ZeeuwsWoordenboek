// Grammatica voor de vertaler: vervoegingen, meervouden, verkleinwoorden en
// bijvoeglijke vormen, in beide richtingen. Geen afhankelijkheden.
//
// Uitgangspunt: het Zeeuws heeft (bijna) dezelfde zinsbouw als het Nederlands.
// Wat verschilt zijn vooral de woordvormen. Daarom:
//   1. Het Nederlandse woord wordt ontleed tot grondvorm + vorm
//      (bijv. "liep" = lopen + verleden tijd enkelvoud).
//   2. De grondvorm wordt in het woordenboek opgezocht (lopen → loope).
//   3. De Zeeuwse vorm wordt gemaakt met Zeeuwse regels
//      (verleden tijd, voltooid deelwoord met e- in plaats van ge-, 'k + -e, enz.)
// En omgekeerd voor Zeeuws → Nederlands.

export const plat = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").trim();

const KLINKERS = 'aeiouy';
const isKlinker = (c) => KLINKERS.includes(c);
const TKOFSCHIP = ['t', 'k', 'f', 's', 'ch', 'p', 'x', 'c'];

// ---------------------------------------------------------------------------
// Onregelmatige Nederlandse werkwoorden: [ovt enkelvoud, ovt meervoud, voltooid deelwoord]
// ---------------------------------------------------------------------------
const STERK = {
  bakken: ['bakte', 'bakten', 'gebakken'], beginnen: ['begon', 'begonnen', 'begonnen'], bederven: ['bedierf', 'bedierven', 'bedorven'],
  bergen: ['borg', 'borgen', 'geborgen'], bewegen: ['bewoog', 'bewogen', 'bewogen'], bidden: ['bad', 'baden', 'gebeden'],
  bieden: ['bood', 'boden', 'geboden'], bijten: ['beet', 'beten', 'gebeten'], binden: ['bond', 'bonden', 'gebonden'],
  blazen: ['blies', 'bliezen', 'geblazen'], blijken: ['bleek', 'bleken', 'gebleken'], blijven: ['bleef', 'bleven', 'gebleven'],
  breken: ['brak', 'braken', 'gebroken'], brengen: ['bracht', 'brachten', 'gebracht'], buigen: ['boog', 'bogen', 'gebogen'],
  denken: ['dacht', 'dachten', 'gedacht'], doen: ['deed', 'deden', 'gedaan'], dragen: ['droeg', 'droegen', 'gedragen'],
  drijven: ['dreef', 'dreven', 'gedreven'], dringen: ['drong', 'drongen', 'gedrongen'], drinken: ['dronk', 'dronken', 'gedronken'],
  eten: ['at', 'aten', 'gegeten'], gaan: ['ging', 'gingen', 'gegaan'], gelden: ['gold', 'golden', 'gegolden'],
  genieten: ['genoot', 'genoten', 'genoten'], geven: ['gaf', 'gaven', 'gegeven'], gieten: ['goot', 'goten', 'gegoten'],
  glijden: ['gleed', 'gleden', 'gegleden'], graven: ['groef', 'groeven', 'gegraven'], grijpen: ['greep', 'grepen', 'gegrepen'],
  hangen: ['hing', 'hingen', 'gehangen'], hebben: ['had', 'hadden', 'gehad'], heffen: ['hief', 'hieven', 'geheven'],
  helpen: ['hielp', 'hielpen', 'geholpen'], heten: ['heette', 'heetten', 'geheten'], houden: ['hield', 'hielden', 'gehouden'],
  kiezen: ['koos', 'kozen', 'gekozen'], kijken: ['keek', 'keken', 'gekeken'], klimmen: ['klom', 'klommen', 'geklommen'],
  klinken: ['klonk', 'klonken', 'geklonken'], komen: ['kwam', 'kwamen', 'gekomen'], kopen: ['kocht', 'kochten', 'gekocht'],
  krijgen: ['kreeg', 'kregen', 'gekregen'], kruipen: ['kroop', 'kropen', 'gekropen'], kunnen: ['kon', 'konden', 'gekund'],
  lachen: ['lachte', 'lachten', 'gelachen'], laden: ['laadde', 'laadden', 'geladen'], laten: ['liet', 'lieten', 'gelaten'],
  lezen: ['las', 'lazen', 'gelezen'], liegen: ['loog', 'logen', 'gelogen'], liggen: ['lag', 'lagen', 'gelegen'],
  lijken: ['leek', 'leken', 'geleken'], lopen: ['liep', 'liepen', 'gelopen'], meten: ['mat', 'maten', 'gemeten'],
  mogen: ['mocht', 'mochten', 'gemogen'], moeten: ['moest', 'moesten', 'gemoeten'], nemen: ['nam', 'namen', 'genomen'],
  prijzen: ['prees', 'prezen', 'geprezen'], raden: ['raadde', 'raadden', 'geraden'], rijden: ['reed', 'reden', 'gereden'],
  rijzen: ['rees', 'rezen', 'gerezen'], roepen: ['riep', 'riepen', 'geroepen'], ruiken: ['rook', 'roken', 'geroken'],
  scheiden: ['scheidde', 'scheidden', 'gescheiden'], schelden: ['schold', 'scholden', 'gescholden'], schenken: ['schonk', 'schonken', 'geschonken'],
  scheppen: ['schiep', 'schiepen', 'geschapen'], scheren: ['schoor', 'schoren', 'geschoren'], schieten: ['schoot', 'schoten', 'geschoten'],
  schijnen: ['scheen', 'schenen', 'geschenen'], schrijven: ['schreef', 'schreven', 'geschreven'], schrikken: ['schrok', 'schrokken', 'geschrokken'],
  schuiven: ['schoof', 'schoven', 'geschoven'], slaan: ['sloeg', 'sloegen', 'geslagen'], slapen: ['sliep', 'sliepen', 'geslapen'],
  sluiten: ['sloot', 'sloten', 'gesloten'], smijten: ['smeet', 'smeten', 'gesmeten'], snijden: ['sneed', 'sneden', 'gesneden'],
  spreken: ['sprak', 'spraken', 'gesproken'], springen: ['sprong', 'sprongen', 'gesprongen'], spugen: ['spuugde', 'spuugden', 'gespuugd'],
  staan: ['stond', 'stonden', 'gestaan'], steken: ['stak', 'staken', 'gestoken'], stelen: ['stal', 'stalen', 'gestolen'],
  sterven: ['stierf', 'stierven', 'gestorven'], stinken: ['stonk', 'stonken', 'gestonken'], stoten: ['stootte', 'stootten', 'gestoten'],
  strijken: ['streek', 'streken', 'gestreken'], trekken: ['trok', 'trokken', 'getrokken'], vallen: ['viel', 'vielen', 'gevallen'],
  vangen: ['ving', 'vingen', 'gevangen'], varen: ['voer', 'voeren', 'gevaren'], vechten: ['vocht', 'vochten', 'gevochten'],
  verbieden: ['verbood', 'verboden', 'verboden'], vergeten: ['vergat', 'vergaten', 'vergeten'], verliezen: ['verloor', 'verloren', 'verloren'],
  vinden: ['vond', 'vonden', 'gevonden'], vliegen: ['vloog', 'vlogen', 'gevlogen'], vragen: ['vroeg', 'vroegen', 'gevraagd'],
  vriezen: ['vroor', 'vroren', 'gevroren'], wassen: ['waste', 'wasten', 'gewassen'], wegen: ['woog', 'wogen', 'gewogen'],
  werpen: ['wierp', 'wierpen', 'geworpen'], weten: ['wist', 'wisten', 'geweten'], wijzen: ['wees', 'wezen', 'gewezen'],
  willen: ['wilde', 'wilden', 'gewild'], winnen: ['won', 'wonnen', 'gewonnen'], worden: ['werd', 'werden', 'geworden'],
  zeggen: ['zei', 'zeiden', 'gezegd'], zenden: ['zond', 'zonden', 'gezonden'], zien: ['zag', 'zagen', 'gezien'],
  zijn: ['was', 'waren', 'geweest'], zingen: ['zong', 'zongen', 'gezongen'], zinken: ['zonk', 'zonken', 'gezonken'],
  zitten: ['zat', 'zaten', 'gezeten'], zoeken: ['zocht', 'zochten', 'gezocht'], zuigen: ['zoog', 'zogen', 'gezogen'],
  zullen: ['zou', 'zouden', ''], zwemmen: ['zwom', 'zwommen', 'gezwommen'], zwijgen: ['zweeg', 'zwegen', 'gezwegen'],
};
// Onregelmatige tegenwoordige tijd: [ik, jij/u, hij]
const OTT_ONREGELMATIG = {
  komen: ['kom', 'komt', 'komt'],
  zijn: ['ben', 'bent', 'is'], hebben: ['heb', 'hebt', 'heeft'], kunnen: ['kan', 'kunt', 'kan'],
  willen: ['wil', 'wilt', 'wil'], zullen: ['zal', 'zult', 'zal'], mogen: ['mag', 'mag', 'mag'],
};
const ONSCHEIDBAAR = /^(be|ge|her|ont|ver|er)(?=[a-z]{3})/;
const SCHEIDBAAR = /^(op|af|aan|uit|in|mee|weg|terug|door|over|toe|na|voor|om|bij|neer|thuis|binnen|buiten)(?=[a-z]{4})/;

// ---------------------------------------------------------------------------
// Nederlands
// ---------------------------------------------------------------------------

/** Stam van een Nederlands woord dat op -en of -e eindigt: lopen → loop, huizen → huis, grote → groot. */
export function nlStam(woord) {
  let w = woord;
  if (/(aa|oe|ie|ee)n$/.test(w)) return w.slice(0, -1).replace(/aa$/, 'a'); // gaan → ga, doen → doe, zien → zie
  if (/[^e]en$/.test(w)) w = w.slice(0, -2);
  else if (/e$/.test(w)) w = w.slice(0, -1);
  return eindStam(w);
}

// Spellingregels voor het einde van een stam
function eindStam(w) {
  // dubbele medeklinker → enkel (zeggen → zeg, kennen → ken)
  if (w.length > 2 && w.at(-1) === w.at(-2) && !isKlinker(w.at(-1))) return devoice(w.slice(0, -1));
  // medeklinker + enkele klinker + medeklinker: open lettergreep → klinker verdubbelen (lop → loop, maak, leef)
  const m = w.match(/^(.*[^aeiouy])([aeou])([^aeiouyj])$/);
  if (m) {
    const meerLettergrepen = /[aeiouy]/.test(m[1]);
    const toonloos = m[2] === 'e' && meerLettergrepen; // wandel, luister, open
    if (!toonloos) return devoice(m[1] + m[2] + m[2] + m[3]);
  }
  return devoice(w);
}
const devoice = (w) => w.replace(/z$/, 's').replace(/v$/, 'f');

/** Nederlandse stam bij een infinitief, plus de stam vóór verscherping (voor 't kofschip). */
function nlWerkwoordStam(inf) {
  const kaal = /(aa|oe|ie|ee)n$/.test(inf) ? inf.slice(0, -1) : /[^e]en$/.test(inf) ? inf.slice(0, -2) : inf.replace(/n$/, '');
  return { stam: nlStam(inf), kaal };
}

const isTKofschip = (kaal) => TKOFSCHIP.some((c) => kaal.endsWith(c));

/** Alle vormen van een Nederlands werkwoord. */
export function nlParadigma(inf) {
  inf = inf.trim().toLowerCase();
  if (!/^[a-z]+$/.test(inf) || !/(en|aan|oen|ien|ijn|ern|eln)$/.test(inf)) return null;
  const { stam, kaal } = nlWerkwoordStam(inf);
  const t = (s) => (s.endsWith('t') ? s : /(^|[^aeiou])[aou]$/.test(s) ? s + s.at(-1) + 't' : s + 't');
  let st = STERK[inf];
  const sch = inf.match(SCHEIDBAAR);
  if (!st && sch && STERK[inf.slice(sch[1].length)]) {
    const [e, m, d] = STERK[inf.slice(sch[1].length)];
    st = [e, m, d ? sch[1] + d : ''];
  }
  let ovtEv, ovtMv, vd;
  if (st) [ovtEv, ovtMv, vd] = st;
  else {
    const suf = isTKofschip(kaal) ? 'te' : 'de';
    ovtEv = stam + suf; ovtMv = stam + suf + 'n';
    const eind = isTKofschip(kaal) ? 't' : 'd';
    const deel = stam.endsWith(eind) || (eind === 'd' && stam.endsWith('t')) ? stam : stam + eind;
    const sch = inf.match(SCHEIDBAAR);
    vd = ONSCHEIDBAAR.test(inf) ? deel : sch ? sch[1] + 'ge' + deel.slice(sch[1].length) : 'ge' + deel;
  }
  let onr = OTT_ONREGELMATIG[inf];
  if (!onr && sch && OTT_ONREGELMATIG[inf.slice(sch[1].length)] && inf.slice(sch[1].length) === 'komen') {
    onr = OTT_ONREGELMATIG.komen.map((x) => sch[1] + x);
  }
  return {
    inf,
    ott1: onr?.[0] ?? stam,
    ott2: onr?.[1] ?? t(stam),
    ott3: onr?.[2] ?? t(stam),
    ottMv: inf,
    ovtEv, ovtMv, vd,
    stam,
  };
}

// Index: Nederlandse werkwoordsvorm → [{ inf, vorm }]
export function nlVormenIndex(infinitieven) {
  const idx = new Map();
  const voeg = (vorm, inf, tag) => {
    if (!vorm) return;
    if (!idx.has(vorm)) idx.set(vorm, []);
    if (!idx.get(vorm).some((x) => x.inf === inf && x.vorm === tag)) idx.get(vorm).push({ inf, vorm: tag });
  };
  for (const inf of infinitieven) {
    const p = nlParadigma(inf);
    if (!p) continue;
    voeg(p.ott1, inf, 'ott1'); voeg(p.ott2, inf, 'ott2'); voeg(p.ott3, inf, 'ott3');
    voeg(p.ovtEv, inf, 'ovtEv'); voeg(p.ovtMv, inf, 'ovtMv'); voeg(p.vd, inf, 'vd');
  }
  return idx;
}

// Onregelmatige meervouden (korte klinker die toch lang wordt, of -eren)
export const NL_MV_ONREGELMATIG = {
  dag: 'dagen', weg: 'wegen', glas: 'glazen', schip: 'schepen', stad: 'steden', gat: 'gaten', slot: 'sloten',
  bad: 'baden', blad: 'bladeren', god: 'goden', lid: 'leden', spel: 'spellen', dak: 'daken', pad: 'paden',
  vat: 'vaten', kind: 'kinderen', ei: 'eieren', kalf: 'kalveren', lam: 'lammeren', rund: 'runderen', koe: 'koeien',
  hol: 'holen', oorlog: 'oorlogen', bevel: 'bevelen', gebed: 'gebeden', hertog: 'hertogen', smid: 'smeden',
  knie: 'knieën', zee: 'zeeën', idee: 'ideeën', fee: 'feeën', vlo: 'vlooien',
};

/** Meervoud van een Nederlands zelfstandig naamwoord. */
export function nlMeervoud(ev) {
  if (NL_MV_ONREGELMATIG[ev]) return NL_MV_ONREGELMATIG[ev];
  if (/[aoiuy]$/.test(ev) && !/(ie|oe|ij|ui|ou|au|eu|ei)$/.test(ev)) return ev + "'s";
  if (/([^aeiou](e|el|er|em|en|je)|ie|é)$/.test(ev)) return ev + 's';
  // lange klinker in gesloten lettergreep → enkel (boot → boten), korte → medeklinker verdubbelen (kat → katten)
  let m = ev.match(/^(.*[^aeiou])(aa|ee|oo|uu)([^aeiouy])$/);
  if (m) return m[1] + m[2][0] + voiced(m[3]) + 'en';
  m = ev.match(/^(.*?[^aeiou]?)([aeiou])([bdfgklmnprst])$/);
  if (m && !/(ij|ui|ei|ou|au|oe|ie|eu)[a-z]$/.test(ev)) return ev + m[3] + 'en';
  return ev.replace(/s$/, 'z').replace(/f$/, 'v') + 'en';
}
const voiced = (c) => (c === 's' ? 'z' : c === 'f' ? 'v' : c);

/** Verkleinwoord: huis → huisje, boom → boompje, ma → maatje. */
export function nlVerkleinwoord(w) {
  if (/[aeiouy]$/.test(w)) return w + 'tje';
  if (/(aa|ee|oo|uu|ie|oe|ij|ei|ui|ou|au|eu)[lnrw]$/.test(w) || /[aeiou][lnr]$/.test(w) && /(aa|ee|oo|uu)/.test(w)) return w + 'tje';
  if (/[^aeiou]e[lrn]$/.test(w) && /[aeiou].*[^aeiou]e[lrn]$/.test(w)) return w + 'tje'; // tafeltje
  if (/[lrn]$/.test(w) && /(^|[^aeiou])[aeiou][lrn]$/.test(w)) return w + w.at(-1) + 'etje';
  if (/m$/.test(w)) return w + 'pje';
  return w + 'je';
}

// ---------------------------------------------------------------------------
// Zeeuws
// ---------------------------------------------------------------------------

/** Zeeuwse stam: kieke → kiek, loope → loop, gaon → gao, doeë → doe. */
export function zwStam(inf) {
  let w = inf.trim();
  if (/ë$/.test(w)) return w.slice(0, -1);
  if (/[^aeiouyêôâûîèé]e$/i.test(w)) {
    w = w.slice(0, -1);
    if (w.length > 2 && w.at(-1) === w.at(-2)) w = w.slice(0, -1); // zegge → zeg
    return w.replace(/v$/, 'f').replace(/z$/, 's');
  }
  if (/[aeiouêôâ]n$/.test(w)) return w.slice(0, -1); // gaon → gao
  return w;
}

/** Zeeuwse vormen van een werkwoord, op basis van de Zeeuwse infinitief en het Nederlandse paradigma. */
export function zwParadigma(zwInf, nl, expliciet = {}) {
  const stam = zwStam(zwInf);
  const kaal = zwInf.replace(/e$/, '');
  const t = stam.endsWith('t') ? stam : stam + 't';
  const zwak = !nl || !STERK[nl.inf];
  // Verleden tijd: zwak → stam + te/de; sterk → Nederlandse vorm met Zeeuwse klanken.
  const suf = isTKofschip(plat(kaal)) ? 'te' : 'de';
  const ovt = zwak ? stam + suf : klankZw(nl.ovtEv);
  const ovtMv = zwak ? stam + suf : klankZw(nl.ovtMv).replace(/([^aeiou])en$/, '$1e');
  // Voltooid deelwoord: e- in plaats van ge-
  let vd;
  if (zwak) {
    const eind = isTKofschip(plat(kaal)) ? 't' : 'd';
    const deel = /[td]$/.test(stam) ? stam : stam + eind;
    vd = nl && ONSCHEIDBAAR.test(nl.inf) ? deel : 'e' + deel;
  } else {
    vd = klankZw(nl.vd).replace(/^ge/, 'e').replace(/([^aeiou])en$/, '$1e');
  }
  return {
    inf: zwInf, ott1: zwInf, ott2: t, ott3: t, ottMv: zwInf, inv2: stam,
    ovtEv: ovt, ovtMv, vd, ...expliciet,
  };
}

// Zeeuwse klankregels, gebruikt om sterke vormen te benaderen (liep → liep, ging → gieng niet: dat moet uit het woordenboek).
function klankZw(w) {
  return w.replace(/^h(?=[aeiou])/, '').replace(/ij/g, 'ie').replace(/ui/g, 'uu');
}

/** Haalt expliciete vervoegingen uit een toelichting zoals "Vervoeging / 'k sleê / jie slìt / … / Verledentijd / sloege / Voltooid deelwoord / esloge". */
export function leesVervoeging(toelichting = '') {
  if (!/vervoeging|deelwoord|verleden ?tijd/i.test(toelichting)) return {};
  const regels = toelichting.split(/\n|\//).map((r) => r.trim()).filter(Boolean);
  const uit = {};
  for (let i = 0; i < regels.length; i++) {
    const r = regels[i];
    let m;
    if ((m = r.match(/^(?:'k|ik)\s+(\S+)$/i))) uit.ott1 = m[1];
    else if ((m = r.match(/^(?:jie|je|gie|ge)\s+(\S+)$/i))) uit.ott2 = m[1];
    else if ((m = r.match(/^(?:ie|'ie|hij|um|zie|ze)\s+(\S+)$/i))) uit.ott3 = m[1];
    else if ((m = r.match(/^(?:me|we|wulder|wudr|ons|oans|me\/oans|julder|gulder|ulder|zulder)\s+(\S+)$/i))) uit.ottMv = m[1];
    else if (/voltooid deelwoord/i.test(r)) {
      const v = r.split(':')[1]?.trim() || regels[i + 1];
      if (v) uit.vd = v.replace(/[()]/g, '');
    } else if (/verleden ?tijd|o\.?v\.?t/i.test(r)) {
      const v = (r.split(':')[1]?.trim() || regels[i + 1] || '').replace(/^(ik|'k)\s+/, '');
      if (v && !/deelwoord/i.test(v)) uit.ovtEv = uit.ovtMv = v;
    }
  }
  return uit;
}

/** Zeeuws meervoud (benadering): uus → uuzen, kerke → kerkes. */
export function zwMeervoud(ev) {
  if (/(e|el|er|em|en|je|ie)$/.test(ev)) return ev + 's';
  if (/[aeiouêôë]$/.test(ev)) return ev + "'s";
  if (/(uu|ie|ee|oo|aa|ae|oa|ao|eê|oô)s$/.test(ev)) return ev.slice(0, -1) + 'zen';
  return ev + 'en';
}
/** Zeeuws verkleinwoord (benadering): uus → uusje, boôm → boômpje. */
export function zwVerkleinwoord(w) {
  if (/[aeiouyêôë]$/.test(w)) return w + 'tje';
  if (/m$/.test(w)) return w + 'pje';
  if (/[lnrw]$/.test(w)) return w + 'tje';
  return w + 'je';
}

// Bijvoeglijk naamwoord met -e
export const zwBuiging = (w) => (/e$|ë$/.test(w) ? w : w.replace(/([aeiou])\1([^aeiou])$/, '$1$2') + 'e');
export function nlBuiging(w) {
  if (/e$/.test(w)) return w;
  if (/(aa|ee|oo|uu)[^aeiouy]$/.test(w)) return w.replace(/([aeou])\1([^aeiouy])$/, (_, k, m) => k + voiced(m)) + 'e';
  if (/[^aeiou][aeiou][^aeiouywj]$/.test(w)) return w + w.at(-1) + 'e';
  return w.replace(/s$/, 'z').replace(/f$/, 'v') + 'e';
}

// Persoon van het onderwerp bepalen uit de omliggende woorden.
const PERS1 = new Set(['ik', "'k", 'k']);
const PERS2 = new Set(['jij', 'je', 'jie', 'gij', 'ge', 'gie', 'u']);
export function persoonUitContext(vorige, volgende) {
  const v = plat(vorige ?? ''), n = plat(volgende ?? '');
  if (PERS1.has(v) || PERS1.has(n)) return 1;
  if (PERS2.has(n)) return 'inv2'; // inversie: "loop je", "kiek je"
  if (PERS2.has(v)) return 2;
  return null;
}
