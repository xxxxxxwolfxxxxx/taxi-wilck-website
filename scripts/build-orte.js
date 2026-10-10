/* Erzeugt die Orts-Landingpages (/taxi-<ort>/), die Fahrgebiet-Übersicht und sitemap.xml
   aus scripts/orte.json und befüllt Header/Footer der statischen Seiten (index, preisrechner).  Aufruf: node scripts/build-orte.js  (Ergebnis wird committet) */
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

const { HEADER, FOOTER, rideForm, injectPartials } = require('./partials.js');

const head = ({ title, desc, canonical, schema, css = [] }) => `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${BASE}/img/og.jpg"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}">
<meta name="theme-color" content="#1f2023"><link rel="stylesheet" href="/styles.css">${css.map((c) => `<link rel="stylesheet" href="${c}">`).join('')}<link rel="icon" href="/img/logo.svg">
${schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body>
${HEADER}`;

const SERVICE = {
  '@type': 'TaxiService', name: 'Taxi- und Fuhrbetrieb Wilfried Wilck', image: `${BASE}/img/og.jpg`, url: `${BASE}/`,
  telephone: '+493883723240', email: 'info@taxi-wilck.de',
  address: { '@type': 'PostalAddress', streetAddress: 'Am Hasselsort 4', postalCode: '19230', addressLocality: 'Hagenow', addressCountry: 'DE' },
  geo: { '@type': 'GeoCoordinates', latitude: 53.4249388, longitude: 11.1907434 },
};

const breadcrumb = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: BASE + href })),
});

const DATEN = path.join(__dirname, 'ortsinfos.json');
const preisTag = (km) => de(T.fare({ km, tarif: 'tag' }).total, 2);

/** Einleitungssatz aus geprüften Daten (Wikipedia/Wikidata); leer, wenn nichts gesichert ist. */
function herkunft(o, info) {
  if (!info || !info.gemeinde) return '';
  const amt = info.amt ? ` im Amt ${info.amt}` : '';
  if (info.gemeinde !== o.name) return `${o.name} gehört zur Gemeinde ${info.gemeinde}${amt}.`;
  const ew = info.einwohner ? ` mit rund ${info.einwohner.n.toLocaleString('de-DE')} Einwohnern (Stand ${info.einwohner.jahr})` : '';
  return `${o.name} ist ${o.name === 'Wittenburg' ? 'eine Stadt' : 'eine Gemeinde'}${amt}${ew}.`;
}

/** Platzhalter-Werte für die Übersetzung (data-i18n-vars); Zahlen bleiben Zahlen, die Sprache formatiert sie. */
const vars = (v) => ` data-i18n-vars='${JSON.stringify(v).replace(/'/g, '&#39;')}'`;
const preisNum = (km) => T.fare({ km, tarif: 'tag' }).total;

