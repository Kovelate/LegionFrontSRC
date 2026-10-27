/* 23.10: вкладка сайта «Карта мира» — мир сезона, как в оверлее (quest/world.js, worldview.js), только смотреть.
   Грузится, только когда вкладку открыли (app.js → worldFiles). Требование стримера — не грузить ПК и телефоны зрителей:
   - геометрия — один раз (/site/worldgeo.json?v=…, кэш «навсегда»), рисунок — один SVG, собранный один раз;
     меняется только слой владельцев (раз в минуту, если данные поменялись);
   - сдвиг и масштаб: во время жеста — CSS-сдвиг готовой картинки (видеокарта, без перерисовки), в конце жеста (и не чаще
     раза в 250 мс при долгом перетаскивании) — новый viewBox: одна перерисовка на жест; в покое — ничего (ни таймеров кадров, ни анимаций);
   - подписи и значки — постоянного размера на экране (CSS-переменная --u — единиц мира на пиксель), мелкое — только при приближении;
   - данные: при открытии вкладки и не чаще раза в 60 с, пока вкладка видна; скрыта — ничего.
   Данные — /api/world (src/site/worldmap.ts): владельцы, брошенные / отросшие округа, врата и логова, сезон, таблица каналов,
   свой канал, где отряд (если идёт поход), в какие города зрителю можно сейчас (правило quest/towns.js townAccess). */
