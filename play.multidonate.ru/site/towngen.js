/* 23.10: «Города округов» — генератор раскладки города округа ★1–2 (решение стримера 23.10, legacy/md/docs/CITY.md — «Города округов»).
   Чистая функция от округа: generate({ id, name, town (название города), biome, danger, kind, levels?, building? }) → раскладка: ширина и высота,
   полоса, где ходят, здания (двери), улицы, площади, препятствия, предметы. Зерно — хэш id округа + версии генератора (VER): один округ —
   один и тот же город у всех каналов, в базе ничего не хранится. Рисунок по раскладке — townart.js (размер × природа); проходимость —
   citymap.js makeFrom (та же сетка и A*). Один файл для страницы (window.LGTownGen, грузится только при входе в город округа) и для
   сервера/тестов (require).
   24.10 (VER 3, решение стримера: ярусы со стенами и лестницами — убрать, «без перегородок между экранами»): город — ОДНА большая
   сплошная локация. Сверху — ряд зданий (как у Ярмарки), перед ними главная улица; ниже — открытая часть города: центральная площадь
   с фонтаном / памятником природы округа перед Ратушей (дворцом), площади поменьше (рынок с лотками, сквер), широкий бульвар внизу,
   поперечные улицы между площадями, домики, деревья, скамейки, фонари, ручей с мостами (только где улица его пересекает).
   Размеры: ★1 — деревня 4200×1500 (без Аукциона), ★2 — посёлок 5000×1600, столица — 6600×1700 (дворец лорда вместо Ратуши,
   больше площадей). Камера ходит по обеим осям, зум — city.js. Как устроена раскладка (для других генераторов) — CITY.md «Раскладка города». */
