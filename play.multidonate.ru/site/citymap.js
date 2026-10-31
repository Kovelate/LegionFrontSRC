/* 20.10: «Город» на сайте — карта Ярмарки с новым кварталом слева: размеры, здания (двери), препятствия и поиск пути.
   Один файл и для страницы (window.LGCityMap), и для сервера/тестов (require): сервер проверяет точки шага, тесты — что путь
   не идёт сквозь препятствия.
   Мир: слева квартал (QW px: Ратуша, Аукцион, Тренер, Доска объявлений), справа — Ярмарка стиля канала как есть (styles/<стиль>/fair.js,
   3700 px), сдвинутая на QW. Высота — 1080, как у сцены Ярмарки. Ходят только по низу сцены (area), как гуляющие на стриме.
   Как добавить здание — legacy/md/docs/CITY.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LGCityMap = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const QW = 1800, FAIR_W = 3700, W = QW + FAIR_W, H = 1980;
  // 23.10 (просьба стримера: магическую лавку в дальнем углу не видно): у всех стилей Ярмарки (styles/*/fair.js — ROWS_DX, END_DX)
  // Торговые ряды сдвинуты вправо до края сцены, а конец рядов (башня звездочёта или тележка) — между Шатром и рядами
  const ROWS_DX = 270, END_DX = -1470;
  const FAIR_Y1 = 1062;   // низ полосы Ярмарки (как area у гуляющих на стриме) — по ней считается глубина (размер человечка)
  // 20.10: город ниже Ярмарки — нижняя улица (ещё ~экран): уступ с лестницами, канал с мостиками, лавочки, клумбы, фонари.
  // Ходят: полоса Ярмарки (y 800…1062) и нижняя улица; между ними — уступ (только по лестницам), канал — только по мостам.
  const AREA = { x0: 40, x1: W - 40, y0: 800, y1: 1900 };
  const WALL_L = 104;   // правый край угловой башни квартала (рисунок до 90) + полкорпуса человечка
  const LOW = {
    top: 1040,                                   // отсюда рисуется нижняя часть (уступ заходит на низ Ярмарки)
    edge: [1066, 1124],                          // уступ под Ярмаркой
    stairs: [[540, 720], [QW + 1020, QW + 1200], [QW + 2620, QW + 2800], [W - 560, W - 380]],
    canal: [1500, 1594],                         // канал (вода)
    bridges: [[1180, 1380], [QW + 560, QW + 760], [QW + 2160, QW + 2360], [QW + 3420, QW + 3620]],
    benches: [[1600, 1290], [QW + 300, 1310], [QW + 1500, 1300], [QW + 3000, 1290], [QW + 3700, 1310], [900, 1790], [QW + 1200, 1800], [QW + 2700, 1790]],
    beds: [[980, 1300], [QW + 900, 1290], [QW + 2400, 1300], [QW + 3300, 1780], [400, 1780], [QW + 1900, 1790]],
    // мелочи у подпорной стенки, у канала и у ограды (бочки, ящики, горшки; у стилей — свои: клубки, ящики с рыбой, бананы, тыквы)
    decor: [[1500, 1165], [2300, 1160], [2420, 1172], [3500, 1162], [4200, 1168], [4330, 1160], [5200, 1166],
      [620, 1690], [2100, 1700], [3200, 1690], [4600, 1695], [5300, 1700], [220, 1860], [1450, 1870], [2500, 1865], [3900, 1860], [4950, 1870]],
    statue: [QW + 1850, 1330],                   // памятник посреди нижней площади
    // 22.10: Склад — пристроен к подпорной стене слева от лестницы (x 80…500, основание 1340); там раньше стояли лавочка, клубок и ящик
    storage: { x0: 80, x1: 500, base: 1340 },
    mine: { x0: 1150, x1: 1470, base: 1336 },
    mineBed: [[980, 1300], [880, 1300]],   // 24.10: шахта открыта — клумба левее (не заходит на доску итогов)   // 23.10: вход в шахту (промысел города) — у подпорной стены, правее Склада (только кому шахта открыта)
    lamps: [[1140, 1460], [1420, 1460], [QW + 520, 1460], [QW + 800, 1460], [QW + 2120, 1460], [QW + 2400, 1460], [QW + 3380, 1460], [QW + 3660, 1460]],
    // 30.10 (тюрьма, legionary.jailPublic): у подпорной стены правее шахты - здание (x0…x1) и клетка (c0…c1, пол от стены до fy, прутья - fy,
    // проём дверцы - door); тупик у стены: дорогу, мосты, портал шахты и двери не закрывает, фонари моста - правее клетки. В клетке - два
    // ряда по 4 места (seats); две скамейки, что стояли там, - правее (move: было → стало)
    jail: { x0: 1540, x1: 1800, base: 1342, c0: 1830, c1: 2240, fy: 1352, door: [1985, 2055], seats: [[1890, 1262], [1980, 1262], [2070, 1262], [2160, 1262], [1935, 1318], [2025, 1318], [2115, 1318], [2195, 1318]],
      move: { benches: [[1600, 1290], [2330, 1300], [QW + 300, 1310], [QW + 760, 1310]], decor: [] } },
  };
  /** 30.10 (тюрьма): нижняя улица с тюрьмой - скамейка и бочки с её места сдвинуты (рисунок cityart.js и препятствия - одни). */
  const lowJail = () => {
    const mv = (list, pairs) => list.map(([x, y]) => { for (let i = 0; i < pairs.length; i += 2) if (pairs[i][0] === x && pairs[i][1] === y) return pairs[i + 1].slice(); return [x, y]; });
    return { ...LOW, benches: mv(LOW.benches, LOW.jail.move.benches), decor: mv(LOW.decor, LOW.jail.move.decor) };
  };
  // полосы-препятствия между проходами (уступ без лестниц, канал без мостов): [x0, y0, x1, y1]
  const gaps = (holes, y0, y1) => { const out = []; let x = 0; for (const [a, b] of holes) { if (a > x) out.push({ b: [x, y0, a, y1] }); x = b; } if (x < W) out.push({ b: [x, y0, W, y1] }); return out; };
  const lowerObst = (L) => [
    ...gaps(L.stairs, L.edge[0], L.edge[1]),
    ...gaps(L.bridges, L.canal[0], L.canal[1]).map((o) => ({ ...o, water: true })),
    ...L.benches.map(([x, y]) => ({ b: [x - 80, y - 26, x + 80, y + 6] })),
    ...L.beds.map(([x, y]) => ({ e: [x, y, 96, 30] })),
    ...L.lamps.map(([x, y]) => ({ e: [x, y, 12, 7] })),
    ...L.decor.map(([x, y]) => ({ e: [x, y, 40, 16] })),
    { e: [L.statue[0], L.statue[1], 110, 36] },
    { b: [L.storage.x0, L.edge[1], L.storage.x1, L.storage.base] },   // 22.10: Склад — от стены до основания (сквозь здание не ходят)
  ];
  const LOWER_OBST = lowerObst(LOW);
  // 30.10 (тюрьма): здание и клетка - от стены до основания (сквозь них не ходят)
  const JAIL_OBST = [{ b: [LOW.jail.x0, LOW.edge[1], LOW.jail.x1, LOW.jail.base] }, { b: [LOW.jail.c0 - 6, LOW.edge[1], LOW.jail.c1 + 6, LOW.jail.fy + 4] }];
  // препятствия Ярмарки «Легиона» (координаты Ярмарки, без сдвига) — для сервера и тестов; страница берёт их из стиля канала
  // e — эллипс (основание предмета), r — [x0, x1, y1]: от верха сцены до y1 (прилавки и торговцы — пройти можно только спереди)
  const FAIR_OBST = [
    { e: [990, 955, 120, 34] }, { e: [1270, 1058, 24, 12] }, { e: [1960, 998, 56, 14] },
    { r: [0, 305, 872] }, { r: [628, 740, 836] }, { r: [1585, 1722, 864] }, { r: [2004 + ROWS_DX, 3401 + ROWS_DX, 932] }, { r: [3462 + END_DX, FAIR_W + END_DX, 884], cart: true },
  ];
  const MAGIC_OBST = { r: [3436 + END_DX, 3694 + END_DX, 806] };   // 23.10: башня звездочёта (вместо тележки)
  // квартал слева (координаты города): фонтан (вода!), чучело у Тренера, фонари, ноги доски объявлений
  const QUARTER_OBST = [
    { e: [880, 934, 124, 46], water: true },   // фонтан посреди квартала — по воде не ходят (с запасом на чашу: ноги не на бортике)
    { e: [1236, 846, 30, 12] },                // тренировочное чучело
    { e: [1392, 836, 12, 7] }, { e: [1648, 836, 12, 7] },   // столбы доски объявлений
    { e: [440, 1000, 14, 8] },                 // фонарь
    // городская стена слева — край мира: угловая башня рисуется x −20…90 (cityart.js tower); 25.10 (баг стримера: герой стоял на стене
    // у таблички «СКОРО») — было до 60, и человечек шириной ~40 px заходил на башню. Теперь до 104: с запасом PAD ноги не ближе 114
    { r: [0, WALL_L, 1124] },
  ];
  // 25.10: «твёрдые» препятствия квартала и нижней улицы — одни у всех стилей и при любых открытых зданиях: стена-край мира, вода
  // (фонтан, канал без мостов), уступ без лестниц, Склад. По ним сервер (src/site/city.ts) не даёт встать в стену или в воду
  const HARD_OBST = [...QUARTER_OBST.filter((o) => o.r || o.water), ...gaps(LOW.stairs, LOW.edge[0], LOW.edge[1]),
    ...gaps(LOW.bridges, LOW.canal[0], LOW.canal[1]).map((o) => ({ ...o, water: true })), { b: [LOW.storage.x0, LOW.edge[1], LOW.storage.x1, LOW.storage.base] }];
  // здания: hit — где кликнуть (рисунок здания), door — куда идёт герой; soon — ещё строится (табличка «скоро»)
  const BUILDINGS = [
    { id: 'hall', title: 'Ратуша', sub: 'оборона города', icon: '🏰', soon: true, hit: [70, 420, 300, 800], door: { x: 245, y: 812 } },
    { id: 'auction', title: 'Аукцион', sub: 'торговля между игроками', icon: '⚖', soon: true, hit: [470, 830, 380, 800], door: { x: 650, y: 812 } },
    { id: 'trainer', title: 'Тренер', sub: 'дерево навыков', icon: '🎯', hit: [960, 1300, 360, 800], door: { x: 1110, y: 815 } },
    { id: 'board', title: 'Доска объявлений', sub: 'новости игры', icon: '📜', hit: [1360, 1680, 470, 840], door: { x: 1520, y: 860 } },
    // 22.10: Склад — на нижней улице у подпорной стены (вниз по лестнице у Аукциона); soon — пока склад не открыт (тестерам открыт: city.js)
    // 23.10: Шахта — портал в скале у подпорной стены; mine — только кому открыта (mn у героя): city.js открывает локацию шахты (mine.js)
    { id: 'mine', title: 'Шахта', sub: 'промысел города', icon: '⛏', mine: true, hit: [1150, 1470, 1050, 1336], door: { x: 1310, y: 1366 } },
    // 23.10: доска итогов шахты у входа: этаж недели, рекорд, лучшие копатели, итоги прошлой недели (mine.js → LGMine.board)
    { id: 'mineboard', title: 'Итоги шахты', sub: 'лучшие копатели', icon: '📋', mine: true, hit: [1062, 1148, 1150, 1330], door: { x: 1104, y: 1366 } },
    { id: 'storage', title: 'Склад', sub: 'хранение вещей', icon: '📦', soon: true, hit: [80, 500, 1050, 1340], door: { x: 290, y: 1368 } },
    // 30.10: Тюрьма - внутрь не войти; нажатие на здание или клетку - окно со списком заключённых (city.js). jail - только когда тюрьма открыта
    { id: 'jail', title: 'Тюрьма', sub: 'заключённые канала', icon: '⛓', jail: true, hit: [1540, 2240, 1060, 1352], door: { x: 1670, y: 1376 } },
    // 20.10: заточка — на улице, у наковальни под навесом Кузни (наковальня во всех fair.js — x 150, низ 810); раньше Кузни в списке —
    // клик по наковальне не уходит в Кузню. Внутри Кузни — только лавка кузнеца
    { id: 'anvil', title: 'Заточка', sub: 'наковальня у Кузни', icon: '🔨', fair: true, hit: [QW + 20, QW + 300, 600, 880], door: { x: QW + 250, y: 900 }, tag: [QW + 130, 552] },
    { id: 'forge', title: 'Кузня', sub: 'лавка кузнеца', icon: '⚒', fair: true, hit: [QW + 300, QW + 660, 230, 800], door: { x: QW + 582, y: 880 } },
    { id: 'gate', title: 'Ворота', sub: 'в поход — только на стриме', icon: '🚩', fair: true, hit: [QW + 760, QW + 1160, 150, 730], door: { x: QW + 960, y: 820 } },
    { id: 'tent', title: 'Шатёр', sub: 'облик', icon: '🎩', fair: true, hit: [QW + 1240, QW + 1760, 220, 800], door: { x: QW + 1530, y: 880 } },
    { id: 'shop', title: 'Лавка', sub: 'еда, зелья, материалы', icon: '🧺', fair: true, hit: [QW + 2000 + ROWS_DX, QW + 3420 + ROWS_DX, 300, 932], door: { x: QW + 2705 + ROWS_DX, y: 960 } },
    // 23.10: магическая лавка — башня звездочёта между Шатром и Торговыми рядами (там же, где на стриме; вместо тележки). magic — только у кого она
    // открыта (magicShopPublic или тестер: ms у героя); название — у героя (ms), здесь — по умолчанию. Дверь — перед тележкой (стоять можно и с ней)
    { id: 'magic', title: 'Лавка звездочёта', sub: 'посохи, мантии, амулеты', icon: '🔮', fair: true, magic: true, hit: [QW + 3436 + END_DX, QW + 3694 + END_DX, 150, 800], door: { x: QW + 3565 + END_DX, y: 900 } },
  ];
  // 20.10: отдельные точки наведения/клика внутри зданий (подсветка при наведении — city.js): у «Заточки» — наковальня,
  // табличка под навесом и кузнец (у всех стилей одно место: fair.js — наковальня x 150, кузнец x 226, низ 830). r — [x0, x1, y0, y1];
  // ol — какую группу рисунка обводить (data-ol в fair.js / cityart.js; у зданий — их id)
  const HOT = [
    { b: 'anvil', what: 'Наковальня', ol: 'anv', r: [QW + 70, QW + 215, 728, 818] },
    { b: 'anvil', what: 'Табличка', ol: 'sign', r: [QW + 34, QW + 226, 566, 666] },
    { b: 'anvil', what: 'Кузнец', ol: 'smith', r: [QW + 165, QW + 290, 638, 836] },
  ];
  const SCALE = { min: 0.46, range: 0.3 };   // размер человечка: как на Ярмарке (у верхнего края полосы — min, у нижнего — min+range)
  const scaleAt = (y) => SCALE.min + Math.max(0, Math.min(1, (y - AREA.y0) / (FAIR_Y1 - AREA.y0))) * SCALE.range;   // ниже Ярмарки — уже в полный рост
  const SPEED = 230;   // px сцены в секунду (у всех одинаково — клиенты сами анимируют путь до цели)

  /** Препятствия Ярмарки (координаты Ярмарки) → координаты города. */
  function shift(list, dx) {
    return (list || []).map((o) => (o.e ? { e: [o.e[0] + dx, o.e[1], o.e[2], o.e[3]], water: !!o.water } : o.r ? { r: [o.r[0] + dx, o.r[1] + dx, o.r[2]] } : null)).filter(Boolean);
  }

  /**
   * Карта для поиска пути. fairObst — препятствия Ярмарки стиля (L.obstacles), без них — «Легиона».
   * Сетка проходимости 16 px; человечку нужен запас PAD от края препятствия (ноги не в стене).
   */
  // o.magic — у зрителя открыта магическая лавка: её здание есть (и кликается), тележки с сеном нет (её препятствие — у стиля: cart)
  function make(fairObst, o) {
    const mg = !!(o && o.magic), mn = !!(o && o.mine), FO = fairObst && fairObst.length ? fairObst : FAIR_OBST;
    // 30.10: тюрьма - скамейка и бочки сдвинуты
    const jl = !!(o && o.jail), LB = jl ? lowerObst(lowJail()) : LOWER_OBST;
    const [bedA, bedB] = LOW.mineBed, LO = mn ? LB.map((x) => (x.e && x.e[0] === bedA[0] && x.e[1] === bedA[1] ? { e: [bedB[0], bedB[1], x.e[2], x.e[3]] } : x)) : LB;
    const OB = [...QUARTER_OBST, ...LO, ...(jl ? JAIL_OBST : []), ...(mn ? [{ b: [LOW.mine.x0, LOW.edge[1], LOW.mine.x1, LOW.mine.base] }] : []), ...shift(mg ? FO.filter((x) => !x.cart).concat([o.magicObst || MAGIC_OBST]) : FO, QW)];
    const BLD = BUILDINGS.filter((b) => (!b.magic || mg) && (!b.mine || mn) && (!b.jail || jl));
    // HW-NPC: хэллоуинские НПС на улице (legacy/site/public/hwnpc.js) - их препятствия и «здания» (где кликать, куда идти)
    if (o && o.hwObst) OB.push(...o.hwObst);
    if (o && o.hwB) BLD.push(...o.hwB);
    // 26.10: доска «Итоги шахты» стоит на нижней улице (земля под ней свободна) - здание там не ловится, нужна горячая точка
    // (только сам щит с шапкой, ноги столбов - земля, по ней можно пройти)
    const hot = mn ? [...HOT, { b: 'mineboard', what: '', ol: 'mineboard', r: [1060, 1150, 1148, 1268] }] : HOT;
    return makeFrom({ W, H, QW, AREA, OBST: OB, BUILDINGS: BLD, HOT: hot, home: [QW + 960, AREA.y0 + 120] });
  }
  /** 23.10: карта любого города (Ярмарка — make(); города округов — towngen.js): ширина W, полоса AREA, препятствия OBST,
   *  здания BUILDINGS, точки HOT, home — куда встать, если рядом ничего свободного. Сетка, A*, «нитка» — общие. */
  function makeFrom(T) {
    const W = T.W, H = T.H, QW = T.QW || 0, AREA = T.AREA, OB = T.OBST, BLD = T.BUILDINGS, home = T.home || [W / 2, AREA.y0 + 120];
    // HW-NPC: хэллоуинский НПС (hw: true, hwnpc.js) стоит прямо на улице - под ним земля, поэтому весь его рисунок - горячая точка (как доска шахты)
    const HOT = [...(T.HOT || []), ...BLD.filter((b) => b && b.hw).map((b) => ({ b: b.id, what: '', ol: b.id, r: b.hit }))];
    const PAD = 10, C = 16;
    // препятствия разложены по полосам x (по 200 px): проверка точки смотрит только свои (путь считается быстро и на телефоне)
    const BIN = 200, bins = [];
    for (const o of OB) {
      const [a, b] = o.e ? [o.e[0] - o.e[2], o.e[0] + o.e[2]] : o.b ? [o.b[0], o.b[2]] : [o.r[0], o.r[1]];
      for (let i = Math.max(0, Math.floor((a - 40) / BIN)); i <= Math.floor((b + 40) / BIN); i++) (bins[i] = bins[i] || []).push(o);
    }
    const hitOb = (x, y, pad) => {
      for (const o of bins[Math.floor(x / BIN)] || []) {
        if (o.e) { const [cx, cy, rx, ry] = o.e; if (((x - cx) / (rx + pad)) ** 2 + ((y - cy) / (ry + pad * 0.6)) ** 2 < 1) return o; }
        else if (o.b) { if (x > o.b[0] - pad && x < o.b[2] + pad && y > o.b[1] - pad * 0.6 && y < o.b[3] + pad * 0.6) return o; }
        else if (o.r && x > o.r[0] - pad && x < o.r[1] + pad && y < o.r[2] + pad) return o;
      }
      return null;
    };
    const inArea = (x, y) => x >= AREA.x0 && x <= AREA.x1 && y >= AREA.y0 && y <= AREA.y1;
    const free = (x, y) => inArea(x, y) && !hitOb(x, y, PAD);
    const cols = Math.ceil(W / C), y0 = AREA.y0, rows = Math.ceil((AREA.y1 - y0) / C) + 1;
    const G = new Uint8Array(cols * rows);   // 1 — можно стоять (центр клетки свободен)
    const cx = (c) => c * C + C / 2, cy = (r) => Math.min(AREA.y1, y0 + r * C + C / 2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) G[r * cols + c] = free(cx(c), cy(r)) ? 1 : 0;
    const cell = (x, y) => [Math.max(0, Math.min(cols - 1, Math.floor(x / C))), Math.max(0, Math.min(rows - 1, Math.floor((y - y0) / C)))];
    const ok = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && G[r * cols + c] === 1;

    /** Ближайшая точка, где можно стоять (кликнули в стену, в воду, за край). */
    function nearest(x, y) {
      x = Math.max(AREA.x0, Math.min(AREA.x1, +x || 0)); y = Math.max(AREA.y0, Math.min(AREA.y1, +y || 0));
      { const rx = Math.round(x), ry = Math.round(y); if (free(rx, ry)) return [rx, ry]; }   // 20.10: проверяем уже округлённую точку (у самого края округление уводило в препятствие)
      const [c0, r0] = cell(x, y);
      for (let d = 1; d < 60; d++) {
        let best = null, bd = Infinity;
        for (let r = r0 - d; r <= r0 + d; r++) for (let c = c0 - d; c <= c0 + d; c++) {
          if (Math.max(Math.abs(c - c0), Math.abs(r - r0)) !== d || !ok(c, r)) continue;
          const dd = (cx(c) - x) ** 2 + (cy(r) - y) ** 2; if (dd < bd) { bd = dd; best = [cx(c), cy(r)]; }
        }
        if (best) return best.map(Math.round);
      }
      return [Math.round(home[0]), Math.round(home[1])];
    }
    // клетка сетки для точки: её собственная, а если центр клетки занят (точка у самого края) — ближайшая свободная
    function okCell(x, y) {
      const [c0, r0] = cell(x, y); if (ok(c0, r0)) return [c0, r0];
      for (let d = 1; d < 8; d++) for (let r = r0 - d; r <= r0 + d; r++) for (let c = c0 - d; c <= c0 + d; c++) if (ok(c, r)) return [c, r];
      return [c0, r0];
    }
    // видно ли прямо (весь отрезок — по свободному месту): шаг 6 px
    function clear(a, b) {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 6));
      for (let i = 1; i < n; i++) { const t = i / n; if (!free(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
      return free(b[0], b[1]);
    }
    /** Путь от a до b по проходимому: [[x,y], …] (первая точка — a, последняя — b или ближайшее свободное к b). */
    // 20.10: проходимость шага между соседними клетками — считается один раз и запоминается (0 — не считали, 1 — можно, 2 — нельзя)
    const EDGE = new Uint8Array(cols * rows * 8);
    const edgeOk = (i, c, r, dc, dr) => {
      const k = i * 8 + (dr + 1) * 3 + (dc + 1) - ((dr + 1) * 3 + (dc + 1) > 4 ? 1 : 0);
      let v = EDGE[k]; if (!v) { v = clear([cx(c), cy(r)], [cx(c + dc), cy(r + dr)]) ? 1 : 2; EDGE[k] = v; }
      return v === 1;
    };
    // 22.10: рабочие массивы A* — одни на карту (раньше ~200 КБ новых массивов на каждый шаг каждого героя: при толпе — сборка мусора
    // рывками). Чистить их не нужно: клетка «своя» для этого поиска, только если в ней стоит номер поиска (st)
    const N = cols * rows, gS = new Float32Array(N), from = new Int32Array(N), seen = new Uint32Array(N), shutAt = new Uint32Array(N);
    const heap = [], hv = [];
    let st = 0;
    function path(a, b) {
      a = nearest(a[0], a[1]); b = nearest(b[0], b[1]);
      if (clear(a, b)) return [a, b];
      const [sc, sr] = okCell(a[0], a[1]), [tc, tr] = okCell(b[0], b[1]);
      if (++st >= 0xffffffff) { st = 1; seen.fill(0); shutAt.fill(0); }
      const g = (i) => (seen[i] === st ? gS[i] : Infinity);
      const s = sr * cols + sc, t = tr * cols + tc;
      // A* на сетке, 8 соседей, без срезания углов; куча — простая бинарная
      heap.length = 0; hv.length = 0;
      const push = (i, f) => { heap.push(i); hv.push(f); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (hv[p] <= hv[k]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; [hv[p], hv[k]] = [hv[k], hv[p]]; k = p; } };
      const pop = () => { const top = heap[0], li = heap.pop(), lv = hv.pop(); if (heap.length) { heap[0] = li; hv[0] = lv; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && hv[l] < hv[m]) m = l; if (r < heap.length && hv[r] < hv[m]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; [hv[m], hv[k]] = [hv[k], hv[m]]; k = m; } } return top; };
      const hh = (c, r) => Math.hypot(c - tc, r - tr);
      gS[s] = 0; from[s] = -1; seen[s] = st; push(s, hh(sc, sr));
      let found = false, guard = 0;
      while (heap.length && guard++ < N * 2) {
        const i = pop(); if (shutAt[i] === st) continue; shutAt[i] = st;
        if (i === t) { found = true; break; }
        const c = i % cols, r = (i / cols) | 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = c + dc, nr = r + dr; if (!ok(nc, nr)) continue;
          if (dr && dc && (!ok(c + dc, r) || !ok(c, r + dr))) continue;
          if (!edgeOk(i, c, r, dc, dr)) continue;   // 20.10: центры соседних клеток свободны, но между ними тонкое препятствие — не шагаем
          const j = nr * cols + nc, gg = gS[i] + (dr && dc ? 1.4142 : 1);
          if (gg < g(j)) { gS[j] = gg; from[j] = i; seen[j] = st; push(j, gg + hh(nc, nr)); }
        }
      }
      if (!found) return [a];   // не дойти (не должно быть: полоса связная) — стоим на месте
      const cells = []; for (let i = t; i !== -1 && i !== s; i = from[i]) cells.push([cx(i % cols), cy((i / cols) | 0)]);
      cells.reverse();
      // конец: к самой точке клика, если от последней клетки до неё прямо видно (иначе — центр клетки рядом с ней)
      const pts = [a, ...cells]; if (!cells.length || clear(cells[cells.length - 1], b)) pts.push(b);
      // сглаживание: «натянуть нитку» — из каждой точки идём к самой дальней видимой.
      // 22.10: дальнюю ищем скачками (1, 2, 4, 8… клеток вперёд, потом делением пополам), а не перебором каждой клетки:
      // на длинной прямой было ~100 тыс. проверок точек на путь (у слабого телефона — десятки мс на шаг каждого героя)
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1;) {
        let lo = i + 1, step = 1, hi = -1;
        while (lo + step < pts.length) { if (clear(pts[i], pts[lo + step])) { lo += step; step *= 2; } else { hi = lo + step; break; } }
        if (hi < 0) { hi = pts.length; }
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (clear(pts[i], pts[mid])) lo = mid; else hi = mid; }
        out.push(pts[lo]); i = lo;
      }
      // самый край препятствия: от точки до центра первой клетки прямо не пройти — путь начинается с клетки (герой встанет туда)
      if (out.length > 2 && !clear(out[0], out[1])) out.shift();
      return out.map((p) => [Math.round(p[0]), Math.round(p[1])]);
    }
    /** Здание под точкой клика (координаты города). */
    // что под курсором/пальцем: точка (наковальня, кузнец…) или здание — там же, где клик заходит внутрь (выше полосы, где ходят, или по прилавку)
    const hoverAt = (x, y) => {
      const h = HOT.find((o) => x >= o.r[0] && x <= o.r[1] && y >= o.r[2] && y <= o.r[3]);
      if (h) return { id: h.b, what: h.what, ol: h.ol, r: h.r };
      const b = buildingAt(x, y);
      return b && (y < AREA.y0 || !free(x, y)) ? { id: b.id, what: '', r: b.hit } : null;
    };
    const buildingAt = (x, y) => BLD.find((b) => x >= b.hit[0] && x <= b.hit[1] && y >= b.hit[2] && y <= b.hit[3]) || null;
    return { W, H, QW, AREA, OBST: OB, BUILDINGS: BLD, free, nearest, clear, path, buildingAt, hoverAt, hitOb, grid: { C, cols, rows, G } };
  }
  /** 25.10: карта только из твёрдых препятствий (для сервера): free / nearest — встать не в стену и не в воду. */
  let hardMap = null;
  const hard = () => hardMap || (hardMap = makeFrom({ W, H, QW, AREA, OBST: HARD_OBST, BUILDINGS: [], HOT: [], home: [QW + 960, AREA.y0 + 120] }));
  /** Длина пути, px. */
  const pathLen = (p) => { let d = 0; for (let i = 1; i < p.length; i++) d += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return d; };
  // 23.10: ходьба — по времени (сколько прошло мс, столько и прошёл: SPEED px/с при любой частоте кадров), а не по кадрам.
  // Чужой шаг приходит с опозданием (пачка раз в 700 мс + сеть): раньше герой прыгал вперёд на опоздание × скорость (до ~160 px —
  // «телепортируется»). Теперь опоздание — «долг» lag (px): отдаётся прибавкой скорости не больше ×(1 + CATCH) — на глаз
  // незаметно; не успел до конца пути — просто дошёл чуть позже. Впереди себя настоящего — замедление не ниже ×(1 − SLOW).
  // Разошлись больше чем на FAR_S с ходьбы — встать на место с проявлением (fade).
  const CATCH = 0.2, SLOW = 0.2, FAR_S = 2;
  /** Шаг по пути за dt секунд. st = { x, y, path: [[x, y], …] | null, lag } → новое { x, y, path, lag, dx } (st не меняется);
   *  dx — сдвиг по x на последнем отрезке (куда смотрит). Чистая функция — тест test/citywalk.test.ts. */
  function stepAlong(st, dt, speed) {
    speed = speed || SPEED;
    const p = st.path && st.path.length ? st.path : null;
    let x = st.x, y = st.y, lag = p ? +st.lag || 0 : 0, dx = 0;
    if (!p || !(dt > 0)) return { x, y, path: p, lag, dx };
    const add = Math.max(-speed * SLOW * dt, Math.min(speed * CATCH * dt, lag));
    let left = speed * dt + add, i = 0;
    lag -= add;
    while (i < p.length && left > 0) {
      const tx = p[i][0], ty = p[i][1], ex = tx - x, ey = ty - y, d = Math.hypot(ex, ey);
      if (Math.abs(ex) > 1) dx = ex;
      if (d <= left) { x = tx; y = ty; left -= d; i++; } else { x += ex / d * left; y += ey / d * left; left = 0; }
    }
    const path = i >= p.length ? null : i ? p.slice(i) : p;
    return { x, y, path, lag: path ? lag : 0, dx };
  }
  /** Точка пути p (с начальной точкой) через s px от начала: { x, y, rest — оставшиеся точки или null, restLen }. */
  function along(p, s) {
    let x = p[0][0], y = p[0][1];
    for (let i = 1; i < p.length; i++) {
      const tx = p[i][0], ty = p[i][1], d = Math.hypot(tx - x, ty - y);
      if (d < s) { s -= d; x = tx; y = ty; continue; }
      const k = d ? s / d : 0, nx = x + (tx - x) * k, ny = y + (ty - y) * k, rest = p.slice(i);
      return { x: nx, y: ny, rest, restLen: pathLen([[nx, ny], ...rest]) };
    }
    return { x, y, rest: null, restLen: 0 };
  }
  /**
   * Пришёл чужой шаг: вышел из from в to ago мс назад; у нас он нарисован в local. Как его вести дальше:
   * { x, y, path, lag, fade }. Обычно — путь от local (без прыжка) и долг = насколько наш путь длиннее его оставшегося;
   * разошлись больше FAR_S с ходьбы (вкладку прятали, связь рвалась) или o.fresh (новенький) — встать туда, где он сейчас (fade).
   * map — карта make(): путь только по проходимому.
   */
  function follow(map, local, from, to, ago, o) {
    const speed = (o && o.speed) || SPEED, s = speed * Math.max(0, Math.min(+ago || 0, 60000)) / 1000;
    const near = Math.hypot(local[0] - from[0], local[1] - from[1]) < 24;
    const our = map.path(local, to);
    const real = along(near ? our : map.path(from, to), s);
    if ((o && o.fresh) || Math.hypot(local[0] - real.x, local[1] - real.y) > speed * FAR_S) {
      return { x: real.x, y: real.y, path: real.rest, lag: 0, fade: true };
    }
    // стоял в стене или в воде (старые данные) — сначала на свободное место (как раньше)
    const keep = map.free(local[0], local[1]) && map.clear(local, our[0]);
    const x = keep ? local[0] : our[0][0], y = keep ? local[1] : our[0][1], path = our.length > 1 ? our.slice(1) : null;
    const lag = path ? pathLen([[x, y], ...path]) - real.restLen : 0;
    return { x, y, path, lag, fade: false };
  }
  return { QW, FAIR_W, W, H, WALL_L, HARD_OBST, hard, ROWS_DX, END_DX, AREA, LOW, lowJail, JAIL_OBST, FAIR_OBST, MAGIC_OBST, QUARTER_OBST, LOWER_OBST, BUILDINGS, HOT, SCALE, SPEED, CATCH, SLOW, FAR_S, scaleAt, shift, make, makeFrom, pathLen, stepAlong, follow };
});
