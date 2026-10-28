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

/* ───── стиль «cherts»: styles/cherts/characters.js ───── */
try {
/* Стиль «Чертики» — озорные чертята с крыльями. Цвет человечка = цвет кожи (Костюмерная тоже красит кожу).
   Форма тела = вид чертёнка со своими крыльями: бесёнок, громила, пухлик, франт, огненный дух, нетопырь, вылупыш.
   Разные по нику: рога (рожки, козлиные, бараньи завитки, бычьи, крохотные, отломанный), длинный хвост 6 форм (S-волна, завиток, петля, крючок, волна, до земли) с наконечником (стрелка, сердечко, огонёк, кисточка), пузико,
   веснушки, козлиная бородка, клыки, цвет рогов. Внизу — копытца (у духа их нет, вылупыш сидит в скорлупе).
   Крылья и хвост рисуются вместе с руками (слой за телом), поэтому они и у призрака, и за плащом не теряются.
   Устроен как образец styles/legion/characters.js, договор — styles/README.md.
   Холст 120×170, ноги на y = 168, центр по x = 60. Каждая функция возвращает строку SVG.
   Классы body/ln/face/eye не используются: все цвета заданы прямо в SVG. */
(function () {
  'use strict';
  const D = window.MDDoodle;
  if (!D) return;

  // ── цвета стиля ──
  const INK = '#2a0d14';
  const RIM = 'rgba(255,236,230,.5)';
  const GOLD = '#ffc83d';
  const FIRE = ['#ffe27a', '#ff9a2a', '#ff4a1a'];
  const WS = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
  const S3 = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
  const FS = `fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  const FSW = (w) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const RARITY = { common: null, uncommon: '#5bd36a', rare: '#4fc3ff', epic: '#c77dff', legendary: '#ffcf3a' };
  const METAL = { common: '#b7bec4', uncommon: '#cdeec4', rare: '#bfe3ff', epic: '#e0c8ff', legendary: '#ffd76a' };
  const f1 = (v) => +(+v).toFixed(1);

  // кожа «по нику»: больше всего красных
  const SKINS = ['#e83a3a', '#d42a3a', '#ff5a5a', '#c8102e', '#e83a3a', '#ff7a3d', '#ff8fb0', '#b33a8a', '#7a3ab3', '#3a3346', '#d94a1a', '#9a1a3a', '#5aae6a', '#ff5a5a'];
  const HORN = ['#f3e6c8', '#f3e6c8', '#2a1a22', GOLD, '#7a1a2a'];
  // смешать цвет #rrggbb с другим (t — доля второго)
  function mix(c, d, t) {
    const m = /^#([0-9a-f]{6})$/i.exec(String(c)); if (!m) return c;
    const a = parseInt(m[1], 16), b = parseInt(d.slice(1), 16);
    const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
    return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
  }
  const dark = (c, t) => mix(c, '#1a0408', t);
  const light = (c, t) => mix(c, '#fff4ec', t);

  // черты по нику — из seed, без r()
  function T(k) {
    const s = (k && k.seed) >>> 0, h = Math.imul(s ^ 0x6a09e667, 2654435761) >>> 0;
    return {
      horn: ['cone', 'cone', 'goat', 'ram', 'bull', 'nub', 'broken'][h % 7],
      hornCol: HORN[(h >>> 3) % HORN.length],
      tail: ['arrow', 'arrow', 'heart', 'flame', 'tuft'][(h >>> 9) % 5],
      tshape: ['scurve', 'curl', 'loop', 'hook', 'wave', 'ground'][(h >>> 21) % 6],
      belly: (h >>> 12) % 2 === 0,
      freckles: (h >>> 13) % 4 === 0,
      goatee: (h >>> 15) % 4 === 0,
      fang: (h >>> 17) % 3 !== 0,
      brows: (h >>> 19) % 3 !== 0,
    };
  }

  /* ── тела: каждая форма — свой вид чертёнка (и свои крылья) ──
     bean — бесёнок (капелька с острой макушкой), box — черт-громила (широкие плечи), ball — пухлик,
     tall — демон-франт, ghost — огненный дух (тело-пламя, парит), cone — нетопырь-черт (большие уши), egg — вылупыш в скорлупе */
  const bodies = {
    bean(r) { const w = 25 + Math.floor(r() * 8), L = 60 - w, R = 60 + w, top = 72; return { kind: 'imp', L, R, top, hw: f1(w * 0.62), eyeY: top + 32, armY: top + 44, d: `M${L} 166 C${L - 4} 126 ${L + 4} 98 54 ${top + 12} Q60 ${top - 6} 66 ${top + 12} C${R - 4} 98 ${R + 4} 126 ${R} 166 Z` }; },
    box(r) { const w = 31 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 84 + Math.floor(r() * 6); return { kind: 'brute', L, R, top, hw: w - 9, eyeY: top + 22, armY: top + 18, square: true, d: `M${L + 9} 166 L${L} ${top + 14} Q${L} ${top} ${L + 12} ${top} H${R - 12} Q${R} ${top} ${R} ${top + 14} L${R - 9} 166 Z` }; },
    ball(r) { const w = 34 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 100; return { kind: 'chubby', L, R, top, hw: f1(w * 0.6), eyeY: 124, armY: 132, d: `M${L + 6} 166 C${L - 8} 152 ${L - 4} ${top} 60 ${top} C${R + 4} ${top} ${R + 8} 152 ${R - 6} 166 Z` }; },
    tall(r) { const w = 18 + Math.floor(r() * 4), L = 60 - w, R = 60 + w, top = 56; return { kind: 'dandy', L, R, top, hw: f1(w * 0.82), eyeY: 82, armY: 100, narrow: true, d: `M${L + 2} 166 C${L + 4} 136 ${L - 3} 116 ${L} 96 C${L - 1} 70 ${L + 6} ${top} 60 ${top} C${R - 6} ${top} ${R + 1} 70 ${R} 96 C${R + 3} 116 ${R - 4} 136 ${R - 2} 166 Z` }; },
    ghost(r) { const w = 26 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 80, s = f1((2 * w) / 3); return { kind: 'wisp', L, R, top, hw: f1(w * 0.66), eyeY: top + 34, armY: top + 46, ghosty: true, d: `M${L} 158 C${L - 2} 128 ${L + 2} ${top + 30} ${L + 8} ${top + 18} Q${L + 6} ${top + 4} ${L + 14} ${top - 4} Q${L + 16} ${top + 8} 52 ${top + 6} Q53 ${top - 8} 60 ${top - 16} Q66 ${top - 4} 68 ${top + 6} Q${R - 16} ${top + 8} ${R - 14} ${top - 4} Q${R - 6} ${top + 4} ${R - 8} ${top + 18} C${R - 2} ${top + 30} ${R + 2} 128 ${R} 158 q${-s / 2} 10 ${-s} 0 q${-s / 2} 10 ${-s} 0 q${-s / 2} 10 ${-s} 0 Z` }; },
    cone(r) { const w = 28 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 80; return { kind: 'bat', L, R, top, hw: 14, eyeY: top + 30, armY: top + 44, narrow: true, d: `M${L} 166 C${L + 4} 140 ${L + 16} 94 60 ${top} C${R - 16} 94 ${R - 4} 140 ${R} 166 Z` }; },
    egg(r) { const w = 26 + Math.floor(r() * 5), L = 60 - w, R = 60 + w, top = 76; return { kind: 'hatch', L, R, top, hw: f1(w * 0.6), eyeY: top + 30, armY: top + 46, d: `M60 ${top} C${R - 4} ${top} ${R + 6} 130 ${R - 2} 158 Q60 172 ${L + 2} 158 C${L - 6} 130 ${L + 4} ${top} 60 ${top} Z` }; },
  };

  /* ── рога: сидят по краям макушки, шапки садятся между ними ── */
  function horns(k, t) {
    const b = k.b, top = b.square ? b.top + 2 : b.top + 6, dx = f1(Math.max(8, b.hw * 0.55)), c = t.hornCol, ln = c === '#2a1a22' ? '#6a5a62' : 'rgba(0,0,0,.18)';
    const one = (side, kind) => {
      const x = 60 + side * dx, sd = side;
      let p;
      switch (kind) {
        case 'goat': p = `M${x - 4 * sd} ${top + 2} C${x - 2 * sd} ${top - 14} ${x + 8 * sd} ${top - 24} ${x + 18 * sd} ${top - 22} C${x + 10 * sd} ${top - 18} ${x + 6 * sd} ${top - 8} ${x + 6 * sd} ${top + 2} Z`; break;
        case 'ram': p = `M${x - 2 * sd} ${top + 4} C${x - 2 * sd} ${top - 8} ${x + 14 * sd} ${top - 12} ${x + 16 * sd} ${top} C${x + 17 * sd} ${top + 10} ${x + 6 * sd} ${top + 12} ${x + 6 * sd} ${top + 4} C${x + 6 * sd} ${top} ${x + 10 * sd} ${top} ${x + 10 * sd} ${top + 3} L${x + 6 * sd} ${top + 6} Z`; break;
        case 'bull': p = `M${x - 3 * sd} ${top + 3} C${x + 10 * sd} ${top} ${x + 18 * sd} ${top - 8} ${x + 16 * sd} ${top - 20} C${x + 24 * sd} ${top - 8} ${x + 18 * sd} ${top + 8} ${x + 5 * sd} ${top + 6} Z`; break;
        case 'nub': p = `M${x - 4 * sd} ${top + 3} Q${x} ${top - 8} ${x + 4 * sd} ${top + 3} Z`; break;
        case 'stub': p = `M${x - 4 * sd} ${top + 3} L${x - 2 * sd} ${top - 5} L${x + 1 * sd} ${top - 3} L${x + 3 * sd} ${top - 7} L${x + 5 * sd} ${top + 3} Z`; break;   // отломанный
        default: p = `M${x - 5 * sd} ${top + 3} C${x - 4 * sd} ${top - 8} ${x + 2 * sd} ${top - 16} ${x + 8 * sd} ${top - 18} C${x + 5 * sd} ${top - 10} ${x + 6 * sd} ${top - 2} ${x + 5 * sd} ${top + 3} Z`;   // рожки
      }
      return `<path d="${p}" fill="${c}" ${WS}/>` + (kind === 'goat' || kind === 'cone' || kind === 'bull' ? `<path d="M${x} ${top - 3} l${3 * sd} -1 M${x + 2 * sd} ${top - 8} l${3 * sd} -1" stroke="${ln}" stroke-width="1.4"/>` : '');
    };
    if (t.horn === 'broken') return one(-1, 'cone') + one(1, 'stub');
    return one(-1, t.horn) + one(1, t.horn);
  }

  /* ── крылья (за телом и руками): якорь — спина на уровне плеч ── */
  function wings(k, t) {
    const b = k.b, tiny = b.kind === 'chubby' || b.kind === 'hatch', off = tiny ? 1.02 : 0.75;
    const y = b.armY - (tiny ? 22 : 14), mem = dark(k.fill, 0.38), rib = dark(k.fill, 0.62), xs = f1(60 - b.hw * off), xe = f1(60 + b.hw * off);
    const side = (sd, x0, kind, sc) => {
      const X = (dx) => f1(x0 + sd * dx * sc), Y = (dy) => f1(y + dy * sc);
      if (kind === 'feather') {   // перьевые, тёмные — «падший ангел»
        let f = ''; for (let i = 0; i < 6; i++) { const a = (-70 + i * 22) * Math.PI / 180, len = 20 - Math.abs(i - 2) * 2; f += `<ellipse cx="${X(10 + Math.cos(a) * len * 0.6 + 8)}" cy="${Y(Math.sin(a) * len * 0.6 - 4)}" rx="${f1(10 * sc)}" ry="${f1(3.6 * sc)}" transform="rotate(${f1(sd * (a * 180 / Math.PI))} ${X(10 + Math.cos(a) * len * 0.6 + 8)} ${Y(Math.sin(a) * len * 0.6 - 4)})"/>`; }
        return `<g fill="#5a4a56" ${WS}>${f}</g><g fill="none" stroke="#9a8a96" stroke-width="1.2" opacity=".8">${f.replace(/rx="[0-9.]+"/g, (m) => 'rx="' + f1(parseFloat(m.slice(4)) * 0.55) + '"').replace(/ry="[0-9.]+"/g, 'ry="0.6"')}</g>`;   // серые перья с прожилкой
      }
      const tat = kind === 'tattered';
      const edge = tat ? `L${X(34)} ${Y(-6)} L${X(28)} ${Y(0)} L${X(30)} ${Y(8)} L${X(22)} ${Y(6)} L${X(18)} ${Y(14)} L${X(12)} ${Y(8)}`
        : `Q${X(32)} ${Y(-4)} ${X(30)} ${Y(4)} Q${X(24)} ${Y(2)} ${X(20)} ${Y(10)} Q${X(14)} ${Y(6)} ${X(6)} ${Y(10)}`;
      return `<path d="M${X(0)} ${Y(4)} L${X(6)} ${Y(-14)} Q${X(22)} ${Y(-26)} ${X(38)} ${Y(-20)} ${edge} Z" fill="${mem}" ${WS}/>`
        + `<path d="M${X(6)} ${Y(-14)} L${X(30)} ${Y(4)} M${X(6)} ${Y(-14)} L${X(20)} ${Y(10)} M${X(6)} ${Y(-14)} L${X(38)} ${Y(-20)}" fill="none" stroke="${rib}" stroke-width="${f1(1.8 * sc)}" stroke-linecap="round"/>`
        + `<circle cx="${X(6)}" cy="${Y(-14)}" r="${f1(2.2 * sc)}" fill="${rib}"/>`
        + (tat ? `<circle cx="${X(18)}" cy="${Y(-8)}" r="${f1(2.4 * sc)}" fill="${INK}" opacity=".7"/>` : '');
    };
    const flameW = (sd, x0) => { const X = (dx) => f1(x0 + sd * dx), Y = (dy) => f1(y + dy);
      return `<path d="M${X(0)} ${Y(6)} Q${X(10)} ${Y(-6)} ${X(20)} ${Y(-28)} Q${X(22)} ${Y(-14)} ${X(28)} ${Y(-20)} Q${X(30)} ${Y(-6)} ${X(40)} ${Y(-12)} Q${X(36)} ${Y(4)} ${X(42)} ${Y(8)} Q${X(28)} ${Y(8)} ${X(24)} ${Y(16)} Q${X(14)} ${Y(8)} ${X(0)} ${Y(12)} Z" fill="${FIRE[1]}" ${WS}/>`
        + `<path d="M${X(4)} ${Y(6)} Q${X(14)} ${Y(-2)} ${X(20)} ${Y(-16)} Q${X(24)} ${Y(-4)} ${X(32)} ${Y(-4)} Q${X(24)} ${Y(4)} ${X(4)} ${Y(8)} Z" fill="${FIRE[0]}"/>`; };
    const babyW = (sd, x0) => { const X = (dx) => f1(x0 + sd * dx * 1.2), Y = (dy) => f1(y + 4 + dy * 1.2);
      return `<path d="M${X(0)} ${Y(4)} Q${X(6)} ${Y(-14)} ${X(20)} ${Y(-12)} Q${X(24)} ${Y(-6)} ${X(18)} ${Y(-2)} Q${X(22)} ${Y(4)} ${X(14)} ${Y(6)} Q${X(10)} ${Y(10)} ${X(0)} ${Y(8)} Z" fill="${light(k.fill, 0.35)}" ${WS}/><path d="M${X(8)} ${Y(-4)} q4 2 8 0 M${X(6)} ${Y(2)} q4 2 7 1" fill="none" stroke="${dark(k.fill, 0.3)}" stroke-width="1.4"/>`; };
    switch (b.kind) {
      case 'brute': return side(-1, xs, 'tattered', 1.55) + side(1, xe, 'tattered', 1.55);   // громила — огромные рваные
      case 'chubby': return side(-1, xs, 'bat', 0.78) + side(1, xe, 'bat', 0.78);             // пухлик — крохотные
      case 'dandy': return side(-1, xs, 'feather', 1.3) + side(1, xe, 'feather', 1.3);       // франт — перья падшего ангела
      case 'wisp': return flameW(-1, xs) + flameW(1, xe);                                     // огненный дух — крылья из огня
      case 'bat': return `<g transform="translate(0 16)">${side(-1, xs, 'bat', 0.75) + side(1, xe, 'bat', 0.75)}</g>` + side(-1, xs, 'bat', 1.15) + side(1, xe, 'bat', 1.15);   // нетопырь — две пары
      case 'hatch': return babyW(-1, xs) + babyW(1, xe);                                      // вылупыш — детские крылышки
      default: return side(-1, xs, 'bat', 1.3) + side(1, xe, 'bat', 1.3);                     // бесёнок — перепончатые
    }
  }

  /* ── хвост: длинный, плавный, 6 форм; наконечник поворачивается по направлению кончика ──
     форма — по нику: S-волна, завиток, петля, крючок-«вопросик», волнистый, свисающий до земли */
  const TAILS = {
    //            путь от (0,0) — точки выхода из-за тела; последняя пара — [контрольная точка, конец] для направления наконечника
    scurve: ['C24 8 36 -12 28 -34 S30 -62 44 -70', [30, -62], [44, -70]],
    curl: ['C26 8 44 -16 38 -40 C34 -58 14 -60 12 -46 C10 -34 24 -30 28 -40', [24, -30], [28, -40]],
    loop: ['C30 2 38 -26 24 -34 C8 -40 4 -18 20 -16 C40 -14 48 -36 44 -60', [48, -36], [44, -60]],
    hook: ['C22 6 34 -8 34 -32 C34 -56 54 -64 62 -48', [54, -64], [62, -48]],
    wave: ['C12 10 20 -8 30 0 C40 8 46 -10 52 -4 C60 4 66 -12 62 -28', [66, -12], [62, -28]],
    ground: ['C8 14 28 16 42 10 C54 4 58 -12 50 -28', [58, -12], [50, -28]],
  };
  function tail(k, t) {
    const b = k.b, x0 = b.R - 8, y0 = 154, c = k.fill, T0 = TAILS[t.tshape] || TAILS.scurve;
    const [cpx, cpy] = T0[1], [ex, ey] = T0[2], ang = f1(Math.atan2(ey - cpy, ex - cpx) * 180 / Math.PI + 90);
    const d = `M${x0} ${y0} ${T0[0].replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${f1(x0 + +x)} ${f1(y0 + +y)}`)}`;
    // наконечник в своих координатах: основание в (0,0), острие вверх (−y)
    let tip;
    switch (t.tail) {
      case 'heart': tip = `<path d="M0 -17 C-10 -11 -9 -1 0 -4 C9 -1 10 -11 0 -17 Z" fill="${dark(c, 0.3)}" ${WS}/>`; break;
      case 'flame': tip = `<path d="M-6 0 Q-9 -9 -2 -18 Q0 -10 3 -13 Q9 -6 6 0 Q0 3 -6 0 Z" fill="${FIRE[1]}" ${WS}/><path d="M-2.4 -1 Q-4 -6 -0.6 -10 Q2.6 -5 1.6 -1 Z" fill="${FIRE[0]}"/>`; break;
      case 'tuft': tip = `<g fill="${dark(c, 0.45)}" ${WS}><circle cx="-4" cy="-4" r="4.4"/><circle cx="4" cy="-4" r="4.4"/><circle cx="0" cy="-9" r="5"/></g>`; break;
      default: tip = `<path d="M0 -15 Q9 -6 7 1 Q3 -1 0 3 Q-3 -1 -7 1 Q-9 -6 0 -15 Z" fill="${dark(c, 0.3)}" ${WS}/>`;   // закруглённая стрелка-пика
    }
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<g transform="translate(${f1(x0 + ex)} ${f1(y0 + ey)}) rotate(${ang})">${tip}</g>`;
  }

  // копытца
  const hoof = (x) => `<path d="M${x - 7} 172 Q${x - 7} 163 ${x} 163 Q${x + 7} 163 ${x + 7} 172 Z" fill="#2a1a22" ${WS}/><path d="M${x} 165 V172" stroke="#8a7a82" stroke-width="1.6"/>`;

  /* Тело: копытца → кожа → пузико/веснушки → контур → рога → бородка */
  function body(k) {
    const b = k.b, t = T(k), d = b.d, u = k.uid('jlB');
    let s = `<defs><clipPath id="${u}"><path d="${d}"/></clipPath></defs><path d="${d}" fill="${k.fill}"/><g clip-path="url(#${u})">`;
    if (t.belly) s += `<ellipse cx="60" cy="${f1((k.my + 170) / 2 + 6)}" rx="${f1((b.R - b.L) * 0.3)}" ry="${f1((170 - k.my) * 0.38)}" fill="${light(k.fill, 0.45)}"/>`;
    if (t.freckles) s += `<g fill="${dark(k.fill, 0.3)}"><circle cx="${60 - k.ex - 6}" cy="${k.ey + 8}" r="1.2"/><circle cx="${60 - k.ex - 2}" cy="${k.ey + 10}" r="1.2"/><circle cx="${60 - k.ex - 8}" cy="${k.ey + 11}" r="1.1"/><circle cx="${60 + k.ex + 6}" cy="${k.ey + 8}" r="1.2"/><circle cx="${60 + k.ex + 2}" cy="${k.ey + 10}" r="1.2"/><circle cx="${60 + k.ex + 8}" cy="${k.ey + 11}" r="1.1"/></g>`;
    if (b.kind === 'brute') s += `<path d="M${b.L + 10} ${b.armY + 22} Q60 ${b.armY + 30} ${b.R - 10} ${b.armY + 22} M60 ${b.armY + 26} V160 M${60 - 14} ${b.armY + 40} q7 4 14 0 q7 4 14 0" fill="none" stroke="${dark(k.fill, 0.3)}" stroke-width="2.2" stroke-linecap="round"/>`;   // грудь и пресс громилы
    if (b.kind === 'wisp') s += `<path d="M${b.L + 12} 160 C${b.L + 8} 130 ${60 - 8} ${b.top + 40} 60 ${b.top + 20} C${60 + 8} ${b.top + 40} ${b.R - 8} 130 ${b.R - 12} 160 Z" fill="${FIRE[1]}" opacity=".55"/><path d="M${60 - 10} 160 C${60 - 12} 140 ${60 - 4} 128 60 ${b.top + 52} C${60 + 4} 128 ${60 + 12} 140 ${60 + 10} 160 Z" fill="${FIRE[0]}" opacity=".6"/>`;   // огненная сердцевина
    if (b.kind === 'dandy') s += `<path d="M${60 - 10} ${k.my + 12} L60 ${k.my + 22} L${60 + 10} ${k.my + 12}" fill="none" stroke="${dark(k.fill, 0.4)}" stroke-width="2.4" stroke-linecap="round"/>`;   // острый воротничок
    s += `<path d="M${b.L + 8} ${b.top + 30} q2 -12 12 -16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".25"/>`;
    s += '</g>';
    s += `<path d="${d}" fill="none" stroke="${RIM}" stroke-width="6" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    if (b.kind === 'bat') s += `<path d="M${60 - 10} ${b.top + 10} L${60 - 26} ${b.top - 14} L${60 - 18} ${b.top + 18} Z M${60 + 10} ${b.top + 10} L${60 + 26} ${b.top - 14} L${60 + 18} ${b.top + 18} Z" fill="${k.fill}" ${WS}/><path d="M${60 - 14} ${b.top + 10} L${60 - 23} ${b.top - 8} L${60 - 18} ${b.top + 13} Z M${60 + 14} ${b.top + 10} L${60 + 23} ${b.top - 8} L${60 + 18} ${b.top + 13} Z" fill="${light(k.fill, 0.4)}"/>`;   // уши нетопыря
    if (b.kind === 'hatch') {   // скорлупа: нижняя половинка яйца с зубчатым краем
      let z = `M${b.L - 4} 136`; for (let i = 1; i <= 8; i++) z += ` L${f1(b.L - 4 + (b.R - b.L + 8) * i / 8)} ${i % 2 ? 128 : 138}`;
      s += `<path d="${z} C${b.R + 6} 152 ${b.R} 170 60 171 C${b.L} 170 ${b.L - 6} 152 ${b.L - 4} 136 Z" fill="#fbf6ea" ${S3}/><g fill="#e8dcc0"><circle cx="${b.L + 6}" cy="150" r="2.4"/><circle cx="${b.R - 10}" cy="156" r="3"/><circle cx="62" cy="162" r="2"/></g><path d="M${b.R - 6} 140 l-4 6 l3 4" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
    } else if (!b.ghosty) s += hoof(47) + hoof(73);   // копытца — перед телом
    s += horns(k, t);
    if (t.goatee) s += `<path d="M55 ${k.my + 7} Q60 ${k.my + 22} 65 ${k.my + 7} Z" fill="${dark(k.fill, 0.6)}" ${WS}/>`;
    return s;
  }

  /* ── лицо ── */
  const brows = (k, t) => (t.brows ? `<path d="M${60 - k.ex - 6} ${k.ey - 10} l9 3 M${60 + k.ex + 6} ${k.ey - 10} l-9 3" ${FSW(2.4)}/>` : '');
  function eyes(kind, k) {
    const { ex, ey } = k, t = T(k);
    if (kind === 'big') return `<circle cx="${60 - ex}" cy="${ey}" r="7" fill="#fff" stroke="${INK}" stroke-width="2.4"/><circle cx="${60 + ex}" cy="${ey}" r="7" fill="#fff" stroke="${INK}" stroke-width="2.4"/><circle cx="${60 - ex + 1}" cy="${ey + 1}" r="3" fill="${INK}"/><circle cx="${60 + ex + 1}" cy="${ey + 1}" r="3" fill="${INK}"/>` + brows(k, t);
    if (kind === 'cyclops') return `<circle cx="60" cy="${ey}" r="10" fill="${FIRE[0]}" stroke="${INK}" stroke-width="2.6"/><ellipse cx="60" cy="${ey}" rx="2.4" ry="7" fill="${INK}"/>`;
    if (kind === 'stars') return [60 - ex, 60 + ex].map((x) => `<path d="M${x} ${ey - 6} L${x + 1.8} ${ey - 1.8} L${x + 6} ${ey} L${x + 1.8} ${ey + 1.8} L${x} ${ey + 6} L${x - 1.8} ${ey + 1.8} L${x - 6} ${ey} L${x - 1.8} ${ey - 1.8} Z" fill="${GOLD}" stroke="${INK}" stroke-width="1.4"/>`).join('');
    if (kind === 'happy') return `<path d="M${60 - ex - 4} ${ey + 1} q4 -6 8 0 M${60 + ex - 4} ${ey + 1} q4 -6 8 0" ${FS}/>`;
    if (kind === 'slit')   // жёлтые глаза со зрачком-щёлкой
      return [60 - ex, 60 + ex].map((x) => `<ellipse cx="${x}" cy="${ey}" rx="5.4" ry="5" fill="${FIRE[0]}" stroke="${INK}" stroke-width="2.2"/><ellipse cx="${x}" cy="${ey}" rx="1.4" ry="4.4" fill="${INK}"/>`).join('') + brows(k, t);
    if (kind === 'sly')   // хитрый прищур, одна бровь вверх
      return `<path d="M${60 - ex - 5} ${ey} q5 -3 10 0" ${FS}/><circle cx="${60 + ex}" cy="${ey}" r="4" fill="${INK}"/><path d="M${60 - ex - 6} ${ey - 8} l10 2 M${60 + ex - 5} ${ey - 11} q5 -3 10 1" ${FSW(2.4)}/>`;
    return `<circle cx="${60 - ex}" cy="${ey}" r="4" fill="${INK}"/><circle cx="${60 + ex}" cy="${ey}" r="4" fill="${INK}"/>` + brows(k, t);
  }
  function mouth(kind, k) {
    const my = k.my, t = T(k);
    const fang = (x) => `<path d="M${x - 2} ${my - 2.6} l2 5 l2 -5 z" fill="#fff" stroke="${INK}" stroke-width="1"/>`;
    if (kind === 'open') return `<path d="M50 ${my - 2} q10 14 20 0 z" fill="#5a0a14" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` + (t.fang ? fang(54) + fang(66) : '');
    if (kind === 'grin') return `<path d="M48 ${my - 3} Q60 ${my + 2} 72 ${my - 5} Q66 ${my + 9} 58 ${my + 7} Q51 ${my + 6} 48 ${my - 3} Z" fill="#fff" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` + (t.fang ? `<path d="M54 ${my + 1} l2 4 l2 -4 M63 ${my} l2 4 l2 -4" fill="none" stroke="${INK}" stroke-width="1.2"/>` : '');   // ухмылка набок
    return `<path d="M50 ${my - 2} q10 10 20 0" ${FS}/><path d="M57 ${my + 2} q3 9 0 12 l3 -3 l3 3 q-3 -3 0 -12 z" fill="#ff4a6a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;   // раздвоенный язык
  }
  const faces = {
    sad(k) {
      const { ex, ey, my } = k;
      const e = k.cyc ? `<circle cx="60" cy="${ey}" r="10" fill="${FIRE[0]}" stroke="${INK}" stroke-width="2.6"/><ellipse cx="60" cy="${ey + 3}" rx="2.4" ry="6" fill="${INK}"/><path d="M48 ${ey - 13} q12 -8 24 0" ${FS}/>`
        : `<circle cx="${60 - ex}" cy="${ey + 1}" r="4" fill="${INK}"/><circle cx="${60 + ex}" cy="${ey + 1}" r="4" fill="${INK}"/><path d="M${60 - ex - 6} ${ey - 7} l9 -4 M${60 + ex + 6} ${ey - 7} l-9 -4" ${FS}/>`;
      return { eyes: e + `<path class="tear" d="M${60 + ex + 4} ${ey + 6} q-3 6 0 8 q3 -2 0 -8 z" fill="#7cc8ff" stroke="${INK}" stroke-width="1.4"/>`, mouth: `<path d="M51 ${my + 4} q9 -8 18 0" ${FS}/>` };
    },
    chill(k) {
      const { ex, ey, my } = k;
      return { eyes: k.cyc ? `<path d="M51 ${ey + 1} q9 -7 18 0" ${FS}/>` : `<path d="M${60 - ex - 5} ${ey + 1} q5 -5 10 0 M${60 + ex - 5} ${ey + 1} q5 -5 10 0" ${FS}/>`, mouth: `<path d="M50 ${my} q10 8 20 -2" ${FS}/>` };
    },
    stern(k) {
      const { ex, ey, my } = k;
      return { eyes: k.cyc ? `<circle cx="60" cy="${ey}" r="10" fill="${FIRE[0]}" stroke="${INK}" stroke-width="2.6"/><ellipse cx="60" cy="${ey + 1}" rx="2.4" ry="7" fill="${INK}"/><path d="M47 ${ey - 13} l13 5 l13 -5" ${FS}/>`
        : [60 - ex, 60 + ex].map((x) => `<ellipse cx="${x}" cy="${ey + 1}" rx="5" ry="4.4" fill="${FIRE[0]}" stroke="${INK}" stroke-width="2"/><ellipse cx="${x}" cy="${ey + 1}" rx="1.4" ry="3.6" fill="${INK}"/>`).join('') + `<path d="M${60 - ex - 8} ${ey - 9} l11 5 M${60 + ex + 8} ${ey - 9} l-11 5" ${FS}/>`, mouth: `<path d="M51 ${my + 3} q9 -4 18 0" ${FS}/><path d="M54 ${my + 1} l2 4 l2 -4 z M62 ${my + 1} l2 4 l2 -4 z" fill="#fff" stroke="${INK}" stroke-width="1"/>` };
    },
    hurt(k) {
      const { ex, ey, my } = k;
      return { eyes: k.cyc ? `<circle cx="60" cy="${ey}" r="10" fill="${FIRE[0]}" stroke="${INK}" stroke-width="2.6"/><path d="M51 ${ey + 1} q9 -5 18 0" ${FS}/>`
        : `<path d="M${60 - ex - 4} ${ey - 4} l8 8 M${60 - ex + 4} ${ey - 4} l-8 8" ${FS}/><circle cx="${60 + ex}" cy="${ey + 1}" r="3.4" fill="${INK}"/><path d="M${60 + ex + 7} ${ey - 7} l-9 -3" ${FS}/>`, mouth: `<path d="M50 ${my + 2} q5 -5 10 0 q5 5 10 0" ${FS}/>` };
    },
  };

  /* ── шапки (только k.b, k.fill, k.c2) ── */
  function hats(k) {
    const b = k.b, c1 = k.fill, c2 = k.c2;
    const t = b.square ? b.top - 6 : b.top, hw = b.hw, cx = 60, L = f1(cx - hw), R = f1(cx + hw);
    const flame = (x, y, s) => `<path d="M${x} ${y} Q${f1(x - 9 * s)} ${f1(y - 8 * s)} ${f1(x - 3 * s)} ${f1(y - 20 * s)} Q${f1(x - 2 * s)} ${f1(y - 12 * s)} ${f1(x + 2 * s)} ${f1(y - 16 * s)} Q${f1(x + 8 * s)} ${f1(y - 8 * s)} ${x} ${y} Z" fill="${FIRE[1]}" ${WS}/><path d="M${x} ${f1(y - 2 * s)} Q${f1(x - 4 * s)} ${f1(y - 7 * s)} ${f1(x - 1 * s)} ${f1(y - 12 * s)} Q${f1(x + 3 * s)} ${f1(y - 7 * s)} ${x} ${f1(y - 2 * s)} Z" fill="${FIRE[0]}"/>`;
    let thorns = ''; for (let i = -3; i <= 3; i++) { const x = f1(cx + i * hw * 0.3), y = f1(t + 3 - (3 - Math.abs(i)) * 2); thorns += `<path d="M${x - 4} ${y} L${x} ${f1(y - 7)} L${x + 4} ${y} Z"/>`; }
    return {
      none: '',
      tuft: flame(cx, t + 4, 1),   // огонёк на макушке
      cap: `<path d="M${L - 2} ${t + 12} q${f1(hw + 2)} -26 ${f1(2 * hw + 4)} 0 z" fill="${c2}" ${S3}/><path d="M${R} ${t + 10} l14 2" ${FS}/>`,
      bow: `<path d="M${cx} ${t + 2} l-12 -8 l0 14 z M${cx} ${t + 2} l12 -8 l0 14 z" fill="${c2}" ${S3}/><circle cx="${cx}" cy="${t + 2}" r="2.6" fill="${INK}"/>`,
      horns: `<path d="M${f1(cx - hw * 0.25)} ${t + 6} C${cx - 30} ${t} ${cx - 34} ${t - 22} ${cx - 22} ${t - 34} C${cx - 24} ${t - 18} ${cx - 16} ${t - 6} ${f1(cx - hw * 0.05)} ${t + 2} Z M${f1(cx + hw * 0.25)} ${t + 6} C${cx + 30} ${t} ${cx + 34} ${t - 22} ${cx + 22} ${t - 34} C${cx + 24} ${t - 18} ${cx + 16} ${t - 6} ${f1(cx + hw * 0.05)} ${t + 2} Z" fill="${GOLD}" ${S3}/>`,   // большие золотые рога
      crown: `<path d="M${cx - 15} ${t + 6} l0 -18 l8 9 l7 -13 l7 13 l8 -9 l0 18 z" fill="${GOLD}" ${S3}/><circle cx="${cx}" cy="${t - 2}" r="2.6" fill="${FIRE[2]}"/>`,
      tophat: `<path d="M${cx - 13} ${t + 4} v-28 h26 v28 z" fill="#2a1a22" ${S3}/><path d="M${cx - 22} ${t + 5} h44" ${FSW(3.6)}/><path d="M${cx - 13} ${t - 3} h26" stroke="${FIRE[2]}" stroke-width="4.4"/>`,   // цилиндр чёрта-джентльмена
      party: `<path d="M${cx - 13} ${t + 6} L${cx} ${t - 30} L${cx + 13} ${t + 6} z" fill="${c2}" ${S3}/>${flame(cx, t - 28, 0.5)}`,
      wizard: `<path d="M${L - 6} ${t + 10} L${cx + 6} ${t - 40} Q${cx + 14} ${t - 34} ${cx + 22} ${t - 30} L${R + 6} ${t + 10} z" fill="#2a1a22" ${S3}/><path d="M${L - 4} ${t + 4} H${R + 4}" stroke="${FIRE[1]}" stroke-width="3.6"/>`,   // шляпа ведьмы
      antenna: `<path d="M${cx} ${t + 2} v-18" ${FS}/><path d="M${cx - 7} ${t - 16} v-8 M${cx} ${t - 16} v-11 M${cx + 7} ${t - 16} v-8 M${cx - 7} ${t - 16} h14" ${FS}/><path d="M${cx - 9} ${t - 24} l2 -4 l2 4 M${cx - 2} ${t - 27} l2 -4 l2 4 M${cx + 5} ${t - 24} l2 -4 l2 4" fill="${INK}" ${WS}/>`,   // трезубчик
      antenna2: `<path d="M${cx - 6} ${t + 2} l-8 -20 M${cx + 6} ${t + 2} l8 -20" ${FS}/>${flame(cx - 14, t - 18, 0.45)}${flame(cx + 14, t - 18, 0.45)}`,
      cat: `<path d="M${L} ${t + 12} l2 -24 l14 14 z M${R} ${t + 12} l-2 -24 l-14 14 z" fill="${c1}" ${S3}/>`,
      bunny: `<ellipse cx="${cx - 9}" cy="${t - 16}" rx="7" ry="20" fill="${c1}" ${S3}/><ellipse cx="${cx + 9}" cy="${t - 16}" rx="7" ry="20" fill="${c1}" ${S3}/>`,
      halo: `<g transform="rotate(-14 ${cx} ${t - 14})"><ellipse cx="${cx}" cy="${t - 14}" rx="17" ry="5" fill="none" stroke="#fff3b0" stroke-width="7" opacity=".35"/><path d="M${cx - 17} ${t - 14} A17 5 0 1 1 ${cx + 12} ${t - 10}" fill="none" stroke="#ffe27a" stroke-width="3.6"/></g>`,   // кривой треснувший нимб
      sprout: `<path d="M${cx} ${t + 2} v-12" stroke="#3a7a2a" stroke-width="2.6"/>${flame(cx, t - 10, 0.55)}`,   // огненный цветок
      bandana: `<path d="M${L - 2} ${t + 16} Q${cx} ${t - 6} ${R + 2} ${t + 16} Z" fill="#2a1a22" ${S3}/><path d="M${R} ${t + 14} l12 -2 l-4 10 z" fill="#2a1a22" ${S3}/><g fill="${FIRE[1]}"><circle cx="${cx - 8}" cy="${t + 6}" r="2"/><circle cx="${cx + 6}" cy="${t + 4}" r="2"/><circle cx="${cx}" cy="${t + 11}" r="2"/></g>`,
      // только из Костюмерной
      legion: `<path d="M${L - 5} ${t + 16} Q${L - 5} ${t - 15} ${cx} ${t - 15} Q${R + 5} ${t - 15} ${R + 5} ${t + 16} L${R - 2} ${t + 16} L${R - 2} ${t + 8} L${L + 2} ${t + 8} L${L + 2} ${t + 16} Z" fill="#d9b04a" ${S3}/><path d="M${cx - 18} ${t - 13} Q${cx - 14} ${t - 40} ${cx} ${t - 41} Q${cx + 14} ${t - 40} ${cx + 18} ${t - 13} Z" fill="#2a1a22" ${S3}/>`,
      laurel: `<g fill="#3a2a2a" ${WS}>${thorns}</g>`,   // терновый венец
      beret: `<ellipse cx="${cx - 4}" cy="${t + 2}" rx="${f1(hw + 8)}" ry="10" transform="rotate(-8 ${cx} ${t})" fill="${c2}" ${S3}/><path d="M${cx - 2} ${t - 8} l3 -8" ${FS}/>`,
      headphones: `<path d="M${L - 6} ${b.eyeY - 4} Q${L - 6} ${t - 14} ${cx} ${t - 14} Q${R + 6} ${t - 14} ${R + 6} ${b.eyeY - 4}" fill="none" stroke="${INK}" stroke-width="5"/><rect x="${f1(L - 13)}" y="${b.eyeY - 14}" width="12" height="22" rx="5" fill="${c2}" ${S3}/><rect x="${f1(R + 1)}" y="${b.eyeY - 14}" width="12" height="22" rx="5" fill="${c2}" ${S3}/>`,
      cowboy: `<path d="M${cx - 18} ${t + 5} q-4 -30 18 -34 q22 4 18 34 z" fill="#5a2a1a" ${S3}/><path d="M${cx - 38} ${t + 2} q38 18 76 0 q-8 12 -38 13 q-30 -1 -38 -13 z" fill="#4a2010" ${S3}/><path d="M${cx - 17} ${t - 3} h34" stroke="${FIRE[1]}" stroke-width="4"/>`,
      chef: `<path d="M${cx - 14} ${t + 6} v-14 q-12 -2 -8 -14 q4 -10 14 -4 q4 -10 12 -2 q10 -4 12 6 q2 10 -10 14 v14 z" fill="#fff" ${S3}/>`,
    };
  }

  /* ── руки ── */
  const limb = (d, col) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="8.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="4.8" stroke-linecap="round"/>`;
  const handAt = (k, x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="5.4" fill="${k.fill}" stroke="${INK}" stroke-width="2.2"/><path d="M${f1(x - 3)} ${f1(y - 4.6)} l-1 -2 M${f1(x)} ${f1(y - 5.4)} v-2 M${f1(x + 3)} ${f1(y - 4.6)} l1 -2" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;   // коготки
  const back = (k) => { const t = T(k); return wings(k, t) + tail(k, t); };   // крылья и хвост — за руками и телом

  /* ── оружие: рукоять в (0,0), клинок вверх ── */
  function weapon(kind, rar) {
    const m = METAL[rar] || METAL.common, rich = rar && rar !== 'common', dw = '#3a1a1a';
    const grip = (y0, y1) => `<rect x="-2.5" y="${y1}" width="5" height="${y0 - y1}" rx="2" fill="${dw}" ${WS}/>`;
    const fl = (x, y, s) => `<path d="M${x} ${y} Q${f1(x - 6 * s)} ${f1(y - 6 * s)} ${f1(x - 2 * s)} ${f1(y - 14 * s)} Q${f1(x + 4 * s)} ${f1(y - 6 * s)} ${x} ${y} Z" fill="${FIRE[1]}" stroke="${INK}" stroke-width="1.4"/>`;
    switch (kind) {
      case 'sword': return `${grip(14, 0)}<path d="M-4 -2 V-48 L0 -58 L4 -48 V-2 Z" fill="${rich ? m : '#ff7a3d'}" ${WS}/><path d="M0 -6 V-50" stroke="${FIRE[0]}" stroke-width="1.6"/><rect x="-11" y="-4" width="22" height="6" rx="3" fill="#2a1a22" ${WS}/>${fl(-6, -30, 0.8)}${fl(6, -42, 0.7)}`;   // огненный меч
      case 'gladius': return `${grip(13, 0)}<path d="M-5 -2 C-7 -18 -6 -32 0 -44 C6 -32 7 -18 5 -2 Z" fill="${m}" ${WS}/><rect x="-9" y="-4" width="18" height="6" rx="3" fill="#2a1a22" ${WS}/>`;
      case 'dagger': return `${grip(12, 0)}<path d="M-3 -2 C-6 -12 -2 -24 4 -30 C2 -20 4 -10 3 -2 Z" fill="${m}" ${WS}/><rect x="-7" y="-4" width="14" height="5" rx="2.5" fill="#2a1a22" ${WS}/>`;   // кинжал-коготь
      case 'axe': return `${grip(14, -50)}<path d="M2 -48 C18 -56 26 -42 24 -26 C18 -30 9 -32 2 -30 Z" fill="${m}" ${WS}/><path d="M-2 -48 l-8 -4" ${WS}/>`;
      case 'club': return `${grip(14, -24)}<circle cy="-40" r="16" fill="#2a1a22" ${WS}/><circle cy="-40" r="11" fill="${rich ? m : '#4a3a42'}"/><path d="M-5 -46 a7 7 0 0 1 6 -3" fill="none" stroke="#fff" stroke-width="1.6" opacity=".5"/>`;   // адская сковородка
      case 'mace': return `${grip(12, -34)}${[0, 60, 120, 180, 240, 300].map((a) => { const r2 = a * Math.PI / 180, x = f1(Math.sin(r2) * 13), y = f1(-42 - Math.cos(r2) * 13); return `<path d="M0 -42 L${x} ${y}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`; }).join('')}<circle cy="-42" r="9" fill="${m}" ${WS}/>`;
      case 'hammer': return `${grip(14, -40)}<rect x="-13" y="-54" width="26" height="15" rx="3" fill="${m}" ${WS}/>${fl(-8, -54, 0.6)}${fl(6, -54, 0.6)}`;
      case 'spear': return `<rect x="-2.5" y="-68" width="5" height="100" rx="2" fill="${dw}" ${WS}/><path d="M-6 -64 L0 -86 L6 -64 Z" fill="${m}" ${WS}/>`;
      case 'pitchfork': return `<rect x="-2.5" y="-54" width="5" height="86" rx="2" fill="${dw}" ${WS}/><path d="M-12 -54 H12 M-11 -54 V-72 M0 -54 V-80 M11 -54 V-72" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M-12 -54 H12 M-11 -54 V-72 M0 -54 V-80 M11 -54 V-72" fill="none" stroke="${rich ? m : '#ff4a1a'}" stroke-width="3" stroke-linecap="round"/><path d="M-14 -74 l3 -6 l3 6 M-3 -82 l3 -6 l3 6 M8 -74 l3 -6 l3 6" fill="${rich ? m : '#ff4a1a'}" ${WS}/>`;   // трезубец
      case 'bow': return `<path d="M-2 -44 C16 -30 16 30 -2 44" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-2 -44 C16 -30 16 30 -2 44" fill="none" stroke="${rich ? m : '#7a1a2a'}" stroke-width="4.4" stroke-linecap="round"/><path d="M-2 -44 L-6 0 L-2 44" fill="none" stroke="${FIRE[1]}" stroke-width="1.6"/>`;
      case 'staff': return `<rect x="-2.5" y="-60" width="5" height="96" rx="2" fill="${dw}" ${WS}/><circle cy="-68" r="8" fill="${rich ? RARITY[rar] : FIRE[1]}" ${WS}/><circle cx="-2" cy="-70" r="3" fill="${FIRE[0]}"/>`;   // посох с огненным шаром
      case 'crook': return `<path d="M0 34 V-48 C-3 -62 10 -68 13 -58 C15 -50 5 -47 5 -54" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M0 34 V-48 C-3 -62 10 -68 13 -58 C15 -50 5 -47 5 -54" fill="none" stroke="${rich ? m : '#7a1a2a'}" stroke-width="3.6" stroke-linecap="round"/>`;
      case 'censer': return `<path d="M0 0 V18" stroke="${INK}" stroke-width="2" stroke-dasharray="3 1.6"/><path d="M-11 20 Q-12 36 0 38 Q12 36 11 20 Z" fill="#2a1a22" ${WS}/><path d="M-12 20 H12" ${WS}/>${fl(-4, 20, 0.6)}${fl(4, 20, 0.5)}`;   // котелок с огнём
      default: return '';
    }
  }
  function shield(kind, rar) {
    const m = METAL[rar] || METAL.common;
    switch (kind) {
      case 'scutum': return `<rect x="-13" y="-21" width="26" height="42" rx="6" fill="#2a1a22" ${WS}/><rect x="-9" y="-17" width="18" height="34" rx="4" fill="none" stroke="${m}" stroke-width="2"/><path d="M0 8 Q-8 2 -4 -6 Q-2 0 0 -10 Q2 0 4 -6 Q8 2 0 8 Z" fill="${FIRE[1]}" stroke="${INK}" stroke-width="1.4"/>`;
      case 'round': return `<circle r="15" fill="#7a1a2a" ${WS}/><circle r="12" fill="none" stroke="${m}" stroke-width="2.4"/><circle r="4" fill="${m}" stroke="${INK}" stroke-width="1.6"/>`;
      case 'buckler': return `<circle r="10" fill="${m}" ${WS}/><path d="M-4 -2 l4 -5 l4 5 z" fill="${INK}"/>`;
      case 'barrel': return `<path d="M-14 -10 Q-15 14 0 16 Q15 14 14 -10 Z" fill="#2a1a22" ${WS}/><path d="M-16 -10 H16" ${WS}/>${`<path d="M-6 -10 Q-10 -18 -4 -24 Q-2 -16 0 -20 Q4 -14 2 -10 Z" fill="${FIRE[1]}" stroke="${INK}" stroke-width="1.4"/>`}`;   // котёл
      default: return '';
    }
  }

  /* ── доспехи для Кузни: lorica — чёрный панцирь с шипами, robe — красная мантия с огненной каймой ── */
  function armor(kind, rar) {
    const tr = RARITY[rar] || FIRE[1];
    if (kind === 'robe') return `<path d="M-22 -102 C-30 -70 -38 -30 -42 0 H42 C38 -30 30 -70 22 -102 Q0 -92 -22 -102 Z" fill="#9a1a2a" ${S3}/><path d="M-40 -8 Q-30 -16 -20 -8 Q-10 -16 0 -8 Q10 -16 20 -8 Q30 -16 40 -8" fill="none" stroke="${tr}" stroke-width="4"/><path d="M-8 -100 L0 -86 L8 -100" fill="none" stroke="${GOLD}" stroke-width="3"/>`;
    const m = rar === 'common' || !rar ? '#3a2a32' : dark(RARITY[rar], 0.35);
    return `<path d="M-32 -96 C-36 -70 -32 -40 -26 -20 H26 C32 -40 36 -70 32 -96 Q0 -86 -32 -96 Z" fill="${m}" ${S3}/>`
      + `<path d="M-44 -98 Q-34 -112 -14 -102 L-16 -84 Q-34 -86 -44 -78 Z M44 -98 Q34 -112 14 -102 L16 -84 Q34 -86 44 -78 Z" fill="${m}" ${S3}/>`
      + `<path d="M-40 -102 l-6 -10 l10 4 M40 -102 l6 -10 l-10 4" fill="${m}" ${WS}/><path d="M0 -80 Q-10 -60 0 -40 Q10 -60 0 -80 Z" fill="${tr}" stroke="${INK}" stroke-width="1.6"/>`;
  }

  /* ── ауры ── */
  const AURA = { gold: ['#ffd76a', '#ffb83d'], sparks: ['#ffe27a', '#ff6a2a'], halo: ['#ffe27a', '#ffe27a'], shadow: ['#a24bff', '#3a0f66'], frost: ['#bfe8ff', '#6fb8ff'] };
  function aura(kind, k) {
    const b = k.b, seed = k.seed >>> 0;
    const c = AURA[kind]; if (!c) return { back: '', front: '' };
    const id = k.uid('jlA'), d0 = (seed % 997) / 997 * 2;
    const cy = (b.top + 170) / 2 + 2, rx = (b.R - b.L) / 2 + 46, ry = (170 - b.top) / 2 + 42;
    const glow = (op1, op2, dur) => `<defs><radialGradient id="${id}"><stop offset=".3" stop-color="${c[0]}"/><stop offset=".62" stop-color="${c[1]}" stop-opacity=".7"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient></defs>`
      + `<ellipse cx="60" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#${id})"><animate attributeName="opacity" values="${op1};${op2};${op1}" dur="${dur}s" begin="-${d0.toFixed(2)}s" repeatCount="indefinite"/></ellipse>`;
    const motes = (n, col, shape, size) => Array.from({ length: n }, (_, i) => {
      const x = b.L - 8 + ((i * 37 + (seed >>> (i % 8))) % (b.R - b.L + 16)), y0 = 168 - (i * 23) % 40, dur = 1.8 + (i % 4) * 0.45, beg = ((i * 0.53 + d0) % dur).toFixed(2);
      const sh = shape === 'flame' ? `<path d="M0 ${size} Q${-size} 0 0 ${-size * 1.6} Q${size} 0 0 ${size} Z" fill="${col}"/>`
        : shape === 'flake' ? `<path d="M0 ${-size} V${size} M${-size} 0 H${size} M${f1(-size * 0.7)} ${f1(-size * 0.7)} L${f1(size * 0.7)} ${f1(size * 0.7)} M${f1(size * 0.7)} ${f1(-size * 0.7)} L${f1(-size * 0.7)} ${f1(size * 0.7)}" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>`
        : `<circle r="${size}" fill="${col}"/>`;
      return `<g opacity="0"><animateTransform attributeName="transform" type="translate" values="${x} ${y0};${x + (i % 2 ? 6 : -6)} ${y0 - 70}" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.2;.7;1" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/>${sh}</g>`;
    }).join('');
    let bk = '', front = '';
    if (kind === 'gold') { bk = glow(0.7, 1, 2.4); front = motes(9, '#ffe9a0', 'dot', 2.6); }
    else if (kind === 'sparks') { bk = glow(0.3, 0.55, 2); front = motes(12, '#ff9a2a', 'flame', 3.4); }   // угольки
    else if (kind === 'shadow') { bk = glow(0.75, 1, 1.6); front = motes(11, '#c48bff', 'flame', 3.6); }   // тёмное пламя
    else if (kind === 'frost') { bk = glow(0.6, 0.95, 2.8); front = motes(10, '#e6f7ff', 'flake', 4.4); }
    else if (kind === 'halo') {
      const t = (b.square ? b.top - 6 : b.top) - 36;
      front = `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="2.2s" begin="-${d0.toFixed(2)}s" repeatCount="indefinite"/>`
        + `<ellipse cx="60" cy="${t}" rx="19" ry="5.5" fill="none" stroke="#fff3b0" stroke-width="9" opacity=".35"/><ellipse cx="60" cy="${t}" rx="19" ry="5.5" fill="none" stroke="#ffe27a" stroke-width="4"><animate attributeName="stroke-opacity" values=".75;1;.75" dur="1.6s" repeatCount="indefinite"/></ellipse></g>`;
    }
    return { back: bk, front };
  }

  const OUT = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`;

  D.addStyle({
    id: 'cherts',
    name: 'Чертики',
    css: '',

    // ровно 2 вызова r(): цвет кожи и второй цвет
    palette(r) {
      const fill = SKINS[Math.floor(r() * SKINS.length)];
      const c2 = `hsl(${Math.floor(r() * 360)} 75% 55%)`;
      return { fill, c2 };
    },
    bodies,
    frame(b) {
      return { L: b.L, R: b.R, ex: b.narrow ? 8 : 10, ey: b.eyeY, my: b.eyeY + 14, sx: { l: b.L + (b.square ? 4 : 6), r: b.R - (b.square ? 4 : 6) } };
    },
    body,

    eyePool: ['dots', 'dots', 'big', 'happy', 'slit', 'slit', 'sly', 'sly', 'cyclops', 'stars'],
    eyes,
    mouthPool: ['open', 'grin', 'grin', 'tongue'],
    mouth,
    faces,
    blushChance: 0.35,
    blush: (k) => `<circle cx="${60 - k.ex - 9}" cy="${k.ey + 9}" r="4" fill="#ffb0c0" opacity=".55"/><circle cx="${60 + k.ex + 9}" cy="${k.ey + 9}" r="4" fill="#ffb0c0" opacity=".55"/>`,
    hurt(k) {   // пластырь и подпалина
      const b = k.b, px = f1(60 + b.hw * 0.45), py = b.square ? b.top + 10 : b.top + 14;
      return `<g transform="rotate(35 ${px} ${py})"><rect x="${f1(px - 10)}" y="${py - 3.5}" width="20" height="7" rx="2" fill="#f1d9b5" stroke="${INK}" stroke-width="1.6"/><rect x="${f1(px - 3.5)}" y="${py - 10}" width="7" height="20" rx="2" fill="#f1d9b5" stroke="${INK}" stroke-width="1.6"/></g>`
        + `<circle cx="${60 - k.ex - 8}" cy="${k.ey + 10}" r="5" fill="#2a1a22" opacity=".35"/>`;
    },

    hatPool: ['none', 'tuft', 'cap', 'bow', 'horns', 'crown', 'tophat', 'party', 'wizard', 'antenna', 'antenna2', 'cat', 'bunny', 'halo', 'sprout', 'bandana'],
    hatNoneChance: 0.4,   // рога и так есть — чаще без шапки
    hats,

    arms: {
      up(k) {
        const b = k.b, sx = k.sx, hy = 36 + (b.top > 90 ? 10 : 0);
        const arm = (s, hx) => limb(`M${s} ${b.armY} C${f1(s + (hx - s) * 0.2)} ${b.armY - 30} ${hx} ${hy + 34} ${hx} ${hy}`, k.fill) + handAt(k, hx, hy);
        return back(k) + `<g class="arm armL" style="transform-origin:${sx.l}px ${b.armY}px">${arm(sx.l, k.L - 16)}</g><g class="arm armR" style="transform-origin:${sx.r}px ${b.armY}px">${arm(sx.r, k.R + 16)}</g>`;
      },
      down(k) {
        const b = k.b, sx = k.sx, ey = Math.min(160, b.armY + 42);
        const arm = (s, dir) => limb(`M${s} ${b.armY} C${s + dir * 10} ${b.armY + 14} ${s + dir * 12} ${b.armY + 28} ${s + dir * 9} ${ey}`, k.fill) + handAt(k, s + dir * 9, ey + 3);
        return back(k) + `<g class="arm sadL">${arm(sx.l, -1)}</g><g class="arm sadR">${arm(sx.r, 1)}</g>`;
      },
      armed(k) {
        const b = k.b, sx = k.sx;
        const hr = { x: k.R + 15, y: b.armY + 12 }, hl = { x: k.L - 7, y: b.armY + 20 };
        const svg = back(k) + `<g class="arm batL">${limb(`M${sx.l} ${b.armY} C${sx.l - 8} ${b.armY + 6} ${hl.x + 2} ${hl.y - 8} ${hl.x} ${hl.y}`, k.fill)}</g><g class="arm batR">${limb(`M${sx.r} ${b.armY} C${sx.r + 8} ${b.armY + 4} ${hr.x - 2} ${hr.y - 8} ${hr.x} ${hr.y}`, k.fill)}</g>`;
        return { svg, right: hr, left: hl };
      },
    },
    hand: (k, x, y) => handAt(k, x, y),
    hold: { weaponScale: 1.2, weaponRot: (kind) => (kind === 'bow' || kind === 'censer' || kind === 'grimoire' ? 0 : 12), shieldScale: 1.12, shieldDx: 6, shieldDy: 2 },
    weapon,
    shield,
    armor,
    wear: { line: INK, ink: INK },   // 19.10: обводка надетых доспехов и амулета (рисует скелет, doodle-core.js)
    rarityGlow: RARITY,
    gearGlow: (id, color) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="3.4" flood-color="${color}" flood-opacity="1"/></filter>`,
    held: {
      // огненный коктейль
      cocktail(k, rot) {
        const hy = Math.min(160, k.b.armY + 42) + 3, hx = k.sx.r + 9;
        return `<g transform="translate(${hx} ${hy}) rotate(${rot})"><g class="jd-cocktail">`
          + `<path d="M-1.5 0 V-10 M-7 1 h11" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
          + `<path d="M-14 -26 L12 -26 L-1 -10 Z" fill="rgba(255,220,220,.5)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M-11 -23 L9 -23 L-1 -12 Z" fill="#ff4a1a"/>`
          + `<path d="M-4 -26 Q-8 -32 -3 -40 Q-2 -34 1 -36 Q5 -30 1 -26 Z" fill="${FIRE[1]}" stroke="${INK}" stroke-width="1.4"/><path d="M-2 -27 Q-4 -31 -1 -34 Q1 -30 -2 -27 Z" fill="${FIRE[0]}"/>`
          + `</g></g>${handAt(k, hx, hy)}`;
      },
    },

    capeColor: '#2a1a22',
    acc: {
      cape(k, col) {
        const L = k.L, R = k.R, t = k.b.armY - 8;
        return `<path d="M${L + 6} ${t} C${L - 12} ${t + 30} ${L - 20} 150 ${L - 18} 168 L${R + 18} 168 C${R + 20} 150 ${R + 12} ${t + 30} ${R - 6} ${t} Z" fill="${col}" ${S3}/><path d="M${L + 4} ${t + 2} Q60 ${t + 14} ${R - 4} ${t + 2}" fill="none" stroke="${FIRE[2]}" stroke-width="3.4" stroke-linecap="round"/>`;
      },
      bowtie(k, col) {
        const y = k.my + 14;
        return `<path d="M60 ${y} l-11 -7 l0 14 z M60 ${y} l11 -7 l0 14 z" fill="${col}" ${OUT}/><circle cx="60" cy="${y}" r="3" fill="${INK}"/>`;
      },
      glasses(k) {
        const { ex, ey } = k;
        return k.cyc ? `<circle cx="60" cy="${ey}" r="14" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="3"/>`
          : `<circle cx="${60 - ex}" cy="${ey}" r="8.5" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="3"/><circle cx="${60 + ex}" cy="${ey}" r="8.5" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="3"/><path d="M${60 - ex + 8} ${ey - 1} q${ex - 8} -5 ${2 * ex - 16} 0" fill="none" stroke="${INK}" stroke-width="3"/>`;
      },
      shades(k) {   // тёмные очки-пламя
        const { ex, ey } = k;
        return k.cyc ? `<rect x="44" y="${ey - 8}" width="32" height="15" rx="6" fill="${INK}"/>`
          : `<path d="M${60 - ex - 10} ${ey - 6} h${2 * ex + 20} v4 q0 9 -9 9 q-7 0 -${ex - 2} -8 h-2 q-${ex - 4} 8 -${ex - 2} 8 q-9 0 -9 -9 z" fill="${INK}"/><path d="M${60 - ex - 7} ${ey - 3} l4 0 M${60 + ex - 3} ${ey - 3} l4 0" stroke="${FIRE[1]}" stroke-width="2" opacity=".8"/>`;
      },
      monocle(k) {
        const { ex, ey } = k, cyc = k.cyc, x = cyc ? 60 : 60 + ex;
        return `<circle cx="${x}" cy="${ey}" r="${cyc ? 13 : 8.5}" fill="rgba(255,255,255,.2)" stroke="${GOLD}" stroke-width="3"/><path d="M${x + (cyc ? 9 : 6)} ${ey + (cyc ? 10 : 6)} q6 14 -2 30" fill="none" stroke="${GOLD}" stroke-width="1.8"/>`;
      },
      mustache(k) {   // подкрученные усики чёрта
        const my = k.my;
        return `<path d="M60 ${my - 4} c-4 -3 -10 -3 -14 0 c-3 2 -6 0 -6 -4 c-1 6 4 9 9 8 c5 -1 8 -3 11 -4 c3 1 6 3 11 4 c5 1 10 -2 9 -8 c0 4 -3 6 -6 4 c-4 -3 -10 -3 -14 0 z" fill="${INK}"/>`;
      },
      scarf(k, col) {
        const L = k.L, R = k.R, y = k.my + 12;
        return `<path d="M${L + 4} ${y - 3} Q60 ${y + 9} ${R - 4} ${y - 3} L${R - 3} ${y + 7} Q60 ${y + 19} ${L + 3} ${y + 7} Z" fill="${col}" ${OUT}/><path d="M${R - 16} ${y + 8} l3 26 l10 -2 l-3 -26 z" fill="${col}" ${OUT}/>`;
      },
      tie(k, col) {
        const y = k.my + 11;
        return `<path d="M55 ${y} h10 l-2 6 h-6 z" fill="${col}" ${OUT}/><path d="M57 ${y + 6} h6 l5 30 l-8 8 l-8 -8 z" fill="${col}" ${OUT}/>`;
      },
    },

    event: {
      crown(k, size) {
        const b = k.b, kk = size === 'mini' ? 0.7 : 1, t = b.top + (b.square ? -1 : 4), w = 16 * kk, h = 20 * kk;
        return `<path d="M${60 - w} ${t} l0 ${-h} l${w / 2} ${h * 0.45} l${w / 2} ${-h * 0.7} l${w / 2} ${h * 0.7} l${w / 2} ${-h * 0.45} l0 ${h} z" fill="${GOLD}" stroke="${INK}" stroke-width="${2.8 * kk}" stroke-linejoin="round"/>`
          + `<circle cx="60" cy="${f1(t - h * 0.35)}" r="${3 * kk}" fill="${FIRE[2]}"/>`;
      },
      wig(k) {
        const b = k.b, t = b.square ? b.top - 4 : b.top, hw = b.hw, cs = [];
        for (let i = -3; i <= 3; i++) cs.push(`<circle cx="${f1(60 + i * hw / 3.1)}" cy="${f1(t + 3 - (3 - Math.abs(i)) * 2.2)}" r="9.5"/>`);
        for (let j = 1; j <= 4; j++) { cs.push(`<circle cx="${f1(60 - hw - 7)}" cy="${t + 4 + j * 13}" r="9"/>`); cs.push(`<circle cx="${f1(60 + hw + 7)}" cy="${t + 4 + j * 13}" r="9"/>`); }
        return `<g fill="#f4f1ea" stroke="#9a9488" stroke-width="2.5">${cs.join('')}</g>`;
      },
    },
    uniform(k) {
      const u = k.uid('jlU'), y0 = k.my + 11, d = k.b.d;
      return `<defs><clipPath id="${u}c"><path d="${d}"/></clipPath><pattern id="${u}p" patternUnits="userSpaceOnUse" width="120" height="16" patternTransform="rotate(-4)"><rect width="120" height="16" fill="#f1efe8"/><rect y="8" width="120" height="8" fill="#23212b"/></pattern></defs>`
        + `<g clip-path="url(#${u}c)"><rect y="${y0}" width="120" height="${170 - y0}" fill="url(#${u}p)"/><path d="M0 ${y0} H120" stroke="#23212b" stroke-width="4"/></g>`
        + `<path fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" d="${d}"/>`;
    },

    ghost(k, parts) {   // призрак чертёнка: крылья и хвост на месте (они в parts.arms), рожки — тоже
      const g = k.uid('jlG'), cyc = k.cyc, GI = '#2a2f55', { ex, ey, my } = k;
      let wave = 'M-20 190 V160'; for (let x = -20; x < 140; x += 12) wave += ' q6 -9 12 0'; wave += ' V190 Z';
      const gEyes = cyc ? `<ellipse cx="60" cy="${ey}" rx="7" ry="9" fill="${GI}"/>` : `<ellipse cx="${60 - ex}" cy="${ey}" rx="4.6" ry="6.6" fill="${GI}"/><ellipse cx="${60 + ex}" cy="${ey}" rx="4.6" ry="6.6" fill="${GI}"/>`;
      const gMouth = `<ellipse cx="60" cy="${my + 1}" rx="4.2" ry="${k.sad ? 3 : 5.6}" fill="${GI}"/>`;
      const fl = ((k.seed >>> 0) % 1000) / 1000 * 2.6;
      return {
        style: 'filter:grayscale(.6) drop-shadow(0 0 7px rgba(255,190,190,.7))',
        inner: `<defs><mask id="${g}" maskUnits="userSpaceOnUse" x="-60" y="-80" width="240" height="280"><rect x="-60" y="-80" width="240" height="280" fill="#fff"/><path d="${wave}" fill="#000"/></mask></defs>`
          + `<g opacity=".8"><animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.6s" begin="-${fl.toFixed(2)}s" repeatCount="indefinite"/>`
          + `<g mask="url(#${g})">${parts.arms}<path fill="rgba(255,228,232,.62)" stroke="#fff0f0" stroke-width="3" stroke-linejoin="round" d="${k.b.d}"/></g>${horns(k, T(k))}${gEyes}<g class="jd-mouth">${gMouth}</g>${parts.head}</g>`,
      };
    },

    aura,
  });
})();

} catch (e) { console.error('[стили] styles/cherts/characters.js не загрузился:', e); }

