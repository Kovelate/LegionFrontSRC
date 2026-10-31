/* 31.10 (D1, docs/city.md): общее у окон зданий «Города» - часть модуля «Город» (products/legion/modules/fair/client/cityshop.js),
   адрес для браузера - /site/cityshop.js (src/gateway/static.ts FAIR_SITE). Перенесено из legacy/site/public/city.js блоками, без смены
   поведения: app.js грузит этот файл и файлы зданий (fair/client/buildings/*.js, адреса /site/b-<здание>.js) перед city.js, city.js
   создаёт общее - window.LGCityShop(C) - и здания - window.LGCityBuildings[id](C, SH).
   Здесь: сцена зала (интерьер 1920×1080 «по размеру», прокрутка и зум внутри лавки), товар лавок (STOCK - один раз за открытие города),
   кнопки товара поверх полок, карточка вещи, «Купить … за …? Да / Нет», полоса лавки (кошелёк, сумка), воровская наценка (TH).
   C - что нужно от города (city.js): C.S (построенный город), C.X (помощники сайта из app.js), C.TOWN (открытый город), C.ROOM (где в зале
   герой и продавец), C.esc / still / scopeIds / npcAs / hwDead / ART (рисунок), C.csOn / msOn / inTown / homeHere / foreignK (что открыто
   и наценка края), C.streetBg() (кусок улицы у наковальни), C.bld(id) (здание: плитки Лавки, образцы Шатра). Покупки - прежние маршруты
   сайта /api/cityBuy, /api/buymat (игра: fair/sitebuy.js). */
