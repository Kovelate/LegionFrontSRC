
/* ───── стиль «legion»: styles/legion/enemies.js ───── */
try {
/* Стиль «Легион» — враги Похода (экран боя). Образец для других стилей; договор — styles/README.md, раздел «Враги».
   Враг рисуется в своих координатах: НОГИ (низ лап) — в точке (0, 0), смотрит ВЛЕВО (на отряд), ширина ~200, рост — `top` (обычно 90–170).
   Размер и место на экране задаёт бой: оборачивает рисунок в translate(x y) scale(s); вожак — ещё ×1,25.
   Анимации боя держатся на классах (обязательно):
     qb-idle — группа всего тела внутри (покачивание на месте; бой сам задаёт скорость);
     qb-arm  — то, что замахивается в ход врага (лапа, рука с оружием, хвост) + style="transform-origin:…" — точка поворота (плечо);
     qb-eye  — глаза, которые мерцают (необязательно).
   Атаки (ход врага): на каждый вид атаки — shield (в лоб), duck (сверху), scatter (по площади) — свой ПРИЁМ движения из набора боя:
     lunge, charge, leap, swoop, throw, spit, wave, burst или свой 'css:имя' (+ анимация .qb-atk-имя в поле css). Снаряд для throw/spit/burst — missile.
     Подробно — styles/README.md, «Враги → Атаки». Не задано — приёмы стаи по умолчанию (modules/quest/client/battle.js, ATK_PACK).
   Готовы: wolf (новый, 17.10), skeleton, bandit, viewbot (накрутчики), spambot (спам-боты), toad (жабы, 17.10). Нужны ещё (стаи уже есть в игре, ждут рисунка): boar, drowner, spider, bat. */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('legion', 'enemies', function () {
    const INK = '#2a2236';
    const f1 = (v) => Math.round(v * 10) / 10;
    const O = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

    // волк: серая шерсть, жёлтый глаз (у вожака — красный и гребень)
    function wolf(o) {
      const c = ['#7a7488', '#5a5468', '#a8a2b4'], big = o.boss, sp = (1.1 + ((o.seed || 0) % 7) / 10).toFixed(2);
      return `<g class="qb-idle" style="animation-duration:${sp}s">
      <path d="M58 -46 q38 -14 46 -46 q-4 30 -30 58 Z" fill="${c[1]}" ${O(3)}/>
      <path d="M-30 0 v-30 M-10 0 v-26 M30 0 v-28 M50 0 v-30" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M-30 0 v-30 M-10 0 v-26 M30 0 v-28 M50 0 v-30" stroke="${c[1]}" stroke-width="7" stroke-linecap="round"/>
      <path d="M-50 -40 Q-48 -78 0 -78 Q50 -82 66 -54 Q72 -30 52 -24 L-36 -22 Q-56 -24 -50 -40 Z" fill="${c[0]}" ${O(3.4)}/>
      <path d="M-20 -76 l10 -12 l10 12 l10 -12 l10 12 l10 -10 l8 10" fill="${c[1]}" ${O(2.6)}/>
      <path d="M-30 -30 Q10 -40 50 -30" stroke="${c[2]}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/>
      <path d="M-44 -64 Q-74 -74 -96 -58 L-112 -50 Q-108 -38 -88 -38 Q-66 -32 -46 -36 Z" fill="${c[0]}" ${O(3.4)}/>
      <path d="M-62 -70 l-6 -26 l20 16 Z M-46 -72 l2 -24 l14 20 Z" fill="${c[1]}" ${O(2.6)}/>
      <path d="M-112 -50 l4 -6 l4 5 l4 -5 l4 5 l4 -5 l4 5" fill="#fff" ${O(1.6)}/>
      <circle cx="-114" cy="-54" r="5" fill="${INK}"/>
      <path class="qb-eye" d="M-80 -60 l14 -4 l-2 7 Z" fill="${big ? '#ff4a3a' : '#ffd34d'}" ${O(1.6)}/>
      ${big ? `<path d="M-60 -82 l6 -14 l6 12 l6 -14 l6 14" fill="#ffc94d" ${O(2)}/>` : ''}
      </g>`;
    }
    // скелет и Скелет-воин (17.10): новый рисунок от коллеги (skeleton_legion.js) — в своём замыкании, чтобы его имена (f1, G, SK…) не спорили с остальными
    const SKEL = (() => {
  /* ════════ Скелет / Скелет-воин — для styles/legion/enemies.js ════════
     Вставить функции ниже внутрь фабрики addPart('legion', 'enemies', …), а в возвращаемый объект — строку:
       skeleton: { draw: skeleton, top: 162, scale: 1.25, attacks: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, missile: { svg: skullMissile() } },
     Ноги в (0, 0), смотрит влево. Вид «Легиона»: светлая толстая обводка, плоские цвета, тёмные провалы.
     Обычный: рваный коричневый плащ, мятый ржавый шлем, обрывки брони (наплечник, сегменты панциря, пояс с ремнями, наруч, поножа).
     По o.seed: свой набор обрывков, наклон черепа, трещина, выбитый зуб, нет ребра, стрела в рёбрах, дубина-кость вместо меча.
     Вожак (o.boss) — подробный рисунок skeletonBoss() ниже. */
  const SK = {
    LINE: '#f5f2ff',   // обводка — как у человечков «Легиона»
    INK: '#15122e',    // провалы глазниц, трещины
    BONE: '#e2dac2',
    BONE2: '#c4b994',  // тень на кости
    RUST: '#9c5a32',
    METAL: '#a9b1b6',
  };
  // кость: светлая обводка + заливка; w — толщина кости
  function skBone(d, w) {
    return `<path d="${d}" fill="none" stroke="${SK.LINE}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="none" stroke="${SK.BONE}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const skJoint = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SK.BONE}" stroke="${SK.LINE}" stroke-width="2.2"/>`;
  const skBits = (seed) => { let h = (seed >>> 0) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; return h; };

  // череп в 3/4, смотрит влево; cx, cy — центр мозговой коробки
  function skSkull(cx, cy, opt) {
    const { boss, crack, gap, jaw } = opt;
    const eye = boss ? '#ff3b3b' : '#ffd36a';
    let s = `<path d="M${cx + 16} ${cy + 4} C${cx + 18} ${cy - 14} ${cx + 4} ${cy - 20} ${cx - 6} ${cy - 18} C${cx - 18} ${cy - 15} ${cx - 22} ${cy - 4} ${cx - 20} ${cy + 6} L${cx - 22} ${cy + 12} Q${cx - 16} ${cy + 14} ${cx - 12} ${cy + 12} L${cx + 6} ${cy + 12} Q${cx + 14} ${cy + 10} ${cx + 16} ${cy + 4} Z" fill="${SK.BONE}" stroke="${SK.LINE}" stroke-width="3.4" stroke-linejoin="round"/>`;
    s += `<path d="M${cx + 10} ${cy - 10} Q${cx + 14} ${cy - 2} ${cx + 10} ${cy + 8}" fill="none" stroke="${SK.BONE2}" stroke-width="3" stroke-linecap="round"/>`;   // тень на затылке
    // челюсть (чуть приоткрыта)
    s += `<path d="M${cx - 18} ${cy + 13 + jaw} Q${cx - 18} ${cy + 22 + jaw} ${cx - 8} ${cy + 22 + jaw} H${cx + 2} Q${cx + 8} ${cy + 20} ${cx + 6} ${cy + 12}" fill="${SK.BONE}" stroke="${SK.LINE}" stroke-width="3" stroke-linejoin="round"/>`;
    // зубы
    let teeth = ''; for (let i = 0; i < 5; i++) { if (i === gap) continue; const x = cx - 18 + i * 4.2; teeth += `<rect x="${x.toFixed(1)}" y="${cy + 10}" width="3.4" height="4.4" rx="1" fill="#fff" stroke="${SK.INK}" stroke-width=".9"/><rect x="${x.toFixed(1)}" y="${cy + 15 + jaw}" width="3.4" height="4" rx="1" fill="#fff" stroke="${SK.INK}" stroke-width=".9"/>`; }
    s += teeth;
    // глазницы, нос, скула
    s += `<ellipse cx="${cx - 13}" cy="${cy - 1}" rx="5.4" ry="6.2" fill="${SK.INK}"/><ellipse cx="${cx + 1}" cy="${cy - 1}" rx="5" ry="6" fill="${SK.INK}"/>`
      + `<path d="M${cx - 7} ${cy + 4} l-2.6 5 h4.4 z" fill="${SK.INK}"/><path d="M${cx + 6} ${cy + 7} q4 1 6 -2" fill="none" stroke="${SK.BONE2}" stroke-width="2"/>`;
    // огоньки в глазницах (мерцают)
    s += `<g class="qb-eye"><circle cx="${cx - 13}" cy="${cy}" r="${boss ? 2.8 : 2}" fill="${eye}"/><circle cx="${cx + 1}" cy="${cy}" r="${boss ? 2.6 : 1.8}" fill="${eye}"/>`
      + (boss ? `<circle cx="${cx - 13}" cy="${cy}" r="5" fill="${eye}" opacity=".3"/><circle cx="${cx + 1}" cy="${cy}" r="4.6" fill="${eye}" opacity=".3"/>` : '') + '</g>';
    if (crack) s += `<path d="M${cx + 2} ${cy - 18} l-2 6 l4 3 l-3 6" fill="none" stroke="${SK.INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    return s;
  }

  // ржавый шлем легионера с гребнем (вожак)
  function skHelmet(cx, cy) {
    const L = SK.LINE;
    return `<path d="M${cx - 22} ${cy - 2} Q${cx - 22} ${cy - 26} ${cx - 2} ${cy - 26} Q${cx + 20} ${cy - 26} ${cx + 20} ${cy - 2} L${cx + 20} ${cy + 10} L${cx + 12} ${cy + 10} L${cx + 12} ${cy - 4} L${cx - 22} ${cy - 4} Z" fill="#b8893a" stroke="${L}" stroke-width="3.4" stroke-linejoin="round"/>`
      + `<path d="M${cx - 22} ${cy - 6} H${cx + 20}" stroke="#7a5420" stroke-width="2.4"/>`
      + `<g fill="${SK.RUST}" opacity=".85"><circle cx="${cx - 12}" cy="${cy - 18}" r="2.4"/><circle cx="${cx + 8}" cy="${cy - 14}" r="3"/><circle cx="${cx + 15}" cy="${cy + 2}" r="2"/></g>`
      + `<path d="M${cx - 14} ${cy - 24} Q${cx - 8} ${cy - 50} ${cx + 6} ${cy - 50} Q${cx + 20} ${cy - 46} ${cx + 22} ${cy - 22} Z" fill="#e8455c" stroke="${L}" stroke-width="3.2" stroke-linejoin="round"/>`
      + `<path d="M${cx - 6} ${cy - 30} l4 -14 M${cx + 3} ${cy - 30} l2 -16 M${cx + 12} ${cy - 28} l1 -14" stroke="#a3122a" stroke-width="2.2" stroke-linecap="round"/>`;
  }

  // оружие в руке: рукоять в (0,0), клинок вверх
  function skWeapon(kind, boss) {
    const L = SK.LINE, WS = `stroke="${L}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
    if (kind === 'club')   // дубина — большая берцовая кость
      return `<path d="M0 10 V-40" stroke="${L}" stroke-width="11" stroke-linecap="round"/><path d="M0 10 V-40" stroke="${SK.BONE}" stroke-width="7" stroke-linecap="round"/>${skJoint(-4, -44, 6)}${skJoint(4, -44, 6)}${skJoint(-3, 12, 4.4)}${skJoint(3, 12, 4.4)}`;
    if (boss)   // длинный меч с золотой гардой
      return `<rect x="-2.5" y="2" width="5" height="14" rx="2" fill="#5a3a1c" ${WS}/><circle cy="18" r="3.6" fill="#ffd76a" ${WS}/><path d="M-4.5 -2 V-66 L0 -76 L4.5 -66 V-2 Z" fill="#cfd6db" ${WS}/><path d="M0 -6 V-64" stroke="#8a949a" stroke-width="1.4"/><rect x="-13" y="-5" width="26" height="6" rx="3" fill="#ffd76a" ${WS}/>`;
    // ржавый гладиус с зазубринами
    return `<rect x="-2.5" y="2" width="5" height="12" rx="2" fill="#5a3a1c" ${WS}/><circle cy="15" r="3.2" fill="${SK.METAL}" ${WS}/><path d="M-5 -2 C-7 -18 -6 -34 0 -46 C3 -40 6 -36 4 -32 L7 -28 L5 -22 C6 -14 6 -8 5 -2 Z" fill="${SK.METAL}" ${WS}/><g fill="${SK.RUST}"><circle cx="-2" cy="-14" r="2"/><circle cx="2" cy="-26" r="1.6"/><circle cx="-1" cy="-34" r="1.3"/></g><rect x="-9" y="-4" width="18" height="6" rx="3" fill="#6d5a45" ${WS}/>`;
  }

  function skeleton(o) {
    o = o || {};
    if (o.boss && typeof skeletonBoss === 'function') return skeletonBoss(o);   // подробный вожак — skeleton_boss.js
    const boss = false, h = skBits(o.seed || 0);
    const tilt = ((h % 13) - 6), crack = (h >>> 4) % 3 === 0, gap = (h >>> 6) % 4 === 0 ? 2 : -1, jaw = (h >>> 8) % 3;
    const noRib = (h >>> 10) % 4 === 0 ? 1 + ((h >>> 12) % 3) : -1, arrow = (h >>> 14) % 3 === 0, club = (h >>> 16) % 3 === 0;
    // обрывки снаряжения — у каждого свой набор
    const helm = (h >>> 18) % 7 !== 0, hv = (h >>> 20) % 3;
    let shoulder = !!((h >>> 22) & 1), breast = !arrow && !!((h >>> 23) & 1), belt = (h >>> 24) % 3 !== 0, bracer = !!((h >>> 25) & 1), greave = !!((h >>> 26) & 1);
    if (shoulder + breast + belt + bracer + greave < 2) { belt = true; shoulder = true; }
    const L = SK.LINE, IRON = '#8e959c', IRON_D = '#5f666d', LEATHER = '#5a3a24';
    const cloak = ['#7a5236', '#6b4a30', '#8a6040'][(h >>> 27) % 3];
    const rust = (pts) => `<g fill="${SK.RUST}" opacity=".85">${pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
    let s = '<g class="qb-idle">';

    // рваный коричневый плащ — за спиной, с дырами
    s += `<path d="M-16 -118 C-26 -90 -30 -50 -30 -14 L-24 -21 L-20 -8 L-12 -19 L-6 -5 L2 -17 L8 -4 L14 -15 L22 -7 L26 -19 L32 -12 C30 -50 26 -90 14 -120 Z" fill="${cloak}" stroke="${L}" stroke-width="3.2" stroke-linejoin="round"/>`
      + `<path d="M-8 -110 C-14 -80 -16 -50 -16 -22 M20 -110 C24 -80 26 -50 26 -24" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2.4" stroke-linecap="round"/>`
      + `<path d="M${-24 + (h & 3)} -46 l4 -3 l3 4 l-2 5 l-5 -1 z M${16 + ((h >>> 2) & 3)} -60 l3 -4 l4 3 l-3 5 z" fill="#2a1a12"/>`;

    // дальняя рука (правая) висит
    s += skBone('M12 -114 L22 -92 L18 -70', 5) + skJoint(22, -92, 3.6) + skJoint(18, -68, 4.4);

    // ноги: дальняя, потом ближняя (стопы носком влево); на ближней голени — мятая поножа
    s += skBone('M6 -62 L12 -33 L10 -6', 6) + skJoint(12, -33, 4.4) + skBone('M10 -3 L-3 -1', 5);
    s += skBone('M-6 -62 L-16 -35 L-20 -6', 6.4) + skJoint(-16, -35, 4.6) + skBone('M-20 -3 L-34 -1', 5.4);
    if (greave) s += `<path d="M-22 -29 Q-24 -18 -25 -10 L-15 -10 Q-14 -18 -11 -29 Q-16 -32 -22 -29 Z" fill="${IRON}" stroke="${L}" stroke-width="2.2" stroke-linejoin="round"/><path d="M-21 -22 l6 -1 M-22 -15 l3 2" stroke="${IRON_D}" stroke-width="1.4"/>` + rust([[-17, -26, 1.6], [-21, -13, 1.3]]);

    // позвоночник и таз
    let sp = ''; for (let y = -70; y >= -114; y -= 7.5) sp += `<rect x="-1" y="${y}" width="9" height="5.6" rx="2.4" fill="${SK.BONE}" stroke="${L}" stroke-width="2"/>`;
    s += sp + `<path d="M-16 -68 Q-20 -54 -8 -52 Q0 -58 8 -52 Q20 -54 16 -68 Q0 -62 -16 -68 Z" fill="${SK.BONE}" stroke="${L}" stroke-width="3.2" stroke-linejoin="round"/><ellipse cx="-7" cy="-60" rx="3" ry="2.4" fill="${SK.INK}"/><ellipse cx="7" cy="-60" rx="3" ry="2.4" fill="${SK.INK}"/>`;
    // пояс с остатками кожаных ремней-птеруг
    if (belt) {
      s += [-15, -8, 9, 16].filter((x, i) => (h >>> (28 + i)) & 1 || i === 0).map((x, i) => `<path d="M${x - 2.4} -64 h4.8 v${13 + (i % 2) * 5} l-1.2 -2 l-1.2 3 l-1.2 -3 l-1.2 2 z" fill="${LEATHER}" stroke="${L}" stroke-width="1.4" stroke-linejoin="round"/>`).join('')
        + `<rect x="-18" y="-69.6" width="36" height="6.4" rx="2" fill="${LEATHER}" stroke="${L}" stroke-width="2"/><rect x="-9" y="-70.6" width="7" height="8.4" rx="1.4" fill="none" stroke="${IRON}" stroke-width="2"/>`;
    }

    // рёбра и грудина
    let ribs = '';
    for (let i = 0; i < 5; i++) {
      if (i === noRib) continue;
      const y = -112 + i * 7.6, w = 22 - i * 1.6;
      ribs += skBone(`M4 ${y} C${-w} ${y - 3} ${-w - 3} ${y + 9} -7 ${y + 11}`, 3.2) + skBone(`M6 ${y} C${14} ${y - 1} ${15} ${y + 7} ${10} ${y + 9}`, 2.8);
    }
    s += ribs + `<rect x="-10" y="-113" width="5.4" height="34" rx="2.6" fill="${SK.BONE}" stroke="${L}" stroke-width="2"/>`;
    // обрывок сегментного панциря поверх правых рёбер
    if (breast) s += [-109, -101, -93].map((y, i) => `<path d="M3 ${y} Q11 ${y - 2} 19 ${y + 1} L18 ${y + 6} Q10 ${y + 3} 3 ${y + 5} Z" fill="${i === 1 ? IRON_D : IRON}" stroke="${L}" stroke-width="1.8" stroke-linejoin="round"/>`).join('') + rust([[14, -106, 1.6], [8, -97, 1.3], [15, -90, 1.4]]) + `<circle cx="6" cy="-106" r="1.2" fill="${L}"/><circle cx="6" cy="-90" r="1.2" fill="${L}"/>`;
    if (arrow) s += `<path d="M-30 -96 L22 -86" stroke="${L}" stroke-width="5" stroke-linecap="round"/><path d="M-30 -96 L22 -86" stroke="#8a5a2b" stroke-width="2.4" stroke-linecap="round"/><path d="M22 -86 l8 -5 l-1 6 l5 3 l-9 1 z" fill="#e8455c" stroke="${L}" stroke-width="1.6"/><path d="M-30 -96 l-6 -4 l1 7 z" fill="${SK.METAL}" stroke="${L}" stroke-width="1.6"/>`;
    // ключицы
    s += skBone('M-16 -114 L14 -117', 3.6);
    // мятый наплечник на дальнем плече, рваный край
    if (shoulder) s += `<path d="M6 -121 Q18 -128 27 -117 L25 -107 L22 -110 L19 -106 L15 -110 L11 -107 Q9 -112 6 -113 Z" fill="${IRON}" stroke="${L}" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 -119 q8 -3 14 2" fill="none" stroke="${IRON_D}" stroke-width="1.4"/>` + rust([[20, -115, 1.8], [12, -113, 1.2]]) + `<circle cx="16" cy="-121" r="1.3" fill="${L}"/>`;

    // шея и череп (наклон по сиду), на черепе — слабый мятый шлем
    s += skBone('M2 -118 L0 -128', 5);
    let helmet = '';
    if (helm) {
      const cx = -2, cy = -142;
      helmet = `<path d="M${cx - 22} ${cy - 10} Q${cx - 24} ${cy - 25} ${cx - 10} ${cy - 27} L${cx - 6} ${cy - 23} L${cx - 2} ${cy - 27} Q${cx + 18} ${cy - 27} ${cx + 18} ${cy - 10} Z" fill="${IRON}" stroke="${L}" stroke-width="2.8" stroke-linejoin="round"/>`
        + `<path d="M${cx - 21} ${cy - 12.5} H${cx + 17}" stroke="${IRON_D}" stroke-width="2.6"/>`
        + `<path d="M${cx + 6} ${cy - 25} l-2 5 l3 3" fill="none" stroke="${SK.INK}" stroke-width="1.3"/>`   // трещина
        + rust([[cx - 14, cy - 18, 2], [cx + 10, cy - 16, 1.6], [cx - 4, cy - 14, 1.2]])
        + (hv === 1 ? `<path d="M${cx - 2} ${cy - 27} l-3 -7 M${cx + 1} ${cy - 27} l1 -8 M${cx + 4} ${cy - 26} l4 -6" stroke="#6b4423" stroke-width="2.4" stroke-linecap="round"/>` : '')   // огрызок гребня
        + (hv === 2 ? `<path d="M${cx + 18} ${cy - 12} L${cx + 23} ${cy - 2} L${cx + 17} ${cy - 3} Z" fill="${IRON_D}" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>` : '');   // погнутый назатыльник
    }
    s += `<g transform="rotate(${tilt} 0 -128)">${skSkull(-2, -142, { boss, crack: crack && !helm, gap, jaw })}${helmet}</g>`;

    // ближняя рука (левая) с оружием — замахивается в ход врага; плечо в (−16, −114). На предплечье — кожаный наруч
    s += `<g class="qb-arm" style="transform-origin:-16px -114px">`
      + skBone('M-16 -114 L-30 -96 L-42 -108', 5.4) + skJoint(-30, -96, 3.8)
      + (bracer ? `<path d="M-33 -99 L-39 -105" stroke="${L}" stroke-width="11" stroke-linecap="round"/><path d="M-33 -99 L-39 -105" stroke="${LEATHER}" stroke-width="7.6" stroke-linecap="round"/><path d="M-35 -98 l-3 3 M-38 -101 l-3 3" stroke="#3a2618" stroke-width="1.4"/>` : '')
      + `<g transform="translate(-44 -110) rotate(-28)">${skWeapon(club ? 'club' : 'gladius', false)}</g>`
      + skJoint(-43, -110, 5) + '</g>';

    return s + '</g>';
  }

  // снаряд для «throw»: летящий череп ~40×40, центр в (0,0)
  function skullMissile() {
    const L = SK.LINE;
    return `<path d="M14 2 C16 -12 4 -17 -4 -16 C-14 -14 -18 -6 -16 4 L-17 9 Q-12 11 -9 10 L6 10 Q12 8 14 2 Z" fill="${SK.BONE}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M-14 11 Q-14 17 -6 17 H2 Q6 15 5 10" fill="${SK.BONE}" stroke="${L}" stroke-width="2.6"/>`
      + `<ellipse cx="-10" cy="-1" rx="4.4" ry="5" fill="${SK.INK}"/><ellipse cx="2" cy="-1" rx="4" ry="4.8" fill="${SK.INK}"/><path d="M-5 4 l-2 4 h3.6 z" fill="${SK.INK}"/>`
      + `<circle cx="-10" cy="0" r="1.6" fill="#ffd36a"/><circle cx="2" cy="0" r="1.5" fill="#ffd36a"/>`;
  }
  /* ════════ конец вставки ════════ */
  /* ════════ Скелет-воин (вожак) — подробный рисунок. Вставить рядом с функцией skeleton() ════════
     В skeleton(o) первой строкой: if (o && o.boss) return skeletonBoss(o);
     Ноги в (0, 0), смотрит влево. Рост с гребнем ~200, копьё выше.
     Вид «Легиона»: светлая обводка по силуэтам, плоские цвета; золото в три тона, гравировка тёмными линиями.
     Без фильтров и <text>; градиенты — с уникальными id. */
  let skN = 0;
  const G = { L: '#ffe08a', M: '#e8b13a', D: '#a9741c', X: '#5a3a0c' };   // золото: блик, основной, тень, гравировка
  const RED = { L: '#e8455c', M: '#c0182b', D: '#7a0d18' };
  const OL = (w) => `stroke="${SK.LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const EN = (w) => `stroke="${G.X}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const f1 = (v) => +(+v).toFixed(1);

  // львиная морда: грива лепестками, морда, глаза, нос, пасть
  function skLion(cx, cy, r, roar) {
    const k = r / 10;
    const P = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(cx + x * k)} ${f1(cy + y * k)}`).join(' ') + ' Z';
    // грива: два слоя острых прядей
    let m1 = '', m2 = '';
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 - Math.PI / 2, a1 = a - 0.22, a2 = a + 0.22;
      m1 += `M${f1(cx + Math.cos(a1) * 6.4 * k)} ${f1(cy + 0.6 * k + Math.sin(a1) * 6.4 * k)} L${f1(cx + Math.cos(a) * 11.4 * k)} ${f1(cy + 0.6 * k + Math.sin(a) * 11.4 * k)} L${f1(cx + Math.cos(a2) * 6.4 * k)} ${f1(cy + 0.6 * k + Math.sin(a2) * 6.4 * k)} Z `;
      const b = a + Math.PI / 14, b1 = b - 0.2, b2 = b + 0.2;
      m2 += `M${f1(cx + Math.cos(b1) * 5.6 * k)} ${f1(cy + 0.6 * k + Math.sin(b1) * 5.6 * k)} L${f1(cx + Math.cos(b) * 9 * k)} ${f1(cy + 0.6 * k + Math.sin(b) * 9 * k)} L${f1(cx + Math.cos(b2) * 5.6 * k)} ${f1(cy + 0.6 * k + Math.sin(b2) * 5.6 * k)} Z `;
    }
    let g = `<path d="${m1}" fill="${G.D}" ${EN(0.7)}/><path d="${m2}" fill="${G.M}" ${EN(0.6)}/>`;
    g += `<circle cx="${f1(cx - 4.4 * k)}" cy="${f1(cy - 5 * k)}" r="${f1(1.8 * k)}" fill="${G.M}" ${EN(0.6)}/><circle cx="${f1(cx + 4.4 * k)}" cy="${f1(cy - 5 * k)}" r="${f1(1.8 * k)}" fill="${G.M}" ${EN(0.6)}/>`;   // уши
    g += `<path d="${P([[-5, -4], [5, -4], [6, 1], [3.6, 6], [0, 7.4], [-3.6, 6], [-6, 1]])}" fill="${G.M}" ${EN(0.8)}/>`;   // морда
    g += `<path d="${P([[-3.4, 2], [3.4, 2], [3, 5.6], [0, 6.8], [-3, 5.6]])}" fill="${G.L}"/>`;   // светлая пасть-подбородок
    g += `<path d="M${f1(cx - 4.4 * k)} ${f1(cy - 2.6 * k)} l${f1(3 * k)} ${f1(1 * k)} M${f1(cx + 4.4 * k)} ${f1(cy - 2.6 * k)} l${f1(-3 * k)} ${f1(1 * k)}" fill="none" ${EN(0.9 * k)}/>`;   // злые брови
    g += `<circle cx="${f1(cx - 2.4 * k)}" cy="${f1(cy - 0.8 * k)}" r="${f1(0.8 * k)}" fill="${G.X}"/><circle cx="${f1(cx + 2.4 * k)}" cy="${f1(cy - 0.8 * k)}" r="${f1(0.8 * k)}" fill="${G.X}"/>`;
    g += `<path d="M${f1(cx - 1.8 * k)} ${f1(cy + 1.4 * k)} h${f1(3.6 * k)} l${f1(-1.8 * k)} ${f1(1.6 * k)} z" fill="${G.X}"/><path d="M${f1(cx)} ${f1(cy - 2.4 * k)} v${f1(3.8 * k)}" ${EN(0.5 * k)}/>`;   // нос и переносица
    g += roar
      ? `<path d="M${f1(cx - 2.8 * k)} ${f1(cy + 3.6 * k)} q${f1(2.8 * k)} ${f1(3.8 * k)} ${f1(5.6 * k)} 0 z" fill="${RED.D}" ${EN(0.6)}/><path d="M${f1(cx - 2 * k)} ${f1(cy + 3.6 * k)} l${f1(0.6 * k)} ${f1(1.6 * k)} l${f1(0.6 * k)} ${f1(-1.6 * k)} M${f1(cx + 0.8 * k)} ${f1(cy + 3.6 * k)} l${f1(0.6 * k)} ${f1(1.6 * k)} l${f1(0.6 * k)} ${f1(-1.6 * k)}" fill="#fff"/>`
      : `<path d="M${f1(cx - 2.4 * k)} ${f1(cy + 3.8 * k)} q${f1(1.2 * k)} ${f1(1 * k)} ${f1(2.4 * k)} 0 q${f1(1.2 * k)} ${f1(1 * k)} ${f1(2.4 * k)} 0" fill="none" ${EN(0.6 * k)}/>`;
    return g;
  }
  // медальон (фалера): золотой круг с ободком и львом
  const skPhalera = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${G.M}" ${OL(2)}/><circle cx="${cx}" cy="${cy}" r="${f1(r - 1.8)}" fill="none" ${EN(0.9)}/>${skLion(cx, cy, r * 0.72, false)}`;
  // заклёпки
  const skRivets = (pts, r) => `<g fill="${G.L}" ${EN(0.7)}>${pts.map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>`).join('')}</g>`;
  // ржавые пятна и потёртости по сиду
  function skGrime(h, x0, y0, w, hgt, n, col) { let s = ''; for (let i = 0; i < n; i++) { const a = (h >>> (i * 3)) & 31, b = (h >>> (i * 2 + 5)) & 31; s += `<circle cx="${f1(x0 + a / 31 * w)}" cy="${f1(y0 + b / 31 * hgt)}" r="${f1(0.8 + (a % 4) * 0.5)}"/>`; } return `<g fill="${col}" opacity=".55">${s}</g>`; }

  function skeletonBoss(o) {
    const h = skBits((o && o.seed) || 0), id = 'skb' + (++skN), L = SK.LINE;
    let s = `<defs><radialGradient id="${id}s" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="${G.L}"/><stop offset=".45" stop-color="${G.M}"/><stop offset="1" stop-color="${G.D}"/></radialGradient>`
      + `<linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${G.L}"/><stop offset=".5" stop-color="${G.M}"/><stop offset="1" stop-color="${G.D}"/></linearGradient></defs>`;
    s += '<g class="qb-idle">';

    /* ── 1. плащ за спиной: рваный, развевается вправо ── */
    let hem = ''; for (let i = 0, x = -46; x < 76; i++, x += 9) hem += ` L${x} ${i % 2 ? -14 - (h >>> i & 7) : -2 - (h >>> (i + 3) & 3)}`;
    s += `<path d="M-26 -128 C-40 -100 -48 -52 -48 -6${hem} L80 -18 C96 -54 92 -104 66 -136 C52 -150 34 -142 24 -132 Z" fill="${RED.M}" ${OL(3.4)}/>`
      + `<path d="M-14 -120 C-24 -80 -28 -40 -30 -8 M40 -128 C60 -100 68 -60 66 -20 M58 -128 C80 -100 84 -60 78 -24 M-34 -96 C-38 -60 -40 -30 -40 -8" fill="none" stroke="${RED.D}" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M76 -40 l14 -8 l-6 10 l12 -2 l-14 12 M84 -96 l12 -10 l-4 12" fill="none" stroke="${RED.M}" stroke-width="3.4" stroke-linecap="round"/>`;

    /* ── 2. длинный конский хвост гребня — от заднего края держателя, развевается назад, правее шлема ── */
    let mane = '';
    for (let i = 0; i < 7; i++) { const y0 = -197 + i * 2, x0 = 10 + i * 1.5; mane += `<path d="M${x0} ${y0} C${32 + i * 4} ${y0 - 4 + i} ${50 + i * 3} ${-168 + i * 4} ${62 + i * 5} ${-136 + i * 6}" fill="none" stroke="${i % 3 === 2 ? '#2a1418' : i % 2 ? RED.D : RED.M}" stroke-width="${5 - i * 0.3}" stroke-linecap="round"/>`; }
    s += mane;

    /* ── 3. дальняя рука (за щитом) ── */
    s += skBone('M22 -126 L34 -102 L36 -82', 6) + skJoint(34, -102, 4);

    /* ── 4. ноги: кости, поножи со львами, сандалии ── */
    const leg = (hx, kx, ax, ay, far) => {
      let g = skBone(`M${hx} -72 L${kx} -40`, 7) + skJoint(kx, -40, 5.2);
      g += skBone(`M${kx} -40 L${ax} ${ay}`, 6);
      // поножа: щиток по голени
      g += `<path d="M${kx - 8} -36 Q${kx - 10} -22 ${ax - 7} ${ay - 2} L${ax + 7} ${ay - 2} Q${kx + 10} -22 ${kx + 8} -36 Q${kx} -42 ${kx - 8} -36 Z" fill="url(#${id}h)" ${OL(2.6)}/>`
        + `<path d="M${kx - 6} -26 Q${kx} -24 ${kx + 6} -26 M${ax - 5} ${ay - 8} Q${ax} ${ay - 6} ${ax + 5} ${ay - 8}" fill="none" ${EN(1)}/>`
        + skLion(kx, -38, 7.4, !far);
      // стопа (носком влево) и сандалия
      g += skBone(`M${ax} ${ay + 2} L${ax - 15} -1`, 5.2)
        + `<path d="M${ax - 14} -1 l-4 0 M${ax - 13} -3.6 l-4 -1" stroke="${SK.BONE}" stroke-width="2.4" stroke-linecap="round"/>`
        + `<path d="M${ax + 4} ${ay + 2} L${ax - 4} -1 M${ax - 6} ${ay + 1} l-4 4" stroke="#5a2a14" stroke-width="2.4" stroke-linecap="round"/><circle cx="${ax - 1}" cy="${ay + 3}" r="1.6" fill="${G.M}"/>`;
      return g;
    };
    s += leg(9, 18, 26, -8, true) + leg(-9, -18, -24, -8, false);

    /* ── 5. юбка: красная ткань + птеруги (кожаные ремни с золотыми бляхами) ── */
    let rag = ''; for (let i = 0, x = -26; x <= 26; i++, x += 6.5) rag += ` L${x} ${i % 2 ? -34 : -40}`;
    s += `<path d="M-26 -74 L-28 -40${rag} L28 -42 L26 -74 Z" fill="${RED.M}" ${OL(2.6)}/>`;
    let pt = '';
    for (let i = 0; i < 8; i++) {
      const x = -24 + i * 6.6, len = 30 + (i % 2 ? 4 : 0), dark = i % 2;
      pt += `<path d="M${f1(x)} -72 h5.6 v${len} l-2.8 3 l-2.8 -3 z" fill="${dark ? '#5a2a14' : RED.D}" stroke="${G.X}" stroke-width="1"/>`
        + `<circle cx="${f1(x + 2.8)}" cy="${-72 + len - 4}" r="1.7" fill="${G.M}" ${EN(0.6)}/><path d="M${f1(x + 1)} -64 h3.6" stroke="${G.D}" stroke-width="1"/>`;
    }
    s += pt;

    /* ── 6. позвоночник между рёбрами и поясом ── */
    let sp = ''; for (let y = -94; y >= -100; y -= 6) sp += `<rect x="-3" y="${y}" width="8" height="5" rx="2.2" fill="${SK.BONE}" stroke="${L}" stroke-width="1.8"/>`;
    s += sp;

    /* ── 7. рёбра + золотые пластины по бокам + фалеры по грудине ── */
    let ribs = '';
    for (let i = 0; i < 5; i++) { const y = -124 + i * 6.4, w = 18 - i * 1.2; ribs += skBone(`M2 ${y} C${-w} ${y - 2} ${-w - 2} ${y + 8} -5 ${y + 9}`, 3) + skBone(`M4 ${y} C${w} ${y - 2} ${w + 2} ${y + 8} 9 ${y + 9}`, 3); }
    s += ribs;
    s += `<path d="M-26 -124 Q-30 -104 -24 -88 L-16 -90 Q-20 -106 -16 -122 Z M28 -126 Q32 -106 26 -88 L18 -90 Q22 -106 18 -124 Z" fill="url(#${id}h)" ${OL(2.4)}/>`
      + `<path d="M-23 -118 l3 0 M-24 -108 l3 0 M-23 -98 l3 0 M23 -118 l-3 0 M24 -108 l-3 0 M23 -98 l-3 0" ${EN(1.2)}/>`;
    s += `<rect x="-4.6" y="-126" width="7" height="34" rx="3" fill="${SK.BONE}" stroke="${L}" stroke-width="1.8"/>` + skPhalera(-1, -116, 6.4) + skPhalera(-1, -100, 5.6);

    /* ── 8. пояс-цингулум с тремя медальонами ── */
    s += `<path d="M-28 -84 Q0 -78 28 -84 L28 -72 Q0 -66 -28 -72 Z" fill="url(#${id}h)" ${OL(2.6)}/><path d="M-27 -81 Q0 -75 27 -81 M-27 -75 Q0 -69 27 -75" fill="none" ${EN(0.9)}/>`
      + skPhalera(-17, -77, 5) + skPhalera(0, -75, 5.6) + skPhalera(17, -77, 5);

    /* ── 9. наплечники-львы ── */
    s += `<path d="M14 -130 Q34 -140 46 -120 Q42 -106 30 -106 Q22 -114 14 -116 Z" fill="url(#${id}h)" ${OL(2.8)}/>` + skLion(31, -120, 9.4, true);

    /* ── 10. шея, череп, аттический шлем, гребень — каждая деталь на своём месте, без наложений ── */
    s += skBone('M0 -126 L-2 -142', 6);
    const cx = -4, cy = -162;
    // череп: открытая челюсть — рычит
    s += `<path d="M${cx + 14} ${cy + 6} C${cx + 16} ${cy - 10} ${cx + 4} ${cy - 16} ${cx - 6} ${cy - 15} C${cx - 18} ${cy - 13} ${cx - 21} ${cy - 3} ${cx - 19} ${cy + 6} L${cx - 20} ${cy + 11} Q${cx - 15} ${cy + 13} ${cx - 11} ${cy + 11} L${cx + 6} ${cy + 11} Q${cx + 12} ${cy + 10} ${cx + 14} ${cy + 6} Z" fill="${SK.BONE}" ${OL(3)}/>`
      + `<path d="M${cx - 18} ${cy + 16} Q${cx - 19} ${cy + 27} ${cx - 8} ${cy + 27} H${cx + 1} Q${cx + 5} ${cy + 24} ${cx + 4} ${cy + 13}" fill="${SK.BONE}" ${OL(2.8)}/>`
      + `<path d="M${cx - 17} ${cy + 12} H${cx + 1} V${cy + 17} H${cx - 17} Z" fill="${RED.D}"/>`;
    let teeth = ''; for (let i = 0; i < 4; i++) { const x = cx - 17 + i * 4.4; teeth += `<path d="M${f1(x)} ${cy + 9} h3.4 l-0.6 4.6 h-2.2 z M${f1(x)} ${cy + 21} h3.4 l-0.6 -4.4 h-2.2 z" fill="#fff" stroke="${SK.INK}" stroke-width=".8"/>`; }
    s += teeth;
    s += `<ellipse cx="${cx - 12}" cy="${cy + 1}" rx="5.2" ry="5.6" fill="${SK.INK}"/><ellipse cx="${cx}" cy="${cy + 1}" rx="4.8" ry="5.4" fill="${SK.INK}"/><path d="M${cx - 6} ${cy + 5} l-2.2 4 h3.8 z" fill="${SK.INK}"/>`
      + `<g class="qb-eye"><circle cx="${cx - 12}" cy="${cy + 1.5}" r="4.6" fill="#ff3b3b" opacity=".3"/><circle cx="${cx}" cy="${cy + 1.5}" r="4.2" fill="#ff3b3b" opacity=".3"/><circle cx="${cx - 12}" cy="${cy + 1.5}" r="2.5" fill="#ff5a4a"/><circle cx="${cx}" cy="${cy + 1.5}" r="2.3" fill="#ff5a4a"/><circle cx="${cx - 12.6}" cy="${cy + 0.6}" r="1" fill="#fff4c8"/></g>`;
    // гребень: пряди растут из держателя (рисуются первыми — корни уходят под держатель)
    let crest = '';
    for (let i = 0; i <= 10; i++) { const u = i / 10, x = cx - 13 + u * 26, y = cy - 38 - Math.sin(u * Math.PI) * 2; crest += `<path d="M${f1(x)} ${f1(y)} q${f1(-3 + u * 7)} -10 ${f1(1 + u * 9)} -19" fill="none" stroke="${i % 4 === 3 ? '#2a1418' : i % 2 ? RED.D : RED.M}" stroke-width="4.4" stroke-linecap="round"/>`; }
    s += crest + `<path d="M${cx - 15} ${cy - 35} Q${cx} ${cy - 42} ${cx + 15} ${cy - 35} L${cx + 14} ${cy - 31} Q${cx} ${cy - 37} ${cx - 14} ${cy - 31} Z" fill="${G.M}" ${OL(2)}/>`;
    // шлем: купол над глазницами, налобная полоса, назатыльник, нащёчник в стороне от зубов
    s += `<path d="M${cx - 24} ${cy - 10} Q${cx - 26} ${cy - 33} ${cx - 2} ${cy - 33} Q${cx + 22} ${cy - 33} ${cx + 22} ${cy - 12} L${cx + 27} ${cy + 2} L${cx + 19} ${cy - 2} L${cx + 17} ${cy - 10} Z" fill="url(#${id}h)" ${OL(3)}/>`
      + `<path d="M${cx - 23} ${cy - 13} H${cx + 19}" stroke="${G.D}" stroke-width="3.4"/><path d="M${cx - 23} ${cy - 15.4} H${cx + 19}" ${EN(0.9)}/>`
      + `<path d="M${cx - 15} ${cy - 22} q4 -4 8 0 q4 -4 8 0 q4 -4 8 0 q4 -4 8 0" fill="none" ${EN(1.1)}/>`   // меандр-волна по куполу
      + `<path d="M${cx - 14} ${cy - 28} q8 -3 16 -1" fill="none" stroke="${G.L}" stroke-width="2" stroke-linecap="round"/>`
      + skGrime(h, cx - 18, cy - 30, 34, 12, 4, G.X)
      + `<path d="M${cx + 7} ${cy - 9} H${cx + 16} L${cx + 17} ${cy + 17} Q${cx + 12} ${cy + 23} ${cx + 8} ${cy + 19} Z" fill="url(#${id}h)" ${OL(2.4)}/>`   // нащёчник
      + skRivets([[cx + 12, cy - 4], [cx + 12.6, cy + 12]], 1.2);

    /* ── 11. щит: бронза, золотой обод, лавровый венок, лев ── */
    const sx = 40, sy = -70, R = 44;
    let laurel = '';
    for (const sd of [-1, 1]) for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + sd * (0.25 + i * 0.27), x = sx + Math.cos(a) * (R - 13), y = sy + Math.sin(a) * (R - 13), rot = a * 180 / Math.PI + (sd > 0 ? 90 : -90) - sd * 30;
      laurel += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="5" ry="2.2" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"/>`;
    }
    let rim = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; rim.push([sx + Math.cos(a) * (R - 3.6), sy + Math.sin(a) * (R - 3.6)]); }
    s += `<circle cx="${sx}" cy="${sy}" r="${R}" fill="url(#${id}s)" ${OL(3.6)}/>`
      + `<circle cx="${sx}" cy="${sy}" r="${R - 7}" fill="#5e3a14" ${EN(1.2)}/><circle cx="${sx}" cy="${sy}" r="${R - 9}" fill="#7a4e1c"/>`
      + skRivets(rim, 1.5)
      + `<g fill="${G.M}" ${EN(0.8)}>${laurel}</g><path d="M${sx - 26} ${sy + 22} Q${sx} ${sy + 38} ${sx + 26} ${sy + 22}" fill="none" stroke="${G.M}" stroke-width="2"/>`
      + skLion(sx, sy - 2, 17, true)
      + `<path d="M${sx - 30} ${sy - 26} a38 38 0 0 1 20 -12" fill="none" stroke="${G.L}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`
      + skGrime(h >>> 3, sx - 34, sy - 30, 64, 60, 9, '#3a2408')
      + `<path d="M${sx + 18} ${sy + 14} l8 6 M${sx - 22} ${sy - 4} l-6 8" stroke="${G.L}" stroke-width="1.2" opacity=".7"/>`;   // царапины

    /* ── 12. ближний наплечник-лев (поверх груди) ── */
    const nearPauldron = `<path d="M-16 -128 Q-38 -138 -48 -118 Q-44 -104 -32 -104 Q-24 -112 -16 -114 Z" fill="url(#${id}h)" ${OL(2.8)}/>` + skLion(-32, -118, 9.6, true);   // кладётся поверх плеча руки (ниже)

    /* ── 13. ближняя рука с копьём — замахивается (плечо −24, −122) ── */
    let spear = `<path d="M-54 6 V-176" stroke="${L}" stroke-width="8" stroke-linecap="round"/><path d="M-54 6 V-176" stroke="#5a2e14" stroke-width="4.4" stroke-linecap="round"/>`
      + `<path d="M-54 -20 V-150" stroke="#7a4220" stroke-width="1.2"/>`
      + [-24, -60, -150, -170].map((y) => `<rect x="-58" y="${y}" width="8" height="5" rx="1.6" fill="${G.M}" ${EN(0.9)}/>`).join('')
      + `<path d="M-54 6 l-4 -8 h8 z" fill="${G.M}" ${OL(1.6)}/>`;   // подток
    // орёл-крылья под наконечником
    { let w = ''; for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { const x0 = -54 + sd * 3, len = 10 + i * 3.4, a = (-30 - i * 14) * Math.PI / 180, ex = x0 + sd * Math.cos(a) * len, ey = -174 + Math.sin(a) * len; w += `<path d="M${x0} -174 Q${f1((x0 + ex) / 2 + sd * 2)} ${f1((-174 + ey) / 2 + 4)} ${f1(ex)} ${f1(ey)} Q${f1((x0 + ex) / 2 - sd * 1)} ${f1((-174 + ey) / 2 - 2)} ${x0} -176 Z"/>`; }
      spear += `<g fill="url(#${id}h)" ${OL(1.6)}>${w}</g><path d="M-54 -168 q-4 -4 0 -10 q4 6 0 10 z" fill="${G.M}" ${EN(1)}/><circle cx="-54" cy="-178" r="3.4" fill="${G.L}" ${EN(1)}/>`; }   // орлиные крылья
    // наконечник листом
    spear += `<path d="M-54 -180 C-62 -190 -60 -206 -54 -222 C-48 -206 -46 -190 -54 -180 Z" fill="url(#${id}h)" ${OL(2.4)}/><path d="M-54 -184 V-216" ${EN(1.1)}/><path d="M-57 -194 l2 -10" stroke="${G.L}" stroke-width="1.6" stroke-linecap="round"/>`;
    s += `<g class="qb-arm" style="transform-origin:-24px -122px">${spear}`
      + skBone('M-24 -122 L-36 -98', 6.2) + skJoint(-36, -98, 4.6)
      + `<path d="M-38 -96 L-52 -108" stroke="${L}" stroke-width="12" stroke-linecap="round"/><path d="M-38 -96 L-52 -108" stroke="${G.M}" stroke-width="8" stroke-linecap="round"/><path d="M-42 -95 l-3 -6 M-47 -100 l-3 -5" ${EN(1.2)}/>`   // наруч
      + `<g fill="${SK.BONE}" stroke="${L}" stroke-width="1.8">${[-112, -107, -102].map((y, i) => `<rect x="-60" y="${y}" width="9" height="4.4" rx="2"/>`).join('')}</g><circle cx="-50" cy="-108" r="4.4" fill="${SK.BONE}" stroke="${L}" stroke-width="2"/>`
      + nearPauldron + '</g>';   // наплечник поверх плеча: кость руки не перечёркивает льва

    return s + '</g>';
  }
  /* ════════ конец вставки ════════ */
    return { skeleton, skullMissile };
    })();
    const skeleton = (o) => SKEL.skeleton(o);
    const SKULL = `<svg width="40" height="40" viewBox="-20 -20 40 40">${SKEL.skullMissile()}</svg>`;
    // разбойник: капюшон, повязка на лице, кинжал (замахивается); атаман — темнее и с золотым шнуром
    function bandit(o) {
      const c = o.boss ? '#4a2a2a' : '#5a4a3a';
      return `<g class="qb-idle">
      <path d="M-14 0 v-24 M14 0 v-24" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M-14 0 v-24 M14 0 v-24" stroke="#3a3040" stroke-width="7" stroke-linecap="round"/>
      <path d="M-34 -22 Q-40 -110 0 -118 Q40 -110 34 -22 Z" fill="${c}" ${O(3.4)}/>
      <path d="M-30 -60 H30" stroke="#8a6a3a" stroke-width="7"/><rect x="-6" y="-66" width="12" height="12" fill="#c8a04a" ${O(2)}/>
      <path d="M-30 -110 Q-34 -160 0 -164 Q34 -160 30 -110 Q20 -96 0 -98 Q-20 -96 -30 -110 Z" fill="#3a3040" ${O(3.4)}/>
      <path d="M-20 -126 Q0 -134 20 -126 V-112 Q0 -106 -20 -112 Z" fill="#e8c8a0" ${O(2.4)}/>
      <path d="M-20 -122 H20" stroke="#8a2a2a" stroke-width="8"/><circle cx="-8" cy="-126" r="3" fill="${INK}"/><circle cx="8" cy="-126" r="3" fill="${INK}"/>
      <g class="qb-arm" style="transform-origin:-30px -70px"><path d="M-30 -70 l-26 6" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M-30 -70 l-26 6" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M-58 -64 l-30 -14 l4 8 l26 10 Z" fill="#d8dce8" ${O(2.4)}/></g>
      ${o.boss ? `<path d="M-30 -150 q30 -26 60 0" stroke="#c8a04a" stroke-width="7" fill="none"/>` : ''}
      </g>`;
    }

    // каждый враг: draw(o) → SVG; o = { boss: вожак ли, seed: число для разнообразия }; top — рост (где полоска здоровья); scale — во сколько раз крупнее обычного
    /* ════════ Накрутчик (viewbot) / Ботоферма и Спам-бот (spambot) / Королева спама — стаи-отсылки к Twitch ════════
       Ноги в (0, 0), смотрят влево. Вид «Легиона»: светлая обводка, плоские цвета, тёмные провалы. Без <text> и фильтров. */
  const BT = {
    LINE: '#f5f2ff', INK: '#15122e',
    VIO: '#a970ff', VIO_L: '#d6c2ff', SCREEN: '#1b1530',
    CYAN: '#00e5ff', MAG: '#ff3df0', LIVE: '#ff3b5c',
    GOB: '#7fc46a', GOB_D: '#5a9a4a', PINK: '#ff8fc8', PINK_D: '#e0559a',
  };
  const bOL = (w) => `stroke="${BT.LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const bf = (v) => +(+v).toFixed(1);
  const bBits = (seed) => { let h = (seed >>> 0) ^ 0x7f4a7c15; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; return Math.imul(h ^ (h >>> 13), 0x297a2d39) >>> 0; };
  // конечность с обводкой: светлая подложка + цвет
  const bLimb = (d, col, w) => `<path d="${d}" fill="none" stroke="${BT.LINE}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // значок «глаз» — счётчик зрителей
  const bEyeIcon = (x, y, s, col) => `<path d="M${bf(x - 12 * s)} ${y} Q${x} ${bf(y - 10 * s)} ${bf(x + 12 * s)} ${y} Q${x} ${bf(y + 10 * s)} ${bf(x - 12 * s)} ${y} Z" fill="${col}" ${bOL(2.4)}/><circle cx="${x}" cy="${y}" r="${bf(4.2 * s)}" fill="${BT.SCREEN}"/><circle cx="${bf(x - 1.4 * s)}" cy="${bf(y - 1.4 * s)}" r="${bf(1.3 * s)}" fill="#fff"/>`;
  // пиксельный глитч
  const bGlitch = (h, x0, y0, w, hh, n) => { let s = ''; for (let i = 0; i < n; i++) { const a = (h >>> (i * 4)) & 15, b = (h >>> (i * 3 + 2)) & 15; s += `<rect x="${bf(x0 + a / 15 * w)}" y="${bf(y0 + b / 15 * hh)}" width="${4 + (a % 3) * 2}" height="3" fill="${i % 2 ? BT.CYAN : BT.MAG}" opacity=".85"/>`; } return s; };

  /* ── Накрутчик: серый безликий зритель-NPC ── */
  function viewbot(o) {
    o = o || {};
    if (o.boss) return botFarm(o);
    const h = bBits(o.seed || 0), L = BT.LINE;
    const hood = ['#8a8f9e', '#6f7486', '#9a9fae', '#7c7290'][h % 4], hoodD = '#4c5060', acc = (h >>> 3) % 3;
    let s = '<g class="qb-idle">';
    // шнур питания: из спины — к розетке далеко справа
    s += `<path d="M14 -62 C40 -60 34 -6 62 -4 L72 -4" fill="none" stroke="${L}" stroke-width="6" stroke-linecap="round"/><path d="M14 -62 C40 -60 34 -6 62 -4 L72 -4" fill="none" stroke="#2b2d3a" stroke-width="3" stroke-linecap="round"/>`
      + `<rect x="70" y="-9" width="11" height="10" rx="2" fill="#d6dbe4" ${bOL(2)}/><path d="M81 -6 h5 M81 -2 h5" stroke="#d6dbe4" stroke-width="2"/>`;
    // дальняя рука — висит
    s += bLimb('M18 -96 Q26 -78 24 -58', hood, 7) + `<circle cx="24" cy="-55" r="5" fill="#c9ccd6" ${bOL(2)}/>`;
    // ноги и ботинки (носком влево)
    s += `<rect x="-13" y="-42" width="9" height="36" rx="3" fill="#4a4e5e" ${bOL(2.4)}/><rect x="3" y="-42" width="9" height="36" rx="3" fill="#4a4e5e" ${bOL(2.4)}/>`
      + `<path d="M-4 -8 H-20 Q-24 -8 -24 -3 V0 H-4 Z M12 -8 H-2 Q-6 -8 -6 -3 V0 H12 Z" fill="#2b2d3a" ${bOL(2.2)}/>`;
    // толстовка: карман-кенгуру, шнурки
    s += `<path d="M-22 -40 L-24 -92 Q-24 -104 -12 -106 H12 Q24 -104 24 -92 L22 -40 Z" fill="${hood}" ${bOL(3)}/>`
      + `<path d="M-13 -66 H13 L15 -48 H-15 Z" fill="${hoodD}" opacity=".45"/><path d="M-6 -104 V-90 M4 -104 V-92" stroke="#e6e8ee" stroke-width="2" stroke-linecap="round"/>`
      + bGlitch(h, -20, -96, 34, 50, 4);
    // голова-капюшон с тёмным экраном вместо лица
    s += `<path d="M-24 -118 Q-26 -146 0 -146 Q24 -146 22 -118 Q22 -104 10 -102 H-14 Q-24 -104 -24 -118 Z" fill="${hood}" ${bOL(3)}/>`
      + `<ellipse cx="-4" cy="-121" rx="14" ry="13" fill="${BT.SCREEN}"/>`
      + `<g class="qb-eye"><rect x="-13" y="-126" width="5" height="5" fill="${BT.VIO}"/><rect x="-2" y="-126" width="5" height="5" fill="${BT.VIO}"/><path d="M-12 -114 H1" stroke="${BT.VIO}" stroke-width="2.4"/></g>`
      + `<path d="M-14 -130 q10 -4 20 0" fill="none" stroke="rgba(214,194,255,.25)" stroke-width="2"/>`;
    if (acc === 1) s += `<path d="M-24 -126 Q-24 -152 0 -152 Q24 -152 22 -126" fill="none" stroke="${L}" stroke-width="7"/><path d="M-24 -126 Q-24 -152 0 -152 Q24 -152 22 -126" fill="none" stroke="#2b2d3a" stroke-width="4"/><rect x="16" y="-132" width="10" height="16" rx="4" fill="#2b2d3a" ${bOL(2)}/>`;   // наушники
    if (acc === 2) s += `<path d="M-20 -140 Q-4 -156 20 -140 L22 -134 H-20 Z" fill="#3a3f52" ${bOL(2.4)}/><path d="M18 -136 h14 v4 h-14 z" fill="#3a3f52" ${bOL(2)}/>`;   // кепка козырьком назад
    // значок-«глаз» над головой: счётчик зрителей + красная точка «в эфире»
    s += bEyeIcon(-2, -164, 1, BT.VIO) + `<circle cx="13" cy="-170" r="3.4" fill="${BT.LIVE}" ${bOL(1.6)}/>`;
    // ближняя рука с телефоном — замахивается в ход врага (плечо −20, −96)
    s += `<g class="qb-arm" style="transform-origin:-20px -96px">` + bLimb('M-20 -96 Q-30 -86 -34 -74', hood, 7)
      + `<g transform="translate(-38 -78) rotate(-14)"><rect x="-6" y="-11" width="12" height="20" rx="2.4" fill="#2b2d3a" ${bOL(2)}/><rect x="-4" y="-8" width="8" height="13" rx="1" fill="${BT.VIO}"/><path d="M-2.6 -1.6 Q0 -4 2.6 -1.6 Q0 0.8 -2.6 -1.6 Z" fill="#fff"/></g>`
      + `<circle cx="-34" cy="-72" r="5" fill="#c9ccd6" ${bOL(2)}/></g>`;
    return s + '</g>';
  }

  /* ── Ботоферма (вожак накрутчиков): стойка с телефонами на ножках ── */
  function botFarm(o) {
    const h = bBits(o.seed || 0), L = BT.LINE;
    let s = '<g class="qb-idle">';
    // кабели к земле
    s += `<path d="M38 -60 C62 -50 58 -8 82 -4 M-38 -40 C-60 -34 -64 -8 -86 -4" fill="none" stroke="${L}" stroke-width="6" stroke-linecap="round"/><path d="M38 -60 C62 -50 58 -8 82 -4 M-38 -40 C-60 -34 -64 -8 -86 -4" fill="none" stroke="#2b2d3a" stroke-width="3" stroke-linecap="round"/>`
      + `<rect x="80" y="-9" width="11" height="10" rx="2" fill="#d6dbe4" ${bOL(2)}/><rect x="-97" y="-9" width="11" height="10" rx="2" fill="#d6dbe4" ${bOL(2)}/>`;
    // ножки-опоры
    s += `<rect x="-30" y="-22" width="12" height="20" rx="3" fill="#4a4e5e" ${bOL(2.4)}/><rect x="18" y="-22" width="12" height="20" rx="3" fill="#4a4e5e" ${bOL(2.4)}/>`
      + `<rect x="-36" y="-6" width="24" height="6" rx="3" fill="#2b2d3a" ${bOL(2)}/><rect x="12" y="-6" width="24" height="6" rx="3" fill="#2b2d3a" ${bOL(2)}/>`;
    // дальняя рука-манипулятор
    s += bLimb('M38 -120 L56 -100 L52 -78', '#6f7486', 7) + `<path d="M48 -78 l-4 8 M56 -78 l4 8" stroke="${L}" stroke-width="6" stroke-linecap="round"/><path d="M48 -78 l-4 8 M56 -78 l4 8" stroke="#c9ccd6" stroke-width="3" stroke-linecap="round"/>`;
    // стойка с полками телефонов
    s += `<rect x="-40" y="-152" width="80" height="132" rx="6" fill="#2b2d3a" ${bOL(3.4)}/>`;
    let ph = '';
    for (let r = 0; r < 4; r++) {
      const y = -146 + r * 31;
      ph += `<path d="M-36 ${y + 27} H32" stroke="#4a4e5e" stroke-width="3"/>`;
      for (let c = 0; c < 4; c++) {
        const x = -34 + c * 16, on = ((h >>> (r * 4 + c)) & 3) !== 0;
        ph += `<rect x="${x}" y="${y}" width="12" height="22" rx="2" fill="#15161e" stroke="#6f7486" stroke-width="1.2"/><rect x="${x + 1.6}" y="${y + 2}" width="8.8" height="16" rx="1" fill="${on ? BT.VIO : '#3a3f52'}"/>`
          + (on ? `<path d="M${x + 3} ${y + 10} Q${x + 6} ${y + 7.4} ${x + 9} ${y + 10} Q${x + 6} ${y + 12.6} ${x + 3} ${y + 10} Z" fill="#fff"/>` : `<path d="M${x + 3} ${y + 6} l6 8" stroke="#6f7486" stroke-width="1"/>`);
      }
    }
    s += ph;
    // столбик лампочек сбоку — мигают
    s += `<g class="qb-eye">${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="34.6" cy="${-142 + i * 22}" r="2.6" fill="${i % 3 === 1 ? BT.LIVE : '#46e07a'}"/>`).join('')}</g>`;
    // монитор-голова со злой рожей
    s += `<rect x="-34" y="-190" width="68" height="40" rx="6" fill="#4a4e5e" ${bOL(3.2)}/><rect x="-29" y="-185" width="58" height="30" rx="3" fill="${BT.SCREEN}"/>`
      + `<g class="qb-eye"><rect x="-22" y="-176" width="8" height="8" fill="${BT.VIO}"/><rect x="-4" y="-176" width="8" height="8" fill="${BT.VIO}"/></g>`
      + `<path d="M-24 -180 l10 3 M6 -180 l-10 3" stroke="${BT.VIO_L}" stroke-width="2.4" stroke-linecap="round"/>`
      + `<path d="M-20 -164 h4 v-3 h4 v3 h4 v-3 h4 v3 h4 v-3 h4 v3" fill="none" stroke="${BT.VIO}" stroke-width="2"/>`
      + bGlitch(h, -26, -184, 50, 26, 3)
      + `<rect x="-8" y="-152" width="16" height="4" fill="#4a4e5e"/>`;
    // коронованный глаз-счётчик
    s += bEyeIcon(0, -212, 1.5, BT.VIO)
      + `<path d="M-14 -226 l0 -12 l7 6 l7 -10 l7 10 l7 -6 l0 12 z" fill="#ffc94d" ${bOL(2.4)}/><circle cx="22" cy="-218" r="4" fill="${BT.LIVE}" ${bOL(1.8)}/>`;
    // ближняя рука-манипулятор — замахивается (плечо −38, −120)
    s += `<g class="qb-arm" style="transform-origin:-38px -120px">` + bLimb('M-38 -120 L-58 -104 L-66 -122', '#6f7486', 7)
      + `<circle cx="-58" cy="-104" r="5" fill="#c9ccd6" ${bOL(2)}/><path d="M-70 -124 l-4 -9 M-62 -126 l1 -10" stroke="${L}" stroke-width="6" stroke-linecap="round"/><path d="M-70 -124 l-4 -9 M-62 -126 l1 -10" stroke="#c9ccd6" stroke-width="3" stroke-linecap="round"/></g>`;
    return s + '</g>';
  }

  /* ── аватарка «милашки» на палочке: x, y — центр; hair — цвет волос; wink — подмигивает ── */
  function bAvatar(x, y, r, hair, wink) {
    const k = r / 22;
    const P = (dx, dy) => `${bf(x + dx * k)} ${bf(y + dy * k)}`;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffe4ef" ${bOL(3)}/>`
      + `<path d="M${P(-17, 10)} C${P(-22, -8)} ${P(-14, -20)} ${P(0, -20)} C${P(14, -20)} ${P(22, -8)} ${P(17, 10)} L${P(13, 14)} C${P(14, -2)} ${P(8, -12)} ${P(0, -12)} C${P(-8, -12)} ${P(-14, -2)} ${P(-13, 14)} Z" fill="${hair}"/>`
      + `<ellipse cx="${x}" cy="${bf(y + 3 * k)}" rx="${bf(11 * k)}" ry="${bf(12 * k)}" fill="#ffd9bf"/>`
      + (wink ? `<path d="M${P(-7, 0)} q${bf(3 * k)} ${bf(2.4 * k)} ${bf(6 * k)} 0" fill="none" stroke="${BT.INK}" stroke-width="${bf(1.6 * k)}" stroke-linecap="round"/>`
        : `<circle cx="${bf(x - 4 * k)}" cy="${y}" r="${bf(1.8 * k)}" fill="${BT.INK}"/>`)
      + `<circle cx="${bf(x + 4.4 * k)}" cy="${y}" r="${bf(1.8 * k)}" fill="${BT.INK}"/><path d="M${P(6, -2)} l${bf(2 * k)} ${bf(-2 * k)} M${P(5, -2.6)} l${bf(1 * k)} ${bf(-2.6 * k)}" stroke="${BT.INK}" stroke-width="${bf(0.9 * k)}"/>`
      + `<circle cx="${bf(x - 7 * k)}" cy="${bf(y + 5 * k)}" r="${bf(2.2 * k)}" fill="#ff9fb8" opacity=".8"/><circle cx="${bf(x + 7 * k)}" cy="${bf(y + 5 * k)}" r="${bf(2.2 * k)}" fill="#ff9fb8" opacity=".8"/>`
      + `<path d="M${P(-2.6, 8)} q${bf(2.6 * k)} ${bf(2.4 * k)} ${bf(5.2 * k)} 0 q${bf(-2.6 * k)} ${bf(-1.4 * k)} ${bf(-5.2 * k)} 0 z" fill="#e8336b"/>`
      + `<circle cx="${bf(x + 15 * k)}" cy="${bf(y + 15 * k)}" r="${bf(4 * k)}" fill="#46e07a" ${bOL(1.8)}/>`;   // зелёная точка «в сети»
  }
  const bHeart = (x, y, s, col) => `<path d="M${x} ${bf(y + 5 * s)} C${bf(x - 8 * s)} ${bf(y - s)} ${bf(x - 5 * s)} ${bf(y - 7 * s)} ${x} ${bf(y - 3 * s)} C${bf(x + 5 * s)} ${bf(y - 7 * s)} ${bf(x + 8 * s)} ${bf(y - s)} ${x} ${bf(y + 5 * s)} Z" fill="${col}" ${bOL(1.8)}/>`;
  // цепь из звеньев-«ссылок»
  const bChain = (pts) => pts.map(([x, y, a], i) => `<rect x="${bf(x - 5)}" y="${bf(y - 2.6)}" width="10" height="5.2" rx="2.6" fill="none" stroke="${BT.LINE}" stroke-width="3.4" transform="rotate(${a} ${x} ${y})"/><rect x="${bf(x - 5)}" y="${bf(y - 2.6)}" width="10" height="5.2" rx="2.6" fill="none" stroke="${i % 2 ? '#9aa3b5' : '#c9d2e6'}" stroke-width="1.8" transform="rotate(${a} ${x} ${y})"/>`).join('');
  // бумажный самолётик с сердечком
  const bPlane = (sc) => `<g transform="scale(${sc})"><path d="M-16 2 L16 -10 L4 12 L0 4 Z" fill="#fff" ${bOL(2)}/><path d="M16 -10 L0 4 L-4 12 L-2 3 Z" fill="#d9e4ff" ${bOL(1.6)}/>${bHeart(-4, -1, 0.6, BT.PINK_D)}</g>`;

  /* ── Спам-бот: красивое лицо «как на аватарке» — и гоблинское тело. Вожак — Королева спама (рыжая, в короне) ── */
  function spambot(o) { o = o || {}; return spamGirl(o, !!o.boss); }

  /* ── Королева спама (вожак): красивое лицо «как на аватарке» — и гоблинское тело ── */
  function spamGirl(o, boss) {
    const h = bBits(o.seed || 0), L = BT.LINE, SKIN = ['#ffe2d0', '#f6cdb0', '#e8b896'][(h >>> 5) % 3];
    const HAIR = boss ? '#e8622c' : ['#ffd36a', '#5a3a2a', '#2a1c1a', '#ff8fc8', '#b58cff'][h % 5], HAIR_D = 'rgba(80,20,10,.3)';
    const EYE = boss ? BT.MAG : ['#3f8cff', '#46b06a', '#8a5a2a'][(h >>> 3) % 3], TOP = boss ? BT.PINK : ['#fff', '#7fd6e6', '#ffe27a'][(h >>> 7) % 3];
    let s = '<g class="qb-idle">';
    // сердечки вокруг
    const hs = boss ? [[34, -176, 1.3], [50, -140, 1], [-62, -156, 1.1], [58, -100, 0.9], [-30, -192, 0.9]] : [[36, -160, 1], [-56, -150, 0.9], [48, -124, 0.8]].slice(0, 2 + ((h >>> 9) & 1));
    s += `<g class="qb-eye">${hs.map(([x, y, k]) => bHeart(x, y, k, BT.PINK)).join('')}</g>`;
    // пышные волосы за спиной — волнами до плеч
    s += `<path d="M-30 -126 C-40 -160 -12 -178 4 -176 C26 -176 38 -158 30 -128 C34 -112 36 -100 30 -90 C26 -96 22 -94 18 -100 C14 -96 10 -98 8 -104 L-18 -104 C-20 -98 -26 -96 -30 -100 C-34 -94 -40 -96 -40 -104 C-44 -112 -36 -118 -30 -126 Z" fill="${HAIR}" ${bOL(3)}/>`
      + `<path d="M-34 -110 q4 -6 0 -12 M30 -112 q-4 -6 0 -12 M24 -98 q-3 -5 0 -10" fill="none" stroke="${HAIR_D}" stroke-width="2.4" stroke-linecap="round"/>`;
    // ноги-коротышки в розовых шлёпках
    s += bLimb('M-10 -36 L-14 -6', BT.GOB, 8) + bLimb('M10 -36 L12 -6', BT.GOB, 8)
      + `<path d="M-4 -4 H-28 Q-30 0 -26 0 H-4 Z M20 -4 H-4 Q-6 0 -2 0 H20 Z" fill="${BT.PINK_D}" ${bOL(2)}/><circle cx="-20" cy="-4" r="2.6" fill="#fff"/><circle cx="4" cy="-4" r="2.6" fill="#fff"/>`;
    // дальняя рука с палкой для селфи — телефон смотрит на лицо
    if (boss) s += bLimb('M20 -86 Q34 -76 30 -62', BT.GOB, 8) + `<path d="M30 -64 L52 -132" stroke="${L}" stroke-width="5.4" stroke-linecap="round"/><path d="M30 -64 L52 -132" stroke="#2b2d3a" stroke-width="2.6" stroke-linecap="round"/>`
      + `<g transform="translate(54 -140) rotate(18)"><rect x="-8" y="-13" width="16" height="26" rx="3" fill="#2b2d3a" ${bOL(2)}/><rect x="-6" y="-10" width="12" height="19" rx="1.4" fill="${BT.PINK}"/>${bHeart(0, -1, 0.7, '#fff')}</g>`
      + `<circle cx="30" cy="-62" r="5.4" fill="${BT.GOB}" ${bOL(2)}/>`;   // палка для селфи
    else s += bLimb('M20 -86 Q34 -76 32 -58', BT.GOB, 8) + `<g transform="translate(38 -62) rotate(-12)"><rect x="-6" y="-11" width="12" height="20" rx="2.4" fill="#2b2d3a" ${bOL(2)}/><rect x="-4" y="-8" width="8" height="13" rx="1" fill="${BT.PINK}"/>${bHeart(0, -2, 0.5, '#fff')}</g><circle cx="32" cy="-56" r="5.4" fill="${BT.GOB}" ${bOL(2)}/>`;   // телефон в руке
    // пузатое гоблинское тело в розовой майке, пояс из цепи-ссылок
    s += `<path d="M-28 -38 Q-34 -72 -20 -92 Q0 -102 20 -92 Q34 -72 28 -38 Q0 -26 -28 -38 Z" fill="${BT.GOB}" ${bOL(3)}/>`
      + `<path d="M-20 -88 L-16 -44 Q0 -37 18 -44 L20 -88 Q10 -82 7 -92 H-7 Q-10 -82 -20 -88 Z" fill="${TOP}"/>` + bHeart(1, -66, 1.2, boss ? '#fff' : BT.PINK_D)
      + `<g fill="${BT.GOB_D}" opacity=".7"><circle cx="-24" cy="-60" r="2"/><circle cx="24" cy="-70" r="1.6"/><circle cx="-22" cy="-48" r="1.4"/></g>`   // бородавки
      + bChain([[-20, -44, 10], [-10, -42, -10], [0, -41, 10], [10, -42, -10], [20, -44, 10]]);
    // зелёная шея — тут «фильтр» заканчивается
    s += `<path d="M-8 -104 L-9 -92 H9 L8 -104 Z" fill="${BT.GOB}" ${bOL(2.4)}/>`;
    // острые гоблинские уши торчат из причёски
    s += `<path d="M-24 -128 l-16 -8 l8 16 z M16 -130 l18 -10 l-8 18 z" fill="${BT.GOB}" ${bOL(2.4)}/>`;
    // красивое лицо
    s += `<path d="M-22 -134 C-22 -150 -10 -156 -3 -156 C8 -156 16 -150 16 -134 C16 -118 8 -104 -3 -103 C-14 -104 -22 -118 -22 -134 Z" fill="${SKIN}" ${bOL(3)}/>`
      // чёлка-волна
      + `<path d="M-24 -136 C-22 -158 -2 -164 12 -154 C18 -150 20 -142 18 -134 C14 -144 6 -148 -2 -146 C-10 -144 -16 -140 -24 -136 Z" fill="${HAIR}" ${bOL(2.4)}/>`
      // брови дугой
      + `<path d="M-18 -138 q5 -4 10 -1 M0 -139 q5 -3 9 0" fill="none" stroke="#6a3a2a" stroke-width="1.8" stroke-linecap="round"/>`
      // глаза с длинными ресницами, смотрят влево
      + `<g class="qb-eye"><ellipse cx="-12" cy="-130" rx="4.4" ry="3.4" fill="#fff" stroke="${BT.INK}" stroke-width="1.2"/><ellipse cx="4" cy="-130" rx="4.2" ry="3.3" fill="#fff" stroke="${BT.INK}" stroke-width="1.2"/>`
      + `<circle cx="-13.4" cy="-130" r="2.4" fill="${EYE}"/><circle cx="2.6" cy="-130" r="2.3" fill="${EYE}"/><circle cx="-14" cy="-130.6" r=".9" fill="#fff"/><circle cx="2" cy="-130.6" r=".9" fill="#fff"/></g>`
      + `<path d="M-16.6 -132 l-3 -2.4 M-15 -133.4 l-2 -3 M-12.6 -134 l-.6 -3.4 M8.2 -132 l3 -2.4 M6.6 -133.4 l2 -3 M4.2 -134 l.6 -3.4" stroke="${BT.INK}" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M-16.6 -132 q4.4 -3.6 8.8 0 M-0.4 -132 q4.4 -3.4 8.6 0" fill="none" stroke="${BT.INK}" stroke-width="1.6"/>`
      // носик, румянец, родинка
      + `<path d="M-5 -126 q-2 4 1 5" fill="none" stroke="#d69a80" stroke-width="1.4" stroke-linecap="round"/>`
      + `<ellipse cx="-16" cy="-122" rx="3.6" ry="2.2" fill="#ff8fb0" opacity=".6"/><ellipse cx="8" cy="-122" rx="3.4" ry="2.1" fill="#ff8fb0" opacity=".6"/><circle cx="6" cy="-115" r="1" fill="#5a2a1a"/>`
      // глянцевые губы бантиком
      + `<path d="M-10 -114 Q-7 -117.4 -4 -115.4 Q-1 -117.4 2 -114 Q-4 -109 -10 -114 Z" fill="#e8336b" stroke="#a3123f" stroke-width="1"/><path d="M-7 -115 q2 -.8 4 0" stroke="#fff" stroke-width="1" opacity=".7"/>`
      // серьги-кольца
      + `<circle cx="-21" cy="-116" r="3.6" fill="none" stroke="#ffc94d" stroke-width="2"/><circle cx="15" cy="-117" r="3.4" fill="none" stroke="#ffc94d" stroke-width="2"/>`;
    // корона
    s += boss ? `<path d="M-14 -158 l0 -14 l7 7 l7 -12 l7 12 l7 -7 l0 14 z" fill="#ffc94d" ${bOL(2.6)}/><circle cx="0" cy="-166" r="2.6" fill="${BT.MAG}"/><circle cx="-9" cy="-161" r="1.6" fill="#c9f3ff"/><circle cx="9" cy="-161" r="1.6" fill="#c9f3ff"/>`
      : `<path d="M12 -156 l-9 -6 l0 11 z M12 -156 l9 -6 l0 11 z" fill="${BT.PINK_D}" ${bOL(2)}/><circle cx="12" cy="-156" r="2.4" fill="${BT.PINK}" ${bOL(1.4)}/>`;   // корона / бантик
    // ближняя рука с хлыстом из цепи ссылок — замахивается (плечо −20, −86)
    // ближняя рука — замахивается (плечо −20, −86): у королевы хлыст из цепи ссылок, у остальных — самолётик (рука ниже, в стороне от волос)
    const hx = boss ? -40 : -48, hy = boss ? -97 : -84;
    s += `<g class="qb-arm" style="transform-origin:-20px -86px">` + bLimb(boss ? 'M-20 -86 Q-32 -84 -40 -96' : 'M-20 -86 Q-34 -80 -48 -84', BT.GOB, 8)
      + (boss ? bChain([[-49, -98, 0], [-59, -100, -12], [-68, -106, -35], [-74, -115, -62], [-75, -126, -95], [-70, -135, -130]]) + `<path d="M-66 -142 l7 -1 l-3 6 z" fill="${BT.MAG}" ${bOL(1.4)}/>`
        : `<g transform="translate(-62 -88) rotate(-14)">${bPlane(0.85)}</g>`)
      + `<circle cx="${hx}" cy="${hy}" r="5.6" fill="${BT.GOB}" ${bOL(2)}/><path d="M${hx - 4} ${hy - 3} l2 -3" stroke="#ff5fb0" stroke-width="2.4" stroke-linecap="round"/></g>`;   // маникюр
    return s + '</g>';
  }
  // снаряд спам-бота: бумажный самолётик с сердечком ~40×40
  const spamPlane = () => bPlane(1.2);

    // снаряды (рисунок 40×40, центр — в середине; летит, вращаясь)
    // SKULL — снаряд скелета: новый (выше, вместе с рисунком скелета)
    const KNIFE = `<svg width="44" height="44" viewBox="-22 -22 44 44"><path d="M-16 4 L10 -6 L18 -4 L12 2 L-14 8 Z" fill="#d8dce8" ${O(2.4)}/><path d="M-20 6 l6 -3 l2 5 l-6 3 Z" fill="#6a4a30" ${O(2.2)}/></svg>`;

    // каждый враг: draw(o) → SVG; o = { boss: вожак ли, seed: число для разнообразия }; top — рост (где полоска здоровья); scale — во сколько раз крупнее обычного;
    // attacks — приём на каждый вид атаки; missile — снаряд для throw / spit / burst
    // 17.10: волк от коллеги (в замыкании — свои имена не пересекаются с остальными)
    // 17.10: тёмные стражи от коллеги (Врата башни) — Мотылёк-страж, Огнекрыл, Богомол-страж; в замыкании — свои имена
    const GUARDS = (function () {
  /* ════════ Тёмные стражи: Мотылёк, Огнекрыл, Богомол — для styles/legion/enemies.js ════════
     Вставить функции внутрь фабрики addPart('legion', 'enemies', …), а в возвращаемый объект — строки:
       mothGuard:   { draw: gMoth,   top: 250, attacks: { shield: 'swoop',  duck: 'throw', scatter: 'wave'  }, missile: { svg: gMothMissile() } },
       emberGuard:  { draw: gEmber,  top: 245, attacks: { shield: 'charge', duck: 'spit',  scatter: 'burst' }, missile: { svg: gEmberMissile() } },
       mantisGuard: { draw: gMantis, top: 228, attacks: { shield: 'leap',   duck: 'throw', scatter: 'lunge' }, missile: { svg: gMantisMissile() } },
     Новая стая «Тёмные стражи»: разработчику — добавить их в PACKS (modules/quest/battle.js).
     Лапы в (0, 0), смотрят влево. Отдельный, «взрослый» вид: без белой детской обводки, основной цвет — чёрный,
     тонкий холодный контур по силуэту, процедурный мех, перья усиков, светящиеся узоры (без filter — слоями).
     Слои: усики → ноги → крылья/плащ → руки (плечо спрятано под воротником) → воротник → голова. Ничего не растёт «из груди».
     По o.seed: разброс узоров, глазков, пучков меха и изгиба усиков. o.boss — аура, больше глазков, светящиеся глаза. */
  const GD = { INK: '#07050a', RIM: '#4a3f55' };
  const gf = (v) => +(+v).toFixed(1);
  const gRng = (seed) => { let a = ((seed >>> 0) ^ 0x9e3779b9) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const gLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function gSmooth(pts, closed) {   // сплайн Катмулла — Рома через точки
    const n = pts.length, P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = `M${gf(pts[0][0])} ${gf(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += `C${gf(p1[0] + (p2[0] - p0[0]) / 6)} ${gf(p1[1] + (p2[1] - p0[1]) / 6)} ${gf(p2[0] - (p3[0] - p1[0]) / 6)} ${gf(p2[1] - (p3[1] - p1[1]) / 6)} ${gf(p2[0])} ${gf(p2[1])}`;
    }
    return d + (closed ? 'Z' : '');
  }
  const gPoly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${gf(p[0])} ${gf(p[1])}`).join('') + 'Z';
  const gPath = (d, fill, op) => d ? `<path d="${d}" fill="${fill}"${op != null && op < 1 ? ` opacity="${op}"` : ''}/>` : '';
  const gShape = (d, fill, stroke, sw) => `<path d="${d}" fill="${fill}" stroke="${stroke || GD.RIM}" stroke-width="${sw || 1.2}" stroke-linejoin="round"/>`;
  const gLine = (d, col, w, op) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op != null && op < 1 ? ` opacity="${op}"` : ''}/>`;
  // сужающаяся прядь/коготь: из (x,y) под углом a, длина l, изгиб c, полуширина у корня w
  function gStrand(x, y, a, l, c, w) {
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    const ex = x + ca * l, ey = y + sa * l, mx = x + ca * l * .5 + nx * c, my = y + sa * l * .5 + ny * c;
    return `M${gf(x + nx * w)} ${gf(y + ny * w)}Q${gf(mx + nx * w * .45)} ${gf(my + ny * w * .45)} ${gf(ex)} ${gf(ey)}Q${gf(mx - nx * w * .45)} ${gf(my - ny * w * .45)} ${gf(x - nx * w)} ${gf(y - ny * w)}Z`;
  }
  function gAlong(pts) {
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const T = L[L.length - 1];
    return (t) => { const d = t * T; let i = 1; while (i < L.length - 1 && L[i] < d) i++;
      const u = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1), p = gLerp(pts[i - 1], pts[i], u);
      return [p[0], p[1], Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; };
  }
  // пучки меха вдоль линии; ang — угол или функция (t, x, y, касательная)
  function gFur(R, pts, n, len, w, ang, jit, curl) {
    const at = gAlong(pts); let d = '';
    for (let i = 0; i < n; i++) {
      const [x, y, tg] = at(Math.min(1, (i + R()) / n));
      const a = (typeof ang === 'function' ? ang(tg, x, y) : ang) + (R() - .5) * jit, l = len * (.55 + R() * .75);
      d += gStrand(x, y, a, l, (R() - .5) * curl * l, w * (.6 + R() * .6));
    }
    return d;
  }
  // конечность по суставам с полуширинами
  function gLimb(pts, ws) {
    const A = [], B = [];
    pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
      A.push([p[0] + nx * ws[i], p[1] + ny * ws[i]]); B.push([p[0] - nx * ws[i], p[1] - ny * ws[i]]); });
    return { d: gSmooth(A.concat(B.slice().reverse()), true), A, B };
  }
  // кисть с длинными когтями
  function gHand(R, x, y, a, n, len, spread, col, tip, curl) {
    let d = '', t = '';
    for (let i = 0; i < n; i++) {
      const aa = a + (i - (n - 1) / 2) * spread + (R() - .5) * .08, l = len * (i === 0 || i === n - 1 ? .72 : 1) * (.9 + R() * .2);
      const sx = x + Math.cos(aa) * 2.4, sy = y + Math.sin(aa) * 2.4;
      d += gStrand(sx, sy, aa, l, l * curl, 1.9);
      const ex = sx + Math.cos(aa) * l * .78, ey = sy + Math.sin(aa) * l * .78;
      t += gStrand(ex, ey, aa + curl * 1.1, l * .3, l * curl * .1, .9);
    }
    return `<ellipse cx="${gf(x)}" cy="${gf(y)}" rx="4.6" ry="3.8" fill="${col}" transform="rotate(${gf(a * 57.3)} ${gf(x)} ${gf(y)})"/>` + gPath(d, col) + gPath(t, tip);
  }
  // птичья нога с когтистой лапой; pts: колено → скакательный сустав → лодыжка
  function gLeg(R, pts, ws, col, fur, tip) {
    const lb = gLimb(pts, ws), [ax, ay] = pts[pts.length - 1];
    let s = gShape(lb.d, col, GD.RIM, 1);
    const hk = pts[1];
    s += gPath(gFur(R, [[hk[0] - 2, hk[1] - 10], [hk[0] + 1, hk[1]]], 9, 9, 1.3, 1.9, .5, .4), fur);
    let toes = '', claws = '', kn = '';
    [[2.42, 15], [2.76, 19], [3.02, 21], [.55, 8]].forEach(([a, l]) => {
      toes += gStrand(ax, ay, a, l, -l * .08, 2.2);
      const ex = ax + Math.cos(a) * l * .86, ey = ay + Math.sin(a) * l * .86;
      claws += gStrand(ex, ey, a > 1.6 ? a - .45 : a + .45, 6, a > 1.6 ? -1.2 : 1.2, 1.1);
      kn += `<circle cx="${gf(ax + Math.cos(a) * l * .45)}" cy="${gf(ay + Math.sin(a) * l * .45)}" r="1"/>`;
    });
    return s + gPath(toes, col) + `<g fill="${col}" stroke="${GD.RIM}" stroke-width=".5">${kn}</g>` + gPath(claws, tip);
  }
  // перистый усик моли (квадратичная кривая)
  function gAntenna(x0, y0, cx, cy, x1, y1, bw, cRach, cBarb, cFill) {
    const B = (t) => { const u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]; };
    const D = (t) => { const u = 1 - t; return Math.atan2(2 * u * (cy - y0) + 2 * t * (y1 - cy), 2 * u * (cx - x0) + 2 * t * (x1 - cx)); };
    const N = 44, A = [], Bs = []; let bar = '';
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = B(t), a = D(t), w = bw * Math.pow(Math.sin(Math.PI * Math.min(1, .1 + t * .9)), .6) * Math.min(1, t / .08);
      const l = [p[0] + Math.cos(a - 1.05) * w, p[1] + Math.sin(a - 1.05) * w], r = [p[0] + Math.cos(a + 1.05) * w, p[1] + Math.sin(a + 1.05) * w];
      A.push(l); Bs.push(r);
      if (i > 0 && i < N) bar += `M${gf(p[0])} ${gf(p[1])}L${gf(l[0])} ${gf(l[1])}M${gf(p[0])} ${gf(p[1])}L${gf(r[0])} ${gf(r[1])}`;
    }
    return gPath(gSmooth(A.concat(Bs.reverse()), true), cFill) + gLine(bar, cBarb, .7) + gLine(`M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`, cRach, 1.8);
  }
  // плащ-крыло полосами: Lf/Rf(v) — края сверху вниз, cuts — доли поперёк, рваный подол зубцами
  function gCloak(R, Lf, Rf, cuts, cols, hem, edge) {
    const N = 18, Ls = [], Rs = [];
    for (let i = 0; i <= N; i++) { Ls.push(Lf(i / N)); Rs.push(Rf(i / N)); }
    const at = (u, v) => { const i = Math.min(N - 1, Math.floor(v * N)), f = v * N - i; return gLerp(gLerp(Ls[i], Ls[i + 1], f), gLerp(Rs[i], Rs[i + 1], f), u); };
    let s = '';
    for (let k = 0; k < cuts.length - 1; k++) {
      const A = Ls.map((p, i) => gLerp(p, Rs[i], cuts[k])), B = Ls.map((p, i) => gLerp(p, Rs[i], cuts[k + 1]));
      const tip = gLerp(A[N], B[N], .5 + (R() - .5) * .3); tip[1] += hem * (.5 + R() * .9);
      s += `<path d="${gPoly(A.concat([tip], B.reverse()))}" fill="${cols[k % cols.length]}" stroke="${GD.INK}" stroke-width=".7" stroke-linejoin="round"/>`;
    }
    if (edge) s += gLine(gSmooth(Ls, false), edge, 1.3) + gLine(gSmooth(Rs, false), edge, 1.1);
    return { s, at };
  }
  // плащ из перьев-чешуек: ряды снизу вверх (верхние ложатся на нижние), цвет каждого пера — col(u, v, R)
  function gFeathers(R, Lf, Rf, col, fw, fl, rows, edge) {
    const at = (u, v) => gLerp(Lf(v), Rf(v), u);
    let s = '';
    for (let r = rows; r >= 0; r--) {
      const v = r / rows, a = at(0, v), b = at(1, v), w = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(w / fw));
      for (let i = 0; i < n; i++) {
        const u = (i + .5 + (r % 2 ? .5 : 0) * (i < n - 1 ? 1 : 0)) / n + (R() - .5) * .04, [x, y] = at(Math.min(1, Math.max(0, u)), v);
        const ww = fw * (.95 + R() * .45), l = fl * (.8 + R() * .5) * (r === rows ? 1.25 : 1), tilt = (u - .5) * 6 + (R() - .5) * 8;
        const c = col(u, v, R);
        s += `<path d="M${gf(-ww / 2)} 0Q${gf(-ww * .55)} ${gf(l * .62)} 0 ${gf(l)}Q${gf(ww * .55)} ${gf(l * .62)} ${gf(ww / 2)} 0Z" transform="translate(${gf(x)} ${gf(y - fl * .3)}) rotate(${gf(tilt)})" fill="${c}" stroke="${GD.INK}" stroke-width=".55"/>`;
        if (R() < .45) s += `<path d="M0 ${gf(l * .15)}L${gf((R() - .5) * 2)} ${gf(l * .8)}" transform="translate(${gf(x)} ${gf(y - fl * .3)}) rotate(${gf(tilt)})" stroke="#ffffff" stroke-opacity=".07" stroke-width=".9"/>`;
      }
    }
    const L = [...Array(12)].map((_, i) => at(0, i / 11)), Rr = [...Array(12)].map((_, i) => at(1, i / 11)).reverse();
    return { s: gPath(gSmooth(L.concat(Rr), true), '#0c090c') + gLine(gSmooth(L, false), edge || GD.RIM, 2.4, .9) + gLine(gSmooth(Rr, false), edge || GD.RIM, 2, .6) + s, at };
  }
  // дымные языки ауры вожака (вместо плоского овала)
  function gWisps(R, cx, cy, col, n, len) {
    let d = ''; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - .5) * 3.4; d += gStrand(cx + (R() - .5) * 30, cy + (R() - .5) * 40, a, len * (.5 + R() * .6), (R() - .5) * 40, 5 + R() * 6); }
    return gPath(d, col, .08);
  }
  // штрихи-ворсинки по плащу
  function gTexture(R, at, n, cols, len, ang) {
    const ds = cols.map(() => '');
    for (let i = 0; i < n; i++) { const [x, y] = at(.04 + R() * .92, .04 + R() * .9), k = i % cols.length;
      ds[k] += gStrand(x, y, (ang || Math.PI / 2) + (R() - .5) * .35, len * (.5 + R()), (R() - .5) * 2, .7); }
    return ds.map((d, k) => gPath(d, cols[k], .55)).join('');
  }
  // глазок на крыле моли
  const gEyeSpot = (x, y, r, rot, cream, red) => `<g transform="translate(${gf(x)} ${gf(y)}) rotate(${gf(rot)})"><ellipse rx="${gf(r * 1.3)}" ry="${gf(r * .82)}" fill="${GD.INK}"/><ellipse rx="${gf(r)}" ry="${gf(r * .62)}" fill="${cream}"/><ellipse rx="${gf(r * .56)}" ry="${gf(r * .44)}" fill="${red}"/><circle r="${gf(r * .22)}" fill="${GD.INK}"/><circle cx="${gf(-r * .2)}" cy="${gf(-r * .14)}" r="${gf(Math.max(.5, r * .1))}" fill="#fff"/></g>`;
  // светящееся кольцо (без filter: слои обводки)
  function gGlowRing(R, x, y, r, rot, cols) {
    const pts = [[0, -1.25], [.72, -.35], [.66, .42], [0, 1.1], [-.66, .42], [-.72, -.35]].map(([x, y]) => [x * r * (.92 + R() * .16), y * r * (.92 + R() * .16)]);
    const d = gSmooth(pts, true);
    return `<g transform="translate(${gf(x)} ${gf(y)}) rotate(${gf(rot)})"><path d="${d}" fill="#0b0709"/>${gLine(d, cols[0], r * .55 + 4, .16)}${gLine(d, cols[1], r * .22 + 2.4, .55)}${gLine(d, cols[2], 1.6)}</g>`;
  }
  const gGlowEye = (x, y, rx, ry, rot, halo, mid, core) => `<g transform="translate(${gf(x)} ${gf(y)}) rotate(${rot})"><ellipse rx="${gf(rx * 2.1)}" ry="${gf(ry * 2.1)}" fill="${halo}" opacity=".16"/><ellipse rx="${gf(rx * 1.45)}" ry="${gf(ry * 1.45)}" fill="${halo}" opacity=".32"/><ellipse rx="${rx}" ry="${ry}" fill="${mid}" stroke="${GD.INK}" stroke-width=".8"/><ellipse cx="${gf(-rx * .12)}" rx="${gf(rx * .6)}" ry="${gf(ry * .6)}" fill="${core}"/><ellipse cx="${gf(-rx * .3)}" cy="${gf(-ry * .3)}" rx="${gf(rx * .2)}" ry="${gf(ry * .16)}" fill="#fff" opacity=".85"/></g>`;

  /* ─── 1. Мотылёк-страж: красно-кремовый воротник, чёрные волосы, бледная маска, плащ с глазками ─── */
  function gMoth(o) {
    o = o || {};
    const boss = !!o.boss, R = gRng((o.seed || 0) * 7 + 11), CR = '#e4d6c0', RED = '#c8161e';
    let s = '<g class="qb-idle">';
    if (boss) s += gWisps(R, 0, -170, '#9a0c16', 34, 150) + gWisps(R, 0, -200, '#5a0610', 20, 110);
    s += `<ellipse cx="0" cy="1" rx="60" ry="6.5" fill="#000" opacity=".4"/>`;
    // усики-перья (основания спрячутся в волосах)
    const aj = (R() - .5) * 10, ab = boss ? 11 : 9;
    s += gAntenna(-16, -238, -36 + aj, -274, -52 + aj, -314, ab, '#d6c9b2', '#3a2c30', '#e8dfcd');
    s += gAntenna(-2, -240, 4, -278, 14 - aj, -318, ab, '#d6c9b2', '#3a2c30', '#e8dfcd');
    // ноги
    s += gLeg(R, [[-16, -46], [-25, -24], [-21, -7]], [6, 4, 3.4], '#0d090e', '#1c141c', '#5a4a52');
    s += gLeg(R, [[15, -46], [21, -24], [17, -7]], [6, 4, 3.4], '#0b080c', '#1c141c', '#5a4a52');
    // плащ-крылья из перьев: дальняя половина, затем ближняя (запах по центру)
    const mcol = (farSide) => (u, v, R) => {
      const k = R();
      if (farSide && u > .9) return k < .5 ? '#2a2226' : '#342b2f';
      if (farSide && u > .7) return k < .5 ? '#6a141b' : '#7e1c22';
      if (!farSide && u < .15) return k < .5 ? '#3a3034' : '#463b40';
      if (Math.abs(u - (farSide ? .3 + .2 * v : .62 - .3 * v)) < .12) return k < .5 ? '#47121a' : '#5a1820';
      if (Math.abs(v - .56 - (u - .5) * .3) < .05) return '#0e0a0d';
      return k < .33 ? '#1c1519' : k < .66 ? '#251d21' : '#2e2529';
    };
    const far = gFeathers(R, (v) => [3 + 8 * v + 2 * Math.sin(Math.PI * v), -172 + 132 * v], (v) => [34 + 32 * v + 10 * Math.sin(Math.PI * v * .9), -180 + 136 * v], mcol(true), 7, 21, 16);
    const near = gFeathers(R, (v) => [-36 - 30 * v - 7 * Math.sin(Math.PI * v * .9), -178 + 138 * v], (v) => [-2 + 9 * v + 3 * Math.sin(Math.PI * v), -170 + 134 * v], mcol(false), 7, 21, 16);
    s += far.s + near.s;
    s += gLine(gSmooth([...Array(10)].map((_, i) => near.at(1, i / 9)), false), GD.INK, 1.8, .8);   // тень у запаха
    // глазки
    const spots = (h, list) => list.map(([u, v, r]) => { const [x, y] = h.at(u + (R() - .5) * .06, v + (R() - .5) * .04); return gEyeSpot(x, y, r * (.85 + R() * .3), (R() - .5) * 40, CR, RED); }).join('');
    s += spots(near, [[.28, .3, 4], [.62, .46, 4.6], [.22, .62, 3.6], [.7, .74, 4.2], [.42, .86, 3.4], [.5, .16, 3]].concat(boss ? [[.84, .3, 3.2], [.14, .84, 3], [.82, .9, 3]] : []));
    s += spots(far, [[.26, .28, 3.6], [.5, .5, 4.2], [.3, .76, 3.6], [.62, .9, 3]].concat(boss ? [[.4, .14, 3], [.7, .66, 3.4]] : []));
    const big = far.at(.9, .56);
    s += `<g transform="translate(${gf(big[0])} ${gf(big[1])}) rotate(-8)"><ellipse rx="8" ry="13" fill="${GD.INK}"/><ellipse rx="6.2" ry="10.6" fill="${CR}"/><ellipse rx="4" ry="7.4" fill="${RED}"/><ellipse rx="2" ry="4" fill="${GD.INK}"/></g>`;
    // дальняя рука: выходит из-под воротника справа и держит край плаща
    const fa = gLimb([[28, -166], [36, -134], [26, -116], [12, -110]], [6, 4.4, 3.6, 3]);
    s += gShape(fa.d, '#0c080d', GD.RIM, 1) + gPath(gFur(R, [[31, -160], [36, -138]], 6, 7, 1, 0, .6, .4), '#1c141c');
    s += gHand(R, 10, -109, 2.2, 4, 12, .32, '#0c080d', '#6a5a60', .25);
    // ближняя рука (qb-arm): плечо под воротником, локоть в сторону, кисть с когтями свисает
    let arm = gShape(gLimb([[-32, -170], [-50, -156], [-64, -136], [-68, -116], [-70, -100]], [6.4, 5.6, 4.6, 3.8, 3.2]).d, '#0d090e', GD.RIM, 1.1);
    arm += gPath(gFur(R, [[-40, -166], [-62, -140]], 8, 8, 1.1, 2.2, .6, .4), '#1c141c');
    arm += gHand(R, -70, -98, Math.PI / 2 + .12, 4, 19, .26, '#0d090e', boss ? '#e8dcc8' : '#6a5a60', -.22);
    s += `<g class="qb-arm" style="transform-origin:-32px -170px">${arm}</g>`;
    // воротник: красный мех, кремовая бахрома снизу
    const ruff = [[-48, -188], [-42, -214], [-18, -228], [16, -228], [42, -214], [50, -188], [42, -164], [18, -150], [-14, -148], [-42, -160]];
    s += gShape(gSmooth(ruff, true), '#6a1014', '#2a0608', 1);
    { const pal = ['#6a0e12', '#8e161a', '#8e161a', '#a81e22', '#a81e22', '#c42a2a', '#d8463c'], items = [];
      for (let i = 0; i < 380; i++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()), x = Math.cos(a) * 44 * rr, y = -190 + Math.sin(a) * 30 * rr;
        items.push([y, gStrand(x, y, Math.PI / 2 + x / 44 * 1.0 + (R() - .5) * .25, 18 + R() * 16, 3 + R() * 4, .8 + R() * .7), pal[(R() * pal.length) | 0]]); }
      items.sort((a, b) => a[0] - b[0]); s += items.map(([, d, c]) => `<path d="${d}" fill="${c}"/>`).join(''); }
    s += gPath(gFur(R, ruff.concat([ruff[0]]), 70, 10, 1.6, (tg) => tg - Math.PI / 2, .7, .5), '#8a161a');   // пушистый край
    s += gPath(gFur(R, [[-46, -170], [-30, -156], [-10, -150], [12, -150], [32, -156], [48, -172]], 72, 16, 1.2, (tg, x) => Math.PI / 2 + x / 48 * .7, .5, .5), '#e6d8c8');
    s += gPath(gFur(R, [[-44, -168], [-28, -156], [-8, -151], [14, -151], [34, -158], [46, -172]], 22, 11, 1.3, (tg, x) => Math.PI / 2 + x / 48 * .7, .6, .5), '#d39e9a');
    s += gPath(gFur(R, [[-40, -172], [-20, -162], [0, -160], [22, -162], [40, -174]], 26, 9, 1.4, Math.PI / 2, .6, .5), '#7a1216', .9);
    // волосы: чёрная шапка сверху, голова утоплена в мех
    if (boss) { let cr = ''; [[-38, -232, -2.3], [-30, -246, -2], [-16, -254, -1.75], [2, -256, -1.45], [18, -252, -1.2], [32, -242, -.95], [40, -228, -.7]].forEach(([x, y, a]) => { cr += gStrand(x, y, a, 18 + R() * 10, (R() - .5) * 6, 2.6); }); s += gShape(cr, '#e4d6c0', '#2a2026', .8); }
    const cap = [[-34, -210], [-38, -230], [-26, -246], [-6, -253], [16, -249], [30, -235], [34, -214], [20, -206], [0, -208], [-18, -206]];
    s += gShape(gSmooth(cap, true), '#09060a', '#1a1420', 1) + gPath(gFur(R, cap.slice(6).concat([cap[0]]), 40, 22, 1.3, Math.PI / 2, .3, .4), '#09060a');
    s += gPath(gFur(R, [[-36, -232], [-26, -247], [-6, -254], [16, -250], [30, -236]], 60, 34, 1.5, (tg, x) => Math.PI / 2 + x / 30 * 1.2, .35, .35), '#0b080c');
    s += gPath(gFur(R, [[-30, -246], [-6, -252], [20, -248], [38, -230]], 26, 22, 1, (tg, x) => Math.PI / 2 + x / 40 * 1.1, .4, .5), '#2a2030', .8);
    // лицо: узкая бледная маска, смотрит влево
    const face = [[-27, -229], [-17, -238], [-5, -235], [-1, -221], [-5, -205], [-13, -196], [-21, -201], [-27, -215]];
    s += gShape(gSmooth(face, true), '#dacdb4', '#2a2228', .9);
    s += gPath(gSmooth([[-5, -234], [-1, -221], [-5, -205], [-12, -197], [-8, -210], [-7, -226]], true), '#b2a389');
    s += gPath(gSmooth([[-25, -224], [-19, -226], [-14, -222], [-19, -218]], true), '#3a1a1c', .5) + gPath(gSmooth([[-11, -225], [-6, -226], [-3, -222], [-8, -219]], true), '#3a1a1c', .45);   // глазницы
    s += `<path d="M-15 -211 l1.2 2 M-11 -211.4 l-.6 2" stroke="#6a5a52" stroke-width=".8" stroke-linecap="round"/>`;
    // борода-пучок под подбородком
    s += gPath(gFur(R, [[-20, -203], [-14, -198], [-8, -203]], 16, 18, 1.4, Math.PI / 2 + .1, .5, .5), '#0a070b');
    // пряди спереди: длинные слева, короче справа; лицо не закрывают
    s += gPath(gFur(R, [[-46, -214], [-42, -232], [-34, -242], [-26, -246]], 40, 96, 1.6, Math.PI / 2 + .1, .3, .2), '#08060a');
    s += gPath(gFur(R, [[-44, -220], [-30, -242]], 16, 84, .7, Math.PI / 2 + .08, .3, .25), '#2c2232', .85);
    s += gPath(gFur(R, [[10, -248], [30, -240], [44, -222], [46, -206]], 30, 56, 1.5, Math.PI / 2 - .1, .35, .25), '#08060a');
    s += gPath(gFur(R, [[16, -246], [40, -228]], 10, 46, .7, Math.PI / 2 - .1, .3, .25), '#2c2232', .85);
    s += gPath(gFur(R, [[-28, -232], [-27, -222]], 4, 26, .8, Math.PI / 2 + .05, .1, .1), '#08060a');
    // глаза
    const E = boss ? (x, y, rx, ry) => gGlowEye(x, y, rx, ry, -14, '#ff2a2a', '#d0141a', '#ff6a5a') : (x, y, rx, ry) => `<g transform="translate(${x} ${y}) rotate(-14)"><ellipse rx="${rx}" ry="${ry}" fill="#d0141a"/><circle r="1.1" fill="#200406"/><circle cx="-.9" cy="-.7" r=".5" fill="#fff"/></g>`;
    s += `<g class="qb-eye">${E(-19, -221, 3.4, 2.1)}${E(-8, -222, 2.9, 1.9)}</g>`;
    return s + '</g>';
  }

  /* ─── 2. Огнекрыл: чёрный капюшон-плащ с огненными кольцами, светящиеся нижние крылья ─── */
  function gEmber(o) {
    o = o || {};
    const boss = !!o.boss, R = gRng((o.seed || 0) * 13 + 5), GL = ['#ff5a14', '#ff8a24', '#ffd23a'];
    let s = '<g class="qb-idle">';
    if (boss) s += gWisps(R, 0, -150, '#ff5a14', 30, 140) + `<g transform="translate(-8 -222)"><circle r="40" fill="none" stroke="#ff5a14" stroke-width="10" opacity=".14"/><circle r="40" fill="none" stroke="#ff8a24" stroke-width="3" opacity=".6"/><circle r="40" fill="none" stroke="#ffd23a" stroke-width="1"/><circle r="31" fill="none" stroke="#ff8a24" stroke-width="1" stroke-dasharray="3 5" opacity=".7"/></g>`;
    s += `<ellipse cx="0" cy="1" rx="62" ry="6.5" fill="#000" opacity=".4"/>`;
    s += gAntenna(-12, -238, -30, -264, -42, -290, 8, '#5a4e62', '#120d11', '#3a3244');
    s += gAntenna(6, -240, 30, -262, 54, -270, 8, '#5a4e62', '#120d11', '#3a3244');
    // нижние крылья — светятся оранжевым из-под плаща
    const wing = (sx) => {
      const p = [[-30, -122], [-52, -96], [-70, -56], [-82, -20], [-76, 0], [-58, -4], [-44, -30], [-32, -76]].map(([x, y]) => [x * sx, y]);
      const q = [[-36, -106], [-52, -82], [-66, -46], [-74, -14], [-62, -10], [-48, -34], [-38, -70]].map(([x, y]) => [x * sx, y]);
      let w = `<path d="${gSmooth(p, true)}" fill="#ff6a1a" opacity=".14" stroke="#ff6a1a" stroke-width="7" stroke-opacity=".12"/>` + gShape(gSmooth(p, true), '#a83c14', '#e0702a', 1.2) + gPath(gSmooth(q, true), '#e8822a', .8);
      w += gPath(gFur(R, q.slice(1, 5), 20, 10, 2.4, Math.PI / 2, 1.2, .8), '#ffc04a', .55);
      w += [[-52, -40, 3], [-60, -22, 2.4], [-44, -64, 2.2]].map(([x, y, r]) => `<circle cx="${x * sx}" cy="${y}" r="${r}" fill="#5a1a0c" opacity=".7"/>`).join('');
      w += gLine(`M${-36 * sx} -90 Q${-50 * sx} -60 ${-62 * sx} -12 M${-40 * sx} -80 Q${-46 * sx} -50 ${-50 * sx} -10`, '#6a220c', .9, .7);
      return w;
    };
    s += wing(1) + wing(-1);
    s += gLeg(R, [[-14, -44], [-23, -24], [-19, -7]], [5.6, 3.8, 3.2], '#0d090e', '#1c141c', '#4a3e46');
    s += gLeg(R, [[14, -44], [20, -24], [16, -7]], [5.6, 3.8, 3.2], '#0b080c', '#1c141c', '#4a3e46');
    // плащ-капюшон из чёрных перьев, тлеющий подол
    const ecol = (u, v, R) => { const k = R(); if (v > .9 && k < .5) return '#2e1a14'; return k < .25 ? '#151014' : k < .5 ? '#1d161b' : k < .75 ? '#110d10' : '#251c22'; };
    const far = gFeathers(R, (v) => [2 + 8 * v, -192 + 150 * v], (v) => [22 + 36 * v + 12 * Math.sin(Math.PI * v * .9), -200 + 154 * v], ecol, 8, 19, 15);
    const near = gFeathers(R, (v) => [-24 - 32 * v - 10 * Math.sin(Math.PI * v * .9), -196 + 154 * v], (v) => [-1 + 8 * v + 3 * Math.sin(Math.PI * v), -190 + 150 * v], ecol, 8, 19, 15);
    s += far.s + near.s + gLine(gSmooth([...Array(10)].map((_, i) => near.at(1, i / 9)), false), '#000', 1.8, .8);
    // огненные кольца и шевроны
    const rings = (h, list) => list.map(([u, v, r]) => { const [x, y] = h.at(u + (R() - .5) * .05, v + (R() - .5) * .03); return gGlowRing(R, x, y, r, (R() - .5) * 30, GL); }).join('');
    const chev = (h, u, v, w) => { const a = h.at(u - w, v - .05), b = h.at(u, v), c = h.at(u + w, v - .05); const d = `M${gf(a[0])} ${gf(a[1])}Q${gf(b[0])} ${gf(b[1] + 4)} ${gf(c[0])} ${gf(c[1])}`; return gLine(d, GL[0], 5, .2) + gLine(d, GL[1], 2.4, .7) + gLine(d, GL[2], .9); };
    s += rings(near, [[.5, .2, 4], [.45, .46, 9], [.42, .74, 7]].concat(boss ? [[.18, .6, 4]] : [])) + chev(near, .45, .6, .25) + chev(near, .42, .88, .28);
    s += rings(far, [[.4, .14, 3.4], [.55, .38, 10], [.48, .68, 8]].concat(boss ? [[.8, .5, 4]] : [])) + chev(far, .52, .54, .3) + chev(far, .5, .84, .3);
    s += `<g transform="translate(-12 -170)"><circle r="7" fill="#d8f05a" opacity=".16"/><circle r="4.4" fill="#0b0709" stroke="#d8f05a" stroke-width="1.8"/></g>`;
    // искры
    s += [...Array(boss ? 14 : 7)].map(() => `<circle cx="${gf((R() - .5) * 110)}" cy="${gf(-20 - R() * 180)}" r="${gf(.6 + R() * 1.2)}" fill="${GL[1 + (R() * 2 | 0)]}" opacity="${gf(.5 + R() * .5)}"/>`).join('');
    // ближняя рука (qb-arm) вдоль бока, когти вниз; плечо под воротником
    let arm = gShape(gLimb([[-26, -180], [-44, -164], [-52, -136], [-54, -112], [-54, -98]], [6.2, 5.4, 4.4, 3.6, 3]).d, '#0d090e', GD.RIM, 1.1);
    arm += gPath(gFur(R, [[-36, -176], [-50, -150]], 10, 9, 1.6, Math.PI, .8, .5), '#141015');
    arm += gHand(R, -54, -96, Math.PI / 2 + .05, 4, 17, .24, '#0d090e', '#5a4a50', -.2);
    s += `<g class="qb-arm" style="transform-origin:-26px -180px">${arm}</g>`;
    // мохнатый воротник
    const col = [[-34, -186], [-26, -204], [0, -210], [26, -204], [34, -186], [18, -176], [-18, -176]];
    s += gShape(gSmooth(col, true), '#141015', '#2a2230', 1);
    s += gPath(gFur(R, col.concat([col[0]]), 60, 12, 2, (tg) => tg - Math.PI / 2, .9, .6), '#1d161c');
    s += gPath(gFur(R, [[-30, -184], [-10, -180], [10, -180], [30, -184]], 24, 12, 1.6, Math.PI / 2, .8, .6), '#2c2430');
    // голова в капюшоне: чёрная маска насекомого, горящие глаза
    const hood = [[-28, -196], [-30, -222], [-16, -242], [6, -244], [24, -228], [26, -200], [0, -198]];
    s += gShape(gSmooth(hood, true), '#120d11', GD.RIM, 1.2) + gPath(gFur(R, hood.slice(1, 6), 26, 7, 1.4, (tg) => tg - Math.PI / 2, .7, .5), '#120d11');
    const mask = [[-28, -224], [-17, -234], [-2, -228], [1, -212], [-10, -198], [-22, -204]];
    s += gShape(gSmooth(mask, true), '#08060a', '#2a2230', .9) + gLine('M-26 -222 Q-14 -230 -3 -226', '#2e2632', 1);
    s += `<g class="qb-eye">${gGlowEye(-19, -217, 5.4, 4, -28, GL[0], GL[0], GL[2])}${gGlowEye(-5, -218, 4.4, 3.6, -20, GL[0], GL[0], GL[2])}</g>`;
    return s + '</g>';
  }

  /* ─── 3. Богомол-страж: чёрное кимоно с зелёными ромбами, шипастые крылья со спиралями, рука-клинок ─── */
  function gMantis(o) {
    o = o || {};
    const boss = !!o.boss, R = gRng((o.seed || 0) * 17 + 3), GR = ['#2e5a22', '#8ab83a', '#c8e85a'], TE = '#2a8a8a';
    let s = '<g class="qb-idle">';
    if (boss) s += gWisps(R, 0, -150, '#6ad03a', 30, 140) + `<g transform="translate(-8 -212)"><circle r="36" fill="none" stroke="#8ad03a" stroke-width="9" opacity=".14"/><circle r="36" fill="none" stroke="#a8e04a" stroke-width="2.6" opacity=".6"/><circle r="36" fill="none" stroke="#e6ff9a" stroke-width=".9"/>${[...Array(8)].map((_, i) => `<path d="M0 -36 l3 -6 l-3 -6 l-3 6 Z" fill="#a8e04a" transform="rotate(${i * 45})"/>`).join('')}</g>`;
    s += `<ellipse cx="0" cy="1" rx="66" ry="6.5" fill="#000" opacity=".4"/>`;
    // усики-гребни
    const comb = (x0, y0, cx, cy, x1, y1) => {
      let t = '';
      for (let i = 2; i < 20; i++) { const k = i / 20, u = 1 - k, x = u * u * x0 + 2 * u * k * cx + k * k * x1, y = u * u * y0 + 2 * u * k * cy + k * k * y1;
        const a = Math.atan2(2 * u * (cy - y0) + 2 * k * (y1 - cy), 2 * u * (cx - x0) + 2 * k * (x1 - cx)) + 1.2; t += gStrand(x, y, a, 4 + 3 * Math.sin(Math.PI * k), 0, .8); }
      const d = `M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`;
      return gLine(d, '#0a1414', 4.4) + gLine(d, TE, 2.2) + gPath(t, '#5ac8b8');
    };
    s += comb(-8, -222, -18, -262, 4, -294) + comb(4, -222, 12, -262, 36, -282);
    // крылья за спиной: шипастый край, спирали, закрученные концы
    const wing = (sx, big) => {
      const k = big ? 1.08 : 1, P = (pts) => pts.map(([x, y]) => [x * sx * k, y]);
      const out = P([[-20, -132], [-40, -116], [-56, -90], [-68, -60], [-74, -36], [-70, -18]]);
      const body = P([[-20, -132], [-40, -116], [-56, -90], [-68, -60], [-74, -36], [-70, -18], [-58, -20], [-46, -40], [-34, -72], [-22, -104]]);
      const A = gAlong(out), saw = [];
      for (let i = 0; i <= 34; i++) { const [x, y, tg] = A(i / 34), o = i % 2 ? 2.5 + R() * 6 : 0, nA = tg + Math.PI / 2 * sx; saw.push([x + Math.cos(nA) * o, y + Math.sin(nA) * o]); }
      const inner = P([[-58, -20], [-46, -40], [-34, -72], [-22, -104]]);
      let w = gShape(gPoly(saw.concat(inner)), '#122016', '#4a7a3a', 1.1);
      w += gPath(gSmooth(P([[-24, -124], [-42, -104], [-56, -74], [-64, -44], [-60, -28], [-48, -46], [-34, -84]]), true), GR[0], .9);
      w += gPath(gSmooth(P([[-30, -112], [-46, -90], [-56, -62], [-58, -44], [-50, -50], [-38, -82]]), true), GR[1], .55);
      w += gPath(gSmooth(P([[-36, -100], [-48, -76], [-52, -60], [-46, -66], [-40, -86]]), true), GR[2], .35);
      w += gLine(P([[-22, -128], [-50, -86], [-66, -40]]).map((p, i) => `${i ? 'L' : 'M'}${gf(p[0])} ${p[1]}`).join('') + P([[-30, -110], [-60, -66]]).map((p, i) => `${i ? 'L' : 'M'}${gf(p[0])} ${p[1]}`).join(''), '#0e1a10', .9, .7);
      const c = P([[-54, -64]])[0];
      w += `<g fill="none" stroke="#1a3a14" stroke-width="2"><circle cx="${gf(c[0])}" cy="${c[1]}" r="9"/><circle cx="${gf(c[0])}" cy="${c[1]}" r="4.6"/></g><circle cx="${gf(c[0])}" cy="${c[1]}" r="1.8" fill="#1a3a14"/>`;
      w += `<path d="M${gf(-44 * sx * k)} -96 l${-4 * sx} 5 l${4 * sx} 5 l${4 * sx} -5 Z" fill="#1a3a14"/>`;
      const e = P([[-70, -18]])[0], d = `M${gf(e[0])} ${e[1]} C${gf(e[0] - 4 * sx)} -6 ${gf(e[0] + 10 * sx)} -2 ${gf(e[0] + 10 * sx)} -10 C${gf(e[0] + 10 * sx)} -16 ${gf(e[0] + 3 * sx)} -16 ${gf(e[0] + 4 * sx)} -11`;
      return w + gLine(d, '#0a1414', 6) + gLine(d, TE, 3.6) + gLine(d, '#5ac8b8', 1.2, .8);
    };
    s += wing(-1, true) + wing(1, false);
    s += gLeg(R, [[-12, -40], [-20, -22], [-16, -7]], [5, 3.6, 3], '#0b0d0e', '#121618', '#3a4a48');
    s += gLeg(R, [[12, -40], [18, -22], [14, -7]], [5, 3.6, 3], '#090b0c', '#121618', '#3a4a48');
    // нижняя часть кимоно и передняя панель с зигзагом-ромбами
    s += gShape('M-24 -112 Q-30 -70 -34 -30 L-20 -26 L-8 -32 L6 -26 L20 -32 L34 -28 Q30 -70 26 -112 Z', '#121418', '#3a4448', 1.2);
    s += gLine('M-16 -104 Q-20 -70 -22 -32 M18 -104 Q22 -70 24 -34', '#22282c', 1.4);
    s += gShape('M-9 -110 L-11 -30 L11 -30 L9 -110 Z', '#1a1e1a', '#3a4448', .9);
    let zz = 'M-6 -106', zz2 = 'M6 -106';
    for (let i = 0; i < 9; i++) { const y = -106 + i * 9 + 4.5; zz += ` L${i % 2 ? -6 : 6} ${y}`; zz2 += ` L${i % 2 ? 6 : -6} ${y}`; }
    s += gLine(zz, GR[1], 1.6) + gLine(zz2, GR[1], 1.6);
    for (let i = 0; i < 8; i++) s += `<path d="M0 ${-101 + i * 9} l2.6 4.5 l-2.6 4.5 l-2.6 -4.5 Z" fill="${i % 2 ? GR[2] : GR[1]}"/>`;
    // пояс
    s += gShape('M-25 -116 L26 -116 L26 -104 L-25 -104 Z', '#26401c', '#4a6a2a', 1) + gLine('M-25 -110 L26 -110', '#1a2e14', 1);
    // верх кимоно
    s += gShape('M-22 -168 Q-28 -140 -25 -116 L26 -116 Q29 -140 24 -168 Q0 -174 -22 -168 Z', '#121418', '#3a4448', 1.2);
    // отвороты с ромбиками
    const lap = (pts, n) => { let d = gShape(gPoly(pts), '#1e3a22', '#4a6a2a', .9); const A = gAlong([gLerp(pts[0], pts[3], .5), gLerp(pts[1], pts[2], .5)]);
      for (let i = 0; i < n; i++) { const [x, y] = A((i + .5) / n); d += `<path d="M${gf(x)} ${gf(y - 2.4)} l2 2.4 l-2 2.4 l-2 -2.4 Z" fill="${GR[1]}"/>`; } return d; };
    s += lap([[12, -170], [20, -168], [2, -116], [-6, -116]], 7) + lap([[-12, -170], [-4, -170], [-2, -140], [-8, -136]], 4);
    // кокетка с узором из ромбов на плечах
    for (let i = 0; i < 9; i++) { const x = -18 + i * 4.6, y = -164 + Math.abs(i - 4) * .6; if (x > -8 && x < 14) continue; s += `<path d="M${gf(x)} ${gf(y - 2.6)} l2.2 2.6 l-2.2 2.6 l-2.2 -2.6 Z" fill="${i % 2 ? GR[1] : '#4a7a2a'}"/>`; }
    s += gLine('M-22 -158 Q0 -160 24 -158', '#2e4a22', 1.2);
    // дальняя рука сложена на груди: рукав поперёк, когти видны у ближнего бока
    s += gShape('M24 -166 Q36 -150 30 -134 Q10 -128 -14 -130 L-16 -142 Q8 -142 16 -148 Q14 -160 18 -166 Z', '#14171b', '#3a4448', 1.1);
    s += gLine('M28 -146 l-6 4 l-6 -4 M14 -140 l-6 4 l-6 -4', GR[1], 1.1, .9);
    s += gHand(R, -18, -136, Math.PI - .25, 4, 11, .3, '#0a0c0d', '#3a4a48', -.25);
    // ближняя рука (qb-arm): широкий рукав от плеча, из него — рука-клинок богомола
    let arm = gShape('M-22 -168 Q-36 -160 -42 -140 Q-46 -124 -38 -116 L-26 -120 Q-24 -140 -14 -156 Z', '#14171b', '#3a4448', 1.1);
    arm += gLine('M-40 -132 l5 4 l5 -4 M-36 -146 l5 4 l5 -4', GR[1], 1.1, .9) + gLine('M-38 -118 L-27 -121', GR[1], 1.6);
    const fa = gLimb([[-34, -120], [-46, -104], [-56, -90]], [3.6, 3.2, 2.8]);
    arm += gShape(fa.d, '#0a0c0d', '#3a4a48', 1);
    let sp = ''; for (let i = 0; i < 6; i++) sp += gStrand(-36 - i * 3.6, -116 + i * 4.4, -2.3 + i * .05, 5, 0, 1);
    arm += gPath(sp, '#2a3a38');
    arm += gShape('M-56 -90 Q-70 -98 -76 -116 Q-66 -108 -54 -96 Z', '#1a2a28', '#5ac8b8', .9) + gLine('M-58 -92 Q-68 -100 -73 -112', '#8ae0d0', .7);
    arm += gHand(R, -56, -90, Math.PI / 2 + .3, 3, 12, .3, '#0a0c0d', '#3a4a48', -.25);
    s += `<g class="qb-arm" style="transform-origin:-22px -166px">${arm}</g>`;
    // шея с шипами, голова-треугольник, светящиеся глаза
    s += gShape('M-8 -186 L-6 -168 L8 -168 L10 -186 Z', '#0a0c0d', '#3a4a48', .9);
    let crest = ''; for (let i = 0; i < 7; i++) crest += gStrand(8 + i * 1.6, -214 + i * 6, -.5 + i * .08, 8 - i * .5, 0, 1.6);
    s += gPath(crest, '#1e4a4a');
    const head = [[-32, -201], [-22, -215], [-6, -223], [10, -219], [16, -206], [6, -192], [-14, -187]];
    s += gShape(gSmooth(head, true), '#0b0e0f', '#3a5a58', 1.1);
    s += gLine('M-30 -200 Q-20 -196 -12 -190 M-22 -194 l-2 4', '#2a3a3a', 1);
    s += gLine('M-20 -214 Q-6 -220 8 -216', '#1e2e2e', 1.2);
    const E = (x, y, rx, ry) => gGlowEye(x, y, rx, ry, -22, '#c8f04a', '#d8f05a', '#f4ffb0');
    s += `<g class="qb-eye">${E(-17, -206, 7, 4.4)}${E(3, -210, 4.6, 3.6)}</g>`;
    return s + '</g>';
  }

  // снаряды
  function gMothMissile() {
    return `<path d="M0 0 Q-14 -14 -18 -4 Q-14 6 0 0 Q14 -14 18 -4 Q14 6 0 0 Z" fill="#2a1a1e" stroke="#4a3f55" stroke-width="1"/>${gEyeSpot(-10, -4, 3, -20, '#e4d6c0', '#c8161e')}${gEyeSpot(10, -4, 3, 20, '#e4d6c0', '#c8161e')}<ellipse rx="2" ry="6" fill="#0a070b"/>`;
  }
  function gEmberMissile() {
    return `<circle r="15" fill="#ff5a14" opacity=".18"/><circle r="10" fill="#ff8a24" opacity=".5"/><circle r="6.4" fill="#ffb03a"/><circle r="3.4" fill="#fff2b0"/><path d="M8 -2 Q18 -6 24 0 Q18 6 8 2 Z" fill="#ff8a24" opacity=".6"/>`;
  }
  function gMantisMissile() {
    return `<path d="M-14 6 Q0 -18 16 -2 Q2 -10 -14 6 Z" fill="#8ab83a" stroke="#c8e85a" stroke-width="1.2" stroke-linejoin="round"/><path d="M-14 6 Q0 -18 16 -2" fill="none" stroke="#c8f04a" stroke-width="5" opacity=".2"/>`;
  }
  /* ════════ конец вставки ════════ */
      return { gMoth, gEmber, gMantis, gMothMissile, gEmberMissile, gMantisMissile };
    })();
    // 17.10 (3): волк v2 от коллеги — 7 окрасов по seed, вожак тёмный с серебряной гривой и ошейником
    const WOLF3 = (function () {
    // волк, версия 2: окрас по seed (7 вариантов), немного шерсти — воротник, светлый пучок на груди, щёки, кончик хвоста,
    // штрихи меха внутри силуэта (контур остаётся гладким); лапы с подушечками; ближняя передняя лапа замахивается (qb-arm).
    // Вожак: тёмный, серебряная грива, шрам над глазом (глаз открыт), красный глаз, золотой гребень, ошейник с шипами.
    const WOLF_COATS = [
      ['#7a7488', '#5a5468', '#a8a2b4', '#ffd34d'], // серый
      ['#8a6a4e', '#644a34', '#cbb08e', '#ffd34d'], // бурый
      ['#4e4a58', '#34303e', '#8e889a', '#ffb43a'], // угольный
      ['#d4d8e2', '#a2a8bc', '#f6f7fb', '#6ac8ff'], // снежный, голубые глаза
      ['#b4663c', '#7e4428', '#ecc8a2', '#ffe066'], // рыжий
      ['#5e7896', '#435a76', '#aabed2', '#ffd34d'], // стальной
      ['#7c68a0', '#5a4a7c', '#beb0d8', '#9cff8a'], // сумеречный, зелёные глаза
    ];
    function wolf(o) {
      const sd = (o.seed || 0) >>> 0, big = o.boss, sp = (1.1 + (sd % 7) / 10).toFixed(2);
      const [M, D, Lt, E] = big ? ['#3e3848', '#2a2634', '#cfcddc', '#ff4a3a'] : WOLF_COATS[(sd * 5 + 1) % WOLF_COATS.length];
      const fur = (w) => `fill="none" stroke="${D}" stroke-width="${w || 1.6}" stroke-linecap="round"`;
      const leg = (x, h, col) => `<path d="M${x} -3 v-${h}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M${x} -3 v-${h}" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`
        + `<path d="M${x + 4} -1 H${x - 8} Q${x - 10} -1 ${x - 10} -3 Q${x - 9} -6.6 ${x - 3} -6.6 H${x + 4} Z" fill="${col}" ${O(2.2)}/><path d="M${x - 6} -1.6 v-2 M${x - 2.4} -1.4 v-2.2" stroke="${INK}" stroke-width="1" stroke-linecap="round" opacity=".7"/>`;
      return `<g class="qb-idle" style="animation-duration:${sp}s">
      <path d="M60 -50 C80 -54 96 -68 100 -92 L104 -86 L106 -96 C114 -74 104 -50 84 -36 L70 -30 Z" fill="${M}" ${O(3)}/>
      <path d="M100 -92 L104 -86 L106 -96 C111 -86 110 -76 105 -66 C103 -75 102 -84 100 -92 Z" fill="${Lt}"/>
      <path d="M80 -50 q8 -6 12 -16 M88 -44 q8 -8 10 -18" ${fur()}/>
      ${leg(-10, 24, D)}${leg(30, 26, D)}${leg(50, 28, M)}
      <path d="M42 -46 q10 -6 16 2" ${fur()}/>
      <g class="qb-arm" style="transform-origin:-30px -34px">${leg(-30, 30, M)}</g>
      <path d="M-50 -40 Q-48 -78 0 -78 Q50 -82 66 -54 Q72 -30 52 -24 L-36 -22 Q-56 -24 -50 -40 Z" fill="${M}" ${O(3.4)}/>
      <path d="M-22 -74 Q10 -82 44 -74 Q58 -66 61 -56 Q40 -66 10 -66 Q-12 -66 -22 -74 Z" fill="${D}" opacity=".55"/>
      <path d="M-40 -28 Q0 -36 50 -29 Q50 -24 44 -24 L-34 -22.6 Q-42 -23 -40 -28 Z" fill="${Lt}" opacity=".9"/>
      <path d="M-6 -70 q6 4 12 2 M18 -72 q6 4 12 2 M38 -66 q5 4 10 3 M-24 -56 q4 5 10 5 M6 -52 q5 4 11 3 M26 -48 q4 4 10 3" ${fur()}/>
      <path d="M-60 -64 L-51 -97 L-39 -60 Z" fill="${D}" ${O(2.6)}/>
      <path d="M-79 -66 L-68 -100 L-55 -64 Z" fill="${M}" ${O(2.6)}/><path d="M-74.6 -70 L-68 -92 L-60.4 -70 Z" fill="${Lt}" opacity=".85"/>
      <path d="M-44 -64 Q-56 -78 -72 -77 Q-84 -75 -90 -65 Q-96 -61 -105 -59 L-113 -55.4 Q-117.4 -50 -112.6 -46.4 Q-108 -42.4 -100 -40.4 Q-90 -36.4 -76 -36.4 Q-60 -35.4 -46 -36 Z" fill="${M}" ${O(3.4)}/>
      <path d="M-104 -55.6 Q-92 -55 -82 -51.6 Q-76 -49 -72 -47 Q-84 -47 -96 -47.4 L-109 -48 Q-110.6 -52.4 -104 -55.6 Z" fill="${Lt}"/>
      <path d="M-108 -44.4 Q-98 -40.4 -84 -40 Q-76 -40 -70 -41.6 Q-78 -38 -92 -38.2 Q-102 -39.4 -108 -44.4 Z" fill="${Lt}"/>
      <path d="M-104.6 -47.2 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3 Z" fill="#fff" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>
      <path d="M-102 -47.2 l1.2 5 l1.8 -5 Z M-90 -47 l1 3.8 l1.6 -3.8 Z" fill="#fff" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
      <path d="M-110.4 -47.6 Q-104 -46.8 -96 -47.2 Q-86 -47.2 -80 -47.8 Q-75 -48.6 -72 -51" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-105 -44.2 Q-96 -43.6 -86 -44" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M-99 -59.4 q3 2 6.4 1.4 M-95 -61.6 q3 2 6.4 1.4 M-91 -63.6 q2.6 1.6 5.6 1.2" fill="none" stroke="${D}" stroke-width="1.3" stroke-linecap="round"/>
      <ellipse cx="-112.4" cy="-52" rx="4.6" ry="3.6" fill="${INK}"/><ellipse cx="-113.6" cy="-53.4" rx="1.4" ry=".9" fill="#fff" opacity=".7"/><path d="M-110 -49 q1.6 1.4 1 3" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M-89 -63 Q-81 -70.4 -70 -70.6" fill="none" stroke="${D}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M-62 -73 q4 -2.4 8 0 M-66 -56 q-4 4 -3 9 M-76 -40 q7 -2.6 13 1" ${fur(1.3)}/>
      <g class="qb-eye"><path d="M-86 -60 Q-79 -66.4 -70 -65 Q-74 -57.6 -86 -60 Z" fill="${E}" ${O(1.4)}/><circle cx="-76.6" cy="-62" r="1.7" fill="${INK}"/></g>
      ${big ? `<path d="M-82 -72.4 l5 6.4" stroke="#e8a0a8" stroke-width="2" stroke-linecap="round"/><path d="M-81.4 -70 l2.6 -.8" stroke="#e8a0a8" stroke-width="1.4" stroke-linecap="round"/>` : ''}
      <path d="M-54 -70 Q-46 -80 -30 -77 L-26 -72 L-20 -75 L-18 -66 L-12 -69 Q-15 -53 -30 -45 L-35 -50 L-40 -41 L-45 -49 L-51 -43 Q-59 -56 -54 -70 Z" fill="${big ? Lt : M}" ${O(3)}/>
      <path d="M-46 -72 q6 4 6 12 M-36 -70 q6 4 6 12 M-26 -66 q4 4 3 10" ${fur(1.4)}/>
      <path d="M-49 -63 L-56 -57 L-51.6 -55 L-57.4 -49 L-50 -49.4 L-53 -42 L-45 -46 Z" fill="${Lt}" ${O(2.2)}/>
      <path d="M-50 -46 L-58 -40 L-52 -39 L-56 -31 L-48 -35 L-45 -27 L-41 -38 Q-45 -45 -50 -46 Z" fill="${Lt}" ${O(2.4)}/>
      ${big ? `<path d="M-44 -75 l6 -14 l6 12 l6 -14 l6 14" fill="#ffc94d" ${O(2)}/>
      <path d="M-56 -62 Q-44 -50 -38 -38" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-56 -62 Q-44 -50 -38 -38" fill="none" stroke="#6a4228" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M-55 -57 l-7 -1 l4 5 Z M-49 -50 l-6 2 l5 4 Z M-44 -43 l-5 4 l6 2 Z" fill="#d8dce8" ${O(1.4)}/>` : ''}
      </g>`;
    }
      return wolf;
    })();
    const WOLF2 = (function () {   // 17.10 (2): тёмные волки — Дымный волк, вожак — Многоглазый
  /* ════════ Тёмные волки: Дымный волк / Многоглазый вожак — для styles/legion/enemies.js ════════
     Вставить функции внутрь фабрики addPart('legion', 'enemies', …), а в возвращаемый объект — строку
     (заменяет прежнего волка, id тот же):
       wolf: { draw: wolf, top: 150, attacks: { shield: 'lunge', duck: 'leap', scatter: 'wave' } },
     Профиль, крадётся с опущенной головой, смотрит влево, лапы на y = 0. Тёмный вид, но в стиле игры: светлая обводка «Легиона» единым силуэтом, плоские цвета с одной тенью.
     Обычный — дымный волк: фиолетово-чёрное тело с дымкой по краю, языки тёмного пламени на спине, голове, хвосте и
       лапах, лапы растекаются дымными лужами, розовые светящиеся глаза и метка-завиток над глазом.
     Вожак (o.boss) — Многоглазый: угольно-чёрный, гладкий силуэт без пушистого контура, по всему телу открытые малиновые глаза,
       главный глаз на морде, розовый язык, клыки, высоко поднятый закрученный хвост.
     Единый силуэт: сначала дымка/обводка для всех частей, потом заливки — внутренних линий на стыках нет.
     По o.seed: высота и изгиб языков пламени, раскладка глаз, длина осколков. */
  const vf = (v) => +(+v).toFixed(1);
  const vRng = (seed) => { let a = ((seed >>> 0) ^ 0x85ebca6b) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function vSmooth(pts, closed) {
    const n = pts.length, P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = `M${vf(pts[0][0])} ${vf(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += `C${vf(p1[0] + (p2[0] - p0[0]) / 6)} ${vf(p1[1] + (p2[1] - p0[1]) / 6)} ${vf(p2[0] - (p3[0] - p1[0]) / 6)} ${vf(p2[1] - (p3[1] - p1[1]) / 6)} ${vf(p2[0])} ${vf(p2[1])}`;
    }
    return d + (closed ? 'Z' : '');
  }
  function vStrand(x, y, a, l, c, w) {
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, ex = x + ca * l, ey = y + sa * l, mx = x + ca * l * .5 + nx * c, my = y + sa * l * .5 + ny * c;
    return `M${vf(x + nx * w)} ${vf(y + ny * w)}Q${vf(mx + nx * w * .45)} ${vf(my + ny * w * .45)} ${vf(ex)} ${vf(ey)}Q${vf(mx - nx * w * .45)} ${vf(my - ny * w * .45)} ${vf(x - nx * w)} ${vf(y - ny * w)}Z`;
  }
  function vLimb(pts, ws) {
    const A = [], B = [];
    pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      A.push([p[0] - Math.sin(ang) * ws[i], p[1] + Math.cos(ang) * ws[i]]); B.push([p[0] + Math.sin(ang) * ws[i], p[1] - Math.cos(ang) * ws[i]]); });
    return vSmooth(A.concat(B.reverse()), true);
  }
  // контур замкнутой фигуры точками (для осколков и глаз по телу)
  function vRing(pts, n) {
    const L = [0]; for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const T = L[L.length - 1], out = [];
    for (let k = 0; k < n; k++) { const d = k / n * T; let i = 1; while (L[i] < d) i++;
      const a = pts[i - 1], b = pts[i % pts.length], u = (d - L[i - 1]) / (L[i] - L[i - 1]);
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])]); }
    return out;
  }
  // язык тёмного пламени: столбик вверх с волной, сужается к кончику
  function vFlame(R, x, y, h, w, lean) {
    const N = 12, A = [], B = [], ph = R() * 6, k = 1.2 + R() * 1.2, amp = w * (.4 + R() * .6);
    for (let i = 0; i <= N; i++) { const t = i / N, cx = x + Math.sin(ph + t * k * Math.PI) * amp * t + lean * h * t, cy = y - h * t, ww = w * Math.pow(1 - t, .75) + .25;
      A.push([cx - ww, cy]); B.push([cx + ww, cy]); }
    return vSmooth(A.concat(B.reverse()), true);
  }
  // дымная лужа под лапой
  function vPuddle(R, x, w) {
    const p = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, k = .78 + R() * .45; p.push([x + Math.cos(a) * w * k, -.5 + Math.sin(a) * 4.2 * k]); }
    return vSmooth(p, true);
  }
  // открытый глаз вожака: миндалина, малиновая радужка, вертикальный зрачок
  const vEye = (x, y, r, rot) => `<g transform="translate(${vf(x)} ${vf(y)}) rotate(${vf(rot)})"><path d="M${vf(-r * 1.5)} 0Q0 ${vf(-r * 1.15)} ${vf(r * 1.5)} 0Q0 ${vf(r * 1.15)} ${vf(-r * 1.5)} 0Z" fill="#e0186a" opacity=".22"/><path d="M${vf(-r)} 0Q0 ${vf(-r * .78)} ${r} 0Q0 ${vf(r * .78)} ${vf(-r)} 0Z" fill="#f8cce6" stroke="#b0145e" stroke-width=".8"/><circle r="${vf(r * .42)}" fill="#e0186a"/><ellipse rx="${vf(Math.max(.4, r * .1))}" ry="${vf(r * .36)}" fill="#120008"/><circle cx="${vf(-r * .16)}" cy="${vf(-r * .16)}" r="${vf(Math.max(.35, r * .1))}" fill="#fff"/></g>`;

  function wolf(o) {
    o = o || {};
    const boss = !!o.boss, R = vRng((o.seed || 0) * 31 + (boss ? 7 : 1));
    const LINE = '#f5f2ff', OL = 5;   // светлая обводка «Легиона»: единая подложка под всеми частями
    // план тела: плотный корпус, глубокая грудь, крупная опущенная голова
    const torso = [[-46, -86], [-20, -96], [14, -94], [42, -90], [58, -78], [58, -56], [44, -46], [14, -48], [-18, -46], [-40, -44], [-56, -56], [-56, -76]];
    const head = [[-50, -88], [-66, -90], [-80, -80], [-94, -62], [-108, -46], [-108, -36], [-96, -30], [-80, -32], [-64, -42], [-48, -56]];
    const earN = [[-78, -80], [-77, -106], [-63, -86]], earF = [[-67, -88], [-59, -109], [-52, -92]];
    const tailPts = boss ? [[54, -84], [74, -108], [84, -136], [76, -162], [58, -174], [42, -170]] : [[54, -84], [72, -98], [88, -112], [96, -130], [92, -146]];
    const tailW = boss ? [10, 12, 12, 10, 6, 2.5] : [10, 13, 14, 11, 5];
    const legs = {
      farF: [[-22, -56], [-30, -32], [-40, -9], [-47, -3]], farH: [[30, -60], [44, -36], [44, -18], [41, -3]],
      nearH: [[44, -60], [60, -36], [60, -16], [57, -3]], nearF: [[-38, -58], [-48, -34], [-60, -9], [-68, -3]],
    };
    const LW = [10, 7.4, 6, 6.2];
    const farA = [vLimb(legs.farF, LW), vLimb(legs.farH, LW)], farD = farA.join(''), nearHD = vLimb(legs.nearH, LW);
    const bodyA = [vLimb(tailPts, tailW), vSmooth(earF, true), vSmooth(torso, true), vSmooth(head, true), vSmooth(earN, true)], bodyD = bodyA.join('');
    const each = (arr, c) => arr.map((d) => `<path d="${d}" fill="${c}"/>`).join('');
    const out = (d, w) => `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${w || OL}" stroke-linejoin="round" stroke-linecap="round"/>`;
    let s = '<g class="qb-idle">';

    if (!boss) {
      /* ── Дымный волк: плоские цвета, светлая обводка, тёмное пламя ── */
      const CORE = '#2e1739', SHADE = '#1b0c25', TIP = '#4e2c64', PINK = '#ff4ad8';
      const fl = [];
      [[-40, -88, 30], [-24, -95, 46], [-4, -96, 34], [16, -95, 50], [36, -91, 38], [52, -82, 26]].forEach(([x, y, h]) => fl.push(vFlame(R, x, y + 6, h * (.8 + R() * .4), 7 + R() * 2.4, .3 + R() * .2)));
      fl.push(vFlame(R, -62, -86, 18 + R() * 8, 5, .15));
      [[92, -142, 28, 6], [96, -128, 22, 6], [86, -112, 18, 5]].forEach(([x, y, h, w]) => fl.push(vFlame(R, x, y, h * (.85 + R() * .3), w, .2)));
      const flD = fl.join('');
      const pud = [[-47, 12], [41, 12], [57, 14]].map(([x, w]) => vPuddle(R, x, w)).join('');
      // 1) единая светлая подложка  2) дальние лапы тенью  3) тело  4) детали
      s += `<path d="${pud}" fill="${SHADE}" stroke="${LINE}" stroke-width="2.6"/>`;
      s += out(bodyD + flD + farD + nearHD);
      s += each(farA, SHADE) + each(fl, CORE) + each([nearHD].concat(bodyA), CORE);
      s += fl.map((d) => `<path d="${d}" fill="${TIP}" opacity=".35" transform="translate(0 -1)"/>`).join('');
      // плоская тень брюха и под челюстью
      s += `<path d="${vSmooth([[-50, -56], [-20, -52], [14, -54], [44, -52], [56, -60], [40, -47], [14, -48], [-18, -46], [-40, -45]], true)}" fill="${SHADE}"/>`;
      s += `<path d="${vSmooth([[-104, -36], [-90, -36], [-74, -40], [-62, -48], [-70, -38], [-84, -32], [-98, -31]], true)}" fill="${SHADE}"/>`;
      // шерсть: короткие светлые штрихи (как на референсе)
      s += `<path d="M-74 -96 L-70 -86 M-60 -100 L-57 -92 M-58 -60 l-6 5 l3 1 l-5 5 M-44 -78 q6 10 2 20 M-30 -74 l-4 6 M40 -84 q10 10 8 24 M50 -74 l4 6 M-46 -28 q-3 8 -5 16 M52 -32 q2 8 0 14 M-92 -40 q6 2 12 -2 M-4 -86 l3 -5 M20 -84 l3 -5" fill="none" stroke="${TIP}" stroke-width="1.1" stroke-linecap="round"/>`;
      // ближняя передняя лапа (qb-arm): от плеча, с собственной обводкой и лужицей
      const nf = vLimb(legs.nearF, LW), np = vPuddle(R, -68, 13);
      s += `<g class="qb-arm" style="transform-origin:-38px -58px"><path d="${np}" fill="${SHADE}" stroke="${LINE}" stroke-width="2.6"/>${out(nf)}<path d="${nf}" fill="${CORE}"/><path d="M-50 -32 q-5 8 -8 16 M-64 -6 l-3 3 M-60 -5 l-2 3" fill="none" stroke="${TIP}" stroke-width="1.1" stroke-linecap="round"/></g>`;
      // плечо поверх стыка лапы — чтобы лапа шла из плеча
      s += `<path d="${vSmooth([[-54, -74], [-40, -80], [-28, -70], [-32, -54], [-46, -50], [-56, -60]], true)}" fill="${CORE}"/>`;
      // глаза и метка-завиток
      const glow = (x, y, rx, ry, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="${vf(rx * 2.2)}" ry="${vf(ry * 2.6)}" fill="${PINK}" opacity=".22"/><path d="M${-rx} 0Q0 ${-ry * 1.5} ${rx} 0Q0 ${ry} ${-rx} 0Z" fill="${PINK}"/><ellipse cx="${vf(-rx * .1)}" rx="${vf(rx * .28)}" ry="${vf(ry * .32)}" fill="#ffe0f8"/></g>`;
      const mark = 'M-84 -65 C-80 -72 -88 -76 -82 -84 C-78 -90 -82 -94 -78 -98';
      s += `<g class="qb-eye">${glow(-88, -56, 6.6, 2.8, 28)}${glow(-75, -61, 5, 2.4, 30)}<path d="${mark}" fill="none" stroke="${PINK}" stroke-width="6" stroke-linecap="round" opacity=".2"/><path d="${mark}" fill="none" stroke="${PINK}" stroke-width="2.6" stroke-linecap="round"/><path d="${mark}" fill="none" stroke="#ffe0f8" stroke-width=".9" stroke-linecap="round"/></g>`;
      s += `<ellipse cx="-106" cy="-43" rx="3" ry="2.2" fill="#0e0612"/><path d="M-106 -35 q8 2 16 -1" fill="none" stroke="#0e0612" stroke-width="1.2" stroke-linecap="round"/>`;
      return s + '</g>';
    }

    /* ── Многоглазый вожак: чёрный, рваные осколки меха, глаза по телу ── */
    const CORE = '#0c0610', SHADE = '#05020a', RIM = '#7a1050';
    const shards = [];
    const jag = (pts, n, len, w, bias) => vRing(pts, n).forEach(([x, y, tg]) => {
      const a = (tg - Math.PI / 2) * .55 + bias * .45 + (R() - .5) * .5;
      shards.push(vStrand(x, y, a, len * (.5 + R() * .9), (R() - .5) * 4, w * (.8 + R() * .5)));
    });
    const shD = shards.join('');
    const claws = [[-47, -3], [41, -3], [57, -3]].map(([x, y]) => [0, 1, 2].map((i) => vStrand(x + 2 - i * 2.8, y, Math.PI - .2 - i * .25, 9 + i, -1.6, 1.6)).join('')).join('');
    s += `<ellipse cx="0" cy="1" rx="70" ry="6" fill="#000" opacity=".35"/>`;
    s += out(bodyD + shD + farD + nearHD + claws);
    s += `<path d="${claws}" fill="#2a1420"/>` + each(farA, SHADE) + each(shards, CORE) + each([nearHD].concat(bodyA), CORE);
    // складки и внутренний малиновый отсвет на осколках
    s += `<path d="M-40 -82 l8 6 l-2 8 M-14 -90 l6 8 M12 -88 l4 10 l-4 6 M38 -84 l6 10 M52 -74 l4 12 M-48 -66 l-4 10 M28 -60 l6 6 M70 -120 l6 4 M80 -146 l5 2" fill="none" stroke="${RIM}" stroke-width="1.2" stroke-linecap="round"/>`;
    const eyes = [[-40, -76, 3.6, -30], [-26, -86, 3, -20], [-12, -74, 4.4, -10], [2, -88, 3.2, 0], [14, -76, 5, 10], [30, -86, 3.4, 15], [40, -70, 4.2, 30], [50, -80, 2.8, 35], [-30, -58, 2.8, -40], [4, -60, 3, 0], [26, -58, 2.6, 10],
      [74, -118, 3.6, 60], [80, -142, 3.2, 90], [72, -160, 3.4, 130], [56, -168, 2.6, 160], [64, -96, 2.6, 40], [52, -40, 2.6, 75], [50, -22, 2.4, 80], [36, -30, 2.2, 80], [-26, -36, 2.2, 80]];
    s += `<g class="qb-eye">${eyes.map(([x, y, r, a]) => vEye(x + (R() - .5) * 2, y + (R() - .5) * 2, r * (1.25 + R() * .3), a + (R() - .5) * 16)).join('')}`;
    s += vEye(-82, -60, 9, 30) + vEye(-70, -74, 3.8, 10) + vEye(-83, -76, 3, 40) + vEye(-62, -62, 3.4, 60) + vEye(-95, -52, 2.8, 30) + vEye(-58, -80, 2.6, 0) + '</g>';
    // пасть: клыки и розовый язык с обводкой
    s += `<path d="M-107 -34 Q-96 -30 -84 -33" fill="none" stroke="${RIM}" stroke-width="1.2"/><path d="M-104 -33.6 l1.2 3.6 l1.4 -3.4 M-99 -33 l1 3.2 l1.2 -3 M-93 -32.4 l1 3 l1.2 -2.8 M-88 -32.6 l.8 2.4 l1 -2.2" fill="#fff4f8" stroke="#fff4f8" stroke-width=".4" stroke-linejoin="round"/>`;
    const tg = 'M-99 -31 C-102 -21 -100 -12 -93 -11 C-87 -11 -86 -19 -89 -31 Z';
    s += out(tg, 3.6) + `<path d="${tg}" fill="#e070d0"/><path d="M-94 -29 L-94 -16" stroke="#a83a9e" stroke-width=".9"/><ellipse cx="-97" cy="-21" rx="1.2" ry="2.6" fill="#f8b8f0"/>`;
    s += `<ellipse cx="-107" cy="-43" rx="3" ry="2.2" fill="#2a1420" stroke="${RIM}" stroke-width=".6"/>`;
    // ближняя передняя лапа (qb-arm)
    let leg = '';
    const ring = legs.nearF.map((q) => [q[0] + 6, q[1]]).concat(legs.nearF.slice().reverse().map((q) => [q[0] - 6, q[1]]));
    const nc = [0, 1, 2].map((i) => vStrand(-66 - i * 2.8, -3, Math.PI - .2 - i * .25, 9 + i, -1.6, 1.6)).join('');
    const legAll = vLimb(legs.nearF, LW) + leg;
    s += `<g class="qb-arm" style="transform-origin:-38px -58px">${out(legAll + nc)}<path d="${nc}" fill="#2a1420"/><path d="${vLimb(legs.nearF, LW)}" fill="${CORE}"/>${leg ? `<path d="${leg}" fill="${CORE}"/>` : ''}${vEye(-50, -34, 3.4, 70)}</g>`;
    s += `<path d="${vSmooth([[-54, -74], [-40, -80], [-28, -70], [-32, -54], [-46, -50], [-56, -60]], true)}" fill="${CORE}"/>${vEye(-42, -66, 3.4, -20)}`;
    return s + '</g>';
  }
  /* ════════ конец вставки ════════ */

      return wolf;
    })();
    // 17.10: жабы от коллеги — жаба-ронин, жаба-маг (каждая третья), вожак — Жабий сёгун; снаряд — сюрикен
    const TOAD = (function () {
  /* ════════ Жаба-ронин / Жаба-маг / Жабий сёгун — для styles/legion/enemies.js ════════
     Вставить функции внутрь фабрики addPart('legion', 'enemies', …), а в возвращаемый объект — строку:
       toad: { draw: toad, top: 168, attacks: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, missile: { svg: shuriken() } },
     Новая стая: разработчику — добавить toad в PACKS (modules/quest/battle.js) или отдать рисунок стае bandit.
     Вид спереди в три четверти (как на референсах), лапы в (0, 0), повёрнута влево. Вид «Легиона»: светлая обводка.
     Порядок слоёв продуман так, чтобы детали не наползали: концы шарфа и плащ → ноги → рубаха → руки от плеч →
     шарф поверх стыков плеч → голова. Оружие уходит вниз-вбок, мимо тела и лица.
     По o.seed: цвет кожи (8), цвет шарфа, оттенок рубахи; каждая третья — жаба-маг (шляпа, плащ, посох с фонарём, вода).
     Вожак (o.boss): Жабий сёгун — шляпа-каса, красный шарф, наплечники, нодати, красные глаза, шрам над глазом. */
  const TD = { LINE: '#f5f2ff', INK: '#15122e', BRASS: '#c9a24a', LEATHER: '#6b4228', LEATHER_D: '#4a2c18', PANTS: '#2a282e', PANTS_D: '#1c1a20', STEEL: '#d0d6de', WATER: '#7f9aa8', IRIS: '#3a2416' };
  const tf = (v) => +(+v).toFixed(1);
  const tBits = (seed) => { let h = (seed >>> 0) ^ 0x6c8e9cf5; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; return Math.imul(h ^ (h >>> 13), 0x297a2d39) >>> 0; };
  // кожа: [основной, тень, светлый]
  const TSKIN = [['#d9452e', '#a32e1e', '#f08a6a'], ['#5aa04a', '#3e7a32', '#9acb7a'], ['#3a8ad6', '#2a62a0', '#8ac0ec'], ['#e8c23a', '#b8902a', '#f6dc86'],
    ['#8a4ab0', '#64328a', '#b88ad6'], ['#f07a2a', '#c0561a', '#f8a870'], ['#3aaaa0', '#26807a', '#8ad6ce'], ['#8a6a4a', '#5e4630', '#b89a76']];
  const TSCARF = [['#3a3236', '#26202a'], ['#2e3a5a', '#1e2840'], ['#5a2a2a', '#3e1a1a'], ['#3e4a2e', '#2a3220']];
  const TOL = (w) => `stroke="${TD.LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const tp = (d, fill, w) => `<path d="${d}" fill="${fill}" ${TOL(w || 2.6)}/>`;

  // лапа: четыре длинных пальца с круглыми подушечками; dir = −1 — пальцы влево, 1 — вправо
  function tFoot(x, dir, c, cd) {
    const X = (v) => tf(x + dir * v);
    const d = `M${X(4)} -12 Q${X(-1)} -6 ${X(-8)} -4 L${X(-24)} -7 Q${X(-27)} -5 ${X(-24)} -3 L${X(-12)} -1 L${X(-25)} 2 Q${X(-27)} 5 ${X(-23)} 5 L${X(-10)} 2 L${X(-18)} 7 Q${X(-19)} 10 ${X(-15)} 9 L${X(-4)} 3 L${X(1)} 7 Q${X(4)} 8 ${X(5)} 4 Q${X(8)} -4 ${X(4)} -12 Z`;
    return tp(d, c, 2.2) + `<g fill="${cd}"><circle cx="${X(-25)}" cy="-5" r="1.7"/><circle cx="${X(-25)}" cy="3.6" r="1.7"/><circle cx="${X(-17)}" cy="8.2" r="1.6"/><circle cx="${X(2.6)}" cy="6" r="1.4"/></g>`;
  }
  // кисть: ладонь и длинные пальцы, обхватывает рукоять
  const tHand = (x, y, c, cd, dir) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}" ${TOL(2)}/><path d="M${x + dir * 2} ${y + 3} q${dir * 3} 4 ${dir * 1} 7 M${x - dir * 1} ${y + 4} q${dir * 1} 4 ${dir * -1} 7" fill="none" stroke="${TD.LINE}" stroke-width="4.6" stroke-linecap="round"/><path d="M${x + dir * 2} ${y + 3} q${dir * 3} 4 ${dir * 1} 7 M${x - dir * 1} ${y + 4} q${dir * 1} 4 ${dir * -1} 7" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x + dir * 3}" cy="${y + 10}" r="1.4" fill="${cd}"/>`;

  // оружие: рукоять в (0,0), клинок «вверх» (−y); поворот задаётся снаружи
  const tWeap = {
    katana: () => `<rect x="-2" y="0" width="4" height="17" rx="1.6" fill="${TD.PANTS}" ${TOL(1.8)}/><path d="M-2 3 l4 2.4 M-2 7 l4 2.4 M-2 11 l4 2.4" stroke="#9a2a2a" stroke-width="1.1"/><ellipse cy="-1" rx="5.4" ry="2" fill="${TD.BRASS}" ${TOL(1.4)}/><path d="M-2.2 -2 L-2.6 -44 Q-2 -54 3.4 -58 Q2.6 -48 2.4 -2 Z" fill="${TD.STEEL}" ${TOL(1.8)}/><path d="M0.6 -4 Q1 -40 2.6 -54" fill="none" stroke="#fff" stroke-width=".8" opacity=".9"/><path d="M-6 6 q-3 8 0 14 M-4 7 q-1 7 2 12" fill="none" stroke="#a0442a" stroke-width="1.6" stroke-linecap="round"/>`,
    nodachi: () => `<rect x="-2.2" y="0" width="4.4" height="22" rx="1.6" fill="#5a1a1a" ${TOL(2)}/><path d="M-2 3 l4 2.4 M-2 8 l4 2.4 M-2 13 l4 2.4 M-2 18 l4 2.4" stroke="${TD.BRASS}" stroke-width="1"/><ellipse cy="-1.2" rx="7" ry="2.4" fill="${TD.BRASS}" ${TOL(1.6)}/><path d="M-2.6 -2 L-3.2 -64 Q-2 -76 4.4 -80 Q3.4 -66 2.8 -2 Z" fill="${TD.STEEL}" ${TOL(2)}/><path d="M0.8 -4 Q1.2 -58 3.2 -74" fill="none" stroke="#fff" stroke-width=".9" opacity=".9"/>`,
    lantern: () => `<path d="M0 34 L0 -78 Q1 -88 8 -90 Q13 -86 8 -80" fill="none" stroke="${TD.LINE}" stroke-width="7.4" stroke-linecap="round"/><path d="M0 34 L0 -78 Q1 -88 8 -90 Q13 -86 8 -80" fill="none" stroke="#8a5a32" stroke-width="4" stroke-linecap="round"/>`
      + `<path d="M-2 -60 h4 M-2 -55 h4 M-2 -50 h4" stroke="#c8c4dc" stroke-width="1.6"/><path d="M8 -80 V-72" stroke="${TD.INK}" stroke-width="1.1"/>`
      + `<g class="qb-eye"><circle cx="8" cy="-62" r="11" fill="#c87af0" opacity=".28"/><path d="M2 -70 H14 L15 -58 Q8 -53 1 -58 Z" fill="#b06ad8" ${TOL(1.6)}/><rect x="2" y="-72" width="12" height="3" rx="1" fill="#5a3a5a"/><circle cx="8" cy="-62" r="3" fill="#f0c8ff"/></g>`
      + `<path d="M6 -53 q-4 5 1 9 q4 4 -1 9" fill="none" stroke="#b06ad8" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>`,
  };

  function toad(o) {
    o = o || {};
    const boss = !!o.boss, h = tBits(o.seed || 0), L = TD.LINE;
    const mage = !boss && (h >>> 14) % 3 === 0;
    const [SK, SKD, SKL] = boss ? ['#a0874a', '#6e5a2e', '#cdb47a'] : TSKIN[h % TSKIN.length];
    const [SC, SCD] = boss ? ['#8a1e22', '#5a1216'] : mage ? ['#3e4a6a', '#2c3650'] : TSCARF[(h >>> 3) % TSCARF.length];
    const SHIRT = boss ? '#2e2a32' : mage ? '#c8c4dc' : ['#e8dcc0', '#e6d8bc', '#ddd2bc', '#e8d6b4'][(h >>> 6) % 4];
    const SHIRT_D = boss ? '#1e1a22' : mage ? '#9a96b4' : '#b8a888';
    let s = '<g class="qb-idle">';

    /* 1. фон: лужица, вода у мага, концы шарфа / плащ */
    s += `<ellipse cx="0" cy="2" rx="44" ry="6" fill="${TD.WATER}" opacity=".45"/><path d="M-36 3 q6 -2 12 0 M16 4 q5 -1.6 10 0" stroke="#c8dce4" stroke-width="1" opacity=".6"/>`;
    if (mage) s += `<g fill="none" stroke-linecap="round"><path d="M-46 -2 C-56 -22 -44 -40 -30 -32 C-20 -26 -28 -16 -34 -20 M34 -2 C48 -10 54 -30 40 -38 C32 -42 26 -32 32 -28" stroke="${L}" stroke-width="5"/><path d="M-46 -2 C-56 -22 -44 -40 -30 -32 C-20 -26 -28 -16 -34 -20 M34 -2 C48 -10 54 -30 40 -38 C32 -42 26 -32 32 -28" stroke="#8ad0f0" stroke-width="2.6"/></g><g fill="#bfe8fa"><circle cx="-50" cy="-40" r="1.6"/><circle cx="50" cy="-44" r="1.4"/><circle cx="-38" cy="-46" r="1.2"/></g>`;
    if (mage) {   // плащ в пятнах, рваный край
      s += tp('M-26 -108 C-40 -84 -42 -50 -38 -30 L-30 -36 L-24 -26 L-16 -34 L-8 -24 L2 -32 L12 -24 L22 -32 L30 -24 L38 -34 L46 -26 L50 -40 C48 -70 38 -98 24 -110 Z', SC, 2.8)
        + `<g fill="${SK}" opacity=".5">${[[38, -60, 3.4, 2], [44, -44, 2.6, 1.6], [-34, -56, 2.6, 1.6], [-30, -40, 2, 1.3], [40, -78, 2, 1.3]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>`;
    } else {   // концы шарфа развеваются в обе стороны
      s += tp('M16 -108 C34 -108 46 -98 51 -80 C55 -64 53 -50 58 -38 L51 -41 L49 -34 C44 -50 45 -66 40 -80 C36 -92 27 -98 14 -100 Z', SC, 2.6)
        + tp('M22 -100 C36 -92 42 -78 43 -62 C44 -54 42 -48 45 -42 L40 -44 L37 -38 C36 -50 38 -64 32 -78 C28 -88 22 -94 16 -96 Z', SCD, 2.4)
        + (boss ? '' : `<g fill="${SK}" opacity=".85"><circle cx="46" cy="-86" r="1.8"/><circle cx="50" cy="-66" r="1.5"/><circle cx="53" cy="-50" r="1.4"/><circle cx="41" cy="-60" r="1.2"/></g>`);
    }

    /* 2. ноги: широкие штаны, обмотки, лапы врозь */
    s += tp('M-26 -62 Q-31 -40 -24 -22 Q-22 -15 -18 -12 L-6 -12 Q-4 -20 -4 -30 Q-2 -46 0 -62 Z', TD.PANTS, 2.6)
      + tp('M0 -62 Q4 -46 6 -30 Q6 -20 8 -12 L20 -12 Q24 -16 24 -24 Q28 -40 24 -62 Z', TD.PANTS_D, 2.6)
      + `<path d="M-14 -56 Q-18 -40 -14 -22 M14 -56 Q18 -40 14 -24" fill="none" stroke="#3e3c44" stroke-width="1.6" stroke-linecap="round"/>`
      + `<rect x="-19" y="-15" width="14" height="6" rx="1.8" fill="${TD.LEATHER_D}" ${TOL(1.6)}/><rect x="7" y="-15" width="14" height="6" rx="1.8" fill="${TD.LEATHER_D}" ${TOL(1.6)}/><path d="M-17 -12 h10 M9 -12 h10" stroke="#2a1a10" stroke-width=".8"/>`
      + tFoot(-11, 1, SK, SKD) + tFoot(14, -1, SKD, SK);

    /* 3. туловище: рубаха (у мага — длинная мантия), тёмная вставка, полы ниже пояса */
    if (mage) s += tp('M-26 -66 L-30 -30 L-20 -34 L-14 -26 L-4 -32 L4 -26 L12 -32 L22 -28 L26 -66 Z', SHIRT, 2.6) + `<path d="M-12 -62 L-14 -32 M8 -62 L10 -30" stroke="${SHIRT_D}" stroke-width="1.4"/>`;
    else s += tp('M-28 -66 L-31 -50 L-20 -53 L-17 -66 Z', SHIRT, 2.2) + tp('M18 -66 L20 -52 L30 -50 L28 -66 Z', SHIRT, 2.2);
    s += tp(`M-24 -102 Q-32 -84 -29 -64 L28 -64 Q31 -84 24 -102 Q0 -108 -24 -102 Z`, SHIRT, 3);
    s += `<path d="M-9 -103 L-3 -66 L9 -66 L8 -103 Z" fill="${boss ? '#5a1216' : TD.PANTS}"/><path d="M-9 -103 L-3 -66" stroke="${SHIRT_D}" stroke-width="1.4"/>`;
    if (!boss && !mage) s += `<g fill="${SK}">${[[-18, -92, 2.6, 2], [-22, -78, 2.2, 2.8], [16, -94, 2.4, 1.8], [20, -80, 2.8, 2.2], [14, -72, 1.6, 1.6], [-16, -70, 1.6, 1.4]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>`;
    // ремни с латунными пряжками и свисающие завязки
    s += tp('M-29 -72 Q0 -67 28 -72 L28 -64 Q0 -59 -29 -64 Z', TD.LEATHER, 2)
      + `<rect x="-14" y="-73" width="8" height="9" rx="1.6" fill="none" stroke="${TD.BRASS}" stroke-width="2"/><rect x="14" y="-72" width="6" height="7" rx="1.4" fill="none" stroke="${TD.BRASS}" stroke-width="1.6"/>`
      + tp('M-27 -64 Q-2 -58 24 -60 L24 -56 Q-2 -54 -27 -60 Z', TD.LEATHER_D, 1.6)
      + `<path d="M-18 -60 Q-22 -48 -16 -38 M-14 -60 Q-12 -50 -16 -42" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/><path d="M-18 -60 Q-22 -48 -16 -38 M-14 -60 Q-12 -50 -16 -42" fill="none" stroke="#9a4a2a" stroke-width="2.8" stroke-linecap="round"/>`;
    // ножны: от груди по диагонали к правому бедру (у мага — подвеска и мешочек)
    if (mage) s += `<path d="M14 -60 L16 -46" stroke="${TD.LEATHER}" stroke-width="2.4"/><circle cx="16" cy="-44" r="3" fill="#e84a5a" ${TOL(1.4)}/><path d="M20 -60 q8 2 6 12 q-6 2 -8 -4 z" fill="${TD.LEATHER}" ${TOL(1.6)}/>`;
    else s += `<g transform="rotate(46 -4 -84)"><rect x="-4" y="-87" width="62" height="6" rx="2.8" fill="${TD.LEATHER_D}" ${TOL(2)}/><rect x="-18" y="-86.4" width="14" height="4.8" rx="1.6" fill="${TD.PANTS}" ${TOL(1.4)}/><path d="M-15 -86 l2 4 M-11 -86 l2 4 M-7 -86 l2 4" stroke="#9a2a2a" stroke-width="1"/><ellipse cx="-4" cy="-84" rx="1.6" ry="4.4" fill="${TD.BRASS}"/><rect x="52" y="-87" width="6" height="6" rx="1.4" fill="${TD.BRASS}"/></g>`;

    /* 4. дальняя рука (справа): от плеча, рукав, наруч с камнем, кисть держит ножны / пояс */
    s += tp('M22 -102 Q34 -98 37 -84 Q39 -76 34 -72 L26 -74 Q26 -88 18 -96 Z', SHIRT, 2.6)
      + (boss || mage ? '' : `<ellipse cx="32" cy="-86" rx="2.4" ry="1.8" fill="${SK}"/>`)
      + tp('M26 -76 L35 -74 L33 -60 L25 -62 Z', TD.LEATHER_D, 2.2) + `<path d="M26 -71 l8 1.6 M25.6 -66 l8 1.4" stroke="${TD.BRASS}" stroke-width="1.2"/>`
      + (mage ? '' : `<rect x="27" y="-70" width="6" height="7" rx="1.4" fill="${TD.BRASS}" stroke="${TD.INK}" stroke-width=".8"/><rect x="28.4" y="-68.6" width="3.2" height="4" rx="1" fill="#9ad0c8"/>`)
      + tHand(29, -58, SK, SKD, 1);
    if (boss) s += tp('M20 -104 Q36 -106 40 -94 L38 -84 Q30 -88 22 -90 Z', '#7a1a1e', 2.2) + `<path d="M24 -100 L38 -97 M23 -95 L38 -91" stroke="${TD.BRASS}" stroke-width="1.4"/>`;   // наплечник

    /* 5. ближняя рука (слева) с оружием — замахивается от плеча (−24, −100) */
    const weap = boss ? 'nodachi' : mage ? 'lantern' : 'katana';
    const wTr = boss ? 'translate(-36 -60) rotate(-140)' : mage ? 'translate(-34 -62) rotate(0)' : 'translate(-36 -60) rotate(-128)';
    let arm = tp('M-22 -102 Q-35 -98 -38 -84 Q-40 -76 -35 -72 L-27 -74 Q-27 -88 -18 -96 Z', SHIRT, 2.6)
      + (boss || mage ? '' : `<ellipse cx="-33" cy="-86" rx="2.4" ry="1.8" fill="${SK}"/>`)
      + tp('M-27 -76 L-36 -74 L-35 -62 L-27 -63 Z', TD.LEATHER_D, 2.2) + `<path d="M-27 -71 l-8 1.6 M-27 -66.6 l-8 1.4" stroke="${TD.BRASS}" stroke-width="1.2"/>`;
    if (boss) arm += tp('M-20 -104 Q-36 -106 -40 -94 L-38 -84 Q-30 -88 -22 -90 Z', '#7a1a1e', 2.2) + `<path d="M-24 -100 L-38 -97 M-23 -95 L-38 -91" stroke="${TD.BRASS}" stroke-width="1.4"/>`;
    arm += `<g transform="${wTr}">${tWeap[weap]()}</g>` + tHand(boss || !mage ? -36 : -34, boss || !mage ? -60 : -62, SK, SKD, -1);
    s += `<g class="qb-arm" style="transform-origin:-24px -100px">${arm}</g>`;

    /* 6. голова: широкая, плоская; глаза-шары по верхним углам; рот во всю ширину; низ уходит в шарф (шарф рисуется после) */
    if (mage) s += tp('M-32 -122 Q-36 -104 -28 -98 L28 -98 Q36 -104 32 -124 Z', SC, 2.6);   // капюшон за головой
    s += '<g transform="translate(0 -99) scale(1.22) translate(0 110)">';
    s += tp('M-25 -118 Q-28 -136 -18 -146 Q0 -153 18 -146 Q28 -136 25 -118 Q12 -110 0 -110 Q-12 -110 -25 -118 Z', SK, 3);
    s += `<path d="M-23 -118 Q-12 -112 0 -112 Q12 -112 23 -118 Q12 -115 0 -115 Q-12 -115 -23 -118 Z" fill="${SKL}" opacity=".9"/>`;   // светлая нижняя губа
    s += `<path d="M-24 -123 Q0 -118 24 -124" fill="none" stroke="${SKD}" stroke-width="2.2" stroke-linecap="round"/><path d="M-24 -123 q-2 2 -1 4 M24 -124 q2 2 1 4" fill="none" stroke="${SKD}" stroke-width="1.6" stroke-linecap="round"/>`;   // рот
    s += `<ellipse cx="-4" cy="-133" rx="1.1" ry=".8" fill="${SKD}"/><ellipse cx="4" cy="-133" rx="1.1" ry=".8" fill="${SKD}"/>`;   // ноздри
    s += `<g fill="${SKD}" opacity=".45">${[[-10, -140, 1.4], [8, -141, 1.2], [-18, -130, 1.1], [17, -131, 1.2], [0, -144, 1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${boss ? r * 1.5 : r}"/>`).join('')}</g>`;
    // глаза-шары
    const eye = (x, y, r) => {
      let e = `<circle cx="${x}" cy="${y}" r="${r}" fill="${SK}" ${TOL(2.6)}/>`;
      if (mage) e += `<circle cx="${x}" cy="${y}" r="${tf(r * 0.78)}" fill="#ff8a3a" stroke="${TD.INK}" stroke-width="1.2"/><circle cx="${tf(x - 0.6)}" cy="${y}" r="${tf(r * 0.48)}" fill="${TD.INK}"/><circle cx="${tf(x - r * 0.3)}" cy="${tf(y - r * 0.3)}" r="1.4" fill="#fff"/>`;
      else e += `<circle cx="${x}" cy="${tf(y + 0.6)}" r="${tf(r * 0.72)}" fill="${boss ? '#ff3b2a' : TD.IRIS}" stroke="${TD.INK}" stroke-width="1"/><circle cx="${tf(x - 0.4)}" cy="${tf(y + 0.6)}" r="${tf(r * 0.44)}" fill="#0c0808"/><circle cx="${tf(x - r * 0.28)}" cy="${tf(y - r * 0.18)}" r="1.5" fill="#fff"/>`
        + `<path d="M${tf(x - r)} ${tf(y - r * 0.15)} Q${x} ${tf(y - r * 1.25)} ${tf(x + r)} ${tf(y - r * 0.15)} Q${x} ${tf(y - r * 0.55)} ${tf(x - r)} ${tf(y - r * 0.15)} Z" fill="${SK}"/>`;   // прикрытое веко
      return e;
    };
    s += `<g class="qb-eye">${boss ? `<circle cx="-15" cy="-145" r="12" fill="#ff3b2a" opacity=".28"/><circle cx="15" cy="-146" r="12" fill="#ff3b2a" opacity=".28"/>` : ''}${eye(-15, -145, 9.4)}${eye(15, -146, 9.4)}</g>`;
    if (boss) s += `<path d="M-26 -158 L-21 -152 M-22 -160 L-17 -154" stroke="#e8a0a8" stroke-width="1.8" stroke-linecap="round"/>`;   // шрам над глазом
    // шляпа мага: поля над глазами и мятый острый верх
    if (mage) s += '<g transform="translate(0 5)">' + tp('M-40 -156 Q0 -168 40 -157 Q28 -151 0 -153 Q-26 -151 -40 -156 Z', SC, 2.6) + tp('M-20 -159 Q-12 -182 2 -190 Q6 -183 16 -186 Q8 -174 18 -159 Q0 -164 -20 -159 Z', SC, 2.6) + `<path d="M-18 -160 Q0 -164 16 -160" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.6"/></g>`;
    // шляпа-каса сёгуна
    if (boss) s += tp('M-48 -156 Q0 -186 48 -156 Q0 -166 -48 -156 Z', '#d8b46a', 3) + `<path d="M-30 -162 L0 -180 M-14 -166 L0 -180 M14 -166 L0 -180 M30 -162 L0 -180" stroke="#a8843a" stroke-width="1.2"/><path d="M-42 -157 Q0 -165 42 -157" fill="none" stroke="#a8843a" stroke-width="1.6"/>`;
    s += '</g>';

    /* 7. шарф намотан до подбородка: закрывает низ головы и стыки плеч (у мага — пелерина с бусами) */
    if (mage) s += tp('M-30 -108 Q0 -100 30 -108 Q34 -98 28 -92 Q0 -84 -28 -92 Q-34 -98 -30 -108 Z', SC, 2.8)
      + `<path d="M-22 -94 Q0 -88 22 -94" fill="none" stroke="${TD.LEATHER_D}" stroke-width="1.4"/><g fill="#e8dcc0" stroke="${TD.INK}" stroke-width=".6">${[-12, -6, 0, 6, 12].map((x, i) => `<circle cx="${x}" cy="${-91 + Math.abs(i - 2) * -1.2}" r="${i === 2 ? 2.6 : 1.6}"/>`).join('')}</g>`;
    else s += tp('M-29 -108 Q0 -102 29 -110 Q33 -100 27 -93 Q0 -85 -27 -93 Q-33 -100 -29 -108 Z', SC, 2.8)
      + `<path d="M-25 -102 Q0 -95 25 -104 M-23 -97 Q0 -90 23 -98" fill="none" stroke="${SCD}" stroke-width="1.6"/>`
      + tp('M-14 -93 Q-20 -85 -18 -77 L-12 -79 Q-12 -87 -8 -91 Z', SCD, 2)
      + (boss ? '' : `<g fill="${SK}" opacity=".85"><circle cx="-17" cy="-101" r="1.6"/><circle cx="12" cy="-102" r="1.4"/><circle cx="21" cy="-97" r="1.3"/></g>`);
    return s + '</g>';
  }
  // снаряд: сюрикен ~40×40
  function shuriken() {
    let p = ''; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p += `${i ? 'L' : 'M'}${tf(Math.cos(a) * 14)} ${tf(Math.sin(a) * 14)} L${tf(Math.cos(a + 0.6) * 4)} ${tf(Math.sin(a + 0.6) * 4)} `; }
    return `<path d="${p}Z" fill="${TD.STEEL}" stroke="${TD.LINE}" stroke-width="2" stroke-linejoin="round"/><circle r="3" fill="${TD.PANTS}"/><path d="M-6 -2 L-12 0" stroke="#fff" stroke-width="1" opacity=".8"/>`;
  }
  /* ════════ конец вставки ════════ */

      return { toad, shuriken };
    })();
    return {
      wolf: { draw: (o) => { try { return WOLF3(o); } catch (e) { try { return WOLF2(o); } catch (e2) { return wolf(o); } } }, top: 68, attacks: { shield: 'lunge', duck: 'leap', scatter: 'wave' } },
      skeleton: { draw: skeleton, top: 184, scale: 1.25, attacks: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, missile: { svg: SKULL } },   // 184: у Скелета-воина гребень выше — полоска не режет шлем
      bandit: { draw: bandit, top: 164, attacks: { shield: 'lunge', duck: 'throw', scatter: 'burst' }, missile: { svg: KNIFE } },
      viewbot: { draw: viewbot, top: 172, attacks: { shield: 'lunge', duck: 'leap', scatter: 'wave' } },
      spambot: { draw: spambot, top: 176, attacks: { shield: 'lunge', duck: 'throw', scatter: 'burst' }, missile: { svg: spamPlane() } },
      // 17.10: Врата башни — тёмные стражи (сильнее обычных стай). Рисунок упал — запасной: скелет
      mothGuard: { draw: (o) => { try { return GUARDS.gMoth(o); } catch (e) { return skeleton(o); } }, top: 250, attacks: { shield: 'swoop', duck: 'throw', scatter: 'wave' }, missile: { svg: (() => { try { return `<svg width="50" height="50" viewBox="-25 -25 50 50">${GUARDS.gMothMissile()}</svg>`; } catch (e) { return SKULL; } })() } },
      emberGuard: { draw: (o) => { try { return GUARDS.gEmber(o); } catch (e) { return skeleton(o); } }, top: 245, attacks: { shield: 'charge', duck: 'spit', scatter: 'burst' }, missile: { svg: (() => { try { return `<svg width="50" height="50" viewBox="-25 -25 50 50">${GUARDS.gEmberMissile()}</svg>`; } catch (e) { return SKULL; } })() } },
      mantisGuard: { draw: (o) => { try { return GUARDS.gMantis(o); } catch (e) { return skeleton(o); } }, top: 228, attacks: { shield: 'leap', duck: 'throw', scatter: 'lunge' }, missile: { svg: (() => { try { return `<svg width="50" height="50" viewBox="-25 -25 50 50">${GUARDS.gMantisMissile()}</svg>`; } catch (e) { return SKULL; } })() } },
      toad: { draw: TOAD.toad, top: 168, attacks: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, missile: { svg: (() => { try { return `<svg width="40" height="40" viewBox="-20 -20 40 40">${TOAD.shuriken()}</svg>`; } catch (e) { return ''; } })() } },
      // css: свои анимации стиля для приёмов 'css:имя' (класс .qb-atk-имя на враге на время атаки). У «Легиона» своих нет — пример:
      // css: '.qb .qb-foe.qb-atk-spin{animation:mySpin .9s ease-in-out} @keyframes mySpin{50%{transform:rotate(360deg)}}',
    };
  });
})();

} catch (e) { console.error('[стили] styles/legion/enemies.js не загрузился:', e); }

/* ───── стиль «legion»: styles/legion/enemies-hollow.js ───── */
try {
/* Стиль «Легион» — враги «Ночи Тыквенной Луны» (Изнанка). Договор — styles/ENEMIES.md: ноги в (0, 0), смотрит ВЛЕВО,
   ширина ~200, рост — top; классы qb-idle (всё тело), qb-arm (замах, transform-origin — плечо), qb-eye (мерцание).
   Без filter, без SMIL и без <text>. Оверлей боя ищет врага в 'enemies' стиля, потом в 'enemies-hollow' (modules/quest/client/battle.js — // HW:).
   27.10 (art/hollow-monsters, решение стримера): монстры — в стиле «мёртвого мира», как места Изнанки (hollowart.js): холодная гамма, гниль,
   лохмотья, трещины. Тёплый свет — только тыквы (глаза и пасти тыквоголовов, фонарь Джека) и огоньки; красный — только глаза.
   У каждого — свои атаки на три вида (attacks: shield / duck / scatter) и свои снаряды; приёмы 'css:имя' — в поле css (только transform / opacity).
   Вожак (o.boss) помечен классом hwb: замах у него заметнее (css), рисунок — со своими приметами.
   Ключи: hw_pumpkin (тыквоголов / Тыквенный голем), hw_pumpkinlet (тыквёнок), hw_ghost (призрак / Плакальщица), hw_bat (нетопырь / Вампир),
   hw_witch (ведьма на метле / Старшая ведьма), hw_zombie (мертвец / Мертвец-староста), hw_spider (паук / Паучиха-вдова),
   hw_cat (чёрный кот / Кот-ведьмак), hw_scarecrow (пугало / Пугало-жнец), hw_skeleton (костяк / Костяной страж), hw_crow (ворон), hw_jack (Джек — запасной бой). */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('legion', 'enemies-hollow', function () {
    // обводка-наклейка — серо-голубая (эскиз B): враг читается на тёмном фоне, но не «праздничный» белый
    const LINE = '#9aa3b8', INK = '#0d0e14';
    // палитра «мёртвого мира»
    const C = {
      rot: '#76857c', rotD: '#55635c', rotL: '#93a197',            // гниющая кожа
      cloth: '#3a4150', clothD: '#272c37', clothL: '#4c5464',       // лохмотья
      dark: '#21242c', wood: '#3a3530', woodD: '#28241f', straw: '#7d7660', strawD: '#5c5748',
      bone: '#c4beac', boneD: '#9c9686', ghost: '#b4c2d8', ghostD: '#8a98b0', ghostL: '#d6e0ee',
      lilac: '#6a5a8a', lilacD: '#4a3e66', lilacL: '#8a7aa8', fur: '#1a1c24', furL: '#2e323e',
      pump: '#b8561c', pumpD: '#7e3a14', rotP: '#4e3a2c', vine: '#3a4436', fire: '#ffb347', fireY: '#ffd34d', eye: '#e0283a', hole: '#0b0c10', metal: '#6a6e78',
    };
    const f1 = (n) => (Math.round(n * 10) / 10).toString();
    const O = (w = 3) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const I = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const sp = (o, a = 1.2) => (a + ((o.seed || 0) % 7) / 10).toFixed(2);
    const limb = (d, w, c) => `<path d="${d}" stroke="${LINE}" stroke-width="${w + 6}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    const idle = (o, a, inner) => `<g class="qb-idle${o.boss ? ' hwb' : ''}" style="animation-duration:${sp(o, a)}s">${inner}</g>`;
    const shadow = (rx) => `<ellipse cx="2" cy="0" rx="${rx}" ry="${f1(rx * 0.2)}" fill="#000" opacity=".3"/>`;
    const svg40 = (inner) => `<svg width="40" height="40" viewBox="-20 -20 40 40">${inner}</svg>`;

    // тыква-голова: гниющая, тёмные пятна, лицо светится (тыква — тёплый свет). Центр (x, y), полуширина r, лицо влево
    function pumpkinHead(x, y, r, o = {}) {
      const g = o.glow || C.fire;
      return `<path d="M${f1(x - 2)} ${f1(y - r * 0.85)} q2 -14 12 -18" fill="none" stroke="${C.vine}" stroke-width="${f1(Math.max(4, r * 0.16))}" stroke-linecap="round"/>`
        + `<path d="M${f1(x - r)} ${f1(y)} Q${f1(x - r)} ${f1(y - r * 0.9)} ${f1(x)} ${f1(y - r * 0.86)} Q${f1(x + r)} ${f1(y - r * 0.9)} ${f1(x + r)} ${f1(y - r * 0.05)} Q${f1(x + r * 0.7)} ${f1(y + r * 0.2)} ${f1(x + r * 0.6)} ${f1(y + r * 0.5)} Q${f1(x)} ${f1(y + r * 0.95)} ${f1(x - r * 0.7)} ${f1(y + r * 0.7)} Q${f1(x - r)} ${f1(y + r * 0.5)} ${f1(x - r)} ${f1(y)} Z" fill="${o.dark ? C.pumpD : C.pump}" ${O(3.4)}/>`
        + `<path d="M${f1(x - r * 0.45)} ${f1(y - r * 0.8)} q-8 ${f1(r * 0.8)} 0 ${f1(r * 1.5)} M${f1(x + r * 0.45)} ${f1(y - r * 0.8)} q8 ${f1(r * 0.8)} 0 ${f1(r * 1.3)} M${f1(x + r * 0.3)} ${f1(y + r * 0.2)} q${f1(r * 0.4)} ${f1(-r * 0.1)} ${f1(r * 0.62)} ${f1(r * 0.25)} q-${f1(r * 0.2)} ${f1(r * 0.3)} -${f1(r * 0.5)} ${f1(r * 0.3)} z" fill="${C.rotP}" stroke="${C.pumpD}" stroke-width="2.4" opacity=".9"/>`
        + `<g class="qb-eye"><path d="M${f1(x - r * 0.64)} ${f1(y - r * 0.08)} l${f1(r * 0.22)} ${f1(-r * 0.38)} l${f1(r * 0.2)} ${f1(r * 0.38)} z M${f1(x - r * 0.08)} ${f1(y - r * 0.1)} l${f1(r * 0.2)} ${f1(-r * 0.34)} l${f1(r * 0.18)} ${f1(r * 0.34)} z M${f1(x - r * 0.7)} ${f1(y + r * 0.28)} q${f1(r * 0.6)} ${f1(r * 0.42)} ${f1(r * 1.14)} -${f1(r * 0.04)} l-${f1(r * 0.17)} ${f1(r * 0.1)} l-${f1(r * 0.13)} -${f1(r * 0.13)} l-${f1(r * 0.17)} ${f1(r * 0.15)} l-${f1(r * 0.16)} -${f1(r * 0.15)} l-${f1(r * 0.14)} ${f1(r * 0.12)} l-${f1(r * 0.17)} -${f1(r * 0.1)} z" fill="${g}" ${I(2)}/></g>`;
    }

    /* ---------- снаряды (40×40, центр в середине, летят вращаясь) ---------- */
    const M_SEEDS = svg40(`<path d="M-12 -4 q4 -8 8 0 q-4 6 -8 0 z M2 -12 q4 -8 8 0 q-4 6 -8 0 z M0 4 q4 -8 8 0 q-4 6 -8 0 z M-10 10 q4 -8 8 0 q-4 6 -8 0 z" fill="${C.bone}" stroke="${INK}" stroke-width="1.8"/>`);
    const M_ROTPUMP = svg40(`<circle r="17" fill="${C.fire}" opacity=".25"/><path d="M-14 0 q0 -12 14 -12 q14 0 14 12 q0 12 -14 12 q-14 0 -14 -12 z" fill="${C.pump}" stroke="${INK}" stroke-width="2.4"/><path d="M-6 -12 q-4 12 0 24 M6 -12 q4 12 0 22" fill="none" stroke="${C.rotP}" stroke-width="2.4"/><path d="M-9 -2 l3 -5 l3 5 z M2 -2 l3 -5 l3 5 z M-8 4 q8 5 16 0" fill="${C.fireY}" stroke="${INK}" stroke-width="1.4"/><path d="M-1 -12 q1 -5 5 -6" stroke="${C.vine}" stroke-width="3" fill="none"/>`);
    const M_HAND = svg40(`<path d="M-14 6 q0 -10 8 -12 l2 -10 q2 -3 4 0 l0 9 l3 -11 q2 -3 4 0 l-1 12 l4 -8 q3 -2 3 2 l-4 12 q-2 10 -12 10 q-10 0 -11 -4 z" fill="${C.rot}" stroke="${INK}" stroke-width="2.2"/><path d="M-14 6 l-4 2 l2 4" stroke="${C.bone}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    const M_SKULL = svg40(`<path d="M-12 8 v-5 q-5 -3 -5 -11 q0 -11 17 -11 q17 0 17 11 q0 8 -5 11 v5 z" fill="${C.bone}" stroke="${INK}" stroke-width="2.4"/><circle cx="-6" cy="-4" r="4" fill="${C.hole}"/><circle cx="6" cy="-4" r="4" fill="${C.hole}"/><circle cx="6" cy="-4" r="1.6" fill="${C.eye}"/><path d="M-6 8 v-4 M0 8 v-4 M6 8 v-4" stroke="${INK}" stroke-width="1.6"/>`);
    const M_CROW = svg40(`<path d="M-16 2 q8 -14 18 -6 q8 -10 16 -4 q-8 2 -10 8 q4 4 2 8 q-6 -2 -10 -6 q-8 6 -16 0 z" fill="${C.fur}" stroke="${LINE}" stroke-width="1.8"/><path d="M-16 2 l-5 2 l5 2" fill="${C.straw}"/><circle cx="-11" cy="0" r="1.6" fill="${C.eye}"/>`);
    const M_POTION = svg40(`<circle r="16" fill="${C.lilacL}" opacity=".25"/><path d="M-4 -16 h8 v7 q10 5 10 15 q0 10 -14 10 q-14 0 -14 -10 q0 -10 10 -15 z" fill="${C.lilac}" stroke="${INK}" stroke-width="2.2"/><path d="M-9 2 q9 -4 18 0 v4 q-9 6 -18 0 z" fill="${C.lilacL}"/><rect x="-5" y="-19" width="10" height="5" rx="1.5" fill="${C.wood}" stroke="${INK}" stroke-width="1.6"/>`);
    const M_WEB = svg40(`<circle r="15" fill="${C.ghostL}" opacity=".25"/><path d="M0 -15 V15 M-15 0 H15 M-11 -11 L11 11 M11 -11 L-11 11 M-7 -7 Q0 -11 7 -7 Q11 0 7 7 Q0 11 -7 7 Q-11 0 -7 -7 Z" fill="none" stroke="${C.ghostL}" stroke-width="2"/><circle r="4" fill="${C.lilac}" stroke="${INK}" stroke-width="1.4"/>`);

    /* ── тыквоголов: пугало-тело в лохмотьях, гнилая тыква-голова; Тыквенный голем — громада из гнилых тыкв, руки-лозы, корона из обломков ── */
    function pumpkin(o) {
      if (o.boss) return idle(o, 1.6, limb('M-30 0 v-36 M26 0 v-36', 16, C.vine)
        + `<path d="M-58 -34 Q-66 -112 0 -120 Q64 -112 58 -34 Q0 -18 -58 -34 Z" fill="${C.pumpD}" ${O(4)}/>`
        + `<path d="M-40 -102 q-12 32 0 62 M0 -118 v82 M40 -102 q12 32 0 62 M-30 -70 q14 -6 20 6 q-8 10 -20 -6 z M18 -56 q12 -4 18 6 q-10 8 -18 -6 z" fill="${C.rotP}" stroke="${C.rotP}" stroke-width="4"/>`
        + `<g class="qb-arm" style="transform-origin:-46px -82px">${limb('M-46 -82 Q-94 -72 -104 -28', 13, C.vine)}<path d="M-104 -36 q-14 2 -14 14 q2 12 14 12 q12 -2 12 -14 q-2 -12 -12 -12 z" fill="${C.pumpD}" ${O(3)}/></g>`
        + limb('M46 -82 Q88 -62 92 -26', 13, C.vine)
        + `<g class="hwx-head">${pumpkinHead(-2, -152, 42, { dark: true, glow: C.fireY })}</g>`
        + `<path d="M-30 -188 l6 -16 l7 11 l9 -14 l8 13 l7 -10 l5 16 z" fill="${C.boneD}" ${O(2.6)}/>`);
      return idle(o, 1.2, limb('M-14 0 l-2 -34 M12 0 l3 -34', 11, C.dark)
        + `<path d="M-27 -30 Q-31 -82 0 -86 Q30 -82 27 -30 L18 -38 L12 -24 L4 -36 L-4 -22 L-12 -36 L-20 -24 Z" fill="${C.cloth}" ${O(3.4)}/>`
        + `<path d="M-18 -72 l34 26 M16 -74 l-30 30 M-12 -58 q6 -4 12 2 q-4 6 -12 -2 z" stroke="${C.strawD}" stroke-width="3" fill="${C.clothD}"/>`
        + `<g class="qb-arm" style="transform-origin:-22px -70px">${limb('M-22 -70 Q-50 -64 -58 -40', 9, C.cloth)}<path d="M-62 -44 l-7 -14 M-58 -42 l-3 -16 M-54 -42 l3 -14" stroke="${C.straw}" stroke-width="3" stroke-linecap="round"/></g>`
        // голова-тыква отдельной группой: в приём 'css:hwroll' она срывается и катится на строй
        + `<g class="hwx-head">${pumpkinHead(-2, -110, 29, {})}</g>`);
    }
    function pumpkinlet(o) {
      return idle(o, 0.8, shadow(18) + limb('M-10 0 v-10 M10 0 v-10', 7, C.vine) + pumpkinHead(0, -30, 22, {}));
    }

    /* ── призрак: рваная простыня, холодный, сквозь него видно туман; Плакальщица — в чёрной вуали, слёзы, свеча-огонёк ── */
    function ghost(o) {
      const b = o.boss, h = b ? 172 : 132, w = b ? 62 : 48;
      let hem = ''; for (let i = 0; i < 6; i++) hem += ` q${f1(-w / 6)} ${i % 2 ? -18 : 12} ${f1(-w / 3)} ${i % 2 ? 4 : -2}`;
      return idle(o, 2, `<g transform="translate(0 -20)">`
        + `<ellipse cx="0" cy="24" rx="${f1(w * 0.7)}" ry="7" fill="#000" opacity=".2"/>`
        + `<path d="M${-w} -30 C${-w} ${-h} ${w} ${-h} ${w} -30${hem} Z" fill="${C.ghost}" opacity=".88" ${O(3.4)}/>`
        + `<path d="M${w - 6} -40 C${w - 4} ${-h + 40} ${w - 30} ${-h + 10} ${w - 40} ${-h + 18} C${w - 22} ${-h + 40} ${w - 18} -70 ${w - 26} -36 Z M${-w + 14} -50 l10 -18 l4 14 z" fill="${C.ghostD}" opacity=".8"/>`
        + `<path d="M${-w + 12} ${-h + 58} Q${-w + 4} -72 ${-w + 10} -46" stroke="${C.ghostL}" stroke-width="4" fill="none" opacity=".8"/>`
        + `<g class="qb-eye"><path d="M-28 ${-h + 42} q8 -6 14 2 q-2 12 -8 14 q-8 -4 -6 -16 z M0 ${-h + 46} q8 -6 13 2 q-2 11 -7 12 q-7 -3 -6 -14 z" fill="${C.hole}"/><circle cx="-20" cy="${-h + 52}" r="2.4" fill="${C.ghostL}"/><circle cx="7" cy="${-h + 55}" r="2.2" fill="${C.ghostL}"/></g>`
        + `<path d="M-14 ${-h + 72} q4 -6 10 0 q2 12 -5 18 q-7 -6 -5 -18 z" fill="${C.hole}"/>`
        + `<g class="qb-arm" style="transform-origin:${-w + 6}px ${-h + 80}px"><path d="M${-w + 6} ${-h + 80} q-30 6 -42 28 l8 -2 l2 8 q10 -14 22 -16" fill="${C.ghost}" ${O(3)}/></g>`
        + (b ? `<path d="M${-w - 4} ${-h + 40} Q0 ${-h - 22} ${w + 4} ${-h + 40} L${w} ${-h + 80} L${w - 10} ${-h + 66} Q0 ${-h + 18} ${-w + 6} ${-h + 66} L${-w} ${-h + 84} Z" fill="${C.fur}" opacity=".92" ${O(3)}/>`
          + `<path d="M-22 ${-h + 62} v14 M5 ${-h + 66} v12" stroke="${C.ghostL}" stroke-width="3" stroke-linecap="round" opacity=".9"/>`
          + `<g transform="translate(${-w - 32} ${-h + 104})"><rect x="-5" y="-18" width="10" height="20" rx="2" fill="${C.bone}" ${I(1.8)}/><path d="M0 -30 q6 6 0 11 q-6 -5 0 -11 z" fill="${C.fire}"/></g>` : '')
        + `</g>`);
    }

    /* ── нетопырь: висит в воздухе (тело ~ на −110), рваные перепонки; Вампир — серый плащ, бледное лицо, красные глаза ── */
    function bat(o) {
      if (o.boss) return idle(o, 1.4, `<path d="M-6 -150 C-80 -172 -112 -110 -98 -58 L-72 -80 L-64 -52 L-42 -76 L-24 -38 L0 -68 L22 -40 L40 -76 L60 -48 L72 -80 L98 -58 C112 -110 80 -172 6 -150 Z" fill="${C.fur}" ${O(3.4)}/>`
        + `<path d="M-60 -100 l10 14 l-12 4 z M54 -110 l-8 16 l12 2 z" fill="${C.hole}"/>`
        + `<path d="M-20 -150 L-28 -40 Q0 -30 28 -40 L20 -150 Z" fill="${C.furL}" ${O(3)}/><path d="M-24 -150 Q0 -128 24 -150" fill="${C.cloth}" ${O(2.4)}/>`
        + `<path d="M-26 -172 Q-26 -196 -4 -196 Q18 -196 18 -172 Q18 -152 -4 -150 Q-26 -152 -26 -172 Z" fill="${C.ghostL}" ${O(3.4)}/><path d="M-28 -186 q22 -18 46 0 q-10 -4 -22 4 q-12 -8 -24 -4 z" fill="${C.fur}"/>`
        + `<g class="qb-eye"><circle cx="-14" cy="-174" r="4" fill="${C.eye}"/><circle cx="4" cy="-174" r="4" fill="${C.eye}"/></g><path d="M-14 -160 l3 7 l3 -7 M0 -160 l3 7 l3 -7" fill="${C.bone}" ${I(1.4)}/>`
        + `<g class="qb-arm" style="transform-origin:-18px -140px"><path d="M-18 -140 q-26 10 -36 30 l-8 2" stroke="${C.ghostL}" stroke-width="7" fill="none" stroke-linecap="round"/></g>`);
      return idle(o, 0.6, shadow(24) + `<g transform="translate(0 -110)">`
        + `<path d="M-4 -4 Q-40 -36 -76 -14 L-62 -6 L-58 8 L-42 -2 L-32 12 L-14 2 Z M4 -4 Q40 -36 76 -14 L62 -6 L58 8 L42 -2 L32 12 L14 2 Z" fill="${C.furL}" ${O(3)}/>`
        + `<path d="M-50 -14 l6 8 l-8 2 z M46 -18 l-4 10 l8 0 z" fill="${C.hole}"/>`
        + `<path d="M0 -24 Q16 -22 16 2 Q14 22 0 22 Q-14 22 -16 2 Q-16 -14 -12 -14 L-18 -32 L-6 -20 Q-2 -24 2 -18 L8 -32 L10 -18 Z" fill="${C.fur}" ${O(3)}/>`
        + `<g class="qb-eye"><circle cx="-8" cy="-2" r="3.4" fill="${C.eye}"/><circle cx="4" cy="-3" r="3.4" fill="${C.eye}"/></g><path d="M-6 8 l2 5 l2 -5" fill="${C.bone}" ${I(1.2)}/></g>`);
    }

    /* ── ведьма на метле (парит): серо-лиловое тряпьё, бледно-зелёная кожа, бородавки; Старшая ведьма — выше шляпа, котелок у пояса ── */
    function witch(o) {
      const b = o.boss, skin = b ? '#7f9480' : '#94a892', robe = b ? C.lilacD : C.lilac;
      return idle(o, 1.6, shadow(40) + `<g transform="translate(0 -70)">`
        + `<path d="M-72 10 L82 -6" stroke="${LINE}" stroke-width="12" stroke-linecap="round"/><path d="M-72 10 L82 -6" stroke="${C.wood}" stroke-width="7" stroke-linecap="round"/>`
        + `<path d="M72 -14 L114 -26 L106 -8 L118 4 L74 4 Z M90 -18 l14 20" fill="${C.straw}" ${O(3)}/>`
        + `<path d="M-22 4 Q-32 -60 0 -70 Q30 -60 26 4 L16 -4 L8 10 L0 -2 L-8 12 L-14 -2 Z" fill="${robe}" ${O(3.4)}/>`
        + `<path d="M-14 6 l-10 22 M10 4 l6 22" stroke="${LINE}" stroke-width="8" stroke-linecap="round"/><path d="M-14 6 l-10 22 M10 4 l6 22" stroke="${C.dark}" stroke-width="4" stroke-linecap="round"/>`
        + `<path d="M-22 -84 Q-22 -102 -4 -102 Q14 -102 14 -84 Q14 -68 -4 -66 Q-16 -66 -20 -76 l-14 -6 l14 -4 z" fill="${skin}" ${O(3.4)}/>`
        + `<g class="qb-eye"><circle cx="-12" cy="-88" r="3" fill="${C.eye}"/><circle cx="2" cy="-88" r="3" fill="${C.eye}"/></g><path d="M-14 -76 q8 4 14 0 M-26 -82 l0.1 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
        + `<path d="M-36 -96 Q0 ${b ? -112 : -104} 32 -96 L18 -94 Q10 ${b ? -150 : -132} 6 ${b ? -170 : -142} l-10 6 Q-8 ${b ? -146 : -122} -22 -94 Z" fill="${C.fur}" ${O(3.4)}/><path d="M-20 -96 Q0 -102 18 -96" stroke="${C.lilacL}" stroke-width="4" fill="none"/>`
        + `<path d="M12 -86 q24 14 18 44 M16 -80 q14 14 6 34" stroke="${C.boneD}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
        + `<g class="qb-arm" style="transform-origin:-16px -50px">${limb('M-16 -50 Q-40 -54 -52 -70', 7, robe)}<circle cx="-54" cy="-74" r="6" fill="${C.lilacL}" ${I(1.6)}/></g>`
        + (b ? `<path d="M-4 -34 q12 -4 16 6 q-2 10 -10 10 q-10 -2 -6 -16 z" fill="${C.dark}" ${O(2.4)}/>` : '')
        + `</g>`);
    }

    /* ── мертвец: гниющая кожа, рваная рубаха, рёбра сквозь дыру, отвисшая челюсть, красный глаз; староста — драный цилиндр, ржавая лопата ── */
    function zombie(o) {
      const b = o.boss;
      return idle(o, 1.8, limb('M-14 0 l-2 -42 M12 0 l4 -40', 12, C.dark)
        + `<path d="M-30 -38 L-27 -100 Q-2 -112 24 -100 L30 -40 L22 -46 L16 ${b ? -22 : -34} L8 -44 L-2 -30 L-10 -44 L-18 ${b ? -24 : -32} L-24 -44 Z" fill="${b ? '#33303a' : C.cloth}" ${O(3.4)}/>`
        + `<path d="M-16 -86 q8 -6 18 -2 q-2 14 -10 18 q-8 -4 -8 -16 Z M10 -66 l8 -4 l-2 10 Z" fill="${C.clothD}"/><path d="M-12 -82 q6 -2 12 0 M-12 -76 q6 -2 12 0" stroke="${C.bone}" stroke-width="3" stroke-linecap="round"/>`
        + `<path d="M-26 -122 Q-28 -150 -2 -152 Q22 -150 22 -126 Q22 -112 13 -108 L11 -100 Q-4 -94 -16 -100 L-20 -108 Q-27 -112 -26 -122 Z" fill="${C.rot}" ${O(3.4)}/>`
        + `<path d="M-6 -151 l4 10 l-4 6 M-18 -148 q-6 -8 -2 -14 M-8 -152 q0 -10 6 -12" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
        + `<path d="M-17 -112 Q-6 -104 6 -110 L4 -100 Q-6 -96 -15 -102 Z M-20 -128 a7 8 0 1 0 14 0 a7 8 0 1 0 -14 0 Z M8 -146 Q20 -140 20 -126 Q20 -114 12 -110 Q14 -126 8 -146 Z" fill="${C.hole}" opacity=".85"/>`
        + `<g class="qb-eye"><circle cx="-13" cy="-127" r="2.4" fill="${C.eye}"/><circle cx="6" cy="-129" r="${b ? 4.4 : 3.6}" fill="${C.eye}" stroke="${C.hole}" stroke-width="1.6"/></g>`
        + `<path d="M-14 -110 v4 M-9 -108 v5 M-4 -108 v4 M1 -109 v4" stroke="${C.bone}" stroke-width="2.2"/>`
        + `<g class="qb-arm" style="transform-origin:-22px -92px">${limb('M-22 -92 Q-42 -96 -62 -90', 10, C.rot)}<path d="M-62 -94 l-10 -4 M-63 -90 l-11 0 M-62 -86 l-9 4" stroke="${C.bone}" stroke-width="3.4" stroke-linecap="round"/>`
        + (b ? `<path d="M-58 -128 L-60 -36" stroke="${LINE}" stroke-width="10" stroke-linecap="round"/><path d="M-58 -128 L-60 -36" stroke="${C.woodD}" stroke-width="5"/><path d="M-73 -40 h26 l-5 26 q-8 6 -16 0 z" fill="${C.metal}" ${O(3)}/>` : '') + `</g>`
        + limb('M20 -92 Q34 -74 40 -56', 10, C.rotD)
        + (b ? `<path d="M-28 -146 h48 M-18 -146 v-20 l26 -4 l4 22" fill="#1c1e26" ${O(3)}/>` : ''));
    }

    /* ── паук: широкий, низкий, облезлый, лапы-ломаные; вдова — чёрная, грязно-лиловые песочные часы, паутина на спине ── */
    function spider(o) {
      const b = o.boss, c = b ? C.fur : C.furL, w = b ? 1.25 : 1;
      let L = ''; for (let i = 0; i < 4; i++) { const dx = (i - 1.5) * 22 * w; L += `M${f1(dx)} -40 L${f1(dx - 26 - i * 6)} ${f1(-82 + i * 4)} L${f1(dx - 52 - i * 8)} 0 M${f1(dx)} -40 L${f1(dx + 30 + i * 4)} ${f1(-80 + i * 4)} L${f1(dx + 56 + i * 6)} 0 `; }
      return idle(o, 1, shadow(70) + limb(L, 5, c)
        + `<path d="M${f1(-24 * w)} ${f1(-52 * w)} Q${f1(-24 * w)} ${f1(-90 * w)} ${f1(20 * w)} ${f1(-90 * w)} Q${f1(66 * w)} ${f1(-90 * w)} ${f1(66 * w)} ${f1(-52 * w)} Q${f1(66 * w)} ${f1(-16 * w)} ${f1(20 * w)} ${f1(-16 * w)} Q${f1(-24 * w)} ${f1(-16 * w)} ${f1(-24 * w)} ${f1(-52 * w)} Z" fill="${c}" ${O(3.4)}/>`
        + (b ? `<path d="M${f1(14 * w)} ${f1(-68 * w)} h${f1(14 * w)} l-${f1(14 * w)} ${f1(16 * w)} h${f1(14 * w)} z" fill="${C.lilacL}" ${I(1.6)}/><path d="M${f1(-6 * w)} ${f1(-80 * w)} l${f1(16 * w)} ${f1(10 * w)} M${f1(44 * w)} ${f1(-82 * w)} l${f1(-14 * w)} ${f1(12 * w)} M${f1(52 * w)} ${f1(-40 * w)} l${f1(-18 * w)} ${f1(-6 * w)}" stroke="${C.ghostD}" stroke-width="1.6" opacity=".8"/>`
          : `<path d="M${f1(4 * w)} ${f1(-74 * w)} q16 8 32 0 M${f1(2 * w)} ${f1(-58 * w)} q18 8 36 0 M${f1(40 * w)} ${f1(-44 * w)} l6 -6 l4 8 z" stroke="${C.cloth}" stroke-width="3" fill="${C.hole}"/>`)
        + `<circle cx="${f1(-30 * w)}" cy="${f1(-42 * w)}" r="${f1(22 * w)}" fill="${c}" ${O(3.4)}/>`
        + `<g class="qb-eye"><circle cx="${f1(-40 * w)}" cy="${f1(-48 * w)}" r="4" fill="${C.eye}"/><circle cx="${f1(-30 * w)}" cy="${f1(-52 * w)}" r="4" fill="${C.eye}"/><circle cx="${f1(-44 * w)}" cy="${f1(-38 * w)}" r="2.6" fill="${C.eye}"/><circle cx="${f1(-34 * w)}" cy="${f1(-40 * w)}" r="2.6" fill="${C.eye}"/></g>`
        + `<g class="qb-arm" style="transform-origin:${f1(-44 * w)}px ${f1(-30 * w)}px"><path d="M${f1(-44 * w)} ${f1(-30 * w)} l-8 10 M${f1(-36 * w)} ${f1(-26 * w)} l-4 12" stroke="${C.bone}" stroke-width="4" stroke-linecap="round"/></g>`);
    }

    /* ── чёрный кот: облезлый, выгнутая спина, рваное ухо, хвост-кость; Кот-ведьмак — в драной шляпе, глаза холодно-голубые ── */
    function cat(o) {
      const b = o.boss, c = C.fur;
      return idle(o, 1, limb('M-30 0 v-24 M-14 0 v-22 M26 0 v-26 M40 0 v-24', 8, c)
        + `<path d="M-40 -26 Q-30 -${b ? 88 : 76} 6 -${b ? 84 : 72} Q46 -70 50 -28 L40 -30 L34 -22 L26 -30 L18 -22 L8 -30 L-4 -22 L-14 -30 Q-28 -20 -40 -26 Z" fill="${c}" ${O(3.4)}/>`
        + `<path d="M48 -40 Q86 -60 70 -110 Q66 -122 76 -126" fill="none" stroke="${LINE}" stroke-width="15" stroke-linecap="round"/><path d="M48 -40 Q86 -60 70 -110 Q66 -122 76 -126" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/><path d="M74 -96 l6 -4 M70 -110 l7 -1" stroke="${C.bone}" stroke-width="3" stroke-linecap="round"/>`
        + `<path d="M-66 -50 Q-66 -72 -46 -72 Q-26 -72 -26 -50 Q-26 -30 -46 -30 Q-66 -30 -66 -50 Z M-64 -62 l-2 -26 l10 8 l-3 6 l9 0 z M-36 -66 l8 -24 l6 22 z" fill="${c}" ${O(3.4)}/>`
        + `<g class="qb-eye"><ellipse cx="-56" cy="-52" rx="4.4" ry="6" fill="${b ? C.ghostL : C.fireY}"/><ellipse cx="-42" cy="-53" rx="4.4" ry="6" fill="${b ? C.ghostL : C.fireY}"/><path d="M-56 -56 v8 M-42 -57 v8" stroke="${INK}" stroke-width="2"/></g>`
        + `<path d="M-52 -42 l3 3 l3 -3 M-70 -46 h-14 M-70 -42 l-14 4 M-30 -46 h12 M-14 -56 l6 10 l6 -8 l6 10 M20 -62 l4 8 l5 -7" stroke="#5a5f6e" stroke-width="2" fill="none" stroke-linecap="round"/>`
        + `<g class="qb-arm" style="transform-origin:-36px -30px">${limb('M-36 -30 Q-58 -24 -66 -6', 7, c)}<path d="M-72 -8 l-4 -4 M-68 -6 l-3 -6 M-64 -6 l0 -6" stroke="${C.bone}" stroke-width="2" stroke-linecap="round"/></g>`
        + (b ? `<path d="M-76 -70 Q-46 -82 -16 -70 L-30 -68 Q-36 -102 -54 -120 L-50 -100 Q-58 -90 -62 -70 Z" fill="${C.cloth}" ${O(3)}/>` : ''));
    }

    /* ── пугало: гнилой шест, мешок-голова с прорехами, солома торчит, красные огоньки-глаза; Пугало-жнец — серп, ворон на плече ── */
    function scarecrow(o) {
      const b = o.boss;
      return idle(o, 2.2, shadow(30)
        + `<path d="M0 0 V-150 M-60 -104 H60" stroke="${LINE}" stroke-width="11" stroke-linecap="round"/><path d="M0 0 V-150 M-60 -104 H60" stroke="${C.woodD}" stroke-width="6"/>`
        + `<path d="M-34 -30 l-6 14 M-24 -28 l-2 16 M24 -30 l6 14 M-64 -100 l-6 10 M-60 -100 l-2 12 M60 -100 l6 10 M56 -100 l2 12" stroke="${C.straw}" stroke-width="3.4" stroke-linecap="round"/>`
        + `<path d="M-30 -36 L-28 -110 Q0 -118 28 -110 L30 -36 L16 -44 L4 -30 L-8 -44 L-20 -30 Z" fill="${b ? '#33303a' : C.cloth}" ${O(3.4)}/>`
        + `<path d="M6 -92 h14 v14 h-14 z M-16 -70 q6 -6 12 0 q-2 8 -12 0 z" fill="${C.clothD}" stroke="${C.strawD}" stroke-width="1.6"/>`
        + `<path d="M-24 -116 Q-30 -160 0 -164 Q30 -160 24 -116 Q0 -108 -24 -116 Z" fill="${C.strawD}" ${O(3.4)}/>`
        + `<path d="M-20 -150 l6 6 M-14 -150 l-6 6 M10 -130 q4 6 0 12" stroke="${INK}" stroke-width="2.4" fill="none"/>`
        + `<g class="qb-eye"><circle cx="-10" cy="-140" r="3.4" fill="${C.eye}"/><circle cx="6" cy="-142" r="3" fill="${C.eye}"/></g><path d="M-16 -128 q4 4 8 0 q4 4 8 0 q4 4 8 0" stroke="${INK}" stroke-width="2.4" fill="none"/>`
        + `<path d="M-34 -160 Q0 -178 34 -160 Q0 -150 -34 -160 Z M-14 -164 Q-8 -192 10 -186 Q16 -172 14 -162 Z" fill="${C.wood}" ${O(3)}/>`
        + (b ? `<g class="qb-arm" style="transform-origin:-56px -104px"><path d="M-56 -104 L-72 -40" stroke="${LINE}" stroke-width="9" stroke-linecap="round"/><path d="M-56 -104 L-72 -40" stroke="${C.woodD}" stroke-width="4"/><path d="M-72 -40 Q-124 -38 -122 -92 Q-104 -56 -70 -50 Z" fill="${C.metal}" ${O(3)}/></g>`
            + `<g transform="translate(40 -118)"><path d="M0 0 q-10 -14 2 -20 q12 0 12 10 l10 4 l-12 2 q-2 8 -12 4 z" fill="${C.fur}" ${O(2.4)}/><circle cx="2" cy="-12" r="2" fill="${C.eye}"/></g>`
          : `<g class="qb-arm" style="transform-origin:-56px -104px"><path d="M-56 -104 l-8 -10 M-56 -104 l-12 2" stroke="${C.straw}" stroke-width="4" stroke-linecap="round"/></g>`));
    }

    /* ── ворон (зовут пугала): маленький, в воздухе, облезлый, красный глаз ── */
    function crow(o) {
      return idle(o, 0.5, shadow(18) + `<g transform="translate(0 -80)">`
        + `<path d="M-4 0 Q-30 -28 -52 -10 L-44 -8 L-40 0 L-30 -2 L-26 2 Z M4 0 Q20 -32 44 -16 L36 -12 L32 -4 L24 -4 L20 0 Z" fill="${C.furL}" ${O(2.6)}/>`
        + `<path d="M-14 -12 Q-24 -12 -22 -2 Q-20 6 -10 6 Q4 12 20 6 L34 0 L22 -2 Q16 -10 4 -8 Q-4 -14 -14 -12 Z" fill="${C.fur}" ${O(2.6)}/>`
        + `<path d="M-21 -4 l-10 3 l10 2 z" fill="${C.straw}" ${I(1.4)}/><circle class="qb-eye" cx="-15" cy="-5" r="2" fill="${C.eye}"/></g>`);
    }

    /* ── костяк (скелет Изнанки): серые кости, ржавый меч, щит-обломок, трещины; Костяной страж — шлем-череп с рогами, щит из крышки гроба ── */
    function skeleton(o) {
      const b = o.boss, bn = C.bone;
      return idle(o, 1.5, shadow(30)
        + limb('M-14 0 l3 -50 M14 0 l-3 -50', 6, bn)
        + `<path d="M-22 -50 h44 l-6 -58 h-32 Z" fill="${C.dark}" ${O(3)}/>`
        + `<path d="M-18 -58 q18 -6 36 0 M-18 -70 q18 -6 36 0 M-18 -82 q18 -6 36 0 M-16 -94 q16 -6 32 0 M0 -108 v58" stroke="${bn}" stroke-width="5" fill="none" stroke-linecap="round"/>`
        + `<path d="M-22 -50 l-6 -2 l2 -6 M22 -50 l6 -2" stroke="${C.cloth}" stroke-width="4" fill="none"/>`
        + `<g class="qb-arm" style="transform-origin:-18px -100px">${limb('M-18 -100 l-30 20', 5, bn)}<path d="M-50 -80 l-48 -12 l-4 6 l46 14 z" fill="${C.metal}" ${O(2.6)}/><path d="M-86 -88 l-6 8 M-70 -84 l-4 6" stroke="${C.rotP}" stroke-width="3"/></g>`
        + limb('M18 -100 l20 26', 5, bn)
        + (b ? `<path d="M22 -96 h34 l-2 56 q-15 10 -30 0 z" fill="${C.wood}" ${O(3)}/><path d="M39 -88 v34 M30 -76 h18" stroke="${C.boneD}" stroke-width="4"/>`
          : `<path d="M28 -84 q16 -4 24 8 l-6 26 q-12 2 -20 -8 z" fill="${C.cloth}" ${O(3)}/><path d="M34 -70 l10 6" stroke="${C.clothD}" stroke-width="3"/>`)
        + `<path d="M-24 -132 Q-26 -158 0 -158 Q26 -158 24 -132 Q22 -118 12 -116 V-108 H-12 V-116 Q-22 -118 -24 -132 Z" fill="${bn}" ${O(3.4)}/>`
        + `<path d="M4 -158 l-4 10 l6 6 M-8 -116 v-6 M-2 -116 v-6 M4 -116 v-6 M10 -116 v-6" stroke="${INK}" stroke-width="2" fill="none"/>`
        + `<g class="qb-eye"><path d="M-18 -136 q6 -6 12 0 q-2 8 -6 8 q-6 -2 -6 -8 z M2 -136 q6 -6 12 0 q-2 8 -6 8 q-6 -2 -6 -8 z" fill="${C.hole}"/><circle cx="-12" cy="-133" r="2.4" fill="${C.eye}"/><circle cx="8" cy="-133" r="2.4" fill="${C.eye}"/></g>`
        + (b ? `<path d="M-26 -140 Q-26 -166 0 -168 Q26 -166 26 -140 Z M-24 -150 q-20 -6 -24 -26 q14 10 26 12 M24 -150 q20 -6 24 -26 q-14 10 -26 12" fill="${C.metal}" ${O(3)}/>` : ''));
    }

    /* ── Джек-Фонарщик (запасной бой hwBossSimple): только перекрашен в холодную гамму; фонарь и тыква — тёплые ── */
    function jack(o) {
      return idle(o, 2, shadow(40)
        + limb('M-14 0 l-4 -60 M14 0 l4 -60', 12, C.dark)
        + `<path d="M-34 -50 L-30 -150 Q0 -162 30 -150 L34 -50 L22 -60 L12 -44 L2 -60 L-8 -44 L-18 -60 L-26 -46 Z" fill="${C.clothD}" ${O(3.4)}/>`
        + `<path d="M-30 -150 L-48 -110 M30 -150 L48 -114" stroke="${C.clothD}" stroke-width="10" stroke-linecap="round"/>`
        + `<g class="qb-arm" style="transform-origin:-30px -140px">${limb('M-30 -140 Q-60 -120 -66 -90', 9, C.clothD)}<path d="M-66 -90 V-70" stroke="${INK}" stroke-width="2"/>`
        + `<g transform="translate(-66 -56)"><circle r="26" fill="${C.fire}" opacity=".2"/><path d="M-12 -14 h24 l-4 26 h-16 z" fill="${C.metal}" ${O(2.6)}/><ellipse cx="0" cy="0" rx="8" ry="10" fill="${C.fire}"/></g></g>`
        + limb('M30 -140 Q56 -116 60 -84', 9, C.clothD)
        + pumpkinHead(0, -186, 32, { glow: C.fireY })
        + `<path d="M-28 -212 h56 M-18 -212 v-30 h36 v30" fill="${C.fur}" ${O(3)}/><path d="M-18 -220 h36" stroke="${C.lilacL}" stroke-width="4"/>`);
    }

    /* ---------- свои приёмы атак ('css:имя'): класс qb-atk-имя на ~1,2 с; только transform / opacity ---------- */
    const A = (name, kf, extra = '') => `.qb .qb-foe.qb-atk-${name}{animation:qba-${name} 1.15s ease-in-out both;transform-box:fill-box;transform-origin:50% 100%}@keyframes qba-${name}{${kf}}${extra}`;
    const css = [
      // вожак замахивается заметнее рядовых
      '.qb.st-tele .hwb .qb-arm{transform:rotate(-130deg)}',
      // тыквоголов катит тыкву на строй: сам приседает, тыква катится влево
      A('hwroll', '20%{transform:translateX(10px) scale(1.04,.92)}45%{transform:translateX(-30px)}100%{transform:none}',
        '.qb .qb-foe .hwx-head{transform-box:fill-box;transform-origin:50% 50%}.qb .qb-foe.qb-atk-hwroll .hwx-head{animation:qba-hwroll2 1.15s ease-in both}@keyframes qba-hwroll2{0%{transform:none}15%{transform:translateY(-30px) rotate(20deg)}70%{transform:translate(-520px,90px) rotate(-900deg)}85%{transform:translate(-540px,90px) rotate(-960deg);opacity:0}86%{transform:none;opacity:0}100%{transform:none;opacity:1}}'),
      // мертвецы хватают за ноги: уходят в землю и выныривают ближе
      A('hwdig', '0%{transform:none}30%{transform:translateY(40px) scale(1,.35);opacity:.2}60%{transform:translate(-260px,30px) scale(1,.4);opacity:.25}80%{transform:translate(-280px,0) scale(1.05,1);opacity:1}100%{transform:none}'),
      // призрак проходит сквозь строй и возвращается
      A('hwpass', '0%{transform:none;opacity:1}20%{transform:translateX(-80px);opacity:.55}55%{transform:translateX(-620px) translateY(-20px);opacity:.35}75%{transform:translateX(-640px);opacity:0}76%{transform:translateX(40px);opacity:0}100%{transform:none;opacity:1}'),
      // пугало машет серпом: разворот-взмах на месте с шагом вперёд
      A('hwscythe', '15%{transform:translateX(16px) rotate(6deg)}40%{transform:translateX(-120px) rotate(-14deg)}55%{transform:translateX(-140px) rotate(10deg)}100%{transform:none}',
        '.qb .qb-foe.qb-atk-hwscythe .qb-arm{animation:qba-hwscythe2 1.15s ease-in-out both}@keyframes qba-hwscythe2{20%{transform:rotate(-140deg)}45%{transform:rotate(60deg)}100%{transform:none}}'),
      // ведьма таранит на метле: разгон низко над землёй и уход вверх
      A('hwbroom', '15%{transform:translateX(30px) rotate(-6deg)}45%{transform:translate(-560px,60px) rotate(8deg)}65%{transform:translate(-620px,-180px) rotate(-14deg);opacity:.6}66%{opacity:0}67%{transform:translate(60px,-120px);opacity:0}100%{transform:none;opacity:1}'),
      // нетопыри пикируют стаей: зигзаг сверху
      A('hwflock', '15%{transform:translate(20px,-120px)}35%{transform:translate(-160px,40px)}50%{transform:translate(-280px,-60px)}65%{transform:translate(-420px,60px)}100%{transform:none}'),
      // визг: стая взмывает и рассыпается
      A('hwscreech', '0%{transform:none}20%{transform:translateY(-60px) scale(1.15)}30%{transform:translate(-10px,-60px) scale(1.15)}40%{transform:translate(10px,-60px) scale(1.15)}60%{transform:translate(-200px,-140px) scale(.8);opacity:.4}100%{transform:none;opacity:1}'),
      // кот шипит: выгибает спину, дрожит
      A('hwhiss', '15%{transform:scale(1.08,1.2)}25%{transform:scale(1.08,1.2) translateX(-4px)}35%{transform:scale(1.08,1.2) translateX(4px)}45%{transform:scale(1.08,1.2) translateX(-4px)}60%{transform:translateX(-90px) scale(1.04,.9)}100%{transform:none}'),
      // костяк рассыпается и собирается рядом со строем
      A('hwcollapse', '20%{transform:scale(1.1,.2) translateY(10px);opacity:.6}40%{transform:translateX(-300px) scale(1.2,.15);opacity:.4}60%{transform:translateX(-320px) scale(.9,1.1);opacity:1}75%{transform:translateX(-300px)}100%{transform:none}'),
      // тыквёнок катится кувырком
      A('hwtumble', '0%{transform:none}50%{transform:translateX(-300px) rotate(-360deg)}60%{transform:translateX(-320px) rotate(-380deg)}100%{transform:none}'),
      // ворон клюёт рывком
      A('hwpeck', '20%{transform:translate(20px,-30px) rotate(10deg)}45%{transform:translate(-460px,60px) rotate(-20deg)}60%{transform:translate(-440px,40px)}100%{transform:none}'),
    ].join('\n');

    return {
      // 28.10: top / topBoss - по замеру рисунка (getBBox): полоска здоровья и имя - над головой рядового и вожака
      hw_pumpkin: { draw: pumpkin, top: 157, topBoss: 212, attacks: { shield: 'css:hwroll', duck: 'throw', scatter: 'burst' }, missile: { svg: M_SEEDS } },
      hw_pumpkinlet: { draw: pumpkinlet, top: 70, attacks: { shield: 'lunge', duck: 'leap', scatter: 'css:hwtumble' } },
      hw_ghost: { draw: ghost, top: 160, topBoss: 190, attacks: { shield: 'css:hwpass', duck: 'swoop', scatter: 'wave' } },
      hw_bat: { draw: bat, top: 150, topBoss: 202, attacks: { shield: 'swoop', duck: 'css:hwflock', scatter: 'css:hwscreech' } },
      hw_witch: { draw: witch, top: 216, topBoss: 246, attacks: { shield: 'css:hwbroom', duck: 'swoop', scatter: 'burst' }, missile: { svg: M_POTION } },
      hw_zombie: { draw: zombie, top: 168, topBoss: 176, attacks: { shield: 'lunge', duck: 'throw', scatter: 'css:hwdig' }, missile: { svg: M_HAND } },
      hw_spider: { draw: spider, top: 100, topBoss: 118, attacks: { shield: 'lunge', duck: 'leap', scatter: 'spit' }, missile: { svg: M_WEB, blob: C.lilacL } },
      hw_cat: { draw: cat, top: 130, attacks: { shield: 'lunge', duck: 'leap', scatter: 'css:hwhiss' } },
      hw_scarecrow: { draw: scarecrow, top: 196, attacks: { shield: 'css:hwscythe', duck: 'throw', scatter: 'burst' }, missile: { svg: M_CROW } },
      hw_skeleton: { draw: skeleton, top: 162, topBoss: 182, scale: 1.15, attacks: { shield: 'lunge', duck: 'throw', scatter: 'css:hwcollapse' }, missile: { svg: M_SKULL } },
      hw_crow: { draw: crow, top: 104, attacks: { shield: 'css:hwpeck', duck: 'swoop', scatter: 'css:hwflock' } },
      hw_jack: { draw: jack, top: 256, scale: 1.15, attacks: { shield: 'lunge', duck: 'throw', scatter: 'burst' }, missile: { svg: M_ROTPUMP } },
      css,
    };
  });
})();

} catch (e) { console.error('[стили] styles/legion/enemies-hollow.js не загрузился:', e); }

/* ───── стиль «legion»: styles/legion/enemies-dungeon.js ───── */
try {
/* Стиль «Легион» — монстры данжей (22.10, quest/dgpacks.js: 26 стай — по одной на регион и вариацию данжа).
   Договор — styles/ENEMIES.md: ноги в (0, 0), смотрит ВЛЕВО, ширина ~200, рост — top; классы qb-idle (всё тело), qb-arm (замах,
   transform-origin — плечо), qb-eye (мерцание). Без filter и без <text>. Вожак — o.boss (другой облик; ×1,25 делает бой сам).
   Оверлей боя ищет врага в 'enemies' стиля, потом в 'enemies-hollow' и 'enemies-dungeon' (modules/quest/client/battle.js).
   Вид — как у врагов Изнанки (enemies-hollow.js): белая обводка-наклейка, плоские заливки, тёмные детали.
   Боссы данжа (PR #49, quest/dgboss.js) — ключи dgb_* в этом же файле (свои помощники — в отдельной области, DGB ниже): dgb_light, dgb_living,
   dgb_golem, dgb_maze, dgb_spider, dgb_clock, dgb_shroom, dgb_knight (босс / его прислужник). */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('legion', 'enemies-dungeon', function () {
    const LINE = '#f5f2ff', INK = '#15122e';
    const O = (w = 3) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const I = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const sp = (o, a = 1.2) => (a + ((o.seed || 0) % 7) / 10).toFixed(2);
    const idle = (o, a, inner) => `<g class="qb-idle" style="animation-duration:${sp(o, a)}s">${inner}</g>`;
    const limb = (d, w, c) => `<path d="${d}" stroke="${LINE}" stroke-width="${w + 6}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    const arm = (x, y, inner) => `<g class="qb-arm" style="transform-origin:${x}px ${y}px">${inner}</g>`;
    const eye = (x, y, r, c) => `<circle class="qb-eye" cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
    const eyes2 = (x, y, dx, r, c) => eye(x, y, r, c) + eye(x + dx, y, r, c);
    const shadow = (w = 60) => `<ellipse cx="0" cy="2" rx="${w}" ry="7" fill="${INK}" opacity=".25"/>`;
    const crown = (x, y, w, c = '#ffd34d') => `<path d="M${x - w} ${y} l${w * 0.25} ${-w * 0.7} l${w * 0.35} ${w * 0.45} l${w * 0.4} ${-w * 0.65} l${w * 0.4} ${w * 0.65} l${w * 0.35} ${-w * 0.45} l${w * 0.25} ${w * 0.7} z" fill="${c}" ${I(2)}/>`;
    const svg40 = (inner) => `<svg width="40" height="40" viewBox="-20 -20 40 40">${inner}</svg>`;

    /* ───────── Пески Забвения ───────── */
    // мумия-страж: бинты, руки вперёд, синие глаза в прорези; вожак — жрец-бальзамировщик в немесе с кадилом
    function dg_mummy(o) {
      if (o.boss) return idle(o, 1.7, `${shadow(56)}
        ${limb('M-16 0 v-40 M14 0 v-40', 14, '#2a3a5a')}
        <path d="M-40 -34 Q-44 -120 0 -128 Q44 -120 40 -34 Q0 -22 -40 -34 Z" fill="#2c4a72" ${O(3.4)}/>
        <path d="M-30 -110 L30 -110 L22 -40 L-22 -40 Z" fill="#d8a83a" opacity=".85"/>
        <path d="M-26 -96 H26 M-24 -80 H24 M-22 -64 H22" stroke="#2c4a72" stroke-width="5"/>
        ${arm(-30, -104, `${limb('M-30 -104 Q-62 -100 -76 -78', 11, '#c8b890')}<path d="M-76 -78 v40" stroke="${INK}" stroke-width="3"/><path d="M-90 -40 h28 l-6 18 h-16 z" fill="#d8a83a" ${O(2.6)}/><path d="M-84 -22 q8 -18 2 -32 M-72 -24 q-6 -14 4 -28" stroke="#c8d8e8" stroke-width="3" fill="none" opacity=".7"/>`)}
        <path d="M-34 -138 Q-34 -186 0 -190 Q34 -186 34 -138 L44 -96 L26 -104 L-26 -104 L-44 -96 Z" fill="#d8a83a" ${O(3.4)}/>
        <path d="M-40 -126 l-6 30 M-30 -132 l-10 34 M30 -132 l10 34 M40 -126 l6 30" stroke="#2c4a72" stroke-width="5"/>
        <path d="M-22 -168 Q-22 -128 0 -124 Q22 -128 22 -168 Q0 -176 -22 -168 Z" fill="#f0c860" ${I(2)}/>
        <path d="M-16 -154 h10 M2 -154 h10" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${eyes2(-11, -154, 18, 3, '#5ad0ff')}
        <path d="M-6 -136 h12 v10 h-12 z" fill="#2c4a72"/>`);
      return idle(o, 1.3, `${shadow(44)}
        ${limb('M-12 0 v-38 M12 0 v-38', 13, '#d8cca8')}
        <path d="M-30 -32 Q-34 -104 0 -110 Q34 -104 30 -32 Q0 -24 -30 -32 Z" fill="#e8dcc0" ${O(3.4)}/>
        <path d="M-28 -90 l56 -10 M-30 -70 l58 8 M-28 -50 l56 -12 M-20 -100 l36 22" stroke="#b8a888" stroke-width="3" fill="none"/>
        ${arm(-24, -88, `${limb('M-24 -88 L-74 -84', 12, '#e8dcc0')}<path d="M-74 -84 l-10 -6 M-74 -84 l-12 2 M-74 -84 l-8 8" stroke="#e8dcc0" stroke-width="5" stroke-linecap="round"/><path d="M-36 -88 l-6 8 M-52 -86 l-4 8" stroke="#b8a888" stroke-width="2.5"/>`)}
        ${limb('M24 -86 L-30 -74', 11, '#d8cca8')}
        <ellipse cx="0" cy="-130" rx="22" ry="24" fill="#e8dcc0" ${O(3.4)}/>
        <path d="M-20 -142 l40 6 M-22 -124 l44 -4 M-18 -112 l36 2" stroke="#b8a888" stroke-width="3"/>
        <path d="M-18 -134 h26" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>${eyes2(-12, -134, 14, 3, '#5ad0ff')}
        <path d="M18 -126 q14 10 10 28" stroke="#e8dcc0" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    }
    // червь-прыгун: сегменты дугой из песка, круглая пасть с зубами; вожак — матка в янтаре
    function dg_sandworm(o) {
      const big = !!o.boss, c = big ? '#c8763a' : '#d8a060', c2 = big ? '#a85a2a' : '#b8844a', seg = big ? [[30, -20, 30], [14, -56, 30], [-8, -90, 30], [-34, -112, 30]] : [[26, -16, 22], [12, -44, 22], [-6, -70, 22], [-26, -88, 22]];
      let body = '';
      for (const [x, y, r] of seg.slice().reverse()) body += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.86}" fill="${c}" ${O(3.4)}/><path d="M${x - r * 0.7} ${y + r * 0.2} q${r * 0.7} ${r * 0.5} ${r * 1.4} 0" stroke="${c2}" stroke-width="3" fill="none"/>`;
      const [hx, hy, hr] = seg[seg.length - 1];
      // пасть: кольцо треугольных зубов остриём внутрь
      let teeth = ''; const mx = hx - hr * 0.5, R1 = hr * 0.6, R2 = hr * 0.28;
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, a1 = a - 0.3, a2 = a + 0.3, P = (r, t) => `${(mx + Math.cos(t) * r).toFixed(1)} ${(hy + Math.sin(t) * r * 1.05).toFixed(1)}`; teeth += `<path d="M${P(R1, a1)} L${P(R2, a)} L${P(R1, a2)} Z" fill="#f8f0d8"/>`; }
      const amber = big ? `<path d="M-6 -78 l-10 -26 l18 6 z M22 -46 l2 -28 l14 18 z M40 -14 l14 -22 l6 22 z" fill="#ffb030" opacity=".9" ${I(2)}/><circle cx="-2" cy="-92" r="4" fill="#5a2a0a"/>` : '';
      return idle(o, big ? 1.6 : 1.1, `${shadow(big ? 70 : 56)}
        <path d="M-60 2 Q-40 -18 0 -16 Q50 -18 70 2 Z" fill="#e8c890" ${O(3)}/>
        ${body}${amber}
        <ellipse cx="${hx - hr * 0.5}" cy="${hy}" rx="${hr * 0.62}" ry="${hr * 0.66}" fill="${INK}" ${O(3)}/>${teeth}
        <circle cx="${hx - hr * 0.5}" cy="${hy}" r="${hr * 0.16}" fill="#a83a2a"/>
        ${eye(hx + hr * 0.2, hy - hr * 0.55, big ? 5 : 4, big ? '#ff4a2a' : '#ffd34d')}${eye(hx + hr * 0.5, hy - hr * 0.35, big ? 5 : 4, big ? '#ff4a2a' : '#ffd34d')}
        ${big ? crown(hx + 4, hy - hr * 0.78, 14, '#ffb030') : ''}
        <path d="M-50 0 q6 -8 14 -2 M40 0 q8 -10 16 -2" stroke="#c8a060" stroke-width="3" fill="none"/>`);
    }

    /* ───────── Гнилые Топи ───────── */
    // тинник: сгорбленный утопленник-храмовник в тине, обломок подсвечника; вожак — звонарь с колоколом
    function dg_tinnik(o) {
      const big = !!o.boss, skin = '#7a9a8a', robe = big ? '#3a4a3a' : '#4a5a48';
      const hand = big ? `<path d="M-84 -66 q-4 -26 16 -30 q20 4 16 30 z" fill="#a8743a" ${O(3)}/><path d="M-80 -66 h28" stroke="${INK}" stroke-width="3"/><circle cx="-66" cy="-60" r="5" fill="#6a4a2a" ${I(2)}/>`
        : `<path d="M-80 -60 v-34" stroke="#b89a5a" stroke-width="6" stroke-linecap="round"/><path d="M-90 -94 h20" stroke="#b89a5a" stroke-width="5" stroke-linecap="round"/><path d="M-84 -94 v-8 M-76 -94 v-8" stroke="#e8e0c8" stroke-width="4"/>`;
      return idle(o, big ? 1.6 : 1.3, `${shadow(48)}
        ${limb('M-14 0 v-36 M14 0 v-36', 13, skin)}
        <path d="M-34 -30 Q-40 -96 -6 -112 Q34 -110 34 -30 Q0 -20 -34 -30 Z" fill="${robe}" ${O(3.4)}/>
        <path d="M-30 -50 q4 18 -2 30 M-10 -60 q6 20 0 40 M16 -70 q4 24 -2 46" stroke="#6a8a3a" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${arm(-24, -86, `${limb('M-24 -86 Q-52 -82 -74 -64', 11, skin)}${hand}`)}
        <ellipse cx="-14" cy="-124" rx="22" ry="22" fill="${skin}" ${O(3.4)}/>
        <path d="M-34 -136 q4 30 -2 50 M-24 -146 q-4 30 -10 46 M6 -144 q10 26 6 50 M14 -136 q12 20 8 40" stroke="#4a6a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${big ? `<path d="M-40 -130 Q-14 -170 14 -130 Z" fill="#2a3a2a" ${O(3)}/>` : ''}
        ${eyes2(-28, -126, 14, 4, '#c8ff6a')}
        <path d="M-26 -112 q8 4 14 0" stroke="${INK}" stroke-width="3" fill="none"/>
        <path d="M-6 -102 q0 10 -4 18" stroke="#8aaa4a" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    }
    // склянка: круглая колба на ножках, пробка, жидкость; вожак — котёл на куриных ножках с половником
    function dg_potion(o) {
      if (o.boss) return idle(o, 1.5, `${shadow(56)}
        ${limb('M-24 -20 l-10 20 m10 -20 l4 20 M24 -20 l-4 20 m4 -20 l12 20', 6, '#e8a840')}
        <path d="M-56 -64 Q-60 -12 0 -14 Q60 -12 56 -64 Z" fill="#3a3448" ${O(3.4)}/>
        <path d="M-60 -66 Q0 -82 60 -66 Q60 -58 0 -54 Q-60 -58 -60 -66 Z" fill="#5a5468" ${O(3)}/>
        <ellipse cx="0" cy="-66" rx="52" ry="9" fill="#7aff5a"/>
        <circle cx="-20" cy="-74" r="8" fill="#7aff5a" ${O(2)}/><circle cx="14" cy="-80" r="6" fill="#7aff5a" ${O(2)}/><circle cx="2" cy="-92" r="4" fill="#aaff8a"/>
        ${arm(30, -66, `<path d="M30 -66 L-40 -120" stroke="${LINE}" stroke-width="10" stroke-linecap="round"/><path d="M30 -66 L-40 -120" stroke="#8a6a3a" stroke-width="5" stroke-linecap="round"/><ellipse cx="-44" cy="-120" rx="12" ry="7" fill="#8a6a3a" ${O(2.6)}/>`)}
        ${eyes2(-30, -40, 22, 6, '#ffd34d')}
        <path d="M-28 -26 q10 6 22 0" stroke="${LINE}" stroke-width="3" fill="none"/>`);
      const C = ['#7aff5a', '#c86aff', '#ff5a6a'][(o.seed || 0) % 3];
      return idle(o, 1, `${shadow(30)}
        ${limb('M-10 -12 v12 M10 -12 v12', 6, '#6a5a4a')}
        <path d="M-30 -40 Q-32 -8 0 -8 Q32 -8 30 -40 Q30 -62 10 -66 V-86 H-10 V-66 Q-30 -62 -30 -40 Z" fill="#d8eef8" opacity=".95" ${O(3.4)}/>
        <path d="M-28 -36 Q0 -26 28 -36 Q28 -10 0 -10 Q-28 -10 -28 -36 Z" fill="${C}"/>
        <rect x="-12" y="-98" width="24" height="14" rx="3" fill="#a8743a" ${O(2.6)}/>
        ${eyes2(-14, -46, 14, 4.5, INK)}
        <path d="M-12 -34 q6 4 12 0" stroke="${INK}" stroke-width="2.5" fill="none"/>
        <circle cx="16" cy="-28" r="3" fill="#fff" opacity=".7"/><circle cx="-4" cy="-22" r="2" fill="#fff" opacity=".7"/>`);
    }

    /* ───────── Дикая Пуща ───────── */
    // корнеед: деревянный червь из корней с пастью; вожак — корень-душитель (сплетение корней с лицом, хватающий корень)
    function dg_rootworm(o) {
      if (o.boss) return idle(o, 1.8, `${shadow(60)}
        <path d="M-50 0 Q-40 -20 -30 0 M-10 0 Q0 -24 10 0 M30 0 Q40 -18 54 0" stroke="#5a3a1e" stroke-width="10" fill="none" stroke-linecap="round"/>
        <path d="M-40 -6 Q-56 -90 -20 -150 Q10 -170 30 -140 Q50 -80 40 -6 Z" fill="#6a4a2a" ${O(3.4)}/>
        <path d="M-26 -20 q-10 -60 10 -120 M0 -10 q10 -70 -4 -140 M24 -20 q12 -50 0 -110" stroke="#4a2e16" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${arm(-30, -110, `${limb('M-30 -110 Q-80 -120 -96 -80 Q-104 -50 -84 -40', 12, '#6a4a2a')}<path d="M-84 -40 l-14 6 M-84 -40 l-4 14 M-84 -40 l10 8" stroke="#6a4a2a" stroke-width="6" stroke-linecap="round"/>`)}
        <path d="M-10 -150 l-14 -26 M8 -156 l4 -28 M22 -146 l18 -20" stroke="#4a8a3a" stroke-width="6" stroke-linecap="round"/><circle cx="-24" cy="-178" r="6" fill="#6aaa4a"/><circle cx="12" cy="-186" r="6" fill="#6aaa4a"/>
        ${eyes2(-18, -118, 22, 6, '#c8ff6a')}
        <path d="M-22 -96 Q-6 -84 12 -96 Q-4 -76 -22 -96 Z" fill="${INK}" ${I(2)}/>`);
      return idle(o, 1.2, `${shadow(56)}
        <path d="M60 -6 Q40 -40 10 -44 Q-30 -48 -46 -30 Q-60 -14 -50 -4 Q-20 -18 10 -16 Q40 -14 60 -6 Z" fill="#7a5a32" ${O(3.4)}/>
        <path d="M40 -16 q-6 -14 -18 -20 M14 -18 q-4 -14 -14 -22 M-14 -22 q-2 -10 -10 -16" stroke="#4a2e16" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M58 -8 l12 6 M50 -4 l8 10 M30 -14 l2 14 M0 -16 l-2 14 M-30 -20 l-8 16" stroke="#7a5a32" stroke-width="4" stroke-linecap="round"/>
        <path d="M-54 -28 Q-70 -32 -74 -20 Q-66 -8 -50 -10 Z" fill="${INK}" ${O(2.6)}/>
        <path d="M-70 -24 l6 4 M-64 -14 l6 -2 M-66 -28 l4 6" stroke="#f0e8d0" stroke-width="3" stroke-linecap="round"/>
        ${eye(-40, -38, 4, '#c8ff6a')}
        <path d="M-6 -46 q2 -14 12 -16 M20 -44 q4 -10 12 -10" stroke="#4a8a3a" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    }
    // мухомор-пехотинец: красная шляпка в белых точках, ножка-тело, копьё; вожак — гриб-глашатай с трубой и знаменем
    function dg_mushroom(o) {
      const big = !!o.boss, w = big ? 62 : 46, ch = big ? -130 : -96;
      let dots = ''; for (const [x, y, r] of [[-0.5, 0.35, 0.12], [0.1, 0.55, 0.14], [0.55, 0.3, 0.1], [-0.15, 0.15, 0.09], [0.35, 0.7, 0.08]]) dots += `<circle cx="${(x * w).toFixed(1)}" cy="${(ch + 6 - y * w * 0.7).toFixed(1)}" r="${(r * w).toFixed(1)}" fill="#f8f4e8"/>`;
      const hand = big ? `<path d="M-34 -70 L-70 -84" stroke="#e8c840" stroke-width="7" stroke-linecap="round"/><path d="M-70 -84 l-16 -10 v24 z" fill="#e8c840" ${O(2.6)}/>`
        : `<path d="M-30 -52 L-62 -110" stroke="#8a6a3a" stroke-width="5" stroke-linecap="round"/><path d="M-62 -110 l-6 -16 l12 8 z" fill="#c8ccd8" ${O(2)}/>`;
      return idle(o, big ? 1.5 : 1.15, `${shadow(big ? 46 : 34)}
        ${limb('M-10 0 v-20 M10 0 v-20', 10, '#e8dcc8')}
        <path d="M-${w * 0.42} -16 Q-${w * 0.48} ${ch * 0.6} -${w * 0.3} ${ch + 6} H${w * 0.3} Q${w * 0.48} ${ch * 0.6} ${w * 0.42} -16 Q0 -8 -${w * 0.42} -16 Z" fill="#f0e8d8" ${O(3.4)}/>
        ${big ? `<path d="M${w * 0.4} -40 v-90" stroke="#8a6a3a" stroke-width="5"/><path d="M${w * 0.4} -130 h34 l-8 14 l8 14 h-34 z" fill="#c8302a" ${O(2.6)}/>` : ''}
        ${arm(-w * 0.36, -60, `${limb(`M-${w * 0.36} -60 L-34 -${big ? 70 : 52}`, 8, '#e8dcc8')}${hand}`)}
        <path d="M-${w} ${ch + 10} Q-${w * 0.9} ${ch - w * 0.8} 0 ${ch - w * 0.82} Q${w * 0.9} ${ch - w * 0.8} ${w} ${ch + 10} Q0 ${ch + 22} -${w} ${ch + 10} Z" fill="#d8302a" ${O(3.4)}/>${dots}
        <path d="M-${w * 0.7} ${ch + 14} Q0 ${ch + 26} ${w * 0.7} ${ch + 14}" stroke="#c8b8a0" stroke-width="3" fill="none"/>
        ${eyes2(-14, ch + 34, 14, big ? 5 : 4, INK)}
        <path d="M-14 ${ch + 48} q8 -4 14 0" stroke="${INK}" stroke-width="3" fill="none"/>
        ${big ? crown(0, ch - w * 0.78, 16) : ''}`);
    }

    /* ───────── Каменный Хребет ───────── */
    // мёртвый забойщик: призрак гнома с кайлом и свечой на каске; вожак — штейгер с фонарём
    function dg_minerghost(o) {
      const big = !!o.boss, c = '#8ad8d8', c2 = '#5aa8b0';
      const tool = big ? `<path d="M-70 -70 v-24" stroke="#5a4a3a" stroke-width="4"/><path d="M-84 -94 h28 v34 h-28 z" fill="#3a3448" ${O(2.6)}/><rect x="-80" y="-88" width="20" height="22" fill="#ffd34d" class="qb-eye"/>`
        : `<path d="M-60 -54 L-50 -112" stroke="#8a6a4a" stroke-width="6" stroke-linecap="round"/><path d="M-80 -104 Q-50 -128 -20 -108" stroke="#c8ccd8" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      return idle(o, big ? 1.7 : 1.4, `<g opacity=".88">
        <path d="M-34 -10 Q-30 -4 -20 -12 Q-10 -2 0 -12 Q10 -2 20 -12 Q30 -4 34 -10 Q42 -60 30 -84 Q0 -100 -30 -84 Q-42 -60 -34 -10 Z" fill="${c}" ${O(3.4)}/>
        <path d="M-24 -30 Q0 -22 24 -30" stroke="${c2}" stroke-width="3" fill="none"/>
        ${arm(-24, -70, `${limb('M-24 -70 L-56 -60', 10, c)}${tool}`)}
        <circle cx="-4" cy="-104" r="24" fill="${c}" ${O(3.4)}/>
        <path d="M-28 -90 Q-30 -60 -4 -56 Q22 -60 20 -90 Q-4 -80 -28 -90 Z" fill="#e8f8f8" ${O(2.6)}/>
        <path d="M-30 -112 Q-4 -144 22 -112 Z" fill="${big ? '#c8a040' : '#8a7a5a'}" ${O(3)}/>
        <path d="M-6 -134 v-10" stroke="#f0e8d0" stroke-width="6"/><path d="M-6 -146 q-6 -8 0 -16 q6 8 0 16 z" fill="#ffd34d"/>
        ${eyes2(-16, -106, 14, 4, INK)}
        ${big ? '<path d="M-24 -116 h40" stroke="#5a4a2a" stroke-width="3"/>' : ''}</g>`);
    }
    // заводной болванчик: латунный корпус, ключ на спине, круглая голова с циферблатами; вожак — паровой страж с трубой
    function dg_automaton(o) {
      const big = !!o.boss, b = big ? '#a87a3a' : '#c89a4a', b2 = big ? '#7a5a2a' : '#9a7a3a', W = big ? 46 : 34, H0 = big ? -120 : -92;
      return idle(o, big ? 1.8 : 1.3, `${shadow(big ? 50 : 38)}
        ${limb(`M-${W * 0.4} 0 v-22 M${W * 0.4} 0 v-22`, big ? 14 : 11, '#5a5a62')}
        <rect x="-${W}" y="${H0 * 0.78}" width="${W * 2}" height="${-H0 * 0.6}" rx="8" fill="${b}" ${O(3.4)}/>
        <path d="M-${W - 8} ${H0 * 0.6} H${W - 8}" stroke="${b2}" stroke-width="4"/>
        ${[0.7, 0.5, 0.3].map((k) => `<circle cx="-${W - 8}" cy="${(H0 * k).toFixed(0)}" r="3" fill="${b2}"/><circle cx="${W - 8}" cy="${(H0 * k).toFixed(0)}" r="3" fill="${b2}"/>`).join('')}
        <circle cx="0" cy="${(H0 * 0.48).toFixed(0)}" r="${W * 0.36}" fill="#e8dcc0" ${I(2)}/><path d="M0 ${(H0 * 0.48).toFixed(0)} l0 -${W * 0.26} M0 ${(H0 * 0.48).toFixed(0)} l${W * 0.2} 4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M${W} ${H0 * 0.55} h14 m0 -12 v24 m0 -12 h10 m0 -10 v20" stroke="#8a8a92" stroke-width="5" stroke-linecap="round" fill="none"/>
        ${arm(-W + 4, H0 * 0.7, `${limb(`M-${W - 4} ${H0 * 0.7} L-${W + 30} ${H0 * 0.45}`, 9, '#7a7a82')}<rect x="-${W + 44}" y="${H0 * 0.45 - 12}" width="26" height="22" rx="3" fill="#5a5a62" ${O(2.6)}/>`)}
        <rect x="-${W * 0.7}" y="${H0 - 4}" width="${W * 1.4}" height="${-H0 * 0.24}" rx="6" fill="${b}" ${O(3.4)}/>
        ${eye(-W * 0.32, H0 + 10, big ? 7 : 5, big ? '#ff4a2a' : '#5ad0ff')}${eye(W * 0.12, H0 + 10, big ? 7 : 5, big ? '#ff4a2a' : '#5ad0ff')}
        <path d="M-${W * 0.4} ${H0 + 22} h${W * 0.6}" stroke="${INK}" stroke-width="3" stroke-dasharray="4 3"/>
        ${big ? `<rect x="${W * 0.2}" y="${H0 - 30}" width="14" height="28" fill="#5a5a62" ${O(2.6)}/><circle cx="${W * 0.2 + 7}" cy="${H0 - 44}" r="10" fill="#e8e8f0" opacity=".7"/><circle cx="${W * 0.2 + 18}" cy="${H0 - 60}" r="8" fill="#e8e8f0" opacity=".5"/>` : `<path d="M0 ${H0 - 4} v-12 m-8 0 h16" stroke="#8a8a92" stroke-width="4" stroke-linecap="round"/>`}`);
    }

    /* ───────── Ледяной Предел ───────── */
    // ледышка: големчик из ледяных глыб; вожак — снеговик-страж с ведром-шлемом и ледяным копьём
    function dg_icelet(o) {
      if (o.boss) return idle(o, 1.7, `${shadow(50)}
        <circle cx="0" cy="-40" r="40" fill="#f0f8ff" ${O(3.4)}/><circle cx="2" cy="-104" r="30" fill="#f0f8ff" ${O(3.4)}/><circle cx="4" cy="-150" r="22" fill="#f0f8ff" ${O(3.4)}/>
        <circle cx="0" cy="-50" r="4" fill="${INK}"/><circle cx="2" cy="-30" r="4" fill="${INK}"/><circle cx="2" cy="-104" r="4" fill="${INK}"/>
        <path d="M-12 -172 l-4 -24 h40 l-4 24 z" fill="#8a8a92" ${O(2.6)}/><path d="M-16 -196 h40" stroke="#5a5a62" stroke-width="4"/>
        <path d="M-10 -150 l-26 4 l26 6 z" fill="#ff8a2a" ${I(2)}/>
        ${eye(-4, -158, 4, '#5ad0ff')}${eye(12, -158, 4, '#5ad0ff')}
        ${arm(-24, -110, `<path d="M-24 -110 L-64 -96" stroke="#7a5a3a" stroke-width="6" stroke-linecap="round"/><path d="M-60 -60 L-68 -150" stroke="#7a5a3a" stroke-width="5"/><path d="M-68 -150 l-6 -24 l14 10 z" fill="#c8f0ff" ${O(2.4)}/>`)}
        <path d="M24 -110 L56 -128 M50 -124 l10 -8 M48 -126 l4 -12" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/>
        <path d="M-16 -128 Q4 -118 24 -128 l-4 10 Q4 -110 -12 -118 z" fill="#3a5a9a" ${O(2)}/>`);
      return idle(o, 1.2, `${shadow(40)}
        ${limb('M-14 0 v-14 M14 0 v-14', 12, '#a8d8f0')}
        <path d="M-36 -14 L-40 -60 L-10 -74 L30 -66 L38 -18 L0 -8 Z" fill="#c8ecff" ${O(3.4)}/>
        <path d="M-24 -50 l20 -10 l24 6 M-30 -30 l30 6" stroke="#8ac8e8" stroke-width="3" fill="none"/>
        ${arm(-34, -50, `<path d="M-34 -50 L-58 -40 L-62 -26 L-46 -28 Z" fill="#a8d8f0" ${O(3)}/>`)}
        <path d="M-22 -72 L-28 -98 L-2 -110 L20 -100 L22 -74 Z" fill="#e0f4ff" ${O(3.4)}/>
        <path d="M-14 -88 l10 3 M2 -88 l10 -3" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${eyes2(-10, -84, 16, 3.5, '#2a7ad0')}
        <path d="M-10 -76 q8 -4 14 0" stroke="${INK}" stroke-width="2.5" fill="none"/>
        <path d="M-20 -108 l-4 -14 l10 8 M6 -112 l2 -16 l8 12" fill="#ffffff" ${I(1.5)}/>`);
    }
    // мёрзлый мертвец: бледный, иней на плечах, сосульки на руках; вожак — ледяной лич в капюшоне с короной и посохом
    function dg_frostdead(o) {
      if (o.boss) return idle(o, 1.8, `${shadow(52)}
        <path d="M-44 -6 Q-50 -120 0 -132 Q50 -120 44 -6 Q0 4 -44 -6 Z" fill="#2a3a6a" ${O(3.4)}/>
        <path d="M-40 -10 l8 -16 l8 16 l8 -16 l8 16 l8 -16 l8 16 l8 -16 l8 16 l8 -16" stroke="#8ac8f0" stroke-width="3" fill="none"/>
        ${arm(-30, -100, `${limb('M-30 -100 Q-56 -92 -70 -70', 10, '#c8d8e8')}<path d="M-74 -10 L-70 -160" stroke="#8a9aa8" stroke-width="5"/><path d="M-70 -160 l-12 -14 l12 -14 l12 14 z" fill="#8ae0ff" ${O(2.6)}/>`)}
        <path d="M-30 -126 Q-30 -180 4 -184 Q36 -180 34 -126 Q4 -116 -30 -126 Z" fill="#1e2a52" ${O(3.4)}/>
        <ellipse cx="0" cy="-140" rx="16" ry="18" fill="#e8f0f8" ${I(2)}/>
        ${eyes2(-8, -144, 12, 4, '#5ad0ff')}
        <path d="M-8 -130 h12" stroke="${INK}" stroke-width="2.5"/>
        <path d="M-22 -176 l6 -20 l6 14 l6 -22 l6 22 l6 -14 l6 20 z" fill="#c8f0ff" ${O(2)}/>`);
      return idle(o, 1.4, `${shadow(44)}
        ${limb('M-12 0 v-40 M12 0 v-40', 12, '#a8b8c8')}
        <path d="M-30 -36 Q-34 -100 0 -106 Q34 -100 30 -36 Q0 -28 -30 -36 Z" fill="#5a6a7a" ${O(3.4)}/>
        <path d="M-26 -50 l6 10 l6 -10 l6 10 l6 -10 l6 10 l6 -10" stroke="#3a4a5a" stroke-width="3" fill="none"/>
        <path d="M-34 -96 Q0 -112 34 -96 L30 -88 Q0 -100 -30 -88 Z" fill="#e8f8ff" ${O(2)}/>
        ${arm(-26, -90, `${limb('M-26 -90 L-70 -80', 11, '#a8b8c8')}<path d="M-40 -82 l-2 14 M-52 -80 l0 12 M-64 -78 l2 10" stroke="#c8f0ff" stroke-width="4" stroke-linecap="round"/>`)}
        <ellipse cx="-4" cy="-126" rx="20" ry="22" fill="#b8c8d8" ${O(3.4)}/>
        <path d="M-22 -138 Q-4 -156 16 -138" stroke="#e8f8ff" stroke-width="7" fill="none" stroke-linecap="round"/>
        ${eyes2(-14, -126, 14, 4, '#5ad0ff')}
        <path d="M-14 -112 l4 -4 l4 4 l4 -4 l4 4" stroke="${INK}" stroke-width="2" fill="none"/>`);
    }

    /* ───────── Белый Венец ───────── */
    // немой послушник: капюшон, повязка на рту, посох; вожак — настоятель с колоколом
    function dg_monk(o) {
      const big = !!o.boss, robe = big ? '#5a4a8a' : '#8a7a6a', robe2 = big ? '#3a2e6a' : '#6a5a4a';
      const hand = big ? `<path d="M-74 -86 q-4 -30 18 -34 q22 4 18 34 z" fill="#d8a840" ${O(3)}/><path d="M-74 -86 h36" stroke="${INK}" stroke-width="3"/><circle cx="-56" cy="-80" r="5" fill="#8a6a2a" ${I(2)}/><path d="M-56 -120 v-10" stroke="#8a6a2a" stroke-width="4"/>`
        : `<path d="M-66 -10 L-56 -150" stroke="#8a6a4a" stroke-width="6" stroke-linecap="round"/><circle cx="-56" cy="-152" r="7" fill="#d8b860" ${O(2)}/>`;
      return idle(o, big ? 1.8 : 1.5, `${shadow(44)}
        <path d="M-34 -2 Q-40 -110 -4 -118 Q32 -110 30 -2 Q0 6 -34 -2 Z" fill="${robe}" ${O(3.4)}/>
        <path d="M-6 -110 Q-10 -60 -4 -2" stroke="${robe2}" stroke-width="4" fill="none"/><path d="M-30 -60 H26" stroke="#c8a860" stroke-width="5"/>
        ${arm(-26, -96, `${limb('M-26 -96 Q-48 -94 -60 -84', 11, robe)}${hand}`)}
        <path d="M-30 -112 Q-34 -162 -2 -166 Q30 -162 26 -112 Q-2 -100 -30 -112 Z" fill="${robe2}" ${O(3.4)}/>
        <ellipse cx="-8" cy="-130" rx="15" ry="17" fill="#e8c8a8" ${I(2)}/>
        <path d="M-22 -124 Q-8 -116 6 -124 L6 -116 Q-8 -108 -22 -116 Z" fill="#e8e0d0" ${I(1.5)}/>
        ${eyes2(-16, -136, 13, 3, INK)}
        ${big ? crown(-2, -164, 14, '#d8a840') : ''}`);
    }
    // живая астролябия: кольца вокруг шара на латунных ножках, глаз в центре; вожак — механический глобус на подставке
    function dg_astro(o) {
      if (o.boss) return idle(o, 2, `${shadow(46)}
        ${limb('M-20 0 L-6 -40 M20 0 L6 -40', 8, '#a87a3a')}
        <rect x="-24" y="-48" width="48" height="12" rx="4" fill="#a87a3a" ${O(2.6)}/>
        <path d="M30 -110 A44 44 0 1 1 -20 -150" stroke="#c89a4a" stroke-width="8" fill="none" ${''}/>
        <circle cx="0" cy="-104" r="40" fill="#3a6aa8" ${O(3.4)}/>
        <path d="M-30 -120 q14 -6 20 6 q10 14 -6 22 q-14 -2 -14 -28 z M8 -132 q18 4 20 20 q-12 10 -22 -2 z M4 -86 q14 0 18 10 q-10 8 -20 0 z" fill="#5aa860" ${I(1.5)}/>
        <path d="M-40 -104 H40" stroke="#c89a4a" stroke-width="4"/>
        ${eye(-8, -108, 8, '#ffe08a')}<circle cx="-8" cy="-108" r="3" fill="${INK}"/>
        <g opacity=".9"><path d="M-60 -160 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 z M50 -150 l2 5 l5 1 l-4 3 l1 5 l-4 -2 l-4 2 l1 -5 l-4 -3 l5 -1 z" fill="#ffe08a" ${I(1.2)}/></g>`);
      return idle(o, 1.4, `${shadow(34)}
        ${limb('M-14 0 L-6 -30 M14 0 L6 -30', 6, '#a87a3a')}
        <circle cx="0" cy="-64" r="36" fill="none" stroke="${LINE}" stroke-width="12"/><circle cx="0" cy="-64" r="36" fill="none" stroke="#c89a4a" stroke-width="6"/>
        <ellipse cx="0" cy="-64" rx="36" ry="12" fill="none" stroke="${LINE}" stroke-width="10" transform="rotate(-25 0 -64)"/><ellipse cx="0" cy="-64" rx="36" ry="12" fill="none" stroke="#e0b860" stroke-width="5" transform="rotate(-25 0 -64)"/>
        <circle cx="0" cy="-64" r="18" fill="#2a3a6a" ${O(3)}/>${eye(-4, -64, 7, '#ffe08a')}<circle cx="-4" cy="-64" r="3" fill="${INK}"/>
        <path d="M0 -100 v-10 m-6 6 l6 -12 l6 12" stroke="#c89a4a" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    }

    /* ───────── Выжженный Край ───────── */
    // лавовый слизень: капля магмы с трещинами; вожак — огненная саламандра
    function dg_lavaslime(o) {
      if (o.boss) return idle(o, 1.4, `${shadow(60)}
        ${limb('M-30 -16 l-10 16 M-6 -16 l-6 16 M30 -16 l8 16 M50 -18 l12 16', 8, '#c83a1a')}
        <path d="M60 -30 Q100 -40 112 -70 Q100 -30 64 -16 Z" fill="#c83a1a" ${O(3)}/>
        <path d="M-60 -30 Q-56 -62 -10 -64 Q50 -66 66 -36 Q60 -12 0 -12 Q-50 -12 -60 -30 Z" fill="#e8501a" ${O(3.4)}/>
        <path d="M-40 -60 l8 -18 l8 14 l8 -20 l8 18 l8 -16 l8 18 l8 -14 l6 16" fill="#ffd34d" ${I(2)}/>
        <path d="M-58 -46 Q-88 -54 -104 -40 Q-100 -24 -76 -26 Q-64 -26 -56 -32 Z" fill="#e8501a" ${O(3.4)}/>
        <path d="M-102 -36 l14 2" stroke="${INK}" stroke-width="3"/>${eye(-82, -44, 5, '#ffe08a')}
        <path d="M-30 -40 q10 6 20 0 M10 -44 q10 6 20 0" stroke="#ffb030" stroke-width="3" fill="none"/>`);
      return idle(o, 0.9, `${shadow(40)}
        <path d="M-44 -4 Q-50 -40 -20 -58 Q4 -70 24 -54 Q48 -36 42 -4 Q0 4 -44 -4 Z" fill="#c83a1a" ${O(3.4)}/>
        <path d="M-30 -30 l12 -8 l8 10 l14 -6 M4 -50 l6 14 l12 2 M-36 -12 l14 -2 l8 -8" stroke="#ffd34d" stroke-width="4" fill="none" stroke-linecap="round" class="qb-eye"/>
        <path d="M30 -10 q6 10 2 14 M-40 -6 q-4 8 0 10" stroke="#ff8a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
        ${eyes2(-22, -40, 14, 5, '#ffe08a')}<circle cx="-24" cy="-40" r="2" fill="${INK}"/><circle cx="-10" cy="-40" r="2" fill="${INK}"/>`);
    }
    // бесёнок-подмастерье: красный, рожки, фартук, молот; вожак — раскалённая наковальня на ножках
    function dg_imp(o) {
      if (o.boss) return idle(o, 1.8, `${shadow(56)}
        ${limb('M-30 -30 L-36 0 M30 -30 L36 0', 12, '#3a3448')}
        <path d="M-40 -34 L-30 -64 H30 L40 -34 Z" fill="#4a4458" ${O(3.4)}/>
        <path d="M-60 -64 H50 Q74 -70 80 -84 H-70 Q-70 -70 -60 -64 Z" fill="#5a5468" ${O(3.4)}/>
        <path d="M-70 -84 H80 L74 -96 H-74 Z" fill="#ff8a2a" ${O(3)}/><path d="M-60 -92 h120" stroke="#ffe08a" stroke-width="3" class="qb-eye"/>
        ${eyes2(-24, -50, 34, 6, '#ff6a1a')}
        <path d="M-20 -40 q20 8 30 0" stroke="${INK}" stroke-width="3" fill="none"/>
        ${arm(-50, -70, `${limb('M-50 -70 Q-80 -60 -86 -40', 10, '#3a3448')}<rect x="-104" y="-52" width="34" height="20" rx="3" fill="#8a8a92" ${O(2.6)}/>`)}`);
      return idle(o, 1.1, `${shadow(36)}
        ${limb('M-10 0 v-22 M10 0 v-22', 9, '#c8402a')}
        <path d="M-24 -18 Q-28 -70 0 -74 Q28 -70 24 -18 Q0 -12 -24 -18 Z" fill="#c8402a" ${O(3.4)}/>
        <path d="M-18 -56 H18 V-20 Q0 -14 -18 -20 Z" fill="#6a4a3a" ${I(1.5)}/>
        <path d="M24 -30 q20 0 24 -18 l6 8" stroke="#c8402a" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${arm(-20, -60, `${limb('M-20 -60 L-46 -74', 8, '#c8402a')}<path d="M-46 -74 L-52 -104" stroke="#8a6a4a" stroke-width="5"/><rect x="-66" y="-114" width="28" height="14" rx="2" fill="#8a8a92" ${O(2.4)}/>`)}
        <circle cx="-2" cy="-92" r="22" fill="#d8503a" ${O(3.4)}/>
        <path d="M-18 -108 l-6 -16 l14 8 M12 -110 l6 -16 l-14 8" fill="#f0e8d0" ${I(1.5)}/>
        ${eyes2(-12, -94, 12, 4, '#ffe08a')}
        <path d="M-12 -82 q6 4 12 0" stroke="${INK}" stroke-width="2.5" fill="none"/>`);
    }

    /* ───────── Земли за Краем ───────── */
    // пустотник: тень-призрак со звёздами внутри; вожак — парящий обелиск с глазом и рунами
    function dg_voidling(o) {
      if (o.boss) return idle(o, 2.2, `<ellipse cx="0" cy="2" rx="40" ry="7" fill="#b06aff" opacity=".35"/>
        <path d="M-26 -30 L-18 -190 L0 -206 L18 -190 L26 -30 Z" fill="#3a2e5a" ${O(3.4)}/>
        <path d="M-10 -170 l8 10 l-8 10 M8 -140 h-12 l6 12 M-8 -100 l10 6 l-10 6 M6 -70 l-10 0 l5 -10" stroke="#b06aff" stroke-width="3" fill="none" class="qb-eye"/>
        <ellipse cx="0" cy="-120" rx="12" ry="8" fill="#f0e8ff" ${I(2)}/>${eye(-2, -120, 5, '#b06aff')}
        <path d="M-40 -60 l6 -6 M36 -90 l6 -6 M-44 -140 l6 -6" stroke="#b06aff" stroke-width="4" stroke-linecap="round"/>
        <path d="M-50 -20 q10 -10 20 0 M30 -14 q10 -10 20 0" stroke="#b06aff" stroke-width="3" fill="none" opacity=".7"/>`);
      return idle(o, 1.6, `<ellipse cx="0" cy="2" rx="30" ry="6" fill="#b06aff" opacity=".3"/>
        <path d="M-30 -10 Q-26 -4 -16 -14 Q-6 -2 4 -14 Q14 -4 24 -12 Q34 -40 28 -84 Q14 -118 -10 -116 Q-38 -108 -36 -70 Q-36 -36 -30 -10 Z" fill="#2a2244" ${O(3.4)}/>
        <circle cx="-14" cy="-40" r="2" fill="#f0e8ff"/><circle cx="10" cy="-60" r="2.5" fill="#f0e8ff"/><circle cx="-6" cy="-70" r="1.6" fill="#f0e8ff"/><circle cx="14" cy="-30" r="1.6" fill="#f0e8ff"/>
        ${arm(-26, -66, `<path d="M-26 -66 Q-50 -60 -64 -40 l-6 -10 m6 10 l10 -4" stroke="${LINE}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-26 -66 Q-50 -60 -64 -40 l-6 -10 m6 10 l10 -4" stroke="#2a2244" stroke-width="4" fill="none" stroke-linecap="round"/>`)}
        <path d="M-24 -92 l10 -4 l2 8 z M0 -96 l10 2 l-4 8 z" fill="#f0e8ff" class="qb-eye"/>`);
    }
    // заводная кукушка: птица на пружине-шее; вожак — часовщик-напольные часы с маятником и лицом
    function dg_clockwork(o) {
      if (o.boss) return idle(o, 2, `${shadow(40)}
        <rect x="-32" y="-190" width="64" height="186" rx="8" fill="#7a4a2a" ${O(3.4)}/>
        <path d="M-32 -150 H32 M-32 -60 H32" stroke="#5a3418" stroke-width="4"/>
        <circle cx="0" cy="-172" r="24" fill="#f0e4c8" ${I(2)}/><path d="M0 -172 v-14 M0 -172 l10 6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <rect x="-20" y="-140" width="40" height="72" rx="4" fill="#3a2418" ${I(2)}/>
        ${arm(0, -136, `<path d="M0 -136 V-86" stroke="#d8b860" stroke-width="3"/><circle cx="0" cy="-82" r="10" fill="#d8b860" ${I(2)}/>`)}
        ${eyes2(-14, -176, 26, 4, '#ff6a3a')}
        <path d="M-40 -194 l10 -16 h60 l10 16" fill="#7a4a2a" ${O(3)}/>
        ${limb('M-14 -4 v4 M14 -4 v4', 8, '#5a3418')}`);
      return idle(o, 1, `${shadow(30)}
        ${limb('M-6 0 v-16 M8 0 v-16', 5, '#c89a4a')}
        <path d="M-6 -20 q-10 -6 0 -12 q10 -6 0 -12 q-10 -6 0 -12 q10 -6 0 -12" stroke="${LINE}" stroke-width="9" fill="none"/><path d="M-6 -20 q-10 -6 0 -12 q10 -6 0 -12 q-10 -6 0 -12 q10 -6 0 -12" stroke="#a8a8b0" stroke-width="4" fill="none"/>
        <ellipse cx="0" cy="-84" rx="26" ry="18" fill="#8a5a3a" ${O(3.4)}/>
        <path d="M18 -90 q20 -6 26 6 q-14 0 -24 6 z" fill="#6a3a22" ${O(2.4)}/>
        <path d="M-24 -86 l-22 -2 l22 8 z" fill="#ffb030" ${I(2)}/>
        ${eye(-14, -92, 4, '#ffe08a')}
        <path d="M-6 -78 q10 6 20 0" stroke="#e8c890" stroke-width="3" fill="none"/>
        <path d="M2 -100 v-10 m-4 0 h8" stroke="#c89a4a" stroke-width="3" stroke-linecap="round"/>`);
    }

    /* ───────── Долины Ручьёв ───────── */
    // брызгун: водяной дух-капля; вожак — русалка грота
    function dg_splasher(o) {
      if (o.boss) return idle(o, 1.8, `<ellipse cx="0" cy="2" rx="50" ry="8" fill="#2a6a8a" opacity=".5"/>
        <path d="M40 -6 Q70 -6 76 -30 Q60 -14 40 -20 Z M44 -20 q30 -20 20 -44 q-6 26 -24 30 z" fill="#3aa8a0" ${O(3)}/>
        <path d="M-20 -4 Q-30 -60 -14 -100 Q8 -110 20 -90 Q30 -50 40 -12 Q10 4 -20 -4 Z" fill="#3aa8a0" ${O(3.4)}/>
        <path d="M-14 -40 q10 -6 20 0 M-10 -24 q10 -6 20 0" stroke="#2a7a78" stroke-width="3" fill="none"/>
        <path d="M-20 -104 Q-30 -140 0 -146 Q26 -140 20 -104 Z" fill="#f0d8b8" ${O(3.4)}/>
        <path d="M-26 -120 Q-40 -150 -6 -160 Q30 -158 30 -120 Q34 -80 20 -60 M-28 -110 Q-40 -80 -30 -60" stroke="#e8a83a" stroke-width="9" fill="none" stroke-linecap="round"/>
        ${eyes2(-14, -126, 12, 3.5, '#2a7ad0')}<path d="M-12 -112 q6 4 10 0" stroke="${INK}" stroke-width="2" fill="none"/>
        ${arm(-14, -94, `${limb('M-14 -94 Q-40 -90 -50 -110', 7, '#f0d8b8')}<path d="M-50 -110 q-6 -14 6 -18" stroke="#ffffff" stroke-width="4" fill="none" class="qb-eye"/>`)}
        <path d="M-6 -150 l4 -10 l4 10 l4 -10 l4 10" fill="#f0f0ff" ${I(1.5)}/>`);
      return idle(o, 1, `<ellipse cx="0" cy="2" rx="34" ry="6" fill="#2a6a8a" opacity=".5"/>
        <path d="M-30 -2 Q-38 -40 -10 -74 Q0 -86 10 -74 Q38 -40 30 -2 Q0 6 -30 -2 Z" fill="#6ac8e8" opacity=".95" ${O(3.4)}/>
        <path d="M-6 -84 q-10 -14 -2 -24 M6 -84 q4 -16 14 -20 M-14 -78 q-16 -6 -20 -18" stroke="#a8e8f8" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${eyes2(-14, -40, 14, 5, '#ffffff')}<circle cx="-15" cy="-40" r="2.4" fill="${INK}"/><circle cx="-1" cy="-40" r="2.4" fill="${INK}"/>
        <path d="M-12 -26 q6 6 12 0" stroke="${INK}" stroke-width="2.5" fill="none"/>
        <circle cx="16" cy="-24" r="4" fill="#ffffff" opacity=".6"/>`);
    }
    // мучная крыса: в муке, на задних лапах, с ножиком; вожак — крысиный король в короне, хвосты узлом
    function dg_rat(o) {
      const big = !!o.boss, c = big ? '#6a6a72' : '#8a8a92', c2 = big ? '#4a4a52' : '#6a6a72';
      return idle(o, big ? 1.4 : 1.1, `${shadow(big ? 50 : 34)}
        <path d="M16 -8 Q50 -6 60 -30 Q66 -50 52 -60" stroke="#d89a9a" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${big ? `<path d="M20 -6 Q60 0 74 -16 M20 -4 Q56 10 80 0" stroke="#d89a9a" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="64" cy="-10" r="8" fill="#d89a9a" ${I(1.5)}/>` : ''}
        ${limb('M-8 0 v-14 M10 0 v-14', 8, c2)}
        <path d="M-22 -10 Q-30 -60 -6 -${big ? 84 : 70} Q20 -${big ? 80 : 66} 22 -10 Q0 -2 -22 -10 Z" fill="${c}" ${O(3.4)}/>
        <path d="M-16 -40 q8 -6 16 2 M-4 -24 q10 -4 16 4" stroke="#f8f4ec" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>
        ${arm(-14, -(big ? 64 : 52), `${limb(`M-14 -${big ? 64 : 52} L-38 -${big ? 54 : 44}`, 6, c)}<path d="M-38 -${big ? 54 : 44} l-16 -16" stroke="#c8ccd8" stroke-width="5" stroke-linecap="round"/>`)}
        <path d="M-8 -${big ? 84 : 70} Q-28 -${big ? 92 : 78} -40 -${big ? 80 : 66} Q-28 -${big ? 70 : 56} -6 -${big ? 70 : 56} Z" fill="${c}" ${O(3.4)}/>
        <circle cx="-40" cy="-${big ? 80 : 66}" r="4" fill="#d89a9a"/>
        <circle cx="-4" cy="-${big ? 92 : 78}" r="9" fill="${c}" ${O(2.6)}/><circle cx="-4" cy="-${big ? 92 : 78}" r="4" fill="#d89a9a"/>
        ${eye(-22, -(big ? 82 : 68), 3.5, big ? '#ff3a3a' : INK)}
        <path d="M-30 -${big ? 76 : 62} l-12 2 M-30 -${big ? 74 : 60} l-12 6" stroke="#f8f4ec" stroke-width="1.5"/>
        <path d="M2 -${big ? 74 : 60} q10 -4 14 4" stroke="#f8f4ec" stroke-width="5" fill="none" opacity=".8"/>
        ${big ? crown(-10, -98, 13) : ''}`);
    }

    /* ───────── Срединные Земли ───────── */
    // контрабандист: капюшон, повязка, кинжал, бутылка; вожак — атаман схрона в папахе с мешком добра
    function dg_smuggler(o) {
      const big = !!o.boss, cloak = big ? '#5a2a2a' : '#4a4a3a';
      return idle(o, big ? 1.6 : 1.3, `${shadow(44)}
        ${limb('M-12 0 v-40 M12 0 v-40', 12, '#3a3030')}
        ${big ? `<path d="M20 -100 Q60 -110 56 -60 Q50 -36 22 -44 Z" fill="#a8844a" ${O(3)}/><path d="M24 -96 l16 -12" stroke="#6a4a2a" stroke-width="4"/>` : ''}
        <path d="M-32 -34 Q-36 -110 0 -116 Q34 -110 30 -34 Q0 -24 -32 -34 Z" fill="${cloak}" ${O(3.4)}/>
        <path d="M-30 -66 H28" stroke="#8a6a3a" stroke-width="6"/><rect x="-6" y="-71" width="10" height="10" fill="#d8b860" ${I(1.5)}/>
        ${arm(-26, -94, `${limb('M-26 -94 L-62 -78', 10, cloak)}${big ? `<path d="M-62 -78 L-92 -96" stroke="#c8ccd8" stroke-width="6" stroke-linecap="round"/><path d="M-62 -78 l-6 -8 m6 8 l8 -4" stroke="#8a6a3a" stroke-width="4"/>` : `<path d="M-66 -84 v-26 l6 -8 l6 8 v26 z" fill="#5a8a5a" opacity=".9" ${O(2.4)}/><path d="M-62 -78 L-82 -64" stroke="#c8ccd8" stroke-width="5" stroke-linecap="round"/>`}`)}
        <circle cx="-6" cy="-132" r="20" fill="#e0b090" ${O(3.4)}/>
        <path d="M-26 -134 H14 V-126 H-26 Z" fill="#2a2a2a"/>${eye(-16, -138, 3, INK)}
        ${big ? `<path d="M-30 -146 Q-30 -170 -6 -172 Q18 -170 18 -146 Z" fill="#3a2a22" ${O(3)}/><path d="M-26 -152 h40" stroke="#5a4a3a" stroke-width="4"/>` : `<path d="M-28 -136 Q-30 -166 -6 -166 Q18 -164 16 -136 Q-6 -148 -28 -136 Z" fill="${cloak}" ${O(3)}/>`}
        <path d="M-22 -118 q8 6 16 0" stroke="#5a3a2a" stroke-width="4" fill="none"/>`);
    }
    // скелет-оруженосец: большой щит и копьё; вожак — рыцарь без головы, шлем под мышкой
    function dg_squire(o) {
      if (o.boss) return idle(o, 1.8, `${shadow(50)}
        ${limb('M-14 0 v-46 M16 0 v-46', 14, '#6a6a78')}
        <path d="M-36 -40 Q-40 -132 0 -138 Q38 -132 34 -40 Q0 -30 -36 -40 Z" fill="#8a8a98" ${O(3.4)}/>
        <path d="M-30 -110 H30 M-32 -80 H32" stroke="#5a5a68" stroke-width="4"/><path d="M-4 -136 v96" stroke="#5a5a68" stroke-width="3"/>
        <path d="M-40 -40 Q0 -20 36 -40 L32 -20 Q0 -6 -36 -20 Z" fill="#6a2a3a" ${O(2.6)}/>
        <path d="M-14 -142 h28 v-6 h-28 z" fill="#3a3a44" ${O(2.4)}/><path d="M-8 -150 q8 -16 18 -2" stroke="#8affd8" stroke-width="4" fill="none" opacity=".7" class="qb-eye"/>
        ${arm(-30, -120, `${limb('M-30 -120 Q-60 -112 -70 -90', 11, '#8a8a98')}<path d="M-70 -90 L-80 -200" stroke="#c8ccd8" stroke-width="6" stroke-linecap="round"/><path d="M-86 -96 h20" stroke="#6a5a3a" stroke-width="6"/>`)}
        <path d="M30 -110 Q52 -100 46 -76" stroke="${LINE}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M30 -110 Q52 -100 46 -76" stroke="#8a8a98" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M28 -86 Q28 -112 48 -112 Q68 -112 68 -86 Q68 -68 48 -66 Q28 -68 28 -86 Z" fill="#8a8a98" ${O(3)}/><path d="M34 -92 h28 M48 -112 v-10" stroke="${INK}" stroke-width="3"/>${eye(40, -84, 3, '#8affd8')}${eye(52, -84, 3, '#8affd8')}`);
      return idle(o, 1.4, `${shadow(42)}
        ${limb('M-10 0 v-40 M12 0 v-40', 8, '#e8e0d0')}
        <path d="M-20 -40 Q-18 -100 2 -102 Q24 -100 20 -40 Z" fill="#e8e0d0" ${O(3)}/>
        <path d="M-12 -86 h26 M-14 -74 h28 M-12 -62 h24" stroke="${INK}" stroke-width="3"/>
        <circle cx="2" cy="-118" r="18" fill="#e8e0d0" ${O(3.4)}/>${eye(-6, -120, 4.5, INK)}${eye(8, -120, 4.5, INK)}
        <path d="M-6 -106 h14" stroke="${INK}" stroke-width="2.5" stroke-dasharray="3 2"/>
        <path d="M-18 -128 Q2 -148 22 -128 Z" fill="#6a6a78" ${O(2.6)}/>
        <path d="M-60 -20 L-50 -170" stroke="#8a6a4a" stroke-width="5" stroke-linecap="round"/><path d="M-50 -170 l-6 -18 l12 0 z" fill="#c8ccd8" ${O(2)}/>
        ${arm(-14, -86, `<path d="M-60 -28 Q-62 -110 -24 -110 Q-6 -100 -10 -70 Q-14 -34 -60 -28 Z" fill="#6a2a3a" ${O(3.4)}/><circle cx="-32" cy="-74" r="10" fill="#c8a040" ${I(2)}/>`)}`);
    }

    /* ───────── Сердце Мира ───────── */
    // черепной страж: каменная статуя с черепом вместо лица и плитой-щитом; вожак — мраморная химера (лев с крыльями)
    function dg_skullguard(o) {
      if (o.boss) return idle(o, 1.8, `${shadow(66)}
        ${limb('M-44 -30 L-48 0 M-20 -30 L-16 0 M30 -30 L34 0 M54 -30 L60 0', 13, '#c8c0b8')}
        <path d="M40 -90 Q90 -150 110 -100 Q80 -110 60 -70 Z M30 -90 Q60 -170 100 -150 Q70 -130 50 -80 Z" fill="#e8e4e0" ${O(3)}/>
        <path d="M-50 -30 Q-56 -80 -10 -84 Q50 -86 66 -56 Q70 -30 50 -24 L-30 -22 Q-50 -22 -50 -30 Z" fill="#e0dad2" ${O(3.4)}/>
        <path d="M-30 -50 q14 -8 28 0 q14 8 28 0" stroke="#b8b0a8" stroke-width="3" fill="none"/>
        <path d="M66 -50 q24 0 30 -24" stroke="#e0dad2" stroke-width="7" fill="none" stroke-linecap="round"/>
        <circle cx="-62" cy="-82" r="34" fill="#c8a040" ${O(3.4)}/>
        <path d="M-90 -80 Q-90 -110 -62 -110 Q-40 -110 -40 -86 Q-44 -60 -66 -58 Q-88 -60 -90 -80 Z" fill="#e8e4e0" ${O(3)}/>
        ${eyes2(-78, -88, 16, 5, '#c8a040')}<path d="M-82 -70 q10 6 20 0" stroke="${INK}" stroke-width="3" fill="none"/>
        <path d="M-84 -72 l4 6 l4 -6 M-68 -72 l4 6 l4 -6" fill="#f8f8f8" ${I(1)}/>`);
      return idle(o, 1.6, `${shadow(44)}
        ${limb('M-14 0 v-34 M14 0 v-34', 14, '#9a948a')}
        <path d="M-34 -30 L-30 -110 H30 L34 -30 Z" fill="#a8a296" ${O(3.4)}/>
        <path d="M-26 -90 h52 M-28 -60 h56" stroke="#7a746a" stroke-width="3"/><path d="M-10 -100 l6 20 l-8 14" stroke="#6a645a" stroke-width="2.5" fill="none"/>
        ${arm(-26, -96, `<path d="M-74 -30 L-70 -116 L-36 -120 L-34 -34 Z" fill="#b8b2a6" ${O(3.4)}/><path d="M-62 -100 l14 0 M-64 -80 l16 0 M-62 -60 l14 0" stroke="#7a746a" stroke-width="3"/>`)}
        <path d="M-22 -112 Q-24 -150 2 -152 Q26 -150 24 -112 Q2 -102 -22 -112 Z" fill="#e8e0d0" ${O(3.4)}/>
        ${eye(-10, -132, 6, INK)}${eye(10, -132, 6, INK)}<circle class="qb-eye" cx="-10" cy="-132" r="2.4" fill="#ff6a3a"/><circle class="qb-eye" cx="10" cy="-132" r="2.4" fill="#ff6a3a"/>
        <path d="M-8 -114 v-6 M0 -114 v-6 M8 -114 v-6" stroke="${INK}" stroke-width="2.5"/>`);
    }
    // летающая книга с зубами-страницами; вожак — хранитель свитков (огромный том с глазом и закладками)
    function dg_book(o) {
      const big = !!o.boss, Wd = big ? 56 : 38, y0 = big ? -110 : -80, c = big ? '#5a2a6a' : ['#8a3a2a', '#2a5a8a', '#3a6a3a'][(o.seed || 0) % 3];
      return idle(o, big ? 1.6 : 1, `<ellipse cx="0" cy="2" rx="${Wd * 0.8}" ry="6" fill="${INK}" opacity=".2"/>
        <path d="M-${Wd} ${y0} L0 ${y0 + 14} L${Wd} ${y0} L${Wd} ${y0 - Wd * 0.9} L0 ${y0 - Wd * 0.75} L-${Wd} ${y0 - Wd * 0.9} Z" fill="${c}" ${O(3.4)}/>
        <path d="M-${Wd - 6} ${y0 - 4} L0 ${y0 + 6} L${Wd - 6} ${y0 - 4} L${Wd - 6} ${y0 - Wd * 0.82} L0 ${y0 - Wd * 0.68} L-${Wd - 6} ${y0 - Wd * 0.82} Z" fill="#f0e4c8" ${I(1.5)}/>
        <path d="M-${Wd - 10} ${y0 - Wd * 0.6} L-6 ${y0 - Wd * 0.48} M-${Wd - 10} ${y0 - Wd * 0.4} L-6 ${y0 - Wd * 0.28} M${Wd - 10} ${y0 - Wd * 0.6} L6 ${y0 - Wd * 0.48}" stroke="#b8a888" stroke-width="2.5"/>
        <path d="M-${Wd - 8} ${y0 - 8} l8 -10 l8 10 l8 -10 l8 10 l8 -10 l8 10" fill="#ffffff" ${I(1.5)}/>
        ${eyes2(-Wd * 0.5, y0 - Wd * 0.5, Wd * 0.4, big ? 7 : 5, big ? '#ffd34d' : INK)}
        ${big ? `<path d="M10 ${y0 + 8} v40 l6 -8 l6 8 v-40 M-20 ${y0 + 6} v30 l5 -6 l5 6 v-30" fill="#c83a3a" ${O(2)}/><path d="M-80 ${y0 - 40} q10 -10 20 0 M70 ${y0 - 60} q10 -10 20 0" stroke="#f0e4c8" stroke-width="5" fill="none"/>` : `<path d="M0 ${y0 + 10} v24 l4 -5 l4 5 v-24" fill="#d8b860" ${I(1.5)}/>`}`);
    }

    /* ───────── Берега Внутреннего моря ───────── */
    // краб-отшельник в раковине; вожак — краб в огромной спиральной раковине
    function dg_crab(o) {
      const big = !!o.boss, R = big ? 50 : 34;
      return idle(o, big ? 1.5 : 1.1, `${shadow(R + 16)}
        ${limb(`M-10 -10 l-20 10 M-2 -10 l-10 10 M10 -10 l14 10`, 5, '#c84a3a')}
        <path d="M-6 -${R * 0.4} Q-10 -${R * 2.2} ${R * 0.6} -${R * 2.1} Q${R * 1.4} -${R * 1.7} ${R * 1.2} -${R * 0.4} Z" fill="${big ? '#e8d0b0' : '#d8c0a0'}" ${O(3.4)}/>
        <path d="M${R * 0.3} -${R * 0.5} Q${R * 0.2} -${R * 1.6} ${R * 0.8} -${R * 1.5} Q${R * 1.1} -${R * 1.2} ${R * 0.8} -${R * 0.9} Q${R * 0.5} -${R * 0.8} ${R * 0.6} -${R * 1.15}" stroke="#a8886a" stroke-width="4" fill="none"/>
        ${big ? `<path d="M${R * 0.1} -${R * 1.9} l6 -14 l6 12 M${R * 0.7} -${R * 2.1} l6 -14 l4 14" stroke="#e8d0b0" stroke-width="5" stroke-linecap="round"/>` : ''}
        <path d="M-${R * 0.9} -${R * 0.2} Q-${R} -${R * 0.9} -${R * 0.2} -${R * 0.95} Q${R * 0.2} -${R * 0.8} 0 -${R * 0.2} Z" fill="#d85a3a" ${O(3.4)}/>
        <path d="M-${R * 0.6} -${R * 0.9} v-${R * 0.4} M-${R * 0.3} -${R * 0.92} v-${R * 0.44}" stroke="#d85a3a" stroke-width="4"/>
        ${eye(-R * 0.6, -R * 1.34, big ? 5 : 4, INK)}${eye(-R * 0.3, -R * 1.38, big ? 5 : 4, INK)}
        ${arm(-R * 0.7, -R * 0.5, `${limb(`M-${R * 0.7} -${R * 0.5} L-${R * 1.4} -${R * 0.6}`, 7, '#d85a3a')}<path d="M-${R * 1.4} -${R * 0.6} q-${R * 0.5} -${R * 0.5} -${R * 0.5} ${R * 0.05} l${R * 0.25} 0 q0 -${R * 0.2} ${R * 0.2} -${R * 0.1} q-${R * 0.2} ${R * 0.35} ${R * 0.3} ${R * 0.05} z" fill="#d85a3a" ${O(3)}/>`)}`);
    }
    // утонувший матрос: тельняшка, бандана, сабля; вожак — боцман с якорем
    function dg_sailor(o) {
      const big = !!o.boss, skin = '#9ab8a8';
      return idle(o, big ? 1.7 : 1.3, `${shadow(44)}
        ${limb('M-12 0 v-40 M12 0 v-40', 12, '#3a3a5a')}
        <path d="M-30 -36 Q-34 -104 0 -110 Q34 -104 30 -36 Q0 -26 -30 -36 Z" fill="#f0f0f8" ${O(3.4)}/>
        <path d="M-30 -92 H30 M-32 -76 H32 M-32 -60 H32 M-30 -44 H30" stroke="#3a5a9a" stroke-width="6"/>
        <path d="M-20 -40 q-4 10 4 18 M14 -50 q6 10 0 20" stroke="#6a8a3a" stroke-width="4" fill="none"/>
        ${arm(-24, -92, `${limb('M-24 -92 L-58 -78', 10, skin)}${big ? `<path d="M-60 -78 L-70 -148" stroke="#5a5a62" stroke-width="6"/><path d="M-90 -136 Q-70 -110 -50 -136 M-70 -150 v-10 m-6 6 h12" stroke="#5a5a62" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-96 -132 l6 -6 l4 8 M-44 -132 l-6 -6 l-4 8" stroke="#5a5a62" stroke-width="5" fill="none"/>` : `<path d="M-58 -78 Q-86 -96 -88 -124" stroke="#c8ccd8" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-62 -82 l8 8" stroke="#8a6a3a" stroke-width="5"/>`}`)}
        <circle cx="-6" cy="-128" r="20" fill="${skin}" ${O(3.4)}/>
        ${big ? `<path d="M-28 -136 Q-28 -160 -6 -162 Q16 -160 16 -136 Z" fill="#2a2a3a" ${O(3)}/><path d="M-30 -138 h48" stroke="#2a2a3a" stroke-width="5"/><path d="M8 -118 h12 v6" stroke="#8a6a3a" stroke-width="4" fill="none"/>` : `<path d="M-26 -134 Q-6 -158 14 -134 L20 -128 Q-6 -136 -26 -128 Z" fill="#c83a3a" ${O(2.6)}/><path d="M16 -130 l12 6 l-4 -10" fill="#c83a3a" ${I(1.5)}/>`}
        ${eyes2(-16, -128, 12, 3.5, '#c8ff6a')}
        <path d="M-16 -114 q6 4 12 0" stroke="${INK}" stroke-width="2.5" fill="none"/>
        <path d="M6 -112 q2 8 -2 14" stroke="#6a8a3a" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    }

    /* ───────── Восточная Марка ───────── */
    // узник в цепях с ядром; вожак — тюремщик с ключами и дубинкой
    function dg_prisoner(o) {
      if (o.boss) return idle(o, 1.6, `${shadow(50)}
        ${limb('M-14 0 v-42 M14 0 v-42', 14, '#3a3030')}
        <path d="M-38 -38 Q-42 -118 0 -124 Q40 -118 36 -38 Q0 -28 -38 -38 Z" fill="#5a3a2a" ${O(3.4)}/>
        <path d="M-36 -66 H34" stroke="#2a1a12" stroke-width="7"/>
        <circle cx="22" cy="-58" r="10" fill="none" stroke="#d8b860" stroke-width="4"/><path d="M18 -48 v12 M24 -48 v16 M28 -48 v10" stroke="#d8b860" stroke-width="3"/>
        ${arm(-30, -100, `${limb('M-30 -100 L-64 -86', 11, '#5a3a2a')}<path d="M-64 -86 L-84 -140" stroke="#6a4a2a" stroke-width="10" stroke-linecap="round"/><circle cx="-86" cy="-146" r="8" fill="#6a4a2a" ${O(2.4)}/>`)}
        <circle cx="-4" cy="-140" r="22" fill="#d8a888" ${O(3.4)}/>
        <path d="M-28 -146 Q-28 -172 -4 -174 Q20 -172 20 -146 Z" fill="#6a6a78" ${O(3)}/><path d="M-30 -148 h52" stroke="#4a4a58" stroke-width="5"/>
        ${eyes2(-14, -140, 14, 3.5, INK)}<path d="M-14 -128 h14" stroke="${INK}" stroke-width="3"/>
        <path d="M-12 -122 q8 8 14 0" stroke="#6a3a2a" stroke-width="5" fill="none"/>`);
      return idle(o, 1.3, `${shadow(44)}
        ${limb('M-12 0 v-38 M12 0 v-38', 11, '#8a7a6a')}
        <path d="M-16 -4 h12 M4 -4 h12" stroke="#5a5a62" stroke-width="5"/>
        <path d="M-30 -34 L-26 -104 L26 -104 L30 -34 L18 -40 L10 -30 L0 -40 L-10 -30 L-20 -40 Z" fill="#9a8a6a" ${O(3.4)}/>
        <path d="M-20 -94 l10 30 M14 -96 l-4 24" stroke="#7a6a4a" stroke-width="3"/>
        ${arm(-22, -92, `${limb('M-22 -92 L-54 -76', 9, '#c8a888')}<path d="M-54 -76 Q-76 -60 -80 -36" stroke="#6a6a78" stroke-width="4" stroke-dasharray="6 3" fill="none"/><circle cx="-82" cy="-28" r="14" fill="#3a3a44" ${O(3)}/>`)}
        <circle cx="-4" cy="-122" r="20" fill="#c8a888" ${O(3.4)}/>
        <path d="M-22 -132 q4 -14 18 -12 q14 0 16 12" stroke="#5a4a3a" stroke-width="6" fill="none"/>
        ${eyes2(-14, -122, 13, 3.5, INK)}
        <path d="M-14 -108 q6 -4 12 0" stroke="${INK}" stroke-width="2.5" fill="none"/>
        <rect x="-26" y="-98" width="10" height="8" rx="2" fill="#6a6a78" ${I(1.5)}/>`);
    }
    // летающий клинок (меч рукоятью вверх, глаз в гарде); вожак — пушка-голем на ножках
    function dg_armory(o) {
      if (o.boss) return idle(o, 1.8, `${shadow(60)}
        ${limb('M-30 -24 L-38 0 M30 -24 L40 0', 14, '#4a4a58')}
        <path d="M-50 -30 Q-56 -90 0 -96 Q56 -90 50 -30 Q0 -20 -50 -30 Z" fill="#6a6a78" ${O(3.4)}/>
        <path d="M-40 -60 H40 M-44 -44 H44" stroke="#4a4a58" stroke-width="4"/>${[-30, -10, 10, 30].map((x) => `<circle cx="${x}" cy="-76" r="3" fill="#4a4a58"/>`).join('')}
        ${arm(0, -90, `<path d="M10 -90 L-80 -130 L-90 -110 L0 -74 Z" fill="#3a3a44" ${O(3.4)}/><ellipse cx="-86" cy="-120" rx="8" ry="12" fill="${INK}" transform="rotate(-24 -86 -120)"/>`)}
        ${eyes2(-20, -60, 30, 6, '#ff6a1a')}
        <path d="M-60 -24 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 M36 -24 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0" fill="#7a5a3a" ${O(2.6)}/>`);
      return idle(o, 1.5, `<ellipse cx="0" cy="2" rx="22" ry="5" fill="${INK}" opacity=".25"/>
        <path d="M-6 -24 L0 -10 L6 -24 L6 -120 L-6 -120 Z" fill="#d8dce8" ${O(3.4)}/>
        <path d="M0 -26 V-116" stroke="#a8acb8" stroke-width="2"/>
        <path d="M-30 -122 H30 L26 -132 H-26 Z" fill="#c8a040" ${O(3)}/>
        <rect x="-5" y="-162" width="10" height="30" rx="3" fill="#6a3a2a" ${O(2.6)}/><circle cx="0" cy="-166" r="7" fill="#c8a040" ${O(2.4)}/>
        ${eye(0, -127, 4, '#5ad0ff')}
        <path d="M-22 -60 l-10 4 M22 -80 l10 4 M-20 -100 l-8 -2" stroke="#d8dce8" stroke-width="3" stroke-linecap="round" opacity=".6"/>`);
    }


    // свои приёмы атак стай данжей (на месте; класс .qb-atk-имя ставит бой на ~1,2 с): только transform / opacity
    const CSS = [
      // червь ныряет в песок и выстреливает вверх
      '.qb .qb-foe.qb-atk-burrow{animation:dgBurrow 1.1s ease-in-out;transform-box:fill-box;transform-origin:50% 100%}',
      '@keyframes dgBurrow{0%{transform:none}30%{transform:translateY(40px) scaleY(.2)}55%{transform:translateY(40px) scaleY(.2)}75%{transform:translateY(-30px) scaleY(1.15)}100%{transform:none}}',
      // пустотник гаснет и вспыхивает ближе к строю
      '.qb .qb-foe.qb-atk-blink{animation:dgBlink 1.1s ease-in-out}',
      '@keyframes dgBlink{0%{opacity:1;transform:none}35%{opacity:0;transform:translateX(0)}45%{opacity:0;transform:translateX(-140px)}60%{opacity:1;transform:translateX(-140px)}100%{opacity:1;transform:none}}',
      // колокол / удар оземь — тряска
      '.qb .qb-foe.qb-atk-ring{animation:dgRing 1s ease-in-out;transform-box:fill-box;transform-origin:50% 100%}',
      '@keyframes dgRing{0%,100%{transform:none}15%{transform:rotate(-7deg)}30%{transform:rotate(6deg)}45%{transform:rotate(-5deg)}60%{transform:rotate(4deg)}75%{transform:rotate(-2deg)}}',
      // астролябия / шестерёнка — оборот
      '.qb .qb-foe.qb-atk-spin{animation:dgSpin .9s ease-in-out;transform-box:fill-box;transform-origin:50% 60%}',
      '@keyframes dgSpin{0%{transform:none}50%{transform:rotate(-180deg) scale(1.1)}100%{transform:rotate(-360deg)}}',
      // склянка / котёл — раздувается и выплёскивает
      '.qb .qb-foe.qb-atk-puff{animation:dgPuff 1s ease-out;transform-box:fill-box;transform-origin:50% 100%}',
      '@keyframes dgPuff{0%{transform:none}40%{transform:scale(1.25,.8)}60%{transform:scale(.85,1.25) translateY(-14px)}100%{transform:none}}',
    ].join('\n');
    // вожак рисуется крупнее рядового, а бой ещё увеличивает его ×1,25: bossK ужимает рисунок вожака до роста стаи (top), чтобы имя
    // и полоска здоровья не ложились на лицо (подобрано по рамкам рисунков, scripts/proto/dgfoes.html)
    const fit = (defs) => { for (const d of Object.values(defs)) if (d && d.draw && d.bossK && d.bossK < 1) { const raw = d.draw, k = d.bossK; d.draw = (o) => (o && o.boss ? `<g transform="scale(${k})">${raw(o)}</g>` : raw(o)); } return defs; };
    // 23.10 (влит PR #49): боссы данжа — ключи dgb_*; свои помощники (eye, sp…) — в своей области, чтобы не путались с монстрами данжей
    const DGB = (function () {
      const LINE = '#f5f2ff', INK = '#15122e';
      const O = (w = 3) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
      const sp = (o, a = 1.4) => (a + ((o.seed || 0) % 7) / 10).toFixed(2);
      const eye = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * 0.62).toFixed(1)}" fill="#ff2a2a" stroke="${INK}" stroke-width="2"/><ellipse cx="${x - r * 0.25}" cy="${y}" rx="${(r * 0.28).toFixed(1)}" ry="${(r * 0.5).toFixed(1)}" fill="#ffe08a"/>`;

      // ── Пожиратель Света: клубящаяся тьма с пастью и россыпью красных глаз, щупальца-руки; Тень — сгусток мрака с двумя глазами ──
      function light(o) {
        if (o.boss) return `<g class="qb-idle" style="animation-duration:${sp(o, 2.2)}s">
          <ellipse cx="0" cy="-4" rx="96" ry="14" fill="${INK}" opacity=".45"/>
          <path d="M-88 0 Q-120 -60 -96 -130 Q-80 -196 -20 -214 Q40 -230 82 -190 Q124 -150 110 -80 Q100 -30 88 0 Q60 -16 40 0 Q20 -18 0 0 Q-20 -16 -40 0 Q-62 -18 -88 0 Z" fill="#1b1430" ${O(4)}/>
          <path d="M-60 -40 Q-80 -110 -50 -160 M10 -30 Q-10 -120 30 -190 M60 -50 Q90 -110 70 -160" stroke="#2f2650" stroke-width="10" fill="none" stroke-linecap="round"/>
          <path d="M-76 -96 Q-40 -66 6 -86 Q-26 -40 -74 -60 Z" fill="#0a0612" ${O(3)}/>
          <path d="M-70 -90 l8 12 l8 -12 l8 12 l8 -12 l8 12 l8 -12 M-66 -64 l8 -10 l8 10 l8 -10 l8 10 l8 -10" fill="none" stroke="#f4eedc" stroke-width="4" stroke-linejoin="round"/>
          <g class="qb-eye">${eye(-58, -150, 13)}${eye(-22, -168, 10)}${eye(-80, -122, 8)}${eye(14, -150, 7)}${eye(-40, -128, 6)}${eye(36, -176, 6)}</g>
          <g class="qb-arm" style="transform-origin:-70px -110px"><path d="M-70 -110 Q-130 -120 -150 -70 Q-160 -40 -136 -30" stroke="${LINE}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M-70 -110 Q-130 -120 -150 -70 Q-160 -40 -136 -30" stroke="#1b1430" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M-140 -34 l-14 6 M-136 -28 l-8 12 M-130 -32 l2 14" stroke="#1b1430" stroke-width="6" stroke-linecap="round"/></g>
          <path d="M90 -120 Q140 -110 150 -60" stroke="${LINE}" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M90 -120 Q140 -110 150 -60" stroke="#1b1430" stroke-width="12" fill="none" stroke-linecap="round"/>
          <path d="M-30 -212 q10 -26 30 -30 q-4 18 6 30 M30 -214 q16 -18 34 -14 q-12 10 -10 26" fill="#1b1430" ${O(3)}/></g>`;
        return `<g class="qb-idle" style="animation-duration:${sp(o)}s">
          <ellipse cx="0" cy="-2" rx="38" ry="8" fill="${INK}" opacity=".4"/>
          <path d="M-34 0 Q-48 -46 -30 -84 Q-14 -112 12 -110 Q40 -104 44 -70 Q48 -30 34 0 Q22 -10 12 0 Q0 -12 -10 0 Q-22 -10 -34 0 Z" fill="#241b3e" ${O(3.4)}/>
          <path d="M-18 -30 Q-26 -60 -12 -86 M14 -24 Q24 -56 14 -90" stroke="#3a2f60" stroke-width="6" fill="none" stroke-linecap="round"/>
          <g class="qb-eye">${eye(-16, -76, 7)}${eye(6, -80, 6)}</g>
          <g class="qb-arm" style="transform-origin:-28px -54px"><path d="M-28 -54 Q-58 -50 -66 -24" stroke="${LINE}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M-28 -54 Q-58 -50 -66 -24" stroke="#241b3e" stroke-width="7" fill="none" stroke-linecap="round"/></g></g>`;
      }
      // ── Утроба подземелья: глыба-пасть из кладки с зубами-сталактитами и прожилками; щупальце — каменный отросток из пола ──
      function living(o) {
        const st = '#7a6a72', stL = '#9a8a8e', stD = '#4a3a42', vein = '#c83a4a';
        if (o.boss) return `<g class="qb-idle" style="animation-duration:${sp(o, 2.6)}s">
          <ellipse cx="0" cy="-4" rx="104" ry="14" fill="${INK}" opacity=".45"/>
          <path d="M-100 0 L-108 -90 Q-100 -170 -40 -196 Q20 -214 74 -186 Q118 -160 112 -80 L104 0 Z" fill="${st}" ${O(4)}/>
          ${[[-80, -150], [-30, -178], [30, -170], [80, -130], [-90, -60], [90, -50]].map(([x, y]) => `<rect x="${x - 22}" y="${y - 14}" width="44" height="28" rx="5" fill="${stL}" stroke="${INK}" stroke-width="2.5"/>`).join('')}
          <path d="M-70 -40 Q-90 -120 -20 -130 Q50 -132 60 -60 Q40 -20 -10 -24 Q-50 -26 -70 -40 Z" fill="#2a0e14" ${O(3.4)}/>
          <path d="M-60 -112 l10 22 l10 -24 l10 24 l10 -26 l10 26 l10 -24 l10 22 l8 -20 M-58 -42 l10 -16 l10 16 l10 -18 l10 18 l10 -16 l10 16" fill="none" stroke="#f4eedc" stroke-width="5" stroke-linejoin="round"/>
          <path d="M-100 -96 Q-70 -110 -60 -150 M70 -170 Q86 -130 108 -120 M-40 -196 Q-30 -170 -50 -150" stroke="${vein}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>
          <g class="qb-eye"><circle cx="-56" cy="-160" r="10" fill="#ffd34d" stroke="${INK}" stroke-width="2.5"/><circle cx="-58" cy="-160" r="4" fill="${INK}"/><circle cx="24" cy="-176" r="12" fill="#ffd34d" stroke="${INK}" stroke-width="2.5"/><circle cx="21" cy="-176" r="5" fill="${INK}"/></g>
          <g class="qb-arm" style="transform-origin:-96px -70px"><path d="M-96 -70 Q-150 -60 -160 -10" stroke="${LINE}" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M-96 -70 Q-150 -60 -160 -10" stroke="${stD}" stroke-width="22" fill="none" stroke-linecap="round"/></g></g>`;
        return `<g class="qb-idle" style="animation-duration:${sp(o, 1.8)}s">
          <ellipse cx="0" cy="-2" rx="34" ry="8" fill="${INK}" opacity=".4"/>
          <g class="qb-arm" style="transform-origin:0px 0px"><path d="M-6 0 Q-30 -50 -10 -90 Q6 -120 -20 -140" stroke="${LINE}" stroke-width="34" fill="none" stroke-linecap="round"/><path d="M-6 0 Q-30 -50 -10 -90 Q6 -120 -20 -140" stroke="${st}" stroke-width="26" fill="none" stroke-linecap="round"/>
          <path d="M-22 -40 h16 M-20 -80 h14 M-14 -112 h12" stroke="${stD}" stroke-width="4"/><path d="M-10 -60 q8 -20 0 -40" stroke="${vein}" stroke-width="4" fill="none"/></g>
          <path d="M-30 0 L-20 -16 L0 -8 L18 -18 L32 0 Z" fill="${stD}" ${O(3)}/></g>`;
      }
      // ── Голем сокровищницы: глыба из кладки с золотыми вставками, в груди — ядро-самоцвет за створками; малый страж — каменный болван ──
      function golem(o) {
        const st = '#8a7a6a', stL = '#a89884', stD = '#5a4a3e', gold = '#e8b84a';
        if (o.boss) return `<g class="qb-idle" style="animation-duration:${sp(o, 2.8)}s">
          <ellipse cx="0" cy="-4" rx="96" ry="14" fill="${INK}" opacity=".45"/>
          <path d="M-50 0 v-50 M40 0 v-50" stroke="${LINE}" stroke-width="40" stroke-linecap="round"/><path d="M-50 0 v-50 M40 0 v-50" stroke="${stD}" stroke-width="32" stroke-linecap="round"/>
          <path d="M-84 -50 L-92 -170 Q-60 -200 0 -204 Q60 -200 90 -170 L82 -50 Q0 -36 -84 -50 Z" fill="${st}" ${O(4)}/>
          ${[[-60, -150], [0, -184], [56, -150], [-56, -84], [56, -84]].map(([x, y]) => `<rect x="${x - 24}" y="${y - 16}" width="48" height="32" rx="5" fill="${stL}" stroke="${INK}" stroke-width="2.5"/>`).join('')}
          <path d="M-26 -140 h52 v54 h-52 Z" fill="#2a1a10" stroke="${INK}" stroke-width="3"/><path d="M0 -132 l18 18 l-18 22 l-18 -22 Z" fill="#7affd8" stroke="${INK}" stroke-width="3"/>
          <path d="M-30 -144 h60 M-30 -82 h60" stroke="${gold}" stroke-width="6"/>
          <path d="M-40 -232 Q0 -262 40 -232 Q44 -204 0 -200 Q-44 -204 -40 -232 Z" fill="${st}" ${O(3.4)}/>
          <g class="qb-eye"><rect x="-26" y="-232" width="18" height="8" rx="3" fill="#7affd8"/><rect x="8" y="-232" width="18" height="8" rx="3" fill="#7affd8"/></g>
          <g class="qb-arm" style="transform-origin:-86px -150px"><path d="M-86 -150 Q-140 -120 -140 -60" stroke="${LINE}" stroke-width="36" fill="none" stroke-linecap="round"/><path d="M-86 -150 Q-140 -120 -140 -60" stroke="${st}" stroke-width="28" fill="none" stroke-linecap="round"/><rect x="-166" y="-70" width="52" height="44" rx="10" fill="${stD}" ${O(3)}/></g>
          <path d="M86 -150 Q132 -120 130 -64" stroke="${LINE}" stroke-width="34" fill="none" stroke-linecap="round"/><path d="M86 -150 Q132 -120 130 -64" stroke="${st}" stroke-width="26" fill="none" stroke-linecap="round"/><rect x="108" y="-74" width="46" height="40" rx="9" fill="${stD}" ${O(3)}/></g>`;
        return `<g class="qb-idle" style="animation-duration:${sp(o, 1.9)}s">
          <ellipse cx="0" cy="-2" rx="36" ry="8" fill="${INK}" opacity=".4"/>
          <path d="M-16 0 v-24 M14 0 v-24" stroke="${LINE}" stroke-width="20" stroke-linecap="round"/><path d="M-16 0 v-24 M14 0 v-24" stroke="${stD}" stroke-width="13" stroke-linecap="round"/>
          <path d="M-34 -24 L-36 -86 Q0 -100 36 -86 L34 -24 Z" fill="${st}" ${O(3.4)}/><rect x="-24" y="-70" width="20" height="14" rx="3" fill="${stL}" stroke="${INK}" stroke-width="2"/><rect x="4" y="-50" width="20" height="14" rx="3" fill="${stL}" stroke="${INK}" stroke-width="2"/>
          <path d="M-22 -112 Q0 -126 22 -112 Q24 -92 0 -90 Q-24 -92 -22 -112 Z" fill="${st}" ${O(3)}/><g class="qb-eye"><rect x="-14" y="-110" width="10" height="5" rx="2" fill="#7affd8"/><rect x="4" y="-110" width="10" height="5" rx="2" fill="#7affd8"/></g>
          <g class="qb-arm" style="transform-origin:-32px -78px"><path d="M-32 -78 Q-58 -66 -60 -40" stroke="${LINE}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M-32 -78 Q-58 -66 -60 -40" stroke="${st}" stroke-width="12" fill="none" stroke-linecap="round"/></g></g>`;
      }
      // ── Хозяин Лабиринта: рогатый бык-великан с топором (минотавр, но в нашей рисовке); пёс лабиринта — поджарый пёс с ошейником ──
      function maze(o) {
        const fur = '#7a4a32', furD = '#4e2e1e', horn = '#f0e2c0';
        if (o.boss) return `<g class="qb-idle" style="animation-duration:${sp(o, 2)}s">
          <ellipse cx="0" cy="-4" rx="80" ry="12" fill="${INK}" opacity=".45"/>
          <path d="M-30 0 v-60 M26 0 v-60" stroke="${LINE}" stroke-width="30" stroke-linecap="round"/><path d="M-30 0 v-60 M26 0 v-60" stroke="${furD}" stroke-width="22" stroke-linecap="round"/>
          <path d="M-46 -4 h30 M12 -4 h30" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
          <path d="M-60 -60 Q-74 -170 0 -180 Q70 -170 58 -60 Q0 -46 -60 -60 Z" fill="${fur}" ${O(4)}/>
          <path d="M-40 -150 Q0 -130 40 -150 M-30 -120 Q0 -104 30 -120" stroke="${furD}" stroke-width="5" fill="none"/>
          <path d="M-56 -80 h112" stroke="#6b4423" stroke-width="10"/><rect x="-10" y="-88" width="20" height="16" fill="#c8a04a" stroke="${INK}" stroke-width="2.5"/>
          <path d="M-36 -176 Q-60 -230 -10 -244 Q40 -240 30 -178 Z" fill="${fur}" ${O(3.6)}/>
          <path d="M-40 -226 Q-90 -236 -96 -278 Q-70 -246 -34 -240 M20 -230 Q60 -250 64 -290 Q74 -250 30 -218" fill="${horn}" ${O(3)}/>
          <ellipse cx="-30" cy="-190" rx="18" ry="12" fill="#a87a5a" stroke="${INK}" stroke-width="2.5"/><circle cx="-36" cy="-190" r="3" fill="${INK}"/><circle cx="-24" cy="-190" r="3" fill="${INK}"/>
          <path d="M-38 -182 a8 8 0 1 0 16 0" fill="none" stroke="#c8a04a" stroke-width="4"/>
          <g class="qb-eye"><circle cx="-26" cy="-220" r="6" fill="#ff4a2a" stroke="${INK}" stroke-width="2"/><circle cx="4" cy="-222" r="6" fill="#ff4a2a" stroke="${INK}" stroke-width="2"/></g>
          <g class="qb-arm" style="transform-origin:-56px -150px"><path d="M-56 -150 Q-96 -130 -110 -90" stroke="${LINE}" stroke-width="26" fill="none" stroke-linecap="round"/><path d="M-56 -150 Q-96 -130 -110 -90" stroke="${fur}" stroke-width="18" fill="none" stroke-linecap="round"/>
            <path d="M-110 -90 L-130 -250" stroke="${LINE}" stroke-width="14" stroke-linecap="round"/><path d="M-110 -90 L-130 -250" stroke="#6b4423" stroke-width="8" stroke-linecap="round"/><path d="M-132 -250 q-50 6 -56 54 q34 -20 62 -14 Z" fill="#c9ccd6" ${O(3)}/></g>
          <path d="M56 -150 Q90 -120 86 -80" stroke="${LINE}" stroke-width="24" fill="none" stroke-linecap="round"/><path d="M56 -150 Q90 -120 86 -80" stroke="${fur}" stroke-width="16" fill="none" stroke-linecap="round"/></g>`;
        return `<g class="qb-idle" style="animation-duration:${sp(o, 1.2)}s">
          <ellipse cx="0" cy="-2" rx="50" ry="8" fill="${INK}" opacity=".4"/>
          <path d="M-30 0 v-26 M-12 0 v-24 M22 0 v-26 M40 0 v-26" stroke="${LINE}" stroke-width="12" stroke-linecap="round"/><path d="M-30 0 v-26 M-12 0 v-24 M22 0 v-26 M40 0 v-26" stroke="${furD}" stroke-width="6" stroke-linecap="round"/>
          <path d="M-40 -26 Q-40 -60 0 -62 Q46 -64 52 -30 Q50 -18 40 -20 L-32 -18 Q-44 -18 -40 -26 Z" fill="${fur}" ${O(3.2)}/>
          <path d="M52 -40 q20 -10 22 -30" stroke="${fur}" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path d="M-36 -52 Q-60 -62 -82 -50 L-94 -42 Q-90 -30 -72 -30 Q-52 -26 -38 -30 Z" fill="${fur}" ${O(3.2)}/><path d="M-54 -58 l-4 -20 l14 14 Z" fill="${furD}" ${O(2.4)}/>
          <path d="M-40 -46 h16" stroke="#c8a04a" stroke-width="6"/><g class="qb-eye"><circle cx="-76" cy="-46" r="4" fill="#ff4a2a"/></g></g>`;
      }
      // ── Королева глубин: паучиха с огромным брюшком в узоре, короной из хитина и гроздью глаз, восемь ног; паук-ткач — мелкий паук ──
      function spider(o) {
        const ch = '#3a2448', chL = '#5a3a6e', chD = '#22142c', mark = '#e84a6a';
        const leg = (x0, y0, x1, y1, x2, y2, w) => `<path d="M${x0} ${y0} Q${x1} ${y1} ${x2} ${y2}" stroke="${LINE}" stroke-width="${w + 7}" fill="none" stroke-linecap="round"/><path d="M${x0} ${y0} Q${x1} ${y1} ${x2} ${y2}" stroke="${chD}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
        if (o.boss) return `<g class="qb-idle" style="animation-duration:${sp(o, 2.4)}s">
          <ellipse cx="0" cy="-4" rx="120" ry="14" fill="${INK}" opacity=".45"/>
          ${leg(20, -96, 90, -170, 130, 0, 12)}${leg(10, -92, 120, -140, 150, -4, 12)}${leg(-10, -96, -30, -170, -64, 0, 12)}${leg(-20, -92, -80, -150, -108, -2, 12)}
          <path d="M10 -100 Q20 -190 100 -196 Q170 -190 168 -120 Q160 -60 90 -56 Q30 -56 10 -100 Z" fill="${ch}" ${O(4)}/>
          <path d="M90 -180 l14 26 l-14 24 l-14 -24 Z M90 -122 l10 16 l-10 16 l-10 -16 Z" fill="${mark}" stroke="${INK}" stroke-width="2.5"/>
          <path d="M40 -150 Q90 -164 150 -140 M36 -100 Q90 -88 156 -104" stroke="${chL}" stroke-width="5" fill="none"/>
          <path d="M-60 -60 Q-74 -120 -30 -130 Q14 -136 20 -96 Q20 -60 -20 -54 Q-50 -52 -60 -60 Z" fill="${chL}" ${O(3.6)}/>
          <path d="M-70 -112 Q-90 -150 -60 -170 Q-30 -180 -14 -150 Q-10 -124 -40 -112 Z" fill="${ch}" ${O(3.4)}/>
          <path d="M-74 -164 l-6 -26 l14 14 l6 -24 l10 22 l10 -22 l4 26 l12 -12 l-4 24 Z" fill="#c8b0e0" ${O(2.6)}/>
          <g class="qb-eye">${eye(-58, -142, 7)}${eye(-38, -146, 7)}${eye(-66, -126, 5)}${eye(-30, -128, 5)}${eye(-48, -130, 4)}</g>
          <path d="M-72 -110 q-10 14 -4 26 M-52 -108 q-4 16 4 26" stroke="#f4eedc" stroke-width="6" fill="none" stroke-linecap="round"/>
          <g class="qb-arm" style="transform-origin:-40px -96px">${leg(-40, -96, -110, -160, -150, -110, 12)}<path d="M-150 -110 l-16 10 l14 4" fill="none" stroke="${LINE}" stroke-width="5" stroke-linecap="round"/></g>
          ${leg(-30, -90, -96, -120, -140, -60, 11)}</g>`;
        return `<g class="qb-idle" style="animation-duration:${sp(o, 1.1)}s">
          <ellipse cx="0" cy="-2" rx="46" ry="7" fill="${INK}" opacity=".4"/>
          ${leg(4, -30, 40, -66, 50, 0, 6)}${leg(0, -28, 60, -50, 64, -2, 6)}${leg(-6, -30, -20, -66, -36, 0, 6)}${leg(-10, -28, -50, -50, -56, -2, 6)}
          <ellipse cx="22" cy="-36" rx="28" ry="22" fill="${ch}" ${O(3.2)}/><path d="M22 -50 l6 10 l-6 10 l-6 -10 Z" fill="${mark}"/>
          <circle cx="-14" cy="-34" r="15" fill="${chL}" ${O(3)}/>
          <g class="qb-eye">${eye(-20, -38, 4)}${eye(-8, -40, 4)}</g>
          <g class="qb-arm" style="transform-origin:-18px -28px">${leg(-18, -28, -44, -46, -58, -20, 5)}</g></g>`;
      }
      // ── Часовщик: сутулый механик в длинном сюртуке, вместо головы — циферблат под цилиндром, за спиной ключ завода, в руке огромный гаечный ключ;
      //    заводной жук — медный жук с ключиком на спине ──
      function clock(o) {
        const coat = '#3a4a5a', coatD = '#26323e', brass = '#c8a04a', brassD = '#8a6a2a', face = '#efe4c8';
        if (o.boss) return `<g class="qb-idle" style="animation-duration:${sp(o, 2.4)}s">
          <ellipse cx="0" cy="-4" rx="76" ry="12" fill="${INK}" opacity=".45"/>
          <path d="M-22 0 v-50 M20 0 v-50" stroke="${LINE}" stroke-width="20" stroke-linecap="round"/><path d="M-22 0 v-50 M20 0 v-50" stroke="${coatD}" stroke-width="13" stroke-linecap="round"/>
          <path d="M-36 -4 h22 M10 -4 h24" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
          <path d="M56 -150 l30 -10 v-16 l14 0 v16 l12 4 l-12 4 v16 h-14 v-16 Z" fill="${brass}" ${O(3)}/>
          <path d="M-56 -40 L-50 -160 Q0 -186 52 -160 L60 -40 Q30 -52 0 -36 Q-30 -52 -56 -40 Z" fill="${coat}" ${O(4)}/>
          <path d="M0 -168 V-40" stroke="${coatD}" stroke-width="5"/>${[-140, -116, -92, -68].map((y) => `<circle cx="10" cy="${y}" r="5" fill="${brass}" stroke="${INK}" stroke-width="2"/>`).join('')}
          <path d="M-10 -150 q-20 18 -8 40" stroke="${brass}" stroke-width="4" fill="none"/><circle cx="-18" cy="-108" r="9" fill="${face}" stroke="${INK}" stroke-width="2.5"/>
          <circle cx="-6" cy="-210" r="44" fill="${face}" ${O(4)}/><circle cx="-6" cy="-210" r="36" fill="none" stroke="${brassD}" stroke-width="3"/>
          ${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * 6.283; return `<path d="M${(-6 + Math.cos(a) * 30).toFixed(1)} ${(-210 + Math.sin(a) * 30).toFixed(1)} L${(-6 + Math.cos(a) * 36).toFixed(1)} ${(-210 + Math.sin(a) * 36).toFixed(1)}" stroke="${INK}" stroke-width="${i % 3 ? 2 : 4}"/>`; }).join('')}
          <path d="M-6 -210 L-6 -236 M-6 -210 L12 -200" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
          <g class="qb-eye"><circle cx="-24" cy="-214" r="6" fill="#ff7a2a" stroke="${INK}" stroke-width="2"/><circle cx="12" cy="-218" r="6" fill="#ff7a2a" stroke="${INK}" stroke-width="2"/></g>
          <path d="M-56 -248 h100 l-8 10 h-84 Z" fill="${INK}" stroke="${LINE}" stroke-width="3"/><path d="M-40 -248 v-50 h68 v50 Z" fill="${INK}" stroke="${LINE}" stroke-width="3"/><path d="M-40 -262 h68" stroke="${brass}" stroke-width="6"/>
          <g class="qb-arm" style="transform-origin:-48px -150px"><path d="M-48 -150 Q-96 -130 -100 -86" stroke="${LINE}" stroke-width="24" fill="none" stroke-linecap="round"/><path d="M-48 -150 Q-96 -130 -100 -86" stroke="${coat}" stroke-width="16" fill="none" stroke-linecap="round"/>
            <path d="M-100 -86 L-112 -240" stroke="${LINE}" stroke-width="18" stroke-linecap="round"/><path d="M-100 -86 L-112 -240" stroke="#9aa2ac" stroke-width="11" stroke-linecap="round"/><path d="M-132 -248 q-8 -30 20 -36 q28 -4 30 26 l-14 6 q-2 -14 -14 -14 q-12 2 -10 16 Z" fill="#9aa2ac" ${O(3)}/></g>
          <path d="M50 -150 Q84 -120 80 -80" stroke="${LINE}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M50 -150 Q84 -120 80 -80" stroke="${coat}" stroke-width="14" fill="none" stroke-linecap="round"/></g>`;
        return `<g class="qb-idle" style="animation-duration:${sp(o, 1)}s">
          <ellipse cx="0" cy="-2" rx="40" ry="7" fill="${INK}" opacity=".4"/>
          <path d="M-24 0 l6 -14 M-6 0 l2 -14 M12 0 l-2 -14 M28 0 l-6 -14" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
          <path d="M-36 -14 Q-36 -50 4 -52 Q40 -50 40 -14 Z" fill="${brass}" ${O(3.2)}/><path d="M4 -52 V-14" stroke="${brassD}" stroke-width="3"/><circle cx="-12" cy="-30" r="4" fill="${brassD}"/><circle cx="20" cy="-30" r="4" fill="${brassD}"/>
          <path d="M2 -52 v-12 M-10 -70 q12 -10 24 0 q-12 10 -24 0 Z" stroke="${INK}" stroke-width="3" fill="#9aa2ac"/>
          <circle cx="-40" cy="-20" r="11" fill="${brassD}" ${O(2.6)}/><g class="qb-eye"><circle cx="-44" cy="-22" r="3" fill="#ff7a2a"/></g>
          <g class="qb-arm" style="transform-origin:-40px -20px"><path d="M-46 -14 l-14 6 M-48 -24 l-14 -4" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g></g>`;
      }
      // ── Грибной Король: великан-гриб — пятнистая шляпка с короной, лицо под шляпкой, мшистая мантия, руки-грибницы с посохом-поганкой;
      //    грибочек-спорник — маленький гриб на ножках ──
      function shroom(o) {
        const cap = '#8a3aa8', capD = '#5a2070', stem = '#efe4c8', stemD = '#c8b898', moss = '#4a7a3a', mossD = '#2e5224', glow = '#e8ffb0';
        if (o.boss) return `<g class="qb-idle" style="animation-duration:${sp(o, 2.6)}s">
          <ellipse cx="0" cy="-4" rx="96" ry="14" fill="${INK}" opacity=".45"/>
          <path d="M-70 0 Q-80 -60 -50 -110 L50 -110 Q80 -60 70 0 Q50 -14 30 0 Q10 -14 -10 0 Q-30 -14 -50 0 Z" fill="${moss}" ${O(4)}/>
          <path d="M-50 -30 q10 -20 0 -40 M10 -20 q-10 -30 4 -60 M44 -40 q8 -20 -4 -40" stroke="${mossD}" stroke-width="6" fill="none" stroke-linecap="round"/>
          <path d="M-42 -110 Q-50 -160 -36 -190 L36 -190 Q50 -160 42 -110 Z" fill="${stem}" ${O(4)}/><path d="M-30 -130 q30 10 60 0" stroke="${stemD}" stroke-width="4" fill="none"/>
          <g class="qb-eye"><ellipse cx="-20" cy="-160" rx="7" ry="9" fill="${INK}"/><ellipse cx="14" cy="-160" rx="7" ry="9" fill="${INK}"/><circle cx="-22" cy="-163" r="2.5" fill="${glow}"/><circle cx="12" cy="-163" r="2.5" fill="${glow}"/></g>
          <path d="M-16 -136 q12 8 24 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M-120 -186 Q-110 -282 0 -290 Q110 -282 120 -186 Q60 -170 0 -176 Q-60 -170 -120 -186 Z" fill="${cap}" ${O(4.4)}/>
          <path d="M-110 -190 Q-60 -176 0 -182 Q60 -176 110 -190" stroke="${capD}" stroke-width="6" fill="none"/>
          ${[[-70, -240, 16], [-20, -266, 12], [40, -250, 18], [86, -214, 10], [-96, -206, 9], [6, -220, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${glow}" stroke="${INK}" stroke-width="2.5"/>`).join('')}
          <path d="M-40 -286 l-6 -28 l18 14 l12 -26 l12 26 l18 -14 l-6 28 Z" fill="#e8b84a" ${O(3)}/><circle cx="-4" cy="-300" r="5" fill="#ff4a6a" stroke="${INK}" stroke-width="2"/>
          <g class="qb-arm" style="transform-origin:-46px -100px"><path d="M-46 -100 Q-96 -90 -110 -50" stroke="${LINE}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M-46 -100 Q-96 -90 -110 -50" stroke="${stemD}" stroke-width="14" fill="none" stroke-linecap="round"/>
            <path d="M-112 -40 L-122 -220" stroke="${LINE}" stroke-width="13" stroke-linecap="round"/><path d="M-112 -40 L-122 -220" stroke="#6b4423" stroke-width="7" stroke-linecap="round"/>
            <path d="M-156 -216 Q-152 -250 -122 -252 Q-92 -250 -88 -216 Q-122 -208 -156 -216 Z" fill="#c83a3a" ${O(3)}/><circle cx="-132" cy="-234" r="5" fill="#fff"/><circle cx="-110" cy="-230" r="4" fill="#fff"/></g>
          <path d="M46 -100 Q90 -80 92 -40" stroke="${LINE}" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M46 -100 Q90 -80 92 -40" stroke="${stemD}" stroke-width="12" fill="none" stroke-linecap="round"/>
          <path d="M92 -40 l-10 14 M92 -40 l2 16 M92 -40 l12 10" stroke="${stemD}" stroke-width="5" stroke-linecap="round"/></g>`;
        return `<g class="qb-idle" style="animation-duration:${sp(o, 1.2)}s">
          <ellipse cx="0" cy="-2" rx="34" ry="7" fill="${INK}" opacity=".4"/>
          <path d="M-10 0 v-14 M10 0 v-14" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
          <path d="M-18 -12 Q-20 -40 -14 -52 L14 -52 Q20 -40 18 -12 Z" fill="${stem}" ${O(3)}/>
          <g class="qb-eye"><circle cx="-7" cy="-34" r="3.5" fill="${INK}"/><circle cx="6" cy="-34" r="3.5" fill="${INK}"/></g>
          <path d="M-42 -50 Q-38 -90 0 -92 Q38 -90 42 -50 Q0 -40 -42 -50 Z" fill="${o.seed % 2 ? '#3aa88a' : cap}" ${O(3.4)}/>
          <circle cx="-16" cy="-72" r="6" fill="${glow}"/><circle cx="14" cy="-78" r="5" fill="${glow}"/>
          <g class="qb-arm" style="transform-origin:-16px -30px"><path d="M-16 -30 l-20 10" stroke="${LINE}" stroke-width="10" stroke-linecap="round"/><path d="M-16 -30 l-20 10" stroke="${stemD}" stroke-width="5" stroke-linecap="round"/></g></g>`;
      }
      // ── Падший рыцарь: громада в тёмных, иссечённых латах, шлем с прорезью и рваным плюмажем, рваный плащ, двуручный меч, светящиеся
      //    трещины в доспехе; тень оруженосца — полупрозрачный оруженосец с щитом ──
      function knight(o) {
        const ar = '#4a4a5e', arL = '#6a6a82', arD = '#2e2e3e', cape = '#5a1a2a', glow = '#7affd8';
        if (o.boss) return `<g class="qb-idle" style="animation-duration:${sp(o, 2.8)}s">
          <ellipse cx="0" cy="-4" rx="84" ry="13" fill="${INK}" opacity=".45"/>
          <path d="M30 -170 Q90 -150 96 -60 Q90 -20 70 0 L56 -14 L46 4 L30 -16 Z" fill="${cape}" ${O(3.4)}/>
          <path d="M-26 0 v-60 M22 0 v-60" stroke="${LINE}" stroke-width="30" stroke-linecap="round"/><path d="M-26 0 v-60 M22 0 v-60" stroke="${ar}" stroke-width="22" stroke-linecap="round"/>
          <path d="M-44 -6 h30 M6 -6 h32" stroke="${arD}" stroke-width="14" stroke-linecap="round"/>
          <path d="M-56 -60 L-62 -170 Q0 -192 60 -170 L54 -60 Q0 -48 -56 -60 Z" fill="${ar}" ${O(4)}/>
          <path d="M-50 -150 Q0 -132 50 -150 M-46 -110 Q0 -96 46 -110 M0 -186 V-56" stroke="${arD}" stroke-width="5" fill="none"/>
          <path d="M-30 -160 l14 26 l-8 18 l16 22 M22 -120 l-10 16 l12 14" stroke="${glow}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>
          <path d="M-70 -176 Q-80 -196 -54 -200 L-40 -180 Z M70 -176 Q80 -196 54 -200 L40 -180 Z" fill="${arL}" ${O(3)}/>
          <path d="M-34 -184 Q-38 -246 0 -252 Q38 -246 34 -184 Q0 -176 -34 -184 Z" fill="${arL}" ${O(4)}/>
          <path d="M-26 -222 h52 v10 h-52 Z" fill="${INK}"/><g class="qb-eye"><rect x="-20" y="-220" width="14" height="6" rx="2" fill="${glow}"/><rect x="6" y="-220" width="14" height="6" rx="2" fill="${glow}"/></g>
          <path d="M0 -252 Q30 -290 60 -276 Q40 -270 46 -250 Q26 -262 8 -248" fill="#8a2a3a" ${O(3)}/>
          <g class="qb-arm" style="transform-origin:-56px -160px"><path d="M-56 -160 Q-96 -136 -100 -96" stroke="${LINE}" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M-56 -160 Q-96 -136 -100 -96" stroke="${ar}" stroke-width="22" fill="none" stroke-linecap="round"/>
            <path d="M-100 -96 L-112 -330" stroke="${LINE}" stroke-width="20" stroke-linecap="round"/><path d="M-100 -96 L-112 -330" stroke="#a8b0bc" stroke-width="13" stroke-linecap="round"/><path d="M-105 -150 L-111 -320" stroke="#d8e0ea" stroke-width="3"/>
            <path d="M-126 -100 h40" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M-98 -96 v30" stroke="#6b4423" stroke-width="10" stroke-linecap="round"/><path d="M-110 -220 l6 -8 l4 10 Z" fill="${INK}"/></g>
          <path d="M56 -160 Q86 -130 82 -90" stroke="${LINE}" stroke-width="28" fill="none" stroke-linecap="round"/><path d="M56 -160 Q86 -130 82 -90" stroke="${ar}" stroke-width="20" fill="none" stroke-linecap="round"/></g>`;
        return `<g class="qb-idle" style="animation-duration:${sp(o, 1.6)}s" opacity=".85">
          <ellipse cx="0" cy="-2" rx="34" ry="7" fill="${INK}" opacity=".4"/>
          <path d="M-12 0 v-26 M10 0 v-26" stroke="${LINE}" stroke-width="13" stroke-linecap="round"/><path d="M-12 0 v-26 M10 0 v-26" stroke="#3a3a5a" stroke-width="7" stroke-linecap="round"/>
          <path d="M-24 -24 L-26 -80 Q0 -90 24 -80 L22 -24 Z" fill="#3a3a5a" ${O(3.2)}/>
          <circle cx="0" cy="-100" r="18" fill="#3a3a5a" ${O(3)}/><g class="qb-eye"><circle cx="-7" cy="-102" r="3" fill="${glow}"/><circle cx="6" cy="-102" r="3" fill="${glow}"/></g>
          <g class="qb-arm" style="transform-origin:-20px -64px"><path d="M-48 -82 h30 v34 q-15 14 -30 0 Z" fill="${cape}" ${O(3)}/><path d="M-33 -78 v26" stroke="#c8a04a" stroke-width="4"/></g></g>`;
      }
      const DARK = `<svg width="44" height="44" viewBox="-22 -22 44 44"><circle r="16" fill="#1b1430" stroke="${INK}" stroke-width="2.4"/><ellipse cx="-5" cy="-2" rx="4" ry="2.6" fill="#ff2a2a"/><ellipse cx="6" cy="-3" rx="3" ry="2" fill="#ff2a2a"/></svg>`;
      return {
        dgb_light: { draw: light, top: 150, scale: 1.05, attacks: { shield: 'lunge', duck: 'swoop', scatter: 'burst' }, missile: { svg: DARK } },
        dgb_golem: { draw: golem, top: 230, scale: 0.85, attacks: { shield: 'charge', duck: 'throw', scatter: 'wave' }, missile: { emoji: '🪨' } },
        dgb_maze: { draw: maze, top: 250, scale: 0.8, attacks: { shield: 'charge', duck: 'leap', scatter: 'wave' }, missile: { emoji: '🪓' } },
        dgb_spider: { draw: spider, top: 200, scale: 0.95, attacks: { shield: 'lunge', duck: 'leap', scatter: 'burst' }, missile: { emoji: '🕸' } },
        dgb_clock: { draw: clock, top: 300, scale: 0.75, attacks: { shield: 'lunge', duck: 'throw', scatter: 'burst' }, missile: { emoji: '⚙' } },
        dgb_shroom: { draw: shroom, top: 300, scale: 0.75, attacks: { shield: 'lunge', duck: 'throw', scatter: 'burst' }, missile: { emoji: '🍄' } },
        dgb_knight: { draw: knight, top: 300, scale: 0.78, attacks: { shield: 'charge', duck: 'leap', scatter: 'wave' }, missile: { emoji: '🗡' } },
        dgb_living: { draw: living, top: 150, scale: 1.05, attacks: { shield: 'charge', duck: 'throw', scatter: 'wave' }, missile: { emoji: '🪨' } },
      };
    })();
    return Object.assign(fit({
      dg_mummy: { draw: dg_mummy, top: 160, bossK: 0.87, attacks: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, missile: { svg: svg40(`<path d="M-14 -6 q14 -10 28 0 q-14 10 -28 0 z M-12 4 q12 -8 24 0" fill="#e8dcc0" stroke="${INK}" stroke-width="2"/>`) } },
      dg_sandworm: { draw: dg_sandworm, top: 113, bossK: 0.8, attacks: { shield: 'lunge', duck: 'leap', scatter: 'css:burrow' } },
      dg_tinnik: { draw: dg_tinnik, top: 152, bossK: 1, attacks: { shield: 'lunge', duck: 'throw', scatter: 'css:ring' }, missile: { blob: '#5a7a3a' } },
      dg_potion: { draw: dg_potion, top: 104, bossK: 0.87, attacks: { shield: 'charge', duck: 'leap', scatter: 'css:puff' }, missile: { blob: '#7aff5a' } },
      dg_rootworm: { draw: dg_rootworm, top: 113, bossK: 0.62, attacks: { shield: 'charge', duck: 'leap', scatter: 'wave' } },
      dg_mushroom: { draw: dg_mushroom, top: 140, bossK: 0.76, attacks: { shield: 'lunge', duck: 'leap', scatter: 'burst' }, missile: { blob: '#e8d8f0' } },
      dg_minerghost: { draw: dg_minerghost, top: 168, bossK: 1, attacks: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, missile: { svg: svg40(`<path d="M-12 -8 l10 -6 l12 4 l4 12 l-10 8 l-14 -4 z" fill="#8a8478" stroke="${INK}" stroke-width="2"/>`) } },
      dg_automaton: { draw: dg_automaton, top: 114, bossK: 0.64, attacks: { shield: 'charge', duck: 'throw', scatter: 'burst' }, missile: { svg: svg40(`<circle r="12" fill="#c89a4a" stroke="${INK}" stroke-width="2"/><circle r="5" fill="${INK}"/>`) } },
      dg_icelet: { draw: dg_icelet, top: 134, bossK: 0.71, attacks: { shield: 'charge', duck: 'throw', scatter: 'wave' }, missile: { svg: svg40(`<circle r="13" fill="#f0f8ff" stroke="${INK}" stroke-width="2"/><path d="M-6 -4 l4 4 l6 -6" stroke="#8ac8e8" stroke-width="2" fill="none"/>`) } },
      dg_frostdead: { draw: dg_frostdead, top: 154, bossK: 0.78, attacks: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, missile: { svg: svg40(`<path d="M0 -16 l6 12 l-6 20 l-6 -20 z" fill="#c8f0ff" stroke="${INK}" stroke-width="2"/>`) } },
      dg_monk: { draw: dg_monk, top: 172, bossK: 1, attacks: { shield: 'lunge', duck: 'leap', scatter: 'css:ring' } },
      dg_astro: { draw: dg_astro, top: 122, bossK: 0.8, attacks: { shield: 'lunge', duck: 'throw', scatter: 'css:spin' }, missile: { svg: svg40(`<path d="M0 -14 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 z" fill="#ffe08a" stroke="${INK}" stroke-width="2"/>`) } },
      dg_lavaslime: { draw: dg_lavaslime, top: 69, bossK: 0.89, attacks: { shield: 'charge', duck: 'leap', scatter: 'spit' }, missile: { blob: '#ff6a1a' } },
      dg_imp: { draw: dg_imp, top: 132, bossK: 1, attacks: { shield: 'lunge', duck: 'throw', scatter: 'burst' }, missile: { svg: svg40(`<rect x="-10" y="-6" width="20" height="12" rx="3" fill="#ff8a2a" stroke="${INK}" stroke-width="2"/>`) } },
      dg_voidling: { draw: dg_voidling, top: 122, bossK: 0.62, attacks: { shield: 'lunge', duck: 'css:blink', scatter: 'wave' } },
      dg_clockwork: { draw: dg_clockwork, top: 124, bossK: 0.62, attacks: { shield: 'lunge', duck: 'swoop', scatter: 'css:spin' }, missile: { svg: svg40(`<circle r="12" fill="#c89a4a" stroke="${INK}" stroke-width="2"/><path d="M0 -12 v-4 M0 12 v4 M-12 0 h-4 M12 0 h4" stroke="${INK}" stroke-width="3"/>`) } },
      dg_splasher: { draw: dg_splasher, top: 114, bossK: 0.75, attacks: { shield: 'lunge', duck: 'spit', scatter: 'wave' }, missile: { blob: '#6ac8e8' } },
      dg_rat: { draw: dg_rat, top: 93, bossK: 0.9, attacks: { shield: 'charge', duck: 'leap', scatter: 'wave' } },
      dg_smuggler: { draw: dg_smuggler, top: 172, bossK: 1, attacks: { shield: 'lunge', duck: 'throw', scatter: 'burst' }, missile: { svg: svg40(`<path d="M-4 -14 v6 l-6 6 v14 h20 v-14 l-6 -6 v-6 z" fill="#5a8a5a" stroke="${INK}" stroke-width="2"/>`) } },
      dg_squire: { draw: dg_squire, top: 194, bossK: 1, attacks: { shield: 'charge', duck: 'throw', scatter: 'wave' }, missile: { svg: svg40(`<path d="M-16 4 L12 -4 l6 -6 l-2 8 z" fill="#c8ccd8" stroke="${INK}" stroke-width="2"/>`) } },
      dg_skullguard: { draw: dg_skullguard, top: 158, bossK: 1, attacks: { shield: 'charge', duck: 'leap', scatter: 'css:ring' } },
      dg_book: { draw: dg_book, top: 120, bossK: 0.72, attacks: { shield: 'lunge', duck: 'swoop', scatter: 'burst' }, missile: { svg: svg40(`<path d="M-14 -10 h28 v20 h-28 z" fill="#f0e4c8" stroke="${INK}" stroke-width="2"/><path d="M-8 -4 h16 M-8 2 h12" stroke="#b8a888" stroke-width="2"/>`) } },
      dg_crab: { draw: dg_crab, top: 78, bossK: 0.71, attacks: { shield: 'charge', duck: 'leap', scatter: 'wave' } },
      dg_sailor: { draw: dg_sailor, top: 154, bossK: 0.99, attacks: { shield: 'lunge', duck: 'throw', scatter: 'burst' }, missile: { svg: svg40(`<path d="M0 -14 v24 M-10 4 q10 12 20 0 M-6 -10 h12" stroke="#5a5a62" stroke-width="4" fill="none" stroke-linecap="round"/>`) } },
      dg_prisoner: { draw: dg_prisoner, top: 150, bossK: 0.9, attacks: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, missile: { svg: svg40(`<circle r="12" fill="#3a3a44" stroke="${INK}" stroke-width="2"/>`) } },
      dg_armory: { draw: dg_armory, top: 179, bossK: 1, attacks: { shield: 'charge', duck: 'swoop', scatter: 'burst' }, missile: { svg: svg40(`<circle r="11" fill="#2a2a32" stroke="${INK}" stroke-width="2"/><circle cx="-3" cy="-3" r="3" fill="#8a8a92"/>`) } },
      css: CSS,
    }), DGB);
  });
})();

} catch (e) { console.error('[стили] styles/legion/enemies-dungeon.js не загрузился:', e); }
