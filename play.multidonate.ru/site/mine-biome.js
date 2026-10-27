/* 25.10: «Шахта 2.0» (тестерам - mine2On() в mine.js) - облик самой локации шахты по глубине: стены, пол, крепь, свет, украшения, пылинки.
   Каждые 5 этажей - свой пласт: 1-5 «Корневые норы» (земля, корни, трава), 6-10 «Глиняные штольни» (глина, дощатая крепь),
   11-15 «Каменные выработки» (серый камень, крепь с железными обручами, капель), 16-20 «Гранитные глубины» (тёмный гранит, кристаллы),
   21-25 «Грибные гроты» (светогрибы, подземный ручей), 26-30 «Пылающая бездна» (обсидиан, трещины с лавой, жаровни, искры),
   31-35 «Кристальные пещеры», 36-40 «Подземное озеро», 41-45 «Руины гномов», 46-50 «Окаменевший лес», 51-60 «Самоцветные залы»,
   61+ «Сердце горы» (тёплый свет из трещин, еле заметная CSS-пульсация; при «меньше движения» - нет). 26.10 (art/mine-deep-main):
   пласты 31+ из PR #65, перерисованы в стиле art/mine-layers (#59); 1-30 не тронуты.
   Природа округа (луга, лёд, пустыня…) подкрашивает пласт и добавляет свои украшения.
   Генератор: зал этажа из зерна шахты и номера этажа (одинаково у всех зрителей, без сервера) - края зала с нишами, трещины, камешки,
   корни, кристаллы, грибы, ручей. Всё - только на стенах, в нишах и на кромке зала за сеткой камней: туда герои не ходят (центры клеток
   и места копания - с x ≥ SIDE); вода - только в нишах и на стенах. На полу - лишь плоские пятна и трещины (не мешают и не «стоят»).
   Не грузит ПК: фон - одна картинка (SVG → blob → <img>) на этаж: строится один раз, браузер растрирует её один раз и дальше только
   двигает; выкопали камень - фон не трогаем. Виньетка - CSS-градиент, пылинки - до 12 точек на CSS-анимации (transform/opacity, без JS
   в кадре). Рисунок камней и предметов - не здесь (craftworld.js / mine-art.js): для них - палитра пласта (CSS-переменные --rock-*).
   25.10 (art/mine-layers): стены, пол, крепь и светильники - в стиле камней зрителя (плоские тона, светлая плоскость сверху, толстый
   контур), ряд глыб по краю зала, бахрома свода у каждого пласта, пятна света на полу.
   window.LGMineBiome: { themeOf(n), palette(st), paint(S, Wd), off(S), span(T) - этажи пласта для подписи } */
