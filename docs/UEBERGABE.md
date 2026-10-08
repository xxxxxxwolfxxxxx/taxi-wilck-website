# Taxi Wilck Website – Übergabe für das Code-Review

Stand: 2026-10-08. Gleicher Inhalt wie das geteilte Dokument; hier im Repository, damit es mit dem Code zusammen gefunden und versioniert wird.

Statische Website für ein Taxiunternehmen in Hagenow, ohne Framework und ohne Laufzeit-Abhängigkeiten. 29 Orts-Landingpages entstehen aus Daten per Node-Skript, Netlify veröffentlicht jeden Push auf `main` automatisch. Dieses Dokument fasst zusammen, was ihr prüfen solltet, und enthält den Fragenkatalog für den Kunden.

## Links

| Was | Adresse |
| --- | --- |
| Vorschau (Netlify, Stand main) | https://taxi-wilck-hagenow.netlify.app |
| Beispiel Ortsseite | https://taxi-wilck-hagenow.netlify.app/taxi-kuhstorf/ |
| Fahrgebiet-Übersicht | https://taxi-wilck-hagenow.netlify.app/fahrgebiet/ |
| Preisrechner | https://taxi-wilck-hagenow.netlify.app/preisrechner.html |
| Beispiel Fremdsprache (Arabisch, rechts-nach-links) | https://taxi-wilck-hagenow.netlify.app/?lang=ar |
| GitHub-Repository (Branch main) | https://github.com/xxxxxxwolfxxxxx/taxi-wilck-website |
| Bisherige Live-Seite des Kunden | https://www.taxi-wilck.de (noch nicht umgestellt) |

Der Zugriff aufs Repository läuft über den GitHub-Account des Auftraggebers. Jeder Push auf `main` löst einen Netlify-Deploy aus; die Domain `taxi-wilck.de` zeigt bewusst noch auf den alten Webspace, bis der Kunde die neue Seite freigibt.

## Aufbau

**Stack:** HTML, CSS und Vanilla-JavaScript, kein Bundler, kein Framework, `package.json` ohne Abhängigkeiten. Hosting auf Netlify (`publish = "."`, kein Build-Befehl). Node ≥ 20 für Skripte und Tests. Die Ortsseiten werden lokal erzeugt und mitcommittet.

| Pfad | Zweck |
| --- | --- |
| `index.html`, `preisrechner.html`, `impressum.html`, `datenschutz.html`, `danke.html` | Handgepflegte Seiten; Header, Footer und das Anfrageformular werden per Marker (`<!--header-start-->` usw.) aus den Vorlagen eingesetzt |
| `taxi-<ort>/index.html` (29), `fahrgebiet/`, `sitemap.xml` | Generiert von `scripts/build-orte.js` |
| `scripts/templates/` | `header.html`, `footer.html`, `ride-form.html` |
| `scripts/orte.json` | Orte im 15-km-Umkreis von Hagenow (Overpass/OSM), mit Straßenkilometern (OSRM) |
| `scripts/ortsinfos.json` | Gemeinde, Amt, Einwohner (Wikipedia/Wikidata), PLZ, Strecken zu Bahnhof, Klinikum, Schwerin |
| `tarif.js`, `rechner.js`, `rechner.css` | Taxitarif 2026 (Taxenordnung Landkreis Ludwigslust-Parchim) und Oberfläche des Preisrechners |
| `nav.js`, `anfrage.js`, `standort.js`, `orte-filter.js` | Mobile Navigation, Sofort/Später im Formular, „Meinen Standort verwenden“, Buchstabenfilter der Orte |
| `i18n.js`, `i18n/*.json`, `img/flags/` | Mehrsprachigkeit (19 Sprachen) |
| `tests/` | 27 Tests mit `node:test` (Tarif, Generator, Übersetzungen) |
| `docs/` | Dieses Dokument |

