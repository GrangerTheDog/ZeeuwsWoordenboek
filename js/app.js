import { Vertaler, normaliseer } from './vertaler.js';
import { CONFIG, repoUrl, issueUrl } from './config.js';

const app = document.getElementById('app');
document.getElementById('repo-link').href = repoUrl();

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const ICOON = {
  zoek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  wissel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.8 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg>',
  kopie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
};

// ---------- Data ----------
const laad = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); });
let WOORDEN, REGIOS, PLAATSEN, VERTALER, PER_ID, REGIO_NAAM, SOORTEN;

async function init() {
  app.innerHTML = '<p class="leeg">Woordenboek laden…</p>';
  try {
    [WOORDEN, REGIOS, PLAATSEN] = await Promise.all([laad('data/woorden.json'), laad('data/regios.json'), laad('data/plaatsen.json')]);
  } catch (e) {
    app.innerHTML = `<p class="melding">Het woordenboek kon niet geladen worden (${esc(e.message)}). Open de site via een webserver, niet als los bestand.</p>`;
    return;
  }
  for (const w of WOORDEN) {
    w._z = normaliseer(w.zeeuws);
    w._n = w.nederlands.map(normaliseer);
  }
  PER_ID = new Map(WOORDEN.map((w) => [w.id, w]));
  REGIO_NAAM = Object.fromEntries(REGIOS.map((r) => [r.id, r.naam]));
  SOORTEN = [...new Set(WOORDEN.map((w) => w.soort).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
  VERTALER = new Vertaler(WOORDEN, REGIOS);
  window.addEventListener('hashchange', route);
  route();
}

// ---------- Zoeken ----------
function zoek(term, { regio = '', soort = '' } = {}) {
  const q = normaliseer(term);
  if (!q) return [];
  const grens = new RegExp(`(^|[^a-z])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const uit = [];
  for (const w of WOORDEN) {
    if (regio && !w.regio.includes(regio)) continue;
    if (soort && w.soort !== soort) continue;
    let rang = 9;
    for (const [veld, gewicht] of [[w._z, 0], ...w._n.map((n) => [n, 0.5])]) {
      let r = 9;
      if (veld === q) r = 0;
      else if (veld.startsWith(q)) r = 1;
      else if (grens.test(veld)) r = 2;
      else if (veld.includes(q)) r = 3;
      rang = Math.min(rang, r + gewicht);
    }
    if (rang < 9) uit.push([rang, w]);
  }
  return uit.sort((a, b) => a[0] - b[0] || a[1].zeeuws.length - b[1].zeeuws.length || a[1].zeeuws.localeCompare(b[1].zeeuws, 'nl')).map((x) => x[1]);
}

function markeer(tekst, term) {
  const q = normaliseer(term);
  if (!q) return esc(tekst);
  const plat = normaliseer(tekst);
  // normaliseer() kan de lengte niet veranderen behalve door trim; bij afwijking niet markeren
  if (plat.length !== tekst.trim().length) return esc(tekst);
  const i = plat.indexOf(q);
  if (i < 0) return esc(tekst);
  const t = tekst.trim();
  return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
}

const regioLabels = (w, link = true) =>
  w.regio.length
    ? w.regio.map((r) => (link ? `<a class="label" href="#/regio/${r}">${esc(REGIO_NAAM[r] ?? r)}</a>` : `<span class="label">${esc(REGIO_NAAM[r] ?? r)}</span>`)).join(' ')
    : '<span class="label">streek onbekend</span>';

function resultaatLijst(woorden, term = '', max = 60) {
  if (!woorden.length) return '';
  const items = woorden.slice(0, max).map((w) => `
    <li class="resultaat"><a href="#/woord/${enc(w.id)}">
      <span class="zw">${markeer(w.zeeuws, term)}</span>
      <span class="meta">${w.regio.length ? `<span class="label">${esc(REGIO_NAAM[w.regio[0]] ?? w.regio[0])}${w.regio.length > 1 ? ` +${w.regio.length - 1}` : ''}</span>` : ''}</span>
      <span class="nl">${w.nederlands.map((n) => markeer(n, term)).join('; ')}${w.soort ? ` <span class="klein">· ${esc(w.soort)}</span>` : ''}</span>
    </a></li>`).join('');
  return `<ul class="resultaten">${items}</ul>`;
}

function lijstMetMeer(container, woorden, term = '') {
  let max = 60;
  const teken = () => {
    container.innerHTML = resultaatLijst(woorden, term, max) +
      (woorden.length > max ? `<p><button class="knop licht" type="button" data-meer>Toon meer (${woorden.length - max} over)</button></p>` : '');
    container.querySelector('[data-meer]')?.addEventListener('click', () => { max += 120; teken(); });
  };
  teken();
}

// ---------- Pagina's ----------
function woordVanDeDag() {
  const kandidaten = WOORDEN.filter((w) => w.regio.length && w.zeeuws.length > 3 && !/\s/.test(w.zeeuws.trim()));
  const d = new Date();
  const dag = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return kandidaten[(dag * 2654435761) % kandidaten.length];
}

function paginaZoeken(term = '', filters = {}) {
  const wvdd = woordVanDeDag();
  const perRegio = REGIOS.map((r) => [r, WOORDEN.filter((w) => w.regio.includes(r.id)).length]).filter(([, n]) => n);
  app.innerHTML = `
    <section class="held">
      <h1>Zeeuws Woordenboek</h1>
      <p>Zoek op een Zeeuws of Nederlands woord. ${WOORDEN.length.toLocaleString('nl')} woorden uit alle streken van Zeeland, verzameld door Zeeuwen zelf.</p>
      <form class="zoekbalk" role="search" onsubmit="return false">
        ${ICOON.zoek}
        <label for="zoek" class="skip">Zoeken</label>
        <input id="zoek" type="search" placeholder="Bijv. huis, piepelepoentje, aardappel…" autocomplete="off" value="${esc(term)}" autofocus>
      </form>
      <div class="chips" role="group" aria-label="Filter op streek">
        <button class="chip" type="button" data-regio="" aria-pressed="${!filters.regio}">Alle streken</button>
        ${perRegio.map(([r]) => `<button class="chip" type="button" data-regio="${r.id}" aria-pressed="${filters.regio === r.id}">${esc(r.naam)}</button>`).join('')}
      </div>
    </section>
    <div id="resultaten"></div>
    <div id="start">
      <div class="raster-2">
        <section class="kaart">
          <p class="klein">Woord van de dag</p>
          <h2 style="font-size:2rem"><a href="#/woord/${enc(wvdd.id)}" style="text-decoration:none">${esc(wvdd.zeeuws)}</a></h2>
          <p class="vertaling">${esc(wvdd.nederlands.join('; '))}</p>
          <div class="labels">${regioLabels(wvdd)}${wvdd.soort ? `<span class="label">${esc(wvdd.soort)}</span>` : ''}</div>
        </section>
        <section class="kaart">
          <p class="stat">${WOORDEN.length.toLocaleString('nl')}</p>
          <p class="zacht">woorden en uitdrukkingen uit ${PLAATSEN.filter((p) => WOORDEN.some((w) => w.plaatsen.includes(p.naam))).length} plaatsen</p>
          <a class="knop" href="#/toevoegen">Voeg een woord toe</a>
        </section>
      </div>
      <section class="sectie">
        <h2>Bladeren op letter</h2>
        <nav class="alfabet" aria-label="Alfabet">${'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => `<a href="#/letter/${l}">${l.toUpperCase()}</a>`).join('')}</nav>
      </section>
      <section class="sectie">
        <h2>Streken</h2>
        <div class="raster">
          ${perRegio.map(([r, n]) => `<a class="kaart" href="#/regio/${r.id}" style="text-decoration:none;color:inherit">
            <h3>${esc(r.naam)}</h3><p class="klein" style="margin:0">${n.toLocaleString('nl')} woorden · ${esc(r.omschrijving)}</p></a>`).join('')}
        </div>
      </section>
    </div>`;

  const invoer = app.querySelector('#zoek');
  const doos = app.querySelector('#resultaten');
  const start = app.querySelector('#start');
  const toon = () => {
    const t = invoer.value;
    const lijst = zoek(t, filters);
    start.hidden = !!t.trim();
    if (!t.trim()) { doos.innerHTML = ''; return; }
    if (!lijst.length) {
      doos.innerHTML = `<div class="leeg"><p>Geen woorden gevonden voor “${esc(t)}”${filters.regio ? ` in ${esc(REGIO_NAAM[filters.regio])}` : ''}.</p>
        <a class="knop" href="#/toevoegen?nl=${enc(t)}">Voeg “${esc(t)}” toe</a></div>`;
      return;
    }
    doos.innerHTML = `<p class="klein">${lijst.length} resultaten</p><div></div>`;
    lijstMetMeer(doos.lastElementChild, lijst, t);
  };
  let timer;
  invoer.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      history.replaceState(null, '', invoer.value.trim() ? `#/zoek/${enc(invoer.value.trim())}` : '#/');
      toon();
    }, 120);
  });
  app.querySelectorAll('[data-regio]').forEach((b) => b.addEventListener('click', () => {
    filters.regio = b.dataset.regio;
    app.querySelectorAll('[data-regio]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    toon();
  }));
  toon();
  if (term) invoer.setSelectionRange(term.length, term.length);
}

function paginaWoord(id) {
  const w = PER_ID.get(id);
  if (!w) return paginaNietGevonden();
  document.title = `${w.zeeuws} – Zeeuws Woordenboek`;
  const zelfdeBetekenis = WOORDEN.filter((x) => x !== w && x._n.some((n) => w._n.includes(n)));
  const zelfdeWoord = WOORDEN.filter((x) => x !== w && x._z === w._z);
  const correctie = issueUrl(CONFIG.sjabloonCorrectie, { woord: `${w.zeeuws} (${w.id})` }, `Correctie: ${w.zeeuws}`);
  app.innerHTML = `
    <p><a href="#/">← Terug naar zoeken</a></p>
    <div class="raster-2">
      <article class="kaart">
        <div class="woordkop"><h1>${esc(w.zeeuws)}</h1>${w.soort ? `<a class="label" href="#/soort/${enc(w.soort)}">${esc(w.soort)}</a>` : ''}</div>
        <p class="vertaling"><span class="zacht">Nederlands:</span> <strong>${w.nederlands.map(esc).join('; ')}</strong></p>
        ${w.voorbeeld ? `<div class="voorbeeld"><p>${esc(w.voorbeeld)}</p>${w.voorbeeldNl ? `<p class="nl">${esc(w.voorbeeldNl)}</p>` : ''}</div>` : ''}
        ${w.toelichting ? `<h3>Toelichting</h3><p class="toelichting">${esc(w.toelichting)}</p>` : ''}
        <dl class="gegevens">
          <dt>Streek</dt><dd class="labels">${regioLabels(w)}</dd>
          ${w.plaatsen.length ? `<dt>Zo gezegd in</dt><dd class="labels">${w.plaatsen.map((p) => `<a class="label" href="#/plaats/${enc(p)}">${esc(p)}</a>`).join(' ')}</dd>` : ''}
          ${w.bron ? `<dt>Bron</dt><dd class="klein">${esc(w.bron)}</dd>` : ''}
        </dl>
        <p style="margin-top:20px" class="knoppenrij">
          <a class="knop licht" href="#/vertaler?t=${enc(w.zeeuws)}&r=zeeuws-nl">Gebruik in vertaler</a>
          <a class="knop licht" href="${esc(correctie)}" target="_blank" rel="noopener">Verbetering voorstellen</a>
          <a class="knop licht" href="#/toevoegen?nl=${enc(w.nederlands[0])}">Andere variant toevoegen</a>
        </p>
      </article>
      <aside>
        ${zelfdeBetekenis.length ? `<section class="kaart"><h3>Ook “${esc(w.nederlands[0])}” in andere streken</h3>${resultaatLijst(zelfdeBetekenis, '', 30)}</section>` : ''}
        ${zelfdeWoord.length ? `<section class="kaart" style="margin-top:16px"><h3>Hetzelfde woord, andere betekenis</h3>${resultaatLijst(zelfdeWoord, '', 30)}</section>` : ''}
      </aside>
    </div>`;
}

function paginaLijst(titel, intro, woorden, extra = '') {
  app.innerHTML = `<p><a href="#/">← Terug naar zoeken</a></p>
    <h1>${titel}</h1>${intro ? `<p class="zacht">${intro}</p>` : ''}${extra}
    <p class="klein">${woorden.length.toLocaleString('nl')} woorden</p><div id="lijst"></div>`;
  lijstMetMeer(app.querySelector('#lijst'), woorden);
}

const alfabetisch = (a, b) => a._z.replace(/^['’]?\W*/, '').localeCompare(b._z.replace(/^['’]?\W*/, ''), 'nl');

