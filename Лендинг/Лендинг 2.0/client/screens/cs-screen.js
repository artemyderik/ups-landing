// Сцена «Клиент отмечает - вы видите»: экран C 2.0 внутри кадра (образец - screens/ev-screen.js «Единого вида»).
// Сцену ведёт проигрыватель (../client.js) и вызывает window.CS; кадры «Как работает» (../../how/how.js) берут экран статично.
//   CS.show(n, animate) - состояние n (слой .cs-st, session.html): новый слой проявляется поверх прежнего за --dur-slow;
//                         лист снизу выезжает и уезжает сам по себе, как в приложении (.sheet, DESIGN.md 5.6);
//   CS.scrollTo(y)      - прокрутка экрана (её ведёт часами сцены проигрыватель: на паузе она стоит);
//   CS.hover(sel, on), CS.down(sel, on) - наведение и нажатие (зеркало :hover прототипов, cs-screen.css);
//   CS.rect(sel)        - прямоугольник элемента текущего состояния в координатах окна экрана;
//   CS.reset()          - первое состояние без переходов.
// ?st=N - экран сразу в состоянии N; ?y=<px> или ?to=<селектор>&pad=<px> - прокрутка; ?bar=0 - нижняя панель не прилипает;
// ?safe=1 - поле снизу под жест «домой»; ?flat=1 - панель действий цвета экрана под ней, без чёрной полосы
// (телефоны «Как работает», проверка без страницы).
// Экран - картинка: ссылки и кнопки вне фокуса и без нажатий.
(() => {
  const root = document.documentElement;
  const p = new URLSearchParams(location.search);
  root.classList.add('cs-on');
  // is-scrolled: нижняя панель телефона прилипает к низу окна, как после прокрутки в продукте; ?bar=0 - остаётся в конце страницы
  if (p.get('bar') !== '0') root.classList.add('is-scrolled');
  if (p.get('safe') === '1') root.classList.add('cs-safe');
  if (p.get('flat') === '1') root.classList.add('cs-flat');
  for (const el of document.body.children) if (el.tagName !== 'SCRIPT') el.inert = true;
  const tok = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const ms = (name) => parseFloat(tok(name)) || 0;
  const layers = [...document.querySelectorAll('.cs-st')];
  let cur = null;
  const scope = () => cur || document;
  const $ = (sel) => (typeof sel === 'string' ? scope().querySelector(sel) : sel);
  const find = (sel, text) => [...scope().querySelectorAll(sel)].find((e) => !text || e.textContent.includes(text));
  // цель - селектор или [селектор, текст] (кнопки без своего класса: «−2,5», «Поясница»)
  const el = (t) => (Array.isArray(t) ? find(t[0], t[1]) : $(t));
  // Цвет экрана в точке окна: фон самого вложенного видимого элемента с заливкой, при равной вложенности - позднего в документе
  // (он рисуется поверх: лист наезжает на шапку). Экран инертный - elementFromPoint его не видит, поэтому перебором прямоугольников;
  // skip - элемент, который не считаем (панель, цвет под которой ищем).
  const bg = (x, y, skip) => {
    let best = '', depth = -1;
    for (const e of (cur || document.body).querySelectorAll('*')) {
      if (skip?.contains(e)) continue;
      const r = e.getBoundingClientRect();
      if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) continue;
      const cs = getComputedStyle(e), c = cs.backgroundColor;
      if (cs.visibility === 'hidden' || !c || c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c)) continue;
      let d = 0;
      for (let q = e; q; q = q.parentElement) d++;
      if (d >= depth) { depth = d; best = c; }
    }
    return best || getComputedStyle(document.body).backgroundColor;
  };

  function show(n, animate = false) {
    const next = layers[n - 1];
    if (!next || next === cur) return;
    const prev = cur;
    cur = next;
    for (const l of layers) { l.classList.toggle('is-on', l === next); if (l !== prev) l.classList.remove('is-out'); l.style.zIndex = ''; }
    if (!animate || !prev) { prev?.classList.remove('is-out'); return; }
    const dur = ms('--dur-slow'), easing = tok('--easing-out');
    const sheetIn = next.querySelector('.sheet') && !prev.querySelector('.sheet');
    const sheetOut = prev.querySelector('.sheet') && !next.querySelector('.sheet');
    prev.classList.add('is-out');
    const done = () => { prev.classList.remove('is-out'); prev.style.zIndex = ''; next.style.zIndex = ''; };
    if (sheetOut) {
      // лист уезжает вниз, затемнение гаснет; под ним уже следующее состояние
      prev.style.zIndex = '1';
      prev.querySelector('.sheet').animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: dur, easing });
      prev.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing }).finished.then(done).catch(() => {});
      return;
    }
    next.style.zIndex = '1';
    if (sheetIn) next.querySelector('.sheet').animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: dur, easing });
    next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing }).finished.then(done).catch(() => {});
  }

  window.CS = {
    show,
    states: layers.length,
    // прокрутка, на которой состояние снято с прототипа (data-y)
    y(n) { return Number(layers[n - 1]?.dataset.y) || 0; },
    scrollTo(y) { scrollTo(0, y); },
    hover(t, on = true) { el(t)?.classList.toggle('cs-hover', on); },
    down(t, on = true) { el(t)?.classList.toggle('cs-down', on); },
    rect(t) {
      const e = el(t);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    },
    reset() {
      for (const a of document.getAnimations()) a.cancel();
      for (const e of document.querySelectorAll('.cs-hover, .cs-down')) e.classList.remove('cs-hover', 'cs-down');
      root.classList.add('cs-instant');
      cur = null;
      if (layers.length) show(1);
      scrollTo(0, 0);
      void root.offsetWidth;
      root.classList.remove('cs-instant');
    },
    // цвет экрана у верха окна - его берёт поле сверху телефона «Как работает» (верхний угол экрана не срезает содержимое)
    bg: (y = 0) => bg(8, y),
    ready: document.fonts.ready,
  };

  if (layers.length) show(Number(p.get('st')) || 1);
  // кадр «Как работает»: прокрутка к элементу (верх элемента - на ?pad от верха окна) или на число
  const to = p.get('to');
  const place = () => {
    const r = to && CS.rect(to.includes('|') ? to.split('|') : to);
    if (r) scrollTo(0, scrollY + r.y - (Number(p.get('pad')) || 0));
    else if (p.get('y')) scrollTo(0, Number(p.get('y')));
  };
  // ?flat=1: панель действий - цвета экрана над ней (у края окна, левее карточек и мимо скругления листа), а не чёрная полоса прототипа
  const flat = () => {
    if (!root.classList.contains('cs-flat')) return;
    const bar = scope().querySelector('.assign-bar');
    if (bar) root.style.setProperty('--cs-bar-bg', bg(8, bar.getBoundingClientRect().top - 1, bar));
  };
  place(); flat();
  document.fonts.ready.then(() => { place(); flat(); });
})();
