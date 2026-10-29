/* Общий генератор человечков Легиона — СКЕЛЕТ. Один на весь MultiDonate и игры «Ивент менеджера».
   Скелет решает, ЧТО нарисовать (по нику, по Костюмерной, по настроению, призрак, бой), и собирает слои.
   КАК нарисовать каждую деталь, решает СТИЛЬ: styles/<id>/characters.js (первый стиль — styles/legion).
   Сервер отдаёт по адресу /overlay/doodle.js этот файл + все стили + выбор активного стиля одним файлом.
   (public/overlay/doodle.js — прежний генератор целиком, запасной: сервер отдаёт его, только если сборка не удалась.)
   Подключение:
     • оверлей MultiDonate — /overlay/doodle.js (подключён в index.html), гардероб приходит через runtime;
     • игры StreamClass (file://) — <script src="http://localhost:3777/overlay/doodle.js">, гардероб — сам по /events.
   API (не менять — на нём держатся алерты, виджеты и игры):
     MDDoodle.jDoodle(seed, mood, uniform, extra, look), jhash, jrng, jpick, J_BODIES, jHats, BASE_HATS, CATALOG,
     auraArt, weaponArt, shieldArt, RARITY, setLooks, lookOf, seedFor, defaultsFor(ник, стиль?), setGhosts, isGhost, setGear, feed, connect, onLooks, looks.
   Стили: MDDoodle.addStyle(def), MDDoodle.use(id), MDDoodle.style (активный), MDDoodle.styles (все).
   Локации: MDDoodle.addLocation(стиль, локация, фабрика), MDDoodle.location(локация, env).
   Договор стиля — styles/README.md. */