/** Fragen/Antworten pro Ort – Text und Schema kommen aus derselben Quelle. Dritter Eintrag: Übersetzungsschlüssel + Werte. */
function faq(o, info, ziele) {
  const qa = [
    [`Wie bestelle ich ein Taxi in ${o.name}?`, `Rufen Sie uns unter ${TEL} an oder senden Sie die Fahrtanfrage oben auf dieser Seite. Der Abholort ${o.name} ist bereits eingetragen. Wir bestätigen telefonisch.`, { qk: 'p.q1', ak: 'p.a1', v: { name: o.name, tel: TEL } }],
    [`Wie weit ist es von ${o.name} nach Hagenow?`, `Die Fahrstrecke zwischen ${o.name} und unserem Standort in Hagenow beträgt etwa ${de(o.km)} km, die Fahrzeit rund ${o.min} Minuten.`, { qk: 'p.q2', ak: 'p.a2', v: { name: o.name, km: o.km, min: o.min } }],
    [`Was kostet eine Taxifahrt von ${o.name} nach Hagenow?`, `Nach dem Taxitarif (Tagtarif, ohne Zuschläge und Wartezeit) rund ${preisTag(o.km)} € für etwa ${de(o.km)} km. Den Preis für Ihre genaue Strecke zeigt der Preisrechner.`, { qk: 'p.q3', ak: 'p.a3', v: { name: o.name, km: o.km, preis: preisNum(o.km) } }],
  ];
  const z = info && info.ziele;
  if (!z || !z.bahnhof || !z.klinik || !z.schwerin) {
    return [...qa, [`Fahren Sie in ${o.name} auch Krankenfahrten?`, 'Ja, wir fahren Krankenfahrten für alle Krankenkassen, außerdem Kur- und Rehafahrten, Fahrten zur Chemo- und Bestrahlungstherapie sowie Behindertentransporte.', { qk: 'p.q5', ak: 'p.a5b', v: { name: o.name } }]];
  }
  return [...qa,
    [`Wie komme ich von ${o.name} zum Bahnhof Hagenow?`, `Zum Bahnhof Hagenow Land sind es ab ${o.name} etwa ${de(z.bahnhof.km)} km, die Fahrt dauert rund ${z.bahnhof.min} Minuten und kostet nach dem Tagtarif etwa ${preisTag(z.bahnhof.km)} €. Bestellen Sie das Taxi gern vorab unter ${TEL}.`, { qk: 'p.q4', ak: 'p.a4', v: { name: o.name, km: z.bahnhof.km, min: z.bahnhof.min, preis: preisNum(z.bahnhof.km), tel: TEL } }],
    [`Fahren Sie in ${o.name} auch Krankenfahrten?`, `Ja, für alle Krankenkassen. Zum Klinikum Hagenow sind es ab ${o.name} etwa ${de(z.klinik.km)} km (rund ${z.klinik.min} Minuten), zu den Helios Kliniken Schwerin etwa ${de(z.schwerin.km)} km (rund ${z.schwerin.min} Minuten). Wir fahren außerdem Kur- und Rehafahrten, Fahrten zur Chemo- und Bestrahlungstherapie sowie Behindertentransporte.`, { qk: 'p.q5', ak: 'p.a5', v: { name: o.name, km1: z.klinik.km, min1: z.klinik.min, km2: z.schwerin.km, min2: z.schwerin.min } }],
  ];
}

/** Tabelle „Typische Fahrten ab <Ort>“ – Preis nur für Ziele im Pflichtfahrgebiet, sonst Preis vor Fahrtantritt. */
function zieltabelle(o, info, ziele) {
  if (!info || !ziele || !ziele.every((z) => info.ziele && info.ziele[z.id])) return '';
  const rows = ziele.map((z) => {
    const r = info.ziele[z.id];
    const preis = z.pflicht ? `<span data-i18n="p.t.price"${vars({ preis: preisNum(r.km) })}>ca. ${preisTag(r.km)}&nbsp;€</span>` : '<span data-i18n="p.t.vor">Preis vor Fahrtantritt</span>';
    const zname = { bahnhof: 'p.z.bahnhof', klinik: 'p.z.klinik' }[z.id];
    return `<tr><th scope="row"${zname ? ` data-i18n="${zname}"` : ''}>${esc(z.name)}</th><td data-label="Strecke" data-i18n-attr="data-label:p.t.dist">${de(r.km)} km</td><td data-label="Fahrzeit" data-i18n-attr="data-label:p.fact.drive"><span data-i18n="p.t.min"${vars({ min: r.min })}>ca. ${r.min} Min.</span></td><td data-label="Tagtarif" data-i18n-attr="data-label:p.t.fare">${preis}</td></tr>`;
  }).join('\n      ');
  return `<h3 data-i18n="p.t.h3"${vars({ name: o.name })}>Typische Fahrten ab ${esc(o.name)}</h3>
  <table class="ex ziele"><thead><tr><th scope="col" data-i18n="p.t.dest">Ziel</th><th scope="col" data-i18n="p.t.dist">Strecke</th><th scope="col" data-i18n="p.fact.drive">Fahrzeit</th><th scope="col" data-i18n="p.t.fare">Tagtarif</th></tr></thead><tbody>
      ${rows}</tbody></table>
  <p class="small" data-i18n="p.t.note">Preise nach dem Taxitarif (Tagtarif, ohne Zuschläge und Wartezeit). Schwerin liegt außerhalb unseres Pflichtfahrgebiets, dort nennen wir Ihnen den Preis vor Fahrtantritt.</p>`;
}

