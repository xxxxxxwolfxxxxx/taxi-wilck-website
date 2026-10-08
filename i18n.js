/* Mehrsprachigkeit: Deutsch steht im HTML, andere Sprachen kommen aus /i18n/<code>.json (nur die gewählte wird geladen).
   Auszeichnung im HTML: data-i18n="key" (Text), data-i18n-html="key" (mit Markup), data-i18n-attr="attr:key;…",
   data-i18n-vars='{"name":"…"}' für Platzhalter {name}, data-de-only (nur auf Deutsch sichtbar).
   Auswahl: ?lang=xx > gespeicherte Wahl > Browsersprache. Fehlende Schlüssel fallen auf Englisch, dann Deutsch zurück. */
(function () {
  var LANGS = [
    ['de', 'Deutsch', 'de'], ['en', 'English', 'gb'], ['pl', 'Polski', 'pl'], ['ru', 'Русский', 'ru'], ['uk', 'Українська', 'ua'],
    ['tr', 'Türkçe', 'tr'], ['ar', 'العربية', 'ae'], ['fr', 'Français', 'fr'], ['es', 'Español', 'es'], ['it', 'Italiano', 'it'],
    ['nl', 'Nederlands', 'nl'], ['cs', 'Čeština', 'cz'], ['hu', 'Magyar', 'hu'], ['ro', 'Română', 'ro'], ['bg', 'Български', 'bg'],
    ['el', 'Ελληνικά', 'gr'], ['pt', 'Português', 'pt'], ['da', 'Dansk', 'dk'], ['sv', 'Svenska', 'se']
  ];
  var RTL = { ar: true };
  var root = document.documentElement;
  var dict = {}, cur = 'de', cache = {};

  function known(c) { return LANGS.some(function (l) { return l[0] === c; }); }
  function store(v) { try { if (v) localStorage.setItem('lang', v); return localStorage.getItem('lang'); } catch (e) { return null; } }
  function pick() {
    var q = (location.search.match(/[?&]lang=([a-z]{2})/) || [])[1];
    if (q && known(q)) { store(q); return q; }
    var s = store();
    if (s && known(s)) return s;
    var nav = navigator.languages || [navigator.language || 'de'];
    for (var i = 0; i < nav.length; i++) { var c = String(nav[i]).slice(0, 2).toLowerCase(); if (known(c)) return c; }
    return 'de';
  }

  function num(k, v) {
    var d = /^km/.test(k) ? 1 : /^preis/.test(k) ? 2 : -1;
    if (d < 0 || isNaN(Number(v))) return v;
    return Number(v).toLocaleString(cur, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fill(s, vars) {
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? esc(num(k, vars[k])) : m; }) : s;
  }
  function plain(s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent; }
  function vars(el) { try { return JSON.parse(el.getAttribute('data-i18n-vars') || 'null'); } catch (e) { return null; } }

  function apply() {
    document.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-attr],[data-de-only],[data-foreign-only]').forEach(function (el) {
      if (!el._o) {
        el._o = { html: el.innerHTML, hidden: el.hidden, attrs: {} };
        (el.getAttribute('data-i18n-attr') || '').split(';').forEach(function (p) { var a = p.split(':')[0]; if (a) el._o.attrs[a] = el.getAttribute(a); });
      }
      var de = cur === 'de', v = vars(el), k, t;
      if (el.hasAttribute('data-de-only')) el.hidden = de ? el._o.hidden : true;
      if (el.hasAttribute('data-foreign-only')) el.hidden = de;
      if ((k = el.getAttribute('data-i18n')) != null) { t = dict[k]; if (de || t == null) el.innerHTML = el._o.html; else el.innerHTML = fill(t, v); }
      if ((k = el.getAttribute('data-i18n-html')) != null) { t = dict[k]; if (de || t == null) el.innerHTML = el._o.html; else el.innerHTML = fill(t, v); }
      Object.keys(el._o.attrs).forEach(function (a) {
        var key = (el.getAttribute('data-i18n-attr').split(';').filter(function (p) { return p.split(':')[0] === a; })[0] || '').split(':')[1];
        var tt = dict[key];
        if (de || tt == null) { if (el._o.attrs[a] == null) el.removeAttribute(a); else el.setAttribute(a, el._o.attrs[a]); } else el.setAttribute(a, plain(fill(tt, v)));
      });
    });
    document.querySelectorAll('input[name="sprache"]').forEach(function (i) { i.value = cur; });
    root.lang = cur; root.dir = RTL[cur] ? 'rtl' : 'ltr';
    var cc = document.querySelector('.lang-code'), fl = document.querySelector('.lang-btn img');
    var L = LANGS.filter(function (l) { return l[0] === cur; })[0];
    if (cc) cc.textContent = cur.toUpperCase();
    if (fl && L) fl.src = '/img/flags/' + L[2] + '.svg';
    document.querySelectorAll('.lang-list [data-c]').forEach(function (b) { b.setAttribute('aria-current', String(b.getAttribute('data-c') === cur)); });
    document.dispatchEvent(new CustomEvent('i18n', { detail: cur }));
  }

  function json(c) {
    if (cache[c]) return cache[c];
    return (cache[c] = fetch('/i18n/' + c + '.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }));
  }
  function set(c) {
    cur = c;
    if (c === 'de') { dict = {}; apply(); return; }
    Promise.all([json('en'), json(c)]).then(function (r) { dict = Object.assign({}, r[0], r[1]); apply(); });
  }

  function build() {
    var host = document.querySelector('[data-lang-switch]');
    if (!host) return;
    var L = LANGS.filter(function (l) { return l[0] === cur; })[0];
    host.innerHTML = '<button type="button" class="lang-btn" aria-haspopup="true" aria-expanded="false" aria-controls="lang-list" aria-label="Sprache / Language"><img src="/img/flags/' + L[2] + '.svg" width="24" height="18" alt=""><span class="lang-code">' + cur.toUpperCase() + '</span></button>' +
      '<ul class="lang-list" id="lang-list" hidden>' + LANGS.map(function (l) {
        return '<li><button type="button" lang="' + l[0] + '" data-c="' + l[0] + '"><img src="/img/flags/' + l[2] + '.svg" width="24" height="18" alt="" loading="lazy"><span>' + l[1] + '</span></button></li>';
      }).join('') + '</ul>';
    var btn = host.querySelector('.lang-btn'), list = host.querySelector('.lang-list');
    function toggle(open) { list.hidden = !open; btn.setAttribute('aria-expanded', String(open)); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(list.hidden); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      store(b.getAttribute('data-c')); set(b.getAttribute('data-c')); toggle(false); btn.focus();
    });
    document.addEventListener('click', function (e) { if (!host.contains(e.target)) toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !list.hidden) { toggle(false); btn.focus(); } });
  }

  cur = pick();
  build();
  window.I18N = { apply: apply, t: function (k, de) { return cur !== 'de' && dict[k] != null ? dict[k] : de; }, lang: function () { return cur; } };
  if (cur !== 'de') set(cur); else apply();
})();
