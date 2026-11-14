# Zeeuws Woordenboek

Een moderne, open versie van [zeeuwswoordenboek.nl](https://zeeuwswoordenboek.nl) (2015). Deze versie bevat alle 2.462 woorden van de oude site, elk met de plaats waar het zo gezegd wordt.

**Functies**
- **Zoeken** in het Zeeuws en het Nederlands, met filter per streek, bladeren per letter, streek, plaats en woordsoort.
- **Woordpagina's** met betekenis, voorbeeldzin, toelichting en de varianten uit andere streken.
- **Vertaler** Nederlands ⇄ Zeeuws met keuze uit 9 streken: Walcheren, Zuid- en Noord-Beveland, Schouwen-Duiveland, Tholen, Sint Philipsland en West-, Midden- en Oost-Zeeuws-Vlaanderen.
- **Woorden toevoegen** via een formulier dat een GitHub-issue invult. Een beheerder keurt het goed, waarna het woord automatisch online komt.
- Werkt op telefoon en heeft een donkere modus. Oude adressen zoals `/nederlands-zeeuws/huis` worden doorgestuurd.

De site is volledig statisch (HTML, CSS en JavaScript, zonder build-stap of server) en draait gratis op GitHub Pages.

## Hoe komt een nieuw woord erin?

```
Bezoeker vult formulier in  →  GitHub-issue "Nieuw woord"  →  beheerder zet label "goedgekeurd"
        →  GitHub Action voegt het toe aan data/woorden.json  →  site wordt opnieuw gepubliceerd
```

1. Een bezoeker klikt op **Woord toevoegen** en vult het formulier in. GitHub opent met alles al ingevuld. De bezoeker heeft een (gratis) GitHub-account nodig.
2. Het issue krijgt automatisch het label `nieuw-woord`.
3. Jij (beheerder) bekijkt het voorstel. Klopt het? Zet dan het label **`goedgekeurd`** erop.
4. De workflow `Woord toevoegen uit issue` zet het woord in `data/woorden.json`, sluit het issue met een bedankje en publiceert de site. Gaat er iets mis (bijv. een onbekende plaats), dan staat de reden als reactie in het issue.

Correcties komen binnen via het sjabloon **Correctie** (knop *Verbetering voorstellen* op elke woordpagina). Die verwerk je zelf door `data/woorden.json` aan te passen, rechtstreeks in de GitHub-website (potloodje ✏️).

## Eenmalig instellen

Het meeste gaat vanzelf: de labels worden aangemaakt door de workflow *Labels aanmaken*, en de workflows vragen zelf de rechten die ze nodig hebben. Twee dingen kunnen alleen via de instellingen:

1. **Pages aanzetten**: *Settings → Pages → Build and deployment → Source: GitHub Actions*. Ga daarna naar *Actions → Site publiceren → Run workflow*.
2. **(Optioneel) Standaardbranch hernoemen naar `main`**: *Settings → General → Default branch* (potloodje). De workflows werken met elke naam.

**Eigen domein** (zeeuwswoordenboek.nl): doe dit pas als de nieuwe site goed draait. Vul het domein in onder *Settings → Pages → Custom domain* en laat bij je domeinprovider de DNS naar GitHub Pages wijzen (zie [de uitleg van GitHub](https://docs.github.com/nl/pages/configuring-a-custom-domain-for-your-github-pages-site)). Voeg ook een bestand `CNAME` toe met daarin `zeeuwswoordenboek.nl`. Oude links zoals `/nederlands-zeeuws/huis` worden dan automatisch doorgestuurd.

Heet de repository anders of verhuist hij? Pas dan `js/config.js` aan.

## Lokaal draaien

```bash
python3 -m http.server 8000
```

Open daarna http://localhost:8000. Tests draaien met `npm test` (Node 20 of nieuwer, geen installatie nodig).

## Bestanden

| Pad | Inhoud |
| --- | --- |
| `data/woorden.json` | Alle woorden. Velden: `id`, `zeeuws`, `nederlands` (lijst), `soort`, `plaatsen`, `regio`, `voorbeeld`, `voorbeeldNl`, `toelichting`, `bron` |
| `data/plaatsen.json` | 222 Zeeuwse plaatsen met gemeente en streek |
| `data/regios.json` | De streken, gegroepeerd in *eilanden* en *zeeuws-vlaanderen* |
| `js/vertaler.js` | De vertaler (woordenboek + klankregels) |
| `js/app.js` | De website |
| `scripts/` | Controle van de data, omzetten van issues, tests |
| `.github/` | Issue-formulieren en workflows |

## Over de vertaler

De zinsbouw van het Zeeuws lijkt sterk op die van het Nederlands; het verschil zit vooral in de woorden en hun vormen. De vertaler (`js/vertaler.js` + `js/grammatica.js`) werkt per woord in drie stappen:

1. **Woordenboek**: woorden en woordgroepen (tot 5 woorden) worden opgezocht, het liefst uit de gekozen streek, daarna uit dezelfde groep (eilanden of Zeeuws-Vlaanderen) en dan uit andere streken.
2. **Grammatica**: een vorm die niet letterlijk in het woordenboek staat, wordt herleid tot de grondvorm en in de andere taal opnieuw opgebouwd.
   - Werkwoorden: *ik kijk → 'k kieke*, *hij kijkt → ie kiekt*, *kijk je → kiek je*, *woonde → weunde*, *gewoond → eweund*. Het onderwerp bepaalt de persoonsvorm. Ruim 100 sterke Nederlandse werkwoorden (*liep, ging, gezien*) zijn ingebouwd.
   - Staat er in de toelichting van een woord een vervoeging (`Vervoeging / 'k sleê / jie slìt / … / Voltooid deelwoord / esloge`), dan gaat die voor de regels.
   - Meervouden (*huizen → uuzen*), verkleinwoorden (*huisje → uusje*) en verbogen bijvoeglijke naamwoorden (*grote → groôte*), in beide richtingen. Hiervoor moet het woord een woordsoort hebben.
3. **Klankregels** (alleen Nederlands → Zeeuws): een gok voor onbekende woorden: h weglaten, *ij → ie*, *ui → uu*, *ge- → e-*, en *aa → ae* (eilanden) of *aa → ao* (Zeeuws-Vlaanderen).

De kwaliteit hangt vooral af van het woordenboek. Basiswoorden (*weten, moe, mooi*), sterke verleden tijden en vervoegingen in de toelichting maken de vertaler direct beter.

### Waarom geen AI-model?
Kleine, gratis taalmodellen (die in de browser kunnen draaien) kennen nauwelijks Zeeuws en verzinnen woorden; ze zijn ook honderden MB tot enkele GB groot. Grote modellen via een API kosten geld per vertaling en hebben een server nodig. Een regelsysteem op basis van het eigen woordenboek is voorspelbaar, gratis en wordt beter met elk toegevoegd woord. Een AI-model kan later eventueel als extra optie, met het woordenboek als naslag.
