/* 26.10 (art/ore-icons): значки руды, породы и самоцветов шахты для сумки, Склада и окна скупщика.
   Вещи руды - ore_<ресурс> (products/legion/modules/legionary/ore.js: slot 'material', mat 'ore', res, ore: base | ore | rich | rare | gem).
   Библиотека инвентаря (packages/inventory: artInner → oreArt) берёт рисунок отсюда, если файл загружен (window.LGOreArt),
   иначе рисует свою простую горку. Стиль - как у остальных значков вещей: мультяшно, плоские тона со светлой гранью сверху,
   жирный тёмный контур; рисунок в системе значков (центр x = 0, низ y = 0, высота ~50) - рамку подгоняет сама библиотека.
   Порода - простые глыбы, руда - камень с жилами и самородками, ценное и редкое - с бликами, самоцветы - огранка, градиент и искры.
   Цвет основы - как у ресурсов шахты (craftworld.js RES). Без анимаций и фильтров.
   window.LGOreArt.inner(res, kind, q) → строка SVG (q - префикс id градиентов: у каждого рисунка свой);
   .svg(res, kind, size) → готовый <svg> (витрина); .RES / .KIND - цвета и виды. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LGOreArt = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const INK = '#1d1520';
  const O = (w = 3.4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const f1 = (v) => +(+v).toFixed(1);
  const hx = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // светлее (k > 0) / темнее (k < 0)
  const tone = (c, k) => '#' + hx(c).map((v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))).toString(16).padStart(2, '0')).join('');
  const P = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';

  // цвет основы — как у ресурсов шахты (craftworld.js RES); у почти белых и почти чёрных — чуть подправлен, чтобы читался рисунок
  const RES = { stone: '#9a8e80', basalt: '#4a4248', frost_stone: '#bcd8ea', limestone: '#e4d6b0', sandstone: '#e0a868', rubble: '#b0a090',
    coal: '#24232a', iron: '#c8643a', copper: '#d8803a', sulfur: '#f2e24a', peat: '#6a4a32', bone_dust: '#eee6cc', salt: '#ffffff',
    silver: '#eef3fa', relic: '#d8b050', gold: '#ffcf3a', crystal: '#7fe8ff',
    adamant: '#9fc0e8', fire_opal: '#ff6a2a', emerald: '#2fd07a', amber: '#ffa52a', sapphire: '#3a7aff', topaz: '#ffc23a', malachite: '#1fa07a', morion: '#6a3a8a', aquamarine: '#6fe8e8', ruby: '#ff2a4a', runestone: '#a87aff' };
  const KIND = { stone: 'base', basalt: 'base', frost_stone: 'base', limestone: 'base', sandstone: 'base', rubble: 'base',
    coal: 'ore', iron: 'ore', copper: 'ore', sulfur: 'ore', peat: 'ore', bone_dust: 'ore', salt: 'ore', silver: 'rich', relic: 'rich', gold: 'rare', crystal: 'rare',
    adamant: 'gem', fire_opal: 'gem', emerald: 'gem', amber: 'gem', sapphire: 'gem', topaz: 'gem', malachite: 'gem', morion: 'gem', aquamarine: 'gem', ruby: 'gem', runestone: 'gem' };

  // искра-звёздочка (блик)
  const star = (x, y, k = 1, c = '#ffffff') => `<path d="M${f1(x)} ${f1(y - 6 * k)}Q${f1(x + 1 * k)} ${f1(y - 1 * k)} ${f1(x + 6 * k)} ${f1(y)}Q${f1(x + 1 * k)} ${f1(y + 1 * k)} ${f1(x)} ${f1(y + 6 * k)}Q${f1(x - 1 * k)} ${f1(y + 1 * k)} ${f1(x - 6 * k)} ${f1(y)}Q${f1(x - 1 * k)} ${f1(y - 1 * k)} ${f1(x)} ${f1(y - 6 * k)}Z" fill="${c}"/>`;
  const shadow = (rx = 22) => `<ellipse cx="0" cy="1" rx="${rx}" ry="4.5" fill="#000" opacity=".28"/>`;
  // глыба: контур, светлая верхняя грань и тёмный бок (pts — контур по часовой; top — верхняя грань; side — бок)
  // значок вписывается в квадрат (рамку библиотека берёт по большей стороне), поэтому кучи выше, чем шире: ys — растянуть по высоте
  const ys = (pts, k = 1.3) => pts.map(([x, y]) => [x, y * k]);
  const rock = (pts, top, side, c) => `<path d="${P(pts)}" fill="${c}" ${O()}/><path d="${P(top)}" fill="${tone(c, 0.32)}"/><path d="${P(side)}" fill="${tone(c, -0.28)}"/><path d="${P(pts)}" fill="none" ${O()}/>`;
  // типовая куча из двух глыб (большая сзади, малая спереди справа)
  const pile = (c, c2 = c) => rock(ys([[-22, 0], [-26, -16], [-16, -32], [2, -36], [16, -26], [18, -8], [10, 0]]), ys([[-26, -16], [-16, -32], [2, -36], [16, -26], [2, -22], [-14, -20]]), ys([[2, -22], [16, -26], [18, -8], [10, 0], [4, -4]]), c)
    + rock(ys([[4, 0], [6, -14], [16, -22], [28, -16], [30, -2], [24, 2]], 1.15), ys([[6, -14], [16, -22], [28, -16], [18, -11]], 1.15), ys([[18, -11], [28, -16], [30, -2], [24, 2], [20, -2]], 1.15), c2);

  /* ---------- порода ---------- */
  function base(res) {
    const c = RES[res];
    if (res === 'basalt') {   // базальт — пучок шестигранных столбов, у каждого — светлая верхушка
      let s = shadow();
      for (const [x, h, w] of [[-14, 30, 14], [14, 26, 13], [0, 40, 15]]) {
        const top = -h, e = w * 0.45;
        s += `<path d="M${x - w} 0V${top}L${x - w * 0.5} ${top - e}H${x + w * 0.5}L${x + w} ${top}V0Z" fill="${c}" ${O()}/><path d="M${x + w * 0.35} -2V${top + 2}L${x + w} ${top}V0Z" fill="${tone(c, -0.35)}"/>`
          + `<path d="M${x - w} ${top}L${x - w * 0.5} ${top - e}H${x + w * 0.5}L${x + w} ${top}L${x + w * 0.5} ${top + e}H${x - w * 0.5}Z" fill="${tone(c, 0.38)}" ${O(2.8)}/><path d="M${x - w + 3} ${top * 0.45}h${w * 0.8}" stroke="${tone(c, -0.45)}" stroke-width="2" stroke-linecap="round"/>`;
      }
      return s;
    }
    if (res === 'rubble') {   // щебень — горка мелких угловатых осколков
      let s = shadow();
      const bits = [[-20, -2, 10], [-4, -2, 11], [13, -2, 10], [-12, -16, 11], [6, -16, 11], [-3, -30, 11], [24, -6, 7], [3, -42, 7]];
      bits.sort((a, b) => a[1] - b[1]).forEach(([x, y, r], i) => { const c1 = i % 3 ? c : tone(c, -0.15); s += `<path d="${P([[x - r, y + 2], [x - r * 0.7, y - r * 0.8], [x + r * 0.3, y - r], [x + r, y - r * 0.2], [x + r * 0.7, y + 2]])}" fill="${c1}" ${O(3)}/><path d="${P([[x - r * 0.7, y - r * 0.8], [x + r * 0.3, y - r], [x + r * 0.4, y - r * 0.45], [x - r * 0.3, y - r * 0.35]])}" fill="${tone(c1, 0.35)}"/>`; });
      return s;
    }
    let s = shadow() + pile(c, tone(c, -0.06));
    if (res === 'stone') s += `<circle cx="-8" cy="-18" r="2" fill="${tone(c, -0.45)}"/><circle cx="-14" cy="-10" r="1.6" fill="${tone(c, -0.45)}"/><circle cx="22" cy="-9" r="1.6" fill="${tone(c, -0.45)}"/><path d="M-6 -36l8 -4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
    if (res === 'frost_stone') s += `<path d="${P(ys([[-26, -16], [-16, -32], [2, -36], [16, -26], [12, -21], [6, -24], [0, -19], [-8, -23], [-14, -18], [-20, -20]]))}" fill="#f4fbff" ${O(2.8)}/><path d="${P(ys([[6, -14], [16, -22], [28, -16], [24, -12], [20, -15], [14, -11], [9, -14]], 1.15))}" fill="#f4fbff" ${O(2.4)}/>`
      + `<path d="M-14 -23l2 9 2 -9Z M0 -25l2 11 2 -11Z M20 -17l1.5 7 1.5 -7Z" fill="#dff4ff" ${O(1.8)}/>` + star(-22, -44, 0.8);
    if (res === 'limestone') s += `<path d="M-9 -20a6 6 0 1 1 12 0a4.3 4.3 0 1 1 -8.6 0a2.6 2.6 0 1 1 5.2 0" fill="none" stroke="${tone(c, -0.5)}" stroke-width="2"/>`
      + [[-18, -10], [8, -32], [12, -14], [22, -10], [-12, -34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${tone(c, -0.4)}"/>`).join('');
    if (res === 'sandstone') s += `<path d="M-24 -10q8 -3 16 0t16 0M-24 -30q8 -3 15 0t16 -1M8 -8q6 -3 11 0t10 0" fill="none" stroke="${tone(c, -0.3)}" stroke-width="2.4" stroke-linecap="round"/><path d="M-22 -20q8 -3 15 0t14 0" fill="none" stroke="${tone(c, 0.4)}" stroke-width="2" stroke-linecap="round"/>`;
    return s;
  }

  /* ---------- руда: камень с самородками / жилами ---------- */
  const ROCK = '#8a8076';
  // самородок: неровный многоугольник, светлая грань, тёмная грань, точка-блик
  function nug(x, y, r, c, glint = true) {
    const pts = [[x - r, y + r * 0.3], [x - r * 0.6, y - r * 0.8], [x + r * 0.3, y - r], [x + r, y - r * 0.2], [x + r * 0.6, y + r * 0.7], [x - r * 0.3, y + r * 0.8]];
    return `<path d="${P(pts)}" fill="${c}" ${O(2.8)}/><path d="${P([pts[0], pts[1], pts[2], [x + r * 0.05, y - r * 0.2]])}" fill="${tone(c, 0.42)}"/><path d="${P([[x + r * 0.05, y - r * 0.2], pts[3], pts[4], pts[5]])}" fill="${tone(c, -0.3)}"/>`
      + (glint ? `<circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.35)}" r="${f1(Math.max(1.4, r * 0.2))}" fill="#fff"/>` : '') + `<path d="${P(pts)}" fill="none" ${O(2.8)}/>`;
  }
  // камень-основа под самородками (одна глыба)
  const host = (c = ROCK) => rock(ys([[-26, 0], [-28, -14], [-18, -30], [4, -34], [22, -26], [28, -10], [22, 0]]), ys([[-28, -14], [-18, -30], [4, -34], [22, -26], [6, -20], [-12, -18]]), ys([[6, -20], [22, -26], [28, -10], [22, 0], [12, -4]]), c);
  function ore(res) {
    const c = RES[res];
    if (res === 'coal') {   // уголь — чёрные блестящие глыбы с синеватыми гранями
      const cc = '#2c2b34';
      return shadow() + `<path d="${P(ys([[-24, 0], [-26, -18], [-12, -34], [6, -30], [10, -10], [2, 0]]))}" fill="${cc}" ${O()}/><path d="${P(ys([[-26, -18], [-12, -34], [6, -30], [-6, -20]]))}" fill="#5a5c72"/><path d="${P(ys([[-6, -20], [6, -30], [10, -10], [2, 0], [-4, -6]]))}" fill="#16161c"/>`
        + `<path d="${P([[0, 0], [4, -18], [18, -26], [30, -14], [26, 0]])}" fill="${cc}" ${O()}/><path d="${P([[4, -18], [18, -26], [30, -14], [16, -12]])}" fill="#6a6e88"/><path d="${P([[16, -12], [30, -14], [26, 0], [14, -2]])}" fill="#16161c"/>`
        + `<path d="M-18 -32l8 -6M10 -20l8 -3" stroke="#b8c0e0" stroke-width="2.6" stroke-linecap="round"/>` + star(24, -30, 0.7, '#d8e0ff');
    }
    if (res === 'sulfur') {   // сера — жёлтые пузырчатые наросты на камне
      let s = shadow() + host('#8a8070');
      for (const [x, y, r] of [[-12, -32, 7.5], [-2, -40, 6.5], [8, -32, 8], [-4, -24, 6.5], [16, -22, 6.5], [-18, -19, 6]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${O(2.6)}/><circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.35)}" r="${f1(r * 0.35)}" fill="#fffbd0"/>`;
      return s + `<path d="M22 -46q3 -4 0 -8M14 -50q3 -4 0 -8" stroke="#f6f0a0" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>`;
    }
    if (res === 'peat') {   // торф — брикет из спрессованных волокон с ростком травы
      return shadow() + `<path d="${P([[-24, 0], [-24, -28], [-12, -38], [24, -38], [24, -10], [12, 0]])}" fill="${c}" ${O()}/><path d="${P([[-24, -28], [-12, -38], [24, -38], [12, -28]])}" fill="${tone(c, 0.3)}"/><path d="${P([[12, -28], [24, -38], [24, -10], [12, 0]])}" fill="${tone(c, -0.3)}"/><path d="${P([[-24, 0], [-24, -28], [-12, -38], [24, -38], [24, -10], [12, 0]])}" fill="none" ${O()}/>`
        + `<path d="M-20 -18q8 -3 15 0t14 0M-20 -9q8 -2 14 0t14 0M-16 -33q8 -2 14 0t16 -1" stroke="${tone(c, -0.45)}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M-2 -35q-2 -10 -8 -14M0 -35q2 -12 8 -16M2 -35v-11" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-2 -35q-2 -10 -8 -14M0 -35q2 -12 8 -16M2 -35v-11" stroke="#6fbe4a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
    if (res === 'bone_dust') {   // костяная пыль — горка белой пыли и косточка на ней
      return shadow() + `<path d="M-28 0Q-24 -28 0 -32Q24 -28 28 0Z" fill="${c}" ${O()}/><path d="M-18 -12Q-12 -26 0 -29Q8 -29 12 -25Q2 -22 -6 -14Z" fill="#ffffff" opacity=".85"/><path d="M8 -6Q20 -14 26 -4" stroke="${tone(c, -0.3)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
        + `<g transform="translate(-1 -36) rotate(-24)"><path d="M-14 0H14" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-14 0H14" stroke="#fffaf0" stroke-width="4.6" stroke-linecap="round"/>`
        + [[-14, -3], [-14, 3], [14, -3], [14, 3]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fffaf0" ${O(2.4)}/>`).join('') + `<path d="M-14 0H14" stroke="#fffaf0" stroke-width="4.6" stroke-linecap="round"/></g>`
        + [[-24, -4], [20, -2], [-10, -2], [6, -3]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${tone(c, -0.35)}"/>`).join('');
    }
    if (res === 'salt') {   // соль — гроздь белых кубиков-кристаллов
      let s = shadow();
      for (const [x, y, k] of [[-14, -2, 11], [10, -2, 12], [-2, -19, 11], [18, -21, 8], [-20, -19, 7], [6, -34, 9]]) {
        const tp = [[x - k, y - k * 0.9], [x - k * 0.2, y - k * 1.4], [x + k * 0.9, y - k * 0.9], [x + k * 0.1, y - k * 0.45]];
        s += `<path d="${P([[x - k, y - k * 0.9], [x - k * 0.2, y - k * 1.4], [x + k * 0.9, y - k * 0.9], [x + k * 0.9, y], [x + k * 0.1, y + k * 0.4], [x - k, y]])}" fill="#eef2f6" ${O(2.8)}/><path d="${P(tp)}" fill="#ffffff"/><path d="${P([[x + k * 0.1, y - k * 0.45], [x + k * 0.9, y - k * 0.9], [x + k * 0.9, y], [x + k * 0.1, y + k * 0.4]])}" fill="#b8c4d2"/><path d="${P([[x - k, y - k * 0.9], [x - k * 0.2, y - k * 1.4], [x + k * 0.9, y - k * 0.9], [x + k * 0.9, y], [x + k * 0.1, y + k * 0.4], [x - k, y]])}" fill="none" ${O(2.8)}/>`;
      }
      return s + star(24, -44, 0.7);
    }
    // железо, медь: камень с жилой и самородками
    let s = shadow() + host();
    if (res === 'iron') s += `<path d="M-22 -10L-12 -16 -4 -12 6 -20 18 -16" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M-22 -10L-12 -16 -4 -12 6 -20 18 -16" fill="none" stroke="${tone(c, -0.2)}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>` + nug(-12, -22, 7, c) + nug(8, -24, 8, c) + nug(18, -10, 6, c);
    if (res === 'copper') s += nug(-12, -20, 7.5, c) + nug(8, -24, 8.5, c) + nug(18, -10, 6.5, c) + `<circle cx="-2" cy="-10" r="3.6" fill="#3aa88a" ${O(1.8)}/><circle cx="-20" cy="-8" r="2.8" fill="#3aa88a" ${O(1.6)}/><circle cx="20" cy="-24" r="2.6" fill="#5fc8a8" ${O(1.6)}/>`;
    return s;
  }

  /* ---------- ценное и редкое ---------- */
  function rich(res) {
    const c = RES[res];
    if (res === 'relic') {   // древности — старинная монета и черепок с узором
      return shadow() + `<path d="${P([[2, 0], [6, -22], [22, -30], [30, -8], [22, 2]])}" fill="#c8784a" ${O()}/><path d="${P([[6, -22], [22, -30], [24, -24], [9, -17]])}" fill="#e8a070"/><path d="M8 -12h18M10 -6l4 -4 4 4 4 -4 4 4" stroke="#f3efd8" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
        + `<circle cx="-7" cy="-24" r="19" fill="${c}" ${O()}/><circle cx="-7" cy="-24" r="13" fill="none" stroke="${tone(c, -0.35)}" stroke-width="2.2"/><path d="M-13 -19l6 -11 6 11" stroke="${tone(c, -0.45)}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-20 -31a14 14 0 0 1 8 -7" stroke="#fff4c0" stroke-width="2.8" fill="none" stroke-linecap="round"/>` + star(16, -42, 0.8, '#fff4c0');
    }
    if (res === 'silver') return shadow() + host('#7a7884') + `<path d="M-22 -12L-10 -18 0 -14 10 -22 20 -18" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M-22 -12L-10 -18 0 -14 10 -22 20 -18" fill="none" stroke="#dfe6f0" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`
      + nug(-12, -24, 7.5, '#d8e0ea') + nug(8, -26, 8.5, '#e6ecf4') + nug(18, -10, 6.5, '#d0d8e4') + star(-22, -34, 0.8) + star(24, -32, 0.6);
    if (res === 'gold') {   // золото — горка крупных самородков, блики
      return shadow() + nug(-13, -9, 11, '#e8b020') + nug(12, -9, 12, '#ffcf3a') + nug(-1, -26, 11, '#ffd84a') + nug(8, -40, 8, '#f2c030') + star(-20, -34, 0.9, '#fffbe0') + star(22, -46, 0.8, '#fffbe0') + star(20, -26, 0.5, '#fffbe0');
    }
    // кристаллы — гнездо голубых призм на камне
    let s = shadow() + `<path d="${P([[-24, 0], [-20, -10], [-6, -14], [10, -14], [24, -8], [26, 0]])}" fill="#7a7480" ${O()}/>`;
    for (const [x, len, a, w] of [[-12, 36, -22, 12], [14, 34, 22, 12], [1, 50, -4, 14]]) s += prism(x, -8, len, w, a, c);
    return s + star(-22, -44, 0.9) + star(24, -46, 0.7);
  }
  // призма: тело, светлая левая грань, тёмная правая, блик
  function prism(bx, by, len, w, ang, c) {
    const a = ang * Math.PI / 180, hw = w / 2, R = (pts) => pts.map(([x, y]) => { const dx = x - bx, dy = y - by; return [bx + dx * Math.cos(a) - dy * Math.sin(a), by + dx * Math.sin(a) + dy * Math.cos(a)]; });
    const sh = by - len * 0.72, body = R([[bx - hw, by], [bx - hw, sh], [bx, by - len], [bx + hw, sh], [bx + hw, by]]);
    return `<path d="${P(body)}" fill="${c}" ${O(3)}/><path d="${P(R([[bx - hw, by], [bx - hw, sh], [bx, by - len], [bx - hw * 0.1, sh], [bx - hw * 0.1, by]]))}" fill="${tone(c, 0.45)}"/><path d="${P(R([[bx + hw * 0.4, by], [bx + hw * 0.4, sh], [bx, by - len], [bx + hw, sh], [bx + hw, by]]))}" fill="${tone(c, -0.3)}"/>`
      + `<path d="${P(R([[bx - hw * 0.72, by - len * 0.12], [bx - hw * 0.72, sh + 2], [bx - hw * 0.42, sh + 4], [bx - hw * 0.42, by - len * 0.12]]))}" fill="#fff" opacity=".85"/><path d="${P(body)}" fill="none" ${O(3)}/>`;
  }

  /* ---------- самоцветы: огранка, градиент, блики и искры ---------- */
  function gem(res, q) {
    const c = RES[res], L = tone(c, 0.55), D = tone(c, -0.42), g = q + 'g', h = q + 'h';
    const defs = `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${D}"/></linearGradient>`
      + `<radialGradient id="${h}"><stop offset="0" stop-color="${tone(c, 0.3)}" stop-opacity=".75"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`;
    const glow = (cy = -22, r = 26) => `<circle cx="0" cy="${cy}" r="${r}" fill="url(#${h})"/>`;
    const sparks = (pts) => pts.map(([x, y, k]) => star(x, y, k)).join('');
    let s = defs + shadow(22);
    if (res === 'adamant') {   // адамантит — октаэдр стального отлива
      const T = [0, -48], B = [0, 0], Lp = [-22, -24], Rp = [22, -24], M = [4, -22];
      s += glow(-24, 26) + `<path d="${P([T, Rp, B, Lp])}" fill="url(#${g})" ${O()}/><path d="${P([T, Lp, M])}" fill="${L}"/><path d="${P([T, M, Rp])}" fill="${c}"/><path d="${P([Lp, M, B])}" fill="${tone(c, -0.15)}"/><path d="${P([M, Rp, B])}" fill="${D}"/>`
        + `<path d="M${Lp[0]} ${Lp[1]}L${M[0]} ${M[1]}L${Rp[0]} ${Rp[1]}M${T[0]} ${T[1]}L${M[0]} ${M[1]}L${B[0]} ${B[1]}" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".55"/><path d="${P([T, Rp, B, Lp])}" fill="none" ${O()}/>` + sparks([[-10, -36, 0.8], [24, -42, 0.7]]);
    } else if (res === 'fire_opal') {   // огненный опал — кабошон с огненными искрами внутри
      s += glow(-20, 26) + `<ellipse cx="0" cy="-20" rx="24" ry="18" fill="url(#${g})" ${O()}/><ellipse cx="3" cy="-14" rx="16" ry="9" fill="${D}" opacity=".45"/>`
        + [['#ffe24a', -8, -22, 3.4], ['#ff2a8a', 6, -24, 3], ['#3affc0', -2, -14, 2.8], ['#ffffff', 10, -16, 2.2], ['#ffe24a', 12, -26, 2], ['#3affc0', -14, -18, 2]].map(([cl, x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${cl}" opacity=".95"/>`).join('')
        + `<ellipse cx="-9" cy="-28" rx="8" ry="4" fill="#fff" opacity=".8" transform="rotate(-20 -9 -28)"/><ellipse cx="0" cy="-20" rx="24" ry="18" fill="none" ${O()}/>` + sparks([[22, -38, 0.7]]);
    } else if (res === 'emerald') {   // изумруд — ступенчатая огранка (восьмиугольник с площадкой)
      const o8 = [[-14, -44], [14, -44], [22, -36], [22, -8], [14, 0], [-14, 0], [-22, -8], [-22, -36]], i8 = [[-8, -36], [8, -36], [12, -32], [12, -12], [8, -8], [-8, -8], [-12, -12], [-12, -32]];
      s += glow(-22, 26) + `<path d="${P(o8)}" fill="url(#${g})" ${O()}/><path d="${P([o8[7], o8[0], o8[1], i8[1], i8[0], i8[7]])}" fill="${L}"/><path d="${P([o8[2], o8[3], i8[3], i8[2]])}" fill="${tone(c, -0.15)}"/><path d="${P([o8[3], o8[4], o8[5], i8[5], i8[4], i8[3]])}" fill="${D}"/>`
        + `<path d="${P(i8)}" fill="${c}" stroke="${INK}" stroke-width="1.6"/><path d="${P([i8[0], i8[1], [4, -24], [-6, -20]])}" fill="${tone(c, 0.35)}" opacity=".8"/><path d="${P(o8)}" fill="none" ${O()}/>` + sparks([[-14, -38, 0.7], [24, -44, 0.7]]);
    } else if (res === 'amber') {   // янтарь — капля с застывшей мошкой
      s += glow(-20, 26) + `<path d="M0 -48Q24 -20 18 -8A18 14 0 0 1 -18 -8Q-24 -20 0 -48Z" fill="url(#${g})" ${O()}/>`
        + `<g transform="translate(2 -16)" opacity=".75"><ellipse rx="4" ry="2.6" fill="#6a3a0a"/><path d="M-3 -2q-5 -5 -8 -2M3 -2q5 -5 8 -2M-2 2l-4 4M2 2l4 4" stroke="#6a3a0a" stroke-width="1.4" fill="none"/></g>`
        + `<path d="M-8 -30q2 -8 6 -12" stroke="#fff6d0" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M0 -48Q24 -20 18 -8A18 14 0 0 1 -18 -8Q-24 -20 0 -48Z" fill="none" ${O()}/>` + sparks([[16, -36, 0.7]]);
    } else if (res === 'malachite') {   // малахит — полированный овал с кольцами-полосами
      s += glow(-20, 26) + `<ellipse cx="0" cy="-20" rx="24" ry="18" fill="${c}" ${O()}/>`
        + [[17, 12.5, '#0a5a40'], [12, 8.5, '#7ae0b0'], [7, 4.8, '#0a5a40'], [3, 2, '#7ae0b0']].map(([rx, ry, cl], i) => `<ellipse cx="${-3 + i}" cy="${-18 + i * 0.5}" rx="${rx}" ry="${ry}" fill="none" stroke="${cl}" stroke-width="2.6"/>`).join('')
        + `<ellipse cx="-10" cy="-30" rx="7" ry="3" fill="#fff" opacity=".7" transform="rotate(-18 -10 -30)"/><ellipse cx="0" cy="-20" rx="24" ry="18" fill="none" ${O()}/>` + sparks([[20, -36, 0.6]]);
    } else if (res === 'morion' || res === 'aquamarine') {   // морион — дымчатое остриё; аквамарин — длинная шестигранная колонна
      const long = res === 'aquamarine', w = long ? 15 : 20, hgt = long ? 52 : 44, sh = -hgt * (long ? 0.8 : 0.66);
      const body = [[-w, 0], [-w, sh], [0, -hgt], [w, sh], [w, 0]];
      s += glow(-24, 26) + `<path d="${P(body)}" fill="url(#${g})" ${O()}/><path d="${P([[-w, 0], [-w, sh], [0, -hgt], [-w * 0.2, sh], [-w * 0.2, 0]])}" fill="${L}"/><path d="${P([[w * 0.35, 0], [w * 0.35, sh], [0, -hgt], [w, sh], [w, 0]])}" fill="${D}"/>`
        + `<path d="M${-w} ${sh}L${-w * 0.2} ${sh}L${w * 0.35} ${sh}L${w} ${sh}M${-w * 0.2} ${sh}V0M${w * 0.35} ${sh}V0" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".5"/><path d="M${-w * 0.66} -6V${sh + 4}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/><path d="${P(body)}" fill="none" ${O()}/>`
        + sparks(long ? [[16, -44, 0.7], [-16, -24, 0.5]] : [[18, -36, 0.6]]);
    } else if (res === 'ruby' || res === 'topaz' || res === 'sapphire') {
      if (res === 'topaz') {   // топаз — гранёная груша
        const out = [[0, -48], [14, -32], [18, -16], [10, -2], [-10, -2], [-18, -16], [-14, -32]];
        s += glow(-24, 26) + `<path d="${P(out)}" fill="url(#${g})" ${O()}/><path d="${P([[0, -48], [-14, -32], [-18, -16], [-6, -22], [0, -36]])}" fill="${L}"/><path d="${P([[0, -36], [6, -22], [18, -16], [14, -32], [0, -48]])}" fill="${c}"/><path d="${P([[-6, -22], [6, -22], [10, -2], [-10, -2]])}" fill="${tone(c, -0.12)}"/><path d="${P([[6, -22], [18, -16], [10, -2]])}" fill="${D}"/>`
          + `<path d="M0 -36L-6 -22 6 -22Z" fill="${tone(c, 0.3)}" stroke="${INK}" stroke-width="1.4"/><path d="${P(out)}" fill="none" ${O()}/>` + sparks([[-10, -34, 0.7], [20, -40, 0.6]]);
      } else {   // рубин — круглый бриллиант (корона, площадка, павильон); сапфир — овальная огранка-подушка
        const wide = res === 'sapphire' ? 1.12 : 1;
        const GL = [-24 * wide, -26], TL = [-13 * wide, -40], TR = [13 * wide, -40], GR = [24 * wide, -26], Cu = [0, 0];
        s += glow(-24, 26) + `<path d="${P([GL, TL, TR, GR, Cu])}" fill="url(#${g})" ${O()}/><path d="${P([TL, [3 * wide, -40], [-6 * wide, -26], GL])}" fill="${L}"/><path d="${P([[3 * wide, -40], TR, [8 * wide, -26], [-6 * wide, -26]])}" fill="${tone(c, 0.25)}"/><path d="${P([TR, GR, [8 * wide, -26]])}" fill="${c}"/>`
          + `<path d="${P([GL, [-6 * wide, -26], Cu])}" fill="${tone(c, 0.1)}"/><path d="${P([[-6 * wide, -26], [8 * wide, -26], Cu])}" fill="${tone(c, -0.15)}"/><path d="${P([[8 * wide, -26], GR, Cu])}" fill="${D}"/>`
          + `<path d="M${GL[0]} ${GL[1]}H${GR[0]}M${-6 * wide} -26L0 0M${8 * wide} -26L0 0" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".55"/><path d="${P([GL, TL, TR, GR, Cu])}" fill="none" ${O()}/>` + sparks([[-12, -46, 0.8], [26, -36, 0.6]]);
      }
    } else {   // рунный камень — серая галька со светящейся руной
      const rune = 'M-5 -8V-34L5 -26 -5 -18M5 -8V-18';
      s += `<circle cx="0" cy="-20" r="25" fill="url(#${h})"/><path d="${P([[-22, 0], [-26, -22], [-12, -40], [10, -42], [24, -26], [22, -4], [8, 2]])}" fill="#6e6880" ${O()}/><path d="${P([[-26, -22], [-12, -40], [10, -42], [24, -26], [4, -30], [-14, -28]])}" fill="#8e88a2"/><path d="${P([[4, -30], [24, -26], [22, -4], [8, 2], [10, -16]])}" fill="#56506a"/>`
        + `<path d="${rune}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/><path d="${rune}" stroke="#f0e6ff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
        + `<path d="${P([[-22, 0], [-26, -22], [-12, -40], [10, -42], [24, -26], [22, -4], [8, 2]])}" fill="none" ${O()}/>` + star(20, -42, 0.7);
    }
    return s;
  }

  let N = 0;
  function inner(res, kind, q) {
    q = q || 'oa' + (++N);
    const k = kind || KIND[res] || 'ore';
    if (!RES[res]) return '';
    if (k === 'gem' || KIND[res] === 'gem') return gem(res, q);
    if (k === 'base') return base(res);
    if (KIND[res] === 'rich' || KIND[res] === 'rare') return rich(res);
    return ore(res);
  }
  // готовый значок (витрина): рамка по рисунку значков (x -32…32, y -54…4)
  const svg = (res, kind, size = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-34 -56 68 68">${inner(res, kind)}</svg>`;
  return { inner, svg, RES, KIND };
});