/* ───── стиль «cherts»: styles/cherts/goods.js ───── */
try {
/* Стиль «Черти» — товары (часть 'goods'): адская кухня - печёное, жгучее, копчёное; «зелье жара» и обугленный пергамент.
   Рисунки совпадают с названиями из names.json. Договор — styles/legion/goods.js: { food: { id: () => svg }, potion: (it) => svg, scroll: (it) => svg }.
   Низ вещи — y = 0, ширина около 60–70. Обводка — тёмно-бордовая, как у самих чертят. */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('cherts', 'goods', function () {
    const INK = '#2a0d14', O = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const FIRE = ['#ffe27a', '#ff9a2a', '#ff4a1a'], GOLD = '#ffc83d';
    // язычок пламени: x, y - низ, s - размер
    const flame = (x, y, s = 1) => `<path d="M${x} ${y} C${x - 9 * s} ${y - 2 * s} ${x - 10 * s} ${y - 14 * s} ${x} ${y - 24 * s} C${x + 2 * s} ${y - 15 * s} ${x + 8 * s} ${y - 14 * s} ${x + 6 * s} ${y - 8 * s} C${x + 10 * s} ${y - 8 * s} ${x + 9 * s} ${y - 2 * s} ${x} ${y} Z" fill="${FIRE[1]}" ${O(2.2)}/>`
      + `<path d="M${x} ${y - 2 * s} C${x - 4 * s} ${y - 4 * s} ${x - 4 * s} ${y - 10 * s} ${x} ${y - 14 * s} C${x + 3 * s} ${y - 9 * s} ${x + 4 * s} ${y - 4 * s} ${x} ${y - 2 * s} Z" fill="${FIRE[0]}"/>`;
    const steam = (x = 0, y = -36) => `<path d="M${x - 6} ${y} q-5 -7 0 -13 M${x + 6} ${y} q-5 -7 0 -13" stroke="#ffd6c4" stroke-width="2.6" fill="none" opacity=".75" stroke-linecap="round"/>`;
    // котелок на ножках: внутри - цвет варева
    const pot = (soup, top = '') => `<path d="M-22 0 l-4 6 M22 0 l4 6" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M-30 -24 H30 Q30 4 0 4 Q-30 4 -30 -24Z" fill="#3a3346" ${O(3.4)}/>`
      + `<path d="M-24 -12 Q0 -4 24 -12" stroke="#5a5470" stroke-width="3" fill="none"/><ellipse cy="-24" rx="30" ry="6" fill="${soup}" ${O(2.6)}/>${top}`;
    const FOOD = {
      // Печёное яблоко: тёмно-красное, подпалина сверху, пар
      apple: () => `<circle cy="-16" r="16" fill="#b8202e" ${O()}/><path d="M-10 -26 q10 -6 20 0 q-4 4 -10 3 q-6 1 -10 -3Z" fill="#5a1a1a"/><path d="M0 -31 q2 -8 7 -10" stroke="#3a2614" stroke-width="3.4" fill="none"/><circle cx="-7" cy="-17" r="3.6" fill="#ff8a7a" opacity=".6"/>` + steam(0, -38),
      // Жгучий перчик: красный стручок с зелёным хвостиком
      pear: () => `<path d="M-24 -26 C-14 -34 4 -30 14 -18 C22 -8 26 -2 30 0 C18 2 4 -2 -6 -10 C-16 -16 -24 -18 -24 -26 Z" fill="#e8202e" ${O(3)}/><path d="M-12 -24 C-2 -26 8 -20 14 -12" stroke="#ff8a7a" stroke-width="3" fill="none" stroke-linecap="round"/>`
        + `<path d="M-24 -26 q-4 -6 -2 -12 q4 2 6 6Z" fill="#4caf50" ${O(2.4)}/><path d="M-26 -36 q-2 -6 2 -9" stroke="#3a7a2a" stroke-width="3" fill="none" stroke-linecap="round"/>` + flame(26, -4, 0.45),
      // Угольный крендель: тёмный крендель с горячими крупинками
      pretzel: () => `<path d="M0 -6 C-30 -4 -32 -36 -14 -38 C-2 -40 4 -26 0 -18 C-4 -26 2 -40 14 -38 C32 -36 30 -4 0 -6 Z" fill="none" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>`
        + `<path d="M0 -6 C-30 -4 -32 -36 -14 -38 C-2 -40 4 -26 0 -18 C-4 -26 2 -40 14 -38 C32 -36 30 -4 0 -6 Z" fill="none" stroke="#4a2a22" stroke-width="7.5" stroke-linejoin="round"/>`
        + [[-18, -30], [-24, -18], [16, -32], [22, -16], [-6, -8], [8, -9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${FIRE[1]}"/>`).join(''),
      // Горелая корка: хлеб с чёрной подгоревшей коркой
      bread: () => `<path d="M-32 0 C-36 -30 36 -30 32 0 Z" fill="#a0602a" ${O(3.4)}/><path d="M-30 -10 C-28 -26 28 -26 30 -10 C20 -16 8 -12 0 -16 C-10 -12 -20 -18 -30 -10 Z" fill="#2a1a1a"/>`
        + `<path d="M-14 -18 l6 8 M2 -20 l6 8" stroke="${FIRE[1]}" stroke-width="2.6" stroke-linecap="round"/>` + `<path d="M-6 -30 q-4 -6 0 -11 M6 -30 q-4 -6 0 -11" stroke="#7a6a6a" stroke-width="2.6" fill="none" opacity=".8" stroke-linecap="round"/>`,
      // Серная газировка: жёлто-зелёная бутылка с пузырьками
      kvass: () => `<path d="M-14 0 V-30 Q-14 -36 -6 -38 V-48 H6 V-38 Q14 -36 14 -30 V0 Z" fill="#d8e83a" ${O(3)}/><rect x="-8" y="-54" width="16" height="7" rx="2" fill="#c8102e" ${O(2.4)}/>`
        + `<rect x="-14" y="-24" width="28" height="12" fill="#2a0d14"/><path d="M-10 -18 h20" stroke="${GOLD}" stroke-width="2.4"/>` + [[-6, -32], [4, -28], [-2, -40]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${2 + i % 2}" fill="#fffbd0"/>`).join(''),
      // Плавленый сыр: клин, который стекает каплями
      cheese: () => `<path d="M-30 0 H30 V-28 L-30 -12 Z" fill="#ffc83d" ${O(3.4)}/><path d="M-30 -12 L30 -28 V-20 Q24 -12 20 -18 Q16 -8 10 -14 Q4 -4 -2 -10 Q-10 -2 -14 -8 Q-22 -4 -30 -8 Z" fill="#ff9a2a"/><circle cx="-6" cy="-6" r="3.6" fill="#d48a10"/><circle cx="16" cy="-6" r="2.6" fill="#d48a10"/>`,
      // Пирожок из пекла: румяный пирожок с язычками огня
      pie: () => `<path d="M-32 0 C-34 -22 34 -22 32 0 Z" fill="#d97a2a" ${O(3.4)}/><path d="M-26 -10 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4" stroke="#8a3a10" stroke-width="2.4" fill="none" stroke-linejoin="round"/>` + flame(-10, -18, 0.6) + flame(8, -19, 0.75),
      // Копчёный окорок: тёмный, с косточкой и дымком
      ham: () => `<path d="M-30 0 C-38 -34 12 -44 28 -16 C32 -6 22 4 -30 0 Z" fill="#8a2a1a" ${O(3.4)}/><path d="M-20 -8 C-20 -24 4 -30 16 -16" fill="none" stroke="#c8523a" stroke-width="3"/>`
        + `<path d="M24 -14 l16 -12" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M24 -14 l16 -12" stroke="#f3e6c8" stroke-width="5" stroke-linecap="round"/>` + `<path d="M-8 -40 q-4 -6 0 -11" stroke="#9a8a8a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      // Шашлык на вилах: куски мяса на чёртовых вилах
      roast: () => `<path d="M-34 -6 L30 -26" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M-34 -6 L30 -26" stroke="#5a4048" stroke-width="2.6" stroke-linecap="round"/>`
        + `<path d="M28 -32 L38 -29 M30 -25 L40 -22 M32 -19 L42 -16 M26 -33 L33 -12" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`
        + [[-18, -10, '#a0402a'], [-4, -15, '#c8742a'], [10, -19, '#a0402a']].map(([x, y, c]) => `<rect x="${x - 7}" y="${y - 9}" width="14" height="16" rx="4" fill="${c}" ${O(2.6)} transform="rotate(-17 ${x} ${y})"/>`).join('') + flame(-4, 0, 0.5),
      // Пряник с перцем: пряник-чертёнок с глазурью и перчиком
      honey_cake: () => `<path d="M-22 0 V-26 Q-22 -36 -14 -38 L-12 -46 L-6 -38 H6 L12 -46 L14 -38 Q22 -36 22 -26 V0 Z" fill="#c8742a" ${O(3)}/><path d="M-18 -4 V-26 Q-18 -32 -12 -33 M18 -4 V-26 Q18 -32 12 -33" stroke="#fff3ea" stroke-width="2.4" fill="none" stroke-dasharray="4 3"/>`
        + `<circle cx="-7" cy="-26" r="2.6" fill="${INK}"/><circle cx="7" cy="-26" r="2.6" fill="${INK}"/><path d="M-7 -16 q7 6 14 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M-2 -8 q6 -4 10 2 q-6 2 -10 -2Z" fill="#e8202e" ${O(1.6)}/>`,
      // Чай из котла: маленький котелок-кружка, пар
      sage_tea: () => `<path d="M-18 -30 H16 L13 -2 Q0 3 -15 -2 Z" fill="#3a3346" ${O(3)}/><ellipse cx="-1" cy="-30" rx="17" ry="5" fill="#b8702a" ${O(2.4)}/><path d="M16 -24 q12 2 8 12 q-3 6 -11 4" fill="none" stroke="${INK}" stroke-width="3.4"/>`
        + `<path d="M-10 -14 h18" stroke="${FIRE[1]}" stroke-width="2.4" stroke-dasharray="3 3"/>` + steam(0, -38),
      // Адская похлёбка: котелок с кипящим красным варевом и косточкой
      spicy_stew: () => pot('#e8402a', `<circle cx="-12" cy="-27" r="4" fill="${FIRE[1]}" ${O(1.6)}/><circle cx="10" cy="-28" r="3" fill="${FIRE[0]}" ${O(1.4)}/><path d="M2 -26 l10 -14" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M2 -26 l10 -14" stroke="#f3e6c8" stroke-width="3.4" stroke-linecap="round"/>`) + flame(-22, 8, 0.4) + flame(22, 8, 0.4),
    };
    // Зелье жара: малое - пузырёк с рожками-пробкой, большое - пузатая колба с пламенем внутри
    const potion = (big, c) => big
      ? `<path d="M-6 -50 V-40 C-26 -32 -26 0 0 0 C26 0 26 -32 6 -40 V-50 Z" fill="${c}" ${O(3.4)}/><path d="M-8 -50 H8 V-56 H-8 Z" fill="#3a3346" ${O(2.6)}/><path d="M-8 -56 q-6 -4 -6 -10 q4 2 8 6 M8 -56 q6 -4 6 -10 q-4 2 -8 6" fill="#f3e6c8" ${O(2)}/>`
        + flame(0, -6, 0.75) + `<path d="M-14 -24 q4 -8 9 -5" stroke="#fff" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>`
      : `<path d="M-5 -36 V-28 L-14 -18 V0 H14 V-18 L5 -28 V-36 Z" fill="${c}" ${O(3.2)}/><rect x="-7" y="-42" width="14" height="7" rx="2" fill="#3a3346" ${O(2.4)}/><path d="M-6 -42 q-5 -3 -5 -8 q3 2 7 5 M6 -42 q5 -3 5 -8 q-3 2 -7 5" fill="#f3e6c8" ${O(1.8)}/>`
        + flame(0, -4, 0.45) + `<path d="M-9 -14 v6" stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"/>`;
    // Обугленный пергамент: свиток с обгорелыми краями и печатью-трезубцем
    const scroll = () => `<path d="M-26 -40 H26 L24 -34 L27 -28 L24 -20 L27 -12 L24 -6 H-26 L-23 -12 L-27 -20 L-23 -28 L-27 -34 Z" fill="#e8c890" ${O(3)}/><path d="M-26 -40 H26 L24 -34 L27 -28 L24 -20 L27 -12 L24 -6 H-26" fill="none" stroke="#5a2a10" stroke-width="2"/>`
      + `<path d="M-16 -32 H12 M-16 -25 H6 M-16 -18 H10" stroke="#7a3a1a" stroke-width="2.4"/>`
      + `<rect x="-32" y="-46" width="10" height="46" rx="5" fill="#3a2a22" ${O(3)}/><rect x="22" y="-46" width="10" height="46" rx="5" fill="#3a2a22" ${O(3)}/>`
      + `<circle cx="12" cy="-12" r="8" fill="#c8102e" ${O(2.2)}/><path d="M12 -7 V-17 M8.5 -17 V-13 Q12 -10 15.5 -13 V-17" stroke="${GOLD}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    return {
      food: FOOD,
      potion: (it) => potion(/hp|big|больш/i.test(String(it.id) + (it.name || '')), /mana|ман/i.test(String(it.id)) ? '#4ab0ff' : '#ff4a1a'),
      scroll: () => scroll(),
    };
  });
})();

} catch (e) { console.error('[стили] styles/cherts/goods.js не загрузился:', e); }

/* ───── стиль «cherts»: styles/cherts/hero.js ───── */
try {
/* Стиль «Черти» — карточки героя (модуль «Легионер»): карточка из обугленного камня с трещинами лавы, раскалённая рамка и золотые заклёпки
   Разметка и анимации — в modules/legionary/client/widget.js; здесь только вид. Основа — CSS «Легиона», ниже — правила этого стиля
   (последние перекрывают основу). Договор — styles/README.md, раздел «Карточки героя». */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('cherts', 'hero', function () {
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

/* ===== «Черти»: карточка из обугленного камня с трещинами лавы, рамка - раскалённое железо с золотыми заклёпками ===== */
.lg-card { border-radius: 12px; padding: 18px 18px 16px 10px;
  background:
    linear-gradient(115deg, transparent 0 18%, rgba(255,106,26,.55) 18.4% 18.9%, transparent 19.3% 61%, rgba(255,106,26,.45) 61.3% 61.7%, transparent 62.1%) ,
    radial-gradient(ellipse at 20% 115%, rgba(255,90,20,.55), transparent 55%),
    radial-gradient(ellipse at 95% -10%, rgba(200,16,46,.35), transparent 50%),
    linear-gradient(165deg, #3a1218 0%, #22090e 50%, #140407 100%);
  border: 3px solid #2a0d14; box-shadow: 0 0 0 3px #c8102e, 0 0 0 6px #2a0d14, 0 0 22px rgba(255,74,26,.45), inset 0 -30px 50px rgba(0,0,0,.5), 0 10px 22px rgba(0,0,0,.6); color: #ffe6d6; }
.lg-card::before, .lg-card::after { width: 11px; height: 11px; background: radial-gradient(circle at 35% 35%, #fff1a8, #ffc83d 45%, #8a5a10); box-shadow: 0 1px 0 #2a0d14; }
.lg-card.ghost { background: radial-gradient(ellipse at 20% 115%, rgba(120,200,160,.35), transparent 55%), linear-gradient(165deg, #2a2a34 0%, #16161e 50%, #0c0c12 100%);
  box-shadow: 0 0 0 3px #6a8a80, 0 0 0 6px #2a0d14, 0 0 24px rgba(140,255,200,.3), inset 0 -30px 50px rgba(0,0,0,.5), 0 10px 22px rgba(0,0,0,.6); }
.lg-card .pic { border-radius: 10px; background: radial-gradient(ellipse at 50% 105%, rgba(255,154,42,.75), rgba(200,16,46,.3) 45%, transparent 70%), linear-gradient(#1a0508, #3a0d14); box-shadow: inset 0 0 0 3px #2a0d14, inset 0 0 0 5px #7a1a2a; }
.lg-card.ghost .pic { background: radial-gradient(ellipse at 50% 105%, rgba(140,255,200,.35), transparent 65%), linear-gradient(#0c0c12, #1e2028); }
.lg-card .nm { color: #ffe27a; text-shadow: 0 2px 0 #2a0d14, 0 0 14px rgba(255,90,20,.7); }
.lg-card.ghost .nm { color: #c8f0e0; text-shadow: 0 2px 0 #000, 0 0 12px rgba(140,255,200,.45); }
.lg-card .role { color: #ff9a6a; }
.lg-card .lvl { color: #2a0d14; background: linear-gradient(#fff1a8, #ffc83d 55%, #d48a10); border: 2px solid #2a0d14; box-shadow: none; clip-path: polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%, 8% 50%); }
.lg-card .xp { height: 9px; border-radius: 5px; background: #140407; box-shadow: inset 0 0 0 2px #5a1a24; }
.lg-card .xp i { background: linear-gradient(90deg, #c8102e, #ff4a1a 55%, #ffe27a); box-shadow: 0 0 10px rgba(255,120,40,.8); border-radius: 5px; }
.lg-card.ghost .xp i { background: linear-gradient(90deg, #3a6a5a, #9fffd0); box-shadow: none; }
.lg-card .stats div { color: #ffb89a; border-radius: 7px; background: linear-gradient(#3a1218, #200709); box-shadow: inset 0 0 0 2px #5a1a24, inset 0 1px 0 rgba(255,200,150,.12); }
.lg-card .stats b { color: #ffe27a; text-shadow: 0 2px 0 #2a0d14; }
.lg-card .stats .hpc small { color: #c88a7a; }
.lg-card .stats .hpbar { background: #140407; } .lg-card .stats .hpbar i { background: linear-gradient(90deg, #c8102e, #ff7a3d); }
.lg-card .gear { color: #ffd6c4; }
.lg-card .gear span { border-radius: 6px; background: #1a0508; border: 1.5px solid #7a1a2a; }
.lg-box .gem { transform: rotate(45deg) scale(1.05); box-shadow: 0 0 0 1px #2a0d14; }
.lg-box .r-common { color: #ffd6c4; }
.lg-card .bag { color: #ffd6c4; } .lg-card .bag .n { color: #ff7a3d; } .lg-card .bag .on { color: #ffc83d; }
.lg-card .hint { color: #b8867a; }
.lg-card .note { color: #2a0d14; background: linear-gradient(#ffe27a, #ff9a2a); border: 2px solid #2a0d14; box-shadow: none; border-radius: 6px; }
.lg-card .ghostline { color: #9fffd0; } .lg-card .woundline { color: #ff8a7a; } .lg-card .buffline { color: #ffc83d; }
.lg-scene .ttl b { -webkit-text-stroke: 2.5px #2a0d14; }
.lg-scene .ttl span { -webkit-text-stroke: 1.5px #2a0d14; }
.lg-scene .sub i { background: rgba(42,13,20,.88); border-radius: 8px; box-shadow: 0 0 0 1px #7a1a2a; }
.lg-scene .flash { background: radial-gradient(circle at 50% 70%, rgba(255,90,20,.8), transparent 60%); }
.lg-scene .ring { border-color: #ff4a1a; }
.lg-scene .beam { background: linear-gradient(180deg, rgba(255,240,180,.9), rgba(255,120,40,.18) 85%, transparent); }
`;
    return {
      css,
      slotIcons: { weapon: '🔱', armor: '🦇', shield: '🍳', helmet: '😈', trinket: '🔥' },
      stats: { hp: { label: '❤️ ХП', icon: '❤️' }, def: { label: '🍳 Шкура', icon: '🍳' }, atk: { label: '🔱 Вилы', icon: '🔱' }, mag: { label: '🔥 Пекло', icon: '🔥' } },
      texts: { recruit: 'Бесёнок', ghost: '👻 Призрак-бес', nothing: 'Ничего не надето — голый чёрт', level: 'УР.', buff: '🌶' },
      scenes: { death: { title: '🔥 В КОТЁЛ!', color: '#ff4a1a' }, revive: { title: '😈 ВОСКРЕС', color: '#ffc83d' }, level: { title: (n) => `🔱 УРОВЕНЬ ${n}`, color: '#ff7a3d' } },
    };
  });
  // монеты стиля «Черти»: уголёк (бронза), серебряный рожок, золотой трезубец. 100 : 1, как у всех
  window.MDDoodle.addPart('cherts', 'coins', function () {
    // крупные простые формы: читаются и в 16 px
    const ART = {
      b: '<path d="M7 26 L10 13 L20 7 L31 11 L34 24 L27 33 L13 34 Z" fill="#2a1a22" stroke="#140407" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 15 L20 10 L27 13" stroke="#5a4048" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14 30 L19 22 L16 17 M19 22 L27 24 L30 19" stroke="#ff7a1a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 22 L27 24" stroke="#ffe27a" stroke-width="1.4"/>',
      s: '<path d="M6 35 C6 21 13 8 33 3 C25 12 24 21 26 35 Z" fill="#d6dbe4" stroke="#2a0d14" stroke-width="2.6" stroke-linejoin="round"/><path d="M13 31 C14 22 18 14 25 9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M11 28 H22 M12 22 H22 M15 16 H23" stroke="#8e97a4" stroke-width="2" stroke-linecap="round"/><rect x="7" y="33" width="18" height="4" rx="2" fill="#8e97a4" stroke="#2a0d14" stroke-width="2"/>',
      g: '<circle cx="20" cy="20" r="17" fill="#ffc83d" stroke="#2a0d14" stroke-width="2.6"/><circle cx="20" cy="20" r="13" fill="none" stroke="#d48a10" stroke-width="2"/><path d="M20 32 V12 M13 11 V17 Q13 22 20 22 Q27 22 27 17 V11 M13 11 L11 14 M27 11 L29 14 M20 12 L18 15 M20 12 L22 15" stroke="#5a2a08" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 14 A12 12 0 0 1 16 8" stroke="#fff3c0" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    };
    return {
      b: { name: 'уголёк', forms: ['уголёк', 'уголька', 'угольков'], color: '#ff7a1a', emoji: '⚫' },
      s: { name: 'серебряный рожок', forms: ['серебряный рожок', 'серебряных рожка', 'серебряных рожков'], color: '#d6dbe4', emoji: '⚪' },
      g: { name: 'золотой трезубец', forms: ['золотой трезубец', 'золотых трезубца', 'золотых трезубцев'], color: '#ffc83d', emoji: '🟡' },
      svg: (k, size = 22) => `<svg class="coin coin-${k}" viewBox="0 0 40 40" width="${size}" height="${size}">${ART[k] || ART.b}</svg>`,
    };
  });
})();

} catch (e) { console.error('[стили] styles/cherts/hero.js не загрузился:', e); }

if (window.MDDoodle && window.MDDoodle.addNames) window.MDDoodle.addNames("cherts", {"items":{"dagger":{"name":"Чёртов коготок","chat":["коготок"]},"rusty_sword":{"name":"Ржавая кочерга","chat":["кочерга"]},"wood_club":{"name":"Обугленная головня","chat":["головня"]},"pitchfork":{"name":"Чёртова вилочка","chat":["вилочка","вилы"]},"hatchet":{"name":"Топорик кочегара","chat":["кочегара"]},"wood_spear":{"name":"Шампур","chat":["шампур"]},"smith_hammer":{"name":"Молоток котельщика","chat":["котельщика"]},"mace":{"name":"Шипастый уголь","chat":["уголь"]},"gladius":{"name":"Огненный тесак","chat":["тесак"]},"hunting_bow":{"name":"Лук из рога","chat":["из рога"]},"bow":{"name":"Рогатка бесёнка","chat":["рогатка"]},"crook":{"name":"Кривой ухват","chat":["ухват"]},"walking_staff":{"name":"Кочерга-трость","chat":["трость"]},"staff":{"name":"Посох с огоньком","chat":["огоньком"]},"copper_censer":{"name":"Медная курильница","chat":["курильница"]},"censer":{"name":"Серное кадило","chat":["серное","кадило"]},"war_axe":{"name":"Боевой тесак ада","chat":["боевой"]},"spatha":{"name":"Раскалённый клинок","chat":["раскалённый","раскаленный"]},"storm_staff":{"name":"Посох серной бури","chat":["бури"]},"aquila_blade":{"name":"Клинок Люцифера","chat":["люцифера"]},"barrel_lid":{"name":"Крышка котла","chat":["крышка"]},"buckler":{"name":"Сковородка","chat":["сковородка","сковорода"]},"wood_shield":{"name":"Заслонка печи","chat":["заслонка"]},"scutum":{"name":"Чугунная дверца","chat":["дверца"]},"centurion_shield":{"name":"Щит сотника ада","chat":["сотника"]},"lorica":{"name":"Чёрный панцирь","chat":["панцирь"]},"robe":{"name":"Мантия с каймой","chat":["мантия"]},"galea":{"name":"Шлем с рогами","chat":["шлем"]},"laurel":{"name":"Терновый венец","chat":["терновый"]},"spark_charm":{"name":"Искра из пекла","chat":["искра"]},"frost_amulet":{"name":"Ледяной уголёк","chat":["ледяной"]},"shadow_amulet":{"name":"Амулет тьмы","chat":["тьмы"]},"aquila_amulet":{"name":"Золотой трезубчик","chat":["трезубчик"]},"saint_halo":{"name":"Нимб наоборот","chat":["нимб"]},"potion_small":{"name":"Малое зелье жара","chat":["малое"]},"potion_hp":{"name":"Большое зелье жара","chat":["большое"]},"apple":{"name":"Печёное яблоко","chat":["яблоко"]},"pear":{"name":"Жгучий перчик","chat":["перчик"]},"pretzel":{"name":"Угольный крендель","chat":["крендель"]},"bread":{"name":"Горелая корка","chat":["корка"]},"kvass":{"name":"Серная газировка","chat":["газировка"]},"cheese":{"name":"Плавленый сыр","chat":["сыр"]},"pie":{"name":"Пирожок из пекла","chat":["пирожок"]},"ham":{"name":"Копчёный окорок","chat":["окорок"]},"roast":{"name":"Шашлык на вилах","chat":["шашлык"]},"honey_cake":{"name":"Пряник с перцем","chat":["пряник"]},"sage_tea":{"name":"Чай из котла","chat":["чай"]},"spicy_stew":{"name":"Адская похлёбка","chat":["похлёбка","похлебка"]},"hadrian_wall":{"name":"Врата Преисподней","chat":["врата"]},"storm_heart":{"name":"Сердце вулкана","chat":["вулкана"]},"vesta_breath":{"name":"Дыхание горнила","chat":["горнила"]},"diana_bow":{"name":"Лук Лунной ведьмы","chat":["ведьмы"]},"rog_shiv":{"name":"Заточка из рога","chat":["заточка"]},"rog_dirk":{"name":"Нож шулера","chat":["шулера"]},"rog_kris":{"name":"Кривой коготь","chat":["кривой"]},"rog_twin":{"name":"Парные коготки","chat":["парные"]},"rog_viper":{"name":"Жало скорпиона","chat":["жало"]},"mercury_fang":{"name":"Клык Мамоны","chat":["мамоны"]},"nec_bone_wand":{"name":"Косточка-указка","chat":["косточка"]},"nec_old_book":{"name":"Обугленная книжка","chat":["книжка"]},"nec_skull_staff":{"name":"Посох с черепком","chat":["черепком"]},"nec_grimoire":{"name":"Чёрный договор","chat":["договор"]},"nec_crypt_staff":{"name":"Посох из котельной","chat":["котельной"]},"nec_black_book":{"name":"Книга должников","chat":["должников"]},"orcus_scepter":{"name":"Скипетр Вельзевула","chat":["вельзевула"]},"pal_novice_mace":{"name":"Палица истопника","chat":["истопника"]},"pal_mace":{"name":"Палица из чугуна","chat":["чугуна"]},"pal_war_hammer":{"name":"Молот кочегара","chat":["молот"]},"pal_sun_mace":{"name":"Палица пекла","chat":["палица"]},"pal_guard_hammer":{"name":"Молот привратника","chat":["привратника"]},"sol_hammer":{"name":"Молот Сатаны","chat":["сатаны"]},"dragon_scale":{"name":"Чешуя дракона","chat":["дракона"]},"star_mantle":{"name":"Мантия звездопада","chat":["звездопада"]},"triumph_galea":{"name":"Корона Князя тьмы","chat":["князя"]},"phoenix_tear":{"name":"Перо феникса","chat":["феникса"]},"mars_horn":{"name":"Боевой рог","chat":["рог"]},"lucky_coin":{"name":"Счастливый уголёк","chat":["счастливый"]},"wolf_tooth":{"name":"Клык цербера","chat":["цербера"]},"clay_charm":{"name":"Глиняный чертик","chat":["глиняный"]},"river_pearl":{"name":"Жемчуг из Стикса","chat":["стикса"]},"iron_sword":{"name":"Чугунная кочерга","chat":["чугунная"]},"sharp_gladius":{"name":"Острый тесак","chat":["острый"]},"stiletto":{"name":"Шило из рога","chat":["шило"]},"bearded_axe":{"name":"Топор палача","chat":["палача"]},"pilum":{"name":"Метательный шампур","chat":["метательный"]},"flanged_mace":{"name":"Ребристый уголь","chat":["ребристый"]},"composite_bow":{"name":"Лук из костей","chat":["костей"]},"yew_bow":{"name":"Лук из горелой ивы","chat":["ивы"]},"oak_staff":{"name":"Посох из угля","chat":["из угля"]},"druid_crook":{"name":"Ухват болотника","chat":["болотника"]},"silver_censer":{"name":"Серебряное кадило","chat":["серебряное"]},"iron_buckler":{"name":"Чугунная сковорода","chat":["чугунная сковорода"]},"oak_shield":{"name":"Печная заслонка","chat":["печная"]},"veteran_scutum":{"name":"Дверца старой печи","chat":["старой печи"]},"chainmail":{"name":"Кольчуга из цепей","chat":["кольчуга"]},"leather_armor":{"name":"Кожанка байкера","chat":["кожанка"]},"adept_robe":{"name":"Мантия с искрами","chat":["искрами"]},"iron_galea":{"name":"Чугунный котелок","chat":["котелок"]},"hunter_cap":{"name":"Шапка-ушанка ада","chat":["ушанка"]},"wizard_hat":{"name":"Колпак колдуна","chat":["колпак"]},"legion_charm":{"name":"Оберег рогатых","chat":["рогатых"]},"healer_beads":{"name":"Чётки из углей","chat":["чётки","четки"]},"legate_gladius":{"name":"Клинок легата ада","chat":["легата"]},"champion_mace":{"name":"Палица силача","chat":["силача"]},"warhammer":{"name":"Кузнечный молот","chat":["кузнечный"]},"triarius_hasta":{"name":"Огненное копьё","chat":["копьё","копье"]},"assassin_dagger":{"name":"Кинжал тени","chat":["кинжал"]},"retiarius_trident":{"name":"Трезубец","chat":["трезубец"]},"barbarian_club":{"name":"Дубина громилы","chat":["громилы"]},"longbow":{"name":"Длинный лук","chat":["длинный"]},"sagittarius_bow":{"name":"Лук меткого беса","chat":["меткого"]},"ember_staff":{"name":"Посох тлеющий","chat":["тлеющий"]},"elder_crook":{"name":"Ухват старейшины","chat":["старейшины"]},"gold_censer":{"name":"Золотая кадильня","chat":["золотая"]},"tower_shield":{"name":"Ворота котельной","chat":["ворота"]},"hoplite_shield":{"name":"Медный таз","chat":["таз"]},"spiked_buckler":{"name":"Сковорода с шипами","chat":["шипами"]},"segmentata":{"name":"Латы кочегара","chat":["латы"]},"scale_armor":{"name":"Чешуйчатый панцирь","chat":["чешуйчатый"]},"stargazer_robe":{"name":"Мантия звездочёта","chat":["звездочёта","звездочета"]},"crested_helm":{"name":"Шлем с гребнем","chat":["гребнем"]},"horned_helm":{"name":"Рогатый шлем","chat":["рогатый"]},"priest_tiara":{"name":"Тиара грешника","chat":["тиара"]},"wolfpack_amulet":{"name":"Ошейник цербера","chat":["ошейник"]},"frost_bead":{"name":"Ледяная бусина","chat":["бусина"]},"praetorian_spatha":{"name":"Клинок стражи ада","chat":["стражи"]},"apollo_bow":{"name":"Солнечный лук","chat":["солнечный"]},"pontifex_censer":{"name":"Кадило архичерта","chat":["архичерта"]},"praetorian_armor":{"name":"Доспех стражи ада","chat":["доспех стражи"]},"golden_crown":{"name":"Золотая корона","chat":["корона"]},"quilted_jacket":{"name":"Стёганый ватник","chat":["ватник"]},"ranger_jacket":{"name":"Куртка следопыта","chat":["следопыта"]},"hunter_armor":{"name":"Доспех охотника","chat":["охотника"]},"novice_cassock":{"name":"Ряса послушника","chat":["ряса"]},"archmage_robe":{"name":"Мантия архибеса","chat":["архибеса"]},"archer_hood":{"name":"Капюшон с рожками","chat":["капюшон"]},"marksman_hood":{"name":"Капюшон стрелка","chat":["стрелка"]},"novice_hat":{"name":"Колпачок бесёнка","chat":["колпачок"]},"archer_charm":{"name":"Оберег стрелка","chat":["оберег стрелка"]},"sage_charm":{"name":"Оберег мудреца","chat":["мудреца"]},"stone_charm":{"name":"Оберег из лавы","chat":["лавы"]},"scroll_revive":{"name":"Договор на возврат","chat":["договор на возврат","возврат","свиток"]},"metamorph_seal":{"name":"Печать Оборотня","chat":["оборотня","печать оборотня"]},"enchant_star":{"name":"Упавшая звезда","chat":["звезда","упавшая"]},"enchant_sphere":{"name":"Капля смолы","chat":["смолы","капля"]},"rog_jerkin":{"name":"Жилет шулера","chat":["жилет шулера"]},"rog_leathers":{"name":"Кожанка с картами","chat":["с картами"]},"rog_night_coat":{"name":"Фрак ночного беса","chat":["фрак"]},"rog_shadow_cloak":{"name":"Покров дыма","chat":["дыма","покров"]},"rog_laverna_cloak":{"name":"Плащ Лилит","chat":["плащ лилит"]},"rog_hood":{"name":"Колпак бродяги","chat":["бродяги"]},"rog_mask":{"name":"Маска шулера","chat":["маска шулера"]},"rog_cowl":{"name":"Капюшон полуночи","chat":["полуночи"]},"rog_faceless":{"name":"Маска без рыла","chat":["без рыла"]},"rog_laverna_mask":{"name":"Маска Лилит","chat":["маска лилит"]},"rog_lockpick":{"name":"Крючок-отмычка","chat":["отмычка"]},"rog_viper_vial":{"name":"Флакон чёртова яда","chat":["флакон"]},"rog_cat_eye":{"name":"Глаз чёрной кошки","chat":["кошки"]},"nec_shroud":{"name":"Саван из сажи","chat":["сажи","саван"]},"nec_undertaker_robe":{"name":"Ряса писаря ада","chat":["писаря"]},"nec_bone_mantle":{"name":"Мантия из костей","chat":["мантия из костей"]},"nec_lich_robe":{"name":"Облачение пепла","chat":["пепла"]},"nec_proserpina_mantle":{"name":"Мантия Персефоны","chat":["персефоны"]},"nec_hood":{"name":"Капюшон кочегара","chat":["капюшон кочегара"]},"nec_skull_hood":{"name":"Капюшон-череп","chat":["капюшон-череп"]},"nec_bone_crown":{"name":"Венец из рогов","chat":["рогов"]},"nec_lich_crown":{"name":"Корона из пепла","chat":["корона из пепла"]},"nec_dis_crown":{"name":"Венец града Дит","chat":["дит","града"]},"nec_dead_finger":{"name":"Палец грешника","chat":["палец"]},"nec_soul_jar":{"name":"Душа в склянке","chat":["душа","склянке"]},"nec_phylactery":{"name":"Ларец с договором","chat":["ларец"]},"pal_cuirass":{"name":"Кираса истопника","chat":["кираса"]},"pal_templar_plate":{"name":"Латы котельной","chat":["латы котельной"]},"pal_blessed_plate":{"name":"Калёные латы","chat":["калёные","каленые"]},"pal_dawn_plate":{"name":"Латы зарева","chat":["латы зарева"]},"pal_apollo_plate":{"name":"Доспех Денницы","chat":["доспех денницы"]},"pal_helm":{"name":"Шлем истопника","chat":["шлем истопника"]},"pal_great_helm":{"name":"Глухой котелок","chat":["глухой"]},"pal_winged_helm":{"name":"Шлем с перепонками","chat":["перепонками"]},"pal_halo_helm":{"name":"Шлем с ореолом","chat":["ореолом"]},"pal_apollo_helm":{"name":"Шлем Денницы","chat":["шлем денницы"]},"pal_ladanka":{"name":"Ладанка с золой","chat":["ладанка"]},"pal_sun_medal":{"name":"Медальон зарева","chat":["медальон"]},"pal_dawn_sign":{"name":"Знак Денницы","chat":["знак денницы"]},"miner_helmet":{"name":"Каска с угольком","chat":["каска"]},"aurus_seal_5":{"name":"Клеймо пекла 5","chat":["клеймо","пекла"]},"aurus_seal_6":{"name":"Клеймо пекла 6","chat":["клеймо","пекла"]},"aurus_seal_7":{"name":"Клеймо пекла 7","chat":["клеймо","пекла"]},"aurus_seal_8":{"name":"Клеймо пекла 8","chat":["клеймо","пекла"]},"aurus_seal_9":{"name":"Клеймо пекла 9","chat":["клеймо","пекла"]},"aurus_seal_10":{"name":"Клеймо пекла 10","chat":["клеймо","пекла"]},"aurus_seal_11":{"name":"Клеймо пекла 11","chat":["клеймо","пекла"]},"aurus_seal_12":{"name":"Клеймо пекла 12","chat":["клеймо","пекла"]},"aurus_seal_13":{"name":"Клеймо пекла 13","chat":["клеймо","пекла"]},"aurus_seal_14":{"name":"Клеймо пекла 14","chat":["клеймо","пекла"]},"aurus_seal_15":{"name":"Клеймо пекла 15","chat":["клеймо","пекла"]}},"roles":{"recruit":"Бесёнок","legionary":"Чёрт-вояка","archer":"Чёрт-стрелок","mage":"Чёрт-колдун","priest":"Исповедник","rogue":"Чёрт-шулер","necromancer":"Чернокнижник","paladin":"Страж котла"},"looks":{"shapes":{"bean":"Бесёнок","box":"Чёрт-громила","ball":"Пухлик","tall":"Демон-франт","ghost":"Огненный дух","cone":"Нетопырь","egg":"Вылупыш"},"eyes":{"dots":"Хитрые точки","big":"Глаза-угли","happy":"Довольный прищур","cyclops":"Циклоп из пекла","stars":"Искры в глазах","jack":"Тыквенный взгляд","void":"Пустые глазницы"},"mouths":{"open":"Хо-хо!","grin":"Чёртова ухмылка","tongue":"Раздвоенный язык"},"hats":{"none":"Только рожки","tuft":"Огонёк на макушке","cap":"Кепка кочегара","bow":"Бантик-бабочка","horns":"Большие рога","crown":"Корона князька","tophat":"Цилиндр франта","party":"Колпак с огоньком","wizard":"Шляпа колдуна","antenna":"Вилы-антенна","antenna2":"Два огонька","cat":"Кошачьи ушки","bunny":"Заячьи уши","halo":"Краденый нимб","sprout":"Огненный цветок","bandana":"Бандана с искрами","legion":"Шлем легиона","laurel":"Терновый венец","beret":"Берет художника","headphones":"Наушники","cowboy":"Шляпа ковбоя","chef":"Колпак повара","pumpkin":"Тыква-фонарь","witch":"Шляпа ведьмы","batears":"Уши нетопыря","skull":"Черепок-шлем","reaper":"Капюшон жнеца","scarehat":"Шляпа пугала"},"acc":{"bowtie":"Бабочка","tie":"Галстук юриста","scarf":"Шарф из дыма","glasses":"Очки счетовода","shades":"Тёмные очки","monocle":"Монокль","mustache":"Подкрученные усы","cape":"Плащ с подкладкой","fangs":"Клыки","vampcape":"Плащ вампира","candybag":"Мешок конфет","bolts":"Болты в шее","cobweb":"Паутина на плече"},"auras":{"gold":"Золотой жар","sparks":"Угольки","halo":"Святой нимб","shadow":"Тёмное пламя","frost":"Иней ада","wisps":"Блуждающие огни","bats":"Стайка нетопырей","jackglow":"Тыквенный жар","haunt":"Серный туман","leaves":"Пепел и листья"},"colors":{"#ff9fb2":"Розовый бес","#ffb27a":"Рыжий жар","#ffe27a":"Сера","#9fe39a":"Болотный","#7fd6e6":"Голубое пламя","#8fb6ff":"Ледяной","#b9a2ff":"Сиреневый дым","#e6e6ee":"Пепельный","#ffc94d":"Золотой","#5a5470":"Копоть","#ff8a1f":"Лава","#9fffd0":"Призрачный","#7b3fe4":"Фиолетовый огонь"}},"places":{"camp":{"name":"Чёртов привал","sub":"лагерь новобранцев Легиона"}}});

if (window.MDDoodle && window.MDDoodle.use) window.MDDoodle.use("cherts");
