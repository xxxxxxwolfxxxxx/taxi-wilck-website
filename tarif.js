/* Tariflogik Taxi Wilck Hagenow.
   Quelle: Taxenordnung Landkreis Ludwigslust-Parchim, Lesefassung (6. Änderungsverordnung, in Kraft seit 01.01.2026),
   § 12 Beförderungsentgelte, § 13 Zuschläge. Alle Beträge intern in Cent. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Tarif = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TARIF = {
    stand: '01.01.2026',
    tag:   { grund: 420, stufen: [[2, 360], [4, 310], [Infinity, 260]] },   // § 12 Abs. 3: T1 1.–2. km, T2 3.–4. km, T3 ab 5. km
    nacht: { grund: 460, stufen: [[2, 380], [4, 340], [Infinity, 310]] },   // TN1–TN3
    wartePerStunde: 4500,   // § 12 Abs. 4
    schritt: 10,            // § 12 Abs. 5: Fortschaltstufe 0,10 €
    grossraum: 800,         // § 12 Abs. 6
    rollstuhl: 1900,        // § 13
    umsetzen: 3800          // § 13
  };

  const floorStep = (cents) => Math.floor(cents / TARIF.schritt + 1e-9) * TARIF.schritt;

  /** Kilometerentgelt in Cent (ungerundet) nach Staffel. */
  function kmCents(km, tarif) {
    let rest = Math.max(0, km), from = 0, sum = 0;
    for (const [bis, preis] of TARIF[tarif].stufen) {
      const part = Math.min(rest, bis - from);
      sum += part * preis; rest -= part; from = bis;
      if (rest <= 0) break;
    }
    return sum;
  }

  /** Fahrpreis. opts: { km, tarif:'tag'|'nacht', waitMin, grossraum, rollstuhl, umsetzen } → Beträge in Euro */
  function fare(opts) {
    const tarif = opts.tarif === 'nacht' ? 'nacht' : 'tag';
    const grund = TARIF[tarif].grund;
    const fahrt = floorStep(kmCents(opts.km, tarif));
    const warte = opts.waitMin > 0 ? floorStep(opts.waitMin / 60 * TARIF.wartePerStunde) : 0;
    const gross = opts.grossraum ? TARIF.grossraum : 0;
    // Auslegung: Rollstuhl (19 €) und Umsetzen (38 €) sind Alternativen, nicht kumulativ ("oder" in § 13)
    const inklusion = opts.umsetzen ? TARIF.umsetzen : opts.rollstuhl ? TARIF.rollstuhl : 0;
    const total = grund + fahrt + warte + gross + inklusion;
    const e = (c) => c / 100;
    return { tarif, grund: e(grund), fahrt: e(fahrt), warte: e(warte), grossraum: e(gross), inklusion: e(inklusion), total: e(total) };
  }

  /* ---------- Tarifzeit: Tag / Nacht / Sonn- & Feiertag (Mecklenburg-Vorpommern) ---------- */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da);
  }
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const key = (d) => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();

  /** Gesetzliche Feiertage in Mecklenburg-Vorpommern. Heiligabend/Silvester sind KEINE gesetzlichen Feiertage. */
  function feiertage(y) {
    const o = easter(y);
    const list = [
      [new Date(y, 0, 1), 'Neujahr'], [new Date(y, 2, 8), 'Internationaler Frauentag'],
      [addDays(o, -2), 'Karfreitag'], [addDays(o, 1), 'Ostermontag'], [new Date(y, 4, 1), 'Tag der Arbeit'],
      [addDays(o, 39), 'Christi Himmelfahrt'], [addDays(o, 50), 'Pfingstmontag'],
      [new Date(y, 9, 3), 'Tag der Deutschen Einheit'], [new Date(y, 9, 31), 'Reformationstag'],
      [new Date(y, 11, 25), '1. Weihnachtstag'], [new Date(y, 11, 26), '2. Weihnachtstag']
    ];
    // Frauentag in MV erst ab 2023
    return new Map(list.filter(([, n]) => n !== 'Internationaler Frauentag' || y >= 2023).map(([d, n]) => [key(d), n]));
  }

  /** Tarif zu einem Zeitpunkt: { tarif:'tag'|'nacht', grund:'Tagtarif'|'Nacht'|'Sonntag'|<Feiertagsname> } */
  function tarifFor(date) {
    const feier = feiertage(date.getFullYear()).get(key(date));
    if (feier) return { tarif: 'nacht', grund: feier };
    if (date.getDay() === 0) return { tarif: 'nacht', grund: 'Sonntag' };
    const h = date.getHours();
    return h >= 6 && h < 22 ? { tarif: 'tag', grund: 'Tagtarif' } : { tarif: 'nacht', grund: 'Nachttarif (22–6 Uhr)' };
  }

  /** Zeitpunkt aus Datum "YYYY-MM-DD" und Uhrzeit "HH:MM" (lokale Zeit). */
  function parseLocal(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number), [h, mi] = timeStr.split(':').map(Number);
    return new Date(y, m - 1, d, h, mi);
  }

  /** Wechselt der Tarif während der Fahrt (Start bis Start + Dauer)? */
  function crossesTarifChange(start, durationMin) {
    return tarifFor(start).tarif !== tarifFor(new Date(start.getTime() + durationMin * 60000)).tarif;
  }

  /** § 12 Abs. 8–15: Wo startet der Taxameter, gilt der Festtarif?
      in: { startInSitz, destInSitz, startPflicht, destPflicht } je true | false | null (null = nicht bestimmbar) */
  function meterRule(g) {
    if (g.destPflicht === false) return { mode: 'frei' };          // Ziel außerhalb Pflichtfahrgebiet: Preis frei vereinbar
    if (g.startPflicht === false) return { mode: 'unklar' };       // Abholung außerhalb: Ordnung regelt das nicht ausdrücklich
    if (g.destPflicht === null || g.startPflicht === null) return { mode: 'unklar' };
    if (g.startInSitz) return { mode: 'festtarif', ab: 'start' };  // Anfahrt innerhalb Hagenow wird nicht berechnet
    if (g.destInSitz) return { mode: 'festtarif', ab: 'start' };   // Ziel Betriebssitzgemeinde: Taxameter erst am Bestellort
    return { mode: 'festtarif', ab: 'betriebssitz' };              // sonst: Taxameter ab Abfahrt am Betriebssitz
  }

  return { TARIF, kmCents, fare, feiertage, tarifFor, parseLocal, crossesTarifChange, meterRule };
});
