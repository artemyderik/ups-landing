// Новые блоки лендинга: превью «Клиент отмечает - вы видите» на всех ширинах. Блок рисует себя в #nb-client (README страницы).
// Формат и поведение - сборки «Телефон» (Лендинг/Превью - телефон/ep-host.js, ep-scenes.js): рамка телефона, подпись над кадром -
// окно на одну подпись, закрепление на скролле, шаги по времени с точками .pv-steps и кнопкой, «уменьшение движения» - финальный кадр.
// Код проигрывателя перенесён оттуда; своё - пара телефонов (DESIGN.md 5.9, BEHAVIOR.md 5.3):
//   спереди телефон клиента (design/client/prototype, «Выполнение тренировки»), из-под него выглядывает телефон тренера
//   (design/directions/c2, «Результат тренировки» на 390); на третьем шаге он выходит из-под клиентского вбок и встаёт наверх, как колода
//   первого экрана, клиентский уходит назад. Финальный кадр - телефон тренера: сцена продаёт тренеру.
// Экраны - screens/*.html (разметка прототипов с данными сцены и screen.js: window.EV в iframe того же источника).
// Телефоны свёрстаны в натуральную величину (экран 390 × 844), камера на всех ширинах масштабирует пару целиком, вместе с рамкой
// (.ncp__rig): общий план - по ширине стекла из client.css, крупный план - не крупнее 1:1 (решение пользователя 2026-10-28).
(() => {
  const mount = document.getElementById('nb-client');
  if (!mount) return;
  const HERE = new URL('.', document.currentScript.src);
  const V = '20261029a';
  const page = new URLSearchParams(location.search).get('theme');
  const theme = page === 'dark' || page === 'light' ? page : 'system';   // тема страницы - системная, экраны получают ту же
  const src = (f) => `${new URL(`screens/${f}`, HERE).href}?v=${V}&theme=${theme}`;

  // ---------- Разметка блока ----------
  // иконки кнопки - те же, что у кнопки сборок «Телефон» и «Единый вид» (прототип C 2.0 и Lucide rotate-ccw)
  const ICO = {
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    replay: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  };
  const svg = (k) => `<svg data-ico="${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;
  const phone = (dev, file, title) => `<div class="ncp__phone" data-dev="${dev}"><div class="ncp__stage">
          <div class="ncp__world" aria-hidden="true"><iframe data-src="${src(file)}" title="${title}" tabindex="-1"></iframe><div class="ncp__touch"><i></i></div></div>
          <div class="ncp__skel" aria-hidden="true"></div></div></div>`;
  mount.innerHTML = `<div class="lp-wrap ncp-wrap">
    <article class="ncp-scene" data-scene="client">
      <div class="ncp-cap">
        <h3 class="ncp-cap__t">Результаты приходят сами</h3>
        <p class="ncp-cap__d">Клиент отмечает подходы и&nbsp;самочувствие в&nbsp;своём приложении, а&nbsp;вы сверяете с&nbsp;планом и&nbsp;сразу правите следующую тренировку</p>
      </div>
      <figure class="ncp" data-scene="client">
        <div class="ncp__view"><i class="ncp__gauge"></i><div class="ncp__rig">
          ${phone('result', 'result.html', 'Телефон тренера: экран «Результат тренировки»')}
          ${phone('session', 'session.html', 'Телефон клиента: экран «Выполнение тренировки»')}
        </div></div>
        <figcaption class="sr-only">Два телефона. На телефоне клиента Игорь выполняет румынскую тягу: видит план 3 × 8 × 65 кг и прошлый раз 70 × 8, отмечает подход кнопкой «Как в плане», на последнем подходе отмечает «Больно» 4 из 10, поясница, и снижает вес до 60 кг. Затем вперёд выходит телефон тренера: «Результат тренировки» - план и факт по подходам, боль 4 из 10, поясница, и кнопка «Скорректировать следующую».</figcaption>
        <button class="ncp__ctl" type="button">${svg('play')}${svg('pause')}${svg('replay')}<span class="ncp__ctl-l">Смотреть</span></button>
      </figure>
    </article>
  </div>`;

  // ---------- Раскадровка ----------
  // Шаг: swap - вперёд выходит другой телефон (колода); scroll - прокрутить экран (селектор встаёт сверху окна: align, gap; 0 - верх);
  // cam - камера {wide, narrow} (narrow - ниже 600): 'all' - общий план, пара телефонов целиком,
  // {sel, pad, w, align, h, top} - прямоугольник по элементам, {box: [x, y, w, h]} - участок окна экрана (y < 0 - от низа);
  // touch + at - палец касается точки элемента; press - нажатие; release - палец отпущен; step - шаг данных экрана (in - какого телефона).
  // dur - длительность прокрутки и камеры шага. chapters - шаги для точек под кадром; still - кадр «уменьшения движения» (Infinity - финал).
  const SHEET = { box: [0, -672, 390, 672] };   // лист «Больно» целиком: он занимает нижние 658 px экрана (с полем под жест «домой»)
  const SCENE = {
    name: 'Клиент отмечает - вы видите',
    start: 'session',
    end: 16800,
    still: Infinity,
    chapters: [{ t: 0, name: 'Клиент: «Как в плане»' }, { t: 2700, name: 'Клиент: «Больно», 4 из 10, поясница' }, { t: 10600, name: 'Тренер: «Результат тренировки»' }],
    steps: [
      { t: 0, cam: 'all' },
      // план, «Прошлый раз» и текущий подход с «в прошлый раз 70 кг × 8» - над «Как в плане»
      { t: 300, cam: { sel: ['#ev-last', '#ev-mark'], pad: 12 } },
      { t: 1300, touch: '#ev-mark', at: [0.3, 0.5] },
      { t: 1500, press: '#ev-mark' },
      // подход 2 отмечен, пошёл отдых, текущий - последний подход; экран подтягивает его над панелью
      { t: 1700, release: '#ev-mark', step: 1 },
      { t: 1900, scroll: 152, cam: { sel: ['#ev-last', '#ev-mark'], pad: 12 }, dur: 600 },
      // шаг 2: «Больно» у упражнения
      { t: 2700, cam: { sel: ['.ses-note', '#ev-acts'], pad: 16 }, dur: 700 },
      { t: 3200, touch: '#ev-pain-btn', at: [0.5, 0.45] },
      { t: 3400, press: '#ev-pain-btn' },
      { t: 3600, release: '#ev-pain-btn', step: 2, cam: SHEET, dur: 700 },
      // сила 4 из 10: палец касается полосы на 4. Ход бегунка - от края до края (kit.js прототипа): p = (x - tw / 2) / (W - tw),
      // бегунок tw = 60, полоса в листе W = 350 (390 - 2 × --s5) - доля касания (30 + 0,4 × 290) / 350 = 0,417
      { t: 4400, touch: '#ev-pain-range .eff__track', at: [0.417, 0.5] },
      { t: 4600, press: '#ev-pain-range', step: 3 },
      { t: 4800, release: '#ev-pain-range' },
      { t: 5200, touch: '#ev-low', at: [0.5, 0.5] },
      { t: 5400, press: '#ev-low' },
      { t: 5600, release: '#ev-low', step: 4 },
      { t: 6000, touch: '#ev-save', at: [0.5, 0.5] },
      { t: 6200, press: '#ev-save' },
      // сохранено: у упражнения «Больно 4/10 · Поясница», тост «тренер увидит сразу»
      { t: 6400, release: '#ev-save', step: 5, cam: { sel: ['#ev-flag', '#ev-minus'], pad: 16 }, dur: 700 },
      // вес 65 -> 60: два касания «−2,5»
      { t: 7200, touch: '#ev-minus', at: [0.5, 0.5] },
      { t: 7350, press: '#ev-minus' },
      { t: 7500, release: '#ev-minus', step: 6 },
      { t: 7700, touch: '#ev-minus', at: [0.5, 0.5] },
      { t: 7850, press: '#ev-minus' },
      { t: 8000, release: '#ev-minus', step: 7 },
      { t: 8300, cam: { sel: ['#ev-w', '#ev-mark'], pad: 16 }, dur: 600 },
      { t: 8900, touch: '#ev-mark', at: [0.3, 0.5] },
      { t: 9100, press: '#ev-mark' },
      { t: 9300, release: '#ev-mark', step: 8 },
      { t: 9900, cam: 'all', dur: 700 },
      // шаг 3: телефон тренера выходит из-под клиентского и встаёт наверх
      { t: 10600, swap: 'result', dur: 900 },
      // результат пришёл сам: тренировка, итоги и «Боль 4/10 · поясница»
      { t: 11600, cam: { sel: ['#ev-title', '#ev-sum'], pad: 16 }, dur: 800 },
      // финал: боль, план и факт по тяге и «Скорректировать следующую» внизу - одним кадром; ниже 600 сбоку остаётся край телефона клиента
      { t: 13000, scroll: '#ev-pain', gap: 16, cam: { wide: 'all', narrow: { sel: ['#ev-pain', '#ev-fix'], pad: 12 } }, dur: 900 },
      { t: 14200, touch: '#ev-fix', at: [0.62, 0.5] },
      { t: 14400, press: '#ev-fix' },
      { t: 14800, release: '#ev-fix' },
    ],
  };

  // ---------- Проигрыватель (ep-host.js сборки «Телефон», на пару телефонов) ----------
  const SCREEN_W = 390;             // ширина телефонного экрана прототипа; телефоны свёрстаны в натуральную величину
  const NARROW = 600;               // --bp-phone: уже - окно кадра во всю ширину экрана, у камеры свои цели (narrow)
  // предел камеры: телефон не крупнее 1:1 (крупнее экран мылится); ниже 600 - 0,96, как в сборке «Телефон»
  const MAX_SCALE = { wide: 1, narrow: 0.96 };
  const BACK = 0.92;                // масштаб заднего телефона колоды: меньше переднего, выглядывает сбоку на --s10 общего плана
  const OUT = 0.34;                 // на сколько ширины телефона задний выходит вбок, прежде чем встать наверх
  const HOLD_START = 400, START_RATIO = 0.6, HOLD_PIN = 300;
  const SCALE = { in: 0.95, pin: 0.99, out: 0.97 };
  const EDGE = 0.4;
  const LOADING_AFTER = 300;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowView = matchMedia(`(max-width: ${NARROW - 1}px)`);
  const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const msTok = (name) => parseFloat(tok(name)) || 0;
  const bezier = (str) => {
    const [x1, y1, x2, y2] = (str.replace(/^[^(]*/, '').match(/-?\d*\.?\d+/g) || [0, 0, 1, 1]).map(Number);
    const f = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    return (x) => {
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (f(x1, x2, t) < x) lo = t; else hi = t; }
      return f(y1, y2, t);
    };
  };
  const LABELS = { idle: 'Смотреть', still: 'Смотреть', playing: 'Пауза', paused: 'Воспроизвести', done: 'Повторить' };
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  // Закреплённые превью страницы - общий реестр window.pvPins (BEHAVIOR.md 5.3). Код один в ep-host.js и ev-host.js сборок превью
  // и в этой сцене: реестр заводит скрипт, загрузившийся первым, остальные встают в него.
  //   - Окно закреплений - ширина раскладки (clientWidth) и видимая высота (100svh). Адресная строка телефона и увеличение щипком
  //     шлют resize и меняют innerHeight / innerWidth (Safari и Chrome - по-разному), но не окно закреплений: на такой resize
  //     раскладка превью не пересчитывается, и масштаб по скроллу считается от той же высоты.
  //   - Пересчёт - всех превью за один проход, без кадра с чужим уровнем подписи: каждое замеряется на свой наибольший уровень,
  //     затем те, что выше наименьшего, - на наименьший. Уровень подписи один на все превью страницы, и у сцены клиента.
  //   - Один скролл на все превью.
  const pins = window.pvPins ??= (() => {
    const set = new Set();
    let probe = null, vp = null;
    const view = () => {
      if (!probe) { probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none'; document.body.append(probe); }
      return { w: document.documentElement.clientWidth, h: probe.offsetHeight || innerHeight };
    };
    const widths = new WeakMap();
    const relayout = () => {
      vp = view();
      for (const p of set) { p.capMax = 3; p.measure(); }
      const levels = [...set].map((p) => p.capLevel).filter((l) => l != null);
      const min = Math.min(...levels);
      for (const p of set) if (p.capLevel != null && p.capLevel > min) { p.capMax = min; p.measure(); }
      for (const p of set) { widths.set(p.art, p.art.clientWidth); p.onScroll(); }
    };
    // ширина превью меняется с раскладкой (поворот, полоса прокрутки без resize): одно наблюдение на все. Пересчёт - в следующем
    // кадре: внутри наблюдения он менял бы высоту наблюдаемых превью, и браузер сообщал бы о петле ResizeObserver
    let wRaf = 0;
    const ro = new ResizeObserver(() => {
      if (!wRaf) wRaf = requestAnimationFrame(() => { wRaf = 0; if ([...set].some((p) => widths.get(p.art) !== p.art.clientWidth)) relayout(); });
    });
    addEventListener('resize', () => { const v = view(); if (!vp || v.w !== vp.w || v.h !== vp.h) relayout(); });
    // новое превью - пересчёт всех после шрифтов (подписи меряются в своём шрифте); превью одного скрипта - одним пересчётом
    let queued = false;
    const soon = () => { if (!queued) { queued = true; document.fonts.ready.then(() => { queued = false; relayout(); }); } };
    let raf = 0;
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; for (const p of set) p.onScroll(); }); }, { passive: true });
    return {
      add(p) { set.add(p); ro.observe(p.art); soon(); },
      remove(p) { set.delete(p); ro.unobserve(p.art); },
      vh: () => (vp ??= view()).h,
    };
  })();

  class Player {
    constructor(fig, scene) {
      this.fig = fig;
      this.scene = scene;
      this.view = fig.querySelector('.ncp__view');
      this.rig = fig.querySelector('.ncp__rig');
      this.devs = {};
      for (const ph of fig.querySelectorAll('.ncp__phone')) {
        const world = ph.querySelector('.ncp__world'), touch = ph.querySelector('.ncp__touch');
        this.devs[ph.dataset.dev] = { phone: ph, stage: ph.querySelector('.ncp__stage'), world, touch, dot: touch.firstElementChild, iframe: world.querySelector('iframe') };
      }
      this.btn = fig.querySelector('.ncp__ctl');
      this.label = this.btn.querySelector('.ncp__ctl-l');
      this.state = 'idle';
      this.t = 0;
      this.anims = [];
      this.tweens = [];
      this.fired = 0;
      this.ready = false;
      this.seenSince = 0;
      this.autoPaused = false;
      this.inView = false;
      this.cur = scene.start;
      this.buildSteps();
      this.setState('idle');

      this.btn.addEventListener('click', () => this.onButton());
      this.art = fig.closest('.ncp-scene');
      if (!reduce.matches) this.setupPin();
      new IntersectionObserver(([e]) => { if (!this.pin || this.mode === 'none') this.onView(e); }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }).observe(this.view);
      const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { near.disconnect(); this.load(); } }, { rootMargin: '100% 0px 100% 0px' });
      near.observe(this.view);
      this.gauge = fig.querySelector('.ncp__gauge');
      let size = '';
      const view = this.view, gauge = this.gauge;
      new ResizeObserver(() => { const ns = `${view.clientWidth}×${view.clientHeight}×${gauge.offsetWidth}`; if (ns !== size) { size = ns; this.onResize(); } }).observe(view);
      reduce.addEventListener('change', () => {
        if (!reduce.matches) return;
        if (this.pin) { pins.remove(this); this.art.classList.add('ncp-scene--nopin'); this.mode = 'none'; this.scaled.style.transform = ''; }
        if (this.ready) { this.stop(); this.jump(this.scene.still ?? Infinity); this.setState('still'); }
      });
      this.layout();
    }

    // --- загрузка ---
    async load() {
      const loadingTimer = setTimeout(() => { if (!this.ready) this.fig.classList.add('is-loading'); }, LOADING_AFTER);
      this.layout();
      const all = Object.values(this.devs).map((d) => d.iframe);
      await Promise.all(all.map((f) => new Promise((res) => { f.addEventListener('load', res, { once: true }); f.src = f.dataset.src; })));
      await Promise.all(all.map((f) => f.contentWindow.EV?.ready));
      await document.fonts.ready;
      clearTimeout(loadingTimer);
      this.ready = true;
      if (reduce.matches) { this.jump(this.scene.still ?? Infinity); this.setState('still'); } else this.jump(0);
      void this.rig.offsetWidth;
      this.fig.classList.remove('is-loading');
      this.fig.classList.add('is-ready');
      this.check();
    }
    // Общий план: k - масштаб пары, стекло шириной --ncp-glass (client.css). Пара шире телефона на --s10 общего плана:
    // в натуральной величине это --s10 / k. Окно экрана - 390 × 844, экраны не масштабируются: камера двигает пару целиком.
    layout() {
      this.k = (this.gauge.offsetWidth || SCREEN_W) / SCREEN_W;
      this.VH = this.devs[this.scene.start].iframe.offsetHeight;
      this.narrow = narrowView.matches;
      this.rig.style.setProperty('--ncp-peek1', `${(msTok('--s10') / this.k).toFixed(1)}px`);
      for (const a of this.rig.getAnimations()) a.cancel();
      this.place();
      this.rig.style.transform = this.overview();
    }
    // общий план: пара целиком по центру окна кадра, сверху поле --s4 под тень
    overview() {
      const VW = this.view.clientWidth, k = this.k;
      return `translate(${((VW - this.rig.offsetWidth * k) / 2).toFixed(1)}px, ${msTok('--s4').toFixed(1)}px) scale(${k.toFixed(4)})`;
    }

    // --- колода: места телефонов ---
    // передний - во весь рост у своего края пары, задний - меньше (BACK), прижат к другому краю и выглядывает из-под переднего на --ncp-peek
    slot(dev) {
      const { phone } = this.devs[dev];
      const fw = phone.offsetWidth, fh = phone.offsetHeight, peek = this.rig.offsetWidth - fw;
      const front = dev === this.cur, right = dev === 'result';
      if (front) return { x: right ? peek : 0, y: 0, s: 1, fw, fh, peek };
      return { x: right ? peek + fw * (1 - BACK) : 0, y: (fh * (1 - BACK)) / 2, s: BACK, fw, fh, peek };
    }
    tf({ x, y, s }) { return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s})`; }
    place() {
      for (const [name, d] of Object.entries(this.devs)) {
        for (const a of d.phone.getAnimations()) a.cancel();
        d.phone.style.transform = this.tf(this.slot(name));
        d.phone.style.zIndex = '';
        d.phone.classList.toggle('is-front', name === this.cur);
      }
    }
    // новый передний выходит из-под прежнего вбок (OUT ширины телефона, чуть крупнее заднего) и встаёт наверх; прежний уходит назад
    swap(to, dur) {
      if (to === this.cur) return;
      const prev = this.cur;
      const a0 = this.slot(to), b0 = this.slot(prev);
      this.cur = to;
      const a1 = this.slot(to), b1 = this.slot(prev);
      this.place();
      if (!dur) return;
      const dir = to === 'result' ? 1 : -1;
      const mid = { x: a0.x + dir * a0.fw * OUT, y: a0.y / 2, s: (BACK + 1) / 2 };
      // выход вбок - в пределах окна кадра с полем --s4: телефон не срезается краем окна или панели, а виден целиком
      // (замечание пользователя 2026-10-29: «когда задний телефон выдвигается на передний план, он сбоку обрезается чем-то»)
      const m = new DOMMatrix(getComputedStyle(this.rig).transform), pad = msTok('--s4'), VW = this.view.clientWidth;
      if (dir > 0) mid.x = Math.max(a0.x, Math.min(mid.x, (VW - pad - m.e) / m.a - a0.fw * mid.s));
      else mid.x = Math.min(a0.x, Math.max(mid.x, (pad - m.e) / m.a));
      const ease = tok('--easing-out');
      const na = this.devs[to].phone, nb = this.devs[prev].phone;
      this.animate(na, [{ transform: this.tf(a0), zIndex: 1, easing: ease }, { transform: this.tf(mid), zIndex: 1, offset: 0.45, easing: ease }, { transform: this.tf(mid), zIndex: 2, offset: 0.46, easing: ease }, { transform: this.tf(a1), zIndex: 2 }], dur, 'linear');
      this.animate(nb, [{ transform: this.tf(b0), zIndex: 2 }, { transform: this.tf(b0), zIndex: 2, offset: 0.3 }, { transform: this.tf(b0), zIndex: 1, offset: 0.46, easing: ease }, { transform: this.tf(b1), zIndex: 1 }], dur, 'linear');
    }

    // --- состояние и кнопка ---
    setState(s) {
      this.state = s;
      this.fig.dataset.state = s;
      this.label.textContent = LABELS[s];
      this.btn.setAttribute('aria-label', `${LABELS[s]}: ${this.scene.name}`);
      this.updateSteps();
    }
    buildSteps() {
      const bar = document.createElement('div');
      bar.className = 'pv-steps';
      this.btn.replaceWith(bar);
      bar.append(this.btn);
      this.chapters = this.scene.chapters || [];
      if (this.chapters.length < 2) return;
      const dots = document.createElement('div');
      dots.className = 'pv-steps__dots';
      dots.setAttribute('role', 'group');
      dots.setAttribute('aria-label', `Шаги: ${this.scene.name}`);
      this.dots = this.chapters.map((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pv-steps__dot';
        b.setAttribute('aria-label', `Шаг ${i + 1} из ${this.chapters.length}: ${c.name}`);
        b.append(document.createElement('span'));
        b.addEventListener('click', () => this.seek(i));
        dots.append(b);
        return b;
      });
      bar.append(dots);
    }
    updateSteps() {
      const ch = this.chapters;
      let i = 0;
      while (i + 1 < ch.length && ch[i + 1].t <= this.t) i++;
      if (!this.dots) return;
      const end = ch[i + 1]?.t ?? this.scene.end;
      const p = this.state === 'done' ? 1 : clamp01((this.t - ch[i].t) / (end - ch[i].t));
      this.dots.forEach((d, k) => {
        const on = k === i;
        if (d.classList.contains('is-on') !== on) {
          d.classList.toggle('is-on', on);
          if (on) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
        }
        d.style.setProperty('--p', k < i ? 1 : on ? p.toFixed(3) : 0);
      });
    }
    seek(i) {
      if (!this.ready || this.state === 'still') return;
      this.autoPaused = false;
      this.stop();
      this.jump(Math.max(0, this.chapters[i].t - 1));
      this.setState('playing');
      this.tick();
    }

    // --- подпись: окно на одну подпись (BEHAVIOR.md 5.3) ---
    wrapCaps() {
      if (!this.cap) return;
      const st = document.createElement('div');
      st.className = 'ncp-cap__step';
      st.append(...this.cap.children);
      this.capIn = document.createElement('div');
      this.capIn.className = 'ncp-cap__in';
      this.capIn.append(st);
      this.cap.append(this.capIn);
      this.capSteps = [st];
    }
    capWin(k) {
      if (this.capMode !== 'full' && this.capMode !== 'title') return;
      this.cap.style.setProperty('--ncp-ck', k.toFixed(3));
      this.cap.style.height = k >= 1 ? '' : `${(this.capH0 + (this.capH1 - this.capH0) * k).toFixed(1)}px`;
    }

    // --- закрепление на скролле ---
    setupPin() {
      this.pin = document.createElement('div');
      this.pin.className = 'ncp-pin';
      this.pin.append(...this.art.children);
      this.art.append(this.pin);
      this.art.classList.add('ncp-scene--pin');
      this.cap = this.pin.querySelector('.ncp-cap');
      this.wrapCaps();
      pins.add(this);   // замер и скролл - реестр: при встраивании, после шрифтов и когда меняется окно закреплений
    }
    // подпись и кадр вместе, если помещаются в видимую высоту с полями; не помещаются - окно на подпись, на заголовок, иначе подпись уезжает;
    // кадр сам выше окна - не закрепляем (запуск по видимости). Уровень подписи (capLevel): 2 - целиком, 1 - заголовок, 0 - уезжает;
    // один на все превью страницы - наименьший (capMax ставит реестр pins, уровни - как у сборки «Телефон»)
    measure() {
      if (!this.pin) return;
      const vh = pins.vh(), gap = msTok('--s4');
      const lim = this.capMax ?? 2;
      this.art.classList.remove('ncp-scene--capout', 'ncp-scene--nopin');
      if (this.cap.parentElement !== this.pin) this.pin.prepend(this.cap);
      this.pin.style.transform = '';
      this.cap.classList.remove('ncp-cap--win', 'ncp-cap--title');
      this.cap.style.height = '';
      this.cap.style.removeProperty('--ncp-ck');
      this.capMode = 'flow';
      const stacked = getComputedStyle(this.pin).gridTemplateColumns.split(' ').length < 2;
      const fits = () => this.pin.offsetHeight <= vh - 2 * gap;
      if (stacked && (!fits() || lim < 2)) {
        this.capH1 = this.cap.offsetHeight;
        for (const d of this.cap.querySelectorAll('.ncp-cap__d')) d.style.setProperty('--ncp-dh', `${d.offsetHeight}px`);
        const title = this.cap.querySelector('.ncp-cap__t').offsetHeight;
        this.cap.classList.add('ncp-cap--win', 'ncp-cap--title');
        this.cap.style.setProperty('--ncp-ck', '0');
        this.cap.style.height = `${title}px`;
        if (lim >= 1 && fits()) { this.capMode = 'title'; this.capH0 = title; }
        else {
          this.cap.classList.remove('ncp-cap--win', 'ncp-cap--title');
          this.cap.style.height = '';
          this.cap.style.removeProperty('--ncp-ck');
          this.art.classList.add('ncp-scene--capout');
          this.art.insertBefore(this.cap, this.pin);
        }
      }
      const capOut = this.cap.parentElement !== this.pin;
      this.off = capOut ? this.cap.offsetHeight + parseFloat(getComputedStyle(this.cap).marginBottom) : 0;
      this.pinH = this.pin.offsetHeight;
      if (this.capMode !== 'flow') this.capWin(1);
      this.mode = this.pinH > vh - 2 * gap ? 'none' : 'pin';
      if (this.mode === 'none') this.art.classList.add('ncp-scene--nopin');
      this.top = Math.max(gap, (vh - this.pinH) / 2);
      this.art.style.setProperty('--ncp-pin-h', `${Math.ceil(this.off + this.pinH)}px`);
      this.art.style.setProperty('--ncp-pin-top', `${Math.round(this.top)}px`);
      this.scaled = stacked && !capOut ? this.pin : this.view;
      for (const el of [this.pin, this.view]) if (el !== this.scaled) el.style.transform = '';
      this.capLevel = !stacked ? null : capOut ? 0 : this.capMode === 'title' ? 1 : 2;
    }
    onScroll() {
      if (!this.scaled) return;
      if (this.mode !== 'pin') { this.scaled.style.transform = ''; return; }
      const a = this.art.getBoundingClientRect();
      const run = a.height - this.off - this.pinH;
      const before = a.top + this.off - this.top;
      const q = run > 0 ? -before / run : (before <= 0 ? 0 : -1);
      const edge = pins.vh() * EDGE;
      let s;
      if (q < 0) s = SCALE.in + (SCALE.pin - SCALE.in) * (1 - clamp01(before / edge));
      else if (q <= 1) s = SCALE.pin + (1 - SCALE.pin) * q;
      else s = 1 - (1 - SCALE.out) * clamp01(((q - 1) * run) / edge);
      this.scaled.style.transform = s === 1 ? '' : `scale(${s.toFixed(4)})`;
      this.capWin(q < 0 ? clamp01(before / edge) : 0);
      this.setInView(q >= 0 && q <= 1);
    }
    onButton() {
      if (!this.ready || this.state === 'still') return;
      if (this.state === 'playing') { this.pause(); return; }
      if (this.state === 'paused') this.resume(); else this.play();
    }

    // --- запуск: в закреплении или по видимости ---
    onView(e) {
      const vh = pins.vh();
      const tall = this.view.clientHeight > vh;
      this.setInView(tall ? e.intersectionRect.height >= vh * START_RATIO : e.intersectionRatio >= START_RATIO);
    }
    setInView(v) {
      if (v === this.inView) return;
      this.inView = v;
      if (v) {
        this.seenSince = performance.now();
        setTimeout(() => this.check(), this.hold() + 20);
        return;
      }
      this.seenSince = 0;
      if (this.state === 'playing') { this.pause(); this.autoPaused = true; }
    }
    hold() { return this.pin && this.mode === 'pin' ? HOLD_PIN : HOLD_START; }
    eligible() {
      const waits = this.state === 'idle' || (this.state === 'paused' && this.autoPaused);
      return this.ready && waits && !reduce.matches && this.seenSince && performance.now() - this.seenSince >= this.hold();
    }
    check() { if (this.eligible()) { if (this.state === 'paused') this.resume(); else this.play(); } }

    onResize() {
      if (!this.ready) { this.layout(); return; }
      this.stop();
      this.layout();
      if (this.state === 'done') return this.jump(Infinity);
      if (this.state === 'still') return this.jump(this.scene.still ?? Infinity);
      if (this.state !== 'idle') this.setState('idle');
      this.jump(0);
      this.check();
    }

    // --- часы сцены ---
    play() {
      this.autoPaused = false;
      this.stop();
      this.jump(0);
      this.setState('playing');
      this.tick();
    }
    tick() {
      let last = performance.now();
      const loop = (now) => {
        this.t += Math.min(now - last, 100);   // скрытая вкладка не перескакивает через шаги
        last = now;
        const steps = this.scene.steps;
        while (this.fired < steps.length && steps[this.fired].t <= this.t) this.apply(steps[this.fired++], true);
        this.scrollTick();
        this.clock();
        this.updateSteps();
        if (this.t >= this.scene.end) { this.raf = 0; this.setState('done'); return; }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    clock() { for (const name of Object.keys(this.devs)) this.ev(name)?.clock(this.t); }
    pause() {
      if (this.state !== 'playing') return;
      this.autoPaused = false;
      cancelAnimationFrame(this.raf); this.raf = 0;
      for (const a of this.running()) a.pause();
      this.setState('paused');
    }
    resume() {
      if (this.state !== 'paused') return;
      this.autoPaused = false;
      for (const a of this.running()) a.play();
      this.setState('playing');
      this.tick();
    }
    running() {
      const docs = Object.values(this.devs).map((d) => d.iframe.contentDocument).filter(Boolean);
      return [...this.anims.filter((a) => a.playState !== 'finished'), ...docs.flatMap((d) => d.getAnimations())];
    }
    stop() {
      cancelAnimationFrame(this.raf); this.raf = 0;
      for (const a of this.anims) a.cancel();
      this.anims = [];
      this.tweens = [];
    }

    // --- состояние сцены на момент t без движения: сброс и все шаги до t ---
    jump(t) {
      if (!this.ready) return;
      this.stop();
      for (const name of Object.keys(this.devs)) this.ev(name)?.reset();
      this.scrollY = {};
      this.cur = this.scene.start;
      this.place();
      for (const a of this.rig.getAnimations()) a.cancel();
      this.rig.style.transform = this.overview();
      this.touchOff();
      this.t = 0;
      this.fired = 0;
      const steps = this.scene.steps;
      while (this.fired < steps.length && steps[this.fired].t <= t) this.apply(steps[this.fired++], false);
      this.t = Math.min(t, this.scene.end);
      this.clock();
      this.updateSteps();
    }

    // --- шаги ---
    ev(name = this.cur) { return this.devs[name].iframe.contentWindow?.EV; }
    apply(s, live) {
      if (s.swap) this.swap(s.swap, live ? s.dur ?? 900 : 0);
      const dur = live ? s.dur ?? 800 : 0;
      if (s.scroll !== undefined) this.scrollTo(s.scroll, s, s.t, dur);
      if (s.cam) this.camTo(s.cam, dur);
      if (s.touch) this.touchAt(s.touch, s.at, live);
      if (s.press) this.press(s.press, live);
      if (s.release) this.release(s.release, live);
      if (s.step != null) { const ev = this.ev(s.in); ev.clock(s.t); ev.step(Math.floor(s.step), live); }
    }
    animate(el, frames, dur, easing) {
      const a = el.animate(frames, { duration: dur, easing, fill: 'forwards' });
      this.anims.push(a);
      a.finished.then(() => { a.commitStyles?.(); a.cancel(); this.anims = this.anims.filter((x) => x !== a); }).catch(() => {});
      return a;
    }

    // Прокрутка экрана: цель - элемент сверху окна (align, gap), число - прокрутка в px, 0 - верх экрана. Идёт по часам сцены.
    scrollTo(sel, o, t0, dur) {
      const name = this.cur, ev = this.ev(name), win = this.devs[name].iframe.contentWindow;
      const to = typeof sel === 'number' && sel > 0 ? sel : ev.scrollFor(sel, { align: o.align, gap: o.gap });
      const from = this.scrollY[name] || 0;
      this.scrollY[name] = to;
      ev.target(to);
      this.tweens = this.tweens.filter((w) => w.win !== win);
      if (!dur || from === to) { win.scrollTo({ top: to, behavior: 'instant' }); return; }
      this.tweens.push({ win, from, to, t0, dur, ease: bezier(tok('--easing-out')) });
    }
    scrollTick() {
      for (const w of this.tweens) {
        const p = Math.min(1, Math.max(0, (this.t - w.t0) / w.dur));
        w.win.scrollTo({ top: Math.round(w.from + (w.to - w.from) * w.ease(p)), behavior: 'instant' });
      }
      this.tweens = this.tweens.filter((w) => this.t < w.t0 + w.dur);
    }

    // Камера: прямоугольник цели (в координатах окна экрана после прокрутки) вписывается в окно кадра; двигается пара целиком.
    target(t) {
      let tg = t;
      if (t && (t.wide !== undefined || t.narrow !== undefined)) tg = this.narrow ? (t.narrow === undefined ? t.wide : t.narrow) : t.wide;
      if (tg === null) return null;
      if (tg === 'all') return { mode: tg };
      if (tg.box) {
        const [bx, by, bw, bh] = tg.box;
        return { r: { x: bx, y: by < 0 ? this.VH + by : by, w: bw, h: bh }, tg };
      }
      const ev = this.ev();
      const rs = [].concat(tg.sel).map((q) => ev.rect(q)).filter(Boolean);
      if (!rs.length) { console.warn('ncp: нет цели камеры', tg.sel); return null; }
      const x1 = Math.min(...rs.map((q) => q.x)), y1 = Math.min(...rs.map((q) => q.y));
      const x2 = Math.max(...rs.map((q) => q.x + q.w)), y2 = Math.max(...rs.map((q) => q.y + q.h));
      const pad = tg.pad ?? 16;
      const r = { x: x1 - pad, y: y1 - pad, w: x2 - x1 + 2 * pad, h: y2 - y1 + 2 * pad };
      if (tg.w && r.w > tg.w) { if (tg.align === 'right') r.x += r.w - tg.w; else if (tg.align === 'center') r.x += (r.w - tg.w) / 2; r.w = tg.w; }
      if (tg.h && r.h > tg.h) r.h = tg.h;
      return { r, tg };
    }
    // 'all' - общий план; цель переводится в координаты пары (место переднего телефона + поле рамки + экран 1:1) и вписывается в окно
    // не мельче общего плана и не крупнее предела. По ширине пара стоит по центру окна, пока помещается целиком (от 600: приближение
    // без сдвига вбок и без обрезки заднего телефона); иначе, как по высоте, передний телефон стоит по центру окна, пока он меньше окна,
    // и не уходит краем внутрь окна, пока больше (как телефон в сборке «Телефон»)
    camera(t) {
      const c = this.target(t);
      if (!c) return null;
      if (c.mode === 'all') return this.overview();
      const { r, tg } = c;
      const VW = this.view.clientWidth, VHt = this.view.clientHeight;
      const d = this.devs[this.cur], f = this.slot(this.cur);
      const X = f.x + d.stage.offsetLeft + r.x, Y = f.y + d.stage.offsetTop + r.y;
      const S = Math.max(this.k, Math.min(VW / r.w, VHt / r.h, tg.max ?? (this.narrow ? MAX_SCALE.narrow : MAX_SCALE.wide)));
      const axis = (want, start, size, V) => (size * S <= V ? (V - size * S) / 2 - S * start : Math.min(-S * start, Math.max(V - S * (start + size), want)));
      const RW = this.rig.offsetWidth;
      const tx = RW * S <= VW ? (VW - RW * S) / 2 : axis(VW / 2 - S * (X + r.w / 2), f.x, f.fw, VW);
      const ty = axis(tg.top ? -S * Y : VHt / 2 - S * (Y + r.h / 2), f.y, f.fh, VHt);
      return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${S.toFixed(4)})`;
    }
    camTo(target, dur) {
      const to = this.camera(target);
      if (!to) return;
      const el = this.rig;
      const from = getComputedStyle(el).transform;
      for (const a of el.getAnimations()) a.cancel();
      el.style.transform = to;
      if (!dur) return;
      this.animate(el, [{ transform: from === 'none' ? to : from }, { transform: to }], dur, tok('--easing-out'));
    }

    // Касание - точка 44 px (--tap-min): ложится на цель, при нажатии сжимается до 0,8, при отпускании возвращается пружиной и гаснет
    touchOff() {
      for (const d of Object.values(this.devs)) {
        d.touch.style.transform = '';
        d.dot.style.opacity = '0';
        d.dot.style.transform = 'scale(1)';
      }
    }
    touchAt(sel, at = [0.5, 0.5], live) {
      const r = this.ev().rect(sel), d = this.devs[this.cur];
      if (!r) { console.warn('ncp: нет цели касания', sel); return; }
      d.touch.style.transform = `translate(${(r.x + r.w * at[0]).toFixed(1)}px, ${(r.y + r.h * at[1]).toFixed(1)}px)`;
      d.dot.style.opacity = '1';
      d.dot.style.transform = 'scale(1)';
      if (live) this.animate(d.dot, [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'scale(1)' }], msTok('--dur'), tok('--easing-out'));
    }
    press(sel, live) {
      const d = this.devs[this.cur];
      this.ev().down(sel, true);
      d.dot.style.transform = 'scale(.8)';
      if (live) this.animate(d.dot, [{ transform: 'scale(1)' }, { transform: 'scale(.8)' }], msTok('--dur'), tok('--easing'));
    }
    release(sel, live) {
      const d = this.devs[this.cur];
      this.ev().down(sel, false);
      d.dot.style.opacity = '0';
      d.dot.style.transform = 'scale(1)';
      if (!live) return;
      this.animate(d.dot, [{ transform: 'scale(.8)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], msTok('--dur-spring'), tok('--easing-spring'))
        .finished.then(() => this.animate(d.dot, [{ opacity: 1 }, { opacity: 0 }], msTok('--dur'), tok('--easing'))).catch(() => {});
    }
  }

  const fig = mount.querySelector('.ncp');
  fig.player = new Player(fig, SCENE);
})();
