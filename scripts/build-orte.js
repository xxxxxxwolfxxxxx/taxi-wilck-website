/* Erzeugt die Orts-Landingpages (/taxi-<ort>/), die Fahrgebiet-Übersicht und sitemap.xml
   aus scripts/orte.json.  Aufruf: node scripts/build-orte.js  (Ergebnis wird committet) */
const fs = require('node:fs'), path = require('node:path');
const T = require('../tarif.js');

const BASE = 'https://www.taxi-wilck.de';
const TEL = '03883 723240', TEL_HREF = 'tel:03883723240';
const ROOT = path.join(__dirname, '..');
const NEARBY = 4;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const de = (n, d = 1) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const url = (o) => `/taxi-${o.slug}/`;
const air = (a, b) => { const r = Math.PI / 180, x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2; return Math.asin(Math.sqrt(x)); };
const nearby = (o, orte) => orte.filter((x) => x.slug !== o.slug).sort((a, b) => air(o, a) - air(o, b)).slice(0, NEARBY);
const joinDe = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' und ' + xs[xs.length - 1] : xs[0] || '');

const HEADER = `<a class="skip" href="#main">Zum Inhalt springen</a><header class="top"><a class="logo" href="/" aria-label="Taxi Wilck – Startseite"><img src="/img/logo.svg" alt="Taxi Wilck – Taxi- und Fuhrbetrieb, Inh. Yvonne Schomann" width="1200" height="424"></a><nav class="main" aria-label="Hauptnavigation">
<a href="/#leistungen">Leistungen</a><a href="/preisrechner.html">Preisrechner</a><a href="/fahrgebiet/">Fahrgebiet</a><a href="/#kontakt">Kontakt</a><a class="btn red" href="${TEL_HREF}">☎ <span class="num">${TEL}</span><span class="call">Anrufen</span></a></nav></header>`;

const FOOTER = `<footer><span>© <span id="y">2026</span> Taxi- und Fuhrbetrieb Wilfried Wilck</span><span><a href="/fahrgebiet/">Fahrgebiet</a><a href="/preisrechner.html">Preisrechner</a><a href="/impressum.html">Impressum</a><a href="/datenschutz.html">Datenschutzrichtlinie</a></span></footer>
<script>var y=document.getElementById('y');if(y)y.textContent=new Date().getFullYear();var d=document.getElementById('d');if(d)d.min=new Date().toISOString().slice(0,10);</script>
<script src="/nav.js" defer></script>`;

const head = ({ title, desc, canonical, schema, css = [] }) => `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${BASE}/img/flotte-1000.jpg"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}">
<meta name="theme-color" content="#feed01"><link rel="stylesheet" href="/styles.css">${css.map((c) => `<link rel="stylesheet" href="${c}">`).join('')}<link rel="icon" href="/img/logo.svg">
${schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body>
${HEADER}`;

const SERVICE = {
  '@type': 'TaxiService', name: 'Taxi- und Fuhrbetrieb Wilfried Wilck', image: `${BASE}/img/flotte.jpg`, url: `${BASE}/`,
  telephone: '+493883723240', email: 'info@taxi-wilck.de',
  address: { '@type': 'PostalAddress', streetAddress: 'Am Hasselsort 4', postalCode: '19230', addressLocality: 'Hagenow', addressCountry: 'DE' },
  geo: { '@type': 'GeoCoordinates', latitude: 53.4249388, longitude: 11.1907434 },
};

const breadcrumb = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: BASE + href })),
});

/** Fragen/Antworten pro Ort – Text und Schema kommen aus derselben Quelle. */
function faq(o) {
  const preis = de(T.fare({ km: o.km, tarif: 'tag' }).total, 2);
  return [
    [`Wie bestelle ich ein Taxi in ${o.name}?`, `Rufen Sie uns unter ${TEL} an oder senden Sie die Fahrtanfrage oben auf dieser Seite. Der Abholort ${o.name} ist bereits eingetragen. Wir bestätigen telefonisch.`],
    [`Wie weit ist es von ${o.name} nach Hagenow?`, `Die Fahrstrecke zwischen ${o.name} und unserem Standort in Hagenow beträgt etwa ${de(o.km)} km, die Fahrzeit rund ${o.min} Minuten.`],
    [`Was kostet eine Taxifahrt von ${o.name} nach Hagenow?`, `Nach dem Taxitarif (Tagtarif, ohne Zuschläge und Wartezeit) rund ${preis} € für etwa ${de(o.km)} km. Den Preis für Ihre genaue Strecke zeigt der Preisrechner.`],
    [`Fahren Sie in ${o.name} auch Krankenfahrten?`, `Ja, wir fahren Krankenfahrten für alle Krankenkassen, außerdem Kur- und Rehafahrten, Fahrten zur Chemo- und Bestrahlungstherapie sowie Behindertentransporte.`],
  ];
}

