// Общие компоненты экранов (APS.kit): бегунок усилия и шкала боли, лист формы, чипы-радиогруппа, тост, значение подхода.
// Стили - app.css; описание - DESIGN.md 5.3, 5.6; правила - BEHAVIOR.md 5.6, 5.7. Подключается на всех экранах после parts/app.js.
window.APS = window.APS || {};
(() => {
  const { esc, ui } = APS;
  const { icon } = ui;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Подписи шкал - одна копия в parts/model.js (APS.fmt): усилие, самочувствие, сила боли
  const { EFFORT, WELL, painWord, painText } = APS.fmt;

  // ---------- Бегунок .eff (DESIGN.md 5.3, плавный бегунок 2026-10-28; прежняя версия - design/client/archive/eff-v1-2026-10-28/) ----------
  // Бегунок идёт за пальцем без шагов, значение - ближайшее целое; отпустили - доезжает до него (усилие - пружиной, боль - спокойно).
  // Подпись - барабан, привязанный к положению: на полпути видны обе подписи наполовину, в мягкой маске без обрезания.
  // Усилие: огонёк разгорается (растёт и заполняется лаймом), дрожит, пока клиент двигает; на 7-10 - искры, на 10 - вспышка.
  // Боль - нейтрально: без огонька, искр и пружины; число крутится на каждом шаге, слово - только на границе.
  const PAIN_WORDS = [0, 1, 4, 7].map(painWord);                       // нет · слабая · умеренная · сильная
  const painIdx = (v) => PAIN_WORDS.indexOf(painWord(v));
  const tok = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
  const ms = (s) => (s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000);
  function bezier(s) {                                                    // кривая токена движения для доезда
    const m = s.match(/cubic-bezier\(([^)]+)\)/);
    if (!m) return (t) => t;
    const [x1, y1, x2, y2] = m[1].split(',').map(Number);
    const B = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
    return (x) => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (B(t, x1, x2) < x) lo = t; else hi = t; } return B(t, y1, y2); };
  }
  const drum = (cls, items) => `<span class="eff__drum ${cls}">${items.map((t) => `<span class="eff__item">${esc(t)}</span>`).join('')}</span>`;
  // Огонёк - контур Lucide flame из спрайта и под ним та же фигура заливкой (заливка - DESIGN.md 4, журнал)
  const flameD = () => { const p = document.querySelector('#i-flame path'); return p ? p.getAttribute('d') : ''; };

  // html(o): o.key, o.label (aria-label), o.value (null - не выбрано), o.pain (шкала боли 0-10), o.hint (подпись до выбора),
  // o.card: true - бегунок карточкой на всю ширину строки (в «Выполнении тренировки»), o.skip: true - кнопка «Пропустить оценку» сразу, 'after' - «Сбросить оценку» появляется после выбора (место под неё занято всегда)
  function effHtml(o) {
    const min = o.pain ? 0 : 1, has = o.value != null;
    const hint = o.hint || (o.pain ? 'Насколько? Коснитесь полосы' : 'Как далось? Коснитесь полосы');
    const val = o.pain
      ? `${drum('eff__drum--num', Array.from({ length: 11 }, (_, i) => String(i)))} из 10 · ${drum('eff__drum--word', PAIN_WORDS)}`
      : drum('eff__drum--block', EFFORT.slice(1));
    const d = o.pain ? '' : flameD();
    const flame = o.pain ? '<span class="eff__dot" aria-hidden="true"></span>' : `<span class="eff__pop"><span class="eff__flick"><span class="eff__flame" aria-hidden="true">
        <svg class="eff__flame-tint" viewBox="0 0 24 24"><path d="${d}" fill="currentColor"/></svg>
        <svg class="eff__flame-fill" viewBox="0 0 24 24"><path d="${d}" fill="currentColor"/></svg>
        <svg class="eff__flame-line" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>
      </span></span></span>`;
    const after = o.skip === 'after';
    return `<div class="eff${o.pain ? ' eff--pain' : ''}${o.card ? ' eff--card' : ''}${has ? ' has-v' : ''}${o.skip ? '' : ' eff--solo'}${after ? ' eff--skip-after' : ''}" data-eff="${esc(o.key)}">
      <div class="eff__range" role="slider" tabindex="0" aria-label="${esc(o.label)}" aria-valuemin="${min}" aria-valuemax="10"${has ? ` aria-valuenow="${o.value}"` : ''} aria-valuetext="${esc(has ? (o.pain ? painText(o.value) : EFFORT[o.value]) : 'не выбрано')}">
        <span class="eff__cap" aria-hidden="true"><span class="eff__hint">${esc(hint)}</span><span class="eff__val">${val}</span></span>
        <span class="eff__track"><span class="eff__fill"></span><span class="eff__thumb"><span class="eff__body">${flame}</span></span><span class="eff__fx"></span></span>
      </div>
      ${o.skip ? `<button class="btn btn--icon eff__skip" type="button" data-eff-skip aria-label="${after ? 'Сбросить оценку' : 'Пропустить оценку'}">${icon('close', 'i--m')}</button>` : ''}
    </div>`;
  }

  // bind(root, o): o.pain, o.onTouch() - коснулись, o.onChange(v) - новое целое, o.onCommit(v) - отпустили палец / клавиша, o.onSkip()
  function effBind(root, o) {
    const range = root.querySelector('.eff__range');
    const track = root.querySelector('.eff__track');
    const thumb = root.querySelector('.eff__thumb');
    const fx = root.querySelector('.eff__fx');
    const min = o.pain ? 0 : 1, max = 10, span = max - min;
    let v = range.hasAttribute('aria-valuenow') ? Number(range.getAttribute('aria-valuenow')) : null;   // целое значение
    let pos = v == null ? min : v;                                                                       // непрерывное положение
    let drag = false, tween = 0, liveT = 0, lastX = 0, lastT = 0, st = 0, decay = 0;

    // Барабаны: положение каждого - функция от непрерывного pos
    const drums = [...root.querySelectorAll('.eff__drum')].map((el) => ({
      el, items: [...el.querySelectorAll('.eff__item')], w: [],
      kind: el.classList.contains('eff__drum--num') ? 'num' : el.classList.contains('eff__drum--word') ? 'word' : 'label',
    }));
    const measure = () => {
      drums.forEach((d) => { if (d.kind !== 'label') d.w = d.items.map((it) => it.scrollWidth); });
      root.style.setProperty('--track-w', `${track.clientWidth}px`);
    };
    const drumPos = (d, x) => {
      if (d.kind === 'num') return x;
      if (d.kind === 'label') return x - 1;
      const a = Math.floor(x), b = Math.ceil(x), ia = painIdx(a), ib = painIdx(b);   // слово катится только на границе
      return ia === ib ? ia : ia + (ib - ia) * (x - a);
    };

    function paint() {
      const p = (pos - min) / span;
      root.style.setProperty('--p', p.toFixed(4));
      if (!o.pain) { root.style.setProperty('--h', p.toFixed(4)); root.style.setProperty('--fl', (0.15 + 0.85 * p).toFixed(4)); }
      const still = reduced();
      drums.forEach((d) => {
        const at = drumPos(d, pos);
        d.items.forEach((it, i) => {
          const off = i - at, a = Math.abs(off);
          if (a >= 1) { it.style.opacity = '0'; it.style.transform = `translateY(${Math.sign(off) * 100}%)`; it.style.filter = ''; return; }
          it.style.opacity = String(1 - a);
          it.style.transform = `translateY(${off * 100}%)`;
          it.style.filter = !still && a > 0.02 ? `blur(${(a * 1.8).toFixed(2)}px)` : '';
        });
        if (d.w.length) {   // ширина - между ширинами соседних подписей: без скачка «9 → 10» и «слабая → умеренная»
          const a = Math.max(0, Math.min(d.items.length - 1, Math.floor(at))), b = Math.min(d.items.length - 1, a + 1);
          d.el.style.width = `${d.w[a] + (d.w[b] - d.w[a]) * (at - a)}px`;
        }
      });
    }

    function embers(n) {
      for (let i = 0; i < n; i++) {
        const e = document.createElement('span');
        e.className = 'eff__ember';
        e.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 28)}px`);
        e.style.setProperty('--rise', `${Math.round(26 + Math.random() * 22)}px`);
        e.style.animationDelay = `${i * 60}ms`;
        e.addEventListener('animationend', () => e.remove(), { once: true });
        fx.append(e);
      }
    }
    // Вспышка лучиков вокруг ручки; h - сила 0-1: на 10 и при ударе в максимум - 1 (8 длинных ярких лучиков),
    // при отпускании - по поставленному значению: на 1 - 4 коротких бледных у самой ручки (пользователь 2026-10-29)
    let lastMax = 0;
    function burst(h = 1) {
      const n = 4 + Math.round(4 * h);
      for (let i = 0; i < n; i++) {
        const r = document.createElement('span');
        r.className = 'eff__ray';
        r.style.setProperty('--a', `${(i + 0.5) * (360 / n)}deg`);
        r.style.setProperty('--reach', (1.05 + 0.45 * h).toFixed(2));
        r.style.setProperty('--len', (0.55 + 0.45 * h).toFixed(2));
        r.style.setProperty('--peak', (0.45 + 0.55 * h).toFixed(2));
        r.addEventListener('animationend', () => r.remove(), { once: true });
        fx.append(r);
      }
    }
    function release() {   // отпустили: вспышка по силе значения; если только что ударили в 10 - вторая не нужна
      if (o.pain || reduced() || v == null) return;
      if (performance.now() - lastMax < ms(tok(root, '--dur-slow')) * 1.8) return;
      burst((v - 1) / 9);
    }
    function setInt(k) {
      if (k === v) return;
      const up = v != null && k > v;
      v = k;
      range.setAttribute('aria-valuenow', v);
      range.setAttribute('aria-valuetext', o.pain ? painText(v) : EFFORT[v]);
      if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) { /* нет вибрации */ }
      if (!o.pain && up && !reduced()) {
        if (v >= 7) embers(v >= 10 ? 4 : v >= 8 ? 2 : 1);
        if (v === 10) { burst(1); lastMax = performance.now(); }
      }
      if (o.onChange) o.onChange(v);
    }
    function settle(to) {
      cancelAnimationFrame(tween);
      const from = pos;
      if (reduced() || from === to) { pos = to; paint(); return; }
      const dur = ms(tok(root, o.pain ? '--dur-slow' : '--dur-spring'));
      const ease = bezier(tok(root, o.pain ? '--easing-out' : '--easing-spring'));
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        pos = from + (to - from) * ease(t);
        paint();
        if (t < 1) tween = requestAnimationFrame(step);
      };
      tween = requestAnimationFrame(step);
    }
    function live(on) {
      if (o.pain) return;
      clearTimeout(liveT);
      if (on) root.classList.add('is-live');
      else liveT = setTimeout(() => root.classList.remove('is-live'), 1200);
    }
    function pop() {
      if (o.pain || reduced()) return;
      root.classList.remove('is-pop'); void root.offsetWidth; root.classList.add('is-pop');
    }
    function born() {
      root.classList.add('has-v');
      if (reduced()) return;
      root.classList.add('is-born');
      setTimeout(() => root.classList.remove('is-born'), ms(tok(root, '--dur-spring')) + 50);
    }
    // Растяжение бегунка от скорости и сжатие у края - отголосок капли из референса
    function stretch(val, origin) { st = val; root.style.setProperty('--st', st.toFixed(3)); root.style.setProperty('--st-o', origin); }
    function relax() {
      cancelAnimationFrame(decay);
      const go = () => { st *= 0.8; if (Math.abs(st) < 0.003) st = 0; root.style.setProperty('--st', st.toFixed(3)); if (st) decay = requestAnimationFrame(go); };
      decay = requestAnimationFrame(go);
    }
    function follow(cx) {
      const r = track.getBoundingClientRect();
      const runPx = r.width - thumb.offsetWidth;
      const p = (cx - r.left - thumb.offsetWidth / 2) / runPx;
      pos = min + Math.max(0, Math.min(1, p)) * span;
      const now = performance.now(), vx = Math.abs(cx - lastX) / Math.max(1, now - lastT);
      lastX = cx; lastT = now;
      if (!reduced()) {
        const over = p < 0 ? -p * runPx : p > 1 ? (p - 1) * runPx : 0;
        if (over > 0) stretch(-Math.min(over / 160, 0.1), p < 0 ? '0%' : '100%');
        else stretch(st * 0.55 + Math.min(vx * 0.07, 0.2) * 0.45, '50%');
      }
      paint();
      setInt(Math.round(pos));
    }

    // Палец: вертикальный жест - прокрутка экрана (touch-action: pan-y), оценка ставится только движением вбок
    // или коротким касанием при отпускании (ревью 2026-10-29: при прокрутке палец на полосе ставил оценку). Мышь и перо - сразу.
    const SLOP = 8;                                   // px до решения «вбок или прокрутка»
    let pend = null;                                  // касание пальцем, по которому ещё не решили
    function grab(e) {
      cancelAnimationFrame(tween); cancelAnimationFrame(decay);
      drag = true; range.classList.add('is-drag');
      try { range.setPointerCapture(e.pointerId); } catch (err) { /* без захвата */ }
      lastX = e.clientX; lastT = performance.now();
      if (v == null) { measure(); born(); }
      live(true);
      if (o.onTouch) o.onTouch();
      follow(e.clientX);
      range.classList.add('is-touch');   // кольцо фокуса - только с клавиатуры: после касания второго контура вокруг бегунка нет
      range.focus({ preventScroll: true });
    }
    range.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { pend = { id: e.pointerId, x: e.clientX, y: e.clientY }; return; }
      e.preventDefault();
      grab(e);
    });
    range.addEventListener('pointermove', (e) => {
      if (pend && e.pointerId === pend.id) {
        const dx = Math.abs(e.clientX - pend.x), dy = Math.abs(e.clientY - pend.y);
        if (dy > SLOP && dy > dx) { pend = null; return; }                       // прокрутка - оценку не ставим
        if (dx > SLOP) { const x = pend.x; pend = null; grab({ pointerId: e.pointerId, clientX: x }); follow(e.clientX); }
        return;
      }
      if (drag) follow(e.clientX);
    });
    const end = (e) => {
      if (pend && e && e.type === 'pointerup') { const x = pend.x; pend = null; grab({ pointerId: e.pointerId, clientX: x }); }   // короткое касание
      pend = null;
      if (!drag) return;
      drag = false; range.classList.remove('is-drag');
      relax();
      if (v == null) return;
      settle(v); pop(); live(false); release();
      if (o.onCommit) o.onCommit(v);
    };
    range.addEventListener('pointerup', end);
    range.addEventListener('pointercancel', end);
    range.addEventListener('keydown', (e) => {
      const k = e.key;
      let x = null;
      if (k === 'ArrowRight' || k === 'ArrowUp') x = v == null ? min : v + 1;
      else if (k === 'ArrowLeft' || k === 'ArrowDown') x = v == null ? max : v - 1;
      else if (k === 'Home') x = min;
      else if (k === 'End') x = max;
      if (x == null) return;
      e.preventDefault();
      range.classList.remove('is-touch');
      x = Math.max(min, Math.min(max, x));
      if (o.onTouch) o.onTouch();
      if (v == null) { measure(); pos = x; born(); }
      live(true);
      setInt(x);
      settle(x); pop(); live(false); release();
      if (o.onCommit) o.onCommit(v);
    });
    const skip = root.querySelector('[data-eff-skip]');
    if (skip && o.onSkip) skip.addEventListener('click', o.onSkip);

    measure();
    if (document.fonts) document.fonts.ready.then(() => { measure(); paint(); });
    new ResizeObserver(() => { measure(); paint(); }).observe(track);
    paint();
    return { get value() { return v; } };
  }

  // ---------- Лист формы .sheet ----------
  // open({ title, sub, body, foot, onMount(sheet, close), label }) -> close(). Фокус заперт в листе, после закрытия - на источник.
  function sheet(o) {
    const back = document.activeElement;
    const layer = document.createElement('div');
    layer.className = 'sheet-layer';
    layer.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t">
      <div class="sheet__head"><div><h2 class="sheet__title" id="sheet-t">${esc(o.title)}</h2>${o.sub ? `<p class="sheet__sub">${o.sub}</p>` : ''}</div>
        <button class="btn btn--icon sheet__x" type="button" data-sheet-close aria-label="Закрыть">${icon('close', 'i--m')}</button></div>
      <div class="sheet__body">${o.body}</div>
      <div class="sheet__foot">${o.foot}</div>
    </div>`;
    document.body.append(layer);
    document.documentElement.style.overflow = 'hidden';
    const el = layer.querySelector('.sheet');
    const close = () => {
      layer.remove();
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey, true);
      if (back && document.contains(back)) back.focus({ preventScroll: true });
      if (o.onClose) o.onClose();
    };
    const focusables = () => [...el.querySelectorAll('button:not([disabled]), [href], textarea, input, [tabindex="0"]')];
    function onKey(e) {
      if (e.key === 'Escape') {
        const typed = [...el.querySelectorAll('textarea, input')].some((x) => x.value.trim());
        if (!typed) { e.preventDefault(); close(); }
      } else if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    layer.addEventListener('click', (e) => { if (e.target === layer || e.target.closest('[data-sheet-close]')) close(); });
    if (o.onMount) o.onMount(el, close);
    (el.querySelector('[data-autofocus]') || el.querySelector('#sheet-t')).focus({ preventScroll: true });
    return close;
  }

  // Радиогруппа чипов: один выбор, повторное касание снимает
  function chipsBind(root, onPick) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      const on = b.getAttribute('aria-checked') === 'true';
      root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', 'false'));
      if (!on) b.setAttribute('aria-checked', 'true');
      onPick(on ? null : b.dataset.v);
    });
  }
  const chipsHtml = (list, picked, label) => `<div class="chips chips--soft" role="radiogroup" aria-label="${esc(label)}">${list.map((x) => `<button class="chip" type="button" role="radio" data-v="${esc(x)}" aria-checked="${x === picked}">${esc(x)}</button>`).join('')}</div>`;

  // ---------- Тост ----------
  let toastTimer = null;
  function toast(text, o = {}) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    clearTimeout(toastTimer);
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.innerHTML = `${icon(o.icon || 'check')}<span>${text}</span>${o.action ? `<button class="toast__act" type="button">${esc(o.action)}</button>` : ''}`;
    document.body.append(t);
    if (o.action) t.querySelector('.toast__act').addEventListener('click', () => { t.remove(); o.onAction(); });
    const kill = () => { toastTimer = setTimeout(() => t.remove(), o.ms || 3000); };
    t.addEventListener('pointerenter', () => clearTimeout(toastTimer));
    t.addEventListener('pointerleave', kill);
    kill();
  }

  // Значение подхода с единицей веса: «65 кг × 8», «8», «40 с» - как в пульте c2
  function valText(v) {
    const { fmt } = APS;
    if (v.weight != null && v.reps != null) return `${fmt.kg(v.weight)}${fmt.TIMES}${v.reps}`;
    if (v.weight != null && v.distance != null) return `${fmt.kg(v.weight)}${fmt.TIMES}${v.distance}${fmt.NBSP}м`;
    return fmt.setVal(v);
  }
  const noRpe = (v) => Object.fromEntries(Object.entries(v || {}).filter(([k]) => k !== 'rpe'));

  APS.kit = { EFFORT, WELL, painWord, painText, effHtml, effBind, sheet, chipsHtml, chipsBind, toast, valText, noRpe, reduced };
})();
