// Первый экран лендинга с колодой из трёх экранов продукта - DESIGN.md 5.9 «Колода первого экрана .lp-deck», поведение -
// BEHAVIOR.md 5.3. Рисует весь первый экран в #nb-hero: знак «АПС!», кот-волна, утверждённые тексты (Тексты лендинга.md,
// блок 1), «Попробовать», колода, подпись карточки и «колбаски» с паузой.
//
// Экраны - живая разметка прототипов (screens.js) со стилями прототипов (screens.css), неактивные: inert и aria-hidden.
// Колода: текущая карточка наверху и в полном масштабе, остальные под ней чуть меньше, по давности показа; каждые
// --lp-deck-dwell (3 с) следующая выходит из-под текущей вбок, встаёт наверх и возвращается на место, прежняя ложится
// прямо под неё. Время показа -
// заполнение текущей «колбаски» (анимация на ней же: пауза анимации - пауза колоды). Нажатие на «колбаску» или карточку
// выводит её наверх. Пауза - кнопкой, при уходе первого экрана из вида и на скрытой вкладке. «Уменьшение движения» -
// без автопрокрутки и движения, смена по нажатию.
(() => {
  const mount = document.getElementById('nb-hero');
  if (!mount) return;
  const me = document.currentScript;
  const near = (file) => { const u = new URL(file, me.src); u.search = new URL(me.src).search; return u.href; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Подписи карточек - черновики, список ведёт README страницы («Тексты блоков», «Первый экран»)
  const CAPS = [
    'Вся неделя на одном экране - и&nbsp;видно, куда поставить нового клиента',
    'Каждый клиент как на&nbsp;ладони - даже с&nbsp;телефона',
    'У&nbsp;клиента своё приложение: он&nbsp;отмечает подходы, вы&nbsp;видите результат',
  ].map((t) => t.replace(' - ', '&nbsp;- '));
  const LABELS = { playing: 'Пауза', paused: 'Воспроизвести' };

  const load = (el) => new Promise((ok, fail) => { el.onload = ok; el.onerror = () => fail(new Error(`hero: не загрузилось ${el.src || el.href}`)); });
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = near('screens.css');
  const js = document.createElement('script');
  js.src = near('screens.js');
  const ready = Promise.all([load(css), load(js)]);
  document.head.append(css);
  document.body.append(js);
  ready.then(build).catch((e) => console.error(e));

  function build() {
    const S = window.HD_SCREENS;
    const n = S.screens.length;
    const crown = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18.5 4.5 7 9 12 12 5 15 12 19.5 7 21 18.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
    const ico = (d, attr = '') => `<svg class="i"${attr} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const ARROW = ico('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>');
    const PLAY = '<path d="M8 5.5v13l10-6.5z"/>';
    const PAUSE = '<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>';

    mount.innerHTML = `${S.sprite}
<header class="lp-band lp-hero lp-hero--deck">
  <div class="lp-wrap lp-hero__in">
    <div class="lp-hero__top">
      <div class="lp-mark">${crown}<span>АПС!</span></div>
      <img class="lp-hero__cat" src="../../design/directions/assets/v2/cat-wave.webp" alt="" width="220" height="220">
    </div>
    <div class="lp-hero__text">
      <p class="lp-hero__eyebrow">Приложение для персональных тренеров, которые ведут тренировки онлайн и&nbsp;в зале</p>
      <h1 class="lp-hero__title">Ведите больше клиентов</h1>
      <p class="lp-hero__lead">Программу под каждого клиента собираете быстрее, а&nbsp;кто начал пропадать&nbsp;- видно сразу</p>
      <!-- ЗАГЛУШКА: «Попробовать» ведёт на квал-вопросы, затем регистрация. Адрес - при разработке. -->
      <a class="btn btn--primary btn--lg lp-cta" href="#try" data-cta="try">Попробовать${ARROW}</a>
      <p class="lp-hero__note">14 дней бесплатно и&nbsp;без привязки карты</p>
    </div>
    <div class="lp-deck" role="region" aria-roledescription="карусель" aria-label="Экраны приложения">
      <div class="lp-deck__stage"><div class="lp-deck__world">${S.screens.map((s, i) => `
        <div class="lp-deck__card" data-i="${i}" role="group" aria-roledescription="слайд" aria-label="${i + 1} из ${n}: ${s.name}">
          <div class="lp-deck__dev lp-deck__dev--${s.kind}"><div class="lp-deck__glass"><div class="hd-scr ${s.root}" inert aria-hidden="true">${s.html()}</div></div></div>
        </div>`).join('')}
      </div></div>
      <p class="lp-deck__cap" aria-live="off">${CAPS.map((c, i) => `<span data-i="${i}">${c}</span>`).join('')}</p>
      <div class="pv-steps">
        <button class="btn btn--shell lp-deck__ctl" type="button">${ico(PAUSE, ' data-ico="pause"')}${ico(PLAY, ' data-ico="play"')}<span class="lp-deck__ctl-l">${LABELS.playing}</span></button>
        <div class="pv-steps__dots" role="group" aria-label="Экраны">${S.screens.map((s, i) => `<button class="pv-steps__dot" type="button" data-i="${i}" aria-label="Экран ${i + 1} из ${n}: ${s.name}"><span><i></i></span></button>`).join('')}</div>
      </div>
    </div>
  </div>
</header>`;
    deck(mount.querySelector('.lp-deck'), S);
  }

  function deck(root, S) {
    const stage = root.querySelector('.lp-deck__stage');
    const world = root.querySelector('.lp-deck__world');
    const cards = [...root.querySelectorAll('.lp-deck__card')];
    const devs = cards.map((c) => c.querySelector('.lp-deck__dev'));
    const caps = [...root.querySelectorAll('.lp-deck__cap > span')];
    const cap = root.querySelector('.lp-deck__cap');
    const dots = [...root.querySelectorAll('.pv-steps__dot')];
    const ctl = root.querySelector('.lp-deck__ctl');
    const ctlLabel = ctl.querySelector('.lp-deck__ctl-l');
    const v = (name) => getComputedStyle(root).getPropertyValue(name).trim();
    const ms = (name) => parseFloat(v(name)) * (v(name).endsWith('ms') ? 1 : 1000);
    const num = (name) => parseFloat(v(name));

    // ---------- геометрия: сцена в пикселях экранов ----------
    let geo = null;
    function layout() {
      const P = num('--lp-deck-phone');
      const size = devs.map((d, i) => ({ w: d.offsetWidth, h: d.offsetHeight, k: S.screens[i].kind === 'phone' ? P : 1 }));
      const desk = size[0];
      const ph = size[1];
      const pw = ph.w * P;
      const phH = ph.h * P;
      const out = pw * num('--lp-deck-out');
      const W = desk.w + 2 * out;
      const H = Math.max(desk.h * (1 + num('--lp-deck-drop')), phH);
      const slots = [
        { x: out, y: 0 },
        { x: 0, y: H - phH },
        { x: W - pw, y: H - phH },
      ];
      geo = { W, H, cards: size.map((s, i) => ({ ...slots[i], w: s.w * s.k, h: s.h * s.k, k: s.k })) };
      world.style.width = `${W}px`;
      world.style.height = `${H}px`;
      stage.style.aspectRatio = `${W} / ${H}`;
      cards.forEach((c, i) => {
        const g = geo.cards[i];
        Object.assign(c.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${g.w}px`, height: `${g.h}px`, transformOrigin: i ? '50% 100%' : '50% 50%' });
        devs[i].style.transform = g.k === 1 ? '' : `scale(${g.k})`;
      });
      fit();
    }
    function fit() {
      if (!geo) return;
      world.style.transform = `scale(${stage.clientWidth / geo.W})`;
    }
    new ResizeObserver(fit).observe(stage);

    // ---------- состояние ----------
    let cur = 0;
    // Порядок карточек снизу вверх - по давности, как в настоящей колоде: наверху текущая, под ней предыдущая, ниже старшие.
    // На старте - как после полного круга: под календарём телефон клиента, в самом низу - тренера (следующий по очереди).
    let order = cards.map((_, k) => (cur + 1 + k) % cards.length);
    let userPaused = false;
    let offscreen = false;
    let hidden = document.hidden;
    let fill = null;     // анимация заполнения текущей «колбаски» - она же таймер показа
    let moving = [];     // анимации карточек при смене

    const back = () => num('--lp-deck-back');
    const playing = () => !userPaused && !offscreen && !hidden && !reduce.matches;
    const rest = (i) => `scale(${i === cur ? 1 : back()})`;

    function stack() {
      cards.forEach((c, i) => { c.classList.toggle('is-top', i === cur); c.style.zIndex = order.indexOf(i) + 1; });
    }
    function place() {
      stack();
      cards.forEach((c, i) => { c.style.transform = rest(i); });
    }
    function marks() {
      dots.forEach((d, i) => {
        d.classList.toggle('is-on', i === cur);
        if (i === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }
    function stop() {
      moving.forEach((a) => { a.onfinish = null; a.cancel(); });
      moving = [];
    }

    function caption(prev) {
      caps.forEach((c, i) => {
        if (i === cur) {
          c.classList.remove('is-out');
          c.style.transition = 'none';
          void c.offsetWidth;
          c.style.transition = '';
          c.classList.add('is-on');
          c.removeAttribute('aria-hidden');
        } else {
          c.classList.toggle('is-out', i === prev);
          c.classList.remove('is-on');
          c.setAttribute('aria-hidden', 'true');
        }
      });
    }

    function startFill() {
      if (fill) fill.cancel();
      fill = null;
      if (reduce.matches) return; // без автопрокрутки текущая «колбаска» просто залита (hero.css)
      const bar = dots[cur].querySelector('i');
      fill = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: ms('--lp-deck-dwell'), easing: 'linear', fill: 'forwards' });
      fill.onfinish = () => go((cur + 1) % cards.length);
      if (!playing()) fill.pause();
    }

    // Смена: следующая выходит из-под текущей вбок (от центра текущей) на --lp-deck-shift ширины телефона, на полпути
    // встаёт наверх и возвращается на место; прежняя уменьшается и остаётся прямо под ней, остальные лежат как лежали.
    // Два отрезка по --dur-slow, кривая --easing-out. Шаг - от ширины телефона, а не своей: календарь сдвигается так же,
    // как телефон, и не заходит на текст, а крайний телефон не уходит за край окна.
    function go(next) {
      if (next === cur) return;
      stop();
      place();
      const prev = cur;
      cur = next;
      order = order.filter((i) => i !== next).concat(next); // слой меняется на полпути (stack), до того карточка лежит, где лежала
      marks();
      caption(prev);
      timer();
      if (reduce.matches) {
        place();
        return;
      }
      const dur = ms('--dur-slow');
      const easing = v('--easing-out');
      const a = geo.cards[next];
      const b = geo.cards[prev];
      const dir = Math.sign(a.x + a.w / 2 - (b.x + b.w / 2)) || -1;
      const dx = dir * Math.min(...geo.cards.map((c) => c.w)) * num('--lp-deck-shift');
      const dy = -a.h * 0.04;
      const mid = (1 + back()) / 2;
      const nc = cards[next];
      const pc = cards[prev];
      const outA = nc.animate([{ transform: `translate(0, 0) scale(${back()})` }, { transform: `translate(${dx}px, ${dy}px) scale(${mid})` }], { duration: dur, easing, fill: 'forwards' });
      const prevA = pc.animate([{ transform: 'scale(1)' }, { transform: `scale(${back()})` }], { duration: dur * 2, easing, fill: 'forwards' });
      moving = [outA, prevA];
      outA.onfinish = () => {
        stack();
        const inA = nc.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${mid})` }, { transform: 'translate(0, 0) scale(1)' }], { duration: dur, easing, fill: 'forwards' });
        moving.push(inA);
        inA.onfinish = () => { place(); stop(); };
      };
      startFill();
    }

    function sync() {
      root.dataset.state = playing() ? 'playing' : 'paused';
      ctlLabel.textContent = userPaused ? LABELS.paused : LABELS.playing;
      ctl.setAttribute('aria-label', `${userPaused ? LABELS.paused : LABELS.playing}: смена экранов`);
      cap.setAttribute('aria-live', playing() ? 'off' : 'polite');
      if (fill) { if (playing()) fill.play(); else fill.pause(); }
      timer();
    }

    // ---------- отдых на телефоне клиента: таймер идёт, пока карточка наверху и колода играет ----------
    const restCard = S.screens.findIndex((s) => s.id === 'client');
    const restT = cards[restCard].querySelector('.rest__t');
    const restRing = cards[restCard].querySelector('.ring__v');
    let restLeft = S.rest.from;
    let restTick = null;
    const drawRest = () => { const r = S.rest.at(restLeft); restT.textContent = r.t; restRing.setAttribute('stroke-dasharray', r.dash); };
    function timer() {
      const on = cur === restCard && playing();
      if (on && !restTick) {
        restTick = setInterval(() => { if (restLeft > 1) { restLeft -= 1; drawRest(); } }, 1000);
      } else if (!on && restTick) {
        clearInterval(restTick);
        restTick = null;
      }
      if (cur !== restCard && restLeft !== S.rest.from) { restLeft = S.rest.from; drawRest(); }
    }

    // ---------- управление ----------
    const pick = (i) => { userPaused = false; go(i); sync(); };
    dots.forEach((d, i) => d.addEventListener('click', () => (i === cur ? (userPaused = false, sync()) : pick(i))));
    cards.forEach((c, i) => c.addEventListener('click', () => { if (i !== cur) pick(i); }));
    ctl.addEventListener('click', () => { userPaused = !userPaused; sync(); });
    new IntersectionObserver(([e]) => { offscreen = e.intersectionRatio < 1 / 3; sync(); }, { threshold: [0, 1 / 3, 1] }).observe(stage);
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; sync(); });
    reduce.addEventListener('change', () => { stop(); place(); startFill(); sync(); });

    // размеры экранов заданы явно (screens.css) - сцену считаем сразу, без ожидания шрифтов
    layout();
    place();
    marks();
    caption(-1);
    startFill();
    sync();
  }
})();
