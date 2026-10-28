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

/* ───── стиль «cats»: styles/cats/characters.js ───── */
try {
/* Стиль «Котики» — человечки Легиона в виде котов: уши в контуре тела, хвост покачивается,
   кошачьи глаза со зрачком-щёлкой, розовый нос, усы, мех с узором «по нику» (полосатый, грудка, пятно).
   Тёплая тёмно-коричневая обводка, как в детской книжке-картинке. Лапки с подушечками вместо кистей.
   Устроен как образец styles/legion/characters.js, договор — styles/README.md.
   Холст 120×170, ноги на y = 168, центр по x = 60. Каждая функция возвращает строку SVG. */
let catRobeN = 0;   // 20.10: счётчик id обрезки пледа (свой у каждого рисунка)
(function () {
  'use strict';
  const D = window.MDDoodle;
  if (!D) return;

  // ── цвета стиля ──
  const INK = '#2b1d18';     // обводка всего: тёплый тёмно-коричневый
  const NOSE = '#ff8fa3';    // нос, подушечки, внутренность ушей
  const STRIPE = 'rgba(70,35,15,.32)';   // полоски и пятна меха (ложатся на любой цвет)
  const IRIS = ['#9be15d', '#ffd23f', '#f5a623', '#6ec6ff', '#7bdcb5'];   // цвет глаз — по нику (из seed, без r())
  const WS = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;   // обводка снаряжения
  const RARITY = { common: null, uncommon: '#5bd36a', rare: '#5ec8ff', epic: '#c77dff', legendary: '#ffcf4a' };
  const METAL = { common: '#b7bec4', uncommon: '#cdeec4', rare: '#bfe3ff', epic: '#e0c8ff', legendary: '#ffd76a' };
  const FUR = ['#f2a65a', '#e8914a', '#f3d9b1', '#9aa3ad', '#7d8a99', '#f4f1ec', '#4a4350', '#a8754f', '#ffc6a0', '#c9ccd3', '#b6a6c9', '#e7b98a'];
  const f1 = (v) => +v.toFixed(1);
  // цвет глаз «по нику»; у купленных глаз — тот же, что у образца в Шатре (образец рисуется с ником «образец eyes <id>»):
  // 17.10 купили «голубые» глаза-блюдца, а на своём коте они были жёлтыми
  const iris = (k) => IRIS[(((k.look && k.look.eyes ? D.jhash('образец eyes ' + k.look.eyes) : k.seed) >>> 0) >>> 3) % IRIS.length];

  /* ── тела: (r) → { L, R, top, hw, eyeY, armY, d, square?, narrow?, ear, pat } ──
     Уши — часть контура d (их видят и виджеты). ear — точки левого уха (для розовой серединки и кисточек рыси),
     pat — узор меха: 0 гладкий, 1 полосатый, 2 светлая грудка, 3 пятно у глаза, 4 полосатый с грудкой. */
  function earSeg(top, hw, eh) {
    const ox = f1(60 - hw), oy = top + 9, tx = f1(ox + hw * 0.1), ty = top - eh, ix = f1(60 - hw * 0.3), iy = top + 1;
    return { ear: { ox, oy, tx, ty, ix, iy }, seg: `L${tx} ${ty} L${ix} ${iy} Q60 ${top - 2.5} ${f1(120 - ix)} ${iy} L${f1(120 - tx)} ${ty} L${f1(120 - ox)} ${oy}` };
  }
  const bodies = {
    bean(r) { const w = 25 + Math.floor(r() * 9), L = 60 - w, R = 60 + w, top = 78, hw = f1(w * 0.8), e = earSeg(top, hw, 15), o = e.ear.ox; return { L, R, top, hw, eyeY: 101, armY: 114, ear: e.ear, pat: Math.floor(r() * 5), d: `M${L} 168 C${L - 4} 128 ${L - 2} ${top + 34} ${o} ${top + 9} ${e.seg} C${R + 2} ${top + 34} ${R + 4} 128 ${R} 168 Z` }; },
    box(r) { const w = 24 + Math.floor(r() * 9), L = 60 - w, R = 60 + w, top = 82 + Math.floor(r() * 8), hw = w - 3, e = earSeg(top, hw, 14), o = e.ear.ox; return { L, R, top, hw, eyeY: top + 27, armY: top + 37, square: true, ear: e.ear, pat: Math.floor(r() * 5), d: `M${L} 168 V${top + 15} Q${L} ${top + 9} ${o} ${top + 9} ${e.seg} Q${R} ${top + 9} ${R} ${top + 15} V168 Z` }; },
    ball(r) { const w = 33 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 100, hw = f1(w * 0.6), e = earSeg(top, hw, 13), o = e.ear.ox; return { L, R, top, hw, eyeY: 123, armY: 131, ear: e.ear, pat: Math.floor(r() * 5), d: `M${L + 6} 168 C${L - 8} 152 ${L - 6} ${top + 16} ${o} ${top + 9} ${e.seg} C${R + 6} ${top + 16} ${R + 8} 152 ${R - 6} 168 Z` }; },
    tall(r) { const w = 19 + Math.floor(r() * 4), L = 60 - w, R = 60 + w, top = 60, hw = f1(w * 0.85), e = earSeg(top, hw, 14), o = e.ear.ox; return { L, R, top, hw, eyeY: 84, armY: 98, narrow: true, ear: e.ear, pat: Math.floor(r() * 5), d: `M${L} 168 C${L - 2} 112 ${L - 1} ${top + 26} ${o} ${top + 9} ${e.seg} C${R + 1} ${top + 26} ${R + 2} 112 ${R} 168 Z` }; },
    ghost(r) { const w = 25 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 78, hw = f1(w * 0.78), e = earSeg(top, hw, 15), o = e.ear.ox, s = f1((2 * w) / 3); return { L, R, top, hw, eyeY: 102, armY: 114, ear: e.ear, pat: Math.floor(r() * 5), d: `M${L} 162 C${L} 116 ${L} ${top + 30} ${o} ${top + 9} ${e.seg} C${R} ${top + 30} ${R} 116 ${R} 162 q${-s / 2} 10 ${-s} 0 q${-s / 2} 10 ${-s} 0 q${-s / 2} 10 ${-s} 0 Z` }; },
    cone(r) { const w = 28 + Math.floor(r() * 6), L = 60 - w, R = 60 + w, top = 76, hw = 14, e = earSeg(top, hw, 12), o = e.ear.ox; return { L, R, top, hw, eyeY: 102, armY: 118, narrow: true, ear: e.ear, pat: Math.floor(r() * 5), d: `M${L} 168 C${L + 4} 140 ${o - 12} ${top + 34} ${o} ${top + 9} ${e.seg} C${f1(120 - o + 12)} ${top + 34} ${R - 4} 140 ${R} 168 Z` }; },
    egg(r) { const w = 27 + Math.floor(r() * 5), L = 60 - w, R = 60 + w, top = 72, hw = f1(w * 0.66), e = earSeg(top, hw, 14), o = e.ear.ox; return { L, R, top, hw, eyeY: 99, armY: 116, ear: e.ear, pat: Math.floor(r() * 5), d: `M${L + 2} 160 C${L - 6} 128 ${L + 1} ${top + 24} ${o} ${top + 9} ${e.seg} C${R - 1} ${top + 24} ${R + 6} 128 ${R - 2} 160 Q60 174 ${L + 2} 160 Z` }; },
  };
  const earOf = (b) => b.ear || { ox: 60 - b.hw, oy: b.top + 9, tx: 60 - b.hw * 0.9, ty: b.top - 14, ix: 60 - b.hw * 0.3, iy: b.top + 1 };

  // тело: хвост (покачивается) → контур с ушами → серединки ушей → узор меха → нос и усы
  // 18.10: хвост — отдельным слоем, скелет кладёт его ПОД руки (раньше хвост перекрывал правую лапу)
  function tail(k) {
    const b = k.b, fill = k.fill, pat = b.pat || 0;
    const bx = b.R - 7, by = 158, beg = (((k.seed >>> 0) % 997) / 997 * 2.8).toFixed(2);
    const T = `M${bx} ${by} C${bx + 18} ${by + 2} ${bx + 26} ${by - 18} ${bx + 20} ${by - 36} C${bx + 17} ${by - 44} ${bx + 22} ${by - 50} ${bx + 27} ${by - 48}`;
    let s = `<g><animateTransform attributeName="transform" type="rotate" values="-6 ${bx} ${by};8 ${bx} ${by};-6 ${bx} ${by}" dur="2.8s" begin="-${beg}s" repeatCount="indefinite"/>`
      + `<path d="${T}" fill="none" stroke="${INK}" stroke-width="10.5" stroke-linecap="round"/><path d="${T}" fill="none" stroke="${fill}" stroke-width="6" stroke-linecap="round"/>`
      + (pat === 1 || pat === 4 ? `<path d="${T}" fill="none" stroke="${STRIPE}" stroke-width="6" stroke-dasharray="3 6"/>` : '') + '</g>';
    return s;
  }
  function body(k) {
    const b = k.b, fill = k.fill, e = earOf(b), pat = b.pat || 0;
    let s = '';
    s += `<path d="${b.d}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<path d="M${f1(e.ox + 4)} ${e.oy - 2} L${f1(e.tx + 2)} ${e.ty + 7} L${f1(e.ix - 2.5)} ${e.iy + 2} Z M${f1(116 - e.ox)} ${e.oy - 2} L${f1(118 - e.tx)} ${e.ty + 7} L${f1(122.5 - e.ix)} ${e.iy + 2} Z" fill="${NOSE}" opacity=".75"/>`;
    if (pat) {
      const c = k.uid('jlP');
      let p = '';
      if (pat === 2 || pat === 4) p += `<ellipse cx="60" cy="${f1((b.armY + 168) / 2 + 8)}" rx="${f1((b.R - b.L) * 0.27)}" ry="${f1((168 - b.armY) / 2)}" fill="rgba(255,255,255,.5)"/>`;
      if (pat === 1 || pat === 4) {
        p += `<path d="M55.5 ${b.top + 3} l1 7 M60 ${b.top + 1} v8 M64.5 ${b.top + 3} l-1 7" stroke="${STRIPE}" stroke-width="2.4" stroke-linecap="round"/>`;
        let st = ''; for (let y = b.eyeY + 18; y < 166; y += 14) st += `M${b.L - 4} ${y} q8 2 13 -2 M${b.R + 4} ${y} q-8 2 -13 -2 `;
        p += `<path d="${st}" fill="none" stroke="${STRIPE}" stroke-width="3.5" stroke-linecap="round"/>`;
      }
      if (pat === 3) p += `<ellipse cx="${60 + k.ex + 1}" cy="${k.ey - 1}" rx="10" ry="9" fill="${STRIPE}"/><ellipse cx="${b.L + 12}" cy="150" rx="9" ry="7" fill="${STRIPE}"/>`;
      s += `<defs><clipPath id="${c}"><path d="${b.d}"/></clipPath></defs><g clip-path="url(#${c})">${p}</g>`;
    }
    const ey = k.ey, ex = k.ex, n = ey + 7;
    s += `<path d="M${60 - ex - 7} ${ey + 10} l-15 -3 M${60 - ex - 7} ${ey + 12.5} l-16 1 M${60 - ex - 7} ${ey + 15} l-14 4 M${60 + ex + 7} ${ey + 10} l15 -3 M${60 + ex + 7} ${ey + 12.5} l16 1 M${60 + ex + 7} ${ey + 15} l14 4" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>`;
    s += `<path d="M56.5 ${n} h7 l-3.5 4 z" fill="${NOSE}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    return s;
  }

  /* ── лицо ── */
  const eyeIris = (x, y, rr, col) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${col}" stroke="${INK}" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="${f1(rr * 0.22)}" ry="${f1(rr * 0.78)}" fill="${INK}"/><circle cx="${f1(x - rr * 0.38)}" cy="${f1(y - rr * 0.4)}" r="${f1(rr * 0.24)}" fill="#fff"/>`;
  const starP = (x, y, rr) => { let d = ''; for (let i = 0; i < 10; i++) { const a = (i * 36 - 90) * Math.PI / 180, q = i % 2 ? rr * 0.45 : rr; d += `${i ? 'L' : 'M'}${f1(x + Math.cos(a) * q)} ${f1(y + Math.sin(a) * q)}`; } return d + 'Z'; };
  const FL = `fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  function eyes(kind, k) {
    const { ex, ey } = k, xs = [60 - ex, 60 + ex], col = iris(k);
    if (kind === 'dots') return xs.map((x) => `<ellipse cx="${x}" cy="${ey}" rx="3.6" ry="4.4" fill="${INK}"/><circle cx="${x - 1.2}" cy="${ey - 1.6}" r="1.3" fill="#fff"/>`).join('');
    if (kind === 'big') return xs.map((x) => eyeIris(x, ey, 6.5, col)).join('');
    if (kind === 'cyclops') return eyeIris(60, ey - 2, 9, col);
    if (kind === 'stars') return `<path d="${starP(xs[0], ey, 5.8)}${starP(xs[1], ey, 5.8)}" fill="#ffd23f" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
    if (kind === 'slit') return xs.map((x) => `<path d="M${x - 7} ${ey} q7 -8 14 0 q-7 8 -14 0 z" fill="${col}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M${x} ${ey - 4} v8" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`).join('');
    if (kind === 'sleepy') return xs.map((x) => `<path d="M${x - 6} ${ey} a6 5 0 0 0 12 0 z" fill="${col}" stroke="${INK}" stroke-width="1.8"/><path d="M${x} ${ey} v3.6" stroke="${INK}" stroke-width="2"/><path d="M${x - 7} ${ey} h14" ${FL}/>`).join('');
    return `<path d="M${60 - ex - 5} ${ey + 1} q5 -6 10 0 M${60 + ex - 5} ${ey + 1} q5 -6 10 0" ${FL}/>`;   // happy: ^ ^
  }
  const PH = (my) => `M60 ${my - 4} v2.5`;   // от носа ко рту
  const OMEGA = (my, w = 6.5) => `M60 ${my - 1.5} q-3 4 -${w} 0.5 M60 ${my - 1.5} q3 4 ${w} 0.5`;
  function mouth(kind, k) {
    const my = k.my;
    if (kind === 'open') return `<path d="${PH(my)}" ${FL}/><path d="M53 ${my - 1.5} Q60 ${my + 11} 67 ${my - 1.5} Q60 ${my + 2} 53 ${my - 1.5} Z" fill="#7a2b3a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="60" cy="${my + 4.6}" rx="3" ry="1.8" fill="${NOSE}"/>`;
    if (kind === 'grin') return `<path d="${PH(my)} ${OMEGA(my, 9)}" ${FL}/><path d="M53.5 ${my + 1.2} l1.4 3.4 l1.4 -3.6 z M63.7 ${my + 1} l1.4 3.6 l1.4 -3.4 z" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
    return `<path d="M57.5 ${my + 0.8} q2.5 7.5 5 0 z" fill="#ff7f9a" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="${PH(my)} ${OMEGA(my)}" ${FL}/>`;   // tongue: «блеп»
  }
  // настроения
  const faces = {
    sad(k) {   // огромные блестящие глаза «кота в сапогах», бровки домиком, слеза
      const { ex, ey, my } = k;
      const big = (x, y, rr) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${INK}"/><circle cx="${f1(x - rr * 0.35)}" cy="${f1(y - rr * 0.35)}" r="${f1(rr * 0.36)}" fill="#fff"/><circle cx="${f1(x + rr * 0.35)}" cy="${f1(y + rr * 0.3)}" r="${f1(rr * 0.16)}" fill="#fff"/>`;
      const eyesS = (k.cyc ? big(60, ey - 2, 8.5) + `<path d="M50 ${ey - 13} q10 -6 20 0" ${FL}/>`
        : big(60 - ex, ey + 1, 5.5) + big(60 + ex, ey + 1, 5.5) + `<path d="M${60 - ex - 7} ${ey - 6} l9 -4 M${60 + ex + 7} ${ey - 6} l-9 -4" ${FL}/>`)
        + `<path class="tear" d="M${60 + ex + 4} ${ey + 6} q-3 6 0 8 q3 -2 0 -8 z" fill="#8fd3ff" stroke="${INK}" stroke-width="1.2"/>`;
      return { eyes: eyesS, mouth: `<path d="${PH(my)} M53 ${my + 3} q3.5 -5 7 -3 q3.5 -2 7 3" ${FL}/>` };
    },
    chill(k) {   // мурчит: глаза-щёлочки дужками вниз, довольное «ω»
      const { ex, ey, my } = k;
      return { eyes: k.cyc ? `<path d="M51 ${ey - 1} q9 6 18 0" ${FL}/>` : `<path d="M${60 - ex - 5} ${ey} q5 4 10 0 M${60 + ex - 5} ${ey} q5 4 10 0" ${FL}/>`, mouth: `<path d="${PH(my)} ${OMEGA(my)}" ${FL}/>` };
    },
    stern(k) {   // прищур охотника: полуприкрытые глаза, брови вниз, клык
      const { ex, ey, my } = k, col = iris(k);
      const half = (x, y, rr) => `<path d="M${x - rr} ${y - 1} h${2 * rr} a${rr} ${f1(rr * 0.8)} 0 0 1 ${-2 * rr} 0 z" fill="${col}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M${x} ${y - 1} v${f1(rr * 0.75)}" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
      return { eyes: k.cyc ? half(60, ey - 1, 9) + `<path d="M48 ${ey - 10} l12 5 l12 -5" ${FL}/>`
        : half(60 - ex, ey + 1, 6) + half(60 + ex, ey + 1, 6) + `<path d="M${60 - ex - 7} ${ey - 8} l11 4 M${60 + ex + 7} ${ey - 8} l-11 4" ${FL}/>`,
        mouth: `<path d="${PH(my)} M53 ${my + 1} q7 -3 14 0" ${FL}/><path d="M63 ${my + 0.4} l1.3 3.4 l1.3 -3.2 z" fill="#fff" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` };
    },
    hurt(k) {   // один глаз крестиком, второй зажмурен, рот волной
      const { ex, ey, my } = k;
      return { eyes: k.cyc ? `<path d="M52 ${ey - 8} l16 12 M68 ${ey - 8} l-16 12" ${FL}/>`
        : `<path d="M${60 - ex - 4} ${ey - 4} l8 8 M${60 - ex + 4} ${ey - 4} l-8 8 M${60 + ex - 5} ${ey - 3} l9 3 l-9 3" ${FL}/>`, mouth: `<path d="${PH(my)} M52 ${my + 2} q4 -4 8 0 q4 4 8 0" ${FL}/>` };
    },
  };
  const blush = (k) => `<ellipse cx="${60 - k.ex - 9}" cy="${k.ey + 8}" rx="4.2" ry="2.6" fill="#ff7aa2" opacity=".55"/><ellipse cx="${60 + k.ex + 9}" cy="${k.ey + 8}" rx="4.2" ry="2.6" fill="#ff7aa2" opacity=".55"/>`;
  // раненый: пластырь крестом у уха, клок шерсти дыбом, синяк
  function hurt(k) {
    const b = k.b, px = f1(60 + b.hw * 0.45), py = b.top + 9;
    return `<g transform="rotate(35 ${px} ${py})"><rect x="${px - 9}" y="${py - 3}" width="18" height="6" rx="2" fill="#f1d9b5" stroke="${INK}" stroke-width="1.5"/><rect x="${px - 3}" y="${py - 9}" width="6" height="18" rx="2" fill="#f1d9b5" stroke="${INK}" stroke-width="1.5"/></g>`
      + `<circle cx="${60 - k.ex - 8}" cy="${k.ey + 10}" r="5" fill="#8a5ab8" opacity=".45"/>`;
  }

  /* ── шапки: k → { id: svg }. Шапки садятся между ушами, уши торчат по бокам ── */
  function hats(k) {
    const b = k.b, c1 = k.fill, c2 = k.c2, t = b.top, hw = b.hw, cx = 60, e = earOf(b);
    const S = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
    let leaves = '';
    for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) { const a = (200 + i * 14) * Math.PI / 180, x = f1(cx + sd * Math.cos(a) * -(hw + 4)), y = f1(t + 9 + Math.sin(a) * 12 - i * 1.5); leaves += `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="3.3" transform="rotate(${(sd * (35 - i * 12)).toFixed(0)} ${x} ${y})" fill="${i % 2 ? '#8fd16a' : '#b6e38f'}"/>`; }
    return {
      none: '',
      tuft: `<path d="M${cx - 5} ${t + 2} q-3 -9 -9 -11 q6 -1 10 5 q-1 -9 3 -13 q3 6 2 13 q4 -7 10 -7 q-4 4 -6 13 z" fill="${c1}" ${S}/>`,
      cap: `<path d="M${f1(cx - hw * 0.75)} ${t + 8} q${f1(hw * 0.75)} -24 ${f1(hw * 1.5)} 0 z" fill="${c2}" ${S}/><path d="M${f1(cx + hw * 0.6)} ${t + 7} q10 -2 17 3 q-8 3 -17 1 z" fill="${c2}" ${S}/><circle cx="${cx}" cy="${t - 8}" r="2" fill="${INK}"/>`,
      bow: `<path d="M${f1(cx + hw * 0.5)} ${t + 2} l-10 -8 l1 14 z M${f1(cx + hw * 0.5)} ${t + 2} l10 -8 l-1 14 z" fill="${c2}" ${S}/><circle cx="${f1(cx + hw * 0.5)}" cy="${t + 2}" r="3" fill="${c2}" ${S}/>`,
      horns: `<path d="M${cx - 7} ${t + 3} q-4 -9 -1 -17 q3 9 7 15 z M${cx + 7} ${t + 3} q4 -9 1 -17 q-3 9 -7 15 z" fill="#e8455c" ${S}/>`,
      crown: `<path d="M${cx - 13} ${t + 6} l0 -16 l7 8 l6 -12 l6 12 l7 -8 l0 16 z" fill="#ffc94d" ${S}/><circle cx="${cx}" cy="${t}" r="2.2" fill="#e8455c"/>`,
      tophat: `<rect x="${cx - 12}" y="${t - 24}" width="24" height="28" rx="2" fill="#2a2440" ${S}/><rect x="${cx - 19}" y="${t + 2}" width="38" height="4.5" rx="2" fill="#2a2440" ${S}/><path d="M${cx - 11} ${t - 3} h22" stroke="${c2}" stroke-width="4.5"/>`,
      party: `<path d="M${cx - 12} ${t + 6} L${cx} ${t - 30} L${cx + 12} ${t + 6} z" fill="${c2}" ${S}/><circle cx="${cx}" cy="${t - 32}" r="4.5" fill="#fff" ${S}/><circle cx="${cx - 3}" cy="${t - 4}" r="2" fill="#fff"/><circle cx="${cx + 4}" cy="${t - 14}" r="2" fill="#fff"/><circle cx="${cx - 1}" cy="${t - 22}" r="1.6" fill="#fff"/>`,
      // 18.10: колпак накрывает уши целиком (раньше кончики ушей торчали из-под полей)
      wizard: `<path d="M${f1(Math.min(cx - hw, e.ox) - 4)} ${t + 9} C${f1(e.tx - 11)} ${e.ty - 1} ${cx - 10} ${t - 24} ${cx + 4} ${t - 38} Q${cx + 12} ${t - 34} ${cx + 20} ${t - 28} C${cx + 14} ${t - 22} ${f1(127 - e.tx)} ${e.ty - 2} ${f1(Math.max(cx + hw, 120 - e.ox) + 4)} ${t + 9} z" fill="#4b3bb8" ${S}/><path d="${starP(cx + 1, t - 10, 5)}" fill="#ffc94d"/><path d="M${cx - 9} ${t - 22} a4 4 0 1 0 4 -5 a3 3 0 1 1 -4 5 z" fill="#ffe27a"/>`,
      antenna: `<path d="M${cx + 2} ${t + 1} q2 -16 12 -26" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M${cx + 14} ${t - 25} q6 6 4 14" fill="none" stroke="${INK}" stroke-width="1.2"/><path d="M${cx + 18} ${t - 12} q6 4 4 16 q-7 -6 -4 -16 z" fill="${c2}" ${S}/>`,
      antenna2: `<path d="M${cx - 5} ${t + 1} q-1 -10 -9 -18 M${cx + 5} ${t + 1} q1 -10 9 -18" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${cx - 14}" cy="${t - 19}" r="5" fill="${c2}" ${S}/><circle cx="${cx + 14}" cy="${t - 19}" r="5" fill="${c2}" ${S}/>`,
      cat: `<path d="M${f1(e.tx - 2.5)} ${e.ty + 4} L${f1(e.tx - 1)} ${e.ty - 11} L${f1(e.tx + 3)} ${e.ty + 3} Z M${f1(122.5 - e.tx)} ${e.ty + 4} L${f1(121 - e.tx)} ${e.ty - 11} L${f1(117 - e.tx)} ${e.ty + 3} Z" fill="${INK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`,   // кисточки рыси
      bunny: `<ellipse cx="${cx - 8}" cy="${t - 18}" rx="6" ry="17" fill="#f7f2ee" ${S}/><ellipse cx="${cx + 8}" cy="${t - 18}" rx="6" ry="17" fill="#f7f2ee" ${S}/><ellipse cx="${cx - 8}" cy="${t - 17}" rx="2.6" ry="11" fill="${NOSE}"/><ellipse cx="${cx + 8}" cy="${t - 17}" rx="2.6" ry="11" fill="${NOSE}"/><path d="M${cx - 13} ${t + 3} q13 -8 26 0" fill="none" stroke="${c2}" stroke-width="3.5" stroke-linecap="round"/>`,
      halo: `<ellipse cx="${cx}" cy="${t - 22}" rx="16" ry="4.5" fill="none" stroke="#ffe27a" stroke-width="3.6"/>`,
      sprout: `<path d="M${cx} ${t + 1} v-14" stroke="#3d7a2a" stroke-width="2.4" stroke-linecap="round"/><path d="M${cx} ${t - 9} q-13 -1 -13 -11 q11 0 13 11 z M${cx} ${t - 12} q11 -3 13 -13 q-11 0 -13 13 z" fill="#6fdc6f" ${S}/>`,   // кошачья мята
      bandana: `<path d="M${f1(cx - hw - 1)} ${t + 12} Q${cx} ${t - 8} ${f1(cx + hw + 1)} ${t + 12} Z" fill="#e8455c" ${S}/><path d="M${f1(cx + hw - 1)} ${t + 10} l11 -1 l-4 9 z" fill="#e8455c" ${S}/><circle cx="${cx - 6}" cy="${t + 5}" r="1.5" fill="#fff"/><circle cx="${cx + 5}" cy="${t + 3}" r="1.5" fill="#fff"/><circle cx="${cx}" cy="${t + 8}" r="1.5" fill="#fff"/>`,
      // только из Костюмерной: шлем легионера с ушками
      legion: `<path d="M${f1(cx - hw * 0.7)} ${t - 6} l3 -16 l9 11 z M${f1(cx + hw * 0.7)} ${t - 6} l-3 -16 l-9 11 z" fill="#d9b04a" ${S}/>`
        + `<path d="M${f1(cx - hw - 5)} ${t + 16} Q${f1(cx - hw - 5)} ${t - 15} ${cx} ${t - 15} Q${f1(cx + hw + 5)} ${t - 15} ${f1(cx + hw + 5)} ${t + 16} L${f1(cx + hw - 2)} ${t + 16} L${f1(cx + hw - 2)} ${t + 8} L${f1(cx - hw + 2)} ${t + 8} L${f1(cx - hw + 2)} ${t + 16} Z" fill="#d9b04a" ${S}/>`
        + `<path d="M${cx - 15} ${t - 13} Q${cx - 12} ${t - 38} ${cx} ${t - 39} Q${cx + 12} ${t - 38} ${cx + 15} ${t - 13} Z" fill="#e8455c" ${S}/><path d="M${cx - 7} ${t - 30} v13 M${cx} ${t - 34} v17 M${cx + 7} ${t - 30} v13" stroke="#a3122a" stroke-width="2.2"/>`,
      laurel: `<g stroke="#2f5a24" stroke-width="1.4">${leaves}</g>`,
      beret: `<ellipse cx="${cx - 3}" cy="${t + 1}" rx="${f1(hw * 0.8 + 4)}" ry="9" transform="rotate(-8 ${cx} ${t})" fill="${c2}" ${S}/><path d="M${cx - 1} ${t - 7} l3 -7" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
      headphones: `<path d="M${f1(cx - hw - 6)} ${b.eyeY - 4} Q${f1(cx - hw - 6)} ${t - 16} ${cx} ${t - 16} Q${f1(cx + hw + 6)} ${t - 16} ${f1(cx + hw + 6)} ${b.eyeY - 4}" fill="none" stroke="#2a2440" stroke-width="5" stroke-linecap="round"/>`
        + `<rect x="${f1(cx - hw - 13)}" y="${b.eyeY - 14}" width="12" height="20" rx="5" fill="${c2}" ${S}/><rect x="${f1(cx + hw + 1)}" y="${b.eyeY - 14}" width="12" height="20" rx="5" fill="${c2}" ${S}/>`,
      cowboy: `<path d="M${cx - 17} ${t + 5} q-4 -28 17 -32 q21 4 17 32 z" fill="#a0703a" ${S}/><path d="M${cx - 36} ${t + 2} q36 18 72 0 q-8 12 -36 13 q-28 -1 -36 -13 z" fill="#8a5a2b" ${S}/><path d="M${cx - 16} ${t - 3} h32" stroke="#e8455c" stroke-width="4.5"/>`,
      chef: `<path d="M${cx - 13} ${t + 6} v-13 q-12 -2 -8 -14 q4 -10 14 -4 q4 -10 12 -2 q10 -4 12 6 q2 10 -10 14 v13 z" fill="#fff" ${S}/><path d="M${cx - 13} ${t + 1} h26" stroke="${INK}" stroke-width="1.4"/>`,
    };
  }

  /* ── снаряжение ── */
  const paw = (x, y, s, col) => `<g fill="${col}"><ellipse cx="${x}" cy="${f1(y + s * 0.35)}" rx="${f1(s * 0.55)}" ry="${f1(s * 0.45)}"/><circle cx="${f1(x - s * 0.55)}" cy="${f1(y - s * 0.3)}" r="${f1(s * 0.22)}"/><circle cx="${x}" cy="${f1(y - s * 0.55)}" r="${f1(s * 0.22)}"/><circle cx="${f1(x + s * 0.55)}" cy="${f1(y - s * 0.3)}" r="${f1(s * 0.22)}"/></g>`;
  // оружие котиков: рукоять в (0,0), «клинок» вверх (−y). Начальное снаряжение — забавное: вобла, рыбья кость, коготь, открывашка…
  // обычное — своего цвета; редкое, эпическое и легендарное — окрашено «металлом» редкости (и светится — это делает скелет)
  function weapon(kind, rar) {
    const m = METAL[rar] || METAL.common, hi = rar && rar !== 'common', wood = '#a0703a';
    const grip = (y0, y1, w = 5, c = wood) => `<rect x="${-w / 2}" y="${y1}" width="${w}" height="${y0 - y1}" rx="2" fill="${c}" ${WS}/>`;
    const line = (d, c = INK, w = 1.6) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    switch (kind) {
      case 'sword': {   // сушёная вобла: держат за хвост
        const c = hi ? m : '#c99a58';
        return `<path d="M-7 13 L0 2 L7 13 Q0 9 -7 13 Z" fill="${c}" ${WS}/><path d="M0 3 C-10 -8 -11 -40 0 -60 C11 -40 10 -8 0 3 Z" fill="${c}" ${WS}/>`
          + `<path d="M0 -58 C-5 -40 -5 -12 0 1" fill="none" stroke="rgba(90,50,20,.35)" stroke-width="3"/>`
          + line('M-6 -44 Q0 -40 6 -44') + line('M-3 -54 l4 4 M1 -54 l-4 4', INK, 1.5)
          + line('M-7 -30 l3 2 M-7 -20 l3 2 M7 -30 l-3 2 M7 -20 l-3 2', 'rgba(60,30,10,.5)', 1.3)
          + `<path d="M-9 -26 l-5 4 l5 2 Z M9 -26 l5 4 l-5 2 Z" fill="${c}" ${WS}/>`;
      }
      case 'gladius': {   // рыбья кость
        const c = hi ? m : '#f3ead8';
        let ribs = ''; for (let y = -8; y >= -38; y -= 7) ribs += `<path d="M-10 ${y + 4} Q0 ${y - 3} 10 ${y + 4}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M-10 ${y + 4} Q0 ${y - 3} 10 ${y + 4}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;
        return `<path d="M-7 12 L0 2 L7 12 Z" fill="${c}" ${WS}/><rect x="-2" y="-44" width="4" height="47" rx="2" fill="${c}" ${WS}/>${ribs}`
          + `<path d="M-8 -42 L0 -56 L8 -42 Q0 -38 -8 -42 Z" fill="${c}" ${WS}/><circle cx="-1.5" cy="-47" r="2" fill="${INK}"/>`;
      }
      case 'dagger': {   // коготь
        const c = hi ? m : '#f1ece2';
        return `<rect x="-5" y="1" width="10" height="11" rx="5" fill="#ff8fa3" ${WS}/><circle cx="-2" cy="5" r="1.4" fill="${INK}" opacity=".35"/><circle cx="2" cy="8" r="1.4" fill="${INK}" opacity=".35"/>`
          + `<path d="M-4 2 C-5 -10 -1 -24 9 -33 C5 -22 5 -10 4 2 Z" fill="${c}" ${WS}/>` + line('M-1 -2 C-1 -12 2 -22 7 -29', 'rgba(255,255,255,.7)', 1.4);
      }
      case 'axe':   // открывашка для консервов
        return `${grip(14, -32, 5, '#e8455c')}<circle cy="-40" r="9" fill="${m}" ${WS}/><circle cy="-40" r="3" fill="${INK}"/>`
          + `<path d="M3 -44 L19 -52 Q24 -46 20 -40 L5 -35 Z" fill="${m}" ${WS}/><path d="M-6 -46 l-6 -6 l4 -3 l6 6 Z" fill="${m}" ${WS}/>`
          + line('M-5 -40 h10 M0 -45 v10', 'rgba(0,0,0,.3)', 1.2);
      case 'club': {   // колбаса на верёвочке
        const c = hi ? m : '#c8564b';
        return line('M0 2 V14', INK, 2.4) + `<path d="M-7 -54 C-10 -40 -10 -16 -7 -3 C-5 4 5 4 7 -3 C10 -16 10 -40 7 -54 C5 -61 -5 -61 -7 -54 Z" fill="${c}" ${WS}/>`
          + [[-2, -44], [3, -34], [-3, -24], [2, -14], [-1, -6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#f6d9cb"/>`).join('')
          + line('M-5 -58 q5 -6 10 0', INK, 2) + line('M-4 -50 Q-6 -30 -4 -8', 'rgba(255,255,255,.35)', 2);
      }
      case 'mace': {   // клубок ниток на спицах
        const c = hi ? m : '#e8607a';
        return `${grip(12, -30, 5, '#c9ced4')}<circle cy="-42" r="11" fill="${c}" ${WS}/>`
          + line('M-10 -46 Q0 -36 10 -46 M-9 -38 Q0 -50 9 -36 M-4 -52 Q2 -42 -2 -31', 'rgba(43,29,24,.45)', 1.6)
          + `<path d="M-15 -58 L10 -28 M15 -58 L-10 -28" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M-15 -58 L10 -28 M15 -58 L-10 -28" stroke="#dfe3e6" stroke-width="2" stroke-linecap="round"/>`
          + `<circle cx="-15" cy="-58" r="2.6" fill="#ffd23f" ${WS}/><circle cx="15" cy="-58" r="2.6" fill="#ffd23f" ${WS}/>` + line('M10 -36 q8 6 4 16 q-4 8 2 14', c, 2);
      }
      case 'hammer': {   // игрушечный молоток-пищалка
        const c = hi ? m : '#ff5a7a';
        return `${grip(14, -38, 5, '#ffd23f')}<rect x="-16" y="-56" width="32" height="18" rx="9" fill="${c}" ${WS}/><rect x="-11" y="-53" width="9" height="4" rx="2" fill="#fff" opacity=".6"/>`
          + line('M19 -50 l5 -2 M19 -44 l6 0 M-19 -50 l-5 -2 M-19 -44 l-6 0', INK, 1.6);
      }
      case 'spear': {   // дразнилка: палочка с пёрышками на верёвке
        const c = hi ? m : '#6ec6ff';
        return `<rect x="-2" y="-62" width="4" height="94" rx="2" fill="#d9b37a" ${WS}/>` + line('M0 -62 Q12 -66 13 -80', INK, 1.4)
          + `<path d="M13 -80 q9 5 3 17 q-9 -4 -3 -17 Z" fill="${c}" ${WS}/><path d="M13 -80 q-9 3 -6 16 q8 -5 6 -16 Z" fill="#ff8fa3" ${WS}/><circle cx="13" cy="-81" r="2.4" fill="#ffd23f" ${WS}/>`;
      }
      case 'pitchfork': {   // расчёска-вилы
        const c = hi ? m : '#ff8fa3';
        let teeth = ''; for (let i = 0; i < 6; i++) { const x = -12.5 + i * 5; teeth += `<path d="M${x} -56 V-76" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${x} -56 V-76" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`; }
        return `<rect x="-3" y="-50" width="6" height="82" rx="3" fill="#e8914a" ${WS}/>${teeth}<rect x="-16" y="-58" width="32" height="10" rx="4" fill="${c}" ${WS}/>`;
      }
      case 'bow': {   // рогатка с кошачьим кормом
        const c = hi ? m : wood;
        return `<path d="M0 20 V-6 M0 -6 L-12 -32 M0 -6 L12 -32" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 20 V-6 M0 -6 L-12 -32 M0 -6 L12 -32" fill="none" stroke="${c}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`
          + line('M-12 -32 Q0 -16 12 -32', '#ff5a7a', 2) + `<path d="M-3 -24 h6 l-1 5 h-4 Z" fill="#7a4a2a" ${WS}/><circle cx="-1" cy="-25" r="1.3" fill="#c88a50"/><circle cx="1.6" cy="-26" r="1.2" fill="#c88a50"/>`;
      }
      case 'staff': {   // лазерная указка — главное оружие кота-колдуна
        const dot = hi ? RARITY[rar] : '#ff3030';
        return `<rect x="-2.2" y="-62" width="4.4" height="98" rx="2" fill="${hi ? m : '#3a3a44'}" ${WS}/><rect x="-3.5" y="-10" width="7" height="12" rx="2" fill="#5a5a66" ${WS}/><circle cy="-4" r="1.6" fill="#ff3030"/>`
          + `<path d="M0 -64 V-84" stroke="${dot}" stroke-width="2" stroke-dasharray="3 3" opacity=".8"/><circle cy="-88" r="6" fill="${dot}" opacity=".35"/><circle cy="-88" r="3" fill="${dot}"/><circle cy="-64" r="2.6" fill="${dot}"/>`;
      }
      case 'crook': {   // мышка на палочке
        const c = hi ? m : '#9aa3ad';
        return `<rect x="-2.5" y="-50" width="5" height="86" rx="2" fill="${wood}" ${WS}/>` + line('M0 -50 C4 -62 14 -62 16 -54', INK, 1.6)
          + `<ellipse cx="17" cy="-44" rx="6" ry="9" fill="${c}" ${WS}/><circle cx="12.5" cy="-50" r="3" fill="${c}" ${WS}/><circle cx="21.5" cy="-50" r="3" fill="${c}" ${WS}/>`
          + `<circle cx="17" cy="-37" r="1.4" fill="#ff8fa3"/>` + line('M17 -35 q-4 8 3 12', '#ff8fa3', 1.4);
      }
      case 'censer':   // кадило с валерьянкой (зелёный дымок)
        return `<path d="M0 0 V22" stroke="${INK}" stroke-width="2" stroke-dasharray="3 2"/><path d="M-9 26 Q0 20 9 26 L7 36 Q0 41 -7 36 Z" fill="${hi ? m : '#c58a45'}" ${WS}/>`
          + `<path d="M-4 30 h8" stroke="${INK}" stroke-width="1.4"/><circle cx="-4" cy="14" r="3" fill="rgba(150,230,150,.6)"/><circle cx="2" cy="8" r="4" fill="rgba(150,230,150,.5)"/><circle cx="-1" cy="0" r="3.4" fill="rgba(150,230,150,.4)"/>`;
      default: return '';
    }
  }
  // щиты котиков: центр в (0,0)
  function shield(kind, rar) {
    const m = METAL[rar] || METAL.common, hi = rar && rar !== 'common';
    switch (kind) {
      case 'scutum': {   // когтеточка
        let rope = ''; for (let y = -16; y <= 16; y += 4) rope += `<path d="M-10 ${y} H10" stroke="#a07a40" stroke-width="1.6"/>`;
        return `<rect x="-13" y="-21" width="26" height="42" rx="4" fill="${hi ? m : '#8a5a2b'}" ${WS}/><rect x="-10" y="-18" width="20" height="36" rx="2" fill="#dcbf86"/>${rope}`
          + `<path d="M-6 -10 l9 12 M-2 -12 l9 12 M2 -14 l7 10" stroke="#ff8fa3" stroke-width="1.8" stroke-linecap="round"/>`;
      }
      case 'round':   // миска с кормом
        return `<circle r="15" fill="${hi ? m : '#c58a45'}" ${WS}/><circle r="10.5" fill="#7a4a2a" stroke="${INK}" stroke-width="1.6"/>`
          + [[-4, -3], [3, -5], [5, 2], [-2, 4], [-6, 3], [1, -1]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#c88a50" stroke="${INK}" stroke-width=".8"/>`).join('');
      case 'buckler':   // крышка от консервы
        return `<circle r="10.5" fill="${m}" ${WS}/><circle r="8" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.2"/><ellipse cy="-4.5" rx="4" ry="2.4" fill="none" stroke="${INK}" stroke-width="1.6"/>`
          + `<path d="M-4 3 q4 -4 8 0 q-4 4 -8 0 z M4 3 l3 -2 v4 z" fill="#6ec6ff" stroke="${INK}" stroke-width=".8"/>`;
      case 'barrel':   // лежанка-пончик
        return `<circle r="14.5" fill="${hi ? m : '#b6a6c9'}" ${WS}/><circle r="7" fill="#8e7aa8" stroke="${INK}" stroke-width="1.6"/>`
          + `<path d="M-11 -6 q2 -3 4 0 M6 -10 q2 -3 4 0 M-10 7 q2 3 4 0 M7 8 q2 3 4 0" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/><text x="0" y="3" text-anchor="middle" font-size="6" font-weight="700" fill="#fff">zz</text>`;
      default: return '';
    }
  }
  // доспехи котиков: сама вещь без стойки, низ на y = 0. Лорика — вязаный свитер с рыбкой, мантия — клетчатый плед колдуна
  const ARMOR_RAR = { uncommon: '#4cc95a', rare: '#4aa3ff', epic: '#b06bff', legendary: '#ffb83d' };
  function armor(kind, rar) {
    const tr = rar === 'common' || !ARMOR_RAR[rar] ? null : ARMOR_RAR[rar];
    if (kind === 'robe') {
      const base = tr || '#5a3fa0';
      let plaid = '';
      for (const x of [-30, -15, 0, 15, 30]) plaid += `<path d="M${x} -100 V0" stroke="#ffd23f" stroke-width="3" opacity=".55"/>`;
      for (const y of [-80, -60, -40, -20]) plaid += `<path d="M-44 ${y} H44" stroke="#ff8fa3" stroke-width="4" opacity=".5"/>`;
      const rc = 'catRobeClip' + (++catRobeN).toString(36);   // 20.10: свой id у каждого рисунка (общий id ломался на части телефонов)
      return `<defs><clipPath id="${rc}"><path d="M-22 -102 C-30 -70 -38 -30 -42 0 H42 C38 -30 30 -70 22 -102 Q0 -92 -22 -102 Z"/></clipPath></defs>`
        + `<path d="M-22 -102 C-30 -70 -38 -30 -42 0 H42 C38 -30 30 -70 22 -102 Q0 -92 -22 -102 Z" fill="${base}"/><g clip-path="url(#${rc})">${plaid}</g>`
        + `<path d="M-22 -102 C-30 -70 -38 -30 -42 0 H42 C38 -30 30 -70 22 -102 Q0 -92 -22 -102 Z" fill="none" ${WS}/>`
        + `<path d="M-40 -4 l4 8 M-30 -4 l3 8 M-20 -4 l2 8 M-10 -4 l1 8 M0 -4 v8 M10 -4 l-1 8 M20 -4 l-2 8 M30 -4 l-3 8 M40 -4 l-4 8" stroke="#ffd23f" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    const base = tr || '#e8607a';
    let knit = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const x = -22 + c * 9 + (r % 2) * 4, y = -80 + r * 14; knit += `<path d="M${x - 3} ${y} l3 4 l3 -4" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.4"/>`; }
    return `<path d="M-32 -96 C-36 -70 -32 -40 -28 -6 H28 C32 -40 36 -70 32 -96 Q0 -86 -32 -96 Z" fill="${base}" ${WS}/>${knit}`
      + `<path d="M-44 -98 Q-34 -112 -14 -102 L-16 -78 Q-34 -82 -44 -74 Z M44 -98 Q34 -112 14 -102 L16 -78 Q34 -82 44 -74 Z" fill="${base}" ${WS}/>`
      + `<rect x="-29" y="-10" width="58" height="10" rx="3" fill="#ffd23f" ${WS}/><path d="M-22 -10 v10 M-14 -10 v10 M-6 -10 v10 M2 -10 v10 M10 -10 v10 M18 -10 v10" stroke="rgba(0,0,0,.2)" stroke-width="1.4"/>`
      + `<path d="M-12 -100 Q0 -92 12 -100" fill="none" stroke="#ffd23f" stroke-width="4"/>`
      + `<path d="M-10 -52 q10 -10 18 0 q-8 10 -18 0 z M8 -52 l6 -5 v10 z" fill="#6ec6ff" ${WS}/><circle cx="-5" cy="-53" r="1.3" fill="${INK}"/>`;
  }

  /* ── ауры: свечение за котом, поднимающиеся следы лапок, звёзды, снежинки — анимация встроена в SVG ── */
  const AURA = { gold: ['#ffd76a', '#ffb83d'], sparks: ['#fff6c8', '#ffd76a'], halo: ['#ffe27a', '#ffe27a'], shadow: ['#a24bff', '#3a0f66'], frost: ['#bfe8ff', '#6fb8ff'] };
  function aura(kind, k) {
    const b = k.b, seed = k.seed >>> 0;
    const c = AURA[kind]; if (!c) return { back: '', front: '' };
    const id = k.uid('jlA'), d0 = (seed % 997) / 997 * 2;
    const cx = 60, cy = (b.top + 170) / 2 + 2, rx = (b.R - b.L) / 2 + 46, ry = (170 - b.top) / 2 + 44;
    let back = '', front = '';
    const glow = (op1, op2, dur) => `<defs><radialGradient id="${id}"><stop offset=".3" stop-color="${c[0]}"/><stop offset=".62" stop-color="${c[1]}" stop-opacity=".7"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient></defs>`
      + `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"><animate attributeName="opacity" values="${op1};${op2};${op1}" dur="${dur}s" begin="-${d0.toFixed(2)}s" repeatCount="indefinite"/></ellipse>`;
    const motes = (n, col, shape, size) => Array.from({ length: n }, (_, i) => {
      const x = b.L - 8 + ((i * 37 + (seed >>> (i % 8))) % (b.R - b.L + 16)), y0 = 168 - (i * 23) % 40, dur = 1.8 + (i % 4) * 0.45, beg = ((i * 0.53 + d0) % dur).toFixed(2);
      const sh = shape === 'paw' ? paw(0, 0, size, col) : shape === 'star' ? `<path d="${starP(0, 0, size)}" fill="${col}"/>` : shape === 'flake' ? `<path d="M0 ${-size} V${size} M${-size} 0 H${size} M${f1(-size * 0.7)} ${f1(-size * 0.7)} L${f1(size * 0.7)} ${f1(size * 0.7)} M${f1(size * 0.7)} ${f1(-size * 0.7)} L${f1(-size * 0.7)} ${f1(size * 0.7)}" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>` : `<circle r="${size}" fill="${col}"/>`;
      return `<g opacity="0"><animateTransform attributeName="transform" type="translate" values="${x} ${y0};${x + (i % 2 ? 6 : -6)} ${y0 - 70}" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.2;.7;1" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/>${sh}</g>`;
    }).join('');
    if (kind === 'gold') { back = glow(0.7, 1, 2.4); front = motes(8, '#ffe9a0', 'paw', 5); }
    else if (kind === 'sparks') { back = glow(0.25, 0.45, 2); front = motes(12, '#fff6c8', 'star', 4.5); }
    else if (kind === 'shadow') { back = glow(0.75, 1, 1.6); front = motes(11, '#c48bff', 'dot', 3.2); }
    else if (kind === 'frost') { back = glow(0.6, 0.95, 2.8); front = motes(10, '#e6f7ff', 'flake', 4.4); }
    else if (kind === 'halo') {   // нимб с ушками
      const t = b.top - 30;
      front = `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="2.2s" begin="-${d0.toFixed(2)}s" repeatCount="indefinite"/>`
        + `<ellipse cx="60" cy="${t}" rx="19" ry="5.5" fill="none" stroke="#fff3b0" stroke-width="9" opacity=".35"/>`
        + `<path d="M46 ${t - 3} l1 -9 l6 6 M74 ${t - 3} l-1 -9 l-6 6" fill="none" stroke="#ffe27a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
        + `<ellipse cx="60" cy="${t}" rx="19" ry="5.5" fill="none" stroke="#ffe27a" stroke-width="4"><animate attributeName="stroke-opacity" values=".75;1;.75" dur="1.6s" repeatCount="indefinite"/></ellipse></g>`;
    }
    return { back, front };
  }

  // лапа-конечность: тёмная обводка + мех; кисть — круглая лапка с пальчиками
  const limb = (d, col) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`;
  const pawHand = (x, y, col, dir) => `<circle cx="${x}" cy="${y}" r="5.6" fill="${col}" stroke="${INK}" stroke-width="2.2"/><path d="M${x - 2} ${f1(y + dir * 4.4)} v${-dir * 2.4} M${x + 2} ${f1(y + dir * 4.4)} v${-dir * 2.4}" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`;
  const OUT = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`;

  D.addStyle({
    id: 'cats',
    hw: { line: INK, ink: INK, sw: 2.6, face: INK },   // HW: токены для деталей «Ночи Тыквенной Луны» (doodle-core.js → hwHats / hwAcc / hwEyes)
    name: 'Котики',
    css: '',   // классы body/ln/face/eye стиль не использует: все цвета заданы прямо в SVG
    // цвета «по нику»: ровно 3 вызова r(): окрас шерсти, оттенок и насыщенность второго цвета
    palette(r) {
      const fill = FUR[Math.floor(r() * FUR.length)];
      const c2 = `hsl(${Math.floor(r() * 360)} ${70 + Math.floor(r() * 15)}% 58%)`;
      return { fill, c2 };
    },
    // 19.10: названия окрасов «по нику» (сайт, вкладка «Облик»: что даёт ник)
    colorNames: { '#f2a65a': 'Рыжий', '#e8914a': 'Тёмно-рыжий', '#f3d9b1': 'Кремовый', '#9aa3ad': 'Серый', '#7d8a99': 'Сизый', '#f4f1ec': 'Белый', '#4a4350': 'Чёрный', '#a8754f': 'Коричневый', '#ffc6a0': 'Персиковый', '#c9ccd3': 'Серебристый', '#b6a6c9': 'Лиловый', '#e7b98a': 'Песочный' },
    bodies,
    frame(b) {
      return { L: b.L, R: b.R, ex: b.narrow ? 8 : 10, ey: b.eyeY, my: b.eyeY + 15, sx: { l: b.L + (b.square ? 4 : 6), r: b.R - (b.square ? 4 : 6) } };
    },
    body,
    tail,

    eyePool: ['dots', 'big', 'big', 'slit', 'happy', 'sleepy', 'cyclops', 'stars'],
    eyes,
    mouthPool: ['open', 'grin', 'tongue'],
    mouth,
    faces,
    blushChance: 0.55,
    blush,
    hurt,

    hatPool: ['none', 'tuft', 'cap', 'bow', 'horns', 'crown', 'tophat', 'party', 'wizard', 'antenna', 'antenna2', 'cat', 'bunny', 'halo', 'sprout', 'bandana'],
    hatNoneChance: 0.2,
    hats,

    arms: {
      up(k) {   // лапы вверх
        const b = k.b, sx = k.sx, hy = b.top - 4;
        const arm = (s, hx) => limb(`M${s} ${b.armY} C${f1(s + (hx - s) * 0.2)} ${b.armY - 24} ${hx} ${hy + 26} ${hx} ${hy}`, k.fill) + pawHand(hx, hy, k.fill, -1);
        return `<g class="arm armL" style="transform-origin:${sx.l}px ${b.armY}px">${arm(sx.l, k.L - 14)}</g><g class="arm armR" style="transform-origin:${sx.r}px ${b.armY}px">${arm(sx.r, k.R + 14)}</g>`;
      },
      down(k) {   // лапы вдоль тела
        const b = k.b, sx = k.sx, ey = Math.min(160, b.armY + 42);
        const arm = (s, dir) => limb(`M${s} ${b.armY} C${s + dir * 10} ${b.armY + 14} ${s + dir * 12} ${b.armY + 28} ${s + dir * 9} ${ey}`, k.fill) + pawHand(s + dir * 9, ey + 2, k.fill, 1);
        return `<g class="arm sadL">${arm(sx.l, -1)}</g><g class="arm sadR">${arm(sx.r, 1)}</g>`;
      },
      armed(k) {   // боевая стойка
        const b = k.b, sx = k.sx;
        const hr = { x: k.R + 15, y: b.armY + 12 }, hl = { x: k.L - 7, y: b.armY + 20 };
        const svg = `<g class="arm batL">${limb(`M${sx.l} ${b.armY} C${sx.l - 8} ${b.armY + 6} ${hl.x + 2} ${hl.y - 8} ${hl.x} ${hl.y}`, k.fill)}</g><g class="arm batR">${limb(`M${sx.r} ${b.armY} C${sx.r + 8} ${b.armY + 4} ${hr.x - 2} ${hr.y - 8} ${hr.x} ${hr.y}`, k.fill)}</g>`;
        return { svg, right: hr, left: hl };
      },
    },
    hand: (k, x, y) => pawHand(x, y, k.fill, -1),
    hold: { weaponScale: 1.18, weaponRot: (kind) => (kind === 'bow' || kind === 'censer' || kind === 'grimoire' ? 0 : 12), shieldScale: 1.12, shieldDx: 6, shieldDy: 2 },
    weapon,
    shield,
    armor,
    wear: { line: INK, ink: INK },   // 19.10: обводка надетых доспехов и амулета (рисует скелет, doodle-core.js)
    rarityGlow: RARITY,
    gearGlow: (id, color) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="3.2" flood-color="${color}" flood-opacity="1"/></filter>`,
    held: {
      cocktail(k, rot) {   // молочный коктейль с рыбкой на бортике
        const hy = Math.min(160, k.b.armY + 42) + 2, hx = k.sx.r + 9;
        return `<g transform="translate(${hx} ${hy}) rotate(${rot})"><g class="jd-cocktail">`
          + `<path d="M-1.5 0 V-10 M-7 1 h11" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
          + `<path d="M-14 -26 L12 -26 L-1 -10 Z" fill="rgba(230,245,255,.6)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`
          + `<path d="M-11 -23 L9 -23 L-1 -12 Z" fill="#fff6ee"/><path d="M-11 -23 L9 -23 L7 -21 L-9 -21 Z" fill="#ffc6d2"/>`
          + `<path d="M4 -24 L12 -44" stroke="${NOSE}" stroke-width="2.6" stroke-linecap="round"/>`
          + `<path d="M-15 -30 q5 -6 11 0 q-6 6 -11 0 z M-4 -30 l4 -3 v6 z" fill="#ff9a3d" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`
          + `</g></g>${pawHand(hx, hy, k.fill, -1)}`;
      },
    },

    // 19.10: «Плащ первопроходца» у котика — маленький, чуть выше лапок, с фестонами (шире боков — видно из-за круглого котика) и застёжками-лапками
    // 20.10: застёжки — у ворота (collar): на «плечах» они садились на щёки поверх румянца
    pioneer: { cloak: '#35507a', lining: '#cfe8ff', line: INK, ink: INK, w: 3, len: 150, flare: 24, hem: 'round', clasp: 'paw', claspAt: 'collar' },
    capeColor: '#c0182b',
    acc: {
      cape(k, col) {
        const L = k.L, R = k.R, t = k.b.armY - 8;
        return `<path d="M${L + 6} ${t} C${L - 12} ${t + 30} ${L - 20} 150 ${L - 18} 168 L${R + 18} 168 C${R + 20} 150 ${R + 12} ${t + 30} ${R - 6} ${t} Z" fill="${col}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
          + `<path d="M${L + 4} ${t + 2} Q60 ${t + 14} ${R - 4} ${t + 2}" fill="none" stroke="#ffc94d" stroke-width="4" stroke-linecap="round"/>`;
      },
      bowtie(k, col) {   // бабочка с бубенчиком
        const y = k.my + 13;
        return `<path d="M60 ${y} l-11 -7 l0 14 z M60 ${y} l11 -7 l0 14 z" fill="${col}" ${OUT}/><circle cx="60" cy="${y + 6}" r="3.6" fill="#ffc94d" ${OUT}/><path d="M60 ${y + 7} v2.5" stroke="${INK}" stroke-width="1.2"/>`;
      },
      glasses(k) {
        const { ex, ey } = k;
        return k.cyc ? `<circle cx="60" cy="${ey - 2}" r="13" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="2.6"/>`
          : `<circle cx="${60 - ex}" cy="${ey}" r="8.5" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="2.6"/><circle cx="${60 + ex}" cy="${ey}" r="8.5" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="2.6"/><path d="M${60 - ex + 8} ${ey - 1} q${ex - 8} -5 ${2 * ex - 16} 0" fill="none" stroke="${INK}" stroke-width="2.6"/>`;
      },
      shades(k) {   // очки «кошачий глаз»
        const { ex, ey } = k;
        if (k.cyc) return `<path d="M43 ${ey - 11} L77 ${ey - 11} Q75 ${ey + 7} 60 ${ey + 7} Q45 ${ey + 7} 43 ${ey - 11} Z" fill="${INK}"/><path d="M48 ${ey - 6} l6 0" stroke="#fff" stroke-width="2" opacity=".6"/>`;
        const lens = (xo, xi) => `M${xo} ${ey - 8} L${xi} ${ey - 4} Q${xi} ${ey + 6} ${f1((xo + xi) / 2)} ${ey + 6} Q${xo + (xi > xo ? 2 : -2)} ${ey + 5} ${xo} ${ey - 8} Z`;
        return `<path d="${lens(60 - ex - 10, 60 - ex + 7)} ${lens(60 + ex + 10, 60 + ex - 7)} M${60 - ex + 7} ${ey - 3} h${2 * ex - 14}" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M${60 - ex - 5} ${ey - 3} l5 0" stroke="#fff" stroke-width="2" opacity=".6"/>`;
      },
      monocle(k) {
        const { ex, ey } = k, cyc = k.cyc, x = cyc ? 60 : 60 + ex, y = cyc ? ey - 2 : ey;
        return `<circle cx="${x}" cy="${y}" r="${cyc ? 12.5 : 8.5}" fill="rgba(255,255,255,.2)" stroke="#ffc94d" stroke-width="2.8"/><path d="M${x + (cyc ? 9 : 6)} ${y + (cyc ? 9 : 6)} q6 14 -2 30" fill="none" stroke="#ffc94d" stroke-width="1.6"/>`;
      },
      mustache(k) {   // подкрученные усы под носом
        const y = k.my - 2;
        return `<path d="M60 ${y} c-3 -4 -10 -5 -14 -1 c-3 3 -6 2 -7 -1 c0 6 9 9 15 5 c3 -1 5 -2 6 -3 c1 1 3 2 6 3 c6 4 15 1 15 -5 c-1 3 -4 4 -7 1 c-4 -4 -11 -3 -14 1 z" fill="#3a2410" stroke="#3a2410" stroke-width="1.2" stroke-linejoin="round"/>`;
      },
      scarf(k, col) {
        const L = k.L, R = k.R, y = k.my + 12;
        return `<path d="M${L + 4} ${y - 3} Q60 ${y + 9} ${R - 4} ${y - 3} L${R - 3} ${y + 7} Q60 ${y + 19} ${L + 3} ${y + 7} Z" fill="${col}" ${OUT}/><path d="M${R - 16} ${y + 8} l3 26 l10 -2 l-3 -26 z" fill="${col}" ${OUT}/><path d="M${R - 14} ${y + 30} l2 5 M${R - 10} ${y + 30} l2 5 M${R - 6} ${y + 29} l2 5" stroke="${INK}" stroke-width="1.6"/>`;
      },
      tie(k, col) {
        const y = k.my + 10;
        return `<path d="M55 ${y} h10 l-2 6 h-6 z" fill="${col}" ${OUT}/><path d="M57 ${y + 6} h6 l5 30 l-8 8 l-8 -8 z" fill="${col}" ${OUT}/>${paw(60, y + 22, 3.4, 'rgba(0,0,0,.25)')}`;
      },
    },

    event: {
      crown(k, size) {   // корона между ушами
        const b = k.b, kk = size === 'mini' ? 0.7 : 1, t = b.top + 5, w = 15 * kk, h = 19 * kk;
        return `<path d="M${60 - w} ${t} l0 ${-h} l${w / 2} ${f1(h * 0.45)} l${w / 2} ${f1(-h * 0.7)} l${w / 2} ${f1(h * 0.7)} l${w / 2} ${f1(-h * 0.45)} l0 ${h} z" fill="#ffc94d" stroke="${INK}" stroke-width="${f1(2.8 * kk)}" stroke-linejoin="round"/>`
          + `<circle cx="60" cy="${f1(t - h * 0.35)}" r="${f1(3 * kk)}" fill="#e8455c"/><circle cx="${f1(60 - w * 0.55)}" cy="${f1(t - h * 0.2)}" r="${f1(2.2 * kk)}" fill="#4ab0ff"/><circle cx="${f1(60 + w * 0.55)}" cy="${f1(t - h * 0.2)}" r="${f1(2.2 * kk)}" fill="#6fdc6f"/>`;
      },
      wig(k) {   // парик судьи: кудри поверх головы и по бокам (ушки выглядывают)
        const b = k.b, t = b.top, hw = b.hw, cs = [];
        for (let i = -2; i <= 2; i++) cs.push(`<circle cx="${f1(60 + i * hw / 3.4)}" cy="${f1(t + 4 - (2 - Math.abs(i)) * 2)}" r="8.5"/>`);
        for (let j = 1; j <= 4; j++) { cs.push(`<circle cx="${f1(60 - hw - 6)}" cy="${t + 6 + j * 13}" r="8.5"/>`); cs.push(`<circle cx="${f1(60 + hw + 6)}" cy="${t + 6 + j * 13}" r="8.5"/>`); }
        return `<g fill="#f4f1ea" stroke="#9a9488" stroke-width="2.2">${cs.join('')}</g>`;
      },
    },
    uniform(k) {   // тюремная роба
      const u = k.uid('jlU'), y0 = k.my + 11, d = k.b.d;
      return `<defs><clipPath id="${u}c"><path d="${d}"/></clipPath><pattern id="${u}p" patternUnits="userSpaceOnUse" width="120" height="16" patternTransform="rotate(-4)"><rect width="120" height="16" fill="#f1efe8"/><rect y="8" width="120" height="8" fill="#23212b"/></pattern></defs>`
        + `<g clip-path="url(#${u}c)"><rect x="0" y="${y0}" width="120" height="${170 - y0}" fill="url(#${u}p)"/><path d="M0 ${y0} H120" stroke="#23212b" stroke-width="4"/>`
        + `<path d="M48 ${y0} l12 9 l12 -9" fill="#f1efe8" stroke="#23212b" stroke-width="2.5" stroke-linejoin="round"/></g>`
        + `<path fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" d="${d}"/>`;
    },

    // призрак: полупрозрачный кот с ушками, низ «рваный», светящиеся глаза, плавно парит
    ghost(k, parts) {
      const g = k.uid('jlG'), cyc = k.cyc, GI = '#2a2f55', { ex, ey, my } = k;
      let wave = 'M-20 190 V160'; for (let x = -20; x < 140; x += 12) wave += ' q6 -9 12 0'; wave += ' V190 Z';
      const gEyes = cyc ? `<ellipse cx="60" cy="${ey - 2}" rx="7" ry="9" fill="${GI}"/><ellipse cx="60" cy="${ey - 2}" rx="1.6" ry="6" fill="#bff7ff"/>`
        : `<ellipse cx="${60 - ex}" cy="${ey}" rx="4.6" ry="6.4" fill="${GI}"/><ellipse cx="${60 + ex}" cy="${ey}" rx="4.6" ry="6.4" fill="${GI}"/><path d="M${60 - ex} ${ey - 4} v8 M${60 + ex} ${ey - 4} v8" stroke="#bff7ff" stroke-width="1.6" stroke-linecap="round"/>`;
      const gMouth = k.sad ? `<path d="M54 ${my + 3} q6 -5 12 0" fill="none" stroke="${GI}" stroke-width="2.2" stroke-linecap="round"/>` : `<path d="M54 ${my} q3 4 6 0 q3 4 6 0" fill="none" stroke="${GI}" stroke-width="2.2" stroke-linecap="round"/>`;
      const fl = ((k.seed >>> 0) % 1000) / 1000 * 2.6;
      return {
        style: 'filter:drop-shadow(0 0 7px rgba(190,230,255,.75))',
        inner: `<defs><mask id="${g}" maskUnits="userSpaceOnUse" x="-60" y="-80" width="240" height="280"><rect x="-60" y="-80" width="240" height="280" fill="#fff"/><path d="${wave}" fill="#000"/></mask></defs>`
          + `<g opacity=".8"><animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.6s" begin="-${fl.toFixed(2)}s" repeatCount="indefinite"/>`
          + `<g mask="url(#${g})">${parts.arms}<path fill="rgba(228,240,255,.62)" stroke="rgba(255,255,255,.85)" stroke-width="3" stroke-linejoin="round" d="${k.b.d}"/></g>`
          + `<path d="M56.5 ${ey + 7} h7 l-3.5 4 z" fill="${GI}" opacity=".6"/>${gEyes}<g class="jd-mouth">${gMouth}</g>${parts.head}</g>`,
      };
    },

    aura,
  });
})();

} catch (e) { console.error('[стили] styles/cats/characters.js не загрузился:', e); }

/* ───── стиль «cats»: styles/cats/goods.js ───── */
try {
/* Стиль «Котики» — товары (часть 'goods'): кошачья еда и «молочко здоровья» — рисунки совпадают с названиями из names.json.
   Договор — styles/legion/goods.js: { food: { id: () => svg }, potion: (it) => svg }. Низ вещи — y = 0, ширина около 60–70.
   Обводка — тёплая коричневая, как у самих котиков. */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('cats', 'goods', function () {
    const INK = '#2b1d18', O = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const MILK = '#fffaf0', PINK = '#ff8fa3';
    // рыбка мордой вправо: c — спинка, b — брюшко, L — длина, H — полувысота
    const fish = (c, b, L = 52, H = 11, dy = 0) => {
      const rx = L * 0.36, cy = -(H + 2) + dy;
      return `<path d="M${-rx + 3} ${cy} L${-rx - 15} ${cy - H - 2} L${-rx - 15} ${cy + H + 2} Z" fill="${c}" ${O(2.6)}/>`
        + `<ellipse cx="0" cy="${cy}" rx="${rx}" ry="${H}" fill="${c}" ${O(3)}/>`
        + `<path d="M${-rx * 0.7} ${cy + 3} Q0 ${cy + H - 1} ${rx * 0.75} ${cy + 2}" fill="none" stroke="${b}" stroke-width="4" stroke-linecap="round"/>`
        + `<path d="M${rx * 0.28} ${cy - H + 3} q4 ${H - 3} 0 ${2 * H - 6}" fill="none" stroke="${INK}" stroke-width="2"/>`
        + `<circle cx="${rx * 0.58}" cy="${cy - 3}" r="2.6" fill="${INK}"/>`;
    };
    // миска: внутри — что угодно (рисуется поверх ободка)
    const bowl = (inside, c = PINK) => `<path d="M-32 -16 H32 Q30 4 0 4 Q-30 4 -32 -16 Z" fill="${c}" ${O(3.2)}/>`
      + `<ellipse cy="-16" rx="32" ry="7" fill="#fff" ${O(2.6)}/>${inside}<path d="M-14 -4 q14 4 28 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".6"/>`;
    const steam = (x = 0, y = -36) => `<path d="M${x - 6} ${y} q-5 -7 0 -13 M${x + 6} ${y} q-5 -7 0 -13" stroke="#fff" stroke-width="2.6" fill="none" opacity=".8" stroke-linecap="round"/>`;
    const FOOD = {
      // Килька — маленькая серебристая рыбка
      apple: () => fish('#9fb7cf', '#e8f1fa', 46, 9),
      // Корюшка — зеленоватая рыбка
      pear: () => fish('#9cc7a8', '#e9f6ec', 50, 9),
      // Хрустящий корм — миска с кормом-рыбками
      pretzel: () => bowl([[-16, -19], [-4, -22], [9, -20], [20, -18], [-9, -16], [4, -17]].map(([x, y], i) => `<path d="M${x - 4} ${y} q4 -4 8 0 l3 -2 v4 l-3 -2 q-4 4 -8 0" fill="${i % 2 ? '#b5762f' : '#8a5a2b'}" stroke="${INK}" stroke-width="1.4"/>`).join(''), '#7cc8ff'),
      // Миска сметаны — белая горка в миске
      bread: () => bowl(`<path d="M-24 -17 Q-18 -30 -4 -28 Q6 -38 16 -28 Q26 -26 24 -17 Z" fill="${MILK}" ${O(2.6)}/><path d="M0 -36 q4 -4 2 -8" stroke="${INK}" stroke-width="2.4" fill="none"/>`),
      // Блюдце молока
      kvass: () => `<ellipse cy="-6" rx="34" ry="8" fill="#ffd9a8" ${O(3)}/><ellipse cy="-9" rx="24" ry="5" fill="${MILK}" ${O(2.2)}/><circle cx="-8" cy="-10" r="1.6" fill="#fff"/>`,
      // Сыр с дырками
      cheese: () => `<path d="M-30 0 H30 V-28 L-30 -12 Z" fill="#ffd34d" ${O(3.4)}/><circle cx="-8" cy="-8" r="4" fill="#e8b923"/><circle cx="14" cy="-14" r="3.4" fill="#e8b923"/><circle cx="20" cy="-5" r="2.4" fill="#e8b923"/>`,
      // Рыбный пирог — пирог, из которого торчит хвост
      pie: () => `<path d="M30 -20 L44 -32 L44 -10 Z" fill="#9fb7cf" ${O(2.6)}/><path d="M-34 0 L-29 -16 H29 L34 0 Z" fill="#d9993f" ${O(3.4)}/><path d="M-28 -16 q28 -18 56 0" fill="#e8a23a" ${O(3)}/><path d="M-22 -24 l4 4 m4 -4 l4 4 m-4 -4" stroke="#8a5a2b" stroke-width="2.4"/><path d="M-30 -20 q-8 -6 -10 -14" stroke="#9fb7cf" stroke-width="0"/>`,
      // Копчёная колбаска — с перевязками на концах
      ham: () => `<path d="M-30 -10 Q-30 -26 -12 -26 H14 Q32 -26 32 -12 Q32 0 14 0 H-12 Q-30 0 -30 -10 Z" fill="#b5523a" ${O(3.2)}/><path d="M-30 -13 l-8 -6 M-30 -13 l-8 4 M32 -13 l8 -6 M32 -13 l8 4" stroke="${INK}" stroke-width="2.4"/><circle cx="-6" cy="-14" r="2.4" fill="#f2c3a8"/><circle cx="8" cy="-10" r="2" fill="#f2c3a8"/><circle cx="18" cy="-17" r="2" fill="#f2c3a8"/><path d="M-18 -21 q10 -3 20 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".5"/>`,
      // Целый лосось — большая розово-оранжевая рыба
      roast: () => fish('#f08a66', '#ffd2bf', 70, 14) + `<path d="M-6 -24 q4 -6 10 0 M6 -24 q4 -6 10 0" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".5"/>`,
      // Пучок кошачьей мяты
      honey_cake: () => `<path d="M0 0 V-24 M0 -8 L-12 -26 M0 -8 L12 -26" stroke="#5a8a3a" stroke-width="3.4" stroke-linecap="round"/>`
        + [[-14, -30, -30], [0, -36, 0], [14, -30, 30], [-8, -18, -40], [9, -18, 40]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="11" transform="rotate(${a} ${x} ${y})" fill="#8fd16a" ${O(2.4)}/>`).join('')
        + `<path d="M-6 -2 H6" stroke="${PINK}" stroke-width="5" stroke-linecap="round"/>`,
      // Тёплое молоко с мёдом — кружка, мёд стекает, пар
      sage_tea: () => `<path d="M-18 -32 H16 L13 -2 Q0 3 -15 -2 Z" fill="${MILK}" ${O(3)}/><path d="M16 -26 q12 2 8 12 q-3 6 -11 4" fill="none" stroke="${INK}" stroke-width="3.2"/><path d="M-18 -32 H16 L15 -26 Q8 -22 6 -26 Q2 -18 -2 -26 Q-10 -22 -17 -26 Z" fill="#ffc94d" ${O(2)}/>${steam(-2, -38)}`,
      // Бойцовая уха — котелок с рыбьим хвостом
      spicy_stew: () => `<path d="M-30 -24 H30 Q30 4 0 4 Q-30 4 -30 -24Z" fill="#6d5a45" ${O(3.4)}/><ellipse cy="-24" rx="30" ry="6" fill="#ffb27a" ${O(2.6)}/><path d="M8 -26 L20 -40 L24 -26 Z" fill="#9fb7cf" ${O(2.2)}/><circle cx="-10" cy="-25" r="3" fill="#ff6a3d"/><circle cx="-2" cy="-23" r="2" fill="#6fbf4a"/>${steam(-10, -34)}`,
    };
    // Молочко здоровья: малое — бутылочка с розовой крышкой, большое — бидон-кувшин
    const potion = (it) => /hp|big|больш/i.test(String(it.id) + (it.name || ''))
      ? `<path d="M-22 0 V-34 Q-22 -42 -12 -44 V-52 H12 V-44 Q22 -42 22 -34 V0 Z" fill="${MILK}" ${O(3.2)}/><rect x="-14" y="-58" width="28" height="8" rx="3" fill="${PINK}" ${O(2.6)}/><path d="M22 -36 q14 0 12 14 q-2 10 -12 10" fill="none" stroke="${INK}" stroke-width="3.2"/><path d="M-8 -26 q-6 -6 0 -10 q6 4 8 0 q2 4 -8 10" fill="${PINK}" stroke="${INK}" stroke-width="1.6"/><path d="M-22 -14 H22" stroke="#e8e0d0" stroke-width="2.4"/>`
      : `<path d="M-12 0 V-24 Q-12 -30 -6 -32 V-38 H6 V-32 Q12 -30 12 -24 V0 Z" fill="${MILK}" ${O(3)}/><rect x="-8" y="-44" width="16" height="7" rx="3" fill="${PINK}" ${O(2.4)}/><path d="M-4 -18 q-4 -4 0 -7 q4 3 5 0 q2 3 -5 7" fill="${PINK}" stroke="${INK}" stroke-width="1.4"/>`;
    return { food: FOOD, potion };
  });
})();

} catch (e) { console.error('[стили] styles/cats/goods.js не загрузился:', e); }

/* ───── стиль «cats»: styles/cats/hero.js ───── */
try {
/* Стиль «Котики» — карточки героя (модуль «Легионер»): карточки как страница детской книжки: тёплая бумага, коричневая обводка, розовые лапки.
   Разметка и анимации — в modules/legionary/client/widget.js; здесь только вид. Основа — CSS «Легиона», ниже — правила этого стиля
   (последние перекрывают основу). Договор — styles/README.md, раздел «Карточки героя». */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addPart) return;
  window.MDDoodle.addPart('cats', 'hero', function () {
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

/* ===== «Котики»: страница детской книжки — тёплая бумага, коричневая обводка, розовые лапки ===== */
.lg-card { border-radius: 20px; padding: 16px 18px 16px 12px;
  background: radial-gradient(ellipse at 16% 112%, rgba(255,143,163,.35), transparent 55%), linear-gradient(170deg, #fff8ec 0%, #fbe9cf 100%);
  border: 3px solid #2b1d18; box-shadow: 0 0 0 4px #ffd9a8, 0 0 0 7px #2b1d18, 0 10px 22px rgba(43,29,24,.45); color: #3a271e; }
.lg-card::before, .lg-card::after { top: 9px; width: 12px; height: 11px; border-radius: 50% 50% 45% 45%;
  background: radial-gradient(circle at 50% 70%, #ff8fa3 45%, transparent 47%), radial-gradient(circle at 15% 20%, #ff8fa3 22%, transparent 24%), radial-gradient(circle at 50% 8%, #ff8fa3 22%, transparent 24%), radial-gradient(circle at 85% 20%, #ff8fa3 22%, transparent 24%); box-shadow: none; }
.lg-card.ghost { background: radial-gradient(ellipse at 16% 112%, rgba(182,166,201,.45), transparent 55%), linear-gradient(170deg, #f4f0fb 0%, #e3dcf0 100%);
  box-shadow: 0 0 0 4px #cfc4e6, 0 0 0 7px #2b1d18, 0 0 24px rgba(182,166,201,.6), 0 10px 22px rgba(43,29,24,.45); }
.lg-card .pic { border-radius: 14px; background: radial-gradient(ellipse at 50% 105%, rgba(255,210,63,.55), transparent 65%), linear-gradient(#ffe7c2, #ffd29a); box-shadow: inset 0 0 0 3px #2b1d18; }
.lg-card.ghost .pic { background: radial-gradient(ellipse at 50% 105%, rgba(182,166,201,.6), transparent 65%), linear-gradient(#efe9f8, #d9cfee); }
.lg-card .nm { color: #2b1d18; text-shadow: 0 2px 0 #ffd9a8; }
.lg-card.ghost .nm { color: #5a4a7a; text-shadow: 0 2px 0 #fff; }
.lg-card .role { color: #a0703a; }
.lg-card .lvl { color: #fff; background: linear-gradient(#ff9fb2, #e8607a); border: 2px solid #2b1d18; box-shadow: none; clip-path: none; border-radius: 999px; }
.lg-card .xp { height: 10px; border-radius: 6px; background: #f1dcc0; box-shadow: inset 0 0 0 2px #2b1d18; }
.lg-card .xp i { background: linear-gradient(90deg, #ff8fa3, #ffb84a); box-shadow: none; border-radius: 6px; }
.lg-card.ghost .xp i { background: linear-gradient(90deg, #b6a6c9, #e3dcf0); }
.lg-card .stats div { color: #8a5a3a; border-radius: 10px; background: #fffaf2; box-shadow: inset 0 0 0 2px #e8cfae; }
.lg-card .stats b { color: #2b1d18; text-shadow: none; }
.lg-card .stats .hpc small { color: #a0805a; }
.lg-card .stats .hpbar { background: #f1dcc0; }
.lg-card .stats .hpbar i { background: linear-gradient(90deg, #e8607a, #ff8fa3); }
.lg-card .gear { color: #5a3a2a; }
.lg-card .gear span { border-radius: 8px; background: #fff3e0; border: 1.5px solid #e8cfae; }
.lg-box .gem { box-shadow: 0 0 0 1px #2b1d18; }
.lg-box .r-common { color: #5a3a2a; } .lg-box .r-uncommon { color: #2f8a3c; } .lg-box .r-rare { color: #2a7fc7; } .lg-box .r-epic { color: #8a45d0; } .lg-box .r-legendary { color: #c07a10; }
.lg-card .bag { color: #3a271e; } .lg-card .bag .n { color: #e8607a; } .lg-card .bag .on { color: #4a9a3a; }
.lg-card .hint { color: #a0805a; }
.lg-card .note { color: #fff; background: linear-gradient(#ff8fa3, #e8607a); border: 2px solid #2b1d18; box-shadow: none; border-radius: 10px; }
.lg-card .ghostline { color: #6a5a9a; } .lg-card .woundline { color: #c0404a; } .lg-card .buffline { color: #c07a10; }
.lg-scene .ttl b { -webkit-text-stroke: 2.5px #2b1d18; }
.lg-scene .ttl span { -webkit-text-stroke: 1.5px #2b1d18; }
.lg-scene .sub i { background: rgba(43,29,24,.85); border-radius: 12px; }
.lg-scene .flash { background: radial-gradient(circle at 50% 70%, rgba(255,143,163,.75), transparent 60%); }
.lg-scene .ring { border-color: #ff8fa3; }
.lg-scene .beam { background: linear-gradient(180deg, rgba(255,240,210,.9), rgba(255,210,150,.15) 85%, transparent); }
`;
    return {
      css,
      slotIcons: { weapon: '🐟', armor: '🧶', shield: '🥣', helmet: '⛑', trinket: '🔔' },
      stats: { hp: { label: '💗 Мур-ХП', icon: '💗' }, def: { label: '🧶 Пушистость', icon: '🧶' }, atk: { label: '🐾 Царапки', icon: '🐾' }, mag: { label: '✨ Мяу-магия', icon: '✨' } },
      texts: { recruit: 'Котёнок', ghost: '👻 Призрак-кот', nothing: 'Ничего не надето — только шёрстка', level: 'УР.', buff: '✨' },
      scenes: { death: { title: '😿 МИНУС ЖИЗНЬ', color: '#e8607a' }, revive: { title: '😺 ЕЩЁ ОДНА ЖИЗНЬ', color: '#ffd23f' }, level: { title: (n) => `🐾 УРОВЕНЬ ${n}`, color: '#ffb84a' } },
    };
  });
  // монеты стиля «Котики»: чешуйка (бронза), серебряная рыбка, золотая рыбка. 100 : 1, как у всех
  window.MDDoodle.addPart('cats', 'coins', function () {
    const fish = (c1, c2) => `<path d="M2 21 Q14 2 29 21 Q14 38 2 21 Z" fill="${c1}" stroke="#2a2236" stroke-width="2.6"/><path d="M27 21 L39 9 L38 33 Z" fill="${c1}" stroke="#2a2236" stroke-width="2.6" stroke-linejoin="round"/><circle cx="9" cy="18" r="2.6" fill="#2a2236"/><path d="M14 13 Q19 21 14 29 M20 12 Q25 21 20 30" stroke="${c2}" stroke-width="2.2" fill="none"/>`;
    const ART = {
      b: '<path d="M20 5 Q34 18 20 35 Q6 18 20 5 Z" fill="#c07a44" stroke="#2a2236" stroke-width="2.4"/><path d="M12 18 Q20 24 28 18 M13 25 Q20 30 27 25" stroke="#7a4420" stroke-width="1.8" fill="none"/>',
      s: fish('#d4d8e4', '#8a90a4'),
      g: fish('#f2c14e', '#b8862a') + '<path d="M6 9 L8 2 L11 7 L14 1 L17 7 L20 2 L21 10 Z" fill="#ffd76a" stroke="#2a2236" stroke-width="1.8" stroke-linejoin="round"/>',
    };
    return {
      b: { name: 'чешуйка', forms: ['чешуйка', 'чешуйки', 'чешуек'], color: '#c07a44', emoji: '🟤' },
      s: { name: 'серебряная рыбка', forms: ['серебряная рыбка', 'серебряные рыбки', 'серебряных рыбок'], color: '#c8ccd8', emoji: '⚪' },
      g: { name: 'золотая рыбка', forms: ['золотая рыбка', 'золотые рыбки', 'золотых рыбок'], color: '#f2c14e', emoji: '🟡' },
      svg: (k, size = 22) => `<svg class="coin coin-${k}" viewBox="0 0 40 40" width="${size}" height="${size}">${ART[k] || ART.b}</svg>`,
    };
  });
})();

} catch (e) { console.error('[стили] styles/cats/hero.js не загрузился:', e); }

if (window.MDDoodle && window.MDDoodle.addNames) window.MDDoodle.addNames("cats", {"items":{"dagger":{"name":"Коготок","chat":["коготь","коготок"]},"rusty_sword":{"name":"Сушёная вобла","chat":["вобла","рыба"]},"wood_club":{"name":"Колбаса-дубинка","chat":["колбаса"]},"pitchfork":{"name":"Расчёска-вилы","chat":["расчёска","расческа"]},"hatchet":{"name":"Открывашка","chat":["открывашка"]},"wood_spear":{"name":"Дразнилка","chat":["дразнилка","перо"]},"smith_hammer":{"name":"Молоток-пищалка","chat":["пищалка"]},"mace":{"name":"Клубок на спицах","chat":["клубок","спицы"]},"gladius":{"name":"Рыбья кость","chat":["кость"]},"hunting_bow":{"name":"Рогатка с кормом","chat":["рогатка"]},"bow":{"name":"Детская рогатка","chat":["детская"]},"crook":{"name":"Мышка на палочке","chat":["мышка"]},"walking_staff":{"name":"Указка-трость","chat":["указка"]},"staff":{"name":"Лазерная указка","chat":["лазер"]},"copper_censer":{"name":"Чашка валерьянки","chat":["валерьянка"]},"censer":{"name":"Кадило-валерьянка","chat":["кадило"]},"war_axe":{"name":"Боевая открывашка","chat":["боевая"]},"spatha":{"name":"Копчёная скумбрия","chat":["скумбрия"]},"storm_staff":{"name":"Указка бури","chat":["бури"]},"aquila_blade":{"name":"Золотая рыбка","chat":["рыбка"]},"barrel_lid":{"name":"Лежанка-пончик","chat":["лежанка","пончик"]},"buckler":{"name":"Крышка консервы","chat":["крышка"]},"wood_shield":{"name":"Миска с кормом","chat":["миска"]},"scutum":{"name":"Когтеточка","chat":["когтеточка"]},"centurion_shield":{"name":"Когтеточка-сотник","chat":["когтеточка-сотник"]},"lorica":{"name":"Вязаный свитер","chat":["свитер"]},"robe":{"name":"Плед колдуна","chat":["плед"]},"galea":{"name":"Шлем кото-легиона","chat":["шлем"]},"laurel":{"name":"Венок из мяты","chat":["венок","мята"]},"spark_charm":{"name":"Бубенчик искр","chat":["бубенчик"]},"frost_amulet":{"name":"Ошейник вьюги","chat":["ошейник"]},"shadow_amulet":{"name":"Ошейник тьмы","chat":["тьмы"]},"aquila_amulet":{"name":"Золотой ошейник","chat":["золотой"]},"saint_halo":{"name":"Нимб 9-й жизни","chat":["нимб"]},"potion_small":{"name":"Малое молочко здоровья","chat":["молочко","малое"]},"potion_hp":{"name":"Большое молочко здоровья","chat":["большое"]},"apple":{"name":"Килька","chat":["килька"]},"pear":{"name":"Корюшка","chat":["корюшка"]},"pretzel":{"name":"Хрустящий корм","chat":["корм"]},"bread":{"name":"Миска сметаны","chat":["сметана","сметаны"]},"kvass":{"name":"Блюдце молока","chat":["блюдце"]},"cheese":{"name":"Сыр с дырками","chat":["сыр"]},"pie":{"name":"Рыбный пирог","chat":["пирог"]},"ham":{"name":"Копчёная колбаска","chat":["колбаска"]},"roast":{"name":"Целый лосось","chat":["лосось"]},"honey_cake":{"name":"Пучок кошачьей мяты","chat":["мята","мяты"]},"sage_tea":{"name":"Тёплое молоко с мёдом","chat":["молоко","мёдом","медом"]},"spicy_stew":{"name":"Бойцовая уха","chat":["уха","уху"]},"hadrian_wall":{"name":"Великая когтеточка","chat":["когтеточка","великая когтеточка"]},"storm_heart":{"name":"Указка-молния","chat":["указка","молния"]},"vesta_breath":{"name":"Священная валерьянка","chat":["валерьянка"]},"diana_bow":{"name":"Рогатка Луны","chat":["рогатка"]},"rog_shiv":{"name":"Рыболовный крючок","chat":["крючок"]},"rog_dirk":{"name":"Коготь форточника","chat":["форточника"]},"rog_kris":{"name":"Кривой коготь","chat":["кривой"]},"rog_twin":{"name":"Тихая лапка","chat":["лапка"]},"rog_viper":{"name":"Жало осы","chat":["жало"]},"mercury_fang":{"name":"Клык Мурркурия","chat":["мурркурия","клык"]},"nec_bone_wand":{"name":"Рыбий скелетик","chat":["скелетик"]},"nec_old_book":{"name":"Погрызенная книжка","chat":["книжка"]},"nec_skull_staff":{"name":"Посох с мышиным черепком","chat":["черепок"]},"nec_grimoire":{"name":"Гримуар девяти жизней","chat":["гримуар"]},"nec_crypt_staff":{"name":"Посох подвального кота","chat":["подвального"]},"nec_black_book":{"name":"Книга чёрного кота","chat":["чёрного","черного"]},"orcus_scepter":{"name":"Скипетр Мурка","chat":["скипетр"]},"pal_novice_mace":{"name":"Колотушка послушника","chat":["колотушка"]},"pal_mace":{"name":"Освящённая колотушка","chat":["освящённая","освященная"]},"pal_war_hammer":{"name":"Молоток кошачьего храма","chat":["молоток"]},"pal_sun_mace":{"name":"Булава солнечного зайчика","chat":["зайчика"]},"pal_guard_hammer":{"name":"Молот защитника миски","chat":["миски"]},"sol_hammer":{"name":"Молот Непобедимого Солнышка","chat":["солнышка"]},"dragon_scale":{"name":"Свитер из драконьей шерсти","chat":["свитер"]},"star_mantle":{"name":"Звёздный плед","chat":["плед"]},"triumph_galea":{"name":"Корона Котоцезаря","chat":["корона"]},"phoenix_tear":{"name":"Девятая жизнь","chat":["девятая жизнь","жизнь"]},"mars_horn":{"name":"Боевое мурчало","chat":["мурчало"]},"lucky_coin":{"name":"Блестящая пуговка","chat":["пуговка"]},"wolf_tooth":{"name":"Мышиный хвостик","chat":["хвостик"]},"clay_charm":{"name":"Колокольчик на ленте","chat":["колокольчик"]},"river_pearl":{"name":"Рыбья чешуйка","chat":["чешуйка"]},"iron_sword":{"name":"Вяленая вобла","chat":["вяленая"]},"sharp_gladius":{"name":"Острая рыбья кость","chat":["острая кость"]},"stiletto":{"name":"Острый коготок","chat":["острый коготок"]},"bearded_axe":{"name":"Стальная открывашка","chat":["стальная открывашка"]},"pilum":{"name":"Дразнилка с бубенцом","chat":["дразнилка с бубенцом"]},"flanged_mace":{"name":"Клубок мохера","chat":["мохер"]},"composite_bow":{"name":"Рогатка из вилки","chat":["вилка"]},"yew_bow":{"name":"Рогатка с резинкой","chat":["резинка"]},"oak_staff":{"name":"Указка с батарейкой","chat":["батарейка"]},"druid_crook":{"name":"Мышка на удочке","chat":["удочка"]},"silver_censer":{"name":"Серебряная валерьянка","chat":["серебряная"]},"iron_buckler":{"name":"Крышка от сметаны","chat":["крышка от сметаны"]},"oak_shield":{"name":"Миска с косточками","chat":["косточки"]},"veteran_scutum":{"name":"Когтеточка-ветеран","chat":["ветеран"]},"chainmail":{"name":"Свитер с узорами","chat":["узоры","узорами"]},"leather_armor":{"name":"Пушистая жилетка","chat":["жилетка"]},"adept_robe":{"name":"Плед с кисточками","chat":["кисточки"]},"iron_galea":{"name":"Шлем-кастрюлька","chat":["кастрюлька"]},"hunter_cap":{"name":"Кепка рыбака","chat":["кепка"]},"wizard_hat":{"name":"Колпак кота-колдуна","chat":["колпак"]},"legion_charm":{"name":"Бубенчик котолегиона","chat":["бубенчик котолегиона"]},"healer_beads":{"name":"Ошейник с мятой","chat":["ошейник с мятой"]},"legate_gladius":{"name":"Хребет осетра","chat":["хребет","осетр"]},"champion_mace":{"name":"Клубок чемпиона","chat":["клубок чемпиона"]},"warhammer":{"name":"Молоток-громыхалка","chat":["громыхалка"]},"triarius_hasta":{"name":"Дразнилка с перьями павлина","chat":["павлин","павлина"]},"assassin_dagger":{"name":"Коготь ночного кота","chat":["ночного"]},"retiarius_trident":{"name":"Расчёска-трезубец","chat":["трезубец"]},"barbarian_club":{"name":"Батон докторской","chat":["докторская","батон"]},"longbow":{"name":"Большая рогатка","chat":["большая рогатка"]},"sagittarius_bow":{"name":"Рогатка снайпера","chat":["снайпер","снайпера"]},"ember_staff":{"name":"Указка-уголёк","chat":["уголёк","уголек"]},"elder_crook":{"name":"Мышь-старейшина","chat":["мышь-старейшина"]},"gold_censer":{"name":"Золотая валерьянка","chat":["золотая валерьянка"]},"tower_shield":{"name":"Когтеточка-башня","chat":["башня"]},"hoplite_shield":{"name":"Бронзовая миска","chat":["бронзовая"]},"spiked_buckler":{"name":"Крышка с шипами","chat":["с шипами"]},"segmentata":{"name":"Свитер в полоску","chat":["полоску","полоска"]},"scale_armor":{"name":"Свитер-чешуя","chat":["чешуя"]},"stargazer_robe":{"name":"Плед звездочёта","chat":["звездочёт","звездочет"]},"crested_helm":{"name":"Шлем с хохолком","chat":["хохолок","хохолком"]},"horned_helm":{"name":"Шлем с рожками","chat":["рожки"]},"priest_tiara":{"name":"Нимб из мяты","chat":["нимб из мяты"]},"wolfpack_amulet":{"name":"Ошейник уличного кота","chat":["уличного"]},"frost_bead":{"name":"Льдинка на ленте","chat":["льдинка"]},"praetorian_spatha":{"name":"Королевская сёмга","chat":["сёмга","семга"]},"apollo_bow":{"name":"Солнечная рогатка","chat":["солнечная"]},"pontifex_censer":{"name":"Кадило кошачьего папы","chat":["папы","папа"]},"praetorian_armor":{"name":"Свитер преторианца","chat":["свитер преторианца"]},"golden_crown":{"name":"Корона с бантиком","chat":["корона"]},"quilted_jacket":{"name":"Стёганая жилетка","chat":["жилетка"]},"ranger_jacket":{"name":"Куртка кота-следопыта","chat":["куртка"]},"hunter_armor":{"name":"Доспех ловца мышей","chat":["доспех ловца","ловец"]},"novice_cassock":{"name":"Плед послушника","chat":["плед послушника"]},"archmage_robe":{"name":"Плед архикота","chat":["плед архикота","архикот"]},"archer_hood":{"name":"Капюшон с ушками","chat":["капюшон"]},"marksman_hood":{"name":"Берет кота-стрелка","chat":["берет"]},"novice_hat":{"name":"Колпачок котёнка","chat":["колпачок"]},"archer_charm":{"name":"Бубенчик стрелка","chat":["бубенчик стрелка"]},"sage_charm":{"name":"Бубенчик мудреца","chat":["бубенчик мудреца"]},"stone_charm":{"name":"Каменный бубенчик","chat":["каменный бубенчик"]},"scroll_revive":{"name":"Свиток 10-й жизни","chat":["свиток","жизни"]},"metamorph_seal":{"name":"Печать Мурморфозы","chat":["мурморфозы","печать мурморфозы"]},"enchant_star":{"name":"Звёздочка удачи","chat":["звёздочка","звездочка"]},"enchant_sphere":{"name":"Стеклянный шарик","chat":["шарик"]},"rog_jerkin":{"name":"Жилетка форточника","chat":["жилетка форточника"]},"rog_leathers":{"name":"Кожанка домушника","chat":["домушника"]},"rog_night_coat":{"name":"Плащ ночного кота","chat":["плащ ночного"]},"rog_shadow_cloak":{"name":"Тень чёрной кошки","chat":["тень"]},"rog_laverna_cloak":{"name":"Плащ Мурверны","chat":["плащ мурверны"]},"rog_hood":{"name":"Капюшон дворового","chat":["дворового"]},"rog_mask":{"name":"Маска енота","chat":["енота"]},"rog_cowl":{"name":"Ушки полуночника","chat":["полуночника","ушки"]},"rog_faceless":{"name":"Маска безусого","chat":["безусого"]},"rog_laverna_mask":{"name":"Маска Мурверны","chat":["маска мурверны"]},"rog_lockpick":{"name":"Скрепка на шнурке","chat":["скрепка"]},"rog_viper_vial":{"name":"Пузырёк гадюки","chat":["пузырёк","пузырек"]},"rog_cat_eye":{"name":"Глаз ночной Мурки","chat":["глаз","мурки"]},"nec_shroud":{"name":"Подвальный саван","chat":["саван"]},"nec_undertaker_robe":{"name":"Ряса Некромурра","chat":["ряса"]},"nec_bone_mantle":{"name":"Мантия из косточек","chat":["косточек"]},"nec_lich_robe":{"name":"Плед кота-лича","chat":["плед кота-лича"]},"nec_proserpina_mantle":{"name":"Мантия Прозермурры","chat":["прозермурры"]},"nec_hood":{"name":"Пыльный капюшон","chat":["пыльный"]},"nec_skull_hood":{"name":"Капюшон с черепком","chat":["капюшон с черепком"]},"nec_bone_crown":{"name":"Рыбий венец","chat":["рыбий венец"]},"nec_lich_crown":{"name":"Корона кота-лича","chat":["корона кота-лича"]},"nec_dis_crown":{"name":"Венец Дис Мяутера","chat":["мяутера"]},"nec_dead_finger":{"name":"Мышиная косточка","chat":["мышиная"]},"nec_soul_jar":{"name":"Баночка с душой","chat":["баночка"]},"nec_phylactery":{"name":"Шкатулка 9 жизней","chat":["шкатулка"]},"pal_cuirass":{"name":"Кираса котёнка","chat":["кираса"]},"pal_templar_plate":{"name":"Латы храма Мурр","chat":["латы храма"]},"pal_blessed_plate":{"name":"Латы с солнышком","chat":["латы с солнышком"]},"pal_dawn_plate":{"name":"Латы подоконника","chat":["подоконника"]},"pal_apollo_plate":{"name":"Доспех Аполмура","chat":["доспех аполмура"]},"pal_helm":{"name":"Шлем котёнка","chat":["шлем котёнка","шлем котенка"]},"pal_great_helm":{"name":"Шлем с ушками","chat":["шлем с ушками"]},"pal_winged_helm":{"name":"Шлем с крылышками","chat":["крылышками"]},"pal_halo_helm":{"name":"Шлем 9-й жизни","chat":["шлем 9-й"]},"pal_apollo_helm":{"name":"Шлем Аполмура","chat":["шлем аполмура"]},"pal_ladanka":{"name":"Ладанка с мятой","chat":["ладанка"]},"pal_sun_medal":{"name":"Медалька-солнышко","chat":["медалька"]},"pal_dawn_sign":{"name":"Бубенчик рассвета","chat":["бубенчик рассвета"]},"miner_helmet":{"name":"Каска с фонариком","chat":["каска","фонарик"]},"aurus_seal_5":{"name":"Печать Мурруса 5","chat":["мурруса","печать"]},"aurus_seal_6":{"name":"Печать Мурруса 6","chat":["мурруса","печать"]},"aurus_seal_7":{"name":"Печать Мурруса 7","chat":["мурруса","печать"]},"aurus_seal_8":{"name":"Печать Мурруса 8","chat":["мурруса","печать"]},"aurus_seal_9":{"name":"Печать Мурруса 9","chat":["мурруса","печать"]},"aurus_seal_10":{"name":"Печать Мурруса 10","chat":["мурруса","печать"]},"aurus_seal_11":{"name":"Печать Мурруса 11","chat":["мурруса","печать"]},"aurus_seal_12":{"name":"Печать Мурруса 12","chat":["мурруса","печать"]},"aurus_seal_13":{"name":"Печать Мурруса 13","chat":["мурруса","печать"]},"aurus_seal_14":{"name":"Печать Мурруса 14","chat":["мурруса","печать"]},"aurus_seal_15":{"name":"Печать Мурруса 15","chat":["мурруса","печать"]}},"roles":{"recruit":"Котёнок","legionary":"Котоармеец","archer":"Рогаточник","mage":"Кот-колдун","priest":"Мурлыка-жрец","rogue":"Кот-форточник","necromancer":"Некромурр","paladin":"Котопаладин"},"looks":{"shapes":{"bean":"Обычный котик","box":"Кот-коробка","ball":"Толстый пушистик","tall":"Длинный кот","ghost":"Кот-привидение","cone":"Кот-груша","egg":"Кот-батон"},"eyes":{"dots":"Сонные глазки","big":"Глаза-блюдца","happy":"Довольный прищур","cyclops":"Одноглазый мурзик","stars":"Глаза-звёздочки","jack":"Глаза Джека","void":"Пустые глазницы"},"mouths":{"open":"Мяу!","grin":"Чеширская улыбка","tongue":"Бе-бе язычок"},"hats":{"none":"Без шапки","tuft":"Вихор","cap":"Кепка с козырьком","bow":"Бантик на ушке","horns":"Рожки-чертёнок","crown":"Корона короля мышей","tophat":"Цилиндр котофея","party":"Праздничный колпак","wizard":"Шляпа кота-колдуна","antenna":"Усик-антенна","antenna2":"Две антенны","cat":"Ещё одни ушки","bunny":"Заячьи уши","halo":"Нимб мурлыки","sprout":"Росток кошачьей мяты","bandana":"Бандана кота-пирата","legion":"Шлем кото-легиона","laurel":"Венок из мяты","beret":"Берет кота-художника","headphones":"Наушники мурчания","cowboy":"Шляпа кота в сапогах","chef":"Колпак повара-рыбника","pumpkin":"Тыквенный котелок","witch":"Шляпа кошки-ведьмы","batears":"Уши летучей мыши","skull":"Черепок-шлем","reaper":"Капюшон Мурчащего жнеца","scarehat":"Шляпа огородного пугала"},"acc":{"bowtie":"Бабочка","tie":"Галстук кота-офисного","scarf":"Вязаный шарфик","glasses":"Очки кота-учёного","shades":"Очки крутого кота","monocle":"Монокль","mustache":"Пышные усищи","cape":"Плащ супер-кота","fangs":"Вампирские клычки","vampcape":"Плащ кота-вампира","candybag":"Ведёрко с вкусняшками","bolts":"Болты Котостейна","cobweb":"Паутинка на плече"},"auras":{"gold":"Сияние сметаны","sparks":"Искры статики","halo":"Святой нимб","shadow":"Чёрный кот","frost":"Холодный нос","wisps":"Блуждающие огоньки","bats":"Стайка нетопырей","jackglow":"Тыквенное мурчание","haunt":"Проклятый туман","leaves":"Осенний листопад"},"colors":{"#ff9fb2":"Розовый нос","#ffb27a":"Рыжик","#ffe27a":"Сливочный","#9fe39a":"Мятный","#7fd6e6":"Голубой русский","#8fb6ff":"Небесный","#b9a2ff":"Лавандовый","#e6e6ee":"Белый пушок","#ffc94d":"Золотистый","#5a5470":"Серый дымчатый","#ff8a1f":"Рыжий тыквенный","#9fffd0":"Призрачный","#7b3fe4":"Ведьмин"}},"places":{"camp":{"name":"Кошачий привал","sub":"лагерь новобранцев Легиона"}}});

if (window.MDDoodle && window.MDDoodle.use) window.MDDoodle.use("cats");
