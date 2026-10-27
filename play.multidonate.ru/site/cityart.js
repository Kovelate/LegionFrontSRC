/* 20.10: «Город» на сайте — рисунок нового квартала слева от Ярмарки (Ратуша, Аукцион, Тренер, Доска объявлений, фонтан).
   Тем же языком, что styles/<стиль>/fair.js: плоские заливки, толстый контур (белый у «Легиона», тёмный у котиков и обезьян),
   тёплые окна, вывески шрифтом Russo One. Свой набор цветов и примет у каждого стиля: legion — каменная стена и булыжник,
   cats — крыши и черепичная терраса, monkeys — настил в кронах и крыши из листьев, veggies — огородный (Ярмарка у него — «Легиона»).
   Только SVG-строки, без анимаций (сайт не должен грузить ПК зрителя). Координаты — квартала: 0…QW × 0…1080.
   window.LGCityArt.quarter(style, QW) → { svg, props: [{ svg, x, y, w, h, z }], sky } (props — с глубиной, как PROPS Ярмарки). */
(function () {
  'use strict';
  const PAL = {
    legion: { line: '#f5f2ff', ink: '#15122e', wall: '#4d4a5c', wallD: '#3d3a4c', tower: '#5a5768', roof: '#a3122a', roof2: '#b5533c', plaster: '#ead9b8', stone: '#8b8796', timber: '#6b4423',
      ground: '#3a3748', ground2: '#4a4759', glass: '#ffd76a', sign: '#7a0f1d', signTx: '#ffc94d', wood: '#a0703a', woodD: '#6b4423', water: '#4ab0ff', waterD: '#2a6fb0', flag: '#ffc94d',
      sky: 'linear-gradient(#0d0b22, #2b2150)', banner: 'КВАРТАЛ ГИЛЬДИЙ', ground_kind: 'cobble', back: 'wall' },
    veggies: { line: '#f5f2ff', ink: '#15122e', wall: '#4d4a5c', wallD: '#3d3a4c', tower: '#5a5768', roof: '#4f9a3a', roof2: '#e8892a', plaster: '#f1e6c8', stone: '#8b8796', timber: '#7a4a2a',
      ground: '#3a3748', ground2: '#4a4759', glass: '#ffe08a', sign: '#3f7a2a', signTx: '#fff0a8', wood: '#a0703a', woodD: '#6b4423', water: '#5ac0ff', waterD: '#2a6fb0', flag: '#e8455c',
      sky: 'linear-gradient(#0d0b22, #2b2150)', banner: 'ОГОРОДНЫЙ КВАРТАЛ', ground_kind: 'cobble', back: 'wall', sprout: true },
    cats: { line: '#2b1d18', ink: '#2b1d18', wall: '#3a2f5e', wallD: '#2a2350', tower: '#a9503c', roof: '#5a3a5a', roof2: '#8a4a7a', plaster: '#f2d4a8', stone: '#a9503c', timber: '#6e4a2f',
      ground: '#c8664a', ground2: '#8f3f2c', groundL: '#e08a68', glass: '#ffd76a', sign: '#6a2a5a', signTx: '#ffcf4a', wood: '#a8754f', woodD: '#6e4a2f', water: '#7fc8ff', waterD: '#3a6aa8', flag: '#ff8fa3',
      sky: 'linear-gradient(#0f0d2a 0%, #1d1a4a 40%, #3a2f6e 75%, #5a3a7a 100%)', banner: 'КОШАЧИЙ КВАРТАЛ', ground_kind: 'tiles', back: 'roofs', ears: true },
    monkeys: { line: '#2a1a12', ink: '#2a1a12', wall: '#6b4f8a', wallD: '#59437a', tower: '#7a5230', roof: '#3f8f3a', roof2: '#56a843', plaster: '#e2b678', stone: '#9a6a3c', timber: '#7a5230',
      ground: '#c99a5e', ground2: '#8a5a32', groundL: '#e2b678', glass: '#fff59a', sign: '#7a4a1a', signTx: '#ffe39a', wood: '#c99a5e', woodD: '#8a5a32', water: '#6ad0e0', waterD: '#2a8a9a', flag: '#ffd84a',
      sky: 'linear-gradient(#241a4e 0%, #4a2f72 34%, #9a4f7a 66%, #f0905a 100%)', banner: 'ВЕРХНИЙ КВАРТАЛ', ground_kind: 'deck', back: 'jungle', leaves: true },
  };
  const f1 = (v) => +(+v).toFixed(1);
  /* 25.10 (art/fair-city): детали — общий набор Ярмарки (styles/legion/fair.js → MDDoodle.fairKit: символы мостовой, кладки, черепицы,
     фонарей, деревьев, кустов). В «Городе» он всегда есть (Ярмарка «Легиона» грузится первой). Без него (тесты без Ярмарки) — заглушка:
     ровные заливки на тех же местах, геометрия та же. */
  const KITS = {};
  const STUB = { doc: (fn) => fn(), pave: (k, b, o = {}) => `<rect x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" fill="${o.mortar || '#3a3748'}"/>`, piece: () => '', wall: () => '',
    roof: (pts, o = {}) => `<path d="M${pts.map((p) => p.join(' ')).join(' L')} Z" fill="${o.pal && o.pal.a || '#a3122a'}"/>`, lamp: () => '', postLamp: () => '', wallLamp: () => '', tree: () => '', thing: () => '', board: () => '', chains: () => '', glowId: () => 'none' };
  function kitOf(style, K) {
    if (KITS[style]) return KITS[style];
    const F = window.MDDoodle && window.MDDoodle.fairKit;
    if (!F) return STUB;
    const T = { id: 'cy' + style.slice(0, 2), line: K.line, ink: K.ink, glass: K.glass, wood: K.wood, woodD: K.woodD, woodL: K.woodL || '#c58a45', metal: style === 'monkeys' ? '#4a3424' : '#2a2440' };
    if (style === 'cats') Object.assign(T, { bark: '#6e4a2f', leaf: '#5a9a4a', leafD: '#3e7436', leafL: '#8cc46a', pave: { mortar: '#8f3f2c', stone: '#c8664a', alt: '#d87a5c', light: '#f0a07e', dark: '#8f3f2c' },
      paves: { low: { mortar: '#7a3426', stone: '#b45a40', alt: '#c46a4c', light: '#e08a68', dark: '#7a3426' } }, walls: { brick: { base: '#a9503c', light: '#b85e48', dark: '#984634', joint: '#7a3426' } } });
    else if (style === 'monkeys') Object.assign(T, { bark: '#7a5232', leaf: '#3f8f3a', leafD: '#2f7a36', leafL: '#7cc24a', pave: { mortar: '#7a5230', stone: '#c99a5e', alt: '#bd8e54', light: '#e2b678', dark: '#8a5a32' },
      paves: { low: { mortar: '#7a5230', stone: '#b98a52', alt: '#ad7e48', light: '#d8ac70', dark: '#7a5230' } }, walls: { brick: { base: '#9a6a3c', light: '#a87648', dark: '#8a5e34', joint: '#6e4a2f' } } });
    else Object.assign(T, { bark: '#5a3a22', leaf: style === 'veggies' ? '#3f7a3a' : '#2f5a46', leafD: style === 'veggies' ? '#2c5a2a' : '#1f4032', leafL: style === 'veggies' ? '#6fae5a' : '#4a7e5e',
      pave: { mortar: '#33303f', stone: '#46435a', alt: '#4e4b62', light: '#625e78', dark: '#3a374b' }, paves: { low: { mortar: '#2c2a3a', stone: '#3a374b', alt: '#403d52', light: '#504c64', dark: '#312e41' }, stone: { mortar: '#5a5768', stone: '#8b8796', alt: '#7c788a', light: '#a8a4b6', dark: '#5a5768' } },
      wallC: { base: K.wall, light: '#57536a', dark: '#423f52', joint: '#36334a', moss: '#3a5e4a' }, walls: { brick: { base: '#5a5768', light: '#65627a', dark: '#4e4b60', joint: '#3e3b50' }, light: { base: '#8b8796', light: '#9894a6', dark: '#7c788a', joint: '#5e5a6e' } } });
    return (KITS[style] = F(T));
  }
  // палитра крыши по цвету: основной, светлее, темнее (для черепицы набора)
  const RHX = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const shade = (c, k) => '#' + RHX(c).map((v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))).toString(16).padStart(2, '0')).join('');
  const roofPal = (c, ink) => ({ a: c, b: shade(c, 0.12), c: shade(c, -0.15), edge: shade(c, -0.45) });
  function quarter(style, QW, opt = {}) {   // opt.auction — Аукцион открыт (тестерам): без таблички «СКОРО» и досок на двери
    const K = PAL[style] || PAL.legion, Kt = kitOf(style, K);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const O = (w = 5) => `stroke="${K.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const txt = (x, y, t, size, fill = K.signTx, ls = 3) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="${fill}" stroke="${K.ink}" stroke-width="${Math.max(3, size / 7)}" paint-order="stroke" letter-spacing="${ls}">${t}</text>`;
    const win = (x, y, w, h, lit = true, round = false) => {
      const top = round ? `M${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} H${x} Z` : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
      return `${lit ? `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w}" ry="${h * 0.8}" fill="url(#cqGlow)" opacity=".5"/>` : ''}<path d="${top}" fill="${lit ? K.glass : '#3a3a55'}" ${O(4)}/><path d="M${x + w / 2} ${y + (round ? w * 0.15 : 0)} V${y + h} M${x} ${y + h * 0.55} H${x + w}" stroke="${K.ink}" stroke-width="3" opacity=".5"/>`;
    };
    // 26.10 (art/buildings): окна с рамой и подоконником, двери из досок с петлями, обшивка, штукатурка — из набора (без набора — как было)
    const kw = (x, y, w, h, o = {}) => (Kt.win ? Kt.win(x, y, w, h, { sill: K.stone === '#8b8796' ? '#a8a4b6' : shade(K.stone, 0.2), ...o }) : win(x, y, w, h, o.lit !== false, o.round));
    const kd = (x, base, w, h, o = {}) => (Kt.door ? Kt.door(x, base, w, h, { stepC: K.stone, ...o }) : '');
    const kpl = (box, c) => (Kt.plaster ? Kt.plaster(box, c) : '');
    // табличка «СКОРО» — доска на двух гвоздях, чуть наискось
    const soon = (x, y, rot = -6) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-86" y="-30" width="172" height="60" rx="8" fill="${K.wood}" ${O(5)}/><path d="M-78 -12 H78 M-78 10 H78" stroke="${K.woodD}" stroke-width="2.5" opacity=".6"/><circle cx="-70" cy="-18" r="4" fill="${K.ink}"/><circle cx="70" cy="-18" r="4" fill="${K.ink}"/>${txt(0, 13, 'СКОРО', 34, '#fff3c8', 4)}</g>`;
    // 25.10: вывеска — с заклёпками по углам и бликом сверху
    const sign = (x, y, w, t, size = 34) => `<rect x="${x - w / 2}" y="${y - 30}" width="${w}" height="62" rx="12" fill="${K.sign}" ${O(5)}/><rect x="${x - w / 2 + 9}" y="${y - 21}" width="${w - 18}" height="44" rx="8" fill="none" stroke="${K.signTx}" stroke-width="2.5"/><path d="M${x - w / 2 + 18} ${y - 25} H${x + w / 2 - 18}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity=".25"/>`
      + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<circle cx="${x + a * (w / 2 - 5)}" cy="${y + b * 25}" r="3.4" fill="${K.signTx}" stroke="${K.ink}" stroke-width="1.5"/>`).join('') + txt(x, y + size * 0.36, t, size);
    const roof = (x0, x1, top, h, c = K.roof) => {
      // 25.10: черепица рядами чешуек (у обезьян — листья) — символы набора; кромка — контур стиля
      let s = Kt.roof([[x0 - 22, top + 4], [(x0 + x1) / 2, top - h], [x1 + 22, top + 4]], { pal: roofPal(c), kind: K.leaves ? 'leaf' : 'round', step: 16, scale: 0.72, id: 'cqRf' + x0 });
      if (K.ears) s += `<path d="M${x0 + 4} ${top - 2} l18 -46 l22 40 Z M${x1 - 4} ${top - 2} l-18 -46 l-22 40 Z" fill="${c}" ${O(4)}/><path d="M${x0 + 16} ${top - 10} l7 -20 l9 17 Z M${x1 - 16} ${top - 10} l-7 -20 l-9 17 Z" fill="#ff8fa3"/>`;
      if (K.leaves) for (let i = 0; i <= 6; i++) { const t = i / 6, lx = x0 - 18 + (x1 - x0 + 36) * t; s += `<ellipse cx="${f1(lx)}" cy="${top + 6}" rx="22" ry="11" fill="${i % 2 ? K.roof2 : K.roof}" ${O(3)} transform="rotate(${(i % 2 ? 18 : -18)} ${f1(lx)} ${top + 6})"/>`; }
      if (K.sprout) s += `<path d="M${(x0 + x1) / 2} ${top - h} q-6 -26 -26 -30 q14 18 26 30 q6 -30 30 -36 q-18 20 -30 36" fill="#6fdc6f" ${O(3)}/>`;
      return s;
    };
    const flag = (x, y, c = K.flag) => `<path d="M${x} ${y} V${y - 50} l40 12 l-40 12" fill="${c}" ${O(3)}/>`;
    const torch = (x, y) => `<circle cx="${x}" cy="${y - 18}" r="44" fill="url(#cqGlow)" opacity=".6"/><path d="M${x} ${y} v30" stroke="${K.ink}" stroke-width="6"/><path d="M${x - 8} ${y} h16 l-4 -8 h-8 Z" fill="${K.woodD}" ${O(2.5)}/><path d="M${x} ${y - 34} q12 14 6 24 q-6 6 -12 0 q-6 -10 6 -24" fill="#ffb34d" ${O(2.5)}/>`;
    // стена или фон (то, что за зданиями)
    // фон (стена, крыши, листва, земля) — чуть шире квартала: заходит под край Ярмарки, шва нет
    const QB = QW + 40;
    // парапет крыш (котики): поверх мостовой; 23.10 — кирпичи двумя рядами вперевязку, как у террасы Ярмарки (от стыка x = QW − 20)
    const parapet = () => {
      let g = `<rect x="0" y="672" width="${QB}" height="26" fill="#a9503c" ${O(4)}/><rect x="0" y="664" width="${QB}" height="12" fill="#7a3426" ${O(3)}/>`;
      for (let r = 0; r < 2; r++) for (let x = QW - 20 - (r ? 26 : 0) - Math.ceil(QW / 52 + 1) * 52; x < QB; x += 52) if (x > -60) g += `<rect x="${f1(x + 2)}" y="${674 + r * 12}" width="48" height="10" rx="2.5" fill="none" stroke="${K.ink}" stroke-width="1.6" opacity=".35"/>`;
      return g;
    };
    let s = `<defs><radialGradient id="cqGlow"><stop offset="0" stop-color="#ffe59a" stop-opacity=".9"/><stop offset="1" stop-color="#ffbe5a" stop-opacity="0"/></radialGradient>
      <linearGradient id="cqShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14112a" stop-opacity=".45"/><stop offset="1" stop-color="#14112a" stop-opacity="0"/></linearGradient>
      <radialGradient id="cqWater" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#e8fbff"/><stop offset=".35" stop-color="${K.water}"/><stop offset="1" stop-color="${K.waterD}"/></radialGradient></defs>`;
    if (K.back === 'wall') {
      // 25.10: кроны деревьев за стеной, стена — кладка из блоков (как у Ярмарки «Легиона»), мох у подножия
      for (const [tx, ts] of [[560, 1], [1180, 0.9], [1560, 1.05]]) s += Kt.tree('tree', tx, 470, ts, tx > 1000);
      s += `<rect x="0" y="330" width="${QB}" height="380" fill="${K.wall}"/>` + Kt.wall([0, 333, QB, 708], { moss: true, seed: 5 }) + `<rect x="0" y="330" width="${QB}" height="380" fill="none" ${O()}/>`;
      for (let i = 0; i < QB / 82 + 1; i++) s += `<rect x="${i * 82}" y="300" width="52" height="40" fill="${K.wall}" ${O(4)}/><path d="M${i * 82 + 8} 310 H${i * 82 + 44}" stroke="#6e6a84" stroke-width="3" stroke-linecap="round"/>`;
    } else if (K.back === 'roofs') {
      for (let x = -40; x < QB + 60;) { const w = 110 + rnd() * 120, b = f1(470 + rnd() * 50), h = 120 + rnd() * 90; s += `<rect x="${f1(x)}" y="${f1(b - h)}" width="${f1(w)}" height="${f1(h + 300)}" fill="#1e1c40"/><path d="M${f1(x - 8)} ${f1(b - h + 2)} L${f1(x + w / 2)} ${f1(b - h - 50)} L${f1(x + w + 8)} ${f1(b - h + 2)} Z" fill="#1e1c40"/>`; if (rnd() < 0.5) s += `<rect x="${f1(x + w * 0.4)}" y="${f1(b - h + 30)}" width="16" height="20" fill="#ffd76a" opacity=".7"/>`; x += w + 6 + rnd() * 20; }
      for (let x = -60; x < QB + 80;) { const w = 180 + rnd() * 160, b = f1(600 + rnd() * 40), h = 90 + rnd() * 60, top = b - h, rh = 80 + rnd() * 30; s += `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(w)}" height="${f1(h + 120)}" fill="#3a2f5e"/>` + Kt.roof([[x - 14, top + 4], [x + w / 2, top - rh], [x + w + 14, top + 4]], { pal: { a: '#5a3a5a', b: '#664266', c: '#4e3250', edge: '#3e2a46' }, step: 16, scale: 0.8, w: 0, id: 'cqMid' + Math.round(x) }) + (rnd() < 0.6 ? `<rect x="${f1(x + w * 0.5 - 18)}" y="${f1(top + 24)}" width="36" height="30" rx="3" fill="#ffd76a" opacity=".85"/><path d="M${f1(x + w * 0.5)} ${f1(top + 24)} v30 M${f1(x + w * 0.5 - 18)} ${f1(top + 39)} h36" stroke="#3a2f5e" stroke-width="3"/>` : ''); x += w + rnd() * 40; }
      s += parapet();
    } else {
      for (let x = -60; x < QB + 120; x += 130) s += `<circle cx="${x}" cy="${f1(330 + rnd() * 50)}" r="${f1(105 + rnd() * 50)}" fill="#6b4f8a"/>`;
      s += `<rect x="0" y="370" width="${QB}" height="330" fill="#6b4f8a"/>`;
      for (let i = 0; i < 8; i++) { const x = f1(rnd() * QW); s += `<path d="M${x} 380 V700" stroke="#5a4278" stroke-width="${f1(14 + rnd() * 14)}"/>`; }
      for (let x = 60; x < QW; x += 300 + rnd() * 160) { const y = f1(300 + rnd() * 60); s += `<path d="M${f1(x)} 0 V${y} M${f1(x + 26)} 0 V${f1(y - 40)}" stroke="#4a8a3a" stroke-width="4" opacity=".7"/>`; }
    }
    // земля / пол
    if (K.ground_kind === 'cobble') {
      // 25.10: булыжник рядами (символы набора), швы — по одной сетке с Ярмаркой (отсчёт от стыка x = QW)
      s += Kt.pave('cobble', [0, 700, QB, 1080], { k0: 0.72, k1: 1.35, seed: 3, x0: QW, jit: false, mortar: '#33303f' }) + `<rect x="0" y="700" width="${QB}" height="40" fill="url(#cqShade)"/>`;
    } else if (K.ground_kind === 'tiles') {
      // 23.10 (баг от зрителя: «брусчатка очень кривая»): ровная мостовая — как терраса Ярмарки котиков (styles/cats/fair.js pavement):
      // те же ряды, плитка вперевязку, ширина ∝ высоте ряда; отсчёт от стыка с Ярмаркой (x = QW), швы совпадают
      s += `<rect x="0" y="690" width="${QB}" height="390" fill="${K.ground}"/>`;
      const rows = [690, 708, 729, 754, 783, 817, 856, 900, 950, 1006, 1080];
      for (let i = 0; i < rows.length - 1; i++) {
        const y0 = rows[i], h = rows[i + 1] - y0, bw = Math.round(h * 2.6), sw = f1(1.4 + i * 0.28), r = f1(Math.min(6, h * 0.14)), ph = i % 2 ? bw / 2 : 0;
        for (let k = -Math.ceil((QW + ph) / bw) - 1, x; (x = QW + k * bw + ph) < QB; k++) {
          if (x + bw < 0) continue;
          // 25.10: плитка — символ набора, тот же выбор, что у террасы Ярмарки котиков (швы и рисунок совпадают на стыке)
          const hsh = ((k * 73856093) ^ (i * 19349663)) >>> 0, v = (k + i) % 3 ? (hsh % 11 === 3 ? 2 : hsh % 13 === 5 ? 3 : 0) : 1;
          s += Kt === STUB ? `<rect x="${f1(x + sw / 2)}" y="${f1(y0 + sw / 2)}" width="${f1(bw - sw)}" height="${f1(h - sw)}" rx="${r}" fill="${(k + i) % 3 ? K.ground : K.groundL}" stroke="${K.ground2}" stroke-width="${sw}"/>` : Kt.piece('tile', v, x, y0, bw / 104, h / 40);
        }
      }
      if (K.back === 'roofs') s += parapet();
      s += `<rect x="0" y="700" width="${QB}" height="44" fill="url(#cqShade)"/><rect x="-20" y="1062" width="${QB + 40}" height="22" fill="#9aa0ae" ${O(4)}/>`;
    } else {
      s += `<rect x="0" y="690" width="${QB}" height="390" fill="${K.ground}"/>`;
      const rows = [690, 712, 737, 765, 797, 833, 873, 917, 966, 1019, 1080];
      for (let i = 0; i < rows.length - 1; i++) {
        const y0 = rows[i], y1 = rows[i + 1], hgt = y1 - y0;
        // 25.10: доски настила — символы набора (как у Ярмарки обезьян)
        const kk = hgt / 40, sx = kk * 1.5;
        for (let x = QB - rnd() * 300 * sx; x > -300 * sx; x -= 300 * sx) s += Kt.piece('plank', Math.floor(rnd() * 3), x, y0, sx, kk);
        if (Kt === STUB) s += `<path d="M0 ${y0} H${QB}" stroke="${K.ink}" stroke-width="${f1(1.6 + i * 0.25)}" opacity=".5"/>`;
      }
      s += `<rect x="0" y="700" width="${QB}" height="40" fill="url(#cqShade)"/><rect x="-20" y="680" width="${QB + 40}" height="22" rx="11" fill="#9a6a3c" ${O(4)}/>`;
    }
    // гирлянда вдоль квартала (без мигания — сайт не должен нагружать ПК)
    // 23.10 (баг от зрителя: провод начинался и кончался в воздухе): пролёты — между настоящими опорами: часовая башня Ратуши → конёк
    // Аукциона → конёк Тренера → конёк Доски объявлений. Гирлянда рисуется за зданиями (Доска — предмет поверх), концы уходят за них
    const BULB = ['#ff5a6e', '#ffd23f', '#4cd97b', '#4ab0ff', '#c77dff', '#ff9a3c', '#7fe7e0'];
    const garl = (x1, y1, x2, y2, sag, step = 44) => {
      const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + sag, n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
      let g = `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${K.ink}" stroke-width="3.5"/>`;
      for (let i = 1; i < n; i++) {   // лампочки-колбочки с цоколем, у соседних — разные цвета (как гирлянды Ярмарки котиков), без мигания — сайт не должен нагружать ПК
        const t = i / n, x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2, y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2, c = BULB[(i * 3) % BULB.length], bx = f1(x);
        g += `<circle cx="${bx}" cy="${f1(y + 12)}" r="13" fill="${c}" opacity=".2"/><rect x="${f1(x - 3.5)}" y="${f1(y - 1)}" width="7" height="6" rx="1.5" fill="#3a3550" stroke="${K.ink}" stroke-width="1.5"/><path d="M${bx} ${f1(y + 5)} C${f1(x + 7)} ${f1(y + 7)} ${f1(x + 7)} ${f1(y + 18)} ${bx} ${f1(y + 20)} C${f1(x - 7)} ${f1(y + 18)} ${f1(x - 7)} ${f1(y + 7)} ${bx} ${f1(y + 5)} Z" fill="${c}" stroke="${K.ink}" stroke-width="1.8"/><path d="M${f1(x - 2.5)} ${f1(y + 9)} q-1 4 0 7" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".7"/>`;
      }
      return g;
    };
    s += garl(296, 262, 650, 414, 60) + garl(650, 414, 1125, 404, 70) + garl(1125, 404, 1520, 466, 50);
    // край мира слева: угловая башня; справа — башня на стыке с Ярмаркой
    const tower = (x, w, top, base) => `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="${K.tower}"/>` + Kt.wall([x, top, x + w, base], { pal: 'brick', scale: 0.42, seed: 77 }) + `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="none" ${O()}/>` + Kt.roof([[x - 15, top + 5], [x + w / 2, top - 115], [x + w + 15, top + 5]], { pal: roofPal(K.roof), kind: K.leaves ? 'leaf' : 'round', step: 14, scale: 0.65, id: 'cqTw' }) + `${flag(x + w / 2, top - 115)}` + [0, 1, 2, 3, 4].map((r) => `<path d="M${x + 4} ${top + 60 + r * 80} H${x + w - 4}" stroke="${K.ink}" stroke-width="2" opacity=".3"/>`).join('') + win(x + w / 2 - 18, top + 90, 36, 56, true, true);
    s += tower(-20, 110, 200, 1080);
    const seam = '';   // 20.10: стык — без столба: фон квартала заходит под Ярмарку, у Ярмарки срезан край с обводкой (city.js)
    // баннер квартала
    s += `<g transform="translate(${QW / 2} 120)"><path d="M-300 -38 H300 L276 0 L300 38 H-300 L-276 0 Z" fill="${K.sign}" ${O(6)}/>${txt(0, 15, K.banner, 40)}</g>`;

    // 25.10: деревья между зданиями (за ними — стена или крыши; герои ходят ниже, y ≥ 800 — деревья всегда позади)
    { const TK = K.leaves ? 'palm' : K.ears ? 'topiary' : 'cypress';
      s += Kt.tree(K.ears ? 'topiary' : 'tree', 452, 792, 0.82) + Kt.tree(TK, 900, 792, K.ears ? 0.95 : 0.9) + Kt.tree(TK, 1330, 796, 0.85) + Kt.tree(K.ears ? 'topiary' : 'tree', 1735, 790, 0.8, true) + Kt.tree('bush', 1205, 798, 0.6) + Kt.tree('bush', 560, 798, 0.55); }
    /* ----- Ратуша (строится): башня с часами, леса, табличка «СКОРО» ----- */
    {
      const x0 = 90, x1 = 400, B = 795, top = 470;
      s += '<g data-ol="hall">';   // 20.10: data-ol — что обводить при наведении (citygl.js outliner)
      s += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${B - top}" fill="${K.stone}" ${O()}/>`;
      // 23.10 (баг от зрителя: кирпичи выпирали за стену): кладка рядами вперевязку внутри стены (обрезана по её краю)
      if (Kt !== STUB) s += Kt.wall([x0 + 2, top + 2, x1 - 2, B - 2], { pal: style === 'cats' || style === 'monkeys' ? 'brick' : 'light', scale: 0.4, seed: 9, moss: style === 'legion' }) + `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${B - top}" fill="none" ${O()}/>`;   // 26.10: кладка набора
      else { s += `<clipPath id="cqHallBr"><rect x="${x0 + 3}" y="${top + 3}" width="${x1 - x0 - 6}" height="${B - top - 6}"/></clipPath><g clip-path="url(#cqHallBr)">`;
        for (let r = 0, y = top + 3; y < B; r++, y += 40) for (let x = x0 + 3 - (r % 2) * 32; x < x1; x += 64) s += `<rect x="${x + 3}" y="${y + 3}" width="58" height="34" rx="5" fill="none" stroke="${K.ink}" stroke-width="2" opacity=".22"/>`;
        s += '</g>'; }
      s += roof(x0, x1, top, 110, K.roof2);
      s += `<rect x="190" y="230" width="110" height="250" fill="${K.tower}"/>` + Kt.wall([190, 230, 300, 480], { pal: 'brick', scale: 0.4, seed: 31 }) + `<rect x="190" y="230" width="110" height="250" fill="none" ${O()}/>` + Kt.roof([[178, 236], [245, 130], [312, 236]], { pal: roofPal(K.roof), kind: K.leaves ? 'leaf' : 'round', step: 14, scale: 0.65, id: 'cqClock' }) + `${flag(245, 130)}`;
      s += `<circle cx="245" cy="300" r="38" fill="#f3efd8" ${O(5)}/><path d="M245 300 V272 M245 300 L265 312" stroke="${K.ink}" stroke-width="5" stroke-linecap="round"/>`;
      s += `<path d="M197 ${B} V660 A48 48 0 0 1 293 660 V${B} Z" fill="${K.stone === '#8b8796' ? '#a8a4b6' : shade(K.stone, 0.15)}" ${O(4)}/>` + (Kt.door ? kd(245, B, 80, 175, { c: '#5a3a2a' }) : `<path d="M205 ${B} V660 A40 40 0 0 1 285 660 V${B} Z" fill="#3a2a2a" ${O(5)}/>`) + kw(110, 560, 40, 56, { lit: false, round: true, shut: K.woodD }) + kw(340, 560, 40, 56, { lit: false, round: true, shut: K.woodD });
      s += (Kt.thing ? Kt.thing('barrel', 130, B + 2, 0.5) + Kt.thing('crate', 362, B + 2, 0.55) : '');   // 26.10: вход в арке, ставни, бочка и ящик у стройки
      // леса: доски и стойки поверх правой части
      s += `<g opacity=".95">${[260, 330, 400].map((x) => `<path d="M${x} ${B} V420" stroke="${K.woodD}" stroke-width="9"/><path d="M${x} ${B} V420" stroke="${K.wood}" stroke-width="5"/>`).join('')}${[520, 640].map((y) => `<rect x="244" y="${y}" width="176" height="14" fill="${K.wood}" ${O(3)}/><path d="M250 ${y + 5} h164" stroke="${K.woodD}" stroke-width="1.6" stroke-dasharray="20 9" opacity=".7"/>`).join('')}<path d="M260 640 L330 520 M330 640 L400 520" stroke="${K.wood}" stroke-width="5"/>`
        + [260, 330, 400].map((x) => [520, 640].map((y) => `<path d="M${x - 6} ${y - 2} l12 8 M${x - 6} ${y + 14} l12 -8" stroke="#c8a86a" stroke-width="3" stroke-linecap="round"/>`).join('')).join('')
        + `<path d="M400 420 V470" stroke="${K.ink}" stroke-width="2.5"/><path d="M390 470 h20 l-3 18 h-14 Z" fill="#8a8e9e" ${O(2)}/></g>`;   // 26.10: обвязка, волокна досок, ведро на верёвке
      s += sign(245, 420, 220, 'РАТУША', 32) + soon(175, 735, -8) + '</g>';
    }
    /* ----- Аукцион (строится): колонны, фронтон с молотком, ставни закрыты ----- */
    {
      const x0 = 490, x1 = 810, B = 795, top = 520;
      s += '<g data-ol="auction">';
      s += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${B - top}" fill="${K.plaster}" ${O()}/>` + kpl([x0, top, x1, B], K.plaster) + `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="20" fill="url(#cqShade)"/>`;
      s += Kt.roof([[x0 - 26, top + 4], [(x0 + x1) / 2, top - 110], [x1 + 26, top + 4]], { pal: roofPal(K.roof), kind: K.leaves ? 'leaf' : 'flat', step: 16, scale: 0.72, id: 'cqAuc' }) + `<path d="M${x0 + 30} ${top - 6} L${(x0 + x1) / 2} ${top - 74} L${x1 - 30} ${top - 6} Z" fill="${K.plaster}" stroke="${K.ink}" stroke-width="3"/>`;   // 25.10: черепица и светлый фронтон
      // молоток аукциониста на фронтоне
      s += `<g transform="translate(${(x0 + x1) / 2} ${top - 40}) rotate(-30)"><rect x="-26" y="-14" width="52" height="26" rx="6" fill="${K.wood}" ${O(4)}/><rect x="-5" y="10" width="10" height="44" rx="4" fill="${K.woodD}" ${O(3)}/></g>`;
      for (const x of [520, 600, 700, 780]) s += `<rect x="${x - 14}" y="${top + 10}" width="28" height="${B - top - 10}" fill="#f3efe6" ${O(4)}/><path d="M${x - 7} ${top + 18} V${B - 18} M${x} ${top + 18} V${B - 18} M${x + 7} ${top + 18} V${B - 18}" stroke="${K.ink}" stroke-width="1.5" opacity=".22"/><path d="M${x - 10} ${top + 16} V${B - 16}" stroke="#ffffff" stroke-width="3" opacity=".6"/><rect x="${x - 20}" y="${top}" width="40" height="14" fill="#d8d0c0" ${O(3)}/><rect x="${x - 19}" y="${B - 14}" width="38" height="14" fill="#d8d0c0" ${O(3)}/>`;
      s += Kt.door ? `<rect x="612" y="642" width="76" height="${B - 642}" fill="#d8d0c0" ${O(3)}/>` + kd(650, B, 60, B - 650, { arch: false }) : `<rect x="620" y="650" width="60" height="${B - 650}" fill="${K.woodD}" ${O(4)}/>` + [0, 1, 2, 3].map((i) => `<path d="M620 ${666 + i * 34} H680" stroke="${K.ink}" stroke-width="2.5" opacity=".45"/>`).join('');
      for (const bx of [560, 740]) s += `<path d="M${bx - 16} ${top + 22} H${bx + 16} V${top + 112} l-16 -12 l-16 12 Z" fill="${K.sign}" ${O(3)}/><path d="M${bx - 20} ${top + 22} H${bx + 20}" stroke="${K.signTx}" stroke-width="5" stroke-linecap="round"/><circle cx="${bx}" cy="${top + 56}" r="9" fill="${K.signTx}" stroke="${K.ink}" stroke-width="2"/><path d="M${bx - 4} ${top + 52} l8 8 M${bx + 4} ${top + 52} l-8 8" stroke="${K.ink}" stroke-width="2"/>`;   // 26.10: знамёна между колоннами
      { let dn = ''; for (let x = x0 + 34; x < x1 - 30; x += 16) dn += `M${x} ${top - 2} h8 v7 h-8 Z `; s += `<path d="${dn}" fill="#c8c0b0" stroke="${K.ink}" stroke-width="1.2"/><path d="M${x0 - 6} ${B + 2} H${x1 + 6} V${B + 9} H${x0 - 6} Z" fill="${K.stone}" ${O(3)}/>`; }   // 26.10: зубчики фриза, ступень
      if (!opt.auction) s += `<path d="M612 700 L688 744 M688 700 L612 744" stroke="${K.wood}" stroke-width="10" stroke-linecap="round"/>`;   // доски крест-накрест на двери
      s += sign(650, 600, 240, 'АУКЦИОН', 30) + (opt.auction ? '' : soon(650, 470, 5)) + '</g>';
    }
    /* ----- Тренер: зал с мишенями, скрещённые мечи над входом ----- */
    {
      const x0 = 960, x1 = 1290, B = 795, top = 520;
      s += '<g data-ol="trainer">';
      s += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${B - top}" fill="${K.plaster}" ${O()}/>`;
      for (let i = 0; i <= 4; i++) s += `<path d="M${x0 + (x1 - x0) * i / 4} ${top} V${B - 110}" stroke="${K.timber}" stroke-width="7"/>`;
      s += `<path d="M${x0} ${top + 70} H${x1}" stroke="${K.timber}" stroke-width="6"/>`;
      s += kpl([x0, top, x1, B - 110], K.plaster);
      s += `<rect x="${x0}" y="${B - 110}" width="${x1 - x0}" height="110" fill="${K.stone}" ${O()}/>` + (Kt !== STUB ? Kt.wall([x0 + 2, B - 108, x1 - 2, B - 2], { pal: style === 'cats' || style === 'monkeys' ? 'brick' : 'light', scale: 0.36, seed: 21 }) + `<rect x="${x0}" y="${B - 110}" width="${x1 - x0}" height="110" fill="none" ${O()}/>` : '');
      s += roof(x0, x1, top, 120);
      if (Kt.gutter) s += Kt.gutter(x0 - 16, x1 + 16, top + 8, x1 - 4, B);   // 26.10: водосток
      s += `<g transform="translate(1000 ${B})"><path d="M-22 0 V-66 M22 0 V-66 M-26 -50 H26 M-26 -14 H26" stroke="${K.line}" stroke-width="9" stroke-linecap="round"/><path d="M-22 0 V-66 M22 0 V-66 M-26 -50 H26 M-26 -14 H26" stroke="${K.wood}" stroke-width="4.5" stroke-linecap="round"/>`
        + `<path d="M-12 -6 V-86 M0 -6 V-82 M12 -6 V-78" stroke="${K.line}" stroke-width="7" stroke-linecap="round"/><path d="M-12 -6 V-86 M0 -6 V-82 M12 -6 V-78" stroke="${K.woodD}" stroke-width="3" stroke-linecap="round"/><path d="M-12 -100 l-5 14 h10 Z M0 -96 l-5 14 h10 Z M12 -92 l-5 14 h10 Z" fill="#c9ccd6" stroke="${K.ink}" stroke-width="2"/></g>`
        + [1068, 1182].map((sx) => `<g transform="translate(${sx} ${top + 40}) scale(.8)"><path d="M-22 -24 H22 V2 Q22 24 0 32 Q-22 24 -22 2 Z" fill="${K.sign}" ${O(4)}/><path d="M0 -20 V26 M-16 -2 H16" stroke="${K.signTx}" stroke-width="5"/></g>`).join('');   // 26.10: стойка с копьями, щиты на стене
      s += `<path d="M1065 ${B} V700 A60 60 0 0 1 1185 700 V${B} Z" fill="#ffb34d" ${O(5)}/><path d="M1080 ${B} V706 A45 45 0 0 1 1170 706 V${B} Z" fill="#c56a2a" opacity=".55"/>`;
      // мишени на стене
      const target = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f3efd8" ${O(4)}/><circle cx="${x}" cy="${y}" r="${r * 0.66}" fill="#e8455c"/><circle cx="${x}" cy="${y}" r="${r * 0.33}" fill="#f3efd8"/><path d="M${x + r * 0.2} ${y - r * 0.1} l${r * 0.9} ${-r * 0.5}" stroke="${K.woodD}" stroke-width="4"/>`;
      s += target(1010, 610, 30) + target(1240, 610, 30);
      // скрещённые мечи
      s += `<g transform="translate(1125 470)"><path d="M-46 -46 L40 40 M46 -46 L-40 40" stroke="${K.line}" stroke-width="13" stroke-linecap="round"/><path d="M-46 -46 L40 40 M46 -46 L-40 40" stroke="#c9ccd6" stroke-width="8" stroke-linecap="round"/><path d="M28 18 L18 28 M-28 18 L-18 28" stroke="${K.signTx}" stroke-width="10" stroke-linecap="round"/></g>`;
      s += sign(1125, 640, 210, 'ТРЕНЕР', 30) + '</g>';
      s += torch(940, 560) + torch(1310, 560);
    }
    // факел у Аукциона и бочки у Ратуши
    s += torch(455, 560);
    s += `<g transform="translate(60 800)"><rect x="-22" y="-56" width="44" height="56" rx="8" fill="${K.wood}" ${O(4)}/><path d="M-22 -40 H22 M-22 -16 H22" stroke="${K.woodD}" stroke-width="4"/></g>`;

    /* ----- предметы с глубиной (в одном слое с человечками) ----- */
    const props = [];
    // фонтан — вода: по ней не ходят (citymap.js QUARTER_OBST)
    props.push({ x: 760, y: 780, w: 240, h: 200, z: 952, svg: () => {
      let g = `<ellipse cx="880" cy="934" rx="112" ry="38" fill="${K.stone}" ${O(5)}/><ellipse cx="880" cy="926" rx="96" ry="28" fill="url(#cqWater)" ${O(3)}/>`;
      g += `<path d="M846 922 q20 -10 46 -2 M900 934 q14 -6 30 0" stroke="#e8fbff" stroke-width="3" fill="none" opacity=".8"/>`;
      g += `<rect x="868" y="840" width="24" height="86" fill="${K.stone}" ${O(4)}/><ellipse cx="880" cy="842" rx="40" ry="12" fill="${K.stone}" ${O(4)}/><ellipse cx="880" cy="838" rx="30" ry="7" fill="url(#cqWater)"/>`;
      g += `<path d="M880 830 q-34 -40 -46 4 M880 830 q34 -40 46 4 M880 830 v-26" stroke="${K.water}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`;
      if (K.ears) g += `<g transform="translate(880 802)"><path d="M-14 -6 l4 -16 l9 10 Z M14 -6 l-4 -16 l-9 10 Z" fill="${K.stone}" ${O(3)}/><circle r="16" fill="${K.stone}" ${O(3)}/></g>`;
      return g;
    } });
    // тренировочное чучело у Тренера
    props.push({ x: 1190, y: 740, w: 100, h: 120, z: 846, svg: () => `<path d="M1236 846 V770" stroke="${K.woodD}" stroke-width="8"/><path d="M1206 790 H1266" stroke="${K.woodD}" stroke-width="7" stroke-linecap="round"/><ellipse cx="1236" cy="800" rx="22" ry="30" fill="#e8c95a" ${O(4)}/><circle cx="1236" cy="758" r="16" fill="#e8c95a" ${O(4)}/><path d="M1226 756 l6 6 M1232 756 l-6 6 M1240 756 l6 6 M1246 756 l-6 6" stroke="${K.ink}" stroke-width="2.5"/><ellipse cx="1236" cy="846" rx="22" ry="7" fill="${K.ink}" opacity=".35"/>` });
    // доска объявлений: два столба, козырёк, листки (свежие новости — ярче)
    props.push({ x: 1360, y: 450, w: 320, h: 400, z: 836, svg: () => {
      // 23.10 (баг от зрителя: опоры выпирали над козырьком): столбы — брусья с обводкой под козырьком, внизу — каменные башмаки,
      // под доской — перекладина с подкосами
      let g = `<g data-ol="board">`;
      for (const x of [1392, 1648]) g += `<rect x="${x - 9}" y="514" width="18" height="${836 - 514}" rx="3" fill="${K.woodD}" ${O(4)}/><path d="M${x - 3} 524 V826" stroke="${K.wood}" stroke-width="3" opacity=".7"/><rect x="${x - 16}" y="818" width="32" height="20" rx="5" fill="${K.stone}" ${O(4)}/>`;
      g += `<rect x="1392" y="752" width="256" height="14" rx="4" fill="${K.wood}" ${O(4)}/><path d="M1400 800 L1436 766 M1640 800 L1604 766" stroke="${K.line}" stroke-width="11" stroke-linecap="round"/><path d="M1400 800 L1436 766 M1640 800 L1604 766" stroke="${K.woodD}" stroke-width="6" stroke-linecap="round"/>`;
      g += Kt.roof([[1360, 524], [1520, 462], [1680, 524]], { pal: roofPal(K.roof), kind: K.leaves ? 'leaf' : 'round', step: 13, scale: 0.6, id: 'cqBoardR' });
      g += `<rect x="1382" y="540" width="276" height="200" rx="8" fill="${K.wood}" ${O(5)}/>` + (Kt.planks ? Kt.planks([1388, 546, 1652, 734], K.wood, 22) + `<rect x="1382" y="540" width="276" height="200" rx="8" fill="none" ${O(5)}/>` : [580, 625, 670, 715].map((y) => `<path d="M1388 ${y} H1652" stroke="${K.woodD}" stroke-width="2.5" opacity=".6"/>`).join(''));
      const note = (x, y, w, h, r, c) => `<g transform="rotate(${r} ${x + w / 2} ${y})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" ${O(3)}/>${[0, 1, 2].map((i) => `<path d="M${x + 8} ${y + 14 + i * 12} H${x + w - 8 - (i === 2 ? 14 : 0)}" stroke="${K.ink}" stroke-width="2.5" opacity=".45"/>`).join('')}<circle cx="${x + w / 2}" cy="${y + 4}" r="4" fill="#e8455c"/></g>`;
      g += note(1400, 556, 70, 60, -4, '#fff3c8') + note(1484, 552, 80, 70, 3, '#f3efd8') + note(1578, 560, 64, 56, -2, '#ffe0a0') + note(1420, 640, 90, 72, 2, '#f3efd8') + note(1530, 650, 104, 70, -3, '#fff3c8');
      // 26.10: «Розыск» с портретом, карта с крестиком, фонарик на столбе
      g += `<g transform="rotate(4 1610 650)"><rect x="1588" y="636" width="48" height="60" fill="#efe0b8" ${O(3)}/><text x="1612" y="649" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="8" fill="#7a0f1d">РОЗЫСК</text><circle cx="1612" cy="668" r="10" fill="#d8b48a" stroke="${K.ink}" stroke-width="2"/><path d="M1606 666 h4 M1614 666 h4 M1607 673 q5 3 10 0" stroke="${K.ink}" stroke-width="1.8" fill="none"/><path d="M1596 688 H1628" stroke="#7a0f1d" stroke-width="3"/><circle cx="1612" cy="639" r="4" fill="#e8455c"/></g>`
        + `<g transform="rotate(-3 1440 690)"><rect x="1400" y="676" width="70" height="44" fill="#e8d8a8" ${O(3)}/><path d="M1408 708 q12 -16 24 -6 q12 8 30 -14" stroke="#4ab0ff" stroke-width="2.5" fill="none"/><path d="M1448 684 l7 7 M1455 684 l-7 7" stroke="#e8455c" stroke-width="3"/></g>`;
      return g + '</g>';
    } });
    // фонарь на улице
    // 25.10: кованый фонарь набора (свет — в рамке предмета: Pixi печёт предмет по его рамке)
    props.push({ x: 400, y: 600, w: 80, h: 410, z: 1000, svg: () => Kt === STUB ? `<path d="M440 1000 V640" stroke="${K.ink}" stroke-width="7"/>` : `<circle cx="440" cy="655" r="40" fill="url(#cqGlow)" opacity=".8"/>` + Kt.lamp(440, 998, 380, { glow: false, pool: false }) + `<ellipse cx="440" cy="1000" rx="20" ry="6" fill="${K.ink}" opacity=".4"/>` });
    // 20.10: табличка «Заточка» у наковальни под навесом Кузни Ярмарки (наковальня — x QW+150): деревянная, с молотом; только в городе
    // висит под навесом над наковальней (навес у всех стилей — x 0…240 Ярмарки, низ ~575): не закрывает наковальню и кузнеца
    props.push({ x: QW + 6, y: 470, w: 250, h: 200, z: 800, svg: () => {
      const bx = QW + 40, by = 604, bw = 180, bh = 56;
      // 23.10 (баг от зрителя): цепи висели в воздухе — теперь от нижней кромки навеса (у всех стилей навес x 6…248: низ 590 → 512)
      // до вывески, с кольцами-креплениями; на стене под навесом, над вывеской — молот и клещи
      const yb = (x) => 590 - (x - 6) * 78 / 242;
      let g = '<g data-ol="sign anvil">';
      // молот и клещи крест-накрест на стене под навесом (справа от трубы горна, над вывеской)
      g += `<g transform="translate(${QW + 176} 574) scale(.85)"><g transform="rotate(32)"><rect x="-3.5" y="-26" width="7" height="50" rx="3" fill="${K.woodD}" ${O(3)}/><rect x="-13" y="-34" width="26" height="13" rx="3" fill="#a9b1b6" ${O(3)}/></g>`
        + `<g transform="rotate(-32)"><path d="M-3 24 L-2 -14 Q-2 -26 -9 -32 M3 24 L2 -14 Q2 -26 9 -32" fill="none" stroke="${K.ink}" stroke-width="7" stroke-linecap="round"/><path d="M-3 24 L-2 -14 Q-2 -26 -9 -32 M3 24 L2 -14 Q2 -26 9 -32" fill="none" stroke="#8a8e9e" stroke-width="3.5" stroke-linecap="round"/><circle cy="-12" r="3.5" fill="#c9ccd6" ${O(2)}/></g>`
        + `<circle cy="-4" r="3" fill="${K.ink}"/></g>`;
      // цепи: от колец под навесом до вывески
      for (const x of [70, 190]) {
        const top = f1(yb(x) - 2);
        g += `<circle cx="${QW + x}" cy="${top}" r="5" fill="#8a8e9e" ${O(2.5)}/><path d="M${QW + x} ${f1(top + 4)} V${by + 4}" stroke="${K.line}" stroke-width="7"/><path d="M${QW + x} ${f1(top + 4)} V${by + 4}" stroke="#a9b1b6" stroke-width="3.5" stroke-dasharray="6 3"/>`;
      }
      g += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="${K.wood}" ${O(4)}/><path d="M${bx + 6} ${by + 19} H${bx + bw - 6} M${bx + 6} ${by + 38} H${bx + bw - 6}" stroke="${K.woodD}" stroke-width="2.5" opacity=".6"/>`
        + `<circle cx="${bx + 30}" cy="${by + 8}" r="3.5" fill="${K.ink}"/><circle cx="${bx + bw - 30}" cy="${by + 8}" r="3.5" fill="${K.ink}"/>`
        // молот: рукоять и боёк
        + `<g transform="translate(${bx + 26} ${by + 29}) rotate(-35)"><rect x="-3" y="-4" width="6" height="24" rx="2" fill="${K.woodD}" ${O(2.5)}/><rect x="-12" y="-14" width="24" height="12" rx="2" fill="#a9b1b6" ${O(2.5)}/></g>`
        + `<text x="${bx + 106}" y="${by + 36}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="23" fill="${K.ink}">ЗАТОЧКА</text></g>`;
      return g;
    } });
    for (const p of props) { const f = p.svg; p.svg = () => (Kt.wrap ? Kt.wrap(f()) : f()); }   // 25.10: у каждого предмета — свои <defs> набора
    return { svg: Kt.wrap ? Kt.wrap(s) : s, props, sky: K.sky, seam };
  }
  /* ----- 20.10: нижняя улица под Ярмаркой (на всю ширину города): уступ с лестницами, канал с мостиками, лавочки, клумбы, фонари.
     Где что стоит — из citymap.js (LOW): рисунок и проходимость совпадают. Координаты — города (y от LOW.top до H). ----- */
  function lower(style, M, opt = {}) {   // opt.storage — Склад открыт (тестерам): без досок на воротах и таблички «СКОРО»
    const K = PAL[style] || PAL.legion, L = M.LOW, W = M.W, H = M.H, T = L.top, Kt = kitOf(style, K);
    let seed = 29; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const O = (w = 5) => `stroke="${K.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const [e0, e1] = L.edge, [c0, c1] = L.canal;
    let s = `<defs><linearGradient id="lwWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.waterD}"/><stop offset=".5" stop-color="${K.water}"/><stop offset="1" stop-color="${K.waterD}"/></linearGradient>
      <linearGradient id="lwShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14112a" stop-opacity=".5"/><stop offset="1" stop-color="#14112a" stop-opacity="0"/></linearGradient>
      <radialGradient id="lwGlow"><stop offset="0" stop-color="#ffe59a" stop-opacity=".85"/><stop offset="1" stop-color="#ffbe5a" stop-opacity="0"/></radialGradient></defs>`;
    // земля нижней улицы
    const G = K.ground_kind;
    s += `<rect x="0" y="${e1}" width="${W}" height="${H - e1}" fill="${G === 'tiles' ? '#b45a40' : G === 'deck' ? '#b98a52' : '#34314a'}"/>`;
    // 25.10: земля нижней улицы — символы набора (булыжник / плитка / доски) одного размера по всей улице (вид сверху, без перспективы)
    if (Kt !== STUB) s += Kt.pave(G === 'tiles' ? 'tile' : G === 'deck' ? 'plank' : 'cobble', [0, e1, W, H], { pal: 'low', k0: G === 'deck' ? 1.05 : 0.95, k1: G === 'deck' ? 1.05 : 0.95, sx: G === 'deck' ? 1.4 : 1, seed: 17 });
    else if (G === 'cobble') for (let i = 0; i < 1400; i++) { const x = rnd() * W, y = e1 + rnd() * (H - e1), r = 22 + rnd() * 10; s += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(r * (0.9 + rnd() * 0.5)).toFixed(0)}" ry="${(r * 0.55).toFixed(0)}" fill="${K.ground2}"/>`; }
    // пятна тёплого света под фонарями
    for (const [lx, ly] of L.lamps) s += `<ellipse cx="${lx}" cy="${ly - 30}" rx="120" ry="40" fill="url(#lwGlow)" opacity=".22"/>`;
    // уступ: подпорная стенка (кирпич/камень/бревно) с лестницами вниз
    s += `<rect x="0" y="${e1}" width="${W}" height="40" fill="url(#lwShade)"/>`;
    const wallC = G === 'deck' ? '#9a6a3c' : G === 'tiles' ? '#a9503c' : '#5a5768';
    let x = 0; const props = [];
    const seg = (a, b) => {
      let g = `<rect x="${a}" y="${e0}" width="${b - a}" height="${e1 - e0}" fill="${wallC}"/>`;
      // 25.10: подпорная стенка — кладка набора (у обезьян — брёвна)
      if (G === 'deck') g += Kt.pave('plank', [a, e0, b, e1], { pal: 'wood', k0: 0.72, k1: 0.72, sx: 1.4, seed: a, cut: true }) || `<path d="M${a} ${e0 + 20} H${b} M${a} ${e0 + 40} H${b}" stroke="${K.ink}" stroke-width="2.5" opacity=".5"/>`;
      else if (Kt !== STUB) g += Kt.wall([a, e0, b, e1], { pal: 'brick', scale: 0.5, seed: a });
      else for (let r = 0; r < 2; r++) for (let c = a + (r % 2) * 30; c < b - 10; c += 60) g += `<rect x="${c + 4}" y="${e0 + 6 + r * 26}" width="52" height="20" rx="3" fill="none" stroke="${K.ink}" stroke-width="2" opacity=".3"/>`;
      g += `<rect x="${a}" y="${e0}" width="${b - a}" height="${e1 - e0}" fill="none" ${O(5)}/>`;
      fence(a, b);
      return g;
    };
    // перила по краю уступа. 23.10 (баг от зрителя): были «в 1 пиксель», потом — «обрезаны сверху»: слой нижней улицы начинается
    // с y = L.top (1040), а верх ограды выше — его закрывал/срезал слой Ярмарки, оставались брус и «крючки» низа столбиков.
    // Теперь ограда — предметы с глубиной (z = край уступа): рисуются поверх Ярмарки целиком, герой на полосе Ярмарки — за ней,
    // на нижней улице — перед ней. Куски по ≤ ~600 px (Pixi печёт каждый отдельно, тени и обводки не режутся).
    const rc = G === 'deck' ? '#c99a5e' : G === 'tiles' ? '#c8664a' : '#8b8796', rh = G === 'deck' ? '#f0d6a8' : G === 'tiles' ? '#f0a07e' : '#c4c0cc', rd = G === 'deck' ? '#9a6a3c' : G === 'tiles' ? '#8e3f2e' : '#5a5768';
    const fenceY = e0 - 64;   // верх шапок
    function fence(a, b) {
      const n = Math.max(1, Math.round((b - a - 24) / 72)), st = (b - a - 24) / n, P = [];
      for (let k = 0; k <= n; k++) P.push(Math.round(a + 12 + k * st));
      const per = Math.max(1, Math.round(600 / st));
      for (let i = 0; i < P.length - 1; i += per) {
        const j = Math.min(P.length - 1, i + per), x0 = i === 0 ? a : P[i], x1 = j === P.length - 1 ? b : P[j];
        props.push({ x: x0 - 20, y: fenceY - 10, w: x1 - x0 + 40, h: e0 + 14 - fenceY, z: e0, svg: () => {
          let g = `<rect x="${x0}" y="${e0 - 10}" width="${x1 - x0}" height="16" fill="${rd}" stroke="${K.ink}" stroke-width="5"/><path d="M${x0 + 4} ${e0 - 4} H${x1 - 4}" stroke="${rh}" stroke-width="3" opacity=".55"/>`;   // бортик
          for (const ry of [e0 - 50, e0 - 28]) g += `<rect x="${x0}" y="${ry}" width="${x1 - x0}" height="13" rx="5" fill="${rc}" stroke="${K.ink}" stroke-width="5"/><path d="M${x0 + 6} ${ry + 4} H${x1 - 6}" stroke="${rh}" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>`;   // две перекладины
          for (let k = i; k <= j; k++) { const p = P[k];   // столбик на стыке кусков рисуют оба (одинаково) — стык брусьев закрыт при любом порядке
            g += `<rect x="${p - 11}" y="${e0 - 56}" width="22" height="54" rx="4" fill="${rc}" stroke="${K.ink}" stroke-width="5"/><path d="M${p - 4} ${e0 - 50} V${e0 - 10}" stroke="${rh}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`
              + `<rect x="${p - 16}" y="${fenceY}" width="32" height="13" rx="5" fill="${rh}" stroke="${K.ink}" stroke-width="5"/>`; }   // столбик с шапкой
          return g;
        } });
      }
    }
    for (const [a, b] of L.stairs) {
      if (a > x) s += seg(x, a);
      // лестница: ступени во всю высоту уступа
      for (let i = 0; i < 4; i++) { const y = e0 - 8 + i * 17; s += `<rect x="${a + 6}" y="${y}" width="${b - a - 12}" height="18" fill="${i % 2 ? (G === 'deck' ? '#c99a5e' : G === 'tiles' ? '#c8664a' : '#6d6a78') : (G === 'deck' ? '#e2b678' : G === 'tiles' ? '#e08a68' : '#8b8796')}" ${O(3)}/>`; }
      x = b;
    }
    if (x < W) s += seg(x, W);
    // канал: набережные и вода (по воде не ходят), мостики
    s += `<rect x="0" y="${c0 - 10}" width="${W}" height="${c1 - c0 + 20}" fill="${G === 'deck' ? '#6e4a2f' : G === 'tiles' ? '#7a3426' : '#4d4a5c'}" ${O(5)}/><rect x="0" y="${c0 + 4}" width="${W}" height="${c1 - c0 - 8}" fill="url(#lwWater)"/>`;
    // 25.10: набережная — камни бортика сверху и снизу, у воды — тёмная кромка и блики фонарей на воде
    if (Kt !== STUB) s += Kt.wall([0, c0 - 10, W, c0 + 4], { pal: 'brick', scale: 0.24, seed: 41 }) + Kt.wall([0, c1 - 4, W, c1 + 10], { pal: 'brick', scale: 0.24, seed: 43 }) + `<path d="M0 ${c0 + 5} H${W} M0 ${c1 - 5} H${W}" stroke="${K.ink}" stroke-width="3" opacity=".5"/>`;
    for (const [lx] of L.lamps) s += `<ellipse cx="${lx}" cy="${(c0 + c1) / 2}" rx="26" ry="30" fill="url(#lwGlow)" opacity=".45"/><path d="M${lx - 14} ${(c0 + c1) / 2 - 10} h28 M${lx - 10} ${(c0 + c1) / 2 + 4} h20 M${lx - 6} ${(c0 + c1) / 2 + 18} h12" stroke="#fff3c0" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    for (let i = 0; i < 60; i++) { const wx = rnd() * W, wy = c0 + 18 + rnd() * (c1 - c0 - 36); s += `<path d="M${wx.toFixed(0)} ${wy.toFixed(0)} q14 -8 28 0 q14 8 28 0" fill="none" stroke="#e8fbff" stroke-width="3" opacity=".55"/>`; }
    if (style === 'cats') for (let i = 0; i < 10; i++) { const fx = 200 + rnd() * (W - 400), fy = c0 + 30 + rnd() * 30; s += `<g transform="translate(${fx.toFixed(0)} ${fy.toFixed(0)})"><path d="M-14 0 q14 -12 28 0 q-14 12 -28 0 Z M14 0 l10 -8 v16 Z" fill="#ffb27a" stroke="${K.ink}" stroke-width="2.5"/></g>`; }
    if (style === 'monkeys') for (let i = 0; i < 8; i++) { const lx = 200 + rnd() * (W - 400), ly = c0 + 20 + rnd() * 50; s += `<ellipse cx="${lx.toFixed(0)}" cy="${ly.toFixed(0)}" rx="18" ry="8" fill="#56a843" stroke="${K.ink}" stroke-width="2.5"/>`; }
    for (const [a, b] of L.bridges) {
      const deck = G === 'deck' ? '#c99a5e' : G === 'tiles' ? '#a8754f' : '#8b8796';
      s += `<path d="M${a - 20} ${c0 - 14} H${b + 20} V${c1 + 14} H${a - 20} Z" fill="${deck}"/>`;
      // 25.10: настил мостика — доски набора
      if (Kt !== STUB) s += Kt.pave('plank', [a - 20, c0 - 14, b + 20, c1 + 14], { pal: G === 'cobble' ? 'stone' : 'wood', k0: 0.55, k1: 0.55, seed: a, cut: true });
      else for (let y = c0; y < c1 + 10; y += 20) s += `<path d="M${a - 20} ${y} H${b + 20}" stroke="${K.ink}" stroke-width="2.5" opacity=".4"/>`;
      s += `<path d="M${a - 20} ${c0 - 14} H${b + 20} V${c1 + 14} H${a - 20} Z" fill="none" ${O(5)}/>`;
      // перила по бокам моста (вдоль канала — поперёк воды)
      for (const px of [a - 14, b + 14]) s += `<path d="M${px} ${c0 - 50} V${c1 + 10}" stroke="${K.line}" stroke-width="12" stroke-linecap="round"/><path d="M${px} ${c0 - 50} V${c1 + 10}" stroke="${G === 'deck' ? '#d8b98a' : K.woodD}" stroke-width="7" stroke-linecap="round"/>`;
    }
    // нижний край: низкая ограда и кусты
    s += `<rect x="0" y="${H - 44}" width="${W}" height="44" fill="${G === 'deck' ? '#9a6a3c' : G === 'tiles' ? '#a9503c' : '#5a5768'}" ${O(5)}/>`;
    // 25.10: кусты у нижней ограды (символы набора), между ними — цветочные ящики
    if (Kt !== STUB) { for (let bx = 60; bx < W; bx += 170 + rnd() * 120) s += Kt.tree('bush', f1(bx), H - 40, f1(0.75 + rnd() * 0.3), rnd() < 0.5) + (rnd() < 0.35 ? Kt.thing('flowers', f1(bx + 96), H - 44, 1) : ''); }
    else for (let bx = 30; bx < W; bx += 150 + rnd() * 120) s += `<ellipse cx="${bx.toFixed(0)}" cy="${H - 72}" rx="${(46 + rnd() * 24).toFixed(0)}" ry="26" fill="${style === 'cats' ? '#5a3a5a' : '#3f8f3a'}" ${O(4)}/>`;
    // предметы с глубиной: лавочки, клумбы, фонари
    const benchC = style === 'cats' ? '#e88aa8' : K.wood;
    for (const [bx, by] of L.benches) props.push({ x: bx - 100, y: by - 110, w: 200, h: 130, z: by, svg: () => style === 'cats'
      ? `<rect x="${bx - 80}" y="${by - 34}" width="160" height="40" rx="18" fill="${benchC}" ${O(5)}/><path d="M${bx - 70} ${by - 30} h140" stroke="#fff" stroke-width="4" opacity=".5"/><path d="M${bx - 60} ${by - 34} l8 -24 l14 22 M${bx + 60} ${by - 34} l-8 -24 l-14 22" fill="${benchC}" ${O(4)}/>`
      : `<rect x="${bx - 80}" y="${by - 74}" width="160" height="16" rx="5" fill="${benchC}" ${O(4)}/><path d="M${bx - 72} ${by - 68} h60 M${bx + 10} ${by - 64} h56" stroke="${K.woodD}" stroke-width="2" opacity=".6"/><rect x="${bx - 80}" y="${by - 40}" width="160" height="18" rx="5" fill="${benchC}" ${O(4)}/><path d="M${bx - 70} ${by - 34} h70 M${bx + 14} ${by - 30} h52" stroke="${K.woodD}" stroke-width="2" opacity=".6"/><path d="M${bx - 66} ${by - 22} V${by + 4} M${bx + 66} ${by - 22} V${by + 4} M${bx - 66} ${by - 58} V${by - 40} M${bx + 66} ${by - 58} V${by - 40}" stroke="${K.line}" stroke-width="10" stroke-linecap="round"/><path d="M${bx - 66} ${by - 22} V${by + 4} M${bx + 66} ${by - 22} V${by + 4} M${bx - 66} ${by - 58} V${by - 40} M${bx + 66} ${by - 58} V${by - 40}" stroke="${K.woodD}" stroke-width="5" stroke-linecap="round"/>` });
    // 24.10: шахта открыта — клумба у доски итогов левее (citymap.js LOW.mineBed)
    const beds = opt.mine && L.mine && L.mineBed ? L.beds.map(([x, y]) => (x === L.mineBed[0][0] && y === L.mineBed[0][1] ? L.mineBed[1] : [x, y])) : L.beds;
    for (const [fx, fy] of beds) props.push({ x: fx - 110, y: fy - 90, w: 220, h: 130, z: fy, svg: () => {
      let g = `<ellipse cx="${fx}" cy="${fy}" rx="100" ry="34" fill="${G === 'deck' ? '#8a5a32' : '#8b8796'}" ${O(5)}/><ellipse cx="${fx}" cy="${fy - 6}" rx="86" ry="24" fill="#5a3d24"/>`;
      const fl = style === 'monkeys' ? ['#ffd84a', '#ffd84a', '#ff8a5c'] : style === 'cats' ? ['#9fe39a', '#b9a2ff', '#ff9fb2'] : style === 'veggies' ? ['#e8892a', '#e8455c', '#6fdc6f'] : ['#e8455c', '#ffd76a', '#b9a2ff'];
      g += Kt.tree('bush', fx, fy - 8, 0.62);   // 25.10: куст посередине клумбы, цветы вокруг
      for (let i = 0; i < 9; i++) { if (i === 3 || i === 4 || i === 5) continue; const px = fx - 70 + i * 17.5, py = fy - 14 - (i % 2) * 10; g += `<path d="M${px} ${py + 10} V${py - 22}" stroke="#3f8f3a" stroke-width="4"/><circle cx="${px}" cy="${py - 26}" r="10" fill="${fl[i % 3]}" stroke="${K.ink}" stroke-width="2.5"/><circle cx="${px}" cy="${py - 26}" r="3.4" fill="#fff6c8"/>`; }
      return g;
    } });
    // мелочи: у каждого стиля свои
    const kinds = style === 'cats' ? ['yarn', 'fishbox', 'pot', 'crate'] : style === 'monkeys' ? ['bananas', 'barrel', 'pot', 'crate'] : style === 'veggies' ? ['pumpkin', 'crate', 'pot', 'barrel'] : ['barrel', 'crate', 'pot', 'cart'];
    const deco = (k, x, y) => {
      if (k === 'barrel') return `<rect x="${x - 26}" y="${y - 62}" width="52" height="64" rx="10" fill="${K.wood}" ${O(4)}/><path d="M${x - 26} ${y - 44} H${x + 26} M${x - 26} ${y - 16} H${x + 26}" stroke="${K.woodD}" stroke-width="5"/>`;
      if (k === 'crate' || k === 'fishbox') return `<rect x="${x - 34}" y="${y - 54}" width="68" height="56" fill="${K.wood}" ${O(4)}/><path d="M${x - 34} ${y - 54} L${x + 34} ${y + 2} M${x + 34} ${y - 54} L${x - 34} ${y + 2}" stroke="${K.woodD}" stroke-width="4"/>` + (k === 'fishbox' ? [-18, 0, 18].map((d) => `<path transform="translate(${x + d} ${y - 60}) rotate(-70)" d="M-14 0 q14 -10 28 0 q-14 10 -28 0 Z M14 0 l9 -7 v14 Z" fill="#9fd6ff" stroke="${K.ink}" stroke-width="2.5"/>`).join('') : '');
      if (k === 'pot') return `<path d="M${x - 24} ${y - 40} H${x + 24} L${x + 18} ${y} H${x - 18} Z" fill="#c56a2a" ${O(4)}/><circle cx="${x - 12}" cy="${y - 58}" r="16" fill="#56a843" ${O(3)}/><circle cx="${x + 10}" cy="${y - 64}" r="18" fill="#3f8f3a" ${O(3)}/>`;
      if (k === 'yarn') return `<circle cx="${x}" cy="${y - 24}" r="26" fill="#ff9fb2" ${O(4)}/><path d="M${x - 20} ${y - 34} q20 -6 40 6 M${x - 24} ${y - 20} q24 -6 46 8 M${x - 10} ${y - 48} q16 18 4 46" fill="none" stroke="#c84a6a" stroke-width="3"/><path d="M${x + 20} ${y - 8} q30 10 40 -6" fill="none" stroke="#ff9fb2" stroke-width="4"/>`;
      if (k === 'bananas') return `<path d="M${x - 30} ${y - 30} q30 40 60 0 q-30 20 -60 0 Z M${x - 24} ${y - 46} q24 34 48 0 q-24 16 -48 0 Z" fill="#ffd84a" ${O(3.5)}/>`;
      if (k === 'pumpkin') return `<ellipse cx="${x}" cy="${y - 26}" rx="38" ry="28" fill="#e8892a" ${O(4)}/><path d="M${x - 12} ${y - 52} q-6 26 0 52 M${x + 12} ${y - 52} q6 26 0 52" fill="none" stroke="#a85a12" stroke-width="3"/><path d="M${x} ${y - 54} q4 -14 14 -16" stroke="#3f8f3a" stroke-width="6" fill="none"/>`;
      return `<rect x="${x - 50}" y="${y - 54}" width="100" height="40" fill="${K.wood}" ${O(4)}/><circle cx="${x - 30}" cy="${y - 8}" r="14" fill="${K.woodD}" ${O(3)}/><circle cx="${x + 30}" cy="${y - 8}" r="14" fill="${K.woodD}" ${O(3)}/>`;
    };
    L.decor.forEach(([dx, dy], i) => { const k = kinds[i % kinds.length]; props.push({ x: dx - 60, y: dy - 110, w: 120, h: 120, z: dy, svg: () => deco(k, dx, dy) }); });
    // памятник посреди нижней площади: постамент и фигура в духе стиля (кот, легионер, обезьяна, тыква)
    { const [sx, sy] = L.statue, stone = '#8b8796';
      const fig = style === 'cats' ? `<path d="M${sx - 40} ${sy - 150} q0 -90 40 -100 q40 10 40 100 Z" fill="${stone}" ${O(5)}/><path d="M${sx - 30} ${sy - 230} l10 -34 l18 26 Z M${sx + 30} ${sy - 230} l-10 -34 l-18 26 Z" fill="${stone}" ${O(4)}/><circle cx="${sx}" cy="${sy - 215}" r="34" fill="${stone}" ${O(5)}/><path d="M${sx + 40} ${sy - 160} q50 -10 40 -70" fill="none" stroke="${K.line}" stroke-width="16" stroke-linecap="round"/><path d="M${sx + 40} ${sy - 160} q50 -10 40 -70" fill="none" stroke="${stone}" stroke-width="10" stroke-linecap="round"/>`
        : style === 'monkeys' ? `<rect x="${sx - 26}" y="${sy - 300}" width="52" height="150" rx="10" fill="#9a6a3c" ${O(5)}/>` + [0, 1, 2].map((i) => `<circle cx="${sx}" cy="${sy - 270 + i * 46}" r="22" fill="#7a5230" ${O(4)}/><circle cx="${sx - 8}" cy="${sy - 274 + i * 46}" r="4" fill="${K.ink}"/><circle cx="${sx + 8}" cy="${sy - 274 + i * 46}" r="4" fill="${K.ink}"/>`).join('') + `<path d="M${sx - 40} ${sy - 300} q40 -60 80 0" fill="#ffd84a" ${O(4)}/>`
        : style === 'veggies' ? `<ellipse cx="${sx}" cy="${sy - 200}" rx="70" ry="54" fill="#e8892a" ${O(5)}/><path d="M${sx - 24} ${sy - 250} q-10 50 0 100 M${sx + 24} ${sy - 250} q10 50 0 100" fill="none" stroke="#a85a12" stroke-width="4"/><path d="M${sx} ${sy - 254} q8 -30 30 -34" stroke="#3f8f3a" stroke-width="9" fill="none"/>`
        : `<path d="M${sx - 34} ${sy - 150} V${sy - 230} q34 -20 68 0 V${sy - 150} Z" fill="${stone}" ${O(5)}/><circle cx="${sx}" cy="${sy - 254}" r="28" fill="${stone}" ${O(5)}/><path d="M${sx - 32} ${sy - 266} q32 -40 64 0" fill="#a3122a" ${O(4)}/><path d="M${sx + 40} ${sy - 140} V${sy - 300}" stroke="${K.line}" stroke-width="12"/><path d="M${sx + 40} ${sy - 140} V${sy - 300}" stroke="#c9ccd6" stroke-width="7"/><rect x="${sx - 58}" y="${sy - 220}" width="34" height="60" rx="8" fill="#a3122a" ${O(4)}/>`;
      props.push({ x: sx - 140, y: sy - 330, w: 280, h: 340, z: sy, svg: () => `<ellipse cx="${sx}" cy="${sy}" rx="112" ry="34" fill="${stone}" ${O(5)}/><rect x="${sx - 80}" y="${sy - 150}" width="160" height="150" fill="${stone}" ${O(5)}/><rect x="${sx - 96}" y="${sy - 160}" width="192" height="22" fill="#a9a5b4" ${O(4)}/><rect x="${sx - 60}" y="${sy - 110}" width="120" height="44" rx="6" fill="${K.sign}" ${O(3)}/><text x="${sx}" y="${sy - 80}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="22" fill="${K.signTx}">ГЕРОЯМ</text>` + fig });
    }
    // 23.10: вход в шахту (промысел города) — скальный выступ у подпорной стены с крепью, рельсами и вагонеткой (citymap.js LOW.mine).
    // Только кому шахта открыта (opt.mine)
    if (opt.mine && L.mine) { const { x0, x1, base: B } = L.mine;
      props.push({ x: x0 - 30, y: 1030, w: x1 - x0 + 60, h: B - 1030 + 30, z: B, svg: () => {
        const cx = (x0 + x1) / 2, rock = style === 'cats' ? '#8a6a5a' : style === 'monkeys' ? '#8a7a5a' : '#7a7484', rockL = style === 'cats' ? '#a8887a' : style === 'monkeys' ? '#a89a72' : '#9a94a6', rockD = style === 'cats' ? '#5e4638' : style === 'monkeys' ? '#5e5236' : '#57505e';
        const tx = (x, y, t, size, fill = K.signTx) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="${fill}" stroke="${K.ink}" stroke-width="${Math.max(3, size / 7)}" paint-order="stroke" letter-spacing="2">${t}</text>`;
        let g = `<g data-ol="mine"><ellipse cx="${cx}" cy="${B}" rx="${(x1 - x0) / 2 + 14}" ry="16" fill="${K.ink}" opacity=".3"/>`;
        // скала: груда валунов от стены до основания
        g += `<path d="M${x0} ${B} L${x0 + 6} ${B - 120} Q${x0 + 20} ${1090} ${x0 + 90} ${1070} Q${cx} ${1030} ${x1 - 80} ${1062} Q${x1 - 6} ${1090} ${x1} ${B - 110} L${x1 + 6} ${B} Z" fill="${rock}" ${O(5)}/>`;
        g += `<path d="M${x0 + 30} ${1110} q40 -30 90 -24 M${x1 - 120} ${1084} q50 -10 86 20 M${x0 + 20} ${B - 70} q30 -20 60 -6" stroke="${rockL}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
        g += `<path d="M${x0 + 40} ${1160} l18 30 l-8 26 M${x1 - 50} ${1150} l-14 34" stroke="${rockD}" stroke-width="5" fill="none"/>`;
        // 26.10: валуны и сколы по скале
        { let d = '', c = ''; for (const [px, py, rr] of [[x0 + 50, 1150, 22], [x0 + 34, B - 40, 18], [x1 - 46, 1130, 24], [x1 - 30, B - 50, 16], [cx - 120, 1080, 16], [cx + 110, 1084, 18]]) { d += `M${px - rr} ${py} q${f1(rr * 0.3)} ${f1(-rr * 0.9)} ${rr} ${f1(-rr * 0.75)} q${f1(rr * 0.8)} ${f1(rr * 0.1)} ${rr} ${f1(rr * 0.75)} q${f1(-rr * 0.4)} ${f1(rr * 0.6)} ${-rr} ${f1(rr * 0.5)} Z `; c += `M${px - rr * 0.5} ${py - rr * 0.45} h${f1(rr * 0.6)} `; }
          g += `<path d="${d}" fill="${rockD}" stroke="${K.ink}" stroke-width="2.5" opacity=".75"/><path d="${c}" stroke="${rockL}" stroke-width="3" stroke-linecap="round"/>`; }
        // крепь и тёмный проём
        const d0 = cx - 78, d1 = cx + 78, dt = 1150;
        g += `<path d="M${d0} ${B} V${dt + 40} Q${cx} ${dt - 16} ${d1} ${dt + 40} V${B} Z" fill="#120e16" ${O(5)}/>`;
        g += `<path d="M${d0 - 6} ${B} V${dt + 26} M${d1 + 6} ${B} V${dt + 26}" stroke="${K.woodD}" stroke-width="20"/><path d="M${d0 - 26} ${dt + 22} H${d1 + 26}" stroke="${K.woodD}" stroke-width="22"/>`;
        g += `<path d="M${d0 - 6} ${B} V${dt + 26} M${d1 + 6} ${B} V${dt + 26} M${d0 - 26} ${dt + 22} H${d1 + 26}" stroke="${K.ink}" stroke-width="3" opacity=".45"/><path d="M${d0 - 10} ${dt + 40} V${B - 8} M${d1 + 2} ${dt + 44} V${B - 12} M${d0 - 20} ${dt + 16} H${d1 + 20}" stroke="${K.wood}" stroke-width="2" stroke-dasharray="16 8" opacity=".7"/>`
          + [dt + 70, B - 40].map((yy) => `<path d="M${d0 - 17} ${yy} h22 M${d1 - 5} ${yy} h22" stroke="#3a3640" stroke-width="6"/>`).join('')
          + `<g transform="translate(${d1 + 30} ${B}) rotate(14)"><path d="M0 0 V-60" stroke="${K.ink}" stroke-width="8" stroke-linecap="round"/><path d="M0 0 V-60" stroke="${K.wood}" stroke-width="4" stroke-linecap="round"/><path d="M-20 -56 Q0 -72 20 -56 Q0 -64 -20 -56 Z" fill="#9a9aa6" ${O(3)}/></g>`;   // 26.10: волокна крепи, скобы, кирка
        // рельсы из проёма и вагонетка с рудой
        g += `<path d="M${cx - 30} ${B - 30} L${cx - 54} ${B + 4} M${cx + 30} ${B - 30} L${cx + 54} ${B + 4}" stroke="#9a9aa6" stroke-width="5"/>` + [0, 1, 2].map((i) => `<path d="M${cx - 36 - i * 8} ${B - 22 + i * 12} H${cx + 36 + i * 8}" stroke="${K.woodD}" stroke-width="6"/>`).join('');
        g += `<g transform="translate(${x1 - 70} ${B - 6})"><path d="M-46 -54 h92 l-10 44 h-72 Z" fill="#6a6a78" ${O(4)}/><circle cx="-24" cy="-6" r="11" fill="#3a3a44" ${O(3)}/><circle cx="24" cy="-6" r="11" fill="#3a3a44" ${O(3)}/>`
          + [['#c8643a', -28], ['#24232a', -8], ['#ffcf3a', 10], ['#eef3fa', 28]].map(([c, x]) => `<circle cx="${x}" cy="-58" r="11" fill="${c}" ${O(3)}/>`).join('') + `</g>`;
        // фонарь и вывеска
        g += `<path d="M${d1 + 24} ${dt + 30} v26" stroke="${K.ink}" stroke-width="3"/><path d="M${d1 + 12} ${dt + 56} h24 l-4 26 h-16 Z" fill="${K.glass}" ${O(3)}/>`;
        // доска итогов слева от скалы: два столбика, доска с листками и шапкой «ИТОГИ»
        { const bx0 = 1066, bx1 = 1146, top = 1170; g += `</g><g data-ol="mineboard"><path d="M${bx0 + 12} ${B} V${top + 40} M${bx1 - 12} ${B} V${top + 40}" stroke="${K.woodD}" stroke-width="9"/><rect x="${bx0}" y="${top}" width="${bx1 - bx0}" height="96" rx="6" fill="#c49a62" ${O(4)}/>` + [0, 1].map((k) => `<rect x="${bx0 + 8 + k * 36}" y="${top + 24 + k * 6}" width="28" height="36" fill="#f3efd8" ${O(2)}/><path d="M${bx0 + 12 + k * 36} ${top + 34 + k * 6} h20 M${bx0 + 12 + k * 36} ${top + 42 + k * 6} h14" stroke="${K.ink}" stroke-width="2" opacity=".5"/>`).join('') + `<rect x="${bx0 - 4}" y="${top - 18}" width="${bx1 - bx0 + 8}" height="28" rx="6" fill="${K.sign}" ${O(3)}/>` + tx((bx0 + bx1) / 2, top + 2, 'ИТОГИ', 16) + '</g><g data-ol="mine">'; }   // доска — своя обводка (mineboard)
        g += `<rect x="${cx - 92}" y="${dt - 64}" width="184" height="48" rx="10" fill="${K.sign}" ${O(4)}/><rect x="${cx - 84}" y="${dt - 57}" width="168" height="34" rx="7" fill="none" stroke="${K.signTx}" stroke-width="2"/>` + tx(cx, dt - 29, 'ШАХТА', 26);
        return g + '</g>';
      } });
    }
    // 22.10: Склад — амбар, пристроенный к подпорной стене слева от лестницы (citymap.js LOW.storage): ворота, вывеска, ящики и бочки
    if (L.storage) { const { x0, x1, base: B } = L.storage;
      props.push({ x: x0 - 40, y: 1040, w: x1 - x0 + 80, h: B - 1040 + 20, z: B, svg: () => {
        const cx = (x0 + x1) / 2, top = 1158, a = x0 + 20, b = x1 - 20, peak = 1074;
        const tx = (x, y, t, size, fill = K.signTx) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="${fill}" stroke="${K.ink}" stroke-width="${Math.max(3, size / 7)}" paint-order="stroke" letter-spacing="3">${t}</text>`;
        const plank = G === 'tiles' ? '#b07a52' : G === 'deck' ? '#c99a5e' : '#8a6a4a', plankD = G === 'tiles' ? '#7a4a30' : G === 'deck' ? '#8a5a32' : '#5e4630';
        const roofC = style === 'cats' ? '#5a3a5a' : style === 'monkeys' ? '#3f8f3a' : style === 'veggies' ? '#4f9a3a' : '#a3122a';
        let g = `<g data-ol="storage"><ellipse cx="${cx}" cy="${B}" rx="${(x1 - x0) / 2 + 10}" ry="16" fill="${K.ink}" opacity=".3"/>`;
        // стены из досок, каменный цоколь
        // 26.10 (art/buildings): обшивка досками набора, цоколь — кладка, крыша — черепица / листья рядами
        g += `<rect x="${a}" y="${top}" width="${b - a}" height="${B - top}" fill="${plank}" ${O(5)}/>`;
        if (Kt.planks) g += Kt.planks([a + 2, top + 2, b - 2, B - 40], plank, 26) + `<rect x="${a}" y="${top}" width="${b - a}" height="${B - top}" fill="none" ${O(5)}/>`;
        else for (let x = a + 26; x < b; x += 26) g += `<path d="M${x} ${top + 4} V${B - 40}" stroke="${plankD}" stroke-width="2.5" opacity=".7"/>`;
        g += `<rect x="${a - 6}" y="${B - 40}" width="${b - a + 12}" height="40" fill="${G === 'deck' ? '#8a5a32' : '#8b8796'}" ${O(4)}/>` + (Kt !== STUB && G !== 'deck' ? Kt.wall([a - 4, B - 38, b + 4, B - 2], { pal: G === 'tiles' ? 'brick' : 'light', scale: 0.3, seed: 61 }) + `<rect x="${a - 6}" y="${B - 40}" width="${b - a + 12}" height="40" fill="none" ${O(4)}/>` : [0, 1, 2, 3, 4, 5].map((i) => `<path d="M${a + 30 + i * 64} ${B - 40} V${B}" stroke="${K.ink}" stroke-width="2" opacity=".35"/>`).join(''));
        // крыша: двускатная, у котиков — уши, у обезьян — листья
        if (Kt !== STUB) g += Kt.roof([[a - 26, top + 6], [cx, peak], [b + 26, top + 6]], { pal: roofPal(roofC), kind: G === 'deck' ? 'leaf' : 'round', step: 15, scale: 0.7, id: 'lwStR' });
        else { g += `<path d="M${a - 26} ${top + 6} L${cx} ${peak} L${b + 26} ${top + 6} Z" fill="${roofC}" ${O(5)}/>`;
          for (let i = 1; i < 4; i++) { const yy = peak + (top - peak) * i / 4, dx = ((b - a) / 2 + 26) * i / 4; g += `<path d="M${cx - dx} ${yy} H${cx + dx}" stroke="${K.ink}" stroke-width="2.5" opacity=".3"/>`; } }
        if (Kt.gutter) g += Kt.gutter(a - 18, b + 18, top + 10, a + 6, B - 40);
        if (style === 'cats') g += `<path d="M${a - 6} ${top} l16 -40 l20 34 Z M${b + 6} ${top} l-16 -40 l-20 34 Z" fill="${roofC}" ${O(4)}/><path d="M${a + 6} ${top - 8} l6 -17 l8 14 Z M${b - 6} ${top - 8} l-6 -17 l-8 14 Z" fill="#ff8fa3"/>`;
        if (style === 'monkeys') for (let i = 0; i <= 6; i++) { const lx = a - 20 + (b - a + 40) * i / 6; g += `<ellipse cx="${lx.toFixed(0)}" cy="${top + 8}" rx="22" ry="10" fill="${i % 2 ? '#56a843' : '#3f8f3a'}" ${O(3)} transform="rotate(${i % 2 ? 18 : -18} ${lx.toFixed(0)} ${top + 8})"/>`; }
        // круглое окошко под коньком и балка с блоком
        g += `<circle cx="${cx}" cy="${top - 30}" r="25" fill="${plankD}" ${O(4)}/><circle cx="${cx}" cy="${top - 30}" r="18" fill="${K.glass}" stroke="${K.ink}" stroke-width="2"/><path d="M${cx} ${top - 48} V${top - 12} M${cx - 18} ${top - 30} H${cx + 18}" stroke="${plankD}" stroke-width="3.5"/><path d="M${cx - 10} ${top - 36} l8 -8" stroke="#fffbe0" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`
          + `<path d="M${cx} ${peak + 14} H${cx + 54}" stroke="${K.ink}" stroke-width="12" stroke-linecap="round"/><path d="M${cx} ${peak + 14} H${cx + 54}" stroke="${plankD}" stroke-width="7" stroke-linecap="round"/><circle cx="${cx + 48}" cy="${peak + 24}" r="7" fill="#8a8e9e" ${O(2.5)}/><path d="M${cx + 48} ${peak + 30} V${top - 4}" stroke="${K.ink}" stroke-width="2.5"/>`;   // 26.10: рама окошка, балка с блоком и верёвкой
        // вывеска
        g += `<rect x="${cx - 96}" y="${top + 14}" width="192" height="50" rx="10" fill="${K.sign}" ${O(4)}/><rect x="${cx - 88}" y="${top + 21}" width="176" height="36" rx="7" fill="none" stroke="${K.signTx}" stroke-width="2"/>` + tx(cx, top + 51, 'СКЛАД', 28);
        // ворота
        const d0 = cx - 66, d1 = cx + 66, dt = top + 82;
        g += `<path d="M${d0} ${B - 40} V${dt + 34} A66 34 0 0 1 ${d1} ${dt + 34} V${B - 40} Z" fill="${plankD}" ${O(5)}/><path d="M${cx} ${dt + 2} V${B - 40}" stroke="${K.ink}" stroke-width="3"/>`
          + `<path d="${[1, 2, 3, 5, 6, 7].map((k) => `M${d0 + k * 16.5} ${dt + 10 + Math.abs(k - 4) * 4} V${B - 42}`).join('')}" stroke="${K.ink}" stroke-width="2" opacity=".4"/><path d="M${d0 + 4} ${dt + 52} h${d1 - d0 - 8} M${d0 + 4} ${B - 62} h${d1 - d0 - 8}" stroke="#3a3640" stroke-width="7"/><path d="M${d0 + 12} ${dt + 52}h0.1M${cx - 12} ${dt + 52}h0.1M${cx + 12} ${dt + 52}h0.1M${d1 - 12} ${dt + 52}h0.1M${d0 + 12} ${B - 62}h0.1M${cx - 12} ${B - 62}h0.1M${cx + 12} ${B - 62}h0.1M${d1 - 12} ${B - 62}h0.1" stroke="#a9b1b6" stroke-width="4" stroke-linecap="round"/>`;   // 26.10: доски ворот, железные полосы с заклёпками
        g += `<path d="M${d0 + 8} ${dt + 46} L${cx - 6} ${B - 50} M${d1 - 8} ${dt + 46} L${cx + 6} ${B - 50}" stroke="${plank}" stroke-width="7" stroke-linecap="round"/><circle cx="${cx - 14}" cy="${(dt + B) / 2}" r="5" fill="#c9ccd6" ${O(2)}/><circle cx="${cx + 14}" cy="${(dt + B) / 2}" r="5" fill="#c9ccd6" ${O(2)}/>`;
        if (!opt.storage) g += `<path d="M${d0 + 4} ${dt + 50} L${d1 - 4} ${B - 60} M${d1 - 4} ${dt + 50} L${d0 + 4} ${B - 60}" stroke="${K.wood}" stroke-width="10" stroke-linecap="round"/><g transform="translate(${cx} ${dt + 64}) rotate(-6)"><rect x="-74" y="-24" width="148" height="48" rx="7" fill="${K.wood}" ${O(4)}/>${tx(0, 11, 'СКОРО', 28, '#fff3c8')}</g>`;
        // ящики слева, бочки справа (как у лавок Ярмарки)
        const crate = (x, y, w) => `<rect x="${x}" y="${y - w}" width="${w}" height="${w}" fill="${K.wood}" ${O(4)}/><path d="M${x} ${y - w} L${x + w} ${y} M${x + w} ${y - w} L${x} ${y}" stroke="${K.woodD}" stroke-width="4"/>`;
        g += Kt.thing && Kt !== STUB ? Kt.thing('crate', a + 5, B + 4, 0.85) + Kt.thing('crate', a + 62, B + 4, 0.76) + Kt.thing('crate', a + 19, B - 49, 0.74) : crate(a - 24, B + 4, 58) + crate(a + 36, B + 4, 52) + crate(a - 6, B - 54, 50);
        const barrel = (x, y) => `<rect x="${x - 24}" y="${y - 58}" width="48" height="60" rx="10" fill="${K.wood}" ${O(4)}/><path d="M${x - 24} ${y - 42} H${x + 24} M${x - 24} ${y - 16} H${x + 24}" stroke="${K.woodD}" stroke-width="5"/>`;
        g += Kt.thing && Kt !== STUB ? Kt.thing('barrel', b - 8, B + 4, 0.66) + Kt.thing('barrel', b + 40, B + 6, 0.66) : barrel(b - 8, B + 4) + barrel(b + 40, B + 6);
        // фонарь у ворот
        g += `<circle cx="${d1 + 30}" cy="${dt + 20}" r="40" fill="url(#lwGlow)" opacity=".7"/><path d="M${d1 + 14} ${dt + 4} h16 v10" stroke="${K.ink}" stroke-width="4" fill="none"/><path d="M${d1 + 20} ${dt + 14} h20 l-3 24 h-14 Z" fill="${K.glass}" ${O(3)}/>`;
        return g + '</g>';
      } });
    }
    // 25.10: фонари — кованые столбы набора (свет — в рамке предмета)
    for (const [lx, ly] of L.lamps) props.push({ x: lx - 50, y: ly - 240, w: 100, h: 260, z: ly, svg: () => Kt === STUB ? `<path d="M${lx} ${ly} V${ly - 190}" stroke="${K.ink}" stroke-width="7"/>` : `<circle cx="${lx}" cy="${ly - 192}" r="46" fill="url(#lwGlow)" opacity=".75"/>` + Kt.lamp(lx, ly, 218, { glow: false, pool: false }) });
    for (const p of props) { const f = p.svg; p.svg = () => (Kt.wrap ? Kt.wrap(f()) : f()); }   // у каждого предмета — свои <defs> набора
    return { svg: Kt.wrap ? Kt.wrap(s) : s, props };
  }
  /* ----- 20.10: интерьеры зданий без своего рисунка на стриме (Лавка, Тренер, Доска, Ратуша/Аукцион/Ворота) — 1920×1080,
     тем же языком, что интерьеры Кузни и Шатра в styles/<стиль>/fair.js. kind: shop | trainer | board | plain ----- */
  function room(style, kind) {
    const K = PAL[style] || PAL.legion;
    const O = (w = 5) => `stroke="${K.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const wall = style === 'cats' ? '#b9845a' : style === 'monkeys' ? '#8a6a3c' : style === 'veggies' ? '#5a6a48' : '#3d3550';
    const wallD = style === 'cats' ? '#8a5a38' : style === 'monkeys' ? '#6e4a2f' : style === 'veggies' ? '#46543a' : '#2a2440';
    const floor = style === 'cats' ? '#c8664a' : style === 'monkeys' ? '#c99a5e' : '#6b4a2a';
    const txt = (x, y, t, size, fill = K.signTx) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="${fill}" stroke="${K.ink}" stroke-width="${Math.max(3, size / 7)}" paint-order="stroke" letter-spacing="3">${t}</text>`;
    const sign = (x, y, w, t) => `<rect x="${x - w / 2}" y="${y - 40}" width="${w}" height="80" rx="14" fill="${K.sign}" ${O(6)}/><rect x="${x - w / 2 + 10}" y="${y - 30}" width="${w - 20}" height="60" rx="9" fill="none" stroke="${K.signTx}" stroke-width="3"/>${txt(x, y + 16, t, 42)}`;
    let s = `<defs><radialGradient id="rmL" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>
      <radialGradient id="rmGlow"><stop offset="0" stop-color="#ffe59a" stop-opacity=".85"/><stop offset="1" stop-color="#ffbe5a" stop-opacity="0"/></radialGradient></defs>`;
    s += `<rect width="1920" height="1080" fill="${wall}"/>`;
    if (style === 'monkeys') for (let x = 0; x < 1920; x += 64) s += `<path d="M${x} 0 V900" stroke="${wallD}" stroke-width="5"/>`;
    else for (let r = 0; r < 15; r++) for (let c = 0; c < 18; c++) s += `<rect x="${c * 112 + (r % 2) * 56 - 30}" y="${r * 60}" width="104" height="52" rx="7" fill="none" stroke="${K.ink}" stroke-width="2" opacity=".2"/>`;
    s += `<rect width="1920" height="1080" fill="url(#rmL)"/>`;
    s += `<rect x="0" y="900" width="1920" height="180" fill="${floor}"/><path d="M0 900 H1920" stroke="${K.line}" stroke-width="6"/>`;
    for (let i = 0; i < 12; i++) s += `<path d="M${i * 170} 900 L${i * 170 - 60} 1080" stroke="${K.ink}" stroke-width="3" opacity=".35"/>`;
    const STORAGE_SIGN_Y = 300;   // 23.10: центр вывески Склада в зале (верх таблички — на 40 выше)
    const lamp = (x) => `<circle cx="${x}" cy="200" r="120" fill="url(#rmGlow)"/><path d="M${x} 0 V150" stroke="${K.ink}" stroke-width="5"/><path d="M${x - 30} 150 h60 l-12 46 h-36 Z" fill="${K.glass}" ${O(4)}/>`;
    const win = (x, y) => `<rect x="${x}" y="${y}" width="170" height="220" rx="12" fill="#1e1c40" ${O(6)}/><path d="M${x + 85} ${y} V${y + 220} M${x} ${y + 110} H${x + 170}" stroke="${K.line}" stroke-width="6"/><circle cx="${x + 120}" cy="${y + 60}" r="22" fill="#f3efd8"/>`;
    const shelf = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="18" rx="4" fill="${K.wood}" ${O(4)}/>`;
    const jar = (x, y, c) => `<path d="M${x - 18} ${y} V${y - 46} q0 -10 10 -10 h16 q10 0 10 10 V${y} Z" fill="${c}" ${O(4)}/><rect x="${x - 12}" y="${y - 66}" width="24" height="12" rx="3" fill="${K.woodD}" ${O(3)}/>`;
    const bottle = (x, y, c) => `<path d="M${x - 6} ${y - 58} V${y - 40} C${x - 26} ${y - 30} ${x - 26} ${y} ${x} ${y} C${x + 26} ${y} ${x + 26} ${y - 30} ${x + 6} ${y - 40} V${y - 58} Z" fill="${c}" ${O(4)}/>`;
    if (kind === 'shop') {
      s += win(820, 140) + lamp(560) + lamp(1360);
      for (const [x, y, w] of [[80, 330, 560], [80, 560, 560], [1300, 330, 560], [1300, 560, 560]]) {
        s += shelf(x, y, w);
        for (let i = 0; i < 6; i++) { const cx = x + 50 + i * 92, c = ['#e8455c', '#4ab0ff', '#6fdc6f', '#b06bff', '#ffd76a', '#ff8a5c'][(i + y) % 6]; s += (i % 2 ? bottle(cx, y, c) : jar(cx, y, c)); }
      }
      // колбасы и травы под потолком
      for (let i = 0; i < 8; i++) { const x = 140 + i * 220; s += `<path d="M${x} 0 V60" stroke="${K.ink}" stroke-width="3"/>` + (i % 2 ? [0, 1, 2].map((k) => `<ellipse cx="${x}" cy="${80 + k * 30}" rx="12" ry="16" fill="#b8573e" ${O(3)}/>`).join('') : `<path d="M${x} 60 l-18 60 h36 Z" fill="#6fdc6f" ${O(3)}/>`); }
      s += sign(960, 80, 320, 'ЛАВКА');
      // прилавок (продавец — за ним, рисует city.js)
      s += `<rect x="1060" y="760" width="760" height="150" rx="10" fill="${K.wood}" ${O(6)}/><rect x="1040" y="740" width="800" height="30" rx="8" fill="${K.woodD}" ${O(5)}/>`;
      for (let i = 0; i < 5; i++) s += `<path d="M${1100 + i * 150} 780 V890" stroke="${K.woodD}" stroke-width="5" opacity=".6"/>`;
      s += jar(1180, 740, '#ffd76a') + bottle(1700, 740, '#e8455c') + `<ellipse cx="1300" cy="728" rx="40" ry="16" fill="#d9993f" ${O(4)}/>`;
    } else if (kind === 'trainer') {
      s += lamp(260) + lamp(1660);
      // оружейная стойка слева
      s += `<rect x="40" y="380" width="300" height="420" rx="10" fill="${K.woodD}" ${O(6)}/>`;
      const D = window.MDDoodle;
      try { ['sword', 'spear', 'bow', 'staff', 'mace'].forEach((k, i) => { s += `<g transform="translate(${80 + i * 56} 760) scale(2.2)">${D.weaponArt(k, 'common')}</g>`; }); } catch (e) {}
      // мишени справа и манекены
      const target = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f3efd8" ${O(5)}/><circle cx="${x}" cy="${y}" r="${r * 0.66}" fill="#e8455c"/><circle cx="${x}" cy="${y}" r="${r * 0.33}" fill="#f3efd8"/>`;
      s += target(1760, 300, 70) + target(1640, 520, 50);
      const dummy = (x) => `<path d="M${x} 900 V700" stroke="${K.woodD}" stroke-width="14"/><path d="M${x - 80} 740 H${x + 80}" stroke="${K.woodD}" stroke-width="12" stroke-linecap="round"/><ellipse cx="${x}" cy="760" rx="54" ry="74" fill="#e8c95a" ${O(5)}/><circle cx="${x}" cy="650" r="40" fill="#e8c95a" ${O(5)}/><path d="M${x - 16} 646 l10 10 M${x - 6} 646 l-10 10 M${x + 8} 646 l10 10 M${x + 18} 646 l-10 10" stroke="${K.ink}" stroke-width="4"/>`;
      s += dummy(1500) + dummy(1780);
      // большая доска на стене (на неё city.js кладёт дерево навыков)
      s += `<rect x="400" y="60" width="1080" height="760" rx="18" fill="${K.woodD}" ${O(7)}/><rect x="430" y="90" width="1020" height="700" rx="10" fill="#26352c"/>`;
      s += sign(940, 40, 360, 'ТРЕНЕР');
      s += `<rect x="560" y="920" width="760" height="120" rx="20" fill="${K.sign}" opacity=".55"/>`;   // мат на полу
    } else if (kind === 'board') {
      s += lamp(160) + lamp(1760);
      s += `<rect x="140" y="70" width="1640" height="800" rx="18" fill="${K.woodD}" ${O(8)}/><rect x="170" y="100" width="1580" height="740" rx="10" fill="#c49a62"/>`;
      for (let i = 0; i < 120; i++) s += `<circle cx="${180 + (i * 137) % 1560}" cy="${110 + (i * 89) % 720}" r="3" fill="#a07a48"/>`;
      s += sign(960, 60, 520, 'ДОСКА ОБЪЯВЛЕНИЙ');
    } else if (kind === 'storage') {
      // 22.10: Склад — стеллажи до потолка с ящиками, мешки и бочки на полу, стремянка, вывеска
      s += lamp(560) + lamp(1360);
      const box = (x, y, w, h, c = K.wood) => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${c}" ${O(4)}/><path d="M${x} ${y - h} L${x + w} ${y} M${x + w} ${y - h} L${x} ${y}" stroke="${K.woodD}" stroke-width="3" opacity=".7"/>`;
      const sack = (x, y, c = '#d9c08a') => `<path d="M${x - 34} ${y} q-6 -50 10 -70 q-8 -14 6 -18 h36 q14 4 6 18 q16 20 10 70 Z" fill="${c}" ${O(4)}/><path d="M${x - 14} ${y - 70} q14 8 28 0" stroke="${K.ink}" stroke-width="3" fill="none"/>`;
      const barrel = (x, y) => `<rect x="${x - 40}" y="${y - 100}" width="80" height="102" rx="16" fill="${K.wood}" ${O(5)}/><path d="M${x - 40} ${y - 72} H${x + 40} M${x - 40} ${y - 28} H${x + 40}" stroke="${K.woodD}" stroke-width="7"/>`;
      for (const [x0, w] of [[40, 520], [1360, 520]]) {
        s += `<path d="M${x0 + 10} 900 V140 M${x0 + w - 10} 900 V140" stroke="${K.woodD}" stroke-width="16"/>`;
        for (const y of [330, 560, 790]) {
          s += shelf(x0, y, w);
          for (let i = 0; i < 5; i++) { const bw = 70 + ((i * 37 + y) % 3) * 14, bx = x0 + 24 + i * 98; s += (i + y / 10) % 4 === 1 ? jar(bx + 30, y, ['#e8455c', '#4ab0ff', '#6fdc6f'][(i + y) % 3]) : box(bx, y, bw, 60 + ((i + y) % 2) * 26, (i + y) % 3 ? K.wood : '#c79a62'); }
        }
      }
      // 23.10 (баг со стрима): вывеска висела у самого потолка (y 80) — на ПК с окном ниже 1080 сцена прижата полом к низу окна
      // и верх срезается, а сверху ещё шапка зала: была видна только нижняя кромка. Теперь висит на верёвках ниже (STORAGE_SIGN_Y),
      // city.js (ROOM.storage.keep) не даёт срезать сцену выше неё
      s += `<path d="M860 0 V${STORAGE_SIGN_Y - 40} M1060 0 V${STORAGE_SIGN_Y - 40}" stroke="${K.ink}" stroke-width="4" opacity=".75"/>` + sign(960, STORAGE_SIGN_Y, 320, 'СКЛАД');
      s += sack(640, 905) + sack(700, 912, '#c8ab72') + sack(1250, 905) + barrel(1120, 905) + barrel(800, 908);
      s += `<path d="M1500 900 L1440 380 M1560 900 L1500 380" stroke="${K.woodD}" stroke-width="10"/>` + [0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${1494 - i * 8.5} ${830 - i * 70} H${1554 - i * 8.5}" stroke="${K.woodD}" stroke-width="8"/>`).join('');   // стремянка у стеллажа
      s += `<rect x="760" y="720" width="400" height="30" rx="8" fill="${K.wood}" ${O(5)}/><path d="M800 750 V900 M1120 750 V900" stroke="${K.woodD}" stroke-width="14"/>`;   // конторка кладовщика
      s += `<rect x="820" y="676" width="110" height="44" rx="4" fill="#f3efd8" ${O(3)}/><path d="M832 690 H916 M832 704 H900" stroke="${K.ink}" stroke-width="2.5" opacity=".5"/>`;   // амбарная книга
    } else {
      s += win(260, 160) + win(1480, 160) + lamp(960);
      s += `<rect x="760" y="720" width="400" height="30" rx="8" fill="${K.wood}" ${O(5)}/><path d="M800 750 V900 M1120 750 V900" stroke="${K.woodD}" stroke-width="14"/>`;
      s += `<path d="M820 718 l20 -40 h60 l20 40 Z" fill="#f3efd8" ${O(4)}/>`;   // свёрток чертежей
    }
    return s;
  }
  window.LGCityArt = { quarter, lower, room, PAL };
})();