(function () {
  'use strict';
  if (window.MDDoodle) return;
  const jrng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const jhash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const jpick = (r, arr) => arr[Math.floor(r() * arr.length)];

  // каталог для костюмерной и магазина: какие детали бывают (id общие для ВСЕХ стилей) и как называются
  const CATALOG = {
    shapes: [['bean', 'Фасолина'], ['box', 'Кубик'], ['ball', 'Шар'], ['tall', 'Высокий'], ['ghost', 'Призрак'], ['cone', 'Конус'], ['egg', 'Яйцо']],
    eyes: [['dots', 'Точки'], ['big', 'Большие'], ['happy', 'Довольные'], ['cyclops', 'Циклоп'], ['stars', 'Звёзды']],
    mouths: [['open', 'Открытый рот'], ['grin', 'Улыбка до ушей'], ['tongue', 'Язык']],
    hats: [['none', 'Без шапки'], ['tuft', 'Хохолок'], ['cap', 'Кепка'], ['bow', 'Бантик'], ['horns', 'Рожки'], ['crown', 'Корона'], ['tophat', 'Цилиндр'], ['party', 'Колпак'], ['wizard', 'Шляпа мага'], ['antenna', 'Антенна'], ['antenna2', 'Две антенны'], ['cat', 'Кошачьи ушки'], ['bunny', 'Заячьи уши'], ['halo', 'Нимб'], ['sprout', 'Росток'], ['bandana', 'Бандана'],
      ['legion', 'Шлем легионера'], ['laurel', 'Лавровый венок'], ['beret', 'Берет'], ['headphones', 'Наушники'], ['cowboy', 'Ковбойская шляпа'], ['chef', 'Колпак повара']],
    acc: [['bowtie', 'Бабочка'], ['tie', 'Галстук'], ['scarf', 'Шарф'], ['glasses', 'Очки'], ['shades', 'Тёмные очки'], ['monocle', 'Монокль'], ['mustache', 'Усы'], ['cape', 'Плащ'], ['pioneer', 'Плащ первопроходца']],   // pioneer — только наградой (19.10), не продаётся
    auras: [['gold', 'Золотая аура'], ['sparks', 'Искры'], ['halo', 'Нимб'], ['shadow', 'Тёмное пламя'], ['frost', 'Морозное сияние']],
    colors: [['#ff9fb2', 'Розовый'], ['#ffb27a', 'Персик'], ['#ffe27a', 'Лимон'], ['#9fe39a', 'Мята'], ['#7fd6e6', 'Бирюза'], ['#8fb6ff', 'Небо'], ['#b9a2ff', 'Лаванда'], ['#e6e6ee', 'Облако'], ['#ffc94d', 'Золото'], ['#5a5470', 'Графит']],
    // снаряжение (id из modules/legionary/items.json → look)
    weapons: ['sword', 'gladius', 'dagger', 'axe', 'club', 'mace', 'hammer', 'spear', 'pitchfork', 'bow', 'staff', 'crook', 'censer', 'kris', 'skullstaff', 'grimoire', 'holymace'],   // 20.10: + оружие новых классов
    shields: ['scutum', 'round', 'buckler', 'barrel'],
    armors: ['lorica', 'robe', 'leather', 'shroud', 'plate'],   // доспехи: лорика (физ. броня), мантия (маги и жрецы); 23.10: вещи классов — кожа разбойника, саван некроманта, латы паладина
    rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
  };

  // HW: «Ночь Тыквенной Луны» — детали ивента (только обменник конфет, баттл-пасс и ачивки; в обычные кабинки Шатра не попадают)
  const HW_LOOKS = {
    hats: [['pumpkin', 'Тыква-фонарь'], ['witch', 'Ведьмина шляпа'], ['batears', 'Уши нетопыря'], ['skull', 'Шлем-череп'], ['reaper', 'Капюшон жнеца'], ['scarehat', 'Шляпа пугала']],
    acc: [['fangs', 'Вампирские клыки'], ['vampcape', 'Плащ вампира'], ['candybag', 'Ведёрко-тыква'], ['bolts', 'Болты в шее'], ['cobweb', 'Паутина на плече']],
    eyes: [['jack', 'Глаза Джека'], ['void', 'Пустые глазницы']],
    auras: [['wisps', 'Блуждающие огоньки'], ['bats', 'Стая нетопырей'], ['jackglow', 'Тыквенный ореол'], ['haunt', 'Проклятый туман'], ['leaves', 'Осенний листопад']],
    colors: [['#ff8a1f', 'Тыквенный'], ['#9fffd0', 'Призрачный'], ['#7b3fe4', 'Ведьмин']],
  };
  for (const [k, list] of Object.entries(HW_LOOKS)) CATALOG[k] = CATALOG[k].concat(list);
  const HW_ID = (cat) => new Set(HW_LOOKS[cat].map(([id]) => id));
  const HW_HAT = HW_ID('hats'), HW_ACC = HW_ID('acc'), HW_EYE = HW_ID('eyes'), HW_AURA = HW_ID('auras');

  /* ---------- HW: рисунок деталей ивента — общий для всех стилей, по токенам стиля (st.hw = { line, ink, sw, face }) ----------
     Стиль может нарисовать своё: hats(k).pumpkin…, st.hwEyes(kind, k), st.hwAcc[id](k), aura(kind, k) — тогда берётся его рисунок.
     Холст 120×170, ноги на y = 168, центр x = 60. Анимации — только SMIL transform / opacity, без filter. */
  const f1h = (v) => Math.round(v * 10) / 10;
  const hwTok = (st) => Object.assign({ line: '#f5f2ff', ink: '#15122e', sw: 4, face: '#15122e' }, (st && st.hw) || {});
  function hwHats(k, T) {
    const b = k.b, t = b.square ? b.top - 5 : b.top, hw = b.hw, cx = 60, O = `stroke="${T.line}" stroke-width="${T.sw}" stroke-linejoin="round" stroke-linecap="round"`, I = `stroke="${T.ink}" stroke-width="2" stroke-linejoin="round"`;
    const pr = hw + 7, py = t - 6;
    const pumpkin = `<g class="jd-hw-hat"><path d="M${cx - 2} ${py - 15} q1 -9 7 -11" fill="none" stroke="#4e7a2e" stroke-width="5" stroke-linecap="round"/><path d="M${cx + 3} ${py - 17} q8 -6 14 -2 q-8 5 -14 2 z" fill="#6fae3a" ${I}/>`
      + `<ellipse cx="${cx}" cy="${py}" rx="${f1h(pr)}" ry="15" fill="#ff7a1a" ${O}/><path d="M${f1h(cx - pr * 0.45)} ${py - 13} q-5 13 0 27 M${cx} ${py - 15} v30 M${f1h(cx + pr * 0.45)} ${py - 13} q5 13 0 27" fill="none" stroke="#c4520e" stroke-width="2.4"/>`
      + `<path d="M${cx - 12} ${py - 2} l5 -7 l5 7 z M${cx + 2} ${py - 2} l5 -7 l5 7 z" fill="#ffd34d" ${I}/><path d="M${cx - 11} ${py + 5} q11 8 22 0 l-3 3 l-3 -2 l-3 3 l-3 -3 l-3 3 l-3 -2 z" fill="#ffd34d" ${I}/></g>`;
    const witch = `<g class="jd-hw-hat"><ellipse cx="${cx}" cy="${t + 5}" rx="${f1h(hw + 17)}" ry="7" fill="#3a2a5e" ${O}/>`
      + `<path d="M${f1h(cx - hw * 0.62)} ${t + 3} Q${cx - 4} ${t - 22} ${cx + 2} ${t - 40} Q${cx + 14} ${t - 46} ${cx + 22} ${t - 36} Q${cx + 12} ${t - 34} ${cx + 9} ${t - 26} Q${cx + 12} ${t - 10} ${f1h(cx + hw * 0.62)} ${t + 3} Z" fill="#5b3fa0" ${O}/>`
      + `<path d="M${f1h(cx - hw * 0.6)} ${t - 1} Q${cx} ${t - 6} ${f1h(cx + hw * 0.6)} ${t - 1}" fill="none" stroke="#ff8a1f" stroke-width="5"/><rect x="${cx - 4}" y="${t - 6}" width="8" height="7" rx="1.5" fill="#ffd34d" ${I}/></g>`;
    const ear = (sd) => { const x0 = cx + sd * hw * 0.35, x1 = cx + sd * (hw + 12); return `<path d="M${f1h(x0)} ${t + 6} L${f1h(x1)} ${t - 26} Q${f1h(x1 - sd * 4)} ${t - 14} ${f1h(x1 - sd * 10)} ${t - 13} Q${f1h(x1 - sd * 12)} ${t - 4} ${f1h(cx + sd * hw * 0.8)} ${t + 2} Z" fill="#3a2e4a" ${O}/><path d="M${f1h(x0 + sd * 3)} ${t + 2} L${f1h(x1 - sd * 3)} ${t - 18}" stroke="#ff8fa3" stroke-width="3" stroke-linecap="round"/>`; };
    const batears = `<g class="jd-hw-hat">${ear(-1)}${ear(1)}</g>`;
    const skull = `<g class="jd-hw-hat"><path d="M${f1h(cx - hw - 4)} ${t + 12} Q${f1h(cx - hw - 6)} ${t - 22} ${cx} ${t - 24} Q${f1h(cx + hw + 6)} ${t - 22} ${f1h(cx + hw + 4)} ${t + 12} Q${cx} ${t + 4} ${f1h(cx - hw - 4)} ${t + 12} Z" fill="#efe6d2" ${O}/>`
      + `<ellipse cx="${cx - 8}" cy="${t - 5}" rx="5.5" ry="6" fill="${T.ink}"/><ellipse cx="${cx + 8}" cy="${t - 5}" rx="5.5" ry="6" fill="${T.ink}"/><path d="M${cx - 2} ${t + 3} l2 -4 l2 4 z" fill="${T.ink}"/><path d="M${cx - 13} ${t - 17} q4 3 2 7" fill="none" stroke="#bdb2a0" stroke-width="2"/></g>`;
    const reaper = `<g class="jd-hw-hat"><path fill-rule="evenodd" d="M${f1h(cx - hw - 10)} ${b.eyeY + 22} Q${f1h(cx - hw - 12)} ${t - 26} ${cx + 4} ${t - 22} Q${f1h(cx + hw + 14)} ${t - 18} ${f1h(cx + hw + 10)} ${b.eyeY + 22} L${f1h(cx + hw - 1)} ${b.eyeY + 18} Q${f1h(cx + hw + 1)} ${t - 4} ${cx} ${t - 6} Q${f1h(cx - hw - 1)} ${t - 4} ${f1h(cx - hw + 1)} ${b.eyeY + 18} Z" fill="#2a2236" ${O}/>`
      + `<path d="M${cx + 4} ${t - 22} q10 -6 16 2" fill="none" stroke="#2a2236" stroke-width="6" stroke-linecap="round"/></g>`;
    const scarehat = `<g class="jd-hw-hat"><path d="M${f1h(cx - hw - 20)} ${t + 6} Q${cx} ${t - 6} ${f1h(cx + hw + 20)} ${t + 8} Q${cx} ${t + 14} ${f1h(cx - hw - 20)} ${t + 6} Z" fill="#d8b860" ${O}/>`
      + `<path d="M${f1h(cx - hw * 0.7)} ${t + 4} Q${cx - 6} ${t - 26} ${cx + 4} ${t - 24} Q${f1h(cx + hw * 0.8)} ${t - 20} ${f1h(cx + hw * 0.7)} ${t + 4} Z" fill="#c8a04a" ${O}/>`
      + `<rect x="${cx - 2}" y="${t - 16}" width="10" height="9" fill="#7b3fe4" ${I}/><path d="M${cx - 1} ${t - 14} l8 5 M${cx + 7} ${t - 14} l-8 5" stroke="#efe6d2" stroke-width="1.4"/>`
      + `<path d="M${f1h(cx - hw - 18)} ${t + 8} l-5 6 M${f1h(cx - hw - 12)} ${t + 9} l-2 7 M${f1h(cx + hw + 16)} ${t + 9} l4 7 M${f1h(cx + hw + 10)} ${t + 10} l1 7" stroke="#d8b860" stroke-width="2.6" stroke-linecap="round"/></g>`;
    return { pumpkin, witch, batears, skull, reaper, scarehat };
  }
  function hwEyes(kind, k, T) {
    const { ex, ey } = k;
    if (kind === 'jack') return [60 - ex, 60 + ex].map((x) => `<path d="M${x - 6} ${ey + 4} L${x} ${ey - 6} L${x + 6} ${ey + 4} Z" fill="#ffb347" stroke="${T.face}" stroke-width="2.2" stroke-linejoin="round"/><path d="M${x - 2} ${ey + 2} L${x} ${ey - 2} L${x + 2} ${ey + 2} Z" fill="#fff4c8"/>`).join('');
    if (kind === 'void') return [60 - ex, 60 + ex].map((x) => `<ellipse cx="${x}" cy="${ey}" rx="6" ry="7.4" fill="#0b0816"/><circle cx="${x + 1.5}" cy="${ey + 1}" r="1.5" fill="#9fffd0"/>`).join('');
    return '';
  }
  function hwAcc(id, k, T) {
    const b = k.b, O = `stroke="${T.line}" stroke-width="${Math.max(2.4, T.sw * 0.8)}" stroke-linejoin="round" stroke-linecap="round"`, I = `stroke="${T.ink}" stroke-width="1.8" stroke-linejoin="round"`;
    const my = k.my, sx = k.sx || { l: b.L + 6, r: b.R - 6 }, ay = b.armY;
    if (id === 'fangs') return { face: `<path d="M53 ${my + 1} l2.6 7 l2.6 -7 z M62 ${my + 1} l2.6 7 l2.6 -7 z" fill="#ffffff" ${I}/>` };
    if (id === 'bolts') return { neck: [b.L - 3, b.R + 3].map((x, i) => `<rect x="${x - (i ? 0 : 7)}" y="${ay - 8}" width="7" height="8" rx="1.5" fill="#9aa3ad" ${I}/><circle cx="${x + (i ? 8 : -9)}" cy="${ay - 4}" r="3.4" fill="#c8ccd3" ${I}/>`).join('') };
    if (id === 'cobweb') { const x0 = sx.l - 4, y0 = ay - 6; let w = ''; for (let a = 0; a < 5; a++) { const ang = (-10 + a * 25) * Math.PI / 180; w += `M${x0} ${y0} L${f1h(x0 + Math.cos(ang) * 26)} ${f1h(y0 + Math.sin(ang) * 26)} `; }
      for (const rr of [9, 17, 24]) { let d = ''; for (let a = 0; a < 5; a++) { const ang = (-10 + a * 25) * Math.PI / 180; d += `${a ? 'Q' + f1h(x0 + Math.cos(ang - 0.22) * rr * 0.86) + ' ' + f1h(y0 + Math.sin(ang - 0.22) * rr * 0.86) + ' ' : 'M'}${f1h(x0 + Math.cos(ang) * rr)} ${f1h(y0 + Math.sin(ang) * rr)} `; } w += d; }
      return { wear: `<path d="${w}" fill="none" stroke="#efe6ff" stroke-width="1.2" opacity=".9"/><g transform="translate(${x0 + 16} ${y0 + 18})"><circle r="3" fill="#1c1424"/><path d="M-4 -2 l-3 -2 M-4 1 l-3 1 M4 -2 l3 -2 M4 1 l3 1" stroke="#1c1424" stroke-width="1"/></g>` }; }
    if (id === 'candybag') { const x = sx.r + 10, y = ay + 30; return { front: `<g transform="translate(${x} ${y})"><path d="M-9 -12 Q0 -26 9 -12" fill="none" stroke="${T.ink}" stroke-width="2"/><path d="M-12 -10 Q-14 8 0 10 Q14 8 12 -10 Z" fill="#ff7a1a" ${O}/>`
      + `<path d="M-6 -4 l2 -4 l2 4 z M4 -4 l2 -4 l2 4 z M-5 3 q5 4 10 0" fill="#2a1a12"/><circle cx="-5" cy="-13" r="3" fill="#ff5a8a" ${I}/><circle cx="2" cy="-14" r="3" fill="#7fd6e6" ${I}/><circle cx="7" cy="-12" r="2.6" fill="#ffd34d" ${I}/></g>` }; }
    if (id === 'vampcape') { const t = ay - 10, L = b.L - 8, R = b.R + 8;
      const back = `<path d="M${L + 10} ${t} C${L - 8} ${t + 40} ${L - 12} 130 ${L - 6} 166 L${L + 8} 156 L${L + 18} 168 L60 158 L${R - 18} 168 L${R - 8} 156 L${R + 6} 166 C${R + 12} 130 ${R + 8} ${t + 40} ${R - 10} ${t} Z" fill="#1c1424" ${O}/>`
        + `<path d="M${L + 14} ${t + 4} C${L + 2} ${t + 40} ${L + 2} 130 ${L + 8} 150 L60 146 L${R - 8} 150 C${R - 2} 130 ${R - 2} ${t + 40} ${R - 14} ${t + 4} Z" fill="#b0182a" opacity=".85"/>`
        + `<path d="M${L + 6} ${t + 2} L${L - 6} ${t - 26} L${L + 22} ${t - 6} Z M${R - 6} ${t + 2} L${R + 6} ${t - 26} L${R - 22} ${t - 6} Z" fill="#1c1424" ${O}/>`;
      return { back, front: `<circle cx="${sx.l + 3}" cy="${ay - 2}" r="3.4" fill="#ffd34d" ${I}/><circle cx="${sx.r - 3}" cy="${ay - 2}" r="3.4" fill="#ffd34d" ${I}/><path d="M${sx.l + 3} ${ay - 2} Q60 ${ay + 6} ${sx.r - 3} ${ay - 2}" fill="none" stroke="#ffd34d" stroke-width="1.6"/>` }; }
    return null;
  }
  function hwAura(kind, k) {
    const b = k.b, seed = (k.seed >>> 0) || 1, d0 = (seed % 997) / 997 * 2, cx = 60, cy = (b.top + 168) / 2, rx = (b.R - b.L) / 2 + 30, ry = (168 - b.top) / 2 + 22;
    const orb = (i, n, col, r0, dur, rev) => { const a0 = i * 360 / n; return `<g><animateTransform attributeName="transform" type="rotate" values="${a0} ${cx} ${f1h(cy)};${a0 + (rev ? -360 : 360)} ${cx} ${f1h(cy)}" dur="${dur}s" begin="-${d0.toFixed(2)}s" repeatCount="indefinite"/><g transform="translate(${f1h(cx + rx)} ${f1h(cy)})">${r0}</g></g>`; };
    if (kind === 'wisps') { const w = (c) => `<circle r="7" fill="${c}" opacity=".35"/><circle r="3.6" fill="#eafff4"/>`;
      return { back: '', front: [0, 1, 2].map((i) => `<g transform="scale(1 ${f1h(ry / rx)})" style="transform-origin:${cx}px ${f1h(cy)}px">${orb(i, 3, '#6dffb0', w('#6dffb0'), 4.2)}</g>`).join('') }; }
    if (kind === 'bats') { const bat = `<path d="M0 0 q-5 -6 -11 -3 q3 1 2 5 q4 -2 5 1 q2 -3 4 -3 q2 0 4 3 q1 -3 5 -1 q-1 -4 2 -5 q-6 -3 -11 3 z" fill="#2a1f38" stroke="#efe6ff" stroke-width=".8"><animateTransform attributeName="transform" type="scale" values="1 1;1 .4;1 1" dur=".35s" repeatCount="indefinite"/></path>`;
      return { back: '', front: [0, 1].map((i) => `<g transform="scale(1 .45)" style="transform-origin:${cx}px ${f1h(b.top - 6)}px"><g transform="translate(0 ${f1h(b.top - 6 - cy)})">${orb(i, 2, '', bat, 3.4, i === 1)}</g></g>`).join('') }; }
    if (kind === 'jackglow') { const id = k.uid('jlHw'); let motes = ''; for (let i = 0; i < 5; i++) { const x = b.L - 6 + (i * 31 + seed) % (b.R - b.L + 12), dur = 2.2 + (i % 3) * 0.5, beg = ((i * 0.6 + d0) % dur).toFixed(2);
        motes += `<g opacity="0"><animateTransform attributeName="transform" type="translate" values="${x} 166;${x + (i % 2 ? 5 : -5)} 96" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><ellipse rx="3.4" ry="3" fill="#ff8a1f" stroke="#2a1a12" stroke-width=".8"/><path d="M0 -3 v-2" stroke="#4e7a2e" stroke-width="1.2"/></g>`; }
      return { back: `<defs><radialGradient id="${id}"><stop offset=".3" stop-color="#ffb347"/><stop offset=".65" stop-color="#ff7a1a" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${f1h(cy)}" rx="${f1h(rx + 10)}" ry="${f1h(ry + 10)}" fill="url(#${id})"><animate attributeName="opacity" values=".55;.95;.55" dur="2.4s" begin="-${d0.toFixed(2)}s" repeatCount="indefinite"/></ellipse>`, front: motes }; }
    if (kind === 'haunt') { let s = ''; for (let i = 0; i < 4; i++) { const x = b.L - 10 + i * (b.R - b.L + 20) / 3, dur = 3 + (i % 2), beg = ((i * 0.9 + d0) % dur).toFixed(2);
        s += `<g opacity="0"><animateTransform attributeName="transform" type="translate" values="${f1h(x)} 170;${f1h(x + (i % 2 ? 8 : -8))} ${f1h(b.top + 10)}" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.7;0" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><ellipse rx="14" ry="8" fill="#8a4dff" opacity=".55"/><ellipse rx="7" ry="4" fill="#c9a8ff" opacity=".7"/></g>`; }
      return { back: s, front: '' }; }
    if (kind === 'leaves') { let s = ''; const cols = ['#ff8a1f', '#d8bc3e', '#c4520e', '#a8452a']; for (let i = 0; i < 6; i++) { const x = b.L - 14 + (i * 23 + seed) % (b.R - b.L + 28), dur = 2.6 + (i % 3) * 0.6, beg = ((i * 0.7 + d0) % dur).toFixed(2);
        s += `<g opacity="0"><animateTransform attributeName="transform" type="translate" values="${x} ${f1h(b.top - 20)};${x + (i % 2 ? 14 : -14)} 166" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.8;1" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><path d="M0 -5 Q5 0 0 5 Q-5 0 0 -5 Z M0 -5 V5" fill="${cols[i % 4]}" stroke="#2a1a12" stroke-width=".8"><animateTransform attributeName="transform" type="rotate" values="0;180;360" dur="${(dur / 2).toFixed(1)}s" repeatCount="indefinite"/></path></g>`; }
      return { back: '', front: s }; }
    return null;
  }
  // HW: «облик духа» — весь отряд в Изнанке (решение 20.10): тот же человечек со своей косметикой, полупрозрачный, с призрачным хвостом и парит
  function hwSpirit(svgInner, k) {
    const fl = ((k.seed >>> 0) % 1000) / 1000 * 2.4, b = k.b;
    let hem = `M${b.L - 2} 150`; const n = 5, dx = (b.R - b.L + 4) / n; for (let i = 0; i < n; i++) hem += ` q${f1h(dx / 2)} ${i % 2 ? 14 : 22} ${f1h(dx)} 0`; hem += ` V178 H${b.L - 2} Z`;
    return `<g opacity=".84"><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="2.8s" begin="-${fl.toFixed(2)}s" repeatCount="indefinite"/>${svgInner}<path d="${hem}" fill="#9fffd0" opacity=".38"/><path d="M${b.L + 4} 160 q6 10 2 18 M${b.R - 6} 160 q-6 10 -2 18" fill="none" stroke="#eafff4" stroke-width="2" opacity=".6" stroke-linecap="round"/></g>`;
  }

  /* ---------- стили ---------- */
  const STYLES = {};
  // названия стиля (styles/<id>/names.json): looks — детали Костюмерной { shapes, eyes, mouths, hats, acc, auras, colors: { id: название } };
  // items и roles читает сервер «Легионера»
  const NAMES = {};
  function addNames(id, data) { if (id && data && typeof data === 'object') NAMES[id] = data; }
  const LOOK_KEYS = ['shapes', 'eyes', 'mouths', 'hats', 'acc', 'auras', 'colors'];
  // каталог с названиями выбранного стиля (если стиль их задал); id — общие
  function catalogNow() {
    const L = NAMES[ACTIVE] && NAMES[ACTIVE].looks;
    if (!L || typeof L !== 'object') return CATALOG;
    const out = Object.assign({}, CATALOG);
    for (const k of LOOK_KEYS) if (L[k] && typeof L[k] === 'object') out[k] = CATALOG[k].map(([id, n]) => [id, typeof L[k][id] === 'string' && L[k][id].trim() ? L[k][id].trim() : n]);
    return out;
  }
  let S = null;                 // активный стиль человечков
  let ACTIVE = 'legion';        // выбранный стиль целиком (человечки + локации); у стиля может не быть своих человечков
  const broken = new Set();     // стили, упавшие при рисовании (чтобы не спамить в консоль)
  function addStyle(def) {
    if (!def || !def.id) return;
    STYLES[def.id] = def;
    if (!S) S = def;
  }
  function use(id) {
    if (typeof id === 'string' && id) ACTIVE = id;
    S = STYLES[id] || STYLES.legion || S;
    return S ? S.id : null;
  }

  /* ---------- локации (Ярмарка, позже Поход): styles/<id>/<локация>.js ----------
     Файл локации вызывает MDDoodle.addLocation('<стиль>', '<локация>', (env) => ({ … })) — фабрика рисунка и разметки.
     Виджет локации берёт MDDoodle.location('<локация>', env): из выбранного стиля, а если там её нет или она с ошибкой — из «Легиона». */
  const LOCS = {};   // стиль → { локация → фабрика }
  const brokenLoc = new Set();
  function addLocation(styleId, locId, factory) {
    if (!styleId || !locId || typeof factory !== 'function') return;
    (LOCS[styleId] = LOCS[styleId] || {})[locId] = factory;
  }
  // проверочный прогон на отдельном экземпляре: рисунок и предметы собираются без ошибок
  function probeLoc(factory, env, locId) {
    const p = factory(env || {});
    if (!p || typeof p !== 'object') throw new Error('фабрика должна вернуть объект');
    if (locId === 'fair' && typeof p.scene !== 'function') throw new Error('у Ярмарки нет функции scene()');
    if (typeof p.scene === 'function') p.scene();
    (p.props || []).forEach((x) => x.svg());
  }
  function makeLoc(styleId, locId, env) {
    const f = LOCS[styleId] && LOCS[styleId][locId];
    if (!f) return null;
    try { probeLoc(f, env, locId); return f(env || {}); } catch (e) {
      const k = styleId + '/' + locId;
      if (!brokenLoc.has(k)) { brokenLoc.add(k); console.error(`[локации] ошибка в стиле «${styleId}», локация «${locId}» — беру «Легион»:`, e); }
      return null;
    }
  }
  function location(locId, env) {
    // 24.10 (решение стримера): данжи у всех стилей одинаковые — если у стиля и «Легиона» своего рисунка данжа нет, берём «Котиков»
    return makeLoc(ACTIVE, locId, env) || (ACTIVE !== 'legion' ? makeLoc('legion', locId, env) : null)
      || (locId === 'dungeon' && ACTIVE !== 'cats' ? makeLoc('cats', locId, env) : null);
  }
  // доспехи: у стиля функция armor(вид, редкость) необязательна — если её нет, рисуются доспехи «Легиона»
  function armorArt(kind, rar) {
    // 23.10: доспехи классов — рисунок ядра по токенам стиля, если стиль не рисует их сам (st.classArmor)
    if (CLASS_ARMOR.has(kind) && !(S && S.classArmor === true)) { try { return classArmorIcon(kind, rar, wearTok(S)); } catch (e) { return ''; } }
    const own = S && typeof S.armor === 'function' ? S : null, base = STYLES.legion;
    try { if (own) return own.armor(kind, rar); } catch (e) { if (!broken.has(S.id + ':armor')) { broken.add(S.id + ':armor'); console.error(`[человечки] доспехи стиля «${S.id}» с ошибкой, рисую доспехи «Легиона»:`, e); } }
    return base && typeof base.armor === 'function' ? base.armor(kind, rar) : '';
  }

  /* ---------- гардероб, призраки, снаряжение: всё — по НИКУ ----------
     18.10 (безопасность): карты приходят по нику в нижнем регистре, а не по jhash(ник). 32-битный хэш легко подобрать:
     зритель с подобранным ником показывался в чужом облике / с чужим оружием / призраком вместо другого (и наоборот).
     Хэш остаётся только зерном случайного вида «по нику» (совпадение там — просто два одинаковых человечка «по умолчанию»).
     Чей человечек, говорит seedFor(ник) — то же число-зерно, но с ником внутри — или extra.who. Голое число (jDoodle(jhash(ник)))
     — просто случайный вид без облика, призрака и оружия: по хэшу чужие данные больше не достаются (NPC тоже не «надевают» зрителя). */
  const keyOf = (who) => String(who == null ? '' : who).trim().replace(/^@/, '').toLowerCase();
  // число (как jhash) + ник: арифметика и сравнения через >>> 0 работают как раньше
  function seedFor(who) { const k = keyOf(who), s = Object(jhash(k)); s.who = k; return s; }
  const whoOf = (seed, extra) => (extra && extra.who != null ? keyOf(extra.who) : seed && typeof seed === 'object' && seed.who != null ? keyOf(seed.who) : null);
  // looks: { ник: { shape, color, color2, eyes, mouth, blush, hat, acc: [...], accColor } }
  // ghosts: { ник: до какого времени (мс) } — пока не воскрес, человечек везде рисуется призраком
  // gear (снаряжение, для боя и карточки героя): { ник: { w: вид оружия, wr: редкость, s: вид щита, sr: редкость,
  //   a: доспех lorica|robe, ar: редкость, am: материал heavy|light|cloth, h: шлем (вид шапки), hr, t: амулет (аура|plain), tr } } — см. gearOf
  let LOOKS = {}, GHOSTS = {}, GEAR = {};
  // запись карты для человечка — только по нику
  function entry(map, seed, extra) {
    const k = whoOf(seed, extra);
    return k && Object.prototype.hasOwnProperty.call(map, k) ? map[k] : undefined;
  }
  const isMap = (m) => (m && typeof m === 'object' && !Array.isArray(m) ? m : {});
  const listeners = [];
  function setLooks(map) { LOOKS = isMap(map); listeners.forEach((fn) => { try { fn(); } catch {} }); }
  const lookOf = (seed, who) => entry(LOOKS, seed, who != null ? { who } : null) || null;
  function setGhosts(map) { GHOSTS = isMap(map); listeners.forEach((fn) => { try { fn(); } catch {} }); }
  function setGear(map) { GEAR = isMap(map); }
  /* 19.10: звания зрителей (награды платформы; «Костюмерная» шлёт titles: { ник: оттенок }) — особый цвет ника в оверлее.
     Цвета светлые и спокойные: ник остаётся читаемым на тёмной обводке, просто чуть отличается от обычного. */
  let TITLES = {};
  const TITLE_COLORS = { pioneer: '#bfe3ff' };
  function setTitles(map) { TITLES = isMap(map); }
  const titleOf = (who) => { const k = keyOf(who); return k && Object.prototype.hasOwnProperty.call(TITLES, k) ? TITLES[k] : null; };
  const nickColor = (who, base) => { const t = titleOf(who); return (t && TITLE_COLORS[t]) || base || null; };
  const ghostT = (t) => !!t && (t === true || t > Date.now());
  const isGhost = (seed, who) => ghostT(entry(GHOSTS, seed, who != null ? { who } : null));

  // уникальные id для <defs> внутри SVG (градиенты, маски, фильтры): один счётчик на всю страницу
  let jUid = 0;
  const uid = (prefix) => prefix + (++jUid);

  /* 19.10: что человечек получает «по нику» — ОДНА функция и для рисунка (build), и для подписей на сайте (defaultsFor).
     ВАЖНО: порядок вызовов r() — часть внешности (см. ниже). sad: грустный не тянет рот и румянец — как было всегда. */
  function nickPicks(st, seed, sad) {
    const r = jrng(Number(seed) >>> 0);
    const { fill, c2 } = st.palette(r);
    const shape = jpick(r, Object.keys(st.bodies));
    const b = st.bodies[shape](r);
    const eyes = jpick(r, st.eyePool);
    const mouth = sad ? null : jpick(r, st.mouthPool);
    const blush = !sad && r() < st.blushChance;
    const hat = r() < st.hatNoneChance ? 'none' : jpick(r, st.hatPool);
    return { fill, c2, shape, b, eyes, mouth, blush, hat };
  }
  // названия глаз, которых нет в каталоге (стили тянут их «по нику», купить нельзя)
  const EXTRA_NAMES = { eyes: { sleepy: 'Сонные', wide: 'Широко раскрытые', slit: 'Кошачьи щёлочки', crazy: 'Безумные', mad: 'Злые', derp: 'Косые', lash: 'С ресничками', glam: 'Гламурные', heart: 'Сердечки', starg: 'Блёстки', sly: 'Хитрые' } };
  // цвет «по нику» часто не из каталога (hsl, окрас шерсти): называем по оттенку
  function hueName(c) {
    let h, sa, l, m = /^hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(String(c));
    if (m) { h = +m[1]; sa = +m[2]; l = +m[3]; } else {
      m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(c)); if (!m) return null;
      let x = m[1]; if (x.length === 3) x = x.replace(/./g, '$&$&');
      const R = parseInt(x.slice(0, 2), 16) / 255, G = parseInt(x.slice(2, 4), 16) / 255, B = parseInt(x.slice(4, 6), 16) / 255;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn; l = (mx + mn) * 50;
      sa = d ? d / (1 - Math.abs(2 * l / 100 - 1)) * 100 : 0;
      h = !d ? 0 : mx === R ? 60 * (((G - B) / d) % 6) : mx === G ? 60 * ((B - R) / d + 2) : 60 * ((R - G) / d + 4); if (h < 0) h += 360;
    }
    if (sa < 15) return l >= 85 ? 'Белый' : l <= 25 ? 'Чёрный' : l >= 65 ? 'Светло-серый' : l < 40 ? 'Тёмно-серый' : 'Серый';
    if (l <= 18) return 'Чёрный';
    if (h >= 15 && h < 45 && l < 50) return 'Коричневый';
    const n = h < 12 ? 'Красный' : h < 40 ? 'Оранжевый' : h < 50 ? 'Янтарный' : h < 66 ? 'Жёлтый' : h < 90 ? 'Салатовый' : h < 160 ? 'Зелёный' : h < 190 ? 'Бирюзовый' : h < 220 ? 'Голубой' : h < 250 ? 'Синий' : h < 280 ? 'Фиолетовый' : h < 310 ? 'Сиреневый' : h < 345 ? 'Розовый' : 'Красный';
    return l >= 80 ? 'Светло-' + n.toLowerCase() : n;
  }
  const lc = (v) => String(v).replace(/^#/, '').toLowerCase();
  /* 19.10: что зритель получает «по нику» в каждом поле гардероба — БЕЗ рисования (сайт: вкладка «Облик», первая кнопка).
     seed — seedFor(ник), ник или число; styleId — стиль (по умолчанию активный). → { поле: { v: значение, name: название } };
     v === null — «ничего» (аура, аксессуары). Значения те же, что рисует jDoodle (общая nickPicks). */
  function defaultsFor(seed, styleId) {
    if (typeof seed === 'string') seed = seedFor(seed);
    const id = styleId || ACTIVE;
    let st = STYLES[styleId] || S, P;
    try { P = nickPicks(st, seed, false); } catch (e) { st = STYLES.legion; P = nickPicks(st, seed, false); }   // как jDoodle: упал стиль — «Легион»
    const L = (NAMES[id] && NAMES[id].looks) || {};
    const nm = (cat, v) => {
      const own = L[cat] && (L[cat][v] || L[cat][String(v).toLowerCase()]);
      if (typeof own === 'string' && own.trim()) return own.trim();
      const f = (CATALOG[cat] || []).find(([k]) => lc(k) === lc(v)); if (f) return f[1];
      if (EXTRA_NAMES[cat] && EXTRA_NAMES[cat][v]) return EXTRA_NAMES[cat][v];
      if (cat === 'colors') { const cn = st.colorNames && Object.keys(st.colorNames).find((k) => lc(k) === lc(v)); return cn ? st.colorNames[cn] : hueName(v) || 'Свой цвет'; }
      return String(v);
    };
    // «свой» цвет стиля (овощи: маркер → природный цвет овоща)
    const fill = typeof st.autoColor === 'function' ? st.autoColor(P.fill, P.b) : P.fill;
    const col = (v) => ({ v, name: nm('colors', v) });
    return {
      shape: { v: P.shape, name: nm('shapes', P.shape) },
      color: col(fill), color2: col(P.c2),
      eyes: { v: P.eyes, name: nm('eyes', P.eyes) },
      mouth: { v: P.mouth, name: nm('mouths', P.mouth) },
      blush: { v: P.blush, name: P.blush ? 'Есть' : 'Нет' },
      hat: { v: P.hat, name: nm('hats', P.hat) },
      aura: { v: null, name: 'Без ауры' },
      acc: { v: null, name: 'Без аксессуаров' },
      accColor: col(P.c2),   // аксессуары красятся вторым цветом
      capeColor: col(st.capeColor || '#c0182b'),
    };
  }

  /* 19.10: без двойных кнопок в «Облике»: купленное, совпадающее с тем, что даёт ник (например, «Без шапки» у ника без шапки),
     показывается одной кнопкой «по нику». lookChoices(поле, купленное, defaultsFor(...)[поле]) → купленное без совпадающих. */
  const normLook = (v) => String(v == null ? '' : v).trim().replace(/^#/, '').replace(/\s+/g, ' ').toLowerCase();
  function sameLook(field, a, b) {
    if (field === 'acc') { const none = (x) => x == null || x === '' || normLook(x) === 'none' || (Array.isArray(x) && !x.length); if (none(a) || none(b)) return none(a) && none(b); }
    if (field === 'blush') return a != null && b != null && String(a) === String(b);
    if (a == null || b == null) return a == null && b == null;
    return normLook(a) === normLook(b);
  }
  function lookChoices(field, owned, def) {
    const dv = def && typeof def === 'object' && 'v' in def ? def.v : def;
    return (Array.isArray(owned) ? owned : []).filter((v) => !sameLook(field, v, dv));
  }

  /* ---------- 19.10: боевое снаряжение на человечке (доспех, шлем, амулет) ----------
     Правило показа: в бою (extra.kit === 'battle'; без kit — боевая стойка armed) — шлем вместо шапки, доспех, амулет;
     в мирных местах (kit 'peace' или обычные виджеты) — косметика: своя шапка из облика (или по нику); шлема нет никогда.
     Рисунок доспеха/амулета собирается один раз на вид+редкость+форму тела (кэш строк SVG): толпа из 100+ не пересобирает его. */
  // что из надетого видно (то же, что modules/legionary/gear.js на сервере): items — надетые вещи [{ slot, rarity, gear, id, look }]
  function gearOf(items) {
    const g = {}, L = Array.isArray(items) ? items : [], on = (sl) => L.find((x) => x && x.slot === sl && x.on !== false), rar = (x) => (x && x.rarity) || 'common';
    const w = on('weapon'), s = on('shield'), a = on('armor'), h = on('helmet'), t = on('trinket');
    if (w && w.look && w.look.weapon) { g.w = w.look.weapon; g.wr = rar(w); }
    if (s && s.look && s.look.shield) { g.s = s.look.shield; g.sr = rar(s); }
    if (a) { const k = a.look && CATALOG.armors.includes(a.look.armor) ? a.look.armor : a.gear === 'cloth' || a.id === 'robe' ? 'robe' : 'lorica'; g.a = k; g.ar = rar(a); g.am = ['heavy', 'light', 'cloth'].includes(a.gear) ? a.gear : k === 'robe' ? 'cloth' : 'heavy'; }
    if (h && h.look && h.look.hat) { g.h = h.look.hat; g.hr = rar(h); }
    if (t) { g.t = (t.look && t.look.aura) || 'plain'; g.tr = rar(t); if (t.look && t.look.charm) g.tc = t.look.charm; }   // 23.10: подвеска амулета класса
    return g;
  }
  const W_RAR = { common: null, uncommon: '#4cc95a', rare: '#4aa3ff', epic: '#b06bff', legendary: '#ffb83d' };   // кайма/камень по редкости
  const W_METAL = { common: '#aab2b8', uncommon: '#b9c8b6', rare: '#a9c2da', epic: '#c0b0e0', legendary: '#f2c75c' };   // металл доспеха
  const W_CLOTH = { common: '#8a7a62', uncommon: '#3f6fb0', rare: '#2f58a8', epic: '#5a2fa8', legendary: '#7a1f3a' };   // ткань мантии
  const W_GEM = { gold: '#ffd76a', sparks: '#fff0a8', halo: '#ffe27a', shadow: '#a24bff', frost: '#8fd4ff', plain: '#d9a441' };
  const wornCache = new Map();
  let wornN = 0;   // 20.10: свой id обрезки у КАЖДОГО рисунка: общий id ломал доспех на части телефонов (вкладка «Легион» — «прямоугольник» вместо доспеха)
  const wornKey = (...a) => a.join('|');
  // доспех поверх тела: обрезан по контуру тела (clipPath), сверху — снова контур тела. Стиль может нарисовать свой: st.wornArmor(k, gear)
  function wornArmor(st, k, g) {
    const b = k.b; if (!b || !b.d) return '';
    if (typeof st.wornArmor === 'function') { try { const own = st.wornArmor(k, g); if (typeof own === 'string') return own; } catch (e) {} }
    const W = st.wear || {}, line = W.line || '#f5f2ff', ink = W.ink || '#15122e';
    const y0 = Math.round(k.my + 12), key = wornKey(st.id, g.a, g.ar, g.am, b.d, y0, k.sx.l, k.sx.r, b.armY);
    let out = wornCache.get(key);
    if (out === undefined) {
      const id = 'jdW' + jhash(key).toString(36), rc = W_RAR[g.ar] || null, L = k.L, R = k.R;
      let inner = '', top = '';
      if (CLASS_ARMOR.has(g.a)) { const c = classWorn(g, k, y0, { line, ink }); inner = c.inner; top = c.top; }   // 23.10: доспехи классов
      else if (g.a === 'robe') {
        const cl = W_CLOTH[g.ar] || W_CLOTH.common, tr = rc || '#c9b28a';
        inner = `<rect x="0" y="${y0}" width="120" height="${170 - y0}" fill="${cl}"/>`
          + `<path d="M${L} ${y0} Q60 ${y0 + 12} ${R} ${y0}" fill="none" stroke="${tr}" stroke-width="5"/>`
          + `<path d="M60 ${y0 + 6} V170" stroke="${tr}" stroke-width="4"/><path d="M0 162 H120" stroke="${tr}" stroke-width="5"/>`
          + `<path d="M${L} ${y0 + 34} Q60 ${y0 + 42} ${R} ${y0 + 34}" fill="none" stroke="${ink}" stroke-width="3" opacity=".35"/>`;
      } else if (g.am === 'light') {
        const lt = '#9a6a3e', tr = rc || '#6b4423', y1 = Math.min(160, y0 + 50);
        inner = `<rect x="0" y="${y0}" width="120" height="${y1 - y0}" fill="${lt}"/>`
          + `<path d="M0 ${y0} H120" stroke="${tr}" stroke-width="6"/><path d="M0 ${y1} H120" stroke="${ink}" stroke-width="3" opacity=".5"/>`
          + `<path d="M${L + 6} ${y0 + 4} L${R - 10} ${y1 - 4}" stroke="${ink}" stroke-width="4" opacity=".45"/>`
          + `<path d="M${L} ${y0 + 20} H${R} M${L} ${y0 + 34} H${R}" stroke="#e8d2a8" stroke-width="1.6" stroke-dasharray="3 3" opacity=".8"/>`;
      } else {   // лорика: пластины, пояс, ремни снизу
        const m = W_METAL[g.ar] || W_METAL.common, tr = rc || '#8a6a4a', y1 = Math.min(158, y0 + 48);
        // полосы пластин и ремешки — по одному пути на всё (меньше разметки на толпу из 100+)
        let bands = '', strips = '';
        for (let y = y0 + 9; y < y1 - 4; y += 9) bands += `M0 ${y}H120`;
        for (let x = L + 8; x < R - 4; x += 9) strips += `M${x} ${y1 + 5}v8`;
        inner = `<rect x="0" y="${y0}" width="120" height="${y1 - y0}" fill="${m}"/>${bands ? `<path d="${bands}" stroke="${ink}" stroke-width="2" opacity=".4"/>` : ''}<path d="M0 ${y0}H120" stroke="${tr}" stroke-width="5"/>`
          + `<path d="M0 ${y1 + 0.5}H120" stroke="${tr}" stroke-width="7"/>${strips ? `<path d="${strips}" stroke="#7a5232" stroke-width="6" stroke-linecap="round"/>` : ''}`;
        const pad = (x, s) => `<path d="M${x - 11 * s} ${b.armY - 3} Q${x} ${b.armY - 13} ${x + 11 * s} ${b.armY - 3} L${x + 9 * s} ${b.armY + 7} Q${x} ${b.armY + 1} ${x - 9 * s} ${b.armY + 7} Z" fill="${m}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>`;
        top = pad(k.sx.l + 3, 1) + pad(k.sx.r - 3, 1);   // наплечники — поверх плеч (руки рисуются раньше тела)
      }
      out = `<defs><clipPath id="${id}@@"><path d="${b.d}"/></clipPath></defs><g class="jd-armor" clip-path="url(#${id}@@)">${inner}</g><path class="body" fill="none" d="${b.d}"/>${top}`;
      if (wornCache.size > 2000) wornCache.clear();
      wornCache.set(key, out);
    }
    const u = '_' + (++wornN).toString(36); if (wornN > 1e9) wornN = 0;
    return out.replace(/@@/g, u);
  }
  // амулет на шнурке под ртом: камень цвета его ауры, у редких — кайма по редкости
  function wornAmulet(st, k, g) {
    const W = st.wear || {}, ink = W.ink || '#15122e', y = Math.round(k.my + 12), key = wornKey('am', st.id, g.t, g.tr, g.tc || '', y, k.L, k.R);
    let out = wornCache.get(key);
    if (out === undefined) {
      const gem = W_GEM[g.t] || W_GEM.plain, rc = W_RAR[g.tr], cy = y + 15, hw = Math.min(16, (k.R - k.L) / 2 - 6);
      out = `<g class="jd-amulet"><path d="M${60 - hw} ${y} Q60 ${y + 16} ${60 + hw} ${y}" fill="none" stroke="#d9b45a" stroke-width="2"/>`
        + (rc ? `<circle cx="60" cy="${cy}" r="7" fill="none" stroke="${rc}" stroke-width="2.5"/>` : '')
        + (g.tc && CLASS_CHARM.has(g.tc) ? `<g transform="translate(60 ${cy + 1})">${charmPendant(g.tc, g.tr, ink)}</g>`
          : `<path d="M60 ${cy - 5.5} L65 ${cy} L60 ${cy + 5.5} L55 ${cy} Z" fill="${gem}" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>`) + '</g>';
      wornCache.set(key, out);
    }
    return out;
  }

  /* ---------- 23.10: вещи новых классов (Разбойник, Некромант, Паладин) — рисует ЯДРО для всех стилей, как детали Хэллоуина ----------
     Параметрически, по токенам стиля (st.wear: line/ink; st.hw) и редкости — не 7 стилей × N картинок. Стиль может нарисовать своё:
     доспех — st.wornArmor (на теле) и st.armor с флагом st.classArmor = true (значок); шлем — свой ключ в st.hats(k).
     Доспехи: leather — кожа разбойника (ремни, ножны, пряжки), shroud — саван некроманта (рёбра, кости, рваный подол),
     plate — латы паладина (белое с золотом, знак солнца, большие наплечники). Шлемы: rhood/rmask — капюшон и капюшон с платком,
     nhood/ncrown — капюшон с черепом и костяной венец, phelm/pwing — белый шлем с крестом и крылатый шлем с нимбом.
     Подвески амулетов классов (look.charm) — charmPendant: на человечке и значком в сумке/лавке (charmArt). */
  const CLASS_ARMOR = new Set(['leather', 'shroud', 'plate']);
  const CLASS_HAT = new Set(['rhood', 'rmask', 'nhood', 'ncrown', 'phelm', 'pwing']);
  const CLASS_CHARM = new Set(['lockpick', 'vial', 'cateye', 'bone', 'souljar', 'phylactery', 'ladanka', 'sun', 'dawn']);
  const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const rk = (r) => RANK[r] || 0;
  const LEATHER = ['#7a5436', '#5a3f2c', '#3a2c26', '#2a2230', '#221a26'];   // кожа темнеет с редкостью
  const SHROUD = ['#5f5a68', '#33403a', '#2a2a44', '#2b1a40', '#1e1024'];    // серый саван → тёмно-зелёный → синий → фиолетовый → чёрный
  const PLATE = ['#c4cad3', '#dde3eb', '#eaeef4', '#f4f6fa', '#fff8ea'];     // сталь светлеет до белого
  const BONE = '#ebe2c9', GOLD = '#e8b923', GLOW = ['#7dff9a', '#7dff9a', '#7dff9a', '#7dff9a', '#d38bff'];
  const wearTok = (st) => { const W = (st && st.wear) || {}; return { line: W.line || '#f5f2ff', ink: W.ink || '#15122e' }; };
  // солнце-знак: круг и лучи (x, y — центр)
  const sunMark = (x, y, r, col, ink) => { let rays = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); rays += `M${f1h(x + c * (r + 1.6))} ${f1h(y + s * (r + 1.6))}L${f1h(x + c * (r + 4.6))} ${f1h(y + s * (r + 4.6))}`; }
    return `<path d="${rays}" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${ink}" stroke-width="1.5"/>`; };
  const skullMark = (x, y, r, ink, eye) => `<circle cx="${x}" cy="${f1h(y - r * 0.15)}" r="${r}" fill="${BONE}" stroke="${ink}" stroke-width="1.4"/><rect x="${f1h(x - r * 0.55)}" y="${f1h(y + r * 0.45)}" width="${f1h(r * 1.1)}" height="${f1h(r * 0.6)}" rx="1" fill="${BONE}" stroke="${ink}" stroke-width="1.2"/>`
    + `<circle cx="${f1h(x - r * 0.38)}" cy="${f1h(y - r * 0.15)}" r="${f1h(r * 0.27)}" fill="${eye || ink}"/><circle cx="${f1h(x + r * 0.38)}" cy="${f1h(y - r * 0.15)}" r="${f1h(r * 0.27)}" fill="${eye || ink}"/>`;
  // доспех класса на теле: { inner — обрезается по телу, top — поверх плеч }
  function classWorn(g, k, y0, W) {
    const b = k.b, L = k.L, R = k.R, n = rk(g.ar), rc = W_RAR[g.ar] || null, ink = W.ink, line = W.line, sx = k.sx || { l: L + 6, r: R - 6 };
    let inner = '', top = '';
    if (g.a === 'leather') {
      const lt = LEATHER[n], dk = '#1e140e', bk = rc || '#c9a24a', y1 = Math.min(160, y0 + 52), yb = Math.min(y1 - 6, y0 + 34);
      inner = `<rect x="0" y="${y0}" width="120" height="${y1 - y0}" fill="${lt}"/><path d="M0 ${y0}H120" stroke="${dk}" stroke-width="5"/>`
        + `<path d="M0 ${y0 + 14}H120M0 ${yb + 9}H120" stroke="#b08a5e" stroke-width="1.4" stroke-dasharray="3 3" opacity=".75"/>`
        + `<path d="M${L + 4} ${y0 + 2}L${R - 6} ${y1 - 4}" stroke="${dk}" stroke-width="7"/>`   // перевязь через грудь
        + [0.25, 0.5].map((f) => { const x = f1h(L + 4 + (R - L - 10) * f), y = f1h(y0 + 2 + (y1 - y0 - 6) * f); return `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#8a6a44" stroke="${ink}" stroke-width="1.2" transform="rotate(35 ${x} ${y})"/>`; }).join('')
        + `<path d="M0 ${yb}H120" stroke="${dk}" stroke-width="6"/><rect x="55" y="${yb - 4}" width="10" height="8" rx="1.5" fill="none" stroke="${bk}" stroke-width="2.4"/>`
        + `<rect x="${L + 7}" y="${yb + 3}" width="11" height="9" rx="2" fill="#5a3d28" stroke="${ink}" stroke-width="1.4"/>`
        + (n >= 2 ? `<path d="M${R - 13} ${yb - 12}V${yb + 6}" stroke="#c9d0d6" stroke-width="3"/><path d="M${R - 17} ${yb - 5}H${R - 9}" stroke="${bk}" stroke-width="3"/>` : '')
        + (n >= 3 ? `<path d="M${L} ${y0}L${L + 12} ${y1}M${R} ${y0}L${R - 12} ${y1}" stroke="#120c10" stroke-width="10" opacity=".55"/>` : '')
        + `<path d="M0 ${y1}H120" stroke="${ink}" stroke-width="3" opacity=".5"/>`;
      if (n >= 2) { const pad = (x, s) => `<path d="M${x - 9 * s} ${b.armY - 2} Q${x} ${b.armY - 10} ${x + 9 * s} ${b.armY - 2} L${x + 7 * s} ${b.armY + 6} Q${x} ${b.armY + 1} ${x - 7 * s} ${b.armY + 6} Z" fill="${lt}" stroke="${rc || line}" stroke-width="2.3" stroke-linejoin="round"/>`; top = pad(sx.l + 3, 1) + pad(sx.r - 3, 1); }
    } else if (g.a === 'shroud') {
      const cl = SHROUD[n], tr = rc || BONE, gl = GLOW[n];
      let hem = 'M0 170V160'; for (let x = 0; x < 120; x += 8) hem += `L${x + 4} ${x % 16 ? 167 : 156}L${x + 8} 160`; hem += 'V170Z';
      let ribs = ''; const nr = 2 + Math.min(2, n);
      for (let i = 0; i < nr; i++) { const y = y0 + 12 + i * 7, w = 13 - i * 1.6; ribs += `M60 ${y}Q${f1h(60 - w)} ${y - 3} ${f1h(60 - w - 4)} ${y + 4}M60 ${y}Q${f1h(60 + w)} ${y - 3} ${f1h(60 + w + 4)} ${y + 4}`; }
      inner = `<rect x="0" y="${y0}" width="120" height="${170 - y0}" fill="${cl}"/>`
        + (n === 0 ? `<path d="M${L} ${y0 + 10}L${R} ${y0 + 34}M${L} ${y0 + 30}L${R} ${y0 + 54}M${R} ${y0 + 12}L${L} ${y0 + 40}" stroke="#8d8798" stroke-width="2" opacity=".6"/>`
          : `<path d="M60 ${y0 + 7}V${y0 + 14 + nr * 7}" stroke="${BONE}" stroke-width="3"/><path d="${ribs}" fill="none" stroke="${BONE}" stroke-width="2.6" stroke-linecap="round"/>`)
        + `<path d="M${L} ${y0}Q60 ${y0 + 12} ${R} ${y0}" fill="none" stroke="${tr}" stroke-width="5"/>`
        + `<path d="M${L} ${y0 + 50}Q60 ${y0 + 56} ${R} ${y0 + 50}" fill="none" stroke="#4a3f55" stroke-width="3"/>`
        + `<path d="${hem}" fill="${n >= 3 ? '#120a16' : BONE}" opacity="${n >= 3 ? 0.9 : 0.75}"/>`
        + (n >= 3 ? [[L + 8, y0 + 40], [R - 9, y0 + 30], [L + 14, 140], [R - 15, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="${gl}"/>`).join('') : '');
      if (n >= 2) { const spikes = (x, s) => `<path d="M${x - 8 * s} ${b.armY + 2}L${x - 6 * s} ${b.armY - 10}L${x - 2 * s} ${b.armY}L${x + 1 * s} ${b.armY - 12}L${x + 4 * s} ${b.armY}L${x + 8 * s} ${b.armY - 8}L${x + 9 * s} ${b.armY + 3}Z" fill="${BONE}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
        top = spikes(sx.l + 2, 1) + spikes(sx.r - 2, -1) + (n >= 3 ? skullMark(sx.l + 2, b.armY + 4, 5, ink, gl) + skullMark(sx.r - 2, b.armY + 4, 5, ink, gl) : ''); }
    } else {   // plate
      const m = PLATE[n], gd = n ? GOLD : '#b89a52', y1 = Math.min(156, y0 + 46);
      inner = `<rect x="0" y="${y0}" width="120" height="${y1 - y0}" fill="${m}"/>`
        + `<path d="M${L + 6} ${y0 + 6}Q60 ${y0 + 18} ${R - 6} ${y0 + 6}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".7"/>`
        + `<path d="M0 ${y0 + 30}H120M0 ${y0 + 38}H120" stroke="#8a93a0" stroke-width="1.6" opacity=".55"/>`
        + `<path d="M0 ${y0}H120" stroke="${gd}" stroke-width="5"/>`
        + (n >= 1 ? sunMark(60, y0 + 17, 5, gd, ink) : `<path d="M60 ${y0 + 9}V${y0 + 25}M53 ${y0 + 15}H67" stroke="${gd}" stroke-width="3"/>`)
        + `<rect x="51" y="${y1}" width="18" height="${170 - y1}" fill="#f4efe2"/><path d="M51 ${y1}V170M69 ${y1}V170" stroke="${rc || gd}" stroke-width="2.4"/>`
        + `<path d="M0 ${y1}H120" stroke="${gd}" stroke-width="6"/>`;
      const pad = (x, s) => `<path d="M${x - 13 * s} ${b.armY - 2} Q${x} ${b.armY - 16} ${x + 13 * s} ${b.armY - 2} L${x + 11 * s} ${b.armY + 9} Q${x} ${b.armY + 2} ${x - 11 * s} ${b.armY + 9} Z" fill="${m}" stroke="${gd}" stroke-width="2.6" stroke-linejoin="round"/>`
        + (n >= 3 ? `<circle cx="${x}" cy="${b.armY - 4}" r="2.4" fill="${gd}" stroke="${ink}" stroke-width="1"/>` : '');
      top = pad(sx.l + 3, 1) + pad(sx.r - 3, 1);
    }
    return { inner, top };
  }
  // значок доспеха класса (Кузня, сумка, лавка): низ на y = 0, центр x = 0, высота ~100 — как st.armor
  function classArmorIcon(kind, rar, W) {
    const n = rk(rar), rc = W_RAR[rar] || null, ink = W.ink === W.line ? '#2a2236' : W.ink, O = (w) => `stroke="${W.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    if (kind === 'leather') {
      const lt = LEATHER[n], dk = '#1e140e', bk = rc || '#c9a24a';
      return `<path d="M-30 -96 C-34 -70 -31 -44 -27 -20 H27 C31 -44 34 -70 30 -96 Q0 -86 -30 -96 Z" fill="${lt}" ${O(4)}/>`
        + `<path d="M-26 -92 L22 -24" stroke="${dk}" stroke-width="8"/><path d="M-28 -46 H28" stroke="${dk}" stroke-width="7"/><rect x="-6" y="-51" width="12" height="10" rx="2" fill="none" stroke="${bk}" stroke-width="3"/>`
        + `<path d="M-24 -76 H24 M-24 -32 H24" stroke="#b08a5e" stroke-width="1.6" stroke-dasharray="3 3" opacity=".8"/><rect x="-24" y="-40" width="11" height="10" rx="2" fill="#5a3d28" stroke="${ink}" stroke-width="1.5"/>`
        + (n >= 2 ? `<path d="M-32 -96 Q-36 -114 0 -114 Q36 -114 32 -96 Q0 -86 -32 -96 Z" fill="${dk}" ${O(3)}/>` : '')
        + (n >= 2 ? `<path d="M18 -60 V-36" stroke="#c9d0d6" stroke-width="4"/><path d="M13 -52 H23" stroke="${bk}" stroke-width="3.4"/>` : '');
    }
    if (kind === 'shroud') {
      const cl = SHROUD[n], tr = rc || BONE, gl = GLOW[n];
      let hem = 'M-42 0'; for (let x = -42; x < 42; x += 7) hem += `L${x + 3.5} ${x % 14 ? -8 : 2}L${x + 7} -2`;
      let ribs = ''; for (let i = 0; i < 2 + Math.min(2, n); i++) { const y = -84 + i * 9, w = 14 - i * 2; ribs += `M0 ${y}Q${-w} ${y - 3} ${-w - 5} ${y + 5}M0 ${y}Q${w} ${y - 3} ${w + 5} ${y + 5}`; }
      return `<path d="M-22 -102 C-30 -70 -38 -30 -42 0 ${hem.slice(6)} L42 -2 C38 -30 30 -70 22 -102 Q0 -92 -22 -102 Z" fill="${cl}" ${O(4)}/>`
        + `<path d="M-20 -100 Q0 -88 20 -100" fill="none" stroke="${tr}" stroke-width="4"/>`
        + (n ? `<path d="M0 -90 V${-84 + (2 + Math.min(2, n)) * 9}" stroke="${BONE}" stroke-width="3.4"/><path d="${ribs}" fill="none" stroke="${BONE}" stroke-width="3" stroke-linecap="round"/>` : `<path d="M-26 -80 L26 -50 M-30 -50 L30 -20" stroke="#8d8798" stroke-width="2.4" opacity=".7"/>`)
        + (n >= 2 ? `<path d="M-24 -100 L-30 -116 L-18 -103 L-14 -118 L-10 -100 Z M24 -100 L30 -116 L18 -103 L14 -118 L10 -100 Z" fill="${BONE}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>` : '')
        + (n >= 3 ? `<circle cx="-18" cy="-40" r="2.4" fill="${gl}"/><circle cx="16" cy="-24" r="2.4" fill="${gl}"/><circle cx="-6" cy="-14" r="2" fill="${gl}"/>` : '');
    }
    const m = PLATE[n], gd = n ? GOLD : '#b89a52';   // plate
    return `<rect x="-9" y="-24" width="18" height="24" fill="#f4efe2" ${O(3)}/><path d="M-9 -24 V0 M9 -24 V0" stroke="${rc || gd}" stroke-width="2.6"/>`
      + `<path d="M-32 -96 C-36 -70 -32 -44 -26 -24 H26 C32 -44 36 -70 32 -96 Q0 -86 -32 -96 Z" fill="${m}" ${O(4)}/>`
      + `<path d="M-30 -94 Q0 -84 30 -94" fill="none" stroke="${gd}" stroke-width="4"/><path d="M-27 -26 H27" stroke="${gd}" stroke-width="5"/>`
      + (n >= 1 ? sunMark(0, -66, 7, gd, ink) : `<path d="M0 -78 V-54 M-9 -68 H9" stroke="${gd}" stroke-width="4"/>`)
      + `<path d="M-46 -96 Q-34 -114 -12 -102 L-15 -82 Q-34 -86 -46 -76 Z M46 -96 Q34 -114 12 -102 L15 -82 Q34 -86 46 -76 Z" fill="${m}" stroke="${gd}" stroke-width="3" stroke-linejoin="round"/>`;
  }
  // шлем класса на голове: k.b (top, hw, square, eyeY) — того же вида, что у шапок стиля; T — токены (line, ink)
  function classHat(id, k, T, rar) {
    const b = k.b, t = b.square ? b.top - 5 : b.top, hw = b.hw, ey = b.eyeY, cx = 60, n = rk(rar), rc = W_RAR[rar] || null;
    const O = (w) => `stroke="${T.line}" stroke-width="${w || T.sw || 4}" stroke-linejoin="round" stroke-linecap="round"`, I = (w) => `stroke="${T.ink}" stroke-width="${w}" stroke-linejoin="round"`;
    const hood = (col, tip) => `<path d="M${f1h(cx - hw - 8)} ${ey + 14} Q${f1h(cx - hw - 10)} ${t - 18} ${cx + 2} ${t - tip} Q${f1h(cx + hw + 12)} ${t - 16} ${f1h(cx + hw + 8)} ${ey + 14} L${f1h(cx + hw - 1)} ${ey + 10} Q${f1h(cx + hw + 1)} ${t - 2} ${cx} ${t - 4} Q${f1h(cx - hw - 1)} ${t - 2} ${f1h(cx - hw + 1)} ${ey + 10} Z" fill="${col}" ${O()}/>`;
    const rim = (col) => `<path d="M${f1h(cx - hw + 1)} ${ey + 9} Q${f1h(cx - hw - 1)} ${t - 1} ${cx} ${t - 3} Q${f1h(cx + hw + 1)} ${t - 1} ${f1h(cx + hw - 1)} ${ey + 9}" fill="none" stroke="${col}" stroke-width="2"/>`;
    if (id === 'rhood' || id === 'rmask') {
      const hc = ['#5a4e44', '#3e3530', '#2e2a2c', '#241f2c', '#1d1824'][n];
      let s = hood(hc, 22) + `<path d="M${cx + 2} ${t - 22} q12 -3 16 7" fill="none" stroke="${hc}" stroke-width="6" stroke-linecap="round"/>` + rim(rc || '#8a7460');
      if (id === 'rmask') { const mc = ['#6a2a2a', '#7a2a2a', '#1c1a22', '#d8d2c6', '#2a1f38'][n];
        s += `<path d="M${f1h(cx - hw - 3)} ${ey + 8} Q${cx} ${ey + 4} ${f1h(cx + hw + 3)} ${ey + 8} L${f1h(cx + hw)} ${ey + 22} Q${cx} ${ey + 30} ${f1h(cx - hw)} ${ey + 22} Z" fill="${mc}" ${O(2.6)}/>`
          + (n >= 4 ? `<path d="M${f1h(cx - hw - 2)} ${ey + 9} Q${cx} ${ey + 5} ${f1h(cx + hw + 2)} ${ey + 9}" fill="none" stroke="${GOLD}" stroke-width="2"/>` : '')
          + (n === 3 ? '' : `<path d="M${f1h(cx + hw - 2)} ${ey + 12} l9 4 l-3 7 z" fill="${mc}" ${I(1.4)}/>`); }   // узел платка
      return `<g class="jd-class-hat">${s}</g>`;
    }
    if (id === 'nhood') {
      const hc = ['#3b3644', '#2a2633', '#221c33', '#1d1230', '#140a1c'][n];
      return `<g class="jd-class-hat">${hood(hc, 34).replace(`${cx + 2} ${t - 34}`, `${cx} ${t - 34}`)}${rim(rc || BONE)}${n >= 1 ? skullMark(cx, t - 12, 5.2, T.ink, n >= 3 ? GLOW[n] : null) : ''}</g>`;
    }
    if (id === 'ncrown') {
      let sp = ''; for (const i of [-2, -1, 0, 1, 2]) { const x = cx + i * hw * 0.42, h = (i === 0 ? 8 : Math.abs(i) === 1 ? 15 : 11) + n * 1.5; sp += `<path d="M${f1h(x - 4)} ${t + 2} L${f1h(x)} ${f1h(t - h)} L${f1h(x + 4)} ${t + 2} Z" fill="${BONE}" ${I(1.6)}/>`; }
      return `<g class="jd-class-hat">${sp}<path d="M${f1h(cx - hw - 3)} ${t + 9} Q${cx} ${t + 3} ${f1h(cx + hw + 3)} ${t + 9} L${f1h(cx + hw + 1)} ${t + 1} Q${cx} ${t - 5} ${f1h(cx - hw - 1)} ${t + 1} Z" fill="${BONE}" ${O(2.6)}/>`
        + (rc ? `<path d="M${f1h(cx - hw)} ${t + 5} Q${cx} ${t} ${f1h(cx + hw)} ${t + 5}" fill="none" stroke="${rc}" stroke-width="1.8"/>` : '') + skullMark(cx, t - 4, 6.4, T.ink, n >= 3 ? GLOW[n] : null) + '</g>';
    }
    // 25.10: «Каска шахтёра» (look.hat miner) — жёлтая каска с фонарём во лбу; по голове человечка (раньше в шахте каска висела над
    // головой отдельной картинкой, а в сумке и в бою была шлемом легионера)
    if (id === 'miner') {
      const y0 = t + 10, top = t - 17;
      return `<g class="jd-class-hat jd-miner"><path d="M${f1h(cx - hw - 6)} ${y0} Q${f1h(cx - hw - 5)} ${top} ${cx} ${top} Q${f1h(cx + hw + 5)} ${top} ${f1h(cx + hw + 6)} ${y0} Z" fill="#ffcf3a" ${O()}/>`
        + `<path d="M${cx} ${top + 2} V${y0 - 2}" stroke="#e0a91f" stroke-width="5" stroke-linecap="round"/>`
        + `<path d="M${f1h(cx - hw - 11)} ${y0 + 1} Q${cx} ${y0 - 5} ${f1h(cx + hw + 11)} ${y0 + 1} L${f1h(cx + hw + 9)} ${y0 + 6} Q${cx} ${y0 + 1} ${f1h(cx - hw - 9)} ${y0 + 6} Z" fill="#f2b82a" ${O(2.6)}/>`
        + `<circle cx="${cx}" cy="${f1h(t - 3)}" r="15" fill="#fff6c0" opacity=".28"/><circle cx="${cx}" cy="${f1h(t - 3)}" r="7.5" fill="#fff6c0" ${O(2.6)}/><circle cx="${cx}" cy="${f1h(t - 3)}" r="3.4" fill="#ffe27a"/></g>`;
    }
    // phelm / pwing — белый шлем паладина
    const steel = PLATE[n], gd = n ? GOLD : '#b89a52';
    let s = `<path d="M${f1h(cx - hw - 5)} ${t + 14} Q${f1h(cx - hw - 6)} ${t - 18} ${cx} ${t - 19} Q${f1h(cx + hw + 6)} ${t - 18} ${f1h(cx + hw + 5)} ${t + 14} L${f1h(cx + hw - 1)} ${t + 14} L${f1h(cx + hw - 1)} ${t + 6} L${f1h(cx - hw + 1)} ${t + 6} L${f1h(cx - hw + 1)} ${t + 14} Z" fill="${steel}" ${O()}/>`
      + `<path d="M${f1h(cx - hw - 4)} ${t + 3} Q${cx} ${t - 3} ${f1h(cx + hw + 4)} ${t + 3}" fill="none" stroke="${gd}" stroke-width="4"/>`
      + (id === 'phelm' ? `<path d="M${cx} ${t - 16} V${t + 1} M${cx - 6} ${t - 9} H${cx + 6}" stroke="${gd}" stroke-width="3.4" stroke-linecap="round"/>` : sunMark(cx, t - 9, 4, gd, T.ink));
    if (id === 'pwing') {
      const wing = (sd) => { const x0 = cx + sd * (hw + 3); return `<path d="M${f1h(x0)} ${t + 4} q${-sd * 0} -6 ${sd * 6} -10 q${sd * 8} -6 ${sd * 18} -16 q${-sd * 2} 8 ${-sd * 6} 12 q${sd * 8} -2 ${sd * 12} -6 q${-sd * 4} 10 ${-sd * 14} 14 q${sd * 6} 0 ${sd * 9} -2 q${-sd * 8} 10 ${-sd * 25} 8 Z" fill="#ffffff" ${O(2.6)}/>`; };
      s = wing(-1) + wing(1) + s + (n >= 3 ? `<ellipse cx="${cx}" cy="${t - 28}" rx="15" ry="4.5" fill="none" stroke="#ffe27a" stroke-width="3.5"/>` : '');
    }
    return `<g class="jd-class-hat">${s}</g>`;
  }
  // подвеска амулета класса: центр (0, 0), высота ~14
  function charmPendant(kind, rar, ink) {
    const rc = W_RAR[rar] || null, I = (w) => `stroke="${ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const ring = rc ? `<circle r="8.6" fill="none" stroke="${rc}" stroke-width="2"/>` : '';
    switch (kind) {
      case 'lockpick': return ring + `<circle cy="-3" r="3.6" fill="none" stroke="#c9cfd6" stroke-width="2.2"/><path d="M-1 0 V8 M-1 8 h3 M-1 5 h2 M2 -1 l3 8" fill="none" stroke="#c9cfd6" stroke-width="2" stroke-linecap="round"/>`;
      case 'vial': return ring + `<path d="M-2 -7 h4 v3 l3.5 4 v6 q0 2 -2 2 h-7 q-2 0 -2 -2 v-6 l3.5 -4 z" fill="#d8f2e2" ${I(1.4)}/><path d="M-5.2 2 h10.4 v4 q0 2 -2 2 h-6.4 q-2 0 -2 -2 z" fill="#5fd35a"/><rect x="-2.6" y="-9" width="5.2" height="3" rx="1" fill="#8a5a2b" ${I(1)}/>`;
      case 'cateye': return ring + `<ellipse rx="6.2" ry="5" fill="#d6e84a" ${I(1.6)}/><ellipse rx="1.3" ry="4.2" fill="#1a1410"/><circle cx="-2.4" cy="-2" r="1.2" fill="#fff" opacity=".8"/>`;
      case 'bone': return ring + `<rect x="-1.8" y="-6" width="3.6" height="12" rx="1.2" fill="${BONE}" ${I(1.2)}/><circle cx="-1.8" cy="-6" r="2.2" fill="${BONE}" ${I(1.2)}/><circle cx="1.8" cy="-6" r="2.2" fill="${BONE}" ${I(1.2)}/><circle cx="-1.8" cy="6" r="2.2" fill="${BONE}" ${I(1.2)}/><circle cx="1.8" cy="6" r="2.2" fill="${BONE}" ${I(1.2)}/>`;
      case 'souljar': return ring + `<rect x="-5" y="-5" width="10" height="11" rx="3" fill="#cfefff" fill-opacity=".55" ${I(1.4)}/><rect x="-3" y="-8" width="6" height="3" rx="1" fill="#8a5a2b" ${I(1)}/><circle cy="1" r="2.6" fill="#7fe8ff"/><path d="M2 2 q3 2 1 4" fill="none" stroke="#7fe8ff" stroke-width="1.4"/>`;
      case 'phylactery': return ring + `<rect x="-5.6" y="-5" width="11.2" height="10" rx="1.5" fill="#3a2450" stroke="#d9b45a" stroke-width="1.6"/><path d="M-5.6 -1 H5.6" stroke="#d9b45a" stroke-width="1"/><circle cy="1.5" r="2.6" fill="#b06bff" ${I(1)}/>`;
      case 'ladanka': return ring + `<path d="M-5 -6 h10 v5 q0 6 -5 8.5 q-5 -2.5 -5 -8.5 z" fill="#efe4c8" stroke="#d9a441" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 -4 V4 M-3 -1 H3" stroke="#d9a441" stroke-width="1.6" stroke-linecap="round"/>`;
      case 'sun': return ring + sunMark(0, 0, 4.2, '#ffcf4d', ink);
      case 'dawn': { let d = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, r = i % 2 ? 3.4 : 7.6; d += `${i ? 'L' : 'M'}${f1h(Math.cos(a) * r)} ${f1h(Math.sin(a) * r)}`; }
        return ring + `<path d="${d}Z" fill="#ffcf4d" ${I(1.2)}/><circle r="2.6" fill="#ffffff" ${I(1)}/>`; }
      default: return '';
    }
  }
  // значок амулета класса (сумка, лавка, аукцион): низ на y ≈ 6, шнурок сверху — как общий значок амулета на сайте
  function charmArt(kind, rar) {
    if (!CLASS_CHARM.has(kind)) return '';
    const rc = W_RAR[rar] || null;
    return `<path d="M-16 -46 Q0 -20 16 -46" fill="none" stroke="#c9a35a" stroke-width="3.5" stroke-dasharray="1 5" stroke-linecap="round"/>`
      + (rc ? `<circle cy="-12" r="19" fill="${rc}" opacity=".16"/>` : '') + `<g transform="translate(0 -12) scale(2.3)">${charmPendant(kind, rar, '#2a2236')}</g>`;
  }
  // шлемы классов для значков (jHats): ключ id — обычная редкость, id@редкость — со своими деталями (нимб, огни в глазницах, золото)
  function classHatsFor(b) {
    const T = Object.assign(hwTok(S), { sw: 4 }), out = {};
    for (const id of [...CLASS_HAT, 'miner']) { out[id] = classHat(id, { b }, T, 'common'); for (const r of CATALOG.rarities) out[id + '@' + r] = classHat(id, { b }, T, r); }   // 25.10: + каска шахтёра
    return out;
  }

  /* ---------- сборка человечка ----------
     ВАЖНО: порядок вызовов r() — часть внешности. Если поменять порядок, у всех зрителей сменится внешность.
     mood: 'happy' (по умолчанию, руки вверх) | 'walk' (гуляет: руки вдоль тела, лицо — своё, по нику) | 'sad' | 'chill' | 'stern' | 'hurt'
     uniform: тюремная роба
     extra: { crown: 'big'|'mini', cape: цвет, bow: цвет, wig: true } — наряды событий (поверх купленного);
            alive — нарисовать живым, даже если погиб; ghost — призраком принудительно; noAura — без ауры;
            armed + gear — боевая стойка со снаряжением; hold: 'cocktail' + holdRot — что в руке на отдыхе
     look: внешность явно (для примерочной); иначе — из гардероба по seed */
  function build(st, seed, mood, uniform, extra, look) {
    extra = extra || {};
    // чей человечек (seedFor(ник) или extra.who) — данные из карт берутся по нику; дальше зерно — обычное число
    const who = whoOf(seed, extra), me = who !== null ? { who } : null;
    seed = Number(seed) >>> 0;
    const ghost = !extra.alive && (extra.ghost || ghostT(entry(GHOSTS, seed, me)));
    const lk = look !== undefined ? look : entry(LOOKS, seed, me) || null;
    const P = nickPicks(st, seed, mood === 'sad');   // всё «по нику» — одной функцией с defaultsFor (тот же порядок r())
    let { fill, c2, b } = P;
    // купленное подменяет «по нику», но случайные числа тянутся в том же порядке — остальное у человечка не меняется
    if (lk && lk.shape && st.bodies[lk.shape]) b = st.bodies[lk.shape](jrng((seed ^ 0x5bd1e995) >>> 0));
    if (lk && lk.color) fill = String(lk.color);
    if (lk && lk.color2) c2 = String(lk.color2);
    const sad = mood === 'sad', battle = mood === 'stern' || mood === 'hurt', chill = mood === 'chill';
    const armed = battle && !!extra.armed;
    // 19.10: боевой вид (шлем, доспех, амулет) — по месту (extra.kit), иначе — в боевой стойке. Снаряжение — только своего ника
    const fight = extra.kit === 'battle' || (extra.kit !== 'peace' && armed);
    const gearAll = extra.gear || entry(GEAR, seed, me) || {};
    // k — всё, что нужно стилю, чтобы нарисовать деталь на этом человечке
    // look — купленное (стилю: например, цвет глаз котика у купленных глаз — как на образце в Шатре)
    const k = Object.assign({ b, fill, c2, mood, sad, battle, chill, seed, extra, uid, look: lk || null }, st.frame(b));

    let arms, front = '';
    if (armed) {
      const gear = gearAll;
      const a = st.arms.armed(k);   // { svg, right: {x,y} — правая кисть (оружие), left: {x,y} — левая (щит) }
      arms = a.svg;
      const hr = a.right, hl = a.left, H = st.hold;
      const glow = (rar) => { if (!st.rarityGlow[rar]) return ''; const id = uid('jlR'); return { id, def: st.gearGlow(id, st.rarityGlow[rar]) }; };
      let defs = '';
      // jd-weapon / jd-shield — обёртки для анимаций боя (взмах оружием, щит вперёд): точка поворота — кисть (transform-origin)
      const wa = gear.w && gearArt(st, 'weapon', gear.w, gear.wr);
      front += `<g class="jd-weapon" data-w="${wa ? gear.w : 'fist'}" style="transform-origin:${hr.x}px ${hr.y}px">`;
      if (wa) { const g = glow(gear.wr); if (g) defs += g.def; front += `<g transform="translate(${hr.x} ${hr.y}) rotate(${H.weaponRot(gear.w)}) scale(${H.weaponScale})"${g ? ` filter="url(#${g.id})"` : ''}>${wa}</g>`; }
      front += st.hand(k, hr.x, hr.y) + '</g>';
      const sa = gear.s && gearArt(st, 'shield', gear.s, gear.sr);
      if (sa) { const g = glow(gear.sr); if (g) defs += g.def; front += `<g class="jd-shield" style="transform-origin:${hl.x}px ${hl.y}px"><g transform="translate(${hl.x + H.shieldDx} ${hl.y + H.shieldDy}) scale(${H.shieldScale})"${g ? ` filter="url(#${g.id})"` : ''}>${sa}</g></g>`; }
      else front += st.hand(k, hl.x, hl.y);
      if (defs) front = `<defs>${defs}</defs>` + front;
    } else if (sad || battle || chill || mood === 'walk') arms = st.arms.down(k);   // руки висят вдоль тела
    else arms = st.arms.up(k);                                    // руки вверх
    if (chill && extra.hold && st.held[extra.hold]) front += st.held[extra.hold](k, Number(extra.holdRot) || 0);

    let eyesKind = P.eyes;
    if (lk && lk.eyes) eyesKind = lk.eyes;
    k.eyesKind = eyesKind; k.cyc = eyesKind === 'cyclops';
    let eyes, mouth;
    const sadFace = sad ? st.faces.sad(k) : null;
    eyes = sad ? sadFace.eyes : HW_EYE.has(eyesKind) ? ((st.hwEyes && st.hwEyes(eyesKind, k)) || hwEyes(eyesKind, k, hwTok(st))) : st.eyes(eyesKind, k);   // HW: глаза ивента
    mouth = sad ? sadFace.mouth : st.mouth(P.mouth, k);
    if (!sad && lk && lk.mouth && st.mouthPool.includes(lk.mouth)) mouth = st.mouth(lk.mouth, k);
    // 18.10: купленные глаза видны и в бою, и на отдыхе, и на сайте (там герой «суровый»): настроение меняет только рот.
    // Раненое лицо (hurt) остаётся как есть — по нему видно, что герою плохо
    // 19.10: и выбранный рот тоже (раньше в бою и на сайте его подменяло настроение — «Чеширская улыбка» превращалась в рот с одним зубом)
    if (chill || battle) { const f = st.faces[mood](k); const own = (x) => lk && lk[x] && mood !== 'hurt';
      if (!(own('mouth') && st.mouthPool.includes(lk.mouth))) mouth = f.mouth; if (!own('eyes')) eyes = f.eyes; }
    if ((chill || battle) && lk && lk.eyes && HW_EYE.has(lk.eyes) && mood !== 'hurt') eyes = (st.hwEyes && st.hwEyes(lk.eyes, k)) || hwEyes(lk.eyes, k, hwTok(st));   // HW

    let blush = P.blush ? st.blush(k) : '';
    if (!sad && lk && typeof lk.blush === 'boolean') blush = lk.blush ? st.blush(k) : '';
    if (battle) blush = '';
    const H = st.hats(k);
    try { const hh = hwHats(k, hwTok(st)); for (const id of HW_HAT) if (H[id] === undefined) H[id] = hh[id]; } catch (e) {}   // HW: шапки ивента (свой рисунок стиля — главнее)
    let hat = H[P.hat];
    // 23.10: шлем класса (rhood, nhood, phelm…) — рисунок ядра с деталями по редкости, если у стиля нет своего
    let classHelm = null; if (gearAll.h && (CLASS_HAT.has(gearAll.h) || gearAll.h === 'miner') && H[gearAll.h] === undefined) { try { classHelm = classHat(gearAll.h, k, hwTok(st), gearAll.hr); } catch (e) { classHelm = null; } }
    const ownHat = !!(lk && lk.hat && H[lk.hat] !== undefined), helm = classHelm || (gearAll.h && H[gearAll.h] !== undefined ? H[gearAll.h] : null);
    if (ownHat) hat = H[lk.hat];
    // шлем: только в бою — вместо любой шапки; в мирных местах шлема нет никогда (решение стримера 19.10), там — своя шапка или шапка по нику
    if (helm && fight) hat = helm;
    // 25.10: в шахте каска шахтёра видна и в мирном виде (extra.minerHat — надета: свет в темноте); у Скупщика и Фонарщика — тоже
    if (extra.minerHat) { try { hat = classHat('miner', k, hwTok(st), 'common'); } catch (e) {} }
    const robe = uniform ? st.uniform(k) : '';
    let worn = '', amulet = '';
    if (fight && !uniform) {
      try { if (gearAll.a) worn = wornArmor(st, k, gearAll); } catch (e) { worn = ''; }
      try { if (gearAll.t) amulet = wornAmulet(st, k, gearAll); } catch (e) { amulet = ''; }   // поверх шарфа/галстука — иначе не видно
    }

    // аксессуары из костюмерной (наряды событий — плащ/бабочка из extra — главнее)
    const acc = new Set(lk && Array.isArray(lk.acc) ? lk.acc : []), aC = (lk && lk.accColor) || c2;
    // 19.10: плащ первопроходца (награда) — стиль рисует свой (acc.pioneer), иначе — общий.
    // 20.10: надеты оба плаща — рисуется обычный, своего цвета (capeColor): раньше первопроходец перекрывал его,
    // и выбранный в «Облике» цвет плаща не применялся (красный плащ рисовался синим плащом первопроходца)
    const capeCol = extra.cape || (acc.has('cape') ? (lk.capeColor || st.capeColor) : null);
    const pioneer = !capeCol && acc.has('pioneer');
    const bowCol = extra.bow || (acc.has('bowtie') ? aC : null);
    let cape = '', crown = '', bow = '', wear = '', face = '', neck = '';
    if (capeCol) cape = st.acc.cape(k, capeCol);
    else if (pioneer) { const pc = pioneerCape(st, k); cape = pc.back; neck += pc.front; }
    if (extra.crown) crown = st.event.crown(k, extra.crown);
    if (bowCol) bow = st.acc.bowtie(k, bowCol);
    if (acc.size) {
      if (acc.has('glasses')) face += st.acc.glasses(k);
      if (acc.has('shades')) face += st.acc.shades(k);
      if (acc.has('monocle') && !acc.has('shades')) face += st.acc.monocle(k);
      if (acc.has('mustache')) wear += st.acc.mustache(k);
      if (acc.has('scarf')) neck += st.acc.scarf(k, aC);
      if (acc.has('tie') && !bowCol) neck += st.acc.tie(k, aC);
    }
    // HW: аксессуары ивента — клыки, плащ вампира, ведёрко-тыква, болты, паутина (стиль может нарисовать свои: st.hwAcc[id](k))
    let hwFront = '';
    for (const a of acc) if (HW_ACC.has(a)) { try { const r = (st.hwAcc && st.hwAcc[a] && st.hwAcc[a](k)) || hwAcc(a, k, hwTok(st)); if (!r) continue;
      if (r.back && !capeCol && !pioneer) cape = r.back + cape; if (r.face) face += r.face; if (r.neck) neck += r.neck; if (r.wear) wear += r.wear; if (r.front) hwFront += r.front; } catch (e) { /* без детали */ } }
    if (mood === 'hurt') wear += st.hurt(k);
    const wig = extra.wig ? st.event.wig(k) : '';
    const head = extra.wig ? wig : extra.crown ? crown : hat;   // шапка: парик судьи / корона события / купленная или «по нику»

    if (ghost) {
      const g = st.ghost(k, { arms, head });   // { style, inner }
      return `<svg class="jl-doodle jd-ghost" viewBox="0 0 120 170" style="${g.style}">${g.inner}</svg>`;
    }
    // jd-eyes — обёртка глаз (сайт Легиона моргает ими через CSS transform; на рисунок не влияет)
    const au = lk && lk.aura && !extra.noAura ? (HW_AURA.has(lk.aura) ? (() => { const s0 = st.aura(lk.aura, k); return s0 && (s0.back || s0.front) ? s0 : hwAura(lk.aura, k) || { back: '', front: '' }; })() : st.aura(lk.aura, k)) : { back: '', front: '' };   // HW: ауры ивента
    // 19.10: аура — в своих группах jd-aura-b / jd-aura-f (на рисунок не влияют): сайт Легиона по ним выносит ауру
    // своего героя в отдельные слои и оживляет её дешёвой CSS-анимацией вместо SMIL
    if (au.back) au.back = `<g class="jd-aura-b">${au.back}</g>`;
    if (au.front) au.front = `<g class="jd-aura-f">${au.front}</g>`;
    const inner = `${au.back}${cape}${(() => { try { return st.tail ? st.tail(k) : ''; } catch (e) { return ''; } })()}${arms}${st.body(k)}${robe}${worn}<g class="jd-eyes">${eyes}</g>${face}<g class="jd-mouth">${mouth}</g>${wear}${blush}${neck}${amulet}${bow}${head}${front}${hwFront}${au.front}`;
    // HW: в Изнанке весь отряд — духи (extra.spirit): своя косметика видна, но человечек полупрозрачный и парит
    if (extra.spirit) return `<svg class="jl-doodle jd-spirit" viewBox="0 0 120 170">${hwSpirit(inner, k)}</svg>`;
    return `<svg class="jl-doodle" viewBox="0 0 120 170">${inner}</svg>`;
  }
  /* 19.10: «Плащ первопроходца» (награда) — дорожный плащ цвета ночного неба: светлый подбой у ворота, пара звёздочек на полах,
     застёжки-звёзды (роза ветров) на плечах. Стиль подстраивает его данными st.pioneer = { cloak, lining, line, ink, w, len, flare,
     hem: 'zig' | 'round' | 'leaf', clasp: 'star' | 'paw' | 'leaf', claspAt: 'shoulder' | 'collar' } или рисует сам: st.acc.pioneer(k) → { back, front }. */
  function pioneerCape(st, k) {
    try { if (st.acc && typeof st.acc.pioneer === 'function') { const r = st.acc.pioneer(k); if (r && typeof r.back === 'string') return { back: r.back, front: r.front || '' }; } } catch (e) {}
    const P = Object.assign({ cloak: '#2c4a6e', lining: '#bfe3ff', line: '#2a2140', ink: '#2a2140', w: 3.5, len: 168, flare: 18, hem: 'zig', clasp: 'star', clasp2: '#ffd36b' }, st.pioneer || {});
    const L = k.L, R = k.R, t = k.b.armY - 8, B = Math.min(168, P.len), x0 = L - P.flare, x1 = R + P.flare, n = 6, dx = (x1 - x0) / n;
    let d = `M${L + 6} ${t} C${L - 12} ${t + 30} ${x0 - 2} ${B - 18} ${x0} ${B}`;
    for (let i = 0; i < n; i++) {
      const a = x0 + dx * i, b = a + dx, m = (a + b) / 2;
      if (P.hem === 'round') d += ` Q${m} ${B + 6} ${b} ${B}`;                          // мягкие фестоны
      else if (P.hem === 'leaf') d += ` Q${a + dx * 0.15} ${B + 7} ${m} ${B + 8} Q${b - dx * 0.15} ${B + 7} ${b} ${B}`;   // листья
      else d += ` L${m} ${B - 7} L${b} ${B}`;                                            // рваный край дорожного плаща
    }
    d += ` C${x1 + 2} ${B - 18} ${R + 12} ${t + 30} ${R - 6} ${t} Z`;
    const tiny = (x, y, r) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="${P.lining}"/>`;
    const back = `<g class="jd-pioneer"><path d="${d}" fill="${P.cloak}" stroke="${P.line}" stroke-width="${P.w}" stroke-linejoin="round"/>`
      + `<path d="M${L + 4} ${t + 2} Q60 ${t + 14} ${R - 4} ${t + 2}" fill="none" stroke="${P.lining}" stroke-width="4" stroke-linecap="round"/>`
      + tiny(x0 + 9, B - 26, 3.4) + tiny(x1 - 10, B - 40, 2.6) + tiny(x0 + 5, B - 52, 2) + '</g>';
    const clasp = (x, y) => (P.clasp === 'paw'
      ? `<g><circle cx="${x}" cy="${y + 1.5}" r="3.6" fill="${P.clasp2}" stroke="${P.ink}" stroke-width="1.6"/><circle cx="${x - 3.6}" cy="${y - 3}" r="1.6" fill="${P.clasp2}" stroke="${P.ink}" stroke-width="1.2"/><circle cx="${x}" cy="${y - 4.4}" r="1.6" fill="${P.clasp2}" stroke="${P.ink}" stroke-width="1.2"/><circle cx="${x + 3.6}" cy="${y - 3}" r="1.6" fill="${P.clasp2}" stroke="${P.ink}" stroke-width="1.2"/></g>`
      : P.clasp === 'leaf'
        ? `<path d="M${x - 5} ${y + 3} Q${x - 4} ${y - 5} ${x + 5} ${y - 4} Q${x + 4} ${y + 4} ${x - 5} ${y + 3} Z M${x - 5} ${y + 3} L${x + 3} ${y - 3}" fill="${P.clasp2}" stroke="${P.ink}" stroke-width="1.6" stroke-linejoin="round"/>`
        : starClasp(x, y, 5.5, P.ink, P.clasp2));
    // 20.10: claspAt: 'collar' — застёжки у ворота (под ртом, на уровне шарфа/бабочки), а не у плеч. У котика голова и тело — одно,
    // «плечи» (armY − 3) приходятся ровно на щёки: застёжки-лапки ложились на румянец и выглядели как лапки на щеках
    const cy = P.claspAt === 'collar' && Number.isFinite(k.my) ? Math.max(t + 5, k.my + 12) : t + 5;
    return { back, front: clasp(L + 7, cy) + clasp(R - 7, cy) };
  }
  // застёжка-звезда с четырьмя лучами (роза ветров)
  const starClasp = (x, y, r, ink, fill) => `<path d="M${x} ${y - r} L${x + r * 0.32} ${y - r * 0.32} L${x + r} ${y} L${x + r * 0.32} ${y + r * 0.32} L${x} ${y + r} L${x - r * 0.32} ${y + r * 0.32} L${x - r} ${y} L${x - r * 0.32} ${y - r * 0.32} Z" fill="${fill || '#ffd36b'}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`;

  // оружие и щит: вид, которого стиль не умеет (новое снаряжение появилось позже стиля), рисуется «Легионом»
  function gearArt(st, fn, kind, rar) {
    let out = '';
    try { out = st[fn](kind, rar) || ''; } catch (e) { out = ''; }
    if (!out && st !== STYLES.legion && STYLES.legion) out = STYLES.legion[fn](kind, rar) || '';
    return out;
  }
  // если в новом стиле ошибка — рисуем этого человечка стилем «Легион», чтобы стрим не остался без человечков
  // 26.10 (ТЗ «старт для стримера», часть 4): личный стиль героя (Печать Метаморфозы) - метка ps в облике («Костюмерная»):
  // такой человечек рисуется своим стилем, если его сборка загружена (оверлей - все стили; сайт догружает нужный), иначе - стилем канала
  function styleFor(seed, extra, look) {
    let lk = look;
    if (lk === undefined) lk = entry(LOOKS, seed, extra || {});
    const ps = lk && typeof lk.ps === 'string' ? lk.ps : '';
    return ps && STYLES[ps] && !broken.has(ps) ? STYLES[ps] : S;
  }
  function jDoodle(seed, mood, uniform, extra, look) {
    if (!S) return '';
    const st = styleFor(seed, extra, look);
    try { return build(st, seed, mood, uniform, extra, look); } catch (e) {
      if (!broken.has(st.id)) { broken.add(st.id); console.error(`[человечки] ошибка в стиле «${st.id}», рисую стилем «Легион»:`, e); }
      if (st !== STYLES.legion && STYLES.legion) return build(STYLES.legion, seed, mood, uniform, extra, look);
      return '';
    }
  }

  /* ---------- откуда берётся гардероб ---------- */
  // оверлей MultiDonate: runtime.js сам передаёт состояние модуля «Костюмерная» (MDDoodle.feed)
  function feed(id, data) {
    if (id === 'wardrobe') {
      setTitles(data && data.titles);   // до setLooks: слушатели onLooks перерисуют и ники
      setLooks(data && data.looks);
      // в Костюмерной включили другой стиль: перезагружаемся, чтобы все виджеты взяли его целиком (а не смесь двух стилей)
      if (data && data.style && data.style !== ACTIVE && !reloading && window.location && window.location.reload) {   // window.location: имя location внутри занято функцией локаций
        reloading = true; console.log(`[человечки] включён стиль «${data.style}» — перезагружаю страницу`); setTimeout(() => window.location.reload(), 300);
      }
    } else if (id === 'legionary') { setGhosts(data && data.ghosts); setGear(data && data.gear); }
  }
  let reloading = false;
  // страницы вне MultiDonate (игры StreamClass) — слушаем поток событий сами
  /* 28.10 (hw-npc-ghosts, стример 00:17): НПС города (кузнец, продавцы, франт, звездочёт…) в «мёртвом» хэллоуинском городе - призраки:
     тот же облик (сид, шапка, аксессуары), призрачный рисунок стиля (как у героев-призраков), без filter (свечение - мягкий ореол
     градиентом) и без анимации внутри; висит чуть над землёй. Стиль оборачивает своего НПС: npcWrap(обычный рисунок, те же параметры).
     MDDoodle.npcGh (ставит город на время рисования): 'both' - обычный (.cy-npc) и призрак (.cy-npcg, скрыт) - рисунок улицы, мёртвые
     плитки citygl показывают призрака; 'ghost' - только призрак (помещения сайта в хэллоуинском виде); нет - как было */
  function npcGhost(seed, base, cx, s, mood, extra, look) {
    let svg = ''; try { svg = jDoodle(jhash(seed), mood || 'happy', false, Object.assign({}, extra || {}, { ghost: true }), look); } catch (e) { return ''; }
    const w = 120 * s, h = 170 * s, f1 = (n) => (Math.round(n * 10) / 10).toString(), id = 'npcH' + (jhash(seed) % 1e6);
    const m = /^<svg class="jl-doodle jd-ghost" viewBox="0 0 120 170"(?: style="[^"]*")?/.exec(svg); if (!m) return '';
    const body = `<svg class="jl-doodle jd-ghost" x="${f1(-w / 2)}" y="${f1(-h)}" width="${f1(w)}" height="${f1(h)}" viewBox="0 0 120 170" overflow="visible" style="width:${f1(w)}px;height:${f1(h)}px">`
      + svg.slice(m[0].length + 1).replace(/<animateTransform\b[^>]*\/>/g, '');
    return `<g class="cy-npcg" transform="translate(${f1(cx)} ${f1(base - 10 * s)})"><defs><radialGradient id="${id}"><stop offset="0" stop-color="#cfeaff" stop-opacity=".42"/><stop offset=".6" stop-color="#a8c8ff" stop-opacity=".12"/><stop offset="1" stop-color="#a8c8ff" stop-opacity="0"/></radialGradient></defs>`
      + `<ellipse cx="0" cy="${f1(-h * 0.45)}" rx="${f1(w * 0.6)}" ry="${f1(h * 0.52)}" fill="url(#${id})"/><g class="cy-npcf">${body}</g></g>`;
  }
  function npcWrap(normal, seed, base, cx, s, mood, extra, look) {
    const md = window.MDDoodle && window.MDDoodle.npcGh; if (!md || (extra && extra.ghost) || !normal) return normal;
    const g = npcGhost(seed, base, cx, s, mood, extra, look); if (!g) return normal;
    return md === 'ghost' ? g : `<g class="cy-npc">${normal}</g>${g.replace('<g class="cy-npcg"', '<g class="cy-npcg" display="none"')}`;
  }
  function connect(base) {
    if (!window.EventSource) return;
    let es = null;
    const open = () => {
      try { es = new EventSource((base || 'http://localhost:3777') + '/events'); } catch { return; }
      es.addEventListener('init', (e) => { try { const d = JSON.parse(e.data); feed('wardrobe', d.states && d.states.wardrobe); feed('legionary', d.states && d.states.legionary); } catch {} });
      es.addEventListener('state', (e) => { try { const { id, data } = JSON.parse(e.data); feed(id, data); } catch {} });
    };
    open();
  }
  const src = document.currentScript && document.currentScript.src ? new URL(document.currentScript.src) : null;
  const inMD = !!(src && /^https?:$/.test(window.location.protocol) && src.origin === window.location.origin);   // страница самого MultiDonate
  window.MDDoodle = {
    jrng, jhash, jpick, get CATALOG() { return catalogNow(); }, jDoodle, gearOf, defaultsFor, sameLook, lookChoices, setLooks, lookOf, seedFor, setGhosts, isGhost, setGear, feed, connect,
    setTitles, titleOf, nickColor, npcGhost, npcWrap, npcGh: '',
    onLooks: (fn) => listeners.push(fn), get looks() { return LOOKS; },
    // детали активного стиля — старые имена, ими пользуются алерты и виджеты
    get J_BODIES() { return S ? S.bodies : {}; },
    get BASE_HATS() { return S ? S.hatPool : []; },
    get RARITY() { return S ? S.rarityGlow : {}; },
    jHats: (b, c1, c2) => { let H; try { H = S.hats({ b, fill: c1, c2 }); } catch (e) { H = STYLES.legion && STYLES.legion !== S ? STYLES.legion.hats({ b, fill: c1, c2 }) : {}; }   // стиль не умеет «голую» голову (пиксельный) — шапки «Легиона»
      try { const C = classHatsFor(b); for (const id of Object.keys(C)) if (H[id] === undefined) H[id] = C[id]; } catch (e) {} return H; },   // 23.10: + шлемы классов (id и id@редкость)
    weaponArt: (kind, rar) => gearArt(S, 'weapon', kind, rar),
    armorArt,
    charmArt,   // 23.10: значок амулета класса (look.charm)
    CLASS_LOOKS: { armors: [...CLASS_ARMOR], hats: [...CLASS_HAT], charms: [...CLASS_CHARM] },
    shieldArt: (kind, rar) => gearArt(S, 'shield', kind, rar),
    auraArt: (kind, b, seed) => S.aura(kind, { b, seed, uid }),
    // стили
    addStyle, use, get style() { return S; }, get styles() { return STYLES; }, get active() { return ACTIVE; },
    addLocation, location, get locations() { return LOCS; },
    addNames, get names() { return NAMES; }, baseCatalog: CATALOG,
    // другие части стиля (карточки героя и т.п.) устроены так же, как локации: addPart(стиль, часть, фабрика) / part(часть, env)
    addPart: addLocation, part: location,
    // HW: «Ночь Тыквенной Луны» — детали ивента (стилям: свои рисунки поверх общих; тестам — списки)
    HW_LOOKS, hwHats: (k, tok) => hwHats(k, Object.assign(hwTok(S), tok || {})), hwEyes: (kind, k, tok) => hwEyes(kind, k, Object.assign(hwTok(S), tok || {})), hwAcc: (id, k, tok) => hwAcc(id, k, Object.assign(hwTok(S), tok || {})), hwAura,
    // локация заданного стиля БЕЗ подстраховки (для стенда)
    drawLocation: (styleId, locId, env) => { const f = LOCS[styleId] && LOCS[styleId][locId]; if (!f) throw new Error(`у стиля «${styleId}» нет локации «${locId}»`); return f(env || {}); },
    // нарисовать заданным стилем БЕЗ подстраховки «Легионом» (для стенда: ошибки стиля должны быть видны)
    draw: (id, seed, mood, uniform, extra, look) => build(STYLES[id], seed, mood, uniform, extra, look),
  };
  // файл, открытый с диска (стенд стилей), никуда не подключается
  if (!inMD && !(src && src.protocol === 'file:')) connect(src ? src.origin : 'http://localhost:3777');
})();

