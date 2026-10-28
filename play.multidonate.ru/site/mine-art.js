/* 25.10: Шахта - новые рисунки предметов, камней и руды (обновление шахты mine2: тестерам - betaTesters, всем - mine2Public).
   25.10 (mine/rocks2): камни - по рисунку зрителя AsTruM_02 (docs/art/viewer-stone2), общими <symbol>, см. блок «rocks2» внизу;
   прежние рисунки камней - LGMineArt.v1 (галерея сравнения).
   Только SVG-строки (как craftworld.js): сцена шахты рисуется один раз на новый вид этажа, кадров здесь нет.
   Подключение: craftworld.build(F, { …, art: window.LGMineArt }) - если art не передан, рисует старый craftworld (у всех остальных).
   Что даёт:
   • rock(cell, kind, x, y, s, pal, r) - камень по своей породе (cell.r: stone, basalt, frost_stone, limestone, sandstone, rubble) и твёрдости
     (cell.t === 'hard' - угловатый, с кварцевыми жилками); pal - палитра породы [основной, светлый, тёмный] (hex);
   • ore(res, x, y, s, r, rare, gem) - руда своим видом (жилы в камне + самородки / кристаллы), самоцветы природы - каждый своей огранкой;
   • wall(x, y, pal, r) - скала (не разбить), pal = [стена, светлая стена];
   • chest(x, y, s, pal, r) - сундук под завалом; badge(x, y, lv, t) - табличка уровня;
   • crack(stage, x, y, s, seed) - трещины 1…3 (растут с прогрессом), shard - для копии камня, который сейчас копают (mine.js: слой полосок);
   • entry(F, L, r, o) - предметы входа: подъёмник «В город», лавка «Скупка», доска «Поручения», вагонетка с рельсами, столб Фонарщика
     с фонарями и ящиком касок; тот же договор, что craftworld entryProps: { props: [{ obj, x, y, svg }], npc, lampNpc }.
   Палитра (для природы и тем глубины, mine-biome.js): pal камня - из слоя этажа (L.rock / L.hard; craftworld build - o.rockPal(cell, L) → [осн, свет, тень],
   если задан); стены-скалы - L.wall / L.wallL. Цвета руды - RES (craftworld) и ORE ниже. */
