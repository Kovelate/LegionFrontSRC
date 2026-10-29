/* 26.10 (art/camp): рисунок стартового лагеря «Перепутье» по стилю канала (раскладка - packages/world/campmap.js, одна у всех стилей).
   Палаточный лагерь новобранцев: видно, что временный - ткань, верёвки, колья, костры; не каменный город. Здания (Склад, Кузня,
   Ворота «В поход», Шатёр, Торговые ряды; Заточки нет - она в городе канала после пролога) - в заднем ряду, перед ними - тропа; посреди - общий костёр с брёвнами и котлом,
   вокруг - палатки новобранцев с подстилками, котелками и бельём, стойка с оружием, мишени, коновязь, бочки, ящики, флажки; по краям - частокол.
   Язык рисунка - как у Ярмарки и «Города» стиля: плоские тона, светлая плоскость сверху, тень снизу, толстый контур (белый у «Легиона»,
   тёмный у остальных); одинаковые детали - <symbol> + <use> (набор MDDoodle.fairKit из styles/legion/fair.js, в нём - детали лагеря).
   Без фильтров и без SMIL: city.js печёт рисунок в Pixi один раз (citygl.js). Движение - только пламя костра (одна CSS-анимация
   transform/opacity поверх сцены, A.anim) - по желанию страницы; при «меньше движения» его нет.
   window.LGCampArt.draw(L, style, o) → { sky, defs, layers: [{ x, y, w, h, svg }], props: [{ x, y, w, h, z, svg() }], fx, anim, signs, L };
   o.name - { name, sub } (названия стиля: names.json → places.camp). */