**Formulare:** Netlify Forms (`data-netlify`, Honeypot `bot-field`). Formular `fahrt`: abholort, name, telefon, ziel (optional), wann (Sofort/Später), datum, uhrzeit, personen, datenschutz, sprache. Formular `kontakt`: name, email, telefon, nachricht, datenschutz, sprache.

**Mehrsprachigkeit:** Deutsch steht im HTML (SEO). Andere Sprachen kommen clientseitig aus `i18n/<code>.json`, markiert mit `data-i18n`-Attributen. Rückfall: Zielsprache, dann Englisch, dann Deutsch. Vollständig: en, pl, ru, uk, tr, ar. Nur der Bestell-Kern: fr, es, it, nl, cs, hu, ro, bg, el, pt, da, sv.

**SEO:** Eine statische URL je Ort mit eigenem Title, Description, Canonical, Open Graph, drei JSON-LD-Blöcken (TaxiService, BreadcrumbList, FAQPage), `sitemap.xml` (32 URLs), `robots.txt`. Das Anfrageformular ist auf jeder Ortsseite mit PLZ und Ort vorbelegt.

## Lokal starten, bauen, testen

```bash
git clone https://github.com/xxxxxxwolfxxxxx/taxi-wilck-website.git
cd taxi-wilck-website
npm run serve    # http://localhost:8099 (python3 -m http.server)
npm test         # 27 Tests, node:test, keine Abhängigkeiten
npm run audit    # Links, Anker, Meta, JSON-LD, Sitemap auf allen 35 Seiten
npm run build    # Ortsseiten, Fahrgebiet, Sitemap neu erzeugen, Header/Footer einsetzen
node scripts/fetch-orte.js        # Orte neu aus OSM holen (Netzwerk)
node scripts/fetch-ortsinfos.js   # Gemeinde, Einwohner, PLZ, Strecken (Netzwerk)
```

Neue Orte kommen in `scripts/orte.json`; danach beide Fetch-Skripte und `npm run build`. Details stehen in `scripts/README.md`.

## Externe Dienste und Datenschutz

Die Seite setzt keine Cookies, nutzt keine Tracker und lädt Schriften lokal. Folgende Dienste werden angesprochen:

| Dienst | Wann | Wofür | Anmerkung |
| --- | --- | --- | --- |
| Netlify | Laufend | Hosting, Formularversand | Auftragsverarbeitung (AV-Vertrag) klären |
| OSRM-Demoserver (`router.project-osrm.org`) | Build **und** Laufzeit im Preisrechner | Strecke und Fahrzeit | Demoserver ohne Zusicherung, nicht für Produktionslast gedacht |
| Nominatim (`nominatim.openstreetmap.org`) | Laufzeit: Preisrechner, Standort-Button | Adresse zu Koordinaten und zurück | Nutzungsrichtlinie: wenige Anfragen, kein SLA; IP-Adresse wird übertragen |
| Overpass (OSM) | Nur Build | Orte im Umkreis | Daten © OpenStreetMap-Mitwirkende |
| Wikipedia, Wikidata | Nur Build | Gemeinde, Amt, Einwohner, PLZ | |
| Google Maps | Nur nach Klick auf Links | Route, Rezensionen | Reine Links |

Der Preisrechner holt Nominatim und OSRM erst nach ausdrücklicher Einwilligung (Checkbox), der Standort-Button erst nach Klick und Browser-Freigabe. Der Datenschutztext wurde um den Abschnitt „Standort verwenden“ erweitert; er ist nicht juristisch geprüft.

## Bekannte Schwächen und Review-Fragen

Diese Punkte sind uns selbst aufgefallen. Am meisten bringt ein Blick auf die ersten vier.

