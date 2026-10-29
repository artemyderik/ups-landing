// Отметки клиента в прототипе (сессия 2): что клиент внёс в «Выполнении тренировки» и «Завершении и итоге».
// Хранятся в sessionStorage вкладки отдельно по сценарию (?state) и вписываются в db в формах контракта design/ARCHITECTURE.md:
// SetResult (recordedBy: "client"), WorkoutResult (source: "client"), Comment (author: "client"). Тогда APS.q (подходы, рекорды,
// «Продолжить с упражнения N») сразу видит отметки клиента, а переход на «Упражнение» и обратно, перезагрузка и «нет сети»
// ничего не теряют. Подключать после data.js и до model.js (README, «Как добавить данные»). Новая вкладка - снова чистые моки.
// Подключён на всех экранах: после «Завершения» «Сегодня», «План», «Результат» и «Прогресс» показывают сделанное. Здесь же -
// пропуск с причиной из «Плана» (WorkoutResult.status: "missed") и прочитанные ответы тренера (Comment.readByClientAt).
window.APS = window.APS || {};
(() => {
  const KEY = (state) => `aps-client-run-v1:${state}`;
  const read = (state) => { try { return JSON.parse(sessionStorage.getItem(KEY(state)) || 'null'); } catch (e) { return null; } };
  const write = (state, data) => { try { sessionStorage.setItem(KEY(state), JSON.stringify(data)); return true; } catch (e) { return false; } };

  let store = { workouts: {} }, stateId = 'today';

  // «Сейчас» прототипа идёт от «сейчас» сценария и дальше по настоящим часам: отметка в 08:14, если зашли в 08:10 четыре минуты назад
  const pad = (n) => String(n).padStart(2, '0');
  function now() {
    const [d, t] = store.clock.now.split('T');
    const [y, m, day] = d.split('-').map(Number), [h, mi] = t.split(':').map(Number);
    const ms = Date.UTC(y, m - 1, day, h, mi) + Math.max(0, Date.now() - store.clock.real);
    const x = new Date(ms);
    return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}T${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}:00+03:00`;
  }

  // Вписать отметки одной тренировки в db: подход - заменить по id или добавить; результат - слить; комментарии - добавить
  function apply(db, wid) {
    const run = store.workouts[wid];
    const w = db.workouts.find((x) => x.id === wid);
    if (!run || !w) return;
    for (const s of Object.values(run.sets)) {
      const i = db.setResults.findIndex((x) => x.id === s.id);
      if (i >= 0) db.setResults[i] = s; else db.setResults.push(s);
    }
    for (const id of run.removed || []) { const i = db.setResults.findIndex((x) => x.id === id); if (i >= 0) db.setResults.splice(i, 1); }
    if (run.result) {
      const i = db.results.findIndex((r) => r.workoutId === wid);
      const merged = { ...(i >= 0 ? db.results[i] : { workoutId: wid, attachments: [] }), ...run.result };
      if (i >= 0) db.results[i] = merged; else db.results.push(merged);
      w.status = merged.status;
    }
    for (const c of run.comments) if (!db.comments.some((x) => x.id === c.id)) db.comments.push(c);
  }

  APS.run = {
    now,
    of(wid) { return store.workouts[wid] || null; },
    // Запись тренировки: sets - SetResult по id, removed - id подходов, которые клиент вернул, result - поля WorkoutResult,
    // comments - Comment клиента, ui - место на экране (упражнение, отдых, открытый бегунок, правка), pending - отметки без сети
    ensure(wid) { return store.workouts[wid] || (store.workouts[wid] = { sets: {}, removed: [], result: null, comments: [], ui: {}, pending: 0 }); },
    save() { return write(stateId, store); },
    apply,
    clear(wid) { delete store.workouts[wid]; write(stateId, store); },
    // Клиент открыл ответы тренера (ветка «Результата»): с «Сегодня» уходит «Новый ответ тренера»
    read(ids) { store.read = store.read || {}; const t = now(); for (const id of ids) if (!store.read[id]) store.read[id] = t; write(stateId, store); },
  };

  (APS.extenders = APS.extenders || []).push((db, { EX, state }) => {
    stateId = state;
    store = read(state) || { workouts: {} };
    if (!store.clock) store.clock = { now: db.now, real: Date.now() };
    write(state, store);
    for (const wid of Object.keys(store.workouts)) apply(db, wid);
    for (const c of db.comments) if (store.read && store.read[c.id] && !c.readByClientAt) c.readByClientAt = store.read[c.id];
    // «Сейчас» мира - не раньше последней отметки клиента: тренировка, завершённая в 09:05, - уже «последний итог», а не будущее
    const times = Object.values(store.workouts).flatMap((r) => [...Object.values(r.sets).map((x) => x.recordedAt), r.result && r.result.completedAt, ...r.comments.map((c) => c.createdAt)])
      .concat(Object.values(store.read || {})).filter(Boolean).map((x) => x.slice(0, 16));
    const t = times.sort().pop();
    if (t && t > db.now) db.now = t;
  });
})();