/* ───── стиль «legion»: styles/legion/characters.js ───── */
try {
/* Стиль «Легион» — человечки Легиона: плоские цвета, толстая светлая обводка, тёмные лица.
   Это стиль-образец: новый стиль = копия этого файла в styles/<id>/characters.js с другими рисунками.
   Договор (что обязан уметь стиль) — styles/README.md.
   Холст 120×170, ноги на y = 168, центр по x = 60. Каждая функция возвращает строку SVG. */
(function () {
  'use strict';
  const D = window.MDDoodle;
  if (!D) return;

  // ── цвета стиля ──
  const LINE = '#f5f2ff';   // обводка тел, рук, предметов
  const INK = '#15122e';    // лица, контуры аксессуаров
  const WS = `stroke="${LINE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;   // обводка снаряжения
  const RARITY = { common: null, uncommon: '#5bd36a', rare: '#4aa3ff', epic: '#b06bff', legendary: '#ffb83d' };          // свечение редких вещей
  const METAL = { common: '#a9b1b6', uncommon: '#cdeec4', rare: '#cfe3f5', epic: '#dcc6ff', legendary: '#ffd76a' };       // металл по редкости

  /* ── тела: (r) → { L, R, top, hw, eyeY, armY, d, square?, narrow? } ──
     L/R — левый и правый край, top — макушка, hw — полуширина головы (под шапки), eyeY — линия глаз, armY — плечи,
     d — контур тела (path), square — плоская макушка, narrow — узкое лицо. r() — случайные числа «по нику». */
  const bodies = {
    bean(r) { const w = 25 + Math.floor(r() * 9), L = 60 - w, R = 60 + w, top = 76; return { L, R, top, hw: w * 0.72, eyeY: 100, armY: 112, d: `M${L} 168 C${L - 4} 124 ${L + 1} 80 60 ${top} C${R - 1} 80 ${R + 4} 124 ${R} 168 Z` }; },
    box(r) { const w = 24 + Math.floor(r() * 9), L = 60 - w, R = 60 + w, top = 80 + Math.floor(r() * 10); return { L, R, top, hw: w - 4, eyeY: top + 26, armY: top + 34, square: true, d: `M${L + 9} ${top} H${R - 9} Q${R} ${top} ${R} ${top + 9} V168 H${L} V${top + 9} Q${L} ${top} ${L + 9} ${top} Z` }; },
    ball(r) { const w = 33 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 98; return { L, R, top, hw: w * 0.62, eyeY: 122, armY: 128, d: `M${L + 6} 168 C${L - 8} 150 ${L - 4} ${top} 60 ${top} C${R + 4} ${top} ${R + 8} 150 ${R - 6} 168 Z` }; },
    tall(r) { const w = 19 + Math.floor(r() * 4), L = 60 - w, R = 60 + w, top = 58; return { L, R, top, hw: w * 0.8, eyeY: 82, armY: 96, narrow: true, d: `M${L} 168 C${L - 2} 110 ${L} 62 60 ${top} C${R} 62 ${R + 2} 110 ${R} 168 Z` }; },
    ghost(r) { const w = 25 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 78, s = (2 * w) / 3; return { L, R, top, hw: w * 0.72, eyeY: 102, armY: 114, d: `M${L} 162 C${L} 112 ${L + 2} 82 60 ${top} C${R - 2} 82 ${R} 112 ${R} 162 q${-s / 2} 10 ${-s} 0 q${-s / 2} 10 ${-s} 0 q${-s / 2} 10 ${-s} 0 Z` }; },
    cone(r) { const w = 28 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 74; return { L, R, top, hw: 13, eyeY: 104, armY: 118, narrow: true, d: `M${L} 168 C${L + 4} 140 ${L + 16} 88 60 ${top} C${R - 16} 88 ${R - 4} 140 ${R} 168 Z` }; },
    egg(r) { const w = 27 + Math.floor(r() * 5), L = 60 - w, R = 60 + w, top = 70; return { L, R, top, hw: w * 0.6, eyeY: 98, armY: 116, d: `M60 ${top} C${R - 4} ${top} ${R + 6} 130 ${R - 2} 160 Q60 174 ${L + 2} 160 C${L - 6} 130 ${L + 4} ${top} 60 ${top} Z` }; },
  };

  /* ── шапки: k → { id: svg } (k.b — тело, k.fill — цвет тела, k.c2 — второй цвет) ── */
  function hats(k) {
    const b = k.b, c1 = k.fill, c2 = k.c2;
    const t = b.square ? b.top - 6 : b.top, hw = b.hw, cx = 60;   // у квадратных макушка плоская — шапка садится сверху, а не утопает
    const S = `stroke="${LINE}" stroke-width="4" stroke-linejoin="round"`;
    let leaves = '';
    for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) { const a = (200 + i * 14) * Math.PI / 180, x = cx + sd * Math.cos(a) * -(hw + 5), y = t + 10 + Math.sin(a) * 12 - i * 1.5; leaves += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="3.6" transform="rotate(${(sd * (35 - i * 12)).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${i % 2 ? '#ffc94d' : '#ffe08a'}" stroke="#8a5a00" stroke-width="1.6"/>`; }
    return {
      none: '',
      tuft: `<path class="ln" d="M${cx - 4} ${t + 2} q-2 -10 -8 -14 M${cx} ${t} q0 -12 2 -16 M${cx + 4} ${t + 2} q4 -10 10 -12"/>`,
      cap: `<path d="M${cx - hw - 2} ${t + 12} q${hw + 2} -26 ${2 * hw + 4} 0 z" fill="${c2}" class="body"/><path class="ln" d="M${cx + hw} ${t + 10} l14 2"/>`,
      bow: `<path d="M${cx} ${t + 2} l-12 -8 l0 14 z M${cx} ${t + 2} l12 -8 l0 14 z" fill="${c2}" class="body"/>`,
      horns: `<path d="M${cx - hw * 0.55} ${t + 7} q-10 -8 -6 -24 q6 10 14 18 z M${cx + hw * 0.55} ${t + 7} q10 -8 6 -24 q-6 10 -14 18 z" fill="#e8455c" class="body"/>`,
      crown: `<path d="M${cx - 15} ${t + 6} l0 -18 l8 9 l7 -13 l7 13 l8 -9 l0 18 z" fill="#ffc94d" class="body"/>`,
      tophat: `<path d="M${cx - 13} ${t + 4} v-28 h26 v28 z" fill="#2a2440" class="body"/><path class="ln" d="M${cx - 22} ${t + 5} h44"/><path d="M${cx - 13} ${t - 2} h26" stroke="${c2}" stroke-width="5"/>`,
      party: `<path d="M${cx - 13} ${t + 6} L${cx} ${t - 30} L${cx + 13} ${t + 6} z" fill="${c2}" class="body"/><circle cx="${cx}" cy="${t - 32}" r="5" fill="#fff"/><path d="M${cx - 8} ${t - 6} l14 -6 M${cx - 4} ${t - 18} l9 -4" stroke="#fff" stroke-width="3"/>`,
      wizard: `<path d="M${cx - hw - 6} ${t + 10} L${cx + 6} ${t - 40} Q${cx + 14} ${t - 34} ${cx + 22} ${t - 30} L${cx + hw + 6} ${t + 10} z" fill="#4b3bb8" class="body"/><path d="M${cx - 2} ${t - 12} l2 -6 l2 6 l6 0 l-5 4 l2 6 l-5 -4 l-5 4 l2 -6 l-5 -4 z" fill="#ffc94d"/>`,
      antenna: `<path class="ln" d="M${cx} ${t} q-6 -14 4 -24"/><circle cx="${cx + 4}" cy="${t - 27}" r="6" fill="${c2}" class="body"/>`,
      antenna2: `<path class="ln" d="M${cx - 6} ${t + 2} l-8 -20 M${cx + 6} ${t + 2} l8 -20"/><circle cx="${cx - 14}" cy="${t - 20}" r="5" fill="${c2}" class="body"/><circle cx="${cx + 14}" cy="${t - 20}" r="5" fill="${c2}" class="body"/>`,
      cat: `<path d="M${cx - hw} ${t + 12} l2 -24 l14 14 z M${cx + hw} ${t + 12} l-2 -24 l-14 14 z" fill="${c1}" class="body"/>`,
      bunny: `<ellipse cx="${cx - 9}" cy="${t - 16}" rx="7" ry="20" fill="${c1}" class="body"/><ellipse cx="${cx + 9}" cy="${t - 16}" rx="7" ry="20" fill="${c1}" class="body"/>`,
      halo: `<ellipse cx="${cx}" cy="${t - 14}" rx="17" ry="5" fill="none" stroke="#ffe27a" stroke-width="4"/>`,
      sprout: `<path class="ln" d="M${cx} ${t} v-14"/><path d="M${cx} ${t - 12} q-14 -2 -14 -12 q12 0 14 12 z M${cx} ${t - 14} q12 -4 14 -14 q-12 0 -14 14 z" fill="#6fdc6f" class="body"/>`,
      bandana: `<path d="M${cx - hw - 2} ${t + 16} Q${cx} ${t - 6} ${cx + hw + 2} ${t + 16} Z" fill="#e8455c" class="body"/><path d="M${cx + hw} ${t + 14} l12 -2 l-4 10 z" fill="#e8455c" class="body"/>`,
      // только из Костюмерной (в случайный выбор по нику не входят)
      legion: `<path d="M${cx - hw - 5} ${t + 16} Q${cx - hw - 5} ${t - 15} ${cx} ${t - 15} Q${cx + hw + 5} ${t - 15} ${cx + hw + 5} ${t + 16} L${cx + hw - 2} ${t + 16} L${cx + hw - 2} ${t + 8} L${cx - hw + 2} ${t + 8} L${cx - hw + 2} ${t + 16} Z" fill="#d9b04a" ${S}/>`
        + `<path d="M${cx - 18} ${t - 13} Q${cx - 14} ${t - 40} ${cx} ${t - 41} Q${cx + 14} ${t - 40} ${cx + 18} ${t - 13} Z" fill="#e8455c" ${S}/><path d="M${cx - 9} ${t - 32} v14 M${cx} ${t - 36} v18 M${cx + 9} ${t - 32} v14" stroke="#a3122a" stroke-width="2.5"/>`,
      laurel: `<g>${leaves}</g>`,
      beret: `<ellipse cx="${cx - 4}" cy="${t + 2}" rx="${hw + 8}" ry="10" transform="rotate(-8 ${cx} ${t})" fill="${c2}" ${S}/><path d="M${cx - 2} ${t - 8} l3 -8" stroke="${LINE}" stroke-width="4" stroke-linecap="round"/>`,
      headphones: `<path d="M${cx - hw - 6} ${b.eyeY - 4} Q${cx - hw - 6} ${t - 14} ${cx} ${t - 14} Q${cx + hw + 6} ${t - 14} ${cx + hw + 6} ${b.eyeY - 4}" fill="none" stroke="#2a2440" stroke-width="6" stroke-linecap="round"/>`
        + `<rect x="${cx - hw - 13}" y="${b.eyeY - 14}" width="12" height="22" rx="5" fill="${c2}" ${S}/><rect x="${cx + hw + 1}" y="${b.eyeY - 14}" width="12" height="22" rx="5" fill="${c2}" ${S}/>`,
      cowboy: `<path d="M${cx - 18} ${t + 5} q-4 -30 18 -34 q22 4 18 34 z" fill="#a0703a" ${S}/><path d="M${cx - 38} ${t + 2} q38 18 76 0 q-8 12 -38 13 q-30 -1 -38 -13 z" fill="#8a5a2b" ${S}/><path d="M${cx - 17} ${t - 3} h34" stroke="#e8455c" stroke-width="5"/>`,
      chef: `<path d="M${cx - 14} ${t + 6} v-14 q-12 -2 -8 -14 q4 -10 14 -4 q4 -10 12 -2 q10 -4 12 6 q2 10 -10 14 v14 z" fill="#ffffff" ${S}/>`,
    };
  }

  /* ── снаряжение ── */
  // оружие: рукоять в (0,0), клинок вверх (−y)
  function weapon(kind, rar) {
    const m = METAL[rar] || METAL.common, wood = '#8a5a2b', dw = '#5a3a1c';
    const grip = (y0, y1, w = 5) => `<rect x="${-w / 2}" y="${y1}" width="${w}" height="${y0 - y1}" rx="2" fill="${wood}" ${WS}/>`;
    switch (kind) {
      case 'sword': return `<rect x="-2.5" y="2" width="5" height="13" rx="2" fill="${dw}" ${WS}/><circle cy="17" r="3.5" fill="${m}" ${WS}/><path d="M-4 -2 V-50 L0 -59 L4 -50 V-2 Z" fill="${m}" ${WS}/><rect x="-11" y="-4" width="22" height="6" rx="3" fill="#6d5a45" ${WS}/>`;
      case 'gladius': return `<rect x="-2.5" y="2" width="5" height="11" rx="2" fill="${dw}" ${WS}/><circle cy="15" r="3.5" fill="${m}" ${WS}/><path d="M-5 -2 C-7 -18 -6 -32 0 -44 C6 -32 7 -18 5 -2 Z" fill="${m}" ${WS}/><rect x="-9" y="-4" width="18" height="6" rx="3" fill="#b8892a" ${WS}/>`;
      case 'dagger': return `<rect x="-2.5" y="2" width="5" height="10" rx="2" fill="${dw}" ${WS}/><path d="M-3.5 -2 V-22 L0 -29 L3.5 -22 V-2 Z" fill="${m}" ${WS}/><rect x="-7" y="-4" width="14" height="5" rx="2.5" fill="#6d5a45" ${WS}/>`;
      case 'axe': return `${grip(14, -50)}<path d="M2 -48 C16 -54 24 -42 23 -28 C17 -32 9 -33 2 -32 Z" fill="${m}" ${WS}/>`;
      case 'club': return `<path d="M-4 12 C-5 -10 -10 -30 -7 -44 C-3 -55 8 -53 9 -42 C10 -28 4 -10 4 12 Z" fill="${wood}" ${WS}/><circle cx="-2" cy="-36" r="1.8" fill="${dw}"/><circle cx="4" cy="-24" r="1.6" fill="${dw}"/>`;
      case 'mace': return `${grip(12, -34)}${[0, 60, 120, 180, 240, 300].map((a) => { const r2 = a * Math.PI / 180, x = Math.sin(r2) * 12, y = -42 - Math.cos(r2) * 12; return `<path d="M${(x * 0.6).toFixed(1)} ${(-42 + (y + 42) * 0.6).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)}" stroke="${LINE}" stroke-width="5" stroke-linecap="round"/><path d="M${(x * 0.6).toFixed(1)} ${(-42 + (y + 42) * 0.6).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)}" stroke="${m}" stroke-width="2.5" stroke-linecap="round"/>`; }).join('')}<circle cy="-42" r="9" fill="${m}" ${WS}/>`;
      case 'hammer': return `${grip(14, -40)}<rect x="-13" y="-54" width="26" height="15" rx="3" fill="${m}" ${WS}/>`;
      case 'spear': return `<rect x="-2.5" y="-68" width="5" height="100" rx="2" fill="${wood}" ${WS}/><path d="M-6 -64 L0 -86 L6 -64 Z" fill="${m}" ${WS}/><path d="M-3 -62 h6" stroke="#e8455c" stroke-width="3"/>`;
      case 'pitchfork': return `<rect x="-2.5" y="-54" width="5" height="86" rx="2" fill="${wood}" ${WS}/><path d="M-11 -54 H11 M-10 -54 V-74 M0 -54 V-78 M10 -54 V-74" fill="none" stroke="${LINE}" stroke-width="6" stroke-linecap="round"/><path d="M-11 -54 H11 M-10 -54 V-74 M0 -54 V-78 M10 -54 V-74" fill="none" stroke="${m}" stroke-width="3" stroke-linecap="round"/>`;
      case 'bow': return `<path d="M-2 -44 C16 -30 16 30 -2 44" fill="none" stroke="${LINE}" stroke-width="8" stroke-linecap="round"/><path d="M-2 -44 C16 -30 16 30 -2 44" fill="none" stroke="${rar === 'common' || !rar ? wood : m}" stroke-width="4.5" stroke-linecap="round"/><path d="M-2 -44 L-6 0 L-2 44" fill="none" stroke="${LINE}" stroke-width="1.6"/>`;
      case 'staff': { const top = !rar || rar === 'common' ? `<circle cy="-66" r="7" fill="${wood}" ${WS}/>` : `<path d="M0 -84 L8 -70 L0 -58 L-8 -70 Z" fill="${RARITY[rar]}" ${WS}/><path d="M-2 -76 l3 -4" stroke="#fff" stroke-width="2"/>`; return `<rect x="-2.5" y="-60" width="5" height="96" rx="2" fill="${wood}" ${WS}/>${top}`; }
      case 'crook': return `<rect x="-2.5" y="-48" width="5" height="84" rx="2" fill="${wood}" ${WS}/><path d="M0 -48 C-3 -62 10 -68 13 -58 C15 -50 5 -47 5 -54" fill="none" stroke="${LINE}" stroke-width="8" stroke-linecap="round"/><path d="M0 -48 C-3 -62 10 -68 13 -58 C15 -50 5 -47 5 -54" fill="none" stroke="${wood}" stroke-width="4.5" stroke-linecap="round"/><path d="M-3 -40 q-8 -2 -9 -8 q7 0 9 8 z" fill="#6fdc6f" stroke="${LINE}" stroke-width="1.5"/>`;
      case 'censer': return `<path d="M0 0 V22" stroke="${LINE}" stroke-width="2.5" stroke-dasharray="3 2"/><path d="M-9 26 Q0 20 9 26 L7 36 Q0 41 -7 36 Z" fill="${rar && rar !== 'common' ? m : '#c58a45'}" ${WS}/><path d="M-4 22 Q0 18 4 22" fill="none" stroke="${LINE}" stroke-width="2"/><circle cx="-4" cy="14" r="3" fill="rgba(235,235,245,.55)"/><circle cx="2" cy="8" r="4" fill="rgba(235,235,245,.45)"/><circle cx="-1" cy="0" r="3.4" fill="rgba(235,235,245,.35)"/>`;
      // 20.10: оружие новых классов (Разбойник, Некромант, Паладин). Другие стили, где своего рисунка нет, берут эти (gearArt → «Легион»)
      case 'kris': {   // волнистый кинжал разбойника
        const gem = rar && rar !== 'common' ? `<circle cy="-1.5" r="2.4" fill="${RARITY[rar]}" stroke="${LINE}" stroke-width="1.5"/>` : '';
        return `<rect x="-2.5" y="2" width="5" height="11" rx="2" fill="#3a2a40" ${WS}/><circle cy="15" r="3.2" fill="${m}" ${WS}/>`
          + `<path d="M-3.5 -2 Q-6.5 -8 -2.5 -13 Q1.5 -18 -2.5 -24 Q-4.5 -30 0 -38 Q4.5 -30 3 -24 Q6.5 -18 2.5 -13 Q6.5 -8 3.5 -2 Z" fill="${m}" ${WS}/>`
          + `<path d="M0 -6 Q-2 -14 0 -22" fill="none" stroke="rgba(42,34,54,.35)" stroke-width="1.4"/><rect x="-9" y="-4" width="18" height="5" rx="2.5" fill="#5a4a6a" ${WS}/>${gem}`;
      }
      case 'skullstaff': {   // посох с черепом некроманта: глаза светятся цветом редкости
        const eye = (rar && RARITY[rar]) || '#9fffd0';
        return `<rect x="-2.5" y="-60" width="5" height="96" rx="2" fill="#4a3a2a" ${WS}/><path d="M-2.5 -40 l-6 -6 M2.5 -48 l6 -5" stroke="${LINE}" stroke-width="5" stroke-linecap="round"/><path d="M-2.5 -40 l-6 -6 M2.5 -48 l6 -5" stroke="#4a3a2a" stroke-width="2.4" stroke-linecap="round"/>`
          + `<path d="M0 -84 C-10 -84 -12 -76 -11 -70 C-10 -66 -7 -64 -6 -62 V-58 H6 V-62 C7 -64 10 -66 11 -70 C12 -76 10 -84 0 -84 Z" fill="#efe6d2" ${WS}/>`
          + `<ellipse cx="-4.5" cy="-72" rx="3" ry="3.4" fill="#2a2236"/><ellipse cx="4.5" cy="-72" rx="3" ry="3.4" fill="#2a2236"/><circle cx="-4.5" cy="-72" r="1.4" fill="${eye}"/><circle cx="4.5" cy="-72" r="1.4" fill="${eye}"/>`
          + `<path d="M-1.5 -66 l1.5 -3 l1.5 3 z" fill="#2a2236"/><path d="M-3 -60 v-2.5 M0 -60 v-2.5 M3 -60 v-2.5" stroke="#2a2236" stroke-width="1.4"/>`;
      }
      case 'grimoire': {   // гримуар: книга в руке, на обложке — череп-руна цветом редкости
        const rune = (rar && RARITY[rar]) || '#9fffd0';
        return `<path d="M0 0 V-6" stroke="${LINE}" stroke-width="2.5"/><rect x="-13" y="-34" width="26" height="30" rx="3" fill="#4a2a6a" ${WS}/><rect x="-13" y="-34" width="5" height="30" rx="2" fill="#2e1a44"/>`
          + `<path d="M11 -31 V-7" stroke="#efe6d2" stroke-width="2.4"/><rect x="9" y="-22" width="7" height="6" rx="1.5" fill="${m}" ${WS}/>`
          + `<circle cx="1.5" cy="-21" r="6" fill="none" stroke="${rune}" stroke-width="2"/><circle cx="-0.6" cy="-22" r="1.3" fill="${rune}"/><circle cx="3.6" cy="-22" r="1.3" fill="${rune}"/><path d="M-0.5 -17.5 h4" stroke="${rune}" stroke-width="1.4"/>`;
      }
      case 'holymace': {   // булава паладина: навершие-солнце, на редких — золото и камень
        const g = rar === 'legendary' || rar === 'epic' ? '#ffd76a' : m, gem = rar && rar !== 'common' ? RARITY[rar] : '#ffe9a8';
        let rays = ''; for (let i = 0; i < 8; i++) { const a2 = i * Math.PI / 4, x1 = Math.sin(a2) * 9, y1 = -46 - Math.cos(a2) * 9, x2 = Math.sin(a2) * 15, y2 = -46 - Math.cos(a2) * 15; rays += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${LINE}" stroke-width="6" stroke-linecap="round"/><path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${g}" stroke-width="3" stroke-linecap="round"/>`; }
        return `${grip(14, -36)}<rect x="-6" y="-38" width="12" height="5" rx="2" fill="${g}" ${WS}/>${rays}<circle cy="-46" r="10" fill="${g}" ${WS}/><circle cy="-46" r="4" fill="${gem}" stroke="${LINE}" stroke-width="1.5"/>`;
      }
      default: return '';
    }
  }
  // щит: центр в (0,0)
  function shield(kind, rar) {
    const m = METAL[rar] || METAL.common;
    switch (kind) {
      case 'scutum': return `<rect x="-13" y="-21" width="26" height="42" rx="6" fill="#a3122a" ${WS}/><rect x="-9" y="-17" width="18" height="34" rx="4" fill="none" stroke="#ffc94d" stroke-width="2"/><circle r="4.5" fill="#ffc94d" stroke="${LINE}" stroke-width="2"/>`;
      case 'round': return `<circle r="15" fill="#9a6a3a" ${WS}/><path d="M-14 -5 H14 M-14 5 H14" stroke="#6b4423" stroke-width="2"/><circle r="13" fill="none" stroke="${m}" stroke-width="2.5"/><circle r="4" fill="${m}" stroke="${LINE}" stroke-width="2"/>`;
      case 'buckler': return `<circle r="10" fill="${m}" ${WS}/><circle r="3" fill="#6d5a45"/>`;
      case 'barrel': return `<circle r="14" fill="#a0703a" ${WS}/><path d="M-13 -5 H13 M-13 4 H13" stroke="#6b4423" stroke-width="2"/><circle r="11.5" fill="none" stroke="#4a4a4f" stroke-width="2.5"/>`;
      default: return '';
    }
  }

  /* ── доспехи: сама вещь, без стойки (Кузня ставит её на манекен). Низ вещи на y = 0, центр x = 0, высота ~100 ──
     kind: 'lorica' | 'robe'; rar: common | rare | epic | legendary. На человечке (19.10) — свой рисунок по телу: doodle-core.js → wornArmor. */
  const ARMOR_RAR = { uncommon: '#4cc95a', rare: '#4aa3ff', epic: '#b06bff', legendary: '#ffb83d' };
  const O = (w) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  function armor(kind, rar) {
    if (kind === 'robe') return `
          <path d="M-22 -102 C-30 -70 -38 -30 -42 0 H42 C38 -30 30 -70 22 -102 Q0 -92 -22 -102 Z" fill="#5a2fa8" ${O(4)}/>
          <path d="M-8 -100 L0 -86 L8 -100" fill="none" stroke="#ffc94d" stroke-width="3"/><path d="M0 -86 V0" stroke="#ffc94d" stroke-width="3"/><path d="M-41 -6 H41" stroke="#ffc94d" stroke-width="4"/>
          <circle cx="-14" cy="-50" r="3" fill="#ffc94d"/><circle cx="14" cy="-36" r="2.5" fill="#ffc94d"/>`;
    const m = rar === 'common' ? '#a9b1b6' : ARMOR_RAR[rar];
    let bands = '';
    for (let i = 0; i < 5; i++) bands += `<path d="M${-30 + i} ${-70 + i * 13} Q0 ${-63 + i * 13} ${30 - i} ${-70 + i * 13}" fill="none" stroke="${INK}" stroke-width="2" opacity=".55"/>`;
    return `
        <path d="M-32 -96 C-36 -70 -32 -40 -26 -20 H26 C32 -40 36 -70 32 -96 Q0 -86 -32 -96 Z" fill="${m}" ${O(4)}/>${bands}
        <path d="M-44 -98 Q-34 -112 -14 -102 L-16 -84 Q-34 -86 -44 -78 Z M44 -98 Q34 -112 14 -102 L16 -84 Q34 -86 44 -78 Z" fill="${m}" ${O(3.5)}/>
        <path d="M-12 -100 Q0 -92 12 -100" fill="none" stroke="#a3122a" stroke-width="4"/>`;
  }

  /* ── ауры (редкая косметика): свечение за телом, искры, нимб — анимация встроена в SVG (SMIL), без CSS ── */
  const AURA = { gold: ['#ffd76a', '#ffb83d'], sparks: ['#fff6c8', '#ffd76a'], halo: ['#ffe27a', '#ffe27a'], shadow: ['#a24bff', '#3a0f66'], frost: ['#bfe8ff', '#6fb8ff'] };
  function aura(kind, k) {
    const b = k.b, seed = k.seed;
    const c = AURA[kind]; if (!c) return { back: '', front: '' };
    const id = k.uid('jlA'), d0 = ((seed >>> 0) % 997) / 997 * 2;
    const cx = 60, cy = (b.top + 170) / 2 + 2, rx = (b.R - b.L) / 2 + 46, ry = (170 - b.top) / 2 + 42;
    let back = '', front = '';
    const glow = (op1, op2, dur) => `<defs><radialGradient id="${id}"><stop offset=".3" stop-color="${c[0]}" stop-opacity="1"/><stop offset=".62" stop-color="${c[1]}" stop-opacity=".7"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient></defs>`
      + `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"><animate attributeName="opacity" values="${op1};${op2};${op1}" dur="${dur}s" begin="-${d0.toFixed(2)}s" repeatCount="indefinite"/></ellipse>`;
    // частицы, поднимающиеся вверх вокруг тела
    const motes = (n, col, shape, size) => Array.from({ length: n }, (_, i) => {
      const x = b.L - 8 + ((i * 37 + (seed >>> (i % 8))) % (b.R - b.L + 16)), y0 = 168 - (i * 23) % 40, dur = 1.8 + (i % 4) * 0.45, beg = ((i * 0.53 + d0) % dur).toFixed(2);
      const sh = shape === 'star' ? `<path d="M0 ${-size} L${size * 0.3} ${-size * 0.3} L${size} 0 L${size * 0.3} ${size * 0.3} L0 ${size} L${-size * 0.3} ${size * 0.3} L${-size} 0 L${-size * 0.3} ${-size * 0.3} Z" fill="${col}"/>` : shape === 'flake' ? `<path d="M0 ${-size} V${size} M${-size} 0 H${size} M${-size * 0.7} ${-size * 0.7} L${size * 0.7} ${size * 0.7} M${size * 0.7} ${-size * 0.7} L${-size * 0.7} ${size * 0.7}" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>` : `<circle r="${size}" fill="${col}"/>`;
      return `<g opacity="0"><animateTransform attributeName="transform" type="translate" values="${x} ${y0};${x + (i % 2 ? 6 : -6)} ${y0 - 70}" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.2;.7;1" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/>${sh}</g>`;
    }).join('');
    if (kind === 'gold') { back = glow(0.7, 1, 2.4); front = motes(9, '#ffe9a0', 'dot', 2.6); }
    else if (kind === 'sparks') { back = glow(0.25, 0.45, 2); front = motes(12, '#fff6c8', 'star', 5); }
    else if (kind === 'shadow') { back = glow(0.75, 1, 1.6); front = motes(11, '#c48bff', 'dot', 3.2); }
    else if (kind === 'frost') { back = glow(0.6, 0.95, 2.8); front = motes(10, '#e6f7ff', 'flake', 4.4); }
    else if (kind === 'halo') {
      const t = (b.square ? b.top - 6 : b.top) - 36;
      front = `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="2.2s" begin="-${d0.toFixed(2)}s" repeatCount="indefinite"/>`
        + `<ellipse cx="60" cy="${t}" rx="19" ry="5.5" fill="none" stroke="#fff3b0" stroke-width="9" opacity=".35"/><ellipse cx="60" cy="${t}" rx="19" ry="5.5" fill="none" stroke="#ffe27a" stroke-width="4"><animate attributeName="stroke-opacity" values=".75;1;.75" dur="1.6s" repeatCount="indefinite"/></ellipse></g>`;
    }
    return { back, front };
  }

  const blushSvg = (k) => `<circle cx="${60 - k.ex - 9}" cy="${k.ey + 9}" r="4" fill="#ff7aa2" opacity=".6"/><circle cx="${60 + k.ex + 9}" cy="${k.ey + 9}" r="4" fill="#ff7aa2" opacity=".6"/>`;
  const OUT = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;

  D.addStyle({
    id: 'legion',
    hw: { line: LINE, ink: INK, sw: 4, face: INK },   // HW: токены для деталей «Ночи Тыквенной Луны» (doodle-core.js → hwHats / hwAcc / hwEyes)
    name: 'Легион',
    // CSS для классов внутри рисунка (виджеты уже содержат эти правила; новому стилю — свои)
    css: `.jl-doodle .ln{fill:none;stroke:${LINE};stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round}.jl-doodle .body{stroke:${LINE};stroke-width:4.5;stroke-linejoin:round}.jl-doodle .face:not([fill]){fill:none}.jl-doodle .face{stroke:${INK};stroke-width:3.5;stroke-linecap:round}.jl-doodle .eye{fill:${INK}}`,

    // цвета «по нику»: ровно 4 вызова r() в этом порядке
    palette(r) {
      const hue = Math.floor(r() * 360);
      const fill = `hsl(${hue} ${60 + Math.floor(r() * 25)}% ${64 + Math.floor(r() * 12)}%)`, c2 = `hsl(${(hue + 140 + Math.floor(r() * 80)) % 360} 75% 58%)`;
      return { fill, c2 };
    },
    bodies,
    // разметка лица и плеч по телу: ex — полурасстояние между глазами, ey — линия глаз, my — линия рта, sx — точки плеч
    frame(b) {
      return { L: b.L, R: b.R, ex: b.narrow ? 8 : 10, ey: b.eyeY, my: b.eyeY + 14, sx: { l: b.L + (b.square ? 4 : 6), r: b.R - (b.square ? 4 : 6) } };
    },
    body: (k) => `<path class="body" fill="${k.fill}" d="${k.b.d}"/>`,

    // ── лицо ──
    eyePool: ['dots', 'dots', 'big', 'happy', 'sleepy', 'cyclops', 'stars', 'wide'],   // случайный выбор по нику (не менять — сменятся глаза у всех)
    eyes(kind, k) {
      const { ex, ey } = k;
      if (kind === 'dots') return `<circle class="eye" cx="${60 - ex}" cy="${ey}" r="4"/><circle class="eye" cx="${60 + ex}" cy="${ey}" r="4"/>`;
      if (kind === 'big') return `<circle cx="${60 - ex}" cy="${ey}" r="7" fill="#fff" class="face"/><circle cx="${60 + ex}" cy="${ey}" r="7" fill="#fff" class="face"/><circle class="eye" cx="${60 - ex + 1}" cy="${ey + 1}" r="3"/><circle class="eye" cx="${60 + ex + 1}" cy="${ey + 1}" r="3"/>`;
      if (kind === 'cyclops') return `<circle cx="60" cy="${ey}" r="10" fill="#fff" class="face"/><circle class="eye" cx="61" cy="${ey + 1}" r="4.5"/>`;
      if (kind === 'stars') return [60 - ex, 60 + ex].map((x) => `<path class="face" d="M${x - 4} ${ey} h8 M${x} ${ey - 4} v8 M${x - 3} ${ey - 3} l6 6 M${x + 3} ${ey - 3} l-6 6"/>`).join('');
      return `<path class="face" d="M${60 - ex - 4} ${ey + 1} q4 -6 8 0 M${60 + ex - 4} ${ey + 1} q4 -6 8 0"/>`;   // happy, sleepy, wide
    },
    mouthPool: ['open', 'grin', 'tongue'],
    mouth(kind, k) {
      const my = k.my;
      if (kind === 'open') return `<path class="face" d="M50 ${my - 2} q10 14 20 0 z" fill="${INK}"/>`;
      if (kind === 'grin') return `<path class="face" d="M50 ${my - 3} h20 q-2 10 -10 10 q-8 0 -10 -10 z" fill="#fff"/>`;
      return `<path class="face" d="M50 ${my - 2} q10 10 20 0"/><path d="M57 ${my + 2} q3 7 6 0 z" fill="#ff6b8a"/>`;
    },
    // лица настроений: { eyes, mouth }
    faces: {
      sad(k) {   // грустные глаза у всех одинаково узнаваемы: точки + бровки домиком, слеза
        const { ex, ey, my } = k;
        const eyes = (k.eyesKind === 'cyclops'
          ? `<circle cx="60" cy="${ey}" r="10" fill="#fff" class="face"/><circle class="eye" cx="60" cy="${ey + 3}" r="4.5"/><path class="face" d="M48 ${ey - 13} q12 -8 24 0"/>`
          : `<circle class="eye" cx="${60 - ex}" cy="${ey + 1}" r="4"/><circle class="eye" cx="${60 + ex}" cy="${ey + 1}" r="4"/><path class="face" d="M${60 - ex - 6} ${ey - 7} l9 -4 M${60 + ex + 6} ${ey - 7} l-9 -4"/>`)
          + `<path class="tear" d="M${60 + ex + 4} ${ey + 6} q-3 6 0 8 q3 -2 0 -8 z" fill="#7cc8ff" stroke="${LINE}" stroke-width="1.5"/>`;
        return { eyes, mouth: `<path class="face" d="M51 ${my + 4} q9 -8 18 0"/>` };
      },
      chill(k) {   // блаженство: глаза-дужки, мечтательная улыбка
        const { ex, ey, my } = k;
        return { eyes: k.cyc ? `<path class="face" d="M51 ${ey + 1} q9 -7 18 0"/>` : `<path class="face" d="M${60 - ex - 5} ${ey + 1} q5 -5 10 0 M${60 + ex - 5} ${ey + 1} q5 -5 10 0"/>`, mouth: `<path class="face" d="M51 ${my} q9 8 18 0"/>` };
      },
      stern(k) {   // суровое: брови сведены вниз, губы сжаты
        const { ex, ey, my } = k;
        return { eyes: k.cyc ? `<circle cx="60" cy="${ey}" r="10" fill="#fff" class="face"/><circle class="eye" cx="60" cy="${ey + 2}" r="4.5"/><path class="face" d="M47 ${ey - 13} l13 5 l13 -5"/>`
          : `<circle class="eye" cx="${60 - ex}" cy="${ey + 1}" r="4"/><circle class="eye" cx="${60 + ex}" cy="${ey + 1}" r="4"/><path class="face" d="M${60 - ex - 7} ${ey - 9} l10 4 M${60 + ex + 7} ${ey - 9} l-10 4"/>`, mouth: `<path class="face" d="M51 ${my + 3} q9 -4 18 0"/>` };
      },
      hurt(k) {   // раненое: один глаз крестиком, второй прищурен, рот кривой
        const { ex, ey, my } = k;
        return { eyes: k.cyc ? `<circle cx="60" cy="${ey}" r="10" fill="#fff" class="face"/><path class="face" d="M51 ${ey + 1} q9 -5 18 0"/><circle class="eye" cx="60" cy="${ey + 3}" r="3"/>`
          : `<path class="face" d="M${60 - ex - 4} ${ey - 4} l8 8 M${60 - ex + 4} ${ey - 4} l-8 8"/><circle class="eye" cx="${60 + ex}" cy="${ey + 1}" r="3.4"/><path class="face" d="M${60 + ex + 7} ${ey - 7} l-9 -3"/>`, mouth: `<path class="face" d="M50 ${my + 2} q5 -5 10 0 q5 5 10 0"/>` };
      },
    },
    blushChance: 0.6,
    blush: blushSvg,
    // раненый: пластырь крестом на макушке, синяк на щеке
    hurt(k) {
      const b = k.b, px = 60 + b.hw * 0.45, py = (b.square ? b.top + 8 : b.top + 12);
      return `<g transform="rotate(35 ${px} ${py})"><rect x="${px - 10}" y="${py - 3.5}" width="20" height="7" rx="2" fill="#f1d9b5" stroke="${INK}" stroke-width="1.6"/><rect x="${px - 3.5}" y="${py - 10}" width="7" height="20" rx="2" fill="#f1d9b5" stroke="${INK}" stroke-width="1.6"/></g>`
        + `<circle cx="${60 - k.ex - 8}" cy="${k.ey + 10}" r="5" fill="#8a5ab8" opacity=".45"/>`;
    },

    // ── шапки ──
    // исходный список шапок: по нему выбирается шапка «по нику» (новые сюда не добавлять — иначе у всех сменятся шапки)
    hatPool: ['none', 'tuft', 'cap', 'bow', 'horns', 'crown', 'tophat', 'party', 'wizard', 'antenna', 'antenna2', 'cat', 'bunny', 'halo', 'sprout', 'bandana'],
    hatNoneChance: 0.18,
    hats,

    // ── руки ──
    arms: {
      // руки вверх (радость). Классы armL/armR и transform-origin нужны анимациям виджетов
      up(k) {
        const b = k.b, sx = k.sx;
        const lh = { x: k.L - 16, y: 34 + (b.top > 90 ? 10 : 0) }, rh = { x: k.R + 16, y: 34 + (b.top > 90 ? 10 : 0) };
        const arm = (s, h) => `<path class="ln" d="M${s} ${b.armY} C${s + (h.x - s) * 0.2} ${b.armY - 30} ${h.x} ${h.y + 34} ${h.x} ${h.y}"/><path class="ln" d="M${h.x} ${h.y} l-7 -11 M${h.x} ${h.y} l0 -13 M${h.x} ${h.y} l7 -11"/>`;
        return `<g class="arm armL" style="transform-origin:${sx.l}px ${b.armY}px">${arm(sx.l, lh)}</g><g class="arm armR" style="transform-origin:${sx.r}px ${b.armY}px">${arm(sx.r, rh)}</g>`;
      },
      // руки вдоль тела (грусть, отдых, бой без снаряжения). Классы sadL/sadR
      down(k) {
        const b = k.b, sx = k.sx;
        const arm = (s, dir) => `<path class="ln" d="M${s} ${b.armY} C${s + dir * 10} ${b.armY + 14} ${s + dir * 12} ${b.armY + 30} ${s + dir * 9} ${Math.min(162, b.armY + 44)}"/><circle cx="${s + dir * 9}" cy="${Math.min(162, b.armY + 44) + 3}" r="5.5" fill="${k.fill}" class="body"/>`;
        return `<g class="arm sadL">${arm(sx.l, -1)}</g><g class="arm sadR">${arm(sx.r, 1)}</g>`;
      },
      // боевая стойка: правая рука держит оружие сбоку, левая — щит (или кулак) перед телом. Классы batL/batR
      armed(k) {
        const b = k.b, sx = k.sx;
        const hr = { x: k.R + 15, y: b.armY + 12 }, hl = { x: k.L - 7, y: b.armY + 20 };
        const svg = `<g class="arm batL"><path class="ln" d="M${sx.l} ${b.armY} C${sx.l - 8} ${b.armY + 6} ${hl.x + 2} ${hl.y - 8} ${hl.x} ${hl.y}"/></g><g class="arm batR"><path class="ln" d="M${sx.r} ${b.armY} C${sx.r + 8} ${b.armY + 4} ${hr.x - 2} ${hr.y - 8} ${hr.x} ${hr.y}"/></g>`;
        return { svg, right: hr, left: hl };
      },
    },
    hand: (k, x, y) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${k.fill}" class="body"/>`,
    // как держать снаряжение в боевой стойке
    hold: { weaponScale: 1.22, weaponRot: (kind) => (kind === 'bow' || kind === 'censer' || kind === 'grimoire' ? 0 : 12), shieldScale: 1.15, shieldDx: 6, shieldDy: 2 },
    weapon,
    shield,
    armor,   // необязательно: без неё рисуются доспехи «Легиона»
    wear: { line: LINE, ink: INK },   // 19.10: обводка надетых доспехов и амулета (рисует скелет, doodle-core.js)
    rarityGlow: RARITY,
    gearGlow: (id, color) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="3.4" flood-color="${color}" flood-opacity="1"/></filter>`,
    // предметы в руке на отдыхе (extra.hold). rot — компенсировать наклон человечка, чтобы бокал стоял ровно
    held: {
      cocktail(k, rot) {
        const hy = Math.min(162, k.b.armY + 44) + 3, hx = k.sx.r + 9;
        return `<g transform="translate(${hx} ${hy}) rotate(${rot})"><g class="jd-cocktail">`
          + `<path d="M-1.5 0 V-10" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/><path d="M-7 1 h11" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/>`
          + `<path d="M-14 -26 L12 -26 L-1 -10 Z" fill="rgba(220,240,255,.55)" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>`
          + `<path d="M-11 -23 L9 -23 L-1 -12 Z" fill="#ff8a5c"/><path d="M-11 -23 L9 -23 L7 -21 L-9 -21 Z" fill="#ffd34d"/>`
          + `<path d="M4 -24 L12 -44" stroke="#e8455c" stroke-width="2.6" stroke-linecap="round"/>`
          + `<path d="M-12 -34 Q-6 -46 2 -34 Z" fill="#4ab0ff" stroke="${LINE}" stroke-width="1.8" stroke-linejoin="round"/><path d="M-5 -37 L-3 -24" stroke="${LINE}" stroke-width="1.6"/>`
          + `<circle cx="9" cy="-26" r="5" fill="#ffe27a" stroke="${LINE}" stroke-width="2"/><path d="M9 -31 V-21 M4 -26 H14" stroke="#e8b923" stroke-width="1.2"/>`
          + `</g></g><circle cx="${hx}" cy="${hy}" r="5.5" fill="${k.fill}" class="body"/>`;
      },
    },

    // ── аксессуары Костюмерной ──
    // 19.10: «Плащ первопроходца» (награда): тёмно-синий дорожный плащ с рваным краем, обводка — как у тел
    pioneer: { cloak: '#2c4a6e', lining: '#bfe3ff', line: LINE, ink: INK, w: 4, hem: 'zig', clasp: 'star' },
    capeColor: '#c0182b',   // цвет плаща, если зритель не выбрал свой
    acc: {
      cape(k, col) {   // плащ — за телом, от плеч до земли
        const L = k.L, R = k.R, t = k.b.armY - 8;
        return `<path d="M${L + 6} ${t} C${L - 12} ${t + 30} ${L - 20} 150 ${L - 18} 168 L${R + 18} 168 C${R + 20} 150 ${R + 12} ${t + 30} ${R - 6} ${t} Z" fill="${col}" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>`
          + `<path d="M${L + 4} ${t + 2} Q60 ${t + 14} ${R - 4} ${t + 2}" fill="none" stroke="#ffc94d" stroke-width="4" stroke-linecap="round"/>`;
      },
      bowtie(k, col) {   // бабочка под ртом
        const y = k.my + 14;
        return `<path d="M60 ${y} l-11 -7 l0 14 z M60 ${y} l11 -7 l0 14 z" fill="${col}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="60" cy="${y}" r="3" fill="${INK}"/>`;
      },
      glasses(k) {
        const { ex, ey } = k;
        return k.cyc ? `<circle cx="60" cy="${ey}" r="14" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="3"/>`
          : `<circle cx="${60 - ex}" cy="${ey}" r="8.5" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="3"/><circle cx="${60 + ex}" cy="${ey}" r="8.5" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="3"/><path d="M${60 - ex + 8} ${ey - 1} q${ex - 8} -5 ${2 * ex - 16} 0" fill="none" stroke="${INK}" stroke-width="3"/>`;
      },
      shades(k) {
        const { ex, ey } = k;
        return k.cyc ? `<rect x="44" y="${ey - 8}" width="32" height="15" rx="6" fill="${INK}"/><path d="M48 ${ey - 4} l6 0" stroke="#fff" stroke-width="2" opacity=".6"/>`
          : `<path d="M${60 - ex - 10} ${ey - 6} h${2 * ex + 20} v4 q0 9 -9 9 q-7 0 -${ex - 2} -8 h-2 q-${ex - 4} 8 -${ex - 2} 8 q-9 0 -9 -9 z" fill="${INK}"/><path d="M${60 - ex - 6} ${ey - 3} l5 0" stroke="#fff" stroke-width="2" opacity=".6"/>`;
      },
      monocle(k) {
        const { ex, ey } = k, cyc = k.cyc, x = cyc ? 60 : 60 + ex;
        return `<circle cx="${x}" cy="${ey}" r="${cyc ? 13 : 8.5}" fill="rgba(255,255,255,.2)" stroke="#ffc94d" stroke-width="3"/><path d="M${x + (cyc ? 9 : 6)} ${ey + (cyc ? 10 : 6)} q6 14 -2 30" fill="none" stroke="#ffc94d" stroke-width="1.8"/>`;
      },
      mustache(k) {
        const my = k.my;
        return `<path d="M60 ${my - 4} c-4 -5 -12 -6 -17 -1 c-3 3 -7 3 -9 0 c2 7 12 9 18 5 c4 -2 6 -3 8 -4 c2 1 4 2 8 4 c6 4 16 2 18 -5 c-2 3 -6 3 -9 0 c-5 -5 -13 -4 -17 1 z" fill="#3a2410" stroke="#3a2410" stroke-width="1.5" stroke-linejoin="round"/>`;
      },
      scarf(k, col) {
        const L = k.L, R = k.R, y = k.my + 12;
        return `<path d="M${L + 4} ${y - 3} Q60 ${y + 9} ${R - 4} ${y - 3} L${R - 3} ${y + 7} Q60 ${y + 19} ${L + 3} ${y + 7} Z" fill="${col}" ${OUT}/><path d="M${R - 16} ${y + 8} l3 26 l10 -2 l-3 -26 z" fill="${col}" ${OUT}/><path d="M${R - 14} ${y + 30} l2 5 M${R - 10} ${y + 30} l2 5 M${R - 6} ${y + 29} l2 5" stroke="${INK}" stroke-width="1.8"/>`;
      },
      tie(k, col) {
        const y = k.my + 11;
        return `<path d="M55 ${y} h10 l-2 6 h-6 z" fill="${col}" ${OUT}/><path d="M57 ${y + 6} h6 l5 30 l-8 8 l-8 -8 z" fill="${col}" ${OUT}/><path d="M57 ${y + 14} l6 -4 M56 ${y + 22} l8 -5 M55 ${y + 30} l10 -6" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
      },
    },

    // ── наряды событий (корона «Тцаря дня», парик судьи, тюремная роба) ──
    event: {
      crown(k, size) {   // корона вместо шапки: 'big' | 'mini'
        const b = k.b, kk = size === 'mini' ? 0.7 : 1, t = b.top + (b.square ? -1 : 4), w = 16 * kk, h = 20 * kk;
        return `<path d="M${60 - w} ${t} l0 ${-h} l${w / 2} ${h * 0.45} l${w / 2} ${-h * 0.7} l${w / 2} ${h * 0.7} l${w / 2} ${-h * 0.45} l0 ${h} z" fill="#ffc94d" stroke="${LINE}" stroke-width="${3.5 * kk}" stroke-linejoin="round"/>`
          + `<circle cx="60" cy="${t - h * 0.35}" r="${3 * kk}" fill="#e8455c"/><circle cx="${60 - w * 0.55}" cy="${t - h * 0.2}" r="${2.2 * kk}" fill="#4ab0ff"/><circle cx="${60 + w * 0.55}" cy="${t - h * 0.2}" r="${2.2 * kk}" fill="#6fdc6f"/>`;
      },
      wig(k) {   // парик судьи: кудри поверх головы и по бокам
        const b = k.b, t = b.square ? b.top - 4 : b.top, hw = b.hw, cs = [];
        for (let i = -3; i <= 3; i++) cs.push(`<circle cx="${60 + i * hw / 3.1}" cy="${t + 3 - (3 - Math.abs(i)) * 2.2}" r="9.5"/>`);
        for (let j = 1; j <= 4; j++) { cs.push(`<circle cx="${60 - hw - 7}" cy="${t + 4 + j * 13}" r="9"/>`); cs.push(`<circle cx="${60 + hw + 7}" cy="${t + 4 + j * 13}" r="9"/>`); }
        return `<g fill="#f4f1ea" stroke="#9a9488" stroke-width="2.5">${cs.join('')}</g>`;
      },
    },
    // тюремная роба: полоски ниже рта, поверх — воротник и контур тела
    uniform(k) {
      const u = k.uid('jlU'), y0 = k.my + 11, d = k.b.d;
      return `<defs><clipPath id="${u}c"><path d="${d}"/></clipPath><pattern id="${u}p" patternUnits="userSpaceOnUse" width="120" height="16" patternTransform="rotate(-4)"><rect width="120" height="16" fill="#f1efe8"/><rect y="8" width="120" height="8" fill="#23212b"/></pattern></defs>`
        + `<g clip-path="url(#${u}c)"><rect x="0" y="${y0}" width="120" height="${170 - y0}" fill="url(#${u}p)"/><path d="M0 ${y0} H120" stroke="#23212b" stroke-width="4"/>`
        + `<path d="M48 ${y0} l12 9 l12 -9" fill="#f1efe8" stroke="#23212b" stroke-width="2.5" stroke-linejoin="round"/></g>`
        + `<path class="body" fill="none" d="${d}"/>`;
    },

    // ── призрак (погиб в Походе): той же формы, полупрозрачный, низ «рваный», глаза и рот — тёмные овалы, плавно парит ──
    // parts.arms — руки, parts.head — шапка/корона/парик. Возвращает { style — для <svg style>, inner — содержимое }
    ghost(k, parts) {
      const g = k.uid('jlG'), cyc = k.cyc, GI = '#2a2f55', { ex, ey, my } = k;
      let wave = 'M-20 190 V160'; for (let x = -20; x < 140; x += 12) wave += ' q6 -9 12 0'; wave += ' V190 Z';
      const gEyes = cyc ? `<ellipse cx="60" cy="${ey}" rx="7" ry="9" fill="${GI}"/>` : `<ellipse cx="${60 - ex}" cy="${ey}" rx="4.6" ry="6.6" fill="${GI}"/><ellipse cx="${60 + ex}" cy="${ey}" rx="4.6" ry="6.6" fill="${GI}"/>`;
      const gMouth = `<ellipse cx="60" cy="${my + 1}" rx="4.2" ry="${k.sad ? 3 : 5.6}" fill="${GI}"/>`;
      const fl = (k.seed % 1000) / 1000 * 2.6;
      return {
        style: 'filter:drop-shadow(0 0 7px rgba(190,210,255,.75))',
        inner: `<defs><mask id="${g}" maskUnits="userSpaceOnUse" x="-60" y="-80" width="240" height="280"><rect x="-60" y="-80" width="240" height="280" fill="#fff"/><path d="${wave}" fill="#000"/></mask></defs>`
          + `<g opacity=".8"><animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.6s" begin="-${fl.toFixed(2)}s" repeatCount="indefinite"/>`
          + `<g mask="url(#${g})">${parts.arms}<path class="body" fill="rgba(228,236,255,.62)" d="${k.b.d}"/></g>${gEyes}<g class="jd-mouth">${gMouth}</g>${parts.head}</g>`,
      };
    },

    aura,
  });
})();

} catch (e) { console.error('[стили] styles/legion/characters.js не загрузился:', e); }

