/* Schnellbestellung: „Sofort“ ist vorausgewählt, Datum/Uhrzeit füllen sich selbst (Gerätezeit).
   Ohne JavaScript bleibt „Später / Termin“ mit sichtbaren Pflichtfeldern. */
(function () {
  var form = document.getElementById('fahrt');
  if (!form) return;
  var sofort = form.querySelector('input[name="wann"][value="Sofort"]');
  var spaeter = form.querySelector('input[name="wann"][value="Später"]');
  var datum = form.elements.datum, zeit = form.elements.uhrzeit;
  var later = form.querySelectorAll('.later');
  var row = form.querySelector('.three');
  if (!sofort || !spaeter || !datum || !zeit) return;

  function p(n) { return (n < 10 ? '0' : '') + n; }
  function jetzt() {
    var d = new Date();
    datum.value = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    zeit.value = p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function umschalten() {
    var s = sofort.checked;
    later.forEach(function (el) { el.hidden = s; });
    datum.required = zeit.required = !s;
    row.classList.toggle('sofort', s);
    if (s) jetzt();
  }
  sofort.checked = true;
  sofort.addEventListener('change', umschalten);
  spaeter.addEventListener('change', function () { umschalten(); if (!spaeter.checked) return; zeit.focus(); });
  form.addEventListener('submit', function () { if (sofort.checked) jetzt(); });
  umschalten();
})();
