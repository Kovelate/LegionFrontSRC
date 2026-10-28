/* 23.10: Промысел города — локация, по которой ходят (как «Город»), прокрутка вверх-вниз (как в Gold and Goblins; удобно на телефоне).
   Внизу — вход: подъёмник в город, NPC-скупщик (сдать добытое за награды, потом — его поручения), вагонетка, доска поручений.
   Выше — зал этажа: 7 столбцов × 12 рядов камней (раскладка — генератор products/legion/modules/mine/minegen.js, клетка в клетку: ряд 11 —
   у входа, ряд 0 — у спуска). Ходят только по расчищенному; доступный камень (рядом с расчищенным) герой копает сам. Наверху —
   клеть на следующий этаж (горит, когда этаж расчищен). На каждом камне — его уровень: чем выше, тем крупнее и дольше копать.
   Камни разные: валуны, гранёные глыбы, слоистые, мшистые, жеоды; цвет — по слою глубины (бурые → серые → тёмные со всполохами);
   руда — своим видом (уголь — чёрные сколы, железо — ржавые прожилки, серебро и золото — самородки с блеском, кристаллы торчат).
   Вид спереди-сверху: предметы стоят на полу, сортируются по y. Только SVG-строки, без анимаций.
   window.LGCraftWorld.build(F, o) → { W, H, VX0, VW, back, props: [{ svg, x, y, i?, obj? }], cells: [{ i, x, y, cx, cy }], entry, exit, npc, cellAt(x, y) }
   o: { dug, prog - { i: 0…1 }, front - Set, special - подпись особого этажа }. VX0/VW - что показывать по ширине на ПК (бока - декор).
   25.10: o.art - новые рисунки камней, руды и предметов входа (mine-art.js, обновление шахты mine2); нет - рисуем как раньше.
   o.rockPal(cell, L) → [основной, светлый, тёмный] - свой цвет породы (темы глубины); иначе - L.rock / L.hard. С art: rk - { i: svg камня }. */
