// Общие части сайта игры (25.10, этап 2 дорожной карты) - то, что страницы сайта (app.js, «Город», шахта, аукцион, обмен,
// «Новости», «Навыки», «Поход»...) раньше писали каждая у себя. Без сборки и без зависимостей, кроме ui-kit (текст, склонения,
// всплывающая надпись - их не дублируем, берём оттуда). В браузере - window.LGSiteUi (страница грузит /lib/ui-kit.js и
// /lib/site-ui.js до своих файлов), в Node - module.exports (чистые части проверяет test/site-ui.test.ts).
//
//   текст:     esc(s), plural(n, one, few, many), pluralN(...), timeAgo(ts) - из ui-kit;
//   деньги:    money(n, ref, coins) - «<span class="m"><b class="ms">10</b> серебряных рыбок <b class="mb">5</b> чешуек</span>»,
//              moneyText(n, ref, coins), moneyParts(n, ref, coins) → [[g|s|b, число, слово]], lack(price, have, cls, coins),
//              bal(price, have, cls, coins). coins - монеты стиля (MDDoodle.part('coins'): { g|s|b: { forms: [1, 2, 5] } }) или
//              функция, которая их вернёт; нет - «зол. / сер. / мед.»;
//   надпись:   toast(text, bad, o) - всплывающая надпись сайта (#toast, вид - style.css); o.ms - сколько держать (2800);
//   «Точно?»:  confirmTwice(btn, o) - первое нажатие: надпись «Точно…?», второе в течение o.ms (4000) - true;
//   экран:     MQ (телефон, широкий, палец, мышь, меньше движения...), media(имя | запрос), is(имя | запрос);
//   окна:      layer(el, o) - окно поверх страницы: Esc и нажатие мимо закрывают; clampXY(el, x, y, pad) - не за край экрана;
//   состояния: note(text, cls) - «<p class="empty">…</p>» (загрузка, ошибка, пусто); loadInto(el, load, wait, fail) - вкладка,
//              чей код грузится по требованию: «грузится…», не вышло - «не загрузилось» (true - загрузился).
// Чат сайта (чат «Города» и шахты, прежний sitechat.js) - отдельный файл библиотеки: chat.js (/lib/site-chat.js), грузится по
// требованию. Адресов игры, ников и модулей здесь нет - только вид и поведение.
(function (root, factory) {
  const UI = typeof module === 'object' && module.exports ? require('../ui-kit') : root.LGUi;
  const api = factory(root, UI);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LGSiteUi = api;
})(typeof self !== 'undefined' ? self : this, function (root, UI) {
  'use strict';
  if (!UI) throw new Error('site-ui: нужен ui-kit (/lib/ui-kit.js) до /lib/site-ui.js');
  const { esc, plural, pluralN, timeAgo } = UI;

  /* ---------- деньги: крупные единицы слева, через пробел - «10 серебряных рыбок 5 чешуек» (24.10, баг тестера) ---------- */
  // 1 золотая = 100 серебряных = 10000 медных. ref - сумма, с которой сравниваем (цена): ноль пишем в её крупной единице -
  // «0 серебряных рыбок», а не «0 чешуек»
  const MUNIT = (n) => (n >= 10000 ? 'g' : n >= 100 ? 's' : 'b');
  const FB = { g: 'зол.', s: 'сер.', b: 'мед.' };
  function moneyParts(n, ref, coins) {
    n = Math.max(0, Math.floor(+n || 0));
    const g = Math.floor(n / 10000), s = Math.floor(n / 100) % 100, b = n % 100;
    const C = (typeof coins === 'function' ? coins() : coins) || {};
    const w = (k, v) => { const f = C[k] && C[k].forms; return f ? plural(v, f[0], f[1], f[2]) : FB[k]; };
    const out = [['g', g], ['s', s], ['b', b]].filter(([, v]) => v > 0);
    if (!out.length) out.push([MUNIT(Math.max(0, Math.floor(+ref || 0))), 0]);
    return out.map(([k, v]) => [k, v, w(k, v)]);
  }
  const money = (n, ref, coins) => `<span class="m">${moneyParts(n, ref, coins).map(([k, v, t]) => `<b class="m${k}">${v}</b> ${t}`).join(' ')}</span>`;
  const moneyText = (n, ref, coins) => moneyParts(n, ref, coins).map(([, v, t]) => `${v} ${t}`).join(' ');
  // «У тебя: … / Не хватает: …» - две строки обычным текстом (лавки, Кузня, склад, аукцион)
  function lack(price, have, cls = '', coins) {
    price = Math.max(0, Math.floor(+price || 0)); have = Math.max(0, Math.floor(+have || 0));
    return `<p class="note lack${cls ? ' ' + cls : ''}">У тебя: ${money(have, price, coins)}<br>Не хватает: ${money(price - have, price, coins)}</p>`;
  }
  // кошелёк рядом с ценой: хватает - «У тебя: …», не хватает - «У тебя / Не хватает»
  const bal = (price, have, cls = '', coins) => ((+have || 0) < (+price || 0) ? lack(price, have, cls, coins)
    : `<p class="note bal${cls ? ' ' + cls : ''}">У тебя: ${money(Math.max(0, +have || 0), price, coins)}</p>`);

  /* ---------- всплывающая надпись сайта (#toast в index.html, вид - .toast / .toast.on / .toast.err в style.css) ---------- */
  // Одна на страницу: ui-kit.toast в режиме «свой элемент» (o.el) - один таймер, новая надпись продлевает показ.
  // (o.key - отдельный таймер; до 25.10 у app.js, «Новостей» и правки новостей были свои, и таймер прежней надписи
  // прятал новую раньше срока - не используем)
  function toast(text, bad, o = {}) {
    if (typeof document === 'undefined') return;
    const el = o.el || document.getElementById('toast'); if (!el) return;
    UI.toast(text, { el, cls: 'toast', err: !!bad, ms: o.ms || 2800, key: o.key });
  }

  /* ---------- «Точно?»: защита от случайного нажатия - второе нажатие в течение ms ---------- */
  // o: text (или html) - надпись после первого нажатия; cls - класс на это время; mark - data-атрибут на это время (стили
  // «Новостей» красят [data-armed]); ms - 4000. Через ms (если кнопка ещё на странице) - прежняя надпись. true - подтвердили.
  // o.once - подтверждение снимает «Точно?» сразу (без возврата надписи; кнопку перерисует страница).
  const ARM = typeof WeakMap === 'function' ? new WeakMap() : null;
  function confirmTwice(btn, o = {}) {
    const st = ARM.get(btn), now = Date.now();
    if (st && st.until > now) { if (o.once) { clearTimeout(st.t); ARM.delete(btn); } return true; }
    if (st) { clearTimeout(st.t); restore(btn, st); }
    const ms = o.ms || 4000, s = { until: now + ms, was: btn.innerHTML, cls: o.cls || '', mark: o.mark || '', t: 0 };
    if (o.html != null) btn.innerHTML = o.html; else if (o.text != null) btn.textContent = o.text;
    if (s.cls) btn.classList.add(s.cls);
    if (s.mark) btn.dataset[s.mark] = '1';
    s.t = setTimeout(() => { if (ARM.get(btn) !== s) return; ARM.delete(btn); if (btn.isConnected) restore(btn, s); }, ms);
    ARM.set(btn, s);
    return false;
  }
  function restore(btn, s) { btn.innerHTML = s.was; if (s.cls) btn.classList.remove(s.cls); if (s.mark) delete btn.dataset[s.mark]; }
  const armed = (btn) => { const st = ARM.get(btn); return !!(st && st.until > Date.now()); };

  /* ---------- экран: одни и те же запросы везде (телефон - до 720 px, широкий ПК - от 1100 px) ---------- */
  const MQ = {
    phone: '(max-width: 720px)',        // телефон: чат снизу, шахта на весь экран
    tablet: '(min-width: 720px)',       // от планшета: сумка «Персонажа» вида full
    wide: '(min-width: 1100px)',        // широкий ПК: карточка вещи справа, а не шторкой
    narrow: '(max-width: 1099px)',
    touch: '(pointer: coarse)',         // палец
    hover: '(hover: hover)',            // мышь (есть наведение)
    nohover: '(hover: none)',
    reduced: '(prefers-reduced-motion: reduce)',
  };
  const mqCache = {};
  function media(q) {
    q = MQ[q] || q;
    if (!(q in mqCache)) { try { mqCache[q] = root.matchMedia ? root.matchMedia(q) : null; } catch { mqCache[q] = null; } }
    return mqCache[q] || { matches: false, media: q, addEventListener() {}, removeEventListener() {} };
  }
  const is = (q) => !!media(q).matches;

  /* ---------- окна ---------- */
  // Окно поверх страницы (el - подложка с окном внутри): в host (нет - полноэкранный элемент или body), Esc и нажатие на
  // подложку закрывают. Вернёт shut() - закрыть (onClose зовётся один раз).
  function layer(el, o = {}) {
    let open = true;
    const shut = () => { if (!open) return; open = false; el.remove(); document.removeEventListener('keydown', key); if (o.onClose) o.onClose(); };
    const key = (e) => { if (e.key === 'Escape') shut(); };
    document.addEventListener('keydown', key);
    el.addEventListener('pointerdown', (e) => { if (e.target === el) shut(); });
    if (!el.isConnected) (o.host || document.fullscreenElement || document.body).appendChild(el);
    return shut;
  }
  // Поставить el в точку (x, y) так, чтобы он не уходил за край окна (pad от края); вернёт [x, y]
  function clampXY(el, x, y, pad = 8) {
    const r = el.getBoundingClientRect(), W = root.innerWidth, H = root.innerHeight;
    return [Math.max(pad, Math.min(W - r.width - pad, x)), Math.max(pad, Math.min(H - r.height - pad, y))];
  }

  /* ---------- состояния: загрузка, ошибка, пусто ---------- */
  const note = (text, cls = 'empty') => `<p class="${cls}">${esc(text)}</p>`;
  // Вкладка, чей код грузится по требованию: пока грузится - wait, не загрузился - fail (оба - простым текстом). true - загрузился
  async function loadInto(el, load, wait, fail) {
    el.innerHTML = note(wait);
    try { await load(); return true; } catch { el.innerHTML = note(fail); return false; }
  }

  /* ---------- 28.10: оформление и тексты сайта по стилю человечков (одна таблица - и для сервера, и для страницы) ----------
     STYLES - стили по порядку (переключатель тестеров), SKINS - оформления (html[data-skin], legacy/site/public/style.css,
     public/platform/skin.css и done.css), STYLE_SKIN - стиль → оформление; нет стиля - «Арсенал» (forge).
     STYLE_TEXT - тексты сайта в голосе стиля: groups - группы Легиона (вкладка «Легион»), copy - сумка и кнопки «Персонажа». */
  const STYLES = [['legion', 'Легион'], ['cats', 'Котики'], ['monkeys', 'Обезьяны'], ['veggies', 'Овощи'], ['42brothers', '42 Братухи'], ['cherts', 'Чертики'], ['ugabugi', 'Уга-Буги']];
  const SKINS = { forge: 'Арсенал', den: 'Лежанка', rage: 'Ярость', garden: 'Грядка', club: 'VIP-зона', inferno: 'Пекло', cave: 'Пещера' };
  const STYLE_SKIN = { legion: 'forge', cats: 'den', monkeys: 'rage', veggies: 'garden', '42brothers': 'club', cherts: 'inferno', ugabugi: 'cave' };
  const SKIN_DEFAULT = 'forge';
  const skinOf = (style) => STYLE_SKIN[style] || SKIN_DEFAULT;
  const STYLE_TEXT = {
    legion: {
      groups: { mage: 'Маги и некроманты', heal: 'Жрецы', phys: 'Легионеры и стрелки', recruit: 'Новобранцы' },
      copy: { bag: 'Сумка', empty: 'Сумка пуста. Вещи добываются в Походе и покупаются на Ярмарке.', on: 'Надето', off: 'Снято', none: 'Выбери вещь в сумке или на легионере', wear: 'Надеть', take: 'Снять' },
    },
    cats: {
      groups: { mage: 'Коты-колдуны', heal: 'Мурлыки-жрецы', phys: 'Котоармия и рогаточники', recruit: 'Котята' },
      copy: { bag: 'Корзинка', empty: 'Корзинка пуста. Вещи добываются в Походе и покупаются на Ярмарке.', on: 'Мур! Надето', off: 'Снято', none: 'Выбери вещь в корзинке или на котике', wear: 'Примерить', take: 'Снять' },
    },
    monkeys: {
      groups: { mage: 'Шаманы', heal: 'Жрецы банана', phys: 'Громилы и плевуны', recruit: 'Мартышки' },
      copy: { bag: 'Мешок с бананами', empty: 'Мешок пуст. Вещи отбирают в Походе и выменивают на Ярмарке.', on: 'У-у-а! Надето', off: 'Сорвано', none: 'Выбери вещь в мешке или на обезьяне', wear: 'Нацепить', take: 'Сорвать' },
    },
    veggies: {
      groups: { mage: 'Колдуны-корнеплоды', heal: 'Святые кабачки', phys: 'Боевые овощи и горохострелы', recruit: 'Ростки' },
      copy: { bag: 'Овощной ящик', empty: 'Ящик пуст. Вещи добываются в Походе и покупаются на Ярмарке.', on: 'Хрум! Надето', off: 'Снято', none: 'Выбери вещь в ящике или на овоще', wear: 'Надеть', take: 'Снять' },
    },
    '42brothers': {
      groups: { mage: 'Диджеи и продюсеры', heal: 'Тамады', phys: 'Вышибалы, снайперы и охрана', recruit: 'Новички' },
      copy: { bag: 'Барсетка', empty: 'Барсетка пуста. Шмот добывается в Походе и берётся на Ярмарке.', on: 'Йоу! Надето', off: 'Снято', none: 'Выбери шмот в барсетке или на братухе', wear: 'Нацепить', take: 'Скинуть' },
    },
    cherts: {
      groups: { mage: 'Чёрт-колдуны и чернокнижники', heal: 'Исповедники', phys: 'Вояки, стрелки и шулеры', recruit: 'Бесята' },
      copy: { bag: 'Котомка', empty: 'Котомка пуста. Вещи добываются в Походе и выторговываются на Ярмарке.', on: 'Хо-хо! Надето', off: 'Снято', none: 'Выбери вещь в котомке или на чертёнке', wear: 'Надеть', take: 'Снять' },
    },
    ugabugi: {
      groups: { mage: 'Шаманы и колдуны костей', heal: 'Знахари', phys: 'Громилы и охотники', recruit: 'Юнцы' },
      copy: { bag: 'Мешок из шкуры', empty: 'Мешок пуст. Вещи добывают в Походе и выменивают на Ярмарке.', on: 'Уга! Надето', off: 'Снято', none: 'Выбери вещь в мешке или на пещерном человеке', wear: 'Нацепить', take: 'Снять' },
    },
  };
  const styleText = (style, part, k) => ((STYLE_TEXT[style] || {})[part] || {})[k];

  return { esc, plural, pluralN, timeAgo, MUNIT, moneyParts, money, moneyText, lack, bal, toast, confirmTwice, armed, MQ, media, is, layer, clampXY, note, loadInto,
    STYLES, SKINS, STYLE_SKIN, SKIN_DEFAULT, skinOf, STYLE_TEXT, styleText };
});
