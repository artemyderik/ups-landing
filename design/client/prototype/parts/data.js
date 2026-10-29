// Моки приложения клиента «Апс!» - один источник данных для всех экранов прототипа.
// Формы - контракт design/ARCHITECTURE.md: Workout, Block, Element, SetPlan, WorkoutResult, SetResult, Comment, Measurement,
// VisibilitySettings. Поля прототипа вне контракта помечены «прототип». Даты - по часовому поясу тренера (Москва, +03:00).
//
// Персонаж - Игорь Петров из моков тренера (design/directions/content.md, экраны c2): гибрид, вт очно 19:00, чт и сб сам,
// программа «Сильная спина» 12 недель с 31 авг, сейчас неделя 9. Тренер видит те же тренировки: «Клиент: план», «Результат
// тренировки» (пт, 23 окт, боль 4/10), «Конструктор тренировки» (чт, 29 окт - «Тяга и корпус · неделя 9, день 2»).
// Сводка совпадений и решений - README.md, «Моки».
//
// Заметки тренера - только audience: "client": заметок «Только я», сигналов внимания и статуса «отстаёт» у клиента нет.
//
// Экраны данные не правят. Нужно больше данных - parts/<экран>.data.js по README, «Как добавить данные».
window.APS = window.APS || {};
(() => {
  const CAT = window.APS.catalog;
  const TZ = '+03:00';
  const at = (date, time) => `${date}T${time}:00${TZ}`;

  // ---------- Дни и недели программы ----------
  const PROGRAM_START = '2026-08-31';                 // пн недели 1
  const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
  const weekStart = (w) => addDays(PROGRAM_START, (w - 1) * 7);

  // Короткие ключи упражнений -> ID каталога (parts/catalog.js)
  const EX = {
    ankle: 'ex_0a8d4f7c2e951b63', bwsquat: 'ex_7f3a91c4d8b2e605', goblet: 'ex_5b9e2a7d1c4f8063', lunge: 'ex_f2076d4a9c1e853b',
    curl: 'ex_90e4c2a7d15b8f63', ext: 'ex_b68d1f409c7a235e', calf: 'ex_14c7e9a2d5b8306f', hipflex: 'ex_da9f28b741c6035e',
    catcow: 'ex_0bc47de195a638f2', deadbug: 'ex_ed314a7c905b2f68', rdl: 'ex_c85e2a7d416fb930', bentrow: 'ex_19ae4c7b52d8f603',
    birddog: 'ex_91d5b38e0f64ca27', bridgebb: 'ex_39b1e8c5d7a2046f', cablerow: 'ex_d73a095c4e8b216f', pallof: 'ex_47b9e1d620a5c83f',
    bandwalk: 'ex_53b0e7a219dc846f', plank: 'ex_9c5a2e7d1f804b63', hamstr: 'ex_25e9a7c4d1b8603f', breath: 'ex_48f2ac769bd130e5',
    tspine: 'ex_c7204e9a5b1d836f', farmer: 'ex_f31c86a590d42e7b', bridge: 'ex_50b7d3a9c2e1684f',
  };
  for (const id of Object.values(EX)) if (!CAT.exercises[id]) throw new Error(`data.js: нет упражнения ${id} в parts/catalog.js`);

  // Рабочие веса по неделям 1-9 (кг). Неделя 4 - разгрузка. Румынская тяга - как на «Клиент: результат и прогресс»:
  // 60 · 62,5 · 65 · 60 · 65 · 67,5 · 67,5 · 70, на неделе 9 тренер снизил до 65 после боли («Конструктор тренировки»).
  const LOAD = {
    goblet:   [20, 24, 24, 20, 24, 28, 28, 28, 32],
    lunge:    [12, 12, 14, 10, 14, 16, 18, 18, 18],
    curl:     [35, 35, 37.5, 30, 37.5, 40, 40, 40, 40],
    ext:      [40, 40, 42.5, 35, 42.5, 45, 45, 45, 47.5],
    calf:     [16, 16, 18, 14, 18, 20, 20, 20, 20],
    rdl:      [60, 62.5, 65, 60, 65, 67.5, 67.5, 70, 65],
    bentrow:  [42.5, 45, 45, 40, 45, 47.5, 47.5, 50, 50],
    bridgebb: [60, 65, 70, 60, 70, 72.5, 75, 80, 82.5],
    cablerow: [47.5, 50, 50, 45, 50, 52.5, 52.5, 55, 55],
    pallof:   [10, 10, 12.5, 10, 12.5, 12.5, 15, 15, 15],
    farmer:   [20, 20, 22, 20, 22, 22, 24, 24, 24],
    plankSec: [40, 40, 40, 40, 45, 45, 45, 45, 40],
  };
  const RDL_RPE = [7, 7, 8, 6, 8, 7, 8, 9, 7];       // усилие на последнем подходе тяги (неделя 9 - для сценария «план закончился»)

  // ---------- Сборка тренировки в формах контракта ----------
  const T = (v) => ({ kind: 'exact', value: v });
  const set = (t, type = 'working') => ({ type, t });
  const sets = (n, t) => Array.from({ length: n }, () => set(t));
  const txt = (text, marks) => (marks ? { type: 'text', text, marks } : { type: 'text', text });
  const doc = (...paras) => ({ type: 'doc', content: paras.map((p) => ({ type: 'paragraph', content: Array.isArray(p) ? p : [txt(p)] })) });

  function element(wid, key, spec, o = {}) {
    const metrics = new Set();
    const planSets = spec.map((s, i) => {
      const targets = {};
      for (const [k, v] of Object.entries(s.t)) { targets[k] = typeof v === 'object' ? v : T(v); metrics.add(k); }
      return { id: `sp_${wid}_${key}_${i + 1}`, type: s.type, targets, ...(o.rest ? { restSec: o.rest } : {}) };
    });
    if (o.rpe) { const last = planSets[planSets.length - 1]; last.targets.rpe = { kind: 'range', min: o.rpe[0], max: o.rpe[1] }; metrics.add('rpe'); }
    return {
      id: `el_${wid}_${key}`, kind: 'exercise', exerciseId: EX[key], metrics: [...metrics], sets: planSets,
      ...(o.rest ? { restSec: o.rest } : {}), ...(o.notes ? { notes: o.notes } : {}),
      effortPrompt: o.effort || (spec.some((s) => s.t.weight) ? 'lastSet' : 'off'),
      ...(o.perSide ? { perSide: true } : {}),   // прототип: «на сторону» (в контракте нет, README - «Открытые вопросы»)
    };
  }
  let blockSeq = 0;
  const single = (role, el) => ({ id: `blk_${++blockSeq}`, role, scheme: 'single', syncSets: true, elements: [el] });
  const group = (role, els, restAfterRoundSec) => ({ id: `blk_${++blockSeq}`, role, scheme: 'superset', restAfterRoundSec, syncSets: true, elements: els });

  const LEGS = { title: 'Ноги', day: 1, offset: 1, format: 'inPerson', startTime: '19:00', durationMin: 60 };
  const PULL = { title: 'Тяга и корпус', day: 2, offset: 3, format: 'self', durationMin: 55 };
  const CORE = { title: 'Корпус и мобильность', day: 3, offset: 5, format: 'self', durationMin: 40 };
  const wid = (w, d) => `w${String(w).padStart(2, '0')}d${d.day}`;

  function legs(w) {
    const id = wid(w, LEGS), L = (k) => LOAD[k][w - 1];
    return [
      single('warmup', element(id, 'ankle', sets(1, { reps: 10 }), { perSide: true })),
      single('warmup', element(id, 'bwsquat', sets(1, { reps: 15 }))),
      single('main', element(id, 'goblet', sets(4, { weight: L('goblet'), reps: 8 }), { rest: 120 })),
      group('main', [
        element(id, 'lunge', sets(3, { weight: L('lunge'), reps: 10 }), { perSide: true }),
        element(id, 'curl', sets(3, { weight: L('curl'), reps: 12 })),
      ], 90),
      single('main', element(id, 'ext', sets(3, { weight: L('ext'), reps: 12 }), { rest: 75 })),
      single('main', element(id, 'calf', sets(3, { weight: L('calf'), reps: 15 }), { rest: 60 })),
      single('cooldown', element(id, 'hipflex', sets(2, { duration: 30 }), { perSide: true })),
    ];
  }
  function pull(w) {
    const id = wid(w, PULL), L = (k) => LOAD[k][w - 1];
    if (w < 9) return [   // недели 1-8 - как в плане/факте «Клиент: результат и прогресс» (6 упражнений, 19 подходов)
      single('main', element(id, 'rdl', sets(4, { weight: L('rdl'), reps: 8 }), { rest: 120, rpe: [7, 8] })),
      group('main', [
        element(id, 'bentrow', sets(3, { weight: L('bentrow'), reps: 10 })),
        element(id, 'birddog', sets(3, { reps: 8 }), { perSide: true }),
      ], 90),
      single('main', element(id, 'bridgebb', sets(3, { weight: L('bridgebb'), reps: 12 }), { rest: 90 })),
      single('main', element(id, 'cablerow', sets(3, { weight: L('cablerow'), reps: 12 }), { rest: 75 })),
      single('main', element(id, 'plank', sets(3, { duration: L('plankSec') }), { rest: 60 })),
    ];
    // Неделя 9 - как в «Конструкторе тренировки» тренера: разминка, тяга 65 кг с темпом, суперсет, трисет, заминка
    const rdlNote = { audience: 'client', body: doc([txt('Темп 3-1-1.', [{ type: 'bold' }, { type: 'highlight', color: 'marker1' }]), txt(' Остановись при любом дискомфорте в пояснице')]) };
    return [
      single('warmup', element(id, 'catcow', sets(2, { reps: 10 }))),
      single('warmup', element(id, 'deadbug', sets(2, { reps: 8 }), { perSide: true })),
      single('main', element(id, 'rdl', [set({ weight: 40, reps: 10 }, 'warmup'), ...sets(3, { weight: 65, reps: 8 })], { rest: 120, rpe: [7, 8], notes: [rdlNote] })),
      group('main', [
        element(id, 'bentrow', sets(3, { weight: 50, reps: 10 })),
        element(id, 'birddog', sets(3, { reps: 8 }), { perSide: true }),
      ], 90),
      single('main', element(id, 'bridgebb', sets(3, { weight: 82.5, reps: 12 }), { rest: 90 })),
      group('main', [
        element(id, 'cablerow', sets(3, { weight: 55, reps: 12 })),
        element(id, 'pallof', sets(3, { reps: 10 }), { perSide: true }),
        element(id, 'bandwalk', sets(3, { reps: 12 })),
      ], 90),
      single('main', element(id, 'plank', sets(3, { duration: 40 }), { rest: 60 })),
      single('cooldown', element(id, 'hamstr', sets(2, { duration: 30 }), { perSide: true })),
      single('cooldown', element(id, 'breath', sets(1, { duration: 120 }))),
    ];
  }
  function core(w) {
    const id = wid(w, CORE), L = (k) => LOAD[k][w - 1];
    return [
      single('warmup', element(id, 'catcow', sets(2, { reps: 10 }))),
      single('warmup', element(id, 'tspine', sets(2, { reps: 6 }), { perSide: true })),
      single('main', element(id, 'deadbug', sets(3, { reps: 10 }), { perSide: true, rest: 45 })),
      group('main', [
        element(id, 'pallof', sets(3, { weight: L('pallof'), reps: 10 }), { perSide: true }),
        element(id, 'farmer', sets(3, { weight: L('farmer'), distance: 40 })),
      ], 90),
      single('main', element(id, 'bridge', sets(3, { reps: 15 }), { rest: 45 })),
      single('main', element(id, 'plank', sets(3, { duration: 45 }), { rest: 45 })),
      single('cooldown', element(id, 'hipflex', sets(2, { duration: 30 }), { perSide: true })),
      single('cooldown', element(id, 'breath', sets(1, { duration: 120 }))),
    ];
  }

  const SERIES = { id: 'ser_igor_tue', clientId: 'cl_igor', rule: { weekdays: [2], startTime: '19:00', durationMin: 60 }, startsOn: '2026-05-12', format: 'inPerson', location: 'Зал на Садовой, 5', version: 4 };

  const workouts = [];
  for (let w = 1; w <= 9; w++) {
    for (const [def, build] of [[LEGS, legs], [PULL, pull], [CORE, core]]) {
      const id = `wk_${wid(w, def)}`;
      workouts.push({
        id, clientId: 'cl_igor', programId: 'prg_back', ...(def.format === 'inPerson' ? { seriesId: SERIES.id } : {}),
        title: def.title, tags: [],
        status: 'scheduled',                        // ниже проставляется по результату
        schedule: {
          date: addDays(weekStart(w), def.offset), durationMin: def.durationMin, format: def.format,
          ...(def.startTime ? { startTime: def.startTime, location: SERIES.location } : {}),
        },
        notes: [],
        blocks: build(w),
        version: 1, updatedAt: at(addDays(weekStart(w), -3), '18:00'),
      });
    }
  }
  const W = (id) => workouts.find((x) => x.id === id);

  // Неделя 8, день 2: тренер перенёс с чт, 22 окт на пт, 23 окт («перенесена с чт, 22 окт» на «Клиент: план»)
  W('wk_w08d2').schedule.date = '2026-10-23';
  // Неделя 9, день 2: назначена тренером из черновика «Конструктора» (сохранено 16:24 в пт, 23 окт), клиент видит с пт вечера
  Object.assign(W('wk_w09d2'), {
    notes: [{ audience: 'client', body: doc('Игорь, тягу сегодня начинаем с 65 кг - после прошлой тренировки не спешим. Остальное как обычно.') }],
    clientOpenedAt: at('2026-10-27', '21:12'), version: 3, updatedAt: at('2026-10-23', '18:42'),
  });
  W('wk_w09d1').clientOpenedAt = at('2026-10-26', '20:05');

  // ---------- Факт ----------
  // Как прошла каждая тренировка. Дни 2 недель 1-7 Игорь делал в пятницу вместо четверга - «тренировка не в свой день»
  // (решение 5): schedule.date не меняется, в факте фактическая дата.
  const RUN = {
    // неделя: [день 1, день 2, день 3]; null - нет факта
    1: [['2026-09-01', '19:02', 56], ['2026-09-04', '07:05', 50], ['2026-09-05', '10:10', 38]],
    2: [['2026-09-08', '19:00', 58], ['2026-09-11', '06:58', 51], ['2026-09-12', '10:05', 37]],
    3: [['2026-09-15', '19:01', 57], ['2026-09-18', '07:02', 52], ['2026-09-19', '10:20', 40]],
    4: [['2026-09-22', '19:00', 52], ['2026-09-25', '07:00', 46], ['2026-09-26', '10:00', 35]],
    5: [['2026-09-29', '19:03', 58], ['2026-10-02', '06:55', 53], ['2026-10-03', '10:12', 39]],
    6: [['2026-10-06', '19:00', 59], ['2026-10-09', '07:00', 52], ['2026-10-10', '10:08', 38]],
    7: [['2026-10-13', '19:02', 58], ['2026-10-16', '06:50', 51], null],
    8: [['2026-10-20', '19:00', 57], ['2026-10-23', '06:48', 52], null],
    9: [['2026-10-27', '19:01', 57], null, null],
  };
  const results = [], setResults = [];
  const iso = (d, hhmm, plusMin) => { const [h, m] = hhmm.split(':').map(Number); const t = h * 60 + m + plusMin; return at(d, `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`); };
  function complete(w, run, o = {}) {
    const [date, start, dur] = run;
    const source = o.source || 'client';
    const res = { workoutId: w.id, source, startedAt: iso(date, start, 0), completedAt: iso(date, start, dur), status: 'completed', attachments: [], ...o.result };
    results.push(res);
    let minute = 3;
    for (const b of w.blocks) for (const el of b.elements) {
      el.sets.forEach((sp, i) => {
        const values = {};
        for (const [k, t] of Object.entries(sp.targets)) if (k !== 'rpe' && t.kind === 'exact') values[k] = t.value;
        const fix = o.sets && o.sets[`${el.exerciseId}:${i + 1}`];
        if (fix) Object.assign(values, fix);
        const isLast = i === el.sets.length - 1;
        if (isLast && el.effortPrompt === 'lastSet' && o.rpe && o.rpe[el.exerciseId]) values.rpe = o.rpe[el.exerciseId];
        setResults.push({ id: `sr_${el.id.slice(3)}_${i + 1}`, workoutId: w.id, elementId: el.id, exerciseId: el.exerciseId, setPlanId: sp.id, values, done: true, recordedAt: iso(date, start, Math.min(minute, dur - 1)), recordedBy: source });
        minute += 2;
      });
    }
    w.status = 'completed';
    return res;
  }

  for (let w = 1; w <= 9; w++) {
    [LEGS, PULL, CORE].forEach((def, di) => {
      const run = RUN[w][di];
      if (!run) return;
      const wk = W(`wk_${wid(w, def)}`);
      const o = {};
      if (def === PULL) o.rpe = { [EX.rdl]: RDL_RPE[w - 1] };
      if (def === LEGS && w === 6) o.source = 'trainer';   // вт, 6 окт: Игорь забыл телефон, подходы внёс тренер - «внёс тренер»
      if (def === LEGS && w === 8) o.result = { rpe: 7 };    // самочувствие не внёс (сигнал тренера «Клиент не внёс самочувствие»)
      if (def === LEGS && w === 9) o.result = { rpe: 7, wellbeing: 4 };
      if (def === PULL && w === 8) {
        // пт, 23 окт: факт с «Результата тренировки» тренера - 19 из 19 подходов, 3 ниже плана, RPE 9, самочувствие 3/5, боль 4/10
        o.sets = { [`${EX.rdl}:3`]: { reps: 7 }, [`${EX.rdl}:4`]: { weight: 65, reps: 8 }, [`${EX.cablerow}:3`]: { reps: 10 } };
        o.result = { rpe: 9, wellbeing: 3, pain: { level: 4, note: 'Поясница', elementId: 'el_w08d2_rdl' } };
      }
      complete(wk, run, o);
    });
  }
  // вт, 20 окт: Игорь записал в третьем подходе сгибания ног 40 × 1 вместо 40 × 12, тренер исправил на следующий день -
  // «исправлено тренером» (BEHAVIOR.md 2.5). Значение в моках - уже исправленное.
  Object.assign(setResults.find((s) => s.id === 'sr_w08d1_curl_3'), { correctedAt: at('2026-10-21', '10:15'), correctedBy: 'trainer' });
  // сб, 17 окт: пропуск с причиной (как на «Клиент: история» тренера)
  results.push({ workoutId: 'wk_w07d3', source: 'client', status: 'missed', missReason: 'командировка', attachments: [] });
  W('wk_w07d3').status = 'missed';
  // сб, 24 окт: результата нет - у клиента «не отмечена», без упрёка (Клиентское приложение.md, 4)

  // ---------- Комментарии ----------
  const comments = [
    { id: 'cm_w08d2_1', workoutId: 'wk_w08d2', elementId: 'el_w08d2_rdl', author: 'client', body: 'На последнем подходе тяги потянуло поясницу, снизил вес до 65', createdAt: at('2026-10-23', '07:40'), readByTrainerAt: at('2026-10-23', '16:22') },
    { id: 'cm_w08d2_2', workoutId: 'wk_w08d2', author: 'client', body: 'Тягу в следующий раз делать с меньшим весом?', createdAt: at('2026-10-23', '07:52'), readByTrainerAt: at('2026-10-23', '16:22') },
    { id: 'cm_w08d2_3', workoutId: 'wk_w08d2', author: 'trainer', body: 'Правильно, что снизил и написал. Да, в четверг тяга с 65 кг и темпом 3-1-1 - план уже поправил. Если в субботу поясница будет беспокоить, напиши, подберу замену.', createdAt: at('2026-10-23', '21:10'), readByClientAt: at('2026-10-23', '21:31') },
    { id: 'cm_w09d1_1', workoutId: 'wk_w09d1', author: 'client', body: 'Спина в норме, в приседе ничего не тянуло', createdAt: at('2026-10-27', '20:06'), readByTrainerAt: at('2026-10-28', '21:35') },
    { id: 'cm_w09d1_2', workoutId: 'wk_w09d1', author: 'trainer', body: 'Отлично! Завтра тяга с 65 кг - держи темп 3-1-1 и не гонись за весом. Если поясница даст о себе знать, остановись и напиши здесь.', createdAt: at('2026-10-28', '21:40'), readByClientAt: at('2026-10-28', '22:03') },
  ];

  // ---------- Вес тела ----------
  const weights = [['2026-09-02', 85.3], ['2026-09-09', 85.0], ['2026-09-16', 84.6], ['2026-09-23', 84.0], ['2026-09-30', 83.7], ['2026-10-07', 83.2], ['2026-10-14', 82.9], ['2026-10-21', 82.4]];
  const measurements = weights.map(([d, v], i) => ({ id: `ms_${i + 1}`, clientId: 'cl_igor', type: 'bodyWeight', value: { value: v, unit: 'kg' }, measuredAt: at(d, '08:00'), source: 'client' }));

  // ---------- Мир на «сейчас» по умолчанию: чт, 29 окт, 08:10 ----------
  const base = {
    now: '2026-10-29T08:10',
    trainer: {
      id: 'tr_maxim', name: 'Максим Белов', initials: 'МБ', title: 'Персональный тренер',
      about: 'Силовая и функциональная подготовка, восстановление спины',
      contacts: { telegram: 'maxim_belov_coach' },
      settings: { timezone: 'Europe/Moscow', units: { weight: 'kg', distance: 'km' }, effortDisplay: 'plain' },
    },
    client: {
      id: 'cl_igor', name: 'Игорь Петров', initials: 'ИП', format: 'hybrid', status: 'active', startedOn: '2026-05-11',
      goal: { text: 'Сильная спина без болей, тяга 100 кг к марту', target: { value: 100, unit: 'kg' }, metric: 'weight', targetDate: '2027-03-31' },
      keyExerciseIds: [EX.rdl, EX.bentrow, EX.bridgebb, EX.goblet],
      contacts: { telegram: 'igor_petrov' },
    },
    // Настройки тренера по умолчанию (BRIEF.md, К2): объём, расчётный максимум и выполнение плана клиенту не видны
    visibility: { ownResults: true, records: true, workingWeights: true, completedCount: true, bodyWeight: true, volume: false, estimatedMax: false, adherence: false },
    program: { id: 'prg_back', clientId: 'cl_igor', title: 'Сильная спина', startsOn: PROGRAM_START, endsOn: '2026-11-22', goal: 'Сильная спина без болей', version: 2,
      weeks: 12, deloadWeeks: [4] },             // прототип: число недель и разгрузка - для подписи «неделя 9 из 12» и графиков
    series: [SERIES],
    // До программы: «Основа», 11 мая - 30 авг (прототип). Лучшие подходы до программы - основа рекордов, чтобы рекорды
    // совпадали с экранами тренера: тяга 70 кг и мост 75 кг уже были до программы.
    before: { from: '2026-05-11', to: '2026-08-30', title: 'Основа', completed: 38,
      best: { [EX.rdl]: { weight: 70, reps: 6 }, [EX.bentrow]: { weight: 50, reps: 8 }, [EX.bridgebb]: { weight: 75, reps: 10 }, [EX.cablerow]: { weight: 55, reps: 10 } } },
    workouts, results, setResults, comments, measurements,
    // Дополнение тренера к упражнению каталога (ExerciseAddon) и медиа: видео-ссылка и заметка к румынской тяге - для «Упражнения».
    // Ссылка - заглушка прототипа (наружу не ведёт): реальное видео тренера появится в продукте.
    addons: [{ exerciseId: EX.rdl, media: [{ mediaId: 'md_rdl_video', visibleToClient: true }], note: doc([txt('Спина нейтральная весь подход. '), txt('Штанга скользит по бёдрам', [{ type: 'bold' }]), txt(', колени чуть согнуты и не уходят вперёд.')]), version: 2 }],
    media: [{ id: 'md_rdl_video', kind: 'videoLink', url: '', provider: 'youtube', title: 'Румынская тяга: техника и частые ошибки', durationSec: 94, status: 'ready', owner: { type: 'trainer', id: 'tr_maxim' } }],
    // Живые выводы готовой строкой (идея, Клиентское приложение.md, 4; правила вывода - Инбокс фич, решение пользователя 2026-10-24).
    // Поле прототипа вне контракта. Рост рабочего веса от недели 1 программы, недели считаются включительно; числа - из LOAD выше.
    //   big, tail, from → to - цифра-герой «Прогресса»; hero - кто первый: румынская тяга, как герой «Клиента: результат и прогресс»
    //          тренера. Герой показывается, только пока не спорит с графиком (последний рабочий вес = to): когда тяга после боли
    //          снова 65 кг («План закончился», или клиент провёл сегодняшнюю), герой - ягодичный мост;
    //   text - строка «Завершения и итога» по упражнению тренировки. У тяги её нет: сегодня она 65 кг, «+10 кг» спорило бы с итогом.
    insights: [
      { exerciseId: EX.rdl, hero: true, big: '+10\u00a0кг', tail: 'за 8 недель!', from: 60, to: 70 },
      { exerciseId: EX.bridgebb, big: '+22,5\u00a0кг', tail: 'за 9 недель!', from: 60, to: 82.5, text: '+22,5\u00a0кг в ягодичном мосте за 9 недель!' },
      { exerciseId: EX.bentrow, text: '+7,5\u00a0кг в тяге в наклоне с начала программы' },
      { exerciseId: EX.goblet, text: 'Кубковый присед: с 20 до 32\u00a0кг за 9 недель' },
    ],
    ex: EX,
  };

  // ---------- Сценарии: «сейчас» и что в мире изменилось ----------
  // Переключаются параметром ?state=<id> (README, «Состояния»). Сценарий со «сейчас» раньше по умолчанию сначала убирает всё,
  // что случилось позже (факт, комментарии, прочтение, замеры), затем вносит свои изменения.
  const later = (inst, now) => inst && inst.slice(0, 16) > now;
  function rewind(db) {
    const now = db.now;
    const gone = new Set(db.results.filter((r) => later(r.completedAt || r.startedAt, now)).map((r) => r.workoutId));
    db.results = db.results.filter((r) => !gone.has(r.workoutId));
    db.setResults = db.setResults.filter((s) => !gone.has(s.workoutId));
    for (const w of db.workouts) if (gone.has(w.id)) w.status = 'scheduled';
    db.comments = db.comments.filter((c) => !later(c.createdAt, now));
    for (const c of db.comments) { if (later(c.readByClientAt, now)) delete c.readByClientAt; if (later(c.readByTrainerAt, now)) delete c.readByTrainerAt; }
    db.measurements = db.measurements.filter((m) => !later(m.measuredAt, now));
    for (const w of db.workouts) if (later(w.clientOpenedAt, now)) delete w.clientOpenedAt;
  }
  // Частично выполненная тренировка: первые n подходов по плану (сценарии «прервана» и «отмечает тренер»)
  function startPartial(db, workoutId, source, startedAt, n) {
    const w = db.workouts.find((x) => x.id === workoutId);
    db.results.push({ workoutId, source, startedAt, status: 'inProgress', attachments: [] });
    w.status = 'inProgress';
    let k = 0;
    for (const b of w.blocks) for (const el of b.elements) el.sets.forEach((sp, i) => {
      if (k++ >= n) return;
      const values = {};
      for (const [m, t] of Object.entries(sp.targets)) if (m !== 'rpe' && t.kind === 'exact') values[m] = t.value;
      const t0 = startedAt.slice(11, 16);
      db.setResults.push({ id: `sr_${el.id.slice(3)}_${i + 1}`, workoutId, elementId: el.id, exerciseId: el.exerciseId, setPlanId: sp.id, values, done: true, recordedAt: iso(startedAt.slice(0, 10), t0, 2 + k * 2), recordedBy: source });
    });
  }

  const SCENARIOS = {
    today: { label: 'Сегодня тренировка «сам»', now: '2026-10-29T08:10' },
    inperson: { label: 'Сегодня очная тренировка', now: '2026-10-27T08:30' },
    reply: { label: 'Новый ответ тренера', now: '2026-10-29T08:10', apply(db) { delete db.comments.find((c) => c.id === 'cm_w09d1_2').readByClientAt; } },
    paused: { label: 'Тренировка прервана', now: '2026-10-29T08:41', apply(db) { startPartial(db, 'wk_w09d2', 'client', at('2026-10-29', '08:12'), 4); } },
    rest: { label: 'День отдыха', now: '2026-10-28T09:00' },
    'plan-ended': { label: 'План закончился', now: '2026-11-02T09:00', apply(db) {
      // Неделя 9 закрыта: чт и сб - как в плане; неделя 10 у тренера не собрана (черновики клиент не видит)
      const w9d2 = db.workouts.find((x) => x.id === 'wk_w09d2'), w9d3 = db.workouts.find((x) => x.id === 'wk_w09d3');
      db.__complete(w9d2, ['2026-10-29', '08:15', 54], { rpe: { [EX.rdl]: RDL_RPE[8] }, result: { rpe: 7, wellbeing: 4 } });
      db.__complete(w9d3, ['2026-10-31', '10:05', 41], { result: { wellbeing: 4 } });
    } },
    'trainer-records': { label: 'Тренировку отмечает тренер', now: '2026-10-27T19:25', apply(db) { startPartial(db, 'wk_w09d1', 'trainer', at('2026-10-27', '19:02'), 7); } },
    disconnected: { label: 'Тренер отключил клиента', now: '2026-10-29T08:10', apply(db) {
      // Тренер перевёл клиента в архив 28 окт: новых тренировок нет, история - на чтение (решение 8)
      db.client.status = 'archived';
      db.client.archivedAt = '2026-10-28T12:00:00+03:00';     // прототип: дата архивации, в контракте Client её нет
      db.workouts = db.workouts.filter((w) => w.status !== 'scheduled' || w.schedule.date < db.now.slice(0, 10));
    } },
  };

  function make(stateId) {
    const db = structuredClone(base);
    const sc = SCENARIOS[stateId] || SCENARIOS.today;
    db.now = sc.now;
    db.state = SCENARIOS[stateId] ? stateId : 'today';
    // complete() пишет в общие массивы - для сценария отдаём версию, которая пишет в db
    db.__complete = (w, run, o) => {
      const keepR = results.length, keepS = setResults.length;
      complete(w, run, o);
      db.results.push(...results.splice(keepR)); db.setResults.push(...setResults.splice(keepS));
    };
    rewind(db);
    if (sc.apply) sc.apply(db);
    delete db.__complete;
    // Отметки клиента (parts/session.data.js) и свои моки экрана, если появятся: функция в APS.extenders (README, «Как добавить данные»)
    for (const f of window.APS.extenders || []) f(db, { at, addDays, doc, txt, EX, state: db.state });
    // ?day=same&w=<id> - параметр «Результата тренировки»: смотреть тренировку вечером её дня (21:30), пока свои записи ещё можно
    // исправить (ARCHITECTURE, «Кто вносит факт»). «Сейчас» сдвигается назад, всё, что случилось позже, убирает тот же rewind().
    const p = new URLSearchParams(location.search);
    const r = p.get('day') === 'same' && db.results.find((x) => x.workoutId === p.get('w'));
    const eve = r && r.completedAt && `${r.completedAt.slice(0, 10)}T21:30`;
    if (eve && eve < db.now) { db.now = eve; rewind(db); }
    return db;
  }

  window.APS.SCENARIOS = Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, { label: v.label, now: v.now }]));
  window.APS.makeDb = make;
})();
