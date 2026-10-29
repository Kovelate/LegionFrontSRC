/* 23.10: «Города округов» — рисунок города по раскладке towngen.js (решение стримера 23.10, legacy/md/docs/CITY.md — «Города округов»).
   Вид зависит только от РАЗМЕРА (деревня ★1 / посёлок ★2 / столица) и ПРИРОДЫ округа (biome); стилей каналов здесь нет —
   здания, интерьеры и окна — те же, что у Ярмарки (city.js по id). Цвета природы — из палитр карты мира и «одёжки» сцен похода
   (quest/client/mapart.js BIOMES, biomeskin.js SKINS): луга — брёвна и солома; лёд и тайга — снег на крышах и сугробы; пустыня — глина,
   плоские крыши и навесы; пепел — чёрный камень и лавовые трещины; болото — сваи, сети, фонари; лес — дерево и мох; горы — каменные
   террасы; порча и руины — полуразрушенные дома. Деревня — дерево, заборы, тропинки, больше зелени; посёлок — камень снизу, мощёная улица, фонари.
   Только SVG-строки, без SMIL и без фильтров (картинку запекает citygl.js один раз). Фон режется на куски по 1024 px (плитка Pixi
   разбирает только свои куски). Частицы (снег, искры, светлячки, песок) — не здесь: city.js кладёт несколько точек с CSS-анимацией.
   window.LGTownArt.draw(L, o) → { sky, defs, layers: [{ x, w, svg }], props: [{ x, y, w, h, z, svg() }], fx, lv, blds, L } ; o.guy — человечек (кузнец).
   23.10 (вечер): уровни зданий 1–5 — рамки из towngen.js (L.fr, L.lv); o.levels — { id: 1…5 } поверх уровней раскладки (relevel);
   blds[id] = { x0, x1, svg, lv } — рисунок одного здания (витрина scripts/proto/buildings.html). */
