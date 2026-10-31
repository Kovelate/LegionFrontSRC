/* 30.10 (D1, docs/city.md): окно Склада «Города» - часть модуля «Город» (products/legion/modules/fair/client/citystore.js),
   адрес для браузера - /site/citystore.js (src/gateway/static.ts FAIR_SITE). Перенесено из legacy/site/public/city.js целиком, без
   смены поведения: app.js грузит этот файл перед city.js, city.js создаёт окно - window.LGCityStore(C) - и зовёт его из своего окна здания.
   C - что окну нужно от города: C.S (построенный город: окно здания S.panel, S.panelId), C.X (помощники сайта из app.js), C.npc / C.say
   (продавец и реплика), C.IGW (ячейки и перетаскивание itemgrid.js - window.LGItems), C.rerender(id) (перерисовать окно здания).
   Операции - прежние маршруты сайта /api/stPut, stTake, stPutAll, stTakeAll, stSort, stExpand, stMoneyPut, stMoneyTake; их делает игра
   (модуль «Город»: fair/sitebuy.js → склад героя legionary/storage.js). */
(function () {
  'use strict';
  window.LGCityStore = function (C) {
  const esc = window.LGSiteUi.esc;
  const npc = (...a) => C.npc(...a), say = (t) => C.say(t), IGW = () => C.IGW(), rerenderUi = (id) => C.rerender(id);
  /* ----- 22.10: Склад — сумка и склад ячейками (одинаковые расходники — стопкой), положить / забрать, расширить за монеты -----
     23.10: перетаскивание между сумкой и складом (мышь и палец; на телефоне — удержание, у края окно прокручивается), «Положить всё ↓» /
     «Взять всё ↑» (одно действие, итог «перенесено N, не влезло M»), «Разложить» (порядок хранит игра), подсказка-карточка вещи.
     Ячейки и перетаскивание — общие с наковальней (itemgrid.js → window.LGItems), подсказка — общая карточка сайта (C.X.cardTip) */
  let STSEL = null;   // выбранная ячейка: { from: 'b' | 's', uid }
  let STRES = null;   // итог «всё разом» / сообщение перетаскивания: { t, bad }
  let STCELLS = {};   // 'b:uid' / 's:uid' → { it, n, uids } — для подсказки и перетаскивания
  let STD = null, STP = null, STTAP = '';   // перетаскивание (LGItems.drag) в окне Склада, его окно, чем нажали последний раз
  const STCOARSE = () => window.LGSiteUi.is('touch');   // 24.10: телефон — подсказка про удержание
  // ячейки — как у игры (legionary/storage.js): снаряжение по одной, расходники стопками; порядок — как в игре (keep)
  const stCellsOf = (list, stack) => IGW().cells(list, stack, { keep: true });
  // влезет ли ячейка c (из from) на другую сторону: свободная ячейка или неполная стопка того же (как кнопки и игра)
  function stCan(h, from, c) {
    const G = h.sg, toSt = from === 'b';
    if (c.it.event && !c.it.wearable) return true;
    const list = toSt ? stCellsOf(G.store || [], G.ss) : stCellsOf(h.items || [], G.bs), cap = toSt ? G.scap : G.cap, used = toSt ? G.sused : G.used, stack = toSt ? G.ss : G.bs;
    return used < cap || (!c.it.wearable && list.some((x) => x.it.id === c.it.id && x.n < stack));
  }
  // одна дорога и для кнопок, и для перетаскивания: /api/stPut · /api/stTake (uid + сколько из стопки)
  function stMove(from, uid, n, btn) {
    const toSt = from === 'b'; STSEL = null;
    return stAct(toSt ? '/api/stPut' : '/api/stTake', { uid, n }, toSt ? 'Положено на склад' : 'Забрано в сумку', btn);
  }
  /* 29.10 (баг: «с телефона двойное касание на вещи Склада - перенос не виден, пока не закроешь окно»): ответ игры (C.X.act) обновляет
     героя и вкладку «Персонаж», но окно Города перерисовывалось только живым обновлением героя (heroChanged из SSE) - а на телефоне
     канал часто закрыт (вкладка в фоне, сеть). Теперь окно Склада перерисовывается само, когда ответ пришёл: и при успехе, и при ошибке
     (вещь остаётся на месте, причина - в уведомлении act) */
  // возвращает то, что получил: stAct отдаёт вызвавшему ответ игры ({ ok, error } от C.X.act)
  function stSync(r) { if (C.S && C.S.panelId === 'storage') rerenderUi('storage'); return r; }
  function stAct(path, body, ok, btn) {
    return Promise.resolve(C.X.act(path, body, ok, btn)).then(stSync, (e) => {
      stSync(); stResShow('Не получилось - попробуй ещё раз', true);
      console.warn('[склад]', e);
    });
  }
  // 24.10: сколько одинаковых на этой стороне (снаряжение — одна) и «половина» (не меньше 1)
  function stAllOf(h, from, c) {
    if (!h || !h.sg || !c) return 1; if (c.it.wearable) return 1;
    return (from === 'b' ? (h.items || []).filter((x) => !x.on) : h.sg.store || []).filter((x) => x.id === c.it.id).length || 1;
  }
  const stHalf = (all) => Math.max(1, Math.floor(all / 2));
  // 24.10: перенести n из ячейки (Shift — всё, Ctrl — половина, меню): бой / нет места — строкой, без запроса
  function stGo(from, uid, n) {
    const h = C.X.hero(), c = STCELLS[from + ':' + uid]; if (!h || !h.sg || !c) return;
    if (h.busy) { stResShow('Идёт бой - склад после боя', true); return; }
    if (!stCan(h, from, c)) { stResShow(from === 'b' ? 'На складе нет места - расширь склад или забери что-нибудь' : 'Сумка полна - освободи место', true); return; }
    stResShow('', false); return stMove(from, uid, Math.max(1, Math.min(stAllOf(h, from, c), Math.floor(n) || 1)), null);   // 25.10: ответ ждёт новая сумка (inv2)
  }
  // 24.10: меню ячейки (ПКМ, клавиша меню / Shift+F10, на телефоне — удержать и отпустить): 1 / половина / всё / N…
  function stMenu(el, from, uid, xy) {
    const h = C.X.hero(), c = STCELLS[from + ':' + uid]; if (!h || !h.sg || !c || !IGW().menu) return;
    const all = stAllOf(h, from, c), toSt = from === 'b', verb = toSt ? 'На склад' : 'В сумку';
    const items = all > 1 ? [{ t: `${verb}: 1`, v: 1 }, ...(all > 2 ? [{ t: `${verb}: половину (${stHalf(all)})`, v: stHalf(all) }] : []), { t: `${verb}: всё (${all})`, v: all }, { t: `${verb}: сколько…`, v: 'n' }] : [{ t: verb, v: 1 }];
    IGW().menu(xy && !(xy.x === 0 && xy.y === 0) ? xy : el, items, { title: `${c.it.name}${all > 1 ? ' ×' + all : ''}`, label: `${c.it.name}: ${toSt ? 'положить на склад' : 'забрать в сумку'}`, max: all, def: stHalf(all), pick: (n) => stGo(from, uid, n) });
  }
  /* 25.10: новая сумка (новинка inv2 — флаг i2 у героя): обе сетки Склада — библиотека инвентаря (packages/inventory, режим
     'storage'): перетаскивание между сеткой и сеткой, Shift+клик / правая кнопка / двойной клик — вся стопка, удержание пальцем —
     «1 / половина / всё / сколько», кнопки переноса внизу. Перенос — та же дорога stGo → stMove (/api/stPut · /api/stTake), «всё разом»,
     «Разложить» и «+N ячеек» — как были. Библиотека живёт в своём элементе между перерисовками окна (обновляются только ячейки) */
  let STI = null;   // { host, inv }
  const stInv2 = (h) => !!(h && h.i2 && window.LGInventory);
  const stData2 = (h) => ({ hero: h, items: h.items || [], storage: h.sg.store || [], bagCap: h.sg.cap, storageCap: h.sg.scap, stack: h.sg.bs, storageStack: h.sg.ss, ...(+h.ob > 0 ? { obCap: +h.ob } : {}) });   // 26.10: рудная сумка - своей сеткой (руда со склада - туда)
  function stInvOff() { if (STI) { try { STI.inv.destroy(); } catch (e) { /* уже снят */ } STI = null; } }
  // 30.10 (окно Склада): «Сортировать» - в шапке своей сетки; «Положить всё» / «Взять всё» - между сетками (узкая колонка / строка), без обводки
  const stSortBtn = (h, box, n) => `<button type="button" class="btn ghost sm cy-xs cy-sort" data-stsort="${box}"${h.busy || n < 2 ? ' disabled' : ''} aria-label="Сортировать ${box === 'b' ? 'сумку' : 'склад'}: оружие, доспехи, шлемы, щиты, амулеты, расходники, материалы; лучшие первыми">⇅ Сортировать</button>`;
  const stAllBtns = (canPut, canTake) => `<button type="button" class="cy-flat" data-stall="put"${canPut ? '' : ' disabled'} aria-label="Положить всё из сумки на склад">Положить всё <span class="cy-arh" aria-hidden="true">→</span><span class="cy-arv" aria-hidden="true">↓</span></button>
        <button type="button" class="cy-flat" data-stall="take"${canTake ? '' : ' disabled'} aria-label="Взять всё со склада в сумку"><span class="cy-arh" aria-hidden="true">←</span><span class="cy-arv" aria-hidden="true">↑</span> Взять всё</button>`;
  // «+5 ячеек · цена» - мелкая кнопка в шапке Склада; «не хватает» - в подсказке кнопки
  const stExpandBtn = (h, G) => {
    if (!G.price) return '';
    const sure = stxSure(G), lack = (+h.money || 0) < G.price;
    // денег мало - рядом мелким текстом, сколько не хватает; хватает - ничего
    const need = lack && C.X.moneyText ? `<span class="cy-xlack" data-stxlack>не хватает ${esc(C.X.moneyText(G.price - (+h.money || 0)))}</span>` : '';
    return `<button type="button" class="btn ${sure ? 'primary' : 'ghost'} sm cy-xs${sure ? ' cy-sure' : ''}" data-stx${lack || h.busy ? ' disabled' : ''}>${sure ? `Точно? ${C.X.money(G.price)}` : `+${G.step} ячеек · ${C.X.money(G.price)}`}</button>${need}`;
  };
  function storageBody2(h, G, bag, st) {
    const full = G.used >= G.cap, sfull = G.sused >= G.scap;
    return `<div class="cy-store cy-store2">
      <div class="cy-soon">${npc('Кладовщик', 'happy', {}, { hat: 'cap' })}<div>${say('Сумка у героя небольшая. Что не нужно в походе — оставь у меня: здесь не потеряется, даже если герой падёт.')}<p class="cy-stres${STRES && STRES.bad ? ' bad' : ''}" role="status" aria-live="polite">${STRES ? esc(STRES.t) : ''}</p></div></div>
      ${h.busy ? '<p class="note cy-warn">Идёт бой — склад после боя.</p>' : ''}
      ${full ? '<p class="note cy-warn">Сумка полна: в походе новые вещи достанутся другим, пока не освободишь место.</p>' : ''}
      ${sfull ? '<p class="note cy-warn">Склад полон — расширь его или забери что-нибудь.</p>' : ''}
      <div data-stinv></div>
      <p class="note">Надетое и угощения особых событий (Хэллоуин и другие) места не занимают. Одинаковые еда, зелья и материалы лежат стопкой: в сумке — до ${G.bs}, на складе — до ${G.ss}.</p>
    </div>`;
  }
  // шапки сеток и колонка между ними - в самой сумке (packages/inventory, options.slots): наполняем при каждой перерисовке окна
  function stSlots2(h, P) {
    const G = h.sg, host = P.querySelector('.lgi-m-storage'); if (!host || !G) return;
    const bag = stCellsOf(h.items || [], G.bs), st = stCellsOf(G.store || [], G.ss);
    const canPut = !h.busy && bag.some((c) => stCan(h, 'b', c)), canTake = !h.busy && st.some((c) => stCan(h, 's', c));
    const put = (name, html) => { const e = host.querySelector(`[data-lgi="${name}"]`); if (e) e.innerHTML = html; };
    // замена разметки снимает фокус со старого поля окошка монет - это не выбор человека (STM_RE)
    STM_RE = true;
    try {
      put('gx-bag', stSortBtn(h, 'b', bag.length) + stCoins(h, G, 'b'));
      put('gx-st', stExpandBtn(h, G) + stSortBtn(h, 's', st.length) + stCoins(h, G, 's'));
      put('mid', stAllBtns(canPut, canTake));
    } finally { STM_RE = false; }
  }
  function stMount2(h, P) {
    const ph = P.querySelector('[data-stinv]'); if (!ph) return;
    if (STI) { ph.replaceWith(STI.host); STI.inv.update(stData2(h)); stSlots2(h, P); return; }
    STI = { host: ph, inv: window.LGInventory.mount(ph, { variant: 'full', mode: 'storage', data: stData2(h),
      actions: { move: (uid, from, to, n) => stGo(from === 'st' ? 's' : 'b', uid, n) },
      options: { header: false, detail: false, slots: true, art: C.X.art, storeKey: 'lgInv2St', sortDefault: 'new', filters: ['all', 'weapon', 'armor', 'helmet', 'shield', 'trinket', 'use', 'other'],
        cardTip: C.X.cardTip ? (el, it) => C.X.cardTip(el, it, C.X.hero()) : null, tipHide: C.X.tipHide ? () => C.X.tipHide() : null,
        say: (t) => stResShow(t, true), labels: { full: 'Нет места', storage: 'Склад' },
        onDragEnd: () => { if (STI && STI.dirty) { STI.dirty = false; rerenderUi('storage'); } } } }) };    stSlots2(h, P);
  }
  // 24.10: подтверждение «+N ячеек» — до 4 с и только для той же цены
  let STX = null, STX_T = 0;
  /* 30.10 (решение стримера): монеты - в шапках сеток: у «Сумки» то, что у героя с собой, у «Склада» - монеты склада (только если игра прислала vm:
     флаг vaultMoneyPublic или тестер). Рядом кнопка «Положить на склад» / «Взять со склада» - маленькое окошко поверх (не сдвигает сетки): поле суммы
     (в самых мелких монетах), «+1 асс / денарий / ауреус» добавляют, «всё» и главная кнопка; больше, чем есть, ввести нельзя. В походе и в бою - закрыто, решает игра
     (legionary/storage.js moneyPut / moneyTake). Открытое окошко и введённое помним вне окна (STM) - окно перерисовывается на каждое обновление героя */
  let STM = null;   // { put, v, focus, busy, err }
  let STM_RE = false;   // окно перерисовывается
  function stCoins(h, G, side) {
    const put = side === 'b', can = G.vm != null;
    if (!put && !can) return '';
    const have = Math.max(0, Math.floor(+(put ? h.money : G.vm) || 0)), off = !!h.busy || !!G.vq, dis = off || have < 1;
    const why = h.busy ? 'Идёт бой - монеты после боя' : G.vq ? 'В походе склад закрыт для монет - после похода' : have < 1 ? (put ? 'В кошельке пусто' : 'На складе пусто') : '';
    const open = !!STM && STM.put === put && !off;
    return `<div class="cy-vmrow"><span class="cy-vmc"><small>Монеты</small> ${C.X.money(have)}</span>
      ${can ? `<button type="button" class="btn ghost sm cy-xs" data-vmopen="${put ? 'put' : 'take'}"${dis ? ' disabled' : ''}${why ? ` title="${esc(why)}"` : ''} aria-haspopup="dialog" aria-expanded="${open}">${put ? 'Положить на склад' : 'Взять со склада'}</button>` : ''}
      ${!put && G.vq ? '<span class="cy-vmq">В походе склад закрыт для монет - после похода.</span>' : ''}
      ${open ? stPop(have) : ''}</div>`;
  }
  function stPop(max) {
    const put = STM.put, v = Math.max(0, Math.min(max, Math.floor(+STM.v || 0))), nm = put ? 'Положить' : 'Взять', unit = String(C.X.moneyText(1)).replace(/^\d+\s*/, '');
    const adds = [1, 100, 10000].map((u) => `<button type="button" class="btn ghost sm" data-vmadd="${u}"${v >= max ? ' disabled' : ''}>+${esc(C.X.moneyText(u))}</button>`).join('');
    return `<div class="cy-vmpop" role="dialog" aria-label="${put ? 'Положить монеты на склад' : 'Взять монеты со склада'}">
      <label class="cy-vmin"><span>Сколько, в ${esc(unit)}</span><input type="number" inputmode="numeric" min="1" max="${max}" step="1" value="${v || ''}" data-vmn aria-label="Сколько монет (в самых мелких)"></label>
      <p class="cy-vmcv" data-vmcv>${v ? '= ' + esc(C.X.moneyText(v)) : 'Есть: ' + esc(C.X.moneyText(max))}</p>
      <div class="cy-vmadd">${adds}</div>
      <p class="cy-vmerr" data-vmerr role="alert">${STM.err ? esc(STM.err) : ''}</p>
      <div class="cy-vmact"><button type="button" class="btn ghost sm" data-vmall${max >= 1 && !STM.busy ? '' : ' disabled'}>${nm} всё</button><button type="button" class="btn primary sm" data-vmgo${v >= 1 && v <= max && !STM.busy ? '' : ' disabled'}>${nm}</button></div>
    </div>`;
  }
  // закрыть окошко без перерисовки окна (клик мимо: иначе следующее нажатие уйдёт в уже заменённый элемент)
  function stMoneyClose() {
    STM = null;
    const P = C.S && C.S.panel; if (!P) return;
    P.querySelectorAll('.cy-vmpop').forEach((e) => e.remove());
    P.querySelectorAll('[data-vmopen]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  let STM_G = false;
  function stMoneyGlobal() {
    if (STM_G) return; STM_G = true;
    const on = () => !!STM && !!C.S && C.S.panelId === 'storage';
    document.addEventListener('keydown', (e) => { if (e.key !== 'Escape' || !on()) return; e.preventDefault(); e.stopImmediatePropagation(); stMoneyClose(); }, true);
    document.addEventListener('pointerdown', (e) => { if (on() && !(e.target.closest && e.target.closest('.cy-vmpop, [data-vmopen]'))) stMoneyClose(); }, true);
  }
  function stMoneyBind(P) {
    stMoneyGlobal();
    P.querySelectorAll('[data-vmopen]').forEach((b) => b.onclick = () => { const put = b.dataset.vmopen === 'put'; STM = STM && STM.put === put ? null : { put, v: 0, focus: true, busy: false, err: '', fresh: true }; rerenderUi('storage'); });
    const pop = P.querySelector('.cy-vmpop'); if (!pop) return;
    const inp = pop.querySelector('[data-vmn]'), go = pop.querySelector('[data-vmgo]'), all = pop.querySelector('[data-vmall]'), cv = pop.querySelector('[data-vmcv]'), er = pop.querySelector('[data-vmerr]'), adds = pop.querySelectorAll('[data-vmadd]');
    const max = +inp.max || 0;
    const refresh = () => {
      const v = STM.v;
      go.disabled = STM.busy || !(v >= 1 && v <= max); all.disabled = STM.busy || max < 1;
      adds.forEach((a) => { a.disabled = v >= max; });
      cv.textContent = v ? '= ' + C.X.moneyText(v) : 'Есть: ' + C.X.moneyText(max); er.textContent = STM.err || '';
    };
    const send = (body) => {
      if (!STM || STM.busy) return;
      const put = STM.put; STM.busy = true; STM.err = ''; refresh();
      stAct(put ? '/api/stMoneyPut' : '/api/stMoneyTake', body, put ? 'Монеты на складе' : 'Монеты в кошельке', null).then((r) => {
        if (STM && r && r.ok === false) { STM.busy = false; STM.err = r.error || 'Не получилось'; } else if (STM && r == null) { STM.busy = false; } else STM = null;
        stSync();
      });
    };
    pop.querySelector('[data-vmall]').onclick = () => send({ all: 1 });
    go.onclick = () => { const n = Math.floor(+inp.value || 0); if (n >= 1 && n <= max) send({ n }); };
    adds.forEach((a) => a.onclick = () => { STM.v = Math.min(max, (Math.floor(+STM.v) || 0) + (+a.dataset.vmadd || 0)); STM.err = ''; inp.value = STM.v; refresh(); });
    inp.oninput = () => {
      const raw = Math.max(0, Math.floor(+inp.value || 0)); STM.v = Math.min(max, raw); STM.err = '';
      if (raw > max) inp.value = STM.v;
      refresh();
    };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!go.disabled) go.click(); } };
    inp.onfocus = () => { if (STM) STM.focus = true; }; inp.onblur = () => { if (STM && !STM_RE && inp.isConnected) STM.focus = false; };
    // preventScroll: фокус в поле не должен прокручивать окно (верх с репликой уезжал); окошко при необходимости доводим до видимости сами
    if (STM && STM.focus) { inp.focus({ preventScroll: true }); if (STM.fresh !== false) { STM.fresh = false; try { pop.scrollIntoView({ block: 'nearest' }); } catch (e) { /* старый браузер - без прокрутки */ } } const L0 = String(inp.value).length; try { inp.setSelectionRange(L0, L0); } catch (e) { /* number - без выделения, это нормально */ } }
  }
  const stxSure = (G) => !!(STX && STX.until > Date.now() && G && STX.price === G.price);
  function storageBody(h) {
    if (!IGW()) return '<p class="note">Склад раскладывается… обнови страницу, если не появится.</p>';
    const G = h.sg, bag = stCellsOf(h.items || [], G.bs), st = stCellsOf(G.store || [], G.ss);
    STCELLS = {}; for (const c of bag) STCELLS['b:' + c.uids[0]] = c; for (const c of st) STCELLS['s:' + c.uids[0]] = c;
    if (stInv2(h)) return storageBody2(h, G, bag, st);   // 25.10: новая сумка (новинка inv2) — библиотека инвентаря
    const full = G.used >= G.cap, sfull = G.sused >= G.scap;
    const grid = (cs, from, cap, label) => IGW().grid(cs, { art: C.X.art, cap, label, low: (it) => it.dur != null && +it.dur <= (C.X.durLow ? C.X.durLow() : 30),
      gattr: `data-igdrop="${from}" data-stgrid="${from}"`, drag: true, on: (c) => !!STSEL && STSEL.from === from && c.uids.includes(STSEL.uid), attr: (c) => `data-st="${from}:${esc(c.uids[0])}"` });
    // выбранное: что это и куда
    let pick = '<p class="note">Выбери вещь или перетащи её в сумку / на склад (на телефоне — нажми и подержи).</p>';
    if (STSEL) {
      const list = STSEL.from === 'b' ? bag : st, c = list.find((x) => x.uids.includes(STSEL.uid));
      if (!c) STSEL = null;
      else {
        const toSt = STSEL.from === 'b', all = (toSt ? (h.items || []).filter((x) => !x.on) : G.store).filter((x) => x.id === c.it.id && !c.it.wearable).length;
        const can = stCan(h, STSEL.from, c);
        pick = `<div class="cy-stp"><span class="cy-gi">${C.X.art(c.it)}</span><div><b>${esc(c.it.name)}</b>${all > 1 ? ` <small>×${all}</small>` : ''}<em>${toSt ? 'в сумке' : 'на складе'}</em></div>
          <div class="cy-stb">${all > 1 ? `<button type="button" class="btn ghost sm" data-stgo="1"${can && !h.busy ? '' : ' disabled'}>${toSt ? 'Положить 1' : 'Забрать 1'}</button>` : ''}${all > 2 ? `<button type="button" class="btn ghost sm" data-stgo="${stHalf(all)}"${can && !h.busy ? '' : ' disabled'}>Половину (${stHalf(all)})</button>` : ''}
          <button type="button" class="btn primary sm" data-stgo="${all > 1 ? all : 1}"${can && !h.busy ? '' : ' disabled'}>${toSt ? (all > 1 ? 'Положить все' : 'На склад') : (all > 1 ? 'Забрать все' : 'В сумку')}</button></div></div>
          ${!can ? `<p class="note cy-warn">${toSt ? 'На складе нет места — расширь склад или забери что-нибудь.' : 'Сумка полна — освободи место.'}</p>` : ''}`;
      }
    }
    const canPut = !h.busy && bag.some((c) => stCan(h, 'b', c)), canTake = !h.busy && st.some((c) => stCan(h, 's', c));
    const sortBtn = (box, n) => stSortBtn(h, box, n);
    return `<div class="cy-store">
      <div class="cy-soon">${npc('Кладовщик', 'happy', {}, { hat: 'cap' })}<div>${say('Сумка у героя небольшая. Что не нужно в походе — оставь у меня: здесь не потеряется, даже если герой падёт.')}</div></div>
      ${h.busy ? '<p class="note cy-warn">Идёт бой — склад после боя.</p>' : ''}
      <div class="cy-stsel" aria-live="polite">${pick}</div>
      <div class="cy-sth"><h3 class="h3">Сумка</h3><span class="cy-cnt${full ? ' full' : ''}">${G.used} / ${G.cap}</span>${sortBtn('b', bag.length)}${stCoins(h, G, 'b')}</div>
      ${full ? '<p class="note cy-warn">Сумка полна: в походе новые вещи достанутся другим, пока не освободишь место.</p>' : ''}
      ${grid(bag, 'b', G.cap, 'Сумка')}
      <p class="cy-sthint">${STCOARSE() ? 'Нажми и подержи вещь - меню: 1 / половина / всё / сколько; подержи и тяни - перенести стопку.' : 'Shift+клик - весь стак, Ctrl+клик - половина, правая кнопка - меню (1 / половина / всё / сколько).'}</p>
      <div class="cy-stall" role="group" aria-label="Перенести всё разом">
        ${stAllBtns(canPut, canTake)}
        <p class="cy-stres${STRES && STRES.bad ? ' bad' : ''}" role="status" aria-live="polite">${STRES ? esc(STRES.t) : ''}</p>
      </div>
      <div class="cy-sth"><h3 class="h3">Склад</h3><span class="cy-cnt${sfull ? ' full' : ''}">${G.sused} / ${G.scap}</span>${stExpandBtn(h, G)}${sortBtn('s', st.length)}${stCoins(h, G, 's')}</div>
      ${grid(st, 's', G.scap, 'Склад')}
      <p class="note">Надетое и угощения особых событий (Хэллоуин и другие) места не занимают. Одинаковые еда, зелья и материалы лежат стопкой: в сумке — до ${G.bs}, на складе — до ${G.ss}.</p>
    </div>`;
  }
  function stResShow(t, bad) {
    STRES = t ? { t, bad: !!bad } : null;
    const el = C.S && C.S.panel && C.S.panel.querySelector('.cy-stres'); if (el) { el.textContent = t || ''; el.classList.toggle('bad', !!bad); }
  }
  // итог «всё разом» из игры (app.js storeNote → LGCity.storeRes)
  function storeRes(x) { if (x && (x.op === 'stPutAll' || x.op === 'stTakeAll')) stResShow(`Перенесено ${x.n || 0}${x.left ? `, не влезло ${x.left}` : ''}`); }
  const stItem = (el) => { const c = el && STCELLS[el.dataset.st]; return c ? { ...c.it, n: c.n, uids: c.uids } : null; };
  function stTipShow(el) { if (C.X.cardTip && el && !(STD && STD.active())) { const it = stItem(el); if (it) C.X.cardTip(el, it, C.X.hero()); } }
  function stTipHide() { if (C.X.tipHide) C.X.tipHide(); }
  const stTipOn = () => (C.X.tipFor ? C.X.tipFor() : null);
  const stOff = () => { if (STD) { STD.off(); STD = null; STP = null; } stInvOff(); STM = null; };   // 25.10: и новая сумка (inv2)
  // перетаскивание и подсказки — один раз на окно зала (окно новое при каждом входе)
  function stBind(P) {
    if (STP === P) return;
    stOff(); STP = P;
    const SEL = '.cy-store .cy-sc[data-st]', mine = () => C.S && C.S.panelId === 'storage' && C.S.panel === P;
    const why = (src, t) => { const h = C.X.hero(), from = src.dataset.st.slice(0, 1), c = STCELLS[src.dataset.st]; if (!h || !h.sg || !c || t.dataset.igdrop === from) return 'same'; if (h.busy) return 'busy'; return stCan(h, from, c) ? '' : 'full'; };
    STD = IGW().drag(P, {
      src: '.cy-store [data-igdrag][data-st]', drop: '.cy-store [data-igdrop]', tapSel: '.cy-store [data-st]', snap: true, scroll: true,
      ok: (src, t) => !why(src, t),
      onStart: () => stTipHide(),
      onDrop: (src) => { const [from, uid] = src.dataset.st.split(':'), c = STCELLS[src.dataset.st]; if (!c) return; stResShow('', false); stMove(from, uid, c.n, null); },
      reject: (src, t) => { const w = why(src, t), from = src.dataset.st.slice(0, 1); if (w === 'busy') stResShow('Идёт бой — склад после боя', true); else if (w === 'full') stResShow(from === 'b' ? 'На складе нет места — расширь склад или забери что-нибудь' : 'Сумка полна — освободи место', true); },
      onEnd: () => { if (STP && STP.dataset.stdirty) { delete STP.dataset.stdirty; rerenderUi('storage'); } },   // пока тащили, пришёл новый вид героя
      // нажатие без перетаскивания — выбрать ячейку (кнопки «На склад» / «В сумку» ниже); пальцем — ещё и карточка вещи
      // 24.10: Shift+клик — вся стопка (все одинаковые на этой стороне), Ctrl / ⌘+клик — половина; без клавиш — выбрать, как раньше
      hold: (src) => { const [from, uid] = src.dataset.st.split(':'); stTipHide(); stMenu(src, from, uid); },
      tap: (src, e) => { const [from, uid] = src.dataset.st.split(':');
        if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) { const h = C.X.hero(), all = stAllOf(h, from, STCELLS[src.dataset.st]); stGo(from, uid, e.shiftKey ? all : stHalf(all)); return; }
        STSEL = STSEL && STSEL.from === from && STSEL.uid === uid ? null : { from, uid }; rerenderUi('storage'); },
    });
    // 24.10: правая кнопка (и клавиша меню / Shift+F10 на ячейке) — меню «1 / половина / всё / N…»
    P.addEventListener('contextmenu', (e) => { if (!mine()) return; const el = e.target.closest(SEL); if (!el) return; e.preventDefault(); if (STD && STD.dragging()) return; const [from, uid] = el.dataset.st.split(':'); stTipHide(); stMenu(el, from, uid, e.pointerType === 'touch' ? null : { x: e.clientX, y: e.clientY }); });
    P.addEventListener('pointerdown', (e) => { if (!mine()) return; STTAP = e.pointerType || 'mouse'; if (e.pointerType === 'mouse' || !e.target.closest(SEL)) stTipHide(); });
    P.addEventListener('pointerover', (e) => { if (!mine() || e.pointerType !== 'mouse' || STD.active()) return; const el = e.target.closest(SEL); if (el && stTipOn() !== el) stTipShow(el); });
    P.addEventListener('pointerout', (e) => { if (!mine() || e.pointerType !== 'mouse') return; const el = e.target.closest(SEL); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) stTipHide(); });
    P.addEventListener('focusin', (e) => { if (!mine()) return; const el = e.target.closest(SEL); if (el && el.matches(':focus-visible')) stTipShow(el); });
    P.addEventListener('focusout', (e) => { if (mine() && e.target.closest(SEL)) stTipHide(); });
    P.addEventListener('scroll', () => { if (mine()) stTipHide(); }, { passive: true, capture: true });
  }
  function storageAfter(h) {
    const P = C.S.panel; if (!IGW()) return;
    if (stInv2(h)) stMount2(h, P); else { stInvOff(); stBind(P); }
    stMoneyBind(P);
    const f = stTipOn(); if (f && !f.isConnected) stTipHide();
    P.querySelectorAll('[data-stgo]').forEach((b) => b.onclick = () => { if (!STSEL) return; stMove(STSEL.from, STSEL.uid, +b.dataset.stgo || 1, b); });
    P.querySelectorAll('[data-stall]').forEach((b) => b.onclick = () => { const put = b.dataset.stall === 'put'; stResShow('', false); stAct(put ? '/api/stPutAll' : '/api/stTakeAll', {}, put ? 'Кладовщик относит всё на склад' : 'Кладовщик несёт всё в сумку', b); });
    P.querySelectorAll('[data-stsort]').forEach((b) => b.onclick = () => stAct('/api/stSort', { box: b.dataset.stsort }, b.dataset.stsort === 'b' ? 'Сумка разложена' : 'Склад разложен', b));
    // 24.10 (баг тестера): «Точно?» помним вне кнопки (STX) — склад перерисовывается на каждое обновление героя, и второе нажатие
    // попадало в новую кнопку без пометки. Через 4 с без ответа — снова «+N ячеек»
    const x = P.querySelector('[data-stx]'); if (x) x.onclick = () => {
      const H = C.X.hero(), G = H && H.sg; if (!G || !G.price) return;
      if (!stxSure(G)) { STX = { until: Date.now() + 4000, price: G.price }; clearTimeout(STX_T); STX_T = setTimeout(() => { STX = null; rerenderUi('storage'); }, 4000); rerenderUi('storage'); const b = C.S && C.S.panel && C.S.panel.querySelector('[data-stx]'); if (b) b.focus(); return; }
      STX = null; clearTimeout(STX_T);
      stAct('/api/stExpand', { price: G.price }, `Склад расширен: +${G.step} ячеек`, x);
    };
    // на телефоне подсказка — по нажатию: выбранная ячейка показывает карточку вещи
    if (STTAP && STTAP !== 'mouse' && STSEL) { const el = P.querySelector(`[data-st="${STSEL.from}:${CSS.escape(STSEL.uid)}"]`); if (el) stTipShow(el); }
  }

  return {
    body: (h) => storageBody(h),
    after: (h) => storageAfter(h),
    off: () => stOff(),
    // итог «всё разом» из игры (app.js storeNote → LGCity.storeRes)
    res: (x) => storeRes(x),
    // тащат вещь (старая сетка или новая сумка inv2) - окно перерисуется, когда отпустят
    hold() {
      if (STD && STD.dragging && STD.dragging() && STP) { STP.dataset.stdirty = '1'; return true; }
      if (STI && STI.inv.dragging()) { STI.dirty = true; return true; }
      return false;
    },
    // пока окно перерисовывается, потеря фокуса полем окошка монет - не выбор человека (STM_RE), фокус вернёт stMoneyBind
    quiet(fn) { STM_RE = true; try { return fn(); } finally { STM_RE = false; } },
  };
  };
})();
