// Экраны колоды первого экрана - живая разметка прототипов C 2.0 на общих данных страницы (README.md страницы, «Общие данные»):
// вторник, 9 января, 9:41; тренер Максим Белов; клиент Игорь Петров, жим штанги лёжа 60 -> 70 кг.
//   «Календарь» - design/directions/c2/k5-calendar.html, раскладка 1280, боковая панель свёрнута (.app--collapsed);
//   «Клиент: результат и прогресс» - c2/k2-client.html, раскладка телефона 390;
//   «Выполнение тренировки» - design/client/prototype/session.html?step=rest, 390.
// Разметка снята с прототипов (видимые на этой ширине части), данные - свои. Стили - screens.css (копия CSS прототипов,
// tools/scope_css.py: после правки классов здесь - пересобрать). Экраны неактивны: hero.js ставит inert и aria-hidden.
// Иконки - спрайты прототипов с приставкой hd-: c2 (hd-i-*) и приложения клиента (hd-ci-*), строка состояния - Lucide.
window.HD_SCREENS = (() => {
  const NBSP = '&nbsp;';
  const X = '&#8239;×&#8239;'; // «70 × 8» - узкие неразрывные пробелы, как в прототипе клиента
  const S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const sym = (id, d) => `<symbol id="${id}" ${S}>${d}</symbol>`;

  // ---------- иконки ----------
  const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${[
    // c2 (k5-calendar.html, k2-client.html)
    sym('hd-i-today', '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 0 1 3.5 19z"/>'),
    sym('hd-i-calendar', '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    sym('hd-i-users', '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20c.6-3.3 3.1-5.3 6-5.3s5.4 2 6 5.3"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.6 14.9c1.7.7 2.9 2.4 3.4 5.1"/>'),
    sym('hd-i-layers', '<path d="M12 3.5 3.5 8 12 12.5 20.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>'),
    sym('hd-i-dumbbell', '<path d="M7 6.5v11M17 6.5v11M3.5 9.5v5M20.5 9.5v5M7 12h10"/>'),
    sym('hd-i-user', '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-3.9 3.8-6.2 7.5-6.2s6.7 2.3 7.5 6.2"/>'),
    sym('hd-i-chevL', '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>'),
    sym('hd-i-chevR', '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>'),
    sym('hd-i-chevD', '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>'),
    sym('hd-i-plus', '<path d="M12 5v14M5 12h14"/>'),
    sym('hd-i-clock', '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>'),
    sym('hd-i-done', '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.2 9.5"/>'),
    sym('hd-i-missed', '<circle cx="12" cy="12" r="9"/><path d="M5.8 5.8l12.4 12.4"/>'),
    sym('hd-i-cancel', '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>'),
    sym('hd-i-notready', '<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 3.2"/><path d="M12 8v4.5"/><circle cx="12" cy="15.8" r=".6" fill="currentColor"/>'),
    sym('hd-i-crown', '<path d="M3 18.5 4.5 7 9 12 12 5 15 12 19.5 7 21 18.5Z"/>'),
    sym('hd-i-more', '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
    sym('hd-i-sig-pain', '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'),
    sym('hd-i-sig-effort', '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>'),
    sym('hd-i-arrowDown', '<path d="M12 4.5v15M6 13.5l6 6 6-6"/>'),
    sym('hd-i-panel', '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>'),
    // приложение клиента (parts/icons.js прототипа клиента)
    sym('hd-ci-chevL', '<path d="m15 18-6-6 6-6"/>'),
    sym('hd-ci-chevR', '<path d="m9 18 6-6-6-6"/>'),
    sym('hd-ci-saved', '<path d="m17 15-5.5 5.5L9 18"/><path d="M5.516 16.07A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 3.501 7.327"/>'),
    sym('hd-ci-howto', '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>'),
    sym('hd-ci-pain', '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'),
    sym('hd-ci-question', '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
    sym('hd-ci-notdone', '<circle cx="12" cy="12" r="10"/><line x1="9" x2="15" y1="15" y2="9"/>'),
    sym('hd-ci-history', '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
    sym('hd-ci-done', '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>'),
    sym('hd-ci-skip', '<path d="M21 4v16"/><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"/>'),
    sym('hd-ci-minus', '<path d="M5 12h14"/>'),
    sym('hd-ci-plus', '<path d="M5 12h14"/><path d="M12 5v14"/>'),
    sym('hd-ci-check', '<path d="M20 6 9 17l-5-5"/>'),
    // строка состояния телефона - Lucide signal, wifi, battery-full (DESIGN.md, раздел 4)
    sym('hd-i-signal', '<path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/>'),
    sym('hd-i-wifi', '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>'),
    sym('hd-i-battery', '<rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/><line x1="6" x2="6" y1="11" y2="13"/><line x1="10" x2="10" y1="11" y2="13"/><line x1="14" x2="14" y1="11" y2="13"/>'),
  ].join('')}</defs></svg>`;

  const ic = (id, cls = 'i', label) => `<svg class="${cls}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><use href="#${id}"/></svg>`;
  // строка состояния телефона: 9:41, связь, сеть, батарея
  const sbar = `<div class="hd-sbar"><span class="hd-sbar__t">9:41</span><span class="hd-sbar__i">${ic('hd-i-signal')}${ic('hd-i-wifi')}${ic('hd-i-battery')}</span></div>`;

  // ---------- «Календарь»: неделя 8-14 января, сегодня вторник 9-е, сейчас 09:41 ----------
  // Сетка с 07:00, видно 7 часов (до 14:00): экран целиком, без прокрутки. Счётчики в шапке дня - за весь день,
  // вечерние тренировки ниже края окна, как в прокрученном календаре.
  const H0 = 7;
  const HOURS = 7;
  const NOW = 9 + 41 / 60;
  const DAYS = [
    { wd: 'пн', d: 8, n: '7 очн. · 1 сами' },
    { wd: 'вт', d: 9, n: '6 очн. · 1 сами', today: true },
    { wd: 'ср', d: 10, n: '5 очн. · 1 сами' },
    { wd: 'чт', d: 11, n: '5 очн. · 1 сами' },
    { wd: 'пт', d: 12, n: '6 очн. · 1 сами' },
    { wd: 'сб', d: 13, n: '4 очн. · 1 сами' },
    { wd: 'вс', d: 14, n: 'выходной', off: true },
  ];
  // «Сами» по дням: имя и статус (done - выполнена, plan - запланирована, missed - без отметки, '' - будущая)
  const SELF = [
    ['Мария Ковалёва', 'missed'], ['Игорь Петров', 'plan'], ['Елена Волкова', ''], ['Игорь Петров', ''],
    ['Ксения Федорова', ''], ['Елена Волкова', ''], null,
  ];
  // события: день (0 - пн), начало (ч), имя, вид: done, pr (выполнена, рекорд), plan, notready, first (первая · не готова)
  const EVT = [
    [0, 7, 'Наталья Громова', 'done'], [0, 8, 'Дмитрий Соколов', 'done'], [0, 10, 'Анна Смирнова', 'done'],
    [0, 12, 'Павел Морозов', 'pr'], [0, 13, 'Юлия Мельникова', 'done'],
    [1, 7, 'Виктор Орлов', 'done'], [1, 8, 'Ольга Лебедева', 'done'], [1, 10, 'Алина Егорова', 'plan'],
    [1, 11, 'Павел Морозов', 'plan'], [1, 13, 'Роман Тихонов', 'plan'],
    [2, 7, 'Наталья Громова', 'plan'], [2, 8, 'Дмитрий Соколов', 'plan'], [2, 10, 'Анна Смирнова', 'plan'],
    [2, 13, 'Юлия Мельникова', 'plan'],
    [3, 8, 'Виктор Орлов', 'plan'], [3, 9, 'Ольга Лебедева', 'plan'], [3, 12, 'Павел Морозов', 'plan'],
    [3, 13, 'Сергей Новиков', 'first'],
    [4, 7, 'Наталья Громова', 'plan'], [4, 8, 'Дмитрий Соколов', 'plan'], [4, 10, 'Анна Смирнова', 'plan'],
    [4, 11, 'Артём Зайцев', 'notready'],
    [5, 9, 'Виктор Орлов', 'plan'], [5, 10, 'Алина Егорова', 'plan'], [5, 11, 'Игорь Петров', 'plan'],
    [5, 12, 'Роман Тихонов', 'plan'],
  ];
  // свободные окна - только на днях после сегодня: день, начало, конец
  const FREE = [[2, 11, 13], [3, 10, 12], [4, 12, 14]];
  // вне рабочих часов: суббота 09:00-14:00, воскресенье - выходной
  const OFF = [[5, 7, 9, ''], [5, 13.999, 14, ''], [6, 7, 14, 'выходной']];

  const hh = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  const at = (h) => `calc(var(--hour) * ${+(h - H0).toFixed(4)})`;
  const evtHtml = ([, h, name, k]) => {
    const pos = `top:calc(${at(h)} + var(--s1) / 2);height:calc(var(--hour) - var(--s1))`;
    const t = hh(h);
    if (k === 'done' || k === 'pr') {
      return `<div class="evt" style="${pos}"><span class="evt__t status">${ic('hd-i-done', 'i', 'выполнена')}${t}${k === 'pr' ? ic('hd-i-crown', 'i', 'рекорд') : ''}</span><b>${name}</b></div>`;
    }
    if (k === 'plan') {
      return `<div class="evt evt--plan" style="${pos}"><span class="evt__t status">${ic('hd-i-clock', 'i', 'запланирована')}${t}</span><b>${name}</b></div>`;
    }
    const s = k === 'first' ? '<span class="k5-wide">первая · </span>не готова' : 'не готова';
    return `<div class="evt evt--plan" style="${pos}"><span class="evt__t status">${ic('hd-i-notready')}${t}</span><b>${name}</b><span class="evt__s">${s}</span></div>`;
  };
  const selfHtml = (s) => {
    if (!s) return '<div></div>';
    const [name, st] = s;
    if (st === 'missed') return `<div><div class="self-p self-p--attn"><b>${name}</b><span class="status">${ic('hd-i-missed')}без отметки</span></div></div>`;
    if (st === 'done') return `<div><div class="self-p"><b>${name}</b><span class="status">${ic('hd-i-done', 'i', 'выполнена')}</span></div></div>`;
    if (st === 'plan') return `<div><div class="self-p"><b>${name}</b><span class="status">${ic('hd-i-clock', 'i', 'запланирована')}</span></div></div>`;
    return `<div><div class="self-p"><b>${name}</b><span class="status"></span></div></div>`;
  };
  const colHtml = (i) => [
    ...OFF.filter((o) => o[0] === i).map(([, a, b, l]) => `<div class="off" style="top:${at(a)};height:calc(var(--hour) * ${+(b - a).toFixed(4)})">${l ? `<span>${l}</span>` : ''}</div>`),
    ...FREE.filter((f) => f[0] === i).map(([, a, b]) => `<div class="free" style="top:calc(${at(a)} + var(--s1) / 2);height:calc(var(--hour) * ${b - a} - var(--s1))">Свободно<small>${hh(a)}-${hh(b)}</small></div>`),
    ...EVT.filter((e) => e[0] === i).map(evtHtml),
    DAYS[i].today ? `<div class="nowline" style="top:${at(NOW)}"><span>${hh(NOW)}</span></div>` : '',
  ].join('');

  const nav = [['hd-i-today', 'Сегодня', '3'], ['hd-i-calendar', 'Календарь'], ['hd-i-users', 'Клиенты'], ['hd-i-layers', 'Шаблоны'], ['hd-i-dumbbell', 'Упражнения'], ['hd-i-user', 'Профиль']];
  const legend = [['hd-i-clock', 'запланирована'], ['hd-i-done', 'выполнена'], ['hd-i-missed', 'пропущена'], ['hd-i-cancel', 'отменена'], ['hd-i-notready', 'не готова']];

  const calendar = () => `
<div class="app app--collapsed">
  <aside class="side">
    <span class="wordmark side__brand"><svg class="wordmark__crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18.5 4.5 7 9 12 12 5 15 12 19.5 7 21 18.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg><span>АПС!</span></span><button type="button" class="side__toggle">${ic('hd-i-panel')}</button>
    <nav class="nav">${nav.map(([id, l, b], i) => `<a class="nav__item${i === 1 ? ' is-active' : ''}">${ic(id, 'i ')}<span class="nav__label">${l}</span>${b ? `<span class="nav__badge">${b}</span>` : ''}</a>`).join('')}</nav>
    <div class="side__foot"><span class="ava ava--light">МБ</span><span class="side__who"><b>Максим Белов</b><span>Персональный тренер</span></span></div>
  </aside>
  <main class="main">
    <header class="band">
      <div class="band__top">
        <p class="label band__eyebrow">Календарь · 8-14 янв</p>
        <div class="band__tools">
          <button type="button" class="btn btn--shell btn--icon">${ic('hd-i-chevL', 'i ')}</button>
          <button type="button" class="btn btn--shell">Сегодня</button>
          <button type="button" class="btn btn--shell btn--icon">${ic('hd-i-chevR', 'i ')}</button>
          <div class="seg seg--dark"><button type="button" aria-pressed="false">День</button><button type="button" aria-pressed="true">Неделя</button><button type="button" aria-pressed="false">Месяц</button></div>
          <a class="btn btn--primary">${ic('hd-i-plus', 'i ')}Тренировка</a>
        </div>
      </div>
      <div class="k5-head"><div>
        <h2 class="band__title">39 тренировок</h2>
        <p class="band__meta">33 очных · 6 сами · рабочие часы <span class="nowrap">пн-пт 07:00-21:00</span>, <span class="nowrap">сб 09:00-14:00</span></p>
      </div></div>
    </header>
    <div class="work">
      <div class="wrap">
        <div class="k5-bar">
          <button type="button" class="select">${ic('hd-i-users', 'i ')}Все клиенты ${ic('hd-i-chevD', 'i ')}</button>
          <div class="seg"><button type="button" aria-pressed="true">Все</button><button type="button" aria-pressed="false">Очно</button><button type="button" aria-pressed="false">Сам</button></div>
          <div class="k5-legend k5-legend--top">${legend.map(([id, l]) => `<span class="status">${ic(id, 'i ')}${l}</span>`).join('')}<span class="status"><span class="sw"></span>свободно</span></div>
        </div>
        <div class="cal">
          <div class="cal__row"><div></div>${DAYS.map((d) => `<div class="cal__dh${d.today ? ' is-today' : ''}"><span class="label">${d.wd}${d.today ? '<span class="k5-wide"> · сегодня</span>' : ''}</span><span class="cal__dn">${d.d}</span><span class="cal__dl">${d.off ? d.n : `<span class="k5-wide">${d.n}</span>`}</span></div>`).join('')}</div>
          <div class="cal__row cal__all"><div class="cal__gut">Сами</div>${SELF.map(selfHtml).join('')}</div>
          <div class="cal__row cal__body">
            <div class="cal__hours">${Array.from({ length: HOURS - 1 }, (_, i) => `<span style="top:${at(H0 + i + 1)}">${hh(H0 + i + 1)}</span>`).join('')}</div>
            ${DAYS.map((_, i) => `<div class="cal__col">${colHtml(i)}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;

  // ---------- «Клиент: результат и прогресс» у тренера: Игорь Петров, +10 кг в жиме лёжа ----------
  // Рабочий вес жима по неделям 1-8: 60 ... 67,5 (вт, 2 янв) и 70 - сегодняшние подходы, они уже пришли от клиента.
  const BENCH = [60, 62.5, 62.5, 60, 65, 65, 67.5, 70];
  const spark = BENCH.map((v, i) => `${+(8 + i * 152 / 7).toFixed(2)},${+(49.6 - (v - 60) * 3.2).toFixed(2)}`);
  const [lx, ly] = spark[spark.length - 1].split(',');
  const tabs = [['hd-i-today', 'Сегодня', '3'], ['hd-i-calendar', 'Календарь'], ['hd-i-users', 'Клиенты', '', true], ['hd-i-more', 'Ещё']];

  // .is-scrolled - таббар прибит к низу экрана, как в прототипе после первой прокрутки
  const trainer = () => `<div class="is-scrolled">
${sbar}
<div class="app">
<main class="main">
  <header class="band">
    <div class="band__top">
      <a class="crumbs">${ic('hd-i-chevL', 'i ')}Клиенты</a>
      <div class="band__tools"><details class="menu"><summary class="btn btn--shell btn--icon">${ic('hd-i-more')}</summary></details></div>
    </div>
    <div class="k2-head">
      <div>
        <div class="k2-who">
          <span class="ava ava--light">ИП</span>
          <div>
            <h2 class="k2-name">Игорь Петров</h2>
            <p class="k2-meta">Гибрид: вт и${NBSP}чт сам, сб очно 11:00 · с${NBSP}тренером 5${NBSP}месяцев</p>
          </div>
        </div>
        <div class="k2-flags"><span class="tag tag--shell">В плане</span><span class="sigs"><button type="button" class="sig">${ic('hd-i-sig-pain')}<span class="sig__v">4/10</span></button></span></div>
      </div>
      <div class="k2-hero">
        <p class="label k2-hero__label">Рабочий вес · 8 недель</p>
        <p class="k2-hero__num">+10${NBSP}кг</p>
        <svg class="spark" viewBox="0 0 168 64" aria-hidden="true"><polyline points="${spark.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lx}" cy="${ly}" r="6" fill="var(--accent)" stroke="var(--shell)" stroke-width="2"/></svg>
        <p class="k2-hero__cap"><b>жим штанги лёжа</b> · 60 → 70${NBSP}кг</p>
      </div>
    </div>
    <nav class="tabs"><a aria-current="page">Прогресс</a><a>План</a><a>История</a><a>Профиль и заметки</a></nav>
  </header>
  <div class="work">
    <div class="wrap">
      <section class="card card--lg res">
        <div class="res__head"><div>
          <p class="label muted">Последний результат</p>
          <h3 class="res__title"><a>Тяга и корпус · неделя 8, день 2</a></h3>
          <p class="res__meta">чт, 4 янв, 07:40 · сам · 52 мин</p>
        </div></div>
        <div class="res__stats">
          <div class="stat"><p class="stat__v">19 из 19</p><p class="label stat__l">Подходов</p></div>
          <div class="stat stat--attn cl-mark"><p class="stat__v">1 ${ic('hd-i-arrowDown', 'i i--m')}</p><p class="label stat__l">Ниже плана</p></div>
          <div class="stat"><p class="stat__v">${ic('hd-i-sig-effort', 'i i--m')}8/10</p><p class="label stat__l">Усилие · план 7-8</p></div>
          <div class="stat"><p class="stat__v">4/5</p><p class="label stat__l">Самочувствие</p></div>
          <div class="stat stat--attn cl-mark"><p class="stat__v">${ic('hd-i-sig-pain', 'i i--m')}4/10</p><p class="label stat__l">Боль · поясница</p></div>
        </div>
      </section>
    </div>
  </div>
</main>
</div>
<nav class="tabbar">${tabs.map(([id, l, b, on]) => `<a class="tabbar__item${on ? ' is-active' : ''}"><span class="tabbar__ico">${ic(id, 'i ')}${b ? `<span class="tabbar__badge">${b}</span>` : ''}</span><span class="tabbar__label">${l}</span></a>`).join('')}</nav>
</div>`;

  // ---------- «Выполнение тренировки» у клиента: жим лёжа, 2 подхода из 4 отмечены, идёт отдых ----------
  // Тренировка «Грудь и спина · неделя 9, день 1», жим - упражнение 2 из 6. Отдых 2:00, таймер ведёт hero.js (rest()).
  const REST = 120;
  const RING = 2 * Math.PI * 21.5;
  const restAt = (sec) => ({
    t: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`,
    dash: `${(RING * sec / REST).toFixed(1)} ${RING.toFixed(1)}`,
  });
  const r0 = restAt(84);
  const segs = ['is-done" style="--f:100%', 'is-now" style="--f:50%', '" style="--f:0%', '" style="--f:0%', '" style="--f:0%', '" style="--f:0%'];
  const done = (n) => `<li><button type="button" class="pset pset--done"><span class="pset__n">${n}</span><span class="pset__v">70${NBSP}кг${X}8</span><span class="pset__s">${ic('hd-ci-done')}отмечен</span></button></li>`;
  const step = (sign, d) => `<button type="button" class="step">${ic(sign > 0 ? 'hd-ci-plus' : 'hd-ci-minus')}<span class="step__d">${sign > 0 ? '+' : '−'}${d}</span></button>`;

  const client = () => `
${sbar}
<div class="capp">
  <header class="band"><div class="band__top"><a class="crumbs">${ic('hd-ci-chevL')}Обзор</a><div class="band__tools"><p class="sync ses-sync">${ic('hd-ci-saved')}<span><b>Сохранено</b> · 09:40</span></p></div></div></header>
  <main class="work">
    <div class="ses-segbox dark"><div class="ses-segbox__bar"><div class="segbar ses-segs">${segs.map((c) => `<span class="${c}"></span>`).join('')}</div></div></div>
    <div class="ses-head dark">
      <div class="ses-pos">
        <p class="label band__eyebrow">Упражнение 2 из 6 · основная часть</p>
        <div class="ses-pos__nav"><button type="button" class="btn btn--shell btn--icon">${ic('hd-ci-chevL')}</button><button type="button" class="btn btn--shell btn--icon">${ic('hd-ci-chevR')}</button></div>
      </div>
      <h2 class="band__title ses-name">Жим штанги лёжа</h2>
      <p class="band__meta ses-plan">План: <b class="num">4${X}8${X}70${NBSP}кг</b>${NBSP}· отдых${NBSP}2:00</p>
    </div>
    <div class="pult">
      <div class="ses-top"><div class="ses-acts">
        <a class="ses-act">${ic('hd-ci-howto')}<span>Техника</span></a>
        <button type="button" class="ses-act">${ic('hd-ci-pain')}<span>Больно</span></button>
        <button type="button" class="ses-act">${ic('hd-ci-question')}<span>Вопрос</span></button>
        <button type="button" class="ses-act">${ic('hd-ci-notdone')}<span>Не сделал</span></button>
      </div></div>
      <section class="ses-sets">
        <div class="ses-sets__h"><h3 class="label">Подходы</h3><span class="small num">2 из 4</span></div>
        <p class="ses-last">${ic('hd-ci-history')}<span>Прошлый раз · вт, 2${NBSP}янв: <b class="num">4${X}8${X}67,5${NBSP}кг</b></span></p>
        <ol class="psets">${done(1)}${done(2)}<li><div class="rest">
          <svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21.5" stroke="var(--shell-line)"/><circle class="ring__v" cx="24" cy="24" r="21.5" stroke="var(--accent)" stroke-linecap="round" stroke-dasharray="${r0.dash}"/></svg>
          <div><p class="rest__t">${r0.t}</p><p class="rest__l">отдых из 2:00</p></div>
          <button type="button" class="btn btn--shell">${ic('hd-ci-skip')}Пропустить</button>
        </div></li><li><div class="ctl">
          <div class="ctl__h"><span class="label"><span class="pset__n">3</span>Подход 3 из 4</span><span class="small num">в${NBSP}прошлый раз 67,5${NBSP}кг${X}8</span></div>
          <div class="steppers">
            <div class="stepper">${step(-1, '2,5')}<p class="stepper__v"><span><b>70</b><span>кг</span></span></p>${step(1, '2,5')}</div>
            <div class="stepper">${step(-1, 1)}<p class="stepper__v"><span><b>8</b><span>повт.</span></span></p>${step(1, 1)}</div>
          </div>
        </div></li></ol>
      </section>
    </div>
  </main>
  <div class="assign-bar"><button type="button" class="btn btn--primary btn--plan">${ic('hd-ci-check')}<span>Как в плане<small class="num">70${NBSP}кг${X}8</small></span></button></div>
</div>`;

  return {
    sprite,
    rest: { from: 84, total: REST, at: restAt },
    screens: [
      { id: 'calendar', root: 'hd-cal page-k5', w: 1280, h: 864, kind: 'desk', name: 'Календарь тренера на компьютере', html: calendar },
      { id: 'trainer', root: 'hd-tr page-k2', w: 390, h: 844, kind: 'phone', name: 'Клиент Игорь Петров в приложении тренера', html: trainer },
      { id: 'client', root: 'hd-cl page-session', w: 390, h: 844, kind: 'phone', name: 'Тренировка в приложении клиента', html: client },
    ],
  };
})();