function paginaRegio(id) {
  const r = REGIOS.find((x) => x.id === id);
  if (!r) return paginaNietGevonden();
  document.title = `${r.naam} – Zeeuws Woordenboek`;
  const plaatsen = PLAATSEN.filter((p) => p.regio === id)
    .map((p) => [p, WOORDEN.filter((w) => w.plaatsen.includes(p.naam)).length]).filter(([, n]) => n);
  const extra = plaatsen.length ? `<div class="chips">${plaatsen.map(([p, n]) => `<a class="chip" href="#/plaats/${enc(p.naam)}">${esc(p.naam)} <span class="zacht">${n}</span></a>`).join('')}</div>` : '';
  paginaLijst(esc(r.naam), esc(r.omschrijving), WOORDEN.filter((w) => w.regio.includes(id)).sort(alfabetisch), extra);
}

function paginaPlaats(naam) {
  const p = PLAATSEN.find((x) => x.naam === naam);
  document.title = `${naam} – Zeeuws Woordenboek`;
  const intro = p ? `Gemeente ${esc(p.gemeente)} · <a href="#/regio/${p.regio}">${esc(REGIO_NAAM[p.regio])}</a>` : '';
  paginaLijst(esc(naam), intro, WOORDEN.filter((w) => w.plaatsen.includes(naam)).sort(alfabetisch));
}

