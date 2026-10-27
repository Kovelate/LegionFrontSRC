// Рисунок боя: враги, строй отряда. Табло и ход сцены — battleui.js. Правила — ../BATTLE.md.
// QBattle.foe(type, x, y, s, o) → SVG врага (смотрит влево); QBattle.top(type) — рост врага (для полоски здоровья); QBattle.place — где кто стоит; QBattle.keep() — где фону ничего не ставить.
// ВРАГИ рисует СТИЛЬ: styles/<стиль>/enemies.js (договор — styles/README.md, «Враги»). Чего нет у стиля — берётся у «Легиона»,
// нет и там — рисунок ниже (запасной, тот же, что у «Легиона»), а для незнакомого вида — тёмный силуэт с «?».
(function () {
  const K = window.QArt, { INK, f1, O } = K;

  /* ---------- враги (смотрят влево, на отряд) ---------- */
  function wolf(x, y, s, o = {}) {
    const c = o.c || ['#7a7488', '#5a5468', '#a8a2b4'], big = o.boss;
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">
      <g class="qb-idle" style="animation-duration:${(1.1 + (x % 7) / 10).toFixed(2)}s">
      <path d="M58 -46 q38 -14 46 -46 q-4 30 -30 58 Z" fill="${c[1]}" ${O(3)}/>
      <path d="M-30 0 v-30 M-10 0 v-26 M30 0 v-28 M50 0 v-30" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M-30 0 v-30 M-10 0 v-26 M30 0 v-28 M50 0 v-30" stroke="${c[1]}" stroke-width="7" stroke-linecap="round"/>
      <path d="M-50 -40 Q-48 -78 0 -78 Q50 -82 66 -54 Q72 -30 52 -24 L-36 -22 Q-56 -24 -50 -40 Z" fill="${c[0]}" ${O(3.4)}/>
      <path d="M-20 -76 l10 -12 l10 12 l10 -12 l10 12 l10 -10 l8 10" fill="${c[1]}" ${O(2.6)}/>
      <path d="M-30 -30 Q10 -40 50 -30" stroke="${c[2]}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/>
      <path d="M-44 -64 Q-74 -74 -96 -58 L-112 -50 Q-108 -38 -88 -38 Q-66 -32 -46 -36 Z" fill="${c[0]}" ${O(3.4)}/>
      <path d="M-62 -70 l-6 -26 l20 16 Z M-46 -72 l2 -24 l14 20 Z" fill="${c[1]}" ${O(2.6)}/>
      <path d="M-112 -50 l4 -6 l4 5 l4 -5 l4 5 l4 -5 l4 5" fill="#fff" ${O(1.6)}/>
      <circle cx="-114" cy="-54" r="5" fill="${INK}"/>
      <path d="M-80 -60 l14 -4 l-2 7 Z" fill="${big ? '#ff4a3a' : '#ffd34d'}" ${O(1.6)}/>
      ${big ? `<path d="M-60 -82 l6 -14 l6 12 l6 -14 l6 14" fill="#ffc94d" ${O(2)}/>` : ''}
      </g></g>`;
  }
  function skeleton(x, y, s, o = {}) {
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><g class="qb-idle">
      <path d="M-14 0 l4 -50 M14 0 l-4 -50" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-14 0 l4 -50 M14 0 l-4 -50" stroke="#e8e2d0" stroke-width="5" stroke-linecap="round"/>
      <path d="M-22 -50 h44 l-6 -58 h-32 Z" fill="#2a2436" ${O(3)}/>
      ${[0, 1, 2, 3].map((i) => `<path d="M-18 ${-58 - i * 12} q18 -6 36 0" stroke="#e8e2d0" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
      <path d="M0 -108 v58" stroke="#e8e2d0" stroke-width="5"/>
      <g class="qb-arm" style="transform-origin:-18px -100px"><path d="M-18 -100 l-30 20" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-18 -100 l-30 20" stroke="#e8e2d0" stroke-width="5" stroke-linecap="round"/><path d="M-50 -78 l-46 -10" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-50 -78 l-46 -10" stroke="#a8a2b4" stroke-width="5" stroke-linecap="round"/><path d="M-46 -86 v16" stroke="#7a5232" stroke-width="6"/></g>
      <path d="M18 -100 l20 26" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M18 -100 l20 26" stroke="#e8e2d0" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="40" cy="-64" rx="16" ry="22" fill="#6a4a30" ${O(3)}/><circle cx="40" cy="-64" r="5" fill="#a8a2b4"/>
      <path d="M-24 -132 Q-26 -158 0 -158 Q26 -158 24 -132 Q22 -118 12 -116 V-108 H-12 V-116 Q-22 -118 -24 -132 Z" fill="#f4eedc" ${O(3.4)}/>
      <circle cx="-10" cy="-134" r="7" fill="${INK}"/><circle cx="10" cy="-134" r="7" fill="${INK}"/><circle class="qb-eye" cx="-10" cy="-134" r="3" fill="#7affb0"/><circle class="qb-eye" cx="10" cy="-134" r="3" fill="#7affb0"/>
      <path d="M-8 -116 v-6 M-2 -116 v-6 M4 -116 v-6 M10 -116 v-6" stroke="${INK}" stroke-width="2"/>
      ${o.boss ? `<path d="M-22 -156 l6 -14 l8 10 l8 -14 l8 14 l8 -10 l6 14 Z" fill="#c8a04a" ${O(2.4)}/>` : ''}
      </g></g>`;
  }
  function bandit(x, y, s, o = {}) {
    const c = o.boss ? '#4a2a2a' : '#5a4a3a';
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><g class="qb-idle">
      <path d="M-14 0 v-24 M14 0 v-24" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M-14 0 v-24 M14 0 v-24" stroke="#3a3040" stroke-width="7" stroke-linecap="round"/>
      <path d="M-34 -22 Q-40 -110 0 -118 Q40 -110 34 -22 Z" fill="${c}" ${O(3.4)}/>
      <path d="M-30 -60 H30" stroke="#8a6a3a" stroke-width="7"/><rect x="-6" y="-66" width="12" height="12" fill="#c8a04a" ${O(2)}/>
      <path d="M-30 -110 Q-34 -160 0 -164 Q34 -160 30 -110 Q20 -96 0 -98 Q-20 -96 -30 -110 Z" fill="#3a3040" ${O(3.4)}/>
      <path d="M-20 -126 Q0 -134 20 -126 V-112 Q0 -106 -20 -112 Z" fill="#e8c8a0" ${O(2.4)}/>
      <path d="M-20 -122 H20" stroke="#8a2a2a" stroke-width="8"/><circle cx="-8" cy="-126" r="3" fill="${INK}"/><circle cx="8" cy="-126" r="3" fill="${INK}"/>
      <g class="qb-arm" style="transform-origin:-30px -70px"><path d="M-30 -70 l-26 6" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M-30 -70 l-26 6" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M-58 -64 l-30 -14 l4 8 l26 10 Z" fill="#d8dce8" ${O(2.4)}/></g>
      ${o.boss ? `<path d="M-30 -150 q30 -26 60 0" stroke="#c8a04a" stroke-width="7" fill="none"/>` : ''}
      </g></g>`;
  }
  // незнакомый вид (стая есть в игре, рисунка ещё нет): тёмный силуэт-клякса с глазами и «?»
  function unknown(x, y, s, o = {}) {
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><g class="qb-idle">
      <path d="M-70 0 Q-90 -70 -40 -110 Q0 -140 40 -110 Q90 -70 70 0 Z" fill="#3a3448" ${O(3.4)}/>
      <circle class="qb-eye" cx="-28" cy="-74" r="7" fill="#ffd34d"/><circle class="qb-eye" cx="4" cy="-76" r="7" fill="#ffd34d"/>
      <text x="0" y="-26" text-anchor="middle" font-family="Russo One, sans-serif" font-size="44" fill="#f6e7c8">?</text></g></g>`;
  }
  const ART = { wolf, skeleton, bandit };
  const SCALE = { wolf: 1, skeleton: 1.25, bandit: 1 }, TOP = { wolf: 96, skeleton: 160, bandit: 164 };
  // враги из стиля: активный (или «Легион», если у активного нет файла) и отдельно «Легион» — чтобы добирать недостающие виды
  let fromStyle = null;
  function styleArt() {
    if (fromStyle) return fromStyle;
    const D = window.MDDoodle; let own = null, base = null;
    try { own = D && D.part ? D.part('enemies', {}) : null; } catch (e) { console.error('[бой] враги стиля:', e); }
    try { const f = D && D.locations && D.locations.legion && D.locations.legion.enemies; base = f && D.active !== 'legion' ? f({}) : null; } catch (e) { base = null; }
    // HW: враги Изнанки — свой файл стиля enemies-hollow, иначе «Легион» (styles/legion/enemies-hollow.js)
    let hw = null;
    try { hw = D && D.part ? D.part('enemies-hollow', {}) : null; } catch (e) { hw = null; }
    try { if (!hw) { const f = D && D.locations && D.locations.legion && D.locations.legion['enemies-hollow']; hw = f ? f({}) : null; } } catch (e) { hw = null; }
    if (hw) own = Object.assign({}, own || {}, hw);   // все ключи hw_* — с обычными не пересекаются
    // 22.10: монстры данжей — свой файл стиля enemies-dungeon, иначе «Легион» (styles/legion/enemies-dungeon.js); ключи dg_* (стаи) и dgb_* (боссы, PR #49), css — склеиваем
    let dg = null;
    try { dg = D && D.part ? D.part('enemies-dungeon', {}) : null; } catch (e) { dg = null; }
    try { if (!dg) { const f = D && D.locations && D.locations.legion && D.locations.legion['enemies-dungeon']; dg = f ? f({}) : null; } } catch (e) { dg = null; }
    if (dg) { const css0 = (own && own.css) || ''; own = Object.assign({}, own || {}, dg); own.css = [css0, dg.css || ''].filter(Boolean).join('\n'); }
    return (fromStyle = { own: own || {}, base: base || {} });
  }
  const broken = new Set();
  const defOf = (type) => { const A2 = styleArt(); return A2.own[type] || A2.base[type] || null; };
  function foe(type, x, y, s, o = {}) {
    const d = defOf(type), k = s * (o.boss ? 1.25 : 1), fx = o.flip ? -1 : 1;   // flip — смотрит вправо (левый фронт)
    if (d && typeof d.draw === 'function' && !broken.has(type)) {
      try { const kk = k * (+d.scale || 1); return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(kk * fx)} ${f1(kk)})">${d.draw({ boss: !!o.boss, seed: Math.round(x * 7 + y) })}</g>`; }
      catch (e) { broken.add(type); console.error(`[бой] рисунок врага «${type}» с ошибкой, рисую запасной:`, e); }
    }
    const g0 = (ART[type] || unknown)(x, y, k * (SCALE[type] || 1), o);
    return o.flip ? `<g transform="translate(${f1(2 * x)} 0) scale(-1 1)">${g0}</g>` : g0;
  }
  /* ---------- атаки врагов ----------
     Ход врага бывает трёх видов (сервер: TELE) — shield (удар в лоб), duck (прыжок/бросок сверху), scatter (по площади).
     На каждый вид у врага есть ПРИЁМ — как он движется на экране (рисует battleui.js):
       lunge — рывок к строю и назад;  charge — таранит до первой шеренги, пыль;  leap — прыжок по дуге на отряд;
       swoop — взлёт и пикирование сверху;  throw — бросок снаряда (missile) замахом руки (qb-arm);  spit — плевок (снаряд-капля);
       wave — прыжок на месте и волна по земле;  burst — бросок снаряда, взрыв посреди строя;
       'css:имя' — свой приём стиля: врагу на время атаки ставится класс qb-atk-имя (анимацию пишет стиль в поле css).
     Стиль задаёт приёмы в enemies.js: attacks: { shield, duck, scatter }, снаряд — missile: { svg | emoji | blob: цвет, size }.
     Не задал — берутся приёмы стаи ниже, потом общие (lunge / leap / wave). Договор — styles/README.md, «Враги → Атаки». */
  const ATK_DEF = { shield: 'lunge', duck: 'leap', scatter: 'wave' };
  const ATK_PACK = {
    wolf: { shield: 'lunge', duck: 'leap', scatter: 'wave' }, skeleton: { shield: 'lunge', duck: 'throw', scatter: 'wave' }, bandit: { shield: 'lunge', duck: 'throw', scatter: 'burst' },
    boar: { shield: 'charge', duck: 'leap', scatter: 'charge' }, drowner: { shield: 'lunge', duck: 'spit', scatter: 'wave' }, spider: { shield: 'lunge', duck: 'leap', scatter: 'spit' },
    bat: { shield: 'swoop', duck: 'swoop', scatter: 'swoop' },
  };
  const MISSILE = { skeleton: { emoji: '💀' }, bandit: { emoji: '🔪' }, drowner: { blob: '#6a7a3a' }, spider: { blob: '#7dff6a' } };
  // 23.10: sig — фирменная атака стаи (сервер: sigatk.js): свой приём (move) и снаряд (missile); у рисунка может быть свой — attacks.sig / missileSig
  function atk(type, kind, sig) {
    const d = defOf(type) || {}, own = d.attacks && ((sig && d.attacks.sig) || d.attacks[kind]);
    if (sig) return { move: (d.attacks && d.attacks.sig) || sig.move || own || (ATK_PACK[type] || {})[kind] || ATK_DEF[kind] || 'lunge', missile: d.missileSig || sig.missile || d.missile || MISSILE[type] || { emoji: '💥' } };
    return { move: own || (ATK_PACK[type] || {})[kind] || ATK_DEF[kind] || 'lunge', missile: d.missile || MISSILE[type] || { emoji: '💥' } };
  }
  // свой CSS стиля врагов (анимации приёмов 'css:имя', позы замаха) — поле css в enemies.js
  const css = () => { const A2 = styleArt(); return [A2.base.css, A2.own.css].filter((x) => typeof x === 'string').join('\n'); };
  const top = (type) => { const d = defOf(type); return d && !broken.has(type) ? (+d.top || 150) * (+d.scale || 1) : (TOP[type] || 140) * (SCALE[type] || 1); };

  /* ---------- где кто стоит ---------- */
  // строй лицом к врагу: шеренги — вертикальные ряды; первая — ближе всех к врагам
  const rank = (k, n, x0, dx, y0, y1, s0) => [...Array(n)].map((_, i) => { const t = n > 1 ? i / (n - 1) : 0.5, y = y0 + (y1 - y0) * t; return { x: Math.round(x0 - k * dx + (y - y0) * 0.18), y: Math.round(y), s: +(s0 + t * 0.16).toFixed(2) }; });
  const FRONT = [0, 1, 2, 3, 4].flatMap((k) => rank(k, 4, 900, 86, 806 + k * 5, 1014 + k * 5, 0.96));   // 20 — крупно, ники у первых 12
  // 17.10: задние — не шеренгами кучей, а вразброс по всему свободному месту слева снизу (5 рядов по глубине, ниже — шире и левее)
  const spread = (y0, y1) => [...Array(30)].map((_, i) => { const r = Math.floor(i / 5), c = i % 5, t = r / 5,   /* 17.10: 30 мест (было 24) — 50 бойцов помещаются все, без смены строя */ y = y0 + (y1 - y0) * t, xl = 250 - 170 * t, xr = 505 + 25 * t;
    const jx = ((i * 37) % 23) - 11, jy = ((i * 53) % 17) - 8; return { x: Math.round(xl + (xr - xl) * (c + (r % 2) * 0.5) / 5 + jx), y: Math.round(y + jy), s: +(0.6 + t * 0.16).toFixed(2) }; });
  const BACK = spread(812, 1000);   // ноги не выше 812: выше на многих фонах — река          // 24 — мельче, позади; 17.10: на всё свободное место слева снизу (было кучей y 720–850), бродят (battleui.js)
  const LOAF = [...Array(10)].map((_, i) => ({ x: 70 + ((i * 97) % 260), y: 865 + ((i * 53) % 135), s: 0.74 + ((i * 7) % 4) * 0.04, loaf: true }));   // «балбесы» (левее 190 — стволы фона)
  // 17.10: враги сдвинуты правее на 50–70 px — новый волк длиннее (морда до −124), вожак ×1,25 залезал на первую шеренгу отряда
  const FOE = [{ x: 1195, y: 920, s: 1.1 }, { x: 1440, y: 860, s: 1.02 }, { x: 1085, y: 770, s: 0.88 }, { x: 1310, y: 745, s: 0.86 }, { x: 1525, y: 720, s: 0.8 }, { x: 1190, y: 670, s: 0.7 }];
  // 17.10: у реки (Река, Брод, Водопад, Старый мост) вода — y 690–780: задний ряд врагов стоял в воде. Там все враги — на ближнем берегу (y ≥ 800)
  const FOE_LAND = FOE.map((p) => ({ ...p }));
  const BACK_LAND = BACK.map((p) => ({ ...p })), LOAF_LAND = LOAF.map((p) => ({ ...p }));
  const BACK_RIVER = spread(818, 1002);
  const FOE_RIVER = [{ x: 1205, y: 950, s: 1.1 }, { x: 1465, y: 905, s: 1.02 }, { x: 1100, y: 845, s: 0.93 }, { x: 1335, y: 825, s: 0.9 }, { x: 1575, y: 815, s: 0.88 }, { x: 1700, y: 915, s: 0.98 }];
  // 17.10: враги на поляне перед подножием (Курган, Ущелье): ниже и чуть мельче, правее x 1500 — не ниже y 830 (вебка)
  const FOE_LOW = [{ x: 1195, y: 950, s: 1 }, { x: 1430, y: 885, s: 0.94 }, { x: 1090, y: 850, s: 0.86 }, { x: 1320, y: 830, s: 0.84 }, { x: 1540, y: 815, s: 0.8 }, { x: 1215, y: 800, s: 0.76 }];
  // 17.10: Шахта — враги между стойками крепи (стойки ближе к зрителю, чем враг, не должны оказаться позади него)
  const FOE_MINE = [{ x: 1195, y: 950, s: 1 }, { x: 1405, y: 900, s: 0.94 }, { x: 1090, y: 860, s: 0.86 }, { x: 1290, y: 835, s: 0.84 }, { x: 1150, y: 790, s: 0.78 }, { x: 1295, y: 800, s: 0.76 }];   // стойки справа: x 1386 (низ 850), 1526 (низ 931)
  function foeTerrain(terrain) {   // меняем точки на месте (FOE — один и тот же массив у всех, кто его взял)
    let icon = ''; try { icon = (window.QScene && window.QScene.ICON && window.QScene.ICON[terrain]) || ''; } catch (e) {}
    let low = false; try { const w = window.QScene && window.QScene.walk && window.QScene.walk(terrain); low = !!(w && w.lowFoes); } catch (e) {}   // 17.10: сцены, где дальний ряд врагов стоял у подножия (Курган, Ущелье) — враги ниже, на поляне
    const river = icon === 'river', src = river && !low ? FOE_RIVER : FOE_LOW;   // 17.10: на всех сухих местностях враги — на поляне (FOE_LOW): дальний ряд FOE_LAND стоял на линии горизонта (висел в воздухе) и на постройках фона (мельница, крепь шахты)
    (terrain === 'Шахта' ? FOE_MINE : src).forEach((p, i) => { FOE[i] = { ...p }; });
    // задние шеренги отряда и «балбесы» — тоже на берег, а не в воду
    (river ? BACK_RIVER : BACK_LAND).forEach((p, i) => { BACK[i] = { ...p }; });
    LOAF_LAND.forEach((p, i) => { LOAF[i] = { ...p, y: river ? Math.max(p.y, 812) : p.y }; });
    // 23.10: задние и «балбесы» стоят слева, у края кадра: там у местности бывают предметы (пруд болота, арка руин) —
    // такого человечка сдвигаем ниже (ближе к зрителю), потом правее, пока он не встанет на землю (QScene.standOk)
    const ok = window.QScene && window.QScene.standOk;
    if (ok) for (const A of [BACK, LOAF]) A.forEach((p, i) => { if (ok(terrain, p.x, p.y, p.s)) return;
      for (let k = 1; k <= 40; k++) { const y = Math.min(1040, p.y + k * 8), x = p.x + Math.max(0, k * 8 - (1040 - p.y)); if (ok(terrain, x, y, p.s)) { A[i] = { ...p, x, y }; return; } } });
  }
  // раскладка: formation (с сервера) → место каждого. Сначала строй (передние 20, потом задние 24), балбесы — в свои места
  /* 17.10: бой на два фронта (Врата башни): отряд посередине двора, стражи по 3 слева и справа. Крыло каждого бойца (p.side) задаёт сервер.
     Передние: по 10 в крыле, два столбца, смотрят наружу (левое крыло — отражено, flip); задние и балбесы — в середине, между крыльями */
  let TWO = false;
  const FOE_TWO = [{ x: 1440, y: 838, s: 1 }, { x: 480, y: 838, s: 1, flip: true }, { x: 1630, y: 775, s: 0.9 }, { x: 290, y: 775, s: 0.9, flip: true }, { x: 1790, y: 722, s: 0.8 }, { x: 130, y: 722, s: 0.8, flip: true }];
  const wing = (sd) => { const L = sd === 'L', xs = L ? [650, 738] : [1270, 1182]; return [0, 1].flatMap((k) => [...Array(5)].map((_, i) => { const t = i / 4; return { x: xs[k] + (L ? -1 : 1) * Math.round(t * 24), y: Math.round(796 + t * 206), s: +(0.9 + t * 0.12).toFixed(2), flip: L }; })); };
  const FRONT_L = wing('L'), FRONT_R = wing('R');
  const BACK_TWO = [...Array(30)].map((_, i) => { const r = Math.floor(i / 5), c = i % 5, t = r / 5, jx = ((i * 37) % 19) - 9, jy = ((i * 53) % 15) - 7;
    return { x: Math.round(838 + (c + (r % 2) * 0.5) * 56 + jx), y: Math.round(790 + t * 200 + jy), s: +(0.66 + t * 0.14).toFixed(2), flip: c < 2 }; });
  const LOAF_TWO = [...Array(10)].map((_, i) => ({ x: 830 + ((i * 97) % 280), y: 1000 + ((i * 23) % 40), s: 0.74 + ((i * 7) % 4) * 0.04, loaf: true }));
  /* 22.10 (Issue #27): большой бой (B.crowd с сервера) — места из battlecrowd.js: камера по числу бойцов, строй по классам
     (щиты к врагу, жрецы дальше всех), окружение на две и три стороны по броску, врагов на экране больше. Без B.crowd — всё как раньше */
  let CROWD = null; const FOE_N = FOE.length;
  // вызывать до place: местность (вода), режим двух фронтов, большой бой (crowd = B.crowd, nFoes — сколько врагов на экране)
  function layout(terrain, two, crowd, nFoes) {
    FOE.length = FOE_N;
    try { foeTerrain(terrain); } catch (e) {}
    TWO = !!two; if (TWO) FOE_TWO.forEach((p, i) => { FOE[i] = { ...p }; });
    CROWD = null; const C = window.QBattleCrowd;
    if (!crowd || !C) return;
    const fronts = TWO ? ['L', 'R'] : (crowd.fronts && crowd.fronts.length ? crowd.fronts : ['R']);
    CROWD = { cam: +crowd.cam || 1, cap: +crowd.cap || 200, fronts, multi: fronts.length > 1, chaos: !!crowd.chaos, terrain };
    if (TWO) return;   // у Врат башни стражи стоят у ворот, как раньше; отряд — кольцом (ниже)
    const n = Math.max(FOE_N, +nFoes || 0), pts = CROWD.multi ? C.foeRing(n, CROWD.cam, terrain, fronts) : C.foeLayout(n, CROWD.cam, terrain);
    FOE.length = 0; pts.forEach((p) => FOE.push({ x: p.x, y: p.y, s: +p.s.toFixed(3), ...(p.flip ? { flip: true } : {}), ...(p.side ? { side: p.side } : {}) }));
  }
  const crowd = () => CROWD;
  // места большого боя: каждый в строю (и «балбесы» — тоже), ник у всех; chaos — «врасплох» (вперемешку, как шли)
  function placeCrowd(formation, o) {
    const C = window.QBattleCrowd, K = CROWD, chaos = o && o.chaos != null ? !!o.chaos : K.chaos;
    const heroes = (formation || []).filter((p) => !p.reserve).map((p) => ({ login: p.login, name: p.name, cls: p.role, shield: p.shield, def: 5 - (p.rank != null ? p.rank : 2), side: p.side, p }));
    const pl = K.multi ? C.ringLayout(heroes, K.cam, K.terrain, K.fronts, chaos) : C.layout(heroes, K.cam, K.terrain);
    return pl.map((q) => ({ p: q.h.p, st: { x: q.x, y: q.y, s: q.s, ...(q.wing === 'L' ? { flip: true } : {}), wing: q.wing || 'R' }, front: true, named: true, crowd: true, zone: q.zone }));
  }
  function place(formation, o) {
    if (CROWD) return placeCrowd(formation, o);
    if (TWO) {
      const out = []; let iL = 0, iR = 0, j = 0, q = 0;
      for (const p of formation || []) {
        if (p.reserve) continue;
        if (p.loaf && q < LOAF_TWO.length) { out.push({ p, st: LOAF_TWO[q++], loaf: true }); continue; }
        if (p.side === 'L' && iL < FRONT_L.length) { const k = iL++; out.push({ p, st: FRONT_L[k], front: true, named: true }); continue; }
        if (p.side !== 'L' && iR < FRONT_R.length) { const k = iR++; out.push({ p, st: FRONT_R[k], front: true, named: true }); continue; }
        if (j < BACK_TWO.length) out.push({ p, st: BACK_TWO[j++], front: false, named: false });
      }
      return out;
    }
    const out = [], fr = [...FRONT, ...BACK]; let i = 0, j = 0;
    for (const p of formation || []) {
      if (p.reserve) continue;   // запас — не на экране, встаёт на место павших (battleui.js)
      if (p.loaf && j < LOAF.length) out.push({ p, st: LOAF[j++], loaf: true });
      else if (i < fr.length) { const k = i++; out.push({ p, st: fr[k], front: k < FRONT.length, named: k < FRONT.length }); }   // 17.10: передние 20 — табличка в слое ников, задние — маленькая табличка у ног (battleui.js, miniTag)
    }
    return out;
  }
  const keep = () => [[150, 1010, 690], [960, 1640, 630]];

  window.QBattle = { foe, top, atk, css, ART, FRONT, BACK, LOAF, FOE, foeTerrain, layout, place, keep, two: () => TWO, crowd };
})();
