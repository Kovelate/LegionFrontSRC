/* 26.10 (art/mine-gear): снаряжение шахты - рисунки. Стиль - как у значков руды (ore-art.js): мультяшно, плоские тона со светлой
   гранью, жирный тёмный контур, читается на 48-64 px. Без анимаций и фильтров.
   window.LGPickArt:
     icon(lv)  - значок кирки 64×64 для окна торговца (lv: 0 деревянная, 1 медная, 2 железная, 3 стальная, 4 золотая, 5 адамантитовая);
     held(lv)  - кирка в лапе копателя: те же оси, что у символа #mna-pick в mine-art.js (начало - кисть, черенок вверх под −100°,
                 клюв вперёд) - встаёт на то же место, того же размера и с тем же поворотом;
     oreBag()  - значок рудной сумки 64×64 (кожаный мешок с рудой и самоцветом);
     ach(id)   - значок достижения шахты РМ-24…35: рисунок для круглой медали (вписан в круг, без фона - фон и рамку по редкости
                 рисует страница достижений), viewBox 0 0 64 64; ACH - список { id: [название, эмодзи-запас] };
     LV        - уровни кирок: [{ name, head, ... }]. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LGPickArt = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const INK = '#1d1520';
  const f1 = (v) => +(+v).toFixed(1);
  const O = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const hx = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const tone = (c, k) => '#' + hx(c).map((v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))).toString(16).padStart(2, '0')).join('');
  const P = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';
  const star = (x, y, k = 1, c = '#ffffff') => `<path d="M${f1(x)} ${f1(y - 6 * k)}Q${f1(x + k)} ${f1(y - k)} ${f1(x + 6 * k)} ${f1(y)}Q${f1(x + k)} ${f1(y + k)} ${f1(x)} ${f1(y + 6 * k)}Q${f1(x - k)} ${f1(y + k)} ${f1(x - 6 * k)} ${f1(y)}Q${f1(x - k)} ${f1(y - k)} ${f1(x)} ${f1(y - 6 * k)}Z" fill="${c}"/>`;
  let N = 0;
  const uid = (p) => p + (++N);

  /* ---------- кирки: уровни ---------- */
  // head - головка (основной, светлая плоскость, тёмный низ), handle - черенок, grip - обмотка у кисти, glow / spark - свечение и искры
  const LV = [
    { name: 'Деревянная кирка', head: ['#a0703a', '#d0a060', '#6b4423'], handle: ['#b8864e', '#e0b47a'], grip: '#6b4423', grain: true },
    { name: 'Медная кирка', head: ['#d8803a', '#ffc08a', '#8a4a1e'], handle: ['#9a6636', '#c99560'], grip: '#5a3a1a' },
    { name: 'Железная кирка', head: ['#6f7888', '#c8d0da', '#4a5260'], handle: ['#9a6636', '#c99560'], grip: '#3a2a1a' },
    { name: 'Стальная кирка', head: ['#8aa2c0', '#e8f2ff', '#4a6080'], handle: ['#6b4423', '#9a6636'], grip: '#2a3a5a', wrap: true },
    { name: 'Золотая кирка', head: ['#ffcf3a', '#fff0a0', '#c07a10'], handle: ['#5a3a22', '#8a5a32'], grip: '#a3122a', wrap: true, shine: true },
    { name: 'Адамантитовая кирка', head: ['#7a8cff', '#d8e0ff', '#3a3aa8'], handle: ['#2a2440', '#4a4266'], grip: '#9fe8ff', wrap: true, shine: true, glow: '#8fd8ff' },
  ];
  const lvOf = (lv) => LV[Math.max(0, Math.min(LV.length - 1, Math.floor(+lv || 0)))];

  /* в лапе: оси кисти (как PICK_SVG в mine-art.js): u - вдоль черенка к головке (−100°), n - вперёд */
  const PK_U = [Math.cos((-100 * Math.PI) / 180), Math.sin((-100 * Math.PI) / 180)], PK_N = [-PK_U[1], PK_U[0]];
  const pk = (a, b) => [PK_U[0] * a + PK_N[0] * b, PK_U[1] * a + PK_N[1] * b], pp = (p) => `${f1(p[0])} ${f1(p[1])}`;
  /** Кирка уровня lv в лапе: рисунок в осях кисти (вставлять туда же, куда <use href="#mna-pick">). */
  function held(lv) {
    const L = lvOf(lv), [h0, h1, h2] = L.head, B = pk(46, -23), F = pk(45, 31), top = pk(66, 2), bot = pk(52, 2), mid = pk(60, 2), hd = `M${pp(pk(-11, 0))} L${pp(pk(56, 0))}`, g = uid('pkh');
    let s = '';
    if (L.glow) s += `<defs><radialGradient id="${g}"><stop offset="0" stop-color="${L.glow}" stop-opacity=".7"/><stop offset="1" stop-color="${L.glow}" stop-opacity="0"/></radialGradient></defs><circle cx="${f1(pk(56, 4)[0])}" cy="${f1(pk(56, 4)[1])}" r="34" fill="url(#${g})"/>`;
    s += `<path d="${hd}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="${hd}" stroke="${L.handle[0]}" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M${pp(pk(-8, -1.2))} L${pp(pk(50, -1.2))}" stroke="${L.handle[1]}" stroke-width="1.6" stroke-linecap="round"/>`;
    s += L.wrap ? [0, 4, 8, 12, 16].map((a) => `<path d="M${pp(pk(a, -3.4))} L${pp(pk(a + 2.5, 3.4))}" stroke="${L.grip}" stroke-width="2.4" stroke-linecap="round"/>`).join('')
      : `<path d="M${pp(pk(7, -3.2))} L${pp(pk(7, 3.2))} M${pp(pk(12, -3.2))} L${pp(pk(12, 3.2))}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
    s += `<path d="M${pp(B)} Q${pp(top)} ${pp(F)} Q${pp(bot)} ${pp(B)} Z" fill="${h0}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M${pp(pk(48, -19))} Q${pp(pk(63.5, 2))} ${pp(pk(47.5, 27))} Q${pp(mid)} ${pp(pk(48, -19))} Z" fill="${h1}"/>`
      + `<path d="M${pp(pk(56, 2))} Q${pp(pk(58.5, 14))} ${pp(pk(51, 24))}" stroke="#ffffff" stroke-width="${L.shine ? 2.4 : 1.8}" fill="none" stroke-linecap="round"/>`;
    if (L.grain) s += `<path d="M${pp(pk(50, -12))} Q${pp(pk(54, 0))} ${pp(pk(50, 14))}" stroke="${h2}" stroke-width="1.6" fill="none" opacity=".8"/>`;
    s += `<rect x="-5" y="-5" width="10" height="10" rx="2" transform="translate(${pp(pk(55, 0))}) rotate(-10)" fill="${h2}" stroke="${INK}" stroke-width="1.8"/>`;
    if (L.shine) s += star(pk(60, 20)[0], pk(60, 20)[1], 0.8);
    if (L.glow) s += star(pk(70, -16)[0], pk(70, -16)[1], 0.7, '#dff6ff') + star(pk(40, 36)[0], pk(40, 36)[1], 0.55, '#dff6ff') + `<circle cx="${f1(pk(74, 10)[0])}" cy="${f1(pk(74, 10)[1])}" r="1.8" fill="#dff6ff"/>`;
    return s;
  }

  /* ---------- значок кирки 64×64 ---------- */
  function pickIcon(L, g) {
    // черенок по диагонали из левого низа в правый верх; головка - серп поперёк, клюв вниз-вправо
    let s = '';
    const gc = L.glow || (L.shine ? '#ffd84a' : '');   // свечение: у адамантитовой - голубое, у золотой - тёплое
    if (gc) s += `<defs><radialGradient id="${g}"><stop offset="0" stop-color="${gc}" stop-opacity="${L.glow ? 0.75 : 0.45}"/><stop offset="1" stop-color="${gc}" stop-opacity="0"/></radialGradient></defs><circle cx="36" cy="26" r="28" fill="url(#${g})"/>`;
    s += `<path d="M12 56 L46 20" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M12 56 L46 20" stroke="${L.handle[0]}" stroke-width="5.6" stroke-linecap="round"/><path d="M14 52 L44 20" stroke="${L.handle[1]}" stroke-width="1.8" stroke-linecap="round"/>`;
    s += L.wrap ? [0, 1, 2, 3].map((i) => { const x = 15 + i * 3.4, y = 52 - i * 3.6; return `<path d="M${f1(x - 3)} ${f1(y - 3)} L${f1(x + 3)} ${f1(y + 3)}" stroke="${L.grip}" stroke-width="2.8" stroke-linecap="round"/>`; }).join('') : `<path d="M16 48 l4 4 M19 45 l4 4" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
    const [h0, h1, h2] = L.head;
    const head = 'M14 18 Q36 2 58 34 Q56 37 52 36 Q38 18 18 22 Q14 22 14 18Z';
    s += `<path d="${head}" fill="${h0}" ${O(3.2)}/><path d="M17 18.5 Q36 6 55 31 Q45 17 18 20Z" fill="${h1}"/><path d="M22 23 Q40 22 52 36" stroke="${h2}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    if (L.grain) s += `<path d="M26 14 q8 -2 14 2 M34 14 q6 0 10 6" stroke="${h2}" stroke-width="1.6" fill="none" opacity=".7"/>`;
    s += `<rect x="40" y="15" width="11" height="11" rx="2" transform="rotate(42 45.5 20.5)" fill="${h2}" ${O(2.4)}/><path d="${head}" fill="none" ${O(3.2)}/>`;
    s += `<path d="M30 9.5 Q42 9 51 20" stroke="#ffffff" stroke-width="${L.shine ? 2.6 : 1.8}" fill="none" stroke-linecap="round" opacity="${L.shine ? 1 : 0.8}"/>`;
    if (L.shine) s += star(52, 10, 1) + star(10, 22, 0.6);
    if (L.glow) s += star(58, 46, 0.7, '#dff6ff') + star(26, 6, 0.6, '#dff6ff') + `<circle cx="8" cy="34" r="1.8" fill="#dff6ff"/><circle cx="60" cy="16" r="1.6" fill="#dff6ff"/>`;
    return s;
  }
  const box64 = (body, size = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${body}</svg>`;
  /** Значок кирки уровня lv для окна торговца. size - размер в px (по умолчанию 64). */
  const icon = (lv, size = 64) => box64(pickIcon(lvOf(lv), uid('pki')), size);

  /* ---------- рудная сумка ---------- */
  function bagBody() {
    const g = uid('bg');
    return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".4" stop-color="#3a7aff"/><stop offset="1" stop-color="#1a3aa8"/></linearGradient></defs>`
      + `<ellipse cx="32" cy="60" rx="22" ry="3.4" fill="#000" opacity=".3"/>`
      // руда в горловине: уголь, железо, золото, самоцвет
      + `<path d="M14 22 L18 12 26 10 28 20Z" fill="#2c2b34" ${O(2.6)}/><path d="M18 12 L26 10 24 15Z" fill="#6a6e88"/>`
      + `<path d="M36 20 L38 10 48 9 50 19Z" fill="#c8643a" ${O(2.6)}/><path d="M38 10 L48 9 44 13Z" fill="#f0965e"/>`
      + `<path d="M24 18 L28 8 36 7 38 17Z" fill="#ffcf3a" ${O(2.6)}/><path d="M28 8 L36 7 33 12Z" fill="#fff0a0"/>`
      + `<path d="M30 4 L38 -2 46 4 38 16Z" transform="translate(0 4)" fill="url(#${g})" ${O(2.6)}/><path d="M30 8 H46 M38 2 L38 20" stroke="#fff" stroke-width="1.2" opacity=".6" transform="translate(0 0)"/>`
      // мешок
      + `<path d="M12 24 Q6 44 12 54 Q32 62 52 54 Q58 44 52 24 Q32 18 12 24Z" fill="#a8743f" ${O(3.4)}/><path d="M14 27 Q10 42 14 50 Q20 54 22 48 Q18 38 22 28 Q18 26 14 27Z" fill="#c8945a"/><path d="M44 30 Q50 42 46 52 Q50 52 52 50 Q55 40 50 28Z" fill="#7a4e26"/>`
      + `<path d="M22 40 l3 4 M40 44 l-3 4 M30 50 h4" stroke="#7a4e26" stroke-width="2" stroke-linecap="round"/>`
      // горловина и верёвка с узлом
      + `<path d="M12 24 Q32 18 52 24 Q50 30 32 30 Q14 30 12 24Z" fill="#8a5a2e" ${O(3)}/><path d="M14 28 Q32 34 50 28" stroke="#e8c88a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M14 28 Q32 34 50 28" stroke="${INK}" stroke-width="1.2" fill="none" stroke-dasharray="3 4"/>`
      + `<circle cx="46" cy="32" r="3.4" fill="#e8c88a" ${O(2)}/><path d="M46 35 q-2 8 -6 10 M46 35 q3 7 2 11" stroke="${INK}" stroke-width="4.4" fill="none" stroke-linecap="round"/><path d="M46 35 q-2 8 -6 10 M46 35 q3 7 2 11" stroke="#e8c88a" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      + star(52, 8, 0.8);
  }
  const oreBag = (size = 64) => box64(bagBody(), size);

  /* ---------- значки достижений шахты РМ-24…35: рисунок для круглой медали (вписан в круг r ≈ 26, центр 32 32) ---------- */
  const ACH = { 'РМ-24': ['Крошка к крошке', '🪨'], 'РМ-25': ['Окаменевшая находка', '🗿'], 'РМ-26': ['Честная сделка', '🤝'], 'РМ-27': ['Благодетель Ратуши', '🏛️'],
    'РМ-28': ['Новая кирка', '⛏️'], 'РМ-29': ['Свой мешок', '💰'], 'РМ-30': ['Дно не видно', '🕳️'], 'РМ-31': ['Плечом к плечу', '👥'], 'РМ-32': ['Ночная смена', '🌙'],
    'РМ-33': ['Полная смена', '⏳'], 'РМ-34': ['Коллекционер руды', '🧺'], 'РМ-35': ['Огранщик', '💎'] };
  const helmet = (x, y, k = 1, c = '#ffcf3a') => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-16 0 Q-16 -18 0 -18 Q16 -18 16 0Z" fill="${c}" ${O(2.8)}/><path d="M-10 -4 Q-10 -14 0 -15 Q-6 -12 -6 -4Z" fill="#fff0a0"/><rect x="-20" y="-2" width="40" height="6" rx="3" fill="${tone(c, -0.25)}" ${O(2.4)}/><circle cy="-10" r="4.6" fill="#fff6c0" ${O(2)}/></g>`;
  const nugget = (x, y, r, c) => `<path d="${P([[x - r, y + r * 0.3], [x - r * 0.6, y - r * 0.8], [x + r * 0.3, y - r], [x + r, y - r * 0.2], [x + r * 0.6, y + r * 0.7], [x - r * 0.3, y + r * 0.8]])}" fill="${c}" ${O(2.4)}/><path d="${P([[x - r, y + r * 0.3], [x - r * 0.6, y - r * 0.8], [x + r * 0.3, y - r], [x, y - r * 0.2]])}" fill="${tone(c, 0.4)}"/>`;
  const coin = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffcf3a" ${O(2.6)}/><circle cx="${x}" cy="${y}" r="${f1(r * 0.62)}" fill="none" stroke="#c07a10" stroke-width="1.8"/><path d="M${f1(x - r * 0.5)} ${f1(y - r * 0.35)} a${f1(r * 0.6)} ${f1(r * 0.6)} 0 0 1 ${f1(r * 0.5)} ${f1(-r * 0.35)}" stroke="#fff6c0" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  function achBody(id) {
    switch (id) {
      case 'РМ-24': {   // Крошка к крошке — осколки слетаются в целый самородок
        let s = nugget(36, 36, 15, '#d8b48a') + `<path d="M30 30 l6 -3" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
        for (const [x, y, r] of [[12, 22, 5], [10, 40, 4.4], [20, 54, 3.8], [52, 14, 4], [22, 10, 3.4]]) s += `<path d="${P([[x - r, y + 1], [x - r * 0.4, y - r], [x + r, y - r * 0.3], [x + r * 0.5, y + r]])}" fill="#b0a596" ${O(2)}/>`;
        return s + `<path d="M19 25 l6 4 M17 40 l6 -1 M25 49 l4 -4" stroke="#ffe27a" stroke-width="2.4" stroke-linecap="round"/>` + star(48, 26, 0.7);
      }
      case 'РМ-25':   // Окаменевшая находка — сундук, выглядывающий из камня
        return `<path d="${P([[8, 50], [10, 28], [22, 14], [42, 12], [56, 26], [56, 50]])}" fill="#8a8494" ${O(3)}/><path d="${P([[10, 28], [22, 14], [42, 12], [56, 26], [40, 22], [20, 24]])}" fill="#aaa4b6"/>`
          + `<rect x="18" y="32" width="28" height="18" rx="2" fill="#a0602a" ${O(2.6)}/><path d="M18 32 Q32 22 46 32Z" fill="#c07a34" ${O(2.6)}/><rect x="29" y="30" width="6" height="8" rx="1" fill="#ffcf3a" ${O(1.8)}/><path d="M18 40 H46" stroke="#6a3a18" stroke-width="2"/>`
          + `<path d="M8 50 L14 44 M56 40 L50 36 M24 52 l2 -6" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` + star(50, 12, 0.9, '#fff6c0');
      case 'РМ-26':   // Честная сделка — весы: руда и монета в равновесии
        return `<path d="M32 12 V50 M20 52 H44" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M32 12 V50 M20 52 H44" stroke="#c9a35a" stroke-width="3" stroke-linecap="round"/><path d="M12 20 H52" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M12 20 H52" stroke="#e8c070" stroke-width="2.4" stroke-linecap="round"/>`
          + `<path d="M12 20 L6 36 H18Z M52 20 L46 36 H58Z" fill="none" stroke="${INK}" stroke-width="1.4"/><path d="M4 36 Q12 42 20 36Z M44 36 Q52 42 60 36Z" fill="#c9a35a" ${O(2.2)}/>`
          + nugget(12, 32, 5, '#8a8076') + coin(52, 31, 5) + `<circle cx="32" cy="12" r="3.6" fill="#e8c070" ${O(2)}/>`;
      case 'РМ-27':   // Благодетель Ратуши — ратуша с часами и сердце-монета
        return `<path d="M10 54 V32 H54 V54Z" fill="#ead9b8" ${O(2.8)}/><path d="M6 33 L32 17 58 33Z" fill="#a3122a" ${O(2.8)}/><rect x="26" y="10" width="12" height="12" fill="#8b8796" ${O(2.4)}/><path d="M24 12 L32 4 40 12Z" fill="#a3122a" ${O(2)}/>`
          + [16, 26, 38, 48].map((x) => `<rect x="${x - 2}" y="36" width="4" height="18" fill="#fff8e6" stroke="${INK}" stroke-width="1.4"/>`).join('') + `<circle cx="32" cy="27" r="4.4" fill="#fff8e6" ${O(1.8)}/>`
          + `<path d="M44 46 c0 -6 8 -6 8 0 c0 -6 8 -6 8 0 c0 6 -8 10 -8 12 c0 -2 -8 -6 -8 -12Z" fill="#ff5a6e" ${O(2.2)}/>`;
      case 'РМ-28':   // Новая кирка — кирка с бликом и бантиком «новое»
        return pickIcon(LV[3], uid('ach')) + `<path d="M50 44 q-6 -6 0 -10 q6 4 0 10 q6 -6 10 0 q-4 6 -10 0Z" fill="#ff5a6e" ${O(2)}/><circle cx="50" cy="44" r="2.4" fill="#ff8fa3" ${O(1.4)}/>`;
      case 'РМ-29':   // Свой мешок — рудная сумка
        return `<g transform="translate(4 6) scale(.88)">${bagBody()}</g>`;
      case 'РМ-30':   // Дно не видно — уходящий в темноту ствол с лестницей
        return `<ellipse cx="32" cy="20" rx="24" ry="10" fill="#6a5a4a" ${O(2.8)}/><path d="M8 20 V48 Q32 64 56 48 V20 Q32 30 8 20Z" fill="#14101c" ${O(2.8)}/><ellipse cx="32" cy="20" rx="18" ry="6.4" fill="#0a0810"/>`
          + `<path d="M26 18 L24 54 M38 18 L40 54" stroke="#a0703a" stroke-width="3"/>` + [24, 32, 40, 48].map((y) => `<path d="M${f1(25 - (y - 18) * 0.05)} ${y} H${f1(39 + (y - 18) * 0.05)}" stroke="#a0703a" stroke-width="2.6"/>`).join('')
          + `<path d="M50 34 v14 m-5 -5 l5 6 5 -6" stroke="#ffe27a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      case 'РМ-31':   // Плечом к плечу — две каски рядом и скрещённые кирки
        return `<path d="M14 54 L48 14 M50 54 L16 14" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M14 54 L48 14 M50 54 L16 14" stroke="#9a6636" stroke-width="3.6" stroke-linecap="round"/>`
          + `<path d="M40 8 Q52 10 56 20 Q50 14 42 14Z M24 8 Q12 10 8 20 Q14 14 22 14Z" fill="#c8d0da" ${O(2.4)}/>` + helmet(21, 46, 0.72, '#ffcf3a') + helmet(43, 46, 0.72, '#ff8a5c');
      case 'РМ-32':   // Ночная смена — каска с горящим фонарём и месяц
        return `<path d="M44 6 a12 12 0 1 0 12 16 a9 9 0 1 1 -12 -16Z" fill="#fff3c8" ${O(2.4)}/><path d="M22 30 L6 52 H38Z" fill="#ffe27a" opacity=".35"/>` + helmet(30, 44, 1.15, '#ffcf3a')
          + star(14, 12, 0.6) + star(28, 6, 0.45);
      case 'РМ-33':   // Полная смена — песочные часы и кирка
        return `<path d="M18 8 H46 M18 56 H46" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M18 8 H46 M18 56 H46" stroke="#a0703a" stroke-width="3.6" stroke-linecap="round"/>`
          + `<path d="M22 10 Q22 26 32 32 Q22 38 22 54 H42 Q42 38 32 32 Q42 26 42 10Z" fill="#dff4ff" ${O(2.6)}/><path d="M24 54 Q26 44 32 40 Q38 44 40 54Z" fill="#e8b84a"/><path d="M30 33 H34 L32 40Z" fill="#e8b84a"/><path d="M26 14 Q26 22 30 26" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`
          + `<g transform="translate(36 30) scale(.5)">${pickIcon(LV[2], uid('ach'))}</g>`;
      case 'РМ-34': {   // Коллекционер руды — ящик-витрина с ячейками руды
        const C = ['#2c2b34', '#c8643a', '#d8803a', '#f2e24a', '#eef3fa', '#ffcf3a', '#7fe8ff', '#efe6d2', '#ff4a6a'];
        let s = `<rect x="8" y="12" width="48" height="42" rx="4" fill="#8a5a32" ${O(3)}/><rect x="12" y="16" width="40" height="34" rx="2" fill="#3a2414"/>`;
        C.forEach((c, i) => { const x = 18 + (i % 3) * 14, y = 22 + Math.floor(i / 3) * 11; s += nugget(x, y, 4.4, c); });
        return s + `<path d="M12 16 H52 M25 16 V50 M39 16 V50 M12 27.5 H52 M12 38.5 H52" stroke="#6a4424" stroke-width="1.6"/><path d="M14 14 H50" stroke="#c99560" stroke-width="2.2" stroke-linecap="round"/>` + star(54, 10, 0.8);
      }
      case 'РМ-35': {   // Огранщик — гранёный камень и лупа
        const g = uid('ac');
        return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd0e0"/><stop offset=".5" stop-color="#ff2a4a"/><stop offset="1" stop-color="#a00a24"/></linearGradient></defs>`
          + `<path d="M8 26 L16 16 H34 L42 26 L25 50Z" fill="url(#${g})" ${O(2.8)}/><path d="M8 26 H42 M16 16 L20 26 25 50 30 26 34 16" stroke="${INK}" stroke-width="1.4" fill="none" opacity=".6"/><path d="M16 16 L20 26 H8Z" fill="#ffd0e0" opacity=".8"/>`
          + `<path d="M46 40 L58 54" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M46 40 L58 54" stroke="#6b4423" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="34" r="10" fill="#bfe6ff" fill-opacity=".55" ${O(3)}/><path d="M35 30 a6 6 0 0 1 6 -3" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>` + star(10, 10, 0.8);
      }
      default: return '';
    }
  }
  /** Значок достижения РМ-24…35 (размер - size px, по умолчанию 64); '' - нет такого. */
  const ach = (id, size = 64) => { const b = achBody(id); return b ? box64(b, size) : ''; };
  return { icon, held, oreBag, ach, ACH, LV };
});