/* ───── стиль «legion»: styles/legion/goods.js ───── */
try {
/* Стиль «Легион» — товары (часть 'goods'): еда, зелья и свиток — как их рисуют лавка Похода и сайт.
   Договор: MDDoodle.addPart('<стиль>', 'goods', () => ({ food: { id: () => svg }, potion: (it) => svg, scroll: (it) => svg })).
   Низ вещи — y = 0, ширина около 60–70. Нет своей части у стиля — берутся эти (Легион). */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('legion', 'goods', function () {
    const INK = '#2a2236', OL = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const f1 = (v) => Math.round(v * 10) / 10;
    const FOOD = {
      apple: () => `<circle cy="-16" r="16" fill="#e8455c" ${OL()}/><path d="M0 -31 q2 -8 7 -10" stroke="#6b4423" stroke-width="3.4" fill="none"/><path d="M4 -34 q10 -8 14 0 q-8 6 -14 0Z" fill="#6fdc6f" ${OL(2)}/><circle cx="-6" cy="-21" r="4" fill="#fff" opacity=".5"/>`,
      pear: () => `<path d="M0 -42 C-8 -42 -8 -28 -12 -22 C-22 -10 -16 0 0 0 C16 0 22 -10 12 -22 C8 -28 8 -42 0 -42Z" fill="#c8dc5a" ${OL()}/><path d="M0 -42 q1 -6 5 -9" stroke="#6b4423" stroke-width="3" fill="none"/><circle cx="-6" cy="-14" r="3.5" fill="#fff" opacity=".45"/>`,
      pretzel: () => `<circle cy="-20" r="19" fill="none" stroke="${INK}" stroke-width="13"/><circle cy="-20" r="19" fill="none" stroke="#d9993f" stroke-width="8"/>${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${f1(Math.cos(a * Math.PI / 180) * 19)}" cy="${f1(-20 + Math.sin(a * Math.PI / 180) * 19)}" r="1.4" fill="#fff6df"/>`).join('')}`,
      bread: () => `<path d="M-32 0 C-36 -30 36 -30 32 0 Z" fill="#d9993f" ${OL(3.4)}/><path d="M-16 -18 l7 9 M-2 -21 l7 9 M12 -18 l6 8" stroke="#8a5a2b" stroke-width="3.4" stroke-linecap="round"/>`,
      kvass: () => `<rect x="-14" y="-40" width="28" height="40" rx="4" fill="#8a4a1c" ${OL()}/><path d="M14 -32 q14 0 14 12 q0 12 -14 12" fill="none" stroke="${INK}" stroke-width="7"/><path d="M14 -32 q14 0 14 12 q0 12 -14 12" fill="none" stroke="#a0703a" stroke-width="3"/><path d="M-16 -40 q4 -10 12 -6 q6 -8 14 -2 q8 -2 6 8 Z" fill="#fff6df" ${OL(2.4)}/><path d="M-14 -26 H14 M-14 -12 H14" stroke="#5a2a10" stroke-width="2.4"/>`,
      cheese: () => `<path d="M-30 0 H30 V-28 L-30 -12 Z" fill="#ffd34d" ${OL(3.4)}/><circle cx="-8" cy="-8" r="4" fill="#e8b923"/><circle cx="14" cy="-14" r="3.4" fill="#e8b923"/><circle cx="20" cy="-5" r="2.4" fill="#e8b923"/>`,
      pie: () => `<path d="M-34 0 L-29 -16 H29 L34 0 Z" fill="#d9993f" ${OL(3.4)}/><path d="M-28 -16 q28 -18 56 0" fill="#e8a23a" ${OL(3)}/><path d="M-14 -22 l6 -4 M2 -25 l6 -3 M14 -21 l5 -3" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round"/>`,
      ham: () => `<path d="M-30 0 C-38 -34 12 -44 28 -16 C32 -6 22 4 -30 0 Z" fill="#e88a7a" ${OL(3.4)}/><path d="M-20 -8 C-20 -24 4 -30 16 -16" fill="none" stroke="#fff3ea" stroke-width="3"/><path d="M24 -14 l16 -12" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M24 -14 l16 -12" stroke="#fff6df" stroke-width="5" stroke-linecap="round"/>`,
      roast: () => `<ellipse cx="-4" cy="-18" rx="30" ry="18" fill="#c8742a" ${OL(3.4)}/><path d="M18 -26 l16 -10 M20 -12 l16 2" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M18 -26 l16 -10 M20 -12 l16 2" stroke="#fff6df" stroke-width="4.5" stroke-linecap="round"/><path d="M-24 -22 q10 -10 26 -8" stroke="#ffd27a" stroke-width="3" fill="none" opacity=".7"/><path d="M-40 0 H34" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
      honey_cake: () => `<ellipse cy="-8" rx="30" ry="9" fill="#c8742a" ${OL(3)}/><ellipse cy="-14" rx="28" ry="9" fill="#e8a23a" ${OL(3)}/><path d="M-14 -16 q6 6 2 12 M8 -18 q4 6 0 12" stroke="#ffc94d" stroke-width="4" stroke-linecap="round" fill="none"/>`,
      sage_tea: () => `<path d="M-18 -30 H18 L14 -4 Q0 2 -14 -4 Z" fill="#efe6d0" ${OL()}/><ellipse cy="-30" rx="18" ry="5" fill="#8fbf6a" ${OL(2.4)}/><path d="M17 -24 q12 2 8 12 q-3 6 -11 4" fill="none" stroke="${INK}" stroke-width="3.4"/><path d="M-6 -40 q-6 -8 0 -14 M6 -40 q-6 -8 0 -14" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/><path d="M-30 0 H30" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
      spicy_stew: () => `<path d="M-30 -24 H30 Q30 4 0 4 Q-30 4 -30 -24Z" fill="#6d5a45" ${OL(3.4)}/><ellipse cy="-24" rx="30" ry="6" fill="#d8482a" ${OL(2.6)}/><path d="M-10 -24 l6 -2 M8 -26 l5 2" stroke="#6fdc6f" stroke-width="3"/><path d="M14 -30 q2 -10 10 -8 q-2 8 -10 8Z" fill="#e8455c" ${OL(2)}/><path d="M-12 -34 q-5 -8 0 -14 M2 -34 q-5 -8 0 -14" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`,
    };
    const potion = (big, c) => big
      ? `<path d="M-6 -50 V-40 C-26 -32 -26 0 0 0 C26 0 26 -32 6 -40 V-50 Z" fill="${c}" ${OL(3.4)}/><rect x="-8" y="-58" width="16" height="10" rx="2" fill="#a0703a" ${OL(2.6)}/><path d="M-14 -20 q5 -9 11 -4" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/><path d="M-18 -18 Q0 -10 18 -18" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>`
      : `<path d="M-5 -36 V-28 L-14 -18 V0 H14 V-18 L5 -28 V-36 Z" fill="${c}" ${OL(3.2)}/><rect x="-7" y="-43" width="14" height="9" rx="2" fill="#a0703a" ${OL(2.4)}/><path d="M-9 -14 v8" stroke="#fff" stroke-width="3" opacity=".55" stroke-linecap="round"/>`;
    const scroll = () => `<rect x="-26" y="-40" width="52" height="34" fill="#f2e2b8" ${OL(3)}/><path d="M-18 -30 H18 M-18 -22 H12 M-18 -14 H16" stroke="#a0703a" stroke-width="2.4"/><rect x="-32" y="-46" width="10" height="46" rx="5" fill="#e8d4a0" ${OL(3)}/><rect x="22" y="-46" width="10" height="46" rx="5" fill="#e8d4a0" ${OL(3)}/><path d="M-4 -6 l-6 12 M4 -6 l6 12" stroke="#d84a3a" stroke-width="4" stroke-linecap="round"/><circle cy="-8" r="6" fill="#d84a3a" ${OL(2.2)}/>`;
    return {
      food: FOOD,
      potion: (it) => potion(/hp|big|больш/i.test(String(it.id) + (it.name || '')), /mana|ман/i.test(String(it.id)) ? '#4ab0ff' : '#e8455c'),
      scroll: () => scroll(),
    };
  });
})();

} catch (e) { console.error('[стили] styles/legion/goods.js не загрузился:', e); }

