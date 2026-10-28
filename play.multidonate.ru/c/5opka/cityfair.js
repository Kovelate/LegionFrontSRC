
/* ───── стиль «legion»: styles/legion/fair.js ───── */
try {
/* Стиль «Легион» — локация «Ярмарка Легиона»: ночная площадь у городских ворот (Кузня, колодец, Шатёр франта) и Торговые ряды.
   Здесь ВСЁ, что относится к виду Ярмарки: рисунок сцены, предметы с глубиной, препятствия, где ходят человечки,
   двери мест, номера мест для опроса, названия мест, интерьер Кузни, реплики кузнеца.
   Логика (опрос, толпа, кражи, пасхалки, камера) — в modules/fair/client/widget.js, её стиль не трогает.
   Новый стиль Ярмарки = копия этого файла в styles/<id>/fair.js с другими рисунками и разметкой. Договор — styles/README.md.
   Координаты — всей сцены (ширина width × 1080), если не сказано «экран». */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addLocation) return;
  /* ===== 23.10: МАГИЧЕСКАЯ ЛАВКА (Лавка звездочёта) — общий рисунок для всех стилей Ярмарки =====
     Башня звездочёта в конце Торговых рядов (x 3440…3690, низ — 800) и интерьер лавки (стенды как в Кузне: полки, витрины, ценники).
     Стиль даёт тему T (цвета, контур, продавец) — MDDoodle.magicShop(T) → { building(o), interior(S, itemPos) }. «Легион» грузится
     всегда первым (и на оверлее, и в «Городе»), поэтому котики и обезьяны берут рисунок отсюда. Название лавки — от сервера
     (fair/shops.js → MAGIC_NAMES): o.name у здания, S.title у интерьера; без него — только значок 🔮 и звёзды. */
  (function () {
    const DD = window.MDDoodle;
    const f1 = (v) => +(+v).toFixed(1);
    // 23.10: монетка у цены — того металла, что самый крупный в цене («1з 20с» - золото, «6с» - серебро, «40м» - медь); 🔒 - без монетки
    const priceCoin = (pt, x, y) => { const c = /з/.test(pt) ? ['#e8b923', '#6a4a0a', '#a07a1a'] : /с/.test(pt) ? ['#dfe3ea', '#4a525e', '#8e97a4'] : /[мб]/.test(pt) ? ['#cd7f3c', '#5a2c0c', '#8f4e1e'] : null; return c ? `<circle cx="${x}" cy="${y}" r="10" fill="${c[0]}" stroke="${c[1]}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${c[2]}" stroke-width="2"/>` : ''; };
    const escT = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const RAR_C = { common: '#c9ccd6', uncommon: '#4cc95a', rare: '#4aa3ff', epic: '#b06bff', legendary: '#ffb83d' };
    const RAR_N = { uncommon: 'необычное', rare: 'редкое', epic: 'эпическое', legendary: 'легендарное' };
    const AURA_C = { sparks: '#ffc94d', halo: '#fff4b0', shadow: '#b06bff', frost: '#9fe8ff', gold: '#ffc94d' };
    const DEF = { line: '#f5f2ff', ink: '#15122e', stone: '#5a5768', stoneD: '#46435a', roof: '#4b2a8a', roofD: '#33195f', gold: '#ffc94d',
      glass: '#ffd76a', wood: '#6b4423', woodD: '#4a2c14', wall: '#1d1838', wall2: '#2e2556', floor: '#3a2a4a', sign: '#3a1f6b',
      seed: 'звездочёт', keeper: { hat: 'wizard', acc: ['glasses'], shape: 'tall', color: '#b9a2ff' }, artBg: '#1d1838' };
    // строки названия: одна или две (перенос по пробелу ближе к середине)
    function lines2(nm) {
      nm = String(nm || ''); if (nm.length <= 12) return [nm];
      let best = null; for (let i = 1; i < nm.length - 1; i++) if (nm[i] === ' ') { const a = nm.slice(0, i), b = nm.slice(i + 1), m = Math.max(a.length, b.length); if (!best || m < best[2]) best = [a, b, m]; }
      return best ? [best[0], best[1]] : [nm];
    }
    const star5 = (x, y, r, fill, extra = '') => { let p = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p += (i ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ' ' + f1(y + Math.sin(a) * rr); } return `<path d="${p}Z" fill="${fill}" ${extra}/>`; };
    function guyOf(seed, base, cx, s, mood, extra, look) {
      let svg = ''; try { svg = DD.jDoodle(DD.jhash(seed), mood || 'happy', false, extra || {}, look); } catch (e) { return ''; }
      const w = 120 * s, h = 170 * s;
      const body = svg.replace(/<svg class="jl-doodle( jd-ghost)?" viewBox="0 0 120 170"( style="([^"]*)")?/, (m, gh, st, css) => `<svg class="jl-doodle${gh || ''}" x="${f1(-w / 2)}" y="${f1(-h)}" width="${f1(w)}" height="${f1(h)}" viewBox="0 0 120 170" overflow="visible" style="${css ? css + ';' : ''}position:static;width:${f1(w)}px;height:${f1(h)}px;filter:none"`);
      const out = `<g transform="translate(${f1(cx)} ${f1(base)})"><g><animateTransform attributeName="transform" type="rotate" values="0;2.5;0;-2.5;0" dur="4.2s" repeatCount="indefinite"/>${body}</g></g>`;
      return DD.npcWrap ? DD.npcWrap(out, seed, base, cx, s, mood, extra, look) : out;   // 28.10 (hw-npc-ghosts): звездочёт в «мёртвом» городе - призрак
    }
    function magicShop(T0) {
      const T = Object.assign({}, DEF, T0 || {});
      const O = (w = 5) => `stroke="${T.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
      const tx = (x, y, t, size, fill, sw) => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-family="Russo One" font-size="${f1(size)}" fill="${fill}" stroke="${T.ink}" stroke-width="${sw || Math.max(3, size / 6).toFixed(1)}" paint-order="stroke">${t}</text>`;
      const ball = (x, y, r, id) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.9)}" fill="url(#${id}G)" opacity=".75"><animate attributeName="opacity" values=".5;.9;.5" dur="2.6s" repeatCount="indefinite"/></circle>`
        + `<path d="M${f1(x - r * 0.8)} ${f1(y + r * 0.95)} h${f1(r * 1.6)} l${f1(r * 0.25)} ${f1(r * 0.45)} h${f1(-r * 2.1)} Z" fill="${T.gold}" ${O(3)}/>`
        + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#${id}B)" ${O(3.5)}/><path d="M${f1(x - r * 0.5)} ${f1(y - r * 0.2)} q${f1(r * 0.5)} ${f1(-r * 0.6)} ${f1(r)} 0 q${f1(-r * 0.3)} ${f1(r * 0.5)} ${f1(-r * 0.7)} ${f1(r * 0.35)}" fill="none" stroke="#fff" stroke-width="2.5" opacity=".75"><animateTransform attributeName="transform" type="rotate" values="0 ${f1(x)} ${f1(y)};360 ${f1(x)} ${f1(y)}" dur="7s" repeatCount="indefinite"/></path><circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.4)}" r="${f1(r * 0.16)}" fill="#fff" opacity=".85"/>`;
      const ballDefs = (id) => `<radialGradient id="${id}B" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#e8f6ff"/><stop offset=".45" stop-color="#8fb6ff"/><stop offset="1" stop-color="#5b3aa8"/></radialGradient><radialGradient id="${id}G"><stop offset="0" stop-color="#bfe0ff" stop-opacity=".9"/><stop offset="1" stop-color="#7b4fd0" stop-opacity="0"/></radialGradient>`;
      const potion = (x, y, c, tall) => tall
        ? `<g transform="translate(${f1(x)} ${f1(y)})"><rect x="-4" y="-50" width="8" height="9" fill="#c58a45" ${O(2.5)}/><path d="M-5 -41 V-32 L-12 -24 V0 H12 V-24 L5 -32 V-41 Z" fill="${c}" ${O(3)}/></g>`
        : `<g transform="translate(${f1(x)} ${f1(y)})"><rect x="-5" y="-42" width="10" height="10" fill="#c58a45" ${O(2.5)}/><path d="M-6 -32 V-25 C-17 -19 -17 0 0 0 C17 0 17 -19 6 -25 V-32 Z" fill="${c}" ${O(3)}/><path d="M-8 -15 q4 -6 8 -3" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/></g>`;
      const PCOL = ['#e8455c', '#4ab0ff', '#6fdc6f', '#b06bff', '#ffc94d', '#ff8a5c'];

      /* ---------- здание на Ярмарке: башня со звёздной крышей, круглое окно с хрустальным шаром, подзорная труба ---------- */
      function building(o = {}) {
        const cx = 3565, B = 800, X0 = 3478, X1 = 3652, top = 360, peak = 150, id = 'mgb';
        let s = `<defs>${ballDefs(id)}<linearGradient id="${id}R" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.roof}"/><stop offset="1" stop-color="${T.roofD}"/></linearGradient></defs><g${o.noOl ? '' : ' data-ol="magic"'}>`;   // noOl — стиль сам обернул в data-ol (обводка в «Городе»)
        s += `<ellipse cx="${cx}" cy="${B + 10}" rx="150" ry="18" fill="${T.ink}" opacity=".35"/>`;
        // подзорная труба из-под крыши (звездочёт смотрит на звёзды)
        s += `<g transform="translate(3506 330) rotate(-142)"><rect x="0" y="-11" width="110" height="22" rx="5" fill="${T.gold}" ${O(4)}/><rect x="96" y="-15" width="26" height="30" rx="5" fill="#c9a03a" ${O(4)}/><path d="M24 -11 v22 M60 -11 v22" stroke="${T.ink}" stroke-width="3" opacity=".5"/></g>`;
        // башня (камень, чуть сужается кверху)
        // 26.10 (art/buildings): кладка — набор Ярмарки (блоки разного тона, кромка, щербины, мох у низа), крыша — дранка рядами, дверь из досок
        const KT = kitT();
        const tw = `M${X0} ${B} L${X0 + 10} ${top} H${X1 - 10} L${X1} ${B} Z`;
        s += `<path d="${tw}" fill="${T.stone}"/>`;
        if (KT) s += `<clipPath id="${id}TW"><path d="${tw}"/></clipPath><g clip-path="url(#${id}TW)">${KT.wall([X0, top, X1, B], { scale: 0.36, seed: 13, moss: true })}</g>`;
        else for (let r = 0; r < 10; r++) for (let c = 0; c < 4; c++) { const y = top + 14 + r * 43, x = X0 + 14 + c * 40 + (r % 2) * 18; if (x + 30 < X1 - 8) s += `<rect x="${f1(x)}" y="${y}" width="32" height="30" rx="5" fill="none" stroke="${T.ink}" stroke-width="2" opacity=".28"/>`; }
        s += `<path d="${tw}" fill="none" ${O()}/>`;
        // крыша-конус со звёздами и месяцем на шпиле
        if (KT) s += KT.roof([[X0 - 34, top + 8], [cx, peak], [X1 + 34, top + 8], [cx, top + 21]], { pal: { a: T.roof, b: mixC(T.roof, '#ffffff', 0.1), c: T.roofD, edge: mixC(T.roofD, T.ink, 0.4) }, step: 15, scale: 0.7, id: id + 'Rf' });
        else s += `<path d="M${X0 - 34} ${top + 8} L${cx} ${peak} L${X1 + 34} ${top + 8} Q${cx} ${top + 34} ${X0 - 34} ${top + 8} Z" fill="url(#${id}R)" ${O()}/>`;
        [[cx - 60, top - 30, 11], [cx + 4, top - 92, 13], [cx + 58, top - 22, 9], [cx - 18, top - 4, 8], [cx + 30, top - 150 + 92, 7], [cx - 34, top - 110, 7]].forEach(([x, y, r], i) => { s += star5(x, y, r, T.gold, `stroke="${T.ink}" stroke-width="2"`).replace('/>', `><animate attributeName="opacity" values="1;.45;1" dur="${(2 + i * 0.4).toFixed(1)}s" repeatCount="indefinite"/></path>`); });
        s += `<path d="M${cx} ${peak} V${peak - 44}" stroke="${T.gold}" stroke-width="6"/><path d="M${cx + 16} ${peak - 66} a20 20 0 1 1 -22 -22 a15 15 0 1 0 22 22 Z" fill="${T.gold}" ${O(3)}/>`;
        // круглое окно с хрустальным шаром
        s += `<circle cx="${cx}" cy="${top + 86}" r="44" fill="#1c1636" ${O(5)}/><circle cx="${cx}" cy="${top + 86}" r="34" fill="${T.glass}" opacity=".25"/>` + ball(cx, top + 82, 22, id);
        // вывеска: название лавки (две строки), значок 🔮 и звёздочки
        const NL = lines2(o.name || ''), sw = 196, sh = NL.length > 1 ? 86 : 60, sy = top + 160;
        s += `<rect x="${cx - sw / 2}" y="${sy}" width="${sw}" height="${sh}" rx="10" fill="${T.sign}" ${O(5)}/><rect x="${cx - sw / 2 + 8}" y="${sy + 8}" width="${sw - 16}" height="${sh - 16}" rx="6" fill="none" stroke="${T.gold}" stroke-width="2.5"/>`;
        if (NL[0]) { const fs = Math.max(14, Math.min(26, Math.floor((sw - 28) / (Math.max(...NL.map((l) => l.length)) * 0.66)))); NL.forEach((l, i) => { s += tx(cx, sy + (NL.length > 1 ? 36 + i * 30 : 39), escT(l.toUpperCase()), fs, T.gold); }); }
        else s += tx(cx, sy + 40, '🔮 ✦ ✧ ✦', 24, T.gold);
        // витрина слева от двери: полка с зельями; справа — свечи
        const wy = B - 150;
        s += `<rect x="${X0 + 14}" y="${wy}" width="48" height="78" rx="6" fill="#1c1636" ${O(4)}/><path d="M${X0 + 14} ${wy + 52} h48" stroke="${T.wood}" stroke-width="5"/>` + potion(X0 + 27, wy + 50, PCOL[0]) + potion(X0 + 49, wy + 50, PCOL[1], true);
        s += `<rect x="${X1 - 62}" y="${wy}" width="48" height="78" rx="6" fill="#1c1636" ${O(4)}/><circle cx="${X1 - 38}" cy="${wy + 36}" r="26" fill="${T.glass}" opacity=".3"><animate attributeName="opacity" values=".2;.45;.25;.4;.2" dur="1.8s" repeatCount="indefinite"/></circle><rect x="${X1 - 44}" y="${wy + 36}" width="12" height="34" fill="#f1e6c8" ${O(2.5)}/><path d="M${X1 - 38} ${wy + 34} q-6 -10 0 -16 q6 6 0 16" fill="#ffb24a"/>`;
        // дверь (арка) со звездой
        s += (KT ? KT.door(cx, B, 72, 128, { c: T.roofD, step: false }) : `<path d="M${cx - 36} ${B} V${B - 92} A36 36 0 0 1 ${cx + 36} ${B - 92} V${B} Z" fill="${T.roofD}" ${O(4)}/><circle cx="${cx + 22}" cy="${B - 44}" r="4.5" fill="${T.gold}"/>`) + star5(cx, B - 86, 12, T.gold, `stroke="${T.ink}" stroke-width="2"`);
        s += `<path d="M${cx - 52} ${B + 2} H${cx + 52} L${cx + 64} ${B + 16} H${cx - 64} Z" fill="${T.stoneD}" ${O(3)}/>`;
        // искорки вокруг крыши
        for (let i = 0; i < 5; i++) { const x = cx - 100 + i * 50, y = top - 60 - (i % 2) * 70; s += `<path d="M${x} ${y - 8} q0 8 8 8 q-8 0 -8 8 q0 -8 -8 -8 q8 0 8 -8 Z" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="2.2s" begin="${(i * 0.45).toFixed(2)}s" repeatCount="indefinite"/></path>`; }
        s += '</g>';
        return KT ? KT.wrap(s) : s;
      }
      // набор деталей Ярмарки в тонах этой лавки (символы — свои у каждого стиля: id по зерну)
      const mixC = (a, b, k) => { const h = (c) => { const n = parseInt(String(c).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }, A = h(a), Bc = h(b); return '#' + A.map((v, i) => Math.round(v + (Bc[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
      let KT0 = null;
      const kitT = () => { if (KT0 || !DD.fairKit) return KT0; let hs = 0; for (const ch of String(T.seed)) hs = (hs * 31 + ch.charCodeAt(0)) >>> 0;
        return (KT0 = DD.fairKit({ id: 'mg' + (hs % 46656).toString(36), line: T.line, ink: T.ink, glass: T.glass, wood: T.wood, woodD: T.woodD, metal: '#2a2440',
          wallC: { base: T.stone, light: mixC(T.stone, '#ffffff', 0.1), dark: mixC(T.stone, T.ink, 0.12), joint: mixC(T.stoneD, T.ink, 0.25), moss: '#3f6a4a' } })); };

      /* ---------- интерьер: стенды как в Кузне (табличка, две полки, витрина), звездочёт за прилавком, полки с зельями, окно в звёзды ---------- */
      const PTS_PIX = ['....11.....', '...1221....', '..122321...', '.12333221..', '.1232322211', '12333232221', '12232322221', '.122222221.', '..1111111..'];
      const PTS_COL = { 1: '#3a0d0d', 2: '#7a1414', 3: '#d42020' };
      const PTS_ICON = PTS_PIX.map((row, y) => [...row].map((ch, x) => PTS_COL[ch] ? `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PTS_COL[ch]}"/>` : '').join('')).join('');
      const gem = (x, y, s = 1) => `<g transform="translate(${f1(x - 9 * s)} ${f1(y - 8 * s)}) scale(${1.6 * s})" shape-rendering="crispEdges">${PTS_ICON}</g>`;
      const fmtP = (n) => Number(n || 0).toLocaleString('ru-RU');
      function tagLines(name) {
        const nm = String(name || ''); if (nm.length <= 11) return [nm];
        let best = null; for (let i = 1; i < nm.length - 1; i++) if (nm[i] === ' ' || nm[i] === '-') { const a = nm.slice(0, nm[i] === '-' ? i + 1 : i), b = nm.slice(i + 1), m = Math.max(a.length, b.length); if (!best || m < best[2]) best = [a, b, m]; }
        if (best && best[2] <= 15) return [best[0], best[1]];
        return [nm.length > 18 ? nm.slice(0, 17) + '…' : nm];
      }
      function priceTag(x, y, it, kind, w) {
        const paper = kind === 'paper', rar = RAR_N[it.rarity] ? it.rarity : null, rc = RAR_C[it.rarity] || RAR_C.common;
        const L = tagLines(it.name), maxLen = Math.max(...L.map((l) => l.length), 1);
        const fs = Math.max(13, Math.min(L.length > 1 ? 18 : 20, Math.floor((w - 14) / (maxLen * 0.64))));
        const top = rar ? 18 : 6, nameH = 42, hgt = top + nameH + 32 + (it.rank ? 17 : 0);
        let g = `<g transform="translate(${f1(x)} ${f1(y)})">`;
        if (paper) g += `<path d="M0 -10 V2" stroke="#c9b48a" stroke-width="2"/>`;
        if (rar) g += `<rect x="${f1(-w / 2 - 6)}" y="-6" width="${f1(w + 12)}" height="${hgt + 12}" rx="13" fill="none" stroke="${rc}" stroke-width="9" opacity=".5"><animate attributeName="opacity" values=".3;.75;.3" dur="2.4s" repeatCount="indefinite"/></rect>`;
        g += `<rect x="${f1(-w / 2)}" y="0" width="${f1(w)}" height="${hgt}" rx="8" fill="${paper ? '#f1e6c8' : '#e8c46a'}" stroke="${rar ? rc : T.ink}" stroke-width="${rar ? 4.5 : 2.5}"/>`;
        if (rar) g += `<path d="M${f1(-w / 2 + 2)} 8 Q${f1(-w / 2 + 2)} 2 ${f1(-w / 2 + 8)} 2 H${f1(w / 2 - 8)} Q${f1(w / 2 - 2)} 2 ${f1(w / 2 - 2)} 8 V15 H${f1(-w / 2 + 2)} Z" fill="${rc}"/><text y="13" text-anchor="middle" font-family="Russo One" font-size="11" fill="#fff" letter-spacing="1.5">${RAR_N[rar].toUpperCase()}</text>`;
        L.forEach((l, i) => { g += `<text y="${f1(L.length > 1 ? top + (i + 1) * 21 - 4 : top + 21 + fs * 0.36)}" text-anchor="middle" font-family="Russo One" font-size="${fs}" fill="#3a2614">${escT(l)}</text>`; });
        const py = top + nameH + 24, pt = it.priceText || fmtP(it.price), pfs = Math.max(14, Math.min(24, Math.floor((w - 40) / (pt.length * 0.6)))), pw = 26 + pt.length * pfs * 0.6, px0 = -pw / 2;
        g += (it.priceText ? priceCoin(it.priceText, f1(px0 + 10), py - 8) : gem(px0 + 10, py - 8, 1.2)) +   /* 23.10: priceText — цена в монетах («Город») */ `<text x="${f1(px0 + 26)}" y="${py}" font-family="Russo One" font-size="${pfs}" fill="#7a0f1d">${pt}</text>`;
        if (it.rank) { const rt = `🔒 ${it.rank}${it.rankMin != null ? ` (от ${fmtP(it.rankMin)})` : ''}`; g += `<text y="${py + 17}" text-anchor="middle" font-family="Russo One" font-size="${Math.max(9, Math.min(13, Math.floor((w - 10) / (rt.length * 0.62))))}" fill="#a3122a">${escT(rt)}</text>`; }
        return g + '</g>';
      }
      function rarGlow(x, y, r, it) {
        if (!RAR_N[it.rarity]) return '';
        return `<g data-rg="1"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.15)}" fill="url(#mgRar-${it.rarity})"><animate attributeName="opacity" values=".7;1;.7" dur="2.4s" repeatCount="indefinite"/></circle></g>`;
      }
      const head = (x, base, sc, hat) => { const H = DD.jHats({ top: 0, hw: 22, square: false, eyeY: 30 }, '#ff9fb2', '#4ab0ff'); return `<g transform="translate(${f1(x)} ${f1(base)}) scale(${sc})"><rect x="-3" y="-30" width="6" height="30" fill="${T.wood}" ${O(2.5)}/><path d="M-16 0 H16" stroke="${T.wood}" stroke-width="5" stroke-linecap="round"/><ellipse cx="0" cy="-48" rx="20" ry="22" fill="#d9c7a3" ${O(3)}/><g transform="translate(-60 -64)">${H[hat] || H.wizard || ''}</g></g>`; };
      function amuletArt(it, x, y, sc) {
        const lk = it.look || {}, rar = it.rarity || 'common';
        if (lk.charm && DD.charmArt) { try { const c = DD.charmArt(lk.charm, rar); if (c) return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${sc * 1.3})">${c}</g>`; } catch (e) {} }
        const c = AURA_C[lk.aura] || RAR_C[rar] || '#ffc94d';
        return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${sc})"><path d="M-20 -46 Q0 -10 20 -46" fill="none" stroke="${T.gold}" stroke-width="3"/><circle cx="0" cy="-8" r="26" fill="${c}" opacity=".28"/><path d="M0 -30 L16 -10 L0 12 L-16 -10 Z" fill="${c}" ${O(3)}/><path d="M-6 -14 l6 -8 l6 8" fill="none" stroke="#fff" stroke-width="2.5" opacity=".75"/></g>`;
      }
      const matArt = (it, x, y, sc) => it.mat === 'sphere'
        ? `<g transform="translate(${f1(x)} ${f1(y)}) scale(${sc})"><circle r="22" fill="#7fd6e6" ${O(3.5)}/><path d="M-12 -6 q8 -12 20 -4" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/><circle r="30" fill="#7fd6e6" opacity=".2"/></g>`
        : `<g transform="translate(${f1(x)} ${f1(y)}) scale(${sc})"><circle r="30" fill="#ffd76a" opacity=".25"/>${star5(0, 0, 24, '#ffc94d', O(3.5))}</g>`;
      // 23.10: вещь — в группе data-it (сайт, «Город»: наведение обводит контур самой вещи; свечение редкости — data-rg — без обводки)
      function itemArt(it, x, base, where) {
        const g = itemArt0(it, x, base, where); if (!g) return g;
        const m = /^<g data-rg="1">[\s\S]*?<\/g>/.exec(g), glow = m ? m[0] : '';
        return `<g data-it="${String(it.id).replace(/[^\w:.-]/g, '_')}">${glow}<g data-ia="1">${g.slice(glow.length)}</g></g>`;
      }
      function itemArt0(it, x, base, where) {
        const lk = it.look || {}, rar = it.rarity || 'common';
        try {
          if (it.mat) return rarGlow(x, base - 40, 50, it) + matArt(it, x, base - 34, where === 'case' ? 0.95 : 1.2);
          if (it.slot === 'weapon' && lk.weapon && DD.weaponArt) {
            if (where === 'case') return rarGlow(x, base - 45, 58, it) + `<g transform="translate(${f1(x - 18)} ${base - 30}) rotate(-62) scale(1.05)">${DD.weaponArt(lk.weapon, rar)}</g>`;
            const sc = ['staff', 'crook', 'spear'].includes(lk.weapon) ? 1.45 : 1.75;
            return rarGlow(x, base - 80, 70, it) + `<g transform="translate(${f1(x)} ${f1(base - 21 * sc)}) scale(${sc})">${DD.weaponArt(lk.weapon, rar)}</g>`;
          }
          if (it.slot === 'armor' && DD.armorArt) { const k = lk.armor || (it.gear === 'cloth' ? 'robe' : 'lorica'), sc = where === 'case' ? 0.74 : 1.3; return rarGlow(x, base - 45, 58, it) + `<g transform="translate(${f1(x)} ${base}) scale(${sc})"><path d="M0 -118 V-104" stroke="${T.wood}" stroke-width="4"/><path d="M-26 -104 H26" stroke="${T.wood}" stroke-width="5" stroke-linecap="round"/>${DD.armorArt(k, rar)}</g>`; }
          if (it.slot === 'helmet') return rarGlow(x, base - 45, 58, it) + head(x, base, where === 'case' ? 0.88 : 1.2, lk.hat || 'wizard');
          if (it.slot === 'trinket') return rarGlow(x, base - 50, 52, it) + `<path d="M${f1(x - 26)} ${base - 2} H${f1(x + 26)}" stroke="${T.wood}" stroke-width="5" stroke-linecap="round"/><path d="M${f1(x)} ${base - 4} V${base - 92}" stroke="${T.wood}" stroke-width="4"/><path d="M${f1(x - 16)} ${base - 92} H${f1(x + 16)}" stroke="${T.wood}" stroke-width="4"/>` + amuletArt(it, x, base - 46, where === 'case' ? 1 : 1.35);
        } catch (e) { /* рисунок вещи не удался — только ценник */ }
        return '';
      }
      function shelf(y, x0, x1) {
        const w = x1 - x0;
        let g = `<rect x="${x0 + 14}" y="${y + 18}" width="${w - 28}" height="30" fill="url(#mgShadow)"/>`;
        for (const bx of [x0 + 70, (x0 + x1) / 2, x1 - 70]) g += `<path d="M${f1(bx - 6)} ${y + 16} V${y + 56} Q${f1(bx - 6)} ${y + 62} ${f1(bx)} ${y + 58} L${f1(bx + 34)} ${y + 22} Q${f1(bx + 38)} ${y + 16} ${f1(bx + 30)} ${y + 16} Z" fill="#4a4a6a" ${O(3)}/><circle cx="${f1(bx + 14)}" cy="${y + 34}" r="5" fill="${T.gold}"/>`;
        g += `<path d="M${x0} ${y} L${x0 + 12} ${y - 12} H${x1 - 12} L${x1} ${y} Z" fill="#7a5aa0"/><rect x="${x0}" y="${y}" width="${w}" height="18" fill="#4e3570"/><path d="M${x0} ${y} L${x0 + 12} ${y - 12} H${x1 - 12} L${x1} ${y} V${y + 18} H${x0} Z" fill="none" ${O(4)}/>`;
        for (let k = 0; k < 6; k++) g += star5(x0 + 30 + k * (w - 60) / 5, y + 9, 4, T.gold);
        return g;
      }
      const RC = { magic: '#5b3aa8', necro: '#2f5a4a', charms: '#9a6a1a', legionary: '#a3122a', archer: '#2f7a3a', rogpal: '#4a4a6a' };
      function interior(S, itemPos) {
        S = S || {}; itemPos = itemPos || {};
        let s = `<defs>${ballDefs('mgi')}<radialGradient id="mgWall" cx=".75" cy=".45" r=".85"><stop offset="0" stop-color="${T.wall2}"/><stop offset="1" stop-color="${T.wall}"/></radialGradient>
          <linearGradient id="mgShadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
          <linearGradient id="mgVelvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1440"/><stop offset=".3" stop-color="#2e2470"/><stop offset="1" stop-color="#3b2e88"/></linearGradient>
          <linearGradient id="mgGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff" stop-opacity=".28"/><stop offset="1" stop-color="#bfe6ff" stop-opacity=".08"/></linearGradient>
          ${['uncommon', 'rare', 'epic', 'legendary'].map((r) => `<radialGradient id="mgRar-${r}"><stop offset="0" stop-color="${RAR_C[r]}" stop-opacity=".85"/><stop offset=".5" stop-color="${RAR_C[r]}" stop-opacity=".35"/><stop offset="1" stop-color="${RAR_C[r]}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`;
        // стена с нарисованными созвездиями, пол
        s += `<rect width="1920" height="1080" fill="url(#mgWall)"/>`;
        let sd = 31; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 70; i++) s += `<circle cx="${f1(rr() * 1920)}" cy="${f1(rr() * 760)}" r="${f1(0.8 + rr() * 2)}" fill="#fff" opacity="${f1(0.2 + rr() * 0.5)}"/>`;
        s += `<path d="M120 90 L220 60 L300 110 L380 70 M1240 70 L1310 120 L1400 96" stroke="#ffe7a0" stroke-width="1.5" opacity=".35" fill="none"/>`;
        s += `<rect x="0" y="930" width="1920" height="150" fill="${T.floor}"/><path d="M0 930 H1920" stroke="${T.line}" stroke-width="5"/>`;
        for (let i = 0; i < 12; i++) s += `<path d="M${i * 170} 930 V1080" stroke="${T.ink}" stroke-width="3" opacity=".5"/>`;
        // окно в звёздное небо с месяцем (справа сверху) и подзорная труба на треноге
        s += `<path d="M1520 420 V170 A150 150 0 0 1 1820 170 V420 Z" fill="#0d0b22" ${O(6)}/><path d="M1670 20 V420 M1520 250 H1820" stroke="${T.wood}" stroke-width="8"/>`;
        s += `<path d="M1772 120 a34 34 0 1 1 -36 -36 a26 26 0 1 0 36 36 Z" fill="#f3efd8" ${O(3)}/>` + [[1560, 120], [1610, 200], [1700, 320], [1790, 280], [1580, 340]].map(([x, y]) => star5(x, y, 6, '#fff')).join('');
        s += `<g transform="translate(1470 560)"><path d="M0 0 L-40 190 M0 0 L40 190 M0 0 V190" stroke="${T.wood}" stroke-width="7" stroke-linecap="round"/><g transform="rotate(-32)"><rect x="-20" y="-14" width="150" height="28" rx="6" fill="${T.gold}" ${O(4)}/><rect x="118" y="-19" width="30" height="38" rx="6" fill="#c9a03a" ${O(4)}/></g></g>`;
        // полки с зельями (над прилавком, справа)
        s += `<rect x="1520" y="470" width="380" height="16" rx="5" fill="${T.wood}" ${O(4)}/>` + [0, 1, 2, 3, 4, 5, 6].map((i) => potion(1548 + i * 52, 468, PCOL[i % 6], i % 2)).join('');
        // вывеска
        const nm = S.title || '';
        s += `<path d="M860 0 V36 M1060 0 V36" stroke="${T.ink}" stroke-width="5"/><rect x="760" y="34" width="400" height="84" rx="14" fill="${T.sign}" ${O(6)}/><rect x="772" y="46" width="376" height="60" rx="9" fill="none" stroke="${T.gold}" stroke-width="3"/>`;
        s += tx(960, 92, '🔮 ' + escT(String(nm || 'ЛАВКА').toUpperCase()), Math.max(24, Math.min(42, Math.floor(340 / (Math.max(6, nm.length + 2) * 0.66)))), T.gold, 7);
        // стенды: как в Кузне (ширина стенда = ширина витрины)
        const STD = Array.isArray(S.stands) ? S.stands : [], n = Math.max(1, STD.length), SW = (1460 - 40) / Math.max(3, n);
        const X0 = 40 + ((1460 - 40) - SW * n) / 2;
        let tags = '';
        const matsAt = Math.max(0, STD.findIndex((x) => x.key === 'charms'));
        STD.forEach((st, c) => {
          const x0 = X0 + c * SW + 8, x1 = x0 + SW - 16, cx = (x0 + x1) / 2, ttl = String(st.name || '').toUpperCase();
          s += `<rect x="${f1(x0)}" y="132" width="${f1(x1 - x0)}" height="660" rx="16" fill="#000" opacity=".18"/>`;
          const tw = Math.min(x1 - x0 - 24, Math.max(240, ttl.length * 19 + 60)), fs = Math.max(18, Math.min(30, Math.floor((tw - 40) / (Math.max(1, ttl.length) * 0.68))));
          s += `<rect x="${f1(cx - tw / 2)}" y="138" width="${f1(tw)}" height="54" rx="11" fill="${RC[st.key] || T.sign}" ${O(4)}/>` + tx(cx, 165 + fs * 0.36, escT(ttl), fs, '#ffe7a0', 6);
          for (const [y, list] of [[400, st.top || []], [670, st.mid || []]]) {
            s += shelf(y, x0, x1);
            const k = Math.max(1, list.length), step = (x1 - x0 - 30) / k, xs = (i) => x0 + 15 + step * (i + 0.5);
            list.forEach((it, i) => { const x = xs(i); itemPos[it.id] = { x, y: y - 90 }; s += `<ellipse cx="${f1(x)}" cy="${y - 5}" rx="30" ry="5" fill="#000" opacity=".28"/>` + itemArt(it, x, y + 2, 'shelf'); tags += priceTag(x, y + 26, it, 'paper', Math.min(150, step - 8)); });
          }
        });
        s += tags;
        // звездочёт за прилавком (над окном вебки), хрустальный шар на прилавке
        s += guyOf(T.seed, 800, 1700, 2.1, 'chill', {}, T.keeper);
        s += `<rect x="1480" y="752" width="430" height="80" fill="#4e3570" ${O(5)}/><rect x="1470" y="738" width="450" height="20" rx="6" fill="#3a2556" ${O(4)}/><path d="M1486 780 H1904 M1486 806 H1904" stroke="${T.ink}" stroke-width="3" opacity=".5"/>` + ball(1580, 700, 30, 'mgi') + potion(1840, 736, '#6fdc6f', true) + `<g transform="translate(1660 736)"><rect x="-34" y="-14" width="68" height="14" fill="#a3122a" ${O(2.5)}/><rect x="-30" y="-26" width="60" height="12" fill="#2f5a4a" ${O(2.5)}/></g>`;
        // витрины под стендами (материалы заточки — в витрине стенда «Амулеты», или в последней)
        const top = 800, bot = 986, glassTop = 812, gh = bot - glassTop - 82;
        for (let c = 0; c < n; c++) {
          const x = X0 + c * SW + 8, w = SW - 16, st = STD[c] || {};
          const items = [...(st.case || []), ...(c === matsAt ? S.mats || [] : [])], stp = (w - 24) / Math.max(1, items.length);
          s += `<rect x="${f1(x)}" y="${top}" width="${f1(w)}" height="${bot - top}" rx="8" fill="#3a2556" ${O(5)}/>`;
          const pw = (w - 48) / 2;
          for (const px of [x + 16, x + 32 + pw]) s += `<rect x="${f1(px)}" y="${bot - 58}" width="${f1(pw)}" height="48" rx="5" fill="#2a1a40" stroke="${T.ink}" stroke-width="2"/>` + star5(px + pw / 2, bot - 34, 9, T.gold);
          s += `<rect x="${f1(x + 12)}" y="${glassTop}" width="${f1(w - 24)}" height="${gh}" rx="5" fill="url(#mgVelvet)"/>`;
          items.forEach((it, i) => { const ix = x + 12 + stp * (i + 0.5); itemPos[it.id] = { x: ix, y: glassTop + 40 }; s += itemArt(it, ix, glassTop + gh - 4, 'case'); });
          s += `<rect x="${f1(x + 12)}" y="${glassTop}" width="${f1(w - 24)}" height="${gh}" rx="5" fill="url(#mgGlass)" stroke="#bfe6ff" stroke-width="2" opacity=".9"/><path d="M${f1(x + 30)} ${glassTop + 10} l60 60 M${f1(x + 52)} ${glassTop + 8} l40 40" stroke="#fff" stroke-width="3" opacity=".22"/>`;
          items.forEach((it, i) => { const ix = x + 12 + stp * (i + 0.5); s += priceTag(ix, glassTop + gh + 4, it, 'plate', Math.min(160, stp - 6)); });
        }
        return s;
      }
      return { building, interior, theme: T };
    }
    if (DD && !DD.magicShop) DD.magicShop = magicShop;
  })();
  /* ===== 25.10 (art/fair-city): НАБОР ДЕТАЛЕЙ Ярмарки и «Города» — общие <symbol> для всех стилей =====
     Мостовая (булыжник, плитка, доски), каменная кладка, черепица и дранка, фонари, деревья и кусты, ящики и бочки.
     Стиль даёт тему T (цвета и контур), координаты — сцены. Одинаковые детали — один <symbol> и много <use>: узлов меньше, а
     рисунок подробнее. Каждый SVG-документ (сцена, предмет с глубиной, слой квартала) собирает свои <defs> через K.doc(() => …):
     в «Городе» (Pixi) каждый предмет запекается отдельной картинкой, ссылки на чужой документ там не работают.
     Без фильтров и без анимаций в символах (мерцание света — у самих стилей). «Легион» грузится первым — котики, обезьяны и
     квартал «Города» (site/public/cityart.js) берут набор отсюда: MDDoodle.fairKit(T). */
  (function () {
    const DD = window.MDDoodle;
    const f1 = (v) => +(+v).toFixed(1), f2 = (v) => +(+v).toFixed(2);
    const rng = (seed) => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const hx = (c) => { const n = parseInt(String(c).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
    const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
    // гладкий замкнутый контур по точкам
    const smooth = (pts) => { const n = pts.length; let d = ''; for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], m = pts[(i + 2) % n]; if (!i) d += `M${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)} `; d += `Q${f1(q[0])} ${f1(q[1])} ${f1((q[0] + m[0]) / 2)} ${f1((q[1] + m[1]) / 2)} `; } return d + 'Z'; };
    const blob = (cx, cy, rx, ry, r, n = 8, j = 0.18) => { const pts = [], a0 = r() * 6.283; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * 6.283, k = 1 - j + r() * j * 2; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return smooth(pts); };
    // камень-«подушка»: скруглённый четырёхугольник с чуть кривыми углами
    const pillow = (x, y, w, h, r, k = 0.3) => { const j = () => (r() - 0.5) * Math.min(w, h) * 0.18, rx = Math.min(w, h) * k; return smooth([[x + j(), y + j()], [x + w / 2, y - 1 + j() * 0.4], [x + w + j(), y + j()], [x + w + 1 + j() * 0.4, y + h / 2], [x + w + j(), y + h + j()], [x + w / 2, y + h + 1 + j() * 0.4], [x + j(), y + h + j()], [x - 1 + j() * 0.4, y + h / 2]].map(([px, py], i) => (i % 2 ? [px, py] : [px + (px < x + w / 2 ? rx : -rx) * 0.15, py + (py < y + h / 2 ? rx : -rx) * 0.15]))); };

    function fairKit(T0) {
      const T = Object.assign({ id: 'k', line: '#f5f2ff', ink: '#15122e', glass: '#ffd76a', metal: '#2a2440', bark: '#6b4423', leaf: '#3f7a4a', leafD: '#2c5a38', leafL: '#5f9e5a', wood: '#a0703a', woodD: '#6b4423', woodL: '#c58a45' }, T0 || {});
      const PFX = 'fk' + T.id + '-', LIB = new Map();
      let used = null, CUT = 0;   // used — идёт сборка документа (doc), CUT — счётчик обрезок (clipPath) внутри него
      const O = (w = 4) => `stroke="${T.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
      // символ (или градиент) по имени: рисуется один раз, в документ попадает, если на него сослались
      const def = (name, make, raw = false) => { const id = PFX + name; if (!LIB.has(id)) LIB.set(id, raw ? make(id) : `<symbol id="${id}" overflow="visible">${make()}</symbol>`); return id; };
      const put = (id, x, y, sx = 1, sy = sx) => `<use href="#${id}" transform="translate(${f1(x)} ${f1(y)})${sx !== 1 || sy !== 1 ? ` scale(${f2(sx)} ${f2(sy)})` : ''}"/>`;
      // <defs> документа — по ссылкам в нём самом (href="#…", url(#…)) на символы и градиенты набора
      const reId = new RegExp('(?:href="#|url\\(#)(' + PFX.replace(/[-]/g, '\\-') + '[^")]+)', 'g');
      function wrap(body) { const ids = new Set(); for (const m of String(body).matchAll(reId)) if (LIB.has(m[1])) ids.add(m[1]); return (ids.size ? `<defs>${[...ids].map((i) => LIB.get(i)).join('')}</defs>` : '') + body; }
      function doc(fn) { const top = !used; if (top) { used = true; CUT = 0; } try { return wrap(fn()); } finally { if (top) used = null; } }
      const glowId = (c = T.glass, name = 'glow') => def(name + c.slice(1), (id) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".85"/><stop offset=".45" stop-color="${c}" stop-opacity=".3"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`, true);

      /* ---------- мостовая ---------- */
      const PV = Object.assign({ mortar: '#2c2a3a', stone: '#4f4c60', alt: '#5c586e', light: '#7a7690', dark: '#3a374a' }, T.pave || {});
      // палитры мостовой по имени: '' — мостовая стиля (T.pave), 'wood' — доски (прилавки, мостики, лавочки), остальные — T.paves[имя]
      const PAL = (nm) => (!nm ? PV : nm === 'wood' ? Object.assign({ mortar: T.woodD, stone: T.wood, alt: mix(T.wood, T.woodD, 0.3), light: T.woodL, dark: T.woodD }, (T.paves || {}).wood || {}) : Object.assign({}, PV, (T.paves || {})[nm] || {}));
      const TILES = {
        // булыжник: два ряда камней-подушек вперевязку, светлая кромка сверху, тень снизу
        cobble: { w: 168, h: 64, n: 3, make: (v, PV) => {
          const r = rng(101 + v * 37); let a = '', b = '', hi = '', lo = '';
          for (let row = 0; row < 2; row++) { let x = row ? -10 + r() * 6 : 2; const y = row * 32 + 2;
            while (x < 164) { let w = 30 + r() * 18; if (x + w > 166) w = 166 - x; if (w < 14) break; const h = 27 + r() * 3, sx = Math.max(1, x), sw = Math.min(w, 166 - sx);
              const d = pillow(sx + 1.5, y + 1, sw - 3, h - 2, r) + ' '; if (r() < 0.3) b += d; else a += d;
              hi += `M${f1(sx + 6)} ${f1(y + 9)} Q${f1(sx + 7)} ${f1(y + 4)} ${f1(sx + Math.min(18, sw * 0.5))} ${f1(y + 4)} `;
              lo += `M${f1(sx + sw * 0.3)} ${f1(y + h - 3)} H${f1(sx + sw - 6)} `; x += w; } }
          return `<path d="${a}" fill="${PV.stone}" stroke="${PV.dark}" stroke-width="2"/><path d="${b}" fill="${PV.alt}" stroke="${PV.dark}" stroke-width="2"/><path d="${hi}" stroke="${PV.light}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/><path d="${lo}" stroke="${PV.dark}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".8"/>`;
        } },
        // плитка (терраса котиков): фаска сверху, тень снизу; варианты — светлая, с трещиной, со следами лап
        tile: { w: 104, h: 40, n: 4, make: (v, PV) => {
          let g = `<rect x="1.5" y="1.5" width="101" height="37" rx="5" fill="${v === 1 ? PV.alt : PV.stone}" stroke="${PV.dark}" stroke-width="2.4"/><path d="M6 6 H98" stroke="${PV.light}" stroke-width="3.5" stroke-linecap="round" opacity=".75"/><path d="M8 34 H96" stroke="${PV.dark}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
          if (v === 2) g += `<path d="M30 3 l8 12 l-6 8 l10 14" stroke="${PV.dark}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>`;
          if (v === 3) g += [[34, 20], [64, 16]].map(([x, y]) => `<g fill="${PV.dark}" opacity=".45"><ellipse cx="${x}" cy="${y + 3}" rx="5" ry="4"/><circle cx="${x - 5}" cy="${y - 3}" r="1.8"/><circle cx="${x}" cy="${y - 5}" r="1.8"/><circle cx="${x + 5}" cy="${y - 3}" r="1.8"/></g>`).join('');
          return g;
        } },
        // доски настила (обезьяны): волокна, сучок, шляпки гвоздей у торцов
        plank: { w: 300, h: 40, n: 3, make: (v, PV) => {
          const r = rng(301 + v * 53); let g = '';
          let x = 0; while (x < 300) { let w = 90 + r() * 120; if (x + w > 300) w = 300 - x; if (w < 30) { w += 0; }
            const c = r() < 0.35 ? PV.alt : PV.stone;
            g += `<rect x="${f1(x + 1)}" y="1.5" width="${f1(w - 2)}" height="37" rx="3" fill="${c}" stroke="${PV.dark}" stroke-width="2.4"/>`;
            let gr = ''; for (let k = 0; k < 2; k++) { const yy = 12 + k * 13 + r() * 4; gr += `M${f1(x + 8)} ${f1(yy)} q${f1(w * 0.25)} ${f1(-3 + r() * 6)} ${f1(w * 0.5)} 0 t${f1(w * 0.42)} 0 `; }
            g += `<path d="${gr}" stroke="${PV.dark}" stroke-width="1.8" fill="none" opacity=".45"/><path d="M${f1(x + 5)} 6 H${f1(x + w - 6)}" stroke="${PV.light}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
            if (r() < 0.5) g += `<ellipse cx="${f1(x + w * (0.3 + r() * 0.4))}" cy="${f1(18 + r() * 6)}" rx="5" ry="3.4" fill="none" stroke="${PV.dark}" stroke-width="1.8" opacity=".6"/>`;
            g += `<circle cx="${f1(x + 7)}" cy="11" r="2" fill="${PV.dark}"/><circle cx="${f1(x + 7)}" cy="29" r="2" fill="${PV.dark}"/><circle cx="${f1(x + w - 7)}" cy="11" r="2" fill="${PV.dark}"/><circle cx="${f1(x + w - 7)}" cy="29" r="2" fill="${PV.dark}"/>`;
            x += w; }
          return g;
        } },
      };
      // мостовая в прямоугольнике box = [x0, y0, x1, y1]: ряды плиток, ниже — крупнее (перспектива). o.clip — путь обрезки,
      // o.k0 / o.k1 — масштаб у верха и низа, o.sx — растяжение по ширине, o.seed — раскладка, o.x0 — откуда отсчёт швов
      function pave(kind, box, o = {}) {
        const [x0, y0, x1, y1] = box, r = rng(o.seed || 7), M = TILES[kind], k0 = o.k0 == null ? 0.55 : o.k0, k1 = o.k1 == null ? 1.1 : o.k1, pn = o.pal || '', pal = PAL(pn);
        let s = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${o.mortar || pal.mortar}"/>`;
        let y = y0, row = 0;
        while (y < y1) { const k = k0 + (k1 - k0) * Math.min(1, (y - y0) / Math.max(1, y1 - y0)), sx = k * (o.sx || 1), w = M.w * sx, h = M.h * k;
          let x = (o.x0 == null ? x0 : o.x0) - (row % 2 ? w / 2 : 0) - (o.jit === false ? 0 : r() * w * 0.3); while (x > x0) x -= w;
          for (; x < x1; x += w) { const v = Math.floor(r() * M.n); s += put(def(kind + pn + v, () => M.make(v, pal)), x, y, sx, k); }
          y += h; row++; }
        if (o.cut) { const id = PFX + 'pc' + (++CUT); return `<clipPath id="${id}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${o.rx || 0}"/></clipPath><g clip-path="url(#${id})">${s}</g>`; }
        return o.clip ? `<g clip-path="url(#${o.clip})">${s}</g>` : s;
      }

      // одна плитка мостовой (своя раскладка рядов у стиля — например, плитка котиков, у которой швы совпадают с кварталом «Города»)
      const piece = (kind, v, x, y, sx, sy, pn = '') => put(def(kind + pn + v, () => TILES[kind].make(v, PAL(pn))), x, y, sx, sy);
      /* ---------- кладка стены: блоки разного тона, светлая кромка, щербины, мох у низа ---------- */
      const WL0 = Object.assign({ base: '#4d4a5c', light: '#5d5a6e', dark: '#3e3b4c', joint: '#2a2838', moss: '#3f6a4a' }, T.wallC || {});
      const WPAL = (nm) => (nm ? Object.assign({}, WL0, (T.walls || {})[nm] || {}) : WL0);
      function wallTile(v, WL) {
        const r = rng(501 + v * 71); let a = '', b = '', c = '', hi = '', cr = '';
        for (let row = 0; row < 2; row++) { let x = row ? -30 - r() * 20 : 0; const y = row * 58;
          while (x < 330) { let w = 70 + r() * 60; if (x + w > 330) w = 330 - x; if (w < 20) break; const sx = Math.max(0, x), sw = Math.min(x + w, 330) - sx;
            const d = `M${f1(sx + 3)} ${f1(y + 3)} H${f1(sx + sw - 3)} V${f1(y + 55)} H${f1(sx + 3)} Z `, t = r(); if (t < 0.25) b += d; else if (t < 0.45) c += d; else a += d;
            hi += `M${f1(sx + 7)} ${f1(y + 8)} H${f1(sx + sw * (0.4 + r() * 0.4))} `;
            if (r() < 0.18) cr += `M${f1(sx + sw * 0.5)} ${f1(y + 4)} l${f1(-4 + r() * 8)} ${f1(14 + r() * 8)} l${f1(6 + r() * 6)} ${f1(10 + r() * 8)} `;
            x += w; } }
        return `<rect width="330" height="116" fill="${WL.joint}"/><path d="${a}" fill="${WL.base}"/><path d="${b}" fill="${WL.light}"/><path d="${c}" fill="${WL.dark}"/><path d="${hi}" stroke="${mix(WL.light, '#ffffff', 0.18)}" stroke-width="3" stroke-linecap="round" opacity=".6"/><path d="${cr}" stroke="${WL.joint}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      }
      function wall(box, o = {}) {
        const [x0, y0, x1, y1] = box, r = rng(o.seed || 11), pn = o.pal || '', WL = WPAL(pn); let s = '';
        const k = o.scale || 1;
        for (let y = y0, row = 0; y < y1; y += 116 * k, row++) for (let x = x0 - (row % 2 ? 165 * k : 0); x < x1; x += 330 * k) { const v = Math.floor(r() * 3); s += put(def('wall' + pn + v, () => wallTile(v, WL)), x, y, k); }
        if (o.moss) { let m = ''; for (let x = x0; x < x1; x += 60 + r() * 140) m += blob(x, y1 - 4, 22 + r() * 26, 8 + r() * 5, r, 7, 0.25) + ' '; s += `<path d="${m}" fill="${WL.moss}" opacity=".85"/>`; }
        const id = o.id || PFX + 'wc' + (++CUT);
        return `<clipPath id="${id}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${o.rx || 0}"/></clipPath><g clip-path="url(#${id})">${s}</g>`;
      }

      /* ---------- черепица / дранка по многоугольнику крыши: ряды чешуек, у каждого ряда — тень сверху ---------- */
      const RFS = Object.assign({ slate: { a: '#4a4266', b: '#55497a', c: '#3e3858', edge: '#2a2440' }, red: { a: '#a3122a', b: '#b8263c', c: '#8a0f22', edge: '#5a0a16' } }, T.roofs || {});
      function shingleRow(v, kind, RF) {
        const r = rng(701 + v * 13); let a = '', b = '', c = '', hi = '';
        for (let x = 0; x < 240; x += 24) { const d = kind === 'flat' ? `M${x + 1} 0 V20 Q${x + 12} 26 ${x + 23} 20 V0 Z ` : kind === 'leaf' ? `M${x} 0 V8 Q${x + 5} 20 ${x + 12} 28 Q${x + 19} 20 ${x + 24} 8 V0 Z ` : `M${x} 0 V12 A12 12 0 0 0 ${x + 24} 12 V0 Z `, t = r(); if (t < 0.25) b += d; else if (t < 0.4) c += d; else a += d; hi += kind === 'leaf' ? `M${x + 12} 4 V22 ` : `M${x + 6} ${kind === 'flat' ? 6 : 8} q6 -3 12 0 `; }
        return `<path d="${a}" fill="${RF.a}"/><path d="${b}" fill="${RF.b}"/><path d="${c}" fill="${RF.c}"/><path d="${a}${b}${c}" fill="none" stroke="${RF.edge}" stroke-width="2"/><path d="${hi}" stroke="#ffffff" stroke-width="2" fill="none" opacity=".18" stroke-linecap="round"/>`;
      }
      // poly — точки крыши, box — её рамка; step — высота ряда
      function roof(poly, o = {}) {
        const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]), x0 = Math.min(...xs) - 24, x1 = Math.max(...xs) + 24, y0 = Math.min(...ys), y1 = Math.max(...ys), step = o.step || 18, kind = o.kind || 'round', id = o.id || PFX + 'rf' + Math.round(x0) + '_' + Math.round(y0);
        const po = o.pal && typeof o.pal === 'object' ? o.pal : null, pn = po ? 'c' + [po.a, po.b, po.c].join('').replace(/#/g, '') : o.pal || 'slate', RF = po ? Object.assign({ b: po.a, c: po.a, edge: T.ink }, po) : RFS[pn] || RFS.slate, sc = o.scale || 1;
        const d = 'M' + poly.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L') + ' Z'; let s = '';
        for (let y = y0 - 4, row = 0; y < y1; y += step * sc, row++) for (let x = x0 - (row % 2 ? 12 * sc : 0); x < x1; x += 240 * sc) { const v = row % 2; s += put(def('sh' + pn + kind + v, () => shingleRow(v, kind, RF)), x, y, sc); }
        return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${RF.a}"/><g clip-path="url(#${id})">${s}</g>` + (o.w === 0 ? '' : `<path d="${d}" fill="none" ${O(o.w || 5)}/>`);
      }

      /* ---------- фонари ---------- */
      // уличный фонарь: каменный башмак, столб с кольцами, завиток, фонарь с переплётом, колпак с шишечкой (высота 260, низ — 0)
      def('lamp', () => {
        const m = T.metal, gl = T.glass;
        return `<path d="M-20 0 L-16 -18 H16 L20 0 Z" fill="${mix(m, '#ffffff', 0.12)}" ${O(4)}/><rect x="-6" y="-200" width="12" height="184" fill="${m}" ${O(3.5)}/>`
          + `<rect x="-10" y="-96" width="20" height="10" rx="3" fill="${m}" ${O(3)}/><rect x="-9" y="-170" width="18" height="8" rx="3" fill="${m}" ${O(3)}/>`
          + `<path d="M6 -150 q22 -2 22 -24 q0 -14 -12 -14" fill="none" stroke="${T.line}" stroke-width="8" stroke-linecap="round"/><path d="M6 -150 q22 -2 22 -24 q0 -14 -12 -14" fill="none" stroke="${m}" stroke-width="4" stroke-linecap="round"/>`
          + `<path d="M-16 -204 H16 L12 -208 H-12 Z" fill="${m}" ${O(3)}/><path d="M-14 -206 L-18 -244 H18 L14 -206 Z" fill="${gl}" ${O(3.5)}/><path d="M0 -206 V-244 M-16 -226 H16" stroke="${m}" stroke-width="2.5"/><path d="M-8 -238 v24" stroke="#fffbe0" stroke-width="3" stroke-linecap="round" opacity=".8"/>`
          + `<path d="M-24 -244 H24 L0 -262 Z" fill="${m}" ${O(3.5)}/><circle cy="-266" r="5" fill="${m}" ${O(2.5)}/>`;
      });
      // h — высота до низа фонаря; glow — свет вокруг (кольцо мерцания добавляет сам стиль, если хочет)
      const lamp = (x, base, h = 260, o = {}) => (o.glow === false ? '' : `<circle cx="${f1(x)}" cy="${f1(base - h * 0.86)}" r="${f1(h * 0.34)}" fill="url(#${glowId()})" opacity=".8"/>`)
        + (o.pool === false ? '' : `<ellipse cx="${f1(x)}" cy="${f1(base + 4)}" rx="${f1(h * 0.42)}" ry="${f1(h * 0.08)}" fill="url(#${glowId()})" opacity=".35"/>`) + put(def('lamp', () => ''), x, base, h / 260);
      // фонарный столб с кованой рукой и подвесным фонарём (высота 400, низ — 0, фонарь — на 44 правее столба)
      def('plamp', () => {
        const m = T.metal, gl = T.glass;
        return `<path d="M-18 0 L-14 -20 H14 L18 0 Z" fill="${mix(m, '#ffffff', 0.12)}" ${O(4)}/><rect x="-6" y="-392" width="12" height="374" fill="${m}" ${O(3.5)}/>`
          + [-120, -250, -360].map((y) => `<rect x="-10" y="${y}" width="20" height="9" rx="3" fill="${m}" ${O(3)}/>`).join('')
          + `<path d="M0 -380 H50 M0 -350 Q30 -350 40 -380" fill="none" stroke="${T.line}" stroke-width="8" stroke-linecap="round"/><path d="M0 -380 H50 M0 -350 Q30 -350 40 -380" fill="none" stroke="${m}" stroke-width="4" stroke-linecap="round"/><circle cx="0" cy="-398" r="6" fill="${m}" ${O(2.5)}/>`
          + `<path d="M44 -380 v10" stroke="${m}" stroke-width="3"/><path d="M30 -370 H58 L52 -376 H36 Z" fill="${m}" ${O(3)}/><path d="M32 -370 L29 -330 H59 L56 -370 Z" fill="${gl}" ${O(3.5)}/><path d="M44 -370 V-330 M30 -350 H58" stroke="${m}" stroke-width="2.5"/><path d="M37 -364 v24" stroke="#fffbe0" stroke-width="3" stroke-linecap="round" opacity=".8"/><path d="M26 -330 H62 L54 -322 H34 Z" fill="${m}" ${O(3)}/><circle cx="44" cy="-316" r="4" fill="${m}"/>`;
      });
      const postLamp = (x, base, h = 400) => put(def('plamp', () => ''), x, base, h / 400);
      // настенный фонарь на кованом кронштейне (крепление — x, y; dir — куда кронштейн)
      def('wlamp', () => {
        const m = T.metal; return `<rect x="-5" y="-14" width="10" height="28" rx="3" fill="${m}" ${O(3)}/><path d="M0 0 H34 M0 12 Q20 12 28 0" fill="none" stroke="${T.line}" stroke-width="7" stroke-linecap="round"/><path d="M0 0 H34 M0 12 Q20 12 28 0" fill="none" stroke="${m}" stroke-width="3.5" stroke-linecap="round"/>`
          + `<path d="M34 0 v8" stroke="${m}" stroke-width="3"/><path d="M24 8 H44 L40 12 H28 Z" fill="${m}" ${O(2.5)}/><path d="M27 12 L25 38 H43 L41 12 Z" fill="${T.glass}" ${O(3)}/><path d="M34 12 V38" stroke="${m}" stroke-width="2"/><path d="M22 38 H46 L40 44 H28 Z" fill="${m}" ${O(2.5)}/>`;
      });
      const wallLamp = (x, y, dir = 1) => `<circle cx="${f1(x + dir * 34)}" cy="${f1(y + 26)}" r="58" fill="url(#${glowId()})" opacity=".75"/>` + put(def('wlamp', () => ''), x, y, dir, 1);

      /* ---------- деревья и кусты ---------- */
      const LF = { a: T.leaf, d: T.leafD, l: T.leafL };
      def('tree', () => { const r = rng(901); let d = '', dk = '', lt = '';
        for (const [x, y, rx, ry] of [[-44, -150, 46, 40], [40, -154, 48, 42], [0, -196, 56, 48], [0, -150, 44, 40], [-20, -120, 40, 30], [26, -118, 42, 30]]) { d += blob(x, y, rx, ry, r, 9, 0.12) + ' '; dk += blob(x + 6, y + 12, rx * 0.8, ry * 0.6, r, 8, 0.15) + ' '; }
        for (const [x, y] of [[-30, -176], [10, -214], [44, -170], [-52, -140]]) lt += blob(x, y, 16, 10, r, 7, 0.2) + ' ';
        return `<ellipse cx="0" cy="2" rx="62" ry="10" fill="${T.ink}" opacity=".3"/><path d="M-12 0 Q-8 -50 -10 -100 L-30 -128 M8 0 Q6 -60 10 -104 L34 -132 M-2 -96 L2 -150" fill="none" stroke="${T.line}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="M-12 0 Q-8 -50 -10 -100 L-30 -128 M8 0 Q6 -60 10 -104 L34 -132 M-2 -96 L2 -150" fill="none" stroke="${T.bark}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M-14 0 Q-10 -60 -6 -104 L10 -104 Q6 -60 10 0 Z" fill="${T.bark}"/>`
          + `<path d="${d}" fill="${LF.a}" ${O(9)}/><path d="${d}" fill="${LF.a}"/><path d="${dk}" fill="${LF.d}" opacity=".9"/><path d="${lt}" fill="${LF.l}"/>`; });
      def('cypress', () => `<ellipse cx="0" cy="2" rx="30" ry="7" fill="${T.ink}" opacity=".3"/><rect x="-5" y="-26" width="10" height="28" fill="${T.bark}" ${O(3)}/><path d="M0 -230 C30 -170 34 -80 22 -30 Q0 -18 -22 -30 C-34 -80 -30 -170 0 -230 Z" fill="${LF.a}" ${O(4.5)}/><path d="M8 -190 C22 -140 24 -80 14 -36 Q4 -30 -2 -32 C10 -90 12 -150 8 -190 Z" fill="${LF.d}"/><path d="M-6 -200 q-10 40 -12 90 M-2 -150 q-8 30 -8 70" stroke="${LF.l}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`);
      def('topiary', () => { const r = rng(933); return `<path d="M-26 0 L-30 -40 H30 L26 0 Z" fill="#b5533c" ${O(4)}/><rect x="-34" y="-48" width="68" height="12" rx="4" fill="#c86a4a" ${O(3.5)}/><rect x="-4" y="-80" width="8" height="34" fill="${T.bark}" ${O(2.5)}/><path d="${blob(0, -110, 40, 38, r, 10, 0.1)}" fill="${LF.a}" ${O(4)}/><path d="${blob(8, -98, 26, 18, r, 8, 0.15)}" fill="${LF.d}"/><path d="${blob(-12, -124, 12, 8, r, 7, 0.2)}" fill="${LF.l}"/>`; });
      def('bush', () => { const r = rng(955); let d = '', dk = '', lt = ''; for (const [x, y, rx, ry] of [[-34, -26, 30, 24], [0, -38, 34, 30], [34, -24, 28, 22]]) { d += blob(x, y, rx, ry, r, 8, 0.14) + ' '; dk += blob(x + 4, y + 8, rx * 0.7, ry * 0.5, r, 7, 0.15) + ' '; } lt += blob(-8, -52, 12, 7, r, 6, 0.2) + ' ' + blob(28, -36, 9, 6, r, 6, 0.2); return `<path d="${d}" fill="${LF.a}" ${O(8)}/><path d="${d}" fill="${LF.a}"/><path d="${dk}" fill="${LF.d}"/><path d="${lt}" fill="${LF.l}"/>`; });
      def('palm', () => { let fr = '', fd = ''; for (const [a, l] of [[-160, 96], [-125, 110], [-60, 104], [-20, 92], [-95, 80], [10, 70]]) { const rad = (a * Math.PI) / 180, ex = Math.cos(rad) * l, ey = -230 + Math.sin(rad) * l * 0.55 + l * 0.35; fr += `M0 -230 Q${f1(ex * 0.5)} ${f1(-262 + ey * 0.1)} ${f1(ex)} ${f1(ey)} Q${f1(ex * 0.45)} ${f1(-226 + ey * 0.1)} 0 -222 Z `; fd += `M0 -228 Q${f1(ex * 0.5)} ${f1(-250 + ey * 0.1)} ${f1(ex * 0.9)} ${f1(ey - 2)} `; }
        return `<ellipse cx="0" cy="2" rx="44" ry="8" fill="${T.ink}" opacity=".3"/><path d="M-12 0 Q-2 -120 -4 -232 L6 -232 Q12 -120 12 0 Z" fill="${T.bark}" ${O(4)}/>` + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M-8 ${-24 - i * 26} q8 -6 18 0" stroke="${mix(T.bark, '#000000', 0.3)}" stroke-width="3" fill="none"/>`).join('') + `<path d="${fr}" fill="${LF.a}" ${O(4)}/><path d="${fd}" stroke="${LF.d}" stroke-width="3" fill="none"/><circle cx="-6" cy="-224" r="7" fill="#8a5a32" ${O(2.5)}/><circle cx="7" cy="-222" r="7" fill="#8a5a32" ${O(2.5)}/>`; });
      const tree = (kind, x, base, s = 1, flip = false) => put(def(kind, () => ''), x, base, flip ? -s : s, s);

      /* ---------- ящики, бочки, цветочный ящик ---------- */
      def('barrel', () => `<path d="M-28 0 C-36 -30 -36 -60 -28 -90 H28 C36 -60 36 -30 28 0 Z" fill="${T.wood}" ${O(4)}/><path d="M-12 -88 C-16 -60 -16 -30 -12 -2 M12 -88 C16 -60 16 -30 12 -2" stroke="${T.woodD}" stroke-width="2.5" fill="none" opacity=".7"/><path d="M-32 -22 H32 M-33 -68 H33" stroke="#4a4a4f" stroke-width="6"/><path d="M-30 -24 H30 M-31 -70 H31" stroke="#8a8a96" stroke-width="2" opacity=".8"/><ellipse cy="-90" rx="28" ry="6" fill="${T.woodL}" ${O(3)}/>`);
      def('crate', () => `<rect x="-34" y="-62" width="68" height="62" fill="${T.woodL}" ${O(4)}/><rect x="-28" y="-56" width="56" height="50" fill="none" stroke="${T.woodD}" stroke-width="3"/><path d="M-28 -56 L28 -6 M-28 -6 L28 -56" stroke="${T.woodD}" stroke-width="5"/><path d="M-30 -40 H30 M-30 -22 H30" stroke="${T.woodD}" stroke-width="1.6" opacity=".5"/>` + [[-29, -57], [29, -57], [-29, -5], [29, -5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#4a4a4f"/>`).join(''));
      def('flowers', () => `<rect x="-30" y="-14" width="60" height="14" rx="3" fill="${T.woodD}" ${O(3)}/><path d="M-26 -14 q-4 -10 2 -16 M-12 -14 q0 -12 4 -18 M4 -14 q2 -12 -2 -18 M18 -14 q4 -10 0 -16" stroke="${LF.a}" stroke-width="3" fill="none"/>` + [[-24, -30, '#e8455c'], [-8, -33, '#ffc94d'], [6, -33, '#ff9fb2'], [20, -30, '#b9a2ff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}" stroke="${T.ink}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="#fff6c8"/>`).join(''));
      const thing = (kind, x, base, s = 1) => put(def(kind, () => ''), x, base, s);

      /* ---------- вывеска-доска с рамкой и болтами (текст — сверху у стиля) ---------- */
      const board = (x, y, w, h, fill, edge = T.ink) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="9" fill="${fill}" ${O(5)}/><rect x="${f1(x + 7)}" y="${f1(y + 7)}" width="${f1(w - 14)}" height="${f1(h - 14)}" rx="6" fill="none" stroke="${mix(fill, '#000000', 0.35)}" stroke-width="2.5"/><path d="M${f1(x + 12)} ${f1(y + h * 0.36)} H${f1(x + w - 12)} M${f1(x + 12)} ${f1(y + h * 0.68)} H${f1(x + w - 12)}" stroke="${mix(fill, '#000000', 0.25)}" stroke-width="1.6" opacity=".5"/>` + [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 10], [x + w - 10, y + h - 10]].map(([bx, by]) => `<circle cx="${f1(bx)}" cy="${f1(by)}" r="3" fill="${mix(fill, '#ffffff', 0.45)}" stroke="${edge}" stroke-width="1.2"/>`).join('');
      // цепи от крюков до вывески
      const chains = (pts) => pts.map(([x, y0, y1]) => `<path d="M${f1(x)} ${f1(y0)} V${f1(y1)}" stroke="${T.line}" stroke-width="6" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y0)} V${f1(y1)}" stroke="#9aa0b4" stroke-width="3" stroke-dasharray="5 3"/>`).join('');

      /* ---------- 26.10 (art/buildings): детали зданий — обшивка досками, окно с рамой и ставнями, дверь из досок с петлями,
         водосток, труба с кладкой, штукатурка с пятнами (одинаковое — символами) ---------- */
      // доска обшивки 18×100: тон, волокна, светлая кромка, тень стыка, гвозди
      const vplank = (v, c) => def('vpl' + c.slice(1) + v, () => { const r = rng(41 + v * 17), cc = v === 1 ? mix(c, T.ink, 0.08) : v === 2 ? mix(c, '#ffffff', 0.06) : c;
        return `<rect x="0.8" width="16.4" height="100" fill="${cc}"/><path d="M5 ${f1(8 + r() * 10)} v${f1(30 + r() * 20)} M11 ${f1(40 + r() * 10)} v${f1(30 + r() * 20)}" stroke="${mix(c, T.ink, 0.3)}" stroke-width="1.4" stroke-linecap="round" opacity=".6"/><path d="M2.5 2 V98" stroke="${mix(c, '#ffffff', 0.2)}" stroke-width="1.6" opacity=".6"/><path d="M17 0 V100" stroke="${mix(c, T.ink, 0.4)}" stroke-width="2"/><circle cx="9" cy="6" r="1.6" fill="${T.ink}"/><circle cx="9" cy="94" r="1.6" fill="${T.ink}"/>`; });
      function planks(box, c = T.wood, pw = 18) { const [x0, y0, x1, y1] = box; let s = ''; for (let x = x0, i = 0; x < x1 - 1; x += pw, i++) s += put(vplank((i + Math.round(y0)) % 3, c), x, y0, Math.min(pw, x1 - x) / 18, (y1 - y0) / 100); return s; }
      // пятна штукатурки (детерминированно по рамке)
      function plaster(box, c) { const [x0, y0, x1, y1] = box, r = rng(Math.round(x0 * 7 + y0)); let a = '', b = ''; const n = Math.max(2, Math.round((x1 - x0) * (y1 - y0) / 9000)); for (let i = 0; i < n; i++) { const d = blob(x0 + 14 + r() * (x1 - x0 - 28), y0 + 12 + r() * (y1 - y0 - 24), 10 + r() * 16, 6 + r() * 7, r, 7, 0.25) + ' '; if (i % 2) a += d; else b += d; } return `<path d="${a}" fill="${mix(c, '#ffffff', 0.14)}" opacity=".7"/><path d="${b}" fill="${mix(c, T.ink, 0.08)}" opacity=".6"/>`; }
      // окно: наличник, стекло (светится), переплёт, блик, подоконник; o.shut — ставни, o.box — ящик с цветами, o.round — арка
      function win(x, y, w, h, o = {}) {
        const lit = o.lit !== false, fr = o.frame || T.woodD, gl = lit ? T.glass : '#3a3a55';
        const top = o.round ? `M${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} H${x} Z` : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
        const fra = o.round ? `M${x - 5} ${y + h + 2} V${y + w / 2} A${w / 2 + 5} ${w / 2 + 5} 0 0 1 ${x + w + 5} ${y + w / 2} V${y + h + 2} Z` : `M${x - 5} ${y - 5} H${x + w + 5} V${y + h + 2} H${x - 5} Z`;
        let s = (lit && o.glow !== false ? `<ellipse cx="${f1(x + w / 2)}" cy="${f1(y + h / 2)}" rx="${f1(w)}" ry="${f1(h * 0.8)}" fill="url(#${glowId()})" opacity=".5"/>` : '') + `<path d="${fra}" fill="${fr}" ${O(3.5)}/><path d="${top}" fill="${gl}" stroke="${T.ink}" stroke-width="2"/>`;
        if (lit) s += `<path d="M${f1(x + 3)} ${f1(y + h - 3)} L${f1(x + w * 0.45)} ${f1(y + h * 0.5)} H${f1(x + w - 3)} V${f1(y + h - 3)} Z" fill="#ffb84a" opacity=".5"/>`;
        s += `<path d="M${f1(x + w / 2)} ${f1(y + (o.round ? 2 : 0))} V${f1(y + h)} M${x} ${f1(y + h * 0.55)} H${x + w}" stroke="${fr}" stroke-width="3.5"/><path d="M${f1(x + 4)} ${f1(y + h * 0.42)} l${f1(w * 0.24)} ${f1(-h * 0.24)}" stroke="#fffbe0" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`;
        s += `<rect x="${f1(x - 8)}" y="${f1(y + h)}" width="${f1(w + 16)}" height="7" rx="2" fill="${o.sill || '#a8a4b6'}" ${O(2.5)}/>`;
        if (o.shut) for (const sx of [x - 5 - w * 0.5, x + w + 5]) { s += `<rect x="${f1(sx)}" y="${f1(y - 4)}" width="${f1(w * 0.5)}" height="${f1(h + 6)}" fill="${o.shut}" ${O(3)}/><path d="M${f1(sx + w * 0.25)} ${f1(y)} V${f1(y + h)}" stroke="${mix(o.shut, T.ink, 0.35)}" stroke-width="1.8"/><path d="M${f1(sx + 3)} ${f1(y + h * 0.25)} l${f1(w * 0.5 - 6)} ${f1(h * 0.18)}" stroke="${mix(o.shut, T.ink, 0.35)}" stroke-width="2"/>`; }
        if (o.box) s += put(def('flowers', () => ''), x + w / 2, y + h + 20, (w + 16) / 60);
        return s;
      }
      // дверь из досок: стыки по арке, две кованые петли с гвоздями, кольцо-ручка, порог
      function door(x, base, w, h, o = {}) {
        const c = o.c || T.woodD, r = w / 2, ay = base - h + r, n = Math.max(2, Math.round(w / 14)), arch = o.arch !== false;
        let pl = ''; for (let i = 1; i < n; i++) { const dx = -r + (w * i) / n; pl += `M${f1(x + dx)} ${f1(arch ? ay - Math.sqrt(Math.max(0, r * r - dx * dx)) + 2 : base - h + 2)} V${f1(base - 2)}`; }
        let hn = '', nl = ''; for (const y of [base - h * 0.72, base - h * 0.26]) { hn += `M${f1(x - r + 1)} ${f1(y)} h${f1(w * 0.62)} l5 3 l-5 3 h${f1(-w * 0.62)} Z `; nl += `M${f1(x - r + 7)} ${f1(y + 3)}h0.1M${f1(x - r + w * 0.34)} ${f1(y + 3)}h0.1`; }
        const sh = arch ? `M${f1(x - r)} ${f1(base)} V${f1(ay)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r)} ${f1(ay)} V${f1(base)} Z` : `M${f1(x - r)} ${f1(base)} V${f1(base - h)} H${f1(x + r)} V${f1(base)} Z`;
        return `<path d="${sh}" fill="${c}" ${O(4)}/><path d="${pl}" stroke="${mix(c, T.ink, 0.35)}" stroke-width="2.2"/>` + (o.hinges === false ? '' : `<path d="${hn}" fill="${T.metal}" stroke="${T.ink}" stroke-width="1.6"/><path d="${nl}" stroke="#a9b1b6" stroke-width="2.6" stroke-linecap="round"/>`)
          + `<circle cx="${f1(x + r * 0.5)}" cy="${f1(base - h / 2.4)}" r="5" fill="none" stroke="${T.ink}" stroke-width="3.5"/><circle cx="${f1(x + r * 0.5)}" cy="${f1(base - h / 2.4)}" r="5" fill="none" stroke="#ffc94d" stroke-width="2"/>`
          + (o.step === false ? '' : `<rect x="${f1(x - r - 6)}" y="${f1(base - 3)}" width="${f1(w + 12)}" height="7" rx="2" fill="${o.stepC || '#8b8796'}" ${O(2.5)}/>`);
      }
      // водосток: жёлоб под свесом (x0…x1, y) и труба по углу (gx) до низа
      const gutter = (x0, x1, y, gx, base, c = '#8a8e9e') => `<path d="M${x0} ${y} H${x1}" stroke="${T.ink}" stroke-width="10" stroke-linecap="round"/><path d="M${x0} ${y} H${x1}" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/><path d="M${x0 + 2} ${y - 1.5} H${x1 - 2}" stroke="#ffffff" stroke-width="1.5" opacity=".45"/>`
        + `<path d="M${gx} ${y} V${base - 10} q0 8 -10 8" stroke="${T.ink}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${gx} ${y} V${base - 10} q0 8 -10 8" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
        + [0.35, 0.7].map((t) => `<rect x="${gx - 6}" y="${f1(y + (base - y) * t)}" width="12" height="5" rx="1.5" fill="${T.metal}" ${O(1.5)}/>`).join('');
      // труба с кладкой и колпаком (низ — за крышей)
      function chimney(x, y, w, h, c = '#7a6a6a', cap = '#4a4552') { let br = ''; for (let yy = y + 12, r = 0; yy < y + h - 2; yy += 10, r++) { br += `M${f1(x - w / 2 + 2)} ${f1(yy)} H${f1(x + w / 2 - 2)}`; for (let xx = x - w / 2 + (r % 2 ? 6 : 12); xx < x + w / 2 - 3; xx += 12) br += `M${f1(xx)} ${f1(yy - 10)} v10`; }
        return `<rect x="${f1(x - w / 2)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${c}" ${O(4)}/><path d="${br}" stroke="${mix(c, T.ink, 0.4)}" stroke-width="1.6" opacity=".75"/><rect x="${f1(x - w / 2 + 2)}" y="${f1(y + 2)}" width="${f1(w * 0.3)}" height="${f1(h - 4)}" fill="#ffffff" opacity=".1"/><rect x="${f1(x - w / 2 - 5)}" y="${f1(y - 8)}" width="${f1(w + 10)}" height="11" rx="2" fill="${cap}" ${O(3)}/>`; }

      /* ---------- 26.10 (art/camp): ЛАГЕРЬ - палатки, костёр, котёл, частокол, бельё, стойки, мишени (стартовая локация «Перепутье»,
         legacy/site/public/campart.js). Новые символы, прежние не тронуты. Цвета - из темы стиля T и параметров (ткань палатки и т. п.);
         символ с другим цветом - другое имя. Низ предмета - base (y), середина - x. ---------- */
      const CK = (c) => String(c || '').replace(/[^0-9a-z]/gi, '').slice(0, 12);
      // колышек с верёвкой: верёвка от точки (ax, ay) к колышку (px, py)
      const peg = (ax, ay, px, py) => `<path d="M${f1(ax)} ${f1(ay)} L${f1(px)} ${f1(py)}" stroke="${T.ink}" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><path d="M${f1(px - 3)} ${f1(py + 6)} L${f1(px + 1)} ${f1(py - 8)} L${f1(px + 5)} ${f1(py + 6)} Z" fill="${T.woodL}" stroke="${T.ink}" stroke-width="2"/>`;
      /* палатка-«домик» (двускатная) в три четверти: фронтон с пологом слева, скат крыши уходит вправо-назад.
         o: c - ткань, d - тень ткани, s - полоса / кайма (или ''), open - полог подвязан (видно нутро и подстилку), flip - вход справа,
         patch - заплатка, mud - грязь по низу, pole - цвет кольев, vane - флажок на коньке (цвет), in - что видно внутри (svg в коорд. палатки) */
      function tentRidge(x, base, w, o = {}) {
        const c = o.c || '#e8dcc0', d = o.d || mix(c, T.ink, 0.28), lt = mix(c, '#ffffff', 0.22), h = w * (o.hk || 0.6), fw = w * 0.52, x0 = x - w / 2, sg = o.flip ? -1 : 1;
        const P = (px, py) => [f1(x + (px - x) * sg), f1(py)];   // зеркало по x вокруг середины
        const A = P(x0 + fw / 2, base - h), B = P(x0, base), C = P(x0 + fw, base), A2 = P(x0 + fw / 2 + w * 0.48, base - h - 10), C2 = P(x0 + w, base - 12);
        const pt = (p) => p.join(' ');
        let s = `<ellipse cx="${f1(x + sg * w * 0.06)}" cy="${f1(base + 2)}" rx="${f1(w * 0.56)}" ry="${f1(w * 0.07)}" fill="${T.ink}" opacity=".32"/>`;
        // верёвки к колышкам (за палаткой - заднего конька)
        s += peg(A2[0], A2[1] + 6, A2[0] + sg * w * 0.16, base - 22);
        // скат крыши (дальний): полотнище с провисом и швами
        const ridge = `M${pt(A)} L${pt(A2)} L${pt(C2)} Q${f1((C[0] + C2[0]) / 2)} ${f1(base - 2)} ${pt(C)} Z`;
        s += `<path d="${ridge}" fill="${d}" ${O(4.5)}/>`;
        for (let k = 1; k < 4; k++) { const t = k / 4, ax = A[0] + (A2[0] - A[0]) * t, ay = A[1] + (A2[1] - A[1]) * t, bx = C[0] + (C2[0] - C[0]) * t, by = base - 2 - 10 * t; s += `<path d="M${f1(ax)} ${f1(ay + 3)} Q${f1((ax + bx) / 2 + sg * 6)} ${f1((ay + by) / 2 + 4)} ${f1(bx)} ${f1(by)}" stroke="${mix(d, T.ink, 0.25)}" stroke-width="2" fill="none" opacity=".7"/>`; }
        s += `<path d="M${f1(A[0] + sg * 6)} ${f1(A[1] + 8)} L${f1(A2[0] - sg * 4)} ${f1(A2[1] + 8)}" stroke="${mix(d, '#ffffff', 0.2)}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
        if (o.s) s += `<path d="M${pt(C)} Q${f1((C[0] + C2[0]) / 2)} ${f1(base - 2)} ${pt(C2)} L${f1(C2[0])} ${f1(C2[1] - 14)} Q${f1((C[0] + C2[0]) / 2)} ${f1(base - 16)} ${f1(C[0])} ${f1(base - 14)} Z" fill="${o.s}" stroke="${T.ink}" stroke-width="2.5"/>`;
        if (o.patch) { const px = A[0] + (A2[0] - A[0]) * 0.55 + sg * 20, py = base - h * 0.45; s += `<rect x="${f1(px - 16)}" y="${f1(py - 12)}" width="32" height="24" rx="3" fill="${o.patch}" stroke="${T.ink}" stroke-width="2.5" transform="rotate(${-8 * sg} ${f1(px)} ${f1(py)})"/><path d="M${f1(px - 12)} ${f1(py - 8)} h4 M${f1(px - 4)} ${f1(py - 8)} h4 M${f1(px + 4)} ${f1(py - 8)} h4" stroke="${T.ink}" stroke-width="1.6" transform="rotate(${-8 * sg} ${f1(px)} ${f1(py)})"/>`; }
        // фронтон
        const fr = `M${pt(A)} L${pt(B)} Q${f1((B[0] + C[0]) / 2)} ${f1(base + 3)} ${pt(C)} Z`;
        s += `<path d="${fr}" fill="${c}" ${O(4.5)}/>`;
        s += `<path d="M${f1(A[0] - sg * 4)} ${f1(A[1] + 10)} L${f1(B[0] + sg * 10)} ${f1(base - 6)}" stroke="${lt}" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
        if (o.s) s += `<path d="M${pt(B)} Q${f1((B[0] + C[0]) / 2)} ${f1(base + 3)} ${pt(C)} L${f1(C[0] - sg * 8)} ${f1(base - 14)} H${f1(B[0] + sg * 8)} Z" fill="${o.s}" stroke="${T.ink}" stroke-width="2.5"/>`;
        // вход: тёмная щель, полог подвязан
        const dx = (C[0] - B[0]) / 2, mx = (B[0] + C[0]) / 2, dh = h * 0.72;
        if (o.open !== false) {
          s += `<path d="M${f1(mx)} ${f1(base - dh)} L${f1(mx - dx * 0.5)} ${f1(base)} H${f1(mx + dx * 0.5)} Z" fill="${mix(T.ink, c, 0.15)}" stroke="${T.ink}" stroke-width="3"/>`;
          if (o.in) s += o.in(mx, base, dx * 0.5, dh);
          else s += `<path d="M${f1(mx - dx * 0.34)} ${f1(base - 4)} Q${f1(mx)} ${f1(base - 16)} ${f1(mx + dx * 0.34)} ${f1(base - 4)}" fill="${o.bed || '#7a5a9a'}" stroke="${T.ink}" stroke-width="2"/>`;
          s += `<path d="M${f1(mx)} ${f1(base - dh)} Q${f1(mx - dx * 0.62)} ${f1(base - dh * 0.5)} ${f1(mx - dx * 0.5)} ${f1(base)} L${f1(mx - dx * 0.86)} ${f1(base)} Q${f1(mx - dx * 0.78)} ${f1(base - dh * 0.6)} ${f1(mx)} ${f1(base - dh)} Z" fill="${lt}" stroke="${T.ink}" stroke-width="2.5"/>`;
          s += `<path d="M${f1(mx)} ${f1(base - dh)} Q${f1(mx + dx * 0.62)} ${f1(base - dh * 0.5)} ${f1(mx + dx * 0.5)} ${f1(base)} L${f1(mx + dx * 0.86)} ${f1(base)} Q${f1(mx + dx * 0.78)} ${f1(base - dh * 0.6)} ${f1(mx)} ${f1(base - dh)} Z" fill="${lt}" stroke="${T.ink}" stroke-width="2.5"/>`;
          s += `<path d="M${f1(mx - dx * 0.7)} ${f1(base - dh * 0.42)} h${f1(dx * 0.18)} M${f1(mx + dx * 0.52)} ${f1(base - dh * 0.42)} h${f1(dx * 0.18)}" stroke="${o.tie || '#c8402a'}" stroke-width="4" stroke-linecap="round"/>`;
        } else s += `<path d="M${f1(mx)} ${f1(base - dh)} V${f1(base)}" stroke="${mix(c, T.ink, 0.4)}" stroke-width="2.5"/>`;
        if (o.mud) s += `<path d="M${f1(B[0] + sg * 6)} ${f1(base - 4)} q${f1(sg * 14)} -10 ${f1(sg * 28)} -2 q${f1(sg * 14)} -9 ${f1(sg * 26)} 0" stroke="${mix(c, '#5a4030', 0.6)}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
        // кол на коньке, верёвки фронтона
        s += `<path d="M${pt(A)} V${f1(A[1] - 16)}" stroke="${T.ink}" stroke-width="7" stroke-linecap="round"/><path d="M${pt(A)} V${f1(A[1] - 16)}" stroke="${o.pole || T.woodL}" stroke-width="3.5" stroke-linecap="round"/>`;
        s += peg(A[0], A[1] + 4, A[0] - sg * w * 0.34, base - 4);
        if (o.vane) s += `<path d="M${pt(A2)} V${f1(A2[1] - 34)}" stroke="${T.ink}" stroke-width="5" stroke-linecap="round"/><path d="M${f1(A2[0])} ${f1(A2[1] - 34)} l${f1(sg * 26)} 6 l${f1(-sg * 26)} 8 Z" fill="${o.vane}" stroke="${T.ink}" stroke-width="2.5"/>`;
        return s;
      }
      /* круглая палатка-«колокол» (шатёр с конусом): стенка, конус крыши, полог. o: c, s (полосы), d, open, top (шишечка), vane */
      function tentBell(x, base, w, o = {}) {
        const c = o.c || '#e8dcc0', d = o.d || mix(c, T.ink, 0.25), lt = mix(c, '#ffffff', 0.2), rw = w / 2, wh = w * (o.wk || 0.24), ch = w * (o.hk || 0.42), top = base - wh - ch;
        let s = `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="${f1(rw * 1.08)}" ry="${f1(w * 0.08)}" fill="${T.ink}" opacity=".32"/>`;
        s += peg(x - rw * 0.9, base - wh, x - rw * 1.2, base - 6) + peg(x + rw * 0.9, base - wh, x + rw * 1.2, base - 6);
        // стенка
        s += `<path d="M${f1(x - rw)} ${f1(base - wh)} V${f1(base - 4)} Q${f1(x)} ${f1(base + 10)} ${f1(x + rw)} ${f1(base - 4)} V${f1(base - wh)} Z" fill="${d}" ${O(4.5)}/>`;
        if (o.s) for (let k = -2; k <= 2; k++) { if (k % 2 === 0) continue; const a = x + k * rw * 0.4; s += `<path d="M${f1(a - rw * 0.2)} ${f1(base - wh)} V${f1(base + 2)} H${f1(a + rw * 0.2)} V${f1(base - wh)} Z" fill="${mix(o.s, T.ink, 0.15)}" opacity=".9"/>`; }
        // конус крыши: дольки
        const cone = `M${f1(x)} ${f1(top)} L${f1(x - rw * 1.04)} ${f1(base - wh)} Q${f1(x)} ${f1(base - wh + 16)} ${f1(x + rw * 1.04)} ${f1(base - wh)} Z`;
        s += `<path d="${cone}" fill="${c}" ${O(4.5)}/>`;
        if (o.s) for (let k = -3; k <= 3; k += 2) { const a = x + k * rw * 0.3, b = x + (k + 1) * rw * 0.3; s += `<path d="M${f1(x)} ${f1(top + 4)} L${f1(a)} ${f1(base - wh + 10 - Math.abs(a - x) * 0.06)} L${f1(b)} ${f1(base - wh + 10 - Math.abs(b - x) * 0.06)} Z" fill="${o.s}"/>`; }
        s += `<path d="M${f1(x - 6)} ${f1(top + 14)} L${f1(x - rw * 0.7)} ${f1(base - wh + 2)}" stroke="${lt}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
        // кайма-фестоны по краю конуса
        let fs = ''; const n = Math.max(6, Math.round(w / 34)); for (let i = 0; i < n; i++) { const a = x - rw * 1.02 + (i + 0.5) * (rw * 2.04 / n), y = base - wh + 6 + Math.abs(a - x) * -0.04 + 4; fs += `<path d="M${f1(a - rw / n)} ${f1(y - 6)} Q${f1(a)} ${f1(y + 10)} ${f1(a + rw / n)} ${f1(y - 6)} Z" fill="${i % 2 ? (o.s || d) : c}" stroke="${T.ink}" stroke-width="2"/>`; }
        s += fs;
        // вход
        const dh = wh + ch * 0.36, dw = w * 0.14;
        if (o.open !== false) s += `<path d="M${f1(x - dw)} ${f1(base)} L${f1(x)} ${f1(base - dh)} L${f1(x + dw)} ${f1(base)} Z" fill="${mix(T.ink, c, 0.15)}" stroke="${T.ink}" stroke-width="3"/>`
          + (o.in ? o.in(x, base, dw, dh) : '') + `<path d="M${f1(x)} ${f1(base - dh)} L${f1(x - dw * 1.5)} ${f1(base)} H${f1(x - dw * 0.8)} Z" fill="${lt}" stroke="${T.ink}" stroke-width="2.5"/><path d="M${f1(x)} ${f1(base - dh)} L${f1(x + dw * 1.5)} ${f1(base)} H${f1(x + dw * 0.8)} Z" fill="${lt}" stroke="${T.ink}" stroke-width="2.5"/>`;
        s += `<path d="M${f1(x)} ${f1(top)} V${f1(top - 20)}" stroke="${T.ink}" stroke-width="7" stroke-linecap="round"/><path d="M${f1(x)} ${f1(top)} V${f1(top - 20)}" stroke="${o.pole || T.woodL}" stroke-width="3.5" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(top - 22)}" r="6" fill="${o.top || T.glass}" stroke="${T.ink}" stroke-width="2.5"/>`;
        if (o.vane) s += `<path d="M${f1(x)} ${f1(top - 26)} V${f1(top - 60)}" stroke="${T.ink}" stroke-width="4" stroke-linecap="round"/><path d="M${f1(x)} ${f1(top - 60)} l30 7 l-30 9 Z" fill="${o.vane}" stroke="${T.ink}" stroke-width="2.5"/>`;
        return s;
      }
      /* шалаш-«конус» (вигвам из шкур или листьев на жердях): o.c - покрышка, o.s - узор (полосы), o.poles - жерди, o.leaf - листья вместо шкур */
      function tentCone(x, base, w, o = {}) {
        const c = o.c || '#b88a5a', d = o.d || mix(c, T.ink, 0.25), lt = mix(c, '#ffffff', 0.2), rw = w / 2, h = w * (o.hk || 0.95), top = base - h;
        let s = `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="${f1(rw * 1.05)}" ry="${f1(w * 0.08)}" fill="${T.ink}" opacity=".32"/>`;
        const pl = o.poles || T.woodL; let pp = '';
        for (const k of [-0.5, -0.18, 0.2, 0.46]) pp += `M${f1(x + k * 30)} ${f1(top + 20)} L${f1(x - k * 46)} ${f1(top - 34 - Math.abs(k) * 10)} `;
        s += `<path d="${pp}" stroke="${T.ink}" stroke-width="9" stroke-linecap="round"/><path d="${pp}" stroke="${pl}" stroke-width="4.5" stroke-linecap="round"/>`;
        const body = `M${f1(x - 10)} ${f1(top + 6)} Q${f1(x - rw * 0.7)} ${f1(base - h * 0.4)} ${f1(x - rw)} ${f1(base - 2)} Q${f1(x)} ${f1(base + 10)} ${f1(x + rw)} ${f1(base - 2)} Q${f1(x + rw * 0.7)} ${f1(base - h * 0.4)} ${f1(x + 10)} ${f1(top + 6)} Z`;
        s += `<path d="${body}" fill="${c}" ${O(4.5)}/>`;
        s += `<path d="M${f1(x + 6)} ${f1(top + 10)} Q${f1(x + rw * 0.55)} ${f1(base - h * 0.4)} ${f1(x + rw * 0.92)} ${f1(base - 4)} L${f1(x + rw * 0.5)} ${f1(base + 2)} Q${f1(x + rw * 0.3)} ${f1(base - h * 0.4)} ${f1(x + 6)} ${f1(top + 10)} Z" fill="${d}" opacity=".7"/>`;
        if (o.leaf) { let lv = ''; for (let row = 0; row < 5; row++) { const yy = top + 30 + row * (h - 40) / 5, half = 10 + (rw - 10) * ((yy - top) / h); for (let xx = -half; xx < half; xx += 26) lv += `M${f1(x + xx)} ${f1(yy)} q13 16 26 0 `; } s += `<path d="${lv}" stroke="${mix(c, T.ink, 0.3)}" stroke-width="3" fill="none" opacity=".75"/>`; }
        if (o.s) { for (const yy of [base - h * 0.62, base - h * 0.3]) { const half = 10 + (rw - 10) * ((yy - top) / h); s += `<path d="M${f1(x - half)} ${f1(yy)} Q${f1(x)} ${f1(yy + 8)} ${f1(x + half)} ${f1(yy)}" stroke="${o.s}" stroke-width="8" fill="none"/><path d="M${f1(x - half * 0.6)} ${f1(yy + 14)} l8 -10 l8 10 M${f1(x + half * 0.2)} ${f1(yy + 14)} l8 -10 l8 10" stroke="${o.s}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>`; } }
        s += `<path d="M${f1(x - 12)} ${f1(top + 24)} Q${f1(x - rw * 0.55)} ${f1(base - h * 0.45)} ${f1(x - rw * 0.8)} ${f1(base - 10)}" stroke="${lt}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`;
        const dw = w * 0.17, dh = h * 0.42;
        if (o.open !== false) s += `<path d="M${f1(x - dw)} ${f1(base + 1)} Q${f1(x - dw * 0.8)} ${f1(base - dh)} ${f1(x)} ${f1(base - dh)} Q${f1(x + dw * 0.8)} ${f1(base - dh)} ${f1(x + dw)} ${f1(base + 1)} Z" fill="${mix(T.ink, c, 0.15)}" stroke="${T.ink}" stroke-width="3"/>` + (o.in ? o.in(x, base, dw, dh) : '')
          + `<path d="M${f1(x)} ${f1(base - dh)} Q${f1(x + dw * 1.2)} ${f1(base - dh * 0.4)} ${f1(x + dw * 1.5)} ${f1(base)} H${f1(x + dw * 0.9)} Q${f1(x + dw * 0.6)} ${f1(base - dh * 0.5)} ${f1(x)} ${f1(base - dh)} Z" fill="${lt}" stroke="${T.ink}" stroke-width="2.5"/>`;
        return s;
      }
      /* костёр: камни кругом, поленья, языки пламени (неподвижные; мерцание - у страницы), угли. s - масштаб, o.fire - [наружный, средний, середина] */
      def('cstone', () => `<path d="M-15 4 Q-18 -8 -6 -12 Q8 -14 14 -6 Q18 4 6 7 Q-8 9 -15 4 Z" fill="#8f8a9c" ${O(3)}/><path d="M-8 -8 Q0 -11 8 -7" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".35" stroke-linecap="round"/>`);
      function flame(x, base, s = 1, o = {}) {
        const F = o.fire || ['#ff7a2a', '#ffb43a', '#fff0a0'];
        return `<path d="M${f1(x - 44 * s)} ${f1(base)} Q${f1(x - 52 * s)} ${f1(base - 50 * s)} ${f1(x - 24 * s)} ${f1(base - 70 * s)} Q${f1(x - 26 * s)} ${f1(base - 40 * s)} ${f1(x - 8 * s)} ${f1(base - 48 * s)} Q${f1(x - 16 * s)} ${f1(base - 96 * s)} ${f1(x + 12 * s)} ${f1(base - 126 * s)} Q${f1(x + 8 * s)} ${f1(base - 84 * s)} ${f1(x + 28 * s)} ${f1(base - 70 * s)} Q${f1(x + 34 * s)} ${f1(base - 88 * s)} ${f1(x + 30 * s)} ${f1(base - 100 * s)} Q${f1(x + 58 * s)} ${f1(base - 60 * s)} ${f1(x + 44 * s)} ${f1(base)} Z" fill="${F[0]}" stroke="${T.ink}" stroke-width="${f1(4 * Math.min(1.3, s))}" stroke-linejoin="round"/>`
          + `<path d="M${f1(x - 28 * s)} ${f1(base)} Q${f1(x - 32 * s)} ${f1(base - 36 * s)} ${f1(x - 10 * s)} ${f1(base - 46 * s)} Q${f1(x - 10 * s)} ${f1(base - 30 * s)} ${f1(x + 2 * s)} ${f1(base - 34 * s)} Q${f1(x - 2 * s)} ${f1(base - 70 * s)} ${f1(x + 14 * s)} ${f1(base - 86 * s)} Q${f1(x + 14 * s)} ${f1(base - 58 * s)} ${f1(x + 26 * s)} ${f1(base - 46 * s)} Q${f1(x + 38 * s)} ${f1(base - 28 * s)} ${f1(x + 28 * s)} ${f1(base)} Z" fill="${F[1]}"/>`
          + `<path d="M${f1(x - 12 * s)} ${f1(base)} Q${f1(x - 16 * s)} ${f1(base - 22 * s)} ${f1(x)} ${f1(base - 30 * s)} Q${f1(x + 4 * s)} ${f1(base - 48 * s)} ${f1(x + 12 * s)} ${f1(base - 52 * s)} Q${f1(x + 10 * s)} ${f1(base - 30 * s)} ${f1(x + 16 * s)} ${f1(base - 16 * s)} Q${f1(x + 18 * s)} ${f1(base - 4 * s)} ${f1(x + 12 * s)} ${f1(base)} Z" fill="${F[2]}"/>`;
      }
      function campfire(x, base, s = 1, o = {}) {
        let st = '';
        const R = 64 * s;
        for (let i = 0; i < 12; i++) { const a = Math.PI * (i / 12) * 2; if (Math.sin(a) > 0.2) continue; st += put(def('cstone', () => ''), x + Math.cos(a) * R, base + Math.sin(a) * R * 0.34, s * (0.9 + (i % 3) * 0.12)); }
        let fr = '';
        for (let i = 0; i < 12; i++) { const a = Math.PI * (i / 12) * 2; if (Math.sin(a) <= 0.2) continue; fr += put(def('cstone', () => ''), x + Math.cos(a) * R, base + Math.sin(a) * R * 0.34, s * (0.9 + (i % 3) * 0.12)); }
        const ash = `<ellipse cx="${f1(x)}" cy="${f1(base)}" rx="${f1(R * 0.92)}" ry="${f1(R * 0.3)}" fill="#2a2228" ${O(3)}/><ellipse cx="${f1(x)}" cy="${f1(base)}" rx="${f1(R * 0.6)}" ry="${f1(R * 0.18)}" fill="${(o.fire || [])[0] || '#ff7a2a'}" opacity=".7"/>`;
        const logs = `<path d="M${f1(x - 50 * s)} ${f1(base + 6 * s)} L${f1(x + 30 * s)} ${f1(base - 20 * s)} M${f1(x + 48 * s)} ${f1(base + 6 * s)} L${f1(x - 26 * s)} ${f1(base - 22 * s)}" stroke="${T.ink}" stroke-width="${f1(20 * s)}" stroke-linecap="round"/><path d="M${f1(x - 50 * s)} ${f1(base + 6 * s)} L${f1(x + 30 * s)} ${f1(base - 20 * s)} M${f1(x + 48 * s)} ${f1(base + 6 * s)} L${f1(x - 26 * s)} ${f1(base - 22 * s)}" stroke="${T.wood}" stroke-width="${f1(13 * s)}" stroke-linecap="round"/><circle cx="${f1(x - 50 * s)}" cy="${f1(base + 6 * s)}" r="${f1(6 * s)}" fill="${T.woodL}" stroke="${T.ink}" stroke-width="2"/><circle cx="${f1(x + 48 * s)}" cy="${f1(base + 6 * s)}" r="${f1(6 * s)}" fill="${T.woodL}" stroke="${T.ink}" stroke-width="2"/>`;
        // o.over - что между поленьями и пламенем (котёл на треноге: пламя лижет его дно)
        return `<circle cx="${f1(x)}" cy="${f1(base - 40 * s)}" r="${f1(150 * s)}" fill="url(#${glowId(((o.fire || [])[1]) || '#ffb43a', 'cfg')})" opacity=".55"/>` + st + ash + logs + (o.over || '') + (o.noFlame ? '' : flame(x, base - 4 * s, s * 0.9, o)) + fr;
      }
      /* котёл на треноге над огнём; o.c - котёл, o.brew - варево */
      function cauldron(x, base, s = 1, o = {}) {
        const c = o.c || '#3a3644', k = s; base -= (o.lift || 0);
        const pole = `M${f1(x - 70 * k)} ${f1(base + 8 * k + (o.lift || 0))} L${f1(x)} ${f1(base - 150 * k)} L${f1(x + 70 * k)} ${f1(base + 8 * k + (o.lift || 0))} M${f1(x)} ${f1(base - 150 * k)} L${f1(x + 14 * k)} ${f1(base + 14 * k + (o.lift || 0))}`;
        return `<path d="${pole}" stroke="${T.ink}" stroke-width="${f1(10 * k)}" stroke-linecap="round" fill="none"/><path d="${pole}" stroke="${T.woodL}" stroke-width="${f1(5 * k)}" stroke-linecap="round" fill="none"/>`
          + `<path d="M${f1(x)} ${f1(base - 150 * k)} V${f1(base - 96 * k)}" stroke="${T.ink}" stroke-width="3"/><path d="M${f1(x - 30 * k)} ${f1(base - 90 * k)} Q${f1(x)} ${f1(base - 110 * k)} ${f1(x + 30 * k)} ${f1(base - 90 * k)}" stroke="${T.ink}" stroke-width="3" fill="none"/>`
          + `<path d="M${f1(x - 36 * k)} ${f1(base - 88 * k)} Q${f1(x - 40 * k)} ${f1(base - 40 * k)} ${f1(x)} ${f1(base - 36 * k)} Q${f1(x + 40 * k)} ${f1(base - 40 * k)} ${f1(x + 36 * k)} ${f1(base - 88 * k)} Z" fill="${c}" ${O(4)}/><ellipse cx="${f1(x)}" cy="${f1(base - 88 * k)}" rx="${f1(37 * k)}" ry="${f1(9 * k)}" fill="${o.brew || '#8fd06a'}" stroke="${T.ink}" stroke-width="3"/><path d="M${f1(x - 26 * k)} ${f1(base - 76 * k)} Q${f1(x - 26 * k)} ${f1(base - 52 * k)} ${f1(x - 14 * k)} ${f1(base - 46 * k)}" stroke="#ffffff" stroke-width="3" fill="none" opacity=".25" stroke-linecap="round"/>`
          + `<circle cx="${f1(x - 10 * k)}" cy="${f1(base - 98 * k)}" r="${f1(5 * k)}" fill="${o.brew || '#8fd06a'}" stroke="${T.ink}" stroke-width="2"/><circle cx="${f1(x + 12 * k)}" cy="${f1(base - 104 * k)}" r="${f1(3.5 * k)}" fill="${o.brew || '#8fd06a'}" stroke="${T.ink}" stroke-width="2"/>`;
      }
      // бревно-скамья (вид сбоку, чуть наискосок): rot - наклон, градусы
      function logSeat(x, base, len, rot = 0, o = {}) {
        const r = 13, c = o.c || T.wood;
        return `<g transform="rotate(${rot} ${f1(x)} ${f1(base)})"><ellipse cx="${f1(x)}" cy="${f1(base + 3)}" rx="${f1(len / 2 + 6)}" ry="7" fill="${T.ink}" opacity=".3"/><rect x="${f1(x - len / 2)}" y="${f1(base - r * 2)}" width="${f1(len)}" height="${r * 2}" rx="${r}" fill="${c}" ${O(4)}/><path d="M${f1(x - len / 2 + 14)} ${f1(base - r * 1.4)} H${f1(x + len / 2 - 20)} M${f1(x - len / 2 + 24)} ${f1(base - r * 0.7)} H${f1(x + len / 2 - 30)}" stroke="${mix(c, T.ink, 0.35)}" stroke-width="2.2" stroke-linecap="round" opacity=".7"/><ellipse cx="${f1(x + len / 2 - 4)}" cy="${f1(base - r)}" rx="7" ry="${r - 1}" fill="${T.woodL}" stroke="${T.ink}" stroke-width="3"/><path d="M${f1(x + len / 2 - 5)} ${f1(base - r - 5)} a3 4 0 1 0 1 0" stroke="${mix(T.woodL, T.ink, 0.35)}" stroke-width="1.6" fill="none"/></g>`;
      }
      // подстилка (скатка) у палатки
      // подстилка у палатки: коврик в перспективе (полосы по краю), скатанное одеяло, подушка
      const bedroll = (x, base, c = '#7a5a9a', o = {}) => `<ellipse cx="${f1(x)}" cy="${f1(base + 6)}" rx="70" ry="12" fill="${T.ink}" opacity=".25"/><path d="M${f1(x - 64)} ${f1(base + 8)} L${f1(x - 44)} ${f1(base - 18)} H${f1(x + 60)} L${f1(x + 70)} ${f1(base + 8)} Z" fill="${o.mat || mix(c, '#efe4c8', 0.55)}" ${O(3)}/><path d="M${f1(x - 56)} ${f1(base)} L${f1(x - 40)} ${f1(base - 12)} M${f1(x + 54)} ${f1(base - 12)} L${f1(x + 62)} ${f1(base)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`
        + `<path d="M${f1(x + 6)} ${f1(base - 16)} H${f1(x + 54)} Q${f1(x + 70)} ${f1(base - 4)} ${f1(x + 56)} ${f1(base + 8)} H${f1(x + 8)} Q${f1(x - 8)} ${f1(base - 4)} ${f1(x + 6)} ${f1(base - 16)} Z" fill="${c}" stroke="${T.ink}" stroke-width="2.6"/><path d="M${f1(x + 16)} ${f1(base - 12)} q-8 8 0 16 M${f1(x + 30)} ${f1(base - 13)} q-8 8 0 18 M${f1(x + 44)} ${f1(base - 13)} q-8 8 0 18" stroke="${mix(c, T.ink, 0.35)}" stroke-width="2" fill="none"/>`
        + `<path d="M${f1(x - 46)} ${f1(base - 8)} Q${f1(x - 40)} ${f1(base - 22)} ${f1(x - 22)} ${f1(base - 18)} Q${f1(x - 10)} ${f1(base - 8)} ${f1(x - 18)} ${f1(base + 2)} Q${f1(x - 40)} ${f1(base + 6)} ${f1(x - 46)} ${f1(base - 8)} Z" fill="${o.pillow || '#efe4c8'}" stroke="${T.ink}" stroke-width="2.4"/>`;
      /* верёвка с бельём между точками (x0, y0) и (x1, y1): items - массив видов 'shirt' | 'sock' | 'towel' | 'pants' | своё (функция) */
      function laundry(x0, y0, x1, y1, items, cols) {
        const sag = Math.min(46, Math.abs(x1 - x0) * 0.12), mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
        let s = `<path d="M${f1(x0)} ${f1(y0)} Q${f1(mx)} ${f1(my + sag * 0.6)} ${f1(x1)} ${f1(y1)}" stroke="${T.ink}" stroke-width="2.6" fill="none"/>`;
        const at = (t) => { const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; return [a * x0 + b * mx + c * x1, a * y0 + b * (my + sag * 0.6) + c * y1]; };
        items.forEach((k, i) => {
          const t = (i + 1) / (items.length + 1), [x, y] = at(t), c = (cols || ['#e8455c', '#5ab0ff', '#ffd24a', '#8fd06a', '#efe4c8'])[i % 5], rot = (i % 2 ? 4 : -5);
          let g = '';
          if (typeof k === 'function') g = k(x, y, c);
          else if (k === 'shirt') g = `<path d="M${f1(x - 22)} ${f1(y)} L${f1(x - 30)} ${f1(y + 14)} L${f1(x - 20)} ${f1(y + 20)} V${f1(y + 44)} H${f1(x + 20)} V${f1(y + 20)} L${f1(x + 30)} ${f1(y + 14)} L${f1(x + 22)} ${f1(y)} Q${f1(x)} ${f1(y + 8)} ${f1(x - 22)} ${f1(y)} Z" fill="${c}" ${O(2.8)}/><path d="M${f1(x - 14)} ${f1(y + 30)} H${f1(x + 14)}" stroke="${mix(c, T.ink, 0.3)}" stroke-width="2"/>`;
          else if (k === 'sock') g = `<path d="M${f1(x - 6)} ${f1(y)} V${f1(y + 24)} Q${f1(x - 6)} ${f1(y + 32)} ${f1(x + 4)} ${f1(y + 32)} H${f1(x + 12)} Q${f1(x + 16)} ${f1(y + 26)} ${f1(x + 8)} ${f1(y + 22)} V${f1(y)} Z" fill="${c}" ${O(2.5)}/><path d="M${f1(x - 6)} ${f1(y + 6)} H${f1(x + 8)}" stroke="#ffffff" stroke-width="3" opacity=".6"/>`;
          else if (k === 'pants') g = `<path d="M${f1(x - 18)} ${f1(y)} H${f1(x + 18)} L${f1(x + 20)} ${f1(y + 46)} H${f1(x + 4)} L${f1(x)} ${f1(y + 18)} L${f1(x - 4)} ${f1(y + 46)} H${f1(x - 20)} Z" fill="${c}" ${O(2.8)}/>`;
          else g = `<path d="M${f1(x - 20)} ${f1(y)} H${f1(x + 20)} L${f1(x + 18)} ${f1(y + 40)} L${f1(x + 8)} ${f1(y + 34)} L${f1(x)} ${f1(y + 42)} L${f1(x - 8)} ${f1(y + 34)} L${f1(x - 18)} ${f1(y + 40)} Z" fill="${c}" ${O(2.8)}/><path d="M${f1(x - 16)} ${f1(y + 10)} H${f1(x + 16)}" stroke="#ffffff" stroke-width="3" opacity=".5"/>`;
          s += `<g transform="rotate(${rot} ${f1(x)} ${f1(y)})">${g}</g><path d="M${f1(x - 3)} ${f1(y - 6)} v10 M${f1(x + 3)} ${f1(y - 6)} v10" stroke="${T.woodD}" stroke-width="3" stroke-linecap="round"/>`;
        });
        return s;
      }
      // кол частокола (заострённое бревно) 26×120: низ - 0
      def('stake', () => `<path d="M-13 0 V-96 L0 -120 L13 -96 V0 Z" fill="${T.wood}" ${O(4)}/><path d="M-6 -6 V-92 L0 -108" stroke="${T.woodL}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".75"/><path d="M6 -14 V-80" stroke="${T.woodD}" stroke-width="2.5" opacity=".7"/><path d="M-11 -98 L0 -118 L11 -98 Z" fill="${T.woodL}" opacity=".55"/>`);
      def('stakeD', () => `<path d="M-13 0 V-96 L0 -120 L13 -96 V0 Z" fill="${T.woodD}" ${O(4)}/><path d="M-6 -6 V-92 L0 -108" stroke="${T.wood}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`);
      /* частокол от x0 до x1 по низу base (высота кольев h): колья вплотную, поперечина-связка, верёвка */
      function stakes(x0, x1, base, h = 120, o = {}) {
        let s = ''; const k = h / 120; let i = 0;
        for (let x = x0; x <= x1; x += 24 * k, i++) s += put(def(o.dark ? 'stakeD' : 'stake', () => ''), x, base + (i % 3 === 1 ? 4 : i % 3 === 2 ? -2 : 0), k * (0.96 + (i % 4) * 0.02), k * (0.92 + ((i * 7) % 5) * 0.03));
        const by = base - h * 0.36, ty = base - h * 0.7;
        s += `<path d="M${f1(x0 - 10)} ${f1(by)} H${f1(x1 + 10)} M${f1(x0 - 10)} ${f1(ty)} H${f1(x1 + 10)}" stroke="${T.ink}" stroke-width="${f1(10 * k)}" stroke-linecap="round"/><path d="M${f1(x0 - 10)} ${f1(by)} H${f1(x1 + 10)} M${f1(x0 - 10)} ${f1(ty)} H${f1(x1 + 10)}" stroke="${T.woodD}" stroke-width="${f1(5 * k)}" stroke-linecap="round"/>`;
        return s;
      }
      // стойка с оружием: копья, мечи, щит
      function rack(x, base, o = {}) {
        const sh = o.shield || '#a3122a', m = '#c8ccd4';
        let s = `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="84" ry="9" fill="${T.ink}" opacity=".3"/>`;
        const fr = `M${f1(x - 70)} ${f1(base)} V${f1(base - 100)} M${f1(x + 70)} ${f1(base)} V${f1(base - 100)} M${f1(x - 78)} ${f1(base - 96)} H${f1(x + 78)} M${f1(x - 74)} ${f1(base - 30)} H${f1(x + 74)}`;
        // оружие за перекладиной
        for (const [dx, k] of [[-46, 'spear'], [-22, 'sword'], [4, 'spear'], [28, 'sword'], [50, 'axe']]) {
          const xx = x + dx;
          if (k === 'spear') s += `<path d="M${f1(xx)} ${f1(base - 8)} V${f1(base - 150)}" stroke="${T.ink}" stroke-width="8" stroke-linecap="round"/><path d="M${f1(xx)} ${f1(base - 8)} V${f1(base - 150)}" stroke="${T.woodL}" stroke-width="4" stroke-linecap="round"/><path d="M${f1(xx - 7)} ${f1(base - 150)} L${f1(xx)} ${f1(base - 178)} L${f1(xx + 7)} ${f1(base - 150)} Z" fill="${m}" stroke="${T.ink}" stroke-width="2.5"/>`;
          else if (k === 'sword') s += `<path d="M${f1(xx - 5)} ${f1(base - 40)} V${f1(base - 128)} L${f1(xx)} ${f1(base - 138)} L${f1(xx + 5)} ${f1(base - 128)} V${f1(base - 40)} Z" fill="${m}" stroke="${T.ink}" stroke-width="2.5"/><path d="M${f1(xx - 12)} ${f1(base - 40)} H${f1(xx + 12)}" stroke="${T.ink}" stroke-width="6" stroke-linecap="round"/><path d="M${f1(xx)} ${f1(base - 40)} V${f1(base - 18)}" stroke="${T.ink}" stroke-width="6" stroke-linecap="round"/><path d="M${f1(xx)} ${f1(base - 38)} V${f1(base - 20)}" stroke="${T.woodD}" stroke-width="3"/>`;
          else s += `<path d="M${f1(xx)} ${f1(base - 8)} V${f1(base - 130)}" stroke="${T.ink}" stroke-width="8" stroke-linecap="round"/><path d="M${f1(xx)} ${f1(base - 8)} V${f1(base - 130)}" stroke="${T.woodL}" stroke-width="4" stroke-linecap="round"/><path d="M${f1(xx)} ${f1(base - 128)} Q${f1(xx + 26)} ${f1(base - 136)} ${f1(xx + 24)} ${f1(base - 106)} Q${f1(xx + 12)} ${f1(base - 112)} ${f1(xx)} ${f1(base - 108)} Z" fill="${m}" stroke="${T.ink}" stroke-width="2.5"/>`;
        }
        s += `<path d="${fr}" stroke="${T.ink}" stroke-width="12" stroke-linecap="round"/><path d="${fr}" stroke="${T.wood}" stroke-width="6.5" stroke-linecap="round"/>`;
        s += `<circle cx="${f1(x - 92)}" cy="${f1(base - 44)}" r="30" fill="${sh}" ${O(4)}/><circle cx="${f1(x - 92)}" cy="${f1(base - 44)}" r="9" fill="${T.glass}" stroke="${T.ink}" stroke-width="2.5"/><path d="M${f1(x - 112)} ${f1(base - 60)} q10 -8 22 -8" stroke="#ffffff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>`;
        return s;
      }
      // мишень на подставке (соломенный круг с кольцами), в ней стрела
      function target(x, base, o = {}) {
        const c = o.ring || '#e8455c';
        return `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="36" ry="7" fill="${T.ink}" opacity=".3"/><path d="M${f1(x - 26)} ${f1(base)} L${f1(x - 6)} ${f1(base - 70)} M${f1(x + 26)} ${f1(base)} L${f1(x + 6)} ${f1(base - 70)} M${f1(x)} ${f1(base - 40)} L${f1(x + 14)} ${f1(base + 2)}" stroke="${T.ink}" stroke-width="8" stroke-linecap="round"/><path d="M${f1(x - 26)} ${f1(base)} L${f1(x - 6)} ${f1(base - 70)} M${f1(x + 26)} ${f1(base)} L${f1(x + 6)} ${f1(base - 70)} M${f1(x)} ${f1(base - 40)} L${f1(x + 14)} ${f1(base + 2)}" stroke="${T.woodL}" stroke-width="4" stroke-linecap="round"/>`
          + `<circle cx="${f1(x)}" cy="${f1(base - 82)}" r="40" fill="#e8cf8a" ${O(4)}/><circle cx="${f1(x)}" cy="${f1(base - 82)}" r="30" fill="#ffffff" stroke="${c}" stroke-width="7"/><circle cx="${f1(x)}" cy="${f1(base - 82)}" r="14" fill="${c}"/><circle cx="${f1(x)}" cy="${f1(base - 82)}" r="5" fill="${T.glass}"/>`
          + `<path d="M${f1(x + 6)} ${f1(base - 86)} l34 -18" stroke="${T.ink}" stroke-width="5" stroke-linecap="round"/><path d="M${f1(x + 6)} ${f1(base - 86)} l34 -18" stroke="${T.woodL}" stroke-width="2.5"/><path d="M${f1(x + 34)} ${f1(base - 112)} l10 6 l-4 4 M${f1(x + 30)} ${f1(base - 106)} l10 6" stroke="${o.fletch || '#e8455c'}" stroke-width="4" stroke-linecap="round"/>`;
      }
      // коновязь: перекладина на двух столбах, ведро, кольца
      function hitch(x, base, w = 200, o = {}) {
        const fr = `M${f1(x - w / 2)} ${f1(base)} V${f1(base - 64)} M${f1(x + w / 2)} ${f1(base)} V${f1(base - 64)} M${f1(x - w / 2 - 8)} ${f1(base - 60)} H${f1(x + w / 2 + 8)}`;
        return `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="${f1(w / 2 + 10)}" ry="7" fill="${T.ink}" opacity=".3"/><path d="${fr}" stroke="${T.ink}" stroke-width="12" stroke-linecap="round"/><path d="${fr}" stroke="${T.wood}" stroke-width="6.5" stroke-linecap="round"/>`
          + [-0.25, 0.1, 0.35].map((k) => `<circle cx="${f1(x + k * w)}" cy="${f1(base - 50)}" r="6" fill="none" stroke="${T.ink}" stroke-width="4"/><circle cx="${f1(x + k * w)}" cy="${f1(base - 50)}" r="6" fill="none" stroke="#c8ccd4" stroke-width="2"/>`).join('')
          + `<path d="M${f1(x - 24)} ${f1(base - 60)} Q${f1(x - 30)} ${f1(base - 30)} ${f1(x - 4)} ${f1(base - 26)}" stroke="${o.rope || '#c8a060'}" stroke-width="4" fill="none" stroke-linecap="round"/>`
          + `<path d="M${f1(x + w * 0.22 - 18)} ${f1(base - 30)} L${f1(x + w * 0.22 - 14)} ${f1(base)} H${f1(x + w * 0.22 + 14)} L${f1(x + w * 0.22 + 18)} ${f1(base - 30)} Z" fill="${T.wood}" ${O(3)}/><ellipse cx="${f1(x + w * 0.22)}" cy="${f1(base - 30)}" rx="18" ry="5" fill="${o.water || '#5ab0ff'}" stroke="${T.ink}" stroke-width="2.5"/>`;
      }
      // шест с флажком-вымпелом; o.wave - колышется (класс для CSS), здесь - неподвижный
      function flagPole(x, base, h = 150, c = '#e8455c', o = {}) {
        return `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="14" ry="5" fill="${T.ink}" opacity=".3"/><path d="M${f1(x)} ${f1(base)} V${f1(base - h)}" stroke="${T.ink}" stroke-width="8" stroke-linecap="round"/><path d="M${f1(x)} ${f1(base)} V${f1(base - h)}" stroke="${o.pole || T.woodL}" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(base - h - 4)}" r="5" fill="${T.glass}" stroke="${T.ink}" stroke-width="2.5"/>`
          + `<path d="M${f1(x + 2)} ${f1(base - h + 4)} Q${f1(x + 30)} ${f1(base - h - 4)} ${f1(x + 58)} ${f1(base - h + 12)} Q${f1(x + 30)} ${f1(base - h + 18)} ${f1(x + 2)} ${f1(base - h + 34)} Z" fill="${c}" stroke="${T.ink}" stroke-width="3" stroke-linejoin="round"/>` + (o.mark ? `<path d="${o.mark(x + 22, base - h + 15)}" fill="${T.glass}" stroke="${T.ink}" stroke-width="1.5"/>` : '');
      }
      // поленница: поленья торцами, навес-доска
      def('logEnd', () => `<circle r="11" fill="${T.woodL}" stroke="${T.ink}" stroke-width="2.6"/><circle r="5" fill="none" stroke="${mix(T.woodL, T.ink, 0.35)}" stroke-width="1.6"/>`);
      function woodpile(x, base) {
        let s = `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="76" ry="9" fill="${T.ink}" opacity=".3"/><rect x="${f1(x - 70)}" y="${f1(base - 70)}" width="140" height="70" fill="${T.woodD}" ${O(3.5)}/>`;
        for (let r = 0; r < 3; r++) for (let i = 0; i < 6 - (r === 2 ? 1 : 0); i++) s += put(def('logEnd', () => ''), x - 58 + i * 23 + (r % 2) * 11, base - 12 - r * 21);
        return s + `<path d="M${f1(x - 82)} ${f1(base - 70)} H${f1(x + 82)}" stroke="${T.ink}" stroke-width="12" stroke-linecap="round"/><path d="M${f1(x - 82)} ${f1(base - 70)} H${f1(x + 82)}" stroke="${T.wood}" stroke-width="7" stroke-linecap="round"/><path d="M${f1(x + 50)} ${f1(base - 84)} l20 6" stroke="${T.ink}" stroke-width="5" stroke-linecap="round"/><path d="M${f1(x + 44)} ${f1(base - 92)} l16 -8 l8 8 Z" fill="#c8ccd4" stroke="${T.ink}" stroke-width="2.5"/>`;
      }
      // котелок на маленькой треноге (у палатки), под ним - угли
      function potTripod(x, base, o = {}) {
        const pole = `M${f1(x - 30)} ${f1(base + 2)} L${f1(x)} ${f1(base - 66)} L${f1(x + 30)} ${f1(base + 2)}`;
        return `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="30" ry="7" fill="${T.ink}" opacity=".3"/><ellipse cx="${f1(x)}" cy="${f1(base)}" rx="18" ry="5" fill="#ff7a2a" stroke="${T.ink}" stroke-width="2"/><path d="${pole}" stroke="${T.ink}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="${pole}" stroke="${T.woodL}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`
          + `<path d="M${f1(x)} ${f1(base - 66)} V${f1(base - 46)}" stroke="${T.ink}" stroke-width="2.5"/><path d="M${f1(x - 18)} ${f1(base - 44)} Q${f1(x - 18)} ${f1(base - 18)} ${f1(x)} ${f1(base - 16)} Q${f1(x + 18)} ${f1(base - 18)} ${f1(x + 18)} ${f1(base - 44)} Z" fill="${o.c || '#4a4656'}" ${O(3)}/><ellipse cx="${f1(x)}" cy="${f1(base - 44)}" rx="19" ry="5" fill="${o.brew || '#e8b46a'}" stroke="${T.ink}" stroke-width="2.4"/>`;
      }
      // мешки (кучка): o.c - мешковина, o.top - что торчит
      function sacks(x, base, o = {}) {
        const c = o.c || '#c8a46a', d = mix(c, T.ink, 0.25);
        const sk = (cx, by, w, h, cc) => `<path d="M${f1(cx - w / 2)} ${f1(by)} Q${f1(cx - w / 2 - 6)} ${f1(by - h * 0.6)} ${f1(cx - w * 0.28)} ${f1(by - h)} L${f1(cx - 8)} ${f1(by - h - 10)} L${f1(cx + 8)} ${f1(by - h - 10)} L${f1(cx + w * 0.28)} ${f1(by - h)} Q${f1(cx + w / 2 + 6)} ${f1(by - h * 0.6)} ${f1(cx + w / 2)} ${f1(by)} Z" fill="${cc}" ${O(3.5)}/><path d="M${f1(cx - w * 0.3)} ${f1(by - h + 4)} H${f1(cx + w * 0.3)}" stroke="${T.ink}" stroke-width="3"/><path d="M${f1(cx - w * 0.25)} ${f1(by - h * 0.5)} q${f1(w * 0.1)} 6 ${f1(w * 0.2)} 0" stroke="${d}" stroke-width="2" fill="none"/>`;
        return `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="56" ry="8" fill="${T.ink}" opacity=".3"/>` + sk(x + 22, base, 50, 56, d) + sk(x - 18, base + 2, 56, 64, c) + (o.top || '');
      }
      // бочка с водой (крышка-ковш)
      const waterBarrel = (x, base, o = {}) => put(def('barrel', () => ''), x, base, 1) + `<ellipse cx="${f1(x)}" cy="${f1(base - 90)}" rx="24" ry="5" fill="${o.water || '#5ab0ff'}" stroke="${T.ink}" stroke-width="2"/><path d="M${f1(x + 4)} ${f1(base - 92)} l30 -22" stroke="${T.ink}" stroke-width="6" stroke-linecap="round"/><path d="M${f1(x + 4)} ${f1(base - 92)} l30 -22" stroke="${T.woodL}" stroke-width="3" stroke-linecap="round"/>`;
      // указатель: столб и стрелки-доски [{ t: текст, dir: -1|1, c }] сверху вниз
      function signpost(x, base, arrows, o = {}) {
        let s = `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="16" ry="5" fill="${T.ink}" opacity=".3"/><path d="M${f1(x)} ${f1(base)} V${f1(base - 40 - arrows.length * 40)}" stroke="${T.ink}" stroke-width="13" stroke-linecap="round"/><path d="M${f1(x)} ${f1(base)} V${f1(base - 40 - arrows.length * 40)}" stroke="${T.wood}" stroke-width="7" stroke-linecap="round"/>`;
        arrows.forEach((a, i) => { const y = base - 50 - (arrows.length - 1 - i) * 40 - 30, w = Math.max(110, a.t.length * 15 + 40), d = a.dir || 1, x0 = d > 0 ? x - 10 : x + 10, x1 = x0 + d * w, c = a.c || T.wood;
          s += `<path d="M${f1(x0)} ${f1(y - 15)} H${f1(x1 - d * 18)} L${f1(x1)} ${f1(y)} L${f1(x1 - d * 18)} ${f1(y + 15)} H${f1(x0)} Z" fill="${c}" ${O(3.5)}/><text x="${f1((x0 + x1 - d * 12) / 2)}" y="${f1(y + 6)}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="16" fill="${o.tx || '#ffe8b0'}" stroke="${T.ink}" stroke-width="3" paint-order="stroke">${a.t}</text>`; });
        return s;
      }
      // факел на шесте (свет - пятно на земле и ореол)
      function torch(x, base, h = 130, o = {}) {
        return `<ellipse cx="${f1(x)}" cy="${f1(base + 2)}" rx="60" ry="16" fill="url(#${glowId(((o.fire || [])[1]) || '#ffb43a', 'cfg')})" opacity=".55"/><circle cx="${f1(x)}" cy="${f1(base - h - 20)}" r="70" fill="url(#${glowId(((o.fire || [])[1]) || '#ffb43a', 'cfg')})" opacity=".6"/>`
          + `<path d="M${f1(x)} ${f1(base)} V${f1(base - h)}" stroke="${T.ink}" stroke-width="9" stroke-linecap="round"/><path d="M${f1(x)} ${f1(base)} V${f1(base - h)}" stroke="${o.pole || T.woodL}" stroke-width="4.5" stroke-linecap="round"/><path d="M${f1(x - 9)} ${f1(base - h + 6)} L${f1(x - 7)} ${f1(base - h - 10)} H${f1(x + 7)} L${f1(x + 9)} ${f1(base - h + 6)} Z" fill="${T.metal}" stroke="${T.ink}" stroke-width="2.5"/>` + flame(x, base - h - 8, 0.3, o);
      }
      // ящики стопкой
      const crates = (x, base) => put(def('crate', () => ''), x - 26, base, 0.9) + put(def('crate', () => ''), x + 34, base + 4, 0.8) + put(def('crate', () => ''), x + 2, base - 56, 0.72);
      const camp = { tentRidge, tentBell, tentCone, campfire, flame, cauldron, logSeat, bedroll, laundry, stakes, rack, target, hitch, flagPole, woodpile, potTripod, sacks, waterBarrel, signpost, crates, peg, torch };

      return { T, def, put, doc, wrap, glowId, pave, piece, wall, roof, lamp, postLamp, wallLamp, tree, thing, board, chains, mix, rng, blob, smooth, f1, planks, plaster, win, door, gutter, chimney, camp };
    }
    if (DD && !DD.fairKit) DD.fairKit = fairKit;
  })();
  // env.esc — экранирование текста для SVG/HTML
  window.MDDoodle.addLocation('legion', 'fair', function (env) {
    const esc = env.esc || ((t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
    /* ===== кирпичики рисунка ===== */
    // Набор «кирпичиков» для локаций Ярмарки: всё — SVG-строки в стиле человечков (белый контур, плоские заливки)
    const W = '#f5f2ff', INK = '#15122e';
    const O = (w = 5) => `stroke="${W}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const D = window.MDDoodle;
    // 25.10 (art/fair-city): общий набор деталей (мостовая, кладка, черепица, фонари, деревья) — в тонах ночной площади Легиона
    const K = D.fairKit({ id: 'lg', line: W, ink: INK, metal: '#2a2440', glass: '#ffd76a', bark: '#5a3a22', leaf: '#2f5a46', leafD: '#1f4032', leafL: '#4a7e5e',
      pave: { mortar: '#33303f', stone: '#46435a', alt: '#4e4b62', light: '#625e78', dark: '#3a374b' }, wallC: { base: '#4d4a5c', light: '#57536a', dark: '#423f52', joint: '#36334a', moss: '#3a5e4a' },
      walls: { light: { base: '#7d7990', light: '#8a86a0', dark: '#6e6a82', joint: '#4e4a60' }, tower: { base: '#5a5768', light: '#65627a', dark: '#4e4b60', joint: '#3e3b50' } } });
    // человечек внутри сцены: cx — центр, base — где стоят ноги, s — масштаб
    // человечек-продавец: живой — дышит (чуть сжимается у ног) и покачивается; кузнец бьёт молотом
    function guy(seed, base, cx, s, mood = 'happy', extra = {}, look, anim = 'idle') {
      const svg = D.jDoodle(D.jhash(seed), mood, false, extra, look);
      const w = 120 * s, h = 170 * s;
      const body = svg.replace('<svg class="jl-doodle" viewBox="0 0 120 170"', `<svg class="jl-doodle" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" viewBox="0 0 120 170" overflow="visible"`);
      const k = D.jhash(seed + '#anim') % 1000 / 1000, dl = (-k * 4).toFixed(2);
      const sway = anim === 'smith'
        ? `<animateTransform attributeName="transform" type="rotate" values="0;-7;-7;4;0;0" keyTimes="0;.3;.45;.55;.7;1" dur=".9s" repeatCount="indefinite"/>`
        : `<animateTransform attributeName="transform" type="rotate" values="0;${(2 + k * 1.5).toFixed(1)};0;${(-2 - k * 1.5).toFixed(1)};0" dur="${(3.2 + k * 1.6).toFixed(2)}s" begin="${dl}s" repeatCount="indefinite"/>`;
      const breathe = `<animateTransform attributeName="transform" type="scale" values="1 1;1.02 .97;1 1;.99 1.025;1 1" dur="${(1.8 + k).toFixed(2)}s" begin="${dl}s" repeatCount="indefinite"/>`;
      return `<g transform="translate(${cx} ${base})"><g>${sway}<g>${breathe}${body}</g></g></g>`;
    }
    function windowLit(x, y, w, h, lit = true, round = false) {
      const glass = lit ? '#ffd76a' : '#3a3a55';
      const top = round ? `M${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} H${x} Z` : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
      return `${lit ? `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w}" ry="${h * 0.8}" fill="url(#glow)" opacity=".55"/>` : ''}<path d="${top}" fill="${glass}" ${O(4)}/><path d="M${x + w / 2} ${y + (round ? w * 0.15 : 0)} V${y + h} M${x} ${y + h * 0.55} H${x + w}" stroke="${INK}" stroke-width="3" opacity=".55"/>`;
    }
    // дом: фахверк сверху, камень снизу, крыша
    function house({ x, base, w, h, wall = '#ead9b8', stone = '#8b8796', roof = '#b5533c', roofH = 120, floors = 2, lit = 0.7, chimney = true, door = true, shop = null }) {
      const top = base - h, fl = h / floors;
      let s = '';
      if (chimney) s += `<rect x="${x + w * 0.7}" y="${top - roofH * 0.75}" width="${w * 0.1}" height="${roofH * 0.6}" fill="#6d5a5a" ${O(4)}/>`;
      s += `<path d="M${x - 22} ${top + 4} L${x + w / 2} ${top - roofH} L${x + w + 22} ${top + 4} Z" fill="${roof}" ${O()}/>`;
      for (let i = 1; i < 5; i++) { const yy = top - roofH + roofH * i / 5, dx = (w / 2 + 22) * i / 5; s += `<path d="M${x + w / 2 - dx} ${yy} H${x + w / 2 + dx}" stroke="${INK}" stroke-width="2.5" opacity=".35"/>`; }
      s += `<rect x="${x}" y="${top}" width="${w}" height="${h - fl}" fill="${wall}" ${O()}/>`;
      // фахверк
      for (let i = 0; i <= 4; i++) s += `<path d="M${x + w * i / 4} ${top} V${base - fl}" stroke="#6b4423" stroke-width="7"/>`;
      s += `<path d="M${x} ${top + (h - fl) / 2} H${x + w}" stroke="#6b4423" stroke-width="6"/><path d="M${x} ${top} L${x + w / 4} ${base - fl} M${x + w} ${top} L${x + w * 3 / 4} ${base - fl}" stroke="#6b4423" stroke-width="5"/>`;
      // каменный низ
      s += `<rect x="${x}" y="${base - fl}" width="${w}" height="${fl}" fill="${stone}" ${O()}/>`;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) s += `<rect x="${x + 6 + c * (w - 12) / 6 + (r % 2) * 12}" y="${base - fl + 8 + r * fl / 4.2}" width="${(w - 12) / 6 - 14}" height="${fl / 4.2 - 8}" rx="4" fill="none" stroke="${INK}" stroke-width="2" opacity=".25"/>`;
      // окна верхнего этажа
      const n = Math.max(2, Math.round(w / 110));
      for (let i = 0; i < n; i++) s += windowLit(x + w * (i + 0.5) / n - 18, top + (h - fl) * 0.22, 36, 46, rnd() < lit);
      if (door) s += `<path d="M${x + w * 0.5 - 30} ${base} V${base - fl * 0.72} A30 30 0 0 1 ${x + w * 0.5 + 30} ${base - fl * 0.72} V${base} Z" fill="#6b4423" ${O(4)}/><circle cx="${x + w * 0.5 + 16}" cy="${base - fl * 0.38}" r="4" fill="#ffc94d"/>`;
      return s;
    }
    // вывеска на кронштейне
    function hangSign(x, y, text, icon, color = '#8a5a2b', dir = 1, w = 190) {
      return `<path d="M${x} ${y} h${dir * (w * 0.6 + 26)}" stroke="#2a2440" stroke-width="7" stroke-linecap="round"/><path d="M${x + dir * 20} ${y} v18 M${x + dir * (w * 0.6 + 6)} ${y} v18" stroke="#2a2440" stroke-width="3"/>
        <g transform="translate(${x + dir * (w * 0.3 + 14)} ${y + 18})"><rect x="${-w / 2 + (dir > 0 ? w * 0.18 : -w * 0.18)}" y="0" width="${w}" height="74" rx="10" fill="${color}" ${O()}/>
        <text x="${dir > 0 ? w * 0.18 : -w * 0.18}" y="49" text-anchor="middle" font-family="Russo One" font-size="22" fill="${W}" stroke="${INK}" stroke-width="5" paint-order="stroke">${icon} ${text}</text></g>`;
    }
    function banner(x, y, w, text, color = '#a3122a') {
      return `<g><path d="M${x - 40} ${y + 8} l40 -8 v64 l-40 -8 l18 -24 z" fill="#7a0f1d" ${O(4)}/><path d="M${x + w + 40} ${y + 8} l-40 -8 v64 l40 -8 l-18 -24 z" fill="#7a0f1d" ${O(4)}/>
        <rect x="${x}" y="${y}" width="${w}" height="64" rx="6" fill="${color}" ${O()}/><text x="${x + w / 2}" y="${y + 45}" text-anchor="middle" font-family="Russo One" font-size="36" fill="#ffc94d" stroke="${INK}" stroke-width="6" paint-order="stroke" letter-spacing="3">${text}</text></g>`;
    }
    function bunting(x1, y1, x2, y2, sag = 60, cols = ['#e8455c', '#ffc94d', '#4ab0ff', '#6fdc6f', '#b06bff']) {
      const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + sag;
      let s = `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="#2a2440" stroke-width="3"/>`;
      const n = Math.round(Math.hypot(x2 - x1, y2 - y1) / 46);
      for (let i = 1; i < n; i++) { const t = i / n, x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2, y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2; s += `<path d="M${x - 13} ${y} L${x + 13} ${y} L${x} ${y + 30} Z" fill="${cols[i % cols.length]}" stroke="${W}" stroke-width="3" stroke-linejoin="round"><animateTransform attributeName="transform" type="rotate" values="-5 ${x} ${y};5 ${x} ${y};-5 ${x} ${y}" dur="${2 + (i % 3) * 0.4}s" repeatCount="indefinite"/></path>`; }
      return s;
    }
    function lantern(x, base, h = 260, kind = 'lamp') {
      const top = base - h;
      let s = `<rect x="${x - 6}" y="${top}" width="12" height="${h}" fill="#2a2440" ${O(3)}/><path d="M${x} ${top + 10} h44" stroke="#2a2440" stroke-width="6" stroke-linecap="round"/>`;
      s += `<circle cx="${x + 44}" cy="${top + 48}" r="70" fill="url(#glow)" opacity=".75"><animate attributeName="opacity" values=".65;.85;.7;.8;.65" dur="2.8s" repeatCount="indefinite"/></circle>`;
      s += `<path d="M${x + 30} ${top + 24} h28 l-4 40 h-20 z" fill="#ffd76a" ${O(4)}/><path d="M${x + 26} ${top + 24} h36 l-6 -10 h-24 z" fill="#2a2440" ${O(3)}/>`;
      return s;
    }
    function torch(x, y) {
      return `<circle cx="${x}" cy="${y - 30}" r="80" fill="url(#glowFire)" opacity=".8"><animate attributeName="opacity" values=".7;.95;.75;.9;.7" dur="1.3s" repeatCount="indefinite"/></circle><path d="M${x - 6} ${y} l4 -26 h4 l4 26 z" fill="#6b4423" ${O(3)}/>
        <g transform="translate(${x} ${y - 24})"><g><animateTransform attributeName="transform" type="scale" values="1 1;1.06 .92;.95 1.07;1 1" dur=".7s" repeatCount="indefinite"/><path d="M0 2 C-13 -2 -15 -22 0 -44 C15 -22 13 -2 0 2 Z" fill="#ff8a2a" stroke="#ffd76a" stroke-width="3" stroke-linejoin="round"/><path d="M0 -2 C-6 -4 -7 -15 0 -26 C7 -15 6 -4 0 -2 Z" fill="#ffe27a"/></g><path d="M-10 -2 h20 l-4 8 h-12 Z" fill="#4a4a55" stroke="#f5f2ff" stroke-width="3" stroke-linejoin="round"/></g>`;
    }
    // товары
    const goods = {
      potion: (x, y, c) => `<g transform="translate(${x} ${y})"><rect x="-5" y="-44" width="10" height="10" fill="#c58a45" ${O(2.5)}/><path d="M-6 -34 V-26 C-18 -20 -18 0 0 0 C18 0 18 -20 6 -26 V-34 Z" fill="${c}" ${O(3.5)}/><path d="M-9 -16 q4 -6 8 -3" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/></g>`,
      tallPotion: (x, y, c) => `<g transform="translate(${x} ${y})"><rect x="-4" y="-52" width="8" height="9" fill="#c58a45" ${O(2.5)}/><path d="M-5 -43 V-34 L-12 -26 V0 H12 V-26 L5 -34 V-43 Z" fill="${c}" ${O(3.5)}/></g>`,
      bread: (x, y) => `<g transform="translate(${x} ${y})"><path d="M-26 0 C-28 -22 28 -22 26 0 Z" fill="#d9993f" ${O(3.5)}/><path d="M-12 -14 l6 8 M0 -16 l6 8 M12 -14 l5 7" stroke="#8a5a2b" stroke-width="3"/></g>`,
      cheese: (x, y) => `<g transform="translate(${x} ${y})"><path d="M-22 0 L22 0 L22 -20 L-22 -8 Z" fill="#ffd34d" ${O(3.5)}/><circle cx="-4" cy="-6" r="3" fill="#e8b923"/><circle cx="10" cy="-10" r="2.5" fill="#e8b923"/></g>`,
      apple: (x, y, c = '#e8455c') => `<g transform="translate(${x} ${y})"><circle cy="-12" r="12" fill="${c}" ${O(3)}/><path d="M0 -24 q2 -6 6 -8" stroke="#6b4423" stroke-width="3" fill="none"/></g>`,
      ham: (x, y) => `<g transform="translate(${x} ${y})"><path d="M-24 0 C-30 -26 10 -34 22 -12 C26 -4 18 4 -24 0 Z" fill="#e88a7a" ${O(3.5)}/><path d="M18 -10 l14 -10" stroke="${W}" stroke-width="8" stroke-linecap="round"/><path d="M18 -10 l14 -10" stroke="#f1d9b5" stroke-width="4" stroke-linecap="round"/></g>`,
      pie: (x, y) => `<g transform="translate(${x} ${y})"><path d="M-26 0 L-22 -14 H22 L26 0 Z" fill="#d9993f" ${O(3.5)}/><path d="M-20 -14 q20 -14 40 0" fill="#e8455c" ${O(3)}/></g>`,
      hat: (x, y, kind) => { const b = { top: 0, hw: 22, square: false, eyeY: 30 }; const H = D.jHats(b, '#ff9fb2', '#4ab0ff'); return `<g transform="translate(${x - 60} ${y - 6})">${H[kind] || ''}</g>`; },
      weapon: (x, y, kind, rar = 'common', rot = 0, sc = 1.2) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})">${D.weaponArt(kind, rar)}</g>`,
      shield: (x, y, kind, rar = 'common', sc = 1.3) => `<g transform="translate(${x} ${y}) scale(${sc})">${D.shieldArt(kind, rar)}</g>`,
    };
    // ларёк: стойка, навес-маркиза зубчиками, вывеска, товары на прилавке, продавец за прилавком
    function stall({ x, base, w = 320, c1 = '#e8455c', c2 = W, label = '', items = '', merchant = '' }) {
      const top = base - 320, ch = 92;
      let s = `<rect x="${x + 6}" y="${top + 40}" width="12" height="${base - top - 40}" fill="#8a5a2b" ${O(3)}/><rect x="${x + w - 18}" y="${top + 40}" width="12" height="${base - top - 40}" fill="#8a5a2b" ${O(3)}/>`;
      s += `<rect x="${x + 10}" y="${top + 60}" width="${w - 20}" height="${base - ch - top - 60}" fill="#2a2036" opacity=".55"/>`;
      s += merchant;
      // прилавок
      s += `<rect x="${x}" y="${base - ch}" width="${w}" height="${ch}" fill="#a0703a" ${O()}/>`;
      for (let i = 1; i < 4; i++) s += `<path d="M${x + 4} ${base - ch + i * ch / 4} H${x + w - 4}" stroke="#6b4423" stroke-width="3"/>`;
      s += `<rect x="${x - 10}" y="${base - ch - 12}" width="${w + 20}" height="16" rx="5" fill="#8a5a2b" ${O(4)}/>`;
      s += items;
      // навес
      const n = Math.round(w / 40), sw = (w + 40) / n;
      let aw = '';
      for (let i = 0; i < n; i++) aw += `<path d="M${x - 20 + i * sw} ${top + 18} h${sw} v40 q${-sw / 2} 22 ${-sw} 0 z" fill="${i % 2 ? c2 : c1}"/>`;
      s += `<g>${aw}<path d="M${x - 20} ${top + 18} h${w + 40} v40 ${Array.from({ length: n }, () => `q${-sw / 2} 22 ${-sw} 0`).join(' ')} z" fill="none" ${O()}/></g>`;
      s += `<path d="M${x - 10} ${top + 18} L${x + w / 2} ${top - 26} L${x + w + 10} ${top + 18} Z" fill="${c1}" ${O()}/>`;
      if (label) s += `<g transform="translate(${x + w / 2} ${top - 46})"><rect x="-90" y="-26" width="180" height="44" rx="8" fill="#2a2440" ${O(4)}/><text y="6" text-anchor="middle" font-family="Russo One" font-size="22" fill="#ffc94d">${label}</text></g>`;
      return s;
    }
    function cobbles(path, base = '#5d596b', stone = '#6e6a7c', density = 160, box = [0, 600, 1920, 1080]) {
      let s = `<path d="${path}" fill="${base}"/>`;
      s += `<clipPath id="cb${box.join('')}"><path d="${path}"/></clipPath><g clip-path="url(#cb${box.join('')})">`;
      for (let i = 0; i < density; i++) { const x = box[0] + rnd() * (box[2] - box[0]), y = box[1] + rnd() * (box[3] - box[1]), r = 14 + rnd() * 16 * (0.6 + (y - box[1]) / (box[3] - box[1])); s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.55}" fill="${stone}" stroke="#4a4757" stroke-width="2.5"/>`; }
      return s + '</g>' + `<path d="${path}" fill="none" ${O()}/>`;
    }
    // 25.10: бочка и ящик — общие символы набора (клёпки, обручи, доски)
    const barrel = (x, base, s = 1) => K.thing('barrel', x, base, s);
    const crate = (x, base, s = 1) => K.thing('crate', x, base, s);
    const DEFS = `<defs><radialGradient id="glow"><stop offset="0" stop-color="#ffd76a" stop-opacity=".9"/><stop offset="1" stop-color="#ffb83d" stop-opacity="0"/></radialGradient>
      <radialGradient id="glowFire"><stop offset="0" stop-color="#ffb24a" stop-opacity=".9"/><stop offset=".5" stop-color="#ff7a2a" stop-opacity=".35"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient></defs>`;
    const CSS = `<style>.jl-doodle .ln{fill:none;stroke:#f5f2ff;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round}.jl-doodle .body{stroke:#f5f2ff;stroke-width:4.5;stroke-linejoin:round}.jl-doodle .face:not([fill]){fill:none}.jl-doodle .face{stroke:#15122e;stroke-width:3.5;stroke-linecap:round}.jl-doodle .eye{fill:#15122e}</style>`;
    /* ===== товары, кузнец, толпа ===== */
    const potionsRow = (x0, y, n = 6) => Array.from({ length: n }, (_, i) => (i % 2 ? goods.tallPotion : goods.potion)(x0 + i * 44, y, ['#e8455c', '#4ab0ff', '#6fdc6f', '#b06bff', '#ffc94d', '#ff8a5c'][i % 6])).join('');
    const foodRow = (x0, y) => goods.bread(x0, y) + goods.cheese(x0 + 64, y) + goods.ham(x0 + 130, y) + goods.pie(x0 + 200, y) + goods.apple(x0 + 252, y) + goods.apple(x0 + 276, y, '#6fdc6f');
    const fruitRow = (x0, y) => [0, 1, 2, 3, 4, 5, 6].map((i) => goods.apple(x0 + i * 30, y, ['#e8455c', '#ffc94d', '#6fdc6f', '#ff8a5c'][i % 4])).join('') + goods.cheese(x0 + 240, y);
    const merchant = (seed, cx, base, look, mood = 'happy', extra = {}) => guy(seed, base, cx, 0.95, mood, extra, look);
    const weaponRack = (x, base) => `<rect x="${x}" y="${base - 150}" width="190" height="14" rx="5" fill="#8a5a2b" ${O(4)}/><rect x="${x}" y="${base - 30}" width="190" height="14" rx="5" fill="#8a5a2b" ${O(4)}/><rect x="${x + 4}" y="${base - 160}" width="12" height="160" fill="#6b4423" ${O(3)}/><rect x="${x + 174}" y="${base - 160}" width="12" height="160" fill="#6b4423" ${O(3)}/>`
      + goods.weapon(x + 40, base - 40, 'sword', 'common', 0, 1.6) + goods.weapon(x + 80, base - 40, 'axe', 'common', 0, 1.5) + goods.weapon(x + 120, base - 40, 'spear', 'rare', 0, 1.25) + goods.weapon(x + 155, base - 40, 'mace', 'common', 0, 1.4);
    const anvil = (x, base) => `<g transform="translate(${x} ${base})"><path d="M-40 0 L-30 -22 H30 L40 0 Z" fill="#4a4a55" ${O(4)}/><path d="M-50 -22 H44 L58 -42 H-64 Q-80 -42 -76 -34 Z" fill="#5d5d6b" ${O(4)}/></g>`;
    const hatWindow = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#ffe9b0" ${O()}/><ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w * 0.7}" ry="${h * 0.7}" fill="url(#glow)" opacity=".4"/>`
      + ['tophat', 'wizard', 'cowboy', 'party', 'beret', 'laurel'].map((k, i) => `<rect x="${x + 22 + (i % 3) * (w - 44) / 3 + 18}" y="${y + 70 + Math.floor(i / 3) * 95}" width="8" height="${i < 3 ? 26 : 20}" fill="#8a5a2b"/>` + goods.hat(x + 22 + (i % 3) * (w - 44) / 3 + 22 + 60 - 60, y + 72 + Math.floor(i / 3) * 95, k)).join('')
      + `<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" stroke="#6b4423" stroke-width="6"/>`;
    const crowd = (list) => list.map(([seed, cx, base, s, mood]) => guy(seed, base, cx, s, mood || 'happy')).join('');
    /* ===== Кузня и Шатёр франта ===== */
    // Вариант C, доработка: «Ночной рынок у ворот» — три места для голосования чата: Кузня, Торговые ряды, Шатёр франта
    const pathOf = (pts) => 'M' + pts.map((p) => p.map((n) => +n.toFixed(1)).join(' ')).join(' L') + ' Z';
    
    /* ---------- фон: небо, луна, стена с воротами, площадь ---------- */
    function nightBg() {
      let s = DEFS + `<defs><linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b22"/><stop offset="1" stop-color="#2b2150"/></linearGradient>
        <radialGradient id="warm" cx=".5" cy=".7" r=".8"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".6" stop-color="#f0a85a"/><stop offset="1" stop-color="#8a4a2a"/></radialGradient>
        <radialGradient id="forgeIn" cx=".5" cy=".8" r=".9"><stop offset="0" stop-color="#ffd27a"/><stop offset=".45" stop-color="#ff7a2a"/><stop offset="1" stop-color="#5a1e10"/></radialGradient>
        <linearGradient id="slate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4266"/><stop offset="1" stop-color="#2f2a45"/></linearGradient></defs>`;
      s += `<rect width="1920" height="1080" fill="url(#skyC)"/>`;
      for (let i = 0; i < 120; i++) s += `<circle cx="${rnd() * 1920}" cy="${rnd() * 380}" r="${0.8 + rnd() * 2}" fill="#fff" opacity="${0.3 + rnd() * 0.7}"><animate attributeName="opacity" values="1;.3;1" dur="${2 + rnd() * 3}s" repeatCount="indefinite"/></circle>`;
      s += `<circle cx="1620" cy="140" r="62" fill="#f3efd8" ${O(4)}/><circle cx="1600" cy="128" r="10" fill="#d9d3b8"/><circle cx="1640" cy="160" r="7" fill="#d9d3b8"/>`;
      s += `<rect x="0" y="330" width="1920" height="380" fill="#4d4a5c" ${O()}/>`;
      for (let i = 0; i < 24; i++) s += `<rect x="${i * 82}" y="300" width="52" height="40" fill="#4d4a5c" ${O(4)}/>`;
      for (let r = 0; r < 6; r++) for (let c = 0; c < 18; c++) s += `<rect x="${c * 110 + (r % 2) * 55 - 20}" y="${350 + r * 58}" width="96" height="46" rx="6" fill="none" stroke="#15122e" stroke-width="2" opacity=".3"/>`;
      s += `<path d="M820 710 V520 A140 140 0 0 1 1100 520 V710 Z" fill="#1a1630" ${O(6)}/>`;
      for (let i = 0; i < 7; i++) s += `<path d="M${840 + i * 38} 470 V650" stroke="#6d6a78" stroke-width="7"/>`;
      s += `<path d="M830 520 H1090 M830 590 H1090" stroke="#6d6a78" stroke-width="6"/>`;
      s += `<rect x="760" y="230" width="90" height="480" fill="#5a5768" ${O()}/><rect x="1070" y="230" width="90" height="480" fill="#5a5768" ${O()}/><path d="M745 235 L805 150 L865 235 Z M1055 235 L1115 150 L1175 235 Z" fill="#a3122a" ${O()}/>`;
      s += `<path d="M805 150 V100 l40 12 l-40 12" fill="#ffc94d" ${O(3)}/><path d="M1115 150 V100 l40 12 l-40 12" fill="#ffc94d" ${O(3)}/>`;
      for (const bx of [805, 1115]) s += `<path d="M${bx - 22} 486 H${bx + 22} V600 l-22 -16 l-22 16 Z" fill="#7a0f1d" ${O(4)}/><path d="M${bx - 26} 486 H${bx + 26}" stroke="#ffc94d" stroke-width="6" stroke-linecap="round"/><circle cx="${bx}" cy="526" r="12" fill="#ffc94d" stroke="${INK}" stroke-width="2"/>`;   // 26.10: знамёна на башнях ворот
      s += torch(740, 470) + torch(1180, 470);
      s += cobbles('M0 700 H1920 V1080 H0 Z', '#3a3748', '#4a4759', 260, [0, 690, 1920, 1080]);
      return s;
    }
    
    /* ---------- значок «молот и меч» ---------- */
    const smithIcon = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
      <g transform="rotate(-40)"><rect x="-4" y="-30" width="8" height="58" rx="3" fill="#c58a45" ${O(3)}/><rect x="-16" y="-42" width="32" height="16" rx="3" fill="#9aa0b4" ${O(3)}/></g>
      <g transform="rotate(40)"><path d="M-4 -40 L0 -48 L4 -40 V14 H-4 Z" fill="#dfe3f0" ${O(3)}/><rect x="-13" y="12" width="26" height="6" rx="2" fill="#ffc94d" ${O(2.5)}/><rect x="-3" y="18" width="6" height="12" fill="#6b4423" ${O(2.5)}/></g></g>`;
    
    /* ---------- КУЗНЯ: красивое здание + пристройка с наковальней слева ---------- */
    function forge() {
      const X0 = 240, X1 = 690, B = 770, mid = 610, top = 450, peak = 285, cx = (X0 + X1) / 2;
      let s = '<g data-ol="anvil">';   // 20.10: data-ol — что обводить при наведении в «Городе» на сайте (citygl.js outliner); на стриме ни на что не влияет
      // ---- пристройка (навес) ----
      s += `<path d="M20 560 L${X0} 500 V${B + 10} H20 Z" fill="#231c33"/>`;
      // 26.10 (art/buildings): задняя стена навеса — доски в тени, подковы на стене
      s += `<clipPath id="lgShedW"><path d="M20 560 L${X0} 500 V${B + 10} H20 Z"/></clipPath><g clip-path="url(#lgShedW)" opacity=".42">${K.planks([20, 500, X0, B + 10], '#6b4423', 22)}</g>`
        + [[186, 654], [206, 658], [226, 654]].map(([hx, hy]) => `<path d="M${hx - 7} ${hy} V${hy - 6} A7 7 0 0 1 ${hx + 7} ${hy - 6} V${hy}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${hx - 7} ${hy} V${hy - 6} A7 7 0 0 1 ${hx + 7} ${hy - 6} V${hy}" fill="none" stroke="#9aa0b4" stroke-width="3" stroke-linecap="round"/>`).join('');
      // горн в пристройке
      s += `<rect x="50" y="660" width="120" height="${B + 10 - 660}" fill="#7a4a3a" ${O(4)}/>`;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s += `<rect x="${54 + c * 38 + (r % 2) * 10}" y="${666 + r * 28}" width="30" height="20" rx="3" fill="none" stroke="#15122e" stroke-width="2" opacity=".35"/>`;
      s += `<path d="M70 ${B + 10} V720 A40 30 0 0 1 150 720 V${B + 10} Z" fill="url(#forgeIn)" ${O(3)}/>`;
      s += `<ellipse cx="110" cy="735" rx="90" ry="70" fill="url(#glowFire)"><animate attributeName="opacity" values=".6;1;.75;.95;.6" dur="1.2s" repeatCount="indefinite"/></ellipse>`;
      s += `<path d="M60 660 L80 600 H140 L160 660 Z" fill="#5a4a4a" ${O(4)}/><rect x="95" y="548" width="30" height="54" fill="#5a4a4a" ${O(3)}/>`;
      // инструмент на стене
      s += `<path d="M190 600 h40" stroke="#8a5a2b" stroke-width="6"/>` + [0, 1, 2].map((i) => `<path d="M${196 + i * 14} 600 v${30 + i * 6}" stroke="#9aa0b4" stroke-width="4"/>`).join('');
      // крыша навеса и столбы
      s += `<path d="M14 564 L${X0 + 8} 492 L${X0 + 8} 512 L18 586 Z" fill="#6b4423" ${O(4)}/>`;   // 23.10: левый край — правее стыка с кварталом «Города» (x 8)
      for (let i = 0; i < 6; i++) s += `<path d="M${12 + i * 40} ${582 - i * 13} l8 -18" stroke="#3a2614" stroke-width="3"/>`;
      s += `<rect x="16" y="580" width="14" height="${B + 30 - 580}" fill="#6b4423" ${O(3)}/>`;
      // бочка для закалки, наковальня, искры, кузнец
      s += barrel(40, B + 40, 0.75) + `<ellipse cx="40" cy="${B - 28}" rx="20" ry="6" fill="#4ab0ff" opacity=".7"/>`;
      s += '<g data-ol="anv">' + anvil(150, B + 40) + '</g>';
      for (let i = 0; i < 7; i++) { const a = -150 + i * 20, dx = Math.cos(a * Math.PI / 180) * 60, dy = Math.sin(a * Math.PI / 180) * 60; s += `<circle cx="150" cy="${B - 4}" r="3" fill="#ffd76a"><animate attributeName="cx" values="150;${150 + dx}" dur=".9s" begin="${(i % 3) * 0.3}s" repeatCount="indefinite"/><animate attributeName="cy" values="${B - 4};${B - 4 + dy}" dur=".9s" begin="${(i % 3) * 0.3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur=".9s" begin="${(i % 3) * 0.3}s" repeatCount="indefinite"/></circle>`; }
      s += '</g><g data-ol="forge">';
      // ---- главное здание ----
      // труба с дымом
      s += K.chimney(621, 230, 62, 160, '#6e6a7c', '#5a5768').replace(/<rect[^>]*height="11"[^>]*\/>$/, '') + `<rect x="582" y="222" width="78" height="18" fill="#5a5768" ${O(4)}/><ellipse cx="621" cy="222" rx="26" ry="6" fill="#ff8a2a" opacity=".8"/>`;   // 26.10: кладка трубы
      for (let i = 0; i < 3; i++) s += `<circle cx="${621 + i * 6}" cy="200" r="${18 + i * 6}" fill="#7d7890" opacity="0"><animate attributeName="cy" values="210;90" dur="4s" begin="${i * 1.3}s" repeatCount="indefinite"/><animate attributeName="cx" values="${621};${660 + i * 10}" dur="4s" begin="${i * 1.3}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".55;0" dur="4s" begin="${i * 1.3}s" repeatCount="indefinite"/></circle>`;
      for (let i = 0; i < 4; i++) s += `<circle cx="${610 + i * 8}" cy="220" r="2.5" fill="#ffd76a"><animate attributeName="cy" values="222;150" dur="${1.6 + i * 0.3}s" begin="${i * 0.4}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${1.6 + i * 0.3}s" begin="${i * 0.4}s" repeatCount="indefinite"/></circle>`;
      // крыша-черепица
      // 25.10: сланцевая черепица рядами чешуек и конёк
      s += K.roof([[X0 - 30, top + 6], [cx, peak], [X1 + 30, top + 6]], { pal: 'slate', step: 17, id: 'lgForgeRoof' }) + `<path d="M${X0 - 34} ${top + 8} L${cx} ${peak - 4} L${X1 + 34} ${top + 8}" fill="none" stroke="#2a2440" stroke-width="7" stroke-linejoin="round"/><path d="M${X0 - 34} ${top + 8} L${cx} ${peak - 4} L${X1 + 34} ${top + 8}" fill="none" ${O(3)}/>`;
      // фронтон: эмблема
      s += `<path d="M${cx - 34} 330 h68 v40 q0 34 -34 46 q-34 -12 -34 -46 Z" fill="#7a0f1d" ${O(4)}/>` + smithIcon(cx, 368, 0.75);
      // верхний этаж (фахверк)
      s += `<rect x="${X0}" y="${top}" width="${X1 - X0}" height="${mid - top}" fill="#cdb894" ${O()}/>`;
      // штукатурка: пятна и трещинки; балки — с волокнами
      s += K.plaster([X0, top, X1, mid], '#cdb894') + `<path d="M${X0 + 30} ${top + 120} q14 -4 22 6 M${X0 + 300} ${top + 28} q10 6 4 16 M${X0 + 380} ${top + 130} l8 -10 l8 6" stroke="#a8946e" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="${X0}" y="${top}" width="${X1 - X0}" height="18" fill="url(#lgWallShade)"/>`;
      for (let i = 0; i <= 5; i++) s += `<path d="M${X0 + (X1 - X0) * i / 5} ${top} V${mid}" stroke="#5a3a1e" stroke-width="8"/><path d="M${X0 + (X1 - X0) * i / 5 - 1.5} ${top + 14} V${mid - 20}" stroke="#7a5432" stroke-width="2" stroke-dasharray="18 10" opacity=".8"/>`;
      s += `<path d="M${X0} ${top + 6} H${X1} M${X0} ${mid - 4} H${X1}" stroke="#5a3a1e" stroke-width="9"/>`;
      [0, 2, 4].forEach((i) => { const wx = X0 + (X1 - X0) * (i + 0.5) / 5 - 22; s += (i !== 2 ? [wx - 19, wx + 45].map((sx) => `<rect x="${sx}" y="${top + 32}" width="18" height="58" rx="3" fill="#7a0f1d" ${O(3)}/><path d="M${sx + 4} ${top + 44} h10 M${sx + 4} ${top + 60} h10 M${sx + 4} ${top + 76} h10" stroke="#4a0812" stroke-width="2.5"/>`).join('') : '') + windowLit(wx, top + 34, 44, 54, i !== 2) + `<rect x="${wx - 6}" y="${top + 90}" width="56" height="12" rx="3" fill="#6b4423" ${O(3)}/>` + [0, 1, 2].map((k) => `<circle cx="${wx + 6 + k * 16}" cy="${top + 88}" r="6" fill="${['#e8455c', '#ffc94d', '#ff9fb2'][k]}" ${O(2)}/>`).join(''); });
      [1, 3].forEach((i) => { const x = X0 + (X1 - X0) * (i + 0.5) / 5; s += `<path d="M${x - 40} ${top + 12} L${x + 40} ${mid - 10} M${x + 40} ${top + 12} L${x - 40} ${mid - 10}" stroke="#5a3a1e" stroke-width="6"/>`; });
      // нижний этаж (камень)
      // 25.10: нижний этаж — тёсаный камень (кладка набора в светлых тонах), цоколь
      s += `<rect x="${X0}" y="${mid}" width="${X1 - X0}" height="${B - mid}" fill="#77738a"/>` + K.wall([X0, mid, X1, B], { pal: 'light', scale: 0.4, seed: 9 }) + `<rect x="${X0}" y="${B - 16}" width="${X1 - X0}" height="16" fill="#5d596e"/><rect x="${X0}" y="${mid}" width="${X1 - X0}" height="${B - mid}" fill="none" ${O()}/>`;
      // горнило-витрина с оружием
      s += `<path d="M268 ${B} V690 A80 70 0 0 1 428 690 V${B} Z" fill="url(#forgeIn)" ${O(5)}/>`;
      s += `<ellipse cx="348" cy="720" rx="150" ry="110" fill="url(#glowFire)"><animate attributeName="opacity" values=".5;.9;.65;.85;.5" dur="1.4s" repeatCount="indefinite"/></ellipse>`;
      s += goods.weapon(300, 742, 'sword', 'common', 0, 1.15) + goods.shield(350, 724, 'round', 'common', 1.1) + goods.weapon(398, 742, 'axe', 'rare', 0, 1.1);
      s += `<path d="M262 ${B} V690 A86 76 0 0 1 434 690 V${B}" fill="none" stroke="#5a5768" stroke-width="10"/>`;
      // дверь
      s += `<path d="M530 ${B} V680 A52 52 0 0 1 634 680 V${B} Z" fill="#8a86a0" ${O(4)}/><path d="M575 630 h14 l-3 16 h-8 Z" fill="#a8a4ba" ${O(3)}/>` + K.door(582, B, 84, 132, { c: '#6b4423', stepC: '#77738a' });   // 26.10: дверь из досок с петлями в каменной арке
      // главная вывеска над первым этажом
      s += `<rect x="${cx - 150}" y="582" width="300" height="60" rx="10" fill="#7a0f1d" ${O(5)}/><rect x="${cx - 140}" y="590" width="280" height="44" rx="6" fill="none" stroke="#ffc94d" stroke-width="2.5"/>`;
      s += [cx - 132, cx + 132].map((x) => `<circle cx="${x}" cy="612" r="4" fill="#ffc94d"/>`).join('');
      s += `<text x="${cx + 14}" y="626" text-anchor="middle" font-family="Russo One" font-size="38" fill="#ffc94d" stroke="${INK}" stroke-width="6" paint-order="stroke" letter-spacing="4">КУЗНЯ</text>` + smithIcon(cx - 88, 612, 0.48);
      s += K.gutter(X0 - 26, X1 + 26, top + 10, X1 - 4, mid - 6);   // 26.10: водосток (до каменного этажа)
      // кованый кронштейн с подвесным щитом на углу
      s += `<path d="M${X1} 500 h70 M${X1} 530 q40 0 60 -30" stroke="#2a2440" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M${X1 + 58} 500 v14" stroke="#2a2440" stroke-width="3"/>`;
      s += `<g transform="translate(${X1 + 58} 514)"><animateTransform attributeName="transform" type="rotate" values="-5;5;-5" dur="3s" repeatCount="indefinite" additive="sum"/><path d="M-26 0 h52 v28 q0 26 -26 36 q-26 -10 -26 -36 Z" fill="#b8bcc9" ${O(4)}/>${goods.weapon(0, 50, 'hammer', 'common', 0, 0.8)}</g>`;
      // бочка с мечами у входа
      s += barrel(668, B + 34, 0.7) + goods.weapon(658, B - 20, 'sword', 'common', -8, 0.9) + goods.weapon(678, B - 22, 'spear', 'common', 10, 0.8);
      // кузнец у наковальни (поверх, ближе к зрителю)
      s += '</g><g data-ol="anvil smith">' + guy('кузнец легиона', B + 60, 226, 1.1, 'stern', { armed: true, gear: { w: 'hammer', wr: 'common' } }, { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#e88a7a' }, 'smith') + '</g>';
      return s;
    }
    
    /* ---------- ТОРГОВЫЕ РЯДЫ: ряд ларьков под углом, уходящий к воротам ---------- */
    function marketRows() {
      const VP = [1640, 760], A = [720, 1072], H0 = 330;
      const yB = (x) => A[1] + (x - A[0]) * (VP[1] - A[1]) / (VP[0] - A[0]);
      const k = (x) => (VP[0] - x) / (VP[0] - A[0]);
      const LW = 320, LH = 330;
      // аффинная «перспектива» для ларька между xa и xb (локально: u 0..LW, v -LH..0)
      const M = (xa, xb) => { const a = (xb - xa) / LW, b = a * (VP[1] - A[1]) / (VP[0] - A[0]), d = (k(xa) + k(xb)) / 2 * H0 / LH; return `matrix(${a} ${b} 0 ${d} ${xa} ${yB(xa)})`; };
      let s = '';
      // дорожка вдоль рядов
      const pL = 560, pR = 1300;
      s += `<path d="${pathOf([[A[0] - 40, 1080], [pL, 1080], [VP[0] - 120, VP[1] + 50], [VP[0] - 70, VP[1] + 30]])}" fill="#4a4558" opacity=".55"/>`;
      const stalls = [
        { xa: 735, xb: 950, c1: '#8b55c9', items: (y) => potionsRow(26, y, 6), who: ['алхимик', { hat: 'wizard', shape: 'cone', color: '#7fd6e6' }] },
        { xa: 966, xb: 1135, c1: '#e8455c', items: (y) => goods.bread(40, y) + goods.pie(110, y) + goods.bread(180, y) + goods.pie(250, y), who: ['пекарь', { hat: 'chef', shape: 'ball', color: '#ffb27a' }] },
        { xa: 1150, xb: 1280, c1: '#e8a23d', items: (y) => goods.ham(50, y) + goods.cheese(120, y) + goods.ham(190, y) + goods.cheese(262, y), who: ['мясник', { hat: 'bandana', shape: 'box', color: '#ff9fb2' }] },
        { xa: 1294, xb: 1392, c1: '#3fae5a', items: (y) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => goods.apple(30 + i * 36, y, ['#e8455c', '#ffc94d', '#6fdc6f', '#ff8a5c'][i % 4])).join(''), who: ['торговка', { hat: 'bandana', shape: 'egg', color: '#9fe39a' }] },
      ];
      // рисуем от дальнего к ближнему
      for (const st of stalls.slice().reverse()) {
        const inner = stall({ x: 0, base: 0, w: LW, c1: st.c1, items: st.items(-102), merchant: guy(st.who[0], -88, LW / 2, 1.0, 'happy', {}, st.who[1]) });
        // боковина ближнего края (толщина прилавка) — чтобы читалось как объём
        s += `<g transform="${M(st.xa, st.xb)}">${inner}</g>`;
        const xa = st.xa, y0 = yB(xa), h = k(xa) * H0 * 92 / LH;
        s += `<path d="${pathOf([[xa, y0], [xa - 26 * k(xa), y0 + 8 * k(xa)], [xa - 26 * k(xa), y0 + 8 * k(xa) - h], [xa, y0 - h]])}" fill="#7d5428" ${O(3)}/>`;
      }
      // общая вывеска «ТОРГОВЫЕ РЯДЫ» на двух столбах у входа в ряды
      const bx0 = 732, bx1 = 1120, up = 400, bh = 80;
      const t0 = yB(bx0) - k(bx0) * H0 * up / LH, t1 = yB(bx1) - k(bx1) * H0 * up / LH;
      s += `<rect x="${bx0 - 8}" y="${t0 - 30}" width="14" height="${yB(bx0) - t0 + 30}" fill="#6b4423" ${O(3)}/><rect x="${bx1 - 7}" y="${t1 - 24}" width="12" height="${yB(bx1) - t1 + 24}" fill="#6b4423" ${O(3)}/>`;
      const Mb = (() => { const a = (bx1 - bx0) / 600, b = a * (VP[1] - A[1]) / (VP[0] - A[0]), d = (k(bx0) + k(bx1)) / 2 * H0 / LH; return `matrix(${a} ${b} 0 ${d} ${bx0} ${t0})`; })();
      s += `<g transform="${Mb}"><path d="M0 0 V${-bh} H600 V0 Z" transform="translate(0 0)" fill="#3a2a1a" ${O(5)}/><rect x="10" y="${-bh + 10}" width="580" height="${bh - 20}" rx="8" fill="#6b4423" stroke="#ffc94d" stroke-width="3"/>
        <text x="300" y="${-bh / 2 + 14}" text-anchor="middle" font-family="Russo One" font-size="40" fill="#ffc94d" stroke="${INK}" stroke-width="7" paint-order="stroke" letter-spacing="3">ТОРГОВЫЕ РЯДЫ</text>
        ${goods.potion(40, -18, '#e8455c')}${goods.bread(560, -20)}</g>`;
      // гирлянда фонариков вдоль рядов
      let pts = [];
      for (let x = 740; x <= 1390; x += 34) pts.push([x, yB(x) - k(x) * H0 * 1.25]);
      s += `<path d="M${pts.map((p) => p.join(' ')).join(' L')}" fill="none" stroke="#2a2440" stroke-width="3"/>` + pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1] + 7}" r="${5 * k(p[0]) + 2}" fill="${['#ffd76a', '#ff8a5c', '#6fdc6f', '#4ab0ff'][i % 4]}"><animate attributeName="opacity" values="1;.35;1" dur="${1.4 + (i % 5) * 0.3}s" repeatCount="indefinite"/></circle>`).join('');
      return s;
    }
    
    /* ---------- ШАТЁР ФРАНТА: шляпы, плащи, украшения и амулеты с аурами ---------- */
    function tent() {
      const cx = 1530, rTop = 280, roofY = 520, peakY = 300, bodyR = 250, B = 735;
      const n = 14;
      const eY = (r, y0, ry, x) => y0 + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / r) ** 2));
      const xs = (r) => Array.from({ length: n + 1 }, (_, i) => cx - r * Math.cos(Math.PI * i / n));
      const C1 = '#6a2fc4', C2 = '#f1e6c8';
      let s = '';
      // тень
      s += `<ellipse cx="${cx}" cy="${B + 24}" rx="300" ry="34" fill="#15122e" opacity=".35"/>`;
      // стены-полосы
      const bx = xs(bodyR);
      for (let i = 0; i < n; i++) s += `<path d="${pathOf([[bx[i], roofY], [bx[i + 1], roofY], [bx[i + 1], eY(bodyR, B, 24, bx[i + 1])], [bx[i], eY(bodyR, B, 24, bx[i])]])}" fill="${i % 2 ? C2 : C1}"/>`;
      s += `<path d="M${cx - bodyR} ${roofY} V${B} A${bodyR} 24 0 0 0 ${cx + bodyR} ${B} V${roofY}" fill="none" ${O()}/>`;
      // вход: тёплый свет внутри
      s += `<path d="M${cx - 95} ${B + 22} V600 Q${cx} 520 ${cx + 95} 600 V${B + 22} Z" fill="url(#warm)" ${O(4)}/>`;
      // внутри: манекен в плаще, зеркало, полка с амулетами
      s += `<rect x="${cx - 4}" y="640" width="8" height="${B - 640}" fill="#6b4423"/><path d="M${cx - 34} 650 Q${cx} 628 ${cx + 34} 650 L${cx + 44} 730 Q${cx} 740 ${cx - 44} 730 Z" fill="#a3122a" ${O(3)}/><circle cx="${cx}" cy="626" r="16" fill="#e8d9b8" ${O(3)}/>` + goods.hat(cx, 618, 'tophat');
      s += `<ellipse cx="${cx + 62}" cy="660" rx="18" ry="30" fill="#bfe6ff" stroke="#ffc94d" stroke-width="5"/><path d="M${cx + 56} 645 q6 -6 10 2" stroke="#fff" stroke-width="3" fill="none"/>`;
      s += `<path d="M${cx - 86} 640 h44" stroke="#6b4423" stroke-width="5"/>` + ['#ffc94d', '#4ab0ff', '#b06bff'].map((c, i) => `<path d="M${cx - 80 + i * 16} 640 v12" stroke="#ffc94d" stroke-width="2"/><circle cx="${cx - 80 + i * 16}" cy="658" r="6" fill="${c}" ${O(2)}/>`).join('');
      // откинутые полы, подвязанные золотым шнуром
      s += `<path d="M${cx - 95} 600 Q${cx - 60} 650 ${cx - 120} ${B + 18} L${cx - 150} ${B + 14} L${cx - 150} 580 Z" fill="${C1}" ${O(4)}/><path d="M${cx + 95} 600 Q${cx + 60} 650 ${cx + 120} ${B + 18} L${cx + 150} ${B + 14} L${cx + 150} 580 Z" fill="${C1}" ${O(4)}/>`;
      s += `<path d="M${cx - 132} 662 q12 8 24 0 M${cx + 108} 662 q12 8 24 0" stroke="#ffc94d" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="${cx - 104}" cy="668" r="6" fill="#ffc94d"/><circle cx="${cx + 104}" cy="668" r="6" fill="#ffc94d"/>`;
      // крыша-конус полосами
      const rx = xs(rTop);
      for (let i = 0; i < n; i++) s += `<path d="${pathOf([[cx, peakY], [rx[i], eY(rTop, roofY, 34, rx[i])], [rx[i + 1], eY(rTop, roofY, 34, rx[i + 1])]])}" fill="${i % 2 ? C2 : C1}"/>`;
      s += `<path d="M${cx} ${peakY} L${cx - rTop} ${roofY} A${rTop} 34 0 0 0 ${cx + rTop} ${roofY} Z" fill="none" ${O()}/>`;
      // фестоны по краю крыши
      const m = 22; let fest = '';
      for (let i = 0; i < m; i++) { const x0 = cx - rTop + 2 * rTop * i / m, x1 = cx - rTop + 2 * rTop * (i + 1) / m, y0 = eY(rTop, roofY, 34, x0), y1 = eY(rTop, roofY, 34, x1); fest += `<path d="M${x0} ${y0} L${x1} ${y1} L${(x0 + x1) / 2} ${(y0 + y1) / 2 + 22} Z" fill="${i % 2 ? '#ffc94d' : '#a3122a'}" ${O(3)}/>`; }
      s += fest;
      // фонарики под крышей
      [cx - 200, cx + 200].forEach((x) => { const y = eY(rTop, roofY, 34, x) + 20; s += `<path d="M${x} ${y} v18" stroke="#2a2440" stroke-width="3"/><circle cx="${x}" cy="${y + 34}" r="44" fill="url(#glow)" opacity=".7"><animate attributeName="opacity" values=".55;.85;.6" dur="2.4s" repeatCount="indefinite"/></circle><path d="M${x - 11} ${y + 18} h22 l-3 30 h-16 z" fill="#ffd76a" ${O(3)}/>`; });
      // навершие и флаг
      s += `<path d="M${cx} ${peakY} V${peakY - 70}" stroke="#ffc94d" stroke-width="6"/><circle cx="${cx}" cy="${peakY - 72}" r="9" fill="#ffc94d" ${O(3)}/>`;
      s += `<g transform="translate(${cx + 3} ${peakY - 64})"><path d="M0 0 q30 -10 64 4 q-20 10 0 22 q-34 -8 -64 0 Z" fill="#a3122a" ${O(3)}><animateTransform attributeName="transform" type="skewY" values="0;6;0;-5;0" dur="2.5s" repeatCount="indefinite"/></path></g>`;
      // коврик у входа
      s += `<path d="M${cx - 110} ${B + 30} H${cx + 110} L${cx + 140} ${B + 70} H${cx - 140} Z" fill="#a3122a" ${O(4)}/><path d="M${cx - 100} ${B + 40} H${cx + 100} L${cx + 120} ${B + 62} H${cx - 120} Z" fill="none" stroke="#ffc94d" stroke-width="3"/>`;
      // амулеты на нитях под фестонами (светятся цветами аур)
      [[-170, '#ffc94d'], [-140, '#4ab0ff'], [-245, '#b06bff'], [150, '#bfefff'], [180, '#ffc94d'], [245, '#ff6a8a']].forEach(([dx, c], i) => { const x = cx + dx, y = eY(rTop, roofY, 34, x) + 20, l = 26 + (i % 3) * 14; s += `<path d="M${x} ${y} v${l}" stroke="#ffc94d" stroke-width="2"/><circle cx="${x}" cy="${y + l + 10}" r="18" fill="${c}" opacity=".35"><animate attributeName="r" values="12;20;12" dur="${1.6 + i * 0.3}s" repeatCount="indefinite"/></circle><path d="M${x} ${y + l} l9 10 l-9 10 l-9 -10 Z" fill="${c}" ${O(2.5)}/>`; });
      // полка со шляпами внутри
      s += `<path d="M${cx - 92} 712 h56" stroke="#6b4423" stroke-width="5"/>` + goods.hat(cx - 76, 708, 'beret') + goods.hat(cx - 50, 708, 'wizard');
      // стойка-вывеска (мольберт)
      const sx = 1795, sy = 640;
      s += `<path d="M${sx - 60} ${B + 60} L${sx - 30} ${sy} M${sx + 60} ${B + 60} L${sx + 30} ${sy} M${sx} ${B + 60} L${sx} ${sy + 60}" stroke="#6b4423" stroke-width="8" stroke-linecap="round"/>`;
      s += `<g transform="rotate(-3 ${sx} ${sy + 50})"><rect x="${sx - 105}" y="${sy}" width="210" height="104" rx="12" fill="#3a1f6b" ${O(5)}/><rect x="${sx - 96}" y="${sy + 9}" width="192" height="86" rx="8" fill="none" stroke="#ffc94d" stroke-width="2.5"/>
        <text x="${sx}" y="${sy + 44}" text-anchor="middle" font-family="Russo One" font-size="25" fill="#ffc94d" stroke="${INK}" stroke-width="5" paint-order="stroke">ШАТЁР</text>
        <text x="${sx}" y="${sy + 78}" text-anchor="middle" font-family="Russo One" font-size="25" fill="#ffc94d" stroke="${INK}" stroke-width="5" paint-order="stroke">ФРАНТА</text>${goods.hat(sx + 76, sy + 6, 'tophat')}</g>`;
      // франт
      s += guy('франт', B + 80, 1652, 1.0, 'happy', {}, { hat: 'tophat', acc: ['monocle', 'bowtie', 'cape'], shape: 'tall', color: '#b9a2ff' });
      return s;
    }
    
    function variantC2() {
      let s = nightBg();
      // гирлянда огоньков над площадью
      let lights = `<path d="M0 270 Q480 380 960 290 Q1440 380 1920 270" fill="none" stroke="#2a2440" stroke-width="3"/>`;
      for (let i = 0; i <= 40; i++) { const t = i / 40, half = t < 0.5, tt = half ? t * 2 : (t - 0.5) * 2, x0 = half ? 0 : 960, x2 = half ? 960 : 1920, y0 = half ? 270 : 290, y2 = half ? 290 : 270, mx = half ? 480 : 1440, my = 380, x = (1 - tt) ** 2 * x0 + 2 * (1 - tt) * tt * mx + tt * tt * x2, y = (1 - tt) ** 2 * y0 + 2 * (1 - tt) * tt * my + tt * tt * y2; lights += `<circle cx="${x}" cy="${y + 8}" r="7" fill="${['#ffd76a', '#ff8a5c', '#6fdc6f', '#4ab0ff'][i % 4]}"><animate attributeName="opacity" values="1;.35;1" dur="${1.4 + (i % 5) * 0.3}s" repeatCount="indefinite"/></circle>`; }
      s += lights;
      s += tent() + forge() + marketRows();
      s += banner(700, 40, 520, 'ЯРМАРКА ЛЕГИОНА');
      // прохожие на площади
      s += crowd([['pixel_tanya', 470, 1000, 0.8], ['qwertyboi', 590, 900, 0.68], ['kotik_228', 640, 1060, 0.62]]);
      return s;
    }
    /* ===== широкая сцена и Торговые ряды ===== */
    // Ярмарка — широкая панорама: слева площадь (Кузня, ворота, Шатёр франта), справа — Торговые ряды. Высота 1080, ширина WIDE.
    const WIDE = 3700;
    // 23.10 (просьба стримера: магическую лавку в дальнем углу не видно): Торговые ряды сдвинуты вправо на ROWS_DX (до края сцены), а то,
    // что стояло в конце рядов (башня звездочёта или угловая башня стены с тележкой сена), — на END_DX, между Шатром и рядами.
    // Так же у котиков и обезьян и в «Городе» (site/public/citymap.js: здания, препятствия)
    const ROWS_DX = 270, END_DX = -1470;
    const SKY_STARS = [[], [], [], []];
    function nightBgWide(Wd, o) {
      let s = DEFS + `<defs><linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b22"/><stop offset="1" stop-color="#2b2150"/></linearGradient>
        <radialGradient id="warm" cx=".5" cy=".7" r=".8"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".6" stop-color="#f0a85a"/><stop offset="1" stop-color="#8a4a2a"/></radialGradient>
        <radialGradient id="forgeIn" cx=".5" cy=".8" r=".9"><stop offset="0" stop-color="#ffd27a"/><stop offset=".45" stop-color="#ff7a2a"/><stop offset="1" stop-color="#5a1e10"/></radialGradient>
        <linearGradient id="slate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4266"/><stop offset="1" stop-color="#2f2a45"/></linearGradient>
        <linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2036"/><stop offset="1" stop-color="#1c1626"/></linearGradient></defs>`;
      // небо (градиент) — подложкой под слоями звёзд, см. build(): здесь небо прозрачное
      // звёзды неба — не здесь, а отдельными слоями (SKY_STARS): мерцают целиком через прозрачность и не перерисовывают большую картинку
      for (let i = 0; i < 230; i++) SKY_STARS[i % 4].push(`<circle cx="${(rnd() * Wd).toFixed(1)}" cy="${(rnd() * 380).toFixed(1)}" r="${(0.8 + rnd() * 2).toFixed(2)}" fill="#fff" opacity="${(0.3 + rnd() * 0.7).toFixed(2)}"/>`);
      s += `<circle cx="1712" cy="128" r="52" fill="#f3efd8" ${O(4)}/><circle cx="1696" cy="118" r="9" fill="#d9d3b8"/><circle cx="1728" cy="146" r="6" fill="#d9d3b8"/>`;
      // 25.10: за стеной — кроны деревьев (видны над зубцами), сама стена — каменная кладка из блоков разного тона, мох у подножия
      for (const [tx, ts] of [[150, 1.05], [440, 0.9], [1290, 1.1], [1960, 0.95], [2380, 1.1], [2860, 0.9], [3300, 1.05], [3610, 0.9]]) s += K.tree('tree', tx, 470, ts, tx % 2 > 0);
      s += `<rect x="0" y="330" width="${Wd}" height="380" fill="#4d4a5c"/>` + K.wall([0, 333, Wd, 708], { moss: true, seed: 5 }) + `<rect x="0" y="330" width="${Wd}" height="380" fill="none" ${O()}/>`;
      for (let i = 0; i < Wd / 82 + 1; i++) s += `<rect x="${i * 82}" y="300" width="52" height="40" fill="#4d4a5c" ${O(4)}/><path d="M${i * 82 + 8} 310 H${i * 82 + 44}" stroke="#6e6a84" stroke-width="3" stroke-linecap="round"/>`;
      s += '<g data-ol="gate">';
      // ворота
      s += `<path d="M820 710 V520 A140 140 0 0 1 1100 520 V710 Z" fill="#1a1630" ${O(6)}/>`;
      for (let i = 0; i < 7; i++) s += `<path d="M${840 + i * 38} 470 V650" stroke="#6d6a78" stroke-width="7"/>`;
      s += `<path d="M830 520 H1090 M830 590 H1090" stroke="#6d6a78" stroke-width="6"/>`;
      s += [520, 590].map((y) => [0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${840 + i * 38}" cy="${y}" r="4.5" fill="#9a98a8" stroke="#15122e" stroke-width="1.5"/>`).join('')).join('') + [0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${834 + i * 38} 650 l6 14 l6 -14 Z" fill="#6d6a78" stroke="#15122e" stroke-width="1.5"/>`).join('');
      // 25.10: башни ворот — кладка из блоков, крыши — красная черепица, бойницы
      for (const tx of [760, 1070]) s += `<rect x="${tx}" y="230" width="90" height="480" fill="#5a5768"/>` + K.wall([tx, 230, tx + 90, 710], { pal: 'tower', scale: 0.42, seed: tx }) + `<rect x="${tx}" y="230" width="90" height="480" fill="none" ${O()}/><path d="M${tx + 39} 300 h12 v34 h-12 Z M${tx + 39} 420 h12 v34 h-12 Z" fill="#15122e" ${O(3)}/>`;
      s += K.roof([[745, 235], [805, 150], [865, 235]], { pal: 'red', step: 14, scale: 0.7, id: 'lgGateR1' }) + K.roof([[1055, 235], [1115, 150], [1175, 235]], { pal: 'red', step: 14, scale: 0.7, id: 'lgGateR2' });
      s += `<path d="M805 150 V100 l40 12 l-40 12" fill="#ffc94d" ${O(3)}/><path d="M1115 150 V100 l40 12 l-40 12" fill="#ffc94d" ${O(3)}/>`;
      for (const bx of [805, 1115]) s += `<path d="M${bx - 22} 486 H${bx + 22} V600 l-22 -16 l-22 16 Z" fill="#7a0f1d" ${O(4)}/><path d="M${bx - 26} 486 H${bx + 26}" stroke="#ffc94d" stroke-width="6" stroke-linecap="round"/><circle cx="${bx}" cy="526" r="12" fill="#ffc94d" stroke="${INK}" stroke-width="2"/>`;   // 26.10: знамёна на башнях ворот
      s += '</g>';
      // угловая башня в конце рядов
      if (!(o && o.magic)) s += `<g transform="translate(${END_DX} 0)">` + `<rect x="3480" y="200" width="150" height="510" fill="#5a5768" ${O()}/><path d="M3460 205 L3555 90 L3650 205 Z" fill="#a3122a" ${O()}/><path d="M3555 90 V45 l40 12 l-40 12" fill="#ffc94d" ${O(3)}/>` + windowLit(3537, 300, 36, 56, true, true) + '</g>';   // 23.10: на её месте — башня звездочёта
      s += torch(740, 470) + torch(1180, 470) + torch(1940, 470);   // 23.10: факела у угловой башни нет — она теперь рядом с факелом 1940
      // 25.10: мостовая — булыжник рядами (ниже — крупнее), у подножия стены — тень, под фонарём и у горна — тёплые пятна света
      s += K.pave('cobble', [0, 700, Wd, 1080], { k0: 0.72, k1: 1.35, seed: 3, x0: 0, jit: false }) + `<rect x="0" y="700" width="${Wd}" height="40" fill="url(#lgWallShade)"/><path d="M0 700 H${Wd}" ${O()}/>`;
      s += `<defs><linearGradient id="lgWallShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b1e" stop-opacity=".55"/><stop offset="1" stop-color="#0d0b1e" stop-opacity="0"/></linearGradient></defs>`;
      for (const [px, py, rx] of [[2004, 1004, 150], [110, 800, 170], [348, 790, 190], [740, 716, 120], [1180, 716, 120], [1940, 716, 120]]) s += `<ellipse cx="${px}" cy="${py}" rx="${rx}" ry="${rx * 0.22}" fill="url(#glow)" opacity=".38"/>`;
      // гирлянда огоньков вдоль всей стены
      let lights = '';
      // 23.10 (баг от зрителя: концы проводов висели в воздухе над стеной): провод привязан к верху зубцов (зубец — x 82·k…82·k+52, верх 300),
      // пролёт — 12 зубцов, от первого зубца (в «Городе» к нему же приходит гирлянда квартала, cityart.js)
      const seg = 984;
      for (let x0 = 26; x0 < Wd; x0 += seg) {
        const x2 = x0 + seg, y0 = 302, y2 = 302, mx = x0 + seg / 2, my = 400;
        lights += `<path d="M${x0} ${y0} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="#2a2440" stroke-width="3"/>`;
        for (let i = 0; i < 20; i++) { const t = i / 20, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x2, y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y2; lights += `<circle cx="${x}" cy="${y + 8}" r="7" fill="${['#ffd76a', '#ff8a5c', '#6fdc6f', '#4ab0ff'][i % 4]}"><animate attributeName="opacity" values="1;.35;1" dur="${1.4 + (i % 5) * 0.3}s" repeatCount="indefinite"/></circle>`; }
      }
      return s + lights;
    }
    
    /* ---------- колодец посреди площади ---------- */
    function well(x, base) {
      let s = `<ellipse cx="${x}" cy="${base + 6}" rx="110" ry="20" fill="#15122e" opacity=".35"/>`;
      s += `<rect x="${x - 80}" y="${base - 90}" width="10" height="${10}" fill="none"/>`;
      s += `<rect x="${x - 70}" y="${base - 220}" width="12" height="150" fill="#6b4423" ${O(3)}/><rect x="${x + 58}" y="${base - 220}" width="12" height="150" fill="#6b4423" ${O(3)}/>`;
      s += K.roof([[x - 100, base - 210], [x, base - 280], [x + 100, base - 210]], { pal: 'red', step: 12, scale: 0.55, w: 4, id: 'lgWellR' }) + `<path d="M${x - 64} ${base - 160} H${x + 64}" stroke="#8a5a2b" stroke-width="8"/><circle cx="${x - 64}" cy="${base - 160}" r="7" fill="#6b4423" ${O(2.5)}/><circle cx="${x + 64}" cy="${base - 160}" r="7" fill="#6b4423" ${O(2.5)}/><path d="M${x} ${base - 160} v40" stroke="#c9b48a" stroke-width="3"/><path d="M${x - 14} ${base - 120} h28 l-4 24 h-20 z" fill="#a0703a" ${O(3)}/>`;
      s += `<path d="M${x - 90} ${base} V${base - 70} Q${x} ${base - 90} ${x + 90} ${base - 70} V${base} Q${x} ${base + 20} ${x - 90} ${base} Z" fill="#77738a" ${O(5)}/>`;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const bx = x - 82 + c * 34 + (r % 2) * 14, by = base - 60 + r * 30; s += `<rect x="${bx}" y="${by}" width="28" height="22" rx="4" fill="${(r + c) % 3 ? '#827e94' : '#6e6a82'}" stroke="#15122e" stroke-width="2" stroke-opacity=".35"/><path d="M${bx + 4} ${by + 5} h14" stroke="#a8a4ba" stroke-width="2.5" stroke-linecap="round"/>`; }
      s += `<ellipse cx="${x}" cy="${base - 76}" rx="84" ry="14" fill="#1a1630" ${O(4)}/>`;
      return s;
    }
    
    /* ---------- указатель «→ Торговые ряды» ---------- */
    function signpost(x, base) {
      // 25.10: доски-стрелки с волокнами и гвоздями, столб — с шапкой
      const grain = (x0, x1, y) => `<path d="M${x0} ${y + 16} q${(x1 - x0) / 3} -4 ${(x1 - x0) * 0.66} 0 t${(x1 - x0) * 0.3} 0 M${x0 + 10} ${y + 36} q${(x1 - x0) / 3} 3 ${(x1 - x0) * 0.6} 0" stroke="#6b4423" stroke-width="2" fill="none" opacity=".7"/><circle cx="${x0 + 6}" cy="${y + 26}" r="3" fill="#c9ccd6" stroke="${INK}" stroke-width="1.2"/>`;
      return `<rect x="${x - 6}" y="${base - 210}" width="12" height="210" fill="#6b4423" ${O(3)}/><path d="M${x - 10} ${base - 214} h20 l-4 -10 h-12 Z" fill="#4a2c14" ${O(3)}/>
        <path d="M${x - 20} ${base - 200} h200 l26 26 l-26 26 h-200 Z" fill="#8a5a2b" ${O(4)}/>${grain(x - 14, x + 176, base - 200)}${grain(x - 140, x + 14, base - 140).replace(/cx="[^"]+"/, `cx="${x + 12}"`)}<text x="${x + 84}" y="${base - 166}" text-anchor="middle" font-family="Russo One" font-size="21" fill="#ffc94d" stroke="${INK}" stroke-width="5" paint-order="stroke">РЯДЫ</text>
        <path d="M${x + 20} ${base - 140} h-170 l-26 26 l26 26 h170 Z" fill="#8a5a2b" ${O(4)}/><text x="${x - 64}" y="${base - 106}" text-anchor="middle" font-family="Russo One" font-size="21" fill="#ffc94d" stroke="${INK}" stroke-width="5" paint-order="stroke">КУЗНЯ</text>`;
    }
    
    /* ---------- ларёк анфас: глубокий навес-маркиза, товар на прилавке и подвешенный под навесом ---------- */
    function stall2({ x, base, w = 290, c1, c2 = '#f5f2ff', counter = '', hang = '', front = '', who }) {
      const top = base - 330, eave = base - 262, ctop = base - 112;
      let s = `<ellipse cx="${x + w / 2}" cy="${base + 8}" rx="${w * 0.62}" ry="18" fill="#15122e" opacity=".35"/>`;
      // задник и столбы
      s += `<rect x="${x + 14}" y="${top + 20}" width="${w - 28}" height="${ctop - top - 20}" fill="url(#cloth)"/>`;
      s += `<rect x="${x + 8}" y="${top + 6}" width="14" height="${base - top - 6}" fill="#7a5028" ${O(3)}/><rect x="${x + w - 22}" y="${top + 6}" width="14" height="${base - top - 6}" fill="#7a5028" ${O(3)}/>`;
      // тёплый свет внутри
      s += `<ellipse cx="${x + w / 2}" cy="${ctop - 50}" rx="${w * 0.5}" ry="90" fill="url(#glow)" opacity=".45"/>`;
      // продавец за прилавком
      s += guy(who[0], ctop + 14, x + w / 2, 1.05, 'happy', {}, who[1]);
      // прилавок
      // 25.10: прилавок — доски с волокнами и шляпками гвоздей
      s += K.pave('plank', [x + 4, ctop, x + w - 4, base], { pal: 'wood', k0: 0.7, k1: 0.7, seed: x, cut: true }) + `<rect x="${x + 4}" y="${ctop}" width="${w - 8}" height="${base - ctop}" fill="none" ${O()}/>`;
      s += `<rect x="${x - 8}" y="${ctop - 12}" width="${w + 16}" height="16" rx="5" fill="#8a5a2b" ${O(4)}/>`;
      s += counter;
      // навес: полосы сходятся к задней кромке — ощущение глубины
      const n = 7;
      for (let i = 0; i < n; i++) {
        const bx0 = x + 6 + (w - 12) * i / n, bx1 = x + 6 + (w - 12) * (i + 1) / n, fx0 = x - 26 + (w + 52) * i / n, fx1 = x - 26 + (w + 52) * (i + 1) / n;
        s += `<path d="M${bx0} ${top} L${bx1} ${top} L${fx1} ${eave} L${fx0} ${eave} Z" fill="${i % 2 ? c2 : c1}"/>`;
      }
      s += `<path d="M${x + 6} ${top} H${x + w - 6} L${x + w + 26} ${eave} H${x - 26} Z" fill="none" ${O()}/>`;
      // фестоны
      const sw = (w + 52) / n;
      for (let i = 0; i < n; i++) s += `<path d="M${x - 26 + i * sw} ${eave} h${sw} q${-sw / 2} 30 ${-sw} 0 Z" fill="${i % 2 ? c2 : c1}" ${O(3.5)}/>`;
      s += `<path d="M${x - 30} ${eave} H${x + w + 30}" stroke="#7a5028" stroke-width="8" stroke-linecap="round"/><path d="M${x - 26} ${eave - 2} H${x + w + 26}" stroke="#a8743e" stroke-width="2.5" stroke-linecap="round"/>`;
      // светлая полоска-блик вдоль навеса и золотые кисточки на краях
      s += `<path d="M${x + 10} ${top + 8} H${x + w - 10}" stroke="#ffffff" stroke-width="3" opacity=".35" stroke-linecap="round"/>` + [x - 30, x + w + 30].map((tx) => `<path d="M${tx} ${eave} v14" stroke="#ffc94d" stroke-width="3"/><path d="M${tx - 5} ${eave + 14} h10 l-2 12 h-6 Z" fill="#ffc94d" ${O(2)}/>`).join('');
      s += hang + front;
      return s;
    }
    // подвесной товар
    const hangs = {
      herbs: (x, y, c = '#6fdc6f') => `<path d="M${x} ${y} v14" stroke="#c9b48a" stroke-width="2.5"/><path d="M${x} ${y + 14} l-12 34 h24 Z" fill="${c}" ${O(3)}/><path d="M${x - 8} ${y + 16} h16" stroke="#a3122a" stroke-width="5"/>`,
      sausage: (x, y) => `<path d="M${x} ${y} v8" stroke="#c9b48a" stroke-width="2.5"/>` + [0, 1, 2].map((i) => `<ellipse cx="${x}" cy="${y + 20 + i * 24}" rx="9" ry="12" fill="#b8573e" ${O(3)}/>`).join(''),
      pretzel: (x, y) => `<path d="M${x} ${y} v10" stroke="#c9b48a" stroke-width="2.5"/><circle cx="${x}" cy="${y + 28}" r="15" fill="none" stroke="#f5f2ff" stroke-width="13"/><circle cx="${x}" cy="${y + 28}" r="15" fill="none" stroke="#d9993f" stroke-width="8"/>`,
      garlic: (x, y) => `<path d="M${x} ${y} v6" stroke="#c9b48a" stroke-width="2.5"/>` + [0, 1, 2].map((i) => `<path d="M${x} ${y + 10 + i * 22} q-12 6 -10 16 q10 8 20 0 q2 -10 -10 -16 Z" fill="#f1e6c8" ${O(3)}/>`).join(''),
      lamp: (x, y) => `<path d="M${x} ${y} v10" stroke="#2a2440" stroke-width="3"/><circle cx="${x}" cy="${y + 26}" r="40" fill="url(#glow)" opacity=".7"><animate attributeName="opacity" values=".55;.85;.6" dur="2.2s" repeatCount="indefinite"/></circle><path d="M${x - 9} ${y + 10} h18 l-3 26 h-12 z" fill="#ffd76a" ${O(3)}/>`,
      mug: (x, y) => `<path d="M${x} ${y} v10" stroke="#c9b48a" stroke-width="2.5"/><rect x="${x - 11}" y="${y + 10}" width="22" height="26" rx="3" fill="#a0703a" ${O(3)}/><path d="M${x + 11} ${y + 16} q10 2 0 14" fill="none" stroke="#f5f2ff" stroke-width="4"/>`,
    };
    const basket = (x, base, fill) => `<g transform="translate(${x} ${base})">${fill}<path d="M-36 -26 H36 L28 0 H-28 Z" fill="#c58a45" ${O(4)}/><path d="M-30 -14 H30" stroke="#8a5a2b" stroke-width="3"/></g>`;
    const wheel = (x, y) => `<circle cx="${x}" cy="${y}" r="20" fill="#ffd34d" ${O(3.5)}/><path d="M${x - 20} ${y} q20 6 40 0" stroke="#e8b923" stroke-width="3" fill="none"/>`;
    const pear = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 -26 q8 8 6 12 q10 6 6 14 h-24 q-4 -8 6 -14 q-2 -4 6 -12 Z" fill="#c8e05a" ${O(3)}/></g>`;
    
    function marketRowsWide() {
      const B = 880;
      let s = '';
      // общая вывеска на арке над рядами
      const L = 2000, R = 3410, beamY = 392, cx = (L + R) / 2;
      s += `<rect x="${L - 10}" y="${beamY - 20}" width="22" height="${B + 30 - beamY + 20}" fill="#6b4423" ${O(4)}/><rect x="${R - 12}" y="${beamY - 20}" width="22" height="${B + 30 - beamY + 20}" fill="#6b4423" ${O(4)}/>`;
      s += `<path d="M${L - 30} ${beamY} H${R + 30}" stroke="#5a3a1e" stroke-width="18" stroke-linecap="round"/><path d="M${L - 30} ${beamY} H${R + 30}" stroke="${W}" stroke-width="22" stroke-linecap="round" opacity="0"/>`;
      s += `<path d="M${L - 32} ${beamY - 12} H${R + 32} M${L - 32} ${beamY + 12} H${R + 32}" stroke="${W}" stroke-width="4" stroke-linecap="round"/>`;
      s += `<path d="M${cx - 300} ${beamY} v26 M${cx + 300} ${beamY} v26" stroke="#2a2440" stroke-width="4"/>`;
      s += `<g><animateTransform attributeName="transform" type="rotate" values="-1 ${cx} ${beamY};1 ${cx} ${beamY};-1 ${cx} ${beamY}" dur="4s" repeatCount="indefinite"/>
        <path d="M${cx - 340} ${beamY + 24} H${cx + 340} Q${cx + 360} ${beamY + 70} ${cx + 340} ${beamY + 118} H${cx - 340} Q${cx - 360} ${beamY + 70} ${cx - 340} ${beamY + 24} Z" fill="#7a0f1d" ${O(6)}/>
        <path d="M${cx - 322} ${beamY + 36} H${cx + 322} Q${cx + 338} ${beamY + 70} ${cx + 322} ${beamY + 106} H${cx - 322} Q${cx - 338} ${beamY + 70} ${cx - 322} ${beamY + 36} Z" fill="none" stroke="#ffc94d" stroke-width="3"/>
        <text x="${cx}" y="${beamY + 90}" text-anchor="middle" font-family="Russo One" font-size="54" fill="#ffc94d" stroke="${INK}" stroke-width="8" paint-order="stroke" letter-spacing="5">ТОРГОВЫЕ РЯДЫ</text>
        ${goods.potion(cx - 288, beamY + 98, '#e8455c')}${goods.apple(cx + 290, beamY + 92, '#6fdc6f')}</g>`;
      // флажки от балки к краям
      s += bunting(L, beamY + 10, cx - 340, beamY + 30, 50) + bunting(cx + 340, beamY + 30, R, beamY + 10, 50);
      // ларьки
      const st = [
        { x: 2040, c1: '#8b55c9', who: ['алхимик', { hat: 'wizard', shape: 'cone', color: '#7fd6e6' }],
          counter: potionsRow(2040 + 36, B - 112, 6) + goods.tallPotion(2040 + 290, B - 112, '#ffc94d'),
          hang: hangs.herbs(2040 + 50, B - 262) + hangs.herbs(2040 + 110, B - 262, '#9fe39a') + hangs.lamp(2040 + 175, B - 262) + hangs.herbs(2040 + 240, B - 262, '#b06bff'),
          front: crate(2040 + 40, B + 30, 0.6) + goods.potion(2040 + 30, B - 8, '#4ab0ff') + goods.potion(2040 + 54, B - 8, '#e8455c') },
        { x: 2385, c1: '#e8455c', who: ['пекарь', { hat: 'chef', shape: 'ball', color: '#ffb27a' }],
          counter: goods.bread(2385 + 44, B - 112) + goods.pie(2385 + 104, B - 112) + goods.bread(2385 + 166, B - 112) + goods.pie(2385 + 230, B - 112),
          hang: hangs.pretzel(2385 + 50, B - 262) + hangs.pretzel(2385 + 105, B - 262) + hangs.lamp(2385 + 160, B - 262) + hangs.pretzel(2385 + 215, B - 262) + hangs.pretzel(2385 + 262, B - 262),
          front: basket(2385 + 245, B + 34, goods.bread(0, -20) + goods.bread(14, -26)) },
        { x: 2730, c1: '#e8a23d', who: ['мясник', { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#ff9fb2' }],
          counter: goods.ham(2730 + 50, B - 112) + wheel(2730 + 120, B - 132) + goods.cheese(2730 + 176, B - 112) + goods.ham(2730 + 240, B - 112),
          hang: hangs.sausage(2730 + 46, B - 262) + hangs.sausage(2730 + 88, B - 262) + hangs.lamp(2730 + 145, B - 262) + hangs.sausage(2730 + 200, B - 262) + hangs.sausage(2730 + 244, B - 262),
          front: barrel(2730 + 30, B + 34, 0.62) + wheel(2730 + 30, B - 44) },
        { x: 3075, c1: '#3fae5a', who: ['торговка', { hat: 'bandana', shape: 'egg', color: '#9fe39a' }],
          counter: [0, 1, 2, 3].map((i) => goods.apple(3075 + 40 + i * 26, B - 112, ['#e8455c', '#ffc94d', '#6fdc6f', '#ff8a5c'][i])).join('') + pear(3075 + 170, B - 112) + pear(3075 + 196, B - 112) + goods.apple(3075 + 236, B - 112, '#e8455c') + goods.apple(3075 + 260, B - 112, '#ffc94d'),
          hang: hangs.garlic(3075 + 50, B - 262) + hangs.garlic(3075 + 96, B - 262) + hangs.lamp(3075 + 145, B - 262) + hangs.mug(3075 + 200, B - 262) + hangs.mug(3075 + 246, B - 262),
          front: basket(3075 + 46, B + 34, goods.apple(-14, -22) + goods.apple(10, -24, '#6fdc6f') + goods.apple(-2, -34, '#ffc94d')) },
      ];
      for (const c of st) s += stall2({ x: c.x, base: B, w: 290, c1: c.c1, counter: c.counter, hang: c.hang, front: c.front, who: c.who });
      // фонарный столб между площадью и рядами — отдельный предмет с глубиной (PROPS)
      return s;
    }
    
    // o.magic — магическая лавка открыта (башня звездочёта вместо угловой башни и тележки с сеном), o.magicName — её название
    function variantC3(o) {
      let s = nightBgWide(WIDE, o);
      s += '<g data-ol="tent">' + tent() + '</g>' + forge();
      s += banner(700, 40, 520, 'ЯРМАРКА ЛЕГИОНА');
      // колодец и указатель — отдельные предметы с глубиной (PROPS): человечки проходят за ними или перед ними
      s += `<g data-ol="shop"><g transform="translate(${ROWS_DX} 0)">${marketRowsWide()}</g></g>`;
      // прохожие
      // тележка с сеном у башни
      if (o && o.magic) s += `<g transform="translate(${END_DX} 0)">${MAGIC.building({ name: o.magicName })}</g>`;   // 23.10
      else s += `<g transform="translate(${3570 + END_DX} 840)"><path d="M-90 -40 H90 L80 0 H-80 Z" fill="#a0703a" ${O(4)}/><path d="M-84 -40 Q-60 -110 0 -96 Q60 -112 84 -40 Z" fill="#e8c95a" ${O(4)}/><circle cx="-50" cy="6" r="26" fill="#6b4423" ${O(4)}/><circle cx="50" cy="6" r="26" fill="#6b4423" ${O(4)}/><path d="M90 -20 l60 -10" stroke="#6b4423" stroke-width="8" stroke-linecap="round"/></g>`;
      return s;
    }

      /* ===== интерьер Кузни: полки, витрины, кузнец, горн. S — товар от сервера ({ shelf1, shelf2, case }),
         itemPos — сюда записать, где нарисована каждая вещь (id → { x, y }): там появится печать «ПРОДАНО» ===== */
    const RAR_C = { common: '#c9ccd6', uncommon: '#4cc95a', rare: '#4aa3ff', epic: '#b06bff', legendary: '#ffb83d' };
    // кристалл баллов канала
    // значок баллов канала — пиксельная горка красной пыли (в духе значка баллов на канале), 11×9 «пикселей»
    const PTS_PIX = ['....11.....', '...1221....', '..122321...', '.12333221..', '.1232322211', '12333232221', '12232322221', '.122222221.', '..1111111..'];
    const PTS_COL = { 1: '#3a0d0d', 2: '#7a1414', 3: '#d42020' };
    const PTS_ICON = PTS_PIX.map((row, y) => [...row].map((ch, x) => PTS_COL[ch] ? `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PTS_COL[ch]}"/>` : '').join('')).join('')
      + '<rect x="3" y="4" width="1" height="1" fill="#ff5a3d"/><rect x="5" y="3" width="1" height="1" fill="#ff5a3d"/><rect x="2" y="6" width="1" height="1" fill="#ff7a5a"/>';
    const gem = (x, y, s = 1) => `<g transform="translate(${x - 9 * s} ${y - 8 * s}) scale(${1.6 * s})" shape-rendering="crispEdges">${PTS_ICON}</g>`;
    const f1 = (v) => +(+v).toFixed(1);
    // 23.10: монетка у цены — того металла, что самый крупный в цене («1з 20с» - золото, «6с» - серебро, «40м» - медь); 🔒 - без монетки
    const priceCoin = (pt, x, y) => { const c = /з/.test(pt) ? ['#e8b923', '#6a4a0a', '#a07a1a'] : /с/.test(pt) ? ['#dfe3ea', '#4a525e', '#8e97a4'] : /[мб]/.test(pt) ? ['#cd7f3c', '#5a2c0c', '#8f4e1e'] : null; return c ? `<circle cx="${x}" cy="${y}" r="10" fill="${c[0]}" stroke="${c[1]}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${c[2]}" stroke-width="2"/>` : ''; };
    const fmtP = (n) => Number(n || 0).toLocaleString('ru-RU');
    // название на ценнике: одна строка, если короткое, иначе две (разрыв по пробелу ближе к середине); размер шрифта — сколько влезает
    function tagLines(name) {
      const nm = String(name || '');
      if (nm.length <= 11) return [nm];
      let best = null;
      for (let i = 1; i < nm.length - 1; i++) if (nm[i] === ' ' || nm[i] === '-') { const a = nm.slice(0, nm[i] === '-' ? i + 1 : i), b = nm.slice(i + 1), m = Math.max(a.length, b.length); if (!best || m < best[2]) best = [a, b, m]; }   // перенос по пробелу или после дефиса
      if (best && best[2] <= 15) return [best[0], best[1]];
      return [nm.length > 18 ? nm.slice(0, 17) + '…' : nm];
    }
    const RAR_N = { uncommon: 'необычное', rare: 'редкое', epic: 'эпическое', legendary: 'легендарное' };
    // ценник: бумажка на нитке (полка) или латунная табличка (витрина). Редкие — рамка цвета редкости, мерцающий ореол и ярлычок с редкостью
    function priceTag(x, y, it, kind = 'paper', w = 156) {
      const paper = kind === 'paper', rar = RAR_N[it.rarity] ? it.rarity : null, rc = RAR_C[it.rarity] || RAR_C.common;
      const lines = tagLines(it.name), maxLen = Math.max(...lines.map((l) => l.length), 1);
      const fs = Math.max(13, Math.min(lines.length > 1 ? 18 : 20, Math.floor((w - 14) / (maxLen * 0.64))));
      const top = rar ? 18 : 6, nameH = 42, hgt = top + nameH + 32 + (it.rank ? 17 : 0);   // место под название — всегда на две строки: ценники в ряду одной высоты
      let g = `<g transform="translate(${f1(x)} ${f1(y)})">`;
      if (paper) g += `<path d="M0 -10 V2" stroke="#c9b48a" stroke-width="2"/>`;
      if (rar) g += `<rect x="${-w / 2 - 6}" y="-6" width="${w + 12}" height="${hgt + 12}" rx="13" fill="none" stroke="${rc}" stroke-width="9" opacity=".5"><animate attributeName="opacity" values=".3;.75;.3" dur="2.4s" repeatCount="indefinite"/></rect>`;
      g += `<rect x="${-w / 2}" y="0" width="${w}" height="${hgt}" rx="8" fill="${paper ? '#f1e6c8' : '#e8c46a'}" stroke="${rar ? rc : INK}" stroke-width="${rar ? 4.5 : 2.5}"/>`;
      if (rar) g += `<path d="M${-w / 2 + 2} 8 Q${-w / 2 + 2} 2 ${-w / 2 + 8} 2 H${w / 2 - 8} Q${w / 2 - 2} 2 ${w / 2 - 2} 8 V15 H${-w / 2 + 2} Z" fill="${rc}"/>`
        + `<text y="13" text-anchor="middle" font-family="Russo One" font-size="11" fill="#fff" letter-spacing="1.5">${it.rarity === 'legendary' ? '★ ' : ''}${RAR_N[rar].toUpperCase()}${it.rarity === 'legendary' ? ' ★' : ''}</text>`;
      lines.forEach((l, i) => { g += `<text y="${f1(lines.length > 1 ? top + (i + 1) * 21 - 4 : top + 21 + fs * 0.36)}" text-anchor="middle" font-family="Russo One" font-size="${fs}" fill="#3a2614">${esc(l)}</text>`; });
      const py = top + nameH + 24;
      // цена со значком баллов — по центру ценника; длинная цена (150 000) уменьшается, чтобы влезла
      const pt = it.priceText || fmtP(it.price), pfs = Math.max(14, Math.min(24, Math.floor((w - 14 - 26) / (pt.length * 0.6)))), pw = 26 + pt.length * pfs * 0.6, px0 = -pw / 2;
      g += (it.priceText ? priceCoin(it.priceText, f1(px0 + 10), py - 8) : gem(f1(px0 + 10), py - 8, 1.2)) +   /* 23.10: priceText — цена в монетах («Город») */ `<text x="${f1(px0 + 26)}" y="${py}" font-family="Russo One" font-size="${pfs}" fill="#7a0f1d">${pt}</text>`;
      if (it.rank) { const rt = `🔒 ${it.rank}${it.rankMin != null ? ` (от ${fmtP(it.rankMin)})` : ''}`; g += `<text y="${py + 17}" text-anchor="middle" font-family="Russo One" font-size="${Math.max(9, Math.min(13, Math.floor((w - 10) / (rt.length * 0.62))))}" fill="#a3122a">${esc(rt)}</text>`; }   // звание и сколько соц. рейтинга для него нужно
      return g + '</g>';
    }
    // свечение редкой вещи: пульсирует; у эпических и легендарных — ещё искры вокруг
    function rarGlow(x, y, r, it) {
      if (!RAR_N[it.rarity]) return '';
      const c = RAR_C[it.rarity];
      let s = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.15)}" fill="url(#frRar-${it.rarity})"><animate attributeName="opacity" values=".7;1;.7" dur="2.4s" repeatCount="indefinite"/></circle>`;
      const n = it.rarity === 'legendary' ? 5 : it.rarity === 'epic' ? 3 : 0;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.6, sx = f1(x + Math.cos(a) * r * 0.85), sy = f1(y + Math.sin(a) * r * 0.85), k = it.rarity === 'legendary' ? 9 : 7;
        s += `<path d="M${sx} ${f1(sy - k)} Q${sx} ${sy} ${f1(sx + k)} ${sy} Q${sx} ${sy} ${sx} ${f1(sy + k)} Q${sx} ${sy} ${f1(sx - k)} ${sy} Q${sx} ${sy} ${sx} ${f1(sy - k)} Z" fill="#fff" stroke="${c}" stroke-width="1.5" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="1.8s" begin="${(i * 0.36).toFixed(2)}s" repeatCount="indefinite"/></path>`;
      }
      return `<g data-rg="1">${s}</g>`;
    }
    // доспехи — рисуем сами: лорика (полосы стали на манекене) и мантия
    function armorArt(it, x, base, sc = 1) {
      // стойка-манекен — часть Кузни, сама вещь — из стиля человечков (D.armorArt; если у стиля нет доспехов — доспехи «Легиона»)
      const kind = (it.look && it.look.armor) === 'robe' || it.id === 'robe' || /мант/i.test(it.baseName || it.name) ? 'robe' : 'lorica';
      if (kind === 'robe') return `<g transform="translate(${x} ${base}) scale(${sc})"><path d="M0 -118 V-104" stroke="#6b4423" stroke-width="4"/><path d="M-26 -104 H26" stroke="#6b4423" stroke-width="5" stroke-linecap="round"/>${D.armorArt('robe', it.rarity)}</g>`;
      return `<g transform="translate(${x} ${base}) scale(${sc})"><rect x="-4" y="-20" width="8" height="20" fill="#6b4423" ${O(3)}/><path d="M-22 0 H22" stroke="#6b4423" stroke-width="6" stroke-linecap="round"/>${D.armorArt('lorica', it.rarity)}</g>`;
    }
    // шлем на подставке-голове
    let S_HELM = 1.6;   // 17.10: на стендах шлемы чуть меньше — не залезают на плашки полки выше
    function helmetArt(it, x, base, sc = 1) {
      const H = D.jHats({ top: 0, hw: 22, square: false, eyeY: 30 }, '#ff9fb2', '#4ab0ff');
      return `<g transform="translate(${x} ${base}) scale(${sc})"><rect x="-3" y="-30" width="6" height="30" fill="#6b4423" ${O(2.5)}/><path d="M-16 0 H16" stroke="#6b4423" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="0" cy="-48" rx="20" ry="22" fill="#d9c7a3" ${O(3)}/><g transform="translate(-60 -64)">${H[(it.look && it.look.hat) || 'legion'] || ''}</g></g>`;
    }
    // вещь целиком: стоит на полке (base — линия полки) или лежит в витрине
    // 23.10: вещь — в группе data-it (сайт, «Город»: наведение обводит контур самой вещи; свечение редкости — data-rg — без обводки)
    function itemArt(it, x, base, where) {
      const g = itemArt0(it, x, base, where); if (!g) return g;
      const m = /^<g data-rg="1">[\s\S]*?<\/g>/.exec(g), glow = m ? m[0] : '';
      return `<g data-it="${String(it.id).replace(/[^\w:.-]/g, '_')}">${glow}<g data-ia="1">${g.slice(glow.length)}</g></g>`;
    }
    function itemArt0(it, x, base, where) {
      const lk = it.look || {};
      if (it.slot === 'weapon' && lk.weapon) {
        if (where === 'case') return rarGlow(x, base - 45, 58, it) + goods.weapon(x - 18, base - 30, lk.weapon, it.rarity, -62, 1.05);
        const sc = ['spear', 'pitchfork', 'staff', 'crook'].includes(lk.weapon) ? 1.5 : 1.8;
        return rarGlow(x, base - 80, 70, it) + goods.weapon(x, base - 21 * sc, lk.weapon, it.rarity, 0, sc);   // рукоять — над полкой, не на ценнике
      }
      if (it.slot === 'shield' && lk.shield) { const sc = where === 'case' ? 1.95 : 2.4; return rarGlow(x, base - 22 * sc, 64, it) + goods.shield(x, base - 22 * sc, lk.shield, it.rarity, sc); }
      // в витрине вещи целиком помещаются под стеклом (окно ~94 px в высоту)
      if (it.slot === 'armor') return rarGlow(x, base - 45, 58, it) + armorArt(it, x, base, where === 'case' ? 0.74 : 1.3);
      if (it.slot === 'helmet') return rarGlow(x, base - 45, 58, it) + helmetArt(it, x, base, where === 'case' ? 0.88 : S_HELM);
      return '';
    }
    // полка: доска с глубиной (верх светлее кромки), волокна дерева, гвоздики, тень на стене, кованые кронштейны
    function shelf(y, x0, x1) {
      const d = 12, w = x1 - x0;
      let g = `<rect x="${x0 + 14}" y="${y + 18}" width="${w - 28}" height="30" fill="url(#shelfShadow)"/>`;   // тень на стене
      // кованые кронштейны с заклёпками
      for (const bx of [x0 + 70, (x0 + x1) / 2, x1 - 70]) {
        g += `<path d="M${bx - 6} ${y + 16} V${y + 56} Q${bx - 6} ${y + 62} ${bx} ${y + 58} L${bx + 34} ${y + 22} Q${bx + 38} ${y + 16} ${bx + 30} ${y + 16} Z" fill="#4a4a55" ${O(3)}/>`
          + `<path d="M${bx + 2} ${y + 46} Q${bx + 6} ${y + 30} ${bx + 22} ${y + 24}" fill="none" stroke="#2a2440" stroke-width="2.5"/>`
          + `<circle cx="${bx}" cy="${y + 50}" r="2.6" fill="#9aa0b4"/><circle cx="${bx + 22}" cy="${y + 22}" r="2.6" fill="#9aa0b4"/>`;
      }
      // доска: верх (вид сверху, светлее) и лицевая кромка
      g += `<path d="M${x0} ${y} L${x0 + d} ${y - d} H${x1 - d} L${x1} ${y} Z" fill="#b98450"/>`
        + `<path d="M${x0 + 30} ${y - 5} H${x1 - 80} M${x0 + 120} ${y - 8} H${x1 - 200}" stroke="#9a6a3a" stroke-width="1.5" opacity=".6"/>`
        + `<rect x="${x0}" y="${y}" width="${w}" height="18" fill="#8a5a2b"/>`
        + `<path d="M${x0 + 8} ${y + 6} C${x0 + w * 0.25} ${y + 3} ${x0 + w * 0.4} ${y + 9} ${x0 + w * 0.6} ${y + 6} S${x1 - 120} ${y + 4} ${x1 - 8} ${y + 7} M${x0 + 40} ${y + 13} C${x0 + w * 0.3} ${y + 11} ${x0 + w * 0.55} ${y + 15} ${x1 - 40} ${y + 12}" fill="none" stroke="#6b4423" stroke-width="1.6" opacity=".8"/>`
        + `<path d="M${x0} ${y} L${x0 + d} ${y - d} H${x1 - d} L${x1} ${y} V${y + 18} H${x0} Z" fill="none" ${O(4)}/><path d="M${x0} ${y} H${x1}" stroke="#d9a868" stroke-width="2"/>`
        + [x0 + 14, x1 - 14].map((nx) => `<circle cx="${nx}" cy="${y + 9}" r="2.4" fill="#3a2614"/>`).join('');
      return g;
    }
    /* 26.10 (art/styles-rest): Кузня по теме FT - раскладка (стенды, полки, витрины, ценники, кузнец) общая, вид - из темы.
       Легион рисуется как раньше (FORGE_LG), новые стили берут makeForge через kit (styles/<стиль>/fair.js → MDDoodle.fairRooms).
       FT: defs, back(S), shelf(y, x0, x1), smith(), counter(), caseBody(x, w, top, bot, glassTop, gh), caseFront(…), необяз.: rc, tink, plaque, mageC, priestC, roles(), O */
    function makeForge(FT) {
      const Ow = FT.O || O;
      return function forgeSvg(S, itemPos) {
      let s = `<defs>${FT.defs}${['uncommon', 'rare', 'epic', 'legendary'].map((r) => `<radialGradient id="frRar-${r}"><stop offset="0" stop-color="${RAR_C[r]}" stop-opacity=".85"/><stop offset=".5" stop-color="${RAR_C[r]}" stop-opacity=".35"/><stop offset="1" stop-color="${RAR_C[r]}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`;
      s += FT.back(S);
      // полки (по эскизу — слева и по центру), товар стоит на полке, ценник висит под ней
      // 17.10: три стенда по классам (Легионер, Лучник, Маг · Жрец): над каждым — табличка, две полки и витрина под ними (ширина стенда = ширина витрины).
      // Нет стендов (старый сервер) — общие полки, как раньше
      const STD = Array.isArray(S.stands) && S.stands.length ? S.stands : null;
      S_HELM = STD ? 1.2 : 1.6;
      if (STD) {
        const SW = (1460 - 40) / 3, RC = FT.rc || { legionary: '#a3122a', archer: '#2f7a3a', magic: '#5b3aa8' }, TINK = FT.tink || '#1a1020', PL = FT.plaque || '#ffe7a0';
        const RL = (() => { try { return (FT.roles ? FT.roles() : null) || {}; } catch (e) { return {}; } })();
        const title = (st) => (st.key === 'legionary' ? RL.legionary : st.key === 'archer' ? RL.archer : st.key === 'magic' && RL.mage && RL.priest ? RL.mage + ' · ' + RL.priest : '') || st.name || '';
        let tags = '';
        STD.forEach((st, c) => {
          const x0 = 40 + c * SW + 8, x1 = x0 + SW - 16, cx = (x0 + x1) / 2, ttl = String(title(st)).toUpperCase();
          s += `<rect x="${f1(x0)}" y="132" width="${f1(x1 - x0)}" height="660" rx="16" fill="#000" opacity=".16"/>`;
          const tw = Math.min(x1 - x0 - 24, Math.max(240, ttl.length * 19 + 60)), fs = Math.max(18, Math.min(30, Math.floor((tw - 40) / (ttl.length * 0.68))));
          s += `<rect x="${f1(cx - tw / 2)}" y="138" width="${f1(tw)}" height="54" rx="11" fill="${RC[st.key] || '#6b4423'}" ${Ow(4)}/><rect x="${f1(cx - tw / 2 + 8)}" y="146" width="${f1(tw - 16)}" height="38" rx="7" fill="none" stroke="${PL}" stroke-width="2" opacity=".65"/>`
            + `<text x="${f1(cx)}" y="${f1(165 + fs * 0.36)}" text-anchor="middle" font-family="Russo One" font-size="${fs}" fill="${PL}" stroke="${TINK}" stroke-width="6" paint-order="stroke" letter-spacing="2">${esc(ttl)}</text>`;
          for (const [y, list] of [[400, st.top || []], [670, st.mid || []]]) {
            s += FT.shelf(y, x0, x1);
            const n = Math.max(1, list.length), step = (x1 - x0 - 30) / n, xs = (i) => x0 + 15 + step * (i + 0.5);
            list.forEach((it, i) => { const x = xs(i); itemPos[it.id] = { x, y: y - 90 }; s += `<ellipse cx="${f1(x)}" cy="${y - 5}" rx="30" ry="5" fill="#000" opacity=".28"/>` + itemArt(it, x, y + 2, 'shelf'); tags += priceTag(x, y + 26, it, 'paper', Math.min(150, step - 8)); });
            // стенд «Маг · Жрец»: оружие мага слева, жреца справа — между ними черта, на кромке полки — подписи
            if (st.key === 'magic' && y === 400) {
              const m = list.filter((it) => it.role === 'mage').length, p = list.filter((it) => it.role === 'priest').length;
              if (m && p) {
                const xd = x0 + 15 + step * m, G = [[RL.mage || 'Маг', FT.mageC || '#7b4fd0', (x0 + 15 + xd) / 2], [RL.priest || 'Жрец', FT.priestC || '#c98a1a', (xd + x1 - 15) / 2]];
                s += `<path d="M${f1(xd)} 236 V392" stroke="${PL}" stroke-width="3" stroke-dasharray="8 8" opacity=".55"/>`;
                for (const [t, col, gx] of G) { const T = String(t).toUpperCase(), w = T.length * 11 + 26; s += `<rect x="${f1(gx - w / 2)}" y="211" width="${f1(w)}" height="26" rx="13" fill="${col}" ${Ow(3)}/><text x="${f1(gx)}" y="229" text-anchor="middle" font-family="Russo One" font-size="15" fill="#fff" stroke="${TINK}" stroke-width="4" paint-order="stroke" letter-spacing="1">${esc(T)}</text>`; }
              }
            }
          }
        });
        s += tags;
      } else {
        const SH = [{ y: 400, list: S.shelf1 || [] }, { y: 670, list: S.shelf2 || [] }], X0 = 50, X1 = 1450;
        let tags = '';   // ценники — после всех вещей, чтобы длинное оружие с нижней полки не залезало на них
        for (const sh of SH) {
          s += FT.shelf(sh.y, X0, X1);
          const n = Math.max(1, sh.list.length), step = (X1 - X0 - 120) / n;
          sh.list.forEach((it, i) => { const x = X0 + 60 + step * (i + 0.5); itemPos[it.id] = { x, y: sh.y - 90 }; s += `<ellipse cx="${x}" cy="${sh.y - 5}" rx="30" ry="5" fill="#000" opacity=".28"/>` + itemArt(it, x, sh.y + 2, 'shelf'); tags += priceTag(x, sh.y + 26, it, 'paper', Math.min(176, step - 8)); });
        }
        s += tags;
      }
      s += FT.smith();
      s += FT.counter();
      // витрины: три стеклянных ящика на бархате, перед вещью — латунная табличка с ценой
      const CASES = 3, cx0 = 40, cx1 = 1460, cw = (cx1 - cx0) / CASES, top = 800, bot = 986, glassTop = 812;
      const list = S.case || [], per = Math.ceil(list.length / CASES) || 1;
      for (let c = 0; c < CASES; c++) {
        const x = cx0 + c * cw + 8, w = cw - 16;
        const gh = bot - glassTop - 82;   // высота окна витрины
        s += FT.caseBody(x, w, top, bot, glassTop, gh);
        const items = STD ? ((STD[c] && STD[c].case) || []) : list.slice(c * per, c * per + per), stp = (w - 24) / Math.max(1, items.length);   // 17.10: витрина под своим стендом
        items.forEach((it, i) => { const ix = x + 12 + stp * (i + 0.5); itemPos[it.id] = { x: ix, y: glassTop + 40 }; s += itemArt(it, ix, glassTop + gh - 4, 'case'); });
        s += FT.caseFront(x, w, top, bot, glassTop, gh);
        items.forEach((it, i) => { const ix = x + 12 + stp * (i + 0.5); s += priceTag(ix, glassTop + gh + 4, it, 'plate', Math.min(160, stp - 6)); });
      }
      return s;
      };
    }
    const FORGE_LG = makeForge({
      defs: `<radialGradient id="fireG" cx=".5" cy=".85" r=".8"><stop offset="0" stop-color="#ffe08a"/><stop offset=".35" stop-color="#ff8a2a"/><stop offset=".75" stop-color="#7a2d14"/><stop offset="1" stop-color="#2a1420"/></radialGradient>
        <radialGradient id="warmWall" cx=".82" cy=".55" r=".75"><stop offset="0" stop-color="#6a3a2a"/><stop offset=".55" stop-color="#3a2a36"/><stop offset="1" stop-color="#231b2e"/></radialGradient>
        <linearGradient id="shelfShadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
        <linearGradient id="velvetG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a0a14"/><stop offset=".25" stop-color="#7a0f1d"/><stop offset="1" stop-color="#9a1a2a"/></linearGradient>
        <linearGradient id="caseWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4f3018"/><stop offset=".08" stop-color="#7a5028"/><stop offset=".92" stop-color="#7a5028"/><stop offset="1" stop-color="#4f3018"/></linearGradient>
        <linearGradient id="glassG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff" stop-opacity=".28"/><stop offset="1" stop-color="#bfe6ff" stop-opacity=".08"/></linearGradient>
        `,
      shelf,
      back(S) {
        let s = '';
        // стена и пол
        s += `<rect width="1920" height="1080" fill="url(#warmWall)"/>`;
        for (let r = 0; r < 16; r++) for (let c = 0; c < 18; c++) s += `<rect x="${c * 112 + (r % 2) * 56 - 30}" y="${r * 60}" width="104" height="52" rx="7" fill="none" stroke="#15122e" stroke-width="2" opacity=".28"/>`;
        s += `<rect x="0" y="930" width="1920" height="150" fill="#5a3d24"/><path d="M0 930 H1920" stroke="${W}" stroke-width="5"/>`;
        for (let i = 0; i < 12; i++) s += `<path d="M${i * 170} 930 V1080" stroke="#3a2614" stroke-width="3"/>`;
        // труба горна: от верха экрана до свода (рисуем раньше горна — стык закрывает его контур)
        s += `<rect x="1658" y="-10" width="84" height="390" fill="#4d4a5c" ${O(5)}/>`
          + [60, 130, 200, 270].map((y, i) => `<path d="M1662 ${y} H1738${i % 2 ? '' : ` M1700 ${y} V${y + 70}`}" stroke="#15122e" stroke-width="2" opacity=".35"/>`).join('')
          + `<rect x="1650" y="300" width="100" height="16" rx="4" fill="#6e6a7c" ${O(4)}/>`;
        // горн за кузнецом
        s += `<path d="M1530 760 V420 Q1700 300 1870 420 V760 Z" fill="#5a5768" ${O(6)}/><path d="M1590 760 V500 Q1700 420 1810 500 V760 Z" fill="url(#fireG)" ${O(4)}/>`;
        for (let i = 0; i < 6; i++) s += `<rect x="${1545 + (i % 3) * 110}" y="${430 + Math.floor(i / 3) * 70}" width="96" height="46" rx="6" fill="none" stroke="#15122e" stroke-width="2" opacity=".35"/>`;
        // инструмент на стене между вывеской и горном: подковы, клещи, скрещённые молоты
        const shoe = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-16 14 V0 A16 16 0 0 1 16 0 V14" fill="none" stroke="${W}" stroke-width="12" stroke-linecap="round"/><path d="M-16 14 V0 A16 16 0 0 1 16 0 V14" fill="none" stroke="#9aa0b4" stroke-width="7" stroke-linecap="round"/><circle cx="0" cy="-22" r="3" fill="#2a2440"/></g>`;
        if (!(S.stands && S.stands.length)) s += `<path d="M1180 150 H1470" stroke="#6b4423" stroke-width="10" stroke-linecap="round"/><path d="M1180 150 H1470" stroke="${W}" stroke-width="14" stroke-linecap="round" opacity="0"/>`
          + [1215, 1265, 1315].map((x) => `<circle cx="${x}" cy="150" r="4" fill="#2a2440"/>`).join('') + shoe(1215, 185, 180) + shoe(1265, 185, 180) + shoe(1315, 185, 180)
          + `<g transform="translate(1400 230)"><path d="M-8 -78 L-4 0 M8 -78 L4 0" stroke="${W}" stroke-width="11" stroke-linecap="round"/><path d="M-8 -78 L-4 0 M8 -78 L4 0" stroke="#4a4a55" stroke-width="6" stroke-linecap="round"/><path d="M-14 -84 Q-8 -96 0 -88 Q8 -96 14 -84" fill="none" stroke="#4a4a55" stroke-width="6"/><circle cx="0" cy="-30" r="5" fill="#9aa0b4" stroke="${INK}" stroke-width="2"/></g>`;   // 17.10: подковы и клещи на стене — только без стендов (стенд «Маг · Жрец» стоит там)
        s += goods.weapon(1505, 350, 'hammer', 'common', 35, 1.4) + goods.weapon(1615, 350, 'hammer', 'common', -35, 1.4);
        // вывеска
        s += `<path d="M880 0 V36 M1040 0 V36" stroke="#2a2440" stroke-width="5"/><rect x="800" y="34" width="320" height="84" rx="14" fill="#7a0f1d" ${O(6)}/><rect x="812" y="46" width="296" height="60" rx="9" fill="none" stroke="#ffc94d" stroke-width="3"/>
          <text x="960" y="92" text-anchor="middle" font-family="Russo One" font-size="46" fill="#ffc94d" stroke="${INK}" stroke-width="7" paint-order="stroke" letter-spacing="5">⚒ КУЗНЯ</text>`;
        return s;
      },
      smith() {
        // кузнец за прилавком (по пояс)
        return guy('кузнец легиона', 800, 1700, 2.1, 'chill', { armed: true, gear: { w: 'hammer', wr: 'common' } }, { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#e88a7a' });
      },
      counter() {
        // прилавок справа (над окном вебки)
        return `<rect x="1480" y="752" width="430" height="80" fill="#a0703a" ${O(5)}/><rect x="1470" y="738" width="450" height="20" rx="6" fill="#8a5a2b" ${O(4)}/>`
          + `<path d="M1486 780 H1904 M1486 806 H1904" stroke="#6b4423" stroke-width="3"/>` + goods.weapon(1560, 735, 'hammer', 'common', 80, 1.3);
      },
      caseBody(x, w, top, bot, glassTop, gh) {
        let s = '';
        // цоколь с ножками
        s += `<rect x="${x + 6}" y="${bot - 4}" width="${w - 12}" height="16" rx="3" fill="#3a2614" ${O(3)}/>` + [x + 20, x + w - 44].map((lx) => `<rect x="${lx}" y="${bot + 10}" width="24" height="12" rx="3" fill="#2a1a0e" ${O(2.5)}/>`).join('');
        // корпус: тёмные бока, светлая кромка сверху
        s += `<rect x="${x}" y="${top}" width="${w}" height="${bot - top}" rx="8" fill="url(#caseWood)" ${O(5)}/><path d="M${x + 8} ${top + 4} H${x + w - 8}" stroke="#b07a42" stroke-width="3"/>`;
        // передняя стенка: две филёнки
        const pw = (w - 48) / 2;
        for (const px of [x + 16, x + 32 + pw]) s += `<rect x="${px}" y="${bot - 58}" width="${pw}" height="48" rx="5" fill="#5f3c1e" stroke="#3a2614" stroke-width="2"/><path d="M${px + 3} ${bot - 12} H${px + pw - 3}" stroke="#a0703a" stroke-width="2"/>`;
        // бархат со складками и тенью от рамы сверху
        s += `<rect x="${x + 12}" y="${glassTop}" width="${w - 24}" height="${gh}" rx="5" fill="url(#velvetG)"/>`
          + [0.22, 0.5, 0.78].map((k) => `<path d="M${x + 12 + (w - 24) * k - 20} ${glassTop + gh} Q${x + 12 + (w - 24) * k} ${glassTop + gh * 0.45} ${x + 12 + (w - 24) * k + 22} ${glassTop + gh}" fill="none" stroke="#5a0a16" stroke-width="3" opacity=".6"/>`).join('')
          + `<rect x="${x + 12}" y="${glassTop}" width="${w - 24}" height="14" fill="#000" opacity=".25"/>`;
        return s;
      },
      caseFront(x, w, top, bot, glassTop, gh) {
        // стекло: лёгкий голубой отлив, светлая кромка, блики
        return `<rect x="${x + 12}" y="${glassTop}" width="${w - 24}" height="${gh}" rx="5" fill="url(#glassG)" stroke="#bfe6ff" stroke-width="2" opacity=".9"/>`
          + `<path d="M${x + 16} ${glassTop + 3} H${x + w - 16}" stroke="#fff" stroke-width="2" opacity=".55"/>`
          + `<path d="M${x + 30} ${glassTop + 10} l60 60 M${x + 52} ${glassTop + 8} l40 40 M${x + w - 120} ${glassTop + 6} l70 70" stroke="#fff" stroke-width="3" opacity=".22"/>`
          // латунные уголки корпуса
          + [[x + 4, top + 4, 1, 1], [x + w - 4, top + 4, -1, 1], [x + 4, bot - 4, 1, -1], [x + w - 4, bot - 4, -1, -1]].map(([ux, uy, sx, sy]) => `<path d="M${ux} ${uy + sy * 18} V${uy} H${ux + sx * 18}" fill="none" stroke="#e8c46a" stroke-width="5" stroke-linecap="round"/><circle cx="${ux + sx * 6}" cy="${uy + sy * 6}" r="2.2" fill="#8a5a1a"/>`).join('');
      },
    });
    // кузнец за прилавком иногда что-то говорит: облачко над головой
    const FORGE_HELLO = ['Заходи, легионер! Не толпись в дверях.', 'О, покупатель! Добро пожаловать в Кузню!', 'Входи, входи — железо стынет!'];
    const FORGE_LINES = [
      'Лучшее оружие только у нас!', 'Куй железо, пока горячо!', 'Гладиус — выбор настоящего легионера.',
      'Скутум прикроет и от стрелы, и от тёщи.', 'Без брони в поход? Смело. Глупо, но смело.', 'Острое, тяжёлое, надёжное — выбирай!',
      'Ржавый меч — не ржавый, а с историей!', 'Цены честные, как слово центуриона.', 'Вилы — не только для сена!',
      'Подходи, не стесняйся! Только руками не лапай.', 'Брони много не бывает!', 'Эй, легионер! Меч не жмёт?',
      'Говорят, Клинок Аквилы ковали боги… а точил его я.', 'Призракам не продаю — монеты сквозь пальцы сыплются!', 'Молот бьёт — Легион живёт!',
      'Топор отличный! Дрова, враги — без разницы.', 'Лорика сидит как влитая. Проверено на мне.', 'Лук? Хороший выбор. Главное — тетиву к себе не тяни.',
    ];
      /* ===== покупки: что говорит кузнец ({n} — ник, {r} — звание) ===== */
    const BUY_LINES = ['Носи с честью, {n}!', 'Отличный выбор, {n}!', '{n}, береги — второй такой не скую. Хотя скую.', 'Продано! {n}, заходи ещё.', 'С обновкой, {n}! Легион гордится.'];
    const FAIL_LINES = {
      ghost: ['{n}, призракам не продаю — баллы вернул!', 'Сквозь прилавок не расплатишься, {n}. Держи баллы обратно.'],
      rank: ['{n}, это только для звания «{r}». Баллы вернул.', 'Подрасти в звании до «{r}», {n}, тогда продам.'],
      jail: ['{n}, под стражей не торгую! Баллы вернул.'],
      error: ['Ой, {n}, что-то заело. Баллы вернул — попробуй ещё.'],
    };

      /* ===== разметка сцены ===== */
      // где стоит камера в каждом виде (сдвиг сцены по x): площадь и Торговые ряды
      const VIEW_X = { square: 0, rows: WIDE - 1920 };
      // Тцарь дня созвездием: левый верхний угол надписи в каждом виде и её ширина
      const SKY_AT = [{ x: 1264, y: 20 }, { x: 2990, y: 20 }];   // левый верхний угол надписи (координаты всей сцены 3700×1080)
      const SKY_W = 388;   // ширина надписи (до луны)
      // особые алерты на Ярмарке (падающие звёзды): место на ЭКРАНЕ
      const AL = { x: 28, y: 16, w: 560 };   // место на экране (над Кузней, левее дыма из трубы)
    /* ===== номера мест на сцене (едут вместе с камерой) ===== */
    const COLORS = { forge: '#ff8a3d', tent: '#b06bff', rows: '#3fc46a', leave: '#9aa0b4', magic: '#7fd6e6' };
    const SPOTS = [
      { key: 'forge', n: 1, x: 465, y: 528 },   // на фасаде Кузни над вывеской (выше — окно вебки)
      { key: 'tent', n: 2, x: 1530, y: 420 },   // на крыше Шатра
      { key: 'rows', n: 3, x: 1444, y: 884 },   // на табличке «РЯДЫ», сразу после слова
      { key: 'rows', n: 3, x: 2705 + ROWS_DX, y: 300 },
      { key: 'leave', n: 4, x: 960, y: 600 },
      { key: 'magic', n: 5, x: 1444, y: 826, magic: true },   // 23.10: над указателем «РЯДЫ →» (лавка — в конце рядов)
      { key: 'magic', n: 5, x: 3565 + END_DX, y: 250, magic: true },   // на крыше башни звездочёта
    ];
    /* ===== предметы с глубиной и препятствия ===== */
    // z — линия основания: человечек с ногами выше неё рисуется ЗА предметом, ниже — ПЕРЕД ним
    const PROPS = [
      { svg: () => K.doc(() => well(990, 960)), x: 860, y: 660, w: 260, h: 335, z: 958 },
      { svg: () => K.doc(() => signpost(1270, 1060)), x: 1080, y: 840, w: 430, h: 232, z: 1058 },
      { svg: () => K.doc(() => `<circle cx="2004" cy="636" r="72" fill="url(#${K.glowId()})" opacity=".85"><animate attributeName="opacity" values=".7;.95;.75;.9;.7" dur="2.8s" repeatCount="indefinite"/></circle>` + K.postLamp(1960, 1000, 400)), x: 1925, y: 570, w: 160, h: 440, z: 998 },   // 25.10: кованый столб с подвесным фонарём (набор)
    ];
    // по этим местам не ходят: e — эллипс (основание предмета), r — прямоугольник от верха сцены до y1 (торговцы и их прилавки:
    // мимо них можно пройти только спереди)
    const OBST = [
      { e: [990, 955, 120, 34] },                 // колодец
      { e: [1270, 1058, 24, 12] },                // столб указателя
      { e: [1960, 998, 26, 12] },                 // фонарный столб
      { r: [0, 305, 872] },                       // бочка, наковальня и кузнец
      { r: [628, 712, 836] },                     // бочка с мечами у двери Кузни
      { r: [1585, 1722, 864] },                   // франт у Шатра
      { r: [2004 + ROWS_DX, 3401 + ROWS_DX, 932] },                   // ларьки Торговых рядов с продавцами (стоят вплотную — одно препятствие)
      { r: [3462 + END_DX, WIDE + END_DX, 884], cart: true },       // тележка с сеном (23.10: при магической лавке её нет — cart)
    ];
      // где гуляют человечки (низ сцены) и двери мест: туда идёт толпа после опроса; spread — разброс по x
      const AREA = { x0: 40, x1: WIDE - 40, y0: 800, y1: 1062 };
      const DOORS = { forge: { x: 582, y: 790 }, tent: { x: 1530, y: 800 }, rows: { x: 2705 + ROWS_DX, y: 975, spread: 520 }, leave: { x: 960, y: 735 }, magic: { x: 3565 + END_DX, y: 820, spread: 120 } };
      // 23.10: магическая лавка — тема рисунка и препятствие у башни (вместо тележки с сеном; дверь — над окном вебки)
      const MAGIC = D.magicShop ? D.magicShop({ seed: 'звездочёт легиона' }) : null;
      const MAGIC_L = MAGIC ? { obstacle: { r: [3436 + END_DX, 3694 + END_DX, 806] }, room: { title: 'Лавка звездочёта', icon: '🔮', artBg: '#1d1838', bg: 'radial-gradient(ellipse at 50% 70%, #9fb6ff 0%, #4b2a8a 42%, #15122e 82%)', note: 'Посохи, мантии, амулеты, звёзды и сферы',
        svg: (S, itemPos) => MAGIC.interior(S, itemPos), hello: ['Звёзды сказали, что ты придёшь.', 'Заходи! Только не урони хрустальный шар.', 'Добро пожаловать в Лавку звездочёта!'],
        lines: ['Посох выбирает мага, а не наоборот.', 'Амулет на удачу — проверено звёздами.', 'Звезда для заточки — с неба, свежая!', 'Мантия к лицу. Звёзды подтверждают.', 'Сфера бережёт вещь. А я берегу сферы.', 'Кадило дымит — значит, работает.', 'Некромантам — скидка… шучу. Цены одни для всех.', 'Руками шар не трогать — предсказания сотрутся.'],
        buy: ['Звёзды благоволят тебе, {n}!', 'Носи с умом, {n}.', 'Продано! {n}, береги от сквозняка.', 'Хороший выбор, {n} — так и было предсказано.'],
        fail: { ghost: ['{n}, призракам не продаю — баллы вернул!'], rank: ['{n}, это только для звания «{r}». Баллы вернул.'], jail: ['{n}, под стражей не торгую! Баллы вернул.'], full: ['{n}, сумка полна — баллы вернул.'], error: ['Ой, {n}, звёзды сбились. Баллы вернул — попробуй ещё.'] } } } : null;
      // кузнец на площади (над ним — счёт пасхалки «куй») и наковальня (искры)
      const SMITH = { x: 226, y: 830, big: 1.1 }, ANVIL = { x: 150, y: 800 };
    /* ===== локации: переход «в дверь» ===== */

    /* ===== ШАТЁР ФРАНТА внутри: полка амулетов, ряд примерочных кабинок со шторками, франт за прилавком =====
       Раскладка одна на все стили, вид — из темы T (цвета, полка, амулеты, украшения). Товар — от сервера (stock.amulets, stock.booths). */
    function makeTent(T) {
      const tt = (x, y, t, size, fill, outline) => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-family="Russo One" font-size="${f1(size)}" fill="${fill}"${outline ? ` stroke="${outline}" stroke-width="${Math.max(3, size / 7).toFixed(1)}" paint-order="stroke"` : ''}>${t}</text>`;
      const SO = (w) => `stroke="${T.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
      const numBadge = (x, y, n, r = 12) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${T.badge}" ${SO(2.4)}/>` + tt(x, y + r * 0.42, n, r * (n > 9 ? 1.05 : 1.25), T.badgeText);
      const cloche = (x, base, w = 132, hgt = 128) => `<path d="M${x - w / 2} ${base} V${base - hgt + 40} Q${x - w / 2} ${base - hgt} ${x} ${base - hgt} Q${x + w / 2} ${base - hgt} ${x + w / 2} ${base - hgt + 40} V${base} Z" fill="#e8fbff" fill-opacity=".16" stroke="#e8fbff" stroke-width="3" stroke-opacity=".75"/><circle cx="${x}" cy="${base - hgt - 6}" r="7" fill="${T.gold}" ${SO(2.4)}/><path d="M${x - w / 2 + 14} ${base - hgt + 44} Q${x - w / 2 + 16} ${base - hgt + 16} ${x - 10} ${base - hgt + 10}" stroke="#fff" stroke-width="4" fill="none" opacity=".55" stroke-linecap="round"/>`;
      // образец: человечек-модель (база одна на всех, меняется только деталь кабинки)
      function sampleArt(key, smp, cx, base, s) {
        if (key === 'hat') {
          const H = D.jHats({ top: 0, hw: 22, square: false, eyeY: 30 }, '#ff9fb2', '#4ab0ff');
          return `<g transform="translate(${f1(cx)} ${f1(base)}) scale(${f1(s)})"><path d="M0 0 V-18" stroke="${T.wood}" stroke-width="5"/><ellipse cx="0" cy="0" rx="16" ry="4" fill="${T.wood}"/><ellipse cx="0" cy="-36" rx="22" ry="20" fill="${T.head}" ${SO(3)}/><g transform="translate(-60 -56)">${H[smp.id] || ''}</g></g>`;
        }
        return guy(T.seed + ' образец ' + key + ' ' + smp.id, base, cx, s, 'walk', {}, Object.assign({}, T.model, smp.look), 'none');
      }
      // портрет в рамке (глаза, рот, румянец): мордочка крупно
      function cameo(key, smp, ccx, ccy, r) {
        const F = T.face, s = (r * 2 * 0.98) / F.w, id = `${T.idp}Cam-${key}-${smp.id}`;
        const body = guy(T.seed + ' образец ' + key + ' ' + smp.id, ccy + (170 - F.y) * s, ccx + (60 - F.x) * s, s, 'walk', {}, Object.assign({}, T.model, smp.look), 'none');
        return `<clipPath id="${id}"><circle cx="${f1(ccx)}" cy="${f1(ccy)}" r="${f1(r)}"/></clipPath><circle cx="${f1(ccx)}" cy="${f1(ccy)}" r="${f1(r)}" fill="${T.cameoBg}"/><g clip-path="url(#${id})">${body}</g>`
          + `<circle cx="${f1(ccx)}" cy="${f1(ccy)}" r="${f1(r + 3)}" fill="none" stroke="${T.gold}" stroke-width="6"/><circle cx="${f1(ccx)}" cy="${f1(ccy)}" r="${f1(r + 6)}" fill="none" stroke="${T.line}" stroke-width="2.5"/>`;
      }
      // кабинка: штанга со шторками, вывеска, манекен, пронумерованные образцы, один ценник на кабинку
      function booth(b, x, w, top, bot, ci, itemPos) {
        const [cA, cB] = T.curtains[ci % T.curtains.length], cx = x + w / 2;
        let s = T.boothFrame ? T.boothFrame(x, w, top, bot) : `<rect x="${x}" y="${top}" width="${w}" height="${bot - top}" rx="10" fill="${T.boothEdge}" ${SO(4)}/>`;
        s += `<rect x="${x + 4}" y="${top + 4}" width="${w - 8}" height="${bot - top - 8}" rx="8" fill="url(#${T.idp}BoothIn)"/>`;
        const curtain = (side) => {
          const x0 = side < 0 ? x + 4 : x + w - 4, dx = side < 0 ? 1 : -1, cw = 22;
          let p = `<path d="M${x0} ${top + 18} H${x0 + dx * cw} Q${x0 + dx * (cw - 14)} ${top + 260} ${x0 + dx * 8} ${top + 300} Q${x0 + dx * (cw + 4)} ${top + 420} ${x0 + dx * (cw + 2)} ${bot - 6} H${x0} Z" fill="${cA}" ${SO(3)}/>`;
          p += [0.35, 0.7].map((k) => `<path d="M${f1(x0 + dx * cw * k)} ${top + 22} Q${f1(x0 + dx * cw * k * 0.5)} ${top + 280} ${f1(x0 + dx * (cw * k + 2))} ${bot - 10}" stroke="${cB}" stroke-width="3" fill="none"/>`).join('');
          p += `<rect x="${x0 + (side < 0 ? 0 : -14)}" y="${top + 292}" width="14" height="14" rx="4" fill="${T.gold}" ${SO(2.4)}/>`;
          return p;
        };
        s += curtain(-1) + curtain(1);
        const nR = Math.max(2, Math.floor(w / 26));
        s += T.rod ? T.rod(x, w, top) : `<path d="M${x - 4} ${top + 14} H${x + w + 4}" stroke="${T.gold}" stroke-width="7" stroke-linecap="round"/><circle cx="${x - 6}" cy="${top + 14}" r="7" fill="${T.gold}" ${SO(2.4)}/><circle cx="${x + w + 6}" cy="${top + 14}" r="7" fill="${T.gold}" ${SO(2.4)}/>`;
        s += Array.from({ length: nR }, (_, i) => `<circle cx="${f1(x + 12 + i * (w - 24) / (nR - 1))}" cy="${top + 14}" r="4.5" fill="none" stroke="${T.line}" stroke-width="2"/>`).join('');
        const tw = Math.min(w - 30, 18 + b.title.length * 13), fs = Math.min(20, Math.floor((tw - 12) / (b.title.length * 0.62)));
        s += `<rect x="${f1(cx - tw / 2)}" y="${top + 26}" width="${f1(tw)}" height="34" rx="8" fill="${cB}" ${SO(3)}/>` + tt(cx, top + 49, esc(b.title), fs, '#fff');
        itemPos['booth:' + b.key] = { x: cx, y: top + 60 };
        // манекен на подставке
        const mb = top + 196, inner = w - 2 * 22;
        s += `<path d="M${cx} ${mb} V${mb + 12}" stroke="${T.wood}" stroke-width="6"/><ellipse cx="${cx}" cy="${mb + 13}" rx="24" ry="6" fill="${T.woodL}" ${SO(2.5)}/>`;
        const first = b.samples[0];
        const mlook = Object.assign({}, T.model, { color: T.mannequin, eyes: 'dots' }, b.key === 'hat' ? { hat: 'tophat' } : (first ? first.look : {}));
        // 26.10: тема может нарисовать манекен сама (лёгкий силуэт вместо человечка стиля - у тяжёлых стилей меньше узлов)
        s += T.mannequinArt ? T.mannequinArt(cx, mb, b.key, mlook) : guy(T.seed + ' манекен ' + b.key, mb, cx, 0.72, 'walk', {}, mlook, 'none');
        // образцы — сетка (столбцов столько, чтобы образцы были крупнее)
        const face = ['eyes', 'mouth', 'blush'].includes(b.key);
        const gy0 = mb + 24, gy1 = bot - 98, gh = gy1 - gy0, n = b.samples.length;
        let best = null;
        for (let cols = 1; cols <= 5; cols++) {
          const rows = Math.ceil(n / cols), cw = inner / cols, ch = gh / rows;
          const sc = b.key === 'hat' ? Math.min(cw / 60, (ch - 6) / 80, 1.2) : face ? Math.min(cw, ch) / 2 - 8 : Math.min(cw / 88, (ch - 4) / 122, 0.95);
          if (!best || sc > best.sc * 1.01) best = { cols, rows, cw, ch, sc };
        }
        const { cols, rows, cw, ch, sc } = best;
        b.samples.forEach((smp, i) => {
          const c = i % cols, r = Math.floor(i / cols), lastRow = r === rows - 1, inRow = lastRow ? n - r * cols : cols;
          const ox = x + 22 + (cols - inRow) * cw / 2;   // неполный последний ряд — по центру
          const sx = ox + cw * (c + 0.5), base = gy0 + ch * (r + 1) - 4, cy = gy0 + ch * (r + 0.5);
          if (face) { const rr = Math.min(sc, 58); s += `<g data-it="${String(smp.pos).replace(/[^\w:.-]/g, '_')}"><g data-ia="1">${cameo(b.key, smp, sx, cy, rr)}</g></g>` + numBadge(sx - rr * 0.78, cy - rr * 0.78, smp.n, 12); }
          else {
            // аура: за образцом — круглый «подиум» контрастного цвета (светлые ауры — на тёмном, тёмная — на светлом), иначе сливается с кабинкой
            if (b.key === 'aura') { const dark = smp.look && smp.look.aura === 'shadow', ar = 50 * sc; const gid = `auPod${dark ? 'L' : 'D'}legion`; s += `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="${dark ? '#f3ecff' : '#140c26'}" stop-opacity=".95"/><stop offset=".7" stop-color="${dark ? '#f3ecff' : '#140c26'}" stop-opacity=".75"/><stop offset="1" stop-color="${dark ? '#f3ecff' : '#140c26'}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${f1(sx)}" cy="${f1(base - 74 * sc)}" rx="${f1(ar * 1.15)}" ry="${f1(ar * 1.4)}" fill="url(#${gid})"/>`; /* 16.10: без золотой обводки — мягкое пятно, чтобы было видно саму ауру */ }
            s += `<ellipse cx="${f1(sx)}" cy="${f1(base)}" rx="${f1(Math.min(cw * 0.36, 26))}" ry="4" fill="#000" opacity=".22"/>` + `<g data-it="${String(smp.pos).replace(/[^\w:.-]/g, '_')}"><g data-ia="1">${sampleArt(b.key, smp, sx, base, sc)}</g></g>`;
            if (b.key === 'hat') s += numBadge(sx - cw / 2 + 11, gy0 + ch * r + 12, smp.n, Math.min(12, ch / 5));
            else s += numBadge(Math.max(x + 16, sx - 40 * sc - 8), base - 112 * sc, smp.n, 12);
          }
          itemPos[smp.pos] = { x: sx, y: cy };
        });
        s += priceTag(cx, bot - 88, { name: 'любой образец', price: b.price, rarity: 'common' }, 'paper', Math.min(156, w - 16));
        return s;
      }
      return function tentSvg(S, itemPos) {
        let s = `<defs><linearGradient id="${T.idp}TShadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
          <linearGradient id="${T.idp}BoothIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.boothIn[0]}"/><stop offset="1" stop-color="${T.boothIn[1]}"/></linearGradient>
          <radialGradient id="${T.idp}Mirror" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#eef8ff"/><stop offset=".6" stop-color="#b9d8f0"/><stop offset="1" stop-color="#7a9ec0"/></radialGradient>
          ${['uncommon', 'rare', 'epic', 'legendary'].map((r) => `<radialGradient id="${T.rarId}${r}"><stop offset="0" stop-color="${RAR_C[r]}" stop-opacity=".85"/><stop offset=".5" stop-color="${RAR_C[r]}" stop-opacity=".35"/><stop offset="1" stop-color="${RAR_C[r]}" stop-opacity="0"/></radialGradient>`).join('')}${T.defs || ''}</defs>`;
        s += T.back();
        // полка амулетов
        const AX0 = 640, AX1 = 1480, SY = 150, AM = S.amulets || [];
        if (AM.length) s += `<rect x="${AX0 + 14}" y="${SY + 18}" width="${AX1 - AX0 - 28}" height="26" fill="url(#${T.idp}TShadow)"/>` + T.shelf(SY, AX0, AX1);
        let tags = '';
        const IX0 = AX0 + 124, step = (AX1 - IX0) / Math.max(1, AM.length);   // слева на полке — табличка
        if (AM.length) s += `<g transform="translate(${AX0 + 60} ${SY - 4})"><path d="M-34 0 V-30 M34 0 V-30" stroke="#5a3d24" stroke-width="5" stroke-linecap="round"/><rect x="-56" y="-64" width="112" height="40" rx="8" fill="#7a5230" stroke="#2a1a0e" stroke-width="3"/><rect x="-50" y="-59" width="100" height="30" rx="5" fill="none" stroke="#ffd76a" stroke-width="1.5" opacity=".7"/><text x="0" y="-38" text-anchor="middle" font-family="Russo One" font-size="17" fill="#ffd76a" stroke="#2a1a0e" stroke-width="3" paint-order="stroke">АМУЛЕТЫ</text></g>`;   // 16.10: табличка «Амулеты» — по названиям не всегда понятно
        AM.forEach((it, i) => {
          const x = IX0 + step * (i + 0.5);
          itemPos[it.id] = { x, y: 92 };
          s += T.stand(x, SY - 6) + `<g data-it="${String(it.id).replace(/[^\w:.-]/g, '_')}">${rarGlow(x, 100, 62, it)}<g data-ia="1">${T.amulet(it, x, 82, 0.95)}</g></g>`;
          if (!it.sale) s += cloche(x, SY - 4) + `<g transform="translate(${f1(x)} ${SY - 50}) rotate(-8)"><rect x="-78" y="-15" width="156" height="30" rx="6" fill="#15122e" opacity=".85"/>${tt(0, 7, 'СКОРО В ПРОДАЖЕ', 15, T.gold)}</g>`;
          tags += priceTag(x, SY + 30, it, 'paper', Math.min(196, step - 30));
        });
        s += tags;
        // вывеска и зеркало за франтом (справа сверху)
        s += T.sign();
        s += `<ellipse cx="1700" cy="380" rx="128" ry="160" fill="${T.gold}" ${SO(5)}/><ellipse cx="1700" cy="380" rx="112" ry="144" fill="url(#${T.idp}Mirror)" ${SO(3)}/>`
          + `<path d="M1630 300 Q1650 260 1690 250 M1622 340 Q1640 300 1666 290" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>`
          + [[1700, 216], [1572, 380], [1828, 380]].map(([px, py]) => `<circle cx="${px}" cy="${py}" r="11" fill="${T.mirrorGem}" ${SO(2.6)}/>`).join('');
        // кабинки (ширина — по числу образцов)
        const B = S.booths || [], WT = { shape: 1.05, color: 1.15, eyes: 0.9, mouth: 0.78, blush: 0.72, hat: 1.95, acc: 1.1, aura: 0.95 };
        const BX0 = 10, BX1 = 1496, GAP = 6, TOP = 300, BOT = 1030;
        const sumW = B.reduce((a, b) => a + (WT[b.key] || 1), 0) || 1, unit = (BX1 - BX0 - GAP * Math.max(0, B.length - 1)) / sumW;
        let bx = BX0;
        B.forEach((b, i) => { const w = unit * (WT[b.key] || 1); s += booth(b, bx, w, TOP, BOT, i, itemPos); bx += w + GAP; });
        // франт за прилавком (справа, над окном вебки)
        s += guy(T.seed + ' франт', 800, 1700, 2.1, 'happy', {}, T.dandy);
        s += T.counter();
        return s;
      };
    }
    const TENT_LG = makeTent({
      seed: 'легион', idp: 'lgT', rarId: 'frRar-', line: W, gold: '#ffc94d', badge: '#ffc94d', badgeText: INK,
      boothIn: ['#2e2550', '#1d1736'], boothEdge: '#5a3d24', cameoBg: '#3a2f66', head: '#d9c7a3', mannequin: '#d9c7a3', wood: '#6b4423', woodL: '#8a5a2b', mirrorGem: '#a3122a',
      curtains: [['#a3122a', '#d8475f'], ['#6a2fc4', '#9a6af0'], ['#d49a1a', '#ffc94d'], ['#2f7f8a', '#5ac4cf'], ['#7a0f1d', '#c0303f'], ['#3a5fc4', '#7aa0ff'], ['#4f8a2f', '#86c45a'], ['#8a3fa0', '#c47ad6']],
      model: { shape: 'bean', color: '#e6e6ee', eyes: 'happy', mouth: 'open', hat: 'none', blush: false },
      face: { x: 60, y: 92, w: 64 },
      dandy: { hat: 'tophat', acc: ['monocle', 'bowtie', 'cape'], shape: 'tall', color: '#b9a2ff' },
      back() {
        const C1 = '#6a2fc4', C2 = '#f1e6c8';
        let s = `<rect width="1920" height="1080" fill="${C1}"/>`;
        for (let i = 0; i < 22; i += 2) { const xa = -400 + (2720 / 22) * i, xb = xa + 2720 / 22; s += `<path d="M960 -260 L${f1(xa)} 1080 L${f1(xb)} 1080 Z" fill="${C2}" opacity=".32"/>`; }
        s += `<rect width="1920" height="1080" fill="url(#lgTVignette)"/>`;
        // фестоны по краю купола и флажки
        for (let x = -40, i = 0; x < 1960; x += 60, i++) s += `<path d="M${x} 0 H${x + 60} V18 L${x + 30} 50 L${x} 18 Z" fill="${i % 2 ? '#ffc94d' : '#a3122a'}" ${O(3)}/>`;
        s += bunting(620, 66, 1490, 66, 40);
        // ковёр
        s += `<rect x="0" y="1034" width="1920" height="46" fill="#5a0a16"/><path d="M0 1034 H1920" stroke="${W}" stroke-width="5"/><path d="M0 1050 H1920" stroke="#ffc94d" stroke-width="3" stroke-dasharray="18 10"/>`;
        // слева сверху (там иногда особые алерты): полка со шляпами и шляпными коробками — неярко
        s += `<g opacity=".8"><path d="M40 252 H560" stroke="#6b4423" stroke-width="10" stroke-linecap="round"/>`
          + [[90, 64, '#a3122a'], [170, 52, '#ffc94d'], [250, 70, '#4ab0ff']].map(([hx, hh, c]) => `<rect x="${hx - 34}" y="${248 - hh}" width="68" height="${hh}" rx="6" fill="${c}" ${O(3)}/><ellipse cx="${hx}" cy="${248 - hh}" rx="36" ry="8" fill="${c}" ${O(3)}/><path d="M${hx - 34} ${248 - hh * 0.5} H${hx + 34}" stroke="#f1e6c8" stroke-width="5"/>`).join('')
          + goods.hat(340, 236, 'laurel') + goods.hat(420, 236, 'beret') + goods.hat(500, 236, 'cowboy') + '</g>';
        return s;
      },
      defs: `<radialGradient id="lgTVignette" cx=".5" cy=".35" r=".85"><stop offset="0" stop-color="#1c1236" stop-opacity=".05"/><stop offset=".7" stop-color="#1c1236" stop-opacity=".45"/><stop offset="1" stop-color="#0e0a1e" stop-opacity=".8"/></radialGradient>`,
      shelf(y, x0, x1) {
        let g = `<rect x="${x0}" y="${y - 6}" width="${x1 - x0}" height="26" rx="8" fill="#7a0f1d" ${O(4)}/><path d="M${x0 + 10} ${y} H${x1 - 10}" stroke="#c0303f" stroke-width="3"/>`;
        for (let x = x0 + 12; x < x1 - 8; x += 14) g += `<path d="M${x} ${y + 20} v10" stroke="#ffc94d" stroke-width="3" stroke-linecap="round"/>`;
        return g;
      },
      stand: (x, y) => `<path d="M${x - 26} ${y} h52 l-6 -12 h-40 Z" fill="#e8e2f0" ${O(3)}/><path d="M${x} ${y - 12} V${y - 92} M${x - 30} ${y - 92} H${x + 30}" stroke="#c9b48a" stroke-width="5" stroke-linecap="round"/>`,
      // амулет: медальон на цепочке, вид — по ауре предмета
      amulet(it, x, y, sc) {
        const au = (it.look && it.look.aura) || 'sparks';
        const P = { sparks: ['#ffc94d', '#fff1a8'], frost: ['#4ab0ff', '#d8f6ff'], shadow: ['#6a2fc4', '#c09aff'] }[au] || ['#ffc94d', '#fff1a8'];
        let g = `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-28 -10 Q0 26 28 -10" fill="none" stroke="#c9b48a" stroke-width="4" stroke-dasharray="5 3"/>`;
        g += `<circle cx="0" cy="30" r="24" fill="${P[0]}" ${O(3.5)}/><circle cx="0" cy="30" r="15" fill="${P[1]}" stroke="${INK}" stroke-width="2"/>`;
        if (au === 'frost') g += [0, 60, 120].map((a) => `<path d="M0 20 V40" transform="rotate(${a} 0 30)" stroke="#2f7ad6" stroke-width="3" stroke-linecap="round"/>`).join('');
        else if (au === 'shadow') g += `<path d="M0 16 C8 24 12 32 8 38 C4 44 -4 44 -8 38 C-11 32 -5 26 -2 20 C-2 26 2 28 0 16 Z" fill="#6a2fc4" stroke="${INK}" stroke-width="1.5"/>`;
        else g += `<circle cx="0" cy="30" r="6" fill="#ffc94d" stroke="${INK}" stroke-width="1.5"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 20 V23" transform="rotate(${a} 0 30)" stroke="#d49a1a" stroke-width="2.5" stroke-linecap="round"/>`).join('');
        // 18.10: без искорок ауры — аура теперь только у легендарных амулетов с босса, в Шатре их нет
        return g + '</g>';
      },
      sign: () => `<path d="M1600 60 V96 M1820 60 V96" stroke="#2a2440" stroke-width="5"/><rect x="1530" y="92" width="360" height="92" rx="16" fill="#3a1f6b" ${O(6)}/><rect x="1542" y="104" width="336" height="68" rx="10" fill="none" stroke="#ffc94d" stroke-width="3"/>`
        + `<text x="1710" y="136" text-anchor="middle" font-family="Russo One" font-size="28" fill="#ffc94d" stroke="${INK}" stroke-width="5" paint-order="stroke" letter-spacing="3">ШАТЁР</text><text x="1710" y="166" text-anchor="middle" font-family="Russo One" font-size="24" fill="#f1e6c8" stroke="${INK}" stroke-width="4" paint-order="stroke" letter-spacing="3">ФРАНТА</text>` + goods.hat(1856, 96, 'tophat'),
      counter: () => `<rect x="1508" y="752" width="412" height="80" fill="#7a0f1d" ${O(5)}/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${1530 + i * 46} 756 Q${1553 + i * 46} 800 ${1530 + i * 46} 828" stroke="#4a0a14" stroke-width="3" fill="none"/>`).join('')
        + `<rect x="1498" y="738" width="432" height="20" rx="6" fill="#ffc94d" ${O(4)}/>`
        + `<path d="M1540 738 q30 -40 70 -6" stroke="#f1e6c8" stroke-width="6" fill="none"/>`
        + `<rect x="1780" y="702" width="56" height="36" rx="5" fill="#4ab0ff" ${O(3)}/><ellipse cx="1808" cy="702" rx="30" ry="7" fill="#4ab0ff" ${O(3)}/><path d="M1780 720 H1836" stroke="#a3122a" stroke-width="5"/>` + goods.hat(1868, 722, 'laurel'),
    });
    const TENT_HELLO = ['Ave, легионер! Заходи, примерочные свободны.', 'О, какой профиль! Проходи, подберём что-нибудь достойное.', 'Входи! Номер образца — в чат, и ты неотразим.'];
    const TENT_LINES = [
      'Выбирай кабинку, пиши номер образца — франт всё устроит.', 'Цилиндр — классика. Даже центурион снимает шлем ради него.', 'Золотая аура идёт абсолютно всем. Но стоит как триумф.',
      'Мода приходит и уходит, а монокль — вечен.', 'Не знаешь, что выбрать? Бантик. Бантик не подведёт.', 'Румянец — скромно, но со вкусом.',
      'Амулеты — на верхней полке. Руками не трогать, только баллами.', 'Шлем легионера — и на параде хорош, и в бою.', 'Плащ: летать не научит, но смотрится героически.',
      'Призракам не продаю — в зеркале их всё равно не видно.', 'Лавровый венок — для тех, кто привык побеждать.', 'Три аксессуара — красиво, четыре — уже ёлка. Лишнее сниму сам.',
      'Все примерочные со шторками. Стесняться нечего!', 'Рим строился не сразу. А новый образ — за минуту.',
    ];
    const TENT_BUY = ['{n}, тебе идёт! Легион аплодирует.', 'Великолепно, {n}! Зеркало аж запотело.', '{i} — отличный выбор, {n}!', '{n}, теперь весь форум обзавидуется.', 'Носи с честью, {n}!'];
    const TENT_FAIL = {
      ghost: ['{n}, призракам примерочная ни к чему — баллы вернул.', 'Сквозь шторку не примеришь, {n}. Баллы обратно.'],
      jail: ['{n}, из-под стражи не примеряют! Баллы вернул.'],
      number: ['{n}, образца «{x}» у меня нет. Баллы вернул — смотри номера на табличках.', 'Хм, «{x}»? Такого не шьём, {n}. Баллы обратно.'],
      worn: ['{n}, это уже на тебе! Баллы вернул.', 'Так ты же уже в этом, {n}! Баллы обратно.'],
      rank: ['{n}, это только для звания «{r}». Баллы вернул.'],
      error: ['Ой, {n}, нитки запутались. Баллы вернул — попробуй ещё.'],
    };

    /* ===== ТОРГОВЫЕ РЯДЫ: лист с товаром, который разворачивается сверху (справа, над окном вебки) =====
       Виджет зовёт rooms.rows.render(stock, H) — H.esc, H.gem (значок баллов), H.eff(effect) → «❤️ +10 · ⚔️ +2 на 1 ч», H.price(n).
       Каждая строка товара — data-item="<id>": туда виджет ставит печать «КУПЛЕНО». Появление и уход — классы .on / .off в css ниже. */
    function rowsItem(it, H, ic) {
      const cls = ['ri', it.effect && it.effect.buff ? 'buff' : '', it.rarity === 'rare' ? 'rare' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}" data-item="${H.esc(it.id)}"><span class="ic">${ic[it.id] || '🍽'}</span><span class="nm">${H.esc(it.name)}</span><span class="ef">${H.esc(H.eff(it.effect))}</span><span class="pr">${H.gem}${H.price(it.price)}</span></div>`;
    }
    const ROWS_IC = { potion_small: '🧪', potion_hp: '⚗️', apple: '🍎', pretzel: '🥨', bread: '🍞', cheese: '🧀', pie: '🥧', ham: '🍖', roast: '🍗', honey_cake: '🥞', sage_tea: '🍵', spicy_stew: '🍲' };
    // Легион: свиток на деревянных скалках разворачивается вниз
    function rowsRender(S, H) {
      return `<div class="rod"></div><div class="paper"><div class="in"><div class="hd">ТОРГОВЫЕ РЯДЫ</div><div class="sub">покупай за баллы канала</div>`
        + `<div class="sec">⚗ Зелья</div>${(S.potions || []).map((it) => rowsItem(it, H, ROWS_IC)).join('')}`
        + `<div class="sec">🍖 Снедь</div>${(S.food || []).map((it) => rowsItem(it, H, ROWS_IC)).join('')}`
        + `<div class="ft">съесть · выпить — из сумки</div><div class="seal">L</div></div></div><div class="rod bot"></div>`;
    }
    const ROWS_CSS = `
.fr-sheet.lgs{left:1588px;top:0;width:300px;transform-origin:50% 0}
.lgs .rod{position:relative;height:22px;margin:0 -16px;border-radius:11px;background:linear-gradient(#a0703a,#6b4423 60%,#3a2614);border:3px solid #f5f2ff;box-shadow:0 4px 10px rgba(0,0,0,.5);z-index:2}
.lgs .rod::before,.lgs .rod::after{content:'';position:absolute;top:-4px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe9a8,#ffc94d 45%,#a0701a);border:3px solid #f5f2ff}
.lgs .rod::before{left:-20px}.lgs .rod::after{right:-20px}
.lgs .paper{overflow:hidden;max-height:0;margin:-4px 0;background:linear-gradient(90deg,#d9c49a,#f1e6c8 7%,#f7eed8 50%,#f1e6c8 93%,#d9c49a);box-shadow:0 10px 24px rgba(0,0,0,.45)}
.lgs .in{position:relative;padding:12px 16px 14px;color:#3a2614;font-family:'Golos Text',sans-serif}
.lgs .hd{font:24px 'Russo One',sans-serif;color:#a3122a;text-align:center;letter-spacing:2px}
.lgs .sub{text-align:center;font-size:13px;color:#7a5a3a;margin:-2px 0 4px}
.lgs .sec{font:14px 'Russo One',sans-serif;color:#6a2fc4;border-bottom:2px solid #c9b48a;margin:8px 0 3px;padding-bottom:2px}
.lgs .ri{display:grid;grid-template-columns:30px 1fr auto;grid-template-rows:auto auto;column-gap:6px;align-items:center;padding:3px 4px;border-radius:8px}
.lgs .ic{grid-row:span 2;font-size:22px;text-align:center}
.lgs .nm{font:16px/1.1 'Russo One',sans-serif;color:#2a1a0e}
.lgs .ef{grid-column:2;font-size:12px;color:#5a4a3a}
.lgs .pr{grid-row:1/span 2;grid-column:3;font:16px 'Russo One',sans-serif;color:#7a0f1d;white-space:nowrap}
.lgs .ri.buff .ef{color:#a3122a;font-weight:600}
.lgs .ri.rare .nm{color:#2f6fc4}
.lgs .ft{text-align:center;font-size:12px;color:#7a5a3a;margin-top:8px;border-top:2px solid #c9b48a;padding-top:5px}
.lgs .seal{position:absolute;right:10px;bottom:6px;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#e8455c,#a3122a 60%,#6a0a14);color:#ffd0d0;font:18px/34px 'Russo One',sans-serif;text-align:center;transform:rotate(-12deg);box-shadow:0 2px 4px rgba(0,0,0,.4)}
.fr-sheet.lgs.on{animation:lgDrop .35s ease-out}
.fr-sheet.lgs.on .paper{animation:lgOpen 1.3s .3s cubic-bezier(.3,.7,.3,1) forwards}
.fr-sheet.lgs.off .paper{max-height:820px;animation:lgClose .8s ease-in forwards}
.fr-sheet.lgs.off{animation:lgUp .45s .75s ease-in forwards}
@keyframes lgDrop{from{transform:translateY(-60px)}to{transform:none}}
@keyframes lgOpen{from{max-height:0}to{max-height:820px}}
@keyframes lgClose{from{max-height:820px}to{max-height:0}}
@keyframes lgUp{to{transform:translateY(-90px);opacity:0}}`;
    const ROOMS = {
      forge: { title: 'Кузня', icon: '⚒', bg: 'radial-gradient(ellipse at 50% 85%, #ff9a3d 0%, #7a2d14 38%, #1d1220 78%)', note: 'Оружие, щиты и доспехи' },
      tent: { title: 'Шатёр франта', icon: '🎩', bg: 'radial-gradient(ellipse at 50% 70%, #ffe2a0 0%, #8b4fd0 42%, #1c1236 82%)', note: 'Шляпы, плащи, амулеты с аурами' },
      rows: { title: 'Торговые ряды', icon: '🧺', bg: 'radial-gradient(ellipse at 50% 80%, #ffd27a 0%, #6b4423 40%, #17122a 80%)', note: 'Зелья и еда — лечат раны' },
    };

      return {
        width: WIDE, height: 1080,
        views: VIEW_X,
        // рисунок сцены (без неба: небо — подложка .fr-skybg и 4 слоя мерцающих звёзд skyStars, их заполняет scene())
        scene: (o) => CSS + K.doc(() => variantC3(o)),   // 25.10: <defs> символов набора — в самой сцене   // 23.10: o.magic / o.magicName — башня звездочёта
        skyStars: SKY_STARS,
        props: PROPS, obstacles: OBST, area: AREA, doors: DOORS, magic: MAGIC_L,
        scale: { min: 0.46, range: 0.3 },                 // размер человечка: min у верхнего края area, min+range у нижнего
        gate: { x0: 900, x1: 1020, y0: 720, y1: 760 },   // откуда приходят новые зрители (ворота)
        exit: { x0: 860, x1: 1060, y0: 740, y1: 790 },   // где появляется толпа, выйдя из Кузни / Шатра
        colors: COLORS, spots: SPOTS,
        // HW: «Ночь Тыквенной Луны» — рамка портала (римская арка из камня, щиты с тыквой, тыква-замковый камень) и приметы стиля на Ярмарке.
        // Рисует modules/fair/client/portal.js: frame(state) — поверх воронки (state: sleep | open | gone), decor() — поверх общего убранства
        hw: {
          portal: { x: 760, y: 790, s: 0.74 },
          frame: (state) => {
            const st = 'stroke="#15122e" stroke-width="4" stroke-linejoin="round"';
            let s = `<path d="M-128 0 V-210 Q-128 -372 0 -384 Q128 -372 128 -210 V0 H96 V-210 Q96 -340 0 -350 Q-96 -340 -96 -210 V0 Z" fill="#9a96a6" ${st}/>`;
            for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10, x = Math.cos(a) * 112, y = -210 - Math.sin(a) * 160; s += `<path d="M${(Math.cos(a) * 96).toFixed(1)} ${(-210 - Math.sin(a) * 140).toFixed(1)} L${(Math.cos(a) * 128).toFixed(1)} ${(-210 - Math.sin(a) * 174).toFixed(1)}" stroke="#6a6680" stroke-width="3"/>`; }
            for (const sd of [-1, 1]) s += `<g transform="translate(${sd * 112} -120)"><path d="M-22 -34 H22 V20 Q0 40 -22 20 Z" fill="#a3122a" ${st}/><circle cx="0" cy="-6" r="12" fill="#ff7a1a" stroke="#15122e" stroke-width="2.4"/><path d="M-5 -9 l3 -4 l3 4 z M2 -9 l3 -4 l3 4 z" fill="#15122e"/></g>`;
            s += `<path d="M-30 -372 H30 L22 -334 H-22 Z" fill="#b8b4c4" ${st}/><ellipse cx="0" cy="-352" rx="28.6" ry="22.0" fill="#ff7a1a" stroke="#15122e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M-15.4 -356.4 l6.6 -8.8 l6.6 8.8 z M2.2 -356.4 l6.6 -8.8 l6.6 8.8 z M-15.4 -345.4 q15.4 9.9 30.8 0" fill="#ffd34d" stroke="#15122e" stroke-width="1.6"/>`;
            if (state === 'open') s += `<path d="M-150 0 h300" stroke="#15122e" stroke-width="10" stroke-linecap="round"/><path d="M-150 0 h300" stroke="#6dffb0" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
            return s;
          },
          decor: () => {
            const st = 'stroke="#15122e" stroke-width="3" stroke-linejoin="round"';
            let s = '';
            // щиты с тыквой на стене между башнями и над Рядами
            for (const x of [1150, 2230, 2930, 3330]) s += `<g transform="translate(${x} 420)"><path d="M-30 -40 H30 V30 Q0 56 -30 30 Z" fill="#a3122a" ${st}/><path d="M-30 -40 H30" stroke="#ffc94d" stroke-width="5"/><ellipse cx="0" cy="-4" rx="23.4" ry="18.0" fill="#ff7a1a" stroke="#15122e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M-12.6 -7.6 l5.4 -7.2 l5.4 7.2 z M1.8 -7.6 l5.4 -7.2 l5.4 7.2 z M-12.6 1.4000000000000004 q12.6 8.1 25.2 0" fill="#ffd34d" stroke="#15122e" stroke-width="1.6"/></g>`;
            // штандарт Легиона с тыквой у ворот
            for (const x of [840, 1080]) s += `<path d="M${x} 330 V470" stroke="#15122e" stroke-width="8" stroke-linecap="round"/><path d="M${x - 34} 336 H${x + 34} V430 L${x} 452 L${x - 34} 430 Z" fill="#2a1f38" ${st}/><path d="M${x - 34} 346 H${x + 34}" stroke="#ff7a1a" stroke-width="5"/><circle cx="${x}" cy="396" r="18" fill="#ff7a1a" stroke="#15122e" stroke-width="2.6"/><path d="M${x - 8} 392 l4 -6 l4 6 z M${x + 1} 392 l4 -6 l4 6 z M${x - 9} 402 q9 6 18 0" fill="#ffd34d" stroke="#15122e" stroke-width="1.4"/>`;
            // тыква на коньке Кузни
            s += `<g transform="translate(460 286)"><ellipse cx="0" cy="0" rx="33.8" ry="26.0" fill="#ff7a1a" stroke="#15122e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M-18.2 -5.2 l7.8 -10.4 l7.8 10.4 z M2.6 -5.2 l7.8 -10.4 l7.8 10.4 z M-18.2 7.8 q18.2 11.7 36.4 0" fill="#ffd34d" stroke="#15122e" stroke-width="1.6"/></g>`;
            return s;
          },
        },
        labels: { forge: 'Кузня', tent: 'Шатёр франта', rows: 'Торговые ряды', leave: 'Покинуть ярмарку' },   // названия мест в опросе
        texts: { pollTitle: 'Куда идём?', pollFoot: 'Пиши цифру в чат! · голосов:', ghostsNote: '👻 призраки не голосуют', leaving: 'Покидаем ярмарку!', going: (label) => `Идём: ${label}!`, noVotes: 'Никто не проголосовал' },
        sky: { at: SKY_AT, w: SKY_W, colors: { title: '#ffe39a', name: '#f4f1ff', sum: '#ffe39a' } },
        alertBox: AL,
        smith: SMITH, anvil: ANVIL,
        fx: { well: { x: 990, y: 884 } },                 // откуда летят монетки по слову «колодец»
        guard: { look: { hat: 'legion', shape: 'box', color: '#c9c4dc' }, extra: { armed: true, gear: { w: 'spear', wr: 'common', s: 'scutum', sr: 'common' } } },   // стражники
        rooms: Object.assign(ROOMS, { forge: Object.assign(ROOMS.forge, { artBg: '#1d1626', svg: FORGE_LG, hello: FORGE_HELLO, lines: FORGE_LINES, buy: BUY_LINES, fail: FAIL_LINES }), tent: Object.assign(ROOMS.tent, { artBg: '#3a1f6b', svg: TENT_LG, hello: TENT_HELLO, lines: TENT_LINES, buy: TENT_BUY, fail: TENT_FAIL }) , rows: Object.assign(ROOMS.rows, { render: rowsRender, cls: 'lgs' }) }),
        css: ROWS_CSS,                                          // свои CSS-правила поверх modules/fair/client/widget.css (необязательно)
        // 26.10 (art/styles-rest): кирпичики интерьеров для стилей без своей площади (MDDoodle.fairRooms) - на вид Легиона не влияют
        kit: { makeForge, makeTent, priceTag, rarGlow, itemArt, goods, guy, bunting, rowsItem, gem, esc, f1, RAR_C, K, O, W, INK, shelf },
      };
  });
  /* 26.10 (art/styles-rest): стиль без своей площади Ярмарки отдаёт только интерьеры (Кузня, Шатёр, лист Торговых рядов) -
     площадь, предметы, двери, места и магическая лавка берутся у «Легиона». В styles/<стиль>/fair.js:
       MDDoodle.fairRooms('<стиль>', (env, kit, base) => ({ rooms: { forge: {…}, tent: {…}, rows: {…} }, css: '…' }));
     kit - кирпичики Легиона (makeForge, makeTent, priceTag, itemArt, guy, rowsItem, goods…), base - Ярмарка Легиона.
     Каждое поле rooms.<место> накладывается поверх места Легиона: чего стиль не дал - останется легионским. */
  window.MDDoodle.fairRooms = function (style, make) {
    const D = window.MDDoodle;
    D.addLocation(style, 'fair', function (env) {
      const base = D.drawLocation('legion', 'fair', env);
      const own = make(env || {}, base.kit, base) || {}, R = own.rooms || {}, rooms = {};
      for (const k of Object.keys(base.rooms)) rooms[k] = Object.assign({}, base.rooms[k], R[k] || {});
      for (const k of Object.keys(R)) if (!rooms[k]) rooms[k] = R[k];
      return Object.assign({}, base, { rooms, css: (base.css || '') + (own.css || ''), kit: undefined });
    });
  };
})();

} catch (e) { console.error('[стили] styles/legion/fair.js не загрузился:', e); }
