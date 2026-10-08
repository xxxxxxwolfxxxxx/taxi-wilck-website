/* „Meinen Standort verwenden“: trägt die aktuelle Adresse (Browser-Standort + OSM Nominatim) in das Abholort-Feld ein.
   Läuft erst nach Klick und Freigabe im Browser; ohne JavaScript bleibt das Feld ein normales Textfeld. */
(function () {
  var NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';

  function adresse(a) {
    var ort = a.village || a.town || a.city || a.hamlet || a.suburb || a.municipality || '';
    var strasse = [a.road || a.pedestrian || '', a.house_number || ''].join(' ').trim();
    var plzOrt = [a.postcode || '', ort].join(' ').trim();
    return [strasse, plzOrt].filter(Boolean).join(', ');
  }

  function attach(input) {
    var label = input.closest('label') || input.parentNode;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'geo';
    btn.setAttribute('data-i18n', 'geo.btn');
    btn.textContent = 'Meinen Standort verwenden';
    var status = document.createElement('small');
    status.className = 'geo-status';
    status.setAttribute('role', 'status');
    label.appendChild(btn);
    label.appendChild(status);

    var t = function (k, de) { return window.I18N ? window.I18N.t(k, de) : de; };
    function fertig(text, fehler) {
      btn.disabled = false;
      btn.removeAttribute('data-wait');
      btn.textContent = t('geo.btn', 'Meinen Standort verwenden');
      status.textContent = text;
      status.classList.toggle('err', !!fehler);
    }

    btn.addEventListener('click', function () {
      if (!navigator.geolocation) return fertig(t('geo.nosupport', 'Ihr Browser unterstützt keine Standortabfrage.'), true);
      btn.disabled = true;
      btn.textContent = t('geo.wait', 'Standort wird ermittelt …');
      status.textContent = '';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var url = NOMINATIM + '?format=jsonv2&addressdetails=1&zoom=18&accept-language=de&lat=' + pos.coords.latitude + '&lon=' + pos.coords.longitude;
        fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
          var text = j && j.address ? adresse(j.address) : '';
          if (!text) return fertig(t('geo.fail', 'Adresse konnte nicht ermittelt werden. Bitte tragen Sie den Abholort selbst ein.'), true);
          input.value = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          fertig(t('geo.ok', 'Standort eingetragen. Bitte kurz prüfen.'), false);
        }).catch(function () { fertig(t('geo.fail', 'Adresse konnte nicht ermittelt werden. Bitte tragen Sie den Abholort selbst ein.'), true); });
      }, function (err) {
        fertig(err && err.code === 1 ? t('geo.denied', 'Standortfreigabe abgelehnt. Bitte tragen Sie den Abholort selbst ein.') : t('geo.unavail', 'Standort nicht verfügbar. Bitte tragen Sie den Abholort selbst ein.'), true);
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
  }

  document.querySelectorAll('input[name="abholort"], #start').forEach(attach);
  if (window.I18N) window.I18N.apply();
})();