(function (root) {
  'use strict';
  const f1 = (v) => Math.round(v * 10) / 10;
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hx = (c) => { const n = parseInt(String(c).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };

  /* ================= темы стилей ================= */
  // общие поля: line - контур, ink - тёмное, sky - небо (CSS), ground - трава / земля лагеря, dirt - тропа и вытоптанное, wood - дерево,
  // canvas - ткани палаток [ткань, кайма/полоса], kinds - вид палатки по размеру (ridge - домик, bell - колокол, cone - шалаш), sign - вывески,
  // names - надписи на вывесках (что это за здание - понятно и без них: подписи «Города» сверху), far - даль за частоколом, fire - пламя
  const THEMES = {
    legion: {
      line: '#f5f2ff', ink: '#15122e', sky: 'linear-gradient(#0d0b22 0%, #1d1840 40%, #3a2c5e 100%)', moon: '#fff2c8', stars: '#fff7d6',
      far: { kind: 'hills', c: ['#2a2348', '#33295a', '#3e3268'], tree: '#1f1a3a', glowRoad: '#6a5a8a' },
      grass: '#3d4a52', grass2: '#34404a', grassL: '#56656a', dirt: '#6a5a62', dirtD: '#4e424c', dirtL: '#8a7680', stone: '#8b8796',
      wood: '#a0703a', woodD: '#6b4423', woodL: '#c58a45', metal: '#2a2440', glass: '#ffd76a',
      canvas: [['#efe4c8', '#a3122a'], ['#e2d6b8', '#3a3a7a'], ['#d8cdb0', ''], ['#c9b98f', '#a3122a'], ['#efe4c8', '']], marquee: ['#efe4c8', '#a3122a'], pavilion: ['#7a2a9a', '#f2e6c8'],
      kinds: { big: 'bell', mid: 'ridge', small: 'ridge' }, beds: ['#7a5a9a', '#3a6a8a', '#8a3a3a', '#5a7a3a'],
      fire: ['#ff7a2a', '#ffb43a', '#fff0a0'], brew: '#e8b46a', flags: ['#a3122a', '#ffd76a', '#3a3a7a'],
      sign: { bg: '#7a0f1d', tx: '#ffc94d', edge: '#ffd76a' }, banner: '#a3122a', bannerTx: '#ffd76a',
      names: { storage: 'СКЛАД', anvil: 'ЗАТОЧКА', forge: 'КУЗНЯ', tent: 'ШАТЁР', shop: 'ТОРГОВЫЕ РЯДЫ', gate: 'В ПОХОД' },
      laundry: ['shirt', 'sock', 'towel', 'pants', 'sock', 'shirt'], wash: ['#efe4c8', '#a3122a', '#5a7aa8', '#ffd76a', '#8a8a9a'],
      smith: { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#e88a7a' },
    },
  };
  /* ---------- общие мелочи для тем ---------- */
  // уши на конусе (кошачьи шатры): apex - верх конуса, rw - полуширина низа, ch - высота конуса
  const ears = (X, cx, apex, rw, ch, c, inner) => {
    const p = (t, sg) => [cx + sg * rw * t, apex + ch * t];
    let s = '';
    for (const sg of [-1, 1]) {
      const a = p(0.1, sg), b = p(0.36, sg), tip = [p(0.2, sg)[0] + sg * rw * 0.12, p(0.2, sg)[1] - ch * 0.3];
      s += `<path d="M${f1(a[0])} ${f1(a[1])} L${f1(tip[0])} ${f1(tip[1])} L${f1(b[0])} ${f1(b[1])} Z" fill="${c}" ${X.O(4)}/>`;
      const ia = [a[0] + (b[0] - a[0]) * 0.25, a[1] + (b[1] - a[1]) * 0.25], ib = [a[0] + (b[0] - a[0]) * 0.75, a[1] + (b[1] - a[1]) * 0.75], it = [tip[0] * 0.8 + (a[0] + b[0]) * 0.1, tip[1] * 0.8 + (a[1] + b[1]) * 0.1];
      s += `<path d="M${f1(ia[0])} ${f1(ia[1])} L${f1(it[0])} ${f1(it[1])} L${f1(ib[0])} ${f1(ib[1])} Z" fill="${inner || '#ffb8c8'}"/>`;
    }
    return s;
  };
  // рыбка (вяленая): x, y - середина, ang - поворот, len - длина
  const fish = (X, x, y, ang, len = 50, c = '#8fb8d8') => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)}) scale(${f1(len / 50)})"><path d="M-24 0 Q-6 -14 14 -4 L26 -12 L22 0 L26 12 L14 4 Q-6 14 -24 0 Z" fill="${c}" ${X.O(3)}/><circle cx="-14" cy="-2" r="2.6" fill="${X.INK}"/><path d="M-4 -7 q4 7 0 14 M4 -6 q4 6 0 12" stroke="${X.mix(c, X.INK, 0.35)}" stroke-width="1.8" fill="none"/></g>`;
  // клубок ниток (плоско на земле, в фон)
  const yarn = (X, x, y, c, r = 18) => `<ellipse cx="${f1(x)}" cy="${f1(y + r * 0.8)}" rx="${f1(r * 1.1)}" ry="${f1(r * 0.3)}" fill="${X.INK}" opacity=".3"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${c}" ${X.O(3)}/><path d="M${f1(x - r * 0.8)} ${f1(y - r * 0.3)} Q${f1(x)} ${f1(y - r * 0.9)} ${f1(x + r * 0.7)} ${f1(y + r * 0.2)} M${f1(x - r * 0.6)} ${f1(y + r * 0.5)} Q${f1(x + r * 0.1)} ${f1(y - r * 0.2)} ${f1(x + r * 0.5)} ${f1(y - r * 0.7)}" stroke="${X.mix(c, X.INK, 0.3)}" stroke-width="2" fill="none"/><path d="M${f1(x + r * 0.8)} ${f1(y + r * 0.4)} q${f1(r * 0.9)} ${f1(r * 0.2)} ${f1(r * 1.4)} ${f1(r * 0.7)}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  // коробка-палатка (котики): передняя стенка, бок, верх с раскрытыми клапанами, прорезь-вход, скотч и штампы
  function boxTent(X, x, base, w, o = {}) {
    const C0 = o.c || '#d9a868', sd = w * 0.3, fw = w * 0.66, h = w * 0.48, x0 = x - w / 2, y0 = base - h, dy = sd * 0.45, f = X.f1, M = X.mix, INK = X.INK;
    const side = M(C0, INK, 0.2), top = M(C0, '#ffffff', 0.18), sg = o.flip ? -1 : 1;
    const P = (px, py) => `${f(x + (px - x) * sg)} ${f(py)}`;
    let s = X.sh(x + sg * sd * 0.3, base + 2, w * 0.56, w * 0.07, 0.32);
    s += `<path d="M${P(x0 + fw, base)} L${P(x0 + fw + sd, base - dy)} L${P(x0 + fw + sd, y0 - dy)} L${P(x0 + fw, y0)} Z" fill="${side}" ${X.O(4)}/>`;
    s += `<path d="M${P(x0, y0)} L${P(x0 + fw, y0)} L${P(x0 + fw + sd, y0 - dy)} L${P(x0 + sd, y0 - dy)} Z" fill="${M(INK, C0, 0.3)}" ${X.O(4)}/>`;
    // клапаны: задний и левый - откинуты, правый - торчит вверх
    s += `<path d="M${P(x0 + sd, y0 - dy)} L${P(x0 + fw + sd, y0 - dy)} L${P(x0 + fw + sd - 8, y0 - dy - h * 0.42)} L${P(x0 + sd - 8, y0 - dy - h * 0.42)} Z" fill="${side}" ${X.O(4)}/>`;
    s += `<path d="M${P(x0, y0)} L${P(x0 + sd, y0 - dy)} L${P(x0 + sd - h * 0.5, y0 - dy + 10)} L${P(x0 - h * 0.5, y0 + 10)} Z" fill="${top}" ${X.O(4)}/>`;
    s += `<path d="M${P(x0 + fw, y0)} L${P(x0 + fw + sd, y0 - dy)} L${P(x0 + fw + sd + h * 0.3, y0 - dy - h * 0.3)} L${P(x0 + fw + h * 0.3, y0 - h * 0.3)} Z" fill="${top}" ${X.O(4)}/>`;
    // передняя стенка
    s += `<path d="M${P(x0, base)} L${P(x0, y0)} L${P(x0 + fw, y0)} L${P(x0 + fw, base)} Z" fill="${C0}" ${X.O(4)}/>`;
    s += `<path d="M${P(x0 + 8, y0 + 8)} L${P(x0 + fw - 8, y0 + 8)}" stroke="${M(C0, '#ffffff', 0.3)}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
    s += `<path d="M${P(x0 + fw * 0.5 - 14, y0)} L${P(x0 + fw * 0.5 + 14, y0)} L${P(x0 + fw * 0.5 + 14, y0 + h * 0.22)} L${P(x0 + fw * 0.5 - 14, y0 + h * 0.22)} Z" fill="${M(C0, '#ffffff', 0.35)}" opacity=".8"/>`;
    // вход-прорезь
    const dc = x0 + fw * (o.flip ? 0.36 : 0.62), dw = fw * 0.3, dh = h * 0.7;
    s += `<path d="M${P(dc - dw / 2, base)} L${P(dc - dw / 2, base - dh + dw / 2)} Q${P(dc, base - dh - dw * 0.2)} ${P(dc + dw / 2, base - dh + dw / 2)} L${P(dc + dw / 2, base)} Z" fill="${M(INK, C0, 0.12)}" stroke="${INK}" stroke-width="3"/>`;
    s += `<path d="M${P(dc - dw / 2 + 6, base - 4)} Q${P(dc, base - 16)} ${P(dc + dw / 2 - 6, base - 4)}" fill="${o.bed || '#7a5a9a'}" stroke="${INK}" stroke-width="2"/>`;
    // штампы: «хрупкое», стрелки, лапка
    // 29.10 (стример): штамп и лапка - по размеру лицевой стенки (у маленьких коробок штамп 60 px съезжал на бок и на вход):
    // штамп - в полосе 0.04…0.40 стенки, вход - 0.47…0.77
    const sx = x0 + fw * (o.flip ? 0.78 : 0.22), ks = f(Math.min(1, fw * 0.34 / 64)), kp = f(Math.min(1, fw / 110));
    s += `<g transform="translate(${P(sx, base - h * 0.5)}) rotate(-8) scale(${ks})"><rect x="-30" y="-12" width="60" height="22" rx="3" fill="none" stroke="#c84a3a" stroke-width="3"/><text y="5" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="11" fill="#c84a3a">ХРУПКОЕ</text></g>`;
    s += `<g fill="${M(C0, INK, 0.45)}" transform="translate(${P(sx, base - h * 0.18)}) scale(${kp})"><ellipse cy="4" rx="7" ry="6"/><circle cx="-7" cy="-5" r="3"/><circle cy="-8" r="3"/><circle cx="7" cy="-5" r="3"/></g>`;
    return { svg: s, h: h + dy + h * 0.45 };
  }
  // спящий кот калачиком (на крыше коробки, на поленнице): низ - y (лежит на поверхности, тень под ним), голова справа на лапках.
  // 29.10 (стример: «коты парят, уши отдельно от головы»): уши рисуются до головы и сидят на ней, хвост обёрнут спереди
  const sleepyCat = (X, x, y, c = '#8a8a96', s = 1) => { const d = X.mix(c, X.INK, 0.3), O = X.O(3), Z = (zx, zy, fs, sw) => `<text x="${zx}" y="${zy}" font-family="Russo One, Arial Black, sans-serif" font-size="${fs}" fill="#fff6d0" stroke="${X.INK}" stroke-width="${sw}" paint-order="stroke">z</text>`;
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="2" cy="1" rx="44" ry="5" fill="${X.INK}" opacity=".3"/>`
      + `<path d="M15 -22 L16 -40 L28 -27 Z M30 -27 L41 -40 L42 -21 Z" fill="${c}" ${O}/><path d="M18 -27 L18.5 -35 L24 -28.5 Z M33 -28 L38.5 -34 L39 -25 Z" fill="#ffb8c8"/>`
      + `<path d="M-36 0 Q-40 -30 -8 -32 Q18 -33 24 -16 L24 0 Z" fill="${c}" ${O}/><path d="M-26 -22 Q-10 -29 8 -27" stroke="#ffffff" stroke-width="3" fill="none" opacity=".3" stroke-linecap="round"/>`
      + `<circle cx="28" cy="-14" r="14" fill="${c}" ${O}/><ellipse cx="40" cy="-2.5" rx="7" ry="4" fill="${c}" stroke="${X.INK}" stroke-width="2.4"/>`
      + `<path d="M19 -15 q3.5 3 7 0 M31 -15 q3.5 3 7 0" stroke="${X.INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M27.5 -8.5 h3" stroke="#ff7aa2" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M-34 -4 Q-30 6 -6 3 Q8 1 14 -3" stroke="${X.INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-34 -4 Q-30 6 -6 3 Q8 1 14 -3" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M-12 -24 q4 8 0 16 M-2 -26 q4 8 0 18" stroke="${d}" stroke-width="2.4" fill="none" opacity=".6"/>`
      + Z(44, -32, 14, 2.5) + Z(54, -46, 11, 2) + '</g>'; };

  /* ---------- «Котики»: «Кошачий привал» - двор у крыш города: розовые шатры с ушами, палатки-коробки, рыба сушится на верёвках,
     клубки и миски; Когтекузня, Будуар, Рыбные ряды (как на Ярмарке котиков) ---------- */
  THEMES.cats = {
    line: '#2b1d18', ink: '#2b1d18', sky: 'linear-gradient(#0f0d2a 0%, #1d1a4a 40%, #3a2f6e 75%, #5a3a7a 100%)', moon: '#fff2c8', stars: '#fff7d6',
    far: { kind: 'hills', c: ['#231d4a', '#2c2456', '#352b62'], tree: '#1b1740' },
    grass: '#4c5a4c', grass2: '#435144', grassL: '#6f8a62', dirt: '#b8765a', dirtD: '#8f4f3a', dirtL: '#d89a7a', stone: '#a9503c',
    wood: '#a8754f', woodD: '#6e4a2f', woodL: '#c99068', metal: '#3a2f5e', glass: '#ffd76a', log: '#a8754f',
    canvas: [['#ffb8c8', '#e86a8a'], ['#c8b8f0', '#8a6ad8'], ['#f2d4a8', ''], ['#ffd8a0', '#e8902a'], ['#bfe0f0', '#5a9ac8']], marquee: ['#ffb8c8', '#e86a8a'], pavilion: ['#f2a0c8', '#fff0f6'],
    kinds: { big: 'bell', mid: 'box', small: 'ridge' }, beds: ['#8a6ad8', '#e86a8a', '#5a9ac8', '#e8902a'],
    fire: ['#ff7a2a', '#ffb43a', '#fff0a0'], brew: '#f6eee0', pot: '#5a4a7a', flags: ['#ff8fa3', '#ffd76a', '#8fd0ff', '#b9a2ff'],
    sign: { bg: '#6a2a5a', tx: '#ffcf4a' }, banner: '#c8407a', bannerTx: '#fff0a8',
    names: { storage: 'СКЛАД', anvil: 'ЗАТОЧКА', forge: 'КОГТЕКУЗНЯ', tent: 'БУДУАР', shop: 'РЫБНЫЕ РЯДЫ', gate: 'В ПОХОД' },
    laundry: ['sock', (x, y, c) => '', 'towel', 'sock', (x, y, c) => '', 'sock'], wash: ['#ff8fa3', '#8fd0ff', '#ffd76a', '#b9a2ff', '#f2d4a8'],
    smith: { hat: 'bandana', acc: ['mustache'] },
    roofs: { pink: { a: '#5a3a5a', b: '#6a4a6a', c: '#4a2e4a', edge: '#2b1d18' } },
    // 29.10 (стример: «на заднем фоне город, хотя это привал»): даль - холмы с лесом под ночным небом, как у привала «Легиона»
    // (крыши города с окошками остались у «Города» канала, styles/cats/fair.js); на луне - кот
    farDraw(X) {
      let s = X.hills(X.TH.far);
      s += `<path d="M2914 244 q-4 -16 2 -26 l6 10 q8 -4 16 0 l6 -10 q6 10 2 26 q14 10 10 30 q-2 12 -24 12 q-22 0 -24 -12 q-4 -20 6 -30 Z" fill="#1d1640"/><path d="M2936 284 q22 -2 24 -22" stroke="#1d1640" stroke-width="6" fill="none" stroke-linecap="round"/>`;
      return s;
    },
    tent(X, t, i, op) {
      if (op.kind === 'box') return boxTent(X, t.x, t.y, t.w * 0.92, { flip: t.flip, bed: op.bed });
      if (op.kind === 'bell') { const w = t.w, rw = w / 2 * 1.04, wh = w * 0.24, ch = w * 0.48, apex = t.y - wh - ch;
        return { svg: ears(X, t.x, apex, rw, ch, op.c, X.mix(op.c, '#ff6a9a', 0.4)) + X.C.tentBell(t.x, t.y, w, { ...op, hk: 0.48 }), h: w * 0.85 }; }   // 29.10: уши - за куполом (основания закрыты скатом)
      // маленькая - с заплаткой-лапкой
      return null;
    },
    coneTop: (X, cx, apex, w, c) => ears(X, cx, apex, w / 2 * 1.04, w * 0.52, c, '#ff9ac0'), coneBack: true,   // 29.10: уши Шатра - за куполом
    towerTop: (X, tx, y) => ears(X, tx, y, 64, 140, '#ffb8c8', '#ff8ab0') + `<path d="M${tx} ${y} V${y - 40}" stroke="${X.INK}" stroke-width="6" stroke-linecap="round"/><path d="M${tx} ${y - 40} l36 8 l-36 11 Z" fill="${X.TH.banner}" stroke="${X.INK}" stroke-width="3"/>`,
    fireDeco(X) {   // рыбка на палочках у костра: палочки воткнуты между брёвнами, рыбка - над краем огня (29.10: раньше лежала на бревне)
      const F = X.L.fire; let s = '';
      for (const [sx, sy, ex, ey, a] of [[F.x - 135, F.y + 32, F.x - 48, F.y - 60, -47], [F.x + 135, F.y + 32, F.x + 48, F.y - 60, 227]]) s += `<path d="M${sx} ${sy} L${ex} ${ey}" stroke="${X.INK}" stroke-width="7" stroke-linecap="round"/><path d="M${sx} ${sy} L${ex} ${ey}" stroke="${X.TH.woodL}" stroke-width="3.5" stroke-linecap="round"/>` + fish(X, ex - (ex - sx) * 0.12, ey - (ey - sy) * 0.12, a, 48, '#e8a07a');
      return s;
    },
    goods(X, kind, sx, w, gy) {
      const O = X.O, INK = X.INK; let t = '';
      if (kind === 'food') { t += fish(X, sx + 46, gy - 12, -10, 56, '#8fb8d8') + fish(X, sx + 104, gy - 16, 8, 50, '#e8a07a'); for (let k = 0; k < 2; k++) { const bx = sx + w - 52 + k * 26; t += `<path d="M${bx - 9} ${gy} V${gy - 30} Q${bx - 9} ${gy - 38} ${bx - 4} ${gy - 42} V${gy - 50} H${bx + 4} V${gy - 42} Q${bx + 9} ${gy - 38} ${bx + 9} ${gy - 30} V${gy} Z" fill="#f8f6f0" ${O(3)}/><rect x="${bx - 9}" y="${gy - 26}" width="18" height="10" fill="#8fd0ff"/><rect x="${bx - 5}" y="${gy - 54}" width="10" height="6" fill="#5a9ac8" stroke="${INK}" stroke-width="2"/>`; } }
      else if (kind === 'potion') for (let k = 0; k < 4; k++) { const px = sx + 24 + k * ((w - 48) / 3), pc = ['#8fd06a', '#c77dff', '#ff8fa3', '#8fd06a'][k]; t += `<path d="M${px - 4} ${gy - 34} V${gy - 24} Q${px - 16} ${gy - 18} ${px - 14} ${gy - 6} Q${px - 12} ${gy} ${px} ${gy} Q${px + 12} ${gy} ${px + 14} ${gy - 6} Q${px + 16} ${gy - 18} ${px + 4} ${gy - 24} V${gy - 34} Z" fill="${pc}" ${O(3)}/><rect x="${px - 5}" y="${gy - 40}" width="10" height="7" rx="2" fill="#6e4a2f" stroke="${INK}" stroke-width="2"/><g fill="#ffffff" opacity=".8" transform="translate(${px} ${gy - 12})"><ellipse cy="2" rx="3.4" ry="3"/><circle cx="-3.5" cy="-2.5" r="1.4"/><circle cy="-4" r="1.4"/><circle cx="3.5" cy="-2.5" r="1.4"/></g>`; }
      else t += yarn(X, sx + 40, gy - 18, '#ff8fa3', 18) + yarn(X, sx + 84, gy - 16, '#8fd0ff', 16) + yarn(X, sx + 124, gy - 18, '#ffd76a', 18) + `<rect x="${sx + w - 64}" y="${gy - 34}" width="36" height="34" fill="#d9a868" ${O(3)}/><path d="M${sx + w - 64} ${gy - 34} l8 -10 h36 l-8 10" fill="#e8c08a" ${O(2.5)}/>`;
      return t;
    },
    b: {
      // Склад - огромная коробка (как Когтекузня на Ярмарке котиков), рядом - коробки поменьше, на крыше спит кот
      storage(X) {
        const cx = 318, base = X.BASE, B = boxTent(X, cx, base, 390, { bed: '#d9a868' });
        let s = B.svg + X.K.put(X.K.def('crate', () => ''), cx - 30, base - 6, 0.5) + X.C.sacks(cx + 40, base - 2, { c: '#c8a46a' });
        s += boxTent(X, 104, base + 26, 110, {}).svg + boxTent(X, 540, base + 30, 96, { flip: true }).svg;
        s += sleepyCat(X, cx + 4, 610, '#e8a07a', 1.1);   // 29.10: на переднем краю коробки (раньше висел над тёмным нутром)
        s += X.sign(cx - 50, 668, X.TH.names.storage, 26);
        X.P(40, 620, `<g data-ol="storage">${s}</g>`, 470, base + 50);
      },
    },
    prop(X, p) {
      if (p.k === 'woodpile') return { s: X.C.woodpile(p.x, p.y) + sleepyCat(X, p.x - 30, p.y - 74, '#8a8a96'), w: 220, h: 170 };   // 29.10: кот левее топора, лежит на доске
      if (p.k === 'well') { const x = p.x, y = p.y; return { s: X.sh(x, y + 2, 34, 7) + `<path d="M${x - 26} ${y} V${y - 70} Q${x - 26} ${y - 84} ${x - 12} ${y - 92} V${y - 106} H${x + 12} V${y - 92} Q${x + 26} ${y - 84} ${x + 26} ${y - 70} V${y} Z" fill="#c8ccd8" ${X.O(4)}/><path d="M${x - 26} ${y - 30} H${x + 26} M${x - 26} ${y - 56} H${x + 26}" stroke="#8a8e9e" stroke-width="4"/><rect x="${x - 15}" y="${y - 114}" width="30" height="10" rx="3" fill="#8a8e9e" ${X.O(3)}/><text x="${x}" y="${y - 38}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="12" fill="#5a9ac8">МОЛОКО</text>`, w: 90, h: 130 }; }
      return null;
    },
    ground(K, R, L) {   // клубки и миски на земле
      const X0 = { O: (w = 3) => `stroke="#2b1d18" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`, INK: '#2b1d18', mix };
      const out = [];
      for (const [x, y, c] of [[560, 1130, '#ff8fa3'], [1120, 1170, '#8fd0ff'], [2190, 1140, '#ffd76a'], [2650, 1325, '#b9a2ff'], [3050, 1140, '#ff8fa3'], [430, 1300, '#ffd76a']]) out.push([x, yarn(X0, x, y, c, 16)]);
      for (const [x, y] of [[1460, 1110], [1960, 1130], [880, 1210]]) out.push([x, `<ellipse cx="${x}" cy="${y + 4}" rx="30" ry="8" fill="#2b1d18" opacity=".3"/><path d="M${x - 28} ${y - 10} Q${x - 24} ${y + 6} ${x} ${y + 6} Q${x + 24} ${y + 6} ${x + 28} ${y - 10} Z" fill="#5a9ac8" ${X0.O(3)}/><ellipse cx="${x}" cy="${y - 10}" rx="28" ry="7" fill="#f8f6f0" ${X0.O(2.5)}/>`]);
      return out;
    },
  };
  // рыба на верёвке вместо части белья (котики)
  THEMES.cats.laundry = ['sock', (x, y) => fish(XL, x, y + 22, 90, 46, '#8fb8d8'), 'towel', 'sock', (x, y) => fish(XL, x, y + 22, 90, 46, '#e8a07a'), 'sock'];
  const XL = { O: (w = 3) => `stroke="#2b1d18" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`, INK: '#2b1d18', mix };
  // венец из листьев (обезьяны): листья веером из точки (cx, y)
  const leafCrown = (X, cx, y, r = 60, c = '#3f8f3a', n = 7, up = 1) => {
    let s = ''; const d = X.mix(c, X.INK, 0.25);
    for (let i = 0; i < n; i++) { const a = (-160 + (140 / (n - 1)) * i) * Math.PI / 180, ex = cx + Math.cos(a) * r, ey = y + Math.sin(a) * r * 0.8 * up, mx = (cx + ex) / 2, my = (y + ey) / 2;
      s += `<path d="M${f1(cx)} ${f1(y)} Q${f1(mx - Math.sin(a) * 14)} ${f1(my + Math.cos(a) * 10)} ${f1(ex)} ${f1(ey)} Q${f1(mx + Math.sin(a) * 14)} ${f1(my - Math.cos(a) * 10)} ${f1(cx)} ${f1(y)} Z" fill="${i % 2 ? c : d}" ${X.O(3)}/><path d="M${f1(cx)} ${f1(y)} L${f1(ex)} ${f1(ey)}" stroke="${X.mix(c, '#ffffff', 0.25)}" stroke-width="2" opacity=".7"/>`; }
    return s;
  };
  // гроздь бананов
  const bananas = (X, x, y, s = 1) => { let g = ''; for (let i = 0; i < 4; i++) { const a = -30 + i * 20; g += `<path d="M0 0 Q${f1(6 + i * 2)} 18 ${f1(-4 + i * 6)} 34 Q${f1(10 + i * 4)} 22 ${f1(4 + i * 3)} 0 Z" fill="#ffd84a" stroke="${X.INK}" stroke-width="2.4" transform="rotate(${a})"/>`; } return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 -6 V4" stroke="${X.INK}" stroke-width="5" stroke-linecap="round"/>${g}<path d="M-2 -8 h6" stroke="#7a5230" stroke-width="5" stroke-linecap="round"/></g>`; };
  const coconut = (X, x, y, r = 14) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="#7a5230" ${X.O(3)}/><circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.2)}" r="${f1(r * 0.14)}" fill="${X.INK}"/><circle cx="${f1(x + r * 0.15)}" cy="${f1(y - r * 0.35)}" r="${f1(r * 0.14)}" fill="${X.INK}"/><path d="M${f1(x - r * 0.6)} ${f1(y + r * 0.3)} q${f1(r * 0.5)} ${f1(r * 0.3)} ${f1(r)} 0" stroke="#a87a48" stroke-width="2" fill="none"/>`;
  // бамбуковый шест: сегменты с кольцами
  const bamboo = (X, x, y0, y1, w = 9, c = '#b8c25a') => { let s = `<path d="M${f1(x)} ${f1(y0)} V${f1(y1)}" stroke="${X.INK}" stroke-width="${w + 5}" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y0)} V${f1(y1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; for (let y = y0 - 28; y > y1 + 8; y -= 30) s += `<path d="M${f1(x - w / 2)} ${f1(y)} H${f1(x + w / 2)}" stroke="${X.mix(c, X.INK, 0.4)}" stroke-width="2.4"/>`; return s + `<path d="M${f1(x - w * 0.2)} ${f1(y0 - 6)} V${f1(y1 + 6)}" stroke="#ffffff" stroke-width="2" opacity=".3"/>`; };

  /* ---------- «Обезьяны»: «Бамбуковая стоянка» - джунгли на закате: шалаши из листьев, бамбук, тики-факелы, бананы и кокосы,
     Кузня гориллы, Шалаш франта, Банановые ряды (как на Ярмарке обезьян) ---------- */
  THEMES.monkeys = {
    line: '#2a1a12', ink: '#2a1a12', sky: 'linear-gradient(#241a4e 0%, #4a2f72 34%, #9a4f7a 66%, #f0905a 100%)', moon: '', stars: '#fff2c8',
    far: { kind: 'jungle', c: ['#3a2a4a', '#2e3e2e', '#244a2e'] },
    grass: '#4f7a3a', grass2: '#456c34', grassL: '#7cc24a', dirt: '#b88a52', dirtD: '#7a5230', dirtL: '#d8ac70', stone: '#9a8a6a',
    wood: '#c99a5e', woodD: '#8a5a32', woodL: '#e2b678', metal: '#4a3424', glass: '#fff59a', log: '#9a6a3c',
    leaf: '#3f8f3a', leafD: '#2f7a36', leafL: '#7cc24a', bark: '#7a5232',
    canvas: [['#e8d29a', '#56a843'], ['#c9b07a', ''], ['#8fbf4a', '#3f8f3a'], ['#f0c87a', '#c8402a'], ['#d8c090', '#7a5230']], marquee: ['#e8d29a', '#3f8f3a'], pavilion: ['#ffd84a', '#3f8f3a'],
    kinds: { big: 'cone', mid: 'ridge', small: 'cone' }, beds: ['#c8402a', '#3f8f3a', '#ffd84a', '#5a8ac8'],
    fire: ['#ff7a2a', '#ffb43a', '#fff0a0'], brew: '#ffd84a', pot: '#6a4a2a', flags: ['#ffd84a', '#ff7a5a', '#7cc24a', '#5ad0e0'],
    sign: { bg: '#7a4a1a', tx: '#ffe39a' }, banner: '#3f8f3a', bannerTx: '#ffe39a',
    names: { storage: 'СКЛАД', anvil: 'ЗАТОЧКА', forge: 'КУЗНЯ ГОРИЛЛЫ', tent: 'ШАЛАШ', shop: 'БАНАНОВЫЕ РЯДЫ', gate: 'В ПОХОД' },
    laundry: ['towel', (x, y) => bananas(XM, x, y + 4, 1), 'sock', 'shirt', (x, y) => bananas(XM, x, y + 4, 0.9), 'towel'], wash: ['#ff7a5a', '#ffd84a', '#7cc24a', '#5ad0e0', '#e8d29a'],
    smith: { hat: 'bandana' },
    farDraw(X) {   // джунгли: силуэты крон, пальмы, лианы
      const { f1, W, INK, K } = X; let s = '';
      const crowns = (y0, c, seed, n, r0) => { const r = X.rng(seed); let d = ''; for (let i = 0; i < n; i++) { const x = (i / n) * (W + 200) - 100 + r() * 80, y = y0 + r() * 40, rr = r0 + r() * r0 * 0.6; d += K.blob(x, y, rr, rr * 0.7, r, 9, 0.18) + ' '; } return `<path d="${d}" fill="${c}"/>`; };
      s += crowns(520, '#2c2846', 3, 22, 90) + `<rect x="-40" y="560" width="${W + 80}" height="260" fill="#2c2846"/>`;
      s += crowns(600, '#24402c', 9, 28, 70) + `<rect x="-40" y="630" width="${W + 80}" height="200" fill="#24402c"/>`;
      let pl = ''; for (const [x, k] of [[220, 0.8], [980, 0.9], [2560, 0.85], [3240, 0.95], [1360, 0.7], [2080, 0.75]]) pl += K.tree('palm', x, 760, k);
      s += `<g opacity=".55">${pl}</g>`;
      let vn = ''; for (let i = 0; i < 18; i++) { const x = 60 + i * 190; vn += `M${x} 560 q${10 + (i % 3) * 6} 50 0 ${90 + (i % 4) * 20}`; } s += `<path d="${vn}" stroke="#2f5a2a" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`;
      return s;
    },
    tent(X, t, i, op) {
      if (op.kind === 'cone') { const w = t.w * 0.82, h = w * 0.95; return { svg: X.C.tentCone(t.x, t.y, w, { ...op, c: ['#5aa043', '#6aae4a', '#4f9a3a'][i % 3], leaf: true, poles: '#b8c25a' }) + leafCrown(X, t.x, t.y - h + 6, 34, '#3f8f3a', 5), h: h + 40 }; }
      return { svg: X.C.tentRidge(t.x, t.y, t.w, { ...op, pole: '#b8c25a' }) + leafCrown(X, t.x - (t.flip ? -1 : 1) * t.w * 0.24, t.y - t.w * 0.6 - 4, 30, '#56a843', 5), h: t.w * 0.8 };
    },
    // частокол из бамбука (символ на ствол, перевязь лианой)
    backFence(X) { X.P(0, 1520, bambooFence(X, 10, 1510, 800, 150, true), 620, 810); X.P(1880, X.W, bambooFence(X, 1890, X.W - 10, 800, 150, true), 620, 810); },
    sideFence(X) { let l = '', r = ''; const id = bambooId(X, false); for (let y = 790, i = 0; y < X.H + 40; y += 30, i++) { const k = 0.85 + (y - 790) / 900; l += X.K.put(id, 26 + (i % 2) * 6, y, k, k); r += X.K.put(id, X.W - 26 - (i % 2) * 6, y, k, k); } X.P(0, 80, l, 640, X.H); X.P(X.W - 80, X.W, r, 640, X.H); },
    fence: (K, x0, x1, base, h) => bambooFence({ K, INK: '#2a1a12', mix, O: (w = 3) => `stroke="#2a1a12" stroke-width="${w}"` }, x0, x1, base, h, false),
    coneTop: (X, cx, apex) => leafCrown(X, cx, apex - 4, 70, '#3f8f3a', 7),
    towerTop: (X, tx, y) => leafCrown(X, tx, y + 10, 60, '#3f8f3a', 7) + bananas(X, tx + 30, y + 40, 0.8),
    fireDeco(X) { const F = X.L.fire; return coconut(X, F.x - 140, F.y + 70, 13) + coconut(X, F.x + 150, F.y + 72, 12) + bananas(X, F.x + 112, F.y - 26, 0.8); },
    goods(X, kind, sx, w, gy) {
      let t = '';
      if (kind === 'food') { t += bananas(X, sx + 40, gy - 40, 1.2) + bananas(X, sx + 84, gy - 38, 1.1) + coconut(X, sx + w - 60, gy - 14, 14) + coconut(X, sx + w - 30, gy - 12, 12); t += `<path d="M${sx + 126} ${gy} q-14 -20 0 -40 q14 20 0 40 Z" fill="#ffb84a" ${X.O(3)}/><path d="M${sx + 126} ${gy - 40} l-8 -14 M${sx + 126} ${gy - 40} l0 -16 M${sx + 126} ${gy - 40} l8 -14" stroke="#3f8f3a" stroke-width="5" stroke-linecap="round"/>`; }
      else if (kind === 'potion') for (let k = 0; k < 4; k++) { const px = sx + 26 + k * ((w - 52) / 3), pc = ['#ff7a5a', '#7cc24a', '#5ad0e0', '#c77dff'][k]; t += `<path d="M${px} ${gy - 44} q-6 6 -2 12 q-12 6 -12 18 q0 14 14 14 q14 0 14 -14 q0 -12 -12 -18 q4 -6 -2 -12 Z" fill="#d8ac70" ${X.O(3)}/><ellipse cx="${px}" cy="${gy - 12}" rx="9" ry="6" fill="${pc}"/><path d="M${px - 4} ${gy - 46} h8" stroke="#7a5230" stroke-width="5" stroke-linecap="round"/>`; }
      else { for (let k = 0; k < 5; k++) t += bamboo(X, sx + 30 + k * 12, gy, gy - 50 - (k % 2) * 10, 7); t += `<path d="M${sx + 110} ${gy} q20 -26 40 0" stroke="#c8a060" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${sx + 116} ${gy - 6} q14 -16 28 0" stroke="#a87a48" stroke-width="3" fill="none"/>`; }
      return t;
    },
    prop(X, p) {
      const x = p.x, y = p.y;
      if (p.k === 'torch') return { s: `<ellipse cx="${x}" cy="${y + 2}" rx="60" ry="16" fill="url(#${X.K.glowId(X.TH.fire[1], 'cfg')})" opacity=".55"/><circle cx="${x}" cy="${y - 160}" r="70" fill="url(#${X.K.glowId(X.TH.fire[1], 'cfg')})" opacity=".6"/>` + bamboo(X, x, y, y - 120, 9)
        + `<path d="M${x - 14} ${y - 120} V${y - 152} Q${x} ${y - 162} ${x + 14} ${y - 152} V${y - 120} Z" fill="#9a6a3c" ${X.O(3)}/><path d="M${x - 8} ${y - 144} h5 M${x + 3} ${y - 144} h5 M${x - 7} ${y - 130} q7 6 14 0" stroke="${X.INK}" stroke-width="3" fill="none" stroke-linecap="round"/>` + X.C.flame(x, y - 156, 0.32, { fire: X.TH.fire }), w: 160, h: 240 };
      if (p.k === 'pole') return { s: X.sh(x, y + 2, 12, 4) + bamboo(X, x, y, y - 130, 9), w: 40, h: 150 };
      if (p.k === 'woodpile') { let s = X.sh(x, y + 2, 70, 9); for (const [dx, dy, r] of [[-40, -10, 16], [-10, -12, 18], [22, -10, 16], [50, -9, 14], [-26, -36, 16], [6, -38, 17], [36, -34, 15], [-8, -62, 16], [20, -60, 14]]) s += coconut(X, x + dx, y + dy, r); return { s, w: 180, h: 110 }; }
      if (p.k === 'flag') return { s: X.sh(x, y + 2, 12, 4) + bamboo(X, x, y, y - 150, 8) + `<path d="M${x + 2} ${y - 146} Q${x + 30} ${y - 154} ${x + 58} ${y - 138} Q${x + 30} ${y - 132} ${x + 2} ${y - 116} Z" fill="${X.TH.flags[(x >> 3) % 4]}" stroke="${X.INK}" stroke-width="3"/>`, w: 120, h: 190 };
      return null;
    },
    ground(K, R, L) {
      const out = [];
      // кусты папоротника и банановая кожура
      for (const [x, y] of [[520, 1290], [1020, 1320], [2330, 1310], [3000, 1320], [160, 1150], [3270, 1170], [860, 960], [2560, 1010]]) { let f = ''; for (let i = 0; i < 6; i++) { const a = (-150 + i * 24) * Math.PI / 180; f += `M${x} ${y} q${f1(Math.cos(a) * 30)} ${f1(Math.sin(a) * 30 - 10)} ${f1(Math.cos(a) * 54)} ${f1(Math.sin(a) * 40)}`; } out.push([x, `<path d="${f}" stroke="#2a1a12" stroke-width="9" fill="none" stroke-linecap="round"/><path d="${f}" stroke="#5aa043" stroke-width="5" fill="none" stroke-linecap="round"/>`]); }
      for (const [x, y] of [[1460, 1120], [1990, 1150], [700, 1080]]) out.push([x, `<path d="M${x} ${y} l-14 10 M${x} ${y} l2 14 M${x} ${y} l14 8" stroke="#2a1a12" stroke-width="8" stroke-linecap="round"/><path d="M${x} ${y} l-14 10 M${x} ${y} l2 14 M${x} ${y} l14 8" stroke="#ffd84a" stroke-width="4.5" stroke-linecap="round"/>`]);
      return out;
    },
  };
  function bambooId(X, dark) { const c = dark ? '#8a9a3a' : '#b8c25a', INK = X.INK; return X.K.def('bmb' + (dark ? 'd' : ''), () => `<path d="M-10 0 V-112 L-4 -120 H4 L10 -112 V0 Z" fill="${c}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M-10 -36 H10 M-10 -76 H10" stroke="${mix(c, INK, 0.45)}" stroke-width="3"/><path d="M-4 -8 V-108" stroke="#ffffff" stroke-width="2.5" opacity=".28"/><ellipse cy="-117" rx="5" ry="2.4" fill="${mix(c, '#ffffff', 0.3)}"/>`); }
  function bambooFence(X, x0, x1, base, h, dark) {
    const id = bambooId(X, dark), k = h / 120; let s = '', i = 0;
    for (let x = x0; x <= x1; x += 20 * k, i++) s += X.K.put(id, x, base + (i % 3 === 1 ? 3 : 0), k, k * (0.9 + ((i * 7) % 5) * 0.04));
    const by = base - h * 0.42;
    return s + `<path d="M${x0 - 8} ${by} H${x1 + 8}" stroke="${X.INK}" stroke-width="${f1(9 * k)}" stroke-linecap="round"/><path d="M${x0 - 8} ${by} H${x1 + 8}" stroke="#6a8a3a" stroke-width="${f1(4.5 * k)}" stroke-linecap="round"/>`;
  }
  const XM = { O: (w = 3) => `stroke="#2a1a12" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`, INK: '#2a1a12', mix };
  /* ---------- «Овощи»: «Огородная застава» — лагерь на огороде: палатки из мешковины и капустных листьев, клетчатая скатерть,
     грядки с ростками, тыквенные фонари, лейка, пугало-мишень, борщ в котле, Овощные ряды ---------- */
  const veg = {
    carrot: (X, x, y, s = 1, a = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${a}) scale(${s})"><path d="M-8 -30 Q0 -34 8 -30 L2 6 Q0 10 -2 6 Z" fill="#ff8a2a" ${X.O(2.5)}/><path d="M-5 -18 h4 M1 -10 h4 M-4 -2 h3" stroke="#c85a1a" stroke-width="2"/><path d="M0 -32 l-8 -14 M0 -32 l0 -16 M0 -32 l8 -14" stroke="#4caf50" stroke-width="4" stroke-linecap="round"/></g>`,
    tomato: (X, x, y, r = 14) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="#e8453a" ${X.O(2.8)}/><path d="M${f1(x - 6)} ${f1(y - r + 2)} l6 4 l6 -4 l-2 -5 l-4 2 l-4 -2 Z" fill="#4caf50" stroke="${X.INK}" stroke-width="1.8"/><path d="M${f1(x - r * 0.5)} ${f1(y - r * 0.2)} q2 -5 7 -6" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".5"/>`,
    cabbage: (X, x, y, r = 18) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="#9ad06a" ${X.O(2.8)}/><path d="M${f1(x)} ${f1(y - r)} Q${f1(x - r * 0.4)} ${f1(y)} ${f1(x)} ${f1(y + r)} M${f1(x - r * 0.7)} ${f1(y - r * 0.6)} Q${f1(x - r)} ${f1(y)} ${f1(x - r * 0.6)} ${f1(y + r * 0.7)} M${f1(x + r * 0.7)} ${f1(y - r * 0.6)} Q${f1(x + r * 0.2)} ${f1(y)} ${f1(x + r * 0.6)} ${f1(y + r * 0.7)}" stroke="#5a9a3a" stroke-width="2" fill="none"/>`,
    pumpkin: (X, x, y, r = 22, lit = false) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r * 1.2)}" ry="${f1(r)}" fill="#ff8a1a" ${X.O(3)}/><path d="M${f1(x - r * 0.4)} ${f1(y - r)} q${f1(-r * 0.3)} ${f1(r)} 0 ${f1(r * 2)} M${f1(x + r * 0.4)} ${f1(y - r)} q${f1(r * 0.3)} ${f1(r)} 0 ${f1(r * 2)}" stroke="#c4520e" stroke-width="2.5" fill="none"/>` + (lit ? `<path d="M${f1(x - r * 0.6)} ${f1(y - r * 0.2)} l${f1(r * 0.25)} ${f1(-r * 0.3)} l${f1(r * 0.25)} ${f1(r * 0.3)} Z M${f1(x + r * 0.1)} ${f1(y - r * 0.2)} l${f1(r * 0.25)} ${f1(-r * 0.3)} l${f1(r * 0.25)} ${f1(r * 0.3)} Z M${f1(x - r * 0.6)} ${f1(y + r * 0.25)} q${f1(r * 0.6)} ${f1(r * 0.4)} ${f1(r * 1.2)} 0 Z" fill="#ffe27a"/>` : '') + `<path d="M${f1(x)} ${f1(y - r)} q2 -10 10 -12" stroke="#4e7a2e" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    sprout: (X, x, y) => `<path d="M${f1(x)} ${f1(y)} v-12" stroke="#4caf50" stroke-width="3"/><path d="M${f1(x)} ${f1(y - 10)} q-10 -8 -14 -2 q6 6 14 2 Z M${f1(x)} ${f1(y - 12)} q8 -10 14 -4 q-6 7 -14 4 Z" fill="#6fc24a" stroke="${X.INK}" stroke-width="1.8"/>`,
  };
  THEMES.veggies = {
    line: '#2b2118', ink: '#2b2118', sky: 'linear-gradient(#141a3a 0%, #22305a 45%, #3e5a6a 100%)', moon: '#f6eecb', stars: '#fff7d6',
    far: { kind: 'fields', c: ['#2a3a3a', '#30463a', '#3a5440'] },
    grass: '#4a6a3a', grass2: '#405c34', grassL: '#7cb04a', dirt: '#7a5a3e', dirtD: '#5a3e28', dirtL: '#9a7a54', stone: '#8a8478',
    wood: '#b8844a', woodD: '#7a5230', woodL: '#d8a868', metal: '#3a3a44', glass: '#ffe08a', log: '#9a6a3c',
    leaf: '#4caf50', leafD: '#3a8f3c', leafL: '#8fd06a', bark: '#6b4423',
    canvas: [['#c8a46a', '#4caf50'], ['#9ad06a', '#5a9a3a'], ['#f2ead8', '#e8453a'], ['#d8b884', ''], ['#e8d27a', '#ff8a2a']], marquee: ['#c8a46a', '#4caf50'], pavilion: ['#9ad06a', '#f2f6d8'],
    kinds: { big: 'bell', mid: 'ridge', small: 'ridge' }, beds: ['#e8453a', '#4caf50', '#ff8a2a', '#8a5aa8'],
    fire: ['#ff7a2a', '#ffb43a', '#fff0a0'], brew: '#c8302a', pot: '#4a4a52', flags: ['#e8453a', '#ffd24a', '#4caf50', '#ff8a2a'],
    sign: { bg: '#3f7a2a', tx: '#fff0a8' }, banner: '#3f7a2a', bannerTx: '#fff0a8',
    names: { storage: 'КЛАДОВАЯ', anvil: 'ЗАТОЧКА', forge: 'КУЗНЯ', tent: 'ШАТЁР', shop: 'ОВОЩНЫЕ РЯДЫ', gate: 'В ПОХОД' },
    laundry: ['towel', 'sock', (x, y, c) => `<path d="M${x - 18} ${y} H${x + 18} L${x + 22} ${y + 44} Q${x} ${y + 52} ${x - 22} ${y + 44} Z" fill="#f2ead8" stroke="#2b2118" stroke-width="2.8"/><path d="M${x - 14} ${y + 30} h28" stroke="#e8453a" stroke-width="4"/><rect x="${x - 8}" y="${y + 10}" width="16" height="12" rx="2" fill="none" stroke="#e8453a" stroke-width="2.5"/>`, 'sock', 'pants', 'sock'], wash: ['#e8453a', '#4caf50', '#ffd24a', '#8a5aa8', '#f2ead8'],
    smith: { hat: 'bandana' },
    // даль: поле с бороздами, мельница, теплица, деревья
    farDraw(X) {
      const { f1, W, K, INK, mix } = X; let s = '';
      const hill = (y0, amp, c, seed) => { const r = X.rng(seed); let d = `M-40 900 L-40 ${y0}`; for (let x = -40; x <= W + 80; x += 200) d += ` Q${f1(x + 100)} ${f1(y0 - amp * (0.4 + r()))} ${f1(x + 200)} ${f1(y0 - amp * r() * 0.5)}`; return `<path d="${d} L${W + 80} 900 Z" fill="${c}"/>`; };
      s += hill(560, 80, '#283640', 4);
      let rows = ''; for (let k = 0; k < 6; k++) rows += `M-40 ${600 + k * 30} Q${W / 2} ${590 + k * 30} ${W + 40} ${600 + k * 30}`;
      s += `<rect x="-40" y="580" width="${W + 80}" height="240" fill="#30463a"/><path d="${rows}" stroke="#3e5a46" stroke-width="12" fill="none"/>`;
      // мельница и теплица
      s += `<g transform="translate(520 600)" fill="#1f2a30"><path d="M-30 0 L-20 -120 H20 L30 0 Z"/><path d="M-26 -120 L0 -150 L26 -120 Z"/><g transform="translate(0 -122)"><rect x="-6" y="-90" width="12" height="90"/><rect x="-6" y="0" width="12" height="90" transform="rotate(90)"/><rect x="-6" y="-90" width="12" height="90" transform="rotate(180)"/><rect x="-6" y="-90" width="12" height="90" transform="rotate(-90)"/></g></g>`;
      s += `<g transform="translate(2600 610)"><path d="M-110 0 V-60 Q0 -130 110 -60 V0 Z" fill="#2a3e46" opacity=".9"/><path d="M-70 0 V-90 M-30 0 V-104 M10 0 V-106 M50 0 V-98 M90 0 V-74" stroke="#3e5a66" stroke-width="5"/><rect x="-80" y="-40" width="20" height="16" fill="#ffe08a" opacity=".7"/></g>`;
      let tr = ''; for (const x of [140, 900, 1300, 2200, 3100, 3300]) tr += K.tree('tree', x, 620, 0.55);
      s += `<g opacity=".45">${tr}</g>`;
      return s;
    },
    tent(X, t, i, op) {
      if (op.kind === 'bell') {   // шатёр-кочан: зелёный в прожилках, на верхушке — листья
        const w = t.w, rw = w / 2 * 1.04, wh = w * 0.24, ch = w * 0.48, apex = t.y - wh - ch;
        let s = X.C.tentBell(t.x, t.y, w, { ...op, c: '#9ad06a', s: '', d: '#6aa84a', hk: 0.48 });
        let vn = ''; for (const k of [-0.7, -0.35, 0, 0.35, 0.7]) vn += `M${f1(t.x)} ${f1(apex + 10)} Q${f1(t.x + k * rw * 0.7)} ${f1(apex + ch * 0.5)} ${f1(t.x + k * rw)} ${f1(apex + ch)}`;
        s += `<path d="${vn}" stroke="#5a9a3a" stroke-width="3" fill="none" opacity=".85"/>` + leafCrown(X, t.x, apex - 2, 30, '#4caf50', 5);
        return { svg: s, h: w * 0.85 };
      }
      if (i % 3 === 2) {   // клетчатая скатерть
        let s = X.C.tentRidge(t.x, t.y, t.w, { ...op, c: '#f2ead8', s: '#e8453a' }); const x0 = t.x - t.w / 2, fw = t.w * 0.52, h = t.w * 0.6, sg = t.flip ? -1 : 1;
        let ck = ''; for (let k = 1; k < 4; k++) { const yy = t.y - h * k / 4; ck += `M${f1(t.x + (x0 + fw / 2 - (fw / 2) * (1 - k / 4) - t.x) * sg)} ${f1(yy)} H${f1(t.x + (x0 + fw / 2 + (fw / 2) * (1 - k / 4) - t.x) * sg)}`; }
        s += `<path d="${ck}" stroke="#e8453a" stroke-width="5" opacity=".55"/>`;
        return { svg: s, h: t.w * 0.75 };
      }
      return null;
    },
    coneTop: (X, cx, apex) => leafCrown(X, cx, apex - 2, 60, '#4caf50', 7),
    towerTop: (X, tx, y) => `<path d="M${tx} ${y} V${y - 22}" stroke="${X.INK}" stroke-width="6" stroke-linecap="round"/>` + veg.pumpkin(X, tx, y - 30, 16),
    fireDeco(X) {   // кукуруза на палочках
      const F = X.L.fire; let s = '';
      for (const [sx, sy, ex, ey] of [[F.x - 150, F.y + 64, F.x - 70, F.y - 26], [F.x + 156, F.y + 60, F.x + 72, F.y - 24]]) s += `<path d="M${sx} ${sy} L${ex} ${ey}" stroke="${X.INK}" stroke-width="7" stroke-linecap="round"/><path d="M${sx} ${sy} L${ex} ${ey}" stroke="${X.TH.woodL}" stroke-width="3.5" stroke-linecap="round"/><g transform="translate(${ex} ${ey}) rotate(${f1(Math.atan2(ey - sy, ex - sx) * 180 / Math.PI)})"><rect x="-6" y="-11" width="34" height="22" rx="11" fill="#ffd24a" ${X.O(2.5)}/><path d="M2 -8 v16 M10 -9 v18 M18 -8 v16" stroke="#e8a82a" stroke-width="2"/><path d="M-6 -8 q-12 4 -10 14 q8 -2 10 -6 Z" fill="#8fd06a" stroke="${X.INK}" stroke-width="2"/></g>`;
      return s;
    },
    goods(X, kind, sx, w, gy) {
      let t = '';
      if (kind === 'food') t += veg.cabbage(X, sx + 36, gy - 18, 18) + veg.tomato(X, sx + 74, gy - 14) + veg.tomato(X, sx + 98, gy - 12, 12) + veg.carrot(X, sx + 130, gy - 4, 1, -20) + veg.carrot(X, sx + 148, gy - 4, 1, 14) + veg.pumpkin(X, sx + w - 32, gy - 18, 16);
      else if (kind === 'potion') for (let k = 0; k < 4; k++) { const px = sx + 26 + k * ((w - 52) / 3), pc = ['#8fd06a', '#e8453a', '#ffd24a', '#8a5aa8'][k]; t += `<rect x="${px - 14}" y="${gy - 40}" width="28" height="40" rx="5" fill="#d8eef4" ${X.O(3)}/><rect x="${px - 12}" y="${gy - 30}" width="24" height="28" rx="3" fill="${pc}" opacity=".85"/><rect x="${px - 15}" y="${gy - 48}" width="30" height="10" rx="2" fill="#e8453a" stroke="${X.INK}" stroke-width="2"/><path d="M${px - 15} ${gy - 44} h30" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 4"/>`; }
      else { t += X.C.sacks(sx + 60, gy, { c: '#c8a46a' }) + `<path d="M${sx + 120} ${gy} V${gy - 30} H${sx + 160} V${gy}" fill="#8a8e9e" ${X.O(3)}/><path d="M${sx + 160} ${gy - 24} l20 -14" stroke="${X.INK}" stroke-width="7" stroke-linecap="round"/><path d="M${sx + 160} ${gy - 24} l20 -14" stroke="#8a8e9e" stroke-width="3.5" stroke-linecap="round"/><path d="M${sx + 126} ${gy - 30} q14 -22 28 0" stroke="${X.INK}" stroke-width="4" fill="none"/>`; }
      return t;
    },
    prop(X, p) {
      const x = p.x, y = p.y;
      if (p.k === 'torch') return { s: `<ellipse cx="${x}" cy="${y + 2}" rx="60" ry="16" fill="url(#${X.K.glowId(X.TH.fire[1], 'cfg')})" opacity=".5"/><circle cx="${x}" cy="${y - 150}" r="62" fill="url(#${X.K.glowId('#ffb43a', 'cfg')})" opacity=".55"/><path d="M${x} ${y} V${y - 130}" stroke="${X.INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x} ${y} V${y - 130}" stroke="${X.TH.woodL}" stroke-width="4.5" stroke-linecap="round"/>` + veg.pumpkin(X, x, y - 146, 20, true), w: 140, h: 220 };
      if (p.k === 'woodpile') { let s = X.sh(x, y + 2, 76, 9) + X.K.put(X.K.def('crate', () => ''), x - 34, y, 0.9) + X.K.put(X.K.def('crate', () => ''), x + 36, y, 0.9); for (let k = 0; k < 3; k++) s += veg.carrot(X, x - 48 + k * 14, y - 54, 0.9, -10 + k * 10) + veg.tomato(X, x + 24 + k * 14, y - 60, 10); s += veg.pumpkin(X, x + 82, y - 18, 20); return { s, w: 240, h: 120 }; }
      if (p.k === 'well') return { s: X.sh(x, y + 2, 40, 8) + `<path d="M${x - 30} ${y} L${x - 26} ${y - 64} H${x + 26} L${x + 30} ${y} Z" fill="#8a9aa8" ${X.O(4)}/><path d="M${x - 28} ${y - 22} H${x + 28} M${x - 27} ${y - 44} H${x + 27}" stroke="#6a7a88" stroke-width="3"/><path d="M${x + 26} ${y - 50} L${x + 70} ${y - 86}" stroke="${X.INK}" stroke-width="12" stroke-linecap="round"/><path d="M${x + 26} ${y - 50} L${x + 70} ${y - 86}" stroke="#8a9aa8" stroke-width="7" stroke-linecap="round"/><ellipse cx="${x + 74}" cy="${y - 90}" rx="10" ry="6" fill="#6a7a88" ${X.O(3)}/><path d="M${x - 20} ${y - 66} Q${x} ${y - 100} ${x + 20} ${y - 66}" stroke="${X.INK}" stroke-width="5" fill="none"/>`, w: 170, h: 120 };
      if (p.k === 'target') { // пугало-мишень: крестовина, мешок-голова с соломой, шляпа, мишень на груди
        const s = X.sh(x, y + 2, 34, 7) + `<path d="M${x} ${y} V${y - 150} M${x - 50} ${y - 104} H${x + 50}" stroke="${X.INK}" stroke-width="10" stroke-linecap="round"/><path d="M${x} ${y} V${y - 150} M${x - 50} ${y - 104} H${x + 50}" stroke="${X.TH.woodL}" stroke-width="5.5" stroke-linecap="round"/>`
          + `<path d="M${x - 34} ${y - 110} L${x - 30} ${y - 46} H${x + 30} L${x + 34} ${y - 110} Z" fill="#5a7aa8" ${X.O(3)}/><circle cx="${x}" cy="${y - 80}" r="18" fill="#ffffff" stroke="#e8453a" stroke-width="6"/><circle cx="${x}" cy="${y - 80}" r="6" fill="#e8453a"/><circle cx="${x}" cy="${y - 136}" r="20" fill="#c8a46a" ${X.O(3)}/><path d="M${x - 8} ${y - 140} l4 4 m0 -4 l-4 4 M${x + 4} ${y - 140} l4 4 m0 -4 l-4 4 M${x - 8} ${y - 126} q8 5 16 0" stroke="${X.INK}" stroke-width="2.4" fill="none"/><path d="M${x - 30} ${y - 152} H${x + 30} L${x + 18} ${y - 162} V${y - 178} H${x - 18} V${y - 162} Z" fill="#7a5230" ${X.O(3)}/><path d="M${x - 50} ${y - 104} l-10 8 M${x - 50} ${y - 104} l-12 -2 M${x + 50} ${y - 104} l10 8 M${x + 50} ${y - 104} l12 -2" stroke="#e8c45a" stroke-width="3" stroke-linecap="round"/>` + veg.carrot(X, x + 22, y - 94, 0.8, 60);
        return { s, w: 150, h: 200 }; }
      return null;
    },
    ground(K, R, L) {   // грядки с ростками и потерянные овощи
      const X0 = { O: (w = 3) => `stroke="#2b2118" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`, INK: '#2b2118', mix }, out = [];
      for (const [x, y, w] of [[470, 1320, 220], [1010, 1330, 200], [2340, 1325, 230], [2950, 1330, 200], [130, 1180, 90], [3290, 1200, 80]]) {
        let g = `<path d="M${x - w / 2} ${y} Q${x} ${y - 14} ${x + w / 2} ${y} Q${x} ${y + 12} ${x - w / 2} ${y} Z" fill="#5a3e28" ${X0.O(2.5)}/>`;
        for (let k = 0; k < Math.floor(w / 34); k++) g += veg.sprout(X0, x - w / 2 + 20 + k * 34, y - 2);
        out.push([x, g]);
      }
      out.push([1450, veg.carrot(X0, 1450, 1130, 0.8, 80)], [1960, veg.tomato(X0, 1960, 1150, 10)], [870, veg.cabbage(X0, 870, 1230, 12)]);
      return out;
    },
  };
  /* ---------- «42 Братухи»: «Глэмпинг Братух» — палатки-купола в розовом и леопарде, красная дорожка вместо тропы, белый лимузин-Склад,
     диско-шары, неоновый город за забором, фудкорт (бургеры, фри, газировка), бумбокс, коробки пиццы, джерси «42» на верёвках ---------- */
  const leo = (X, x0, y0, x1, y1, seed, c = '#7a4a1a') => { const r = X.rng(seed); let d = ''; for (let i = 0; i < Math.round((x1 - x0) * (y1 - y0) / 1600); i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), a = 5 + r() * 4; d += `M${f1(x - a)} ${f1(y)} a${f1(a)} ${f1(a * 0.8)} 0 1 0 ${f1(a * 2)} 0 a${f1(a)} ${f1(a * 0.8)} 0 1 0 ${f1(-a * 2)} 0`; } return `<path d="${d}" fill="none" stroke="${c}" stroke-width="3.2" stroke-dasharray="7 4"/>`; };
  const disco = (X, x, y, r = 22) => `<path d="M${x} ${y - r - 18} V${y - r}" stroke="${X.INK}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r}" fill="#c8d0e0" ${X.O(3)}/><path d="M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r} M${x - r * 0.7} ${y - r * 0.7} Q${x} ${y - r * 0.2} ${x + r * 0.7} ${y - r * 0.7} M${x - r * 0.7} ${y + r * 0.7} Q${x} ${y + r * 0.2} ${x + r * 0.7} ${y + r * 0.7}" stroke="#8a90a8" stroke-width="2" fill="none"/><rect x="${x - r * 0.5}" y="${y - r * 0.55}" width="${r * 0.3}" height="${r * 0.3}" fill="#ffffff"/><rect x="${x + r * 0.2}" y="${y + r * 0.1}" width="${r * 0.25}" height="${r * 0.25}" fill="#ff8cc6"/><rect x="${x - r * 0.2}" y="${y + r * 0.3}" width="${r * 0.22}" height="${r * 0.22}" fill="#5ad1ff"/>`;
  const chain = (X, x0, y0, x1, y1, sag = 20) => `<path d="M${x0} ${y0} Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + sag} ${x1} ${y1}" stroke="${X.INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${x0} ${y0} Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + sag} ${x1} ${y1}" stroke="#ffc83d" stroke-width="5" fill="none" stroke-dasharray="6 3" stroke-linecap="round"/>`;
  // купол-палатка: полуэллипс с дугами-швами, вход
  function domeTent(X, x, base, w, o = {}) {
    const c = o.c || '#ff8cc6', d = X.mix(c, X.INK, 0.22), h = w * 0.5, rw = w / 2, INK = X.INK;
    let s = X.sh(x, base + 2, rw * 1.06, w * 0.07);
    s += X.C.peg(x - rw * 0.9, base - h * 0.35, x - rw * 1.2, base - 4) + X.C.peg(x + rw * 0.9, base - h * 0.35, x + rw * 1.2, base - 4);
    s += `<path d="M${f1(x - rw)} ${f1(base)} Q${f1(x - rw)} ${f1(base - h * 1.3)} ${f1(x)} ${f1(base - h * 1.32)} Q${f1(x + rw)} ${f1(base - h * 1.3)} ${f1(x + rw)} ${f1(base)} Q${f1(x)} ${f1(base + 10)} ${f1(x - rw)} ${f1(base)} Z" fill="${c}" ${X.O(4.5)}/>`;
    if (o.leo) s += `<g opacity=".85">${leo(X, x - rw * 0.8, base - h, x + rw * 0.8, base - 8, Math.round(x), '#7a4a1a')}</g>`;
    s += `<path d="M${f1(x - rw * 0.92)} ${f1(base - 6)} Q${f1(x - rw * 0.2)} ${f1(base - h * 1.4)} ${f1(x + rw * 0.6)} ${f1(base - h * 0.9)} M${f1(x + rw * 0.92)} ${f1(base - 6)} Q${f1(x + rw * 0.2)} ${f1(base - h * 1.4)} ${f1(x - rw * 0.6)} ${f1(base - h * 0.9)}" stroke="${o.s || '#ffc83d'}" stroke-width="5" fill="none"/>`;
    s += `<path d="M${f1(x - rw * 0.7)} ${f1(base - h * 0.8)} Q${f1(x - rw * 0.4)} ${f1(base - h * 1.15)} ${f1(x)} ${f1(base - h * 1.2)}" stroke="#ffffff" stroke-width="5" fill="none" opacity=".35" stroke-linecap="round"/>`;
    const dw = w * 0.17, dh = h * 0.78;
    s += `<path d="M${f1(x - dw)} ${f1(base + 2)} Q${f1(x - dw)} ${f1(base - dh)} ${f1(x)} ${f1(base - dh)} Q${f1(x + dw)} ${f1(base - dh)} ${f1(x + dw)} ${f1(base + 2)} Z" fill="${X.mix(INK, c, 0.12)}" stroke="${INK}" stroke-width="3"/><path d="M${f1(x - dw)} ${f1(base + 2)} Q${f1(x - dw)} ${f1(base - dh)} ${f1(x)} ${f1(base - dh)}" stroke="${d}" stroke-width="7" fill="none"/>`;
    s += `<path d="M${f1(x - dw * 0.7)} ${f1(base - 4)} Q${f1(x)} ${f1(base - 18)} ${f1(x + dw * 0.7)} ${f1(base - 4)}" fill="${o.bed || '#ffc83d'}" stroke="${INK}" stroke-width="2"/>`;
    return { svg: s, h: h * 1.4 + 20 };
  }
  const burger = (X, x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-20 -10 Q-20 -28 0 -28 Q20 -28 20 -10 Z" fill="#e8a24a" ${X.O(2.5)}/><rect x="-22" y="-10" width="44" height="6" rx="3" fill="#4caf50" stroke="${X.INK}" stroke-width="2"/><rect x="-20" y="-4" width="40" height="7" rx="3" fill="#7a3a1a" stroke="${X.INK}" stroke-width="2"/><path d="M-20 3 H20 Q20 10 0 10 Q-20 10 -20 3 Z" fill="#e8a24a" ${X.O(2.5)}/><circle cx="-8" cy="-20" r="1.5" fill="#fff6c8"/><circle cx="4" cy="-23" r="1.5" fill="#fff6c8"/></g>`;
  const fries = (X, x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-10 -24 v-14 M-4 -24 v-18 M2 -24 v-16 M8 -24 v-13" stroke="${X.INK}" stroke-width="6" stroke-linecap="round"/><path d="M-10 -24 v-14 M-4 -24 v-18 M2 -24 v-16 M8 -24 v-13" stroke="#ffd54a" stroke-width="3.5" stroke-linecap="round"/><path d="M-14 -26 H14 L10 0 H-10 Z" fill="#e8262f" ${X.O(2.5)}/><text y="-8" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="9" fill="#ffd54a">42</text></g>`;
  const soda = (X, x, y, c = '#e8262f') => `<path d="M${x - 10} ${y} L${x - 13} ${y - 34} H${x + 13} L${x + 10} ${y} Z" fill="${c}" ${X.O(2.5)}/><rect x="${x - 14}" y="${y - 40}" width="28" height="7" rx="3" fill="#ffffff" stroke="${X.INK}" stroke-width="2"/><path d="M${x + 4} ${y - 40} l6 -14" stroke="${X.INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M${x - 9} ${y - 22} h18" stroke="#ffffff" stroke-width="3"/>`;
  // 26.10 (просьба стримера: «больше эпатажа»): золотые столбики с бархатным канатом вместо частокола, короны, золотые слитки,
  // шампанское во льду, джакузи, надувные золотые «42», салют, шуба на верёвке, конфетти и купюры на земле
  const stanchion = (K) => K.def('stanch', () => `<ellipse cx="0" cy="0" rx="16" ry="5" fill="#1c1022" opacity=".35"/><path d="M-14 0 Q-14 -8 0 -8 Q14 -8 14 0 Z" fill="#ffc83d" stroke="#1c1022" stroke-width="3"/><rect x="-5" y="-62" width="10" height="56" fill="#ffc83d" stroke="#1c1022" stroke-width="3"/><path d="M-2 -58 V-12" stroke="#fff6c8" stroke-width="2.5"/><circle cy="-68" r="9" fill="#ffc83d" stroke="#1c1022" stroke-width="3"/><circle cx="-3" cy="-71" r="3" fill="#fff6c8"/>`);
  function velvet(K, x0, x1, base, k = 1, step = 110) {
    const id = stanchion(K); let posts = '', rope = '';
    for (let x = x0, i = 0; x <= x1 + 1; x += step * k, i++) { posts += K.put(id, x, base, k); if (x + step * k <= x1 + 1) rope += `M${f1(x)} ${f1(base - 56 * k)} Q${f1(x + step * k / 2)} ${f1(base - 30 * k)} ${f1(x + step * k)} ${f1(base - 56 * k)} `; }
    return `<path d="${rope}" stroke="#1c1022" stroke-width="${f1(11 * k)}" fill="none" stroke-linecap="round"/><path d="${rope}" stroke="#c8202a" stroke-width="${f1(7 * k)}" fill="none" stroke-linecap="round"/><path d="${rope}" stroke="#ff6a7a" stroke-width="${f1(2 * k)}" fill="none" stroke-linecap="round" opacity=".7"/>` + posts;
  }
  const crown = (X, x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-30 0 L-34 -34 L-16 -16 L0 -40 L16 -16 L34 -34 L30 0 Z" fill="#ffc83d" ${X.O(3.5)}/><rect x="-32" y="-4" width="64" height="10" rx="3" fill="#e8a82a" stroke="${X.INK}" stroke-width="3"/><circle cx="-34" cy="-36" r="4.5" fill="#ff5fa2" stroke="${X.INK}" stroke-width="2"/><circle cy="-42" r="5" fill="#5ad1ff" stroke="${X.INK}" stroke-width="2"/><circle cx="34" cy="-36" r="4.5" fill="#36c94a" stroke="${X.INK}" stroke-width="2"/><circle cx="-14" cy="1" r="3" fill="#ff5fa2"/><circle cx="14" cy="1" r="3" fill="#5ad1ff"/></g>`;
  const goldBars = (X, x, y) => { let s = X.sh(x, y + 2, 46, 8); for (const [dx, dy] of [[-26, 0], [0, 0], [26, 0], [-13, -16], [13, -16], [0, -32]]) s += `<path d="M${x + dx - 14} ${y + dy} L${x + dx - 10} ${y + dy - 16} H${x + dx + 10} L${x + dx + 14} ${y + dy} Z" fill="#ffc83d" stroke="#1c1022" stroke-width="2.6"/><path d="M${x + dx - 8} ${y + dy - 12} h8" stroke="#fff6c8" stroke-width="2.4"/>`; return s; };
  const champagne = (X, x, y) => X.sh(x, y + 2, 34, 7) + `<path d="M${x - 26} ${y - 40} L${x - 20} ${y} H${x + 20} L${x + 26} ${y - 40} Z" fill="#c8ccd8" ${X.O(3.5)}/><path d="M${x - 24} ${y - 30} H${x + 24}" stroke="#8a8ea0" stroke-width="3"/><path d="M${x - 26} ${y - 40} Q${x} ${y - 52} ${x + 26} ${y - 40}" fill="#e8f6ff" stroke="#1c1022" stroke-width="2.5"/>`
    + [[-10, -16], [10, 14]].map(([dx, a]) => `<g transform="translate(${x + dx} ${y - 40}) rotate(${a})"><path d="M-7 0 V-34 Q-7 -42 -3 -46 V-58 H3 V-46 Q7 -42 7 -34 V0 Z" fill="#2e5a3a" stroke="#1c1022" stroke-width="2.5"/><rect x="-4" y="-62" width="8" height="8" fill="#ffc83d" stroke="#1c1022" stroke-width="2"/><rect x="-6" y="-26" width="12" height="12" fill="#f4f1ec"/></g>`).join('');
  const balloon42 = (X, x, y, s = 1, c = '#ffc83d') => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 70 q-6 40 6 80" stroke="#1c1022" stroke-width="2" fill="none" opacity=".7"/><text x="0" y="60" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="110" fill="${c}" stroke="#1c1022" stroke-width="7" paint-order="stroke" stroke-linejoin="round">42</text><path d="M-46 -6 q10 -12 24 -12" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/></g>`;
  const firework = (X, x, y, r, c) => { let d = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; d += `M${f1(x + Math.cos(a) * r * 0.3)} ${f1(y + Math.sin(a) * r * 0.3)} L${f1(x + Math.cos(a) * r)} ${f1(y + Math.sin(a) * r)} `; } return `<path d="${d}" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity=".85"/>` + [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6 + 0.08) * Math.PI * 2; return `<circle cx="${f1(x + Math.cos(a) * r * 1.15)}" cy="${f1(y + Math.sin(a) * r * 1.15)}" r="4" fill="#fff6c8"/>`; }).join(''); };
  const furCoat = (x, y, c, leoOn) => `<path d="M${x - 24} ${y} L${x - 32} ${y + 54} Q${x} ${y + 62} ${x + 32} ${y + 54} L${x + 24} ${y} Q${x} ${y + 8} ${x - 24} ${y} Z" fill="${c}" stroke="#1c1022" stroke-width="2.8"/><path d="M${x - 24} ${y} q-6 8 -2 14 q-6 6 0 12 M${x + 24} ${y} q6 8 2 14 q6 6 0 12 M${x - 30} ${y + 52} q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0" stroke="#1c1022" stroke-width="2" fill="none"/><path d="M${x} ${y + 6} V${y + 56}" stroke="#1c1022" stroke-width="2"/>` + (leoOn ? [[-12, 18], [10, 26], [-8, 40], [14, 44], [0, 30]].map(([dx, dy]) => `<ellipse cx="${x + dx}" cy="${y + dy}" rx="5" ry="4" fill="none" stroke="#7a4a1a" stroke-width="2.4" stroke-dasharray="5 3"/>`).join('') : '') + `<circle cx="${x + 4}" cy="${y + 14}" r="3" fill="#ffc83d" stroke="#1c1022" stroke-width="1.5"/>`;
  THEMES['42brothers'] = {
    line: '#1c1022', ink: '#1c1022', sky: 'linear-gradient(#120a2a 0%, #2a1050 45%, #5a1a6a 100%)', moon: '', stars: '#ffe6ff',
    far: { kind: 'city', c: ['#2a1a46', '#36205a', '#42286a'] },
    grass: '#2e6a4a', grass2: '#285e42', grassL: '#4fae6a', dirt: '#5a4a62', dirtD: '#3e3248', dirtL: '#7a6a82', stone: '#8a8a9a',
    wood: '#c99a5e', woodD: '#8a5a32', woodL: '#e2b678', metal: '#2a2440', glass: '#ffc83d', log: '#b88a4a',
    canvas: [['#ff8cc6', '#ffc83d'], ['#e8b35a', '#7a4a1a'], ['#5ad1ff', '#ffffff'], ['#b48cff', '#ffc83d'], ['#ff7b1c', '#1c1022']], marquee: ['#ff5fa2', '#ffc83d'], pavilion: ['#e8b35a', '#ffc83d'],
    kinds: { big: 'dome', mid: 'dome', small: 'ridge' }, beds: ['#ffc83d', '#ff5fa2', '#5ad1ff', '#36c94a'],
    fire: ['#ff7a2a', '#ffb43a', '#fff0a0'], brew: '#ffc83d', pot: '#1c1022', flags: ['#ff5fa2', '#ffc83d', '#5ad1ff', '#36c94a'],
    sign: { bg: '#1c1022', tx: '#ffc83d' }, banner: '#ff5fa2', bannerTx: '#fff6c8',
    names: { storage: 'СКЛАД', anvil: 'ЗАТОЧКА', forge: 'КУЗНЯ', tent: 'БУТИК', shop: 'ФУДКОРТ', gate: 'В ПОХОД' },
    laundry: [(x, y) => `<path d="M${x - 22} ${y} L${x - 30} ${y + 14} L${x - 20} ${y + 20} V${y + 46} H${x + 20} V${y + 20} L${x + 30} ${y + 14} L${x + 22} ${y} Q${x} ${y + 8} ${x - 22} ${y} Z" fill="#ff7b1c" stroke="#1c1022" stroke-width="2.8"/><text x="${x}" y="${y + 36}" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="16" fill="#1c1022">42</text>`, (x, y) => furCoat(x, y, '#ff8cc6', false), 'sock', (x, y) => furCoat(x, y, '#e8b35a', true), (x, y) => `<path d="M${x - 22} ${y} L${x - 30} ${y + 14} L${x - 20} ${y + 20} V${y + 46} H${x + 20} V${y + 20} L${x + 30} ${y + 14} L${x + 22} ${y} Q${x} ${y + 8} ${x - 22} ${y} Z" fill="#36c94a" stroke="#1c1022" stroke-width="2.8"/><text x="${x}" y="${y + 36}" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="16" fill="#ffffff">42</text>`, 'sock', 'towel'], wash: ['#ff5fa2', '#ffc83d', '#5ad1ff', '#b48cff', '#ffffff'],
    smith: { hat: 'none' },
    fence: (K, x0, x1, base) => velvet(K, x0 + 20, x1 - 20, base, 1.15),
    sideFence(X) { let l = '', r = ''; for (let y = 800, i = 0; y < X.H + 40; y += 90, i++) { const k = 0.85 + (y - 790) / 900; l += X.K.put(stanchion(X.K), 34, y, k); r += X.K.put(stanchion(X.K), X.W - 34, y, k); } X.P(0, 80, l, 640, X.H); X.P(X.W - 80, X.W, r, 640, X.H); },
    backFence(X) { for (const [a, b] of [[10, 1510], [1890, X.W - 10]]) X.P(a, b, X.C.stakes(a, b, 800, 150, { dark: true }) + `<path d="M${a} 694 H${b}" stroke="#1c1022" stroke-width="12"/><path d="M${a} 694 H${b}" stroke="#ff5fa2" stroke-width="6"/><path d="M${a} 694 H${b}" stroke="#ffd0e8" stroke-width="2"/>` + chain(X, a, 666, b, 666, 0), 620, 810); },
    trail: (tr) => `<path d="${tr}" stroke="#1c1022" stroke-width="66" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${tr}" stroke="#ffc83d" stroke-width="58" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${tr}" stroke="#c8202a" stroke-width="50" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${tr}" stroke="#e8343e" stroke-width="20" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>`,
    farDraw(X) {   // неоновый город: высотки с окнами, вывески, прожекторы
      const { f1, W } = X, r = X.rng(42); let s = '', win = '', neon = '';
      s += `<path d="M1400 800 L1220 170 L1300 170 Z M2050 800 L2240 170 L2160 170 Z" fill="#ff8cc6" opacity=".12"/>`;
      for (let x = -40; x < W + 40;) { const w = 80 + r() * 120, h = 140 + r() * 260, y = 780 - h; s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h + 40)}" fill="${['#24163e', '#2c1a48', '#201238'][Math.floor(r() * 3)]}"/>`;
        for (let yy = y + 16; yy < 760; yy += 26) for (let xx = x + 12; xx < x + w - 14; xx += 22) if (r() < 0.32) win += `<rect x="${f1(xx)}" y="${f1(yy)}" width="10" height="12"/>`;
        if (r() < 0.25) neon += `<rect x="${f1(x + 10)}" y="${f1(y + 20)}" width="${f1(w - 20)}" height="26" rx="6" fill="none" stroke="${['#ff5fa2', '#5ad1ff', '#ffc83d'][Math.floor(r() * 3)]}" stroke-width="4"/>`;
        x += w + 4; }
      s += `<g fill="#ffd76a" opacity=".55">${win}</g><g opacity=".9">${neon}</g>`;
      s += `<g transform="translate(2700 380)"><rect x="-120" y="-60" width="240" height="120" rx="12" fill="#1c1022" stroke="#ff5fa2" stroke-width="6"/><text y="30" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="84" fill="#ffc83d" stroke="#ff5fa2" stroke-width="3" paint-order="stroke">42</text></g>`;
      return s;
    },
    tent(X, t, i, op) {
      if (op.kind === 'dome') { const d = domeTent(X, t.x, t.y, t.w * 0.9, { c: ['#ff8cc6', '#e8b35a', '#b48cff', '#5ad1ff'][i % 4], leo: i % 4 !== 2, s: '#ffc83d', bed: op.bed }), top = t.y - t.w * 0.9 * 0.5 * 1.32;
        return { svg: d.svg + chain(X, t.x - t.w * 0.38, t.y - t.w * 0.2, t.x + t.w * 0.38, t.y - t.w * 0.2, 26) + (i % 2 ? crown(X, t.x, top + 4, 0.8) : disco(X, t.x, top - 10, 16)), h: d.h + 40 }; }
      return { svg: X.C.tentRidge(t.x, t.y, t.w, { ...op, c: i % 2 ? '#ff7b1c' : '#f4f1ec', s: '#1c1022' }) + chain(X, t.x - t.w * 0.3, t.y - t.w * 0.2, t.x + t.w * 0.1, t.y - t.w * 0.18, 14), h: t.w * 0.75 };
    },
    coneTop: (X, cx, apex) => crown(X, cx, apex + 8, 1.5) + disco(X, cx, apex - 70, 24),
    towerTop: (X, tx, y) => crown(X, tx, y + 8, 0.9) + disco(X, tx, y - 44, 16),
    fireDeco(X) {   // сосиски на палочках
      const F = X.L.fire; let s = '';
      for (const [sx, sy, ex, ey] of [[F.x - 150, F.y + 64, F.x - 70, F.y - 26], [F.x + 156, F.y + 60, F.x + 72, F.y - 24]]) s += `<path d="M${sx} ${sy} L${ex} ${ey}" stroke="${X.INK}" stroke-width="7" stroke-linecap="round"/><path d="M${sx} ${sy} L${ex} ${ey}" stroke="${X.TH.woodL}" stroke-width="3.5" stroke-linecap="round"/><g transform="translate(${ex} ${ey}) rotate(${f1(Math.atan2(ey - sy, ex - sx) * 180 / Math.PI)})"><rect x="-8" y="-8" width="40" height="16" rx="8" fill="#c8503a" ${X.O(2.5)}/><path d="M4 -4 l4 8 M14 -4 l4 8" stroke="#8a2a1a" stroke-width="2"/></g>`;
      return s + champagne(X, F.x + 180, F.y + 96) + goldBars(X, F.x - 190, F.y + 100);
    },
    goods(X, kind, sx, w, gy) {
      if (kind === 'food') return burger(X, sx + 40, gy - 2) + burger(X, sx + 88, gy - 2, 0.9) + fries(X, sx + 136, gy) + fries(X, sx + 166, gy, 0.9);
      if (kind === 'potion') return soda(X, sx + 34, gy) + soda(X, sx + 70, gy, '#36c94a') + soda(X, sx + 106, gy, '#5ad1ff') + soda(X, sx + 142, gy, '#ff8cc6') + `<rect x="${sx + w - 40}" y="${gy - 30}" width="26" height="30" rx="3" fill="#ffffff" ${X.O(2.5)}/><path d="M${sx + w - 40} ${gy - 18} h26" stroke="#e8262f" stroke-width="5"/>`;
      return `<rect x="${sx + 20}" y="${gy - 16}" width="70" height="16" fill="#ffc83d" ${X.O(2.5)}/><rect x="${sx + 30}" y="${gy - 30}" width="50" height="14" fill="#ffd76a" ${X.O(2.5)}/><path d="M${sx + 26} ${gy - 12} h20 M${sx + 36} ${gy - 26} h20" stroke="#ffffff" stroke-width="2.5"/>` + chain(X, sx + 104, gy - 30, sx + 170, gy - 30, 22) + disco(X, sx + w - 30, gy - 22, 14);
    },
    b: {
      // Склад — белый лимузин с открытым багажником (коробки, сумки), на крыше — вывеска
      storage(X) {
        const { f1, INK, O, BASE } = X, x0 = 90, x1 = 560, y = BASE + 10; let s = X.sh((x0 + x1) / 2, y + 2, 250, 14);
        s += `<path d="M${x0} ${y - 30} Q${x0} ${y - 90} ${x0 + 40} ${y - 96} L${x0 + 120} ${y - 100} L${x0 + 160} ${y - 150} H${x1 - 150} L${x1 - 110} ${y - 100} L${x1 - 30} ${y - 96} Q${x1} ${y - 90} ${x1} ${y - 30} V${y - 16} H${x0} Z" fill="#f4f1ec" ${O(4.5)}/>`;
        s += `<path d="M${x0 + 170} ${y - 140} L${x0 + 136} ${y - 102} H${x0 + 230} V${y - 140} Z M${x0 + 244} ${y - 140} V${y - 102} H${x1 - 160} V${y - 140} Z M${x1 - 150} ${y - 140} V${y - 102} H${x1 - 124} Z" fill="#2a2440" stroke="${INK}" stroke-width="3"/>`;
        s += `<path d="M${x0 + 10} ${y - 56} H${x1 - 10}" stroke="#ffc83d" stroke-width="6"/><path d="M${x0 + 20} ${y - 90} H${x1 - 40}" stroke="#ffffff" stroke-width="5" opacity=".6" stroke-linecap="round"/>`;
        for (const wx of [x0 + 80, x1 - 90]) s += `<circle cx="${wx}" cy="${y - 14}" r="30" fill="#2a2440" ${O(4)}/><circle cx="${wx}" cy="${y - 14}" r="14" fill="#ffc83d" stroke="${INK}" stroke-width="3"/>`;
        // открытый багажник (слева)
        s += `<path d="M${x0 + 4} ${y - 80} L${x0 - 40} ${y - 150} L${x0 + 30} ${y - 168} L${x0 + 56} ${y - 98} Z" fill="#e6e2da" ${O(4)}/><rect x="${x0 + 6}" y="${y - 82}" width="60" height="30" fill="#2a2440" stroke="${INK}" stroke-width="3"/>`;
        s += X.K.put(X.K.def('crate', () => ''), x0 + 30, y - 52, 0.5) + `<rect x="${x0 - 30}" y="${y - 40}" width="44" height="40" rx="6" fill="#ff5fa2" ${O(3)}/><path d="M${x0 - 18} ${y - 40} q10 -16 20 0" stroke="${INK}" stroke-width="4" fill="none"/>`;
        s += `<circle cx="${x1 - 6}" cy="${y - 60}" r="7" fill="#ffd76a" stroke="${INK}" stroke-width="2.5"/>` + X.K.put(X.K.def('crate', () => ''), x1 + 24, y + 20, 0.7);
        s += X.sign((x0 + x1) / 2 + 10, y - 196, X.TH.names.storage, 26) + `<path d="M${(x0 + x1) / 2 - 40} ${y - 172} V${y - 150} M${(x0 + x1) / 2 + 60} ${y - 172} V${y - 150}" stroke="${INK}" stroke-width="5"/>`;
        X.P(20, 640, `<g data-ol="storage">${s}</g>`, 480, BASE + 60);
      },
    },
    prop(X, p) {
      const x = p.x, y = p.y, { INK, O } = X;
      if (p.k === 'woodpile') { let s = X.sh(x, y + 2, 70, 9); for (let k = 0; k < 6; k++) s += `<g transform="translate(${x - 4 + (k % 2) * 8} ${y - k * 13})"><path d="M-56 0 L-50 -12 H50 L56 0 Z" fill="${k % 2 ? '#f4f1ec' : '#e6dcc8'}" ${O(3)}/><text y="-2" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="9" fill="#e8262f">ПИЦЦА</text></g>`; return { s, w: 160, h: 110 }; }
      if (p.k === 'hitch') { const s = X.sh(x, y + 2, 110, 10) + `<rect x="${x - 90}" y="${y - 70}" width="180" height="70" rx="12" fill="#2a2440" ${O(4)}/><circle cx="${x - 50}" cy="${y - 34}" r="24" fill="#1c1022" stroke="#ffc83d" stroke-width="4"/><circle cx="${x + 50}" cy="${y - 34}" r="24" fill="#1c1022" stroke="#ffc83d" stroke-width="4"/><circle cx="${x - 50}" cy="${y - 34}" r="9" fill="#8a8a9a"/><circle cx="${x + 50}" cy="${y - 34}" r="9" fill="#8a8a9a"/><rect x="${x - 18}" y="${y - 58}" width="36" height="20" rx="3" fill="#5ad1ff" stroke="${INK}" stroke-width="2.5"/><path d="M${x - 70} ${y - 70} Q${x} ${y - 120} ${x + 70} ${y - 70}" stroke="${INK}" stroke-width="7" fill="none"/><path d="M${x - 70} ${y - 70} Q${x} ${y - 120} ${x + 70} ${y - 70}" stroke="#ffc83d" stroke-width="3" fill="none"/><path d="M${x + 96} ${y - 90} q10 -10 20 0 M${x + 104} ${y - 110} q10 -10 20 0" stroke="#ff5fa2" stroke-width="4" fill="none" stroke-linecap="round"/>`; return { s, w: 260, h: 130 }; }
      // джакузи: золотая кадка, розовая пена, пузыри, уточка и бутылка
      if (p.k === 'well') { let s = X.sh(x, y + 4, 74, 12) + `<path d="M${x - 70} ${y - 36} L${x - 62} ${y} H${x + 62} L${x + 70} ${y - 36} Z" fill="#ffc83d" ${O(4)}/><path d="M${x - 60} ${y - 22} H${x + 60}" stroke="#e8a82a" stroke-width="4"/><ellipse cx="${x}" cy="${y - 36}" rx="70" ry="14" fill="#5ad1ff" ${O(3.5)}/>`;
        for (const [dx, dy, r] of [[-40, -44, 14], [-18, -48, 12], [8, -46, 15], [34, -44, 12], [-30, -54, 9], [20, -58, 10]]) s += `<circle cx="${x + dx}" cy="${y + dy}" r="${r}" fill="#ffd0e8" stroke="${INK}" stroke-width="2"/>`;
        s += `<g transform="translate(${x + 44} ${y - 50})"><ellipse rx="12" ry="9" fill="#ffd84a" stroke="${INK}" stroke-width="2.5"/><circle cx="-6" cy="-10" r="7" fill="#ffd84a" stroke="${INK}" stroke-width="2.5"/><path d="M-13 -10 l-6 2 l6 2" fill="#ff7a2a"/><circle cx="-7" cy="-12" r="1.5" fill="${INK}"/></g><text x="${x}" y="${y - 12}" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="15" fill="#1c1022">VIP SPA</text>`;
        return { s, w: 170, h: 110 }; }
      if (p.k === 'crate') return { s: goldBars(X, x, y), w: 110, h: 70 };
      if (p.k === 'barrel') return { s: champagne(X, x, y), w: 90, h: 110 };
      if (p.k === 'crates') return { s: goldBars(X, x - 30, y) + goldBars(X, x + 34, y + 6), w: 170, h: 80 };
      // пакеты из бутиков
      if (p.k === 'sacks') { let s = X.sh(x, y + 2, 56, 8); [['#ff5fa2', -24, 0], ['#1c1022', 12, 4], ['#ffc83d', 40, -2]].forEach(([c, dx, dy]) => { s += `<rect x="${x + dx - 18}" y="${y + dy - 46}" width="36" height="46" rx="3" fill="${c}" ${O(3)}/><path d="M${x + dx - 10} ${y + dy - 46} q10 -20 20 0" stroke="${c === '#1c1022' ? '#ffc83d' : INK}" stroke-width="3.5" fill="none"/><text x="${x + dx}" y="${y + dy - 16}" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="13" fill="${c === '#ffc83d' ? '#1c1022' : '#ffc83d'}">42</text>`; }); return { s, w: 140, h: 90 }; }
      // флажки - надувные розовые пальмы
      if (p.k === 'flag') return { s: X.sh(x, y + 2, 26, 6) + `<path d="M${x - 8} ${y} Q${x - 4} ${y - 70} ${x + 6} ${y - 130} L${x + 18} ${y - 128} Q${x + 8} ${y - 70} ${x + 10} ${y} Z" fill="#ff8cc6" ${O(3.5)}/>` + [[-60, -150], [-30, -170], [10, -176], [44, -160], [64, -134]].map(([dx, dy]) => `<path d="M${x + 12} ${y - 130} Q${x + 12 + dx * 0.5} ${y + dy - 6} ${x + 12 + dx} ${y + dy + 26} Q${x + 12 + dx * 0.4} ${y + dy + 12} ${x + 12} ${y - 124} Z" fill="#36c94a" ${O(3)}/>`).join(''), w: 170, h: 210 };
      if (p.k === 'torch') { const s = `<ellipse cx="${x}" cy="${y + 2}" rx="56" ry="14" fill="url(#${X.K.glowId('#ff5fa2', 'neon')})" opacity=".6"/><circle cx="${x}" cy="${y - 140}" r="54" fill="url(#${X.K.glowId('#ff5fa2', 'neon')})" opacity=".6"/><path d="M${x} ${y} V${y - 120}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x} ${y} V${y - 120}" stroke="#8a8a9a" stroke-width="4.5" stroke-linecap="round"/><rect x="${x - 10}" y="${y - 170}" width="20" height="54" rx="10" fill="#ff8cc6" stroke="${INK}" stroke-width="3.5"/><rect x="${x - 4}" y="${y - 164}" width="6" height="40" rx="3" fill="#ffffff" opacity=".7"/>`; return { s, w: 130, h: 200 }; }
      if (p.k === 'target') return { s: X.C.target(x, y, { ring: '#ff5fa2', fletch: '#ffc83d' }) + `<circle cx="${x}" cy="${y - 82}" r="40" fill="none" stroke="#ffc83d" stroke-width="5"/>`, w: 120, h: 160 };
      return null;
    },
    deco(X) {
      let s = firework(X, 520, 260, 60, '#ff5fa2') + firework(X, 2480, 220, 70, '#ffc83d') + firework(X, 1180, 200, 46, '#5ad1ff') + firework(X, 3220, 300, 50, '#36c94a');
      s += balloon42(X, 1020, 330, 0.9) + balloon42(X, 2560, 300, 0.8, '#ff8cc6');
      X.P(400, 3320, s, 150, 520);
      // лампочки вокруг знамени «В ПОХОД»
      let b = ''; for (let i = 0; i <= 12; i++) { const t = i / 12; b += `<circle cx="${f1(1580 + t * 240)}" cy="524" r="6" fill="${i % 2 ? '#fff6c8' : '#ffc83d'}" stroke="#1c1022" stroke-width="2"/>`; } for (const yy of [548, 572]) b += `<circle cx="1576" cy="${yy}" r="6" fill="#fff6c8" stroke="#1c1022" stroke-width="2"/><circle cx="1824" cy="${yy}" r="6" fill="#fff6c8" stroke="#1c1022" stroke-width="2"/>`;
      X.P(1560, 1840, b + crown(X, 1700, 520, 1.2), 460, 610);
    },
    ground(K, R, L) {   // надувной фламинго, монетки, купюры и конфетти
      const X0 = { O: (w = 3) => `stroke="#1c1022" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`, INK: '#1c1022', mix }, out = [];
      out.push([2330, `<ellipse cx="2330" cy="1300" rx="70" ry="22" fill="#ff8cc6" ${X0.O(3.5)}/><ellipse cx="2330" cy="1298" rx="38" ry="10" fill="#5ad1ff" stroke="#1c1022" stroke-width="2.5"/><path d="M2390 1290 Q2410 1240 2394 1220 Q2384 1212 2376 1222" stroke="#1c1022" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M2390 1290 Q2410 1240 2394 1220 Q2384 1212 2376 1222" stroke="#ff8cc6" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M2376 1222 l-10 6 l10 4" fill="#1c1022"/>`]);
      for (const [x, y, a] of [[700, 1080, 20], [1380, 1300, -14], [2100, 1290, 30], [2900, 1220, -20], [320, 1230, 8], [1600, 1180, 50]]) out.push([x, `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 20}" y="${y - 10}" width="40" height="20" rx="2" fill="#7ac87a" stroke="#1c1022" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#2e6a3a" stroke-width="2"/><text x="${x - 13}" y="${y + 4}" font-family="Arial Black,Impact,sans-serif" font-size="8" fill="#2e6a3a">42</text></g>`]);
      { const r = rng(4242); for (let i = 0; i < 160; i++) { const x = 80 + r() * 3240, y = 830 + r() * 500; out.push([x, `<rect x="${f1(x)}" y="${f1(y)}" width="7" height="4" fill="${['#ff5fa2', '#ffc83d', '#5ad1ff', '#36c94a', '#ffffff'][i % 5]}" transform="rotate(${Math.round(r() * 180)} ${f1(x)} ${f1(y)})"/>`]); } }
      for (const [x, y] of [[560, 1140], [1460, 1110], [1970, 1150], [2700, 1330], [900, 1330], [3060, 1150]]) out.push([x, `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="#ffc83d" stroke="#1c1022" stroke-width="2"/><ellipse cx="${x + 14}" cy="${y + 4}" rx="9" ry="5" fill="#ffc83d" stroke="#1c1022" stroke-width="2"/>`]);
      return out;
    },
  };
  /* ---------- «Чертики»: «Чёртов привал» — пепельная земля с огненными трещинами, вулканы под багровым небом, палатки из тёмной кожи
     с крыльями-фестонами и рожками, котёл с зелёным варевом, вилы на стойке, кучи угля, фонари с зелёным огнём, Пекельная кузня ---------- */
  const horns = (X, cx, y, sp = 26, s = 1, c = '#f2e6c8') => `<path d="M${f1(cx - sp)} ${f1(y)} Q${f1(cx - sp - 14 * s)} ${f1(y - 20 * s)} ${f1(cx - sp - 4 * s)} ${f1(y - 40 * s)} Q${f1(cx - sp + 4 * s)} ${f1(y - 18 * s)} ${f1(cx - sp + 12 * s)} ${f1(y - 4)} Z M${f1(cx + sp)} ${f1(y)} Q${f1(cx + sp + 14 * s)} ${f1(y - 20 * s)} ${f1(cx + sp + 4 * s)} ${f1(y - 40 * s)} Q${f1(cx + sp - 4 * s)} ${f1(y - 18 * s)} ${f1(cx + sp - 12 * s)} ${f1(y - 4)} Z" fill="${c}" ${X.O(3.5)}/>`;
  // крыло нетопыря (фестоны по краю)
  const batWing = (X, x, y, w, dir = 1, c = '#3a1a2a') => { const s2 = dir; return `<path d="M${f1(x)} ${f1(y)} Q${f1(x + s2 * w * 0.4)} ${f1(y - w * 0.5)} ${f1(x + s2 * w)} ${f1(y - w * 0.3)} Q${f1(x + s2 * w * 0.86)} ${f1(y - w * 0.06)} ${f1(x + s2 * w * 0.74)} ${f1(y + w * 0.04)} Q${f1(x + s2 * w * 0.62)} ${f1(y - w * 0.08)} ${f1(x + s2 * w * 0.5)} ${f1(y + w * 0.06)} Q${f1(x + s2 * w * 0.36)} ${f1(y - w * 0.06)} ${f1(x + s2 * w * 0.22)} ${f1(y + w * 0.08)} Z" fill="${c}" ${X.O(3.5)}/><path d="M${f1(x)} ${f1(y)} L${f1(x + s2 * w * 0.74)} ${f1(y - w * 0.2)} M${f1(x)} ${f1(y)} L${f1(x + s2 * w * 0.5)} ${f1(y - w * 0.1)}" stroke="${X.mix(c, '#ffffff', 0.25)}" stroke-width="2.4" fill="none"/>`; };
  const lavaCrack = (x, y, r, seed) => { const g = rng(seed); let d = `M${f1(x)} ${f1(y)}`, cx = x, cy = y; for (let i = 0; i < 4; i++) { cx += (g() - 0.3) * r; cy += (g() - 0.5) * r * 0.3; d += ` L${f1(cx)} ${f1(cy)}`; } return `<path d="${d}" stroke="#2a0d14" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#ff6a1a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#ffe27a" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; };
  THEMES.cherts = {
    line: '#2a0d14', ink: '#2a0d14', sky: 'linear-gradient(#14040a 0%, #3a0a14 45%, #7a1a1a 100%)', moon: '#ff9a6a', stars: '#ffb08a',
    far: { kind: 'volcano', c: ['#2a0a12', '#3a1018', '#4a1a1a'] },
    grass: '#3e2a2c', grass2: '#342226', grassL: '#6a3a32', dirt: '#5a3a34', dirtD: '#3a2224', dirtL: '#7a4a3e', stone: '#5a4a52',
    wood: '#7a4a3a', woodD: '#4a2a22', woodL: '#a86a4a', metal: '#2a2028', glass: '#ffe27a', log: '#6a3a2a',
    canvas: [['#3a1a2a', '#c8202a'], ['#5a2030', '#ffc83d'], ['#2a2028', '#ff6a1a'], ['#7a1a2a', ''], ['#4a2a4a', '#8aff6a']], marquee: ['#3a1a2a', '#c8202a'], pavilion: ['#a3122a', '#2a0d14'],
    kinds: { big: 'bell', mid: 'ridge', small: 'cone' }, beds: ['#c8202a', '#ffc83d', '#8aff6a', '#b06aff'],
    fire: ['#ff4a1a', '#ff9a2a', '#ffe27a'], brew: '#8aff6a', pot: '#2a2028', flags: ['#c8202a', '#ffc83d', '#2a0d14', '#ff6a1a'],
    sign: { bg: '#2a0d14', tx: '#ff9a2a' }, banner: '#c8202a', bannerTx: '#ffe27a',
    names: { storage: 'СКЛАД', anvil: 'ЗАТОЧКА', forge: 'ПЕКЕЛЬНАЯ КУЗНЯ', tent: 'ГАРДЕРОБ', shop: 'ПЕКЕЛЬНЫЕ РЯДЫ', gate: 'В ПОХОД' },
    laundry: [(x, y) => `<path d="M${x - 24} ${y} H${x + 24} L${x + 30} ${y + 50} Q${x} ${y + 40} ${x - 30} ${y + 50} Z" fill="#c8202a" stroke="#2a0d14" stroke-width="2.8"/><path d="M${x - 18} ${y + 6} H${x + 18}" stroke="#ffc83d" stroke-width="3"/>`, 'sock', (x, y) => `<path d="M${x} ${y} V${y + 30} Q${x} ${y + 44} ${x + 10} ${y + 44} L${x + 16} ${y + 36} L${x + 22} ${y + 48} L${x + 24} ${y + 32}" stroke="#2a0d14" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x} ${y} V${y + 30} Q${x} ${y + 44} ${x + 10} ${y + 44}" stroke="#e8455c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M${x + 14} ${y + 32} L${x + 26} ${y + 40} L${x + 14} ${y + 48} Z" fill="#e8455c" stroke="#2a0d14" stroke-width="2"/>`, 'towel', 'sock', 'pants'], wash: ['#c8202a', '#ffc83d', '#2a2028', '#ff6a1a', '#b06aff'],
    smith: { hat: 'bandana' },
    farDraw(X) {   // вулканы с лавой, острые скалы, дым
      const { W } = X; let s = '';
      const vol = (x, y, w, h, c) => `<path d="M${x - w} ${y} L${x - w * 0.18} ${y - h} H${x + w * 0.18} L${x + w} ${y} Z" fill="${c}"/><path d="M${x - w * 0.16} ${y - h} q${w * 0.08} ${h * 0.3} -${w * 0.1} ${h * 0.6} M${x + w * 0.1} ${y - h} q${w * 0.06} ${h * 0.4} ${w * 0.12} ${h * 0.7}" stroke="#ff6a1a" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="${x}" cy="${y - h}" rx="${w * 0.2}" ry="10" fill="#ffb43a"/><path d="M${x - 20} ${y - h - 20} q-30 -50 10 -90 q40 -40 0 -80" stroke="#4a2a32" stroke-width="40" fill="none" stroke-linecap="round" opacity=".6"/>`;
      s += vol(700, 700, 420, 300, '#2a0a12') + vol(2700, 700, 520, 360, '#2a0a12') + vol(1700, 720, 300, 200, '#341016');
      let sp = ''; for (let x = -40, i = 0; x < W + 40; x += 90, i++) { const h = 60 + ((i * 37) % 70); sp += `M${x} 800 L${x + 30} ${780 - h} L${x + 60} 800 Z`; } s += `<path d="${sp}" fill="#3a1018"/>`;
      return s;
    },
    tent(X, t, i, op) {
      if (op.kind === 'bell') { const w = t.w, wh = w * 0.24, ch = w * 0.48, apex = t.y - wh - ch; return { svg: X.C.tentBell(t.x, t.y, w, { ...op, hk: 0.48 }) + horns(X, t.x, apex + 26, 18, 1.2), h: w * 0.9 }; }
      if (op.kind === 'cone') { const w = t.w * 0.8, h = w * 0.95; return { svg: X.C.tentCone(t.x, t.y, w, { ...op, c: '#7a1a2a', s: '#ff6a1a', poles: '#4a2a22' }) + horns(X, t.x, t.y - h + 30, 12, 0.9), h: h + 40 }; }
      const x0 = t.x - t.w / 2, fw = t.w * 0.52, h = t.w * 0.6, sg = t.flip ? -1 : 1, ax = t.x + (x0 + fw / 2 - t.x) * sg;
      return { svg: batWing(X, ax - sg * 6, t.y - h + 30, t.w * 0.42, -sg, '#2a1420') + X.C.tentRidge(t.x, t.y, t.w, { ...op, tie: '#ffc83d' }), h: t.w * 0.8 };
    },
    coneTop: (X, cx, apex) => horns(X, cx, apex + 40, 30, 1.6),
    towerTop: (X, tx, y) => horns(X, tx, y + 34, 22, 1.3) + `<path d="M${tx} ${y} V${y - 46}" stroke="${X.INK}" stroke-width="7" stroke-linecap="round"/><path d="M${tx} ${y} V${y - 46}" stroke="#8a8e9e" stroke-width="3.5"/><path d="M${tx - 12} ${y - 46} V${y - 62} M${tx} ${y - 46} V${y - 66} M${tx + 12} ${y - 46} V${y - 62} M${tx - 12} ${y - 46} H${tx + 12}" stroke="${X.INK}" stroke-width="6" stroke-linecap="round"/><path d="M${tx - 12} ${y - 46} V${y - 62} M${tx} ${y - 46} V${y - 66} M${tx + 12} ${y - 46} V${y - 62} M${tx - 12} ${y - 46} H${tx + 12}" stroke="#c8ccd4" stroke-width="2.5" stroke-linecap="round"/>`,
    fireDeco(X) { const F = X.L.fire; return lavaCrack(F.x - 130, F.y + 54, 50, 3) + lavaCrack(F.x + 90, F.y + 60, 50, 9); },
    goods(X, kind, sx, w, gy) {
      let t = '';
      if (kind === 'food') { for (let k = 0; k < 3; k++) t += `<path d="M${sx + 30 + k * 44} ${gy} q-4 -30 8 -38 q12 8 8 38 Z" fill="#c8202a" ${X.O(2.5)}/><path d="M${sx + 38 + k * 44} ${gy - 38} q2 -8 8 -10" stroke="#4caf50" stroke-width="4" fill="none"/>`; t += `<circle cx="${sx + w - 36}" cy="${gy - 16}" r="16" fill="#2a2028" ${X.O(3)}/><circle cx="${sx + w - 40}" cy="${gy - 20}" r="5" fill="#ff6a1a"/>`; }
      else if (kind === 'potion') for (let k = 0; k < 4; k++) { const px = sx + 24 + k * ((w - 48) / 3), pc = ['#8aff6a', '#ff4a1a', '#b06aff', '#ffc83d'][k]; t += `<path d="M${px - 4} ${gy - 34} V${gy - 24} Q${px - 16} ${gy - 18} ${px - 14} ${gy - 6} Q${px - 12} ${gy} ${px} ${gy} Q${px + 12} ${gy} ${px + 14} ${gy - 6} Q${px + 16} ${gy - 18} ${px + 4} ${gy - 24} V${gy - 34} Z" fill="${pc}" ${X.O(3)}/><rect x="${px - 5}" y="${gy - 40}" width="10" height="7" rx="2" fill="#2a2028" stroke="${X.INK}" stroke-width="2"/><circle cx="${px - 3}" cy="${gy - 12}" r="2.5" fill="#ffffff" opacity=".7"/><circle cx="${px + 4}" cy="${gy - 18}" r="1.8" fill="#ffffff" opacity=".6"/>`; }
      else { t += `<path d="M${sx + 20} ${gy} L${sx + 34} ${gy - 30} L${sx + 64} ${gy - 34} L${sx + 84} ${gy} Z" fill="#2a2028" ${X.O(3)}/><path d="M${sx + 40} ${gy - 18} l10 -4 M${sx + 58} ${gy - 12} l8 -6" stroke="#ff6a1a" stroke-width="4" stroke-linecap="round"/>`; for (let k = 0; k < 3; k++) t += `<path d="M${sx + 110 + k * 22} ${gy} V${gy - 50}" stroke="${X.INK}" stroke-width="6" stroke-linecap="round"/><path d="M${sx + 110 + k * 22} ${gy} V${gy - 50}" stroke="#a86a4a" stroke-width="3"/><path d="M${sx + 102 + k * 22} ${gy - 50} V${gy - 64} M${sx + 110 + k * 22} ${gy - 50} V${gy - 68} M${sx + 118 + k * 22} ${gy - 50} V${gy - 64} M${sx + 102 + k * 22} ${gy - 50} H${sx + 118 + k * 22}" stroke="#c8ccd4" stroke-width="3" stroke-linecap="round"/>`; }
      return t;
    },
    prop(X, p) {
      const x = p.x, y = p.y, { INK, O } = X;
      if (p.k === 'woodpile') { let s = X.sh(x, y + 2, 74, 9) + `<path d="M${x - 72} ${y} Q${x - 60} ${y - 60} ${x} ${y - 70} Q${x + 60} ${y - 60} ${x + 72} ${y} Z" fill="#2a2028" ${O(4)}/>`; for (const [dx, dy] of [[-40, -20], [-10, -44], [24, -28], [46, -12], [-20, -10], [6, -58]]) s += `<path d="M${x + dx - 10} ${y + dy} l8 -10 l12 4 l2 10 l-12 6 Z" fill="#3a3038" stroke="${INK}" stroke-width="2"/><circle cx="${x + dx}" cy="${y + dy}" r="3" fill="#ff6a1a"/>`; return { s, w: 180, h: 100 }; }
      if (p.k === 'torch') { const s = `<ellipse cx="${x}" cy="${y + 2}" rx="60" ry="16" fill="url(#${X.K.glowId('#8aff6a', 'gfire')})" opacity=".5"/><circle cx="${x}" cy="${y - 150}" r="62" fill="url(#${X.K.glowId('#8aff6a', 'gfire')})" opacity=".55"/><path d="M${x} ${y} V${y - 120}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x} ${y} V${y - 120}" stroke="#4a2a22" stroke-width="4.5" stroke-linecap="round"/><path d="M${x - 16} ${y - 120} H${x + 16} L${x + 12} ${y - 166} H${x - 12} Z" fill="#2a2028" ${O(3)}/><path d="M${x - 9} ${y - 124} V${y - 160} H${x + 9} V${y - 124} Z" fill="#8aff6a"/><path d="M${x - 18} ${y - 166} H${x + 18} L${x} ${y - 182} Z" fill="#2a2028" ${O(3)}/>` + horns(X, x, y - 172, 10, 0.5); return { s, w: 140, h: 210 }; }
      if (p.k === 'rack') { let s = X.sh(x, y + 2, 84, 9); const fr = `M${x - 70} ${y} V${y - 100} M${x + 70} ${y} V${y - 100} M${x - 78} ${y - 96} H${x + 78} M${x - 74} ${y - 30} H${x + 74}`; for (let k = -2; k <= 2; k++) { const xx = x + k * 26; s += `<path d="M${xx} ${y - 6} V${y - 150}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${xx} ${y - 6} V${y - 150}" stroke="#a86a4a" stroke-width="4"/><path d="M${xx - 12} ${y - 150} V${y - 176} M${xx} ${y - 150} V${y - 182} M${xx + 12} ${y - 150} V${y - 176} M${xx - 12} ${y - 150} H${xx + 12}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${xx - 12} ${y - 150} V${y - 176} M${xx} ${y - 150} V${y - 182} M${xx + 12} ${y - 150} V${y - 176} M${xx - 12} ${y - 150} H${xx + 12}" stroke="#c8ccd4" stroke-width="3" stroke-linecap="round"/>`; } s += `<path d="${fr}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="${fr}" stroke="#7a4a3a" stroke-width="6.5" stroke-linecap="round"/>`; return { s, w: 300, h: 220 }; }
      if (p.k === 'well') return { s: X.K.put(X.K.def('barrel', () => ''), x, y, 1) + `<ellipse cx="${x}" cy="${y - 90}" rx="24" ry="5" fill="#1a0a10" stroke="${INK}" stroke-width="2"/><circle cx="${x - 6}" cy="${y - 92}" r="5" fill="#2a2028" stroke="${INK}" stroke-width="1.5"/><text x="${x}" y="${y - 40}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="14" fill="#2a0d14">СМОЛА</text>`, w: 100, h: 140 };
      return null;
    },
    ground(K, R, L) {   // огненные трещины и камни-кремни
      const out = [];
      for (const [x, y, r, sd] of [[420, 1300, 70, 1], [1050, 1320, 60, 2], [2330, 1320, 80, 3], [2960, 1310, 70, 4], [140, 1150, 40, 5], [3280, 1170, 40, 6], [860, 960, 50, 7], [2580, 1000, 50, 8], [1460, 1180, 40, 9], [1980, 1200, 40, 10]]) out.push([x, lavaCrack(x, y, r, sd)]);
      return out;
    },
  };
  /* ---------- «Уга-Буги»: «Стойбище» — каменный век: чумы из шкур, хижины из костей мамонта, навесы из веток, пещера-Склад,
     ворота из бивней, нога мамонта на вертеле, каменные таблички, перья на шестах, мамонты и птеродактили вдали ---------- */
  const hide = (X, x, y, w, h, c = '#b8865a') => `<path d="M${f1(x - w / 2)} ${f1(y + h * 0.1)} Q${f1(x - w * 0.6)} ${f1(y - h * 0.3)} ${f1(x - w * 0.36)} ${f1(y - h * 0.5)} Q${f1(x)} ${f1(y - h * 0.38)} ${f1(x + w * 0.36)} ${f1(y - h * 0.5)} Q${f1(x + w * 0.6)} ${f1(y - h * 0.3)} ${f1(x + w / 2)} ${f1(y + h * 0.1)} Q${f1(x + w * 0.3)} ${f1(y + h * 0.5)} ${f1(x)} ${f1(y + h * 0.42)} Q${f1(x - w * 0.3)} ${f1(y + h * 0.5)} ${f1(x - w / 2)} ${f1(y + h * 0.1)} Z" fill="${c}" ${X.O(3)}/><path d="M${f1(x - w * 0.2)} ${f1(y - h * 0.1)} q${f1(w * 0.1)} 6 ${f1(w * 0.2)} 0 M${f1(x - w * 0.1)} ${f1(y + h * 0.16)} q${f1(w * 0.1)} 6 ${f1(w * 0.2)} 0" stroke="${X.mix(c, X.INK, 0.35)}" stroke-width="3" fill="none"/>`;
  const bone = (X, x0, y0, x1, y1, w = 8, c = '#f2e6c8') => { const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w * 0.7, ny = Math.cos(a) * w * 0.7; return `<path d="M${f1(x0)} ${f1(y0)} L${f1(x1)} ${f1(y1)}" stroke="${X.INK}" stroke-width="${w + 5}" stroke-linecap="round"/><path d="M${f1(x0)} ${f1(y0)} L${f1(x1)} ${f1(y1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>` + [[x0, y0], [x1, y1]].map(([x, y]) => `<circle cx="${f1(x + nx)}" cy="${f1(y + ny)}" r="${f1(w * 0.62)}" fill="${c}" stroke="${X.INK}" stroke-width="2.4"/><circle cx="${f1(x - nx)}" cy="${f1(y - ny)}" r="${f1(w * 0.62)}" fill="${c}" stroke="${X.INK}" stroke-width="2.4"/>`).join(''); };
  const tusk = (X, x, y, h, dir = 1, c = '#f2e6c8') => `<path d="M${f1(x - 12)} ${f1(y)} Q${f1(x - 10 + dir * h * 0.1)} ${f1(y - h * 0.7)} ${f1(x + dir * h * 0.42)} ${f1(y - h)} Q${f1(x + dir * h * 0.08)} ${f1(y - h * 0.62)} ${f1(x + 14)} ${f1(y)} Z" fill="${c}" ${X.O(4)}/><path d="M${f1(x - 4)} ${f1(y - 10)} Q${f1(x - 2 + dir * h * 0.06)} ${f1(y - h * 0.6)} ${f1(x + dir * h * 0.32)} ${f1(y - h * 0.92)}" stroke="#ffffff" stroke-width="3" fill="none" opacity=".5"/>`;
  const feathers = (X, x, y, cs = ['#e8453a', '#ffd24a', '#4fc3ff']) => cs.map((c, i) => `<path d="M${f1(x)} ${f1(y)} Q${f1(x - 14 + i * 14)} ${f1(y - 30)} ${f1(x - 10 + i * 10)} ${f1(y - 50)} Q${f1(x + 2 + i * 4)} ${f1(y - 26)} ${f1(x)} ${f1(y)} Z" fill="${c}" stroke="${X.INK}" stroke-width="2.4"/>`).join('');
  THEMES.ugabugi = {
    line: '#2a1a12', ink: '#2a1a12', sky: 'linear-gradient(#1a2440 0%, #3a4a6a 40%, #a8704a 100%)', moon: '', stars: '#fff2d0',
    far: { kind: 'prehistoric', c: ['#2e3448', '#3a3e50', '#4a4a52'] },
    grass: '#5a7a3a', grass2: '#4e6c34', grassL: '#8ab04a', dirt: '#a88a5a', dirtD: '#7a5e3a', dirtL: '#c8a874', stone: '#8a8478',
    wood: '#8a5a32', woodD: '#5a3a1e', woodL: '#b8864a', metal: '#5a5a62', glass: '#ffd76a', log: '#7a4a28',
    canvas: [['#b8865a', '#e8453a'], ['#a8764a', ''], ['#c89a6a', '#4fc3ff'], ['#8a6040', '#ffd24a'], ['#d8b080', '']], marquee: ['#b8865a', '#7a4a28'], pavilion: ['#c89a6a', '#7a4a28'],
    kinds: { big: 'bone', mid: 'cone', small: 'lean' }, beds: ['#c89a6a', '#8a6040', '#e8d0a8', '#7a5a3a'],
    fire: ['#ff7a2a', '#ffb43a', '#fff0a0'], brew: '#c8302a', pot: '#7a4a2a', flags: ['#e8453a', '#ffd24a', '#4fc3ff', '#5ab04a'], noCauldron: true,
    sign: { bg: '#8a8478', tx: '#ffe8b0' }, banner: '#b8865a', bannerTx: '#3a2214',
    names: { storage: 'ПЕЩЕРА', anvil: 'ЗАТОЧКА', forge: 'КУЗНЯ', tent: 'ШКУРЫ', shop: 'МЕНОВЫЕ РЯДЫ', gate: 'В ПОХОД' },
    laundry: [(x, y) => hide(XU, x, y + 24, 46, 46, '#b8865a'), (x, y) => hide(XU, x, y + 22, 40, 40, '#8a6040'), (x, y) => hide(XU, x, y + 24, 46, 46, '#d8b080'), (x, y) => hide(XU, x, y + 22, 40, 40, '#a8764a')], wash: ['#b8865a'],
    // каменная табличка вместо доски
    board: (X, x, y, w, h) => `<path d="M${f1(x + 6)} ${f1(y + 4)} L${f1(x + w * 0.3)} ${f1(y - 2)} L${f1(x + w * 0.7)} ${f1(y + 2)} L${f1(x + w - 4)} ${f1(y - 1)} L${f1(x + w + 4)} ${f1(y + h * 0.5)} L${f1(x + w - 2)} ${f1(y + h + 2)} L${f1(x + w * 0.4)} ${f1(y + h + 4)} L${f1(x - 2)} ${f1(y + h - 2)} L${f1(x - 5)} ${f1(y + h * 0.4)} Z" fill="#8a8478" ${X.O(4)}/><path d="M${f1(x + 10)} ${f1(y + 8)} L${f1(x + w * 0.4)} ${f1(y + 5)}" stroke="#b0aa9c" stroke-width="4" stroke-linecap="round"/><path d="M${f1(x + w - 14)} ${f1(y + h - 6)} l-10 -4 M${f1(x + 16)} ${f1(y + h - 8)} l8 -6" stroke="#5a564e" stroke-width="2.5"/>`,
    farDraw(X) {   // горы, дымящий вулкан, мамонты, птеродактили
      const { W } = X; let s = '';
      s += `<path d="M-40 800 L-40 560 L200 380 L420 560 L640 420 L900 600 L1180 450 L1500 620 L1900 470 L2200 610 L2500 400 L2780 560 L3060 430 L3440 600 L3440 800 Z" fill="#2e3448"/><path d="M200 380 L250 430 L180 440 Z M640 420 L690 470 L610 470 Z M2500 400 L2560 450 L2470 460 Z M3060 430 L3110 480 L3030 480 Z" fill="#c8d0e0" opacity=".8"/>`;
      s += `<path d="M2040 640 L2140 470 H2200 L2300 640 Z" fill="#3a2a2a"/><ellipse cx="2170" cy="470" rx="30" ry="8" fill="#ff7a2a"/><path d="M2160 460 q-30 -40 10 -70 q40 -30 -10 -70" stroke="#5a5060" stroke-width="30" fill="none" stroke-linecap="round" opacity=".6"/>`;
      s += `<path d="M-40 800 L-40 650 Q600 600 1200 660 Q1800 620 2400 660 Q3000 620 3440 650 L3440 800 Z" fill="#3e4a3a"/>`;
      const mam = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})" fill="#26302a"><path d="M-60 0 V-40 Q-60 -80 -10 -84 Q40 -86 54 -56 Q70 -40 66 -10 L62 0 H48 V-24 H-40 V0 Z"/><path d="M54 -56 Q86 -40 78 0 L70 0 Q72 -30 52 -40 Z"/><path d="M70 -36 Q96 -30 92 -6" stroke="#e8dcc0" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
      s += mam(900, 670, 0.6) + mam(1000, 676, 0.45) + mam(2900, 668, 0.55);
      const bird = (x, y) => `<path d="M${x - 30} ${y} Q${x - 14} ${y - 14} ${x} ${y} Q${x + 14} ${y - 14} ${x + 30} ${y} M${x} ${y} l10 -4" stroke="#26302a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      s += bird(1300, 300) + bird(1380, 330) + bird(2600, 260);
      return s;
    },
    tent(X, t, i, op) {
      const { INK, O } = X;
      if (op.kind === 'cone') { const w = t.w * 0.8, h = w * 0.95; return { svg: X.C.tentCone(t.x, t.y, w, { ...op, c: ['#b8865a', '#a8764a', '#c89a6a'][i % 3], s: ['#e8453a', '#4fc3ff', '#ffd24a'][i % 3], poles: '#c8a070' }) + feathers(X, t.x - 10, t.y - h - 6), h: h + 60 }; }
      if (op.kind === 'lean') {   // шалаш из шкур на жердях: двускатный, поверх — ветки, на коньке — кость
        const h = t.w * 0.6, x0 = t.x - t.w / 2, fw = t.w * 0.52, sg = t.flip ? -1 : 1, ax = t.x + (x0 + fw / 2 - t.x) * sg;
        let s = X.C.tentRidge(t.x, t.y, t.w, { ...op, c: ['#b8865a', '#c89a6a'][i % 2], s: '', pole: '#c8a070', tie: '#7a4a28' });
        let br = ''; for (let k = 0; k < 4; k++) { const yy = t.y - h * (0.2 + k * 0.2); br += `M${f1(ax - sg * 10)} ${f1(yy)} l${f1(sg * t.w * 0.5)} ${f1(-8 + k * 2)}`; }
        s += `<path d="${br}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${br}" stroke="#7a5a32" stroke-width="3.5" stroke-linecap="round"/>` + bone(X, ax - 20, t.y - h - 4, ax + 20, t.y - h - 4, 7);
        return { svg: s, h: t.w * 0.8 };
      }
      // хижина из костей мамонта: купол из шкур, по бокам — бивни, сверху — кости
      const w = t.w * 0.9, rw = w / 2, h = w * 0.6, x = t.x, y = t.y; let s = X.sh(x, y + 2, rw * 1.1, w * 0.08);
      s += `<path d="M${x - rw} ${y} Q${x - rw} ${y - h * 1.25} ${x} ${y - h * 1.3} Q${x + rw} ${y - h * 1.25} ${x + rw} ${y} Q${x} ${y + 10} ${x - rw} ${y} Z" fill="#a8764a" ${O(4.5)}/>`;
      for (const k of [-0.6, -0.2, 0.2, 0.6]) s += `<path d="M${f1(x + k * rw)} ${f1(y - h * 1.1 * (1 - Math.abs(k) * 0.5))} q${f1(rw * 0.12)} ${f1(h * 0.2)} 0 ${f1(h * 0.4)}" stroke="#7a5230" stroke-width="3" fill="none"/>`;
      s += bone(X, x - rw * 0.7, y - h * 0.9, x + rw * 0.7, y - h * 0.9, 9) + bone(X, x - rw * 0.4, y - h * 1.24, x + rw * 0.4, y - h * 1.24, 8);
      s += tusk(X, x - rw - 4, y, h * 1.1, 1) + tusk(X, x + rw + 4, y, h * 1.1, -1);
      const dw = w * 0.16, dh = h * 0.7;
      s += `<path d="M${f1(x - dw)} ${f1(y + 2)} Q${f1(x - dw)} ${f1(y - dh)} ${f1(x)} ${f1(y - dh)} Q${f1(x + dw)} ${f1(y - dh)} ${f1(x + dw)} ${f1(y + 2)} Z" fill="${X.mix(INK, '#a8764a', 0.12)}" stroke="${INK}" stroke-width="3"/><path d="M${f1(x - dw * 0.7)} ${f1(y - 4)} Q${f1(x)} ${f1(y - 18)} ${f1(x + dw * 0.7)} ${f1(y - 4)}" fill="#e8d0a8" stroke="${INK}" stroke-width="2"/>`;
      return { svg: s, h: h * 1.4 + 20 };
    },
    coneTop: (X, cx, apex) => feathers(X, cx, apex - 10, ['#e8453a', '#ffd24a', '#4fc3ff']) + bone(X, cx - 40, apex + 30, cx + 40, apex + 30, 8),
    towerTop: (X, tx, y) => `<path d="M${tx} ${y} V${y - 24}" stroke="${X.INK}" stroke-width="6" stroke-linecap="round"/>` + feathers(X, tx, y - 20),
    fireDeco(X) {   // нога мамонта на вертеле: две рогатины и жердь
      const F = X.L.fire, y = F.y - 70; let s = bone(X, F.x - 110, F.y + 20, F.x - 96, y - 4, 10, '#8a5a32') + bone(X, F.x + 110, F.y + 20, F.x + 96, y - 4, 10, '#8a5a32');
      s += `<path d="M${F.x - 130} ${y} H${F.x + 130}" stroke="${X.INK}" stroke-width="12" stroke-linecap="round"/><path d="M${F.x - 130} ${y} H${F.x + 130}" stroke="#b8864a" stroke-width="6" stroke-linecap="round"/>`;
      s += `<path d="M${F.x - 60} ${y} Q${F.x - 66} ${y - 40} ${F.x - 10} ${y - 44} Q${F.x + 46} ${y - 40} ${F.x + 40} ${y} Q${F.x + 30} ${y + 30} ${F.x - 10} ${y + 34} Q${F.x - 56} ${y + 30} ${F.x - 60} ${y} Z" fill="#a8482a" ${X.O(4)}/><path d="M${F.x - 40} ${y - 20} q20 -10 40 -6" stroke="#d87a4a" stroke-width="5" fill="none" stroke-linecap="round"/>` + bone(X, F.x + 40, y, F.x + 84, y - 4, 12);
      return s;
    },
    goods(X, kind, sx, w, gy) {
      let t = '';
      if (kind === 'food') { t += `<path d="M${sx + 20} ${gy} Q${sx + 18} ${gy - 30} ${sx + 50} ${gy - 32} Q${sx + 80} ${gy - 30} ${sx + 76} ${gy} Z" fill="#a8482a" ${X.O(3)}/>` + bone(X, sx + 72, gy - 14, sx + 96, gy - 22, 8); for (let k = 0; k < 6; k++) t += `<circle cx="${sx + 120 + (k % 3) * 14}" cy="${gy - 8 - Math.floor(k / 3) * 12}" r="7" fill="${k % 2 ? '#8a3aa8' : '#c8202a'}" stroke="${X.INK}" stroke-width="2"/>`; t += `<ellipse cx="${sx + w - 30}" cy="${gy - 14}" rx="12" ry="15" fill="#f6eedc" ${X.O(2.5)}/>`; }
      else if (kind === 'potion') for (let k = 0; k < 4; k++) { const px = sx + 26 + k * ((w - 52) / 3); t += `<path d="M${px - 10} ${gy - 40} H${px + 10} L${px + 8} ${gy - 30} Q${px + 18} ${gy - 18} ${px + 14} ${gy - 4} Q${px} ${gy + 2} ${px - 14} ${gy - 4} Q${px - 18} ${gy - 18} ${px - 8} ${gy - 30} Z" fill="#b8704a" ${X.O(3)}/><path d="M${px - 12} ${gy - 20} q12 6 24 0" stroke="#e8c49a" stroke-width="3" fill="none"/><path d="M${px - 4} ${gy - 40} q-4 -12 4 -16 q6 6 2 16" fill="#5ab04a" stroke="${X.INK}" stroke-width="2"/>`; }
      else { for (let k = 0; k < 3; k++) t += `<path d="M${sx + 20 + k * 30} ${gy} L${sx + 26 + k * 30} ${gy - 26} L${sx + 40 + k * 30} ${gy - 32} L${sx + 46 + k * 30} ${gy} Z" fill="${['#5a5a62', '#8a8478', '#3a3a42'][k]}" ${X.O(2.5)}/>`; t += bone(X, sx + 120, gy - 10, sx + 170, gy - 18, 9) + bone(X, sx + 124, gy - 30, sx + 166, gy - 26, 8); }
      return t;
    },
    b: {
      // Склад — пещера в скале: тёмный вход, шкуры и камни, рисунки на скале
      storage(X) {
        const { INK, O, BASE } = X, cx = 320; let s = X.sh(cx, BASE + 6, 260, 16);
        s += `<path d="M70 ${BASE + 10} L90 640 L170 560 L260 520 L380 530 L470 580 L540 660 L570 ${BASE + 10} Z" fill="#7a746a" ${O(5)}/><path d="M120 640 L180 580 L250 556 M400 560 L470 610" stroke="#a8a294" stroke-width="7" stroke-linecap="round"/><path d="M90 720 L140 700 M500 700 L540 730" stroke="#5a564e" stroke-width="4"/>`;
        s += `<path d="M${cx - 110} ${BASE + 6} Q${cx - 120} 640 ${cx} 620 Q${cx + 120} 640 ${cx + 110} ${BASE + 6} Z" fill="#1e1612" ${O(4)}/>`;
        s += `<g stroke="#c8402a" stroke-width="4" fill="none" stroke-linecap="round"><path d="M160 690 h30 M175 690 v-14 M150 704 l10 -6 l10 6 M200 704 l-10 -6"/><path d="M460 650 q10 -12 20 0 q10 12 20 0"/></g>`;
        s += hide(X, cx - 50, BASE - 30, 70, 56, '#b8865a') + hide(X, cx + 40, BASE - 24, 66, 50, '#8a6040') + `<ellipse cx="${cx + 4}" cy="${BASE - 4}" rx="26" ry="16" fill="#8a8478" ${O(3)}/>` + bone(X, cx - 90, BASE - 6, cx - 40, BASE - 14, 8);
        s += X.sign(cx, 584, X.TH.names.storage, 26);
        X.P(40, 620, `<g data-ol="storage">${s}</g>`, 480, BASE + 50);
      },
      // Ворота — арка из двух бивней мамонта над проходом, на ремнях — шкура «В ПОХОД», по бокам — каменные столбы с черепами-тотемами
      gate(X) {
        const { INK, O, BASE, TH } = X, cx = 1700; let s = '';
        for (const sx of [1560, 1840]) { s += X.sh(sx, BASE + 6, 70, 10) + `<path d="M${sx - 46} ${BASE + 6} L${sx - 40} 560 L${sx - 10} 530 H${sx + 14} L${sx + 42} 566 L${sx + 46} ${BASE + 6} Z" fill="#8a8478" ${O(5)}/><path d="M${sx - 30} 600 h20 M${sx + 6} 660 h22 M${sx - 24} 720 h18" stroke="#5a564e" stroke-width="4"/>`;
          s += `<circle cx="${sx}" cy="${510}" r="34" fill="#f2e6c8" ${O(4)}/><circle cx="${sx - 12}" cy="506" r="9" fill="${INK}"/><circle cx="${sx + 12}" cy="506" r="9" fill="${INK}"/><path d="M${sx - 10} 528 h20" stroke="${INK}" stroke-width="4"/>` + feathers(X, sx, 482);
          s += `<circle cx="${sx}" cy="610" r="46" fill="url(#${X.K.glowId(TH.fire[1], 'cfg')})" opacity=".7"/>` + X.C.flame(sx, 620, 0.32, { fire: TH.fire }); }
        s += tusk(X, 1600, 600, 268, 1) + tusk(X, 1800, 600, 268, -1);
        s += `<path d="M1640 330 Q1700 300 1760 330" stroke="${INK}" stroke-width="10" fill="none"/><path d="M1640 330 Q1700 300 1760 330" stroke="#8a5a32" stroke-width="5" fill="none"/>`;
        s += `<path d="M1628 350 L1620 330 M1772 350 L1780 330" stroke="#8a5a32" stroke-width="4"/>`;
        s += `<path d="M${cx - 110} 352 H${cx + 110} Q${cx + 124} 400 ${cx + 104} 432 Q${cx} 446 ${cx - 104} 432 Q${cx - 124} 400 ${cx - 110} 352 Z" fill="#c89a6a" ${O(4)}/>` + X.txt(cx, 408, TH.names.gate, 30, '#3a2214', 0.01).replace('stroke-width="0.01"', 'stroke-width="0"');
        X.signs.push({ t: TH.names.gate, r: [cx - 110, 352, cx + 110, 446] });
        X.P(1450, 1950, `<g data-ol="gate">${s}</g>`, 280, BASE + 40);
      },
    },
    prop(X, p) {
      const x = p.x, y = p.y, { INK, O } = X;
      if (p.k === 'torch') return { s: `<ellipse cx="${x}" cy="${y + 2}" rx="60" ry="16" fill="url(#${X.K.glowId(X.TH.fire[1], 'cfg')})" opacity=".55"/><circle cx="${x}" cy="${y - 140}" r="66" fill="url(#${X.K.glowId(X.TH.fire[1], 'cfg')})" opacity=".6"/>` + bone(X, x, y, x, y - 120, 10, '#f2e6c8') + `<path d="M${x - 12} ${y - 118} Q${x} ${y - 132} ${x + 12} ${y - 118} L${x + 8} ${y - 104} H${x - 8} Z" fill="#8a5a32" stroke="${INK}" stroke-width="2.5"/>` + X.C.flame(x, y - 126, 0.32, { fire: X.TH.fire }), w: 150, h: 220 };
      if (p.k === 'flag') return { s: X.sh(x, y + 2, 12, 4) + `<path d="M${x} ${y} V${y - 140}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x} ${y} V${y - 140}" stroke="#8a5a32" stroke-width="4" stroke-linecap="round"/>` + feathers(X, x, y - 136), w: 80, h: 200 };
      if (p.k === 'rack') { let s = X.sh(x, y + 2, 84, 9); for (const [dx, k] of [[-46, 'spear'], [-14, 'club'], [16, 'spear'], [46, 'club']]) { const xx = x + dx; s += k === 'spear' ? `<path d="M${xx} ${y - 6} V${y - 150}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${xx} ${y - 6} V${y - 150}" stroke="#b8864a" stroke-width="4"/><path d="M${xx - 8} ${y - 148} L${xx} ${y - 178} L${xx + 8} ${y - 148} Z" fill="#5a5a62" stroke="${INK}" stroke-width="2.5"/>` : `<path d="M${xx - 4} ${y - 10} L${xx - 12} ${y - 120} Q${xx} ${y - 140} ${xx + 12} ${y - 120} L${xx + 4} ${y - 10} Z" fill="#8a5a32" stroke="${INK}" stroke-width="3"/><path d="M${xx - 8} ${y - 90} l-8 -4 M${xx + 8} ${y - 106} l8 -4" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`; } const fr = `M${x - 70} ${y} V${y - 100} M${x + 70} ${y} V${y - 100} M${x - 78} ${y - 96} H${x + 78}`; s += `<path d="${fr}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="${fr}" stroke="#8a5a32" stroke-width="6.5" stroke-linecap="round"/>`; return { s, w: 300, h: 220 }; }
      if (p.k === 'well') return { s: X.sh(x, y + 2, 40, 8) + `<path d="M${x - 20} ${y - 70} H${x + 20} L${x + 16} ${y - 58} Q${x + 40} ${y - 40} ${x + 34} ${y - 12} Q${x} ${y + 4} ${x - 34} ${y - 12} Q${x - 40} ${y - 40} ${x - 16} ${y - 58} Z" fill="#b8704a" ${O(4)}/><path d="M${x - 30} ${y - 34} q30 12 60 0" stroke="#e8c49a" stroke-width="4" fill="none"/><ellipse cx="${x}" cy="${y - 70}" rx="20" ry="5" fill="#5ab0ff" stroke="${INK}" stroke-width="2"/>`, w: 100, h: 110 };
      if (p.k === 'hitch') { let s = X.sh(x, y + 2, 110, 10) + bone(X, x - 90, y, x - 84, y - 100, 9, '#8a5a32') + bone(X, x + 90, y, x + 84, y - 100, 9, '#8a5a32') + `<path d="M${x - 100} ${y - 96} H${x + 100}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${x - 100} ${y - 96} H${x + 100}" stroke="#b8864a" stroke-width="5" stroke-linecap="round"/>`; s += hide(X, x - 40, y - 60, 60, 60, '#b8865a') + hide(X, x + 40, y - 56, 54, 52, '#d8b080'); return { s, w: 260, h: 150 }; }
      if (p.k === 'woodpile') { let s = X.C.woodpile(x, y); s += bone(X, x - 60, y - 84, x + 40, y - 94, 8); return { s, w: 220, h: 150 }; }
      return null;
    },
    ground(K, R, L) {   // кости, следы, камни
      const out = [];
      for (const [x, y, a] of [[420, 1300, 10], [1050, 1320, -20], [2330, 1320, 30], [2960, 1310, -10], [860, 960, 0], [2580, 1000, 20], [1460, 1180, -30]]) out.push([x, `<g transform="rotate(${a} ${x} ${y})">${bone(XU, x - 24, y, x + 24, y, 7)}</g>`]);
      for (const [x, y] of [[1840, 1250], [1880, 1290], [1920, 1250]]) out.push([x, `<g fill="#7a5e3a" opacity=".7"><ellipse cx="${x}" cy="${y}" rx="11" ry="7"/><circle cx="${x - 8}" cy="${y - 8}" r="3"/><circle cx="${x}" cy="${y - 11}" r="3"/><circle cx="${x + 8}" cy="${y - 8}" r="3"/></g>`]);
      return out;
    },
  };
  const XU = { O: (w = 3) => `stroke="#2a1a12" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`, INK: '#2a1a12', mix };
  const themeOf = (style) => THEMES[style] || THEMES.legion;

  // набор деталей (fairKit): один на стиль
  const KITS = {};
  function kitOf(style, TH) {
    if (KITS[style]) return KITS[style];
    const F = root.MDDoodle && root.MDDoodle.fairKit;
    if (!F) return null;
    return (KITS[style] = F({ id: 'cp' + String(style).replace(/[^a-z0-9]/gi, '').slice(0, 4), line: TH.line, ink: TH.ink, glass: TH.glass, metal: TH.metal, wood: TH.wood, woodD: TH.woodD, woodL: TH.woodL,
      bark: TH.bark || TH.woodD, leaf: TH.leaf || '#2f5a46', leafD: TH.leafD || '#1f4032', leafL: TH.leafL || '#4a7e5e', pave: TH.pave, roofs: TH.roofs }));
  }

  /* ================= рисунок ================= */
  function draw(L, style, o) {
    o = o || {};
    const TH = themeOf(style), K = kitOf(style, TH);
    if (!K || !K.camp) throw new Error('нет набора деталей (styles/legion/fair.js)');
    const C = K.camp, W = L.W, H = L.H, BASE = L.BASE, INK = TH.ink, LN = TH.line;
    const O = (w = 4.5) => `stroke="${LN}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const R = rng(0xca3b);
    const pieces = [], props = [], signs = [];
    const P = (x0, x1, svg, y0 = 0, y1 = H) => pieces.push({ x0: x0 - 4, x1: x1 + 4, y0, y1, svg });
    const prop = (x, y, w, h, z, svg, ex) => props.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z: Math.round(z), svg: () => svg, ...(ex || {}) });
    const txt = (x, y, t, size, fill, sw) => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="${fill}" stroke="${INK}" stroke-width="${sw || Math.max(3, size / 7).toFixed(1)}" paint-order="stroke" letter-spacing="1.5">${t}</text>`;
    // вывеска-доска с надписью (в рамке); r - рамка для проверок (ярлык «Города» её не закрывает)
    const sign = (cx, cy, t, size = 26, o2 = {}) => {
      const w = Math.max(120, t.length * size * 0.72 + 44), h = size + 26, x = cx - w / 2, y = cy - h / 2, S = TH.sign;
      signs.push({ t, r: [x, y, x + w, y + h] });
      return (o2.ropes ? `<path d="M${f1(x + 24)} ${f1(o2.ropes)} V${f1(y + 4)} M${f1(x + w - 24)} ${f1(o2.ropes)} V${f1(y + 4)}" stroke="${INK}" stroke-width="3.5"/>` : '')
        + (TH.board ? TH.board(X, x, y, w, h) : K.board(x, y, w, h, S.bg, INK)) + txt(cx, cy + size * 0.36, t, size, S.tx);
    };
    const sh = (x, y, rx, ry, a = 0.3) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${INK}" opacity="${a}"/>`;
    // всё нужное «своему» рисунку стиля (темы ниже могут заменить здание, палатку, даль, предмет или добавить свои мелочи)
    const X = { K, C, TH, L, O, txt, sign, sh, mix, f1, R, rng, BASE, W, H, INK, LN, P, prop, signs, o };

    /* ---------- небо и даль ---------- */
    {
      let s = '';
      // звёзды
      if (TH.stars) { let st = ''; for (let i = 0; i < 70; i++) { const x = R() * W, y = 170 + R() * 330, r = 1 + R() * 2.2; st += `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`; } s += `<path d="${st}" fill="${TH.stars}" opacity=".8"/>`; }
      if (TH.moon) s += `<circle cx="2930" cy="290" r="96" fill="url(#${K.glowId(TH.moon, 'moon')})" opacity=".55"/><circle cx="2930" cy="290" r="54" fill="${TH.moon}" ${O(4)}/><circle cx="2912" cy="276" r="9" fill="${mix(TH.moon, INK, 0.12)}"/><circle cx="2948" cy="304" r="6" fill="${mix(TH.moon, INK, 0.12)}"/>`;
      // даль: холмы в три плана, дорога из ворот расходится на три стороны (своя даль стиля - TH.farDraw)
      // X.hills(F) - общая даль (холмы, дорога из ворот, деревья); своя даль стиля может её позвать и дорисовать своё
      X.hills = (F) => {
        const hill = (y0, amp, c, seed) => { const r = rng(seed); let d = `M-40 ${H} L-40 ${y0}`; for (let x = -40; x <= W + 80; x += 160) d += ` Q${f1(x + 80)} ${f1(y0 - amp * (0.4 + r()))} ${f1(x + 160)} ${f1(y0 - amp * r() * 0.5)}`; return `<path d="${d} L${W + 80} ${H} Z" fill="${c}"/>`; };
        let g = hill(520, 120, F.c[0], 11) + hill(590, 90, F.c[1], 23);
        // дорога за воротами: от ворот вглубь и на три стороны
        g += `<path d="M1700 790 Q1690 690 1700 640 M1700 640 Q1500 600 1180 560 M1700 640 Q1720 590 1760 540 M1700 640 Q1960 610 2300 572" stroke="${mix(F.c[1], '#ffffff', 0.12)}" stroke-width="18" fill="none" stroke-linecap="round"/>`;
        g += hill(660, 60, F.c[2], 37);
        // деревья вдали (силуэты)
        if (F.tree) { let tr = ''; for (let i = 0; i < 26; i++) { const x = (i * 131 + R() * 80) % W, y = 600 + R() * 50, r = 18 + R() * 16; tr += `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r * 1.15)} 0 1 1 ${f1(2 * r)} 0Z`; } g += `<path d="${tr}" fill="${F.tree}"/>`; }
        return g;
      };
      s += TH.farDraw ? TH.farDraw(X) : X.hills(TH.far);
      P(0, W, s, 160, 800);
    }
    // задний частокол (за зданиями), с промежутком у ворот
    if (TH.backFence) TH.backFence(X);
    else { P(0, 1520, C.stakes(10, 1510, 800, 150, { dark: true }), 620, 810); P(1880, W, C.stakes(1890, W - 10, 800, 150, { dark: true }), 620, 810); }

    /* ---------- земля ---------- */
    // крупное (вытоптанное, тропы, свет костра) - в каждом куске целиком; мелочь (пятна, камешки, пучки травы) - только в своём куске
    {
      const G = 760, items = [];
      let big = '';
      let pa = [], pb = []; for (let i = 0; i < 46; i++) { const x = R() * W, y = G + 40 + R() * (H - G - 40), d = K.blob(x, y, 60 + R() * 120, 18 + R() * 30, R, 8, 0.25); (i % 2 ? pa : pb).push([x, d]); }
      const band = K.smooth([[60, 806], [600, 798], [1200, 812], [1700, 802], [2300, 812], [2900, 800], [3340, 812], [3340, 912], [2900, 946], [2300, 900], [1700, 930], [1200, 940], [600, 900], [60, 902]]);
      big += `<path d="${band}" fill="${TH.dirt}"/><path d="${K.blob(L.fire.x, L.fire.y + 10, 430, 175, rng(5), 12, 0.08)}" fill="${TH.dirt}"/>`;
      big += `<path d="${K.blob(L.fire.x, L.fire.y + 10, 300, 115, rng(6), 12, 0.08)}" fill="${TH.dirtL}" opacity=".45"/>`;
      const tr = (L.trail || []).map((seg) => 'M' + seg.map((p) => `${p[0]} ${p[1]}`).join(' L')).join(' ');
      big += TH.trail ? TH.trail(tr, X) : `<path d="${tr}" stroke="${TH.dirt}" stroke-width="74" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${tr}" stroke="${TH.dirtL}" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
      const glow = `<ellipse cx="${L.fire.x}" cy="${L.fire.y}" rx="560" ry="210" fill="url(#${K.glowId(TH.fire[1], 'cfg')})" opacity=".42"/>`;
      const stones = []; for (let i = 0; i < 90; i++) { const x = 80 + R() * (W - 160), y = 820 + R() * 500, r = 3 + R() * 5; stones.push([x, `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r * 0.7)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r * 0.7)} 0 1 0 ${f1(-2 * r)} 0`]); }
      const tuft = K.def('tuft' + TH.grassL.slice(1), () => `<path d="M-14 0 Q-12 -14 -18 -24 M-6 0 Q-6 -18 -2 -30 M4 0 Q6 -16 14 -22 M10 0 Q14 -10 22 -12" stroke="${TH.grassL}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
      const tufts = []; for (let i = 0; i < 150; i++) { const x = R() * W, y = 830 + R() * 560; if (Math.hypot((x - L.fire.x) / 460, (y - L.fire.y) / 190) < 1) continue; tufts.push([x, K.put(tuft, x, y, 0.7 + R() * 0.6)]); }
      if (TH.ground) items.push(...TH.ground(K, R, L));   // своя мелочь стиля на земле: [[x, svg], …]
      const inX = (a, b) => (q) => q[0] > a - 160 && q[0] < b + 160;
      for (let x = 0; x < W; x += 1000) {
        const x1 = Math.min(W, x + 1000), f = inX(x, x1);
        const body = `<rect x="${x}" y="${G}" width="${x1 - x}" height="${H - G}" fill="${TH.grass}"/><path d="${pa.filter(f).map((q) => q[1]).join(' ')}" fill="${TH.grass2}" opacity=".8"/><path d="${pb.filter(f).map((q) => q[1]).join(' ')}" fill="${TH.grassL}" opacity=".35"/>`
          + big + `<path d="${stones.filter(f).map((q) => q[1]).join('')}" fill="${TH.dirtD}" opacity=".55"/>` + tufts.filter(f).map((q) => q[1]).join('') + items.filter(f).map((q) => q[1]).join('') + glow;
        P(x, x1, `<svg x="${x}" y="${G}" width="${x1 - x}" height="${H - G}" viewBox="${x} ${G} ${x1 - x} ${H - G}" overflow="hidden">${body}</svg>`, G, H);
      }
    }
    // боковой частокол (в перспективе: колья по краю, чем ниже - тем крупнее)
    if (TH.sideFence) TH.sideFence(X); else {
      let l = '', r = '';
      for (let y = 790, i = 0; y < H + 40; y += 30, i++) { const k = 0.85 + (y - 790) / 900; l += K.put(K.def('stake', () => ''), 26 + (i % 2) * 6, y, k, k); r += K.put(K.def('stake', () => ''), W - 26 - (i % 2) * 6, y, k, k); }
      P(0, 80, l, 640, H); P(W - 80, W, r, 640, H);
    }

    /* ---------- здания заднего ряда ---------- */
    const B = (id) => L.BUILDINGS.find((b) => b.id === id);
    const NM = TH.names;
    // Склад: большая палатка-«марки» (каркасная), полог открыт - внутри полки с ящиками и мешками; снаружи - штабель, бочки, тачка
    if (TH.b && TH.b.storage) TH.b.storage(X);
    else {
      const b = B('storage'), x0 = 120, x1 = 540, cx = (x0 + x1) / 2, eave = 668, apex = 528, [mc, ms] = TH.marquee;
      let s = sh(cx, BASE + 4, 250, 16);
      // стены
      s += `<path d="M${x0 + 18} ${eave} V${BASE} H${x1 - 18} V${eave} Z" fill="${mix(mc, INK, 0.12)}" ${O()}/>`;
      for (let x = x0 + 50; x < x1 - 40; x += 64) s += `<path d="M${x} ${eave + 8} V${BASE - 4}" stroke="${mix(mc, INK, 0.3)}" stroke-width="2.5" opacity=".7"/>`;
      // вход: внутри полки
      const dx0 = cx - 70, dx1 = cx + 70;
      s += `<path d="M${dx0} ${BASE} V${eave + 18} Q${cx} ${eave - 6} ${dx1} ${eave + 18} V${BASE} Z" fill="${mix(INK, mc, 0.12)}" stroke="${INK}" stroke-width="3"/>`;
      s += `<path d="M${dx0 + 10} ${BASE - 70} H${dx1 - 10} M${dx0 + 10} ${eave + 56} H${dx1 - 10}" stroke="${TH.woodD}" stroke-width="7"/>`;
      s += K.put(K.def('crate', () => ''), cx - 34, BASE - 74, 0.5) + K.put(K.def('crate', () => ''), cx + 4, BASE - 74, 0.5) + K.put(K.def('barrel', () => ''), cx + 40, BASE - 74, 0.42) + K.put(K.def('crate', () => ''), cx - 30, eave + 52, 0.42) + K.put(K.def('barrel', () => ''), cx + 20, eave + 52, 0.36);
      s += C.sacks(cx, BASE - 2, { c: '#c8a46a' });
      // подвязанные полотнища
      s += `<path d="M${dx0} ${eave + 18} Q${dx0 - 26} ${eave + 70} ${dx0 - 12} ${BASE} H${dx0 - 40} Q${dx0 - 44} ${eave + 60} ${dx0 - 8} ${eave + 10} Z" fill="${mc}" stroke="${INK}" stroke-width="3"/><path d="M${dx1} ${eave + 18} Q${dx1 + 26} ${eave + 70} ${dx1 + 12} ${BASE} H${dx1 + 40} Q${dx1 + 44} ${eave + 60} ${dx1 + 8} ${eave + 10} Z" fill="${mc}" stroke="${INK}" stroke-width="3"/>`;
      // крыша: двускатный фронтон в полоску
      const roof = `M${cx} ${apex} L${x0 - 6} ${eave + 4} H${x1 + 6} Z`;
      s += `<path d="${roof}" fill="${mc}" ${O()}/>`;
      if (ms) { const n = 9, a0 = x0 - 6, a1 = x1 + 6; for (let k = 1; k < n; k += 2) s += `<path d="M${cx} ${apex + 4} L${f1(a0 + (a1 - a0) * k / n)} ${eave + 4} L${f1(a0 + (a1 - a0) * (k + 1) / n)} ${eave + 4} Z" fill="${ms}"/>`; s += `<path d="${roof}" fill="none" ${O()}/>`; }
      let fs = ''; for (let i = 0, n = 12; i < n; i++) { const a = x0 - 4 + (i + 0.5) * (x1 - x0 + 8) / n; fs += `<path d="M${f1(a - 18)} ${eave} Q${f1(a)} ${eave + 24} ${f1(a + 18)} ${eave} Z" fill="${i % 2 ? (ms || mc) : mc}" stroke="${INK}" stroke-width="2.5"/>`; }
      s += fs + `<path d="M${cx - 8} ${apex + 16} L${x0 + 30} ${eave - 6}" stroke="#ffffff" stroke-width="5" opacity=".25" stroke-linecap="round"/>`;
      s += `<path d="M${cx} ${apex} V${apex - 30}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${cx} ${apex} V${apex - 30}" stroke="${TH.woodL}" stroke-width="4"/><path d="M${cx} ${apex - 30} l34 8 l-34 10 Z" fill="${TH.banner}" stroke="${INK}" stroke-width="2.5"/>`;
      s += C.peg(x0 - 4, eave + 2, x0 - 60, BASE - 4) + C.peg(x1 + 4, eave + 2, x1 + 60, BASE - 4);
      // снаружи: штабель ящиков, бочки, тачка
      s += C.crates(x0 + 2, BASE + 18) + K.put(K.def('barrel', () => ''), x1 + 10, BASE + 22, 0.8) + K.put(K.def('barrel', () => ''), x1 - 40, BASE + 26, 0.7);
      s += sign(cx, eave - 38, NM.storage, 26);
      P(x0 - 80, x1 + 80, `<g data-ol="storage">${s}</g>`, apex - 50, BASE + 40);
    }
    // 26.10 (решение стримера): Заточки в лагере нет (откроется в городе канала после пролога). На её месте между Складом и Кузней -
    // палатка снабжения (декорация заднего ряда, в неё не заходят): палатка стиля, ящики и бочки
    {
      const t = { x: 762, y: 796, w: 210, d: 0, k: 'mid', flip: true }, [c, st] = TH.canvas[3 % TH.canvas.length];
      const op = { c, s: st, flip: true, open: true, bed: TH.beds[1 % TH.beds.length], kind: TH.kinds.mid || 'ridge' };
      const own = TH.tent && TH.tent(X, t, 3, op);
      let s = own ? (own.svg || own) : op.kind === 'bell' ? C.tentBell(t.x, t.y, t.w, { ...op, hk: 0.48 }) : op.kind === 'cone' ? C.tentCone(t.x, t.y, t.w * 0.8, op) : C.tentRidge(t.x, t.y, t.w, op);
      // 29.10: у коробки-палатки (котики) ящиков справа нет - они налезали на её бок и на столб Когтекузни
      s += K.put(K.def('barrel', () => ''), 650, 812, 0.7) + (op.kind === 'box' ? '' : K.put(K.def('crate', () => ''), 870, 816, 0.7) + K.put(K.def('crate', () => ''), 852, 768, 0.55));
      P(560, 960, s, 540, 840);
    }
    // Кузня: открытый навес на столбах (полотно в полоску), каменный горн с трубой, меха, инструмент, оружие на стенке
    if (TH.b && TH.b.forge) TH.b.forge(X);
    else {
      const x0 = 890, x1 = 1290, cx = (x0 + x1) / 2, top = 520, eave = 610;
      let s = sh(cx, BASE + 4, 230, 14);
      // задняя стенка - полотно
      const [fc, fs] = TH.canvas[1];
      s += `<path d="M${x0 + 20} ${eave} V${BASE} H${x1 - 20} V${eave} Z" fill="${mix(fc, INK, 0.3)}" ${O()}/>`;
      // оружие на стенке
      for (const [dx, k] of [[150, 'sword'], [180, 'axe'], [210, 'sword']]) { const xx = x0 + dx;
        s += k === 'sword' ? `<path d="M${xx - 5} 680 V740 L${xx} 750 L${xx + 5} 740 V680 Z" fill="#c8ccd4" stroke="${INK}" stroke-width="2.5"/><path d="M${xx - 12} 680 H${xx + 12} M${xx} 680 V664" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`
          : `<path d="M${xx} 660 V752" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${xx} 660 V752" stroke="${TH.woodL}" stroke-width="3.5"/><path d="M${xx} 664 Q${xx + 24} 656 ${xx + 22} 690 Q${xx + 10} 682 ${xx} 686 Z" fill="#c8ccd4" stroke="${INK}" stroke-width="2.5"/>`; }
      // горн: камень, огонь, труба
      const hx0 = x0 + 34, hx1 = x0 + 130;
      s += `<path d="M${hx0} ${BASE} V700 H${hx1} V${BASE} Z" fill="${TH.stone}" ${O(4)}/>` + K.wall([hx0 + 2, 702, hx1 - 2, BASE], { scale: 0.32, seed: 3 })
        + `<path d="M${hx0 + 16} ${BASE} V748 A32 26 0 0 1 ${hx1 - 16} 748 V${BASE} Z" fill="#ff8a2a" stroke="${INK}" stroke-width="3"/><ellipse cx="${(hx0 + hx1) / 2}" cy="770" rx="80" ry="60" fill="url(#${K.glowId('#ff9a3a', 'forgeglow')})"/>`
        + `<path d="M${(hx0 + hx1) / 2 - 14} ${BASE - 18} q14 -26 28 0" fill="#fff0a0"/>`
        + K.chimney((hx0 + hx1) / 2, 520, 38, 182, TH.stone, '#4a4552');
      // меха
      s += `<g transform="translate(${hx1 + 30} 760)"><path d="M-20 0 L20 -14 L22 14 Z" fill="${TH.woodD}" ${O(3)}/><path d="M-18 -2 Q0 -24 20 -12 L22 12 Q0 22 -18 4 Z" fill="#8a5a3a" stroke="${INK}" stroke-width="2.5"/></g>`;
      // наковальня-витрина и бочка с клинками
      s += C.waterBarrel(x1 - 60, BASE + 10) + `<path d="M${x1 - 72} ${BASE - 80} l-8 -40 M${x1 - 58} ${BASE - 82} l4 -44 M${x1 - 48} ${BASE - 80} l12 -36" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${x1 - 72} ${BASE - 80} l-8 -40 M${x1 - 58} ${BASE - 82} l4 -44 M${x1 - 48} ${BASE - 80} l12 -36" stroke="#c8ccd4" stroke-width="3" stroke-linecap="round"/>`;
      // столбы и полотно навеса
      for (const px of [x0 + 10, x1 - 10]) s += `<path d="M${px} ${eave - 10} V${BASE + 6}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M${px} ${eave - 10} V${BASE + 6}" stroke="${TH.wood}" stroke-width="8" stroke-linecap="round"/>`;
      const rf = `M${x0 - 20} ${eave} L${cx} ${top} L${x1 + 20} ${eave} Z`;
      s += `<path d="${rf}" fill="${fc}" ${O()}/>`;
      if (fs) { const n = 9, a0 = x0 - 20, a1 = x1 + 20; for (let k = 1; k < n; k += 2) s += `<path d="M${cx} ${top + 4} L${f1(a0 + (a1 - a0) * k / n)} ${eave - 2} L${f1(a0 + (a1 - a0) * (k + 1) / n)} ${eave - 2} Z" fill="${fs}"/>`; s += `<path d="${rf}" fill="none" ${O()}/>`; }
      let fe = ''; for (let i = 0, n = 13; i < n; i++) { const a = x0 - 16 + (i + 0.5) * (x1 - x0 + 32) / n; fe += `<path d="M${f1(a - 16)} ${eave - 2} Q${f1(a)} ${eave + 20} ${f1(a + 16)} ${eave - 2} Z" fill="${i % 2 ? (fs || fc) : fc}" stroke="${INK}" stroke-width="2.5"/>`; }
      s += fe + `<path d="M${cx - 10} ${top + 14} L${x0 + 10} ${eave - 8}" stroke="#ffffff" stroke-width="5" opacity=".22" stroke-linecap="round"/>`;
      s += C.peg(x0 - 18, eave, x0 - 50, BASE + 2) + C.peg(x1 + 18, eave, x1 + 56, BASE + 2);
      s += sign(cx + 50, eave + 46, NM.forge, 28, { ropes: eave + 6 });
      P(x0 - 70, x1 + 70, `<g data-ol="forge">${s}</g>`, top - 40, BASE + 40);
    }
    // Ворота «В поход»: проём в частоколе, две сторожевые вышки с навесами, открытые створки, над проёмом - перекладина со знаменем
    if (TH.b && TH.b.gate) TH.b.gate(X);
    else {
      const cx = 1700, gx0 = 1590, gx1 = 1810, top = 300;
      let s = '';
      const tower = (tx, sg) => {   // sg - наружная сторона (-1 слева, 1 справа)
        let t = sh(tx, BASE + 4, 70, 9);
        const legs = `M${tx - 46} ${BASE} L${tx - 36} 470 M${tx + 46} ${BASE} L${tx + 36} 470 M${tx - 44} 700 L${tx + 42} 590 M${tx + 44} 700 L${tx - 42} 590`;
        t += `<path d="${legs}" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="${legs}" stroke="${TH.wood}" stroke-width="9" stroke-linecap="round"/>`;
        t += `<rect x="${tx - 54}" y="440" width="108" height="46" fill="${TH.wood}" ${O()}/>` + K.planks([tx - 52, 442, tx + 52, 484], TH.wood, 18) + `<path d="M${tx - 54} 486 H${tx + 54}" stroke="${INK}" stroke-width="4"/>`;
        const [rc, rs] = TH.canvas[0];
        t += `<path d="M${tx - 64} 446 L${tx} ${top + 50} L${tx + 64} 446 Z" fill="${rc}" ${O()}/>` + (rs ? `<path d="M${tx - 64} 446 L${tx - 20} ${top + 62} L${tx - 4} 446 Z M${tx + 4} 446 L${tx + 20} ${top + 62} L${tx + 64} 446 Z" fill="${rs}" opacity=".9"/><path d="M${tx - 64} 446 L${tx} ${top + 50} L${tx + 64} 446 Z" fill="none" ${O()}/>` : '');
        t += TH.towerTop ? TH.towerTop(X, tx, top + 50) : `<path d="M${tx} ${top + 50} V${top + 6}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${tx} ${top + 6} l40 9 l-40 12 Z" fill="${TH.banner}" stroke="${INK}" stroke-width="3"/>`;
        // факел на кронштейне у наружной ноги (29.10, стример: висел посреди вышки перед перекладиной, перекладина протыкала его)
        const lx = tx + sg * 39, fx = tx + sg * 62;
        t += `<circle cx="${fx}" cy="536" r="46" fill="url(#${K.glowId(TH.fire[1], 'cfg')})" opacity=".7"/><path d="M${lx} 584 H${fx} V570" stroke="${INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M${lx} 584 H${fx} V570" stroke="${TH.metal}" stroke-width="4" stroke-linejoin="round" fill="none"/>`
          + `<path d="M${fx - 10} 572 L${fx - 7} 556 H${fx + 7} L${fx + 10} 572 Z" fill="${TH.metal}" stroke="${INK}" stroke-width="2.5"/>` + C.flame(fx, 560, 0.32, { fire: TH.fire });
        return t;
      };
      // створки ворот (распахнуты внутрь - видно дорогу)
      const door = (x, dir) => `<path d="M${x} ${BASE} V610 L${x + dir * 70} 640 V${BASE + 18} Z" fill="${TH.wood}" ${O()}/>` + K.planks([Math.min(x, x + dir * 70) + 2, 640, Math.max(x, x + dir * 70) - 2, BASE + 6], TH.wood, 18) + `<path d="M${x} 660 L${x + dir * 70} 682 M${x} 750 L${x + dir * 70} 770" stroke="${TH.metal}" stroke-width="7"/><path d="M${x + dir * 8} 600 l${dir * 6} -18 l${dir * 6} 18 M${x + dir * 30} 612 l${dir * 6} -18 l${dir * 6} 18 M${x + dir * 52} 622 l${dir * 6} -18 l${dir * 6} 18" fill="${TH.woodL}" stroke="${INK}" stroke-width="2.5"/>`;
      s += door(gx0, 1) + door(gx1, -1);
      s += tower(gx0 - 40, -1) + tower(gx1 + 40, 1);
      // перекладина над проёмом со знаменем «В ПОХОД»
      // 29.10: перекладина лежит между внутренними ногами вышек (раньше доходила до середины вышки, к факелу)
      s += `<path d="M${gx0 - 6} 520 H${gx1 + 6}" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M${gx0 - 6} 520 H${gx1 + 6}" stroke="${TH.wood}" stroke-width="11" stroke-linecap="round"/>`;
      s += `<path d="M${cx - 120} 528 H${cx + 120} V586 L${cx + 100} 600 L${cx + 80} 586 H${cx - 80} L${cx - 100} 600 L${cx - 120} 586 Z" fill="${TH.banner}" ${O()}/>` + txt(cx, 568, NM.gate, 30, TH.bannerTx);
      signs.push({ t: NM.gate, r: [cx - 120, 528, cx + 120, 600] });
      P(gx0 - 130, gx1 + 130, `<g data-ol="gate">${s}</g>`, top - 20, BASE + 40);
    }
    // Шатёр (облик): большой круглый шатёр-«колокол» в полоску, полог открыт - внутри зеркало и вешалка с нарядами; вывеска на треноге
    if (TH.b && TH.b.tent) TH.b.tent(X);
    else {
      const b = B('tent'), cx = 2250;
      const [pc, ps] = TH.pavilion;
      const inside = (x, base, dw, dh) => `<rect x="${f1(x - 18)}" y="${f1(base - dh * 0.62)}" width="36" height="${f1(dh * 0.5)}" rx="16" fill="#bfe6ff" stroke="${INK}" stroke-width="3"/><path d="M${f1(x - 10)} ${f1(base - dh * 0.55)} l12 18" stroke="#ffffff" stroke-width="3" opacity=".8"/>`
        + `<path d="M${f1(x - dw * 0.8)} ${f1(base - dh * 0.75)} H${f1(x - 26)}" stroke="${TH.woodL}" stroke-width="3"/>` + [0, 1].map((i) => `<path d="M${f1(x - dw * 0.72 + i * 16)} ${f1(base - dh * 0.75)} l-10 34 h22 Z" fill="${TH.flags[i]}" stroke="${INK}" stroke-width="2"/>`).join('');
      let s = C.tentBell(cx, BASE, 440, { c: pc, s: ps, d: mix(pc, INK, 0.3), hk: 0.52, wk: 0.32, top: TH.glass, vane: TH.banner, in: inside });
      if (TH.coneTop) { const ct = TH.coneTop(X, cx, BASE - 440 * 0.32 - 440 * 0.52, 440, pc); s = TH.coneBack ? ct + s : s + ct; }   // coneBack - за куполом (уши котиков)
      // вывеска на треноге справа
      const bx = cx + 236;
      s += `<path d="M${bx - 30} ${BASE + 14} L${bx} 690 L${bx + 30} ${BASE + 14}" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${bx - 30} ${BASE + 14} L${bx} 690 L${bx + 30} ${BASE + 14}" stroke="${TH.woodL}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
      s += sign(bx, 700, NM.tent, 24);
      P(cx - 300, cx + 330, `<g data-ol="tent">${s}</g>`, 350, BASE + 40);
    }
    // Торговые ряды: три прилавка-повозки под навесами (еда, зелья, материалы), гирлянда флажков, арка-вывеска
    if (TH.b && TH.b.shop) TH.b.shop(X);
    else {
      const x0 = 2590, x1 = 3320;
      let s = '';
      const stall = (sx, w, kind, i) => {
        const base = 860, top = 640, [c1, c2] = TH.canvas[(i + 2) % TH.canvas.length], c2b = c2 || TH.banner;
        let t = sh(sx + w / 2, base + 4, w / 2 + 10, 9);
        // стойки и прилавок
        t += `<path d="M${sx + 10} ${base} V${top + 30} M${sx + w - 10} ${base} V${top + 30}" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M${sx + 10} ${base} V${top + 30} M${sx + w - 10} ${base} V${top + 30}" stroke="${TH.wood}" stroke-width="6" stroke-linecap="round"/>`;
        t += `<rect x="${sx}" y="${base - 74}" width="${w}" height="74" fill="${TH.wood}" ${O()}/>` + K.planks([sx + 2, base - 72, sx + w - 2, base - 2], TH.wood, 22) + `<rect x="${sx - 6}" y="${base - 86}" width="${w + 12}" height="14" rx="3" fill="${TH.woodL}" ${O(3.5)}/>`;
        // товар
        const gy = base - 88;
 if (TH.goods) t += TH.goods(X, kind, sx, w, gy);
        else if (kind === 'food') t += `<ellipse cx="${sx + 34}" cy="${gy - 10}" rx="24" ry="12" fill="#e8a24a" ${O(3)}/><path d="M${sx + 18} ${gy - 12} q8 -6 16 0 q8 -6 16 0" stroke="${mix('#e8a24a', INK, 0.3)}" stroke-width="2" fill="none"/><path d="M${sx + 70} ${gy} l20 -30 l20 30 Z" fill="#ffd24a" ${O(3)}/><circle cx="${sx + 84}" cy="${gy - 10}" r="3" fill="${mix('#ffd24a', INK, 0.3)}"/><circle cx="${sx + w - 40}" cy="${gy - 14}" r="16" fill="#e8455c" ${O(3)}/><circle cx="${sx + w - 22}" cy="${gy - 10}" r="13" fill="#8fd06a" ${O(3)}/><path d="M${sx + w - 40} ${gy - 30} q4 -8 10 -8" stroke="${INK}" stroke-width="3" fill="none"/>`;
        else if (kind === 'potion') for (let k = 0; k < 4; k++) { const px = sx + 24 + k * ((w - 48) / 3), pc2 = ['#e8455c', '#5ab0ff', '#8fd06a', '#c77dff'][k]; t += `<path d="M${px - 4} ${gy - 34} V${gy - 24} Q${px - 16} ${gy - 18} ${px - 14} ${gy - 6} Q${px - 12} ${gy} ${px} ${gy} Q${px + 12} ${gy} ${px + 14} ${gy - 6} Q${px + 16} ${gy - 18} ${px + 4} ${gy - 24} V${gy - 34} Z" fill="${pc2}" ${O(3)}/><rect x="${px - 5}" y="${gy - 40}" width="10" height="7" rx="2" fill="${TH.woodD}" stroke="${INK}" stroke-width="2"/><path d="M${px - 8} ${gy - 14} q2 6 6 8" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".6"/>`; }
        else t += `<path d="M${sx + 16} ${gy} L${sx + 26} ${gy - 26} L${sx + 50} ${gy - 30} L${sx + 62} ${gy} Z" fill="#8a8e9e" ${O(3)}/><path d="M${sx + 30} ${gy - 18} l8 -4" stroke="#ffd24a" stroke-width="4" stroke-linecap="round"/><rect x="${sx + 72}" y="${gy - 18}" width="${w - 96}" height="10" fill="${TH.woodL}" ${O(2.5)}/><rect x="${sx + 78}" y="${gy - 30}" width="${w - 108}" height="10" fill="${TH.wood}" ${O(2.5)}/>`;
        // навес: волнистый тент в полоску
        const aw = `M${sx - 14} ${top + 40} L${sx + 6} ${top} H${sx + w - 6} L${sx + w + 14} ${top + 40} Z`;
        t += `<path d="${aw}" fill="${c1}" ${O()}/>`;
        for (let k = 0; k < 5; k += 2) { const a = sx + 6 + k * (w - 12) / 5, b2 = sx + 6 + (k + 1) * (w - 12) / 5; t += `<path d="M${f1(a)} ${top + 2} L${f1(b2)} ${top + 2} L${f1(b2 + (b2 - sx - w / 2) * 0.12)} ${top + 38} L${f1(a + (a - sx - w / 2) * 0.12)} ${top + 38} Z" fill="${c2b}"/>`; }
        let fe = ''; for (let k = 0; k < 5; k++) { const a = sx - 14 + (k + 0.5) * (w + 28) / 5; fe += `<path d="M${f1(a - (w + 28) / 10)} ${top + 38} Q${f1(a)} ${top + 62} ${f1(a + (w + 28) / 10)} ${top + 38} Z" fill="${k % 2 ? c2b : c1}" stroke="${INK}" stroke-width="2.5"/>`; }
        t += fe + `<path d="${aw}" fill="none" ${O()}/>`;
        return t;
      };
      s += stall(2600, 210, 'food', 0) + stall(2850, 210, 'potion', 1) + stall(3100, 210, 'mat', 2);
      // арка над рядами с вывеской и гирляндой флажков
      const ag = `M2590 868 V520 M3320 868 V520`;
      s = `<path d="${ag}" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="${ag}" stroke="${TH.wood}" stroke-width="9" stroke-linecap="round"/>` + s;
      // 29.10 (стример: флажки не на нити, к середине висели выше неё): нить - одна дуга с провисом между столбами, у каждого флажка
      // верхние углы и остриё считаются по этой же дуге (x на дуге линейный: управляющая точка - посередине)
      const ny = (x) => { const t2 = (x - 2590) / 730; return 560 + 2 * t2 * (1 - t2) * 80; };
      let bunt = `<path d="M2590 560 Q2955 640 3320 560" stroke="${INK}" stroke-width="3" fill="none"/>`;
      for (let i = 0; i < 18; i++) { const x = 2590 + (i + 0.5) / 18 * 730; bunt += `<path d="M${f1(x - 13)} ${f1(ny(x - 13))} L${f1(x)} ${f1(ny(x) + 24)} L${f1(x + 13)} ${f1(ny(x + 13))} Z" fill="${TH.flags[i % TH.flags.length]}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`; }
      s += bunt + sign(2955, 520, NM.shop, 30);
      P(x0 - 40, x1 + 40, `<g data-ol="shop">${s}</g>`, 470, 900);
    }

    /* ---------- предметы с глубиной (палатки, костёр, утварь) ---------- */
    // палатки новобранцев
    L.tents.forEach((t, i) => {
      const [c, st] = TH.canvas[i % TH.canvas.length], kind = TH.kinds[t.k] || 'ridge', bed = TH.beds[i % TH.beds.length];
      let s = '';
      const op = { c, s: st, flip: t.flip, open: i % 3 !== 2, bed, patch: i % 4 === 1 ? mix(c, '#7a5a3a', 0.4) : '', mud: i % 2 === 0, vane: i % 3 === 0 ? TH.flags[i % TH.flags.length] : '' };
      const own = TH.tent && TH.tent(X, t, i, { ...op, kind });   // своя палатка стиля: строка или { svg, h }
      s += own ? (own.svg || own) : kind === 'bell' ? C.tentBell(t.x, t.y, t.w, { ...op, hk: 0.48 }) : kind === 'cone' ? C.tentCone(t.x, t.y, t.w * 0.8, op) : C.tentRidge(t.x, t.y, t.w, op);
      const hh = (own && own.h) || (kind === 'cone' ? t.w * 0.9 : t.w * 0.75);
      prop(t.x - t.w / 2 - 90, t.y - hh - 80, t.w + 180, hh + 110, t.y, s);
    });
    // костёр: камни, огонь, котёл на треноге, брёвна-скамьи вокруг
    {
      const F = L.fire;
      // 29.10: брёвна-скамьи - каждое своим предметом со своей глубиной (низ бревна). Были одной картинкой с костром (z = F.y + 20):
      // герой перед боковым бревном (оно на 1066, ноги героя ~1085) оказывался под ним
      for (const [x, y, rx, ry, rot] of F.logs) prop(x - rx - 40, y - 60, rx * 2 + 80, 90, y + 4, C.logSeat(x, y + 4, rx * 2, rot, { c: TH.log }));
      let s = C.campfire(F.x, F.y + 6, 1.1, { fire: TH.fire, noFlame: true, over: TH.noCauldron ? '' : C.cauldron(F.x, F.y + 8, 0.95, { brew: TH.brew, c: TH.pot, lift: 50 }) });
      prop(F.x - 240, F.y - 240, 480, 340, F.y + 20, s);
      // украшения костра (рыбка на палочках, кокосы…) - как раньше, поверх брёвен
      if (TH.fireDeco) prop(F.x - 260, F.y - 260, 520, 400, Math.max(...F.logs.map((l) => l[1])) + 10, TH.fireDeco(X));
      // 29.10: пламя - свой предмет с глубиной (сразу над костром): герой перед костром - поверх огня, за ним - под огнём. Раньше живое пламя
      // лежало DOM-слоем поверх всей Pixi-сцены (и героев перед костром), а под ним - такое же неподвижное в костре: края «рвались».
      // flick: [x, y] - низ пламени; Pixi качает картинку вокруг него (как cyCampFl), SVG-версия - тем же CSS (класс cy-camp-fl)
      prop(F.x - 65, F.y + 2 - 140, 130, 140, F.y + 21, C.flame(F.x, F.y + 2, 0.99, { fire: TH.fire }), { flick: [F.x, F.y + 2] });
    }
    // предметы раскладки
    const poles = L.props.filter((p) => p.k === 'pole');
    for (const p of L.props) {
      const x = p.x, y = p.y;
      let s = '', w = 200, h = 220;
      const own = TH.prop && TH.prop(X, p);   // свой предмет стиля: { s, w, h } (или { flat: svg } - в фон)
      if (own && own.flat) { P(x - (own.w || 160) / 2, x + (own.w || 160) / 2, own.flat, y - (own.h || 60), y + 30); continue; }
      if (own) { prop(x - own.w / 2, y - own.h, own.w, own.h + 30, y, own.s); continue; }
      switch (p.k) {
        case 'sign': s = C.signpost(x, y, [{ t: NM.gate, dir: 1 }, { t: NM.forge.length > 11 ? 'КУЗНЯ' : NM.forge, dir: -1 }, { t: NM.shop.split(' ').pop(), dir: 1 }], { tx: TH.sign.tx }); w = 420; h = 220; break;
        case 'rack': s = C.rack(x, y, { shield: TH.banner }); w = 300; h = 220; break;
        case 'target': s = C.target(x, y, { ring: TH.banner, fletch: TH.flags[1] }); w = 120; h = 160; break;
        case 'hitch': s = C.hitch(x, y, 200); w = 260; h = 110; break;
        case 'woodpile': s = C.woodpile(x, y); w = 200; h = 130; break;
        case 'well': s = C.waterBarrel(x, y); w = 110; h = 150; break;
        case 'barrel': s = K.put(K.def('barrel', () => ''), x, y, 0.8); w = 80; h = 100; break;
        case 'crate': s = K.put(K.def('crate', () => ''), x, y, 0.8); w = 80; h = 80; break;
        case 'crates': s = C.crates(x, y); w = 140; h = 120; break;
        case 'sacks': s = C.sacks(x, y); w = 140; h = 100; break;
        case 'flag': s = C.flagPole(x, y, 150, TH.flags[(x >> 3) % TH.flags.length]); w = 120; h = 190; break;
        case 'pot': s = C.potTripod(x, y, { brew: TH.brew }); w = 90; h = 100; break;
        case 'torch': s = C.torch(x, y, 130, { fire: TH.fire }); w = 160; h = 230; break;
        case 'bedroll': P(x - 80, x + 80, C.bedroll(x, y, TH.beds[(x >> 4) % TH.beds.length]), y - 30, y + 30); continue;
        case 'pole': s = `<ellipse cx="${x}" cy="${y + 2}" rx="12" ry="4" fill="${INK}" opacity=".3"/><path d="M${x} ${y} V${y - 130}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x} ${y} V${y - 130}" stroke="${TH.woodL}" stroke-width="4.5" stroke-linecap="round"/>`; w = 40; h = 150; break;
        default: continue;
      }
      prop(x - w / 2, y - h, w, h + 30, y, s);
    }
    // верёвки с бельём между столбами (над и между палатками)
    for (const [a, b2] of L.lines) {
      const p = poles[a], q = poles[b2]; if (!p || !q) continue;
      const s = C.laundry(p.x, p.y - 126, q.x, q.y - 126, TH.laundry, TH.wash);
      prop(Math.min(p.x, q.x) - 40, Math.min(p.y, q.y) - 150, Math.abs(q.x - p.x) + 80, 160, Math.max(p.y, q.y) + 1, s);
    }
    if (TH.deco) TH.deco(X);   // свои мелочи стиля (клубки, бананы, тыквы…)
    // частокол внизу - впереди всех (кто у края - его ноги за кольями)
    for (let x = 0; x < W; x += 850) prop(x - 20, L.FENCE.y - 40, 890, 140, L.FENCE.y + 60, TH.fence ? TH.fence(K, x + 6, Math.min(W - 6, x + 850), L.FENCE.y + 72, 84) : C.stakes(x + 6, Math.min(W - 6, x + 850), L.FENCE.y + 72, 84));

    /* ---------- нарезка фона на слои (как townart.js: без обрезки, кусок - в одном слое, рамка ≤ 1024) ---------- */
    const CH = 1024, M = 60, layers = [];
    let cur = null;
    const flush = () => { if (!cur) return; const x = Math.floor(cur.x0 - M), y = Math.max(0, Math.floor(cur.y0 - M)), w = Math.ceil(cur.x1 + M) - x, h = Math.min(H, Math.ceil(cur.y1 + M)) - y;
      layers.push({ x, y, w, h, svg: `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="visible">${K.wrap(cur.svg)}</svg>` }); cur = null; };
    for (const q of pieces) {
      const x0 = Math.max(-200, q.x0), x1 = Math.min(W + 200, q.x1);
      if (cur && (Math.max(cur.x1, x1) - Math.min(cur.x0, x0) > CH || Math.max(cur.y1, q.y1) - Math.min(cur.y0, q.y0) > 1200)) flush();
      if (!cur) cur = { x0, x1, y0: q.y0, y1: q.y1, svg: '' };
      cur.x0 = Math.min(cur.x0, x0); cur.x1 = Math.max(cur.x1, x1); cur.y0 = Math.min(cur.y0, q.y0); cur.y1 = Math.max(cur.y1, q.y1); cur.svg += q.svg;
    }
    flush();
    // предметам - свои <defs> (каждый печётся отдельной картинкой)
    const outProps = props.map((p) => { const svg = K.wrap(p.svg()); return { ...p, svg: () => svg }; });
    const anim = [];   // 29.10: пламя - предмет с глубиной (flick), отдельного слоя поверх сцены больше нет
    return { sky: TH.sky, defs: '', layers, props: outProps, fx: TH.fx || '', anim, signs, L, theme: TH };
  }
  root.LGCampArt = { draw, THEMES, themeOf };
})(typeof self !== 'undefined' ? self : this);
