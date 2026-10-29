// Превью «Телефон»: экран C 2.0 на 390 внутри сцены. Сцену ведёт страница лендинга (../ep-host.js) и вызывает window.EV:
//   EV.step(n, animate)    - шаг данных сцены: классы ev-1, ev-2 на <html> (ep-screen.css); window.EV_STEP(n) экрана - для правок, которые классом не сделать;
//   EV.down(sel, on)       - состояние нажатия касанием (в системе нажатие = наведению, DESIGN.md 5);
//   EV.sheet(sel, on, animate) - нижний лист сигналов клиента, как его строит parts/signals.js на телефоне: группа сигналов - одна цель,
//                            нажатие открывает лист со всеми сигналами группы; въезд за --dur-slow с --easing-out (DESIGN.md 5.6);
//   EV.loading(on, y)      - полоска загрузки экрана (DESIGN.md 5.7) сверху видимой части;
//   EV.scrollFor(sel, o)   - куда прокрутить экран, чтобы элемент встал сверху (o.align: top / center / bottom, o.gap - зазор);
//   EV.target(y)           - прокрутка, к которой идёт сцена: прямоугольники считаются для неё, а не для текущего кадра прокрутки;
//   EV.rect(sel)           - прямоугольник элемента в координатах окна экрана после прокрутки: по нему страница ставит камеру и касание;
//   EV.reset()             - стартовое состояние без переходов, экран со своего верха.
// Экран - картинка: ссылки и кнопки прототипа вне фокуса и без нажатий. Прокручивает экран только страница лендинга.
(() => {
  const root = document.documentElement;
  const $ = (sel) => (typeof sel === 'string' ? document.querySelector(sel) : sel);
  const tok = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  root.classList.add('ev-scr');
  // в продукте таббар и панель действий закреплены снизу сразу (комментарий к .tabbar в app.css прототипа)
  root.classList.add('is-scrolled');
  for (const el of document.body.children) if (el.tagName !== 'SCRIPT') el.inert = true;

  let target = 0;
  const instant = (fn) => { root.classList.add('ev-instant'); fn(); void root.offsetWidth; root.classList.remove('ev-instant'); };
  const apply = (n) => {
    for (let i = 1; i <= 3; i++) root.classList.toggle(`ev-${i}`, i <= n);
    window.EV_STEP?.(n);
  };
  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const body = (b) => `<b>${b.dataset.sigTitle || b.getAttribute('aria-label') || ''}</b>${b.dataset.sigText ? `<p>${b.dataset.sigText}</p>` : ''}`;
  const icon = (b) => { const u = b.querySelector('use'); return u ? `<svg class="i" aria-hidden="true"><use href="${u.getAttribute('href')}"/></svg>` : ''; };

  window.EV = {
    step(n, animate = true) { if (animate) apply(n); else instant(() => apply(n)); },
    down(sel, on = true) { $(sel)?.classList.toggle('ev-down', on); },
    sheet(sel, on = true, animate = true) {
      const old = [...document.querySelectorAll('.sig-sheet, .sig-scrim')];
      if (!on) {
        if (!animate) { old.forEach((e) => e.remove()); return; }
        // уход листа - обратное движение за --dur: лист вниз, затемнение гаснет
        for (const e of old) {
          const a = e.animate(e.classList.contains('sig-sheet') ? [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }] : [{ opacity: 1 }, { opacity: 0 }],
            { duration: parseFloat(tok('--dur')), easing: tok('--easing'), fill: 'forwards' });
          a.finished.then(() => e.remove()).catch(() => {});
        }
        return;
      }
      old.forEach((e) => e.remove());
      const group = $(sel)?.closest('.sigs');
      if (!group) return;
      // разметка - как в parts/signals.js (ветка touch): все сигналы группы, у каждого иконка, заголовок, текст и действие
      const scrim = Object.assign(document.createElement('div'), { className: 'sig-scrim' });
      const sheet = Object.assign(document.createElement('div'), { className: 'sig-sheet' });
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-label', 'Сигналы клиента');
      sheet.innerHTML = [...group.querySelectorAll('.sig')].map((s) => `<div class="sig-sheet__i">${icon(s)}<div>${body(s)}${s.dataset.sigAction ? `<a class="btn btn--soft" href="#">${s.dataset.sigAction}</a>` : ''}</div></div>`).join('');
      scrim.inert = sheet.inert = true;
      document.body.append(scrim, sheet);
      if (!animate) return;
      const d = parseFloat(tok('--dur-slow')), e = tok('--easing-out');
      scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d, easing: e });
      sheet.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: d, easing: e });
    },
    loading(on = true, y = 0) {
      document.querySelector('.ev-loadbar')?.remove();
      if (!on) return;
      const bar = Object.assign(document.createElement('div'), { className: 'ev-loadbar' });
      const band = document.querySelector('.band');
      if (y <= 0 && band) { band.prepend(bar); return; }
      // экран прокручен: полоска сверху видимой части; ниже полосы - на белом, чернилами
      if (!band || y >= band.getBoundingClientRect().bottom + scrollY) bar.classList.add('ev-loadbar--ink');
      Object.assign(bar.style, { top: `${y}px` });
      document.body.append(bar);
    },
    scrollFor(sel, { align = 'top', gap = 16 } = {}) {
      if (sel === 0 || sel === 'top') return 0;
      const el = $(sel);
      if (!el) return target;
      const r = el.getBoundingClientRect(), y = r.top + scrollY;
      const want = align === 'center' ? y + r.height / 2 - innerHeight / 2 : align === 'bottom' ? y + r.height + gap - innerHeight : y - gap;
      return Math.round(Math.min(maxScroll(), Math.max(0, want)));
    },
    target(y) { target = y; },
    rect(sel) {
      const el = $(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const fixed = getComputedStyle(el).position === 'fixed';
      return { x: r.left, y: fixed ? r.top : r.top + scrollY - target, w: r.width, h: r.height };
    },
    reset() {
      for (const el of document.querySelectorAll('.ev-hover, .ev-down')) el.classList.remove('ev-hover', 'ev-down');
      this.sheet(null, false, false);
      this.loading(false);
      this.step(0, false);
      target = 0;
      scrollTo({ top: 0, behavior: 'instant' });
    },
    ready: document.fonts.ready,
  };
  // ?step=1 - экран сразу в состоянии после шага (проверка и снимки без страницы лендинга)
  window.EV.step(Number(new URLSearchParams(location.search).get('step')) || 0, false);
})();