(function () {
  'use strict';
  const INK = '#15122e';
  const f1 = (v) => +(+v).toFixed(1);
  const O = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // цвета: смешать два hex (не hex - как есть: палитра могла прийти из CSS)
  const hx = (c) => { let s = String(c || '').replace('#', ''); if (s.length === 3) s = s.split('').map((x) => x + x).join(''); if (!/^[0-9a-f]{6}$/i.test(s)) return null; const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); if (!A || !B) return a; return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const lit = (c, t) => mix(c, '#ffffff', t), drk = (c, t) => mix(c, '#000000', t);
  const P = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L') + ' Z';
  const PL = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L');
  const rot = (px, py, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c]; };
  // искра-блик: четырёхлучевая звёздочка
  const twinkle = (x, y, k, c = '#fff') => `<path d="M${f1(x)} ${f1(y - 7 * k)} Q${f1(x + 1.2 * k)} ${f1(y - 1.2 * k)} ${f1(x + 7 * k)} ${f1(y)} Q${f1(x + 1.2 * k)} ${f1(y + 1.2 * k)} ${f1(x)} ${f1(y + 7 * k)} Q${f1(x - 1.2 * k)} ${f1(y + 1.2 * k)} ${f1(x - 7 * k)} ${f1(y)} Q${f1(x - 1.2 * k)} ${f1(y - 1.2 * k)} ${f1(x)} ${f1(y - 7 * k)} Z" fill="${c}"/>`;
  function blob(cx, cy, rx, ry, r, n = 8, jit = 0.18) {
    const pts = []; const a0 = r() * Math.PI * 2;
    for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2, k = 1 - jit + r() * jit * 2; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = ''; for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], nn = pts[(i + 2) % n]; if (!i) d += `M${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)} `; d += `Q${f1(q[0])} ${f1(q[1])} ${f1((q[0] + nn[0]) / 2)} ${f1((q[1] + nn[1]) / 2)} `; }
    return d + 'Z';
  }

  /* ---------- камни ---------- */
  // силуэт: верхняя полуокружность из n вершин с разбросом, низ - чуть выпуклый (камень стоит на полу)
  // full - «полнота» верха: 1 - купол, меньше - шире плечи (глыба)
  function outline(x, y, w, h, r, n, jag, peak = 0, full = 0.75) {
    const top = [];
    for (let k = 0; k <= n; k++) {
      const a = Math.PI * (1 - k / n), kx = 1 - jag + r() * jag * 2, ky = 1 - jag + r() * jag * 2, end = k === 0 || k === n;
      const sy = Math.pow(Math.sin(a), full), sx = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.85);
      top.push([x + sx * w * kx + peak * w * sy * 0.2, y - 3 - (end ? h * 0.12 : sy * h * ky)]);
    }
    return top;
  }
  const silPath = (top, x, y, s) => `${PL(top)} Q${f1(x)} ${f1(y + 7 * s)} ${f1(top[0][0])} ${f1(top[0][1])} Z`;
  // грани: светлая - слева сверху, тень - справа, низ - притенён; линии рёбер - тонко чернилами
  function facets(top, x, y, w, h, s, C, r) {
    const n = top.length - 1, m = Math.max(1, Math.round(n * (0.45 + r() * 0.15)));
    const R = [x - w * (0.12 - r() * 0.2), y - h * (0.42 + r() * 0.12)], B = [x + w * (0.18 + r() * 0.12), y + 2 * s];
    let g = `<path d="${P([...top.slice(1, m + 1), R])}" fill="${C.l}"/>`;
    g += `<path d="${P([R, ...top.slice(m, n), B])}" fill="${C.d}" opacity=".78"/>`;
    g += `<path d="${PL([top[0], [top[0][0] + w * 0.25, y - h * 0.08], [x + w * 0.2, y - h * 0.05], top[n]])} Q${f1(x)} ${f1(y + 7 * s)} ${f1(top[0][0])} ${f1(top[0][1])} Z" fill="${C.dd}" opacity=".4"/>`;
    g += `<path d="M${f1(top[1][0])} ${f1(top[1][1])} L${f1(R[0])} ${f1(R[1])} L${f1(top[m][0])} ${f1(top[m][1])} M${f1(R[0])} ${f1(R[1])} L${f1(B[0])} ${f1(B[1] - 4 * s)}" stroke="${INK}" stroke-width="${f1(2.2 * s)}" opacity=".4" fill="none" stroke-linecap="round"/>`;
    // блик по верхнему краю светлой грани
    const hl = top.slice(1, m + 1).map((p) => [p[0] + (R[0] - p[0]) * 0.18, p[1] + (R[1] - p[1]) * 0.18]);
    if (hl.length > 1) g += `<path d="${PL(hl)}" stroke="${C.ll}" stroke-width="${f1(3.2 * s)}" fill="none" stroke-linecap="round" opacity=".9"/>`;
    return g;
  }
  // крапинки и сколы на лицевой стороне
  function speckle(x, y, w, h, s, C, r, n = 5) {
    // крапинки - двумя путями (тёмные и светлые), а не кружком на каждую: меньше узлов сцены
    const dot = (px, py, rr) => `M${f1(px - rr)} ${f1(py)} a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(rr * 2)} 0 a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-rr * 2)} 0 `;
    let dd = '', ll = '';
    for (let k = 0; k < n; k++) { const px = x + (r() - 0.5) * w * 1.1, py = y - h * (0.18 + r() * 0.5), rr = (1.4 + r() * 2) * s; if (k % 2) dd += dot(px, py, rr); else ll += dot(px, py, rr); }
    let g = `<path d="${dd}" fill="${C.dd}" fill-opacity=".55"/><path d="${ll}" fill="${C.ll}" fill-opacity=".7"/>`;
    const cx = x + (r() - 0.3) * w * 0.8, cy = y - h * (0.3 + r() * 0.25);
    g += `<path d="M${f1(cx)} ${f1(cy)} l${f1(5 * s)} ${f1(4 * s)} l${f1(-1 * s)} ${f1(6 * s)}" stroke="${INK}" stroke-width="${f1(2 * s)}" fill="none" opacity=".45" stroke-linecap="round"/>`;
    return g;
  }
  const tones = (pal) => ({ b: lit(pal[0], 0.06), l: lit(pal[1], 0.12), d: pal[2], ll: lit(pal[1], 0.45), dd: drk(pal[2], 0.3) });
  const shadow = (x, y, w, s) => `<ellipse cx="${f1(x + 4 * s)}" cy="${f1(y + 2)}" rx="${f1(w * 1.12)}" ry="${f1(12 * s)}" fill="#000" opacity=".34"/>`;

  // гранёный валун (камень вообще): kind - boulder | slab | layered | mossy
  function stoneRock(kind, x, y, w, h, s, C, r) {
    const n = kind === 'slab' ? 6 : kind === 'layered' ? 9 : 8, jag = kind === 'slab' ? 0.16 : kind === 'layered' ? 0.05 : 0.1;
    const hh = kind === 'slab' ? h * 1.12 : kind === 'layered' ? h * 0.95 : h * 1.02;
    const top = outline(x, y, w, hh, r, n, jag, kind === 'slab' ? -0.6 : 0, kind === 'slab' ? 0.45 : kind === 'layered' ? 0.6 : 0.7);
    let g = '';
    if (kind !== 'slab' && r() < 0.55) { const sx = x + w * (r() < 0.5 ? -0.86 : 0.86), sy = y - 7 * s; g += `<path d="${blob(sx, sy, 14 * s, 10 * s, r, 6, 0.2)}" fill="${C.d}" ${O(3)}/><path d="M${f1(sx - 7 * s)} ${f1(sy - 5 * s)} q${f1(5 * s)} ${f1(-4 * s)} ${f1(10 * s)} ${f1(-1 * s)}" stroke="${C.ll}" stroke-width="${f1(2.2 * s)}" fill="none" stroke-linecap="round"/>`; }   // камешек сбоку
    g += `<path d="${silPath(top, x, y, s)}" fill="${C.b}"/>` + facets(top, x, y, w, hh, s, C, r);
    if (kind === 'layered') for (let k = 0; k < 3; k++) { const yy = y - hh * (0.2 + k * 0.24), half = w * Math.sqrt(Math.max(0, 1 - Math.pow((yy - (y - hh * 0.35)) / (hh * 0.9), 2))) * 0.86; g += `<path d="M${f1(x - half)} ${f1(yy)} Q${f1(x - half * 0.3)} ${f1(yy - 6 * s)} ${f1(x)} ${f1(yy - 1 * s)} T${f1(x + half)} ${f1(yy - 2 * s)}" stroke="${k % 2 ? C.ll : C.dd}" stroke-width="${f1(4.5 * s)}" fill="none" opacity=".75" stroke-linecap="round"/>`; }
    g += speckle(x, y, w, hh, s, C, r);
    g += `<path d="${silPath(top, x, y, s)}" fill="none" ${O(4.5)}/>`;
    if (kind === 'mossy') {
      const t2 = top.slice(1, Math.ceil(top.length * 0.7));
      g += `<path d="${PL(t2.map((p) => [p[0], p[1] - 3 * s]))} Q${f1(x + w * 0.1)} ${f1(y - h * 0.62)} ${f1(t2[0][0] + w * 0.12)} ${f1(t2[0][1] + h * 0.22)} Z" fill="#6fae4a" ${O(3)}/>`
        + `<path d="M${f1(x - w * 0.3)} ${f1(y - h * 0.72)} q${f1(4 * s)} ${f1(-5 * s)} ${f1(9 * s)} ${f1(-2 * s)} M${f1(x)} ${f1(y - h * 0.82)} q${f1(4 * s)} ${f1(-4 * s)} ${f1(8 * s)} 0" stroke="#a8e070" stroke-width="${f1(2.5 * s)}" fill="none" stroke-linecap="round"/>`
        + `<path d="M${f1(x + w * 0.5)} ${f1(y - 4 * s)} v${f1(-10 * s)} M${f1(x + w * 0.66)} ${f1(y - 3 * s)} v${f1(-7 * s)}" stroke="#f3efd8" stroke-width="${f1(4 * s)}" stroke-linecap="round"/><path d="M${f1(x + w * 0.5 - 7 * s)} ${f1(y - 14 * s)} a${f1(7 * s)} ${f1(6 * s)} 0 0 1 ${f1(14 * s)} 0 Z" fill="#e8455c" ${O(2)}/><circle cx="${f1(x + w * 0.47)}" cy="${f1(y - 17 * s)}" r="${f1(1.6 * s)}" fill="#fff"/><path d="M${f1(x + w * 0.66 - 5 * s)} ${f1(y - 10 * s)} a${f1(5 * s)} ${f1(4.5 * s)} 0 0 1 ${f1(10 * s)} 0 Z" fill="#ffb03a" ${O(2)}/>`;
    }
    return g;
  }
  // твёрдая порода: угловатая, тяжёлая, с кварцевыми жилками и блёстками
  function hardRock(x, y, w, h, s, C, r) {
    const top = outline(x, y, w * 1.02, h * 1.16, r, 6, 0.14, -0.4, 0.5);
    let g = `<path d="${silPath(top, x, y, s)}" fill="${C.b}"/>` + facets(top, x, y, w, h * 1.18, s, C, r);
    // вторая грань-ступенька: порода слоями сколов
    const k = 2 + Math.floor(r() * 2), a = top[k], b = top[k + 1];
    g += `<path d="${P([a, b, [b[0] - 4 * s, b[1] + h * 0.3], [a[0] + 6 * s, a[1] + h * 0.26]])}" fill="${C.dd}" opacity=".35"/>`;
    // кварцевые жилки
    const vx = x - w * 0.5, vy = y - h * (0.35 + r() * 0.2);
    g += `<path d="M${f1(vx)} ${f1(vy)} l${f1(w * 0.3)} ${f1(-h * 0.12)} l${f1(w * 0.22)} ${f1(h * 0.1)} l${f1(w * 0.3)} ${f1(-h * 0.16)} M${f1(vx + w * 0.3)} ${f1(vy - h * 0.12)} l${f1(w * 0.05)} ${f1(-h * 0.18)}" stroke="${INK}" stroke-width="${f1(5 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
    g += `<path d="M${f1(vx)} ${f1(vy)} l${f1(w * 0.3)} ${f1(-h * 0.12)} l${f1(w * 0.22)} ${f1(h * 0.1)} l${f1(w * 0.3)} ${f1(-h * 0.16)} M${f1(vx + w * 0.3)} ${f1(vy - h * 0.12)} l${f1(w * 0.05)} ${f1(-h * 0.18)}" stroke="#f4f0ff" stroke-width="${f1(2.6 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
    for (let q = 0; q < 4; q++) { const px = x + (r() - 0.5) * w * 1.2, py = y - h * (0.2 + r() * 0.6); g += `<path d="M${f1(px)} ${f1(py - 3 * s)} l${f1(2.5 * s)} ${f1(3 * s)} l${f1(-2.5 * s)} ${f1(3 * s)} l${f1(-2.5 * s)} ${f1(-3 * s)} Z" fill="#fff" opacity=".75"/>`; }
    g += speckle(x, y, w, h, s, C, r, 4);
    g += `<path d="${silPath(top, x, y, s)}" fill="none" ${O(5.5)}/>`;
    return g;
  }
  // известняк: округлый, светлый, поры и окаменелая ракушка
  function limeRock(x, y, w, h, s, C, r, hard) {
    const top = outline(x, y, w, h * (hard ? 1.1 : 0.95), r, 9, hard ? 0.12 : 0.05);
    let g = `<path d="${silPath(top, x, y, s)}" fill="${C.b}"/>` + facets(top, x, y, w, h, s, C, r);
    for (let k = 0; k < 2; k++) { const yy = y - h * (0.28 + k * 0.3); g += `<path d="M${f1(x - w * 0.75)} ${f1(yy)} q${f1(w * 0.5)} ${f1(-5 * s)} ${f1(w * 1.5)} ${f1(-1 * s)}" stroke="${C.dd}" stroke-width="${f1(2 * s)}" fill="none" opacity=".45" stroke-dasharray="${f1(10 * s)} ${f1(5 * s)}"/>`; }
    for (let k = 0; k < 7; k++) { const px = x + (r() - 0.5) * w * 1.2, py = y - h * (0.15 + r() * 0.6); g += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1((1.4 + r() * 1.8) * s)}" ry="${f1((1 + r() * 1.2) * s)}" fill="${C.dd}" opacity=".6"/>`; }
    if (r() < 0.75) { const fx = x + w * (r() < 0.5 ? -0.35 : 0.3), fy = y - h * 0.45, k = 9 * s; g += `<path d="M${f1(fx)} ${f1(fy)} m${f1(-k)} 0 a${f1(k)} ${f1(k)} 0 1 1 ${f1(k * 2)} 0 a${f1(k * 0.75)} ${f1(k * 0.75)} 0 1 1 ${f1(-k * 1.5)} 0 a${f1(k * 0.5)} ${f1(k * 0.5)} 0 1 1 ${f1(k)} 0 a${f1(k * 0.25)} ${f1(k * 0.25)} 0 1 1 ${f1(-k * 0.5)} 0" stroke="${C.dd}" stroke-width="${f1(2.2 * s)}" fill="${C.ll}" opacity=".85"/>`; }
    if (hard) g += `<path d="M${f1(x - w * 0.4)} ${f1(y - h * 0.3)} l${f1(w * 0.4)} ${f1(-h * 0.2)} l${f1(w * 0.4)} ${f1(h * 0.05)}" stroke="#fff" stroke-width="${f1(2.6 * s)}" fill="none" stroke-linecap="round" opacity=".8"/>`;
    g += `<path d="${silPath(top, x, y, s)}" fill="none" ${O(hard ? 5.5 : 4.5)}/>`;
    return g;
  }
  // песчаник: выветренный, волнистые пласты, ямки от ветра
  function sandRock(x, y, w, h, s, C, r, hard) {
    const top = outline(x, y, w * 1.04, h * (hard ? 1.1 : 0.98), r, 8, hard ? 0.14 : 0.08);
    let g = `<path d="${silPath(top, x, y, s)}" fill="${C.b}"/>` + facets(top, x, y, w, h, s, C, r);
    const cols = [C.ll, C.d, C.l, C.dd];
    for (let k = 0; k < 4; k++) { const yy = y - h * (0.14 + k * 0.2), half = w * Math.sqrt(Math.max(0, 1 - Math.pow((yy - (y - h * 0.3)) / h, 2))) * 0.95; g += `<path d="M${f1(x - half)} ${f1(yy)} q${f1(half * 0.5)} ${f1(-7 * s)} ${f1(half)} 0 t${f1(half)} 0" stroke="${cols[k]}" stroke-width="${f1((k % 2 ? 6 : 4) * s)}" fill="none" opacity=".8"/>`; }
    for (let k = 0; k < 2; k++) { const px = x + (r() - 0.5) * w, py = y - h * (0.3 + r() * 0.35); g += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(5 * s)}" ry="${f1(3.5 * s)}" fill="${C.dd}" ${O(1.8 * s)}/>`; }
    if (hard) g += `<path d="M${f1(x - w * 0.6)} ${f1(y - h * 0.5)} l${f1(w * 0.5)} ${f1(-h * 0.15)} l${f1(w * 0.6)} ${f1(h * 0.08)}" stroke="#fff4dc" stroke-width="${f1(2.6 * s)}" fill="none" stroke-linecap="round" opacity=".85"/>`;
    g += `<path d="${silPath(top, x, y, s)}" fill="none" ${O(hard ? 5.5 : 4.5)}/>`;
    return g;
  }
  // базальт: шестигранные столбы разной высоты (верх - светлый шестиугольник)
  function basaltRock(x, y, w, h, s, C, r, hard) {
    const cols = hard ? 4 : 3, cw = (w * 2) / cols * 0.98; let g = '';
    const order = Array.from({ length: cols }, (_, k) => k).sort((a, b) => Math.abs(b - (cols - 1) / 2) - Math.abs(a - (cols - 1) / 2));
    for (const k of order) {
      const cx = x - w + cw * (k + 0.5), ch = h * (0.75 + r() * 0.55) * (1 - Math.abs(k - (cols - 1) / 2) * 0.12), yb = y - Math.abs(k - (cols - 1) / 2) * 3 * s, hw = cw * 0.5, ty = yb - ch, e = hw * 0.42;
      g += `<path d="${P([[cx - hw, yb], [cx - hw, ty], [cx - hw * 0.5, ty - e], [cx + hw * 0.5, ty - e], [cx + hw, ty], [cx + hw, yb]])}" fill="${C.b}" ${O(4)}/>`;
      g += `<path d="${P([[cx + hw * 0.35, yb], [cx + hw * 0.35, ty + e * 0.4], [cx + hw, ty], [cx + hw, yb]])}" fill="${C.d}"/>`;
      g += `<path d="${P([[cx - hw, ty], [cx - hw * 0.5, ty - e], [cx + hw * 0.5, ty - e], [cx + hw, ty], [cx + hw * 0.5, ty + e * 0.7], [cx - hw * 0.5, ty + e * 0.7]])}" fill="${C.ll}" ${O(3)}/>`;
      g += `<path d="M${f1(cx - hw * 0.6)} ${f1(ty + ch * 0.45)} h${f1(hw * 0.5)}" stroke="${C.dd}" stroke-width="${f1(2.2 * s)}" opacity=".7"/>`;
      g += `<path d="M${f1(cx - hw)} ${f1(yb)} V${f1(ty)} L${f1(cx - hw * 0.5)} ${f1(ty - e)} H${f1(cx + hw * 0.5)} L${f1(cx + hw)} ${f1(ty)} V${f1(yb)}" fill="none" ${O(4)}/>`;
      if (r() < 0.4) g += `<path d="M${f1(cx - hw * 0.2)} ${f1(ty + ch * 0.25)} l${f1(4 * s)} ${f1(10 * s)} l${f1(-3 * s)} ${f1(8 * s)}" stroke="#ff7a2a" stroke-width="${f1(2.2 * s)}" fill="none" opacity=".85"/>`;
    }
    return g;
  }
  // мёрзлый камень: угловатый, полупрозрачные грани, иней по кромке, искорки
  function frostRock(x, y, w, h, s, C, r, hard) {
    const top = outline(x, y, w, h * (hard ? 1.2 : 1.05), r, hard ? 5 : 6, 0.18, -0.3);
    let g = `<path d="${silPath(top, x, y, s)}" fill="${C.b}"/>` + facets(top, x, y, w, h, s, C, r);
    g += `<path d="${P([[x - w * 0.3, y - h * 0.2], [x - w * 0.05, y - h * 0.75], [x + w * 0.15, y - h * 0.6], [x + w * 0.05, y - h * 0.18]])}" fill="#ffffff" opacity=".28"/>`;
    g += `<path d="M${f1(x - w * 0.22)} ${f1(y - h * 0.3)} L${f1(x - w * 0.06)} ${f1(y - h * 0.66)}" stroke="#fff" stroke-width="${f1(3 * s)}" opacity=".8" stroke-linecap="round"/>`;
    // иней: белая кромка с зубчиками по верху
    const t2 = top.slice(1, top.length - 1);
    g += `<path d="${PL(t2.map((p) => [p[0], p[1] + 3 * s]))}" stroke="#f4fbff" stroke-width="${f1(5 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    g += twinkle(x + w * 0.4, y - h * 0.55, 0.9 * s) + twinkle(x - w * 0.55, y - h * 0.3, 0.6 * s);
    g += `<path d="${silPath(top, x, y, s)}" fill="none" ${O(hard ? 5.5 : 4.5)}/>`;
    // сосульки снизу сбоку
    g += `<path d="M${f1(x + w * 0.45)} ${f1(y - 2 * s)} l${f1(3 * s)} ${f1(9 * s)} l${f1(3 * s)} ${f1(-9 * s)} Z" fill="#dff2ff" ${O(2)}/>`;
    return g;
  }
  // щебень руин: тёсаные блоки один на другом, швы, резной знак
  function rubbleRock(x, y, w, h, s, C, r, hard) {
    let g = '';
    const blocks = [[-0.95, 0, 1.05, 0.5], [0.08, 0, 0.9, 0.44], [-0.6, 0.48, 1.15, 0.5]];
    if (hard) blocks.push([-0.25, 0.96, 0.75, 0.38]);
    for (const [bx, by, bw, bh] of blocks) {
      const x0 = x + bx * w, y1 = y - by * h, ww = bw * w, hh = bh * h, tilt = (r() - 0.5) * 3 * s, ch = 4 * s;
      g += `<path d="${P([[x0 + ch, y1], [x0, y1 - ch], [x0, y1 - hh], [x0 + ww - ch, y1 - hh + tilt], [x0 + ww, y1 - hh + ch + tilt], [x0 + ww, y1]])}" fill="${C.b}" ${O(4)}/>`;
      g += `<path d="${P([[x0 + 3 * s, y1 - hh + 3 * s], [x0 + ww - ch - 2 * s, y1 - hh + tilt + 3 * s], [x0 + ww - ch - 2 * s, y1 - hh + tilt + 8 * s], [x0 + 3 * s, y1 - hh + 8 * s]])}" fill="${C.ll}" opacity=".85"/>`;
      g += `<path d="M${f1(x0 + ww - 7 * s)} ${f1(y1 - hh + 10 * s)} V${f1(y1 - 3 * s)}" stroke="${C.d}" stroke-width="${f1(5 * s)}" opacity=".9"/>`;
      if (r() < 0.6) g += `<path d="M${f1(x0 + ww * 0.3)} ${f1(y1 - hh * 0.7)} l${f1(5 * s)} ${f1(5 * s)} l${f1(-2 * s)} ${f1(7 * s)}" stroke="${INK}" stroke-width="${f1(1.8 * s)}" fill="none" opacity=".5"/>`;
    }
    g += `<path d="M${f1(x - w * 0.2)} ${f1(y - h * 0.82)} l${f1(7 * s)} ${f1(-11 * s)} l${f1(7 * s)} ${f1(11 * s)} M${f1(x - w * 0.2 + 7 * s)} ${f1(y - h * 0.82 - 11 * s)} v${f1(16 * s)}" stroke="${C.dd}" stroke-width="${f1(2.6 * s)}" fill="none" stroke-linecap="round"/>`;
    return g;
  }
  /** Камень клетки: форма по породе (cell.r) и твёрдости, pal - [основной, светлый, тёмный]. */
  function rock(cell, kind, x, y, s, pal, r) {
    const w = 56 * s, h = 66 * s, C = tones(pal), hard = cell && cell.t === 'hard', base = (cell && cell.r) || 'stone';
    const kindBase = cell && (cell.t === 'ore' || cell.t === 'rare') ? (cell.b || 'stone') : base;
    let g = shadow(x, y, w, s);
    if (kindBase === 'basalt') g += basaltRock(x, y, w, h, s, C, r, hard);
    else if (kindBase === 'limestone') g += limeRock(x, y, w, h, s, C, r, hard);
    else if (kindBase === 'sandstone') g += sandRock(x, y, w, h, s, C, r, hard);
    else if (kindBase === 'frost_stone') g += frostRock(x, y, w, h, s, C, r, hard);
    else if (kindBase === 'rubble') g += rubbleRock(x, y, w, h, s, C, r, hard);
    else if (hard) g += hardRock(x, y, w, h, s, C, r);
    else g += stoneRock(kind === 'mossy' && cell && (cell.t === 'ore' || cell.t === 'rare') ? 'boulder' : kind, x, y, w, h, s, C, r);
    return g;
  }

  /* ---------- руда и самоцветы ---------- */
  // цвета руды: [основной, светлый, тёмный]
  const ORE = {
    coal: ['#2a2a34', '#5a5c72', '#121218'], iron: ['#c8643a', '#f0965e', '#7a3018'], copper: ['#e08a3e', '#ffc07a', '#8a4a1e'], silver: ['#dfe6f2', '#ffffff', '#8a94aa'],
    gold: ['#ffcf3a', '#fff0a0', '#c07a10'], crystal: ['#7fe8ff', '#e0fbff', '#2a9ac0'], sulfur: ['#f2e24a', '#fff8a8', '#a89418'], peat: ['#6a4a32', '#9a7050', '#3a2618'],
    bone_dust: ['#eee6cc', '#ffffff', '#a89a78'], salt: ['#f4f8ff', '#ffffff', '#a8b8d0'], relic: ['#e0b04a', '#fff0a0', '#8a6018'],
    adamant: ['#9fc0e8', '#f0f8ff', '#4a6a9a'], fire_opal: ['#ff6a2a', '#ffd08a', '#b02a10'], emerald: ['#2fd07a', '#b0ffd0', '#0e7a40'], amber: ['#ffa52a', '#ffe0a0', '#b0600a'],
    sapphire: ['#3a7aff', '#b0d0ff', '#1a3aa8'], topaz: ['#ffc23a', '#fff0b0', '#c07a0a'], malachite: ['#1fa07a', '#7ae0b0', '#0a5a40'], morion: ['#6a3a8a', '#c8a0e8', '#2a1440'],
    aquamarine: ['#6fe8e8', '#e0ffff', '#2a9aa8'], ruby: ['#ff2a4a', '#ffb0b8', '#a00a24'], runestone: ['#a87aff', '#e8d8ff', '#5a3aa8'],
  };
  const oc = (res) => ORE[res] || [((window.LGCraftWorld || {}).RES || {})[res] || '#ffcf3a', '#ffffff', '#6a5a40'];
  // жила: ломаная трещина с ответвлениями (тёмный край + цвет)
  function vein(x, y, w, h, s, c, r, k = 1) {
    let d = '';
    for (let v = 0; v < k; v++) {
      let px = x - w * (0.75 - r() * 0.15), py = y - h * (0.25 + r() * 0.45); d += `M${f1(px)} ${f1(py)} `;
      const steps = 4; for (let q = 0; q < steps; q++) { px += w * (0.32 + r() * 0.12); py += (r() - 0.55) * h * 0.22; d += `L${f1(px)} ${f1(py)} `; if (q === 1) d += `M${f1(px)} ${f1(py)} l${f1(w * 0.12)} ${f1(-h * 0.18)} M${f1(px)} ${f1(py)} `; }
    }
    return `<path d="${d}" stroke="${c[2]}" stroke-width="${f1(7 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${c[0]}" stroke-width="${f1(3.6 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${c[1]}" stroke-width="${f1(1.3 * s)}" fill="none" stroke-linecap="round" opacity=".8"/>`;
  }
  // самородок: неровный многоугольник с гранью-бликом
  function nugget(px, py, k, c, r, glint = true) {
    const n = 6, pts = []; for (let q = 0; q < n; q++) { const a = (q / n) * Math.PI * 2 + r() * 0.4, rr = k * (0.75 + r() * 0.4); pts.push([px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.8]); }
    let g = `<path d="${P(pts)}" fill="${c[0]}" ${O(2.4)}/><path d="${P([pts[3], pts[4], pts[5], [px, py]])}" fill="${c[1]}" opacity=".85"/><path d="${P([pts[0], pts[1], [px, py]])}" fill="${c[2]}" opacity=".6"/>`;
    if (glint) g += `<circle cx="${f1(px - k * 0.3)}" cy="${f1(py - k * 0.35)}" r="${f1(k * 0.18)}" fill="#fff"/>`;
    return g;
  }
  // призма-кристалл: тело, острый конец, светлая и тёмная грани, блик
  function prism(bx, by, len, wd, ang, c, tip = 0.32, stroke = 3) {
    const a = (ang * Math.PI) / 180, hw = wd / 2, pts = [[bx - hw, by], [bx - hw, by - len * (1 - tip)], [bx, by - len], [bx + hw, by - len * (1 - tip)], [bx + hw, by]].map((p) => rot(p[0], p[1], bx, by, a));
    const mid = [[bx - hw * 0.15, by], [bx - hw * 0.15, by - len * (1 - tip)], [bx, by - len]].map((p) => rot(p[0], p[1], bx, by, a));
    const right = [mid[0], mid[1], mid[2], pts[3], pts[4]];
    const gl = [[bx - hw * 0.55, by - len * 0.12], [bx - hw * 0.55, by - len * (1 - tip) + 2]].map((p) => rot(p[0], p[1], bx, by, a));
    return `<path d="${P(pts)}" fill="${c[0]}"/><path d="${P(right)}" fill="${c[2]}" opacity=".55"/><path d="${P([pts[1], pts[2], mid[2], mid[1]])}" fill="${c[1]}" opacity=".9"/><path d="${PL(gl)}" stroke="#fff" stroke-width="${f1(wd * 0.16)}" stroke-linecap="round" opacity=".85"/><path d="${P(pts)}" fill="none" ${O(stroke)}/>`;
  }
  // гранёный камень-кабошон (опал, янтарь)
  function cabochon(px, py, rx, ry, c, extra = '') {
    return `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${c[0]}" ${O(2.6)}/><ellipse cx="${f1(px + rx * 0.15)}" cy="${f1(py + ry * 0.25)}" rx="${f1(rx * 0.7)}" ry="${f1(ry * 0.55)}" fill="${c[2]}" opacity=".35"/>${extra}<ellipse cx="${f1(px - rx * 0.35)}" cy="${f1(py - ry * 0.4)}" rx="${f1(rx * 0.32)}" ry="${f1(ry * 0.22)}" fill="${c[1]}"/><circle cx="${f1(px - rx * 0.45)}" cy="${f1(py - ry * 0.45)}" r="${f1(Math.min(rx, ry) * 0.12)}" fill="#fff"/>`;
  }
  // октаэдр (адамантит, сапфир-бипирамида)
  function octa(px, py, k, c) {
    const T = [px, py - k * 1.25], B = [px, py + k * 0.95], L = [px - k * 0.85, py - k * 0.1], R = [px + k * 0.85, py - k * 0.1], M = [px + k * 0.15, py + k * 0.05];
    return `<path d="${P([T, R, B, L])}" fill="${c[0]}"/><path d="${P([T, L, M])}" fill="${c[1]}"/><path d="${P([T, M, R])}" fill="${c[0]}"/><path d="${P([L, M, B])}" fill="${c[2]}" opacity=".7"/><path d="${P([M, R, B])}" fill="${c[2]}"/><path d="${P([T, R, B, L])}" fill="none" ${O(2.8)}/><path d="M${f1(T[0])} ${f1(T[1])} L${f1(M[0])} ${f1(M[1])} L${f1(B[0])} ${f1(B[1])} M${f1(L[0])} ${f1(L[1])} L${f1(M[0])} ${f1(M[1])} L${f1(R[0])} ${f1(R[1])}" stroke="${INK}" stroke-width="1.4" opacity=".45" fill="none"/>`;
  }
  // гнездо кристаллов: несколько призм веером из одной точки
  const cluster = (cx, cy, s, c, spec, tip, wdK = 1) => spec.map(([dx, len, ang, wd]) => prism(cx + dx * s, cy, len * s, (wd || 13) * s * wdK, ang, c, tip)).join('');
  /** Руда / самоцвет поверх камня: x, y - основание камня, s - размер; rare - богатая жила, gem - самоцвет этой природы. */
  function ore(res, x, y, s, r, rare, gem) {
    const c = oc(res); s *= 1.15; const w = 54 * s, h = 64 * s, fy = y - h * 0.5; let g = '';
    const glow = (k = 1) => `<ellipse cx="${f1(x)}" cy="${f1(y - h * 0.75)}" rx="${f1(w * 1.45 * k)}" ry="${f1(h * 1.05 * k)}" fill="${c[0]}" opacity=".16"/><ellipse cx="${f1(x)}" cy="${f1(y - h * 0.75)}" rx="${f1(w * 1.05 * k)}" ry="${f1(h * 0.75 * k)}" fill="${c[1]}" opacity=".12"/>`;
    const spots = (n) => Array.from({ length: n }, (_, k) => [x + (k / Math.max(1, n - 1) - 0.5) * w * 1.15 + (r() - 0.5) * 8 * s, y - h * (0.28 + r() * 0.4)]);
    const sparkle = (n, k = 1) => { let t = ''; for (let q = 0; q < n; q++) t += twinkle(x + (r() - 0.5) * w * 1.35, y - h * (0.5 + r() * 0.75), (0.8 + r() * 0.5) * s * k); return t; };
    switch (res) {
      case 'coal': g += vein(x, y, w, h, s, c, r, 1); for (const [px, py] of spots(rare ? 5 : 4)) { const k = (8 + r() * 4) * s; g += `<path d="${P([[px - k, py + k * 0.4], [px - k * 0.3, py - k], [px + k, py - k * 0.3], [px + k * 0.6, py + k * 0.8]])}" fill="${c[0]}" ${O(2.4)}/><path d="${P([[px - k * 0.3, py - k], [px + k, py - k * 0.3], [px + k * 0.1, py - k * 0.05]])}" fill="${c[1]}"/><path d="M${f1(px - k * 0.5)} ${f1(py + k * 0.2)} l${f1(k * 0.5)} ${f1(-k * 0.6)}" stroke="#9aa0c0" stroke-width="${f1(1.6 * s)}" stroke-linecap="round"/>`; } break;
      case 'iron': g += vein(x, y, w, h, s, c, r, 2); for (const [px, py] of spots(3)) g += nugget(px, py, (7 + r() * 3) * s, c, r); g += `<path d="M${f1(x - w * 0.5)} ${f1(y - 6 * s)} q${f1(4 * s)} ${f1(-8 * s)} ${f1(8 * s)} 0" stroke="${c[2]}" stroke-width="${f1(3 * s)}" fill="none" opacity=".6"/>`; break;
      case 'copper': g += vein(x, y, w, h, s, ['#3aa88a', '#8ae8c8', '#1a5a48'], r, 2); for (const [px, py] of spots(3)) g += nugget(px, py, (7.5 + r() * 3) * s, c, r) + `<circle cx="${f1(px + 4 * s)}" cy="${f1(py + 3 * s)}" r="${f1(2.2 * s)}" fill="#3aa88a" ${O(1.2)}/>`; break;
      case 'silver': g += vein(x, y, w, h, s, c, r, 2); for (const [px, py] of spots(rare ? 4 : 3)) g += nugget(px, py, (7 + r() * 3) * s, c, r); g += sparkle(rare ? 3 : 2, 0.8); break;
      case 'gold': g += vein(x, y, w, h, s, c, r, rare ? 2 : 1); for (const [px, py] of spots(rare ? 4 : 3)) g += nugget(px, py, (8.5 + r() * 3.5) * s, c, r); g += sparkle(3); break;
      case 'crystal': g += cluster(x, fy + 6 * s, s, c, [[-16, 34, -24], [2, 48, -4, 15], [18, 36, 20], [-4, 22, 40, 10]], 0.3); g += sparkle(2); break;
      case 'sulfur': for (const [px, py] of spots(4)) { for (let q = 0; q < 3; q++) g += `<circle cx="${f1(px + (q - 1) * 5 * s)}" cy="${f1(py - (q % 2) * 4 * s)}" r="${f1((4 + r() * 2.5) * s)}" fill="${c[0]}" ${O(2)}/><circle cx="${f1(px + (q - 1) * 5 * s - 1.5 * s)}" cy="${f1(py - (q % 2) * 4 * s - 1.5 * s)}" r="${f1(1.4 * s)}" fill="${c[1]}"/>`; } g += `<path d="M${f1(x - w * 0.3)} ${f1(y - h * 0.9)} q${f1(3 * s)} ${f1(-8 * s)} 0 ${f1(-14 * s)} M${f1(x + w * 0.2)} ${f1(y - h * 0.95)} q${f1(-3 * s)} ${f1(-7 * s)} 0 ${f1(-12 * s)}" stroke="#f8f0a0" stroke-width="${f1(2.4 * s)}" fill="none" opacity=".55" stroke-linecap="round"/>`; break;
      case 'peat': for (const [px, py] of spots(3)) g += `<path d="${blob(px, py, 10 * s, 7 * s, r, 7, 0.25)}" fill="${c[0]}" ${O(2.4)}/><path d="M${f1(px - 6 * s)} ${f1(py - 1 * s)} q${f1(6 * s)} ${f1(-4 * s)} ${f1(12 * s)} ${f1(1 * s)} M${f1(px - 5 * s)} ${f1(py + 3 * s)} q${f1(5 * s)} ${f1(-2 * s)} ${f1(10 * s)} 0" stroke="${c[1]}" stroke-width="${f1(1.6 * s)}" fill="none"/>`; g += `<path d="M${f1(x + w * 0.3)} ${f1(y - h * 0.82)} q${f1(-2 * s)} ${f1(-10 * s)} ${f1(3 * s)} ${f1(-16 * s)} M${f1(x + w * 0.3)} ${f1(y - h * 0.82 - 10 * s)} q${f1(6 * s)} ${f1(-2 * s)} ${f1(9 * s)} ${f1(-8 * s)}" stroke="#6fae4a" stroke-width="${f1(2.6 * s)}" fill="none" stroke-linecap="round"/>`; break;
      case 'bone_dust': { const bone = (px, py, a, L) => { const p1 = rot(px - L, py, px, py, a), p2 = rot(px + L, py, px, py, a), k = 3.4 * s; return `<path d="M${f1(p1[0])} ${f1(p1[1])} L${f1(p2[0])} ${f1(p2[1])}" stroke="${INK}" stroke-width="${f1(7.5 * s)}" stroke-linecap="round"/><path d="M${f1(p1[0])} ${f1(p1[1])} L${f1(p2[0])} ${f1(p2[1])}" stroke="${c[0]}" stroke-width="${f1(4 * s)}" stroke-linecap="round"/>` + [p1, p2].map((p) => `<circle cx="${f1(p[0])}" cy="${f1(p[1] - k * 0.6)}" r="${f1(k)}" fill="${c[0]}" ${O(2)}/><circle cx="${f1(p[0])}" cy="${f1(p[1] + k * 0.6)}" r="${f1(k)}" fill="${c[0]}" ${O(2)}/>`).join(''); };
        g += bone(x - w * 0.3, y - h * 0.4, 0.5, 12 * s) + bone(x + w * 0.25, y - h * 0.6, -0.4, 10 * s);
        const sx = x + w * 0.1, sy = y - h * 0.28; g += `<path d="M${f1(sx - 9 * s)} ${f1(sy)} a${f1(9 * s)} ${f1(8 * s)} 0 1 1 ${f1(18 * s)} 0 v${f1(4 * s)} h${f1(-18 * s)} Z" fill="${c[0]}" ${O(2.4)}/><circle cx="${f1(sx - 3.5 * s)}" cy="${f1(sy - 1 * s)}" r="${f1(2.4 * s)}" fill="${INK}"/><circle cx="${f1(sx + 3.5 * s)}" cy="${f1(sy - 1 * s)}" r="${f1(2.4 * s)}" fill="${INK}"/>`;
        for (let q = 0; q < 5; q++) g += `<circle cx="${f1(x + (r() - 0.5) * w)}" cy="${f1(y - 4 * s - r() * 6 * s)}" r="${f1(1.6 * s)}" fill="${c[0]}" opacity=".85"/>`; break; }
      case 'salt': for (const [px, py] of spots(4)) { const k = (6 + r() * 3) * s; g += `<path d="${P([[px - k, py - k * 0.5], [px, py - k], [px + k, py - k * 0.5], [px + k, py + k * 0.6], [px, py + k], [px - k, py + k * 0.6]])}" fill="${c[0]}" ${O(2.2)}/><path d="${P([[px - k, py - k * 0.5], [px, py - k], [px + k, py - k * 0.5], [px, py]])}" fill="#fff"/><path d="${P([[px, py], [px + k, py - k * 0.5], [px + k, py + k * 0.6], [px, py + k]])}" fill="${c[2]}" opacity=".6"/>`; } g += sparkle(1, 0.7); break;
      case 'relic': { const px = x - w * 0.15, py = y - h * 0.5, k = 13 * s; g += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(k)}" fill="${c[0]}" ${O(2.6)}/><circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(k * 0.65)}" fill="none" stroke="${c[2]}" stroke-width="${f1(2 * s)}"/><path d="M${f1(px - k * 0.3)} ${f1(py + k * 0.25)} l${f1(k * 0.3)} ${f1(-k * 0.6)} l${f1(k * 0.3)} ${f1(k * 0.6)}" stroke="${c[2]}" stroke-width="${f1(2 * s)}" fill="none"/><path d="M${f1(px - k * 0.55)} ${f1(py - k * 0.5)} a${f1(k * 0.7)} ${f1(k * 0.7)} 0 0 1 ${f1(k * 0.6)} ${f1(-k * 0.3)}" stroke="${c[1]}" stroke-width="${f1(2.4 * s)}" fill="none" stroke-linecap="round"/>`;
        g += `<path d="${P([[x + w * 0.2, y - h * 0.25], [x + w * 0.35, y - h * 0.55], [x + w * 0.7, y - h * 0.48], [x + w * 0.62, y - h * 0.2]])}" fill="#c8784a" ${O(2.4)}/><path d="M${f1(x + w * 0.3)} ${f1(y - h * 0.4)} h${f1(w * 0.3)}" stroke="#f3efd8" stroke-width="${f1(2 * s)}"/>` + sparkle(2); break; }
      // самоцветы природы: каждый своей огранкой
      case 'adamant': g += glow() + octa(x - 18 * s, fy - 2 * s, 14 * s, c) + octa(x + 16 * s, fy - 12 * s, 18 * s, c) + octa(x + 2 * s, fy + 12 * s, 10 * s, c) + sparkle(3); break;
      case 'fire_opal': { const fl = (px, py, k) => ['#ffe24a', '#ff2a8a', '#3affc0', '#ffffff'].map((col, q) => `<circle cx="${f1(px + Math.cos(q * 1.7) * k * 0.45)}" cy="${f1(py + Math.sin(q * 1.7) * k * 0.3)}" r="${f1(k * 0.12)}" fill="${col}" opacity=".9"/>`).join('');
        g += glow() + cabochon(x - 15 * s, fy, 15 * s, 12 * s, c, fl(x - 15 * s, fy, 15 * s)) + cabochon(x + 16 * s, fy - 12 * s, 12 * s, 10 * s, c, fl(x + 16 * s, fy - 12 * s, 12 * s)) + cabochon(x + 8 * s, fy + 14 * s, 8 * s, 6.5 * s, c) + sparkle(2); break; }
      case 'emerald': g += glow() + cluster(x, fy + 14 * s, s, c, [[-16, 36, -14, 16], [3, 50, 2, 18], [20, 32, 18, 15]], 0.08) + sparkle(2); break;
      case 'amber': { const drop = (px, py, k) => `<path d="M${f1(px)} ${f1(py - k * 1.3)} Q${f1(px + k * 1.1)} ${f1(py - k * 0.1)} ${f1(px + k * 0.8)} ${f1(py + k * 0.5)} A${f1(k * 0.85)} ${f1(k * 0.75)} 0 0 1 ${f1(px - k * 0.8)} ${f1(py + k * 0.5)} Q${f1(px - k * 1.1)} ${f1(py - k * 0.1)} ${f1(px)} ${f1(py - k * 1.3)} Z" fill="${c[0]}" ${O(2.6)}/><path d="M${f1(px - k * 0.4)} ${f1(py - k * 0.4)} q${f1(k * 0.1)} ${f1(-k * 0.4)} ${f1(k * 0.35)} ${f1(-k * 0.6)}" stroke="${c[1]}" stroke-width="${f1(k * 0.28)}" fill="none" stroke-linecap="round"/>`;
        g += glow() + drop(x - 15 * s, fy + 4 * s, 14 * s) + drop(x + 16 * s, fy - 8 * s, 12 * s) + `<path d="M${f1(x - 15 * s)} ${f1(fy + 7 * s)} l${f1(3 * s)} ${f1(-2 * s)} l${f1(3 * s)} ${f1(2 * s)} M${f1(x - 12 * s)} ${f1(fy + 5 * s)} v${f1(5 * s)}" stroke="${c[2]}" stroke-width="${f1(1.8 * s)}" fill="none"/>` + drop(x + 4 * s, fy + 18 * s, 7 * s) + sparkle(2); break; }
      case 'sapphire': g += glow() + cluster(x, fy + 14 * s, s, c, [[-14, 40, -18, 15], [6, 52, 6, 17]], 0.42) + octa(x + 22 * s, fy + 6 * s, 9 * s, c) + sparkle(3); break;
      case 'topaz': g += glow() + cluster(x, fy + 14 * s, s, c, [[-14, 44, -16, 14], [6, 56, 3, 15], [22, 34, 22, 12]], 0.24) + `<path d="M${f1(x + 4 * s)} ${f1(fy)} h${f1(6 * s)} M${f1(x + 3 * s)} ${f1(fy - 10 * s)} h${f1(6 * s)}" stroke="${c[2]}" stroke-width="${f1(1.6 * s)}" opacity=".7"/>` + sparkle(3); break;
      case 'malachite': { const px = x - 4 * s, py = fy + 2 * s; g += glow() + `<path d="${blob(px, py, 24 * s, 17 * s, r, 9, 0.12)}" fill="${c[0]}" ${O(2.8)}/>`; for (let q = 1; q <= 3; q++) g += `<path d="${blob(px - 4 * s, py + 2 * s, 24 * s * (1 - q * 0.22), 17 * s * (1 - q * 0.22), r, 9, 0.1)}" fill="none" stroke="${q % 2 ? c[2] : c[1]}" stroke-width="${f1(2.6 * s)}"/>`;
        g += `<path d="${blob(x + 20 * s, fy - 12 * s, 10 * s, 8 * s, r, 7, 0.15)}" fill="${c[1]}" ${O(2.4)}/>` + sparkle(2); break; }
      case 'morion': g += glow() + cluster(x, fy + 14 * s, s, c, [[-16, 38, -20, 14], [2, 52, -2, 16], [18, 40, 18, 14]], 0.3) + sparkle(2, 0.8); break;
      case 'aquamarine': g += glow() + cluster(x, fy + 14 * s, s, c, [[-18, 46, -22, 10], [-4, 60, -6, 11], [10, 54, 10, 10], [22, 38, 26, 9]], 0.18) + sparkle(3); break;
      case 'ruby': g += glow() + cluster(x, fy + 12 * s, s, c, [[-15, 30, -16, 18], [6, 40, 4, 20], [24, 24, 22, 15]], 0.3) + sparkle(3); break;
      case 'runestone': { const px = x - 2 * s, py = fy, k = 20 * s; g += glow() + `<path d="${P([[px - k * 0.8, py + k * 0.9], [px - k * 0.9, py - k * 0.6], [px - k * 0.2, py - k * 1.1], [px + k * 0.8, py - k * 0.7], [px + k * 0.85, py + k * 0.9]])}" fill="#6a6478" ${O(2.8)}/><path d="${P([[px - k * 0.9, py - k * 0.6], [px - k * 0.2, py - k * 1.1], [px + k * 0.8, py - k * 0.7], [px - k * 0.1, py - k * 0.45]])}" fill="#8a849a"/>`;
        const rn = `M${f1(px - k * 0.3)} ${f1(py + k * 0.6)} V${f1(py - k * 0.5)} L${f1(px + k * 0.3)} ${f1(py - k * 0.1)} L${f1(px - k * 0.3)} ${f1(py + k * 0.2)} M${f1(px + k * 0.35)} ${f1(py + k * 0.6)} V${f1(py + k * 0.1)}`;
        g += `<path d="${rn}" stroke="${c[0]}" stroke-width="${f1(6 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/><path d="${rn}" stroke="${c[1]}" stroke-width="${f1(2.8 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + sparkle(2); break; }
      default: for (const [px, py] of spots(3)) g += nugget(px, py, 8 * s, c, r);
    }
    if (rare && !gem && !ORE_GEMS.has(res)) g = glow(0.85) + g + sparkle(2);
    return g;
  }
  const ORE_GEMS = new Set(['adamant', 'fire_opal', 'emerald', 'amber', 'sapphire', 'topaz', 'malachite', 'morion', 'aquamarine', 'ruby', 'runestone']);

  /* ---------- скала, сундук, табличка уровня, трещины ---------- */
  function wall(x, y, pal, r) {
    const C = tones([lit(pal[0], 0.12), lit(pal[1], 0.25), drk(pal[0], 0.25)]);
    let g = `<ellipse cx="${x + 4}" cy="${y + 2}" rx="70" ry="14" fill="#000" opacity=".38"/>`;
    for (const [dx, ww, hh, dy] of [[-30, 30, 120, -4], [26, 32, 104, -2], [-2, 40, 168, 0]]) {
      const bx = x + dx, by = y + dy, top = outline(bx, by, ww, hh, r, 5, 0.14, 0, 0.35);
      g += `<path d="${silPath(top, bx, by, 1)}" fill="${C.b}"/>` + facets(top, bx, by, ww, hh, 1, C, r);
      for (let k = 0; k < 3; k++) { const yy = by - hh * (0.2 + k * 0.25); g += `<path d="M${f1(bx - ww * 0.6)} ${f1(yy)} l${f1(ww * 0.5)} ${f1(-5)} l${f1(ww * 0.45)} ${f1(4)}" stroke="${INK}" stroke-width="2.2" fill="none" opacity=".4" stroke-linecap="round"/>`; }
      g += `<path d="${silPath(top, bx, by, 1)}" fill="none" ${O(5)}/>`;
    }
    g += `<path d="${blob(x - 44, y - 6, 14, 9, r, 6, 0.25)}" fill="${C.l}" ${O(2.5)}/><path d="${blob(x + 52, y - 4, 11, 7, r, 6, 0.25)}" fill="${C.d}" ${O(2.5)}/>`;
    return g;
  }
  function chest(x, y, s, pal, r, noPile) {
    const C = tones(pal); let g = `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(64 * s)}" ry="${f1(12 * s)}" fill="#000" opacity=".34"/>`;
    const w = 62 * s, h = 44 * s, cx = x - w / 2, cy = y - 52 * s;
    g += `<g transform="rotate(-7 ${f1(x)} ${f1(cy)})">`;
    g += `<rect x="${f1(cx)}" y="${f1(cy + h * 0.3)}" width="${f1(w)}" height="${f1(h * 0.72)}" rx="4" fill="#a0602a" ${O(3.5)}/>`;
    for (let k = 1; k < 3; k++) g += `<path d="M${f1(cx + 3)} ${f1(cy + h * 0.3 + k * h * 0.24)} H${f1(cx + w - 3)}" stroke="#6a3a18" stroke-width="${f1(2 * s)}"/>`;
    g += `<path d="M${f1(cx)} ${f1(cy + h * 0.34)} Q${f1(cx + w / 2)} ${f1(cy - h * 0.34)} ${f1(cx + w)} ${f1(cy + h * 0.34)} Z" fill="#c07a34" ${O(3.5)}/><path d="M${f1(cx + w * 0.1)} ${f1(cy + h * 0.18)} Q${f1(cx + w / 2)} ${f1(cy - h * 0.18)} ${f1(cx + w * 0.9)} ${f1(cy + h * 0.18)}" stroke="#e8a860" stroke-width="${f1(2.6 * s)}" fill="none"/>`;
    g += `<path d="M${f1(cx + w * 0.2)} ${f1(cy + h * 0.02)} V${f1(cy + h * 1.02)} M${f1(cx + w * 0.8)} ${f1(cy + h * 0.02)} V${f1(cy + h * 1.02)}" stroke="${INK}" stroke-width="${f1(8 * s)}"/><path d="M${f1(cx + w * 0.2)} ${f1(cy + h * 0.02)} V${f1(cy + h * 1.02)} M${f1(cx + w * 0.8)} ${f1(cy + h * 0.02)} V${f1(cy + h * 1.02)}" stroke="#ffcf3a" stroke-width="${f1(4.5 * s)}"/>`;
    g += `<rect x="${f1(x - 7 * s)}" y="${f1(cy + h * 0.3)}" width="${f1(14 * s)}" height="${f1(15 * s)}" rx="2" fill="#ffcf3a" ${O(2.4)}/><circle cx="${f1(x)}" cy="${f1(cy + h * 0.3 + 6 * s)}" r="${f1(2.2 * s)}" fill="${INK}"/>`;
    g += `</g>` + twinkle(x + 22 * s, cy - 2 * s, 0.9 * s, '#fff6c0');
    if (!noPile) for (let k = 0; k < 4; k++) { const rx = x + (k - 1.5) * 27 * s, top = outline(rx, y - 2 * s, 19 * s, 15 * s, r, 5, 0.2); g += `<path d="${silPath(top, rx, y - 2 * s, s * 0.5)}" fill="${k % 2 ? C.b : C.d}" ${O(3)}/><path d="${PL(top.slice(1, 3))}" stroke="${C.ll}" stroke-width="${f1(2.4 * s)}" fill="none" stroke-linecap="round"/>`; }
    return g;
  }
  // табличка уровня: каменная плашка с медной рамкой и кирочкой; твёрдая порода - стальная, редкая жила - рубиновая с искрой
  function badge(x, y, lv, t) {
    const hot = t === 'rare', hard = t === 'hard', fill = hot ? '#7a1a3a' : hard ? '#2c3448' : '#2a2238', top = hot ? '#a82a50' : hard ? '#46526e' : '#3e3454', rim = hot ? '#ffd27a' : hard ? '#cfd8ea' : '#e8b85a';
    const txt = String(lv), wd = 26 + Math.max(0, txt.length - 1) * 11, L = x - wd / 2 - 13, W2 = wd + 26, X = (v) => f1(x + v), Y = (v) => f1(y + v);
    // координаты - сразу на месте (без transform у каждой таблички: меньше слоёв отрисовки)
    let g = `<rect x="${f1(L + 2)}" y="${Y(-10)}" width="${f1(W2)}" height="28" rx="9" fill="#000" fill-opacity=".3"/>`;
    g += `<rect x="${f1(L)}" y="${Y(-14)}" width="${f1(W2)}" height="28" rx="9" fill="${fill}" stroke="${INK}" stroke-width="3.5"/>`;
    g += `<path d="M${f1(L + 5)} ${Y(-9)} h${f1(wd + 16)}" stroke="${top}" stroke-width="7" stroke-linecap="round"/>`;
    g += `<rect x="${f1(L + 3)}" y="${Y(-11)}" width="${f1(wd + 20)}" height="22" rx="7" fill="none" stroke="${rim}" stroke-width="1.6" stroke-opacity=".9"/>`;
    const ix = -wd / 2 - 3;
    if (hot) g += `<path d="M${X(ix - 5)} ${Y(-2)} l5 -6 l5 6 l-5 7 Z" fill="#ff8aa8" stroke="${INK}" stroke-width="1.4"/>`;
    else if (hard) g += `<path d="M${X(ix - 5)} ${Y(-7)} h10 v5 q0 6 -5 9 q-5 -3 -5 -9 Z" fill="#9aa8c4" stroke="${INK}" stroke-width="1.4"/>`;
    else g += `<path d="M${X(ix - 5)} ${Y(7)} L${X(ix + 2)} ${Y(-5)}" stroke="#d8a868" stroke-width="2.6" stroke-linecap="round"/><path d="M${X(ix - 6)} ${Y(-3)} Q${X(ix)} ${Y(-10)} ${X(ix + 7)} ${Y(-1)}" stroke="${INK}" stroke-width="4.6" fill="none" stroke-linecap="round"/><path d="M${X(ix - 6)} ${Y(-3)} Q${X(ix)} ${Y(-10)} ${X(ix + 7)} ${Y(-1)}" stroke="#e6ecf6" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    g += `<text x="${X(5)}" y="${Y(7)}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="19" fill="#ffe27a" stroke="${INK}" stroke-width="3" paint-order="stroke">${txt}</text>`;
    return g;
  }
  // трещины: стадия 1…3 (камень поддаётся), seed - какая сторона и наклон
  function crack(stage, x, y, s, seed) {
    if (!(stage > 0)) return '';
    const fl = seed % 2 ? -1 : 1, cx = x + fl * 8 * s, cy = y - 36 * s, k = s;
    const d1 = `M${f1(cx)} ${f1(cy - 26 * k)} l${f1(fl * 5 * k)} ${f1(9 * k)} l${f1(-fl * 6 * k)} ${f1(8 * k)} l${f1(fl * 7 * k)} ${f1(10 * k)}`;
    const d2 = `M${f1(cx + fl * 5 * k)} ${f1(cy - 17 * k)} l${f1(fl * 12 * k)} ${f1(-2 * k)} l${f1(fl * 6 * k)} ${f1(7 * k)} M${f1(cx - fl * 1 * k)} ${f1(cy - 9 * k)} l${f1(-fl * 13 * k)} ${f1(4 * k)} l${f1(-fl * 5 * k)} ${f1(9 * k)}`;
    const d3 = `M${f1(cx + fl * 6 * k)} ${f1(cy + 1 * k)} l${f1(-fl * 3 * k)} ${f1(12 * k)} l${f1(fl * 8 * k)} ${f1(8 * k)} M${f1(cx + fl * 23 * k)} ${f1(cy - 12 * k)} l${f1(fl * 8 * k)} ${f1(10 * k)} M${f1(cx - fl * 19 * k)} ${f1(cy - 5 * k)} l${f1(-fl * 2 * k)} ${f1(-12 * k)} l${f1(-fl * 8 * k)} ${f1(-5 * k)}`;
    const d = stage === 1 ? d1 : stage === 2 ? d1 + ' ' + d2 : d1 + ' ' + d2 + ' ' + d3;
    let g = `<path d="${d}" stroke="#fff" stroke-width="${f1(6.5 * k)}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".25"/><path d="${d}" stroke="${INK}" stroke-width="${f1((stage === 3 ? 3.6 : 3) * k)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (stage === 3) g += `<path d="M${f1(cx - fl * 6 * k)} ${f1(cy - 2 * k)} l${f1(fl * 8 * k)} ${f1(-4 * k)} l${f1(fl * 3 * k)} ${f1(7 * k)} Z" fill="${INK}" opacity=".55"/><path d="M${f1(cx + fl * 16 * k)} ${f1(cy + 18 * k)} l${f1(5 * k)} ${f1(-2 * k)} l${f1(1 * k)} ${f1(5 * k)} Z" fill="${INK}" opacity=".5"/>`;
    return g;
  }
  const stageOf = (p) => (p >= 0.75 ? 3 : p >= 0.45 ? 2 : p >= 0.15 ? 1 : 0);

  /* ---------- предметы входа ---------- */
  const WOOD = ['#9a6636', '#c08a52', '#5e3a1c'];   // доска: цвет, светлая кромка, тень
  // брус с волокнами, светлой кромкой и тенью справа; гвозди - по концам
  function beam(x, y, w, h, r, o = {}) {
    const c = o.c || WOOD; let g = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${o.rx || 2}" fill="${c[0]}"/>`;
    const vert = h > w;
    if (vert) { g += `<rect x="${f1(x + w * 0.66)}" y="${f1(y)}" width="${f1(w * 0.34)}" height="${f1(h)}" fill="${c[2]}" opacity=".55"/><path d="M${f1(x + w * 0.2)} ${f1(y + 3)} V${f1(y + h - 3)}" stroke="${c[1]}" stroke-width="${f1(Math.max(2, w * 0.14))}" opacity=".7"/>`;
      for (let k = 0; k < Math.max(1, Math.floor(h / 40)); k++) { const yy = y + 12 + r() * (h - 24), xx = x + w * (0.3 + r() * 0.25); g += `<path d="M${f1(xx)} ${f1(yy)} q${f1(w * 0.12)} ${f1(9)} 0 ${f1(18)}" stroke="${c[2]}" stroke-width="1.6" fill="none" opacity=".8"/>`; } }
    else { g += `<rect x="${f1(x)}" y="${f1(y + h * 0.62)}" width="${f1(w)}" height="${f1(h * 0.38)}" fill="${c[2]}" opacity=".5"/><path d="M${f1(x + 3)} ${f1(y + h * 0.25)} H${f1(x + w - 3)}" stroke="${c[1]}" stroke-width="${f1(Math.max(2, h * 0.14))}" opacity=".7"/>`;
      for (let k = 0; k < Math.max(1, Math.floor(w / 50)); k++) { const xx = x + 10 + r() * (w - 30), yy = y + h * (0.35 + r() * 0.2); g += `<path d="M${f1(xx)} ${f1(yy)} q9 ${f1(-h * 0.12)} 18 0" stroke="${c[2]}" stroke-width="1.6" fill="none" opacity=".8"/>`; } }
    g += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${o.rx || 2}" fill="none" ${O(o.ow || 3.5)}/>`;
    if (o.nails) for (const [nx, ny] of o.nails) g += `<circle cx="${f1(nx)}" cy="${f1(ny)}" r="2.6" fill="#8a8a9a" stroke="${INK}" stroke-width="1.4"/><circle cx="${f1(nx - 0.7)}" cy="${f1(ny - 0.7)}" r=".9" fill="#fff"/>`;
    return g;
  }
  const nail = (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="#8a8a9a" stroke="${INK}" stroke-width="1.4"/><circle cx="${f1(x - 0.7)}" cy="${f1(y - 0.7)}" r=".9" fill="#fff"/>`;
  // фонарь: кованая рамка, стекло со светом, огонёк; glow - ореол (общий градиент mnaGlow)
  function lantern(x, y, k = 1, glow = true) {
    let g = glow ? `<circle cx="${f1(x)}" cy="${f1(y + 4 * k)}" r="${f1(60 * k)}" fill="url(#mnaGlow)"/>` : '';
    g += `<path d="M${f1(x)} ${f1(y - 24 * k)} v${f1(-6 * k)}" stroke="${INK}" stroke-width="${f1(2.5 * k)}"/><circle cx="${f1(x)}" cy="${f1(y - 32 * k)}" r="${f1(4 * k)}" fill="none" stroke="${INK}" stroke-width="${f1(2.2 * k)}"/>`;
    g += `<path d="M${f1(x - 10 * k)} ${f1(y - 16 * k)} l${f1(10 * k)} ${f1(-9 * k)} l${f1(10 * k)} ${f1(9 * k)} Z" fill="#3a3442" ${O(2.5)}/>`;
    g += `<rect x="${f1(x - 9 * k)}" y="${f1(y - 16 * k)}" width="${f1(18 * k)}" height="${f1(24 * k)}" rx="${f1(2 * k)}" fill="#ffe9a0" ${O(2.8)}/>`;
    g += `<path d="M${f1(x)} ${f1(y + 3 * k)} q${f1(-5 * k)} ${f1(-6 * k)} 0 ${f1(-13 * k)} q${f1(5 * k)} ${f1(7 * k)} 0 ${f1(13 * k)} Z" fill="#ff9a2a"/><path d="M${f1(x)} ${f1(y + 2 * k)} q${f1(-2.4 * k)} ${f1(-3 * k)} 0 ${f1(-7 * k)} q${f1(2.4 * k)} ${f1(4 * k)} 0 ${f1(7 * k)} Z" fill="#fff6c0"/>`;
    g += `<path d="M${f1(x - 9 * k)} ${f1(y - 4 * k)} h${f1(18 * k)} M${f1(x)} ${f1(y - 16 * k)} v${f1(24 * k)}" stroke="${INK}" stroke-width="${f1(1.6 * k)}" opacity=".55"/>`;
    g += `<rect x="${f1(x - 11 * k)}" y="${f1(y + 7 * k)}" width="${f1(22 * k)}" height="${f1(5 * k)}" rx="${f1(1.5 * k)}" fill="#3a3442" ${O(2.4)}/>`;
    return g;
  }
  const sign = (x, y, text, size, w) => `<path d="M${f1(x - w / 2 + 4)} ${f1(y - size * 0.95)} h${f1(w - 8)} l4 ${f1(size * 0.6)} l-4 ${f1(size * 0.6)} h${f1(-w + 8)} l-4 ${f1(-size * 0.6)} Z" fill="#7a4a24" ${O(3.5)}/><path d="M${f1(x - w / 2 + 8)} ${f1(y - size * 0.72)} h${f1(w - 16)}" stroke="#a87040" stroke-width="3" stroke-linecap="round"/>${nail(x - w / 2 + 9, y - size * 0.35)}${nail(x + w / 2 - 9, y - size * 0.35)}<text x="${f1(x)}" y="${f1(y - size * 0.12)}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="#ffe27a" stroke="${INK}" stroke-width="4.5" paint-order="stroke">${text}</text>`;
  // руда горкой (вагонетка, ящик): камешки разных пород с бликом
  function orePile(cx, cy, n, spread, k, r) {
    const cols = [ORE.iron, ORE.coal, ORE.gold, ORE.silver, ['#a08a72', '#d0bca0', '#6a5a48'], ORE.copper, ORE.crystal]; let g = '';
    for (let q = 0; q < n; q++) { const px = cx + (q / Math.max(1, n - 1) - 0.5) * spread, py = cy - (q % 2) * 7 * k - (q % 3 === 1 ? 4 * k : 0), c = cols[q % cols.length]; g += nugget(px, py, (12 + r() * 4) * k, c, r); }
    return g;
  }
  function crate(x, y, w, h, r, label) {
    let g = `<ellipse cx="${f1(x + w / 2 + 3)}" cy="${f1(y + h + 2)}" rx="${f1(w * 0.6)}" ry="8" fill="#000" opacity=".3"/>`;
    g += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="3" fill="#b07a40" ${O(4)}/>`;
    for (let k = 1; k < 3; k++) g += `<path d="M${f1(x + 3)} ${f1(y + (h * k) / 3)} H${f1(x + w - 3)}" stroke="#6a3a18" stroke-width="2.4"/>`;
    g += `<path d="M${f1(x + 5)} ${f1(y + h - 5)} L${f1(x + w - 5)} ${f1(y + 5)}" stroke="#7a4a20" stroke-width="7" stroke-linecap="round"/><path d="M${f1(x + 5)} ${f1(y + h - 5)} L${f1(x + w - 5)} ${f1(y + 5)}" stroke="#d09a5a" stroke-width="3" stroke-linecap="round"/>`;
    g += `<rect x="${f1(x + w * 0.72)}" y="${f1(y + 2)}" width="${f1(w * 0.26)}" height="${f1(h - 4)}" fill="#5e3a1c" opacity=".35"/>`;
    g += nail(x + 6, y + 6) + nail(x + w - 6, y + 6) + nail(x + 6, y + h - 6) + nail(x + w - 6, y + h - 6);
    if (label) g += `<text x="${f1(x + w * 0.38)}" y="${f1(y + h * 0.62)}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="11" fill="#5e3a1c" opacity=".8">${label}</text>`;
    return g;
  }
  const helmetIcon = (x, y, k) => `<path d="M${f1(x - 13 * k)} ${f1(y)} Q${f1(x)} ${f1(y - 22 * k)} ${f1(x + 13 * k)} ${f1(y)} Z" fill="#ffcf3a" ${O(2.5)}/><rect x="${f1(x - 16 * k)}" y="${f1(y - 3 * k)}" width="${f1(32 * k)}" height="${f1(5 * k)}" rx="${f1(2.5 * k)}" fill="#e8a82a" ${O(2.2)}/><circle cx="${f1(x)}" cy="${f1(y - 10 * k)}" r="${f1(4 * k)}" fill="#fff6c0" ${O(2)}/><path d="M${f1(x - 6 * k)} ${f1(y - 13 * k)} q${f1(3 * k)} ${f1(-5 * k)} ${f1(9 * k)} ${f1(-5 * k)}" stroke="#fff4b0" stroke-width="${f1(2 * k)}" fill="none" stroke-linecap="round"/>`;

  /* 26.10 (просьба стримера): верхняя клеть этажа (спуск на следующий) - в том же стиле, что подъёмник «В город»: брусья с волокнами
     и гвоздями, шкив, трос, клеть с решёткой, сигнальный огонь (красный - камни ещё есть, зелёный - этаж расчищен), табличка
     «ЭТАЖ N ↑» на цепях. Место и размер - как у прежнего рисунка (ex - центр ствола, top - верх зала); craftworld.js кладёт его
     предметом { obj: 'up' } - mine.js даёт подсветку и подпись */
  function upLift(ex, top, n, done, r) {
    let s = `<circle cx="${ex}" cy="${top - 170}" r="150" fill="url(#cwLift)"/>`;
    s += `<path d="M${ex - 86} ${top - 30} V${top - 292} H${ex + 86} V${top - 30} Z" fill="#0c0910" ${O(5)}/>`;
    s += [0, 1, 2, 3, 4].map((k) => `<path d="M${ex - 82} ${top - 70 - k * 46} H${ex + 82}" stroke="#1e1824" stroke-width="5"/>`).join('');
    s += `<path d="M${ex - 82} ${top - 288} L${ex + 82} ${top - 288}" stroke="#000" stroke-width="18" opacity=".45"/>`;
    s += beam(ex - 104, top - 302, 18, 274, r, { nails: [[ex - 95, top - 276], [ex - 95, top - 54]] }) + beam(ex + 86, top - 302, 18, 274, r, { nails: [[ex + 95, top - 276], [ex + 95, top - 54]] });
    s += beam(ex - 128, top - 318, 256, 22, r, { nails: [[ex - 116, top - 307], [ex + 116, top - 307]] });
    // шкив и трос
    s += `<circle cx="${ex}" cy="${top - 292}" r="20" fill="#6a6a78" ${O(3.5)}/><circle cx="${ex}" cy="${top - 292}" r="13" fill="none" stroke="#9a9aa8" stroke-width="3"/>`
      + [0, 1, 2].map((k) => { const a = (k * Math.PI) / 3; return `<path d="M${f1(ex - Math.cos(a) * 13)} ${f1(top - 292 - Math.sin(a) * 13)} L${f1(ex + Math.cos(a) * 13)} ${f1(top - 292 + Math.sin(a) * 13)}" stroke="#4a4a56" stroke-width="2.6"/>`; }).join('')
      + `<circle cx="${ex}" cy="${top - 292}" r="4" fill="#c8c8d4" stroke="${INK}" stroke-width="1.6"/>`;
    s += `<path d="M${ex - 18} ${top - 290} V${top - 172} M${ex + 18} ${top - 290} V${top - 172}" stroke="#4a4a56" stroke-width="3.4"/><path d="M${ex + 18} ${top - 290} V${top - 172}" stroke="#b0b0bc" stroke-width="1.4" stroke-dasharray="4 3"/>`;
    // клеть с решёткой
    s += `<rect x="${ex - 58}" y="${top - 174}" width="116" height="118" rx="4" fill="#2a2632" ${O(5)}/><rect x="${ex - 50}" y="${top - 166}" width="100" height="102" fill="#3a3442"/>`
      + [0, 1, 2, 3, 4].map((k) => `<path d="M${f1(ex - 40 + k * 20)} ${top - 166} V${top - 64}" stroke="#7a7a88" stroke-width="4"/><path d="M${f1(ex - 41.5 + k * 20)} ${top - 166} V${top - 64}" stroke="#b8b8c8" stroke-width="1.2"/>`).join('')
      + `<path d="M${ex - 58} ${top - 140} H${ex + 58} M${ex - 58} ${top - 92} H${ex + 58}" stroke="#5a5a68" stroke-width="7"/><path d="M${ex - 58} ${top - 140} H${ex + 58} M${ex - 58} ${top - 92} H${ex + 58}" stroke="${INK}" stroke-width="1.6" opacity=".6"/>`
      + [[-52, -168], [52, -168], [-52, -62], [52, -62]].map(([dx, dy]) => `<circle cx="${ex + dx}" cy="${top + dy}" r="2.8" fill="#c8c8d4" stroke="${INK}" stroke-width="1.3"/>`).join('')
      + `<rect x="${ex - 58}" y="${top - 174}" width="116" height="118" rx="4" fill="none" ${O(5)}/><path d="M${ex - 62} ${top - 178} h124" stroke="#c8a050" stroke-width="6" stroke-linecap="round"/>`;
    // сигнальный огонь: красный - ещё копают, зелёный - этаж расчищен
    const lc = done ? '#7ff07a' : '#ff5a4e';
    s += `<path d="M${ex + 104} ${top - 270} h14" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="${ex + 126}" cy="${top - 270}" r="26" fill="${lc}" opacity=".25"/>`
      + `<circle cx="${ex + 126}" cy="${top - 270}" r="14" fill="#3a3442" ${O(3.5)}/><circle cx="${ex + 126}" cy="${top - 270}" r="9" fill="${lc}"/><circle cx="${ex + 123}" cy="${top - 273}" r="3" fill="#fff" opacity=".8"/>`;
    // табличка на цепях
    s += `<path d="M${ex - 58} ${top - 318} l-4 -22 M${ex + 58} ${top - 318} l4 -22" stroke="#8a8a9a" stroke-width="3" stroke-dasharray="3 3"/>` + sign(ex, top - 336, `ЭТАЖ ${n} ↑`, 22, 160);
    return s;
  }
  function entry(F, L, r, o) {
    const W = 1024, H = 2476, Y0 = 420, GRID_H = 1536, out = [];
    // подъёмник «В город»: копёр из брусьев, шкив с тросом, клеть с решёткой, фонарь, вывеска на цепях
    const lx = 150, ly = H - 70; let s = '';
    s += `<ellipse cx="${lx + 6}" cy="${ly + 2}" rx="118" ry="14" fill="#000" opacity=".32"/>`;
    s += `<rect x="${lx - 86}" y="${ly - 14}" width="172" height="16" rx="3" fill="#5a5260" ${O(3.5)}/>` + [0, 1, 2, 3].map((k) => `<path d="M${lx - 64 + k * 42} ${ly - 12} v12" stroke="${INK}" stroke-width="2" opacity=".4"/>`).join('');
    s += beam(lx - 92, ly - 236, 18, 236, r, { nails: [[lx - 83, ly - 210], [lx - 83, ly - 30]] }) + beam(lx + 74, ly - 236, 18, 236, r, { nails: [[lx + 83, ly - 210], [lx + 83, ly - 30]] });
    s += `<path d="M${lx - 74} ${ly - 160} L${lx - 30} ${ly - 222} M${lx + 74} ${ly - 160} L${lx + 30} ${ly - 222}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${lx - 74} ${ly - 160} L${lx - 30} ${ly - 222} M${lx + 74} ${ly - 160} L${lx + 30} ${ly - 222}" stroke="#9a6636" stroke-width="7" stroke-linecap="round"/>`;
    s += beam(lx - 112, ly - 252, 224, 20, r, { nails: [[lx - 100, ly - 242], [lx + 100, ly - 242]] });
    // шкив
    s += `<circle cx="${lx}" cy="${ly - 228}" r="20" fill="#6a6a78" ${O(3.5)}/><circle cx="${lx}" cy="${ly - 228}" r="13" fill="none" stroke="#9a9aa8" stroke-width="3"/>` + [0, 1, 2].map((k) => { const a = (k * Math.PI) / 3; return `<path d="M${f1(lx - Math.cos(a) * 13)} ${f1(ly - 228 - Math.sin(a) * 13)} L${f1(lx + Math.cos(a) * 13)} ${f1(ly - 228 + Math.sin(a) * 13)}" stroke="${INK}" stroke-width="2.2"/>`; }).join('') + `<circle cx="${lx}" cy="${ly - 228}" r="4.5" fill="#c8a050" ${O(2)}/>`;
    s += `<path d="M${lx + 18} ${ly - 226} V${ly - 136} M${lx - 18} ${ly - 226} V${ly - 136}" stroke="#4a4a56" stroke-width="3.4"/><path d="M${lx + 18} ${ly - 226} V${ly - 136}" stroke="#b0b0bc" stroke-width="1.4" stroke-dasharray="4 3"/>`;
    // клеть
    s += `<rect x="${lx - 64}" y="${ly - 138}" width="128" height="124" rx="4" fill="#2a2632" ${O(5)}/>`;
    s += `<rect x="${lx - 56}" y="${ly - 130}" width="112" height="108" fill="#3a3442"/>` + [0, 1, 2, 3, 4, 5].map((k) => `<path d="M${lx - 46 + k * 18.4} ${ly - 130} V${ly - 22}" stroke="#7a7a88" stroke-width="4"/><path d="M${lx - 47.5 + k * 18.4} ${ly - 130} V${ly - 22}" stroke="#b8b8c8" stroke-width="1.2"/>`).join('');
    s += `<path d="M${lx - 64} ${ly - 112} H${lx + 64} M${lx - 64} ${ly - 60} H${lx + 64}" stroke="#5a5a68" stroke-width="7"/><path d="M${lx - 64} ${ly - 112} H${lx + 64} M${lx - 64} ${ly - 60} H${lx + 64}" stroke="${INK}" stroke-width="1.6" opacity=".6"/>`;
    s += [[-58, -132], [58, -132], [-58, -20], [58, -20], [-58, -112], [58, -112], [-58, -60], [58, -60]].map(([dx, dy]) => `<circle cx="${lx + dx}" cy="${ly + dy}" r="2.8" fill="#c8c8d4" stroke="${INK}" stroke-width="1.3"/>`).join('');
    s += `<rect x="${lx - 64}" y="${ly - 138}" width="128" height="124" rx="4" fill="none" ${O(5)}/><path d="M${lx - 68} ${ly - 142} h136" stroke="#c8a050" stroke-width="6" stroke-linecap="round"/><path d="M${lx - 68} ${ly - 142} h136" stroke="${INK}" stroke-width="1.6" opacity=".5"/>`;
    s += lantern(lx + 104, ly - 170, 1);
    s += `<path d="M${lx + 92} ${ly - 200} h-10" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    // вывеска на цепях
    s += `<path d="M${lx - 54} ${ly - 252} l-4 -22 M${lx + 54} ${ly - 252} l4 -22" stroke="#8a8a9a" stroke-width="3" stroke-dasharray="3 3"/>` + sign(lx, ly - 270, 'В ГОРОД ↓', 22, 150);
    out.push({ obj: 'lift', x: lx, y: ly, svg: s });

    // лавка «Скупка»: навес полосами с фестонами и тенью, столбы, прилавок из досок, весы, ящик и мешок руды, монеты
    const nx = W - 210, ny = H - 120; s = '';
    s += `<ellipse cx="${nx + 6}" cy="${ny + 36}" rx="150" ry="16" fill="#000" opacity=".3"/>`;
    s += beam(nx - 150, ny - 186, 16, 222, r, { c: ['#7a4a24', '#a87040', '#4a2a12'] }) + beam(nx + 134, ny - 186, 16, 222, r, { c: ['#7a4a24', '#a87040', '#4a2a12'] });
    // ящик и мешок за прилавком
    s += crate(nx - 122, ny - 104, 64, 50, r) + orePile(nx - 90, ny - 106, 4, 40, 0.7, r);
    s += `<path d="M${nx - 50} ${ny - 56} q-6 -40 12 -52 q-6 -8 6 -12 q14 2 8 12 q20 10 14 52 Z" fill="#c8a878" ${O(3.5)}/><path d="M${nx - 34} ${ny - 108} q8 4 16 0" stroke="#7a5a38" stroke-width="3" fill="none"/><path d="M${nx - 44} ${ny - 64} q10 -30 4 -40" stroke="#e8d4a8" stroke-width="3" fill="none" stroke-linecap="round"/>` + nugget(nx - 26, ny - 62, 7, ORE.gold, r) + nugget(nx - 14, ny - 58, 6, ORE.silver, r);
    // весы
    s += `<path d="M${nx + 60} ${ny - 56} V${ny - 124}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${nx + 60} ${ny - 56} V${ny - 124}" stroke="#c8a050" stroke-width="4" stroke-linecap="round"/><path d="M${nx + 26} ${ny - 118} H${nx + 94}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${nx + 26} ${ny - 118} H${nx + 94}" stroke="#e0b860" stroke-width="3.4" stroke-linecap="round"/><circle cx="${nx + 60}" cy="${ny - 126}" r="5" fill="#ffcf3a" ${O(2.2)}/>`;
    s += [nx + 30, nx + 90].map((px, k) => `<path d="M${px} ${ny - 118} L${px - 12} ${ny - 92} M${px} ${ny - 118} L${px + 12} ${ny - 92}" stroke="#8a7a50" stroke-width="1.6"/><path d="M${px - 17} ${ny - 92} h34 q-4 9 -17 9 q-13 0 -17 -9 Z" fill="#ffcf3a" ${O(2.4)}/>` + (k ? nugget(px, ny - 98, 6, ORE.iron, r) : twinkle(px + 2, ny - 100, 0.6))).join('');
    // прилавок: столешница с кромкой, доски спереди, гвозди, монеты
    s += `<rect x="${nx - 124}" y="${ny - 40}" width="248" height="76" rx="4" fill="#9a6636" ${O(5)}/>` + [0, 1, 2, 3, 4, 5].map((k) => `<path d="M${nx - 124 + k * 41.3} ${ny - 38} V${ny + 34}" stroke="#5e3a1c" stroke-width="2.6"/>` + nail(nx - 110 + k * 41.3, ny - 28) + nail(nx - 110 + k * 41.3, ny + 24)).join('') + `<rect x="${nx + 84}" y="${ny - 38}" width="38" height="72" fill="#5e3a1c" opacity=".35"/>`;
    s += `<path d="M${nx - 96} ${ny - 8} q8 -6 16 0 M${nx + 10} ${ny + 8} q8 -6 16 0" stroke="#5e3a1c" stroke-width="1.8" fill="none"/>`;
    s += `<rect x="${nx - 136}" y="${ny - 58}" width="272" height="22" rx="6" fill="#6a4020" ${O(4)}/><path d="M${nx - 128} ${ny - 52} H${nx + 128}" stroke="#a87040" stroke-width="4" stroke-linecap="round"/>`;
    s += [0, 1, 2].map((k) => `<ellipse cx="${nx - 4 + k * 3}" cy="${ny - 60 - k * 5}" rx="11" ry="4.5" fill="#ffcf3a" ${O(2.2)}/>`).join('') + `<ellipse cx="${nx + 18}" cy="${ny - 60}" rx="10" ry="4" fill="#ffcf3a" ${O(2.2)}/>`;
    // навес: полосы ткани, тень складок, фестоны, кант
    s += `<path d="M${nx - 158} ${ny - 228} h316 l10 48 h-336 Z" fill="#b5332a" ${O(4)}/>` + [0, 1, 2, 3, 4, 5].map((k) => k % 2 ? `<path d="M${f1(nx - 158 + k * 52.7)} ${ny - 228} h52.7 l${f1(1.6 + k * 0.2)} 48 h-${f1(56)} Z" fill="#f3efd8"/>` : '').join('');
    s += `<path d="M${nx - 158} ${ny - 228} h316 l10 48 h-336 Z" fill="none" ${O(4)}/><path d="M${nx - 160} ${ny - 196} h320" stroke="#000" stroke-width="10" opacity=".12"/>`;
    s += [0, 1, 2, 3, 4, 5].map((k) => `<path d="M${f1(nx - 168 + k * 56)} ${ny - 180} q28 26 56 0" fill="${k % 2 ? '#f3efd8' : '#b5332a'}" ${O(3)}/><path d="M${f1(nx - 160 + k * 56)} ${ny - 176} q20 14 40 0" stroke="${k % 2 ? '#d8d0b8' : '#8a2018'}" stroke-width="3" fill="none"/>`).join('');
    s += `<path d="M${nx - 150} ${ny - 232} h300" stroke="#ffcf3a" stroke-width="5" stroke-linecap="round"/><path d="M${nx - 150} ${ny - 232} h300" stroke="${INK}" stroke-width="1.4" opacity=".5"/>`;
    s += `<rect x="${nx - 74}" y="${ny - 266}" width="148" height="36" rx="8" fill="#7a1a14" ${O(3.5)}/><path d="M${nx - 66} ${ny - 258} h132" stroke="#a83a2a" stroke-width="4" stroke-linecap="round"/><text x="${nx}" y="${ny - 240}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="21" fill="#ffe27a" stroke="${INK}" stroke-width="4" paint-order="stroke">СКУПКА</text>` + nail(nx - 64, ny - 248) + nail(nx + 64, ny - 248);
    s += lantern(nx + 142, ny - 160, 0.85);
    out.push({ obj: 'buyer', x: nx, y: ny + 34, svg: s });

    // доска «Поручения»: козырёк, рама из брусьев, пробковое поле, листки с булавками и строчками
    const bx = W / 2 - 10, by = H - 60; s = '';
    s += `<ellipse cx="${bx + 4}" cy="${by + 2}" rx="78" ry="11" fill="#000" opacity=".3"/>`;
    s += beam(bx - 58, by - 160, 14, 160, r, { c: ['#7a4a24', '#a87040', '#4a2a12'] }) + beam(bx + 44, by - 160, 14, 160, r, { c: ['#7a4a24', '#a87040', '#4a2a12'] });
    s += `<rect x="${bx - 78}" y="${by - 202}" width="156" height="110" rx="6" fill="#7a4a24" ${O(5)}/><rect x="${bx - 68}" y="${by - 192}" width="136" height="90" rx="3" fill="#c49a62" ${O(2.5)}/>`;
    for (let k = 0; k < 14; k++) s += `<circle cx="${f1(bx - 62 + r() * 124)}" cy="${f1(by - 186 + r() * 78)}" r="${f1(1 + r() * 1.4)}" fill="#8a6038" opacity=".6"/>`;
    s += [0, 1, 2].map((k) => { const px = bx - 46 + k * 44, py = by - 182 + (k % 2) * 8, a = (k - 1) * 6; return `<g transform="rotate(${a} ${px} ${py + 24})"><rect x="${px - 17}" y="${py}" width="34" height="46" fill="#f3efd8" ${O(2.5)}/><path d="M${px + 17} ${py + 46} l-9 0 l9 -9 Z" fill="#d8d0b8" ${O(1.8)}/>` + [0, 1, 2, 3].map((q) => `<path d="M${px - 11} ${py + 12 + q * 8} h${q === 3 ? 12 : 22}" stroke="#8a8070" stroke-width="2" stroke-linecap="round"/>`).join('') + `<circle cx="${px}" cy="${py + 4}" r="4" fill="${['#e8455c', '#3a7aff', '#7ff07a'][k]}" ${O(1.8)}/></g>`; }).join('');
    s += `<path d="M${bx - 92} ${by - 200} L${bx} ${by - 226} L${bx + 92} ${by - 200} Z" fill="#6a4020" ${O(4)}/><path d="M${bx - 80} ${by - 204} L${bx} ${by - 222}" stroke="#a87040" stroke-width="3" stroke-linecap="round"/>`;
    s += nail(bx - 70, by - 194) + nail(bx + 70, by - 194) + nail(bx - 70, by - 100) + nail(bx + 70, by - 100);
    s += sign(bx, by - 226, 'ПОРУЧЕНИЯ', 18, 156);
    out.push({ obj: 'board', x: bx, y: by, svg: s });

    // вагонетка на рельсах, полная руды
    const cx = 330, cy = H - 150; s = '';
    s += `<ellipse cx="${cx + 4}" cy="${cy + 14}" rx="108" ry="10" fill="#000" opacity=".3"/>`;
    s += [-96, -60, -24, 12, 48, 84].map((dx) => `<rect x="${cx + dx}" y="${cy + 6}" width="14" height="12" rx="2" fill="#6a4020" ${O(2.2)}/>`).join('');
    s += `<path d="M${cx - 112} ${cy + 9} H${cx + 112} M${cx - 112} ${cy + 16} H${cx + 112}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${cx - 112} ${cy + 8} H${cx + 112}" stroke="#a8a8b8" stroke-width="2"/>`;
    s += orePile(cx, cy - 78, 6, 120, 1, r);
    s += `<path d="M${cx - 86} ${cy - 76} h172 l-16 66 h-140 Z" fill="#6a6a78" ${O(5)}/><path d="M${cx - 86} ${cy - 76} h172 l-4 14 h-164 Z" fill="#8a8a9a" ${O(2.5)}/>`;
    s += `<path d="M${cx + 46} ${cy - 62} l-8 52 h24 l12 -52 Z" fill="#4a4a56" opacity=".55"/><path d="M${cx - 72} ${cy - 40} h144" stroke="#4a4a56" stroke-width="6"/><path d="M${cx - 72} ${cy - 40} h144" stroke="${INK}" stroke-width="1.6" opacity=".5"/>`;
    s += [-70, -30, 10, 50].map((dx) => `<circle cx="${cx + dx + 8}" cy="${cy - 52}" r="2.6" fill="#c8c8d4" stroke="${INK}" stroke-width="1.3"/><circle cx="${cx + dx + 8}" cy="${cy - 28}" r="2.6" fill="#c8c8d4" stroke="${INK}" stroke-width="1.3"/>`).join('');
    s += `<path d="M${cx - 70} ${cy - 68} h40" stroke="#c8c8d8" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
    s += [-46, 46].map((dx) => `<circle cx="${cx + dx}" cy="${cy}" r="17" fill="#3a3a44" ${O(4)}/><circle cx="${cx + dx}" cy="${cy}" r="10" fill="none" stroke="#6a6a78" stroke-width="2.6"/>` + [0, 1, 2].map((k) => { const a = (k * Math.PI) / 3; return `<path d="M${f1(cx + dx - Math.cos(a) * 10)} ${f1(cy - Math.sin(a) * 10)} L${f1(cx + dx + Math.cos(a) * 10)} ${f1(cy + Math.sin(a) * 10)}" stroke="#6a6a78" stroke-width="2"/>`; }).join('') + `<circle cx="${cx + dx}" cy="${cy}" r="4" fill="#c8a050" ${O(1.8)}/>`).join('');
    s += `<path d="M${cx + 86} ${cy - 50} l18 -6" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${cx + 86} ${cy - 50} l18 -6" stroke="#8a8a9a" stroke-width="3" stroke-linecap="round"/>`;
    out.push({ obj: 'cart', x: cx, y: cy, svg: s });

    // Фонарщик: столб с кронштейном и двумя фонарями, ящик с касками
    let lampNpc = null;
    if (o.lampMan) {
      const fx = 210, fy = Y0 + GRID_H + 200; s = '';
      s += `<ellipse cx="${fx + 100}" cy="${fy + 2}" rx="80" ry="10" fill="#000" opacity=".3"/>`;
      s += beam(fx + 63, fy - 196, 14, 196, r, { c: ['#7a4a24', '#a87040', '#4a2a12'], nails: [[fx + 70, fy - 170]] });
      s += beam(fx + 30, fy - 190, 82, 12, r, { c: ['#7a4a24', '#a87040', '#4a2a12'] }) + `<path d="M${fx + 72} ${fy - 178} l22 22 M${fx + 68} ${fy - 178} l-22 22" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${fx + 72} ${fy - 178} l22 22 M${fx + 68} ${fy - 178} l-22 22" stroke="#7a4a24" stroke-width="3.4" stroke-linecap="round"/>`;
      s += lantern(fx + 40, fy - 144, 1) + lantern(fx + 104, fy - 144, 1);
      s += crate(fx + 92, fy - 48, 72, 48, r) + helmetIcon(fx + 112, fy - 48, 1) + helmetIcon(fx + 142, fy - 50, 0.95);
      out.push({ obj: 'lamp', x: fx + 70, y: fy, svg: s });
      lampNpc = { x: fx + 215, y: fy + 10, name: 'Фонарщик' };   // как craftworld (mine/ui): справа от столба и ящика касок
    }
    return { props: out, npc: { x: nx - 150, y: ny + 70, name: 'Скупщик Гром' }, lampNpc };
  }
  // общие определения сцены: ореол фонаря
  const defs = () => '<defs><radialGradient id="mnaGlow"><stop offset="0" stop-color="#ffcf6a" stop-opacity=".55"/><stop offset=".55" stop-color="#ffcf6a" stop-opacity=".16"/><stop offset="1" stop-color="#ffcf6a" stop-opacity="0"/></radialGradient></defs>';

  /* ---------- копаемые камни: копия камня поверх сцены (трещины по прогрессу, дрожь от ударов - CSS transform, без кадров JS) ---------- */
  /** HTML камней, которые сейчас копают (слой полосок mine.js): rk - { i: svg камня }, list - [{ i, x, y, s, p, n }]. */
  function digging(rk, list) {
    let h = '';
    for (const b of list) {
      const body = rk[b.i]; if (!body) continue;
      const x0 = b.x - 90, y0 = b.y - 170, st = stageOf(b.p), d = 0.9 + ((b.i * 37) % 9) / 20, dl = -((b.i * 53) % 17) / 10;
      const M = m && META.get(m[1]), chc = M ? `;--ch1:${M.C.l1};--ch2:${M.C.d1}` : '';
      h += `<svg class="mn-rk${b.n > 0 ? ' hit' : ''}" data-rk="${b.i}" style="left:${x0}px;top:${y0}px;--sd:${d.toFixed(2)}s;--sl:${dl.toFixed(1)}s${chc}" width="180" height="190" viewBox="${x0} ${y0} 180 190" overflow="visible" aria-hidden="true">${body}<g class="mn-crk" data-st="${st}">${crack(st, b.x, b.y, b.s, b.i)}</g></svg>`;
    }
    return h;
  }
  /** Обновить трещины по прогрессу (раз в 20 с, без перерисовки камня). */
  function cracks(host, list) {
    for (const b of list) { const el = host.querySelector(`.mn-rk[data-rk="${b.i}"] .mn-crk`); if (!el) continue; const st = stageOf(b.p); if (String(st) !== el.dataset.st) { el.dataset.st = String(st); el.innerHTML = crack(st, b.x, b.y, b.s, b.i); } }
  }
  // opacity у фигуры - отдельный «эффект» на этапе компоновки (Layerize) при каждом кадре страницы; fill-/stroke-opacity - нет
  const fo = (svg) => String(svg).replace(/ opacity="([\d.]+)"/g, ' fill-opacity="$1" stroke-opacity="$1"');
  const F = (fn) => (...a) => fo(fn(...a));
  const entryFo = (...a) => { const E = entry(...a); for (const p of E.props) p.svg = fo(p.svg); return E; };

  /* ================= 25.10 (mine/rocks2): камни по рисунку зрителя AsTruM_02 (docs/art/viewer-stone2) =================
     Пухлые валуны с плоской многотонной заливкой (светлые плоскости сверху, тёмные грани справа и снизу), толстый тёмный контур.
     У каждой темы глубины свои детали: 1-5 мох (трава - флаг GRASS), 6-10 глиняные пласты, 11-15 лишайник и камешки,
     16-20 гранитный крап и кварц, 21-25 сырость и светогрибы со спорами, 26+ обсидиан с лавой в трещинах.
     Повреждения 0…4 по прогрессу копания: целый → трещины → глубокие трещины и скол → раскол с осколками → крошится.
     Нагрузка: каждый рисунок - общий <symbol> (тема × порода × форма × палитра; руда; табличка; сундук; скала), в сцене только
     <use> (3-4 узла на камень вместо ~27). Ни фильтров, ни размытия, ни opacity у элементов (только fill-/stroke-opacity). */
  const SYM = new Map();    // id → '<symbol>…</symbol>' (сцена: тела, руда, таблички, сундуки, скалы)
  const DMG = new Map();    // id тела → [символы повреждений 1…4] (слой копий копаемых камней)
  const META = new Map();   // id тела → { C, a: [x, y] начало трещины } - для крошки при смене стадии
  const CUR = { theme: 'roots' };
  let GRASS = false;        // трава у камней (только тема 1): решение - см. docs/reports/mine-rocks2.md
  try { const m = /[?&]grass=([01])/.exec(location.search); if (m) GRASS = m[1] === '1'; } catch (e) {}
  const THEMES = [[26, 'abyss'], [21, 'grotto'], [16, 'granite'], [11, 'stone'], [6, 'clay'], [1, 'roots']];
  const themeOfN = (n) => { n = +n || 1; for (const [from, id] of THEMES) if (n >= from) return id; return 'roots'; };
  /** Начало сборки этажа (craftworld.build): тема глубины по номеру этажа (как mine-biome.js) или o.theme. */
  function begin(F, o) { CUR.theme = (o && o.theme) || themeOfN(F && F.n); }
  const hs = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
  const rngOf = (seed) => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const D = (pts) => (pts && pts.length > 2 ? P(pts) : '');
  const dot = (px, py, rr) => `M${f1(px - rr)} ${f1(py)} a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(rr * 2)} 0 a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-rr * 2)} 0 `;
  const el = (d, a) => (d && d.trim() ? `<path d="${d}" ${a}/>` : '');
  // замкнутая гладкая линия через середины сторон (квадратичные кривые), разбитая на точки - заливки граней совпадают с контуром
  function smooth(pts, k = 5) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], u = pts[(i + 2) % n], a = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], b = [(q[0] + u[0]) / 2, (q[1] + u[1]) / 2];
      for (let t = 0; t < k; t++) { const s = t / k, m0 = (1 - s) * (1 - s), m1 = 2 * (1 - s) * s, m2 = s * s; out.push([m0 * a[0] + m1 * q[0] + m2 * b[0], m0 * a[1] + m1 * q[1] + m2 * b[1]]); }
    }
    return out;
  }
  const area = (pl) => { let s = 0; for (let i = 0; i < pl.length; i++) { const p = pl[i], q = pl[(i + 1) % pl.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };
  // Сазерленд - Ходжмен: многоугольник subj (любой) ∩ выпуклый clip
  function clipPoly(subj, clip) {
    const sg = area(clip) > 0 ? 1 : -1; let out = subj;
    for (let i = 0; i < clip.length && out.length; i++) {
      const A = clip[i], B = clip[(i + 1) % clip.length], inp = out; out = [];
      const side = (Pp) => sg * ((B[0] - A[0]) * (Pp[1] - A[1]) - (B[1] - A[1]) * (Pp[0] - A[0]));
      for (let j = 0; j < inp.length; j++) {
        const p = inp[j], q = inp[(j + 1) % inp.length], sp = side(p), sq = side(q);
        if (sp >= 0) out.push(p);
        if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
      }
    }
    return out;
  }
  const inPoly = (pt, pl) => { let c = false; for (let i = 0, j = pl.length - 1; i < pl.length; j = i++) { const a = pl[i], b = pl[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const dens = (pl, st = 6) => { const out = []; for (let i = 0; i < pl.length; i++) { const p = pl[i], q = pl[(i + 1) % pl.length], n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / st)); for (let k = 0; k < n; k++) out.push([p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]); } return out; };
  // верх силуэта над x: пересечение вертикали со сторонами (верно и для угловатых силуэтов с длинными сторонами)
  const topAt = (sil, x) => { let best = null; for (let i = 0; i < sil.length; i++) { const p = sil[i], q = sil[(i + 1) % sil.length]; if ((p[0] - x) * (q[0] - x) > 0 || p[0] === q[0]) continue; const y = p[1] + ((q[1] - p[1]) * (x - p[0])) / (q[0] - p[0]); if (best === null || y < best) best = y; } return best === null ? 0 : best; };
  // ломаная «трещина» от точки, внутри фигуры
  function walk(st, dir, len, inside, r, step = 6.5, wob = 1) {
    const pts = [st]; let [x, y] = st, a = dir;
    for (let k = 0; k < len / step; k++) {
      a = dir + Math.max(-0.95, Math.min(0.95, a - dir + (r() - 0.5) * 1.2 * wob));
      let nx = x + Math.cos(a) * step, ny = y + Math.sin(a) * step;
      if (!inside([nx, ny])) { a = dir; nx = x + Math.cos(a) * step * 0.7; ny = y + Math.sin(a) * step * 0.7; if (!inside([nx, ny])) break; }
      pts.push([nx, ny]); x = nx; y = ny;
    }
    return pts;
  }
  const TINT = { limestone: ['#e8dcc0', 0.4], sandstone: ['#d8985a', 0.42], frost_stone: ['#c2e0f4', 0.5], basalt: ['#2c262e', 0.42], rubble: ['#aaa496', 0.28] };
  function tones2(pal, type) {
    let m = pal[0], l = pal[1] || lit(pal[0], 0.2), d = pal[2] || drk(pal[0], 0.3);
    const tt = TINT[type]; if (tt) { m = mix(m, tt[0], tt[1]); l = mix(l, lit(tt[0], 0.15), tt[1]); d = mix(d, drk(tt[0], 0.35), tt[1]); }
    return { m, l, d, l1: mix(m, l, 0.78), l2: lit(l, 0.2), rim: lit(l, 0.4), ml: mix(m, l, 0.36), md: mix(m, d, 0.45), dm: mix(m, d, 0.45), d1: mix(m, d, 0.9), d2: drk(d, 0.12),
      d3: drk(d, 0.45), hole: drk(d, 0.7), fresh: lit(mix(m, l, 0.5), 0.14), ink: mix('#1b1513', d, 0.12) };
  }
  // грани в долях ширины W и высоты H (низ камня - y = 0); все - выпуклые, режутся по силуэту
  const FC = {
    l1: [[-1.5, -1.5], [0.8, -1.5], [0.58, -0.6], [-0.18, -0.48], [-1.5, -0.6]],
    l2: [[-0.84, -1.5], [0.18, -1.5], [0.06, -0.8], [-0.6, -0.7]],
    d1: [[0.48, -1.5], [1.5, -1.5], [1.5, 0.3], [0.36, 0.3], [0.26, -0.42]],
    mr: [[0.62, -0.96], [0.98, -0.82], [0.84, -0.62], [0.6, -0.7]],
    mr2: [[0.5, -0.36], [0.86, -0.32], [0.8, -0.16], [0.46, -0.18]],
    ml: [[-1.3, -0.56], [-0.52, -0.46], [-0.64, -0.2], [-1.3, -0.2]],
    md: [[-0.12, -0.42], [0.26, -0.4], [0.2, -0.14], [-0.16, -0.17]],
    md2: [[-1.4, -0.92], [-0.86, -0.86], [-0.96, -0.62], [-1.4, -0.62]],
    d2: [[-1.5, -0.15], [1.5, -0.22], [1.5, 0.3], [-1.5, 0.3]],
  };
  const U = (c, pts, j = 0.05) => pts.map(([a, b]) => [(c.ox || 0) + (a + (c.r() - 0.5) * j * 2) * c.W, (c.oy || 0) + (b + (c.r() - 0.5) * j * 2) * c.H]);
  const cl = (c, poly, sil) => D(clipPoly(sil || c.sil, U(c, poly)));
  // плоская многотонная заливка по силуэту (рисунок зрителя): основа, светлый верх, ярчайшая плоскость, тёмный бок, пятна граней, низ, щели, блик по кромке, ямки
  function facets2(c) {
    const { sil, C, W, H, r } = c, ox = c.ox || 0, oy = c.oy || 0;
    let g = `<path d="${P(sil)}" fill="${C.m}"/>`;
    g += el(cl(c, FC.l1), `fill="${C.l1}"`) + el(cl(c, FC.l2), `fill="${C.l2}"`) + el(cl(c, FC.d1), `fill="${C.d1}"`);
    g += el(cl(c, FC.mr) + ' ' + cl(c, FC.mr2), `fill="${C.dm}"`) + el(cl(c, FC.ml), `fill="${C.ml}"`) + el(cl(c, FC.md) + ' ' + cl(c, FC.md2), `fill="${C.md}"`);
    g += el(cl(c, FC.d2), `fill="${C.d2}"`);
    const cr = [U(c, [[-0.2, -0.48], [-0.1, -0.36], [-0.15, -0.25]], 0.03), U(c, [[0.27, -0.42], [0.33, -0.3], [0.29, -0.18]], 0.03), U(c, [[-0.78, -0.36], [-0.64, -0.3]], 0.03)];
    if (c.extraCr) cr.push(...c.extraCr);
    g += el(cr.map(PL).join(' '), `stroke="${C.d3}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"`);
    const cx = ox, cy = oy - 0.45 * H, rim = sil.filter((p) => p[1] - oy < -0.52 * H && p[0] - ox < 0.3 * W).map((p) => { const dx = cx - p[0], dy = cy - p[1], L = Math.hypot(dx, dy) || 1; return [p[0] + (dx / L) * 5, p[1] + (dy / L) * 5]; });
    if (rim.length > 1) g += `<path d="${PL(rim)}" stroke="${C.rim}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    let pits = ''; for (let k = 0; k < 3; k++) pits += dot(ox + (r() - 0.5) * 1.1 * W, oy - (0.22 + r() * 0.36) * H, 1.4 + r() * 1.2);
    g += `<path d="${pits}" fill="${C.d3}"/>`;
    return g;
  }
  const outlineOf = (sil, C, w = 5.2) => `<path d="${P(sil)}" fill="none" stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;

  /* --- силуэты --- */
  const W0 = 54, H0 = 76;   // 26.10: камень целиком в своей клетке (128 px): полуширина ≤ 62 при самом крупном размере
  /* 25.10 (art/mine-rocks3): у каждого пласта свои 5 форм валунов (раньше - 6 общих на все пласты). Мягкие пласты (норы, гроты) -
     пухлые гладкие валуны; глина - плоские плиты и уступы; каменные выработки - тяжёлые глыбы со скруглёнными углами; гранит и
     обсидиан бездны - угловатые, с острыми гранями. Твёрдая порода любого пласта - угловатая версия формы (и кварц, см. typeDeco).
     Точки - от левого низа по верху к правому низу (доли полуширины W и высоты H; низ - y = 0). */
  const SH3 = {
    roots: [
      [[-1, -0.02], [-1.04, -0.4], [-0.86, -0.76], [-0.44, -1], [0.06, -1.04], [0.52, -0.92], [0.88, -0.6], [1.04, -0.26], [1, -0.02], [0.45, 0.07], [-0.45, 0.07]],   // купол
      [[-1, -0.02], [-1.02, -0.44], [-0.8, -0.8], [-0.38, -1.02], [0.06, -0.99], [0.3, -0.76], [0.6, -0.8], [0.92, -0.52], [1.04, -0.2], [1, -0.02], [0.45, 0.07], [-0.45, 0.07]],   // двугорбый (как у зрителя)
      [[-1.06, 0], [-1.05, -0.32], [-0.81, -0.66], [-0.3, -0.84], [0.3, -0.86], [0.81, -0.67], [1.05, -0.34], [1.06, 0], [0.5, 0.07], [-0.5, 0.07]],   // низкий широкий
      [[-0.98, 0], [-1.02, -0.42], [-0.82, -0.86], [-0.4, -1.1], [0.08, -1.04], [0.56, -0.8], [0.92, -0.48], [1.02, -0.18], [0.98, 0], [0.45, 0.07], [-0.45, 0.07]],   // яйцо, макушка слева
      [[-1, 0], [-1.04, -0.36], [-0.84, -0.62], [-0.56, -0.72], [-0.36, -0.94], [0.02, -1], [0.3, -0.86], [0.6, -0.9], [0.88, -0.66], [1.04, -0.3], [1, 0], [0.45, 0.07], [-0.45, 0.07]],   // комковатый, три бугра
    ],
    clay: [
      [[-1.02, 0], [-1.04, -0.5], [-0.92, -0.78], [-0.6, -0.86], [0.6, -0.88], [0.92, -0.8], [1.04, -0.52], [1.02, 0], [0.5, 0.06], [-0.5, 0.06]],   // плита со срезанным верхом
      [[-1.02, 0], [-1.04, -0.46], [-0.9, -0.6], [-0.3, -0.62], [-0.18, -0.9], [0.5, -0.94], [0.86, -0.84], [1.02, -0.5], [1, 0], [0.5, 0.06], [-0.5, 0.06]],   // уступ
      [[-1, 0], [-1.02, -0.6], [-0.86, -0.98], [-0.5, -1.02], [0.4, -0.72], [0.94, -0.5], [1.04, -0.24], [1, 0], [0.5, 0.06], [-0.5, 0.06]],   // клин
      [[-1.02, 0], [-1.06, -0.4], [-0.9, -0.74], [-0.4, -0.92], [0.4, -0.94], [0.9, -0.74], [1.06, -0.4], [1.02, 0], [0.5, 0.06], [-0.5, 0.06]],   // каравай
      [[-1.04, 0], [-1.06, -0.3], [-0.94, -0.42], [-1, -0.56], [-0.8, -0.78], [0.2, -0.88], [0.8, -0.76], [0.96, -0.58], [0.88, -0.44], [1.04, -0.3], [1.02, 0], [0.5, 0.06], [-0.5, 0.06]],   // стопка пластов
    ],
    stone: [
      [[-1, 0], [-1.02, -0.44], [-0.8, -0.82], [-0.36, -1], [0.3, -0.98], [0.78, -0.76], [1.02, -0.4], [1, 0], [0.45, 0.07], [-0.45, 0.07]],   // глыба с плоской макушкой
      [[-0.9, 0], [-0.94, -0.6], [-0.78, -1.02], [-0.2, -1.12], [0.5, -1.06], [0.86, -0.86], [0.96, -0.4], [0.92, 0], [0.45, 0.07], [-0.45, 0.07]],   // высокий блок
      [[-1, 0], [-0.98, -0.36], [-0.72, -0.7], [-0.18, -0.96], [0.46, -1.08], [0.9, -0.9], [1.04, -0.46], [1, 0], [0.45, 0.07], [-0.45, 0.07]],   // завалился вправо
      [[-1, 0], [-1.04, -0.48], [-0.78, -0.86], [-0.3, -0.94], [-0.06, -0.8], [0.22, -0.96], [0.7, -0.88], [1, -0.5], [1, 0], [0.45, 0.07], [-0.45, 0.07]],   // с выемкой на макушке
      [[-1.02, 0], [-0.96, -0.32], [-0.6, -0.72], [-0.1, -1.1], [0.2, -1.08], [0.66, -0.66], [1, -0.3], [1.02, 0], [0.45, 0.07], [-0.45, 0.07]],   // скруглённая пирамида
    ],
    granite: [
      [[-0.98, 0], [-1.02, -0.52], [-0.78, -0.9], [-0.2, -1.04], [0.46, -0.98], [0.86, -0.7], [1, -0.3], [0.98, 0], [0.4, 0.06], [-0.4, 0.06]],   // гранёная глыба
      [[-0.86, 0], [-0.94, -0.5], [-0.6, -0.92], [0, -1.18], [0.5, -0.9], [0.9, -0.48], [0.9, 0], [0.4, 0.06], [-0.4, 0.06]],   // высокий остряк
      [[-0.94, 0], [-0.96, -0.8], [-0.7, -1], [0.5, -1.02], [0.62, -0.9], [0.9, -0.86], [0.96, -0.2], [0.94, 0], [0.4, 0.06], [-0.4, 0.06]],   // куб со сколом
      [[-1.04, 0], [-0.86, -0.7], [-0.5, -0.86], [0.48, -0.88], [0.84, -0.68], [1.04, 0], [0.45, 0.06], [-0.45, 0.06]],   // трапеция
      [[-0.98, 0], [-1, -0.5], [-0.66, -0.96], [-0.36, -0.8], [0.02, -1.1], [0.5, -0.84], [0.92, -0.56], [0.98, 0], [0.4, 0.06], [-0.4, 0.06]],   // два пика
    ],
    grotto: [
      [[-0.94, 0], [-1, -0.4], [-0.76, -0.76], [-0.32, -1], [0, -1.16], [0.34, -0.98], [0.78, -0.72], [1, -0.36], [0.94, 0], [0.45, 0.07], [-0.45, 0.07]],   // сталагмит
      [[-0.8, 0], [-0.96, -0.3], [-1.06, -0.62], [-0.8, -0.94], [-0.2, -1.04], [0.5, -0.98], [0.98, -0.7], [1, -0.34], [0.82, 0], [0.4, 0.07], [-0.4, 0.07]],   // нависший пузырь
      [[-0.96, 0], [-1, -0.42], [-0.66, -0.82], [-0.12, -1.12], [0.3, -1], [0.8, -0.68], [1.02, -0.3], [0.96, 0], [0.45, 0.07], [-0.45, 0.07]],   // капля
      [[-1.04, 0], [-1.06, -0.36], [-0.82, -0.7], [-0.3, -0.88], [0.3, -0.9], [0.82, -0.72], [1.06, -0.38], [1.04, 0], [0.6, 0.08], [0.3, 0.02], [-0.2, 0.08], [-0.6, 0.03]],   // широкий в натёках
      [[-1, 0], [-1.04, -0.44], [-0.8, -0.82], [-0.42, -0.92], [-0.18, -0.74], [0.1, -1], [0.6, -0.98], [0.96, -0.62], [1.02, -0.24], [1, 0], [0.45, 0.07], [-0.45, 0.07]],   // два пузыря
    ],
    abyss: [
      [[-0.94, 0], [-0.98, -0.44], [-0.62, -0.78], [-0.28, -0.7], [0.06, -1.16], [0.4, -0.82], [0.8, -0.66], [0.98, -0.3], [0.94, 0], [0.4, 0.06], [-0.4, 0.06]],   // осколок-пик
      [[-0.98, 0], [-1, -0.7], [-0.7, -1.02], [-0.4, -0.66], [-0.1, -0.7], [0.36, -1.06], [0.7, -0.8], [0.98, -0.36], [0.96, 0], [0.4, 0.06], [-0.4, 0.06]],   // расколотая пара
      [[-1, 0], [-1.02, -0.6], [-0.74, -0.84], [-0.5, -0.76], [-0.2, -0.96], [0.2, -0.86], [0.56, -0.98], [0.9, -0.7], [1, 0], [0.4, 0.06], [-0.4, 0.06]],   // зубчатая глыба
      [[-1.02, 0], [-0.7, -0.6], [-0.2, -1.12], [0.1, -1.08], [0.62, -0.6], [1, 0], [0.4, 0.06], [-0.4, 0.06]],   // конус
      [[-0.98, 0], [-1, -0.56], [-0.8, -0.9], [-0.56, -0.7], [-0.3, -1], [-0.02, -0.76], [0.28, -1.04], [0.56, -0.76], [0.86, -0.88], [1, -0.44], [0.98, 0], [0.4, 0.06], [-0.4, 0.06]],   // корона из осколков
    ],
  };
  const NSHAPE = 5;
  const MODE = { roots: 'soft', grotto: 'soft', clay: 'semi', stone: 'semi', granite: 'ang', abyss: 'ang' };
  // скруглить углы, оставив стороны прямыми: на каждой вершине - две точки на сторонах (доля k), потом гладкая кривая
  const chamfer = (pts, k) => { const out = []; for (let i = 0; i < pts.length; i++) { const o = pts[(i - 1 + pts.length) % pts.length], p = pts[i], q = pts[(i + 1) % pts.length]; out.push([p[0] + (o[0] - p[0]) * k, p[1] + (o[1] - p[1]) * k], p, [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]); } return out; };
  function silOf(shape, hard, r, W = W0, H = H0, theme = CUR.theme) {
    const set = SH3[theme] || SH3.stone, b = set[shape % set.length];
    const pts = b.map(([x, y]) => [x * W * (1 - r() * 0.05), y * H * (1 + (y < -0.3 ? (r() - 0.5) * 0.12 : 0))]);
    const mode = hard ? 'ang' : MODE[theme] || 'semi';
    if (mode === 'soft') return smooth(pts, 5);
    if (mode === 'semi') return smooth(chamfer(pts, 0.26), 2);
    // угловатая (гранит, обсидиан, твёрдая порода): прямые грани, мелкие фаски, сколы на верхних сторонах
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length]; out.push([p[0], p[1] * (hard ? 1.08 : 1)]);
      if (p[1] < -0.2 * H && q[1] < -0.2 * H && r() < 0.6) { const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = q[1] - p[1], ny = p[0] - q[0], L = Math.hypot(nx, ny) || 1, k = (r() - 0.3) * 6; out.push([mx - (nx / L) * k, (my - (ny / L) * k) * (hard ? 1.08 : 1)]); }
    }
    return dens(out, 7);   // точки по сторонам - для трещин, сколов и мха (они ищут ближайшие точки силуэта)
  }

  /* --- детали тем глубины: { back - за камнем, under - до контура, over - после контура } --- */
  const MOSS = ['#92933d', '#a9aa4c', '#6e6e31', '#5b532e'];
  function mossOn(c) {
    let m = '', sh = '', hi = '';
    const poly = clipPoly(c.sil, U(c, [[-1.5, -1.2], [-0.6, -1.5], [0.12, -1.5], [0.04, -0.72], [-0.38, -0.62], [-0.95, -0.72], [-1.5, -0.9]], 0.03)); if (poly.length < 3) return '';
    m += P(poly) + ' '; sh += P(poly.map(([x, y]) => [x, y + 4])) + ' ';
    const sg = area(poly) > 0 ? 1 : -1, ell = (x, y, rx, ry) => P(Array.from({ length: 10 }, (_, k) => [x + Math.cos((sg * k * Math.PI) / 5) * rx, y + Math.sin((sg * k * Math.PI) / 5) * ry])) + ' ';   // обход как у пятна: иначе дыры
    for (const p of U(c, [[0, -0.7], [-0.3, -0.62], [-0.6, -0.66], [-0.86, -0.74]], 0.02)) { if (!c.inside([p[0], p[1] + 4])) continue; const rx = 6 + c.r() * 3, ry = 5 + c.r() * 3; m += ell(p[0], p[1], rx, ry); sh += ell(p[0], p[1] + 4, rx, ry); }
    for (const p of U(c, [[-0.5, -0.86], [-0.15, -0.9]], 0.04)) { const rx = 7 + c.r() * 3; if (c.inside([p[0] - rx, p[1] - 2]) && c.inside([p[0] + rx, p[1] - 2])) hi += ell(p[0], p[1], rx, 2.6); }   // блик - только на камне (на низком камне не висит над ним)
    const rp = clipPoly(c.sil, U(c, [[0.5, -0.86], [0.7, -0.92], [0.86, -0.78], [0.8, -0.6], [0.6, -0.56], [0.46, -0.68]], 0.03));
    let g = el(sh, `fill="${MOSS[3]}"`) + el(m, `fill="${MOSS[0]}"`) + el(hi, `fill="${MOSS[1]}"`);
    if (rp.length > 2) g += `<path d="${P(rp.map(([x, y]) => [x, y + 3]))}" fill="${MOSS[3]}"/><path d="${P(rp)}" fill="${MOSS[2]}"/>`;
    return g;
  }
  function grassAt(c) {
    let d = '';
    for (const [fx, n] of [[-0.88, 3], [0.74, 2 + (c.shape % 2)]]) {
      const bx = c.ox + fx * c.W, by = c.oy + 3;
      for (let k = 0; k < n; k++) { const x0 = bx + (k - (n - 1) / 2) * 6, len = 13 + c.r() * 7, lean = (k - (n - 1) / 2) * 4 + (c.r() - 0.5) * 3, tx = x0 + lean, ty = by - len; d += `M${f1(x0 - 3)} ${f1(by)} Q${f1(x0 - 2.5 + lean * 0.3)} ${f1(by - len * 0.55)} ${f1(tx)} ${f1(ty)} Q${f1(x0 + 1.5 + lean * 0.4)} ${f1(by - len * 0.5)} ${f1(x0 + 3)} ${f1(by)} Z `; }
    }
    return `<path d="${d}" fill="#8f9a3a" stroke="${c.C.ink}" stroke-width="3.2" stroke-linejoin="round" paint-order="stroke"/>`;
  }
  function themeDeco(c) {
    const { C, r, W, H } = c, ox = c.ox || 0, oy = c.oy || 0; let back = '', under = '', over = '';
    const T = c.theme;
    if (T === 'roots') {
      if (c.type !== 'frost_stone') under += mossOn(c);
      if (GRASS && !c.wall) over += grassAt(c);
    } else if (T === 'clay') {
      under += el(cl(c, [[-1.5, -0.38], [1.5, -0.47], [1.5, -0.33], [-1.5, -0.24]], 0.02), `fill="#e8a060" fill-opacity=".45"`);
      under += el(cl(c, [[-1.5, -0.68], [1.5, -0.75], [1.5, -0.65], [-1.5, -0.58]], 0.02) + ' ' + cl(c, [[-1.5, -0.16], [1.5, -0.2], [1.5, -0.12], [-1.5, -0.08]], 0.02), `fill="#4a200e" fill-opacity=".32"`);
      let pb = ''; for (let k = 0; k < 2; k++) { const px = ox + (-0.55 + k * 0.75 + (r() - 0.5) * 0.2) * W, py = oy - (0.3 + r() * 0.3) * H; if (c.inside([px, py])) pb += dot(px, py, 3.2 + r() * 1.5); }
      under += el(pb, `fill="${C.fresh}" stroke="${C.ink}" stroke-width="1.8"`);
      under += el(PL(U(c, [[-0.5, -0.86], [-0.42, -0.78], [-0.48, -0.7]], 0.03)) + ' ' + PL(U(c, [[-0.42, -0.78], [-0.32, -0.76]], 0.02)), `stroke="${C.d3}" stroke-width="1.8" fill="none" stroke-linecap="round"`);
    } else if (T === 'stone') {
      const sx = ox + (c.shape % 2 ? -0.84 : 0.84) * W, sy = oy - 3, pb = smooth([[sx - 12, sy + 2], [sx - 11, sy - 7], [sx - 2, sy - 12], [sx + 9, sy - 8], [sx + 12, sy + 2]], 3);
      back += `<path d="${P(pb)}" fill="${C.d1}" stroke="${C.ink}" stroke-width="3.4" stroke-linejoin="round"/><path d="M${f1(sx - 7)} ${f1(sy - 7)} q5 -4 10 -1" stroke="${C.l1}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      let li = '', ld = ''; for (let k = 0; k < 3; k++) { const px = ox + (-0.55 + r() * 0.95) * W, py = oy - (0.5 + r() * 0.32) * H; if (!c.inside([px, py])) continue; li += blob(px, py, 4 + r() * 3, 3 + r() * 2, r, 6, 0.3) + ' '; ld += dot(px + 1, py + 0.5, 1.1); }
      under += el(li, `fill="${mix(C.l, '#c8cc8e', 0.55)}"`) + el(ld, `fill="${mix(C.d, '#6a7040', 0.4)}"`);
      under += el(PL(U(c, [[-0.46, -0.66], [-0.36, -0.58]], 0.02)) + ' ' + PL(U(c, [[-0.38, -0.7], [-0.28, -0.62]], 0.02)) + ' ' + PL(U(c, [[-0.3, -0.74], [-0.2, -0.66]], 0.02)), `stroke="${C.d1}" stroke-width="2" fill="none" stroke-linecap="round"`);
    } else if (T === 'granite') {
      let dk = '', lt = ''; for (let k = 0; k < 9; k++) { const px = ox + (r() - 0.5) * 1.6 * W, py = oy - (0.12 + r() * 0.72) * H; if (!c.inside([px, py])) continue; if (k % 3) dk += dot(px, py, 1.2 + r() * 1.1); else lt += dot(px, py, 1.3 + r()); }
      under += el(dk, `fill="${C.d3}"`) + el(lt, `fill="${mix(C.rim, '#f4dce8', 0.35)}"`);
      const qx = ox + (c.shape % 2 ? 0.28 : -0.34) * W, qy = oy - 0.42 * H;
      under += `<path d="${P([[qx - 6, qy + 4], [qx - 7, qy - 5], [qx - 2, qy - 12], [qx + 5, qy - 10], [qx + 7, qy], [qx + 2, qy + 5]])}" fill="#e8e6fa" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="${P([[qx - 7, qy - 5], [qx - 2, qy - 12], [qx + 1, qy - 4]])}" fill="#ffffff"/>`;
      over += twinkle(qx + 9, qy - 14, 0.75, '#ffffff');
    } else if (T === 'grotto') {
      // сырость: потёки и капли; светогрибы со свечением (без фильтров: полупрозрачный круг), споры
      let st = ''; for (let k = 0; k < 2; k++) { const x0 = ox + (-0.42 + k * 0.5 + (r() - 0.5) * 0.12) * W, y0 = topAt(c.sil, x0) + 7; if (!c.inside([x0, y0 + 20])) continue; st += `M${f1(x0)} ${f1(y0)} q${f1(-2)} ${f1(10)} ${f1(1)} ${f1(18 + r() * 8)} `; }
      under += el(st, `stroke="${mix(C.rim, '#a8f0ff', 0.45)}" stroke-width="2.4" fill="none" stroke-linecap="round"`);
      const sh = [[ox - 0.66 * W, oy - 0.08 * H, 1.45], [ox + (c.shape % 2 ? -0.28 : 0.3) * W, topAt(c.sil, ox + (c.shape % 2 ? -0.28 : 0.3) * W) + 5, 1.15], [ox + 0.66 * W, oy - 0.05 * H, 0.95]];
      let halo = '', stem = '', cap = '', spot = '', spore = '';
      for (const [x, y, k] of c.wall ? [sh[0], sh[2]] : sh) {   // на скале - без гриба на макушке (она и так под табличкой ряда выше)
        halo += dot(x, y - 9 * k, 15 * k);
        stem += `M${f1(x - 2.4 * k)} ${f1(y)} L${f1(x - 1.6 * k)} ${f1(y - 9 * k)} L${f1(x + 1.6 * k)} ${f1(y - 9 * k)} L${f1(x + 2.4 * k)} ${f1(y)} Z `;
        cap += `M${f1(x - 8.5 * k)} ${f1(y - 8 * k)} Q${f1(x)} ${f1(y - 20 * k)} ${f1(x + 8.5 * k)} ${f1(y - 8 * k)} Q${f1(x)} ${f1(y - 5 * k)} ${f1(x - 8.5 * k)} ${f1(y - 8 * k)} Z `;
        spot += dot(x - 2.6 * k, y - 12 * k, 1.3 * k) + dot(x + 3 * k, y - 11 * k, 1 * k);
        for (let q = 0; q < 2; q++) { const sy = y - (20 + r() * 16) * k, sx = x + (r() - 0.5) * 22 * k; if (sy > oy - 1.2 * H) spore += dot(sx, sy, 1 + r() * 0.8); }   // споры не выше камня (над ним - табличка ряда выше)
      }
      over += `<path d="${halo}" fill="#5ff0c8" fill-opacity=".16"/><path d="${stem}" fill="#d6f2ea" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/><path d="${cap}" fill="#5ff0c8" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="${spot}" fill="#eafff8"/><path d="${spore}" fill="#a8fff0" fill-opacity=".85"/>`;
    } else if (T === 'abyss') {
      under += el(cl(c, [[-0.66, -0.9], [-0.56, -0.93], [-0.2, -0.56], [-0.3, -0.53]], 0.02) + ' ' + cl(c, [[-0.36, -0.95], [-0.3, -0.97], [-0.04, -0.7], [-0.1, -0.68]], 0.02), `fill="${C.rim}"`);
      const lv = walk([ox + (c.shape % 2 ? 0.5 : -0.55) * W, oy - 0.1 * H], c.shape % 2 ? -2.2 : -0.95, 0.75 * W, c.inside, r, 7);
      if (lv.length > 2) { const d = PL(lv) + ' ' + PL(walk(lv[Math.floor(lv.length / 2)], -Math.PI / 2, 0.22 * H, c.inside, r, 5)); under += `<path d="${d}" stroke="#ff4a10" stroke-width="8" stroke-opacity=".3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#ff7a1a" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#ffe066" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }
      let em = ''; if (!c.wall) for (let k = 0; k < 3; k++) em += dot(ox + (r() - 0.5) * 1.4 * W, oy - (1.05 + r() * 0.3) * H, 1.1 + r() * 0.9);
      if (em) over += `<path d="${em}" fill="#ffb23a"/>`;
    }
    return { back, under, over };
  }
  // особенности породы (поверх темы): иней и сосулька, поры и ракушка, пласты песчаника, кварц твёрдой
  function typeDeco(c) {
    const { C, r, W, H } = c, ox = c.ox || 0, oy = c.oy || 0; let under = '', over = '';
    if (c.type === 'frost_stone') {
      const sp = clipPoly(c.sil, U(c, [[-1.5, -1.5], [1.5, -1.5], [1.5, -0.74], [0.45, -0.62], [-0.35, -0.7], [-1.5, -0.58]]));
      if (sp.length > 2) { let dr = ''; for (const p of U(c, [[0.3, -0.64], [-0.05, -0.66], [-0.6, -0.64]], 0.02)) if (c.inside(p)) dr += dot(p[0], p[1] + 2, 4 + r() * 2); under += `<path d="${P(sp.map(([x, y]) => [x, y + 4])) + ' ' + dr}" fill="#a9cce4"/><path d="${P(sp) + ' ' + dr.replace(/M([\d.-]+) ([\d.-]+)/g, (m0, a, b) => `M${a} ${f1(+b - 3)}`)}" fill="#eef7fc"/>`; }
      over += `<path d="M${f1(ox + 0.42 * W)} ${f1(oy - 3)} l3 10 l3 -10 Z M${f1(ox + 0.56 * W)} ${f1(oy - 2)} l2 7 l2 -7 Z" fill="#dff2ff" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>` + twinkle(ox + 0.36 * W, oy - 0.82 * H, 0.7);
    } else if (c.type === 'limestone') {
      let pr = ''; for (let k = 0; k < 6; k++) { const px = ox + (r() - 0.5) * 1.3 * W, py = oy - (0.15 + r() * 0.6) * H; if (c.inside([px, py])) pr += dot(px, py, 1.2 + r() * 1.3); }
      under += el(pr, `fill="${C.d3}" fill-opacity=".7"`);
      under += el(PL(U(c, [[-0.8, -0.3], [0, -0.33], [0.7, -0.29]], 0.02)) + ' ' + PL(U(c, [[-0.75, -0.6], [0.1, -0.63], [0.6, -0.58]], 0.02)), `stroke="${C.d1}" stroke-width="2" fill="none" stroke-dasharray="9 5"`);
      const fx = ox + (c.shape % 2 ? 0.34 : -0.36) * W, fy = oy - 0.44 * H, k = 8;
      under += `<path d="M${f1(fx - k)} ${f1(fy)} a${k} ${k} 0 1 1 ${2 * k} 0 a${k * 0.75} ${k * 0.75} 0 1 1 ${-1.5 * k} 0 a${k * 0.5} ${k * 0.5} 0 1 1 ${k} 0" stroke="${C.d3}" stroke-width="2" fill="${C.l2}"/>`;
    } else if (c.type === 'sandstone') {
      let lt = '', dk = '';
      for (let k = 0; k < 4; k++) {
        const yy = oy - (0.14 + k * 0.19) * H; let xl = 1e9, xr = -1e9; for (const p of c.sil) if (Math.abs(p[1] - yy) < 6) { xl = Math.min(xl, p[0]); xr = Math.max(xr, p[0]); }
        if (xr - xl < 30) continue; xl += 7; xr -= 7; const hw = (xr - xl) / 4; const d = `M${f1(xl)} ${f1(yy)} q${f1(hw)} ${f1(-6)} ${f1(hw * 2)} 0 t${f1(hw * 2)} 0 `;
        if (k % 2) dk += d; else lt += d;
      }
      under += el(lt, `stroke="${C.rim}" stroke-width="4" fill="none" stroke-linecap="round"`) + el(dk, `stroke="${C.d1}" stroke-width="4.6" fill="none" stroke-linecap="round"`);
      let pit = ''; for (let k = 0; k < 2; k++) { const px = ox + (r() - 0.5) * W, py = oy - (0.3 + r() * 0.35) * H; if (c.inside([px, py])) pit += dot(px, py, 4).replace(/a([\d.]+) ([\d.]+)/g, 'a4 3'); }
      under += el(pit, `fill="${C.d3}" stroke="${C.ink}" stroke-width="1.6"`);
    }
    if (c.hard) {
      // твёрдая порода: белая кварцевая жила и гнездо кварцевых кристаллов на лице камня (общие корзины - 6 узлов)
      const v = U(c, [[-0.3, -0.24], [-0.14, -0.4], [0.12, -0.46], [0.36, -0.6]], 0.03), d = PL(v);
      under += `<path d="${d}" stroke="${C.ink}" stroke-width="6.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#f4f0ff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      const Q = bins(['#e6e4fa', '#ffffff', '#9a96cc']), sx = ox + (c.shape % 2 ? -0.36 : -0.3) * W, sy = oy - 0.2 * H, k = c.shape % 2 ? -1 : 1;   // слева: справа снизу - табличка уровня
      prism3(Q, sx - 10 * k, sy, 22, 12, -24 * k); prism3(Q, sx + 10 * k, sy + 1, 20, 11, 26 * k); prism3(Q, sx, sy + 2, 32, 13, -4 * k);
      over += Q.out(C.ink, 2.6);
    }
    return { under, over };
  }

  /* --- тело камня: валун (все породы) или базальтовые столбы / тёсаные блоки --- */
  function boulderBody(c) {
    c.sil = silOf(c.shape, c.hard, c.r); c.inside = (p) => inPoly(p, c.sil); c.W = W0; c.H = H0;
    const th = themeDeco(c), ty = typeDeco(c);
    const svg = th.back + facets2(c) + th.under + ty.under + outlineOf(c.sil, c.C, c.hard ? 6.2 : 5.2) + ty.over + th.over;
    return svg;
  }
  function basaltBody(c) {
    const { C, r } = c, n = c.hard ? 4 : 3, W = W0, H = H0, cw = (2 * W) / n * 0.98, mid = (n - 1) / 2, cols = [];
    for (let k = 0; k < n; k++) { const cx = -W + cw * (k + 0.5), ch = H * (0.8 + r() * 0.38 + (c.shape % 3) * 0.04) * (1 - Math.abs(k - mid) * 0.13), yb = -Math.abs(k - mid) * 3, hw = cw * 0.5, tyy = yb - ch, e = hw * 0.42; cols.push({ k, cx, yb, hw, ty: tyy, e, ch, poly: [[cx - hw, yb], [cx - hw, tyy], [cx - hw * 0.5, tyy - e], [cx + hw * 0.5, tyy - e], [cx + hw, tyy], [cx + hw, yb]] }); }
    if (c.shape >= 3) cols.reverse();
    const order = cols.slice().sort((a, b) => Math.abs(b.k - mid) - Math.abs(a.k - mid));
    let g = '';
    for (const o of order) {
      const { cx, yb, hw, ty: t, e, poly } = o;
      g += `<path d="${P(poly)}" fill="${C.m}"/>`;
      g += `<path d="${P([[cx - hw, yb], [cx - hw, t], [cx - hw * 0.45, t + e * 0.6], [cx - hw * 0.45, yb]])}" fill="${C.ml}"/><path d="${P([[cx + hw * 0.38, yb], [cx + hw * 0.38, t + e * 0.6], [cx + hw, t], [cx + hw, yb]])}" fill="${C.d1}"/>`;
      g += `<path d="${P([[cx - hw, yb - 9], [cx + hw, yb - 9], [cx + hw, yb], [cx - hw, yb]])}" fill="${C.d2}"/>`;
      g += `<path d="${P([[cx - hw, t], [cx - hw * 0.5, t - e], [cx + hw * 0.5, t - e], [cx + hw, t], [cx + hw * 0.5, t + e * 0.7], [cx - hw * 0.5, t + e * 0.7]])}" fill="${C.l2}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
      g += `<path d="M${f1(cx - hw * 0.6)} ${f1(t + o.ch * 0.45)} h${f1(hw * 0.5)} M${f1(cx + hw * 0.1)} ${f1(t + o.ch * 0.7)} h${f1(hw * 0.4)}" stroke="${C.d3}" stroke-width="2.2" stroke-linecap="round"/>`;
      g += outlineOf(poly, C, 5);
    }
    const main = order[order.length - 1]; c.sil = dens(main.poly); c.W = W; c.H = H; c.inside = (p) => cols.some((o) => inPoly(p, o.poly));
    const th = themeDeco(c), ty = typeDeco(c);
    // детали темы - на средний (передний) столб; чтобы не закрыть контур, его рисуем ещё раз поверх
    return th.back + g + th.under + ty.under + outlineOf(main.poly, C, 5) + ty.over + th.over;
  }
  function rubbleBody(c) {
    const { C, r } = c, W = W0, H = H0, specs = [[-0.95, 0, 1.05, 0.5], [0.08, 0, 0.9, 0.44], [-0.6, 0.48, 1.15, 0.5]], polys = [];
    if (c.hard) specs.push([-0.25, 0.96, 0.75, 0.36]);
    if (c.shape % 2) for (const s of specs) s[0] = -s[0] - s[2];
    let g = '';
    for (const [bx, by, bw, bh] of specs) {
      const x0 = bx * W, y1 = -by * H, ww = bw * W, hh = bh * H, tl = (r() - 0.5) * 4, ch = 5;
      const poly = [[x0 + ch, y1], [x0, y1 - ch], [x0, y1 - hh], [x0 + ch, y1 - hh - ch + tl * 0.3], [x0 + ww - ch, y1 - hh + tl], [x0 + ww, y1 - hh + ch + tl], [x0 + ww, y1 - ch], [x0 + ww - ch, y1]];
      polys.push(poly);
      g += `<path d="${P(poly)}" fill="${C.m}"/>` + el(D(clipPoly(poly, [[x0 - 5, y1 - hh - 9], [x0 + ww + 5, y1 - hh - 9], [x0 + ww + 5, y1 - hh + 9 + tl], [x0 - 5, y1 - hh + 9]])), `fill="${C.l2}"`)
        + el(D(clipPoly(poly, [[x0 + ww - 9, y1 - hh - 9], [x0 + ww + 5, y1 - hh - 9], [x0 + ww + 5, y1 + 5], [x0 + ww - 9, y1 + 5]])), `fill="${C.d1}"`)
        + el(D(clipPoly(poly, [[x0 - 5, y1 - 7], [x0 + ww + 5, y1 - 7], [x0 + ww + 5, y1 + 5], [x0 - 5, y1 + 5]])), `fill="${C.d2}"`);
      if (r() < 0.7) g += `<path d="M${f1(x0 + ww * 0.3)} ${f1(y1 - hh * 0.7)} l5 5 l-2 7" stroke="${C.d3}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      g += outlineOf(poly, C, 4.8);
    }
    const top = polys[2]; c.sil = dens(top); c.W = W; c.H = H; c.inside = (p) => polys.some((pl) => inPoly(p, pl));
    const tx = (top[2][0] + top[4][0]) / 2, tyy = top[2][1] + 0.5 * 0.5 * H;
    g += `<path d="M${f1(tx - 7)} ${f1(tyy + 6)} l7 -11 l7 11 M${f1(tx)} ${f1(tyy - 5)} v16" stroke="${C.d3}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    const th = themeDeco({ ...c, oy: 0 }), ty = typeDeco(c);
    return th.back + g + th.under + ty.under + outlineOf(top, C, 4.8) + ty.over + th.over;
  }

  /* --- повреждения 1…4 (по форме тела): трещины → глубокие трещины и скол → раскол с осколками → крошится --- */
  function damage(c) {
    const { C, r, sil, W, H } = c, inside = c.inside, abyss = c.theme === 'abyss', grot = c.theme === 'grotto';
    const lip = abyss ? '#ff8a3a' : grot ? mix(C.fresh, '#5ff0c8', 0.35) : C.fresh, deep = abyss ? '#3a0c06' : C.hole;
    const inward = (p, k) => { const cx = 0, cy = -0.45 * H, dx = cx - p[0], dy = cy - p[1], L = Math.hypot(dx, dy) || 1; return [p[0] + (dx / L) * k, p[1] + (dy / L) * k]; };
    const xs = sil.map((p) => p[0]), xm = (Math.min(...xs) + Math.max(...xs)) / 2, xh = (Math.max(...xs) - Math.min(...xs)) / 2, ax = xm + (c.shape % 2 ? -0.12 : 0.14) * xh, A0 = [ax, topAt(sil, ax)], A = inward(A0, 6);   // от верхней кромки своего силуэта (у столбов - переднего)
    const c1 = walk(A, Math.PI / 2 + (c.shape % 2 ? -0.22 : 0.22), 0.9 * H, inside, r, 6.5), n1 = c1.length;
    const ly = -0.5 * H; let lp = null; for (const p of sil) if (p[0] < 0 && (!lp || Math.abs(p[1] - ly) < Math.abs(lp[1] - ly))) lp = p;
    const L0 = inward(lp || [-W, ly], 3), c2 = walk(L0, 0.2, 0.55 * W, inside, r, 6.5);
    const pre = (pts, t) => pts.slice(0, Math.max(2, Math.round(pts.length * t)));
    const br = (pts, t, dir, len) => { const p = pts[Math.min(pts.length - 1, Math.max(0, Math.round(pts.length * t)))]; return p ? walk(p, dir, len, inside, r, 5) : []; };
    const b1 = br(c1, 0.25, Math.PI / 2 - 1.0 * (c.shape % 2 ? -1 : 1), 0.18 * H), b2 = br(c1, 0.55, Math.PI / 2 + 0.9 * (c.shape % 2 ? -1 : 1), 0.2 * H), b3 = br(c2, 0.6, 1.1, 0.16 * H);
    const lines = (arr, w) => { const d = arr.filter((a) => a.length > 1).map(PL).join(' '); const sh = arr.filter((a) => a.length > 1).map((a) => PL(a.map(([x, y]) => [x + w * 0.42, y + w * 0.34]))).join(' '); return d ? `<path d="${sh}" stroke="${lip}" stroke-width="${f1(w * 0.55)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${abyss ? '#c8380e' : deep}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''; };
    // раскол: клин вдоль c1 (широкий сверху, сходит на нет), внутри - тёмная глубина и светлая стенка излома
    const ei = sil.reduce((bi, p, i) => (Math.hypot(p[0] - A0[0], p[1] - A0[1]) < Math.hypot(sil[bi][0] - A0[0], sil[bi][1] - A0[1]) ? i : bi), 0), eL = sil[(ei - 1 + sil.length) % sil.length], eR = sil[(ei + 1) % sil.length];
    const wedge = (pts, wmax) => { const Lf = [], Rt = [], In = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], tx = q[0] - o[0], tyy = q[1] - o[1], L = Math.hypot(tx, tyy) || 1, nx = -tyy / L, ny = tx / L, t = i / Math.max(1, pts.length - 1), w = wmax * Math.pow(1 - t, 0.8) + 0.8, jg = (r() - 0.5) * 2.2; Lf.push([p[0] - nx * (w * 0.6 + jg), p[1] - ny * (w * 0.6 + jg)]); Rt.push([p[0] + nx * w * 0.4, p[1] + ny * w * 0.4]); In.push([p[0] - nx * w * 0.15, p[1] - ny * w * 0.15]); } const lo = eL[0] < eR[0] ? eL : eR, hi2 = lo === eL ? eR : eL; return { poly: [hi2, ...Lf, ...Rt.reverse(), lo], face: [hi2, ...Lf, ...In.reverse()] }; };
    const chips = (pts) => { let d = ''; for (const [x, y, k] of pts) d += `M${f1(x - k)} ${f1(y)} L${f1(x - k * 0.5)} ${f1(y - k * 0.9)} L${f1(x + k * 0.7)} ${f1(y - k * 0.7)} L${f1(x + k)} ${f1(y)} Z `; return `<path d="${d}" fill="${C.l1}" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/>`; };
    // скол на кромке справа сверху
    const bx = (c.shape % 2 ? 0.5 : 0.56) * W; let bi = 0; sil.forEach((p, i) => { if (Math.abs(p[0] - bx) < Math.abs(sil[bi][0] - bx) && p[1] < -0.3 * H) bi = i; });
    const B0 = sil[(bi - 2 + sil.length) % sil.length], B1 = sil[(bi + 2) % sil.length], Bi = inward(sil[bi], 10);
    const notch = `<path d="${P([B0, Bi, B1])}" fill="${deep}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="${P([B0, Bi, [(B0[0] + Bi[0]) / 2 + 2, (B0[1] + Bi[1]) / 2 + 1]])}" fill="${lip}"/>`;
    const s1 = lines([pre(c1, 0.42), pre(b1, 0.8), pre(c2, 0.3)], 4.4);   // 25.10: толще - видно в сцене (камень там ~0.7 от галереи)
    const s2 = lines([pre(c1, 0.66), b1, pre(b2, 0.8), pre(c2, 0.62)], 4.8) + notch + chips([[-W * 0.8, 3, 4]]);
    const wd = wedge(pre(c1, 0.92), 13), wd4 = wedge(c1, 19);
    const core = abyss ? `<path d="${PL(pre(c1, 0.8))}" stroke="#ffd23a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    const split = (w) => `<path d="${P(w.poly)}" fill="${abyss ? '#c2380e' : deep}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="${P(w.face)}" fill="${abyss ? '#ff7a1a' : mix(deep, C.d1, 0.45)}"/>` + core;
    const s3 = lines([b1, b2, c2, b3], 4.8) + split(wd) + notch + chips([[-W * 0.74, 3, 4.5], [W * 0.2, 5, 3], [-W * 0.9, 1, 3]]);
    // крошится: кусок справа сверху отвалился (видна свежая порода излома), глыба лежит у подножия, пыль
    const chunk = clipPoly(sil, [[0.38 * W, -1.6 * H], [1.6 * W, -1.6 * H], [1.6 * W, -0.5 * H], [0.78 * W, -0.42 * H], [0.5 * W, -0.62 * H]].map(([x, y]) => [x + (r() - 0.5) * 4, y]));
    let s4 = lines([b1, b2, c2, b3], 5) + split(wd4);
    if (chunk.length > 2) { const ccx = chunk.reduce((a, p) => a + p[0], 0) / chunk.length, ccy = chunk.reduce((a, p) => a + p[1], 0) / chunk.length, face = chunk.map(([x, y]) => [ccx + (x - ccx) * 0.62 - 2, ccy + (y - ccy) * 0.62 + 2]);
      // отвалился кусок: тёмная ниша на месте скола и светлая свежая порода излома в ней
      s4 += `<path d="${P(chunk)}" fill="${deep}" stroke="${C.ink}" stroke-width="3.4" stroke-linejoin="round"/><path d="${P(face)}" fill="${abyss ? '#ff7a1a' : mix(lip, C.d1, 0.35)}"/><path d="${PL(U({ ...c, ox: 0, oy: 0 }, [[0.62, -0.7], [0.8, -0.64], [0.9, -0.7]], 0.02))}" stroke="${C.d3}" stroke-width="2" fill="none" stroke-linecap="round"/>`; }
    const fx = -W * 0.7, fy = 2, fb = smooth([[fx - 14, fy + 2], [fx - 13, fy - 9], [fx - 2, fy - 15], [fx + 11, fy - 10], [fx + 14, fy + 2]], 3);
    s4 += `<path d="${P(fb)}" fill="${C.l1}" stroke="${C.ink}" stroke-width="3.2" stroke-linejoin="round"/><path d="${P([[fx - 13, fy - 9], [fx - 2, fy - 15], [fx + 2, fy - 6], [fx - 6, fy - 2]])}" fill="${lip}"/>` + chips([[W * 0.72, 4, 4.5], [-W * 0.92, 2, 3.5], [-W * 0.38, 5, 3], [W * 0.2, 6, 3]]);
    return { st: [s1, s2, s3, s4], a: A };
  }

  /* --- символы --- */
  const FR = [-100, -190, 200, 222];   // рамка символа камня / руды (в долях s = 1)
  const symOf = (id, fr, body) => `<symbol id="${id}" viewBox="${fr.join(' ')}" overflow="visible">${body}</symbol>`;
  const useOf = (id, x, y, s, fr = FR) => `<use href="#${id}" x="${f1(x + fr[0] * s)}" y="${f1(y + fr[1] * s)}" width="${f1(fr[2] * s)}" height="${f1(fr[3] * s)}"/>`;
  // 26.10: размер по уровню камня - мягче и с потолком: камень не выходит за клетку и не лезет на соседние таблички
  const fit = (s) => Math.min(1.06, 0.96 + Math.max(0, (+s || 1) - 1) * 0.35);
  const TYPES = new Set(['stone', 'basalt', 'frost_stone', 'limestone', 'sandstone', 'rubble']);
  function bodyId(theme, type, hard, shape, pal) {
    const grass = GRASS && theme === 'roots' ? 1 : 0, id = `mrb-${theme}-${type}-${hard ? 1 : 0}-${shape}-${hs(pal.join(',')).toString(36)}-${grass}`;
    if (SYM.has(id)) return id;
    const c = { theme, type, hard, shape, C: tones2(pal, type), r: rngOf(hs(`${theme}|${type}|${hard}|${shape}`)), ox: 0, oy: 0 };
    const shadow = `<ellipse cx="2" cy="3" rx="${f1(W0 * 1.08)}" ry="10" fill="#000" fill-opacity=".32"/>`;
    const body = type === 'basalt' ? basaltBody(c) : type === 'rubble' ? rubbleBody(c) : boulderBody(c);
    SYM.set(id, symOf(id, FR, shadow + body));
    const dm = damage(c);
    DMG.set(id, dm.st.map((s, k) => symOf(`${id}-d${k + 1}`, FR, s)));
    META.set(id, { C: c.C, a: dm.a });
    return id;
  }
  /** Камень клетки (mine2, рисунок зрителя): <use> общего символа; форма - из r() клетки (5 силуэтов своего пласта), тема - begin(). */
  function rock2(cell, kind, x, y, s, pal, r) {
    const t0 = cell && (cell.t === 'ore' || cell.t === 'rare') ? (cell.b || 'stone') : (cell && cell.r) || 'stone', type = TYPES.has(t0) ? t0 : 'stone';
    const hard = !!(cell && cell.t === 'hard'), shape = Math.floor(r() * NSHAPE);
    return useOf(bodyId(CUR.theme, type, hard, shape, pal), x, y, fit(s));
  }
  /* --- руда и самоцветы (25.10, art/mine-rocks3): крупные плоские фигуры с толстым контуром, чтобы читались при ~60 px.
     Все детали одного цвета - одним <path> (корзины): тело, светлая и тёмная грани, блики, контур. Руда - жила-лента через
     камень и самородки на ней; самоцветы - гранёные кристаллы / октаэдры / огранка «бриллиант» / кабошоны. Координаты - в
     системе камня (низ - y = 0), всё в пределах |x| ≤ 46, y -84…0. --- */
  function bins(c) {
    const B = { glow: '', band: '', body: '', lite: '', mid: '', dark: '', hi: '', glint: '', line: '', edge: '' };
    B.out = (ink = INK, w = 3) => {
      let g = '';
      if (B.glow) g += `<path d="${B.glow}" fill="${c[1]}" fill-opacity=".22"/>`;
      g += el(B.band, `fill="${mix(c[0], c[2], 0.22)}"`) + el(B.body, `fill="${c[0]}"`) + el(B.mid, `fill="${mix(c[0], c[2], 0.45)}"`) + el(B.lite, `fill="${mix(c[0], c[1], 0.55)}"`) + el(B.dark, `fill="${c[2]}"`) + el(B.hi, `fill="${c[1]}"`);
      g += el(B.line, `stroke="${c[2]}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"`);
      g += el(B.edge, `fill="none" stroke="${ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`) + el(B.glint, 'fill="#ffffff"');
      return g;
    };
    return B;
  }
  const star4 = (x, y, k) => `M${f1(x)} ${f1(y - k)} L${f1(x + k * 0.26)} ${f1(y - k * 0.26)} L${f1(x + k)} ${f1(y)} L${f1(x + k * 0.26)} ${f1(y + k * 0.26)} L${f1(x)} ${f1(y + k)} L${f1(x - k * 0.26)} ${f1(y + k * 0.26)} L${f1(x - k)} ${f1(y)} L${f1(x - k * 0.26)} ${f1(y - k * 0.26)} Z `;
  // самородок: неровный многоугольник, светлая грань сверху слева, тёмная справа снизу, точка-блик
  function nug3(B, x, y, k, r, n = 6) {
    const pts = []; for (let q = 0; q < n; q++) { const a = (q / n) * Math.PI * 2 + (r() - 0.5) * 0.5, rr = k * (0.8 + r() * 0.35); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.82]); }
    const C = [x + k * 0.08, y + k * 0.05], h = Math.round(n / 2), d = P(pts) + ' ';
    B.body += d; B.edge += d;
    B.hi += P([pts[h], pts[h + 1], pts[(h + 2) % n], C]) + ' ';
    B.dark += P([pts[0], pts[1], C]) + ' ';
    B.glint += dot(x - k * 0.32, y - k * 0.32, Math.max(1.4, k * 0.16));
  }
  // жила: волнистая лента через лицо камня (толще в середине), с ответвлением; светлая кромка поверху
  function band3(B, y0, wd, r, branch = true) {
    const top = [], bot = [], ctr = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6, x = -34 + t * 68, y = y0 + Math.sin(t * Math.PI * 1.6 + r() * 0.6) * 6 - t * 8, w = wd * (0.35 + Math.sin(t * Math.PI) * 0.75) * (0.85 + r() * 0.3); ctr.push([x, y]); top.push([x, y - w / 2]); bot.push([x, y + w / 2]); }
    let d = P([...top, ...bot.reverse()]) + ' ';
    if (branch) { const m = ctr[2], e = [m[0] + 10, m[1] - 18 - r() * 6]; d += P([[m[0] - 3, m[1]], [e[0] - 2, e[1]], [e[0] + 2, e[1] + 1], [m[0] + 6, m[1]]]) + ' '; }
    B.band += d; B.edge += d;
    B.line += PL(top.slice(1, 6).map(([x, y]) => [x, y + 2.2])) + ' ';
    return ctr;
  }
  // призма-кристалл: тело, светлая левая грань, ярчайший скос острия, тёмная правая грань, полоска блика
  function prism3(B, bx, by, len, wd, ang, tip = 0.3) {
    const a = (ang * Math.PI) / 180, hw = wd / 2, R = (pts) => pts.map(([px, py]) => rot(px, py, bx, by, a)), sh = by - len * (1 - tip);
    const body = R([[bx - hw, by], [bx - hw, sh], [bx, by - len], [bx + hw, sh], [bx + hw, by]]), d = P(body) + ' ';
    B.body += d; B.edge += d;
    B.lite += P(R([[bx - hw, by], [bx - hw, sh], [bx - hw * 0.1, sh - len * tip * 0.1], [bx - hw * 0.1, by]])) + ' ';
    B.hi += P(R([[bx - hw, sh], [bx, by - len], [bx - hw * 0.1, sh - len * tip * 0.1]])) + ' ';
    B.dark += P(R([[bx + hw * 0.42, by], [bx + hw * 0.42, sh + len * tip * 0.12], [bx, by - len], [bx + hw, sh], [bx + hw, by]])) + ' ';
    B.glint += P(R([[bx - hw * 0.72, by - len * 0.14], [bx - hw * 0.72, sh + 2], [bx - hw * 0.44, sh + 4], [bx - hw * 0.44, by - len * 0.14]])) + ' ';
  }
  // октаэдр (адамантит, сапфир): четыре грани разного тона
  function octa3(B, x, y, k) {
    const T = [x, y - k * 1.25], Bo = [x, y + k * 0.95], L = [x - k * 0.85, y - k * 0.1], Rr = [x + k * 0.85, y - k * 0.1], M = [x + k * 0.12, y + k * 0.02], d = P([T, Rr, Bo, L]) + ' ';
    B.body += d; B.edge += d + `M${f1(L[0])} ${f1(L[1])} L${f1(M[0])} ${f1(M[1])} L${f1(Rr[0])} ${f1(Rr[1])} `;
    B.hi += P([T, L, M]) + ' '; B.mid += P([L, M, Bo]) + ' '; B.dark += P([M, Rr, Bo]) + ' ';
    B.glint += star4(x - k * 0.35, y - k * 0.55, k * 0.32);
  }
  // огранка «бриллиант» сбоку: корона с площадкой, павильон до калетты
  function cut3(B, x, y, k) {
    const GL = [x - k, y], TL = [x - k * 0.55, y - k * 0.55], TR = [x + k * 0.55, y - k * 0.55], GR = [x + k, y], Cu = [x, y + k * 1.05], d = P([GL, TL, TR, GR, Cu]) + ' ';
    B.body += d; B.edge += d + `M${f1(GL[0])} ${f1(GL[1])} L${f1(GR[0])} ${f1(GR[1])} `;
    B.hi += P([TL, [x + k * 0.1, y - k * 0.55], [x - k * 0.2, y], GL]) + ' ';
    B.lite += P([[x - k * 0.2, y], [x - k * 0.5, y], Cu]) + ' ';
    B.dark += P([TR, GR, [x + k * 0.4, y]]) + ' ' + P([[x + k * 0.3, y], GR, Cu]) + ' ';
    B.glint += star4(x - k * 0.35, y - k * 0.75, k * 0.35);
  }
  // кабошон / капля (опал, янтарь)
  function cab3(B, x, y, rx, ry, drop) {
    const d = drop ? `M${f1(x)} ${f1(y - ry * 1.5)} Q${f1(x + rx * 1.15)} ${f1(y - ry * 0.2)} ${f1(x + rx * 0.9)} ${f1(y + ry * 0.45)} A${f1(rx * 0.92)} ${f1(ry * 0.8)} 0 0 1 ${f1(x - rx * 0.9)} ${f1(y + ry * 0.45)} Q${f1(x - rx * 1.15)} ${f1(y - ry * 0.2)} ${f1(x)} ${f1(y - ry * 1.5)} Z `
      : `M${f1(x - rx)} ${f1(y)} a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(rx * 2)} 0 a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-rx * 2)} 0 `;
    B.body += d; B.edge += d;
    B.dark += `M${f1(x - rx * 0.78)} ${f1(y + ry * 0.2)} Q${f1(x)} ${f1(y + ry * 0.75)} ${f1(x + rx * 0.78)} ${f1(y + ry * 0.2)} Q${f1(x + rx * 0.6)} ${f1(y + ry * 0.85)} ${f1(x)} ${f1(y + ry * 0.92)} Q${f1(x - rx * 0.6)} ${f1(y + ry * 0.85)} ${f1(x - rx * 0.78)} ${f1(y + ry * 0.2)} Z `;
    B.hi += `M${f1(x - rx * 0.62)} ${f1(y - ry * 0.25)} a${f1(rx * 0.3)} ${f1(ry * 0.24)} -30 1 0 ${f1(rx * 0.6)} 0 a${f1(rx * 0.3)} ${f1(ry * 0.24)} -30 1 0 ${f1(-rx * 0.6)} 0 `;
    B.glint += dot(x - rx * 0.5, y - ry * 0.45, Math.max(1.4, rx * 0.12));
  }
  const glowAt = (B, x, y, rx, ry) => { B.glow += `M${f1(x - rx)} ${f1(y)} a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(rx * 2)} 0 a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-rx * 2)} 0 `; };
  const PATINA = ['#3aa88a', '#8ae8c8', '#1a5a48'];
  /** Рисунок руды / самоцвета в системе камня (символ mro-). */
  function ore3(res, r, rare, gem) {
    const c = oc(res), B = bins(c);
    const along = (ctr, n) => Array.from({ length: n }, (_, k) => { const p = ctr[Math.min(ctr.length - 1, 1 + Math.round((k * (ctr.length - 3)) / Math.max(1, n - 1)))]; return [p[0] + (r() - 0.5) * 6, p[1] + (r() - 0.5) * 5]; });
    const metal = (n, k, kind) => { const ctr = band3(B, -30 - r() * 6, 13, r); for (const [x, y] of along(ctr, n)) nug3(B, x, y, k * (0.85 + r() * 0.3), r, kind === 'coal' ? 5 : 6); };
    let extra = '', top = '';
    switch (res) {
      case 'coal': metal(rare ? 4 : 3, 13, 'coal'); for (const [x, y] of [[-24, -52], [22, -16]]) B.glint += `M${f1(x)} ${f1(y)} l6 -5 l1.6 1.6 l-6 5 Z `; break;
      case 'iron': metal(rare ? 4 : 3, 12.5); break;
      case 'copper': { const C2 = bins(PATINA), ctr = band3(C2, -32 - r() * 4, 11, r); extra = C2.out(); for (const [x, y] of along(ctr, rare ? 4 : 3)) nug3(B, x, y, 12.5 * (0.85 + r() * 0.3), r); break; }
      case 'silver': case 'gold': metal(rare ? 4 : 3, res === 'gold' ? 13.5 : 12.5); B.glint += star4(30, -62, 6) + star4(-34, -20, 4.5) + (rare ? star4(-6, -66, 5) : ''); break;
      case 'crystal': glowAt(B, 0, -40, 40, 30); prism3(B, -16, -20, 36, 13, -24); prism3(B, 18, -20, 38, 13, 20); prism3(B, 2, -18, 50, 15, -4); B.glint += star4(26, -60, 5); break;
      case 'sulfur': for (const [x, y] of [[-24, -38], [4, -26], [24, -50], [-2, -58]]) for (let q = 0; q < 3; q++) { const px = x + (q - 1) * 7, py = y - (q % 2) * 6, k = 5.5 + r() * 2.5, d = dot(px, py, k); B.body += d; B.edge += d; B.hi += dot(px - k * 0.3, py - k * 0.3, k * 0.38); } B.line += `M-30 -66 q4 -8 0 -14 M14 -70 q-4 -7 0 -12 `; break;
      case 'peat': for (const [x, y] of [[-22, -30], [10, -44], [22, -20]]) { const d = blob(x, y, 13, 9, r, 7, 0.22); B.body += d; B.edge += d; B.hi += blob(x - 3, y - 3, 6, 3.4, r, 6, 0.2); B.line += `M${f1(x - 8)} ${f1(y + 1)} q8 -5 16 1 M${f1(x - 6)} ${f1(y + 5)} q6 -3 12 0 `; } break;
      case 'bone_dust': {
        let sh = '', kn = '';
        for (const [x, y, a, L] of [[-18, -32, 0.5, 13], [16, -50, -0.4, 11]]) { const p1 = rot(x - L, y, x, y, a), p2 = rot(x + L, y, x, y, a); sh += `M${f1(p1[0])} ${f1(p1[1])} L${f1(p2[0])} ${f1(p2[1])} `; for (const p of [p1, p2]) kn += dot(p[0], p[1] - 2.4, 4) + dot(p[0], p[1] + 2.4, 4); }
        const sx = 6, sy = -20, sk = `M${sx - 10} ${sy} a10 9 0 1 1 20 0 v5 h-20 Z `;
        extra = `<path d="${sh}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="${kn}${sk}" fill="${c[0]}" ${O(2.6)}/><path d="${sh}" stroke="${c[0]}" stroke-width="4.6" stroke-linecap="round"/><path d="${dot(sx - 4, sy - 1, 2.6)}${dot(sx + 4, sy - 1, 2.6)}" fill="${INK}"/>`;
        for (let q = 0; q < 5; q++) B.hi += dot((r() - 0.5) * 70, -4 - r() * 6, 1.8); break; }
      case 'salt': for (const [x, y, k] of [[-22, -34, 9], [6, -24, 8], [22, -48, 9.5], [-4, -54, 7]]) { const pts = [[x - k, y - k * 0.5], [x, y - k], [x + k, y - k * 0.5], [x + k, y + k * 0.6], [x, y + k], [x - k, y + k * 0.6]], d = P(pts) + ' '; B.body += d; B.edge += d; B.hi += P([pts[0], pts[1], pts[2], [x, y]]) + ' '; B.dark += P([[x, y], pts[2], pts[3], pts[4]]) + ' '; } B.glint += star4(30, -64, 5); break;
      case 'relic': { const px = -10, py = -38, k = 14, cd = dot(px, py, k); B.body += cd; B.edge += cd; B.line += dot(px, py, k * 0.62) + `M${px - 4} ${py + 4} l4 -8 l4 8 `; B.hi += `M${px - 9} ${py - 6} a9 9 0 0 1 8 -5 l1 2.4 a7 7 0 0 0 -6 4 Z `;
        extra = `<path d="${P([[14, -18], [20, -42], [38, -36], [34, -14]])}" fill="#c8784a" ${O(2.6)}/><path d="M19 -30 h15" stroke="#f3efd8" stroke-width="2.4"/>`; B.glint += star4(30, -56, 5.5); break; }
      // самоцветы
      case 'adamant': glowAt(B, 0, -40, 42, 30); octa3(B, -18, -36, 13); octa3(B, 16, -46, 17); octa3(B, 2, -20, 10); break;
      case 'sapphire': glowAt(B, 0, -40, 42, 30); prism3(B, -12, -20, 42, 15, -16, 0.42); prism3(B, 8, -18, 52, 17, 6, 0.42); octa3(B, 26, -26, 9); break;
      case 'emerald': glowAt(B, 0, -40, 42, 30); prism3(B, -18, -20, 34, 16, -14, 0.1); prism3(B, 20, -20, 30, 15, 18, 0.1); prism3(B, 2, -18, 48, 18, 2, 0.1); break;
      case 'topaz': glowAt(B, 0, -40, 42, 30); prism3(B, -16, -20, 42, 14, -16, 0.24); prism3(B, 22, -20, 32, 12, 22, 0.24); prism3(B, 4, -18, 54, 15, 3, 0.24); B.line += 'M2 -36 h7 M1 -46 h7 '; break;
      case 'morion': glowAt(B, 0, -40, 42, 30); prism3(B, -18, -20, 36, 14, -20); prism3(B, 20, -20, 38, 14, 18); prism3(B, 2, -18, 50, 16, -2); break;
      case 'aquamarine': glowAt(B, 0, -40, 42, 30); prism3(B, -22, -20, 40, 10, -22, 0.18); prism3(B, 24, -20, 34, 9, 26, 0.18); prism3(B, -6, -18, 54, 11, -6, 0.18); prism3(B, 10, -18, 48, 10, 10, 0.18); break;
      case 'ruby': glowAt(B, 0, -40, 42, 30); cut3(B, -15, -38, 14); cut3(B, 15, -54, 11); cut3(B, 14, -24, 9); break;
      case 'fire_opal': glowAt(B, 0, -40, 42, 30); cab3(B, -14, -36, 15, 12); cab3(B, 17, -50, 12, 10); cab3(B, 12, -22, 8, 6.5);
        top = `<path d="${dot(-18, -37, 2) + dot(-8, -34, 1.8) + dot(15, -50, 1.8)}" fill="#3affc0"/><path d="${dot(-12, -40, 1.8) + dot(-20, -32, 1.5) + dot(20, -48, 1.6)}" fill="#ff2a8a"/>`; break;
      case 'amber': glowAt(B, 0, -40, 42, 30); cab3(B, -14, -32, 13, 11, 1); cab3(B, 16, -46, 11, 9, 1); cab3(B, 6, -16, 7, 6, 1); B.line += 'M-17 -30 l3 -2 l3 2 M-14 -32 v6 '; break;
      case 'malachite': { glowAt(B, 0, -40, 42, 30); const d = blob(-4, -36, 25, 18, r, 9, 0.12); B.body += d; B.edge += d; B.line += blob(-6, -35, 17, 12, r, 9, 0.1) + ' ' + blob(-7, -34, 9, 6, r, 8, 0.1); const d2 = blob(22, -56, 10, 8, r, 7, 0.15); B.hi += d2; B.edge += d2; B.glint += star4(-14, -48, 4.5); break; }
      case 'runestone': { glowAt(B, 0, -40, 42, 30); const k = 21, px = -2, py = -36;
        extra = `<path d="${P([[px - k * 0.8, py + k * 0.9], [px - k * 0.9, py - k * 0.6], [px - k * 0.2, py - k * 1.1], [px + k * 0.8, py - k * 0.7], [px + k * 0.85, py + k * 0.9]])}" fill="#6a6478" ${O(3)}/><path d="${P([[px - k * 0.9, py - k * 0.6], [px - k * 0.2, py - k * 1.1], [px + k * 0.8, py - k * 0.7], [px - k * 0.1, py - k * 0.45]])}" fill="#8a849a"/>`;
        const rn = `M${f1(px - k * 0.3)} ${f1(py + k * 0.6)} V${f1(py - k * 0.5)} L${f1(px + k * 0.3)} ${f1(py - k * 0.1)} L${f1(px - k * 0.3)} ${f1(py + k * 0.2)} M${f1(px + k * 0.35)} ${f1(py + k * 0.6)} V${f1(py + k * 0.1)}`;
        extra += `<path d="${rn}" stroke="${c[0]}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".6"/><path d="${rn}" stroke="${c[1]}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; B.glint += star4(24, -62, 5); break; }
      default: metal(3, 12.5);
    }
    if (rare && !gem && !ORE_GEMS.has(res)) { glowAt(B, 0, -42, 52, 40); B.glowOp = 0.34; B.glint += star4(-30, -62, 5); }
    // свечение - самым нижним; медная жила и особые рисунки (кости, руна, монета) - под общими корзинами
    const glow = B.glow ? `<path d="${B.glow}" fill="${c[1]}" fill-opacity="${B.glowOp || 0.22}"/>` : ''; B.glow = '';
    return glow + extra + B.out() + top;
  }
  // руда и самоцветы: общий символ на вид (2 варианта рисунка)
  function ore2(res, x, y, s, r, rare, gem) {
    const v = Math.floor(r() * 2), id = `mro-${res}-${rare ? 1 : 0}-${gem ? 1 : 0}-${v}`;
    if (!SYM.has(id)) SYM.set(id, symOf(id, FR, ore3(res, rngOf(hs(id)), rare, gem)));
    const k = Math.min(1.06, fit(s)); return useOf(id, x - 4 * k, y - 8 * k, k);   // чуть выше и левее: справа снизу - табличка уровня
  }
  const BFR = [-60, -20, 120, 40];
  // far - камень закрыт (копать нельзя): табличка притушена так же, как камень (полупрозрачная плашка, без фильтра)
  function badge2(x, y, lv, t, far) {
    const id = `mrg-${t === 'rare' ? 'r' : t === 'hard' ? 'h' : 'n'}-${lv}${far ? '-f' : ''}`;
    if (!SYM.has(id)) { const wd = 26 + Math.max(0, String(lv).length - 1) * 11, L = -wd / 2 - 13; SYM.set(id, symOf(id, BFR, badge(0, 0, lv, t) + (far ? `<rect x="${f1(L)}" y="-14" width="${f1(wd + 26)}" height="28" rx="9" fill="#05030a" fill-opacity=".36"/>` : ''))); }
    return `<use href="#${id}" x="${f1(x + BFR[0])}" y="${f1(y + BFR[1])}" width="${BFR[2]}" height="${BFR[3]}"/>`;
  }
  /* --- окаменевший сундук (клетка 'chest'): сундук внутри валуна; стадии 0…4 - оболочка осыпается, сундук всё виднее;
     3 - обломки по бокам, крышка приоткрыта (из щели свет); 4 - крышка откинута: золото и самоцвет, ореол и блеск. Стадия 0 - в сцене, 1…4 - символы для копии копаемого камня (как повреждения). --- */
  const WOOD2 = ['#a0602a', '#c07a34', '#6a3a18', '#e8a860', '#80461e'], GOLD = ['#ffcf3a', '#fff0a0', '#b07a10'];
  const lidY = (x) => -36 - 17 * Math.sin((Math.PI * Math.max(0, Math.min(68, x + 34))) / 68);
  // части сундука (многоугольники), режутся окном R (выпуклым) - видно только то, что открылось.
  // 25.10 (art/mine-entrance): подробнее - доски с щелями, железные уголки с бликом, замок со скважиной, светлая кромка крышки;
  // lid: 0 - закрыт, 1 - приоткрыт (крышка поднята на петлях, из щели свет), 2 - откинут (видна изнанка крышки и сокровища)
  const IRN = ['#5e5e6c', '#9a9aaa'];
  function chestBody(R, petri, C, lid = 0) {
    const t = (c) => (petri ? mix(c, C.m, petri) : c), cut = (pl) => (R ? clipPoly(pl, R) : pl);
    const arch = Array.from({ length: 13 }, (_, k) => { const x = -34 + (68 * k) / 12; return [x, lidY(x)]; });
    const band = (x0, x1) => [[x0, lidY(x0) - 0.5], [x1, lidY(x1) - 0.5], [x1, -6], [x0, -6]];
    const corner = (x, y, sx, sy) => [[x, y], [x + 9 * sx, y], [x + 9 * sx, y + 3 * sy], [x + 3 * sx, y + 3 * sy], [x + 3 * sx, y + 9 * sy], [x, y + 9 * sy]];
    // крышка приоткрыта: поднята ровно, под ней - светящаяся щель
    const up = lid === 1 ? -5 : 0;
    const L = (pl) => (lid === 1 ? pl.map(([x, y]) => [x, y + up]) : pl);
    const box = [
      [[[-34, -36], [34, -36], [34, -6], [-34, -6]], t(WOOD2[0])],
      [[[24, -36], [34, -36], [34, -6], [24, -6]], t(WOOD2[4])],
      [[[-34, -27.5], [34, -27.5], [34, -25.5], [-34, -25.5]], t(WOOD2[2])], [[[-34, -17.5], [34, -17.5], [34, -15.5], [-34, -15.5]], t(WOOD2[2])],
      [[[-11, -36], [-9.6, -36], [-9.6, -6], [-11, -6]], t(WOOD2[2])], [[[9.6, -36], [11, -36], [11, -6], [9.6, -6]], t(WOOD2[2])],
      [band(-25, -18).map(([x, y]) => [x, Math.max(y, -36)]), t(GOLD[0])], [band(18, 25).map(([x, y]) => [x, Math.max(y, -36)]), t(GOLD[0])],
      [[[-25, -36], [-23.4, -36], [-23.4, -6], [-25, -6]], t(GOLD[1])], [[[18, -36], [19.6, -36], [19.6, -6], [18, -6]], t(GOLD[1])],
      [corner(-34, -6, 1, -1), t(IRN[0])], [corner(34, -6, -1, -1), t(IRN[0])], [[[-33, -7], [-27, -7], [-27, -8.4], [-33, -8.4]], t(IRN[1])],
    ];
    const top = lid === 2 ? [] : [
      [L([...arch, [34, -36], [-34, -36]]), t(WOOD2[1])],
      [L(arch.slice(2, 8).map(([x, y]) => [x, y + 2]).concat(arch.slice(2, 8).reverse().map(([x, y]) => [x, y + 6]))), t(WOOD2[3])],
      [L(band(-25, -18).map(([x, y]) => [x, Math.min(y, -36)]).filter(([, y]) => y <= -36).concat([[-18, -36], [-25, -36]])), t(GOLD[0])],
      [L(band(18, 25).map(([x, y]) => [x, Math.min(y, -36)]).filter(([, y]) => y <= -36).concat([[25, -36], [18, -36]])), t(GOLD[0])],
      [L(corner(-34, -36, 1, -1)), t(IRN[0])], [L(corner(34, -36, -1, -1)), t(IRN[0])],
    ];
    const lock = [
      [[[-7, -41], [7, -41], [7, -25], [-7, -25]].map(lid ? ([x, y]) => [x, Math.max(y, -36)] : (q) => q), t(GOLD[0])], [[[-5.6, -40], [5.6, -40], [5.6, -38.6], [-5.6, -38.6]], t(GOLD[1])],
      [[[-1.6, -34], [1.6, -34], [2.2, -31.6], [1, -30.6], [1.6, -27], [-1.6, -27], [-1, -30.6], [-2.2, -31.6]], '#2a1a10'],
    ];
    let g = '';
    const T = (pl) => pl.map(([x, y]) => [x * 1.1, y * 1.1 - 7]);   // сундук крупнее и выше (не под табличкой)
    // откинутая крышка - за ящиком: изнанка (тёмные доски), кромка, полосы
    if (lid === 2) {
      const inn = T([[-34, -36], [-30, -64], [30, -64], [34, -36]]);
      g += `<path d="${P(inn)}" fill="${WOOD2[2]}"/><path d="${P(T([[-30, -64], [30, -64], [31, -60], [-31, -60]]))}" fill="${WOOD2[1]}"/><path d="${P(T([[-25, -38], [-22, -62], [-18, -62], [-19, -38]]))} ${P(T([[19, -38], [18, -62], [22, -62], [25, -38]]))}" fill="${GOLD[2]}"/>`
        + `<path d="${P(inn)}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    }
    for (const [pl, col] of [...box, ...(lid === 2 ? [] : []), ...lock]) { const q = cut(T(pl)); if (q.length > 2) g += `<path d="${P(q)}" fill="${col}"/>`; }
    // приоткрыт: щель со светом между ящиком и крышкой
    if (lid === 1) g += `<path d="${P(T([[-32, -36], [32, -36], [32, -41], [-32, -41]]))}" fill="#ffe27a"/><path d="${P(T([[-20, -37], [20, -37], [20, -39.4], [-20, -39.4]]))}" fill="#fffbe0"/>`;
    for (const [pl, col] of top) { const q = cut(T(pl)); if (q.length > 2) g += `<path d="${P(q)}" fill="${col}"/>`; }
    // откинут: сокровища над кромкой ящика - горка монет, самоцвет, блики
    if (lid === 2) {
      const heap = T([[-31, -36], [-26, -42], [-18, -44], [-10, -49], [0, -51], [10, -48], [18, -45], [26, -41], [31, -36]]);
      g += `<path d="${P(heap)}" fill="#ffcf3a"/><path d="${P(T([[-22, -42], [-10, -47], [0, -49], [8, -46], [-4, -45], [-16, -42]]))}" fill="#fff0a0"/>`;
      let coins = ''; for (const [x, y] of [[-20, -41], [-6, -46], [8, -44], [20, -40], [-13, -38], [14, -38]]) { const [X, Y] = T([[x, y]])[0]; coins += `M${f1(X - 4)} ${f1(Y)} a4 1.8 0 1 0 8 0 a4 1.8 0 1 0 -8 0 Z `; }
      g += `<path d="${coins}" fill="none" stroke="#b07a10" stroke-width="1.6"/><path d="${P(heap)}" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
      const gem = T([[2, -50], [6, -56], [11, -55], [13, -50], [7, -45]]);
      g += `<path d="${P(gem)}" fill="#ff2a4a"/><path d="${P(T([[4, -51], [6, -54.6], [9, -54], [7, -51]]))}" fill="#ffb0c0"/><path d="${P(gem)}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
    }
    const outl = cut(T([...box[0][0]])), lidO = lid === 2 ? [] : cut(T(L([...arch, [34, -36], [-34, -36]])));
    if (outl.length > 2) g += `<path d="${P(outl)}" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    if (lidO.length > 2) g += `<path d="${P(lidO)}" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    const lk = cut(T(lock[0][0])); if (lk.length > 2) g += `<path d="${P(lk)}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
    return g;
  }
  const oct = (cx, cy, rx, ry, r, n = 9) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2 - Math.PI / 2, j = 0.9 + r() * 0.16; return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]; });
  function chestSyms(id, pal) {
    const r = rngOf(hs(id)), C = tones2(pal, "stone"), W = 52, H = 84;
    const c = { theme: CUR.theme, type: 'stone', hard: false, shape: 2, C, r, W, H, ox: 0, oy: 0 };
    c.sil = silOf(0, false, r, W, H); c.inside = (p) => inPoly(p, c.sil);
    const th = themeDeco(c), shell = th.back + facets2(c) + th.under + outlineOf(c.sil, C, 5.2) + th.over;
    const shadow = `<ellipse cx="2" cy="3" rx="${f1(W * 1.06)}" ry="10" fill="#000" fill-opacity=".32"/>`;
    const lip = c.theme === 'abyss' ? '#ff8a3a' : C.fresh;
    // окно в оболочке: тёмная полость, сундук в ней, рваная кромка со светлым изломом, трещины от окна
    const win = (R, petri, ncr) => {
      const rim = R.map(([x, y]) => [x + (r() - 0.5) * 3, y + (r() - 0.5) * 3]);
      let g = `<path d="${P(R)}" fill="${C.hole}"/>` + chestBody(R.map(([x, y]) => [x * 0.97, (y + 36) * 0.97 - 36]), petri, C);
      g += `<path d="${P(rim.map(([x, y]) => [x * 0.94, (y + 36) * 0.94 - 36]))}" fill="none" stroke="${lip}" stroke-width="2"/>` + `<path d="${P(rim)}" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
      let cr = ''; for (let k = 0; k < ncr; k++) { const p = R[Math.floor((k / ncr) * R.length + 1) % R.length], a = Math.atan2(p[1] + 36, p[0]); cr += PL(walk(p, a, 16 + r() * 10, c.inside, r, 5)) + ' '; }
      if (cr) g += `<path d="${cr}" stroke="${C.hole}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      return g;
    };
    const chips = (pts) => { let d = ''; for (const [x, y, k] of pts) d += `M${f1(x - k)} ${f1(y)} L${f1(x - k * 0.5)} ${f1(y - k * 0.9)} L${f1(x + k * 0.7)} ${f1(y - k * 0.7)} L${f1(x + k)} ${f1(y)} Z `; return `<path d="${d}" fill="${C.l1}" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/>`; };
    // кусок оболочки, ещё держащийся за сундук (силуэт ∩ выпуклая область) - со своей светлой гранью и контуром
    const chunk = (poly) => { const q = clipPoly(c.sil, poly); if (q.length < 3) return ''; const top = clipPoly(q, [[-80, -120], [80, -120], [80, -58], [-80, -48]]); return `<path d="${P(q)}" fill="${C.m}"/>` + el(D(top), `fill="${C.l1}"`) + `<path d="${P(q)}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>`; };
    // обломок: валунчик с гранью и контуром
    const rockBit = (x, y, rx, ry) => { const q = smooth([[x - rx, y + 2], [x - rx, y - ry * 0.6], [x - rx * 0.2, y - ry], [x + rx * 0.8, y - ry * 0.7], [x + rx, y + 2]], 3); return `<path d="${P(q)}" fill="${C.m}"/>` + el(D(clipPoly(q, [[x - rx - 4, y - ry - 4], [x + rx * 0.3, y - ry - 4], [x, y - ry * 0.2], [x - rx - 4, y - ry * 0.1]])), `fill="${C.l1}"`) + `<path d="${P(q)}" fill="none" stroke="${C.ink}" stroke-width="3.4" stroke-linejoin="round"/>`; };
    const glow = `<path d="${dot(0, -40, 48).replace(/a48 48/g, 'a48 40')}" fill="#ffe27a" fill-opacity=".2"/>`;
    const st = [
      shadow + shell + win(oct(-10, -34, 16, 12, r), 0.4, 1),
      shadow + shell + win(oct(-4, -36, 27, 18, r), 0.36, 2),
      shadow + shell + win(oct(0, -38, 41, 28, r, 11), 0.3, 3) + chips([[-W * 0.8, 3, 4], [W * 0.62, 4, 3.5]]),
      // 3: оболочка осыпалась (обломки по бокам), крышка приоткрылась - из щели свет
      shadow + chestBody(null, 0.16, C, 1) + chunk([[-80, -74], [-24, -58], [-30, 10], [-80, 10]]) + chunk([[32, -56], [80, -72], [80, 10], [35, 10]])
        + chips([[-W * 0.86, 3, 4.5], [-W * 0.3, 5, 3.5], [W * 0.82, 3, 4]]) + twinkle(30, -56, 0.6, '#fff6c0'),
      // 4: крышка откинута - золото и самоцвет, ореол, блеск; у подножия - обломки
      shadow + glow + chestBody(null, 0, C, 2) + rockBit(-36, -2, 12, 12) + rockBit(38, -3, 10, 10)
        + chips([[-W * 0.9, 3, 4], [-W * 0.55, 5, 3], [W * 0.5, 5, 3.5], [W * 0.92, 2, 3]])
        + twinkle(22, -66, 0.9, '#fff6c0') + twinkle(-18, -68, 0.65, '#ffffff') + twinkle(4, -74, 0.55, '#fff6c0'),
    ];
    SYM.set(id, symOf(id, FR, st[0]));
    DMG.set(id, st.slice(1).map((g, k) => symOf(`${id}-s${k + 1}`, FR, g)));
    META.set(id, { C, a: [0, -70] });
  }
  /** Окаменевший сундук (mine2): <use>; стадии - при копании (digging/cracks меняют символ целиком). */
  /* 27.10 (угольный этаж): куча угля - неподвижный предмет этажа на клетке-проходе (ходят мимо и сквозь); низкая горка тёмных
     глыб с бликами, лопата воткнута сбоку. x, y - низ клетки (как у камня), r - случайность клетки. Без анимаций */
  function coalHeap(x, y, r) {
    const C = ORE.coal;
    let g = `<ellipse cx="${f1(x + 4)}" cy="${f1(y + 2)}" rx="58" ry="13" fill="#000" fill-opacity=".38"/>`;
    // горка: силуэт - пологий холм
    const hill = []; for (let q = 0; q <= 10; q++) { const t = q / 10, a = Math.PI * t; hill.push([x - 54 + 108 * t, y - Math.sin(a) * (34 + r() * 6) - 2]); }
    hill.push([x + 54, y + 2], [x - 54, y + 2]);
    g += `<path d="${P(hill)}" fill="${C[2]}" ${O(3.5)}/>`;
    // глыбы угля рядами: снизу шире, сверху - пара
    const rows = [[-40, -6, 5, 17], [-28, -22, 4, 15], [-14, -36, 2, 14]];
    for (const [x0, dy, n, k] of rows) for (let q = 0; q < n; q++) g += nugget(x + x0 + q * (k * 1.25) + (r() - 0.5) * 5, y + dy + (r() - 0.5) * 4, k * (0.8 + r() * 0.3), C, r, r() < 0.5);
    // россыпь у подножия
    for (let q = 0; q < 4; q++) g += nugget(x + (q < 2 ? -62 + q * 10 : 48 + (q - 2) * 10), y + 2 - r() * 4, 6 + r() * 2, C, r, false);
    // лопата: черенок и штык, воткнута справа
    g += `<path d="M${f1(x + 30)} ${f1(y - 30)} L${f1(x + 50)} ${f1(y - 84)}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${f1(x + 30)} ${f1(y - 30)} L${f1(x + 50)} ${f1(y - 84)}" stroke="#a8743a" stroke-width="4.5" stroke-linecap="round"/>`;
    g += `<path d="M${f1(x + 44)} ${f1(y - 88)} h14" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${f1(x + 44)} ${f1(y - 88)} h14" stroke="#c89048" stroke-width="3.5" stroke-linecap="round"/>`;
    g += `<path d="M${f1(x + 20)} ${f1(y - 30)} l18 4 l-4 18 q-12 4 -20 -6 Z" fill="#9aa0b4" ${O(2.6)}/><path d="M${f1(x + 22)} ${f1(y - 27)} l12 3" stroke="#e4e8f2" stroke-width="2" stroke-linecap="round"/>`;
    return g;
  }
  function chest2(x, y, s, pal, r) {
    const id = `mrc-${CUR.theme}-${hs(pal.join(',')).toString(36)}`;
    if (!SYM.has(id)) chestSyms(id, pal);
    return useOf(id, x, y, fit(s));
  }
  // скала (не разбить): три высокие гранёные глыбы в новом стиле, тёмная палитра стены, детали темы на передней
  const WFR = [-120, -270, 240, 300];
  function wall2(x, y, pal, r) {
    const v = Math.floor(r() * 3), id = `mrw-${CUR.theme}-${v}-${hs(pal.join(',')).toString(36)}`;
    if (!SYM.has(id)) {
      const rr = rngOf(hs(id)), C = tones2([lit(pal[0], 0.1), lit(pal[1] || pal[0], 0.22), drk(pal[0], 0.3)], 'stone');
      let g = `<ellipse cx="2" cy="2" rx="60" ry="12" fill="#000" fill-opacity=".38"/>`;
      const TALL = [[-1, 0], [-1.06, -0.4], [-0.86, -0.78], [-0.4, -1], [0.3, -0.97], [0.82, -0.74], [1.03, -0.36], [1, 0], [0.4, 0.05], [-0.4, 0.05]];
      const specs = [[-30 + v * 2, 26, 84, -4], [29 - v * 2, 27, 74 + v * 5, -2], [-2, 34, 100 + v * 3, 0]];   // 26.10: не выше ~0,85 клетки (над ней - табличка ряда выше), в ширину - в клетку
      for (const [dx, ww, hh, dy] of specs) {
        const sil = TALL.map(([a, b]) => [dx + a * ww * (1 + (rr() - 0.5) * 0.1), dy + b * hh * (1 + (rr() - 0.5) * 0.06)]);
        const c = { theme: CUR.theme, type: 'stone', hard: true, shape: v, C, r: rr, sil, W: ww, H: hh, ox: dx, oy: dy, wall: true, inside: (p) => inPoly(p, sil) };
        c.extraCr = [U(c, [[-0.6, -0.3], [-0.1, -0.36], [0.4, -0.3]], 0.03), U(c, [[-0.5, -0.62], [0, -0.68], [0.5, -0.6]], 0.03)];
        g += facets2(c);
        if (dx === -2) { const th = themeDeco(c); g += th.under + outlineOf(sil, C, 5.5) + th.over; } else g += outlineOf(sil, C, 5.5);
      }
      for (const [bx, by, rx, ry] of [[-46, -4, 12, 8], [48, -3, 10, 7]]) { const sil = smooth([[bx - rx, by + 3], [bx - rx, by - ry * 0.6], [bx - rx * 0.2, by - ry], [bx + rx * 0.8, by - ry * 0.7], [bx + rx, by + 3]], 3); g += `<path d="${P(sil)}" fill="${C.d1}" stroke="${C.ink}" stroke-width="3.2" stroke-linejoin="round"/>`; }
      SYM.set(id, symOf(id, WFR, g));
    }
    return useOf(id, x, y, 1, WFR);
  }
  /** Общие определения сцены: ореол фонаря + символы, на которые ссылаются props (камни, руда, таблички, сундуки, скалы). */
  function defs2(props) {
    let h = '<defs><radialGradient id="mnaGlow"><stop offset="0" stop-color="#ffcf6a" stop-opacity=".55"/><stop offset=".55" stop-color="#ffcf6a" stop-opacity=".16"/><stop offset="1" stop-color="#ffcf6a" stop-opacity="0"/></radialGradient>';
    if (props) { const seen = new Set(); for (const p of props) { const s = p && (p.svg || p); if (typeof s !== 'string') continue; for (const m of s.matchAll(/href="#(mr[bogcwe]-[^"]+)"/g)) if (!seen.has(m[1])) { seen.add(m[1]); h += SYM.get(m[1]) || ''; } } }
    return h + '</defs>';
  }
  const stageOf2 = (p) => (p >= 0.85 ? 4 : p >= 0.6 ? 3 : p >= 0.35 ? 2 : p >= 0.12 ? 1 : 0);
  const USE_RE = /<use href="#(mr[bc]-[^"]+?)(?:-s\d)?" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/;   // и строка рисунка, и innerHTML (<use …></use>)
  // крошка при смене стадии: 6 осколков разлетаются (CSS transform/opacity, 0,75 с, один раз)
  function chipBurst(id, m, k) {
    const M = META.get(id); if (!M) return '';
    const s = +m[4] / FR[2], x = +m[2] - FR[0] * s, y = +m[3] - FR[1] * s, ax = x + M.a[0] * s, ay = y + (M.a[1] + 18) * s, R = rngOf(hs(id) + k * 97);
    let g = '<g class="mna-chips">';
    for (let q = 0; q < 6; q++) { const dx = (R() - 0.5) * 90, dy = 40 + R() * 50, z = (3 + R() * 3) * s, c = [M.C.l1, M.C.m, M.C.d1][q % 3]; g += `<path d="M${f1(ax - z)} ${f1(ay)} L${f1(ax - z * 0.3)} ${f1(ay - z)} L${f1(ax + z)} ${f1(ay - z * 0.4)} L${f1(ax + z * 0.5)} ${f1(ay + z * 0.7)} Z" fill="${c}" stroke="${M.C.ink}" stroke-width="1.6" style="--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--rt:${((R() - 0.5) * 540).toFixed(0)}deg;animation-delay:${(q * 0.03).toFixed(2)}s"/>`; }
    return g + '</g>';
  }
  let cssDone = false;
  function css() {
    if (cssDone || typeof document === 'undefined') return; cssDone = true;
    const st = document.createElement('style'); st.id = 'mna-rocks2';
    st.textContent = digCss() + '.mna-chips path{transform-box:fill-box;transform-origin:center;opacity:0;animation:mna-chip .75s cubic-bezier(.25,.6,.45,1) both}'
      + '@keyframes mna-chip{0%{transform:translate(0,0) rotate(0);opacity:1}35%{transform:translate(calc(var(--dx) * .45),-16px) rotate(calc(var(--rt) * .4));opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rt));opacity:0}}'
      + '.mna-defs{position:absolute;width:0;height:0;overflow:hidden}@media (prefers-reduced-motion:reduce){.mna-chips{display:none}}';
    (document.head || document.documentElement).appendChild(st);
  }
  const LAST = new Map();   // клетка → последняя показанная стадия (крошка - только при росте)
  // повреждение в копии: <use> символа стадии - после тела и руды, перед табличкой (табличка остаётся читаемой)
  const withDmg = (body, m, st) => { const u = `<g class="mn-crk" data-st="${st}">${st ? `<use href="#${m[1]}-d${st}" x="${m[2]}" y="${m[3]}" width="${m[4]}" height="${m[5]}"/>` : ''}</g>`, k = body.indexOf('<use href="#mrg-'); return k < 0 ? body + u : body.slice(0, k) + u + body.slice(k); };
  /** HTML копий копаемых камней (слой полосок mine.js); символы стадий - в скрытом <svg> там же. */
  function digging2(rk, list) {
    css(); let h = ''; const need = new Set();
    for (const b of list) {
      const body = rk[b.i]; if (!body) continue;
      const m = USE_RE.exec(body), st = stageOf2(b.p), prev = LAST.get(b.i); LAST.set(b.i, st);
      const x0 = b.x - 90, y0 = b.y - 170, d = 0.9 + ((b.i * 37) % 9) / 20, dl = -((b.i * 53) % 17) / 10;
      let inner;
      const burst = m && prev != null && st > prev ? chipBurst(m[1], m, st) : '';
      if (m && DMG.has(m[1]) && m[1].startsWith('mrc-')) { need.add(m[1]); inner = (st ? body.replace(`href="#${m[1]}"`, `href="#${m[1]}-s${st}"`) : body) + `<g class="mn-crk" data-st="${st}"></g>` + burst; }   // сундук: символ стадии целиком
      else if (m && DMG.has(m[1])) { need.add(m[1]); inner = withDmg(body, m, st) + burst; }
      else { const s1 = Math.min(3, st); inner = `${body}<g class="mn-crk" data-st="${st}">${fo(crack(s1, b.x, b.y, b.s, b.i))}</g>`; }
      const M = m && META.get(m[1]), chc = M ? `;--ch1:${M.C.l1};--ch2:${M.C.d1}` : '';
      h += `<svg class="mn-rk${b.n > 0 ? ' hit' : ''}" data-rk="${b.i}" style="left:${x0}px;top:${y0}px;--sd:${d.toFixed(2)}s;--sl:${dl.toFixed(1)}s${chc}" width="180" height="190" viewBox="${x0} ${y0} 180 190" overflow="visible" aria-hidden="true">${inner}</svg>`;
    }
    if (need.size) h = `<svg class="mna-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${[...need].map((id) => DMG.get(id).join('')).join('')}</defs></svg>` + h;
    return h;
  }
  /** Раз в 20 с: стадия по прогрессу; выросла - новый символ стадии и крошка. */
  function cracks2(host, list) {
    for (const b of list) {
      const svg = host.querySelector(`.mn-rk[data-rk="${b.i}"]`), g = svg && svg.querySelector('.mn-crk'); if (!g) continue;
      const st = stageOf2(b.p); if (String(st) === g.dataset.st) continue;
      const prev = +g.dataset.st; g.dataset.st = String(st); LAST.set(b.i, st);
      const m = USE_RE.exec(svg.innerHTML);
      if (m && DMG.has(m[1]) && m[1].startsWith('mrc-')) { const u = svg.querySelector('use[href^="#mrc-"]'); if (u) u.setAttribute('href', `#${m[1]}${st ? '-s' + st : ''}`); if (st > prev) { svg.insertAdjacentHTML('beforeend', chipBurst(m[1], m, st)); const ch = svg.lastElementChild; setTimeout(() => { if (ch && ch.parentNode) ch.remove(); }, 1200); } }
      else if (m && DMG.has(m[1])) {
        g.innerHTML = st ? `<use href="#${m[1]}-d${st}" x="${m[2]}" y="${m[3]}" width="${m[4]}" height="${m[5]}"/>` : '';
        if (st > prev) { svg.insertAdjacentHTML('beforeend', chipBurst(m[1], m, st)); const ch = svg.lastElementChild; setTimeout(() => { if (ch && ch.parentNode) ch.remove(); }, 1200); }
      } else g.innerHTML = fo(crack(Math.min(3, st), b.x, b.y, b.s, b.i));
    }
  }

  /* ================= 26.10 (mine/rocks2): копание - кирка в лапе, удар всем телом, искры в точке удара, разные удары =================
     Копающий рисуется в стойке «с оружием» (doodle armed: у всех 7 стилей правая лапа - jd-weapon, плечо - начало .batR):
     правая лапа (рука от плеча + кисть) вынесена вперёд тела и вместе с киркой качается вокруг ПЛЕЧА; тело наклоняется назад на
     замахе и вперёд на ударе. Удары: рубящий сверху, сбоку, два быстрых, мощный (долгий замах, большой сноп), передышка.
     Каждый копатель - своя «серия» ударов (по нику и 5-минутке), свой темп (--dd) и сдвиг (--dl) - толпа не в такт.
     Только CSS-анимации (transform/opacity), ни одного кадра JS; JS - лишь при обновлении героев (digSync: точка удара по камню,
     камень вздрагивает в такт первому копателю, ≤ 40 снопов искр на экране). prefers-reduced-motion - без анимаций. Только mine2. */
  // удары: [время с, угол руки (от плеча, + вперёд-вниз), наклон тела, приседание (scaleY; scaleX = 2 − он), удар: 0 / 1 / 2 (мощный), шаг тела px]
  // у каждого: подготовка (присел) → замах (тело назад, вытянулось) → удар (рывок вперёд, сплющило) → отдача (кирка отскочила) → дожим → покой
  const MOVES = {
    chop: { t: 1.1, k: [[0, 0, 0, 1, 0, 0], [0.12, 8, 2, 0.97, 0, 1], [0.42, -46, -12, 1.05, 0, -3], [0.5, -50, -14, 1.06, 0, -3], [0.57, 66, 9, 0.88, 1, 5], [0.65, 40, 4, 1.03, 0, 3], [0.74, 54, 6, 0.97, 0, 3], [1.1, 0, 0, 1, 0, 0]] },
    side: { t: 1.15, k: [[0, 0, 0, 1, 0, 0], [0.14, 6, 3, 0.98, 0, 1], [0.46, -14, -16, 1.01, 0, -5], [0.53, -18, -17, 1.01, 0, -5], [0.62, 70, 12, 0.91, 1, 6], [0.7, 46, 5, 1.02, 0, 3], [0.8, 58, 7, 0.98, 0, 3], [1.15, 0, 0, 1, 0, 0]] },
    tap2: { t: 1.0, k: [[0, 0, 0, 1, 0, 0], [0.16, 18, -4, 1.02, 0, -1], [0.24, 64, 6, 0.93, 1, 3], [0.32, 34, 0, 1.02, 0, 1], [0.42, 64, 6, 0.93, 1, 3], [0.5, 38, 1, 1.02, 0, 1], [0.6, 50, 3, 0.99, 0, 2], [1.0, 0, 0, 1, 0, 0]] },
    power: { t: 1.9, k: [[0, 0, 0, 1, 0, 0], [0.18, 12, 4, 0.93, 0, 2], [0.6, -68, -17, 1.07, 0, -5], [0.7, -73, -18, 1.08, 0, -5], [0.78, -70, -17, 1.07, 0, -5], [0.86, -75, -19, 1.09, 0, -6], [0.96, -72, -18, 1.08, 0, -6], [1.05, 74, 13, 0.84, 2, 8], [1.15, 30, 2, 1.06, 0, 3], [1.26, 60, 8, 0.95, 0, 4], [1.36, 50, 5, 1.0, 0, 3], [1.9, 0, 0, 1, 0, 0]] },
    // передышка: опёрся на кирку, дышит, потянулся назад
    rest: { t: 1.6, k: [[0, 0, 0, 1, 0, 0], [0.3, 64, 3, 1, 0, 1], [0.55, 66, 4, 0.97, 0, 1], [0.8, 64, 3, 1.02, 0, 1], [1.05, 66, 4, 0.97, 0, 1], [1.3, 40, -6, 1.04, 0, -1], [1.6, 0, 0, 1, 0, 0]] },
  };
  // камень над головой: рука вверх, клюв бьёт в низ камня (тело не наклоняется - только приседает и вытягивается)
  const MOVES_UP = {
    chop: { t: 1.05, k: [[0, 20, 0, 1], [0.12, 26, 0, 0.97], [0.44, 56, 0, 0.92], [0.5, 58, 0, 0.9], [0.57, -16, 0, 1.1, 1], [0.65, 6, 0, 0.98], [0.74, -6, 0, 1.03], [1.05, 20, 0, 1]] },
    tap2: { t: 1.0, k: [[0, 20, 0, 1], [0.16, 30, 0, 0.97], [0.24, -14, 0, 1.07, 1], [0.33, 10, 0, 0.99], [0.42, -14, 0, 1.07, 1], [0.5, 8, 0, 0.99], [0.6, 0, 0, 1.01], [1.0, 20, 0, 1]] },
    power: { t: 1.8, k: [[0, 20, 0, 1], [0.18, 30, 0, 0.93], [0.6, 70, 0, 0.88], [0.7, 74, 0, 0.86], [0.78, 71, 0, 0.87], [0.86, 75, 0, 0.85], [0.96, 72, 0, 0.86], [1.05, -18, 0, 1.14, 2], [1.15, 14, 0, 0.95], [1.26, -8, 0, 1.04], [1.36, 0, 0, 1], [1.8, 20, 0, 1]] },
    rest: { t: 1.5, k: [[0, 20, 0, 1], [0.35, 46, 0, 1], [0.6, 48, 0, 0.97], [0.85, 46, 0, 1.02], [1.1, 48, 0, 0.98], [1.5, 20, 0, 1]] },
  };
  const SEQS = [['chop', 'chop', 'tap2', 'chop', 'power', 'rest'], ['tap2', 'chop', 'side', 'chop', 'chop', 'power'], ['side', 'side', 'chop', 'rest', 'power', 'tap2'], ['chop', 'power', 'chop', 'side', 'tap2', 'rest']];
  const SEQ_UP = [['chop', 'chop', 'tap2', 'power', 'rest'], ['tap2', 'chop', 'chop', 'power', 'chop', 'rest']];
  const BASE_T = 1.2;   // --dd (темп копателя, 1,05-1,45 с) делится на это: серия длиной L c идёт L / 1,2 × --dd
  function seqFrames(names, M) {
    const fr = [], hits = []; let t0 = 0;
    for (const n of names) { const m = M[n] || M.chop; for (const [t, a, b, s, h, dx] of m.k) { if (t === 0 && fr.length) continue; fr.push([t0 + t, a, b, s, dx || 0]); if (h) hits.push([t0 + t, h]); } t0 += m.t; }
    return { fr, hits, T: t0 };
  }
  const pc = (t, T) => +((Math.max(0, Math.min(T, t)) / T) * 100).toFixed(2);
  // сглаживание участка: удар - разгон (ease-in), отдача - резко и с затуханием (ease-out), прочее - мягко
  const ease = (a, b) => (b - a > 60 ? 'cubic-bezier(.7,0,1,1)' : a - b > 15 && a > 40 ? 'cubic-bezier(.1,.9,.3,1)' : 'cubic-bezier(.35,0,.45,1)');
  function digCss() {
    let c = '';
    const build = (id, names, M, up) => {
      const { fr, hits, T } = seqFrames(names, M);
      // рука (с киркой) от плеча; тело - шаг, наклон и приседание от низа; искры и крошка; камень вздрагивает
      c += `@keyframes mna-ar-${id}{` + fr.map(([t, a], k) => `${pc(t, T)}%{transform:rotate(${a}deg);animation-timing-function:${k + 1 < fr.length ? ease(a, fr[k + 1][1]) : 'linear'}}`).join('') + '}';
      c += `@keyframes mna-bd-${id}{` + fr.map(([t, a, b, s, dx], k) => `${pc(t, T)}%{transform:translate(${up ? 0 : dx}px,0) rotate(${up ? 0 : b}deg) scale(${(2 - s).toFixed(2)},${s});animation-timing-function:${k + 1 < fr.length ? ease(a, fr[k + 1][1]) : 'linear'}}`).join('') + '}';
      const hk = ['0%{opacity:0;transform:scale(.2)}'], ck = ['0%{opacity:0;transform:translate(0,0) scale(.3)}'], sk = ['0%{transform:translate(0,0) scale(1,1)}'];
      hits.forEach(([t, h], k) => {
        const nx = k + 1 < hits.length ? hits[k + 1][0] - 0.02 : T, end = (d) => pc(Math.min(t + d, nx), T), big = h === 2 ? 1.9 : 1.25, sh = h === 2 ? 5 : 3, q = h === 2 ? 0.94 : 0.97;
        // вспышка и искры: мгновенно, разлёт, гаснут за 0,2 с
        hk.push(`${pc(t - 0.01, T)}%{opacity:0;transform:scale(.2)}`, `${pc(t, T)}%{opacity:1;transform:scale(${(big * 0.7).toFixed(2)})}`, `${end(0.07)}%{opacity:1;transform:scale(${big})}`, `${end(h === 2 ? 0.26 : 0.2)}%{opacity:0;transform:scale(${(big * 1.2).toFixed(2)})}`);
        // крошка: разлетается и падает
        ck.push(`${pc(t - 0.01, T)}%{opacity:0;transform:translate(0,0) scale(.3)}`, `${pc(t, T)}%{opacity:1;transform:translate(0,0) scale(.5)}`, `${end(0.1)}%{opacity:1;transform:translate(0,-4px) scale(${(big * 0.9).toFixed(2)})}`, `${end(h === 2 ? 0.42 : 0.34)}%{opacity:0;transform:translate(0,${h === 2 ? 22 : 15}px) scale(${(big * 1.3).toFixed(2)})}`);
        // камень: дёрнулся от удара, сплющился и вернулся
        sk.push(`${pc(t - 0.01, T)}%{transform:translate(0,0) scale(1,1)}`, `${pc(t, T)}%{transform:translate(${sh}px,1px) scale(${(2 - q).toFixed(2)},${q})}`, `${end(0.04)}%{transform:translate(${(-sh * 0.7).toFixed(1)}px,0) scale(1,1)}`, `${end(0.08)}%{transform:translate(${(sh * 0.35).toFixed(1)}px,0) scale(1,1.01)}`, `${end(0.13)}%{transform:translate(0,0) scale(1,1)}`);
      });
      c += `@keyframes mna-ht-${id}{${hk.join('')}100%{opacity:0;transform:scale(.2)}}@keyframes mna-hc-${id}{${ck.join('')}100%{opacity:0;transform:translate(0,0) scale(.3)}}@keyframes mna-sk-${id}{${sk.join('')}100%{transform:translate(0,0) scale(1,1)}}`;
      const dur = `calc(var(--dd, 1.2s) * ${(T / BASE_T).toFixed(3)})`, an = (n) => `mna-${n}-${id} ${dur} var(--dl, 0s) infinite`;
      const sel = up ? `.mn[data-m2="1"] .mn-h.dig.up .mna-dfig[data-squ="${id.slice(1)}"]` : `.mn[data-m2="1"] .mn-h.dig:not(.up) .mna-dfig[data-sq="${id}"]`, ht = `${sel} .mna-ht${up ? '.u' : ':not(.u)'}`;
      c += `${sel}{animation:${an('bd')}}${sel} .mna-arm{animation:${an('ar')}}${ht}>.s{animation:${an('ht')}}${ht}>.c{animation:${an('hc')}}`;
      c += `.mn[data-m2="1"] .mn-rk.hit[data-sq="${id}"]{animation:${an('sk')}}`;
    };
    SEQS.forEach((s, k) => build(String(k), s, MOVES, false));
    SEQ_UP.forEach((s, k) => build('u' + k, s, MOVES_UP, true));
    return c + '.mn-fig.has-d>svg.mna-dfig{display:none}.mn-h.dig .mn-fig.has-d>svg.mna-dfig{display:block}.mn-h.dig .mn-fig.has-d>svg:not(.mna-dfig){display:none}'
      + '.mn[data-m2="1"] .mn-h.dig .mn-fig.has-d::after,.mn[data-m2="1"] .mn-h.dig .mn-fig.has-d::before{display:none}'
      + '.mna-dfig{transform-origin:50% 100%}.mn[data-m2="1"] .mn-rk.hit{transform-origin:50% 90%}.mna-ht>g{opacity:0}.mna-ht.u{display:none}.mn-h.dig.up .mna-ht.u{display:inline}.mn-h.dig.up .mna-ht:not(.u){display:none}.mn-h.nb .mna-ht{display:none}'
      + '@media (prefers-reduced-motion:reduce){.mn[data-m2="1"] .mn-h.dig .mna-dfig,.mn[data-m2="1"] .mn-h.dig .mna-dfig *,.mn[data-m2="1"] .mn-rk.hit{animation:none!important}.mna-ht{display:none!important}}';
  }
  // кирка в лапе: в осях кисти (u - вдоль черенка к головке, n - вперёд); в покое черенок почти вертикально (−100°), клюв вперёд;
  // на ударе (рука +66°) клюв смотрит вперёд-вниз, в бок камня. Головка - плоский серп: тёмный низ, светлая плоскость сверху, блик
  const PK_U = [Math.cos((-100 * Math.PI) / 180), Math.sin((-100 * Math.PI) / 180)], PK_N = [-PK_U[1], PK_U[0]];
  const pk = (a, b) => [PK_U[0] * a + PK_N[0] * b, PK_U[1] * a + PK_N[1] * b], pp = (p) => `${f1(p[0])} ${f1(p[1])}`;
  const PICK_TIP = pk(45, 31);   // клюв в осях кисти
  // 26.10 (mine/pickaxe): ступени кирки - головка своим материалом (деревянная … адамантитовая): [низ, плоскость, обух, блеск];
  // золотая и адамантитовая - ещё искра на клюве. Без ступени (флаг кирок закрыт) - прежняя (железная) кирка #mna-pick
  const PICK_TIER = [['#8a5a30', '#c99a62', '#6a4424', '#f1d2a4'], ['#b4602c', '#f2a56c', '#8a4420', '#ffe0c4'], ['#6f7888', '#c8d0da', '#575f6e', '#ffffff'],
    ['#4c6585', '#e6f0fa', '#34485f', '#ffffff'], ['#c8921a', '#ffe27a', '#94690c', '#fffbe0'], ['#3d5f9a', '#b4dcff', '#28406c', '#e8fbff']];
  const PICK_NAMES = ['Деревянная', 'Медная', 'Железная', 'Стальная', 'Золотая', 'Адамантитовая'];
  const pickSvg = (T) => {
    const B = pk(46, -23), F = PICK_TIP, top = pk(66, 2), bot = pk(52, 2), mid = pk(60, 2), hd = `M${pp(pk(-11, 0))} L${pp(pk(56, 0))}`;
    return (T[4] ? `<circle cx="${f1(pk(56, 2)[0])}" cy="${f1(pk(56, 2)[1])}" r="24" fill="${T[1]}" opacity=".32"/>` : '')   // золотая, адамантитовая - ореол у головки (видно издалека)
      + `<path d="${hd}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="${hd}" stroke="#9a6636" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M${pp(pk(-8, -1.2))} L${pp(pk(50, -1.2))}" stroke="#c99560" stroke-width="1.6" stroke-linecap="round"/>`
      + `<path d="M${pp(pk(7, -3.2))} L${pp(pk(7, 3.2))} M${pp(pk(12, -3.2))} L${pp(pk(12, 3.2))}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`   // обмотка у кисти
      + `<path d="M${pp(B)} Q${pp(top)} ${pp(F)} Q${pp(bot)} ${pp(B)} Z" fill="${T[0]}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M${pp(pk(48, -19))} Q${pp(pk(63.5, 2))} ${pp(pk(47.5, 27))} Q${pp(mid)} ${pp(pk(48, -19))} Z" fill="${T[1]}"/>`
      + `<path d="M${pp(pk(56, 2))} Q${pp(pk(58.5, 14))} ${pp(pk(51, 24))}" stroke="${T[3]}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      + `<rect x="-5" y="-5" width="10" height="10" rx="2" transform="translate(${pp(pk(55, 0))}) rotate(-10)" fill="${T[2]}" stroke="${INK}" stroke-width="1.8"/>`
      + (T[4] ? `<path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" transform="translate(${pp(pk(47, 24))})" fill="${T[3]}" stroke="${INK}" stroke-width=".9"/>` : '');
  };
  const PICK_SVG = pickSvg(PICK_TIER[2]);
  const pickTierOf = (k) => { const n = Math.floor(+k); return n >= 0 && n < PICK_TIER.length ? n : -1; };
  /** 26.10: значок кирки ступени k (окно Снабженца): маленький SVG. */
  function pickIcon(k, size = 44) {
    const n = Math.max(0, pickTierOf(k)), T = PICK_TIER[n].concat(n >= 4 ? [1] : []);
    return `<svg class="mna-pki" data-pk="${n}" width="${size}" height="${size}" viewBox="-30 -78 92 92" aria-hidden="true" focusable="false"><g transform="rotate(38)">${pickSvg(T)}</g></svg>`;
  }
  // удар: .s - вспышка (звезда) и искры (ромбики-лучи назад и вверх, от камня), .c - крошка камня цвета камня (--ch1/--ch2 от digSync)
  const BURST = (() => {
    let sp = '', sw = '', ch1 = '', ch2 = '';
    [[150, 7, 22, 3.4], [178, 6, 26, 3.8], [204, 7, 24, 3.4], [228, 6, 21, 3], [254, 7, 23, 3.2], [282, 6, 18, 2.6], [124, 8, 16, 2.4], [306, 8, 14, 2.2]].forEach(([deg, r1, r2, w], k) => {
      const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c, m = r1 + (r2 - r1) * 0.38;
      const d = `M${f1(c * r1)} ${f1(s * r1)} L${f1(c * m + nx * w)} ${f1(s * m + ny * w)} L${f1(c * r2)} ${f1(s * r2)} L${f1(c * m - nx * w)} ${f1(s * m - ny * w)} Z `;
      if (k % 3 === 1) sw += d; else sp += d;
    });
    for (const [x, y, z, k] of [[-13, 4, 4.6, 0], [-7, 12, 3.6, 1], [-19, -4, 3.2, 1], [-3, 17, 2.8, 0], [-16, 13, 3, 0]]) { const d = `M${x - z} ${y} L${f1(x - z * 0.2)} ${f1(y - z)} L${x + z} ${f1(y - z * 0.2)} L${f1(x + z * 0.3)} ${y + z} Z `; if (k) ch2 += d; else ch1 += d; }
    const star = 'M0 -10 L2.4 -2.4 L10 0 L2.4 2.4 L0 10 L-2.4 2.4 L-10 0 L-2.4 -2.4 Z';
    return { s: `<circle r="13" fill="none" stroke="#f3e6c8" stroke-width="2" stroke-opacity=".55"/><path d="${sp}" fill="#ffd34a" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="${sw}" fill="#fff6c8" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="${star}" fill="#ffffff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><circle r="2.6" fill="#ffe27a"/>`,
      c: `<path d="${ch1}" style="fill:var(--ch1,#b9a58a)" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="${ch2}" style="fill:var(--ch2,#7d6a55)" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` };
  })();
  // общие символы копания (один раз на страницу): кирка, искры, крошка (и они же повёрнутые - для камня сверху)
  const symV = (id, body) => `<symbol id="${id}" overflow="visible">${body}</symbol>`;
  const DIG_DEFS = symV('mna-pick', PICK_SVG) + PICK_TIER.map((T, k) => symV('mna-pick' + k, pickSvg(k >= 4 ? T.concat([1]) : T))).join('') + symV('mna-sp', BURST.s) + symV('mna-ch', BURST.c) + symV('mna-sp-u', `<g transform="rotate(-125)">${BURST.s}</g>`) + symV('mna-ch-u', `<g transform="rotate(-125)">${BURST.c}</g>`);
  let digDefsDone = false;
  function digDefs() {
    if (digDefsDone || typeof document === 'undefined' || !document.body) return; digDefsDone = true;
    document.body.insertAdjacentHTML('afterbegin', `<svg class="mna-ddefs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${DIG_DEFS}</svg>`);
  }
  // сноп: .s - искры, .c - крошка (анимации CSS на этих группах), рисунок - <use> общего символа
  const burstAt = (p, cls, u) => `<g class="${cls}" transform="translate(${f1(p[0])} ${f1(p[1])})" data-x="${f1(p[0])}" data-y="${f1(p[1])}"><g class="s"><use href="#mna-sp${u}"/></g><g class="c"><use href="#mna-ch${u}"/></g></g>`;
  // вырезать <g class="…batR…">…</g> целиком (с вложенными g)
  function cutGroup(svg, re) {
    const m = re.exec(svg); if (!m) return null; let i = m.index + m[0].length, depth = 1;
    const tag = /<g\b[^>]*?(\/?)>|<\/g>/g; tag.lastIndex = i; let t;
    while ((t = tag.exec(svg))) { if (t[0] === '</g>') depth--; else if (!t[1]) depth++; if (!depth) { const end = t.index + 4; return { g: svg.slice(m.index, end), rest: svg.slice(0, m.index) + svg.slice(end) }; } }
    return null;
  }
  const rot2 = (p, o, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s0 = Math.sin(a); return [o[0] + (p[0] - o[0]) * c - (p[1] - o[1]) * s0, o[1] + (p[0] - o[0]) * s0 + (p[1] - o[1]) * c]; };
  /** Человечек-копатель (mine2): стойка с киркой в правой лапе. login, v - { lk, g, gh }, o.minerHat. '' - не вышло (рисуем как раньше). */
  function digFig(login, v, o = {}) {
    css(); digDefs();
    const DD = typeof window !== 'undefined' && window.MDDoodle; if (!DD || !DD.jDoodle || (v && v.gh)) return '';
    let svg = '';
    try { svg = String(DD.jDoodle((DD.jhash || hs)(String(login).toLowerCase()), 'stern', false, { alive: true, armed: true, gear: { ...((v && v.g) || {}), w: undefined, s: undefined }, who: String(login).toLowerCase(), kit: 'peace', ...(o.minerHat ? { minerHat: true } : {}) }, (v && v.lk) || null)); } catch (e) { return ''; }
    svg = svg.replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*?(\/>|>[\s\S]*?<\/\1>)/g, '');
    const w = /<g class="jd-weapon" data-w="[^"]*" style="transform-origin:([-\d.]+)px ([-\d.]+)px">/.exec(svg); if (!w) return '';
    const hx = +w[1], hy = +w[2], arm = cutGroup(svg, /<g class="arm batR"[^>]*>/); if (!arm) return '';
    const sh = /M\s*([-\d.]+)[ ,]([-\d.]+)/.exec(arm.g); if (!sh) return '';
    const S0 = [+sh[1], +sh[2]];
    svg = arm.rest;
    const w2 = /<g class="jd-weapon" data-w="[^"]*" style="transform-origin:[-\d.]+px [-\d.]+px">/.exec(svg);
    const wg = cutGroup(svg, /<g class="jd-weapon"[^>]*>/); if (!w2 || !wg) return '';
    // точка удара: клюв кирки при ударе (рука +63° вбок, −14° вверх) - там сноп; digSync двигает его к поверхности камня
    const tip = [hx + PICK_TIP[0], hy + PICK_TIP[1]], hs1 = rot2(tip, S0, 66), hs2 = rot2(tip, S0, -15);
    // 26.10 (release-2510c): кирка в лапе - рисунок LGPickArt.held(уровень) (art/mine-gear), если он загружен; иначе символ ступени #mna-pickN (mine/pickaxe)
    const pLv = o.pick != null ? o.pick : o.pk, PA = pLv != null && pickTierOf(pLv) >= 0 && typeof window !== 'undefined' && window.LGPickArt;
    const pick = PA ? `<g class="mna-pk" data-pk="${pickTierOf(pLv)}" transform="translate(${f1(hx)} ${f1(hy)})">${PA.held(pickTierOf(pLv))}</g>` : `<use class="mna-pk" data-pk="${Math.max(0, pickTierOf(pLv))}" href="#mna-pick${pickTierOf(pLv) >= 0 ? pickTierOf(pLv) : ''}" x="${f1(hx)}" y="${f1(hy)}"/>`;
    const armG = `<g class="mna-arm" style="transform-origin:${f1(S0[0])}px ${f1(S0[1])}px">${arm.g}${pick}${wg.g}</g>`;
    const hit = burstAt(hs1, 'mna-ht', '') + burstAt(hs2, 'mna-ht u', '-u');   // камень сверху: искры и крошка - вниз
    svg = wg.rest.replace(/<\/svg>\s*$/, armG + hit + '</svg>');
    const bucket = Math.floor(Date.now() / 300000), q = hs(login + ':' + bucket);
    return svg.replace(/^<svg /, `<svg data-sq="${q % SEQS.length}" data-squ="${(q >>> 3) % SEQ_UP.length}" `).replace(/class="jl-doodle/, 'class="mna-dfig jl-doodle');
  }
  /** После обновления героев (mine.js heroes): сноп - у поверхности своего камня, камень вздрагивает в такт копателю, ≤ 40 снопов. */
  function digSync(heroesEl, barsEl) {
    if (!heroesEl) return;
    const rocks = barsEl ? [...barsEl.querySelectorAll('.mn-rk')].map((el) => ({ el, x: parseFloat(el.style.left) + 90, y: parseFloat(el.style.top) + 170, done: false })) : [];
    let n = 0;
    for (const h of heroesEl.querySelectorAll('.mn-h.dig')) {
      const f = h.querySelector('svg.mna-dfig'); if (!f) continue;
      const up = h.classList.contains('up');
      h.classList.toggle('nb', ++n > 40);
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(h.style.transform || ''); if (!m || !rocks.length) continue;
      const hx = +m[1], hy = +m[2], fl = h.classList.contains('fl') ? -1 : 1;
      let best = null, bd = 1e9; for (const r of rocks) { const dx = (r.x - hx) * fl, dd = up ? Math.abs(r.x - hx) + Math.abs(hy - r.y - 40) : Math.abs(dx - 90) + Math.abs(r.y - hy) * 0.7; if ((up ? r.y < hy : dx > 0) && dd < bd) { bd = dd; best = r; } }
      if (!best || bd > 260) continue;
      // fig: 76 × 108 px, низ по центру; svg 120 × 170. Копатель чуть подходит к камню (translate, не трогая transform героя),
      // чтобы клюв на ударе касался поверхности: сноп - в точке касания
      const K = 0.6333, g = f.querySelector(up ? '.mna-ht.u' : '.mna-ht:not(.u)'), fig = h.querySelector('.mn-fig');
      if (g && fig) {
        let ux = 0, uy = 0;
        if (!up) { const tipX = (+g.dataset.x - 60) * K, surf = Math.abs(best.x - hx) - 54; ux = Math.max(-26, Math.min(26, surf - tipX)) * (best.x > hx ? 1 : -1); }
        else { const tipH = (170 - +g.dataset.y) * K, gap = hy - best.y - 2; uy = -Math.max(0, Math.min(26, gap - tipH)); /* не больше 26 px: кот у нижнего края камня, а не на нём */ }
        const tr = `${ux.toFixed(1)}px ${uy.toFixed(1)}px`; if (fig.style.translate !== tr) fig.style.translate = tr;
      }
      for (const v of ['--ch1', '--ch2']) { const c = best.el.style.getPropertyValue(v); if (c && h.style.getPropertyValue(v) !== c) h.style.setProperty(v, c); }   // крошка - цвета своего камня
      if (!best.done) {   // камень вздрагивает в такт первому копателю у него (та же серия, то же время)
        best.done = true; const sq = up ? 'u' + f.dataset.squ : f.dataset.sq;
        if (best.el.dataset.sq !== sq) best.el.dataset.sq = sq;
        for (const v of ['--dd', '--dl']) best.el.style.setProperty(v, h.style.getPropertyValue(v) || (v === '--dd' ? '1.2s' : '0s'));
        try { const a = f.getAnimations()[0], b = best.el.getAnimations()[0]; if (a && b && a.currentTime != null) b.currentTime = a.currentTime; } catch (e) {}
      }
    }
  }
  /* --- рамки рисунков (тест «табличка не закрыта»): непрозрачная часть (прозрачнее 0,3 - ореолы, свечение - не в счёт) --- */
  function arcBox(x1, y1, rx, ry, phi, fa, fs, x2, y2, add) {
    rx = Math.abs(rx); ry = Math.abs(ry); if (!rx || !ry) return add(x2, y2);
    const c = Math.cos(phi), s0 = Math.sin(phi), dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = c * dx + s0 * dy, yp = -s0 * dx + c * dy, lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, den = rx * rx * yp * yp + ry * ry * xp * xp; let k = Math.sqrt(Math.max(0, num / (den || 1))); if (fa === fs) k = -k;
    const cxp = (k * rx * yp) / ry, cyp = (-k * ry * xp) / rx, cx = c * cxp - s0 * cyp + (x1 + x2) / 2, cy = s0 * cxp + c * cyp + (y1 + y2) / 2, m = Math.max(rx, ry);
    add(cx - m, cy - m); add(cx + m, cy + m);
  }
  function pathBox(d, add) {
    const t = String(d).match(/[a-zA-Z]|-?\d*\.?\d+/g) || []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
    const n = () => +t[i++];
    while (i < t.length) {
      if (/[a-zA-Z]/.test(t[i])) { cmd = t[i++]; if (cmd === 'Z' || cmd === 'z') { x = sx; y = sy; continue; } }
      const rel = cmd !== cmd.toUpperCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'M' || C === 'L' || C === 'T') { x = ox + n(); y = oy + n(); add(x, y); if (C === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; } }
      else if (C === 'H') { x = ox + n(); add(x, y); } else if (C === 'V') { y = oy + n(); add(x, y); }
      else if (C === 'Q' || C === 'S') { add(ox + n(), oy + n()); x = ox + n(); y = oy + n(); add(x, y); }
      else if (C === 'C') { add(ox + n(), oy + n()); add(ox + n(), oy + n()); x = ox + n(); y = oy + n(); add(x, y); }
      else if (C === 'A') { const rx = n(), ry = n(), ph = (n() * Math.PI) / 180, fa = n(), fs = n(), ex = ox + n(), ey = oy + n(); arcBox(x, y, rx, ry, ph, fa, fs, ex, ey, add); x = ex; y = ey; add(x, y); }
      else i++;
    }
  }
  const SYMBOX = new Map();
  /** Рамка непрозрачной части SVG-строки [x0, y0, x1, y1] (<use> - через символ; для тестов и проверок). */
  function bbox(svg) {
    let B = null; const grow = (b) => { if (!b) return; B = B ? [Math.min(B[0], b[0]), Math.min(B[1], b[1]), Math.max(B[2], b[2]), Math.max(B[3], b[3])] : b.slice(); };
    for (const m of String(svg).matchAll(/<(path|ellipse|circle|rect|use|text)\b([^>]*?)\/?>/g)) {
      const a = {}; for (const q of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) a[q[1]] = q[2];
      if (m[1] === 'use') {
        const id = (a.href || '').slice(1), sym = SYM.get(id) || (DMG.get(id.replace(/-(d|s)\d$/, '')) || []).find((x) => x.includes(`id="${id}"`));
        if (!sym) continue; let lb = SYMBOX.get(id); if (!lb) { lb = bbox(sym.replace(/^<symbol[^>]*>/, '')); SYMBOX.set(id, lb); } if (!lb) continue;
        const vb = (/viewBox="([^"]+)"/.exec(sym) || [])[1].split(' ').map(Number), k = +a.width / vb[2], X = (v) => +a.x + (v - vb[0]) * k, Y = (v) => +a.y + (v - vb[1]) * k;
        grow([X(lb[0]), Y(lb[1]), X(lb[2]), Y(lb[3])]); continue;
      }
      const fo2 = a['fill-opacity'] != null ? +a['fill-opacity'] : a.opacity != null ? +a.opacity : 1, so = a['stroke-opacity'] != null ? +a['stroke-opacity'] : a.opacity != null ? +a.opacity : 1;
      const fillOn = a.fill !== 'none' && a.fill !== 'transparent' && fo2 >= 0.3, strokeOn = a.stroke && a.stroke !== 'none' && so >= 0.3;
      if (!fillOn && !strokeOn) continue;
      const pad = strokeOn ? (+a['stroke-width'] || 1) / 2 : 0; let b = null; const add = (px, py) => { b = b ? [Math.min(b[0], px), Math.min(b[1], py), Math.max(b[2], px), Math.max(b[3], py)] : [px, py, px, py]; };
      if (m[1] === 'path') pathBox(a.d, add);
      else if (m[1] === 'ellipse' || m[1] === 'circle') { const rx = +(a.rx || a.r), ry = +(a.ry || a.r); add(+a.cx - rx, +a.cy - ry); add(+a.cx + rx, +a.cy + ry); }
      else if (m[1] === 'rect') { add(+a.x, +a.y); add(+a.x + +a.width, +a.y + +a.height); }
      else if (m[1] === 'text') { const fs = +a['font-size'] || 16; add(+a.x - fs * 0.6, +a.y - fs * 0.8); add(+a.x + fs * 0.6, +a.y + fs * 0.2); }
      if (b) grow([b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad]);
    }
    return B;
  }
  /** Галерея / отчёт: символы стадий (для отдельной картинки вне шахты). */
  const dmgDefs = (ids) => ids.map((id) => (DMG.get(id) || []).join('')).join('');

  // v: 3 - камни по рисунку зрителя (символы); v1 - прежние рисунки mine/art (для сравнения в галерее)
  /* ================= 25.10 (art/mine-entrance): предметы входа - подробнее, в стиле камней зрителя =================
     Плоский мультяшный рисунок: толстый тёмный контур, плоские тона, светлые плоскости сверху, тёмные - снизу и справа.
     Размеры и опоры - те же (FOOT в craftworld.js: подъёмник lx 150, вагонетка 330, доска W/2-10, «Скупка» W-210, Фонарщик fx 210).
     Нагрузка: каждый предмет - один общий <symbol> (в сцене и в копии для перекрытия героев - один <use>), внутри - слоями:
     заливки одного цвета слиты в один путь, контуры слоя - в один путь; фонарь - свой символ (5 штук на площадке - один рисунок).
     Ни фильтров, ни размытия, ни opacity у элементов (только fill-/stroke-opacity), ни анимаций. Надпись вывески - <text> в группе. */
  // кисть со слоями: в слое сначала заливки (по цвету - один путь), потом линии и контуры (по стилю - один путь)
  function Pen() {
    const layers = []; let cur = null;
    const L = () => { cur = { f: new Map(), s: new Map() }; layers.push(cur); return api; };
    const add = (m, k, d) => { if (!d) return api; if (!m.has(k)) m.set(k, []); m.get(k).push(d); return api; };
    const api = {
      L,
      f: (c, d, op) => add(cur.f, `fill="${c}"${op != null ? ` fill-opacity="${op}"` : ''}`, d),
      s: (c, w, d, op) => add(cur.s, `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op != null ? ` stroke-opacity="${op}"` : ''}`, d),
      o: (d, w = 4) => add(cur.s, `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`, d),
      raw: (h) => { cur.raw = (cur.raw || '') + h; return api; },
      out: () => layers.map((l) => [...l.f].map(([k, a]) => `<path d="${a.join(' ')}" ${k}/>`).join('') + [...l.s].map(([k, a]) => `<path d="${a.join(' ')}" ${k}/>`).join('') + (l.raw || '')).join(''),
    };
    return L();
  }
  // фигуры - строками пути
  const R_ = (x, y, w, h, rr = 0) => (rr ? `M${f1(x + rr)} ${f1(y)} h${f1(w - 2 * rr)} a${rr} ${rr} 0 0 1 ${rr} ${rr} v${f1(h - 2 * rr)} a${rr} ${rr} 0 0 1 ${-rr} ${rr} h${f1(-(w - 2 * rr))} a${rr} ${rr} 0 0 1 ${-rr} ${-rr} v${f1(-(h - 2 * rr))} a${rr} ${rr} 0 0 1 ${rr} ${-rr} Z ` : `M${f1(x)} ${f1(y)} h${f1(w)} v${f1(h)} h${f1(-w)} Z `);
  const C_ = (cx, cy, rr) => `M${f1(cx - rr)} ${f1(cy)} a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(rr * 2)} 0 a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-rr * 2)} 0 Z `;
  const E_ = (cx, cy, rx, ry) => `M${f1(cx - rx)} ${f1(cy)} a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(rx * 2)} 0 a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-rx * 2)} 0 Z `;
  const G_ = (pts) => P(pts) + ' ';
  const LN = (pts) => PL(pts) + ' ';
  const WD = { b: '#9a6636', l: '#c8925a', d: '#6a4020', g: '#5a3418' };    // дерево: основа, светлая плоскость, тень, волокна
  const WD2 = { b: '#7a4a24', l: '#a8703e', d: '#4e2c12', g: '#3e220e' };   // тёмное дерево (столбы)
  const IR = { b: '#5e5e6c', l: '#9a9aaa', d: '#3a3a46', h: '#c8c8d6' };   // железо
  const BR = { b: '#c8a050', l: '#f0d080', d: '#8a6a28' };                  // латунь
  // брус: основа, светлая плоскость сверху/слева, тень снизу/справа, волокна, контур (в слой пера)
  function plank(p, x, y, w, h, r, c = WD, o = {}) {
    p.f(c.b, R_(x, y, w, h));
    if (h > w) { p.f(c.l, R_(x, y, Math.max(3, w * 0.3), h)); p.f(c.d, R_(x + w * 0.72, y, w * 0.28, h)); for (let k = 0; k < Math.max(1, Math.floor(h / 46)); k++) { const yy = y + 14 + r() * (h - 30), xx = x + w * (0.38 + r() * 0.2); p.s(c.g, 1.6, `M${f1(xx)} ${f1(yy)} q${f1(w * 0.14)} 8 0 16 `); } }
    else { p.f(c.l, R_(x, y, w, Math.max(3, h * 0.32))); p.f(c.d, R_(x, y + h * 0.72, w, h * 0.28)); for (let k = 0; k < Math.max(1, Math.floor(w / 54)); k++) { const xx = x + 12 + r() * (w - 34), yy = y + h * (0.42 + r() * 0.16); p.s(c.g, 1.6, `M${f1(xx)} ${f1(yy)} q9 ${f1(-h * 0.14)} 18 0 `); } }
    if (o.end) p.f(c.d, o.end === 'l' ? R_(x, y, 6, h) : R_(x + w - 6, y, 6, h));
    p.o(R_(x, y, w, h), o.ow || 3.6);
  }
  // гвозди / заклёпки одним путём (шляпки + блик)
  function rivets(p, pts, rr = 2.6, c = IR) { let d = '', hl = ''; for (const [x, y] of pts) { d += C_(x, y, rr); hl += C_(x - rr * 0.3, y - rr * 0.3, rr * 0.36); } p.f(c.l, d).f('#ffffff', hl).o(d, 1.4); }
  // самородки горкой: у каждого цвета - основа, светлая грань, контур (одним путём на цвет)
  const NUG = [['#c8643a', '#e88a5a'], ['#2a2830', '#5a5866'], ['#ffcf3a', '#fff0a0'], ['#d8dce8', '#ffffff'], ['#a08a72', '#d0bca0'], ['#d8803a', '#f0b070'], ['#7fe8ff', '#d8f8ff']];
  function nuggets(p, list, r) {
    const by = new Map();
    for (const [x, y, k, ci] of list) {
      const n = 7, pts = [], a0 = r() * 6.28; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * 6.28, j = 0.8 + r() * 0.35; pts.push([x + Math.cos(a) * k * j, y + Math.sin(a) * k * 0.82 * j]); }
      const c = NUG[ci % NUG.length], e = by.get(ci) || { b: '', l: '' };
      e.b += G_(pts); e.l += G_([[x - k * 0.7, y - k * 0.1], [x - k * 0.2, y - k * 0.7], [x + k * 0.45, y - k * 0.5], [x + k * 0.05, y - k * 0.05]]); by.set(ci, e);
    }
    for (const [ci, e] of by) p.f(NUG[ci % NUG.length][0], e.b).f(NUG[ci % NUG.length][1], e.l);
    let ol = ''; for (const e of by.values()) ol += e.b; p.o(ol, 2.6);
  }
  // фонарь (общий символ): кованая рамка, стекло, огонёк, ореол; рисуется вокруг (0, 0) - низ рамки на y=12
  const LANT = 'mre-lantern';
  function lanternSym() {
    if (SYM.has(LANT)) return;
    const p = Pen();
    p.f('url(#mnaGlow)', C_(0, 4, 60));
    p.L().s(INK, 2.6, `M0 -24 v-6 `).s(INK, 2.2, C_(0, -33, 4));
    p.L().f('#3a3442', G_([[-12, -16], [0, -27], [12, -16]])).f('#5a5466', G_([[-8, -17], [0, -24], [0, -17]])).o(G_([[-12, -16], [0, -27], [12, -16]]), 2.6);
    p.L().f('#ffe9a0', R_(-9, -16, 18, 24, 2)).f('#fff6d0', R_(-7, -14, 6, 20, 2)).f('#ff9a2a', `M0 4 q-5 -6 0 -14 q5 7 0 14 Z `).f('#fff6c0', `M0 3 q-2.4 -3 0 -7 q2.4 4 0 7 Z `)
      .s(INK, 1.6, `M-9 -4 h18 M0 -16 v6 `, 0.55).o(R_(-9, -16, 18, 24, 2), 2.8);
    p.L().f('#3a3442', R_(-11, 7, 22, 5, 1.5)).f('#5a5466', R_(-11, 7, 22, 2, 1)).o(R_(-11, 7, 22, 5, 1.5), 2.4);
    SYM.set(LANT, symOf(LANT, [-70, -70, 140, 140], p.out()));
  }
  const lantern2 = (x, y, k = 1) => { lanternSym(); return useOf(LANT, x, y, k, [-70, -70, 140, 140]); };
  // вывеска-доска: плашка со светлой кромкой сверху, тенью снизу, гвоздями; надпись - отдельно (<text> в группе предмета)
  function signBoard(p, x, y, w, h, c = WD2, point = 0) {
    const L0 = x - w / 2, sh = point ? [[L0, y - h / 2], [L0 + w - point, y - h / 2], [L0 + w, y], [L0 + w - point, y + h / 2], [L0, y + h / 2]] : null;
    const body = sh ? G_(sh) : R_(L0, y - h / 2, w, h, 6);
    p.f(c.b, body).f(c.l, R_(L0 + 4, y - h / 2 + 3, w - 8 - point, h * 0.22, 3)).f(c.d, R_(L0 + 4, y + h / 2 - h * 0.24, w - 8 - point * 0.6, h * 0.18, 3)).o(body, 3.8);
  }
  const signText = (x, y, t, size) => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="${size}" fill="#ffe27a" stroke="${INK}" stroke-width="4.5" paint-order="stroke">${t}</text>`;
  // предмет - символ в мировых координатах (рамка - область рисунка), в сцене - <use> + надпись
  function objSym(id, box, body) { if (!SYM.has(id)) SYM.set(id, symOf(id, box, body)); return `<use href="#${id}" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"/>`; }

  /* --- подъёмник «В город»: копёр с укосинами, шкив со спицами, тросы, клеть с решёткой и дверцей, сигнальный колокол,
         площадка из камня, фонарь на кронштейне, вывеска на кованых стойках --- */
  function lift2(r) {
    const lx = 150, ly = 2406, p = Pen();
    p.raw(`<ellipse cx="${f1(lx + 6)}" cy="${f1(ly + 2)}" rx="118" ry="14" fill="#000" fill-opacity="0.32"/>`);
    // проём ствола за клетью
    p.L().f('#1a1420', R_(lx - 74, ly - 150, 148, 140)).f('#2a2230', R_(lx - 74, ly - 150, 148, 18)).o(R_(lx - 74, ly - 150, 148, 140), 3.2);
    // опоры: камни под стойками
    p.L(); for (const sx of [lx - 98, lx + 68]) { p.f('#6a6270', R_(sx, ly - 22, 30, 22, 4)).f('#8a8290', R_(sx + 3, ly - 20, 24, 6, 3)); p.o(R_(sx, ly - 22, 30, 22, 4), 3); }
    // стойки копра
    p.L(); plank(p, lx - 92, ly - 236, 18, 220, r, WD2); plank(p, lx + 74, ly - 236, 18, 220, r, WD2);
    // укосины (параллелограммы) - к верхней балке
    p.L(); for (const sg of [-1, 1]) { const a = [lx + sg * 74, ly - 158], b = [lx + sg * 30, ly - 230], n = [sg * 6, 4]; const q = [[a[0], a[1]], [b[0], b[1]], [b[0] + n[0] * 2, b[1] + n[1] * 2.6], [a[0] + n[0] * 2, a[1] + n[1] * 2.6]]; p.f(WD.b, G_(q)).f(WD.l, G_([q[0], q[1], [b[0] + n[0] * 0.7, b[1] + n[1] * 0.9], [a[0] + n[0] * 0.7, a[1] + n[1] * 0.9]])).o(G_(q), 3.4); }
    // верхняя балка с торцами
    p.L(); plank(p, lx - 112, ly - 252, 224, 20, r, WD); p.f(WD.d, R_(lx - 112, ly - 252, 7, 20) + R_(lx + 105, ly - 252, 7, 20)).s(WD.g, 1.4, C_(lx - 108.5, ly - 242, 2.5) + C_(lx + 108.5, ly - 242, 2.5));
    rivets(p, [[lx - 100, ly - 242], [lx + 100, ly - 242], [lx - 83, ly - 214], [lx + 83, ly - 214], [lx - 83, ly - 40], [lx + 83, ly - 40]]);
    // стойки вывески (кованые) и подвес шкива
    p.L().s(INK, 6, `M${lx - 54} ${ly - 252} V${ly - 278} M${lx + 54} ${ly - 252} V${ly - 278} `).s(IR.l, 2.6, `M${lx - 54} ${ly - 252} V${ly - 278} M${lx + 54} ${ly - 252} V${ly - 278} `)
      .f(IR.b, R_(lx - 10, ly - 236, 20, 12, 3)).o(R_(lx - 10, ly - 236, 20, 12, 3), 2.6);
    // шкив
    const sx = lx, sy = ly - 222;
    p.L().f(IR.d, C_(sx, sy, 23)).f(IR.b, C_(sx, sy, 20)).f('#2a2632', C_(sx, sy, 14)).s(IR.l, 3, `M${f1(sx - 17)} ${f1(sy - 8)} A19 19 0 0 1 ${f1(sx + 8)} ${f1(sy - 17)} `);
    let sp = ''; for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; sp += `M${f1(sx)} ${f1(sy)} L${f1(sx + Math.cos(a) * 14)} ${f1(sy + Math.sin(a) * 14)} `; }
    p.s(IR.l, 3, sp).f(BR.b, C_(sx, sy, 5)).f(BR.l, C_(sx - 1.4, sy - 1.4, 1.8)).o(C_(sx, sy, 23) + C_(sx, sy, 14) + C_(sx, sy, 5), 3);
    // тросы
    p.L().s(INK, 4.4, `M${sx - 20} ${sy + 2} V${ly - 140} M${sx + 20} ${sy + 2} V${ly - 140} `).s('#8a8a9a', 2, `M${sx - 20} ${sy + 2} V${ly - 140} M${sx + 20} ${sy + 2} V${ly - 140} `).s('#d0d0dc', 1.2, `M${sx + 20} ${sy + 6} V${ly - 144} `, 0.8);
    // клеть: крыша, рама, решётка, перекладины, дверца с засовом, пол
    p.L().f(IR.b, G_([[lx - 70, ly - 138], [lx - 62, ly - 152], [lx + 62, ly - 152], [lx + 70, ly - 138]])).f(IR.l, G_([[lx - 64, ly - 141], [lx - 58, ly - 150], [lx + 58, ly - 150], [lx + 64, ly - 141]])).o(G_([[lx - 70, ly - 138], [lx - 62, ly - 152], [lx + 62, ly - 152], [lx + 70, ly - 138]]), 3.4)
      .f(BR.b, R_(lx - 10, ly - 158, 20, 8, 2)).o(R_(lx - 10, ly - 158, 20, 8, 2), 2.4);
    p.L().f('#2a2632', R_(lx - 64, ly - 138, 128, 124, 4)).f('#3c3446', R_(lx - 56, ly - 130, 112, 108)).f('#4a4256', R_(lx - 56, ly - 130, 112, 14)).f('#5a4a3a', R_(lx - 56, ly - 34, 112, 12)).f('#7a6248', R_(lx - 56, ly - 34, 112, 4));
    let bars = '', bhl = ''; for (let k = 0; k < 6; k++) { const bx = lx - 46 + k * 18.4; bars += `M${f1(bx)} ${ly - 130} V${ly - 22} `; bhl += `M${f1(bx - 1.5)} ${ly - 128} V${ly - 24} `; }
    p.s(IR.b, 4.4, bars).s(IR.h, 1.3, bhl).s(IR.d, 8, `M${lx - 64} ${ly - 112} H${lx + 64} M${lx - 64} ${ly - 60} H${lx + 64} `).s(IR.l, 2.4, `M${lx - 62} ${ly - 114} H${lx + 62} M${lx - 62} ${ly - 62} H${lx + 62} `)
      .s(BR.b, 6, `M${lx - 68} ${ly - 140} h136 `).o(R_(lx - 64, ly - 138, 128, 124, 4), 5);
    rivets(p, [[lx - 58, ly - 132], [lx + 58, ly - 132], [lx - 58, ly - 20], [lx + 58, ly - 20], [lx - 58, ly - 112], [lx + 58, ly - 112], [lx - 58, ly - 60], [lx + 58, ly - 60]], 2.6);
    // засов дверцы
    p.L().f(BR.b, R_(lx + 34, ly - 92, 22, 10, 3)).f(BR.l, R_(lx + 36, ly - 91, 18, 3, 1.5)).o(R_(lx + 34, ly - 92, 22, 10, 3), 2.4).f(IR.d, C_(lx + 30, ly - 87, 4)).o(C_(lx + 30, ly - 87, 4), 2);
    // площадка
    p.L().f('#5a5260', R_(lx - 86, ly - 14, 172, 16, 3)).f('#7a7280', R_(lx - 84, ly - 13, 168, 5, 2)).s(INK, 2, `M${lx - 44} ${ly - 8} v9 M${lx} ${ly - 8} v9 M${lx + 44} ${ly - 8} v9 `, 0.45).o(R_(lx - 86, ly - 14, 172, 16, 3), 3.4);
    // сигнальный колокол на левой стойке: кронштейн, колокол, шнур
    const bx = lx - 102, by = ly - 132;
    p.L().s(INK, 6, `M${lx - 92} ${by - 14} H${bx} `).s(IR.l, 2.6, `M${lx - 92} ${by - 14} H${bx} `)
      .f(BR.b, `M${bx - 8} ${by + 10} Q${bx - 8} ${by - 10} ${bx} ${by - 10} Q${bx + 8} ${by - 10} ${bx + 8} ${by + 10} Z `).f(BR.l, `M${bx - 5} ${by + 6} Q${bx - 5} ${by - 6} ${bx - 1} ${by - 7} V${by + 6} Z `).f(BR.d, R_(bx - 10, by + 8, 20, 5, 2))
      .o(`M${bx - 8} ${by + 10} Q${bx - 8} ${by - 10} ${bx} ${by - 10} Q${bx + 8} ${by - 10} ${bx + 8} ${by + 10} Z ` + R_(bx - 10, by + 8, 20, 5, 2), 2.8)
      .s('#c8a878', 2.2, `M${bx} ${by + 13} q4 18 -2 34 q-3 10 2 18 `).f('#c8a878', C_(bx + 1, by + 67, 3.5)).o(C_(bx + 1, by + 67, 3.5), 1.8);
    // кронштейн фонаря
    p.L().s(INK, 6, `M${lx + 92} ${ly - 200} H${lx + 104} V${ly - 204} `).s(IR.l, 2.6, `M${lx + 92} ${ly - 200} H${lx + 104} `).s(INK, 3, `M${lx + 92} ${ly - 186} L${lx + 102} ${ly - 199} `);
    // вывеска
    p.L(); signBoard(p, lx, ly - 275, 156, 32, WD2, 0); rivets(p, [[lx - 70, ly - 275], [lx + 70, ly - 275]], 2.4);
    const box = [30, 2096, 290, 330];
    return { svg: objSym('mre-lift', box, p.out()) + lantern2(lx + 104, ly - 170, 1) + signText(lx, ly - 267, 'В ГОРОД ↓', 21) };
  }

  /* --- «Скупка»: полосатый навес с объёмными фестонами и кантом, вывеска, столбы, прилавок из досок с уголками, весы с чашами,
         стопки монет, мешки с рудой, ящик, книга учёта с пером, фонарь --- */
  function buyer2(r) {
    const nx = 814, ny = 2356, p = Pen();
    p.raw(`<ellipse cx="${f1(nx + 6)}" cy="${f1(ny + 36)}" rx="150" ry="16" fill="#000" fill-opacity="0.3"/>`);
    // столбы
    p.L(); plank(p, nx - 150, ny - 186, 16, 222, r, WD2); plank(p, nx + 134, ny - 186, 16, 222, r, WD2);
    // задняя стенка лавки из досок и полка с банками самоцветов
    p.L().f(WD2.d, R_(nx - 134, ny - 180, 268, 124)).f('#5e3818', R_(nx - 134, ny - 180, 268, 10));
    let bw = ''; for (let k = 1; k < 9; k++) bw += `M${f1(nx - 134 + k * 29.8)} ${ny - 170} V${ny - 58} `;
    p.s(WD2.g, 2, bw).o(R_(nx - 134, ny - 180, 268, 124), 3);
    p.L(); plank(p, nx - 118, ny - 150, 150, 9, r, WD, { ow: 3 });
    p.s(INK, 4, `M${nx - 104} ${ny - 141} l8 10 M${nx + 18} ${ny - 141} l-8 10 `);
    p.L(); let jar = '', jarL = '', lid = '';
    const JR = [[nx - 96, '#2fd07a'], [nx - 64, '#3a7aff'], [nx - 32, '#ff2a4a'], [nx, '#ffc23a']];
    for (const [jx] of JR) { jar += R_(jx - 10, ny - 174, 20, 24, 5); jarL += R_(jx - 7, ny - 170, 4, 16, 2); lid += R_(jx - 8, ny - 178, 16, 5, 2); }
    p.f('#cfe8f0', jar, 0.55);
    for (const [jx, c] of JR) p.f(c, G_([[jx - 7, ny - 152], [jx - 4, ny - 162], [jx, ny - 156], [jx + 5, ny - 164], [jx + 7, ny - 152]]));
    p.f('#ffffff', jarL, 0.8).f('#8a6a28', lid).o(jar + lid, 2.4);
    p.L(); plank(p, nx - 122, ny - 104, 64, 50, r, WD, { ow: 3.6 });
    p.f(WD.d, `M${nx - 118} ${ny - 58} L${nx - 62} ${ny - 100} `).s(WD.d, 6, `M${nx - 117} ${ny - 60} L${nx - 63} ${ny - 98} `).s(WD.l, 2.4, `M${nx - 117} ${ny - 62} L${nx - 63} ${ny - 100} `);
    rivets(p, [[nx - 116, ny - 98], [nx - 64, ny - 98], [nx - 116, ny - 60], [nx - 64, ny - 60]], 2.2);
    p.L(); nuggets(p, [[nx - 110, ny - 108, 9, 0], [nx - 96, ny - 112, 10, 1], [nx - 82, ny - 108, 9, 2], [nx - 70, ny - 110, 8, 3]], r);
    // мешки: завязка, складки, светлая сторона
    p.L();
    for (const [mx, w, h, t] of [[nx - 30, 22, 50, 0], [nx - 2, 18, 40, 1]]) {
      const sk = `M${mx - w} ${ny - 58} Q${mx - w - 4} ${ny - 58 - h * 0.7} ${mx - 6} ${ny - 58 - h * 0.92} L${mx - 8} ${ny - 58 - h - 4} Q${mx} ${ny - 58 - h - 10} ${mx + 8} ${ny - 58 - h - 4} L${mx + 6} ${ny - 58 - h * 0.92} Q${mx + w + 4} ${ny - 58 - h * 0.7} ${mx + w} ${ny - 58} Z `;
      p.f(t ? '#b89868' : '#c8a878', sk).f(t ? '#d4b888' : '#e4cca0', `M${mx - w + 4} ${ny - 62} Q${mx - w + 2} ${ny - 58 - h * 0.62} ${mx - 4} ${ny - 58 - h * 0.86} L${mx - 2} ${ny - 62} Z `)
        .s('#7a5a38', 2, `M${mx - 6} ${ny - 58 - h * 0.9} q6 3 12 0 M${mx - w * 0.4} ${ny - 64} q-3 -14 2 -26 `).o(sk, 3.2);
    }
    p.L(); nuggets(p, [[nx - 36, ny - 112, 6, 2], [nx - 26, ny - 114, 5.5, 3], [nx - 4, ny - 102, 5, 0]], r);
    // весы
    const vx = nx + 60;
    p.L().f(WD2.b, R_(vx - 16, ny - 66, 32, 10, 3)).o(R_(vx - 16, ny - 66, 32, 10, 3), 2.8)
      .s(INK, 8, `M${vx} ${ny - 62} V${ny - 124} M${vx - 34} ${ny - 118} H${vx + 34} `).s(BR.b, 4.4, `M${vx} ${ny - 62} V${ny - 124} M${vx - 34} ${ny - 118} H${vx + 34} `).s(BR.l, 1.6, `M${vx - 1.4} ${ny - 64} V${ny - 122} M${vx - 32} ${ny - 119.6} H${vx + 32} `)
      .f(BR.b, C_(vx, ny - 127, 6)).f(BR.l, C_(vx - 1.6, ny - 128.6, 2)).o(C_(vx, ny - 127, 6), 2.4);
    p.L(); let st = '', pan = '', panL = '';
    for (const px of [vx - 30, vx + 30]) { st += `M${px} ${ny - 118} L${px - 13} ${ny - 92} M${px} ${ny - 118} L${px + 13} ${ny - 92} `; pan += `M${px - 18} ${ny - 92} h36 q-4 10 -18 10 q-14 0 -18 -10 Z `; panL += `M${px - 14} ${ny - 91} h22 q-3 4 -10 5 q-9 0 -12 -5 Z `; }
    p.s('#7a6a40', 1.6, st).f(BR.b, pan).f(BR.l, panL).o(pan, 2.4);
    p.L(); nuggets(p, [[vx + 30, ny - 99, 6.5, 0], [vx + 36, ny - 103, 4.5, 2]], r); p.raw(twinkle(vx - 28, ny - 100, 0.7, '#fff6c0'));
    // прилавок: доски спереди, уголки, столешница с кромкой, тень под столешницей
    p.L().f(WD.b, R_(nx - 124, ny - 40, 248, 76, 4)).f(WD.l, R_(nx - 124, ny - 40, 248, 8)).f(WD.d, R_(nx + 84, ny - 38, 38, 72) + R_(nx - 122, ny + 22, 244, 12));
    let seam = ''; for (let k = 1; k < 6; k++) seam += `M${f1(nx - 124 + k * 41.3)} ${ny - 34} V${ny + 34} `;
    p.s(WD.g, 2.6, seam).s(WD.g, 1.6, `M${nx - 96} ${ny - 8} q8 -6 16 0 M${nx + 10} ${ny + 8} q8 -6 16 0 M${nx - 40} ${ny + 14} q8 -6 16 0 `).o(R_(nx - 124, ny - 40, 248, 76, 4), 5);
    p.L().f(IR.b, G_([[nx - 124, ny - 40], [nx - 104, ny - 40], [nx - 124, ny - 20]]) + G_([[nx + 124, ny - 40], [nx + 104, ny - 40], [nx + 124, ny - 20]]) + G_([[nx - 124, ny + 36], [nx - 104, ny + 36], [nx - 124, ny + 16]]) + G_([[nx + 124, ny + 36], [nx + 104, ny + 36], [nx + 124, ny + 16]]))
      .o(G_([[nx - 124, ny - 40], [nx - 104, ny - 40], [nx - 124, ny - 20]]) + G_([[nx + 124, ny - 40], [nx + 104, ny - 40], [nx + 124, ny - 20]]) + G_([[nx - 124, ny + 36], [nx - 104, ny + 36], [nx - 124, ny + 16]]) + G_([[nx + 124, ny + 36], [nx + 104, ny + 36], [nx + 124, ny + 16]]), 2.4);
    rivets(p, [[nx - 116, ny - 34], [nx + 116, ny - 34], [nx - 116, ny + 28], [nx + 116, ny + 28], [nx - 70, ny - 28], [nx - 29, ny - 28], [nx + 12, ny - 28], [nx + 53, ny - 28], [nx - 70, ny + 24], [nx - 29, ny + 24], [nx + 12, ny + 24], [nx + 53, ny + 24]], 2.4);
    p.L().f('#6a4020', R_(nx - 136, ny - 58, 272, 22, 6)).f('#a87040', R_(nx - 132, ny - 56, 264, 7, 3)).f('#4a2a12', R_(nx - 134, ny - 42, 268, 5, 2)).o(R_(nx - 136, ny - 58, 272, 22, 6), 4);
    // книга учёта с пером
    p.L().f('#5a2a3a', G_([[nx + 92, ny - 58], [nx + 96, ny - 72], [nx + 128, ny - 72], [nx + 124, ny - 58]])).f('#f3efd8', G_([[nx + 98, ny - 61], [nx + 100, ny - 69], [nx + 124, ny - 69], [nx + 122, ny - 61]])).s('#8a8070', 1.4, `M${nx + 103} ${ny - 66} h8 M${nx + 113} ${ny - 66} h8 M${nx + 103} ${ny - 63} h7 `)
      .o(G_([[nx + 92, ny - 58], [nx + 96, ny - 72], [nx + 128, ny - 72], [nx + 124, ny - 58]]), 2.6).s(INK, 4, `M${nx + 116} ${ny - 64} l14 -26 `).s('#f3efd8', 2.2, `M${nx + 116} ${ny - 64} l14 -26 `).f('#f3efd8', `M${nx + 126} ${ny - 82} q8 -12 10 -16 q-2 12 -6 18 Z `).o(`M${nx + 126} ${ny - 82} q8 -12 10 -16 q-2 12 -6 18 Z `, 1.8);
    // монеты стопками
    p.L(); let cn = '', cl = '', ce = '';
    for (const [cx, n] of [[nx - 2, 4], [nx + 22, 2], [nx + 40, 1]]) for (let k = 0; k < n; k++) { const cy = ny - 60 - k * 5; cn += E_(cx, cy, 11, 4.5); cl += E_(cx - 1, cy - 1, 7, 2.2); ce += `M${cx - 11} ${cy} q11 6 22 0 `; }
    p.f('#ffcf3a', cn).f('#fff0a0', cl).s('#b07a10', 1.6, ce).o(cn, 2.1);
    // навес: полосы ткани, светлая плоскость сверху, тень снизу, фестоны с тенью, кант
    p.L(); const ay = ny - 228, ah = 48, x0 = nx - 158, wS = 316, n = 6, sw = wS / n;
    let red = '', wht = '', redL = '', whtL = '';
    const xt = (k) => x0 + k * sw, xb = (k) => x0 - 10 + (k * (wS + 20)) / n, xm = (k) => x0 - 3 + (k * (wS + 6)) / n;
    for (let k = 0; k < n; k++) { const q = G_([[xt(k), ay], [xt(k + 1), ay], [xb(k + 1), ay + ah], [xb(k), ay + ah]]), ql = G_([[xt(k), ay], [xt(k + 1), ay], [xm(k + 1), ay + 14], [xm(k), ay + 14]]); if (k % 2) { wht += q; whtL += ql; } else { red += q; redL += ql; } }
    p.f('#b5332a', red).f('#f3efd8', wht).f('#d8564a', redL).f('#ffffff', whtL).f('#000', R_(x0, ay + ah - 12, wS + 10, 12), 0.14).o(G_([[x0, ay], [x0 + wS, ay], [x0 + wS + 10, ay + ah], [x0 - 10, ay + ah]]), 4);
    p.L(); let fR = '', fW = '', fRd = '', fWd = '';
    for (let k = 0; k < 6; k++) { const fx = nx - 168 + k * 56, d = `M${fx} ${ay + ah} q28 28 56 0 Z `, dd = `M${fx + 8} ${ay + ah + 4} q20 16 40 0 q-20 8 -40 0 Z `; if (k % 2) { fW += d; fWd += dd; } else { fR += d; fRd += dd; } }
    p.f('#b5332a', fR).f('#f3efd8', fW).f('#8a2018', fRd).f('#d8d0b8', fWd).o(fR + fW, 3);
    p.L().s(INK, 8, `M${nx - 154} ${ay - 3} h308 `).s(BR.b, 4.6, `M${nx - 154} ${ay - 3} h308 `).s(BR.l, 1.6, `M${nx - 150} ${ay - 4.4} h300 `);
    // вывеска
    p.L().f('#7a1a14', R_(nx - 76, ny - 264, 152, 36, 8)).f('#a83a2a', R_(nx - 70, ny - 261, 140, 8, 4)).f('#5a0e0a', R_(nx - 70, ny - 238, 140, 6, 3)).o(R_(nx - 76, ny - 264, 152, 36, 8), 3.6)
      .s(INK, 4, `M${nx - 50} ${ny - 230} v-4 M${nx + 50} ${ny - 230} v-4 `);
    rivets(p, [[nx - 66, ny - 246], [nx + 66, ny - 246]], 2.4);
    // кронштейн фонаря
    p.L().s(INK, 5, `M${nx + 150} ${ny - 186} h-8 V${ny - 190} `);
    const box = [640, 2084, 372, 330];
    return { svg: objSym('mre-buyer', box, p.out()) + lantern2(nx + 142, ny - 160, 0.85) + signText(nx, ny - 240, 'СКУПКА', 21) };
  }

  /* --- доска «Поручения»: двускатный козырёк из дранки, рама из брусьев, пробковое поле с крапом, листки с загнутым углом,
         строчками, булавками и рисунками (кирка, монета, самоцвет), полочка с мелом --- */
  function board2(r) {
    const bx = 502, by = 2416, p = Pen();
    p.raw(`<ellipse cx="${f1(bx + 4)}" cy="${f1(by + 2)}" rx="78" ry="11" fill="#000" fill-opacity="0.3"/>`);
    p.L(); plank(p, bx - 58, by - 160, 14, 160, r, WD2); plank(p, bx + 44, by - 160, 14, 160, r, WD2);
    p.f('#6a6270', R_(bx - 62, by - 10, 22, 10, 3) + R_(bx + 40, by - 10, 22, 10, 3)).o(R_(bx - 62, by - 10, 22, 10, 3) + R_(bx + 40, by - 10, 22, 10, 3), 2.6);
    // рама и пробка
    p.L().f(WD2.b, R_(bx - 78, by - 202, 156, 110, 6)).f(WD2.l, R_(bx - 76, by - 200, 152, 6, 3)).f(WD2.d, R_(bx - 76, by - 100, 152, 6, 3)).o(R_(bx - 78, by - 202, 156, 110, 6), 5);
    p.L().f('#c49a62', R_(bx - 68, by - 192, 136, 90, 3)).f('#d8b07a', R_(bx - 68, by - 192, 136, 10, 3));
    let cork = ''; for (let k = 0; k < 22; k++) cork += C_(bx - 62 + r() * 124, by - 180 + r() * 72, 1 + r() * 1.3);
    p.f('#8a6038', cork, 0.7).o(R_(bx - 68, by - 192, 136, 90, 3), 2.6);
    // листки (с наклоном - точки поворачиваем сами, без transform)
    p.L(); let paper = '', fold = '', lines = '', ol = '';
    const notes = [[bx - 46, by - 182, -6], [bx - 2, by - 176, 0], [bx + 42, by - 182, 6]];
    for (const [px, py, a] of notes) {
      const rt = (x, y) => rot(x, y, px, py + 24, (a * Math.PI) / 180);
      const q = [rt(px - 17, py), rt(px + 17, py), rt(px + 17, py + 37), rt(px + 8, py + 46), rt(px - 17, py + 46)];
      paper += G_(q); fold += G_([rt(px + 17, py + 37), rt(px + 8, py + 37), rt(px + 8, py + 46)]); ol += G_(q);
      for (let k = 0; k < 3; k++) lines += LN([rt(px - 11, py + 12 + k * 8), rt(px + (k === 2 ? 2 : 11), py + 12 + k * 8)]);
    }
    p.f('#f3efd8', paper).f('#d8d0b8', fold).s('#8a8070', 2, lines).o(ol, 2.4);
    // рисунки на листках: кирка, монета, самоцвет
    p.L().s('#6a4020', 2.4, `M${bx - 50} ${by - 144} l10 -8 `).s('#5a5a68', 2.6, `M${bx - 50} ${by - 152} q6 -2 10 4 `)
      .f('#ffcf3a', C_(bx - 2, by - 142, 5)).o(C_(bx - 2, by - 142, 5), 1.6)
      .f('#7fe8ff', G_([[bx + 38, by - 140], [bx + 34, by - 146], [bx + 38, by - 152], [bx + 42, by - 146]])).o(G_([[bx + 38, by - 140], [bx + 34, by - 146], [bx + 38, by - 152], [bx + 42, by - 146]]), 1.6);
    p.L(); const pins = [[bx - 46, by - 178, '#e8455c'], [bx - 2, by - 172, '#3a7aff'], [bx + 42, by - 178, '#7ff07a']];
    for (const [x, y, c] of pins) p.f(c, C_(x, y, 4));
    p.f('#ffffff', pins.map(([x, y]) => C_(x - 1.2, y - 1.2, 1.3)).join('')).o(pins.map(([x, y]) => C_(x, y, 4)).join(''), 1.8);
    // полочка с мелом
    p.L().f(WD.b, R_(bx - 40, by - 96, 80, 7, 2)).f(WD.l, R_(bx - 40, by - 96, 80, 2.5, 1)).o(R_(bx - 40, by - 96, 80, 7, 2), 2.6).f('#f3efd8', R_(bx - 22, by - 101, 16, 5, 2) + R_(bx + 6, by - 100, 10, 4, 2)).o(R_(bx - 22, by - 101, 16, 5, 2) + R_(bx + 6, by - 100, 10, 4, 2), 1.6);
    // козырёк: дранка рядами, светлый верхний ряд, конёк
    p.L(); const roof = G_([[bx - 92, by - 198], [bx, by - 228], [bx + 92, by - 198], [bx + 86, by - 192], [bx, by - 220], [bx - 86, by - 192]]);
    p.f('#6a4020', roof); let sh = '', shL = ''; for (let k = 0; k < 7; k++) { const t = k / 7, xL = bx - 92 + 92 * t, yL = by - 198 - 30 * t; sh += `M${f1(xL)} ${f1(yL)} l${f1(4)} ${f1(6)} M${f1(2 * bx - xL)} ${f1(yL)} l${f1(-4)} ${f1(6)} `; if (k % 2) shL += `M${f1(xL + 2)} ${f1(yL - 1)} l${f1(10)} ${f1(-3.3)} M${f1(2 * bx - xL - 2)} ${f1(yL - 1)} l${f1(-10)} ${f1(-3.3)} `; }
    p.s('#3e220e', 1.8, sh).s('#a87040', 2.6, shL).o(roof, 3.6).f(WD2.b, C_(bx, by - 226, 4)).o(C_(bx, by - 226, 4), 2);
    rivets(p, [[bx - 70, by - 194], [bx + 70, by - 194], [bx - 70, by - 100], [bx + 70, by - 100]], 2.4);
    // вывеска над козырьком
    p.L(); signBoard(p, bx, by - 231, 156, 24, WD2, 0);
    const box = [404, 2160, 196, 274];
    return { svg: objSym('mre-board', box, p.out()) + signText(bx, by - 225, 'ПОРУЧЕНИЯ', 16) };
  }

  /* --- вагонетка на рельсах: шпалы, рельсы с бликом, кузов с поясом, рёбрами и заклёпками, колёса со спицами,
         горка руды разных пород, лопата в руде, буфер и сцепка --- */
  function cart2(r) {
    const cx = 330, cy = 2326, p = Pen();
    p.raw(`<ellipse cx="${f1(cx + 4)}" cy="${f1(cy + 14)}" rx="108" ry="10" fill="#000" fill-opacity="0.3"/>`);
    // шпалы и рельсы
    p.L(); let ties = '', tiesL = ''; for (const dx of [-100, -64, -28, 8, 44, 80]) { ties += R_(cx + dx, cy + 5, 16, 13, 2); tiesL += R_(cx + dx + 1, cy + 6, 14, 4, 1.5); }
    p.f('#6a4020', ties).f('#9a6636', tiesL).o(ties, 2.2);
    p.L().s(INK, 5.4, `M${cx - 112} ${cy + 9} H${cx + 112} M${cx - 112} ${cy + 16} H${cx + 112} `).s('#8a8a9a', 2.6, `M${cx - 112} ${cy + 9} H${cx + 112} M${cx - 112} ${cy + 16} H${cx + 112} `).s('#e0e0ea', 1, `M${cx - 108} ${cy + 8} H${cx + 108} `);
    // руда горкой (за кромкой) и лопата
    p.L().s(INK, 6, `M${cx + 36} ${cy - 80} l22 -12 `).s('#a87040', 3, `M${cx + 36} ${cy - 80} l22 -12 `).f('#7a7a88', G_([[cx + 56, cy - 94], [cx + 70, cy - 100], [cx + 76, cy - 92], [cx + 62, cy - 84]])).f('#a8a8b8', G_([[cx + 58, cy - 93], [cx + 69, cy - 98], [cx + 71, cy - 95], [cx + 60, cy - 90]])).o(G_([[cx + 56, cy - 94], [cx + 70, cy - 100], [cx + 76, cy - 92], [cx + 62, cy - 84]]), 2.4);
    p.L(); nuggets(p, [[cx - 66, cy - 80, 13, 4], [cx - 44, cy - 86, 14, 0], [cx - 20, cy - 88, 14, 1], [cx + 4, cy - 89, 13, 2], [cx + 26, cy - 86, 13, 3], [cx + 48, cy - 82, 13, 5], [cx + 66, cy - 78, 11, 6], [cx - 30, cy - 80, 11, 2], [cx + 14, cy - 80, 12, 4]], r);
    // кузов: трапеция, светлая кромка сверху, пояс, тень справа, рёбра, заклёпки
    const body = G_([[cx - 86, cy - 76], [cx + 86, cy - 76], [cx + 70, cy - 10], [cx - 70, cy - 10]]);
    p.L().f(IR.b, body).f(IR.l, G_([[cx - 86, cy - 76], [cx + 86, cy - 76], [cx + 83, cy - 64], [cx - 83, cy - 64]])).f(IR.d, G_([[cx + 46, cy - 64], [cx + 83, cy - 64], [cx + 70, cy - 10], [cx + 40, cy - 10]]))
      .f('#4a4a56', R_(cx - 78, cy - 46, 156, 9)).s(IR.d, 3, `M${cx - 42} ${cy - 64} L${cx - 38} ${cy - 12} M${cx + 2} ${cy - 64} V${cy - 12} `).s(IR.h, 2.2, `M${cx - 80} ${cy - 72} h52 `).o(body, 5).o(R_(cx - 78, cy - 46, 156, 9), 2);
    rivets(p, [[cx - 66, cy - 58], [cx - 66, cy - 26], [cx - 22, cy - 58], [cx - 22, cy - 26], [cx + 22, cy - 58], [cx + 22, cy - 26], [cx + 60, cy - 58], [cx + 58, cy - 26]], 2.5, IR);
    // буфер и сцепка
    p.L().f(IR.d, R_(cx - 98, cy - 34, 14, 12, 3) + R_(cx + 84, cy - 34, 14, 12, 3)).o(R_(cx - 98, cy - 34, 14, 12, 3) + R_(cx + 84, cy - 34, 14, 12, 3), 2.4).s(INK, 6, `M${cx + 98} ${cy - 28} h8 `).s(IR.l, 2.6, `M${cx + 98} ${cy - 28} h8 `);
    // колёса
    p.L(); let wh = '', whl = '', hubs = '', spk = '';
    for (const dx of [-46, 46]) { const wx = cx + dx; wh += C_(wx, cy, 18); whl += `M${f1(wx - 14)} ${f1(cy - 6)} A15 15 0 0 1 ${f1(wx + 6)} ${f1(cy - 14)} `; hubs += C_(wx, cy, 5); for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; spk += `M${f1(wx)} ${f1(cy)} L${f1(wx + Math.cos(a) * 12)} ${f1(cy + Math.sin(a) * 12)} `; } }
    p.f('#3a3a44', wh).f('#24222c', [-46, 46].map((dx) => C_(cx + dx, cy, 12)).join('')).s('#7a7a88', 2.6, spk).s('#8a8a9a', 3, whl).f(BR.b, hubs).o(wh + hubs, 3.6);
    const box = [212, 2214, 236, 142];
    return { svg: objSym('mre-cart', box, p.out()) };
  }

  /* --- Фонарщик: столб с кованым кронштейном и завитками, два фонаря, крючок с каской, ящик с соломой и касками --- */
  function lamp2(r) {
    const fx = 210, fy = 2156, p = Pen();
    p.raw(`<ellipse cx="${f1(fx + 100)}" cy="${f1(fy + 2)}" rx="80" ry="10" fill="#000" fill-opacity="0.3"/>`);
    p.L(); plank(p, fx + 63, fy - 196, 14, 196, r, WD2);
    p.f('#6a6270', R_(fx + 58, fy - 10, 24, 10, 3)).o(R_(fx + 58, fy - 10, 24, 10, 3), 2.6);
    // кованый кронштейн: перекладина, завитки, укосины
    p.L().s(INK, 8, `M${fx + 30} ${fy - 184} H${fx + 112} `).s(IR.b, 4.4, `M${fx + 30} ${fy - 184} H${fx + 112} `).s(IR.l, 1.6, `M${fx + 32} ${fy - 185.6} H${fx + 110} `)
      .s(INK, 5, `M${fx + 63} ${fy - 150} q-26 -4 -22 -30 M${fx + 77} ${fy - 150} q26 -4 22 -30 M${fx + 30} ${fy - 184} q-6 -10 2 -12 q6 0 4 6 M${fx + 112} ${fy - 184} q6 -10 -2 -12 q-6 0 -4 6 `)
      .s(IR.l, 2, `M${fx + 63} ${fy - 150} q-26 -4 -22 -30 M${fx + 77} ${fy - 150} q26 -4 22 -30 `)
      .f(BR.b, R_(fx + 61, fy - 199, 18, 6, 2)).f(BR.l, R_(fx + 62, fy - 198.5, 14, 2, 1)).o(R_(fx + 61, fy - 199, 18, 6, 2), 2.4)
      .s(INK, 3, `M${fx + 40} ${fy - 184} V${fy - 178} M${fx + 104} ${fy - 184} V${fy - 178} `);
    rivets(p, [[fx + 70, fy - 184], [fx + 70, fy - 120]], 2.4);
    // крючок с каской на столбе
    p.L().s(INK, 4.4, `M${fx + 77} ${fy - 100} h8 q6 0 4 8 `).s(IR.l, 2, `M${fx + 77} ${fy - 100} h8 q6 0 4 8 `)
      .f('#ffcf3a', `M${fx + 74} ${fy - 76} Q${fx + 88} ${fy - 104} ${fx + 102} ${fy - 76} Z `).f('#fff0a0', `M${fx + 80} ${fy - 80} Q${fx + 86} ${fy - 96} ${fx + 94} ${fy - 92} Q${fx + 84} ${fy - 90} ${fx + 82} ${fy - 80} Z `).f('#e8a82a', R_(fx + 70, fy - 78, 36, 5, 2.5)).f('#fff6c0', C_(fx + 88, fy - 88, 4.2))
      .o(`M${fx + 74} ${fy - 76} Q${fx + 88} ${fy - 104} ${fx + 102} ${fy - 76} Z ` + R_(fx + 70, fy - 78, 36, 5, 2.5) + C_(fx + 88, fy - 88, 4.2), 2.4);
    // ящик: доски, крест, солома, каски
    p.L(); plank(p, fx + 92, fy - 48, 72, 48, r, WD, { ow: 3.8 });
    p.s(WD.g, 2.2, `M${fx + 95} ${fy - 32} H${fx + 161} M${fx + 95} ${fy - 16} H${fx + 161} `).s(WD.d, 6, `M${fx + 98} ${fy - 6} L${fx + 158} ${fy - 42} `).s(WD.l, 2.4, `M${fx + 98} ${fy - 8} L${fx + 158} ${fy - 44} `);
    rivets(p, [[fx + 98, fy - 42], [fx + 158, fy - 42], [fx + 98, fy - 6], [fx + 158, fy - 6]], 2.2);
    p.L().s('#e8c86a', 2.4, `M${fx + 96} ${fy - 48} l-6 -8 M${fx + 104} ${fy - 48} l2 -10 M${fx + 152} ${fy - 48} l8 -8 M${fx + 160} ${fy - 48} l4 -6 M${fx + 128} ${fy - 48} l-3 -9 `).s('#b8963a', 2, `M${fx + 100} ${fy - 48} l-2 -9 M${fx + 156} ${fy - 48} l3 -9 `);
    p.L(); let hm = '', hmL = '', br = '', lm = '';
    for (const [hx, hy, k] of [[fx + 112, fy - 48, 1], [fx + 142, fy - 50, 0.95], [fx + 127, fy - 62, 0.9]]) {
      hm += `M${f1(hx - 14 * k)} ${f1(hy)} Q${f1(hx)} ${f1(hy - 26 * k)} ${f1(hx + 14 * k)} ${f1(hy)} Z `; hmL += `M${f1(hx - 9 * k)} ${f1(hy - 3 * k)} Q${f1(hx - 4 * k)} ${f1(hy - 18 * k)} ${f1(hx + 4 * k)} ${f1(hy - 16 * k)} Q${f1(hx - 3 * k)} ${f1(hy - 13 * k)} ${f1(hx - 5 * k)} ${f1(hy - 3 * k)} Z `;
      br += R_(hx - 17 * k, hy - 3 * k, 34 * k, 5 * k, 2.5 * k); lm += C_(hx, hy - 11 * k, 4 * k);
    }
    p.f('#ffcf3a', hm).f('#fff0a0', hmL).f('#e8a82a', br).f('#fff6c0', lm).o(hm + br + lm, 2.4);
    const box = [186, 1950, 210, 222];
    return { svg: objSym('mre-lamp', box, p.out()) + lantern2(fx + 40, fy - 144, 1) + lantern2(fx + 104, fy - 144, 1) };
  }

  /* --- 26.10 (art/mine-gear): Торговец снаряжением для шахт - вариант вместо Фонарщика (флаг o.trader у entry2). Та же рамка
     [186, 1950, 210, 222] и то же основание (линия ног 2156), препятствие то же (craftworld FOOT 'lamp': x 264…380): лавка-прилавок
     под полосатым навесом, вывеска с киркой, на прилавке кирки, каски, сумка, на навесе - фонарь. Сам торговец - человечек сайта
     у прилавка (lampNpc, рисует mine.js); его облик - TRADER_LOOK. --- */
  const TRADER_LOOK = { look: { hat: 'none', acc: ['mustache'], color: '#c8865a' }, minerHat: true, apron: true };
  function traderArt() {
    const fx = 210, fy = 2156, x0 = fx + 46, x1 = fx + 176, top = fy - 52;   // прилавок: x 256…386, верх 2104
    const o = (w) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    let g = `<ellipse cx="${fx + 112}" cy="${fy + 2}" rx="84" ry="10" fill="#000" fill-opacity="0.3"/>`;
    // стойки навеса и задник
    g += `<rect x="${x0 - 4}" y="${fy - 186}" width="10" height="${186}" rx="3" fill="#8a5a32" ${o(3)}/><rect x="${x1 - 6}" y="${fy - 186}" width="10" height="${186}" rx="3" fill="#8a5a32" ${o(3)}/>`;
    g += `<rect x="${x0 + 6}" y="${fy - 160}" width="${x1 - x0 - 12}" height="${108}" fill="#3a2a30"/>`;
    // стойка с кирками на заднике (уровни снизу вверх цветом головки)
    const heads = ['#a0703a', '#d8803a', '#6f7888', '#8aa2c0', '#ffcf3a', '#7a8cff'];
    heads.forEach((c, i) => { const x = x0 + 18 + i * 19, y0 = fy - 66, y1 = fy - 146; g += `<path d="M${x} ${y0} L${x} ${y1}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${x} ${y0} L${x} ${y1}" stroke="#b8864e" stroke-width="3" stroke-linecap="round"/><path d="M${x - 10} ${y1 + 6} Q${x} ${y1 - 8} ${x + 12} ${y1 + 8} Q${x + 2} ${y1 + 2} ${x - 10} ${y1 + 6}Z" fill="${c}" ${o(2.2)}/>`; });
    g += `<path d="M${x0 + 8} ${fy - 128} H${x1 - 8}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${x0 + 8} ${fy - 128} H${x1 - 8}" stroke="#a0703a" stroke-width="2.4" stroke-linecap="round"/>`;
    // прилавок: доски, кромка, гвозди
    g += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${fy - top}" fill="#a0703a" ${o(3.6)}/>` + [top + 17, top + 34].map((y) => `<path d="M${x0 + 4} ${y} H${x1 - 4}" stroke="#6b4423" stroke-width="2.2"/>`).join('')
      + `<rect x="${x0 - 8}" y="${top - 10}" width="${x1 - x0 + 16}" height="12" rx="4" fill="#6b4423" ${o(3)}/>` + [[x0 + 8, top + 8], [x1 - 8, top + 8], [x0 + 8, fy - 8], [x1 - 8, fy - 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${INK}"/>`).join('');
    // на прилавке: две каски, кирка, рудная сумка
    for (const [hx, c] of [[x0 + 22, '#ffcf3a'], [x0 + 52, '#ff8a5c']]) g += `<path d="M${hx - 13} ${top - 10} Q${hx - 13} ${top - 30} ${hx} ${top - 30} Q${hx + 13} ${top - 30} ${hx + 13} ${top - 10}Z" fill="${c}" ${o(2.6)}/><rect x="${hx - 16}" y="${top - 13}" width="32" height="5" rx="2.5" fill="#c07a10" ${o(2)}/><circle cx="${hx}" cy="${top - 21}" r="4" fill="#fff6c0" ${o(1.8)}/>`;
    g += `<path d="M${x0 + 70} ${top - 12} L${x0 + 98} ${top - 40}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${x0 + 70} ${top - 12} L${x0 + 98} ${top - 40}" stroke="#9a6636" stroke-width="3" stroke-linecap="round"/><path d="M${x0 + 86} ${top - 46} Q${x0 + 104} ${top - 52} ${x0 + 112} ${top - 30} Q${x0 + 102} ${top - 40} ${x0 + 88} ${top - 40}Z" fill="#8aa2c0" ${o(2.4)}/>`;
    const bx = x1 - 22, by = top - 10;
    g += `<path d="M${bx - 14} ${by - 18} Q${bx - 18} ${by - 4} ${bx - 14} ${by} Q${bx} ${by + 4} ${bx + 14} ${by} Q${bx + 18} ${by - 4} ${bx + 14} ${by - 18} Q${bx} ${by - 22} ${bx - 14} ${by - 18}Z" fill="#a8743f" ${o(2.6)}/><path d="M${bx - 12} ${by - 16} Q${bx} ${by - 12} ${bx + 12} ${by - 16}" stroke="#e8c88a" stroke-width="2.4" fill="none"/><path d="M${bx - 6} ${by - 20} l4 -6 6 1 2 5Z" fill="#3a7aff" ${o(1.8)}/>`;
    // навес: полосы, фестоны
    const ay = fy - 186, ae = fy - 160, n = 6, aw = (x1 - x0 + 36) / n;
    for (let i = 0; i < n; i++) { const a = x0 - 18 + i * aw; g += `<path d="M${f1(x0 + (x1 - x0) * i / n)} ${ay} L${f1(x0 + (x1 - x0) * (i + 1) / n)} ${ay} L${f1(a + aw)} ${ae} L${f1(a)} ${ae}Z" fill="${i % 2 ? '#fff4e0' : '#e8742a'}"/><path d="M${f1(a)} ${ae} h${f1(aw)} q${f1(-aw / 2)} 16 ${f1(-aw)} 0Z" fill="${i % 2 ? '#fff4e0' : '#e8742a'}" ${o(2.4)}/>`; }
    g += `<path d="M${x0} ${ay} H${x1} L${x1 + 18} ${ae} H${x0 - 18}Z" fill="none" ${o(3.4)}/>`;
    // вывеска над навесом: доска с киркой и каской
    g += `<rect x="${fx + 62}" y="${fy - 206}" width="98" height="26" rx="6" fill="#6b4423" ${o(3)}/><rect x="${fx + 67}" y="${fy - 202}" width="88" height="18" rx="4" fill="none" stroke="#ffcf3a" stroke-width="1.8"/>`
      + `<path d="M${fx + 84} ${fy - 186} l14 -14" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M${fx + 84} ${fy - 186} l14 -14" stroke="#e0b47a" stroke-width="2" stroke-linecap="round"/><path d="M${fx + 90} ${fy - 202} q10 -2 14 8 q-6 -4 -12 -3Z" fill="#c8d0da" ${o(1.6)}/>`
      + `<path d="M${fx + 118} ${fy - 188} q0 -12 12 -12 q12 0 12 12Z" fill="#ffcf3a" ${o(1.8)}/><rect x="${fx + 115}" y="${fy - 190}" width="30" height="4" rx="2" fill="#c07a10" ${o(1.4)}/>`;
    // фонарь на крюке у левой стойки
    g += `<circle cx="${x0 - 18}" cy="${fy - 140}" r="26" fill="#ffd76a" fill-opacity=".22"/><path d="M${x0 - 4} ${fy - 170} h-14 v10" stroke="${INK}" stroke-width="3" fill="none"/><path d="M${x0 - 27} ${fy - 160} h18 l-3 4 h-12Z" fill="#4a4a58" ${o(2)}/><path d="M${x0 - 26} ${fy - 156} h16 l-2 22 h-12Z" fill="#ffd76a" ${o(2.6)}/><path d="M${x0 - 18} ${fy - 152} v14" stroke="#fffbe0" stroke-width="2.4" stroke-linecap="round"/><rect x="${x0 - 27}" y="${fy - 134}" width="18" height="5" rx="2" fill="#4a4a58" ${o(2)}/>`;
    const box = [186, 1950, 210, 222];
    return { svg: objSym('mre-trader', box, g) };
  }

  function entry2(F, L, r, o) {
    const out = [];
    out.push({ obj: 'lift', x: 150, y: 2406, svg: lift2(rngOf(11)).svg });
    out.push({ obj: 'buyer', x: 814, y: 2390, svg: buyer2(rngOf(23)).svg });
    out.push({ obj: 'board', x: 502, y: 2416, svg: board2(rngOf(37)).svg });
    out.push({ obj: 'cart', x: 330, y: 2326, svg: cart2(rngOf(41)).svg });
    let lampNpc = null;
    if (o && o.lampMan) { out.push({ obj: 'lamp', x: 280, y: 2156, svg: o.trader ? traderArt().svg : lamp2(rngOf(53)).svg }); lampNpc = o.trader ? { x: 425, y: 2166, name: 'Торговец снаряжением', look: TRADER_LOOK } : { x: 425, y: 2166, name: 'Фонарщик' }; }   // 26.10: o.trader - торговец снаряжением
    return { props: out, npc: { x: 664, y: 2426, name: 'Скупщик Гром' }, lampNpc };
  }

  window.LGMineArt = { v: 3, upLift: F(upLift), begin, rock: rock2, ore: ore2, wall: wall2, chest: chest2, coalHeap: F(coalHeap), badge: badge2, crack: F(crack), stageOf: stageOf2, entry: entry2, defs: defs2, digging: digging2, cracks: cracks2, ORE, lantern: F(lantern), mix,
    theme: () => CUR.theme, themeOfN, bbox, fit, DMG, digFig, traderArt, TRADER_LOOK, digSync, digCss, DIG_DEFS, pickIcon, PICK_NAMES, SEQS, SEQ_UP, MOVES, MOVES_UP, setGrass: (v) => { GRASS = !!v; }, grass: () => GRASS, SYM, dmgDefs, bodyId, tones2,
    v1: { entry: entryFo, rock: F(rock), ore: F(ore), wall: F(wall), chest: F(chest), badge, crack: F(crack), stageOf, defs, digging, cracks } };
})();
