// «Тренировка: обзор» - что в тренировке до старта: упражнения по разделам, суперсеты, время, оборудование, заметки тренера.
// ?w=<id> - тренировка (без параметра - сегодняшняя); ?back=plan - «назад» ведёт в «План».
// Главное действие - по статусу: запланирована - «Начать», начата - «Продолжить с упражнения N», отмечает тренер - без действия,
// выполнена - «Результат», не отмечена - «Отметить, что сделал» и «Пропустил» (без упрёка), клиент отключён - только чтение.
(() => {
  const { q, fmt, esc, ui } = APS;
  const { icon, href } = ui;
  const params = new URLSearchParams(location.search);
  const T = q.db.trainer;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const w = q.workout(params.get('w')) || q.todayWorkout() || q.next() || q.workouts()[q.workouts().length - 1];
  const r = q.result(w.id);
  const st = q.status(w);
  const inP = q.inPerson(w);
  const byTrainer = r && r.status === 'inProgress' && r.source === 'trainer';
  const back = params.get('back') === 'plan' ? { href: 'plan.html', label: 'План' } : { href: 'today.html', label: 'Сегодня' };

  // ---------- Полоса ----------
  const when = w.schedule.date === q.today ? 'Сегодня' : fmt.dateCap(w.schedule.date);
  const band = `<p class="label band__eyebrow">${when} · ${q.formatWord(w)}${inP ? `, ${w.schedule.startTime}` : ''}</p>
    <h1 class="band__title">${esc(w.title)}</h1>
    <p class="band__meta">${cap(q.sub(w))}</p>
    <ul class="w-facts">
      <li><b class="num">${q.exCount(w)}</b><span>${fmt.plural(q.exCount(w), ['упражнение', 'упражнения', 'упражнений'])}</span></li>
      <li><b class="num">${q.setCount(w)}</b><span>${fmt.plural(q.setCount(w), ['подход', 'подхода', 'подходов'])}</span></li>
      <li><b class="num">~${w.schedule.durationMin}</b><span>${fmt.plural(w.schedule.durationMin, ['минута', 'минуты', 'минут'])}</span></li>
    </ul>`;

  // ---------- Лист ----------
  const sections = [];

  // Статус тренировки - баннер в потоке (DESIGN.md 5.7), без цвета статуса и без упрёка
  const flat = q.flat(w);
  if (byTrainer) {
    sections.push(`<div class="banner" role="status">${icon('user')}<p class="banner__t"><b>Подходы отмечает ${esc(T.name)}</b> · ${q.doneSetCount(w)} из ${q.setCount(w)}. Отметки появляются здесь сразу, исправить их можно после тренировки.</p></div>`);
  } else if (st === 'inProgress') {
    const n = q.resumeAt(w);
    sections.push(`<div class="banner" role="status">${icon('saved')}<p class="banner__t"><b>Начата в ${fmt.time(r.startedAt)}</b> · сделано ${n - 1} из ${flat.length} ${fmt.plural(flat.length, ['упражнения', 'упражнений', 'упражнений'])}. Отметки сохранены.</p></div>`);
  } else if (st === 'completed' || st === 'partial') {
    sections.push(`<div class="banner banner--ok">${icon('done')}<p class="banner__t"><b>${st === 'partial' ? 'Выполнена частично' : 'Выполнена'}</b> · ${fmt.date(q.date(w))}${r.source === 'trainer' ? ' · внёс тренер' : ''}</p></div>`);
  } else if (st === 'missed') {
    sections.push(`<div class="banner">${icon('missed')}<p class="banner__t"><b>Пропущена</b>${r.missReason ? ` · «${esc(r.missReason)}»` : ''}</p></div>`);
  } else if (st === 'unmarked') {
    sections.push(`<div class="banner"><i class="status__open" aria-hidden="true"></i><p class="banner__t"><b>Не отмечена.</b> Если тренировка была - отметьте, и тренер увидит факт. Не получилось - так и скажите, причину можно не писать.</p></div>`);
  }

  // Очная: время, место, тренер
  if (inP) sections.push(`<section class="sec" aria-labelledby="h-where">
    <div class="sec-h"><h2 class="label sec-h__title" id="h-where">С тренером</h2></div>
    <div class="card"><ul>
      <li class="kv">${icon('clock')}<span><span class="kv__l">Время</span><br>${fmt.date(w.schedule.date)}, ${q.timeRange(w)}</span></li>
      <li class="kv">${icon('place')}<span><span class="kv__l">Место</span><br>${esc(w.schedule.location)}</span></li>
      <li class="kv">${icon('user')}<span><span class="kv__l">Тренер</span><br>${esc(T.name)}</span></li>
    </ul></div>
  </section>`);

  // Заметки тренера к тренировке - только «Видит клиент»
  const notes = q.clientNotes(w.notes);
  if (notes.length) sections.push(`<section class="sec" aria-labelledby="h-note">
    <div class="sec-h"><h2 class="label sec-h__title" id="h-note">Заметка тренера</h2></div>
    ${notes.map((n) => `<div class="comment"><span class="ava ava--s" aria-hidden="true">${esc(T.initials)}</span><div class="comment__b">${q.rich(n.body)}</div></div>`).join('')}
  </section>`);

  // Оборудование
  const eq = q.equipment(w);
  sections.push(`<section class="sec" aria-labelledby="h-eq">
    <div class="sec-h"><h2 class="label sec-h__title" id="h-eq">Понадобится</h2></div>
    ${eq.length ? `<ul class="tags">${eq.map((e) => `<li class="tag tag--soft">${esc(e)}</li>`).join('')}</ul>` : '<p class="muted">Без оборудования</p>'}
  </section>`);

  // Упражнения по разделам: разминка, основная часть, заминка. Группы - лаймовая черта и «Суперсет» / «Трисет»
  const ROLE = { warmup: 'Разминка', main: 'Основная часть', cooldown: 'Заминка', recovery: 'Восстановление' };
  const row = (x) => {
    const { el } = x;
    const e = q.ex(el.exerciseId);
    const done = q.elementDone(w, el);
    const marked = q.sets(w.id, el.id).filter((s) => s.done && s.setPlanId).length;
    const right = done ? `<span class="w-ex__st">${icon('done', 'i--m')}<span class="sr-only">сделано</span></span>`
      : marked ? `<span class="w-ex__st small num">${marked} из ${el.sets.length}</span>` : icon('chevR', 'i--m w-ex__go');
    const rest = el.restSec && !x.group ? ` · отдых${fmt.NBSP}${fmt.rest(el.restSec)}` : '';
    const elNotes = q.clientNotes(el.notes);
    return `<li class="w-ex${done ? ' is-done' : ''}">
      <a class="w-ex__a" href="${href('exercise.html', { ex: el.exerciseId, w: w.id, el: el.id, wback: params.get('back') === 'plan' ? 'plan' : null })}">
        <span class="w-ex__n num" aria-hidden="true">${x.n}</span>
        <span class="w-ex__b">
          <span class="w-ex__name">${x.label ? `<span class="grp">${x.label}</span>` : ''}<span>${esc(e.name)}</span></span>
          <span class="w-ex__plan num">${q.planText(el)}${rest}</span>
        </span>
        ${right}
      </a>
      ${elNotes.map((n) => `<div class="w-ex__note">${icon('note', 'i--s')}<div>${q.rich(n.body)}</div></div>`).join('')}
    </li>`;
  };
  let html = '', lastRole = null, i = 0;
  const open = () => { if (lastRole !== null) html += '</ol></section>'; };
  for (const b of w.blocks) {
    const role = b.role || 'main';
    if (role !== lastRole) {
      open();
      const n = flat.filter((x) => x.role === role).length;
      html += `<section class="sec" aria-labelledby="h-r-${role}"><div class="sec-h"><h2 class="label sec-h__title" id="h-r-${role}">${ROLE[role]}</h2><span class="small muted">${fmt.count(n, ['упражнение', 'упражнения', 'упражнений'])}</span></div><ol class="w-list">`;
      lastRole = role;
    }
    const items = flat.slice(i, i + b.elements.length); i += b.elements.length;
    if (items.length > 1) {
      const L = items[0].group, rounds = Math.max(...items.map((x) => x.el.sets.length));
      html += `<li class="grp-b w-grp"><div class="grp-b__h"><span class="tag tag--lime">${q.groupName(b)}</span><span class="small muted">по очереди ${items.map((x) => x.label).join(' → ')}, ${fmt.count(rounds, ['круг', 'круга', 'кругов'])}${b.restAfterRoundSec ? ` · отдых после круга${fmt.NBSP}${fmt.rest(b.restAfterRoundSec)}` : ''}</span></div><ol class="w-list">${items.map(row).join('')}</ol></li>`;
    } else html += row(items[0]);
  }
  open();
  sections.push(html);

  // ---------- Панель действий ----------
  let bar = '';
  if (q.archived()) bar = '';
  else if (byTrainer) bar = `<p class="assign-bar__note">${icon('user', 'i--s')} Подходы отмечает ${esc(T.name)}</p>`;
  else if (st === 'inProgress') bar = `<a class="btn btn--primary btn--lg" href="${href('session.html', { w: w.id, from: q.resumeAt(w) })}">${icon('play')}Продолжить с упражнения ${q.resumeAt(w)}</a>`;
  else if (st === 'completed' || st === 'partial' || st === 'missed') bar = `<a class="btn btn--lg" href="${href('result.html', { w: w.id })}">Результат</a>`;
  else if (st === 'unmarked') bar = `<a class="btn btn--primary btn--lg" href="${href('finish.html', { w: w.id, mode: 'mark' })}">${icon('check')}Отметить, что сделал</a><a class="btn btn--shell btn--lg" href="${href('plan.html', { w: w.id, miss: 1 })}">Пропустил</a>`;
  else bar = `<a class="btn btn--primary btn--lg" href="${href('session.html', { w: w.id })}">${icon('play')}Начать тренировку</a>`;

  ui.page({ screen: 'workout', title: `${w.title} - обзор`, back, band, body: `<div class="stack">${sections.join('')}</div>`, bar: bar || null });
})();
