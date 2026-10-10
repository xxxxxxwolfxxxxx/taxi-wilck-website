/* 3D-Modell im Hero: Drehteller aus 120 Einzelbildern (img/modell/t000–t119.webp).
   Zeigt sofort ein Standbild; die übrigen Bilder werden erst nach dem Laden der Seite geholt,
   die Drehung startet schon nach den ersten Bildern. Dreht sich langsam, lässt sich mit Maus oder Finger drehen. Bei reduzierter Bewegung oder
   Datensparmodus bleibt es beim Standbild. */
(function () {
  var box = document.querySelector('[data-model]');
  if (!box) return;
  var img = box.querySelector('img');
  var N = 120, START = 15, FPS = 15, PX = 6, MIN_FRAMES = 4, WORKERS = 6;
  var base = img.getAttribute('src').replace(/t\d{3}\.webp$/, 't');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var save = navigator.connection && navigator.connection.saveData;
  if (reduce || save) return;

  var frames = new Array(N), cur = START, ready = false, visible = true, drag = null, timer = null;
  function url(i) { return base + ('00' + i).slice(-3) + '.webp'; }
  function show(i) {
    i = ((i % N) + N) % N;
    if (!frames[i]) return;
    cur = i; img.src = frames[i].src;
  }
  function tick() {
    if (!ready || !visible || drag || document.hidden) return;
    show(cur + 1);
  }
  function load() {
    var order = [], next = 0, done = 0;
    for (var k = 0; k < N; k++) order.push((START + k) % N);
    frames[START] = img;
    function worker() {
      if (next >= order.length) return Promise.resolve();
      var i = order[next++];
      if (frames[i]) { done++; return worker(); }
      var im = new Image();
      im.src = url(i);
      var p = im.decode ? im.decode() : new Promise(function (ok, err) { im.onload = ok; im.onerror = err; });
      return p.then(function () { frames[i] = im; done++; go(); }, function () {}).then(worker);
    }
    // Dreht sofort, sobald die ersten Bilder da sind; show() überspringt noch fehlende Bilder.
    function go() {
      if (ready || done < MIN_FRAMES) return;
      ready = true;
      box.classList.add('live');
      timer = setInterval(tick, 1000 / FPS);
    }
    for (var w = 0; w < WORKERS; w++) worker();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(box);
  }
  box.addEventListener('pointerdown', function (e) {
    if (!ready) return;
    drag = { x: e.clientX, f: cur };
    box.setPointerCapture(e.pointerId);
    box.classList.add('drag');
  });
  box.addEventListener('pointermove', function (e) {
    if (!drag) return;
    show(drag.f - Math.round((e.clientX - drag.x) / PX));
  });
  function end() { drag = null; box.classList.remove('drag'); }
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);

  // Das Modell sitzt weiter unten: Bilder erst holen, wenn der Bereich fast im Sichtfeld ist.
  function start() {
    if (!('IntersectionObserver' in window)) { load(); return; }
    var io = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting) return;
      io.disconnect(); load();
    }, { rootMargin: '800px 0px' });
    io.observe(box);
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
