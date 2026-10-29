// «Тренер и профиль» клиента: кто тренер и как с ним связаться (общий разговор - в Telegram, В6 брифа), программа и цель,
// мои данные - единицы и тема. Минимум: регистрации и онбординга нет, клиент уже подключён (решение пользователя 2026-10-28).
// В «Тренер отключил клиента» - честно, что тренер отключил клиента; история и прогресс остаются на чтение (решение 8).
// Вход - аватар тренера в полосе любого экрана; «назад» ведёт туда, откуда пришли.
(() => {
  const { q, fmt, esc, ui } = APS;
  const { icon, href } = ui;
  const T = q.db.trainer, C = q.db.client, P = q.db.program;
  const archived = q.archived();
  const weekOf = (date) => q.week({ schedule: { date } });
  const cur = weekOf(q.today);

  // «Назад» - на экран, с которого открыли профиль (в пределах прототипа), иначе «Сегодня»
  const LABEL = { 'today.html': 'Сегодня', 'plan.html': 'План', 'progress.html': 'Прогресс', 'workout.html': 'Тренировка', 'result.html': 'Результат', 'exercise.html': 'Упражнение' };
  let back = { href: 'today.html', label: 'Сегодня' };
  try {
    const ref = new URL(document.referrer);
    const file = ref.pathname.split('/').pop();
    if (ref.origin === location.origin && ref.pathname.replace(file, '') === location.pathname.replace(/[^/]*$/, '') && LABEL[file]) back = { href: file + ref.search + ref.hash, label: LABEL[file] };
  } catch {}

  // ---------- Полоса ----------
  const tg = T.contacts && T.contacts.telegram;
  const band = `<div class="prf-who">
      <span class="ava ava--light prf-ava" aria-hidden="true">${esc(T.initials)}</span>
      <div class="prf-who__t">
        <p class="label band__eyebrow">Ваш тренер</p>
        <h1 class="band__title">${esc(T.name)}</h1>
      </div>
    </div>
    <p class="band__meta">${esc(T.title)} · ${esc(T.about)}</p>
    ${archived ? `<p class="band__meta"><b>Отключил вас ${fmt.dayMonth(C.archivedAt)}.</b></p>` : ''}
    ${tg ? `<div class="band__acts">
      <button type="button" class="btn ${archived ? 'btn--shell' : 'btn--primary btn--lg'} btn--block prf-tg" aria-describedby="prf-tg-note">${icon('send')}Написать в Telegram</button>
      <p class="small on-dark-2 prf-tg__h" id="prf-tg-note">@${esc(tg)} · общий разговор - там</p>
    </div>` : ''}`;

  // ---------- Лист ----------
  const sections = [];

  if (archived) sections.push(`<section class="sec" aria-labelledby="h-arch">
      <div class="banner" role="note">${icon('history')}<p class="banner__t" id="h-arch"><b>Новых тренировок нет.</b> ${esc(T.name)} отключил вас ${fmt.dayMonth(C.archivedAt)}. Все тренировки, результаты и прогресс остаются у вас - их можно смотреть, но не менять.</p></div>
      <div class="prf-acts">
        <a class="btn btn--soft btn--block" href="${href('plan.html')}">${icon('history')}История тренировок</a>
        <a class="btn btn--soft btn--block" href="${href('progress.html')}">${icon('trendUp')}Прогресс</a>
      </div>
    </section>`);

  // Где спрашивать: о тренировке - в комментарии к ней, остальное - в Telegram
  if (!archived) sections.push(`<div class="banner" role="note">${icon('message')}<p class="banner__t"><b>Вопрос о тренировке</b> удобнее оставить в комментарии к ней - тренер увидит его рядом с вашим результатом. Остальное - в Telegram.</p></div>`);

  // Программа и тренировки с тренером
  const series = (q.db.series || [])[0];
  const WD = ['', 'понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям'];
  const rows = [
    `<li class="kv">${icon('calendar')}<span><span class="kv__l">Программа</span><br>«${esc(P.title)}»${!archived && cur >= 1 && cur <= P.weeks ? ` · неделя ${cur} из ${P.weeks}` : ''}<br><span class="small muted">${fmt.dayMonth(P.startsOn)} - ${fmt.dayMonth(P.endsOn)}</span></span></li>`,
    C.goal ? `<li class="kv">${icon('target')}<span><span class="kv__l">Цель</span><br>${esc(C.goal.text)}</span></li>` : '',
    series && !archived ? `<li class="kv">${icon('place')}<span><span class="kv__l">С тренером</span><br>по ${WD[series.rule.weekdays[0]]}, ${series.rule.startTime}<br><span class="small muted">${esc(series.location)}</span></span></li>` : '',
    `<li class="kv">${icon('history')}<span><span class="kv__l">Вместе</span><br>с ${fmt.dayMonth(C.startedOn)} · ${fmt.count(q.completedCount(), ['тренировка', 'тренировки', 'тренировок'])}</span></li>`,
  ].filter(Boolean);
  sections.push(`<section class="sec" aria-labelledby="h-prog">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-prog">Тренировки с тренером</h2></div>
      <div class="card"><ul>${rows.join('')}</ul></div>
    </section>`);

  // Мои данные: имя, единицы, тема (выбор темы - тот же, что в служебной полосе прототипа: parts/theme.js)
  const seg = (label, opts, cls) => `<div class="seg prf-seg ${cls}" role="radiogroup" aria-label="${label}">${opts.map(([v, n, on]) => `<button type="button" role="radio" data-value="${v}" aria-checked="${on}">${n}</button>`).join('')}</div>`;
  sections.push(`<section class="sec" aria-labelledby="h-me">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-me">Мои данные</h2></div>
      <div class="card prf-me">
        <div class="prf-me__who"><span class="ava" aria-hidden="true">${esc(C.initials)}</span><span><b>${esc(C.name)}</b><br><span class="small muted">Telegram @${esc(C.contacts.telegram)}</span></span></div>
        <div class="prf-row">
          <p class="prf-row__t">Единицы веса<span class="small muted">подходы и вес тела</span></p>
          <div class="seg prf-seg prf-units" role="group" aria-label="Единицы веса"><button type="button" aria-pressed="true">кг</button><button type="button" aria-pressed="false">фунты</button></div>
        </div>
        <div class="prf-row">
          <p class="prf-row__t">Тема<span class="small muted">как в системе телефона или своя</span></p>
          ${seg('Тема', [['system', 'Системная', true], ['light', 'Светлая', false], ['dark', 'Тёмная', false]], 'theme-switch')}
        </div>
      </div>
    </section>`);

  ui.page({ screen: 'profile', title: 'Тренер и профиль', back, band, body: `<div class="stack">${sections.join('')}</div>`, avatar: false });

  // ---------- Поведение ----------
  // Telegram в прототипе не открывается: подсказка вместо перехода
  const tgBtn = document.querySelector('.prf-tg');
  if (tgBtn) tgBtn.addEventListener('click', () => {
    document.getElementById('prf-tg-note').innerHTML = `В приложении откроется чат с <b>@${esc(tg)}</b>. В прототипе Telegram не открывается.`;
  });
  // Единицы: выбор запоминается в прототипе только на экране - пересчёта значений нет (README, журнал сессии 3)
  const units = document.querySelector('.prf-units');
  units.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    for (const x of units.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
  });
})();
