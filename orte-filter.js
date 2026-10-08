/* Schnellauswahl nach Anfangsbuchstaben für Ortslisten ([data-orte]). Ohne JS bleiben alle Orte sichtbar. */
(function () {
  document.querySelectorAll('[data-orte]').forEach(function (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-l]'));
    if (items.length < 2) return;
    var letters = items.map(function (el) { return el.dataset.l; })
      .filter(function (l, i, a) { return a.indexOf(l) === i; })
      .sort(function (a, b) { return a.localeCompare(b, 'de'); });

    var nav = document.createElement('div');
    nav.className = 'abc';
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', 'Orte nach Anfangsbuchstaben filtern');

    function show(letter) {
      items.forEach(function (el) { el.hidden = !!letter && el.dataset.l !== letter; });
      Array.prototype.forEach.call(nav.children, function (b) {
        b.setAttribute('aria-pressed', String((b.dataset.l || '') === (letter || '')));
      });
    }
    ['Alle'].concat(letters).forEach(function (l, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = l;
      if (!i) b.setAttribute('data-i18n', 'area.filter.all');
      b.dataset.l = i ? l : '';
      b.addEventListener('click', function () { show(i ? l : ''); });
      nav.appendChild(b);
    });
    root.insertBefore(nav, root.firstChild);
    show('');
  });
})();
