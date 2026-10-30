/* 29.10 (Шахта 3.0, шаг 2, флаг mine3): большой нелинейный этаж на сайте - этаж из вида шахты (только видимое), сцена кусками,
   туман, зал лифта, мини-карта. Грузит mine.js, когда вид шахты - этаж v3 (st.fl.v3); прежний этаж 7 × 12 рисует, как раньше, craftworld.

   Нагрузка (ТЗ «Шахта 3.0»: сайт не грузит ПК и телефоны зрителей):
   • этаж печётся кусками по «экрану» (8 × 6 клеток, minegen3 SCR): каждый кусок - свой <svg>; рисуются только куски в кадре и рядом
     (ensure - на смену камеры, по кадру браузера, без таймеров); выкопали камень - перерисовываются только куски, где что-то поменялось
     (ключ куска - вид его клеток: выкопано / видно / фронт / темно);
   • рисунки камней - символы mine-art.js (<symbol> + <use>), символы - в одном общем скрытом <svg> (каждый - один раз на страницу);
   • туман - в каждом куске один путь тьмы и один путь кромки, без filter; искры жил на краю тумана - статичные;
   • мини-карта - маленький SVG, перерисовывается вместе со сценой.
   window.LGMine3: { floorOf(st), scene(S) → { update(F, o) → Wd, ensure(), minimap(F, me) } } */