(function () {
  'use strict';
  window.LGCityShop = function (C) {
  const esc = C.esc, ART = C.ART, still = C.still, scopeIds = C.scopeIds, npcAs = C.npcAs, ROOM = C.ROOM;
  const hwDead = () => C.hwDead(), csOn = () => C.csOn(), msOn = () => C.msOn(), inTown = () => C.inTown(), homeHere = () => C.homeHere(), foreignK = () => C.foreignK();
  const streetBg = () => C.streetBg();
  // плитки прилавка Лавки и образцы кабинок Шатра - в файлах этих зданий (buildings/shop.js, tent.js)
  const shopTiles = (inn, st, h) => C.bld('shop').tiles(inn, st, h), tentHots = (inn, st, pos) => C.bld('tent').hots(inn, st, pos);
  // 23.10 (решение стримера): лавки — на весь экран, без панели слева: интерьер с полками во всё окно (телефон — по высоте,
  // вбок — прокрутка внутри лавки), сверху — тонкая полоса (кошелёк, сумка, «К наковальне»), реплика продавца — снизу справа
  const FULL = { forge: 1, magic: 1, tent: 1, shop: 1 };
  let STOCK = null;   // товар Кузни и Шатра (тот же, что на стриме) — один раз за открытие города
  const loadStock = () => (STOCK ? Promise.resolve(STOCK) : C.X.api('/api/city/stock').then((r) => { if (r && r.ok) STOCK = r; return STOCK; }).catch(() => null));
  // 22.10: сцена «во всю ширину» (ROOM.fit) ниже окна — над ней место. Раньше — ровная заливка с размытым стыком, и верх
  // сцены обрывался. Теперь стена продолжается вверх: полоска сцены у самого верха (y 4…6) растянута вверх на WALL_UP —
  // гофра, скотч, столбы света, труба горна, верёвки вывески идут дальше без стыка. Рисуется один раз (статичный SVG).
  const WALL_UP = 2400;
  const ROOM_HEAD = 64;   // 23.10: шапка зала (название и «Выйти», city.css .cy-rh) — столько сверху окна закрыто
  const WALL_S = (WALL_UP + 4) / 2, WALL_TY = -WALL_UP - 4 * WALL_S;
  // 23.10 (баг от зрителя): товар под мышью — контур самой вещи (группа data-it у рисунка стиля, fair.js), а не рамка поверх ценников.
  // Альфа рисунка порогом (полупрозрачные ореолы и свечение редкости не обводятся) → расширить → золотая обводка и мягкий свет вокруг
  const OL_DEFS = '<defs>' + [['cy-itol', '#ffe9a0', 0.55], ['cy-itol2', '#ffc94d', 0.8]].map(([id, c, o]) => `<filter id="${id}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feComponentTransfer in="SourceAlpha" result="a"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer><feMorphology class="cy-olm" in="a" operator="dilate" radius="4" result="d"/><feFlood flood-color="${c}"/><feComposite in2="d" operator="in" result="o"/><feGaussianBlur in="o" stdDeviation="4" result="b"/><feComponentTransfer in="b" result="g"><feFuncA type="linear" slope="${o}"/></feComponentTransfer><feMerge><feMergeNode in="g"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`).join('') + '</defs>';
  const doodSize = (r, street) => r.querySelectorAll(street ? '.cy-rbg svg svg.jl-doodle' : '.cy-rbg svg.jl-doodle').forEach((d) => { const w = d.getAttribute('width'), hh = d.getAttribute('height'); if (w) d.style.width = parseFloat(w) + 'px'; if (hh) d.style.height = parseFloat(hh) + 'px'; if (street) { d.style.position = 'static'; d.style.filter = 'none'; } });
  function roomSvg(id) {
    const inner = OL_DEFS + roomBg(id);
    if (!ROOM[id] || !ROOM[id].fit) return inner;
    return `<defs><clipPath id="cy-wall-top" clipPathUnits="userSpaceOnUse"><rect x="0" y="4" width="1920" height="2"/></clipPath></defs>`
      + `<g id="cy-room-scene">${inner}</g><use href="#cy-room-scene" clip-path="url(#cy-wall-top)" transform="translate(0 ${WALL_TY}) scale(1 ${WALL_S})"/>`;
  }
  function roomBg(id) {
    const R = ROOM[id], L = C.S.L;
    if (R.art === 'street') return streetBg();
    try {
      if (!R.art && L.rooms && L.rooms[id] && typeof L.rooms[id].svg === 'function') {
        const st = shopView(id, stockOf(id)) || (id === 'forge' || id === 'magic' ? { stands: [], shelf1: [], shelf2: [], case: [], mats: [] } : { booths: [], amulets: [] });
        C.S.itemPos = {};   // 23.10: где на полках какая вещь — туда кладём кнопки товара (наведение — карточка, двойной клик — купить)
        return `<rect width="1920" height="1080" fill="${esc(L.rooms[id].artBg || '#1d1626')}"/>` + scopeIds(still(npcAs(hwDead() ? 'ghost' : '', () => L.rooms[id].svg(st, C.S.itemPos))), 'cyr-');   // 28.10 (hw-npc-ghosts)
      }
    } catch (e) { console.warn('[город] интерьер', id, e); }
    return scopeIds(ART.room(C.S.st, R.art || 'plain'), 'cyr-');
  }
  // сцена 1920×1080 «по размеру»: заполняет место, свободное от интерфейса; герой и продавец — в середине этого места
  function fitRoom() {
    if (!C.S || !C.S.panelId) return;
    const r = C.S.room, inn = r.querySelector('.cy-rin'), ui = r.querySelector('.cy-rui'), R = ROOM[C.S.panelId]; if (!inn || !ui) return;
    const vw = r.clientWidth || innerWidth, vh = r.clientHeight || innerHeight, ur = ui.getBoundingClientRect(), mob = vw <= 720 || vh <= 500;   // как в city.css (max-width: 720px; телефон боком — max-height: 500px)
    if (FULL[C.S.panelId]) { fitFull(r, inn, vw, vh, mob, R); return; }
    let x0 = 0, x1 = vw, y1 = vh;
    if (mob) y1 = Math.max(160, vh - ur.height);
    else if (R.ui === 'l') x0 = ur.right; else if (R.ui === 'r') x1 = ur.left;   // 'o' — интерфейс поверх доски в самой сцене
    let k = mob ? Math.max(y1 / 1080, vw / 1920) : Math.max(vw / 1920, vh / 1080);
    let left, top;
    // 21.10: fit — вся ширина сцены в месте рядом с интерфейсом (полки Кузни не уходят под панель); сверху остаётся стена цвета artBg.
    // Не мельче 0.6 высоты окна: на узком окне лучше отрезать край, чем показать крошечную сцену
    if (R.fit && !mob) {
      k = Math.max(Math.min(k, (x1 - x0) / 1920), 0.6 * vh / 1080);
      const w = 1920 * k;
      left = w <= x1 - x0 ? x0 + (x1 - x0 - w) / 2 : Math.min(x0, Math.max(x1 - w, (x0 + x1) / 2 - R.focus * k));
      top = y1 - 1080 * k;   // пол — у низа окна
    } else {
      left = (x0 + x1) / 2 - R.focus * k; left = Math.min(0, Math.max(vw - 1920 * k, left));
      top = Math.min(0, y1 - 1080 * k);
      if (R.keep) top = Math.min(0, Math.max(top, ROOM_HEAD - R.keep * k));   // 23.10: не срезать сцену выше keep (вывеска) — пол чуть ниже края, герой виден
    }
    // цвет стены над сценой: artBg стиля (Кузня, Шатёр), иначе — фон самой сцены (первый прямоугольник во всю ширину: Лавка из cityart)
    let bg = R.fit && !mob && top > 0 && ((C.S.L.rooms && C.S.L.rooms[C.S.panelId] && C.S.L.rooms[C.S.panelId].artBg) || '');
    if (R.fit && !mob && top > 0 && !bg) { const rc = r.querySelector('.cy-rbg rect[width="1920"]'), f = rc && rc.getAttribute('fill'); if (f && /^#[\da-f]{3,8}$/i.test(f)) bg = f; }
    r.classList.toggle('cy-fit', !!bg); r.style.setProperty('--cy-fitbg', bg || 'transparent');
    panRoom(r, inn, k, left, top, 0, vw, R.keep ? ROOM_HEAD : 0, y1, vw, vh);   // место — окно (под панелью сбоку сцена и раньше была закрыта панелью)
  }
  /* 23.10 (баг с телефона): сцена не влезла в своё место (узкое окно, телефон) — край интерьера раньше просто срезался, без
     способа его увидеть. Теперь срезанное можно досмотреть прокруткой внутри зала (палец — вбок, мышь — колесо / полоса):
     сначала — тот же вид, что раньше (left, top), а прокрутка доходит до любого края сцены в месте [x0…x1]×[y0…y1].
     Страница сама не прокручивается (зал — position: fixed). Влезла целиком — без прокрутки, как было */
  function panRoom(r, inn, k, left, top, x0, x1, y0, y1, vw, vh) {
    const rs = r.querySelector('.cy-rs'), sz = r.querySelector('.cy-rsz'), w = 1920 * k, h = 1080 * k;
    const ox = Math.min(0, left - x0), oy = Math.min(0, top - y0);   // насколько сцена ушла за левый / верхний край места
    const bx = left - ox, by = top - oy;   // положение сцены при прокрутке 0
    // 23.10 (с телефона, Тренер): лишние несколько пикселей (сцена чуть шире / выше места) — не прокрутка, а обрезка: раньше зал
    // «дрожал» вбок на 2–20 px, как будто сломан
    const sx0 = Math.max(0, Math.max(bx + w - x1, -ox)), sy0 = Math.max(0, Math.max(by + h - y1, -oy));
    const sx = sx0 < 24 ? 0 : sx0, sy = sy0 < 24 ? 0 : sy0;   // сколько прокручивать
    const pan = sx > 1 || sy > 1;
    if (rs) { rs.classList.toggle('cy-pan', pan); rs.style.overflowX = pan && !sx ? 'hidden' : ''; rs.style.overflowY = pan && !sy ? 'hidden' : ''; }   // листается только туда, где есть что листать
    if (!pan || !rs || !sz) {
      if (sz) { sz.style.width = '0'; sz.style.height = '0'; }
      inn.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) scale(${k.toFixed(4)})`;
      return;
    }
    sz.style.width = Math.ceil(vw + sx) + 'px'; sz.style.height = Math.ceil(vh + sy) + 'px';
    inn.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) scale(${k.toFixed(4)})`;
    if (!C.S.roomUser) { rs.scrollLeft = Math.round(-ox); rs.scrollTop = Math.round(-oy); }   // пока зритель сам не листал — прежний вид
  }
  // лавка на весь экран: ПК и телефон боком — вся сцена целиком, телефон стоя — по высоте места под шапкой, вбок — прокрутка
  /* 23.10 (с телефона стримера): сцена — ПОД шапкой лавки (название, «Выйти», кошелёк, сумка — раньше закрывали
     таблички стендов «Котоармеец», «Рогаточник»…). ПК и телефон боком — вся сцена в окне (по меньшей стороне, края — цветом стены).
     Телефон стоя — по высоте места под шапкой, вбок — прокрутка внутри лавки (как в Будуаре котиков — она удобная); но колонка товара
     (стенд Кузни / магической лавки, кабинка Шатра) не шире экрана: шире — сцена мельче, чтобы колонка влезала целиком, по вертикали — по центру
     (пустота — цветом стены), и листание останавливается на колонках (scroll-snap). Щипок / Ctrl+колесо — приблизить товар (C.S.roomZ). */
  function roomHead(r) {
    const rr = r.getBoundingClientRect(); let b = 0;
    for (const el of r.querySelectorAll('.cy-rh, .cy-rui.cy-rbar .cy-bar2')) { const q = el.getBoundingClientRect(); if (q.height) b = Math.max(b, q.bottom - rr.top); }
    return Math.round(b + 6);
  }
  // колонки товара в сцене (x0…x1, координаты 1920×1080): стенды Кузни и магической лавки (stands). Шатёр (кабинки) и Лавка — как были
  function roomCols(id) {
    const pos = C.S.itemPos || {}, st = stockOf(id) || {}, groups = [];
    const at = (list) => (list || []).map((it) => it && pos[it.id]).filter(Boolean);
    for (const s of st.stands || []) groups.push(at([...(s.top || []), ...(s.mid || []), ...(s.case || [])]));
    const cols = groups.filter((g) => g.length).map((g) => [Math.min(...g.map((p) => p.x)) - 150, Math.max(...g.map((p) => p.x)) + 150]);
    return cols.map(([a, b]) => [Math.max(0, a), Math.min(1920, b)]).sort((a, b) => a[0] - b[0]);
  }
  function fitFull(r, inn, vw, vh, mob, R) {
    const rs = r.querySelector('.cy-rs'), sz = r.querySelector('.cy-rsz');
    const bg = (C.S.L.rooms && C.S.L.rooms[C.S.panelId] && C.S.L.rooms[C.S.panelId].artBg) || ((r.querySelector('.cy-rbg rect[width="1920"]') || { getAttribute: () => '' }).getAttribute('fill')) || '#15122e';
    r.classList.add('cy-fit'); r.style.setProperty('--cy-fitbg', /^#[\da-f]{3,8}$/i.test(bg) ? bg : '#15122e');
    const head = roomHead(r), avail = Math.max(120, vh - head), zr = C.S.roomZ || 1;
    const port = mob && vh > vw;
    let k, cols = [];
    if (port) {
      k = Math.max(avail / 1080, vw / 1920);
      cols = roomCols(C.S.panelId);
      const cw = cols.length ? Math.max(...cols.map((c) => c[1] - c[0])) : 0;
      if (cw && cw * k > vw - 12) k = Math.max(vw / 1920, (vw - 12) / cw);
    } else k = Math.min(vw / 1920, avail / 1080);
    const k0 = k; k *= zr;
    const w = 1920 * k, h = 1080 * k;
    const left = w < vw ? (vw - w) / 2 : 0, top = head + Math.max(0, (avail - h) / 2);
    const pan = w > vw + 1 || top + h > vh + 1;
    if (rs) { rs.classList.toggle('cy-pan', pan); rs.classList.toggle('cy-snap', port && zr === 1 && cols.length > 1); }
    if (sz) { sz.style.width = (pan ? Math.ceil(Math.max(vw, left + w)) : 0) + 'px'; sz.style.height = (pan ? Math.ceil(Math.max(vh, top + h)) : 0) + 'px'; }
    inn.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) scale(${k.toFixed(4)})`;
    C.S.roomK = { k, k0, left, top };
    // точки остановки листания — середины колонок (телефон стоя)
    if (rs) { let sn = rs.querySelector('.cy-snaps'); if (!sn) { sn = document.createElement('div'); sn.className = 'cy-snaps'; sn.setAttribute('aria-hidden', 'true'); rs.appendChild(sn); }
      sn.innerHTML = port && zr === 1 ? cols.map(([a, b]) => `<i style="left:${Math.round(left + a * k)}px;width:${Math.round((b - a) * k)}px"></i>`).join('') : ''; }
    if (rs && C.S.roomScroll == null) { C.S.roomScroll = 1; rs.scrollLeft = port && cols.length ? Math.max(0, Math.round(cols[0][0] * k - (vw - (cols[0][1] - cols[0][0]) * k) / 2)) : 0; rs.scrollTop = 0; }   // товар — слева (первая колонка целиком)
  }
  // 23.10: зум внутри лавки — щипок двумя пальцами / Ctrl+колесо: масштаб вокруг точки, сцена листается в обе стороны (1…3×)
  function roomZoom(z, cx, cy) {
    const rs = C.S.room.querySelector('.cy-rs'), K = C.S.roomK; if (!rs || !K) return;
    z = Math.max(1, Math.min(3, z)); if (Math.abs(z - (C.S.roomZ || 1)) < 0.005) return;
    const rr = rs.getBoundingClientRect(), mx = cx - rr.left, my = cy - rr.top;
    const sx = (rs.scrollLeft + mx - K.left) / K.k, sy = (rs.scrollTop + my - K.top) / K.k;   // точка сцены под пальцами
    C.S.roomZ = z; C.S.roomUser = true; fitRoom();
    const N = C.S.roomK; rs.scrollLeft = Math.round(sx * N.k + N.left - mx); rs.scrollTop = Math.round(sy * N.k + N.top - my);
  }
  function roomPinch(rs) {
    let P = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    rs.addEventListener('touchstart', (e) => { if (e.touches.length === 2) P = { d: dist(e.touches), z: C.S.roomZ || 1 }; }, { passive: true });
    rs.addEventListener('touchmove', (e) => { if (!P || e.touches.length !== 2 || !C.S) return; e.preventDefault(); roomZoom(P.z * dist(e.touches) / P.d, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2); }, { passive: false });
    rs.addEventListener('touchend', (e) => { if (e.touches.length < 2) P = null; }, { passive: true });
    // ПК: колесо над сценой лавки — зум (24.10, как на улице); Shift+колесо — листать вбок; Ctrl+колесо / щипок тачпада — зум
    rs.addEventListener('wheel', (e) => {
      if (!C.S || !FULL[C.S.panelId] || !C.S.roomK || e.shiftKey || (!(e.ctrlKey || e.metaKey) && Math.abs(e.deltaX) > Math.abs(e.deltaY))) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      roomZoom((C.S.roomZ || 1) * Math.exp(-Math.max(-120, Math.min(120, dy)) * (e.ctrlKey || e.metaKey ? 0.01 : 0.0018)), e.clientX, e.clientY);
    }, { passive: false });
  }
  window.addEventListener('resize', () => fitRoom());
  // 22.10: воровская наценка (app.js → window.LGThief); без неё — как раньше
  const TH = { k: (h) => (window.LGThief ? window.LGThief.k(h) : 1), price: (h, b) => (window.LGThief ? window.LGThief.price(h, b) : b), note: (h) => (window.LGThief ? window.LGThief.note(h) : ''), arm: (b, h, base) => (window.LGThief ? window.LGThief.arm(b, h, base) : true) };
  /* ----- 23.10: лавки «Города» — товар на полках (Кузня, магическая лавка, амулеты Шатра) и на прилавке Лавки -----
     Наведение мыши (ПК) или нажатие (телефон) — карточка вещи (общая карточка сайта C.X.itemBody: характеристики, новые — только кому открыты,
     класс, тип брони, описание) и цена. Двойной клик или второе нажатие — табличка «Купить … за …? Да / Нет»; без «Да» ничего не покупается.
     Покупки за монеты (cs у героя: cityShopPublic или тестер) — в любое время, и без стрима (очередь действий сайта → комната канала:
     modules/site/server.js → cityBuyOp). Нет cs — в табличке «Купить можно на стриме» (за баллы канала). Облик Шатра — только за баллы. */
  const WEARS = ['weapon', 'armor', 'shield', 'helmet', 'trinket'];
  // товар места: у кого открыта магическая лавка — Кузня и Шатёр без её товара (forgeM / tentM)
  const stockOf = (id) => { if (!STOCK) return null; if (id === 'magic') return STOCK.magic || null; if (id === 'forge') return (msOn() && STOCK.forgeM) || STOCK.forge || null; if (id === 'tent') return (msOn() && STOCK.tentM) || STOCK.tent || null; if (id === 'shop') return STOCK.rows || null; return null; };
  const goodsOf = (id, st) => (!st ? [] : id === 'tent' ? st.amulets || [] : id === 'shop' ? [...(st.potions || []), ...(st.food || [])] : [...(st.shelf1 || []), ...(st.shelf2 || []), ...(st.case || []), ...(st.mats || [])]);
  const matCoins = (it) => { const E = C.X.ench ? C.X.ench() : null; return it.mat && E && E.coins ? +E.coins[it.mat] || 0 : 0; };
  // цена в монетах (с воровской наценкой) — 0: за монеты не продаётся (звёзды и сферы — пока заточка закрыта)
  // 23.10: город чужого округа (quest/towns.js): цена ×k, лучшие сделки (эпические и легендарные, верхний ряд стендов) и материалы заточки закрыты
  const coinsFor = (it, h) => { const b = it.mat ? (h && h.ef ? matCoins(it) : 0) : +it.coins || 0; return b > 0 ? Math.round(TH.price(h, b) * (it.mat ? 1 : foreignK())) : 0; };
  const topIds = () => { const o = new Set(); for (const k of ['forge', 'forgeM', 'magic']) for (const x of ((STOCK && STOCK[k] && STOCK[k].stands) || [])) for (const it of x.top || []) o.add(it.id); return o; };
  const lockedHere = (it) => foreignK() > 1 && !homeHere() && !!it && (!!it.mat || ['epic', 'legendary'].includes(it.rarity) || topIds().has(it.id));
  const LOCK_T = 'Откроется после захвата';
  const plainMoney = (n) => { const d = document.createElement('div'); d.innerHTML = C.X.money(n); return d.textContent.replace(/\s+/g, ' ').trim(); };
  const shortMoney = (n) => { n = Math.max(0, Math.floor(+n || 0)); const g = Math.floor(n / 10000), s2 = Math.floor(n / 100) % 100, b = n % 100; return [g && g + 'з', s2 && s2 + 'с', (b || (!g && !s2)) && b + 'м'].filter(Boolean).join(' '); };
  // рисунок полок с ценами в монетах (кому покупки за монеты открыты); иначе — баллы, как на стриме
  function shopView(id, st) {
    if (!st || !csOn()) return st;
    const h = C.X.hero(), conv = (it) => { if (it && it.out) return { ...it, priceText: 'Закончились' };   // 27.10: звёзды и сферы закончились (enchantMatsOut)
      if (lockedHere(it)) return { ...it, priceText: '🔒' }; const c = coinsFor(it, h); return c ? { ...it, price: c, priceText: shortMoney(c) } : it; };
    // 29.10 (Шахта 3.0, шаг 5): в городе с Ратушей нового образца товар - по уровню здания (towngen.goodsOk): лучше здание - больше вещей, эпик - на ур. 5
    const lvB = inTown() && C.TOWN.meta && C.TOWN.meta.lv3 && window.LGTownGen && window.LGTownGen.goodsOk ? +((C.TOWN.meta.levels || {})[id] || 1) : 0;
    const keep = (it) => !lvB || !it || it.mat || window.LGTownGen.goodsOk(it.id, it.rarity, lvB);
    const L2 = (a) => (a || []).filter(keep).map(conv);
    return { ...st, stands: (st.stands || []).map((x) => ({ ...x, top: L2(x.top), mid: L2(x.mid), case: L2(x.case) })), shelf1: L2(st.shelf1), shelf2: L2(st.shelf2), case: L2(st.case), mats: L2(st.mats), amulets: L2(st.amulets) };
  }
  // 25.10: названия редкостей и слотов - из данных игры (packages/game-data), как в сумке сайта (было своё «Броня» вместо «Доспех»)
  const RAR_RU = window.LGGameData.rarityNames();
  const SLOT_RU = window.LGGameData.slotNames();
  const placeName = (b) => (b === 'magic' ? (msOn() ? String(C.X.hero().ms) : 'магической лавке') : b === 'tent' ? 'Шатре' : b === 'shop' ? 'Торговых рядах' : 'Кузне');
  function cardHtml(it, b, h) {
    // характеристики и описание — общая подсказка-карточка сайта (app.js cardTip у вещи); здесь — цена и покупка
    const nm = C.X.itemName(it.id) || it.name, c = coinsFor(it, h), body = C.X.cardTip ? '' : (it.desc ? `<p class="d-desc">${esc(it.desc)}</p>` : '');
    const k = TH.k(h);
    const price = lockedHere(it) ? `<p class="cy-icp pts">🔒 ${LOCK_T}</p>` : csOn() && c ? `<p class="cy-icp">${C.X.money(c)}${k > 1 ? ` <small class="thiefl">для вора ×${String(k).replace('.', ',')}</small>` : ''}${foreignK() > 1 ? ` <small class="thiefl">${homeHere() ? 'край' : 'чужой округ'} ×${String(foreignK()).replace('.', ',')}</small>` : ''}</p>`
      : `<p class="cy-icp pts">${it.price ? (+it.price).toLocaleString('ru-RU') + ' баллов канала' : ''} <small>на стриме, в ${esc(placeName(b))}${it.rank ? `, звание не ниже «${esc(it.rank)}»` : ''}</small></p>`;
    return `<div class="cy-ich"><b data-r="${esc(it.rarity || 'common')}">${esc(nm)}</b><small>${RAR_RU[it.rarity] || ''}${SLOT_RU[it.slot] ? ' · ' + SLOT_RU[it.slot] : ''}</small></div>${body}${price}<p class="cy-ichint">${touchy() ? 'Нажми на вещь ещё раз — купить' : 'Двойной клик — купить'}</p><button type="button" class="btn primary sm wide cy-icbuy" data-cardbuy>Купить…</button>`;
  }
  const touchy = () => !!((C.S && C.S.touch) || window.LGSiteUi.is('nohover'));
  // подсказка под интерфейсом места: как покупать (и воровская наценка)
  const goodsHelp = (h) => `<p class="note cy-gh">${csOn() ? 'Покупки — за монеты героя, в любое время: двойной клик по товару (на телефоне — нажми дважды) и «Да».' : 'Купить можно на стриме, за баллы канала. Здесь — посмотреть, что даёт вещь (наведи или нажми).'}</p>${csOn() ? TH.note(h) : ''}`;
  let GSEL = null;   // выбранный товар: { b, id }
  const card = () => { let c = C.S.room.querySelector('.cy-icard'); if (!c) { c = document.createElement('div'); c.className = 'cy-icard panel'; c.setAttribute('role', 'tooltip'); C.S.room.appendChild(c); } return c; };
  function cardShow(el, it, b, pinned) {
    const h = C.X.hero();
    if (C.X.cardTip) { try { C.X.cardTip(el, tipItem(it), h); } catch (e) {} }   // характеристики — общей карточкой рядом с вещью
    if (!pinned && C.X.cardTip) return;
    const c = card(); c.innerHTML = cardHtml(it, b, h); c.classList.add('on'); c.classList.toggle('pin', !!pinned);
    const cb = c.querySelector('[data-cardbuy]'); if (cb) cb.onclick = () => buyAsk(it, b, el);
    if (pinned) { const x = document.createElement('button'); x.type = 'button'; x.className = 'cy-icx'; x.setAttribute('aria-label', 'Закрыть'); x.textContent = '×'; x.onclick = (e) => { e.stopPropagation(); unselect(); }; c.appendChild(x); }   // 23.10: закрыть карточку   // выбранная вещь — и кнопкой (телефон, клавиатура)
    // цена и «Купить…» — внизу слева (ПК) или внизу (телефон): не на полках и не поверх общей карточки у вещи
    const rr = C.S.room.getBoundingClientRect(), w = c.offsetWidth;
    c.style.top = 'auto'; c.style.bottom = rr.width <= 720 ? '8px' : '16px'; c.style.left = (rr.width <= 720 ? Math.max(8, (rr.width - w) / 2) : 16) + 'px';
  }
  const cardHide = () => { const c = C.S && C.S.room && C.S.room.querySelector('.cy-icard'); if (c && !c.classList.contains('pin')) c.classList.remove('on'); };
  const cardDrop = () => { if (C.X && C.X.tipHide) C.X.tipHide(); const c = C.S && C.S.room && C.S.room.querySelector('.cy-icard'); if (c) c.classList.remove('on', 'pin'); };
  const tipItem = (it) => ({ ...it, name: C.X.itemName(it.id) || it.name, stats: it.stats || {}, wearable: WEARS.includes(it.slot), on: false, uids: [] });
  const findGood = (b, id) => goodsOf(b, stockOf(b)).find((x) => x.id === id) || null;
  // одна кнопка товара: наведение — карточка, нажатие — выбрать (второе нажатие или двойной клик — «Купить?»)
  function bindGood(el, b, id) {
    // наведение мыши — общая подсказка-карточка сайта (app.js cardTip, как у склада и наковальни); выбранная вещь — своя карточка с ценой и «Купить…»
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || !C.S || C.S.panelId == null || buyOpen() || (GSEL && GSEL.id === id)) return; const it = findGood(b, id); if (!it) return; if (C.X.cardTip) C.X.cardTip(el, tipItem(it), C.X.hero()); else cardShow(el, it, b, false); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; if (C.X.tipHide) C.X.tipHide(); if (!(GSEL && GSEL.id === id)) cardHide(); });
    el.addEventListener('click', () => {
      const it = findGood(b, id); if (!it) return; if (C.X.tipHide) C.X.tipHide();
      if (GSEL && GSEL.id === id && GSEL.b === b) { buyAsk(it, b, el); return; }
      GSEL = { b, id }; C.S.room.querySelectorAll('.cy-hot.on, .cy-good.on').forEach((x) => x.classList.remove('on')); el.classList.add('on'); cardShow(el, it, b, true);
    });
    el.addEventListener('dblclick', (e) => { e.preventDefault(); const it = findGood(b, id); if (it && !buyOpen()) buyAsk(it, b, el); });
  }
  // кнопки поверх полок сцены (в координатах сцены — масштабируются вместе с ней)
  function goodsHots(id) {
    GSEL = null; cardDrop(); buyClose();
    const inn = C.S.room.querySelector('.cy-rin'); if (!inn) return;
    const old = inn.querySelector('.cy-hots'); if (old) old.remove();
    if (!(id === 'forge' || id === 'magic' || id === 'tent' || id === 'shop')) return;
    const st = stockOf(id), h = C.X.hero();
    if (id === 'shop' && FULL.shop) { shopTiles(inn, st, h); return; }
    const pos = C.S.itemPos || {}, list = goodsOf(id, st).filter((it) => pos[it.id]);
    if (id === 'tent' && FULL.tent) tentHots(inn, st, pos);
    if (!list.length) return;
    const box = document.createElement('div'); box.className = 'cy-hots';
    box.innerHTML = list.map((it) => { const p = pos[it.id], c = coinsFor(it, h); return `<button type="button" class="cy-hot${lockedHere(it) ? ' lock' : ''}" data-good="${esc(it.id)}" style="left:${Math.round(p.x - 64)}px;top:${Math.round(p.y - 92)}px" aria-label="${esc(C.X.itemName(it.id) || it.name)} — ${csOn() && c ? esc(plainMoney(c)) : 'купить на стриме'}"></button>`; }).join('');
    inn.appendChild(box);
    box.querySelectorAll('[data-good]').forEach((el) => bindGood(el, id, el.dataset.good));
    olHots(box);
  }
  /* 23.10 (баг от зрителя): кнопка товара — ровно по рисунку вещи на сцене (раньше — 128×210 от точки itemPos: залезала на ценники полки выше),
     наведение / фокус — контур вещи (.cy-olh), выбранная (.on) — контур ярче (.cy-olo). Толщина — по масштабу сцены: на телефоне тоже видно.
     У стиля нет группы data-it — кнопка как была, мягкий свет (city.css) */
  const dIt = (id) => String(id).replace(/[^\w:.-]/g, '_');
  function olHots(box) {
    const svg = C.S && C.S.room && C.S.room.querySelector('.cy-rbg'); if (!svg || !box.isConnected) return;
    const k = () => { const r = svg.getBoundingClientRect(); return r.width > 0 ? r.width / 1920 : 0; };
    const olR = () => { const kk = k(); if (!kk) return; const r = Math.min(9, Math.max(3, 2.6 / kk)); svg.querySelectorAll('#cy-itol .cy-olm, #cy-itol2 .cy-olm').forEach((m, i) => m.setAttribute('radius', (i ? r * 1.35 : r).toFixed(1))); };
    // рисунок вещи (в координатах сцены) ∩ прежняя зона кнопки: у человечков-образцов рамка рисунка огромная (вложенные svg) — тогда зона как была
    const place = () => {
      const kk = k(), sr = svg.getBoundingClientRect(); if (!kk) return;
      box.querySelectorAll('.cy-hot.ol').forEach((el) => {
        const r = el._ol.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return;
        const d = el._z || (el._z = [el.offsetLeft, el.offsetTop, el.offsetLeft + el.offsetWidth, el.offsetTop + el.offsetHeight]), p = 8;
        let L = Math.max(d[0], (r.left - sr.left) / kk - p), T = Math.max(d[1], (r.top - sr.top) / kk - p), R = Math.min(d[2], (r.right - sr.left) / kk + p), B = Math.min(d[3], (r.bottom - sr.top) / kk + p);
        if (R - L < 24 || B - T < 24) return;   // рисунок не там, где кнопка — не трогаем
        const mw = Math.min(56, d[2] - d[0]), mh = Math.min(56, d[3] - d[1]);   // мелкую вещь — не меньше 56
        if (R - L < mw) { const c = (L + R) / 2; L = c - mw / 2; R = c + mw / 2; }
        if (B - T < mh) { const c = (T + B) / 2; T = c - mh / 2; B = c + mh / 2; }
        Object.assign(el.style, { left: Math.round(L) + 'px', top: Math.round(T) + 'px', width: Math.round(R - L) + 'px', height: Math.round(B - T) + 'px' });
      });
    };
    box.querySelectorAll('[data-good], [data-smp]').forEach((el) => {
      const g = svg.querySelector(`[data-it="${dIt(el.dataset.good || el.dataset.smp).replace(/["\\]/g, '')}"]`), a = g && g.querySelector(':scope > [data-ia]');
      if (!a) return;
      el._ol = a; el.classList.add('ol');
      const hl = (on) => { if (on) olR(); g.classList.toggle('cy-olh', on); };
      el.addEventListener('pointerenter', () => hl(true)); el.addEventListener('pointerleave', () => hl(false));
      el.addEventListener('focus', () => hl(true)); el.addEventListener('blur', () => hl(false));
    });
    // выбор (.on) ставят и снимают в разных местах (bindGood, unselect, кабинки Шатра) — следим за классом кнопок
    const sync = () => box.querySelectorAll('.cy-hot.ol').forEach((el) => { const g = el._ol.parentNode, on = el.classList.contains('on'); if (on) olR(); if (g.classList.contains('cy-olo') !== on) g.classList.toggle('cy-olo', on); });
    new MutationObserver(sync).observe(box, { subtree: true, attributes: true, attributeFilter: ['class'] });
    place(); olR(); if (!k()) requestAnimationFrame(() => { place(); olR(); });
  }
  // карточка рядом с местом (ПК) или внизу (телефон)
  function cardPlace(c, el) {
    const rr = C.S.room.getBoundingClientRect(), r = el.getBoundingClientRect(), w = c.offsetWidth, hh = c.offsetHeight;
    if (rr.width <= 720) { c.style.left = Math.max(8, (rr.width - w) / 2) + 'px'; c.style.top = 'auto'; c.style.bottom = '8px'; return; }
    c.style.bottom = ''; let x = r.right - rr.left + 10; if (x + w > rr.width - 8) x = r.left - rr.left - w - 10;
    c.style.left = Math.max(8, x) + 'px'; c.style.top = Math.max(64, Math.min(rr.height - hh - 8, r.top - rr.top + r.height / 2 - hh / 2)) + 'px';
  }
  const buyOpen = () => !!(C.S && C.S.room && C.S.room.querySelector('.cy-buyq'));
  function buyClose() { const q = C.S && C.S.room && C.S.room.querySelector('.cy-buyq'); if (q) q.remove(); }
  // 23.10 (баг зрителя): после «Понятно» / «Нет» карточка выбранного товара оставалась и закрывала полки — снимаем выбор целиком
  // нажатие мимо товара, карточки и таблички «Купить?» — выбор снимается (карточка не закрывает полки)
  document.addEventListener('pointerdown', (e) => { if (!GSEL || !C.S || !C.S.room || C.S.room.hidden) return; if (e.target.closest && e.target.closest('.cy-icard, .cy-hot, .cy-good, .cy-buyq')) return; unselect(); }, { capture: true, passive: true });
  function unselect() { buyClose(); cardDrop(); GSEL = null; if (C.S && C.S.room) C.S.room.querySelectorAll('.cy-hot.on, .cy-good.on').forEach((x) => x.classList.remove('on')); }
  // «Купить … за …? Да / Нет»; покупки на сайте закрыты (или за монеты не продаётся) — «Купить можно на стриме»
  function buyAsk(it, b, from, matBase) {
    buyClose();
    const h = C.X.hero(), nm = C.X.itemName(it.id) || it.name;
    if (lockedHere(it)) {   // 23.10: чужой округ — лучшие сделки закрыты (сервер тоже не продаст)
      const q = document.createElement('div'); q.className = 'cy-buyq'; q.setAttribute('role', 'dialog'); q.setAttribute('aria-modal', 'true'); q.setAttribute('aria-label', 'Покупка');
      q.innerHTML = `<div class="cy-buyb panel"><p class="lead">🔒 «${esc(nm)}» — ${LOCK_T.toLowerCase()}</p><p class="note">Этот округ не принадлежит каналу: лучшие вещи торговец бережёт для своих. Захватите округ на стриме — откроется всё и по обычной цене.</p><div class="cy-buyr"><button type="button" class="btn primary" data-no>Понятно</button></div></div>`;
      C.S.room.appendChild(q); const no = q.querySelector('[data-no]'); no.onclick = () => { unselect(); try { from && from.focus(); } catch {} }; q.addEventListener('click', (e) => { if (e.target === q) unselect(); }); try { no.focus(); } catch {}
      return;
    }
    const mb = matBase || (it.mat ? matCoins(it) : 0), c = it.mat ? (h && h.ef && mb ? TH.price(h, mb) : 0) : coinsFor(it, h);
    const can = it.look !== true && !!h && (it.mat ? !!(h.ef && c) : csOn() && c > 0);   // облик (кабинки Шатра) — только за баллы на стриме
    // 29.10: расходники (еда, зелья) - сразу N штук, если открыто (h.bq - предел за раз); не больше, чем хватает монет
    const qmax = !it.mat && h && +h.bq > 1 && c > 0 && (b === 'shop' || it.slot === 'food' || it.slot === 'potion') ? Math.max(1, Math.min(+h.bq, Math.floor((+h.money || 0) / c))) : 1;
    let qn = 1;
    const q = document.createElement('div'); q.className = 'cy-buyq'; q.setAttribute('role', 'dialog'); q.setAttribute('aria-modal', 'true'); q.setAttribute('aria-label', 'Покупка');
    // 24.10 (баг тестера): не хватает — две строки обычным текстом: «У тебя: …» и «Не хватает: …» (единицы — как у цены)
    const poor = !!h && !h.ghost && (+h.money || 0) < c;
    const why = !h ? 'Героя пока нет.' : h.ghost ? 'Призраку не продают.' : poor ? 'Не хватает монет' : '';
    q.innerHTML = `<div class="cy-buyb panel">${can
      ? `<p class="lead">Купить «${esc(nm)}» за <span data-qt>${C.X.money(c)}</span>?</p>${qmax > 1 ? `<div class="cy-qty" role="group" aria-label="Сколько штук"><button type="button" class="btn ghost" data-q="-1" aria-label="Меньше">−</button><b data-qn aria-live="polite">1</b><button type="button" class="btn ghost" data-q="1" aria-label="Больше">+</button><small>шт., до ${qmax}</small></div>` : ''}${TH.k(h) > 1 ? `<p class="note thiefl">Для тебя за воровство цена ×${String(TH.k(h)).replace('.', ',')}.</p>` : ''}${why && !poor ? `<p class="note cy-warn">${why}</p>` : h && C.X.bal ? C.X.bal(c, h.money, 'cy-lack') : poor ? `<p class="note cy-warn">${why}</p>` : ''}<div class="cy-buyr"><button type="button" class="btn primary" data-yes${why ? ' disabled' : ''}>Да</button><button type="button" class="btn ghost" data-no>Нет</button></div>`
      : `<p class="lead">«${esc(nm)}» — купить можно на стриме</p><p class="note">${it.look === true ? `Облик — только за баллы канала: на стриме, в Шатре, ${(+it.price || 0).toLocaleString('ru-RU')} баллов.` : it.price && !it.mat ? `В ${esc(placeName(b))} на Ярмарке за ${(+it.price).toLocaleString('ru-RU')} баллов канала.` : it.mat ? 'На стриме — за баллы канала; за монеты — когда откроется заточка.' : 'На Ярмарке во время стрима.'}</p><div class="cy-buyr"><button type="button" class="btn primary" data-no>Понятно</button></div>`}</div>`;
    C.S.room.appendChild(q);
    const no = q.querySelector('[data-no]'), yes = q.querySelector('[data-yes]');
    q.querySelectorAll('[data-q]').forEach((bt) => bt.onclick = () => { qn = Math.max(1, Math.min(qmax, qn + +bt.dataset.q)); q.querySelector('[data-qn]').textContent = String(qn); q.querySelector('[data-qt]').innerHTML = C.X.money(c * qn); });
    q.addEventListener('click', (e) => { if (e.target === q) unselect(); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); unselect(); try { from && from.focus(); } catch {} } });
    no.onclick = () => { unselect(); try { from && from.focus(); } catch {} };
    if (yes) yes.onclick = () => {
      buyClose(); cardDrop(); GSEL = null;
      const btn = from && from.classList && from.classList.contains('btn') ? from : null;   // кнопка товара на полке — без «Секунду…» в ней
      if (it.mat) C.X.act('/api/buymat', { mat: it.mat, ...(TH.k(h) > 1 ? { ack: 1 } : {}) }, `Заказано: «${nm}» — принесут через пару секунд`, btn);
      else C.X.act('/api/cityBuy', { item: it.id, price: c, ...(qn > 1 ? { n: qn } : {}), ...(inTown() ? { town: C.TOWN.id } : {}) }, `Куплено: «${nm}»${qn > 1 ? ` ×${qn}` : ''} — сейчас будет в сумке`, btn);
    };
    try { (yes || no).focus(); } catch {}
  }
  // полоса лавки: кошелёк, сумка (склад: N / предел), воровская наценка, свои кнопки места
  function shopBar(h, extra) {
    if (!h) return `<div class="cy-bar2"><span class="cy-bnote">Героя пока нет — он появится, когда ты напишешь в чат на стриме.</span></div>`;
    const G = h.sg, n = (h.items || []).filter((x) => !x.on).length, k = TH.k(h);
    const bag = G ? `${G.used} / ${G.cap}` : String(n), full = !!(G && G.used >= G.cap);
    return `<div class="cy-bar2"><span class="cy-wal" title="Кошелёк героя">у тебя ${C.X.money(+h.money || 0)}</span><span class="cy-bagc${full ? ' full' : ''}" title="${full ? 'Сумка полна — разгрузи на склад' : 'Сумка'}">🎒 Сумка ${bag}</span>${k > 1 ? `<span class="cy-thk thiefl" title="Тебя ловили на краже — торговцы продают дороже">для тебя цены ×${String(k).replace('.', ',')}</span>` : ''}${foreignK() > 1 ? (homeHere() ? `<span class="cy-thk thiefl" title="Край отряда: пока не побеждён босс округа, торговцы продают дороже (продажа - как обычно)">край: цены ×${String(foreignK()).replace('.', ',')} до победы над боссом округа</span>` : `<span class="cy-thk thiefl" title="Округ не принадлежит каналу: лучшие вещи закрыты, остальное дороже">чужой округ: цены ×${String(foreignK()).replace('.', ',')}, лучшее — после захвата</span>`) : ''}${extra || ''}</div>`;
  }

  return {
    FULL, loadStock, stockOf, goodsOf, coinsFor, lockedHere, plainMoney, shortMoney, shopView, TH,
    get STOCK() { return STOCK; },
    // выбранный товар ({ b, id }): его ставят и снимают и здания (плитки Лавки, образцы Шатра)
    get GSEL() { return GSEL; }, set GSEL(v) { GSEL = v; },
    // зал
    roomSvg, doodSize, fitRoom, roomPinch,
    // товар на полках, карточка, «Купить?»
    goodsHots, bindGood, olHots, card, cardShow, cardHide, cardDrop, cardPlace, touchy, goodsHelp, buyAsk, buyOpen, buyClose, unselect, shopBar,
  };
  };
})();
