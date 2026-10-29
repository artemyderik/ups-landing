// «Выполнение тренировки» - главный экран клиента, режим зала (DESIGN.md 5.5; правила - BEHAVIOR.md 5.6).
// ?w=<id> - тренировка (без параметра - сегодняшняя, иначе ближайшая); &from=N - «Продолжить с упражнения N»;
// &step=rest - открыть с запущенным отдыхом (просмотр состояния). Отметки клиента - parts/session.data.js (APS.run):
// переход в «Упражнение» и обратно, перезагрузка и «нет сети» их не теряют.
(() => {
  const { q, fmt, esc, ui, kit } = APS;
  const RUN = APS.run;
  const { icon, href } = ui;
  const P = new URLSearchParams(location.search);
  const OFF = P.get('net') === 'off';
  const T = q.db.trainer;
  const ROLE = { warmup: 'разминка', main: 'основная часть', cooldown: 'заминка', recovery: 'восстановление' };
  const UNIT = { weight: 'кг', reps: 'повт.', duration: 'с', distance: 'м' };
  const STEP = { weight: 2.5, reps: 1, duration: 5, distance: 5 };
  const MIN = { weight: 0, reps: 1, duration: 5, distance: 5 };
  const NAME = { weight: 'Вес', reps: 'Повторы', duration: 'Время', distance: 'Дистанция' };
  const ORDER = ['weight', 'reps', 'duration', 'distance'];
  const cnt = (n, f) => fmt.count(n, f);
  const SETS_OF = ['подхода', 'подходов', 'подходов'];   // «из 1 подхода», «из 32 подходов»
  const MARKS = ['отметка', 'отметки', 'отметок'];

  const w = q.workout(P.get('w')) || q.todayWorkout() || q.next();

  // ---------- Тренировки нет: клиент отключён или план закончился ----------
  if (!w) {
    document.body.classList.add('is-empty');
    const off = q.archived();
    ui.page({ screen: 'session', title: 'Выполнение тренировки', back: { href: 'today.html', label: 'Сегодня' },
      band: `<p class="label band__eyebrow">Выполнение тренировки</p><h1 class="band__title">${off ? 'Новых тренировок нет' : 'Тренировок пока нет'}</h1>`,
      body: `<div class="st__empty">${ui.cat('cat-happy', 144)}<div><h3>${off ? `${esc(q.db.trainer.name)} отключил вас` : 'Тренер готовит план'}</h3><p>${off ? 'История и прогресс остаются у вас - на чтение.' : 'Как только тренер назначит тренировку, она появится на «Сегодня».'}</p></div><a class="btn btn--dark" href="${href('today.html')}">На «Сегодня»</a></div>` });
    return;
  }

  const flat = q.flat(w);
  const run = RUN.ensure(w.id);
  const U = run.ui;
  const r0 = q.result(w.id);
  const byTrainer = !!(r0 && r0.source === 'trainer' && r0.status === 'inProgress');
  const st0 = q.status(w);
  const closed = ['completed', 'partial', 'missed'].includes(st0);
  const readOnly = byTrainer || closed || q.archived();

  // ---------- Подходы и их состояние ----------
  const recs = (el) => q.sets(w.id, el.id);
  const recOf = (el, sp) => recs(el).find((s) => s.setPlanId === sp.id) || null;
  const extras = (el) => recs(el).filter((s) => !s.setPlanId);
  const pendingIdx = (el) => el.sets.findIndex((sp) => !recOf(el, sp));
  const settled = (el) => pendingIdx(el) < 0;
  const doneOf = (el) => el.sets.filter((sp) => { const r = recOf(el, sp); return r && r.done; }).length;
  const missOf = (el) => el.sets.filter((sp) => { const r = recOf(el, sp); return r && !r.done; }).length;
  const metricsOf = (v) => ORDER.filter((k) => v[k] != null);
  const same = (a, b) => ORDER.every((k) => (a[k] ?? null) === (b[k] ?? null));
  const plannedTotal = q.setCount(w);
  const plannedDone = () => flat.reduce((a, x) => a + doneOf(x.el), 0);
  const X = () => flat[Math.min(Math.max(cur, 1), flat.length) - 1];
  const itemsOf = (b) => flat.filter((f) => f.block === b);
  const recId = (el, i) => `sr_${el.id.slice(3)}_${i + 1}`;

  // С какого упражнения: «Продолжить с упражнения N» → место, где остановились → первое неотмеченное
  let cur = Number(P.get('from')) || U.cur || q.resumeAt(w);
  if (P.get('from')) { U.edit = null; U.cur = cur; RUN.save(); history.replaceState(null, '', href('session.html', { w: w.id })); }
  cur = Math.min(Math.max(cur, 1), flat.length);

  // Подстановка в текущий подход: план; вес - как в прошлом подходе, если там вес был не по плану (BEHAVIOR.md 5.6).
  // Только между подходами одного типа: сниженный разминочный вес в рабочий не переносится (ревью 2026-10-28)
  function prefill(el, i) {
    const sp = el.sets[i];
    const v = { ...q.planValues(sp) };
    let carried = false;
    if (i > 0 && v.weight != null && (el.sets[i - 1].type === 'warmup') === (sp.type === 'warmup')) {
      const prevSp = el.sets[i - 1], prev = recOf(el, prevSp);
      const pw = q.planValues(prevSp).weight;
      if (prev && prev.done && prev.values.weight != null && prev.values.weight !== pw && prev.values.weight !== v.weight) { v.weight = prev.values.weight; carried = true; }
    }
    return { values: v, plan: q.planValues(sp), carried };
  }
  // Что сейчас вносим: правка отмеченного, подход сверх плана или первый неотмеченный
  function target(el) {
    if (readOnly) return null;
    if (U.edit && U.edit.elId === el.id) {
      const i = U.edit.idx;
      const plan = i === 'x' ? {} : q.planValues(el.sets[i]);
      return { i, values: U.edit.values, plan, carried: false, fix: i !== 'x' && !!recOf(el, el.sets[i]), extra: i === 'x' };
    }
    const i = pendingIdx(el);
    if (i < 0) return null;
    return { i, ...prefill(el, i), fix: false, extra: false };
  }

  // «Прошлый раз» того же рабочего подхода (разминочные не сравниваем)
  const LAST = Object.fromEntries(flat.map((x) => [x.el.id, q.lastTime(x.el.exerciseId, q.today)]));
  function prevFor(el, i) {
    const lt = LAST[el.id];
    if (!lt || i === 'x' || el.sets[i].type === 'warmup') return null;
    const wi = el.sets.slice(0, i).filter((s) => s.type !== 'warmup').length;
    const lel = lt.workout.blocks.flatMap((b) => b.elements).find((e) => e.exerciseId === el.exerciseId);
    const rs = lel.sets.filter((s) => s.type !== 'warmup').map((s) => lt.sets.find((r) => r.setPlanId === s.id)).filter(Boolean);
    return rs[wi] ? kit.valText(kit.noRpe(rs[wi].values)) : null;
  }

  // ---------- Запись: сохранить на телефоне и в db, статус сохранения ----------
  function ensureStarted() {
    if (q.result(w.id)) return;
    run.result = { workoutId: w.id, source: 'client', startedAt: RUN.now(), status: 'inProgress', attachments: [] };
  }
  function commit(kind) {
    if (OFF && kind !== 'ui') run.pending = (run.pending || 0) + 1;
    if (kind !== 'ui') U.savedAt = RUN.now();
    U.cur = cur;
    RUN.save();
    RUN.apply(q.db, w.id);
    if (kind !== 'ui') syncShow(true);
  }
  function putSet(el, i, values, done = true) {
    const sp = i === 'x' ? null : el.sets[i];
    const id = sp ? recId(el, i) : `sr_${el.id.slice(3)}_x${extras(el).length + 1}`;
    const old = q.db.setResults.find((s) => s.id === id);
    const keepRpe = old && old.values.rpe != null ? { rpe: old.values.rpe } : {};
    const rec = { id, workoutId: w.id, elementId: el.id, exerciseId: el.exerciseId, ...(sp ? { setPlanId: sp.id } : {}), values: { ...values, ...keepRpe }, done, recordedAt: RUN.now(), recordedBy: 'client' };
    run.sets[id] = rec;
    return rec;
  }

  // ---------- Отдых ----------
  let restTick = null;
  function startRest(sec) { if (!sec) return; U.rest = { end: Date.now() + sec * 1000, total: sec, done: false }; }
  function restLeft() { return U.rest ? Math.max(0, Math.ceil((U.rest.end - Date.now()) / 1000)) : 0; }
  function restHtml() {
    if (!U.rest) return '';
    const left = restLeft(), C = 135.1, frac = U.rest.total ? left / U.rest.total : 0;
    const over = left === 0;
    return `<div class="rest" role="timer" aria-live="off" aria-label="${over ? 'Отдых закончился' : `Отдых ${fmt.rest(left)} из ${fmt.rest(U.rest.total)}`}" id="ses-rest">
      <svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21.5" stroke="var(--shell-line)"/><circle class="ring__v" cx="24" cy="24" r="21.5" stroke="var(--accent)" stroke-linecap="round" stroke-dasharray="${(over ? C : C * frac).toFixed(1)} ${C}"/></svg>
      <div><p class="rest__t">${over ? 'Вперёд' : fmt.rest(left)}</p><p class="rest__l">${over ? 'отдых закончился' : `отдых из ${fmt.rest(U.rest.total)}`}</p></div>
      <button class="btn btn--shell" type="button" data-act="rest-skip" data-k="rest-skip">${over ? icon('close') : icon('skip')}${over ? 'Скрыть' : 'Пропустить'}</button>
    </div>`;
  }
  function tick() {
    const el = document.getElementById('ses-rest');
    if (!U.rest || !el) return;
    const left = restLeft();
    const mr = document.getElementById('ses-mini-rest');
    if (left === 0 && !U.rest.done) {
      U.rest.done = true; commit('ui');
      if (navigator.vibrate) try { navigator.vibrate([60, 40, 60]); } catch (e) { /* нет вибрации */ }
      el.outerHTML = restHtml();
      if (mr) mr.innerHTML = miniRest();
      observe();
      return;
    }
    if (left === 0) return;
    const C = 135.1, c = 50.3;
    el.querySelector('.rest__t').textContent = fmt.rest(left);
    el.querySelector('.ring__v').setAttribute('stroke-dasharray', `${(C * left / U.rest.total).toFixed(1)} ${C}`);
    el.setAttribute('aria-label', `Отдых ${fmt.rest(left)} из ${fmt.rest(U.rest.total)}`);
    if (mr && mr.firstElementChild) {
      mr.querySelector('.ses-mini__time').textContent = fmt.rest(left);
      mr.querySelector('.ring__v').setAttribute('stroke-dasharray', `${(c * left / U.rest.total).toFixed(1)} ${c}`);
      mr.querySelector('.ses-mini__skip').setAttribute('aria-label', `Пропустить отдых, осталось ${fmt.rest(left)}`);
    }
  }

  // ---------- Колбаски: одна на упражнение, текущая заполняется по подходам (DESIGN.md 5.5, BEHAVIOR.md 5.6) ----------
  // Сделанное - сплошная; текущее - лайм долей отмеченных; оставленное на середине - та же доля, не лаймом;
  // «не сделано» - контур без заливки (отличается формой), сделанная часть - заливкой; впереди - пустая
  function segsHtml() {
    return flat.map((f) => {
      const n = f.el.sets.length, d = doneOf(f.el), miss = settled(f.el) && missOf(f.el) > 0;
      const cls = [miss ? 'is-miss' : d === n ? (f.n === cur ? 'is-now' : 'is-done') : f.n === cur ? 'is-now' : d ? 'is-part' : '', f.n === cur && miss ? 'is-cur' : ''].filter(Boolean).join(' ');
      return `<span class="${cls}" style="--f:${Math.round((d / n) * 100)}%"></span>`;
    }).join('');
  }
  const segsLabel = () => { const x = X(); return `Упражнение ${x.n} из ${flat.length}: сделано подходов ${doneOf(x.el)} из ${x.el.sets.length}. Сделано упражнений ${flat.filter((f) => settled(f.el)).length} из ${flat.length}`; };

  // ---------- Полоса: место, имя, план ----------
  function head() {
    const x = X(), el = x.el;
    const restTxt = x.group ? (x.block.restAfterRoundSec ? `${fmt.NBSP}· отдых после круга${fmt.NBSP}${fmt.rest(x.block.restAfterRoundSec)}` : '') : el.restSec ? `${fmt.NBSP}· отдых${fmt.NBSP}${fmt.rest(el.restSec)}` : '';
    return `<div class="ses-pos">
        <p class="label band__eyebrow">Упражнение ${x.n} из ${flat.length} · ${ROLE[x.role]}</p>
        <div class="ses-pos__nav">
          <button class="btn btn--shell btn--icon" type="button" data-act="go" data-n="${x.n - 1}" data-k="prev" aria-label="Предыдущее упражнение"${x.n === 1 ? ' disabled' : ''}>${icon('chevL')}</button>
          <button class="btn btn--shell btn--icon" type="button" data-act="go" data-n="${x.n + 1}" data-k="next" aria-label="Следующее упражнение"${x.n === flat.length ? ' disabled' : ''}>${icon('chevR')}</button>
        </div>
      </div>
      <h1 class="band__title ses-name">${esc(q.name(el.exerciseId))}</h1>
      <p class="band__meta ses-plan">План: <b class="num">${q.planText(el)}</b>${restTxt}</p>`;
  }

  // ---------- Пульт ----------
  function statusBanner() {
    if (q.archived()) return `<div class="banner" role="status">${icon('history')}<p class="banner__t"><b>${esc(q.db.trainer.name)} отключил вас</b> · новых тренировок нет, история - на чтение.</p></div>`;
    if (byTrainer) return `<div class="banner" role="status">${icon('user')}<p class="banner__t"><b>Подходы отмечает ${esc(T.name)}</b> · ${q.doneSetCount(w)}${fmt.NBSP}из${fmt.NBSP}${plannedTotal}. Отметки появляются здесь сразу, исправить их можно после тренировки.</p></div>`;
    if (closed) {
      const r = q.result(w.id);
      const word = st0 === 'missed' ? 'Пропущена' : st0 === 'partial' ? 'Выполнена частично' : 'Выполнена';
      return `<div class="banner" role="status">${icon(st0 === 'missed' ? 'missed' : 'done')}<p class="banner__t"><b>${word}</b> · ${fmt.date(q.date(w))}${r && r.source === 'trainer' ? ' · внёс тренер' : ''}. Отметки - на «Результате».</p></div>`;
    }
    return '';
  }

  function groupBox(x) {
    if (!x.group) return '';
    const items = itemsOf(x.block);
    const rounds = Math.max(...items.map((it) => it.el.sets.length));
    const pi = pendingIdx(x.el);
    const round = pi < 0 ? rounds : pi + 1;
    return `<div class="ses-grp">
      <p class="ses-grp__h"><span class="tag tag--lime">${q.groupName(x.block)} ${x.group}</span><span>круг ${round} из ${rounds} · по очереди ${items.map((it) => it.label).join(' → ')}</span></p>
      <ol class="ses-q">${items.map((it) => `<li class="${it.n === x.n ? 'is-now' : ''}"${it.n === x.n ? ' aria-current="step"' : ''}><span class="grp">${it.label}</span><span>${esc(q.name(it.el.exerciseId))}</span><span class="small num">${doneOf(it.el)} из ${it.el.sets.length}</span></li>`).join('')}</ol>
    </div>`;
  }

  function notesBox(el) {
    return q.clientNotes(el.notes).map((n) => `<div class="ses-note"><span class="ava ava--light ava--s" aria-hidden="true">${esc(T.initials)}</span><div class="ses-note__b small"><span class="sr-only">Заметка тренера: </span>${q.rich(n.body)}</div></div>`).join('');
  }

  function painOf(el) { const r = q.result(w.id); return r && r.pain && r.pain.elementId === el.id ? r.pain : null; }
  function flagsBox(el) {
    const out = [];
    const p = painOf(el);
    if (p) out.push(`<div class="ses-flag"><span class="pain-mark">${icon('sig-pain')}<span><b>Больно ${p.level}/10</b>${p.note ? ` · ${esc(p.note)}` : ''}</span></span>${readOnly ? '' : `<button class="ses-flag__act" type="button" data-act="pain" data-k="pain-edit">Изменить</button>`}</div>`);
    const sk = (U.skip || {})[el.id];
    if (sk) out.push(`<div class="ses-flag"><p>${icon('notdone')}<span><b>Не сделано</b>${sk.reason ? ` · ${esc(sk.reason.toLowerCase())}` : ''}${doneOf(el) ? ` · сделано ${doneOf(el)} из ${el.sets.length}` : ''}</span></p>${readOnly ? '' : `<button class="ses-flag__act" type="button" data-act="unskip" data-k="unskip">Вернуть</button>`}</div>`);
    for (const c of q.comments(w.id).filter((c) => c.elementId === el.id && !(sk && sk.commentId === c.id))) {
      const me = c.author === 'client';
      out.push(`<div class="ses-flag"><p>${icon(me ? 'sig-question' : 'reply')}<span><b>${me ? 'Вы' : esc(T.name.split(' ')[0])}:</b> «${esc(c.body)}»${me ? ` <span class="muted">· ${OFF && run.comments.some((x) => x.id === c.id) ? 'отправится, когда появится сеть' : 'ответ придёт сюда и на «Сегодня»'}</span>` : ''}</span></p></div>`);
    }
    return out.join('');
  }

  function actsBox(x) {
    const tech = `<a class="ses-act" href="${href('exercise.html', { ex: x.el.exerciseId, w: w.id, el: x.el.id, back: 'session' })}" data-k="howto">${icon('howto')}<span>Техника</span></a>`;
    if (readOnly) return `<div class="ses-acts ses-acts--one">${tech}</div>`;
    return `<div class="ses-acts">${tech}
      <button class="ses-act" type="button" data-act="pain" data-k="pain" aria-label="Больно или неприятно">${icon('sig-pain')}<span>Больно</span></button>
      <button class="ses-act" type="button" data-act="ask" data-k="ask" aria-label="Вопрос тренеру">${icon('sig-question')}<span>Вопрос</span></button>
      <button class="ses-act" type="button" data-act="skip" data-k="skip" aria-label="Не сделал упражнение"${settled(x.el) ? ' disabled' : ''}>${icon('notdone')}<span>Не сделал</span></button>
    </div>`;
  }

  function effBox(rec, label) {
    return kit.effHtml({ key: rec.id, label: `Усилие: ${label}`, value: rec.values.rpe ?? null, skip: true, card: true });
  }

  function stepper(m, v, plan) {
    const val = v[m];
    const atMin = val - STEP[m] < MIN[m];
    const show = m === 'weight' ? fmt.num(val) : String(val);
    const d = m === 'weight' ? '2,5' : String(STEP[m]);
    const unitWord = { weight: 'кг', reps: 'повтор', duration: 'секунд', distance: 'метров' }[m];
    const off = plan[m] != null && plan[m] !== val;
    return `<div class="stepper" role="group" aria-label="${NAME[m]}">
      <button class="step" type="button" data-act="step" data-m="${m}" data-d="-1" data-k="step-${m}-minus" aria-label="Минус ${d} ${unitWord}"${atMin ? ' disabled' : ''}>${icon('minus')}<span class="step__d" aria-hidden="true">−${d}</span></button>
      <p class="stepper__v" aria-live="polite"><span><b>${show}</b><span>${UNIT[m]}</span></span>${off ? `<small>по плану ${m === 'weight' ? fmt.num(plan[m]) : plan[m]}</small>` : ''}</p>
      <button class="step" type="button" data-act="step" data-m="${m}" data-d="1" data-k="step-${m}-plus" aria-label="Плюс ${d} ${unitWord}">${icon('plus')}<span class="step__d" aria-hidden="true">+${d}</span></button>
    </div>`;
  }

  function ctlBox(x, t) {
    const el = x.el;
    const n = el.sets.length;
    const warm = t.i !== 'x' && el.sets[t.i].type === 'warmup';
    const head = t.extra ? 'Подход сверх плана' : t.fix ? `Исправить подход ${t.i + 1}` : `Подход ${t.i + 1} из ${n}`;
    const prev = prevFor(el, t.i);
    const hint = [warm ? 'разминочный' : '', el.perSide ? 'на сторону' : '', t.carried ? 'вес как в прошлом подходе' : prev ? `в прошлый раз ${prev}` : ''].filter(Boolean).join(' · ');
    return `<div class="ctl" id="ses-ctl" aria-label="${head}">
      <div class="ctl__h"><span class="label"><span class="pset__n" aria-hidden="true">${t.extra ? '+' : t.i + 1}</span>${head}</span>${hint ? `<span class="small num">${hint}</span>` : ''}</div>
      <div class="steppers">${metricsOf(t.values).map((m) => stepper(m, t.values, t.plan)).join('')}</div>
      ${t.fix || t.extra ? `<div class="ctl__foot"><button class="btn btn--shell" type="button" data-act="edit-cancel" data-k="edit-cancel">Отмена</button></div>` : ''}
    </div>`;
  }

  function setsBox(x) {
    const el = x.el;
    const t = target(el);
    const lt = LAST[el.id];
    const rows = [];
    let restPlaced = false;
    const placeRest = () => { if (!restPlaced && U.rest) { rows.push(`<li>${restHtml()}</li>`); restPlaced = true; } };
    el.sets.forEach((sp, i) => {
      const rec = recOf(el, sp);
      const warm = sp.type === 'warmup' ? '<small>разминочный</small>' : '';
      if (t && t.i === i) { placeRest(); rows.push(`<li>${ctlBox(x, t)}</li>`); return; }
      if (rec && rec.done) {
        const v = kit.valText(kit.noRpe(rec.values));
        const who = rec.recordedBy === 'trainer' ? 'отметил тренер' : 'отмечен';
        const row = readOnly
          ? `<div class="pset pset--done"><span class="pset__n">${i + 1}</span><span class="pset__v">${v}${warm}</span><span class="pset__s">${icon('done')}${who}</span></div>`
          : `<button class="pset pset--done" type="button" data-act="fix" data-i="${i}" data-k="fix-${i}" aria-label="Подход ${i + 1}: ${v}, отмечен. Исправить"><span class="pset__n">${i + 1}</span><span class="pset__v">${v}${warm}</span><span class="pset__s">${icon('done')}${who}</span></button>`;
        let eff = '';
        if (!readOnly && U.eff === rec.id) eff = `<div class="pset__effbox">${effBox(rec, `подход ${i + 1}`)}</div>`;
        else if (rec.values.rpe != null) eff = readOnly ? `<p class="pset__eff">${icon('flame')}<span>${esc(kit.EFFORT[rec.values.rpe])}</span></p>` : `<button class="pset__eff" type="button" data-act="eff-open" data-id="${rec.id}" data-k="eff-${rec.id}" aria-label="Усилие: ${esc(kit.EFFORT[rec.values.rpe])}. Изменить">${icon('flame')}<span>${esc(kit.EFFORT[rec.values.rpe])}</span></button>`;
        rows.push(`<li>${row}${eff}</li>`);
        return;
      }
      if (rec && !rec.done) { rows.push(`<li><div class="pset pset--miss"><span class="pset__n">${i + 1}</span><span class="pset__v">${kit.valText(q.planValues(sp))}${warm}</span><span class="pset__s">не сделан</span></div></li>`); return; }
      rows.push(`<li><div class="pset pset--plan"><span class="pset__n">${i + 1}</span><span class="pset__v">${kit.valText(q.planValues(sp))}${warm}</span><span class="pset__s">план</span></div></li>`);
    });
    extras(el).forEach((rec, k) => {
      const v = kit.valText(kit.noRpe(rec.values));
      rows.push(`<li><div class="pset pset--done"><span class="pset__n">+${k + 1}</span><span class="pset__v">${v}<small>сверх плана</small></span><span class="pset__s">${icon('done')}отмечен</span></div></li>`);
    });
    if (t && t.extra) { placeRest(); rows.push(`<li>${ctlBox(x, t)}</li>`); }
    placeRest();
    const done = doneOf(el), n = el.sets.length;
    const allDone = settled(el) && !t;
    // Чужое усилие: в группе отмечен последний подход A1, текущим стал A2 - бегунок A1 над подходами
    let effx = '';
    if (!readOnly && U.eff) {
      const rec = q.db.setResults.find((s) => s.id === U.eff);
      if (rec && rec.elementId !== el.id) {
        const fx = flat.find((f) => f.el.id === rec.elementId);
        const i = fx.el.sets.findIndex((sp) => sp.id === rec.setPlanId);
        effx = `<div class="ses-effx"><p><b>${fx.label ? `${fx.label} · ` : ''}${esc(q.name(fx.el.exerciseId))}</b>, подход ${i + 1}</p>${effBox(rec, `${q.name(fx.el.exerciseId)}, подход ${i + 1}`)}</div>`;
      }
    }
    return `<section class="ses-sets" aria-labelledby="h-sets">
      <div class="ses-sets__h"><h2 class="label" id="h-sets">Подходы</h2><span class="small num">${done} из ${n}${missOf(el) ? ` · не сделано ${missOf(el)}` : ''}</span></div>
      ${lt ? `<p class="ses-last">${icon('history')}<span>Прошлый раз · ${fmt.date(lt.date)}: <b class="num">${lt.text}</b></span></p>` : ''}
      ${effx}
      <ol class="psets">${rows.join('')}</ol>
      ${allDone && !readOnly && !(U.skip || {})[el.id] ? `<p class="ses-done">${icon('done')}Упражнение сделано</p>` : ''}
      ${!readOnly && !(t && t.extra) && !(U.skip || {})[el.id] ? `<button class="btn btn--shell ses-extra" type="button" data-act="extra" data-k="extra">${icon('plus')}Подход сверх плана</button>` : ''}
    </section>`;
  }

  function allBox() {
    let html = '';
    let i = 0;
    const row = (x) => {
      const el = x.el, n = el.sets.length, d = doneOf(el), m = missOf(el);
      const isNow = x.n === cur;
      const pi = pendingIdx(el);
      const right = settled(el) && d === n ? `<span class="status">${icon('done')}Готово</span>`
        : settled(el) && m ? `<span class="status status--muted">${icon('notdone')}не сделано</span>`
        : `<span class="qx__dots" aria-hidden="true">${el.sets.map((sp, k) => { const r = recOf(el, sp); return `<span class="${r && r.done ? 'is-done' : isNow && k === pi ? 'is-now' : ''}"></span>`; }).join('')}</span>`;
      const pain = painOf(el) ? `<span class="pain-mark">${icon('sig-pain')}<span class="sr-only">больно</span></span>` : '';
      return `<li><button class="qx${isNow ? ' qx--now' : ''}" type="button" data-act="go" data-n="${x.n}" data-k="go-${x.n}"${isNow ? ' aria-current="step"' : ''} aria-label="Упражнение ${x.n}: ${esc(q.name(el.exerciseId))}, ${d} из ${n} подходов">
        <span class="qx__no">${x.label || x.n}</span>
        <span><span class="qx__n">${esc(q.name(el.exerciseId))}${pain}</span><span class="qx__p num">${q.planText(el)}</span></span>
        ${right}</button></li>`;
    };
    for (const b of w.blocks) {
      const items = flat.slice(i, i + b.elements.length); i += b.elements.length;
      if (items.length > 1) {
        const rounds = Math.max(...items.map((x) => x.el.sets.length));
        html += `<li class="qgrp"><div class="qgrp__h"><span class="tag tag--lime">${q.groupName(b)}</span><span>по очереди ${items.map((x) => x.label).join(' → ')}, ${cnt(rounds, ['круг', 'круга', 'кругов'])}</span></div><ol>${items.map(row).join('')}</ol></li>`;
      } else html += row(items[0]);
    }
    const doneEx = flat.filter((f) => settled(f.el)).length;
    return `<section class="ses-all" aria-labelledby="h-all">
      <div class="ses-all__h"><h2 class="label" id="h-all">Вся тренировка</h2><span class="small num">${doneEx} из ${flat.length} · ${plannedDone()} из ${cnt(plannedTotal, SETS_OF)}</span></div>
      <ol>${html}</ol>
    </section>`;
  }

  function endBox() {
    if (readOnly) return '';
    const all = plannedDone() === plannedTotal && flat.every((f) => settled(f.el));
    return `<div class="ses-end">
      <p>${OFF ? 'Нет сети - отметки на этом устройстве, отправятся сами. Ничего не потеряется.' : 'Отметки сохраняются сразу. Сделали не всё - тоже можно завершить, тренер увидит, что сделано.'}</p>
      ${all ? '' : `<a class="btn btn--shell btn--lg btn--block" href="${href('finish.html', { w: w.id })}" data-k="finish">${icon('flag')}Завершить тренировку</a>`}
    </div>`;
  }

  function pult() {
    const x = X();
    return `${statusBanner()}
      <div class="ses-top">${groupBox(x)}${notesBox(x.el)}${flagsBox(x.el)}${actsBox(x)}</div>
      ${setsBox(x)}
      ${allBox()}
      ${endBox()}`;
  }

  // ---------- Панель действий: одна главная кнопка ----------
  function nextUnsettled() {
    const x = X();
    const inGroup = x.group ? itemsOf(x.block).find((f) => !settled(f.el)) : null;   // сначала - своя группа
    if (inGroup) return inGroup;
    const after = flat.slice(cur).find((f) => !settled(f.el));
    return after || flat.slice(0, cur - 1).find((f) => !settled(f.el)) || null;
  }
  function bar() {
    if (q.archived()) return '<p class="assign-bar__note">История - на чтение</p>';
    if (byTrainer) return `<p class="assign-bar__note ses-bar__note">${icon('user', 'i--s')}Подходы отмечает ${esc(T.name)}</p>`;
    if (closed) return `<a class="btn btn--lg" href="${href('result.html', { w: w.id })}" data-k="result">Результат</a>`;
    const x = X(), t = target(x.el);
    if (t) {
      const isPlan = !t.fix && !t.extra && same(t.values, t.plan);
      const label = t.fix ? 'Сохранить подход' : isPlan ? 'Как в плане' : 'Отметить подход';
      return `<button class="btn btn--primary btn--plan" type="button" data-act="mark" data-k="mark">${icon('check')}<span>${label}<small class="num">${kit.valText(t.values)}${x.el.perSide ? ' на сторону' : ''}</small></span></button>`;
    }
    const nx = nextUnsettled();
    if (nx) return `<button class="btn btn--primary btn--plan" type="button" data-act="next" data-k="next-ex">${icon('arrowR')}<span>Дальше<small>${nx.label ? `${nx.label} · ` : `${nx.n} · `}${esc(q.name(nx.el.exerciseId))}</small></span></button>`;
    return `<a class="btn btn--primary btn--plan" href="${href('finish.html', { w: w.id })}" data-k="finish-main">${icon('flag')}<span>Завершить тренировку<small class="num">${plannedDone()} из ${cnt(plannedTotal, SETS_OF)}</small></span></a>`;
  }

  // ---------- Сохранение: «Сохраняем…» → «Сохранено · 08:14»; без сети - строка .capp-net с числом отметок ----------
  let syncTimer = null;
  function lastSavedTime() {
    if (U.savedAt) return fmt.time(U.savedAt);
    const rs = q.sets(w.id);
    return rs.length ? fmt.time(rs.reduce((a, b) => (a.recordedAt > b.recordedAt ? a : b)).recordedAt) : null;
  }
  function syncShow(busy) {
    if (OFF) {
      const n = run.pending || 0;
      const p = document.querySelector('.capp-net span');
      if (p) p.innerHTML = n ? `<b>Нет сети</b> · ${cnt(n, MARKS)} ${n === 1 ? 'сохранена' : 'сохранены'} на этом устройстве` : '<b>Нет сети</b> · отметки сохранятся на этом устройстве';
      return;
    }
    const box = document.getElementById('ses-sync');
    if (!box) return;
    clearTimeout(syncTimer);
    if (busy) {
      box.hidden = false;
      box.innerHTML = `${icon('saved')}<span>Сохраняем…</span>`;
      syncTimer = setTimeout(() => syncShow(false), 700);
      return;
    }
    const t = lastSavedTime();
    box.hidden = !t;
    if (t) box.innerHTML = `${icon('saved')}<span><b>${byTrainer ? 'Обновлено' : 'Сохранено'}</b> · ${t}</span>`;
  }

  // ---------- Прибитая шапка .ses-mini (DESIGN.md 5.5, BEHAVIOR.md 5.6) ----------
  // Вид экрана под узкую полосу: колбаски (прилипают сами), название и строка подхода, кнопки-иконки и пилюля отдыха.
  // Появляется, когда название целиком ушло за верх экрана; ряд иконок и пилюля въезжают по одной, когда их полные
  // версии целиком ушли под шапку (граница - нижний край шапки). Высота постоянная: скрытые части - visibility: hidden.
  const MINI_ACTS = !readOnly;   // «Подходы отмечает тренер» и только чтение - без ряда иконок
  // Чёрная полоса - только название; кнопки и таймер - без подложки под ней (от 600 px - в строке названия справа)
  const miniSkeleton = () => `<div class="ses-mini dark" id="ses-mini" role="region" aria-label="Текущее упражнение">
      <div class="ses-mini__bg" aria-hidden="true"></div>
      <button class="ses-mini__t" type="button" data-act="top" data-k="mini-top"><span class="ses-mini__name"></span><span class="ses-mini__sub"></span></button>
      ${MINI_ACTS ? '<div class="ses-mini__row"><div class="ses-mini__acts" id="ses-mini-acts"></div><div class="ses-mini__rest" id="ses-mini-rest" role="timer" hidden></div></div>' : ''}
    </div>`;
  function miniSub() {
    const x = X(), t = target(x.el), n = x.el.sets.length, pi = pendingIdx(x.el);
    const set = t ? (t.extra ? 'Подход сверх плана' : t.fix ? `Исправить подход ${t.i + 1}` : `Подход ${t.i + 1} из ${n}`)
      : pi >= 0 ? `Подход ${pi + 1} из ${n}` : missOf(x.el) ? 'Не сделано' : 'Упражнение сделано';
    return `${set} · упр.${fmt.NBSP}${x.n} из ${flat.length}`;
  }
  function miniActs() {
    const x = X();
    return `<a class="btn btn--shell btn--icon ses-tip" href="${href('exercise.html', { ex: x.el.exerciseId, w: w.id, el: x.el.id, back: 'session' })}" data-k="mini-howto" aria-label="Техника: как выполнять" data-tip="Техника">${icon('howto')}</a>
      <button class="btn btn--shell btn--icon ses-tip" type="button" data-act="pain" data-k="mini-pain" aria-label="Больно или неприятно" data-tip="Больно">${icon('sig-pain')}</button>
      <button class="btn btn--shell btn--icon ses-tip" type="button" data-act="ask" data-k="mini-ask" aria-label="Вопрос тренеру" data-tip="Вопрос тренеру">${icon('sig-question')}</button>
      <button class="btn btn--shell btn--icon ses-tip" type="button" data-act="skip" data-k="mini-skip" aria-label="Не сделал упражнение" data-tip="Не сделал"${settled(x.el) ? ' disabled' : ''}>${icon('notdone')}</button>`;
  }
  function miniRest() {
    if (!U.rest) return '';
    const left = restLeft(), over = left === 0, c = 50.3;
    return `<svg class="ses-mini__ring" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="var(--shell-line)"/><circle class="ring__v" cx="10" cy="10" r="8" stroke="var(--accent)" stroke-linecap="round" stroke-dasharray="${(over ? c : (c * left) / U.rest.total).toFixed(1)} ${c}"/></svg>
      <span class="ses-mini__time">${over ? 'Вперёд' : fmt.rest(left)}</span>
      <button class="ses-mini__skip" type="button" data-act="rest-skip" data-k="mini-rest-skip" aria-label="${over ? 'Скрыть: отдых закончился' : `Пропустить отдых, осталось ${fmt.rest(left)}`}">${icon(over ? 'close' : 'skip')}</button>`;
  }
  function renderMini() {
    const m = document.getElementById('ses-mini');
    if (!m) return;
    const name = q.name(X().el.exerciseId), sub = miniSub();
    m.querySelector('.ses-mini__name').textContent = name;
    m.querySelector('.ses-mini__sub').textContent = sub;
    m.querySelector('.ses-mini__t').setAttribute('aria-label', `${name}. ${sub}. Наверх`);
    const acts = document.getElementById('ses-mini-acts');
    if (acts) acts.innerHTML = miniActs();
    const rest = document.getElementById('ses-mini-rest');
    if (rest) { rest.innerHTML = miniRest(); rest.hidden = !U.rest; }
  }
  let ioName = null, ioParts = null, ioStick = null;
  function observe() {
    const m = document.getElementById('ses-mini'), box = document.getElementById('ses-segbox');
    if (!m || !box || !('IntersectionObserver' in window)) return;
    // S - колбаски, B - низ чёрной полосы (граница появления частей: кнопки и таймер под ней прозрачные, лист виден),
    // F - низ шапки вместе с прибитыми кнопками (отступ прокрутки к подходу, чтобы кнопки его не закрывали)
    const S = box.offsetHeight, B = S + m.querySelector('.ses-mini__bg').offsetHeight, F = S + m.offsetHeight;
    document.documentElement.style.setProperty('--ses-mini-h', `${F}px`);
    if (ioName) ioName.disconnect();
    if (ioParts) ioParts.disconnect();
    if (ioStick) ioStick.disconnect();
    // Колбаски прилипли (метка перед ними ушла за верх) - линия по нижнему краю, пока под ними нет остальной шапки
    ioStick = new IntersectionObserver(([e]) => box.classList.toggle('is-stuck', !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    ioStick.observe(document.getElementById('ses-stick'));
    ioName = new IntersectionObserver(([e]) => { const on = !e.isIntersecting && e.boundingClientRect.top < S; m.classList.toggle('is-on', on); box.classList.toggle('with-mini', on); }, { rootMargin: `-${S}px 0px 0px 0px`, threshold: 0 });
    ioName.observe(document.querySelector('.ses-name'));
    ioParts = new IntersectionObserver((list) => {
      for (const e of list) m.classList.toggle(e.target.id === 'ses-rest' ? 'show-rest' : 'show-acts', !e.isIntersecting && e.boundingClientRect.top < B);
    }, { rootMargin: `-${B}px 0px 0px 0px`, threshold: 0 });
    const acts = document.querySelector('#ses-pult .ses-acts'), rest = document.getElementById('ses-rest');
    if (acts) ioParts.observe(acts); else m.classList.remove('show-acts');
    if (rest) ioParts.observe(rest); else m.classList.remove('show-rest');
  }

  // ---------- Отрисовка ----------
  function render() {
    const k = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    const segs = document.getElementById('ses-segs');
    segs.innerHTML = segsHtml();
    segs.setAttribute('aria-label', segsLabel());
    document.getElementById('ses-head').innerHTML = head();
    document.getElementById('ses-pult').innerHTML = pult();
    document.querySelector('.assign-bar').innerHTML = bar();
    renderMini();
    observe();
    bindEff();
    if (k) { const el = document.querySelector(`[data-k="${CSS.escape(k)}"]`); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  }
  const scrollToCtl = () => { const c = document.getElementById('ses-ctl') || document.getElementById('ses-rest'); if (c) c.scrollIntoView({ block: 'nearest', behavior: kit.reduced() ? 'auto' : 'smooth' }); };

  // Бегунок усилия: значение пишется сразу, полоса сворачивается через 4 с после отпускания (BEHAVIOR.md 5.6; было 1,2 с - клиент не успевал увидеть выбор)
  const EFF_HOLD = 4000;
  let effTimer = null;
  function bindEff() {
    document.querySelectorAll('#ses-pult [data-eff]').forEach((root) => {
      const id = root.dataset.eff;
      kit.effBind(root, {
        onTouch: () => clearTimeout(effTimer),
        onChange: (v) => { const rec = run.sets[id] || { ...q.db.setResults.find((s) => s.id === id) }; rec.values = { ...rec.values, rpe: v }; run.sets[id] = rec; },
        onCommit: () => { commit('set'); clearTimeout(effTimer); effTimer = setTimeout(() => { U.eff = null; commit('ui'); render(); }, EFF_HOLD); },
        onSkip: () => { clearTimeout(effTimer); U.eff = null; commit('ui'); render(); },
      });
    });
  }

  // ---------- Действия ----------
  function mark() {
    const x = X(), el = x.el, t = target(el);
    if (!t) return;
    ensureStarted();
    const rec = putSet(el, t.i, t.values);
    U.edit = null;
    if (!t.fix) {
      U.rest = null;
      // Усилие: lastSet - после последнего подхода плана, everySet - после каждого (Element.effortPrompt)
      const ep = el.effortPrompt || 'lastSet';
      const last = !t.extra && t.i === el.sets.length - 1;
      U.eff = !t.extra && (ep === 'everySet' || (ep === 'lastSet' && last)) ? rec.id : null;
      if (!t.extra) { RUN.apply(q.db, w.id); after(x, t.i); }
    }
    commit('set');
    render();
    // Раскрылся бегунок усилия - довести его в середину экрана: в группе после последнего подхода A1 экран уже на A2,
    // и карточка A1 оказывалась внизу под панелью «Как в плане» (пользователь 2026-10-29: «не раскрылся»)
    const eff = U.eff && document.querySelector('#ses-pult [data-eff]');
    if (eff) eff.scrollIntoView({ block: 'center', behavior: kit.reduced() ? 'auto' : 'smooth' });
    else scrollToCtl();
  }
  // После отметки подхода плана: группа - к следующему упражнению круга, отдых - по плану (BEHAVIOR.md 5.6)
  function after(x, i) {
    const el = x.el;
    const allLeft = flat.some((f) => !settled(f.el));
    if (x.group) {
      const items = itemsOf(x.block), j = items.indexOf(x);
      for (let k = j + 1; k < items.length; k++) { const e = items[k].el; if (e.sets[i] && !recOf(e, e.sets[i])) { cur = items[k].n; return; } }
      if (allLeft) startRest(x.block.restAfterRoundSec);
      const nxt = items.find((it) => pendingIdx(it.el) >= 0);
      if (nxt) cur = nxt.n;
      return;
    }
    const rest = el.sets[i].restSec || el.restSec;
    if (rest && allLeft) startRest(rest);
  }
  function go(n) {
    n = Math.min(Math.max(n, 1), flat.length);
    if (n === cur) return;
    cur = n; U.edit = null; U.eff = null;
    commit('ui'); render();
    window.scrollTo({ top: 0, behavior: kit.reduced() ? 'auto' : 'smooth' });
  }
  function stepValue(m, d) {
    const x = X(), t = target(x.el);
    if (!t) return;
    const v = { ...t.values };
    v[m] = Math.max(MIN[m], Math.round((v[m] + d * STEP[m]) * 10) / 10);
    U.edit = { elId: x.el.id, idx: t.i, values: v };
    commit('ui'); render();
  }

  // Лист «Больно / неприятно»: сила 0-10, где, заметка; WorkoutResult.pain { level, note, elementId }
  const PLACES = ['Поясница', 'Спина', 'Шея', 'Плечо', 'Колено', 'Другое'];
  function painSheet() {
    const el = X().el;
    const old = painOf(el);
    const [oldPlace, ...rest] = old && old.note ? old.note.split(' · ') : [];
    let level = old ? old.level : null;
    let place = PLACES.includes(oldPlace) ? oldPlace : null;
    const oldText = PLACES.includes(oldPlace) ? rest.join(' · ') : (old && old.note) || '';
    kit.sheet({
      title: 'Больно или неприятно',
      sub: `${esc(q.name(el.exerciseId))} · тренер увидит сразу`,
      body: `<div class="fl"><span class="fl__l" id="pain-l">Насколько</span>${kit.effHtml({ key: 'pain', label: 'Сила боли от 0 до 10', value: level, pain: true })}<span class="fl__hint">Если боль острая - остановите упражнение.</span></div>
        <div class="fl"><span class="fl__l">Где <span class="muted">· по желанию</span></span>${kit.chipsHtml(PLACES, place, 'Где болит')}</div>
        <label class="fl"><span class="fl__l">Заметка <span class="muted">· по желанию</span></span><textarea class="area area--soft" rows="3" placeholder="Что почувствовали и когда">${esc(oldText)}</textarea></label>`,
      foot: `<button class="btn btn--ghost" type="button" data-sheet-close>Отмена</button><button class="btn btn--dark" type="button" data-save${level == null ? ' disabled' : ''}>Сохранить</button>`,
      onMount(s, close) {
        const save = s.querySelector('[data-save]');
        kit.effBind(s.querySelector('[data-eff]'), { pain: true, onChange: (v) => { level = v; save.disabled = false; } });
        kit.chipsBind(s.querySelector('.chips'), (v) => { place = v; });
        save.addEventListener('click', () => {
          const text = s.querySelector('textarea').value.trim();
          ensureStarted();
          const note = [place, text].filter(Boolean).join(' · ');
          run.result = { ...(run.result || {}), pain: { level, ...(note ? { note } : {}), elementId: el.id } };
          commit('pain'); close(); render();
          kit.toast(OFF ? 'Боль отмечена · отправится, когда появится сеть' : 'Боль отмечена · тренер увидит сразу');
        });
      },
    });
  }
  // Лист «Вопрос тренеру»: Comment { elementId, author: "client" }
  function askSheet() {
    const el = X().el;
    kit.sheet({
      title: 'Вопрос тренеру',
      sub: `К упражнению: ${esc(q.name(el.exerciseId))}`,
      body: `<label class="fl"><span class="fl__l">Вопрос или комментарий</span><textarea class="area area--soft" rows="4" data-autofocus placeholder="Например: какой вес брать, если тяжело?"></textarea><span class="fl__hint">Ответ придёт сюда и на «Сегодня». Общий разговор - в Telegram.</span></label>`,
      foot: `<button class="btn btn--ghost" type="button" data-sheet-close>Отмена</button><button class="btn btn--dark" type="button" data-save disabled>${icon('send')}Отправить</button>`,
      onMount(s, close) {
        const ta = s.querySelector('textarea'), save = s.querySelector('[data-save]');
        ta.addEventListener('input', () => { save.disabled = !ta.value.trim(); });
        save.addEventListener('click', () => {
          const c = { id: `cm_c_${Date.now()}`, workoutId: w.id, elementId: el.id, author: 'client', body: ta.value.trim(), createdAt: RUN.now() };
          run.comments.push(c);
          commit('comment'); close(); render();
          kit.toast(OFF ? 'Сохранено · отправится, когда появится сеть' : 'Отправлено тренеру');
        });
      },
    });
  }
  // Лист «Не сделал»: подходы - done: false, причина - комментарием к упражнению; замены нет
  const REASONS = ['Тренажёр занят', 'Нет оборудования', 'Больно', 'Не хватило времени', 'Другое'];
  function skipSheet() {
    const x = X(), el = x.el;
    let reason = null;
    kit.sheet({
      title: 'Не получилось сделать?',
      sub: `${esc(q.name(el.exerciseId))} · тренер увидит причину`,
      body: `<div class="fl"><span class="fl__l">Почему <span class="muted">· по желанию</span></span>${kit.chipsHtml(REASONS, null, 'Причина')}</div>
        <label class="fl"><span class="fl__l">Комментарий <span class="muted">· по желанию</span></span><textarea class="area area--soft" rows="3" placeholder="Например: сделаю в конце"></textarea></label>
        <p class="fl__hint">Замены упражнения пока нет: отметим, что не сделано${doneOf(el) ? `, сделанные ${doneOf(el)} из ${el.sets.length} останутся` : ''}. Вернуть можно в любой момент.</p>`,
      foot: `<button class="btn btn--ghost" type="button" data-sheet-close>Отмена</button><button class="btn btn--dark" type="button" data-save>${icon('notdone')}Не сделал</button>`,
      onMount(s, close) {
        kit.chipsBind(s.querySelector('.chips'), (v) => { reason = v; });
        s.querySelector('[data-save]').addEventListener('click', () => {
          const text = s.querySelector('textarea').value.trim();
          ensureStarted();
          el.sets.forEach((sp, i) => { if (!recOf(el, sp)) putSet(el, i, q.planValues(sp), false); });
          let commentId = null;
          if (reason || text) {
            const c = { id: `cm_c_${Date.now()}`, workoutId: w.id, elementId: el.id, author: 'client', body: `Не сделал${reason ? `: ${reason.toLowerCase()}` : ''}${text ? `. ${text}` : ''}`, createdAt: RUN.now() };
            run.comments.push(c); commentId = c.id;
          }
          U.skip = { ...(U.skip || {}), [el.id]: { reason, commentId } };
          U.edit = null; U.eff = null;
          commit('skip'); close(); render();
          if (reason === 'Больно') painSheet();
          else kit.toast('Отмечено: не сделано', { action: 'Вернуть', onAction: unskip });
        });
      },
    });
  }
  function unskip() {
    const el = X().el, sk = (U.skip || {})[el.id];
    if (!sk) return;
    for (const [id, s] of Object.entries(run.sets)) if (s.elementId === el.id && !s.done) { delete run.sets[id]; const i = q.db.setResults.findIndex((r) => r.id === id); if (i >= 0) q.db.setResults.splice(i, 1); }
    if (sk.commentId) { run.comments = run.comments.filter((c) => c.id !== sk.commentId); const i = q.db.comments.findIndex((c) => c.id === sk.commentId); if (i >= 0) q.db.comments.splice(i, 1); }
    delete U.skip[el.id];
    commit('skip'); render();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !b.closest('.capp')) return;
    const a = b.dataset.act;
    const x = X();
    if (a === 'mark') mark();
    else if (a === 'step') stepValue(b.dataset.m, Number(b.dataset.d));
    else if (a === 'go') go(Number(b.dataset.n));
    else if (a === 'next') { U.eff = null; const nx = nextUnsettled(); if (nx) go(nx.n); }
    else if (a === 'fix') { const i = Number(b.dataset.i), rec = recOf(x.el, x.el.sets[i]); U.edit = { elId: x.el.id, idx: i, values: kit.noRpe(rec.values) }; U.eff = null; commit('ui'); render(); scrollToCtl(); }
    else if (a === 'extra') { const last = [...recs(x.el)].filter((s) => s.done).pop(); const base = last ? kit.noRpe(last.values) : q.planValues(x.el.sets[x.el.sets.length - 1]); U.edit = { elId: x.el.id, idx: 'x', values: base }; U.eff = null; commit('ui'); render(); scrollToCtl(); }
    else if (a === 'edit-cancel') { U.edit = null; commit('ui'); render(); }
    else if (a === 'rest-skip') { U.rest = null; commit('ui'); render(); }
    else if (a === 'eff-open') { U.eff = b.dataset.id; commit('ui'); render(); const eff = document.querySelector('#ses-pult [data-eff]'); if (eff) eff.scrollIntoView({ block: 'nearest', behavior: kit.reduced() ? 'auto' : 'smooth' }); }
    else if (a === 'pain') painSheet();
    else if (a === 'ask') askSheet();
    else if (a === 'skip') skipSheet();
    else if (a === 'unskip') unskip();
    else if (a === 'top') window.scrollTo({ top: 0, behavior: kit.reduced() ? 'auto' : 'smooth' });
  });
  let resizeT = null;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(observe, 150); });

  // ---------- Первый показ ----------
  const nowEx = X();
  if (P.get('step') === 'rest' && !U.rest && !readOnly) startRest(nowEx.el.restSec || nowEx.block.restAfterRoundSec || 90);
  const sentNow = !OFF && run.pending ? run.pending : 0;   // сеть вернулась: отметки ушли
  ui.page({
    screen: 'session', title: `${w.title} - выполнение`,
    back: { href: `workout.html?w=${w.id}`, label: 'Обзор' }, avatar: false,
    tools: OFF ? '' : '<p class="sync ses-sync" id="ses-sync" role="status" hidden></p>',
    body: `<div class="ses-stick" id="ses-stick" aria-hidden="true"></div>
      <div class="ses-segbox dark" id="ses-segbox"><div class="ses-segbox__bar"><div class="segbar ses-segs" id="ses-segs" role="img"></div></div></div>
      <div class="ses-head dark" id="ses-head"></div>
      <div class="pult" id="ses-pult"></div>`,
    bar: '<span></span>',
  });
  // Шапка - часть липкого блока колбасок, подвешена под ними: один механизм прилипания, при любой прокрутке
  // (и при оттяжке за край) они двигаются вместе
  document.getElementById('ses-segbox').insertAdjacentHTML('beforeend', miniSkeleton());
  render();
  if (sentNow) {
    run.pending = 0; RUN.save();
    const box = document.getElementById('ses-sync');
    box.hidden = false; box.innerHTML = `${icon('saved')}<span><b>Отправлено</b> · ${cnt(sentNow, MARKS)}</span>`;
    syncTimer = setTimeout(() => syncShow(false), 3000);
  } else syncShow(false);
  if (cur > 1 || q.sets(w.id).length) setTimeout(scrollToCtl, 60);
  restTick = setInterval(tick, 250);
})();
