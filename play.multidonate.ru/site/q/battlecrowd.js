// 22.10 (прототип, Issue #2): большой бой — 200 героев и 15–20 врагов на одном кадре 1920×1080.
// Сцена рисуется с «камерой» (QScene.draw({ cam })): объекты фона мельче, человечки мельче, места больше.
// Строй по классам — от врага назад: щиты (легионеры, паладины) → разбойники и новобранцы → лучники, маги, некроманты → жрецы.
// Человечки один раз «запекаются» в картинку и рисуются на одном холсте (как толпа на карте похода) — 200 SVG-человечков
// с анимацией нагрузили бы ПК стримера. Эффекты умений — отдельный SVG-слой, только transform/opacity; одновременно — не больше
// FX_MAX отдельных эффектов, остальные одинаковые склеиваются в подпись «🏹 Град ×7».
(function () {
  const SW = 120, SH = 170;                 // рисунок человечка (viewBox doodle)
  const ZONE = { legionary: 0, paladin: 0, rogue: 1, recruit: 1, archer: 2, mage: 2, necromancer: 2, priest: 3 };
  const FX_MAX = 12;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

  /* ---------- камера: насколько «отъехать» ----------
     Настройка канала battleCrowdMax (по умолчанию 200) — потолок. Камера — по реальному числу бойцов в этом бою:
     до 50 — как раньше (×1), 100 — ×0,77, 200 — ×0,6, 300 — ×0,52; не мельче CAM_MIN — иначе снаряжение не разобрать.
     Выбирается один раз в начале боя (картинка не «дышит»); пришедшие сверх мест — в запас, как сейчас. */
  // правила камеры, потолка и сторон — общие с сервером (crowdcam.js, подключать раньше)
  const QC = window.QCrowdCam, { roomOf, capFor, camFor, foesFor } = QC;

  /* ---------- где кто стоит ----------
     Поле — перспектива: дальний ряд (y = Y0, сразу за линией земли сцены GY·cam) мельче, ближний (y = Y1) крупнее.
     Шеренга — столбец мест по глубине; столбцы идут от линии фронта (справа, у врагов) влево; между зонами — зазор. */
  const GY = 716;   // линия земли сцены (scene.js)
  function geo(cam = 0.6, terrain) {
    const Y1 = 1052, Y0 = Math.round(Y1 - (Y1 - (GY * cam + 110 * cam)) * roomOf(terrain).depth), S1 = cam, S0 = cam * (1 - 0.45 * roomOf(terrain).depth);
    const rows = Math.max(3, Math.min(12, Math.round((Y1 - Y0) / (120 * (S0 + S1) / 2))));
    return { cam, Y0, Y1, S0, S1, ROWS: rows, FRONT: 1065, SLANT: 40, COL: 66, GAP: 0.7 };
  }
  // порядок заполнения глубины: середина, потом ближние и дальние через один — неполный столбец не висит только вдали
  function depthOrder(n) {
    const out = [], used = new Set(), mid = (n - 1) / 2;
    const idx = [...Array(n).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || b - a);
    for (const i of idx) if (!used.has(i)) { used.add(i); out.push(i); }
    return out;
  }
  const at = (G, t) => ({ y: G.Y0 + (G.Y1 - G.Y0) * t, s: G.S0 + (G.S1 - G.S0) * t });
  function layout(heroes, cam = 0.6, terrain) {
    const G = geo(cam, terrain), zones = [[], [], [], []];
    heroes.forEach((h) => zones[ZONE[h.cls] ?? 2].push(h));
    // строй должен влезть левее фронта: не влезает — больше рядов по глубине (до 14), потом теснее столбцы
    const cols = (rows) => zones.reduce((a, z) => a + (z.length ? Math.ceil(z.length / rows) + G.GAP : 0), 0);
    const room = G.FRONT + G.SLANT - 50, wide = (rows) => cols(rows) * G.COL * G.S1;   // по ближнему ряду — он самый широкий
    while (G.ROWS < 14 && wide(G.ROWS) > room) G.ROWS++;
    if (wide(G.ROWS) > room) G.COL *= room / wide(G.ROWS);
    const ord = depthOrder(G.ROWS);
    // в зоне впереди — с щитом и в лучшей броне (как на сервере: ранг, потом броня)
    zones.forEach((z) => z.sort((a, b) => (b.shield ? 1 : 0) - (a.shield ? 1 : 0) || (b.def || 0) - (a.def || 0) || a.login.localeCompare(b.login)));
    const out = []; let col = 0;
    zones.forEach((z, zi) => {
      if (!z.length) return;
      for (let i = 0; i < z.length; i++) {
        const c = col + Math.floor(i / G.ROWS), rr = ord[i % G.ROWS];
        const t = G.ROWS > 1 ? rr / (G.ROWS - 1) : 0.5, p = at(G, t), h = z[i];
        const jx = (hash(h.login + 'x') - 0.5) * 10 * p.s, jy = (hash(h.login + 'y') - 0.5) * 12 * p.s;
        out.push({ h, zone: zi, col: c, x: Math.round(G.FRONT + G.SLANT * t - c * G.COL * p.s + jx), y: Math.round(p.y + jy), s: +p.s.toFixed(3) });
      }
      col += Math.ceil(z.length / G.ROWS) + G.GAP;
    });
    return out.sort((a, b) => a.y - b.y);
  }
  // враги: сетка справа; правее x 1500 — не ниже y 815 (вебка стримера); [0] — место вожака (первый столбец, середина)
  // 23.10: врагов мало — не столбиком в одну линию (головы, имена и полоски здоровья друг на друге), а по 2–4 в столбце, вширь
  function foeLayout(n, cam = 0.6, terrain, total = n) {
    const G = geo(cam, terrain), pts = [], R = [0.5, 0.15, 0.85, 0.32, 0.68];
    const per = total <= 2 ? 1 : total <= 6 ? 2 : total <= 9 ? 3 : total <= 14 ? 4 : R.length;   // мест в столбце, пока не пойдут следующие столбцы
    for (let c = 0; c < 8; c++) for (let r = 0; r < R.length; r++) {
      const p = at(G, Math.min(0.92, 0.08 + R[r] * 0.84));
      const x = 1235 + G.SLANT * R[r] + c * 150 * p.s * 1.15 + ((c + r) % 2) * 20 * cam, y = p.y - 10;
      if ((x + 55 * p.s * 1.15 > 1495 && y > 815) || x > 1860) continue;   // 23.10: и туловище не заходит на вебку (раньше — только ноги)
      pts.push({ x: Math.round(x), y: Math.round(y), s: p.s * 1.15, c, r });
    }
    const band = (p) => Math.floor(p.r / per);   // сначала первые per рядов по всем столбцам, потом остальные ряды
    pts.sort((a, b) => band(a) - band(b) || a.c - b.c || a.r - b.r);
    return pts.slice(0, n);
  }

  /* ---------- окружение: две и три стороны (бросок 1 — слева, справа и вдали; 2–9 — слева и справа) ----------
     Отряд — в середине поля, крылья смотрят на свою сторону: L — влево, R — вправо, F — вдаль (вверх по кадру).
     Места — сетка в перспективе по полю отряда; у каждого места крыло (куда оно «наружу») и наружность.
     В крыле щиты — на самые наружные места, жрецы — на самые внутренние: вместе получается круг щитов с жрецами в середине.
     chaos (врасплох, бросок 1) — отряд стоит, как шёл: вперемешку, все лицом вправо; потом reform() — перестроение. */
  const FIELD = { xL: 500, xR: 1150 };
  function ringLayout(heroes, cam = 0.6, terrain, fronts = ['L', 'R'], chaos = false) {
    const G = geo(cam, terrain), cx = (FIELD.xL + FIELD.xR) / 2, F = fronts.includes('F');
    let slots = [];
    for (let k = 2.6, it = 0; it < 60; it++, k *= 0.96) {   // шаг мельчает, пока мест не станет чуть больше, чем людей: строй плотный, без пустой середины
      slots = [];
      for (let y = G.Y0 + (F ? 30 * cam : 0); y <= G.Y1; ) {
        const t = (y - G.Y0) / (G.Y1 - G.Y0), s = G.S0 + (G.S1 - G.S0) * t, half = (FIELD.xR - FIELD.xL) / 2 * (0.8 + 0.2 * t), dx = G.COL * s * k, row = slots.length;
        for (let x = cx - half + ((Math.round(y) % 2) ? dx / 2 : 0); x <= cx + half; x += dx) slots.push({ x, y, s, t, half });
        y += 50 * s * k; if (row === slots.length) break;
      }
      if (slots.length >= heroes.length * 1.04) break;
    }
    const outOf = (sl, w) => (w === 'L' ? (cx - sl.x) / sl.half : w === 'R' ? (sl.x - cx) / sl.half : (0.5 - sl.t) * 2.2);
    for (const sl of slots) { sl.wing = fronts.reduce((b, w) => (outOf(sl, w) > outOf(sl, b) ? w : b), fronts[0]); sl.out = outOf(sl, sl.wing); }
    const zoneOf = (h) => ZONE[h.cls] ?? 2, order = heroes.slice().sort((a, b) => zoneOf(a) - zoneOf(b) || (b.def || 0) - (a.def || 0) || a.login.localeCompare(b.login));
    const out = [];
    if (chaos) {   // как шли: вперемешку, места — по нику
      const free = slots.slice().sort((a, b) => hash(`${a.x}:${a.y}`) - hash(`${b.x}:${b.y}`));
      order.slice().sort((a, b) => hash(a.login + 'c') - hash(b.login + 'c')).forEach((h, i) => { const sl = free[i]; out.push({ h, zone: zoneOf(h), wing: 'R', x: Math.round(sl.x), y: Math.round(sl.y), s: +sl.s.toFixed(3) }); });
      return out.sort((a, b) => a.y - b.y);
    }
    // крыло героя: с сервера (h.side) или по кругу в порядке строя (как setSides на сервере) — в каждом крыле и щиты, и жрецы
    const wingOf = new Map(); order.forEach((h, i) => wingOf.set(h.login, fronts.includes(h.side) ? h.side : fronts[i % fronts.length]));
    const byWing = Object.fromEntries(fronts.map((w) => [w, slots.filter((sl) => sl.wing === w).sort((a, b) => b.out - a.out)]));
    const left = [];
    for (const w of fronts) {
      const hs = order.filter((h) => wingOf.get(h.login) === w), sl = byWing[w];
      hs.forEach((h, i) => { if (i < sl.length) out.push({ h, zone: zoneOf(h), wing: w, x: Math.round(sl[i].x), y: Math.round(sl[i].y), s: +sl[i].s.toFixed(3) }); else left.push(h); });
      byWing[w] = sl.slice(hs.length);
    }
    // крылу не хватило мест — в свободные места соседних (жрецы — во внутренние)
    const rest = fronts.flatMap((w) => byWing[w].map((sl) => ({ ...sl, w }))).sort((a, b) => a.out - b.out);
    left.forEach((h, i) => { const sl = rest[i]; if (sl) out.push({ h, zone: zoneOf(h), wing: sl.w, x: Math.round(sl.x), y: Math.round(sl.y), s: +sl.s.toFixed(3) }); });
    return out.sort((a, b) => a.y - b.y);
  }
  // враги на две и три стороны: справа — как всегда (не под вебкой), слева — зеркально у левого края, вдали — мельче, у горизонта над отрядом
  function foeRing(n, cam = 0.6, terrain, fronts = ['L', 'R']) {
    const G = geo(cam, terrain), R = foeLayout(40, cam, terrain, Math.ceil(n / Math.max(1, fronts.length))), pts = { R: R.map((p) => ({ ...p, side: 'R' })), L: [], F: [] };
    pts.L = R.map((p) => ({ ...p, x: Math.round(FIELD.xL - 120 - (p.x - 1235) * 0.95), side: 'L', flip: true })).filter((p) => p.x > 50);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) { const s = G.S0 * (0.85 + r * 0.12) * 1.15, x = 560 + c * 120 * cam + r * 50 * cam; if (x < FIELD.xR - 40) pts.F.push({ x: Math.round(x), y: Math.round(G.Y0 - 6 + r * 22 * cam), s, side: 'F', c, r }); }
    const out = [], idx = { L: 0, R: 0, F: 0 }, order = ['R', 'L', 'F'].filter((w) => fronts.includes(w));
    for (let i = 0; i < n; i++) { const w = order[i % order.length], p = pts[w][idx[w]++]; if (p) out.push(p); }
    return out;
  }

  /* ---------- человечек → картинка ---------- */
  function toCanvas(svg, k) {
    return new Promise((res) => {
      const m = svg.match(/^<svg\b[^>]*>/); if (!m) return res(null);
      let open = m[0].replace(/\s(width|height|style)="[^"]*"/g, '');
      if (!/xmlns=/.test(open)) open = open.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      open = open.replace('<svg', `<svg width="${SW}" height="${SH}"`);
      const img = new Image();
      img.onerror = () => res(null);
      img.onload = () => { try { const c = document.createElement('canvas'); c.width = Math.ceil(SW * k); c.height = Math.ceil(SH * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c); } catch (e) { res(img); } };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(open + svg.slice(m[0].length));
    });
  }

  /* ---------- эффекты умений ----------
     Каждое умение — короткий рисунок от героя к цели (или на месте), проигрывается один раз. Ключ — слово умения на сервере. */
  const SK = {
    grad:    { icon: '🏹', name: 'Град' },
    pricel:  { icon: '🎯', name: 'Прицел' },
    vspyshka:{ icon: '✨', name: 'Вспышка' },
    oznob:   { icon: '❄️', name: 'Озноб' },
    natisk:  { icon: '⚔️', name: 'Натиск' },
    stoyka:  { icon: '🛡', name: 'Стойка' },
    svet:    { icon: '☀️', name: 'Свет' },
    aura:    { icon: '💛', name: 'Аура' },
    dlan:    { icon: '🤲', name: 'Длань' },
    dlan_light: { icon: '☀️', name: 'Свет длани' },   // 22.10: «длань» паладина бьёт светом двух врагов
    siyanie: { icon: '🌟', name: 'Сияние' },
    obereg:  { icon: '🔰', name: 'Оберег' },
    yad:     { icon: '🧪', name: 'Яд' },
    vspinu:  { icon: '🗡', name: 'Вспину' },
    proklyat:  { icon: '💀', name: 'Проклясть' },
    vytyanut:  { icon: '🩸', name: 'Вытянуть' },
    podnyat:   { icon: '🦴', name: 'Поднять' },
    obchistit: { icon: '💰', name: 'Обчистить' },
    skel:      { icon: '☠️', name: 'Скелеты' },
  };
  const ALLY = new Set(['dlan', 'obereg', 'siyanie']);
  const f1 = (n) => Math.round(n * 10) / 10;
  function fxSvg(kind, a, b, d, extra) {
    // a — откуда (голова героя), b — куда (враг или союзник), d — задержка, с
    const D = `${d.toFixed(2)}s`, rnd = extra.rnd || 0.5;
    const mid = (k) => ({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - k });
    const arc = (k) => { const m = mid(k); return `M${f1(a.x)} ${f1(a.y)} Q${f1(m.x)} ${f1(m.y)} ${f1(b.x)} ${f1(b.y)}`; };
    const fly = (body, path, dur) => `<g opacity="0">${body}<animateMotion begin="${D}" dur="${dur}s" fill="freeze" rotate="auto" path="${path}"/><set attributeName="opacity" to="1" begin="${D}"/><set attributeName="opacity" to="0" begin="${(d + dur).toFixed(2)}s"/></g>`;
    const pop = (x, y, r0, r1, col, dur, sw = 3) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r0}" fill="none" stroke="${col}" stroke-width="${sw}" opacity="0"><animate attributeName="r" values="${r0};${r1}" begin="${D}" dur="${dur}s" fill="freeze"/><animate attributeName="opacity" values="0;1;0" begin="${D}" dur="${dur}s" fill="freeze"/></circle>`;
    switch (kind) {
      case 'grad': {   // три стрелы навесом по разным врагам
        const arrow = '<path d="M-14 0 H10 M10 0 l-6 -4 M10 0 l-6 4" stroke="#3a2a1e" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M-14 0 l-4 -3 M-14 0 l-4 3" stroke="#e8e0c8" stroke-width="2"/>';
        return (extra.targets || [b]).map((t, i) => fly(arrow, `M${f1(a.x)} ${f1(a.y)} Q${f1((a.x + t.x) / 2)} ${f1(Math.min(a.y, t.y) - 220 - i * 30)} ${f1(t.x)} ${f1(t.y)}`, 0.9 + i * 0.08)).join('');
      }
      case 'pricel': return fly('<path d="M-16 0 H12 M12 0 l-7 -5 M12 0 l-7 5" stroke="#ffd34d" stroke-width="3.2" fill="none" stroke-linecap="round"/>', arc(40), 0.55) + pop(b.x, b.y, 4, 26, '#ffd34d', 0.5);
      case 'vspyshka': return (extra.targets || [b]).map((t, i) => `<g transform="translate(${f1(t.x)} ${f1(t.y)})"><circle r="30" fill="#fff6c8" opacity="0"><animate attributeName="opacity" values="0;.9;0" begin="${(d + i * 0.04).toFixed(2)}s" dur=".6s" fill="freeze"/><animateTransform attributeName="transform" type="scale" values=".2;1.6" begin="${(d + i * 0.04).toFixed(2)}s" dur=".6s" fill="freeze"/></circle></g>`).join('') + pop(a.x, a.y, 4, 22, '#b9a2ff', 0.5);
      case 'oznob': return fly('<circle r="9" fill="#bfe8ff" stroke="#4aa3ff" stroke-width="2.4"/><path d="M-6 0 H6 M0 -6 V6" stroke="#fff" stroke-width="2"/>', arc(70), 0.7) + pop(b.x, b.y, 6, 34, '#8fd4ff', 0.6, 4);
      case 'natisk': return `<g transform="translate(${f1(b.x)} ${f1(b.y)})" opacity="0"><path d="M-26 -18 L22 14 M-20 6 L26 -10" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M-26 -18 L22 14 M-20 6 L26 -10" stroke="#ff5a3a" stroke-width="2.4" stroke-linecap="round"/><animate attributeName="opacity" values="0;1;0" begin="${D}" dur=".5s" fill="freeze"/></g>`;
      case 'stoyka': return `<g transform="translate(${f1(a.x)} ${f1(a.y + 12)})"><path d="M0 -22 L16 -14 V2 Q16 16 0 24 Q-16 16 -16 2 V-14 Z" fill="#4aa3ff" fill-opacity=".35" stroke="#bfe0ff" stroke-width="2.4" opacity="0"><animate attributeName="opacity" values="0;1;1;0" begin="${D}" dur="1.4s" fill="freeze"/></path></g>`;
      case 'dlan_light':   // 22.10: свет «длани» — как «свет», только слабее
      case 'svet': return fly('<circle r="10" fill="#fff3a8" stroke="#ffd34d" stroke-width="3"/>', arc(50), 0.55) + pop(b.x, b.y, 6, 40, '#ffe27a', 0.6, 5);
      case 'aura': return `<ellipse cx="${f1(a.x)}" cy="${f1(a.y + 60)}" rx="10" ry="4" fill="none" stroke="#ffd34d" stroke-width="3" opacity="0"><animate attributeName="rx" values="10;260" begin="${D}" dur="1.2s" fill="freeze"/><animate attributeName="ry" values="4;70" begin="${D}" dur="1.2s" fill="freeze"/><animate attributeName="opacity" values="0;.9;0" begin="${D}" dur="1.2s" fill="freeze"/></ellipse>`;
      case 'dlan': case 'obereg': case 'siyanie': {
        const col = kind === 'obereg' ? '#8fd4ff' : '#ffe27a';
        return (extra.targets || [b]).map((t, i) => {
          const dd = (d + i * 0.07).toFixed(2);
          return `<path d="M${f1(a.x)} ${f1(a.y)} L${f1(t.x)} ${f1(t.y)}" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 7" opacity="0"><animate attributeName="opacity" values="0;.9;0" begin="${dd}s" dur=".8s" fill="freeze"/></path>`
            + `<text x="${f1(t.x + 8)}" y="${f1(t.y - 6)}" font-size="20" font-weight="800" fill="#7dff8a" stroke="#1a3a1a" stroke-width="4" paint-order="stroke" opacity="0">+${extra.amt || 12}❤<animate attributeName="opacity" values="0;1;1;0" begin="${dd}s" dur="1.4s" fill="freeze"/><animateTransform attributeName="transform" type="translate" values="0 0;0 -26" begin="${dd}s" dur="1.4s" fill="freeze"/></text>`;
        }).join('');
      }
      case 'yad': return fly('<path d="M0 -8 Q7 2 0 8 Q-7 2 0 -8 Z" fill="#7dff6a" stroke="#1f5a1a" stroke-width="2"/>', arc(30), 0.5) + pop(b.x, b.y, 4, 24, '#7dff6a', 0.6);
      case 'vspinu': return `<g transform="translate(${f1(b.x + 18)} ${f1(b.y)})" opacity="0"><path d="M-14 -14 L14 14" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M-14 -14 L14 14" stroke="#c03a3a" stroke-width="2.4" stroke-linecap="round"/><animate attributeName="opacity" values="0;1;0" begin="${D}" dur=".5s" fill="freeze"/></g>`;
      case 'proklyat': return fly('<circle r="11" fill="#2a1240" stroke="#a24bff" stroke-width="3"/><text y="5" text-anchor="middle" font-size="13">💀</text>', arc(90), 0.8);
      case 'podnyat': return pop(b.x, b.y + 30, 6, 46, '#efe6d2', 0.8, 4) + fly('<text y="6" text-anchor="middle" font-size="18">🦴</text>', arc(60), 0.6);
      case 'obchistit': return fly('<text y="6" text-anchor="middle" font-size="18">💰</text>', `M${f1(b.x)} ${f1(b.y)} Q${f1((a.x + b.x) / 2)} ${f1(Math.min(a.y, b.y) - 80)} ${f1(a.x)} ${f1(a.y)}`, 0.8);
      case 'skel': return `<g transform="translate(${f1(b.x - 12)} ${f1(b.y)})" opacity="0"><path d="M-12 -12 L12 12" stroke="#efe6d2" stroke-width="5" stroke-linecap="round"/><animate attributeName="opacity" values="0;1;0" begin="${D}" dur=".45s" fill="freeze"/></g>`;
      case 'vytyanut': return fly('<circle r="7" fill="#d83a4a" stroke="#4a0e14" stroke-width="2"/>', `M${f1(b.x)} ${f1(b.y)} Q${f1((a.x + b.x) / 2)} ${f1(Math.min(a.y, b.y) - 60)} ${f1(a.x)} ${f1(a.y)}`, 0.8);
      default: return '';
    }
  }

  /* ---------- эффекты хода: общий рисунок для прототипа (mount.play) и настоящего оверлея (battleui.js) ----------
     list — [{ by: логин, sk: ключ умения, to: [индексы врагов] | [логины союзников], amt }]; P — где кто на экране:
     P.head(логин) → {x,y} | null (голова героя), P.foe(индекс) → {x,y} | null (враг), P.chip — {x, y} середина строки фишек.
     Отдельных эффектов — не больше FX_MAX, остальные одинаковые — в строку фишек «🏹 Град ×7». */
  function skillSvg(list, P) {
    let s = '', n = 0; const cnt = {};
    list.forEach((e, i) => {
      if (!SK[e.sk]) return;
      const a = P.head(e.by); if (!a) return;
      cnt[e.sk] = (cnt[e.sk] || 0) + 1;
      if (n >= FX_MAX) return;
      const ally = ALLY.has(e.sk), tg = ally ? (e.to || []).map((l) => P.head(l)).filter(Boolean) : (e.to || []).map((x) => P.foe(x)).filter(Boolean);
      const to = tg[0] || (ally ? a : P.foe(0)); if (!to) return;
      n++;
      const d = 0.1 + (n - 1) * 0.08;
      s += fxSvg(e.sk, a, to, d, { targets: tg.length ? tg : [to], rnd: hash(e.by + e.sk), amt: e.amt });
      s += `<g transform="translate(${f1(a.x)} ${f1(a.y - 16)})" opacity="0"><circle r="13" fill="#1a1426" fill-opacity=".85" stroke="#ffd34d" stroke-width="1.5"/><text y="5" text-anchor="middle" font-size="14">${SK[e.sk].icon}</text><animate attributeName="opacity" values="0;1;1;0" begin="${d.toFixed(2)}s" dur="1.6s" fill="freeze"/></g>`;
    });
    const chips = Object.entries(cnt).map(([k, c]) => ({ t: `${SK[k].icon} ${SK[k].name}${c > 1 ? ' ×' + c : ''}` })).map((c) => ({ ...c, w: 24 + c.t.length * 8.6 }));
    const total = chips.reduce((a2, c) => a2 + c.w + 8, -8); let cx = Math.max(20, Math.min(1900 - total, P.chip.x - total / 2));
    chips.forEach((c, i) => { s += `<g transform="translate(${f1(cx)} ${f1(P.chip.y)})" opacity="0"><rect width="${f1(c.w)}" height="28" rx="14" fill="#1a1426" fill-opacity=".85" stroke="#ffd34d" stroke-width="1.5"/><text x="${f1(c.w / 2)}" y="19" text-anchor="middle" font-size="15" font-weight="700" fill="#ffe9b0" font-family="system-ui,sans-serif">${c.t}</text><animate attributeName="opacity" values="0;1;1;0" begin="${(0.1 + i * 0.05).toFixed(2)}s" dur="3s" fill="freeze"/></g>`; cx += c.w + 8; });
    return s;
  }
  // из события хода отряда (B.ev с сервера): удары (hits[].sk), лечение (heals[].sk), умения без удара (acts) → список для skillSvg
  function skillList(ev) {
    const by = new Map();
    const add = (l, sk, t, amt) => { if (!l || !sk || !SK[sk]) return; const k = l + ' ' + sk; let x = by.get(k); if (!x) by.set(k, (x = { by: l, sk, to: [], amt: 0 })); if (t != null && !x.to.includes(t)) x.to.push(t); if (amt) x.amt += amt; };
    for (const h of (ev && ev.hits) || []) add(h.by, h.sk, h.e);
    for (const h of (ev && ev.heals) || []) add(h.by, h.sk, h.to, h.d);
    for (const a of (ev && ev.acts) || []) add(a.by, a.sk, a.to);
    return [...by.values()];
  }

  /* ---------- сцена ---------- */
  // o: { terrain, seed, time, heroes, foes, doodle(h), esc, max (потолок канала), fronts (['R'] | ['L','R'] | ['L','R','F']), chaos, cam? }
  function mount(root, o) {
    const fronts = o.fronts && o.fronts.length ? o.fronts : ['R'], multi = fronts.length > 1;
    const cam = o.cam || camFor(o.heroes.length, o.max, o.terrain), G = geo(cam, o.terrain), dpr = Math.min(2, window.devicePixelRatio || 1);
    root.innerHTML = `<div class="qbc" style="position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden">
      <svg class="qbc-bg" viewBox="0 0 1920 1080" width="1920" height="1080" style="position:absolute;inset:0">${window.QScene.draw({ terrain: o.terrain, seed: o.seed, time: o.time, cam })}</svg>
      <svg class="qbc-foes" viewBox="0 0 1920 1080" width="1920" height="1080" style="position:absolute;inset:0"></svg>
      <canvas class="qbc-heroes" width="${1920 * dpr}" height="${1080 * dpr}" style="position:absolute;inset:0;width:1920px;height:1080px"></canvas>
      <svg class="qbc-fx" viewBox="0 0 1920 1080" width="1920" height="1080" style="position:absolute;inset:0;pointer-events:none"></svg></div>`;
    const cv = root.querySelector('.qbc-heroes'), g = cv.getContext('2d'); g.scale(dpr, dpr);
    // на экране — не больше потолка (в пещере — вдвое меньше); остальные — в запасе (выходят при смене строя)
    const cap = capFor(o.max, o.terrain), shown = o.heroes.length <= cap ? o.heroes : o.heroes.filter((_, i) => Math.floor(i * cap / o.heroes.length) !== Math.floor((i - 1) * cap / o.heroes.length));
    const reserve = o.heroes.filter((h) => !shown.includes(h));
    const placeAll = (list, chaos) => (multi ? ringLayout(list, cam, o.terrain, fronts, chaos) : layout(list, cam, o.terrain));
    let places = placeAll(shown, !!o.chaos);
    const byLogin = new Map(places.map((p) => [p.h.login, p]));
    const foes = (multi ? foeRing(o.foes.length, cam, o.terrain, fronts) : foeLayout(o.foes.length, cam, o.terrain)).map((p, i) => ({ ...p, ...o.foes[i] }));
    const foeDraw = [...foes].sort((a, b) => a.y - b.y);
    root.querySelector('.qbc-foes').innerHTML = foeDraw.map((f) => `<g class="qbc-foe">${window.QBattle.foe(f.type, f.x, f.y, f.s, { boss: !!f.boss, flip: !!f.flip })}${f.back ? `<text x="${f1(f.x - 70 * f.s)}" y="${f1(f.y - 200 * f.s)}" font-size="${f.boss ? 34 : 28}" text-anchor="middle"><title>Открыт для удара в спину</title>🗡</text>` : ''}</g>`).join('');   // 22.10: 🗡 — «открыт для удара в спину»
    const kBake = G.S1 * dpr * 1.1, imgs = new Map(), nicks = new Map(); let baked = 0;
    // ник — один раз в маленькую картинку (обводка текста каждый кадр для 200 ников — дорого); мельче вдали, крупнее вблизи
    function nickImg(h, s) {
      const fs = Math.max(9, Math.round(7 + 9 * s)), t = String(h.name || h.login).slice(0, 12), c = document.createElement('canvas'), k = dpr;
      const x0 = c.getContext('2d'); x0.font = `700 ${fs}px system-ui, sans-serif`; const w = Math.ceil(x0.measureText(t).width) + 8;
      c.width = w * k; c.height = (fs + 8) * k; const x = c.getContext('2d'); x.scale(k, k); x.font = `700 ${fs}px system-ui, sans-serif`; x.textBaseline = 'top';
      x.lineJoin = 'round'; x.lineWidth = 3.4; x.strokeStyle = 'rgba(16,10,24,.9)'; x.strokeText(t, 4, 3); x.fillStyle = h.color || '#f6e7c8'; x.fillText(t, 4, 3);
      return { c, w, h: fs + 8 };
    }
    const bake = async (list) => {
      for (let i = 0; i < list.length; i += 10) {
        const part = list.slice(i, i + 10), got = await Promise.all(part.map((h) => toCanvas(o.doodle(h), kBake)));
        part.forEach((h, j) => { if (got[j]) imgs.set(h.login, got[j]); }); baked += part.length;
        await new Promise((r) => requestAnimationFrame(r));
      }
    };
    const bakeAll = async () => {
      const t0 = performance.now();
      await bake(shown.concat(reserve.slice(0, 40)));   // запас — тоже заранее: при смене строя выбегает без задержки
      for (const p of places) nicks.set(p.h.login, nickImg(p.h, p.s));
      draw(performance.now());
      return performance.now() - t0;
    };
    /* движение: прыжок к врагу (act), перестроение (reform — из «как шли» в строй), смена строя (бегущие: ушедший — к краю, новый — от края на место).
       Только враги справа — убегают влево; враги с двух и трёх сторон — вниз, за нижний край кадра (решение стримера 22.10) */
    const act = new Map(), move = new Map(), runners = []; let T0 = 0;   // T0 — начало последнего события (для кадра скриншота)
    const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
    const exitOf = (p) => (multi ? { x: p.x, y: 1160 } : { x: -90, y: p.y });
    function body(im, x, y, s, flip, br = 1) {
      const w = SW * s, h = SH * s * br;
      if (flip) { g.save(); g.translate(x, 0); g.scale(-1, 1); g.drawImage(im, -w / 2, y - h + 6 * s, w, h); g.restore(); }
      else g.drawImage(im, x - w / 2, y - h + 6 * s, w, h);
    }
    function posOf(p, now) {
      let x = p.x, y = p.y; const m = move.get(p.h.login);
      if (m) { const t = ease((now - m.t0) / m.dur); x = m.x0 + (p.x - m.x0) * t; y = m.y0 + (p.y - m.y0) * t; if (t >= 1) move.delete(p.h.login); }
      return { x, y };
    }
    function draw(now) {
      g.clearRect(0, 0, 1920, 1080);
      const list = places.map((p) => ({ p, ...posOf(p, now) })).concat(runners.map((r) => { const t = ease((now - r.t0) / r.dur); return { r, x: r.x0 + (r.x1 - r.x0) * t, y: r.y0 + (r.y1 - r.y0) * t, done: t >= 1 }; }));
      list.sort((a, b) => a.y - b.y);
      for (const it of list) {
        if (it.r) { const im = imgs.get(it.r.h.login); if (im && !it.done) body(im, it.x, it.y, it.r.s, it.r.flip); continue; }
        const p = it.p, im = imgs.get(p.h.login); if (!im) continue;
        let dx = 0, dy = 0; const a = act.get(p.h.login);
        if (a != null) { const t = (now - a) / 450; if (t >= 0 && t < 1) { const k = Math.sin(t * Math.PI); if (p.wing === 'F') dy = -16 * p.s * k; else { dx = (p.wing === 'L' ? -14 : 14) * p.s * k; dy = -10 * p.s * k; } } }
        body(im, it.x + dx, it.y + dy, p.s, p.wing === 'L', 1 + 0.015 * Math.sin(now / 700 + p.x * 0.05));
      }
      for (let i = runners.length - 1; i >= 0; i--) if (now - runners[i].t0 > runners[i].dur) runners.splice(i, 1);
      // ники всех на экране — поверх, по глубине; у бегущих ник не рисуем
      for (const it of list) { if (it.r) continue; const n = nicks.get(it.p.h.login); if (n) g.drawImage(n.c, it.x - n.w / 2, it.y + 2, n.w, n.h); }
    }
    let raf = 0, frames = [], last = 0;
    const loop = (now) => { if (last) frames.push(now - last); if (frames.length > 600) frames.shift(); last = now; draw(now); raf = requestAnimationFrame(loop); };
    // перестроение после «врасплох»: из мест «как шли» — в строй, 1,4 с, по очереди (сначала щиты)
    function reform(t0 = performance.now()) {
      T0 = t0;
      const from = new Map(places.map((p) => [p.h.login, { x: p.x, y: p.y }]));
      places = placeAll(places.map((p) => p.h), false); byLogin.clear(); places.forEach((p) => byLogin.set(p.h.login, p));
      places.forEach((p) => { const f = from.get(p.h.login); if (f) move.set(p.h.login, { x0: f.x, y0: f.y, t0: t0 + p.zone * 120 + hash(p.h.login) * 200, dur: 1400 }); nicks.set(p.h.login, nickImg(p.h, p.s)); });
    }
    // смена строя: out — кто уходит (логины), inn — кто выходит из запаса (герои) — на место ушедшего (сервер подбирает тот же класс)
    function rotate(out, inn, t0 = performance.now()) {
      T0 = t0;
      out.forEach((l, i) => {
        const p = byLogin.get(l), h = inn[i]; if (!p || !h) return;
        const ex = exitOf(p), dur = 1100 + hash(l) * 500;
        runners.push({ h: p.h, s: p.s, flip: !multi || p.wing === 'L', x0: p.x, y0: p.y, x1: ex.x, y1: ex.y, t0, dur });   // ушедший бежит к краю
        p.h = h; byLogin.delete(l); byLogin.set(h.login, p); nicks.set(h.login, nickImg(h, p.s));
        move.set(h.login, { x0: ex.x, y0: ex.y, t0: t0 + 250, dur: dur + 200 });   // новый — от того же края на место
      });
    }
    const head = (p) => ({ x: p.x, y: p.y - SH * p.s * 0.72 });
    const foeAt = (i) => { const f = foes[i % foes.length]; return { x: f.x, y: f.y - 40 * f.s }; };
    // ход отряда: список { by: логин, sk: ключ умения, to: [индексы врагов] | [логины союзников] }
    function play(list, t0 = performance.now()) {
      T0 = t0;
      list.forEach((e, i) => { if (byLogin.has(e.by)) act.set(e.by, t0 + (i % 20) * 60); });
      const fx = root.querySelector('.qbc-fx');
      fx.innerHTML = skillSvg(list, { head: (l) => { const p = byLogin.get(l); return p ? head(p) : null; }, foe: foeAt, chip: { x: multi ? (FIELD.xL + FIELD.xR) / 2 : 600, y: G.Y0 - (fronts.includes('F') ? 110 : 70) } });
      try { fx.setCurrentTime(0); fx.unpauseAnimations(); } catch (e) {}
    }
    // кадр для скриншота: эффекты, прыжки, перестроение и бег — в момент t секунд после начала
    function freeze(t) {
      cancelAnimationFrame(raf); raf = 0;
      const fx = root.querySelector('.qbc-fx'), bg = root.querySelector('.qbc-bg');
      try { fx.pauseAnimations(); fx.setCurrentTime(t); bg.pauseAnimations(); bg.setCurrentTime(3); } catch (e) {}
      draw((T0 || performance.now()) + t * 1000);
    }
    const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const fps = () => { if (!frames.length) return null; const a = [...frames].sort((x, y) => x - y); return { avg: a.reduce((x, y) => x + y, 0) / a.length, p95: a[Math.floor(a.length * 0.95)], n: a.length }; };
    return { cam, fronts, get places() { return places; }, foes, reserve, bakeAll, play, reform, rotate, freeze, start, fps, get baked() { return baked; } };
  }

  window.QBattleCrowd = { mount, layout, ringLayout, foeLayout, foeRing, camFor, capFor, foesFor, geo, FIELD, ZONE, SK, skillSvg, skillList, fxSvg };
})();