function paginaLetter(l) {
  const woorden = WOORDEN.filter((w) => w._z.replace(/^['’\s-]*(n |t |un |ut |de )?/, '').startsWith(l)).sort(alfabetisch);
  const nav = `<nav class="alfabet" aria-label="Alfabet" style="margin-bottom:16px">${'abcdefghijklmnopqrstuvwxyz'.split('').map((x) => `<a href="#/letter/${x}" class="${x === l ? 'actief' : ''}">${x.toUpperCase()}</a>`).join('')}</nav>`;
  paginaLijst(`Zeeuwse woorden met de ${esc(l.toUpperCase())}`, '', woorden, nav);
}

function paginaSoort(s) {
  const nav = `<div class="chips" style="margin-bottom:16px">${SOORTEN.map((x) => `<a class="chip ${x === s ? 'actief' : ''}" href="#/soort/${enc(x)}">${esc(x)}</a>`).join('')}</div>`;
  paginaLijst(esc(s[0].toUpperCase() + s.slice(1)), 'Woordsoort', WOORDEN.filter((w) => w.soort === s).sort(alfabetisch), nav);
}

// ---------- Vertaler ----------
function paginaVertaler(params) {
  document.title = 'Vertaler – Zeeuws Woordenboek';
  let richting = params.get('r') === 'zeeuws-nl' ? 'zeeuws-nl' : 'nl-zeeuws';
  const opgeslagen = (() => { try { return JSON.parse(localStorage.getItem('vertaler') || '{}'); } catch { return {}; } })();
  let regio = opgeslagen.regio || 'zuid-beveland';
  let regels = opgeslagen.regels ?? true;
  const groepen = { eilanden: 'Eilanden', 'zeeuws-vlaanderen': 'Zeeuws-Vlaanderen' };
  app.innerHTML = `
    <h1>Vertaler</h1>
    <p class="zacht">Vertaal tussen Nederlands en Zeeuws, inclusief vervoegingen, meervouden en verkleinwoorden. Kies je streek: Zeeuws verschilt per eiland en zelfs per dorp.</p>
    <div class="instellingen">
      <div class="veld">
        <label for="regio">Streek</label>
        <select id="regio">
          ${Object.entries(groepen).map(([g, naam]) => `<optgroup label="${naam}">${REGIOS.filter((r) => r.groep === g).map((r) => `<option value="${r.id}" ${r.id === regio ? 'selected' : ''}>${esc(r.naam)}</option>`).join('')}</optgroup>`).join('')}
        </select>
      </div>
      <label class="schakel" id="regels-veld"><input type="checkbox" id="regels" ${regels ? 'checked' : ''}> Onbekende woorden benaderen met klankregels</label>
    </div>
    <div class="vertaler">
      <div class="paneel">
        <div class="paneel-kop"><span id="van-naam"></span></div>
        <label for="invoer" class="skip">Tekst om te vertalen</label>
        <textarea id="invoer" placeholder="Typ hier je tekst…">${esc(params.get('t') || '')}</textarea>
      </div>
      <button class="knop licht wissel" type="button" id="wissel" title="Wissel richting" aria-label="Wissel vertaalrichting">${ICOON.wissel}</button>
      <div class="paneel">
        <div class="paneel-kop"><span id="naar-naam"></span><button class="knop licht" type="button" id="kopieer" style="padding:6px 12px">${ICOON.kopie} Kopiëren</button></div>
        <div class="uitvoer" id="uitvoer" aria-live="polite"></div>
      </div>
    </div>
    <div class="legenda">
      <span><span class="seg seg-woordenboek">woord</span> uit het woordenboek (klik voor details)</span>
      <span><span class="seg seg-afgeleid">woord</span> vervoegd of verbogen met de grammatica</span>
      <span><span class="seg seg-andere-regio">woord</span> bekend uit een andere streek</span>
      <span id="leg-regel"><span class="seg seg-regel">woord</span> benaderd met klankregels</span>
      <span id="leg-onbekend"><span class="seg seg-onbekend">woord</span> onbekend – voeg het toe!</span>
    </div>
    <div id="alternatieven" class="alternatieven"></div>
    <section class="sectie kaart">
      <h2>Hoe werkt de vertaler?</h2>
      <p>De zinsbouw van het Zeeuws lijkt sterk op die van het Nederlands; het verschil zit vooral in de woorden en hun vormen. De vertaler werkt daarom in drie stappen:</p>
      <ol>
        <li><strong>Woordenboek</strong>: elk woord en elke woordgroep wordt opgezocht, het liefst een woord uit jouw streek.</li>
        <li><strong>Grammatica</strong>: staat een vorm er niet letterlijk in, dan zoekt de vertaler de grondvorm op en bouwt hij de juiste vorm opnieuw op. <em>ik kijk</em> wordt <em>'k kieke</em>, <em>hij kijkt</em> wordt <em>ie kiekt</em>, <em>gewoond</em> wordt <em>eweund</em>, <em>huizen</em> wordt <em>uuzen</em> en <em>huisje</em> wordt <em>uusje</em>. Het onderwerp (ik, jij, wij…) bepaalt welke persoonsvorm het wordt. Staat er bij een werkwoord een vervoeging in de toelichting, dan gebruikt hij die.</li>
        <li><strong>Klankregels</strong> (alleen Nederlands → Zeeuws): voor woorden die nergens in staan een gok met typische Zeeuwse klanken, zoals het weglaten van de h (<em>huis → uus</em>), <em>ij → ie</em>, <em>ui → uu</em> en <em>ge- → e-</em>.</li>
      </ol>
      <p>Controleer de uitkomst altijd: vooral sterke werkwoorden (<em>liep, ging</em>) en meervouden zijn in het Zeeuws vaak anders dan de regels voorspellen.</p>
      <p style="margin:0">Hoe meer woorden er worden toegevoegd, hoe beter de vertaler wordt.</p>
    </section>`;

  const $ = (s) => app.querySelector(s);
  const invoer = $('#invoer'), uitvoer = $('#uitvoer'), alt = $('#alternatieven');
  const bewaar = () => { try { localStorage.setItem('vertaler', JSON.stringify({ regio, regels })); } catch {} };
  const vertaal = () => {
    $('#van-naam').textContent = richting === 'nl-zeeuws' ? 'Nederlands' : `Zeeuws`;
    $('#naar-naam').textContent = richting === 'nl-zeeuws' ? `Zeeuws (${REGIO_NAAM[regio]})` : 'Nederlands';
    $('#regels-veld').hidden = richting !== 'nl-zeeuws';
    $('#leg-regel').hidden = richting !== 'nl-zeeuws';
    $('#leg-onbekend').hidden = richting === 'nl-zeeuws';
    const segmenten = VERTALER.vertaal(invoer.value, { richting, regio, regels });
    uitvoer.innerHTML = segmenten.map((s, i) => {
      if (s.type === 'spatie' || s.type === 'ongewijzigd') return esc(s.tekst);
      if (s.woord) return `<a class="seg seg-${s.type}" href="#/woord/${enc(s.woord.id)}" data-i="${i}" title="${esc(s.bron)} → ${esc(s.tekst)}${s.uitleg ? ' · ' + esc(s.uitleg) : ''}${s.woord.regio.length ? ' · ' + esc(s.woord.regio.map((r) => REGIO_NAAM[r]).join(', ')) : ''}">${esc(s.tekst)}</a>`;
      if (s.type === 'onbekend') return `<a class="seg seg-onbekend" href="#/toevoegen?zw=${enc(s.tekst)}" title="Onbekend woord – klik om toe te voegen">${esc(s.tekst)}</a>`;
      return `<span class="seg seg-${s.type}" title="Benadering op basis van klankregels">${esc(s.tekst)}</span>`;
    }).join('');
    const metAlt = [...new Map(segmenten.filter((s) => s.alternatieven?.length).map((s) => [normaliseer(s.bron), s])).values()];
    alt.innerHTML = metAlt.length ? `<h3>Andere mogelijkheden</h3><ul>${metAlt.slice(0, 12).map((s) => `<li><strong>${esc(s.bron)}</strong>: ${s.alternatieven.map((a) => `<a href="#/woord/${enc(a.woord.id)}">${esc(a.doel)}</a> <span class="klein">(${esc(a.woord.regio.map((r) => REGIO_NAAM[r]).join(', ') || 'streek onbekend')})</span>`).join(', ')}</li>`).join('')}</ul>` : '';
    const url = `#/vertaler?r=${richting}${invoer.value ? `&t=${enc(invoer.value.slice(0, 1500))}` : ''}`;
    history.replaceState(null, '', url);
  };
  invoer.addEventListener('input', vertaal);
  $('#regio').addEventListener('change', (e) => { regio = e.target.value; bewaar(); vertaal(); });
  $('#regels').addEventListener('change', (e) => { regels = e.target.checked; bewaar(); vertaal(); });
  $('#wissel').addEventListener('click', () => {
    if (richting === 'nl-zeeuws') invoer.value = uitvoer.textContent;
    richting = richting === 'nl-zeeuws' ? 'zeeuws-nl' : 'nl-zeeuws';
    vertaal();
  });
  $('#kopieer').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(uitvoer.textContent); e.currentTarget.lastChild.textContent = ' Gekopieerd'; } catch {}
  });
  vertaal();
  invoer.focus();
}