| Thema | Befund | Vorschlag |
| --- | --- | --- |
| Drittdienste im Produktivbetrieb | Preisrechner und Standort-Button rufen den OSRM-Demoserver und Nominatim direkt aus dem Browser auf. Beide sind laut Betreiber nicht für Produktionslast gedacht, ohne SLA. | Eigener Proxy mit Cache (Netlify Function) oder kommerzieller Anbieter; Fehlerverhalten bei Ausfall prüfen (derzeit Hinweis „bitte anrufen“) |
| Veröffentlichtes Verzeichnis | `publish = "."` veröffentlicht das ganze Repo. Intern gedachte Pfade (`docs/`, `scripts/`, `tests/`, `README.md`, `package.json`) sind per Redirect in `netlify.toml` gesperrt (404). `i18n/` muss öffentlich bleiben. | Ausgabe nach `public/` verschieben, dann entfallen die Sperren |
| Preis- und Rechtsaussagen | Der Pflichtfahrgebiet-Test im Preisrechner ist eine Heuristik über Ortsnamenlisten aus der Geocodierung (`ALTKREIS_LWL` in `rechner.js`). Ortsseiten nennen „rund X €“ für bis zu 27 km. | Logik und Wortlaut gegen die Taxenordnung prüfen; Haftungsrisiko mit dem Kunden klären |
| Mehrsprachigkeit clientseitig | Kurzes Aufblitzen der deutschen Texte beim Laden, Auto-Erkennung der Browsersprache, Fremdsprachen nicht für Google indexierbar. Platzhalter-Werte werden per `innerHTML` eingesetzt, aber vorher escaped. | Entscheiden, ob statische Sprachseiten (`/en/`) nötig sind; `i18n.js` auf XSS-Pfade prüfen |
| Übersetzungen | Von KI erstellt, nicht von Muttersprachlern geprüft; Rechtstexte bleiben deutsch. | Muttersprachler-Review vor dem Livegang |
| Generator und Vorlagen | Ortsseiten-Markup steckt als JS-Template-Strings in `build-orte.js` (rund 240 Zeilen). Generierte Dateien liegen im Repo, Diffs sind groß. | Ab etwa 100 Orten Eleventy oder Astro mit Build bei Netlify erwägen |
| Sicherheits-Header | `netlify.toml` setzt nosniff, X-Frame-Options, Referrer-Policy. Keine CSP; Inline-Skripte auf der Startseite verhindern eine strikte CSP ohne Nonces. | CSP ergänzen, Inline-Skripte auslagern |
| Formular-Spam | Nur Honeypot, kein CAPTCHA, keine Rate-Limits. E-Mail-Benachrichtigung ist im Netlify-Dashboard noch einzurichten. | Benachrichtigung testen, Spam-Filter einschalten |
| Testabdeckung | 27 Unit-Tests. Keine Browser-/E2E-Tests, kein automatischer Barrierefreiheits-Check, kein Lighthouse-Lauf dokumentiert. Das Layout wurde nur manuell in einem Browser geprüft, nicht auf echten Geräten oder in Safari/Firefox. | Playwright-Smoke-Test, axe, Lighthouse in CI |
| Daten der Ortsseiten | Ortsteil-Zuordnung zu Dorf nur nach Luftlinie; PLZ von Parum und Kraak nur aus OSM; Einwohner aus Wikidata. | Kunde prüft die Liste (siehe Fragenkatalog) |
| Kleinkram | Kein `favicon.ico` (nur SVG-Icon, Browser holen `/favicon.ico` und bekommen 404). Google-Bewertung (4,6 aus 76) und drei Zitate sind fest im HTML eingetragen und müssen manuell gepflegt werden. Keine Meta-Description auf Impressum und Datenschutz. | Favicon-Weiterleitung, Bewertungen regelmäßig aktualisieren |

## Fragenkatalog für den Kunden

Die Seite nutzt bisher nur ein Foto der Flotte und knappe Texte. Je mehr echtes Material der Kunde liefert, desto weniger wirkt sie wie eine Schablone, und desto besser ranken die Ortsseiten. Die Fragen sind nach Wichtigkeit sortiert; Haken setzen, was geliefert ist.

### 1. Bilder und Material

