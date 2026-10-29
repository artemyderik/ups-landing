// Превью «Единый вид»: экран C 2.0 внутри сцены. Сцену ведёт страница лендинга (../ev-host.js) и вызывает window.EV:
//   EV.step(n, animate)   - шаг данных сцены: классы ev-1, ev-2 на <html> (ev-screen.css); window.EV_STEP(n) экрана - для правок, которые классом не сделать;
//   EV.hover(sel, on)     - состояние наведения элемента (зеркало :hover системы);
//   EV.down(sel, on)      - состояние нажатия (в системе = наведению);
//   EV.tip(sel, on)       - подсказка сигнала, как её строит parts/signals.js: .sig-pop--tip под кнопкой, через 300 мс после наведения (задержку держит сцена);
//   EV.loading(on)        - полоска загрузки экрана (DESIGN.md 5.7): переход ждёт новый экран, старый остаётся;
//   EV.rect(sel)          - прямоугольник элемента в координатах документа: по нему страница ставит камеру и курсор;
//   EV.reset()            - стартовое состояние без переходов.
// Экран - картинка: ссылки и кнопки прототипа вне фокуса и без нажатий.
(() => {
  const root = document.documentElement;
  const $ = (sel) => (typeof sel === 'string' ? document.querySelector(sel) : sel);
  root.classList.add('ev-scr');   // не .ev: так в app.css называется строка ленты «Сегодня»
  for (const el of document.body.children) if (el.tagName !== 'SCRIPT') el.inert = true;

  let tip = null;
  const instant = (fn) => { root.classList.add('ev-instant'); fn(); void root.offsetWidth; root.classList.remove('ev-instant'); };
  const apply = (n) => {
    for (let i = 1; i <= 3; i++) root.classList.toggle(`ev-${i}`, i <= n);
    window.EV_STEP?.(n);
  };

  window.EV = {
    step(n, animate = true) { if (animate) apply(n); else instant(() => apply(n)); },
    hover(sel, on = true) { $(sel)?.classList.toggle('ev-hover', on); },
    down(sel, on = true) { $(sel)?.classList.toggle('ev-down', on); },
    tip(sel, on = true) {
      tip?.remove(); tip = null;
      const b = $(sel);
      if (!on || !b) return;
      // разметка и место - как в parts/signals.js (body, place)
      tip = document.createElement('div');
      tip.className = 'sig-pop sig-pop--tip';
      tip.setAttribute('role', 'tooltip');
      tip.innerHTML = `<b>${b.dataset.sigTitle || b.getAttribute('aria-label') || ''}</b>${b.dataset.sigText ? `<p>${b.dataset.sigText}</p>` : ''}`;
      const r = b.getBoundingClientRect();
      document.body.append(tip);
      const w = tip.offsetWidth;
      let x = r.left + scrollX;
      if (x + w > scrollX + innerWidth - 16) x = scrollX + innerWidth - 16 - w;
      tip.style.left = `${Math.max(16, x)}px`;
      tip.style.top = `${r.bottom + scrollY + 8}px`;
    },
    loading(on = true, y = 0) {
      document.querySelector('.ev-loadbar')?.remove();
      if (!on) return;
      const bar = Object.assign(document.createElement('div'), { className: 'ev-loadbar' });
      const band = document.querySelector('.band');
      if (y <= 0 && band) { band.prepend(bar); return; }
      // страница прокручена: полоска сверху видимой части колонки контента; ниже полосы - на белом, чернилами
      const main = (document.querySelector('.main') || document.body).getBoundingClientRect();
      if (!band || y >= band.getBoundingClientRect().bottom + scrollY) bar.classList.add('ev-loadbar--ink');
      Object.assign(bar.style, { top: `${y}px`, left: `${main.left + scrollX}px`, width: `${main.width}px`, right: 'auto' });
      document.body.append(bar);
    },
    rect(sel) {
      const el = $(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
    },
    reset() {
      for (const el of document.querySelectorAll('.ev-hover, .ev-down')) el.classList.remove('ev-hover', 'ev-down');
      this.tip(null, false);
      this.loading(false);
      this.step(0, false);
    },
    ready: document.fonts.ready,
  };
  // ?step=1 - экран сразу в состоянии после шага (проверка и снимки без страницы лендинга)
  window.EV.step(Number(new URLSearchParams(location.search).get('step')) || 0, false);
})();