// ---------- Toevoegen ----------
function paginaToevoegen(params) {
  document.title = 'Woord toevoegen – Zeeuws Woordenboek';
  app.innerHTML = `
    <h1>Woord toevoegen</h1>
    <div class="raster-2">
      <form class="kaart" id="formulier">
        <div class="rij">
          <div class="veld"><label for="f-zeeuws">Zeeuws woord of uitdrukking *</label><input id="f-zeeuws" type="text" required value="${esc(params.get('zw') || '')}"></div>
          <div class="veld"><label for="f-nederlands">Nederlandse betekenis *</label><input id="f-nederlands" type="text" required value="${esc(params.get('nl') || '')}"><span class="klein">Meerdere betekenissen scheiden met ;</span></div>
        </div>
        <div class="rij">
          <div class="veld"><label for="f-plaats">Plaats waar het zo gezegd wordt</label>
            <input id="f-plaats" type="text" list="plaatsen-lijst" autocomplete="off" placeholder="Bijv. Yerseke">
            <datalist id="plaatsen-lijst">${PLAATSEN.map((p) => `<option value="${esc(p.naam)}">`).join('')}</datalist></div>
          <div class="veld"><label for="f-regio">Streek</label>
            <select id="f-regio"><option value="">Weet ik niet / volgt uit plaats</option>${REGIOS.map((r) => `<option value="${r.id}">${esc(r.naam)}</option>`).join('')}</select></div>
        </div>
        <div class="veld"><label for="f-soort">Woordsoort</label>
          <select id="f-soort"><option value="">Weet ik niet</option>${SOORTEN.map((s) => `<option>${esc(s)}</option>`).join('')}</select></div>
        <div class="rij">
          <div class="veld"><label for="f-voorbeeld">Voorbeeldzin in het Zeeuws</label><input id="f-voorbeeld" type="text"></div>
          <div class="veld"><label for="f-voorbeeldnl">Vertaling van de voorbeeldzin</label><input id="f-voorbeeldnl" type="text"></div>
        </div>
        <div class="veld"><label for="f-toelichting">Toelichting</label><textarea id="f-toelichting" style="min-height:90px" placeholder="Herkomst, uitspraak, vervoeging…"></textarea></div>
        <div id="dubbel"></div>
        <p class="knoppenrij"><button class="knop" type="submit">${ICOON.github} Verstuur via GitHub</button>
          <button class="knop licht" type="button" id="kopieer">${ICOON.kopie} Kopieer als tekst</button></p>
        <p class="klein" style="margin:0">Je gaat naar GitHub, waar het formulier al is ingevuld. Klik daar op <em>Create</em>/<em>Submit new issue</em>.</p>
      </form>
      <aside class="kaart">
        <h2>Zo werkt het</h2>
        <ol class="stappen">
          <li>Vul het formulier in en klik op <strong>Verstuur via GitHub</strong>.</li>
          <li>Log in op GitHub (gratis account) en verstuur het voorstel.</li>
          <li>Een beheerder controleert het woord en keurt het goed.</li>
          <li>Het woord wordt automatisch toegevoegd en staat binnen een paar minuten online.</li>
        </ol>
        <p class="klein" style="margin:0">Geen GitHub-account? Klik op <em>Kopieer als tekst</em> en stuur het naar de beheerder.</p>
      </aside>
    </div>`;

  const $ = (s) => app.querySelector(s);
  const waarden = () => {
    const plaats = $('#f-plaats').value.trim();
    const regio = $('#f-regio').value || PLAATSEN.find((p) => p.naam.toLowerCase() === plaats.toLowerCase())?.regio || '';
    return {
      zeeuws: $('#f-zeeuws').value.trim(), nederlands: $('#f-nederlands').value.trim(), plaats,
      regio: regio ? REGIO_NAAM[regio] : '', soort: $('#f-soort').value,
      voorbeeld: $('#f-voorbeeld').value.trim(), voorbeeld_nl: $('#f-voorbeeldnl').value.trim(), toelichting: $('#f-toelichting').value.trim(),
    };
  };
  const controleer = () => {
    const z = normaliseer($('#f-zeeuws').value), n = normaliseer($('#f-nederlands').value);
    const al = z ? WOORDEN.filter((w) => w._z === z && (!n || w._n.includes(n))) : [];
    $('#dubbel').innerHTML = al.length ? `<p class="melding">Dit woord staat er al in: ${al.map((w) => `<a href="#/woord/${enc(w.id)}">${esc(w.zeeuws)}</a> (${esc(w.plaatsen.join(', ') || 'plaats onbekend')})`).join(', ')}. Een variant uit een andere plaats is wel welkom.</p>` : '';
  };
  $('#f-zeeuws').addEventListener('input', controleer);
  $('#f-nederlands').addEventListener('input', controleer);
  controleer();
  $('#formulier').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = waarden();
    window.open(issueUrl(CONFIG.sjabloonNieuwWoord, v, `Nieuw woord: ${v.zeeuws} (${v.nederlands})`), '_blank', 'noopener');
  });
  $('#kopieer').addEventListener('click', async (e) => {
    const v = waarden();
    const tekst = Object.entries(v).filter(([, x]) => x).map(([k, x]) => `${k}: ${x}`).join('\n');
    try { await navigator.clipboard.writeText(tekst); e.currentTarget.lastChild.textContent = ' Gekopieerd'; } catch {}
  });
}