- [ ] Aktuelle Fotos aller Fahrzeuge, außen und innen (Querformat, mindestens 2000 Pixel breit)?
- [ ] Fotos vom Team, vom Betriebshof und von der Zentrale in Hagenow?
- [ ] Fotos aus dem Fahrgebiet (Orte, Bahnhof, Klinikum), die rechtefrei verwendet werden dürfen?
- [ ] Wer hat die vorhandenen Fotos gemacht, und darf die Seite sie nutzen?
- [ ] Logo als Vektordatei (SVG oder PDF)?
- [ ] Gibt es Zeitungsartikel, Auszeichnungen, Mitgliedschaften (Taxiverband, Krankenkassen-Verträge), die genannt werden dürfen?

### 2. Fahrer-Steckbriefe

Für jeden Fahrer, der auf der Seite erscheinen soll. Ohne ausdrückliche, schriftliche Einwilligung wird nichts veröffentlicht.

- [ ] Vorname (oder Spitzname), Foto, seit wann im Betrieb?
- [ ] Welche Sprachen spricht der Fahrer? (Besonders wichtig für die Fremdsprachen-Fahrgäste und für den Hinweis „spricht Polnisch“.)
- [ ] Spezialgebiete: Krankenfahrten, Rollstuhl, Kinder und Schulwege, Flughafen, Nachtfahrten?
- [ ] Ein persönlicher Satz oder eine Lieblingsstrecke?
- [ ] Einwilligung zur Veröffentlichung von Name und Foto liegt vor?

### 3. Fahrzeuge

Je Fahrzeug (bisher stehen nur „VW Touran“ und „VW T6“ auf der Seite):

- [ ] Wie viele Fahrzeuge gibt es insgesamt, welche Modelle, Baujahre, Farben?
- [ ] Sitzplätze, Gepäckraum, Klimaanlage, Elektro oder Hybrid?
- [ ] Rollstuhl: Welches Fahrzeug, Rampe oder Lift, wie viele Rollstuhlplätze, maximales Gewicht?
- [ ] Kindersitze und Sitzerhöhungen: Anzahl, ab welchem Alter?
- [ ] Tiere, Skier, Fahrräder, Kinderwagen: Was darf mit?
- [ ] Zahlungsarten im Fahrzeug: bar, EC, Kreditkarte, Rechnung, Krankenkassenabrechnung?

### 4. Fahrgebiet

- [ ] Welche Orte fährt der Betrieb regulär an, und welche nicht? (Unsere Liste mit 29 Orten im 15-km-Umkreis prüfen: fehlt etwas, ist etwas überflüssig?)
- [ ] Stimmt die Zuordnung der Ortsteile und Weiler zu den Dorfseiten? (Wir haben sie nach Luftlinie zugeordnet, z. B. „Eichhof und Niels“ zu Kuhstorf.)
- [ ] Welche Orte außerhalb von 15 km werden oft gefahren (Schwerin, Ludwigslust, Boizenburg, Zarrentin, Hamburg, Berlin, Flughäfen)?
- [ ] Gibt es Festpreise für Stammziele wie Flughafen Hamburg, BER, Hannover oder Schwerin? Dann können wir sie veröffentlichen.
- [ ] Aus welchen Orten kommen die meisten Anfragen? Diese Seiten bekommen zuerst eigene Texte.
- [ ] Typische Ziele pro Ort: Arztpraxen, Pflegeheime, Reha-Kliniken, Schulen, Bahnhöfe, Veranstaltungsorte mit regelmäßigen Fahrten?
- [ ] Gibt es Ortsnamen, die mit anderen verwechselt werden (wie Kuhstorf), bei denen die PLZ wichtig ist?

### 5. Leistungen und Abläufe

