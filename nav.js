/* Mobile-Navigation: Hamburger-Menü + feste Aktionsleiste (nur unter 860 px sichtbar). */
(function () {
  var doc = document, root = doc.documentElement;
  var header = doc.querySelector('header.top');
  if (!header) return;
  root.classList.add('js-nav');

  var onCalc = /preisrechner/.test(location.pathname);
  var links = [
    ['/preisrechner.html', 'Preisrechner', true],
    ['/#fahrt', 'Fahrt anfragen'],
    ['/#leistungen', 'Leistungen'],
    ['/#fahrzeuge', 'Fahrzeuge'],
    ['/#bewertungen', 'Bewertungen'],
    ['/#ueber-uns', 'Über uns'],
    ['/#kontakt', 'Kontakt']
  ];

  var btn = doc.createElement('button');
  btn.className = 'burger';
  btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'drawer');
  btn.setAttribute('aria-label', 'Menü öffnen');
  btn.innerHTML = '<span></span><span></span><span></span>';
  header.appendChild(btn);

  var drawer = doc.createElement('div');
  drawer.id = 'drawer';
  drawer.className = 'drawer';
  drawer.hidden = true;
  drawer.innerHTML =
    '<nav aria-label="Menü"><ul>' +
    links.map(function (l) {
      return '<li><a href="' + l[0] + '"' + (l[2] ? ' class="hl"' : '') + '>' + l[1] + '</a></li>';
    }).join('') +
    '</ul></nav>';
  header.insertAdjacentElement('afterend', drawer);

  var bar = doc.createElement('div');
  bar.className = 'actionbar';
  bar.innerHTML =
    '<a class="ab-call" href="tel:03883723240">☎ Anrufen</a>' +
    (onCalc
      ? '<a class="ab-calc" href="/#fahrt">Fahrt anfragen</a>'
      : '<a class="ab-calc" href="/preisrechner.html">€ Preisrechner</a>');
  doc.body.appendChild(bar);

  function set(open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    drawer.hidden = !open;
    drawer.style.top = header.offsetHeight + 'px';
    root.classList.toggle('menu-open', open);
  }
  btn.addEventListener('click', function () { set(drawer.hidden); });
  drawer.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) { set(false); btn.focus(); } });
  matchMedia('(min-width: 861px)').addEventListener('change', function (m) { if (m.matches) set(false); });
})();
