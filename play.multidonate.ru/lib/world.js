/* lib/world (26.10, этап 2 дорожной карты): одна реализация «где можно стоять и ходить» и детерминированной случайности - для страницы
   (window.LGWorldLib, отдаётся шлюзом как /lib/world.js) и для сервера/тестов (require / import). Правило в одном месте: герой не стоит
   и не ходит по стенам и воде - на сервере точки шага проходят через stand() / mine.stand(), страница ходит по тем же картам.
   Что здесь (перенесено, а не переписано):
   - rng / hash / pick - mulberry32 и FNV-1a по символам (были копии в minegen.js, towngen.js, craftworld.js, mine-biome.js …);
   - mine - шахта: размеры зала (craftworld.js), предметы входа FOOT и обход их free / route / segHit (craftworld.js, 25.10 mine/walk),
     проходимость зала по выкопанному: cellOfPt, centerOf, nbrs, walkable, pathTo, digSpot, walkPt (mine.js), площадка, центр камня,
     места появления и досягаемость камня (site.ts: MINE_AREA, mineCellCenter, mineSpawn, MINE_REACH);
   - stand(map, x, y) - точка на карте города (citymap.js / towngen.js - они лежат рядом, packages/world/citymap.js, towngen.js).
   Карты городов (сетка 16 px, A*, «нитка») - citymap.js makeFrom: Ярмарка - make(), город округа - towngen.js map(). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LGWorldLib = factory();
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- случайность: одно зерно - одно и то же у всех (страница, сервер, тесты) ---------- */
  /** FNV-1a 32 бита по символам строки (codePointAt): hash('…') → 0…2³²−1. */
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  /** mulberry32: rng(seed)() → [0, 1). Зерно 0 - как 1. */
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  /* ---------- шахта: зал 7 × 12 клеток по 128 px, стены по 64, сверху спуск, снизу площадка входа (craftworld.js рисует по ним) ---------- */
  const GW = 7, GH = 12;
  const CW = 128, RH = 128;                       // клетка зала
  const SIDE = 64, W = GW * CW + SIDE * 2;        // мир по ширине: стены по бокам
  const TOP = 420, Y0 = TOP, GRID_H = GH * RH, BOT = 520;
  const H = TOP + GRID_H + BOT;
  const VW = 1920, VX0 = -(VW - W) / 2;           // на ПК видно шире: по бокам — своды пещеры
  const cellXY = (i) => { const gx = i % GW, gy = Math.floor(i / GW); return { x: SIDE + gx * CW + CW / 2, y: Y0 + gy * RH + RH * 0.78, cx: SIDE + gx * CW + CW / 2, cy: Y0 + gy * RH + RH / 2 }; };
  const cellAt = (x, y) => { const gx = Math.floor((x - SIDE) / CW), gy = Math.floor((y - Y0) / RH); return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gy * GW + gx; };

  /* ---------- 25.10 (mine/walk): предметы входа и NPC - препятствия. Одна таблица на оба вида (craftworld и mine-art стоят на тех же опорах:
     подъёмник lx 150, лавка nx W-210, доска W/2-10, вагонетка 330, столб Фонарщика fx 210), её же берёт сервер (src/site/site.ts mineFix).
     r - пол под предметом: сквозь него не ходят; s - где не стоять (r и место за предметом, где героя закрыл бы рисунок);
     z - линия основания: ноги выше - герой за предметом, ниже - перед ним; at - куда подходить («к скупщику», «к доске»); lamp - есть
     только вместе с Фонарщиком. Все прямоугольники - [x0, y0, x1, y1] в координатах мира, только у входа (ниже зала камней). ---------- */
  const YB = Y0 + GRID_H;   // 1956: низ зала, дальше площадка входа
  const FOOT = [
    { k: 'lift', r: [30, 2340, 246, 2422], s: [30, 2200, 246, 2422], z: 2406 },
    { k: 'cart', r: [216, 2276, 444, 2350], s: [216, 2236, 444, 2350], z: 2342 },
    { k: 'board', r: [414, 2370, 590, 2430], s: [414, 2200, 590, 2430], z: 2416, at: [502, 2440] },
    { k: 'buyer', r: [650, 2300, 1000, 2400], s: [650, 2180, 1000, 2400], z: 2392, at: [770, 2434] },
    { k: 'npcBuy', npc: 'buy', r: [636, 2400, 692, 2432], s: [636, 2400, 692, 2432], z: 2426 },
    { k: 'lamp', lamp: 1, r: [264, 2120, 380, 2168], s: [264, 2090, 380, 2168], z: 2156, at: [490, 2176] },
    { k: 'npcLamp', npc: 'lamp', lamp: 1, r: [397, 2140, 453, 2172], s: [397, 2140, 453, 2172], z: 2166 },
  ];
  const ZONE = [56, YB + 20, 968, 2440];   // площадка входа, где можно стоять (как MINE_AREA сервера, без стен)
  const feet = (o = {}) => FOOT.filter((f) => !f.lamp || o.lamp);
  const inR = (r, x, y) => x > r[0] && x < r[2] && y > r[1] && y < r[3];
  // отрезок a-b проходит внутри прямоугольника (по краю - можно)
  function segHit(a, b, r) {
    let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y, e = 0.5;
    for (const [p, q] of [[-dx, a.x - (r[0] + e)], [dx, (r[2] - e) - a.x], [-dy, a.y - (r[1] + e)], [dy, (r[3] - e) - a.y]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return t0 < t1;
  }
  /** Ближайшее свободное место у входа (stop: где можно стоять - без «за предметом»; иначе только пол предметов). В зале - как есть. */
  function free(x, y, F = FOOT, stop = true) {
    x = +x || 0; y = +y || 0; if (y < YB) return { x, y };
    const cl = (px, py) => [Math.round(Math.max(ZONE[0], Math.min(ZONE[2], px))), Math.round(Math.max(ZONE[1], Math.min(ZONE[3], py)))];
    const R = F.map((f) => (stop ? f.s : f.r)), bad = (px, py) => R.some((r) => inR([r[0] - 3, r[1] - 3, r[2] + 3, r[3] + 3], px, py));   // с зазором: не на кромке (иначе путь «зажат» между двумя)
    const [cx, cy] = cl(x, y); if (!bad(cx, cy)) return { x: cx, y: cy };
    let best = null, bd = Infinity;
    const tryP = (px, py) => { const [qx, qy] = cl(px, py); if (bad(qx, qy)) return; const d = Math.hypot(qx - x, qy - y); if (d < bd) { bd = d; best = { x: qx, y: qy }; } };
    for (const r of R) { tryP(r[0] - 4, cy); tryP(r[2] + 4, cy); tryP(cx, r[1] - 4); tryP(cx, r[3] + 4); for (const px of [r[0] - 4, r[2] + 4]) for (const py of [r[1] - 4, r[3] + 4]) tryP(px, py); }
    for (let d = 24; !best && d < 700; d += 24) for (let a = 0; a < 24; a++) tryP(cx + Math.cos(a / 24 * Math.PI * 2) * d, cy + Math.sin(a / 24 * Math.PI * 2) * d);
    return best || { x: W / 2, y: YB + 56 };
  }
  /** Путь a → b в обход пола предметов (углы прямоугольников, кратчайший): точки после a, последняя - b. Не обойти - прямо. */
  function route(a, b, F = FOOT) {
    const R = F.map((f) => f.r).filter((r) => !inR(r, a.x, a.y) && !inR(r, b.x, b.y));
    const clear = (p, q) => !R.some((r) => segHit(p, q, r));
    if (clear(a, b)) return [b];
    const N = [a, b];
    for (const r of R) for (const [x, y] of [[r[0] - 6, r[1] - 6], [r[2] + 6, r[1] - 6], [r[0] - 6, r[3] + 6], [r[2] + 6, r[3] + 6]]) if (x >= ZONE[0] - 8 && x <= ZONE[2] + 8 && y >= YB && y <= ZONE[3] && !R.some((q) => inR(q, x, y))) N.push({ x, y });
    const D = N.map(() => Infinity), P = N.map(() => -1), done = N.map(() => false); D[0] = 0;
    for (;;) {
      let u = -1; for (let k = 0; k < N.length; k++) if (!done[k] && D[k] < Infinity && (u < 0 || D[k] < D[u])) u = k;
      if (u < 0 || u === 1) break; done[u] = true;
      for (let v = 0; v < N.length; v++) { if (done[v]) continue; const d = D[u] + Math.hypot(N[v].x - N[u].x, N[v].y - N[u].y); if (d < D[v] && clear(N[u], N[v])) { D[v] = d; P[v] = u; } }
    }
    if (P[1] < 0) return [b];
    const out = []; for (let k = 1; k > 0; k = P[k]) out.unshift(N[k]);
    return out;
  }

  /* ---------- зал: проходимость - расчищенные клетки + площадка входа (ряд 12: клетки 84…90 - колонки площадки). dug[i] - клетка
     выкопана (как строка вида шахты st.dug: '1' - выкопано; пустоты и вход открыты с начала - minegen startDug). Было в mine.js. ---------- */
  function walkable(dug, i) { if (i >= GW * GH) return true; return !!dug[i]; }
  const cellOfPt = (x, y) => { if (y >= Y0 + GH * RH) return GW * GH + Math.max(0, Math.min(GW - 1, Math.floor((x - (W - GW * CW) / 2) / CW))); return cellAt(x, y); };
  const centerOf = (i) => { if (i >= GW * GH) { const gx = i - GW * GH; return { x: (W - GW * CW) / 2 + gx * CW + CW / 2, y: Y0 + GH * RH + 56 }; } const p = cellXY(i); return { x: p.cx, y: p.cy + 34 }; };
  function nbrs(i) {
    if (i >= GW * GH) { const gx = i - GW * GH, out = []; if (gx > 0) out.push(i - 1); if (gx < GW - 1) out.push(i + 1); out.push((GH - 1) * GW + gx); return out; }
    const gx = i % GW, gy = Math.floor(i / GW), out = [];
    if (gy > 0) out.push(i - GW); if (gx > 0) out.push(i - 1); if (gx < GW - 1) out.push(i + 1); out.push(gy < GH - 1 ? i + GW : GW * GH + gx);
    return out;
  }
  /** Путь по клеткам (BFS, 4 соседа) от клетки from до to: [from, …, to] или null (не дойти). */
  function pathTo(dug, from, to) {
    if (from === to) return [to];
    const prev = new Map([[from, -1]]), q = [from];
    while (q.length) { const i = q.shift(); if (i === to) break; for (const j of nbrs(i)) if (!prev.has(j) && walkable(dug, j)) { prev.set(j, i); q.push(j); } }
    if (!prev.has(to)) return null;
    const out = []; for (let i = to; i !== -1; i = prev.get(i)) out.unshift(i);
    return out;
  }
  // где стоять, чтобы копать камень i: расчищенный сосед (снизу — лучше всего)
  function digSpot(dug, i) {
    const gx = i % GW, gy = Math.floor(i / GW);
    const cand = [gy < GH - 1 ? i + GW : GW * GH + gx, gx > 0 ? i - 1 : -1, gx < GW - 1 ? i + 1 : -1, gy > 0 ? i - GW : -1].filter((j) => j >= 0 && walkable(dug, j));
    return cand.length ? cand[0] : null;
  }
  /** Где стоять точке p: в выкопанной клетке зала - как есть; на площадке входа - не в предметах (F - feet(), stop - см. free);
   *  в камне, в стене зала, за краем или на спуске - на площадку входа под этим местом (25.10: этаж сменился, а шаг ещё не пришёл). */
  function walkPt(dug, p, stop = true, F = FOOT) { const c = cellOfPt(p.x, p.y); if (c >= GW * GH) return free(p.x, p.y, F, stop); if (c >= 0 && dug[c]) return p; return free(Math.max(VX0 + 40, Math.min(W - 40, p.x)), Y0 + GH * RH + 56, F, true); }

  /* ---------- сервер шахты (были в src/site/site.ts) ---------- */
  /** 23.10: мир промысла (1024 × 2476) — прямоугольник, в который сервер обрезает точки. */
  const AREA = { x0: 40, x1: 984, y0: 200, y1: 2440 };
  /** 25.10: геометрия зала: клетка 128, стены по 64, сетка с y = 420, 7 × 12. */
  const GEO = { CW, RH, SIDE, Y0, GW, GH };
  /** Центр камня i (середина клетки). */
  const cellCenter = (i) => ({ x: GEO.SIDE + (i % GEO.GW) * GEO.CW + GEO.CW / 2, y: GEO.Y0 + Math.floor(i / GEO.GW) * GEO.RH + GEO.RH / 2 });
  /** Площадка у входа (ниже сетки — всегда проходима): k-й зритель — в своей колонке, чуть вразброс. */
  const spawn = (k) => ({ x: GEO.SIDE + (k % GEO.GW) * GEO.CW + GEO.CW / 2 + ((Math.floor(k / GEO.GW) % 3) - 1) * 26, y: GEO.Y0 + GEO.GH * GEO.RH + 56 + (Math.floor(k / (GEO.GW * 3)) % 3) * 30 });
  /** 25.10: копать можно, только стоя рядом с камнем: не дальше стольких px от центра камня (страница - atRock, сервер - mineDig/mineGo). */
  const REACH = 200;

  /** Раскопки: строка вида шахты st.dug ('1' - выкопано) или массив 0/1 → массив 0/1 (в строке '0' - тоже «правда», поэтому так). */
  const dugOf = (d) => (typeof d === 'string' ? d.split('').map((c) => (c === '1' ? 1 : 0)) : d || []);
  /** 26.10: правило шахты для сервера - то же, что страница (walkPt): стоять можно в выкопанной клетке зала и на площадке входа не в
   *  предметах; в камне, в стене, за краем зала или на спуске - на площадку под этим местом. dug - строка или массив, F - feet(). */
  function mineStand(dug, x, y, stop = true, F = FOOT) { return walkPt(dugOf(dug), { x: +x || 0, y: +y || 0 }, stop, F); }

  const mine = { GW, GH, CW, RH, SIDE, W, H, TOP, Y0, GRID_H, BOT, VW, VX0, YB, cellXY, cellAt,
    FOOT, ZONE, feet, inR, segHit, free, route,
    walkable, cellOfPt, centerOf, nbrs, pathTo, digSpot, walkPt, dugOf, stand: mineStand,
    AREA, GEO, cellCenter, spawn, REACH };

  /* ---------- города: точка на карте (citymap.js make / hard / makeFrom, towngen.js map) - не в стене и не в воде ---------- */
  /** [x, y] на свободном месте карты map: свободна - как есть, иначе ближайшее свободное (map.nearest). */
  function stand(map, x, y) { if (map.free(x, y)) return [x, y]; return map.nearest(x, y); }

  return { hash, rng, pick, mine, stand };
});
