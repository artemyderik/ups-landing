// «План» клиента: тренировки по неделям программы. Эта неделя и следующая - по дням, прошедшие - с результатом
// (Клиентское приложение.md, 4 «Между тренировками»; BEHAVIOR.md 5.8 «План клиента»).
// Прошедшая без отметки - нейтрально «Не отмечена» и два действия: «Отметить, что сделал» (finish.html?mode=mark, сессия 2)
// и «Пропустил». Тренировка не в свой день - фактическая дата и «по плану - чт, 15 окт», без пометки пропуска.
// ?w=<id>&miss=1 - «Пропустил»: форма причины (по желанию) над списком; после отметки строка показывает «Пропущена»,
// отметка хранится вместе с отметками тренировок (parts/session.data.js).
(() => {
  const { q, fmt, esc, ui } = APS;
  const { icon, href } = ui;
  const params = new URLSearchParams(location.search);
  const T = q.db.trainer, P = q.db.program;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const weekOf = (date) => q.week({ schedule: { date } });
  const weekStart = (n) => q.addDays(P.startsOn, (n - 1) * 7);
  const range = (n) => `${fmt.dayMonth(weekStart(n))} - ${fmt.dayMonth(q.addDays(weekStart(n), 6))}`;
  const archived = q.archived();

  const cur = weekOf(q.today);
  const byWeek = new Map();
  for (const w of q.workouts()) { const n = q.week(w); if (!byWeek.has(n)) byWeek.set(n, []); byWeek.get(n).push(w); }
  for (const list of byWeek.values()) list.sort((a, b) => q.date(a).localeCompare(q.date(b)));

  // Тренировка для «Пропустил»: прошедшая без отметки или ещё не начатая (пропуск можно отметить до даты и после)
  const missW = params.get('miss') ? q.workout(params.get('w')) : null;
  const canMiss = missW && !archived && ['unmarked', 'scheduled'].includes(q.status(missW));

  // ---------- Строка тренировки ----------
  // Строка-карточка «Плана» (DESIGN.md 5.4, вариант телефона): дата | название с метой | формат и статус; ссылка - на названии,
  // растянута на строку. Выполненная и пропущенная ведут в «Результат», остальные - в обзор.
  function status(w) {
    const st = q.status(w), r = q.result(w.id);
    if (st === 'completed' || st === 'partial') {
      const prs = q.recordsOf(w.id).length;
      const replies = q.comments(w.id).filter((c) => c.author === 'trainer');
      const unread = replies.some((c) => !c.readByClientAt);
      return `<span class="status">${icon('done')}${st === 'partial' ? 'Выполнена частично' : 'Выполнена'}</span>
        <span class="small muted num">${q.doneSetCount(w)} из ${fmt.count(q.setCount(w), ['подхода', 'подходов', 'подходов'])}</span>
        ${prs ? `<span class="grow">${icon('crown')}${prs > 1 ? fmt.count(prs, ['рекорд', 'рекорда', 'рекордов']) : 'рекорд'}</span>` : ''}
        ${r.source === 'trainer' ? `<span class="small muted pln-by">${icon('user', 'i--s')}внёс тренер</span>` : ''}
        ${replies.length ? `<span class="small pln-re${unread ? ' is-new' : ''}">${icon('message', 'i--s')}${unread ? 'Новый ответ тренера' : 'ответ тренера'}</span>` : ''}`;
    }
    if (st === 'missed') return `<span class="status status--muted">${icon('missed')}Пропущена</span>${r.missReason ? `<span class="small muted">«${esc(r.missReason)}»</span>` : ''}`;
    if (st === 'inProgress') {
      if (r.source === 'trainer') return `<span class="status status--muted">${icon('user')}Отмечает тренер</span><span class="small muted num">${q.doneSetCount(w)} из ${q.setCount(w)}</span>`;
      return `<span class="status status--muted">${icon('saved')}Начата в ${fmt.time(r.startedAt)}</span><span class="small muted">отметки сохранены</span>`;
    }
    if (st === 'unmarked') return `<span class="status status--muted"><i class="status__open" aria-hidden="true"></i>Не отмечена</span>`;
    return `<span class="status status--muted">${icon('clock')}Запланирована</span>`;
  }

  function row(w) {
    const st = q.status(w), d = q.date(w);
    const done = ['completed', 'partial', 'missed'].includes(st);
    const to = done ? href('result.html', { w: w.id, back: 'plan' }) : href('workout.html', { w: w.id, back: 'plan' });
    const rel = d === q.today ? 'сегодня' : d === q.addDays(q.today, 1) ? 'завтра' : '';
    const inP = q.inPerson(w);
    const where = inP ? `<span class="pln-row__where small muted">${icon('clock', 'i--s')}${q.timeRange(w)}<span aria-hidden="true">·</span>${icon('place', 'i--s')}${esc(w.schedule.location)}</span>` : '';
    // Не в свой день: честно - фактическая дата, плановая строкой ниже, без пометки пропуска (решение пользователя 5)
    const moved = done && st !== 'missed' && d !== w.schedule.date ? `<span class="small muted">по плану - ${fmt.date(w.schedule.date)}</span>` : '';
    const acts = st === 'unmarked' && !archived ? `<div class="pln-row__acts">
        <a class="btn btn--dark" href="${href('finish.html', { w: w.id, mode: 'mark' })}">${icon('check')}Отметить, что сделал</a>
        <a class="btn" href="${href('plan.html', { w: w.id, miss: 1 })}#miss">Пропустил</a>
      </div>` : '';
    return `<li class="pln-row${d === q.today ? ' is-today' : ''}" data-w="${w.id}">
      <span class="pln-row__d"><b>${fmt.date(d)}</b>${rel ? `<span class="small muted">${rel}</span>` : ''}</span>
      <span class="pln-row__w">
        <a class="pln-row__a" href="${to}"><b>${esc(w.title)}</b></a>
        <span class="small muted">${q.sub(w)}</span>
        ${where}${moved}
      </span>
      <span class="pln-row__st"><span class="tag">${q.formatWord(w)}</span>${status(w)}</span>
      ${icon('chevR', 'i--m pln-row__go')}
      ${acts}
    </li>`;
  }

  // Неделя без тренировок: тренер ещё не собрал (черновики клиент не видит) - объясняем, что будет, без задачи клиенту
  const empty = (n, lead) => `<div class="pln-empty">
      <p class="h3">${lead}</p>
      <p class="muted">Тренировки недели ${n} появятся здесь, как только ${esc(T.name)} их соберёт.</p>
    </div>`;

  const weekSec = (n, tag, inner) => `<section class="sec" aria-labelledby="h-w${n}">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-w${n}">Неделя ${n}${tag ? ` · ${tag}` : ''}</h2><span class="small muted">${range(n)}</span></div>
      ${inner}
    </section>`;
  const list = (ws) => `<ol class="pln-list">${ws.map(row).join('')}</ol>`;
  const deload = (n) => ((P.deloadWeeks || []).includes(n) ? 'разгрузка' : '');

  // ---------- Полоса ----------
  const inProgram = cur >= 1 && cur <= P.weeks;
  const band = `<p class="label band__eyebrow">Программа «${esc(P.title)}»</p>
    <h1 class="band__title">План</h1>
    <p class="band__meta">${archived
      ? `${esc(T.name)} отключил вас ${fmt.dayMonth(q.db.client.archivedAt)}. История - на чтение.`
      : inProgram ? `Неделя <b>${cur} из ${P.weeks}</b> · ${range(cur)}` : `${P.weeks} недель · до ${fmt.dayMonth(P.endsOn)}`}</p>
    ${ui.week()}`;

  // ---------- Лист ----------
  const sections = [];

  if (canMiss) {
    const past = q.status(missW) === 'unmarked';
    sections.push(`<section class="card pln-miss" id="miss" aria-labelledby="h-miss">
      <h2 class="h3" id="h-miss">${past ? 'Пропустили тренировку?' : 'Не получится потренироваться?'}</h2>
      <p class="small muted">${esc(missW.title)} · ${fmt.date(missW.schedule.date)} · <span class="nowrap">${q.sub(missW)}</span></p>
      <p>Тренер увидит отметку и сможет поправить план. Причину писать не обязательно.</p>
      <form class="pln-miss__f" novalidate>
        <fieldset class="fl">
          <legend class="fl__l">Причина <small>по желанию</small></legend>
          <div class="chips" role="group" aria-label="Готовые причины">${['Болезнь', 'Командировка', 'Нет времени', 'Усталость'].map((x) => `<button type="button" class="chip" aria-pressed="false">${x}</button>`).join('')}</div>
          <label class="sr-only" for="miss-t">Своими словами</label>
          <textarea class="area" id="miss-t" rows="3" placeholder="Или своими словами"></textarea>
        </fieldset>
        <div class="pln-miss__acts">
          <button type="submit" class="btn btn--primary btn--lg">Отметить пропуск</button>
          <a class="btn btn--ghost" href="${href('plan.html')}">Отмена</a>
        </div>
      </form>
    </section>`);
  }

  if (archived) sections.push(`<div class="banner" role="note">${icon('history')}<p class="banner__t"><b>Новых тренировок нет.</b> Все прошедшие тренировки и результаты остаются у вас - их можно смотреть, но не менять.</p></div>`);

  // Эта неделя и следующая - по дням
  const now = byWeek.get(cur) || [];
  if (inProgram) {
    if (now.length) sections.push(weekSec(cur, 'эта неделя', list(now)));
    else if (!archived) sections.push(weekSec(cur, 'эта неделя', empty(cur, 'Тренер готовит план')));
  }
  const nextN = cur + 1;
  if (!archived && inProgram && nextN <= P.weeks && now.length) {
    const nx = byWeek.get(nextN) || [];
    sections.push(weekSec(nextN, 'следующая', nx.length ? list(nx) : empty(nextN, `Тренер готовит план на неделю ${nextN}`)));
  }

  // Прошедшие недели: две последние открыты, остальные - по кнопке
  const past = [...byWeek.keys()].filter((n) => n < cur).sort((a, b) => b - a);
  const open = past.slice(0, 2), rest = past.slice(2);
  for (const n of open) sections.push(weekSec(n, deload(n), list(byWeek.get(n))));
  if (rest.length) {
    const lo = Math.min(...rest), hi = Math.max(...rest);
    sections.push(`<div class="pln-old">
      <button type="button" class="btn btn--soft btn--block" aria-expanded="false" aria-controls="pln-old">${icon('history')}Показать недели ${lo === hi ? lo : `${lo}-${hi}`}</button>
      <div class="stack" id="pln-old" hidden>${rest.map((n) => weekSec(n, deload(n), list(byWeek.get(n)))).join('')}</div>
    </div>`);
  }
  const B = q.db.before;
  if (B) sections.push(`<p class="small muted pln-before">${icon('history', 'i--s')}До программы - «${esc(B.title)}»: ${fmt.count(B.completed, ['тренировка', 'тренировки', 'тренировок'])}, ${fmt.dayMonth(B.from)} - ${fmt.dayMonth(B.to)}</p>`);

  ui.page({ screen: 'plan', title: 'План', tab: 'plan', band, body: `<div class="stack">${sections.join('')}</div>` });

  // ---------- Поведение ----------
  const more = document.querySelector('.pln-old > .btn');
  if (more) more.dataset.label = more.lastChild.textContent;
  if (more) more.addEventListener('click', () => {
    const box = document.getElementById('pln-old');
    const on = more.getAttribute('aria-expanded') !== 'true';
    box.hidden = !on;
    more.setAttribute('aria-expanded', String(on));
    more.lastChild.textContent = on ? 'Скрыть старые недели' : more.dataset.label;
  });

  // «Пропустил»: причина - готовая (одна) или своими словами; после отметки строка показывает «Пропущена», форма - итог с «Отменить»
  const form = document.querySelector('.pln-miss__f');
  if (form) {
    const card = form.closest('.pln-miss');
    const chips = [...form.querySelectorAll('.chip')];
    const area = form.querySelector('textarea');
    for (const c of chips) c.addEventListener('click', () => {
      const on = c.getAttribute('aria-pressed') !== 'true';
      for (const x of chips) x.setAttribute('aria-pressed', 'false');
      c.setAttribute('aria-pressed', String(on));
    });
    const rowEl = document.querySelector(`.pln-row[data-w="${missW.id}"]`);
    if (location.hash === '#miss') card.scrollIntoView({ block: 'start' });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const chip = chips.find((x) => x.getAttribute('aria-pressed') === 'true');
      const reason = area.value.trim() || (chip ? chip.textContent.toLowerCase() : '');
      if (rowEl) {
        rowEl.querySelector('.pln-row__st').innerHTML = `<span class="tag">${q.formatWord(missW)}</span><span class="status status--muted">${icon('missed')}Пропущена</span>${reason ? `<span class="small muted">«${esc(reason)}»</span>` : ''}`;
        const acts = rowEl.querySelector('.pln-row__acts'); if (acts) acts.remove();
      }
      card.classList.add('is-done');
      card.innerHTML = `<div class="banner banner--ok pln-miss__ok" role="status">${icon('check')}<p class="banner__t"><b>Пропуск отмечен.</b> ${esc(T.name)} увидит отметку${reason ? ' и причину' : ''}.</p><button type="button" class="btn btn--ghost pln-undo">Отменить</button></div>`;
      card.querySelector('.pln-undo').focus();
      // Пропуск - в отметках клиента (parts/session.data.js): его видят «Сегодня», «Результат» и обзор. «Отменить» снимает отметку
      const run = APS.run.ensure(missW.id);
      run.result = { workoutId: missW.id, source: 'client', status: 'missed', ...(reason ? { missReason: reason } : {}), attachments: [] };
      APS.run.save();
      card.querySelector('.pln-undo').addEventListener('click', () => { APS.run.clear(missW.id); location.href = href('plan.html', { w: missW.id, miss: 1 }); });
    });
  }
})();
