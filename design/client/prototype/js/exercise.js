// «Упражнение» - как выполнять и моя история (Клиентское приложение.md, 4 «Во время»; 6, экран 4).
// ?ex=<exerciseId> - упражнение; &w=&el= - из какой тренировки: план на сегодня, заметки тренера к упражнению, номер;
// &back=session|workout|plan|progress|result - куда «назад» (по умолчанию - обзор тренировки, если есть w, иначе «Прогресс»);
// &wback=plan - обзор открыт из «Плана»: «назад» в обзор сохраняет его «назад» в «План».
// Из «Выполнения тренировки» (back=session) возврат - на то же упражнение и подход: место хранит parts/session.data.js.
(() => {
  const { q, fmt, esc, ui, kit } = APS;
  const { icon, href } = ui;
  const P = new URLSearchParams(location.search);
  const CAT = APS.catalog;
  const T = q.db.trainer;
  const ROLE = { warmup: 'разминка', main: 'основная часть', cooldown: 'заминка', recovery: 'восстановление' };

  const ex = q.ex(P.get('ex')) || q.ex(q.db.ex.rdl);
  const w = q.workout(P.get('w'));
  const flat = w ? q.flat(w) : [];
  const x = flat.find((f) => f.el.id === P.get('el')) || flat.find((f) => f.el.exerciseId === ex.id) || null;
  const from = P.get('back') || (w ? 'workout' : 'progress');
  const BACK = {
    session: w && { href: `session.html?w=${w.id}`, label: 'Тренировка' },
    workout: w && { href: `workout.html?w=${w.id}${P.get('wback') === 'plan' ? '&back=plan' : ''}`, label: 'Обзор' },   // обзор помнит свой «назад» в «План»
    result: w && { href: `result.html?w=${w.id}`, label: 'Результат' },
    plan: { href: 'plan.html', label: 'План' },
    progress: { href: 'progress.html', label: 'Прогресс' },
  };
  const back = BACK[from] || BACK.progress;

  // ---------- Полоса ----------
  const eq = (ex.equipmentIds || []).filter((e) => e !== 'none').map((e) => CAT.equipment[e] || e);
  const band = `<p class="label band__eyebrow">${x ? `Упражнение ${x.n} из ${flat.length} · ${ROLE[x.role]}` : 'Упражнение'}</p>
    <h1 class="band__title">${esc(ex.name)}</h1>
    <p class="band__meta">${eq.length ? esc(eq.join(', ')) : 'Без оборудования'}${ex.lateralityId === 'unilateral' ? ' · на каждую сторону' : ''}</p>
    ${x ? `<p class="exr-today"><span class="label">${w.schedule.date === q.today ? 'Сегодня' : fmt.dateCap(w.schedule.date)}${x.label ? ` · ${x.label}` : ''}</span><b class="num">${q.planText(x.el)}</b>${x.el.restSec && !x.group ? `<span class="on-dark-2">${fmt.NBSP}· отдых${fmt.NBSP}${fmt.rest(x.el.restSec)}</span>` : ''}</p>` : ''}`;

  const sections = [];

  // ---------- От тренера: видео-ссылка, картинка, заметка о технике, заметка к упражнению в этой тренировке ----------
  const addon = q.db.addons.find((a) => a.exerciseId === ex.id);
  const media = addon ? addon.media.filter((m) => m.visibleToClient).map((m) => q.db.media.find((d) => d.id === m.mediaId)).filter(Boolean) : [];
  const notes = [...(addon && addon.note ? [addon.note] : []), ...(x ? q.clientNotes(x.el.notes).map((n) => n.body) : [])];
  if (media.length || notes.length) {
    const mediaHtml = media.map((m) => m.kind === 'image'
      ? `<figure class="exr-img"><img src="${esc(m.url)}" alt="${esc(m.title || 'Картинка тренера')}"></figure>`
      : `<button class="exr-media" type="button" data-video>
          <span class="exr-media__ico">${icon('play')}</span>
          <span class="exr-media__b"><b>${esc(m.title)}</b><span class="small muted">Видео тренера${m.durationSec ? ` · ${fmt.rest(m.durationSec)}` : ''}</span></span>
          ${icon('linkOpen', 'i--m exr-media__go')}
        </button>`).join('');
    sections.push(`<section class="sec" aria-labelledby="h-tr">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-tr">От тренера</h2></div>
      <div class="stack stack--s">${mediaHtml}${notes.map((b) => `<div class="comment"><span class="ava ava--s" aria-hidden="true">${esc(T.initials)}</span><div class="comment__b"><span class="sr-only">${esc(T.name)}: </span>${q.rich(b)}</div></div>`).join('')}</div>
    </section>`);
  }

  // ---------- Как выполнять: описание, шаги, подсказки, ошибки, безопасность (каталог) ----------
  sections.push(`<section class="sec" aria-labelledby="h-how">
    <div class="sec-h"><h2 class="label sec-h__title" id="h-how">Как выполнять</h2></div>
    <p class="exr-desc">${esc(ex.description)}</p>
    <ol class="exr-steps">${ex.instructions.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  </section>`);
  if (ex.techniqueCues && ex.techniqueCues.length) sections.push(`<section class="sec" aria-labelledby="h-cue">
    <div class="sec-h"><h2 class="label sec-h__title" id="h-cue">Главное</h2></div>
    <ul class="exr-list">${ex.techniqueCues.map((s) => `<li>${icon('check', 'i--s')}<span>${esc(s)}</span></li>`).join('')}</ul>
  </section>`);
  if (ex.commonMistakes && ex.commonMistakes.length) sections.push(`<section class="sec" aria-labelledby="h-err">
    <div class="sec-h"><h2 class="label sec-h__title" id="h-err">Частые ошибки</h2></div>
    <ul class="exr-list exr-list--err">${ex.commonMistakes.map((s) => `<li>${icon('close', 'i--s')}<span>${esc(s)}</span></li>`).join('')}</ul>
  </section>`);
  if (ex.safetyNotes && ex.safetyNotes.length) sections.push(`<div class="banner" role="note">${icon('shield')}<p class="banner__t"><b>Безопасность.</b> ${ex.safetyNotes.map(esc).join(' ')}</p></div>`);

  const mus = [ex.primaryMuscleId, ...(ex.secondaryMuscleIds || [])].filter(Boolean).map((m) => CAT.muscles[m] || m);
  if (mus.length) sections.push(`<section class="sec" aria-labelledby="h-mus">
    <div class="sec-h"><h2 class="label sec-h__title" id="h-mus">Работают</h2></div>
    <ul class="tags">${mus.map((m, i) => `<li class="tag${i === 0 ? ' tag--dark' : ' tag--soft'}">${esc(m)}</li>`).join('')}</ul>
  </section>`);

  // ---------- Моя история: последние результаты и лучший подход (видимость К2: свои результаты, рабочие веса, рекорды) ----------
  const V = q.db.visibility;
  if (V.ownResults) {
    const done = q.db.setResults.filter((s) => s.exerciseId === ex.id && s.done);
    const byW = {};
    for (const s of done) (byW[s.workoutId] = byW[s.workoutId] || []).push(s);
    const recs = q.records().filter((r) => r.exerciseId === ex.id);
    const rows = Object.entries(byW).map(([wid, sets]) => ({ w: q.workout(wid), sets, date: q.date(q.workout(wid)) }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.w.id.localeCompare(a.w.id)).slice(0, 6);
    // Лучший подход - по весу, затем по повторам (или по времени); корона - только если он рекорд (q.records)
    const score = (v) => [v.weight ?? 0, v.reps ?? v.duration ?? v.distance ?? 0];
    const better = (a, b2) => { const [x1, y1] = score(a), [x2, y2] = score(b2); return x1 > x2 || (x1 === x2 && y1 > y2); };
    let best = null;
    for (const s of done) { const v = kit.noRpe(s.values); if (!best || better(v, best.v)) best = { v, date: q.date(q.workout(s.workoutId)), id: s.id }; }
    const before = q.db.before.best[ex.id];
    if (before && (!best || better(before, best.v))) best = { v: before, before: true };
    const isPr = best && recs.some((r) => r.setResultId === best.id);
    const bestHtml = V.workingWeights && best ? `<div class="exr-best"><span class="label">Лучший подход</span><span class="${isPr ? 'set set--pr' : 'exr-best__v'} num">${isPr ? ui.crown() : ''}${kit.valText(best.v)}${isPr ? '<span class="sr-only">рекорд</span>' : ''}</span><span class="small muted">${best.before ? 'до программы' : fmt.date(best.date)}</span></div>` : '';
    const list = rows.map((r) => {
      const pr = recs.some((x2) => x2.workoutId === r.w.id);
      const text = fmt.setsText(r.sets.map((s) => kit.noRpe(s.values)));
      const when = r.date === q.today ? 'сегодня' : fmt.date(r.date);
      const st = q.status(r.w);
      const to = st === 'completed' || st === 'partial' ? href('result.html', { w: r.w.id }) : null;
      const inner = `<span class="exr-h__d">${when}</span><span class="exr-h__v num">${text}</span>${pr && V.records ? `<span class="exr-h__pr">${ui.crown('i--s')}<span class="sr-only">рекорд</span></span>` : ''}`;
      return `<li>${to ? `<a class="exr-h" href="${to}">${inner}${icon('chevR', 'i--m exr-h__go')}</a>` : `<div class="exr-h">${inner}</div>`}</li>`;
    }).join('');
    sections.push(`<section class="sec" aria-labelledby="h-my">
      <div class="sec-h"><h2 class="label sec-h__title" id="h-my">Моя история</h2>${rows.length ? `<span class="small muted">${fmt.count(Object.keys(byW).length, ['тренировка', 'тренировки', 'тренировок'])}</span>` : ''}</div>
      ${rows.length ? `${bestHtml}<ol class="exr-hist">${list}</ol>` : '<p class="muted">Вы ещё не делали это упражнение. После первой тренировки здесь появятся вес и повторы.</p>'}
    </section>`);
  }

  const bar = from === 'session' && w ? `<a class="btn btn--primary btn--lg" href="${href(back.href)}">${icon('chevL')}Вернуться к подходам</a>` : null;
  ui.page({ screen: 'exercise', title: ex.name, back, band, body: `<div class="stack">${sections.join('')}</div>`, bar });

  // Видео тренера: в прототипе ссылка пустая и наружу не ведёт (README, «Открытые вопросы», п. 9)
  document.addEventListener('click', (e) => { if (e.target.closest('[data-video]')) kit.toast('В прототипе видео не открывается: в продукте - ссылка тренера', { icon: 'video' }); });
})();