function renderOrt(o, orte, info = null, ziele = null) {
  const canonical = `${BASE}${url(o)}`;
  const preis = preisTag(o.km);
  const qa = faq(o, info, ziele);
  const near = nearby(o, orte);
  const title = `Taxi ${o.name} – Wilck ab Hagenow, Tel. ${TEL}`;
  const desc = `Taxi in ${o.name}: Taxi Wilck aus Hagenow holt Sie ab – Krankenfahrten aller Kassen, Flughafen- und Bahntransfer, Großraumtaxi bis 8 Personen. Tel. ${TEL}.`;
  const schema = [
    { '@context': 'https://schema.org', ...SERVICE, areaServed: { '@type': 'Place', name: o.name, ...(info && info.plz ? { address: { '@type': 'PostalAddress', postalCode: info.plz, addressLocality: o.name, addressCountry: 'DE' } } : {}), geo: { '@type': 'GeoCoordinates', latitude: o.lat, longitude: o.lon } } },
    breadcrumb([['Taxi Wilck', '/'], ['Fahrgebiet', '/fahrgebiet/'], [`Taxi ${o.name}`, url(o)]]),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const teile = o.ortsteile.length
    ? `<p data-i18n="p.parts"${vars({ list: o.ortsteile.join(', ') })}>Wir fahren auch in den umliegenden Ortsteilen und Weilern: ${esc(joinDe(o.ortsteile))}.</p>` : '';
  const plz = info && info.plz;
  const abholort = plz ? `${plz} ${o.name}` : o.name;
  const her = herkunft(o, info);
  const tabelle = zieltabelle(o, info, ziele);
  return `${head({ title, desc, canonical, schema, css: tabelle ? ['/rechner.css'] : [] })}
<main id="main">
<section class="hero" style="padding:0" aria-labelledby="h1">
  <div class="in">
    <div class="hero-txt">
      <h1 id="h1"><span data-i18n="p.h1a"${vars({ name: o.name })}>Taxi in ${esc(o.name)}.</span> <b data-i18n="p.h1b">Wir holen Sie ab.</b></h1>
      <p data-i18n="p.hero">Pünktlich und zuverlässig, seit über 30 Jahren ab Hagenow.</p>
      <div><a class="decal" href="${TEL_HREF}" aria-label="Jetzt anrufen: ${TEL}"><span data-i18n="tel.short">Tel.</span><span>03883 72 32 40</span></a></div>
    </div>
    <div class="model" data-model><img src="/img/modell/t015.webp" width="1400" height="600" alt="Taxi Wilck: Taxi als 3D-Modell" data-i18n-attr="alt:model.alt" fetchpriority="high" draggable="false"></div>
    ${rideForm(abholort)}
  </div>
</section>
<div class="facts" role="list">
  <div role="listitem"><strong>${de(o.km)} km</strong><span data-i18n="p.fact.from"${vars({ name: o.name })}>von ${esc(o.name)} nach Hagenow</span></div>
  <div role="listitem"><strong data-i18n="p.fact.min"${vars({ min: o.min })}>ca. ${o.min} Minuten</strong><span data-i18n="p.fact.drive">Fahrzeit</span></div>
  <div role="listitem"><strong data-i18n="fact.up8">Bis 8 Personen</strong><span data-i18n="p.fact.van">Großraumtaxi</span></div>
</div>

<section aria-labelledby="h-ort"><div class="wrap">
  <span class="eyebrow" data-i18n="p.eyebrow"${vars({ name: o.name })}>Taxi ${esc(o.name)}</span>
  <h2 id="h-ort" data-i18n="p.h2"${vars({ name: o.name })}>Ihr Taxi in ${esc(o.name)} und Umgebung.</h2>
  <p>${her ? `<span data-de-only>${esc(her)} </span>` : ''}<span data-i18n-html="p.intro"${vars({ name: o.name, plz: plz ? ` (${plz})` : '', km: o.km, min: o.min })}>${esc(o.name)}${plz ? ` (${plz})` : ''} liegt etwa ${de(o.km)} km (rund ${o.min} Minuten Fahrt) von unserem Standort in Hagenow entfernt. Ob Krankenfahrt, Bahn- oder Flughafentransfer, Schulweg oder Gruppenfahrt: Rufen Sie uns an unter <a href="${TEL_HREF}">${TEL}</a>, wir kümmern uns.</span></p>
  ${teile}
  <p data-i18n-html="p.price"${vars({ name: o.name, preis: preisNum(o.km) })}>Eine Fahrt zwischen ${esc(o.name)} und Hagenow kostet nach dem Taxitarif rund <strong>${preis}&nbsp;€</strong> (Tagtarif, ohne Zuschläge und Wartezeit). Den Preis für Ihre genaue Strecke zeigt der <a href="/preisrechner.html">Preisrechner</a>.</p>
  ${tabelle}
</div></section>

<section class="steps" aria-labelledby="h-faq"><div class="wrap">
  <span class="eyebrow" data-i18n="p.faq.eyebrow">Häufige Fragen</span>
  <h2 id="h-faq" data-i18n="p.faq.h2"${vars({ name: o.name })}>Taxi ${esc(o.name)}: Fragen und Antworten.</h2>
  ${qa.map(([q, a, m]) => `<h3 data-i18n="${m.qk}"${vars({ name: o.name })}>${esc(q)}</h3><p data-i18n="${m.ak}"${vars(m.v)}>${esc(a)}</p>`).join('\n  ')}
</div></section>

<section aria-labelledby="h-near"><div class="wrap">
  <span class="eyebrow" data-i18n="nav.area">Fahrgebiet</span>
  <h2 id="h-near" data-i18n="p.near.h2"${vars({ name: o.name })}>Auch in der Nähe von ${esc(o.name)}.</h2>
  <p>${near.map((n) => `<a href="${url(n)}">Taxi ${esc(n.name)}</a>`).join(' · ')} · <a href="/">Taxi Hagenow</a> · <a href="/fahrgebiet/" data-i18n="p.near.all">alle Orte im Fahrgebiet</a></p>
</div></section>
</main>
${FOOTER}
</body></html>
`;
}

const letter = (o) => o.name.charAt(0).toLocaleUpperCase('de');
const alpha = (orte) => [...orte].sort((a, b) => a.name.localeCompare(b.name, 'de'));

function renderUebersicht(orte, infos = {}) {
  const canonical = `${BASE}/fahrgebiet/`;
  const title = `Fahrgebiet: Taxi in Hagenow und Umgebung – Taxi Wilck`;
  const desc = `Taxi Wilck fährt in Hagenow und in ${orte.length} Orten der Umgebung, darunter Wittenburg, Pritzier, Redefin und Vellahn. Entfernungen, Fahrzeiten und Tel. ${TEL}.`;
  const schema = [{ '@context': 'https://schema.org', ...SERVICE, areaServed: [{ '@type': 'City', name: 'Hagenow' }, ...orte.map((o) => ({ '@type': 'Place', name: o.name }))] },
    breadcrumb([['Taxi Wilck', '/'], ['Fahrgebiet', '/fahrgebiet/']])];
  return `${head({ title, desc, canonical, schema, css: ['/rechner.css'] })}
<main id="main">
<section class="calc-hero"><div class="wrap">
  <span class="eyebrow" data-i18n="nav.area">Fahrgebiet</span>
  <h1 data-i18n="ov.h1">Fahrgebiet: Taxi in Hagenow und Umgebung.</h1>
  <p class="lead" data-i18n="ov.lead">Von Hagenow aus fahren wir Sie in alle Orte der Umgebung. Wählen Sie Ihren Ort – die Anfrage ist dann schon ausgefüllt.</p>
  <div data-orte>
  <ul class="orte-liste">
    <li data-l="H"><a href="/"><strong>Hagenow</strong> <span data-i18n="ov.home">Standort</span></a></li>
    ${alpha(orte).map((o) => `<li data-l="${letter(o)}"><a href="${url(o)}"><strong>${esc(o.name)}</strong> ${(() => { const plz = infos[o.slug] && infos[o.slug].plz; return `<span data-i18n="${plz ? 'ov.meta.plz' : 'ov.meta'}"${vars({ plz, km: o.km, min: o.min })}>${plz ? `PLZ ${plz} · ` : ''}${de(o.km)} km · ca. ${o.min} Min.</span>`; })()}</a></li>`).join('\n    ')}
  </ul>
  </div>
  <script src="/orte-filter.js" defer></script>
  <p data-i18n-html="ov.missing">Ihr Ort fehlt? Rufen Sie uns an unter <a href="${TEL_HREF}">${TEL}</a>, wir fahren auch darüber hinaus.</p>
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
  <span class="eyebrow" data-i18n="nav.area">Fahrgebiet</span>
  <h2 id="h-gebiet" data-i18n="area.h2">Taxi in Hagenow und in der ganzen Umgebung.</h2>
  <div data-orte>
  <p class="ortlinks">${alpha(orte).map((o) => `<a href="${url(o)}" data-l="${letter(o)}"><span class="sr">Taxi </span>${esc(o.name)}</a>`).join(' · ')}</p>
  </div>
  <script src="/orte-filter.js" defer></script>
  <p><a class="btn" href="/fahrgebiet/" data-i18n="area.all">Alle Orte im Fahrgebiet →</a></p>
</div></section>`;
}

const MARK = /<!--orte-start-->[\s\S]*?<!--orte-end-->/;
function injectStartseite(html, orte) {
  if (!MARK.test(html)) throw new Error('Marker <!--orte-start--> fehlt in index.html');
  return html.replace(MARK, () => `<!--orte-start-->\n${renderStartseitenBlock(orte)}\n<!--orte-end-->`);
}

function build() {
  const orte = JSON.parse(fs.readFileSync(path.join(__dirname, 'orte.json'), 'utf8'));
  const daten = fs.existsSync(DATEN) ? JSON.parse(fs.readFileSync(DATEN, 'utf8')) : { ziele: null, orte: {} };
  for (const o of orte) write(`taxi-${o.slug}/index.html`, renderOrt(o, orte, daten.orte[o.slug], daten.ziele));
  const idx = path.join(ROOT, 'index.html');
  fs.writeFileSync(idx, injectPartials(injectStartseite(fs.readFileSync(idx, 'utf8'), orte)));
  const calc = path.join(ROOT, 'preisrechner.html');
  fs.writeFileSync(calc, injectPartials(fs.readFileSync(calc, 'utf8')));
  write('fahrgebiet/index.html', renderUebersicht(orte, daten.orte));
  write('sitemap.xml', renderSitemap(orte));
  console.log(`${orte.length} Ortsseiten, Übersicht und Sitemap geschrieben.`);
}

if (require.main === module) build();
module.exports = { injectPartials, injectStartseite, renderOrt, renderUebersicht, renderSitemap, build };
