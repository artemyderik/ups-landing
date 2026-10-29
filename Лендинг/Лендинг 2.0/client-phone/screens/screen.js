// Превью «Клиент отмечает - вы видите», телефон: экран C 2.0 на 390 внутри сцены. Сцену ведёт ../client.js и вызывает window.EV.
// Образец - Лендинг/Превью - телефон/screens/ep-screen.js (тот же интерфейс, без нижнего листа сигналов и полоски загрузки):
//   EV.step(n, animate)  - шаг данных сцены: window.EV_STEP(n, animate) экрана (у «Выполнения тренировки» - js этого экрана);
//   EV.clock(t)          - время сцены, мс: экран сверяет с ним таймер отдыха (window.EV_CLOCK); на паузе сцены время стоит;
//   EV.down(sel, on)     - состояние нажатия касанием (в системе нажатие = наведению, DESIGN.md 5);
//   EV.scrollFor(sel, o) - куда прокрутить экран, чтобы элемент встал сверху (o.align: top / center / bottom, o.gap - зазор);
//   EV.target(y)         - прокрутка, к которой идёт сцена: прямоугольники считаются для неё;
//   EV.rect(sel)         - прямоугольник элемента в координатах окна экрана после прокрутки: по нему сцена ставит камеру и касание;
//   EV.reset()           - стартовое состояние без переходов, экран со своего верха.
// Экран - картинка: ссылки и кнопки прототипа вне фокуса и без нажатий. Прокручивает экран только сцена.
(() => {
  const root = document.documentElement;
  const $ = (sel) => (typeof sel === 'string' ? document.querySelector(sel) : sel);
  root.classList.add('ev-scr');
  // в продукте панель действий закреплена снизу сразу (комментарий к .tabbar в app.css прототипа тренера)
  root.classList.add('is-scrolled');
  for (const el of document.body.children) if (el.tagName !== 'SCRIPT') el.inert = true;

  let target = 0;
  const instant = (fn) => { root.classList.add('ev-instant'); fn(); void root.offsetWidth; root.classList.remove('ev-instant'); };
  const apply = (n, animate) => {
    for (let i = 1; i <= 9; i++) root.classList.toggle(`ev-${i}`, i <= n);
    window.EV_STEP?.(n, animate);
  };
  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);

  window.EV = {
    step(n, animate = true) { if (animate) apply(n, true); else instant(() => apply(n, false)); },
    clock(t) { window.EV_CLOCK?.(t); },
    down(sel, on = true) { $(sel)?.classList.toggle('ev-down', on); },
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
      const fixed = !!el.closest('.assign-bar, .sheet-layer, .toast');
      return { x: r.left, y: fixed ? r.top : r.top + scrollY - target, w: r.width, h: r.height };
    },
    reset() {
      for (const el of document.querySelectorAll('.ev-down')) el.classList.remove('ev-down');
      this.step(0, false);
      target = 0;
      scrollTo({ top: 0, behavior: 'instant' });
    },
    ready: document.fonts.ready,
  };
  // ?step=1 - экран сразу в состоянии после шага (проверка и снимки без страницы)
  window.EV.step(Number(new URLSearchParams(location.search).get('step')) || 0, false);
})();