/* ───── стиль «legion»: styles/legion/hero.js ───── */
try {
/* Стиль «Легион» — карточки героя (модуль «Легионер»): карточка (!герой), сумка (!сумка), сцены «пал в бою», «воскрес», «новый уровень».
   Разметка карточек (какие блоки и классы) и анимации — в modules/legionary/client/widget.js, она одна на все стили.
   Стиль задаёт ВИД: CSS для этих классов, заголовки и цвета сцен, значки слотов и характеристик.
   Человечек на карточке рисуется выбранным стилем человечков сам. Договор — styles/README.md, раздел «Карточки героя». */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('legion', 'hero', function () {
    // весь вид карточек и сцен: классы .lg-box, .lg-card, .lg-scene и их части (см. README)
    const css = `/* «Легионер»: карточка героя, сумка, смерть / воскрешение / новый уровень */
.lg-box { position: absolute; inset: 0; pointer-events: none; font-family: 'Golos Text', 'Segoe UI', sans-serif; }
.lg-box .jl-doodle { width: 120px; height: 170px; overflow: visible; }
.lg-box .jl-doodle .ln { fill: none; stroke: #f5f2ff; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; }
.lg-box .jl-doodle .body { stroke: #f5f2ff; stroke-width: 4.5; stroke-linejoin: round; }
.lg-box .jl-doodle .face:not([fill]) { fill: none; }
.lg-box .jl-doodle .face { stroke: #15122e; stroke-width: 3.5; stroke-linecap: round; }
.lg-box .jl-doodle .eye { fill: #15122e; }
.lg-box .jl-doodle .tear { opacity: 0; }

/* ---------- карточка: боевая — тёмное железо, кровь и угли ---------- */
.lg-card { position: absolute; left: 0; bottom: 0; width: 540px; display: flex; gap: 14px; padding: 16px 18px 16px 10px; border-radius: 10px;
  background:
    repeating-linear-gradient(115deg, rgba(255,255,255,.018) 0 2px, transparent 2px 9px),
    radial-gradient(ellipse at 18% 110%, rgba(190,40,20,.38), transparent 55%),
    linear-gradient(165deg, #2a2a2e 0%, #17161a 45%, #0d0c0f 100%);
  border: 3px solid #050506;
  box-shadow: 0 0 0 2px #5b4a3a, 0 0 0 5px #141215, inset 0 1px 0 rgba(255,255,255,.08), inset 0 -30px 50px rgba(0,0,0,.55), 0 10px 22px rgba(0,0,0,.6);
  color: #e8e2d6; opacity: 0; transform: translateY(40px) scale(.94); transition: opacity .3s, transform .45s cubic-bezier(.3,1.4,.5,1); }
/* заклёпки по углам */
.lg-card::before, .lg-card::after { content: ''; position: absolute; top: 7px; width: 9px; height: 9px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #b9a88f, #4a3e31 70%); box-shadow: 0 1px 0 rgba(0,0,0,.8), 0 calc(100% + 0px) 0 transparent; }
.lg-card::before { left: 7px; } .lg-card::after { right: 7px; }
.lg-card.on { opacity: 1; transform: none; }
.lg-card.off { opacity: 0; transform: translateY(20px) scale(.97); transition: opacity .35s, transform .35s; }
/* призрак — холодная сталь, без огня */
.lg-card.ghost { background:
    repeating-linear-gradient(115deg, rgba(255,255,255,.02) 0 2px, transparent 2px 9px),
    radial-gradient(ellipse at 18% 110%, rgba(110,140,220,.28), transparent 55%),
    linear-gradient(165deg, #23283a 0%, #12141f 50%, #090a10 100%);
  box-shadow: 0 0 0 2px #4b5577, 0 0 0 5px #10121a, 0 0 26px rgba(140,165,255,.3), inset 0 -30px 50px rgba(0,0,0,.55), 0 10px 22px rgba(0,0,0,.6); }
.lg-card .pic { flex: none; width: 150px; display: flex; align-items: flex-end; justify-content: center; position: relative; border-radius: 6px;
  background: radial-gradient(ellipse at 50% 100%, rgba(220,70,30,.35), transparent 65%), linear-gradient(#0b0a0c, #19151a); box-shadow: inset 0 0 0 2px #050506, inset 0 0 18px rgba(0,0,0,.8); overflow: hidden; }
.lg-card.ghost .pic { background: radial-gradient(ellipse at 50% 100%, rgba(140,165,255,.3), transparent 65%), linear-gradient(#090a10, #151826); }
.lg-card .pic { justify-content: flex-start; padding-left: 10px; align-items: center; min-height: 188px; }   /* человечек всегда целиком и по центру, даже если сумка пустая */
.lg-card .info { justify-content: center; }
.lg-card .pic .jl-doodle { width: 120px; height: 170px; margin-bottom: 4px; }   /* справа — место под оружие в руке */
.lg-card .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.lg-card .nm { font: 400 30px 'Russo One', sans-serif; line-height: 1.05; color: #efe6d2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-shadow: 0 2px 0 #000, 0 0 12px rgba(200,50,30,.35); letter-spacing: .01em; }
.lg-card.ghost .nm { color: #cfd8f2; text-shadow: 0 2px 0 #000, 0 0 12px rgba(140,165,255,.4); }
.lg-card .role { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; color: #a89a86; text-transform: uppercase; letter-spacing: .08em; }
.lg-card .lvl { font: 400 14px 'Russo One', sans-serif; padding: 3px 10px 3px; color: #f3e2c4; letter-spacing: .04em;
  background: linear-gradient(#8e1b1b, #4f0c0c); border: 1.5px solid #050506; box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 0 0 1px #6d5a45;
  clip-path: polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%); }
.lg-card .xp { height: 8px; border-radius: 2px; background: #050506; box-shadow: inset 0 0 0 1px #3a3128; overflow: hidden; }
.lg-card .xp i { display: block; height: 100%; background: linear-gradient(90deg, #6e1010, #d2491d 70%, #ffb054); box-shadow: 0 0 8px rgba(255,120,40,.6); }
.lg-card.ghost .xp i { background: linear-gradient(90deg, #2c3970, #7d95e6); box-shadow: none; }
.lg-card .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 8px; margin-top: 2px; }
.lg-card .stats div { display: flex; align-items: center; gap: 7px; font-size: 15px; color: #b8ab98; padding: 5px 10px; border-radius: 4px;
  background: linear-gradient(#232026, #141217); box-shadow: inset 0 0 0 1px #050506, inset 0 1px 0 rgba(255,255,255,.06); }
.lg-card .stats b { font: 400 21px 'Russo One', sans-serif; margin-left: auto; color: #efe6d2; text-shadow: 0 2px 0 #000; }
.lg-card .gear { display: flex; flex-wrap: wrap; gap: 5px; font-size: 13px; color: #cfc4b2; }
.lg-card .gear span { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 3px; background: #0f0e11; border: 1px solid #3a3128; }
/* редкость: обычное — сталь, редкое — синее, эпическое — фиолетовое, легендарное — золото с переливом */
.lg-box .gem { display: inline-block; width: 8px; height: 8px; transform: rotate(45deg); flex: none; background: #8d867b; box-shadow: 0 0 0 1px #050506; }
.lg-box .r-common { color: #d6cdbd; }
.lg-box .r-uncommon { color: #a8eeb0; } .lg-box .r-uncommon .gem { background: #4cc95a; box-shadow: 0 0 0 1px #050506, 0 0 6px #4cc95a; }
.lg-box .r-rare { color: #9ccaff; } .lg-box .r-rare .gem { background: #4aa3ff; box-shadow: 0 0 0 1px #050506, 0 0 6px #4aa3ff; }
.lg-box .r-epic { color: #dcbcff; } .lg-box .r-epic .gem { background: #b06bff; box-shadow: 0 0 0 1px #050506, 0 0 7px #b06bff; }
.lg-box .r-legendary { color: #ffd27a; } .lg-box .r-legendary .gem { background: #ffb83d; box-shadow: 0 0 0 1px #050506, 0 0 9px #ffb83d; animation: lgGem 1.4s ease-in-out infinite alternate; }
@keyframes lgGem { to { box-shadow: 0 0 0 1px #050506, 0 0 16px #ffd76a; } }
.lg-card .gear span.r-uncommon { border-color: #3f9a4c; box-shadow: inset 0 0 10px rgba(76,201,90,.16); }
.lg-card .gear span.r-rare { border-color: #3d7fc7; box-shadow: inset 0 0 10px rgba(74,163,255,.18); }
.lg-card .gear span.r-epic { border-color: #8b55c9; box-shadow: inset 0 0 12px rgba(176,107,255,.25), 0 0 8px rgba(176,107,255,.35); }
.lg-card .gear span.r-legendary { border-color: #d29a2e; position: relative; overflow: hidden; box-shadow: inset 0 0 12px rgba(255,184,61,.3), 0 0 12px rgba(255,184,61,.5); }
.lg-card .gear span.r-legendary::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255,240,190,.45) 50%, transparent 70%); background-size: 250% 100%; animation: lgShine 2.4s linear infinite; }
@keyframes lgShine { from { background-position: 150% 0; } to { background-position: -100% 0; } }
.lg-card .bag .it { display: inline-flex; align-items: center; gap: 6px; }
.lg-card .gear em { opacity: .5; font-style: normal; }
.lg-card .bag { display: flex; flex-direction: column; gap: 3px; font-size: 15px; color: #d8cfbf; }
.lg-card .bag div { display: flex; gap: 8px; align-items: baseline; }
.lg-card .bag .n { font: 400 15px 'Russo One', sans-serif; color: #c9472a; width: 22px; text-align: right; }
.lg-card .bag .on { color: #8fbf6a; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
.lg-card .hint { font-size: 12.5px; color: #85796a; }
.lg-card .note { font-weight: 700; font-size: 15px; color: #f3e2c4; background: linear-gradient(#7d1717, #4a0b0b); border: 1px solid #050506; box-shadow: 0 0 0 1px #6d5a45; border-radius: 3px; padding: 4px 10px; align-self: flex-start; }
.lg-card .ghostline { font-weight: 700; font-size: 14px; color: #9fb0e6; }

/* ---------- сцены: смерть, воскрешение, новый уровень ---------- */
.lg-scene { position: absolute; left: 0; bottom: 0; width: 540px; height: 440px; }
.lg-scene .guy { position: absolute; left: 195px; bottom: 30px; width: 150px; height: 212px; transform-origin: 75px 200px; }
.lg-scene .guy .jl-doodle { width: 150px; height: 212px; }
.lg-scene .ttl { position: absolute; left: 0; right: 0; top: 0; text-align: center; opacity: 0; transform: scale(.4); transition: opacity .3s, transform .55s cubic-bezier(.3,1.6,.5,1); }
.lg-scene .ttl.on { opacity: 1; transform: none; }
.lg-scene .ttl b { display: block; font: 400 46px 'Russo One', sans-serif; letter-spacing: .03em; -webkit-text-stroke: 2.5px #15122e; paint-order: stroke fill; text-shadow: 0 5px 0 rgba(0,0,0,.35); }
.lg-scene .ttl span { display: inline-block; margin-top: 4px; font: 400 26px 'Russo One', sans-serif; color: #fff; -webkit-text-stroke: 1.5px #15122e; paint-order: stroke fill; max-width: 520px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lg-scene .sub { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-weight: 700; font-size: 16px; color: #fff; opacity: 0; transition: opacity .4s; }
.lg-scene .sub.on { opacity: 1; }
.lg-scene .sub i { display: inline-block; font-style: normal; background: rgba(21,18,46,.82); border-radius: 9px; padding: 4px 10px; margin: 2px; }
.lg-scene canvas { position: absolute; left: -100px; top: -100px; width: 740px; height: 640px; pointer-events: none; }
.lg-scene .beam { position: absolute; left: 170px; top: -60px; width: 200px; height: 470px; opacity: 0; background: linear-gradient(180deg, rgba(255,246,200,.9), rgba(255,220,120,.15) 85%, transparent); clip-path: polygon(30% 0, 70% 0, 100% 100%, 0 100%); filter: blur(2px); transition: opacity .6s; }
.lg-scene .beam.on { opacity: 1; }
.lg-scene .flash { position: absolute; inset: -40px; background: radial-gradient(circle at 50% 70%, rgba(232,69,92,.75), transparent 60%); opacity: 0; }
.lg-scene .flash.go { animation: lgFlash .5s ease-out; }
@keyframes lgFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
.lg-scene .ring { position: absolute; left: 270px; bottom: 120px; width: 10px; height: 10px; margin: -5px; border-radius: 50%; border: 6px solid #ffc94d; opacity: 0; }
.lg-scene .ring.go { animation: lgRing .9s ease-out forwards; }
@keyframes lgRing { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(34); border-width: 1px; } }
.lg-scene .shake { animation: lgShake .45s linear; }
@keyframes lgShake { 15% { transform: translate(-8px, 2px); } 35% { transform: translate(7px, -3px); } 55% { transform: translate(-5px, 1px); } 75% { transform: translate(3px, 0); } }

/* текущее здоровье: число / максимум и полоска под ним */
.lg-card .stats .hpc { position: relative; }
.lg-card .stats .hpc small { font-size: 13px; color: #8f8474; margin-left: 1px; }
.lg-card .stats .hpbar { position: absolute; left: 8px; right: 8px; bottom: 2px; height: 3px; background: #050506; border-radius: 2px; overflow: hidden; }
.lg-card .stats .hpbar i { display: block; height: 100%; background: linear-gradient(90deg, #8e1b1b, #e8455c); }
.lg-card .woundline { font-weight: 700; font-size: 14px; color: #e88a7a; }

/* удар по герою: карточка дёргается и вспыхивает красным */
.lg-card.on.hit { animation: lgHit .55s ease-out; }
@keyframes lgHit { 0% { transform: translate(0,0); box-shadow: 0 0 0 2px #e8455c, 0 0 0 5px #141215, 0 0 40px rgba(232,69,92,.9), 0 10px 22px rgba(0,0,0,.6); }
  20% { transform: translate(-9px, 3px); } 40% { transform: translate(7px, -2px); } 60% { transform: translate(-4px, 1px); } 80% { transform: translate(2px, 0); } 100% { transform: none; } }

/* временные баффы (например, «Закалка кузнеца» с Ярмарки) */
.lg-card .buffline { font-weight: 700; font-size: 14px; color: #ffb36b; }
`;
    return {
      css,
      // значки слотов в строке «надето»
      slotIcons: { weapon: '⚔️', armor: '🥋', shield: '🛡', helmet: '⛑', trinket: '📿' },
      // характеристики: подпись на карточке и значок в сцене «новый уровень»
      stats: { hp: { label: '❤️ ХП', icon: '❤️' }, def: { label: '🛡 Броня', icon: '🛡' }, atk: { label: '⚔️ Физ. урон', icon: '⚔️' }, mag: { label: '✨ Маг. урон', icon: '✨' } },
      texts: { recruit: 'Новобранец', ghost: '👻 Призрак', nothing: 'Ничего не надето', level: 'УР.', buff: '✨' },
      // сцены: заголовок и цвет (заголовок, искры)
      scenes: {
        death: { title: '☠ ПАЛ В БОЮ', color: '#e8455c' },
        revive: { title: '✨ ВОСКРЕС', color: '#ffe27a' },
        level: { title: (n) => `⭐ УРОВЕНЬ ${n}`, color: '#ffc94d' },
      },
    };
  });
  // монеты стиля «Легион»: асс (бронза), денарий (серебро), ауреус (золото). 100 ассов = 1 денарий, 100 денариев = 1 ауреус.
  // svg(k, size) — значок монеты (k: 'b' | 's' | 'g'); forms — как писать словами (1 / 2 / 5)
  window.MDDoodle.addPart('legion', 'coins', function () {
    const disc = (c1, c2, inner) => `<circle cx="20" cy="20" r="17" fill="${c1}" stroke="#2a2236" stroke-width="2.6"/><circle cx="20" cy="20" r="12.5" fill="none" stroke="${c2}" stroke-width="1.8" stroke-dasharray="2 2.2"/>${inner}`;
    const ART = {
      b: disc('#c07a44', '#7a4420', '<path d="M20 12 V28 M16 12 H24 M16 28 H24" stroke="#5a2e12" stroke-width="2.6" stroke-linecap="round"/>'),   // I — один асс
      s: disc('#d4d8e4', '#8a90a4', '<path d="M14 13 L26 27 M26 13 L14 27" stroke="#5a6078" stroke-width="2.8" stroke-linecap="round"/>'),   // X — денарий
      g: disc('#f2c14e', '#b8862a', '<path d="M20 13 L23 18 L29 15 L26 22 L20 27 L14 22 L11 15 L17 18 Z" fill="#b8862a" stroke="#7a5414" stroke-width="1.4" stroke-linejoin="round"/>'),   // орёл
    };
    return {
      b: { name: 'асс', forms: ['асс', 'асса', 'ассов'], color: '#c07a44', emoji: '🟤' },
      s: { name: 'денарий', forms: ['денарий', 'денария', 'денариев'], color: '#c8ccd8', emoji: '⚪' },
      g: { name: 'ауреус', forms: ['ауреус', 'ауреуса', 'ауреусов'], color: '#f2c14e', emoji: '🟡' },
      svg: (k, size = 22) => `<svg class="coin coin-${k}" viewBox="0 0 40 40" width="${size}" height="${size}">${ART[k] || ART.b}</svg>`,
    };
  });
})();

} catch (e) { console.error('[стили] styles/legion/hero.js не загрузился:', e); }