function paginaOver() {
  document.title = 'Over – Zeeuws Woordenboek';
  app.innerHTML = `
    <article class="kaart" style="max-width:760px">
      <h1>Over dit woordenboek</h1>
      <p>Het Zeeuws Woordenboek begon in 2015 als het eerste online Zeeuwse woordenboek. Bezoekers voegden er duizenden woorden aan toe, elk met de plaats waar het zo gezegd wordt. Deze nieuwe versie bewaart al die woorden en maakt het makkelijker om te zoeken, te vertalen en bij te dragen.</p>
      <h2>Open en van iedereen</h2>
      <p>Alle woorden staan in één bestand op <a href="${repoUrl()}" target="_blank" rel="noopener">GitHub</a>. Iedereen kan een woord voorstellen of een fout melden. Een beheerder controleert elk voorstel, waarna het automatisch op de site verschijnt.</p>
      <h2>Streken</h2>
      <p>Zeeuws is geen eenheidstaal. Het Walchers klinkt anders dan het Bevelands, en in Zeeuws-Vlaanderen hoor je veel Vlaamse invloed. Daarom heeft elk woord een plaats en een streek.</p>
      <ul>${REGIOS.filter((r) => r.id !== 'algemeen').map((r) => `<li><a href="#/regio/${r.id}">${esc(r.naam)}</a>: ${esc(r.omschrijving)}</li>`).join('')}</ul>
      <h2>Meedoen</h2>
      <p class="knoppenrij"><a class="knop" href="#/toevoegen">Woord toevoegen</a> <a class="knop licht" href="${repoUrl()}/issues" target="_blank" rel="noopener">Bekijk voorstellen</a></p>
    </article>`;
}

