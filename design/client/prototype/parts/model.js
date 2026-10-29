// Модель прототипа клиента: запросы к мокам (parts/data.js) и форматирование. Экраны читают данные только через APS.q и
// пишут числа и даты только через APS.fmt - тогда все экраны показывают одно и то же одинаково.
// Аналог модуля workout-model из design/ARCHITECTURE.md: подписи групп и нумерация A1, A2 вычисляются, а не хранятся.
window.APS = window.APS || {};
(() => {
  const params = new URLSearchParams(location.search);
  const db = APS.makeDb(params.get('state'));
  const CAT = APS.catalog;
  const NBSP = ' ', NNBSP = ' ', TIMES = `${NNBSP}×${NNBSP}`;

  // ---------- Форматирование ----------
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const WD_LONG = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MON_LONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const parts = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
  const dayDiff = (a, b) => (Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 864e5;
  const ymd = (s) => { const p = parts(s); return [p.y, p.m - 1, p.d]; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Подписи ощущений 1-10 - Продукт/Инбокс фич.md (утверждено пользователем 2026-10-24): позиция бегунка = RPE, цифр клиент не видит.
  // Одни и те же на «Выполнении», «Завершении» и «Результате» (BEHAVIOR.md 5.6, 5.7, 5.9).
  const EFFORT = ['', 'Почти без усилия', 'Очень легко', 'Легко', 'Легко, мог бы сделать ещё много', 'Мог бы сделать ещё 5 и больше',
    'Мог бы сделать ещё 4 повторения', 'Мог бы сделать ещё 3 повторения', 'Мог бы сделать ещё 2 повторения',
    'Мог бы сделать ещё 1 повторение', 'Максимум. Больше ни одного повторения'];
  // Самочувствие 1-5 словами (BEHAVIOR.md 5.7)
  const WELL = ['', 'Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично'];
  // Сила боли 0-10 словами (числовая шкала боли NRS): 0 нет, 1-3 слабая, 4-6 умеренная, 7-10 сильная (BEHAVIOR.md 5.6)
  const painWord = (v) => (v === 0 ? 'нет' : v <= 3 ? 'слабая' : v <= 6 ? 'умеренная' : 'сильная');

  const fmt = {
    NBSP, NNBSP, TIMES, EFFORT, WELL, painWord,
    effort(v) { return EFFORT[v] || ''; },                                                        // «Мог бы сделать ещё 2 повторения»
    well(v) { return WELL[v] || ''; },                                                            // «Нормально»
    painText(v) { return `${v} из 10 · ${painWord(v)}`; },                                        // «4 из 10 · умеренная»
    plural(n, [one, few, many]) { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many; },
    count(n, forms) { return `${n}${NBSP}${fmt.plural(n, forms)}`; },
    num(v) { return String(Math.round(v * 10) / 10).replace('.', ','); },
    kg(v) { return `${fmt.num(v)}${NBSP}кг`; },
    date(s) { const p = parts(s); return `${WD[p.wd]}, ${p.d}${NBSP}${MON[p.m - 1]}`; },            // «чт, 29 окт»
    dateCap(s) { return cap(fmt.date(s)); },                                                      // «Чт, 29 окт»
    dayMonth(s) { const p = parts(s); return `${p.d}${NBSP}${MON[p.m - 1]}`; },                    // «29 окт»
    dateLong(s) { const p = parts(s); return `${cap(WD_LONG[p.wd])}, ${p.d}${NBSP}${MON_LONG[p.m - 1]}`; }, // «Четверг, 29 октября»
    weekday(s) { return WD[parts(s).wd]; },
    time(inst) { return inst.slice(11, 16); },
    // «сегодня», «завтра», «вчера», иначе «чт, 29 окт»
    rel(s) { const d = dayDiff(db.now, s); return d === 0 ? 'сегодня' : d === 1 ? 'завтра' : d === -1 ? 'вчера' : fmt.date(s); },
    relTime(inst) { return `${fmt.rel(inst)} ${fmt.time(inst)}`; },
    // Длительность в плане: «45 с», «2 мин», «1 мин 30 с»; отдых - «2:00»
    dur(sec) { if (sec < 60) return `${sec}${NBSP}с`; const m = Math.floor(sec / 60), s = sec % 60; return s ? `${m}${NBSP}мин ${s}${NBSP}с` : `${m}${NBSP}мин`; },
    rest(sec) { return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; },
    // Один подход: «70 × 8», «8», «45 с», «24 × 40 м» (вес без единицы - как в c2)
    setVal(v) {
      if (v.weight != null && v.reps != null) return `${fmt.num(v.weight)}${TIMES}${v.reps}`;
      if (v.weight != null && v.distance != null) return `${fmt.num(v.weight)}${TIMES}${v.distance}${NBSP}м`;
      if (v.reps != null) return String(v.reps);
      if (v.duration != null) return fmt.dur(v.duration);
      if (v.distance != null) return `${v.distance}${NBSP}м`;
      return '';
    },
    // Несколько подходов - BEHAVIOR.md 2.1: одинаковые - «4 × 8 × 67,5 кг», иначе через «·»: «70 × 8 · 70 × 8 · 70 × 7 · 65 × 8»
    setsText(list) {
      if (!list.length) return '';
      const same = list.every((v) => JSON.stringify(v) === JSON.stringify(list[0]));
      if (!same) return list.map(fmt.setVal).join(' · ');
      const v = list[0], n = list.length;
      if (v.weight != null && v.reps != null) return `${n}${TIMES}${v.reps}${TIMES}${fmt.kg(v.weight)}`;
      if (v.weight != null && v.distance != null) return `${n}${TIMES}${v.distance}${NBSP}м${TIMES}${fmt.kg(v.weight)}`;
      if (v.reps != null) return `${n}${TIMES}${v.reps}`;
      if (v.duration != null) return `${n}${TIMES}${fmt.dur(v.duration)}`;
      if (v.distance != null) return `${n}${TIMES}${v.distance}${NBSP}м`;
      return '';
    },
  };

  // ---------- Запросы ----------
  const exact = (targets) => Object.fromEntries(Object.entries(targets).filter(([k, t]) => k !== 'rpe' && t.kind === 'exact').map(([k, t]) => [k, t.value]));
  const today = db.now.slice(0, 10);
  const byDate = (a, b) => (a.schedule.date + (a.schedule.startTime || '')).localeCompare(b.schedule.date + (b.schedule.startTime || ''));
  db.workouts.sort(byDate);

  const q = {
    db, now: db.now, today, state: db.state,
    ex(id) { const e = CAT.exercises[id]; return e ? { ...e, name: e.names.ru } : null; },
    name(id) { return CAT.exercises[id] ? CAT.exercises[id].names.ru : id; },
    workout(id) { return db.workouts.find((w) => w.id === id) || null; },
    workouts() { return db.workouts; },
    result(id) { return db.results.find((r) => r.workoutId === id) || null; },
    sets(workoutId, elementId) { return db.setResults.filter((s) => s.workoutId === workoutId && (!elementId || s.elementId === elementId)); },
    comments(workoutId) { return db.comments.filter((c) => c.workoutId === workoutId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); },
    archived() { return db.client.status === 'archived'; },

    // Дата, когда тренировка случилась: фактическая, если есть факт (тренировка не в свой день - решение 5), иначе по плану
    date(w) { const r = q.result(w.id); const t = r && (r.completedAt || r.startedAt); return t ? t.slice(0, 10) : w.schedule.date; },
    // Статус для клиента: completed · partial · missed · inProgress · scheduled · unmarked (прошла без отметки - нейтрально)
    status(w) {
      const r = q.result(w.id);
      if (r) return r.status;
      return w.schedule.date < today ? 'unmarked' : 'scheduled';
    },
    week(w) { return Math.floor(dayDiff(db.program.startsOn, w.schedule.date) / 7) + 1; },
    day(w) { const wk = q.week(w); return db.workouts.filter((x) => x.programId === w.programId && q.week(x) === wk).sort(byDate).indexOf(w) + 1; },
    sub(w) { return `неделя ${q.week(w)}, день ${q.day(w)}`; },                       // «неделя 9, день 2»
    title(w) { return `${w.title} · ${q.sub(w)}`; },                                  // «Тяга и корпус · неделя 9, день 2»
    inPerson(w) { return w.schedule.format === 'inPerson'; },
    formatWord(w) { return q.inPerson(w) ? 'с тренером' : 'сам'; },
    timeRange(w) {
      const s = w.schedule; if (!s.startTime) return '';
      const [h, m] = s.startTime.split(':').map(Number), e = h * 60 + m + (s.durationMin || 60);
      return `${s.startTime}-${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
    },

    // Порядок упражнений: один список на всю тренировку, разминка и заминка тоже считаются. «Упражнение 3 из 12»,
    // «Продолжить с упражнения 3» - номер n отсюда. label - A1, A2, B1 у групп (буква - по порядку групп), у одиночных пусто.
    flat(w) {
      const out = []; let letter = 0, n = 0;
      for (const b of w.blocks) {
        const isGroup = b.elements.length > 1;
        const L = isGroup ? String.fromCharCode(65 + letter++) : '';
        b.elements.forEach((el, i) => { if (el.kind === 'exercise') out.push({ n: ++n, el, block: b, role: b.role || 'main', label: isGroup ? `${L}${i + 1}` : '', group: isGroup ? L : '' }); });
      }
      return out;
    },
    groupName(b) { const k = b.elements.length; return b.scheme !== 'superset' ? b.scheme : k === 2 ? 'Суперсет' : k === 3 ? 'Трисет' : 'Гигантский сет'; },
    setCount(w) { return w.blocks.reduce((a, b) => a + b.elements.reduce((s, el) => s + (el.sets ? el.sets.length : 0), 0), 0); },
    exCount(w) { return q.flat(w).length; },
    doneSetCount(w) { return q.sets(w.id).filter((s) => s.done).length; },
    // Упражнение сделано, когда отмечены все его подходы плана
    elementDone(w, el) { const d = q.sets(w.id, el.id).filter((s) => s.done && s.setPlanId).length; return d >= el.sets.length; },
    // С какого упражнения продолжать: первое, где отмечены не все подходы
    resumeAt(w) { const f = q.flat(w); const x = f.find((e) => !q.elementDone(w, e.el)); return x ? x.n : f.length; },
    equipment(w) {
      const ids = new Set();
      for (const { el } of q.flat(w)) for (const e of (CAT.exercises[el.exerciseId].equipmentIds || [])) if (e !== 'none') ids.add(e);
      return [...ids].map((id) => CAT.equipment[id] || id);
    },
    planText(el) {   // «разминочный 40 × 10 · 3 × 8 × 65 кг на сторону»
      const warm = el.sets.filter((s) => s.type === 'warmup').map((s) => exact(s.targets));
      const work = el.sets.filter((s) => s.type !== 'warmup').map((s) => exact(s.targets));
      const parts = [];
      if (warm.length) parts.push(`разминочный ${warm.map(fmt.setVal).join(' · ')}`);
      parts.push(fmt.setsText(work) + (el.perSide ? ' на сторону' : ''));
      return parts.join(' · ');
    },
    planValues(sp) { return exact(sp.targets); },
    effortTarget(el) { const t = el.sets[el.sets.length - 1].targets.rpe; return t ? (t.kind === 'range' ? `${t.min}-${t.max}` : String(t.value)) : ''; },
    // Факт подхода как текст по тем же правилам, что план
    factText(workoutId, el) { return fmt.setsText(q.sets(workoutId, el.id).filter((s) => s.done).map((s) => Object.fromEntries(Object.entries(s.values).filter(([k]) => k !== 'rpe')))); },

    // «Прошлый раз» по упражнению до даты: последняя тренировка, где оно было сделано
    lastTime(exerciseId, beforeDate = today) {
      const done = db.setResults.filter((s) => s.exerciseId === exerciseId && s.done && s.recordedAt.slice(0, 10) < beforeDate);
      if (!done.length) return null;
      const last = done.reduce((a, b) => (a.recordedAt > b.recordedAt ? a : b));
      const sets = done.filter((s) => s.workoutId === last.workoutId);
      const values = sets.map((s) => Object.fromEntries(Object.entries(s.values).filter(([k]) => k !== 'rpe')));
      return { workout: q.workout(last.workoutId), date: last.recordedAt.slice(0, 10), sets, text: fmt.setsText(values) };
    },

    // Рекорды - кэш из SetResult (ARCHITECTURE, «Производные метрики»): подход с весом больше лучшего прежнего по упражнению,
    // включая лучшие подходы до программы (db.before.best). По упражнению в тренировке - один рекорд.
    records() {
      const best = Object.fromEntries(Object.entries(db.before.best).map(([k, v]) => [k, v.weight]));
      const out = [];
      const done = db.setResults.filter((s) => s.done && s.values.weight != null).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
      for (const s of done) {
        const prev = best[s.exerciseId];
        if (prev != null && s.values.weight > prev) out.push({ exerciseId: s.exerciseId, workoutId: s.workoutId, setResultId: s.id, date: s.recordedAt.slice(0, 10), weight: s.values.weight, prev, values: Object.fromEntries(Object.entries(s.values).filter(([k]) => k !== 'rpe')) });
        if (prev == null || s.values.weight > prev) best[s.exerciseId] = s.values.weight;
      }
      return out;
    },
    recordsOf(workoutId) { return q.records().filter((r) => r.workoutId === workoutId); },
    completedCount() { return db.before.completed + db.results.filter((r) => r.status === 'completed' || r.status === 'partial').length; },

    // «Сегодня»: тренировка на сегодня (по плану или начатая сегодня), следующая, последний итог
    todayWorkout() { return db.workouts.find((w) => w.schedule.date === today || (q.result(w.id) && q.date(w) === today)) || null; },
    next(after = today) { return db.workouts.find((w) => w.schedule.date > after && q.status(w) === 'scheduled') || null; },
    lastDone(before = db.now) {
      const r = db.results.filter((x) => (x.status === 'completed' || x.status === 'partial') && x.completedAt && x.completedAt.slice(0, 16) <= before)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      return r ? { workout: q.workout(r.workoutId), result: r } : null;
    },
    // Неделя пн-вс вокруг даты: дни и тренировки по фактической дате
    weekDays(date = today) {
      const p = parts(date), monday = addDays(date, -((p.wd + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => { const d = addDays(monday, i); return { date: d, workouts: db.workouts.filter((w) => q.date(w) === d) }; });
    },
    unreadReplies() { return db.comments.filter((c) => c.author === 'trainer' && !c.readByClientAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    lastWeight() { return db.measurements.slice().sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0] || null; },
  };
  function addDays(s, n) { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
  q.addDays = addDays;

  // RichText (ARCHITECTURE, «Заметки и теги») -> HTML: жирный, курсив, подчёркивание, маркеры (marker1 - лайм .mark)
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  q.rich = (doc) => (doc && doc.content ? doc.content.map((p) => `<p>${(p.content || []).map((n) => {
    if (n.type !== 'text') return '';
    let h = esc(n.text);
    for (const m of n.marks || []) {
      if (m.type === 'bold') h = `<b>${h}</b>`; else if (m.type === 'italic') h = `<i>${h}</i>`; else if (m.type === 'underline') h = `<u>${h}</u>`;
      else if (m.type === 'highlight') h = `<mark class="mark${m.color === 'marker3' ? ' mark--attn' : ''}">${h}</mark>`;
    }
    return h;
  }).join('')}</p>`).join('') : '');
  q.clientNotes = (notes) => (notes || []).filter((n) => n.audience === 'client');   // «Только я» клиенту не показываем никогда

  APS.q = q;
  APS.fmt = fmt;
  APS.esc = esc;
})();