/* ───── стиль «legion»: styles/legion/legend.js ───── */
try {
/* Легендарки с босса — свой образ (часть 'legend'): за вещью эмблема её ауры, золотые лучи и мерцающие искры.
   Одна на все стили (у котиков и обезьян — эта же, если стиль не задал свою).
   MDDoodle.part('legend').wrap(inner, it, box) → SVG: эмблема + сама вещь + искры.
     inner — рисунок вещи (как для витрины), it — вещь из каталога (нужен it.aura.id), box — {x, y, w, h} рамка рисунка (getBBox).
   Эмблема рисуется в круге радиуса R вокруг центра вещи; искры анимированы (SVG animate — работают и в OBS). */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('legion', 'legend', function () {
    const INK = '#2a2236', GOLD = '#ffd76a', GOLD2 = '#e8a32a';
    const f = (v) => Math.round(v * 10) / 10;
    let uid = 0;
    const O = (w) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    // крыло из перьев: сторона s (−1 лево, +1 право), n перьев, цвета
    function wing(cx, cy, R, s, c1, c2, n = 6, lift = 0.2) {
      // перья — вытянутые овалы веером от плеча; верхние длиннее
      let g = '';
      const x0 = cx + s * R * 0.1, y0 = cy - R * 0.05;
      for (let i = n - 1; i >= 0; i--) {
        const t = i / (n - 1), a = (0.08 + lift + t * 0.62) * Math.PI, len = R * (1.08 - t * 0.42);
        const ex = x0 + s * Math.cos(a) * len * 0.5, ey = y0 - Math.sin(a) * len * 0.5 * 0.85 + t * R * 0.25;
        const deg = s > 0 ? -a * 180 / Math.PI * 0.85 : 180 + a * 180 / Math.PI * 0.85;
        g += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(len * 0.52)}" ry="${f(R * 0.1)}" transform="rotate(${f(deg)} ${f(ex)} ${f(ey)})" fill="${i % 2 ? c2 : c1}" ${O(R * 0.022)}/>`;
      }
      return g;
    }
    const star = (x, y, r, c) => `<path d="M${f(x)} ${f(y - r)} L${f(x + r * 0.28)} ${f(y - r * 0.28)} L${f(x + r)} ${f(y)} L${f(x + r * 0.28)} ${f(y + r * 0.28)} L${f(x)} ${f(y + r)} L${f(x - r * 0.28)} ${f(y + r * 0.28)} L${f(x - r)} ${f(y)} L${f(x - r * 0.28)} ${f(y - r * 0.28)} Z" fill="${c}"/>`;
    const EMB = {
      // 🦅 Строй легиона — золотые крылья орла
      strike: (cx, cy, R) => wing(cx, cy, R, -1, '#fff1b8', '#e8b923', 7) + wing(cx, cy, R, 1, '#fff1b8', '#e8b923', 7),
      // 🛡 Черепаха — шестиугольники панциря кольцом
      turtle: (cx, cy, R) => { let g = ''; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6, x = cx + Math.cos(a) * R * 0.78, y = cy + Math.sin(a) * R * 0.78, r = R * 0.27; g += `<path d="${Array.from({ length: 6 }, (_, k) => { const b = k * Math.PI / 3; return `${k ? 'L' : 'M'}${f(x + Math.cos(b) * r)} ${f(y + Math.sin(b) * r)}`; }).join(' ')} Z" fill="${i % 2 ? '#7fae4a' : '#5f8f36'}" ${O(R * 0.025)}/><path d="M${f(x - r * 0.5)} ${f(y)} H${f(x + r * 0.5)}" stroke="${GOLD}" stroke-width="${f(R * 0.03)}" opacity=".7"/>`; } return g; },
      // ⚡ Гроза — молнии во все стороны
      storm: (cx, cy, R) => { let g = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.9)}" fill="#4ab0ff" opacity=".18"/>`; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, p = (d, o) => `${f(cx + ca * R * d + px * R * o)} ${f(cy + sa * R * d + py * R * o)}`; g += `<path d="M${p(0.45, 0)} L${p(0.68, 0.1)} L${p(0.64, -0.04)} L${p(0.98, 0.04)} L${p(0.7, -0.1)} L${p(0.74, 0.03)} Z" fill="#bfe8ff" ${O(R * 0.022)}/>`; } return g; },
      // 🔥 Священный огонь — кольцо языков пламени
      vesta: (cx, cy, R) => { let g = ''; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, p = (d, o) => `${f(cx + ca * R * d + px * R * o)} ${f(cy + sa * R * d + py * R * o)}`; g += `<path d="M${p(0.55, -0.14)} Q${p(0.82, -0.2)} ${p(1.0, 0)} Q${p(0.82, 0.2)} ${p(0.55, 0.14)} Z" fill="${i % 2 ? '#ff8a2a' : '#ffc94d'}" ${O(R * 0.02)}/>`; } return g; },
      // 🏹 Меткость — серебряный полумесяц и звёзды
      diana: (cx, cy, R) => `<path d="M${f(cx + R * 0.05)} ${f(cy - R * 0.98)} A${f(R * 0.98)} ${f(R * 0.98)} 0 1 0 ${f(cx + R * 0.05)} ${f(cy + R * 0.98)} A${f(R * 1.3)} ${f(R * 1.3)} 0 0 1 ${f(cx + R * 0.05)} ${f(cy - R * 0.98)} Z" fill="#eef3ff" ${O(R * 0.03)}/>` + star(cx + R * 0.7, cy - R * 0.55, R * 0.13, '#fff6c8') + star(cx + R * 0.82, cy + R * 0.3, R * 0.09, '#fff6c8') + star(cx + R * 0.5, cy + R * 0.75, R * 0.11, '#fff6c8'),
      // 🐉 Несгибаемые — драконьи крылья (перепонки)
      dragon: (cx, cy, R) => [-1, 1].map((s) => `<path d="M${f(cx + s * R * 0.15)} ${f(cy - R * 0.1)} L${f(cx + s * R * 1.0)} ${f(cy - R * 0.85)} L${f(cx + s * R * 0.9)} ${f(cy - R * 0.3)} L${f(cx + s * R * 1.02)} ${f(cy + R * 0.05)} L${f(cx + s * R * 0.78)} ${f(cy + R * 0.1)} L${f(cx + s * R * 0.84)} ${f(cy + R * 0.45)} L${f(cx + s * R * 0.55)} ${f(cy + R * 0.35)} L${f(cx + s * R * 0.2)} ${f(cy + R * 0.3)} Z" fill="#c8323a" ${O(R * 0.025)}/><path d="M${f(cx + s * R * 0.15)} ${f(cy - R * 0.1)} L${f(cx + s * R * 0.9)} ${f(cy - R * 0.3)} M${f(cx + s * R * 0.15)} ${f(cy - R * 0.1)} L${f(cx + s * R * 0.78)} ${f(cy + R * 0.1)} M${f(cx + s * R * 0.15)} ${f(cy - R * 0.1)} L${f(cx + s * R * 0.55)} ${f(cy + R * 0.35)}" stroke="${INK}" stroke-width="${f(R * 0.02)}" fill="none" opacity=".6"/>`).join(''),
      // ✨ Глас звёзд — звёздное небо кольцом и созвездие
      stars: (cx, cy, R) => { let g = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.95)}" fill="#2a2366" opacity=".55"/>`; const pts = []; for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, d = 0.62 + (i % 3) * 0.13; pts.push([cx + Math.cos(a) * R * d, cy + Math.sin(a) * R * d]); g += star(pts[i][0], pts[i][1], R * (i % 3 === 0 ? 0.11 : 0.07), i % 2 ? '#fff6c8' : '#bfe8ff'); } g += `<path d="M${pts.slice(0, 5).map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')}" stroke="#bfe8ff" stroke-width="${f(R * 0.012)}" fill="none" opacity=".6"/>`; return g; },
      // 🏆 Триумф — лавровый венок вокруг
      triumph: (cx, cy, R) => { let g = ''; for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { const a = (0.62 + i * 0.1) * Math.PI, x = cx + s * Math.cos(a) * -R * 0.82, y = cy + Math.sin(a) * R * 0.82, rot = s * (i * 18 - 40); g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(R * 0.16)}" ry="${f(R * 0.07)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${i % 2 ? '#e8b923' : GOLD}" ${O(R * 0.018)}/>`; } return g + `<path d="M${f(cx - R * 0.2)} ${f(cy + R * 0.85)} Q${f(cx)} ${f(cy + R * 1.0)} ${f(cx + R * 0.2)} ${f(cy + R * 0.85)}" stroke="#c8102e" stroke-width="${f(R * 0.08)}" fill="none" stroke-linecap="round"/>`; },
      // 🕊 Второе дыхание — огненные крылья феникса
      phoenix: (cx, cy, R) => wing(cx, cy, R, -1, '#ff6a2a', '#ffd04a', 7, 0.05) + wing(cx, cy, R, 1, '#ff6a2a', '#ffd04a', 7, 0.05) + `<path d="M${f(cx - R * 0.12)} ${f(cy + R * 0.4)} Q${f(cx)} ${f(cy + R * 1.05)} ${f(cx + R * 0.12)} ${f(cy + R * 0.4)}" fill="#ff5a3a" ${O(R * 0.02)}/>`,
      // 📯 Боевой клич — скрещённые копья и красные лучи
      mars: (cx, cy, R) => { let g = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; g += `<path d="M${f(cx)} ${f(cy)} L${f(cx + Math.cos(a - 0.12) * R)} ${f(cy + Math.sin(a - 0.12) * R)} L${f(cx + Math.cos(a + 0.12) * R)} ${f(cy + Math.sin(a + 0.12) * R)} Z" fill="#c8102e" opacity=".55"/>`; } for (const s of [-1, 1]) g += `<path d="M${f(cx - s * R * 0.85)} ${f(cy + R * 0.85)} L${f(cx + s * R * 0.75)} ${f(cy - R * 0.75)}" stroke="${INK}" stroke-width="${f(R * 0.09)}" stroke-linecap="round"/><path d="M${f(cx - s * R * 0.85)} ${f(cy + R * 0.85)} L${f(cx + s * R * 0.75)} ${f(cy - R * 0.75)}" stroke="#a0703a" stroke-width="${f(R * 0.045)}" stroke-linecap="round"/><path d="M${f(cx + s * R * 0.72)} ${f(cy - R * 0.72)} l${f(s * R * 0.2)} ${f(-R * 0.06)} l${f(-s * R * 0.06)} ${f(R * 0.2)} Z" fill="#cfd8e0" ${O(R * 0.02)}/>`; return g; },
    };
    function rays(cx, cy, R, id) {
      let g = `<radialGradient id="${id}g"><stop offset="0" stop-color="#fff2c0" stop-opacity=".7"/><stop offset=".35" stop-color="${GOLD}" stop-opacity=".35"/><stop offset="1" stop-color="${GOLD2}" stop-opacity="0"/></radialGradient>`;
      g = `<defs>${g}</defs><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 1.25)}" fill="url(#${id}g)"/>`;
      let r = '';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, w = 0.07; r += `<path d="M${f(cx)} ${f(cy)} L${f(cx + Math.cos(a - w) * R * 1.35)} ${f(cy + Math.sin(a - w) * R * 1.35)} L${f(cx + Math.cos(a + w) * R * 1.35)} ${f(cy + Math.sin(a + w) * R * 1.35)} Z" fill="${GOLD}" opacity="${i % 2 ? 0.1 : 0.2}"/>`; }
      return g + `<g>${r}<animateTransform attributeName="transform" type="rotate" from="0 ${f(cx)} ${f(cy)}" to="360 ${f(cx)} ${f(cy)}" dur="24s" repeatCount="indefinite"/></g>`;
    }
    function sparkles(cx, cy, R, seed) {
      let g = '', s = seed >>> 0;
      const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      for (let i = 0; i < 7; i++) {
        const a = rnd() * Math.PI * 2, d = R * (0.45 + rnd() * 0.75), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, r = R * (0.05 + rnd() * 0.06), dur = (1.4 + rnd() * 1.6).toFixed(2), beg = (rnd() * 2).toFixed(2);
        g += `<g opacity="0">${star(x, y, r, '#fffbe0')}<animate attributeName="opacity" values="0;1;0" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></g>`;
      }
      return g;
    }
    function wrap(inner, it, box) {
      const id = 'lgd' + (++uid), aid = it && it.aura && it.aura.id;
      const b = box && box.w > 0 ? box : { x: -30, y: -60, w: 60, h: 60 };
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.max(b.w, b.h) * 0.62;
      const emb = EMB[aid] ? EMB[aid](cx, cy, R) : '';
      let seed = 0; for (const ch of String(aid || it && it.id || 'x')) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      return `<g class="lgd">${rays(cx, cy, R, id)}<g opacity=".95">${emb}</g>`
        + `<g filter="url(#${id}f)">${inner}</g><defs><filter id="${id}f" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="${f(R * 0.04)}" result="b"/><feFlood flood-color="#ffd76a"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
        + sparkles(cx, cy, R * 1.1, seed) + `</g>`;
    }
    // рамка для подгонки: эмблема шире вещи — вид берём с запасом (R × 1,4 вокруг центра)
    function viewBox(box) { const b = box && box.w > 0 ? box : { x: -30, y: -60, w: 60, h: 60 }; const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.max(b.w, b.h) * 0.62 * 1.42; return `${f(cx - R)} ${f(cy - R)} ${f(R * 2)} ${f(R * 2)}`; }
    return { wrap, viewBox, emblems: Object.keys(EMB), emblem: (aid, cx, cy, R) => (EMB[aid] ? EMB[aid](cx, cy, R) : '') };   // 28.10: эмблема ауры - и для рамок других стилей
  });
  /* 28.10 (art/styles-city-legend): своя рамка легендарки у каждого стиля (кроме Легиона) - styles/<стиль>/legend.js:
       MDDoodle.addPart('<стиль>', 'legend', () => MDDoodle.legendKit.make({ glow, back, ring, top, spark, item }));
     Раскладка, рамка вида (viewBox) и эмблема ауры - общие (эмблема - рисунок Легиона), стиль даёт только вид:
       glow - [свет у центра, свет у края]; back(cx, cy, R, f) - подложка за эмблемой; ring(cx, cy, R, f) - кольцо (крутится медленно);
       top(cx, cy, R, f) - поверх вещи (корона, рожки…); spark(x, y, r, f) - искорка (мерцает); item - [цвет обводки-ореола вещи].
     Без фильтров: ореол вещи - мягкий круг; движение - SVG animate, как у Легиона (работает и в OBS). */
  window.MDDoodle.legendKit = {
    make(o) {
      const f = (v) => Math.round(v * 10) / 10, D = window.MDDoodle;
      let uid = 0, LG = null;
      const emblem = (aid, cx, cy, R) => { try { LG = LG || D.drawLocation('legion', 'legend'); return LG.emblem(aid, cx, cy, R); } catch (e) { return ''; } };
      const box0 = (box) => (box && box.w > 0 ? box : { x: -30, y: -60, w: 60, h: 60 });
      function wrap(inner, it, box) {
        const id = 'lgs' + (++uid), aid = it && it.aura && it.aura.id, b = box0(box);
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.max(b.w, b.h) * 0.62, G = o.glow || ['#fff2c0', '#ffd76a'];
        let seed = 0; for (const ch of String(aid || it && it.id || 'x')) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
        let rs = seed >>> 0; const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
        let sp = '';
        if (o.spark) for (let i = 0; i < 7; i++) { const a = rnd() * Math.PI * 2, d = R * 1.1 * (0.45 + rnd() * 0.75), r = R * (0.06 + rnd() * 0.06);
          sp += `<g opacity="0">${o.spark(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, f, i)}<animate attributeName="opacity" values="0;1;0" dur="${(1.4 + rnd() * 1.6).toFixed(2)}s" begin="${(rnd() * 2).toFixed(2)}s" repeatCount="indefinite"/></g>`; }
        return `<g class="lgd lgd-s"><defs><radialGradient id="${id}g"><stop offset="0" stop-color="${G[0]}" stop-opacity=".75"/><stop offset=".4" stop-color="${G[1]}" stop-opacity=".35"/><stop offset="1" stop-color="${G[1]}" stop-opacity="0"/></radialGradient></defs>`
          + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 1.3)}" fill="url(#${id}g)"/>` + (o.back ? o.back(cx, cy, R, f) : '')
          + (o.ring ? `<g>${o.ring(cx, cy, R, f)}<animateTransform attributeName="transform" type="rotate" from="0 ${f(cx)} ${f(cy)}" to="360 ${f(cx)} ${f(cy)}" dur="30s" repeatCount="indefinite"/></g>` : '')
          + `<g opacity=".95">${emblem(aid, cx, cy, R)}</g>` + (o.item ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.62)}" fill="${o.item}" opacity=".28"/>` : '')
          + inner + (o.top ? o.top(cx, cy, R, f) : '') + sp + '</g>';
      }
      function viewBox(box) { const b = box0(box), cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.max(b.w, b.h) * 0.62 * 1.42; return `${f(cx - R)} ${f(cy - R)} ${f(R * 2)} ${f(R * 2)}`; }
      return { wrap, viewBox, emblems: (() => { try { return D.drawLocation('legion', 'legend').emblems; } catch (e) { return []; } })(), emblem };
    },
  };
})();

} catch (e) { console.error('[стили] styles/legion/legend.js не загрузился:', e); }

if (window.MDDoodle && window.MDDoodle.use) window.MDDoodle.use("legion");
