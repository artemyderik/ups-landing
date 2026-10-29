// «Прогресс» клиента - по настройкам видимости тренера (VisibilitySettings; Клиентское приложение.md, 4 «Между тренировками»;
// BEHAVIOR.md 5.10 «Прогресс клиента»). По умолчанию видно: рекорды, рабочий вес в ключевых упражнениях, число тренировок, вес тела.
// Объём и тоннаж, расчётный максимум, процент выполнения плана - скрыты, пока тренер их не включит; здесь их нет.
// Сигналов внимания, «отстаёт» и заметок тренера у клиента нет никогда.
// Живой вывод - готовой строкой из моков (db.insights, герой - hero; parts/data.js); праздник - на свежем рекорде.
(() => {
  const { q, fmt, esc, ui } = APS;
  const { icon, href } = ui;
  const T = q.db.trainer, C = q.db.client, P = q.db.program, V = q.db.visibility;
  const NB = fmt.NBSP;
  const archived = q.archived();
  const weekOf = (date) => q.week({ schedule: { date } });
  const cur = Math.min(weekOf(q.today), P.weeks);

  // Рабочий вес по неделям: лучший вес в выполненных подходах упражнения за неделю программы (кэш из SetResult, ARCHITECTURE)
  function series(exerciseId) {
    const byW = new Map();
    for (const s of q.db.setResults) {
      if (!s.done || s.exerciseId !== exerciseId || s.values.weight == null) continue;
      const w = q.workout(s.workoutId); if (!w) continue;
      const n = q.week(w);
      byW.set(n, Math.max(byW.get(n) ?? 0, s.values.weight));
    }
    return [...byW.entries()].sort((a, b) => a[0] - b[0]).map(([week, v]) => ({ week, v }));
  }

  // ---------- Полоса: живой вывод - одна цифра-герой на экран ----------
  // Герой - вывод, который не спорит с графиком: последний рабочий вес упражнения равен «to» вывода. Сначала - отмеченный hero
  // (тяга, как у тренера); если тяга снова 65 кг (после боли: в «План закончился» или после сегодняшней тренировки) - мост.
  const lastW = (id) => { const s = series(id); return s.length ? s[s.length - 1].v : null; };
  const heroes = (q.db.insights || []).filter((x) => x.big && lastW(x.exerciseId) === x.to);
  const I = heroes.find((x) => x.hero) || heroes[0] || null;
  const band = `<p class="label band__eyebrow">Программа «${esc(P.title)}»${cur >= 1 && !archived ? ` · неделя ${cur} из ${P.weeks}` : ''}</p>
    <h1 class="band__title">Прогресс</h1>
    ${I && V.workingWeights ? `<div class="prg-hero">
      <p class="label on-dark-2">${esc(q.name(I.exerciseId))} · рабочий вес</p>
      <p class="prg-hero__num"><span class="num">${I.big}</span> <span class="prg-hero__t">${esc(I.tail)}</span></p>
      <p class="prg-hero__cap num">${fmt.num(I.from)} → ${fmt.kg(I.to)}</p>
    </div>` : ''}`;

  // ---------- Лист ----------
  const sections = [];
  if (archived) sections.push(`<div class="banner" role="note">${icon('history')}<p class="banner__t"><b>${esc(T.name)} отключил вас ${fmt.dayMonth(C.archivedAt)}.</b> Прогресс и история остаются у вас - на чтение.</p></div>`);

  const records = V.records ? q.records() : [];

  // Праздник на свежем рекорде: рекорды последней тренировки с рекордами, если она была за последние 7 дней
  if (records.length) {
    const lastDate = records[records.length - 1].date;
    if (lastDate >= q.addDays(q.today, -7)) {
      const fresh = records.filter((r) => r.date === lastDate);
      const [p0, ...more] = fresh;
      sections.push(`<section class="card card--dark good prg-good" aria-labelledby="h-good">
        <h2 class="label on-dark-2" id="h-good">${fresh.length > 1 ? 'Новые рекорды' : 'Новый рекорд'} · ${fmt.date(lastDate)}</h2>
        <p class="good__num"><span class="good__badge">${ui.rays()}${icon('crown', 'good__crown')}</span><span class="num">${fmt.setVal(p0.values)}</span><span class="good__delta">+${fmt.kg(p0.weight - p0.prev)}</span></p>
        <span class="cat-badge good__cat" aria-hidden="true">${ui.cat('cat-happy', 77)}</span>
        <p class="good__who"><b>${esc(q.name(p0.exerciseId))}</b> · было ${fmt.kg(p0.prev)}</p>
        ${more.length ? `<ul class="good__list">${more.map((p) => `<li><p class="good__t"><b>${esc(q.name(p.exerciseId))}</b> · <span class="prg-good__d">+${fmt.kg(p.weight - p.prev)}</span></p><span class="good__n num">${fmt.setVal(p.values)}</span></li>`).join('')}</ul>` : ''}
        <a class="link prg-good__go" href="${href('result.html', { w: p0.workoutId, back: 'progress' })}">Результат тренировки${icon('arrowR')}</a>
      </section>`);
    }
  }

  // Рабочий вес: одна метрика по одному упражнению, выбор - среди ключевых упражнений клиента
  const keys = (C.keyExerciseIds || []).filter((id) => series(id).length);
  let exSel = I && keys.includes(I.exerciseId) ? I.exerciseId : keys[0];
  if (V.workingWeights && keys.length) {
    sections.push(`<section class="sec prg-ww" aria-labelledby="h-ww">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-ww">Рабочий вес</h2><span class="small muted num prg-ww__sum"></span></div>
      <details class="menu prg-pick">
        <summary class="select" aria-haspopup="listbox"><span class="prg-pick__v"></span>${icon('chevD')}</summary>
        <div class="menu__pop" role="listbox" aria-label="Упражнение">${keys.map((id) => `<button type="button" role="option" data-ex="${id}" aria-selected="false">${icon('check', 'prg-pick__ok')}<span>${esc(q.name(id))}</span></button>`).join('')}</div>
      </details>
      <div class="prg-chart-wrap"></div>
    </section>`);
  }

  // Рекорды по упражнениям: последний рекорд пилюлей с короной, путь рекордов строкой; строка ведёт в результат тренировки
  if (V.records) {
    const byEx = new Map();
    for (const r of records) { if (!byEx.has(r.exerciseId)) byEx.set(r.exerciseId, []); byEx.get(r.exerciseId).push(r); }
    const groups = [...byEx.entries()].sort((a, b) => b[1][b[1].length - 1].date.localeCompare(a[1][a[1].length - 1].date));
    sections.push(`<section class="sec" aria-labelledby="h-rec">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-rec">Рекорды</h2><span class="small muted">${records.length ? `${fmt.count(records.length, ['рекорд', 'рекорда', 'рекордов'])} в программе` : ''}</span></div>
      ${groups.length ? `<ol class="prg-recs">${groups.map(([id, list]) => {
        const top = list[list.length - 1];
        const path = [list[0].prev, ...list.map((x) => x.weight)].map(fmt.num).join(' → ');
        return `<li class="prg-rec">
          <a class="prg-rec__a" href="${href('result.html', { w: top.workoutId, back: 'progress' })}"><b>${esc(q.name(id))}</b></a>
          <span class="prg-rec__v"><span class="set set--pr">${icon('crown')}${fmt.setVal(top.values)}</span><span class="small muted">${fmt.date(top.date)}</span></span>
          <span class="small muted num prg-rec__path">${path}${NB}кг${list.length > 1 ? ` · ${fmt.count(list.length, ['рекорд', 'рекорда', 'рекордов'])}` : ''}</span>
          ${icon('chevR', 'i--m prg-rec__go')}
        </li>`;
      }).join('')}</ol>` : `<p class="muted">Рекордов пока нет. Первый появится, когда вес в подходе превысит лучший прежний.</p>`}
    </section>`);
  }

  // Число выполненных тренировок - количество, без процента выполнения (скрыт по умолчанию)
  if (V.completedCount) {
    const inProg = q.db.results.filter((r) => r.status === 'completed' || r.status === 'partial').length;
    const all = q.completedCount();
    sections.push(`<section class="sec" aria-labelledby="h-cnt">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-cnt">Тренировки</h2><a class="link" href="${href('plan.html')}">История${icon('arrowR')}</a></div>
      <div class="prg-stats">
        <p class="card card--md"><span class="h2 num">${all}</span><span class="small muted">${fmt.plural(all, ['тренировка', 'тренировки', 'тренировок'])} с ${fmt.dayMonth(C.startedOn)}</span></p>
        <p class="card card--md"><span class="h2 num">${inProg}</span><span class="small muted">в программе «${esc(P.title)}»</span></p>
      </div>
    </section>`);
  }

  // Вес тела и «Добавить замер» (Measurement, source: client)
  if (V.bodyWeight) sections.push(`<section class="sec" aria-labelledby="h-bw">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-bw">Вес тела</h2></div>
      <div class="card prg-bw"></div>
    </section>`);

  ui.page({ screen: 'progress', title: 'Прогресс', tab: 'progress', band, body: `<div class="stack">${sections.join('')}</div>` });

  // ---------- График рабочего веса ----------
  // Компонент «Графики» (DESIGN.md 5.4): линия --ink 2 px, последняя точка лайм с кольцом, подпись последнего - чёрная пилюля
  // у правого края; разгрузочная неделя подписана. Точность - до 0,5 кг (BEHAVIOR.md 5.1). На телефоне подписи у первой,
  // последней и через одну.
  function chart(exerciseId) {
    const pts = series(exerciseId);
    const vals = pts.map((p) => p.v);
    let lo = Math.floor((Math.min(...vals) - 2.5) / 5) * 5, hi = Math.ceil((Math.max(...vals) + 2.5) / 5) * 5;
    if (hi - lo < 10) hi = lo + 10;
    const step = (hi - lo) / 4;
    const x = (i) => (pts.length === 1 ? 50 : 3 + (94 * i) / (pts.length - 1));
    const y = (v) => 100 - ((v - lo) / (hi - lo)) * 100;
    const show = (i) => i === 0 || i === pts.length - 1 || (i % 2 === 0 && i <= pts.length - 3);   // «нед 1, 3, 5, 8», как в c2
    const deload = (P.deloadWeeks || []);
    const label = `Рабочий вес, ${q.name(exerciseId)}, по неделям: ${pts.map((p) => `${fmt.num(p.v)}${deload.includes(p.week) ? ' (разгрузка)' : ''}`).join(', ')} кг`;
    return `<div class="prg-chart" role="img" aria-label="${esc(label)}">
      <svg class="prg-chart__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <g class="prg-chart__grid">${[0, 1, 2, 3, 4].map((k) => `<line x1="0" x2="100" y1="${k * 25}" y2="${k * 25}"/>`).join('')}</g>
        <polyline class="prg-chart__line" points="${pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')}"/>
      </svg>
      ${[0, 1, 2, 3, 4].map((k) => `<span class="prg-chart__y" style="top:${k * 25}%">${fmt.num(hi - k * step)}</span>`).join('')}
      ${pts.map((p, i) => `<span class="prg-chart__pt${i === pts.length - 1 ? ' prg-chart__pt--last' : ''}" style="left:${x(i)}%;top:${y(p.v)}%"></span>`).join('')}
      ${pts.map((p, i) => (i === pts.length - 1
        ? `<span class="prg-chart__v prg-chart__v--last" style="left:${x(i)}%;top:${y(p.v)}%">${fmt.kg(p.v)}</span>`
        : show(i) || deload.includes(p.week) ? `<span class="prg-chart__v" style="left:${x(i)}%;top:${y(p.v)}%">${fmt.num(p.v)}</span>` : '')).join('')}
      ${pts.map((p, i) => (deload.includes(p.week) ? `<span class="prg-chart__note" style="left:${x(i)}%;top:${y(p.v)}%">разгрузка</span>` : '')).join('')}
      ${pts.map((p, i) => (show(i) ? `<span class="prg-chart__x" style="left:${x(i)}%">нед${NB}${p.week}</span>` : '')).join('')}
    </div>`;
  }
  function drawChart() {
    const wrap = document.querySelector('.prg-chart-wrap'); if (!wrap) return;
    const pts = series(exSel);
    wrap.innerHTML = chart(exSel);
    document.querySelector('.prg-ww__sum').textContent = pts.length > 1 ? `${fmt.num(pts[0].v)} → ${fmt.kg(pts[pts.length - 1].v)}` : '';
    document.querySelector('.prg-pick__v').textContent = q.name(exSel);
    for (const o of document.querySelectorAll('.prg-pick [role="option"]')) o.setAttribute('aria-selected', String(o.dataset.ex === exSel));
  }
  drawChart();
  const pick = document.querySelector('.prg-pick');
  if (pick) pick.addEventListener('click', (e) => {
    const o = e.target.closest('[role="option"]'); if (!o) return;
    exSel = o.dataset.ex; drawChart(); pick.open = false; pick.querySelector('summary').focus();
  });

  // ---------- Вес тела ----------
  const bwBox = document.querySelector('.prg-bw');
  const ms = () => q.db.measurements.filter((m) => m.type === 'bodyWeight').sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  function spark(list) {
    if (list.length < 2) return '';
    const v = list.map((m) => m.value.value), lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
    const pts = v.map((val, i) => [4 + (192 * i) / (v.length - 1), 6 + 44 * (1 - (val - lo) / span)]);
    // Линия тянется по ширине при постоянной высоте; точка - отдельным элементом, чтобы не сплющивалась (как точки графика)
    const [lx, ly] = pts[pts.length - 1];
    return `<div class="prg-spark" aria-hidden="true"><svg class="prg-spark__svg" viewBox="0 0 200 56" preserveAspectRatio="none"><polyline class="prg-spark__l" points="${pts.map((p) => p.join(',')).join(' ')}"/></svg><span class="prg-spark__p" style="left:${(lx / 2).toFixed(2)}%;top:${((ly / 56) * 100).toFixed(2)}%"></span></div>
      <p class="prg-spark__x small muted"><span>${fmt.dayMonth(list[0].measuredAt)}</span><span>${fmt.dayMonth(list[list.length - 1].measuredAt)}</span></p>`;
  }
  function drawBw(note = '') {
    if (!bwBox) return;
    const list = ms(), lastM = list[list.length - 1];
    if (!lastM) { bwBox.innerHTML = `<p class="muted">Замеров пока нет.</p>${archived ? '' : addBtn()}`; return; }
    const ref = list.filter((m) => m.measuredAt.slice(0, 10) <= q.addDays(lastM.measuredAt.slice(0, 10), -28)).pop();
    const delta = ref ? lastM.value.value - ref.value.value : null;
    bwBox.innerHTML = `${note}
      <p class="prg-bw__v"><span class="h1 num">${fmt.kg(lastM.value.value)}</span></p>
      <p class="small muted">${delta != null && Math.abs(delta) >= 0.05 ? `${delta > 0 ? '+' : '−'}${fmt.kg(Math.abs(delta))} за 4 недели · ` : ''}${fmt.date(lastM.measuredAt)}${lastM.source === 'client' ? '' : ' · внёс тренер'}</p>
      ${spark(list)}
      ${archived ? '' : addBtn()}`;
    const b = bwBox.querySelector('.prg-bw__add'); if (b) b.addEventListener('click', openForm);
  }
  const addBtn = () => `<button type="button" class="btn btn--block prg-bw__add">${icon('plus')}Добавить замер</button>`;
  function openForm() {
    const b = bwBox.querySelector('.prg-bw__add');
    b.outerHTML = `<form class="prg-bw__f" novalidate>
      <div class="fl">
        <label class="fl__l" for="bw-v">Вес сегодня</label>
        <div class="field">${icon('scale')}<input id="bw-v" inputmode="decimal" autocomplete="off" placeholder="${fmt.num(ms().pop().value.value)}" aria-describedby="bw-err"><span class="field__u">кг</span></div>
        <p class="fl__err" id="bw-err" hidden>${icon('alert')}<span>Укажите вес числом, например 82,4</span></p>
        <p class="fl__hint">Тренер увидит замер в вашем прогрессе.</p>
      </div>
      <div class="prg-bw__acts"><button type="submit" class="btn btn--dark">${icon('check')}Сохранить</button><button type="button" class="btn btn--ghost prg-bw__cancel">Отмена</button></div>
    </form>`;
    const f = bwBox.querySelector('form'), inp = f.querySelector('input'), err = f.querySelector('.fl__err'), field = f.querySelector('.field');
    inp.focus();
    f.querySelector('.prg-bw__cancel').addEventListener('click', () => { drawBw(); bwBox.querySelector('.prg-bw__add').focus(); });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = inp.value.trim().replace(',', '.');
      const v = Number(raw);
      if (!/^\d+(\.\d+)?$/.test(raw) || v < 30 || v > 300) { err.hidden = false; field.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
      q.db.measurements.push({ id: `ms_new_${Date.now()}`, clientId: C.id, type: 'bodyWeight', value: { value: Math.round(v * 10) / 10, unit: 'kg' }, measuredAt: `${q.now}:00+03:00`, source: 'client' });
      drawBw(`<div class="banner banner--ok prg-bw__ok" role="status">${icon('check')}<p class="banner__t"><b>Замер сохранён.</b> ${esc(T.name)} увидит его.</p></div>`);
      bwBox.querySelector('.prg-bw__add').focus();
    });
  }
  drawBw();
})();
