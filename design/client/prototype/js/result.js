// «Результат тренировки» клиента: мой план и факт по подходам, рекорды, сравнение с прошлым разом, мои ответы в конце,
// ветка комментариев с тренером (Клиентское приложение.md, 4 «После»; BEHAVIOR.md 5.9 «Результат тренировки клиента»).
// ?w=<id> - тренировка; ?back=plan|progress - куда ведёт «назад»; #comments - сразу к ветке и полю ответа;
// ?day=same - смотреть вечером в день тренировки (parts/result.data.js): свои записи можно исправить до конца дня.
// «внёс тренер» - WorkoutResult.source; «исправлено тренером» - SetResult.correctedBy (BEHAVIOR.md 2.5).
(() => {
  const { q, fmt, esc, ui } = APS;
  const { icon, href } = ui;
  const params = new URLSearchParams(location.search);
  const T = q.db.trainer;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const NB = fmt.NBSP;

  // Подписи ощущений без цифр и самочувствие словами - одна копия в parts/model.js (APS.fmt)
  const { EFFORT, WELL } = fmt;
  const UNIT = { weight: 'кг', reps: 'повт.', duration: 'сек', distance: 'м' };

  const last = q.lastDone();
  const w = q.workout(params.get('w')) || (last && last.workout) || q.workouts()[0];
  const r = q.result(w.id);
  const st = q.status(w);
  const done = st === 'completed' || st === 'partial';
  const d = q.date(w);
  const archived = q.archived();
  // Свои записи клиент правит до конца дня тренировки (ARCHITECTURE, «Кто вносит факт»); позже - через комментарий тренеру
  const editable = done && !archived && d === q.today;
  const back = { plan: { href: 'plan.html', label: 'План' }, progress: { href: 'progress.html', label: 'Прогресс' } }[params.get('back')] || { href: 'today.html', label: 'Сегодня' };
  const flat = q.flat(w);

  const clean = (v) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'rpe'));
  const topWeight = (list) => Math.max(...list.map((s) => (s.values ? s.values.weight : s.weight) ?? -1));
  // Ниже плана: хотя бы одна величина факта меньше плана (вес, повторы, время, дистанция)
  const below = (sr, sp) => { const pv = q.planValues(sp); return Object.keys(pv).some((k) => sr.values[k] != null && sr.values[k] < pv[k]); };

  // ---------- Полоса ----------
  const minutes = r && r.startedAt && r.completedAt ? Math.round((Date.parse(r.completedAt) - Date.parse(r.startedAt)) / 6e4) : null;
  const prs = done ? q.recordsOf(w.id) : [];
  const stWord = { completed: 'Выполнена', partial: 'Выполнена частично', missed: 'Пропущена', inProgress: 'Идёт', scheduled: 'Запланирована', unmarked: 'Не отмечена' }[st];
  const stIcon = done ? icon('done') : st === 'missed' ? icon('missed') : st === 'scheduled' ? icon('clock') : st === 'inProgress' ? icon('saved') : '<i class="status__open" aria-hidden="true"></i>';
  let band = `<p class="label band__eyebrow">${fmt.dateCap(d)}${r && r.startedAt ? `, ${fmt.time(r.startedAt)}` : q.inPerson(w) ? `, ${w.schedule.startTime}` : ''} · ${q.formatWord(w)}</p>
    <h1 class="band__title">${esc(w.title)}</h1>
    <p class="band__meta">${cap(q.sub(w))}${minutes ? ` · ${minutes}${NB}мин` : ''}${d !== w.schedule.date && r ? ` · по плану - ${fmt.date(w.schedule.date)}` : ''}</p>
    <p class="res-st"><span class="status res-st__s">${stIcon}${stWord}</span>${r && r.source === 'trainer' && st !== 'missed' ? `<span class="tag tag--shell">${icon('user')}внёс тренер</span>` : ''}${st === 'missed' && r.missReason ? `<span class="res-st__why">«${esc(r.missReason)}»</span>` : ''}</p>`;
  if (done) band += `<ul class="res-facts">
      <li><b class="num">${q.doneSetCount(w)}</b><span>из${NB}${q.setCount(w)} ${fmt.plural(q.setCount(w), ['подхода', 'подходов', 'подходов'])}</span></li>
      <li><b class="num">${prs.length}${prs.length ? ` ${icon('crown', 'res-facts__crown')}` : ''}</b><span>${fmt.plural(prs.length, ['рекорд', 'рекорда', 'рекордов'])}</span></li>
      ${minutes ? `<li><b class="num">${minutes}</b><span>${fmt.plural(minutes, ['минута', 'минуты', 'минут'])}</span></li>` : ''}
    </ul>`;

  // ---------- План и факт ----------
  const ROLE = { warmup: 'Разминка', main: 'Основная часть', cooldown: 'Заминка', recovery: 'Восстановление' };
  const roles = new Set(flat.map((x) => x.role));
  function exItem(x, edit) {
    const { el } = x;
    const name = esc(q.name(el.exerciseId));
    const plan = `<p class="res-ex__plan small"><span class="muted">План</span> <span class="num">${q.planText(el)}</span></p>`;
    const head = `<p class="res-ex__h"><span class="res-ex__n num" aria-hidden="true">${x.n}</span>${x.label ? `<span class="grp">${x.label}</span>` : ''}<b>${name}</b></p>`;
    if (!done) return `<li class="res-ex">${head}${plan}</li>`;
    const sets = q.sets(w.id, el.id);
    const recIds = new Set(prs.filter((p) => p.setResultId).map((p) => p.setResultId));
    const doneSets = sets.filter((s) => s.done);
    let body;
    if (edit) {
      // Сетка подходов с полями (DESIGN.md 5.3-5.4): подходы столбцами, величины строками; пустое поле - подход не сделан
      const keys = Object.keys(q.planValues(el.sets[0]));
      const cols = el.sets.map((sp, i) => ({ sp, i, sr: sets.find((s) => s.setPlanId === sp.id) }));
      body = `<div class="res-grid" role="group" aria-label="${name}: подходы"><div class="sets-x" style="--sx-n:${cols.length}">
        <span class="sets-x__h">Подход</span>${cols.map((c) => `<span class="sets-x__h">${c.i + 1}</span>`).join('')}
        ${keys.map((k) => `<span class="sets-x__l">${UNIT[k]}</span>${cols.map((c) => {
          const v = c.sr && c.sr.done ? c.sr.values[k] : null;
          return `<input class="inp" inputmode="decimal" autocomplete="off" aria-label="Подход ${c.i + 1}, ${UNIT[k]}" data-sr="${c.sr ? c.sr.id : ''}" data-sp="${c.sp.id}" data-k="${k}" data-n="${c.i + 1}" value="${v != null ? fmt.num(v) : ''}" placeholder="${fmt.num(q.planValues(c.sp)[k])}">`;
        }).join('')}`).join('')}
      </div></div><p class="fl__err res-ex__err" hidden></p>`;
    } else {
      const pills = el.sets.map((sp) => {
        const sr = sets.find((s) => s.setPlanId === sp.id);
        if (!sr || !sr.done) return `<span class="set res-set--skip">${icon('minus')}<span class="sr-only">подход не сделан</span></span>`;
        const pr = recIds.has(sr.id), low = !pr && below(sr, sp), fixd = sr.correctedBy === 'trainer';
        return `<span class="set${pr ? ' set--pr' : low ? ' set--low' : ''}"${fixd ? ' title="исправлено тренером"' : ''}>${pr ? `${icon('crown')}<span class="sr-only">рекорд: </span>` : ''}${fmt.setVal(clean(sr.values))}${low ? `${icon('arrowDown')}<span class="sr-only">, ниже плана</span>` : ''}${fixd ? `${icon('edit', 'res-fix')}<span class="sr-only">, исправлено тренером</span>` : ''}</span>`;
      }).join('') + sets.filter((s) => s.done && !s.setPlanId).map((s) => `<span class="set">+${fmt.setVal(clean(s.values))}</span>`).join('');
      body = `<div class="sets">${pills}</div>`;
    }
    // Прошлый раз и рост рабочего веса к нему (только рост - лаймом, падение не отмечаем)
    const lt = q.lastTime(el.exerciseId, d);
    const up = lt && doneSets.length ? topWeight(doneSets) - topWeight(lt.sets) : 0;
    const lastLine = lt ? `<p class="res-ex__last small"><span class="muted">Прошлый раз · ${fmt.date(lt.date)}</span> <span class="num">${lt.text}</span>${up > 0 && topWeight(lt.sets) > 0 ? `<span class="grow">${icon('arrowUp')}+${fmt.kg(up)}</span>` : ''}</p>` : '';
    const rpe = (doneSets[doneSets.length - 1] || {}).values;
    const eff = rpe && rpe.rpe ? `<p class="res-ex__eff small">${icon('flame', 'i--s')}<span><span class="sr-only">Усилие: </span>${EFFORT[rpe.rpe]}</span></p>` : '';
    const pain = r.pain && r.pain.elementId === el.id ? `<p class="res-ex__pain small">${icon('sig-pain', 'i--s')}<span><b>Больно ${r.pain.level}/10</b>${r.pain.note ? ` · ${esc(r.pain.note)}` : ''}</span></p>` : '';
    return `<li class="res-ex">${head}${plan}${body}${edit ? '' : lastLine + eff + pain}</li>`;
  }
  function factList(edit) {
    let html = '', role = null;
    for (const x of flat) {
      if (roles.size > 1 && x.role !== role) { html += `${role ? '</ol>' : ''}<p class="label res-role">${ROLE[x.role]}</p><ol class="res-list">`; role = x.role; }
      else if (!role && !html) html += '<ol class="res-list">';
      html += exItem(x, edit);
    }
    return `${html}</ol>`;
  }
  function legend() {
    if (!done) return '';
    const all = q.sets(w.id).filter((s) => s.done);
    const has = {
      low: flat.some(({ el }) => el.sets.some((sp) => { const s = all.find((x) => x.setPlanId === sp.id); return s && below(s, sp); })),
      pr: prs.length > 0, fix: all.some((s) => s.correctedBy === 'trainer'),
    };
    // Группы - буквами, как в списке: «A1 A2 суперсет», «B1 B2 B3 трисет»
    const groups = w.blocks.filter((b) => b.elements.length > 1).map((b) => {
      const items = flat.filter((x) => x.block === b);
      return `<span>${items.map((x) => `<span class="grp">${x.label}</span>`).join('')}${q.groupName(b).toLowerCase()}</span>`;
    });
    const items = [
      has.low && `<span><span class="res-lg-low">${icon('arrowDown', 'i--s')}</span>ниже плана</span>`,
      has.pr && `<span>${icon('crown', 'i--s')}рекорд</span>`,
      has.fix && `<span>${icon('edit', 'i--xs')}исправлено тренером</span>`,
      ...groups,
    ].filter(Boolean);
    return items.length ? `<p class="legend res-legend">${items.join('')}</p>` : '';
  }
  function factSection(edit) {
    const fixNote = done && !archived ? (editable
      ? (edit ? '' : `<div class="res-edit"><button type="button" class="btn btn--ghost res-edit__go">${icon('edit')}Исправить записи</button><span class="small muted">до конца дня, потом - через тренера</span></div>`)
      : `<div class="res-hint"><p class="small muted">Нашли ошибку в записях? Напишите тренеру в комментарии - он исправит.</p><a class="link" href="#comments">Написать тренеру${icon('arrowR')}</a></div>`) : '';
    return `<div class="sec-h"><h2 class="label sec-h__title" id="h-fact">${done ? 'Мой план и факт' : 'Что в плане'}</h2><span class="small muted">${fmt.count(flat.length, ['упражнение', 'упражнения', 'упражнений'])}</span></div>
      ${edit ? `<p class="small muted res-edit__lead">Поправьте только то, что записали с ошибкой. Пустое поле - подход не сделан. Тренер увидит итоговые значения.</p>` : ''}
      <div class="card res-card">${factList(edit)}${edit ? '' : legend()}</div>${fixNote}`;
  }

  // ---------- Лист ----------
  const sections = [];

  if (st === 'unmarked') sections.push(`<div class="banner"><i class="status__open" aria-hidden="true"></i><p class="banner__t"><b>Не отмечена.</b> Если тренировка была - отметьте, и тренер увидит факт. Не получилось - так и скажите, причину можно не писать.</p></div>`);
  else if (st === 'scheduled') sections.push(`<div class="banner">${icon('clock')}<p class="banner__t"><b>Ещё не проводилась.</b> Результат появится здесь после тренировки.</p></div>`);
  else if (st === 'inProgress') sections.push(`<div class="banner" role="status">${icon(r.source === 'trainer' ? 'user' : 'saved')}<p class="banner__t"><b>${r.source === 'trainer' ? `Подходы отмечает ${esc(T.name)}` : `Начата в ${fmt.time(r.startedAt)}`}</b> · отмечено ${q.doneSetCount(w)} из ${q.setCount(w)}. Итог появится после завершения.</p></div>`);
  if (done && r.source === 'trainer') sections.push(`<div class="banner" role="note">${icon('user')}<p class="banner__t"><b>Подходы внёс ${esc(T.name)}.</b> Если что-то записано не так, напишите ему в комментарии.</p></div>`);

  // Праздник на рекорде: «Хорошие новости» (DESIGN.md 5.7) - рекорд этой тренировки с приростом
  if (prs.length) {
    const [p0, ...more] = prs;
    sections.push(`<section class="card card--dark good res-good" aria-labelledby="h-good">
      <h2 class="label on-dark-2" id="h-good">${prs.length > 1 ? `${fmt.count(prs.length, ['рекорд', 'рекорда', 'рекордов'])} на этой тренировке` : 'Рекорд на этой тренировке'}</h2>
      <p class="good__num"><span class="good__badge">${ui.rays()}${icon('crown', 'good__crown')}</span><span class="num">${fmt.setVal(p0.values)}</span><span class="good__delta">+${fmt.kg(p0.weight - p0.prev)}</span></p>
      <span class="cat-badge good__cat" aria-hidden="true">${ui.cat('cat-happy', 77)}</span>
      <p class="good__who"><b>${esc(q.name(p0.exerciseId))}</b> · было ${fmt.kg(p0.prev)}</p>
      ${more.length ? `<ul class="good__list">${more.map((p) => `<li><p class="good__t"><b>${esc(q.name(p.exerciseId))}</b> · <span class="res-good__d">+${fmt.kg(p.weight - p.prev)}</span></p><span class="good__n num">${fmt.setVal(p.values)}</span></li>`).join('')}</ul>` : ''}
    </section>`);
  }

  sections.push(`<section class="sec res-fact" id="fact" aria-labelledby="h-fact">${factSection(false)}</section>`);

  // Мои ответы в конце тренировки: тяжесть, самочувствие, боль, комментарий - всё по желанию
  if (done) {
    const rows = [];
    if (r.rpe) rows.push(`<li class="kv">${icon('flame')}<span><span class="kv__l">Тяжесть тренировки</span><br>${EFFORT[r.rpe]}</span></li>`);
    if (r.wellbeing) rows.push(`<li class="kv">${icon('wellbeing')}<span><span class="kv__l">Самочувствие</span><br>${WELL[r.wellbeing]}</span></li>`);
    if (r.pain) {
      const at = r.pain.elementId && flat.find((x) => x.el.id === r.pain.elementId);
      rows.push(`<li class="kv res-pain">${icon('sig-pain')}<span><span class="kv__l">Больно или неприятно</span><br><b>${r.pain.level}/10</b>${r.pain.note ? ` · ${esc(r.pain.note)}` : ''}${at ? `<br><span class="small muted">на упражнении «${esc(q.name(at.el.exerciseId))}»</span>` : ''}</span></li>`);
    }
    if (r.comment) rows.push(`<li class="kv">${icon('message')}<span><span class="kv__l">Комментарий</span><br>${esc(r.comment)}</span></li>`);
    sections.push(`<section class="sec" aria-labelledby="h-how">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-how">Как прошло</h2></div>
      ${rows.length ? `<div class="card"><ul>${rows.join('')}</ul></div>` : `<p class="muted">${r.source === 'trainer' ? 'Подходы внёс тренер, вопросов в конце не было.' : 'Без ответов в конце - это необязательно.'}</p>`}
    </section>`);
  }

  // Ветка комментариев: мои вопросы и ответы тренера; общий разговор - в Telegram («Тренер и профиль»)
  const thread = q.comments(w.id);
  const bubble = (c) => {
    const ex = c.elementId && flat.find((x) => x.el.id === c.elementId);
    const at = `${fmt.relTime(c.createdAt)}${ex ? ` · к упражнению «${esc(q.name(ex.el.exerciseId))}»` : ''}`;
    if (c.author === 'client') return `<li class="comment comment--me"><div class="comment__b"><p>${esc(c.body)}</p><p class="comment__m">Вы · ${at}</p></div></li>`;
    return `<li class="comment"><span class="ava ava--s" aria-hidden="true">${esc(T.initials)}</span><div class="comment__b"><p>${esc(c.body)}</p><p class="comment__m">${esc(T.name)} · ${at}${c.readByClientAt ? '' : ' · <b class="res-new">новый</b>'}</p></div></li>`;
  };
  const canWrite = !archived && st !== 'scheduled';
  sections.push(`<section class="sec res-thread" id="comments" aria-labelledby="h-com">
    <div class="sec-h"><h2 class="label sec-h__title" id="h-com">Комментарии</h2>${thread.length ? `<span class="small muted">${thread.length}</span>` : ''}</div>
    ${thread.length ? `<ol class="res-thread__list">${thread.map(bubble).join('')}</ol>` : `<p class="muted res-thread__empty">${canWrite ? 'Здесь можно спросить тренера об этой тренировке - ответ придёт сюда же.' : 'Комментариев нет.'}</p>`}
    ${canWrite ? `<form class="res-reply" novalidate>
      <label class="fl__l" for="res-t">${thread.some((c) => c.author === 'trainer') ? 'Ответить тренеру' : 'Написать тренеру'}</label>
      <textarea class="area area--soft" id="res-t" rows="4" placeholder="Вопрос или комментарий к этой тренировке" aria-describedby="res-t-err"></textarea>
      <p class="fl__err" id="res-t-err" hidden>${icon('alert')}<span>Напишите сообщение - пустое не отправится</span></p>
      <button type="submit" class="btn btn--dark">${icon('send')}Отправить</button>
    </form>` : archived ? `<p class="small muted">${esc(T.name)} отключил вас - комментарии на чтение.</p>` : ''}
  </section>`);

  // ---------- Панель действий ----------
  let bar = null;
  if (st === 'unmarked' && !archived) bar = `<a class="btn btn--primary btn--lg" href="${href('finish.html', { w: w.id, mode: 'mark' })}">${icon('check')}Отметить, что сделал</a><a class="btn btn--shell btn--lg" href="${href('plan.html', { w: w.id, miss: 1 })}#miss">Пропустил</a>`;
  else if (st === 'scheduled' || st === 'inProgress') bar = `<a class="btn btn--lg" href="${href('workout.html', { w: w.id })}">Обзор тренировки</a>`;
  else if (editable) bar = `<button type="button" class="btn btn--primary btn--lg res-save">${icon('check')}Сохранить</button><button type="button" class="btn btn--shell btn--lg res-cancel">Отмена</button>`;

  ui.page({ screen: 'result', title: `${w.title} - результат`, back, band, body: `<div class="stack">${sections.join('')}</div>`, bar });

  // ---------- Поведение ----------
  // Исправить свои записи: поля вместо пилюль, «Сохранить» и «Отмена» в панели снизу (видна только в правке)
  const factEl = document.getElementById('fact');
  const barEl = document.querySelector('.assign-bar');
  if (editable && barEl) barEl.hidden = true;
  const setEdit = (on) => {
    factEl.innerHTML = factSection(on);
    if (barEl && editable) barEl.hidden = !on;
    bindEdit();
    if (on) factEl.querySelector('.inp').focus();
  };
  function bindEdit() {
    const go = factEl.querySelector('.res-edit__go');
    if (go) go.addEventListener('click', () => setEdit(true));
  }
  bindEdit();
  if (editable && barEl) {
    barEl.querySelector('.res-cancel').addEventListener('click', () => { setEdit(false); factEl.querySelector('.res-edit__go').focus(); });
    barEl.querySelector('.res-save').addEventListener('click', () => {
      // Проверка: число с запятой; ошибка - после попытки сохранить, строкой под сеткой упражнения (BEHAVIOR.md 2.4)
      let first = null;
      for (const li of factEl.querySelectorAll('.res-ex')) {
        const err = li.querySelector('.res-ex__err');
        const bad = [...li.querySelectorAll('.inp')].filter((i) => i.value.trim() && !/^\d+([.,]\d+)?$/.test(i.value.trim()));
        for (const i of li.querySelectorAll('.inp')) i.removeAttribute('aria-invalid');
        for (const i of bad) i.setAttribute('aria-invalid', 'true');
        if (err) { err.hidden = !bad.length; if (bad.length) err.innerHTML = `${icon('alert')}<span>Подход ${bad[0].dataset.n}: укажите число, например 62,5</span>`; }
        if (bad.length && !first) first = bad[0];
      }
      if (first) { first.focus(); return; }
      // Сохранить в моки: значения подходов меняются, правка клиента не помечается как исправление
      let changed = 0;
      for (const i of factEl.querySelectorAll('.inp')) {
        const sr = q.db.setResults.find((s) => s.id === i.dataset.sr);
        const v = i.value.trim() === '' ? null : Number(i.value.trim().replace(',', '.'));
        if (!sr) continue;
        if (v == null) { if (sr.done) { sr.done = false; changed++; } continue; }
        if (sr.values[i.dataset.k] !== v || !sr.done) { sr.values[i.dataset.k] = v; sr.done = true; changed++; }
      }
      prs.splice(0, prs.length, ...q.recordsOf(w.id));
      setEdit(false);
      factEl.insertAdjacentHTML('afterbegin', `<div class="banner banner--ok res-saved" role="status">${icon('check')}<p class="banner__t"><b>${changed ? 'Записи исправлены.' : 'Изменений нет.'}</b>${changed ? ` ${esc(T.name)} видит итоговые значения.` : ''}</p></div>`);
      factEl.querySelector('.res-edit__go').focus();
    });
  }

  // Ответ тренеру: сообщение появляется в ветке; пустое не отправляется (ошибка после попытки, DESIGN.md 5.3)
  const form = document.querySelector('.res-reply');
  if (form) {
    const area = form.querySelector('textarea'), err = form.querySelector('.fl__err');
    area.addEventListener('input', () => { if (area.value.trim()) { err.hidden = true; area.removeAttribute('aria-invalid'); } });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = area.value.trim();
      if (!text) { err.hidden = false; area.setAttribute('aria-invalid', 'true'); area.focus(); return; }
      err.hidden = true; area.removeAttribute('aria-invalid');
      let list = document.querySelector('.res-thread__list');
      if (!list) { document.querySelector('.res-thread__empty').outerHTML = '<ol class="res-thread__list"></ol>'; list = document.querySelector('.res-thread__list'); }
      list.insertAdjacentHTML('beforeend', `<li class="comment comment--me"><div class="comment__b"><p>${esc(text)}</p><p class="comment__m">Вы · только что · ${icon('check', 'i--xs')}отправлено</p></div></li>`);
      area.value = '';
      // В отметках клиента (parts/session.data.js): комментарий остаётся в ветке после перехода и перезагрузки
      const run = APS.run.ensure(w.id);
      run.comments.push({ id: `cm_${w.id.slice(3)}_c${Date.now()}`, workoutId: w.id, author: 'client', body: text, createdAt: APS.run.now() });
      APS.run.save();
      list.lastElementChild.scrollIntoView({ block: 'nearest' });
    });
  }
  // Клиент открыл ветку: ответы тренера прочитаны - «новый» видно в этот раз, с «Сегодня» ответ уходит (BEHAVIOR.md 5.5)
  const unread = thread.filter((c) => c.author === 'trainer' && !c.readByClientAt).map((c) => c.id);
  if (unread.length) APS.run.read(unread);
  // #comments - к ветке и фокус в поле; после load, чтобы браузер не перебил своей обработкой якоря
  if (location.hash === '#comments') addEventListener('load', () => {
    document.getElementById('comments').scrollIntoView({ block: 'start' });
    if (form) form.querySelector('textarea').focus({ preventScroll: true });
  });
})();
