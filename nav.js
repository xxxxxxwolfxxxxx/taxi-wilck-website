/* Mobile-Navigation: Hamburger-Menü + feste Aktionsleiste (nur unter 860 px sichtbar). */
(function () {
  var doc = document, root = doc.documentElement;
  var header = doc.querySelector('header.top');
  if (!header) return;
  root.classList.add('js-nav');

  var onCalc = /preisrechner/.test(location.pathname);
  var t = function (k, de) { return window.I18N ? window.I18N.t(k, de) : de; };
  var links = [
    ['/preisrechner.html', 'Preisrechner', 'nav.calc', true],
    ['/#fahrt', 'Fahrt anfragen', 'form.title'],
    ['/#leistungen', 'Leistungen', 'nav.services'],
    ['/#fahrzeuge', 'Fahrzeuge', 'nav.fleet'],
    ['/#bewertungen', 'Bewertungen', 'nav.reviews'],
    ['/#ueber-uns', 'Über uns', 'nav.about'],
    ['/#kontakt', 'Kontakt', 'nav.contact']
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
      return '<li><a href="' + l[0] + '"' + (l[3] ? ' class="hl"' : '') + ' data-i18n="' + l[2] + '">' + l[1] + '</a></li>';
    }).join('') +
    '</ul></nav>';
  header.insertAdjacentElement('afterend', drawer);

  var bar = doc.createElement('div');
  bar.className = 'actionbar';
  bar.innerHTML =
    '<a class="ab-call" href="tel:03883723240" data-i18n="ab.call">☎ Anrufen</a>' +
    (onCalc
      ? '<a class="ab-calc" href="/#fahrt" data-i18n="form.title">Fahrt anfragen</a>'
      : '<a class="ab-calc" href="/preisrechner.html" data-i18n="ab.calc">€ Preisrechner</a>');
  doc.body.appendChild(bar);

  function set(open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? t('nav.menu.close', 'Menü schließen') : t('nav.menu.open', 'Menü öffnen'));
    drawer.hidden = !open;
    drawer.style.top = header.offsetHeight + 'px';
    root.classList.toggle('menu-open', open);
  }
  btn.addEventListener('click', function () { set(drawer.hidden); });
  drawer.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) { set(false); btn.focus(); } });
  doc.addEventListener('i18n', function () { set(!drawer.hidden); });
  if (window.I18N) window.I18N.apply();
  matchMedia('(min-width: 861px)').addEventListener('change', function (m) { if (m.matches) set(false); });
})();
