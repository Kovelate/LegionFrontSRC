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
  // смесь цветов; k > 1 - дальше от первого (природа ярче)
  const mixC = (a, b, k) => { const h = (c) => { const n = parseInt(String(c).slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }; const A = h(a), Bc = h(b); return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (Bc[i] - v) * k))).toString(16).padStart(2, '0')).join(''); };
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
  /* 30.10 (стример: «снова старая текстура лифта и всех НПС и зданий»): зал 3.0 рисуется ТЕМИ ЖЕ рисунками «Шахты 2.0» (mine-art.js entry: подъёмник
     с фонарём и вывеской, лавка Скупки, доска Поручений, прилавок Снабженца Кремня / торговца), что и вход старой шахты. Рисунки не меняются -
     каждый ставится на своё место зала 3.0 (hallBox 512 × 384, места - по FOOT) и сжимается до размера зала (HS): вход старой шахты - 1024 px в ширину,
     зал 3.0 - 512. Вывеска лифта - «ЛИФТ» (в старой - «В ГОРОД ↑»). Индикаторы лифта 3.0 (сбор, улучшение, этажи) - поверх. Вагонетки в зале нет.
     Без mine-art.js (или при ошибке рисунка) - прежний упрощённый зал (hallArtLite). */
  const HS = 0.62;
  function hallArt(G, T, o) {
    const A = window.LGMineArt; let E = null;
    if (A && A.entry) { try { E = A.entry(null, null, rngOf(11), { lampMan: !!o.lampMan, trader: !!o.trader }); } catch (e) { E = null; /* рисунок 2.0 упал - берём упрощённый зал */ } }
    if (!E || !E.props || !E.props.length) return hallArtLite(G, T, o);
    const [hx, hy] = G.hall, INKc = INK, out = [];
    // место: точка привязки рисунка (ax, ay - как в mine-art entry2) → (tx, ty) в зале, масштаб HS
    const put = (obj, ax, ay, tx, ty, extra) => { const q = E.props.find((r) => r.obj === obj); if (!q) return; out.push({ obj, x: tx, y: ty, svg: `<g transform="translate(${f1(tx - ax * HS)} ${f1(ty - ay * HS)}) scale(${HS})">${obj === 'lift' ? q.svg.replace('>В ГОРОД ↑<', '>ЛИФТ<') : q.svg}</g>${extra || ''}` }); };
    // лифт: индикаторы 3.0 поверх рисунка 2.0 (сбор - полоса под площадкой, улучшение - леса и колесо, этажей открыто - табличка)
    { const cx = hx + 256, b = hy + 166, t = hy + 20, L = o.lift || {}, O = (w) => `stroke="${INKc}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`; let g = '';
      if (L.st === 'fund') { const pr = L.need ? Math.min(1, L.c / L.need) : 0; g += `<rect x="${cx - 58}" y="${b + 6}" width="116" height="14" rx="7" fill="#2a2030" ${O(3)}/><rect x="${cx - 55}" y="${b + 9}" width="${f1(110 * pr)}" height="8" rx="4" fill="#f4c74e"/>`; }
      if (L.st === 'up') {
        g += `<path d="M${cx - 92} ${b} V${t - 6} M${cx + 92} ${b} V${t - 6} M${cx - 92} ${t + 40} H${cx + 92} M${cx - 92} ${t + 100} H${cx + 92} M${cx - 92} ${b} L${cx + 92} ${t + 40}" fill="none" ${O(7)}/><path d="M${cx - 92} ${b} V${t - 6} M${cx + 92} ${b} V${t - 6} M${cx - 92} ${t + 40} H${cx + 92} M${cx - 92} ${t + 100} H${cx + 92}" fill="none" stroke="#c49a62" stroke-width="3"/>`;
        g += `<g class="mn-wheel" style="transform-origin:${cx + 92}px ${t + 40}px"><circle cx="${cx + 92}" cy="${t + 40}" r="16" fill="#c9ccd6" ${O(4)}/><path d="M${cx + 76} ${t + 40}h32M${cx + 92} ${t + 24}v32" ${O(3)}/></g>`;
      }
      if (L.deep > 1) g += `<rect x="${cx - 26}" y="${b - 22}" width="52" height="22" rx="5" fill="#f3efd8" ${O(3)}/><text x="${cx}" y="${b - 6}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="13" fill="${INKc}">1-${L.deep}</text>`;
      put('lift', 150, 2406, cx, hy + 156, g); }
    if (o.lampMan) put('lamp', 280, 2156, hx + 79, hy + 143);
    put('buyer', 814, 2390, hx + 115, hy + 348);
    put('board', 502, 2416, hx + 424, hy + 338);
    const fp = (k) => G.FOOT.find((f) => f.k === k), nb = fp('npcBuy'), nl = fp('npcLamp');
    return { props: out, npc: { x: (nb.r[0] + nb.r[2]) / 2, y: nb.r[3], name: 'Скупщик Гром' }, lampNpc: o.lampMan ? { x: (nl.r[0] + nl.r[2]) / 2, y: nl.r[3], name: 'Фонарщик' } : null };
  }
  function hallArtLite(G, T, o) {
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
        // 30.10: движение - внутри картинки (SMIL), без перерасчёта стилей страницы
        { const bx = [cx + 72, t + 20, 40, 40], inner = `<circle cx="${cx + 92}" cy="${t + 40}" r="16" fill="#c9ccd6" ${O(4)}/><path d="M${cx + 76} ${t + 40}h32M${cx + 92} ${t + 24}v32" ${O(3)}/>`;
          g += LITE === 2 ? inner : `<image href="${svgUri(bx, `<g>${inner}${SM('mn-wheel', bx)}</g>`)}" x="${bx[0]}" y="${bx[1]}" width="40" height="40"/>`; }
      }
      if (L.deep > 1) g += `<rect x="${cx - 26}" y="${b - 30}" width="52" height="22" rx="5" fill="#f3efd8" ${O(3)}/><text x="${cx}" y="${b - 14}" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="13" fill="${INK}">1-${L.deep}</text>`;
      out.push({ obj: 'lift', x: cx, y: b, svg: g }); }
    // Снабженец: прилавок с касками и кирками, два фонаря
    if (o.lampMan) { const x0 = hx + 20, x1 = hx + 150, b = hy + 150;
      let g = `<ellipse cx="${(x0 + x1) / 2}" cy="${b + 3}" rx="72" ry="10" fill="#000" fill-opacity=".3"/><rect x="${x0}" y="${b - 46}" width="${x1 - x0}" height="46" rx="5" fill="#a0703a" ${O(4)}/><path d="M${x0 + 4} ${b - 30} H${x1 - 4} M${x0 + 4} ${b - 14} H${x1 - 4}" stroke="#6b4423" stroke-width="2.5" opacity=".6"/>`;
      g += [x0 + 30, x0 + 70].map((x) => `<path d="M${x - 16} ${b - 46} q16 -26 32 0 Z" fill="#ffcf3a" ${O(2.5)}/><circle cx="${x}" cy="${b - 58}" r="5" fill="#fff6c8" ${O(1.5)}/>`).join('');
      // 30.10 (#2111): на прилавке - кирки разных ступеней (дерево и железо), не одна серая
      { const PA = typeof window !== 'undefined' && window.LGPickArt;
        g += PA && PA.held ? `<g transform="translate(${x1 - 38} ${b - 50}) rotate(10) scale(.5)">${PA.held(0)}</g><g transform="translate(${x1 - 14} ${b - 52}) rotate(-26) scale(.5)">${PA.held(2)}</g>` : `<g transform="translate(${x1 - 22} ${b - 54}) rotate(-30)"><rect x="-3" y="-30" width="6" height="40" rx="2" fill="#6b4423" ${O(2.5)}/><path d="M-20 -30 Q0 -44 20 -30 Q0 -36 -20 -30 Z" fill="#9a9aa6" ${O(2.5)}/></g>`; }
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

  /* ---------- 30.10: буровая перерисована (решение стримера - «проработать и сделать красивым»): площадка с разметкой и табличкой, стройка - леса, кран,
     брёвна и ящик деталей; ур. 1 - деревянная вышка с воротом, бадьёй и фонарём; ур. 2 - железная решётчатая вышка, машина с маховиком и трубой, вагонетка;
     ур. 3 - высокая вышка с площадкой, лестницей, полосатым оголовком и маяком, лента к куче руды, машина с поршнями; иссякла - серая, ржавчина, паутина.
     Движение - только transform и opacity (бур, шкив, маховик, поршни, дым, крюк, крошка руды).
     29.10 (шаг 4): буровая - площадка (колышки), стройка (леса), ур. 1 (деревянная вышка), ур. 2 (железная, с колесом),
     ур. 3 (большая, с фонарём и лентой), иссякла (серая). Плоские тона, светлый верх, тень снизу, толстая обводка; движение - только
     transform (бур ходит вверх-вниз, колесо крутится), без filter. ---------- */
  // 30.10 (нагрузка): анимация внутри SVG куска этажа заставляла телефон перерисовывать весь кусок 60 раз в секунду (бур ур. 3 в кадре -
  // главный поток занят на 70% при процессоре ×6 медленнее). Теперь тело буровой - одна картинка (<image>, растр кешируется), подвижные
  // части - отдельные <img> в HTML-слое над куском (их двигает видеокарта, без перерисовки и перерасчёта стилей). Рисунок - в своих
  // координатах, результат кешируется по стадии, уровню, руде и режиму. Слабый телефон - только бур и колёса; «уменьшить движение» - без движения.
  const LITE = (() => { try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 2; const c = matchMedia('(pointer: coarse)').matches, hc = navigator.hardwareConcurrency || 8, dm = navigator.deviceMemory || 8; return c && (hc <= 4 || dm <= 3) ? 1 : 0; } catch (e) { return 0; } })();
  const svgUri = (box, inner) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" width="${box[2]}" height="${box[3]}">${inner}</svg>`);
  const DRC = new Map(), DBOX = [-170, -330, 340, 380];
  // движение - внутри картинки части (SMIL): страница не пересчитывает стили каждый кадр, перерисовывается только сама маленькая картинка
  // 30.10: шагами (calcMode="discrete", ~8-10 кадров в секунду): картинка перерисовывается только на шаге, а не 60 раз в секунду
  const SM = (k, box) => { const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2, R = 'repeatCount="indefinite" calcMode="discrete"';
    const seq = (n, f) => Array.from({ length: n }, (_, i) => f(i / n)).join(';'), wave = (t) => (1 - Math.cos(t * 2 * Math.PI)) / 2;
    const T = (v, dur) => `<animateTransform attributeName="transform" type="translate" values="${v}" dur="${dur}" ${R}/>`, O = (v, dur) => `<animate attributeName="opacity" values="${v}" dur="${dur}" ${R}/>`;
    // спицы крестом - период 90°
    if (k === 'mn-wheel') return `<animateTransform attributeName="transform" type="rotate" values="${seq(8, (t) => `${Math.round(t * 90)} ${cx} ${cy}`)}" dur=".8s" ${R}/>`;
    if (k === 'mn-bit') return T(seq(8, (t) => `0 ${(wave(t) * 8).toFixed(1)}`), '1.2s');
    if (k === 'mn-pist') return T(seq(4, (t) => `0 ${(wave(t) * 8).toFixed(1)}`), '.6s');
    if (k === 'mn-pist b') return T(seq(4, (t) => `0 ${(8 - wave(t) * 8).toFixed(1)}`), '.6s');
    if (k === 'mn-puff') return T(seq(12, (t) => `0 ${(6 - 22 * t).toFixed(1)}`), '2.4s') + O(seq(12, (t) => (t < .3 ? t / .3 * .9 : .9 * (1 - t) / .7).toFixed(2)), '2.4s');
    if (k === 'mn-glow') return O(seq(6, (t) => (.2 + .3 * wave(t)).toFixed(2)), '1.8s');
    if (k === 'mn-hook') return `<animateTransform attributeName="transform" type="rotate" values="${seq(10, (t) => `${(Math.sin(t * 2 * Math.PI) * 5).toFixed(1)} ${cx} ${box[1]}`)}" dur="3s" ${R}/>`;
    if (k === 'mn-chip') return T(seq(6, (t) => `0 ${t < .4 ? 0 : (-(t - .4) / .6 * 10).toFixed(1)}`), '1.2s') + O(seq(6, (t) => (t < .4 ? 0 : t < .55 ? 1 : (1 - (t - .55) / .45)).toFixed(2)), '1.2s');
    return ''; };
  /** Буровая в точке (x, b): { svg - в кусок этажа (картинка + подписи), fx - HTML подвижных частей (left/top - мир) }. */
  function drillArt(x, b, d, ore) {
    const key = [d.st, d.lv || 0, ore, LITE].join('|'); let A = DRC.get(key);
    if (!A) { A = drillDraw(d, ore); DRC.set(key, A); if (DRC.size > 60) DRC.delete(DRC.keys().next().value); }
    return { svg: `<g transform="translate(${x} ${b})"><image href="${A.body}" x="${DBOX[0]}" y="${DBOX[1]}" width="${DBOX[2]}" height="${DBOX[3]}"/>${A.text}</g>`,
      fx: A.fx.length ? `<div class="mn-dfx" style="left:${x}px;top:${b}px">${A.fx.map((p) => `<img class="mn-dp" alt="" src="${p.u}" style="left:${p.b[0]}px;top:${p.b[1]}px;width:${p.b[2]}px;height:${p.b[3]}px">`).join('')}</div>` : '' };
  }
  function drillDraw(d, ore) {
    // всё - в своих координатах: (0, 0) - середина площадки на полу, вверх - минус
    const fx = []; let text = '';
    // подвижная часть: в отдельный слой (lv - с какого режима движется: 0 - всегда, 1 - не на слабом телефоне), иначе - рисуется в теле
    // still - как рисовать без движения
    const mov = (c, inner, box, lite = 1, still) => { if (anim && LITE < 2 && !(LITE === 1 && lite)) { fx.push({ c, b: box, u: svgUri(box, `<g>${inner}${SM(c, box)}</g>`) }); return ''; } return still != null ? still : inner; };
    const S = (w) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const P = (dd, f, w = 4) => `<path d="${dd}" fill="${f}" ${S(w)}/>`;
    const L = (dd, c, w, op) => `<path d="${dd}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op ? ` opacity="${op}"` : ''}/>`;
    const C = (cx, cy, r, f, w = 3) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${S(w)}/>`;
    // балка: обводка + цвет
    const beam = (dd, c, w = 6) => L(dd, INK, w + 4) + L(dd, c, w);
    // кусок руды
    const lump = (cx, cy, r, c) => `<path d="M${cx - r} ${cy}l${r * .4} ${-r * .9}h${r * 1.1}l${r * .5} ${r * .7}l${-r * .4} ${r * .5}h${-r * 1.2}Z" fill="${c}" ${S(2.5)}/>`;
    const wheel = (cx, cy, r, f, hub, sp) => mov('mn-wheel', `${C(cx, cy, r, f, 3.5)}${L(`M${cx - r + 3} ${cy}H${cx + r - 3}M${cx} ${cy - r + 3}V${cy + r - 3}${sp ? `M${cx - r * .68} ${cy - r * .68}L${cx + r * .68} ${cy + r * .68}M${cx + r * .68} ${cy - r * .68}L${cx - r * .68} ${cy + r * .68}` : ''}`, INK, 2.5)}${C(cx, cy, r * .28, hub, 2.5)}`, [cx - r - 3, cy - r - 3, 2 * r + 6, 2 * r + 6], 0);
    const tag = (t, y, dry) => `<g transform="translate(0 ${y})"><path d="M-30 0h60l-4 18h-52Z" fill="${dry ? '#8d8a86' : '#7a4f2a'}" ${S(3)}/><path d="M-26 3h52" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>`
      + `<text x="0" y="14" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="12" fill="${dry ? '#e6e2db' : '#ffe08a'}">${t}</text></g>`;
    const hole = (r) => `<ellipse cx="0" cy="-3" rx="${r}" ry="${r * .34}" fill="#0b0912" ${S(3)}/><ellipse cx="0" cy="-4" rx="${r * .6}" ry="${r * .17}" fill="${ore}" opacity=".55"/>`;
    const shadow = (rx) => `<ellipse cx="0" cy="4" rx="${rx}" ry="14" fill="#000" opacity=".28"/>`;
    const lv = Math.max(1, d.lv || 0), dry = d.st === 'dry', build = d.st === 'build', anim = !dry;
    let g = '';
    const done = () => ({ body: svgUri(DBOX, g), text, fx });

    // ---------- площадка и стройка ур. 1: колышки с верёвкой, флажок, табличка, разметка; стройка - леса, брёвна, ящик, крюк ----------
    if (d.st === 'site' || (build && !d.lv)) {
      g += shadow(66) + `<ellipse cx="0" cy="-2" rx="58" ry="16" fill="#000" opacity=".12"/>`;
      // крест - здесь бурить
      g += L('M-14 -10l28 12M14 -10l-28 12', '#f3e3b0', 4, '.75');
      for (const [cx, cy] of [[-30, -6], [26, -2], [-6, 6], [10, -12]]) g += lump(cx, cy, 5, ore);
      // верёвка между колышками
      g += L('M-52 -24Q0 -12 52 -24', '#d8c08a', 2.5) + L('M-52 -24Q0 -12 52 -24', INK, 1, '.5');
      for (const sx of [-52, 52]) g += P(`M${sx - 4} 2l2 -30h4l2 30Z`, '#b98a55', 3) + L(`M${sx - 1} -26v24`, '#fff', 1.5, '.25');
      // флажок
      g += L('M52 -28v-40', INK, 4) + P('M52 -68l30 9l-30 9Z', '#e8574a', 3) + L('M54 -64l20 6', '#fff', 2, '.35');
      // табличка
      g += P('M-78 -8v-26M-66 -8v-26', 'none', 4) + P('M-86 -48h28v18h-28Z', '#c49a62', 3) + `<path d="M-81 -42h18M-81 -36h12" stroke="${INK}" stroke-width="2" opacity=".6"/>`;
      if (build) {
        // леса: две стойки, перекладины, доски; брёвна; ящик с деталями; кран-укосина с крюком (качается)
        g += beam('M-42 0V-112M42 0V-112', '#c49a62', 5) + beam('M-48 -56H48M-48 -108H48', '#b07f4a', 5) + beam('M-42 -2L42 -54M42 -58L-42 -106', '#a8763f', 4);
        g += P('M-50 -60h100v-7h-100Z', '#d6ad74', 3) + P('M-50 -112h100v-7h-100Z', '#d6ad74', 3);
        g += beam('M42 -119V-150M38 -146H94', '#8a6a44', 4) + mov('mn-hook', `${L('M90 -146V-104', INK, 2)}${P('M86 -104h8l-1 8q-3 8 -8 2', 'none', 3)}${P('M78 -96h24v14h-24Z', '#9aa4b5', 3)}`, [74, -148, 32, 70]);
        g += `<g transform="translate(-70 0)">${C(0, -9, 9, '#a4743f', 3)}${C(16, -9, 9, '#a4743f', 3)}${C(8, -24, 9, '#a4743f', 3)}${L('M-3 -9a3 3 0 1 0 6 0M13 -9a3 3 0 1 0 6 0M5 -24a3 3 0 1 0 6 0', INK, 1.5)}</g>`;
        g += P('M56 0v-26h34v26Z', '#8a5f38', 3.5) + L('M56 -13h34M73 -26v26', INK, 2, '.55') + lump(64, -30, 6, '#9aa4b5') + lump(80, -31, 5, '#c8cdd6');
        text += tag('стройка', 12, false);
      }
      return done();
    }

    // ---------- вышка ур. 1-3 (и иссякла) ----------
    const H = [0, 124, 164, 208][lv], W = [0, 44, 50, 58][lv];
    const pal = dry ? { wood: '#8f8a84', woodL: '#b3aea7', steel: '#8b8984', steelL: '#adaba6', paint: '#8a827a', paintL: '#a8a198', plate: '#6f6c68', deck: '#7d7975' }
      : { wood: '#a8743f', woodL: '#d9a566', steel: '#6f7f99', steelL: '#a9b7cc', paint: lv === 3 ? '#c0503e' : '#3f7d5a', paintL: lv === 3 ? '#e2795f' : '#63a37c', plate: '#4f5869', deck: '#8a5f38' };
    const legL = (t) => [-W + (W - 12) * t, -14 - (H - 14) * t], legR = (t) => [W - (W - 12) * t, -14 - (H - 14) * t];
    g += shadow(lv === 3 ? 104 : lv === 2 ? 92 : 78);
    // помост
    if (lv === 1) g += P(`M${-W - 12} 0h${2 * W + 24}v-14h${-2 * W - 24}Z`, pal.deck, 4) + L(`M${-W + 8} -14v14M${-12} -14v14M${16} -14v14M${W - 6} -14v14`, INK, 2, '.45') + L(`M${-W - 8} -11h${2 * W + 16}`, '#fff', 2, '.18');
    else { g += P(`M${-W - 14} 0h${2 * W + 28}v-14h${-2 * W - 28}Z`, pal.plate, 4) + L(`M${-W - 10} -11h${2 * W + 20}`, '#fff', 2, '.16');
      for (let k = -W - 6; k <= W + 6; k += 14) g += `<circle cx="${k}" cy="-5" r="1.8" fill="${INK}" opacity=".55"/>`; }
    g += hole(lv === 1 ? 14 : 16);

    // ---------- задний план: ур. 3 - лента-жёлоб к куче руды, ур. 2-3 - вагонетка ----------
    if (lv === 3) {
      g += beam(`M-30 -18L-78 -40`, '#3d3a44', 9) + L('M-34 -20L-76 -39', '#5b5866', 3);
      for (const t of [0.15, 0.5, 0.85]) { const cx = -30 - 48 * t, cy = -18 - 22 * t; g += C(cx, cy + 6, 3.5, '#8b8984', 2); }
      g += beam('M-74 -38V-6M-50 -28V-6', pal.steel, 3);
      // куча
      g += P('M-116 0q8 -30 26 -34q18 -2 26 34Z', '#3a3340', 3.5);
      for (const [cx, cy, r] of [[-100, -10, 7], [-86, -18, 8], [-76, -8, 6], [-92, -26, 6], [-106, -2, 5], [-80, -30, 4]]) g += lump(cx, cy, r, dry ? '#8b8984' : ore);
    }
    if (lv === 2) {
      const cx = -W - 34;
      g += `<g transform="translate(${cx} 0)">${L('M-30 2H30', '#4a4a52', 4)}${P('M-24 -10l-4 -24h56l-4 24Z', pal.steel, 3.5)}${L('M-22 -28h44', '#fff', 2, '.2')}`
        + `${lump(-10, -36, 7, dry ? '#8b8984' : ore)}${lump(6, -38, 8, dry ? '#8b8984' : ore)}${lump(-1, -44, 6, dry ? '#8b8984' : ore)}${C(-14, -6, 6, '#3d3a44', 3)}${C(14, -6, 6, '#3d3a44', 3)}</g>`;
    }
    // бадья с рудой
    if (lv === 1) {
      g += `<g transform="translate(${-W - 24} 0)">${P('M-14 -2l-3 -24h34l-3 24Z', '#8a5f38', 3.5)}${L('M-15 -16h30M-16 -8h32', INK, 2, '.5')}${L('M-16 -24q16 -18 32 0', INK, 2.5)}`
        + `${lump(-6, -28, 5, dry ? '#8b8984' : ore)}${lump(5, -29, 6, dry ? '#8b8984' : ore)}</g>`;
    }

    // ---------- вышка ----------
    const [ax, ay] = legL(1), [bx] = legR(1);
    if (lv === 1) {
      g += P(`M${-W - 6} -14L${ax - 4} ${ay}h8L${-W + 8} -14Z`, pal.wood, 4) + P(`M${W + 6} -14L${bx + 4} ${ay}h-8L${W - 8} -14Z`, pal.wood, 4);
      g += L(`M${-W + 2} -18L${ax + 1} ${ay + 4}M${W - 2} -18L${bx - 1} ${ay + 4}`, pal.woodL, 2);
      for (const [t0, t1] of [[0.08, 0.42], [0.42, 0.74]]) { const [l0x, l0y] = legL(t0), [r0x, r0y] = legR(t0), [l1x, l1y] = legL(t1), [r1x, r1y] = legR(t1);
        g += beam(`M${l0x} ${l0y}L${r1x} ${r1y}M${r0x} ${r0y}L${l1x} ${l1y}`, pal.wood, 4) + beam(`M${l1x} ${l1y}H${r1x}`, pal.woodL, 4); }
      // сучки
      g += L(`M${ax - 2} ${ay + 30}l3 -3M${bx - 6} ${ay + 60}l3 -3`, INK, 1.5, '.5');
      { const [lx0, ly0] = legL(0.55), fx0 = lx0, fy0 = ly0; g += L(`M${fx0 - 2} ${fy0}h-10v6`, INK, 2) + (dry ? '' : mov('mn-glow', `<circle cx="${fx0 - 12}" cy="${fy0 + 14}" r="12" fill="#ffd27a"/>`, [fx0 - 25, fy0 + 1, 26, 26], 1, `<circle cx="${fx0 - 12}" cy="${fy0 + 14}" r="12" fill="#ffd27a" opacity=".3"/>`)) + P(`M${fx0 - 17} ${fy0 + 6}h10v14h-10Z`, dry ? '#9b9892' : '#ffe08a', 2.5) + L(`M${fx0 - 18} ${fy0 + 6}h12M${fx0 - 18} ${fy0 + 20}h12`, INK, 3); }
    } else {
      g += beam(`M${-W} -14L${ax} ${ay}M${W} -14L${bx} ${ay}`, pal.steel, lv === 3 ? 7 : 6) + L(`M${-W + 1} -16L${ax + 1} ${ay + 2}`, pal.steelL, 2);
      const n = lv === 3 ? 6 : 5;
      for (let k = 0; k < n; k++) { const t0 = 0.04 + k / n * 0.92, t1 = 0.04 + (k + 1) / n * 0.92, [l0x, l0y] = legL(t0), [r0x, r0y] = legR(t0), [l1x, l1y] = legL(t1), [r1x, r1y] = legR(t1);
        g += L(`M${l0x} ${l0y}L${r1x} ${r1y}M${r0x} ${r0y}L${l1x} ${l1y}`, INK, 5) + L(`M${l0x} ${l0y}L${r1x} ${r1y}M${r0x} ${r0y}L${l1x} ${l1y}`, pal.steel, 2) + beam(`M${l1x} ${l1y}H${r1x}`, pal.steelL, 2.5); }
      for (let t = 0.12; t < 1; t += 0.16) { const [lx, ly] = legL(t), [rx] = legR(t); g += `<circle cx="${lx}" cy="${ly}" r="1.8" fill="${INK}"/><circle cx="${rx}" cy="${ly}" r="1.8" fill="${INK}"/>`; }
      // площадка с перилами на середине и лестница
      if (lv === 3) {
        const [lx, ly] = legL(0.5), [rx] = legR(0.5);
        g += P(`M${lx - 16} ${ly}h${rx - lx + 32}v6h${-(rx - lx + 32)}Z`, pal.plate, 3) + L(`M${lx - 14} ${ly}v-14h${rx - lx + 28}v14M${lx - 14} ${ly - 7}h${rx - lx + 28}`, INK, 2.5);
        g += L(`M${rx + 8} -14V${ly}M${rx + 16} -14V${ly}`, INK, 2.5); for (let y = -24; y > ly; y -= 10) g += L(`M${rx + 8} ${y}h8`, INK, 2);
      }
    }
    // голова вышки: ур. 3 - красно-белые полосы и маяк; шкив крутится
    const top = ay;
    g += P(`M${ax - 8} ${top + 2}h${bx - ax + 16}v-12h${-(bx - ax + 16)}Z`, lv === 1 ? pal.wood : pal.plate, 3.5);
    if (lv === 3) g += beam(`M${ax + 2} ${top - 8}V${top - 22}M${bx - 2} ${top - 8}V${top - 22}`, pal.steel, 3);
    if (lv === 3) { g += P(`M${ax - 4} ${top - 20}h${bx - ax + 8}v-12h${-(bx - ax + 8)}Z`, dry ? '#a8a49e' : '#f3efe6', 3);
      for (let sx = ax - 2; sx < bx - 2; sx += 12) g += `<path d="M${sx} ${top - 21}h6l5 -10h-6Z" fill="${dry ? '#8b8984' : '#d8433a'}"/>`;
      g += P(`M${ax - 4} ${top - 20}h${bx - ax + 8}v-12h${-(bx - ax + 8)}Z`, 'none', 3);
      g += L(`M0 ${top - 32}v-8`, INK, 3) + (dry ? C(0, top - 46, 7, '#9b9892', 3) : mov('mn-glow', `<circle cx="0" cy="${top - 46}" r="16" fill="#ffd27a"/>`, [-17, top - 63, 34, 34], 1, `<circle cx="0" cy="${top - 46}" r="16" fill="#ffd27a" opacity=".35"/>`) + C(0, top - 46, 7, '#ffe08a', 3)); }
    g += wheel(0, top - 6, lv === 1 ? 8 : 11, lv === 1 ? pal.woodL : pal.steelL, INK, lv > 1);

    // ---------- бур: трос от шкива, штанга, шнек, коронка; ходит вверх-вниз ----------
    const rodTop = top + 8, rodBot = -22;
    g += mov('mn-bit', `${L(`M0 ${top + 2}V${rodTop + 14}`, INK, 2)}${P(`M-6 ${rodTop + 10}h12v10h-12Z`, '#d8b04a', 3)}`
      + `${P(`M-3.5 ${rodTop + 20}V${rodBot - 18}h7V${rodTop + 20}Z`, dry ? '#8b8984' : '#4a4f5c', 3)}${L(`M-1 ${rodTop + 22}V${rodBot - 20}`, '#fff', 1.5, '.3')}`
      + `${P(`M-10 ${rodBot - 18}l20 -6v6l-20 6Z`, '#c8cdd6', 2.5)}${P(`M-10 ${rodBot - 8}l20 -6v6l-20 6Z`, '#c8cdd6', 2.5)}`
      + `${P(`M-7 ${rodBot + 4}h14l-7 14Z`, dry ? '#a8a49e' : '#e6e8ee', 3)}`, [-14, top, 28, rodBot + 22 - top], 0);
    // крошка руды из скважины (слабый телефон - без неё)
    if (anim) g += mov('mn-chip', `${lump(-14, -12, 3.5, ore)}${lump(13, -14, 3, ore)}`, [-21, -20, 40, 18]);

    // ---------- спереди: ур. 1 - ручной ворот; ур. 2-3 - машина с маховиком, трубой и дымом ----------
    if (lv === 1) {
      g += `<g transform="translate(${W + 26} 0)">${beam('M-10 0V-34M10 0V-34', pal.wood, 4)}${P('M-14 -40h28v12h-28Z', pal.woodL, 3)}${L(`M0 -36L${-W - 26} ${top - 4}`, INK, 1.8)}</g>`
        + wheel(W + 44, -34, 9, pal.woodL, INK, false);
    } else {
      const ex = W + (lv === 3 ? 22 : 18), ew = lv === 3 ? 56 : 44, eh = lv === 3 ? 46 : 38, ch = lv === 3 ? 34 : 26, wr = lv === 3 ? 17 : 14;
      g += `<g transform="translate(${ex} 0)">`
        + P(`M0 0v${-eh}h${ew}v${eh}Z`, pal.paint, 4) + L(`M4 ${-eh + 4}h${ew - 8}`, pal.paintL, 3) + L(`M0 ${-eh / 2}h${ew}`, INK, 2, '.35')
        + `<circle cx="${ew - 8}" cy="-8" r="2" fill="${INK}"/><circle cx="8" cy="-8" r="2" fill="${INK}"/>`
        + P(`M${ew - 18} ${-eh}v${-ch}h10v${ch}Z`, pal.plate, 3) + P(`M${ew - 21} ${-eh - ch}h16v-6h-16Z`, '#3d3a44', 3)
        // ремень к шкиву
        + L(`M-2 ${-eh / 2 - 2 - wr}L${-ex + 4} ${top - 4}`, INK, 1.8)
        + `</g>`;
      // дым из трубы
      const px = ex + ew - 13, py = -eh - ch - 14;
      if (anim) g += mov('mn-puff', `${C(px, py, 7, '#d6d2cc', 2)}${C(px + 9, py - 10, 5, '#e6e2db', 2)}`, [px - 9, py - 17, 25, 27]);
      if (lv === 3) for (const [k, c] of [[8, 'mn-pist'], [20, 'mn-pist b']]) g += mov(c, P(`M${ex + k} ${-eh - 10}h8v14h-8Z`, '#c8cdd6', 2.5), [ex + k - 2, -eh - 12, 12, 18]);
      g += wheel(ex - 2, -eh / 2 - 2, wr, pal.steelL, '#3d3a44', true);
    }
    // иссякла: ржавчина, паутина, табличка «пусто»
    if (dry) {
      g += `<circle cx="${-W + 10}" cy="-40" r="4" fill="#9a5b34" opacity=".55"/><circle cx="${W - 16}" cy="-70" r="3" fill="#9a5b34" opacity=".55"/>`;
      g += L(`M${ax} ${top + 12}l18 18M${ax} ${top + 22}l10 8M${ax + 8} ${top + 12}l-2 14`, '#e6e2db', 1, '.6');
    }
    text += tag(dry ? 'иссякла' : 'ур. ' + lv, 10, dry);
    if (build) g += `<g transform="translate(${-W - 28} 0)">${beam('M0 0V-80M24 0V-80', '#c49a62', 4)}${beam('M-4 -40H28M-4 -78H28', '#b07f4a', 4)}${beam('M0 -2L24 -38', '#a8763f', 3)}</g>`
;
    if (build) text += `<g transform="translate(0 ${top - 50})">${P('M-46 0h92l-4 16h-84Z', '#e8b63a', 3)}<text x="0" y="12" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="11" fill="${INK}">стройка ур. ${lv + 1}</text></g>`;
    return done();
  }

  /* ---------- сцена ---------- */
  function scene(S) {
    const A = () => window.LGMineArt, Bm = () => window.LGMineBiome;
    const root = document.createElement('div'); root.className = 'mn3';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); defs.setAttribute('class', 'mna-defs'); defs.setAttribute('aria-hidden', 'true'); root.appendChild(defs);
    const SYMS = new Set(); let baseDefs = false;
    const CH = new Map();   // ключ куска "cx,cy" → { el, key, built }
    let F = null, G = null, o = {}, T = null, PAL = null, rk = {}, baseRes = 'stone', TK = '', NAT = '';
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
      const c = F.cells[i], k = `${F.n}|${NAT}|${i}|${c.t}|${c.r}|${c.lv}`; let s = ROCK.get(k); if (s != null) return s;
      const a = A(), p = G.cellXY(i), r = rngOf(i * 131 + F.n * 977), sc = 1 + Math.max(0, (c.lv || F.n) - F.n) * 0.1 + (c.t === 'hard' ? 0.05 : 0);
      const pal = (c.t === 'hard' ? PAL.hard : PAL.rock) || PAL.rock;
      if (c.t === 'wall') s = a.wall(p.x, p.y, [PAL.wall || T.wall, T.wallL], r);
      else if (c.t === 'chest' || c.t === 'prize') s = a.chest(p.x, p.y, sc, pal, r) + (c.t === 'prize' ? `<path d="M${p.x} ${p.y - 150} l8 18 l20 2 l-15 13 l5 20 l-18 -10 l-18 10 l5 -20 l-15 -13 l20 -2 Z" fill="#ffd27a" stroke="${INK}" stroke-width="3"/>` : '');
      else { const gem = c.t === 'rare' && F.gem && c.r === F.gem; s = (gem ? `<ellipse cx="${p.x}" cy="${f1(p.y - 50)}" rx="58" ry="50" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 10" stroke-opacity=".7"/>` : '') + a.rock({ ...c, ...(NAT || c.t === 'ore' || c.t === 'rare' ? {} : { r: 'stone' }), b: baseRes }, 'boulder', p.x, p.y, sc, pal, r) + (c.t === 'ore' || c.t === 'rare' ? a.ore(c.r, p.x, p.y, sc * (gem ? 1.12 : 1), r, c.t === 'rare', gem) : ''); }
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
    /* 29.10: 1-й этаж - природа округа: что лежит на полу (иней, мох, лужи, лава, песок, споры, ракушки, трава, плитка) */
    function natFloor(N, cx, cy, r) {
      const at = () => [cx + (r() - 0.5) * 96, cy + (r() - 0.2) * 70], e = (x, y, rx, ry, f, op = 1) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${f}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
      let g = '';
      if (N === 'ice') { if (r() < 0.5) { const [x, y] = at(); g += e(x, y, 26 + r() * 20, 9 + r() * 6, '#e8f6ff', 0.75); } }
      else if (N === 'forest' || N === 'taiga') { if (r() < 0.45) { const [x, y] = at(); g += e(x, y, 16 + r() * 14, 6 + r() * 4, N === 'taiga' ? '#f2f8fc' : '#5f8f3a', 0.85); } }
      else if (N === 'swamp') { if (r() < 0.45) { const [x, y] = at(); g += e(x, y, 22 + r() * 18, 8 + r() * 5, '#3e5a3a') + e(x - 4, y - 2, 10, 3, '#7aa070', 0.6); } }
      else if (N === 'ash') { if (r() < 0.15) { const [x, y] = at(); g += e(x, y, 18, 7, INK) + e(x, y, 15, 5, '#ff7a2a'); } else if (r() < 0.4) { const [x, y] = at(); g += e(x, y, 14, 5, '#2a2428', 0.7); } }
      else if (N === 'desert') { if (r() < 0.6) { const [x, y] = at(); g += `<path d="M${f1(x - 22)} ${f1(y)}q11 -6 22 0t22 0" stroke="#f0c890" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`; } }
      else if (N === 'blight') { for (let k = 0; k < 3; k++) if (r() < 0.5) { const [x, y] = at(); g += e(x, y, 3 + r() * 3, 3 + r() * 3, '#c8a0ff', 0.8); } }
      else if (N === 'coast') { if (r() < 0.3) { const [x, y] = at(); g += `<path d="M${f1(x - 8)} ${f1(y)} q4 -10 8 0 q4 -10 8 0Z" fill="#f2c4b4" stroke="${INK}" stroke-width="2"/>`; } else if (r() < 0.3) { const [x, y] = at(); g += e(x, y, 20, 7, '#4f9ac2', 0.8); } }
      else if (N === 'meadow') { if (r() < 0.45) { const [x, y] = at(); g += `<path d="M${f1(x - 6)} ${f1(y)} l-3 -12 M${f1(x)} ${f1(y)} v-15 M${f1(x + 6)} ${f1(y)} l3 -12" stroke="#7fa85a" stroke-width="3" stroke-linecap="round"/>` + (r() < 0.4 ? `<circle cx="${f1(x)}" cy="${f1(y - 16)}" r="3.5" fill="#ffe27a"/>` : ''); } }
      else if (N === 'ruin') { if (r() < 0.35) { const [x, y] = at(); g += `<path d="M${f1(x - 18)} ${f1(y)}h36M${f1(x)} ${f1(y - 8)}v16" stroke="${T.floorD}" stroke-width="2.5" opacity=".8"/>`; } }
      return g;
    }
    /* 29.10: 1-й этаж - что свисает над проходом: корни (лес, тайга), мох (болото), споры (порча); иней и сосульки - цветом сталактитов */
    function natCeil(N, px, py, CW, r) {
      let g = '';
      if ((N === 'forest' || N === 'taiga' || N === 'meadow') && r() < 0.7) { const x = px + 20 + r() * (CW - 40), h = 24 + r() * 26; g += `<path d="M${f1(x)} ${f1(py - 18)} q${f1(-8 + r() * 16)} ${f1(h / 2)} ${f1(-4 + r() * 8)} ${f1(h)} q${f1(-6 + r() * 12)} ${f1(h / 3)} ${f1(-2 + r() * 4)} ${f1(h / 2)}" stroke="#6a4a30" stroke-width="4" fill="none" stroke-linecap="round"/>`; }
      if (N === 'swamp' && r() < 0.7) { const x = px + 20 + r() * (CW - 40), h = 18 + r() * 24; g += `<path d="M${f1(x)} ${f1(py - 16)} q-5 ${f1(h / 2)} 0 ${f1(h)} q5 ${f1(h / 2)} -2 ${f1(h * 1.4)}" stroke="#5a7a2a" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
      if (N === 'blight' && r() < 0.5) { const x = px + 20 + r() * (CW - 40); g += `<path d="M${f1(x - 8)} ${f1(py - 14)} L${f1(x - 2)} ${f1(py + 14)} L${f1(x + 4)} ${f1(py - 14)}Z" fill="#b48aff" stroke="${INK}" stroke-width="2.5"/>`; }
      return g;
    }
    // подземное озеро: клетки зала-озера (кроме награды) - одним контуром, как край пещеры; светлые блики сверху
    function lakeSvg(x0, y0, x1, y1, shine) {
      const lk = (i) => { const c = F.cells[i]; if (!F.vis[i] || c.hall == null || c.t === 'prize') return false; const h = F.halls.find((q) => q[0] === c.hall); return !!h && h[1] === 'lake'; };
      const A1 = contour(x0, y0, x1, y1, lk, 0.6, 130, 0.3); if (!A1.fill) return '';
      const B1 = contour(x0, y0, x1, y1, lk, 0.95, 120, 0.3);
      return `<path d="${A1.fill}" fill="#2f6f9e"/><path d="${B1.fill}" fill="#3f8cc2"/><path d="${A1.line}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="${shine}" fill="none" stroke="#9fd8f2" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
    }
    function ground(x0, y0, x1, y1) {
      const CWp = G.CW, RHp = G.RH; let edge = '', base = '', lit = '', tex = '', deco = '', drip = '', stones = '', shine = '', lake = '', lakeL = '', cryst = '', beams = '', lakeOn = false, nat = '';
      const blobP = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 1 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 1 ${f1(-2 * rx)} 0Z`;
      const blob = (cx, cy, r) => `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(r)} 0 1 1 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 1 ${f1(-2 * r)} 0Z`;
      for (let y = Math.max(0, y0 - 1); y < Math.min(F.h, y1 + 1); y++) for (let x = Math.max(0, x0 - 1); x < Math.min(F.w, x1 + 1); x++) {
        const i = y * F.w + x, c = F.cells[i], px = G.X0 + x * CWp, py = G.Y0 + y * RHp, cx = px + CWp / 2, cy = py + RHp / 2, r = rngOf(i * 613 + F.n * 31);
        if (!F.vis[i]) continue;
        if (isOpen(i)) {
          // сталактиты: над проходом толща
          if (NAT && y > 0 && !isOpen(i - F.w) && c.t !== 'lift') nat += natCeil(NAT, px, py, CWp, r);
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
            if (NAT) nat += natFloor(NAT, cx, cy, r);
            const wallNb = [i - 1, i + 1].some((j) => j >= 0 && j < F.cells.length && Math.floor(j / F.w) === y && !isOpen(j));
            if (wallNb && r() < 0.28) { const side = r() < 0.5 ? -1 : 1, sx = cx + side * 40, sy = cy + 30, h = 26 + r() * 22; if (!(fieldAt(sx, sy, opF, 150, 0.7) >= 0.6 && fieldAt(sx + side * 46, sy, opF, 150, 0.7) < 0.45)) continue; deco += `<path d="M${f1(sx - 12)} ${f1(sy)}Q${f1(sx - 3)} ${f1(sy - h * 0.6)} ${f1(sx)} ${f1(sy - h)}Q${f1(sx + 3)} ${f1(sy - h * 0.6)} ${f1(sx + 12)} ${f1(sy)}Z" fill="${T.wallL}" stroke="${INK}" stroke-width="3"/>`; }
          }
        } else {
          // толща: трещины и светлые сколы; в камнях руды - прожилки (видно, куда копать); скалы - темнее
          const wl = c.t === 'wall';
          if (wl) tex += `<path d="${blob(cx + (r() - 0.5) * 30, cy + (r() - 0.5) * 30, 52 + r() * 16)}${blob(cx + (r() - 0.5) * 60, cy + (r() - 0.5) * 50, 34 + r() * 14)}" fill="${T.wallD}" opacity=".5"/>`;   // скала - тёмные пятна, не клетка
          // порода, которую можно копать, - кладка из крупных камней (светлый верх); скала - сплошная тёмная
          if (NAT === 'ruin' && !wl) { for (let k = 0; k < 3; k++) { const by2 = py + 10 + k * 38, off = (k % 2) * 32; for (let m = 0; m < 3; m++) { const bx2 = px + 6 + off + m * 52 - (off ? 26 : 0); if (bx2 < px - 10 || bx2 > px + CWp - 20) continue; stones += `M${bx2} ${by2}h48v32h-48Z`; } } } else
          if (!wl) for (let k = 0; k < 3; k++) { const sx = px + 20 + ((k % 2) * 52) + r() * 34, sy = py + 22 + (k * 34) + r() * 14, rw = 22 + r() * 14, rh = 16 + r() * 10;
            stones += `M${f1(sx - rw)} ${f1(sy)}Q${f1(sx - rw)} ${f1(sy - rh)} ${f1(sx)} ${f1(sy - rh)}Q${f1(sx + rw)} ${f1(sy - rh)} ${f1(sx + rw)} ${f1(sy)}Q${f1(sx + rw)} ${f1(sy + rh)} ${f1(sx)} ${f1(sy + rh)}Q${f1(sx - rw)} ${f1(sy + rh)} ${f1(sx - rw)} ${f1(sy)}Z`;
            shine += `M${f1(sx - rw * 0.6)} ${f1(sy - rh * 0.35)}Q${f1(sx)} ${f1(sy - rh * 0.95)} ${f1(sx + rw * 0.6)} ${f1(sy - rh * 0.35)}`; }
          // пепел: лава в трещинах
          if (NAT === 'ash' && r() < 0.35) tex += `<path d="M${f1(px + 20 + r() * 40)} ${f1(py + 20 + r() * 30)} l${f1(12 + r() * 10)} ${f1(14 + r() * 10)} l${f1(-6 + r() * 14)} ${f1(14 + r() * 10)} l${f1(10 + r() * 8)} ${f1(10 + r() * 10)}" fill="none" stroke="#ff7a2a" stroke-width="4" stroke-linecap="round"/>`;
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
      return `<rect x="${G.X0 + x0 * CWp - 300}" y="${G.Y0 + y0 * RHp - 300}" width="${(x1 - x0) * CWp + 600}" height="${(y1 - y0) * RHp + 600}" fill="${T.wallD}"/>` + (stones ? `<path d="${stones}" fill="${T.wall}" stroke="${INK}" stroke-width="3" stroke-opacity=".55"/><path d="${shine}" fill="none" stroke="${NAT === 'ice' || NAT === 'taiga' ? '#f6fbff' : T.wallL}" stroke-width="${NAT === 'ice' || NAT === 'taiga' ? 7 : 4}" stroke-linecap="round" opacity="${NAT === 'ice' || NAT === 'taiga' ? '.95' : '.7'}"/>` : '') + tex
        + (padD ? `<path d="${padD}" fill="#07060a" opacity=".5"/>` : '')
        + floorSvg(x0, y0, x1, y1)
        + nat + (lakeOn ? lakeSvg(x0, y0, x1, y1, lakeL) : '')
        + (cryst ? `<path d="${cryst}" fill="#8fe3ff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '')
        + (beams ? `<path d="${beams}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="${beams}" stroke="#9a6a3a" stroke-width="7" stroke-linecap="round"/>` : '') + (drip ? `<path d="${drip}" fill="${NAT === 'ice' ? '#dff2ff' : NAT === 'swamp' ? '#4e6a3a' : T.wallD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '') + deco;
    }
    function buildChunk(cx, cy) {
      const x0 = cx * SCR.w, y0 = cy * SCR.h, x1 = Math.min(F.w, x0 + SCR.w), y1 = Math.min(F.h, y0 + SCR.h), CWp = G.CW, RHp = G.RH;
      const bx = G.X0 + x0 * CWp, by = G.Y0 + y0 * RHp, bw = (x1 - x0) * CWp, bh = (y1 - y0) * RHp;
      let fogP = '', rimP = '', rocks = [], badges = '', deco = '', fxh = '';
      const blob = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 1 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 1 ${f1(-2 * r)} 0Z`;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * F.w + x, c = F.cells[i], px = G.X0 + x * CWp, py = G.Y0 + y * RHp, p = G.cellXY(i);
        if (!F.vis[i]) {
          if (F.rim && F.rim[i]) { const col = (F.rimRes[i] && A() && A().ORE && A().ORE[F.rimRes[i]]) ? A().ORE[F.rimRes[i]][0] : '#ffd27a'; deco += `<circle cx="${p.cx}" cy="${p.cy}" r="24" fill="${col}" opacity=".3"/><path d="M${p.cx} ${p.cy - 24} l6 18 l18 6 l-18 6 l-6 18 l-6 -18 l-18 -6 l18 -6 Z" fill="${col}" opacity=".85"/>`; }
          continue;
        }
        let nearFog = false; for (let dy = -1; dy <= 1 && !nearFog; dy++) for (let dx = -1; dx <= 1; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 >= 0 && Y2 >= 0 && X2 < F.w && Y2 < F.h && !F.vis[Y2 * F.w + X2]) { nearFog = true; break; } }
        const dr = F.drills && F.drills.get(i);
        if (dr) { const col = (A() && A().ORE && A().ORE[dr.r]) ? A().ORE[dr.r][0] : '#ffd27a', da = drillArt(p.cx, p.y, dr, col); rocks.push({ y: p.y, s: `<g data-drill="${esc(dr.k)}" class="mn-drill">${da.svg}</g>` }); fxh += da.fx; continue; }
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
      // 30.10 (репорт #2146): густой туман - с полем в клетку сетки контура за край куска (m = 1): шов между кусками закрыт нахлёстом
      // (поле общее, у соседей тот же контур; .95 поверх .95 на глаз не отличить); пелена .35 - ровно по куску, иначе на стыке темнее
      const nv = (i) => !F.vis[i], fogR = contour(x0, y0, x1, y1, nv, 0.2, 150, 0.3, 0), fogC = contour(x0, y0, x1, y1, nv, 0.55, 150, 0.3, 1);
      const body = deco + rocks.map((r) => r.s).join('') + badges + (fogR.fill ? `<path d="${fogR.fill}" fill="#07060a" opacity=".35"/>` : '') + (fogC.fill ? `<path d="${fogC.fill}" fill="#07060a" opacity=".95"/>` : '');
      const gr = ground(x0, y0, x1, y1);
      addDefs(body);
      const k = `${cx},${cy}`; let ch = CH.get(k);
      if (!ch) {
        ch = { el: document.createElementNS('http://www.w3.org/2000/svg', 'svg'), g: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
        ch.el.setAttribute('class', 'mn3-ch'); ch.el.setAttribute('overflow', 'visible'); ch.g.setAttribute('class', 'mn3-gr'); ch.g.setAttribute('overflow', 'hidden');
        CH.set(k, ch); root.appendChild(ch.g); root.appendChild(ch.el);
      }
      // 30.10: подвижные части буровых куска - HTML-слой сразу над куском (валуны кусков ниже по-прежнему закрывают)
      if (fxh && !ch.fx) { ch.fx = document.createElement('div'); ch.fx.className = 'mn3-fx'; root.appendChild(ch.fx); }
      if (ch.fx) { ch.fx.style.zIndex = String(cy * 10 + 2); if (ch.fx.innerHTML !== fxh) ch.fx.innerHTML = fxh; }
      // пол - под всеми валунами (z 0), обрезан по куску; валуны - кусками ниже позже (закрывают верх клеток над ними)
      // куски у края этажа - пол заходит в поле вокруг этажа (край пещеры закругляется, а не обрезан по прямой)
      const ex0 = x0 === 0 ? G.X0 : 0, ey0 = y0 === 0 ? G.Y0 : 0, ex1 = x1 >= F.w ? G.W - (bx + bw) : 0, ey1 = y1 >= F.h ? G.H - (by + bh) : 0;
      // 30.10 (репорт #2146): куски пола - отдельные <svg>; при дробном масштабе их края сглаживаются по отдельности, и между кусками
      // просвечивал чёрный фон - тонкая полоса через весь экран. Пол куска заходит на соседей на OV px: снизу у пола сплошная заливка
      // (rect на ±300 px), рисунок - от общей сетки, поэтому нахлёст совпадает пиксель в пиксель, а щели нет
      const OV = 4, gx = bx - ex0 - OV, gy = by - ey0 - OV, gw = bw + ex0 + ex1 + 2 * OV, gh = bh + ey0 + ey1 + 2 * OV;
      ch.g.style.cssText = `position:absolute;left:${gx}px;top:${gy}px;z-index:0`;
      ch.g.setAttribute('width', gw); ch.g.setAttribute('height', gh); ch.g.setAttribute('viewBox', `${gx} ${gy} ${gw} ${gh}`); ch.g.innerHTML = gr;
      ch.el.style.cssText = `position:absolute;left:${bx}px;top:${by}px;z-index:${cy * 10 + 1}`;
      ch.el.setAttribute('width', bw); ch.el.setAttribute('height', bh); ch.el.setAttribute('viewBox', `${bx} ${by} ${bw} ${bh}`);
      ch.el.innerHTML = body; ch.built = ch.key = chunkKey(cx, cy);
    }
    // какие куски в кадре (и на кусок вокруг)
    function inView(cx, cy) {
      if (!S.view || !S.z) return true;
      // 30.10: размер вида - из кэша mine.js (S.vsz, сбрасывает ResizeObserver): чтение clientWidth на каждый кусок и каждую полоску за кадр
      // заставляло браузер пересчитывать стили посреди кадра
      const vs = S.vsz || { w: S.view.clientWidth, h: S.view.clientHeight }, vw = vs.w, vh = vs.h, x0 = -S.tx / S.z, y0 = -S.ty / S.z, x1 = x0 + vw / S.z, y1 = y0 + vh / S.z;
      const bx = G.X0 + cx * SCR.w * G.CW, by = G.Y0 + cy * SCR.h * G.RH, bw = SCR.w * G.CW, bh = SCR.h * G.RH, m = 300;
      return bx < x1 + m && bx + bw > x0 - m && by < y1 + m && by + bh > y0 - m;
    }
    function ensure() {
      if (!F || !G) return 0; let n = 0;
      const NX = Math.ceil(F.w / SCR.w), NY = Math.ceil(F.h / SCR.h);
      for (let cy = 0; cy < NY; cy++) for (let cx = 0; cx < NX; cx++) {
        const k = `${cx},${cy}`, ch = CH.get(k), iv = inView(cx, cy);
        // 30.10: вне кадра - движение стоит
        if (ch && ch.fx) { const dv = iv ? '' : 'none'; if (ch.fx.style.display !== dv) ch.fx.style.display = dv; }
        if (!iv) continue;
        const key = chunkKey(cx, cy);
        if (!ch || ch.built !== key) { buildChunk(cx, cy); n++; }
      }
      return n;
    }
    function update(F0, o0) {
      let reset = !F || F.n !== F0.n || F.w !== F0.w || F.h !== F0.h;
      F = F0; o = o0; G = window.LGWorldLib.mine3(F);
      // 29.10 (стример: «только 1 этаж под стиль природы, глубже - везде одинаково»): природа - только на 1-м этаже (подкраска лёгкая, решение стримера)
      NAT = F.n === 1 && F.biome && F.biome !== 'mount' ? F.biome : '';
      const B = Bm(); T = B ? B.themeOf(F.n, NAT || 'mount') : { floor: '#7c6046', floorL: '#927354', floorD: '#5c4432', wall: '#5c4330', wallL: '#7a5c40', wallD: '#3e2c1e', lc: '#ffd27a' };
      if (B && NAT) { const T0 = B.themeOf(1, 'mount'); for (const k of ['floor', 'floorL', 'floorD', 'wall', 'wallL', 'wallD']) T = { ...T, [k]: mixC(T0[k], T[k], 0.8) }; }
      PAL = (B && B.palette ? B.palette({ n: F.n, biome: NAT || 'mount' }) : null) || { rock: ['#9a8e80', '#b8ad9f', '#6e6458'], hard: null, wall: T.wall };
      if (A() && A().begin) A().begin(F, {});
      // глубже 1-го - камень везде один
      baseRes = NAT ? ((F.cells.find((c) => c.t === 'rock' || c.t === 'hard') || {}).r) || 'stone' : 'stone';
      // искры жил на краю тумана: клетки жилы за видимым (сервер присылает их номера)
      F.rim = new Uint8Array(F.cells.length); F.rimRes = {};
      for (const v of F.veins || []) for (const i of v[3] || []) { F.rim[i] = 1; F.rimRes[i] = v[1]; }
      // 29.10: палитра пласта (mine-biome.js) догрузилась позже первых кусков - куски с запасной палитрой перестроить
      const tk = (B ? 'b' : '-') + F.n + F.biome; if (tk !== TK) { TK = tk; reset = true; }
      if (reset) { for (const ch of CH.values()) { ch.el.remove(); if (ch.g) ch.g.remove(); if (ch.fx) ch.fx.remove(); } CH.clear(); rk = {}; }
      root.style.cssText = `position:absolute;left:0;top:0;width:${G.W}px;height:${G.H}px;background:${T.wallD}`;
      // символы рисунков 2.0 (mre-…) - в общие определения
      const hallA = hallArt(G, T, o); addDefs(hallA.props.map((q) => q.svg).join(''));
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
  // 30.10: lite - режим движения буровых (0 - всё, 1 - слабый телефон, 2 - без движения)
  window.LGMine3 = { floorOf, scene, hallArt, SCR, esc, get lite() { return LITE; } };
})();
