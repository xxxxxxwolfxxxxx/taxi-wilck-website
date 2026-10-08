/* Holt pro Ort nachprüfbare Daten nach scripts/ortsinfos.json:
 * Gemeinde/Amt (Wikipedia), Einwohner (Wikidata, nur wenn der Ort selbst Gemeinde ist), Straßenstrecke zu festen Zielen (OSRM).
 * Aufruf: node scripts/fetch-ortsinfos.js */
const fs = require('fs'), path = require('path');
const orte = require('./orte.json');
const UA = { 'User-Agent': 'taxi-wilck-site/1.0 (info@taxi-wilck.de)' };
const get = async (url) => (await fetch(url, { headers: UA })).json();
const ALIAS = { Steegen: 'Pätow-Steegen' }; // Ortsteil ohne eigenen Artikel
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const ZIELE = [
  { id: 'bahnhof', name: 'Bahnhof Hagenow Land', lat: 53.4134, lon: 11.2153, pflicht: true },
  { id: 'klinik', name: 'Klinikum Hagenow', lat: 53.4343, lon: 11.1818, pflicht: true },
  { id: 'schwerin', name: 'Helios Kliniken Schwerin', lat: 53.6515, lon: 11.4085, pflicht: false },
];

async function wiki(titles, full) {
  const q = new URLSearchParams({ action: 'query', format: 'json', prop: 'extracts|pageprops', explaintext: '1', redirects: '1', ppprop: 'wikibase_item', titles });
  if (!full) q.set('exintro', '1');
  const p = Object.values((await get(`https://de.wikipedia.org/w/api.php?${q}`)).query.pages)[0];
  return { title: p.title, text: p.extract || '', qid: p.pageprops && p.pageprops.wikibase_item };
}

async function einwohner(qid) {
  const d = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${qid}&props=claims`);
  const cl = (d.entities[qid].claims.P1082 || []).map((c) => ({
    n: Number(c.mainsnak.datavalue && c.mainsnak.datavalue.value.amount), t: (c.qualifiers && c.qualifiers.P585 && c.qualifiers.P585[0].datavalue.value.time) || '' }));
  cl.sort((a, b) => b.t.localeCompare(a.t));
  return cl.length && cl[0].n > 0 ? { n: cl[0].n, jahr: cl[0].t.slice(1, 5) } : null;
}

const amtVon = (t) => (t.match(/vom Amt ([^.\n]+?) (?:mit Sitz|verwaltet)/) || t.match(/Sitz des Amtes ([^.,\n]+)/) || [])[1] || null;

(async () => {
  const out = {};
  for (const o of orte) {
    const info = { gemeinde: null, amt: null, einwohner: null, ziele: {} };
    try {
      let w = await wiki(ALIAS[o.name] || o.name);
      const istOrt = (x) => /ist eine (Gemeinde|Stadt)/.test(x.text) && /Ludwigslust-Parchim/.test(x.text);
      if (istOrt(w)) {
        if (w.title === o.name) {
          info.gemeinde = o.name; info.amt = amtVon(w.text);
          if (w.qid) info.einwohner = await einwohner(w.qid);
        } else if ((await wiki(w.title, true)).text.includes(o.name)) { // Ortsteil einer anderen Gemeinde
          info.gemeinde = w.title; info.amt = amtVon(w.text);
        }
      }
    } catch (e) { console.log(o.name, 'Wikipedia-Fehler', e.message); }
    for (const z of ZIELE) {
      try {
        const r = await get(`https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${z.lon},${z.lat}?overview=false`);
        const rt = r.routes[0];
        info.ziele[z.id] = { km: Math.round(rt.distance / 100) / 10, min: Math.max(1, Math.round(rt.duration / 60)) };
      } catch (e) { console.log(o.name, z.id, 'OSRM-Fehler'); }
      await pause(250);
    }
    out[o.slug] = info;
    console.log(o.name, '|', info.gemeinde, '|', info.amt, '|', info.einwohner && info.einwohner.n, '|', JSON.stringify(info.ziele));
    await pause(250);
  }
  fs.writeFileSync(path.join(__dirname, 'ortsinfos.json'), JSON.stringify({ ziele: ZIELE, orte: out }, null, 1));
})();