- [ ] Krankenfahrten: Welche Krankenkassen, welche Genehmigung muss der Fahrgast mitbringen, wie läuft die Abrechnung?
- [ ] Liegendtransport und Rollstuhl: Was ist möglich, was nicht?
- [ ] Schulbeförderung und Kleintransporte: Gibt es Verträge mit dem Landkreis oder Schulen, die genannt werden dürfen?
- [ ] Feiern, Hochzeiten, Gruppen, Disco- und Nachtfahrten: Anbieten und bewerben?
- [ ] Wie weit im Voraus muss man bestellen, und wie schnell ist ein Taxi sofort da?
- [ ] Erreichbarkeit: Rund um die Uhr oder feste Zeiten? Wer nimmt nachts ab? Gibt es WhatsApp oder SMS?
- [ ] Wer bearbeitet die Online-Anfragen, an welche E-Mail-Adresse sollen sie gehen, und wie schnell wird geantwortet?

### 6. Preise und Recht

- [ ] Stimmt der Tarif (Stand 01.01.2026) und die Zuschläge im Preisrechner? Wer meldet Änderungen?
- [ ] Welche Orte gehören zum Pflichtfahrgebiet? Die Liste im Rechner muss exakt stimmen.
- [ ] Ist die Aussage „rund X €“ auf den Ortsseiten so gewollt, auch bei weiten Strecken?
- [ ] Impressum vollständig: Gewerbeanmeldung, Genehmigungsbehörde, Konzession, USt-ID?
- [ ] Wer prüft den neuen Datenschutz-Abschnitt zum Standort und den Netlify-Vertrag (AVV)?

### 7. Technik, Domain, Pflege

- [ ] Wer hat Zugang zur Domain `taxi-wilck.de` (Anbieter, Login), und wann soll umgestellt werden?
- [ ] Gibt es E-Mail-Postfächer unter der Domain, die beim Umzug erhalten bleiben müssen?
- [ ] Zugang zum Google-Unternehmensprofil (Servicegebiet, Öffnungszeiten, Fotos, Fragen)?
- [ ] Soll die alte Seite noch eine Zeit lang erreichbar bleiben?
- [ ] Statistik (Besucherzahlen) gewünscht? Dann datenschutzfreundlich und mit Hinweis.
- [ ] Welche Sprachen kommen im Alltag wirklich vor? Welche sollen zuerst von Muttersprachlern geprüft werden?
- [ ] Wer pflegt künftig Texte und Bilder, oder soll das ein Dienstleister übernehmen?

### 8. Gestaltung und Ton

- [ ] Gefällt die neue Optik (Gelb, Schwarz, Rot, Logo)? Was soll anders sein?
- [ ] Der bisherige Satz „mit dem Doppel-W“ ist entfernt. Gibt es einen Wunsch-Slogan?
- [ ] Du oder Sie, und wie persönlich darf der Ton sein?
- [ ] Sind die drei Zitate aus Google-Bewertungen als Kundenstimmen in Ordnung, und sollen weitere dazu?

## Offen vor dem Livegang

- [ ] Code-Review (Schwerpunkte: Drittdienste, veröffentlichtes Verzeichnis, Preislogik, `i18n.js`)
- [ ] Kundenabnahme der Optik und der Texte
- [ ] Fragenkatalog beantwortet, Bilder und Steckbriefe eingebaut
- [ ] Ortsteil-Zuordnung und PLZ vom Kunden bestätigt
- [ ] Preisaussagen und Pflichtfahrgebiet rechtlich geprüft
- [ ] Datenschutztext und Impressum geprüft, Netlify-AV-Vertrag abgeschlossen
- [ ] Übersetzungen von Muttersprachlern gegengelesen (mindestens en, pl, ru, uk, tr, ar)
- [ ] Echtes Test-Absenden beider Netlify-Formulare, E-Mail-Benachrichtigung eingerichtet
- [ ] Test auf echten iPhones und Android-Geräten (Autofill, Standort-Button, Arabisch) und in Safari/Firefox
- [ ] Domain `www.taxi-wilck.de` auf Netlify umstellen (DNS beim Anbieter), Weiterleitung ohne www, Zertifikat prüfen
- [ ] Sitemap in der Google Search Console einreichen, Google-Unternehmensprofil aktualisieren
