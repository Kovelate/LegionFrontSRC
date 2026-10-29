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
    // 28.10 (art/styles-city-legend): «Овощи» - огородный квартал: дощатые домики под зелёной черепицей с ростками, за кварталом - высокий
    // штакетник с подсолнухами и холмы, яблони, мостовая-«картошка»; контур тёмно-коричневый, как у овощей
    veggies: { line: '#2b2118', ink: '#2b2118', wall: '#8a5a2b', wallD: '#6a4420', tower: '#a0703a', roof: '#4f9a3a', roof2: '#e8892a', plaster: '#fff3dc', stone: '#a89070', timber: '#8a5a2b',
      ground: '#8a6a48', ground2: '#5e4630', glass: '#ffe08a', sign: '#3f7a2a', signTx: '#fff0a8', wood: '#c8894a', woodD: '#8a5a2b', woodL: '#e8b070', water: '#5ac0ff', waterD: '#2a6fb0', flag: '#e8455c',
      sky: 'linear-gradient(#0d0b22, #2b2150)', banner: 'ОГОРОДНЫЙ КВАРТАЛ', ground_kind: 'cobble', back: 'garden', sprout: true, trees: 'tree', apples: true, cross: 'tools',
      bulbs: ['#e8402f', '#ff9a2a', '#6fdc6f', '#ffd84a', '#b06bff'], column: '#fff3dc', columnL: '#ffffff' },
    // «42 Братухи» - район братух: неон, хром, розовое золото; за кварталом - ночные высотки с неоновой «42» и рекламным щитом, пальмы,
    // плитка; контур сливово-чёрный
    '42brothers': { line: '#1c1022', ink: '#1c1022', wall: '#2a1a3a', wallD: '#1e1230', tower: '#3a2a4a', roof: '#ff5fa2', roof2: '#4a3a5a', plaster: '#3a2a4a', stone: '#5a4a6a', timber: '#ffc83d',
      ground: '#2e2440', ground2: '#1c1022', groundL: '#3e3254', glass: '#5ad1ff', sign: '#1c1022', signTx: '#ff5fa2', wood: '#8a5a3a', woodD: '#5a3a2a', woodL: '#b07a52', water: '#5ad1ff', waterD: '#2a5ab0', waterL: '#e8fbff', flag: '#ffc83d',
      sky: 'linear-gradient(#0d0b22, #2b2150)', banner: 'РАЙОН БРАТУХ', ground_kind: 'tiles', back: 'city', neon: true, trees: 'palm', roofK: 'flat', cross: 'bats',
      bulbs: ['#ff5fa2', '#5ad1ff', '#ffc83d', '#b06bff'], column: '#c9ced6', columnL: '#ffffff' },
    // «Уга-Буги» - стойбище: каменные хижины под шкурами с бивнями на коньке, за кварталом - скала с пещерами, наскальными рисунками
    // и костром, папоротники-пальмы; контур тёмно-бурый
    ugabugi: { line: '#2a1a12', ink: '#2a1a12', wall: '#5e584e', wallD: '#4a453d', tower: '#8a8478', roof: '#c9955a', roof2: '#8a5a2a', plaster: '#b8b0a2', stone: '#8a8478', timber: '#8a5a2a',
      ground: '#a88a5a', ground2: '#6a5236', glass: '#ffd27a', sign: '#5a3a1e', signTx: '#f3e6c8', wood: '#a8743a', woodD: '#6a4420', woodL: '#c9955a', water: '#5ab8c8', waterD: '#2a6a7a', flag: '#e8402a',
      sky: 'linear-gradient(#0d0b22, #2b2150)', banner: 'СТОЙБИЩЕ', ground_kind: 'cobble', back: 'cave', horns: true, trees: 'palm', roofK: 'flat', cross: 'clubs',
      bulbs: ['#ffd27a', '#ff8a2a', '#f3e6c8', '#e8402a'], column: '#b8b0a2', columnL: '#d8d0c2' },
    cats: { line: '#2b1d18', ink: '#2b1d18', wall: '#3a2f5e', wallD: '#2a2350', tower: '#a9503c', roof: '#5a3a5a', roof2: '#8a4a7a', plaster: '#f2d4a8', stone: '#a9503c', timber: '#6e4a2f',
      ground: '#c8664a', ground2: '#8f3f2c', groundL: '#e08a68', glass: '#ffd76a', sign: '#6a2a5a', signTx: '#ffcf4a', wood: '#a8754f', woodD: '#6e4a2f', water: '#7fc8ff', waterD: '#3a6aa8', flag: '#ff8fa3',
      sky: 'linear-gradient(#0f0d2a 0%, #1d1a4a 40%, #3a2f6e 75%, #5a3a7a 100%)', banner: 'КОШАЧИЙ КВАРТАЛ', ground_kind: 'tiles', back: 'roofs', ears: true },
    monkeys: { line: '#2a1a12', ink: '#2a1a12', wall: '#6b4f8a', wallD: '#59437a', tower: '#7a5230', roof: '#3f8f3a', roof2: '#56a843', plaster: '#e2b678', stone: '#9a6a3c', timber: '#7a5230',
      ground: '#c99a5e', ground2: '#8a5a32', groundL: '#e2b678', glass: '#fff59a', sign: '#7a4a1a', signTx: '#ffe39a', wood: '#c99a5e', woodD: '#8a5a32', water: '#6ad0e0', waterD: '#2a8a9a', flag: '#ffd84a',
      sky: 'linear-gradient(#241a4e 0%, #4a2f72 34%, #9a4f7a 66%, #f0905a 100%)', banner: 'ВЕРХНИЙ КВАРТАЛ', ground_kind: 'deck', back: 'jungle', leaves: true },
    // 28.10 (art/styles-city-legend, вариант B - выбор стримера): «Черти» - котельный квартал над лавой: чугунные дома на заклёпках, кровли цвета
    // запёкшейся крови с рожками, за кварталом - базальтовые утёсы с лавопадами и трубы котелен; контур тёмный (как у чертят); фонтан - лавовый
    cherts: { line: '#2a0d14', ink: '#2a0d14', wall: '#2e2228', wallD: '#241a1e', tower: '#3a3346', roof: '#6a1020', roof2: '#3a3346', plaster: '#4a4458', stone: '#3a3346', timber: '#2a2236',
      ground: '#2a1e22', ground2: '#1a1014', glass: '#ffb347', sign: '#2a0d14', signTx: '#ffc83d', wood: '#6a3a2a', woodD: '#3a1e16', woodL: '#8a5038', water: '#ff7a1a', waterD: '#a8200e', waterL: '#fff1a0', flag: '#ffc83d',
      sky: 'linear-gradient(#0e0306 0%, #2a0a10 45%, #5a1418 80%, #8a2a1a 100%)', banner: 'КОТЕЛЬНЫЙ КВАРТАЛ', ground_kind: 'cobble', back: 'cliffs', horns: true, hell: true, iron: true,
      bulbs: ['#ff5a1a', '#ffc83d', '#ff8a2a', '#e8203a', '#ffe27a'], column: '#3a2c34', columnL: '#6a5460' },
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
    // HW: мёртвый квартал котиков - свой набор: тёмная мостовая и кладка, стекло без света
    if (style === 'cats-dead') return (KITS[style] = F({ id: 'cyctd', line: K.line, ink: K.ink, glass: K.glass, wood: K.wood, woodD: K.woodD, woodL: '#5a4e42', metal: '#1a1c22',
      bark: '#2e2822', leaf: '#2a2e2a', leafD: '#1c201c', leafL: '#363a34', pave: { mortar: '#252a34', stone: '#3a404e', alt: '#363c4a', light: '#4a5060', dark: '#252a34' },
      paves: { low: { mortar: '#20242e', stone: '#333845', alt: '#30353f', light: '#424856', dark: '#20242e' } }, walls: { brick: { base: '#4a3e46', light: '#52464e', dark: '#40363e', joint: '#2e2830' } } }));
    const T = { id: 'cy' + style.slice(0, 2), line: K.line, ink: K.ink, glass: K.glass, wood: K.wood, woodD: K.woodD, woodL: K.woodL || '#c58a45', metal: style === 'monkeys' ? '#4a3424' : '#2a2440' };
    if (style === 'cats') Object.assign(T, { bark: '#6e4a2f', leaf: '#5a9a4a', leafD: '#3e7436', leafL: '#8cc46a', pave: { mortar: '#8f3f2c', stone: '#c8664a', alt: '#d87a5c', light: '#f0a07e', dark: '#8f3f2c' },
      paves: { low: { mortar: '#7a3426', stone: '#b45a40', alt: '#c46a4c', light: '#e08a68', dark: '#7a3426' } }, walls: { brick: { base: '#a9503c', light: '#b85e48', dark: '#984634', joint: '#7a3426' } } });
    else if (style === 'veggies') Object.assign(T, { metal: '#4a3a2a', bark: '#7a4a2a', leaf: '#4caf50', leafD: '#2f7a35', leafL: '#9fe39a', pave: { mortar: '#5e4630', stone: '#a8865a', alt: '#b8966a', light: '#d8b88a', dark: '#6e5236' },
      paves: { low: { mortar: '#584228', stone: '#9a7a50', alt: '#a8885c', light: '#c8a87a', dark: '#64492e' }, stone: { mortar: '#6e5236', stone: '#c8a87a', alt: '#b8986a', light: '#e0c89a', dark: '#7a5e3e' } },
      wallC: { base: K.wall, light: '#9a6a3a', dark: '#6a4420', joint: '#4a3018', moss: '#4c8a3a' }, walls: { brick: { base: '#a87a50', light: '#b88a5e', dark: '#986a44', joint: '#6a4a2a' }, light: { base: '#c8a87a', light: '#d8b88a', dark: '#b8986a', joint: '#8a6a48' } } });
    else if (style === '42brothers') Object.assign(T, { metal: '#1c1022', bark: '#7a5a3a', leaf: '#3aa86a', leafD: '#2a7a4a', leafL: '#6ad89a', pave: { mortar: '#1c1022', stone: '#3a2e4e', alt: '#2e2440', light: '#5a4a72', dark: '#241a34' },
      paves: { low: { mortar: '#160c1c', stone: '#33284a', alt: '#2a2040', light: '#4e4066', dark: '#1e1430' }, stone: { mortar: '#241a34', stone: '#6a5a82', alt: '#5e4e76', light: '#8a7aa2', dark: '#3a2e4e' } },
      wallC: { base: K.wall, light: '#3a2a4a', dark: '#1e1230', joint: '#140a1a', moss: '#ff5fa2' }, walls: { brick: { base: '#4a3a5a', light: '#56466a', dark: '#3e2e4e', joint: '#241a34' }, light: { base: '#6a5a82', light: '#7a6a92', dark: '#5a4a72', joint: '#3a2e4e' } } });
    else if (style === 'ugabugi') Object.assign(T, { metal: '#4a3a2a', bark: '#6a4420', leaf: '#5a9a3a', leafD: '#3a7a2a', leafL: '#8ac45a', pave: { mortar: '#6a5236', stone: '#b8a078', alt: '#a89068', light: '#d8c8a0', dark: '#7a6244' },
      paves: { low: { mortar: '#5e4830', stone: '#a8906a', alt: '#98805c', light: '#c8b892', dark: '#6a5438' }, stone: { mortar: '#5e584e', stone: '#a8a092', alt: '#989082', light: '#c8c0b2', dark: '#6e685e' } },
      wallC: { base: K.wall, light: '#6e685e', dark: '#4a453d', joint: '#3a352e', moss: '#5a8a3a' }, walls: { brick: { base: '#8a8478', light: '#9a9488', dark: '#7a7468', joint: '#5e584e' }, light: { base: '#b8b0a2', light: '#c8c0b2', dark: '#a8a092', joint: '#7a7468' } } });
    else if (style === 'cherts') Object.assign(T, { metal: '#3a3346', bark: '#2a1a1a', leaf: '#3a2a30', leafD: '#2a1e22', leafL: '#4a3a40', pave: { mortar: '#140a0c', stone: '#3a2c30', alt: '#44343a', light: '#5e484e', dark: '#24181c' },
      paves: { low: { mortar: '#120809', stone: '#33262a', alt: '#3c2e33', light: '#523e44', dark: '#1e1417' }, stone: { mortar: '#1e1417', stone: '#4a3a40', alt: '#43343a', light: '#6a5258', dark: '#2a1e22' } },
      wallC: { base: K.wall, light: '#3a2c32', dark: '#241a1e', joint: '#5a1a14', moss: '#5a1a14' }, walls: { brick: { base: '#3a2a30', light: '#46343a', dark: '#2e2026', joint: '#5a1a14' }, light: { base: '#4a3a40', light: '#56444a', dark: '#3e3036', joint: '#2a1e22' } } });
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
  /* 28.10 (art/hw-dead-city) HW: «мёртвый» квартал гильдий котиков для Ночи Тыквенной Луны (договор - шапка cityhw.js):
     quarter('cats', QW, { dead: true }) → та же раскладка (здания, предметы, data-ol), но огней нет: окна чёрные или заколочены, факелы и
     фонарь сломаны, гирлянда погасла, фонтан застоялся, деревья голые; картон и кладка тёмные. Свет - только красное зарево за крышами.
     Другие стили мёртвого квартала не умеют - вернут обычный без флага (тогда перекраска citygl). */
  const DEAD_CATS = { ...PAL.cats, line: '#0d0e14', ink: '#0d0e14', wall: '#1a1d26', wallD: '#14161e', tower: '#3e3440', roof: '#2e2834', roof2: '#3a3040', plaster: '#6a665e', stone: '#4a3e46', timber: '#2e2822',
    ground: '#3a404e', ground2: '#252a34', groundL: '#4a5060', glass: '#0b0c10', sign: '#2a2430', signTx: '#8a7a52', wood: '#4a4038', woodD: '#2e2822', water: '#1e2a26', waterD: '#0b120e', flag: '#3e3440',
    sky: 'linear-gradient(#05060a 0%,#0c0f16 45%,#161b26 80%,#272d3a 100%)' };
  // оставшиеся яркие цвета (общие рисунки набора, мишени, листки) - тускнеют и холодеют; тёмные и серые - как есть; красное зарево - как есть
  function deadHex(h) {
    let x = h.slice(1); if (x.length === 3) x = x.split('').map((c) => c + c).join('');
    const R = parseInt(x.slice(0, 2), 16) / 255, G = parseInt(x.slice(2, 4), 16) / 255, B = parseInt(x.slice(4, 6), 16) / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, d = mx - mn, sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    if ((sat < 0.3 && l < 0.6) || h.toLowerCase() === '#d01a2a') return h;
    let hu = 0; if (d) { hu = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; hu *= 60; if (hu < 0) hu += 360; }
    const s2 = sat * 0.14, l2 = Math.min(0.46, l * 0.56), hh = hu < 70 ? hu + 360 : hu, h2 = (250 + (hh - 250) * 0.3) % 360, c = (1 - Math.abs(2 * l2 - 1)) * s2, xx = c * (1 - Math.abs(((h2 / 60) % 2) - 1)), m = l2 - c / 2;
    const [r1, g1, b1] = h2 < 60 ? [c, xx, 0] : h2 < 120 ? [xx, c, 0] : h2 < 180 ? [0, c, xx] : h2 < 240 ? [0, xx, c] : h2 < 300 ? [xx, 0, c] : [c, 0, xx];
    return '#' + [r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  }
  const deadFix = (svg) => String(svg).replace(/<animateMotion\b[^>]*>[\s\S]*?<\/animateMotion>|<animate(Transform|Motion)?\b[^>]*\/>/g, '').replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, deadHex);
  function quarter(style, QW, opt = {}) {   // opt.auction — Аукцион открыт (тестерам): без таблички «СКОРО» и досок на двери
    const DEAD = !!opt.dead && style === 'cats';   // HW: мёртвый квартал - только котики
    const K = DEAD ? DEAD_CATS : (PAL[style] || PAL.legion), Kt = kitOf(DEAD ? 'cats-dead' : style, K);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const O = (w = 5) => `stroke="${K.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const txt = (x, y, t, size, fill = K.signTx, ls = 3) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="${fill}" stroke="${K.ink}" stroke-width="${Math.max(3, size / 7)}" paint-order="stroke" letter-spacing="${ls}">${t}</text>`;
    const win = (x, y, w, h, lit = true, round = false) => {
      if (DEAD) lit = false;   // HW
      const top = round ? `M${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} H${x} Z` : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
      return `${lit ? `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w}" ry="${h * 0.8}" fill="url(#cqGlow)" opacity=".5"/>` : ''}<path d="${top}" fill="${lit ? K.glass : '#3a3a55'}" ${O(4)}/><path d="M${x + w / 2} ${y + (round ? w * 0.15 : 0)} V${y + h} M${x} ${y + h * 0.55} H${x + w}" stroke="${K.ink}" stroke-width="3" opacity=".5"/>`;
    };
    // 26.10 (art/buildings): окна с рамой и подоконником, двери из досок с петлями, обшивка, штукатурка — из набора (без набора — как было)
    const kw0 = (x, y, w, h, o = {}) => (Kt.win ? Kt.win(x, y, w, h, { sill: K.stone === '#8b8796' ? '#a8a4b6' : shade(K.stone, 0.2), ...o }) : win(x, y, w, h, o.lit !== false, o.round));
    // HW: мёртвый - окно чёрное, через одно заколочено досками крест-накрест
    const boards = (x, y, w, h) => `<path d="M${x - 6} ${y + h * 0.2} L${x + w + 6} ${y + h * 0.75} M${x - 6} ${y + h * 0.78} L${x + w + 6} ${y + h * 0.28}" stroke="${K.line}" stroke-width="13" stroke-linecap="round"/><path d="M${x - 6} ${y + h * 0.2} L${x + w + 6} ${y + h * 0.75} M${x - 6} ${y + h * 0.78} L${x + w + 6} ${y + h * 0.28}" stroke="${K.wood}" stroke-width="8" stroke-linecap="round"/>`;
    const kw = (x, y, w, h, o = {}) => (DEAD ? kw0(x, y, w, h, { ...o, lit: false, glow: false }) + ((x + y) % 3 ? boards(x, y, w, h) : '') : kw0(x, y, w, h, o));
    const kd = (x, base, w, h, o = {}) => (Kt.door ? Kt.door(x, base, w, h, { stepC: K.stone, ...o }) : '');
    // «Черти»: стены - чугунные листы на заклёпках (швы и ряды заклёпок)
    const ironPl = ([x0, y0, x1, y1]) => { let d = '', r = ''; for (let x = x0 + 70; x < x1 - 20; x += 70) d += `M${x} ${y0 + 4} V${y1 - 4} `; for (let y = y0 + 14; y < y1; y += 46) for (let x = x0 + 12; x < x1 - 6; x += 23) r += `M${x} ${y} h0.1 `; return `<path d="${d}" stroke="${K.ink}" stroke-width="3" opacity=".55"/><path d="${r}" stroke="#8a84a0" stroke-width="5.5" stroke-linecap="round"/>`; };
    const kpl = (box, c) => (K.iron ? ironPl(box) : Kt.plaster ? Kt.plaster(box, c) : '');
    // табличка «СКОРО» — доска на двух гвоздях, чуть наискось
    const soon = (x, y, rot = -6) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-86" y="-30" width="172" height="60" rx="8" fill="${K.wood}" ${O(5)}/><path d="M-78 -12 H78 M-78 10 H78" stroke="${K.woodD}" stroke-width="2.5" opacity=".6"/><circle cx="-70" cy="-18" r="4" fill="${K.ink}"/><circle cx="70" cy="-18" r="4" fill="${K.ink}"/>${txt(0, 13, 'СКОРО', 34, '#fff3c8', 4)}</g>`;
    // 25.10: вывеска — с заклёпками по углам и бликом сверху
    const sign = (x, y, w, t, size = 34) => `<rect x="${x - w / 2}" y="${y - 30}" width="${w}" height="62" rx="12" fill="${K.sign}" ${O(5)}/><rect x="${x - w / 2 + 9}" y="${y - 21}" width="${w - 18}" height="44" rx="8" fill="none" stroke="${K.signTx}" stroke-width="2.5"/><path d="M${x - w / 2 + 18} ${y - 25} H${x + w / 2 - 18}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity=".25"/>`
      + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<circle cx="${x + a * (w / 2 - 5)}" cy="${y + b * 25}" r="3.4" fill="${K.signTx}" stroke="${K.ink}" stroke-width="1.5"/>`).join('') + txt(x, y + size * 0.36, t, size);
    const roof = (x0, x1, top, h, c = K.roof) => {
      // 25.10: черепица рядами чешуек (у обезьян — листья) — символы набора; кромка — контур стиля
      let s = Kt.roof([[x0 - 22, top + 4], [(x0 + x1) / 2, top - h], [x1 + 22, top + 4]], { pal: roofPal(c), kind: K.leaves ? 'leaf' : K.roofK || 'round', step: 16, scale: 0.72, id: 'cqRf' + x0 });
      if (K.ears) s += `<path d="M${x0 + 4} ${top - 2} l18 -46 l22 40 Z M${x1 - 4} ${top - 2} l-18 -46 l-22 40 Z" fill="${c}" ${O(4)}/><path d="M${x0 + 16} ${top - 10} l7 -20 l9 17 Z M${x1 - 16} ${top - 10} l-7 -20 l-9 17 Z" fill="#ff8fa3"/>`;
      if (K.leaves) for (let i = 0; i <= 6; i++) { const t = i / 6, lx = x0 - 18 + (x1 - x0 + 36) * t; s += `<ellipse cx="${f1(lx)}" cy="${top + 6}" rx="22" ry="11" fill="${i % 2 ? K.roof2 : K.roof}" ${O(3)} transform="rotate(${(i % 2 ? 18 : -18)} ${f1(lx)} ${top + 6})"/>`; }
      if (K.sprout) s += `<path d="M${(x0 + x1) / 2} ${top - h} q-6 -26 -26 -30 q14 18 26 30 q6 -30 30 -36 q-18 20 -30 36" fill="#6fdc6f" ${O(3)}/>`;
      if (K.horns) s += horns(x0 - 4, top + 2, 0.8, -1) + horns(x1 + 4, top + 2, 0.8, 1);
      if (K.neon) s += neonLine(`M${x0 - 22} ${top + 4} L${(x0 + x1) / 2} ${top - h} L${x1 + 22} ${top + 4}`, '#5ad1ff');
      return s;
    };
    // «Черти»: рожки на коньке (костяные, с тёмными кольцами)
    const horns = (cx, y, k = 1, side = 0) => (side ? [side] : [-1, 1]).map((d) => `<path d="M${f1(cx + d * 10 * k)} ${f1(y)} q${f1(d * 30 * k)} ${f1(-6 * k)} ${f1(d * 30 * k)} ${f1(-44 * k)} q${f1(-d * 6 * k)} ${f1(22 * k)} ${f1(-d * 20 * k)} ${f1(40 * k)} Z" fill="${K.hornC || '#e8d8b8'}" ${O(3)}/><path d="M${f1(cx + d * 30 * k)} ${f1(y - 12 * k)} l${f1(d * 8 * k)} ${f1(-4 * k)} M${f1(cx + d * 34 * k)} ${f1(y - 26 * k)} l${f1(d * 6 * k)} ${f1(-2 * k)}" stroke="${K.ink}" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`).join('');
    // «Черти»: обугленное дерево с тлеющими угольками; трещины лавы
    const lavaCr = (d, w = 5) => `<path d="${d}" fill="none" stroke="#ff5a1a" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><path d="${d}" fill="none" stroke="#ffe27a" stroke-width="${f1(w * 0.36)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    // «42 Братухи»: неоновая трубка (светлая сердцевина, цветной ореол)
    const neonLine = (d, c, w = 5) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w * 2.6}" stroke-linecap="round" stroke-linejoin="round" opacity=".28"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="${f1(w * 0.36)}" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`;
    const flag = (x, y, c = K.flag) => `<path d="M${x} ${y} V${y - 50} l40 12 l-40 12" fill="${c}" ${O(3)}/>`;
    const torch = (x, y) => DEAD ? `<path d="M${x} ${y} v30" stroke="${K.ink}" stroke-width="6"/><path d="M${x - 8} ${y} h16 l-4 -8 h-8 Z" fill="${K.woodD}" ${O(2.5)}/><path d="M${x - 2} ${y - 8} l-6 -16 l4 -6" stroke="${K.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`   // HW: факел погас и обломан
      : `<circle cx="${x}" cy="${y - 18}" r="44" fill="url(#cqGlow)" opacity=".6"/><path d="M${x} ${y} v30" stroke="${K.ink}" stroke-width="6"/><path d="M${x - 8} ${y} h16 l-4 -8 h-8 Z" fill="${K.woodD}" ${O(2.5)}/><path d="M${x} ${y - 34} q12 14 6 24 q-6 6 -12 0 q-6 -10 6 -24" fill="#ffb34d" ${O(2.5)}/>`;
    // стена или фон (то, что за зданиями)
    // фон (стена, крыши, листва, земля) — чуть шире квартала: заходит под край Ярмарки, шва нет
    const QB = QW + 40;
    // парапет крыш (котики): поверх мостовой; 23.10 — кирпичи двумя рядами вперевязку, как у террасы Ярмарки (от стыка x = QW − 20)
    const parapet = () => {
      let g = `<rect x="0" y="672" width="${QB}" height="26" fill="${DEAD ? '#3e343c' : '#a9503c'}" ${O(4)}/><rect x="0" y="664" width="${QB}" height="12" fill="${DEAD ? '#2a242c' : '#7a3426'}" ${O(3)}/>`;   // HW: тёмный
      for (let r = 0; r < 2; r++) for (let x = QW - 20 - (r ? 26 : 0) - Math.ceil(QW / 52 + 1) * 52; x < QB; x += 52) if (x > -60) g += `<rect x="${f1(x + 2)}" y="${674 + r * 12}" width="48" height="10" rx="2.5" fill="none" stroke="${K.ink}" stroke-width="1.6" opacity=".35"/>`;
      return g;
    };
    let s = DEAD ? `<defs><radialGradient id="cqGlow"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <linearGradient id="cqShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05060a" stop-opacity=".6"/><stop offset="1" stop-color="#05060a" stop-opacity="0"/></linearGradient>
      <radialGradient id="cqWater" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#2e3a32"/><stop offset=".5" stop-color="#1a2420"/><stop offset="1" stop-color="#0b120e"/></radialGradient>
      <radialGradient id="cqRed"><stop offset="0" stop-color="#d01a2a" stop-opacity=".42"/><stop offset="1" stop-color="#d01a2a" stop-opacity="0"/></radialGradient></defs>` : `<defs><radialGradient id="cqGlow"><stop offset="0" stop-color="#ffe59a" stop-opacity=".9"/><stop offset="1" stop-color="#ffbe5a" stop-opacity="0"/></radialGradient>
      <linearGradient id="cqShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14112a" stop-opacity=".45"/><stop offset="1" stop-color="#14112a" stop-opacity="0"/></linearGradient>
      <radialGradient id="cqWater" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="${K.waterL || '#e8fbff'}"/><stop offset=".35" stop-color="${K.water}"/><stop offset="1" stop-color="${K.waterD}"/></radialGradient></defs>`;
    if (K.hell) s += `<radialGradient id="cqHot"><stop offset="0" stop-color="#ff5a1a" stop-opacity=".55"/><stop offset=".6" stop-color="#c8201a" stop-opacity=".18"/><stop offset="1" stop-color="#c8201a" stop-opacity="0"/></radialGradient>`
      + `<ellipse cx="${f1(QW * 0.3)}" cy="330" rx="620" ry="260" fill="url(#cqHot)"/><ellipse cx="${f1(QW * 0.85)}" cy="360" rx="520" ry="220" fill="url(#cqHot)"/>`;   // зарево над кварталом
    if (K.back === 'wall') {
      // 25.10: кроны деревьев за стеной, стена — кладка из блоков (как у Ярмарки «Легиона»), мох у подножия
      for (const [tx, ts] of [[560, 1], [1180, 0.9], [1560, 1.05]]) s += Kt.tree('tree', tx, 470, ts, tx > 1000);
      s += `<rect x="0" y="330" width="${QB}" height="380" fill="${K.wall}"/>` + Kt.wall([0, 333, QB, 708], { moss: true, seed: 5 }) + `<rect x="0" y="330" width="${QB}" height="380" fill="none" ${O()}/>`;
      for (let i = 0; i < QB / 82 + 1; i++) s += `<rect x="${i * 82}" y="300" width="52" height="40" fill="${K.wall}" ${O(4)}/><path d="M${i * 82 + 8} 310 H${i * 82 + 44}" stroke="#6e6a84" stroke-width="3" stroke-linecap="round"/>`;
    } else if (K.back === 'garden') {
      // «Овощи»: холмы, высокий штакетник, из-за него - подсолнухи, теплица и пугало
      s += `<path d="M-40 520 Q300 330 700 470 Q1000 360 1400 480 Q1700 400 ${QB} 460 V720 H-40 Z" fill="#24402a"/><path d="M-40 580 Q400 470 900 560 Q1300 470 ${QB} 540 V720 H-40 Z" fill="#2e5232"/>`;
      s += `<g transform="translate(1180 470)"><path d="M-110 0 V-90 Q0 -170 110 -90 V0 Z" fill="#9fd8e8" opacity=".55" ${O(4)}/><path d="M-110 -90 Q0 -170 110 -90 M-55 0 V-135 M0 0 V-150 M55 0 V-135 M-110 -45 H110" stroke="${K.ink}" stroke-width="3.5" fill="none"/></g>`;   // теплица
      const sun = (x, y, k) => `<path d="M${x} ${y} V720" stroke="#3f7a2a" stroke-width="${f1(9 * k)}"/><path d="M${x} ${f1(y + 70 * k)} q${f1(-40 * k)} ${f1(-10 * k)} ${f1(-50 * k)} ${f1(18 * k)} q${f1(30 * k)} ${f1(6 * k)} ${f1(50 * k)} ${f1(-18 * k)} Z" fill="#4caf50" ${O(3)}/>`
        + `<circle cx="${x}" cy="${y}" r="${f1(46 * k)}" fill="#ffc83d" ${O(4)}/>` + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = i * Math.PI / 4; return `<ellipse cx="${f1(x + Math.cos(a) * 40 * k)}" cy="${f1(y + Math.sin(a) * 40 * k)}" rx="${f1(16 * k)}" ry="${f1(9 * k)}" fill="#ffd84a" transform="rotate(${f1(a * 180 / Math.PI)} ${f1(x + Math.cos(a) * 40 * k)} ${f1(y + Math.sin(a) * 40 * k)})" ${O(2.5)}/>`; }).join('') + `<circle cx="${x}" cy="${y}" r="${f1(24 * k)}" fill="#6a4420" ${O(3)}/>`;
      for (const [x, y, k] of [[560, 400, 1], [640, 440, 0.8], [1560, 390, 1.05], [1660, 430, 0.85]]) s += sun(x, y, k);
      s += `<g transform="translate(330 440)"><path d="M0 0 V280 M-70 60 H70" stroke="${K.woodD}" stroke-width="12" stroke-linecap="round"/><circle cy="-30" r="34" fill="#e8c95a" ${O(4)}/><path d="M-50 -48 H50 L30 -66 H-30 Z" fill="#8a5a2b" ${O(3)}/><path d="M-50 40 H50 L40 140 H-40 Z" fill="#4f9a3a" ${O(4)}/><path d="M-12 -34 h0.1 M12 -34 h0.1" stroke="${K.ink}" stroke-width="7" stroke-linecap="round"/></g>`;   // пугало
      s += `<rect x="0" y="480" width="${QB}" height="240" fill="${K.wall}"/>`;
      let pk = ''; for (let x = -10; x < QB; x += 46) pk += `M${x} 720 V${500 + (x % 3) * 4} L${x + 20} ${478 + (x % 3) * 4} L${x + 40} ${500 + (x % 3) * 4} V720 Z `;
      s += `<path d="${pk}" fill="${K.wood}" ${O(4)}/><path d="M0 560 H${QB} M0 660 H${QB}" stroke="${K.woodD}" stroke-width="14"/><path d="M0 560 H${QB} M0 660 H${QB}" stroke="${K.ink}" stroke-width="2" opacity=".5"/>`;
    } else if (K.back === 'city') {
      // «42 Братухи»: ночные высотки с окнами, неоновая «42», рекламный щит, бетонная стенка с граффити
      for (let x = -40, i = 0; x < QB + 60; i++) { const w = 120 + ((i * 53) % 90), h = 260 + ((i * 97) % 220), top = 560 - h;
        s += `<rect x="${x}" y="${top}" width="${w}" height="${h + 160}" fill="${i % 2 ? '#241838' : '#1e1230'}" ${O(3)}/>`;
        let win = ''; for (let yy = top + 24; yy < 600; yy += 38) for (let xx = x + 14; xx < x + w - 24; xx += 30) if (((xx * 7 + yy * 3 + i) % 5) < 2) win += `M${xx} ${yy} h14 v18 h-14 Z `;
        s += `<path d="${win}" fill="${i % 3 ? '#ffd76a' : '#5ad1ff'}" opacity=".75"/>`; x += w + 6; }
      s += `<g transform="translate(520 250)">${neonLine('M-60 -50 L-90 20 H-40 M-40 -50 V60', '#ff5fa2', 9)}${neonLine('M0 -30 Q20 -60 50 -36 Q60 -10 0 60 H60', '#ff5fa2', 9)}</g>`;   // «42»
      s += `<g transform="translate(1260 300)"><path d="M-4 0 V230 M150 0 V230" stroke="${K.ink}" stroke-width="12"/><rect x="-60" y="-90" width="270" height="130" rx="8" fill="#ffc83d" ${O(5)}/><rect x="-48" y="-78" width="246" height="106" rx="5" fill="#ff5fa2"/>`
        + `<text x="75" y="-14" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="42" fill="#fff" stroke="${K.ink}" stroke-width="5" paint-order="stroke">БРАТУХИ</text></g>`;   // рекламный щит
      s += `<rect x="0" y="620" width="${QB}" height="100" fill="#4a3a5a"/>` + Kt.wall([0, 622, QB, 718], { seed: 5 }) + `<rect x="0" y="620" width="${QB}" height="100" fill="none" ${O(4)}/>`;
      s += neonLine('M140 660 q30 -30 60 0 t60 0 M780 650 l40 30 l30 -40 l40 40 M1500 646 q40 40 90 0', '#5ad1ff', 6) + neonLine(`M${QB - 300} 640 h200`, '#ffc83d', 5);   // граффити
    } else if (K.back === 'cave') {
      // «Уга-Буги»: скала с пещерами (в одной - костёр), наскальные рисунки, бивни-арка, валуны
      s += `<path d="M-40 440 L80 300 L200 330 L300 230 L460 300 L580 250 L700 330 L860 210 L1000 300 L1120 240 L1280 320 L1400 220 L1560 300 L1700 250 L${QB} 290 V720 H-40 Z" fill="${K.wall}" ${O(5)}/>`;
      s += `<path d="M200 330 l30 80 l-20 60 M860 210 l-20 90 l30 70 M1400 220 l26 90 l-16 50" stroke="${K.wallD}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
      for (const [x, w, fire] of [[885, 120, 1], [1745, 110, 0], [445, 70, 0]]) s += `<path d="M${x - w / 2} 720 V600 Q${x} ${520 - w * 0.2} ${x + w / 2} 600 V720 Z" fill="#1e140c" ${O(5)}/>` + (fire ? `<circle cx="${x}" cy="660" r="70" fill="url(#cqGlow)" opacity=".8"/><path d="M${x - 26} 718 l52 -14 M${x + 26} 718 l-52 -14" stroke="${K.woodD}" stroke-width="10" stroke-linecap="round"/><path d="M${x} 702 c-22 -4 -24 -32 0 -60 c4 22 18 22 14 38 c10 0 8 18 -14 22 Z" fill="#ff8a2a" ${O(3)}/><path d="M${x} 698 c-8 -4 -8 -18 0 -28 c6 10 8 22 0 28 Z" fill="#ffd27a"/>` : '');
      s += `<g stroke="#c8643a" stroke-width="6" fill="none" stroke-linecap="round" opacity=".85"><path d="M600 330 q40 -40 110 -10 q20 10 10 50 M620 380 v40 M660 380 v40 M700 380 v40 M720 340 q30 10 24 50"/><path d="M800 350 l20 -30 l20 30 M820 320 v-30 M810 380 l10 -30 l10 30"/></g>`
        + [[1480, 320], [1520, 300]].map(([x, y]) => `<path d="M${x} ${y} v24 M${x - 12} ${y + 4} v16 M${x + 12} ${y + 4} v16 M${x - 18} ${y + 14} l6 10 M${x - 10} ${y + 30} h20" stroke="#e8402a" stroke-width="5" stroke-linecap="round" opacity=".8"/>`).join('');   // мамонт, охотник, ладони
    } else if (K.back === 'cliffs') {
      // «Черти»: базальтовые утёсы в два плана, лавопады, трубы котелен с дымом
      s += `<path d="M-40 420 L60 250 L150 300 L240 170 L330 260 L420 200 L520 320 L640 180 L760 290 L880 210 L1000 330 L1120 190 L1240 280 L1360 160 L1480 300 L1600 220 L${QB} 280 L${QB} 720 L-40 720 Z" fill="#2a1418"/>`;
      for (const [x, y0, y1] of [[240, 170, 520], [640, 180, 560], [1360, 160, 540]]) s += `<path d="M${x} ${y0} q-14 ${f1((y1 - y0) / 2)} 8 ${y1 - y0}" stroke="#ff5a1a" stroke-width="22" fill="none" stroke-linecap="round" opacity=".9"/><path d="M${x} ${y0} q-14 ${f1((y1 - y0) / 2)} 8 ${y1 - y0}" stroke="#ffe27a" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M-40 520 L80 400 L200 450 L300 380 L460 470 L560 410 L700 480 L860 400 L980 470 L1100 420 L1260 490 L1380 410 L1520 470 L1640 430 L${QB} 470 L${QB} 720 L-40 720 Z" fill="#3a2228" ${O(4)}/>`;
      for (const [x, h] of [[520, 170], [1180, 210], [1640, 150]]) s += `<rect x="${x - 22}" y="${520 - h}" width="44" height="${h}" fill="#3a3346" ${O(4)}/><path d="M${x - 28} ${520 - h} h56 v14 h-56 Z" fill="#5a5470" ${O(3)}/>` + [0.3, 0.6].map((t) => `<path d="M${x - 22} ${f1(520 - h * t)} h44" stroke="${K.ink}" stroke-width="3"/>`).join('') + `<g><circle cx="${x + 6}" cy="${470 - h}" r="22" fill="#4a3a40" opacity=".55"/><circle cx="${x + 26}" cy="${440 - h}" r="28" fill="#4a3a40" opacity=".4"/></g>`;
      s += `<rect x="0" y="640" width="${QB}" height="80" fill="#2e2228"/>` + Kt.wall([0, 642, QB, 718], { seed: 5 });
    } else if (K.back === 'roofs') {
      if (DEAD) s += `<ellipse cx="${f1(QW * 0.3)}" cy="470" rx="520" ry="200" fill="url(#cqRed)"/><ellipse cx="${f1(QW * 0.82)}" cy="500" rx="420" ry="170" fill="url(#cqRed)"/>`;   // HW: красное зарево за крышами
      for (let x = -40; x < QB + 60;) { const w = 110 + rnd() * 120, b = f1(470 + rnd() * 50), h = 120 + rnd() * 90; s += `<rect x="${f1(x)}" y="${f1(b - h)}" width="${f1(w)}" height="${f1(h + 300)}" fill="${DEAD ? '#121520' : '#1e1c40'}"/><path d="M${f1(x - 8)} ${f1(b - h + 2)} L${f1(x + w / 2)} ${f1(b - h - 50)} L${f1(x + w + 8)} ${f1(b - h + 2)} Z" fill="${DEAD ? '#121520' : '#1e1c40'}"/>`; if (rnd() < 0.5) s += `<rect x="${f1(x + w * 0.4)}" y="${f1(b - h + 30)}" width="16" height="20" fill="${DEAD ? '#05060a' : '#ffd76a'}" opacity=".7"/>`; x += w + 6 + rnd() * 20; }
      // 29.10 (стример: «кривой домик/крыша слева у Заточки»): дом среднего ряда, заходивший за стык с Ярмаркой (x = QW), торчал куском крыши
      // между краем Ярмарки и её первым домом. Теперь последний дом кончается до стыка (короче или не рисуется); rnd() - тот же, раскладка дальше не сдвигается
      for (let x = -60; x < QB + 80;) { const w0 = 180 + rnd() * 160, b = f1(600 + rnd() * 40), h = 90 + rnd() * 60, top = b - h, rh = 80 + rnd() * 30, w = Math.min(w0, QW - 24 - x), x0 = x;
        if (w < 120) { rnd(); x = x0 + w0 + rnd() * 40; continue; }
        s += `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(w)}" height="${f1(h + 120)}" fill="${DEAD ? '#1a1d26' : '#3a2f5e'}"/>` + Kt.roof([[x - 14, top + 4], [x + w / 2, top - rh], [x + w + 14, top + 4]], { pal: DEAD ? { a: '#2a2630', b: '#302b36', c: '#24202a', edge: '#1a171e' } : { a: '#5a3a5a', b: '#664266', c: '#4e3250', edge: '#3e2a46' }, step: 16, scale: 0.8, w: 0, id: 'cqMid' + Math.round(x) }) + (rnd() < 0.6 ? `<rect x="${f1(x + w * 0.5 - 18)}" y="${f1(top + 24)}" width="36" height="30" rx="3" fill="${DEAD ? '#05060a' : '#ffd76a'}" opacity=".85"/><path d="M${f1(x + w * 0.5)} ${f1(top + 24)} v30 M${f1(x + w * 0.5 - 18)} ${f1(top + 39)} h36" stroke="#3a2f5e" stroke-width="3"/>` : ''); x += w0 + rnd() * 40; }
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
      s += Kt.pave('cobble', [0, 700, QB, 1080], { k0: 0.72, k1: 1.35, seed: 3, x0: QW, jit: false, mortar: K.hell ? '#140a0c' : '#33303f' }) + `<rect x="0" y="700" width="${QB}" height="40" fill="url(#cqShade)"/>`;
      if (K.hell) s += lavaCr('M60 860 L130 880 L170 930 L260 950 M520 1010 L600 990 L660 1030 L760 1020 M1100 870 L1170 900 L1200 960 M1440 1040 L1520 1010 L1600 1036 L1700 1000', 6);
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
        const t = i / n, x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2, y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2, c = (K.bulbs || BULB)[(i * 3) % (K.bulbs || BULB).length], bx = f1(x);
        if (DEAD) { if (i % 4) g += `<rect x="${f1(x - 3.5)}" y="${f1(y - 1)}" width="7" height="6" rx="1.5" fill="#1a1c22"/><ellipse cx="${bx}" cy="${f1(y + 12)}" rx="5.5" ry="7.5" fill="#22262e" stroke="${K.ink}" stroke-width="1.8"/>`; continue; }   // HW: погасшие колбы, части нет
        g += `<circle cx="${bx}" cy="${f1(y + 12)}" r="13" fill="${c}" opacity=".2"/><rect x="${f1(x - 3.5)}" y="${f1(y - 1)}" width="7" height="6" rx="1.5" fill="#3a3550" stroke="${K.ink}" stroke-width="1.5"/><path d="M${bx} ${f1(y + 5)} C${f1(x + 7)} ${f1(y + 7)} ${f1(x + 7)} ${f1(y + 18)} ${bx} ${f1(y + 20)} C${f1(x - 7)} ${f1(y + 18)} ${f1(x - 7)} ${f1(y + 7)} ${bx} ${f1(y + 5)} Z" fill="${c}" stroke="${K.ink}" stroke-width="1.8"/><path d="M${f1(x - 2.5)} ${f1(y + 9)} q-1 4 0 7" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".7"/>`;
      }
      return g;
    };
    s += garl(296, 262, 650, 414, 60) + garl(650, 414, 1125, 404, 70) + garl(1125, 404, 1520, 466, 50);
    // край мира слева: угловая башня; справа — башня на стыке с Ярмаркой
    const tower = (x, w, top, base) => `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="${K.tower}"/>` + Kt.wall([x, top, x + w, base], { pal: 'brick', scale: 0.42, seed: 77 }) + `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="none" ${O()}/>` + Kt.roof([[x - 15, top + 5], [x + w / 2, top - 115], [x + w + 15, top + 5]], { pal: roofPal(K.roof), kind: K.leaves ? 'leaf' : K.roofK || 'round', step: 14, scale: 0.65, id: 'cqTw' }) + `${flag(x + w / 2, top - 115)}` + [0, 1, 2, 3, 4].map((r) => `<path d="M${x + 4} ${top + 60 + r * 80} H${x + w - 4}" stroke="${K.ink}" stroke-width="2" opacity=".3"/>`).join('') + win(x + w / 2 - 18, top + 90, 36, 56, true, true);
    s += tower(-20, 110, 200, 1080);
    const seam = '';   // 20.10: стык — без столба: фон квартала заходит под Ярмарку, у Ярмарки срезан край с обводкой (city.js)
    // баннер квартала
    s += `<g transform="translate(${QW / 2} 120)"><path d="M-300 -38 H300 L276 0 L300 38 H-300 L-276 0 Z" fill="${K.sign}" ${O(6)}/>${txt(0, 15, K.banner, 40)}</g>`;

    // 25.10: деревья между зданиями (за ними — стена или крыши; герои ходят ниже, y ≥ 800 — деревья всегда позади)
    // HW: мёртвый - голые деревья с ветками-рогатками и сухие кусты
    const deadTree = (x, base, sc = 1) => {
      const T = (d) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, a, b) => `${f1(x + a * sc)} ${f1(base + b * sc)}`);
      const br = T('M-4 -110 Q-40 -150 -70 -170 M-6 -150 Q-20 -200 -4 -240 M4 -140 Q40 -180 78 -186 M30 -170 Q40 -200 30 -220 M-40 -150 Q-60 -150 -78 -140 M-2 -200 Q20 -220 34 -246');
      return `<path d="${T('M-14 0 Q-10 -80 -6 -150 L6 -150 Q12 -80 16 0 Z')}" fill="#2e2822" ${O(4)}/><path d="${br}" stroke="${K.ink}" stroke-width="${f1(11 * sc)}" fill="none" stroke-linecap="round"/><path d="${br}" stroke="#2e2822" stroke-width="${f1(5 * sc)}" fill="none" stroke-linecap="round"/>`;
    };
    const dryBush = (x, base, sc = 1) => { let d = ''; for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.12 + i * 0.126); d += `M${x} ${base} l${f1(Math.cos(a) * 70 * sc)} ${f1(Math.sin(a) * 60 * sc)} `; } return `<path d="${d}" stroke="${K.ink}" stroke-width="${f1(7 * sc)}" stroke-linecap="round"/><path d="${d}" stroke="#3a3228" stroke-width="${f1(3 * sc)}" stroke-linecap="round"/>`; };
    const ember = (x, base, sc) => [[-60, -168], [70, -186], [-4, -238], [30, -218]].map(([a, b], i) => `<circle cx="${f1(x + a * sc)}" cy="${f1(base + b * sc)}" r="${f1((i % 2 ? 6 : 8) * sc)}" fill="${i % 2 ? '#ffc83d' : '#ff5a1a'}" stroke="${K.ink}" stroke-width="2"/>`).join('');
    const ktree = (kind, x, base, sc, flip) => (DEAD ? (kind === 'bush' ? dryBush(x, base, sc) : deadTree(x, base, sc))
      : K.hell ? (kind === 'bush' ? dryBush(x, base, sc) : deadTree(x, base, sc).replace(/#2e2822/g, '#1e1214') + ember(x, base, sc)) : Kt.tree(kind, x, base, sc, flip));
    { const TK = K.trees || (K.leaves ? 'palm' : K.ears ? 'topiary' : 'cypress');
      s += ktree(K.ears ? 'topiary' : K.trees === 'palm' ? 'palm' : 'tree', 452, 792, 0.82) + ktree(TK, 900, 792, K.ears ? 0.95 : 0.9) + ktree(TK, 1330, 796, 0.85) + ktree(K.ears ? 'topiary' : 'tree', 1735, 790, 0.8, true) + ktree('bush', 1205, 798, 0.6) + ktree('bush', 560, 798, 0.55);
      if (K.apples && !DEAD) for (const [ax, ab, k] of [[452, 792, 0.82], [900, 792, 0.9], [1330, 796, 0.85], [1735, 790, 0.8]]) s += [[-34, -150], [20, -178], [40, -128], [-10, -112], [-46, -196]].map(([a, b]) => `<circle cx="${f1(ax + a * k)}" cy="${f1(ab + b * k)}" r="${f1(9 * k)}" fill="#e8402f" stroke="${K.ink}" stroke-width="2"/>`).join(''); }   // «Овощи»: яблоки
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
      s += `<rect x="190" y="230" width="110" height="250" fill="${K.tower}"/>` + Kt.wall([190, 230, 300, 480], { pal: 'brick', scale: 0.4, seed: 31 }) + `<rect x="190" y="230" width="110" height="250" fill="none" ${O()}/>` + Kt.roof([[178, 236], [245, 130], [312, 236]], { pal: roofPal(K.roof), kind: K.leaves ? 'leaf' : K.roofK || 'round', step: 14, scale: 0.65, id: 'cqClock' }) + `${flag(245, 130)}`;
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
      for (const x of [520, 600, 700, 780]) s += `<rect x="${x - 14}" y="${top + 10}" width="28" height="${B - top - 10}" fill="${K.column || '#f3efe6'}" ${O(4)}/><path d="M${x - 7} ${top + 18} V${B - 18} M${x} ${top + 18} V${B - 18} M${x + 7} ${top + 18} V${B - 18}" stroke="${K.ink}" stroke-width="1.5" opacity=".22"/><path d="M${x - 10} ${top + 16} V${B - 16}" stroke="${K.columnL || '#ffffff'}" stroke-width="3" opacity=".6"/><rect x="${x - 20}" y="${top}" width="40" height="14" fill="${K.hell ? '#ffc83d' : '#d8d0c0'}" ${O(3)}/><rect x="${x - 19}" y="${B - 14}" width="38" height="14" fill="${K.hell ? '#ffc83d' : '#d8d0c0'}" ${O(3)}/>`;
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
      s += `<path d="M1065 ${B} V700 A60 60 0 0 1 1185 700 V${B} Z" fill="${DEAD ? '#0b0c10' : '#ffb34d'}" ${O(5)}/><path d="M1080 ${B} V706 A45 45 0 0 1 1170 706 V${B} Z" fill="${DEAD ? '#1a1c22' : '#c56a2a'}" opacity=".55"/>`;   // HW: в дверях темно
      // мишени на стене
      const target = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f3efd8" ${O(4)}/><circle cx="${x}" cy="${y}" r="${r * 0.66}" fill="#e8455c"/><circle cx="${x}" cy="${y}" r="${r * 0.33}" fill="#f3efd8"/><path d="M${x + r * 0.2} ${y - r * 0.1} l${r * 0.9} ${-r * 0.5}" stroke="${K.woodD}" stroke-width="4"/>`;
      s += target(1010, 610, 30) + target(1240, 610, 30);
      // скрещённые мечи
      // эмблема над Тренером: скрещённые мечи; у новых стилей своё (K.cross): вилы, грабли с тяпкой, биты, дубины
      const cross = (item) => `<g transform="translate(1125 470)">${[-1, 1].map((d) => `<g transform="rotate(${d * 40})">${item(d)}</g>`).join('')}</g>`;
      const pole = (c, y0 = 64, y1 = -40, w = 6) => `<path d="M0 ${y0} V${y1}" stroke="${K.line}" stroke-width="${w * 2}" stroke-linecap="round"/><path d="M0 ${y0} V${y1}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
      const tip = (d, c) => `<path d="${d}" stroke="${K.line}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${c}" stroke-width="5.5" stroke-linecap="round" fill="none"/>`;
      const CROSS = {
        forks: () => cross(() => pole('#5a2a1a') + tip('M-16 -36 V-62 M0 -40 V-72 M16 -36 V-62 M-18 -36 H18', K.signTx)),
        tools: () => cross((d) => pole(K.wood) + (d < 0 ? tip('M-22 -40 H22 M-18 -40 V-58 M-6 -40 V-58 M6 -40 V-58 M18 -40 V-58', '#c9ccd6') : `<path d="M-4 -40 L-26 -50 V-70 L14 -52 Z" fill="#c9ccd6" ${O(4)}/>`)),
        bats: () => cross(() => `<path d="M-5 70 L-14 -60 Q0 -78 14 -60 L5 70 Z" fill="#e8b070" ${O(4)}/><path d="M-6 54 H6" stroke="${K.ink}" stroke-width="10"/>`) + `<circle cx="1125" cy="470" r="22" fill="#ffc83d" ${O(4)}/><text x="1125" y="479" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="22" fill="${K.ink}">42</text>`,
        clubs: () => cross(() => `<path d="M-6 70 L-18 -40 Q-22 -76 0 -80 Q22 -76 18 -40 L6 70 Z" fill="${K.wood}" ${O(4)}/><path d="M-12 -50 l-8 -4 M10 -30 l9 -4 M-8 -64 l-6 -8" stroke="${K.line}" stroke-width="5" stroke-linecap="round"/>`),
      };
      s += K.cross ? CROSS[K.cross]() : K.hell ? CROSS.forks()
        : `<g transform="translate(1125 470)"><path d="M-46 -46 L40 40 M46 -46 L-40 40" stroke="${K.line}" stroke-width="13" stroke-linecap="round"/><path d="M-46 -46 L40 40 M46 -46 L-40 40" stroke="#c9ccd6" stroke-width="8" stroke-linecap="round"/><path d="M28 18 L18 28 M-28 18 L-18 28" stroke="${K.signTx}" stroke-width="10" stroke-linecap="round"/></g>`;
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
      if (!DEAD) g += `<path d="M846 922 q20 -10 46 -2 M900 934 q14 -6 30 0" stroke="${K.waterL || '#e8fbff'}" stroke-width="3" fill="none" opacity=".8"/>`;
      g += `<rect x="868" y="840" width="24" height="86" fill="${K.stone}" ${O(4)}/><ellipse cx="880" cy="842" rx="40" ry="12" fill="${K.stone}" ${O(4)}/><ellipse cx="880" cy="838" rx="30" ry="7" fill="url(#cqWater)"/>`;
      if (DEAD) g += `<path d="M836 928 q14 -6 30 -2 q10 6 26 0 M890 920 q12 -4 24 2" stroke="#3e4a36" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/><path d="M880 860 l-5 30 l8 22" stroke="${K.ink}" stroke-width="2.5" fill="none"/>`;   // HW: вода встала, ряска, трещина
      else g += `<path d="M880 830 q-34 -40 -46 4 M880 830 q34 -40 46 4 M880 830 v-26" stroke="${K.water}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`;
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
      g += Kt.roof([[1360, 524], [1520, 462], [1680, 524]], { pal: roofPal(K.roof), kind: K.leaves ? 'leaf' : K.roofK || 'round', step: 13, scale: 0.6, id: 'cqBoardR' });
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
    props.push({ x: 400, y: 600, w: 80, h: 410, z: 1000, svg: () => DEAD ? `<g transform="rotate(5 440 1000)"><path d="M440 1000 V650" stroke="${K.ink}" stroke-width="10"/><path d="M440 1000 V650" stroke="#2a2c34" stroke-width="5"/><path d="M424 650 h32 l-6 -26 h-20 Z" fill="#1a1c22" ${O(3)}/><path d="M428 636 l10 -8 l6 12" stroke="#4a4e58" stroke-width="2" fill="none"/></g><ellipse cx="440" cy="1000" rx="20" ry="6" fill="${K.ink}" opacity=".4"/>`   // HW: фонарь погнут, стекло выбито
      : Kt === STUB ? `<path d="M440 1000 V640" stroke="${K.ink}" stroke-width="7"/>` : `<circle cx="440" cy="655" r="40" fill="url(#cqGlow)" opacity=".8"/>` + Kt.lamp(440, 998, 380, { glow: false, pool: false }) + `<ellipse cx="440" cy="1000" rx="20" ry="6" fill="${K.ink}" opacity=".4"/>` });
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
    if (DEAD) s += deadOver();
    for (const p of props) { const f = p.svg; p.svg = () => (Kt.wrap ? Kt.wrap(f()) : f()); }   // 25.10: у каждого предмета — свои <defs> набора
    if (DEAD) { for (const p of props) { const f = p.svg; p.svg = () => deadFix(f()); } return { svg: deadFix(Kt.wrap ? Kt.wrap(s) : s), props, sky: K.sky, seam, dead: true }; }   // HW
    return { svg: Kt.wrap ? Kt.wrap(s) : s, props, sky: K.sky, seam };
    // HW: лозы по стенам Ратуши, Аукциона и Тренера, паутина между колоннами, трещины по мостовой и низкий туман
    function deadOver() {
      const vine = (x0, y0, x1, y1, w = 6) => { const n = 5; let d = `M${x0} ${y0}`, tw = '';
        for (let i = 1; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, k = i % 2 ? 1 : -1; d += ` Q${f1(x - (x1 - x0) / n / 2 + k * 16)} ${f1(y - (y1 - y0) / n / 2)} ${f1(x)} ${f1(y)}`; if (i < n) tw += `M${f1(x)} ${f1(y)} q${k * 18} -6 ${k * 26} 12 `; }
        return `<path d="${d} ${tw}" stroke="#0a0b10" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; };
      const web = (x, y, r, sx, sy) => { let d = ''; const A = [0, 0.5, 1, 1.5].map((k) => (k * Math.PI) / 3);
        for (const a of A) d += `M${x} ${y} L${f1(x + sx * Math.cos(a) * r)} ${f1(y + sy * Math.sin(a) * r)} `;
        for (const k of [0.4, 0.7, 1]) A.forEach((a, i) => { d += (i ? 'L' : 'M') + `${f1(x + sx * Math.cos(a) * r * k)} ${f1(y + sy * Math.sin(a) * r * k)} `; });
        return `<path d="${d}" stroke="#8a8e9a" stroke-width="1.6" fill="none" opacity=".6"/>`; };
      let g = vine(96, 795, 120, 500) + vine(392, 795, 370, 540, 5) + vine(498, 795, 520, 560) + vine(964, 795, 990, 540) + vine(1286, 795, 1262, 580, 5);
      g += web(506, 534, 70, 1, 1) + web(794, 534, 70, -1, 1) + web(976, 528, 60, 1, 1) + web(1274, 528, 60, -1, 1) + web(106, 478, 54, 1, 1);
      let cr = ''; for (let i = 0; i < 14; i++) { let x = 40 + ((i * 677) % (QW - 80)), y = 820 + ((i * 331) % 220); cr += `M${x} ${y}`; for (let k = 0; k < 4; k++) { x += 24 + ((i + k) * 13) % 28; y += ((i * 7 + k * 11) % 22) - 11; cr += ` L${x} ${y}`; } }
      g += `<path d="${cr}" stroke="#0a0b10" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/><path d="${cr.split('M').filter((_, i) => i % 3 === 1).map((q) => 'M' + q).join('')}" stroke="#d01a2a" stroke-width="1.4" fill="none" opacity=".6"/>`;
      return g;
    }
  }
  /* ----- 20.10: нижняя улица под Ярмаркой (на всю ширину города): уступ с лестницами, канал с мостиками, лавочки, клумбы, фонари.
     Где что стоит — из citymap.js (LOW): рисунок и проходимость совпадают. Координаты — города (y от LOW.top до H). ----- */
  /* 28.10 (art/styles-city-legend): нижняя улица новых стилей - цвета и мелочи одной таблицей (у legion / cats / monkeys - как было, ветками ниже).
     ground - земля, wall - подпорная стенка, rail - ограда [брус, блик, бортик], steps, quay - набережная, deck - мостик, bottom - нижняя ограда,
     bench, bed - клумба [бортик, земля], fl - цветы, kinds - мелочи, stone - памятник, fig(sx, sy, O) - фигура, rock - скала шахты, plank - Склад,
     plinth - цоколь Склада, roof - крыша Склада, ripple - блики на воде, extra(a, b, top, O) - примета на крыше Склада */
  const neonL = (d, c, w = 5) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w * 2.6}" stroke-linecap="round" opacity=".28"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="${f1(w * 0.36)}" stroke-linecap="round" opacity=".8"/>`;
  const tusk = (x, top, d, O, c = '#f3e6c8') => `<path d="M${x} ${top} q${d * 22} -4 ${d * 22} -36 q${-d * 4} 18 ${-d * 16} 32 Z" fill="${c}" ${O(3)}/>`;
  const LOWX = {
    veggies: { ground: '#7a5e40', wall: '#8a5a2b', rail: ['#c8894a', '#e8b070', '#8a5a2b'], cap: '#4caf50', steps: ['#a87a50', '#c8a87a'], quay: '#6a4420', deck: '#c8894a', bridgeRail: '#e8b070', bottom: '#8a5a2b',
      bench: '#c8894a', bed: ['#8a5a2b', '#4a3018'], fl: ['#e8402f', '#ff9a2a', '#ffd84a'], kinds: ['pumpkin', 'cabbage', 'can', 'crate'], stone: '#a89070', rock: ['#9a8a70', '#b8a88a', '#6a5a44'],
      plank: '#c8894a', plankD: '#8a5a2b', plinth: '#a89070', roof: '#4f9a3a', ripple: '#e8fbff',
      extra: (a, b, top, O) => `<path d="M${(a + b) / 2} ${top - 84} q-6 -26 -26 -30 q14 18 26 30 q6 -30 30 -36 q-18 20 -30 36" fill="#6fdc6f" ${O(3)}/>` },
    '42brothers': { ground: '#241a34', wall: '#3a2e4e', rail: ['#c9ced6', '#ffffff', '#5a4a72'], cap: '#ff5fa2', steps: ['#4a3a5a', '#5a4a6a'], quay: '#2a1a3a', deck: '#5a4a6a', bridgeRail: '#c9ced6', bottom: '#3a2e4e',
      bench: '#ff5fa2', bed: ['#c9ced6', '#2a1a3a'], fl: ['#ff5fa2', '#5ad1ff', '#ffc83d'], kinds: ['speaker', 'bags', 'crate', 'barrel'], stone: '#5a4a6a', rock: ['#5a4a6a', '#7a6a8a', '#3a2e4e'],
      plank: '#3a2a4a', plankD: '#1e1230', plinth: '#5a4a6a', roof: '#ff5fa2', ripple: '#e8fbff',
      fig: (sx, sy, O) => `<path d="M${sx - 30} ${sy - 300} L${sx - 82} ${sy - 214} V${sy - 192} H${sx - 30} V${sy - 170} H${sx - 4} V${sy - 192} H${sx + 6} V${sy - 214} H${sx - 4} V${sy - 300} Z M${sx - 30} ${sy - 214} H${sx - 50} L${sx - 30} ${sy - 250} Z" fill="#ffc83d" fill-rule="evenodd" ${O(5)}/>`
        + `<path d="M${sx + 14} ${sy - 266} Q${sx + 44} ${sy - 312} ${sx + 78} ${sy - 272} Q${sx + 88} ${sy - 236} ${sx + 48} ${sy - 196} H${sx + 84} V${sy - 170} H${sx + 12} L${sx + 50} ${sy - 232} Q${sx + 58} ${sy - 258} ${sx + 42} ${sy - 262} Q${sx + 34} ${sy - 262} ${sx + 34} ${sy - 246} Z" fill="#ffc83d" ${O(5)}/>`
        + `<path d="M${sx - 40} ${sy - 316} l10 -26 l12 16 l14 -24 l14 24 l12 -16 l10 26 Z" fill="#ffc83d" ${O(4)}/><path d="M${sx - 70} ${sy - 210} h30 M${sx + 60} ${sy - 280} v20" stroke="#fff6c8" stroke-width="5" stroke-linecap="round" opacity=".8"/>`,
      extra: (a, b, top) => neonL(`M${a - 20} ${top + 4} H${b + 20}`, '#5ad1ff', 5) },
    ugabugi: { ground: '#9a7a4a', wall: '#8a8478', rail: ['#f3e6c8', '#ffffff', '#a8743a'], cap: '#f3e6c8', steps: ['#8a8478', '#a8a092'], quay: '#6a645a', deck: '#a8743a', bridgeRail: '#f3e6c8', bottom: '#8a8478',
      bench: '#a8743a', bed: ['#8a8478', '#4a3420'], fl: ['#e8402a', '#ffd27a', '#8ac45a'], kinds: ['bones', 'drum', 'fire', 'wheel'], stone: '#8a8478', rock: ['#8a8478', '#a8a092', '#5e584e'],
      plank: '#a8743a', plankD: '#6a4420', plinth: '#8a8478', roof: '#c9955a', ripple: '#e8fbff',
      fig: (sx, sy, O) => `<path d="M${sx - 50} ${sy - 150} L${sx - 40} ${sy - 300} Q${sx} ${sy - 330} ${sx + 40} ${sy - 300} L${sx + 50} ${sy - 150} Z" fill="#a8a092" ${O(5)}/><path d="M${sx - 26} ${sy - 268} h18 M${sx + 8} ${sy - 268} h18" stroke="#2a1a12" stroke-width="9" stroke-linecap="round"/>`
        + `<path d="M${sx - 22} ${sy - 230} h44 v14 h-44 Z" fill="#2a1a12"/><path d="M${sx - 16} ${sy - 230} v8 M${sx} ${sy - 230} v8 M${sx + 16} ${sy - 230} v8" stroke="#f3e6c8" stroke-width="4"/><path d="M${sx - 40} ${sy - 196} h80 M${sx - 44} ${sy - 176} h88" stroke="#5e584e" stroke-width="5"/>`
        + tusk(sx - 46, sy - 250, -1, O) + tusk(sx + 46, sy - 250, 1, O),
      extra: (a, b, top, O) => tusk(a - 6, top, -1, O) + tusk(b + 6, top, 1, O) },
    cherts: { ground: '#1e1417', wall: '#3a3346', rail: ['#3a3346', '#8a84a0', '#2a2236'], cap: '#ffc83d', steps: ['#3a3346', '#4a4458'], quay: '#2a2236', deck: '#4a4458', bridgeRail: '#5a5470', bottom: '#3a3346',
      bench: '#3a3346', bed: ['#3a3346', '#2a1414'], fl: ['#ff5a1a', '#ffc83d', '#e8203a'], kinds: ['cauldron', 'coal', 'barrel', 'crate'], stone: '#4a4458', rock: ['#4a3a40', '#6a5258', '#2a1e22'],
      plank: '#4a4458', plankD: '#2a2236', plinth: '#3a3346', roof: '#6a1020', ripple: '#fff1a0',
      fig: (sx, sy, O) => `<path d="M${sx - 36} ${sy - 150} q-4 -70 36 -84 q40 14 36 84 Z" fill="#c8102e" ${O(5)}/><circle cx="${sx}" cy="${sy - 250}" r="32" fill="#c8102e" ${O(5)}/>`
        + `<path d="M${sx - 22} ${sy - 274} q-18 -10 -14 -40 q8 22 26 26 Z M${sx + 22} ${sy - 274} q18 -10 14 -40 q-8 22 -26 26 Z" fill="#e8d8b8" ${O(3)}/><path d="M${sx - 12} ${sy - 252} h0.1 M${sx + 12} ${sy - 252} h0.1" stroke="#2a0d14" stroke-width="8" stroke-linecap="round"/><path d="M${sx - 12} ${sy - 236} q12 10 24 0" stroke="#2a0d14" stroke-width="4" fill="none" stroke-linecap="round"/>`
        + `<path d="M${sx + 30} ${sy - 170} q40 10 30 50 q-6 14 -20 8" stroke="#2a0d14" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${sx + 30} ${sy - 170} q40 10 30 50 q-6 14 -20 8" stroke="#c8102e" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
        + `<path d="M${sx - 52} ${sy - 140} V${sy - 320}" stroke="#2a0d14" stroke-width="11" stroke-linecap="round"/><path d="M${sx - 52} ${sy - 140} V${sy - 320}" stroke="#5a2a1a" stroke-width="5" stroke-linecap="round"/><path d="M${sx - 70} ${sy - 320} V${sy - 346} M${sx - 52} ${sy - 322} V${sy - 356} M${sx - 34} ${sy - 320} V${sy - 346} M${sx - 72} ${sy - 318} H${sx - 32}" stroke="#2a0d14" stroke-width="10" stroke-linecap="round"/><path d="M${sx - 70} ${sy - 320} V${sy - 346} M${sx - 52} ${sy - 322} V${sy - 356} M${sx - 34} ${sy - 320} V${sy - 346} M${sx - 72} ${sy - 318} H${sx - 32}" stroke="#ffc83d" stroke-width="5" stroke-linecap="round"/>`,
      extra: (a, b, top, O) => tusk(a - 6, top, -1, O, '#e8d8b8') + tusk(b + 6, top, 1, O, '#e8d8b8') },
  };
  function lower(style, M, opt = {}) {   // opt.storage — Склад открыт (тестерам): без досок на воротах и таблички «СКОРО»
    const K = PAL[style] || PAL.legion, L = M.LOW, W = M.W, H = M.H, T = L.top, Kt = kitOf(style, K), X = LOWX[style];
    let seed = 29; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const O = (w = 5) => `stroke="${K.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const [e0, e1] = L.edge, [c0, c1] = L.canal;
    let s = `<defs><linearGradient id="lwWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.waterD}"/><stop offset=".5" stop-color="${K.water}"/><stop offset="1" stop-color="${K.waterD}"/></linearGradient>
      <linearGradient id="lwShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14112a" stop-opacity=".5"/><stop offset="1" stop-color="#14112a" stop-opacity="0"/></linearGradient>
      <radialGradient id="lwGlow"><stop offset="0" stop-color="#ffe59a" stop-opacity=".85"/><stop offset="1" stop-color="#ffbe5a" stop-opacity="0"/></radialGradient></defs>`;
    // земля нижней улицы
    const G = K.ground_kind;
    s += `<rect x="0" y="${e1}" width="${W}" height="${H - e1}" fill="${X ? X.ground : G === 'tiles' ? '#b45a40' : G === 'deck' ? '#b98a52' : '#34314a'}"/>`;
    // 25.10: земля нижней улицы — символы набора (булыжник / плитка / доски) одного размера по всей улице (вид сверху, без перспективы)
    if (Kt !== STUB) s += Kt.pave(G === 'tiles' ? 'tile' : G === 'deck' ? 'plank' : 'cobble', [0, e1, W, H], { pal: 'low', k0: G === 'deck' ? 1.05 : 0.95, k1: G === 'deck' ? 1.05 : 0.95, sx: G === 'deck' ? 1.4 : 1, seed: 17 });
    else if (G === 'cobble') for (let i = 0; i < 1400; i++) { const x = rnd() * W, y = e1 + rnd() * (H - e1), r = 22 + rnd() * 10; s += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(r * (0.9 + rnd() * 0.5)).toFixed(0)}" ry="${(r * 0.55).toFixed(0)}" fill="${K.ground2}"/>`; }
    // пятна тёплого света под фонарями
    for (const [lx, ly] of L.lamps) s += `<ellipse cx="${lx}" cy="${ly - 30}" rx="120" ry="40" fill="url(#lwGlow)" opacity=".22"/>`;
    // уступ: подпорная стенка (кирпич/камень/бревно) с лестницами вниз
    s += `<rect x="0" y="${e1}" width="${W}" height="40" fill="url(#lwShade)"/>`;
    const wallC = X ? X.wall : G === 'deck' ? '#9a6a3c' : G === 'tiles' ? '#a9503c' : '#5a5768';
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
    const [rc, rh, rd] = X ? X.rail : [G === 'deck' ? '#c99a5e' : G === 'tiles' ? '#c8664a' : '#8b8796', G === 'deck' ? '#f0d6a8' : G === 'tiles' ? '#f0a07e' : '#c4c0cc', G === 'deck' ? '#9a6a3c' : G === 'tiles' ? '#8e3f2e' : '#5a5768'];
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
              + `<rect x="${p - 16}" y="${fenceY}" width="32" height="13" rx="5" fill="${X && X.cap || rh}" stroke="${K.ink}" stroke-width="5"/>`; }   // столбик с шапкой
          return g;
        } });
      }
    }
    for (const [a, b] of L.stairs) {
      if (a > x) s += seg(x, a);
      // лестница: ступени во всю высоту уступа
      for (let i = 0; i < 4; i++) { const y = e0 - 8 + i * 17; s += `<rect x="${a + 6}" y="${y}" width="${b - a - 12}" height="18" fill="${X ? X.steps[i % 2] : i % 2 ? (G === 'deck' ? '#c99a5e' : G === 'tiles' ? '#c8664a' : '#6d6a78') : (G === 'deck' ? '#e2b678' : G === 'tiles' ? '#e08a68' : '#8b8796')}" ${O(3)}/>`; }
      x = b;
    }
    if (x < W) s += seg(x, W);
    // канал: набережные и вода (по воде не ходят), мостики
    s += `<rect x="0" y="${c0 - 10}" width="${W}" height="${c1 - c0 + 20}" fill="${X ? X.quay : G === 'deck' ? '#6e4a2f' : G === 'tiles' ? '#7a3426' : '#4d4a5c'}" ${O(5)}/><rect x="0" y="${c0 + 4}" width="${W}" height="${c1 - c0 - 8}" fill="url(#lwWater)"/>`;
    // 25.10: набережная — камни бортика сверху и снизу, у воды — тёмная кромка и блики фонарей на воде
    if (Kt !== STUB) s += Kt.wall([0, c0 - 10, W, c0 + 4], { pal: 'brick', scale: 0.24, seed: 41 }) + Kt.wall([0, c1 - 4, W, c1 + 10], { pal: 'brick', scale: 0.24, seed: 43 }) + `<path d="M0 ${c0 + 5} H${W} M0 ${c1 - 5} H${W}" stroke="${K.ink}" stroke-width="3" opacity=".5"/>`;
    for (const [lx] of L.lamps) s += `<ellipse cx="${lx}" cy="${(c0 + c1) / 2}" rx="26" ry="30" fill="url(#lwGlow)" opacity=".45"/><path d="M${lx - 14} ${(c0 + c1) / 2 - 10} h28 M${lx - 10} ${(c0 + c1) / 2 + 4} h20 M${lx - 6} ${(c0 + c1) / 2 + 18} h12" stroke="#fff3c0" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    for (let i = 0; i < 60; i++) { const wx = rnd() * W, wy = c0 + 18 + rnd() * (c1 - c0 - 36); s += `<path d="M${wx.toFixed(0)} ${wy.toFixed(0)} q14 -8 28 0 q14 8 28 0" fill="none" stroke="${X ? X.ripple : '#e8fbff'}" stroke-width="3" opacity=".55"/>`; }
    if (style === 'cats') for (let i = 0; i < 10; i++) { const fx = 200 + rnd() * (W - 400), fy = c0 + 30 + rnd() * 30; s += `<g transform="translate(${fx.toFixed(0)} ${fy.toFixed(0)})"><path d="M-14 0 q14 -12 28 0 q-14 12 -28 0 Z M14 0 l10 -8 v16 Z" fill="#ffb27a" stroke="${K.ink}" stroke-width="2.5"/></g>`; }
    if (style === 'monkeys') for (let i = 0; i < 8; i++) { const lx = 200 + rnd() * (W - 400), ly = c0 + 20 + rnd() * 50; s += `<ellipse cx="${lx.toFixed(0)}" cy="${ly.toFixed(0)}" rx="18" ry="8" fill="#56a843" stroke="${K.ink}" stroke-width="2.5"/>`; }
    for (const [a, b] of L.bridges) {
      const deck = X ? X.deck : G === 'deck' ? '#c99a5e' : G === 'tiles' ? '#a8754f' : '#8b8796';
      s += `<path d="M${a - 20} ${c0 - 14} H${b + 20} V${c1 + 14} H${a - 20} Z" fill="${deck}"/>`;
      // 25.10: настил мостика — доски набора
      if (Kt !== STUB) s += Kt.pave('plank', [a - 20, c0 - 14, b + 20, c1 + 14], { pal: G === 'cobble' ? 'stone' : 'wood', k0: 0.55, k1: 0.55, seed: a, cut: true });
      else for (let y = c0; y < c1 + 10; y += 20) s += `<path d="M${a - 20} ${y} H${b + 20}" stroke="${K.ink}" stroke-width="2.5" opacity=".4"/>`;
      s += `<path d="M${a - 20} ${c0 - 14} H${b + 20} V${c1 + 14} H${a - 20} Z" fill="none" ${O(5)}/>`;
      // перила по бокам моста (вдоль канала — поперёк воды)
      for (const px of [a - 14, b + 14]) s += `<path d="M${px} ${c0 - 50} V${c1 + 10}" stroke="${K.line}" stroke-width="12" stroke-linecap="round"/><path d="M${px} ${c0 - 50} V${c1 + 10}" stroke="${X ? X.bridgeRail : G === 'deck' ? '#d8b98a' : K.woodD}" stroke-width="7" stroke-linecap="round"/>`;
    }
    // нижний край: низкая ограда и кусты
    s += `<rect x="0" y="${H - 44}" width="${W}" height="44" fill="${X ? X.bottom : G === 'deck' ? '#9a6a3c' : G === 'tiles' ? '#a9503c' : '#5a5768'}" ${O(5)}/>`;
    // 25.10: кусты у нижней ограды (символы набора), между ними — цветочные ящики
    if (Kt !== STUB) { for (let bx = 60; bx < W; bx += 170 + rnd() * 120) s += Kt.tree('bush', f1(bx), H - 40, f1(0.75 + rnd() * 0.3), rnd() < 0.5) + (rnd() < 0.35 ? Kt.thing('flowers', f1(bx + 96), H - 44, 1) : ''); }
    else for (let bx = 30; bx < W; bx += 150 + rnd() * 120) s += `<ellipse cx="${bx.toFixed(0)}" cy="${H - 72}" rx="${(46 + rnd() * 24).toFixed(0)}" ry="26" fill="${style === 'cats' ? '#5a3a5a' : '#3f8f3a'}" ${O(4)}/>`;
    // предметы с глубиной: лавочки, клумбы, фонари
    const benchC = X ? X.bench : style === 'cats' ? '#e88aa8' : K.wood;
    for (const [bx, by] of L.benches) props.push({ x: bx - 100, y: by - 110, w: 200, h: 130, z: by, svg: () => style === 'cats'
      ? `<rect x="${bx - 80}" y="${by - 34}" width="160" height="40" rx="18" fill="${benchC}" ${O(5)}/><path d="M${bx - 70} ${by - 30} h140" stroke="#fff" stroke-width="4" opacity=".5"/><path d="M${bx - 60} ${by - 34} l8 -24 l14 22 M${bx + 60} ${by - 34} l-8 -24 l-14 22" fill="${benchC}" ${O(4)}/>`
      : `<rect x="${bx - 80}" y="${by - 74}" width="160" height="16" rx="5" fill="${benchC}" ${O(4)}/><path d="M${bx - 72} ${by - 68} h60 M${bx + 10} ${by - 64} h56" stroke="${K.woodD}" stroke-width="2" opacity=".6"/><rect x="${bx - 80}" y="${by - 40}" width="160" height="18" rx="5" fill="${benchC}" ${O(4)}/><path d="M${bx - 70} ${by - 34} h70 M${bx + 14} ${by - 30} h52" stroke="${K.woodD}" stroke-width="2" opacity=".6"/><path d="M${bx - 66} ${by - 22} V${by + 4} M${bx + 66} ${by - 22} V${by + 4} M${bx - 66} ${by - 58} V${by - 40} M${bx + 66} ${by - 58} V${by - 40}" stroke="${K.line}" stroke-width="10" stroke-linecap="round"/><path d="M${bx - 66} ${by - 22} V${by + 4} M${bx + 66} ${by - 22} V${by + 4} M${bx - 66} ${by - 58} V${by - 40} M${bx + 66} ${by - 58} V${by - 40}" stroke="${K.woodD}" stroke-width="5" stroke-linecap="round"/>` });
    // 24.10: шахта открыта — клумба у доски итогов левее (citymap.js LOW.mineBed)
    const beds = opt.mine && L.mine && L.mineBed ? L.beds.map(([x, y]) => (x === L.mineBed[0][0] && y === L.mineBed[0][1] ? L.mineBed[1] : [x, y])) : L.beds;
    for (const [fx, fy] of beds) props.push({ x: fx - 110, y: fy - 90, w: 220, h: 130, z: fy, svg: () => {
      let g = `<ellipse cx="${fx}" cy="${fy}" rx="100" ry="34" fill="${X ? X.bed[0] : G === 'deck' ? '#8a5a32' : '#8b8796'}" ${O(5)}/><ellipse cx="${fx}" cy="${fy - 6}" rx="86" ry="24" fill="${X ? X.bed[1] : '#5a3d24'}"/>`;
      const fl = X ? X.fl : style === 'monkeys' ? ['#ffd84a', '#ffd84a', '#ff8a5c'] : style === 'cats' ? ['#9fe39a', '#b9a2ff', '#ff9fb2'] : style === 'veggies' ? ['#e8892a', '#e8455c', '#6fdc6f'] : ['#e8455c', '#ffd76a', '#b9a2ff'];
      g += Kt.tree('bush', fx, fy - 8, 0.62);   // 25.10: куст посередине клумбы, цветы вокруг
      for (let i = 0; i < 9; i++) { if (i === 3 || i === 4 || i === 5) continue; const px = fx - 70 + i * 17.5, py = fy - 14 - (i % 2) * 10; g += `<path d="M${px} ${py + 10} V${py - 22}" stroke="#3f8f3a" stroke-width="4"/><circle cx="${px}" cy="${py - 26}" r="10" fill="${fl[i % 3]}" stroke="${K.ink}" stroke-width="2.5"/><circle cx="${px}" cy="${py - 26}" r="3.4" fill="#fff6c8"/>`; }
      return g;
    } });
    // мелочи: у каждого стиля свои
    const kinds = X ? X.kinds : style === 'cats' ? ['yarn', 'fishbox', 'pot', 'crate'] : style === 'monkeys' ? ['bananas', 'barrel', 'pot', 'crate'] : style === 'veggies' ? ['pumpkin', 'crate', 'pot', 'barrel'] : ['barrel', 'crate', 'pot', 'cart'];
    const deco = (k, x, y) => {
      if (k === 'barrel') return `<rect x="${x - 26}" y="${y - 62}" width="52" height="64" rx="10" fill="${K.wood}" ${O(4)}/><path d="M${x - 26} ${y - 44} H${x + 26} M${x - 26} ${y - 16} H${x + 26}" stroke="${K.woodD}" stroke-width="5"/>`;
      if (k === 'crate' || k === 'fishbox') return `<rect x="${x - 34}" y="${y - 54}" width="68" height="56" fill="${K.wood}" ${O(4)}/><path d="M${x - 34} ${y - 54} L${x + 34} ${y + 2} M${x + 34} ${y - 54} L${x - 34} ${y + 2}" stroke="${K.woodD}" stroke-width="4"/>` + (k === 'fishbox' ? [-18, 0, 18].map((d) => `<path transform="translate(${x + d} ${y - 60}) rotate(-70)" d="M-14 0 q14 -10 28 0 q-14 10 -28 0 Z M14 0 l9 -7 v14 Z" fill="#9fd6ff" stroke="${K.ink}" stroke-width="2.5"/>`).join('') : '');
      if (k === 'pot') return `<path d="M${x - 24} ${y - 40} H${x + 24} L${x + 18} ${y} H${x - 18} Z" fill="#c56a2a" ${O(4)}/><circle cx="${x - 12}" cy="${y - 58}" r="16" fill="#56a843" ${O(3)}/><circle cx="${x + 10}" cy="${y - 64}" r="18" fill="#3f8f3a" ${O(3)}/>`;
      if (k === 'yarn') return `<circle cx="${x}" cy="${y - 24}" r="26" fill="#ff9fb2" ${O(4)}/><path d="M${x - 20} ${y - 34} q20 -6 40 6 M${x - 24} ${y - 20} q24 -6 46 8 M${x - 10} ${y - 48} q16 18 4 46" fill="none" stroke="#c84a6a" stroke-width="3"/><path d="M${x + 20} ${y - 8} q30 10 40 -6" fill="none" stroke="#ff9fb2" stroke-width="4"/>`;
      if (k === 'bananas') return `<path d="M${x - 30} ${y - 30} q30 40 60 0 q-30 20 -60 0 Z M${x - 24} ${y - 46} q24 34 48 0 q-24 16 -48 0 Z" fill="#ffd84a" ${O(3.5)}/>`;
      if (k === 'cauldron') return `<path d="M${x - 40} ${y - 50} q-4 50 40 52 q44 -2 40 -52 Z" fill="#2a2236" ${O(4)}/><ellipse cx="${x}" cy="${y - 50}" rx="42" ry="11" fill="#ff7a1a" ${O(3.5)}/><ellipse cx="${x - 6}" cy="${y - 51}" rx="20" ry="4" fill="#ffe27a"/><path d="M${x - 30} ${y} l-6 8 M${x + 30} ${y} l6 8" stroke="${K.ink}" stroke-width="6" stroke-linecap="round"/>`;
      if (k === 'coal') return `<path d="M${x - 46} ${y - 44} h92 l-10 40 h-72 Z" fill="#4a4458" ${O(4)}/><circle cx="${x - 24}" cy="${y - 2}" r="10" fill="#2a2236" ${O(3)}/><circle cx="${x + 24}" cy="${y - 2}" r="10" fill="#2a2236" ${O(3)}/>` + [[-26, -50, 12], [-4, -56, 14], [20, -50, 12], [8, -64, 9]].map(([a, b, r], i) => `<circle cx="${x + a}" cy="${y + b}" r="${r}" fill="${i === 3 ? '#ff7a1a' : '#1e1a22'}" ${O(2.5)}/>`).join('');
      if (k === 'cabbage') return `<circle cx="${x}" cy="${y - 26}" r="28" fill="#9fe39a" ${O(4)}/><path d="M${x - 24} ${y - 34} q12 -14 24 -2 q12 -12 24 2 M${x - 18} ${y - 14} q18 -18 36 0" stroke="#2f7a35" stroke-width="3.5" fill="none"/><path d="M${x - 36} ${y - 6} q-6 -26 12 -34 M${x + 36} ${y - 6} q6 -26 -12 -34" fill="#4caf50" ${O(3)}/>`;
      if (k === 'can') return `<path d="M${x - 28} ${y} V${y - 46} H${x + 20} V${y} Z" fill="#5ab0d8" ${O(4)}/><path d="M${x + 20} ${y - 30} L${x + 52} ${y - 58} l6 6 L${x + 22} ${y - 18}" fill="#5ab0d8" ${O(3.5)}/><path d="M${x - 18} ${y - 46} q12 -24 28 0" fill="none" ${O(5)}/><path d="M${x - 28} ${y - 46} q12 -24 28 0" fill="none" stroke="#3a8ab8" stroke-width="2"/>`;
      if (k === 'speaker') return `<rect x="${x - 34}" y="${y - 90}" width="68" height="92" rx="8" fill="#1c1022" ${O(4)}/><circle cx="${x}" cy="${y - 30}" r="22" fill="#3a2e4e" ${O(3)}/><circle cx="${x}" cy="${y - 30}" r="9" fill="#ff5fa2"/><circle cx="${x}" cy="${y - 72}" r="10" fill="#3a2e4e" ${O(2.5)}/><path d="M${x - 34} ${y - 90} h68" stroke="#5ad1ff" stroke-width="4"/>`;
      if (k === 'bags') return [[-22, '#ff5fa2'], [18, '#ffc83d']].map(([d, c]) => `<path d="M${x + d - 20} ${y} L${x + d - 16} ${y - 48} H${x + d + 16} L${x + d + 20} ${y} Z" fill="${c}" ${O(4)}/><path d="M${x + d - 8} ${y - 48} q8 -22 16 0" fill="none" stroke="${K.ink}" stroke-width="3.5"/>`).join('');
      if (k === 'bones') return `<path d="M${x - 40} ${y - 10} L${x + 40} ${y - 30} M${x - 30} ${y - 34} L${x + 34} ${y - 4}" stroke="${K.ink}" stroke-width="15" stroke-linecap="round"/><path d="M${x - 40} ${y - 10} L${x + 40} ${y - 30} M${x - 30} ${y - 34} L${x + 34} ${y - 4}" stroke="#f3e6c8" stroke-width="9" stroke-linecap="round"/><circle cx="${x}" cy="${y - 44}" r="16" fill="#f3e6c8" ${O(3)}/><path d="M${x - 6} ${y - 46} h0.1 M${x + 6} ${y - 46} h0.1" stroke="${K.ink}" stroke-width="6" stroke-linecap="round"/>`;
      if (k === 'drum') return `<path d="M${x - 30} ${y - 60} V${y} H${x + 30} V${y - 60} Z" fill="#a8743a" ${O(4)}/><ellipse cx="${x}" cy="${y - 60}" rx="30" ry="9" fill="#e8c890" ${O(3.5)}/><path d="M${x - 30} ${y - 50} L${x + 30} ${y - 10} M${x + 30} ${y - 50} L${x - 30} ${y - 10}" stroke="#6a4420" stroke-width="3"/>`;
      if (k === 'fire') return `<path d="M${x - 30} ${y} l60 -14 M${x + 30} ${y} l-60 -14" stroke="${K.woodD}" stroke-width="11" stroke-linecap="round"/><path d="M${x} ${y - 10} c-22 -4 -24 -32 0 -60 c4 22 18 22 14 38 c10 0 8 18 -14 22 Z" fill="#ff8a2a" ${O(3)}/><path d="M${x} ${y - 14} c-8 -4 -8 -18 0 -28 c6 10 8 22 0 28 Z" fill="#ffd27a"/>`;
      if (k === 'wheel') return `<circle cx="${x}" cy="${y - 34}" r="34" fill="#a8a092" ${O(4)}/><circle cx="${x}" cy="${y - 34}" r="9" fill="#5e584e" ${O(3)}/><path d="M${x - 22} ${y - 54} q8 -6 18 -4" stroke="#c8c0b2" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      if (k === 'pumpkin') return `<ellipse cx="${x}" cy="${y - 26}" rx="38" ry="28" fill="#e8892a" ${O(4)}/><path d="M${x - 12} ${y - 52} q-6 26 0 52 M${x + 12} ${y - 52} q6 26 0 52" fill="none" stroke="#a85a12" stroke-width="3"/><path d="M${x} ${y - 54} q4 -14 14 -16" stroke="#3f8f3a" stroke-width="6" fill="none"/>`;
      return `<rect x="${x - 50}" y="${y - 54}" width="100" height="40" fill="${K.wood}" ${O(4)}/><circle cx="${x - 30}" cy="${y - 8}" r="14" fill="${K.woodD}" ${O(3)}/><circle cx="${x + 30}" cy="${y - 8}" r="14" fill="${K.woodD}" ${O(3)}/>`;
    };
    L.decor.forEach(([dx, dy], i) => { const k = kinds[i % kinds.length]; props.push({ x: dx - 60, y: dy - 110, w: 120, h: 120, z: dy, svg: () => deco(k, dx, dy) }); });
    // памятник посреди нижней площади: постамент и фигура в духе стиля (кот, легионер, обезьяна, тыква)
    { const [sx, sy] = L.statue, stone = X ? X.stone : '#8b8796';
      const fig = X && X.fig ? X.fig(sx, sy, O) : style === 'cats' ? `<path d="M${sx - 40} ${sy - 150} q0 -90 40 -100 q40 10 40 100 Z" fill="${stone}" ${O(5)}/><path d="M${sx - 30} ${sy - 230} l10 -34 l18 26 Z M${sx + 30} ${sy - 230} l-10 -34 l-18 26 Z" fill="${stone}" ${O(4)}/><circle cx="${sx}" cy="${sy - 215}" r="34" fill="${stone}" ${O(5)}/><path d="M${sx + 40} ${sy - 160} q50 -10 40 -70" fill="none" stroke="${K.line}" stroke-width="16" stroke-linecap="round"/><path d="M${sx + 40} ${sy - 160} q50 -10 40 -70" fill="none" stroke="${stone}" stroke-width="10" stroke-linecap="round"/>`
        : style === 'monkeys' ? `<rect x="${sx - 26}" y="${sy - 300}" width="52" height="150" rx="10" fill="#9a6a3c" ${O(5)}/>` + [0, 1, 2].map((i) => `<circle cx="${sx}" cy="${sy - 270 + i * 46}" r="22" fill="#7a5230" ${O(4)}/><circle cx="${sx - 8}" cy="${sy - 274 + i * 46}" r="4" fill="${K.ink}"/><circle cx="${sx + 8}" cy="${sy - 274 + i * 46}" r="4" fill="${K.ink}"/>`).join('') + `<path d="M${sx - 40} ${sy - 300} q40 -60 80 0" fill="#ffd84a" ${O(4)}/>`
        : style === 'veggies' ? `<ellipse cx="${sx}" cy="${sy - 200}" rx="70" ry="54" fill="#e8892a" ${O(5)}/><path d="M${sx - 24} ${sy - 250} q-10 50 0 100 M${sx + 24} ${sy - 250} q10 50 0 100" fill="none" stroke="#a85a12" stroke-width="4"/><path d="M${sx} ${sy - 254} q8 -30 30 -34" stroke="#3f8f3a" stroke-width="9" fill="none"/>`
        : `<path d="M${sx - 34} ${sy - 150} V${sy - 230} q34 -20 68 0 V${sy - 150} Z" fill="${stone}" ${O(5)}/><circle cx="${sx}" cy="${sy - 254}" r="28" fill="${stone}" ${O(5)}/><path d="M${sx - 32} ${sy - 266} q32 -40 64 0" fill="#a3122a" ${O(4)}/><path d="M${sx + 40} ${sy - 140} V${sy - 300}" stroke="${K.line}" stroke-width="12"/><path d="M${sx + 40} ${sy - 140} V${sy - 300}" stroke="#c9ccd6" stroke-width="7"/><rect x="${sx - 58}" y="${sy - 220}" width="34" height="60" rx="8" fill="#a3122a" ${O(4)}/>`;
      props.push({ x: sx - 140, y: sy - 330, w: 280, h: 340, z: sy, svg: () => `<ellipse cx="${sx}" cy="${sy}" rx="112" ry="34" fill="${stone}" ${O(5)}/><rect x="${sx - 80}" y="${sy - 150}" width="160" height="150" fill="${stone}" ${O(5)}/><rect x="${sx - 96}" y="${sy - 160}" width="192" height="22" fill="#a9a5b4" ${O(4)}/><rect x="${sx - 60}" y="${sy - 110}" width="120" height="44" rx="6" fill="${K.sign}" ${O(3)}/><text x="${sx}" y="${sy - 80}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="22" fill="${K.signTx}">ГЕРОЯМ</text>` + fig });
    }
    // 23.10: вход в шахту (промысел города) — скальный выступ у подпорной стены с крепью, рельсами и вагонеткой (citymap.js LOW.mine).
    // Только кому шахта открыта (opt.mine)
    if (opt.mine && L.mine) { const { x0, x1, base: B } = L.mine;
      props.push({ x: x0 - 30, y: 1030, w: x1 - x0 + 60, h: B - 1030 + 30, z: B, svg: () => {
        const [rk0, rk1, rk2] = X ? X.rock : [];
        const cx = (x0 + x1) / 2, rock = X ? rk0 : style === 'cats' ? '#8a6a5a' : style === 'monkeys' ? '#8a7a5a' : '#7a7484', rockL = X ? rk1 : style === 'cats' ? '#a8887a' : style === 'monkeys' ? '#a89a72' : '#9a94a6', rockD = X ? rk2 : style === 'cats' ? '#5e4638' : style === 'monkeys' ? '#5e5236' : '#57505e';
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
        const plank = X ? X.plank : G === 'tiles' ? '#b07a52' : G === 'deck' ? '#c99a5e' : '#8a6a4a', plankD = X ? X.plankD : G === 'tiles' ? '#7a4a30' : G === 'deck' ? '#8a5a32' : '#5e4630';
        const roofC = X ? X.roof : style === 'cats' ? '#5a3a5a' : style === 'monkeys' ? '#3f8f3a' : style === 'veggies' ? '#4f9a3a' : '#a3122a';
        let g = `<g data-ol="storage"><ellipse cx="${cx}" cy="${B}" rx="${(x1 - x0) / 2 + 10}" ry="16" fill="${K.ink}" opacity=".3"/>`;
        // стены из досок, каменный цоколь
        // 26.10 (art/buildings): обшивка досками набора, цоколь — кладка, крыша — черепица / листья рядами
        g += `<rect x="${a}" y="${top}" width="${b - a}" height="${B - top}" fill="${plank}" ${O(5)}/>`;
        if (Kt.planks) g += Kt.planks([a + 2, top + 2, b - 2, B - 40], plank, 26) + `<rect x="${a}" y="${top}" width="${b - a}" height="${B - top}" fill="none" ${O(5)}/>`;
        else for (let x = a + 26; x < b; x += 26) g += `<path d="M${x} ${top + 4} V${B - 40}" stroke="${plankD}" stroke-width="2.5" opacity=".7"/>`;
        g += `<rect x="${a - 6}" y="${B - 40}" width="${b - a + 12}" height="40" fill="${X ? X.plinth : G === 'deck' ? '#8a5a32' : '#8b8796'}" ${O(4)}/>` + (Kt !== STUB && G !== 'deck' ? Kt.wall([a - 4, B - 38, b + 4, B - 2], { pal: G === 'tiles' ? 'brick' : 'light', scale: 0.3, seed: 61 }) + `<rect x="${a - 6}" y="${B - 40}" width="${b - a + 12}" height="40" fill="none" ${O(4)}/>` : [0, 1, 2, 3, 4, 5].map((i) => `<path d="M${a + 30 + i * 64} ${B - 40} V${B}" stroke="${K.ink}" stroke-width="2" opacity=".35"/>`).join(''));
        // крыша: двускатная, у котиков — уши, у обезьян — листья
        if (Kt !== STUB) g += Kt.roof([[a - 26, top + 6], [cx, peak], [b + 26, top + 6]], { pal: roofPal(roofC), kind: G === 'deck' ? 'leaf' : 'round', step: 15, scale: 0.7, id: 'lwStR' });
        else { g += `<path d="M${a - 26} ${top + 6} L${cx} ${peak} L${b + 26} ${top + 6} Z" fill="${roofC}" ${O(5)}/>`;
          for (let i = 1; i < 4; i++) { const yy = peak + (top - peak) * i / 4, dx = ((b - a) / 2 + 26) * i / 4; g += `<path d="M${cx - dx} ${yy} H${cx + dx}" stroke="${K.ink}" stroke-width="2.5" opacity=".3"/>`; } }
        if (Kt.gutter) g += Kt.gutter(a - 18, b + 18, top + 10, a + 6, B - 40);
        if (X && X.extra) g += X.extra(a, b, top, O);
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
  /* 28.10 (art/styles-city-legend): залы новых стилей - стены, пол, вид за окном и убранство Ратуши (Аукциона, Ворот) - одной таблицей */
  const ROOMX = {
    veggies: { wall: '#c8894a', wallD: '#8a5a2b', floor: '#6a4a2a',
      back: (K) => { let d = ''; for (let x = 0; x <= 1920; x += 64) d += `M${x} 0 V900 `; let k = ''; for (let x = 32; x < 1920; x += 128) k += `M${x} ${80 + (x % 5) * 120} h0.1 M${x + 64} ${300 + (x % 7) * 70} h0.1 `;
        return `<path d="${d}" stroke="#8a5a2b" stroke-width="5"/><path d="${k}" stroke="#8a5a2b" stroke-width="12" stroke-linecap="round" opacity=".6"/><path d="M0 120 H1920" stroke="${K.ink}" stroke-width="22"/><path d="M0 120 H1920" stroke="#6a4420" stroke-width="16"/>`; },
      win: (x, y, O) => `<rect x="${x}" y="${y}" width="170" height="220" rx="12" fill="#1e1c40" ${O(6)}/><path d="M${x + 6} ${y + 214} Q${x + 60} ${y + 140} ${x + 164} ${y + 170} V${y + 214} Z" fill="#2e5232"/><circle cx="${x + 120}" cy="${y + 60}" r="22" fill="#f3efd8"/><path d="M${x + 85} ${y} V${y + 220} M${x} ${y + 110} H${x + 170}" stroke="#2b2118" stroke-width="6"/>`,
      plain: (O) => [300, 520, 1400, 1620].map((x, i) => `<path d="M${x} 120 V${200 + (i % 2) * 40}" stroke="#2b2118" stroke-width="3"/>` + [0, 1, 2, 3].map((k) => `<ellipse cx="${x + (k % 2 ? 10 : -10)}" cy="${222 + (i % 2) * 40 + k * 24}" rx="15" ry="17" fill="${i % 2 ? '#f3e6c8' : '#e8892a'}" ${O(3)}/>`).join('')).join('')
        + `<rect x="840" y="260" width="240" height="300" rx="10" fill="#e8b070" ${O(6)}/><rect x="862" y="282" width="196" height="256" fill="#fff3dc"/><path d="M960 330 q-40 120 0 180 q40 -60 0 -180 Z" fill="#ff9a2a" ${O(4)}/><path d="M960 330 q-20 -40 -40 -40 M960 330 q4 -44 26 -50 M960 330 q20 -30 46 -24" stroke="#4caf50" stroke-width="9" stroke-linecap="round" fill="none"/>`
        + [[560, 900], [640, 905], [1300, 900]].map(([x, y]) => `<path d="M${x - 40} ${y} q-8 -60 12 -84 q-8 -14 6 -18 h44 q14 4 6 18 q20 24 12 84 Z" fill="#d9c08a" ${O(4)}/><path d="M${x - 14} ${y - 84} q14 8 28 0" stroke="#2b2118" stroke-width="3" fill="none"/>`).join('') },
    '42brothers': { wall: '#2a1a3a', wallD: '#1e1230', floor: '#1c1022',
      back: (K) => `<path d="M0 160 H1920 M0 820 H1920" stroke="#ff5fa2" stroke-width="18" opacity=".28"/><path d="M0 160 H1920 M0 820 H1920" stroke="#ff5fa2" stroke-width="6"/><path d="M0 172 H1920" stroke="#5ad1ff" stroke-width="4"/>`
        + (() => { let d = ''; for (let x = 0; x <= 1920; x += 160) d += `M${x} 180 V810 `; return `<path d="${d}" stroke="#3a2a4a" stroke-width="10"/>`; })(),
      floor2: (K) => { let g = ''; for (let r = 0, y = 900; y < 1080; r++) { const h = 36 + r * 6; for (let c = 0, x = 0; x < 1920; c++, x += 120) if ((r + c) % 2) g += `M${x} ${y} h120 v${h} h-120 Z `; y += h; } return `<rect x="0" y="900" width="1920" height="180" fill="#f3efe6"/><path d="${g}" fill="#1c1022"/>`; },
      win: (x, y, O) => `<rect x="${x}" y="${y}" width="170" height="220" rx="12" fill="#14102a" ${O(6)}/>` + [[10, 90, 40], [56, 60, 34], [96, 110, 30], [130, 40, 34]].map(([a, h, w]) => `<rect x="${x + a}" y="${y + 220 - h - 40}" width="${w}" height="${h + 40}" fill="#2a1a3a"/><path d="M${x + a + 8} ${y + 230 - h} h8 M${x + a + 8} ${y + 250 - h} h8" stroke="#ffd76a" stroke-width="5"/>`).join('') + `<path d="M${x + 85} ${y} V${y + 220} M${x} ${y + 110} H${x + 170}" stroke="#1c1022" stroke-width="6"/>`,
      plain: (O) => neonL('M820 300 L780 380 H840 M840 300 V420', '#ff5fa2', 10) + neonL('M890 330 Q910 290 950 316 Q964 350 890 420 H960', '#ff5fa2', 10)
        + `<circle cx="1200" cy="140" r="56" fill="#c9ced6" ${O(5)}/>` + [0, 1, 2, 3].map((k) => `<path d="M${1144 + k * 28} ${100 + (k % 2) * 6} V${180 - (k % 2) * 6}" stroke="#8a8ea0" stroke-width="3"/>`).join('') + `<path d="M1200 0 V84" stroke="#1c1022" stroke-width="5"/>`
        + `<rect x="1460" y="760" width="300" height="100" rx="40" fill="#ff5fa2" ${O(6)}/><rect x="1440" y="700" width="60" height="160" rx="26" fill="#d84a8a" ${O(5)}/><rect x="1720" y="700" width="60" height="160" rx="26" fill="#d84a8a" ${O(5)}/><path d="M1480 900 v-40 M1740 900 v-40" stroke="#ffc83d" stroke-width="10"/>`
        + `<path d="M380 900 h80 l-10 -30 h-60 Z M400 870 v-60 h40 v60 M380 790 q0 -60 40 -60 q40 0 40 60 Z" fill="#ffc83d" ${O(4)}/>` },
    ugabugi: { wall: '#7a7468', wallD: '#5e584e', floor: '#8a6a48',
      back: (K) => { let d = ''; for (const [x, y, r] of [[120, 140, 60], [420, 300, 80], [760, 120, 70], [1100, 260, 90], [1460, 140, 70], [1760, 320, 80], [260, 600, 90], [960, 560, 70], [1640, 640, 80]]) d += `M${x - r} ${y} q${r * 0.3} ${-r * 0.9} ${r} ${-r * 0.75} q${r * 0.8} ${r * 0.1} ${r} ${r * 0.75} q${-r * 0.2} ${r * 0.8} ${-r} ${r * 0.7} q${-r * 0.9} ${-r * 0.1} ${-r} ${-r * 0.7} Z `;
        return `<path d="${d}" fill="#6a645a" stroke="#5e584e" stroke-width="4"/><g stroke="#c8643a" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"><path d="M560 420 q60 -60 160 -14 q30 14 14 74 M590 494 v56 M650 494 v56 M710 494 v56 M736 434 q44 14 34 74"/><path d="M1260 470 l30 -44 l30 44 M1290 426 v-44 M1276 516 l14 -44 l14 44"/></g>`; },
      win: (x, y, O) => `<path d="M${x} ${y + 220} V${y + 80} Q${x + 85} ${y - 20} ${x + 170} ${y + 80} V${y + 220} Z" fill="#1e1c40" ${O(6)}/><circle cx="${x + 120}" cy="${y + 80}" r="20" fill="#f3efd8"/><path d="M${x + 6} ${y + 220} L${x + 60} ${y + 150} L${x + 100} ${y + 180} L${x + 164} ${y + 140} V${y + 220} Z" fill="#3a352e"/>`,
      plain: (O) => `<path d="M680 160 q280 -60 560 0 l-40 60 q-240 -40 -480 0 Z" fill="#c9955a" ${O(5)}/>` + [740, 960, 1180].map((x) => `<circle cx="${x}" cy="${x === 960 ? 150 : 170}" r="10" fill="#f3e6c8" ${O(3)}/>`).join('')
        + [460, 1460].map((x) => `<circle cx="${x}" cy="420" r="90" fill="url(#rmGlow)"/><path d="M${x} 560 V440" stroke="#6a4420" stroke-width="14"/><path d="M${x} 450 c-22 -4 -24 -32 0 -60 c4 22 18 22 14 38 c10 0 8 18 -14 22 Z" fill="#ff8a2a" ${O(3)}/>`).join('')
        + `<g transform="translate(1600 900)"><path d="M-110 0 Q-120 -150 0 -170 Q120 -150 110 0 Z" fill="#f3e6c8" ${O(5)}/><circle cx="-40" cy="-100" r="20" fill="#2a1a12"/><circle cx="40" cy="-100" r="20" fill="#2a1a12"/><path d="M-60 -40 q-90 20 -80 -120 M60 -40 q90 20 80 -120" stroke="#2a1a12" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M-60 -40 q-90 20 -80 -120 M60 -40 q90 20 80 -120" stroke="#f3e6c8" stroke-width="14" fill="none" stroke-linecap="round"/></g>`   // череп мамонта
        + `<path d="M200 900 q60 -40 160 -20 q40 10 60 20 Z" fill="#c9955a" ${O(4)}/>` },
  };
  function room(style, kind) {
    let K = PAL[style] || PAL.legion;
    const HELL = !!K.hell, RX = ROOMX[style];
    if (HELL || RX) K = { ...K, line: K.ink };   // «Черти»: внутри - тёмный контур, как в Пекельной кузне и Гардеробе
    const O = (w = 5) => `stroke="${K.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const wall = RX ? RX.wall : HELL ? '#3a3346' : style === 'cats' ? '#b9845a' : style === 'monkeys' ? '#8a6a3c' : style === 'veggies' ? '#5a6a48' : '#3d3550';
    const wallD = RX ? RX.wallD : HELL ? '#2a2236' : style === 'cats' ? '#8a5a38' : style === 'monkeys' ? '#6e4a2f' : style === 'veggies' ? '#46543a' : '#2a2440';
    const floor = RX ? RX.floor : HELL ? '#2a1e22' : style === 'cats' ? '#c8664a' : style === 'monkeys' ? '#c99a5e' : '#6b4a2a';
    const txt = (x, y, t, size, fill = K.signTx) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="${fill}" stroke="${K.ink}" stroke-width="${Math.max(3, size / 7)}" paint-order="stroke" letter-spacing="3">${t}</text>`;
    const sign = (x, y, w, t) => `<rect x="${x - w / 2}" y="${y - 40}" width="${w}" height="80" rx="14" fill="${K.sign}" ${O(6)}/><rect x="${x - w / 2 + 10}" y="${y - 30}" width="${w - 20}" height="60" rx="9" fill="none" stroke="${K.signTx}" stroke-width="3"/>${txt(x, y + 16, t, 42)}`;
    let s = `<defs><radialGradient id="rmL" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>
      <radialGradient id="rmGlow"><stop offset="0" stop-color="#ffe59a" stop-opacity=".85"/><stop offset="1" stop-color="#ffbe5a" stop-opacity="0"/></radialGradient></defs>`;
    s += `<rect width="1920" height="1080" fill="${wall}"/>`;
    if (style === 'monkeys') for (let x = 0; x < 1920; x += 64) s += `<path d="M${x} 0 V900" stroke="${wallD}" stroke-width="5"/>`;
    else if (RX) s += RX.back(K);
    else if (K.iron) {   // «Черти»: чугунные листы на заклёпках, трубы под потолком с вентилем и манометром
      let d = '', r = ''; for (let x = 0; x <= 1920; x += 240) d += `M${x} 0 V900 `; for (let y = 0; y <= 900; y += 180) d += `M0 ${y} H1920 `;
      for (let x = 0; x <= 1920; x += 240) for (let y = 14; y < 900; y += 30) r += `M${x - 12} ${y} h0.1 M${x + 12} ${y} h0.1 `;
      s += `<path d="${d}" stroke="${wallD}" stroke-width="8"/><path d="${r}" stroke="#6a6480" stroke-width="7" stroke-linecap="round"/>`;
      s += `<path d="M0 40 H1920 M0 86 H1920" stroke="${K.ink}" stroke-width="30"/><path d="M0 40 H1920 M0 86 H1920" stroke="#8a4a2a" stroke-width="20"/><path d="M0 34 H1920 M0 80 H1920" stroke="#c87a4a" stroke-width="4" opacity=".6"/>`
        + [300, 1000, 1640].map((x) => `<rect x="${x - 16}" y="20" width="32" height="88" rx="6" fill="#5a5470" stroke="${K.ink}" stroke-width="4"/>`).join('')
        ;
    }
    else for (let r = 0; r < 15; r++) for (let c = 0; c < 18; c++) s += `<rect x="${c * 112 + (r % 2) * 56 - 30}" y="${r * 60}" width="104" height="52" rx="7" fill="none" stroke="${K.ink}" stroke-width="2" opacity="${HELL ? '.5' : '.2'}"/>`;
    s += `<rect width="1920" height="1080" fill="url(#rmL)"/>`;
    if (HELL) {   // пол: чугунная решётка над лавой
      s += `<rect x="0" y="900" width="1920" height="180" fill="#ff5a1a"/>`;
      let g = ''; for (let y = 900, i = 0; y < 1080; i++) { const h = 30 + i * 8; for (let x = -(i % 2) * 40; x < 1920; x += 80 + i * 6) g += `M${x + 6} ${y + 5} h${68 + i * 6} v${h - 10} h${-68 - i * 6} Z `; y += h; }
      s += `<path d="${g}" fill="#3a3346" stroke="${K.ink}" stroke-width="3"/><path d="M0 900 H1920" stroke="${K.line}" stroke-width="6"/>`;
    } else if (RX && RX.floor2) s += RX.floor2(K) + `<path d="M0 900 H1920" stroke="${K.line}" stroke-width="6"/>`;
    else {
      s += `<rect x="0" y="900" width="1920" height="180" fill="${floor}"/><path d="M0 900 H1920" stroke="${K.line}" stroke-width="6"/>`;
      for (let i = 0; i < 12; i++) s += `<path d="M${i * 170} 900 L${i * 170 - 60} 1080" stroke="${K.ink}" stroke-width="3" opacity=".35"/>`;
    }
    const STORAGE_SIGN_Y = 300;   // 23.10: центр вывески Склада в зале (верх таблички — на 40 выше)
    const lamp = (x) => `<circle cx="${x}" cy="200" r="120" fill="url(#rmGlow)"/><path d="M${x} 0 V150" stroke="${K.ink}" stroke-width="5"/><path d="M${x - 30} 150 h60 l-12 46 h-36 Z" fill="${K.glass}" ${O(4)}/>`;
    const win = (x, y) => RX ? RX.win(x, y, O) : HELL ? `<rect x="${x}" y="${y}" width="170" height="220" rx="12" fill="#6a1a18" ${O(6)}/><path d="M${x + 6} ${y + 214} L${x + 70} ${y + 120} L${x + 96} ${y + 140} L${x + 164} ${y + 214} Z" fill="#2a0d14"/><path d="M${x + 82} ${y + 130} l-6 40 l10 44" stroke="#ff7a1a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M${x + 85} ${y} V${y + 220} M${x} ${y + 110} H${x + 170}" stroke="${K.line}" stroke-width="6"/>`   // «Черти»: за окном - вулкан
      : `<rect x="${x}" y="${y}" width="170" height="220" rx="12" fill="#1e1c40" ${O(6)}/><path d="M${x + 85} ${y} V${y + 220} M${x} ${y + 110} H${x + 170}" stroke="${K.line}" stroke-width="6"/><circle cx="${x + 120}" cy="${y + 60}" r="22" fill="#f3efd8"/>`;
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
      if (HELL) for (const x of [1500, 1780]) s += `<ellipse cx="${x}" cy="598" rx="34" ry="9" fill="none" stroke="#ffd76a" stroke-width="7"/>` + [-1, 1].map((d) => `<path d="M${x + d * 50} 740 q${d * 60} -60 ${d * 40} -110 q${d * -10} 40 ${d * -40} 60 q${d * 20} 0 ${d * 0} 50 Z" fill="#f3efd8" stroke="${K.ink}" stroke-width="4"/>`).join('');   // «Черти»: чучела-ангелочки с нимбом и крылышками
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
    } else if (RX) {
      s += win(260, 160) + win(1480, 160) + lamp(960) + RX.plain(O);
      s += `<rect x="760" y="720" width="400" height="30" rx="8" fill="${K.wood}" ${O(5)}/><path d="M800 750 V900 M1120 750 V900" stroke="${K.woodD}" stroke-width="14"/><path d="M820 718 l20 -40 h60 l20 40 Z" fill="#f3efd8" ${O(4)}/>`;
    } else if (HELL) {
      // «Черти»: зал Ратуши - стяги с золотыми рогами, чугунная люстра с огнями, котёл-паровик
      const banner = (x) => `<path d="M${x - 70} 120 H${x + 70} V420 L${x} 380 L${x - 70} 420 Z" fill="#8a1424" ${O(5)}/><path d="M${x - 70} 120 H${x + 70}" stroke="#ffc83d" stroke-width="10"/>`
        + `<path d="M${x - 30} 250 q-26 -10 -24 -60 q10 34 34 44 Z M${x + 30} 250 q26 -10 24 -60 q-10 34 -34 44 Z" fill="#ffc83d" ${O(3)}/><circle cx="${x}" cy="262" r="26" fill="#ffc83d" ${O(3)}/><path d="M${x - 10} 258 h0.1 M${x + 10} 258 h0.1" stroke="${K.ink}" stroke-width="7" stroke-linecap="round"/>`;
      const flame = (x, y, k = 1) => `<path d="M${x} ${y} c${-14 * k} ${-3 * k} ${-16 * k} ${-22 * k} 0 ${-40 * k} c${3 * k} ${15 * k} ${13 * k} ${16 * k} ${10 * k} ${26 * k} c${6 * k} 0 ${5 * k} ${11 * k} ${-10 * k} ${14 * k} Z" fill="#ff9a2a" ${O(3)}/><path d="M${x} ${y - 3 * k} c${-6 * k} ${-3 * k} ${-6 * k} ${-13 * k} 0 ${-20 * k} c${5 * k} ${8 * k} ${6 * k} ${16 * k} 0 ${20 * k} Z" fill="#ffe27a"/>`;
      s += win(260, 160) + win(1480, 160) + banner(640) + banner(1280);
      s += `<circle cx="960" cy="230" r="170" fill="url(#rmGlow)"/><path d="M960 0 V150" stroke="${K.ink}" stroke-width="6"/><path d="M820 210 Q960 290 1100 210" stroke="${K.ink}" stroke-width="12" fill="none"/><path d="M820 210 Q960 290 1100 210" stroke="#5a5470" stroke-width="6" fill="none"/><path d="M960 150 L830 205 M960 150 L1090 205 M960 150 V252" stroke="${K.ink}" stroke-width="4"/>`
        + [830, 895, 960, 1025, 1090].map((x, i) => `<rect x="${x - 10}" y="${[200, 232, 246, 232, 200][i] - 24}" width="20" height="24" fill="#f3efd8" ${O(3)}/>` + flame(x, [200, 232, 246, 232, 200][i] - 24, 0.8)).join('');
      s += `<rect x="1460" y="560" width="300" height="340" rx="40" fill="#5a5470" ${O(6)}/><circle cx="1610" cy="730" r="70" fill="#ff7a1a" ${O(6)}/><circle cx="1610" cy="730" r="44" fill="#ffe27a"/><path d="M1540 730 h140 M1610 660 v140" stroke="${K.ink}" stroke-width="6"/><path d="M1560 560 V420 H1700 V0" stroke="${K.ink}" stroke-width="34" fill="none"/><path d="M1560 560 V420 H1700 V0" stroke="#8a4a2a" stroke-width="22" fill="none"/><circle cx="1500" cy="600" r="30" fill="#f3efd8" ${O(5)}/><path d="M1500 600 L1516 582" stroke="#c8102e" stroke-width="4" stroke-linecap="round"/>`;   // котёл-паровик с манометром
      s += `<rect x="740" y="720" width="440" height="34" rx="6" fill="#2a2236" ${O(5)}/><path d="M780 754 V900 M1140 754 V900" stroke="${K.ink}" stroke-width="18"/><path d="M780 754 V900 M1140 754 V900" stroke="#5a5470" stroke-width="10"/>`
        + `<path d="M820 718 l20 -40 h60 l20 40 Z" fill="#e8d0a0" ${O(4)}/><rect x="1060" y="680" width="22" height="40" fill="#f3efd8" ${O(3)}/>` + flame(1071, 680, 0.6) + `<path d="M960 720 V650 M940 650 h40" stroke="#ffc83d" stroke-width="8" stroke-linecap="round"/>`;   // стол: свёрток, свеча, печать-вилы
    } else {
      s += win(260, 160) + win(1480, 160) + lamp(960);
      s += `<rect x="760" y="720" width="400" height="30" rx="8" fill="${K.wood}" ${O(5)}/><path d="M800 750 V900 M1120 750 V900" stroke="${K.woodD}" stroke-width="14"/>`;
      s += `<path d="M820 718 l20 -40 h60 l20 40 Z" fill="#f3efd8" ${O(4)}/>`;   // свёрток чертежей
    }
    return s;
  }
  window.LGCityArt = { quarter, lower, room, PAL };
})();