function paginaNietGevonden() {
  app.innerHTML = `<div class="leeg"><h1>Niet gevonden</h1><p>Deze pagina of dit woord bestaat (nog) niet.</p><a class="knop" href="#/">Naar het woordenboek</a></div>`;
}

// ---------- Router ----------
function route() {
  const [pad, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [naam, ...rest] = pad.split('/');
  const arg = decodeURIComponent(rest.join('/'));
  const params = new URLSearchParams(query);
  document.title = 'Zeeuws Woordenboek';
  document.querySelectorAll('.menu a').forEach((a) => a.classList.toggle('actief', a.dataset.route === (['zoek', 'woord', 'regio', 'plaats', 'letter', 'soort'].includes(naam) ? '' : naam)));
  const paginas = {
    '': () => paginaZoeken(),
    zoek: () => paginaZoeken(arg),
    woord: () => paginaWoord(arg),
    regio: () => paginaRegio(arg),
    plaats: () => paginaPlaats(arg),
    letter: () => paginaLetter(arg.toLowerCase()),
    soort: () => paginaSoort(arg),
    vertaler: () => paginaVertaler(params),
    toevoegen: () => paginaToevoegen(params),
    over: () => paginaOver(),
  };
  (paginas[naam] ?? paginaNietGevonden)();
  if (naam !== 'zoek' && naam !== '') window.scrollTo(0, 0);
}

init();