(function () {
  'use strict';
  const INK = '#15122e';
  const f1 = (v) => +(+v).toFixed(1);
  const rng = window.LGWorldLib.rng, hash = window.LGWorldLib.hash;   // 26.10: случайность по зерну - библиотека мира (/lib/world.js; была своя копия)
  const O = (w = 4, c = INK) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // цвет: смесь a и b (k - доля b)
  const hx = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  // гладкий замкнутый контур по точкам (как blob в craftworld.js)
  function smooth(pts, closed = true) {
    const n = pts.length; let d = '';
    if (!closed) { d = `M${f1(pts[0][0])} ${f1(pts[0][1])} `; for (let i = 1; i < n - 1; i++) d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1((pts[i][0] + pts[i + 1][0]) / 2)} ${f1((pts[i][1] + pts[i + 1][1]) / 2)} `; return d + `L${f1(pts[n - 1][0])} ${f1(pts[n - 1][1])}`; }
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], nn = pts[(i + 2) % n]; if (!i) d += `M${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)} `; d += `Q${f1(q[0])} ${f1(q[1])} ${f1((q[0] + nn[0]) / 2)} ${f1((q[1] + nn[1]) / 2)} `; }
    return d + 'Z';
  }
  function blob(cx, cy, rx, ry, r, n = 8, jit = 0.18) { const pts = [], a0 = r() * 6.283; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * 6.283, k = 1 - jit + r() * jit * 2; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return smooth(pts); }

  /* ---------- пласты по глубине ---------- */
  // wall/wallL/wallD - толща породы, floor/floorL/floorD - пол зала; post - крепь, light - светильник, lc - цвет света, glow - сила света,
  // top - затемнение сверху (к спуску), edge - затемнение боковых сводов, vig - виньетка экрана, fx - пылинки; rock/hard - палитра камней
  const THEMES = [
    { id: 'roots', from: 1, name: 'Корневые норы', to: 'в Корневые норы', wall: '#5c4330', wallL: '#7a5c40', wallD: '#3e2c1e', floor: '#7c6046', floorL: '#927354', floorD: '#5c4432', post: 'log', light: 'lantern', lc: '#ffd27a', ac: '#9fd45a', glow: 0.8, top: 0.15, edge: 0.35, vig: 0.22, fx: 'crumb',
      rock: ['#a08a72', '#c0aa90', '#73624f'], hard: ['#7e7468', '#9c9284', '#57504a'] },
    { id: 'clay', from: 6, name: 'Глиняные штольни', to: 'в Глиняные штольни', wall: '#6a3a28', wallL: '#88523a', wallD: '#4a261a', floor: '#845236', floorL: '#9a6444', floorD: '#62402c', post: 'timber', light: 'lantern', lc: '#ffc86a', ac: '#e8925a', glow: 0.75, top: 0.25, edge: 0.42, vig: 0.3, fx: 'dust',
      rock: ['#b07a5a', '#cc9a78', '#7e5038'], hard: ['#8e624a', '#aa7e64', '#62402e'] },
    { id: 'stone', from: 11, name: 'Каменные выработки', to: 'в Каменные выработки', wall: '#45444f', wallL: '#5e5d6a', wallD: '#2e2d36', floor: '#5a5862', floorL: '#6c6a74', floorD: '#42404a', post: 'banded', light: 'lantern', lc: '#ffcf7a', ac: '#8fc8e0', glow: 0.7, top: 0.35, edge: 0.5, vig: 0.38, fx: 'drip',
      rock: ['#8e8c94', '#b0aeb8', '#62606a'], hard: ['#666874', '#848694', '#45464f'] },
    { id: 'granite', from: 16, name: 'Гранитные глубины', to: 'в Гранитные глубины', wall: '#27252f', wallL: '#3a3746', wallD: '#16141c', floor: '#45414e', floorL: '#555060', floorD: '#2e2b36', post: 'iron', light: 'crystal', lc: '#9ae0ff', ac: '#b48aff', glow: 0.7, top: 0.45, edge: 0.6, vig: 0.48, fx: 'spark',
      rock: ['#6a6878', '#8a88a0', '#46445a'], hard: ['#4e4c5e', '#666480', '#302e40'] },
    { id: 'grotto', from: 21, name: 'Грибные гроты', to: 'в Грибные гроты', wall: '#152029', wallL: '#22323d', wallD: '#0a1218', floor: '#2b3a40', floorL: '#36494f', floorD: '#1b272c', post: 'stalag', light: 'shroom', lc: '#5ff0c8', ac: '#7ab8ff', glow: 0.85, top: 0.5, edge: 0.66, vig: 0.56, fx: 'spore',
      rock: ['#5a7078', '#7a96a0', '#3a4c54'], hard: ['#465a62', '#5e7a84', '#2a3a42'] },
    { id: 'abyss', from: 26, name: 'Пылающая бездна', to: 'в Пылающую бездну', wall: '#140b10', wallL: '#26141c', wallD: '#070306', floor: '#2c1c22', floorL: '#3a252c', floorD: '#1a0e13', post: 'obsid', light: 'brazier', lc: '#ff7a2a', ac: '#ff3a1a', glow: 0.9, top: 0.55, edge: 0.72, vig: 0.62, fx: 'ember',
      rock: ['#4e3a40', '#6e5258', '#2e2026'], hard: ['#3e2a32', '#583c46', '#20141a'] },
    // 26.10 (art/mine-deep-main, из PR #65): глубже бездны - стены почти чёрные (не светлее бездны больше чем на 10 по яркости), цвет дают украшения и свет
    { id: 'crystal', from: 31, name: 'Кристальные пещеры', to: 'в Кристальные пещеры', wall: '#161226', wallL: '#262040', wallD: '#0a0814', floor: '#2a2440', floorL: '#38305a', floorD: '#1a1628', post: 'crys', light: 'crystal', lc: '#c8a0ff', ac: '#6ae8ff', glow: 0.9, top: 0.56, edge: 0.73, vig: 0.64, fx: 'glint',
      rock: ['#5a5076', '#7e72a4', '#38304e'], hard: ['#463c66', '#62568c', '#28223e'] },
    { id: 'lake', from: 36, name: 'Подземное озеро', to: 'к Подземному озеру', wall: '#0e1a22', wallL: '#1a2c38', wallD: '#060c12', floor: '#1e2c34', floorL: '#2a3a44', floorD: '#121c22', post: 'pier', light: 'lantern', lc: '#a8e0ff', ac: '#4ab8e8', glow: 0.75, top: 0.57, edge: 0.74, vig: 0.66, fx: 'drop',
      rock: ['#4a626e', '#6a8694', '#2e3e48'], hard: ['#3a525e', '#52707e', '#22323a'] },
    { id: 'dwarf', from: 41, name: 'Руины гномов', to: 'в Руины гномов', wall: '#1a1614', wallL: '#2c2622', wallD: '#0c0a08', floor: '#2e2824', floorL: '#3c342e', floorD: '#1e1a17', post: 'column', light: 'rune', lc: '#ffc860', ac: '#7ae0ff', glow: 0.8, top: 0.58, edge: 0.75, vig: 0.68, fx: 'rune',
      rock: ['#6a5e54', '#8c7e70', '#443a32'], hard: ['#54483e', '#706254', '#342c24'] },
    { id: 'fossil', from: 46, name: 'Окаменевший лес', to: 'в Окаменевший лес', wall: '#171912', wallL: '#282b20', wallD: '#0a0b07', floor: '#2a2c22', floorL: '#383a2e', floorD: '#1a1b14', post: 'trunk', light: 'amber', lc: '#ffb040', ac: '#c8e070', glow: 0.75, top: 0.59, edge: 0.76, vig: 0.7, fx: 'pollen',
      rock: ['#5e5c4a', '#7e7c66', '#3c3a2e'], hard: ['#4a4a3a', '#666650', '#2e2e22'] },
    { id: 'mirror', from: 51, name: 'Самоцветные залы', to: 'в Самоцветные залы', wall: '#14121e', wallL: '#262238', wallD: '#08070e', floor: '#2a2638', floorL: '#38324a', floorD: '#1a1724', post: 'gem', light: 'prism', lc: '#fff0d8', ac: '#ff7ad8', glow: 0.75, top: 0.6, edge: 0.77, vig: 0.72, fx: 'prism',
      rock: ['#56506e', '#7a7298', '#363048'], hard: ['#443e5e', '#5e587e', '#2a263c'] },
    { id: 'heart', from: 61, name: 'Сердце горы', to: 'в Сердце горы', wall: '#120c0a', wallL: '#22160f', wallD: '#060302', floor: '#281a14', floorL: '#36241a', floorD: '#180e0a', post: 'monolith', light: 'core', lc: '#ff9a4a', ac: '#ffd27a', glow: 0.85, top: 0.62, edge: 0.8, vig: 0.76, fx: 'heat', pulse: 1,
      rock: ['#5a3e34', '#7a5446', '#38241e'], hard: ['#48302a', '#64423a', '#2c1a16'] },
  ];
  const themeIx = (n) => { let k = 0; for (let i = 0; i < THEMES.length; i++) if ((+n || 1) >= THEMES[i].from) k = i; return k; };
  // этажи пласта для подписи: «31-35», «51-60», у последнего - «61 и глубже»
  const span = (T) => { const i = THEMES.findIndex((t) => t.id === T.id), nx = THEMES[i + 1]; return nx ? `${T.from}-${nx.from - 1}` : `${T.from} и глубже`; };
  const DEEP = new Set(['crystal', 'lake', 'dwarf', 'fossil', 'mirror', 'heart']);
  // природа округа: подкраска пласта (k - доля) и свои украшения
  const BIO = {
    meadow: { tint: '#a8b84a', k: 0.16, acc: 'meadow' }, forest: { tint: '#3e6e34', k: 0.18, acc: 'roots' }, taiga: { tint: '#3e6a74', k: 0.16, acc: 'roots' },
    ice: { tint: '#9ac8f0', k: 0.24, acc: 'ice' }, swamp: { tint: '#4e6a3a', k: 0.2, acc: 'swamp' }, blight: { tint: '#7a3e9a', k: 0.22, acc: 'blight' },
    coast: { tint: '#2e8aa8', k: 0.16, acc: 'coast' }, desert: { tint: '#d8a050', k: 0.22, acc: 'desert' }, ruin: { tint: '#a8a090', k: 0.12, acc: 'ruin' },
    ash: { tint: '#a02a10', k: 0.2, acc: 'ash' }, mount: { tint: '#8a8a9a', k: 0, acc: '' },
  };
  function themeOf(n, biome) {
    const T0 = THEMES[themeIx(n)], B = BIO[biome] || BIO.mount, k = B.k, t = (c, kk = k) => (kk ? mix(c, B.tint, kk) : c);
    return { ...T0, wall: t(T0.wall), wallL: t(T0.wallL), wallD: t(T0.wallD), floor: t(T0.floor, k * 0.8), floorL: t(T0.floorL, k * 0.8), floorD: t(T0.floorD, k * 0.8),
      rock: T0.rock.map((c) => t(c, k * 0.7)), hard: T0.hard.map((c) => t(c, k * 0.7)), acc: B.acc, biome };
  }
  /** Палитра камней пласта - для рисунка камней (mine-art.js / craftworld.js): то же, что CSS-переменные --rock-* на .mn. */
  const palette = (st) => { const T = themeOf(st && st.n, st && st.biome); return { rock: T.rock, hard: T.hard, outline: INK, floor: T.floor, wall: T.wall, light: T.lc, theme: T.id, name: T.name }; };

  /* ---------- текстуры: плитки <pattern> (одна на стены, одна на пол) ----------
     25.10 (art/mine-layers): в стиле камней зрителя - плоские тона, светлая плоскость сверху, тень снизу, толстый тёмный контур.
     Фигуры у края плитки повторяются со сдвигом на размер плитки - швов нет. */
  const wrapIn = (P, x, y, rr, fn) => { let g = ''; for (const dx of [-P, 0, P]) for (const dy of [-P, 0, P]) { const X = x + dx, Y = y + dy; if (X + rr < 0 || X - rr > P || Y + rr < 0 || Y - rr > P) continue; g += fn(X, Y); } return g; };
  // гранёная глыба: основа, светлая плоскость сверху-слева, тень снизу-справа, контур
  function slab(x, y, rx, ry, C, r, ow = 3, n = 8, jit = 0.16) {
    const pts = [], a0 = r() * 6.283; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * 6.283, k = 1 - jit + r() * jit * 2; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    const d = smooth(pts), sc = (s, dx, dy) => smooth(pts.map(([px, py]) => [x + (px - x) * s + dx, y + (py - y) * s + dy]));
    // тёмная основа → средний тон и светлая плоскость смещены вверх-влево: внизу справа остаётся тень серпом
    return `<path d="${d}" fill="${C[2]}"/><path d="${sc(0.84, -rx * 0.09, -ry * 0.13)}" fill="${C[0]}"/><path d="${sc(0.5, -rx * 0.22, -ry * 0.32)}" fill="${C[1]}"/><path d="${d}" fill="none" ${O(ow, C[3])}/>`;
  }
  const tone = (T, k) => [k ? T.wallL : T.wall, mix(k ? T.wallL : T.wall, '#ffffff', 0.14), mix(T.wallD, '#000000', 0.12), mix(T.wallD, '#000000', 0.45)];
  // 26.10 (слияние art/mine-layers + mine/windows): размер плитки стены - общий для фона этажа и породы за его краем (tileOf)
  const WP = 240;
  function wallTile(T) {
    const r = rng(hash('w2' + T.id)), P = WP; let g = '';
    const ink = mix(T.wallD, '#000000', 0.45);
    if (T.id === 'roots') {   // земля: комья, камешки, корешки
      for (let k = 0; k < 11; k++) { const x = r() * P, y = r() * P, rx = 16 + r() * 22, ry = rx * (0.6 + r() * 0.2), C = tone(T, r() < 0.55 ? 1 : 0); g += wrapIn(P, x, y, rx + 6, (X, Y) => slab(X, Y, rx, ry, C, rng(hash(`${k}`)), 2.6)); }
      for (let k = 0; k < 18; k++) { const x = r() * P, y = r() * P; g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.6 + r() * 2.6)}" fill="${r() < 0.5 ? T.wallD : '#a8865c'}"/>`; }
      for (let k = 0; k < 4; k++) { const x = 20 + r() * (P - 40), y = 20 + r() * (P - 60); g += `<path d="M${f1(x)} ${f1(y)} q${f1(-8 + r() * 16)} 12 ${f1(-4 + r() * 8)} 26 t${f1(-6 + r() * 12)} 18" stroke="#3a2414" stroke-width="2.4" fill="none" stroke-linecap="round"/>`; }
    } else if (T.id === 'clay') {   // глина: пласты-плиты с кромкой, сухие трещинки
      for (let k = 0; k < 6; k++) { const y = 10 + k * 40 + r() * 6, a = 5 + r() * 6, c = k % 2 ? T.wallL : T.wall;
        const top = (yy) => `M-20 ${f1(yy)} C${f1(P * 0.25)} ${f1(yy - a)} ${f1(P * 0.25)} ${f1(yy + a)} ${f1(P * 0.5)} ${f1(yy)} S${f1(P * 0.75)} ${f1(yy - a)} ${P + 20} ${f1(yy)}`;
        g += `<path d="${top(y)} V${f1(y + 34)} H-20 Z" fill="${c}"/><path d="${top(y)}" stroke="${mix(c, '#ffffff', 0.18)}" stroke-width="6" fill="none"/><path d="M-20 ${f1(y + 32)} H${P + 20}" stroke="${mix(T.wallD, '#000000', 0.1)}" stroke-width="5"/><path d="${top(y)}" stroke="${ink}" stroke-width="2.6" fill="none"/>`; }
      for (let k = 0; k < 6; k++) { const x = r() * (P - 30), y = r() * P; g += `<path d="M${f1(x)} ${f1(y)} l${f1(8 + r() * 10)} ${f1(-4 + r() * 8)} l${f1(4 + r() * 8)} ${f1(6 + r() * 6)} M${f1(x + 10)} ${f1(y)} l-2 -9" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`; }
    } else if (T.id === 'stone') {   // камень: тёсаная кладка породы (скруглённые блоки со светлым верхом)
      for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 4; gx++) { const w = 54 + r() * 6, h = 40 + r() * 4, x = gx * 60 + (gy % 2) * 30 + r() * 3, y = gy * 48 + r() * 3, c = r() < 0.5 ? T.wallL : T.wall;
        g += wrapIn(P, x + w / 2, y + h / 2, w, (X, Y) => `<rect x="${f1(X - w / 2)}" y="${f1(Y - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="12" fill="${c}"/><rect x="${f1(X - w / 2 + 4)}" y="${f1(Y - h / 2 + 3)}" width="${f1(w - 14)}" height="${f1(h * 0.34)}" rx="8" fill="${mix(c, '#ffffff', 0.14)}"/><rect x="${f1(X - w / 2 + 8)}" y="${f1(Y + h * 0.18)}" width="${f1(w - 12)}" height="${f1(h * 0.28)}" rx="7" fill="${mix(T.wallD, '#000000', 0.1)}"/><rect x="${f1(X - w / 2)}" y="${f1(Y - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="12" fill="none" ${O(2.6, ink)}/>`); }
    } else if (T.id === 'granite') {   // гранит: угловатые грани, крап
      for (let k = 0; k < 10; k++) { const x = r() * P, y = r() * P, s = 26 + r() * 22, c = r() < 0.5 ? T.wallL : T.wall;
        const q = [[x - s, y + s * 0.4], [x - s * 0.5, y - s * 0.7], [x + s * 0.6, y - s * 0.6], [x + s, y + s * 0.3], [x + s * 0.2, y + s * 0.8]];
        g += wrapIn(P, x, y, s + 4, (X, Y) => { const Q = q.map(([a, b]) => [a - x + X, b - y + Y]), D = `M${Q.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L')} Z`; return `<path d="${D}" fill="${c}"/><path d="M${f1(Q[0][0])} ${f1(Q[0][1])} L${f1(Q[1][0])} ${f1(Q[1][1])} L${f1(Q[2][0])} ${f1(Q[2][1])} L${f1(X)} ${f1(Y)} Z" fill="${mix(c, '#ffffff', 0.12)}"/><path d="M${f1(X)} ${f1(Y)} L${f1(Q[3][0])} ${f1(Q[3][1])} L${f1(Q[4][0])} ${f1(Q[4][1])} Z" fill="${mix(T.wallD, '#000000', 0.15)}"/><path d="${D}" fill="none" ${O(2.4, ink)}/>`; }); }
      for (let k = 0; k < 30; k++) g += `<circle cx="${f1(r() * P)}" cy="${f1(r() * P)}" r="${f1(1 + r() * 1.8)}" fill="${['#d8d4e8', '#8a7a9a', '#c89aa8', '#0a080e'][k % 4]}"/>`;
    } else if (T.id === 'grotto') {   // грот: натёчные колонны (гладкие, мокрый блик слева), капли
      for (let k = 0; k < 6; k++) { const x = k * 40 + r() * 10, w = 16 + r() * 10, c = k % 2 ? T.wallL : T.wall;
        g += `<path d="M${f1(x - w)} -10 Q${f1(x - w - 6)} ${P / 2} ${f1(x - w)} ${P + 10} H${f1(x + w)} Q${f1(x + w + 6)} ${P / 2} ${f1(x + w)} -10 Z" fill="${c}"/><path d="M${f1(x - w + 4)} -10 Q${f1(x - w - 1)} ${P / 2} ${f1(x - w + 4)} ${P + 10}" stroke="${mix(c, '#bfe8ff', 0.22)}" stroke-width="6" fill="none"/><path d="M${f1(x + w)} -10 Q${f1(x + w + 6)} ${P / 2} ${f1(x + w)} ${P + 10}" stroke="${ink}" stroke-width="2.6" fill="none"/>`; }
      for (let k = 0; k < 10; k++) g += `<path d="M${f1(r() * P)} ${f1(r() * P)} v7" stroke="#bfe8ff" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".5"/>`;
    } else if (DEEP.has(T.id)) { g = deepWallTile(T, r, P, ink);   // 26.10 (art/mine-deep-main): пласты 31+
    } else {   // бездна: обсидиановые осколки со стеклянным бликом, искорки лавы
      for (let k = 0; k < 9; k++) { const x = r() * P, y = r() * P, s = 18 + r() * 20;
        g += wrapIn(P, x, y, s + 4, (X, Y) => `<path d="M${f1(X)} ${f1(Y - s)} L${f1(X + s * 0.65)} ${f1(Y + s * 0.4)} L${f1(X - s * 0.55)} ${f1(Y + s * 0.5)} Z" fill="${T.wallL}"/><path d="M${f1(X)} ${f1(Y - s)} L${f1(X + s * 0.65)} ${f1(Y + s * 0.4)} L${f1(X + s * 0.1)} ${f1(Y + s * 0.1)} Z" fill="${mix(T.wallL, '#c8a0b8', 0.18)}"/><path d="M${f1(X - s * 0.1)} ${f1(Y - s * 0.6)} l${f1(s * 0.18)} ${f1(s * 0.5)}" stroke="#e8c0d0" stroke-width="1.6" stroke-opacity=".5"/><path d="M${f1(X)} ${f1(Y - s)} L${f1(X + s * 0.65)} ${f1(Y + s * 0.4)} L${f1(X - s * 0.55)} ${f1(Y + s * 0.5)} Z" fill="none" ${O(2.2, '#000')}/>`); }
      for (let k = 0; k < 8; k++) g += `<circle cx="${f1(r() * P)}" cy="${f1(r() * P)}" r="${f1(1.2 + r() * 1.4)}" fill="#ff7a2a" fill-opacity=".7"/>`;
    }
    return `<pattern id="mnbW" width="${P}" height="${P}" patternUnits="userSpaceOnUse"><rect width="${P}" height="${P}" fill="${T.wall}"/>${g}</pattern>`;
  }
  // пол: приглушённо (по нему ходят, на нём - камни): плоские пятна и швы без толстых контуров
  function floorTile(T) {
    const r = rng(hash('f2' + T.id)), P = 200; let g = '';
    const L = (k) => mix(T.floor, '#ffffff', k), D = (k) => mix(T.floorD, '#000000', k);
    if (T.id === 'roots') {   // утоптанная земля: комочки со светлым верхом, корешки
      for (let k = 0; k < 14; k++) { const x = r() * P, y = r() * P, s = 3 + r() * 5; g += wrapIn(P, x, y, s + 2, (X, Y) => `<ellipse cx="${f1(X)}" cy="${f1(Y)}" rx="${f1(s * 1.3)}" ry="${f1(s)}" fill="${D(0.05)}"/><ellipse cx="${f1(X - s * 0.2)}" cy="${f1(Y - s * 0.3)}" rx="${f1(s * 0.8)}" ry="${f1(s * 0.55)}" fill="${L(0.1)}"/>`); }
      for (let k = 0; k < 3; k++) { const x = r() * (P - 60), y = 10 + r() * (P - 20); g += `<path d="M${f1(x)} ${f1(y)} q16 ${f1(-6 + r() * 12)} 40 ${f1(-4 + r() * 8)}" stroke="${D(0.2)}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-opacity=".7"/>`; }
    } else if (T.id === 'clay') {   // сухая глина: многоугольники с трещинами
      for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) { const x = gx * 50 + (gy % 2) * 25 + r() * 6, y = gy * 50 + r() * 6, w = 40 + r() * 6;
        g += wrapIn(P, x + w / 2, y + w / 2, w, (X, Y) => `<path d="M${f1(X - w / 2)} ${f1(Y - w * 0.3)} L${f1(X - w * 0.1)} ${f1(Y - w / 2)} L${f1(X + w / 2)} ${f1(Y - w * 0.36)} L${f1(X + w * 0.42)} ${f1(Y + w * 0.4)} L${f1(X - w * 0.3)} ${f1(Y + w / 2)} Z" fill="${(gx + gy) % 2 ? L(0.04) : T.floor}" stroke="${D(0.1)}" stroke-width="2" stroke-opacity=".55"/>`); }
    } else if (T.id === 'stone') {   // плиты со светлой кромкой
      for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) { const w = 60 + r() * 4, x = gx * 67 + (gy % 2) * 33, y = gy * 67;
        g += wrapIn(P, x + w / 2, y + w / 2, w, (X, Y) => `<rect x="${f1(X - w / 2)}" y="${f1(Y - w / 2)}" width="${f1(w)}" height="${f1(w)}" rx="12" fill="${(gx + gy) % 2 ? L(0.04) : T.floor}" stroke="${D(0.1)}" stroke-width="2.2" stroke-opacity=".6"/><path d="M${f1(X - w / 2 + 10)} ${f1(Y - w / 2 + 5)} h${f1(w - 22)}" stroke="${L(0.14)}" stroke-width="3" stroke-linecap="round"/>`); }
    } else if (T.id === 'granite') {   // гранитная крошка и трещины
      for (let k = 0; k < 34; k++) g += `<circle cx="${f1(r() * P)}" cy="${f1(r() * P)}" r="${f1(1 + r() * 2.2)}" fill="${['#cfcadc', D(0.2), '#9a8aa8', L(0.12)][k % 4]}" fill-opacity=".7"/>`;
      for (let k = 0; k < 3; k++) { const x = r() * (P - 50), y = r() * P; g += `<path d="M${f1(x)} ${f1(y)} l14 6 l10 -8 l16 4" stroke="${D(0.25)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`; }
    } else if (T.id === 'grotto') {   // сырой камень: мох и блики луж
      for (let k = 0; k < 6; k++) { const x = r() * P, y = r() * P, rx = 14 + r() * 12; g += wrapIn(P, x, y, rx + 4, (X, Y) => `<path d="${blob(X, Y, rx, rx * 0.5, rng(hash('g' + k)), 7)}" fill="${k % 2 ? L(0.06) : '#2f5a4a'}" fill-opacity=".55"/>`); }
      for (let k = 0; k < 8; k++) g += `<path d="M${f1(r() * (P - 12))} ${f1(r() * P)} h${f1(5 + r() * 6)}" stroke="#a8e8f0" stroke-width="2" stroke-opacity=".35" stroke-linecap="round"/>`;
    } else if (DEEP.has(T.id)) { g = deepFloorTile(T, r, P, L, D);   // 26.10 (art/mine-deep-main): пласты 31+
    } else {   // базальт: шестигранники, в швах - жар
      for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) { const x = gx * 50 + (gy % 2) * 25, y = gy * 50 + 25;
        g += wrapIn(P, x, y, 32, (X, Y) => { const hp = [0, 1, 2, 3, 4, 5].map((k) => [X + Math.cos(k * 1.047) * 27, Y + Math.sin(k * 1.047) * 25]); return `<path d="M${hp.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L')} Z" fill="${(gx + gy) % 2 ? L(0.04) : T.floor}" stroke="#0a0508" stroke-width="2.4" stroke-opacity=".55"/>`; }); }
      for (let k = 0; k < 6; k++) { const x = r() * P, y = r() * P; g += `<path d="M${f1(x)} ${f1(y)} l12 -4" stroke="#ff5a1a" stroke-width="2" stroke-linecap="round" stroke-opacity=".55"/>`; }
    }
    return `<pattern id="mnbF" width="${P}" height="${P}" patternUnits="userSpaceOnUse"><rect width="${P}" height="${P}" fill="${T.floor}"/>${g}</pattern>`;
  }

  /* ---------- генератор зала: края с нишами ---------- */
  // G - геометрия craftworld (W, H, TOP, Y0, CW, RH, GRID_H, VX0, VW); SIDE - ширина кромки до сетки камней
  function hallShape(G, r, exitX) {
    const SIDE = (G.W - 7 * G.CW) / 2, yTop = G.TOP - 140, yBot = G.H - 30, yb = G.Y0 + G.GRID_H;
    // ниши: 1-3 на каждой стороне, только вдоль сетки камней (у входа и у спуска - предметы)
    const nich = { L: [], R: [] };
    for (const s of ['L', 'R']) { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const cy = G.Y0 + 120 + ((k + r() * 0.7) / n) * (G.GRID_H - 300), hh = 70 + r() * 50, dep = 40 + r() * 46; nich[s].push({ cy, hh, dep }); } }
    const edgeX = (s, y) => { let x = SIDE * (0.2 + r() * 0.3); for (const a of nich[s]) { const t = (y - a.cy) / a.hh; if (Math.abs(t) < 1) x = Math.min(x, SIDE * 0.25 - a.dep * Math.sqrt(1 - t * t)); } return x; };
    const left = [], right = [];
    for (let y = yTop + 40; y <= yBot - 30; y += 46) { left.push([edgeX('L', y), y]); right.push([G.W - edgeX('R', y), y]); }
    const top = []; const x0 = left[0][0], x1 = right[0][0];
    for (let k = 0; k <= 12; k++) { const t = k / 12, x = x0 + (x1 - x0) * t, near = Math.abs(x - exitX) < 130; top.push([x, yTop - Math.sin(Math.PI * t) * 46 + (near ? 0 : -10 + r() * 20)]); }
    const bot = []; for (let k = 10; k >= 0; k--) { const t = k / 10; bot.push([x0 + (x1 - x0) * t, yBot + Math.sin(Math.PI * t) * 34 + (k % 2 ? 4 : -4)]); }
    const pts = [...top, ...right, ...bot, ...left.reverse()];
    left.reverse();
    return { d: smooth(pts), left, right, nich, SIDE, yTop, yBot, yb, spots: [] };
  }

  /* ---------- крепь и свет ----------
     25.10 (art/mine-layers): плоский стиль - светлая плоскость слева/сверху, тень справа/снизу, толстый контур; места те же. */
  const WOOD = '#8a5a32', WOOD_L = '#b07c48', WOOD_D = '#5a3a1e', WOOD_G = '#4a2c14', IRON = '#6e6e7c', IRON_L = '#a8a8b8', IRON_D = '#3e3e4a';
  // брус: основа, светлая полоса, тень, волокна, контур (вертикальный или горизонтальный)
  function beamV(x, y, w, h, c = [WOOD, WOOD_L, WOOD_D, WOOD_G], grain = true) {
    let g = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${c[0]}"/><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w * 0.3)}" height="${f1(h)}" fill="${c[1]}"/><rect x="${f1(x + w * 0.7)}" y="${f1(y)}" width="${f1(w * 0.3)}" height="${f1(h)}" fill="${c[2]}"/>`;
    if (grain) g += `<path d="M${f1(x + w * 0.5)} ${f1(y + h * 0.15)} q${f1(w * 0.14)} 9 0 18 M${f1(x + w * 0.45)} ${f1(y + h * 0.55)} q${f1(w * 0.14)} 9 0 18" stroke="${c[3]}" stroke-width="1.8" fill="none"/>`;
    return g + `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" ${O(3.4)}/>`;
  }
  function beamH(x, y, w, h, c = [WOOD, WOOD_L, WOOD_D, WOOD_G]) {
    return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${c[0]}"/><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h * 0.32)}" fill="${c[1]}"/><rect x="${f1(x)}" y="${f1(y + h * 0.7)}" width="${f1(w)}" height="${f1(h * 0.3)}" fill="${c[2]}"/><path d="M${f1(x + w * 0.3)} ${f1(y + h * 0.5)} q9 ${f1(-h * 0.14)} 18 0 M${f1(x + w * 0.7)} ${f1(y + h * 0.5)} q9 ${f1(-h * 0.14)} 18 0" stroke="${c[3]}" stroke-width="1.6" fill="none"/><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" ${O(3.4)}/>`;
  }
  const rivetsB = (pts, rr = 2.3) => pts.map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${rr}" fill="${IRON_L}" stroke="${INK}" stroke-width="1.3"/>`).join('');
  // стойка крепи у края зала: x - ось, y - пол ряда, s - сторона (-1 слева, 1 справа): балка уходит в стену (наружу)
  function post(T, x, y, s, r) {
    const yt = y - 118, out = s; let g = `<ellipse cx="${x}" cy="${y + 18}" rx="24" ry="7" fill="#000" fill-opacity=".34"/>`;
    const bx0 = s < 0 ? x - 80 : x - 12;   // перекладина - в стену
    if (T.post === 'log') {   // кругляк с корой, перекладина-бревно с торцом и кольцами, подпятник-камень
      g += `<path d="${blob(x, y + 14, 18, 8, r, 7, 0.15)}" fill="${T.wallL}" ${O(2.6)}/>`;
      g += `<path d="M${x - 10} ${y + 14} V${yt} H${x + 10} V${y + 14} Z" fill="${WOOD}"/><path d="M${x - 10} ${y + 14} V${yt} H${x - 4} V${y + 14} Z" fill="${WOOD_L}"/><path d="M${x + 4} ${y + 14} V${yt} H${x + 10} V${y + 14} Z" fill="${WOOD_D}"/>`
        + `<path d="M${x - 2} ${y - 6} v-30 M${x + 2} ${y - 60} v-26 M${x - 1} ${yt + 30} v-14" stroke="${WOOD_G}" stroke-width="2.2" stroke-linecap="round"/><path d="M${x - 10} ${y + 14} V${yt} H${x + 10} V${y + 14} Z" fill="none" ${O(3.4)}/>`;
      g += `<path d="M${x} ${yt} H${x + out * 66}" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M${x} ${yt} H${x + out * 66}" stroke="${WOOD}" stroke-width="15" stroke-linecap="round"/><path d="M${x} ${yt - 3} H${x + out * 66}" stroke="${WOOD_L}" stroke-width="5" stroke-linecap="round"/>`
        + `<circle cx="${x - out * 2}" cy="${yt}" r="9" fill="#d8a868" ${O(2.6)}/><circle cx="${x - out * 2}" cy="${yt}" r="5" fill="none" stroke="${WOOD_D}" stroke-width="1.6"/><circle cx="${x - out * 2}" cy="${yt}" r="1.8" fill="${WOOD_D}"/>`;
    } else if (T.post === 'timber') {   // брус, затяжка из досок за стойкой, перекладина и укосина, скобы
      for (let k = 0; k < 3; k++) g += beamH(s < 0 ? x - 96 : x + 6, yt + 14 + k * 30, 90, 22, k % 2 ? [WOOD_D, '#7a4c2a', '#3e2412', WOOD_G] : ['#7a4c2a', '#9a6838', WOOD_D, WOOD_G]);
      g += beamV(x - 9, yt, 18, y + 18 - yt) + beamH(bx0, yt - 12, 92, 18, [WOOD, WOOD_L, WOOD_D, WOOD_G]);
      g += `<path d="M${x} ${yt + 30} L${x + out * 24} ${yt + 6}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${x} ${yt + 30} L${x + out * 24} ${yt + 6}" stroke="${WOOD}" stroke-width="7" stroke-linecap="round"/><path d="M${x - out * 1} ${yt + 28} L${x + out * 22} ${yt + 5}" stroke="${WOOD_L}" stroke-width="2.4" stroke-linecap="round"/>`;
      g += `<path d="M${x - 11} ${yt - 6} h22 M${x - 11} ${y - 12} h22" stroke="${INK}" stroke-width="6"/><path d="M${x - 10} ${yt - 6} h20 M${x - 10} ${y - 12} h20" stroke="${IRON_L}" stroke-width="2.6"/>`;
    } else if (T.post === 'banded') {   // брус на камне-подушке, железные обручи с заклёпками, перекладина с хомутом
      g += `<path d="${blob(x, y + 12, 24, 11, r, 7, 0.15)}" fill="${T.wallL}"/><path d="${blob(x - 4, y + 8, 14, 5, r, 6, 0.2)}" fill="${mix(T.wallL, '#ffffff', 0.16)}"/><path d="${blob(x, y + 12, 24, 11, r, 7, 0.15)}" fill="none" ${O(3)}/>`;
      g += beamV(x - 10, yt, 20, y + 8 - yt, ['#7a5634', '#9a7248', '#54381e', '#3e2810']) + beamH(bx0 + 2, yt - 12, 90, 18, ['#7a5634', '#9a7248', '#54381e', '#3e2810']);
      for (const yy of [yt + 16, y - 22]) g += `<rect x="${x - 13}" y="${yy}" width="26" height="10" rx="2" fill="${IRON}"/><rect x="${x - 13}" y="${yy}" width="26" height="3.5" rx="1.5" fill="${IRON_L}"/><rect x="${x - 13}" y="${yy}" width="26" height="10" rx="2" fill="none" ${O(2.4)}/>` + rivetsB([[x - 7, yy + 6], [x + 7, yy + 6]], 1.8);
      const hx = s < 0 ? x - 70 : x + 50; g += `<rect x="${hx}" y="${yt - 15}" width="9" height="24" rx="2" fill="${IRON}"/><rect x="${hx}" y="${yt - 15}" width="3" height="24" fill="${IRON_L}"/><rect x="${hx}" y="${yt - 15}" width="9" height="24" rx="2" fill="none" ${O(2.2)}/>`;
    } else if (T.post === 'iron') {   // клёпаная стойка-двутавр: полки, стенка, заклёпки; перекладина и укосина из уголка
      g += `<rect x="${x - 13}" y="${yt}" width="26" height="${y + 18 - yt}" fill="${IRON_D}"/><rect x="${x - 13}" y="${yt}" width="7" height="${y + 18 - yt}" fill="${IRON}"/><rect x="${x + 6}" y="${yt}" width="7" height="${y + 18 - yt}" fill="${IRON}"/><rect x="${x - 13}" y="${yt}" width="2.6" height="${y + 18 - yt}" fill="${IRON_L}"/><rect x="${x + 6}" y="${yt}" width="2.6" height="${y + 18 - yt}" fill="${IRON_L}"/><rect x="${x - 13}" y="${yt}" width="26" height="${y + 18 - yt}" fill="none" ${O(3.4)}/>`;
      const rv = []; for (let yy = yt + 14; yy < y + 10; yy += 24) rv.push([x - 9.5, yy], [x + 9.5, yy]); g += rivetsB(rv, 1.9);
      g += `<rect x="${bx0 - 2}" y="${yt - 12}" width="96" height="16" fill="${IRON_D}"/><rect x="${bx0 - 2}" y="${yt - 12}" width="96" height="5" fill="${IRON}"/><rect x="${bx0 - 2}" y="${yt - 12}" width="96" height="16" fill="none" ${O(3.2)}/>`;
      g += `<path d="M${x} ${yt + 28} L${x + out * 22} ${yt + 4}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${x} ${yt + 28} L${x + out * 22} ${yt + 4}" stroke="${IRON}" stroke-width="5" stroke-linecap="round"/>`;
    } else if (T.post === 'stalag') {   // природная колонна-сталагнат: гладкие плоскости, натёк, капля
      const w = 18 + r() * 6, d = `M${x - w - 6} ${y + 18} Q${x - w * 0.5} ${y - 50} ${x - 7} ${y - 70} Q${x - 3} ${yt + 30} ${x - w * 0.8} ${yt - 14} H${x + w * 0.8} Q${x + 4} ${yt + 30} ${x + 7} ${y - 70} Q${x + w * 0.5} ${y - 50} ${x + w + 6} ${y + 18} Z`;
      g += `<path d="${d}" fill="${T.wallL}"/><path d="M${x - w - 2} ${y + 14} Q${x - w * 0.5} ${y - 48} ${x - 5} ${y - 68} Q${x - 1} ${yt + 30} ${x - w * 0.6} ${yt - 12} H${x - w * 0.2} Q${x + 1} ${yt + 30} ${x - 1} ${y - 68} Q${x - w * 0.2} ${y - 46} ${x - w * 0.2} ${y + 14} Z" fill="${mix(T.wallL, '#bfe8ff', 0.14)}"/><path d="M${x + 4} ${y + 14} Q${x + w * 0.4} ${y - 40} ${x + 5} ${y - 66}" stroke="${mix(T.wallD, '#000000', 0.2)}" stroke-width="5" fill="none"/><path d="${d}" fill="none" ${O(3.4)}/>`;
      g += `<path d="M${x + 2} ${yt + 40} q-2 6 0 9 q2 -3 0 -9 Z" fill="#bfe8ff" ${O(1.4)}/>`;
    } else if (DEEP.has(T.id)) { g += deepPost(T, x, y, s, r, yt, bx0);   // 26.10 (art/mine-deep-main): пласты 31+
    } else {   // обсидиановый столб: грани, огненная жила со свечением; балка и цепь
      g += `<path d="M${x - 14} ${y + 18} L${x - 9} ${yt} L${x + 10} ${yt - 6} L${x + 14} ${y + 18} Z" fill="#1a0e16"/><path d="M${x - 14} ${y + 18} L${x - 9} ${yt} L${x - 2} ${yt - 2} L${x - 5} ${y + 18} Z" fill="#3a2430"/><path d="M${x - 11} ${yt + 30} l4 40" stroke="#a87890" stroke-width="1.8" stroke-opacity=".5"/>`
        + `<path d="M${x + 1} ${y + 10} l4 -26 l-5 -22 l6 -30 l-3 -28" stroke="#ff4a12" stroke-width="7" fill="none" stroke-opacity=".3" stroke-linejoin="round"/><path d="M${x + 1} ${y + 10} l4 -26 l-5 -22 l6 -30 l-3 -28" stroke="#ff9a2a" stroke-width="2.6" fill="none" stroke-linejoin="round"/><path d="M${x - 14} ${y + 18} L${x - 9} ${yt} L${x + 10} ${yt - 6} L${x + 14} ${y + 18} Z" fill="none" ${O(3.4, '#000')}/>`;
      g += `<path d="M${x + out * 4} ${yt} H${x + out * 70}" stroke="#000" stroke-width="17" stroke-linecap="round"/><path d="M${x + out * 4} ${yt} H${x + out * 70}" stroke="#2a1820" stroke-width="11" stroke-linecap="round"/><path d="M${x + out * 6} ${yt - 3} H${x + out * 68}" stroke="#4a3040" stroke-width="3" stroke-linecap="round"/>`;
      for (let k = 0; k < 5; k++) g += `<ellipse cx="${x + out * 64}" cy="${yt + 12 + k * 11}" rx="${k % 2 ? 2.5 : 4.5}" ry="6" fill="none" stroke="#000" stroke-width="4.4"/><ellipse cx="${x + out * 64}" cy="${yt + 12 + k * 11}" rx="${k % 2 ? 2.5 : 4.5}" ry="6" fill="none" stroke="#7a7a86" stroke-width="2.2"/>`;
    }
    return g;
  }
  // 25.10 (стример: фонарь «висел на стойке ни на чём»): светильник на кронштейне. Из стойки (px) в сторону стены (s: -1 слева,
  // 1 справа - там, где балка, а не над залом) выходит железный кронштейн с укосиной и пластиной на стойке; фонарь висит на крюке
  // у конца кронштейна рядом со стойкой, кристаллы, грибы и жаровня стоят на полочке-чаше. Порядок: стойка (раньше), кронштейн, светильник
  function lampMount(T, px, y, s, r) {
    const ya = y - 96 + (T.light === 'lantern' ? 0 : 30), lx = px + s * 38, IR = IRON;   // полочка - ниже балки: то, что на ней, не заходит на балку
    let g = `<rect x="${px - 7}" y="${ya - 7}" width="14" height="24" rx="2" fill="${IR}"/><rect x="${px - 7}" y="${ya - 7}" width="4" height="24" fill="${IRON_L}"/><rect x="${px - 7}" y="${ya - 7}" width="14" height="24" rx="2" fill="none" ${O(2.5)}/>`;   // пластина на стойке
    g += `<path d="M${px} ${ya} H${lx + s * 4} M${px} ${ya + 20} L${px + s * 24} ${ya}" stroke="${INK}" stroke-width="8.5" stroke-linecap="round"/><path d="M${px} ${ya} H${lx + s * 4} M${px} ${ya + 20} L${px + s * 24} ${ya}" stroke="${IR}" stroke-width="4.4" stroke-linecap="round"/><path d="M${px} ${ya - 1.4} H${lx + s * 3}" stroke="${IRON_L}" stroke-width="1.6" stroke-linecap="round"/>`;
    g += rivetsB([[px, ya - 1], [px, ya + 12]], 2);
    if (T.light === 'lantern') return lamp(T, lx, ya + 48, r, g + `<path d="M${lx} ${ya} v6 a4 4 0 1 1 -4 4" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`);
    // полочка-чаша на конце кронштейна: на ней кристаллы / грибы / жаровня
    const dish = `<path d="M${lx - 16} ${ya - 1} q16 13 32 0 Z" fill="${IR}"/><path d="M${lx - 13} ${ya - 0.5} q13 5 26 0" stroke="${IRON_L}" stroke-width="2" fill="none"/><path d="M${lx - 16} ${ya - 1} q16 13 32 0 Z" fill="none" ${O(2.6)}/>`;
    if (T.light === 'crystal') return lamp(T, lx, ya - 9, r, g, dish);
    if (T.light === 'shroom') return lamp(T, lx, ya - 14, r, g, dish + `<path d="${blob(lx, ya - 2, 15, 5, r, 7, 0.2)}" fill="#2f5a4a" ${O(2)}/>`);
    if (DEEP_LIGHT.has(T.light)) return lamp(T, lx, ya - 9, r, g, dish);   // 26.10: светильники пластов 31+ - тоже на полочке
    return lamp(T, lx, ya - 7, r, g, '', true);
  }
  // светильник: x, y - его место (у фонаря y - низ стекла); mount - кронштейн под ним, dish - полочка, noLegs - жаровня без ножек
  function lamp(T, x, y, r, mount = '', dish = '', noLegs = false) {
    let g = `<circle cx="${x}" cy="${y}" r="${f1(150 * T.glow + 40)}" fill="url(#mnbL)"/>` + mount + dish;
    if (T.light === 'lantern') g += `<path d="M${x} ${y - 32} v-8" stroke="${INK}" stroke-width="3"/><path d="M${x - 12} ${y - 26} L${x} ${y - 36} L${x + 12} ${y - 26} Z" fill="#4a4a58"/><path d="M${x - 8} ${y - 27} L${x} ${y - 33} L${x} ${y - 27} Z" fill="#6a6a7a"/><path d="M${x - 12} ${y - 26} L${x} ${y - 36} L${x + 12} ${y - 26} Z" fill="none" ${O(2.6)}/>`
      + `<path d="M${x - 11} ${y - 26} h22 l-3 32 h-16 Z" fill="${T.lc}"/><path d="M${x - 8} ${y - 24} h6 l-1 28 h-4 Z" fill="#fff6d0"/><path d="M${x} ${y - 2} q-5 -7 0 -14 q5 7 0 14 Z" fill="#ff9a2a"/><path d="M${x} ${y - 3} q-2.4 -3 0 -7 q2.4 4 0 7 Z" fill="#fff6c0"/><path d="M${x - 11} ${y - 26} h22 l-3 32 h-16 Z" fill="none" ${O(3.2)}/><path d="M${x - 10} ${y - 11} h20 M${x} ${y - 26} v6" stroke="${INK}" stroke-width="1.6" stroke-opacity=".55"/>`
      + `<rect x="${x - 10}" y="${y + 5}" width="20" height="6" rx="2" fill="#4a4a58"/><rect x="${x - 10}" y="${y + 5}" width="20" height="2.4" rx="1" fill="#6a6a7a"/><rect x="${x - 10}" y="${y + 5}" width="20" height="6" rx="2" fill="none" ${O(2.4)}/>`;
    else if (T.light === 'crystal') g += [[-8, -22, -14], [2, -34, 0], [10, -20, 16]].map(([dx, h, a]) => { const t = `transform="rotate(${a} ${x + dx} ${y + 8})"`, d = `M${x + dx - 6} ${y + 8} V${y + 8 + h * 0.7} L${x + dx} ${y + 8 + h} L${x + dx + 6} ${y + 8 + h * 0.7} V${y + 8} Z`; return `<path ${t} d="${d}" fill="${T.lc}"/><path ${t} d="M${x + dx - 6} ${y + 8} V${y + 8 + h * 0.7} L${x + dx} ${y + 8 + h} V${y + 8} Z" fill="${mix(T.lc, '#ffffff', 0.45)}"/><path ${t} d="${d}" fill="none" ${O(2.5)}/>`; }).join('');
    else if (T.light === 'shroom') g += [[-10, 0, 9], [6, -6, 12], [14, 6, 7]].map(([dx, dy, s]) => `<path d="M${x + dx} ${y + dy + 14} v${-s}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${x + dx} ${y + dy + 14} v${-s}" stroke="#d8f0e8" stroke-width="3.6" stroke-linecap="round"/><path d="M${x + dx - s} ${y + dy + 14 - s} q${s} ${-s * 1.3} ${s * 2} 0 Z" fill="${T.lc}"/><path d="M${x + dx - s * 0.7} ${y + dy + 14 - s * 1.05} q${s * 0.5} ${-s * 0.75} ${s} ${-s * 0.56}" stroke="#e8fff8" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M${x + dx - s} ${y + dy + 14 - s} q${s} ${-s * 1.3} ${s * 2} 0 Z" fill="none" ${O(2.5)}/>`).join('');
    else if (DEEP_LIGHT.has(T.light)) g += deepLamp(T, x, y, r);
    else g += `<path d="M${x - 17} ${y - 4} q17 23 34 0 Z" fill="#3a3440"/><path d="M${x - 14} ${y - 3} q14 8 28 0" stroke="#5a5466" stroke-width="2.4" fill="none"/><path d="M${x - 17} ${y - 4} q17 23 34 0 Z" fill="none" ${O(3, '#000')}/><path d="M${x - 11} ${y - 4} q2 -22 11 -28 q-2 12 6 6 q5 11 -2 22 Z" fill="#ff7a2a"/><path d="M${x - 6} ${y - 5} q2 -14 6 -18 q-1 8 4 4 q3 8 -1 14 Z" fill="#ffc04a"/><path d="M${x - 3} ${y - 6} q1 -7 3 -9 q0 5 2 3" fill="#fff2a0"/><path d="M${x - 11} ${y - 4} q2 -22 11 -28 q-2 12 6 6 q5 11 -2 22 Z" fill="none" ${O(2, '#7a1a0a')}/>${noLegs ? '' : `<path d="M${x} ${y + 12} v14 M${x - 10} ${y + 26} h20" stroke="#3a3440" stroke-width="4"/>`}`;
    return g;
  }

  /* ---------- украшения стен (только на стенах, в нишах и на кромке за сеткой) ---------- */
  const isLeft = (x) => x < 0;
  function root(x, y, len, r, c = '#3e2614') { let d = `M${f1(x)} ${f1(y)}`, cx = x, cy = y; for (let k = 0; k < 3; k++) { const dx = -14 + r() * 28, dy = len / 3; d += ` q${f1(dx)} ${f1(dy * 0.5)} ${f1(dx * 0.4)} ${f1(dy)}`; cx += dx * 0.4; cy += dy; } return `<path d="${d}" stroke="${INK}" stroke-width="${f1(7 + r() * 3)}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="${f1(4 + r() * 2)}" fill="none" stroke-linecap="round"/><path d="M${f1(x + (cx - x) * 0.5)} ${f1(y + (cy - y) * 0.5)} q${f1(r() < 0.5 ? -14 : 14)} 8 ${f1(r() < 0.5 ? -20 : 20)} 22" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; }
  const tuft = (x, y, c, s = 1) => `<path d="M${f1(x)} ${f1(y)} l${f1(-7 * s)} ${f1(-14 * s)} M${f1(x)} ${f1(y)} l${f1(1 * s)} ${f1(-18 * s)} M${f1(x)} ${f1(y)} l${f1(7 * s)} ${f1(-12 * s)}" stroke="${INK}" stroke-width="${f1(5.5 * s)}" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y)} l${f1(-7 * s)} ${f1(-14 * s)} M${f1(x)} ${f1(y)} l${f1(1 * s)} ${f1(-18 * s)} M${f1(x)} ${f1(y)} l${f1(7 * s)} ${f1(-12 * s)}" stroke="${c}" stroke-width="${f1(3 * s)}" stroke-linecap="round"/>`;
  const pebble = (x, y, s, c, r) => `<path d="${blob(x, y, 9 * s, 6 * s, r, 6, 0.25)}" fill="${c}" ${O(2.5)}/><circle cx="${f1(x - 3 * s)}" cy="${f1(y - 2 * s)}" r="${f1(1.8 * s)}" fill="#fff" opacity=".35"/>`;
  function crystal(x, y, s, c, r, a0 = 0) { let g = `<circle cx="${f1(x)}" cy="${f1(y - 18 * s)}" r="${f1(46 * s)}" fill="url(#mnbA)"/>`; for (const [dx, h, a] of [[-10, 26, -22], [0, 40, -4], [11, 30, 18], [20, 18, 34]].slice(0, 2 + Math.floor(r() * 3))) { const bx = x + dx * s, hh = h * s, w = 6.5 * s; g += `<path transform="rotate(${a + a0} ${f1(bx)} ${f1(y)})" d="M${f1(bx - w)} ${f1(y)} V${f1(y - hh * 0.72)} L${f1(bx)} ${f1(y - hh)} L${f1(bx + w)} ${f1(y - hh * 0.72)} V${f1(y)} Z" fill="${c}" ${O(2.8)}/><path transform="rotate(${a + a0} ${f1(bx)} ${f1(y)})" d="M${f1(bx - w * 0.35)} ${f1(y - 3)} V${f1(y - hh * 0.68)}" stroke="#fff" stroke-width="${f1(2.2 * s)}" opacity=".7"/>`; } return g; }
  function shroom(x, y, s, c, r) { let g = `<circle cx="${f1(x)}" cy="${f1(y - 12 * s)}" r="${f1(40 * s)}" fill="url(#mnbL)"/>`; for (let k = 0; k < 2 + Math.floor(r() * 3); k++) { const dx = (-14 + r() * 28) * s, h = (10 + r() * 14) * s, w = (7 + r() * 7) * s; g += `<path d="M${f1(x + dx)} ${f1(y)} v${f1(-h)}" stroke="${INK}" stroke-width="${f1(6 * s)}" stroke-linecap="round"/><path d="M${f1(x + dx)} ${f1(y)} v${f1(-h)}" stroke="#e8f4ee" stroke-width="${f1(3.5 * s)}" stroke-linecap="round"/><path d="M${f1(x + dx - w)} ${f1(y - h)} q${f1(w)} ${f1(-w * 1.4)} ${f1(w * 2)} 0 Z" fill="${c}" ${O(2.5)}/><circle cx="${f1(x + dx - w * 0.3)}" cy="${f1(y - h - w * 0.45)}" r="${f1(w * 0.18)}" fill="#fff" opacity=".85"/>`; } return g; }
  const lavaCrack = (x, y, len, r) => { let d = `M${f1(x)} ${f1(y)}`; for (let k = 0; k < 4; k++) d += ` l${f1(len / 4)} ${f1(-14 + r() * 28)}`; return `<path d="${d}" stroke="#ff4a12" stroke-width="12" fill="none" opacity=".25" stroke-linecap="round"/><path d="${d}" stroke="#1a0606" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#ff9a2a" stroke-width="3" fill="none" stroke-linecap="round"/>`; };
  const stalactite = (x, y, h, c) => `<path d="M${f1(x - h * 0.22)} ${f1(y)} Q${f1(x - 3)} ${f1(y + h * 0.6)} ${f1(x)} ${f1(y + h)} Q${f1(x + 3)} ${f1(y + h * 0.6)} ${f1(x + h * 0.22)} ${f1(y)} Z" fill="${c}" ${O(3)}/>`;

  /* ---------- 26.10 (art/mine-deep-main): пласты глубже бездны (31+) ----------
     Рисунки и палитры - из PR #65 (art/mine-deep), перерисованы в стиле art/mine-layers (#59): плоские тона, светлая плоскость
     сверху-слева, тень снизу-справа, толстый тёмный контур, плитки без швов (wrapIn). Ветки 1-30 не тронуты: всё ниже вызывается
     только для пластов из DEEP, их случайность - свои вызовы r() после общих (рисунок 1-30 не сдвигается). */
  const DEEP_LIGHT = new Set(['rune', 'amber', 'prism', 'core']);
  const RAINBOW = ['#ff8a9a', '#ffc46a', '#f0ec7a', '#7ae8a0', '#6ac8ff', '#b48aff'];
  const deg = (a) => a * 180 / Math.PI;
  const poly = (Q) => `M${Q.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L')} Z`;
  const lite = (c, k = 0.14) => mix(c, '#ffffff', k), dark = (c, k = 0.35) => mix(c, '#000000', k);
  // гранёный самоцвет: светлая площадка сверху, тёмная грань справа, толстый контур
  function gem(x, y, s, c) {
    const w = 14 * s, h = 18 * s, t = y - h * 0.3, D = `M${f1(x - w)} ${f1(t)} L${f1(x - w * 0.5)} ${f1(y - h)} H${f1(x + w * 0.5)} L${f1(x + w)} ${f1(t)} L${f1(x)} ${f1(y + h)} Z`;
    return `<path d="${D}" fill="${c}"/><path d="M${f1(x + w * 0.3)} ${f1(t)} L${f1(x)} ${f1(y + h)} L${f1(x + w)} ${f1(t)} Z" fill="${dark(c, 0.3)}"/>`
      + `<path d="M${f1(x - w * 0.5)} ${f1(y - h)} L${f1(x - w * 0.3)} ${f1(t)} H${f1(x + w * 0.3)} L${f1(x + w * 0.5)} ${f1(y - h)} Z" fill="${lite(c, 0.45)}"/>`
      + `<path d="M${f1(x - w)} ${f1(t)} H${f1(x + w)} M${f1(x - w * 0.3)} ${f1(t)} L${f1(x)} ${f1(y + h)}" stroke="${dark(c, 0.5)}" stroke-width="${f1(1.4 * s)}" fill="none"/><path d="${D}" fill="none" ${O(f1(2.2 + s * 0.6))}/>`;
  }
  // кристалл-сосулька со свода (остриём вниз): светлая грань слева
  const hangCrystal = (x, y, h, c) => { const w = h * 0.16; return `<circle cx="${f1(x)}" cy="${f1(y + h * 0.8)}" r="${f1(h * 0.6)}" fill="url(#mnbA)"/><path d="M${f1(x - w)} ${f1(y)} V${f1(y + h * 0.72)} L${f1(x)} ${f1(y + h)} L${f1(x + w)} ${f1(y + h * 0.72)} V${f1(y)} Z" fill="${c}"/><path d="M${f1(x - w)} ${f1(y)} V${f1(y + h * 0.72)} L${f1(x)} ${f1(y + h)} V${f1(y)} Z" fill="${lite(c, 0.4)}"/><path d="M${f1(x - w)} ${f1(y)} V${f1(y + h * 0.72)} L${f1(x)} ${f1(y + h)} L${f1(x + w)} ${f1(y + h * 0.72)} V${f1(y)} Z" fill="none" ${O(2.8)}/>`; };
  // руна гномов: мягкий ореол и яркая линия (d - своя или случайная)
  const RUNES = ['M0 -10 V10 M0 -10 L7 -3 M0 -2 L7 5', 'M-6 -10 L6 10 M6 -10 L-6 10', 'M-5 10 V-10 L5 -3 L-5 4', 'M-6 10 L0 -10 L6 10 M-3 2 H3', 'M0 -10 V10 M-6 -4 L0 2 L6 -4', 'M-6 -10 H6 L-6 10 H6', 'M0 -10 L6 0 L0 10 L-6 0 Z'];
  const runeP = (x, y, s, c, d, glow = true) => { const t = `transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"`; return (glow ? `<path ${t} d="${d}" stroke="${c}" stroke-width="7" fill="none" opacity=".22" stroke-linecap="round" stroke-linejoin="round"/>` : '') + `<path ${t} d="${d}" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const rune = (x, y, s, c, r) => runeP(x, y, s, c, RUNES[Math.floor(r() * RUNES.length)]);
  // отпечаток листа и аммонит (окаменевший лес)
  const leaf = (x, y, s, a, c) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)}) scale(${f1(s)})"><path d="M-18 0 Q0 -10 18 0 Q0 10 -18 0 Z" fill="${c}"/><path d="M-16 -1 Q0 -9 16 -1" stroke="${lite(c, 0.18)}" stroke-width="2.4" fill="none"/><path d="M-18 0 H18 M-8 0 l6 -5 M-8 0 l6 5 M2 0 l6 -4 M2 0 l6 4" stroke="${dark(c, 0.45)}" stroke-width="1.4" fill="none"/><path d="M-18 0 Q0 -10 18 0 Q0 10 -18 0 Z" fill="none" ${O(2)}/></g>`;
  const ammonite = (x, y, s, c) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><circle r="15" fill="${dark(c, 0.15)}"/><circle cx="-2" cy="-2.5" r="12" fill="${c}"/><path d="M0 0 a2.5 2.5 0 0 1 5 0 a5 5 0 0 1 -10 0 a7.5 7.5 0 0 1 15 0 a10 10 0 0 1 -20 0 a12.5 12.5 0 0 1 25 0" fill="none" stroke="${dark(c, 0.45)}" stroke-width="1.8"/><path d="M-9 -9 a12 12 0 0 1 14 -4" stroke="${lite(c, 0.35)}" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle r="15" fill="none" ${O(2.6)}/></g>`;
  // каменный ствол: светлая плоскость слева, тень справа, волокна, сучок, толстый контур
  function trunk(x, y0, y1, w, c, r) {
    const m = (y0 + y1) / 2, wb = w * 1.3, cd = dark(c, 0.45), D = `M${f1(x - w)} ${f1(y0)} Q${f1(x - w - 8)} ${f1(m)} ${f1(x - wb)} ${f1(y1)} H${f1(x + wb)} Q${f1(x + w + 8)} ${f1(m)} ${f1(x + w)} ${f1(y0)} Z`;
    let g = `<path d="${D}" fill="${c}"/><path d="M${f1(x - w)} ${f1(y0)} Q${f1(x - w - 8)} ${f1(m)} ${f1(x - wb)} ${f1(y1)} H${f1(x - wb * 0.45)} Q${f1(x - w * 0.5)} ${f1(m)} ${f1(x - w * 0.45)} ${f1(y0)} Z" fill="${lite(c, 0.16)}"/>`;
    g += `<path d="M${f1(x + w * 0.4)} ${f1(y0)} Q${f1(x + w * 0.6)} ${f1(m)} ${f1(x + wb * 0.6)} ${f1(y1)} H${f1(x + wb)} Q${f1(x + w + 8)} ${f1(m)} ${f1(x + w)} ${f1(y0)} Z" fill="${dark(c, 0.3)}"/>`;
    for (let k = 0; k < 3; k++) { const dx = (-0.4 + k * 0.4) * w; g += `<path d="M${f1(x + dx)} ${f1(y0 + 10 + r() * 30)} q${f1(-4 + r() * 8)} ${f1((y1 - y0) * 0.3)} ${f1(dx * 0.2)} ${f1((y1 - y0) * 0.6)}" stroke="${cd}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`; }
    const ky = y0 + (y1 - y0) * (0.3 + r() * 0.4);
    return g + `<path d="${D}" fill="none" ${O(3.4)}/><ellipse cx="${f1(x - w * 0.2)}" cy="${f1(ky)}" rx="${f1(w * 0.3)}" ry="${f1(w * 0.4)}" fill="${dark(c, 0.3)}" ${O(2.4)}/><ellipse cx="${f1(x - w * 0.2)}" cy="${f1(ky)}" rx="${f1(w * 0.12)}" ry="${f1(w * 0.18)}" fill="${cd}"/>`;
  }
  // арка из тёсаных камней с тёмным проёмом и руной на замковом камне
  function arch(x, y, w, h, c, T, r) {
    const cy = y - h + w, d = `M${f1(x - w)} ${f1(y)} V${f1(cy)} A${f1(w)} ${f1(w)} 0 0 1 ${f1(x + w)} ${f1(cy)} V${f1(y)}`;
    let g = `<path d="${d} Z" fill="#050403"/><path d="${d}" stroke="${INK}" stroke-width="30" fill="none"/><path d="${d}" stroke="${c}" stroke-width="23" fill="none"/><path d="M${f1(x - w - 8)} ${f1(y)} V${f1(cy)} A${f1(w + 8)} ${f1(w + 8)} 0 0 1 ${f1(x)} ${f1(cy - w - 8)}" stroke="${lite(c, 0.16)}" stroke-width="5" fill="none"/>`;
    for (let k = 0; k <= 8; k++) { const a = Math.PI + (k / 8) * Math.PI, cs = Math.cos(a), sn = Math.sin(a); g += `<path d="M${f1(x + cs * (w - 12))} ${f1(cy + sn * (w - 12))} L${f1(x + cs * (w + 12))} ${f1(cy + sn * (w + 12))}" stroke="${INK}" stroke-width="2.5"/>`; }
    for (let yy = cy + 30; yy < y - 10; yy += 34) for (const sx of [-1, 1]) g += `<path d="M${f1(x + sx * (w - 12))} ${f1(yy)} h${f1(sx * 24)}" stroke="${INK}" stroke-width="2.5"/>`;
    return g + `<rect x="${f1(x - 13)}" y="${f1(cy - w - 16)}" width="26" height="30" rx="3" fill="${lite(c, 0.1)}" ${O(3)}/>` + rune(x, cy - w - 1, 0.9, T.ac, r);
  }
  // колонна гномов: база, ствол (свет слева, тень справа, каннелюры), капитель или обломанный верх
  function column(x, y, h, w, c, broken) {
    const top = y - h, cd = dark(c, 0.35);
    let g = `<rect x="${f1(x - w - 8)}" y="${f1(y - 14)}" width="${f1(2 * w + 16)}" height="16" rx="2" fill="${c}"/><rect x="${f1(x - w - 8)}" y="${f1(y - 14)}" width="${f1(2 * w + 16)}" height="5" rx="2" fill="${lite(c, 0.16)}"/><rect x="${f1(x - w - 8)}" y="${f1(y - 14)}" width="${f1(2 * w + 16)}" height="16" rx="2" fill="none" ${O(3)}/>`;
    const tp = broken ? `L${f1(x + w)} ${f1(top + 10)} L${f1(x + w * 0.4)} ${f1(top - 4)} L${f1(x - w * 0.1)} ${f1(top + 12)} L${f1(x - w * 0.6)} ${f1(top)} L${f1(x - w)} ${f1(top + 8)}` : `L${f1(x + w)} ${f1(top)} L${f1(x - w)} ${f1(top)}`, D = `M${f1(x - w)} ${f1(y - 14)} L${f1(x + w)} ${f1(y - 14)} ${tp} Z`;
    g += `<path d="${D}" fill="${c}"/><rect x="${f1(x - w)}" y="${f1(top + 12)}" width="${f1(w * 0.45)}" height="${f1(Math.max(4, h - 26))}" fill="${lite(c, 0.14)}"/><rect x="${f1(x + w * 0.45)}" y="${f1(top + 12)}" width="${f1(w * 0.55)}" height="${f1(Math.max(4, h - 26))}" fill="${dark(c, 0.25)}"/>`;
    for (const k of [-0.5, 0, 0.5]) g += `<path d="M${f1(x + k * w)} ${f1(y - 18)} V${f1(top + 16)}" stroke="${cd}" stroke-width="2.2"/>`;
    g += `<path d="${D}" fill="none" ${O(3)}/>`;
    if (!broken) g += `<rect x="${f1(x - w - 10)}" y="${f1(top - 16)}" width="${f1(2 * w + 20)}" height="18" rx="2" fill="${lite(c, 0.06)}"/><rect x="${f1(x - w - 10)}" y="${f1(top - 16)}" width="${f1(2 * w + 20)}" height="6" rx="2" fill="${lite(c, 0.2)}"/><rect x="${f1(x - w - 10)}" y="${f1(top - 16)}" width="${f1(2 * w + 20)}" height="18" rx="2" fill="none" ${O(3)}/>`;
    return g;
  }
  // трещина с тёплым светом (сердце горы) - сверху вниз, мягче лавы
  const heartCrack = (x, y, len, r) => { let d = `M${f1(x)} ${f1(y)}`; for (let k = 0; k < 4; k++) d += ` l${f1(-12 + r() * 24)} ${f1(len / 4)}`; return `<path d="${d}" stroke="#ff7a3a" stroke-width="14" fill="none" opacity=".16" stroke-linecap="round"/><path d="${d}" stroke="#0a0402" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#ffb060" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; };
  // тёмная вода (подземное озеро): только на стенах и в нишах; берег - толстый контур, блики - светлые штрихи
  const lakeP = (cx, cy, rx, ry, T, r) => { let g = `<path d="${blob(cx, cy, rx, ry, r, 9, 0.1)}" fill="#06121a" ${O(4)}/><path d="${blob(cx, cy + ry * 0.15, rx * 0.86, ry * 0.7, r, 9, 0.1)}" fill="#0c2432"/>`;
    for (let k = 0; k < 4; k++) { const y = cy - ry * 0.4 + k * ry * 0.28, w = rx * (0.5 - k * 0.08); g += `<path d="M${f1(cx - w + r() * 20)} ${f1(y)} h${f1(w * 0.6)}" stroke="#7ac8f0" stroke-width="2.5" opacity="${f1(0.45 - k * 0.08)}" stroke-linecap="round"/>`; }
    return g + `<path d="M${f1(cx - rx * 0.7)} ${f1(cy - ry * 0.55)} q${f1(rx * 0.7)} ${f1(-ry * 0.3)} ${f1(rx * 1.4)} 0" stroke="#1e4a66" stroke-width="4" fill="none"/>`; };

  // плитка стены пластов 31+ (P = WP): ink - контур, как у пластов 1-30
  function deepWallTile(T, r, P, ink) {
    let g = ''; const sh = dark(T.wallD, 0.12);
    if (T.id === 'crystal') {   // тёмная порода крупными гранями (как гранит), в щелях - светящиеся кристаллики
      for (let k = 0; k < 10; k++) { const x = r() * P, y = r() * P, s = 24 + r() * 20, c = r() < 0.5 ? T.wallL : T.wall;
        const q = [[x, y - s], [x + s * 0.75, y - s * 0.15], [x + s * 0.45, y + s * 0.7], [x - s * 0.5, y + s * 0.6], [x - s * 0.8, y - s * 0.2]];
        g += wrapIn(P, x, y, s + 4, (X, Y) => { const Q = q.map(([a, b]) => [a - x + X, b - y + Y]); return `<path d="${poly(Q)}" fill="${c}"/><path d="${poly([Q[4], Q[0], Q[1], [X, Y]])}" fill="${mix(c, T.lc, 0.12)}"/><path d="${poly([[X, Y], Q[2], Q[3]])}" fill="${sh}"/><path d="${poly(Q)}" fill="none" ${O(2.4, ink)}/>`; }); }
      for (let k = 0; k < 7; k++) { const x = r() * P, y = r() * P, s = 4 + r() * 4, c = k % 3 ? T.lc : T.ac;
        g += wrapIn(P, x, y, s * 2, (X, Y) => `<path d="M${f1(X)} ${f1(Y - s * 1.6)} L${f1(X + s * 0.6)} ${f1(Y)} L${f1(X)} ${f1(Y + s * 0.5)} L${f1(X - s * 0.6)} ${f1(Y)} Z" fill="${c}" ${O(1.6, ink)}/><path d="M${f1(X - s * 0.2)} ${f1(Y - s)} V${f1(Y)}" stroke="#fff" stroke-width="1.2" opacity=".7"/>`); }
    } else if (T.id === 'lake') {   // мокрый гладкий камень: окатанные глыбы с синеватым бликом, потёки воды
      for (let k = 0; k < 10; k++) { const x = r() * P, y = r() * P, rx = 18 + r() * 22, ry = rx * (0.55 + r() * 0.2), C = tone(T, r() < 0.55 ? 1 : 0); C[1] = mix(C[1], '#9ad8ff', 0.16); g += wrapIn(P, x, y, rx + 6, (X, Y) => slab(X, Y, rx, ry, C, rng(hash('l' + k)), 2.6)); }
      for (let k = 0; k < 7; k++) { const x = r() * P, y = r() * P, l = 14 + r() * 26; g += wrapIn(P, x, y + l / 2, l, (X, Y) => `<path d="M${f1(X)} ${f1(Y - l / 2)} v${f1(l)}" stroke="#7ac8f0" stroke-width="2.6" stroke-linecap="round" opacity=".35"/>`); }
    } else if (T.id === 'dwarf') {   // тёсаная кладка гномов вперевязку: ровные блоки, светлая кромка сверху, тень снизу; на некоторых - стёртая руна
      for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 3; gx++) { const w = 76, h = 36, x = gx * 80 + (gy % 2) * 40 + 2, y = gy * 40 + 2, v = r(), c = v < 0.35 ? T.wallL : v < 0.7 ? mix(T.wall, T.wallL, 0.5) : T.wall, rd = r() < 0.14 ? RUNES[Math.floor(r() * RUNES.length)] : '';
        g += wrapIn(P, x + w / 2, y + h / 2, w, (X, Y) => `<rect x="${f1(X - w / 2)}" y="${f1(Y - h / 2)}" width="${w}" height="${h}" rx="4" fill="${c}"/><rect x="${f1(X - w / 2 + 4)}" y="${f1(Y - h / 2 + 3)}" width="${w - 10}" height="${f1(h * 0.3)}" rx="3" fill="${lite(c, 0.12)}"/><rect x="${f1(X - w / 2 + 6)}" y="${f1(Y + h * 0.2)}" width="${w - 8}" height="${f1(h * 0.28)}" rx="3" fill="${sh}"/><rect x="${f1(X - w / 2)}" y="${f1(Y - h / 2)}" width="${w}" height="${h}" rx="4" fill="none" ${O(2.6, ink)}/>` + (rd ? runeP(X, Y, 0.8, mix(T.ac, T.wall, 0.6), rd, false) : '')); }
    } else if (T.id === 'fossil') {   // окаменевшая древесина: стволы-волокна (свет слева, тень справа, контур), сучки с кольцами
      for (let k = 0; k < 6; k++) { const x = k * 40 + 20 + r() * 6, w = 15 + r() * 4, c = k % 2 ? T.wallL : mix(T.wall, T.wallL, 0.45);
        g += `<path d="M${f1(x - w)} -10 Q${f1(x - w - 5)} ${P / 2} ${f1(x - w)} ${P + 10} H${f1(x + w)} Q${f1(x + w + 5)} ${P / 2} ${f1(x + w)} -10 Z" fill="${c}"/><path d="M${f1(x - w + 4)} -10 Q${f1(x - w - 1)} ${P / 2} ${f1(x - w + 4)} ${P + 10}" stroke="${lite(c, 0.16)}" stroke-width="6" fill="none"/><path d="M${f1(x + w - 4)} -10 Q${f1(x + w + 1)} ${P / 2} ${f1(x + w - 4)} ${P + 10}" stroke="${sh}" stroke-width="6" fill="none"/><path d="M${f1(x - 2)} -10 q${f1(-4 + r() * 8)} ${P / 2} 0 ${P + 20}" stroke="${ink}" stroke-width="1.6" fill="none" opacity=".6"/><path d="M${f1(x + w)} -10 Q${f1(x + w + 5)} ${P / 2} ${f1(x + w)} ${P + 10}" stroke="${ink}" stroke-width="2.6" fill="none"/>`; }
      for (let k = 0; k < 3; k++) { const x = r() * P, y = r() * P, c = mix(T.wallL, '#6a6a4a', 0.3);
        g += wrapIn(P, x, y, 24, (X, Y) => `<ellipse cx="${f1(X)}" cy="${f1(Y)}" rx="14" ry="19" fill="${c}"/><ellipse cx="${f1(X - 2)}" cy="${f1(Y - 3)}" rx="9" ry="12" fill="${lite(c, 0.12)}"/><ellipse cx="${f1(X)}" cy="${f1(Y)}" rx="7" ry="10" fill="none" stroke="${ink}" stroke-width="1.6"/><ellipse cx="${f1(X)}" cy="${f1(Y)}" rx="2.5" ry="4" fill="${ink}"/><ellipse cx="${f1(X)}" cy="${f1(Y)}" rx="14" ry="19" fill="none" ${O(2.6, ink)}/>`); }
    } else if (T.id === 'mirror') {   // грани самоцвета: треугольная сетка (края - без сдвига, плитка стыкуется), у каждой грани свой отсвет
      const N = 4, s = P / N, pt = [];
      for (let j = 0; j <= N; j++) { pt[j] = []; for (let i = 0; i <= N; i++) { const e = i === 0 || i === N || j === 0 || j === N; pt[j][i] = [i * s + (e ? 0 : (r() - 0.5) * s * 0.5), j * s + (e ? 0 : (r() - 0.5) * s * 0.5)]; } }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = pt[j][i], b = pt[j][i + 1], c = pt[j + 1][i + 1], d = pt[j + 1][i];
        for (const [tri, up] of [[[a, b, c], 1], [[a, c, d], 0]]) { const v = r(), col = v < 0.1 ? mix(T.wallL, RAINBOW[Math.floor(r() * 6)], 0.16) : mix(T.wall, T.wallL, up ? 0.5 + v * 0.5 : v * 0.5); g += `<path d="${poly(tri)}" fill="${col}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>`; } }
      for (let k = 0; k < 6; k++) { const x = 12 + r() * (P - 36), y = 14 + r() * (P - 28); g += `<path d="M${f1(x)} ${f1(y)} l10 -10" stroke="#fff" stroke-width="2.2" opacity=".3" stroke-linecap="round"/>`; }
    } else {   // сердце горы: древние глыбы, из щелей между ними - тёплый свет
      for (let k = 0; k < 9; k++) { const x = r() * P, y = r() * P, rx = 20 + r() * 20, ry = rx * (0.6 + r() * 0.2), C = tone(T, r() < 0.55 ? 1 : 0); g += wrapIn(P, x, y, rx + 6, (X, Y) => slab(X, Y, rx, ry, C, rng(hash('h' + k)), 2.6)); }
      for (let k = 0; k < 4; k++) { const x = 20 + r() * (P - 40), y = 10 + r() * (P - 60), a = -8 + r() * 16, b = 10 + r() * 14, c = -8 + r() * 16, d = 10 + r() * 14, D = `M${f1(x)} ${f1(y)} l${f1(a)} ${f1(b)} l${f1(c)} ${f1(d)}`; g += `<path d="${D}" stroke="#0a0402" stroke-width="5" fill="none" stroke-linecap="round"/><path d="${D}" stroke="#ff9a4a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`; }
    }
    return g;
  }
  // плитка пола пластов 31+ (P = 200): приглушённо, без толстых контуров (по полу ходят)
  function deepFloorTile(T, r, P, L, D) {
    let g = '';
    if (T.id === 'crystal') {   // пол в кристаллической крошке: ромбики со светлой верхней гранью, искры
      for (let k = 0; k < 14; k++) { const x = r() * P, y = r() * P, s = 4 + r() * 5; g += wrapIn(P, x, y, s + 2, (X, Y) => `<path d="M${f1(X)} ${f1(Y - s)} L${f1(X + s * 0.6)} ${f1(Y)} L${f1(X)} ${f1(Y + s)} L${f1(X - s * 0.6)} ${f1(Y)} Z" fill="${D(0.05)}"/><path d="M${f1(X)} ${f1(Y - s)} L${f1(X + s * 0.6)} ${f1(Y)} L${f1(X - s * 0.6)} ${f1(Y)} Z" fill="${L(0.12)}"/>`); }
      for (let k = 0; k < 8; k++) g += `<circle cx="${f1(4 + r() * (P - 8))}" cy="${f1(4 + r() * (P - 8))}" r="${f1(1 + r() * 1.5)}" fill="${k % 2 ? T.lc : T.ac}" fill-opacity=".4"/>`;
    } else if (T.id === 'lake') {   // гладкие мокрые плиты: пятна со светлым верхом, блики воды
      for (let k = 0; k < 7; k++) { const x = r() * P, y = r() * P, rx = 16 + r() * 12; g += wrapIn(P, x, y, rx + 4, (X, Y) => `<path d="${blob(X, Y, rx, rx * 0.5, rng(hash('lf' + k)), 7)}" fill="${k % 2 ? L(0.05) : D(0.08)}" fill-opacity=".7"/>`); }
      for (let k = 0; k < 8; k++) g += `<path d="M${f1(r() * (P - 16))} ${f1(2 + r() * (P - 4))} h${f1(6 + r() * 8)}" stroke="#a8e0ff" stroke-width="2" stroke-opacity=".3" stroke-linecap="round"/>`;
    } else if (T.id === 'dwarf') {   // плиты мостовой гномов со светлой кромкой (руны на полу - не в плитке, а в floorMarks: без повтора)
      for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) { const x = gx * 100 + 4, y = gy * 100 + 4; g += `<rect x="${x}" y="${y}" width="92" height="92" rx="8" fill="${(gx + gy) % 2 ? L(0.04) : T.floor}" stroke="${D(0.1)}" stroke-width="2.4" stroke-opacity=".7"/><path d="M${x + 10} ${y + 6} h72" stroke="${L(0.14)}" stroke-width="3" stroke-linecap="round"/>`; }
    } else if (T.id === 'fossil') {   // срезы каменных стволов (годовые кольца) и отпечатки листьев
      for (let k = 0; k < 3; k++) { const x = r() * P, y = r() * P; g += wrapIn(P, x, y, 22, (X, Y) => `<ellipse cx="${f1(X)}" cy="${f1(Y)}" rx="20" ry="13" fill="${L(0.05)}"/>` + [6, 12].map((j) => `<ellipse cx="${f1(X)}" cy="${f1(Y)}" rx="${j * 1.5}" ry="${j}" fill="none" stroke="${D(0.12)}" stroke-width="1.8" stroke-opacity=".7"/>`).join('')); }
      for (let k = 0; k < 3; k++) { const x = 24 + r() * (P - 48), y = 24 + r() * (P - 48), a = r() * 360; g += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><path d="M-16 0 Q0 -9 16 0 Q0 9 -16 0 Z" fill="${D(0.08)}" fill-opacity=".7"/><path d="M-16 0 H16 M-6 0 l5 -4 M-6 0 l5 4 M3 0 l5 -3 M3 0 l5 3" stroke="${D(0.2)}" stroke-width="1.4" fill="none" stroke-opacity=".7"/></g>`; }
    } else if (T.id === 'mirror') {   // полированный пол в ромбах (шаг 50 - плитка стыкуется), радужные искры
      for (let k = -4; k <= 4; k++) g += `<path d="M${k * 50} 0 l${P} ${P} M${k * 50 + P} 0 l${-P} ${P}" stroke="${D(0.1)}" stroke-width="2.2" stroke-opacity=".6"/>`;
      for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) if (r() < 0.3) g += `<path d="M${k * 50 + 25} ${j * 50 + 6} l14 14 l-14 14 l-14 -14 Z" fill="${L(0.05)}"/>`;
      for (let k = 0; k < 6; k++) g += `<circle cx="${f1(4 + r() * (P - 8))}" cy="${f1(4 + r() * (P - 8))}" r="${f1(1 + r() * 1.5)}" fill="${RAINBOW[k]}" fill-opacity=".4"/>`;
    } else {   // древний камень, в швах - тёплый свет
      for (let k = 0; k < 7; k++) { const x = r() * P, y = r() * P, rx = 16 + r() * 12; g += wrapIn(P, x, y, rx + 4, (X, Y) => `<path d="${blob(X, Y, rx, rx * 0.6, rng(hash('hf' + k)), 7, 0.2)}" fill="${k % 2 ? L(0.05) : D(0.06)}" fill-opacity=".8"/>`); }
      for (let k = 0; k < 4; k++) { const x = 30 + r() * (P - 60), y = 20 + r() * (P - 40); g += `<path d="M${f1(x)} ${f1(y)} l${f1(-14 + r() * 28)} ${f1(-8 + r() * 16)} l${f1(-14 + r() * 28)} ${f1(-8 + r() * 16)}" stroke="#ff8a3a" stroke-width="1.6" fill="none" stroke-opacity=".4" stroke-linecap="round"/>`; }
    }
    return g;
  }
  // крепь пластов 31+: x - ось стойки, y - пол ряда, s - сторона (балка уходит в стену), yt - верх стойки, bx0 - начало перекладины
  function deepPost(T, x, y, s, r, yt, bx0) {
    let g = ''; const hgt = y + 18 - yt;
    if (T.post === 'crys') {   // стойка из тёмной стали (как клёпаный двутавр, в цвет пласта), обросшая кристаллами
      const SC = ['#3a3452', '#5a5276', '#262038'];
      g += `<rect x="${x - 12}" y="${yt}" width="24" height="${hgt}" fill="${SC[2]}"/><rect x="${x - 12}" y="${yt}" width="7" height="${hgt}" fill="${SC[0]}"/><rect x="${x + 5}" y="${yt}" width="7" height="${hgt}" fill="${SC[0]}"/><rect x="${x - 12}" y="${yt}" width="2.6" height="${hgt}" fill="${SC[1]}"/><rect x="${x + 5}" y="${yt}" width="2.6" height="${hgt}" fill="${SC[1]}"/><rect x="${x - 12}" y="${yt}" width="24" height="${hgt}" fill="none" ${O(3.4)}/>`;
      const rv = []; for (let yy = yt + 14; yy < y + 10; yy += 28) rv.push([x - 8.5, yy], [x + 8.5, yy]); g += rivetsB(rv, 1.8);
      g += `<rect x="${bx0 - 2}" y="${yt - 12}" width="96" height="16" fill="${SC[2]}"/><rect x="${bx0 - 2}" y="${yt - 12}" width="96" height="5" fill="${SC[1]}"/><rect x="${bx0 - 2}" y="${yt - 12}" width="96" height="16" fill="none" ${O(3.2)}/>`;
      g += crystal(x + s * 6, y + 16, 0.6, T.lc, r, s * 14) + crystal(x + s * 54, yt - 6, 0.45, T.ac, r, s * 30);
    } else if (T.post === 'pier') {   // мокрое бревно-свая: тёмное дерево, верёвочные обмотки, мох у основания, блик воды
      const WC = ['#4e3e2c', '#6a5640', '#33281c', '#241a10'];
      g += `<path d="${blob(x, y + 12, 22, 10, r, 7, 0.2)}" fill="#3e6a5a"/><path d="${blob(x - 4, y + 8, 12, 4, r, 6, 0.2)}" fill="#5e8e7a"/><path d="${blob(x, y + 12, 22, 10, r, 7, 0.2)}" fill="none" ${O(2.6)}/>`;
      g += beamV(x - 10, yt, 20, y + 6 - yt, WC) + beamH(bx0, yt - 12, 92, 18, WC);
      g += `<path d="M${x - 3} ${yt + 12} V${y - 24}" stroke="#a8d8f0" stroke-width="2" opacity=".35"/>`;
      for (const yy of [yt + 26, yt + 38, y - 30]) g += `<path d="M${x - 11} ${yy} l22 6" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/><path d="M${x - 11} ${yy} l22 6" stroke="#c8a870" stroke-width="3.4" stroke-linecap="round"/>`;
    } else if (T.post === 'column') {   // колонна гномов с руной и каменной перемычкой в стену
      const c = mix(T.wallL, '#8a7a6a', 0.55), lx = s < 0 ? x - 84 : x - 16;
      g += `<rect x="${lx}" y="${yt - 12}" width="100" height="22" rx="2" fill="${c}"/><rect x="${lx}" y="${yt - 12}" width="100" height="7" rx="2" fill="${lite(c, 0.16)}"/><rect x="${lx}" y="${yt + 4}" width="100" height="6" fill="${dark(c, 0.3)}"/><rect x="${lx}" y="${yt - 12}" width="100" height="22" rx="2" fill="none" ${O(3.4)}/>`;
      g += column(x, y + 18, hgt - 10, 11, c, false) + rune(x - 2, yt + 52, 0.8, T.ac, r);
    } else if (T.post === 'trunk') {   // окаменевший ствол, сук-перекладина в стену со срезом-кольцами
      const c = mix('#55513f', T.wallL, 0.2);
      g += `<path d="M${x} ${yt} H${x + s * 66}" stroke="${INK}" stroke-width="21" stroke-linecap="round"/><path d="M${x} ${yt} H${x + s * 66}" stroke="${c}" stroke-width="14" stroke-linecap="round"/><path d="M${x} ${yt - 3} H${x + s * 64}" stroke="${lite(c, 0.16)}" stroke-width="4.5" stroke-linecap="round"/>`;
      g += trunk(x, yt - 6, y + 18, 11, c, r) + `<circle cx="${x + s * 66}" cy="${yt}" r="8" fill="${lite(c, 0.18)}" ${O(2.6)}/><circle cx="${x + s * 66}" cy="${yt}" r="4" fill="none" stroke="${dark(c, 0.4)}" stroke-width="1.6"/>`;
    } else if (T.post === 'gem') {   // гранёный столб-самоцвет: светлая грань слева, тёмная справа, самоцвет-навершие
      const c = mix(T.wallL, T.ac, 0.3), cl = lite(c, 0.22), cd = dark(c, 0.35);
      g += `<rect x="${s < 0 ? x - 82 : x - 12}" y="${yt - 10}" width="94" height="16" rx="2" fill="${cd}"/><rect x="${s < 0 ? x - 82 : x - 12}" y="${yt - 10}" width="94" height="5" rx="2" fill="${c}"/><rect x="${s < 0 ? x - 82 : x - 12}" y="${yt - 10}" width="94" height="16" rx="2" fill="none" ${O(3.2)}/>`;
      g += `<path d="M${x - 13} ${y + 18} V${yt + 10} L${x - 3} ${yt} V${y + 18} Z" fill="${cl}"/><path d="M${x - 3} ${y + 18} V${yt} L${x + 13} ${yt + 10} V${y + 18} Z" fill="${cd}"/><path d="M${x - 9} ${yt + 16} V${y}" stroke="#fff" stroke-width="2" opacity=".45"/><path d="M${x - 13} ${y + 18} V${yt + 10} L${x - 3} ${yt} L${x + 13} ${yt + 10} V${y + 18} Z M${x - 3} ${yt} V${y + 18}" fill="none" ${O(3.2)}/>`;
      g += gem(x, yt - 8, 0.8, RAINBOW[Math.floor(r() * 6)]);
    } else {   // древний монолит с тёплой жилой (как обсидиановый столб бездны, но тёплый камень)
      g += `<rect x="${s < 0 ? x - 82 : x - 8}" y="${yt - 10}" width="90" height="18" fill="#2a1a14"/><rect x="${s < 0 ? x - 82 : x - 8}" y="${yt - 10}" width="90" height="5" fill="#3e2a20"/><rect x="${s < 0 ? x - 82 : x - 8}" y="${yt - 10}" width="90" height="18" fill="none" ${O(3.2, '#000')}/>`;
      g += `<path d="M${x - 14} ${y + 18} L${x - 10} ${yt} L${x + 11} ${yt - 4} L${x + 14} ${y + 18} Z" fill="#2a1a14"/><path d="M${x - 14} ${y + 18} L${x - 10} ${yt} L${x - 3} ${yt - 1} L${x - 5} ${y + 18} Z" fill="#40291e"/>`;
      g += `<path d="M${x + 1} ${y + 10} l3 -24 l-4 -20 l5 -28 l-2 -30" stroke="#ff7a3a" stroke-width="8" fill="none" opacity=".25" stroke-linejoin="round"/><path d="M${x + 1} ${y + 10} l3 -24 l-4 -20 l5 -28 l-2 -30" stroke="#ffb060" stroke-width="2.6" fill="none" stroke-linejoin="round"/><path d="M${x - 14} ${y + 18} L${x - 10} ${yt} L${x + 11} ${yt - 4} L${x + 14} ${y + 18} Z" fill="none" ${O(3.4, '#000')}/>`;
    }
    return g;
  }
  // светильники пластов 31+ (стоят на полочке-чаше кронштейна): свет - плоскость сверху-слева, контур
  function deepLamp(T, x, y, r) {
    if (T.light === 'rune') return `<path d="M${x - 14} ${y + 2} q14 14 28 0 Z" fill="#5a5048"/><path d="M${x - 11} ${y + 3} q11 5 22 0" stroke="#7a6e64" stroke-width="2" fill="none"/><path d="M${x - 14} ${y + 2} q14 14 28 0 Z" fill="none" ${O(2.8)}/><path d="M${x - 8} ${y} q0 -16 8 -24 q0 10 6 6 q4 10 -2 18 Z" fill="${T.lc}"/><path d="M${x - 4} ${y - 2} q1 -10 4 -14 q0 6 3 4 q2 6 -1 10 Z" fill="#fff6d8"/><path d="M${x - 8} ${y} q0 -16 8 -24 q0 10 6 6 q4 10 -2 18 Z" fill="none" ${O(2, '#6a3a0a')}/>` + rune(x, y + 7, 0.35, T.ac, r);
    if (T.light === 'amber') { const d = blob(x, y - 9, 12, 11, r, 7, 0.15); return `<path d="${d}" fill="${T.lc}"/><path d="${blob(x - 3, y - 13, 6, 4, r, 6)}" fill="#fff4c8"/><path d="M${x + 2} ${y - 6} l3 -2 M${x + 2} ${y - 6} l3 2 M${x + 2} ${y - 6} h-3" stroke="#5a2a06" stroke-width="1.5" stroke-linecap="round"/><path d="${d}" fill="none" ${O(2.8, '#5a2a06')}/>`; }   // янтарь с мошкой внутри
    if (T.light === 'prism') { let g = ''; for (let k = 0; k < 6; k++) { const a = (-150 + k * 24) * Math.PI / 180; g += `<path d="M${x} ${y - 12} l${f1(Math.cos(a) * 34)} ${f1(Math.sin(a) * 34)}" stroke="${RAINBOW[k]}" stroke-width="4" opacity=".5" stroke-linecap="round"/>`; }
      return g + `<path d="M${x - 12} ${y} L${x} ${y - 22} L${x + 12} ${y} Z" fill="${T.lc}"/><path d="M${x + 3} ${y} L${x} ${y - 22} L${x + 12} ${y} Z" fill="${dark(T.lc, 0.2)}"/><path d="M${x - 2} ${y - 4} L${x} ${y - 16}" stroke="#fff" stroke-width="2" opacity=".9"/><path d="M${x - 12} ${y} L${x} ${y - 22} L${x + 12} ${y} Z" fill="none" ${O(2.8)}/>`; }
    // сердце горы: тёплая сердцевина в трещинах
    return `<path d="${blob(x, y - 10, 13, 12, r, 8, 0.12)}" fill="${mix(T.lc, '#7a2a0a', 0.35)}" ${O(3, '#2a0a02')}/><path d="${blob(x, y - 10, 7, 6, r, 7, 0.15)}" fill="${T.ac}"/><path d="M${x - 10} ${y - 14} l6 3 l2 6 M${x + 9} ${y - 4} l-5 -3" stroke="#2a0a02" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="${x - 4}" cy="${y - 15}" r="2" fill="#fff8e0"/>`;
  }
  // стены и свод над залом пластов 31+ (после общих валунов, полос и трещин - как у 1-30)
  function deepWalls(T, G, H, r, narrow, sideX, cnt, x0, x1) {
    const W = G.W; let g = '';
    const vault = (step, vr, fn) => { for (let x = H.left[0][0] - 80; x < W + 80; x += step + r() * vr) { if (Math.abs(x - H.exitX) < 140) continue; g += fn(x, H.yTop - 150 - r() * 30); } };
    const side = (n, fn) => { for (let k = 0; k < cnt(n); k++) { const x = sideX(k % 2 === 0); g += fn(x, r() * G.H, k); } };
    if (T.id === 'crystal') {
      side(8, (x, y) => { let d = `M${f1(x)} ${f1(y)}`; for (let j = 0; j < 4; j++) d += ` l${f1(-20 + r() * 40)} ${f1(16 + r() * 26)}`; return `<path d="${d}" stroke="${T.lc}" stroke-width="10" fill="none" opacity=".14" stroke-linecap="round"/><path d="${d}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#efe2ff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`; });   // светящиеся жилы
      side(22, (x, y, k) => crystal(x, y, 0.8 + r(), k % 3 ? T.lc : T.ac, r, (isLeft(x) ? 1 : -1) * r() * 26));
      vault(30, 36, (x, y) => hangCrystal(x, y, 26 + r() * 40, r() < 0.6 ? T.lc : T.ac));
    } else if (T.id === 'lake') {
      side(24, (x, y) => `<path d="M${f1(x - 36)} ${f1(y)} q18 -8 36 0 t36 0" stroke="#9ad8ff" stroke-width="4" fill="none" opacity=".3" stroke-linecap="round"/>`);   // отблески воды на сводах
      side(12, (x, y) => { const h = 40 + r() * 60; return stalactite(x, y, h, T.wallL) + `<circle cx="${f1(x)}" cy="${f1(y + h + 7)}" r="2.6" fill="#cfefff" ${O(1.2)}/>`; });
      // тёмная вода у подножия сводов (за краем зала - по ней не ходят)
      if (!narrow) for (const left of [true, false]) { const cx = left ? x0 * 0.55 : W + (x1 - W) * 0.45, rx = (left ? -x0 : x1 - W) * 0.42; g += lakeP(cx, G.H - 150 - r() * 60, rx, 54 + r() * 20, T, r) + lakeP(cx + (r() - 0.5) * rx * 0.4, G.H * (0.3 + r() * 0.25), rx * 0.7, 40 + r() * 14, T, r); }
      vault(24, 30, (x, y) => { const h = 26 + r() * 44; return stalactite(x, y, h, T.wallL) + `<circle cx="${f1(x)}" cy="${f1(y + h + 7)}" r="2.6" fill="#cfefff" ${O(1.2)}/>`; });
    } else if (T.id === 'dwarf') {
      const c = mix(T.wallL, '#8a7a6a', 0.5);
      side(18, (x, y) => rune(x, y, 1 + r() * 0.7, T.ac, r));
      side(6, (x, y) => `<g transform="rotate(${f1(-70 + r() * 140)} ${f1(x)} ${f1(y)})">${column(x, y + 40, 80, 14, c, true)}</g>`);   // обломки колонн в стене
      vault(70, 30, (x, y) => `<path d="M${f1(x - 18)} ${f1(y - 6)} h36 l-8 30 h-20 Z" fill="${c}"/><path d="M${f1(x - 18)} ${f1(y - 6)} h36 l-2 8 h-32 Z" fill="${lite(c, 0.16)}"/><path d="M${f1(x - 18)} ${f1(y - 6)} h36 l-8 30 h-20 Z" fill="none" ${O(3)}/>` + (r() < 0.4 ? rune(x, y + 10, 0.55, T.ac, r) : ''));   // резные консоли
    } else if (T.id === 'fossil') {
      const c = mix('#4a4738', T.wallL, 0.3);
      side(5, (x, y) => trunk(x, y - 160 - r() * 80, y + 120, 16 + r() * 10, c, r));
      side(10, (x, y) => root(x, y, 60 + r() * 80, r, '#4e4a3a'));
      side(16, (x, y) => leaf(x, y, 0.9 + r() * 0.8, r() * 360, mix(T.wallL, '#8a9a5a', 0.35)));
      side(5, (x, y) => ammonite(x, y, 0.8 + r() * 0.6, mix(T.wallL, '#a89878', 0.5)));
      vault(36, 30, (x, y) => root(x, y - 20, 30 + r() * 60, r, '#5a5646'));
    } else if (T.id === 'mirror') {
      side(16, (x, y, k) => { let p = ''; const n = 2 + Math.floor(r() * 3); for (let j = 0; j < n; j++) p += gem(x - 20 + r() * 40, y - 16 + r() * 32, 0.8 + r() * 0.9, mix(RAINBOW[(k + j) % 6], T.wallL, 0.3)); return `<circle cx="${f1(x)}" cy="${f1(y)}" r="60" fill="url(#mnbA)"/>` + p; });
      side(20, (x, y, k) => `<path d="M${f1(x)} ${f1(y)} l${f1(14 + r() * 16)} ${f1(-14 - r() * 16)}" stroke="${RAINBOW[k % 6]}" stroke-width="3" opacity=".35" stroke-linecap="round"/>`);   // радужные блики
      vault(30, 36, (x, y) => hangCrystal(x, y, 24 + r() * 40, mix(RAINBOW[Math.floor(r() * 6)], '#ffffff', 0.2)));
    } else {
      side(18, (x, y) => heartCrack(x, y - 60, 120 + r() * 120, r));
      side(10, (x, y) => { const rx = 40 + r() * 40; return slab(x, y, rx, rx * 0.6, tone(T, 1), r, 3.4, 8, 0.14) + `<path d="${blob(x, y, rx * 1.02, rx * 0.62, r, 7, 0.14)}" fill="none" stroke="#ff8a3a" stroke-width="1.5" opacity=".3"/>`; });   // древние глыбы с тёплыми швами
      vault(34, 40, (x, y) => { const h = 22 + r() * 40; return stalactite(x, y, h, '#2a1a14') + `<circle cx="${f1(x)}" cy="${f1(y + h - 3)}" r="5" fill="#ff9a4a" opacity=".35"/><circle cx="${f1(x)}" cy="${f1(y + h - 3)}" r="2.5" fill="#ffd27a"/>`; });
    }
    return g;
  }
  // крупные украшения сводов пластов 31+ (только ПК: на узком экране боков почти нет). Всё - за краем зала, под полом зала.
  // Места - как у art/mine-bg (#58, setPieces): n штук на сторону, равномерно по высоте, со случайным сдвигом
  function deepSet(T, G, H, r) {
    const W = G.W, x0 = G.VX0, x1 = G.VX0 + G.VW; let g = '';
    const at = (left, k, n) => [left ? x0 + 70 + r() * (-x0 - 170) : W + 100 + r() * (x1 - W - 170), 160 + ((k + 0.2 + r() * 0.6) / n) * (G.H - 320)];
    const each = (n, fn) => { for (const left of [true, false]) for (let k = 0; k < n; k++) { const [x, y] = at(left, k, n); g += fn(x, y, left); } };
    if (T.id === 'crystal') {
      // жеода: тёмная полость, кристаллы растут внутрь
      each(1, (x, y) => { const R = 70; let p = `<path d="${blob(x, y, R + 22, R * 0.8 + 18, r, 9, 0.12)}" fill="${T.wallL}" ${O(4)}/><path d="${blob(x - 6, y - 8, R + 6, R * 0.8, r, 9, 0.12)}" fill="${lite(T.wallL, 0.1)}"/><path d="${blob(x, y, R, R * 0.8, r, 9, 0.1)}" fill="#07050e" ${O(3)}/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${R}" ry="${f1(R * 0.8)}" fill="url(#mnbL)"/>`;
        for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2; p += crystal(x + Math.cos(a) * R * 0.92, y + Math.sin(a) * R * 0.74, 0.55 + r() * 0.35, k % 3 ? T.lc : T.ac, r, deg(a) - 90); }
        return p; });
      each(2, (x, y, left) => crystal(x, y, 2 + r() * 0.8, r() < 0.5 ? T.lc : T.ac, r, (left ? 1 : -1) * r() * 16));
    } else if (T.id === 'lake') {
      // озерцо с отражением сосулек и камнями у воды, сталагмиты
      each(1, (x, y) => lakeP(x, y, 150, 50, T, r) + [-90, -40, 20, 70, 110].map((dx) => { const h = 20 + r() * 30; return `<path d="M${f1(x + dx - h * 0.2)} ${f1(y - 30)} Q${f1(x + dx)} ${f1(y - 30 + h)} ${f1(x + dx + h * 0.2)} ${f1(y - 30)} Z" fill="#9ad8ff" opacity=".12"/>`; }).join('') + slab(x - 142, y - 10, 26, 18, tone(T, 1), r, 3) + slab(x + 148, y + 6, 20, 15, tone(T, 0), r, 3));
      each(2, (x, y) => { let p = ''; for (const [dx, h] of [[-22, 46 + r() * 30], [4, 70 + r() * 40], [26, 36 + r() * 24]]) p += `<path d="M${f1(x + dx - h * 0.26)} ${f1(y)} Q${f1(x + dx - 4)} ${f1(y - h * 0.6)} ${f1(x + dx)} ${f1(y - h)} Q${f1(x + dx + 4)} ${f1(y - h * 0.6)} ${f1(x + dx + h * 0.26)} ${f1(y)} Z" fill="${T.wallL}" ${O(3)}/><path d="M${f1(x + dx - h * 0.1)} ${f1(y - 6)} Q${f1(x + dx - 3)} ${f1(y - h * 0.5)} ${f1(x + dx - 1)} ${f1(y - h * 0.85)}" stroke="${mix(T.wallL, '#9ad8ff', 0.4)}" stroke-width="3" fill="none"/>`; return `<ellipse cx="${f1(x)}" cy="${f1(y + 4)}" rx="56" ry="10" fill="#000" opacity=".3"/>` + p; });
    } else if (T.id === 'dwarf') {
      const c = mix(T.wallL, '#8a7a6a', 0.55);
      each(1, (x, y) => arch(x, y + 60, 54, 190, c, T, r));
      each(1, (x, y) => column(x - 30, y + 50, 150, 18, c, true) + `<g transform="rotate(${f1(70 + r() * 30)} ${f1(x + 50)} ${f1(y + 40)})">${column(x + 50, y + 40, 70, 18, c, true)}</g>`);   // колонна и упавший обломок
      each(1, (x, y) => { let p = `<rect x="${f1(x - 44)}" y="${f1(y - 58)}" width="88" height="116" rx="8" fill="${c}"/><rect x="${f1(x - 44)}" y="${f1(y - 58)}" width="88" height="14" rx="8" fill="${lite(c, 0.16)}"/><rect x="${f1(x - 44)}" y="${f1(y - 58)}" width="88" height="116" rx="8" fill="none" ${O(3.5)}/><rect x="${f1(x - 36)}" y="${f1(y - 44)}" width="72" height="94" rx="5" fill="${dark(c, 0.3)}"/>`; for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) p += rune(x - 16 + j * 32, y - 26 + k * 28, 0.75, T.ac, r); return p; });   // скрижаль
    } else if (T.id === 'fossil') {
      const c = mix('#4e4a3a', T.wallL, 0.2);
      each(1, (x, y) => { let p = '';   // ствол-исполин: сучья, срез сверху, каменные корни
        for (const [sx, yy] of [[-1, -150], [1, -60]]) p += `<path d="M${f1(x + sx * 30)} ${f1(y + yy)} l${f1(sx * 52)} -30" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M${f1(x + sx * 30)} ${f1(y + yy)} l${f1(sx * 52)} -30" stroke="${c}" stroke-width="15" stroke-linecap="round"/><path d="M${f1(x + sx * 30)} ${f1(y + yy - 4)} l${f1(sx * 48)} -28" stroke="${lite(c, 0.16)}" stroke-width="4" stroke-linecap="round"/>`;
        p += trunk(x, y - 260, y + 120, 42, c, r) + `<ellipse cx="${f1(x)}" cy="${f1(y - 260)}" rx="42" ry="12" fill="${lite(c, 0.15)}" ${O(3)}/>`;
        for (let j = 1; j <= 3; j++) p += `<ellipse cx="${f1(x)}" cy="${f1(y - 260)}" rx="${42 - j * 10}" ry="${12 - j * 3}" fill="none" stroke="${dark(c, 0.3)}" stroke-width="1.6"/>`;
        return p + root(x - 40, y + 110, 60, r, '#4e4a3a') + root(x + 44, y + 110, 50, r, '#4e4a3a'); });
      each(2, (x, y) => ammonite(x, y, 2 + r() * 0.8, mix(T.wallL, '#a89878', 0.55)));
      each(2, (x, y) => leaf(x, y, 2.4 + r(), r() * 360, mix(T.wallL, '#8a9a5a', 0.4)));
    } else if (T.id === 'mirror') {
      // друза самоцветов, от неё - радужный веер света
      each(2, (x, y, left) => { let p = ''; for (let k = 0; k < 6; k++) { const a = ((left ? -60 : -120) + (k - 2.5) * 9) * Math.PI / 180; p += `<path d="M${f1(x)} ${f1(y - 30)} l${f1(Math.cos(a) * 260)} ${f1(Math.sin(a) * 260)}" stroke="${RAINBOW[k]}" stroke-width="16" opacity=".09" stroke-linecap="round"/>`; }
        for (const [dx, dy, s] of [[-34, 10, 1.3], [30, 14, 1.2], [0, -20, 2], [-14, 34, 1], [20, 40, 0.9]]) p += gem(x + dx, y + dy, s, mix(RAINBOW[Math.floor(r() * 6)], T.wallL, 0.25));
        return `<circle cx="${f1(x)}" cy="${f1(y)}" r="120" fill="url(#mnbL)"/>` + p; });
    } else {
      // узел жил: от тёплой сердцевины по своду расходятся светящиеся трещины; древние монолиты с руной
      each(1, (x, y) => { let p = ''; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + r() * 0.3; let d = `M${f1(x)} ${f1(y)}`, px = x, py = y; for (let j = 0; j < 4; j++) { px += Math.cos(a) * 45 - 12 + r() * 24; py += Math.sin(a) * 45 - 12 + r() * 24; d += ` L${f1(px)} ${f1(py)}`; }
          p += `<path d="${d}" stroke="#ff7a3a" stroke-width="12" fill="none" opacity=".14" stroke-linecap="round"/><path d="${d}" stroke="#0a0402" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#ffb060" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }
        return `<circle cx="${f1(x)}" cy="${f1(y)}" r="150" fill="url(#mnbL)"/>` + p + `<path d="${blob(x, y, 46, 40, r, 9, 0.12)}" fill="#2a1a14" ${O(4, '#000')}/><path d="${blob(x, y, 30, 26, r, 8, 0.15)}" fill="${mix(T.lc, '#7a2a0a', 0.3)}" ${O(3, '#2a0a02')}/><path d="${blob(x, y, 16, 13, r, 7, 0.15)}" fill="${T.ac}"/><circle cx="${f1(x - 8)}" cy="${f1(y - 9)}" r="4" fill="#fff8e0" opacity=".85"/>`; });
      each(2, (x, y) => `<path d="M${f1(x - 30)} ${f1(y + 60)} L${f1(x - 22)} ${f1(y - 70)} L${f1(x + 24)} ${f1(y - 80)} L${f1(x + 32)} ${f1(y + 60)} Z" fill="#2a1a14"/><path d="M${f1(x - 30)} ${f1(y + 60)} L${f1(x - 22)} ${f1(y - 70)} L${f1(x - 8)} ${f1(y - 73)} L${f1(x - 12)} ${f1(y + 60)} Z" fill="#40291e"/><path d="M${f1(x - 30)} ${f1(y + 60)} L${f1(x - 22)} ${f1(y - 70)} L${f1(x + 24)} ${f1(y - 80)} L${f1(x + 32)} ${f1(y + 60)} Z" fill="none" ${O(4, '#000')}/>` + heartCrack(x, y - 60, 110, r) + rune(x + 4, y - 20, 1.1, '#ff9a4a', r));
    }
    return g;
  }
  // ниши: что лежит (вода и лава - только тут), и рисунок своих видов
  const deepNiche = (T, r) => (T.id === 'crystal' ? 'crystal' : T.id === 'lake' ? 'water' : T.id === 'dwarf' ? (r() < 0.5 ? 'rune' : 'stones') : T.id === 'fossil' ? (r() < 0.5 ? 'fossil' : 'stones') : T.id === 'mirror' ? 'gem' : 'lava');
  function deepNicheArt(T, kind, x, y, sg, r) {
    if (kind === 'rune') return slab(x, y, 22, 14, tone(T, 1), r, 3, 7, 0.12) + rune(x, y - 1, 0.6, T.ac, r);
    if (kind === 'fossil') return ammonite(x, y - 8, 1, mix(T.wallL, '#a89878', 0.5)) + leaf(x - sg * 18, y + 6, 0.7, r() * 360, mix(T.wallL, '#8a9a5a', 0.4));
    return `<circle cx="${f1(x)}" cy="${f1(y - 10)}" r="36" fill="url(#mnbA)"/>` + gem(x - 12, y, 0.8, mix(RAINBOW[0], T.wallL, 0.2)) + gem(x + 12, y + 2, 0.7, mix(RAINBOW[4], T.wallL, 0.2)) + gem(x, y - 12, 1, mix(RAINBOW[Math.floor(r() * 6)], T.wallL, 0.2));
  }
  // кромка зала: мелочь не крупнее 12 px
  function deepRim(T, x, y, c, r) {
    if (T.id === 'crystal') return crystal(x, y, 0.45, c < 0.2 ? T.ac : T.lc, r);
    if (T.id === 'lake') return pebble(x, y, 0.9, T.wallL, r) + `<path d="M${f1(x - 5)} ${f1(y - 3)} h6" stroke="#bfe8ff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
    if (T.id === 'dwarf') { const cc = mix(T.wallL, '#8a7a6a', 0.5); return `<rect x="${f1(x - 9)}" y="${f1(y - 6)}" width="18" height="10" rx="2" fill="${cc}"/><rect x="${f1(x - 9)}" y="${f1(y - 6)}" width="18" height="3.5" rx="1.5" fill="${lite(cc, 0.16)}"/><rect x="${f1(x - 9)}" y="${f1(y - 6)}" width="18" height="10" rx="2" fill="none" ${O(2.4)}/>`; }
    if (T.id === 'fossil') return ammonite(x, y, 0.45, mix(T.wallL, '#a89878', 0.5));
    if (T.id === 'mirror') return gem(x, y, 0.5, RAINBOW[Math.floor(c * 15) % 6]);
    return `<circle cx="${f1(x)}" cy="${f1(y)}" r="8" fill="#ff7a3a" opacity=".3"/><path d="${blob(x, y, 6, 4, r, 6)}" fill="#ffc070" ${O(2, '#2a0a02')}/>`;
  }
  // пол: только плоское - отсветы, отпечатки, искры
  function deepFloor(T, xr, yr, r) {
    let g = '';
    if (T.id === 'crystal') for (let k = 0; k < 10; k++) g += `<circle cx="${f1(xr())}" cy="${f1(yr())}" r="${f1(14 + r() * 18)}" fill="${k % 2 ? T.lc : T.ac}" opacity=".06"/>`;
    if (T.id === 'lake') for (let k = 0; k < 10; k++) g += `<ellipse cx="${f1(xr())}" cy="${f1(yr())}" rx="${f1(26 + r() * 30)}" ry="${f1(8 + r() * 8)}" fill="#7ac8f0" opacity=".06"/>`;
    if (T.id === 'dwarf') for (let k = 0; k < 5; k++) g += `<g opacity=".28">${rune(xr(), yr(), 1.2, T.ac, r)}</g>`;
    if (T.id === 'fossil') for (let k = 0; k < 8; k++) g += `<g opacity=".5">${leaf(xr(), yr(), 1 + r() * 0.8, r() * 360, mix(T.floorL, '#8a9a5a', 0.3))}</g>`;
    if (T.id === 'mirror') for (let k = 0; k < 14; k++) g += `<circle cx="${f1(xr())}" cy="${f1(yr())}" r="${f1(1.5 + r() * 2)}" fill="${RAINBOW[k % 6]}" opacity=".3"/>`;
    if (T.id === 'heart') for (let k = 0; k < 6; k++) g += `<circle cx="${f1(xr())}" cy="${f1(yr())}" r="${f1(20 + r() * 26)}" fill="#ff7a3a" opacity=".06"/>`;
    return g;
  }

  // всё, что на стенах (боковые своды, потолок над залом)
  function walls(T, G, H, r, narrow) {
    const x0 = narrow ? -80 : G.VX0, x1 = narrow ? G.W + 80 : G.VX0 + G.VW, W = G.W; let g = '';
    const sideX = (left) => (left ? x0 + r() * (H.SIDE * 0.15 - x0) : W - H.SIDE * 0.15 + r() * (x1 - W + H.SIDE * 0.15));
    // крупные валуны, вросшие в породу (контуром, как камни на полу) - разбивают повтор текстуры
    for (let k = 0; k < (narrow ? 10 : 34); k++) { const left = k % 2 === 0, x = sideX(left), y = r() * G.H, rx = 26 + r() * 50; g += slab(x, y, rx, rx * (0.55 + r() * 0.3), tone(T, r() < 0.7 ? 1 : 0), r, 3.4, 9, 0.2); }
    // пласты породы - волнистые полосы поперёк сводов (земля и глина - заметнее)
    const bands = T.id === 'roots' || T.id === 'clay' || T.acc === 'desert' ? 7 : 4;
    for (let k = 0; k < bands; k++) { const y = 120 + (k + r() * 0.6) * (G.H - 240) / bands, w = 14 + r() * 22, c = k % 2 ? T.wallL : T.wallD;
      for (const [a, b] of [[x0, -10], [W + 10, x1]]) g += `<path d="M${f1(a)} ${f1(y)} Q${f1((a + b) / 2)} ${f1(y - 30 + r() * 60)} ${f1(b)} ${f1(y + (-20 + r() * 40))}" stroke="${c}" stroke-width="${f1(w)}" fill="none" opacity="${T.id === 'clay' ? 0.6 : 0.35}"/>`; }
    // трещины по стенам
    for (let k = 0; k < (narrow ? 4 : 14); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; let d = `M${f1(x)} ${f1(y)}`; for (let j = 0; j < 4; j++) d += ` l${f1(-16 + r() * 32)} ${f1(14 + r() * 22)}`; g += `<path d="${d}" stroke="${T.wallD}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".8"/>`; }
    // свой рисунок пласта
    const n = narrow ? 0.4 : 1, cnt = (v) => Math.max(1, Math.round(v * n));
    if (T.id === 'roots') {
      for (let k = 0; k < cnt(22); k++) { const left = k % 2 === 0, x = sideX(left), y = r() * (G.H - 200); g += root(x, y, 60 + r() * 90, r); }
      for (let k = 0; k < cnt(10); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(r() * 360)})"><path d="M-14 0 q14 -10 28 0 q-14 10 -28 0 Z" fill="#e8dcc0" ${O(2.5)}/><path d="M-8 0 h16 M-4 -3 v6 M2 -3 v6" stroke="#b8a888" stroke-width="1.5"/></g>`; }   // камешки-окаменелости
      // трава и корни свисают с потолка над залом
      for (let x = H.left[0][0] - 60; x < W + 60; x += 34 + r() * 30) { if (Math.abs(x - H.exitX) < 140) continue; const y = H.yTop - 120 - r() * 40; g += root(x, y - 20, 30 + r() * 60, r); }
    } else if (T.id === 'clay') {
      for (let x = H.left[0][0] - 80; x < W + 80; x += 30 + r() * 40) { if (Math.abs(x - H.exitX) < 140) continue; const y = H.yTop - 150 - r() * 30, h = 18 + r() * 24; g += `<path d="M${f1(x - 12)} ${f1(y)} Q${f1(x - 10)} ${f1(y + h * 0.7)} ${f1(x)} ${f1(y + h)} Q${f1(x + 10)} ${f1(y + h * 0.7)} ${f1(x + 12)} ${f1(y)} Z" fill="${T.wallL}" ${O(3)}/><path d="M${f1(x - 7)} ${f1(y + 2)} Q${f1(x - 6)} ${f1(y + h * 0.5)} ${f1(x - 1)} ${f1(y + h * 0.75)}" stroke="${mix(T.wallL, '#ffffff', 0.2)}" stroke-width="3" fill="none"/>`; }   // глиняные натёки
      for (let k = 0; k < cnt(8); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<path d="M${f1(x - 18)} ${f1(y)} q18 -26 36 0 l-6 10 h-24 Z" fill="#c87a4a" ${O(2.5)} transform="rotate(${f1(-30 + r() * 60)} ${f1(x)} ${f1(y)})"/>`; }   // черепки в глине
      for (let k = 0; k < cnt(6); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += pebble(x, y, 1.6, '#d8b088', r) + pebble(x + 18, y + 8, 1, T.wallL, r); }
    } else if (T.id === 'stone') {
      for (let x = H.left[0][0] - 80; x < W + 80; x += 26 + r() * 34) { if (Math.abs(x - H.exitX) < 140) continue; g += stalactite(x, H.yTop - 150 - r() * 30, 20 + r() * 34, T.wallL); }
      for (let k = 0; k < cnt(10); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<path d="M${f1(x)} ${f1(y)} v${f1(40 + r() * 80)}" stroke="#7ab0c8" stroke-width="4" opacity=".35" stroke-linecap="round"/>`; }   // потёки воды
    } else if (T.id === 'granite') {
      for (let k = 0; k < cnt(14); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<path d="M${f1(x)} ${f1(y)} q${f1(30 + r() * 40)} ${f1(-10 + r() * 20)} ${f1(70 + r() * 60)} ${f1(-20 + r() * 40)}" stroke="#d8d0e8" stroke-width="${f1(3 + r() * 3)}" fill="none" opacity=".35"/>`; }   // кварцевые жилы
      for (let k = 0; k < cnt(16); k++) { const x = sideX(k % 2 === 0), y = 60 + r() * (G.H - 60); g += crystal(x, y, 0.9 + r() * 0.8, k % 3 ? T.lc : T.ac, r, (isLeft(x) ? 1 : -1) * (r() * 20)); }
      for (let x = H.left[0][0] - 80; x < W + 80; x += 34 + r() * 40) { if (Math.abs(x - H.exitX) < 140) continue; g += stalactite(x, H.yTop - 150 - r() * 30, 26 + r() * 40, T.wallL); }
    } else if (T.id === 'grotto') {
      // подземный ручей по своду (только на стене - по нему не ходят)
      if (!narrow) for (const left of [true, false]) { const bx = left ? x0 + 120 + r() * 140 : x1 - 120 - r() * 140, pts = []; for (let y = -20; y <= G.H + 40; y += 120) pts.push([bx + (-50 + r() * 100), y]); const d = smooth(pts, false);
        g += `<path d="${d}" stroke="${INK}" stroke-width="44" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#1e5a78" stroke-width="36" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#3a8ab0" stroke-width="16" fill="none" stroke-linecap="round" opacity=".7"/><path d="${d}" stroke="#bff0ff" stroke-width="3" fill="none" stroke-dasharray="10 46" opacity=".8"/>`; }
      for (let k = 0; k < cnt(18); k++) { const x = sideX(k % 2 === 0), y = 40 + r() * (G.H - 40); g += shroom(x, y, 0.9 + r() * 0.8, k % 3 ? T.lc : T.ac, r); }
      for (let x = H.left[0][0] - 80; x < W + 80; x += 30 + r() * 40) { if (Math.abs(x - H.exitX) < 140) continue; const y = H.yTop - 150 - r() * 30, l = 30 + r() * 70; g += `<path d="M${f1(x)} ${f1(y)} v${f1(l)}" stroke="#9af0e0" stroke-width="1.5" opacity=".5"/><circle cx="${f1(x)}" cy="${f1(y + l)}" r="3" fill="#bff8ec"/><circle cx="${f1(x)}" cy="${f1(y + l)}" r="9" fill="#5ff0c8" opacity=".25"/>`; }   // светящиеся нити
    } else if (DEEP.has(T.id)) { g += deepWalls(T, G, H, r, narrow, sideX, cnt, x0, x1);   // 26.10 (art/mine-deep-main): пласты 31+
    } else {
      for (let x = H.left[0][0] - 80; x < W + 80; x += 34 + r() * 40) { if (Math.abs(x - H.exitX) < 140) continue; const y = H.yTop - 150 - r() * 30, h = 26 + r() * 40; g += `<path d="M${f1(x - 9)} ${f1(y)} L${f1(x)} ${f1(y + h)} L${f1(x + 9)} ${f1(y)} Z" fill="#1a0e16" ${O(3, '#000')}/><path d="M${f1(x - 5)} ${f1(y)} L${f1(x)} ${f1(y + h * 0.8)}" stroke="#6a4050" stroke-width="2"/><circle cx="${f1(x)}" cy="${f1(y + h - 3)}" r="6" fill="#ff6a1a" fill-opacity=".35"/><circle cx="${f1(x)}" cy="${f1(y + h - 3)}" r="2.2" fill="#ffc04a"/>`; }   // обсидиановые шипы с раскалёнными кончиками
      for (let k = 0; k < cnt(16); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += lavaCrack(x - 60, y, 120 + r() * 120, r); }
      for (let k = 0; k < cnt(10); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += crystal(x, y, 0.8 + r() * 0.6, '#3a2440', r, (isLeft(x) ? 1 : -1) * r() * 30); }   // обсидиан
      if (!narrow) for (const left of [true, false]) { const cx = left ? x0 + 160 + r() * 100 : x1 - 160 - r() * 100, cy = 500 + r() * (G.H - 1000); g += `<path d="${blob(cx, cy, 90, 200, r, 9, 0.2)}" fill="#ff4a12" opacity=".2"/><path d="${blob(cx, cy, 70, 180, r, 9, 0.2)}" fill="#050204" ${O(5, '#ff6a2a')}/>`; }   // пропасть в своде
    }
    // природа округа
    if (T.acc === 'ice') for (let k = 0; k < cnt(14); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<path d="${blob(x, y, 30 + r() * 30, 14 + r() * 10, r, 8)}" fill="#dff2ff" opacity=".35"/>` + stalactite(x, y - 6, 22 + r() * 30, '#dff2ff'); }
    if (T.acc === 'desert') for (let k = 0; k < cnt(10); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<path d="M${f1(x - 60)} ${f1(y)} q60 -24 120 0 Z" fill="#e8c088" ${O(2.5)} opacity=".8"/>`; }
    if (T.acc === 'swamp') for (let k = 0; k < cnt(14); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<path d="${blob(x, y, 24 + r() * 20, 12 + r() * 8, r, 7)}" fill="#5f9e3a" ${O(2.5)}/><path d="M${f1(x - 8)} ${f1(y + 8)} v${f1(14 + r() * 20)} M${f1(x + 10)} ${f1(y + 8)} v${f1(10 + r() * 16)}" stroke="#5f9e3a" stroke-width="3" stroke-linecap="round"/>`; }
    if (T.acc === 'blight') for (let k = 0; k < cnt(16); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(14 + r() * 16)}" fill="#c07aff" opacity=".18"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3 + r() * 3)}" fill="#e8c8ff" opacity=".85"/>`; }
    if (T.acc === 'coast') for (let k = 0; k < cnt(10); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<path d="M${f1(x - 10)} ${f1(y)} Q${f1(x)} ${f1(y - 22)} ${f1(x + 10)} ${f1(y)} Z" fill="#ffc8b8" ${O(2.2)}/><path d="M${f1(x)} ${f1(y - 16)} v13 M${f1(x - 5)} ${f1(y - 11)} l3 9 M${f1(x + 5)} ${f1(y - 11)} l-3 9" stroke="#c88878" stroke-width="1.5"/>`; }
    if (T.acc === 'ruin') for (let k = 0; k < cnt(8); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += `<g opacity=".85"><rect x="${f1(x - 40)}" y="${f1(y - 20)}" width="80" height="36" rx="3" fill="#8a847a" ${O(3)}/><rect x="${f1(x)}" y="${f1(y + 16)}" width="80" height="36" rx="3" fill="#7a746a" ${O(3)}/><path d="M${f1(x - 26)} ${f1(y - 2)} h22 M${f1(x - 15)} ${f1(y - 12)} v18" stroke="#4e4840" stroke-width="2.5"/></g>`; }
    if (T.acc === 'ash' && T.id !== 'abyss') for (let k = 0; k < cnt(8); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += lavaCrack(x - 50, y, 100 + r() * 80, r); }
    if ((T.acc === 'roots' || T.acc === 'meadow') && T.id !== 'roots' && themeIx(T.from) < 3) for (let k = 0; k < cnt(10); k++) { const x = sideX(k % 2 === 0), y = r() * G.H; g += root(x, y, 50 + r() * 70, r); }
    return g;
  }

  // кромка зала (между краем и сеткой камней) и ниши - сюда герои не заходят
  function rim(T, G, H, r) {
    let g = '';
    const at = (s, k) => (s === 'L' ? H.left : H.right)[k];
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1;
      // 25.10 (art/mine-layers): ряд глыб по краю зала - мультяшная кромка пещеры; глыба наполовину в стене, до сетки камней не достаёт
      const E = s === 'L' ? H.left : H.right;
      for (let k = 0; k < E.length; k++) {
        const [ex, y] = E[k]; if (y > H.yb - 30 || r() < 0.22) continue;
        const rx = 12 + r() * 10, x = ex - sg * rx * 0.35, lim = s === 'L' ? H.SIDE - 2 : G.W - H.SIDE + 2;
        if (s === 'L' ? x + rx > lim : x - rx < lim) continue;
        H.spots.push({ x, y, k: 'edge', w: rx });
        g += slab(x, y, rx, rx * (0.62 + r() * 0.2), tone(T, r() < 0.6 ? 1 : 0), r, 3, 7, 0.18);
      }
      // ниша: что-то своё - лужица (вода только тут: в нишу не войти), кристаллы, грибы, корни, камни
      for (const a of H.nich[s]) {
        const xEdge = s === 'L' ? H.SIDE * 0.25 - a.dep : G.W - H.SIDE * 0.25 + a.dep, xc = s === 'L' ? xEdge + a.dep * 0.55 : xEdge - a.dep * 0.55, y = a.cy;
        const kind0 = T.id === 'roots' ? (r() < 0.5 ? 'roots' : 'stones') : T.id === 'clay' ? (r() < 0.5 ? 'stones' : 'water') : T.id === 'stone' ? 'water' : T.id === 'granite' ? 'crystal' : T.id === 'grotto' ? (r() < 0.5 ? 'shroom' : 'water') : DEEP.has(T.id) ? deepNiche(T, r) : 'lava', kind = kind0;
        H.spots.push({ x: xc, y, k: kind, w: a.dep * 0.5 });
        if (kind === 'water') g += `<path d="${blob(xc, y + a.hh * 0.3, a.dep * 0.5, 12, r, 8, 0.15)}" fill="#2a5a78" ${O(3)}/><path d="M${f1(xc - a.dep * 0.25)} ${f1(y + a.hh * 0.3 - 3)} h${f1(a.dep * 0.2)}" stroke="#bfe8ff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`;
        if (kind === 'lava') g += `<path d="${blob(xc, y + a.hh * 0.3, a.dep * 0.5, 12, r, 8, 0.15)}" fill="#ff6a1a" ${O(3, '#2a0606')}/><path d="${blob(xc, y + a.hh * 0.3, a.dep * 0.3, 6, r, 7, 0.2)}" fill="#ffd27a"/>`;
        if (kind === 'crystal') g += crystal(xc, y + a.hh * 0.4, 0.9, r() < 0.5 ? T.lc : T.ac, r, -sg * 10);
        if (kind === 'shroom') g += shroom(xc, y + a.hh * 0.4, 1, T.lc, r);
        if (kind === 'roots') g += root(xc, y - a.hh * 0.8, a.hh * 1.2, r);
        if (kind === 'rune' || kind === 'fossil' || kind === 'gem') g += deepNicheArt(T, kind, xc, y + a.hh * 0.4, sg, r);
        if (kind === 'stones' || kind === 'roots') g += pebble(xc - 8, y + a.hh * 0.45, 1.4, T.wallL, r) + pebble(xc + 10, y + a.hh * 0.5, 1, T.floorL, r);
      }
      // вдоль кромки: камешки, трава / кристаллики / грибочки / угольки
      for (let k = 1; k < (s === 'L' ? H.left : H.right).length - 1; k += 2) {
        if (r() < 0.45) continue;
        const [ex, y] = at(s, k), x = ex + sg * (8 + r() * Math.max(4, H.SIDE * 0.95 - Math.abs((s === 'L' ? ex : G.W - ex)) - 10));
        if (s === 'L' ? x > H.SIDE - 14 : x < G.W - H.SIDE + 14) continue;   // крупнее 12 px не бывает - до сетки не дотянется
        if (y > H.yb - 20) continue;   // у входа - предметы и проход
        const c = r(); H.spots.push({ x, y, k: 'rim', w: 12 });
        if (T.id === 'roots' || T.acc === 'meadow') g += c < 0.6 ? tuft(x, y, T.id === 'roots' ? '#8fc04a' : '#6a8a3a') + (T.acc === 'meadow' && c < 0.25 ? `<circle cx="${f1(x + 6)}" cy="${f1(y - 16)}" r="4" fill="#fff2a0" ${O(2)}/>` : '') : pebble(x, y, 1, T.wallL, r);
        else if (DEEP.has(T.id) && c < 0.4) g += deepRim(T, x, y, c, r);
        else if (T.id === 'granite' && c < 0.35) g += crystal(x, y, 0.45, c < 0.18 ? T.ac : T.lc, r);
        else if (T.id === 'grotto' && c < 0.45) g += shroom(x, y, 0.5, T.lc, r);
        else if (T.id === 'abyss' && c < 0.3) g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="8" fill="#ff5a1a" opacity=".35"/><path d="${blob(x, y, 6, 4, r, 6)}" fill="#ffb03a" ${O(2, '#2a0606')}/>`;
        else g += pebble(x, y, 0.8 + r() * 0.6, c < 0.7 ? T.wallL : T.floorL, r);
      }
    }
    return g;
  }

  // пол зала: плоские пятна, трещины (никаких «стоящих» предметов - по полу ходят)
  function floorMarks(T, G, H, r) {
    let g = '';
    const xr = () => H.SIDE + r() * (G.W - H.SIDE * 2), yr = () => H.yTop + 40 + r() * (H.yBot - H.yTop - 80);
    for (let k = 0; k < 26; k++) g += `<path d="${blob(xr(), yr(), 40 + r() * 70, 20 + r() * 30, r, 8, 0.25)}" fill="${r() < 0.55 ? T.floorD : T.floorL}" opacity="${f1(0.18 + r() * 0.18)}"/>`;
    for (let k = 0; k < 14; k++) { let x = xr(), y = yr(), d = `M${f1(x)} ${f1(y)}`; for (let j = 0; j < 3 + Math.floor(r() * 3); j++) { x += -26 + r() * 52; y += -10 + r() * 20; d += ` L${f1(x)} ${f1(y)}`; } g += `<path d="${d}" stroke="${T.id === 'abyss' ? '#ff5a1a' : T.id === 'heart' ? '#ff8a3a' : T.floorD}" stroke-width="${T.id === 'abyss' || T.id === 'heart' ? 2.5 : 3}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${T.id === 'abyss' ? 0.5 : T.id === 'heart' ? 0.35 : 0.7}"/>`; }
    if (DEEP.has(T.id)) g += deepFloor(T, xr, yr, r);
    if (T.id === 'grotto') for (let k = 0; k < 10; k++) g += `<circle cx="${f1(xr())}" cy="${f1(yr())}" r="${f1(16 + r() * 20)}" fill="#5ff0c8" opacity=".07"/>`;
    if (T.id === 'roots') for (let k = 0; k < 8; k++) { const x = xr(), y = yr(); g += `<path d="M${f1(x)} ${f1(y)} q${f1(20 + r() * 20)} ${f1(-6 + r() * 12)} ${f1(46 + r() * 30)} ${f1(-4 + r() * 8)}" stroke="#4a3018" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>`; }
    return g;
  }

  /* ---------- картинка фона этажа ---------- */
  function svgOf(st, G, narrow) {
    const T = themeOf(st.n, st.biome), r = rng(hash(`${st.seed >>> 0}:${st.n}:loc`));
    const exitX = st.fl && st.fl.exit != null ? (G.W - 7 * G.CW) / 2 + (st.fl.exit % 7) * G.CW + G.CW / 2 : G.W / 2;
    const H = hallShape(G, r, exitX); H.exitX = exitX;
    const x0 = narrow ? -80 : G.VX0, VW = narrow ? G.W + 160 : G.VW;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} 0 ${VW} ${G.H}" width="${VW}" height="${G.H}"><defs>${wallTile(T)}${floorTile(T)}`
      + `<radialGradient id="mnbL"><stop offset="0" stop-color="${T.lc}" stop-opacity="${f1(0.55 * T.glow)}"/><stop offset=".45" stop-color="${T.lc}" stop-opacity="${f1(0.2 * T.glow)}"/><stop offset="1" stop-color="${T.lc}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="mnbA"><stop offset="0" stop-color="${T.ac}" stop-opacity=".45"/><stop offset="1" stop-color="${T.ac}" stop-opacity="0"/></radialGradient>`
      + `<linearGradient id="mnbTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="${T.top}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`
      + `<linearGradient id="mnbEL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="${T.edge}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`
      + `<linearGradient id="mnbER" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="${T.edge}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`
      + `<clipPath id="mnbH"><path d="${H.d}"/></clipPath></defs>`;
    s += `<rect x="${x0}" y="0" width="${VW}" height="${G.H}" fill="url(#mnbW)"/>`;
    s += walls(T, G, H, r, narrow);
    if (!narrow && DEEP.has(T.id)) s += deepSet(T, G, H, r);   // 26.10 (art/mine-deep-main): крупные украшения сводов пластов 31+ (только ПК)
    // затемнение сводов к краям экрана
    if (!narrow) s += `<rect x="${x0}" y="0" width="${-x0}" height="${G.H}" fill="url(#mnbEL)"/><rect x="${G.W}" y="0" width="${x0 + VW - G.W}" height="${G.H}" fill="url(#mnbER)"/>`;
    // пол зала: тень вдоль стены внутрь, текстура, пятна и трещины
    s += `<path d="${H.d}" fill="#000" opacity=".35" transform="translate(0 10)"/><path d="${H.d}" fill="url(#mnbF)"/>`;
    let pools = ''; for (let gy = 0; gy <= 12; gy += 4) { const y = G.Y0 + gy * G.RH - 20; for (const x of [H.SIDE * 0.5, G.W - H.SIDE * 0.5]) pools += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(150 * T.glow)}" ry="${f1(90 * T.glow)}" fill="url(#mnbL)" fill-opacity=".7"/>`; }   // пятна света на полу
    s += `<g clip-path="url(#mnbH)">${floorMarks(T, G, H, r)}${pools}<path d="${H.d}" fill="none" stroke="#000" stroke-width="44" opacity=".22"/></g>`;
    s += `<path d="${H.d}" fill="none" ${O(6)}/>`;
    s += rim(T, G, H, r);
    // крепь вдоль стен (каждые 2 ряда) и светильники (каждые 4)
    for (let gy = 0; gy <= 12; gy += 2) { const y = G.Y0 + gy * G.RH; for (const [x, sd] of [[H.SIDE * 0.5, -1], [G.W - H.SIDE * 0.5, 1]]) s += post(T, x, y, sd, r); }
    for (let gy = 0; gy <= 12; gy += 4) { const y = G.Y0 + gy * G.RH; for (const [x, sd] of [[H.SIDE * 0.5, -1], [G.W - H.SIDE * 0.5, 1]]) s += lampMount(T, x, y, sd, r); }
    // глубже - темнее к спуску (сверху)
    s += `<rect x="${x0}" y="0" width="${VW}" height="${G.TOP + 520}" fill="url(#mnbTop)"/>`;
    return { svg: s + '</svg>', T, H };
  }

  /* ---------- слой на странице ---------- */
  const CSS = `.mnb-bg{position:absolute;top:0;pointer-events:none;opacity:0;transition:opacity .9s ease;max-width:none;-webkit-user-drag:none;user-select:none}
.mnb-bg.on{opacity:1}
.mnb-bg.mnb-lite{transition:none}
.mnb-bg.wide{-webkit-mask-image:linear-gradient(to right,transparent,#000 7%,#000 93%,transparent);mask-image:linear-gradient(to right,transparent,#000 7%,#000 93%,transparent)}
.mnb-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 75% at 50% 55%,transparent 52%,var(--mnb-vc,rgba(0,0,0,.3)) 100%);transition:background .9s}
.mnb-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;contain:strict}
.mnb-fx i{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);border-radius:50%;background:var(--c);opacity:0;will-change:transform,opacity;animation:var(--a) var(--d) linear var(--dl) infinite}
.mnb-fx.idle i{animation-play-state:paused;visibility:hidden}
.mnb-fx[data-k="drip"] i,.mnb-fx[data-k="drop"] i{width:3px;height:10px;border-radius:2px}
.mnb-fx[data-k="spark"] i,.mnb-fx[data-k="spore"] i,.mnb-fx[data-k="ember"] i,.mnb-fx[data-k="glint"] i,.mnb-fx[data-k="rune"] i,.mnb-fx[data-k="prism"] i,.mnb-fx[data-k="heat"] i{box-shadow:0 0 6px 2px var(--c)}
.mnb-fx[data-k="glint"] i,.mnb-fx[data-k="prism"] i{border-radius:1px;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)}
.mnb-pulse{position:absolute;inset:0;background:radial-gradient(ellipse 75% 65% at 50% 58%,transparent 38%,var(--c) 100%);opacity:0;will-change:opacity;animation:mnb-pulse 5.2s ease-in-out infinite}
.mnb-fx.idle .mnb-pulse{animation-play-state:paused;visibility:hidden}
@keyframes mnb-pulse{0%,100%{opacity:0}50%{opacity:.55}}
@keyframes mnb-fall{0%{transform:translate3d(0,0,0);opacity:0}12%{opacity:var(--o)}85%{opacity:var(--o)}100%{transform:translate3d(var(--dx),var(--dy),0);opacity:0}}
@keyframes mnb-rise{0%{transform:translate3d(0,0,0);opacity:0}15%{opacity:var(--o)}50%{transform:translate3d(var(--dx),calc(var(--dy) * -.5),0)}85%{opacity:var(--o)}100%{transform:translate3d(0,calc(var(--dy) * -1),0);opacity:0}}
@keyframes mnb-tw{0%,100%{transform:scale(.2);opacity:0}50%{transform:scale(1);opacity:var(--o)}}
.mnb-nm{margin-left:.5em;font-weight:700;color:var(--mnb-ac,#ffe27a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:640px){.mnb-nm{display:none}}
.mnb-ban{position:absolute;left:50%;top:76px;transform:translate(-50%,0);z-index:4;pointer-events:none;text-align:center;padding:10px 26px 12px;border-radius:16px;background:rgba(10,8,16,.62);border:2px solid var(--mnb-ac,#ffe27a);color:#f3efe6;animation:mnb-ban 4.2s ease forwards;max-width:calc(100vw - 32px)}
.mnb-ban small{display:block;font:700 14px Golos Text,Arial,sans-serif;opacity:.8;letter-spacing:.04em}
.mnb-ban b{display:block;font:400 26px Russo One,Arial Black,sans-serif;color:var(--mnb-ac,#ffe27a);-webkit-text-stroke:1px #15122e;line-height:1.15}
.mnb-ban em{display:block;font:600 13px Golos Text,Arial,sans-serif;font-style:normal;opacity:.7}
@keyframes mnb-ban{0%{opacity:0;transform:translate(-50%,-10px)}12%{opacity:1;transform:translate(-50%,0)}78%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.mnb-fx{display:none}.mnb-ban{animation-name:mnb-ban-r}@keyframes mnb-ban-r{0%,100%{opacity:0}15%,80%{opacity:1}}}`;
  let cssOn = false;
  const css = () => { if (cssOn) return; cssOn = true; const el = document.createElement('style'); el.dataset.mnb = '1'; el.textContent = CSS; document.head.appendChild(el); };

  // пылинки пласта: до 12 точек (на телефоне - 6), чисто CSS
  const FX = {   // пылинки (до 12, на телефоне 6)
    crumb: { a: 'mnb-fall', c: ['#6a4a2e', '#8a6a44'], s: [3, 5], d: [7, 11], o: 0.7, dy: '65vh', dx: 12 },
    dust: { a: 'mnb-fall', c: ['#f0d0a8', '#ffe8c8'], s: [2, 4], d: [12, 18], o: 0.45, dy: '30vh', dx: 60 },
    drip: { a: 'mnb-fall', c: ['#9ad0e8', '#bfe8ff'], s: [3, 3], d: [2.2, 3.4], o: 0.6, dy: '38vh', dx: 0 },
    spark: { a: 'mnb-tw', c: ['#bfeaff', '#d8b8ff'], s: [3, 5], d: [2.6, 4.6], o: 0.9, dy: '0', dx: 0 },
    spore: { a: 'mnb-rise', c: ['#7ff8d8', '#9ad0ff'], s: [3, 5], d: [9, 14], o: 0.75, dy: '45vh', dx: 30 },
    ember: { a: 'mnb-rise', c: ['#ff8a2a', '#ffc04a'], s: [2, 4], d: [5, 9], o: 0.85, dy: '60vh', dx: 24 },
    // 26.10 (art/mine-deep-main): пласты 31+
    glint: { a: 'mnb-tw', c: ['#e4ccff', '#9af0ff'], s: [6, 9], d: [2.4, 4.2], o: 0.9, dy: '0', dx: 0 },   // блёстки кристаллов
    drop: { a: 'mnb-fall', c: ['#9ad8ff', '#d8f4ff'], s: [3, 3], d: [2.6, 3.8], o: 0.55, dy: '42vh', dx: 0 },   // капли со сводов
    rune: { a: 'mnb-rise', c: ['#ffd27a', '#7ae0ff'], s: [2, 4], d: [10, 16], o: 0.7, dy: '40vh', dx: 20 },   // искорки рун
    pollen: { a: 'mnb-fall', c: ['#d8d0a0', '#a8b878'], s: [2, 4], d: [14, 20], o: 0.5, dy: '35vh', dx: 50 },   // каменная пыльца
    prism: { a: 'mnb-tw', c: ['#ff8a9a', '#ffd27a', '#8af0a8', '#7ad0ff', '#c8a0ff', '#fff4e0'], s: [6, 9], d: [2.2, 4], o: 0.9, dy: '0', dx: 0 },   // радужные блики
    heat: { a: 'mnb-rise', c: ['#ff9a4a', '#ffd27a'], s: [2, 4], d: [7, 11], o: 0.7, dy: '50vh', dx: 18 },   // жар из трещин
  };
  function particles(S, T) {
    let el = S.el.querySelector('.mnb-fx');
    // 26.10 (iPhone, память): на телефоне / планшете глубже 30-го пласта (крупные блёстки со свечением, пульсация во весь экран) - без пылинок
    if (S.mnb && S.mnb.lite && DEEP.has(T.id)) { if (el) el.remove(); return; }
    if (el && el.dataset.k === T.fx) return;
    if (!el) { el = document.createElement('div'); el.className = 'mnb-fx'; el.setAttribute('aria-hidden', 'true'); S.view.appendChild(el); }
    const P = FX[T.fx] || FX.dust, r = rng(hash(T.id)), n = S.view.clientWidth < 700 ? 6 : 12; let h = '';
    const rise = P.a === 'mnb-rise', fall = P.a === 'mnb-fall';
    for (let k = 0; k < n; k++) { const s = P.s[0] + r() * (P.s[1] - P.s[0]), d = P.d[0] + r() * (P.d[1] - P.d[0]);
      h += `<i style="--x:${(3 + r() * 94).toFixed(1)}%;--y:${(fall ? -2 + r() * 50 : rise ? 55 + r() * 45 : 5 + r() * 90).toFixed(1)}%;--s:${s.toFixed(1)}px;--c:${P.c[k % P.c.length]};--a:${P.a};--d:${d.toFixed(1)}s;--dl:${(-r() * d).toFixed(1)}s;--o:${P.o};--dy:${P.dy};--dx:${((r() - 0.5) * 2 * P.dx).toFixed(0)}px"></i>`; }
    // «Сердце горы»: еле заметная пульсация тёплого света по краям экрана - одна CSS-анимация opacity внутри .mnb-fx
    // (при «меньше движения» .mnb-fx нет вовсе; в простое 30 с - замирает и прячется, как пылинки)
    if (T.pulse) h += `<b class="mnb-pulse" style="--c:rgba(${hx(T.lc).join(',')},.32)"></b>`;
    el.dataset.k = T.fx; el.innerHTML = h;
    // никто не трогает шахту 30 с (сайт открыт «фоном», стрим идёт) - пылинки замирают и прячутся: без них браузер не рисует кадры зря
    if (!S.mnbIdle) { const st = { at: Date.now() }, root = S.el, fx = () => root.querySelector('.mnb-fx'); S.mnbIdle = st;
      const poke = () => { st.at = Date.now(); const f = fx(); if (f && f.classList.contains('idle')) f.classList.remove('idle'); };
      for (const ev of ['pointermove', 'pointerdown', 'wheel', 'keydown']) root.addEventListener(ev, poke, { passive: true });
      const t = setInterval(() => { if (!root.isConnected) { clearInterval(t); return; } const f = fx(); if (f && Date.now() - st.at > 30000) f.classList.add('idle'); }, 5000); }
  }
  const VIG = (T) => `rgba(${hx(mix(T.wallD, '#000000', 0.6)).join(',')},${T.vig})`;
  const LAST = {};   // шахта (id + неделя) → прошлый пласт: надпись «Вы спустились…» только при смене

  // кэш картинок этажа: ключ → blob-URL (держим 2 последних)
  const URLS = new Map();
  // 25.10 (просьба стримера): за краем картинки этажа (широкий экран, 2560) - не тёмная полоса, а та же порода: плитка стены пласта
  // WP×WP (одна картинка на пласт, кэш до 4; --mnb-ts - 200 единиц сцены, плитка - WP/200 от неё), фоном самой шахты с тем же затемнением сводов; масштаб - как у сцены (--mnb-ts, mine.js fit)
  const TILES = new Map();
  function tileOf(T) {
    const k = `${T.id}|${T.wall}|${T.wallL}`;
    if (!TILES.has(k)) {
      TILES.set(k, URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${WP}" height="${WP}" viewBox="0 0 ${WP} ${WP}"><defs>${wallTile(T)}</defs><rect width="${WP}" height="${WP}" fill="url(#mnbW)"/></svg>`], { type: 'image/svg+xml' })));
      while (TILES.size > 4) { const [k0, u0] = TILES.entries().next().value; TILES.delete(k0); setTimeout(() => URL.revokeObjectURL(u0), 3000); }
    }
    return TILES.get(k);
  }
  function urlOf(key, make) {
    if (URLS.has(key)) return URLS.get(key);
    const u = URL.createObjectURL(new Blob([make()], { type: 'image/svg+xml' }));
    URLS.set(key, u);
    while (URLS.size > 2) { const [k0, u0] = URLS.entries().next().value; URLS.delete(k0); setTimeout(() => URL.revokeObjectURL(u0), 3000); }
    return u;
  }

  /* 26.10 (iPhone 13: вкладка падала при входе в шахту - память WebKit): на телефоне и планшете (касание) или узком окне фон этажа - не
     SVG-картинка во всю шахту (1184×2476 CSS-пикселей: WebKit растрирует её под DPR 3 - 26 Мп ≈ 105 МБ, больше лимита 16,7 Мп на
     картинку; при смене этажа - две сразу), а растр SVG в плотности LITE_K (1,25 пикселя на пиксель сцены - на телефоне сцена
     уменьшена до ~0,4, на экране это ~1,3 пикселя устройства на пиксель сцены, на глаз так же), полосами по LITE_STRIP пикселей сцены
     (<canvas>: память = ровно ширина × высота × 4, каждая полоса < 2 Мп, всё - ~18 МБ). Без маски краёв, без плавной смены: старый фон
     снимается сразу. ПК (мышь, широкое окно) - как было, SVG-картинка */
  const LITE_K = 1.25, LITE_STRIP = 1024;
  const liteOn = (S) => { try { return S.view.clientWidth < 760 || window.matchMedia('(pointer: coarse)').matches; } catch (e) { return S.view.clientWidth < 760; } };
  function liteBg(S, url, x0, VW, H, key) {
    const box = document.createElement('div'); box.className = 'mnb-bg mnb-lite on'; box.setAttribute('aria-hidden', 'true');
    box.style.cssText = `left:${x0}px;width:${VW}px;height:${H}px`;
    const img = new Image(); img.decoding = 'async';
    img.onload = () => {
      if (!box.isConnected || !S.mnb || S.mnb.key !== key) return;   // этаж уже сменился
      try {
        for (let y = 0; y < H; y += LITE_STRIP) {
          const h = Math.min(LITE_STRIP, H - y), c = document.createElement('canvas');
          c.width = Math.round(VW * LITE_K); c.height = Math.round(h * LITE_K);
          c.style.cssText = `position:absolute;left:0;top:${y}px;width:${VW}px;height:${h}px`;
          const g = c.getContext('2d'); if (!g) continue;
          g.drawImage(img, 0, y, VW, h, 0, 0, c.width, c.height);
          box.appendChild(c);
        }
      } catch (e) { console.warn('[шахта] фон этажа', e); }
      for (const o of [...S.world.querySelectorAll('.mnb-bg')]) if (o !== box) o.remove();
      img.src = '';
    };
    img.src = url; S.world.insertBefore(box, S.world.firstChild);
  }

  /** Облик локации для текущего этажа: фон (раз на этаж), свет, пылинки, имя пласта, надпись при смене пласта. Wd - W.build(). */
  function paint(S, Wd) {
    const st = S.st; if (!st || !Wd) return;
    css();
    const narrow = S.view.clientWidth < 760, T = themeOf(st.n, st.biome), lite = liteOn(S);
    const key = `${st.seed}|${st.n}|${st.biome}|${narrow ? 'n' : 'w'}${lite ? 'l' : ''}`;
    const B = S.mnb || (S.mnb = { key: '' });
    if (B.key !== key) {
      B.key = key; B.lite = lite;
      const G = { W: Wd.W, H: Wd.H, TOP: Wd.TOP, Y0: Wd.Y0, CW: Wd.CW, RH: Wd.RH, GRID_H: Wd.GRID_H, VX0: Wd.VX0, VW: Wd.VW };
      let url; try { url = urlOf(key, () => svgOf(st, G, narrow).svg); } catch (e) { return; }
      const x0 = narrow ? -80 : G.VX0, VW = narrow ? G.W + 160 : G.VW;
      if (lite) liteBg(S, url, x0, VW, G.H, key);
      else {
      const img = new Image(); img.className = narrow ? 'mnb-bg' : 'mnb-bg wide'; img.alt = ''; img.decoding = 'async'; img.draggable = false;
      img.style.left = x0 + 'px'; img.width = VW; img.height = G.H; img.style.width = VW + 'px'; img.style.height = G.H + 'px';
      const old = [...S.world.querySelectorAll('.mnb-bg')];
      img.onload = () => { requestAnimationFrame(() => { img.classList.add('on'); setTimeout(() => old.forEach((o) => o.remove()), 1000); }); };
      img.src = url; S.world.insertBefore(img, S.world.firstChild);
      }
      // пока картинка грузится - цвет породы, а не пустота
      S.el.style.background = T.wallD;
      try { S.el.style.background = `linear-gradient(rgba(0,0,0,${T.top}), rgba(0,0,0,0) calc(var(--mnb-ts, 200px) * 2.6)), linear-gradient(rgba(0,0,0,${T.edge}), rgba(0,0,0,${T.edge})), url("${tileOf(T)}") 50% 0 / calc(var(--mnb-ts, 200px) * ${WP / 200}) repeat, ${T.wallD}`; } catch (e) { /* без плитки - цвет породы */ }
      const sv = S.el.style;
      sv.setProperty('--rock-base', T.rock[0]); sv.setProperty('--rock-light', T.rock[1]); sv.setProperty('--rock-shade', T.rock[2]); sv.setProperty('--rock-outline', INK);
      sv.setProperty('--hard-base', T.hard[0]); sv.setProperty('--hard-light', T.hard[1]); sv.setProperty('--hard-shade', T.hard[2]);
      sv.setProperty('--mnb-floor', T.floor); sv.setProperty('--mnb-wall', T.wall); sv.setProperty('--mnb-light', T.lc); sv.setProperty('--mnb-ac', T.lc); sv.setProperty('--mnb-vc', VIG(T));
      S.el.dataset.mnb = T.id;
      let v = S.el.querySelector('.mnb-vig'); if (!v) { v = document.createElement('div'); v.className = 'mnb-vig'; v.setAttribute('aria-hidden', 'true'); S.view.appendChild(v); }
      particles(S, T);
      // имя пласта в шапке
      const fl = S.el.querySelector('[data-mn="floor"]');
      if (fl) { let nm = S.el.querySelector('.mnb-nm'); if (!nm) { nm = document.createElement('span'); nm.className = 'mnb-nm'; fl.after(nm); } nm.textContent = T.name; nm.title = `Пласт шахты: этажи ${span(T)}`; }
      // смена пласта - надпись (первый вход - без неё: имя и так в шапке)
      const mk = `${st.id || 'mine'}|${st.week}`, was = LAST[mk];
      LAST[mk] = { id: T.id, n: st.n };
      if (was && was.id !== T.id) banner(S, T, st.n < was.n);
    }
  }
  function banner(S, T, fresh) {
    const old = S.el.querySelector('.mnb-ban'); if (old) old.remove();
    const b = document.createElement('div'); b.className = 'mnb-ban'; b.setAttribute('role', 'status');
    b.innerHTML = `<small>${fresh ? 'Новая шахта' : 'Вы спустились'}</small><b>${T.name}</b><em>этажи ${span(T)}</em>`;
    b.setAttribute('aria-label', `${fresh ? 'Новая шахта: ' + T.name : 'Вы спустились ' + T.to}, этажи ${span(T)}`);
    S.el.appendChild(b); setTimeout(() => b.remove(), 4400);
  }
  /** Старый облик (новинка выключена): убрать свои слои. */
  function off(S) {
    if (!S || !S.mnb) return;
    S.el.querySelectorAll('.mnb-bg, .mnb-vig, .mnb-fx, .mnb-nm, .mnb-ban').forEach((e) => e.remove());
    for (const p of ['--rock-base', '--rock-light', '--rock-shade', '--rock-outline', '--hard-base', '--hard-light', '--hard-shade', '--mnb-floor', '--mnb-wall', '--mnb-light', '--mnb-ac', '--mnb-vc']) S.el.style.removeProperty(p);
    S.el.style.background = ''; delete S.el.dataset.mnb; S.mnb = null;
  }
  window.LGMineBiome = { THEMES, themeOf: (n, biome) => themeOf(n, biome), palette, paint, off, svgOf, span };
})();