function renderOrt(o, orte) {
  const canonical = `${BASE}${url(o)}`;
  const preis = de(T.fare({ km: o.km, tarif: 'tag' }).total, 2);
  const qa = faq(o);
  const near = nearby(o, orte);
  const title = `Taxi ${o.name} – Wilck ab Hagenow, Tel. ${TEL}`;
  const desc = `Taxi in ${o.name}: Taxi Wilck aus Hagenow holt Sie ab – Krankenfahrten aller Kassen, Flughafen- und Bahntransfer, Großraumtaxi bis 8 Personen. Tel. ${TEL}.`;
  const schema = [
    { '@context': 'https://schema.org', ...SERVICE, areaServed: { '@type': 'Place', name: o.name, geo: { '@type': 'GeoCoordinates', latitude: o.lat, longitude: o.lon } } },
    breadcrumb([['Taxi Wilck', '/'], ['Fahrgebiet', '/fahrgebiet/'], [`Taxi ${o.name}`, url(o)]]),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const teile = o.ortsteile.length
    ? `<p>Wir fahren auch in den umliegenden Ortsteilen und Weilern: ${esc(joinDe(o.ortsteile))}.</p>` : '';
  return `${head({ title, desc, canonical, schema })}
<main id="main">
<section class="hero" style="padding:0" aria-labelledby="h1">
  <img src="/img/flotte-1600.jpg" srcset="/img/flotte-1000.jpg 900w, /img/flotte-1600.jpg 1600w, /img/flotte.jpg 3600w" sizes="100vw" width="3600" height="1537" alt="Taxi Wilck: silberner Großraumbus und beiges Taxi vor Wolkenhimmel" fetchpriority="high">
  <div class="in">
    <div class="hero-txt">
      <h1 id="h1">Taxi in ${esc(o.name)} – <b>mit dem Doppel-W.</b></h1>
      <p>Wir holen Sie in ${esc(o.name)} ab – pünktlich und zuverlässig, seit über 30 Jahren aus Hagenow.</p>
      <div><a class="decal" href="${TEL_HREF}" aria-label="Jetzt anrufen: ${TEL}"><span>Tel.</span><span>03883 72 32 40</span></a></div>
    </div>
    <form class="ride" id="fahrt" name="fahrt" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/danke.html" aria-labelledby="h-ride">
      <h2 id="h-ride">Fahrt anfragen</h2>
      <input type="hidden" name="form-name" value="fahrt">
      <p class="hp"><label>Nicht ausfüllen: <input name="bot-field"></label></p>
      <div class="two"><label>Name*<input name="name" required autocomplete="name"></label><label>Telefon*<input name="telefon" type="tel" required autocomplete="tel"></label></div>
      <label>Abholort*<input name="abholort" required autocomplete="street-address" placeholder="Straße, Ort" value="${esc(o.name)}"></label>
      <label>Ziel*<input name="ziel" required placeholder="Adresse, Klinik, Bahnhof, Flughafen …"></label>
      <div class="three"><label>Datum*<input name="datum" type="date" required id="d"></label><label>Uhrzeit*<input name="uhrzeit" type="time" required></label><label>Pers.*<input name="personen" type="number" min="1" max="8" value="1" required aria-label="Personenzahl"></label></div>
      <label class="consent"><input type="checkbox" name="datenschutz" required><span>Ich habe die <a href="/datenschutz.html">Datenschutzrichtlinie</a> gelesen und verstanden.*</span></label>
      <button class="btn red" type="submit">Fahrt anfragen →</button>
      <p class="note">Unverbindliche Anfrage – wir bestätigen telefonisch.</p>
    </form>
  </div>
</section>
<div class="facts" role="list">
  <div role="listitem"><strong>${de(o.km)} km</strong><span>von ${esc(o.name)} nach Hagenow</span></div>
  <div role="listitem"><strong>ca. ${o.min} Minuten</strong><span>Fahrzeit</span></div>
  <div role="listitem"><strong>Bis 8 Personen</strong><span>Großraumtaxi</span></div>
</div>

<section aria-labelledby="h-ort"><div class="wrap">
  <span class="eyebrow">Taxi ${esc(o.name)}</span>
  <h2 id="h-ort">Ihr Taxi in ${esc(o.name)} und Umgebung.</h2>
  <p>${esc(o.name)} liegt etwa ${de(o.km)} km (rund ${o.min} Minuten Fahrt) von unserem Standort in Hagenow entfernt. Ob Krankenfahrt, Bahn- oder Flughafentransfer, Schulweg oder Gruppenfahrt: Rufen Sie uns an unter <a href="${TEL_HREF}">${TEL}</a>, wir kümmern uns.</p>
  ${teile}
  <p>Eine Fahrt zwischen ${esc(o.name)} und Hagenow kostet nach dem Taxitarif rund <strong>${preis}&nbsp;€</strong> (Tagtarif, ohne Zuschläge und Wartezeit). Den Preis für Ihre genaue Strecke zeigt der <a href="/preisrechner.html">Preisrechner</a>.</p>
</div></section>

<section class="steps" aria-labelledby="h-faq"><div class="wrap">
  <span class="eyebrow">Häufige Fragen</span>
  <h2 id="h-faq">Taxi ${esc(o.name)}: Fragen und Antworten.</h2>
  ${qa.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n  ')}
</div></section>

<section aria-labelledby="h-near"><div class="wrap">
  <span class="eyebrow">Fahrgebiet</span>
  <h2 id="h-near">Auch in der Nähe von ${esc(o.name)}.</h2>
  <p>${near.map((n) => `<a href="${url(n)}">Taxi ${esc(n.name)}</a>`).join(' · ')} · <a href="/">Taxi Hagenow</a> · <a href="/fahrgebiet/">alle Orte im Fahrgebiet</a></p>
</div></section>
</main>
${FOOTER}
</body></html>
`;
}

const letter = (o) => o.name.charAt(0).toLocaleUpperCase('de');
const alpha = (orte) => [...orte].sort((a, b) => a.name.localeCompare(b.name, 'de'));

function renderUebersicht(orte) {
  const canonical = `${BASE}/fahrgebiet/`;
  const title = `Fahrgebiet: Taxi in Hagenow und Umgebung – Taxi Wilck`;
  const desc = `Taxi Wilck fährt in Hagenow und in ${orte.length} Orten der Umgebung, darunter Wittenburg, Pritzier, Redefin und Vellahn. Entfernungen, Fahrzeiten und Tel. ${TEL}.`;
  const schema = [{ '@context': 'https://schema.org', ...SERVICE, areaServed: [{ '@type': 'City', name: 'Hagenow' }, ...orte.map((o) => ({ '@type': 'Place', name: o.name }))] },
    breadcrumb([['Taxi Wilck', '/'], ['Fahrgebiet', '/fahrgebiet/']])];
  return `${head({ title, desc, canonical, schema, css: ['/rechner.css'] })}
<main id="main">
<section class="calc-hero"><div class="wrap">
  <span class="eyebrow">Fahrgebiet</span>
  <h1>Fahrgebiet: Taxi in Hagenow und Umgebung.</h1>
  <p class="lead">Von Hagenow aus fahren wir Sie in alle Orte der Umgebung. Wählen Sie Ihren Ort – die Anfrage ist dann schon ausgefüllt.</p>
  <div data-orte>
  <ul class="orte-liste">
    <li data-l="H"><a href="/"><strong>Hagenow</strong> <span>Standort</span></a></li>
    ${alpha(orte).map((o) => `<li data-l="${letter(o)}"><a href="${url(o)}"><strong>${esc(o.name)}</strong> <span>${de(o.km)} km · ca. ${o.min} Min.</span></a></li>`).join('\n    ')}
  </ul>
  </div>
  <script src="/orte-filter.js" defer></script>
  <p>Ihr Ort fehlt? Rufen Sie uns an unter <a href="${TEL_HREF}">${TEL}</a>, wir fahren auch darüber hinaus.</p>
</div></section>
</main>
${FOOTER}
</body></html>
`;
}

function renderSitemap(orte) {
  const urls = ['/', '/fahrgebiet/', '/preisrechner.html', ...orte.map(url)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
}

function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** Ortslinks für die Startseite (zwischen den Markern in index.html). */
function renderStartseitenBlock(orte) {
  return `<section id="fahrgebiet" aria-labelledby="h-gebiet"><div class="wrap">
  <span class="eyebrow">Fahrgebiet</span>
  <h2 id="h-gebiet">Taxi in Hagenow und in der ganzen Umgebung.</h2>
  <div data-orte>
  <p class="ortlinks">${alpha(orte).map((o) => `<a href="${url(o)}" data-l="${letter(o)}"><span class="sr">Taxi </span>${esc(o.name)}</a>`).join(' · ')}</p>
  </div>
  <script src="/orte-filter.js" defer></script>
  <p><a class="btn" href="/fahrgebiet/">Alle Orte im Fahrgebiet →</a></p>
</div></section>`;
}

const MARK = /<!--orte-start-->[\s\S]*?<!--orte-end-->/;
function injectStartseite(html, orte) {
  if (!MARK.test(html)) throw new Error('Marker <!--orte-start--> fehlt in index.html');
  return html.replace(MARK, () => `<!--orte-start-->\n${renderStartseitenBlock(orte)}\n<!--orte-end-->`);
}

function build() {
  const orte = JSON.parse(fs.readFileSync(path.join(__dirname, 'orte.json'), 'utf8'));
  for (const o of orte) write(`taxi-${o.slug}/index.html`, renderOrt(o, orte));
  const idx = path.join(ROOT, 'index.html');
  fs.writeFileSync(idx, injectStartseite(fs.readFileSync(idx, 'utf8'), orte));
  write('fahrgebiet/index.html', renderUebersicht(orte));
  write('sitemap.xml', renderSitemap(orte));
  console.log(`${orte.length} Ortsseiten, Übersicht und Sitemap geschrieben.`);
}

if (require.main === module) build();
module.exports = { injectStartseite, renderOrt, renderUebersicht, renderSitemap, build };
