/* Einmalig/bei Bedarf: Orte im Radius um den Betriebssitz aus OpenStreetMap holen,
   Fahrstrecke per OSRM berechnen und als orte.json ablegen.  Aufruf: node scripts/fetch-orte.js */
const fs = require('node:fs'), path = require('node:path');
const SITZ = { lat: 53.4249388, lon: 11.1907434 }, RADIUS_M = 15000;
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
const UA = { 'User-Agent': 'taxi-wilck-build/1.0 (info@taxi-wilck.de)', Accept: '*/*' };
// Keine eigenen Seiten: Einzelgehöfte/Flurnamen ohne Ortscharakter, Hagenow selbst (= Startseite)
const SKIP = new Set(['Ausbau', 'Mühle', 'Rote Mühle', 'Zwölf Apostel', 'Kraaker Tannen', 'Ruhetal', 'Bahnhof-Pritzier', 'Bakendorf Siedlung', 'Hof Gramnitz']);
const HAGENOW_TEILE = new Set(['Friedrichshof', 'Neue Heimat', 'Hagenow Land', 'Kietz', 'Hagenow-Heide', 'Sudenhof', 'Hagenow']);

const air = (a, b) => { const r = Math.PI / 180, x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const slug = (s) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const q = `[out:json][timeout:60];node(around:${RADIUS_M},${SITZ.lat},${SITZ.lon})["place"~"^(town|village|hamlet|suburb)$"]["name"];out;`;
  const res = await fetch(OVERPASS, { method: 'POST', headers: UA, body: new URLSearchParams({ data: q }) });
  if (!res.ok) throw new Error('Overpass ' + res.status);
  const els = (await res.json()).elements.map((e) => ({ name: e.tags.name, place: e.tags.place, lat: e.lat, lon: e.lon }))
    .filter((e) => !SKIP.has(e.name) && !(HAGENOW_TEILE.has(e.name) && air(SITZ, e) < 3.2));
  const hauptorte = els.filter((e) => e.place === 'town' || e.place === 'village');
  const weiler = els.filter((e) => e.place === 'hamlet' || e.place === 'suburb');
  const orte = hauptorte.map((e) => ({ name: e.name, slug: slug(e.name), lat: e.lat, lon: e.lon, ortsteile: [] }));
  for (const w of weiler) {   // Weiler dem nächstgelegenen Dorf zuordnen
    const best = orte.reduce((m, o) => (air(o, w) < air(m, w) ? o : m));
    best.ortsteile.push(w.name);
  }
  for (const o of orte) {
    const r = await fetch(OSRM + `${SITZ.lon},${SITZ.lat};${o.lon},${o.lat}?overview=false`, { headers: UA });
    const j = await r.json();
    if (j.code !== 'Ok') throw new Error('OSRM ' + o.name);
    o.km = Math.round(j.routes[0].distance / 100) / 10;
    o.min = Math.round(j.routes[0].duration / 60);
    o.ortsteile.sort((a, b) => a.localeCompare(b, 'de'));
    await new Promise((s) => setTimeout(s, 300));
  }
  orte.sort((a, b) => a.km - b.km);
  fs.writeFileSync(path.join(__dirname, 'orte.json'), JSON.stringify(orte, null, 2) + '\n');
  console.log(orte.length + ' Orte:', orte.map((o) => `${o.name} ${o.km}km/${o.min}min (+${o.ortsteile.length})`).join('; '));
}
main().catch((e) => { console.error(e); process.exit(1); });
