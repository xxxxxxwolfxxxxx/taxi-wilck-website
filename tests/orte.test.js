const test = require('node:test'), assert = require('node:assert/strict');
const B = require('../scripts/build-orte.js');
const orte = require('../scripts/orte.json');
const wb = orte.find((o) => o.name === 'Wittenburg');
const BASE = 'https://www.taxi-wilck.de';

test('jeder Ort hat eindeutigen Slug und plausible Daten', () => {
  const slugs = orte.map((o) => o.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const o of orte) { assert.match(o.slug, /^[a-z0-9-]+$/); assert.ok(o.km > 0 && o.min > 0, o.name); }
});

test('Ortsseite: Title, H1, Canonical, vorausgefüllter Abholort', () => {
  const h = B.renderOrt(wb, orte);
  assert.match(h, /<title>Taxi Wittenburg[^<]*<\/title>/);
  assert.match(h, /<h1[^>]*>(<span[^>]*>)?Taxi in Wittenburg/);
  assert.ok(!h.includes('Doppel-W'));
  assert.ok(h.includes(`<link rel="canonical" href="${BASE}/taxi-wittenburg/">`));
  assert.match(h, /name="abholort"[^>]*value="Wittenburg"/);
  const h2 = B.renderOrt(wb, orte, { plz: '19243', ziele: {} }, null);
  assert.match(h2, /name="abholort"[^>]*value="19243 Wittenburg"/);
  assert.match(h2, /"postalCode":"19243"/);
  assert.match(h, /name="form-name" value="fahrt"/);
});

