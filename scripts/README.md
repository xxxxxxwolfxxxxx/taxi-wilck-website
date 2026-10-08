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
