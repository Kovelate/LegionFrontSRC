









(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LGWorldLib = factory();
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

   
   
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
   
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

   
  const GW = 7, GH = 12;
  const CW = 128, RH = 128;
  const SIDE = 64, W = GW * CW + SIDE * 2;
  const TOP = 420, Y0 = TOP, GRID_H = GH * RH, BOT = 520;
  const H = TOP + GRID_H + BOT;
  const VW = 1920, VX0 = -(VW - W) / 2;
  const cellXY = (i) => { const gx = i % GW, gy = Math.floor(i / GW); return { x: SIDE + gx * CW + CW / 2, y: Y0 + gy * RH + RH * 0.78, cx: SIDE + gx * CW + CW / 2, cy: Y0 + gy * RH + RH / 2 }; };
  const cellAt = (x, y) => { const gx = Math.floor((x - SIDE) / CW), gy = Math.floor((y - Y0) / RH); return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gy * GW + gx; };

  




  const YB = Y0 + GRID_H;
  const FOOT = [
    { k: 'lift', r: [30, 2340, 246, 2422], s: [30, 2200, 246, 2422], z: 2406 },
    { k: 'cart', r: [216, 2276, 444, 2350], s: [216, 2236, 444, 2350], z: 2342 },
    { k: 'board', r: [414, 2370, 590, 2430], s: [414, 2200, 590, 2430], z: 2416, at: [502, 2440] },
    { k: 'buyer', r: [650, 2300, 1000, 2400], s: [650, 2180, 1000, 2400], z: 2392, at: [770, 2434] },
    { k: 'npcBuy', npc: 'buy', r: [636, 2400, 692, 2432], s: [636, 2400, 692, 2432], z: 2426 },
    { k: 'lamp', lamp: 1, r: [264, 2120, 380, 2168], s: [264, 2090, 380, 2168], z: 2156, at: [490, 2176] },
    { k: 'npcLamp', npc: 'lamp', lamp: 1, r: [397, 2140, 453, 2172], s: [397, 2140, 453, 2172], z: 2166 },
  ];
  const ZONE = [56, YB + 20, 968, 2440];
  const feet = (o = {}) => FOOT.filter((f) => !f.lamp || o.lamp);
  const inR = (r, x, y) => x > r[0] && x < r[2] && y > r[1] && y < r[3];

  function segHit(a, b, r) {
    let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y, e = 0.5;
    for (const [p, q] of [[-dx, a.x - (r[0] + e)], [dx, (r[2] - e) - a.x], [-dy, a.y - (r[1] + e)], [dy, (r[3] - e) - a.y]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return t0 < t1;
  }
   
  function free(x, y, F = FOOT, stop = true) {
    x = +x || 0; y = +y || 0; if (y < YB) return { x, y };
    const cl = (px, py) => [Math.round(Math.max(ZONE[0], Math.min(ZONE[2], px))), Math.round(Math.max(ZONE[1], Math.min(ZONE[3], py)))];
    const R = F.map((f) => (stop ? f.s : f.r)), bad = (px, py) => R.some((r) => inR([r[0] - 3, r[1] - 3, r[2] + 3, r[3] + 3], px, py));
    const [cx, cy] = cl(x, y); if (!bad(cx, cy)) return { x: cx, y: cy };
    let best = null, bd = Infinity;
    const tryP = (px, py) => { const [qx, qy] = cl(px, py); if (bad(qx, qy)) return; const d = Math.hypot(qx - x, qy - y); if (d < bd) { bd = d; best = { x: qx, y: qy }; } };
    for (const r of R) { tryP(r[0] - 4, cy); tryP(r[2] + 4, cy); tryP(cx, r[1] - 4); tryP(cx, r[3] + 4); for (const px of [r[0] - 4, r[2] + 4]) for (const py of [r[1] - 4, r[3] + 4]) tryP(px, py); }
    for (let d = 24; !best && d < 700; d += 24) for (let a = 0; a < 24; a++) tryP(cx + Math.cos(a / 24 * Math.PI * 2) * d, cy + Math.sin(a / 24 * Math.PI * 2) * d);
    return best || { x: W / 2, y: YB + 56 };
  }
   
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

  

  function walkable(dug, i) { if (i >= GW * GH) return true; return !!dug[i]; }
  const cellOfPt = (x, y) => { if (y >= Y0 + GH * RH) return GW * GH + Math.max(0, Math.min(GW - 1, Math.floor((x - (W - GW * CW) / 2) / CW))); return cellAt(x, y); };
  const centerOf = (i) => { if (i >= GW * GH) { const gx = i - GW * GH; return { x: (W - GW * CW) / 2 + gx * CW + CW / 2, y: Y0 + GH * RH + 56 }; } const p = cellXY(i); return { x: p.cx, y: p.cy + 34 }; };
  function nbrs(i) {
    if (i >= GW * GH) { const gx = i - GW * GH, out = []; if (gx > 0) out.push(i - 1); if (gx < GW - 1) out.push(i + 1); out.push((GH - 1) * GW + gx); return out; }
    const gx = i % GW, gy = Math.floor(i / GW), out = [];
    if (gy > 0) out.push(i - GW); if (gx > 0) out.push(i - 1); if (gx < GW - 1) out.push(i + 1); out.push(gy < GH - 1 ? i + GW : GW * GH + gx);
    return out;
  }
   
  function pathTo(dug, from, to) {
    if (from === to) return [to];
    const prev = new Map([[from, -1]]), q = [from];
    while (q.length) { const i = q.shift(); if (i === to) break; for (const j of nbrs(i)) if (!prev.has(j) && walkable(dug, j)) { prev.set(j, i); q.push(j); } }
    if (!prev.has(to)) return null;
    const out = []; for (let i = to; i !== -1; i = prev.get(i)) out.unshift(i);
    return out;
  }

  function digSpot(dug, i) {
    const gx = i % GW, gy = Math.floor(i / GW);
    const cand = [gy < GH - 1 ? i + GW : GW * GH + gx, gx > 0 ? i - 1 : -1, gx < GW - 1 ? i + 1 : -1, gy > 0 ? i - GW : -1].filter((j) => j >= 0 && walkable(dug, j));
    return cand.length ? cand[0] : null;
  }
  

  function walkPt(dug, p, stop = true, F = FOOT) { const c = cellOfPt(p.x, p.y); if (c >= GW * GH) return free(p.x, p.y, F, stop); if (c >= 0 && dug[c]) return p; return free(Math.max(VX0 + 40, Math.min(W - 40, p.x)), Y0 + GH * RH + 56, F, true); }

   
   
  const AREA = { x0: 40, x1: 984, y0: 200, y1: 2440 };
   
  const GEO = { CW, RH, SIDE, Y0, GW, GH };
   
  const cellCenter = (i) => ({ x: GEO.SIDE + (i % GEO.GW) * GEO.CW + GEO.CW / 2, y: GEO.Y0 + Math.floor(i / GEO.GW) * GEO.RH + GEO.RH / 2 });
   
  const spawn = (k) => ({ x: GEO.SIDE + (k % GEO.GW) * GEO.CW + GEO.CW / 2 + ((Math.floor(k / GEO.GW) % 3) - 1) * 26, y: GEO.Y0 + GEO.GH * GEO.RH + 56 + (Math.floor(k / (GEO.GW * 3)) % 3) * 30 });
   
  const REACH = 200;

   
  const dugOf = (d) => (typeof d === 'string' ? d.split('').map((c) => (c === '1' ? 1 : 0)) : d || []);
  

  function mineStand(dug, x, y, stop = true, F = FOOT) { return walkPt(dugOf(dug), { x: +x || 0, y: +y || 0 }, stop, F); }

  const mine = { GW, GH, CW, RH, SIDE, W, H, TOP, Y0, GRID_H, BOT, VW, VX0, YB, cellXY, cellAt,
    FOOT, ZONE, feet, inR, segHit, free, route,
    walkable, cellOfPt, centerOf, nbrs, pathTo, digSpot, walkPt, dugOf, stand: mineStand,
    AREA, GEO, cellCenter, spawn, REACH };

  




  const M3C = new Map();
  function mine3(info) {
    const w = Math.max(1, +info.w || 1), h = Math.max(1, +info.h || 1), hb = info.hallBox || [0, 0, 4, 3], key = `${w}x${h}:${hb.join(',')}`;
    if (M3C.has(key)) return M3C.get(key);
    const PAD = 2, N = w * h, WW = (w + PAD * 2) * CW, HH = (h + PAD * 2) * RH, X0 = PAD * CW, Y0 = PAD * RH;
    const cellXY = (i) => { const gx = i % w, gy = Math.floor(i / w); return { x: X0 + gx * CW + CW / 2, y: Y0 + gy * RH + RH * 0.78, cx: X0 + gx * CW + CW / 2, cy: Y0 + gy * RH + RH / 2 }; };
    const cellAt = (x, y) => { const gx = Math.floor((x - X0) / CW), gy = Math.floor((y - Y0) / RH); return gx < 0 || gy < 0 || gx >= w || gy >= h ? -1 : gy * w + gx; };
    const hx = X0 + hb[0] * CW, hy = Y0 + hb[1] * RH, hw = hb[2] * CW, hh = hb[3] * RH;
    const ZONE = [hx + 12, hy + 40, hx + hw - 12, hy + hh - 10];
    const inHall = (i) => { if (i < 0) return false; const gx = i % w, gy = Math.floor(i / w); return gx >= hb[0] && gx < hb[0] + hb[2] && gy >= hb[1] && gy < hb[1] + hb[3]; };

    const FOOT = [
      { k: 'lift', r: [hx + 196, hy + 60, hx + 316, hy + 168], s: [hx + 196, hy, hx + 316, hy + 168], z: hy + 164 },
      { k: 'lamp', lamp: 1, r: [hx + 20, hy + 92, hx + 150, hy + 150], s: [hx + 20, hy + 40, hx + 150, hy + 150], z: hy + 146, at: [hx + 96, hy + 186] },
      { k: 'npcLamp', npc: 'lamp', lamp: 1, r: [hx + 150, hy + 118, hx + 186, hy + 150], s: [hx + 150, hy + 118, hx + 186, hy + 150], z: hy + 146 },
      { k: 'buyer', r: [hx + 20, hy + 280, hx + 176, hy + 344], s: [hx + 20, hy + 220, hx + 176, hy + 344], z: hy + 340, at: [hx + 120, hy + 366] },
      { k: 'npcBuy', npc: 'buy', r: [hx + 176, hy + 312, hx + 212, hy + 344], s: [hx + 176, hy + 312, hx + 212, hy + 344], z: hy + 340 },
      { k: 'board', r: [hx + 356, hy + 300, hx + 492, hy + 350], s: [hx + 356, hy + 230, hx + 492, hy + 350], z: hy + 346, at: [hx + 424, hy + 370] },
    ];
    const feet = (o = {}) => FOOT.filter((f) => !f.lamp || o.lamp);
    function free(x, y, F = FOOT, stop = true) {
      x = +x || 0; y = +y || 0;
      const cl = (px, py) => [Math.round(Math.max(ZONE[0], Math.min(ZONE[2], px))), Math.round(Math.max(ZONE[1], Math.min(ZONE[3], py)))];
      const R = F.map((f) => (stop ? f.s : f.r)), bad = (px, py) => R.some((r) => inR([r[0] - 3, r[1] - 3, r[2] + 3, r[3] + 3], px, py));
      const [cx, cy] = cl(x, y); if (!bad(cx, cy)) return { x: cx, y: cy };
      let best = null, bd = Infinity;
      const tryP = (px, py) => { const [qx, qy] = cl(px, py); if (bad(qx, qy)) return; const d = Math.hypot(qx - x, qy - y); if (d < bd) { bd = d; best = { x: qx, y: qy }; } };
      for (const r of R) { tryP(r[0] - 4, cy); tryP(r[2] + 4, cy); tryP(cx, r[1] - 4); tryP(cx, r[3] + 4); }
      for (let d = 16; !best && d < 600; d += 16) for (let a = 0; a < 24; a++) tryP(cx + Math.cos(a / 24 * Math.PI * 2) * d, cy + Math.sin(a / 24 * Math.PI * 2) * d);
      return best || { x: hx + hw / 2, y: hy + hh - 70 };
    }
    function route(a, b, F = FOOT) {
      const R = F.map((f) => f.r).filter((r) => !inR(r, a.x, a.y) && !inR(r, b.x, b.y)), clear = (p, q) => !R.some((r) => segHit(p, q, r));
      if (clear(a, b)) return [b];
      const P = [a, b]; for (const r of R) for (const [x, y] of [[r[0] - 6, r[1] - 6], [r[2] + 6, r[1] - 6], [r[0] - 6, r[3] + 6], [r[2] + 6, r[3] + 6]]) if (!R.some((q) => inR(q, x, y))) P.push({ x, y });
      const D = P.map(() => Infinity), PR = P.map(() => -1), done = P.map(() => false); D[0] = 0;
      for (;;) { let u = -1; for (let k = 0; k < P.length; k++) if (!done[k] && D[k] < Infinity && (u < 0 || D[k] < D[u])) u = k; if (u < 0 || u === 1) break; done[u] = true;
        for (let v = 0; v < P.length; v++) { if (done[v]) continue; const d = D[u] + Math.hypot(P[v].x - P[u].x, P[v].y - P[u].y); if (d < D[v] && clear(P[u], P[v])) { D[v] = d; PR[v] = u; } } }
      if (PR[1] < 0) return [b];
      const out = []; for (let k = 1; k > 0; k = PR[k]) out.unshift(P[k]); return out;
    }
    const walkable = (dug, i) => i >= 0 && i < N && !!dug[i];
    const cellOfPt = (x, y) => cellAt(x, y);
    const centerOf = (i) => { const p = cellXY(i); return { x: p.cx, y: p.cy + 34 }; };
    const nbrs = (i) => { const gx = i % w, gy = Math.floor(i / w), out = []; if (gy > 0) out.push(i - w); if (gx > 0) out.push(i - 1); if (gx < w - 1) out.push(i + 1); if (gy < h - 1) out.push(i + w); return out; };
    function pathTo(dug, from, to) {
      if (from === to) return [to];
      if (from < 0) return null;
      const prev = new Map([[from, -1]]), q = [from];
      for (let k = 0; k < q.length; k++) { const i = q[k]; if (i === to) break; for (const j of nbrs(i)) if (!prev.has(j) && walkable(dug, j)) { prev.set(j, i); q.push(j); } }
      if (!prev.has(to)) return null;
      const out = []; for (let i = to; i !== -1; i = prev.get(i)) out.unshift(i); return out;
    }

    function digSpot(dug, i) { const gx = i % w, gy = Math.floor(i / w); const c = [gy < h - 1 ? i + w : -1, gx > 0 ? i - 1 : -1, gx < w - 1 ? i + 1 : -1, gy > 0 ? i - w : -1].filter((j) => j >= 0 && walkable(dug, j)); return c.length ? c[0] : null; }
    const spawnAt = (k) => free(hx + 120 + (k % 7) * 40, hy + 210 + (Math.floor(k / 7) % 3) * 24);
    function walkPt(dug, p, stop = true, F = FOOT) {
      const c = cellAt(p.x, p.y);
      if (c >= 0 && inHall(c)) return free(p.x, p.y, F, stop);
      if (c >= 0 && dug[c]) return p;
      return spawnAt(0);
    }
    const dugOf3 = (d) => (typeof d === 'string' ? d.split('').map((ch) => (ch === '1' ? 1 : 0)) : d || []);
    const G3 = { v3: 1, w, h, PAD, CW, RH, W: WW, H: HH, X0, Y0, VX0: 0, VW: WW, cellXY, cellAt, hallBox: hb, hall: [hx, hy, hw, hh], inHall,
      FOOT, ZONE, feet, inR, segHit, free, route, walkable, cellOfPt, centerOf, nbrs, pathTo, digSpot, walkPt, dugOf: dugOf3,
      stand: (dug, x, y, stop = true, F = FOOT) => walkPt(dugOf3(dug), { x: +x || 0, y: +y || 0 }, stop, F),
      AREA: { x0: X0 + 20, x1: X0 + w * CW - 20, y0: Y0 + 20, y1: Y0 + h * RH - 10 }, cellCenter: (i) => { const p = cellXY(i); return { x: p.cx, y: p.cy }; },
      spawn: spawnAt, REACH };
    if (M3C.size > 40) M3C.clear();
    M3C.set(key, G3); return G3;
  }

   
   
  function stand(map, x, y) { if (map.free(x, y)) return [x, y]; return map.nearest(x, y); }

  return { hash, rng, pick, mine, mine3, stand };
});