(function (root) {
  'use strict';
  const INK = '#231c2e';
  // природа: небо, земля, дорога, материалы, деревья, частицы
  const BIO = {
    meadow: { sky: 'linear-gradient(#24305e 0%, #5a5c9a 42%, #e89a72 100%)', far: ['#6f8a6a', '#8fa86e'], back: 'hills', grass: '#9fb86a', grass2: '#87a35a', dirt: '#cdb07a', dirtD: '#a8895a', pave: '#a59c8c', paveD: '#857c70',
      wall: 'log', wood: '#b47a48', woodD: '#7a4e2a', stone: '#a29c8e', plaster: '#ecdcb6', roof: 'thatch', roofC: '#e0b456', roofD: '#a8832e', roof2: '#b5533c', tree: 'round', leaf: ['#5f8f3a', '#77a843', '#4a7a32'], fx: '' },
    forest: { sky: 'linear-gradient(#162a2e 0%, #2f5a4a 45%, #c8b46e 100%)', far: ['#2f5a3a', '#4a7a44'], back: 'woods', grass: '#7f9a52', grass2: '#6a8846', dirt: '#b08a5a', dirtD: '#8a6a40', pave: '#8f8a7c', paveD: '#706a5e',
      wall: 'plank', wood: '#9a6a3c', woodD: '#5e3e22', stone: '#8f8a7c', plaster: '#e2d2ac', roof: 'shingle', roofC: '#6a4a34', roofD: '#43301f', roof2: '#7a4a2a', moss: '#6a9a3a', tree: 'big', leaf: ['#3f7a34', '#558f3a', '#2f6a2e'], fx: 'firefly' },
    taiga: { sky: 'linear-gradient(#1c2640 0%, #4a6488 46%, #c8d6e4 100%)', far: ['#4a5e6a', '#6a8090'], back: 'pines', grass: '#a4ae8a', grass2: '#8e9a78', dirt: '#b8ad94', dirtD: '#968a72', pave: '#9a9a98', paveD: '#7a7a7c',
      wall: 'log', wood: '#8a5e3a', woodD: '#5a3a22', stone: '#9a9a98', plaster: '#e4dcc8', roof: 'shingle', roofC: '#5a4636', roofD: '#3a2a20', roof2: '#6a3a2a', snow: 0.6, tree: 'pine', leaf: ['#2f5a44', '#3e6a50', '#244a3a'], fx: 'snow' },
    ice: { sky: 'linear-gradient(#16223f 0%, #3e5c8c 46%, #dfe9f6 100%)', far: ['#9cb2cc', '#c4d4e6'], back: 'snowpeaks', grass: '#eef3f8', grass2: '#d6e2ee', dirt: '#cfdae6', dirtD: '#aebcd0', pave: '#b9c6d6', paveD: '#93a2b6',
      wall: 'log', wood: '#8a6446', woodD: '#5a3e2a', stone: '#9aa4b2', plaster: '#e8eef4', roof: 'shingle', roofC: '#4a5a7a', roofD: '#33405a', roof2: '#5a4a6a', snow: 1, tree: 'snowpine', leaf: ['#2f5a54', '#3e6a64', '#244a44'], fx: 'snow' },
    mount: { sky: 'linear-gradient(#1e2240 0%, #565a7e 45%, #dcc8a8 100%)', far: ['#6a6a86', '#8a8aa0'], back: 'mountains', grass: '#a8a48e', grass2: '#94907c', dirt: '#b4ae98', dirtD: '#8e8874', pave: '#8b8796', paveD: '#6a6676',
      wall: 'stone', wood: '#8a6440', woodD: '#5a3e26', stone: '#8f8a96', plaster: '#ddd2bc', roof: 'slate', roofC: '#4a5468', roofD: '#323a4a', roof2: '#6a4a3a', tree: 'pine', leaf: ['#3a5a44', '#4a6a50', '#2a4a3a'], fx: '', terraces: true },
    swamp: { sky: 'linear-gradient(#141e1a 0%, #3a4a36 46%, #a8a272 100%)', far: ['#4a5a3e', '#5e6e4a'], back: 'marsh', grass: '#7a8a5a', grass2: '#62714a', dirt: '#5e6a3e', dirtD: '#4a5530', pave: '#8a6a42', paveD: '#5e4528',
      wall: 'plank', wood: '#6e5a3a', woodD: '#45361f', stone: '#7a7a68', plaster: '#c8bc94', roof: 'reed', roofC: '#8a7e44', roofD: '#5e5528', roof2: '#6a6a3a', stilts: true, tree: 'dead', leaf: ['#5a6a3a', '#6a7a44', '#4a5a30'], fx: 'firefly', boardwalk: true },
    ash: { sky: 'linear-gradient(#120a0c 0%, #4a1a14 46%, #c8542a 100%)', far: ['#3a2a2a', '#4e3a34'], back: 'volcano', grass: '#4e4440', grass2: '#3a322f', dirt: '#5e5450', dirtD: '#463e3a', pave: '#5a5254', paveD: '#3e383a',
      wall: 'black', wood: '#5a3e30', woodD: '#3a2820', stone: '#2e2a30', plaster: '#5a4e4a', roof: 'iron', roofC: '#3a2c2c', roofD: '#241a1a', roof2: '#5a2a1e', lava: '#ff7a2a', tree: 'dead', leaf: ['#4a3a30'], fx: 'ember' },
    desert: { sky: 'linear-gradient(#2e2456 0%, #c2704a 52%, #ffd894 100%)', far: ['#d0a06a', '#e4b87e'], back: 'dunes', grass: '#e6c48a', grass2: '#d4ac6c', dirt: '#dcb880', dirtD: '#bf9a62', pave: '#d0b48a', paveD: '#ac9068',
      wall: 'clay', wood: '#9a6a3a', woodD: '#6a4424', stone: '#c49a6a', plaster: '#e8c08a', roof: 'flat', roofC: '#d4a06a', roofD: '#a8784a', roof2: '#3a7ab0', awning: ['#c8402a', '#f4e4c4'], tree: 'palm', leaf: ['#4f8f3a', '#6aa84a', '#3f7a34'], fx: 'sand' },
    coast: { sky: 'linear-gradient(#1e3a6a 0%, #6aa0cc 50%, #f6dcb4 100%)', far: ['#5a8ab0', '#8ab6d4'], back: 'sea', grass: '#d8cfa4', grass2: '#c4ba8c', dirt: '#d4c69c', dirtD: '#b4a67c', pave: '#c0b8a4', paveD: '#9a9282',
      wall: 'white', wood: '#8a6a4a', woodD: '#5a4430', stone: '#b4aea0', plaster: '#f2eee2', roof: 'shingle', roofC: '#3a6aa8', roofD: '#244a7a', roof2: '#c84a3a', tree: 'palm', leaf: ['#4f8f3a', '#6aa84a', '#3f7a34'], fx: '' },
    blight: { sky: 'linear-gradient(#100c16 0%, #2e2638 46%, #7e7086 100%)', far: ['#3a3446', '#4e4858'], back: 'spires', grass: '#5a5464', grass2: '#4a4454', dirt: '#6a6470', dirtD: '#4e4856', pave: '#64606c', paveD: '#48444e',
      wall: 'stone', wood: '#5e4a40', woodD: '#3a2c26', stone: '#6a6472', plaster: '#8a8290', roof: 'slate', roofC: '#3a3242', roofD: '#262030', roof2: '#4a2e3a', ruin: true, tree: 'dead', leaf: ['#4a4452'], fx: 'mote' },
    ruin: { sky: 'linear-gradient(#2a2030 0%, #80645a 50%, #e2caa2 100%)', far: ['#8a7a6a', '#a8987e'], back: 'hills', grass: '#b8a88a', grass2: '#a49476', dirt: '#c4b496', dirtD: '#a49478', pave: '#a8987a', paveD: '#887a60',
      wall: 'stone', wood: '#7a5a3a', woodD: '#4e3a26', stone: '#a8987a', plaster: '#d6c6a4', roof: 'shingle', roofC: '#8a5a3a', roofD: '#5e3e26', roof2: '#6a4a3a', ruin: true, tree: 'dead', leaf: ['#6a6a3a'], fx: '' },
  };
  const f1 = (v) => Math.round(v * 10) / 10, f2 = (v) => Math.round(v * 100) / 100;
  // 26.10 (art/buildings): смесь цветов и хэш-случайность для фактуры (своя, не трогает общий R: остальной рисунок города тот же)
  const hx = (c) => { const n = parseInt(String(c).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const hr = (a, b = 0) => { let t = Math.imul(Math.round(a) | 0, 374761393) ^ Math.imul(Math.round(b) | 0, 668265263); t = Math.imul(t ^ (t >>> 13), 1274126177); return ((t ^ (t >>> 16)) >>> 0) / 4294967296; };
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const O = (w = 4.5, c = INK) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const txt = (x, y, t, size, fill = '#ffd76a') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="${fill}" stroke="${INK}" stroke-width="${Math.max(3, size / 7).toFixed(1)}" paint-order="stroke" letter-spacing="2">${t}</text>`;

  function draw(L, o) {
    o = o || {};
    if ((!L.fr || o.levels) && root.LGTownGen) L = root.LGTownGen.relevel(L, o.levels || {});   // уровни зданий (towngen relevel): рамки и места клика
    // 28.10 (art/district-towns): ручная деревня - свой рисунок (packages/world/villages/<id>.js art): поправки природы, задний план, вода,
    // здания, мелочи; набор деталей kit - эти же функции (стены, крыши, окна, двери, вывески по уровню, деревья, символы)
    const HA = L.hand ? (root.LGVillages && root.LGVillages[L.hand] && root.LGVillages[L.hand].art) || {} : null;   // файла рисунка нет - здания генератора на местах ручной раскладки
    const K = HA && HA.K ? { ...(BIO[L.biome] || BIO.meadow), ...HA.K } : BIO[L.biome] || BIO.meadow, W = L.W, H = L.H, TOPH = 1080;
    let R = rng(L.seed ^ 0x5eed);
    const V = L.size === 'village', CAP = !!L.capital, SNOW = K.snow || 0, RUIN = !!K.ruin;
    const pick = (a) => a[Math.floor(R() * a.length)];
    // { x0, x1, y0, y1, svg } — фон по порядку (что раньше — то дальше); y0…y1 — по высоте (по умолчанию — верх сцены 0…1080:
    // небо, задний ряд, главная улица). 24.10: город выше 1080 — фон режется на куски по x и по высоте (плитка Pixi разбирает только свои)
    const pieces = [];
    let SLOT = null;   // 28.10: место в порядке рисования для рисунка ручной деревни (задний план, земля, здания) - заполняется позже, когда готов kit
    const P = (x0, x1, svg, y0 = 0, y1 = TOPH) => { (SLOT || pieces).push({ x0: x0 - 4, x1: x1 + 4, y0, y1, svg }); };
    const slots = {}, slot = (name) => { const q = { slot: name, list: [] }; slots[name] = q; pieces.push(q); };
    let defs = `<defs><radialGradient id="tgGlow"><stop offset="0" stop-color="#ffe59a" stop-opacity=".9"/><stop offset="1" stop-color="#ffbe5a" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="tgFire"><stop offset="0" stop-color="#ffd76a"/><stop offset=".5" stop-color="#ff7a2a" stop-opacity=".8"/><stop offset="1" stop-color="#ff3a1a" stop-opacity="0"/></radialGradient>`
      + `<linearGradient id="tgShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14112a" stop-opacity=".42"/><stop offset="1" stop-color="#14112a" stop-opacity="0"/></linearGradient>`
      + `<linearGradient id="tgShadeB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14112a" stop-opacity="0"/><stop offset="1" stop-color="#14112a" stop-opacity=".35"/></linearGradient>`
      + `<linearGradient id="tgWaterV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${L.biome === 'swamp' ? '#4a5a3a' : '#3a7ab8'}"/><stop offset=".5" stop-color="${L.biome === 'swamp' ? '#6a7a4a' : '#7ac0ec'}"/><stop offset="1" stop-color="${L.biome === 'swamp' ? '#4a5a3a' : '#3a7ab8'}"/></linearGradient>`
      + `<linearGradient id="tgWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.biome === 'swamp' ? '#4a5a3a' : L.biome === 'ash' ? '#ff9a3a' : '#3a7ab8'}"/><stop offset="1" stop-color="${L.biome === 'swamp' ? '#6a7a4a' : L.biome === 'ash' ? '#c83a1a' : '#7ac0ec'}"/></linearGradient></defs>`;

    /* ================= задний план: дали, ориентир особого места, земля за домами ================= */
    { // дальние холмы / горы / дюны / лес
      const [c1, c2] = K.far;
      if (HA && HA.far === false) { /* ручная деревня рисует дали сама (back) */ }
      else if (K.back === 'mountains' || K.back === 'snowpeaks' || K.back === 'volcano' || K.back === 'spires') {
        for (let x = -100; x < W + 200;) { const w = 260 + R() * 320, h = 180 + R() * 220, b = 640; const peak = x + w / 2 + (R() - 0.5) * 60;
          let g = `<path d="M${f1(x)} ${b} L${f1(peak)} ${f1(b - h)} L${f1(x + w)} ${b} Z" fill="${c1}"/>`;
          if (K.back === 'spires') g = `<path d="M${f1(peak - 30)} ${b} L${f1(peak - 12)} ${f1(b - h * 1.2)} L${f1(peak)} ${f1(b - h * 1.35)} L${f1(peak + 12)} ${f1(b - h * 1.2)} L${f1(peak + 30)} ${b} Z" fill="${c1}"/>`;
          if (K.back === 'snowpeaks' || K.back === 'mountains') g += `<path d="M${f1(peak - h * 0.28)} ${f1(b - h * 0.62)} L${f1(peak)} ${f1(b - h)} L${f1(peak + h * 0.3)} ${f1(b - h * 0.6)} l-24 14 l-20 -12 l-22 16 Z" fill="${K.back === 'snowpeaks' ? '#f4f8fc' : '#d8d4dc'}" opacity=".9"/>`;
          P(x, x + w, g); x += w * (0.5 + R() * 0.4); }
        if (K.back === 'volcano') { const vx = W * (0.3 + R() * 0.4); P(vx - 420, vx + 420, `<path d="M${f1(vx - 420)} 650 L${f1(vx - 70)} 300 H${f1(vx + 70)} L${f1(vx + 420)} 650 Z" fill="#2a1e1e"/><path d="M${f1(vx - 70)} 300 H${f1(vx + 70)} l-16 40 q-54 18 -40 70 q-10 -60 -50 -30 Z" fill="#ff6a2a" opacity=".85"/><ellipse cx="${f1(vx)}" cy="290" rx="120" ry="40" fill="url(#tgFire)" opacity=".7"/><path d="M${f1(vx - 20)} 280 q-60 -120 30 -200 q-40 90 40 140" fill="#4a3a3a" opacity=".55"/>`); }
      } else if (K.back === 'dunes') {
        for (let x = -200; x < W + 200;) { const w = 500 + R() * 400, h = 90 + R() * 90; P(x, x + w, `<path d="M${f1(x)} 660 Q${f1(x + w * 0.4)} ${f1(660 - h * 2)} ${f1(x + w)} 660 Z" fill="${R() < 0.5 ? c1 : c2}"/>`); x += w * 0.6; }
      } else if (K.back === 'sea') {
        P(0, W, `<rect x="0" y="520" width="${W}" height="140" fill="${c1}"/>` + Array.from({ length: Math.round(W / 160) }, (_, i) => `<path d="M${i * 160 + 20} ${f1(560 + (i % 3) * 22)} q20 -8 40 0" stroke="#e8f4fc" stroke-width="3" fill="none" opacity=".6"/>`).join(''));
      } else {
        for (let x = -150; x < W + 200;) { const w = 380 + R() * 380, h = 70 + R() * 110; P(x - w * 0.15, x + w * 1.15, `<ellipse cx="${f1(x + w / 2)}" cy="660" rx="${f1(w / 1.6)}" ry="${f1(h * 1.4)}" fill="${R() < 0.5 ? c1 : c2}"/>`); x += w * 0.55; }
        if (K.back === 'woods' || K.back === 'pines' || K.back === 'marsh') for (let x = -40; x < W + 60; x += 44 + R() * 40) {
          const h = 90 + R() * 90, b = 650 + R() * 20, c = K.back === 'marsh' ? '#3e4a34' : pick(['#2a4a36', '#33573e', '#244232']);
          P(x - 40, x + 40, K.back === 'woods' ? `<ellipse cx="${f1(x)}" cy="${f1(b - h * 0.6)}" rx="${f1(32 + R() * 18)}" ry="${f1(h * 0.55)}" fill="${c}"/>` : K.back === 'marsh' ? `<path d="M${f1(x)} ${f1(b)} V${f1(b - h)} M${f1(x)} ${f1(b - h * 0.6)} l-18 -22 M${f1(x)} ${f1(b - h * 0.4)} l16 -26" stroke="${c}" stroke-width="6" fill="none"/>`
            : `<path d="M${f1(x - 26)} ${f1(b)} L${f1(x)} ${f1(b - h)} L${f1(x + 26)} ${f1(b)} Z" fill="${c}"/>${SNOW ? `<path d="M${f1(x - 9)} ${f1(b - h * 0.62)} L${f1(x)} ${f1(b - h)} L${f1(x + 9)} ${f1(b - h * 0.62)} Z" fill="#f4f8fc" opacity=".85"/>` : ''}`);
        }
      }
      // ориентир особого места (за городом): чёрная башня, Древо мира, пирамиды, кости великана
      const sp = HA && HA.landmark === false ? null : L.special;   // 28.10: ручная деревня может рисовать ориентир сама (art.landmark = false)
      if (sp === 'blacktower') { const tx = W * 0.62; P(tx - 160, tx + 160, `<path d="M${tx - 90} 660 L${tx - 60} 120 L${tx - 90} 120 L${tx - 40} 40 L${tx} 0 L${tx + 40} 40 L${tx + 90} 120 L${tx + 60} 120 L${tx + 90} 660 Z" fill="#141018"/><rect x="${tx - 12}" y="200" width="24" height="40" fill="#b06aff" opacity=".8"/><rect x="${tx - 30}" y="360" width="16" height="30" fill="#b06aff" opacity=".6"/><ellipse cx="${tx}" cy="60" rx="70" ry="30" fill="#b06aff" opacity=".18"/>`); }
      if (sp === 'worldtree') { const tx = W * 0.55; P(tx - 900, tx + 900, `<path d="M${tx - 70} 680 Q${tx - 50} 420 ${tx - 150} 300 M${tx + 70} 680 Q${tx + 40} 440 ${tx + 170} 310 M${tx} 680 V260" stroke="#4a3626" stroke-width="80" fill="none" stroke-linecap="round"/>` + Array.from({ length: 14 }, (_, i) => `<ellipse cx="${f1(tx - 800 + i * 123 + (R() - 0.5) * 60)}" cy="${f1(250 + (i % 3) * 40 + R() * 30)}" rx="${f1(150 + R() * 80)}" ry="${f1(80 + R() * 30)}" fill="${['#2f5a44', '#3e6a50', '#4a7a5a'][i % 3]}"/>`).join('') + Array.from({ length: 18 }, () => `<ellipse cx="${f1(tx - 760 + R() * 1520)}" cy="${f1(210 + R() * 120)}" rx="${f1(30 + R() * 30)}" ry="12" fill="#f4f8fc" opacity=".75"/>`).join('')); }
      if (sp === 'pyramids') for (const [px, ph] of [[W * 0.3, 360], [W * 0.5, 460], [W * 0.66, 300]]) P(px - ph, px + ph, `<path d="M${f1(px - ph)} 660 L${f1(px)} ${660 - ph} L${f1(px + ph)} 660 Z" fill="#d8a86a"/><path d="M${f1(px)} ${660 - ph} L${f1(px + ph)} 660 H${f1(px + ph * 0.25)} Z" fill="#b8884e"/>`);
      if (sp === 'bones') { const bx = W * 0.58; P(bx - 700, bx + 700, Array.from({ length: 9 }, (_, i) => { const x = bx - 560 + i * 140, h = 300 - Math.abs(i - 4) * 30; return `<path d="M${x} 660 Q${x - 60} ${660 - h} ${x + 40} ${660 - h * 1.1}" stroke="#efe4cc" stroke-width="26" fill="none" stroke-linecap="round"/>`; }).join('') + `<path d="M${bx - 640} 640 Q${bx} 560 ${bx + 640} 640" stroke="#e4d8bc" stroke-width="34" fill="none"/><ellipse cx="${bx + 720}" cy="600" rx="110" ry="80" fill="#efe4cc"/><circle cx="${bx + 700}" cy="590" r="22" fill="#3a2a20"/>`); }
      if (HA) slot('back');   // 28.10: задний план ручной деревни (ориентир, свои дали) - перед землёй за домами
      // горные террасы за домами
      if (K.terraces) for (let i = 0; i < 2; i++) { const y = 600 + i * 60; P(0, W, `<rect x="0" y="${y}" width="${W}" height="56" fill="${i ? '#7a7684' : '#6a6676'}" ${O(4)}/>` + Array.from({ length: Math.round(W / 90) }, (_, k) => `<rect x="${k * 90 + (i % 2) * 45}" y="${y + 8}" width="80" height="40" rx="5" fill="none" stroke="${INK}" stroke-width="2" opacity=".25"/>`).join('')); }
      // земля за домами (между дальними холмами и полосой)
      P(0, W, `<rect x="0" y="${K.terraces ? 716 : 640}" width="${W}" height="${K.terraces ? 100 : 170}" fill="${K.grass2}"/>`);
      // частокол / стена города за домами
      // 23.10: частокол — с тёмной обводкой и перекладиной (без неё при мелкой сцене колья сливались в тонкую полоску)
      // 24.10 (снимок стримера: ручей упирался в частокол плоским краем): ручей течёт из-за города — от холмов (сужается вдаль),
      // частокол расступается (два столба у воды), в каменной стене — арка-водосток, вода проходит под ней
      const RV = L.river, rx0 = RV ? RV.x - RV.w / 2 : 0, rx1 = RV ? RV.x + RV.w / 2 : 0;
      // 24.10 (снимок стримера: верх ручья торчал голубым шипом над частоколом): ручей начинается из пруда-родника за частоколом
      // (деревня; пруд в траве, с бережком и камышом) или из-под стены (посёлок — вода видна только в арке-водостоке)
      if (RV) {
        let g = `<rect x="${rx0 - 6}" y="704" width="${RV.w + 12}" height="66" fill="${K.dirtD}"/><rect x="${rx0}" y="704" width="${RV.w}" height="66" fill="url(#tgWaterV)"/>`;
        if (V) g += `<ellipse cx="${RV.x}" cy="704" rx="${f1(RV.w * 0.95 + 8)}" ry="20" fill="${K.dirtD}"/><ellipse cx="${RV.x}" cy="704" rx="${f1(RV.w * 0.95)}" ry="15" fill="url(#tgWaterV)" ${O(3)}/><path d="M${f1(RV.x - RV.w * 0.5)} 702 q12 -5 24 0" stroke="#e8f8ff" stroke-width="3" fill="none" opacity=".7"/>`
          + `<path d="M${f1(RV.x - RV.w - 4)} 708 q-2 -22 -8 -34 M${f1(RV.x - RV.w + 6)} 706 q2 -20 6 -30 M${f1(RV.x + RV.w)} 708 q2 -20 10 -30" stroke="${L.biome === 'swamp' ? '#6a7a3a' : K.grass2}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
        P(rx0 - RV.w - 20, rx1 + RV.w + 20, g, 640, 780);
      }
      if (HA && HA.fence === false) { /* у ручной деревни своя ограда (или её нет) */ }
      else if (V) {
        for (let x = 0; x < W; x += 24) { if (RV && x + 22 > rx0 - 10 && x < rx1 + 10) continue; P(x, x + 22, `<path d="M${x + 2} 742 V${f1(690 + R() * 10)} l9 -12 l9 12 V742 Z" fill="${K.woodD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" opacity=".85"/>`); }
        const rails = RV ? [[0, rx0 - 14], [rx1 + 14, W]] : [[0, W]];
        for (const [a, b] of rails) P(a, b, `<rect x="${f1(a)}" y="716" width="${f1(b - a)}" height="8" fill="${K.wood}" stroke="${INK}" stroke-width="3" opacity=".85"/>`);
        if (RV) for (const px of [rx0 - 16, rx1 + 4]) P(px, px + 12, `<rect x="${f1(px)}" y="682" width="12" height="64" rx="3" fill="${K.woodD}" ${O(3)}/>`);
      } else {
        P(0, W, `<rect x="0" y="664" width="${W}" height="90" fill="${K.stone}" ${O(4)}/>` + Array.from({ length: Math.round(W / 64) }, (_, k) => `<rect x="${k * 64}" y="644" width="40" height="26" fill="${K.stone}" ${O(3)}/>`).join(''));
        if (RV) P(rx0 - 20, rx1 + 20, `<path d="M${rx0 - 8} 755 V714 A${f1(RV.w / 2 + 8)} 34 0 0 1 ${rx1 + 8} 714 V755 Z" fill="#2a2030" ${O(4)}/><rect x="${rx0}" y="728" width="${RV.w}" height="27" fill="url(#tgWaterV)"/><path d="M${rx0 - 8} 714 A${f1(RV.w / 2 + 8)} 34 0 0 1 ${rx1 + 8} 714" fill="none" stroke="${K.stone}" stroke-width="9"/><path d="M${rx0 - 14} 714 A${f1(RV.w / 2 + 14)} 40 0 0 1 ${rx1 + 14} 714" fill="none" stroke="${INK}" stroke-width="3"/>`
          + Array.from({ length: 4 }, (_, i) => `<path d="M${f1(rx0 + 8 + i * (RV.w - 16) / 3)} 714 V744" stroke="#5a5462" stroke-width="5"/>`).join(''), 640, 760);
      }
    }

    /* ================= земля города: трава / снег / песок, улицы, площади, тропинки, ручей и мосты =================
       24.10: одна сплошная локация — главная улица у зданий, ниже площади, поперечные улицы и бульвар (towngen.js L.roads, L.plazas). */
    const GY = TOPH;   // граница кусков по высоте
    P(0, W, `<rect x="0" y="760" width="${W}" height="${GY - 760 + 4}" fill="${K.grass}"/><rect x="0" y="760" width="${W}" height="60" fill="url(#tgShade)"/>`);
    P(0, W, `<rect x="0" y="${GY - 4}" width="${W}" height="${H - GY + 4}" fill="${K.grass}"/><rect x="0" y="${H - 70}" width="${W}" height="70" fill="url(#tgShadeB)"/>`, GY, H);
    // крапинки земли — одним путём на кусок 512 px (на рисунок — сотни мелочей, а элементов SVG — единицы)
    {
      const n = Math.round(W * (H - 810) / 3800);
      const by = new Map();
      for (let i = 0; i < n; i++) {
        const x = R() * W, y = 810 + R() * (H - 820), key = Math.floor(x / 512) + ':' + (y < GY ? 0 : 1);
        let d = by.get(key) || '';
        if (SNOW >= 1) { const rx = 10 + R() * 16; d += `M${f1(x - rx)} ${f1(y)}h${f1(rx * 2)}`; }
        else if (L.biome === 'desert') d += `M${f1(x - 18)} ${f1(y)}q18 -6 36 0`;
        else d += `M${f1(x)} ${f1(y)}l-4 -10M${f1(x + 5)} ${f1(y)}l2 -12M${f1(x + 10)} ${f1(y)}l5 -9`;
        by.set(key, d);
      }
      for (const [key, d] of by) {
        const [c, b] = key.split(':').map(Number), x0 = c * 512;
        const st = SNOW >= 1 ? 'stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".7"' : L.biome === 'desert' ? `stroke="${K.dirtD}" stroke-width="2.5" fill="none" opacity=".6"` : `stroke="${K.grass2}" stroke-width="3" opacity=".8"`;
        P(x0 - 20, x0 + 532, `<path d="${d}" ${st}/>`, b ? GY : 800, b ? H : GY);
      }
    }
    // лавовые трещины (пепел) — светятся, но по ним ходят (это земля)
    if (K.lava) for (let i = 0; i < W * (H - 900) / 160000; i++) { const x = R() * W, y = 960 + R() * (H - 1000); let d = `M${f1(x)} ${f1(y)}`; for (let k = 0; k < 5; k++) d += ` l${f1(20 + R() * 30)} ${f1((R() - 0.5) * 18)}`; P(x - 10, x + 200, `<path d="${d}" stroke="#ff7a2a" stroke-width="5" fill="none" opacity=".85"/><path d="${d}" stroke="#ffd76a" stroke-width="2" fill="none"/>`, y - 40, y + 40); }
    // улицы: деревня — утоптанная земля, посёлок — мостовая (болото — дощатый настил); ширина — своя у каждой (towngen pathW)
    const col = K.boardwalk ? K.pave : V ? K.dirt : K.pave, colD = K.boardwalk ? K.paveD : V ? K.dirtD : K.paveD;
    const line = (pts) => 'M' + pts.map((p) => `${p[0]} ${p[1]}`).join(' L');
    const ybox = (a, b, m) => [Math.min(a[1], b[1]) - m, Math.max(a[1], b[1]) + m];
    /* 24.10 (просьба стримера): улицы, тропинки и мощёные площади — ОДНА сплошная мостовая: сначала бордюр всех кусков (снизу), потом
       заливка всех кусков поверх — внутри мостовой ни контуров, ни круглых «таблеток» на стыках; на стыках тропинок и поперечных улиц
       с улицей — плавные скругления (fillet). Лужайка (деревня) — под улицами (улица идёт поверх неё). */
    {
      const segs = [];
      for (const r of L.roads) for (let i = 1; i < r.pts.length; i++) segs.push({ a: r.pts[i - 1], b: r.pts[i], w: r.w });
      for (const p of L.plazas) if (p.k === 'green') {   // лужайка — под улицами, без обводки; утоптанная дорожка по кругу
        const g = `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.rx}" ry="${p.ry}" fill="${K.grass2}"/><ellipse cx="${p.x}" cy="${p.y}" rx="${f1(p.rx * 0.82)}" ry="${f1(p.ry * 0.82)}" fill="none" stroke="${K.dirt}" stroke-width="22"/>`;
        P(p.x - p.rx - 10, p.x + p.rx + 10, g, p.y - p.ry - 10, p.y + p.ry + 10);
      }
      // скругления стыков: ветка (полуширина w) подходит к краю улицы ye с направления dir (−1 — сверху, +1 — снизу)
      const FR = 24, flares = [];
      if (L.flares) flares.push(...L.flares);   // 28.10: ручная деревня - стыки посчитаны в раскладке
      else for (const sp of L.spurs) { const x = sp[1][0], ye = sp[1][1] - L.pathW.road + 2; flares.push({ x, ye, w: L.pathW.spur, dir: -1 }); }
      if (!L.flares) for (const r of L.roads) if (r.k === 'cross') { const P0 = r.pts[0], P1 = r.pts[r.pts.length - 1]; flares.push({ x: P0[0], ye: P0[1] + L.pathW.road - 2, w: r.w, dir: 1 }, { x: P1[0], ye: P1[1] - L.pathW.boul + 2, w: r.w, dir: -1 }); }
      const flareD = (f) => { const { x, ye, w, dir } = f, e = ye - dir * 14; return `M${f1(x - w - FR)} ${f1(e)}V${f1(ye)}Q${f1(x - w)} ${f1(ye)} ${f1(x - w)} ${f1(ye + dir * FR)}H${f1(x + w)}Q${f1(x + w)} ${f1(ye)} ${f1(x + w + FR)} ${f1(ye)}V${f1(e)}Z`; };
      const paved = L.plazas.filter((p) => p.k !== 'green');
      const pshape = (p, d, fill, extra = '') => p.shape === 'rect' ? `<rect x="${f1(p.x - p.rx - d)}" y="${f1(p.y - p.ry - d)}" width="${f1((p.rx + d) * 2)}" height="${f1((p.ry + d) * 2)}" rx="${f1(Math.min(90, p.ry * 0.5) + d)}" fill="${fill}" ${extra}/>` : `<ellipse cx="${p.x}" cy="${p.y}" rx="${f1(p.rx + d)}" ry="${f1(p.ry + d)}" fill="${fill}" ${extra}/>`;
      for (const pass of [0, 1]) {   // 0 — бордюр (шире на 5 px с каждой стороны), 1 — заливка
        const c = pass ? col : colD, add = pass ? 0 : 10;
        for (const r of L.roads) { const xs = r.pts.map((q) => q[0]), ys = r.pts.map((q) => q[1]); P(Math.min(...xs) - r.w, Math.max(...xs) + r.w, `<path d="${line(r.pts)}" stroke="${c}" stroke-width="${r.w * 2 + add}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, Math.min(...ys) - r.w - 8, Math.max(...ys) + r.w + 8); }
        for (const sp of L.spurs) { const [y0, y1] = ybox(sp[0], sp[1], L.pathW.spur + 8); P(sp[0][0] - L.pathW.spur, sp[0][0] + L.pathW.spur, `<path d="${line(sp)}" stroke="${c}" stroke-width="${L.pathW.spur * 2 + add}" fill="none" stroke-linecap="round"/>`, y0, y1); }
        for (const f of flares) P(f.x - f.w - FR - 8, f.x + f.w + FR + 8, `<path d="${flareD(f)}" fill="${c}"${pass ? '' : ` stroke="${c}" stroke-width="10" stroke-linejoin="round"`}/>`, f.ye - 40, f.ye + 40);
        for (const p of paved) P(p.x - p.rx - 20, p.x + p.rx + 20, pshape(p, pass ? 0 : 5, c), p.y - p.ry - 12, p.y + p.ry + 12);
      }
      // фактура: камни мостовой / доски / колеи — одним путём на отрезок
      for (const s of segs) {
        if (s.w === L.pathW.spur) continue;
        const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        const n = Math.round(len / (K.boardwalk ? 26 : V ? 60 : 34));
        let d = '';
        for (let k = 0; k < n; k++) {
          const t = (k + R() * 0.5) / n, x = s.a[0] + dx * t, y = s.a[1] + dy * t;
          if (K.boardwalk) d += `M${f1(x + nx * s.w)} ${f1(y + ny * s.w)}L${f1(x - nx * s.w)} ${f1(y - ny * s.w)}`;
          else if (V) { const l = 30 + R() * 30; d += `M${f1(x - nx * s.w * 0.4)} ${f1(y - ny * s.w * 0.4)}l${f1(ux * l)} ${f1(uy * l)}M${f1(x + nx * s.w * 0.45 + ux * 10)} ${f1(y + ny * s.w * 0.45 + uy * 10)}l${f1(ux * l)} ${f1(uy * l)}`; }
          else for (const o of [-0.6, 0, 0.6]) { const cx = x + nx * s.w * o + ux * o * 12, cy = y + ny * s.w * o + uy * o * 12, l = 6 + R() * 5; d += `M${f1(cx - ux * l)} ${f1(cy - uy * l)}l${f1(ux * l * 2)} ${f1(uy * l * 2)}`; }
        }
        const [y0, y1] = ybox(s.a, s.b, s.w + 8);
        const st = K.boardwalk ? `stroke="${colD}" stroke-width="3"` : V ? `stroke="${colD}" stroke-width="3" opacity=".55"` : `stroke="${colD}" stroke-width="11" stroke-linecap="round" opacity=".5"`;
        P(Math.min(s.a[0], s.b[0]) - s.w, Math.max(s.a[0], s.b[0]) + s.w, `<path d="${d}" ${st} fill="none"/>`, y0, y1);
        if (SNOW && Math.abs(dx) > Math.abs(dy)) P(Math.min(s.a[0], s.b[0]), Math.max(s.a[0], s.b[0]), `<path d="${line([[s.a[0], s.a[1] - s.w + 4], [s.b[0], s.b[1] - s.w + 4]])}" stroke="#ffffff" stroke-width="7" opacity=".8" fill="none"/>`, y0, y1);
      }
    }
    // площади: узор мощения (кольца, камни, лучи) поверх общей мостовой
    for (const p of L.plazas) {
      const { x, y, rx, ry } = p, rect = p.shape === 'rect';
      const shape = (dx, dy, fill, extra = '') => rect ? `<rect x="${f1(x - rx - dx)}" y="${f1(y - ry - dy)}" width="${f1((rx + dx) * 2)}" height="${f1((ry + dy) * 2)}" rx="${f1(Math.max(6, Math.min(90, ry * 0.5) + dx))}" fill="${fill}" ${extra}/>` : `<ellipse cx="${x}" cy="${y}" rx="${f1(rx + dx)}" ry="${f1(ry + dy)}" fill="${fill}" ${extra}/>`;
      if (p.k === 'green') continue;   // лужайка — под улицами (выше)
      const pvD = V ? K.dirtD : K.paveD;
      let g = '';   // мостовая площади — в общей заливке с улицами (выше); здесь только узор
      {
        for (const k of [0.78, 0.52]) g += shape(-rx * (1 - k), -ry * (1 - k), 'none', `stroke="${pvD}" stroke-width="${V ? 5 : 7}" opacity=".55"`);
        // камни мощения — короткими штрихами одним путём
        let d = ''; const n = Math.round(rx * ry / (V ? 2600 : 1500));
        for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.95, cx = x + Math.cos(a) * rx * rr, cy = y + Math.sin(a) * ry * rr; d += `M${f1(cx - 7)} ${f1(cy)}h14`; }
        g += `<path d="${d}" stroke="${pvD}" stroke-width="9" stroke-linecap="round" opacity=".38" fill="none"/>`;
        if (!V && p.k !== 'market') { let rd = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; rd += `M${f1(x + Math.cos(a) * rx * 0.3)} ${f1(y + Math.sin(a) * ry * 0.3)}L${f1(x + Math.cos(a) * rx * 0.5)} ${f1(y + Math.sin(a) * ry * 0.5)}`; } g += `<path d="${rd}" stroke="${pvD}" stroke-width="5" opacity=".45"/>`; }
      }
      if (SNOW >= 1) g += shape(-rx * 0.06, -ry * 0.06, 'none', 'stroke="#ffffff" stroke-width="9" opacity=".55"');
      P(x - rx - 20, x + rx + 20, g, y - ry - 12, y + ry + 12);
    }
    if (HA) slot('ground');   // 28.10: вода, берега, своя земля ручной деревни - поверх улиц, под мостами и зданиями
    // ручей сверху донизу (вода — не ходят; мосты — там, где его пересекает улица)
    for (const w of L.water) if (w.k === 'brook') {
      const x0 = w.x - w.w / 2, x1 = w.x + w.w / 2;
      for (const [b0, b1] of [[756, GY], [GY, H]]) {
        const top = b0 === 756;
        let g = top ? `<rect x="${x0 - 6}" y="756" width="${w.w + 12}" height="${b1 + 30 - 756}" fill="${K.dirtD}"/><rect x="${x0}" y="756" width="${w.w}" height="${b1 + 30 - 756}" fill="url(#tgWaterV)"/><path d="M${x0} 756 V${b1 + 30} M${x1} 756 V${b1 + 30}" stroke="${INK}" stroke-width="3"/>`
          : `<rect x="${x0 - 6}" y="${b0 - 2}" width="${w.w + 12}" height="${b1 - b0 + 2}" fill="${K.dirtD}"/><rect x="${x0}" y="${b0 - 2}" width="${w.w}" height="${b1 - b0 + 2}" fill="url(#tgWaterV)"/><path d="M${x0} ${b0 - 2} V${b1} M${x1} ${b0 - 2} V${b1}" stroke="${INK}" stroke-width="3"/>`;
        let d = ''; for (let y = (top ? 776 : b0 + 20); y < b1; y += 40) d += `M${f1(x0 + 14 + R() * 20)} ${y}q10 -6 20 0`;
        g += `<path d="${d}" stroke="#e8f8ff" stroke-width="3" fill="none" opacity=".6"/>`;
        if (SNOW >= 1) g += `<path d="M${x0} ${b0} V${b1} M${x1} ${b0} V${b1}" stroke="#ffffff" stroke-width="10" opacity=".8"/>`;
        P(x0 - 10, x1 + 10, g, b0, b1);
      }
    }
    // 28.10: пруды и лужи ручной деревни (вода-эллипс; своя вода - art.water, у неё w.art)
    if (L.hand) for (const w of L.water) if (w.e && !w.art) {
      const [cx, cy, rx, ry] = w.e;
      let g = `<ellipse cx="${cx}" cy="${cy}" rx="${rx + 10}" ry="${ry + 7}" fill="${K.dirtD}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#tgWater)" ${O(3)}/><path d="M${f1(cx - rx * 0.4)} ${f1(cy - 4)} q14 -6 28 0 M${f1(cx + rx * 0.1)} ${f1(cy + ry * 0.3)} q12 -5 24 0" stroke="#e8f8ff" stroke-width="3" fill="none" opacity=".6"/>`;
      if (L.biome === 'swamp') g += `<ellipse cx="${f1(cx + rx * 0.3)}" cy="${f1(cy + 4)}" rx="14" ry="5" fill="#5a8a3a"/><ellipse cx="${f1(cx - rx * 0.5)}" cy="${f1(cy + 2)}" rx="10" ry="4" fill="#6a9a44"/>`;
      if (SNOW >= 1) g = g.replace('url(#tgWater)', '#cfe6f4');
      P(cx - rx - 20, cx + rx + 20, g, cy - ry - 20, cy + ry + 20);
    }
    for (const b of L.bridges) {
      let g = `<rect x="${b.x0}" y="${b.y0 - 6}" width="${b.x1 - b.x0}" height="${b.y1 - b.y0 + 12}" rx="8" fill="${K.wood}" ${O(4)}/>`;
      let d = ''; for (let x = b.x0 + 14; x < b.x1; x += 16) d += `M${x} ${b.y0}V${b.y1}`;
      g += `<path d="${d}" stroke="${K.woodD}" stroke-width="2.5" opacity=".7"/>`;
      // 23.10: перила моста — брус с обводкой и столбики с шапками (тонкая линия при мелкой сцене пропадала)
      for (const ry of [b.y0 - 10, b.y1 + 2]) {
        g += `<rect x="${b.x0 + 2}" y="${ry}" width="${b.x1 - b.x0 - 4}" height="10" rx="4" fill="${K.woodD}" stroke="${INK}" stroke-width="4"/>`;
        const n = Math.max(1, Math.round((b.x1 - b.x0 - 16) / 56));
        for (let k = 0; k <= n; k++) { const px = f1(b.x0 + 8 + k * (b.x1 - b.x0 - 16) / n); g += `<rect x="${f1(px - 7)}" y="${ry - 12}" width="14" height="22" rx="3" fill="${K.wood}" stroke="${INK}" stroke-width="4"/><rect x="${f1(px - 9)}" y="${ry - 17}" width="18" height="8" rx="3" fill="${K.woodD}" stroke="${INK}" stroke-width="3.5"/>`; }
      }
      if (SNOW) g += `<path d="M${b.x0 + 4} ${b.y0 - 8} H${b.x1 - 4}" stroke="#ffffff" stroke-width="5"/>`;
      P(b.x0, b.x1, g, b.y0 - 30, b.y1 + 20);
    }

    /* ================= материалы домов =================
       26.10 (art/buildings, просьба стримера: здания — так же подробно, как мостовая и кладка Ярмарки после PR #62): детали — символы
       <symbol> + <use> (одинаковые — один символ, в куске фона — только те, на которые он ссылается): кладка блоками разного тона со
       светлой кромкой и щербинами, брёвна с волокнами, сучками и торцами-кольцами, доски с гвоздями, штукатурка с пятнами и проступившим
       кирпичом, черепица / дранка / солома / тростник / железо рядами, рамы, ставни, подоконники, двери из досок с петлями, заклёпки вывесок,
       водостоки, трубы с кладкой, бочки, ящики, кашпо, поленница, мох и снег по природе. Без фильтров и анимаций (citygl.js печёт один раз). */
    const SYM = new Map();
    const sym = (name, make) => { const id = 'tgS' + name.replace(/[^a-zA-Z0-9]/g, ''); if (!SYM.has(id)) SYM.set(id, `<symbol id="${id}" overflow="visible">${make()}</symbol>`); return id; };
    const use = (id, x, y, sx = 1, sy = sx) => `<use href="#${id}" transform="translate(${f1(x)} ${f1(y)})${sx !== 1 || sy !== 1 ? ` scale(${f2(sx)} ${f2(sy)})` : ''}"/>`;
    // defs куска фона: градиенты — если на них ссылаются, символы — только упомянутые (и то, на что ссылаются они сами)
    const docDefs = (svg) => {
      const ids = new Set(), scan = (t) => { for (const m of t.matchAll(/href="#(tgS[^"]+)"/g)) if (!ids.has(m[1]) && SYM.has(m[1])) { ids.add(m[1]); scan(SYM.get(m[1])); } };
      scan(svg); const ss = [...ids].map((i) => SYM.get(i)).join('');
      return ss || /url\(#tg/.test(svg) ? defs.replace('</defs>', ss + '</defs>') : '';
    };
    // обрезка по форме: id — по самой форме (одинаковая форма — тот же id; на витрине несколько рисунков на одной странице — без путаницы)
    const clipId = (d) => { let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d.charCodeAt(i), 16777619); return 'tgC' + (h >>> 0).toString(36); };
    const LT = (c, k = 0.16) => mix(c, '#ffffff', k), DK = (c, k = 0.18) => mix(c, INK, k);
    // кладка 112×68 (два ряда блоков вперевязку): тона блоков, светлая кромка сверху, щербины; black — базальт с лавовыми швами
    const stoneTile = (c, v, black) => sym(`stn${c}${v}${black ? 'b' : ''}`, () => {
      const r = rng(501 + v * 71); let a = '', b = '', d = '', hi = '', cr = '';
      for (let row = 0; row < 2; row++) { let x = row ? -20 - r() * 14 : 0; const y = row * 34;
        while (x < 112) { let w = 30 + r() * 26; if (x + w > 112) w = 112 - x; if (w < 10) break; const sx = Math.max(0, x), sw = Math.min(x + w, 112) - sx;
          const p = `M${f1(sx + 2)} ${f1(y + 2)} H${f1(sx + sw - 2)} V${f1(y + 32)} H${f1(sx + 2)} Z `, t = r(); if (t < 0.25) b += p; else if (t < 0.45) d += p; else a += p;
          hi += `M${f1(sx + 5)} ${f1(y + 6)} H${f1(sx + sw * (0.35 + r() * 0.4))} `;
          if (r() < 0.16) cr += `M${f1(sx + sw * 0.5)} ${f1(y + 3)} l${f1(-3 + r() * 6)} ${f1(9 + r() * 6)} l${f1(4 + r() * 4)} ${f1(7 + r() * 5)} `;
          x += w; } }
      const J = black ? '#1a1418' : DK(c, 0.36);
      return `<rect width="112" height="68" fill="${J}"/><path d="${a}" fill="${c}"/><path d="${b}" fill="${LT(c, 0.1)}"/><path d="${d}" fill="${DK(c, 0.1)}"/>`
        + `<path d="${hi}" stroke="${LT(c, 0.3)}" stroke-width="2.5" stroke-linecap="round" opacity=".6"/><path d="${cr}" stroke="${J}" stroke-width="2" fill="none" stroke-linecap="round"/>`
        + (black ? `<path d="M0 33.5 H112 M0 0.5 H112" stroke="#ff6a2a" stroke-width="1.6" opacity=".55"/>` : '');
    });
    // кладка в прямоугольнике: плитки 112×68, растянутые на целое число по ширине и высоте (без обрезки)
    function stoneTex(x, top, w, h, c, black, seed = 0) {
      const nx = Math.max(1, Math.round(w / 112)), ny = Math.max(1, Math.round(h / 68)), sx = w / (nx * 112), sy = h / (ny * 68);
      let s = ''; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) s += use(stoneTile(c, Math.floor(hr(x + i * 7 + seed, top + j * 13) * 3), black), x + i * 112 * sx, top + j * 68 * sy, sx, sy);
      return s;
    }
    // бревно 200×20: волокна, сучок, светлый верх, тёмный низ; торец — кольца
    const logSym = (c, v) => sym(`log${c}${v}`, () => {
      const r = rng(77 + v * 31); let gr = '';
      for (let k = 0; k < 4; k++) { const x0 = 8 + r() * 150, l = 18 + r() * 34; gr += `M${f1(x0)} ${f1(7 + r() * 7)} h${f1(l)} `; }
      const kx = 30 + r() * 140;
      return `<rect x="0" y="1" width="200" height="18" rx="8" fill="${c}"/><path d="M6 4.5 H194" stroke="${LT(c, 0.22)}" stroke-width="2.5" stroke-linecap="round" opacity=".8"/><path d="M6 16.5 H194" stroke="${DK(c, 0.3)}" stroke-width="3" stroke-linecap="round"/>`
        + `<path d="${gr}" stroke="${DK(c, 0.35)}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/><ellipse cx="${f1(kx)}" cy="10" rx="4.5" ry="3" fill="none" stroke="${DK(c, 0.4)}" stroke-width="1.8"/>`;
    });
    const logEnd = (c) => sym(`lge${c}`, () => `<circle r="8.5" fill="${LT(c, 0.18)}" ${O(2.5)}/><circle r="5" fill="none" stroke="${DK(c, 0.25)}" stroke-width="1.6"/><circle r="1.8" fill="${DK(c, 0.35)}"/>`);
    // доска 18×100 (вертикальная обшивка): волокна, гвозди сверху и снизу; v — тон
    const plankSym = (c, v) => sym(`plk${c}${v}`, () => {
      const cc = v === 1 ? DK(c, 0.08) : v === 2 ? LT(c, 0.06) : c, r = rng(41 + v * 17);
      return `<rect x="0.8" y="0" width="16.4" height="100" fill="${cc}"/><path d="M5 ${f1(8 + r() * 10)} v${f1(30 + r() * 20)} M11 ${f1(40 + r() * 10)} v${f1(30 + r() * 20)}" stroke="${DK(c, 0.3)}" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`
        + `<path d="M2.5 2 V98" stroke="${LT(c, 0.2)}" stroke-width="1.6" opacity=".6"/><path d="M17 0 V100" stroke="${DK(c, 0.4)}" stroke-width="2"/><circle cx="9" cy="6" r="1.6" fill="${INK}"/><circle cx="9" cy="94" r="1.6" fill="${INK}"/>`;
    });
    const planks = (x, top, w, h, c = K.wood) => { let g = ''; for (let xx = x, i = 0; xx < x + w - 1; xx += 18, i++) g += use(plankSym(c, (i + Math.round(top)) % 3), xx, top, Math.min(1, (x + w - xx) / 18), h / 100); return g; };
    // пятна штукатурки и проступивший кирпич (глина, побелка, фахверк)
    const adobe = (c) => sym(`adb${c}`, () => `<path d="M0 0 h18 v9 h-18 Z M20 0 h16 v9 h-16 Z M8 11 h18 v9 h-18 Z" fill="${DK(c, 0.12)}" stroke="${DK(c, 0.35)}" stroke-width="1.4"/>`);
    const blobs = (x, top, w, h, c, n, k = 1) => { let a = '', b = ''; for (let i = 0; i < n; i++) { const px = x + 10 + hr(x + i, top) * (w - 20), py = top + 10 + hr(top + i, x) * (h - 20), rx = (10 + hr(i, x + top) * 16) * k, ry = rx * 0.55; const d = `M${f1(px - rx)} ${f1(py)} q${f1(rx * 0.4)} ${f1(-ry)} ${f1(rx)} ${f1(-ry * 0.8)} q${f1(rx * 0.7)} ${f1(ry * 0.2)} ${f1(rx)} ${f1(ry * 0.9)} q${f1(-rx * 0.5)} ${f1(ry * 0.9)} ${f1(-rx * 1.1)} ${f1(ry * 0.7)} q${f1(-rx * 0.6)} ${f1(-ry * 0.3)} ${f1(-rx * 0.9)} ${f1(-ry * 0.8)} Z `; if (i % 2) a += d; else b += d; } return `<path d="${a}" fill="${LT(c, 0.12)}" opacity=".7"/><path d="${b}" fill="${DK(c, 0.07)}" opacity=".6"/>`; };
    // мох у низа стен и на камне (лес, болото, руины), лианы (руины и порча), песок у стен (пустыня), копоть (пепел)
    const MOSS = K.moss || (L.biome === 'swamp' ? '#6a7a3a' : RUIN ? '#7a8a4a' : null);
    const mossFoot = (x, w, base) => { if (!MOSS) return ''; let d = ''; for (let xx = x + 6; xx < x + w - 10; xx += 26 + hr(xx, base) * 40) { const rx = 10 + hr(base, xx) * 14; d += `M${f1(xx - rx)} ${base} q${f1(rx * 0.3)} ${f1(-rx * 0.9)} ${f1(rx)} ${f1(-rx * 0.7)} q${f1(rx * 0.6)} ${f1(-rx * 0.1)} ${f1(rx)} ${f1(rx * 0.7)} Z `; } return `<path d="${d}" fill="${MOSS}" ${O(2)}/>`; };
    const wallFx = (x, top, w, base, mat) => {
      let g = '';
      if (L.biome === 'desert' && mat !== 'log') { let d = ''; for (let xx = x - 4; xx < x + w; xx += 34 + hr(xx, base) * 30) d += `M${f1(xx)} ${base} q${f1(16)} ${f1(-10 - hr(base, xx) * 8)} ${f1(34)} 0 Z `; g += `<path d="${d}" fill="${K.dirt}" ${O(2, K.dirtD)}/>`; }
      if (L.biome === 'ash') g += `<rect x="${x}" y="${top}" width="${w}" height="${f1(Math.min(40, (base - top) * 0.3))}" fill="url(#tgShade)"/><path d="M${x + 4} ${base - 3} H${x + w - 4}" stroke="#ff7a2a" stroke-width="3" opacity=".55"/>`;
      if (L.biome === 'swamp') g += `<rect x="${x}" y="${base - 26}" width="${w}" height="26" fill="#3a4a2a" opacity=".28"/>`;
      if ((RUIN || L.biome === 'blight') && base - top > 60) { const vx = x + w * (0.15 + hr(x, top) * 0.7); g += `<path d="M${f1(vx)} ${base} q-14 -30 4 -60 q16 -26 -2 -54" stroke="${L.biome === 'blight' ? '#6a5a7a' : '#5a7a3a'}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M${f1(vx + 2)} ${base - 34} l10 -6 M${f1(vx + 4)} ${base - 76} l-10 -6" stroke="${L.biome === 'blight' ? '#6a5a7a' : '#5a7a3a'}" stroke-width="5" stroke-linecap="round"/>`; }
      return g + mossFoot(x, w, base);
    };
    // рама окна: наличник, переплёт, подоконник со светлым верхом, блик на стекле
    const winLit = (x, y, w, h, lit = true, round = false) => {
      x = +x; y = +y;
      const top = round ? `M${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} H${x} Z` : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
      const frame = round ? `M${x - 5} ${y + h + 2} V${y + w / 2} A${w / 2 + 5} ${w / 2 + 5} 0 0 1 ${x + w + 5} ${y + w / 2} V${y + h + 2} Z` : `M${x - 5} ${y - 5} H${x + w + 5} V${y + h + 2} H${x - 5} Z`;
      const sill = `<rect x="${f1(x - 8)}" y="${f1(y + h)}" width="${w + 16}" height="7" rx="2" fill="${K.wall === 'clay' || K.wall === 'white' ? LT(K.plaster, 0.1) : K.stone}" ${O(2.5)}/><path d="M${f1(x - 5)} ${f1(y + h + 2)} H${f1(x + w + 5)}" stroke="#ffffff" stroke-width="1.6" opacity=".4"/>`;
      if (RUIN && !lit) return `<path d="${frame}" fill="${K.woodD}" ${O(3)}/><path d="${top}" fill="#1e1a24" ${O(3.5)}/><path d="M${x - 4} ${y + h * 0.3} L${x + w + 4} ${y + h * 0.5} M${x - 4} ${y + h * 0.7} L${x + w + 4} ${y + h * 0.6}" stroke="${K.wood}" stroke-width="6"/>` + sill;
      return `${lit ? `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w}" ry="${h * 0.8}" fill="#ffd27a" opacity=".2"/>` : ''}<path d="${frame}" fill="${K.woodD}" ${O(3)}/><path d="${top}" fill="${lit ? '#ffd76a' : '#3a3a55'}" ${O(2.5)}/>`
        + (lit ? `<path d="M${f1(x + 3)} ${f1(y + h - 3)} L${f1(x + w * 0.45)} ${f1(y + h * 0.5)} H${f1(x + w - 3)} V${f1(y + h - 3)} Z" fill="#ffb84a" opacity=".55"/>` : '')
        + `<path d="M${x + w / 2} ${y + (round ? 2 : 0)} V${y + h} M${x} ${y + h * 0.55} H${x + w}" stroke="${K.woodD}" stroke-width="3.5"/><path d="M${f1(x + 4)} ${f1(y + h * 0.42)} l${f1(w * 0.24)} ${f1(-h * 0.24)}" stroke="#fffbe0" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`
        + sill + (SNOW >= 0.6 ? `<rect x="${x - 7}" y="${y + h - 2}" width="${w + 14}" height="6" rx="3" fill="#ffffff"/>` : '');
    };
    // стена: x, верх, ширина, низ; mat — материал (брёвна, доски, камень, глина, чёрный камень, побелка, фахверк)
    function wall(x, top, w, base, mat) {
      const h = base - top;
      const fx = wallFx(x, top, w, base, mat);
      if (mat === 'log') {
        let g = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${K.woodD}" ${O()}/>`;
        for (let y = top, i = 0; y < base - 6; y += 20, i++) g += use(logSym(K.wood, Math.floor(hr(x + i, top) * 3)), x, y, w / 200, Math.min(1, (base - y) / 20));
        for (let y = top + 10; y < base - 4; y += 20) g += use(logEnd(K.wood), x, y) + use(logEnd(K.wood), x + w, y);
        return g + fx;
      }
      if (mat === 'shack') {   // уровень 1: сколоченные доски разной ширины, заплатка, щели
        let g = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${DK(K.wood, 0.3)}" ${O()}/>`;
        for (let xx = x, i = 0; xx < x + w - 2; i++) { const pw = Math.min(14 + (i % 3) * 4, x + w - xx); g += use(plankSym(K.wood, (i * 7 + Math.round(x)) % 3), xx, top + (i % 4 === 2 ? 3 : 0), pw / 18, (h - (i % 4 === 2 ? 3 : 0)) / 100); xx += pw + (i % 5 === 3 ? 2 : 0); }
        const px = f1(x + w * 0.6), py = f1(top + h * 0.4), pw = f1(Math.min(44, w * 0.22));
        return g + `<g transform="rotate(-8 ${px} ${py})"><rect x="${px}" y="${py}" width="${pw}" height="14" fill="${LT(K.wood, 0.1)}" ${O(2.5)}/><circle cx="${f1(+px + 4)}" cy="${f1(+py + 7)}" r="1.8" fill="${INK}"/><circle cx="${f1(+px + +pw - 4)}" cy="${f1(+py + 7)}" r="1.8" fill="${INK}"/></g>` + fx;
      }
      if (mat === 'rubble') {   // уровень 1 у каменных краёв: бутовый камень — неровные камни разного тона
        let a = '', b = '';
        for (let y = top + 4, r = 0; y < base - 10; y += 22, r++) for (let xx = x + 3 + (r % 2) * 10; xx < x + w - 10;) { const bw = 18 + hr(xx, y) * 26, ww = Math.min(bw, x + w - 3 - xx), d = `M${f1(xx + 3)} ${f1(y)} h${f1(ww - 6)} q3 0 3 4 v${f1(10 + hr(y, xx) * 4)} q0 3 -3 3 h${f1(-ww + 6)} q-3 0 -3 -3 v${f1(-10 - hr(y, xx) * 4)} q0 -4 3 -4 Z `; if (hr(xx + 1, y) < 0.35) b += d; else a += d; xx += bw + 3; }
        return `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${DK(K.stone, 0.32)}" ${O()}/><path d="${a}" fill="${K.stone}"/><path d="${b}" fill="${LT(K.stone, 0.1)}"/>` + fx;
      }
      if (mat === 'plank') return `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${K.wood}"/>` + planks(x, top, w, h) + `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="none" ${O()}/>` + fx;
      if (mat === 'clay') {   // глина: скруглённые углы, пятна штукатурки, проступивший кирпич, тёмный цоколь, трещины
        let g = `<path d="M${x} ${base} V${top + 8} Q${x} ${top} ${x + 8} ${top} H${x + w - 8} Q${x + w} ${top} ${x + w} ${top + 8} V${base} Z" fill="${K.plaster}" ${O()}/>` + blobs(x, top, w, h, K.plaster, Math.max(3, Math.round(w * h / 9000)));
        if (h > 70) g += use(adobe(K.plaster), x + w * (0.12 + hr(x, h) * 0.5), top + h * 0.35) + (w > 200 ? use(adobe(K.plaster), x + w * 0.7, top + h * 0.62) : '');
        return g + `<path d="M${x + w * 0.2} ${top + h * 0.3} l14 18 l-6 14 M${x + w * 0.75} ${top + h * 0.6} l-10 14" stroke="${K.roofD}" stroke-width="2.5" fill="none" opacity=".6"/><rect x="${x}" y="${base - 18}" width="${w}" height="18" fill="${K.roofC}" opacity=".6"/><path d="M${x + 2} ${base - 18} H${x + w - 2}" stroke="${DK(K.plaster, 0.3)}" stroke-width="2" opacity=".6"/>` + fx;
      }
      if (mat === 'white') return `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${K.plaster}" ${O()}/>` + blobs(x, top, w, h - 22, K.plaster, Math.max(2, Math.round(w * h / 12000)), 0.8) + stoneTex(x + 2, base - 22, w - 4, 20, K.stone, false, 3) + `<path d="M${x} ${base - 22} H${x + w}" stroke="${INK}" stroke-width="2.5"/>` + fx;
      if (mat === 'timber') {   // фахверк: штукатурка с пятнами, брусья с волокнами и нагелями
        let g = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${K.plaster}" ${O()}/>` + blobs(x, top, w, h, K.plaster, Math.max(2, Math.round(w * h / 10000)), 0.8);
        const n = Math.max(2, Math.round(w / 70)); let bm = '', pg = '';
        for (let i = 0; i <= n; i++) { const bx = f1(x + w * i / n); bm += `M${bx} ${top} V${base}`; pg += `M${bx} ${top + 12}h0.1M${bx} ${base - 12}h0.1`; }
        bm += `M${x} ${top + 5} H${x + w} M${x} ${base - 4} H${x + w}`;
        for (let i = 0; i < n; i += 2) bm += `M${f1(x + w * i / n)} ${top} L${f1(x + w * (i + 1) / n)} ${base}`;
        g += `<path d="${bm}" stroke="${INK}" stroke-width="9" opacity=".55"/><path d="${bm}" stroke="${K.woodD}" stroke-width="6"/><path d="${bm}" stroke="${LT(K.woodD, 0.18)}" stroke-width="1.6" opacity=".7" transform="translate(-1.5 -1.5)"/><path d="${pg}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
        return g + fx;
      }
      // камень / чёрный камень: кладка символами
      const black = mat === 'black', fill = black ? '#2e2a30' : K.stone;
      return `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${fill}"/>` + stoneTex(x, top, w, h, fill, black) + `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="none" ${O()}/>` + fx;
    }
    // крыша над стеной x0…x1 (верх стены top), высота h; kind — материал, flat — плоская
    function roof(x0, x1, top, h, kind, col, ruined, colD) {
      kind = kind || K.roof; col = col || K.roofC; const RD = colD || (col === K.roofC ? K.roofD : DK(col, 0.38));
      const cx = (x0 + x1) / 2, e = 22;
      if (kind === 'flat') {
        let g = `<rect x="${x0 - 8}" y="${top - 22}" width="${x1 - x0 + 16}" height="26" fill="${K.roofC}" ${O()}/>`;
        for (let x = x0 + 14; x < x1 - 10; x += 34) g += `<rect x="${x}" y="${top - 34}" width="18" height="14" fill="${K.roofC}" ${O(3)}/>`;
        for (let x = x0 + 24; x < x1 - 20; x += 54) g += `<path d="M${x} ${top + 14} h-14" stroke="${K.woodD}" stroke-width="7" stroke-linecap="round"/>`;
        return g;
      }
      let g;
      const tri = `M${x0 - e} ${top + 4} L${cx} ${top - h} L${x1 + e} ${top + 4} Z`;
      // тень под свесом на стене
      g = `<path d="M${x0} ${top} H${x1} V${top + 18} H${x0} Z" fill="url(#tgShade)"/>`;
      if (ruined) {   // полкрыши провалилось: виден каркас
        const jx = cx + (x1 - cx) * 0.25;
        g += `<path d="M${x0 - e} ${top + 4} L${cx} ${top - h} L${f1(jx)} ${f1(top - h * 0.78)} l-12 26 l20 14 l-6 30 l-18 ${f1(h * 0.45 - 50)} Z" fill="${col}" ${O()}/>`;
        g += `<path d="M${cx} ${top - h} L${x1 + e} ${top + 4} M${f1(jx + 30)} ${f1(top - h * 0.6)} V${top} M${f1(jx + 80)} ${f1(top - h * 0.35)} V${top}" stroke="${K.woodD}" stroke-width="7"/>`;
        g += `<path d="M${f1(cx - (cx - x0 + e) * 0.3)} ${f1(top - h * 0.7)} l10 4 M${f1(cx - (cx - x0 + e) * 0.6)} ${f1(top - h * 0.4)} l12 5" stroke="${RD}" stroke-width="4" stroke-linecap="round"/>`;
      } else {
        const id = clipId(tri);
        g += `<clipPath id="${id}"><path d="${tri}"/></clipPath><path d="${tri}" fill="${col}"/><g clip-path="url(#${id})">${roofRows(kind, x0 - e, x1 + e, top - h, top + 4, col, RD)}</g>`;
        // свет на левом скате, тень на правом, коньковая доска и кромка свеса
        g += `<path d="M${x0 - e + 10} ${top} L${cx} ${f1(top - h + 8)} L${f1(cx - 6)} ${f1(top - h + 20)} L${x0 - e + 22} ${top} Z" fill="#ffffff" opacity=".1"/><path d="M${cx} ${top - h} L${x1 + e} ${top + 4} L${x1 + e - 16} ${top + 4} L${f1(cx + 4)} ${f1(top - h + 14)} Z" fill="${INK}" opacity=".12"/>`;
        g += `<path d="${tri}" fill="none" ${O()}/>`;
        if (kind === 'thatch' || kind === 'reed') g += `<path d="M${x0 - e - 4} ${top + 6} Q${cx} ${top + 22} ${x1 + e + 4} ${top + 6}" stroke="${RD}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${x0 - e} ${top + 4} Q${cx} ${top + 18} ${x1 + e} ${top + 4}" stroke="${LT(col, 0.2)}" stroke-width="3" fill="none" opacity=".6"/>`
          + `<path d="M${f1(cx - 14)} ${f1(top - h + 10)} L${cx} ${f1(top - h - 4)} L${f1(cx + 14)} ${f1(top - h + 10)}" stroke="${RD}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
        else g += `<path d="M${x0 - e - 2} ${top + 5} H${x1 + e + 2}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x0 - e} ${top + 5} H${x1 + e}" stroke="${kind === 'iron' ? '#5a5662' : K.woodD}" stroke-width="5" stroke-linecap="round"/>`;
      }
      if (K.moss && !ruined) { let d = ''; for (let i = 0; i < 3; i++) { const t = 0.2 + R() * 0.6, xx = x0 + (x1 - x0) * t, yy = top - h * (1 - Math.abs(t - 0.5) * 2) * 0.7 + 12, rx = 18 + R() * 14, ry = 8 + R() * 4; d += `M${f1(xx - rx)} ${f1(yy)} a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(rx * 2)} 0 a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-rx * 2)} 0 Z `; } g += `<path d="${d}" fill="${K.moss}" ${O(2.5)}/><path d="${d}" fill="none" stroke="${LT(K.moss, 0.25)}" stroke-width="2" stroke-dasharray="3 7" opacity=".8"/>`; }
      if (SNOW && !ruined) { const t = 10 + 14 * SNOW; g += `<path d="M${x0 - e} ${top + 2} L${cx} ${top - h} L${x1 + e} ${top + 2} L${x1 + e - 10} ${top + 6} L${cx} ${f1(top - h + t * 1.6)} L${x0 - e + 10} ${top + 6} Z" fill="#f6fafd" ${O(3)}/><path d="M${f1(cx - 10)} ${f1(top - h + t * 1.6 - 4)} L${f1(x0 - e + 30)} ${top - 2}" stroke="#cfe2f2" stroke-width="2.5" opacity=".8"/>`;
        // сосульки под свесом (тайга — реже и короче, льды — часто)
        let d = ''; for (let x = x0 - e + 8; x < x1 + e - 8; x += (SNOW >= 1 ? 16 : 30) + R() * 12) d += `M${f1(x)} ${top + 6} l3.5 ${f1((SNOW >= 1 ? 12 : 7) + R() * (SNOW >= 1 ? 14 : 8))} l3.5 ${f1(-(SNOW >= 1 ? 12 : 7) - R() * 6)} Z `;
        g += `<path d="${d}" fill="#dff0fb" stroke="#b8d4ec" stroke-width="1.5" stroke-linejoin="round"/>`; }
      return g;
    }
    // ряды кровли по рамке (обрезаются по крыше снаружи): дранка — чешуйки, сланец — плитки, солома и тростник — пучки, железо — гофра с заклёпками
    const roofTile = (kind, c, cd, v) => sym(`rf${kind}${c}${cd}${v}`, () => {
      const r = rng(701 + v * 13 + kind.length * 3); let a = '', b = '', d = '', hi = '';
      if (kind === 'thatch' || kind === 'reed') {
        for (let x = 0; x < 240; x += 6) { const l = 16 + r() * 8, p = `M${x} 0 l${f1(-1 + r() * 2)} ${f1(l)} l4 ${f1(-2 - r() * 3)} L${x + 6} 0 Z `; const t = r(); if (t < 0.3) b += p; else if (t < 0.45) d += p; else a += p; }
        for (let k = 0; k < 10; k++) { const x = r() * 236; hi += `M${f1(x)} ${f1(3 + r() * 5)} l${f1(1 + r() * 2)} ${f1(10 + r() * 6)} `; }
        return `<path d="${a}" fill="${c}"/><path d="${b}" fill="${LT(c, 0.14)}"/><path d="${d}" fill="${DK(c, 0.12)}"/><path d="M0 19 H240" stroke="${cd}" stroke-width="2.5" opacity=".55"/><path d="${hi}" stroke="${LT(c, 0.35)}" stroke-width="1.4" opacity=".7"/>`;
      }
      if (kind === 'slate') {
        for (let x = 0; x < 240; x += 20) { const p = `M${x + 1} 0 H${x + 19} V16 Q${x + 10} 19 ${x + 1} 16 Z `, t = r(); if (t < 0.25) b += p; else if (t < 0.4) d += p; else a += p; hi += `M${x + 4} 4 H${x + 13} `; }
        return `<path d="${a}" fill="${c}"/><path d="${b}" fill="${LT(c, 0.1)}"/><path d="${d}" fill="${DK(c, 0.12)}"/><path d="${a}${b}${d}" fill="none" stroke="${cd}" stroke-width="1.8"/><path d="${hi}" stroke="#ffffff" stroke-width="1.6" opacity=".18"/>`;
      }
      if (kind === 'iron') {
        for (let x = 0; x < 240; x += 12) a += `M${x + 3} 0 V18 `;
        for (let x = 6; x < 240; x += 30) b += `M${x} 15 h0.1 `;
        return `<rect width="240" height="18" fill="${c}"/><path d="${a}" stroke="${DK(c, 0.35)}" stroke-width="2.5"/><path d="${a}" stroke="${LT(c, 0.2)}" stroke-width="1" transform="translate(3 0)" opacity=".7"/><path d="M0 17 H240" stroke="#ff6a2a" stroke-width="1.6" opacity=".35"/><path d="${b}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
      }
      // дранка / черепица: чешуйки рядами
      for (let x = 0; x < 240; x += 20) { const p = `M${x} 0 V9 A10 10 0 0 0 ${x + 20} 9 V0 Z `, t = r(); if (t < 0.25) b += p; else if (t < 0.4) d += p; else a += p; hi += `M${x + 5} 6 q5 -2.5 10 0 `; }
      return `<path d="${a}" fill="${c}"/><path d="${b}" fill="${LT(c, 0.12)}"/><path d="${d}" fill="${DK(c, 0.12)}"/><path d="${a}${b}${d}" fill="none" stroke="${cd}" stroke-width="1.8"/><path d="${hi}" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".2" stroke-linecap="round"/>`;
    });
    function roofRows(kind, x0, x1, y0, y1, c, cd) {
      const k = kind === 'shingle' || kind === 'slate' || kind === 'iron' || kind === 'thatch' || kind === 'reed' ? kind : 'shingle', step = k === 'iron' ? 18 : k === 'thatch' || k === 'reed' ? 14 : 15;
      let s = '';
      for (let y = y0 - 2, row = 0; y < y1; y += step, row++) for (let x = x0 - (row % 2 ? 10 : 0) - 4; x < x1; x += 240) s += use(roofTile(k, c, cd, row % 2), x, y);
      return s;
    }
    // 26.10: дверь из досок — стыки досок по арке, две кованые петли с гвоздями, кольцо-ручка, порог
    const door = (x, base, w = 50, h = 76, c = K.woodD) => {
      x = +x; w = +w; h = +h;
      const r = w / 2, ay = base - h + r, n = Math.max(2, Math.round(w / 13));
      let pl = ''; for (let i = 1; i < n; i++) { const dx = -r + (w * i) / n; pl += `M${f1(x + dx)} ${f1(ay - Math.sqrt(Math.max(0, r * r - dx * dx)) + 2)} V${base - 2}`; }
      const hy = [base - h * 0.72, base - h * 0.26], hl = w * 0.62;
      let hn = '', nl = ''; for (const y of hy) { hn += `M${f1(x - r + 1)} ${f1(y)} h${f1(hl)} l5 3 l-5 3 h${f1(-hl)} Z `; nl += `M${f1(x - r + 7)} ${f1(y + 3)}h0.1M${f1(x - r + hl * 0.55)} ${f1(y + 3)}h0.1`; }
      return `<path d="M${x - r} ${base} V${ay} A${r} ${r} 0 0 1 ${x + r} ${ay} V${base} Z" fill="${c}" ${O(4)}/><path d="${pl}" stroke="${DK(c, 0.35)}" stroke-width="2.2"/><path d="M${f1(x - r + 3)} ${f1(ay)} A${f1(r - 3)} ${f1(r - 3)} 0 0 1 ${f1(x + r - 3)} ${f1(ay)}" stroke="${LT(c, 0.2)}" stroke-width="2" fill="none" opacity=".7"/>`
        + `<path d="${hn}" fill="#3a3640" stroke="${INK}" stroke-width="1.6"/><path d="${nl}" stroke="#a9b1b6" stroke-width="2.6" stroke-linecap="round"/>`
        + `<circle cx="${f1(x + r * 0.5)}" cy="${f1(base - h / 2.4)}" r="5" fill="none" stroke="${INK}" stroke-width="3.5"/><circle cx="${f1(x + r * 0.5)}" cy="${f1(base - h / 2.4)}" r="5" fill="none" stroke="#ffc94d" stroke-width="2"/>`
        + `<rect x="${f1(x - r - 6)}" y="${base - 3}" width="${f1(w + 12)}" height="7" rx="2" fill="${K.stone}" ${O(2.5)}/>` + (SNOW >= 1 ? `<ellipse cx="${x}" cy="${base}" rx="${w / 2 + 16}" ry="7" fill="#ffffff"/>` : '');
    };
    // заклёпка (символ) и вывеска: рамка, блик сверху, заклёпки по углам
    const rivet = () => sym('rvt', () => `<circle r="3.6" fill="#ffc94d" stroke="${INK}" stroke-width="1.6"/><circle cx="-1" cy="-1.2" r="1.2" fill="#fff6c8"/>`);
    const sign = (x, y, w, t, size = 28, bg = '#6a2a22') => `<rect x="${f1(x - w / 2)}" y="${f1(y - 26)}" width="${f1(w)}" height="52" rx="10" fill="${bg}" ${O(4)}/><path d="M${f1(x - w / 2 + 12)} ${f1(y - 21)} H${f1(x + w / 2 - 12)}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".22"/><rect x="${f1(x - w / 2 + 7)}" y="${f1(y - 19)}" width="${f1(w - 14)}" height="38" rx="7" fill="none" stroke="#ffc94d" stroke-width="2"/>`
      + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => use(rivet(), x + a * (w / 2 - 6), y + b * 20)).join('') + txt(x, y + size * 0.36, t, size);
    const drift = (x, base, w) => (SNOW >= 0.6 ? `<path d="M${f1(x - w / 2)} ${base + 4} Q${f1(x - w / 4)} ${f1(base - 18 * SNOW)} ${f1(x)} ${f1(base - 8)} Q${f1(x + w / 4)} ${f1(base - 22 * SNOW)} ${f1(x + w / 2)} ${base + 4} Z" fill="#f6fafd" ${O(2.5, '#b8cce0')}/>` : '');
    const stilts = (x0, x1, base) => { let g = ''; for (let x = x0 + 16; x < x1 - 6; x += 52) g += `<rect x="${x - 7}" y="${base - 54}" width="14" height="60" fill="${K.woodD}" ${O(3)}/>`; return g + `<path d="M${x0 - 6} ${base - 54} H${x1 + 6}" stroke="${K.woodD}" stroke-width="10"/>`; };
    // 24.10 (снимок стримера: пламя отдельно от палки, факел в воздухе): факел — на стене или столбе: железная накладка с кронштейном,
    // палка, чаша, пламя сидит в чаше (без зазора)
    const torch = (x, y) => `<circle cx="${x}" cy="${y - 14}" r="34" fill="url(#tgGlow)" opacity=".6"/><rect x="${f1(x - 6)}" y="${f1(y + 16)}" width="12" height="18" rx="2" fill="#3a3640" ${O(2.5)}/>`
      + `<path d="M${x} ${y + 24} V${y + 2}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${x} ${y + 24} V${y + 2}" stroke="${K.woodD}" stroke-width="3.5" stroke-linecap="round"/>`
      + `<path d="M${x - 8} ${y - 4} h16 l-3 8 h-10 Z" fill="#3a3640" ${O(2)}/><path d="M${x} ${y - 30} q11 13 6 24 q-6 4 -12 0 q-5 -11 6 -24" fill="#ffb34d" ${O(2)}/><path d="M${x} ${y - 18} q4 6 1 11 q-3 1 -4 -2 q0 -4 3 -9" fill="#ffe59a"/>`;
    // фонарь на столбе у земли (у шатра — не факел на ткани): основание, столб, крюк, фонарь
    const poleLamp = (x, B) => `<circle cx="${x + 14}" cy="${B - 104}" r="30" fill="url(#tgGlow)" opacity=".6"/><path d="M${x - 10} ${B + 2} h20 l-4 -8 h-12 Z" fill="#3a3640" ${O(2)}/><path d="M${x} ${B - 4} V${B - 130} h16 v8" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`
      + `<path d="M${x + 8} ${B - 118} h16 l-2 20 h-12 Z" fill="#ffd76a" ${O(2.5)}/><path d="M${x + 6} ${B - 120} h20" stroke="${INK}" stroke-width="3"/>`;
    const flag = (x, y, c = '#c8402a') => `<path d="M${x} ${y} V${y - 46} l38 11 l-38 11" fill="${c}" ${O(3)}/>`;
    // 26.10: труба с кладкой, колпаком и копотью (дым — у того, кто зовёт)
    const chimney = (x, y, w, h, lv = 3, c = K.stone) => {
      let br = ''; for (let yy = y + 12, r = 0; yy < y + h - 2; yy += 10, r++) { br += `M${f1(x - w / 2 + 2)} ${f1(yy)} H${f1(x + w / 2 - 2)}`; for (let xx = x - w / 2 + (r % 2 ? 6 : 12); xx < x + w / 2 - 3; xx += 12) br += `M${f1(xx)} ${f1(yy - 10)} v10`; }
      return `<rect x="${f1(x - w / 2)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${c}" ${O(3.5)}/><path d="${br}" stroke="${DK(c, 0.4)}" stroke-width="1.6" opacity=".75"/><rect x="${f1(x - w / 2 + 2)}" y="${f1(y + 2)}" width="${f1(w * 0.3)}" height="${f1(h - 4)}" fill="#ffffff" opacity=".1"/>`
        + `<rect x="${f1(x - w / 2 - 4)}" y="${f1(y - 7)}" width="${f1(w + 8)}" height="10" rx="2" fill="${lv >= 5 ? GOLD : DK(c, 0.12)}" ${O(3)}/><path d="M${f1(x - w / 2 + 3)} ${f1(y + 4)} h${f1(w - 6)} v6 h${f1(-w + 6)} Z" fill="${INK}" opacity=".3"/>`;
    };
    // водосток (3+): жёлоб под свесом и труба по углу стены с кронштейнами
    const gutter = (x0, x1, top, B, lv) => {
      const gx = x1 - 3, c = lv >= 5 ? GOLD : '#8a8e9e';
      return `<path d="M${x0 - 14} ${top + 9} H${x1 + 14}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${x0 - 14} ${top + 9} H${x1 + 14}" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/><path d="M${x0 - 12} ${top + 7.5} H${x1 + 12}" stroke="#ffffff" stroke-width="1.5" opacity=".45"/>`
        + `<path d="M${x1 + 10} ${top + 9} Q${gx} ${top + 12} ${gx} ${top + 26} V${B - 10} q0 8 -10 8" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${x1 + 10} ${top + 9} Q${gx} ${top + 12} ${gx} ${top + 26} V${B - 10} q0 8 -10 8" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
        + [0.35, 0.7].map((t) => `<rect x="${gx - 6}" y="${f1(top + 26 + (B - top - 36) * t)}" width="12" height="5" rx="1.5" fill="#3a3640" ${O(1.5)}/>`).join('');
    };
    /* мелочи у входа — символы (низ — y 0): бочка, ящик, мешок, кувшин (пустыня), поленница (тайга, льды), ведро, цветок в горшке, деревце
       в кадке (5), сеть на шестах (болото), грибы (лес), бухта каната (побережье), камни (горы), жаровня (пепел) */
    const PROP = {
      barrel: () => sym('pbar' + K.wood, () => `<path d="M-14 0 C-18 -14 -18 -28 -14 -40 H14 C18 -28 18 -14 14 0 Z" fill="${K.wood}" ${O(3)}/><path d="M-6 -39 C-8 -26 -8 -13 -6 -1 M6 -39 C8 -26 8 -13 6 -1" stroke="${K.woodD}" stroke-width="1.6" fill="none" opacity=".7"/><path d="M-16.5 -10 H16.5 M-17 -30 H17" stroke="#4a4a4f" stroke-width="3.5"/><path d="M-15 -11 H15 M-15.5 -31 H15.5" stroke="#9a9aa6" stroke-width="1.2"/><ellipse cy="-40" rx="14" ry="3.5" fill="${LT(K.wood, 0.2)}" ${O(2.5)}/>`),
      crate: () => sym('pcrt' + K.wood, () => `<rect x="-16" y="-30" width="32" height="30" fill="${LT(K.wood, 0.12)}" ${O(3)}/><rect x="-12" y="-26" width="24" height="22" fill="none" stroke="${K.woodD}" stroke-width="2"/><path d="M-12 -26 L12 -4 M-12 -4 L12 -26" stroke="${K.woodD}" stroke-width="3"/><path d="M-14 -27 H14" stroke="#ffffff" stroke-width="1.4" opacity=".35"/>` + [[-13, -27], [13, -27], [-13, -3], [13, -3]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#4a4a4f"/>`).join('')),
      sack: () => sym('psck', () => `<path d="M-13 0 Q-17 -14 -9 -24 L-11 -30 Q0 -34 11 -30 L9 -24 Q17 -14 13 0 Z" fill="#d8c08a" ${O(3)}/><path d="M-9 -24 Q0 -21 9 -24" stroke="#8a6a3a" stroke-width="2.5" fill="none"/><path d="M-5 -14 q4 3 9 0" stroke="#a8884e" stroke-width="1.6" fill="none"/>`),
      amphora: () => sym('pamp' + K.plaster, () => `<path d="M-7 -34 H7 V-30 Q15 -26 15 -14 Q15 -2 6 0 H-6 Q-15 -2 -15 -14 Q-15 -26 -7 -30 Z" fill="#c8784a" ${O(3)}/><path d="M-13 -18 H13" stroke="#f4e4c4" stroke-width="3"/><path d="M-12 -12 H12" stroke="${INK}" stroke-width="1.4" opacity=".4"/><path d="M-9 -26 q-3 6 -2 14" stroke="#ffffff" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>`),
      wood: () => sym('pwd' + K.wood, () => `<rect x="-24" y="-30" width="48" height="30" rx="3" fill="${K.woodD}" ${O(3)}/>` + [[-16, -24], [-4, -24], [8, -24], [19, -24], [-10, -12], [2, -12], [14, -12], [-19, -12], [-16, -4], [-4, -4], [8, -4], [19, -4]].map(([x, y]) => `<circle cx="${x}" cy="${y + 3}" r="5.2" fill="${LT(K.wood, 0.2)}" stroke="${INK}" stroke-width="1.6"/><circle cx="${x}" cy="${y + 3}" r="1.8" fill="${K.woodD}"/>`).join('') + (SNOW ? `<path d="M-26 -30 Q0 -40 26 -30 Q0 -33 -26 -30 Z" fill="#f6fafd" ${O(2)}/>` : '')),
      bucket: () => sym('pbkt' + K.wood, () => `<path d="M-10 -20 H10 L8 0 H-8 Z" fill="${K.wood}" ${O(2.5)}/><path d="M-9.5 -12 H9.5" stroke="#4a4a4f" stroke-width="2.5"/><path d="M-10 -20 Q0 -34 10 -20" stroke="${INK}" stroke-width="2" fill="none"/><ellipse cy="-20" rx="10" ry="2.5" fill="#4ab0ff" opacity=".7"/>`),
      plant: () => sym('ppl' + L.biome, () => { const lf = K.leaf; const fir = SNOW || L.biome === 'mount';
        return `<path d="M-11 0 L-13 -16 H13 L11 0 Z" fill="#b5533c" ${O(2.5)}/><rect x="-15" y="-20" width="30" height="6" rx="2" fill="#c86a4a" ${O(2)}/>`
          + (fir ? `<path d="M-12 -20 L0 -52 L12 -20 Z" fill="${lf[0]}" ${O(2.5)}/><path d="M-8 -34 L0 -52 L8 -34" fill="${lf[1] || lf[0]}"/>` + (SNOW ? `<path d="M-5 -42 L0 -52 L5 -42 Z" fill="#f6fafd"/>` : '')
            : `<circle cx="-7" cy="-28" r="9" fill="${lf[0]}" ${O(2.5)}/><circle cx="7" cy="-30" r="9" fill="${lf[1] || lf[0]}" ${O(2.5)}/><circle cy="-38" r="9" fill="${lf[0]}" ${O(2.5)}/>` + (FLOWERS ? `<circle cx="-6" cy="-32" r="3" fill="#e8455c"/><circle cx="6" cy="-38" r="3" fill="#ffd76a"/><circle cx="3" cy="-26" r="3" fill="#b9a2ff"/>` : '')); }),
      topiary: () => sym('ptop' + L.biome, () => `<path d="M-13 0 L-15 -20 H15 L13 0 Z" fill="#efe8d8" ${O(2.5)}/><rect x="-17" y="-24" width="34" height="6" rx="2" fill="${GOLD}" ${O(2)}/><rect x="-2.5" y="-40" width="5" height="18" fill="${K.woodD}"/><circle cy="-52" r="15" fill="${K.leaf[0]}" ${O(3)}/><circle cx="4" cy="-48" r="8" fill="${K.leaf[2] || K.leaf[0]}" opacity=".8"/><circle cx="-5" cy="-58" r="4" fill="${LT(K.leaf[0], 0.3)}"/>`),
      net: () => sym('pnet', () => `<path d="M-22 0 V-62 M22 0 V-62" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-22 0 V-62 M22 0 V-62" stroke="${K.woodD}" stroke-width="3.5" stroke-linecap="round"/><path d="M-22 -58 Q0 -40 22 -58 V-24 Q0 -10 -22 -24 Z" fill="#c8bc94" opacity=".35" stroke="#a89c74" stroke-width="1.6"/><path d="M-14 -52 L-12 -18 M-4 -48 L-3 -14 M6 -48 L5 -14 M15 -52 L13 -18 M-20 -44 Q0 -30 20 -44 M-20 -32 Q0 -18 20 -32" stroke="#a89c74" stroke-width="1.4" fill="none"/><circle cx="-8" cy="-22" r="3" fill="#e8a04a" ${O(1.2)}/>`),
      shroom: () => sym('pshr', () => `<path d="M-8 0 V-8 M6 0 V-12" stroke="#efe4cc" stroke-width="4"/><path d="M-15 -8 Q-8 -20 -1 -8 Z M-2 -12 Q6 -26 14 -12 Z" fill="#c8402a" ${O(2)}/><circle cx="-9" cy="-12" r="1.6" fill="#fff"/><circle cx="5" cy="-18" r="1.8" fill="#fff"/><circle cx="9" cy="-14" r="1.4" fill="#fff"/>`),
      rope: () => sym('prop', () => `<ellipse cy="-7" rx="16" ry="7" fill="#c8a86a" ${O(2.5)}/><ellipse cy="-9" rx="10" ry="4" fill="none" stroke="#8a6a3a" stroke-width="2"/><ellipse cy="-10" rx="4.5" ry="2" fill="#8a6a3a"/>`),
      stones: () => sym('pstn' + K.stone, () => `<path d="M-16 0 Q-18 -10 -8 -12 Q0 -14 6 -10 Q16 -10 16 0 Z" fill="${K.stone}" ${O(2.5)}/><path d="M-8 -12 Q-8 -22 0 -22 Q8 -22 6 -11 Z" fill="${LT(K.stone, 0.1)}" ${O(2.5)}/><path d="M-3 -24 Q0 -30 4 -24 Z" fill="${DK(K.stone, 0.1)}" ${O(2)}/>`),
      brazier: () => sym('pbrz', () => `<path d="M-12 0 L-6 -14 M12 0 L6 -14" stroke="${INK}" stroke-width="4"/><path d="M-14 -14 H14 L10 -22 H-10 Z" fill="#3a3640" ${O(2.5)}/><path d="M-8 -22 Q-4 -34 0 -26 Q4 -38 8 -22 Z" fill="#ff8a2a" ${O(1.5)}/><path d="M-3 -22 Q0 -30 3 -22 Z" fill="#ffe59a"/>`),
    };
    const pick2 = (k) => (L.biome === 'desert' ? { barrel: 'amphora', crate: 'amphora', sack: 'sack' }[k] || k
      : SNOW ? { crate: 'wood' }[k] || k : L.biome === 'swamp' ? { crate: 'net' }[k] || k : L.biome === 'coast' ? { sack: 'rope' }[k] || k
        : L.biome === 'ash' ? { plant: 'brazier', sack: 'crate' }[k] || k : L.biome === 'mount' ? { sack: 'stones' }[k] || k : k);
    const putProp = (k, x, base, s = 1) => use(PROP[pick2(k)](), x, base, s);
    // мелочи у входа по уровню: углы стены — x0 / x1 (внутри, у самого низа); у двери (4–5) — горшки по бокам; avoid — где не ставить
    function stoop(x0, x1, B, lv, cx, dw, avoid = [], sides = 3) {
      const free = (x, r) => avoid.every(([p, q]) => x + r < p || x - r > q);
      const SET = [[], [['bucket']], [['barrel'], ['crate']], [['barrel', 'sack'], ['crate', 'crate']], [['barrel', 'crate'], ['sack', 'barrel']], [['barrel', 'crate'], ['crate', 'sack']]][lv] || [];
      let g = '';
      SET.forEach((items, i) => {
        if (!(sides & (i ? 2 : 1))) return;
        const s = i ? -1 : 1, xs = i ? x1 - 18 : x0 + 18;
        items.forEach((k, j) => { const x = xs + s * j * 30, kk = j === 1 && items[0] === items[1] ? k : k; if (free(x, 16)) g += putProp(kk, x, B + 1, lv >= 3 && j === 1 ? 0.85 : 1); });
      });
      if (lv >= 4) for (const sd of [-1, 1]) { const x = cx + sd * (dw / 2 + (lv >= 5 ? 50 : 30)); if (free(x, 14)) g += putProp(lv >= 5 ? 'topiary' : 'plant', x, B + 2, lv >= 5 ? 0.9 : 0.85); }
      if (K.moss && lv >= 2 && free(x0 + 70, 14)) g += use(PROP.shroom(), x0 + 70, B + 1);
      return g;
    }
    // дом: стены (деревня — один материал, посёлок — камень снизу + второй этаж), крыша, окна, дверь; что поверх — extra
    function body(x0, x1, base, h, o2 = {}) {
      const w = x1 - x0, st = K.stilts && !o2.noStilts, B = st ? base - 54 : base, top = B - h;
      const mat = o2.mat || K.wall;
      let g = st ? stilts(x0, x1, base) : '';
      if (!V && !o2.one && ['log', 'plank'].includes(mat)) { const mid = B - h * 0.48; g += wall(x0, mid, w, B, 'stone') + wall(x0, top, w, mid, L.biome === 'swamp' ? 'plank' : 'timber'); }
      else g += wall(x0, top, w, B, mat);
      if (RUIN) g += `<path d="M${f1(x0 + w * 0.3)} ${f1(top + 10)} l12 30 l-10 22 l14 30 M${f1(x0 + w * 0.8)} ${f1(B - 60)} l-14 24" stroke="${INK}" stroke-width="3" fill="none" opacity=".6"/>`;
      g += roof(x0, x1, top, o2.roofH || Math.min(150, w * 0.42), o2.roof, o2.roofC, RUIN && o2.ruin !== false && (o2.ruinHere || false));
      return { g, top, B };
    }

    /* ================= здания по уровням 1…5 (23.10, вечер: улучшения зданий — решение стримера 23.10) =================
       Рамка здания (L.fr[id]: x0…x1 внутри участка, низ стен B, высота стен wall, что выше стен up, верх top, уровень lv) — из towngen.js
       frame(): по ней же место клика. Дверь — на том же месте при любом уровне (L.BUILDINGS door). Что даёт уровень:
       1 — скромно: доски / глина / бутовый камень, солома или лист железа с заплатками, табличка краской, ставни;
       2 — больше: стены природы, своя крыша, вывеска, фонарь у двери, труба;
       3 — каменный низ и второй этаж с карнизом, арка у двери, ящики с цветами, дым из трубы;
       4 — башенки по краям со знамёнами, черепица (цвет roof2), навершие, крыльцо, вывеска в золотой рамке;
       5 — большое и красивое: золотая отделка крыши, шпили и купола, флаги, колонны и фронтон у двери, корона на вывеске, гирлянда огней.
       Материалы и цвета — природы округа (K): брёвна и солома лугов, снег льдов, глина и плоские крыши пустыни (купол на 5), чёрный камень
       и железо пепла, сваи болот; в руинах и порче 1–2 — полуразрушено, с 3 — отстроено. */
    const GOLD = '#ffc94d', GOLDD = '#b8862a';
    const WOODY = K.wall === 'log' || K.wall === 'plank', FLAT = K.roof === 'flat', THATCHY = K.roof === 'thatch' || K.roof === 'reed';
    const FLOWERS = !SNOW && !K.lava && !RUIN && L.biome !== 'swamp';
    const BAN = { hall: '#7a1a2a', auction: '#2a4a7a', trainer: '#8a2a1a', storage: '#6a4a1e', forge: '#3a3a4a', shop: '#2f5a2a', magic: '#3a2a6a', gate: '#7a1a2a', tent: '#4a1a4a', board: '#6a2a22', anvil: '#3a3a4a' };
    const stoneMat = K.wall === 'clay' ? 'clay' : K.wall === 'black' ? 'black' : 'stone';
    const matLow = (lv) => (lv <= 1 ? (WOODY ? 'shack' : K.wall === 'stone' ? 'rubble' : K.wall) : lv === 2 ? K.wall : WOODY || K.wall === 'white' ? 'stone' : K.wall);
    const matUp = () => (WOODY || L.biome === 'mount' ? (L.biome === 'swamp' ? 'plank' : 'timber') : K.wall);
    const roofKind = (lv) => (FLAT ? 'flat' : lv <= 1 ? (K.roof === 'iron' ? 'iron' : K.roof === 'reed' ? 'reed' : 'thatch') : lv >= 4 && THATCHY ? 'shingle' : K.roof);
    const cheapThatch = (lv) => lv <= 1 && !THATCHY && K.roof !== 'iron' && !FLAT;
    const roofCol = (lv) => (cheapThatch(lv) ? '#c9a85a' : lv >= 4 && !FLAT ? K.roof2 : K.roofC);
    const roofDk = (lv) => (cheapThatch(lv) ? '#8a6a2a' : undefined);
    const DOORW = [40, 48, 54, 62, 70], DOORH = [64, 76, 86, 98, 110];
    const WINW = [28, 34, 36, 38, 40], WINH = [34, 44, 48, 52, 58];
    const snowCap = (x0, x1, y, h) => (SNOW ? `<path d="M${f1(x0)} ${f1(y + 2)} L${f1((x0 + x1) / 2)} ${f1(y - h)} L${f1(x1)} ${f1(y + 2)} l-10 4 L${f1((x0 + x1) / 2)} ${f1(y - h + 12 + 10 * SNOW)} L${f1(x0 + 10)} ${f1(y + 6)} Z" fill="#f6fafd" ${O(2.5)}/>` : '');
    // 26.10: деления циферблата (12, крупные — 3, 6, 9, 12)
    const clockTicks = (x, y, r) => { let d = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, k = i % 3 ? 0.84 : 0.72; d += `M${f1(x + Math.sin(a) * r * k)} ${f1(y - Math.cos(a) * r * k)} L${f1(x + Math.sin(a) * r * 0.92)} ${f1(y - Math.cos(a) * r * 0.92)}`; } return `<path d="${d}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="${INK}"/>`; };
    const orb = (x, y, r = 7) => `<path d="M${f1(x)} ${f1(y - r - 16)} V${f1(y - r)}" stroke="${INK}" stroke-width="3"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${GOLD}" ${O(2.5)}/>`;
    const pennant = (x, y, c) => `<path d="M${f1(x)} ${f1(y)} v-28 l24 8 l-24 8" fill="${c}" ${O(2.5)}/>`;
    const banner = (x, y, w, h, c, lv) => `<path d="M${f1(x - w / 2)} ${f1(y)} H${f1(x + w / 2)} V${f1(y + h)} l${f1(-w / 2)} -12 l${f1(-w / 2)} 12 Z" fill="${c}" ${O(3)}/><path d="M${f1(x - w / 2 - 4)} ${f1(y)} H${f1(x + w / 2 + 4)}" stroke="${lv >= 5 ? GOLD : K.woodD}" stroke-width="5" stroke-linecap="round"/>`
      + `<circle cx="${f1(x)}" cy="${f1(y + h * 0.42)}" r="${f1(w * 0.26)}" fill="${lv >= 5 ? GOLD : '#d8c8a0'}" ${O(2)}/>`;
    const wallLamp = (x, y) => `<circle cx="${f1(x)}" cy="${f1(y + 10)}" r="22" fill="#ffd27a" opacity=".22"/><path d="M${f1(x - 10)} ${f1(y - 6)} h10 v6" stroke="${INK}" stroke-width="3.5" fill="none"/><path d="M${f1(x - 7)} ${f1(y)} h14 l-2 18 h-10 Z" fill="#ffd76a" ${O(2.5)}/>`;
    // гирлянда огней (5): от края до края под карнизом
    function garland(x0, x1, y, sag) {
      let g = `<path d="M${f1(x0)} ${f1(y)} Q${f1((x0 + x1) / 2)} ${f1(y + sag * 2)} ${f1(x1)} ${f1(y)}" stroke="${INK}" stroke-width="2.5" fill="none"/>`;
      const n = Math.max(4, Math.round((x1 - x0) / 36));
      for (let i = 1; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, yy = y + 4 * sag * t * (1 - t); g += `<circle cx="${f1(x)}" cy="${f1(yy + 6)}" r="5.5" fill="${['#ffd76a', '#ff8a5c', '#6fdc6f', '#4ab0ff', '#e8455c'][i % 5]}" ${O(1.5)}/>`; }
      return g;
    }
    // купол (5; пустыня — вместо шпиля): барабан, луковица, золотые рёбра, навершие; y — низ барабана
    function dome(cx, y, r, col) {
      const y0 = y - 22;
      return `<rect x="${f1(cx - r * 0.78)}" y="${f1(y0)}" width="${f1(r * 1.56)}" height="24" fill="${K.plaster}" ${O(3.5)}/>`
        + `<path d="M${f1(cx - r)} ${f1(y0)} C${f1(cx - r)} ${f1(y0 - r * 1.1)} ${f1(cx - r * 0.2)} ${f1(y0 - r * 1.2)} ${f1(cx)} ${f1(y0 - r * 1.45)} C${f1(cx + r * 0.2)} ${f1(y0 - r * 1.2)} ${f1(cx + r)} ${f1(y0 - r * 1.1)} ${f1(cx + r)} ${f1(y0)} Z" fill="${col}" ${O()}/>`
        + `<path d="M${f1(cx)} ${f1(y0)} V${f1(y0 - r * 1.42)} M${f1(cx - r * 0.55)} ${f1(y0)} Q${f1(cx - r * 0.5)} ${f1(y0 - r)} ${f1(cx)} ${f1(y0 - r * 1.42)} M${f1(cx + r * 0.55)} ${f1(y0)} Q${f1(cx + r * 0.5)} ${f1(y0 - r)} ${f1(cx)} ${f1(y0 - r * 1.42)}" stroke="${GOLD}" stroke-width="3" fill="none"/>`
        + (SNOW ? `<path d="M${f1(cx - r * 0.7)} ${f1(y0 - r * 0.85)} Q${f1(cx)} ${f1(y0 - r * 1.6)} ${f1(cx + r * 0.7)} ${f1(y0 - r * 0.85)} Q${f1(cx)} ${f1(y0 - r * 1.15)} ${f1(cx - r * 0.7)} ${f1(y0 - r * 0.85)} Z" fill="#f6fafd"/>` : '')
        + orb(cx, y0 - r * 1.45 - 8, 7);
    }
    // башенка (4–5) у края здания: стены, окно, конус (пустыня — купол), вымпел или флаг с золотым шаром, знамя на стене
    function turret(x, tw, B, tTop, lv, c) {
      let g = wall(x - tw / 2, tTop, tw, B, stoneMat) + winLit(f1(x - 9), f1(tTop + 20), 18, 30, !(RUIN && lv < 4), true);
      const rh = lv >= 5 ? 70 : 56;
      if (FLAT) {
        g += `<path d="M${f1(x - tw / 2 - 4)} ${f1(tTop + 2)} Q${f1(x - tw / 2)} ${f1(tTop - rh * 0.9)} ${f1(x)} ${f1(tTop - rh)} Q${f1(x + tw / 2)} ${f1(tTop - rh * 0.9)} ${f1(x + tw / 2 + 4)} ${f1(tTop + 2)} Z" fill="${lv >= 5 ? K.roof2 : K.roofC}" ${O()}/>`;
      } else g += `<path d="M${f1(x - tw / 2 - 10)} ${f1(tTop + 4)} L${f1(x)} ${f1(tTop - rh)} L${f1(x + tw / 2 + 10)} ${f1(tTop + 4)} Z" fill="${K.roof2}" ${O()}/>` + snowCap(x - tw / 2 - 10, x + tw / 2 + 10, tTop + 2, rh);
      if (lv >= 5) g += `<path d="M${f1(x - tw / 2 - 8)} ${f1(tTop + 3)} L${f1(x)} ${f1(tTop - rh + 4)} L${f1(x + tw / 2 + 8)} ${f1(tTop + 3)}" stroke="${GOLD}" stroke-width="3.5" fill="none"/>` + orb(x, tTop - rh - 6, 6) + flag(f1(x), f1(tTop - rh - 28), c);
      else g += pennant(x, tTop - rh, c);
      return g + banner(x, tTop + 60, Math.min(28, tw * 0.5), lv >= 5 ? 76 : 60, c, lv);
    }
    // дверь по уровню: 1 — доски; 3 — каменная арка; 4 — крыльцо; 5 — колонны, фронтон, два фонаря; 2+ — фонарь у двери
    function bigDoor(x, B, lv, c, k = 1) {
      const w = DOORW[lv - 1] * k, h = DOORH[lv - 1] * Math.min(1.3, k);
      let g = '';
      if (lv >= 5) for (const s of [-1, 1]) { const px = x + s * (w / 2 + 24); g += `<rect x="${f1(px - 9)}" y="${f1(B - h - 8)}" width="18" height="${f1(h + 8)}" fill="#efe8d8" ${O(3)}/><path d="M${f1(px - 4)} ${f1(B - h)} V${f1(B - 6)}" stroke="${INK}" stroke-width="1.5" opacity=".3"/><rect x="${f1(px - 13)}" y="${f1(B - h - 16)}" width="26" height="10" fill="${GOLD}" ${O(2.5)}/>`; }
      if (lv >= 5) g += `<path d="M${f1(x - w / 2 - 42)} ${f1(B - h - 14)} L${f1(x)} ${f1(B - h - 36)} L${f1(x + w / 2 + 42)} ${f1(B - h - 14)} Z" fill="#efe8d8" ${O(3)}/><circle cx="${f1(x)}" cy="${f1(B - h - 22)}" r="5" fill="${GOLD}"/>`;
      if (lv >= 3) { const ar = w / 2 + 9, ay = B - h + w / 2; let vs = ''; for (let i = 1; i < 7; i++) { const a = Math.PI * i / 7; vs += `M${f1(x - Math.cos(a) * (w / 2))} ${f1(ay - Math.sin(a) * (w / 2))} L${f1(x - Math.cos(a) * ar)} ${f1(ay - Math.sin(a) * ar)}`; }
        g += `<path d="M${f1(x - ar)} ${B} V${f1(ay)} A${f1(ar)} ${f1(ar)} 0 0 1 ${f1(x + ar)} ${f1(ay)} V${B} Z" fill="${lv >= 5 ? GOLDD : K.stone}" ${O(3.5)}/><path d="${vs}M${f1(x - ar)} ${f1(ay + 14)} h9 M${f1(x + ar)} ${f1(ay + 14)} h-9 M${f1(x - ar)} ${f1(ay + 34)} h9 M${f1(x + ar)} ${f1(ay + 34)} h-9" stroke="${INK}" stroke-width="2" opacity=".45"/>`
          + `<path d="M${f1(x - 7)} ${f1(ay - ar - 3)} h14 l-3 14 h-8 Z" fill="${lv >= 5 ? GOLD : LT(K.stone, 0.12)}" ${O(2.5)}/>`; }
      g += door(f1(x), B, f1(w), f1(h), c || K.woodD);
      if (lv <= 1) g += `<path d="M${f1(x - w / 2 + 4)} ${f1(B - h * 0.3)} L${f1(x + w / 2 - 4)} ${f1(B - h * 0.62)}" stroke="${K.wood}" stroke-width="5" opacity=".9"/>`;
      if (lv >= 4) g += `<path d="M${f1(x - w / 2 - 18)} ${B + 5} h${f1(w + 36)} v-6 h-8 v-5 h${f1(-w - 20)} v5 h-8 Z" fill="${K.stone}" ${O(2.5)}/>`;
      if (lv >= 2) g += wallLamp(x + w / 2 + (lv >= 5 ? 52 : 22), B - h + 6) + (lv >= 5 ? wallLamp(x - w / 2 - 52, B - h + 6) : '');
      return g;
    }
    const signW = (t, lv, w) => Math.min(w - 16, Math.max(lv <= 1 ? 96 : 150, t.length * (lv <= 1 ? 14 : 20) + 40));
    // вывеска по уровню: 1 — доска краской, криво прибита; 2–3 — вывеска; 4 — в золотой рамке; 5 — и корона сверху
    // 24.10: где нарисованы вывески каждого здания (SIGNS[id] = [[x0, y0, x1, y1], …]) — чтобы ярлык города (city.js) их не закрывал (тест)
    let SIGN_ID = null;
    const SIGNS = {};
    const signAt = (r) => { if (SIGN_ID) (SIGNS[SIGN_ID] = SIGNS[SIGN_ID] || []).push(r.map(f1)); };
    function signLv(x, y, w, t, lv, size = 24, bg) {
      signAt(lv <= 1 ? [x - w / 2 - 4, y - 22, x + w / 2 + 4, y + 22] : [x - w / 2 - 5, y - (lv >= 5 ? 50 : 31), x + w / 2 + 5, y + 31]);
      if (lv <= 1) {
        const s = Math.min(18, size * 0.75);
        return `<g transform="rotate(-3 ${f1(x)} ${f1(y)})"><rect x="${f1(x - w / 2)}" y="${f1(y - 17)}" width="${f1(w)}" height="34" rx="3" fill="${K.wood}" ${O(3)}/><path d="M${f1(x - w / 2 + 4)} ${f1(y + 1)} H${f1(x + w / 2 - 4)}" stroke="${K.woodD}" stroke-width="2" opacity=".5"/>`
          + `<circle cx="${f1(x - w / 2 + 7)}" cy="${f1(y - 9)}" r="2.5" fill="${INK}"/><circle cx="${f1(x + w / 2 - 7)}" cy="${f1(y - 9)}" r="2.5" fill="${INK}"/>${txt(x, y + s * 0.36, t, s, '#f3efd8')}</g>`;
      }
      let g = sign(x, y, w, t, size, bg);
      if (lv >= 4) g = `<rect x="${f1(x - w / 2 - 5)}" y="${f1(y - 31)}" width="${f1(w + 10)}" height="62" rx="13" fill="${lv >= 5 ? GOLD : GOLDD}" ${O(3)}/>` + g;
      if (lv >= 5) g += `<path d="M${f1(x - 22)} ${f1(y - 30)} l5 -18 l10 9 l7 -15 l7 15 l10 -9 l5 18 Z" fill="${GOLD}" ${O(2.5)}/>`;
      return g;
    }
    // окно по уровню: 1 — маленькое со ставнями; 3+ — ящик с цветами под нижними; 4+ — арочное; 5 — золотая рамка
    function winLv(x, y, lv, lit, lower) {
      const w = WINW[lv - 1], h = WINH[lv - 1];
      let g = winLit(f1(x), f1(y), w, h, lit, lv >= 4);
      if (lv <= 1) g += `<rect x="${f1(x - 12)}" y="${f1(y - 2)}" width="11" height="${h + 4}" fill="${K.woodD}" ${O(2.5)}/><rect x="${f1(x + w + 1)}" y="${f1(y - 2)}" width="11" height="${h + 4}" fill="${K.woodD}" ${O(2.5)}/>`;
      if (lv >= 3 && lower && FLOWERS) { g += `<rect x="${f1(x - 6)}" y="${f1(y + h)}" width="${w + 12}" height="11" fill="${K.woodD}" ${O(2.5)}/>`; for (let i = 0; i < 4; i++) g += `<circle cx="${f1(x - 1 + i * (w + 2) / 3)}" cy="${f1(y + h - 2)}" r="5" fill="${['#e8455c', '#ffd76a', '#b9a2ff', '#ff8a5c'][i]}" ${O(1.5)}/>`; }
      if (lv >= 5) g += `<path d="M${f1(x - 5)} ${f1(y + h + 3)} V${f1(y + w / 2)} A${f1(w / 2 + 5)} ${f1(w / 2 + 5)} 0 0 1 ${f1(x + w + 5)} ${f1(y + w / 2)} V${f1(y + h + 3)}" stroke="${GOLD}" stroke-width="3.5" fill="none"/>`;
      return g;
    }
    // трещины руин (1–2 сильнее, 3 — одна; 4–5 — отстроено)
    const cracks = (x0, w, top, B, lv) => (RUIN && lv <= 3 ? `<path d="M${f1(x0 + w * 0.3)} ${f1(top + 10)} l12 30 l-10 22 l14 30${lv <= 2 ? ` M${f1(x0 + w * 0.8)} ${f1(B - 60)} l-14 24` : ''}" stroke="${INK}" stroke-width="3" fill="none" opacity=".6"/>` : '');

    /**
     * Здание по рамке f (towngen frame) и уровню f.lv: стены (1–2 — один этаж, 3+ — два с карнизом), крыша, окна, дверь, вывеска,
     * мелочи уровня. o: { id, sign, signBg, signSize, dx (дверь, если не по центру), doorC, doorK, one (один этаж), tower (середина
     * крыши занята башней), chimney, roofH, dome (5: купол вместо крыши), noTurrets, noWin, lowWin(x, y, w, h) (своё вместо нижних окон),
     * avoid / avoidUp ([x0, x1] — где окон не ставить), mat / matUp / roof / roofC (свои материалы) }. → { g, top, mid, B, cx, rh, two, tw }
     */
    function edifice(f, o) {
      const lv = f.lv, x0 = f.x0, x1 = f.x1, w = x1 - x0, B = f.B, top = B - f.wall, cx = o.dx != null ? o.dx : (x0 + x1) / 2;
      const flat = o.roof ? o.roof === 'flat' : FLAT;
      const rh = Math.round(o.roofH || Math.min([62, 80, 96, 108, 118][lv - 1], w * 0.45, f.up - 8));
      const two = lv >= 3 && !o.one, mid = two ? Math.round(B - f.wall * 0.5) : B;
      const tw = lv >= 4 && !o.noTurrets ? Math.round(Math.max(40, Math.min(58, w * 0.15))) : 0;
      let g = '';
      if (B < 795) {   // сваи болота и сходни к двери
        g += stilts(x0, x1, 795) + `<path d="M${f1(cx - 30)} ${B} L${f1(cx - 40)} 797 H${f1(cx + 40)} L${f1(cx + 30)} ${B} Z" fill="${K.wood}" ${O(3)}/><path d="M${f1(cx - 34)} ${B + 18} H${f1(cx + 34)} M${f1(cx - 37)} ${B + 36} H${f1(cx + 37)}" stroke="${K.woodD}" stroke-width="3"/>`;
      }
      if (two) g += wall(x0, mid, w, B, o.mat || matLow(lv)) + wall(x0, top, w, mid, o.matUp || matUp(lv)) + `<path d="M${x0 - 6} ${mid} H${x1 + 6}" stroke="${lv >= 5 ? GOLD : K.woodD}" stroke-width="8" stroke-linecap="round"/>`;
      else g += wall(x0, top, w, B, o.mat || matLow(lv));
      g += cracks(x0, w, top, B, lv);
      const ruined = RUIN && lv <= 2 && o.ruin !== false;
      if (o.dome && lv >= 5 && !flat) {   // 5: купол вместо крыши (столичное)
        g += `<rect x="${x0 - 12}" y="${top - 18}" width="${w + 24}" height="22" fill="${K.stone}" ${O()}/><path d="M${x0 - 12} ${top - 18} H${x1 + 12}" stroke="${GOLD}" stroke-width="4"/>` + dome(cx, top - 18, Math.min(74, w * 0.24), K.roof2);
      } else {
        g += roof(x0, x1, top, flat ? 0 : rh, flat ? 'flat' : o.roof || roofKind(lv), o.roofC || roofCol(lv), ruined, roofDk(lv));
        if (flat && lv <= 1) for (let x = x0 - 6; x < x1; x += 26) g += `<path d="M${f1(x)} ${top - 20} q14 -18 30 -4" stroke="${K.leaf[0]}" stroke-width="7" fill="none" stroke-linecap="round"/>`;   // пальмовые листья на кровле
        if (flat && lv >= 5 && !o.tower && o.dome !== false) g += dome(cx, top - 22, Math.min(56, w * 0.18), K.roof2);
      }
      if (!flat && !(o.dome && lv >= 5)) {
        const apex = top - rh;
        if (lv <= 1 && !ruined) g += `<rect x="${f1(cx - w * 0.24)}" y="${f1(top - rh * 0.44)}" width="24" height="16" fill="${K.woodD}" opacity=".45" transform="rotate(-14 ${f1(cx - w * 0.24)} ${f1(top - rh * 0.44)})"/><rect x="${f1(cx + w * 0.12)}" y="${f1(top - rh * 0.3)}" width="20" height="14" fill="#8a7a5a" opacity=".5"/>`;
        if (lv >= 5) g += `<path d="M${f1(x0 - 18)} ${top + 1} L${f1(cx)} ${f1(apex + 6)} L${f1(x1 + 18)} ${top + 1}" stroke="${GOLD}" stroke-width="5" fill="none" stroke-linejoin="round"/>`;
        if (lv >= 4 && !o.tower) g += lv >= 5 ? orb(cx, apex - 8, 8) : `<path d="M${f1(cx)} ${f1(apex)} v-24" stroke="${INK}" stroke-width="4"/><circle cx="${f1(cx)}" cy="${f1(apex - 26)}" r="5" fill="${K.roof2}" ${O(2)}/>`;
      }
      // окна: нижний ряд по краям (не у двери), верхний (3+) — по краям от вывески
      const lit = !(RUIN && lv <= 2), dw = DOORW[lv - 1] * (o.doorK || 1), WW = WINW[lv - 1], WH = WINH[lv - 1];
      const sw = o.sign ? signW(o.sign, lv, w) : 0;
      const pad = (tw ? tw - 4 : 0) + 14;
      const busy = [[cx - dw / 2 - (lv >= 5 ? 66 : 14), cx + dw / 2 + (lv >= 5 ? 66 : lv >= 2 ? 40 : 14)], ...(o.avoid || [])];
      const clear = (a, b, list) => list.every(([p, q]) => b < p || a > q);
      if (!o.noWin) {
        const yLow = two ? mid + 22 : lv <= 1 ? top + Math.max(18, (f.wall - WH) * 0.32) : top + 64;
        const cand = lv <= 1 ? [x0 + pad] : [x0 + pad, x1 - pad - WW];
        for (const x of cand) if (clear(x - 6, x + WW + 6, busy) && x + WW < x1 - 6) g += o.lowWin ? o.lowWin(x, yLow, WW, WH) : winLv(x, yLow, lv, lit && (lv > 1 || x < cx), true);
        if (two) {
          const n = w - 2 * pad > 340 ? 3 : 2, yUp = top + 18, sr = sw ? [[cx - sw / 2 - 8, cx + sw / 2 + 8]] : [];
          for (let i = 0; i < n; i++) { const x = x0 + pad + (w - 2 * pad - WW) * (i / (n - 1)); if (clear(x - 4, x + WW + 4, sr.concat(o.avoidUp || []))) g += winLv(x, yUp, lv, lit, false); }
        }
      }
      if (o.door !== false) g += bigDoor(cx, B, lv, o.doorC, o.doorK);
      if (o.sign) {
        const sy = lv <= 1 ? (flat ? top - 16 : top - rh * 0.36) : two ? top + (mid - top) * 0.45 : top + 30;
        g += signLv(cx + (o.signDx || 0), sy, lv <= 1 ? Math.min(sw, (w + 30) * 0.6) : sw, o.sign, lv, o.signSize || 24, o.signBg);
      }
      if (lv >= 3 && o.chimney !== false && !flat && !o.tower) {   // труба на скате справа, с 3 — дым
        const chx = cx + w * 0.26, ry = top - rh * (1 - (w * 0.26) / (w / 2 + 22));
        g = chimney(chx, ry - 40, 26, 54, lv)
          + `<circle cx="${f1(chx + 6)}" cy="${f1(ry - 62)}" r="11" fill="#c8c4d0" opacity=".45"/><circle cx="${f1(chx + 18)}" cy="${f1(ry - 84)}" r="15" fill="#c8c4d0" opacity=".3"/>` + g;
      }
      if (lv >= 3 && !flat && !(o.dome && lv >= 5) && o.gutter !== false) g += gutter(x0, x1, top, B, lv);   // 26.10: водосток
      if (o.stoop !== false) g += stoop(x0, x1, B, lv, cx, dw, busy.slice(1).concat(o.avoid || []), o.stoopSides || 3);   // 26.10: мелочи у входа
      if (tw) { const ext = lv >= 5 ? 56 : 38; for (const s of [-1, 1]) g += turret(s < 0 ? x0 + tw / 2 - 8 : x1 - tw / 2 + 8, tw, B, top - ext, lv, BAN[o.id] || '#7a1a2a'); }
      if (lv >= 5 && !o.noGarland) g += garland(x0 + tw + 4, x1 - tw - 4, two ? mid - 20 : top + 62, 6);   // под вывеской (над карнизом или над колоннами)
      return { g, top, mid, B, cx, rh, two, tw };
    }

    const ART = {};
    /* ---- Ворота: 1 — столбы с перекладиной и табличкой; 2 — частокол с крышей; 3 — каменная башня с аркой; 4 — + две башни;
       5 — большая надвратная крепость: высокие башни, золото, знамёна. Табличка с именем города — всегда. ---- */
    ART.gate = (lot) => {
      const f = L.fr.gate, lv = f.lv, x0 = f.x0, x1 = f.x1, w = x1 - x0, cx = (lot.x0 + lot.x1) / 2, B = 795, top = B - f.wall;
      const nm = L.name.toUpperCase().slice(0, 14), long = L.name.length > 10;
      let g = `<g data-ol="gate" data-lv="${lv}">`;
      const ow = [96, 112, 140, 140, 150][lv - 1];   // проём
      if (lv <= 2) {
        // частокол по краям проёма
        let gr = '';
        for (let x = x0; x < x1; x += 22) if (x < cx - ow / 2 - 20 || x > cx + ow / 2 + 2) { const tY = top + (lv <= 1 ? 70 : 34) + R() * 14; g += `<path d="M${x} ${B} V${f1(tY)} l11 -16 l11 16 V${B} Z" fill="${K.wood}" ${O(3)}/>`; gr += `M${x + 7} ${f1(tY + 8)} v${f1((B - tY) * 0.4)} M${x + 14} ${f1(tY + (B - tY) * 0.5)} v${f1((B - tY) * 0.3)}`; }
        g += `<path d="${gr}" stroke="${K.woodD}" stroke-width="1.6" opacity=".6"/>`;
        for (const yy of [top + (lv <= 1 ? 100 : 70), B - 40]) for (const [a, b] of [[x0, cx - ow / 2 - 20], [cx + ow / 2 + 2, x1]]) if (b - a > 10) g += `<path d="M${f1(a)} ${f1(yy)} H${f1(b)}" stroke="${INK}" stroke-width="7"/><path d="M${f1(a)} ${f1(yy)} H${f1(b)}" stroke="#c8a86a" stroke-width="3.5" stroke-dasharray="7 3"/>`;   // 26.10: обвязка верёвкой
        const pw = lv <= 1 ? 20 : 26, py = top + (lv <= 1 ? 6 : 0);
        g += `<rect x="${f1(cx - ow / 2 - pw)}" y="${f1(py)}" width="${pw}" height="${f1(B - py)}" fill="${K.woodD}" ${O(4)}/><rect x="${f1(cx + ow / 2)}" y="${f1(py)}" width="${pw}" height="${f1(B - py)}" fill="${K.woodD}" ${O(4)}/>`;
        if (lv <= 1) g += `<rect x="${f1(cx - ow / 2 - pw - 10)}" y="${f1(py + 16)}" width="${f1(ow + pw * 2 + 20)}" height="18" fill="${K.wood}" ${O(3.5)}/>`;
        else g += `<rect x="${f1(cx - ow / 2 - pw - 14)}" y="${top + 20}" width="${f1(ow + pw * 2 + 28)}" height="34" fill="${K.wood}" ${O(4)}/>` + roof(cx - ow / 2 - pw - 14, cx + ow / 2 + pw + 14, top + 20, 70, FLAT ? 'shingle' : K.roof === 'iron' ? 'iron' : K.roof) + pennant(cx, top - 50, BAN.gate);
        g += `<path d="M${f1(cx - ow / 2)} ${B} V${f1(top + 60)} H${f1(cx + ow / 2)} V${B}" fill="#2a2030" opacity=".55"/><path d="M${f1(cx - ow / 2 + 2)} ${B} V${f1(top + 70)} L${f1(cx - 4)} ${f1(top + 66)} V${B} Z M${f1(cx + ow / 2 - 2)} ${B} V${f1(top + 70)} L${f1(cx + 4)} ${f1(top + 66)} V${B} Z" fill="${K.woodD}" ${O(3)} opacity=".95"/>`;
        { let pl = '', bd = '', st = ''; for (const sd of [-1, 1]) { const a = cx + sd * 4, b = cx + sd * (ow / 2 - 2); for (let k = 1; k < 4; k++) { const xx = a + (b - a) * k / 4; pl += `M${f1(xx)} ${f1(top + 72)} V${B - 2}`; }
            for (const yy of [top + 96, B - 34]) { bd += `M${f1(Math.min(a, b) + 2)} ${f1(yy)} H${f1(Math.max(a, b) - 2)}`; for (let k = 0; k < 4; k++) st += `M${f1(Math.min(a, b) + 7 + k * (Math.abs(b - a) - 14) / 3)} ${f1(yy)}h0.1`; } }
          g += `<path d="${pl}" stroke="${INK}" stroke-width="2" opacity=".5"/><path d="${bd}" stroke="#3a3640" stroke-width="7"/><path d="${st}" stroke="#a9b1b6" stroke-width="4" stroke-linecap="round"/>`; }
        g += signLv(cx, lv <= 1 ? py + 25 : top + 37, lv <= 1 ? Math.min(w + 10, Math.max(140, nm.length * 13 + 30)) : Math.min(w + 20, Math.max(200, L.name.length * 20 + 40)), nm, Math.max(1, lv), long ? 20 : 24) + '</g>';
        return g + (lv >= 2 ? torch(x0 + 12, B - 150) + torch(x1 - 12, B - 150) : torch(cx + ow / 2 + pw / 2, B - 92));   // 1 — на правом столбе ворот, ниже вывески
      }
      // каменная надвратная башня (3), с башнями (4–5)
      const tw = lv >= 4 ? Math.round(Math.min(78, w * 0.26)) : 0, bx0 = x0 + 10 + (tw ? tw - 20 : 0), bx1 = x1 - 10 - (tw ? tw - 20 : 0);
      g += wall(bx0, top + 20, bx1 - bx0, B, stoneMat);
      for (let x = bx0; x < bx1 - 16; x += 40) g += `<rect x="${x}" y="${top - 4}" width="26" height="28" fill="${K.wall === 'black' ? '#2e2a30' : K.stone}" ${O(3)}/>`;
      if (SNOW) g += `<path d="M${bx0} ${top + 22} H${bx1}" stroke="#f6fafd" stroke-width="7"/>`;
      const ah = Math.min(f.wall - 70, 190);
      g += `<path d="M${f1(cx - ow / 2)} ${B} V${f1(B - ah + ow / 2)} A${ow / 2} ${ow / 2} 0 0 1 ${f1(cx + ow / 2)} ${f1(B - ah + ow / 2)} V${B} Z" fill="#2a2030" ${O(4)}/><path d="M${f1(cx - ow / 2 + 10)} ${B} V${f1(B - ah + ow / 2 + 4)} A${ow / 2 - 10} ${ow / 2 - 10} 0 0 1 ${f1(cx + ow / 2 - 10)} ${f1(B - ah + ow / 2 + 4)} V${B}" stroke="${lv >= 5 ? GOLD : K.woodD}" stroke-width="6" fill="none"/>`;
      { let pv = '', sp = ''; for (let x = cx - ow / 2 + 20; x <= cx + ow / 2 - 20; x += 25) { pv += `M${f1(x)} ${f1(B - ah + 20)} V${f1(B - ah + 90)}`; sp += `M${f1(x - 4)} ${f1(B - ah + 90)} l4 10 l4 -10 Z`; }
        g += `<path d="${pv}" stroke="${INK}" stroke-width="8"/><path d="${pv}" stroke="#5a5462" stroke-width="5"/><path d="M${f1(cx - ow / 2 + 12)} ${f1(B - ah + 54)} H${f1(cx + ow / 2 - 12)}" stroke="${INK}" stroke-width="8"/><path d="M${f1(cx - ow / 2 + 12)} ${f1(B - ah + 54)} H${f1(cx + ow / 2 - 12)}" stroke="#5a5462" stroke-width="5"/><path d="${sp}" fill="#8a8e9e" ${O(1.5)}/>`; }   // решётка поднята, зубья снизу
      for (const sx of [bx0 + 26, bx1 - 26]) g += `<path d="M${sx} ${top + 70} v34" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${sx - 7} ${top + 86} h14" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;   // 26.10: бойницы
      if (lv >= 4) for (const tx of [x0 + tw / 2, x1 - tw / 2]) {
        const tt = top - (lv >= 5 ? 60 : 30);
        g += wall(tx - tw / 2, tt, tw, B, stoneMat) + winLit(f1(tx - 10), f1(tt + 34), 20, 34, true, true) + banner(tx, tt + 96, Math.min(34, tw * 0.45), lv >= 5 ? 96 : 76, BAN.gate, lv);
        const rh = lv >= 5 ? 90 : 70;
        g += FLAT ? `<path d="M${f1(tx - tw / 2 - 4)} ${tt + 2} Q${f1(tx - tw / 2)} ${f1(tt - rh * 0.9)} ${f1(tx)} ${f1(tt - rh)} Q${f1(tx + tw / 2)} ${f1(tt - rh * 0.9)} ${f1(tx + tw / 2 + 4)} ${tt + 2} Z" fill="${lv >= 5 ? K.roof2 : K.roofC}" ${O()}/>`
          : `<path d="M${f1(tx - tw / 2 - 12)} ${tt + 4} L${f1(tx)} ${tt - rh} L${f1(tx + tw / 2 + 12)} ${tt + 4} Z" fill="${K.roof2}" ${O()}/>` + snowCap(tx - tw / 2 - 12, tx + tw / 2 + 12, tt + 2, rh);
        g += lv >= 5 ? `<path d="M${f1(tx - tw / 2 - 10)} ${tt + 3} L${f1(tx)} ${tt - rh + 4} L${f1(tx + tw / 2 + 10)} ${tt + 3}" stroke="${GOLD}" stroke-width="3.5" fill="none"/>` + orb(tx, tt - rh - 6, 7) + flag(f1(tx), tt - rh - 30, '#c8402a') : pennant(tx, tt - rh, '#c8402a');
      } else g += flag(bx0 + 20, top - 4) + flag(bx1 - 20, top - 4);
      const sw = Math.min(bx1 - bx0 + 10, Math.max(200, L.name.length * 20 + 40));
      g += signLv(cx, B - ah - 34, sw, nm, lv, long ? 22 : 26);
      if (lv >= 5) g += garland(bx0 + 8, bx1 - 8, top + 30, 12);
      g += '</g>';
      return g + torch(x0 + 24, B - 155) + torch(x1 - 24, B - 155);
    };

    /* ---- Ратуша: 1 — изба со звонницей на коньке; 2 — деревянная башенка с часами; 3 — каменный низ, второй этаж, башня с часами;
       4 — + башенки по краям, знамёна; 5 — шпиль с золотом, золотые часы, колонны, гирлянда. Столица — дворец лорда (PALACE). ---- */
    ART.hall = (lot) => {
      const f = L.fr.hall, lv = f.lv;
      if (CAP) return PALACE(lot, f);
      const cx = (f.x0 + f.x1) / 2;
      const e = edifice(f, { id: 'hall', sign: 'РАТУША', signSize: 24, tower: lv >= 2, chimney: false, roofH: [68, 82, 96, 104, 112][lv - 1] });
      let g = `<g data-ol="hall" data-lv="${lv}">` + e.g;
      if (lv <= 1) {   // звонница на коньке
        const by = e.top - e.rh;
        g += `<path d="M${f1(cx - 18)} ${f1(by + 16)} V${f1(by - 42)} M${f1(cx + 18)} ${f1(by + 16)} V${f1(by - 42)}" stroke="${K.woodD}" stroke-width="7"/><path d="M${f1(cx - 28)} ${f1(by - 38)} L${f1(cx)} ${f1(by - 60)} L${f1(cx + 28)} ${f1(by - 38)} Z" fill="${roofCol(1)}" ${O(3)}/>`
          + `<path d="M${f1(cx - 11)} ${f1(by - 6)} q0 -26 11 -28 q11 2 11 28 Z" fill="#c8902a" ${O(2.5)}/><circle cx="${f1(cx)}" cy="${f1(by - 4)}" r="3.5" fill="${INK}"/>`;
      } else {
        const tH = [0, 66, 116, 136, 156][lv - 1], tW = [0, 52, 66, 74, 82][lv - 1], tR = [0, 46, 60, 70, 92][lv - 1], tt = e.top - tH, tx = cx - tW / 2;
        g += wall(tx, tt, tW, e.top + 2, lv >= 3 ? stoneMat : K.wall);
        if (FLAT) g += `<path d="M${f1(tx - 6)} ${tt + 2} Q${f1(tx - 4)} ${f1(tt - tR)} ${f1(cx)} ${f1(tt - tR - 6)} Q${f1(tx + tW + 4)} ${f1(tt - tR)} ${f1(tx + tW + 6)} ${tt + 2} Z" fill="${lv >= 4 ? K.roof2 : K.roofC}" ${O()}/>`;
        else if (lv >= 5) g += `<path d="M${f1(tx - 12)} ${tt + 4} L${f1(cx)} ${tt - tR} L${f1(tx + tW + 12)} ${tt + 4} Z" fill="${K.roof2}" ${O()}/><path d="M${f1(tx - 10)} ${tt + 3} L${f1(cx)} ${tt - tR + 5} L${f1(tx + tW + 10)} ${tt + 3}" stroke="${GOLD}" stroke-width="4" fill="none"/>` + snowCap(tx - 12, tx + tW + 12, tt + 2, tR);
        else g += roof(tx, tx + tW, tt, tR, lv >= 4 ? 'shingle' : K.roof === 'thatch' || K.roof === 'reed' ? 'shingle' : K.roof, lv >= 3 ? K.roof2 : K.roofC);
        const r = [0, 16, 21, 24, 27][lv - 1];
        g += `<circle cx="${f1(cx)}" cy="${f1(tt + r + 12)}" r="${r}" fill="#f3efd8" ${O(lv >= 5 ? 5 : 3.5, lv >= 5 ? GOLDD : INK)}/>` + clockTicks(cx, tt + r + 12, r) + `<path d="M${f1(cx)} ${f1(tt + r + 12)} V${f1(tt + 16)} M${f1(cx)} ${f1(tt + r + 12)} L${f1(cx + r * 0.55)} ${f1(tt + r * 1.35 + 12)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
        g += lv >= 5 ? orb(cx, tt - tR - 6 - (FLAT ? 6 : 0), 7) + flag(f1(cx), f1(tt - tR - 30 - (FLAT ? 6 : 0)), GOLD) : flag(f1(cx), f1(tt - tR - (FLAT ? 6 : 0)), lv >= 3 ? '#c8402a' : BAN.hall);
      }
      return g + drift(f.x0 + 20, 795, 90) + drift(f.x1 - 30, 795, 70) + '</g>';
    };
    // дворец лорда (Ратуша столицы): 1 — каменная усадьба с одной башней; 2 — две башни; 3 — дворец с часами и знамёнами;
    // 4 — башни выше, золотые шары, навершие; 5 — купол с золотом, флаги, портик с колоннами, гирлянда
    function PALACE(lot, f) {
      const lv = f.lv, x0 = f.x0, x1 = f.x1, cx = (x0 + x1) / 2, B = f.B, top = B - f.wall;
      const tw = [90, 96, 108, 116, 124][lv - 1], tExt = [50, 70, 90, 116, 126][lv - 1], tR = [70, 80, 100, 100, 110][lv - 1];
      const towers = lv <= 1 ? [x0] : [x0, x1 - tw];
      let g = `<g data-ol="hall" data-lv="${lv}">`;
      const bf = { ...f, x0: x0 + tw - 10, x1: lv <= 1 ? x1 : x1 - tw + 10 };
      const e = edifice(bf, { id: 'hall', dx: cx, sign: 'ДВОРЕЦ', signSize: 30, signBg: '#4a1a3a', noTurrets: true, chimney: lv <= 2, tower: lv >= 3 && lv < 5, dome: true, doorK: 1.35, doorC: '#4a2a2a', noGarland: true,
        mat: stoneMat, matUp: K.wall === 'clay' || K.wall === 'black' ? K.wall : K.wall === 'white' ? 'white' : 'stone', roof: FLAT ? 'flat' : THATCHY ? 'slate' : K.roof, roofC: lv >= 2 ? K.roof2 : K.roofC, roofH: [100, 120, 140, 150, 150][lv - 1] });
      for (const tx of towers) {
        const tt = top - tExt, m = tx + tw / 2;
        g += wall(tx, tt, tw, 795, stoneMat) + winLit(f1(m - 18), f1(tt + 50), 36, 56, true, true) + (lv < 3 && 795 - tt > 270 ? winLit(f1(m - 18), f1(tt + 150), 36, 56, true, true) : '');
        if (FLAT) g += `<path d="M${f1(tx - 6)} ${tt + 2} Q${f1(tx)} ${f1(tt - tR * 0.9)} ${f1(m)} ${tt - tR} Q${f1(tx + tw)} ${f1(tt - tR * 0.9)} ${f1(tx + tw + 6)} ${tt + 2} Z" fill="${lv >= 3 ? K.roof2 : K.roofC}" ${O()}/>`;
        else g += `<path d="M${tx - 14} ${tt + 4} L${f1(m)} ${tt - tR} L${tx + tw + 14} ${tt + 4} Z" fill="${K.roof2}" ${O()}/>` + snowCap(tx - 14, tx + tw + 14, tt + 2, tR);
        if (lv >= 4) g += `<path d="M${tx - 12} ${tt + 3} L${f1(m)} ${tt - tR + 5} L${tx + tw + 12} ${tt + 3}" stroke="${GOLD}" stroke-width="${lv >= 5 ? 5 : 3}" fill="none"/>` + orb(m, tt - tR - 6, 8);
        g += lv >= 2 ? flag(f1(m), f1(tt - tR - (lv >= 4 ? 30 : 0)), lv >= 3 ? GOLD : '#c8402a') : pennant(m, tt - tR, '#c8402a');
        if (lv >= 3) g += banner(m, tt + 120, 40, lv >= 5 ? 110 : 90, '#7a1a2a', lv);
      }
      g += e.g;
      if (lv >= 3 && lv < 5) {   // часы на крыше
        const cy = e.top - 50;
        g += `<circle cx="${f1(cx)}" cy="${cy}" r="34" fill="#f3efd8" ${O(4.5, lv >= 4 ? GOLDD : INK)}/>` + clockTicks(cx, cy, 34) + `<path d="M${f1(cx)} ${cy} V${cy - 24} M${f1(cx)} ${cy} L${f1(cx + 18)} ${cy + 10}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` + (lv >= 4 ? orb(cx, e.top - e.rh - 8, 8) : '');
      }
      if (lv >= 4) for (const bx of [cx - 150, cx + 150]) if (bx > bf.x0 + 40 && bx < bf.x1 - 40) g += banner(bx, e.top + 24, 40, 110, '#7a1a2a', lv);
      if (lv >= 5) g += garland(bf.x0 + 10, bf.x1 - 10, e.top + 8, 12);
      return g + '</g>' + torch(x0 + 16, 640) + torch(x1 - 16, 640);   // на стенах башен
    }

    /* ---- Аукцион: 1 — помост под навесом с кафедрой и молотком; 2 — домик с молотком на фронтоне; 3 — зал с колоннами;
       4 — + башенки, золотые капители; 5 — купол, шесть колонн, золото. ---- */
    const gavel = (x, y, s = 1, c = K.wood) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(-30) scale(${s})"><rect x="-24" y="-12" width="48" height="24" rx="6" fill="${c}" ${O(3.5)}/><rect x="-5" y="10" width="10" height="40" rx="4" fill="${K.woodD}" ${O(3)}/></g>`;
    ART.auction = (lot) => {
      const f = L.fr.auction, lv = f.lv, x0 = f.x0, x1 = f.x1, w = x1 - x0, cx = (x0 + x1) / 2, B = f.B, top = B - f.wall;
      let g = `<g data-ol="auction" data-lv="${lv}">`;
      if (lv <= 1) {   // помост под навесом
        if (B < 795) g += stilts(x0, x1, 795);
        const ct = top + 10;
        g += `<rect x="${x0}" y="${B - 30}" width="${w}" height="30" fill="${K.wood}"/>` + planks(x0, B - 30, w, 30) + `<rect x="${x0}" y="${B - 30}" width="${w}" height="30" fill="none" ${O(3.5)}/><path d="M${x0 + 2} ${B - 28} H${x1 - 2}" stroke="${LT(K.wood, 0.25)}" stroke-width="2.5"/>`;
        // 26.10: столбики с канатом перед помостом, ящик с лотом и мешок
        g += `<path d="M${x0 - 14} ${B + 4} V${B - 30} M${x1 + 14} ${B + 4} V${B - 30}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x0 - 14} ${B + 4} V${B - 30} M${x1 + 14} ${B + 4} V${B - 30}" stroke="${GOLDD}" stroke-width="4" stroke-linecap="round"/><path d="M${x0 - 14} ${B - 24} Q${x0} ${B - 10} ${x0 + 2} ${B - 24}" stroke="#a3122a" stroke-width="4" fill="none"/>`
          + putProp('crate', x0 + 22, B - 30, 0.8) + putProp('sack', x1 - 20, B - 30, 0.8);
        for (const x of [x0 + 10, x1 - 10]) g += `<path d="M${x} ${B - 28} V${ct}" stroke="${K.woodD}" stroke-width="9" stroke-linecap="round"/>`;
        const n = 6, sw = (w + 30) / n;
        for (let i = 0; i < n; i++) g += `<path d="M${f1(x0 - 15 + i * sw)} ${ct} h${f1(sw)} l4 30 q${f1(-sw / 2 - 2)} 12 ${f1(-sw - 4)} 0 Z" fill="${i % 2 ? '#f3efd8' : BAN.auction}" ${O(3)}/>`;
        g += `<path d="M${x0 - 15} ${ct} L${f1(cx)} ${ct - 50} L${x1 + 15} ${ct} Z" fill="${BAN.auction}" ${O(3.5)}/>`;
        g += `<path d="M${f1(cx - 24)} ${B - 30} l6 -60 h36 l6 60 Z" fill="${K.woodD}" ${O(3)}/>` + gavel(cx + 4, B - 104, 0.7);
        g += signLv(cx, ct - 4, Math.min(w, 130), 'АУКЦИОН', 1, 20) + '</g>';
        return g;
      }
      const cols = lv >= 3, e = edifice(f, { id: 'auction', sign: 'АУКЦИОН', one: true, noWin: cols, chimney: false, dome: true, roofC: lv >= 2 ? K.roof2 : undefined, roof: THATCHY ? 'shingle' : undefined, mat: lv >= 3 ? 'white' : undefined });
      g += e.g;
      if (cols) {   // колонны по фасаду (не у двери)
        const n = lv >= 5 ? 6 : 4, cw = lv >= 4 ? 24 : 22, ct = e.top + 74, inner = [x0 + (e.tw || 0) + 10, x1 - (e.tw || 0) - 10];
        for (let i = 0; i < n; i++) { const x = inner[0] + 12 + (inner[1] - inner[0] - 24) * i / (n - 1); if (Math.abs(x - cx) < DOORW[lv - 1] / 2 + 34) continue;
          g += `<rect x="${f1(x - cw / 2)}" y="${f1(ct)}" width="${cw}" height="${f1(B - ct)}" fill="#f3efe6" ${O(3.5)}/><path d="M${f1(x - cw / 4)} ${f1(ct + 6)} V${B - 14} M${f1(x)} ${f1(ct + 6)} V${B - 14} M${f1(x + cw / 4)} ${f1(ct + 6)} V${B - 14}" stroke="${INK}" stroke-width="1.5" opacity=".25"/><path d="M${f1(x - cw / 2 + 3)} ${f1(ct + 4)} V${B - 12}" stroke="#ffffff" stroke-width="2.5" opacity=".6"/>`
            + `<rect x="${f1(x - cw / 2 - 5)}" y="${f1(ct - 12)}" width="${cw + 10}" height="13" fill="${lv >= 4 ? GOLD : '#d8d0c0'}" ${O(3)}/><rect x="${f1(x - cw / 2 - 4)}" y="${B - 12}" width="${cw + 8}" height="12" fill="#d8d0c0" ${O(3)}/>`; }
        // 26.10: фриз с зубчиками над колоннами и широкие ступени
        { const a = inner[0] + 4, b = inner[1] - 4; let dn = ''; for (let x = a + 6; x < b - 4; x += 14) dn += `M${f1(x)} ${f1(ct - 20)} h7 v6 h-7 Z `; g += `<rect x="${f1(a)}" y="${f1(ct - 24)}" width="${f1(b - a)}" height="12" fill="#efe8d8" ${O(2.5)}/><path d="${dn}" fill="${lv >= 5 ? GOLD : '#c8c0b0'}"/>`
          + `<path d="M${f1(a - 8)} ${B + 2} H${f1(b + 8)} V${B + 8} H${f1(a - 8)} Z" fill="${LT(K.stone, 0.1)}" ${O(2.5)}/>`; }
      }
      if (!(lv >= 5) && !FLAT) g += gavel(cx, e.top - e.rh * 0.38, lv >= 4 ? 0.9 : 0.75, lv >= 4 ? GOLD : K.wood);
      return g + '</g>';
    };

    /* ---- Тренер: 1 — сарайчик с мишенью; 2 — дом с мишенями; 3 — два этажа, скрещённые мечи; 4 — башенки, щиты; 5 — золотые мечи. ---- */
    const target = (x, y, r) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="#f3efd8" ${O(3.5)}/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.66)}" fill="#e8455c"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.33)}" fill="#f3efd8"/>`;
    const swords = (x, y, s, c) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-40 -40 L34 34 M40 -40 L-34 34" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M-40 -40 L34 34 M40 -40 L-34 34" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M22 34 L44 12 M-22 34 L-44 12" stroke="${INK}" stroke-width="8" stroke-linecap="round"/></g>`;
    ART.trainer = (lot) => {
      const f = L.fr.trainer, lv = f.lv, cx = (f.x0 + f.x1) / 2;
      const e = edifice(f, { id: 'trainer', sign: 'ТРЕНЕР', doorC: lv >= 3 ? '#c56a2a' : undefined, chimney: false, stoop: false,
        lowWin: (x, y, ww, wh) => target(x + ww / 2, y + wh / 2, Math.min(26, ww * 0.75)) });
      let g = `<g data-ol="trainer" data-lv="${lv}">` + e.g;
      if (lv <= 1) g += `<path d="M${f1(f.x1 - 22)} 795 V${f1(e.top + 30)}" stroke="${K.woodD}" stroke-width="7"/>` + target(f.x1 - 22, e.top + 22, 18);
      // 26.10: у входа — тюк соломы (1), стойка с оружием (2+), соломенное чучело (2+), щиты на стене (4+ — у башенок знамёна)
      { const B = e.B, x0 = f.x0, x1 = f.x1;
        if (lv <= 1) g += `<g transform="translate(${f1(x0 + 26)} ${B})"><rect x="-20" y="-22" width="40" height="22" rx="5" fill="#e0c060" ${O(3)}/><path d="M-16 -16 h32 M-16 -8 h32 M-6 -22 v22 M8 -22 v22" stroke="#a8883a" stroke-width="2"/></g>`;
        if (lv >= 2) { const rx = x0 + (lv >= 4 ? 64 : 64); g += `<g transform="translate(${f1(rx)} ${B})"><path d="M-18 0 V-54 M18 0 V-54 M-22 -40 H22 M-22 -12 H22" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-18 0 V-54 M18 0 V-54 M-22 -40 H22 M-22 -12 H22" stroke="${K.wood}" stroke-width="3.5" stroke-linecap="round"/>`
          + `<path d="M-10 -6 V-70 M0 -6 V-66 M10 -6 V-62" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/><path d="M-10 -6 V-70 M0 -6 V-66 M10 -6 V-62" stroke="${K.woodD}" stroke-width="2.5" stroke-linecap="round"/><path d="M-10 -82 l-4 12 h8 Z M0 -78 l-4 12 h8 Z M10 -74 l-4 12 h8 Z" fill="${lv >= 5 ? GOLD : '#c9ccd6'}" ${O(2)}/></g>`; }
        if (lv >= 2) { const dx = x1 - 30; g += `<g transform="translate(${f1(dx)} ${B})"><path d="M0 0 V-52 M-20 -40 H20" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M0 0 V-52 M-20 -40 H20" stroke="${K.woodD}" stroke-width="3.5" stroke-linecap="round"/><ellipse cy="-34" rx="12" ry="16" fill="#e8c95a" ${O(3)}/><circle cy="-58" r="9" fill="#e8c95a" ${O(3)}/><path d="M-4 -60 l3 3 M-1 -60 l-3 3 M2 -60 l3 3 M5 -60 l-3 3 M-8 -30 h16" stroke="${INK}" stroke-width="1.8"/></g>`; }
      }
      if (lv >= 3 && !FLAT) g += swords(cx, e.top - e.rh * 0.42, lv >= 4 ? 0.62 : 0.5, lv >= 5 ? GOLD : '#c9ccd6');
      else if (lv >= 3) g += swords(cx, e.top - 60, 0.55, lv >= 5 ? GOLD : '#c9ccd6');
      return g + drift(f.x1 - 30, 795, 80) + '</g>' + '';
    };

    /* ---- Доска объявлений: 1 — столбы и щит с парой записок; 2 — щит под крышей; 3 — большая доска; 4 — фонари, черепица, знамя;
       5 — беседка: белые колонны, крыша с золотом, много записок. ---- */
    ART.board = (lot) => {
      const f = L.fr.board, lv = f.lv, x0 = f.x0, x1 = f.x1, w = x1 - x0, cx = (x0 + x1) / 2, B = 795, top = B - f.wall;
      let g = `<g data-ol="board" data-lv="${lv}">`;
      const bh = [86, 110, 150, 160, 170][lv - 1], postTop = lv <= 1 ? top - 26 : lv >= 5 ? top - 40 : top - 14;
      if (lv >= 5) for (const x of [x0 + 18, x1 - 18]) g += `<rect x="${x - 12}" y="${postTop}" width="24" height="${B - postTop}" fill="#efe8d8" ${O(3.5)}/><rect x="${x - 16}" y="${postTop - 10}" width="32" height="12" fill="${GOLD}" ${O(3)}/><rect x="${x - 16}" y="${B - 10}" width="32" height="10" fill="#efe8d8" ${O(3)}/>`;
      else g += `<path d="M${x0 + 24} ${B} V${postTop} M${x1 - 24} ${B} V${postTop}" stroke="${INK}" stroke-width="${lv <= 1 ? 15 : 20}" stroke-linecap="round"/><path d="M${x0 + 24} ${B} V${postTop} M${x1 - 24} ${B} V${postTop}" stroke="${K.woodD}" stroke-width="${lv <= 1 ? 8 : 12}" stroke-linecap="round"/>`;
      if (lv >= 2) {
        const rh = [0, 50, 54, 60, 0][lv - 1];
        if (lv >= 5) g += `<rect x="${x0 - 8}" y="${postTop - 24}" width="${w + 16}" height="18" fill="${K.stone}" ${O(3)}/>` + `<path d="M${x0 - 14} ${postTop - 22} Q${f1(cx)} ${postTop - 130} ${x1 + 14} ${postTop - 22} Z" fill="${K.roof2}" ${O()}/><path d="M${x0 - 10} ${postTop - 24} Q${f1(cx)} ${postTop - 124} ${x1 + 10} ${postTop - 24}" stroke="${GOLD}" stroke-width="4" fill="none"/>` + orb(cx, postTop - 84, 8) + snowCap(x0, x1, postTop - 24, 50);
        else g += roof(x0 + 8, x1 - 8, postTop, rh, FLAT ? 'shingle' : roofKind(lv), roofCol(lv), RUIN && lv <= 2, roofDk(lv));
      }
      // 26.10: щит из досок (2+), столбы с волокнами и каменными башмаками, «Разыскивается» (2+), карта округа (3+)
      g += `<path d="M${x0 + 24} ${postTop + 6} V${B - 6} M${x1 - 24} ${postTop + 6} V${B - 6}" stroke="${LT(K.woodD, 0.22)}" stroke-width="2" opacity="${lv >= 5 ? 0 : 0.7}"/>` + (lv >= 2 && lv < 5 ? `<rect x="${x0 + 10}" y="${B - 16}" width="28" height="18" rx="4" fill="${K.stone}" ${O(3)}/><rect x="${x1 - 38}" y="${B - 16}" width="28" height="18" rx="4" fill="${K.stone}" ${O(3)}/>` : '');
      g += `<rect x="${x0 + 14}" y="${top}" width="${w - 28}" height="${bh}" rx="8" fill="${K.wood}" ${O(4)}/>` + (lv >= 2 ? planks(x0 + 18, top + 4, w - 36, bh - 8) + `<rect x="${x0 + 14}" y="${top}" width="${w - 28}" height="${bh}" rx="8" fill="none" ${O(4)}/>` : `<path d="M${x0 + 18} ${top + bh / 2} H${x1 - 18}" stroke="${K.woodD}" stroke-width="2.5" opacity=".6"/><circle cx="${x0 + 22}" cy="${top + 8}" r="2.4" fill="${INK}"/><circle cx="${x1 - 22}" cy="${top + 8}" r="2.4" fill="${INK}"/>`) + (lv >= 4 ? `<rect x="${x0 + 20}" y="${top + 6}" width="${w - 40}" height="${bh - 12}" rx="5" fill="none" stroke="${lv >= 5 ? GOLD : GOLDD}" stroke-width="3"/>` : '');
      const note = (x, y, nw, nh, r, c) => `<g transform="rotate(${r} ${f1(x + nw / 2)} ${f1(y)})"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(nw)}" height="${nh}" fill="${c}" ${O(2.5)}/>${[0, 1, 2].map((i) => `<path d="M${f1(x + 7)} ${f1(y + 13 + i * 11)} H${f1(x + nw - 7 - (i === 2 ? 12 : 0))}" stroke="${INK}" stroke-width="2.5" opacity=".45"/>`).join('')}<circle cx="${f1(x + nw / 2)}" cy="${f1(y + 4)}" r="4" fill="#e8455c"/></g>`;
      const iw = w - 50, C = ['#fff3c8', '#f3efd8', '#ffe0a0'];
      const rows = bh > 120 ? 2 : 1, per = lv <= 1 ? 2 : lv >= 5 ? 4 : 3;
      for (let r = 0; r < rows; r++) for (let i = 0; i < per - (r && lv < 5 ? 1 : 0); i++) { const n = per - (r && lv < 5 ? 1 : 0), nw = iw / n * 0.82; g += note(x0 + 26 + i * iw / n, top + 14 + r * 72, nw, 54, ((i * 7 + r * 3) % 9) - 4, C[(i + r) % 3]); }
      if (lv >= 2) { const wx = x1 - 30 - 44, wy = top + bh - 62; g += `<g transform="rotate(3 ${wx + 22} ${wy})"><rect x="${wx}" y="${wy}" width="44" height="54" fill="#efe0b8" ${O(2.5)}/><text x="${wx + 22}" y="${wy + 11}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="7.5" fill="#6a2a22">РОЗЫСК</text><circle cx="${wx + 22}" cy="${wy + 28}" r="9" fill="#d8b48a" stroke="${INK}" stroke-width="1.8"/><path d="M${wx + 16} ${wy + 26} h4 M${wx + 24} ${wy + 26} h4 M${wx + 17} ${wy + 33} q5 3 10 0" stroke="${INK}" stroke-width="1.6" fill="none"/><path d="M${wx + 8} ${wy + 46} H${wx + 36}" stroke="#6a2a22" stroke-width="3"/><circle cx="${wx + 22}" cy="${wy + 3}" r="3.5" fill="#e8455c"/></g>`; }
      if (lv >= 3) { const mx = x0 + 28, my = top + bh - 50; g += `<g transform="rotate(-2 ${mx} ${my})"><rect x="${mx}" y="${my}" width="58" height="40" fill="#e8d8a8" ${O(2.5)}/><path d="M${mx + 6} ${my + 30} q10 -14 20 -6 q10 8 26 -12" stroke="#4ab0ff" stroke-width="2.5" fill="none"/><path d="M${mx + 10} ${my + 12} l6 -4 l6 4 M${mx + 36} ${my + 34} l5 -5 l5 5" stroke="#6a8a3a" stroke-width="2" fill="none"/><path d="M${mx + 40} ${my + 10} l6 6 M${mx + 46} ${my + 10} l-6 6" stroke="#e8455c" stroke-width="2.5"/><circle cx="${mx + 4}" cy="${my + 4}" r="2.6" fill="#4a4a4f"/><circle cx="${mx + 54}" cy="${my + 4}" r="2.6" fill="#4a4a4f"/></g>`; }
      if (lv === 3) g += wallLamp(x1 - 24, top - 16);
      if (lv >= 5) g += putProp('topiary', x0 - 6, B + 2, 0.85) + putProp('topiary', x1 + 6, B + 2, 0.85);
      g += signLv(cx, lv <= 1 ? postTop - 4 : lv >= 5 ? postTop - 56 : postTop - 20, lv <= 1 ? Math.min(w - 10, 110) : Math.min(w + 10, 170), 'ДОСКА', lv, 24);
      if (lv >= 4) g += wallLamp(x0 + 24, top - 16) + wallLamp(x1 - 24, top - 16);
      if (lv >= 4) g += `<rect x="${f1(cx - 46)}" y="${B - 26}" width="92" height="10" fill="${K.wood}" ${O(2.5)}/><path d="M${f1(cx - 38)} ${B - 16} v16 M${f1(cx + 38)} ${B - 16} v16" stroke="${K.woodD}" stroke-width="5"/>`;   // лавочка
      g += '</g>';
      return g + drift(cx, 795, 120);
    };

    /* ---- Склад: 1 — дощатый сарай; 2 — амбар с ящиками; 3 — каменный низ, ключ на фронтоне; 4 — башенки, лебёдка с ящиком;
       5 — золотой ключ, гирлянда. Ворота амбара — шире обычной двери. ---- */
    ART.storage = (lot) => {
      const f = L.fr.storage, lv = f.lv, x0 = f.x0, x1 = f.x1, cx = (x0 + x1) / 2;
      const e = edifice(f, { id: 'storage', sign: 'СКЛАД', doorK: 1.5, one: lv <= 3, chimney: false, mat: lv >= 2 && lv <= 3 && WOODY ? 'plank' : undefined });
      let g = `<g data-ol="storage" data-lv="${lv}">` + e.g;
      const dw = DOORW[lv - 1] * 1.5, dh = DOORH[lv - 1] * 1.3;
      g += `<path d="M${f1(cx)} ${f1(e.B - dh + dw / 2 - 6)} V${e.B}" stroke="${INK}" stroke-width="3"/>` + (lv <= 3 ? `<path d="M${f1(cx - dw / 2 + 6)} ${f1(e.B - dh * 0.55)} L${f1(cx - 6)} ${e.B - 8} M${f1(cx + dw / 2 - 6)} ${f1(e.B - dh * 0.55)} L${f1(cx + 6)} ${e.B - 8}" stroke="${K.wood}" stroke-width="6"/>` : '');
      if (lv >= 3 && !FLAT) { const ky = e.top - e.rh * 0.42; g += `<circle cx="${f1(cx)}" cy="${f1(ky)}" r="${lv >= 5 ? 19 : 15}" fill="${lv >= 5 ? GOLD : '#ffd76a'}" ${O(3.5)}/><path d="M${f1(cx - 5)} ${f1(ky - 6)} h10 l-3 8 h-4 Z" fill="${INK}"/>`; }
      const crate = (x, y, w) => `<rect x="${f1(x)}" y="${f1(y - w)}" width="${w}" height="${w}" fill="${K.wood}" ${O(3.5)}/><path d="M${f1(x)} ${f1(y - w)} L${f1(x + w)} ${f1(y)} M${f1(x + w)} ${f1(y - w)} L${f1(x)} ${f1(y)}" stroke="${K.woodD}" stroke-width="3.5"/>`;
      if (lv <= 3) g += crate(Math.max(lot.x0 - 10, x0 - 46), 798, 44) + (lv >= 2 ? crate(Math.max(lot.x0 - 6, x0 - 40) + 6, 754, 36) : '');
      if (lv >= 4 && !FLAT) {   // лебёдка: балка из фронтона, верёвка, ящик
        const by = e.top - e.rh * 0.2;
        g += `<path d="M${f1(cx)} ${f1(by)} H${f1(cx + 70)}" stroke="${K.woodD}" stroke-width="10" stroke-linecap="round"/><path d="M${f1(cx + 62)} ${f1(by)} V${f1(by + 70)}" stroke="${INK}" stroke-width="2.5"/>` + crate(cx + 46, by + 104, 34);
      }
      return g + '</g>';
    };

    /* ---- Кузня: 1 — мастерская с жестяной трубой; 2 — кирпичная труба; 3 — каменная, мехи, дым; 4 — две трубы, знамёна;
       5 — золотые колпаки труб, золотая наковальня на фронтоне, сильный жар. Горн — слева у двери. ---- */
    ART.forge = (lot) => {
      const f = L.fr.forge, lv = f.lv, x0 = f.x0, x1 = f.x1, w = x1 - x0, dx = (lot.fx0 + lot.x1) / 2;
      const mw = [64, 76, 88, 96, 104][lv - 1], mx = x0 + 16 + (lv >= 4 ? 40 : 0);
      const e = edifice(f, { id: 'forge', sign: 'КУЗНЯ', signSize: 26, dx, chimney: false, avoid: [[mx - 8, mx + mw + 8]] });
      let g = `<g data-ol="forge" data-lv="${lv}">`;
      // трубы — за крышей (рисуются раньше)
      const chim = (x, ch, cw) => {
        if (lv <= 1) return `<rect x="${f1(x - 8)}" y="${f1(e.top - ch)}" width="16" height="${ch + 10}" fill="#8a8e9e" ${O(3)}/><path d="M${f1(x - 12)} ${f1(e.top - ch)} h24" stroke="${INK}" stroke-width="5"/>`;
        return chimney(x, e.top - ch, cw, ch + 20, lv, lv >= 3 ? '#6e6a7c' : '#9a5a44') + `<rect x="${f1(x - cw / 2 - 5)}" y="${f1(e.top - ch - 8)}" width="${cw + 10}" height="12" fill="${lv >= 5 ? GOLD : '#5a5662'}" ${O(3)}/><ellipse cx="${f1(x)}" cy="${f1(e.top - ch - 8)}" rx="${f1(cw / 2 - 2)}" ry="5" fill="#ff8a2a" opacity=".8"/>`
          + (lv >= 3 ? `<path d="M${f1(x - cw / 2 - 2)} ${f1(e.top - ch + 40)} h${cw + 4}" stroke="${INK}" stroke-width="7"/><path d="M${f1(x - cw / 2 - 2)} ${f1(e.top - ch + 40)} h${cw + 4}" stroke="#4a4a55" stroke-width="3.5"/>` : '');
      };
      const ch = [96, 112, 140, 160, 180][lv - 1], cw = [16, 34, 42, 46, 50][lv - 1];
      const cxs = lv >= 4 ? [x1 - e.tw - 30, x0 + e.tw + 34] : [x1 - 58];
      let smoke = '';
      for (const x of cxs) { const hh = ch - (x < dx ? 30 : 0); smoke += chim(x, hh, cw); for (let i = 0; i < (lv >= 3 ? 3 : 2); i++) smoke += `<circle cx="${f1(x + i * 14)}" cy="${f1(e.top - hh - 26 - i * 30)}" r="${12 + i * 6}" fill="#8a8698" opacity="${(0.42 - i * 0.12).toFixed(2)}"/>`; }
      g += smoke + e.g;
      // горн: огненный зев слева от двери
      const mt = e.B - [56, 68, 80, 88, 96][lv - 1];
      g += `<path d="M${f1(mx)} ${e.B} V${f1(mt + mw / 2)} A${f1(mw / 2)} ${f1(mw / 2.4)} 0 0 1 ${f1(mx + mw)} ${f1(mt + mw / 2)} V${e.B} Z" fill="#3a1a14" ${O(4)}/><ellipse cx="${f1(mx + mw / 2)}" cy="${f1(e.B - 34)}" rx="${f1(mw * 0.75)}" ry="${f1(mw * 0.6)}" fill="url(#tgFire)"${lv >= 5 ? '' : ' opacity=".85"'}/>`;
      if (lv >= 3) g += `<path d="M${f1(mx + mw + 6)} ${e.B - 18} l26 -16 l8 10 l-26 16 Z" fill="#7a4a3a" ${O(2.5)}/>`;   // мехи
      if (lv >= 5 && !FLAT) g += `<g transform="translate(${f1(dx)} ${f1(e.top - e.rh * 0.4)}) scale(.62)"><path d="M-40 0 L-30 -22 H30 L40 0 Z" fill="${GOLD}" ${O(4)}/><path d="M-50 -22 H44 L58 -42 H-64 Q-80 -42 -76 -34 Z" fill="${GOLD}" ${O(4)}/></g>`;
      else if (lv >= 3 && !FLAT) g += `<g transform="translate(${f1(dx)} ${f1(e.top - e.rh * 0.4)}) rotate(-30)"><rect x="-4" y="-6" width="8" height="34" rx="3" fill="${K.woodD}" ${O(2.5)}/><rect x="-16" y="-18" width="32" height="16" rx="3" fill="#a9b1b6" ${O(2.5)}/></g>`;
      return g + '</g>';
    };
    /* ---- Заточка (навес у Кузни; наковальня, табличка и кузнец — на тех же местах при любом уровне, HOT в towngen):
       1 — навес из досок, наковальня на пне, ведро; 2 — горн и бочка; 3 — каменный горн с колпаком, стойка с инструментом;
       4 — черепица, знамя, фонарь; 5 — золотая отделка, два фонаря, сияющие клинки. ---- */
    ART.anvil = (lot) => {
      const lv = L.fr.anvil.lv, x0 = lot.x0, fx0 = lot.fx0, ax = lot.anvil, B = 795;
      const ryL = 612, ryR = [570, 556, 540, 528, 514][lv - 1];
      const ry = (x) => ryL + (ryR - ryL) * (x - x0) / (fx0 - x0);
      let g = `<g data-ol="anvil" data-lv="${lv}">`;
      // 26.10: задняя стена под навесом — доски (1–2) или кладка (3+), в тени навеса; на ней — подковы, клещи, полка с точилами
      { const bp = `M${x0} ${ryL} L${fx0} ${ryR} V${B + 10} H${x0} Z`, cid = clipId(bp);
        g += `<clipPath id="${cid}"><path d="${bp}"/></clipPath><g clip-path="url(#${cid})">${lv >= 3 ? wall(x0, ryR - 4, fx0 - x0, B + 10, stoneMat) : wall(x0, ryR - 4, fx0 - x0, B + 10, 'shack')}</g>`;
        g += `<path d="${bp}" fill="#231c2e" opacity="${lv >= 3 ? 0.55 : 0.5}"/>`; }
      { const shoe = (x, y, c = '#8a8e9e') => `<path d="M${f1(x - 7)} ${f1(y)} V${f1(y - 6)} A7 7 0 0 1 ${f1(x + 7)} ${f1(y - 6)} V${f1(y)}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${f1(x - 7)} ${f1(y)} V${f1(y - 6)} A7 7 0 0 1 ${f1(x + 7)} ${f1(y - 6)} V${f1(y)}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
        const wx = fx0 - 40;   // справа на стене, над кузнецом — не за наковальней
        g += shoe(wx, 690, lv >= 5 ? GOLD : '#8a8e9e');
        if (lv >= 2) g += shoe(wx - 22, 694) + shoe(wx + 18, 694) + `<path d="M${x0 + 26} ${B + 10} q24 -22 48 0 Z" fill="#2a2430" ${O(2.5)}/><path d="M${x0 + 34} ${B + 4} h4 M${x0 + 50} ${B - 2} h5 M${x0 + 62} ${B + 3} h4" stroke="#ff8a2a" stroke-width="3" stroke-linecap="round"/>`;   // кучка угля у горна
        if (lv >= 3) g += `<path d="M${fx0 - 70} 730 H${fx0 - 14}" stroke="${INK}" stroke-width="8"/><path d="M${fx0 - 70} 730 H${fx0 - 14}" stroke="${K.wood}" stroke-width="4.5"/><rect x="${fx0 - 64}" y="719" width="16" height="10" rx="2" fill="#8a8e9e" ${O(2)}/><rect x="${fx0 - 44}" y="721" width="20" height="8" rx="2" fill="#6a6676" ${O(2)}/>`;   // полка с точильными камнями
        if (lv >= 4) g += `<g transform="translate(${fx0 - 44} 650)"><path d="M-16 -18 H16 V2 Q16 18 0 24 Q-16 18 -16 2 Z" fill="${BAN.anvil}" ${O(3)}/><path d="M0 -14 V18 M-12 -2 H12" stroke="${lv >= 5 ? GOLD : '#c9ccd6'}" stroke-width="4"/></g>`;   // щит
      }
      // горн (2+)
      if (lv >= 2) {
        const hy = lv >= 3 ? 664 : 680;
        g += `<rect x="${x0 + 20}" y="${hy}" width="90" height="${B + 10 - hy}" fill="${lv >= 3 ? '#6a5a5a' : '#7a4a3a'}" ${O(3.5)}/><path d="M${x0 + 34} ${B + 10} V730 A31 24 0 0 1 ${x0 + 96} 730 V${B + 10} Z" fill="#ff8a2a" ${O(3)}/><ellipse cx="${x0 + 65}" cy="745" rx="70" ry="54" fill="url(#tgFire)"/>`;
        if (lv >= 3) g += `<path d="M${x0 + 14} ${hy} L${x0 + 30} ${hy - 40} H${x0 + 100} L${x0 + 116} ${hy} Z" fill="#5a4a4a" ${O(3)}/>`;
      }
      // стойка с инструментом (3+): молоты и клещи на задней стене, справа от горна
      if (lv >= 3) { const tx = x0 + 126; g += `<path d="M${tx} 672 H${tx + 56}" stroke="${K.woodD}" stroke-width="6"/>`; for (let i = 0; i < 3; i++) g += `<path d="M${tx + 8 + i * 18} 674 v40" stroke="${K.woodD}" stroke-width="4"/><rect x="${tx + 2 + i * 18}" y="708" width="12" height="9" fill="${lv >= 5 ? '#e8eef4' : '#8a8e9e'}" ${O(2)}/>`; }
      // навес
      const rc = lv >= 4 ? K.roof2 : K.woodD;
      { const rp = `M${x0 - 6} ${ryL - 2} L${fx0 + 8} ${ryR - 8} L${fx0 + 8} ${ryR + 14} L${x0 - 2} ${ryL + 20} Z`;
        if (lv >= 4) { const cid = clipId(rp); g += `<clipPath id="${cid}"><path d="${rp}"/></clipPath><path d="${rp}" fill="${rc}"/><g clip-path="url(#${cid})">${roofRows(K.roof === 'slate' || K.roof === 'iron' ? K.roof : 'shingle', x0 - 10, fx0 + 12, ryR - 10, ryL + 22, rc, DK(rc, 0.38))}</g><path d="${rp}" fill="none" ${O(3.5)}/>`; }
        else { let bd = ''; for (let x = x0 + 22; x < fx0; x += 22) bd += `M${f1(x)} ${f1(ry(x) - 3)} v${lv <= 1 ? 20 : 21}`; g += `<path d="${rp}" fill="${rc}" ${O(3.5)}/><path d="${bd}" stroke="${INK}" stroke-width="2" opacity=".55"/><path d="M${x0} ${ryL + 2} L${fx0 + 4} ${ryR - 4}" stroke="${LT(rc, 0.25)}" stroke-width="2" opacity=".6"/>`; } }
      if (lv <= 1) g += `<path d="M${x0 + 40} ${f1(ry(x0 + 40) + 2)} l0 14 M${x0 + 110} ${f1(ry(x0 + 110) - 2)} l0 14" stroke="#231c2e" stroke-width="5"/>`;   // щели в досках
      if (lv >= 5) g += `<path d="M${x0 - 4} ${ryL + 18} L${fx0 + 8} ${ryR + 12}" stroke="${GOLD}" stroke-width="4"/>`;
      if (SNOW) g += `<path d="M${x0 - 6} ${ryL - 6} L${fx0 + 8} ${ryR - 12} l0 8 L${x0 - 2} ${ryL + 4} Z" fill="#f6fafd" ${O(2)}/>`;
      g += `<rect x="${x0 + 2}" y="${ryL + 8}" width="${lv <= 1 ? 10 : 14}" height="${B + 30 - ryL - 8}" fill="${K.woodD}" ${O(3)}/><rect x="${fx0 - 10}" y="${ryR + 10}" width="${lv <= 1 ? 10 : 14}" height="${B + 20 - ryR - 10}" fill="${K.woodD}" ${O(3)}/>`
        + `<path d="M${x0 + 6} ${ryL + 14} V${B + 24} M${fx0 - 6} ${ryR + 16} V${B + 14}" stroke="${LT(K.woodD, 0.2)}" stroke-width="1.6" opacity=".7"/>`
        + (lv >= 2 ? `<path d="M${x0 + 2} ${ryL + 30} l${lv <= 1 ? 10 : 14} 0 M${fx0 - 10} ${ryR + 30} l14 0" stroke="#3a3640" stroke-width="4"/><path d="M${x0 + 16} ${ryL + 26} l18 -10 M${fx0 - 10} ${ryR + 34} l-18 -14" stroke="${K.woodD}" stroke-width="6" stroke-linecap="round"/>` : '');   // скобы и подкосы
      if (lv >= 4) g += banner(x0 + 9, ryL + 26, 22, 56, BAN.anvil, lv) + wallLamp(fx0 - 30, ry(fx0 - 30) + 26);
      if (lv >= 5) g += wallLamp(x0 + 22, 696);
      // наковальня (место HOT «Наковальня»): 1 — на пне
      if (lv <= 1) g += `<path d="M${ax - 30} 812 V790 H${ax + 30} V812 Z" fill="${K.wood}" ${O(3)}/><ellipse cx="${ax}" cy="790" rx="30" ry="6" fill="#d8b48a" ${O(2.5)}/>`;
      g += `<g data-ol="anv"><g transform="translate(${ax} ${lv <= 1 ? 792 : 810})${lv <= 1 ? ' scale(.85)' : ''}"><path d="M-40 0 L-30 -22 H30 L40 0 Z" fill="#4a4a55" ${O(4)}/><path d="M-50 -22 H44 L58 -42 H-64 Q-80 -42 -76 -34 Z" fill="${lv >= 5 ? '#7a7a8b' : '#5d5d6b'}" ${O(4)}/>${lv >= 5 ? `<path d="M-50 -38 H40" stroke="${GOLD}" stroke-width="3"/>` : ''}</g></g>`;
      // бочка с водой (2+) / ведро (1)
      g += lv <= 1 ? `<g transform="translate(${x0 + 30} 832)"><path d="M-14 -30 H14 L11 0 H-11 Z" fill="${K.wood}" ${O(3)}/><ellipse cx="0" cy="-30" rx="14" ry="4" fill="#4ab0ff" opacity=".7"/></g>`
        : `<g transform="translate(${x0 + 18} 834)"><rect x="-22" y="-50" width="44" height="52" rx="8" fill="${K.wood}" ${O(3.5)}/><path d="M-22 -36 H22 M-22 -14 H22" stroke="${K.woodD}" stroke-width="4"/></g><ellipse cx="${x0 + 18}" cy="788" rx="17" ry="5" fill="#4ab0ff" opacity=".7"/>`;
      g += '</g>';
      // табличка «Заточка» под навесом (место HOT «Табличка»)
      { const bx = ax - 96, by = 604, bw = 176, bh = 54;
        signAt([bx - 5, by - 5, bx + bw + 5, by + bh + 5]);
        g += `<g data-ol="sign anvil"><path d="M${bx + 30} ${f1(ry(bx + 30) + 10)} V${by} M${bx + bw - 30} ${f1(ry(bx + bw - 30) + 10)} V${by}" stroke="${lv >= 5 ? GOLD : '#8a8e9e'}" stroke-width="4"/>`
          + (lv >= 4 ? `<rect x="${bx - 5}" y="${by - 5}" width="${bw + 10}" height="${bh + 10}" rx="10" fill="${lv >= 5 ? GOLD : GOLDD}" ${O(3)}/>` : '')
          + `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${lv <= 1 ? 3 : 7}" fill="${K.wood}" ${O(3.5)}${lv <= 1 ? ` transform="rotate(-2 ${bx + bw / 2} ${by + bh / 2})"` : ''}/><path d="M${bx + 6} ${by + 19} H${bx + bw - 6} M${bx + 6} ${by + 37} H${bx + bw - 6}" stroke="${K.woodD}" stroke-width="2.5" opacity=".6"/>`
          + `<g transform="translate(${bx + 26} ${by + 28}) rotate(-35)"><rect x="-3" y="-4" width="6" height="24" rx="2" fill="${K.woodD}" ${O(2.5)}/><rect x="-12" y="-14" width="24" height="12" rx="2" fill="#a9b1b6" ${O(2.5)}/></g>`
          + `<text x="${bx + 104}" y="${by + 35}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="22" fill="${INK}">ЗАТОЧКА</text></g>`; }
      return g;
    };

    /* ---- Шатёр: 1 — маленький конус; 2 — полосатый шатёр с вымпелом; 3 — большой шатёр; 4 — + два малых шатра по бокам;
       5 — три купола с золотыми навершиями, флажки, огни. ---- */
    ART.tent = (lot) => {
      const f = L.fr.tent, lv = f.lv, x0 = f.x0, x1 = f.x1, w = x1 - x0, cx = (x0 + x1) / 2, B = 795, top = B - f.wall;
      const [c1, c2] = L.biome === 'desert' ? K.awning : L.biome === 'ash' ? ['#7a1a1a', '#2e2a30'] : L.biome === 'ice' ? ['#3a6aa8', '#f2f6fa'] : ['#8a3a8a', '#ffc94d'];
      let g = `<g data-ol="tent" data-lv="${lv}">`;
      const cone = (a, b, t, h, n, apexC, curved) => {
        const m = (a + b) / 2;
        let s = '';
        const sw = (b - a) / n;
        for (let i = 0; i < n; i++) s += `<path d="M${f1(a + i * sw)} ${B} L${f1(a + i * sw + (i < n / 2 ? 6 : -6))} ${f1(t)} L${f1(a + (i + 1) * sw + (i < n / 2 ? 6 : -6))} ${f1(t)} L${f1(a + (i + 1) * sw)} ${B} Z" fill="${i % 2 ? c2 : c1}" ${O(3.5)}/>`;
        // 26.10: швы полотнищ (пунктир), складки, свет слева, тень справа, подол
        { let st = '', fo = ''; for (let i = 1; i < n; i++) { const xb = a + i * sw, xt = xb + (i < n / 2 ? 6 : -6); st += `M${f1(xb + 4)} ${B - 4} L${f1(xt + 4)} ${f1(t + 4)}`; }
          for (let i = 0; i < n; i++) { const xm = a + (i + 0.5) * sw; fo += `M${f1(xm)} ${B - 6} q-3 ${f1(-(B - t) * 0.4)} 1 ${f1(-(B - t) * 0.8)}`; }
          s += `<path d="${st}" stroke="${INK}" stroke-width="1.6" stroke-dasharray="5 5" opacity=".45"/><path d="${fo}" stroke="${INK}" stroke-width="2" fill="none" opacity=".18"/><path d="M${f1(a)} ${B} L${f1(a + 6)} ${f1(t)} L${f1(a + sw * 0.6)} ${f1(t)} L${f1(a + sw * 0.5)} ${B} Z" fill="#ffffff" opacity=".12"/><path d="M${f1(b - sw * 0.6)} ${B} L${f1(b - sw * 0.6)} ${f1(t)} L${f1(b - 6)} ${f1(t)} L${f1(b)} ${B} Z" fill="${INK}" opacity=".14"/><path d="M${f1(a)} ${B - 3} H${f1(b)}" stroke="${DK(c1, 0.3)}" stroke-width="6"/>`; }
        s += curved ? `<path d="M${f1(a - 20)} ${f1(t + 6)} Q${f1(m)} ${f1(t - h * 2)} ${f1(b + 20)} ${f1(t + 6)} Z" fill="${c1}" ${O()}/>` : `<path d="M${f1(a - 16)} ${f1(t + 6)} L${f1(m)} ${f1(t - h)} L${f1(b + 16)} ${f1(t + 6)} Z" fill="${c1}" ${O()}/>`;
        const ay = curved ? t - h : t - h;
        for (let i = 1; i < 6; i++) s += `<path d="M${f1(m)} ${f1(ay)} L${f1(a - 20 + (b - a + 40) * i / 6)} ${f1(t + 4)}" stroke="${c2}" stroke-width="${curved ? 9 : 6}"/>`;
        if (curved || lv >= 2) { const sn = Math.max(4, Math.round((b - a) / 44)); for (let i = 0; i < sn; i++) { const xx = a - 20 + (b - a + 40) * (i + 0.5) / sn, hw = (b - a + 40) / sn / 2; s += `<path d="M${f1(xx - hw)} ${f1(t + 4)} q${f1(hw)} 22 ${f1(hw * 2)} 0" fill="${i % 2 ? c1 : c2}" ${O(3)}/>`; } }
        if (SNOW) s += curved ? `<path d="M${f1(a - 10)} ${f1(t)} Q${f1(m)} ${f1(t - h * 1.9)} ${f1(b + 10)} ${f1(t)} Q${f1(m)} ${f1(t - h * 1.6)} ${f1(a - 10)} ${f1(t)} Z" fill="#f6fafd" ${O(2.5)}/>` : snowCap(a - 16, b + 16, t + 4, h);
        s += `<path d="M${f1(m)} ${f1(ay)} V${f1(ay - 26)}" stroke="${INK}" stroke-width="5"/>` + (apexC === 'gold' ? orb(m, ay - 32, 8) + flag(f1(m), f1(ay - 56), c2) : apexC ? pennant(m, ay - 26, c2) : '');
        return s;
      };
      if (lv >= 4) {   // малые шатры по бокам (за большим)
        const sw = Math.min(110, w * 0.28), st = top + 50;
        g += cone(x0, x0 + sw, st, lv >= 5 ? 90 : 70, 2, lv >= 5 ? 'gold' : 1, false) + cone(x1 - sw, x1, st, lv >= 5 ? 90 : 70, 2, lv >= 5 ? 'gold' : 1, false);
      }
      const mx0 = lv >= 4 ? x0 + Math.min(110, w * 0.28) * 0.62 : x0, mx1 = lv >= 4 ? x1 - Math.min(110, w * 0.28) * 0.62 : x1;
      const dh = [70, 90, 110, 116, 120][lv - 1];
      g += cone(mx0, mx1, top, lv <= 1 ? f.up - 30 : lv >= 5 ? f.up - 108 : f.up - 60, lv <= 1 ? 4 : 6, lv >= 5 ? 'gold' : lv >= 2 ? 1 : 0, lv >= 2);
      if (lv >= 5) g += garland(mx0 + 8, mx1 - 8, top + 24, 12);   // концы — на полотне шатра
      // 26.10: растяжки с колышками (у каждого шатра — по краям)
      { let rp = '', pg = ''; for (const [a, b] of [[mx0, mx1]]) for (const sd of [-1, 1]) { const ex = sd < 0 ? a - 16 : b + 16, gx = sd < 0 ? a - 46 : b + 46; rp += `M${f1(ex)} ${f1(top + 8)} L${f1(gx)} ${B + 2}`; pg += `M${f1(gx - 3)} ${B + 8} l6 -16`; }
        g += `<path d="${rp}" stroke="${INK}" stroke-width="2.4"/><path d="${pg}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="${pg}" stroke="${K.wood}" stroke-width="3" stroke-linecap="round"/>`; }
      // вход: полог, с 2 — тёплый свет изнутри, с 3 — подвязан шнуром и ковёр у входа
      g += `<path d="M${f1(cx - 44)} ${B} L${f1(cx - 10)} ${B - dh} H${f1(cx + 10)} L${f1(cx + 44)} ${B} Z" fill="#2a1e30" ${O(3.5)}/>` + (lv >= 2 ? `<path d="M${f1(cx - 34)} ${B} L${f1(cx - 6)} ${B - dh + 16} H${f1(cx + 6)} L${f1(cx + 34)} ${B} Z" fill="#ffb84a" opacity=".35"/><ellipse cx="${f1(cx)}" cy="${B - 10}" rx="26" ry="10" fill="#ffd76a" opacity=".3"/>` : '')
        + (lv >= 3 ? `<path d="M${f1(cx - 46)} ${B + 2} H${f1(cx + 46)} L${f1(cx + 54)} ${B + 14} H${f1(cx - 54)} Z" fill="${lv >= 5 ? '#a3122a' : DK(c1, 0.1)}" ${O(2.5)}/><path d="M${f1(cx - 40)} ${B + 8} H${f1(cx + 40)}" stroke="${lv >= 5 ? GOLD : c2}" stroke-width="2" stroke-dasharray="6 4"/>` : '');
      if (lv >= 3) g += `<path d="M${f1(cx - 10)} ${B - dh} Q${f1(cx - 40)} ${B - dh * 0.5} ${f1(cx - 52)} ${B} M${f1(cx + 10)} ${B - dh} Q${f1(cx + 40)} ${B - dh * 0.5} ${f1(cx + 52)} ${B}" stroke="${c2}" stroke-width="8" fill="none"/><circle cx="${f1(cx - 36)}" cy="${B - dh * 0.4}" r="5" fill="${lv >= 5 ? GOLD : c2}" ${O(2)}/><circle cx="${f1(cx + 36)}" cy="${B - dh * 0.4}" r="5" fill="${lv >= 5 ? GOLD : c2}" ${O(2)}/>`;
      g += signLv(cx, B - dh - 32, Math.min(mx1 - mx0 - 10, lv <= 1 ? 104 : 170), 'ШАТЁР', lv, 24, '#4a1a4a');
      if (lv >= 2) g += poleLamp(cx + 66, B + 2);   // фонарь на столбе у входа, стоит на земле (не факел на ткани)
      return g + '</g>';
    };

    /* ---- Лавка: 1 — прилавок под тентом на шестах; 2 — домик с навесом и товаром; 3 — два этажа; 4 — боковые лотки, ящики;
       5 — торговый дом: аркада, золото, гирлянда. ---- */
    ART.shop = (lot) => {
      const f = L.fr.shop, lv = f.lv, x0 = f.x0, x1 = f.x1, w = x1 - x0, cx = (x0 + x1) / 2;
      const aw = K.awning || ['#3f8f3a', '#f3efd8'];
      const goods = (a, b, y, n) => { let s = '', hl = ''; for (let i = 0; i < n; i++) { const gx = a + (b - a) * (i + 0.5) / n; s += `<circle cx="${f1(gx)}" cy="${f1(y)}" r="11" fill="${['#e8455c', '#ffd76a', '#6fdc6f', '#ff8a5c', '#b06bff', '#4ab0ff'][i % 6]}" ${O(2.5)}/>`; hl += `M${f1(gx - 5)} ${f1(y - 3)} q2 -4 6 -4`; } return s + `<path d="${hl}" stroke="#ffffff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>`; };
      const awning = (a, b, y, n, drop = 44) => { let s = ''; const sw = (b - a) / n; for (let i = 0; i < n; i++) s += `<path d="M${f1(a + i * sw)} ${f1(y)} h${f1(sw)} l5 ${drop} q${f1(-sw / 2 - 2.5)} 14 ${f1(-sw - 5)} 0 Z" fill="${i % 2 ? aw[1] : aw[0]}" ${O(3)}/>`; return s; };
      let g = `<g data-ol="shop" data-lv="${lv}">`;
      if (lv <= 1) {   // прилавок под тентом
        const B = f.B, t = B - f.wall;
        if (B < 795) g += stilts(x0, x1, 795) + `<rect x="${x0 - 6}" y="${B - 4}" width="${w + 12}" height="10" fill="${K.wood}" ${O(3)}/>`;
        g += `<path d="M${x0 + 8} ${B} V${t} M${x1 - 8} ${B} V${t}" stroke="${K.woodD}" stroke-width="8" stroke-linecap="round"/>`;
        g += `<path d="M${x0 - 10} ${t + 10} L${x0 + 6} ${t - 26} H${x1 - 6} L${x1 + 10} ${t + 10} Z" fill="${aw[0]}" ${O(3.5)}/>` + awning(x0 - 10, x1 + 10, t + 10, 5, 30);
        g += `<rect x="${x0 + 14}" y="${B - 52}" width="${w - 28}" height="52" fill="${K.wood}" ${O(3.5)}/><path d="M${x0 + 14} ${B - 30} H${x1 - 14}" stroke="${K.woodD}" stroke-width="3"/>` + goods(x0 + 20, x1 - 20, B - 62, 4);
        g += signLv(cx, t - 12, Math.min(w - 4, 100), 'ЛАВКА', 1, 20) + '</g>';
        return g;
      }
      const e = edifice(f, { id: 'shop', sign: 'ЛАВКА', signBg: '#2f5a2a', noWin: false, lowWin: () => '', noTurrets: lv < 5, chimney: lv >= 3 });
      g += e.g;
      const fl = e.two ? e.mid : e.top + (lv <= 2 ? 62 : 0);
      if (lv >= 5) {   // аркада: три арки с товаром по сторонам двери
        const n = 2, aw2 = 44;
        for (const s of [-1, 1]) for (let i = 0; i < n; i++) { const ax = cx + s * (DOORW[4] / 2 + 80 + i * 56); if (ax - aw2 / 2 < x0 + (e.tw || 0) || ax + aw2 / 2 > x1 - (e.tw || 0)) continue;
          g += `<path d="M${f1(ax - aw2 / 2)} ${e.B} V${f1(e.B - 60)} A${aw2 / 2} ${aw2 / 2} 0 0 1 ${f1(ax + aw2 / 2)} ${f1(e.B - 60)} V${e.B} Z" fill="#3a2a22" ${O(3)}/><path d="M${f1(ax - aw2 / 2 - 4)} ${f1(e.B - 60)} A${aw2 / 2 + 4} ${aw2 / 2 + 4} 0 0 1 ${f1(ax + aw2 / 2 + 4)} ${f1(e.B - 60)}" stroke="${GOLD}" stroke-width="3" fill="none"/>` + goods(ax - 16, ax + 16, e.B - 14, 2); }
      } else {
        // навес над окнами-витринами и прилавки по сторонам двери
        const ay = fl + 10, side = DOORW[lv - 1] / 2 + 14;
        g += awning(x0 - 10, cx - side, ay, 3) + awning(cx + side, x1 + 10, ay, 3);
        for (const [a, b] of [[x0 + 14, cx - side - 6], [cx + side + 6, x1 - 14]]) if (b - a > 30) g += `<rect x="${f1(a)}" y="${e.B - 50}" width="${f1(b - a)}" height="50" fill="${K.wood}"/>` + planks(a, e.B - 50, b - a, 50) + `<rect x="${f1(a)}" y="${e.B - 50}" width="${f1(b - a)}" height="50" fill="none" ${O(3.5)}/><path d="M${f1(a - 3)} ${e.B - 50} H${f1(b + 3)}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${f1(a - 3)} ${e.B - 50} H${f1(b + 3)}" stroke="${LT(K.wood, 0.2)}" stroke-width="4" stroke-linecap="round"/>` + goods(a + 4, b - 4, e.B - 60, Math.max(2, Math.round((b - a) / 30)));
      }
      if (lv >= 4) for (const s of [-1, 1]) {   // боковые лотки у стены
        const x = s < 0 ? lot.x0 + 4 : lot.x1 - 4;
        if (Math.abs(x - (s < 0 ? x0 : x1)) < 6) g += `<rect x="${f1(x - (s < 0 ? 0 : 40))}" y="${e.B - 34}" width="40" height="34" fill="${K.wood}" ${O(3)}/>` + goods(x - (s < 0 ? -4 : 36), x + (s < 0 ? 36 : -4), e.B - 42, 2);
      }
      return g + drift(x0 + 30, 795, 70) + '</g>';
    };

    /* ---- Магическая лавка (башня звездочёта): 1 — избушка с колпаком-крышей; 2 — невысокая башня; 3 — башня с балконом; 4 — + пристройка
       с куполом, летающий кристалл; 5 — высокая башня, две пристройки, сияющий шар, витраж, золото. ---- */
    ART.magic = (lot) => {
      const f = L.fr.magic, lv = f.lv, B = 795, top = B - f.wall, cx = (lot.x0 + lot.x1) / 2, lw = lot.x1 - lot.x0;
      const tw = Math.round(lw * [0.5, 0.52, 0.58, 0.58, 0.6][lv - 1]), tx = cx - tw / 2;
      const PUR = '#3a2a6a', star = (x, y, s = 1) => `<path d="M${f1(x)} ${f1(y - 8 * s)} l${f1(3 * s)} ${f1(7 * s)} l${f1(7 * s)} ${f1(1 * s)} l${f1(-5 * s)} ${f1(5 * s)} l${f1(1 * s)} ${f1(7 * s)} l${f1(-6 * s)} ${f1(-4 * s)} l${f1(-6 * s)} ${f1(4 * s)} l${f1(1 * s)} ${f1(-7 * s)} l${f1(-5 * s)} ${f1(-5 * s)} l${f1(7 * s)} ${f1(-1 * s)} Z" fill="#ffd76a"/>`;
      let g = `<g data-ol="magic" data-lv="${lv}">`;
      // пристройки (4 — слева, 5 — обе): низкие круглые с куполками
      if (lv >= 4) for (const s of lv >= 5 ? [-1, 1] : [-1]) {
        const aw = Math.round((f.x1 - f.x0 - tw) / (lv >= 5 ? 2 : 1)) + 14, ax0 = s < 0 ? f.x0 : f.x1 - aw, at = B - f.wall * 0.42;
        g += wall(ax0, at, aw, B, stoneMat) + `<path d="M${ax0 - 6} ${f1(at + 2)} Q${f1(ax0 + aw / 2)} ${f1(at - aw * 0.9)} ${ax0 + aw + 6} ${f1(at + 2)} Z" fill="${PUR}" ${O()}/>` + winLit(f1(ax0 + aw / 2 - 10), f1(at + 30), 20, 30, true, true) + star(ax0 + aw / 2, at - aw * 0.48, 0.8);
      }
      const mat = lv <= 1 ? (WOODY ? 'shack' : matLow(1)) : stoneMat;
      g += wall(tx, top, tw, B, mat);
      if (lv >= 3) g += `<path d="M${tx} ${f1(top + f.wall * 0.36)} H${tx + tw}" stroke="${lv >= 5 ? GOLD : '#b9a2ff'}" stroke-width="5"/>`;
      if (lv >= 4) for (let i = 0; i < 3; i++) g += `<path d="M${f1(tx + 10 + i * (tw - 20) / 3)} ${f1(top + f.wall * 0.62)} l8 -12 l8 12 l-8 12 Z" fill="none" stroke="#b9a2ff" stroke-width="2.5" opacity=".85"/>`;   // руны
      // крыша-колпак (1 — кривой), звёзды
      const rh = f.up - [30, 34, 40, 80, 80][lv - 1], ap = top - rh;
      g += lv <= 1 ? `<path d="M${f1(tx - 22)} ${top + 4} Q${f1(cx - 6)} ${f1(top - rh * 0.5)} ${f1(cx + 18)} ${f1(ap)} Q${f1(cx + 10)} ${f1(top - rh * 0.4)} ${f1(tx + tw + 22)} ${top + 4} Z" fill="${PUR}" ${O()}/>`
        : (() => { const d = `M${f1(tx - 22)} ${top + 4} L${f1(cx)} ${f1(ap)} L${f1(tx + tw + 22)} ${top + 4} Z`, cid = clipId(d);   // 26.10: колпак — дранка рядами, свет слева
          return `<clipPath id="${cid}"><path d="${d}"/></clipPath><path d="${d}" fill="${PUR}"/><g clip-path="url(#${cid})">${roofRows('shingle', tx - 24, tx + tw + 24, ap, top + 6, PUR, '#241a44')}<path d="M${f1(tx - 14)} ${top + 4} L${f1(cx)} ${f1(ap + 6)} L${f1(cx - 8)} ${f1(ap + 30)} L${f1(tx + 4)} ${top + 4} Z" fill="#ffffff" opacity=".1"/></g><path d="${d}" fill="none" ${O()}/>`; })();
      if (lv <= 1) g += `<rect x="${f1(cx - 26)}" y="${f1(top - rh * 0.35)}" width="20" height="14" fill="#5a4a8a" ${O(2.5)} transform="rotate(-12 ${f1(cx - 26)} ${f1(top - rh * 0.35)})"/><path d="M${f1(tx - 10)} ${top - 4} Q${f1(cx)} ${f1(top - rh * 0.3)} ${f1(cx + 10)} ${f1(top - rh * 0.6)}" stroke="#241a44" stroke-width="2" fill="none" opacity=".6"/>`
      if (lv >= 5) g += `<path d="M${f1(tx - 20)} ${top + 3} L${f1(cx)} ${f1(ap + 5)} L${f1(tx + tw + 20)} ${top + 3}" stroke="${GOLD}" stroke-width="4" fill="none"/>`;
      if (SNOW) g += lv <= 1 ? '' : snowCap(tx - 22, tx + tw + 22, top + 2, rh);
      for (let i = 0; i < [2, 3, 5, 6, 8][lv - 1]; i++) g += star(cx - 30 + R() * 60, top - 24 - R() * (rh * 0.55), 0.9);
      // навершие: 1 — звезда-вымпел; 2–3 — луна; 4 — летающий кристалл; 5 — сияющий шар
      if (lv <= 1) g += `<path d="M${f1(cx + 18)} ${f1(ap)} l20 6 l-20 8" fill="#ffd76a" ${O(2.5)}/>`;
      else if (lv <= 3) g += `<circle cx="${f1(cx)}" cy="${f1(ap - 12)}" r="12" fill="#b9a2ff" ${O(3)}/><path d="M${f1(cx + 2)} ${f1(ap - 30)} a14 14 0 1 0 12 18 a10 10 0 1 1 -12 -18 Z" fill="#ffd76a" ${O(2)}/>`;
      else g += `<circle cx="${f1(cx)}" cy="${f1(ap - 34)}" r="${lv >= 5 ? 40 : 30}" fill="url(#tgGlow)" opacity=".8"/>` + (lv >= 5 ? `<circle cx="${f1(cx)}" cy="${f1(ap - 34)}" r="17" fill="#b9a2ff" ${O(3)}/><circle cx="${f1(cx - 5)}" cy="${f1(ap - 39)}" r="6" fill="#f3efff"/><path d="M${f1(cx)} ${f1(ap)} v-16" stroke="${GOLD}" stroke-width="4"/>`
        : `<path d="M${f1(cx)} ${f1(ap - 58)} l14 22 l-14 22 l-14 -22 Z" fill="#9ae6ff" ${O(3)}/>`);
      // сверху вниз: вывеска (1 — на колпаке), окно (3+ — с балконом), второе окно (если влезает над дверью), дверь; 5 — витраж
      const ww = 34, dl = Math.min(lv, 3), w1 = lv <= 1 ? top + 22 : top + 70, w2 = top + 132, has2 = lv >= 3 && w2 + 56 < B - DOORH[dl - 1];
      g += winLit(f1(cx - ww / 2), f1(w1), ww, 46, true, true) + (has2 ? winLit(f1(cx - ww / 2), f1(w2), ww, 46, true, true) : '');
      if (lv >= 3) g += `<rect x="${f1(tx - 14)}" y="${f1(w1 + 46)}" width="${tw + 28}" height="10" fill="${K.woodD}" ${O(3)}/>` + Array.from({ length: Math.round((tw + 28) / 18) }, (_, i) => `<path d="M${f1(tx - 10 + i * 18)} ${f1(w1 + 46)} v-22" stroke="${K.woodD}" stroke-width="3.5"/>`).join('') + `<path d="M${f1(tx - 14)} ${f1(w1 + 24)} H${f1(tx + tw + 14)}" stroke="${K.woodD}" stroke-width="4"/>`;   // балкон
      if (lv >= 5) { const sy = (has2 ? w2 : w1) + 28; g += `<circle cx="${f1(cx)}" cy="${f1(sy)}" r="13" fill="none" stroke="#e8455c" stroke-width="3"/><path d="M${f1(cx - 13)} ${f1(sy)} h26 M${f1(cx)} ${f1(sy - 13)} v26" stroke="#4ab0ff" stroke-width="3"/>`; }
      // 26.10: кристаллы у основания (2+), сова на перилах балкона (3+), травы над дверью (1–2)
      if (lv >= 2) for (const [x, k] of [[tx + 10, 1], [tx + tw - 12, 0.8]]) g += `<g transform="translate(${f1(x)} ${B}) scale(${k})"><path d="M-12 0 L-9 -16 L-4 -22 L-2 0 Z M-3 0 L0 -30 L5 -20 L4 0 Z M3 0 L8 -14 L12 -10 L11 0 Z" fill="#9ae6ff" ${O(2.5)}/><path d="M-1 -26 L1 -6" stroke="#ffffff" stroke-width="1.6" opacity=".7"/></g>`;
      if (lv >= 3) { const ox = tx + tw - 2, oy = w1 + 46; g += `<g transform="translate(${f1(ox)} ${f1(oy)})"><ellipse cy="-12" rx="9" ry="12" fill="#8a6a4a" ${O(2.5)}/><path d="M-8 -22 l3 -6 l3 5 M8 -22 l-3 -6 l-3 5" fill="#8a6a4a" ${O(2)}/><circle cx="-3.5" cy="-15" r="3.2" fill="#ffd76a" stroke="${INK}" stroke-width="1.4"/><circle cx="3.5" cy="-15" r="3.2" fill="#ffd76a" stroke="${INK}" stroke-width="1.4"/><path d="M-1 -11 l1 2 l1 -2 Z" fill="${INK}"/></g>`; }
      if (lv <= 2) { const hy = B - DOORH[dl - 1] - 12; g += `<path d="M${f1(cx - 26)} ${f1(hy)} H${f1(cx + 26)}" stroke="${INK}" stroke-width="2"/><path d="M${f1(cx - 18)} ${f1(hy)} v14 M${f1(cx)} ${f1(hy)} v18 M${f1(cx + 18)} ${f1(hy)} v12" stroke="#6a8a3a" stroke-width="5" stroke-linecap="round"/>`; }
      g += bigDoor(cx, B, dl, PUR, 0.95);
      g += signLv(cx, lv <= 1 ? top - 16 : top + 36, lv <= 1 ? Math.min(tw + 30, 120) : Math.max(150, Math.min(tw + 30, 200)), '✦ МАГИЯ ✦', lv, 20, PUR);
      return g + '</g>';
    };

    /* ---- 24.10: ШАХТА (промысел): вход-штольня в скале у правого края города, скала — по природе: льды — ледяная пещера, пепел — базальт
       со светящимися швами, пустыня — песчаник слоями, лес и тайга — замшелый камень, остальное — серый камень. Портал из брёвен (стойки,
       перекладина, распорки), рельсы уходят в темноту, вагонетка, куча руды, фонарь на кронштейне, вывеска «ШАХТА». Пока модуля шахты нет —
       вход заколочен (o.mineOpen — без досок). ---- */
    ART.mine = (lot) => {
      const x0 = lot.x0, x1 = lot.x1, cx = (x0 + x1) / 2, B = 795, w = x1 - x0;
      const RK = L.biome === 'ice' ? ['#cfe6f6', '#9fc4e0', '#ffffff'] : L.biome === 'ash' ? ['#2e2a30', '#1e1a20', '#ff7a2a'] : L.biome === 'desert' ? ['#d8a86a', '#b8884e', '#f0c890']
        : L.biome === 'forest' || L.biome === 'taiga' ? ['#8a8a7c', '#6a6a5e', '#6a9a3a'] : L.biome === 'swamp' ? ['#7a7a68', '#5a5a4a', '#6a7a3a'] : ['#8f8a96', '#6e6a78', '#b4aeba'];
      let g = '<g data-ol="mine" data-lv="1">';
      // скала: широкая глыба за стеной, неровный верх
      const top = 572, pts = [[x0 - 34, B + 2], [x0 - 22, 690], [x0 + w * 0.12, 628], [x0 + w * 0.3, top + 10], [cx, top - 6], [x1 - w * 0.28, top + 16], [x1 - w * 0.1, 640], [x1 + 26, 700], [x1 + 36, B + 2]];
      g += `<path d="M${pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L')} Z" fill="${RK[0]}" ${O()}/>`;
      if (L.biome === 'desert') for (let i = 0; i < 4; i++) g += `<path d="M${f1(x0 - 20 + i * 6)} ${650 + i * 34} H${f1(x1 + 20 - i * 6)}" stroke="${RK[1]}" stroke-width="5" opacity=".6"/>`;
      else if (L.biome === 'ash') g += `<path d="M${f1(x0 + 10)} 700 l20 30 l-10 30 M${f1(x1 - 30)} 650 l-14 40 l12 26" stroke="${RK[2]}" stroke-width="4" fill="none" opacity=".85"/>` + [0, 1, 2, 3].map((i) => `<path d="M${f1(x0 + 6 + i * 22)} ${B} V${690 - i * 18}" stroke="${RK[1]}" stroke-width="3" opacity=".7"/>`).join('');
      else if (L.biome === 'ice') g += `<path d="M${f1(cx - 90)} 640 l20 40 l-14 30 M${f1(cx + 100)} 620 l-16 46" stroke="${RK[1]}" stroke-width="4" fill="none"/>` + [0, 1, 2, 3, 4].map((i) => `<path d="M${f1(x0 + 20 + i * w / 5)} ${f1(top + 30 + (i % 2) * 20)} l6 ${f1(26 + (i % 3) * 8)} l6 ${f1(-26 - (i % 3) * 8)}" fill="#e8f6ff" stroke="${RK[1]}" stroke-width="2"/>`).join('');
      else g += `<path d="M${f1(x0 + 20)} 700 q30 -10 60 4 M${f1(x1 - 70)} 660 q24 -8 46 6 M${f1(cx - 40)} ${top + 30} q30 -6 56 6" stroke="${RK[1]}" stroke-width="4" fill="none" opacity=".7"/>`;
      if (RK[2] === '#6a9a3a') for (const [mx, my, r] of [[x0 + w * 0.25, top + 30, 26], [x1 - w * 0.2, 652, 22], [x0 - 4, 700, 18]]) g += `<ellipse cx="${f1(mx)}" cy="${f1(my)}" rx="${r}" ry="${f1(r * 0.5)}" fill="${RK[2]}" ${O(2.5)}/>`;
      if (SNOW && L.biome !== 'ice') g += `<path d="M${f1(x0 + w * 0.3)} ${top + 12} L${f1(cx)} ${top - 4} L${f1(x1 - w * 0.28)} ${top + 18} l-18 8 l-30 -10 l-36 12 Z" fill="#f6fafd" ${O(2.5)}/>`;
      // 26.10: камни и трещины на скале (одним путём), тень у подножия
      { let d = '', c = ''; for (let i = 0; i < 9; i++) { const px = x0 + 10 + hr(i, x0) * (w - 20), py = top + 40 + hr(x0, i) * (B - top - 70), rr = 9 + hr(i + 3, x0) * 12; if (Math.abs(px - cx) < 74 && py > B - 150) continue; d += `M${f1(px - rr)} ${f1(py)} q${f1(rr * 0.3)} ${f1(-rr * 0.8)} ${f1(rr)} ${f1(-rr * 0.7)} q${f1(rr * 0.8)} ${f1(rr * 0.1)} ${f1(rr)} ${f1(rr * 0.7)} q${f1(-rr * 0.4)} ${f1(rr * 0.6)} ${f1(-rr)} ${f1(rr * 0.5)} Z `; c += `M${f1(px - rr * 0.5)} ${f1(py - rr * 0.4)} h${f1(rr * 0.6)}`; }
        g += `<path d="${d}" fill="${RK[1]}" ${O(2)}/><path d="${c}" stroke="#ffffff" stroke-width="2" opacity=".3" stroke-linecap="round"/><path d="M${f1(x0 - 20)} ${B - 10} H${f1(x1 + 30)}" stroke="${INK}" stroke-width="16" opacity=".2"/>`; }
      // проём штольни
      const ow = 112, oh = 128, oy = B - oh;
      g += `<path d="M${f1(cx - ow / 2)} ${B} V${oy + 30} Q${f1(cx)} ${oy - 18} ${f1(cx + ow / 2)} ${oy + 30} V${B} Z" fill="#17121e" ${O(4)}/>`;
      // рельсы: из темноты к улице (сходятся вглубь)
      g += `<path d="M${f1(cx - 16)} ${oy + 70} L${f1(cx - 40)} ${B + 40} M${f1(cx + 16)} ${oy + 70} L${f1(cx + 40)} ${B + 40}" stroke="#8a8e9e" stroke-width="5"/>`;
      for (let i = 0; i < 6; i++) { const t = i / 5, y = oy + 80 + t * (B + 36 - oy - 80), hw = 22 + t * 28; g += `<path d="M${f1(cx - hw)} ${f1(y)} H${f1(cx + hw)}" stroke="${K.woodD}" stroke-width="${f1(4 + t * 3)}"/>`; }
      // портал из брёвен: стойки, перекладина, распорки
      const pw = 18, lx = cx - ow / 2 - 6, rx = cx + ow / 2 + 6, ly = oy + 8;
      g += `<rect x="${f1(lx - pw / 2)}" y="${f1(ly)}" width="${pw}" height="${f1(B - ly)}" fill="${K.wood}" ${O(3.5)}/><rect x="${f1(rx - pw / 2)}" y="${f1(ly)}" width="${pw}" height="${f1(B - ly)}" fill="${K.wood}" ${O(3.5)}/>`
        + `<rect x="${f1(lx - 22)}" y="${f1(ly - 22)}" width="${f1(rx - lx + 44)}" height="24" rx="4" fill="${K.wood}" ${O(3.5)}/><path d="M${f1(lx + 6)} ${f1(ly + 2)} L${f1(lx + 30)} ${f1(ly + 24)} M${f1(rx - 6)} ${f1(ly + 2)} L${f1(rx - 30)} ${f1(ly + 24)}" stroke="${K.woodD}" stroke-width="7" stroke-linecap="round"/>`;
      g += `<path d="M${f1(lx - 3)} ${f1(ly + 10)} V${B - 6} M${f1(rx + 3)} ${f1(ly + 10)} V${B - 6} M${f1(lx - 14)} ${f1(ly - 14)} H${f1(rx + 14)}" stroke="${DK(K.wood, 0.3)}" stroke-width="1.8" stroke-dasharray="14 8" opacity=".7"/>`
        + [ly + 40, B - 40].map((yy) => `<path d="M${f1(lx - pw / 2 - 1)} ${f1(yy)} h${pw + 2} M${f1(rx - pw / 2 - 1)} ${f1(yy)} h${pw + 2}" stroke="#3a3640" stroke-width="5"/>`).join('')
        + `<g transform="translate(${f1(lx - 26)} ${B}) rotate(-14)"><path d="M0 0 V-54" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M0 0 V-54" stroke="${K.wood}" stroke-width="3.5" stroke-linecap="round"/><path d="M-18 -50 Q0 -64 18 -50 Q0 -58 -18 -50 Z" fill="#8a8e9e" ${O(2.5)}/></g>`;   // 26.10: волокна и железные скобы портала, кирка у стойки
      if (!o.mineOpen) g += `<path d="M${f1(cx - ow / 2 + 4)} ${f1(oy + 60)} L${f1(cx + ow / 2 - 4)} ${f1(oy + 92)} M${f1(cx + ow / 2 - 4)} ${f1(oy + 56)} L${f1(cx - ow / 2 + 4)} ${f1(oy + 96)}" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M${f1(cx - ow / 2 + 4)} ${f1(oy + 60)} L${f1(cx + ow / 2 - 4)} ${f1(oy + 92)} M${f1(cx + ow / 2 - 4)} ${f1(oy + 56)} L${f1(cx - ow / 2 + 4)} ${f1(oy + 96)}" stroke="${K.wood}" stroke-width="10" stroke-linecap="round"/>`;
      // вывеска на перекладине, фонарь на кронштейне у правой стойки
      g += signLv(cx, ly - 44, 150, 'ШАХТА', 2, 22, '#4a3a2a');
      g += `<path d="M${f1(rx + pw / 2)} ${f1(ly + 26)} h20 v8" stroke="${INK}" stroke-width="3.5" fill="none"/><circle cx="${f1(rx + pw / 2 + 20)}" cy="${f1(ly + 46)}" r="24" fill="#ffd27a" opacity=".22"/><path d="M${f1(rx + pw / 2 + 13)} ${f1(ly + 34)} h14 l-2 18 h-10 Z" fill="#ffd76a" ${O(2.5)}/>`;
      // вагонетка на рельсах слева у входа и куча руды справа
      const vx = x0 + 34;
      g += `<path d="M${f1(vx - 30)} ${B - 46} H${f1(vx + 30)} L${f1(vx + 24)} ${B - 12} H${f1(vx - 24)} Z" fill="#6e6a7c" ${O(3.5)}/><circle cx="${f1(vx - 14)}" cy="${B - 8}" r="9" fill="#3a3640" ${O(2.5)}/><circle cx="${f1(vx + 14)}" cy="${B - 8}" r="9" fill="#3a3640" ${O(2.5)}/>`
        + [[-14, -54], [2, -58], [16, -52], [-4, -64]].map(([dx, dy], i) => `<circle cx="${f1(vx + dx)}" cy="${B + dy}" r="${9 - (i % 2)}" fill="${['#8a8e9e', '#c9a24a', '#6a6676', '#b06a3a'][i]}" ${O(2)}/>`).join('');
      g += putProp('sack', x1 - 70, B, 0.9) + putProp('crate', x0 + 76, B, 0.8);
      const ox = x1 - 26;
      g += [[-26, -10, 14], [-6, -12, 16], [14, -9, 13], [-16, -28, 12], [4, -30, 12], [-6, -44, 10]].map(([dx, dy, r], i) => `<circle cx="${f1(ox + dx)}" cy="${B + dy}" r="${r}" fill="${['#8a8e9e', '#6a6676', '#c9a24a', '#8a8e9e', '#b06a3a', '#6a6676'][i]}" ${O(2.5)}/>`).join('');
      return g + '</g>';
    };

    // жилые дома и рощи
    const HOUSE = (lot) => {
      const { x0, x1 } = lot, B = lot.base, cx = (x0 + x1) / 2;
      const h = (V ? 120 : 160) + (lot.v % 60);
      const b = body(x0, x1, B, h, { roofH: 70 + (lot.v % 40), roofC: lot.v % 3 ? undefined : K.roof2, ruinHere: lot.v % 2 === 0 });
      let g = b.g + winLit(x0 + 18, b.top + 28, 34, 44, !RUIN && lot.v % 4 !== 0) + door(cx + (x1 - x0) * 0.18, b.B, 40, 66);
      if (!V && x1 - x0 > 200) g += winLit(x1 - 52, b.top + 28, 34, 44, lot.v % 5 !== 0);
      if (K.wall === 'clay') { const aw = K.awning; g += `<path d="M${x0 + 8} ${b.B - 86} H${x1 - 8} l10 34 H${x0 - 2} Z" fill="${aw[lot.v % 2]}" ${O(3)}/>`; }
      if (L.biome === 'swamp') g += `<path d="M${x1 + 4} ${B - 120} l40 0 M${x1 + 10} ${B - 120} v70 M${x1 + 38} ${B - 120} v70" stroke="${K.woodD}" stroke-width="4"/><path d="M${x1 + 10} ${B - 116} q14 30 28 0 M${x1 + 10} ${B - 96} q14 30 28 0" stroke="#c8bc94" stroke-width="2" fill="none"/>`;
      g = chimney(x0 + (x1 - x0) * 0.62 + 10, b.top - 60, 20, 46 + (b.top - 14 - (b.top - 60) - 46), 2, '#6d5a5a') + g + stoop(x0, x1, b.B, V ? 1 : 2, cx + (x1 - x0) * 0.18, 40, [[cx + (x1 - x0) * 0.18 - 30, cx + (x1 - x0) * 0.18 + 30]], lot.v % 2 ? 1 : 2) + drift(x0 + 20, B, 70);
      return g;
    };
    const tree = (x, base, s = 1, kind = K.tree) => {
      const lf = K.leaf;
      if (kind === 'pine' || kind === 'snowpine') { const h = 150 * s; let g = `<path d="M${f1(x - 9 * s)} ${f1(base + 2)} L${f1(x - 4 * s)} ${f1(base - 90 * s)} H${f1(x + 4 * s)} L${f1(x + 9 * s)} ${f1(base + 2)} Z" fill="${K.woodD}" ${O(3)}/>`; for (let i = 0; i < 3; i++) { const yy = base - 20 * s - i * 40 * s, w = (54 - i * 12) * s; g += `<path d="M${f1(x - w)} ${f1(yy)} L${f1(x)} ${f1(yy - 70 * s)} L${f1(x + w)} ${f1(yy)} Z" fill="${lf[i % lf.length]}" ${O(3.5)}/>`; if (SNOW) g += `<path d="M${f1(x - w * 0.6)} ${f1(yy - 26 * s)} L${f1(x)} ${f1(yy - 70 * s)} L${f1(x + w * 0.6)} ${f1(yy - 26 * s)} q${f1(-w * 0.3)} 8 ${f1(-w * 0.6)} -4 q${f1(-w * 0.3)} 10 ${f1(-w * 0.6)} 4 Z" fill="#f6fafd"/>`; } return g + (h ? '' : ''); }
      if (kind === 'palm') { let g = `<path d="M${x} ${base} Q${f1(x + 14 * s)} ${f1(base - 90 * s)} ${f1(x + 4 * s)} ${f1(base - 170 * s)}" stroke="${INK}" stroke-width="${f1(16 * s)}" fill="none"/><path d="M${x} ${base} Q${f1(x + 14 * s)} ${f1(base - 90 * s)} ${f1(x + 4 * s)} ${f1(base - 170 * s)}" stroke="#a8784a" stroke-width="${f1(10 * s)}" fill="none"/>`; const tx = x + 4 * s, ty = base - 170 * s; for (let i = 0; i < 6; i++) { const a = -Math.PI + i * Math.PI / 5, ex = tx + Math.cos(a) * 80 * s, ey = ty + Math.sin(a) * 30 * s + 30 * s; g += `<path d="M${f1(tx)} ${f1(ty)} Q${f1((tx + ex) / 2)} ${f1(ty - 30 * s)} ${f1(ex)} ${f1(ey)} Q${f1((tx + ex) / 2)} ${f1(ty - 6 * s)} ${f1(tx)} ${f1(ty)}" fill="${lf[i % lf.length]}" ${O(3)}/>`; } return g; }
      if (kind === 'dead') return `<path d="M${x} ${base} V${f1(base - 120 * s)} M${x} ${f1(base - 60 * s)} l${f1(-34 * s)} ${f1(-40 * s)} M${x} ${f1(base - 84 * s)} l${f1(30 * s)} ${f1(-36 * s)} M${x} ${f1(base - 120 * s)} l${f1(-16 * s)} ${f1(-24 * s)}" stroke="${INK}" stroke-width="${f1(13 * s)}" fill="none" stroke-linecap="round"/><path d="M${x} ${base} V${f1(base - 120 * s)} M${x} ${f1(base - 60 * s)} l${f1(-34 * s)} ${f1(-40 * s)} M${x} ${f1(base - 84 * s)} l${f1(30 * s)} ${f1(-36 * s)} M${x} ${f1(base - 120 * s)} l${f1(-16 * s)} ${f1(-24 * s)}" stroke="${L.biome === 'ash' ? '#3a2e2a' : '#5e5048'}" stroke-width="${f1(7 * s)}" fill="none" stroke-linecap="round"/>`;
      // 24.10 (снимок стримера: ствол — отдельный прямоугольник под кроной): ствол — сужается кверху и уходит глубоко в крону
      // (рисуется до неё), у земли — корни; тень под деревом — у предмета (ell)
      const big = kind === 'big' ? 1.3 : 1, bw = 11 * s * big, tw = 6 * s * big, ty = base - 112 * s * big;
      let g = `<path d="M${f1(x - bw - 7 * s)} ${f1(base + 2)} Q${f1(x - bw)} ${f1(base - 6 * s)} ${f1(x - bw)} ${f1(base - 18 * s)} L${f1(x - tw)} ${f1(ty)} H${f1(x + tw)} L${f1(x + bw)} ${f1(base - 18 * s)} Q${f1(x + bw)} ${f1(base - 6 * s)} ${f1(x + bw + 7 * s)} ${f1(base + 2)} Z" fill="${K.woodD}" ${O(3)}/>`
        + `<path d="M${f1(x - tw * 0.6)} ${f1(base - 70 * s * big)} l${f1(-22 * s * big)} ${f1(-26 * s * big)} M${f1(x + tw * 0.6)} ${f1(base - 82 * s * big)} l${f1(20 * s * big)} ${f1(-24 * s * big)}" stroke="${K.woodD}" stroke-width="${f1(6 * s * big)}" stroke-linecap="round"/>`;
      for (const [dx, dy, r] of [[-26, -84, 40], [26, -88, 38], [0, -120, 46]]) g += `<circle cx="${f1(x + dx * s * big)}" cy="${f1(base + dy * s * big)}" r="${f1(r * s * big)}" fill="${lf[(dx + 30) % lf.length] || lf[0]}" ${O(3.5)}/>`;
      return g;
    };
    const GROVE = (lot) => { let g = ''; const n = 2 + (lot.v % 3); for (let i = 0; i < n; i++) g += tree(lot.x0 + 30 + (lot.x1 - lot.x0 - 60) * (i + 0.5) / n, lot.base - (i % 2) * 14, 0.9 + ((lot.v >> i) % 4) * 0.12); return g + drift((lot.x0 + lot.x1) / 2, lot.base, lot.x1 - lot.x0); };
    /* ---- 23.10 (стройка): здание улучшается (6–48 ч) — рисуется нынешним уровнем, но в лесах и под тентом (по природе: доски и брезент;
       льды — снег на брезенте и досках; пустыня — полосатый тент; болото — тростниковые маты; пепел — железные стойки и закопчённый брезент;
       руины и порча — латаный брезент), табличка «Идёт стройка». Таймер — ярлык city.js над зданием. ---- */
    function scaffold(f, id) {
      const x0 = f.x0 - 14, x1 = f.x1 + 14, B = f.B, yT = Math.min(B - 90, f.top + Math.round(f.up * 0.45)), w = x1 - x0, cx = (x0 + x1) / 2;
      const tp = L.biome === 'desert' ? K.awning : L.biome === 'swamp' ? ['#8a7e44', '#5e5528'] : L.biome === 'ash' ? ['#5a4a44', '#3a2e2a'] : SNOW >= 1 ? ['#7a8ca8', '#5a6c88'] : RUIN ? ['#9a8a74', '#6a5a4a'] : ['#cbb88c', '#9a865e'];
      const pole = L.biome === 'ash' ? '#6a6676' : K.woodD;
      let g = `<g data-ol="${id}" data-build="1">`;
      // тент: полотнища с складками (пустыня — полосы)
      const n = Math.max(2, Math.round(w / 110)), pw = (w - 12) / n;
      for (let i = 0; i < n; i++) g += `<path d="M${f1(x0 + 6 + i * pw)} ${yT + 16} h${f1(pw)} l-3 ${B - yT - 22} h${f1(-pw + 6)} Z" fill="${i % 2 && L.biome === 'desert' ? tp[1] : tp[0]}" ${O(3)}/>`;
      let fd = ''; for (let i = 0; i < n; i++) { const xx = x0 + 6 + i * pw; fd += `M${f1(xx + pw * 0.35)} ${yT + 24}q8 ${f1((B - yT) * 0.4)} -2 ${f1(B - yT - 34)}M${f1(xx + pw * 0.7)} ${yT + 24}q-6 ${f1((B - yT) * 0.3)} 3 ${f1(B - yT - 40)}`; }
      g += `<path d="${fd}" stroke="${tp[1]}" stroke-width="3" fill="none" opacity=".8"/>`;
      if (RUIN || L.biome === 'swamp') g += `<rect x="${f1(cx - pw * 0.4)}" y="${f1(yT + (B - yT) * 0.3)}" width="44" height="34" fill="${tp[1]}" ${O(2.5)} transform="rotate(-6 ${f1(cx)} ${f1(yT + (B - yT) * 0.3)})"/>`;
      // леса: стойки, настилы, раскосы
      let pv = '', ph = '', pd = '';
      const cols = Math.max(2, Math.round(w / 90));
      for (let i = 0; i <= cols; i++) pv += `M${f1(x0 + i * w / cols)} ${B + 4}V${yT - 10}`;
      for (let y = B - 70; y > yT + 10; y -= 72) ph += `M${x0 - 10} ${y}H${x1 + 10}`;
      for (let i = 0; i < cols; i++) pd += `M${f1(x0 + i * w / cols)} ${B - 4}L${f1(x0 + (i + 1) * w / cols)} ${Math.max(yT, B - 140)}`;
      g += `<path d="${pv}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="${pv}" stroke="${pole}" stroke-width="7" stroke-linecap="round"/>`
        + `<path d="${ph}" stroke="${INK}" stroke-width="13"/><path d="${ph}" stroke="${K.wood}" stroke-width="8"/><path d="${pd}" stroke="${pole}" stroke-width="5" opacity=".9"/>`;
      if (SNOW) g += `<path d="${ph.replace(/M(\S+) (\S+)H/g, (m, a, b) => `M${a} ${+b - 6}H`)}" stroke="#f6fafd" stroke-width="5"/><path d="M${x0 + 6} ${yT + 18} H${x1 - 6}" stroke="#f6fafd" stroke-width="9" stroke-linecap="round"/>`;
      // 26.10: верёвочные узлы на стыках, лестница, штабель досок и кирпичи у подножия
      { let kn = ''; for (let i = 0; i <= cols; i++) for (let y = B - 70; y > yT + 10; y -= 72) kn += `M${f1(x0 + i * w / cols - 6)} ${y - 4} l12 8 M${f1(x0 + i * w / cols - 6)} ${y + 4} l12 -8`;
        g += `<path d="${kn}" stroke="#c8a86a" stroke-width="3" stroke-linecap="round"/>`;
        const lx = x0 + w / cols * 0.5; let rg = ''; for (let y = B - 12; y > B - 150; y -= 18) rg += `M${f1(lx - 12)} ${y} h24`;
        g += `<path d="M${f1(lx - 12)} ${B + 4} V${B - 156} M${f1(lx + 12)} ${B + 4} V${B - 156}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${f1(lx - 12)} ${B + 4} V${B - 156} M${f1(lx + 12)} ${B + 4} V${B - 156}${rg}" stroke="${K.wood}" stroke-width="4" stroke-linecap="round"/>`;
        const px = x1 - 70; g += [0, 1, 2].map((k) => `<rect x="${f1(px - 34 + k * 3)}" y="${B - 8 - k * 9}" width="68" height="9" rx="2" fill="${k % 2 ? LT(K.wood, 0.1) : K.wood}" ${O(2.5)}/>`).join('')
          + [[0, 0], [16, 0], [8, -10]].map(([dx, dy]) => `<rect x="${f1(x0 + 40 + dx)}" y="${B - 10 + dy}" width="15" height="9" rx="1.5" fill="#b5533c" ${O(2)}/>`).join(''); }
      // ведро на верёвке и табличка «Идёт стройка» (жёлто-чёрная)
      g += `<path d="M${f1(x1 - 30)} ${yT - 10} V${f1(yT + 60)}" stroke="${INK}" stroke-width="2.5"/><path d="M${f1(x1 - 40)} ${f1(yT + 60)} h20 l-3 18 h-14 Z" fill="#8a8e9e" ${O(2)}/>`;
      const sy = B - 52, sw = Math.min(w - 10, 196);
      g += `<rect x="${f1(cx - sw / 2)}" y="${sy - 22}" width="${f1(sw)}" height="44" rx="6" fill="#ffd34a" ${O(3.5)}/>`;
      let st = ''; for (let x = cx - sw / 2 + 8; x < cx + sw / 2 - 8; x += 22) st += `M${f1(x)} ${sy + 22}l12 -8`;
      g += `<path d="${st}" stroke="${INK}" stroke-width="5" opacity=".75"/>` + txt(cx, sy + 4, 'ИДЁТ СТРОЙКА', 16, '#231c2e').replace(/stroke="#231c2e"/, 'stroke="#ffd34a"');
      return g + '</g>';
    }
    // у каждого здания — своё зерно (улучшили одно — остальной город не меняется); blds — рисунок каждого здания отдельно (витрина)
    const blds = {};
    const now = o.now != null ? +o.now : Date.now();
    const bOn = (id) => { const b = L.build && L.build[id]; return b && b.until > now ? b : null; };   // идёт стройка (до конца — рисуем в лесах)
    /* 28.10: набор деталей для рисунка ручной деревни (те же функции, что у генератора) */
    const props = [];
    const kit = HA ? { L, K, R: () => R(), P, f1, f2, O, txt, INK, GOLD, GOLDD, mix, LT, DK, hr, rng, sym, use, clipId, wall, roof, roofRows, body, edifice, bigDoor, signLv, winLv, winLit, door, sign, chimney, gutter, stoop,
      turret, dome, banner, pennant, flag, orb, wallLamp, garland, tree, stilts, drift, putProp, snowCap, ART, scaffold, bOn: (id) => bOn(id), BAN, stoneMat, matLow, matUp, roofKind, roofCol, SNOW, RUIN, V, FLOWERS, blds,
      signAt, signId: (id) => { SIGN_ID = id; }, depthK: (B) => (root.LGTownGen && root.LGTownGen.depthK ? root.LGTownGen.depthK(B) : 1), prop: (x, y, w, h, z, svg) => props.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z: Math.round(z), svg: () => svg }),
      ell: (x, y, rx, ry) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${INK}" opacity=".28"/>` } : null;
    const fillSlot = (name, fn) => { if (!slots[name] || !fn) return; SLOT = slots[name].list; try { fn(kit); } finally { SLOT = null; } };
    if (HA) { fillSlot('back', HA.back); fillSlot('ground', HA.water); }
    for (const lot of HA ? [] : L.lots) {
      const f = ART[lot.k] || (lot.k === 'house' ? HOUSE : lot.k === 'grove' ? GROVE : null);
      if (!f) continue;
      const R0 = R; R = rng((L.seed ^ Math.imul(lot.x0 + 1, 40503) ^ (lot.k.length * 7919)) >>> 0);
      const pad = lot.k === 'gate' ? 40 : lot.k === 'hall' && CAP ? 60 : 120;
      if (lot.k === 'forge') {   // навес с наковальней, Кузня, кузнец поверх (как у Ярмарки — его удар ищет streetBg)
        SIGN_ID = 'anvil'; let a = ART.anvil(lot); SIGN_ID = 'forge'; let b = ART.forge(lot); SIGN_ID = null;
        const smith = o.guy ? '<g data-ol="anvil smith">' + o.guy('кузнец ' + L.id, 830, lot.anvil + 76, 1.1, 'stern', { armed: true, gear: { w: 'hammer', wr: 'common' } }, { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#e88a7a' }, 'smith') + '</g>' : '';
        const ba = bOn('anvil'), bf = bOn('forge');
        if (bf) b += scaffold(L.fr.forge, 'forge');
        const a2 = a + smith + (ba ? scaffold(L.fr.anvil, 'anvil') : '');
        P(lot.x0 - pad, lot.x1 + pad, a2 + b);
        blds.anvil = { x0: lot.x0 - 60, x1: lot.fx0 + 60, svg: a2, lv: L.fr.anvil.lv, build: !!ba }; blds.forge = { x0: lot.fx0 - 20, x1: lot.x1 + 60, svg: b, lv: L.fr.forge.lv, build: !!bf };
      } else {
        SIGN_ID = ART[lot.k] ? lot.k : null; let svg = f(lot); SIGN_ID = null;
        const bs = ART[lot.k] && bOn(lot.k);
        if (bs) svg += scaffold(L.fr[lot.k], lot.k);
        P(lot.x0 - pad, lot.x1 + pad, svg);
        if (ART[lot.k]) blds[lot.k] = { x0: lot.x0 - 50, x1: lot.x1 + 50, svg, lv: L.fr[lot.k].lv, build: !!bs };
      }
      R = R0;
    }
    if (HA) for (const lot of L.lots) handLot(lot);
    if (HA && HA.decor) HA.decor(kit);
    // ручная деревня: здание участка - рисунок деревни (art.building) или генератора (ART); ниже по улице - предмет с глубиной (кто за ним - закрыт)
    function handLot(lot) {
      const R0 = R; R = rng((L.seed ^ Math.imul(lot.x0 + 1, 40503) ^ (lot.k.length * 7919)) >>> 0);
      // здание ниже по улице рисуется как в заднем ряду (участок шире в 1/s, основание 795) и переносится на своё место с масштабом s:
      // рисунок деревни и генератора (ART) - одни и те же, крупнее по глубине
      const one = (id) => {
        const real = L.fr[id], s0 = lot.B ? lot.s || 1 : 1, cx = (lot.x0 + lot.x1) / 2;
        let lt = lot;
        if (lot.B) { const hw = (lot.x1 - lot.x0) / 2 / s0; lt = { ...lot, x0: cx - hw, x1: cx + hw }; delete lt.B; delete lt.s; L.fr[id] = root.LGTownGen.frame(L, lt, id, real.lv); }
        const sg0 = SIGNS[id] ? SIGNS[id].length : 0;
        SIGN_ID = id; let g = '';
        try { g = (HA.building && HA.building(id, lt, L.fr[id], kit)) || (ART[id] ? ART[id](lt) : ''); if (g && bOn(id)) g += scaffold(L.fr[id], id); } finally { SIGN_ID = null; L.fr[id] = real; }
        if (!g) return '';
        if (lot.B) {
          g = `<g transform="translate(${f1(cx)} ${lot.B}) scale(${s0}) translate(${f1(-cx)} -795)">${g}</g>`;
          if (SIGNS[id]) SIGNS[id] = SIGNS[id].map((r, i) => (i < sg0 ? r : [cx + (r[0] - cx) * s0, lot.B + (r[1] - 795) * s0, cx + (r[2] - cx) * s0, lot.B + (r[3] - 795) * s0].map(f1)));
        }
        blds[id] = { x0: (id === 'forge' ? real.x0 : lot.x0) - 50, x1: (id === 'anvil' ? lot.fx0 : lot.x1) + 50, svg: g, lv: real.lv, build: !!bOn(id) };
        return g;
      };
      if (lot.k === 'forge') {
        const smith = o.guy ? '<g data-ol="anvil smith">' + o.guy('кузнец ' + L.id, 830, lot.anvil + 76, 1.1, 'stern', { armed: true, gear: { w: 'hammer', wr: 'common' } }, { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#e88a7a' }, 'smith') + '</g>' : '';
        const a = one('anvil'), b = one('forge');
        P(lot.x0 - 120, lot.x1 + 120, a + smith + b);
      } else {
        const g = one(lot.k);
        if (g && lot.B) { const f = L.fr[lot.k]; kit.prop(lot.x0 - 140, f.top - 160, lot.x1 - lot.x0 + 280, lot.B - f.top + 200, lot.B, g); }
        else if (g) P(lot.x0 - 120, lot.x1 + 120, g);
      }
      R = R0;
    }
    // баннер с названием города над улицей — нет; имя — на воротах. Гирлянды огней в посёлке — между соседними домами:
    // 24.10 (снимок стримера: провода висели в воздухе) — концы провода на углах стен под крышей соседних зданий (крюк), провисает, лампочки — на проводе
    if (!V) {
      const eave = (lot) => {   // [x0, x1, y] — верх стен (под свесом крыши) или null, если у здания нет стены до края (шатёр, доска, ворота, лоток)
        if (lot.k === 'house') { const h = (V ? 120 : 160) + (lot.v % 60); return [lot.x0, lot.x1, (K.stilts ? lot.base - 54 : lot.base) - h]; }
        const f = L.fr[lot.k]; if (!f || ['gate', 'board', 'tent', 'magic'].includes(lot.k) || (f.lv <= 1 && ['shop', 'auction'].includes(lot.k))) return null;
        if (lot.k === 'hall' && CAP) return null;
        return [f.x0, f.x1, f.B - f.wall];
      };
      const BUL = ['#ffd76a', '#ff8a5c', '#6fdc6f', '#4ab0ff', '#e8455c'];
      for (let i = 1; i < L.lots.length; i++) {
        const A = eave(L.lots[i - 1]), Bq = eave(L.lots[i]); if (!A || !Bq) continue;
        const ax = A[1] - 6, ay = A[2] + 10, bx = Bq[0] + 6, by = Bq[2] + 10, gap = bx - ax;
        if (gap < 60 || gap > 460 || R() < 0.35) continue;
        const sag = 26 + gap * 0.12, mx = (ax + bx) / 2, my = Math.max(ay, by) + sag;
        let g = `<path d="M${f1(ax)} ${f1(ay)} Q${f1(mx)} ${f1(my + sag * 0.6)} ${f1(bx)} ${f1(by)}" fill="none" stroke="${INK}" stroke-width="3"/>`
          + `<circle cx="${f1(ax)}" cy="${f1(ay)}" r="4" fill="${INK}"/><circle cx="${f1(bx)}" cy="${f1(by)}" r="4" fill="${INK}"/>`;
        const n = Math.max(3, Math.round(gap / 40));
        for (let k = 1; k < n; k++) { const t = k / n, x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * mx + t * t * bx, y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * (my + sag * 0.6) + t * t * by; g += `<circle cx="${f1(x)}" cy="${f1(y + 5)}" r="6" fill="${BUL[k % BUL.length]}" ${O(1.5)}/>`; }
        P(ax - 10, bx + 10, g);
      }
    }

    /* ================= предметы с глубиной (в одном слое с человечками) ================= */
    const FLATP = { flowers: 1, flowerbed: 1, pool: 1, pond: 1, bones: 1, mushroom: 1, drift: 1, rubble: 1, stump: 1, bush: 1, bench: 1, hedge: 1, fence: 1, planter: 1, reeds: 1, rock: 1, barrel: 1, crate: 1, pot: 1, woodpile: 1 };
    const prop = (p, w, h, svg) => props.push({ x: Math.round(p.x - w / 2), y: Math.round(p.y - h), w: Math.round(w), h: Math.round(h + 30), z: p.y, svg: () => svg });
    const ell = (x, y, rx, ry) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${INK}" opacity=".28"/>`;
    for (const p of L.props) {
      const { x, y } = p, s = p.s || 1;
      let g = '', w = 140, h = 160, flat = false;
      const hp = HA && HA.prop ? HA.prop(p, kit) : null;   // 28.10: свои предметы ручной деревни (и свой вид общих)
      if (hp) { g = hp.g; w = hp.w || w; h = hp.h || h; flat = !!hp.flat; }
      else switch (p.k) {
        case 'tree': g = ell(x, y, 34 * s, 9) + tree(x, y, 1.05 * s); w = 180 * s; h = 220 * s; break;
        case 'pine': g = ell(x, y, 34 * s, 9) + tree(x, y, 1.1 * s, SNOW ? 'snowpine' : 'pine'); w = 160 * s; h = 260 * s; break;
        case 'palm': g = ell(x, y, 30 * s, 8) + tree(x, y, s, 'palm'); w = 220 * s; h = 240 * s; break;
        case 'deadtree': g = ell(x, y, 26 * s, 7) + tree(x, y, s, 'dead'); w = 120 * s; h = 170 * s; break;
        case 'bush': g = ell(x, y, 40 * s, 10) + `<ellipse cx="${x}" cy="${f1(y - 20 * s)}" rx="${f1(44 * s)}" ry="${f1(26 * s)}" fill="${K.leaf[0]}" ${O(3.5)}/><ellipse cx="${f1(x + 14 * s)}" cy="${f1(y - 30 * s)}" rx="${f1(22 * s)}" ry="${f1(14 * s)}" fill="${K.leaf[1] || K.leaf[0]}" ${O(3)}/>` + (SNOW ? `<ellipse cx="${x}" cy="${f1(y - 40 * s)}" rx="${f1(30 * s)}" ry="${f1(9 * s)}" fill="#f6fafd"/>` : ''); h = 70 * s; break;
        case 'barrel': g = ell(x, y, 26, 7) + `<rect x="${x - 24}" y="${y - 58}" width="48" height="60" rx="10" fill="${K.wood}" ${O(3.5)}/><path d="M${x - 24} ${y - 42} H${x + 24} M${x - 24} ${y - 16} H${x + 24}" stroke="${K.woodD}" stroke-width="4.5"/>` + (SNOW ? `<ellipse cx="${x}" cy="${y - 58}" rx="24" ry="7" fill="#f6fafd"/>` : ''); h = 70; break;
        case 'crate': g = ell(x, y, 34, 8) + `<rect x="${x - 32}" y="${y - 52}" width="64" height="54" fill="${K.wood}" ${O(3.5)}/><path d="M${x - 32} ${y - 52} L${x + 32} ${y + 2} M${x + 32} ${y - 52} L${x - 32} ${y + 2}" stroke="${K.woodD}" stroke-width="4"/>`; h = 64; break;
        case 'pot': g = ell(x, y, 22, 6) + `<path d="M${x - 22} ${y - 40} H${x + 22} L${x + 16} ${y} H${x - 16} Z" fill="#c56a2a" ${O(3.5)}/>` + (L.biome === 'desert' ? `<ellipse cx="${x}" cy="${y - 40}" rx="22" ry="6" fill="#a8582a" ${O(2.5)}/>` : `<circle cx="${x - 10}" cy="${y - 56}" r="15" fill="${K.leaf[0]}" ${O(3)}/><circle cx="${x + 10}" cy="${y - 62}" r="16" fill="${K.leaf[1] || K.leaf[0]}" ${O(3)}/>`); h = 80; break;
        case 'flowers': for (let i = 0; i < 5; i++) { const px = x - 30 + i * 15, py = y - (i % 2) * 6; g += `<path d="M${px} ${py} V${py - 22}" stroke="#3f8f3a" stroke-width="3"/><circle cx="${px}" cy="${py - 26}" r="7" fill="${['#e8455c', '#ffd76a', '#b9a2ff'][i % 3]}" ${O(2)}/>`; } h = 50; break;
        case 'flowerbed': g = `<ellipse cx="${x}" cy="${y}" rx="${f1(72 * s)}" ry="${f1(22 * s)}" fill="${K.stone}" ${O(3.5)}/><ellipse cx="${x}" cy="${f1(y - 4)}" rx="${f1(60 * s)}" ry="${f1(15 * s)}" fill="#5a3d24"/>`; for (let i = 0; i < 7; i++) { const px = x - 48 * s + i * 16 * s, py = y - 10 - (i % 2) * 7; g += `<path d="M${f1(px)} ${f1(py + 6)} V${f1(py - 16)}" stroke="#3f8f3a" stroke-width="3"/><circle cx="${f1(px)}" cy="${f1(py - 20)}" r="8" fill="${['#e8455c', '#ffd76a', '#b9a2ff'][i % 3]}" ${O(2)}/>`; } w = 170 * s; h = 60; break;
        case 'haystack': g = ell(x, y, 56 * s, 12) + `<path d="M${f1(x - 56 * s)} ${y} Q${f1(x - 50 * s)} ${f1(y - 90 * s)} ${x} ${f1(y - 100 * s)} Q${f1(x + 50 * s)} ${f1(y - 90 * s)} ${f1(x + 56 * s)} ${y} Z" fill="#e0b456" ${O(3.5)}/><path d="M${f1(x - 40 * s)} ${f1(y - 30 * s)} q40 -14 80 0 M${f1(x - 30 * s)} ${f1(y - 60 * s)} q30 -10 60 0" stroke="#a8832e" stroke-width="3" fill="none"/>`; w = 140 * s; h = 110 * s; break;
        case 'fence': { const fx0 = x - 70 * s, fx1 = x + 70 * s; // 23.10 (баг от зрителя: «забор в 1 пиксель» при мелкой сцене): перекладины с обводкой, штакетины — толстые, с острым верхом
          g = [y - 38, y - 20].map((ry) => `<rect x="${f1(fx0)}" y="${f1(ry)}" width="${f1(fx1 - fx0)}" height="10" rx="3" fill="${K.woodD}" stroke="${INK}" stroke-width="4"/>`).join('');
          for (let px = fx0 + 8; px <= fx1; px += 28 * s) g += `<path d="M${f1(px - 7)} ${y} V${y - 44} L${f1(px)} ${y - 54} L${f1(px + 7)} ${y - 44} V${y} Z" fill="${K.wood}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M${f1(px - 2)} ${y - 6} V${y - 42}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity=".3"/>`; if (SNOW) g += `<path d="M${f1(fx0)} ${f1(y - 38)} H${f1(fx1)}" stroke="#f6fafd" stroke-width="5"/>`; w = 170 * s; h = 60; break; }
        case 'cart': g = ell(x, y, 56, 10) + `<rect x="${x - 54}" y="${y - 62}" width="108" height="40" fill="${K.wood}" ${O(3.5)}/><circle cx="${x - 30}" cy="${y - 14}" r="16" fill="${K.woodD}" ${O(3)}/><circle cx="${x + 30}" cy="${y - 14}" r="16" fill="${K.woodD}" ${O(3)}/><path d="M${x + 54} ${y - 42} l40 20" stroke="${K.woodD}" stroke-width="6"/>` + (L.biome === 'meadow' ? `<path d="M${x - 50} ${y - 62} q50 -40 100 0 Z" fill="#e0b456" ${O(3)}/>` : ''); w = 200; h = 110; break;
        case 'mushroom': g = `<rect x="${x - 5}" y="${y - 24}" width="10" height="26" rx="4" fill="#f3efd8" ${O(2.5)}/><path d="M${x - 20} ${y - 20} q20 -30 40 0 Z" fill="#e8455c" ${O(3)}/><circle cx="${x - 6}" cy="${y - 30}" r="3" fill="#fff"/>`; h = 50; break;
        case 'stump': g = ell(x, y, 24, 6) + `<path d="M${x - 22} ${y} V${y - 24} H${x + 22} V${y} Z" fill="${K.wood}" ${O(3)}/><ellipse cx="${x}" cy="${y - 24}" rx="22" ry="8" fill="#d8b48a" ${O(3)}/>`; h = 50; break;
        case 'woodpile': g = ell(x, y, 52, 9); for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) g += `<circle cx="${x - 36 + c * 24 + r * 12}" cy="${y - 12 - r * 20}" r="11" fill="#d8b48a" ${O(3)}/>`; if (SNOW) g += `<path d="M${x - 40} ${y - 62} q40 -20 80 0" stroke="#f6fafd" stroke-width="8" fill="none"/>`; h = 80; break;
        case 'rock': g = ell(x, y, 40 * s, 9) + `<path d="M${f1(x - 40 * s)} ${y} L${f1(x - 30 * s)} ${f1(y - 40 * s)} L${f1(x)} ${f1(y - 56 * s)} L${f1(x + 34 * s)} ${f1(y - 36 * s)} L${f1(x + 40 * s)} ${y} Z" fill="${L.biome === 'ash' ? '#3a3238' : L.biome === 'desert' ? '#c49a6a' : '#8a8696'}" ${O(3.5)}/>` + (SNOW ? `<path d="M${f1(x - 28 * s)} ${f1(y - 38 * s)} L${f1(x)} ${f1(y - 56 * s)} L${f1(x + 30 * s)} ${f1(y - 36 * s)} q-30 10 -58 2 Z" fill="#f6fafd"/>` : '') + (K.lava ? `<path d="M${f1(x - 10 * s)} ${f1(y - 6)} l8 -20 l10 8" stroke="#ff7a2a" stroke-width="3" fill="none"/>` : ''); h = 80 * s; break;
        case 'drift': g = `<path d="M${f1(x - 56 * s)} ${y + 4} Q${f1(x - 30 * s)} ${f1(y - 34 * s)} ${x} ${f1(y - 22 * s)} Q${f1(x + 30 * s)} ${f1(y - 42 * s)} ${f1(x + 56 * s)} ${y + 4} Z" fill="#f6fafd" ${O(3, '#a8c0d8')}/>`; h = 60; break;
        case 'snowman': g = ell(x, y, 26, 7) + `<circle cx="${x}" cy="${y - 24}" r="26" fill="#f6fafd" ${O(3, '#8aa4c0')}/><circle cx="${x}" cy="${y - 64}" r="18" fill="#f6fafd" ${O(3, '#8aa4c0')}/><path d="M${x} ${y - 64} l14 4 l-14 3 Z" fill="#ff8a2a"/><circle cx="${x - 6}" cy="${y - 70}" r="2.5" fill="${INK}"/><circle cx="${x + 6}" cy="${y - 70}" r="2.5" fill="${INK}"/><path d="M${x - 14} ${y - 84} h28 v-6 h-6 v-16 h-16 v16 h-6 Z" fill="${INK}"/>`; h = 120; break;
        case 'lantern': g = `<circle cx="${x}" cy="${y - 110}" r="40" fill="url(#tgGlow)" opacity=".75"/><path d="M${x} ${y} V${y - 120} q0 -10 16 -10" stroke="${INK}" stroke-width="6" fill="none"/><path d="M${x + 8} ${y - 126} h18 l-3 22 h-12 Z" fill="#ffd76a" ${O(2.5)}/>`; h = 160; break;
        case 'nets': g = `<path d="M${x - 44} ${y} V${y - 80} M${x + 44} ${y} V${y - 80}" stroke="${K.woodD}" stroke-width="7"/><path d="M${x - 44} ${y - 76} Q${x} ${y - 30} ${x + 44} ${y - 76}" stroke="#c8bc94" stroke-width="3" fill="none"/>` + [0, 1, 2, 3, 4].map((i) => `<path d="M${x - 36 + i * 18} ${y - 72 + Math.abs(i - 2) * 4} V${y - 40}" stroke="#c8bc94" stroke-width="2"/>`).join(''); h = 100; break;
        case 'reeds': for (let i = 0; i < 6; i++) { const px = x - 25 + i * 10; g += `<path d="M${px} ${y} Q${px + (i % 2 ? 6 : -6)} ${y - 40} ${px + (i % 2 ? 10 : -4)} ${y - 66 - (i % 3) * 8}" stroke="#6a7a3a" stroke-width="4" fill="none"/>`; if (i % 2) g += `<ellipse cx="${px + 9}" cy="${y - 70 - (i % 3) * 8}" rx="4" ry="10" fill="#6a4a2a"/>`; } h = 100; break;
        case 'pool': case 'pond': { const rx = (p.k === 'pond' ? 110 : 90) * s, ry = (p.k === 'pond' ? 28 : 26) * s; g = `<ellipse cx="${x}" cy="${y}" rx="${f1(rx + 8)}" ry="${f1(ry + 5)}" fill="${K.dirtD}"/><ellipse cx="${x}" cy="${y}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#tgWater)" ${O(3)}/><path d="M${f1(x - rx * 0.4)} ${f1(y - 4)} q14 -6 28 0" stroke="#e8f8ff" stroke-width="3" fill="none" opacity=".6"/>`; if (p.k === 'pond') g += tree(x + rx * 0.9, y - 6, 0.8, 'palm'); if (L.biome === 'swamp') g += `<ellipse cx="${f1(x + rx * 0.3)}" cy="${f1(y + 4)}" rx="12" ry="5" fill="#5a8a3a"/>`; w = rx * 2 + 200; h = 200; break; }
        case 'brazier': g = ell(x, y, 22, 6) + `<ellipse cx="${x}" cy="${y - 70}" rx="44" ry="36" fill="url(#tgFire)"/><path d="M${x - 14} ${y} L${x} ${y - 40} L${x + 14} ${y}" stroke="${INK}" stroke-width="6" fill="none"/><path d="M${x - 24} ${y - 48} H${x + 24} L${x + 16} ${y - 34} H${x - 16} Z" fill="#3a3238" ${O(3)}/><path d="M${x - 14} ${y - 50} q14 -36 28 0 q-6 -20 -14 -4 q-8 -16 -14 4" fill="#ff8a2a"/>`; h = 110; break;
        case 'bones': g = `<path d="M${x - 30} ${y - 4} l60 -8" stroke="#efe4cc" stroke-width="8" stroke-linecap="round"/><circle cx="${x - 32}" cy="${y - 4}" r="6" fill="#efe4cc"/><circle cx="${x + 32}" cy="${y - 12}" r="6" fill="#efe4cc"/><ellipse cx="${x + 10}" cy="${y - 20}" rx="14" ry="11" fill="#efe4cc" ${O(2.5)}/>`; h = 40; break;
        case 'cactus': g = ell(x, y, 18, 5) + `<path d="M${x} ${y} V${y - 90} M${x} ${y - 50} h-22 v-20 M${x} ${y - 60} h20 v-24" stroke="${INK}" stroke-width="22" stroke-linecap="round" fill="none"/><path d="M${x} ${y} V${y - 90} M${x} ${y - 50} h-22 v-20 M${x} ${y - 60} h20 v-24" stroke="#5a9a4a" stroke-width="15" stroke-linecap="round" fill="none"/>`; h = 110; break;
        case 'camelpost': g = `<path d="M${x} ${y} V${y - 70}" stroke="${INK}" stroke-width="10"/><path d="M${x} ${y} V${y - 70}" stroke="${K.wood}" stroke-width="6"/><path d="M${x - 6} ${y - 64} q-30 10 -40 40" stroke="#c8402a" stroke-width="3" fill="none"/>`; h = 90; break;
        case 'boat': g = ell(x, y, 70, 9) + `<path d="M${x - 70} ${y - 30} H${x + 70} Q${x + 50} ${y} ${x} ${y} Q${x - 50} ${y} ${x - 70} ${y - 30} Z" fill="${K.wood}" ${O(3.5)}/>`; w = 180; h = 60; break;
        case 'rubble': g = ell(x, y, 44, 9); for (let i = 0; i < 6; i++) { const px = x - 34 + (i * 13) % 60, py = y - 6 - (i % 3) * 12; g += `<rect x="${px}" y="${py - 14}" width="${18 + (i % 3) * 6}" height="14" rx="3" fill="${K.stone}" ${O(2.5)} transform="rotate(${(i * 23) % 40 - 20} ${px} ${py})"/>`; } h = 60; break;
        case 'brokencol': g = ell(x, y, 28, 7) + `<path d="M${x - 20} ${y} V${y - 80} l8 -10 l10 14 l8 -18 l14 12 V${y} Z" fill="#c8c0b0" ${O(3.5)}/><path d="M${x - 8} ${y - 4} V${y - 72} M${x + 6} ${y - 4} V${y - 76}" stroke="${INK}" stroke-width="2" opacity=".4"/>`; h = 110; break;
        case 'dummy': g = ell(x, y, 22, 6) + `<path d="M${x} ${y} V${y - 76}" stroke="${K.woodD}" stroke-width="8"/><path d="M${x - 30} ${y - 56} H${x + 30}" stroke="${K.woodD}" stroke-width="7" stroke-linecap="round"/><ellipse cx="${x}" cy="${y - 46}" rx="22" ry="30" fill="#e8c95a" ${O(3.5)}/><circle cx="${x}" cy="${y - 88}" r="16" fill="#e8c95a" ${O(3.5)}/>`; h = 120; break;
        case 'well': g = ell(x, y, 62, 12) + `<ellipse cx="${x}" cy="${y - 10}" rx="58" ry="20" fill="${K.stone}" ${O(4)}/><rect x="${x - 58}" y="${y - 54}" width="116" height="44" fill="${K.stone}" ${O(4)}/><ellipse cx="${x}" cy="${y - 54}" rx="58" ry="18" fill="#2a3a5a" ${O(4)}/><path d="M${x - 50} ${y - 54} V${y - 140} M${x + 50} ${y - 54} V${y - 140}" stroke="${K.woodD}" stroke-width="9"/><path d="M${x - 70} ${y - 130} L${x} ${y - 176} L${x + 70} ${y - 130} Z" fill="${K.roofC}" ${O(3.5)}/>` + (SNOW ? `<path d="M${x - 70} ${y - 132} L${x} ${y - 176} L${x + 70} ${y - 132} l-10 4 L${x} ${y - 160} L${x - 60} ${y - 128} Z" fill="#f6fafd"/>` : ''); w = 180; h = 200; break;
        case 'lamp': g = `<circle cx="${x}" cy="${y - 186}" r="46" fill="url(#tgGlow)" opacity=".7"/><path d="M${x} ${y} V${y - 180}" stroke="${INK}" stroke-width="9"/><path d="M${x - 12} ${y - 180} h24 l-4 -26 h-16 Z" fill="#ffd76a" ${O(3)}/><path d="M${x - 16} ${y - 206} h32 l-16 -14 Z" fill="${INK}"/>`; h = 240; break;
        /* 24.10: площади — памятники по природе (центральная площадь), фонтан столицы, скамейки, лотки рынка, кадки, живая изгородь */
        case 'fountain': { // ярусный фонтан: чаша, вторая чаша на столбе, струи; пепел — лава, лёд — замёрзшие струи
          const S2 = s, lava = !!K.lava, jet = lava ? '#ffb34d' : SNOW >= 1 ? '#dff0fb' : '#9ad8f8';
          g = ell(x, y + 4, 140 * S2, 16) + `<ellipse cx="${x}" cy="${y}" rx="${f1(132 * S2)}" ry="${f1(36 * S2)}" fill="${K.stone}" ${O(4.5)}/><path d="M${f1(x - 132 * S2)} ${y} v-26 a${f1(132 * S2)} ${f1(36 * S2)} 0 0 1 ${f1(264 * S2)} 0 v26" fill="${K.stone}" ${O(4.5)}/>`
            + `<ellipse cx="${x}" cy="${f1(y - 26)}" rx="${f1(118 * S2)}" ry="${f1(28 * S2)}" fill="${lava ? 'url(#tgFire)' : 'url(#tgWater)'}" ${O(3)}/>`
            + `<rect x="${f1(x - 14 * S2)}" y="${f1(y - 120 * S2)}" width="${f1(28 * S2)}" height="${f1(96 * S2)}" fill="${K.stone}" ${O(3.5)}/><ellipse cx="${x}" cy="${f1(y - 118 * S2)}" rx="${f1(54 * S2)}" ry="${f1(15 * S2)}" fill="${K.stone}" ${O(3.5)}/>`
            + `<rect x="${f1(x - 8 * S2)}" y="${f1(y - 168 * S2)}" width="${f1(16 * S2)}" height="${f1(50 * S2)}" fill="${K.stone}" ${O(3)}/><circle cx="${x}" cy="${f1(y - 172 * S2)}" r="${f1(12 * S2)}" fill="${CAP ? GOLD : K.stone}" ${O(3)}/>`
            + `<path d="M${x} ${f1(y - 176 * S2)} q${f1(-44 * S2)} -36 ${f1(-62 * S2)} ${f1(52 * S2)} M${x} ${f1(y - 176 * S2)} q${f1(44 * S2)} -36 ${f1(62 * S2)} ${f1(52 * S2)} M${f1(x - 54 * S2)} ${f1(y - 116 * S2)} q${f1(-40 * S2)} 6 ${f1(-52 * S2)} ${f1(80 * S2)} M${f1(x + 54 * S2)} ${f1(y - 116 * S2)} q${f1(40 * S2)} 6 ${f1(52 * S2)} ${f1(80 * S2)}" stroke="${jet}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`;
          w = 320 * S2; h = 230 * S2; break; }
        case 'oak': { // старый дуб с круглой скамьёй
          g = ell(x, y + 6, 90 * s, 18) + `<rect x="${f1(x - 26 * s)}" y="${f1(y - 130 * s)}" width="${f1(52 * s)}" height="${f1(134 * s)}" rx="10" fill="${K.woodD}" ${O(4)}/><path d="M${f1(x - 26 * s)} ${f1(y - 4)} l-22 8 M${f1(x + 26 * s)} ${f1(y - 4)} l22 8" stroke="${K.woodD}" stroke-width="10" stroke-linecap="round"/>`;
          for (const [dx, dy, r] of [[-70, -170, 66], [70, -176, 62], [0, -238, 78], [-30, -200, 60], [44, -214, 56]]) g += `<circle cx="${f1(x + dx * s)}" cy="${f1(y + dy * s)}" r="${f1(r * s)}" fill="${K.leaf[(dx + 70) % K.leaf.length] || K.leaf[0]}" ${O(4)}/>`;
          g += `<path d="M${f1(x - 82 * s)} ${f1(y - 18)} a${f1(82 * s)} 22 0 0 0 ${f1(164 * s)} 0" fill="none" stroke="${INK}" stroke-width="16"/><path d="M${f1(x - 82 * s)} ${f1(y - 18)} a${f1(82 * s)} 22 0 0 0 ${f1(164 * s)} 0" fill="none" stroke="${K.wood}" stroke-width="10"/>`;
          w = 340 * s; h = 330 * s; break; }
        case 'totem': { // резной тотем с крыльями и чашами огня
          const t = y - 210 * s;
          g = ell(x, y, 40 * s, 10) + `<rect x="${f1(x - 22 * s)}" y="${f1(t)}" width="${f1(44 * s)}" height="${f1(212 * s)}" fill="${K.wood}" ${O(4)}/>`;
          for (let i = 0; i < 3; i++) { const fy = t + 20 * s + i * 62 * s; g += `<rect x="${f1(x - 16 * s)}" y="${f1(fy)}" width="${f1(32 * s)}" height="${f1(40 * s)}" rx="6" fill="${['#c8402a', '#3a6aa8', '#e0b456'][i]}" ${O(2.5)}/><circle cx="${f1(x - 7 * s)}" cy="${f1(fy + 14 * s)}" r="${f1(4 * s)}" fill="${INK}"/><circle cx="${f1(x + 7 * s)}" cy="${f1(fy + 14 * s)}" r="${f1(4 * s)}" fill="${INK}"/><path d="M${f1(x - 8 * s)} ${f1(fy + 28 * s)} h${f1(16 * s)}" stroke="${INK}" stroke-width="3"/>`; }
          g += `<path d="M${f1(x - 22 * s)} ${f1(t + 30 * s)} l${f1(-60 * s)} ${f1(-20 * s)} l${f1(10 * s)} ${f1(34 * s)} Z M${f1(x + 22 * s)} ${f1(t + 30 * s)} l${f1(60 * s)} ${f1(-20 * s)} l${f1(-10 * s)} ${f1(34 * s)} Z" fill="${K.roof2}" ${O(3)}/>` + (SNOW ? `<path d="M${f1(x - 24 * s)} ${f1(t)} h${f1(48 * s)}" stroke="#f6fafd" stroke-width="8" stroke-linecap="round"/>` : '');
          for (const sx of [-1, 1]) g += `<ellipse cx="${f1(x + sx * 70 * s)}" cy="${f1(y - 50 * s)}" rx="30" ry="24" fill="url(#tgFire)"/><path d="M${f1(x + sx * 70 * s)} ${y} v${f1(-44 * s)}" stroke="${INK}" stroke-width="6"/><path d="M${f1(x + sx * 70 * s - 14)} ${f1(y - 46 * s)} h28 l-6 10 h-16 Z" fill="#5a5462" ${O(2.5)}/><path d="M${f1(x + sx * 70 * s - 8)} ${f1(y - 48 * s)} q8 -22 16 0" fill="#ffb34d"/>`;
          w = 220 * s; h = 240 * s; break; }
        case 'swamptotem': { // болотный идол: шест, маска, фонари на верёвках
          const t = y - 200 * s;
          g = ell(x, y, 36 * s, 9) + `<path d="M${x} ${y} V${f1(t)}" stroke="${INK}" stroke-width="${f1(20 * s)}"/><path d="M${x} ${y} V${f1(t)}" stroke="${K.woodD}" stroke-width="${f1(13 * s)}"/>`
            + `<ellipse cx="${x}" cy="${f1(t + 10 * s)}" rx="${f1(30 * s)}" ry="${f1(38 * s)}" fill="#c8bc94" ${O(3.5)}/><circle cx="${f1(x - 11 * s)}" cy="${f1(t + 4 * s)}" r="${f1(6 * s)}" fill="#6fdc6f"/><circle cx="${f1(x + 11 * s)}" cy="${f1(t + 4 * s)}" r="${f1(6 * s)}" fill="#6fdc6f"/><path d="M${f1(x - 12 * s)} ${f1(t + 26 * s)} h${f1(24 * s)}" stroke="${INK}" stroke-width="3"/>`
            + `<path d="M${f1(x - 46 * s)} ${f1(t + 82 * s)} V${f1(t + 66 * s)} Q${f1(x - 24 * s)} ${f1(t + 64 * s)} ${x} ${f1(t + 52 * s)} Q${f1(x + 24 * s)} ${f1(t + 64 * s)} ${f1(x + 46 * s)} ${f1(t + 66 * s)} V${f1(t + 82 * s)}" stroke="#c8bc94" stroke-width="3" fill="none"/>`;   // верёвка — от шеста к фонарям
          for (const sx of [-1, 1]) g += `<circle cx="${f1(x + sx * 46 * s)}" cy="${f1(t + 92 * s)}" r="26" fill="url(#tgGlow)"/><path d="M${f1(x + sx * 46 * s - 8)} ${f1(t + 82 * s)} h16 l-2 20 h-12 Z" fill="#ffd76a" ${O(2.5)}/>`;
          g += `<path d="M${f1(x - 30 * s)} ${y} q-6 -40 -18 -62 M${f1(x + 30 * s)} ${y} q6 -40 18 -62" stroke="#6a7a3a" stroke-width="4" fill="none"/>`;
          w = 200 * s; h = 240 * s; break; }
        case 'icestatue': case 'stonestatue': case 'statue': case 'ruinstatue': { // постамент и фигура: ледяной рыцарь, каменный воин, основатель (столица), разбитая статуя
          const ice = p.k === 'icestatue', ruin = p.k === 'ruinstatue', top = y - 70 * s;
          const fc = ice ? '#bfe6fb' : p.k === 'statue' ? '#8b8796' : ruin ? '#c8c0b0' : '#9a96a2', fo = ice ? `stroke="#5a8ab0" stroke-width="3.5" stroke-linejoin="round"` : O(3.5);
          g = ell(x, y + 4, 76 * s, 14) + `<rect x="${f1(x - 64 * s)}" y="${f1(top)}" width="${f1(128 * s)}" height="${f1(70 * s)}" fill="${ice ? '#dfeef8' : K.stone}" ${O(4)}/><rect x="${f1(x - 76 * s)}" y="${f1(top - 16 * s)}" width="${f1(152 * s)}" height="${f1(20 * s)}" fill="${ice ? '#dfeef8' : K.stone}" ${O(3.5)}/>`;
          const by = top - 16 * s;
          if (ruin) g += `<path d="M${f1(x - 26 * s)} ${f1(by)} V${f1(by - 70 * s)} l${f1(12 * s)} ${f1(-14 * s)} l${f1(10 * s)} ${f1(10 * s)} l${f1(16 * s)} ${f1(-20 * s)} l${f1(14 * s)} ${f1(18 * s)} V${f1(by)} Z" fill="${fc}" ${fo}/><circle cx="${f1(x + 54 * s)}" cy="${f1(y - 12)}" r="${f1(16 * s)}" fill="${fc}" ${O(3)}/>`;
          else {
            g += `<path d="M${f1(x - 30 * s)} ${f1(by)} L${f1(x - 24 * s)} ${f1(by - 96 * s)} Q${x} ${f1(by - 112 * s)} ${f1(x + 24 * s)} ${f1(by - 96 * s)} L${f1(x + 30 * s)} ${f1(by)} Z" fill="${fc}" ${fo}/><circle cx="${x}" cy="${f1(by - 124 * s)}" r="${f1(22 * s)}" fill="${fc}" ${fo}/>`;
            g += `<path d="M${f1(x + 24 * s)} ${f1(by - 86 * s)} L${f1(x + 50 * s)} ${f1(by - 130 * s)}" stroke="${INK}" stroke-width="${f1(14 * s)}" stroke-linecap="round"/><path d="M${f1(x + 24 * s)} ${f1(by - 86 * s)} L${f1(x + 50 * s)} ${f1(by - 130 * s)}" stroke="${fc}" stroke-width="${f1(8 * s)}" stroke-linecap="round"/><path d="M${f1(x + 50 * s)} ${f1(by - 124 * s)} V${f1(by - 214 * s)}" stroke="${ice ? '#9ae6ff' : '#c9ccd6'}" stroke-width="${f1(7 * s)}"/>`;
            if (ice) g += `<path d="M${f1(x - 60 * s)} ${f1(by)} l${f1(12 * s)} ${f1(-60 * s)} l${f1(10 * s)} ${f1(60 * s)} Z M${f1(x + 40 * s)} ${f1(by)} l${f1(10 * s)} ${f1(-44 * s)} l${f1(10 * s)} ${f1(44 * s)} Z" fill="#dff4ff" ${fo}/><path d="M${f1(x - 10 * s)} ${f1(by - 80 * s)} l${f1(8 * s)} ${f1(30 * s)}" stroke="#ffffff" stroke-width="4" opacity=".8"/>`;
            if (p.k === 'statue') g += `<path d="M${f1(x - 30 * s)} ${f1(by - 30 * s)} q${f1(-30 * s)} 6 ${f1(-36 * s)} ${f1(30 * s)}" stroke="#7a1a2a" stroke-width="${f1(10 * s)}" fill="none"/>`;
          }
          if (p.k === 'statue') g += txt(x, top + 44 * s, 'ОСНОВАТЕЛЮ', f1(15 * s));
          if (SNOW && !ice) g += `<path d="M${f1(x - 76 * s)} ${f1(top - 14 * s)} h${f1(152 * s)}" stroke="#f6fafd" stroke-width="7"/>`;
          w = 200 * s; h = 300 * s; break; }
        case 'lavabowl': { // огненная чаша на каменной ступени
          g = ell(x, y + 4, 86 * s, 16) + `<path d="M${f1(x - 80 * s)} ${y} v${f1(-24 * s)} h${f1(160 * s)} v${f1(24 * s)} Z" fill="#2e2a30" ${O(4)}/><path d="M${f1(x - 60 * s)} ${f1(y - 24 * s)} L${f1(x - 24 * s)} ${f1(y - 70 * s)} H${f1(x + 24 * s)} L${f1(x + 60 * s)} ${f1(y - 24 * s)} Z" fill="#3a3238" ${O(4)}/>`
            + `<ellipse cx="${x}" cy="${f1(y - 150 * s)}" rx="${f1(110 * s)}" ry="${f1(90 * s)}" fill="url(#tgFire)"/><path d="M${f1(x - 74 * s)} ${f1(y - 100 * s)} H${f1(x + 74 * s)} L${f1(x + 54 * s)} ${f1(y - 70 * s)} H${f1(x - 54 * s)} Z" fill="#4a3e40" ${O(4)}/><ellipse cx="${x}" cy="${f1(y - 100 * s)}" rx="${f1(74 * s)}" ry="${f1(14 * s)}" fill="#ff7a2a" ${O(3)}/>`
            + `<path d="M${f1(x - 50 * s)} ${f1(y - 104 * s)} q${f1(20 * s)} ${f1(-90 * s)} ${f1(46 * s)} ${f1(-8 * s)} q${f1(10 * s)} ${f1(-70 * s)} ${f1(40 * s)} ${f1(-6 * s)} q${f1(10 * s)} ${f1(-40 * s)} ${f1(14 * s)} ${f1(8 * s)}" fill="#ffb34d" stroke="#ff6a2a" stroke-width="3"/><path d="M${f1(x - 70 * s)} ${f1(y - 20)} l14 -6 M${f1(x + 40 * s)} ${f1(y - 14)} l16 4" stroke="#ff7a2a" stroke-width="4"/>`;
          w = 260 * s; h = 260 * s; break; }
        case 'oasis': { // оазис-колодец: пруд в каменном кольце, пальмы
          g = `<ellipse cx="${x}" cy="${y}" rx="${f1(156 * s)}" ry="${f1(44 * s)}" fill="${K.dirtD}"/><ellipse cx="${x}" cy="${y}" rx="${f1(146 * s)}" ry="${f1(38 * s)}" fill="url(#tgWater)" ${O(3.5)}/><path d="M${f1(x - 60 * s)} ${f1(y - 6)} q14 -6 28 0 M${f1(x + 20 * s)} ${f1(y + 8)} q14 -6 28 0" stroke="#e8f8ff" stroke-width="3" fill="none" opacity=".7"/>`;
          for (let i = 0; i < 9; i++) { const a = Math.PI * (0.05 + i * 0.1125), rx2 = 150 * s, ry2 = 40 * s; g += `<ellipse cx="${f1(x - Math.cos(a) * rx2)}" cy="${f1(y + Math.sin(a) * ry2)}" rx="18" ry="11" fill="${K.stone}" ${O(3)}/>`; }
          g += tree(x - 120 * s, y - 20, 1.05 * s, 'palm') + tree(x + 130 * s, y - 16, 0.9 * s, 'palm');
          w = 420 * s; h = 300 * s; break; }
        case 'anchor': { // якорь на постаменте, канат
          const top = y - 40 * s;
          g = ell(x, y + 4, 60 * s, 12) + `<rect x="${f1(x - 54 * s)}" y="${f1(top)}" width="${f1(108 * s)}" height="${f1(40 * s)}" fill="${K.stone}" ${O(4)}/>`
            + `<path d="M${x} ${f1(top)} V${f1(top - 130 * s)} M${f1(x - 30 * s)} ${f1(top - 104 * s)} H${f1(x + 30 * s)} M${f1(x - 52 * s)} ${f1(top - 34 * s)} Q${x} ${f1(top + 16 * s)} ${f1(x + 52 * s)} ${f1(top - 34 * s)}" stroke="${INK}" stroke-width="${f1(18 * s)}" fill="none" stroke-linecap="round"/>`
            + `<path d="M${x} ${f1(top)} V${f1(top - 130 * s)} M${f1(x - 30 * s)} ${f1(top - 104 * s)} H${f1(x + 30 * s)} M${f1(x - 52 * s)} ${f1(top - 34 * s)} Q${x} ${f1(top + 16 * s)} ${f1(x + 52 * s)} ${f1(top - 34 * s)}" stroke="#5a6676" stroke-width="${f1(11 * s)}" fill="none" stroke-linecap="round"/>`
            + `<circle cx="${x}" cy="${f1(top - 142 * s)}" r="${f1(13 * s)}" fill="none" stroke="#5a6676" stroke-width="${f1(7 * s)}"/><path d="M${f1(x + 6 * s)} ${f1(top - 140 * s)} q${f1(40 * s)} 30 ${f1(10 * s)} ${f1(70 * s)} q${f1(-26 * s)} 30 ${f1(14 * s)} ${f1(60 * s)}" stroke="#c8a86a" stroke-width="${f1(6 * s)}" fill="none"/>`;
          w = 180 * s; h = 220 * s; break; }
        case 'obelisk': { // тёмный обелиск с кристаллом
          g = ell(x, y + 4, 52 * s, 12) + `<rect x="${f1(x - 46 * s)}" y="${f1(y - 28 * s)}" width="${f1(92 * s)}" height="${f1(28 * s)}" fill="#3a3242" ${O(4)}/><path d="M${f1(x - 26 * s)} ${f1(y - 28 * s)} L${f1(x - 14 * s)} ${f1(y - 230 * s)} L${x} ${f1(y - 256 * s)} L${f1(x + 14 * s)} ${f1(y - 230 * s)} L${f1(x + 26 * s)} ${f1(y - 28 * s)} Z" fill="#241e2c" ${O(4)}/>`
            + `<circle cx="${x}" cy="${f1(y - 150 * s)}" r="${f1(50 * s)}" fill="#b06aff" opacity=".22"/><path d="M${x} ${f1(y - 176 * s)} l${f1(12 * s)} ${f1(24 * s)} l${f1(-12 * s)} ${f1(24 * s)} l${f1(-12 * s)} ${f1(-24 * s)} Z" fill="#c89aff" ${O(2.5)}/><path d="M${f1(x - 8 * s)} ${f1(y - 100 * s)} l${f1(8 * s)} ${f1(-10 * s)} l${f1(8 * s)} ${f1(10 * s)} M${f1(x - 6 * s)} ${f1(y - 70 * s)} h${f1(12 * s)}" stroke="#b06aff" stroke-width="3" fill="none" opacity=".8"/>`;
          w = 160 * s; h = 300 * s; break; }
        case 'bench': { // скамейка
          g = ell(x, y + 2, 52, 8) + `<rect x="${x - 50}" y="${y - 34}" width="100" height="12" rx="4" fill="${K.wood}" ${O(3)}/><rect x="${x - 50}" y="${y - 56}" width="100" height="12" rx="4" fill="${K.wood}" ${O(3)}/><path d="M${x - 40} ${y - 22} V${y} M${x + 40} ${y - 22} V${y} M${x - 40} ${y - 44} v-12 M${x + 40} ${y - 44} v-12" stroke="${INK}" stroke-width="6"/>` + (SNOW ? `<path d="M${x - 48} ${y - 36} h96" stroke="#f6fafd" stroke-width="5"/>` : '');
          w = 120; h = 70; break; }
        case 'stall': { // лоток рынка: прилавок, полосатый тент, товар
          const aw = K.awning || [['#3f8f3a', '#c8402a', '#3a6aa8', '#8a3a8a'][p.v % 4], '#f3efd8'];
          g = ell(x, y + 2, 70, 10) + `<path d="M${x - 60} ${y} V${y - 120} M${x + 60} ${y} V${y - 120}" stroke="${INK}" stroke-width="8"/><path d="M${x - 60} ${y} V${y - 120} M${x + 60} ${y} V${y - 120}" stroke="${K.woodD}" stroke-width="4"/>`
            + `<rect x="${x - 66}" y="${y - 52}" width="132" height="52" fill="${K.wood}" ${O(3.5)}/><path d="M${x - 66} ${y - 30} H${x + 66}" stroke="${K.woodD}" stroke-width="3"/>`;
          for (let i = 0; i < 4; i++) g += `<circle cx="${x - 45 + i * 30}" cy="${y - 62}" r="11" fill="${['#e8455c', '#ffd76a', '#6fdc6f', '#ff8a5c', '#b06bff', '#4ab0ff'][(i + p.v) % 6]}" ${O(2.5)}/>`;
          for (let i = 0; i < 5; i++) g += `<path d="M${x - 75 + i * 30} ${y - 140} h30 l3 26 q-18 10 -36 0 Z" fill="${i % 2 ? aw[1] : aw[0]}" ${O(3)}/>`;
          g += `<path d="M${x - 80} ${y - 140} L${x - 66} ${y - 164} H${x + 66} L${x + 80} ${y - 140} Z" fill="${aw[0]}" ${O(3)}/>` + (SNOW ? `<path d="M${x - 66} ${y - 164} H${x + 66}" stroke="#f6fafd" stroke-width="7" stroke-linecap="round"/>` : '');
          w = 180; h = 190; break; }
        case 'planter': { // каменная кадка с цветами / кустом
          g = ell(x, y + 2, 36, 8) + `<path d="M${x - 34} ${y - 34} H${x + 34} L${x + 28} ${y} H${x - 28} Z" fill="${K.stone}" ${O(3.5)}/>` + (FLOWERS ? [0, 1, 2, 3, 4].map((i) => `<circle cx="${x - 24 + i * 12}" cy="${y - 44 - (i % 2) * 8}" r="8" fill="${['#e8455c', '#ffd76a', '#b9a2ff'][i % 3]}" ${O(2)}/>`).join('') : `<ellipse cx="${x}" cy="${y - 50}" rx="30" ry="20" fill="${K.leaf[0]}" ${O(3)}/>` + (SNOW ? `<ellipse cx="${x}" cy="${y - 64}" rx="22" ry="7" fill="#f6fafd"/>` : ''));
          w = 90; h = 80; break; }
        case 'hedge': { // стриженая живая изгородь
          g = ell(x, y + 2, 70 * s, 10) + `<rect x="${f1(x - 66 * s)}" y="${f1(y - 50 * s)}" width="${f1(132 * s)}" height="${f1(52 * s)}" rx="${f1(20 * s)}" fill="${K.leaf[0]}" ${O(3.5)}/><path d="M${f1(x - 50 * s)} ${f1(y - 34 * s)} q10 -8 20 0 M${f1(x + 10 * s)} ${f1(y - 26 * s)} q10 -8 20 0" stroke="${K.leaf[2] || K.leaf[0]}" stroke-width="3" fill="none"/>` + (SNOW ? `<rect x="${f1(x - 60 * s)}" y="${f1(y - 54 * s)}" width="${f1(120 * s)}" height="14" rx="7" fill="#f6fafd"/>` : '');
          w = 160 * s; h = 70 * s; break; }
        default: g = ell(x, y, 20, 6);
      }
      // 24.10 (лёгкость): низкие предметы (скамейки, клумбы, кадки, ящики у стен, кочки, пруды…) — в фоне, а не отдельной картинкой
      // в слое человечков: за ними не встать (основание — препятствие), а печь каждую отдельно — дорого (бюджет запекания)
      if (hp ? flat : FLATP[p.k]) P(x - w / 2 - 20, x + w / 2 + 20, g, y - h - 10, y + 30); else prop(p, w, h, g);
    }
    // 24.10: домики вдоль бульвара (жилые, в них не заходят) — в одном слое с человечками (кто за домиком — закрыт им)
    for (const c of L.cottages || []) {
      const R0 = R; R = rng((L.seed ^ Math.imul(c.x0 + 7, 69069)) >>> 0);
      const hc = HA && HA.cottage ? HA.cottage(c, kit) : null;   // 28.10: свои домики ручной деревни
      if (hc) { props.push({ x: Math.round(c.x0 - 60), y: Math.round(c.base - (hc.h || 420)), w: Math.round(c.x1 - c.x0 + 120), h: Math.round((hc.h || 420) + 40), z: c.base, svg: () => hc.g }); R = R0; continue; }
      const B0 = c.base, cx = (c.x0 + c.x1) / 2, hh = (V ? 96 : 120) + (c.v % 40);
      const b = body(c.x0, c.x1, B0, hh, { roofH: 60 + (c.v % 30), roofC: c.v % 3 ? undefined : K.roof2, ruinHere: c.v % 2 === 0, noStilts: true, one: V });
      let g = ell(cx, B0 + 2, (c.x1 - c.x0) / 2 + 14, 10) + b.g + winLit(c.x0 + 16, b.top + 22, 30, 38, !RUIN && c.v % 4 !== 0) + door(cx + (c.x1 - c.x0) * 0.16, b.B, 38, 60);
      if (c.x1 - c.x0 > 220) g += winLit(c.x1 - 46, b.top + 22, 30, 38, c.v % 5 !== 0);
      if (K.wall === 'clay') g += `<path d="M${c.x0 + 8} ${b.B - 76} H${c.x1 - 8} l10 30 H${c.x0 - 2} Z" fill="${K.awning[c.v % 2]}" ${O(3)}/>`;
      g = g.replace(b.g, chimney(c.x0 + (c.x1 - c.x0) * 0.66 + 9, b.top - 50, 18, 40, 2, '#6d5a5a') + b.g);
      g += (FLOWERS && c.v % 2 ? `<rect x="${c.x0 + 12}" y="${b.top + 60}" width="40" height="10" fill="${K.woodD}" ${O(2)}/>` : '') + drift(c.x0 + 20, B0, 60);
      R = R0;
      props.push({ x: Math.round(c.x0 - 40), y: Math.round(b.top - 200), w: Math.round(c.x1 - c.x0 + 80), h: Math.round(B0 - b.top + 230), z: B0, svg: () => g });
    }

    /* ================= нарезка фона на слои ================= */
    /* 24.10 (баг со снимка стримера: тёмные вертикальные полосы через весь город, через каждые 1024 px мира): раньше фон резался на куски
       1024 px с обрезкой краёв (вложенный <svg>) и нахлёстом 2 px — при мелком масштабе (зум, dpr 1) края двух кусков приходились на один
       пиксель экрана, оба полупрозрачные (сглаживание обрезки), и сквозь них просвечивало тёмное небо; полупрозрачное в нахлёсте ещё и
       рисовалось дважды. Теперь каждый кусок рисунка — ровно в ОДНОМ слое и без обрезки (overflow visible): слои — подряд идущие куски
       (порядок рисования — тот же), пока их рамка не шире 1024 px; рамка слоя (x, y, w, h — с запасом на свесы) — только для того,
       чтобы плитка Pixi брала свои слои. Швов нет ни при каком масштабе. */
    const CH = 1024, M = 60, layers = [];
    let cur = null;
    const flush = () => { if (!cur) return; const x = Math.floor(cur.x0 - M), y = Math.max(0, Math.floor(cur.y0 - M)), w = Math.ceil(cur.x1 + M) - x, h = Math.min(H, Math.ceil(cur.y1 + M)) - y;
      layers.push({ x, y, w, h, svg: `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="visible">${docDefs(cur.svg)}${cur.svg}</svg>` }); cur = null; };
    const flat0 = []; for (const q of pieces) { if (q.slot) flat0.push(...q.list); else flat0.push(q); }
    for (const q of flat0) {
      const x0 = Math.max(-200, q.x0), x1 = Math.min(W + 200, q.x1);
      if (cur && (Math.max(cur.x1, x1) - Math.min(cur.x0, x0) > CH || Math.max(cur.y1, q.y1) - Math.min(cur.y0, q.y0) > 1200)) flush();
      if (!cur) cur = { x0, x1, y0: q.y0, y1: q.y1, svg: '' };
      cur.x0 = Math.min(cur.x0, x0); cur.x1 = Math.max(cur.x1, x1); cur.y0 = Math.min(cur.y0, q.y0); cur.y1 = Math.max(cur.y1, q.y1); cur.svg += q.svg;
    }
    flush();
    defs = defs.replace('</defs>', [...SYM.values()].join('') + '</defs>');   // 26.10: символы деталей — в общих defs (предметы, витрина)
    return { sky: K.sky, defs, layers, props, fx: K.fx || '', bio: L.biome, lv: L.lv, blds, signs: SIGNS, L };
  }
  root.LGTownArt = { draw, BIO };
})(typeof window !== 'undefined' ? window : this);
