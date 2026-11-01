









(function (root, factory) {

  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../world/lib/citymap.js'));
  else root.LGCampMap = factory(root.LGCityMap);
})(typeof self !== 'undefined' ? self : this, function (CM) {
  'use strict';
  const ID = 'camp';
  const W = 3400, H = 1440;
  const BASE = 795;
  const AREA = { x0: 70, x1: W - 70, y0: 800, y1: 1330 };
  const FENCE = { y: 1352, x0: 26, x1: W - 26 };

  const BUILDINGS = [
    { id: 'storage', title: 'Склад', sub: 'хранение вещей', icon: '📦', soon: true, hit: [96, 560, 492, 800], door: { x: 330, y: 838 } },


    { id: 'magic', title: 'Лавка звездочёта', sub: 'посохи, мантии, амулеты', icon: '🔮', magic: true, hit: [606, 846, 440, 800], door: { x: 722, y: 848 } },
    { id: 'forge', title: 'Кузня', sub: 'лавка кузнеца', icon: '⚒', hit: [880, 1290, 506, 800], door: { x: 1090, y: 840 } },
    { id: 'gate', title: 'Ворота', sub: 'в поход - только на стриме', icon: '🚩', hit: [1500, 1900, 296, 800], door: { x: 1700, y: 828 } },
    { id: 'tent', title: 'Шатёр', sub: 'облик', icon: '🎩', hit: [2030, 2470, 366, 800], door: { x: 2250, y: 856 } },
    { id: 'shop', title: 'Торговые ряды', sub: 'еда, зелья, материалы', icon: '🧺', hit: [2580, 3330, 486, 880], door: { x: 2955, y: 908 } },
  ];


  const FIRE = { x: 1700, y: 1080, rx: 92, ry: 34, logs: [[1530, 1066, 70, 15, -8], [1870, 1066, 70, 15, 8], [1600, 1150, 66, 15, 10], [1800, 1150, 66, 15, -10], [1700, 1004, 62, 13, 0]] };
  

  const TENTS = [
    { x: 330, y: 1010, w: 300, d: 66, k: 'big' },
    { x: 690, y: 1176, w: 230, d: 54, k: 'mid', flip: true },
    { x: 205, y: 1278, w: 170, d: 44, k: 'small' },
    { x: 1010, y: 1030, w: 220, d: 52, k: 'mid' },
    { x: 1185, y: 1268, w: 180, d: 46, k: 'small', flip: true },
    { x: 2430, y: 1030, w: 290, d: 64, k: 'big', flip: true },
    { x: 2790, y: 1190, w: 230, d: 54, k: 'mid' },
    { x: 3150, y: 1040, w: 220, d: 52, k: 'mid', flip: true },
    { x: 3215, y: 1282, w: 170, d: 44, k: 'small' },
  ];
  



  const PROPS = [
    { k: 'sign', x: 1468, y: 968, e: [16, 8] },
    { k: 'rack', x: 1330, y: 912, e: [80, 14] },
    { k: 'target', x: 1395, y: 1215, e: [30, 12] },
    { k: 'target', x: 1505, y: 1262, e: [30, 12] },
    { k: 'hitch', x: 2040, y: 1220, e: [104, 12] },
    { k: 'woodpile', x: 1985, y: 958, e: [70, 18] },
    { k: 'well', x: 1240, y: 1100, e: [72, 18] },
    { k: 'barrel', x: 560, y: 900, e: [30, 12] }, { k: 'crates', x: 615, y: 925, e: [44, 14] },
    { k: 'sacks', x: 2560, y: 915, e: [46, 14] }, { k: 'barrel', x: 3300, y: 900, e: [30, 12] },
    { k: 'crate', x: 870, y: 1290, e: [34, 12] }, { k: 'barrel', x: 2560, y: 1300, e: [30, 12] },
    { k: 'flag', x: 120, y: 880, e: [10, 6] }, { k: 'flag', x: 3290, y: 1130, e: [10, 6] }, { k: 'flag', x: 1520, y: 870, e: [10, 6] }, { k: 'flag', x: 1880, y: 870, e: [10, 6] },
    { k: 'pole', x: 470, y: 1110, e: [9, 6] }, { k: 'pole', x: 880, y: 1100, e: [9, 6] }, { k: 'pole', x: 2610, y: 1105, e: [9, 6] }, { k: 'pole', x: 2980, y: 1110, e: [9, 6] },
    { k: 'pot', x: 520, y: 1220, e: [26, 10] }, { k: 'pot', x: 2610, y: 1250, e: [26, 10] }, { k: 'pot', x: 3010, y: 1300, e: [26, 10] },
    { k: 'torch', x: 1588, y: 948, e: [8, 5] }, { k: 'torch', x: 1812, y: 948, e: [8, 5] }, { k: 'torch', x: 590, y: 1060, e: [8, 5] }, { k: 'torch', x: 2830, y: 1040, e: [8, 5] },
    { k: 'bedroll', x: 240, y: 1092 }, { k: 'bedroll', x: 1095, y: 1110 }, { k: 'bedroll', x: 2330, y: 1110 }, { k: 'bedroll', x: 3080, y: 1118 },
  ];

  const LINES = [[0, 1], [2, 3]];

  const TRAIL = [
    [[1700, 820], [1700, 960]],
    [[1606, 1006], [1180, 930], [812, 905], [330, 846]],
    [[1794, 1006], [2250, 868], [2955, 916]],
    [[1180, 930], [1090, 852]],
    [[1700, 1190], [1700, 1330]],
  ];
  const SPAWN = [1700, 1240];

   
  function layout() {
    const OBST = [];

    OBST.push({ e: [FIRE.x, FIRE.y, FIRE.rx, FIRE.ry], fire: true });
    for (const [x, y, rx, ry] of FIRE.logs) OBST.push({ e: [x, y, rx, ry] });

    for (const t of TENTS) OBST.push({ b: [t.x - t.w / 2 + 8, t.y - t.d, t.x + t.w / 2 - 8, t.y], tent: true });
    for (const p of PROPS) if (p.e) OBST.push({ e: [p.x, p.y - p.e[1] * 0.4, p.e[0], p.e[1]] });

    OBST.push({ b: [0, FENCE.y - 14, W, H], fence: true }, { r: [0, FENCE.x0 + 40, H], fence: true }, { r: [FENCE.x1 - 40, W, H], fence: true });
    return {
      id: ID, name: 'Перепутье', sub: 'лагерь новобранцев Легиона', camp: true, biome: 'camp',
      W, H, BASE, AREA, FENCE, BUILDINGS: BUILDINGS.map((b) => ({ ...b, door: { ...b.door } })), HOT: [],
      fire: { ...FIRE }, tents: TENTS.map((t) => ({ ...t })), props: PROPS.map((p) => ({ ...p })), lines: LINES.map((l) => [...l]),
      trail: TRAIL.map((s) => s.map((p) => [...p])), spawn: [...SPAWN], OBST,
    };
  }
  let L0 = null;
  const get = () => L0 || (L0 = layout());
   
  function map(L, o) { L = L || get(); const mg = !!(o && o.magic); return CM.makeFrom({ W: L.W, H: L.H, AREA: L.AREA, OBST: L.OBST, BUILDINGS: L.BUILDINGS.filter((b) => !b.magic || mg), HOT: [], home: L.spawn }); }
   
  const scaleAt = (L, y) => CM.scaleAt(y);
  

  function check(L) {
    L = L || get(); const m = map(L, { magic: true }), err = [];
    const need = ['storage', 'forge', 'gate', 'tent', 'shop', 'magic'];
    for (const k of need) if (!L.BUILDINGS.some((b) => b.id === k)) err.push('нет здания ' + k);
    for (const k of ['anvil', 'hall', 'auction', 'board', 'mine', 'trainer']) if (L.BUILDINGS.some((b) => b.id === k)) err.push('лишнее здание ' + k);

    for (const b of L.BUILDINGS) if (!!b.magic !== (b.id === 'magic')) err.push('признак magic у ' + b.id);
    const pts = [...L.BUILDINGS.map((b) => [b.door.x, b.door.y, b.id]), [L.spawn[0], L.spawn[1], 'spawn']];
    for (const [x, y, id] of pts) if (!m.free(x, y)) err.push(`дверь ${id} не на свободном месте (${x}, ${y})`);
    const [sx, sy] = L.spawn;
    for (const [x, y, id] of pts) {
      const p = m.path([sx, sy], [x, y]), e = p[p.length - 1];
      if (Math.hypot(e[0] - x, e[1] - y) > 24) err.push(`до двери ${id} не дойти`);
      for (let i = 1; i < p.length; i++) if (!m.clear(p[i - 1], p[i])) { err.push(`путь до ${id} идёт сквозь предмет`); break; }
    }

    const { C, cols, rows, G } = m.grid, seen = new Uint8Array(cols * rows), s0 = m.nearest(sx, sy);
    const st = [Math.floor((s0[1] - L.AREA.y0) / C) * cols + Math.floor(s0[0] / C)]; seen[st[0]] = 1; let n = 1;
    while (st.length) { const i = st.pop(), c = i % cols, r = (i / cols) | 0; for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue; const j = nr * cols + nc; if (G[j] && !seen[j]) { seen[j] = 1; n++; st.push(j); } } }
    let all = 0; for (let i = 0; i < G.length; i++) if (G[i]) all++;
    if (n < all) err.push(`отрезанные места: ${all - n} клеток из ${all}`);

    for (const t of L.tents) if (t.y - t.d < L.AREA.y0 + 60 || t.y > L.AREA.y1 + 4 || t.x - t.w / 2 < 40 || t.x + t.w / 2 > L.W - 40) err.push(`палатка ${t.x} за краем`);
    return err;
  }
  return { ID, W, H, BASE, AREA, FENCE, BUILDINGS, FIRE, TENTS, PROPS, LINES, TRAIL, SPAWN, layout, get, map, scaleAt, check };
});