(function () {
  'use strict';
  const SCR = { w: 8, h: 6 }, INK = '#15122e';
  const f1 = (v) => Math.round(v * 10) / 10;
  const rngOf = (seed) => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const OPEN = new Set(['lift', 'void', 'shaft']);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /** Этаж из вида шахты: клетки - только видимые (остальное - туман: t 'fog'). */
  function floorOf(st) {
    const fl = st && st.fl; if (!fl || !fl.v3) return null;
    const N = fl.w * fl.h, cells = new Array(N), vis = new Uint8Array(N);
    for (let i = 0; i < N; i++) cells[i] = { t: 'fog', k: 0, lv: 0, r: null, a: 0 };
    for (const c of fl.c || []) { const [i, t, lv, r, a, vein, hall] = c; if (!(i >= 0 && i < N)) continue; cells[i] = { t, lv, r: r || null, a, k: OPEN.has(t) || t === 'wall' ? 0 : 1, ...(vein >= 0 ? { vein } : {}), ...(hall >= 0 ? { hall } : {}) }; vis[i] = 1; }
    return { v3: 1, n: st.n, craft: 'mine', biome: st.biome || 'mount', danger: st.danger || 1, gem: st.gem || null, w: fl.w, h: fl.h, lift: fl.lift, hallBox: fl.hallBox, fog: fl.fog || 2,
      shaft: fl.shaft != null ? fl.shaft : -1, veins: fl.veins || [], halls: fl.halls || [], cells, vis, done: false,
      drills: new Map((st.drills || []).map((d) => [d[2], { k: d[0], st: d[3], lv: d[4], r: d[11] }])) };   // 29.10 (шаг 4): буровые - клетка → { ключ, стадия, уровень, руда }
  }

  /* ---------- зал лифта: клеть лифта, Снабженец (прилавок с касками и кирками), скупщик (прилавок «СКУПКА»), доска поручений ---------- */
  function hallArt(G, T, o) {
    const [hx, hy] = G.hall, O = (w) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const out = [];
    // клеть лифта: копёр из двух стоек, шкив, клеть на тросе, вывеска «ЛИФТ»
    { const cx = hx + 256, b = hy + 164, t = hy + 40;
      let g = `<ellipse cx="${cx}" cy="${b + 4}" rx="80" ry="12" fill="#000" fill-opacity=".35"/>`;
      g += `<path d="M${cx - 58} ${b} V${t + 12} M${cx + 58} ${b} V${t + 12}" stroke="${INK}" stroke-width="16"/><path d="M${cx - 58} ${b} V${t + 12} M${cx + 58} ${b} V${t + 12}" stroke="#8a6a44" stroke-width="9"/>`;
      g += `<path d="M${cx - 74} ${t + 14} H${cx + 74}" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M${cx - 74} ${t + 14} H${cx + 74}" stroke="#a07a4a" stroke-width="10" stroke-linecap="round"/>`;
      g += `<circle cx="${cx}" cy="${t + 14}" r="15" fill="#c9ccd6" ${O(5)}/><path d="M${cx} ${t + 29} V${t + 58}" stroke="${INK}" stroke-width="4"/>`;
      g += `<rect x="${cx - 42}" y="${t + 58}" width="84" height="${b - t - 66}" rx="8" fill="#5a4a3a" ${O(5)}/><path d="M${cx - 42} ${t + 88} h84 M${cx - 42} ${t + 112} h84 M${cx} ${t + 58} v${b - t - 66}" stroke="${INK}" stroke-width="3" opacity=".55"/>`;
      g += `<rect x="${cx - 62}" y="${t - 30}" width="124" height="36" rx="8" fill="#2e5a2a" ${O(4)}/><text x="${cx}" y="${t - 5}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="20" fill="#e8ffd8">ЛИФТ</text>`;
      // 29.10 (шаг 3-4, рисунки): стадии лифта - сбор (вывеска с полосой), улучшение (леса и колесо крутится), этажей открыто - табличка
      const L = o.lift || {};
      if (L.st === 'fund') { const p = L.need ? Math.min(1, L.c / L.need) : 0; g += `<rect x="${cx - 50}" y="${t + 8 + 30}" width="100" height="12" rx="6" fill="#2a2030" ${O(3)}/><rect x="${cx - 48}" y="${t + 40}" width="${f1(96 * p)}" height="8" rx="4" fill="#f4c74e"/>`; }
      if (L.st === 'up') {
        g += `<path d="M${cx - 92} ${b} V${t - 6} M${cx + 92} ${b} V${t - 6} M${cx - 92} ${t + 40} H${cx + 92} M${cx - 92} ${t + 100} H${cx + 92} M${cx - 92} ${b} L${cx + 92} ${t + 40}" ${O(7)}/><path d="M${cx - 92} ${b} V${t - 6} M${cx + 92} ${b} V${t - 6} M${cx - 92} ${t + 40} H${cx + 92} M${cx - 92} ${t + 100} H${cx + 92}" stroke="#c49a62" stroke-width="3"/>`;
        g += `<g class="mn-wheel" style="transform-origin:${cx + 92}px ${t + 40}px"><circle cx="${cx + 92}" cy="${t + 40}" r="16" fill="#c9ccd6" ${O(4)}/><path d="M${cx + 76} ${t + 40}h32M${cx + 92} ${t + 24}v32" ${O(3)}/></g>`;
      }
      if (L.deep > 1) g += `<rect x="${cx - 26}" y="${b - 30}" width="52" height="22" rx="5" fill="#f3efd8" ${O(3)}/><text x="${cx}" y="${b - 14}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="13" fill="${INK}">1-${L.deep}</text>`;
      out.push({ obj: 'lift', x: cx, y: b, svg: g }); }
    // Снабженец: прилавок с касками и кирками, два фонаря
    if (o.lampMan) { const x0 = hx + 20, x1 = hx + 150, b = hy + 150;
      let g = `<ellipse cx="${(x0 + x1) / 2}" cy="${b + 3}" rx="72" ry="10" fill="#000" fill-opacity=".3"/><rect x="${x0}" y="${b - 46}" width="${x1 - x0}" height="46" rx="5" fill="#a0703a" ${O(4)}/><path d="M${x0 + 4} ${b - 30} H${x1 - 4} M${x0 + 4} ${b - 14} H${x1 - 4}" stroke="#6b4423" stroke-width="2.5" opacity=".6"/>`;
      g += [x0 + 30, x0 + 70].map((x) => `<path d="M${x - 16} ${b - 46} q16 -26 32 0 Z" fill="#ffcf3a" ${O(2.5)}/><circle cx="${x}" cy="${b - 58}" r="5" fill="#fff6c8" ${O(1.5)}/>`).join('');
      g += `<g transform="translate(${x1 - 22} ${b - 54}) rotate(-30)"><rect x="-3" y="-30" width="6" height="40" rx="2" fill="#6b4423" ${O(2.5)}/><path d="M-20 -30 Q0 -44 20 -30 Q0 -36 -20 -30 Z" fill="#9a9aa6" ${O(2.5)}/></g>`;
      g += [x0 - 2, x1 + 2].map((x) => `<path d="M${x} ${b - 46} V${b - 110}" stroke="${INK}" stroke-width="6"/><circle cx="${x}" cy="${b - 118}" r="30" fill="url(#mnaGlow)"/><path d="M${x - 9} ${b - 128} h18 l-3 20 h-12 Z" fill="${T.lc || '#ffd27a'}" ${O(2.5)}/>`).join('');
      out.push({ obj: 'lamp', x: (x0 + x1) / 2, y: b, svg: g }); }
    // скупщик: навес и прилавок, весы, мешок руды
    { const x0 = hx + 20, x1 = hx + 176, b = hy + 340;
      let g = `<ellipse cx="${(x0 + x1) / 2}" cy="${b + 3}" rx="86" ry="10" fill="#000" fill-opacity=".3"/>`;
      g += `<path d="M${x0 + 6} ${b - 50} V${b - 128} M${x1 - 6} ${b - 50} V${b - 128}" stroke="#6b4423" stroke-width="8"/><path d="M${x0 - 10} ${b - 128} H${x1 + 10} L${x1 - 4} ${b - 104} H${x0 + 4} Z" fill="#b5533c" ${O(4)}/>`;
      g += `<rect x="${x0}" y="${b - 52}" width="${x1 - x0}" height="52" rx="5" fill="#a0703a" ${O(4)}/><rect x="${x0 + 30}" y="${b - 44}" width="${x1 - x0 - 60}" height="22" rx="4" fill="#5a3a1e"/><text x="${(x0 + x1) / 2}" y="${b - 27}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="15" fill="#fff3c8">СКУПКА</text>`;
      g += `<path d="M${x1 - 30} ${b - 52} V${b - 84} M${x1 - 50} ${b - 84} H${x1 - 10}" stroke="${INK}" stroke-width="3"/><path d="M${x1 - 56} ${b - 84} l6 12 h12 l6 -12 M${x1 - 16} ${b - 84} l6 12 h12 l6 -12" fill="#c9ccd6" ${O(2)}/>`;
      g += `<path d="M${x0 + 4} ${b} q-6 -40 10 -50 q-6 -10 6 -12 h26 q12 2 6 12 q16 10 10 50 Z" fill="#d9c08a" ${O(3)}/>`;
      out.push({ obj: 'buyer', x: (x0 + x1) / 2, y: b, svg: g }); }
    // доска поручений: два столба, козырёк, листки
    { const x0 = hx + 356, x1 = hx + 492, b = hy + 346;
      let g = `<path d="M${x0 + 16} ${b} V${b - 120} M${x1 - 16} ${b} V${b - 120}" stroke="#6b4423" stroke-width="9"/><path d="M${x0 - 8} ${b - 118} L${(x0 + x1) / 2} ${b - 146} L${x1 + 8} ${b - 118} Z" fill="#7a4a2a" ${O(4)}/>`;
      g += `<rect x="${x0}" y="${b - 114}" width="${x1 - x0}" height="70" rx="5" fill="#c49a62" ${O(4)}/>` + [[x0 + 10, -6], [x0 + 52, 4], [x0 + 94, -3]].map(([x, r]) => `<g transform="rotate(${r} ${x + 16} ${b - 106})"><rect x="${x}" y="${b - 106}" width="32" height="40" fill="#fff3c8" ${O(2.5)}/><path d="M${x + 6} ${b - 94} h20 M${x + 6} ${b - 84} h14" stroke="${INK}" stroke-width="2" opacity=".45"/></g>`).join('');
      g += `<text x="${(x0 + x1) / 2}" y="${b - 24}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="13" fill="#fff3c8" stroke="${INK}" stroke-width="3" paint-order="stroke">ПОРУЧЕНИЯ</text>`;
      out.push({ obj: 'board', x: (x0 + x1) / 2, y: b, svg: g }); }
    const fp = (k) => G.FOOT.find((f) => f.k === k);
    const nb = fp('npcBuy'), nl = fp('npcLamp');
    return { props: out, npc: { x: (nb.r[0] + nb.r[2]) / 2, y: nb.r[3], name: 'Скупщик Гром' }, lampNpc: o.lampMan ? { x: (nl.r[0] + nl.r[2]) / 2, y: nl.r[3], name: 'Фонарщик' } : null };
  }

  /* ---------- 29.10 (шаг 4): буровая - площадка (колышки), стройка (леса), ур. 1 (деревянная вышка), ур. 2 (железная, с колесом),
     ур. 3 (большая, с фонарём и лентой), иссякла (серая). Плоские тона, светлый верх, тень снизу, толстая обводка; движение - только
     transform (бур ходит вверх-вниз, колесо крутится), без filter. ---------- */
  function drillArt(x, b, d, ore) {
    const O = (w) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`, sh = `<ellipse cx="${x}" cy="${b}" rx="62" ry="14" fill="#000" opacity=".25"/>`;
    if (d.st === 'site' || (d.st === 'build' && d.lv === 0)) {
      let g = sh + `<path d="M${x - 50} ${b - 6}h100l-10 -26h-80Z" fill="#8a6a44" opacity=".55"/><path d="M${x - 50} ${b - 6}h100l-10 -26h-80Z" fill="none" ${O(3)} stroke-dasharray="8 6"/>`;
      for (const dx of [-46, 46]) g += `<path d="M${x + dx} ${b - 4}v-34" ${O(7)}/><path d="M${x + dx} ${b - 4}v-34" stroke="#c49a62" stroke-width="3"/>`;
      g += `<path d="M${x + 46} ${b - 38}l26 8l-26 8Z" fill="#ffd27a" ${O(3)}/>`;
      if (d.st === 'build') g += `<path d="M${x - 40} ${b - 6}V${b - 96}M${x + 40} ${b - 6}V${b - 96}M${x - 40} ${b - 50}H${x + 40}M${x - 40} ${b - 96}H${x + 40}M${x - 40} ${b - 6}L${x + 40} ${b - 50}" ${O(6)}/><path d="M${x - 40} ${b - 6}V${b - 96}M${x + 40} ${b - 6}V${b - 96}M${x - 40} ${b - 50}H${x + 40}M${x - 40} ${b - 96}H${x + 40}" stroke="#c49a62" stroke-width="3"/>`;
      return g;
    }
    const lv = Math.max(1, d.lv), dry = d.st === 'dry', H = 96 + lv * 26, wood = dry ? '#8d8a86' : lv === 1 ? '#a87a4a' : '#7d8ba0', light = dry ? '#b5b2ad' : lv === 1 ? '#d2a066' : '#a9b6c8';
    let g = sh + `<path d="M${x - 44} ${b - 2}L${x - 12} ${b - H}H${x + 12}L${x + 44} ${b - 2}Z" fill="${wood}" ${O(5)}/><path d="M${x - 30} ${b - 40}H${x + 30}M${x - 22} ${b - 76}H${x + 22}${lv >= 2 ? `M${x - 16} ${b - 108}H${x + 16}` : ''}" ${O(4)}/>`
      + `<path d="M${x - 12} ${b - H}H${x + 12}l-4 10h-16Z" fill="${light}" ${O(4)}/>`;
    // бур (ходит вверх-вниз) и пол-вышки
    g += `<g class="${dry ? '' : 'mn-bit'}"><path d="M${x} ${b - H + 10}V${b - 14}" stroke="#4a4a52" stroke-width="7"/><path d="M${x - 8} ${b - 20}h16l-8 16Z" fill="#d8d8e0" ${O(3)}/></g>`;
    if (lv >= 2) g += `<g class="${dry ? '' : 'mn-wheel'}" style="transform-origin:${x + 30}px ${b - 24}px"><circle cx="${x + 30}" cy="${b - 24}" r="16" fill="${light}" ${O(4)}/><path d="M${x + 14} ${b - 24}h32M${x + 30} ${b - 40}v32" ${O(3)}/></g>`;
    if (lv >= 3) g += `<path d="M${x - 70} ${b - 6}h40v-18h-40Z" fill="#6b5a46" ${O(4)}/><circle cx="${x - 64}" cy="${b - 28}" r="8" fill="${ore}" ${O(3)}/><circle cx="${x - 46}" cy="${b - 30}" r="8" fill="${ore}" ${O(3)}/><circle cx="${x}" cy="${b - H - 10}" r="9" fill="#ffd27a" ${O(3)}/>`;
    g += `<text x="${x}" y="${b + 22}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="14" fill="${dry ? '#cfcac2' : '#ffe08a'}" stroke="${INK}" stroke-width="3" paint-order="stroke">${dry ? 'иссякла' : 'ур. ' + lv}</text>`;
    return g;
  }

  /* ---------- сцена ---------- */
  function scene(S) {
    const A = () => window.LGMineArt, Bm = () => window.LGMineBiome;
    const root = document.createElement('div'); root.className = 'mn3';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); defs.setAttribute('class', 'mna-defs'); defs.setAttribute('aria-hidden', 'true'); root.appendChild(defs);
    const SYMS = new Set(); let baseDefs = false;
    const CH = new Map();   // ключ куска "cx,cy" → { el, key, built }
    let F = null, G = null, o = {}, T = null, PAL = null, rk = {}, baseRes = 'stone', TK = '';
    function addDefs(svg) {
      const a = A(); if (!a) return;
      if (!baseDefs) { baseDefs = true; defs.insertAdjacentHTML('beforeend', a.defs([]).replace(/^<defs>|<\/defs>$/g, '')); }
      let add = '';
      for (const m of svg.matchAll(/href="#(mr[bogcwe]-[^"]+)"/g)) if (!SYMS.has(m[1])) { SYMS.add(m[1]); add += (a.SYM && a.SYM.get(m[1])) || ''; }
      if (add) defs.insertAdjacentHTML('beforeend', add);
    }
    // вид клетки для ключа куска: туман / открыто / камень (выкопан, фронт)
    const cellKey = (i) => { if (!F.vis[i]) return F.rim && F.rim[i] ? 'r' : '.'; const dr = F.drills && F.drills.get(i); if (dr) return 'B' + dr.st[0] + dr.lv; if (o.dug[i]) return 'd'; const c = F.cells[i]; return c.t[0] + (o.front.has(i) ? 'f' : ''); };
    function chunkKey(cx, cy) {
      let k = o.dark ? 'D' : ''; const x0 = cx * SCR.w, y0 = cy * SCR.h;
      for (let y = y0 - 1; y < Math.min(F.h, y0 + SCR.h + 1); y++) { if (y < 0) continue; for (let x = Math.max(0, x0 - 1); x < Math.min(F.w, x0 + SCR.w + 1); x++) k += cellKey(y * F.w + x); }
      return k;
    }
    // рисунок камня клетки i (кэш по виду - он не меняется за этаж)
    const ROCK = new Map();
    function rockSvg(i) {
      const c = F.cells[i], k = `${F.n}|${i}|${c.t}|${c.r}|${c.lv}`; let s = ROCK.get(k); if (s != null) return s;
      const a = A(), p = G.cellXY(i), r = rngOf(i * 131 + F.n * 977), sc = 1 + Math.max(0, (c.lv || F.n) - F.n) * 0.1 + (c.t === 'hard' ? 0.05 : 0);
      const pal = (c.t === 'hard' ? PAL.hard : PAL.rock) || PAL.rock;
      if (c.t === 'wall') s = a.wall(p.x, p.y, [PAL.wall || T.wall, T.wallL], r);
      else if (c.t === 'chest' || c.t === 'prize') s = a.chest(p.x, p.y, sc, pal, r) + (c.t === 'prize' ? `<path d="M${p.x} ${p.y - 150} l8 18 l20 2 l-15 13 l5 20 l-18 -10 l-18 10 l5 -20 l-15 -13 l20 -2 Z" fill="#ffd27a" stroke="${INK}" stroke-width="3"/>` : '');
      else { const gem = c.t === 'rare' && F.gem && c.r === F.gem; s = (gem ? `<ellipse cx="${p.x}" cy="${f1(p.y - 50)}" rx="58" ry="50" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 10" stroke-opacity=".7"/>` : '') + a.rock({ ...c, b: baseRes }, 'boulder', p.x, p.y, sc, pal, r) + (c.t === 'ore' || c.t === 'rare' ? a.ore(c.r, p.x, p.y, sc * (gem ? 1.12 : 1), r, c.t === 'rare', gem) : ''); }
      if (ROCK.size > 1500) ROCK.clear();
      ROCK.set(k, s); return s;
    }
    /* 29.10 (стример: «каждый этаж больше похож на пещеры»): порода - сплошная толща, проходы - пол со скруглёнными краями (пятна вокруг
       открытых клеток сливаются в одну пещеру), обводка, тень у стены сверху, сталактиты над проходом, сталагмиты и камешки на полу.
       Камни, которые можно копать (фронт), - валуны у края прохода; глубже в толще - только прожилки руды. Скалы - темнее, без прожилок.
       Слой пола - свой SVG куска с обрезкой по куску (пятна соседних клеток рисуются и тут - стык незаметен); валуны - слой выше. */
    const isOpen = (i) => !!(o.dug[i] || OPEN.has(F.cells[i].t));
    /* 29.10 (стример: «полукруглые края смотрятся не очень»): край прохода и тумана - контур плавного поля (marching squares, шаг 32 px):
       каждая клетка даёт «холм» радиусом R, холмы соседей сливаются в ровную стену; шум поля (решётка 64 px) делает край каменистым,
       но без полукругов. Поле - от глобальной сетки: у соседних кусков стык совпадает. fill - многоугольники квадратов, line - край. */
    const SQ = 32;
    function noise2(x, y) {   // гладкий шум 0…1 (билинейный по решётке 64 px)
      const gx = x / 64, gy = y / 64, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, h = (a, b) => { let t = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ (F.n * 83492791)) >>> 0; t = Math.imul(t ^ (t >>> 13), 0x5bd1e995); return ((t ^ (t >>> 15)) >>> 0) / 4294967296; };
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
    function fieldAt(x, y, inCell, R, amp) {
      const CWp = G.CW, RHp = G.RH, cx = Math.floor((x - G.X0) / CWp), cy = Math.floor((y - G.Y0) / RHp); let v = 0;
      for (let yy = cy - 2; yy <= cy + 2; yy++) for (let xx = cx - 2; xx <= cx + 2; xx++) {
        if (xx < 0 || yy < 0 || xx >= F.w || yy >= F.h || !inCell(yy * F.w + xx)) continue;
        const dx = (x - (G.X0 + (xx + 0.5) * CWp)) / R, dy = (y - (G.Y0 + (yy + 0.5) * RHp)) / R, q = 1 - dx * dx - dy * dy; if (q > 0) v += q * q;
      }
      return Math.min(v, 1.1) + ((noise2(x, y) - 0.5) + (noise2(x * 2.7 + 311, y * 2.7 + 97) - 0.5) * 0.6) * amp;   // два слоя шума: крупные выступы и мелкая щербатость
    }
    function contour(x0, y0, x1, y1, inCell, thr, R, amp, m = 2) {
      const CWp = G.CW, RHp = G.RH, X0 = G.X0 + x0 * CWp - SQ * m, Y0 = G.Y0 + y0 * RHp - SQ * m, NX = Math.ceil(((x1 - x0) * CWp + SQ * 2 * m) / SQ), NY = Math.ceil(((y1 - y0) * RHp + SQ * 2 * m) / SQ);
      const val = new Float32Array((NX + 1) * (NY + 1));
      for (let j = 0; j <= NY; j++) for (let k = 0; k <= NX; k++) val[j * (NX + 1) + k] = fieldAt(X0 + k * SQ, Y0 + j * SQ, inCell, R, amp);
      let fill = '', line = '';
      const P = (x, y) => `${f1(x)} ${f1(y)}`;
      for (let j = 0; j < NY; j++) for (let k = 0; k < NX; k++) {
        const x = X0 + k * SQ, y = Y0 + j * SQ, v = [val[j * (NX + 1) + k], val[j * (NX + 1) + k + 1], val[(j + 1) * (NX + 1) + k + 1], val[(j + 1) * (NX + 1) + k]];
        const c = [[x, y], [x + SQ, y], [x + SQ, y + SQ], [x, y + SQ]], ins = v.map((a) => a >= thr), n = ins.filter(Boolean).length;
        if (!n) continue;
        if (n === 4) { fill += `M${P(x, y)}h${SQ}v${SQ}h${-SQ}Z`; continue; }
        const pts = [], cr = [];
        for (let e = 0; e < 4; e++) {
          const a = e, b = (e + 1) % 4;
          if (ins[a]) pts.push(c[a]);
          if (ins[a] !== ins[b]) { const t = (thr - v[a]) / (v[b] - v[a]), q = [c[a][0] + (c[b][0] - c[a][0]) * t, c[a][1] + (c[b][1] - c[a][1]) * t]; pts.push(q); cr.push(q); }
        }
        fill += 'M' + pts.map((q) => P(q[0], q[1])).join('L') + 'Z';
        if (cr.length === 2) line += `M${P(cr[0][0], cr[0][1])}L${P(cr[1][0], cr[1][1])}`;
        else if (cr.length === 4) line += `M${P(cr[0][0], cr[0][1])}L${P(cr[1][0], cr[1][1])}M${P(cr[2][0], cr[2][1])}L${P(cr[3][0], cr[3][1])}`;
      }
      return { fill, line };
    }
    // пол: край (толстая обводка), тень у стены (тёмный пол), середина светлее (второй контур, сдвинут вниз - тень сверху)
    function floorSvg(x0, y0, x1, y1) {
      const op = (i) => F.vis[i] && isOpen(i), A0 = contour(x0, y0, x1, y1, op, 0.45, 150, 0.7);
      if (!A0.fill) return '';
      const B0 = contour(x0, y0, x1, y1, op, 0.8, 150, 0.25);
      return `<path d="${A0.fill}" fill="${T.floorD}"/><g transform="translate(0 10)"><path d="${B0.fill}" fill="${T.floor}"/></g><path d="${A0.line}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const opF = (i) => F.vis[i] && isOpen(i);
    // подземное озеро: клетки зала-озера (кроме награды) - одним контуром, как край пещеры; светлые блики сверху
    function lakeSvg(x0, y0, x1, y1, shine) {
      const lk = (i) => { const c = F.cells[i]; if (!F.vis[i] || c.hall == null || c.t === 'prize') return false; const h = F.halls.find((q) => q[0] === c.hall); return !!h && h[1] === 'lake'; };
      const A1 = contour(x0, y0, x1, y1, lk, 0.6, 130, 0.3); if (!A1.fill) return '';
      const B1 = contour(x0, y0, x1, y1, lk, 0.95, 120, 0.3);
      return `<path d="${A1.fill}" fill="#2f6f9e"/><path d="${B1.fill}" fill="#3f8cc2"/><path d="${A1.line}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="${shine}" fill="none" stroke="#9fd8f2" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
    }
    function ground(x0, y0, x1, y1) {
      const CWp = G.CW, RHp = G.RH; let edge = '', base = '', lit = '', tex = '', deco = '', drip = '', stones = '', shine = '', lake = '', lakeL = '', cryst = '', beams = '', lakeOn = false;
      const blobP = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 1 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 1 ${f1(-2 * rx)} 0Z`;
      const blob = (cx, cy, r) => `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(r)} 0 1 1 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 1 ${f1(-2 * r)} 0Z`;
      for (let y = Math.max(0, y0 - 1); y < Math.min(F.h, y1 + 1); y++) for (let x = Math.max(0, x0 - 1); x < Math.min(F.w, x1 + 1); x++) {
        const i = y * F.w + x, c = F.cells[i], px = G.X0 + x * CWp, py = G.Y0 + y * RHp, cx = px + CWp / 2, cy = py + RHp / 2, r = rngOf(i * 613 + F.n * 31);
        if (!F.vis[i]) continue;
        if (isOpen(i)) {
          // сталактиты: над проходом толща
          if (y > 0 && !isOpen(i - F.w) && c.t !== 'lift') { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const sx = px + 22 + r() * (CWp - 44), h = 22 + r() * 20, w = 6 + r() * 6; let sy = -1; for (let yy = py - 60; yy < py + 50; yy += 6) if (fieldAt(sx, yy, opF, 150, 0.7) >= 0.45) { sy = yy - 8; break; } if (sy < 0) continue; drip += `M${f1(sx - w)} ${f1(sy)}L${f1(sx)} ${f1(sy + h)}L${f1(sx + w)} ${f1(sy)}Z`; } }
          // 29.10 (рисунки): особые залы - грот (кристаллы), подземное озеро (вода), старая штольня (крепь)
          if (c.hall != null && c.t !== 'prize') { const hk = (F.halls.find((h) => h[0] === c.hall) || [])[1];
            if (hk === 'lake') { lakeOn = true; if (r() < 0.6) lakeL += `M${f1(cx - 26 + (r() - 0.5) * 30)} ${f1(cy - 4 + (r() - 0.5) * 30)}q26 -10 52 0`; continue; }   // вода - одним контуром (ниже); камешков на воде нет
            else if (hk === 'grotto') for (let q = 0; q < 3; q++) { const gx = cx + (r() - 0.5) * 90, gy = cy + 10 + (r() - 0.5) * 60, hh = 30 + r() * 34; cryst += `M${f1(gx - 9)} ${f1(gy)}L${f1(gx - 4)} ${f1(gy - hh)}L${f1(gx + 2)} ${f1(gy - hh - 6)}L${f1(gx + 9)} ${f1(gy)}Z M${f1(gx + 6)} ${f1(gy)}L${f1(gx + 12)} ${f1(gy - hh * 0.6)}L${f1(gx + 18)} ${f1(gy)}Z`; }
            else if (hk === 'adit' && x % 2 === 0) beams += `M${px + 18} ${py + RHp - 6}V${py + 8}M${px + CWp - 18} ${py + RHp - 6}V${py + 8}M${px + 8} ${py + 12}H${px + CWp - 8}`;
          }
          // пол: камешки, изредка сталагмит у стены
          if (c.t !== 'lift' && c.t !== 'shaft') {
            for (let q = 0; q < 2; q++) if (r() < 0.5) deco += `<ellipse cx="${f1(cx + (r() - 0.5) * 80)}" cy="${f1(cy + (r() - 0.3) * 50)}" rx="${f1(6 + r() * 8)}" ry="${f1(3 + r() * 4)}" fill="${r() < 0.5 ? T.floorD : T.floorL}"/>`;
            const wallNb = [i - 1, i + 1].some((j) => j >= 0 && j < F.cells.length && Math.floor(j / F.w) === y && !isOpen(j));
            if (wallNb && r() < 0.28) { const side = r() < 0.5 ? -1 : 1, sx = cx + side * 40, sy = cy + 30, h = 26 + r() * 22; if (!(fieldAt(sx, sy, opF, 150, 0.7) >= 0.6 && fieldAt(sx + side * 46, sy, opF, 150, 0.7) < 0.45)) continue; deco += `<path d="M${f1(sx - 12)} ${f1(sy)}Q${f1(sx - 3)} ${f1(sy - h * 0.6)} ${f1(sx)} ${f1(sy - h)}Q${f1(sx + 3)} ${f1(sy - h * 0.6)} ${f1(sx + 12)} ${f1(sy)}Z" fill="${T.wallL}" stroke="${INK}" stroke-width="3"/>`; }
          }
        } else {
          // толща: трещины и светлые сколы; в камнях руды - прожилки (видно, куда копать); скалы - темнее
          const wl = c.t === 'wall';
          if (wl) tex += `<path d="${blob(cx + (r() - 0.5) * 30, cy + (r() - 0.5) * 30, 52 + r() * 16)}${blob(cx + (r() - 0.5) * 60, cy + (r() - 0.5) * 50, 34 + r() * 14)}" fill="${T.wallD}" opacity=".5"/>`;   // скала - тёмные пятна, не клетка
          // порода, которую можно копать, - кладка из крупных камней (светлый верх); скала - сплошная тёмная
          if (!wl) for (let k = 0; k < 3; k++) { const sx = px + 20 + ((k % 2) * 52) + r() * 34, sy = py + 22 + (k * 34) + r() * 14, rw = 22 + r() * 14, rh = 16 + r() * 10;
            stones += `M${f1(sx - rw)} ${f1(sy)}Q${f1(sx - rw)} ${f1(sy - rh)} ${f1(sx)} ${f1(sy - rh)}Q${f1(sx + rw)} ${f1(sy - rh)} ${f1(sx + rw)} ${f1(sy)}Q${f1(sx + rw)} ${f1(sy + rh)} ${f1(sx)} ${f1(sy + rh)}Q${f1(sx - rw)} ${f1(sy + rh)} ${f1(sx - rw)} ${f1(sy)}Z`;
            shine += `M${f1(sx - rw * 0.6)} ${f1(sy - rh * 0.35)}Q${f1(sx)} ${f1(sy - rh * 0.95)} ${f1(sx + rw * 0.6)} ${f1(sy - rh * 0.35)}`; }
          if (!wl && c.r && (c.t === 'ore' || c.t === 'rare')) { const col = (A() && A().ORE && A().ORE[c.r]) ? A().ORE[c.r][0] : '#ffd27a'; for (let k = 0; k < (c.t === 'rare' ? 4 : 3); k++) { const sx = px + 26 + r() * 76, sy = py + 26 + r() * 70; tex += `<path d="M${f1(sx)} ${f1(sy - 7)}l6 7l-6 7l-6 -7Z" fill="${col}" stroke="${INK}" stroke-width="2"/>`; } }
        }
      }
      /* 30.10 (стример: «сверху и снизу ровные бурые полосы»): поле вокруг этажа (PAD клеток) раньше было плоской заливкой цвета породы.
         Теперь - та же кладка из камней, что в толще, и поверх - тёмная пелена (за краем этажа - глухая порода, ближе к туману). Один раз на кусок, без filter. */
      let padD = '';
      for (let y = Math.max(-G.PAD, y0 - 1); y < Math.min(F.h + G.PAD, y1 + 1); y++) for (let x = Math.max(-G.PAD, x0 - 1); x < Math.min(F.w + G.PAD, x1 + 1); x++) {
        if (x >= 0 && y >= 0 && x < F.w && y < F.h) continue;
        const px = G.X0 + x * CWp, py = G.Y0 + y * RHp, r = rngOf(((y + 9) * 977 + (x + 9)) * 613 + F.n * 31);
        padD += `M${px} ${py}h${CWp}v${RHp}h${-CWp}Z`;
        for (let k = 0; k < 3; k++) { const sx = px + 20 + ((k % 2) * 52) + r() * 34, sy = py + 22 + (k * 34) + r() * 14, rw = 22 + r() * 14, rh = 16 + r() * 10;
          stones += `M${f1(sx - rw)} ${f1(sy)}Q${f1(sx - rw)} ${f1(sy - rh)} ${f1(sx)} ${f1(sy - rh)}Q${f1(sx + rw)} ${f1(sy - rh)} ${f1(sx + rw)} ${f1(sy)}Q${f1(sx + rw)} ${f1(sy + rh)} ${f1(sx)} ${f1(sy + rh)}Q${f1(sx - rw)} ${f1(sy + rh)} ${f1(sx - rw)} ${f1(sy)}Z`;
          shine += `M${f1(sx - rw * 0.6)} ${f1(sy - rh * 0.35)}Q${f1(sx)} ${f1(sy - rh * 0.95)} ${f1(sx + rw * 0.6)} ${f1(sy - rh * 0.35)}`; }
      }
      return `<rect x="${G.X0 + x0 * CWp - 300}" y="${G.Y0 + y0 * RHp - 300}" width="${(x1 - x0) * CWp + 600}" height="${(y1 - y0) * RHp + 600}" fill="${T.wallD}"/>` + (stones ? `<path d="${stones}" fill="${T.wall}" stroke="${INK}" stroke-width="3" stroke-opacity=".55"/><path d="${shine}" fill="none" stroke="${T.wallL}" stroke-width="4" stroke-linecap="round" opacity=".7"/>` : '') + tex
        + (padD ? `<path d="${padD}" fill="#07060a" opacity=".5"/>` : '')
        + floorSvg(x0, y0, x1, y1)
        + (lakeOn ? lakeSvg(x0, y0, x1, y1, lakeL) : '')
        + (cryst ? `<path d="${cryst}" fill="#8fe3ff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '')
        + (beams ? `<path d="${beams}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="${beams}" stroke="#9a6a3a" stroke-width="7" stroke-linecap="round"/>` : '') + (drip ? `<path d="${drip}" fill="${T.wallD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '') + deco;
    }
    function buildChunk(cx, cy) {
      const x0 = cx * SCR.w, y0 = cy * SCR.h, x1 = Math.min(F.w, x0 + SCR.w), y1 = Math.min(F.h, y0 + SCR.h), CWp = G.CW, RHp = G.RH;
      const bx = G.X0 + x0 * CWp, by = G.Y0 + y0 * RHp, bw = (x1 - x0) * CWp, bh = (y1 - y0) * RHp;
      let fogP = '', rimP = '', rocks = [], badges = '', deco = '';
      const blob = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 1 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 1 ${f1(-2 * r)} 0Z`;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * F.w + x, c = F.cells[i], px = G.X0 + x * CWp, py = G.Y0 + y * RHp, p = G.cellXY(i);
        if (!F.vis[i]) {
          if (F.rim && F.rim[i]) { const col = (F.rimRes[i] && A() && A().ORE && A().ORE[F.rimRes[i]]) ? A().ORE[F.rimRes[i]][0] : '#ffd27a'; deco += `<circle cx="${p.cx}" cy="${p.cy}" r="24" fill="${col}" opacity=".3"/><path d="M${p.cx} ${p.cy - 24} l6 18 l18 6 l-18 6 l-6 18 l-6 -18 l-18 -6 l18 -6 Z" fill="${col}" opacity=".85"/>`; }
          continue;
        }
        let nearFog = false; for (let dy = -1; dy <= 1 && !nearFog; dy++) for (let dx = -1; dx <= 1; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 >= 0 && Y2 >= 0 && X2 < F.w && Y2 < F.h && !F.vis[Y2 * F.w + X2]) { nearFog = true; break; } }
        const dr = F.drills && F.drills.get(i);
        if (dr) { const col = (A() && A().ORE && A().ORE[dr.r]) ? A().ORE[dr.r][0] : '#ffd27a'; rocks.push({ y: p.y, s: `<g data-drill="${esc(dr.k)}" class="mn-drill">${drillArt(p.cx, p.y, dr, col)}</g>` }); continue; }
        if (isOpen(i)) {
          if (c.t === 'shaft') deco += `<ellipse cx="${p.cx}" cy="${p.cy + 10}" rx="54" ry="34" fill="#0a0810" stroke="#ffd27a" stroke-width="5" stroke-dasharray="10 8"/><path d="M${p.cx - 40} ${p.cy + 10} V${p.cy - 50} M${p.cx + 40} ${p.cy + 10} V${p.cy - 50} M${p.cx - 48} ${p.cy - 50} H${p.cx + 48}" stroke="#6b4423" stroke-width="8" stroke-linecap="round"/><text x="${p.cx}" y="${p.cy - 60}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="15" fill="#ffd27a" stroke="${INK}" stroke-width="3" paint-order="stroke">ШАХТА ЛИФТА</text>`;
          continue;
        }
        const fr = o.front.has(i);
        if (!fr || c.t === 'wall') continue;   // глубже в толще - без валунов (прожилки - в слое пола)
        const svg = rockSvg(i);
        const hl = `<ellipse cx="${p.x}" cy="${f1(p.y)}" rx="62" ry="18" fill="#ffe27a" opacity=".16"/><ellipse cx="${p.x}" cy="${f1(p.y)}" rx="62" ry="18" fill="none" stroke="#ffe27a" stroke-width="4" stroke-dasharray="12 8"/>`;
        const bd = A().badge(p.x + 28, p.y - 8, c.lv || F.n, c.t, false); rk[i] = svg + bd; badges += bd; rocks.push({ y: p.y, s: `<g data-i="${i}" class="open">${hl}<g class="rk">${svg}</g></g>` });
      }
      rocks.sort((a, b) => a.y - b.y);
      // туман - тем же контуром (край каменистый, без полукругов): тёмная кромка пошире и сам туман
      const nv = (i) => !F.vis[i], fogR = contour(x0, y0, x1, y1, nv, 0.2, 150, 0.3, 0), fogC = contour(x0, y0, x1, y1, nv, 0.55, 150, 0.3, 0);
      const body = deco + rocks.map((r) => r.s).join('') + badges + (fogR.fill ? `<path d="${fogR.fill}" fill="#07060a" opacity=".35"/>` : '') + (fogC.fill ? `<path d="${fogC.fill}" fill="#07060a" opacity=".95"/>` : '');
      const gr = ground(x0, y0, x1, y1);
      addDefs(body);
      const k = `${cx},${cy}`; let ch = CH.get(k);
      if (!ch) {
        ch = { el: document.createElementNS('http://www.w3.org/2000/svg', 'svg'), g: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
        ch.el.setAttribute('class', 'mn3-ch'); ch.el.setAttribute('overflow', 'visible'); ch.g.setAttribute('class', 'mn3-gr'); ch.g.setAttribute('overflow', 'hidden');
        CH.set(k, ch); root.appendChild(ch.g); root.appendChild(ch.el);
      }
      // пол - под всеми валунами (z 0), обрезан по куску; валуны - кусками ниже позже (закрывают верх клеток над ними)
      // куски у края этажа - пол заходит в поле вокруг этажа (край пещеры закругляется, а не обрезан по прямой)
      const ex0 = x0 === 0 ? G.X0 : 0, ey0 = y0 === 0 ? G.Y0 : 0, ex1 = x1 >= F.w ? G.W - (bx + bw) : 0, ey1 = y1 >= F.h ? G.H - (by + bh) : 0;
      const gx = bx - ex0, gy = by - ey0, gw = bw + ex0 + ex1, gh = bh + ey0 + ey1;
      ch.g.style.cssText = `position:absolute;left:${gx}px;top:${gy}px;z-index:0`;
      ch.g.setAttribute('width', gw); ch.g.setAttribute('height', gh); ch.g.setAttribute('viewBox', `${gx} ${gy} ${gw} ${gh}`); ch.g.innerHTML = gr;
      ch.el.style.cssText = `position:absolute;left:${bx}px;top:${by}px;z-index:${cy * 10 + 1}`;
      ch.el.setAttribute('width', bw); ch.el.setAttribute('height', bh); ch.el.setAttribute('viewBox', `${bx} ${by} ${bw} ${bh}`);
      ch.el.innerHTML = body; ch.built = ch.key = chunkKey(cx, cy);
    }
    // какие куски в кадре (и на кусок вокруг)
    function inView(cx, cy) {
      if (!S.view || !S.z) return true;
      const vw = S.view.clientWidth, vh = S.view.clientHeight, x0 = -S.tx / S.z, y0 = -S.ty / S.z, x1 = x0 + vw / S.z, y1 = y0 + vh / S.z;
      const bx = G.X0 + cx * SCR.w * G.CW, by = G.Y0 + cy * SCR.h * G.RH, bw = SCR.w * G.CW, bh = SCR.h * G.RH, m = 300;
      return bx < x1 + m && bx + bw > x0 - m && by < y1 + m && by + bh > y0 - m;
    }
    function ensure() {
      if (!F || !G) return 0; let n = 0;
      const NX = Math.ceil(F.w / SCR.w), NY = Math.ceil(F.h / SCR.h);
      for (let cy = 0; cy < NY; cy++) for (let cx = 0; cx < NX; cx++) {
        const k = `${cx},${cy}`, ch = CH.get(k);
        if (!inView(cx, cy)) continue;
        const key = chunkKey(cx, cy);
        if (!ch || ch.built !== key) { buildChunk(cx, cy); n++; }
      }
      return n;
    }
    function update(F0, o0) {
      let reset = !F || F.n !== F0.n || F.w !== F0.w || F.h !== F0.h;
      F = F0; o = o0; G = window.LGWorldLib.mine3(F);
      const B = Bm(); T = B ? B.themeOf(F.n, F.biome) : { floor: '#7c6046', floorL: '#927354', floorD: '#5c4432', wall: '#5c4330', wallL: '#7a5c40', wallD: '#3e2c1e', lc: '#ffd27a' };
      PAL = (B && B.palette ? B.palette({ n: F.n, biome: F.biome }) : null) || { rock: ['#9a8e80', '#b8ad9f', '#6e6458'], hard: null, wall: T.wall };
      if (A() && A().begin) A().begin(F, {});
      baseRes = ((F.cells.find((c) => c.t === 'rock' || c.t === 'hard') || {}).r) || 'stone';
      // искры жил на краю тумана: клетки жилы за видимым (сервер присылает их номера)
      F.rim = new Uint8Array(F.cells.length); F.rimRes = {};
      for (const v of F.veins || []) for (const i of v[3] || []) { F.rim[i] = 1; F.rimRes[i] = v[1]; }
      // 29.10: палитра пласта (mine-biome.js) догрузилась позже первых кусков - куски с запасной палитрой перестроить
      const tk = (B ? 'b' : '-') + F.n + F.biome; if (tk !== TK) { TK = tk; reset = true; }
      if (reset) { for (const ch of CH.values()) { ch.el.remove(); if (ch.g) ch.g.remove(); } CH.clear(); rk = {}; }
      root.style.cssText = `position:absolute;left:0;top:0;width:${G.W}px;height:${G.H}px;background:${T.wallD}`;
      const hallA = hallArt(G, T, o);
      ensure();
      return { v3: 1, W: G.W, H: G.H, VX0: 0, VW: G.W, Y0: G.Y0, GRID_H: F.h * G.RH, CW: G.CW, RH: G.RH, rk, npc: hallA.npc, lampNpc: hallA.lampNpc, props: hallA.props, G, debris: [T.floorD, T.floorL], back: '', theme: T };
    }
    /** Мини-карта: выкопанное, видимое, лифт, ты, жилы, залы, шахта лифта (если видна). */
    function minimap(me) {
      if (!F) return '';
      const k = Math.max(3, Math.min(6, Math.floor(170 / F.w))); let fl = '', vs = '';
      for (let i = 0; i < F.cells.length; i++) { const x = (i % F.w) * k, y = Math.floor(i / F.w) * k; if (o.dug[i] || (F.vis[i] && OPEN.has(F.cells[i].t))) fl += `M${x} ${y}h${k}v${k}h${-k}Z`; else if (F.vis[i]) vs += `M${x} ${y}h${k}v${k}h${-k}Z`; }
      const dot = (i, c, r = k) => (i >= 0 ? `<circle cx="${(i % F.w) * k + k / 2}" cy="${Math.floor(i / F.w) * k + k / 2}" r="${r}" fill="${c}" stroke="#000" stroke-width="1"/>` : '');
      return `<svg width="${F.w * k}" height="${F.h * k}" viewBox="0 0 ${F.w * k} ${F.h * k}"><rect width="${F.w * k}" height="${F.h * k}" fill="#07060a"/><path d="${vs}" fill="#3a3442"/><path d="${fl}" fill="${T.floorL}"/>`
        + (F.veins || []).map((v) => dot(v[2] >= 0 ? v[2] : (v[3] || [])[0], '#ffd27a')).join('') + (F.halls || []).map((h) => dot(h[2], '#7fe8ff')).join('')
        + [...(F.drills || new Map()).keys()].map((i) => dot(i, '#c9a0ff', k * 1.1)).join('') + dot(F.shaft, '#ff9a3c', k * 1.3) + dot(F.lift, '#9fe39a', k * 1.4) + (me != null ? dot(me, '#ff5f8a', k * 1.1) : '') + '</svg>';
    }
    // 29.10: какие куски в кадре (+300 px) - полоски и копии копаемых камней только для них
    const viewKey = () => { if (!F || !G) return ''; const NX = Math.ceil(F.w / SCR.w), NY = Math.ceil(F.h / SCR.h), a = []; for (let cy = 0; cy < NY; cy++) for (let cx = 0; cx < NX; cx++) if (inView(cx, cy)) a.push(cy * NX + cx); return a.join(','); };
    const cellIn = (i) => { if (!F || !G) return true; return inView(Math.floor((i % F.w) / SCR.w), Math.floor(Math.floor(i / F.w) / SCR.h)); };
    return { el: root, update, ensure, minimap, viewKey, cellIn, get G() { return G; } };
  }
  window.LGMine3 = { floorOf, scene, hallArt, SCR, esc };
})();
