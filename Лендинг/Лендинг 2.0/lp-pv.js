// Блок продукта: две сборки превью, по ширине окна - одна.
//   до 899 px - «Телефон» (Лендинг/Превью - телефон/): ниже 900 у неё подпись над телефоном, ниже 600 экран во всю ширину;
//   от 900 px - «Единый вид» (Лендинг/Превью - единый вид/): экраны компьютера с камерой и курсором.
// 900 - граница самой телефонной сборки: от неё она раскладывает подпись и телефон в две колонки «как на компьютере».
//
// Сборки подключены по ссылке, без копий: скрипт читает index.html сборки и берёт оттуда кадры <figure> (с путями к её screens/),
// её стили, скрипты и иконки - с теми версиями ?v=, что стоят там. Правка или пересборка в папке сборки попадает сюда сама.
// Подписи - свои, утверждённые (разметка [data-pv-caps] в index.html); они переносятся в классы подписи сборки (ev-cap / ep-cap).
//
// Сборка выбирается один раз, при загрузке, и грузится только она. Вторую на ту же страницу не подгружаем: раскадровки обеих
// объявляют общий глобальный `const AWAY` (ev-scenes.js, ep-scenes.js), вторая падает с ошибкой. Обе сборки сами держат
// любую ширину (у «Единого вида» узкий кадр ниже 600, у «Телефона» две колонки от 900), поэтому после поворота планшета
// или сужения окна остаётся загруженная; другую покажет обновление страницы.
// Тема: страница по умолчанию системная - экранам добавляется ?theme=system; при ?theme=… у страницы его добавит проигрыватель.
//
// Лендинг 2.0: сборки - копии внутри этой папки (README.md), не ссылка на Лендинг/Превью*/. Сцена приложения клиента
// (client-phone/, одна сборка на всех ширинах) встаёт в ряд превью между «Неделей» (b) и «Сегодня» (c); её скрипт грузится,
// когда место для неё готово, - так её закрепление и размеры считаются уже на своём месте. Нет сборки превью - подписи
// списком, и её подпись среди них (index.html), без кадра, как у остальных.
(() => {
  const BUILDS = {
    ev: 'Превью - единый вид/index.html',
    ep: 'Превью - телефон/index.html',
  };
  const CLIENT_JS = 'client-phone/client.js?v=5';
  const caps = document.querySelector('[data-pv-caps]');
  if (!caps) return;
  const host = caps.parentElement;
  const pageTheme = new URLSearchParams(location.search).get('theme');

  const withSystemTheme = (src) => {
    if (pageTheme) return src;
    const [path, hash] = src.split('#');
    return `${path}${path.includes('?') ? '&' : '?'}theme=system${hash ? `#${hash}` : ''}`;
  };
  const once = (el, parent) => new Promise((res, rej) => {
    el.addEventListener('load', res, { once: true });
    el.addEventListener('error', () => rej(new Error(`pv: не загрузилось ${el.src || el.href}`)), { once: true });
    parent.append(el);
  });

  async function build(key) {
    const base = new URL(BUILDS[key], location.href);
    const dir = new URL('.', base).href;
    const res = await fetch(base, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`pv: ${res.status} ${base}`);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const inDir = (u) => u && new URL(u, base).href.startsWith(dir);

    // иконки кнопки и курсора - из спрайта сборки, если таких id на странице ещё нет
    let defs = document.querySelector('#pv-defs defs');
    if (!defs) {
      document.body.insertAdjacentHTML('afterbegin', '<svg id="pv-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs></defs></svg>');
      defs = document.querySelector('#pv-defs defs');
    }
    for (const sym of doc.querySelectorAll('svg symbol[id]')) if (!document.getElementById(sym.id)) defs.append(document.importNode(sym, true));

    // сцены: подпись страницы в классах сборки + кадр сборки
    const set = document.createElement('div');
    set.className = `${key}-scenes`;
    set.dataset.pvSet = key;
    set.hidden = true;
    for (const li of caps.querySelectorAll('[data-scene]')) {
      const id = li.dataset.scene;
      const src = doc.querySelector(`figure.${key}[data-scene="${id}"]`);
      if (!src) throw new Error(`pv: в сборке ${key} нет превью ${id}`);
      const fig = document.importNode(src, true);
      for (const f of fig.querySelectorAll('iframe')) {
        for (const a of ['data-src', 'src']) if (f.hasAttribute(a)) f.setAttribute(a, withSystemTheme(new URL(f.getAttribute(a), base).href));
      }
      const art = document.createElement('article');
      art.className = `${key}-scene`;
      art.dataset.scene = id;
      const cap = document.createElement('div');
      cap.className = `${key}-cap`;
      for (const el of li.querySelectorAll('.lp-scene__t, .lp-scene__d')) {
        const c = document.createElement(el.tagName);
        c.className = el.classList.contains('lp-scene__t') ? `${key}-cap__t` : `${key}-cap__d`;
        c.innerHTML = el.innerHTML;
        cap.append(c);
      }
      art.append(cap, fig);
      set.append(art);
    }
    host.append(set);

    // стили сборки (только из её папки: токены у страницы свои), затем её скрипты по порядку - проигрыватель найдёт кадры
    await Promise.all([...doc.querySelectorAll('link[rel="stylesheet"]')].filter((l) => inDir(l.getAttribute('href'))).map((l) => {
      const el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = new URL(l.getAttribute('href'), base).href;
      return once(el, document.head);
    }));
    for (const s of doc.querySelectorAll('script[src]')) {
      if (!inDir(s.getAttribute('src'))) continue;
      const el = document.createElement('script');
      el.src = new URL(s.getAttribute('src'), base).href;
      el.async = false;
      await once(el, document.body);
    }
    return set;
  }

  // сцена приложения клиента: точка подключения #nb-client и её скрипт (стили - в index.html)
  function client(before) {
    const mount = document.createElement('div');
    mount.id = 'nb-client';
    if (before) before.before(mount); else host.append(mount);
    const js = document.createElement('script');
    js.src = CLIENT_JS;
    document.body.append(js);
  }

  const key = matchMedia('(max-width: 899px)').matches ? 'ep' : 'ev';
  build(key).then((set) => {
    set.hidden = false;
    host.dataset.pv = key;
    client(set.querySelector('[data-scene="c"]'));
  }).catch((e) => {
    console.error(e);
    for (const s of host.querySelectorAll('[data-pv-set]')) s.remove();
    document.documentElement.classList.remove('pv-js');   // кадров нет - подписи списком
  });
})();
