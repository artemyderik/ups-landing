// Оглавление прототипа клиента: экраны и состояния из parts/screens.js и parts/data.js (APS.SCREENS, APS.SCENARIOS).
(() => {
  const { q, fmt, esc, ui } = APS;
  const { icon } = ui;
  const S = APS.SCREENS, SC = APS.SCENARIOS;
  const link = (file, params = {}, state) => {
    const u = new URLSearchParams(params);
    if (state && state !== 'today') u.set('state', state);
    const s = u.toString();
    return file + (s ? `?${s}` : '');
  };
  const status = (s) => (s.built
    ? `<span class="status">${icon('done')}Собран</span>`
    : `<span class="status status--muted">${icon('clock')}Будет в сессии ${s.session}</span>`);

  const screens = S.map((s, i) => `<li><a class="ix-row" href="${link(s.file, s.params)}" data-keep-href>
      <span class="ix-row__n num">${i + 1}</span>
      <span class="ix-row__b"><b>${esc(s.name)}</b><span class="small muted">${esc(s.desc)}</span>${status(s)}</span>
      ${icon('chevR', 'i--m ix-row__go')}
    </a></li>`).join('');

  // Состояния раздела 6 «Клиентское приложение.md» и задания сессии 1: где смотреть и кто собирает
  const STATES = [
    { id: 'today', where: 'today', note: 'Тренировка «сам» сегодня - исходное состояние' },
    { id: 'inperson', where: 'today', note: 'Очная сегодня: время, место, «с тренером», тот же вход в выполнение' },
    { id: 'reply', where: 'today', note: 'Новый ответ тренера первым разделом' },
    { id: 'paused', where: 'today', note: '«Продолжить с упражнения 3»; в обзоре - что сделано' },
    { id: 'rest', where: 'today', note: 'День отдыха и когда следующая' },
    { id: 'plan-ended', where: 'today', note: '«Тренер готовит план» и праздник закрытой недели' },
    { id: 'trainer-records', where: 'today', note: 'Отмечает тренер: прогресс отметок, без «Начать»' },
    { id: 'disconnected', where: 'today', note: 'Тренер отключил клиента: история на чтение' },
  ];
  const states = STATES.map((x) => `<li><a class="ix-row" href="${link('today.html', {}, x.id)}" data-keep-href>
      <span class="ix-row__b"><b>${esc(SC[x.id].label)}</b><span class="small muted">${esc(x.note)} · сейчас ${esc(fmt.date(SC[x.id].now))}, ${SC[x.id].now.slice(11)}</span><span class="status">${icon('done')}Собран на «Сегодня»</span></span>
      ${icon('chevR', 'i--m ix-row__go')}
    </a></li>`).join('') + `<li><a class="ix-row" href="today.html?net=off" data-keep-href>
      <span class="ix-row__b"><b>Нет сети</b><span class="small muted">Индикатор в шапке любого экрана - параметр ?net=off; в тренировке отметки копятся на телефоне и уходят, когда сеть появится</span><span class="status">${icon('done')}Собран</span></span>
      ${icon('chevR', 'i--m ix-row__go')}
    </a></li>`;

  // С чего начать просмотр: сквозные сценарии. Отметки клиента живут в этой вкладке, новая вкладка - снова чистые моки
  const TOURS = [
    { href: link('today.html'), name: 'Тренировка целиком', note: '«Сегодня» → «Начать» → подходы «как в плане» → «Завершить» → итог → снова «Сегодня», «План», «Результат», «Прогресс»' },
    { href: link('today.html', {}, 'paused'), name: 'Прервал и вернулся', note: '«Продолжить с упражнения 3», «Больно», вопрос тренеру, «Не сделал», завершение частично' },
    { href: link('plan.html'), name: 'Не отмеченная тренировка', note: 'сб, 24 окт на «Плане»: «Отметить, что сделал» одним касанием или «Пропустил» с причиной' },
    { href: link('result.html', { w: 'wk_w08d2' }), name: 'Боль, рекорд и ответ тренера', note: 'пт, 23 окт - тот же результат, что видит тренер; ответ - в ветке' },
    { href: link('today.html', {}, 'trainer-records'), name: 'Очная: отмечает тренер', note: 'один вносящий - клиент видит отметки Максима, без степперов' },
  ];
  const tours = TOURS.map((x) => `<li><a class="ix-row" href="${x.href}" data-keep-href><span class="ix-row__b"><b>${esc(x.name)}</b><span class="small muted">${esc(x.note)}</span></span>${icon('chevR', 'i--m ix-row__go')}</a></li>`).join('');

  const band = `<p class="label band__eyebrow">Прототип · телефон, во всю ширину экрана</p>
    <h1 class="band__title">Апс! для клиента</h1>
    <p class="band__meta">Клиент <b>${esc(q.db.client.name)}</b>, тренер <b>${esc(q.db.trainer.name)}</b> - те же данные, что у тренера: «Клиент: план», «Результат тренировки», «Конструктор тренировки». Тема и состояние - в полосе сверху.</p>`;
  const body = `<div class="stack">
    <section class="sec" aria-labelledby="h-tour"><div class="sec-h"><h2 class="label sec-h__title" id="h-tour">С чего начать</h2></div><ol class="ix-list">${tours}</ol></section>
    <section class="sec" aria-labelledby="h-scr"><div class="sec-h"><h2 class="label sec-h__title" id="h-scr">Экраны</h2><span class="small muted">${S.filter((s) => s.built).length} из ${S.length} собраны</span></div><ol class="ix-list">${screens}</ol></section>
    <section class="sec" aria-labelledby="h-st"><div class="sec-h"><h2 class="label sec-h__title" id="h-st">Состояния</h2></div><ol class="ix-list">${states}</ol></section>
    <section class="sec" aria-labelledby="h-more"><div class="sec-h"><h2 class="label sec-h__title" id="h-more">Рядом</h2></div><ul class="ix-list">
      <li><a class="ix-row" href="../../directions/c2/index.html" data-keep-href><span class="ix-row__b"><b>Прототип тренера C 2.0</b><span class="small muted">Те же Игорь Петров и Максим Белов с другой стороны</span></span>${icon('chevR', 'i--m ix-row__go')}</a></li>
      <li><a class="ix-row" href="../../system-c2/DESIGN.html" data-keep-href><span class="ix-row__b"><b>Дизайн-система C 2.0</b><span class="small muted">Гайд: токены, компоненты, витрина «Приложение клиента» в 5.5</span></span>${icon('chevR', 'i--m ix-row__go')}</a></li>
    </ul></section>
  </div>`;
  ui.page({ screen: 'index', title: 'Оглавление', band, body, avatar: false });
})();
