const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../tarif.js');
const p = (km, tarif, extra = {}) => T.fare({ km, tarif, ...extra }).total;

test('Tagtarif: Beispiele aus der Vorgabe (ohne Wartezeit/Zuschläge)', () => {
  const exp = { 1: 7.8, 2: 11.4, 3: 14.5, 5: 20.2, 10: 33.2, 15: 46.2, 20: 59.2 };
  for (const [km, eur] of Object.entries(exp)) assert.equal(p(+km, 'tag'), eur, km + ' km');
});
test('Nacht/Sonn-/Feiertag: Beispiele aus der Vorgabe', () => {
  const exp = { 1: 8.4, 2: 12.2, 3: 15.6, 5: 22.1, 10: 37.6, 15: 53.1, 20: 68.6 };
  for (const [km, eur] of Object.entries(exp)) assert.equal(p(+km, 'nacht'), eur, km + ' km');
});
test('0 km kostet nur den Grundpreis', () => assert.equal(p(0, 'tag'), 4.2));
test('Fortschaltstufe 0,10 €: Preis wächst in 10-Cent-Schritten (abgerundet)', () => {
  assert.equal(T.fare({ km: 1.05, tarif: 'tag' }).fahrt, 3.7);   // 3,78 € → 3,70 €
  assert.equal(T.fare({ km: 0.02, tarif: 'tag' }).fahrt, 0);     // 0,072 € noch keine Stufe
});
test('Wartezeit nur wenn angegeben; 45 €/h = 0,75 €/min', () => {
  assert.equal(T.fare({ km: 1, tarif: 'tag' }).warte, 0);
  assert.equal(T.fare({ km: 1, tarif: 'tag', waitMin: 10 }).warte, 7.5);
  assert.equal(T.fare({ km: 1, tarif: 'tag', waitMin: 60 }).warte, 45);
});
test('Zuschläge nur bei Auswahl; Umsetzen ersetzt Rollstuhl (nicht kumulativ)', () => {
  assert.equal(p(1, 'tag', { grossraum: true }), 7.8 + 8);
  assert.equal(p(1, 'tag', { rollstuhl: true }), 7.8 + 19);
  assert.equal(p(1, 'tag', { rollstuhl: true, umsetzen: true }), 7.8 + 38);
});
test('Tarifzeit: Tag, Nacht, Sonntag, Feiertag', () => {
  const t = (s, h) => T.tarifFor(T.parseLocal(s, h));
  assert.equal(t('2026-10-07', '12:00').tarif, 'tag');         // Mittwoch
  assert.equal(t('2026-10-07', '22:00').tarif, 'nacht');
  assert.equal(t('2026-10-07', '05:59').tarif, 'nacht');
  assert.equal(t('2026-10-07', '06:00').tarif, 'tag');
  assert.equal(t('2026-10-10', '12:00').tarif, 'tag');         // Samstag tagsüber
  assert.equal(t('2026-10-11', '12:00').tarif, 'nacht');       // Sonntag
  assert.equal(t('2026-10-03', '12:00').tarif, 'nacht');       // Tag der Deutschen Einheit (Samstag)
  assert.equal(t('2026-10-31', '12:00').tarif, 'nacht');       // Reformationstag MV
  assert.equal(t('2026-04-03', '12:00').grund, 'Karfreitag');
  assert.equal(t('2026-04-06', '12:00').grund, 'Ostermontag');
  assert.equal(t('2026-05-14', '12:00').grund, 'Christi Himmelfahrt');
  assert.equal(t('2026-05-25', '12:00').grund, 'Pfingstmontag');
  assert.equal(t('2026-03-09', '12:00').tarif, 'tag');         // 9.3.2026 normaler Montag
  assert.equal(t('2026-03-08', '12:00').tarif, 'nacht');       // Sonntag + Frauentag
  assert.equal(t('2026-12-24', '12:00').tarif, 'tag');         // Heiligabend: kein gesetzlicher Feiertag
});
test('Tarifwechsel während der Fahrt wird erkannt', () => {
  const s = T.parseLocal('2026-10-07', '21:50');
  assert.equal(T.crossesTarifChange(s, 5), false);
  assert.equal(T.crossesTarifChange(s, 20), true);
});
test('Anfahrtsregel § 12 Abs. 8–15', () => {
  const r = T.meterRule;
  assert.deepEqual(r({ startInSitz: true, destInSitz: false, startPflicht: true, destPflicht: true }), { mode: 'festtarif', ab: 'start' });
  assert.deepEqual(r({ startInSitz: false, destInSitz: true, startPflicht: true, destPflicht: true }), { mode: 'festtarif', ab: 'start' });
  assert.deepEqual(r({ startInSitz: false, destInSitz: false, startPflicht: true, destPflicht: true }), { mode: 'festtarif', ab: 'betriebssitz' });
  assert.equal(r({ startInSitz: true, destInSitz: false, startPflicht: true, destPflicht: false }).mode, 'frei');
  assert.equal(r({ startInSitz: false, destInSitz: false, startPflicht: false, destPflicht: true }).mode, 'unklar');
  assert.equal(r({ startInSitz: false, destInSitz: false, startPflicht: true, destPflicht: null }).mode, 'unklar');
});