(function () {
  'use strict';
  // 26.10 (lib/world): размеры зала, предметы входа (FOOT, free, route) и случайность по зерну - библиотека мира (/lib/world.js,
  // packages/world; её же берёт сервер). Здесь - только рисунок
  const WL = window.LGWorldLib, MW = WL.mine;
  const INK = '#15122e', GW = MW.GW, GH = MW.GH;
  const CW = MW.CW, RH = MW.RH;                   // клетка зала
  const SIDE = MW.SIDE, W = MW.W;                 // мир по ширине: стены по бокам
  const TOP = MW.TOP, Y0 = MW.Y0, GRID_H = MW.GRID_H;
  const H = MW.H;
  const VW = MW.VW, VX0 = MW.VX0;                 // на ПК видно шире: по бокам — своды пещеры
  const f1 = (v) => +(+v).toFixed(1);
  const rng = WL.rng;
  const O = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  function blob(cx, cy, rx, ry, r, n = 9, jit = 0.16, flat = false) {
    const pts = []; const a0 = r() * Math.PI * 2;
    for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2, k = 1 - jit + r() * jit * 2; let py = cy + Math.sin(a) * ry * k; if (flat && py > cy + ry * 0.6) py = cy + ry * 0.6; pts.push([cx + Math.cos(a) * rx * k, py]); }
    let d = ''; for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], nn = pts[(i + 2) % n]; if (!i) d += `M${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)} `; d += `Q${f1(q[0])} ${f1(q[1])} ${f1((q[0] + nn[0]) / 2)} ${f1((q[1] + nn[1]) / 2)} `; }
    return d + 'Z';
  }
  const RES = {
    stone: '#9a8e80', basalt: '#4a4248', coal: '#24232a', iron: '#c8643a', silver: '#eef3fa', gold: '#ffcf3a', crystal: '#7fe8ff', sulfur: '#f2e24a', obsidian: '#7a4ad0',
    wood: '#8a5a32', pine: '#7a4a2a', resin: '#f0a030', moss: '#7fc04a', oak: '#b07a3a', heartwood: '#d8502a', spiritwood: '#9ad8ff', furs: '#b07a50', cedar: '#d8884a',
    grain: '#f0c95a', flax: '#9ab4f0', wool: '#f6f2ea', honey: '#ffb52a', seeds: '#c87aff', golden_wheat: '#ffe04a',
    herbs: '#6fae4a', blight_herbs: '#8a7aa0', mushrooms: '#e8455c', peat: '#6a4a32', poison_root: '#9a4ad0', moonflower: '#cfeeff', witch_bloom: '#ff6ad8', bone_dust: '#eee6cc', black_lotus: '#4a2a6a',
    fish: '#8ac8e8', ice_fish: '#bfe0f0', salt: '#ffffff', shells: '#ffc8b8', amber: '#ffa52a', pearl: '#f8f2ff', black_pearl: '#4a4060', fish_oil: '#f0d870', seal_hide: '#9a9aa6', walrus_tusk: '#f8f0dc', ice_amber: '#ffe0a0',
    clay: '#c8784a', rubble: '#b0a090', glass: '#a8e8dc', relic: '#d8b050', scarab: '#ffcf3a', statue_shard: '#e0d8c8', crown: '#ffd84a',
    copper: '#d8803a', frost_stone: '#bcd8ea', limestone: '#e4d6b0', sandstone: '#e0a868',
    // 24.10: уникальные самоцветы природы (только в шахтах своей природы)
    adamant: '#9fc0e8', fire_opal: '#ff6a2a', emerald: '#2fd07a', sapphire: '#3a7aff', topaz: '#ffc23a', malachite: '#1fa07a', morion: '#6a3a8a', aquamarine: '#6fe8e8', ruby: '#ff2a4a', runestone: '#a87aff',
  };
  // слои глубины шахты: цвет камня, пола и стен (ash — свой, базальт с лавой)
  const LAYERS = [
    { from: 1, rock: ['#a08a72', '#c0aa90', '#73624f'], hard: ['#7e7468', '#9c9284', '#57504a'], floor: '#5e4c40', floorL: '#725e4e', wall: '#3e3240', wallL: '#54465a', moss: true },
    { from: 10, rock: ['#8e8c94', '#b0aeb8', '#62606a'], hard: ['#666874', '#848694', '#45464f'], floor: '#4a4650', floorL: '#5c5864', wall: '#2e2c3a', wallL: '#44425a' },
    { from: 30, rock: ['#5e5a72', '#7c7894', '#3e3a50'], hard: ['#45425a', '#5e5a78', '#2c2a3c'], floor: '#34303e', floorL: '#46405a', wall: '#1e1a2a', wallL: '#322c46', glow: '#9a7aff' },
  ];
  const ASH = { rock: ['#5c4c4a', '#7a6662', '#3e3232'], hard: ['#3a3338', '#524850', '#262126'], floor: '#2e2224', floorL: '#3e2e30', wall: '#1e1416', wallL: '#3a2224', lava: '#ff5a1a' };
  // 24.10: шахта в каждом городе — вид по природе округа: везде камни, но свои (палитра, форма, украшения на камнях и стенах)
  const BIO = {
    forest: { rock: ['#7e7a5a', '#9e9a72', '#56523a'], hard: ['#5e6248', '#7a7e60', '#3e4230'], floor: '#3e3a28', floorL: '#56502e', wall: '#22301e', wallL: '#3a4e2a', moss: true, deco: 'moss', wd: 'roots' },
    taiga: { rock: ['#8a949a', '#aeb8be', '#5e686e'], hard: ['#68727a', '#86909a', '#454e56'], floor: '#3c4248', floorL: '#5a646c', wall: '#1e2a30', wallL: '#34464e', deco: 'snow', wd: 'icicles' },
    ice: { rock: ['#9cc0d8', '#d6ecf8', '#6a90a8'], hard: ['#7aa0c0', '#b0d0e8', '#4a7090'], floor: '#3a5468', floorL: '#5a7a90', wall: '#1a2c3e', wallL: '#2e4a62', kinds: ['slab', 'boulder', 'slab'], deco: 'snow', wd: 'icicles' },
    meadow: { rock: ['#c8b890', '#e4d6b0', '#988a66'], hard: ['#a89a78', '#c4b896', '#7a6e54'], floor: '#6a5a40', floorL: '#7e6c4e', wall: '#4a3e2e', wallL: '#62543e', kinds: ['layered', 'boulder', 'slab'], deco: 'grass', wd: 'roots' },
    swamp: { rock: ['#4e5a46', '#6a7860', '#323a2c'], hard: ['#3a4436', '#56624e', '#232a20'], floor: '#2a3024', floorL: '#3a4232', wall: '#161c14', wallL: '#28321e', moss: true, deco: 'moss', wd: 'drip', pud: '#3a5a4a' },
    blight: { rock: ['#4e3e5a', '#6e5a7e', '#2e2238'], hard: ['#3a2c46', '#54426a', '#1e1428'], floor: '#241a2c', floorL: '#342640', wall: '#140e1a', wallL: '#2a1c36', deco: 'spores', wd: 'spores' },
    coast: { rock: ['#7a8a90', '#9aaab0', '#525e64'], hard: ['#5e6e76', '#7a8c94', '#3c484e'], floor: '#5a5440', floorL: '#7a7258', wall: '#22343a', wallL: '#34505a', deco: 'shells', wd: 'drip', pud: '#4a8ab0' },
    desert: { rock: ['#d09a5a', '#e8b878', '#a06a3a'], hard: ['#b07a44', '#cc9660', '#7e5028'], floor: '#8a6038', floorL: '#a87a4a', wall: '#5a3a22', wallL: '#7a5232', kinds: ['layered', 'slab', 'layered', 'boulder'], deco: 'sand', wd: 'strata' },
    ruin: { rock: ['#9a948a', '#bab4aa', '#6a645a'], hard: ['#7a746a', '#968f84', '#4e4840'], floor: '#4a4640', floorL: '#5e5a52', wall: '#2a2824', wallL: '#3e3a34', kinds: ['slab', 'slab', 'boulder'], deco: 'carved', wd: 'bricks' },
  };
  const layerOf = (F) => { if (F.biome === 'ash') return ASH; if (BIO[F.biome]) return BIO[F.biome]; let L = LAYERS[0]; for (const l of LAYERS) if (F.n >= l.from) L = l; return L; };
  // украшения на камне по природе (x, y — основание, s — размер)
  function decoOn(k, x, y, s, r) {
    const w = 54 * s, h = 64 * s;
    if (k === 'snow') return `<path d="M${f1(x - w * 0.85)} ${f1(y - h * 0.82)} q${f1(w * 0.4)} ${f1(-h * 0.34)} ${f1(w * 0.9)} ${f1(-h * 0.3)} q${f1(w * 0.5)} ${f1(h * 0.02)} ${f1(w * 0.68)} ${f1(h * 0.26)} q${f1(-w * 0.2)} ${f1(h * 0.08)} ${f1(-w * 0.4)} ${f1(-h * 0.02)} l${f1(-6 * s)} ${f1(14 * s)} l${f1(-6 * s)} ${f1(-12 * s)} q${f1(-w * 0.5)} ${f1(h * 0.12)} ${f1(-w * 0.82)} ${f1(h * 0.08)} Z" fill="#f4faff" ${O(3)}/>`;
    if (k === 'moss') return r() < 0.5 ? '' : `<path d="M${f1(x - w * 0.8)} ${f1(y - h * 0.8)} q${f1(w * 0.4)} ${f1(-h * 0.3)} ${f1(w * 0.9)} ${f1(-h * 0.26)} q${f1(w * 0.5)} ${f1(h * 0.04)} ${f1(w * 0.6)} ${f1(h * 0.24)} q${f1(-w * 0.3)} ${f1(h * 0.1)} ${f1(-w * 0.6)} 0 q${f1(-w * 0.4)} ${f1(h * 0.14)} ${f1(-w * 0.9)} ${f1(h * 0.02)} Z" fill="#5f9e3a" ${O(3)}/><path d="M${f1(x - w * 0.6)} ${f1(y - h * 0.64)} q2 10 -2 18 M${f1(x + w * 0.3)} ${f1(y - h * 0.7)} q3 12 0 20" stroke="#5f9e3a" stroke-width="${f1(3 * s)}" fill="none"/>`;
    if (k === 'grass') return [-0.9, -0.5, 0.7, 1.0].map((dx) => `<path d="M${f1(x + dx * w)} ${f1(y - 2)} l${f1(-6 * s)} ${f1(-16 * s)} M${f1(x + dx * w)} ${f1(y - 2)} l${f1(1 * s)} ${f1(-20 * s)} M${f1(x + dx * w)} ${f1(y - 2)} l${f1(7 * s)} ${f1(-14 * s)}" stroke="#7fae4a" stroke-width="${f1(3.5 * s)}" stroke-linecap="round"/>`).join('') + (r() < 0.4 ? `<circle cx="${f1(x + w * 0.85)}" cy="${f1(y - 18 * s)}" r="${f1(4.5 * s)}" fill="#fff2a0" ${O(2)}/>` : '');
    if (k === 'spores') return [[-0.6, 0.7], [0.5, 0.9], [0.1, 1.2], [0.9, 0.4]].map(([dx, dy], i) => `<circle cx="${f1(x + dx * w)}" cy="${f1(y - dy * h)}" r="${f1((i % 2 ? 7 : 4.5) * s)}" fill="#c07aff" opacity=".35"/><circle cx="${f1(x + dx * w)}" cy="${f1(y - dy * h)}" r="${f1((i % 2 ? 3 : 2) * s)}" fill="#e8c8ff"/>`).join('');
    if (k === 'shells') return [[-0.7, 0], [0.6, -2]].map(([dx, dy]) => `<path d="M${f1(x + dx * w - 8 * s)} ${f1(y + dy - 2)} Q${f1(x + dx * w)} ${f1(y + dy - 20 * s)} ${f1(x + dx * w + 8 * s)} ${f1(y + dy - 2)} Z" fill="#ffc8b8" ${O(2)}/><path d="M${f1(x + dx * w)} ${f1(y + dy - 14 * s)} v${f1(11 * s)}" stroke="#c88878" stroke-width="1.5"/>`).join('') + `<path d="M${f1(x - w * 0.3)} ${f1(y - h * 0.3)} h${f1(6 * s)} M${f1(x + w * 0.2)} ${f1(y - h * 0.5)} h${f1(5 * s)}" stroke="#e8eef0" stroke-width="${f1(3 * s)}" stroke-linecap="round"/>`;
    if (k === 'sand') return `<path d="${blob(x - w * 0.5, y - 6 * s, w * 0.7, 9 * s, r, 7, 0.2, true)}" fill="#e8c088" ${O(2.5)}/><path d="M${f1(x - w * 0.6)} ${f1(y - h * 0.5)} q${f1(w * 0.5)} ${f1(-6 * s)} ${f1(w)} 0" stroke="#f0d0a0" stroke-width="${f1(3 * s)}" fill="none" opacity=".7"/>`;
    if (k === 'carved') return `<path d="M${f1(x - 14 * s)} ${f1(y - h * 0.5)} h${f1(28 * s)} v${f1(-18 * s)} h${f1(-28 * s)} Z M${f1(x - 7 * s)} ${f1(y - h * 0.5 - 4 * s)} l${f1(7 * s)} ${f1(-10 * s)} l${f1(7 * s)} ${f1(10 * s)}" stroke="#4e4840" stroke-width="${f1(2.5 * s)}" fill="none" opacity=".75"/>`;
    return '';
  }
  // украшения стен по природе (бока зала): сосульки, корни, потёки, споры, пласты песчаника, кладка
  function wallDeco(k, x, y, r) {
    if (k === 'icicles') return `<path d="${blob(x, y - 4, 44, 12, r, 8, 0.2)}" fill="#34464e" opacity=".9"/><path d="M${f1(x - 30)} ${f1(y)} h60 l-8 ${f1(30 + r() * 30)} l-8 -26 l-8 ${f1(40 + r() * 20)} l-8 -38 l-8 ${f1(26 + r() * 20)} l-8 -26 Z" fill="#dff2ff" opacity=".85"/>`;
    if (k === 'roots') return `<path d="M${f1(x)} ${f1(y)} q${f1(-14 + r() * 28)} 40 ${f1(-4 + r() * 8)} 80 t${f1(-10 + r() * 20)} 60 M${f1(x)} ${f1(y + 40)} q20 16 30 40" stroke="#5a3a1e" stroke-width="${f1(5 + r() * 4)}" fill="none" stroke-linecap="round" opacity=".8"/>`;
    if (k === 'drip') return `<path d="M${f1(x)} ${f1(y)} v${f1(60 + r() * 80)}" stroke="#6ab0c8" stroke-width="5" opacity=".45" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y + 150)}" r="5" fill="#8ad0e8" opacity=".55"/>`;
    if (k === 'spores') return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(14 + r() * 16)}" fill="#c07aff" opacity=".16"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3 + r() * 3)}" fill="#e8c8ff" opacity=".8"/>`;
    if (k === 'strata') return `<path d="M${f1(x - 120)} ${f1(y)} q120 ${f1(-14 + r() * 28)} 240 0" stroke="#a87a4a" stroke-width="${f1(10 + r() * 10)}" fill="none" opacity=".45"/>`;
    if (k === 'bricks') return `<rect x="${f1(x - 40)}" y="${f1(y - 20)}" width="80" height="40" fill="#4e4a42" ${O(3)} opacity=".7"/><rect x="${f1(x)}" y="${f1(y + 20)}" width="80" height="40" fill="#46423a" ${O(3)} opacity=".7"/>`;
    return '';
  }
  const TIMBER = '#8a5a32', TIMBER_D = '#5a3a1e', GLOW = '#ffcf6a';

  const cellXY = MW.cellXY, cellAt = MW.cellAt;

  /* ---------- камни ---------- */
  const shade = (L, hard) => (hard ? L.hard : L.rock);
  function rockBody(kind, x, y, s, C, r) {
    // C = [основной, светлый, тёмный]; основание — на y, ширина ~ 100·s
    const w = 54 * s, h = 64 * s; let g = `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w * 1.15)}" ry="${f1(12 * s)}" fill="#000" opacity=".32"/>`;
    if (kind === 'slab') {   // гранёная глыба: верхняя грань светлее
      const top = y - h * 1.25, pts = [[x - w, y - 4 * s], [x - w * 1.05, y - h * 0.7], [x - w * 0.4, top], [x + w * 0.55, top + 10 * s], [x + w * 1.05, y - h * 0.55], [x + w * 0.9, y - 2 * s]];
      g += `<path d="M${pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L')} Z" fill="${C[0]}" ${O(4.5)}/>`;
      g += `<path d="M${f1(pts[1][0])} ${f1(pts[1][1])} L${f1(pts[2][0])} ${f1(pts[2][1])} L${f1(pts[3][0])} ${f1(pts[3][1])} L${f1(x + w * 0.1)} ${f1(y - h * 0.62)} Z" fill="${C[1]}" ${O(3)}/>`;
      g += `<path d="M${f1(x + w * 0.1)} ${f1(y - h * 0.62)} L${f1(pts[4][0])} ${f1(pts[4][1])} L${f1(pts[5][0])} ${f1(pts[5][1])}" fill="none" stroke="${C[2]}" stroke-width="${f1(3 * s)}"/>`;
    } else if (kind === 'layered') {   // слоистый: полосы породы
      g += `<path d="${blob(x, y - h * 0.55, w * 1.02, h * 0.62, r, 8, 0.1, true)}" fill="${C[0]}" ${O(4.5)}/>`;
      for (let k = 0; k < 3; k++) { const yy = y - h * (0.25 + k * 0.28); g += `<path d="M${f1(x - w * 0.92)} ${f1(yy)} Q${f1(x)} ${f1(yy - 8 * s + r() * 12 * s)} ${f1(x + w * 0.92)} ${f1(yy)}" stroke="${k % 2 ? C[1] : C[2]}" stroke-width="${f1(7 * s)}" fill="none" opacity=".8"/>`; }
      g += `<path d="${blob(x, y - h * 0.55, w * 1.02, h * 0.62, r, 8, 0.1, true)}" fill="none" ${O(4.5)}/>`;
    } else {   // валун (с 1–2 камнями сбоку); мшистый — с шапкой мха и грибочками
      g += `<path d="${blob(x, y - h * 0.5, w, h * 0.58, r, 9, 0.14, true)}" fill="${C[0]}" ${O(4.5)}/>`;
      g += `<path d="${blob(x - w * 0.3, y - h * 0.72, w * 0.42, h * 0.22, r, 7, 0.2)}" fill="${C[1]}" opacity=".8"/>`;
      if (r() < 0.6) g += `<path d="${blob(x + w * 0.85, y - h * 0.18, w * 0.34, h * 0.24, r, 7, 0.2, true)}" fill="${C[0]}" ${O(3.5)}/>`;
      if (kind === 'mossy') { g += `<path d="M${f1(x - w * 0.8)} ${f1(y - h * 0.82)} q${f1(w * 0.4)} ${f1(-h * 0.3)} ${f1(w * 0.9)} ${f1(-h * 0.26)} q${f1(w * 0.5)} ${f1(h * 0.04)} ${f1(w * 0.6)} ${f1(h * 0.24)} q${f1(-w * 0.3)} ${f1(h * 0.1)} ${f1(-w * 0.6)} 0 q${f1(-w * 0.4)} ${f1(h * 0.14)} ${f1(-w * 0.9)} ${f1(h * 0.02)} Z" fill="#6fae4a" ${O(3)}/>`;
        g += `<path d="M${f1(x + w * 0.5)} ${f1(y - 6 * s)} v${f1(-10 * s)} M${f1(x + w * 0.62)} ${f1(y - 4 * s)} v${f1(-8 * s)}" stroke="#f3efd8" stroke-width="${f1(4 * s)}"/><circle cx="${f1(x + w * 0.5)}" cy="${f1(y - 18 * s)}" r="${f1(6 * s)}" fill="#e8455c" ${O(2)}/><circle cx="${f1(x + w * 0.62)}" cy="${f1(y - 14 * s)}" r="${f1(5 * s)}" fill="#ffb03a" ${O(2)}/>`; }
    }
    return g;
  }
  // руда — своим видом поверх камня
  function oreOn(res, x, y, s, r, rare) {
    const c = RES[res] || '#ffcf3a', w = 54 * s, h = 64 * s; let g = '';
    const spots = Array.from({ length: rare ? 3 : 5 }, () => [x + (r() - 0.5) * w * 1.4, y - h * (0.25 + r() * 0.6)]);
    if (res === 'coal') for (const [px, py] of spots) g += `<path d="M${f1(px - 9 * s)} ${f1(py + 4 * s)} L${f1(px - 3 * s)} ${f1(py - 9 * s)} L${f1(px + 9 * s)} ${f1(py - 3 * s)} L${f1(px + 5 * s)} ${f1(py + 8 * s)} Z" fill="${c}" ${O(2.5)}/><path d="M${f1(px - 3 * s)} ${f1(py - 6 * s)} l${f1(5 * s)} ${f1(2 * s)}" stroke="#6a6a7a" stroke-width="${f1(2.5 * s)}"/>`;
    else if (res === 'iron' || res === 'clay') { for (let k = 0; k < 3; k++) { const yy = y - h * (0.3 + k * 0.22); g += `<path d="M${f1(x - w * 0.7 + r() * 10)} ${f1(yy)} q${f1(w * 0.3)} ${f1(-10 * s)} ${f1(w * 0.6)} ${f1(-2 * s)} t${f1(w * 0.6)} ${f1(4 * s)}" stroke="${c}" stroke-width="${f1(6 * s)}" fill="none" stroke-linecap="round"/>`; } for (const [px, py] of spots.slice(0, 2)) g += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(5 * s)}" fill="${c}" ${O(2)}/>`; }
    else if (res === 'crystal' || res === 'obsidian' || res === 'glass' || rare) {
      const sh = rare ? [[-0.45, 1.25, -20], [-0.05, 1.7, -4], [0.4, 1.35, 16]] : [[-0.4, 0.8, -18], [0.3, 0.9, 14]];
      for (const [dx, hh, rot] of sh) { const bx = x + dx * w, by = y - h * 0.62, ww = 12 * s, hh2 = hh * h * 0.6;
        g += `<g transform="rotate(${rot} ${f1(bx)} ${f1(by)})"><path d="M${f1(bx - ww)} ${f1(by)} V${f1(by - hh2 * 0.75)} L${f1(bx)} ${f1(by - hh2)} L${f1(bx + ww)} ${f1(by - hh2 * 0.75)} V${f1(by)} Z" fill="${c}" ${O(3.5)}/><path d="M${f1(bx - ww * 0.4)} ${f1(by - 3)} V${f1(by - hh2 * 0.72)}" stroke="#fff" stroke-width="${f1(3.5 * s)}" opacity=".7"/></g>`; }
      if (rare) g = `<ellipse cx="${f1(x)}" cy="${f1(y - h * 0.7)}" rx="${f1(w * 1.5)}" ry="${f1(h * 1.1)}" fill="${c}" opacity=".2"/>` + g;
    } else if (res === 'sulfur') { for (const [px, py] of spots) g += `<path d="${blob(px, py, 9 * s, 6 * s, r, 7, 0.3)}" fill="${c}" ${O(2)}/>`; }
    else for (const [px, py] of spots) g += `<path d="${blob(px, py, 7.5 * s, 6 * s, r, 6, 0.3)}" fill="${c}" ${O(2.5)}/><circle cx="${f1(px - 2.5 * s)}" cy="${f1(py - 2.5 * s)}" r="${f1(2.2 * s)}" fill="#fff" opacity=".8"/>`;
    if (res === 'gold' || res === 'silver' || rare) for (let k = 0; k < 3; k++) { const px = x + (r() - 0.5) * w * 1.8, py = y - h * (0.4 + r() * 0.9); g += `<path d="M${f1(px)} ${f1(py - 7 * s)} l${f1(2 * s)} ${f1(5 * s)} l${f1(5 * s)} ${f1(2 * s)} l${f1(-5 * s)} ${f1(2 * s)} l${f1(-2 * s)} ${f1(5 * s)} l${f1(-2 * s)} ${f1(-5 * s)} l${f1(-5 * s)} ${f1(-2 * s)} l${f1(5 * s)} ${f1(-2 * s)} Z" fill="#fff"/>`; }
    return g;
  }
  function chestPile(x, y, s, L, r) {
    let g = `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(62 * s)}" ry="${f1(12 * s)}" fill="#000" opacity=".32"/>`;
    const w = 58 * s, h = 42 * s, cx = x - w / 2, cy = y - 50 * s;
    g += `<g transform="rotate(-7 ${f1(x)} ${f1(cy)})"><rect x="${f1(cx)}" y="${f1(cy + h * 0.3)}" width="${f1(w)}" height="${f1(h * 0.7)}" rx="5" fill="#a0602a" ${O(3.5)}/><path d="M${f1(cx)} ${f1(cy + h * 0.34)} Q${f1(cx + w / 2)} ${f1(cy - h * 0.3)} ${f1(cx + w)} ${f1(cy + h * 0.34)} Z" fill="#c07a34" ${O(3.5)}/><path d="M${f1(cx + w * 0.2)} ${f1(cy + h * 0.05)} V${f1(cy + h)} M${f1(cx + w * 0.8)} ${f1(cy + h * 0.05)} V${f1(cy + h)}" stroke="#ffcf3a" stroke-width="${f1(5 * s)}"/></g>`;
    for (let k = 0; k < 4; k++) g += `<path d="${blob(x + (k - 1.5) * 26 * s, y - 10 * s, 20 * s, 13 * s, r, 7, 0.22, true)}" fill="${shade(L)[k % 2 ? 0 : 2]}" ${O(3)}/>`;
    return g;
  }
  function pillar(x, y, L, r) {
    const w = 44, h = 160;
    let g = `<ellipse cx="${x}" cy="${y}" rx="${w * 1.3}" ry="12" fill="#000" opacity=".35"/>`;
    g += `<path d="M${x - w * 1.1} ${y} Q${x - w * 0.8} ${y - h * 0.5} ${x - w * 0.35} ${y - h} L${x + w * 0.25} ${y - h * 1.04} Q${x + w * 0.9} ${y - h * 0.5} ${x + w * 1.15} ${y} Z" fill="${L.wall}" ${O(4.5)}/>`;
    g += `<path d="M${x - w * 0.45} ${y - h * 0.2} Q${x - w * 0.35} ${y - h * 0.6} ${x - w * 0.1} ${y - h * 0.9}" stroke="${L.wallL}" stroke-width="8" fill="none"/>`;
    g += `<path d="${blob(x, y - 10, w * 1.35, 16, r, 8, 0.2, true)}" fill="${L.wallL}" ${O(3.5)}/>`;
    return g;
  }
  // табличка уровня на камне
  const lvBadge = (x, y, lv, hot) => `<g transform="translate(${f1(x)} ${f1(y)})"><path d="M-17 -14 h34 a6 6 0 0 1 6 6 v16 a6 6 0 0 1 -6 6 h-34 a6 6 0 0 1 -6 -6 v-16 a6 6 0 0 1 6 -6 Z" fill="${hot ? '#7a1a2a' : INK}" stroke="#ffe27a" stroke-width="2.5"/><text y="7" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="19" fill="#ffe27a">${lv}</text></g>`;
  const bar = (x, y, p) => `<rect x="${f1(x - 44)}" y="${f1(y)}" width="88" height="12" rx="6" fill="${INK}" opacity=".8"/><rect x="${f1(x - 42)}" y="${f1(y + 2)}" width="${f1(84 * Math.min(1, p))}" height="8" rx="4" fill="#7ff07a"/>`;

  /* ---------- зал: стены, пол, вход с NPC, спуск ---------- */
  function back(F, L, r, o) {
    const x0 = VX0, x1 = VX0 + VW;
    let s = `<defs><radialGradient id="cwGlow"><stop offset="0" stop-color="${GLOW}" stop-opacity=".7"/><stop offset="1" stop-color="${GLOW}" stop-opacity="0"/></radialGradient>
      <radialGradient id="cwLift"><stop offset="0" stop-color="${F.done ? '#7ff07a' : '#ffe27a'}" stop-opacity=".55"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient></defs>`;
    if (!o.bare) {   // 25.10: «Шахта 2.0» (o.bare) - стены, пол, крепь и свет рисует mine-biome.js своим слоем (раз на этаж)
    // толща породы по бокам (на ПК — широкие своды, на телефоне — узкие стенки)
    s += `<rect x="${x0}" y="0" width="${VW}" height="${H}" fill="${L.wall}"/>`;
    for (let k = 0; k < 160; k++) { const x = x0 + r() * VW, y = r() * H; s += `<path d="${blob(x, y, 30 + r() * 60, 20 + r() * 40, r, 8, 0.22)}" fill="${r() < 0.5 ? L.wallL : '#000'}" opacity="${f1(0.18 + r() * 0.25)}"/>`; }
    if (L.wd) for (let k = 0; k < 46; k++) { const left = k % 2 === 0, x = left ? x0 + r() * (-x0 + SIDE * 0.45) : W - SIDE * 0.45 + r() * (-x0 + SIDE * 0.45), y = r() * H; s += wallDeco(L.wd, x, y, r); }
    if (L.pud) for (let k = 0; k < 18; k++) { const x = SIDE + r() * (W - SIDE * 2), y = TOP - 100 + r() * (H - TOP); s += `<path d="${blob(x, y, 30 + r() * 30, 8 + r() * 6, r, 8, 0.2)}" fill="${L.pud}" opacity=".55"/>`; }
    if (L.lava) for (let k = 0; k < 14; k++) { const x = x0 + r() * VW, y = r() * H; s += `<path d="M${f1(x)} ${f1(y)} q40 -14 80 6 t90 -8" stroke="${L.lava}" stroke-width="5" fill="none" opacity=".55"/>`; }
    // пол зала (вместе со входом внизу и площадкой спуска наверху)
    s += `<path d="${'M' + SIDE * 0.4 + ' ' + (TOP - 140)} Q${W / 2} ${TOP - 190} ${W - SIDE * 0.4} ${TOP - 140} L${W - SIDE * 0.3} ${H - 30} Q${W / 2} ${H + 10} ${SIDE * 0.3} ${H - 30} Z" fill="${L.floor}" ${O(6)}/>`;
    for (let k = 0; k < 220; k++) { const x = SIDE * 0.5 + r() * (W - SIDE), y = TOP - 120 + r() * (H - TOP + 80); s += `<path d="${blob(x, y, 8 + r() * 18, 4 + r() * 6, r, 6, 0.3)}" fill="${r() < 0.5 ? L.floorL : '#000'}" opacity="${f1(0.25 + r() * 0.25)}"/>`; }
    // крепь вдоль стен: стойки по рядам и фонари
    for (let gy = 0; gy <= GH; gy += 2) { const y = Y0 + gy * RH; for (const x of [SIDE * 0.5, W - SIDE * 0.5]) s += `<path d="M${x} ${y + 20} V${y - 110}" stroke="${TIMBER}" stroke-width="16"/><path d="M${x} ${y + 20} V${y - 110}" stroke="${INK}" stroke-width="2.5" opacity=".4"/>`;
      if (gy % 4 === 0) for (const x of [SIDE * 0.5 - 4, W - SIDE * 0.5 + 4]) s += `<circle cx="${x}" cy="${y - 80}" r="110" fill="url(#cwGlow)"/><path d="M${x - 14} ${y - 96} h28 l-5 28 h-18 Z" fill="${GLOW}" ${O(3.5)}/>`; }
    }
    // наверху — спуск: клеть в шахтном стволе, лампа горит зелёным, когда этаж расчищен
    const ex = SIDE + (F.exit % GW) * CW + CW / 2;
    if (!(o && o.art && o.art.upLift)) {   // 26.10 (mine2): клеть рисует mine-art.js - предметом (build: obj 'up'), с подсветкой
      s += `<circle cx="${ex}" cy="${TOP - 170}" r="150" fill="url(#cwLift)"/>`;
      s += `<path d="M${ex - 90} ${TOP - 30} V${TOP - 300} H${ex + 90} V${TOP - 30}" fill="#0c0910" ${O(5)}/><path d="M${ex - 90} ${TOP - 30} V${TOP - 300} M${ex + 90} ${TOP - 30} V${TOP - 300} M${ex - 120} ${TOP - 300} H${ex + 120}" stroke="${TIMBER}" stroke-width="20"/>`;
      s += `<path d="M${ex} ${TOP - 300} V${TOP - 150}" stroke="#9a9aa6" stroke-width="5"/><rect x="${ex - 56}" y="${TOP - 156}" width="112" height="106" fill="#2a2632" ${O(5)}/><path d="M${ex - 56} ${TOP - 156} l112 106 M${ex + 56} ${TOP - 156} l-112 106" stroke="${TIMBER_D}" stroke-width="5"/>`;
      s += `<circle cx="${ex + 110}" cy="${TOP - 270}" r="14" fill="${F.done ? '#7ff07a' : '#e8455c'}" ${O(4)}/><text x="${ex}" y="${TOP - 318}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="26" fill="#ffc94d" stroke="${INK}" stroke-width="5" paint-order="stroke">ЭТАЖ ${F.n + 1} ↑</text>`;
    }
    // внизу — вход: вывеска, подъёмник в город, лавка скупщика, вагонетка, доска поручений
    const yb = Y0 + GRID_H;
    s += `<path d="M${SIDE * 0.5} ${yb + 24} H${W - SIDE * 0.5}" stroke="${TIMBER_D}" stroke-width="10" opacity=".7"/>`;
    s += `<path d="M${W / 2 - 230} 0 V0" />`;
    return s;
  }
  function entryProps(F, L, r, o) {
    // 25.10: obj — предмет входа (lift, buyer, board, cart, lamp): mine.js оборачивает его в <g data-obj> (клик, подсветка, подпись)
    const yb = Y0 + GRID_H, out = [];
    // название шахты и этаж — в шапке локации (mine.js), на полу не пишем: там стоят те, кто копает нижний ряд
    // подъёмник в город (слева внизу)
    const lx = 150, ly = H - 70;
    out.push({ obj: 'lift', x: lx, y: ly, svg: `<path d="M${lx - 80} ${ly} V${ly - 220} M${lx + 80} ${ly} V${ly - 220} M${lx - 104} ${ly - 220} H${lx + 104}" stroke="${TIMBER}" stroke-width="16"/><rect x="${lx - 66}" y="${ly - 120}" width="132" height="110" fill="#3a3442" ${O(5)}/><path d="M${lx - 66} ${ly - 65} H${lx + 66}" stroke="${TIMBER_D}" stroke-width="5"/><path d="M${lx} ${ly - 220} V${ly - 120}" stroke="#9a9aa6" stroke-width="4"/><text x="${lx}" y="${ly - 236}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="22" fill="#ffc94d" stroke="${INK}" stroke-width="5" paint-order="stroke">В ГОРОД ↓</text>` });
    // лавка скупщика (справа внизу): прилавок, весы, ящики с рудой; сам NPC рисуется отдельно (npc)
    const nx = W - 210, ny = H - 120;
    out.push({ obj: 'buyer', x: nx, y: ny + 34, svg: `<rect x="${nx - 120}" y="${ny - 40}" width="240" height="74" rx="8" fill="${TIMBER}" ${O(5)}/><rect x="${nx - 132}" y="${ny - 56}" width="264" height="22" rx="6" fill="${TIMBER_D}" ${O(4)}/>`
      + `<path d="M${nx + 60} ${ny - 56} V${ny - 120} M${nx + 30} ${ny - 112} H${nx + 90}" stroke="#c8a050" stroke-width="5"/><path d="M${nx + 18} ${ny - 112} l12 24 h-24 Z M${nx + 102} ${ny - 112} l-12 24 h24 Z" fill="#ffcf3a" ${O(2.5)}/>`
      + `<rect x="${nx - 110}" y="${ny - 96}" width="70" height="40" fill="#a0703a" ${O(4)}/>` + [0, 1, 2, 3].map((k) => `<path d="${blob(nx - 96 + k * 14, ny - 98, 9, 7, r, 6, 0.3)}" fill="${['#c8643a', '#24232a', '#ffcf3a', '#eef3fa'][k]}" ${O(2)}/>`).join('')
      + `<path d="M${nx - 150} ${ny - 220} h300 v40 h-300 Z" fill="#b5332a" ${O(4)}/>` + [0, 1, 2, 3, 4].map((k) => `<path d="M${nx - 150 + k * 60} ${ny - 180} q30 24 60 0" fill="${k % 2 ? '#f3efd8' : '#b5332a'}" ${O(3)}/>`).join('')
      + `<path d="M${nx - 140} ${ny - 180} V${ny - 56} M${nx + 140} ${ny - 180} V${ny - 56}" stroke="${TIMBER_D}" stroke-width="10"/><text x="${nx}" y="${ny - 192}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="20" fill="#ffe27a" stroke="${INK}" stroke-width="4" paint-order="stroke">СКУПКА</text>` });
    // доска поручений и вагонетка
    const bx = W / 2 - 10, by = H - 60;
    out.push({ obj: 'board', x: bx, y: by, svg: `<path d="M${bx - 50} ${by} V${by - 150} M${bx + 50} ${by} V${by - 150}" stroke="${TIMBER_D}" stroke-width="10"/><rect x="${bx - 72}" y="${by - 196}" width="144" height="100" rx="8" fill="#c49a62" ${O(5)}/>` + [0, 1, 2].map((k) => `<rect x="${bx - 60 + k * 42}" y="${by - 186 + (k % 2) * 8}" width="34" height="44" fill="#f3efd8" ${O(2.5)} transform="rotate(${(k - 1) * 6} ${bx - 43 + k * 42} ${by - 164})"/>`).join('') + `<text x="${bx}" y="${by - 206}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="18" fill="#ffe27a" stroke="${INK}" stroke-width="4" paint-order="stroke">ПОРУЧЕНИЯ</text>` });
    const cx = 330, cy = H - 150;
    out.push({ obj: 'cart', x: cx, y: cy, svg: `<path d="M${cx - 80} ${cy - 70} h160 l-14 62 h-132 Z" fill="#6a6a78" ${O(5)}/><circle cx="${cx - 44}" cy="${cy}" r="15" fill="#3a3a44" ${O(4)}/><circle cx="${cx + 44}" cy="${cy}" r="15" fill="#3a3a44" ${O(4)}/>` + [0, 1, 2, 3, 4].map((k) => `<path d="${blob(cx - 56 + k * 28, cy - 74 - (k % 2) * 8, 17, 12, r)}" fill="${['#c8643a', '#24232a', '#ffcf3a', '#eef3fa', '#a08a72'][k]}" ${O(3)}/>`).join('') });
    // 23.10: Фонарщик (с этажа lampFrom): столб с фонарями и ящик касок — у входа слева, под первым столбцом зала
    let lampNpc = null;
    if (o.lampMan) {
      const fx = 210, fy = Y0 + GRID_H + 200;
      out.push({ obj: 'lamp', x: fx + 70, y: fy, svg: `<path d="M${fx + 70} ${fy} V${fy - 190}" stroke="${TIMBER_D}" stroke-width="10"/><path d="M${fx + 40} ${fy - 180} H${fx + 110}" stroke="${TIMBER_D}" stroke-width="8"/>`
        + [fx + 44, fx + 104].map((x) => `<circle cx="${x}" cy="${fy - 150}" r="34" fill="url(#cwGlow)"/><path d="M${x - 11} ${fy - 172} h22 l-4 28 h-14 Z" fill="${GLOW}" ${O(3)}/>`).join('')
        + `<rect x="${fx + 96}" y="${fy - 44}" width="64" height="44" fill="#a0703a" ${O(4)}/>` + [0, 1].map((k) => `<path d="M${fx + 104 + k * 26} ${fy - 44} q12 -22 24 0 Z" fill="#ffcf3a" ${O(2.5)}/>`).join('') });
      lampNpc = { x: fx + 215, y: fy + 10, name: 'Фонарщик' };   // 25.10: справа от столба и ящика касок - не перед вывеской «В ГОРОД» и не под фонарями
    }
    return { props: out, npc: { x: nx - 150, y: ny + 70, name: 'Скупщик Гром' }, lampNpc };
  }

  /* ---------- 25.10 (mine/walk): предметы входа и NPC - препятствия (FOOT, ZONE, feet, free, route, segHit). 26.10: в библиотеке мира
     (packages/world mine): одна таблица для обоих видов и для сервера. Опоры рисунка - подъёмник lx 150, лавка nx W-210, доска W/2-10,
     вагонетка 330, столб Фонарщика fx 210: сдвинул предмет - поправь таблицу там. ---------- */
  const { FOOT, ZONE, feet, free, route, segHit } = MW;

  const ART_CACHE = new Map();   // 25.10 (mine2): рисунки камней и предметов входа этажа (ключ - всё, от чего они зависят)
  function build(F, o = {}) {
    const L = layerOf(F), dug = o.dug || [], prog = o.prog || {}, fr = o.front || new Set();
    const r0 = rng(F.n * 17 + 1), backSvg = back(F, L, r0, o);
    const props = [], cells = [], A = o.art || null, rk = {};
    if (A && A.begin) A.begin(F, o);   // 25.10 (mine/rocks2): тема глубины для рисунков камней (символы mine-art.js)
    const badges = [];   // 26.10: таблички уровня - верхним слоем
    const heaps = new Set(F.coal || []);   // 27.10: клетки куч угля (угольный этаж: вид шахты fl.coal)
    const baseRes = (F.cells.find((c) => c.t === 'rock' || c.t === 'hard') || {}).r || 'stone';   // порода этажа: под рудой - она же
    for (let i = 0; i < GW * GH; i++) {
      const c = F.cells[i], p = cellXY(i), r = rng(i * 131 + F.n * 977);
      cells.push({ i, ...p });
      // 27.10: куча угля (угольный этаж) - на клетке-проходе, видна и до, и после того, как до неё докопались
      if (heaps.has(i)) { props.push({ x: p.x, y: p.y, svg: A && A.coalHeap ? A.coalHeap(p.x, p.y, r) : coalHeap(p.x, p.y, r) }); continue; }
      if (dug[i] || c.t === 'entry' || c.t === 'void') { if (r() < 0.35) props.push({ x: p.x, y: p.y - 30, svg: `<path d="${blob(p.x + (r() - 0.5) * 60, p.y - 30, 12, 7, r, 6, 0.3, true)}" fill="${shade(L)[2]}" ${O(2.5)}/>` }); continue; }
      let svg = '';
      if (fr.has(i)) svg += `<ellipse cx="${p.x}" cy="${f1(p.y)}" rx="62" ry="18" fill="#ffe27a" opacity=".16"/><ellipse cx="${p.x}" cy="${f1(p.y)}" rx="62" ry="18" fill="none" stroke="#ffe27a" stroke-width="4" stroke-dasharray="12 8"/>`;
      if (c.t === 'wall') { svg += A ? A.wall(p.x, p.y, (o.rockPal && o.rockPal(c, L)) || [L.wall, L.wallL], r) : pillar(p.x, p.y, L, r); props.push({ x: p.x, y: p.y, i, svg }); continue; }
      const rel = Math.max(0, (c.lv || F.n) - F.n), s = 1.0 + rel * 0.1 + (c.t === 'hard' ? 0.05 : 0);   // камень почти во всю клетку; выше уровень — крупнее
      const pal = (o.rockPal && o.rockPal(c, L)) || shade(L, c.t === 'hard');
      if (A) {   // 25.10 (mine2): камень с табличкой - в <g class="rk">, его же копию mine.js кладёт поверх, пока камень копают
        const gem = c.t === 'rare' && F.gem && c.r === F.gem;
        if (gem) svg += `<ellipse cx="${p.x}" cy="${f1(p.y - 50)}" rx="58" ry="50" fill="none" stroke="${RES[c.r] || '#fff'}" stroke-width="3" stroke-dasharray="4 10" stroke-opacity=".7"/>`;   // 26.10: кольцо - в своей клетке
        // рисунок камня один и тот же на весь этаж - из кэша (сцена перерисовывается на каждый выкопанный камень)
        const ck = [F.biome, F.n, F.gem, i, c.t, c.r, c.lv, pal.join(','), L.deco || ''].join('|');
        let b = ART_CACHE.get(ck);
        if (b == null) {
          if (c.t === 'chest') b = A.chest(p.x, p.y, s, pal, r);
          else {
            const kinds = L.kinds ? L.kinds : L.moss ? ['boulder', 'mossy', 'slab', 'layered', 'boulder'] : ['boulder', 'slab', 'layered', 'boulder'];
            const kind = kinds[Math.floor(r() * kinds.length)];
            b = A.rock({ ...c, b: baseRes }, kind, p.x, p.y, s, pal, r);
            if (L.deco && kind !== 'mossy') b += decoOn(L.deco, p.x, p.y, s, r);
            if (c.t === 'ore' || c.t === 'rare') b += A.ore(c.r, p.x, p.y, s * (gem ? 1.12 : 1), r, c.t === 'rare', gem);
          }
          if (ART_CACHE.size > 400) ART_CACHE.clear();
          ART_CACHE.set(ck, b);
        }
        // 26.10 (mine/rocks2): табличка уровня - отдельным верхним слоем сцены (после всех камней): её не закрывают соседи;
        // в своей клетке (x + 28), закрытый камень - притушенная табличка; в копии копаемого камня (rk) - поверх него
        const bd = A.badge(p.x + 28, p.y - 8, c.lv || F.n, c.t, !fr.has(i));
        badges.push({ x: p.x, y: 1e6 + p.y, svg: bd });
        rk[i] = b + bd; svg += `<g class="rk">${b}</g>`;
      } else if (c.t === 'chest') svg += chestPile(p.x, p.y, s, L, r);
      else {
        const kinds = c.t === 'hard' ? ['slab', 'layered', 'slab'] : L.kinds ? L.kinds : L.moss ? ['boulder', 'mossy', 'slab', 'layered', 'boulder'] : ['boulder', 'slab', 'layered', 'boulder'];
        const kind = kinds[Math.floor(r() * kinds.length)];
        const gem = c.t === 'rare' && F.gem && c.r === F.gem;   // 24.10: уникальный самоцвет природы — ярче, с ореолом
        if (gem) svg += `<ellipse cx="${p.x}" cy="${f1(p.y - 60 * s)}" rx="${f1(84 * s)}" ry="${f1(80 * s)}" fill="${RES[c.r] || '#fff'}" opacity=".18"/><ellipse cx="${p.x}" cy="${f1(p.y - 60 * s)}" rx="${f1(62 * s)}" ry="${f1(58 * s)}" fill="none" stroke="${RES[c.r] || '#fff'}" stroke-width="3" stroke-dasharray="4 10" opacity=".7"/>`;
        svg += rockBody(kind, p.x, p.y, s, shade(L, c.t === 'hard'), r);
        if (L.deco && kind !== 'mossy') svg += decoOn(L.deco, p.x, p.y, s, r);
        if (c.t === 'ore' || c.t === 'rare') svg += oreOn(c.r, p.x, p.y, s * (gem ? 1.12 : 1), r, c.t === 'rare');
      }
      if (!A) svg += lvBadge(p.x + 40 * s, p.y - 8, c.lv || F.n, c.t === 'rare');
      if (prog[i] > 0) svg += bar(p.x, p.y - 96 * s, prog[i]);
      props.push({ x: p.x, y: p.y, i, svg });
    }
    let E;
    if (A) { const ek = `entry|${F.n}|${o.lampMan ? 1 : 0}|${o.trader ? 1 : 0}`; E = ART_CACHE.get(ek); if (!E) { E = A.entry(F, L, rng(F.n * 29 + 3), o); ART_CACHE.set(ek, E); } E = { ...E, props: E.props.map((x) => ({ ...x })) }; }
    else E = entryProps(F, L, rng(F.n * 29 + 3), o);
    props.push(...E.props, ...badges);
    const ex = SIDE + (F.exit % GW) * CW + CW / 2;
    if (A && A.upLift) props.push({ obj: 'up', x: ex, y: TOP - 30, svg: A.upLift(ex, TOP, F.n + 1, !!F.done, rng(F.n * 31 + 7)) });   // 26.10 (mine2): верхняя клеть
    return { W, H, VX0, VW, TOP, Y0, CW, RH, GRID_H, back: (A ? A.defs(props) : '') + backSvg, props, cells, rk, npc: E.npc, lampNpc: E.lampNpc, entry: { x: W / 2, y: H - 90 }, exit: { x: ex, y: TOP - 60 }, cellAt, cellXY };
  }
  /** 27.10: куча угля - прежний вид (без рисунков mine-art): горка тёмных глыб. */
  function coalHeap(x, y, r) {
    let g = `<ellipse cx="${x + 4}" cy="${y + 2}" rx="56" ry="12" fill="#000" opacity=".3"/><path d="${blob(x, y - 16, 52, 22, r, 9, 0.12, true)}" fill="#18171e" ${O(4)}/>`;
    for (let q = 0; q < 7; q++) g += `<path d="${blob(x - 36 + (q % 4) * 24 + (q > 3 ? 12 : 0), y - 16 - (q > 3 ? 16 : 0), 13, 9, r, 6, 0.25)}" fill="${q % 2 ? '#2a2a34' : '#3a3c4c'}" ${O(2.5)}/>`;
    return g;
  }
  /** Каска горняка с фонарём — поверх человечка NPC (x, y — ноги, k — масштаб человечка). */
  const helmet = (x, y, k) => { const hy = y - 112 * k, w = 40 * k; return `<path d="M${f1(x - w)} ${f1(hy)} Q${f1(x)} ${f1(hy - 56 * k)} ${f1(x + w)} ${f1(hy)} Z" fill="#ffcf3a" ${O(3.5)}/><rect x="${f1(x - w * 1.15)}" y="${f1(hy - 6 * k)}" width="${f1(w * 2.3)}" height="${f1(10 * k)}" rx="${f1(5 * k)}" fill="#e8a82a" ${O(3)}/><circle cx="${f1(x)}" cy="${f1(hy - 26 * k)}" r="${f1(10 * k)}" fill="#fff6c0" ${O(3)}/><path d="M${f1(x - 10 * k)} ${f1(hy - 26 * k)} L${f1(x - 70 * k)} ${f1(hy - 70 * k)} L${f1(x + 70 * k)} ${f1(hy - 70 * k)} L${f1(x + 10 * k)} ${f1(hy - 26 * k)} Z" fill="#fff6c0" opacity=".25"/>`; };
  window.LGCraftWorld = { helmet, build, cellXY, cellAt, W, H, VX0, VW, TOP, Y0, CW, RH, RES, FOOT, ZONE, feet, free, route, segHit };
})();
