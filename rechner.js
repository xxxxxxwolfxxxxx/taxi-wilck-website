/* Preisrechner-Oberfläche: Geocoding (OSM Nominatim), Route (OSRM), Tarif aus tarif.js */
(function () {
  const SITZ = { lat: 53.4249388, lon: 11.1907434, label: 'Betriebssitz Am Hasselsort 4, Hagenow' };
  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
  // Pflichtfahrgebiet 1 = Altkreis Ludwigslust (§ 2 Taxenordnung), Pflichtfahrgebiet 2 = Altkreis Parchim
  const ALTKREIS_LWL = ['ludwigslust', 'hagenow', 'boizenburg', 'lübtheen', 'stralendorf', 'zarrentin', 'wittenburg', 'grabow', 'neustadt-glewe', 'dömitz', 'malliß'];
  const ALTKREIS_PCH = ['parchim', 'crivitz', 'goldberg', 'plau', 'eldenburg', 'lübz', 'sternberg', 'banzkow', 'ostufer'];
  const $ = (id) => document.getElementById(id);
  const eur = (n) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function geocode(q) {
    const url = NOMINATIM + '?format=jsonv2&addressdetails=1&limit=1&countrycodes=de&viewbox=10.2,54.0,12.4,53.0&accept-language=de&q=' + encodeURIComponent(q);
    const res = await fetch(url);
    if (!res.ok) throw new Error('geocode');
    const hit = (await res.json())[0];
    if (!hit) return null;
    return { lat: +hit.lat, lon: +hit.lon, label: hit.display_name, a: hit.address || {} };
  }

  async function route(points) {
    const res = await fetch(OSRM + points.map((p) => p.lon + ',' + p.lat).join(';') + '?overview=false');
    if (!res.ok) throw new Error('route');
    const j = await res.json();
    if (j.code !== 'Ok' || !j.routes[0]) throw new Error('route');
    return { km: j.routes[0].distance / 1000, min: j.routes[0].duration / 60 };
  }

  /** Ort einordnen: in Hagenow? im Pflichtfahrgebiet (Altkreis Ludwigslust)? null = nicht sicher bestimmbar */
  function classify(g) {
    const a = g.a, names = [a.town, a.city, a.village, a.municipality, a.hamlet].filter(Boolean).map((s) => s.toLowerCase());
    const inSitz = names.includes('hagenow');
    if (a.county && a.county !== 'Ludwigslust-Parchim') return { inSitz: false, pflicht: false };
    if (inSitz || names.some((n) => ALTKREIS_LWL.some((k) => n.includes(k)))) return { inSitz, pflicht: true };
    if (names.some((n) => ALTKREIS_PCH.some((k) => n.includes(k)))) return { inSitz: false, pflicht: false };
    return { inSitz: false, pflicht: a.county ? null : false };
  }

  function row(label, value, cls) {
    const li = document.createElement('li'); if (cls) li.className = cls;
    const l = document.createElement('span'); l.textContent = label;
    const v = document.createElement('strong'); v.textContent = value;
    li.append(l, v); return li;
  }
  function note(text, cls) { const p = document.createElement('p'); p.className = 'rnote ' + (cls || ''); p.textContent = text; return p; }

  async function calculate(ev) {
    ev.preventDefault();
    const out = $('result'), btn = $('go');
    out.replaceChildren(); btn.disabled = true; btn.textContent = 'Berechne …';
    try {
      const s = await geocode($('start').value); await sleep(1100);
      const z = await geocode($('ziel').value);
      if (!s || !z) { out.append(note('Eine Adresse wurde nicht gefunden. Bitte Straße, Hausnummer und Ort angeben – oder rufen Sie uns kurz an: 03883 723240.', 'warn')); return; }

      const cs = classify(s), cz = classify(z);
      const rule = Tarif.meterRule({ startInSitz: cs.inSitz, destInSitz: cz.inSitz, startPflicht: cs.pflicht, destPflicht: cz.pflicht });
      const legs = rule.ab === 'betriebssitz' ? [SITZ, s, z] : [s, z];
      const r = await route(legs);

      const start = Tarif.parseLocal($('datum').value, $('zeit').value);
      const tz = Tarif.tarifFor(start);
      const waitMin = $('warte-an').checked ? Math.max(0, +$('warte').value || 0) : 0;
      const opts = { km: r.km, tarif: tz.tarif, waitMin, grossraum: $('gross').checked, rollstuhl: $('rolli').checked, umsetzen: $('umsetz').checked };
      const f = Tarif.fare(opts);

      const head = document.createElement('div'); head.className = 'rhead';
      const lab = document.createElement('span'); lab.textContent = rule.mode === 'festtarif' ? 'Voraussichtlicher Fahrpreis (Tarifberechnung)' : 'Tarifwert zur Orientierung (kein Festpreis)';
      const big = document.createElement('strong'); big.textContent = 'ca. ' + eur(f.total);
      head.append(lab, big);

      const ul = document.createElement('ul'); ul.className = 'rlist';
      ul.append(row('Entfernung', r.km.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' km' + (rule.ab === 'betriebssitz' ? ' (inkl. Anfahrt ab Betriebssitz)' : '')));
      ul.append(row('Tarif', tz.tarif === 'tag' ? 'Tagtarif' : (tz.grund === 'Sonntag' || !/Nacht/.test(tz.grund) ? 'Sonn- und Feiertagstarif (' + tz.grund + ')' : 'Nachttarif')));
      ul.append(row('Grundpreis', eur(f.grund)));
      ul.append(row('Fahrpreis nach Kilometerstaffel', eur(f.fahrt)));
      if (f.warte) ul.append(row('Wartezeit (' + waitMin + ' Min.)', eur(f.warte)));
      if (f.grossraum) ul.append(row('Zuschlag Großraumtaxi', eur(f.grossraum)));
      if (f.inklusion) ul.append(row(opts.umsetzen ? 'Zuschlag Umsetzen (2 Transportpersonen)' : 'Zuschlag Rollstuhlbeförderung', eur(f.inklusion)));
      out.append(head, ul);

      if (rule.mode === 'frei') out.append(note('Ihr Ziel liegt voraussichtlich außerhalb unseres Pflichtfahrgebiets. Dort kann der Fahrpreis frei vereinbart werden – wir nennen Ihnen den Preis vor Fahrtantritt. Kommt keine Vereinbarung zustande, gilt ersatzweise der Tarif der Taxenordnung.', 'info'));
      if (rule.mode === 'unklar') out.append(note('Ob Abholung und Ziel im Pflichtfahrgebiet liegen, konnte nicht sicher bestimmt werden. Bitte rufen Sie uns an, dann klären wir die Preisregelung vor der Fahrt.', 'warn'));
      if (rule.ab === 'start' && !cs.inSitz && cz.inSitz) out.append(note('Ziel in Hagenow: Der Taxameter läuft erst ab Ihrem Abholort.', 'info'));
      if (rule.ab === 'betriebssitz') out.append(note('Abholung außerhalb von Hagenow: Der Taxameter wird bei Abfahrt am Betriebssitz in Hagenow eingeschaltet (§ 12 der Taxenordnung).', 'info'));
      if (Tarif.crossesTarifChange(start, r.min + waitMin)) {
        const other = Tarif.fare({ ...opts, tarif: tz.tarif === 'tag' ? 'nacht' : 'tag' });
        out.append(note('Ihre Fahrt überschreitet voraussichtlich eine Tarifgrenze (6:00 bzw. 22:00 Uhr). Die Taxenordnung regelt nicht ausdrücklich, wie ein Wechsel während der Fahrt abgerechnet wird. Der Preis kann zwischen ' + eur(Math.min(f.total, other.total)) + ' und ' + eur(Math.max(f.total, other.total)) + ' liegen.', 'warn'));
      }
      const geo = document.createElement('p'); geo.className = 'rgeo';
      geo.textContent = 'Erkannt – Start: ' + s.label + ' · Ziel: ' + z.label;
      out.append(geo);
      out.append(note('Tarifberechnung, keine verbindliche Preiszusage oder Buchung. Der tatsächliche Fahrpreis richtet sich nach dem Taxameter und kann insbesondere durch Wartezeiten, Zuschläge, die tatsächlich gefahrene Strecke oder besondere Beförderungsbedingungen abweichen.'));
      out.focus();
    } catch (e) {
      out.append(note('Die Berechnung ist gerade nicht möglich (Karten-Dienst nicht erreichbar). Bitte rufen Sie uns an: 03883 723240.', 'warn'));
    } finally {
      btn.disabled = false; btn.textContent = 'Preis berechnen →';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const now = new Date(), p2 = (n) => String(n).padStart(2, '0');
    $('datum').value = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate());
    $('zeit').value = p2(now.getHours()) + ':' + p2(now.getMinutes());
    $('warte-an').addEventListener('change', (e) => { $('warte-box').hidden = !e.target.checked; });
    $('umsetz').addEventListener('change', (e) => { if (e.target.checked) $('rolli').checked = true; });
    $('rolli').addEventListener('change', (e) => { if (!e.target.checked) $('umsetz').checked = false; });
    $('calc').addEventListener('submit', calculate);
  });
})();
