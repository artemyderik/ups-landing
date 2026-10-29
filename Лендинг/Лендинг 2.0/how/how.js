// Полоса «Как работает» блока продукта (DESIGN.md 5.9, .lp-how): четыре шага цикла тренера и клиента, без анимации и плеера.
// Рисует разметку в #nb-how. У каждого шага - телефон целиком: живой экран C 2.0 (iframe экрана с данными страницы, не картинка)
// в раскладке телефона и рамка по общему правилу рамки телефона новых блоков; телефон уменьшается целиком, вместе с рамкой.
// Сверху экрана - пустое поле цвета экрана (верхний угол не срезает содержимое). Окно экрана прокручено к ключевой кнопке или строке
// (screens/*, ../client/screens/* - слой cs-screen.js: ?to=<селектор>&pad=<px>; safe=1 - поле снизу под жест «домой», нижняя
// панель прилипает к низу окна; flat=1 - панель действий цвета экрана, без чёрной полосы).
// От 1280 - четыре колонки, телефон во всю колонку; ниже - лента шагов вбок (прокрутка пальцем с привязкой к шагу).
// Тема экранов - как у страницы: ?theme=… страницы или системная.
(() => {
  const mount = document.getElementById('nb-how');
  if (!mount) return;
  const here = new URL('.', document.currentScript.src);
  const WIDE = matchMedia('(min-width: 1280px)');
  const theme = new URLSearchParams(location.search).get('theme') || 'system';
  const NB = ' ';

  // Тексты - README страницы, «Тексты блоков». Неразрывный пробел - после коротких предлогов и союзов и перед « - » (DESIGN.md 5.9).
  const STEPS = [
    { t: 'Добавьте клиента', d: `Отправьте <span class="lp-how__nw">ссылку-приглашение</span>, и${NB}клиент подключится к${NB}вам`,
      src: 'screens/new.html', to: '.fl__l|Цель', pad: 0, name: '«Новый клиент»: приглашение ссылкой' },
    { t: 'Соберите неделю', d: `С${NB}нуля, из${NB}шаблона или копией прошлой`,
      src: 'screens/plan.html', to: '#how-bar', pad: 12, name: '«Клиент: план»: собрать, копировать, назначить шаблон' },
    { t: 'Клиент тренируется', d: `Отмечает подходы и${NB}самочувствие в${NB}своём приложении`,
      src: '../client/screens/session.html', st: 1, to: '.ses-head', pad: 22, name: 'приложение клиента: «Выполнение тренировки»' },
    { t: 'Вы видите результат', d: `Сверяете с${NB}планом и${NB}сразу правите следующую тренировку`,
      src: '../client/screens/result.html', to: '#cs-title', pad: 16, name: '«Результат тренировки»' },
  ];
  const AGAIN = 'И так каждую неделю';
  const svg = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const REFRESH = svg('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>');   // Lucide refresh-cw

  const step = (s, i) => `<li class="lp-how__step">
      <span class="lp-how__n" aria-hidden="true">${i + 1}</span>
      <h4 class="lp-how__t">${s.t}</h4>
      <p class="lp-how__d">${s.d}</p>
      <div class="lp-how__shot" aria-hidden="true"><div class="lp-how__dev"><div class="lp-how__scr"><div class="lp-how__view" data-i="${i}"></div></div></div></div>
    </li>`;
  mount.innerHTML = `<div class="lp-wrap"><section class="lp-how" aria-labelledby="how-h">
    <h3 class="lp-how__h" id="how-h">Как это работает</h3>
    <ol class="lp-how__list" role="list" aria-labelledby="how-h">
      ${step(STEPS[0], 0)}
      <li class="lp-how__loop">
        <ol class="lp-how__steps" role="list" start="2">${STEPS.slice(1).map((s, i) => step(s, i + 1)).join('')}</ol>
        <p class="lp-how__again">${REFRESH}<span>${AGAIN}</span></p>
      </li>
    </ol>
  </section></div>`;

  // --- телефон: собран в пикселях экрана (рамка + экран), уменьшается целиком по ширине места под телефон ---
  const shots = [...mount.querySelectorAll('.lp-how__shot')];
  const fit = (shot) => {
    const dev = shot.firstElementChild;
    if (!shot.clientWidth) return;
    const k = shot.clientWidth / dev.offsetWidth;
    dev.style.transform = `scale(${k.toFixed(4)})`;
    shot.style.height = `${(dev.offsetHeight * k).toFixed(1)}px`;
  };
  const ro = new ResizeObserver((es) => { for (const e of es) fit(e.target); });
  for (const s of shots) ro.observe(s);

  const load = () => {
    for (const v of mount.querySelectorAll('.lp-how__view')) {
      if (v.querySelector('iframe')) continue;
      const s = STEPS[v.dataset.i];
      const u = new URL(s.src, here);
      u.searchParams.set('theme', theme);
      if (s.st) u.searchParams.set('st', s.st);
      u.searchParams.set('to', s.to);
      u.searchParams.set('pad', s.pad);
      u.searchParams.set('safe', '1');
      u.searchParams.set('flat', '1');
      const f = document.createElement('iframe');
      f.title = `Экран: ${s.name}`;
      f.tabIndex = -1;
      f.loading = 'eager';
      // экран готов - поле сверху берёт цвет экрана у верха окна (после прокрутки к месту шага), экран проявляется
      f.addEventListener('load', () => {
        const cs = f.contentWindow?.CS;
        const ready = () => v.classList.add('is-ready');
        if (!cs) { ready(); return; }
        cs.ready.then(() => { v.style.backgroundColor = cs.bg(0); ready(); });
      }, { once: true });
      f.src = u.href;
      v.append(f);
    }
  };
  // экраны грузятся, когда полоса в одном экране от окна: все четыре сразу, и шаги ленты за краем тоже - листать без пустых экранов
  new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); }, { rootMargin: '100% 0px 100% 0px' }).observe(mount);

  // Лента ниже 1280 - прокручиваемая область: в порядке фокуса, чтобы листать стрелками; от 1280 прокрутки нет - и фокуса тоже
  const list = mount.querySelector('.lp-how__list');
  const sync = () => { if (WIDE.matches) list.removeAttribute('tabindex'); else list.tabIndex = 0; };
  sync();
  WIDE.addEventListener('change', sync);
})();
