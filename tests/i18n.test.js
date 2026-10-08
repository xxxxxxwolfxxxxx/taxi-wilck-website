const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const SITE = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const en = JSON.parse(read('i18n/en.json'));
const FULL = ['pl', 'ru', 'uk', 'tr', 'ar'];
const CORE = ['fr', 'es', 'it', 'nl', 'cs', 'hu', 'ro', 'bg', 'el', 'pt', 'da', 'sv'];
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const links = (s) => (s.match(/href="[^"]+"/g) || []).sort().join(',');

function usedKeys() {
  const files = ['index.html', 'preisrechner.html', 'fahrgebiet/index.html', 'taxi-kuhstorf/index.html', 'scripts/templates/header.html', 'scripts/templates/footer.html', 'scripts/templates/ride-form.html', 'nav.js', 'standort.js', 'orte-filter.js'];
  const keys = new Set();
  for (const f of files) {
    if (!fs.existsSync(path.join(SITE, f))) continue;
    const t = read(f);
    for (const m of t.matchAll(/data-i18n(?:-html)?="([\w.]+)"/g)) keys.add(m[1]);
    for (const m of t.matchAll(/data-i18n-attr="([^"]+)"/g)) m[1].split(';').forEach((p) => keys.add(p.split(':')[1]));
    for (const m of t.matchAll(/\bt\('([\w.]+)'/g)) keys.add(m[1]);
    for (const m of t.matchAll(/data-i18n', '([\w.]+)'/g)) keys.add(m[1]);
    for (const m of t.matchAll(/\['[^']*', '[^']*', '([\w.]+)'/g)) keys.add(m[1]); // nav.js-Linkliste
  }
  return keys;
}

test('Englisch deckt alle im HTML/JS verwendeten Schlüssel ab', () => {
  const missing = [...usedKeys()].filter((k) => !(k in en));
  assert.deepEqual(missing, []);
});

test('Vollständige Sprachen haben alle Schlüssel, Platzhalter und Links wie Englisch', () => {
  for (const c of FULL) {
    const d = JSON.parse(read(`i18n/${c}.json`));
    assert.deepEqual(Object.keys(en).filter((k) => !(k in d)), [], c + ' fehlt');
    for (const k of Object.keys(d)) { assert.equal(vars(d[k]), vars(en[k]), `${c}:${k} Platzhalter`); assert.equal(links(d[k]), links(en[k]), `${c}:${k} Links`); }
  }
});

test('Kernsprachen: nur bekannte Schlüssel, gleiche Platzhalter/Links, Bestell-Kern vollständig', () => {
  const must = ['form.title', 'form.pickup', 'form.name', 'form.phone', 'form.submit', 'form.consent', 'form.now', 'form.later', 'nav.call', 'geo.btn', 'hero.h1a', 'p.q1', 'p.a1'];
  for (const c of CORE) {
    const d = JSON.parse(read(`i18n/${c}.json`));
    for (const k of Object.keys(d)) { assert.ok(k in en, `${c}:${k} unbekannt`); assert.equal(vars(d[k]), vars(en[k]), `${c}:${k} Platzhalter`); assert.equal(links(d[k]), links(en[k]), `${c}:${k} Links`); }
    for (const k of must) assert.ok(d[k], `${c}:${k} fehlt`);
  }
});

test('Sprachumschalter kennt jede Sprachdatei und jede Flagge existiert', () => {
  const js = read('i18n.js');
  for (const c of ['en', ...FULL, ...CORE]) assert.ok(js.includes(`['${c}',`), c);
  for (const m of js.matchAll(/\['(\w\w)', '[^']+', '(\w\w)'\]/g)) assert.ok(fs.existsSync(path.join(SITE, 'img/flags', m[2] + '.svg')), m[2]);
});

test('Formulare tragen die gewählte Sprache und der Doppel-W-Satz ist weg', () => {
  assert.match(read('scripts/templates/ride-form.html'), /name="sprache"/);
  assert.ok(!read('index.html').includes('Doppel-W'));
});
