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

1. **Pages aanzetten**: *Settings → Pages → Build and deployment → Source: GitHub Actions*.
2. **Labels aanmaken**: *Issues → Labels*: `nieuw-woord`, `goedgekeurd` en `correctie`.
3. **Schrijfrechten voor Actions**: *Settings → Actions → General → Workflow permissions → Read and write permissions*.
4. Staat de standaardbranch niet op `main`? Pas dan `.github/workflows/pages.yml` aan.
5. **Eigen domein** (bijv. zeeuwswoordenboek.nl): maak een bestand `CNAME` met daarin `zeeuwswoordenboek.nl`, stel het in onder *Settings → Pages* en laat bij je domeinprovider de DNS naar GitHub Pages wijzen. Pas daarna in `.github/workflows/woord-uit-issue.yml` de link in het bedankbericht aan.

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

De vertaler zoekt woorden en woordgroepen (tot 5 woorden) op in het woordenboek en kiest het liefst een woord uit de gekozen streek. Daarna komen woorden uit dezelfde groep (eilanden of Zeeuws-Vlaanderen) en pas dan woorden uit andere streken. Die laatste worden anders gemarkeerd. Onbekende Nederlandse woorden kan hij benaderen met klankregels: h weglaten, *ij → ie*, *ui → uu*, en *aa → ae* (eilanden) of *aa → ao* (Zeeuws-Vlaanderen). Zinsbouw en vervoegingen past hij niet aan.

De kwaliteit hangt dus vooral af van het woordenboek. Veel basiswoorden (zoals *ben*, *weet* of *moe*) ontbreken nog. Juist die toevoegen maakt de vertaler meteen beter.
