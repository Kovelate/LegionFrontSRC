// Общий набор рисования местности (стиль Легиона): деревья, горы, скалы, холмы, вода, мелочь.
// Им пользуются карта Похода (mapart.js) и фоны локаций (scene.js). Всё — строки SVG, случайность — от переданного r().
// Соседние горы сливаются в хребты, деревья — в рощи (общий контур рисуется под всеми телами группы): QArt.begin() → рисуем → QArt.render().
(function () {
  const W = 1920, H = 1080, INK = '#2a2236', CAM = { x: 1500, y: 830 };
  const f1 = (v) => Math.round(v * 10) / 10;
  const O = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const P = (p) => `${f1(p[0])} ${f1(p[1])}`;
  const poly = (pts) => 'M' + pts.map(P).join(' L') + ' Z';

  // плавная кривая через точки (Катмулл-Ром → кубические Безье)
  function smooth(pts, closed) {
    const n = pts.length, g = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = 'M' + P(pts[0]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      d += ` C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
    }
    return d + (closed ? ' Z' : '');
  }
  // те же кривые, но густые точки (для толщины реки и столкновений)
  function dense(pts, step = 6) {
    const n = pts.length, g = (i) => pts[Math.max(0, Math.min(n - 1, i))], out = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[n - 1]);
    return out;
  }
  // неровное пятно (озеро, лужа, поле)
  function blob(r, x, y, rx, ry, n = 10, jit = 0.22) {
    const pts = []; const a0 = r() * 6.28;
    for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2, k = 1 - jit + r() * jit * 2; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    return pts;
  }

  /* ================= объекты с общим контуром =================
     Каждый объект: силуэт (ol — рисуется чернилами, толще) и тело (body).
     Объекты одного семейства, стоящие вплотную, собираются в группу: сначала все силуэты, потом все тела —
     так соседние горы становятся хребтом, а деревья — рощей с одним общим контуром. */
  let OBJ = [], CID = 0;
  const add = (fam, x, y, rad, ol, body) => OBJ.push({ fam, x, y, rad, ol, body });
  function renderObjs(ow = 5.2) {
    // сцена может попросить не ставить объекты в занятых местах (палатки привала): QArt.skip(obj) → true — объект выкидывается
    const skip = window.QArt && window.QArt.skip; if (skip) OBJ = OBJ.filter((o) => !skip(o));
    const n = OBJ.length, par = OBJ.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
    for (let i = 0; i < n; i++) { const a = OBJ[i]; if (!a.fam) continue;
      for (let j = i + 1; j < n; j++) { const b = OBJ[j]; if (b.fam !== a.fam) continue;
        if (Math.abs(a.x - b.x) < (a.rad + b.rad) * 0.95 && Math.abs(a.y - b.y) < (a.rad + b.rad) * 0.7) par[find(i)] = find(j); } }
    const groups = new Map();
    OBJ.forEach((o, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); });
    const list = [...groups.values()].map((g) => { g.sort((a, b) => a.y - b.y); return { key: g[g.length - 1].y, g }; }).sort((a, b) => a.key - b.key);
    // 23.10: одёжка сцены по природе (biomeskin.js) может дорисовать к телу снежную шапку: QArt.cap(объект) → строка SVG; нет — как раньше
    const cap = window.QArt && window.QArt.cap, bodyOf = cap ? (o) => o.body + cap(o) : (o) => o.body;
    return list.map(({ g }) => `<g fill="${INK}" stroke="${INK}" stroke-width="${ow}" stroke-linejoin="round" stroke-linecap="round">${g.map((o) => o.ol).join('')}</g>${g.map(bodyOf).join('')}`).join('');
  }

  /* ---------------- деревья ---------------- */
  const LEAF = {
    green: ['#3f7a44', '#5a9a4e', '#8cc47a'], deep: ['#2f6a42', '#468a4e', '#78b46a'], olive: ['#5f7f34', '#7f9f44', '#b0c86a'],
    autumn: ['#b8642a', '#de8f36', '#f4c25a'], red: ['#9a3a2a', '#c45a36', '#ea8a5a'], gold: ['#b89a2a', '#d8bc3e', '#f2de76'],
  };
  const NEEDLE = { pine: ['#2c5f44', '#3e7a52', '#5f9a68'], blue: ['#2a5658', '#3c706c', '#5e9488'], dark: ['#24483a', '#335e4a', '#4f7c60'] };
  function trunk(x, y, s, h, w = 2.6) { const d = `M${f1(x - w * s)} ${f1(y)} L${f1(x - w * 0.7 * s)} ${f1(y - h * s)} L${f1(x + w * 0.7 * s)} ${f1(y - h * s)} L${f1(x + w * s)} ${f1(y)} Z`; return { ol: `<path d="${d}"/>`, body: `<path d="${d}" fill="#7a5232"/><path d="M${f1(x + w * 0.2 * s)} ${f1(y)} L${f1(x + w * 0.2 * s)} ${f1(y - h * s)} L${f1(x + w * 0.7 * s)} ${f1(y - h * s)} L${f1(x + w * s)} ${f1(y)} Z" fill="#5a3a22"/>` }; }
  // лиственное: крона из нескольких «облачков», тень снизу-справа, блик сверху-слева
  function treeRound(r, x, y, s, pal) {
    const t = trunk(x, y, s, 13), cy = y - 22 * s, lobes = [[x, cy, 11.5 * s]], n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const a = Math.PI * (0.9 + r() * 1.2) + (i % 2 ? 0 : Math.PI * 0.6); lobes.push([x + Math.cos(a) * 8 * s, cy + Math.sin(a) * 5.5 * s - 2 * s, (6.5 + r() * 4) * s]); }
    lobes.sort((a, b) => a[1] - b[1]);
    let ol = t.ol, body = t.body;
    for (const [lx, ly, lr] of lobes) { ol += `<circle cx="${f1(lx)}" cy="${f1(ly)}" r="${f1(lr)}"/>`; body += `<circle cx="${f1(lx)}" cy="${f1(ly)}" r="${f1(lr)}" fill="${pal[0]}" stroke="${pal[0]}" stroke-width="1"/>`; }
    for (const [lx, ly, lr] of lobes) body += `<circle cx="${f1(lx - lr * 0.18)}" cy="${f1(ly - lr * 0.22)}" r="${f1(lr * 0.72)}" fill="${pal[1]}"/>`;
    const top = lobes[0]; body += `<path d="M${f1(top[0] - top[2] * 0.55)} ${f1(top[1] - top[2] * 0.1)} q${f1(top[2] * 0.25)} ${f1(-top[2] * 0.55)} ${f1(top[2] * 0.75)} ${f1(-top[2] * 0.5)}" stroke="${pal[2]}" stroke-width="${f1(2 * s)}" fill="none" stroke-linecap="round"/>`;
    if (r() < 0.25) for (let i = 0; i < 3; i++) body += `<circle cx="${f1(x + (r() - 0.5) * 14 * s)}" cy="${f1(cy + (r() - 0.3) * 8 * s)}" r="${f1(1.5 * s)}" fill="${r() < 0.5 ? '#e8455c' : '#ffc94d'}"/>`;   // плоды
    add('tree', x, y, 12 * s, ol, body);
  }
  // ель / сосна: ярусы с тенью на правой половине
  function treePine(r, x, y, s, pal, tall) {
    const t = trunk(x, y, s, 7, 2), tiers = (tall ? 4 : 3) + (r() < 0.4 ? 1 : 0), step = (tall ? 8.5 : 9.5) * s, hw0 = (tall ? 10 : 13) * s;
    let ol = t.ol, body = t.body;
    for (let k = 0; k < tiers; k++) {
      const by = y - 5 * s - k * step, w = hw0 * (1 - k / (tiers + 0.6)), ty = by - (tall ? 15 : 17) * s - (k === tiers - 1 ? 4 * s : 0);
      const d = `M${f1(x - w)} ${f1(by)} Q${f1(x)} ${f1(by + 3.5 * s)} ${f1(x + w)} ${f1(by)} L${f1(x + w * 0.12)} ${f1(ty + 1)} Q${f1(x)} ${f1(ty - 1.5)} ${f1(x - w * 0.12)} ${f1(ty + 1)} Z`;
      ol += `<path d="${d}"/>`;
      body += `<path d="${d}" fill="${pal[1]}"/><path d="M${f1(x)} ${f1(ty)} L${f1(x + w)} ${f1(by)} Q${f1(x + w * 0.5)} ${f1(by + 2.6 * s)} ${f1(x)} ${f1(by + 3.4 * s)} Z" fill="${pal[0]}"/>`
        + `<path d="M${f1(x - w * 0.55)} ${f1(by - 3 * s)} L${f1(x - w * 0.15)} ${f1(ty + (by - ty) * 0.35)}" stroke="${pal[2]}" stroke-width="${f1(1.6 * s)}" stroke-linecap="round"/>`;
    }
    if (r() < 0.2) body += `<path d="M${f1(x - 4 * s)} ${f1(y - 5 * s - step * 0.4)} l${f1(2 * s)} ${f1(2 * s)} M${f1(x + 5 * s)} ${f1(y - 4 * s - step * 1.3)} l${f1(-2 * s)} ${f1(2 * s)}" stroke="#f4f1ff" stroke-width="${f1(1.8 * s)}" stroke-linecap="round" opacity=".7"/>`;   // иней
    add('tree', x, y, 11 * s, ol, body);
  }
  // берёза: белый ствол с чёрными чёрточками, светлая лёгкая крона
  function treeBirch(r, x, y, s) {
    const h = 22 * s, d = `M${f1(x - 2 * s)} ${f1(y)} L${f1(x - 1.5 * s)} ${f1(y - h)} L${f1(x + 1.5 * s)} ${f1(y - h)} L${f1(x + 2 * s)} ${f1(y)} Z`;
    let ol = `<path d="${d}"/>`, body = `<path d="${d}" fill="#f4f1ec"/>`;
    for (let k = 3; k < h / s - 2; k += 4 + r() * 3) body += `<path d="M${f1(x - 2 * s)} ${f1(y - k * s)} h${f1(2.2 * s)}" stroke="${INK}" stroke-width="${f1(1.4 * s)}"/>`;
    const pal = r() < 0.3 ? LEAF.gold : ['#6a9a3e', '#8cb84e', '#c4dc7a'];
    for (let i = 0; i < 3; i++) { const cx = x + (i - 1) * 5.5 * s, cy = y - h - 2 * s + (i === 1 ? -6 * s : 0), rx = 6.5 * s, ry = 8.5 * s;
      ol += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`;
      body += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${pal[0]}"/><ellipse cx="${f1(cx - 1.2 * s)}" cy="${f1(cy - 2 * s)}" rx="${f1(rx * 0.68)}" ry="${f1(ry * 0.68)}" fill="${pal[1]}"/>`; }
    add('tree', x, y, 10 * s, ol, body);
  }
  // тополь: высокая узкая крона
  function treePoplar(r, x, y, s, pal) {
    const t = trunk(x, y, s, 8, 2), cy = y - 26 * s, rx = 7 * s, ry = 19 * s;
    const ol = t.ol + `<ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`;
    const body = t.body + `<ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${pal[0]}"/><ellipse cx="${f1(x - 1.5 * s)}" cy="${f1(cy - 2 * s)}" rx="${f1(rx * 0.62)}" ry="${f1(ry * 0.85)}" fill="${pal[1]}"/><path d="M${f1(x - 3 * s)} ${f1(cy - ry * 0.5)} q${f1(-1 * s)} ${f1(6 * s)} 0 ${f1(12 * s)}" stroke="${pal[2]}" stroke-width="${f1(1.8 * s)}" fill="none" stroke-linecap="round"/>`;
    add('tree', x, y, 8 * s, ol, body);
  }
  // сухое дерево: ветвится случайно (каждое — своё)
  function treeDead(r, x, y, s, col = '#5a4232', fam = 'dead', depth) {
    const segs = [];
    const grow = (x0, y0, a, len, w, depth) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; segs.push([x0, y0, x1, y1, w]);
      if (depth <= 0) return;
      const nb = depth > 1 ? 2 : 1 + (r() < 0.5 ? 1 : 0);
      for (let i = 0; i < nb; i++) grow(x1, y1, a + (i === 0 ? -1 : 1) * (0.35 + r() * 0.5), len * (0.55 + r() * 0.2), w * 0.62, depth - 1);
    };
    grow(x, y, -Math.PI / 2 + (r() - 0.5) * 0.3, 16 * s, 4.4 * s, depth || 2 + (r() < 0.5 ? 1 : 0));
    let ol = '', body = '';
    for (const [a, b, c, d, w] of segs) { ol += `<path d="M${f1(a)} ${f1(b)} L${f1(c)} ${f1(d)}" fill="none" stroke-width="${f1(w + 4.6)}"/>`; body += `<path d="M${f1(a)} ${f1(b)} L${f1(c)} ${f1(d)}" stroke="${col}" stroke-width="${f1(w)}" stroke-linecap="round"/>`; }
    add(fam, x, y, 9 * s, ol, body);
  }
  // куст (может быть с ягодами или цветами); живёт в одной группе с деревьями — так получаются опушки и живые изгороди
  function bush(r, x, y, s, pal = LEAF.green) {
    let ol = '', body = '', l = [];
    const n = 3 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) l.push([x + (i - (n - 1) / 2) * 6 * s, y - 5 * s - (i % 2 ? 3 * s : 0) - r() * 2 * s, (5 + r() * 2.5) * s]);
    for (const [cx, cy, cr] of l) { ol += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(cr)}"/>`; body += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(cr)}" fill="${pal[0]}"/>`; }
    for (const [cx, cy, cr] of l) body += `<circle cx="${f1(cx - cr * 0.2)}" cy="${f1(cy - cr * 0.25)}" r="${f1(cr * 0.62)}" fill="${pal[1]}"/>`;
    ol += `<path d="M${f1(x - n * 3.5 * s)} ${f1(y - 4 * s)} H${f1(x + n * 3.5 * s)} V${f1(y)} H${f1(x - n * 3.5 * s)} Z"/>`;
    body += `<path d="M${f1(x - n * 3.5 * s)} ${f1(y - 4 * s)} H${f1(x + n * 3.5 * s)} V${f1(y)} H${f1(x - n * 3.5 * s)} Z" fill="${pal[0]}"/>`;
    const dots = r(); if (dots < 0.35) for (let i = 0; i < 4; i++) body += `<circle cx="${f1(x + (r() - 0.5) * n * 8 * s)}" cy="${f1(y - 4 * s - r() * 6 * s)}" r="${f1(1.4 * s)}" fill="${dots < 0.18 ? '#e8455c' : '#f4f1ff'}"/>`;
    add('tree', x, y, 7 * s, ol, body);
  }
  function anyTree(r, x, y, s, kind) {
    const k = kind || pick(r, ['round', 'round', 'pine', 'pine', 'birch', 'poplar', 'round']);
    if (k === 'pine') return treePine(r, x, y, s, pick(r, [NEEDLE.pine, NEEDLE.pine, NEEDLE.blue, NEEDLE.dark]), r() < 0.4);
    if (k === 'birch') return treeBirch(r, x, y, s);
    if (k === 'poplar') return treePoplar(r, x, y, s, pick(r, [LEAF.green, LEAF.olive, LEAF.deep]));
    if (k === 'autumn') return treeRound(r, x, y, s, pick(r, [LEAF.autumn, LEAF.red, LEAF.gold, LEAF.autumn]));
    return treeRound(r, x, y, s, r() < 0.08 ? pick(r, [LEAF.autumn, LEAF.gold]) : pick(r, [LEAF.green, LEAF.green, LEAF.deep, LEAF.olive]));
  }

  /* ---------------- горы, скалы, холмы ---------------- */
  const ROCKP = {
    violet: { b: '#8f8a9a', d: '#6c6680', l: '#aaa5b6', snow: '#f4f1ff' }, slate: { b: '#7f8a98', d: '#5f6a7c', l: '#9aa6b4', snow: '#f4f6ff' },
    brown: { b: '#a08a70', d: '#7c6652', l: '#bca688', snow: '#f6f1e8' }, ochre: { b: '#b49a6a', d: '#8c744c', l: '#cdb486', snow: '#fbf4e2' },
    far: { b: '#a8aec4', d: '#8a90aa', l: '#bec4d6', snow: '#f8f8ff' }, doom: { b: '#4a3a44', d: '#2e2430', l: '#6a5460', snow: '#ff7a3a' },
  };
  function mountain(r, x, y, s, pal, opt = {}) {
    const bw = 46 * s * (0.8 + r() * 0.5), h = 62 * s * (0.75 + r() * 0.55);
    const peaks = [[x + (r() - 0.5) * bw * 0.35, y - h]];
    const nsub = opt.single ? 0 : (r() < 0.3 ? 0 : r() < 0.7 ? 1 : 2);
    for (let i = 0; i < nsub; i++) { const side = i === 0 ? (r() < 0.5 ? -1 : 1) : -Math.sign(peaks[1][0] - peaks[0][0]) || 1; peaks.push([peaks[0][0] + side * bw * (0.38 + r() * 0.18), y - h * (0.48 + r() * 0.3)]); }
    peaks.sort((a, b) => a[0] - b[0]);
    const jag = (a, b) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; return [mx + (r() - 0.5) * 7 * s, my + (r() - 0.3) * 6 * s]; };
    const prof = [[x - bw, y]], idx = [];
    peaks.forEach((p, i) => {
      if (i > 0) { const q = peaks[i - 1], v = [(q[0] + p[0]) / 2 + (r() - 0.5) * 6 * s, y - Math.min(y - q[1], y - p[1]) * (0.4 + r() * 0.15)]; prof.push(jag(prof[prof.length - 1], v), v); }
      prof.push(jag(prof[prof.length - 1], p)); idx.push(prof.length); prof.push(p);
    });
    prof.push(jag(prof[prof.length - 1], [x + bw, y]), [x + bw, y]);
    const d = poly(prof);
    let body = `<path d="${d}" fill="${pal.b}"/>`;
    // тень: правый склон каждого пика
    idx.forEach((pi) => {
      const p = prof[pi], sh = [p]; let j = pi + 1;
      while (j < prof.length) { sh.push(prof[j]); if (j === prof.length - 1 || prof[j][1] > prof[j - 1][1] && prof[j + 1] && prof[j + 1][1] < prof[j][1]) break; j++; }
      const last = sh[sh.length - 1]; sh.push([last[0], y], [p[0] + bw * 0.12, y]);
      body += `<path d="${poly(sh)}" fill="${pal.d}"/>`;
    });
    // светлые грани и трещины слева
    idx.forEach((pi) => { const p = prof[pi]; body += `<path d="M${P(p)} L${f1(p[0] - 5 * s)} ${f1(p[1] + 16 * s)} L${f1(p[0] + 1 * s)} ${f1(p[1] + 30 * s)}" stroke="${pal.l}" stroke-width="${f1(2.2 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; });
    for (let i = 0; i < 2; i++) { const p = peaks[Math.floor(r() * peaks.length)], yy = p[1] + (y - p[1]) * (0.45 + r() * 0.3), xx = p[0] - (y - p[1]) * (0.1 + r() * 0.25); body += `<path d="M${f1(xx)} ${f1(yy)} l${f1(6 * s)} ${f1(-3 * s)} l${f1(5 * s)} ${f1(2 * s)}" stroke="${INK}" stroke-width="${f1(1.3 * s)}" fill="none" opacity=".3"/>`; }
    // снежные шапки на высоких пиках (зубчатый край)
    if (opt.snow !== false) idx.forEach((pi) => {
      const p = prof[pi], hh = y - p[1]; if (hh < 40 * s && !opt.allSnow) return;
      const L = prof[pi - 1], R = prof[pi + 1], fr = 0.28 + r() * 0.12, along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const lp = along(p, L, Math.min(0.85, fr * hh / Math.max(1, L[1] - p[1]))), rp = along(p, R, Math.min(0.85, fr * hh / Math.max(1, R[1] - p[1])));
      const pts = [p, rp], teeth = 3;
      for (let k = 1; k < teeth; k++) { const t = k / teeth, bx = rp[0] + (lp[0] - rp[0]) * t, by = rp[1] + (lp[1] - rp[1]) * t; pts.push([bx, by + (k % 2 ? -5 * s : 4 * s)]); }
      pts.push(lp);
      body += `<path d="${poly(pts)}" fill="${pal.snow}" stroke="${INK}" stroke-width="${f1(1.5)}" stroke-linejoin="round"/>`;
      if (pal === ROCKP.doom) body += `<path d="${poly(pts)}" fill="#ffc94d" opacity=".5"><animate attributeName="opacity" values=".2;.7;.2" dur="${(2 + r() * 2).toFixed(1)}s" repeatCount="indefinite"/></path>`;
    });
    add(opt.fam || 'mnt', x, y, bw, `<path d="${d}"/>`, body);
  }
  // утёс / столовая скала: плоская вершина, отвесные бока, слои породы
  function crag(r, x, y, s, pal, cave) {
    const bw = 34 * s * (0.8 + r() * 0.5), h = 40 * s * (0.8 + r() * 0.5), tw = bw * (0.55 + r() * 0.2), tx = x + (r() - 0.5) * 8 * s;
    const pts = [[x - bw, y], [x - bw * 0.85, y - h * 0.45], [tx - tw, y - h * 0.8], [tx - tw * 0.7, y - h], [tx + tw * 0.1, y - h - 3 * s], [tx + tw * 0.8, y - h * 0.97], [tx + tw, y - h * 0.75], [x + bw * 0.9, y - h * 0.35], [x + bw, y]];
    const d = poly(pts);
    let body = `<path d="${d}" fill="${pal.b}"/><path d="${poly([[tx + tw * 0.1, y - h - 3 * s], [tx + tw * 0.8, y - h * 0.97], [tx + tw, y - h * 0.75], [x + bw * 0.9, y - h * 0.35], [x + bw, y], [tx + tw * 0.25, y]])}" fill="${pal.d}"/>`;
    body += `<path d="${poly([[tx - tw * 0.7, y - h], [tx + tw * 0.1, y - h - 3 * s], [tx + tw * 0.8, y - h * 0.97], [tx + tw * 0.5, y - h * 0.86], [tx - tw * 0.5, y - h * 0.88]])}" fill="${pal.l}"/>`;
    for (let k = 1; k < 4; k++) { const yy = y - h * k / 4.2; body += `<path d="M${f1(x - bw * (0.95 - k * 0.07) + 3)} ${f1(yy)} q${f1(bw * 0.4)} ${f1(-2 * s)} ${f1(bw * 0.9)} ${f1(1 * s)}" stroke="${INK}" stroke-width="${f1(1.3 * s)}" fill="none" opacity=".28"/>`; }
    if (cave) body += `<path d="M${f1(x - 9 * s)} ${f1(y)} V${f1(y - 9 * s)} Q${f1(x)} ${f1(y - 21 * s)} ${f1(x + 9 * s)} ${f1(y - 9 * s)} V${f1(y)} Z" fill="#1e1828" ${O(2)}/>`;
    add('mnt', x, y, bw, `<path d="${d}"/>`, body);
  }
  // холм: мягкий горб, светлая макушка, тень справа (по маске формы холма)
  function hill(r, x, y, s, pal = ['#7f9a52', '#9ab06a', '#c4d48e']) {
    const bw = 42 * s * (0.8 + r() * 0.5), h = 30 * s * (0.75 + r() * 0.6), sk = (r() - 0.5) * bw * 0.5;
    const d = `M${f1(x - bw)} ${f1(y)} C${f1(x - bw * 0.6 + sk)} ${f1(y - h * 1.3)} ${f1(x + bw * 0.5 + sk)} ${f1(y - h * 1.3)} ${f1(x + bw)} ${f1(y)} Z`, id = 'qh' + (CID++);
    let body = `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${pal[1]}"/><g clip-path="url(#${id})"><ellipse cx="${f1(x + bw * 0.75 + sk)}" cy="${f1(y)}" rx="${f1(bw * 0.75)}" ry="${f1(h * 1.05)}" fill="${pal[0]}"/>`
      + `<ellipse cx="${f1(x - bw * 0.25 + sk)}" cy="${f1(y - h * 0.85)}" rx="${f1(bw * 0.35)}" ry="${f1(h * 0.28)}" fill="${pal[2]}" opacity=".8"/></g>`;
    for (let i = 0; i < 3; i++) body += `<path d="M${f1(x + (r() - 0.6) * bw)} ${f1(y - h * (0.15 + r() * 0.35))} q2 -4 3 -6" stroke="#5f7f3a" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>`;
    add('hill', x, y, bw * 0.9, `<path d="${d}"/>`, body);
  }
  // камень: неровный многогранник со светлой верхней гранью
  function rock(r, x, y, s, pal = pick(r, [ROCKP.violet, ROCKP.brown, ROCKP.slate])) {
    const n = 6, pts = [];
    for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI, k = 0.75 + r() * 0.45; pts.push([x + Math.cos(a) * 11 * s * k, y + Math.min(0, Math.sin(a)) * 10 * s * k]); }
    const d = poly(pts), top = [pts[1], pts[2], pts[3], [x + 2 * s, y - 3 * s]];
    const body = `<path d="${d}" fill="${pal.b}"/><path d="${poly([pts[3], pts[4], pts[5], [x + 2 * s, y]])}" fill="${pal.d}"/><path d="${poly(top)}" fill="${pal.l}"/>`;
    add('rock', x, y, 9 * s, `<path d="${d}"/>`, body);
  }

  /* ---------------- мелочь (без общего контура) ---------------- */
  const grass = (x, y, s = 1, c = '#5f7f3a') => `<path d="M${f1(x - 5 * s)} ${f1(y)} q${f1(2 * s)} ${f1(-7 * s)} ${f1(3 * s)} ${f1(-9 * s)} M${f1(x)} ${f1(y)} q0 ${f1(-8 * s)} ${f1(1 * s)} ${f1(-11 * s)} M${f1(x + 5 * s)} ${f1(y)} q${f1(-1 * s)} ${f1(-6 * s)} ${f1(-3 * s)} ${f1(-8 * s)}" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`;
  const flower = (x, y, c) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="${c}" stroke="${INK}" stroke-width=".8"/>`;
  const one = (x, y, svg) => add(null, x, y, 0, '', svg);
  function reeds(r, x, y, s = 1) { let g = ''; const n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 3.2 * s, hh = (14 + r() * 10) * s, lean = (r() - 0.5) * 5 * s; g += `<path d="M${f1(x + dx)} ${f1(y)} q${f1(lean * 0.3)} ${f1(-hh * 0.5)} ${f1(lean)} ${f1(-hh)}" stroke="#5a6a2a" stroke-width="${f1(2.2 * s)}" fill="none" stroke-linecap="round"/>`; if (i % 2 === 0) g += `<ellipse cx="${f1(x + dx + lean)}" cy="${f1(y - hh - 2 * s)}" rx="${f1(1.9 * s)}" ry="${f1(4.6 * s)}" fill="#7a4a2a" stroke="${INK}" stroke-width=".8"/>`; } one(x, y, g); }
  function tomb(r, x, y, s = 1) { const k = r(); let g;
    if (k < 0.5) g = `<path d="M${f1(x - 7 * s)} ${f1(y)} V${f1(y - 14 * s)} Q${f1(x - 7 * s)} ${f1(y - 20 * s)} ${f1(x)} ${f1(y - 20 * s)} Q${f1(x + 7 * s)} ${f1(y - 20 * s)} ${f1(x + 7 * s)} ${f1(y - 14 * s)} V${f1(y)} Z" fill="#b8b0a0" ${O(2.2)}/><path d="M${f1(x + 2 * s)} ${f1(y - 19 * s)} Q${f1(x + 7 * s)} ${f1(y - 19 * s)} ${f1(x + 7 * s)} ${f1(y - 13 * s)} V${f1(y - 1)} H${f1(x + 3 * s)} Z" fill="#9a9284"/><path d="M${f1(x - 3 * s)} ${f1(y - 13 * s)} h${f1(5 * s)} M${f1(x - 3 * s)} ${f1(y - 9 * s)} h${f1(4 * s)}" stroke="${INK}" stroke-width="1.3" opacity=".6"/>`;
    else if (k < 0.8) g = `<path d="M${f1(x)} ${f1(y)} V${f1(y - 22 * s)} M${f1(x - 7 * s)} ${f1(y - 15 * s)} H${f1(x + 7 * s)}" stroke="${INK}" stroke-width="${f1(5 * s)}" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y)} V${f1(y - 22 * s)} M${f1(x - 7 * s)} ${f1(y - 15 * s)} H${f1(x + 7 * s)}" stroke="${r() < 0.5 ? '#8a6a4a' : '#a8a090'}" stroke-width="${f1(2.6 * s)}" stroke-linecap="round"/>`;
    else g = `<rect x="${f1(x - 9 * s)}" y="${f1(y - 7 * s)}" width="${f1(18 * s)}" height="${f1(7 * s)}" rx="2" fill="#a8a090" ${O(2)} transform="rotate(${f1((r() - 0.5) * 10)} ${f1(x)} ${f1(y)})"/>`;
    g += `<ellipse cx="${f1(x)}" cy="${f1(y + 1)}" rx="${f1(10 * s)}" ry="${f1(2.6 * s)}" fill="#7a6a4a" opacity=".35"/>`;
    one(x, y, g); }
  function column(r, x, y, s = 1) { const broken = r() < 0.7, hh = (broken ? 16 + r() * 12 : 32) * s; let g = `<rect x="${f1(x - 6 * s)}" y="${f1(y - hh)}" width="${f1(12 * s)}" height="${f1(hh)}" fill="#d8ccb2" ${O(2.2)}/><path d="M${f1(x + 1.5 * s)} ${f1(y - hh)} V${f1(y)} M${f1(x - 2.5 * s)} ${f1(y - hh)} V${f1(y)}" stroke="#b4a688" stroke-width="1.6"/><rect x="${f1(x - 8.5 * s)}" y="${f1(y - 3 * s)}" width="${f1(17 * s)}" height="${f1(3 * s)}" fill="#c8bca0" ${O(2)}/>`;
    g += broken ? `<path d="M${f1(x - 6 * s)} ${f1(y - hh)} L${f1(x - 2 * s)} ${f1(y - hh - 5 * s)} L${f1(x + 2 * s)} ${f1(y - hh - 1 * s)} L${f1(x + 6 * s)} ${f1(y - hh - 4 * s)} V${f1(y - hh)}" fill="#d8ccb2" ${O(2)}/>` : `<rect x="${f1(x - 8.5 * s)}" y="${f1(y - hh - 3 * s)}" width="${f1(17 * s)}" height="${f1(4 * s)}" fill="#c8bca0" ${O(2)}/>`;
    if (r() < 0.5) g += `<path d="M${f1(x - 6 * s)} ${f1(y - hh * 0.4)} q${f1(4 * s)} ${f1(-6 * s)} ${f1(8 * s)} ${f1(-3 * s)} q3 4 4 10" stroke="#4f8a4a" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;   // плющ
    one(x, y, g); }
  function ruinWall(r, x, y, s = 1) { const w = (40 + r() * 30) * s, h = (18 + r() * 14) * s, pts = [[x - w / 2, y], [x - w / 2, y - h]]; const steps = 4 + Math.floor(r() * 3);
    for (let i = 1; i <= steps; i++) pts.push([x - w / 2 + w * i / steps, y - h * (0.35 + r() * 0.65)]); pts.push([x + w / 2, y]);
    let g = `<path d="${poly(pts)}" fill="#cfc2a8" ${O(2.4)}/>`; for (let yy = y - 6 * s; yy > y - h + 4; yy -= 7 * s) g += `<path d="M${f1(x - w / 2 + 3)} ${f1(yy)} H${f1(x + w / 2 - 3)}" stroke="${INK}" stroke-width="1.1" opacity=".22"/>`;
    if (r() < 0.6) g += `<rect x="${f1(x - 5 * s)}" y="${f1(y - h * 0.55)}" width="${f1(10 * s)}" height="${f1(h * 0.55 - 1)}" rx="${f1(5 * s)}" fill="#3a3046"/>`;
    one(x, y, g); }
  function fence(x, y, len, s = 1) { let g = `<path d="M${f1(x)} ${f1(y - 7 * s)} h${f1(len)} M${f1(x)} ${f1(y - 3 * s)} h${f1(len)}" stroke="#8a6a4a" stroke-width="${f1(2 * s)}"/>`; for (let i = 0; i <= len; i += 9 * s) g += `<path d="M${f1(x + i)} ${f1(y)} V${f1(y - 10 * s)}" stroke="${INK}" stroke-width="${f1(3.4 * s)}" stroke-linecap="round"/><path d="M${f1(x + i)} ${f1(y)} V${f1(y - 10 * s)}" stroke="#a8845a" stroke-width="${f1(1.8 * s)}" stroke-linecap="round"/>`; one(x, y, g); }
  function stump(r, x, y, s = 1) { one(x, y, `<path d="M${f1(x - 6 * s)} ${f1(y)} V${f1(y - 6 * s)} H${f1(x + 6 * s)} V${f1(y)} Z" fill="#7a5232" ${O(2)}/><ellipse cx="${f1(x)}" cy="${f1(y - 6 * s)}" rx="${f1(6 * s)}" ry="${f1(2.4 * s)}" fill="#d8b878" ${O(1.8)}/><ellipse cx="${f1(x)}" cy="${f1(y - 6 * s)}" rx="${f1(2.6 * s)}" ry="${f1(1 * s)}" fill="none" stroke="#a8845a" stroke-width="1"/>`); }
  function log(r, x, y, s = 1) { const w = (20 + r() * 10) * s; one(x, y, `<rect x="${f1(x - w / 2)}" y="${f1(y - 7 * s)}" width="${f1(w)}" height="${f1(7 * s)}" rx="${f1(3.5 * s)}" fill="#7a5232" ${O(2)}/><ellipse cx="${f1(x + w / 2 - 1)}" cy="${f1(y - 3.5 * s)}" rx="${f1(2.6 * s)}" ry="${f1(3.4 * s)}" fill="#d8b878" ${O(1.6)}/><path d="M${f1(x - w / 2 + 4)} ${f1(y - 4 * s)} h${f1(w * 0.5)}" stroke="#5a3a22" stroke-width="1.2"/>`); }
  function mushrooms(r, x, y) { let g = ''; for (let i = 0; i < 3; i++) { const dx = (i - 1) * 6, hh = 5 + r() * 3; g += `<path d="M${f1(x + dx)} ${f1(y)} V${f1(y - hh)}" stroke="#f4f1ec" stroke-width="2.4"/><path d="M${f1(x + dx - 4)} ${f1(y - hh)} Q${f1(x + dx)} ${f1(y - hh - 6)} ${f1(x + dx + 4)} ${f1(y - hh)} Z" fill="#e8455c" ${O(1.2)}/>`; } one(x, y, g); }
  const house = (x, y, s = 1, roof = '#b5533c', wall = '#ead9b8') => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><rect x="-12" y="-14" width="24" height="14" fill="${wall}" ${O(2.2)}/><path d="M-15 -13 L0 -26 L15 -13 Z" fill="${roof}" ${O(2.2)}/><path d="M0 -26 L15 -13 H8 Z" fill="#000" opacity=".15"/><rect x="-3" y="-8" width="6" height="8" fill="#6b4423"/><rect x="5" y="-11" width="4" height="4" fill="#ffd27a" stroke="${INK}" stroke-width="1"/></g>`;
  const mill = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-10 0 L-7 -34 H7 L10 0 Z" fill="#ead9b8" ${O(2.4)}/><path d="M-10 -32 L0 -44 L10 -32 Z" fill="#b5533c" ${O(2.4)}/><g><animateTransform attributeName="transform" type="rotate" from="0 0 -34" to="360 0 -34" dur="14s" repeatCount="indefinite"/><path d="M0 -34 L0 -60 M0 -34 L26 -34 M0 -34 L0 -8 M0 -34 L-26 -34" stroke="${INK}" stroke-width="3"/><path d="M0 -36 L-6 -58 L0 -60 Z M2 -34 L24 -40 L26 -34 Z M0 -32 L6 -10 L0 -8 Z M-2 -34 L-24 -28 L-26 -34 Z" fill="#f4f1ff" ${O(1.6)}/></g><circle cx="0" cy="-34" r="3" fill="${INK}"/></g>`;
  const cow = (x, y, flip = 1) => `<g transform="translate(${x} ${y}) scale(${flip} 1)"><rect x="-10" y="-10" width="20" height="9" rx="4" fill="#f4f1ec" ${O(1.8)}/><circle cx="12" cy="-9" r="4" fill="#f4f1ec" ${O(1.8)}/><circle cx="-3" cy="-6" r="2.4" fill="${INK}"/><path d="M-7 -1 v4 M6 -1 v4" stroke="${INK}" stroke-width="2"/></g>`;
  const ship = (x, y) => `<g transform="translate(${x} ${y})"><animateTransform attributeName="transform" type="translate" values="${x} ${y};${x + 6} ${y - 2};${x} ${y}" dur="5s" repeatCount="indefinite"/><path d="M-22 0 H22 L16 9 H-16 Z" fill="#8a5a32" ${O(2.2)}/><path d="M0 0 V-30" stroke="${INK}" stroke-width="2.4"/><path d="M1 -28 L18 -6 H1 Z" fill="#f4f1ff" ${O(1.8)}/><path d="M0 -30 l8 3 l-8 3" fill="#a3122a"/></g>`;
  const signpost = (x, y, txt) => `<g transform="translate(${x} ${y})"><path d="M0 0 V-34" stroke="${INK}" stroke-width="4"/><path d="M-2 -34 H${12 + txt.length * 7} l8 6 l-8 6 H-2 Z" fill="#c8a06a" ${O(2)}/><text x="${f1(4 + txt.length * 3.6)}" y="-24" font-family="Russo One" font-size="10" fill="${INK}" text-anchor="middle">${txt}</text></g>`;
  const tent = (x, y, c) => `<g transform="translate(${x} ${y})"><path d="M-16 0 L0 -26 L16 0 Z" fill="${c}" ${O(2.4)}/><path d="M0 -26 L16 0 H6 Z" fill="#000" opacity=".15"/><path d="M0 -26 V0" stroke="#fff4d6" stroke-width="2"/><path d="M0 -26 V-34 l7 2 -7 3" fill="#ffc94d" ${O(1.4)}/></g>`;

  /* ---------------- вода ---------------- */
  const WATER = { b: '#6fa8d8', d: '#5a90c4', l: '#bfe0f4' }, MURK = { b: '#7a9a7a', d: '#647f64', l: '#b4c8a4' };
  function lake(r, x, y, rx, ry, W_ = WATER) {
    const pts = blob(r, x, y, rx, ry, 11, 0.18), d = smooth(pts, true), id = 'ql' + (CID++);
    let g = `<path d="${smooth(blob(r, x, y + 3, rx + 7, ry + 5, 11, 0.12), true)}" fill="#d8c88a" opacity=".7"/>`;   // песчаный берег
    g += `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${W_.b}" ${O(3)}/><g clip-path="url(#${id})"><path d="${smooth(pts.map(([px, py]) => [x + (px - x) * 0.92, y + (py - y) * 0.92 - ry * 0.18]), true)}" fill="none" stroke="${W_.d}" stroke-width="${f1(ry * 0.25)}" opacity=".5"/></g>`;
    for (let i = 0; i < 2 + Math.floor(rx / 30); i++) { const lx = x + (r() - 0.5) * rx, ly = y + (r() - 0.5) * ry * 0.8; g += `<path d="M${f1(lx)} ${f1(ly)} h${f1(8 + r() * 14)}" stroke="${W_.l}" stroke-width="3" stroke-linecap="round"><animate attributeName="opacity" values=".3;1;.3" dur="${(2 + r() * 2).toFixed(1)}s" repeatCount="indefinite"/></path>`; }
    if (W_ === MURK || r() < 0.4) for (let i = 0; i < 3; i++) { const a = r() * 6.28, lx = x + Math.cos(a) * rx * 0.5, ly = y + Math.sin(a) * ry * 0.5; g += `<path d="M${f1(lx)} ${f1(ly)} m-5 0 a5 3 0 1 0 10 0 l-5 0 Z" fill="#5f9a4e" stroke="${INK}" stroke-width="1"/>`; }   // кувшинки
    return { svg: g, pts };
  }
  // река: переменная ширина, блики посередине и течение пунктиром
  function riverSvg(cl, w0, w1, r, W_ = WATER) {
    const n = cl.length, L = [], R = [], ws = [], ph = r() * 6;
    for (let i = 0; i < n; i++) {
      const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, t = i / (n - 1);
      const w = (w0 + (w1 - w0) * t) * (1 + 0.14 * Math.sin(t * 9 + ph)); ws.push(w);
      L.push([cl[i][0] - dy / len * w / 2, cl[i][1] + dx / len * w / 2]); R.push([cl[i][0] + dy / len * w / 2, cl[i][1] - dx / len * w / 2]);
    }
    const thin = (a, k = 4) => a.filter((_, i) => i % k === 0 || i === a.length - 1);
    const d = smooth([...thin(L), ...thin(R).reverse()], true), cd = smooth(thin(cl, 3));
    let g = `<path d="${smooth([...thin(L).map(([x, y]) => [x, y + 3]), ...thin(R).reverse().map(([x, y]) => [x, y + 3])], true)}" fill="#c8b878" opacity=".6"/>`
      + `<path d="${d}" fill="${W_.b}" ${O(3)}/>`
      + `<path d="${cd}" fill="none" stroke="${W_.d}" stroke-width="${f1(Math.min(w0, w1) * 0.35)}" stroke-linecap="round" opacity=".45"/>`
      + `<path d="${cd}" fill="none" stroke="${W_.l}" stroke-width="2.6" stroke-dasharray="12 30" stroke-linecap="round" opacity=".9"><animate attributeName="stroke-dashoffset" values="0;-42" dur="${(1.8 + r() * 1.2).toFixed(1)}s" repeatCount="indefinite"/></path>`;
    return { svg: g, ws };
  }

  /* ---------- прогулка человечка (привал, ловушка после итога) ----------
     walk(key, x, s, xmin, xmax, o) → { a, b, fa, fb }: a…b — обёртка, которая водит человечка туда-сюда (с покачиванием шага и остановками),
     fa…fb — обёртка тела, которая разворачивает его лицом по ходу. flip — как он стоит без прогулки (1 — лицом вправо, −1 — влево).
     o.begin = 'indefinite' — стоит, пока не запустят (beginElement() у всех animate* внутри .qwalk); иначе идёт сразу.
     Маршрут по зерну key — при перерисовке тот же; в конце круга возвращается на своё место. */
  function walk(key, x, s, xmin, xmax, o = {}) {
    const r = rng(hash(String(key))), flip = o.flip || 1, R = o.range || 240, lo = Math.max(xmin, x - R), hi = Math.min(xmax, x + R);
    const sp = 52 * Math.max(0.5, s), bob = -5 * s;
    const T = [0], X = [0], Y = [0], F = [flip];
    const add = (dt, dx, dy, f) => { T.push(T[T.length - 1] + dt); X.push(dx); Y.push(dy); F.push(f); };
    add(0.4 + r() * 3.5, 0, 0, flip);   // кто-то трогается сразу, кто-то чуть погодя
    let cx = x;
    const legs = 2 + Math.floor(r() * 3);
    for (let i = 0; i <= legs; i++) {
      const to = i === legs ? x : lo + r() * (hi - lo), d = to - cx; if (Math.abs(d) < 30 && i < legs) continue;
      const dir = d >= 0 ? 1 : -1, t = Math.abs(d) / sp, n = Math.max(2, Math.round(t / 0.22));
      F[F.length - 1] = dir;   // развернулся — и пошёл
      for (let k = 1; k <= n; k++) add(t / n, cx - x + d * k / n, k % 2 && k < n ? bob : 0, dir);
      cx = to; add(1.2 + r() * 3.5, cx - x, 0, dir);   // постоял
    }
    const dur = T[T.length - 1], kt = T.map((t) => (t / dur).toFixed(4)).join(';'), b = o.begin ? `begin="${o.begin}"` : '';
    return {
      a: `<g class="qwalk"><animateTransform attributeName="transform" type="translate" values="${X.map((v, i) => `${f1(v)} ${f1(Y[i])}`).join(';')}" keyTimes="${kt}" dur="${dur.toFixed(2)}s" ${b} repeatCount="indefinite"/>`,
      b: '</g>',
      fa: `<g><animateTransform attributeName="transform" type="scale" calcMode="discrete" values="${F.map((f) => (f * flip > 0 ? '1 1' : '-1 1')).join(';')}" keyTimes="${kt}" dur="${dur.toFixed(2)}s" ${b} repeatCount="indefinite"/>`,
      fb: '</g>',
    };
  }
  // кто гуляет: примерно доля share, по нику (при перерисовке — те же)
  const walks = (login, share) => (hash(String(login) + '#гуляет') % 1000) / 1000 < share;

  // take() — забрать накопленные объекты как есть ({ fam, x, y, rad, ol, body }): карта мира (worldart.js) делает из них заготовки и группирует сама
  window.QArt = { walk, walks, begin() { OBJ = []; CID = 0; }, take() { const o = OBJ; OBJ = []; return o; }, objCount: () => OBJ.length, W, H, INK, CAM, f1, O, rng, hash, pick, P, poly, smooth, dense, blob, add, renderObjs, LEAF, NEEDLE, trunk, treeRound, treePine, treeBirch, treePoplar, treeDead, bush, anyTree, ROCKP, mountain, crag, hill, rock, grass, flower, one, reeds, tomb, column, ruinWall, fence, stump, log, mushrooms, house, mill, cow, ship, signpost, tent, WATER, MURK, lake, riverSvg };
})();
