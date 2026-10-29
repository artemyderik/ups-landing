// Каркас экранов приложения клиента: служебная полоса прототипа, шапка-полоса, лист, таббар или панель действий.
// Экран вызывает APS.ui.page({...}) один раз (README, «Как добавить экран»). Правит только сессия 1.
//
// Параметры адреса (README, «Состояния»):
//   ?state=<id> - сценарий «сейчас» из parts/data.js (today по умолчанию); переносится по всем ссылкам прототипа;
//   ?net=off   - нет сети: индикатор в шапке; тоже переносится;
//   ?w=<id>    - тренировка экрана; ?ex=<id>, ?el=<id> - упражнение и элемент; ?from=<n> - продолжить с упражнения n.
window.APS = window.APS || {};
(() => {
  const { q, fmt, esc } = APS;
  const params = new URLSearchParams(location.search);
  const KEEP = ['state', 'net'];

  // Ссылка внутри прототипа: сохраняет сценарий и сеть, добавляет свои параметры
  function href(path, extra = {}) {
    const [rest, hash] = path.split('#');
    const [file, qs] = rest.split('?');
    const u = new URLSearchParams(qs || '');
    for (const k of KEEP) if (params.get(k) && !u.has(k)) u.set(k, params.get(k));
    for (const [k, v] of Object.entries(extra)) if (v != null && v !== '') u.set(k, v);
    const s = u.toString();
    return file + (s ? `?${s}` : '') + (hash ? `#${hash}` : '');
  }
  // Ссылки в готовой разметке (оглавление, статичные экраны): добавить сценарий и сеть
  function patchLinks(root = document) {
    for (const a of root.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href');
      if (/^[a-z-]+\.html/i.test(h) && !a.hasAttribute('data-keep-href')) a.setAttribute('href', href(h));
    }
  }

  const icon = (name, cls = '') => `<svg class="i${cls ? ` ${cls}` : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const crown = (cls = '') => icon('crown', cls);
  const rays = () => '<svg class="rays" viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M8 26 2.5 23.5"/><path d="M11.5 16 6 10"/><path d="M21 12.5 21.5 4"/></g></svg>';
  const wordmark = () => `<a class="wordmark" href="${href('index.html')}" aria-label="Апс! - оглавление прототипа"><svg class="wordmark__crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18.5 4.5 7 9 12 12 5 15 12 19.5 7 21 18.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg><span>АПС!</span></a>`;
  const CAT_IMG = '../../directions/assets/';   // коты системы (DESIGN.md, раздел 4); в тёмной теме CSS подменяет на стикеры
  const CAT_V2 = ['cat-happy', 'cat-grumpy', 'cat-overload'];   // обновлённый набор 2026-10-29 - assets/v2
  const CAT_V2_FILE = { 'cat-wave-dark': 'cat-wave' };   // кот-волна v2 - вырезанный, без обводки и без lighten (на чёрной полосе как исходник)
  const cat = (name, size, alt = '') => `<img src="${CAT_IMG}${CAT_V2.includes(name) ? 'v2/' : ''}${CAT_V2_FILE[name] ? `v2/${CAT_V2_FILE[name]}` : name}.webp" alt="${esc(alt)}" width="${size}" height="${size}">`;

  const TABS = [
    { id: 'today', file: 'today.html', label: 'Сегодня', icon: 'today' },
    { id: 'plan', file: 'plan.html', label: 'План', icon: 'calendar' },
    { id: 'progress', file: 'progress.html', label: 'Прогресс', icon: 'trendUp' },
  ];

  function protoBar(screen) {
    const sc = APS.SCENARIOS[q.state];
    const ids = (APS.SCREENS.find((s) => s.id === screen) || {}).states || Object.keys(APS.SCENARIOS);
    const file = location.pathname.split('/').pop() || 'index.html';
    const keep = new URLSearchParams(location.search);
    const link = (state, net) => { const u = new URLSearchParams(keep); u.set('state', state); if (net) u.set('net', 'off'); else u.delete('net'); if (state === 'today') u.delete('state'); const s = u.toString(); return file + (s ? `?${s}` : ''); };
    const offline = params.get('net') === 'off';
    const items = ids.map((id) => `<a role="menuitem" href="${link(id, offline)}" data-keep-href${id === q.state ? ' aria-current="true"' : ''}>${id === q.state ? icon('check') : icon('check', 'i--hide')}<span>${esc(APS.SCENARIOS[id].label)}<small>${esc(fmt.dateCap(APS.SCENARIOS[id].now))}, ${APS.SCENARIOS[id].now.slice(11)}</small></span></a>`).join('');
    const net = `<a role="menuitem" href="${link(q.state, !offline)}" data-keep-href>${icon(offline ? 'saved' : 'wifiOff')}<span>${offline ? 'Сеть есть' : 'Нет сети'}<small>${offline ? 'убрать индикатор офлайна' : 'индикатор в шапке, отметки на телефоне'}</small></span></a>`;
    const reset = `<a role="menuitem" href="#" data-reset>${icon('refresh')}<span>Обнулить данные<small>стереть отметки на этом устройстве, вернуть исходные</small></span></a>`;
    const theme = [['system', 'monitor', 'Системная'], ['light', 'sun', 'Светлая'], ['dark', 'moon', 'Тёмная']]
      .map(([v, ic, n]) => `<button type="button" role="radio" data-value="${v}" aria-checked="${v === 'system'}" aria-label="${n}" title="Тема: ${n}">${icon(ic)}</button>`).join('');
    return `<div class="proto-bar dark" role="region" aria-label="Прототип: оглавление, состояние и тема"><div class="proto-bar__in">
      <p class="proto-bar__now">${screen === 'index' ? 'Прототип приложения клиента<b>Оглавление</b>' : `Сейчас ${esc(fmt.date(q.now))}, ${q.now.slice(11)}<b>${esc(sc.label)}${offline ? ' · нет сети' : ''}</b>`}</p>
      ${screen === 'index' ? `<a class="btn proto-bar__home" href="#" data-reset>${icon('refresh')}Обнулить данные</a>` : `<a class="btn proto-bar__home" href="index.html" data-keep-href>${icon('chevL')}Экраны</a>`}
      <div class="seg seg--dark theme-switch" role="radiogroup" aria-label="Тема">${theme}</div>
      ${screen === 'index' ? '' : `<details class="menu"><summary class="btn" aria-label="Состояние экрана">${icon('sliders')}Состояние</summary><div class="menu__pop" role="menu">${items}<hr>${net}${reset}</div></details>`}
    </div></div>`;
  }

  // Шапка: слева словесный знак или «назад», справа аватар тренера - вход в «Тренер и профиль»
  function bandTop(o) {
    const left = o.back ? `<a class="crumbs" href="${href(o.back.href)}">${icon('chevL')}${esc(o.back.label)}</a>` : wordmark();
    const t = q.db.trainer;
    const ava = o.avatar === false ? '' : `<a class="capp-ava" href="${href('profile.html')}" aria-label="Тренер и профиль: ${esc(t.name)}"><span class="ava ava--light" aria-hidden="true">${esc(t.initials)}</span></a>`;
    const net = params.get('net') === 'off' ? `<p class="sync capp-net" role="status">${icon('wifiOff')}<span><b>Нет сети</b> · отметки сохранены на этом устройстве</span></p>` : '';
    return `<div class="band__top">${left}<div class="band__tools">${o.tools || ''}${ava}</div></div>${net}`;
  }

  function tabbar(active) {
    return `<nav class="tabbar" aria-label="Разделы">${TABS.map((t) => `<a class="tabbar__item" href="${href(t.file)}"${t.id === active ? ' aria-current="page"' : ''}><span class="tabbar__ico">${icon(t.icon)}</span><span class="tabbar__label">${t.label}</span></a>`).join('')}</nav>`;
  }

  // o: { screen, title, tab | bar, back, band, body, tools, avatar }
  //   screen - id из parts/screens.js (служебная полоса берёт оттуда список состояний);
  //   tab    - активный раздел таббара: today | plan | progress; на экранах деталей вместо таббара - bar (панель действий) или ничего;
  //   band   - разметка полосы после верхней строки; body - разметка листа.
  function page(o) {
    document.title = `${o.title} · Апс! клиент`;
    const nav = o.bar ? `<div class="assign-bar">${o.bar}</div>` : o.tab ? tabbar(o.tab) : '';
    document.body.insertAdjacentHTML('beforeend', `${protoBar(o.screen)}<div class="capp">
      <header class="band">${bandTop(o)}${o.band || ''}</header>
      <main class="work" id="main">${o.body || ''}</main>
      ${nav}
    </div>`);
    patchLinks();
    if (window.APS_THEME) window.APS_THEME.sync();
    // Меню служебной полосы закрывается кликом мимо и Esc
    // «Обнулить данные»: стереть отметки клиента этой вкладки (parts/session.data.js, ключи aps-client-run-v1:*) и открыть экран заново
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-reset]')) return;
      e.preventDefault();
      try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('aps-client-run-v1:')) sessionStorage.removeItem(k); } catch (err) {}
      location.reload();
    });
    document.addEventListener('click', (e) => { for (const d of document.querySelectorAll('details.menu[open]')) if (!d.contains(e.target)) d.open = false; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') for (const d of document.querySelectorAll('details.menu[open]')) { d.open = false; d.querySelector('summary').focus(); } });
  }

  // Лента недели на чёрной полосе (DESIGN.md 5.4, вариант клиента): статус тренировки дня под датой
  function week(date = q.today) {
    const days = q.weekDays(date);
    const cells = days.map(({ date: d, workouts }) => {
      const w = workouts[0];
      const isToday = d === q.today;
      const day = `<span>${fmt.weekday(d)}</span><b>${Number(d.slice(8))}</b>`;
      if (!w) return `<li><span class="week__d"${isToday ? ' aria-current="date"' : ''}>${day}<span class="week__st"></span></span></li>`;
      const st = q.status(w);
      const mark = st === 'completed' || st === 'partial' ? icon('done') : `<i class="week__dot${st === 'unmarked' ? ' week__dot--open' : ''}"></i>`;
      const word = { completed: 'выполнена', partial: 'выполнена частично', missed: 'пропущена', inProgress: 'идёт', scheduled: 'запланирована', unmarked: 'не отмечена' }[st];
      const to = st === 'completed' || st === 'partial' || st === 'missed' ? href('result.html', { w: w.id }) : href('workout.html', { w: w.id });
      return `<li><a class="week__d" href="${to}"${isToday ? ' aria-current="date"' : ''} aria-label="${esc(fmt.date(d))}: ${esc(w.title)}, ${word}">${day}<span class="week__st">${mark}</span></a></li>`;
    });
    if (!days.some((x) => x.workouts.length)) return '';
    return `<ol class="week" aria-label="Неделя ${fmt.dayMonth(days[0].date)} - ${fmt.dayMonth(days[6].date)}">${cells.join('')}</ol>`;
  }

  APS.ui = { href, patchLinks, icon, crown, rays, cat, wordmark, page, week, tabbar };
  document.addEventListener('DOMContentLoaded', () => patchLinks());
})();