window.LGWorld = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const GROUND = { meadow: '#c4ca8c', forest: '#a7b878', taiga: '#9aac7c', ice: '#e3e9f1', mount: '#b8b29c', swamp: '#929c70', desert: '#dcc48a', ash: '#80696a', coast: '#d0cc94', ruin: '#ad9f88', blight: '#7a6e7c' };
  const OCEAN = '#6a8daa', INK = '#2a2236', PAPER = '#f6ecd2';
  const DANGER_RU = ['', 'спокойно', 'неспокойно', 'опасно', 'очень опасно', 'смертельно'];
  const KIND_RU = { village: 'деревня', settle: 'посёлок', capital: 'столица региона', grand: 'главный город мира', fair: 'Ярмарка', special: 'особое место' };
  const WHY_RU = { fair: 'Ярмарка — открыта всегда', owned: 'город вашего канала — вход открыт', party: 'отряд здесь, идёт эфир — вход участникам отряда', tester: 'тестерам открыты все города' };
  const REFRESH_MS = 60000;
  const Z2 = 0.055, Z3 = 0.16;   // пикселей на единицу мира: с Z2 — названия округов и ★, с Z3 — без названий регионов
  let X = null, root = null, G = null, D = null, Dkey = '', geoP = null, S = null, timer = 0, vis = false, loading = null;

  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => (X && X.now ? X.now() : Date.now());
  const leftRu = (ms) => { const m = Math.max(1, Math.ceil(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60; return d ? `${d} д ${h} ч` : h ? `${h} ч ${mm} мин` : `${mm} мин`; };
  const dateRu = (t) => { try { return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', ''); } catch (e) { return ''; } };
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const kindOf = (t) => { const k = t.tw && t.tw.k; if (!k) return null; if (k === 'fair') return 'fair'; if (k === 'grandcapital') return 'grand'; if (k === 'capital') return 'capital'; if (k === 'town') return t.d >= 2 ? 'settle' : 'village'; return 'special'; };

  /* ---------------- геометрия (один раз) ---------------- */
  const pairs = (f) => { const o = []; for (let i = 0; i + 1 < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
  const lineD = (p) => 'M' + p.map(([x, y]) => x + ' ' + y).join('L');
  function pip(rs, x, y) { let c = false; for (const p of rs) for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  function prep(g) {
    const chains = g.chains.map((c) => ({ l: c.l, r: c.r, p: pairs(c.p) }));
    const T = g.t.map((t) => {
      const poly = t.rings.map((ring) => { const o = []; for (const ref of ring) { const c = chains[ref >= 0 ? ref : ~ref], p = ref >= 0 ? c.p : c.p.slice().reverse(); for (let i = o.length ? 1 : 0; i < p.length; i++) o.push(p[i]); } return o; });
      let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const r of poly) for (const [x, y] of r) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; }
      return { ...t, poly, bb: [a, b, c, d], dd: poly.map((r) => lineD(r) + 'Z').join('') };
    });
    const byId = new Map(T.map((t) => [t.id, t])), R = new Map(g.regions.map((r) => [r.id, r]));
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const t of T) { a = Math.min(a, t.bb[0]); b = Math.min(b, t.bb[1]); c = Math.max(c, t.bb[2]); d = Math.max(d, t.bb[3]); }
    return { g, T, byId, R, chains, land: [a, b, c, d] };
  }

  /* ---------------- рисунок: значки природы ---------------- */
  const GLYPH = {
    meadow: '<path d="M-40 30 Q-34 -10 -26 -36 M0 30 Q2 -20 6 -50 M40 30 Q34 -6 26 -32" stroke="#93a65e" stroke-width="12" fill="none" stroke-linecap="round"/>',
    forest: '<rect x="-9" y="10" width="18" height="40" fill="#6d5a3c"/><circle cx="0" cy="-12" r="44" fill="#7f9a52"/><circle cx="-14" cy="-24" r="16" fill="#97b066"/>',
    taiga: '<rect x="-7" y="30" width="14" height="24" fill="#5e4a32"/><path d="M0 -70 L40 34 L-40 34 Z" fill="#5f7d56"/><path d="M0 -70 L14 -34 L-6 -30 Z" fill="#7a9870"/>',
    ice: '<path d="M-70 40 L-24 -26 L0 4 L28 -44 L80 40 Z" fill="#c6d2e2"/><path d="M28 -44 L44 -18 L24 -10 Z M-24 -26 L-12 -8 L-30 -6 Z" fill="#fff"/>',
    mount: '<path d="M-90 50 L-20 -70 L20 -10 L44 -44 L100 50 Z" fill="#958e7a"/><path d="M-20 -70 L-2 -40 L-20 -32 L-34 -46 Z" fill="#f2f0ea"/>',
    swamp: '<path d="M-50 30 L-46 -30 M-20 30 L-16 -44 M10 30 L14 -24 M-70 34 Q-10 20 60 34" stroke="#66744a" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="-30" rx="10" ry="18" fill="#6a5338"/>',
    desert: '<path d="M-80 30 Q-30 -30 20 30 M0 10 Q40 -26 84 22" stroke="#c4a364" stroke-width="12" fill="none" stroke-linecap="round"/>',
    ash: '<path d="M-60 -20 L-20 0 L-34 30 L10 16 L40 40 M-20 0 L20 -30 L60 -24" stroke="#5a4248" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    coast: '<path d="M-60 0 Q-40 -18 -20 0 Q0 18 20 0 Q40 -18 60 0" stroke="#b9b276" stroke-width="10" fill="none" stroke-linecap="round"/>',
    ruin: '<rect x="-50" y="-10" width="22" height="50" fill="#8a7c66"/><rect x="0" y="-40" width="22" height="80" fill="#8a7c66"/><path d="M0 -40 L22 -40 L22 -26 L12 -32 Z" fill="#a0927a"/><rect x="-60" y="36" width="96" height="10" fill="#7a6c58"/>',
    blight: '<path d="M0 50 L0 -10 L-30 -50 M0 -10 L26 -44 M0 10 L-24 -6 M0 6 L22 -6" stroke="#4e4256" stroke-width="10" fill="none" stroke-linecap="round"/>',
  };
  function glyphSpots(W) {
    const out = [], STEP = 400;
    for (const t of W.T) {
      if (t.gate || t.lair) continue;
      const [a, b, c, d] = t.bb, h = hash(t.id);
      for (let y = Math.ceil(b / STEP) * STEP; y < d; y += STEP) for (let x = Math.ceil(a / STEP) * STEP; x < c; x += STEP) {
        const k = hash(t.id + ':' + x + ':' + y), jx = x + ((k % 200) - 100), jy = y + (((k >> 8) % 200) - 100);
        if (((k >> 16) & 7) === 0) continue;   // проплешины — не сетка
        if (!pip(t.poly, jx, jy)) continue;
        if (Math.hypot(jx - t.c[0], jy - t.c[1]) < 420) continue;   // подпись
        if (t.tw && Math.hypot(jx - t.tw.x, jy - t.tw.y) < 260) continue;   // город
        // у края округа значки не лезут на соседа: проверка ещё двух точек
        if (!pip(t.poly, jx + 70, jy) || !pip(t.poly, jx - 70, jy)) continue;
        out.push([t.b, jx, jy, 0.8 + ((k >> 20) % 5) / 10 + (h % 3) / 20]);
      }
    }
    return out;
  }
  // значки поверх — постоянного размера на экране (scale(var(--u)): единиц мира на пиксель)
  const icon = (x, y, body, cls = '') => `<g class="ic ${cls}" style="transform:translate(${x}px,${y}px) scale(var(--ui))">${body}</g>`;
  const ICON = {
    lock: '<g transform="translate(9 -9)"><rect x="-6" y="-2" width="12" height="10" rx="2" fill="#2a2236"/><path d="M-3.5 -2v-3a3.5 3.5 0 0 1 7 0v3" stroke="#2a2236" stroke-width="2" fill="none"/><circle cx="0" cy="3" r="1.6" fill="#ffd76a"/></g>',
    tower: '<path d="M-6 9 L-5 -6 L-8 -6 L-8 -11 L-4 -11 L-4 -8 L-1 -8 L-1 -11 L1 -11 L1 -8 L4 -8 L4 -11 L8 -11 L8 -6 L5 -6 L6 9 Z" fill="#3a2f46" stroke="#f6ecd2" stroke-width="1.4" stroke-linejoin="round"/><rect x="-1.5" y="-2" width="3" height="5" fill="#e0a83a"/>',
    gate: '<path d="M-10 9 L-10 -5 Q0 -14 10 -5 L10 9 L5 9 L5 -1 Q0 -6 -5 -1 L-5 9 Z" fill="#6a5a48" stroke="#f6ecd2" stroke-width="1.4" stroke-linejoin="round"/>',
    flag: '<path d="M-1 10 L-1 -14" stroke="#2a2236" stroke-width="2.4" stroke-linecap="round"/><path d="M0 -14 L14 -9 L0 -4 Z" fill="#c8102e" stroke="#2a2236" stroke-width="1.4" stroke-linejoin="round"/><circle cx="-1" cy="10" r="3" fill="#2a2236"/>',
    restless: '<circle r="6" fill="#8a1a2a" stroke="#fff4cc" stroke-width="1.4"/><path d="M0 -3.2 L0 0.8" stroke="#fff4cc" stroke-width="2" stroke-linecap="round"/><circle cy="3.1" r="1.05" fill="#fff4cc"/>',
  };
  const townMark = (t) => {
    const k = t.tw.k;
    if (k === 'grandcapital') return '<circle r="9" fill="#f6ecd2" stroke="#2a2236" stroke-width="2"/><circle r="5" fill="#c9932e" stroke="#2a2236" stroke-width="1.5"/>';
    if (k === 'capital') return '<circle r="6.5" fill="#f6ecd2" stroke="#2a2236" stroke-width="2"/><circle r="2.6" fill="#2a2236"/>';
    if (k === 'town' || k === 'fair') return '<rect x="-3.5" y="-3.5" width="7" height="7" rx="1" fill="#f6ecd2" stroke="#2a2236" stroke-width="1.6"/>';
    if (k === 'gate' || k === 'tower' || k === 'spire' || k === 'citadel' || k === 'skull' || k === 'bastion' || k === 'blacktower') return '';
    return '<path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill="#8a1a2a" stroke="#f6ecd2" stroke-width="1.4"/>';
  };

  function baseSvg(W) {
    const g = W.g, vb = g.vb;
    const coast = W.chains.filter((c) => c.l == null || c.r == null).map((c) => lineD(c.p)).join('');
    const isles = g.isles.map((f) => lineD(pairs(f)) + 'Z').join('');
    const regionB = W.chains.filter((c) => c.l != null && c.r != null && W.byId.get(c.l).r !== W.byId.get(c.r).r).map((c) => lineD(c.p)).join('');
    const distB = W.chains.filter((c) => c.l != null && c.r != null && W.byId.get(c.l).r === W.byId.get(c.r).r).map((c) => lineD(c.p)).join('');
    const rivers = g.rivers.map((r) => `<path d="${lineD(pairs(r.p))}" stroke-width="${Math.round((r.w[0] + r.w[1]) / 2)}"/>`).join('');
    const spots = glyphSpots(W);
    const defs = Object.entries(GLYPH).map(([k, v]) => `<symbol id="wmg-${k}" overflow="visible">${v}</symbol>`).join('')
      + '<pattern id="wm-hatch" patternUnits="userSpaceOnUse" width="90" height="90" patternTransform="rotate(45)"><rect width="90" height="90" fill="#cfc8bc" fill-opacity=".55"/><path d="M0 0 V90" stroke="#5f5a70" stroke-width="26" stroke-opacity=".55"/></pattern>'
      + '<pattern id="wm-fog" patternUnits="userSpaceOnUse" width="240" height="240"><rect width="240" height="240" fill="#ece8f2" fill-opacity=".5"/><circle cx="60" cy="70" r="40" fill="#fff" fill-opacity=".25"/><circle cx="180" cy="170" r="56" fill="#fff" fill-opacity=".2"/></pattern>';
    const labels = [];
    for (const r of g.regions) labels.push(`<text class="lb lb-r" x="${r.c[0]}" y="${r.c[1]}">${esc(r.n)}</text>`);
    for (const t of W.T) {
      const big = t.grand || t.cap;
      labels.push(`<text class="lb lb-d${big ? ' lb-cap' : ''}${t.grand ? ' lb-grand' : ''}" x="${t.c[0]}" y="${t.c[1]}">${esc(t.n)}<tspan class="st" x="${t.c[0]}" dy="1.25em">${'★'.repeat(t.d)}</tspan></text>`);
      if (t.tw && !t.gate && !t.lair) { const m = townMark(t); if (m) labels.push(icon(t.tw.x, t.tw.y, m, 'tm' + (big ? ' tm-cap' : '') + (t.grand ? ' tm-grand' : ''))); }
      if (t.lair) labels.push(icon(t.c[0], t.c[1] - 220, ICON.tower, 'tm-l'));
      if (t.gate) labels.push(icon(t.c[0], t.c[1] - 200, ICON.gate, 'tm-l'));
    }
    return `<svg class="wm-svg z1" xmlns="${NS}" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Карта мира сезона">`
      + `<defs>${defs}</defs>`
      + `<rect x="${vb[0] - 20000}" y="${vb[1] - 20000}" width="${vb[2] + 40000}" height="${vb[3] + 40000}" fill="${OCEAN}"/>`
      + `<path d="${coast}${isles}" fill="none" stroke="#87a9c2" stroke-width="420" stroke-linejoin="round" stroke-opacity=".6"/>`
      + `<path d="${coast}${isles}" fill="none" stroke="#a6c4d6" stroke-width="170" stroke-linejoin="round" stroke-opacity=".75"/>`
      + `<path d="${isles}" fill="${GROUND.coast}"/>`
      + `<g class="wm-land">${W.T.map((t) => `<path data-id="${t.id}" d="${t.dd}" fill="${GROUND[t.b] || GROUND.meadow}" fill-rule="evenodd"/>`).join('')}</g>`
      + `<g class="wm-gl">${spots.map(([b, x, y, k]) => `<use href="#wmg-${b}" transform="translate(${x} ${y}) scale(${k})"/>`).join('')}</g>`
      + `<g class="wm-riv" fill="none" stroke="#7fa6c4" stroke-linecap="round" stroke-linejoin="round">${rivers}</g>`
      + `<path class="wm-wall" d="${lineD(pairs(g.barrier))}"/>`
      + `<path class="wm-b wm-bd" d="${distB}"/><path class="wm-b wm-br" d="${regionB}"/><path class="wm-b wm-bc" d="${coast}${isles}"/>`
      + `<g class="wm-ov"></g>`
      + `<path class="wm-sel" d=""/>`
      + `<g class="wm-lb">${labels.join('')}</g>`
      + `<g class="wm-ic"></g>`
      + `</svg>`;
  }

  /* ---------------- слой состояния (владельцы, туман, брошенные, отросшие, замки, отряд) ---------------- */
  function overlay() {
    const W = G, d = D, t0 = now(), ov = [], ic = [];
    const cleared = new Set(Object.keys(d.t).filter((id) => d.t[id].c));
    const open = new Set(); for (const id of cleared) for (const n of (W.byId.get(id) || { nb: [] }).nb) open.add(n);
    for (const t of W.T) {
      const s = d.t[t.id];
      if (t.pro) continue;
      if (!s || !s.c) { if (!open.has(t.id)) ov.push(`<path d="${t.dd}" fill="url(#wm-fog)" class="fog"/>`); continue; }
      if (s.o == null) { ov.push(`<path d="${t.dd}" fill="url(#wm-hatch)" class="ab"/>`); }
      else {
        const c = d.ch[s.o], col = (c && c[1]) || '#5a5a6a', mine = c && c[0] === d.me;
        ov.push(`<path d="${t.dd}" fill="${col}" fill-opacity="${mine ? 0.5 : 0.38}" stroke="${col}" class="own${mine ? ' mine' : ''}" data-ch="${esc(c && c[0])}"/>`);
      }
      if (s.rg != null && t0 >= s.rg) { ov.push(`<path d="${t.dd}" class="rs"/>`); ic.push(icon(t.c[0] + 260, t.c[1] - 260, ICON.restless, 'tm-x')); }
    }
    // свои земли — поверх всех (золотая кайма видна целиком)
    for (const t of W.T) { const s = d.t[t.id]; if (s && s.o != null && d.ch[s.o] && d.ch[s.o][0] === d.me) ov.push(`<path d="${t.dd}" class="mine-o"/>`); }
    // врата и логова: закрыты — замок
    for (const t of W.T) {
      if (t.gate) { const at = d.gates[t.id]; if (at == null || t0 < at) ic.push(icon(t.c[0], t.c[1] - 200, ICON.lock, 'tm-l')); }
      if (t.lair && (d.lairsAt == null || t0 < d.lairsAt)) ic.push(icon(t.c[0], t.c[1] - 220, ICON.lock, 'tm-l'));
    }
    if (d.party && W.byId.get(d.party)) { const t = W.byId.get(d.party); ic.push(icon(t.c[0] - 300, t.c[1] - 120, ICON.flag, 'tm-p')); }
    S.svg.querySelector('.wm-ov').innerHTML = ov.join('');
    S.svg.querySelector('.wm-ic').innerHTML = ic.join('');
  }

  /* ---------------- вид: сдвиг и масштаб ---------------- */
  function size() { const r = S.map.getBoundingClientRect(); S.w = Math.max(1, r.width); S.h = Math.max(1, r.height); }
  function fitOf(bb, pad = 0.06) {
    const w = (bb[2] - bb[0]) * (1 + pad * 2) || 1, h = (bb[3] - bb[1]) * (1 + pad * 2) || 1;
    return { cx: (bb[0] + bb[2]) / 2, cy: (bb[1] + bb[3]) / 2, k: Math.min(S.w / w, S.h / h) };
  }
  const kMin = () => fitOf(G.land).k * 0.85, kMax = () => Math.max(fitOf(G.land).k * 4, 0.45);
  function clampView(v) {
    const k = clamp(v.k, kMin(), kMax()), L = G.land, hw = S.w / 2 / k, hh = S.h / 2 / k;
    const cx = (L[2] - L[0]) < hw * 2 ? (L[0] + L[2]) / 2 : clamp(v.cx, L[0] + hw * 0.3, L[2] - hw * 0.3);
    const cy = (L[3] - L[1]) < hh * 2 ? (L[1] + L[3]) / 2 : clamp(v.cy, L[1] + hh * 0.3, L[3] - hh * 0.3);
    return { cx, cy, k };
  }
  // готовый рисунок (S.v) → живой вид (S.live): во время жеста — только CSS-сдвиг картинки
  function preview() {
    const a = S.v, b = S.live, m = b.k / a.k;
    const tx = S.w / 2 - m * S.w / 2 + (a.cx - b.cx) * b.k, ty = S.h / 2 - m * S.h / 2 + (a.cy - b.cy) * b.k;
    S.svg.style.transform = `translate(${tx}px,${ty}px) scale(${m})`;
  }
  function commit() {
    clearTimeout(S.cT); S.cT = 0; S.lastCommit = performance.now();
    S.v = S.live = clampView(S.live);
    const { cx, cy, k } = S.v, w = S.w / k, h = S.h / k;
    S.svg.setAttribute('viewBox', `${cx - w / 2} ${cy - h / 2} ${w} ${h}`);
    S.svg.style.transform = '';
    S.svg.style.setProperty('--u', String(1 / k));
    S.svg.style.setProperty('--ui', String((S.w < 600 && k < Z2 ? 0.72 : 1) / k));   // телефон во весь мир — значки мельче
    // что подписывать — по настоящему масштабу (пикселей на единицу мира), а не «во сколько раз приблизили»: на телефоне и на ПК
    // названия округов появляются, когда им хватает места
    const cls = k < Z2 ? 'z1' : k < Z3 ? 'z2' : 'z3';
    S.svg.classList.toggle('narrow', S.w < 600);
    if (S.z !== cls) { S.svg.classList.remove('z1', 'z2', 'z3'); S.svg.classList.add(cls); S.z = cls; }
    if (S.home) S.home.disabled = !homeBox();
  }
  function setLive(v, soon) {
    S.live = clampView(v); preview();
    if (soon === true) commit();
    else if (soon === 'drag') { if (performance.now() - S.lastCommit > 250) commit(); }   // долгое перетаскивание — края дорисовываются
    else { clearTimeout(S.cT); S.cT = setTimeout(commit, 160); }
  }
  const toWorld = (px, py, v = S.live) => [v.cx + (px - S.w / 2) / v.k, v.cy + (py - S.h / 2) / v.k];
  function zoomAt(px, py, f, soon) {
    const v = S.live, k = clamp(v.k * f, kMin(), kMax()), [wx, wy] = toWorld(px, py, v);
    setLive({ k, cx: wx - (px - S.w / 2) / k, cy: wy - (py - S.h / 2) / k }, soon);
  }
  function flyTo(bb, pad) { const f = fitOf(bb, pad); setLive({ cx: f.cx, cy: f.cy, k: Math.min(f.k, kMax()) }, true); }

  function bindGestures() {
    const el = S.map, P = new Map();
    let start = null, moved = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.wm-card, .wm-ui, .wm-home')) return;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      P.set(e.pointerId, [e.clientX, e.clientY]); moved = P.size > 1 ? 99 : 0;
      start = { v: { ...S.live }, pts: [...P.values()].map((p) => p.slice()), t: e.target };
    });
    el.addEventListener('pointermove', (e) => {
      if (!P.has(e.pointerId) || !start) return;
      P.set(e.pointerId, [e.clientX, e.clientY]);
      const r = el.getBoundingClientRect(), pts = [...P.values()];
      if (pts.length === 1 && start.pts.length === 1) {
        const dx = pts[0][0] - start.pts[0][0], dy = pts[0][1] - start.pts[0][1]; moved = Math.max(moved, Math.hypot(dx, dy));
        if (moved < 5) return;
        setLive({ k: start.v.k, cx: start.v.cx - dx / start.v.k, cy: start.v.cy - dy / start.v.k }, 'drag');
      } else if (pts.length >= 2) {
        if (start.pts.length < 2) { start = { v: { ...S.live }, pts: pts.map((p) => p.slice()) }; return; }
        const d0 = Math.hypot(start.pts[0][0] - start.pts[1][0], start.pts[0][1] - start.pts[1][1]) || 1, d1 = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
        const m0 = [(start.pts[0][0] + start.pts[1][0]) / 2 - r.left, (start.pts[0][1] + start.pts[1][1]) / 2 - r.top], m1 = [(pts[0][0] + pts[1][0]) / 2 - r.left, (pts[0][1] + pts[1][1]) / 2 - r.top];
        const k = clamp(start.v.k * d1 / d0, kMin(), kMax()), [wx, wy] = toWorld(m0[0], m0[1], start.v);
        setLive({ k, cx: wx - (m1[0] - S.w / 2) / k, cy: wy - (m1[1] - S.h / 2) / k }, 'later');
      }
    });
    const up = (e) => {
      if (!P.has(e.pointerId)) return;
      P.delete(e.pointerId);
      if (P.size) { start = { v: { ...S.live }, pts: [...P.values()].map((p) => p.slice()) }; return; }
      const tap = moved < 5 && start; start = null;
      if (S.svg.style.transform) commit();
      if (tap && e.type === 'pointerup') { const p = document.elementFromPoint(e.clientX, e.clientY), id = p && p.closest && p.closest('.wm-land [data-id]'); pick(id ? id.dataset.id : null); }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-clamp(e.deltaY, -120, 120) * 0.0022)); }, { passive: false });
    el.addEventListener('keydown', (e) => {
      const st = 80 / S.live.k, v = S.live;
      if (e.key === 'ArrowLeft') setLive({ ...v, cx: v.cx - st }); else if (e.key === 'ArrowRight') setLive({ ...v, cx: v.cx + st });
      else if (e.key === 'ArrowUp') setLive({ ...v, cy: v.cy - st }); else if (e.key === 'ArrowDown') setLive({ ...v, cy: v.cy + st });
      else if (e.key === '+' || e.key === '=') zoomAt(S.w / 2, S.h / 2, 1.4); else if (e.key === '-') zoomAt(S.w / 2, S.h / 2, 1 / 1.4);
      else if (e.key === 'Escape') pick(null);
      else return;
      e.preventDefault();
    });
  }

  /* ---------------- карточка округа ---------------- */
  function enterInfo(t) {
    const d = D, why = d.enter && d.enter[t.id];
    if (!t.tw) return { html: '' };
    const kind = kindOf(t);
    if (why) return { ok: true, why, html: `<p class="wm-en ok">${esc(WHY_RU[why] || 'вход открыт')}</p><button type="button" class="btn wm-go" data-go="${esc(t.id)}" data-why="${esc(why)}">Войти в город</button>` };
    if (kind === 'fair' && !d.city) return { html: '<p class="wm-en">«Город» вам пока закрыт.</p>' };
    if (!t.city) return { html: t.gate || t.lair ? '' : `<p class="wm-en">Войти нельзя: на сайте открыты города только округов ★1–2.</p>` };
    if (!d.city) return { html: '<p class="wm-en">«Город» вам пока закрыт.</p>' };
    return { html: `<p class="wm-en">Сейчас закрыт: откроется, когда канал захватит округ. На стриме — участникам отряда, пока отряд стоит здесь.</p>` };
  }
  function cardHtml(t) {
    const d = D, s = d.t[t.id] || null, t0 = now(), reg = G.R.get(t.r);
    const rows = [];
    rows.push(['Опасность', `<span class="wm-st" aria-label="${t.d} из 5">${stars(t.d)}</span> <span class="mu">${DANGER_RU[t.d] || ''} · ур. ${t.lv}</span>`]);
    rows.push(['Природа', esc((G.g.biomes || {})[t.b] || t.b)]);
    let own;
    if (t.pro) own = '<span class="mu">Пролог — у каждого канала свой</span>';
    else if (s && s.o != null) { const c = d.ch[s.o] || []; own = `<i class="wm-sw" style="background:${esc(c[1] || '#5a5a6a')}"></i>${esc(c[0] || '?')}${c[0] === d.me ? ' <span class="wm-tag">ваш канал</span>' : ''}`; }
    else if (s && s.c) own = '<i class="wm-sw wm-sw-ab"></i>ничей — брошен';
    else own = '<span class="mu">никто не захватил</span>';
    rows.push(['Владелец', own]);
    if (s && s.rg != null && !t.pro) rows.push(['Сейчас', t0 >= s.rg ? '<b class="wm-rs">снова неспокойно — можно зачистить</b>' : `спокойно, восстановится через ${leftRu(s.rg - t0)}`]);
    else if (!s || !s.c) rows.push(['Сейчас', '<span class="mu">ещё никто не зачищал</span>']);
    if (t.gate) { const at = d.gates[t.id]; rows.push(['Врата', at == null ? 'закрыты — сезон ещё не начат' : t0 < at ? `закрыты, откроются через ${leftRu(at - t0)}` : 'открыты']); }
    if (t.lair) rows.push(['Логово', d.lairsAt == null ? 'закрыто — сезон ещё не начат' : t0 < d.lairsAt ? `закрыто, откроется через ${leftRu(d.lairsAt - t0)}` : 'открыто']);
    if (t.tw && !t.gate && !t.lair) { const k = kindOf(t); rows.push(['Город', `${esc(t.tw.n)} <span class="mu">· ${esc(KIND_RU[k] || '')}</span>`]); }
    const en = enterInfo(t);
    return `<button type="button" class="wm-x" aria-label="Закрыть">×</button>`
      + `<h3>${esc(t.n)}</h3><p class="wm-rg">${esc(reg ? reg.n : '')}${t.grand ? ' · главный город мира' : t.cap ? ' · столица региона' : t.sp ? ' · особое место региона' : ''}</p>`
      + (d.party === t.id ? '<p class="wm-pt">Здесь отряд вашего канала — идёт поход</p>' : '')
      + `<dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>` + en.html;
  }
  function pick(id) {
    S.sel = id || null;
    const card = S.card, t = id && G.byId.get(id);
    S.svg.querySelector('.wm-sel').setAttribute('d', t ? t.dd : '');
    S.map.classList.toggle('carded', !!t);
    if (!t) { card.hidden = true; card.innerHTML = ''; return; }
    card.innerHTML = cardHtml(t); card.hidden = false;
    card.querySelector('.wm-x').onclick = () => pick(null);
    const go = card.querySelector('[data-go]');
    if (go) go.onclick = () => { const tid = go.dataset.go; X.openTown(tid === 'edge' ? 'fair' : tid, go.dataset.why); };
    try { S.sr.textContent = `${t.n}: опасность ${t.d} из 5`; } catch (e) {}
  }

  /* ---------------- боковая панель: сезон, каналы, легенда ---------------- */
  function seasonHtml() {
    const se = D.season || {}, t0 = now();
    if (se.startsAt == null) return `<p class="wm-se"><b>Сезон ${se.no || 1}</b> · ещё не начат</p>`;
    const g = Object.values(D.gates || {}).filter((x) => x != null), gAt = g.length ? Math.min(...g) : null;
    const left = se.endsAt != null ? (se.over ? 'сезон окончен — ждём итогов' : `до конца ${leftRu(se.endsAt - t0)}`) : '';
    return `<p class="wm-se"><b>Сезон ${se.no || 1}</b> · ${dateRu(se.startsAt)}${se.endsAt != null ? ' — ' + dateRu(se.endsAt) : ''}${left ? ' · ' + left : ''}`
      + `${gAt != null ? ` · врата ${t0 < gAt ? 'откроются через ' + leftRu(gAt - t0) : 'открыты'}` : ''}</p>`;
  }
  function sideHtml() {
    const d = D, top = d.top || [];
    const list = top.length ? `<ol class="wm-top">${top.map((r) => `<li${r.ch === d.me ? ' class="me"' : ''}><button type="button" data-ch="${esc(r.ch)}"><span class="wm-pl">${r.place}</span><i class="wm-sw" style="background:${esc(r.color || '#5a5a6a')}"></i><span class="wm-nm">${esc(r.ch)}${r.capital ? ' <span title="Владеет главным городом" aria-label="владеет главным городом">♛</span>' : ''}</span><span class="wm-n">${r.held} окр.</span><span class="wm-inf" title="Влияние">${r.inf}</span></button></li>`).join('')}</ol>`
      : '<p class="mu">Округа ещё никто не захватил.</p>';
    return `<section class="wm-box"><h3>Каналы по землям</h3>${list}<p class="mu wm-fine">Влияние — по захваченным округам (чем опаснее, тем больше); главная награда сезона — владельцу Престольграда.</p></section>`
      + `<section class="wm-box"><h3>Обозначения</h3><ul class="wm-leg">`
      + `<li><i class="wm-sw wm-sw-me" style="background:${esc(d.color || '#c8102e')}"></i>земли вашего канала (${esc(d.me)})</li>`
      + `<li><i class="wm-sw wm-sw-other"></i>земли других каналов — их цветом</li>`
      + `<li><i class="wm-sw wm-sw-ab"></i>брошенный округ — ничей</li>`
      + `<li><i class="wm-sw wm-sw-fog"></i>туман — ещё никто не зачищал</li>`
      + `<li><svg class="wm-li" viewBox="-10 -10 20 20" aria-hidden="true">${ICON.restless}</svg>снова неспокойно — можно отбить</li>`
      + `<li><svg class="wm-li" viewBox="-12 -15 26 28" aria-hidden="true">${ICON.flag}</svg>отряд вашего канала (идёт поход)</li>`
      + `<li><svg class="wm-li" viewBox="-12 -14 30 26" aria-hidden="true">${ICON.tower}${ICON.lock}</svg>логово или врата — закрыты до срока</li>`
      + `<li><span class="wm-st">★★★</span>опасность округа (из 5)</li>`
      + `<li><svg class="wm-li" viewBox="-10 -10 20 20" aria-hidden="true"><rect x="-4" y="-4" width="8" height="8" rx="1" fill="#f6ecd2" stroke="#2a2236" stroke-width="1.8"/></svg>город · <svg class="wm-li" viewBox="-10 -10 20 20" aria-hidden="true"><circle r="7" fill="#f6ecd2" stroke="#2a2236" stroke-width="2"/><circle r="3" fill="#2a2236"/></svg>столица</li>`
      + `</ul></section>`;
  }
  function homeBox() {
    const d = D; if (!d) return null;
    const mine = G.T.filter((t) => { const s = d.t[t.id]; return s && s.o != null && d.ch[s.o] && d.ch[s.o][0] === d.me; });
    const at = d.party || d.home, list = mine.length ? mine : at && G.byId.get(at) ? [G.byId.get(at)] : [];
    if (!list.length) return null;
    const bb = [1e9, 1e9, -1e9, -1e9]; for (const t of list) { bb[0] = Math.min(bb[0], t.bb[0]); bb[1] = Math.min(bb[1], t.bb[1]); bb[2] = Math.max(bb[2], t.bb[2]); bb[3] = Math.max(bb[3], t.bb[3]); }
    return bb;
  }
  function chBox(ch) {
    const i = D.ch.findIndex((c) => c[0] === ch); if (i < 0) return null;
    const list = G.T.filter((t) => D.t[t.id] && D.t[t.id].o === i); if (!list.length) return null;
    const bb = [1e9, 1e9, -1e9, -1e9]; for (const t of list) { bb[0] = Math.min(bb[0], t.bb[0]); bb[1] = Math.min(bb[1], t.bb[1]); bb[2] = Math.max(bb[2], t.bb[2]); bb[3] = Math.max(bb[3], t.bb[3]); }
    return bb;
  }

  /* ---------------- данные ---------------- */
  function geoLoad(v) {
    if (geoP) return geoP;
    geoP = fetch(`/site/worldgeo.json?v=${encodeURIComponent(v || '')}`).then((r) => { if (!r.ok) throw new Error('geo ' + r.status); return r.json(); }).then((g) => (G = prep(g)))
      .catch((e) => { geoP = null; throw e; });
    return geoP;
  }
  function apply(d) {
    const key = JSON.stringify(d);
    if (key === Dkey && S && S.built) { S.seasonEl.innerHTML = seasonHtml(); return; }
    Dkey = key; D = d;
    if (!S || !S.built) return;
    overlay();
    S.seasonEl.innerHTML = seasonHtml();
    S.side.innerHTML = sideHtml();
    S.side.querySelectorAll('[data-ch]').forEach((b) => b.onclick = () => { const bb = chBox(b.dataset.ch); if (bb) flyTo(bb, 0.25); });
    if (S.sel) pick(S.sel);
    if (S.home) S.home.disabled = !homeBox();
  }
  async function refresh() {
    if (!S || loading) return loading;
    loading = (async () => {
      const d = await X.api('/api/world');
      if (!d || d.ok === false) { if (!D) S.msg(d && d.error === 'world_closed' ? 'Карта мира пока закрыта.' : 'Карта мира не загрузилась — проверь связь.'); return; }
      await geoLoad(d.geo || (window.LG_WORLDV || {}).geo);
      if (!S) return;
      if (!S.built) build();
      apply(d);
    })().catch(() => { if (S && !S.built) S.msg('Карта мира не загрузилась — проверь связь и открой вкладку ещё раз.'); }).finally(() => { loading = null; });
    return loading;
  }
  function tick() {
    clearTimeout(timer); timer = 0;
    if (!S || !vis) return;
    timer = setTimeout(() => { if (S && vis && !document.hidden) refresh(); tick(); }, REFRESH_MS);
  }
  function onVis() { if (!S || !vis) return; if (document.hidden) { clearTimeout(timer); timer = 0; } else { if (Date.now() - (S.at || 0) > REFRESH_MS) { S.at = Date.now(); refresh(); } tick(); } }

  /* ---------------- разметка вкладки ---------------- */
  function build() {
    const el = S.el;
    el.innerHTML = `<div class="wm-wrap"><div class="wm-head"><h2 class="h2">Карта мира</h2><div class="wm-season"></div></div>`
      + `<div class="wm-body"><div class="wm-map" tabindex="0" role="application" aria-label="Карта мира. Перетаскивание — сдвиг, колесо или щипок — масштаб, нажатие на округ — карточка. Стрелки, плюс и минус — с клавиатуры.">${baseSvg(G)}`
      + `<div class="wm-ui"><button type="button" data-z="in" aria-label="Приблизить" title="Приблизить">+</button><button type="button" data-z="out" aria-label="Отдалить" title="Отдалить">−</button><button type="button" data-z="fit" aria-label="Весь мир" title="Весь мир"><svg viewBox="0 0 22 22" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="3.5" y="5.5" width="15" height="11" rx="2"/></svg></button></div>`
      + `<div class="wm-card" role="region" aria-label="Карточка округа" hidden></div><button type="button" class="wm-home btn sm">К моему каналу</button><div class="wm-sr" aria-live="polite"></div></div>`
      + `<aside class="wm-side"></aside></div></div>`;
    S.map = el.querySelector('.wm-map'); S.svg = el.querySelector('.wm-svg'); S.card = el.querySelector('.wm-card'); S.side = el.querySelector('.wm-side');
    S.seasonEl = el.querySelector('.wm-season'); S.home = el.querySelector('.wm-home'); S.sr = el.querySelector('.wm-sr');
    S.built = true;
    size();
    const f = fitOf(G.land); S.v = S.live = { cx: f.cx, cy: f.cy, k: f.k }; S.lastCommit = 0; commit();
    bindGestures();
    el.querySelectorAll('[data-z]').forEach((b) => b.onclick = () => { const z = b.dataset.z; if (z === 'fit') flyTo(G.land); else zoomAt(S.w / 2, S.h / 2, z === 'in' ? 1.6 : 1 / 1.6, true); });
    S.home.onclick = () => { const bb = homeBox(); if (bb) flyTo(bb, 0.2); else if (X.toast) X.toast('Канал ещё не на карте мира'); };
    S.ro = window.ResizeObserver ? new ResizeObserver(() => { if (!S) return; const w0 = S.w, h0 = S.h; size(); if (Math.abs(w0 - S.w) > 1 || Math.abs(h0 - S.h) > 1) { S.live = { ...S.live, k: S.live.k * (S.w / w0) }; commit(); } }) : null;
    if (S.ro) S.ro.observe(S.map);
  }

  return {
    /** Вкладку открыли: el — секция вкладки, ctx — { api, now, openTown(id, why), toast }. */
    open(el, ctx) {
      X = ctx; vis = true;
      if (!S || S.el !== el) {
        S = { el, built: false, at: 0, msg: (t) => { if (!S.built) el.innerHTML = `<p class="empty">${esc(t)}</p>`; } };
        el.innerHTML = '<p class="empty">Карта мира разворачивается…</p>';
        document.addEventListener('visibilitychange', onVis);
      } else if (S.built) { size(); commit(); }
      S.at = Date.now(); refresh(); tick();
    },
    /** Ушли на другую вкладку: опрос стоп (рисунок остаётся — вернулся, и он сразу на месте). */
    close() { vis = false; clearTimeout(timer); timer = 0; },
    refresh,
    // для проверок
    _state: () => ({ S, D, G }),
  };
})();