test('Ortsseite: Schema TaxiService, Breadcrumb und FAQ sind gültiges JSON', () => {
  const h = B.renderOrt(wb, orte);
  const blocks = [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const types = blocks.map((b) => b['@type']);
  assert.deepEqual(types.sort(), ['BreadcrumbList', 'FAQPage', 'TaxiService']);
});

test('Ortsseite: Ortsname im Text wird HTML-escaped, Ortsteile und Nachbarorte verlinkt', () => {
  const h = B.renderOrt({ ...wb, name: 'A&B"<x>' }, orte);
  assert.ok(!h.includes('A&B"<x>'));
  const own = B.renderOrt(wb, orte);
  assert.match(own, /href="\/taxi-[a-z0-9-]+\/"/);
  assert.ok(!own.includes('href="/taxi-wittenburg/">Taxi Wittenburg'), 'keine Selbstverlinkung bei Nachbarn');
});

test('Preisbeispiel stammt aus dem Tarif (Tag, ohne Zuschläge)', () => {
  const T = require('../tarif.js');
  const eur = T.fare({ km: wb.km, tarif: 'tag' }).total.toLocaleString('de-DE', { minimumFractionDigits: 2 });
  assert.ok(B.renderOrt(wb, orte).includes(eur));
});

test('Sitemap enthält Start, Übersicht, Rechner und alle Orte genau einmal', () => {
  const x = B.renderSitemap(orte);
  const locs = [...x.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length);
  assert.equal(locs.length, orte.length + 3);
  for (const u of [`${BASE}/`, `${BASE}/fahrgebiet/`, `${BASE}/preisrechner.html`, `${BASE}/taxi-wittenburg/`]) assert.ok(locs.includes(u), u);
});

test('Übersicht verlinkt jeden Ort', () => {
  const h = B.renderUebersicht(orte);
  for (const o of orte) assert.ok(h.includes(`href="/taxi-${o.slug}/"`), o.name);
  assert.match(h, /<h1[^>]*>[^<]*Fahrgebiet/);
});

test('Startseiten-Block: ersetzt nur zwischen Markern, idempotent, verlinkt alle Orte', () => {
  const src = '<a>x</a><!--orte-start-->ALT<!--orte-end--><b>y</b>';
  const once = B.injectStartseite(src, orte), twice = B.injectStartseite(once, orte);
  assert.equal(once, twice);
  assert.ok(once.startsWith('<a>x</a>') && once.endsWith('<b>y</b>') && !once.includes('ALT'));
  for (const o of orte) assert.ok(once.includes(`href="/taxi-${o.slug}/"`), o.name);
  assert.throws(() => B.injectStartseite('<p>kein Marker</p>', orte), /Marker/);
});

const T = require('../tarif.js');
const infos = require('../scripts/ortsinfos.json');

test('Ortsseite mit Ortsinfos: Gemeinde/Amt, Zieltabelle mit Tarifpreis, kein Preis für Schwerin', () => {
  const info = infos.orte.wittenburg, z = info.ziele.bahnhof;
  const h = B.renderOrt(wb, orte, info, infos.ziele);
  assert.match(h, /Amt Wittenburg/);
  assert.match(h, /Einwohner/);
  const preis = T.fare({ km: z.km, tarif: 'tag' }).total.toLocaleString('de-DE', { minimumFractionDigits: 2 });
  assert.ok(h.includes(`${preis}&nbsp;€`) || h.includes(`${preis} €`), 'Preis Bahnhof ' + preis);
  assert.match(h, /Bahnhof Hagenow Land/);
  assert.match(h, /Helios Kliniken Schwerin[\s\S]*vor Fahrtantritt/);
  assert.equal((h.match(/FAQPage/g) || []).length, 1);
});

test('Ortsseiten sind untereinander unterscheidbar (FAQ-Antworten nicht wortgleich)', () => {
  const a = B.renderOrt(orte[0], orte, infos.orte[orte[0].slug], infos.ziele);
  const b = B.renderOrt(wb, orte, infos.orte.wittenburg, infos.ziele);
  const kran = (h) => (h.match(/Krankenfahrten[^<]*Klinikum[^<]*/) || [''])[0].replace(/\b(Steegen|Wittenburg)\b/g, 'X');
  assert.ok(kran(a) && kran(a) !== kran(b));
});

test('ohne Ortsinfos bleibt die Seite gültig (neue Orte ohne Daten)', () => {
  const h = B.renderOrt(wb, orte);
  assert.match(h, /<h1[^>]*>(<span[^>]*>)?Taxi in Wittenburg/);
  assert.ok(!h.includes('Doppel-W'));
  assert.ok(!h.includes('Typische Fahrten'));
});

test('Header/Footer-Partials: idempotent, Marker Pflicht, in index und Preisrechner identisch', () => {
  const P = require('../scripts/partials.js'), fs = require('node:fs');
  const src = '<!--header-start-->x<!--header-end-->mid<!--footer-start-->y<!--footer-end-->';
  const once = P.injectPartials(src);
  assert.equal(once, P.injectPartials(once));
  assert.ok(once.includes(P.HEADER) && once.includes(P.FOOTER));
  assert.throws(() => P.injectPartials('<p>ohne Marker</p>'), /Marker/);
  assert.ok(fs.readFileSync(`${__dirname}/../index.html`, 'utf8').includes(P.rideForm('')));
  for (const f of ['index.html', 'preisrechner.html']) {
    const h = fs.readFileSync(`${__dirname}/../${f}`, 'utf8');
    assert.ok(h.includes(P.HEADER) && h.includes(P.FOOTER), f);
  }
});

test('Fahrt-Formular: Autofill-Attribute, Sofort/Später, Ziel optional, Netlify-Felder', () => {
  const P = require('../scripts/partials.js'), h = P.rideForm('19230 Kuhstorf');
  assert.match(h, /name="name"[^>]*autocomplete="name"/);
  assert.match(h, /name="telefon"[^>]*type="tel"[^>]*autocomplete="tel"/);
  assert.match(h, /name="abholort"[^>]*value="19230 Kuhstorf"/);
  assert.match(h, /name="wann" value="Sofort"/);
  assert.match(h, /name="wann" value="Später" checked/); // ohne JavaScript: Termin mit Pflichtfeldern
  assert.ok(!/name="ziel"[^>]*required/.test(h));
  assert.match(h, /name="datum"[^>]*required/);
  assert.match(h, /data-netlify="true"/);
});
