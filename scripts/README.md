# Build-Skripte

Die Seite ist statisches HTML ohne Build-Schritt beim Hosting. Die Ortsseiten und gemeinsame Seitenteile
werden lokal erzeugt und mitcommittet.

| Befehl | Zweck |
|---|---|
| `node scripts/fetch-orte.js` | Orte im Umkreis von Overpass (OSM) holen → `orte.json` |
| `node scripts/fetch-ortsinfos.js` | Gemeinde/Amt, Einwohner (Wikipedia/Wikidata), Strecken zu Zielen (OSRM) → `ortsinfos.json` |
| `node scripts/build-orte.js` | `taxi-<ort>/`, `fahrgebiet/`, `sitemap.xml` erzeugen, Header/Footer in `index.html` und `preisrechner.html` einsetzen |

Header und Footer: `scripts/templates/header.html` bzw. `footer.html` ändern, dann `build-orte.js` ausführen.
Tests (aus dem Ordner darüber): `node --test tests/`

## Sprachen

Deutsch steht im HTML (SEO), alle anderen Sprachen kommen clientseitig aus `i18n/<code>.json` (nur die gewählte Datei wird geladen).
Auszeichnung im HTML: `data-i18n="schlüssel"` (Text/HTML), `data-i18n-attr="attr:schlüssel"`, `data-i18n-vars='{"name":…}'` für `{platzhalter}`.
Reihenfolge der Rückfälle: Zielsprache → `en.json` → Deutsch. Vollständig: en, pl, ru, uk, tr, ar. Bestell-Kern: fr, es, it, nl, cs, hu, ro, bg, el, pt, da, sv.
Neue Sprache: Datei `i18n/xx.json` anlegen, Eintrag in `i18n.js` (`LANGS`) und Flagge `img/flags/<land>.svg` ergänzen. Die Tests (`tests/i18n.test.js`) prüfen Schlüssel, Platzhalter und Links.
Flaggen: MIT-Lizenz, aus dem Paket „flag-icons“ (Spanien vereinfacht).
