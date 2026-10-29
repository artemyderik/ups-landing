// «Выполнение тренировки» клиента в сцене «Клиент отмечает - вы видите». Разметка - как её строит прототип клиента
// (design/client/prototype/js/session.js, parts/kit.js; снята с прототипа на 390), данные - README страницы «Новые блоки»:
// Игорь Петров, чт, 4 янв, «Тяга и корпус · неделя 8, день 2», румынская тяга 3 × 8 × 65 кг, прошлый раз 70 × 8.
// Шаги данных (window.EV_STEP, их вызывает screen.js по шагу сцены):
//   0 - подход 1 отмечен, текущий - подход 2;  1 - «Как в плане»: подход 2 отмечен, отдых 2:00, текущий - подход 3;
//   2 - лист «Больно или неприятно»;  3 - сила 4 из 10;  4 - «Поясница»;  5 - сохранено: строка «Больно 4/10 · Поясница», тост;
//   6 - вес 62,5;  7 - вес 60, «Отметить подход»;  8 - подход 3 отмечен 60 × 8, «Как далось?», отдых, «Дальше».
// Таймер отдыха идёт по времени сцены (window.EV_CLOCK): на паузе сцены он стоит, как и всё движение.
// Бегунок усилия «Как далось?» и шкала боли - эталон прототипа APS.kit.effHtml / effBind (плавный бегунок 2026-10-28, DESIGN.md 5.3,
// BEHAVIOR.md 5.6): сила 4 из 10 ставится касанием полосы - сцена подаёт касание бегунку, как палец; кадр без движения - сразу значение.
(() => {
  const NB = '&nbsp;';
  const ico = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"></use></svg>`;
  const kg = (w) => `${String(w).replace('.', ',')}${NB}кг`;
  const PLAN = 65, PREV = 70, REPS = 8, N = 3, REST = 120;

  const done = (i, w, eff = '') => `<li><button class="pset pset--done" type="button" data-act="fix" aria-label="Подход ${i}: ${kg(w)} × ${REPS}, отмечен. Исправить"><span class="pset__n">${i}</span><span class="pset__v">${kg(w)} × ${REPS}</span><span class="pset__s">${ico('done')}отмечен</span></button>${eff}</li>`;
  const plan = (i) => `<li><div class="pset pset--plan"><span class="pset__n">${i}</span><span class="pset__v">${kg(PLAN)} × ${REPS}</span><span class="pset__s">план</span></div></li>`;
  const rest = () => `<li><div class="rest" role="timer" aria-live="off" aria-label="Отдых 2:00 из 2:00" id="ses-rest">
      <svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21.5" stroke="var(--shell-line)"></circle><circle class="ring__v" cx="24" cy="24" r="21.5" stroke="var(--accent)" stroke-linecap="round" stroke-dasharray="135.1 135.1"></circle></svg>
      <div><p class="rest__t">2:00</p><p class="rest__l">отдых из 2:00</p></div>
      <button class="btn btn--shell" type="button" data-act="rest-skip">${ico('skip')}Пропустить</button>
    </div></li>`;
  const ctl = (i, w) => `<li><div class="ctl" id="ses-ctl" aria-label="Подход ${i} из ${N}">
      <div class="ctl__h"><span class="label"><span class="pset__n" aria-hidden="true">${i}</span>Подход ${i} из ${N}</span><span class="small num">в прошлый раз ${kg(PREV)} × ${REPS}</span></div>
      <div class="steppers"><div class="stepper" role="group" aria-label="Вес">
      <button class="step" type="button" id="ev-minus" aria-label="Минус 2,5 кг">${ico('minus')}<span class="step__d" aria-hidden="true">−2,5</span></button>
      <p class="stepper__v" aria-live="polite" id="ev-w"><span><b>${String(w).replace('.', ',')}</b><span>кг</span></span>${w !== PLAN ? `<small>по плану ${PLAN}</small>` : ''}</p>
      <button class="step" type="button" aria-label="Плюс 2,5 кг">${ico('plus')}<span class="step__d" aria-hidden="true">+2,5</span></button>
    </div><div class="stepper" role="group" aria-label="Повторы">
      <button class="step" type="button" aria-label="Минус 1 повтор">${ico('minus')}<span class="step__d" aria-hidden="true">−1</span></button>
      <p class="stepper__v" aria-live="polite"><span><b>${REPS}</b><span>повт.</span></span></p>
      <button class="step" type="button" aria-label="Плюс 1 повтор">${ico('plus')}<span class="step__d" aria-hidden="true">+1</span></button>
    </div></div>
    </div></li>`;
  // «Как далось?» после последнего подхода упражнения (BEHAVIOR.md 5.6, effortPrompt lastSet) - как effBox прототипа, без выбора
  const kit = APS.kit;
  const effAsk = `<div class="pset__effbox">${kit.effHtml({ key: 'sr_rdl_3', label: 'Усилие: подход 3', value: null, skip: true })}</div>`;
  const mark = (label, value, act = 'check') => `<button class="btn btn--primary btn--plan" type="button" id="ev-mark">${ico(act)}<span>${label}<small class="num">${value}</small></span></button>`;
  const flag = `<div class="ses-flag" id="ev-flag"><span class="pain-mark">${ico('sig-pain')}<span><b>Больно 4/10</b> · Поясница</span></span><button class="ses-flag__act" type="button">Изменить</button></div>`;

  // Лист «Больно или неприятно» - как js/session.js прототипа (шкала боли 0-10 kit.effHtml, чипы «где», заметка);
  // сила v (null - не выбрано), место where. У полосы - id сцены #ev-pain-range (камера и касание)
  const painEff = (v) => kit.effHtml({ key: 'pain', label: 'Сила боли от 0 до 10', value: v, pain: true }).replace('class="eff__range"', 'class="eff__range" id="ev-pain-range"');
  const PLACES = ['Поясница', 'Спина', 'Шея', 'Плечо', 'Колено', 'Другое'];
  const sheet = (v, where) => `<div class="sheet-layer" id="ev-sheet"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t">
      <div class="sheet__head"><div><h2 class="sheet__title" id="sheet-t">Больно или неприятно</h2><p class="sheet__sub">Румынская тяга со штангой · тренер увидит сразу</p></div>
        <button class="btn btn--icon sheet__x" type="button" aria-label="Закрыть">${ico('close')}</button></div>
      <div class="sheet__body"><div class="fl"><span class="fl__l" id="pain-l">Насколько</span>${painEff(v)}<span class="fl__hint">Если боль острая - остановите упражнение.</span></div>
        <div class="fl"><span class="fl__l">Где <span class="muted">· по желанию</span></span><div class="chips chips--soft" role="radiogroup" aria-label="Где болит">${PLACES.map((p) => `<button class="chip" type="button" role="radio"${p === 'Поясница' ? ' id="ev-low"' : ''} aria-checked="${p === where}">${p}</button>`).join('')}</div></div>
        <label class="fl"><span class="fl__l">Заметка <span class="muted">· по желанию</span></span><textarea class="area area--soft" rows="3" placeholder="Что почувствовали и когда"></textarea></label></div>
      <div class="sheet__foot"><button class="btn btn--ghost" type="button">Отмена</button><button class="btn btn--dark" type="button" id="ev-save"${v == null ? ' disabled' : ''}>Сохранить</button></div>
    </div></div>`;

  // Состояние экрана на шаге n
  const STATE = [
    { sets: [done(1, PLAN), ctl(2, PLAN), plan(3)], n: 1, bar: mark('Как в плане', `${kg(PLAN)} × ${REPS}`), saved: '07:46' },
    { sets: [done(1, PLAN), done(2, PLAN), rest(), ctl(3, PLAN)], n: 2, bar: mark('Как в плане', `${kg(PLAN)} × ${REPS}`), saved: '07:49', rest: true },
  ];
  STATE[2] = { ...STATE[1], sheet: [null, null] };
  STATE[3] = { ...STATE[1], sheet: [4, null] };
  STATE[4] = { ...STATE[1], sheet: [4, 'Поясница'] };
  STATE[5] = { ...STATE[1], flag: true, toast: true, saved: '07:51' };
  STATE[6] = { ...STATE[5], sets: [done(1, PLAN), done(2, PLAN), rest(), ctl(3, 62.5)], bar: mark('Отметить подход', `${kg(62.5)} × ${REPS}`) };
  STATE[7] = { ...STATE[6], sets: [done(1, PLAN), done(2, PLAN), rest(), ctl(3, 60)], bar: mark('Отметить подход', `${kg(60)} × ${REPS}`), toast: false };
  STATE[8] = { sets: [done(1, PLAN), done(2, PLAN), done(3, 60, effAsk), rest()], n: 3, flag: true, done: true, rest: true, saved: '07:52',
    bar: mark('Дальше', 'A1 · Тяга штанги в наклоне', 'arrowR') };

  const $ = (s) => document.querySelector(s);
  const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ms = (name) => parseFloat(tok(name)) || 0;
  let cur = -1, restAt = 0, now = 0;
  const show = (el) => { el.classList.remove('ev-in'); void el.offsetWidth; el.classList.add('ev-in'); };
  // Новая высота блока над подходами (строка боли) - плавно, а не скачком: экран под пальцем не прыгает
  const grow = (el) => {
    const h = el.offsetHeight;
    el.animate([{ height: '0px', marginTop: '0px', opacity: 0 }, { height: `${h}px`, opacity: 0, offset: 0.5 }, { height: `${h}px`, opacity: 1 }],
      { duration: ms('--dur-slow') * 2, easing: tok('--easing-out') });
  };

  window.EV_STEP = (n, animate) => {
    const s = STATE[Math.min(n, STATE.length - 1)], p = STATE[cur] || {};
    // подходы: список строится заново, новое проявляется на своём месте
    const list = $('#ev-sets');
    const before = [...list.children].map((li) => li.innerHTML);
    list.innerHTML = s.sets.join('');
    if (animate) [...list.children].forEach((li, i) => { if (li.innerHTML !== before[i]) show(li); });
    list.querySelectorAll('[data-eff]').forEach((el) => kit.effBind(el, {}));
    $('#ev-count').textContent = `${s.n} из ${N}`;
    $('#ev-seg').style.setProperty('--f', `${Math.round((s.n / N) * 100)}%`);
    $('#ev-done').hidden = !s.done;
    // панель внизу
    const bar = $('.assign-bar');
    if (bar.innerHTML !== s.bar) { bar.innerHTML = s.bar; if (animate) show(bar.firstElementChild); }
    // сохранение: отметка ушла на сервер
    $('#ses-sync').innerHTML = `${ico('saved')}<span><b>Сохранено</b> · ${s.saved}</span>`;
    // строка боли у упражнения
    const f = $('#ev-flag');
    if (s.flag && !f) { $('.ses-note').insertAdjacentHTML('afterend', flag); if (animate) grow($('#ev-flag')); }
    if (!s.flag && f) f.remove();
    // лист
    const sh = $('#ev-sheet');
    if (s.sheet) {
      const html = sheet(...s.sheet);
      if (!sh) {
        document.body.insertAdjacentHTML('beforeend', html);
        const layer = $('#ev-sheet');
        kit.effBind(layer.querySelector('[data-eff]'), { pain: true });
        layer.inert = true;
        // въезд листа - его собственная анимация sheet-in (app.css прототипа), затемнение проявляется за то же время
        if (animate) layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-slow'), easing: tok('--easing-out') });
        else layer.querySelector('.sheet').style.animation = 'none';
      } else {
        // шаг внутри листа: сила - касанием полосы (палец сцены; бегунок сам появляется, подпись-барабан крутится),
        // в кадре без движения - сразу значение; чипы меняются на месте
        const [v, where] = s.sheet, range = sh.querySelector('.eff__range');
        const now = range.hasAttribute('aria-valuenow') ? Number(range.getAttribute('aria-valuenow')) : null;
        if (v !== now) {
          if (animate && v != null) touchEff(range, v);
          else {
            const box = range.closest('[data-eff]'), n = document.createElement('div');
            n.innerHTML = painEff(v);
            box.replaceWith(n.firstElementChild);
            kit.effBind(sh.querySelector('[data-eff]'), { pain: true });
          }
        }
        for (const c of sh.querySelectorAll('.chip')) c.setAttribute('aria-checked', String(c.textContent === where));
        sh.querySelector('#ev-save').disabled = v == null;
      }
    } else if (sh) {
      if (animate) {
        // уход листа - обратное движение за --dur: лист вниз, затемнение гаснет (как нижний лист сборки «Телефон»)
        const d = ms('--dur'), e = tok('--easing');
        sh.querySelector('.sheet').animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: d, easing: e, fill: 'forwards' });
        sh.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: e, fill: 'forwards' }).finished.then(() => sh.remove()).catch(() => sh.remove());
      } else sh.remove();
    }
    // тост «Боль отмечена · тренер увидит сразу»
    const t = $('.toast');
    if (s.toast && !t) {
      document.body.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${ico('check')}<span>Боль отмечена · тренер увидит сразу</span></div>`);
      if (!animate) $('.toast').style.animation = 'none';
    }
    if (!s.toast && t) {
      if (animate) t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms('--dur'), easing: tok('--easing'), fill: 'forwards' }).finished.then(() => t.remove()).catch(() => t.remove());
      else t.remove();
    }
    // отдых начинается с отметки подхода
    if (s.rest && (!p.rest || n === 8 && cur !== 8)) restAt = now;
    cur = n;
    tick();
  };
  // Касание полосы бегунка в точке значения v: ход бегунка - от края до края, p = (x - tw / 2) / (W - tw) (kit.js, follow)
  const touchEff = (range, v) => {
    const track = range.querySelector('.eff__track'), thumb = range.querySelector('.eff__thumb'), r = track.getBoundingClientRect();
    const box = range.closest('[data-eff]'), min = box.classList.contains('eff--pain') ? 0 : 1;
    const tw = thumb.offsetWidth, x = r.left + tw / 2 + ((v - min) / (10 - min)) * (r.width - tw), y = r.top + r.height / 2;
    const ev = (type) => range.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y }));
    ev('pointerdown');
    ev('pointerup');
  };
  // Таймер отдыха по времени сцены: 2:00 и кольцо убывают, пока сцена играет
  const tick = () => {
    const r = $('#ses-rest');
    if (!r) return;
    const left = Math.max(0, REST - Math.floor((now - restAt) / 1000));
    const txt = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    r.querySelector('.rest__t').textContent = txt;
    r.setAttribute('aria-label', `Отдых ${txt} из 2:00`);
    const len = 135.1 * ((REST - Math.min(REST, (now - restAt) / 1000)) / REST);
    r.querySelector('.ring__v').setAttribute('stroke-dasharray', `${len.toFixed(1)} 135.1`);
  };
  window.EV_CLOCK = (t) => { now = t; if (t < restAt) restAt = t; tick(); };
})();
