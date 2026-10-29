// Блок продукта лендинга, вариант «Единый вид»: проигрыватель превью.
// Разметка превью (index.html): <figure class="ev" data-scene="a"> … .ev__stage > .ev__skel, .ev__world (iframe экранов + .ev__cursor), [.ev__phone] … .ev__ctl
// Сцену описывает window.EV_SCENES[id] (ev-scenes.js): экраны, шаги по времени, конец. Экран - страница прототипа C 2.0 с данными сцены
// и ev-screen.js (window.EV в iframe того же источника): шаг данных, наведение, нажатие, подсказка, прямоугольник элемента.
//
// Камера - слой демо поверх продукта: экран 1280 × N в натуральную величину, слой .ev__world двигается и масштабируется.
// Цель камеры - прямоугольник по селекторам; для кадра уже --bp-phone (600) у шага своя цель («узкая»): экран компьютера
// на телефоне читается только крупным планом. Курсор живёт в мире камеры и растёт вместе с экраном.
//
// Закрепление на скролле (решение пользователя 2026-10-28, BEHAVIOR.md 5.3): у превью запас скролла, кадр стоит на экране (sticky),
// пока страница проходит запас; подпись закреплена вместе с кадром, если помещается в видимую высоту, иначе уезжает. Лёгкий масштаб
// по скроллу - только на краях: вход 0,95 -> 0,99, закрепление 0,99 -> 1, выход 1 -> 0,97 (внутри сцены своя камера).
// Запуск - когда кадр встал и простоял 300 мс (инерция, пролетевшая закрепление, сцену не запускает); ушёл - пауза, вернулся -
// продолжение с того же места; за кадром ничего не доигрывает. Играет одно превью за раз (общая очередь).
// Под кадром шаги .pv-steps (DESIGN.md 5.9): кнопка «Смотреть / Пауза / Воспроизвести / Повторить» (WCAG 2.2.2) и точки шагов сцены
// (scene.chapters), нажатие на точку ставит сцену на этот шаг. При prefers-reduced-motion - без закрепления, масштаба и шагов:
// статичный ключевой кадр (scene.still). Без закрепления (?scene=… и кадр выше окна) - запуск по видимости 60 %.
(() => {
  const SCREEN_W = 1280;            // ширина экрана в кадре по умолчанию: от 1280 правые колонки «Клиента» и «Конструктора» стоят рядом (DESIGN.md 3.13);
                                    // сцена может задать свою (scene.width), например 1440 - там, где на 1280 тесно экрану прототипа
  const NARROW = 600;               // --bp-phone: уже - камера узкого кадра
  const MAX_SCALE = { wide: 1.3, narrow: 1.15 };   // крупнее экран размывается и теряет узнаваемость
  const HOLD_START = 400;           // мс в окне до запуска (без закрепления)
  const START_RATIO = 0.6;          // доля кадра в окне для запуска без закрепления; меньше - кадр ушёл
  const HOLD_PIN = 300;             // мс в закреплении до запуска: инерция пролетает запас быстрее
  const SCALE = { in: 0.95, pin: 0.99, out: 0.97 };   // масштаб кадра по скроллу: до закрепления, в его начале, после выхода
  const EDGE = 0.4;                 // доля высоты окна, за которую идёт масштаб входа и выхода
  const LOADING_AFTER = 300;        // скелетон - если загрузка дольше (DESIGN.md 5.7)

  const params = new URLSearchParams(location.search);
  const theme = params.get('theme');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const msTok = (name) => parseFloat(tok(name)) || 0;
  const withTheme = (src) => {
    if (!theme) return src;
    const [path, hash] = src.split('#');
    return `${path}${path.includes('?') ? '&' : '?'}theme=${encodeURIComponent(theme)}${hash ? `#${hash}` : ''}`;
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
      this.stage = fig.querySelector('.ev__stage');
      this.world = fig.querySelector('.ev__world');
      this.cursor = fig.querySelector('.ev__cursor');
      this.phone = fig.querySelector('.ev__phone');
      this.btn = fig.querySelector('.ev__ctl');
      this.label = this.btn.querySelector('.ev__ctl-l');
      this.frames = {};
      for (const f of fig.querySelectorAll('.ev__world iframe')) this.frames[f.dataset.frame] = f;
      this.phoneFrame = this.phone?.querySelector('iframe') || null;
      this.W = scene.width || SCREEN_W;   // экран 16:10: общий план - W × H
      this.H = Math.round(this.W * 10 / 16);
      if (this.W !== SCREEN_W) {
        this.world.style.width = `${this.W}px`;
        for (const f of Object.values(this.frames)) { f.style.width = `${this.W}px`; f.style.height = `${this.H}px`; }
      }
      this.state = 'idle';
      this.t = 0;
      this.anims = [];
      this.fired = 0;
      this.ready = false;
      this.seenSince = 0;
      this.autoPaused = false;   // пауза, потому что кадр ушёл из окна (не нажатием)
      this.inView = false;
      this.buildSteps();
      this.setState('idle');

      this.btn.addEventListener('click', () => this.onButton());
      this.art = fig.closest('.ev-scene');
      if (this.art && !solo && !reduce.matches) this.setupPin();
      // без закрепления - по видимости; пороги с шагом 0,05: колбэк приходит только при переходе порога, а запуск считается от 0,6
      new IntersectionObserver(([e]) => { if (!this.pin || this.mode === 'none') this.onView(e); }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }).observe(this.stage);
      // iframe грузятся при приближении: за один экран до кадра
      const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { near.disconnect(); this.load(); } }, { rootMargin: '100% 0px 100% 0px' });
      near.observe(this.stage);
      let w = 0;
      new ResizeObserver(() => { const nw = this.stage.clientWidth; if (nw !== w) { w = nw; this.onResize(); } }).observe(this.stage);
      reduce.addEventListener('change', () => {
        if (!reduce.matches) return;
        if (this.pin) { pins.remove(this); this.art.classList.add('ev-scene--nopin'); this.mode = 'none'; this.scaled.style.transform = ''; }
        if (this.ready) { this.stop(); this.jump(this.scene.still ?? Infinity); this.setState('still'); queue.release(this); }
      });
    }

    // --- загрузка ---
    async load() {
      const loadingTimer = setTimeout(() => { if (!this.ready) this.fig.classList.add('is-loading'); }, LOADING_AFTER);
      const all = [...Object.values(this.frames), this.phoneFrame].filter(Boolean);
      await Promise.all(all.map((f) => new Promise((res) => {
        f.addEventListener('load', res, { once: true });
        f.src = withTheme(f.dataset.src);
      })));
      await Promise.all(all.map((f) => f.contentWindow.EV?.ready));
      await document.fonts.ready;
      // высота экрана в кадре: сколько занимает страница при 1280 × 800, не меньше 800
      for (const f of Object.values(this.frames)) {
        const h = f.contentDocument.documentElement.scrollHeight;
        f.style.height = `${Math.min(Math.max(h, this.H), 1800)}px`;
      }
      if (this.phoneFrame) this.phoneScroll();
      clearTimeout(loadingTimer);
      this.ready = true;
      if (reduce.matches) { this.jump(this.scene.still ?? Infinity); this.setState('still'); } else this.jump(0);
      // без requestAnimationFrame: в фоновой вкладке он стоит, а кадр должен быть готов, когда зритель вернётся
      void this.world.offsetWidth;
      this.fig.classList.remove('is-loading');
      this.fig.classList.add('is-ready');
      this.check();
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

    // --- подписи шагов (решение пользователя 2026-10-28 «Превью «Неделя»: одна подпись за раз», BEHAVIOR.md 5.3) ---
    // пары «заголовок + текст» подписи - в .ev-cap__step; две и больше - подпись следует за шагом
    wrapCaps() {
      if (!this.cap) return;
      const steps = [];
      for (const el of [...this.cap.children]) {
        if (el.classList.contains('ev-cap__t') || !steps.length) {
          const st = document.createElement('div');
          st.className = 'ev-cap__step';
          steps.push(st);
        }
        steps.at(-1).append(el);
      }
      this.cap.append(...steps);
      if (steps.length < 2) return;
      this.capSteps = steps;
      this.cap.classList.add('ev-cap--steps');
      this.updateSteps();
    }
    // --- закрепление на скролле ---
    setupPin() {
      this.pin = document.createElement('div');
      this.pin.className = 'ev-pin';
      this.pin.append(...this.art.children);
      this.art.append(this.pin);
      this.art.classList.add('ev-scene--pin');
      this.cap = this.pin.querySelector('.ev-cap');
      this.wrapCaps();
      pins.add(this);   // замер - реестр: при встраивании, после шрифтов и когда меняется окно закреплений
    }
    // подпись и кадр вместе, если помещаются в видимую высоту с полями; иначе закреплён только кадр, подпись уезжает;
    // кадр сам выше окна - не закрепляем (запуск по видимости)
    measure() {
      if (!this.pin) return;
      const vh = pins.vh(), gap = msTok('--s4');
      this.art.classList.remove('ev-scene--capout', 'ev-scene--nopin');
      if (this.cap && this.cap.parentElement !== this.pin) this.pin.prepend(this.cap);
      this.pin.style.transform = '';
      this.capMode = 'flow';
      const stacked = getComputedStyle(this.pin).gridTemplateColumns.split(' ').length < 2;
      const fits = () => this.pin.offsetHeight <= vh - 2 * gap;
      if (this.cap && stacked && !fits()) {
        this.art.classList.add('ev-scene--capout');
        this.art.insertBefore(this.cap, this.pin);
      }
      const capOut = this.cap && this.cap.parentElement !== this.pin;
      this.off = capOut ? this.cap.offsetHeight + parseFloat(getComputedStyle(this.cap).marginBottom) : 0;
      this.pinH = this.pin.offsetHeight;
      this.mode = this.pinH > vh - 2 * gap ? 'none' : 'pin';
      if (this.mode === 'none') this.art.classList.add('ev-scene--nopin');
      this.top = Math.max(gap, (vh - this.pinH) / 2);
      this.art.style.setProperty('--ev-pin-h', `${Math.ceil(this.off + this.pinH)}px`);
      this.art.style.setProperty('--ev-pin-top', `${Math.round(this.top)}px`);
      // масштабируется кадр целиком; если подпись закреплена над ним - вместе с подписью
      this.scaled = stacked && !capOut ? this.pin : this.fig.querySelector('.ev__frame');
      for (const el of [this.pin, this.fig.querySelector('.ev__frame')]) if (el !== this.scaled) el.style.transform = '';
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
      const tall = this.stage.clientHeight > vh;
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
      const docs = [...Object.values(this.frames), this.phoneFrame].filter(Boolean).map((f) => f.contentDocument).filter(Boolean);
      return [...this.anims.filter((a) => a.playState !== 'finished'), ...docs.flatMap((d) => d.getAnimations())];
    }
    stop() {
      cancelAnimationFrame(this.raf); this.raf = 0;
      for (const a of this.anims) a.cancel();
      this.anims = [];
      clearTimeout(this.downTimer);
    }

    // --- состояние сцены на момент t без движения: сброс и все шаги до t ---
    jump(t) {
      this.stop();
      for (const f of Object.values(this.frames)) f.contentWindow?.EV?.reset();
      this.cur = this.scene.start;
      this.showFrame(this.cur);
      this.cursorPos = null;
      this.cursor.style.opacity = '0';
      this.cursor.style.transform = '';
      if (this.phone) { this.phone.classList.remove('is-on'); this.phone.style.transform = ''; }
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
      // полоска загрузки - сверху видимой части экрана, как сверху окна браузера
      if (s.load) this.ev().loading(true, this.viewTop(this.world.style.transform));
      const was = s.frame && live ? this.frames[this.cur] : null;
      const from = was && getComputedStyle(this.world).transform;
      if (s.frame) { this.cur = s.frame; this.showFrame(s.frame, live); }
      if (s.cam) this.camTo(s.cam, live ? s.dur ?? 800 : 0);
      // новый экран открывается со своего верха; старый держим на месте, пока новый проявляется поверх
      if (was && was !== this.frames[this.cur]) {
        const m0 = new DOMMatrix(from), m1 = new DOMMatrix(this.world.style.transform || 'none');
        was.style.transform = `translateY(${((m0.f - m1.f) / m1.a).toFixed(1)}px)`;
      }
      if (s.cursor) this.cursorTo(s.cursor, s.at, live ? s.dur ?? 600 : 0);
      if (s.cursorOut) this.cursorOut(live);
      if (s.hover) this.ev().hover(s.hover, true);
      if (s.unhover) this.ev().hover(s.unhover, false);
      if (s.click) this.click(s.click, live);
      if (s.step != null) this.ev(s.in).step(s.step, live);
      if (s.untip) this.ev().tip(null, false);
      if (s.tip) this.ev().tip(s.tip, true);
      if (s.phone) this.phoneIn(live ? s.dur ?? 700 : 0);
    }
    // Смена экрана: новый проявляется поверх старого за --dur-slow, меню на месте - видно, что открылась страница того же сервиса
    showFrame(name, live = false) {
      const next = this.frames[name];
      const prev = live ? Object.values(this.frames).find((f) => f !== next && !f.classList.contains('is-off')) : null;
      for (const f of Object.values(this.frames)) {
        f.classList.toggle('is-off', f !== next && f !== prev);
        f.style.zIndex = f === next ? '1' : '';
        if (f !== prev) f.style.transform = '';
      }
      this.worldH = parseFloat(next.style.height) || this.H;
      if (prev) this.animate(next, [{ opacity: 0 }, { opacity: 1 }], msTok('--dur-slow'), tok('--easing-out'))
        .finished.then(() => { prev.classList.add('is-off'); prev.style.transform = ''; }).catch(() => {});
    }
    // верх видимой части экрана в px документа при положении камеры transform
    viewTop(transform) {
      const m = new DOMMatrix(transform || 'none');
      return Math.max(0, -m.f / m.a);
    }
    animate(el, frames, dur, easing) {
      const a = el.animate(frames, { duration: dur, easing, fill: 'forwards' });
      this.anims.push(a);
      a.finished.then(() => { a.commitStyles?.(); a.cancel(); this.anims = this.anims.filter((x) => x !== a); }).catch(() => {});
      return a;
    }

    // Камера: прямоугольник цели вписывается в кадр (или в его долю area), масштаб не больше MAX_SCALE,
    // экран не уходит из кадра, пока он больше кадра.
    camera(target) {
      const W = this.stage.clientWidth, H = this.stage.clientHeight;
      const narrow = W < NARROW;
      let tg = target;
      if (target && (target.wide !== undefined || target.narrow !== undefined)) tg = narrow ? (target.narrow === undefined ? target.wide : target.narrow) : target.wide;
      if (tg === null) return null;   // для этого кадра камера не двигается
      let r;
      if (tg === 'all' || tg.all) r = { x: 0, y: 0, w: this.W, h: this.H };
      else if (tg.view) {
        // окно экрана вокруг элемента, как прокрученное окно браузера: элемент в верхних 80 % - окно сверху страницы
        const e = this.ev().rect(tg.view), w = tg.w ?? this.W, h = tg.h ?? this.H;
        const y = !e || e.y + e.h <= h * 0.8 ? 0 : Math.min(this.worldH - h, e.y + e.h / 2 - h / 2);
        r = { x: 0, y, w, h };
      }
      else {
        const ev = this.ev();
        const rs = [].concat(tg.sel).map((s) => ev.rect(s)).filter(Boolean);
        if (!rs.length) { console.warn('ev: нет цели камеры', tg.sel); return null; }
        const x1 = Math.min(...rs.map((q) => q.x)), y1 = Math.min(...rs.map((q) => q.y));
        const x2 = Math.max(...rs.map((q) => q.x + q.w)), y2 = Math.max(...rs.map((q) => q.y + q.h));
        const pad = tg.pad ?? 24;
        r = { x: x1 - pad, y: y1 - pad, w: x2 - x1 + 2 * pad, h: y2 - y1 + 2 * pad };
        if (tg.w && r.w > tg.w) { if (tg.align === 'right') r.x += r.w - tg.w; else if (tg.align === 'center') r.x += (r.w - tg.w) / 2; r.w = tg.w; }
        if (tg.h && r.h > tg.h) r.h = tg.h;
        if (tg.dx) r.x += tg.dx;
      }
      const [ax, ay, aw, ah] = (tg.area || [0, 0, 1, 1]).map((v, i) => v * (i % 2 ? H : W));
      const s = Math.min(aw / r.w, ah / r.h, tg.max ?? MAX_SCALE[narrow ? 'narrow' : 'wide']);
      let tx = ax + aw / 2 - (r.x + r.w / 2) * s;
      let ty = ay + ah / 2 - (r.y + r.h / 2) * s;
      const ww = this.W * s, wh = this.worldH * s;
      if (!tg.area) {
        tx = ww <= W ? (W - ww) / 2 : Math.min(0, Math.max(W - ww, tx));
        ty = wh <= H ? (H - wh) / 2 : Math.min(0, Math.max(H - wh, ty));
      }
      if (narrow && s < 0.85 && !(tg === 'all' || tg.all || tg.view)) console.warn(`ev: мелкий план ${s.toFixed(2)} в узком кадре`, tg.sel);
      return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
    }
    camTo(target, dur) {
      const to = this.camera(target);
      if (!to) return;
      const from = getComputedStyle(this.world).transform;
      // прежнее движение камеры отменяется, иначе при завершении оно запишет своё положение поверх нового
      for (const a of this.world.getAnimations()) a.cancel();
      this.world.style.transform = to;
      if (!dur) return;
      this.animate(this.world, [{ transform: from === 'none' ? to : from }, { transform: to }], dur, tok('--easing-out'));
    }

    // Курсор: остриё ставится в точку элемента (доли ширины и высоты), появляется со сдвигом, как палец первой сборки
    cursorTo(sel, at = [0.5, 0.5], dur) {
      const r = this.ev().rect(sel);
      if (!r) { console.warn('ev: нет цели курсора', sel); return; }
      const k = this.cursor.offsetWidth / 24;
      const x = r.x + r.w * at[0] - 4 * k, y = r.y + r.h * at[1] - 4 * k;
      const to = `translate(${x}px, ${y}px)`;
      const fromPos = this.cursorPos;
      this.cursorPos = { x, y };
      this.cursor.style.transform = to;
      this.cursor.style.opacity = '1';
      if (!dur) return;
      const from = fromPos ? `translate(${fromPos.x}px, ${fromPos.y}px)` : `translate(${x + 48}px, ${y + 72}px)`;
      this.animate(this.cursor, [{ transform: from, opacity: fromPos ? 1 : 0 }, { transform: to, opacity: 1 }], dur, tok('--easing'));
    }
    cursorOut(live) {
      this.cursorPos = null;
      this.cursor.style.opacity = '0';
      if (live) this.animate(this.cursor, [{ opacity: 1 }, { opacity: 0 }], msTok('--dur'), tok('--easing'));
    }
    // Нажатие: элемент - своё состояние нажатия из системы на --dur; курсор коротко сжимается и возвращается пружиной (действие тренера)
    click(sel, live) {
      if (!live) return;
      const ev = this.ev();
      ev.down(sel, true);
      this.downTimer = setTimeout(() => ev.down(sel, false), msTok('--dur'));
      const svg = this.cursor.querySelector('svg');
      this.animate(svg, [{ transform: 'scale(1)' }, { transform: 'scale(.8)' }], msTok('--dur'), tok('--easing'))
        .finished.then(() => this.animate(svg, [{ transform: 'scale(.8)' }, { transform: 'scale(1)' }], msTok('--dur-spring'), tok('--easing-spring'))).catch(() => {});
    }

    // Телефон: та же тренировка на экране 390; выезжает снизу (слой демо, не переход продукта)
    phoneScroll() {
      const w = this.phoneFrame.contentWindow;
      const r = w.EV?.rect(this.scene.phone?.scrollTo || 'body');
      if (r) w.scrollTo(0, Math.max(0, r.y - (this.scene.phone?.gap ?? 16)));
    }
    // в узком кадре телефон по центру (ev.css) и уменьшен, чтобы рамка поместилась с полями --s4
    phoneLayout() {
      const W = this.stage.clientWidth;
      if (W >= NARROW) return '';
      const s = Math.min(1, (W - 2 * msTok('--s4')) / this.phone.offsetWidth);
      return `translateX(-50%) scale(${s.toFixed(4)})`;
    }
    phoneIn(dur) {
      this.phone.classList.add('is-on');
      const base = this.phoneLayout();
      const to = `translateY(0px) ${base}`;
      this.phone.style.transform = to;
      if (!dur) return;
      this.animate(this.phone, [{ transform: `translateY(${this.stage.clientHeight}px) ${base}` }, { transform: to }], dur, tok('--easing-out'));
    }
  }

  // ?scene=a - одно превью без подписи и заголовка (тест 5 секунд)
  const solo = params.get('scene');
  if (solo && document.querySelector(`.ev-scene[data-scene="${solo}"]`)) {
    document.body.classList.add('ev-solo');
    document.querySelector(`.ev-scene[data-scene="${solo}"]`).classList.add('is-solo');
  }
  for (const fig of document.querySelectorAll('.ev[data-scene]')) {
    if (solo && fig.dataset.scene !== solo) continue;
    const scene = window.EV_SCENES[fig.dataset.scene];
    fig.player = new Player(fig, scene);
  }
})();