(function (root, factory) {
  // 28.10 (art/district-towns): ручные деревни (packages/world/villages/<id>.js): сервер - require, страница - window.LGVillages (файл деревни грузит
  // тот, кто строит город: city.js, dtown.js, ovcity.js - LGTownGen.prep); нет файла - генератор, как раньше
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./citymap.js'), require('./index.js'), require('./villages/index.js').get);
  else root.LGTownGen = factory(root.LGCityMap, root.LGWorldLib, (id) => (root.LGVillages || {})[id] || null);   // 26.10: библиотека мира (/lib/world.js) - до towngen.js
})(typeof self !== 'undefined' ? self : this, function (CM, WL, VG) {
  'use strict';
  const VER = 4;                                   // версия генератора: поменял раскладку — подними (у всех городов новое зерно)
  const Y0 = 800, BASE = 795;                      // верх полосы, где ходят (как у Ярмарки), низ стен зданий заднего ряда
  const SIZES = { village: 4400, settle: 5400 }, CAPITAL_PLUS = 1400;   // 24.10: + шахта у правого края
  const HEIGHTS = { village: 1500, settle: 1600, capital: 1700 };
  const H = 1080;                                  // прежняя высота сцены (для совместимости: верх — небо и задний ряд; ниже — город)
  const MINGAP = 72, ART_PAD = 30;                 // зазор между участками заднего ряда: рисунок L5 (рамка ±30 — свесы, факелы, лотки) не задевает соседа
  // здания (id и тексты — как у Ярмарки, citymap.js BUILDINGS: те же интерьеры и окна)
  const META = {
    gate: { title: 'Ворота', sub: 'в поход — только на стриме', icon: '🚩' },
    hall: { title: 'Ратуша', sub: 'оборона города', icon: '🏰', soon: true },
    auction: { title: 'Аукцион', sub: 'торговля между игроками', icon: '⚖', soon: true },
    trainer: { title: 'Тренер', sub: 'дерево навыков', icon: '🎯' },
    board: { title: 'Доска объявлений', sub: 'новости игры', icon: '📜' },
    storage: { title: 'Склад', sub: 'хранение вещей', icon: '📦', soon: true },
    anvil: { title: 'Заточка', sub: 'наковальня у Кузни', icon: '🔨' },
    forge: { title: 'Кузня', sub: 'лавка кузнеца', icon: '⚒' },
    tent: { title: 'Шатёр', sub: 'облик', icon: '🎩' },
    shop: { title: 'Лавка', sub: 'еда, зелья, материалы', icon: '🧺' },
    magic: { title: 'Лавка звездочёта', sub: 'посохи, мантии, амулеты', icon: '🔮', magic: true },
  };
  // 24.10: ШАХТА (промысел — модуль коллеги, docs/jobs-and-dailies.md): вход в горе у правого края заднего ряда; без уровней.
  // Пока модуля нет — вход закрыт («скоро»); city.js: клик → window.LGMine.open({ town, … }), если модуль есть
  const MINE = { title: 'Шахта', sub: 'промысел: руда', icon: '⛏', soon: true };
  // ширина участка здания: [деревня, посёлок]
  const LOTW = { mine: [300, 340], gate: [260, 300], hall: [300, 360], auction: [0, 340], trainer: [280, 320], board: [250, 290], storage: [280, 320], forge: [560, 640], tent: [320, 380], shop: [300, 370], magic: [230, 260] };
  /* 23.10 (вечер): уровни зданий 1–5 (решение стримера 23.10: улучшения потом покупает мэр за ресурсы — здесь только рисунок и геометрия).
     Без улучшений: деревня ★1 — 1, посёлок ★2 — 2, столица — 3 (baseLevel). Раскладка (участки, двери, дороги, предметы) от уровня
     НЕ зависит — одна и та же у всех уровней (проходимость та же); от уровня — рамка рисунка здания (ширина внутри участка — вокруг двери,
     высота стен и того, что над ними), а по ней место клика hit и ярлык. Рисунок (townart.js) берёт ту же рамку (L.fr). */
  const LV_MIN = 1, LV_MAX = 5;
  const LV_IDS = ['gate', 'hall', 'auction', 'trainer', 'board', 'storage', 'anvil', 'forge', 'tent', 'shop', 'magic'];
  // fr — доля ширины участка (вокруг двери; у Кузни — от навеса вправо), wall — высота стен (посёлок; деревня ×0.9), up — что выше стен
  // (крыша, башня, флаг), по уровням 1…5. pal — дворец лорда (Ратуша столицы, участок 680)
  const GEO = {
    gate: { fr: [0.72, 0.86, 1, 1, 1], wall: [190, 240, 290, 320, 340], up: [60, 90, 100, 150, 190] },
    hall: { fr: [0.72, 0.82, 0.92, 1, 1], wall: [110, 150, 190, 220, 240], up: [130, 190, 250, 280, 310] },
    pal: { fr: [0.62, 0.74, 0.86, 0.96, 1], wall: [170, 210, 250, 280, 300], up: [150, 200, 240, 270, 290] },
    auction: { fr: [0.7, 0.8, 0.9, 1, 1], wall: [110, 150, 190, 215, 235], up: [80, 100, 130, 180, 220] },
    trainer: { fr: [0.7, 0.8, 0.9, 1, 1], wall: [100, 140, 180, 205, 225], up: [80, 100, 130, 180, 215] },
    board: { fr: [0.6, 0.78, 0.9, 1, 1], wall: [140, 170, 195, 215, 235], up: [60, 76, 95, 130, 170] },   // 24.10: up — и вывеска «ДОСКА» над щитом (ярлык — выше неё)
    storage: { fr: [0.7, 0.8, 0.9, 1, 1], wall: [100, 140, 170, 200, 220], up: [80, 100, 120, 170, 205] },
    anvil: { top: [606, 596, 576, 552, 530] },
    forge: { fr: [0.7, 0.8, 0.9, 1, 1], wall: [110, 150, 185, 215, 235], up: [120, 150, 175, 205, 235] },
    tent: { fr: [0.62, 0.76, 0.88, 1, 1], wall: [120, 160, 200, 225, 240], up: [110, 150, 200, 230, 260] },
    shop: { fr: [0.7, 0.8, 0.9, 1, 1], wall: [100, 140, 180, 205, 225], up: [70, 90, 110, 160, 200] },
    magic: { fr: [0.5, 0.56, 0.62, 0.86, 1], wall: [170, 220, 280, 320, 350], up: [110, 140, 170, 190, 215] },
  };
  const STILTS = { hall: 1, auction: 1, trainer: 1, storage: 1, forge: 1, shop: 1 };   // на болоте — на сваях (выше на 54 px)
  const lvClamp = (v, d) => { const n = Math.round(+v); return Number.isFinite(n) && v !== null && v !== '' ? Math.max(LV_MIN, Math.min(LV_MAX, n)) : d; };
  /** Уровень зданий города без улучшений: деревня ★1 — 1, посёлок ★2 — 2, столица — 3. */
  function baseLevel(t) { return t && t.kind === 'capital' ? 3 : (+(t && t.danger) || 1) >= 2 ? 2 : 1; }
  /** Уровни всех зданий: given — { forge: 3, … } (что купил мэр), остальное — baseLevel. */
  function levelsOf(t, given) { const b = baseLevel(t), out = {}; for (const k of LV_IDS) out[k] = lvClamp(given && given[k], b); return out; }
  /** Рамка рисунка здания на участке: { x0, x1, B (низ стен), wall, up, top (верх рисунка), lv }. Дверь — та же при любом уровне. */
  function frame(L, lot, id, lv) {
    const village = L.size === 'village', pal = id === 'hall' && L.capital, g = GEO[pal ? 'pal' : id], i = lv - 1;
    if (id === 'anvil') return { x0: lot.x0, x1: lot.fx0, B: BASE, wall: 0, up: 0, top: g.top[i], lv };
    const sc = lot.s || 1, st = STILTS[id] && !pal && L.biome === 'swamp' ? Math.round(54 * (lot.B ? sc : 1)) : 0, B = (lot.B || BASE) - st;   // 28.10: здание ниже по улице - тоже на сваях (рисунок деревни), сваи крупнее по глубине   // 28.10: ручная деревня - своё основание и масштаб по глубине
    const wall = Math.round(g.wall[i] * (village ? 0.9 : 1) * sc), up = Math.round(g.up[i] * sc);
    let x0, x1;
    if (id === 'forge') { const w = lot.x1 - lot.fx0; x0 = lot.fx0; x1 = Math.round(lot.fx0 + w * g.fr[i]); }
    else { const w = (lot.x1 - lot.x0) * g.fr[i], cx = (lot.x0 + lot.x1) / 2; x0 = Math.round(cx - w / 2); x1 = Math.round(cx + w / 2); }
    return { x0, x1, B, wall, up, top: B - wall - up, lv, ...(lot.B ? { G: lot.B } : {}) };   // G - земля здания ниже по улице (B выше неё на сваи)
  }
  /** Тот же город с другими уровнями (раскладка та же — только рамки зданий и места клика). levels — { id: 1…5 } поверх прежних уровней. */
  function relevel(L, levels) {
    const N = { ...L, lv: levelsOf(L, { ...L.lv, ...(levels || {}) }), fr: {}, BUILDINGS: L.BUILDINGS.map((b) => ({ ...b })) };
    applyLevels(N); return N;
  }
  function applyLevels(L) {
    L.fr = {};
    for (const lot of L.lots) {
      if (lot.k === 'forge') { L.fr.anvil = frame(L, lot, 'anvil', L.lv.anvil); L.fr.forge = frame(L, lot, 'forge', L.lv.forge); }
      else if (GEO[lot.k]) L.fr[lot.k] = frame(L, lot, lot.k, L.lv[lot.k]);
      else if (lot.k === 'mine') L.fr.mine = { x0: lot.x0 + 10, x1: lot.x1 - 10, B: BASE, wall: 140, up: 95, top: 560, lv: 1, fixed: true };   // скала с порталом — без уровней
    }
    for (const b of L.BUILDINGS) {
      const f = L.fr[b.id]; if (!f) continue;
      b.lv = f.lv;
      b.hit = b.id === 'anvil' ? [b.hit[0], b.hit[1], f.top, b.hit[3]] : [f.x0, f.x1, Math.max(150, f.top - 6), f.G ? f.G + 6 : 800];   // 28.10: здание ниже по улице - клик до его основания
    }
  }
  /* ---------- 23.10 (ночь; перенесено из town-tiers): стройка — улучшение здания мэром 6–48 ч (только отображение) ---------- */
  /** { id: { to, until } } → только известные здания, уровень 1…5, until — число мс. */
  function buildOf(b) {
    const out = {};
    if (b && typeof b === 'object') for (const k of LV_IDS) { const v = b[k]; if (v && Number.isFinite(+v.until) && +v.until > 0) out[k] = { to: lvClamp(v.to, LV_MAX), until: Math.round(+v.until) }; }
    return out;
  }
  /** Сколько мс до конца стройки здания b (из L.BUILDINGS) на момент now; 0 — стройки нет или кончилась. */
  const buildLeft = (b, now) => (b && b.build ? Math.max(0, b.build.until - now) : 0);
  const two = (n) => String(n).padStart(2, '0');
  /** Таймер стройки: ЧЧ:ММ:СС (часы — сколько есть, до 48+). */
  function buildClock(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`; }
  /** Что сказать на клик по зданию на стройке: «Идёт стройка: улучшение до ур. N, осталось ЧЧ:ММ» ('' — стройки нет). */
  function buildMsg(b, now) { const ms = buildLeft(b, now); if (!ms) return ''; const m = Math.ceil(ms / 60000); return `Идёт стройка: улучшение до ур. ${b.build.to}, осталось ${two(Math.floor(m / 60))}:${two(m % 60)}`; }

  const NATURE = { meadow: 1, forest: 1.4, taiga: 1.2, ice: 0.8, mount: 0.7, swamp: 1.1, ash: 0.5, desert: 0.6, coast: 0.8, blight: 0.6, ruin: 0.5 };
  const SPECIAL = { blacktower: 1, worldtree: 1, pyramids: 1, bones: 1 };
  // памятник центральной площади по природе (посёлок, деревня); у столицы — фонтан (пепел — лавовая чаша, пустыня — оазис) и памятник основателю в сквере
  const MARK = { meadow: 'fountain', forest: 'oak', taiga: 'totem', ice: 'icestatue', mount: 'stonestatue', swamp: 'swamptotem', ash: 'lavabowl', desert: 'oasis', coast: 'anchor', blight: 'obelisk', ruin: 'ruinstatue' };
  const BROOK = { meadow: 0.55, forest: 0.6, taiga: 0.55, swamp: 1, coast: 0.5 };   // ручей через город (с мостами на улицах)

  const hash = WL.hash, rng = WL.rng;   // 26.10: случайность по зерну - библиотека мира (та же у шахты и сервера; была своя копия)
  const seedOf = (id) => hash(`${id}:towngen:${VER}`);
  const r1 = (v) => Math.round(v);
  // расстояние от точки до отрезка
  function segDist(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L)) : 0;
    return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
  }
  /** Внутри площади (с запасом m): эллипс или прямоугольник со скруглёнными углами. */
  function inPlaza(p, x, y, m) {
    const dx = Math.abs(x - p.x), dy = Math.abs(y - p.y);
    if (p.shape === 'rect') return dx < p.rx + m && dy < p.ry + m;
    return (dx / (p.rx + m)) ** 2 + (dy / (p.ry + m)) ** 2 < 1;
  }
  /** Далеко ли точка от улиц (с запасом m сверх полуширины) и площадей: L.roads — ломаные { w, pts }, spurs — отрезки к дверям. */
  function offPaths(L, x, y, m, noPlaza) {
    for (const r of L.roads) { const P = r.pts; for (let i = 1; i < P.length; i++) if (segDist(x, y, P[i - 1], P[i]) < r.w + m) return false; }
    for (const s of L.spurs) if (segDist(x, y, s[0], s[1]) < L.pathW.spur + m) return false;
    if (!noPlaza) for (const p of L.plazas) if (inPlaza(p, x, y, m)) return false;
    return true;
  }
  /** Основание предмета (эллипс cx, cy, rx, ry) — целиком вне улиц и площадей (с запасом m): центр и 8 точек по краю. */
  function footOff(L, e, m, noPlaza) {
    if (!offPaths(L, e[0], e[1], m, noPlaza)) return false;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; if (!offPaths(L, e[0] + Math.cos(a) * e[2], e[1] + Math.sin(a) * e[3], m, noPlaza)) return false; }
    return true;
  }
  const lineY = (R, x) => { for (let i = 1; i < R.length; i++) if (x <= R[i][0]) { const a = R[i - 1], b = R[i], t = (x - a[0]) / Math.max(1, b[0] - a[0]); return a[1] + (b[1] - a[1]) * t; } return R[R.length - 1][1]; };
  /** y главной улицы в точке x (k: 'boul' — бульвара). */
  const roadY = (L, x, k) => lineY(k === 'boul' ? L.boul : L.road, x);
  /** Размер человечка по глубине: как у Ярмарки (citymap.js scaleAt) — у верха полосы мельче, ниже главной улицы — в полный рост. */
  const scaleAt = (L, y) => CM.scaleAt(y);
  // высота рисунка участка заднего ряда над низом стен при L5 (+30 — флаги, навершия)
  function lotTall(L, lot) {
    const k = lot.k;
    if (k === 'forge') return Math.max(BASE - frame(L, lot, 'forge', LV_MAX).top, BASE - GEO.anvil.top[LV_MAX - 1]) + 30;
    if (GEO[k]) return BASE - frame(L, lot, k, LV_MAX).top + 30;
    return { house: 400, grove: 300, brook: 120, mine: 270 }[k] || 0;
  }
  // основание предмета (эллипс-препятствие): [rx, ry]; null — не препятствие (низкое, по нему ходят)
  const FOOT = { barrel: [24, 10], crate: [32, 10], pot: [20, 8], bush: [40, 14], flowers: null, tree: [26, 12], haystack: [56, 18], fence: [70, 8], flowerbed: [70, 20], cart: [56, 14],
    mushroom: [16, 6], stump: [24, 10], pine: [24, 10], woodpile: [52, 14], rock: [40, 14], drift: [56, 14], snowman: [26, 10], lantern: [12, 7], nets: [44, 8], reeds: null, pool: [90, 26],
    deadtree: [20, 9], brazier: [22, 9], bones: null, cactus: [18, 8], palm: [22, 10], pond: [110, 28], camelpost: [12, 7], boat: [70, 14], rubble: [44, 12], brokencol: [28, 12], dummy: [20, 9], well: [62, 22], lamp: [12, 7],
    // 24.10: площади и бульвар
    fountain: [132, 38], oak: [56, 20], totem: [30, 12], icestatue: [58, 20], stonestatue: [58, 20], swamptotem: [30, 12], lavabowl: [76, 24], oasis: [150, 40], anchor: [48, 16], obelisk: [40, 15], ruinstatue: [66, 22],
    statue: [66, 22], bench: [50, 10], stall: [66, 16], planter: [34, 12], hedge: [66, 14] };
  const WATERK = { pool: 1, pond: 1, fountain: 1, oasis: 1 };
  const TREE = { tree: 1, pine: 1, palm: 1, deadtree: 1, oak: 1 }, NEAR = { bench: 1, well: 1, stall: 1, lamp: 1, planter: 1, dummy: 1, statue: 1, fountain: 1 };
  // высота рисунка предмета над основанием (ниже главной улицы предмет не должен закрывать здания заднего ряда: y − TALL > 800)
  const TALL = { tree: 230, pine: 270, palm: 250, oak: 300, deadtree: 180, lamp: 240, fountain: 210, totem: 230, icestatue: 250, stonestatue: 250, swamptotem: 220, lavabowl: 180, oasis: 260, anchor: 180, obelisk: 280, ruinstatue: 230, statue: 260, stall: 170, well: 200 };

  /**
   * Город округа. t — { id, name, town (название города), biome, danger, kind, levels?, building? } (как world.json: территория и её town).
   */
  function generate(t) {
    const hv = HAND.includes(String(t.id)) && !t.gen ? VG(String(t.id)) : null;   // 28.10: ручная деревня (файл есть) - своя раскладка; t.gen - вид генератора (витрина «было»)
    if (hv && typeof hv.layout === 'function') return buildHand(t, hv);
    const id = String(t.id), seed = seedOf(id), R = rng(seed);
    const pick = (a) => a[Math.floor(R() * a.length)];
    const danger = Math.max(1, Math.min(2, +t.danger || 1)), kind = String(t.kind || 'town');
    const size = danger >= 2 ? 'settle' : 'village', capital = kind === 'capital', special = SPECIAL[kind] ? kind : null;
    const biome = NATURE[t.biome] ? t.biome : 'meadow', si = size === 'village' ? 0 : 1, V = size === 'village';
    const W = SIZES[size] + (capital ? CAPITAL_PLUS : 0), HH = HEIGHTS[capital ? 'capital' : size], Y1 = HH - 34;
    const L = { v: VER, id, seed, lv: levelsOf(t, t.levels), build: buildOf(t.building), name: String(t.town || t.name || id), terr: String(t.name || ''), biome, danger, kind, size, capital, special, W, H: HH,
      AREA: { x0: 40, x1: W - 40, y0: Y0, y1: Y1 }, lots: [], props: [], water: [], bridges: [], plazas: [], cottages: [], BUILDINGS: [], HOT: [], OBST: [], roads: [], road: [], boul: [], spurs: [], river: null,
      pathW: { road: V ? 46 : capital ? 62 : 58, boul: V ? 40 : capital ? 56 : 50, cross: V ? 32 : capital ? 46 : 42, spur: V ? 28 : 32 } };
    const nat = NATURE[biome] * (V ? 1.3 : 0.8);

    /* ---------- задний ряд: ворота слева, Ратуша (дворец) — ближе к середине (перед ней — центральная площадь), остальное по зерну ---------- */
    const order = ['hall', 'trainer', 'board', 'storage', 'forge', 'tent', 'shop', 'magic'];
    if (!V) order.push('auction');
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    order.splice(order.indexOf('hall'), 1); order.splice(Math.floor(order.length / 2) - (R() < 0.5 ? 1 : 0), 0, 'hall');
    const seq = ['gate', ...order];
    if (BROOK[biome] && R() < BROOK[biome]) seq.splice(R() < 0.5 ? 2 + Math.floor(R() * 2) : seq.length - 1 - Math.floor(R() * 2), 0, 'brook');
    seq.push('mine');   // шахта — последней справа, у края города (скала за стеной)
    const fw = { house: () => r1(170 + R() * 90 - (V ? 20 : 0)), grove: () => r1(150 + R() * 110), brook: () => 220 };
    const want = seq.map((k) => (k === 'hall' && capital ? 680 : LOTW[k] ? LOTW[k][si] : fw[k]()));
    const sum = () => want.reduce((a, b) => a + b, 0) + (seq.length - 1) * MINGAP;
    // дома и рощи между зданиями, пока есть место (не перед воротами и не вплотную к дворцу у столицы)
    for (let guard = 0; guard < 12; guard++) {
      const k = R() < 0.6 || biome === 'desert' || biome === 'ash' ? 'house' : 'grove', w = fw[k]();
      if (sum() + w + MINGAP > W - 80 - 160) break;
      const at = 1 + Math.floor(R() * (seq.length - 1));   // не после шахты
      seq.splice(at, 0, k); want.splice(at, 0, w);
    }
    const free0 = W - 80 - sum(), gaps = seq.map(() => 0.4 + R()), gs = gaps.reduce((a, b) => a + b, 0);
    let xx = 40;
    seq.forEach((k, i) => {
      if (i) xx += MINGAP + free0 * gaps[i] / gs;
      const lot = { k, x0: r1(xx), x1: r1(xx + want[i]), base: BASE - (k === 'house' || k === 'grove' ? r1(R() * 20) : 0), v: r1(R() * 1000) };
      if (k === 'forge') { lot.anvil = lot.x0 + (V ? 120 : 130); lot.fx0 = lot.x0 + (V ? 220 : 250); }
      L.lots.push(lot); xx += want[i];
    });

    /* ---------- главная улица (вдоль ряда зданий) и бульвар внизу ---------- */
    const line = (y0, amp) => { const P = []; for (let x = 40; x < W - 40; x += 400 + R() * 140) P.push([r1(x), r1(y0 + (R() - 0.5) * amp)]); P.push([W - 40, r1(y0 + (R() - 0.5) * amp)]); P[0] = [40, P[0][1]]; return P; };
    L.road = line(905 + (R() - 0.5) * 12, 26);
    L.boul = line(HH - 180 + (R() - 0.5) * 10, 22);
    L.roads.push({ k: 'main', w: L.pathW.road, pts: L.road }, { k: 'boul', w: L.pathW.boul, pts: L.boul });
    const mainMax = Math.max(...L.road.map((p) => p[1])), boulMin = Math.min(...L.boul.map((p) => p[1]));
    const gapTop = mainMax + L.pathW.road, gapBot = boulMin - L.pathW.boul, zoneMid = r1((mainMax + boulMin) / 2);

    /* ---------- здания: участок → место клика, дверь ---------- */
    const B = (bid, hit, door, extra) => { const m = META[bid] || (bid === 'mine' ? MINE : null); L.BUILDINGS.push({ id: bid, title: bid === 'hall' && capital ? 'Дворец лорда' : m.title, sub: bid === 'hall' && capital ? 'ратуша столицы' : m.sub, icon: m.icon, ...(m.soon ? { soon: true } : {}), ...(m.magic ? { magic: true } : {}), hit, door, ...(L.build[bid] ? { build: L.build[bid] } : {}), ...(extra || {}) }); };
    for (const lot of L.lots) {
      const { k, x0, x1 } = lot, cx = r1((x0 + x1) / 2);
      if (k === 'gate') { B('gate', [x0, x1, 260, 800], { x: cx, y: 830 }); L.spawn = [cx + 120, r1(roadY(L, cx + 120))]; continue; }
      if (k === 'forge') {
        // как у Ярмарки: слева навес с наковальней (заточка — на улице), справа — сама Кузня
        const ax = lot.anvil, fx0 = lot.fx0;
        L.anvil = { x: ax, base: 810 };
        B('anvil', [ax - 130, ax + 150, 600, 880], { x: ax + 100, y: r1(Math.max(890, roadY(L, ax + 100))) }, { tag: [ax - 20, 552] });
        B('forge', [fx0, x1, 300, 800], { x: r1((fx0 + x1) / 2), y: 822 });
        L.HOT.push({ b: 'anvil', what: 'Наковальня', ol: 'anv', r: [ax - 80, ax + 65, 728, 818] }, { b: 'anvil', what: 'Табличка', ol: 'sign', r: [ax - 116, ax + 76, 566, 666] }, { b: 'anvil', what: 'Кузнец', ol: 'smith', r: [ax + 15, ax + 140, 638, 836] });
        L.OBST.push({ r: [ax - 120, ax + 150, 852] });   // наковальня, кузнец и бочка — пройти только спереди
        continue;
      }
      if (META[k]) { const top = k === 'magic' ? 160 : k === 'hall' && capital ? 200 : 300; B(k, [x0, x1, top, 800], { x: cx, y: 822 }); }
      if (k === 'mine') { B('mine', [x0, x1, 554, 800], { x: cx, y: 826 }); L.HOT.push({ b: 'mine', what: 'Вход в шахту', ol: 'mine', r: [cx - 70, cx + 70, 660, 800] }); L.mine = { x: cx, x0, x1, door: { x: cx, y: 826 } }; }
    }
    applyLevels(L);   // уровни зданий: рамки рисунка и места клика (раскладка от уровня не зависит)
    for (const b of L.BUILDINGS) if (b.id !== 'anvil') L.spurs.push([[b.door.x, 806], [b.door.x, r1(roadY(L, b.door.x))]]);

    /* ---------- ручей сверху донизу: вода, мосты — только там, где его пересекает улица ---------- */
    const occ = [];   // занятые полосы x нижней части: [x0, x1] (ручей, площади, поперечные улицы, домики)
    const freeX = (a, b) => occ.every(([p, q]) => b <= p || a >= q);
    const brook = L.lots.find((l) => l.k === 'brook');
    if (brook) {
      const sx = r1((brook.x0 + brook.x1) / 2), hw = 42;
      L.river = { x: sx, w: hw * 2, y0: 700, y1: HH };
      L.water.push({ k: 'brook', x: sx, w: hw * 2, b0: 700, b1: HH });
      const cuts = [];
      for (const [k, r] of [['main', L.pathW.road], ['boul', L.pathW.boul]]) { const y = roadY(L, sx, k), b0 = r1(y - r - 26), b1 = r1(y + r + 26); L.bridges.push({ x0: sx - 64, x1: sx + 64, y0: b0, y1: b1, on: k }); cuts.push([b0, b1]); }
      let y = 780; for (const [a, b] of cuts) { L.OBST.push({ b: [sx - hw, y, sx + hw, a], water: true }); y = b; }
      L.OBST.push({ b: [sx - hw, y, sx + hw, HH], water: true });
      occ.push([sx - hw - 110, sx + hw + 110]);
    }

    /* ---------- площади между главной улицей и бульваром: центральная — перед Ратушей (дворцом), рынок, сквер / лужайка ---------- */
    const ry = Math.max(150, r1((gapBot - gapTop) / 2 + 22)), py = r1((gapTop + gapBot) / 2);
    const door = (bid) => { const b = L.BUILDINGS.find((x) => x.id === bid); return b ? b.door.x : W / 2; };
    const spot = (want, rx, m) => {   // ближайшее к want место, где площадь целиком влезает
      for (let d = 0; d < W; d += 20) for (const s of d ? [-1, 1] : [1]) {
        const x = want + s * d; if (x - rx < 140 || x + rx > W - 140) continue;
        if (freeX(x - rx - m, x + rx + m)) return x;
      }
      return null;
    };
    const plaza = (k, want, rx, shape, mark) => {
      const x = spot(want, rx, 70); if (x == null) return null;
      const p = { k, x: r1(x), y: py, rx, ry, shape, mark };
      L.plazas.push(p); occ.push([x - rx - 40, x + rx + 40]); return p;
    };
    const centralRx = V ? 400 : capital ? 600 : 500;
    plaza('central', door('hall'), centralRx, 'ell', capital ? (biome === 'ash' ? 'lavabowl' : biome === 'desert' ? 'oasis' : 'fountain') : MARK[biome]);
    if (V) plaza('green', door(pick(['shop', 'tent', 'trainer'])), 300, 'ell', 'well');
    else {
      plaza('market', door(R() < 0.5 && L.BUILDINGS.some((b) => b.id === 'auction') ? 'auction' : 'shop'), capital ? 440 : 400, 'rect', null);
      if (capital) plaza('garden', door(pick(['magic', 'tent', 'board'])), 360, 'rect', 'statue');
    }
    L.plazas.sort((a, b) => a.x - b.x);

    /* ---------- поперечные улицы (от главной улицы к бульвару) в свободных промежутках ---------- */
    const spans = []; { const s = occ.slice().sort((a, b) => a[0] - b[0]); let x = 60; for (const [a, b] of s) { if (a > x) spans.push([x, a]); x = Math.max(x, b); } if (x < W - 60) spans.push([x, W - 60]); }
    const cw = L.pathW.cross;
    for (const [a, b] of spans) {
      const n = Math.floor((b - a) / 820);
      for (let i = 1; i <= n; i++) {
        const x = r1(a + (b - a) * i / (n + 1) + (R() - 0.5) * 80);
        const y0 = r1(roadY(L, x)), y1 = r1(roadY(L, x, 'boul')), mx = r1(x + (R() - 0.5) * 60);
        L.roads.push({ k: 'cross', w: cw, pts: [[x, y0], [mx, r1((y0 + y1) / 2)], [x, y1]] });
        occ.push([Math.min(x, mx) - cw - 50, Math.max(x, mx) + cw + 50]);
      }
    }

    /* ---------- домики вдоль бульвара (сверху от него) — в оставшихся промежутках ---------- */
    {
      const s = occ.slice().sort((p, q) => p[0] - q[0]), free = []; let x = 90;
      for (const [a, b] of s) { if (a > x) free.push([x, a]); x = Math.max(x, b); } if (x < W - 90) free.push([x, W - 90]);
      const base = r1(gapBot - 14);
      for (const [a, b] of free) {
        let cx = a + 20 + R() * 60;
        while (true) {
          const w = r1(V ? 190 + R() * 50 : 210 + R() * 60);
          if (cx + w > b - 20) break;
          if (R() < (V ? 0.55 : 0.75)) { const c = { x0: r1(cx), x1: r1(cx + w), base, v: r1(R() * 1000) }; L.cottages.push(c); L.OBST.push({ b: [c.x0 + 6, base - 52, c.x1 - 6, base] }); }
          cx += w + 70 + R() * 140;
        }
      }
    }

    /* ---------- предметы: на площадях (памятник, скамейки, фонари, лотки) и вокруг — не на улицах, не у дверей, не друг на друге ---------- */
    const KIT = {
      meadow: { up: ['barrel', 'crate', 'pot', 'bush', 'flowers'], low: ['tree', 'tree', 'haystack', 'flowerbed', 'bush', 'cart', 'flowers', 'haystack'] },
      forest: { up: ['barrel', 'crate', 'mushroom', 'bush', 'stump'], low: ['tree', 'tree', 'tree', 'stump', 'bush', 'mushroom', 'woodpile'] },
      taiga: { up: ['barrel', 'crate', 'woodpile', 'bush'], low: ['pine', 'pine', 'woodpile', 'rock', 'drift', 'bush'] },
      ice: { up: ['barrel', 'crate', 'drift', 'woodpile'], low: ['pine', 'drift', 'drift', 'snowman', 'rock', 'woodpile'] },
      mount: { up: ['barrel', 'crate', 'rock'], low: ['rock', 'rock', 'pine', 'cart', 'woodpile'] },
      swamp: { up: ['barrel', 'lantern', 'nets', 'reeds'], low: ['reeds', 'deadtree', 'lantern', 'nets', 'pool', 'pool'] },
      ash: { up: ['brazier', 'crate', 'rock'], low: ['rock', 'deadtree', 'brazier', 'rock', 'bones'] },
      desert: { up: ['pot', 'pot', 'crate', 'cactus'], low: ['palm', 'cactus', 'pot', 'rock', 'pond', 'camelpost'] },
      coast: { up: ['barrel', 'crate', 'nets'], low: ['palm', 'nets', 'rock', 'boat'] },
      blight: { up: ['rubble', 'crate', 'rock'], low: ['deadtree', 'rubble', 'rock', 'brokencol', 'bones'] },
      ruin: { up: ['rubble', 'crate', 'rock'], low: ['deadtree', 'rubble', 'rock', 'brokencol'] },
    }[biome];
    const treeK = { meadow: 'tree', forest: 'tree', taiga: 'pine', ice: 'pine', mount: 'pine', swamp: 'deadtree', ash: 'deadtree', desert: 'palm', coast: 'palm', blight: 'deadtree', ruin: 'deadtree' }[biome];
    const doors = L.BUILDINGS.map((b) => b.door).concat(L.spawn ? [{ x: L.spawn[0], y: L.spawn[1] + 40 }] : []);   // и место появления у ворот — свободно
    const clashes = (k, x, y, s, onPlaza) => {
      const f = FOOT[k], rx = (f ? f[0] : 30) * s, ry = (f ? f[1] : 10) * s;
      if (x - rx < 60 || x + rx > W - 60 || y > HH - 6) return true;
      if (y > 1062 && TALL[k] && y - TALL[k] * s < 806) return true;   // ниже главной улицы — не закрывает здания заднего ряда
      if (!footOff(L, [x, y, rx, ry], 18, onPlaza)) return true;
      if (!onPlaza) for (const p of L.plazas) if (inPlaza(p, x, y, 40 + rx) || (TREE[k] && inPlaza(p, x, y - 90 * s, 70))) return true;   // крона дерева — не над площадью
      // 24.10 (снимок стримера): дерево не над скамейкой, колодцем, лотком, фонарём, кадкой (крона закрывала их)
      if (TREE[k]) for (const p of L.props) if (NEAR[p.k] && Math.abs(x - p.x) < 120 * s + 30 && y - p.y > -60 && y - p.y < 230 * s) return true;
      if (NEAR[k]) for (const p of L.props) if (TREE[p.k] && Math.abs(x - p.x) < 120 * (p.s || 1) + 30 && p.y - y > -60 && p.y - y < 230 * (p.s || 1)) return true;
      for (const d of doors) if (Math.hypot(x - d.x, (y - d.y) * 1.6) < rx + 90) return true;
      for (const p of L.props) { const g = FOOT[p.k] || [30, 10], ps = p.s || 1; if (Math.abs(x - p.x) < rx + g[0] * ps + 24 && Math.abs(y - p.y) < ry + g[1] * ps + 30) return true; }
      for (const b of L.bridges) if (x + rx > b.x0 - 50 && x - rx < b.x1 + 50) return true;
      if (L.river && Math.abs(x - L.river.x) < L.river.w / 2 + rx + 40) return true;
      for (const c of L.cottages) if (x + rx > c.x0 - 30 && x - rx < c.x1 + 30 && y > c.base - 90 && y - ry < c.base + 40) return true;
      for (const o of L.OBST) if (o.r && x + rx > o.r[0] - 30 && x - rx < o.r[1] + 30 && y - ry < o.r[2] + 30) return true;
      return false;
    };
    const place = (k, x, y, s, onPlaza) => {
      x = r1(x); y = r1(y); s = +(s || 1).toFixed(2);
      if (clashes(k, x, y, s, onPlaza)) return false;
      const f = FOOT[k], p = { k, x, y, s, v: r1(R() * 1000) };
      if (f) p.ob = { e: [x, y, r1(f[0] * s), r1(f[1] * s)], ...(WATERK[k] ? { water: true } : {}) };
      L.props.push(p); return true;
    };
    const SET = !V;
    for (const p of L.plazas) {
      const ms = p.k === 'central' ? (V ? 0.9 : capital ? 1.2 : 1.05) : 1;
      if (p.mark) place(p.mark, p.x, p.y + 6, ms, true);
      const at = (a, r) => [p.x + Math.cos(a) * p.rx * r, p.y + Math.sin(a) * p.ry * r];
      if (p.k === 'market') {   // лотки рядом в середине, между ними — проходы
        const n = Math.max(2, Math.min(4, Math.floor((p.rx * 2 - 120) / 210)));
        for (let i = 0; i < n; i++) place('stall', p.x + (i - (n - 1) / 2) * 210, p.y + (i % 2 ? 26 : -10), 1, true);
      }
      if (p.k === 'garden') for (const a of [-0.6, 0.6, Math.PI - 0.6, Math.PI + 0.6]) { const [x, y] = at(a, 0.62); place('hedge', x, y, 0.9, true); }
      for (const a of [0, Math.PI]) { const [x, y] = at(a, p.k === 'market' ? 0.86 : 0.6); place('bench', x, y, 1, true); }
      if (SET || p.k === 'central') for (const a of p.k === 'central' ? [-2.4, -0.74, 0.74, 2.4] : [-2.4, -0.74]) { const [x, y] = at(a, 0.9); place('lamp', x, y, 1, true); }
      if (p.k === 'central' && !V) for (const a of [Math.PI / 2 - 0.9, Math.PI / 2 + 0.9]) { const [x, y] = at(a, 0.62); place('planter', x, y, 1, true); }
    }
    // тренировочное чучело у Тренера
    { const tb = L.BUILDINGS.find((b) => b.id === 'trainer'); if (tb) for (const dx of [110, -110, 150, -150]) if (place('dummy', tb.door.x + dx, 846, 1)) break; }
    // фонари вдоль главной улицы и бульвара (посёлок, столица), скамейки под бульваром
    if (SET) {
      for (let x = 300 + R() * 200; x < W - 200; x += 640 + R() * 200) { const y = roadY(L, x) + L.pathW.road + 30; place('lamp', x, y, 1) || place('lamp', x + 60, y, 1); }
      for (let x = 420 + R() * 300; x < W - 200; x += 900 + R() * 300) { const y = roadY(L, x, 'boul') - L.pathW.boul - 26; place('lamp', x, y, 1) || place('lamp', x + 70, y, 1); }
    }
    for (let x = 200 + R() * 200; x < W - 200; x += 560 + R() * 260) { const y = roadY(L, x, 'boul') + L.pathW.boul + 30; place('bench', x, y, 1) || place('bench', x + 80, y, 1); }
    // деревья вдоль нижнего края (под бульваром)
    for (let x = 120 + R() * 100; x < W - 120; x += 300 + R() * 260) place(R() < 0.75 ? treeK : pick(KIT.low), x, Y1 - 4 - R() * 18, 0.85 + R() * 0.3);
    // наполнение: у стен заднего ряда (между дверями) и в нижней части (лужайки между площадями, улицами и домиками)
    const nUp = Math.round(W / 300 * Math.min(1.2, 0.6 + nat * 0.35)), nLow = Math.round(W / 190 * Math.min(1.3, 0.5 + nat * 0.5));
    for (let i = 0, n = 0; i < nUp * 8 && n < nUp; i++) if (place(pick(KIT.up), 80 + R() * (W - 160), 826 + R() * 14, 0.85 + R() * 0.3)) n++;
    for (let i = 0, n = 0; i < nLow * 10 && n < nLow; i++) { const k = R() < 0.35 ? treeK : pick(KIT.low); if (place(k, 80 + R() * (W - 160), gapTop + 24 + R() * (Y1 - gapTop - 30), 0.85 + R() * 0.35)) n++; }
    L.props.sort((a, b) => a.y - b.y || a.x - b.x);
    if (!L.spawn) L.spawn = [200, r1(roadY(L, 200))];
    const base = L.OBST.concat([{ r: [0, 60, HH] }, { r: [W - 60, W, HH] }]);   // край мира: стена / частокол
    const rebuild = () => { L.OBST = base.concat(L.props.filter((p) => p.ob).map((p) => p.ob)); };
    rebuild();
    // карманы: место, куда можно встать, но не дойти от ворот — убираем ближайший предмет, пока все свободные клетки сетки не связаны
    // с входом (проверка по 4 соседям — строже поиска пути)
    for (let it = 0; it < 12; it++) {
      const lost = pockets(L);
      if (!lost.length) break;
      const drop = new Set();
      for (const [x, y] of lost) { let best = null, bd = Infinity; for (const p of L.props) if (p.ob && !L.plazas.some((q) => q.mark === p.k && q.x === p.x)) { const d = Math.hypot(p.x - x, (p.y - y) * 1.5); if (d < bd) { bd = d; best = p; } } if (best) drop.add(best); }
      if (!drop.size) break;
      L.props = L.props.filter((p) => !drop.has(p)); rebuild();
    }
    return L;
  }
  /** Клетки сетки, где можно стоять, но не дойти от ворот (по 4 соседям): [[x, y], …]. */
  function pockets(L, m0) {
    const m = m0 || map(L, { magic: true }), { C, cols, rows, G } = m.grid;
    const seen = new Uint8Array(cols * rows), q = [];
    const s0 = m.nearest(L.spawn[0], L.spawn[1]), si = Math.floor((s0[1] - Y0) / C) * cols + Math.floor(s0[0] / C);
    if (G[si]) { seen[si] = 1; q.push(si); }
    while (q.length) { const i = q.pop(), c = i % cols, r = (i / cols) | 0; for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue; const j = nr * cols + nc; if (G[j] && !seen[j]) { seen[j] = 1; q.push(j); } } }
    const lost = []; for (let i = 0; i < G.length; i++) if (G[i] && !seen[i]) lost.push([(i % cols) * C + C / 2, Y0 + ((i / cols) | 0) * C + C / 2]);
    return lost;
  }

  /** Карта для поиска пути (citymap.js makeFrom): o.magic — магическая лавка открыта зрителю (иначе её здания нет в списке). */
  function map(L, o) {
    const mg = !!(o && o.magic);
    return CM.makeFrom({ W: L.W, H: L.H, AREA: L.AREA, OBST: L.OBST, BUILDINGS: L.BUILDINGS.filter((b) => !b.magic || mg), HOT: L.HOT, home: L.spawn });
  }
  /** Где рисуется каждый участок заднего ряда: { k, x0, x1, top (при нынешних уровнях), top5 (при L5) } — рамка здания ±ART_PAD
   *  (свесы крыш, факелы, лотки, башенки), у Кузни — от навеса до правого края Кузни; наполнители — участок ±ART_PAD. */
  function artBoxes(L) {
    const out = [];
    for (const lot of L.lots) {
      const f = L.fr && L.fr[lot.k], top5 = BASE - lotTall(L, lot);
      let x0 = lot.x0 - ART_PAD, x1 = lot.x1 + ART_PAD, top = top5;
      if (lot.k === 'forge') { const g = L.fr.forge; x1 = g.x1 + ART_PAD; top = Math.min(L.fr.anvil.top, g.top) - 30; }
      else if (f) { x0 = f.x0 - ART_PAD; x1 = f.x1 + ART_PAD; top = f.top - 30; }
      out.push({ k: lot.k, x0, x1, top, top5 });
    }
    return out;
  }
  /** Проверка раскладки (тест и витрина): все здания, двери доступны от входа, предметы не на улицах, вода и памятники — не стоять,
   *  рисунки заднего ряда не задевают друг друга (и при L5), площади и улицы — в полосе. → список ошибок. */
  function check(L) {
    if (L.hand) return checkHand(L);
    const err = [], m = map(L, { magic: true }), need = Object.keys(META).filter((k) => k !== 'auction' || L.size !== 'village').concat(['mine']);
    for (const k of need) if (!L.BUILDINGS.some((b) => b.id === k)) err.push('нет здания ' + k);
    if (L.size === 'village' && L.BUILDINGS.some((b) => b.id === 'auction')) err.push('аукцион в деревне');
    const s = m.nearest(L.spawn[0], L.spawn[1]);
    for (const b of L.BUILDINGS) {
      const d = m.nearest(b.door.x, b.door.y);
      if (Math.hypot(d[0] - b.door.x, d[1] - b.door.y) > 40) err.push(`дверь ${b.id}: там нельзя стоять`);
      const p = m.path(s, [b.door.x, b.door.y]), e = p[p.length - 1];
      if (Math.hypot(e[0] - d[0], e[1] - d[1]) > 24) err.push(`дверь ${b.id}: не дойти от входа`);
    }
    for (const p of L.props) { const f = p.ob ? p.ob.e : [p.x, p.y, 20, 8]; if (!footOff(L, f, 4, true)) err.push(`${p.k} на улице (${p.x}, ${p.y})`); }
    for (const lt of L.lots) if (lt.x1 > L.W - 40 || lt.x0 < 40) err.push(`участок ${lt.k} за краем`);
    // уровни: рамка здания — внутри участка, дверь — внутри рамки, место клика — по рамке, верх — в кадре (выше 150 не рисуем)
    for (const b of L.BUILDINGS) {
      const f = L.fr && L.fr[b.id], lot = L.lots.find((x) => x.k === (b.id === 'anvil' ? 'forge' : b.id));
      if (!f || !lot) { err.push(`нет рамки ${b.id}`); continue; }
      if (!(f.lv >= LV_MIN && f.lv <= LV_MAX) || (f.lv !== L.lv[b.id] && !f.fixed)) err.push(`уровень ${b.id}: ${f.lv}`);
      if (f.x0 < lot.x0 || f.x1 > lot.x1) err.push(`рамка ${b.id} шире участка`);
      if (b.id !== 'anvil' && (b.door.x - 24 < f.x0 || b.door.x + 24 > f.x1)) err.push(`дверь ${b.id} вне рамки`);
      if (f.top < 150 || [f.x0, f.x1, f.top, f.B].some((v) => !Number.isFinite(v))) err.push(`рамка ${b.id}: верх ${f.top}`);
      if (b.hit[2] > f.top + 10 || b.hit[3] < 790) err.push(`место клика ${b.id} не по рамке`);
    }
    // рисунки заднего ряда (рамки ±30, при нынешних уровнях и при L5 — участки с зазором) не пересекаются
    const A = artBoxes(L);
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const a = A[i], b = A[j]; if (a.x1 > b.x0 && b.x1 > a.x0) err.push(`рисунок ${a.k} задевает ${b.k}`); }
    for (let i = 1; i < L.lots.length; i++) if (L.lots[i].x0 - L.lots[i - 1].x1 < MINGAP - 1) err.push(`участки ${L.lots[i - 1].k} и ${L.lots[i].k} ближе ${MINGAP} (L5 заденет)`);
    // вода и памятники — встать нельзя; площади и улицы — в полосе
    for (const o of L.OBST) if (o.water && o.b) { const ya = Math.max(o.b[1], L.AREA.y0) + 8, yb = Math.min(o.b[3], L.AREA.y1) - 8; if (yb > ya && m.free((o.b[0] + o.b[2]) / 2, (ya + yb) / 2)) err.push(`вода: можно встать (${o.b[0]}, ${r1((ya + yb) / 2)})`); }
    for (const p of L.plazas) {
      if (p.y - p.ry < L.AREA.y0 || p.y + p.ry > L.AREA.y1 || p.x - p.rx < 60 || p.x + p.rx > L.W - 60) err.push(`площадь ${p.k} за краем`);
      if (p.mark && !L.props.some((q) => q.k === p.mark && Math.abs(q.x - p.x) < 2)) err.push(`площадь ${p.k}: нет памятника ${p.mark}`);
      if (p.mark && m.free(p.x, p.y + 6)) err.push(`площадь ${p.k}: на памятник можно встать`);
      const d = m.nearest(p.x, p.y + p.ry * 0.7), q = m.path(s, d), e = q[q.length - 1];
      if (Math.hypot(e[0] - d[0], e[1] - d[1]) > 24) err.push(`площадь ${p.k}: не дойти`);
    }
    if (!L.plazas.some((p) => p.k === 'central')) err.push('нет центральной площади');
    for (const r of L.roads) for (const p of r.pts) if (p[1] - r.w < L.AREA.y0 + 20 || p[1] + r.w > L.AREA.y1 + 40) err.push(`улица ${r.k} вне полосы`);
    for (const p of L.props) if (p.y > 1062 && TALL[p.k] && p.y - TALL[p.k] * (p.s || 1) < 800) err.push(`${p.k} закрывает здания (${p.x}, ${p.y})`);
    if (pockets(L, m).length) err.push('есть места, куда не дойти от ворот');
    // 24.10: ручей не задевает зданий, домиков, площадей, предметов; улицы пересекают его только по мостам
    if (L.river) {
      const a = L.river.x - L.river.w / 2, b = L.river.x + L.river.w / 2, over = (x0, x1) => x1 > a && x0 < b;
      for (const A2 of artBoxes(L)) if (A2.k !== 'brook' && over(A2.x0, A2.x1)) err.push(`ручей задевает ${A2.k}`);
      for (const c of L.cottages) if (over(c.x0, c.x1)) err.push('ручей задевает домик');
      for (const p of L.plazas) if (over(p.x - p.rx, p.x + p.rx)) err.push(`ручей задевает площадь ${p.k}`);
      for (const p of L.props) { const e = p.ob ? p.ob.e : [p.x, p.y, 20, 8]; if (over(e[0] - e[2], e[0] + e[2])) err.push(`ручей задевает ${p.k}`); }
      for (const r of L.roads) for (let i = 1; i < r.pts.length; i++) {
        const P0 = r.pts[i - 1], P1 = r.pts[i]; if ((P0[0] - L.river.x) * (P1[0] - L.river.x) > 0) continue;
        const y = P0[1] + (P1[1] - P0[1]) * (L.river.x - P0[0]) / ((P1[0] - P0[0]) || 1);
        if (!L.bridges.some((br) => y - r.w >= br.y0 - 2 && y + r.w <= br.y1 + 2)) err.push(`улица ${r.k} пересекает ручей без моста`);
      }
      if (L.river.y1 < L.H) err.push('ручей обрывается до края');
    }
    return err;
  }

  /* ===================== 28.10 (art/district-towns): РУЧНЫЕ ДЕРЕВНИ ★1 =====================
     Решение стримера 28.10: деревни ★1 рисуются вручную - своя планировка, свои здания и мелочи (CITY.md «Ручные деревни»). Реестр - HAND:
     для этих округов generate() берёт файл деревни packages/world/villages/<id>.js (раскладка layout() + рисунок art для townart.js) и строит ту же
     раскладку L, что генератор (здания, двери, hit, рамки уровней, улицы, площади, вода, предметы, препятствия), - city.js, citygl.js, citymap.js,
     присутствие и покупки не меняются. Нет файла (страница его не загрузила) - генератор, как раньше. Отличия от генератора: здания не только
     в заднем ряду - ниже по улице (основание lot.B > 800, масштаб по глубине lot.s, сквозь здание не ходят - препятствие b), улицы - любые ломаные,
     вода - любые прямоугольники и эллипсы, мосты - где их положил художник. Ворота, Кузня с навесом-Заточкой и Шахта - в заднем ряду (сцена
     Заточки и рисунок шахты берут их место). Проверка - checkHand (те же правила, что check: двери, площади, вода, карманы, предметы не на улицах). */
  const HAND = ['d02', 'd04', 'd141', 'd142', 'd143', 'd146', 'd148', 'd62', 'd65', 'd68', 'd70', 'd71', 'd76', 'd78', 'd79', 'd85', 'd88', 'd112', 'd113', 'd115', 'd124', 'd125', 'd21', 'd22', 'd26', 'd38', 'd12', 'd139', 'tree', 'tower'];   // id округов с ручной деревней (файл packages/world/villages/<id>.js) - добавляй по одной
  /** Что загрузить странице до generate(): [] - город генератора; ['/site/villages/<id>.js'] - ручная деревня. */
  const prepFiles = (id) => (HAND.includes(String(id)) && !VG(String(id)) ? [`/site/villages/${String(id)}.js`] : []);
  /** Загрузить файл ручной деревни (если нужен): load(src) → Promise. Ошибка - не страшно: generate() возьмёт генератор. */
  function prep(id, load) { return Promise.all(prepFiles(id).map((f) => Promise.resolve().then(() => load(f)).catch(() => null))); }
  const HAND_SPEC = { W: 4400, H: 1500 };
  // глубина: здание ниже по улице рисуется крупнее (человечек ниже полосы Ярмарки - в полный рост)
  const depthK = (B) => (B <= 820 ? 1 : +(1 + 0.42 * Math.min(1, (B - 800) / 262)).toFixed(2));
  function buildHand(t, hv) {
    const id = String(t.id), R = rng(hash(`${id}:village:${hv.ver || 1}`));
    const biome = NATURE[t.biome] ? t.biome : 'meadow', kind = String(t.kind || 'town'), special = SPECIAL[kind] ? kind : null;
    const helpers = { R, roadY: (pts, x) => lineY(pts, x), variant: t.variant || hv.variant || null, depthK, biome };
    const S = { ...HAND_SPEC, ...hv.layout(helpers) };
    const W = S.W, HH = S.H, Y1 = HH - 34;
    const L = { v: VER, hand: id, hver: hv.ver || 1, id, seed: hash(`${id}:village:${hv.ver || 1}`), lv: levelsOf(t, t.levels), build: buildOf(t.building), name: String(t.town || t.name || id), terr: String(t.name || ''),
      biome, danger: 1, kind, size: 'village', capital: false, special, W, H: HH, AREA: { x0: 40, x1: W - 40, y0: Y0, y1: Y1 }, lots: [], props: [], water: [], bridges: [], plazas: [], cottages: [], BUILDINGS: [], HOT: [], OBST: [],
      roads: [], road: [], boul: [], spurs: [], flares: [], river: null, pathW: { road: 46, boul: 40, cross: 32, spur: 28 }, hx: S.extra || {}, story: hv.story || '' };
    const B = (bid, hit, door, extra) => { const m = META[bid] || (bid === 'mine' ? MINE : null); L.BUILDINGS.push({ id: bid, title: m.title, sub: m.sub, icon: m.icon, ...(m.soon ? { soon: true } : {}), ...(m.magic ? { magic: true } : {}), hit, door, ...(L.build[bid] ? { build: L.build[bid] } : {}), ...(extra || {}) }); };
    // улицы (любые ломаные: { k, w, pts }), площади, вода, мосты
    for (const r of S.roads || []) L.roads.push({ k: r.k || 'lane', w: r.w || 36, pts: r.pts.map((p) => [r1(p[0]), r1(p[1])]) });
    const main = L.roads.find((r) => r.k === 'main') || L.roads[0];
    L.road = main ? main.pts : [[40, 905], [W - 40, 905]]; L.boul = (L.roads.find((r) => r.k === 'boul') || main || { pts: L.road }).pts;
    for (const p of S.plazas || []) L.plazas.push({ k: p.k, x: p.x, y: p.y, rx: p.rx, ry: p.ry, shape: p.shape || 'ell', mark: p.mark || null, ...(p.ms ? { ms: p.ms } : {}), ...(p.paved === false ? { green: true } : {}) });
    for (const w of S.water || []) { L.water.push(w); L.OBST.push({ ...(w.e ? { e: w.e } : { b: w.b }), water: true }); }
    for (const b of S.bridges || []) L.bridges.push({ ...b });
    // (вода ручной деревни - S.water; L.river - только ручей генератора, его рисует townart)
    // здания: участки (lot), рамки уровней, двери, места клика
    const ORDER = ['gate', 'hall', 'trainer', 'board', 'storage', 'forge', 'tent', 'shop', 'magic', 'mine'];
    for (const k of ORDER) {
      const d = S.b && S.b[k]; if (!d) continue;
      const Bb = d.B || BASE, lot = { k, x0: r1(d.x0), x1: r1(d.x1), base: Bb, v: r1(R() * 1000), ...(Bb > 800 ? { B: Bb, s: d.s || depthK(Bb) } : {}), ...(d.flip ? { flip: true } : {}), ...(d.art ? { art: d.art } : {}) };
      const cx = r1(d.door != null ? d.door : (lot.x0 + lot.x1) / 2);
      if (k === 'forge') { lot.anvil = d.anvil || lot.x0 + 120; lot.fx0 = d.fx0 || lot.x0 + 220; }
      L.lots.push(lot);
      const dy = Bb > 800 ? Bb + 26 : k === 'gate' ? 830 : k === 'mine' ? 826 : 822;
      if (k === 'gate') { B('gate', [lot.x0, lot.x1, 260, 800], { x: cx, y: dy }); continue; }
      if (k === 'forge') {
        const ax = lot.anvil, fx0 = lot.fx0;
        L.anvil = { x: ax, base: 810 };
        B('anvil', [ax - 130, ax + 150, 600, 880], { x: ax + 100, y: d.anvilDoorY || 890 }, { tag: [ax - 20, 552] });
        B('forge', [fx0, lot.x1, 300, 800], { x: r1(d.door != null ? d.door : (fx0 + lot.x1) / 2), y: 822 });
        L.HOT.push({ b: 'anvil', what: 'Наковальня', ol: 'anv', r: [ax - 80, ax + 65, 728, 818] }, { b: 'anvil', what: 'Табличка', ol: 'sign', r: [ax - 116, ax + 76, 566, 666] }, { b: 'anvil', what: 'Кузнец', ol: 'smith', r: [ax + 15, ax + 140, 638, 836] });
        L.OBST.push({ r: [ax - 120, ax + 150, 852] });
        continue;
      }
      if (k === 'mine') { B('mine', [lot.x0, lot.x1, 554, 800], { x: cx, y: dy }); L.HOT.push({ b: 'mine', what: 'Вход в шахту', ol: 'mine', r: [cx - 70, cx + 70, 660, 800] }); L.mine = { x: cx, x0: lot.x0, x1: lot.x1, door: { x: cx, y: dy } }; continue; }
      B(k, [lot.x0, lot.x1, 300, Bb > 800 ? Bb + 6 : 800], { x: cx, y: dy });
      if (Bb > 800) L.OBST.push({ b: [lot.x0 + 6, r1(Bb - 58 * lot.s), lot.x1 - 6, Bb], bld: k });   // сквозь здание не ходят (за ним - можно: закрыт рисунком)
    }
    applyLevels(L);
    // тропинки от дверей к ближайшей улице (вниз; spur: 'up' - вверх; spur: [[x, y], [x, y]] - своя), стыки со скруглением (L.flares)
    const yOn = (r, x) => { const P = r.pts; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; if ((x - a[0]) * (x - b[0]) <= 0 && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return null; };
    const spurTo = (x, y0, dir) => { let best = null; for (const r of L.roads) { const y = yOn(r, x); if (y == null) continue; const e = y - dir * r.w; if ((e - y0) * dir > -4 && (!best || Math.abs(e - y0) < Math.abs(best.e - y0))) best = { y, e, w: r.w }; } return best; };
    for (const b of L.BUILDINGS) {
      if (b.id === 'anvil') continue;
      const d = (S.b && S.b[b.id]) || {}, x = b.door.x, y0 = b.door.y > 840 ? b.door.y - 18 : 806;
      if (d.spur === false) continue;
      if (Array.isArray(d.spur)) { L.spurs.push(d.spur.map((p) => [r1(p[0]), r1(p[1])])); continue; }
      const dir = d.spur === 'up' ? -1 : 1, t2 = spurTo(x, y0, dir); if (!t2) continue;
      L.spurs.push([[x, y0], [x, r1(t2.y)]]); L.flares.push({ x, ye: r1(t2.y - dir * t2.w + dir * 2), w: L.pathW.spur, dir: -dir });
    }
    // стыки улиц: конец улицы, что подходит к другой сверху или снизу, - со скруглением
    for (const r of L.roads) for (const P of [r.pts[0], r.pts[r.pts.length - 1]]) for (const q of L.roads) {
      if (q === r) continue; const y = yOn(q, P[0]); if (y == null || Math.abs(y - P[1]) > q.w + 6) continue;
      const other = P === r.pts[0] ? r.pts[1] : r.pts[r.pts.length - 2]; if (Math.abs(other[1] - P[1]) < Math.abs(other[0] - P[0])) continue;   // подходит сбоку - без скругления
      const dir = other[1] > P[1] ? 1 : -1; L.flares.push({ x: P[0], ye: r1(y + dir * q.w - dir * 2), w: r.w, dir });
    }
    // домики (жилые; в них не заходят) - препятствия
    for (const c of S.houses || []) { const h = { x0: r1(c.x0), x1: r1(c.x1), base: r1(c.base), v: c.v != null ? c.v : r1(R() * 1000), ...(c.s ? { s: c.s } : {}), ...(c.kind ? { kind: c.kind } : {}) }; L.cottages.push(h); L.OBST.push({ b: [h.x0 + 6, h.base - 52, h.x1 - 6, h.base] }); }
    if (!L.spawn) { const g = L.BUILDINGS.find((b) => b.id === 'gate'); L.spawn = S.spawn || (g ? [g.door.x + 120, r1(spurTo(g.door.x + 120, 806, 1) ? spurTo(g.door.x + 120, 806, 1).y : 900)] : [200, 900]); }
    // предметы: памятники площадей, руками (props: [k, x, y, s]) и россыпью (fill: { k: [...], n, box: [x0, y0, x1, y1], s: [a, b] } - не на улицах, не у дверей)
    const doors = L.BUILDINGS.map((b) => b.door).concat([{ x: L.spawn[0], y: L.spawn[1] + 40 }]);
    // свои предметы деревни: kinds: { k: { foot: [rx, ry] (основание - препятствие), tall (высота рисунка), tree (крона - не над площадью), water } }
    const KD = S.kinds || {}, footOf = (k) => FOOT[k] || (KD[k] && KD[k].foot) || null, tallOf = (k) => TALL[k] || (KD[k] && KD[k].tall) || 0, isTree = (k) => TREE[k] || (KD[k] && KD[k].tree);
    const add = (k, x, y, s, extra) => { const f = footOf(k) || (extra && extra.foot), p = { k, x: r1(x), y: r1(y), s: +(s || 1).toFixed(2), v: r1(R() * 1000), ...(extra || {}) }; delete p.foot; if (!TALL[k] && tallOf(k)) p.tall = tallOf(k); if (f) p.ob = { e: [p.x, p.y, r1(f[0] * p.s), r1(f[1] * p.s)], ...(WATERK[k] || (KD[k] && KD[k].water) || (extra && extra.water) ? { water: true } : {}) }; L.props.push(p); return p; };
    for (const p of L.plazas) if (p.mark) add(p.mark, p.x, p.y + 6, p.ms || 0.9);
    for (const q of S.props || []) add(q[0], q[1], q[2], q[3], q[4]);
    const busy = (k, x, y, s) => {
      const f = footOf(k), rx = (f ? f[0] : 30) * s, ry = (f ? f[1] : 10) * s;
      if (x - rx < 60 || x + rx > W - 60 || y > Y1 - 4 || y < 812) return true;
      if (y > 1062 && tallOf(k) && y - tallOf(k) * s < 806) return true;
      if (!footOff(L, [x, y, rx, ry], 18)) return true;
      for (const p of L.plazas) if (inPlaza(p, x, y, 40 + rx) || (isTree(k) && inPlaza(p, x, y - 90 * s, 70))) return true;
      for (const d of doors) if (Math.hypot(x - d.x, (y - d.y) * 1.6) < rx + 90) return true;
      for (const p of L.props) { const g = (p.ob ? [p.ob.e[2] / (p.s || 1), p.ob.e[3] / (p.s || 1)] : [30, 10]), ps = p.s || 1; if (Math.abs(x - p.x) < rx + g[0] * ps + 24 && Math.abs(y - p.y) < ry + g[1] * ps + 30) return true; }
      if (isTree(k)) for (const p of L.props) if (NEAR[p.k] && Math.abs(x - p.x) < 120 * s + 30 && y - p.y > -60 && y - p.y < 230 * s) return true;
      for (const c of L.cottages) if (x + rx > c.x0 - 30 && x - rx < c.x1 + 30 && y > c.base - 90 && y - ry < c.base + 40) return true;
      for (const lt of L.lots) if (lt.B && x + rx > lt.x0 - 30 && x - rx < lt.x1 + 30 && y > lt.B - 80 && y - ry < lt.B + 40) return true;
      if (isTree(k)) for (const lt of L.lots) { const lb = lt.B || BASE; if (x + 60 * s > lt.x0 && x - 60 * s < lt.x1 && y > lb && y < lb + 330) return true; }   // крона не закрывает здание
      for (const b of L.bridges) if (x + rx > b.x0 - 50 && x - rx < b.x1 + 50 && y + ry > b.y0 - 60 && y - ry < b.y1 + 60) return true;
      for (const o of L.OBST) {
        if (o.water && o.b && x + rx > o.b[0] - 40 && x - rx < o.b[2] + 40 && y + ry > o.b[1] - 30 && y - ry < o.b[3] + 30) return true;
        if (o.water && o.e && Math.hypot((x - o.e[0]) / (o.e[2] + rx + 40), (y - o.e[1]) / (o.e[3] + ry + 30)) < 1) return true;
        if (o.r && x + rx > o.r[0] - 30 && x - rx < o.r[1] + 30 && y - ry < o.r[2] + 30) return true;
        if (o.b && !o.water && x + rx > o.b[0] - 30 && x - rx < o.b[2] + 30 && y > o.b[1] - 80 && y - ry < o.b[3] + 36) return true;
      }
      return false;
    };
    for (const F of S.fill || []) {
      const ks = Array.isArray(F.k) ? F.k : [F.k], [x0, y0, x1, y1] = F.box || [80, 830, W - 80, Y1 - 6], [sa, sb] = F.s || [0.85, 1.15];
      for (let i = 0, n = 0; i < F.n * 12 && n < F.n; i++) { const k = ks[Math.floor(R() * ks.length)], x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), sc = +(sa + R() * (sb - sa)).toFixed(2); if (!busy(k, x, y, sc)) { add(k, x, y, sc, { f: 1 }); n++; } }
    }
    L.props.sort((a, b) => a.y - b.y || a.x - b.x);
    const base = L.OBST.concat([{ r: [0, 60, HH] }, { r: [W - 60, W, HH] }]);
    const rebuild = () => { L.OBST = base.concat(L.props.filter((p) => p.ob).map((p) => p.ob)); };
    rebuild();
    for (let it = 0; it < 12; it++) {   // карманы: только из россыпи (fill) убираем ближайший предмет; руками поставленные - ошибка проверки
      const lost = pockets(L); if (!lost.length) break;
      const drop = new Set();
      for (const [x, y] of lost) { let best = null, bd = Infinity; for (const p of L.props) if (p.ob && p.f) { const d = Math.hypot(p.x - x, (p.y - y) * 1.5); if (d < bd) { bd = d; best = p; } } if (best) drop.add(best); }
      if (!drop.size) break;
      L.props = L.props.filter((p) => !drop.has(p)); rebuild();
    }
    return L;
  }
  /** Проверка ручной деревни: те же правила, что check (двери и площади доступны, вода и памятники - не стоять, карманов нет, предметы не на улицах,
   *  рамки уровней), плюс: рисунки зданий одного ряда не задевают друг друга (и при L5), здание ниже по улице не закрывает задний ряд. */
  function checkHand(L) {
    const err = [], m = map(L, { magic: true }), need = Object.keys(META).filter((k) => k !== 'auction').concat(['mine']);
    for (const k of need) if (!L.BUILDINGS.some((b) => b.id === k)) err.push('нет здания ' + k);
    if (L.BUILDINGS.some((b) => b.id === 'auction')) err.push('аукцион в деревне');
    const s = m.nearest(L.spawn[0], L.spawn[1]);
    if (Math.hypot(s[0] - L.spawn[0], s[1] - L.spawn[1]) > 40) err.push('место появления в стене');
    for (const b of L.BUILDINGS) {
      const d = m.nearest(b.door.x, b.door.y);
      if (Math.hypot(d[0] - b.door.x, d[1] - b.door.y) > 40) err.push(`дверь ${b.id}: там нельзя стоять`);
      const p = m.path(s, [b.door.x, b.door.y]), e = p[p.length - 1];
      if (Math.hypot(e[0] - d[0], e[1] - d[1]) > 24) err.push(`дверь ${b.id}: не дойти от входа`);
      if (b.door.x < 60 || b.door.x > L.W - 60 || b.door.y < L.AREA.y0 || b.door.y > L.AREA.y1) err.push(`дверь ${b.id} за краем`);
    }
    for (const id of ['gate', 'forge', 'mine']) { const lot = L.lots.find((x) => x.k === id); if (lot && lot.B) err.push(`${id} - только в заднем ряду`); }
    for (const p of L.props) { const f = p.ob ? p.ob.e : [p.x, p.y, 20, 8]; if (!footOff(L, f, 4, true)) err.push(`${p.k} на улице (${p.x}, ${p.y})`); }
    for (const lt of L.lots) if (lt.x1 > L.W - 40 || lt.x0 < 40) err.push(`участок ${lt.k} за краем`);
    for (const b of L.BUILDINGS) {
      const f = L.fr && L.fr[b.id], lot = L.lots.find((x) => x.k === (b.id === 'anvil' ? 'forge' : b.id));
      if (!f || !lot) { err.push(`нет рамки ${b.id}`); continue; }
      if (!(f.lv >= LV_MIN && f.lv <= LV_MAX) || (f.lv !== L.lv[b.id] && !f.fixed)) err.push(`уровень ${b.id}: ${f.lv}`);
      if (f.x0 < lot.x0 || f.x1 > lot.x1) err.push(`рамка ${b.id} шире участка`);
      if (b.id !== 'anvil' && (b.door.x - 24 < f.x0 || b.door.x + 24 > f.x1)) err.push(`дверь ${b.id} вне рамки`);
      if (f.top < 150 || [f.x0, f.x1, f.top, f.B].some((v) => !Number.isFinite(v))) err.push(`рамка ${b.id}: верх ${f.top}`);
      if (b.hit[2] > f.top + 10 || b.hit[3] < 790) err.push(`место клика ${b.id} не по рамке`);
    }
    // рисунки зданий: ряд - по основанию; одного ряда - не пересекаются (при нынешних уровнях и при L5); ниже по улице - не закрывает задний ряд
    const box5 = (lot) => { const k = lot.k; if (k === 'mine') return { x0: lot.x0 - ART_PAD, x1: lot.x1 + ART_PAD, top: 530 }; if (k === 'forge') { const g = frame(L, lot, 'forge', LV_MAX); return { x0: lot.x0 - ART_PAD, x1: g.x1 + ART_PAD, top: Math.min(g.top, GEO.anvil.top[LV_MAX - 1]) - 30 }; } const g = frame(L, lot, k, LV_MAX); return { x0: lot.x0 - ART_PAD, x1: lot.x1 + ART_PAD, top: g.top - 30 }; };
    const rowOf = (lot) => (lot.B ? lot.B : BASE);
    const A = L.lots.map((lot) => ({ lot, ...box5(lot), B: rowOf(lot) }));
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
      const a = A[i], b = A[j]; if (!(a.x1 > b.x0 && b.x1 > a.x0)) continue;
      if (Math.abs(a.B - b.B) < 60) err.push(`рисунок ${a.lot.k} задевает ${b.lot.k}`);
      else { const lo = a.B > b.B ? a : b, hi = lo === a ? b : a; if (lo.top < hi.B + 6) err.push(`${lo.lot.k} закрывает ${hi.lot.k}`); }
    }
    for (const c of L.cottages) for (const a of A) {
      if (!(c.x1 > a.x0 && c.x0 < a.x1)) continue;
      if (Math.abs(c.base - a.B) < 70) err.push(`домик задевает ${a.lot.k}`);
      else if (c.base > a.B && c.base - 300 * depthK(c.base) < a.B + 6) err.push(`домик закрывает ${a.lot.k}`);   // домик ниже по улице (рисунок до ~300 px × глубина)
    }
    for (const o of L.OBST) if (o.water && o.b) { const ya = Math.max(o.b[1], L.AREA.y0) + 8, yb = Math.min(o.b[3], L.AREA.y1) - 8; if (yb > ya && m.free((o.b[0] + o.b[2]) / 2, (ya + yb) / 2)) err.push(`вода: можно встать (${o.b[0]}, ${r1((ya + yb) / 2)})`); }
    for (const o of L.OBST) if (o.water && o.e && o.e[1] > L.AREA.y0 && m.free(o.e[0], o.e[1])) err.push(`вода: можно встать (${o.e[0]}, ${o.e[1]})`);
    for (const p of L.plazas) {
      if (p.y - p.ry < L.AREA.y0 || p.y + p.ry > L.AREA.y1 || p.x - p.rx < 60 || p.x + p.rx > L.W - 60) err.push(`площадь ${p.k} за краем`);
      if (p.mark && !L.props.some((q) => q.k === p.mark && Math.abs(q.x - p.x) < 2)) err.push(`площадь ${p.k}: нет памятника ${p.mark}`);
      if (p.mark && m.free(p.x, p.y + 6)) err.push(`площадь ${p.k}: на памятник можно встать`);
      const d = m.nearest(p.x, p.y + p.ry * 0.7), q = m.path(s, d), e = q[q.length - 1];
      if (Math.hypot(e[0] - d[0], e[1] - d[1]) > 24) err.push(`площадь ${p.k}: не дойти`);
    }
    if (!L.plazas.some((p) => p.k === 'central')) err.push('нет центральной площади');
    for (const r of L.roads) for (const p of r.pts) if (p[1] - r.w < L.AREA.y0 + 6 || p[1] + r.w > L.AREA.y1 + 40) err.push(`улица ${r.k} вне полосы (${p[0]}, ${p[1]})`);
    for (const p of L.props) { const tl = TALL[p.k] || p.tall; if (p.y > 1062 && tl && p.y - tl * (p.s || 1) < 800) err.push(`${p.k} закрывает здания (${p.x}, ${p.y})`); }
    for (const p of L.props) if (p.ob && !p.ob.water && !L.plazas.some((q) => q.mark === p.k)) for (const b of L.BUILDINGS) if (Math.hypot(p.x - b.door.x, (p.y - b.door.y) * 1.6) < (p.ob.e[2] || 20) + 40) err.push(`${p.k} у двери ${b.id}`);
    if (pockets(L, m).length) err.push('есть места, куда не дойти от ворот');
    // мосты: по воде под мостом можно пройти (мост - не препятствие), вода не заходит на улицы мимо мостов
    for (const br of L.bridges) if (!m.free((br.x0 + br.x1) / 2, (br.y0 + br.y1) / 2)) err.push(`мост (${br.x0}, ${br.y0}): нельзя пройти`);
    return err;
  }
  /** 29.10 (Шахта 3.0, шаг 5): товар лавки по уровню здания: ур. 1 - 60% витрины, каждый уровень +10%, ур. 5 - всё; эпические и
   *  легендарные вещи - только с ур. 5. Выбор вещей - по id (у всех зрителей одинаковый). */
  function goodsOk(id, rarity, lv) { lv = Math.max(1, Math.min(LV_MAX, Math.round(+lv) || 1)); if ((rarity === 'epic' || rarity === 'legendary') && lv < 5) return false; return hash('goods:' + id) % 100 < [0, 60, 70, 80, 90, 100][lv]; }
  return { goodsOk, VER, MINE, H, HEIGHTS, SIZES, CAPITAL_PLUS, MINGAP, ART_PAD, META, MARK, LV_IDS, LV_MIN, LV_MAX, GEO, FOOT, TALL, baseLevel, levelsOf, frame, relevel, seedOf, hash, generate, map, check, artBoxes, pockets,
    offPaths, footOff, inPlaza, roadY, scaleAt, buildOf, buildLeft, buildMsg, buildClock, HAND, prep, prepFiles, depthK, checkHand };
});
