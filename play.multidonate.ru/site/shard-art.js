/* 26.10 (mine/shard-fx, решение стримера «осколки для каждого вида руд»): осколок-всплывашка шахты - свой маленький кусочек материала
   для каждого из 28 видов руды, породы и самоцветов (как значки руды: базальт - шестигранник, мёрзлый камень - со снежком, известняк -
   ракушка, сера - жёлтый нарост, соль - кубик, торф - комочек, костяная пыль - осколок кости, самоцветы - своя огранка и цвет).
   Стиль - как у значков: жирный тёмный контур, плоские тона, светлая грань сверху; читается на 14-20 px. Без градиентов, фильтров и id
   (на экране одновременно до 12 копий). Искра / блик - класс "sp" (mine.css мигает им), у самоцветов и ценного.
   Не зависит от ore-art.js (значки сумки): цвета - как у ресурсов шахты (craftworld.js RES).
   window.LGShardArt.inner(res) → строка SVG для viewBox SHARD_VB ("-12 -12 24 24"); .svg(res, size) → готовый <svg> (витрина);
   .KIND[res] → base | ore | rich | rare | gem; .LIST - все 28 видов. Неизвестный ресурс - простой камешек цвета color. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LGShardArt = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const INK = '#1d1520', VB = '-12 -12 24 24';
  const O = (w = 1.8) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const f1 = (v) => +(+v).toFixed(2);
  const hx = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const tone = (c, k) => '#' + hx(c).map((v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))).toString(16).padStart(2, '0')).join('');
  const P = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';
  const RES = { stone: '#9a8e80', basalt: '#4a4248', frost_stone: '#bcd8ea', limestone: '#e4d6b0', sandstone: '#e0a868', rubble: '#b0a090',
    coal: '#24232a', iron: '#c8643a', copper: '#d8803a', sulfur: '#f2e24a', peat: '#6a4a32', bone_dust: '#eee6cc', salt: '#ffffff',
    silver: '#eef3fa', relic: '#d8b050', gold: '#ffcf3a', crystal: '#7fe8ff',
    adamant: '#9fc0e8', fire_opal: '#ff6a2a', emerald: '#2fd07a', amber: '#ffa52a', sapphire: '#3a7aff', topaz: '#ffc23a', malachite: '#1fa07a', morion: '#6a3a8a', aquamarine: '#6fe8e8', ruby: '#ff2a4a', runestone: '#a87aff' };
  const KIND = { stone: 'base', basalt: 'base', frost_stone: 'base', limestone: 'base', sandstone: 'base', rubble: 'base',
    coal: 'ore', iron: 'ore', copper: 'ore', sulfur: 'ore', peat: 'ore', bone_dust: 'ore', salt: 'ore', silver: 'rich', relic: 'rich', gold: 'rare', crystal: 'rare',
    adamant: 'gem', fire_opal: 'gem', emerald: 'gem', amber: 'gem', sapphire: 'gem', topaz: 'gem', malachite: 'gem', morion: 'gem', aquamarine: 'gem', ruby: 'gem', runestone: 'gem' };
  const LIST = Object.keys(KIND);

  // искра-звёздочка (класс sp - мигает); k - размер
  const star = (x, y, k = 1, c = '#ffffff') => `<path class="sp" d="M${f1(x)} ${f1(y - 3.6 * k)}Q${f1(x + 0.6 * k)} ${f1(y - 0.6 * k)} ${f1(x + 3.6 * k)} ${f1(y)}Q${f1(x + 0.6 * k)} ${f1(y + 0.6 * k)} ${f1(x)} ${f1(y + 3.6 * k)}Q${f1(x - 0.6 * k)} ${f1(y + 0.6 * k)} ${f1(x - 3.6 * k)} ${f1(y)}Q${f1(x - 0.6 * k)} ${f1(y - 0.6 * k)} ${f1(x)} ${f1(y - 3.6 * k)}Z" fill="${c}" stroke="${INK}" stroke-width=".7" paint-order="stroke"/>`;
  // кусок: контур, светлая верхняя грань, тёмный бок, контур поверх
  const chunk = (out, top, side, c, kT = 0.38, kS = -0.3) => `<path d="${P(out)}" fill="${c}" ${O()}/><path d="${P(top)}" fill="${tone(c, kT)}"/><path d="${P(side)}" fill="${tone(c, kS)}"/><path d="${P(out)}" fill="none" ${O()}/>`;
  // типовой осколок-кусок (угловатый, чуть наклонён)
  const CH = [[-9, 3], [-7, -5], [1, -9], [9, -4], [8, 5], [-1, 8]], CHT = [[-7, -5], [1, -9], [9, -4], [1, -1.5]], CHS = [[1, -1.5], [9, -4], [8, 5], [-1, 8]];
  const piece = (c, kT, kS) => chunk(CH, CHT, CHS, c, kT, kS);
  const line = (d, c, w = 1.4) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dot = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;

  const ART = {
    /* ---------- порода ---------- */
    stone: (c) => piece(c) + dot(-3.5, 2.5, 1, tone(c, -0.5)) + dot(3, 3.5, 0.9, tone(c, -0.5)) + line('M-4 -5.5l4 -2', '#fff', 1.3),
    basalt: (c) => {   // шестигранный столбик: светлая шестигранная верхушка
      const w = 7.5, t = -4, e = 3.2;
      return `<path d="M${-w} 7V${t}L${-w / 2} ${t - e}H${w / 2}L${w} ${t}V7L${w / 2} 9.5H${-w / 2}Z" fill="${c}" ${O()}/><path d="M${w / 2} 9.5V${t + e}L${w} ${t}V7Z" fill="${tone(c, -0.4)}"/>`
        + `<path d="M${-w} ${t}L${-w / 2} ${t - e}H${w / 2}L${w} ${t}L${w / 2} ${t + e}H${-w / 2}Z" fill="${tone(c, 0.45)}" ${O(1.5)}/>` + line(`M${-w + 2} 3h4`, tone(c, -0.5), 1.2)
        + `<path d="M${-w} 7V${t}L${-w / 2} ${t - e}H${w / 2}L${w} ${t}V7L${w / 2} 9.5H${-w / 2}Z" fill="none" ${O()}/>`;
    },
    frost_stone: (c) => piece(c) + `<path d="M-8.4 -3.6L-6.8 -6.2 1 -10 8.8 -5 7.4 -2.6 5.6 -3.8 3.4 -1.8 1.2 -3.6 -1.6 -2 -4.4 -3.8Z" fill="#f6fcff" ${O(1.3)}/>` + `<path d="M3.2 -1.9l.9 3.4.9 -3.4Z" fill="#e2f4ff" ${O(0.9)}/>`,
    limestone: (c) => piece(c) + `<path d="M-3.6 2.4a2.8 2.8 0 1 1 5.6 0a2 2 0 1 1 -4 0a1.2 1.2 0 1 1 2.4 0" fill="none" stroke="${tone(c, -0.55)}" stroke-width="1.2"/>` + dot(4.6, 4.2, 0.8, tone(c, -0.45)),
    sandstone: (c) => piece(c) + line('M-8 0q3 -1.4 6 0t6 0t5 -.6', tone(c, -0.32), 1.3) + line('M-6.5 4q3 -1.2 6 0t5 0', tone(c, -0.32), 1.3) + line('M-5.4 -4q3 -1.2 5.5 0', tone(c, 0.5), 1.2),
    rubble: (c) => {   // щебень: три мелких угловатых камешка кучкой
      let s = '';
      for (const [x, y, r, k] of [[-4.5, 3.5, 5, 0], [4.5, 4, 4.6, 1], [0, -3.5, 5, 2]]) {
        const o = [[x - r, y + 1.5], [x - r * 0.7, y - r * 0.8], [x + r * 0.3, y - r], [x + r, y - r * 0.2], [x + r * 0.7, y + 1.8]];
        const c1 = k === 1 ? tone(c, -0.12) : c;
        s += `<path d="${P(o)}" fill="${c1}" ${O(1.5)}/><path d="${P([o[1], o[2], [x + r * 0.4, y - r * 0.45], [x - r * 0.3, y - r * 0.35]])}" fill="${tone(c1, 0.42)}"/><path d="${P(o)}" fill="none" ${O(1.5)}/>`;
      }
      return s;
    },

    /* ---------- руда ---------- */
    // уголь: тёмный кусок, но заметный на тёмном фоне - сильная светлая (сине-серая) грань и белый блик, искорка
    coal: () => `<path d="${P(CH)}" fill="#34333f" ${O()}/><path d="${P(CHT)}" fill="#9aa2c8"/><path d="${P(CHS)}" fill="#18171e"/><path d="${P(CH)}" fill="none" ${O()}/>` + line('M-5.2 -4.8l5 -2.6', '#ffffff', 1.5) + line('M3 2.6l3 -1.6', '#c8d0f0', 1.2) + star(7.2, -7.4, 0.55, '#e6ebff'),
    iron: (c) => piece('#8e8278') + `<path d="M-6.5 3.5l3 -2.2 2.4 1.2 3.6 -3" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M-6.5 3.5l3 -2.2 2.4 1.2 3.6 -3" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` + nug(2.6, -3.4, 3, c),
    copper: (c) => piece(c) + dot(-3, 2.6, 1.6, '#3aa88a') + dot(3.8, 3.6, 1.2, '#3aa88a') + dot(-5, -2, 1, '#5fc8a8') + `<circle cx="-3" cy="2.6" r="1.6" fill="none" stroke="${INK}" stroke-width=".8"/>`,
    sulfur: (c) => {   // жёлтый пузырчатый нарост
      let s = '';
      for (const [x, y, r] of [[-3.6, 2.6, 4.6], [3.8, 2.4, 4.4], [0, -3.6, 4.8]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${O(1.6)}/>`;
      for (const [x, y, r] of [[-3.6, 2.6, 4.6], [3.8, 2.4, 4.4], [0, -3.6, 4.8]]) s += `<circle cx="${f1(x - r * 0.32)}" cy="${f1(y - r * 0.32)}" r="${f1(r * 0.36)}" fill="#fffbd0"/>`;
      return s;
    },
    peat: (c) => {   // комочек торфа: волокна и росток
      const o = [[-8.5, 6], [-9, -2], [-4, -7], [6, -7], [9, -1], [7, 6.5]];
      return `<path d="${P(o)}" fill="${c}" ${O()}/><path d="${P([[-9, -2], [-4, -7], [6, -7], [9, -1], [1, -2.6]])}" fill="${tone(c, 0.32)}"/>` + line('M-6.5 1.6q3 -1.2 6 0t5.5 0', tone(c, -0.45), 1.2) + line('M-6 4.6q3 -1 5.5 0t5 0', tone(c, -0.45), 1.2)
        + `<path d="${P(o)}" fill="none" ${O()}/>` + `<path d="M0 -6.6q-1 -3.4 -3.4 -4.6M1 -6.6q1 -3.8 3.4 -5" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="M0 -6.6q-1 -3.4 -3.4 -4.6M1 -6.6q1 -3.8 3.4 -5" fill="none" stroke="#6fbe4a" stroke-width="1.5" stroke-linecap="round"/>`;
    },
    bone_dust: (c) => {   // осколок кости: головка и обломанный край
      return `<path d="M-8.6 -1.4a3 3 0 1 1 3.4 -3.6L5.6 2 6.8 0.4 8.6 3.4 6.4 4.2 7.4 6.8 3.2 5.6 -5.4 2.2a3 3 0 1 1 -3.2 -3.6Z" fill="#fffaf0" ${O()}/>`
        + `<path d="M-6.4 -3.2L4.6 2.6" stroke="${tone(c, 0.6)}" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>` + line('M-4.6 1.2L4 4.6', tone(c, -0.3), 1.1) + dot(-9.4, -3.6, 0.9, '#ffffff');
    },
    salt: () => {   // кубик соли
      const k = 7.2, o = [[-k, -k * 0.35], [-k * 0.1, -k], [k, -k * 0.45], [k, k * 0.6], [k * 0.1, k * 1.2], [-k, k * 0.65]];
      return `<path d="${P(o)}" fill="#e8eef4" ${O()}/><path d="${P([[-k, -k * 0.35], [-k * 0.1, -k], [k, -k * 0.45], [k * 0.1, k * 0.1]])}" fill="#ffffff"/><path d="${P([[k * 0.1, k * 0.1], [k, -k * 0.45], [k, k * 0.6], [k * 0.1, k * 1.2]])}" fill="#b4c0ce"/>`
        + `<path d="M${-k} ${-k * 0.35}L${k * 0.1} ${k * 0.1}L${k} ${-k * 0.45}M${k * 0.1} ${k * 0.1}V${k * 1.2}" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/><path d="${P(o)}" fill="none" ${O()}/>`;
    },

    /* ---------- ценное и редкое (с бликом) ---------- */
    silver: () => nug(0, 0.5, 8.4, '#dfe6f0') + star(7, -7, 0.65),
    gold: (c) => nug(0, 0.5, 8.6, c) + star(7, -7, 0.7, '#fffbe0'),
    relic: (c) => `<circle cx="0" cy="0.5" r="8.4" fill="${c}" ${O()}/><circle cx="0" cy="0.5" r="5.4" fill="none" stroke="${tone(c, -0.38)}" stroke-width="1.3"/><path d="M-2.8 3l2.8 -5.4 2.8 5.4" fill="none" stroke="${tone(c, -0.5)}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`
      + line('M-6.6 -2.8a7 7 0 0 1 4 -3.8', '#fff4c0', 1.6) + star(7, -7.4, 0.6, '#fffbe0'),
    crystal: (c) => prism(c, 0, 8.5, 18, 8, 12) + star(7.6, -6.6, 0.6),

    /* ---------- самоцветы: своя огранка, искра ---------- */
    adamant: (c) => {   // октаэдр стального отлива
      const T = [0, -10.5], B = [0, 10.5], L = [-8, 0], R = [8, 0], M = [1.6, 0.6];
      return `<path d="${P([T, R, B, L])}" fill="${c}" ${O()}/><path d="${P([T, L, M])}" fill="${tone(c, 0.55)}"/><path d="${P([T, M, R])}" fill="${c}"/><path d="${P([L, M, B])}" fill="${tone(c, -0.15)}"/><path d="${P([M, R, B])}" fill="${tone(c, -0.42)}"/>`
        + `<path d="M-8 0L1.6 .6 8 0M0 -10.5L1.6 .6 0 10.5" fill="none" stroke="${INK}" stroke-width=".9" opacity=".55"/><path d="${P([T, R, B, L])}" fill="none" ${O()}/>` + star(7.6, -7.2, 0.6);
    },
    fire_opal: (c) => `<ellipse cx="0" cy="0.5" rx="9.2" ry="7.4" fill="${c}" ${O()}/><ellipse cx="1.4" cy="3" rx="6" ry="3.4" fill="${tone(c, -0.4)}" opacity=".5"/>`
      + [['#ffe24a', -3, -0.6, 1.5], ['#ff2a8a', 2.6, -1.4, 1.3], ['#3affc0', -0.6, 2.6, 1.2], ['#ffffff', 4.2, 1.8, 0.9]].map(([cl, x, y, r]) => dot(x, y, r, cl)).join('')
      + `<ellipse cx="-3.6" cy="-3.6" rx="3" ry="1.5" fill="#fff" opacity=".85" transform="rotate(-20 -3.6 -3.6)"/><ellipse cx="0" cy="0.5" rx="9.2" ry="7.4" fill="none" ${O()}/>` + star(8, -6.4, 0.55),
    emerald: (c) => {   // ступенчатая огранка: восьмиугольник с площадкой
      const o = [[-5, -8.5], [5, -8.5], [8.5, -5], [8.5, 5], [5, 8.5], [-5, 8.5], [-8.5, 5], [-8.5, -5]], i = [[-2.6, -4.6], [2.6, -4.6], [4.4, -2.8], [4.4, 2.8], [2.6, 4.6], [-2.6, 4.6], [-4.4, 2.8], [-4.4, -2.8]];
      return `<path d="${P(o)}" fill="${c}" ${O()}/><path d="${P([o[7], o[0], o[1], i[1], i[0], i[7]])}" fill="${tone(c, 0.5)}"/><path d="${P([o[3], o[4], o[5], i[5], i[4], i[3]])}" fill="${tone(c, -0.4)}"/><path d="${P([o[2], o[3], i[3], i[2]])}" fill="${tone(c, -0.18)}"/>`
        + `<path d="${P(i)}" fill="${c}" stroke="${INK}" stroke-width=".9"/><path d="${P([i[0], i[1], [1.4, -0.6], [-2.2, 0.6]])}" fill="${tone(c, 0.35)}" opacity=".85"/><path d="${P(o)}" fill="none" ${O()}/>` + star(7.4, -8, 0.55);
    },
    amber: (c) => {   // капля с мошкой
      const d = 'M0 -10.5Q9.4 -2 7.4 3.6A7.6 6.4 0 0 1 -7.4 3.6Q-9.4 -2 0 -10.5Z';
      return `<path d="${d}" fill="${c}" ${O()}/><path d="M0 -10.5Q-9.4 -2 -7.4 3.6Q-4 -1 0 -10.5Z" fill="${tone(c, 0.4)}"/><path d="M7.4 3.6A7.6 6.4 0 0 1 -2 8.6Q5 4 7.4 3.6Z" fill="${tone(c, -0.3)}"/>`
        + `<g transform="rotate(-30 1.6 3)" opacity=".8"><ellipse cx="0.4" cy="1.6" rx="1.4" ry=".7" fill="#ffe8b0"/><ellipse cx="2.8" cy="1.6" rx="1.4" ry=".7" fill="#ffe8b0"/><ellipse cx="1.6" cy="3" rx="1.6" ry=".8" fill="#6a3a0a"/></g>`
        + line('M-3.4 -3.6q.8 -3 2.4 -4.6', '#fff6d0', 1.6) + `<path d="${d}" fill="none" ${O()}/>` + star(7, -7, 0.55);
    },
    sapphire: (c) => brilliant(c, 1.12),
    ruby: (c) => brilliant(c, 1),
    topaz: (c) => {   // гранёная груша
      const o = [[0, -10.5], [6, -4], [7.6, 2.4], [4, 8.6], [-4, 8.6], [-7.6, 2.4], [-6, -4]];
      return `<path d="${P(o)}" fill="${c}" ${O()}/><path d="${P([[0, -10.5], [-6, -4], [-7.6, 2.4], [-2.6, 0], [0, -5.6]])}" fill="${tone(c, 0.5)}"/><path d="${P([[-2.6, 0], [2.6, 0], [4, 8.6], [-4, 8.6]])}" fill="${tone(c, -0.12)}"/><path d="${P([[2.6, 0], [7.6, 2.4], [4, 8.6]])}" fill="${tone(c, -0.42)}"/>`
        + `<path d="M0 -5.6L-2.6 0 2.6 0Z" fill="${tone(c, 0.3)}" stroke="${INK}" stroke-width=".8"/><path d="${P(o)}" fill="none" ${O()}/>` + star(7.2, -7.6, 0.55);
    },
    malachite: (c) => `<ellipse cx="0" cy="0.5" rx="9.4" ry="7.4" fill="${c}" ${O()}/>`
      + [[6.6, 5, '#0a5a40'], [4.4, 3.2, '#7ae0b0'], [2.2, 1.4, '#0a5a40']].map(([rx, ry, cl], i) => `<ellipse cx="${-1 + i * 0.4}" cy="${1.2 + i * 0.2}" rx="${rx}" ry="${ry}" fill="none" stroke="${cl}" stroke-width="1.3"/>`).join('')
      + `<ellipse cx="-4" cy="-3.6" rx="2.8" ry="1.2" fill="#fff" opacity=".75" transform="rotate(-18 -4 -3.6)"/><ellipse cx="0" cy="0.5" rx="9.4" ry="7.4" fill="none" ${O()}/>` + star(7.8, -6.4, 0.5),
    morion: (c) => column(c, 7.8, 21, 0.62) + star(7.6, -7.4, 0.55),
    aquamarine: (c) => column(c, 6, 22, 0.78) + star(7.2, -8, 0.55),
    runestone: (c) => {   // галька со светящейся руной
      const o = [[-8.4, 6], [-9.4, -2], [-4, -8.6], [4, -9], [9, -3], [8.4, 5], [2.6, 8.4]];
      const rune = 'M-1.8 6V-5.6L2.2 -2.4 -1.8 .6M2.2 6V1.2';
      return `<path d="${P(o)}" fill="#6e6880" ${O()}/><path d="${P([[-9.4, -2], [-4, -8.6], [4, -9], [9, -3], [1.4, -4], [-5, -3]])}" fill="#948ea8"/><path d="${P([[1.4, -4], [9, -3], [8.4, 5], [2.6, 8.4], [3.4, 0]])}" fill="#56506a"/>`
        + `<path d="${rune}" stroke="${c}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><path d="${rune}" stroke="#f0e6ff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${P(o)}" fill="none" ${O()}/>` + star(7.6, -8, 0.55);
    },
  };
  // самородок: неровный многоугольник, светлая и тёмная грани, точка-блик
  function nug(x, y, r, c) {
    const p = [[x - r, y + r * 0.3], [x - r * 0.6, y - r * 0.8], [x + r * 0.3, y - r], [x + r, y - r * 0.2], [x + r * 0.6, y + r * 0.7], [x - r * 0.3, y + r * 0.8]];
    const w = r > 5 ? 1.8 : 1.4;
    return `<path d="${P(p)}" fill="${c}" ${O(w)}/><path d="${P([p[0], p[1], p[2], [x + r * 0.05, y - r * 0.2]])}" fill="${tone(c, 0.45)}"/><path d="${P([[x + r * 0.05, y - r * 0.2], p[3], p[4], p[5]])}" fill="${tone(c, -0.3)}"/>`
      + `<circle cx="${f1(x - r * 0.38)}" cy="${f1(y - r * 0.32)}" r="${f1(Math.max(0.8, r * 0.17))}" fill="#fff"/><path d="${P(p)}" fill="none" ${O(w)}/>`;
  }
  // призма (кристалл): тело, светлая левая грань, тёмная правая, блик; наклон ang
  function prism(c, bx, by, len, w, ang) {
    const a = ang * Math.PI / 180, hw = w / 2, R = (pts) => pts.map(([x, y]) => { const dx = x - bx, dy = y - by; return [bx + dx * Math.cos(a) - dy * Math.sin(a), by + dx * Math.sin(a) + dy * Math.cos(a)]; });
    const sh = by - len * 0.72, body = R([[bx - hw, by], [bx - hw, sh], [bx, by - len], [bx + hw, sh], [bx + hw, by]]);
    return `<path d="${P(body)}" fill="${c}" ${O()}/><path d="${P(R([[bx - hw, by], [bx - hw, sh], [bx, by - len], [bx - hw * 0.1, sh], [bx - hw * 0.1, by]]))}" fill="${tone(c, 0.5)}"/><path d="${P(R([[bx + hw * 0.4, by], [bx + hw * 0.4, sh], [bx, by - len], [bx + hw, sh], [bx + hw, by]]))}" fill="${tone(c, -0.32)}"/>`
      + `<path d="${P(R([[bx - hw * 0.72, by - len * 0.14], [bx - hw * 0.72, sh + 1], [bx - hw * 0.4, sh + 2], [bx - hw * 0.4, by - len * 0.14]]))}" fill="#fff" opacity=".9"/><path d="${P(body)}" fill="none" ${O()}/>`;
  }
  // круглый бриллиант (рубин) / овальная подушка (сапфир, wide > 1): корона, площадка, павильон
  function brilliant(c, wide) {
    const GL = [-8.4 * wide, -2.4], TL = [-4.6 * wide, -8], TR = [4.6 * wide, -8], GR = [8.4 * wide, -2.4], Cu = [0, 10];
    const out = [GL, TL, TR, GR, Cu];
    return `<path d="${P(out)}" fill="${c}" ${O()}/><path d="${P([TL, [1 * wide, -8], [-2 * wide, -2.4], GL])}" fill="${tone(c, 0.55)}"/><path d="${P([[1 * wide, -8], TR, [3 * wide, -2.4], [-2 * wide, -2.4]])}" fill="${tone(c, 0.25)}"/>`
      + `<path d="${P([[-2 * wide, -2.4], [3 * wide, -2.4], Cu])}" fill="${tone(c, -0.15)}"/><path d="${P([[3 * wide, -2.4], GR, Cu])}" fill="${tone(c, -0.42)}"/>`
      + `<path d="M${f1(GL[0])} -2.4H${f1(GR[0])}M${f1(-2 * wide)} -2.4L0 10M${f1(3 * wide)} -2.4L0 10" fill="none" stroke="${INK}" stroke-width=".9" opacity=".55"/><path d="${P(out)}" fill="none" ${O()}/>` + star(7.6, -8.4, 0.55);
  }
  // остриё-колонна (морион - короткое, аквамарин - длинное): k - доля тела под остриём
  function column(c, w, h, k) {
    const y0 = h / 2, top = -h / 2, sh = y0 - h * k, body = [[-w, y0], [-w, sh], [0, top], [w, sh], [w, y0]];
    return `<path d="${P(body)}" fill="${c}" ${O()}/><path d="${P([[-w, y0], [-w, sh], [0, top], [-w * 0.2, sh], [-w * 0.2, y0]])}" fill="${tone(c, 0.5)}"/><path d="${P([[w * 0.35, y0], [w * 0.35, sh], [0, top], [w, sh], [w, y0]])}" fill="${tone(c, -0.42)}"/>`
      + `<path d="M${-w} ${f1(sh)}H${w}M${f1(-w * 0.2)} ${f1(sh)}V${y0}M${f1(w * 0.35)} ${f1(sh)}V${y0}" fill="none" stroke="${INK}" stroke-width=".9" opacity=".5"/>`
      + line(`M${f1(-w * 0.62)} ${f1(y0 - 2)}V${f1(sh + 1.6)}`, '#fff', 1.4) + `<path d="${P(body)}" fill="none" ${O()}/>`;
  }

  /** Осколок ресурса res (color - цвет неизвестного ресурса) → строка SVG для viewBox VB. */
  function inner(res, color) {
    const f = ART[res];
    if (f) return f(RES[res]);
    return piece(color || '#9a8e80');
  }
  const svg = (res, size = 20) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${VB}" overflow="visible">${inner(res)}</svg>`;
  return { inner, svg, RES, KIND, LIST, VB };
});
