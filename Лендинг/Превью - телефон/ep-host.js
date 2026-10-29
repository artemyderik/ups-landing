// Блок продукта лендинга, сборка «Телефон»: проигрыватель превью на телефонных экранах C 2.0.
// Разметка превью (index.html): <figure class="ep" data-scene="a"> … .ep__view > .ep__frame > .ep__stage > .ep__skel, .ep__world (iframe экранов + .ep__touch) … .ep__ctl
// Сцену описывает window.EP_SCENES[id] (ep-scenes.js): экраны, шаги по времени, конец. Экран - страница прототипа C 2.0 на 390
// с данными сцены и ep-screen.js (window.EV в iframe того же источника): шаг данных, нажатие, нижний лист, прокрутка, прямоугольник элемента.
//
// Кадр - телефон в рамке: экран 390 × 844 под стеклом. Экран прокручивается внутри (scroll), как у тренера в руке.
// Камера - слой демо: от 600 px она работает под стеклом (масштабирует слой .ep__world), ниже 600 - приближает телефон целиком
// (рамка .ep__frame в окне .ep__view, края уходят за окно и обрезаются). Касание живёт в мире экрана: точка 44 px, как палец.
//
// Закрепление на скролле (решение пользователя 2026-10-28, BEHAVIOR.md 5.3; механика - как в «Едином виде», ev-host.js): у превью запас
// скролла, кадр стоит на экране (sticky), пока страница проходит запас; подпись закреплена вместе с кадром, если помещается в видимую
// высоту, иначе уезжает. Лёгкий масштаб по скроллу - только на краях: вход 0,95 -> 0,99, закрепление 0,99 -> 1, выход 1 -> 0,97.
// Масштабируется окно кадра .ep__view (телефон целиком): рамку ниже 600 двигает камера сцены, их движения не смешиваются.
// Запуск - когда кадр встал и простоял 300 мс (инерция, пролетевшая закрепление, сцену не запускает); ушёл - пауза, вернулся -
// продолжение с того же места; за кадром ничего не доигрывает. Играет одно превью за раз (общая очередь).
// Под кадром шаги .pv-steps (DESIGN.md 5.9): кнопка «Смотреть / Пауза / Воспроизвести / Повторить» (WCAG 2.2.2) и точки шагов сцены
// (scene.chapters), нажатие на точку ставит сцену на этот шаг. При prefers-reduced-motion - без закрепления, масштаба и шагов:
// статичный ключевой кадр (scene.still). Без закрепления (?scene=… и кадр выше окна) - запуск по видимости 60 % непрерывно 400 мс.
(() => {
  const SCREEN_W = 390;             // ширина телефонного экрана прототипа
  const NARROW = 600;               // --bp-phone: уже - телефон в рамке по центру блока, камера приближает его целиком
  // масштаб экрана 390 в кадре: от 600 крупнее 1,3 экран размывается; ниже 600 предел 0,96 - экран почти во всю ширину окна кадра,
  // текст 14 px идёт в 13,4 px, а по бокам видна полоска рамки: приближение не превращает телефон обратно в экран во всю ширину
  const MAX_SCALE = { wide: 1.3, narrow: 0.96 };
  const HOLD_START = 400;           // мс в окне до запуска (без закрепления)
  const START_RATIO = 0.6;          // доля кадра в окне для запуска без закрепления; меньше - кадр ушёл
  const HOLD_PIN = 300;             // мс в закреплении до запуска: инерция пролетает запас быстрее
  const SCALE = { in: 0.95, pin: 0.99, out: 0.97 };   // масштаб кадра по скроллу: до закрепления, в его начале, после выхода
  const EDGE = 0.4;                 // доля высоты окна, за которую идёт масштаб входа и выхода
  const LOADING_AFTER = 300;        // скелетон - если загрузка дольше (DESIGN.md 5.7)

  const params = new URLSearchParams(location.search);
  const theme = params.get('theme');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowView = matchMedia(`(max-width: ${NARROW - 1}px)`);
  const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const msTok = (name) => parseFloat(tok(name)) || 0;
  const withTheme = (src) => {
    if (!theme) return src;
    const [path, hash] = src.split('#');
    return `${path}${path.includes('?') ? '&' : '?'}theme=${encodeURIComponent(theme)}${hash ? `#${hash}` : ''}`;
  };
  // кривая cubic-bezier для прокрутки экрана: прокрутку ведут часы сцены, а не браузер - так она встаёт на паузу вместе со сценой
  const bezier = (str) => {
    const [x1, y1, x2, y2] = (str.replace(/^[^(]*/, '').match(/-?\d*\.?\d+/g) || [0, 0, 1, 1]).map(Number);
    const f = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    return (x) => {
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (f(x1, x2, t) < x) lo = t; else hi = t; }
      return f(y1, y2, t);
    };
  };
  // idle - старт до запуска; still - статичный кадр hero при «уменьшении движения», кнопка скрыта
  const LABELS = { idle: 'Смотреть', still: 'Смотреть', playing: 'Пауза', paused: 'Воспроизвести', done: 'Повторить' };
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  // Закреплённые превью страницы - общий реестр window.pvPins (BEHAVIOR.md 5.3). Код один в ep-host.js, ev-host.js и сцене
  // клиента client-phone/client.js: реестр заводит скрипт, загрузившийся первым, остальные встают в него.
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

  // Общая очередь: играет одно превью
  const queue = {
    active: null,
    waiting: new Set(),
    request(p) {
      if (this.active && this.active !== p) { this.waiting.add(p); return; }
      this.waiting.delete(p);
      this.active = p;
      p.go();
    },
    release(p) {
      this.waiting.delete(p);
      if (this.active === p) this.active = null;
      const next = [...this.waiting].find((w) => w.eligible());
      if (next) this.request(next);
    },
  };

  class Player {
    constructor(fig, scene) {
      this.fig = fig;
      this.scene = scene;
      this.view = fig.querySelector('.ep__view');
      this.frame = fig.querySelector('.ep__frame');
      this.stage = fig.querySelector('.ep__stage');
      this.world = fig.querySelector('.ep__world');
      this.touch = fig.querySelector('.ep__touch');
      this.dot = this.touch.firstElementChild;
      this.btn = fig.querySelector('.ep__ctl');
      this.label = this.btn.querySelector('.ep__ctl-l');
      this.frames = {};
      for (const f of fig.querySelectorAll('.ep__world iframe')) this.frames[f.dataset.frame] = f;
      this.state = 'idle';
      this.t = 0;
      this.anims = [];
      this.tweens = [];
      this.fired = 0;
      this.ready = false;
      this.seenSince = 0;
      this.autoPaused = false;   // пауза, потому что кадр ушёл из окна (не нажатием)
      this.inView = false;
      this.buildSteps();
      this.setState('idle');

      this.btn.addEventListener('click', () => this.onButton());
      this.art = fig.closest('.ep-scene');
      if (this.art && !solo && !reduce.matches) this.setupPin();
      // без закрепления - по видимости; пороги с шагом 0,05: колбэк приходит только при переходе порога, а запуск считается от 0,6.
      // Наблюдаем окно кадра, а не стекло: при приближении ниже 600 стекло растёт и обрезается окном, его доля в окне браузера падает
      new IntersectionObserver(([e]) => { if (!this.pin || this.mode === 'none') this.onView(e); }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }).observe(this.view);
      // iframe грузятся при приближении: за один экран до кадра
      const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { near.disconnect(); this.load(); } }, { rootMargin: '100% 0px 100% 0px' });
      near.observe(this.view);
      let size = '';
      new ResizeObserver(() => { const ns = `${this.stage.clientWidth}×${this.stage.clientHeight}`; if (ns !== size) { size = ns; this.onResize(); } }).observe(this.stage);
      reduce.addEventListener('change', () => {
        if (!reduce.matches) return;
        if (this.pin) { pins.remove(this); this.art.classList.add('ep-scene--nopin'); this.mode = 'none'; this.scaled.style.transform = ''; }
        if (this.ready) { this.stop(); this.jump(this.scene.still ?? Infinity); this.setState('still'); queue.release(this); }
      });
    }

    // --- загрузка ---
    async load() {
      const loadingTimer = setTimeout(() => { if (!this.ready) this.fig.classList.add('is-loading'); }, LOADING_AFTER);
      this.layout();
      const all = Object.values(this.frames);
      await Promise.all(all.map((f) => new Promise((res) => {
        f.addEventListener('load', res, { once: true });
        f.src = withTheme(f.dataset.src);
      })));
      await Promise.all(all.map((f) => f.contentWindow.EV?.ready));
      await document.fonts.ready;
      clearTimeout(loadingTimer);
      this.ready = true;
      if (reduce.matches) { this.jump(this.scene.still ?? Infinity); this.setState('still'); } else this.jump(0);
      // без requestAnimationFrame: в фоновой вкладке он стоит, а кадр должен быть готов, когда зритель вернётся
      void this.world.offsetWidth;
      this.fig.classList.remove('is-loading');
      this.fig.classList.add('is-ready');
      this.check();
    }
    // окно экрана: 390 × VH при пропорциях стекла; s0 - масштаб экрана под стеклом. Ниже 600 слой под стеклом стоит в s0,
    // камера двигает рамку; от 600 рамка на месте, камера двигает слой
    layout() {
      const W = this.stage.clientWidth, H = this.stage.clientHeight;
      this.s0 = W / SCREEN_W;
      this.VH = Math.round(SCREEN_W * H / W);
      for (const f of Object.values(this.frames)) f.style.height = `${this.VH}px`;
      for (const el of [this.world, this.frame]) for (const a of el.getAnimations()) a.cancel();
      this.narrow = narrowView.matches;
      this.world.style.transform = this.narrow ? `scale(${this.s0.toFixed(4)})` : '';
      this.frame.style.transform = '';
    }

    // --- состояние и кнопка ---
    setState(s) {
      this.state = s;
      this.fig.dataset.state = s;
      this.label.textContent = LABELS[s];
      this.btn.setAttribute('aria-label', `${LABELS[s]}: ${this.scene.name}`);
      this.updateSteps();
    }

    // --- шаги: кнопка и точки под кадром (.pv-steps, DESIGN.md 5.9) ---
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
    // текущая точка - шаг, в котором стоит сцена; её заполнение - доля пройденного шага
    updateSteps() {
      const ch = this.chapters;
      let i = 0;
      while (i + 1 < ch.length && ch[i + 1].t <= this.t) i++;
      // подпись шага: у превью с двумя подписями активна та, к которой относится шаг (chapters[].cap)
      if (this.capSteps) {
        const ci = ch[i]?.cap ?? 0;
        this.capSteps.forEach((st, k) => st.classList.toggle('is-on', k === ci));
        this.capPlace();
      }
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
    // нажатие на точку: сцена встаёт в начало шага и играет; шаг на самой границе срабатывает с движением
    seek(i) {
      if (!this.ready || this.state === 'still') return;
      if (queue.active && queue.active !== this) queue.active.pause();
      queue.waiting.delete(this);
      queue.active = this;
      this.autoPaused = false;
      this.stop();
      this.jump(Math.max(0, this.chapters[i].t - 1));
      this.setState('playing');
      this.tick();
    }

    // --- подписи шагов (решения пользователя 2026-10-28, BEHAVIOR.md 5.3) ---
    // Пары «заголовок + текст» - в .ep-cap__step внутри ленты .ep-cap__in. Если подписи с кадром не помещаются, подпись в закреплении -
    // окно на одну подпись: пока кадр подходит, окно сужается за скроллом (лишнее уходит под край), а на шаге другой подписи
    // лента сдвигается - следующая подпись выталкивает прежнюю вверх. Полные подписи не помещаются и в окне - окно на заголовки.
    wrapCaps() {
      if (!this.cap) return;
      const steps = [];
      for (const el of [...this.cap.children]) {
        if (el.classList.contains('ep-cap__t') || !steps.length) {
          const st = document.createElement('div');
          st.className = 'ep-cap__step';
          steps.push(st);
        }
        steps.at(-1).append(el);
      }
      this.capIn = document.createElement('div');
      this.capIn.className = 'ep-cap__in';
      this.capIn.append(...steps);
      this.cap.append(this.capIn);
      this.capSteps = steps;
      this.updateSteps();
    }
    // лента окна: активная подпись - у верхнего края окна
    capPlace() {
      if (this.capMode !== 'full' && this.capMode !== 'title') return;
      const on = this.capSteps.find((st) => st.classList.contains('is-on')) || this.capSteps[0];
      this.capIn.style.transform = on.offsetTop ? `translateY(${-on.offsetTop}px)` : '';
    }
    // k: 1 - подписи в потоке целиком, 0 - окно на одну подпись (в закреплении)
    capWin(k) {
      if (this.capMode !== 'full' && this.capMode !== 'title') return;
      this.cap.style.setProperty('--ep-ck', k.toFixed(3));
      this.cap.style.height = k >= 1 ? '' : `${(this.capH0 + (this.capH1 - this.capH0) * k).toFixed(1)}px`;
      this.capPlace();
    }

    // --- закрепление на скролле ---
    setupPin() {
      this.pin = document.createElement('div');
      this.pin.className = 'ep-pin';
      this.pin.append(...this.art.children);
      this.art.append(this.pin);
      this.art.classList.add('ep-scene--pin');
      this.cap = this.pin.querySelector('.ep-cap');
      this.wrapCaps();
      pins.add(this);   // замер - реестр: при встраивании, после шрифтов и когда меняется окно закреплений
    }
    // подпись и кадр вместе, если помещаются в видимую высоту с полями; иначе закреплён только кадр, подпись уезжает;
    // кадр сам выше окна - не закрепляем (запуск по видимости)
    measure() {
      if (!this.pin) return;
      const vh = pins.vh(), gap = msTok('--s4');
      this.art.classList.remove('ep-scene--capout', 'ep-scene--nopin');
      if (this.cap && this.cap.parentElement !== this.pin) this.pin.prepend(this.cap);
      this.pin.style.transform = '';
      const capReset = () => {
        this.cap?.classList.remove('ep-cap--win', 'ep-cap--title');
        if (this.cap) { this.cap.style.height = ''; this.cap.style.removeProperty('--ep-ck'); }
        if (this.capIn) this.capIn.style.transform = '';
        this.capMode = 'flow';
      };
      capReset();
      const stacked = getComputedStyle(this.pin).gridTemplateColumns.split(' ').length < 2;
      const fits = () => this.pin.offsetHeight <= vh - 2 * gap;
      // подписи с кадром не помещаются: окно на одну полную подпись, иначе окно на заголовок; закреплённое замеряется с окном.
      // Уровень (capLevel): 3 - обе подписи целиком, 2 - одна целиком, 1 - заголовок, 0 - подпись уезжает. У всех превью страницы
      // уровень один - наименьший (capMax ставит реестр pins): все превью ведут себя одинаково, и сцена клиента
      const lim = this.capMax ?? 3;
      const whole = this.capSteps && this.capSteps.length > 1 ? 3 : 2;
      if (this.capSteps && stacked && (!fits() || lim < whole) && !(whole === 2 && lim >= 2 && fits())) {
        this.capH1 = this.cap.offsetHeight;
        for (const d of this.cap.querySelectorAll('.ep-cap__d')) d.style.setProperty('--ep-dh', `${d.offsetHeight}px`);
        const full = Math.max(...this.capSteps.map((st) => st.offsetHeight));
        const title = Math.max(...this.capSteps.map((st) => st.querySelector('.ep-cap__t')?.offsetHeight || 0));
        this.cap.classList.add('ep-cap--win');
        this.cap.style.setProperty('--ep-ck', '0');
        this.cap.style.height = `${full}px`;
        if (lim >= 2 && fits()) { this.capMode = 'full'; this.capH0 = full; }
        else {
          this.cap.classList.add('ep-cap--title');
          this.cap.style.height = `${title}px`;
          if (lim >= 1 && fits()) { this.capMode = 'title'; this.capH0 = title; } else capReset();
        }
      }
      if (this.cap && stacked && (!fits() || (lim < 1 && this.capMode === 'flow'))) {
        this.art.classList.add('ep-scene--capout');
        this.art.insertBefore(this.cap, this.pin);
      }
      const capOut = this.cap && this.cap.parentElement !== this.pin;
      this.off = capOut ? this.cap.offsetHeight + parseFloat(getComputedStyle(this.cap).marginBottom) : 0;
      this.stacked = stacked;
      this.capLevel = !this.cap || !stacked ? null : this.cap.parentElement !== this.pin ? 0 : this.capMode === 'title' ? 1 : this.capMode === 'full' ? 2 : whole;
      this.pinH = this.pin.offsetHeight;   // с окном подписи - высота закреплённого; до закрепления подписи стоят в потоке
      if (this.capMode !== 'flow') this.capWin(1);
      this.mode = this.pinH > vh - 2 * gap ? 'none' : 'pin';
      if (this.mode === 'none') this.art.classList.add('ep-scene--nopin');
      this.top = Math.max(gap, (vh - this.pinH) / 2);
      this.art.style.setProperty('--ep-pin-h', `${Math.ceil(this.off + this.pinH)}px`);
      this.art.style.setProperty('--ep-pin-top', `${Math.round(this.top)}px`);
      // масштабируется кадр целиком - окно кадра с телефоном (рамку ниже 600 двигает камера); если подпись закреплена над ним - вместе с подписью
      this.scaled = stacked && !capOut ? this.pin : this.view;
      for (const el of [this.pin, this.view]) if (el !== this.scaled) el.style.transform = '';
    }
    onScroll() {
      if (!this.scaled) return;
      if (this.mode !== 'pin') { this.scaled.style.transform = ''; return; }
      const a = this.art.getBoundingClientRect();
      const run = a.height - this.off - this.pinH;            // запас скролла, px
      const before = a.top + this.off - this.top;             // > 0 - кадр ещё не встал
      const q = run > 0 ? -before / run : (before <= 0 ? 0 : -1);   // 0 - встал, 1 - запас пройден
      const edge = pins.vh() * EDGE;
      let s;
      if (q < 0) s = SCALE.in + (SCALE.pin - SCALE.in) * (1 - clamp01(before / edge));
      else if (q <= 1) s = SCALE.pin + (1 - SCALE.pin) * q;
      else s = 1 - (1 - SCALE.out) * clamp01(((q - 1) * run) / edge);
      this.scaled.style.transform = s === 1 ? '' : `scale(${s.toFixed(4)})`;
      // окно подписи сужается за скроллом, пока кадр подходит: тот же путь, что масштаб входа
      this.capWin(q < 0 ? clamp01(before / edge) : 0);
      this.setInView(q >= 0 && q <= 1);
    }
    onButton() {
      if (!this.ready || this.state === 'still') return;
      if (this.state === 'playing') { this.pause(); queue.release(this); return; }
      // продолжение и повтор по нажатию: играющее превью встаёт на паузу
      if (queue.active && queue.active !== this) queue.active.pause();
      queue.waiting.delete(this);
      queue.active = this;
      if (this.state === 'paused') this.resume(); else this.play();
    }
    go() { if (this.state === 'paused' && this.autoPaused) this.resume(); else this.play(); }

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
      if (this.state === 'playing') this.leave();
    }
    hold() { return this.pin && this.mode === 'pin' ? HOLD_PIN : HOLD_START; }
    // кадр ушёл: пауза до возвращения, потом продолжение с того же места
    leave() {
      this.pause();
      this.autoPaused = true;
      queue.release(this);
    }
    eligible() {
      const waits = this.state === 'idle' || (this.state === 'paused' && this.autoPaused);
      return this.ready && waits && !reduce.matches && this.seenSince && performance.now() - this.seenSince >= this.hold();
    }
    check() { if (this.eligible()) queue.request(this); }

    onResize() {
      if (!this.ready) return;
      this.stop();
      this.layout();
      if (this.state === 'done') return this.jump(Infinity);
      if (this.state === 'still') return this.jump(this.scene.still ?? Infinity);
      if (this.state !== 'idle') { this.stop(); this.setState('idle'); queue.release(this); }
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
        this.updateSteps();
        if (this.t >= this.scene.end) { this.raf = 0; this.setState('done'); queue.release(this); return; }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
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
      const docs = Object.values(this.frames).map((f) => f.contentDocument).filter(Boolean);
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
      this.stop();
      for (const f of Object.values(this.frames)) f.contentWindow?.EV?.reset();
      this.scrollY = {};
      this.cur = this.scene.start;
      this.showFrame(this.cur);
      this.touchOff();
      this.t = 0;
      this.fired = 0;
      const steps = this.scene.steps;
      while (this.fired < steps.length && steps[this.fired].t <= t) this.apply(steps[this.fired++], false);
      this.t = Math.min(t, this.scene.end);
      this.updateSteps();
    }

    // --- шаги ---
    ev(name = this.cur) { return this.frames[name].contentWindow.EV; }
    apply(s, live) {
      // полоска загрузки - сверху видимой части экрана, как сверху окна браузера телефона
      if (s.load) this.ev().loading(true, this.scrollY[this.cur] || 0);
      if (s.frame) { this.cur = s.frame; this.showFrame(s.frame, live); }
      const dur = live ? s.dur ?? 800 : 0;
      if (s.scroll !== undefined) this.scrollTo(s.scroll, s, s.t, dur);
      if (s.cam) this.camTo(s.cam, dur);
      if (s.touch) this.touchAt(s.touch, s.at, live);
      if (s.press) this.press(s.press, live);
      if (s.drag) this.dragBy(s.drag, live ? s.dur ?? 250 : 0);
      if (s.release) this.release(s.release, live);
      if (s.step != null) this.ev(s.in).step(s.step, live);
      if (s.sheet) this.ev().sheet(s.sheet, true, live);
      if (s.unsheet) this.ev().sheet(null, false, live);
    }
    // Смена экрана: новый проявляется поверх старого за --dur-slow, со своего верха (как переход в веб-сборке; своего перехода страниц в системе нет)
    showFrame(name, live = false) {
      const next = this.frames[name];
      const prev = live ? Object.values(this.frames).find((f) => f !== next && !f.classList.contains('is-off')) : null;
      for (const f of Object.values(this.frames)) {
        f.classList.toggle('is-off', f !== next && f !== prev);
        f.style.zIndex = f === next ? '1' : '';
      }
      if (prev) this.animate(next, [{ opacity: 0 }, { opacity: 1 }], msTok('--dur-slow'), tok('--easing-out'))
        .finished.then(() => prev.classList.add('is-off')).catch(() => {});
    }
    animate(el, frames, dur, easing) {
      const a = el.animate(frames, { duration: dur, easing, fill: 'forwards' });
      this.anims.push(a);
      a.finished.then(() => { a.commitStyles?.(); a.cancel(); this.anims = this.anims.filter((x) => x !== a); }).catch(() => {});
      return a;
    }

    // Прокрутка экрана: цель - элемент сверху окна (align top / center / bottom, gap - зазор) или 0 - верх экрана.
    // Идёт по часам сцены с кривой --easing-out; камера и касание считаются для цели прокрутки сразу.
    scrollTo(sel, o, t0, dur) {
      const name = this.cur, ev = this.ev(name), win = this.frames[name].contentWindow;
      const to = ev.scrollFor(sel, { align: o.align, gap: o.gap });
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

    // Камера: прямоугольник цели (в координатах окна экрана после прокрутки) вписывается в кадр, масштаб экрана от общего плана до MAX_SCALE.
    // w - ширина цели не больше (align left / center / right), h - высота не больше, top - цель к верху кадра; box - участок окна экрана.
    // От 600 двигается слой под стеклом, экран не уходит из стекла. Ниже 600 двигается телефон целиком в окне кадра:
    // рамка не уходит внутрь окна, пока она больше окна, и стоит по центру, пока меньше.
    camera(target) {
      const narrow = this.narrow;
      let tg = target;
      if (target && (target.wide !== undefined || target.narrow !== undefined)) tg = narrow ? (target.narrow === undefined ? target.wide : target.narrow) : target.wide;
      if (tg === null) return null;   // для этого кадра камера не двигается
      const all = tg === 'all' || tg.all;
      let r = null;
      if (all) r = null;
      else if (tg.box) {
        // участок окна экрана [x, y, w, h], y < 0 - от низа: так камера берёт нижний лист, который ещё въезжает
        const [bx, by, bw, bh] = tg.box;
        r = { x: bx, y: by < 0 ? this.VH + by : by, w: bw, h: bh };
      } else {
        const ev = this.ev();
        const rs = [].concat(tg.sel).map((q) => ev.rect(q)).filter(Boolean);
        if (!rs.length) { console.warn('ep: нет цели камеры', tg.sel); return null; }
        const x1 = Math.min(...rs.map((q) => q.x)), y1 = Math.min(...rs.map((q) => q.y));
        const x2 = Math.max(...rs.map((q) => q.x + q.w)), y2 = Math.max(...rs.map((q) => q.y + q.h));
        const pad = tg.pad ?? 16;
        r = { x: x1 - pad, y: y1 - pad, w: x2 - x1 + 2 * pad, h: y2 - y1 + 2 * pad };
      }
      if (r) {
        if (tg.w && r.w > tg.w) { if (tg.align === 'right') r.x += r.w - tg.w; else if (tg.align === 'center') r.x += (r.w - tg.w) / 2; r.w = tg.w; }
        if (tg.h && r.h > tg.h) r.h = tg.h;
      }
      const max = tg.max ?? MAX_SCALE[narrow ? 'narrow' : 'wide'];
      if (narrow) return this.deviceCamera(r, tg.top, max);
      const W = this.stage.clientWidth, H = this.stage.clientHeight;
      if (!r) return `translate(0px, 0px) scale(${this.s0.toFixed(4)})`;
      const s = Math.max(this.s0, Math.min(W / r.w, H / r.h, max));
      let tx = W / 2 - (r.x + r.w / 2) * s;
      let ty = tg.top ? -r.y * s : H / 2 - (r.y + r.h / 2) * s;
      tx = Math.min(0, Math.max(W - SCREEN_W * s, tx));
      ty = Math.min(0, Math.max(H - this.VH * s, ty));
      return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
    }
    // Ниже 600: цель переводится в координаты рамки (отступ стекла + экран в масштабе s0), телефон масштабируется S от 1 (общий план)
    // до того, где экран идёт в масштабе max; S × s0 - масштаб текста экрана в кадре
    deviceCamera(r, top, max) {
      if (!r) return 'translate(0px, 0px) scale(1)';
      const VW = this.view.clientWidth, VH = this.view.clientHeight;
      const ox = this.frame.offsetLeft, oy = this.frame.offsetTop, dw = this.frame.offsetWidth, dh = this.frame.offsetHeight;
      const g = this.s0, px = this.stage.offsetLeft, py = this.stage.offsetTop;
      const X = px + r.x * g, Y = py + r.y * g, w = r.w * g, h = r.h * g;
      const S = Math.max(1, Math.min(VW / w, VH / h, max / g));
      const axis = (t, o, size, V) => (size * S <= V ? (V - size * S) / 2 - o : Math.min(-o, Math.max(V - size * S - o, t)));
      const tx = axis(VW / 2 - ox - S * (X + w / 2), ox, dw, VW);
      const ty = axis(top ? -oy - S * Y : VH / 2 - oy - S * (Y + h / 2), oy, dh, VH);
      return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${S.toFixed(4)})`;
    }
    camTo(target, dur) {
      const to = this.camera(target);
      if (!to) return;
      const el = this.narrow ? this.frame : this.world;
      const from = getComputedStyle(el).transform;
      // прежнее движение камеры отменяется, иначе при завершении оно запишет своё положение поверх нового
      for (const a of el.getAnimations()) a.cancel();
      el.style.transform = to;
      if (!dur) return;
      this.animate(el, [{ transform: from === 'none' ? to : from }, { transform: to }], dur, tok('--easing-out'));
    }

    // Касание - точка 44 px (--tap-min, палец): ложится на цель (появляется и чуть сжимается к размеру), при нажатии сжимается до 0,8,
    // при отпускании возвращается пружиной и гаснет - палец ушёл с экрана. Между целями точка не едет: палец поднимается и касается снова.
    touchOff() {
      this.touchPos = null;
      this.touch.style.transform = '';
      this.dot.style.opacity = '0';
      this.dot.style.transform = 'scale(1)';
    }
    touchAt(sel, at = [0.5, 0.5], live) {
      const r = this.ev().rect(sel);
      if (!r) { console.warn('ep: нет цели касания', sel); return; }
      this.touchPos = { x: r.x + r.w * at[0], y: r.y + r.h * at[1] };
      this.touch.style.transform = `translate(${this.touchPos.x.toFixed(1)}px, ${this.touchPos.y.toFixed(1)}px)`;
      this.dot.style.opacity = '1';
      this.dot.style.transform = 'scale(1)';
      if (live) this.animate(this.dot, [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'scale(1)' }], msTok('--dur'), tok('--easing-out'));
    }
    // Нажатие: элемент - своё состояние нажатия из системы, пока палец на экране (переход на другой экран - держится 400 мс)
    press(sel, live) {
      this.ev().down(sel, true);
      this.dot.style.transform = 'scale(.8)';
      if (live) this.animate(this.dot, [{ transform: 'scale(1)' }, { transform: 'scale(.8)' }], msTok('--dur'), tok('--easing'));
    }
    // Свайп: палец ведёт по экрану, не отрываясь (нижний лист закрывается свайпом вниз, DESIGN.md 5.6)
    dragBy([dx, dy], dur) {
      if (!this.touchPos) return;
      const from = `translate(${this.touchPos.x.toFixed(1)}px, ${this.touchPos.y.toFixed(1)}px)`;
      this.touchPos = { x: this.touchPos.x + dx, y: this.touchPos.y + dy };
      const to = `translate(${this.touchPos.x.toFixed(1)}px, ${this.touchPos.y.toFixed(1)}px)`;
      this.touch.style.transform = to;
      if (dur) this.animate(this.touch, [{ transform: from }, { transform: to }], dur, tok('--easing'));
    }
    release(sel, live) {
      this.ev().down(sel, false);
      this.dot.style.opacity = '0';
      this.dot.style.transform = 'scale(1)';
      if (!live) return;
      this.animate(this.dot, [{ transform: 'scale(.8)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], msTok('--dur-spring'), tok('--easing-spring'))
        .finished.then(() => this.animate(this.dot, [{ opacity: 1 }, { opacity: 0 }], msTok('--dur'), tok('--easing'))).catch(() => {});
    }
  }

  // ?scene=a - одно превью без подписи и заголовка (тест 5 секунд)
  const solo = params.get('scene');
  if (solo && document.querySelector(`.ep-scene[data-scene="${solo}"]`)) {
    document.body.classList.add('ep-solo');
    document.querySelector(`.ep-scene[data-scene="${solo}"]`).classList.add('is-solo');
  }
  for (const fig of document.querySelectorAll('.ep[data-scene]')) {
    if (solo && fig.dataset.scene !== solo) continue;
    fig.player = new Player(fig, window.EP_SCENES[fig.dataset.scene]);
  }
})();
