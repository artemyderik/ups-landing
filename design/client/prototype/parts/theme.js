// Тема экрана (DESIGN.md 3.17). Подключается первым обычным скриптом в <head> - тема ставится до первой отрисовки, без мигания.
// Образец - design/directions/c2/parts/theme.js; ключ хранилища общий с прототипом тренера: выбор темы один на оба прототипа.
// «Системная» - без атрибута, решает prefers-color-scheme; «Светлая» / «Тёмная» - data-theme на <html> и выбор в хранилище браузера.
// Переключатель - .theme-switch (role="radiogroup", кнопки role="radio" с data-value) в служебной полосе прототипа (parts/app.js).
// Стрелки, Home и End двигают выбор; другие открытые вкладки подхватывают его сразу.
(() => {
  const KEY = 'aps-c2-theme';
  const root = document.documentElement;
  const apply = (v) => { if (v === 'light' || v === 'dark') root.setAttribute('data-theme', v); else root.removeAttribute('data-theme'); };
  try { apply(localStorage.getItem(KEY)); } catch {}
  const sync = () => {
    const v = root.getAttribute('data-theme') || 'system';
    for (const r of document.querySelectorAll('.theme-switch [role="radio"]')) {
      const on = r.dataset.value === v;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    }
  };
  const choose = (v) => {
    apply(v);
    try { if (v === 'light' || v === 'dark') localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch {}
    sync();
  };
  window.APS_THEME = { sync };
  addEventListener('storage', (e) => { if (e.key === KEY) { apply(e.newValue); sync(); } });
  document.addEventListener('DOMContentLoaded', () => {
    sync();
    document.addEventListener('click', (e) => { const r = e.target.closest('.theme-switch [role="radio"]'); if (r) choose(r.dataset.value); });
    document.addEventListener('keydown', (e) => {
      const r = e.target.closest && e.target.closest('.theme-switch [role="radio"]');
      if (!r) return;
      const group = [...r.closest('.theme-switch').querySelectorAll('[role="radio"]')];
      const i = group.indexOf(r);
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      const next = e.key === 'Home' ? group[0] : e.key === 'End' ? group[group.length - 1] : step ? group[(i + step + group.length) % group.length] : null;
      if (!next) return;
      e.preventDefault();
      choose(next.dataset.value);
      next.focus();
    });
  });
})();
