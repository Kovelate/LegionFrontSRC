// Библиотека инвентаря (25.10) - ОДНА на все места игры, где показываются вещи: сумка шахты, вкладка «Персонаж», Склад «Города»,
// окна выбора вещи (заточка, аукцион, продажа, обмен), карточка расширения Twitch, блок вкладки «Поход».
// Без сборки и без зависимостей: в браузере - window.LGInventory (и прежнее window.LGItems - ячейки и перетаскивание),
// в Node - module.exports (чистые части: cells, grid, sortCells, vitals). Шлюз отдаёт её по адресу /lib/inventory.js,
// стили - /lib/inventory.css. Сети внутри нет: библиотека берёт простые данные и зовёт действия, запросы делает страница.
//
//   const inv = LGInventory.mount(el, { variant, mode, data, actions, options });
//   inv.update(data)  - новые данные: перерисовываются только изменившиеся ячейки, слоты, полоски;
//   inv.set(options)  - поменять настройки (перерисовка целиком);
//   inv.select(uid)   - выбрать вещь; inv.state() - { f, sort, sel }; inv.destroy() - снять всё.
//
// variant: 'full' (большой ПК: кукла, крупные ячейки, карточка вещи справа), 'compact' (карточка сбоку ~276 px: шахта, Twitch),
//          'sheet' (телефон: снизу на ~60% высоты), 'inline' (маленький блок без куклы, например только еда и зелья).
// mode:    'equip' (надеть / снять / съесть), 'storage' (две сетки и перенос, как Склад), 'pick' (выбрать вещь: нажатие = actions.pick),
//          'view' (только смотреть: чужой герой, расширение).
// data:    { hero, items } - герой в виде сайта (level, money, stats.hp, hpNow, xpInLevel/xpToNext или xp/prevXp/next) и вещи
//          [{ uid, id, name, slot, rarity, wearable, on, en, dur, stats, effect }]; или { equipped: { слот: вещь }, bag: [...] };
//          storage-режим: ещё storage: [...], bagCap, storageCap; stack - сколько расходников в стопке (20).
// actions: equip(uid, it), unequip(slot, it), use(uid, it), move(uid, from, to, n, cell), pick(it), close() - могут вернуть Promise.
//          Сообщения об итоге (Надето / ошибка) показывает страница: библиотека только блокирует повторное нажатие, пока ждёт.
// options: title, art(it), figure(hero) - рисунок человечка (строка SVG), money(n) - монеты (HTML), cardTip(el, it, hero) / tipHide() -
//          своя карточка вещи (иначе встроенная: характеристики и сравнение с надетым), say(text) - короткое сообщение,
//          only(it) - какие вещи показывать, filters - список ключей фильтра (false - без фильтра), sort (false - без порядка),
//          canUse(it) / can(it) - true или причина (строкой), storeKey - ключ localStorage для фильтра и порядка, esc (false - Esc
//          не закрывает), equipped (inline: ряд надетого, false - нет), hint (false - без строки подсказки), labels - свои тексты,
//          statLabel(k), effText(it), role, cap (пустые ячейки до вместимости), header (false - без шапки), detail (false - вид 'full'
//          без своей карточки справа: её рисует страница), onSelect(it | null) - выбрали вещь (нажатием), extra(cell) - своя разметка в ячейке,
//          dragRoot / dropSel / dropOk(it, цель) + actions.drop(it, цель) - режим 'pick': ещё и перетащить вещь на цель страницы;
//          menu(cellEl, it, e) - правая кнопка: меню вещи страницы (нет - встроенная карточка); Shift + правая - быстро надеть / снять;
//          dollEl - кукла (слоты и человечек) в отдельном элементе страницы (тогда нужен dragRoot - общий предок с el);
//          label - подпись сетки для экранного диктора, onDragEnd() - перетаскивание кончилось (страница дорисует отложенное), sortDefault. actions.reorder(fromUid, toUid) - свой порядок сумки: ячейку на ячейку
//          (порядок «как в сумке», фильтр «Все») и Alt+стрелки.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.LGInventory = api; root.LGItems = api.items; }
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RORD = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };

  /* ==================== 1. ячейки, сетка, перетаскивание, меню ячейки (до 25.10 - legacy/site/public/itemgrid.js) ====================
     Ячейки - тот же вид, что у Склада (.cy-grid / .cy-sc в city.css): рамка по редкости, стопки, «+N» заточки, прочность.
     Перетаскивание - pointer events: мышь - после сдвига на 6 px, палец - удержание ~0,3 с (прокрутка не ломается).
     Без циклов по кадрам: призрак двигается transform'ом только на pointermove, подсветка цели - классом.
     Клик / нажатие без перетаскивания - o.tap (путь без перетаскивания остаётся всегда). */
  // ячейки: снаряжение — по одной, одинаковые расходники — стопками по stack (как у Склада игры); надетое — не в сумке.
  // o.keep — порядок как в списке (Склад: «Разложить» хранит порядок в игре), иначе — редкость, потом название
  function cells(list, stack, o = {}) {
    const out = [], by = new Map(), byQ = new Map(), k = Math.max(1, +stack || 20);
    for (const it of list || []) {
      if (!it || it.on) continue;
      // 26.10: руда шахты — кучка (q осколков в одной вещи): одна ячейка на вид, число на ячейке — штуки с долями (oreQty)
      if (it.qty) { let c = byQ.get(it.id); if (!c) { c = { it: { ...it, q: +it.q || 0 }, n: 1, uids: [it.uid], q: 1 }; byQ.set(it.id, c); out.push(c); } else { c.it.q += +it.q || 0; c.uids.push(it.uid); c.n = c.uids.length; } continue; }
      if (it.event && !it.wearable) { out.push({ it, n: 1, uids: [it.uid], ev: true }); continue; }   // угощение ивента — места не занимает
      if (it.wearable) { out.push({ it, n: 1, uids: [it.uid] }); continue; }
      let c = by.get(it.id); if (!c || c.n >= k) { c = { it, n: 0, uids: [] }; by.set(it.id, c); out.push(c); }
      c.n++; c.uids.push(it.uid);
    }
    if (o.keep) return out;
    return out.sort((a, b) => (RORD[a.it.rarity] ?? 5) - (RORD[b.it.rarity] ?? 5) || String(a.it.name).localeCompare(String(b.it.name), 'ru'));
  }

  /* одна ячейка. o: { art(it) — рисунок вещи (обязателен), on — выбрана, drag — можно тащить, off — тусклая (не подходит),
     attr — свои атрибуты (строка), low(it) — прочность низкая, extra(c) — 25.10: своя разметка внутри ячейки (номер в сумке) } */
  // 26.10: руда шахты: осколки → «4,37» (штуки с долями, 100 осколков = 1 шт.) и «4 шт. + 37 оск.»
  const oreN = (q) => { q = Math.max(0, Math.floor(+q || 0)); const n = Math.floor(q / 100), p = q % 100; return p ? `${n},${String(p).padStart(2, '0')}` : String(n); };
  const oreQty = (q) => { q = Math.max(0, Math.floor(+q || 0)); const n = Math.floor(q / 100), p = q % 100; return n && p ? `${n} шт. + ${p} оск.` : n ? `${n} шт.` : `${p} оск.`; };
  function cell(c, o = {}) {
    const it = c.it || {}, uid = c.uids ? c.uids[0] : it.uid, low = o.low ? o.low(it) : it.dur != null && +it.dur <= 30;
    const nm = `${it.name || ''}${it.qty ? ', ' + oreQty(it.q) : c.n > 1 ? ' ×' + c.n : ''}${it.dur != null ? `, прочность ${it.dur}%` : ''}`;
    return `<button type="button" class="cy-sc ig-c${o.on ? ' on' : ''}${o.off ? ' off' : ''}" data-r="${esc(it.rarity || 'common')}" data-ig="${esc(uid)}"${o.drag ? ' data-igdrag="1"' : ''}${o.attr ? ' ' + o.attr : ''} aria-pressed="${!!o.on}" aria-label="${esc(nm)}">`
      + `<span class="cy-gi">${o.art ? o.art(it) : ''}</span>${it.en > 0 ? `<i class="en">+${+it.en}</i>` : ''}${it.qty ? `<i class="n">${oreN(it.q)}</i>` : c.n > 1 ? `<i class="n">${c.n}</i>` : ''}`
      + `${it.dur != null ? `<i class="du${low ? ' br' : ''}">${low ? '⚠' : ''}${+it.dur}%</i>` : ''}${o.extra ? o.extra(c) : ''}</button>`;
  }

  /* сетка: cs — ячейки (cells), o: { cap — сколько ячеек всего (пустые — пунктиром), label — подпись для экранного диктора,
     gattr — свои атрибуты сетки (строка, например цель перетаскивания data-igdrop), ...и всё, что понимает cell;
     on(c) / drag(c) / off(c) / attr(c) — функции по ячейке } */
  function grid(cs, o = {}) {
    const f = (v, c) => (typeof v === 'function' ? v(c) : v);
    const body = cs.map((c) => cell(c, { ...o, on: f(o.on, c), drag: f(o.drag, c), off: f(o.off, c), attr: f(o.attr, c) })).join('');
    const empty = Math.max(0, Math.min(200, (+o.cap || 0) - cs.filter((c) => !c.ev).length));
    return `<div class="cy-grid ig-grid" role="group"${o.label ? ` aria-label="${esc(o.label)}"` : ''}${o.gattr ? ' ' + o.gattr : ''}>${body}${'<span class="cy-sc e" aria-hidden="true"></span>'.repeat(empty)}</div>`;
  }

  /* перетаскивание внутри root. o: {
       src — селектор того, что можно тащить (по умолчанию [data-igdrag]),
       drop — селектор целей (по умолчанию [data-igdrop]),
       ok(src, target) — можно ли бросить сюда (по умолчанию — да),
       onDrop(src, target), tap(src, e) — клик / нажатие без перетаскивания (на всё [data-ig], а не только [data-igdrag]),
       hold(src) — 24.10: палец удержали и отпустили на месте (без перетаскивания) — например, открыть меню вещи,
       onStart(src), onEnd(),
       reject(src, target) — бросили на цель, куда нельзя (ok — нет): короткое сообщение (Склад: «нет места», «идёт бой»),
       quick(src, e) — 25.10: быстрое действие, как в играх: Shift + правая кнопка мыши по ячейке,
       menu(src, e) — 25.10: правая кнопка без Shift — меню вещи (или её карточка); меню браузера убирается только внутри root и только
                если quick / menu заданы; долгое нажатие пальцем — по-прежнему перетаскивание / hold,
       shift(src, e) — Shift + левая кнопка (Склад: вся стопка); без shift — обычное нажатие (tap),
       snap — не туда / нельзя: призрак плавно возвращается на место (transform), потом исчезает,
       scroll — окно с прокруткой (Склад на телефоне): палец у верхнего / нижнего края — окно прокручивается само;
                'page' — 26.10: и сама страница, если окна с прокруткой нет («Персонаж»: из сумки внизу на куклу вверху)
                (таймер только пока тянут у края, без кадров по кругу) }
     Возвращает { off() — снять обработчики, active() — тащат ли сейчас } */
  function drag(root, o = {}) {
    const SRC = o.src || '[data-igdrag]', DROP = o.drop || '[data-igdrop]', TAP = o.tapSel || '[data-ig]';
    const D = { src: null, id: null, x0: 0, y0: 0, timer: 0, ghost: null, over: null, bad: null, active: false, just: false, touch: false, sc: null, st: 0, vy: 0, px: 0, py: 0 };
    const coarse = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const targets = () => Array.from(root.querySelectorAll(DROP));
    function reset() {
      clearTimeout(D.timer); clearTimeout(D.st);
      if (D.ghost) D.ghost.remove();
      if (D.src) D.src.classList.remove('ig-dragging');
      targets().forEach((t) => t.classList.remove('ig-ok', 'ig-hover', 'ig-no'));
      root.classList.remove('ig-on');
      const was = D.active;
      Object.assign(D, { src: null, id: null, timer: 0, ghost: null, over: null, bad: null, active: false, sc: null, st: 0, vy: 0 });
      if (was && o.onEnd) try { o.onEnd(); } catch (e) { console.warn('[перетаскивание]', e); }
    }
    function start(x, y) {
      if (!D.src || !D.src.isConnected) return reset();
      D.active = true; root.classList.add('ig-on'); D.src.classList.add('ig-dragging');
      const g = document.createElement('div'); g.className = 'ig-ghost lgi-ghost'; g.dataset.r = D.src.dataset.r || 'common';
      const a = D.src.querySelector('.cy-gi, .art'); g.innerHTML = a ? a.outerHTML : '';
      document.body.appendChild(g); D.ghost = g;
      targets().forEach((t) => { if (!o.ok || o.ok(D.src, t)) t.classList.add('ig-ok'); });
      if (o.scroll) for (let el = root; el && el !== document.body; el = el.parentElement) { const oy = getComputedStyle(el).overflowY; if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 4) { D.sc = el; break; } }
      if (o.scroll === 'page' && !D.sc) { const se = document.scrollingElement; if (se && se.scrollHeight > window.innerHeight + 4) D.sc = se; }   // 26.10: окна с прокруткой нет - прокручивается сама страница («Персонаж»: из сумки внизу на куклу вверху)
      if (o.onStart) try { o.onStart(D.src); } catch (e) { console.warn('[перетаскивание]', e); }
      if (D.touch && navigator.vibrate) try { navigator.vibrate(12); } catch {}
      move(x, y);
    }
    // цель под пальцем: можно (ok) — в D.over, нельзя — в D.bad (подсветка «нельзя», при броске — reject)
    function targetAt(x, y) {
      const e = document.elementFromPoint(x, y), t = e && e.closest(DROP);
      if (!t || !root.contains(t)) return [null, null];
      return !o.ok || o.ok(D.src, t) ? [t, null] : [null, t];
    }
    function move(x, y) {
      D.px = x; D.py = y;
      if (D.ghost) D.ghost.style.transform = `translate(${Math.round(x - 30)}px, ${Math.round(y - 30)}px)`;
      const [t, bad] = targetAt(x, y);
      if (t !== D.over) { if (D.over) D.over.classList.remove('ig-hover'); if (t) t.classList.add('ig-hover'); D.over = t; }
      if (bad !== D.bad) { if (D.bad) D.bad.classList.remove('ig-no'); if (bad && bad !== D.src.closest(DROP)) bad.classList.add('ig-no'); D.bad = bad; }
      if (D.sc) {   // у края прокручиваемого окна — прокрутка (шаг — по таймеру, пока палец там)
        const r = D.sc === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : D.sc.getBoundingClientRect(), E = 56;
        D.vy = y < r.top + E ? -Math.min(18, Math.ceil((r.top + E - y) / 3)) : y > r.bottom - E ? Math.min(18, Math.ceil((y - r.bottom + E) / 3)) : 0;
        if (D.vy && !D.st) D.st = setTimeout(scrollStep, 30);
      }
    }
    function scrollStep() {
      D.st = 0; if (!D.active || !D.sc || !D.vy) return;
      const before = D.sc.scrollTop; D.sc.scrollTop += D.vy;
      if (D.sc.scrollTop !== before) move(D.px, D.py);
    }
    // не туда / нельзя — призрак возвращается к ячейке и исчезает (только transform)
    function snapBack(g, s) {
      if (!g) return;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, r = s && s.isConnected && s.getBoundingClientRect();
      if (reduce || !r) { g.remove(); return; }
      g.style.transition = 'transform .18s ease'; g.style.transform = `translate(${Math.round(r.left + r.width / 2 - 30)}px, ${Math.round(r.top + r.height / 2 - 30)}px)`;
      setTimeout(() => g.remove(), 200);
    }
    function onDown(e) {
      D.lastTouch = e.pointerType === 'touch';
      if (e.button !== 0 || D.src) return;
      const s = e.target.closest(SRC); if (!s || !root.contains(s)) return;
      Object.assign(D, { src: s, id: e.pointerId, x0: e.clientX, y0: e.clientY, touch: e.pointerType === 'touch' });
      if (D.touch) D.timer = setTimeout(() => { if (D.src) start(D.x0, D.y0); }, 280);
    }
    function onMove(e) {
      if (!D.src || e.pointerId !== D.id) return;
      if (!D.active) {
        const d = Math.hypot(e.clientX - D.x0, e.clientY - D.y0);
        if (D.touch) { if (d > 10) reset(); return; }   // палец поехал раньше удержания — это прокрутка
        if (d > 6) start(e.clientX, e.clientY); else return;
      }
      e.preventDefault(); move(e.clientX, e.clientY);
    }
    function onUp(e) {
      if (!D.src || e.pointerId !== D.id) return;
      if (!D.active) return reset();
      const t = D.over, bad = D.bad, s = D.src; D.just = true; setTimeout(() => { D.just = false; }, 0);
      // 24.10: палец подержали и отпустили на месте (не тащили) — o.hold (Склад: меню «1 / половина / всё / N…»)
      if (D.touch && o.hold && Math.hypot(e.clientX - D.x0, e.clientY - D.y0) < 12 && (!t || t === s.closest(DROP))) { if (D.ghost) D.ghost.remove(); D.ghost = null; reset(); o.hold(s); return; }
      if (!t && o.snap) { snapBack(D.ghost, s); D.ghost = null; }
      reset();
      if (t && o.onDrop) o.onDrop(s, t);
      else if (bad && o.reject) o.reject(s, bad);
    }
    const onCancel = () => { if (!D.src) return; if (D.active && o.snap) { snapBack(D.ghost, D.src); D.ghost = null; } reset(); };
    const onTouch = (e) => { if (D.active) e.preventDefault(); };   // пока тянем пальцем — страница не прокручивается
    const onCtx = (e) => {
      if (D.src) { e.preventDefault(); return; }   // долгое нажатие — не меню браузера
      // 25.10 (решение стримера): Shift + правая кнопка — быстрое действие (quick), правая кнопка — меню вещи (menu); без меню браузера
      if (D.lastTouch || (!o.quick && !o.menu)) return;
      const s = e.target.closest(TAP); if (!s || !root.contains(s)) return;
      if (e.shiftKey && o.quick) { e.preventDefault(); o.quick(s, e); return; }
      if (o.menu) { e.preventDefault(); o.menu(s, e); }
    };
    const onKey = (e) => { if (e.key === 'Escape' && D.active) { if (o.snap) { snapBack(D.ghost, D.src); D.ghost = null; } reset(); } };
    // после перетаскивания браузер шлёт «клик» по исходной ячейке — это не выбор
    const onClick = (e) => {
      if (D.just) { e.stopPropagation(); e.preventDefault(); return; }
      const s = e.target.closest(TAP); if (!s || !root.contains(s)) return;
      if (e.shiftKey && o.shift) { e.preventDefault(); o.shift(s, e); return; }   // 25.10: Shift+клик — своё у окна (Склад: вся стопка)
      if (o.tap) o.tap(s, e);
    };
    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('touchmove', onTouch, { passive: false });
    root.addEventListener('contextmenu', onCtx);
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return {
      active: () => D.active || !!D.src,
      dragging: () => D.active,   // 23.10: именно тащат (не просто нажали)
      off() {
        reset();
        root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel); window.removeEventListener('touchmove', onTouch); root.removeEventListener('contextmenu', onCtx);
        root.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey);
      },
      coarse,
    };
  }

  /* 24.10: маленькое меню у ячейки (Склад: «1 / половина / всё / N…»). at — элемент или { x, y }; items — [{ t, v, aria? }],
     v: число — выбрать сразу, 'n' — поле «сколько» (max — o.max); pick(v) — выбрали. Одно меню на странице: новое закрывает старое.
     Клавиатура: фокус на первой кнопке, стрелки — по кнопкам, Esc — закрыть (фокус — обратно на ячейку). Без циклов по кадрам. */
  let MENU = null;
  function menuClose(back) {
    if (!MENU) return; const m = MENU; MENU = null;
    m.el.remove(); document.removeEventListener('pointerdown', m.out, true); document.removeEventListener('keydown', m.key, true);
    window.removeEventListener('scroll', m.sc, true); window.removeEventListener('resize', m.sc);
    if (back && m.back && m.back.isConnected) try { m.back.focus(); } catch {}
  }
  function menu(at, items, o = {}) {
    menuClose(false);
    const el = document.createElement('div'); el.className = 'ig-menu'; el.setAttribute('role', 'menu'); if (o.label) el.setAttribute('aria-label', o.label);
    el.innerHTML = (o.title ? `<div class="ig-mt">${esc(o.title)}</div>` : '') + items.map((x, i) => `<button type="button" role="menuitem" data-i="${i}"${x.aria ? ` aria-label="${esc(x.aria)}"` : ''}>${esc(x.t)}</button>`).join('')
      + `<form class="ig-mn" hidden><input type="number" inputmode="numeric" min="1" max="${Math.max(1, +o.max || 1)}" step="1" value="${Math.max(1, Math.min(+o.max || 1, +o.def || 1))}" aria-label="Сколько (1–${Math.max(1, +o.max || 1)})"><button type="submit">OK</button></form>`;
    document.body.appendChild(el);
    const back = at && at.nodeType === 1 ? at : document.activeElement;
    const r = at && at.nodeType === 1 ? at.getBoundingClientRect() : { left: (at && at.x) || 0, right: (at && at.x) || 0, top: (at && at.y) || 0, bottom: (at && at.y) || 0 };
    const w = el.offsetWidth, hgt = el.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const x = Math.max(8, Math.min(vw - w - 8, r.left)), y = r.bottom + hgt + 8 <= vh ? r.bottom + 4 : Math.max(8, r.top - hgt - 4);
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    const btns = () => Array.from(el.querySelectorAll('[role="menuitem"]'));
    const done = (v) => { menuClose(true); if (o.pick) o.pick(v); };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const it = items[+b.dataset.i]; if (!it) return;
      if (it.v === 'n') { const f = el.querySelector('.ig-mn'); f.hidden = false; const inp = f.querySelector('input'); inp.focus(); inp.select(); return; }
      done(it.v);
    });
    el.querySelector('.ig-mn').addEventListener('submit', (e) => {
      e.preventDefault(); const inp = el.querySelector('.ig-mn input'), k = Number(inp.value), max = Math.max(1, +o.max || 1);
      if (!Number.isInteger(k) || k < 1 || k > max) { inp.setCustomValidity(`Целое число от 1 до ${max}`); inp.reportValidity(); return; }
      done(k);
    });
    el.querySelector('.ig-mn input').addEventListener('input', (e) => e.target.setCustomValidity(''));
    const out = (e) => { if (!el.contains(e.target)) menuClose(false); };
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); menuClose(true); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const b = btns(), i = b.indexOf(document.activeElement); if (i < 0 && !el.contains(document.activeElement)) return; e.preventDefault(); const j = (i + (e.key === 'ArrowDown' ? 1 : -1) + b.length) % b.length; b[j].focus(); }
      else if (e.key === 'Tab' && !el.contains(document.activeElement)) menuClose(false);
    };
    const sc = (e) => { if (!e || !e.target || !el.contains(e.target)) menuClose(false); };
    MENU = { el, out, key, sc, back };
    setTimeout(() => { if (MENU && MENU.el === el) { document.addEventListener('pointerdown', out, true); window.addEventListener('scroll', sc, true); window.addEventListener('resize', sc); } }, 0);
    document.addEventListener('keydown', key, true);
    const f = btns()[0]; if (f) f.focus({ preventScroll: true });
    return { close: () => menuClose(false), el };
  }
  const items = { esc, cells, cell, grid, drag, menu, menuClose };

  /* ==================== 2. рисунки вещей (до 25.10 - app.js сайта): из того же движка, что человечки на стриме ====================
     Движок - window.MDDoodle (сборка /doodle.js), части стиля (товары, легендарки) - engine().part(имя). Страница может
     подставить свои: LGInventory.configure({ engine: () => движок, part: (имя) => часть }); смена стиля - LGInventory.artReset(). */
  let ENGF = () => root.MDDoodle, PARTF = null;
  const PC = {};
  const ENG = () => { try { return ENGF(); } catch (e) { return null; } };
  function PART(n) {
    if (PARTF) return PARTF(n);
    const d = ENG(); if (!d || !d.part) return null;
    const k = (d.active || '') + ':' + n;
    if (!(k in PC)) { try { PC[k] = d.part(n) || null; } catch (e) { PC[k] = null; } }
    return PC[k];
  }
  const LINE = 'stroke="#f5f2ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const AURA = { sparks: ['#ffe27a', '#ff9f3d'], frost: ['#bff1ff', '#4ab0ff'], shadow: ['#b06bff', '#3a1a6a'], gold: ['#ffe08a', '#e8a32a'], halo: ['#fff6c8', '#ffd76a'] };
  const FOOD = {
    apple: (c = '#e8455c') => `<circle cy="-14" r="13" fill="${c}" ${LINE}/><path d="M0 -27q2-7 7-9" stroke="#6b4423" stroke-width="3" fill="none"/><ellipse cx="6" cy="-34" rx="5" ry="2.6" fill="#6fbf4a"/>`,
    bread: () => `<path d="M-24 0C-27-22 27-22 24 0Z" fill="#d9993f" ${LINE}/><path d="M-11-13l5 7M1-15l5 7M12-13l4 6" stroke="#8a5a2b" stroke-width="2.5"/>`,
    cheese: () => `<path d="M-22 0H22V-20L-22-8Z" fill="#ffd34d" ${LINE}/><circle cx="-4" cy="-6" r="3" fill="#e8b923"/><circle cx="10" cy="-11" r="2.5" fill="#e8b923"/>`,
    ham: () => `<path d="M-22 0C-28-26 10-32 20-12 24-4 16 4-22 0Z" fill="#e88a7a" ${LINE}/><path d="M16-10l12-9" stroke="#f5f2ff" stroke-width="7" stroke-linecap="round"/><path d="M-14-6c8-8 18-8 24-2" stroke="#c25e52" stroke-width="2.5" fill="none"/>`,
    pie: () => `<path d="M-24 0L-20-14H20L24 0Z" fill="#d9993f" ${LINE}/><path d="M-18-14q18-14 36 0" fill="#e8455c" ${LINE}/>`,
    mug: (c = '#c58a45') => `<rect x="-14" y="-30" width="24" height="30" rx="4" fill="${c}" ${LINE}/><path d="M10-24h5a5 5 0 0 1 0 12h-5" fill="none" ${LINE}/><path d="M-14-24h24" stroke="#fff3d6" stroke-width="5"/>`,
    cup: () => `<path d="M-16-22H14L10 0H-12Z" fill="#9fe39a" ${LINE}/><path d="M-6-28q4-6 0-12M4-28q4-6 0-12" stroke="#f5f2ff" stroke-width="2" fill="none" opacity=".8"/>`,
    bowl: () => `<path d="M-24-14H24C22 0 12 4 0 4S-22 0-24-14Z" fill="#a0703a" ${LINE}/><path d="M-18-14q8-8 18-2 10-6 18 2" fill="#e8455c" ${LINE}/>`,
    cake: () => `<path d="M-20 0V-18H20V0Z" fill="#ffd38a" ${LINE}/><path d="M-20-18q10-8 20 0 10-8 20 0" fill="#ff9fb2" ${LINE}/><circle cy="-26" r="4" fill="#e8455c" ${LINE}/>`,
    pretzel: () => `<path d="M-16-6c-10-12 6-24 16-10 10-14 26-2 16 10-6 8-26 8-32 0z" fill="none" stroke="#b5762f" stroke-width="7"/>`,
  };
  const FOOD_ID = { apple: ['apple'], pear: ['apple', '#9fe39a'], bread: ['bread'], pretzel: ['pretzel'], cheese: ['cheese'], pie: ['pie'], ham: ['ham'], roast: ['ham'], kvass: ['mug'], honey_cake: ['cake'], sage_tea: ['cup'], spicy_stew: ['bowl'] };
  let HATS = null, artN = 0;
  /* 26.10: руда шахты — горка самородков цвета ресурса (порода — серые глыбы), самоцвет природы — гранёный камень с бликом.
     Цвета — как у руды в шахте (craftworld.js RES). */
  const ORE_C = { stone: ['#a39a8e', '#6f675d'], basalt: ['#5b5560', '#36323a'], frost_stone: ['#cfe3ee', '#7fa3b8'], limestone: ['#e6dcc0', '#b3a37c'], sandstone: ['#e2b77a', '#a8783f'], rubble: ['#b0a596', '#776b5c'],
    coal: ['#4a4a52', '#1d1d22'], iron: ['#c9a28a', '#8a5a44'], copper: ['#e3925a', '#a3542a'], sulfur: ['#f2df4a', '#b19a17'], peat: ['#7a5a3a', '#4a331d'], bone_dust: ['#efe6d2', '#b7a98a'], salt: ['#f4f2ee', '#bdb6aa'],
    silver: ['#e6ecf2', '#9aa7b4'], relic: ['#d6b56a', '#8a6a2a'], gold: ['#ffd84a', '#c48a12'], crystal: ['#b7f0ff', '#4aa9d6'],
    adamant: ['#9fb6ff', '#3a4fb8'], fire_opal: ['#ff8a4a', '#c0341c'], emerald: ['#5ee08a', '#1a8a4a'], amber: ['#ffc24a', '#c47a12'], sapphire: ['#5a8cff', '#1c3aa8'], topaz: ['#ffd27a', '#d08a1a'],
    malachite: ['#3ad0a0', '#11735a'], morion: ['#6a5a7a', '#2a1f36'], aquamarine: ['#8af0e8', '#2aa8b0'], ruby: ['#ff4a6a', '#a8142e'], runestone: ['#9aa0b8', '#4a5070'] };
  function oreArt(it, q) {
    // 26.10 (art/ore-icons): свой значок у каждого из 28 видов - legacy/site/public/ore-art.js (window.LGOreArt), если страница его загрузила;
    // иначе (расширение Twitch и т. п.) - простая горка ниже
    const res = it.res || String(it.id || '').replace(/^ore_/, '');
    if (root.LGOreArt) { try { const s = root.LGOreArt.inner(res, it.ore, q); if (s) return s; } catch (e) { /* рисунка нет */ } }
    const [c1, c2] = ORE_C[res] || ['#b0a596', '#776b5c'], L = 'stroke="#2a2018" stroke-width="2.5" stroke-linejoin="round"';
    if (it.ore === 'gem') return `<defs><linearGradient id="${q}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
      + `<path d="M-18-30L-8-42H8L18-30 0-4Z" fill="url(#${q})" ${L}/><path d="M-18-30H18M-8-42L-4-30 0-4 4-30 8-42" fill="none" stroke="#fff" stroke-width="1.6" opacity=".6"/><path d="M22-46l1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4Z" fill="#fff"/>`;
    const base = it.ore === 'base';
    return `<path d="M-26-4L-22-18-12-24-2-20 4-10-2-4Z" fill="${base ? c2 : '#7a7068'}" ${L}/><path d="M2-4L6-20 16-26 26-18 28-6 22-4Z" fill="${base ? c1 : '#8f857b'}" ${L}/><path d="M-12-14L-6-32 6-38 14-28 10-12 0-8Z" fill="${base ? c1 : '#9c9186'}" ${L}/>`
      + (base ? `<path d="M-6-28L2-32M14-20L20-16" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>`
        : `<path d="M-8-24L-2-30 4-26 0-19Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/><path d="M8-14L14-18 18-13 13-10Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/><path d="M-20-12L-15-16-11-12-16-9Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/><path d="M-5-27L-2-29" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`);
  }
  function artInner(it) {
    const d = ENG(), lk = it.look || {}, r = it.rarity || 'common';
    try {
      if (it.slot === 'weapon') return d.weaponArt ? `<g transform="rotate(38)">${d.weaponArt(lk.weapon || 'sword', r)}</g>` : '';
      if (it.slot === 'shield') return d.shieldArt ? d.shieldArt(lk.shield || 'round', r) : '';
      if (it.slot === 'armor') { const kind = lk.armor || (it.id === 'robe' || /мант/i.test(it.name || '') ? 'robe' : 'lorica'); return d.armorArt ? d.armorArt(kind, r) : ''; }
      if (it.slot === 'helmet') { HATS = HATS || d.jHats({ top: 0, hw: 22, square: false, eyeY: 30 }, '#ff9fb2', '#4ab0ff'); return HATS[(lk.hat || 'legion') + '@' + r] || HATS[lk.hat || 'legion'] || HATS.legion || ''; }
      if (it.slot === 'trinket' && lk.charm && d.charmArt) return d.charmArt(lk.charm, r);   // 23.10: амулет класса
      if (it.slot === 'trinket') {
        const [g1, g2] = AURA[lk.aura] || AURA.sparks, gid = 'tg' + (lk.aura || 's') + (++artN);
        return `<defs><radialGradient id="${gid}" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></radialGradient></defs>`
          + `<path d="M-16-46Q0-20 16-46" fill="none" stroke="#c9a35a" stroke-width="3.5" stroke-dasharray="1 5" stroke-linecap="round"/>`
          + (lk.aura === 'halo' ? `<ellipse cy="-30" rx="17" ry="6" fill="none" stroke="#ffd76a" stroke-width="4"/>` : '')
          + `<path d="M0-24L14-10 0 6-14-10Z" fill="url(#${gid})" ${LINE}/><path d="M-5-12L0-18 5-12" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>`;
      }
      // 17.10: Печать Метаморфозы — магическая печать: сияние, кольцо рун, в центре — знак перемены облика (две стрелки по кругу)
      if (it.slot === 'relic') {
        // 18.10: свои id градиентов у каждого рисунка — одинаковые id в нескольких SVG (сумка, карточка, подсказка) на телефоне
        // давали мерцание рамки: ссылка url(#…) прыгала на рисунок, который в этот момент скрыт или перерисовывается
        const q = 's' + (++artN);
        const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const c = Math.cos(a * Math.PI / 180), s2 = Math.sin(a * Math.PI / 180), r1 = a % 90 ? 31 : 29, r2 = a % 90 ? 36 : 42; return `<path d="M${(c * r1).toFixed(1)} ${(-26 + s2 * r1).toFixed(1)}L${(c * r2).toFixed(1)} ${(-26 + s2 * r2).toFixed(1)}" stroke="#e7c8ff" stroke-width="${a % 90 ? 2 : 3}" stroke-linecap="round" opacity=".85"/>`; }).join('');
        const runes = Array.from({ length: 12 }, (_, i) => { const a = (i * 30 + 15) * Math.PI / 180, x = Math.cos(a) * 20.5, y = -26 + Math.sin(a) * 20.5; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 3 ? 1.4 : 2.2}" fill="#fff3c4"/>`; }).join('');
        return `<defs><radialGradient id="${q}g"><stop offset="0" stop-color="#d59bff" stop-opacity=".75"/><stop offset=".55" stop-color="#8b5cf6" stop-opacity=".28"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>`
          + `<radialGradient id="${q}d" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#f0c6ff"/><stop offset=".45" stop-color="#9b4dff"/><stop offset="1" stop-color="#3a1670"/></radialGradient>`
          + `<linearGradient id="${q}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe7ff"/><stop offset=".5" stop-color="#c78bff"/><stop offset="1" stop-color="#ff9be6"/></linearGradient></defs>`
          + `<circle cy="-26" r="44" fill="url(#${q}g)"/>${rays}`
          + `<circle cy="-26" r="26" fill="url(#${q}d)" stroke="url(#${q}r)" stroke-width="5"/><circle cy="-26" r="20.5" fill="none" stroke="#e7c8ff" stroke-width="1.4" opacity=".7"/>${runes}`
          + `<path d="M-10.5-31.5A12 12 0 0 1 10.5-31.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M10.8-36.5L11.2-30.6 5.6-31.8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
          + `<path d="M10.5-20.5A12 12 0 0 1-10.5-20.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M-10.8-15.5L-11.2-21.4-5.6-20.2" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
          + `<path d="M0-30.5L1.6-27.6 4.6-26 1.6-24.4 0-21.5-1.6-24.4-4.6-26-1.6-27.6Z" fill="#fff3c4"/>`
          + `<path d="M-30-50l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5Z" fill="#fff" opacity=".9"/><path d="M28-8l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1Z" fill="#7fe7ff"/><circle cx="33" cy="-46" r="1.8" fill="#ff9be6"/>`;
      }
      // 20.10: материалы заточки — Счастливая звезда, Сфера сохранения, Печать Ауруса N (номер на печати)
      if (it.slot === 'material') {
        const q = 'm' + (++artN);
        if (it.mat === 'ore') return oreArt(it, q);   // 26.10: руда, порода и самоцветы шахты
        if (it.mat === 'star') return `<defs><radialGradient id="${q}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff6c8"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#e89a1c"/></radialGradient></defs>`
          + `<path d="M0-46L8.8-28.1 28.5-25.3 14.3-11.4 17.6 8.2 0-1.1-17.6 8.2-14.3-11.4-28.5-25.3-8.8-28.1Z" fill="url(#${q})" ${LINE}/><path d="M-6-28l3-6M6-30l2 3" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/><path d="M26-44l1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4Z" fill="#fff6c8"/>`;
        if (it.mat === 'sphere') return `<defs><radialGradient id="${q}" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#e8fbff"/><stop offset=".45" stop-color="#7fd6e6"/><stop offset="1" stop-color="#2a5f9e"/></radialGradient></defs>`
          + `<ellipse cy="-2" rx="20" ry="5" fill="#a0703a" ${LINE}/><circle cy="-24" r="20" fill="url(#${q})" ${LINE}/><ellipse cy="-24" rx="27" ry="8" fill="none" stroke="#e7f6ff" stroke-width="2.5" opacity=".75" transform="rotate(-18 0 -24)"/><path d="M-10-34a12 12 0 0 1 9-5" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>`;
        const n = +it.seal || 5;
        return `<defs><radialGradient id="${q}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="${n >= 10 ? '#ffb84a' : '#d8a64a'}"/><stop offset="1" stop-color="${n >= 10 ? '#a8560c' : '#7a5418'}"/></radialGradient></defs>`
          + `<path d="M-9-2l-7 14 7-3 4 6 3-17ZM9-2l7 14-7-3-4 6-3-17Z" fill="${n >= 10 ? '#e8455c' : '#8b5cf6'}" ${LINE}/><circle cy="-24" r="23" fill="url(#${q})" ${LINE}/><circle cy="-24" r="16.5" fill="none" stroke="#fff3c4" stroke-width="1.6" stroke-dasharray="2.5 3.2" opacity=".85"/>`
          + `<text y="-16.5" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="${n >= 10 ? 19 : 22}" fill="#4a2c06">${n}</text>`;
      }
      // еда, зелья и свитки — из стиля (часть 'goods' в MultiDonate): тот же рисунок, что в лавке Похода, и совпадает с названием
      if (it.slot === 'food' || it.slot === 'potion' || it.slot === 'scroll') {
        const G = d.part && PART('goods');
        if (G) { if (it.slot === 'food' && G.food && G.food[it.id]) return G.food[it.id](it); if (it.slot === 'potion' && G.potion) return G.potion(it); if (it.slot === 'scroll' && G.scroll) return G.scroll(it); }
      }
      if (it.slot === 'potion') { const big = (it.effect && it.effect.heal) >= 20; return `<rect x="-5" y="-44" width="10" height="9" rx="2" fill="#c58a45" ${LINE}/><path d="M-6-35V-27C-18-21-18 0 0 0S18-21 6-27V-35Z" fill="${big ? '#e8455c' : '#ff8aa0'}" ${LINE}/><path d="M-9-13Q0-8 9-13" stroke="#fff" stroke-width="2.5" fill="none" opacity=".55"/>`; }
      if (it.slot === 'scroll') return `<rect x="-20" y="-34" width="40" height="28" rx="3" fill="#f3e2b8" ${LINE}/><rect x="-26" y="-38" width="8" height="36" rx="4" fill="#e0c690" ${LINE}/><rect x="18" y="-38" width="8" height="36" rx="4" fill="#e0c690" ${LINE}/><path d="M-12-27H10M-12-20H6" stroke="#8a6a3a" stroke-width="2.5"/>${it.effect && it.effect.revive ? `<circle cx="6" cy="-12" r="6" fill="#e8455c" ${LINE}/>` : ''}`;
      if (it.slot === 'food') { const [k, c] = FOOD_ID[it.id] || ['bread']; return FOOD[k](c); }
    } catch (e) { console.warn('рисунок вещи', it.id, e); }
    return `<rect x="-16" y="-30" width="32" height="28" rx="6" fill="#a0703a" ${LINE}/>`;
  }
  // подгоняем рамку под рисунок один раз на вид вещи (getBBox на невидимом холсте)
  const VB = new Map();
  let probe = null;
  function viewBoxFor(key, inner) {
    if (VB.has(key)) return VB.get(key);
    let vb = '-40 -60 80 80';
    try {
      if (!probe) { probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); probe.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:200px;height:200px;visibility:hidden'); document.body.appendChild(probe); }
      probe.innerHTML = `<g>${inner}</g>`;
      const b = probe.firstChild.getBBox();
      if (b.width > 0) { const s = Math.max(b.width, b.height) * 1.16, cx = b.x + b.width / 2, cy = b.y + b.height / 2; vb = `${(cx - s / 2).toFixed(1)} ${(cy - s / 2).toFixed(1)} ${s.toFixed(1)} ${s.toFixed(1)}`; }
    } catch {}
    VB.set(key, vb); return vb;
  }
  // 18.10: SVG-анимации (лучи вращаются, искры мерцают, под ними — размытие) заставляли браузер перерисовывать
  // рисунок каждый кадр: вкладка «Персонаж» с легендаркой грузила процессор на 25%. На сайте рисунок неподвижный,
  // а «живость» легендарке даёт золотое сияние ячейки (CSS: только прозрачность — без перерисовки)
  const still = (svg) => String(svg).replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*?(\/>|>[\s\S]*?<\/\1>)/g, '').replace(/<g opacity="0">/g, '<g opacity=".8">');
  function art(it, cls = '') {
    const lk = it.look || {}, key = [it.slot, it.id, lk.weapon, lk.shield, lk.hat, lk.aura, it.rarity].join('|');
    const inner = artInner(it);
    // легендарка с босса — с эмблемой своей ауры, лучами и искрами (тот же рисунок, что в Походе: часть 'legend')
    if (it.boss && it.aura) {
      const L = PART('legend');
      if (L && L.wrap) try {
        const [x, y, w, h] = viewBoxFor(key, inner).split(' ').map(Number), k = 1 / 1.16, box = { x: x + w * (1 - k) / 2, y: y + h * (1 - k) / 2, w: w * k, h: h * k };
        return `<svg class="art lgd ${cls}" viewBox="${L.viewBox(box)}" aria-hidden="true">${still(L.wrap(inner, it, box))}</svg>`;
      } catch (e) { console.warn('легендарка', it.id, e); }
    }
    return `<svg class="art ${cls}" viewBox="${viewBoxFor(key, inner)}" aria-hidden="true">${inner}</svg>`;
  }
  // золотое сияние вокруг ячейки легендарки (отдельный элемент — у оформлений свои ::before/::after)
  const lgx = (it) => (it && it.rarity === 'legendary' ? '<i class="lgx" aria-hidden="true"></i>' : '');
  // силуэты пустых слотов и значки фильтра - те же рисунки, что у пустых слотов «Персонажа»
  const EMPTY = { weapon: { slot: 'weapon', id: '_w', look: { weapon: 'sword' } }, armor: { slot: 'armor', id: 'lorica' }, shield: { slot: 'shield', id: '_s', look: { shield: 'scutum' } }, helmet: { slot: 'helmet', id: '_h', look: { hat: 'legion' } }, trinket: { slot: 'trinket', id: '_t', look: { aura: 'gold' } } };
  function configure(o = {}) { if (o.engine) ENGF = o.engine; if (o.part) PARTF = o.part; }
  function artReset() { VB.clear(); HATS = null; for (const k of Object.keys(PC)) delete PC[k]; }

  /* ==================== 3. инвентарь: LGInventory.mount ==================== */
  const VARIANTS = ['full', 'compact', 'sheet', 'inline'], MODES = ['equip', 'storage', 'pick', 'view'];
  const SLOTS5 = ['helmet', 'weapon', 'armor', 'shield', 'trinket'], LEFT = ['helmet', 'armor', 'trinket'], RIGHT = ['weapon', 'shield'];
  const SLOT_RU = { weapon: 'оружие', shield: 'щит', armor: 'доспех', helmet: 'шлем', trinket: 'амулет', food: 'еда', potion: 'зелье', scroll: 'свиток', material: 'материал заточки', relic: 'особая вещь' };
  const SIL_NAME = { weapon: 'Оружие', armor: 'Доспех', shield: 'Щит', helmet: 'Шлем', trinket: 'Амулет' };
  const RAR = { common: 'Обычное', uncommon: 'Необычное', rare: 'Редкое', epic: 'Эпическое', legendary: 'Легендарное' };
  const STL = { hp: 'Здоровье', atk: 'Физ. урон', mag: 'Магия', def: 'Броня', crit: 'Шанс крита', critDmg: 'Сила крита', dodge: 'Уклонение', pierce: 'Пробивание', healPow: 'Сила лечения', luck: 'Удача', resist: 'Сопротивление' };
  const USE = new Set(['food', 'potion', 'scroll']);
  const FILTER_RU = { all: 'Все', weapon: 'Оружие', armor: 'Броня', helmet: 'Шлемы', shield: 'Щиты', trinket: 'Амулеты', use: 'Еда и зелья', other: 'Прочее' };
  const FILTERS = ['all', 'weapon', 'armor', 'helmet', 'shield', 'trinket', 'other'];
  const SORTS = [['rar', 'редкость'], ['slot', 'тип'], ['name', 'название'], ['new', 'как в сумке']];
  const TXT = {
    bag: 'Сумка', storage: 'Склад', close: 'Закрыть сумку', empty: 'Здесь пусто', on: 'Надеть', off: 'Снять', eat: 'Съесть', drink: 'Выпить', use: 'Использовать',
    put: 'На склад', take: 'В сумку', all: 'Всё', worn: 'надето', noUse: 'Здесь не используется', cantUse: 'Это не надеть', wrongSlot: 'Сюда не надеть - перетащи на слот своего типа',
    full: 'Нет места', can: 'Не подходит', picked: 'выбрано', none: 'Выбери вещь в сумке или на герое', equipped: 'Надето',
    trash: 'Выбросить', trashSub: 'перетащи сюда вещь', trashOn: 'Надетую вещь не выбросить - сначала сними', trashPick: 'Перетащи вещь сюда или выбери её и нажми «Выбросить»',
    trashYes: 'Да, выбросить', trashNo: 'Отмена',
  };
  const RAR_LOW = { epic: 'эпическая', legendary: 'легендарная' };

  /* 28.10 (bag-trash): окно «Выбросить?» - подтверждение (необратимо). o: { title, name, rarity, n - сколько в стопке (больше 1 - выбор
     «1 / все»), ore - кучка руды (только целиком), yes(k) - выбросить k }. Esc, «Отмена» и щелчок мимо - отмена; фокус - на «Отмена»
     (Enter не выбросит случайно), по закрытии - обратно. Одно окно на странице. Без анимации по кадрам. */
  let DLG = null;
  function dlgClose() {
    if (!DLG) return; const d = DLG; DLG = null;
    d.el.remove(); document.removeEventListener('keydown', d.key, true);
    if (d.back && d.back.isConnected) try { d.back.focus({ preventScroll: true }); } catch {}
  }
  function trashAsk(o) {
    dlgClose();
    const n = Math.max(1, +o.n || 1), many = n > 1 && !o.ore, rare = RAR_LOW[o.rarity] || '', t = { ...TXT, ...(o.labels || {}) };
    const el = document.createElement('div'); el.className = 'lgi-dlgw';
    const head = (k) => `Выбросить «${esc(o.name)}»${k > 1 ? ` (×${k})` : ''}?`;
    el.innerHTML = `<div class="lgi-dlg" role="alertdialog" aria-modal="true" aria-labelledby="lgiDlgT" aria-describedby="lgiDlgD" data-r="${esc(o.rarity || 'common')}">`
      + `<p class="lgi-dlgt" id="lgiDlgT">${head(many ? 1 : n)}</p>`
      + `<p class="lgi-dlgd" id="lgiDlgD">Вещь пропадёт навсегда${o.ore ? ' (вся кучка)' : ''}, монет за неё не будет.</p>`
      + (rare ? `<p class="lgi-dlgw-r" role="note">⚠ Это ${rare} вещь! Вернуть её не получится.</p>` : '')
      + (many ? `<div class="lgi-dlgn" role="radiogroup" aria-label="Сколько выбросить"><label><input type="radio" name="lgiDlgN" value="1" checked> 1</label><label><input type="radio" name="lgiDlgN" value="${n}"> все (${n})</label></div>` : '')
      + `<div class="lgi-dlgb"><button type="button" class="btn lgi-btn lgi-dlgy" data-dlg="yes">${esc(t.trashYes)}</button><button type="button" class="btn ghost lgi-btn ghost" data-dlg="no">${esc(t.trashNo)}</button></div></div>`;
    document.body.appendChild(el);
    const k = () => { const r = el.querySelector('input[name="lgiDlgN"]:checked'); return many && r ? Math.max(1, Math.min(n, +r.value || 1)) : n; };
    const done = (yes) => { const kk = k(); dlgClose(); if (yes && o.yes) o.yes(kk); };
    el.addEventListener('change', () => { el.querySelector('.lgi-dlgt').innerHTML = head(k()); });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-dlg]'); if (b) { done(b.dataset.dlg === 'yes'); return; } if (e.target === el) done(false); });
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); return; }
      if (e.key === 'Tab') {   // фокус - только внутри окна
        const f = Array.from(el.querySelectorAll('button, input')).filter((x) => !x.disabled); if (!f.length) return;
        const i = f.indexOf(document.activeElement); if (!el.contains(document.activeElement) || (e.shiftKey && i <= 0) || (!e.shiftKey && i === f.length - 1)) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
      }
    };
    DLG = { el, key, back: o.back || document.activeElement };
    document.addEventListener('keydown', key, true);
    try { el.querySelector('[data-dlg="no"]').focus({ preventScroll: true }); } catch {}
    return { close: () => dlgClose(), el };
  }

  // здоровье, опыт, уровень, монеты - из героя сайта (опыт внутри уровня: xpInLevel / xpToNext, у старой игры - от порогов)
  function vitals(h) {
    h = h || {};
    const st = h.stats || {}, hpMax = +(h.hpMax != null ? h.hpMax : st.hp) || 0, hpNow = h.hpNow != null ? +h.hpNow : hpMax;
    const own = h.xpInLevel != null, xin = own ? Math.max(0, +h.xpInLevel || 0) : Math.max(0, (h.xp || 0) - (h.prevXp || 0));
    const xneed = own ? (h.xpToNext == null ? null : Math.max(1, +h.xpToNext || 0)) : (h.next == null ? null : Math.max(1, h.next - (h.prevXp || 0)));
    return { hpMax, hpNow, xin, xneed, lv: +h.level || 1, money: Math.max(0, Math.floor(+h.money || 0)) };
  }
  const pct = (a, b) => (b ? Math.max(0, Math.min(100, a / b * 100)) : 100).toFixed(1);
  // порядок ячеек: редкость, тип, название или как в сумке (как пришло от игры)
  function sortCells(cs, how) {
    const nm = (a, b) => String(a.it.name).localeCompare(String(b.it.name), 'ru');
    const cmp = { rar: (a, b) => (RORD[a.it.rarity] ?? 5) - (RORD[b.it.rarity] ?? 5) || nm(a, b), name: nm, slot: (a, b) => (SLOTS5.indexOf(a.it.slot) + 1 || 9) - (SLOTS5.indexOf(b.it.slot) + 1 || 9) || nm(a, b) }[how];
    return cmp ? cs.slice().sort(cmp) : cs.slice();
  }
  function norm(d) {
    d = d || {};
    const hero = d.hero || {};
    let list = d.items || hero.items || [];
    if (d.equipped || d.bag) list = [...Object.entries(d.equipped || {}).filter(([, x]) => x).map(([sl, x]) => ({ ...x, slot: x.slot || sl, on: true })), ...(d.bag || []).map((x) => ({ ...x, on: false }))];
    return { hero, items: list, storage: d.storage || null, bagCap: d.bagCap != null ? +d.bagCap : null, storageCap: d.storageCap != null ? +d.storageCap : null, stack: +d.stack || 20, storageStack: +d.storageStack || +d.stack || 20, obCap: +d.obCap > 0 ? +d.obCap : 0 };   // 26.10: obCap - рудная сумка (ячеек), руда с it.ob - в ней
  }
  const coarse = () => { try { return 'ontouchstart' in root && !(root.matchMedia && root.matchMedia('(pointer: fine)').matches); } catch (e) { return false; } };
  const fallbackArt = (it) => `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="#3b2d44" stroke="#ffe27a" stroke-width="2"/><text x="20" y="26" text-anchor="middle" font-size="16" font-weight="800" fill="#ffe27a">${esc(String(it.name || '?').slice(0, 1))}</text></svg>`;

  /* ---------- встроенная карточка вещи (если страница не дала свою): название, редкость, характеристики и сравнение с надетым ---------- */
  let TIP = null, TIPFOR = null;
  function effText(it) {
    const e = it.effect; if (!e) return '';
    const p = [];
    if (e.heal) p.push(`+${e.heal} к здоровью`);
    if (e.buff) p.push(`${STL[e.buff.stat] || e.buff.stat} +${e.buff.add}${e.buff.min ? ` на ${e.buff.min} мин` : ''}`);
    if (e.revive) p.push('воскрешает героя');
    return p.join(', ');
  }
  function cardHtml(it, list, O) {
    const lab = (k) => (O.statLabel && O.statLabel(k)) || STL[k] || k;
    const eq = !it.on && it.wearable ? list.find((x) => x.on && x.slot === it.slot && x.uid !== it.uid) : null;
    const a = it.stats || {}, b = (eq && eq.stats) || {}, keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] || b[k]);
    const rows = keys.map((k) => { const v = +a[k] || 0, dv = eq ? v - (+b[k] || 0) : 0;
      return `<li><span>${esc(lab(k))}</span><b>${v > 0 ? '+' : ''}${v}</b>${eq ? (dv ? `<em class="${dv > 0 ? 'up' : 'dn'}">${dv > 0 ? '+' : '−'}${Math.abs(dv)}</em>` : '<em class="eq">=</em>') : ''}</li>`; }).join('');
    const eff = (O.effText ? O.effText(it) : effText(it)) || '';
    return `<div class="lgi-th"><b data-r="${esc(it.rarity || 'common')}">${esc(it.name)}</b>${it.qty ? `<span>${esc(oreQty(it.q))}</span>` : it.n > 1 ? `<span>×${it.n}</span>` : ''}</div>`
      + `<div class="lgi-ts"><span data-r="${esc(it.rarity || 'common')}">${RAR[it.rarity] || RAR.common}</span><span>${esc(SLOT_RU[it.slot] || 'вещь')}</span>${it.on ? `<span class="on">${TXT.worn}</span>` : ''}${it.en > 0 ? `<span>заточка +${+it.en}</span>` : ''}</div>`
      + (rows ? `<ul class="lgi-tst">${rows}</ul>` : '') + (eff ? `<p class="lgi-teff">${esc(eff[0].toUpperCase() + eff.slice(1))}</p>` : '')
      + (it.dur != null ? `<p class="lgi-tdur${+it.dur <= 30 ? ' br' : ''}">Прочность ${+it.dur}%</p>` : '') + (it.desc ? `<p class="lgi-tdesc">${esc(it.desc)}</p>` : '')
      + (eq ? `<p class="lgi-tcmp">Сравнение с надетым: <b>${esc(eq.name)}</b></p>` : '');
  }
  function tipShow(el, html, r) {
    if (!el || !el.isConnected || typeof document === 'undefined') return;
    if (!TIP) { TIP = document.createElement('div'); TIP.className = 'lgi-tip'; TIP.id = 'lgi-tip'; TIP.setAttribute('role', 'tooltip'); TIP.hidden = true; document.body.appendChild(TIP); }
    if (TIPFOR && TIPFOR !== el) TIPFOR.removeAttribute('aria-describedby');
    TIPFOR = el; el.setAttribute('aria-describedby', 'lgi-tip');
    TIP.dataset.r = r || 'common'; TIP.innerHTML = html; TIP.hidden = false;
    const b = el.getBoundingClientRect(), W = document.documentElement.clientWidth, H = root.innerHeight, w = TIP.offsetWidth, h = TIP.offsetHeight, m = 10;
    let x = b.right + m; if (x + w > W - 8) x = b.left - w - m;
    let y = b.top;
    if (x < 8) { x = Math.max(8, Math.min(W - w - 8, b.left + b.width / 2 - w / 2)); y = b.top - h - m >= 8 ? b.top - h - m : b.bottom + m; }
    y = Math.max(8, Math.min(H - h - 8, y));
    TIP.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }
  function tipHide() { if (!TIP) return; if (TIPFOR) TIPFOR.removeAttribute('aria-describedby'); TIPFOR = null; TIP.hidden = true; }

  let MOUNTS = 0;
  function mount(el, cfg = {}) {
    if (!el || el.nodeType !== 1) throw new Error('LGInventory.mount: нужен элемент');
    if (el.__lgi) el.__lgi.destroy();
    const v = VARIANTS.includes(cfg.variant) ? cfg.variant : 'compact', mode = MODES.includes(cfg.mode) ? cfg.mode : 'equip';
    let A = cfg.actions || {}, O = { ...(cfg.options || {}) }, D = norm(cfg.data);
    const ID = String(++MOUNTS); el.dataset.lgiId = ID;
    const S = { f: 'all', sort: SORTS.some(([k]) => k === O.sortDefault) ? O.sortDefault : 'rar', sel: O.sel || '', busy: false, k: {}, drag: null, dead: false, tip: false };
    const T = () => ({ ...TXT, ...(O.labels || {}) });
    if (O.storeKey) try { const p = JSON.parse(root.localStorage.getItem(O.storeKey) || '{}'); if (typeof p.f === 'string') S.f = p.f; if (SORTS.some(([k]) => k === p.sort)) S.sort = p.sort; } catch (e) { /* без хранилища - по умолчанию */ }
    const save = () => { if (O.storeKey) try { root.localStorage.setItem(O.storeKey, JSON.stringify({ f: S.f, sort: S.sort })); } catch (e) { /* приватный режим */ } };
    const filters = () => (O.filters === false || v === 'inline' ? null : Array.isArray(O.filters) ? O.filters : FILTERS);
    if (!filters() || !filters().includes(S.f)) S.f = 'all';
    const doll = () => v !== 'inline' && mode !== 'storage' && O.doll !== false;
    // свой порядок: только в режиме 'equip', порядок «как в сумке» и фильтр «Все» (иначе соседи на экране - не соседи в сумке)
    const reorderOn = () => mode === 'equip' && !!A.reorder && S.sort === 'new' && S.f === 'all';
    const eqRow = () => v === 'inline' && mode !== 'storage' && O.equipped !== false;
    // 28.10 (bag-trash): выбросить - режим 'equip' и actions.discard(uids, it, n); options.trashWhy(it) - '' или почему нельзя (вещь события…)
    const trashOn = () => mode === 'equip' && v !== 'inline' && !!A.discard;
    const up1 = (s) => (s ? String(s)[0].toUpperCase() + String(s).slice(1) : '');
    const trashWhy = (it) => { if (!it) return 'Такой вещи нет'; if (it.on) return T().trashOn; let r = ''; try { r = O.trashWhy ? O.trashWhy(it) || '' : ''; } catch (e) { r = 'Нельзя'; } return up1(r); };
    const artOf = (it) => { try { const a = O.art ? O.art(it) : art(it); if (a) return a; } catch (e) { /* рисунка нет */ } return fallbackArt(it); };
    const all = () => D.items.concat(D.storage || []);
    const itemBy = (uid) => all().find((x) => x.uid === uid) || null;
    const fromOf = (uid) => (D.storage && D.storage.some((x) => x.uid === uid) ? 'st' : obOn() && D.items.some((x) => x.uid === uid && x.ob) ? 'ob' : 'bag');
    // 26.10 (mine/pickaxe): рудная сумка - своя сетка «Рудная сумка» под сумкой (вкладка «Персонаж», сумка шахты, Склад): руда с it.ob
    // лежит в ней и не занимает ячеек сумки. Режим 'pick' (окно скупщика) - одной сеткой, как раньше
    const obOn = () => D.obCap > 0 && (mode === 'equip' || mode === 'storage');
    const srcOf = (from) => (from === 'st' ? D.storage || [] : from === 'ob' ? D.items.filter((x) => x.ob) : obOn() ? D.items.filter((x) => !x.ob) : D.items);
    const kindOf = (it) => (it.wearable && SIL_NAME[it.slot] ? it.slot : USE.has(it.slot) && (filters() || []).includes('use') ? 'use' : 'other');
    const shown = (it) => !O.only || O.only(it);
    const okOf = (fn, it) => { if (!fn) return true; try { const r = fn(it); return r === undefined ? true : r; } catch (e) { return false; } };
    const say = (t) => { if (!t) return; if (O.say) { try { O.say(t); } catch (e) { /* страница молчит */ } return; } const f = q('a'); if (f) { const p = document.createElement('p'); p.className = 'lgi-say'; p.setAttribute('role', 'status'); p.textContent = t; f.innerHTML = ''; f.appendChild(p); S.k.a = null; clearTimeout(S.sayT); S.sayT = setTimeout(() => foot(), 3500); } };
    // 26.10: кукла может жить в своём элементе страницы (options.dollEl - карточка героя «Персонажа»), сетка - в el; библиотека одна:
    // одно состояние, одно перетаскивание (корень - options.dragRoot, общий предок обоих), выбор и подсказки - в обоих местах
    const PE = O.dollEl && O.dollEl.nodeType === 1 ? O.dollEl : null;
    const roots = () => (PE ? [el, PE] : [el]);
    const q = (n) => el.querySelector(`[data-lgi="${n}"]`) || (PE && PE.querySelector(`[data-lgi="${n}"]`));

    function listCells(from) {
      const src = srcOf(from), stack = from === 'st' ? D.storageStack : D.stack;
      const list = src.filter((it) => shown(it) && (from === 'ob' || S.f === 'all' || kindOf(it) === S.f));
      const cs = cells(list, stack, { keep: true });
      if (from === 'st') for (const c of cs) c.st = 1;   // на складе надетого нет: всё, что пришло, лежит там
      return sortCells(cs, filters() || O.sort !== false ? S.sort : 'new');
    }

    /* ---------- разметка: каркас один раз, дальше - только изменившиеся части ---------- */
    function skeleton() {
      const t = T(), title = O.title || (mode === 'storage' ? t.storage : t.bag), canClose = !!A.close;
      el.classList.add('lgi', 'lgi--' + v, 'lgi-m-' + mode);
      el.setAttribute('role', O.role || (canClose ? 'dialog' : 'region')); if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', O.label || title);
      const head = canClose && v !== 'inline'
        ? `<header class="lgi-h"><button type="button" class="lgi-chip lgi-bt" data-bx aria-pressed="true" title="${esc(t.close)}">${esc(title)}</button><span class="lgi-lv" data-lgi="lv"></span><button type="button" class="lgi-x" data-bx aria-label="${esc(t.close)}" title="Закрыть (Esc)">×</button></header>`
        : `<header class="lgi-h"><b class="lgi-title">${esc(title)}</b>${O.sub ? `<span class="lgi-sub">${esc(O.sub)}</span>` : ''}<span class="lgi-lv" data-lgi="lv"></span>${canClose ? `<button type="button" class="lgi-x" data-bx aria-label="${esc(t.close)}" title="Закрыть (Esc)">×</button>` : ''}</header>`;
      const stage = doll() ? `<div class="lgi-stage" role="group" aria-label="${esc(t.equipped)}"><div class="lgi-eq" data-lgi="eqL"></div><div class="lgi-ped" data-lgi="fig"></div><div class="lgi-eq" data-lgi="eqR"></div></div>` : '';
      const row = eqRow() ? `<div class="lgi-eqrow" role="group" aria-label="${esc(t.equipped)}" data-lgi="eqrow"></div>` : '';
      const vit = doll() && O.vitals !== false ? '<div class="lgi-vit" data-lgi="vit"></div>' : '';
      const fl = filters() || O.sort !== false && v !== 'inline' ? `<div class="lgi-f" role="group" aria-label="Тип вещей" data-lgi="f"></div>` : '';
      // цель броска - вся область сетки (и пустое место под ячейками), а не только ряды ячеек
      const g = (from, label) => `<div class="lgi-g" data-lgi="g-${from}"${mode === 'equip' || mode === 'storage' ? ` data-igdrop="${from}"` : ''}>${mode === 'storage' ? `<div class="lgi-gh"><b>${esc(label)}</b><span data-lgi="cap-${from}"></span></div>` : ''}<div class="cy-grid ig-grid" role="group" aria-label="${esc(label)}" data-lgi="grid-${from}"></div><p class="lgi-empty muted" data-lgi="empty-${from}" hidden>${esc(t.empty)}</p></div>`;
      const obG = obOn() ? `<div class="lgi-g lgi-ob" data-lgi="g-ob"${mode === 'storage' ? ' data-igdrop="ob"' : ''}><div class="lgi-gh"><b>${esc(t.oreBag || 'Рудная сумка')}</b><span data-lgi="cap-ob"></span></div><div class="cy-grid ig-grid" role="group" aria-label="${esc(t.oreBag || 'Рудная сумка')}" data-lgi="grid-ob"></div></div>` : '';
      // 28.10 (bag-trash): слот «Выбросить» под сеткой - только если страница дала actions.discard (вкладка «Поход»)
      const tr = trashOn() ? `<button type="button" class="lgi-trash" data-lgi="trash" data-igdrop="trash" aria-label="${esc(t.trash)}: ${esc(t.trashPick)}" title="${esc(t.trashPick)}"><span class="lgi-tri" aria-hidden="true">🗑</span><b>${esc(t.trash)}</b><small>${esc(t.trashSub)}</small></button>` : '';
      const grids = (mode === 'storage' ? g('bag', t.bag) + obG + g('st', t.storage) : g('bag', O.gridLabel || t.bag) + obG) + tr;
      S.ob = obOn();
      const foot = '<footer class="lgi-a" data-lgi="a"></footer>';
      const hd = O.header === false ? '' : head, det = O.detail === false ? '' : '<aside class="lgi-det" data-lgi="det" aria-live="polite"></aside>';
      el.classList.toggle('lgi-nodet', O.detail === false);
      let st0 = stage;
      if (PE) { PE.classList.add('lgi', 'lgi--' + v, 'lgi-dollx'); PE.dataset.lgiId = ID; PE.innerHTML = stage; st0 = ''; el.classList.toggle('lgi-nodoll', !!stage); }
      // 'full': сетка внутри своей обёртки - раскладка меняется по ширине самой сумки (container query), а не окна
      el.innerHTML = v === 'full'
        ? `<div class="lgi-in"><div class="lgi-side">${hd}${st0}${vit}</div><div class="lgi-main">${fl}${grids}</div>${det}${foot}</div>`
        : hd + st0 + row + vit + fl + grids + foot;
      S.k = {};
    }
    function slotHtml(sl, small) {
      const it = D.items.find((x) => x.on && x.slot === sl) || null, nm = SIL_NAME[sl];
      const edit = mode === 'equip' && !small, pick = mode === 'pick' && !small;
      const big = !!PE && !small;   // кукла в чужой карточке (dollEl): крупные слоты, как до inv2 - картинка, подпись слота и название вещи
      if (it) {
        const off = pick && okOf(O.can, it) !== true;
        return `<button type="button" class="cy-sc ig-c lgi-slot${off ? ' off' : ''}" data-slot="${sl}" data-r="${esc(it.rarity || 'common')}" data-ig="${esc(it.uid)}"${(edit && A.unequip) || (pick && A.drop && !off) ? ' data-igdrag="1"' : ''}${edit ? ' data-igdrop="slot"' : ''} aria-label="${esc(nm)}: ${esc(it.name)}"><span class="cy-gi">${artOf(it)}</span>${it.en > 0 ? `<i class="en">+${+it.en}</i>` : ''}${big ? `${it.dur != null ? `<i class="du${+it.dur <= 30 ? ' br' : ''}">${+it.dur <= 30 ? '⚠' : ''}${+it.dur}%</i>` : ''}<span class="lgi-sl">${esc(nm)}</span><span class="lgi-sn">${esc(it.name)}</span>` : v === 'full' ? `<span class="lgi-sl">${esc(nm)}</span>` : ''}</button>`;
      }
      return `<button type="button" class="cy-sc lgi-slot e2" data-slot="${sl}"${small ? ' tabindex="-1"' : ` data-empty="${sl}"`}${edit ? ' data-igdrop="slot"' : ''} aria-label="${esc(nm)}: пусто${small ? '' : ' - показать подходящее'}" title="${esc(nm)}: пусто"><span class="cy-gi sil">${artOf(EMPTY[sl])}</span>${big ? `<span class="lgi-sl">${esc(nm)}</span><span class="lgi-sn">пусто</span>` : v === 'full' ? `<span class="lgi-sl">${esc(nm)}</span>` : ''}</button>`;
    }
    const sig = (it) => (it ? [it.uid, it.id, it.rarity, it.en || 0, it.dur == null ? '' : it.dur, it.name, it.on ? 1 : 0, it.q || 0].join('|') : '');   // 26.10: q - осколков в кучке руды
    // кусок разметки меняется - только если поменялась его подпись (иначе DOM не трогаем: фокус, наведение, двойной клик целы)
    function put(name, key, html) { const e = q(name); if (!e || S.k[name] === key) return e; S.k[name] = key; e.innerHTML = html(); return e; }
    function slots() {
      if (doll()) {
        for (const [n, list] of [['eqL', LEFT], ['eqR', RIGHT]]) for (const sl of list) {
          const box = q(n); if (!box) continue;
          const it = D.items.find((x) => x.on && x.slot === sl) || null, key = sig(it) + (mode === 'pick' && it ? okOf(O.can, it) : '');
          let b = box.querySelector(`:scope > [data-slot="${sl}"]`);
          if (b && b.dataset.k === key) continue;
          const nb = frag(slotHtml(sl)); nb.dataset.k = key;
          if (b) b.replaceWith(nb); else box.appendChild(nb);
        }
        const h = D.hero, fig = O.figure ? (() => { try { return O.figure(h) || ''; } catch (e) { return ''; } })() : '';
        put('fig', fig, () => fig);
      }
      if (eqRow()) { const key = SLOTS5.map((sl) => sig(D.items.find((x) => x.on && x.slot === sl))).join('/'); put('eqrow', key, () => SLOTS5.map((sl) => slotHtml(sl, true)).join('')); }
    }
    function frag(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
    function vit() {
      if (!q('vit') && !q('lv')) return;
      const V = vitals(D.hero), money = O.money ? O.money(V.money) : esc(V.money);
      put('lv', V.lv, () => `ур. ${V.lv}`);
      put('vit', [V.hpNow, V.hpMax, V.xin, V.xneed, money].join('|'), () => (V.hpMax ? `<div class="lgi-mt hp" title="Здоровье"><span>♥</span><i><b style="width:${pct(V.hpNow, V.hpMax)}%"></b></i><em>${Math.round(V.hpNow)} / ${V.hpMax}</em></div>` : '')
        + `<div class="lgi-mt xp" title="Опыт до следующего уровня"><span>★</span><i><b style="width:${pct(V.xin, V.xneed)}%"></b></i><em>${V.xneed == null ? 'макс.' : `${V.xin} / ${V.xneed}`}</em></div>`
        + `<div class="lgi-coins">${money}</div>`);
    }
    function chips() {
      const fl = filters(), box = q('f'); if (!box) return;
      const src = all().filter((it) => !it.on && shown(it) && !(it.ob && obOn())), cnt = (k) => src.filter((it) => k === 'all' || kindOf(it) === k).length;
      const ns = (fl || []).map((k) => cnt(k)), key = [S.f, S.sort, ns.join(',')].join('|');
      put('f', key, () => (fl || []).map((k, i) => { const n = ns[i]; if (!n && k !== 'all' && k !== S.f) return ''; const t = FILTER_RU[k] || k;
        return `<button type="button" class="lgi-chip${EMPTY[k] ? ' ic' : ''}" data-bf="${k}" aria-pressed="${S.f === k}" title="${esc(t)}: ${n}" aria-label="${esc(t)}: ${n}">${EMPTY[k] ? `<span class="cy-gi">${artOf(EMPTY[k])}</span>` : esc(k === 'all' ? 'Все' : k === 'use' ? 'Еда' : 'Ещё')}<small>${n}</small></button>`; }).join('')
        + (O.sort === false ? '' : `<select data-bsort aria-label="Порядок" title="Порядок">${SORTS.map(([k, t]) => `<option value="${k}"${S.sort === k ? ' selected' : ''}>${t}</option>`).join('')}</select>`));
    }
    function cellHtml(c, from) {
      const it = c.it, off = mode === 'pick' && okOf(O.can, it) !== true;
      const dr = mode === 'equip' ? (!!it.wearable && !!A.equip) || (from === 'bag' && reorderOn()) || (trashOn() && !c.ev) :mode === 'storage' ? !c.ev && !!A.move : mode === 'pick' ? !!A.drop && !off : false;
      const ord = from === 'bag' && reorderOn() ? ' data-igdrop="cell"' : '';
      return cell(c, { art: artOf, drag: dr, off, attr: `data-from="${from}"${ord}`, extra: O.extra });
    }
    // сетка: ячейка с той же подписью остаётся тем же элементом (только переставляется); новая - создаётся; лишние - уходят
    function gridPatch(from) {
      const g = q('grid-' + from); if (!g) return;
      const cs = listCells(from), old = new Map(), ph = [];
      for (const ch of Array.from(g.children)) { if (ch.dataset.k) old.set(ch.dataset.k, ch); else ph.push(ch); }
      let i = 0;
      for (const c of cs) {
        const k = [c.uids[0], c.n, sig(c.it), mode === 'pick' ? okOf(O.can, c.it) : '', reorderOn() ? 'o' : '', c.it.no || '', trashOn() ? 't' : ''].join('#');
        let b = old.get(k); if (b) old.delete(k); else { b = frag(cellHtml(c, from)); b.dataset.k = k; }
        if (g.children[i] !== b) g.insertBefore(b, g.children[i] || null);
        i++;
      }
      for (const b of old.values()) b.remove();
      const cap = from === 'st' ? D.storageCap : from === 'ob' ? D.obCap : D.bagCap != null ? D.bagCap : O.cap;
      const used = cells(srcOf(from).filter(shown), from === 'st' ? D.storageStack : D.stack).filter((c) => !c.ev).length;
      const want = cap != null && (S.f === 'all' || from === 'ob') ? Math.max(0, Math.min(200, cap - used)) : 0;
      for (const p of ph.slice(want)) p.remove();
      for (let k = ph.length; k < want; k++) { const s = document.createElement('span'); s.className = 'cy-sc e'; s.setAttribute('aria-hidden', 'true'); g.appendChild(s); }
      const em = q('empty-' + from); if (em) em.hidden = cs.length > 0 || want > 0;
      const cp = q('cap-' + from); if (cp) cp.textContent = cap != null ? `${used} / ${cap}` : String(used);
    }
    function grids() { gridPatch('bag'); if (obOn()) gridPatch('ob'); if (mode === 'storage') gridPatch('st'); }
    // нижняя строка: выбранная вещь и её кнопка (или подсказка); в 'full' - ещё карточка вещи справа
    function useLabel(it) { return it.slot === 'potion' || it.drink ? T().drink : it.slot === 'food' ? T().eat : T().use; }
    function actBtn(it) {
      const t = T(), dis = S.busy ? ' disabled' : '';
      if (mode === 'equip') {
        if (it.on) return A.unequip && v !== 'inline' ? `<button type="button" class="btn ghost lgi-btn" data-lgi-off="${esc(it.slot)}"${dis}>${t.off}</button>` : '';
        // 28.10 (bag-trash): у выбранной вещи сумки - ещё «🗑» (выбросить; на телефоне перетаскивать неудобно)
        const tb = trashOn() && !trashWhy(it) ? `<button type="button" class="btn ghost lgi-btn ghost lgi-trb" data-lgi-trash="${esc(it.uid)}"${dis} aria-label="${esc(t.trash)}" title="${esc(t.trash)}">🗑</button>` : '';
        if (it.wearable) return (A.equip ? `<button type="button" class="btn primary lgi-btn" data-lgi-on="${esc(it.uid)}"${dis}>${t.on}</button>` : '') + tb;
        if (USE.has(it.slot) && A.use) { const ok = okOf(O.canUse, it); return `<button type="button" class="btn primary lgi-btn" data-lgi-use="${esc(it.uid)}"${ok !== true || S.busy ? ' disabled' : ''}${ok !== true ? ` title="${esc(ok)}"` : ''}>${useLabel(it)}</button>${tb}`; }
        return tb || `<em class="muted">${esc(t.noUse)}</em>`;
      }
      if (mode === 'storage') {
        const from = fromOf(it.uid), c = cellOf(it.uid), n = c ? c.n : 1, lab = from === 'st' ? t.take : t.put;
        return A.move ? `<button type="button" class="btn primary lgi-btn" data-lgi-mv="1"${dis}>${lab}${n > 1 ? ' 1' : ''}</button>${n > 1 ? `<button type="button" class="btn ghost lgi-btn" data-lgi-mv="all"${dis}>${t.all} (${n})</button>` : ''}` : '';
      }
      if (mode === 'pick') { const ok = okOf(O.can, it); return ok === true ? `<span class="lgi-ok">${t.picked}</span>` : `<em class="muted">${esc(ok || t.can)}</em>`; }
      return '';
    }
    function cellOf(uid) { for (const from of ['bag', 'ob', 'st']) { const src = srcOf(from); const c = cells(src, from === 'st' ? D.storageStack : D.stack).find((x) => x.uids.includes(uid)); if (c) return c; } return null; }
    function hint() {
      if (O.hint === false) return '';
      const touch = coarse(), H = (short, full) => `<p class="lgi-hint muted" title="${esc(full)}">${short}</p>`;
      if (mode === 'equip' && v === 'inline') return touch ? H('Нажми - карточка и кнопка.', 'Нажми на вещь - её карточка и кнопка «Съесть» / «Выпить».') : H('Двойной клик или <b>Shift+ПКМ</b> - съесть / выпить · наведи - карточка', 'Наведи на вещь - её карточка. Двойной клик или Shift + правая кнопка - сразу съесть или выпить. Правая кнопка - меню вещи (или карточка). Нажатие - выбрать, внизу появится кнопка.');
      if (mode === 'equip') return touch
        ? H('Нажми - карточка и «Надеть». Удержи - перетащить на слот.', 'Нажми на вещь - её карточка и кнопка «Надеть» / «Снять». Удержи палец на вещи и перетащи на слот - надеть, со слота в сумку - снять.')
        : H('Перетащи на слот · <b>Shift+ПКМ</b> - надеть / снять · двойной клик · ПКМ - меню', 'Наведи на вещь - характеристики и сравнение с надетым. Перетащи вещь на её слот - надеть (если слот занят, прежняя вещь вернётся в сумку), со слота в сумку - снять. Shift + правая кнопка - быстро надеть / снять. Двойной клик - тоже. Правая кнопка - меню вещи (или её карточка). Нажатие - выбрать, внизу появится кнопка.');
      if (mode === 'storage') return touch ? H('Нажми - карточка и перенос. Удержи - перетащить или выбрать, сколько.', 'Нажми на вещь - карточка и кнопки переноса. Удержи и перетащи в другую сетку; удержи и отпусти - сколько перенести.')
        : H('Перетащи между сумкой и складом · <b>Shift+клик</b> - всю стопку · <b>ПКМ</b> - сколько · двойной клик', 'Перетащи вещь в другую сетку - перенести. Shift+клик, Shift + правая кнопка или двойной клик - перенести всю стопку. Правая кнопка - меню «1 / половину / всё / сколько». Нажатие - выбрать, внизу появятся кнопки.');
      if (mode === 'pick') return touch ? H('Нажми на вещь - выбрать.', 'Нажми на вещь - выбрать её.') : H('Нажми на вещь - выбрать · наведи или ПКМ - карточка', 'Наведи на вещь или нажми правую кнопку - карточка. Нажми - выбрать.');
      return H('Наведи, нажми или ПКМ - карточка вещи', 'Только посмотреть: наведи на вещь, нажми на неё или нажми правую кнопку - её карточка.');
    }
    function foot() {
      if (S.dead) return;
      const it = S.sel ? itemBy(S.sel) : null, c = it && cellOf(it.uid), n = c ? c.n : 1;
      const key = it ? [sig(it), n, S.busy, mode === 'equip' && !it.on && !it.wearable ? okOf(O.canUse, it) : ''].join('|') : 'hint' + coarse();
      put('a', key, () => (it ? `<div class="lgi-sel"><span><b data-r="${esc(it.rarity || 'common')}">${esc(it.name)}</b><small>${esc(SLOT_RU[it.slot] || 'вещь')}${it.on ? ' · ' + T().worn : ''}${n > 1 ? ` · ×${n}` : ''}</small></span>${actBtn(it)}</div>` : hint()));
      if (v === 'full') put('det', it ? key : 'none', () => (it ? `<div class="lgi-card" data-r="${esc(it.rarity || 'common')}">${cardHtml({ ...it, n }, all(), O)}</div>` : `<p class="muted">${esc(T().none)}</p>`));
    }
    function mark() {
      roots().flatMap((r) => Array.from(r.querySelectorAll('[data-ig]'))).forEach((c) => { const on = c.dataset.ig === S.sel; if (c.classList.contains('on') !== on) c.classList.toggle('on', on); if (c.getAttribute('aria-pressed') !== String(on)) c.setAttribute('aria-pressed', String(on)); });
    }
    function render() {
      if (S.dead) return;
      if (S.sel && !itemBy(S.sel)) S.sel = '';
      slots(); vit(); chips(); grids(); foot(); mark();
    }

    /* ---------- управление ---------- */
    function card(c) {
      const it = itemBy(c.dataset.ig); if (!it) return;
      const cc = cellOf(it.uid), n = cc ? cc.n : 1;
      if (O.cardTip) { try { O.cardTip(c, n > 1 ? { ...it, n, uids: cc.uids } : it, D.hero); } catch (e) { /* карточка страницы */ } S.tip = true; return; }
      tipShow(c, cardHtml({ ...it, n }, all(), O), it.rarity); S.tip = true;
    }
    function cardOff() { if (!S.tip) return; S.tip = false; if (O.cardTip) { try { if (O.tipHide) O.tipHide(); } catch (e) { /* карточка страницы */ } } else tipHide(); }
    function select(uid) { S.sel = uid || ''; mark(); foot(); }
    async function run(fn, ...args) {
      if (S.busy || !fn) return;
      S.busy = true; el.setAttribute('aria-busy', 'true'); foot();
      try { await fn(...args); } catch (e) { say('Не получилось'); console.warn('[инвентарь]', e); }
      S.busy = false; if (!S.dead) { el.removeAttribute('aria-busy'); foot(); }
    }
    function use(uid) {
      const it = itemBy(uid); if (!it) return; cardOff();
      if (mode === 'equip') {
        if (it.on) { if (v !== 'inline' && A.unequip) run(A.unequip, it.slot, it); return; }
        if (it.wearable) { if (A.equip) run(A.equip, uid, it); return; }
        if (USE.has(it.slot) && A.use) { const ok = okOf(O.canUse, it); if (ok !== true) { say(ok); return; } run(A.use, uid, it); return; }
        say(T().cantUse); return;
      }
      if (mode === 'storage') { const c = cellOf(uid); move(uid, fromOf(uid), c ? c.n : 1); return; }
      if (mode === 'pick') pick(uid);
    }
    function move(uid, from, n, to) {
      const c = cellOf(uid), it = itemBy(uid); if (!c || !it || !A.move) return;
      run(A.move, uid, from === 'ob' ? 'bag' : from, to || (from === 'st' ? 'bag' : 'st'), Math.max(1, Math.min(c.n, +n || 1)), c);   // 26.10: из рудной сумки - как из сумки (игра знает, где кучка)
    }
    function pick(uid) {
      const it = itemBy(uid); if (!it) return;
      const ok = okOf(O.can, it); if (ok !== true) { say(ok || T().can); return; }
      select(uid); if (A.pick) try { A.pick(it); } catch (e) { console.warn('[инвентарь]', e); }
    }
    function tap(c) {
      if (mode === 'pick') { pick(c.dataset.ig); card(c); return; }
      select(c.dataset.ig); card(c);
      if (O.onSelect) try { O.onSelect(itemBy(c.dataset.ig)); } catch (e) { console.warn('[инвентарь]', e); }
    }
    // есть ли место в сетке to для ячейки src (Склад полон - нельзя, но стопка того же вида дополняется)
    function room(to, src) {
      const cap = to === 'st' ? D.storageCap : to === 'ob' ? D.obCap : D.bagCap; if (cap == null) return true;
      const list = srcOf(to), cs = cells(list, to === 'st' ? D.storageStack : D.stack).filter((c) => !c.ev);
      if (to === 'ob') { const it = itemBy(src.dataset.ig); if (!it || !it.qty) return false; }   // в рудную сумку - только руда
      const it = itemBy(src.dataset.ig), k = to === 'st' ? D.storageStack : D.stack;
      return cs.length < cap || (!!it && !it.wearable && cs.some((c) => c.it.id === it.id && c.n < k));
    }
    // 28.10 (bag-trash): выбросить - окно подтверждения (стопка: 1 / все; эпическая и легендарная - с предупреждением), потом actions.discard
    function trashAskFor(uid, back) {
      if (!trashOn()) return;
      const it = itemBy(uid); if (!it) return;
      const why = trashWhy(it); if (why) { say(why); return; }
      const c = cellOf(uid), uids = c ? c.uids.slice() : [uid], n = uids.length;
      cardOff(); menuClose(false);
      trashAsk({ name: it.name, rarity: it.rarity, n, ore: !!it.qty, labels: O.labels, back: back && back.isConnected ? back : null,
        yes: (k) => run(A.discard, uids.slice(0, Math.max(1, Math.min(n, k))), it, k) });
    }
    // Склад: сколько перенести - 1 / половину / всё / сколько… (правая кнопка; на телефоне - удержать и отпустить); одна вещь - карточка
    function stMenu(src, e) {
      const c = cellOf(src.dataset.ig); if (!c) return;
      if (c.n < 2) { if (e) card(src); else tap(src); return; }
      cardOff();
      menu(e && !(e.clientX === 0 && e.clientY === 0) ? { x: e.clientX, y: e.clientY } : src, [{ t: '1', v: 1 }, { t: 'Половину', v: Math.ceil(c.n / 2) }, { t: `${T().all} (${c.n})`, v: c.n }, { t: 'Сколько…', v: 'n' }],
        { title: c.it.name, max: c.n, def: c.n, pick: (n) => move(src.dataset.ig, src.dataset.from, n) });
    }
    function bindDrag() {
      if (S.drag) { S.drag.off(); S.drag = null; }
      // правая кнопка - меню вещи страницы (options.menu), а нет меню - карточка вещи; Shift + правая - быстрое действие
      const ctx = (src, e) => { const it = itemBy(src.dataset.ig); if (!it) return; if (O.menu) { cardOff(); try { O.menu(src, it, e); } catch (x) { console.warn('[инвентарь]', x); } } else card(src); };
      const base = { tap: (src) => tap(src), menu: ctx, onStart: cardOff, snap: true, scroll: PE ? 'page' : true, onEnd: () => { if (O.onDragEnd) try { O.onDragEnd(); } catch (e) { console.warn('[инвентарь]', e); } } };
      // кукла в своём элементе: корень перетаскивания - общий предок (dragRoot), тащить / бросать / нажимать - только своё (data-lgi-id)
      const R = PE ? O.dragRoot || document.body : el, own = PE ? { src: `[data-lgi-id="${ID}"] [data-igdrag]`, tapSel: `[data-lgi-id="${ID}"] [data-ig]`, drop: `[data-lgi-id="${ID}"] [data-igdrop]` } : {};
      if (mode === 'equip') S.drag = drag(R, { ...base, ...own,
        ok: (src, t) => { const it = itemBy(src.dataset.ig); if (!it) return false;
          if (t.dataset.igdrop === 'trash') return !trashWhy(it);   // 28.10 (bag-trash): «Выбросить» - вещь сумки, которую можно выбросить
          if (t.dataset.igdrop === 'cell') return it.on ? true : t !== src && reorderOn();   // надетое на ячейку сумки - просто снять
          return t.dataset.igdrop === 'bag' ? !!it.on : !it.on && !!it.wearable && it.slot === t.dataset.slot; },
        onDrop: (src, t) => { const it = itemBy(src.dataset.ig); if (t.dataset.igdrop === 'trash') { trashAskFor(src.dataset.ig, src); return; } if (t.dataset.igdrop === 'cell' && it && !it.on) { run(A.reorder, src.dataset.ig, t.dataset.ig); return; } use(src.dataset.ig); }, quick: (src) => use(src.dataset.ig),
        // 28.10: палец удержали и отпустили на месте - меню вещи страницы (там «Выбросить»), как правая кнопка мыши
        hold: trashOn() && O.menu ? (src) => { const r = src.getBoundingClientRect(); ctx(src, { clientX: r.left, clientY: r.bottom + 4 }); } : undefined,
        reject: (src, t) => { if (t.dataset.igdrop === 'trash') { say(trashWhy(itemBy(src.dataset.ig))); return; } if (t !== src.closest('[data-igdrop]') && t.dataset.igdrop === 'slot') say(T().wrongSlot); } });
      else if (mode === 'storage') S.drag = drag(el, { ...base,
        ok: (src, t) => src.dataset.from !== t.dataset.igdrop && !(src.dataset.from !== 'st' && t.dataset.igdrop !== 'st') && room(t.dataset.igdrop, src),   // 26.10: сумка ↔ рудная сумка - нет (руду кладёт игра), только со склада и на склад
        onDrop: (src, t) => { const c = cellOf(src.dataset.ig); move(src.dataset.ig, src.dataset.from, c ? c.n : 1, t.dataset.igdrop); },
        quick: (src) => { const c = cellOf(src.dataset.ig); move(src.dataset.ig, src.dataset.from, c ? c.n : 1); },
        shift: (src) => { const c = cellOf(src.dataset.ig); move(src.dataset.ig, src.dataset.from, c ? c.n : 1); },   // как у прежнего Склада: Shift+клик - вся стопка
        menu: (src, e) => stMenu(src, e), hold: (src) => stMenu(src),
        reject: (src, t) => { if (t !== src.closest('[data-igdrop]')) say(T().full); } });
      // выбор с перетаскиванием на чужую цель (наковальня, «Ты отдаёшь» в обмене): корень - окно страницы (options.dragRoot),
      // цели - options.dropSel, бросок - actions.drop(it, цель); тащить и нажимать - только ячейки этой сумки
      else if (mode === 'pick' && A.drop) S.drag = drag(O.dragRoot || el, { ...base, src: `[data-lgi-id="${ID}"] [data-igdrag]`, tapSel: `[data-lgi-id="${ID}"] [data-ig]`, drop: O.dropSel || '[data-igdrop]',
        ok: (src, t) => { const it = itemBy(src.dataset.ig); return !!it && okOf(O.can, it) === true && !el.contains(t) && (!O.dropOk || O.dropOk(it, t) !== false); },
        onDrop: (src, t) => { const it = itemBy(src.dataset.ig); if (it) run(A.drop, it, t); }, quick: (src) => pick(src.dataset.ig), shift: (src) => pick(src.dataset.ig) });   // 26.10: Shift+клик - тоже «положить» (окно скупщика)
      else S.drag = drag(R, { ...base, ...own, quick: mode === 'pick' ? (src) => pick(src.dataset.ig) : undefined });
    }
    const onClick = (e) => {
      const t = e.target;
      const f = t.closest('[data-bf]'); if (f && el.contains(f)) { S.f = f.dataset.bf; save(); chips(); grids(); mark(); return; }
      const em = t.closest('[data-empty]'); if (em && el.contains(em)) { if ((filters() || []).includes(em.dataset.empty)) { S.f = em.dataset.empty; save(); chips(); grids(); mark(); } return; }
      if (t.closest('[data-bx]')) { cardOff(); if (A.close) A.close(); return; }
      const on = t.closest('[data-lgi-on]'); if (on) { use(on.dataset.lgiOn); return; }
      const off = t.closest('[data-lgi-off]'); if (off) { const it = D.items.find((x) => x.on && x.slot === off.dataset.lgiOff); if (it) use(it.uid); return; }
      const us = t.closest('[data-lgi-use]'); if (us) { use(us.dataset.lgiUse); return; }
      const tb = t.closest('[data-lgi-trash]'); if (tb) { trashAskFor(tb.dataset.lgiTrash, tb); return; }   // 28.10 (bag-trash)
      const tr = t.closest('[data-lgi="trash"]'); if (tr && el.contains(tr)) { if (S.sel && itemBy(S.sel) && !itemBy(S.sel).on) trashAskFor(S.sel, tr); else say(T().trashPick); return; }
      const mv = t.closest('[data-lgi-mv]'); if (mv && S.sel) { const c = cellOf(S.sel); move(S.sel, fromOf(S.sel), mv.dataset.lgiMv === 'all' && c ? c.n : 1); }
    };
    const onChange = (e) => { if (e.target.matches('[data-bsort]')) { S.sort = e.target.value; save(); chips(); grids(); mark(); } };
    const onDbl = (e) => { const c = e.target.closest('[data-ig]'); if (!c || !el.contains(c) || mode === 'view' || mode === 'pick') return; if (c.closest('.lgi-eqrow')) return; use(c.dataset.ig); };
    // 26.10: слоты куклы в отдельном элементе (dollEl) - тоже наши: карточка вещи при наведении и там (раньше - только в сетке el)
    const onOver = (e) => { if (e.pointerType !== 'mouse' || (S.drag && S.drag.dragging())) return; const c = e.target.closest('[data-ig]'); if (c && (el.contains(c) || (PE && PE.contains(c)))) card(c); };
    const onOut = (e) => { const c = e.target.closest('[data-ig]'); if (c && !c.contains(e.relatedTarget)) cardOff(); };
    // стрелки - по ячейкам сетки (вверх / вниз - на ряд), Enter / пробел - выбрать (кнопка), Esc - закрыть
    const onKey = (e) => {
      if (!e.key.startsWith('Arrow')) return;
      const c = e.target.closest && e.target.closest('[data-ig]'); if (!c || !el.contains(c)) return;
      const box = c.parentElement, list = Array.from(box.querySelectorAll(':scope > [data-ig]')), i = list.indexOf(c); if (i < 0) return;
      if (e.altKey) {   // Alt+стрелка - сдвинуть ячейку на одну (свой порядок)
        if (!reorderOn() || c.dataset.from !== 'bag') return;
        const j = i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1); if (j < 0 || j >= list.length) return;
        e.preventDefault(); const uid = c.dataset.ig;
        Promise.resolve(run(A.reorder, uid, list[j].dataset.ig)).then(() => { const b = el.querySelector(`[data-ig="${CSS.escape(uid)}"]`); if (b) b.focus(); });
        return;
      }
      const top = list[0].offsetTop, cols = Math.max(1, list.filter((x) => x.offsetTop === top).length);
      const j = i + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key] || 0);
      if (j >= 0 && j < list.length && j !== i) { e.preventDefault(); list[j].focus(); }
    };
    const onEsc = (e) => {
      if (e.key !== 'Escape' || S.dead || !el.isConnected || (S.drag && S.drag.dragging())) return;
      if (e.target && e.target.closest && e.target.closest('input, textarea, select') && !el.contains(e.target)) return;
      if (S.tip) { cardOff(); return; }
      if (O.esc !== false && A.close) { e.preventDefault(); A.close(); }
    };
    const onScroll = () => cardOff();
    function bind() {
      for (const r of roots()) { r.addEventListener('click', onClick); r.addEventListener('change', onChange); r.addEventListener('dblclick', onDbl);
        r.addEventListener('pointerover', onOver); r.addEventListener('pointerout', onOut); r.addEventListener('keydown', onKey); }
      document.addEventListener('keydown', onEsc); el.addEventListener('scroll', onScroll, { capture: true, passive: true });
      bindDrag();
    }
    function unbind() {
      for (const r of roots()) { r.removeEventListener('click', onClick); r.removeEventListener('change', onChange); r.removeEventListener('dblclick', onDbl);
        r.removeEventListener('pointerover', onOver); r.removeEventListener('pointerout', onOut); r.removeEventListener('keydown', onKey); }
      document.removeEventListener('keydown', onEsc); el.removeEventListener('scroll', onScroll, { capture: true });
      if (S.drag) { S.drag.off(); S.drag = null; }
    }

    skeleton(); bind(); render();
    const api = {
      el, variant: v, mode,
      update(data) { if (S.dead) return api; D = norm(data); if (!!S.ob !== obOn()) { unbind(); skeleton(); bind(); } render(); return api; },   // 26.10: рудную сумку купили - своя сетка
      set(o) { if (S.dead) return api; if (o.actions) A = o.actions; O = { ...O, ...(o.options || o) }; delete O.actions; unbind(); skeleton(); bind(); render(); return api; },
      select(uid) { select(uid); return api; },
      discard(uid) { trashAskFor(uid); return api; },   // 28.10 (bag-trash): меню вещи страницы → «Выбросить» (то же окно подтверждения)
      state: () => ({ f: S.f, sort: S.sort, sel: S.sel, busy: S.busy }),
      dragging: () => !!(S.drag && S.drag.dragging()),
      destroy() {
        if (S.dead) return; cardOff(); dlgClose(); unbind(); clearTimeout(S.sayT); S.dead = true; delete el.dataset.lgiId;
        if (PE) { PE.innerHTML = ''; PE.classList.remove('lgi', 'lgi--' + v, 'lgi-dollx'); delete PE.dataset.lgiId; el.classList.remove('lgi-nodoll'); }
        el.innerHTML = ''; el.classList.remove('lgi', 'lgi--' + v, 'lgi-m-' + mode, 'lgi-nodet'); el.removeAttribute('aria-busy'); delete el.__lgi;
      },
    };
    el.__lgi = api;
    return api;
  }

  return { mount, trashAsk, items, cells, cell, grid, drag, menu, menuClose, art, still, lgx, EMPTY, configure, artReset, vitals, sortCells, cardHtml, tipShow, tipHide, esc, oreN, oreQty, VARIANTS, MODES, SLOTS: SLOTS5 };
});
