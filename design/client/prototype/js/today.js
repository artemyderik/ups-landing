// «Сегодня» клиента. Что показывает полоса - по состоянию дня (BEHAVIOR.md 5.5, «Сегодня клиента»):
// отключён тренером > тренировку отмечает тренер > тренировка начата и не завершена > тренировка сегодня (сам или с тренером) >
// выполнена сегодня > день отдыха (следующая есть) > план закончился. Новый ответ тренера - первым разделом листа в любом состоянии.
(() => {
  const { q, fmt, esc, ui } = APS;
  const { icon, href } = ui;
  const T = q.db.trainer;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const weekNo = (date) => q.week({ schedule: { date } });
  const setsWord = ['подхода', 'подходов', 'подходов'];   // «из 1 подхода», «из 20 подходов»

  const tw = q.todayWorkout();
  const tr = tw && q.result(tw.id);
  const next = q.next();
  const mode = q.archived() ? 'disconnected'
    : tw && tr && tr.status === 'inProgress' && tr.source === 'trainer' ? 'trainer'
    : tw && tr && tr.status === 'inProgress' ? 'paused'
    : tw && !tr ? 'today'
    : tw && tr ? 'done'
    : next ? 'rest' : 'ended';

  // ---------- Полоса ----------
  const eyebrow = `<p class="label band__eyebrow">${fmt.dateLong(q.today)}${!q.archived() && q.today >= q.db.program.startsOn && weekNo(q.today) <= q.db.program.weeks ? ` · неделя ${weekNo(q.today)}` : ''}</p>`;
  const meta = (w) => `${cap(q.sub(w))} · ${fmt.count(q.exCount(w), ['упражнение', 'упражнения', 'упражнений'])} · около ${w.schedule.durationMin}${fmt.NBSP}мин`;
  const inPersonInfo = (w) => `<ul class="t-info">
      <li>${icon('clock', 'i--m')}<span>${q.timeRange(w)}</span></li>
      <li>${icon('place', 'i--m')}<span>${esc(w.schedule.location)}</span></li>
      <li>${icon('user', 'i--m')}<span>${esc(T.name)}</span></li>
    </ul>`;
  const segs = (total, done, now) => `<div class="segbar t-segs" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<span class="${i < done ? 'is-done' : i === now ? 'is-now' : ''}"></span>`).join('')}</div>`;

  let band = '';
  if (mode === 'today') {
    const inP = q.inPerson(tw);
    band = `${eyebrow}${ui.week()}
      <div class="t-hero">
        <p class="label on-dark-2">Сегодня · ${q.formatWord(tw)}</p>
        <h1 class="band__title">${esc(tw.title)}</h1>
        <p class="band__meta">${meta(tw)}</p>
        ${inP ? inPersonInfo(tw) : ''}
        <div class="band__acts">
          <a class="btn btn--primary btn--lg btn--block" href="${href('session.html', { w: tw.id })}">${icon('play')}Начать тренировку</a>
          <a class="btn btn--shell btn--block" href="${href('workout.html', { w: tw.id })}">Обзор тренировки</a>
        </div>
      </div>`;
  } else if (mode === 'paused') {
    const n = q.resumeAt(tw), total = q.exCount(tw), last = q.sets(tw.id).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    band = `${eyebrow}${ui.week()}
      <div class="t-hero">
        <p class="label on-dark-2">Не завершена · начата в ${fmt.time(tr.startedAt)}</p>
        <h1 class="band__title">${esc(tw.title)}</h1>
        <p class="band__meta">Сделано <b>${n - 1} из ${total}</b> ${fmt.plural(total, ['упражнения', 'упражнений', 'упражнений'])}</p>
        ${segs(total, n - 1, n - 1)}
        <p class="sync t-sync">${icon('saved')}<span><b>Отметки сохранены</b> · ${fmt.time(last.recordedAt)}</span></p>
        <div class="band__acts">
          <a class="btn btn--primary btn--lg btn--block" href="${href('session.html', { w: tw.id, from: n })}">${icon('play')}Продолжить с упражнения ${n}</a>
          <a class="btn btn--shell btn--block" href="${href('finish.html', { w: tw.id })}">Завершить тренировку</a>
        </div>
      </div>`;
  } else if (mode === 'trainer') {
    const total = q.setCount(tw), done = q.doneSetCount(tw);
    band = `${eyebrow}${ui.week()}
      <div class="t-hero">
        <p class="label on-dark-2">Идёт · с тренером · ${q.timeRange(tw)}</p>
        <h1 class="band__title">${esc(tw.title)}</h1>
        <p class="band__meta">Подходы отмечает <b>${esc(T.name)}</b>: ${done} из ${total}</p>
        ${segs(total, done, -1)}
        <p class="band__meta">Отметки сразу появятся у вас. Исправить их можно будет после тренировки.</p>
        <div class="band__acts">
          <a class="btn btn--shell btn--block" href="${href('workout.html', { w: tw.id })}">Смотреть отметки</a>
        </div>
      </div>`;
  } else if (mode === 'done') {
    band = `${eyebrow}${ui.week()}
      <div class="t-hero">
        <p class="label on-dark-2">Сегодня · ${tr.status === 'partial' ? 'выполнена частично' : 'выполнена'}</p>
        <h1 class="band__title">${esc(tw.title)}</h1>
        <p class="band__meta">${q.doneSetCount(tw)} из ${fmt.count(q.setCount(tw), setsWord)} · тренер видит результат</p>
        <div class="band__acts"><a class="btn btn--shell btn--block" href="${href('result.html', { w: tw.id })}">Результат</a></div>
      </div>`;
  } else if (mode === 'rest') {
    const when = q.addDays(q.today, 1) === next.schedule.date ? 'завтра' : fmt.date(next.schedule.date);
    band = `${eyebrow}${ui.week()}
      <div class="t-hero">
        <h1 class="band__title">Сегодня отдых</h1>
        <p class="band__meta">Следующая тренировка - <b>${when}</b>: ${esc(next.title)}, ${q.formatWord(next)}${q.inPerson(next) ? ` в ${next.schedule.startTime}` : ''}</p>
        <div class="band__acts">
          <a class="btn btn--shell btn--block" href="${href('workout.html', { w: next.id })}">Посмотреть тренировку</a>
        </div>
        <p class="band__meta small">Тренировку недели можно сделать в любой день - тренер увидит, когда вы её сделали.</p>
      </div>`;
  } else if (mode === 'ended') {
    const wk = weekNo(q.today);
    band = `${eyebrow}
      <div class="t-hero">
        <h1 class="band__title">Тренер готовит план</h1>
        <p class="band__meta">Тренировки недели ${wk} появятся здесь, как только ${esc(T.name)} их соберёт. Пока можно посмотреть прогресс.</p>
        <div class="band__acts"><a class="btn btn--shell btn--block" href="${href('progress.html')}">${icon('trendUp')}Прогресс</a></div>
      </div>`;
  } else {   // disconnected
    band = `${eyebrow}
      <div class="t-hero">
        <h1 class="band__title">Новых тренировок нет</h1>
        <p class="band__meta">${esc(T.name)} отключил вас ${fmt.dayMonth(q.db.client.archivedAt)}. История тренировок и прогресс остаются у вас - на чтение.</p>
      </div>`;
  }

  // ---------- Лист ----------
  const sections = [];

  // Новый ответ тренера: заметен на «Сегодня», пока клиент его не открыл
  const reply = q.unreadReplies()[0];
  if (reply) {
    const w = q.workout(reply.workoutId);
    const mine = q.comments(w.id).filter((c) => c.author === 'client' && c.createdAt < reply.createdAt).pop();
    sections.push(`<section class="sec" aria-labelledby="h-reply">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-reply">Новый ответ тренера</h2><span class="small muted">${fmt.relTime(reply.createdAt)}</span></div>
      <div class="card t-reply">
        <p class="small muted">К тренировке «${esc(w.title)}» · ${fmt.date(q.date(w))}</p>
        ${mine ? `<p class="t-reply__mine"><span class="sr-only">Вы: </span>${esc(mine.body)}</p>` : ''}
        <div class="comment"><span class="ava ava--s" aria-hidden="true">${esc(T.initials)}</span><div class="comment__b"><p>${esc(reply.body)}</p><p class="comment__m">${esc(T.name)}</p></div></div>
        <a class="btn btn--block" href="${href(`result.html#comments`, { w: w.id })}">${icon('reply')}Ответить</a>
      </div>
    </section>`);
  }

  // Заметка тренера к сегодняшней тренировке - только «Видит клиент»
  if (tw && (mode === 'today' || mode === 'paused')) {
    const notes = q.clientNotes(tw.notes);
    if (notes.length) sections.push(`<section class="sec" aria-labelledby="h-note">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-note">Заметка тренера</h2></div>
      ${notes.map((n) => `<div class="comment"><span class="ava ava--s" aria-hidden="true">${esc(T.initials)}</span><div class="comment__b">${q.rich(n.body)}</div></div>`).join('')}
    </section>`);
  }

  // Неделя закрыта - праздник (тон бренда: праздник на рекорде и закрытой неделе)
  if (mode === 'ended') {
    const prevWeek = weekNo(q.today) - 1;
    const ws = q.workouts().filter((w) => q.week(w) === prevWeek);
    const done = ws.filter((w) => ['completed', 'partial'].includes(q.status(w)));
    if (ws.length && done.length === ws.length) {
      const prs = ws.flatMap((w) => q.recordsOf(w.id));
      const shown = prs.slice(0, 3);
      sections.push(`<section class="card card--dark good" aria-labelledby="h-week">
        <h2 class="label on-dark-2" id="h-week">Неделя ${prevWeek} закрыта</h2>
        <p class="good__num"><span class="good__badge">${ui.rays()}${icon('crown', 'good__crown')}</span><span class="num">${done.length} из ${ws.length}</span></p>
        <span class="cat-badge good__cat" aria-hidden="true">${ui.cat('cat-happy', 77)}</span>
        <p class="good__who">${fmt.plural(ws.length, ['тренировка выполнена', 'тренировки выполнены', 'тренировок выполнено'])}${prs.length ? ` · <b>${fmt.count(prs.length, ['рекорд', 'рекорда', 'рекордов'])}</b>` : ''}</p>
        ${shown.length ? `<ul class="good__list">${shown.map((r) => `<li><p class="good__t"><b>${esc(q.name(r.exerciseId))}</b> · <span class="good__d">+${fmt.kg(r.weight - r.prev)}</span></p><span class="good__n num">${fmt.setVal(r.values)}</span></li>`).join('')}</ul>` : ''}
        ${prs.length > shown.length ? `<a class="link t-good-more" href="${href('progress.html')}">Все рекорды${icon('arrowR')}</a>` : ''}
      </section>`);
    }
  }

  // История у клиента отключённого тренера - на чтение (решение 8)
  if (mode === 'disconnected') {
    sections.push(`<section class="sec" aria-labelledby="h-hist">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-hist">Ваша история</h2></div>
      <div class="t-stats">
        <p class="card card--md"><span class="h2 num">${q.completedCount()}</span><span class="small muted">${fmt.plural(q.completedCount(), ['тренировка', 'тренировки', 'тренировок'])} с ${fmt.dayMonth(q.db.client.startedOn)}</span></p>
        <p class="card card--md"><span class="h2 num">${q.records().length}</span><span class="small muted">${fmt.plural(q.records().length, ['рекорд', 'рекорда', 'рекордов'])} в программе «${esc(q.db.program.title)}»</span></p>
      </div>
      <div class="t-acts">
        <a class="btn btn--soft btn--block" href="${href('plan.html')}">${icon('history')}История тренировок</a>
        <a class="btn btn--soft btn--block" href="${href('progress.html')}">${icon('trendUp')}Прогресс</a>
      </div>
    </section>`);
  }

  // Последний итог
  const last = q.lastDone();
  if (last && mode !== 'done') {
    const { workout: w, result: r } = last;
    const prs = q.recordsOf(w.id);
    const replied = q.comments(w.id).some((c) => c.author === 'trainer');
    const total = q.setCount(w);
    sections.push(`<section class="sec" aria-labelledby="h-last">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-last">Последний итог</h2></div>
      <a class="card t-last" href="${href('result.html', { w: w.id })}">
        <span class="t-last__top"><span class="small muted">${fmt.dateCap(q.date(w))} · ${q.formatWord(w)}${r.source === 'trainer' ? ' · внёс тренер' : ''}</span>${icon('chevR', 'i--m t-go')}</span>
        <span class="h3">${esc(w.title)}</span>
        <span class="small muted">${cap(q.sub(w))}</span>
        <span class="status">${icon('done')}${r.status === 'partial' ? 'Выполнена частично' : 'Выполнена'} · ${q.doneSetCount(w)} из ${fmt.count(total, setsWord)}</span>
        ${prs.length ? `<span class="t-pr">${prs.map((p) => `<span class="t-pr__i"><span class="set set--pr">${icon('crown')}${fmt.setVal(p.values)}</span><span class="small">${esc(q.name(p.exerciseId))}</span></span>`).join('')}</span>` : ''}
        ${replied ? `<span class="small t-last__re">${icon('message', 'i--s')}Есть ответ тренера</span>` : ''}
      </a>
    </section>`);
  }

  // Следующая тренировка (кроме дня отдыха - там она в полосе)
  const after = mode === 'today' || mode === 'paused' || mode === 'trainer' || mode === 'done' ? q.next(q.today) : null;
  if (after) {
    sections.push(`<section class="sec" aria-labelledby="h-next">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-next">Следующая</h2><a class="link" href="${href('plan.html')}">План${icon('arrowR')}</a></div>
      <a class="t-next" href="${href('workout.html', { w: after.id })}">
        <span class="t-next__d"><span class="small muted">${fmt.weekday(after.schedule.date)}</span><b class="num">${Number(after.schedule.date.slice(8))}</b></span>
        <span class="t-next__w"><b>${esc(after.title)}</b><span class="small muted">${q.sub(after)} · ${q.formatWord(after)}${q.inPerson(after) ? `, ${after.schedule.startTime}` : ''}</span></span>
        ${icon('chevR', 'i--m t-go')}
      </a>
    </section>`);
  }

  ui.page({ screen: 'today', title: 'Сегодня', tab: 'today', band, body: `<div class="stack">${sections.join('')}</div>` });
})();
