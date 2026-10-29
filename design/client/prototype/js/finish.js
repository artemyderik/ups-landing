// «Завершение и итог» (BEHAVIOR.md 5.7): один экран из четырёх необязательных вопросов (тяжесть, самочувствие, боль, комментарий),
// затем итог: сколько сделано, рекорды, сравнение с прошлым разом, праздник на рекорде и закрытой неделе, живой вывод из моков,
// «Тренер увидит результат», следующая тренировка.
// ?w=<id>; &mode=mark - «Отметить, что сделал» для прошедшей без отметки: факт по плану одним действием, с правкой;
// &step=done - итог (появляется сам после «Завершить»; без сохранённого завершения открываются вопросы).
// Отметки и ответы - parts/session.data.js (APS.run): WorkoutResult { status, completedAt, rpe, wellbeing, pain, comment }.
(() => {
  const { q, fmt, esc, ui, kit } = APS;
  const RUN = APS.run;
  const { icon, href } = ui;
  const P = new URLSearchParams(location.search);
  const OFF = P.get('net') === 'off';
  const T = q.db.trainer;
  const V = q.db.visibility;
  const SETS = ['подход', 'подхода', 'подходов'];
  const SETS_OF = ['подхода', 'подходов', 'подходов'];   // «из 1 подхода», «из 32 подходов»
  const ORDER = ['weight', 'reps', 'duration', 'distance'];
  const STEP = { weight: 2.5, reps: 1, duration: 5, distance: 5 };
  const MIN = { weight: 0, reps: 1, duration: 5, distance: 5 };
  const UNIT = { weight: 'кг', reps: 'повт.', duration: 'с', distance: 'м' };

  const w = q.workout(P.get('w')) || q.todayWorkout();
  if (!w) {
    ui.page({ screen: 'finish', title: 'Завершение', back: { href: 'today.html', label: 'Сегодня' },
      band: '<p class="label band__eyebrow">Завершение</p><h1 class="band__title">Тренировки нет</h1>',
      body: `<div class="st__empty">${ui.cat('cat-happy', 144)}<div><h3>Здесь пусто</h3><p>${q.archived() ? `${esc(T.name)} отключил вас - новых тренировок нет, история на чтение.` : 'Завершить можно тренировку, которую начали.'}</p></div><a class="btn btn--dark" href="${href('today.html')}">На «Сегодня»</a></div>` });
    return;
  }

  const run = RUN.ensure(w.id);
  const U = run.ui;
  const flat = q.flat(w);
  const r0 = q.result(w.id);
  const byTrainer = !!(r0 && r0.source === 'trainer' && r0.status === 'inProgress');
  const mode = P.get('mode') === 'mark' ? 'mark' : 'finish';
  const finishedHere = !!(run.result && run.result.completedAt && (run.result.status === 'completed' || run.result.status === 'partial'));
  const closedBefore = !finishedHere && ['completed', 'partial', 'missed'].includes(q.status(w));
  const total = q.setCount(w);
  const recOf = (el, sp) => q.sets(w.id, el.id).find((s) => s.setPlanId === sp.id) || null;
  const plannedDone = () => flat.reduce((a, x) => a + x.el.sets.filter((sp) => { const r = recOf(x.el, sp); return r && r.done; }).length, 0);
  const anyDone = () => q.sets(w.id).some((s) => s.done);
  const head = (eyebrow, title, meta = '') => `<p class="label band__eyebrow">${eyebrow}</p><h1 class="band__title">${title}</h1>${meta ? `<div class="band__meta end-meta">${meta}</div>` : ''}`;
  const titleLine = `${esc(w.title)} · ${q.sub(w)}`;

  // ---------- Ответы на четыре вопроса - общие для «Завершения» и «Отметить, что сделал» ----------
  // A: { rpe, wellbeing, painOn, level, place, text, painEl, comment } - черновик хранится в run.ui.answers (переход и перезагрузка)
  const PLACES = ['Поясница', 'Спина', 'Шея', 'Плечо', 'Колено', 'Другое'];
  const A = U.answers || (() => {
    const r = q.result(w.id) || {};
    const p = r.pain;
    const [pl, ...rest] = p && p.note ? p.note.split(' · ') : [];
    return { rpe: r.rpe ?? null, wellbeing: r.wellbeing ?? null, painOn: p ? true : null, level: p ? p.level : null,
      place: PLACES.includes(pl) ? pl : null, text: PLACES.includes(pl) ? rest.join(' · ') : (p && p.note) || '', painEl: p ? p.elementId : null, comment: r.comment || '' };
  })();
  const keep = () => { U.answers = A; RUN.save(); };

  function painBody() {
    const ex = A.painEl ? flat.find((f) => f.el.id === A.painEl) : null;
    return `<div class="end-pain">
      ${ex ? `<p class="small muted">Отмечено во время тренировки: ${esc(q.name(ex.el.exerciseId))}</p>` : ''}
      ${kit.effHtml({ key: 'pain', label: 'Сила боли от 0 до 10', value: A.level, pain: true })}
      <div class="fl"><span class="fl__l">Где <span class="muted">· по желанию</span></span>${kit.chipsHtml(PLACES, A.place, 'Где болит')}</div>
      <label class="fl"><span class="fl__l">Заметка <span class="muted">· по желанию</span></span><textarea class="area area--soft" rows="2" data-a="text" placeholder="Что почувствовали и когда">${esc(A.text)}</textarea></label>
    </div>`;
  }
  function questionsHtml() {
    return `<section class="sec end-q" aria-labelledby="q-rpe">
        <div class="sec-h"><h2 class="label sec-h__title" id="q-rpe">${icon('flame', 'i--s')}Тяжесть тренировки</h2></div>
        ${kit.effHtml({ key: 'rpe', label: 'Тяжесть тренировки', value: A.rpe, skip: 'after', hint: 'Как далась тренировка? Коснитесь полосы' })}
      </section>
      <section class="sec end-q" aria-labelledby="q-well">
        <div class="sec-h"><h2 class="label sec-h__title" id="q-well">${icon('wellbeing', 'i--s')}Самочувствие</h2></div>
        <div class="chips chips--soft end-well" role="radiogroup" aria-labelledby="q-well">${kit.WELL.slice(1).map((x, i) => `<button class="chip" type="button" role="radio" data-well="${i + 1}" aria-checked="${A.wellbeing === i + 1}">${x}</button>`).join('')}</div>
      </section>
      <section class="sec end-q" aria-labelledby="q-pain">
        <div class="sec-h"><h2 class="label sec-h__title" id="q-pain">${icon('sig-pain', 'i--s')}Боль или дискомфорт</h2></div>
        <div class="seg end-seg" role="radiogroup" aria-labelledby="q-pain"><button type="button" role="radio" data-pain="0" aria-checked="${A.painOn === false}">Не было</button><button type="button" role="radio" data-pain="1" aria-checked="${A.painOn === true}">Было</button></div>
        <div id="end-pain">${A.painOn ? painBody() : ''}</div>
      </section>
      <section class="sec end-q" aria-labelledby="q-com">
        <div class="sec-h"><h2 class="label sec-h__title" id="q-com">${icon('message', 'i--s')}Комментарий тренеру</h2></div>
        <textarea class="area area--soft" rows="3" data-a="comment" aria-labelledby="q-com" placeholder="Как прошло, что было не так, вопрос">${esc(A.comment)}</textarea>
      </section>`;
  }
  function bindQuestions(root) {
    const rpe = root.querySelector('[data-eff="rpe"]');
    // Тяжесть: после выбора справа появляется «Сбросить оценку» (x) - вернуть «не выбрано»; место под неё занято сразу,
    // поэтому бегунок не перерисовывается на выборе и доезд с огоньком не обрывается
    const reset = (el) => { const n = document.createElement('div'); n.innerHTML = kit.effHtml({ key: 'rpe', label: 'Тяжесть тренировки', value: null, skip: 'after', hint: 'Как далась тренировка? Коснитесь полосы' }); const fresh = n.firstElementChild; el.replaceWith(fresh); bindRpe(fresh); fresh.querySelector('.eff__range').focus({ preventScroll: true }); };
    const bindRpe = (el) => kit.effBind(el, {
      onChange: (v) => { A.rpe = v; keep(); },
      onSkip: () => { A.rpe = null; keep(); reset(el); },
    });
    if (rpe) bindRpe(rpe);
    const bindPain = () => {
      const box = root.querySelector('#end-pain');
      const p = box.querySelector('[data-eff="pain"]');
      if (!p) return;
      kit.effBind(p, { pain: true, onChange: (v) => { A.level = v; keep(); } });
      kit.chipsBind(box.querySelector('.chips'), (v) => { A.place = v; keep(); });
    };
    bindPain();
    root.addEventListener('click', (e) => {
      const wb = e.target.closest('[data-well]');
      if (wb) { const v = Number(wb.dataset.well); A.wellbeing = A.wellbeing === v ? null : v; root.querySelectorAll('[data-well]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.well) === A.wellbeing))); keep(); }
      const pb = e.target.closest('[data-pain]');
      if (pb) {
        A.painOn = pb.dataset.pain === '1';
        root.querySelectorAll('[data-pain]').forEach((b) => b.setAttribute('aria-checked', String(b === pb)));
        root.querySelector('#end-pain').innerHTML = A.painOn ? painBody() : '';
        bindPain(); keep();
      }
    });
    root.addEventListener('input', (e) => { const k = e.target.dataset.a; if (k) { A[k] = e.target.value; keep(); } });
  }
  // Ответы → поля WorkoutResult (всё по желанию; «Не было» убирает боль, отмеченную в тренировке)
  function answers() {
    const out = {};
    if (A.rpe != null) out.rpe = A.rpe;
    if (A.wellbeing) out.wellbeing = A.wellbeing;
    if (A.painOn && A.level != null) {
      const note = [A.place, (A.text || '').trim()].filter(Boolean).join(' · ');
      out.pain = { level: A.level, ...(note ? { note } : {}), ...(A.painEl ? { elementId: A.painEl } : {}) };
    } else if (A.painOn === false) out.pain = undefined;
    if ((A.comment || '').trim()) out.comment = A.comment.trim();
    return out;
  }
  function complete(extra) {
    const now = RUN.now();
    const r = q.result(w.id);
    const status = plannedDone() === total ? 'completed' : 'partial';
    run.result = { ...(run.result || {}), workoutId: w.id, source: 'client', attachments: [], ...(r && r.startedAt ? { startedAt: r.startedAt } : {}), completedAt: now, status, ...answers(), ...extra };
    if (run.result.pain === undefined) delete run.result.pain;
    if (OFF) run.pending = (run.pending || 0) + 1;
    U.answers = null; U.rest = null; U.eff = null; U.edit = null;
    U.closedAt = now;
    RUN.save();
    RUN.apply(q.db, w.id);
    if (run.result.pain === undefined) { const x = q.result(w.id); if (x) delete x.pain; }
    location.replace(href('finish.html', { w: w.id, step: 'done' }));
  }

  // ---------- Итог ----------
  function summary() {
    const r = q.result(w.id);
    const done = plannedDone();
    const marked = mode === 'mark' || !r.startedAt;
    const recs = q.recordsOf(w.id).sort((a, b) => (b.weight - b.prev) - (a.weight - a.prev));
    const top = recs[0];
    const weekW = q.workouts().filter((x) => x.programId === w.programId && q.week(x) === q.week(w));
    const weekClosed = weekW.every((x) => ['completed', 'partial'].includes(q.status(x)));
    const party = !!top || weekClosed;
    const exDone = flat.filter((x) => x.el.sets.some((sp) => { const s = recOf(x.el, sp); return s && s.done; })).length;
    const dur = r.startedAt && r.completedAt ? Math.max(1, Math.round((Date.parse(r.completedAt) - Date.parse(r.startedAt)) / 60000)) : null;
    const title = marked ? 'Тренировка отмечена' : r.status === 'partial' ? 'Выполнена частично' : 'Тренировка завершена';
    const stats = [
      `<div class="fin__stat"><b class="num">${done} из ${total}</b><span>${fmt.plural(total, SETS_OF)}</span></div>`,
      dur ? `<div class="fin__stat"><b class="num">${dur}${fmt.NBSP}мин</b><span>${fmt.time(r.startedAt)}-${fmt.time(r.completedAt)}</span></div>`
        : `<div class="fin__stat"><b class="num">${exDone} из ${flat.length}</b><span>упражнений · ${fmt.date(q.date(w))}</span></div>`,
      weekClosed ? `<div class="fin__stat end-week">${icon('flag')}<div><b>Неделя ${q.week(w)} закрыта</b><span>${weekW.length} из ${weekW.length} · ${fmt.plural(weekW.length, ['тренировка', 'тренировки', 'тренировок'])}</span></div></div>` : '',
      top && V.records ? `<div class="fin__pr">${ui.crown()}<div><span>Рекорд · ${esc(q.name(top.exerciseId).toLowerCase())}</span><b class="num">${kit.valText(top.values)}</b><span>+${fmt.kg(top.weight - top.prev)} к прежнему лучшему</span></div></div>` : '',
    ].join('');
    const band = `<div class="fin end-fin">
      ${party ? `<div class="fin__cat">${ui.cat('cat-wave-dark', 120, 'Кот машет лапой')}${ui.rays()}</div>` : ''}
      ${head(`${titleLine} · ${q.formatWord(w)}`, title)}
      <div class="fin__stats">${stats}</div>
    </div>`;

    const sections = [];
    // Живой вывод готовой строкой (идея; в прототипе - из моков): по упражнению рекорда, иначе по первому из тренировки
    const lines = (q.db.insights || []).filter((i) => i.text);
    const ins = lines.find((i) => top && i.exerciseId === top.exerciseId) || lines.find((i) => flat.some((x) => x.el.exerciseId === i.exerciseId && q.sets(w.id, x.el.id).some((s) => s.done)));
    if (ins && V.workingWeights) sections.push(`<div class="card card--dark end-insight">${icon('trendUp')}<p>${esc(ins.text)}</p></div>`);
    if (recs.length > 1 && V.records) sections.push(`<section class="sec" aria-labelledby="h-pr"><div class="sec-h"><h2 class="label sec-h__title" id="h-pr">Рекорды</h2></div><div class="sets">${recs.map((x) => `<span class="set set--pr">${ui.crown()}${esc(q.name(x.exerciseId))} ${kit.valText(x.values)}<span class="sr-only">рекорд</span></span>`).join('')}</div></section>`);

    // К прошлому разу: упражнения с весом - рост пилюлей, так же - словами, меньше - нейтрально, без стрелки и цвета
    if (V.workingWeights) {
      const rows = flat.filter((x) => q.planValues(x.el.sets[x.el.sets.length - 1]).weight != null).map((x) => {
        const warm = new Set(x.el.sets.filter((sp) => sp.type === 'warmup').map((sp) => sp.id));
        const today = q.sets(w.id, x.el.id).filter((s) => s.done && s.values.weight != null && !warm.has(s.setPlanId));
        if (!today.length) return '';
        const lt = q.lastTime(x.el.exerciseId, q.date(w));
        const max = Math.max(...today.map((s) => s.values.weight));
        const prevMax = lt ? Math.max(...lt.sets.filter((s) => s.values.weight != null).map((s) => s.values.weight)) : null;
        const cmp = prevMax == null ? '<span class="small muted">впервые</span>'
          : max > prevMax ? `<span class="grow">${icon('arrowUp')}+${fmt.kg(max - prevMax)}</span>`
          : max === prevMax ? '<span class="small muted">как в прошлый раз</span>'
          : `<span class="small muted">в прошлый раз ${fmt.kg(prevMax)}</span>`;
        return `<li class="end-cmp"><span class="end-cmp__n">${x.label ? `<span class="grp">${x.label}</span>` : ''}<span class="end-name">${esc(q.name(x.el.exerciseId))}</span></span><span class="end-cmp__v num">${fmt.setsText(today.map((s) => kit.noRpe(s.values)))}</span>${cmp}</li>`;
      }).filter(Boolean);
      if (rows.length) sections.push(`<section class="sec" aria-labelledby="h-cmp"><div class="sec-h"><h2 class="label sec-h__title" id="h-cmp">К прошлому разу</h2><span class="small muted">рабочий вес</span></div><ul class="end-cmps">${rows.join('')}</ul></section>`);
    }

    const pain = r.pain;
    const painEx = pain && pain.elementId ? flat.find((x) => x.el.id === pain.elementId) : null;
    if (pain) sections.push(`<div class="banner end-painb" role="note"><span class="pain-mark">${icon('sig-pain')}</span><p class="banner__t"><b>Больно ${pain.level}/10</b>${pain.note ? ` · ${esc(pain.note)}` : ''}${painEx ? ` · на упражнении «${esc(q.name(painEx.el.exerciseId))}»` : ''}. Тренер увидит это первым.</p></div>`);

    sections.push(`<div class="end-coach"><span class="ava" aria-hidden="true">${esc(T.initials)}</span><p><b>${esc(T.name)} увидит результат</b>${r.comment || r.rpe || r.wellbeing ? ' и ваши ответы' : ''}. ${OFF ? 'Сейчас нет сети: всё сохранено на телефоне и отправится само.' : 'Ответ появится в результате тренировки и на «Сегодня».'}</p></div>`);

    const nx = q.next(q.today);
    if (nx) sections.push(`<section class="sec" aria-labelledby="h-next"><div class="sec-h"><h2 class="label sec-h__title" id="h-next">Следующая</h2></div>
      <a class="end-next" href="${href('workout.html', { w: nx.id })}"><span class="end-next__d"><b>${fmt.weekday(nx.schedule.date)}</b><span>${Number(nx.schedule.date.slice(8))}</span></span><span><b>${esc(nx.title)}</b><span class="small muted">${q.formatWord(nx)}${q.inPerson(nx) ? `, ${nx.schedule.startTime}` : ''} · ${fmt.count(q.exCount(nx), ['упражнение', 'упражнения', 'упражнений'])} · ~${nx.schedule.durationMin}${fmt.NBSP}мин</span></span>${icon('chevR', 'i--m end-next__go')}</a></section>`);
    else sections.push('<div class="banner" role="note">' + icon('clock') + '<p class="banner__t"><b>Тренер готовит план</b> на следующую неделю - тренировки появятся на «Сегодня».</p></div>');

    ui.page({ screen: 'finish', title: 'Итог тренировки', back: { href: 'today.html', label: 'Сегодня' }, band, body: `<div class="stack">${sections.join('')}</div>`,
      bar: `<a class="btn btn--primary btn--lg" href="${href('today.html')}">${icon('check')}Готово</a><a class="btn btn--shell btn--lg" href="${href('result.html', { w: w.id })}">Результат</a>` });
    document.body.classList.add('is-done');
  }

  // ---------- Вопросы после тренировки ----------
  function questions() {
    const done = plannedDone();
    const partial = done < total;
    const meta = partial
      ? `<p>Сделано <b>${done} из ${total}</b> ${fmt.plural(total, SETS_OF)}. Сохраним как «выполнена частично» - тренер увидит, что сделано.</p>
         <div class="end-acts"><a class="btn btn--shell" href="${href('session.html', { w: w.id })}">${icon('chevL')}Вернуться к тренировке</a><button class="btn btn--shell" type="button" data-rest-plan>${icon('check')}Сделал всё - остальные как в плане</button></div>`
      : `<p>Все ${total} ${fmt.plural(total, SETS)} отмечены. Ответы - по желанию: можно сразу завершить.</p>`;
    const band = head(titleLine, 'Как прошло?', meta);
    ui.page({ screen: 'finish', title: 'Завершение тренировки', back: { href: `session.html?w=${w.id}`, label: 'Тренировка' }, band,
      body: `<div class="stack" id="end-q"><p class="muted end-lead">Четыре вопроса, всё можно пропустить. Тренеру это помогает решить, прибавлять ли вес.</p>${questionsHtml()}</div>`,
      bar: `<button class="btn btn--primary btn--lg" type="button" data-complete>${icon('flag')}Завершить тренировку</button>` });
    bindQuestions(document.getElementById('end-q'));
    document.querySelector('[data-complete]').addEventListener('click', () => complete({}));
    const rp = document.querySelector('[data-rest-plan]');
    if (rp) rp.addEventListener('click', () => {
      // Сделали всё, но не отметили: оставшиеся подходы плана - как в плане (те же значения, что «Как в плане»)
      for (const x of flat) x.el.sets.forEach((sp, i) => {
        if (recOf(x.el, sp)) return;
        const id = `sr_${x.el.id.slice(3)}_${i + 1}`;
        run.sets[id] = { id, workoutId: w.id, elementId: x.el.id, exerciseId: x.el.exerciseId, setPlanId: sp.id, values: q.planValues(sp), done: true, recordedAt: RUN.now(), recordedBy: 'client' };
      });
      RUN.save(); RUN.apply(q.db, w.id);
      location.reload();
    });
  }

  // ---------- Ничего не отмечено ----------
  function nothing() {
    ui.page({ screen: 'finish', title: 'Завершение тренировки', back: { href: `session.html?w=${w.id}`, label: 'Тренировка' },
      band: head(titleLine, 'Ничего не отмечено', '<p>Если тренировка была - отметьте её по плану одним касанием. Не получилось - так и скажите, причину можно не писать.</p>'),
      body: `<div class="stack"><div class="banner" role="note">${icon('clock')}<p class="banner__t"><b>Подходы ещё не отмечены.</b> Можно вернуться к тренировке и отмечать по ходу - отметки сохраняются сразу.</p></div><a class="btn btn--soft btn--lg btn--block" href="${href('session.html', { w: w.id })}">${icon('play')}Вернуться к тренировке</a></div>`,
      bar: `<a class="btn btn--primary btn--lg" href="${href('finish.html', { w: w.id, mode: 'mark' })}">${icon('check')}Отметить, что сделал</a><a class="btn btn--shell btn--lg" href="${href('plan.html', { w: w.id, miss: 1 })}">Пропустил</a>` });
  }

  // ---------- «Отметить, что сделал»: план подставлен целиком, правка - по упражнению ----------
  function markMode() {
    // Черновик: по упражнению - сделано или нет и значения подходов (если поправили)
    const M = U.mark || (U.mark = Object.fromEntries(flat.map((x) => [x.el.id, { on: true, sets: x.el.sets.map((sp) => q.planValues(sp)), open: false }])));
    const changed = () => flat.some((x) => { const m = M[x.el.id]; return !m.on || m.sets.some((v, i) => ORDER.some((k) => v[k] !== q.planValues(x.el.sets[i])[k])); });
    const setsText = (x) => { const m = M[x.el.id]; return fmt.setsText(m.sets.filter((_, i) => x.el.sets[i].type !== 'warmup')) + (x.el.perSide ? ' на сторону' : ''); };
    const row = (x) => {
      const m = M[x.el.id];
      const edit = m.open ? `<div class="end-edit">${x.el.sets.map((sp, i) => `<div class="end-set"><span class="label">Подход ${i + 1}${sp.type === 'warmup' ? ' · разминочный' : ''}</span>${ORDER.filter((k) => m.sets[i][k] != null).map((k) => `<div class="end-step"><span class="small muted">${{ weight: 'Вес', reps: 'Повторы', duration: 'Время', distance: 'Дистанция' }[k]}</span><div class="lb-step" role="group" aria-label="${{ weight: 'Вес', reps: 'Повторы', duration: 'Время', distance: 'Дистанция' }[k]}, подход ${i + 1}"><button type="button" data-st="${x.el.id}|${i}|${k}|-1" aria-label="Минус"${m.sets[i][k] - STEP[k] < MIN[k] ? ' disabled' : ''}>${icon('minus')}</button><output>${k === 'weight' ? fmt.num(m.sets[i][k]) : m.sets[i][k]} <small>${UNIT[k]}</small></output><button type="button" data-st="${x.el.id}|${i}|${k}|1" aria-label="Плюс">${icon('plus')}</button></div></div>`).join('')}</div>`).join('')}</div>` : '';
      return `<li class="end-ex${m.on ? '' : ' is-off'}">
        <div class="end-ex__row">
          <button class="end-ex__chk" type="button" role="checkbox" aria-checked="${m.on}" data-tg="${x.el.id}" aria-label="${esc(q.name(x.el.exerciseId))}: сделано"><span class="cbox">${icon('check')}</span></button>
          <div class="end-ex__b"><span class="end-ex__n">${x.label ? `<span class="grp">${x.label}</span>` : ''}<span class="end-name">${esc(q.name(x.el.exerciseId))}</span></span><span class="small muted num">${m.on ? setsText(x) : 'не сделано'}</span></div>
          ${m.on ? `<button class="btn btn--ghost end-ex__fix" type="button" data-op="${x.el.id}" aria-expanded="${m.open}">${m.open ? 'Готово' : 'Поправить'}</button>` : ''}
        </div>${m.on ? edit : ''}
      </li>`;
    };
    const ROLE = { warmup: 'Разминка', main: 'Основная часть', cooldown: 'Заминка', recovery: 'Восстановление' };
    const list = () => {
      let html = '', last = null;
      for (const x of flat) {
        if (x.role !== last) { if (last) html += '</ol></section>'; html += `<section class="sec"><div class="sec-h"><h2 class="label sec-h__title">${ROLE[x.role]}</h2></div><ol class="end-list">`; last = x.role; }
        html += row(x);
      }
      return `${html}</ol></section>`;
    };
    const date = w.schedule.date;
    ui.page({ screen: 'finish', title: 'Отметить, что сделал', back: { href: `workout.html?w=${w.id}`, label: 'Обзор' },
      band: head(`${fmt.dateCap(date)} · ${q.formatWord(w)}`, 'Отметить, что сделал', `<p>${titleLine}. План подставлен - поправьте, если было иначе. Отметим на ${fmt.date(date)}, день по плану.</p>`),
      body: `<div class="stack"><div id="end-mark">${list()}</div>
        <details class="end-more"${U.markMore ? ' open' : ''}><summary class="btn btn--soft btn--block">${icon('plus')}Добавить: тяжесть, самочувствие, боль, комментарий</summary><div class="stack" id="end-q">${questionsHtml()}</div></details></div>`,
      bar: '<button class="btn btn--primary btn--lg" type="button" data-markall></button>' });
    const btn = document.querySelector('[data-markall]');
    const label = () => { btn.innerHTML = `${icon('check')}${changed() ? 'Отметить' : 'Отметить как в плане'}`; };
    label();
    bindQuestions(document.getElementById('end-q'));
    document.querySelector('.end-more').addEventListener('toggle', (e) => { U.markMore = e.target.open; RUN.save(); });
    const box = document.getElementById('end-mark');
    const redraw = (focusSel) => { box.innerHTML = list(); label(); RUN.save(); if (focusSel) { const f = box.querySelector(focusSel); if (f) f.focus(); } };
    box.addEventListener('click', (e) => {
      const tg = e.target.closest('[data-tg]'), op = e.target.closest('[data-op]'), st = e.target.closest('[data-st]');
      if (tg) { const m = M[tg.dataset.tg]; m.on = !m.on; m.open = false; redraw(`[data-tg="${tg.dataset.tg}"]`); }
      else if (op) { const m = M[op.dataset.op]; m.open = !m.open; redraw(`[data-op="${op.dataset.op}"]`); }
      else if (st) {
        const [id, i, k, d] = st.dataset.st.split('|');
        const v = M[id].sets[Number(i)];
        v[k] = Math.max(MIN[k], Math.round((v[k] + Number(d) * STEP[k]) * 10) / 10);
        redraw(`[data-st="${st.dataset.st}"]`);
      }
    });
    btn.addEventListener('click', () => {
      // Факт одним действием: сделанные упражнения - подходами из черновика, несделанные - done: false
      for (const x of flat) {
        const m = M[x.el.id];
        x.el.sets.forEach((sp, i) => {
          const id = `sr_${x.el.id.slice(3)}_${i + 1}`;
          run.sets[id] = { id, workoutId: w.id, elementId: x.el.id, exerciseId: x.el.exerciseId, setPlanId: sp.id, values: m.on ? { ...m.sets[i] } : q.planValues(sp), done: m.on, recordedAt: RUN.now(), recordedBy: 'client' };
        });
      }
      U.mark = null;
      RUN.apply(q.db, w.id);
      complete({ completedAt: `${date}T12:00:00+03:00` });
    });
  }

  // ---------- Что показать ----------
  if (finishedHere && P.get('step') === 'done') summary();
  else if (finishedHere) location.replace(href('finish.html', { w: w.id, step: 'done', ...(mode === 'mark' ? { mode: 'mark' } : {}) }));
  else if (closedBefore || q.archived() || byTrainer) {
    const word = byTrainer ? `Тренировку завершит ${esc(T.name)}` : q.archived() ? 'Новых тренировок нет' : 'Тренировка уже отмечена';
    const text = byTrainer ? `Подходы отмечает тренер - он и завершит тренировку. Исправить отметки можно после, до конца дня.` : q.archived() ? `${esc(T.name)} отключил вас - история и прогресс на чтение.` : 'Повторно отмечать не нужно: результат и ответы тренера - на «Результате».';
    ui.page({ screen: 'finish', title: 'Завершение', back: { href: 'today.html', label: 'Сегодня' }, band: head(titleLine, word),
      body: `<div class="stack"><div class="banner" role="note">${icon(byTrainer ? 'user' : 'done')}<p class="banner__t">${text}</p></div></div>`,
      bar: closedBefore ? `<a class="btn btn--lg" href="${href('result.html', { w: w.id })}">Результат</a>` : null });
  } else if (mode === 'mark') markMode();
  else if (!anyDone()) nothing();
  else questions();
})();
