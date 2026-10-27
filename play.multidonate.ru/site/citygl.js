/* 20.10: «Город» на PixiJS — только отрисовка улицы (логика: камера, ходьба, присутствие, клики — в city.js).
   Зачем: при 30 гуляющих SVG-версия ела 58–80% процессора у зрителя без видеокарты — браузер перерисовывал слои человечков.
   Как: все SVG (Ярмарка стиля, квартал, нижняя улица, предметы с глубиной, человечки) один раз «запекаются» в картинки
   под масштаб камеры и плотность экрана (фон — плитками 1024 px: лимит размера текстур и память), дальше Pixi только
   двигает спрайты (WebGL; нет WebGL или он программный — canvas 2D того же Pixi). Кадр рисуется, только когда что-то
   поменялось (камера, кто-то идёт, допеклась картинка) — в покое не рисуется ничего. Подробно — docs/CITY.md.
   Pixi (legacy/site/public/vendor) грузится лениво — только когда открыли «Город» (load). */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const TILE = 1024;           // плитка фона, пикселей экрана (меньше любого лимита текстур — 4096)
  const TILE_BUDGET = 28e6;    // пикселей фона в памяти (~110 МБ); больше — выкидываем плитки, давно ушедшие из кадра
  const K_MAX = 2.5;           // плотнее не печём (телефоны с dpr 3–4: глазу не видно, памяти — вдвое меньше)
  // 22.10: кадр без видеокарты (canvas 2D) рисует процессор, и цена кадра — число пикселей: телефон с dpr 2,75 платил за 2,5 Мпикс
  // на кадр (в 6 раз больше ПК, 9 кадров/с вместо 30). Плотнее 1,5 в canvas не рисуем — на глаз чуть мягче, втрое легче
  const CANVAS_RES = 1.5;
  // внутри запечённых SVG: без анимаций (как .cy-art * в city.css), вложенные человечки — без обрезки и фильтра (как fixDoodles Ярмарки)
  const CSS = '*{animation:none!important;transition:none!important}.jl-doodle{overflow:visible;filter:none}';
  const ESC = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- загрузка Pixi и шрифта вывесок (только по требованию) ---------- */
  let loading = null, FONT = null;
  const vend = (V, k) => '/site/vendor/' + ((V && V[k]) || '');   // имя файла с версией — из LG_CITYV (static.ts)
  function load(V) {
    if (window.PIXI && window.PIXI.autoDetectRenderer) return Promise.resolve();
    if (loading) return loading;
    const js = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('не загрузился ' + src)); document.head.appendChild(s); });
    // unsafe-eval — замена new Function для WebGL (CSP сайта запрещает eval)
    loading = js(vend(V, 'pixi')).then(() => js(vend(V, 'pixiEval'))).then(() => { if (!window.PIXI || !window.PIXI.autoDetectRenderer) throw new Error('нет PIXI'); })
      .catch((e) => { loading = null; throw e; });
    return loading;
  }
  // Russo One — шрифт вывесок Ярмарки: картинка-SVG не видит шрифты страницы, поэтому кладём его внутрь SVG (data:, 14 КБ)
  async function loadFont(V) {
    if (FONT != null) return FONT;
    try {
      const b = await (await fetch(vend(V, 'font'), { credentials: 'same-origin' })).blob();
      FONT = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result || '')); r.onerror = () => ok(''); r.readAsDataURL(b); });
    } catch { FONT = ''; }
    return FONT;
  }
  const fontCss = (s) => (FONT && /Russo One/.test(s) ? `@font-face{font-family:'Russo One';src:url(${FONT}) format('woff')}` : '');

  /* ---------- SVG → картинка ---------- */
  // строку SVG (из HTML-шаблонов: сущности, без xmlns) — в правильный XML: разбор HTML-парсером внутри <svg> и XMLSerializer
  let probe = null;
  function holder() {
    if (probe && probe.isConnected) return probe;
    probe = document.createElementNS(NS, 'svg');
    probe.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden;pointer-events:none');
    probe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(probe);
    return probe;
  }
  // разметка внутрь <g>: XML и (по желанию) рамка рисунка — getBBox (без толщины линий — запас добавляет вызывающий)
  function measure(inner, box, keepFilter) {
    const p = holder();
    p.innerHTML = `<g>${inner}</g>`;
    const g = p.firstChild;
    // вложенные человечки: размер — из атрибутов (иначе .jl-doodle{width:100%} страницы сжимает их в пробнике), как в SVG-версии
    g.querySelectorAll('svg.jl-doodle').forEach((d) => { const w = d.getAttribute('width'), h = d.getAttribute('height'); if (w) d.style.width = parseFloat(w) + 'px'; if (h) d.style.height = parseFloat(h) + 'px'; d.style.position = 'static'; if (!keepFilter) d.style.filter = 'none'; });
    let bb = null;
    if (box) try { const b = g.getBBox(); if (b.width > 0 && b.height > 0) bb = { x: b.x, y: b.y, w: b.width, h: b.height }; } catch {}
    let x = '';
    for (const n of g.childNodes) x += n.nodeType === 1 ? new XMLSerializer().serializeToString(n) : (n.nodeType === 3 ? ESC(n.nodeValue) : '');
    p.innerHTML = '';
    return { xml: x, bb };
  }
  // кусок мира [x, y, w, h] при k пикселей на единицу → canvas; pad — 1 px «нахлёста» по краям (без швов между плитками)
  async function raster(xml, x, y, w, h, k, pad) {
    const cw = Math.max(1, Math.ceil(w * k)), ch = Math.max(1, Math.ceil(h * k)), W = cw + pad * 2, H = ch + pad * 2;
    const svg = `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${x - pad / k} ${y - pad / k} ${W / k} ${H / k}" preserveAspectRatio="none"><style>${CSS}${fontCss(xml)}</style>${xml}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      return { c, cw, ch, pad };
    } finally { URL.revokeObjectURL(url); }
  }
  function texOf(r) {
    const P = window.PIXI;
    const source = new P.CanvasSource({ resource: r.c });
    return new P.Texture({ source, frame: new P.Rectangle(r.pad, r.pad, r.cw, r.ch) });
  }

  // небо — CSS-градиент сцены (linear-gradient(#a 0%, #b 40%…)) → SVG-градиент на всю высоту мира
  function skyDef(css, H) {
    const m = /linear-gradient\((.*)\)\s*$/i.exec(String(css || '').trim());
    let stops = [];
    if (m) {
      const parts = []; let d = 0, cur = '';
      for (const ch of m[1]) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { parts.push(cur.trim()); cur = ''; } else cur += ch; }
      parts.push(cur.trim());
      const cs = parts.filter((p) => !/^(to\s|[\d.]+deg)/i.test(p)).map((p) => { const q = /^(.*?)(?:\s+([\d.]+)%)?$/.exec(p); return { c: q[1], at: q[2] != null ? +q[2] / 100 : null }; });
      cs.forEach((s, i) => { if (s.at == null) s.at = cs.length > 1 ? i / (cs.length - 1) : 0; });
      stops = cs;
    }
    if (!stops.length) stops = [{ c: /^#[\da-f]{3,8}$/i.test(String(css || '').trim()) ? String(css).trim() : '#0d0b22', at: 0 }];
    return `<linearGradient id="cyglsky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}">${stops.map((s) => `<stop offset="${s.at}" stop-color="${ESC(s.c)}"/>`).join('')}</linearGradient>`;
  }

  /* ---------- подпись над героем: ник, уровень, значки — свой canvas (чётко на любом экране, рисуется один раз) ---------- */
  function labelStyle(host) {
    const st = {};
    try {
      const mk = (cls) => { const d = document.createElement('div'); d.className = cls; d.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0'; d.textContent = 'x'; host.appendChild(d); const cs = getComputedStyle(d); const r = { bg: cs.backgroundColor, color: cs.color, family: cs.fontFamily }; d.remove(); return r; };
      st.other = mk('cy-nm'); st.me = mk('cy-nm me');
      // city.css ещё не применился (подписи без подложки) — те же значения, что в нём
      const none = (c) => !c || /rgba\([^)]*,\s*0\)|transparent/.test(c);
      if (none(st.other.bg)) st.other.bg = 'rgba(15, 12, 34, 0.62)';
      if (none(st.me.bg)) st.me.bg = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '').trim() || '#c81e17';
      st.other.color = st.me.color = '#fff';
    } catch {}
    st.host = host;
    return st;
  }
  const awColors = new Map();
  function awColor(st, t) {
    if (awColors.has(t)) return awColors.get(t);
    let r = { bg: '#8b5cf6', fg: '#fff', ring: false };
    try {
      const nm = document.createElement('div'); nm.className = 'cy-nm'; nm.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0';
      nm.innerHTML = `<span class="awb aw-${String(t).replace(/[^a-z0-9-]/gi, '')}">x</span>`; st.host.appendChild(nm);
      const cs = getComputedStyle(nm.firstChild), tr = /rgba\([^)]*,\s*0\)|transparent/.test(cs.backgroundColor);
      r = { bg: tr ? cs.color : cs.backgroundColor, fg: tr ? cs.color : cs.color, ring: tr };
      nm.remove();
    } catch {}
    awColors.set(t, r);
    return r;
  }
  function labelCanvas(o, st, dpr) {
    const S = (o.mine ? st.me : st.other) || {}, fam = S.family || 'system-ui, sans-serif';
    const k = st.k || 1, fs = 12 * k, px = 7 * k, py = 3 * k, gap = 4 * k, bd = 13 * k;   // 27.10: k - крупнее (оверлей стрима, o.labK)
    const c = document.createElement('canvas'), g = c.getContext('2d');
    const f1 = `700 ${fs}px ${fam}`, f2 = `700 ${(fs * 0.78).toFixed(2)}px ${fam}`;
    g.font = f1; const nw = g.measureText(o.name).width;
    const lv = o.lv ? String(o.lv) : '';
    g.font = f2; const lw = lv ? g.measureText(lv).width : 0;
    const aw = Array.isArray(o.aw) ? o.aw.slice(0, 3) : [];
    const w = Math.ceil(px * 2 + nw + (lv ? gap + lw : 0) + aw.length * (gap + bd)), h = fs + py * 2;
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    g.scale(dpr, dpr);
    g.fillStyle = S.bg || 'rgba(15,12,34,.62)';
    g.beginPath(); const r = h / 2; g.moveTo(r, 0); g.lineTo(w - r, 0); g.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2); g.lineTo(r, h); g.arc(r, r, r, Math.PI / 2, Math.PI * 1.5); g.fill();
    g.fillStyle = S.color || '#fff'; g.textBaseline = 'middle';
    let x = px;
    g.font = f1; g.fillText(o.name, x, h / 2 + 0.5); x += nw;
    if (lv) { x += gap; g.globalAlpha = 0.75; g.font = f2; g.fillText(lv, x, h / 2 + 0.5); g.globalAlpha = 1; x += lw; }
    for (const a of aw) {
      x += gap;
      const col = awColor(st, a.t || a.id || ''), cx = x + bd / 2, cy = h / 2;
      g.beginPath(); g.arc(cx, cy, bd / 2 - (col.ring ? 0.75 : 0), 0, Math.PI * 2);
      if (col.ring) { g.strokeStyle = col.bg; g.lineWidth = 1.5; g.stroke(); } else { g.fillStyle = col.bg; g.fill(); }
      g.fillStyle = col.fg;
      const ic = a.i || '✦';
      if (ic === '✦') {   // звезда значка — тот же контур, что AW_STAR в app.js (62% круга)
        const k = bd * 0.62 / 16; g.save(); g.translate(cx - 8 * k, cy - 8 * k); g.scale(k, k);
        g.fill(new Path2D('M8 0.8 9.7 6.3 15.2 8 9.7 9.7 8 15.2 6.3 9.7 0.8 8 6.3 6.3Z')); g.restore();
      } else { g.font = `700 ${Math.round(bd * 0.62)}px ${fam}`; g.textAlign = 'center'; g.fillText(String(ic), cx, cy + 0.5); g.textAlign = 'start'; }
      x += bd;
    }
    return { c, w, h };
  }

  /* ---------- 20.10: обводка по силуэту — подсветка того, на что навели (здание, наковальня, кузнец) ----------
     В рисунке такие места помечены <g data-ol="id …"> (styles/<стиль>/fair.js, cityart.js). Силуэт — только эти группы
     (с <defs> своего слоя, без свечений-градиентов и анимаций), запечённые в картинку. Контур — силуэт, «раздутый» сдвигами
     на 2,5 px экрана, минус сам силуэт; мягкое свечение — тень холста. Готовится один раз на цель и масштаб (первое наведение),
     дальше это одна готовая картинка: спрайт Pixi между фоном и человечками (или canvas над улицей в SVG-версии) — в кадре
     ничего не пересчитывается, остальные здания ничего не стоят. sources — [{ svg, dx }]: слои и предметы в координатах города. */
  const OL = { line: 2.5, blur: 9, color: '#ffd66e', glow: 'rgba(255, 196, 84, .95)', max: 4000, keep: 4 };
  function outliner(sources) {
    let cuts = null;
    const st = { prep: 0, bakes: 0, bakeMs: 0, px: 0 };   // для проверок (LGCity.debug)
    const cache = new Map();   // "id|k" → { c, x, y, k, tex, on } или Promise
    const ser = (n) => new XMLSerializer().serializeToString(n);
    // все помеченные группы — за один проход по рисунку (несколько десятков мс, один раз за открытие города)
    function prep() {
      if (cuts) return cuts;
      cuts = {};
      const p = holder(), t0 = performance.now();
      try {
        sources.forEach((src, si) => {
          if (!src || !/data-ol=/.test(src.svg)) return;   // предметы без пометок — даже не разбираем
          p.innerHTML = `<g transform="translate(${src.dx || 0} 0)">${src.svg}</g>`;
          p.querySelectorAll('svg.jl-doodle').forEach((d) => { const w = d.getAttribute('width'), h = d.getAttribute('height'); if (w) d.style.width = parseFloat(w) + 'px'; if (h) d.style.height = parseFloat(h) + 'px'; d.style.position = 'static'; d.style.filter = 'none'; });
          // свечения (радиальный градиент, тающий в ноль) и невидимое без анимаций — не часть силуэта
          const glow = new Set([...p.querySelectorAll('radialGradient')].filter((g) => [...g.querySelectorAll('stop')].some((s) => +(s.getAttribute('stop-opacity') ?? 1) === 0)).map((g) => g.id));
          p.querySelectorAll('animate, animateTransform, animateMotion, set').forEach((n) => n.remove());
          p.querySelectorAll('[fill^="url(#"], [opacity="0"]').forEach((n) => { const m = /url\(#([^)]+)\)/.exec(n.getAttribute('fill') || ''); if (n.getAttribute('opacity') === '0' || (m && glow.has(m[1]))) n.remove(); });
          const defs = [...p.querySelectorAll('defs')].map(ser).join('');
          const o = p.getBoundingClientRect();
          for (const el of p.querySelectorAll('[data-ol]')) {
            const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
            // группа с цепочкой предков (вложенные <svg> слоя, сдвиги) — те же координаты, что на улице
            let node = el.cloneNode(true);
            for (let a = el.parentNode; a && a !== p; a = a.parentNode) { const sh = a.cloneNode(false); sh.appendChild(node); node = sh; }
            const bb = [r.left - o.left, r.top - o.top, r.right - o.left, r.bottom - o.top];
            for (const id of el.getAttribute('data-ol').split(/\s+/).filter(Boolean)) {
              const c = cuts[id] || (cuts[id] = { xml: '', defs: '', src: new Set(), bb: [Infinity, Infinity, -Infinity, -Infinity] });
              if (!c.src.has(si)) { c.src.add(si); c.defs += defs; }
              c.xml += ser(node);
              c.bb = [Math.min(c.bb[0], bb[0]), Math.min(c.bb[1], bb[1]), Math.max(c.bb[2], bb[2]), Math.max(c.bb[3], bb[3])];
            }
          }
        });
      } finally { p.innerHTML = ''; st.prep = Math.round(performance.now() - t0); }
      return cuts;
    }
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    // k — пикселей картинки на единицу города (как у фона: масштаб камеры × плотность экрана), z — масштаб камеры
    async function make(cut, k, z) {
      const t0 = performance.now();
      const lw = OL.line / z, bl = OL.blur / z, m = lw + bl * 1.5 + 2;
      const w0 = cut.bb[2] - cut.bb[0] + m * 2, h0 = cut.bb[3] - cut.bb[1] + m * 2;
      k = Math.min(k, OL.max / w0, OL.max / h0);   // не больше лимита текстур
      const x = Math.floor((cut.bb[0] - m) * k) / k, y = Math.floor((cut.bb[1] - m) * k) / k;
      const r = await raster(cut.defs + cut.xml, x, y, w0 + 1 / k, h0 + 1 / k, k, 0);
      const mask = r.c, W = mask.width, H = mask.height, L = lw * k;
      // контур: силуэт, сдвинутый по кругу (два радиуса — без щелей на тонких местах), залитый цветом, минус сам силуэт
      const ring = canvas(W, H), g = ring.getContext('2d');
      const n = Math.max(12, Math.min(32, Math.ceil(L * 5)));
      for (const rr of [L, L * 0.55]) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.drawImage(mask, Math.cos(a) * rr, Math.sin(a) * rr); }
      g.globalCompositeOperation = 'source-in'; g.fillStyle = OL.color; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(mask, 0, 0);
      // свечение — тень контура (наружу; внутрь — чуть-чуть, по краю здания), сверху — чёткая линия
      const out = canvas(W, H), q = out.getContext('2d');
      q.shadowColor = OL.glow; q.shadowBlur = bl * k; q.drawImage(ring, 0, 0); q.shadowBlur = bl * k * 0.45; q.drawImage(ring, 0, 0);
      q.shadowBlur = 0; q.shadowColor = 'transparent';
      q.globalCompositeOperation = 'destination-out'; q.globalAlpha = 0.6; q.drawImage(mask, 0, 0);
      q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1; q.drawImage(ring, 0, 0);
      mask.width = mask.height = 0; ring.width = ring.height = 0;   // память — сразу назад
      st.bakes++; st.bakeMs += performance.now() - t0; st.px = Math.max(st.px, W * H);
      return { c: out, x, y, k, tex: null, on: 0 };
    }
    return {
      prep,
      stats: () => ({ ...st, bakeMs: Math.round(st.bakeMs), ids: cuts ? Object.keys(cuts) : null, cached: cache.size }),
      // готовая обводка цели (из запаса или запечь); null — у цели нет пометок в рисунке
      bake(id, k, z) {
        const cut = prep()[id]; if (!cut) return Promise.resolve(null);
        const key = id + '|' + k.toFixed(3);
        let e = cache.get(key);
        if (e) { cache.delete(key); cache.set(key, e); return Promise.resolve(e); }
        e = make(cut, k, z).then((r) => { cache.set(key, r); trim(); return r; }, (err) => { cache.delete(key); console.warn('[город] обводка', id, err); return null; });
        cache.set(key, e);
        return e;
      },
      clear() { for (const e of cache.values()) if (e && e.tex) try { e.tex.destroy(true); } catch {} cache.clear(); },
    };
    // держим несколько последних (вернулся на то же здание — сразу); показанные сейчас не трогаем
    function trim() {
      for (const [key, e] of cache) {
        if (cache.size <= OL.keep) break;
        if (!e || typeof e.then === 'function' || e.on > 0) continue;
        if (e.tex) try { e.tex.destroy(true); } catch {}
        e.c.width = e.c.height = 0; cache.delete(key);
      }
    }
  }

  /* ---------- сам город ---------- */
  // o: { host (.cy-view), W, H, top, sky (CSS), layers: [{ svg (один корневой <svg x y …>) }], props: [{ svg, x, y, w, h, z, dx }],
  //      mode ('webgl'|'canvas'|'auto'), V (LG_CITYV), labelHost, onDirty (нужен кадр), onFail (Pixi не смог — назад на SVG) }
  function create(o) {
    const P = window.PIXI;
    const G = { mode: '', ok: false, dead: false };
    const dpr = () => Math.min(4, window.devicePixelRatio || 1);
    // 22.10: плотность кадра — экран, но не выше предела (canvas — CANVAS_RES; адаптивное качество city.js понижает дальше: setRes)
    G.qcap = 4;
    const res = () => Math.min(dpr(), G.qcap, G.mode === 'canvas' ? CANVAS_RES : 4);
    const reres = () => { if (renderer && renderer.resolution !== res()) { renderer.resize(Math.max(1, cam.vw), Math.max(1, cam.vh), res()); G.view(cam.x, cam.y, cam.z, cam.vw, cam.vh, true); } };
    let renderer = null, canvas = null, dirty = true;
    let cam = { x: 0, y: 0, z: 0.6, vw: 360, vh: 400 }, k = 1, gen = 0, TS = TILE;
    const stage = new P.Container(), world = new P.Container(), bg = new P.Container(), walk = new P.Container(), names = new P.Container();
    const hl = new P.Container();   // обводка наведённого — над фоном, под человечками и предметами
    walk.sortableChildren = true; names.sortableChildren = true;
    world.addChild(bg, hl, walk, names); stage.addChild(world);
    const lst = labelStyle(o.labelHost || o.host); lst.k = +o.labK || 1;
    const need = () => { dirty = true; if (o.onDirty) o.onDirty(); };

    // слои фона — один раз в XML; небо — градиентом в каждой плитке (плитки непрозрачные: на кадр — одна заливка меньше)
    const layers = o.layers.map((l) => { const m = measure(l.svg, false); return { xml: m.xml, x: l.x, y: l.y, w: l.w, h: l.h }; });
    const sky = skyDef(o.sky, o.H);

    /* --- очередь запекания: по одной картинке за раз (без рывков), сначала то, что в кадре --- */
    const Q = []; let busy = false;
    function job(j) { Q.push(j); pump(); }
    async function pump() {
      if (busy) return; busy = true;
      try {
        while (Q.length && !G.dead) {
          Q.sort((a, b) => a.pri() - b.pri());
          const j = Q.shift();
          if (j.skip && j.skip()) continue;
          try { await j.run(); } catch (e) { console.warn('[город] не запеклось', e); }
        }
      } finally { busy = false; }
    }

    /* --- фон плитками --- */
    const tiles = new Map();   // "i,j" → { spr, gen, used }
    let old = [];              // плитки прошлого масштаба: видны, пока новые не допеклись
    function tileXml(x, y, s) {
      let out = `<defs>${sky}</defs><rect x="${x - 2}" y="${y - 2}" width="${s + 4}" height="${s + 4}" fill="url(#cyglsky)"/>`;
      for (const l of layers) if (l.x < x + s && l.x + l.w > x && l.y < y + s && l.y + l.h > y) out += l.xml;
      return out;
    }
    function wantTiles(vx, vy, vw, vh) {
      const i0 = Math.max(0, Math.floor((vx - TS * 0.25) / TS)), i1 = Math.min(Math.ceil(o.W / TS) - 1, Math.floor((vx + vw + TS * 0.25) / TS));
      const j0 = Math.max(0, Math.floor((Math.max(o.top || 0, vy) - TS * 0.25) / TS)), j1 = Math.min(Math.ceil(o.H / TS) - 1, Math.floor((vy + vh + TS * 0.25) / TS));
      const now = performance.now(), g0 = gen;
      let missing = 0;
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const key = i + ',' + j; let t = tiles.get(key);
        const inView = (i + 1) * TS > vx && i * TS < vx + vw && (j + 1) * TS > vy && j * TS < vy + vh;
        if (t) { t.used = now; if (t.spr) t.spr.visible = true; if (!t.spr && inView) missing++; continue; }
        if (inView) missing++;
        t = { gen: g0, used: now, spr: null };
        tiles.set(key, t);
        const x = i * TS, y = j * TS, s = TS, kk = k;
        job({
          pri: () => { const cx = cam.x + cam.vw / cam.z / 2, cy = cam.y + cam.vh / cam.z / 2; return (inView ? 0 : 5) + Math.hypot(x + s / 2 - cx, y + s / 2 - cy) / 1e5; },
          skip: () => G.dead || g0 !== gen || tiles.get(key) !== t,
          run: async () => {
            const r = await raster(tileXml(x, y, s), x, y, s, s, kk, 1);
            if (G.dead || g0 !== gen || tiles.get(key) !== t) return;
            const spr = new P.Sprite(texOf(r)); spr.position.set(x, y); spr.scale.set(1 / kk);
            t.spr = spr; bg.addChild(spr);
            need();
          },
        });
      }
      // остальные плитки — из кадра (без удаления: вернёмся — не печь заново), сверх бюджета — самые давние
      const pxPer = TILE * TILE;
      if (tiles.size * pxPer > TILE_BUDGET) {
        const far = [...tiles.entries()].filter(([, t]) => t.used < now && t.spr).sort((a, b) => a[1].used - b[1].used);
        while (tiles.size * pxPer > TILE_BUDGET && far.length) { const [key, t] = far.shift(); t.spr.destroy(true); tiles.delete(key); }
      }
      for (const t of tiles.values()) if (t.spr && t.used < now) t.spr.visible = false;
      return missing;
    }

    /* --- предметы с глубиной (колодец, фонари, прилавки): по картинке на предмет, глубина — zIndex (как z-index в SVG-версии) --- */
    const props = o.props.map((p) => ({ ...p, spr: null, gen: -1, q: false, box: [p.x + (p.dx || 0) - 160, p.y - 160, p.w + 320, p.h + 320] }));
    function wantProps(vx, vy, vw, vh) {
      for (const p of props) {
        const [bx, by, bw, bh] = p.box, on = bx < vx + vw && bx + bw > vx && by < vy + vh && by + bh > vy;
        if (p.spr) p.spr.visible = on;
        if (!on || p.gen === gen || p.q) continue;
        p.q = true; const g0 = gen, kk = k;
        job({
          pri: () => 1, skip: () => { if (G.dead || g0 !== gen) { p.q = false; return true; } return false; },
          run: async () => {
            p.q = false;
            if (!p.m) p.m = measure(p.svg, true);
            const b = p.m.bb || { x: p.x, y: p.y, w: p.w, h: p.h };
            // начало картинки — на целом пикселе экрана (чётко, без размытия на полпикселя)
            const x0 = Math.floor((b.x - 8 + (p.dx || 0)) * kk) / kk - (p.dx || 0), y0 = Math.floor((b.y - 8) * kk) / kk;
            const r = await raster(p.m.xml, x0, y0, b.x + b.w + 8 - x0, b.y + b.h + 8 - y0, kk, 1);
            if (G.dead || g0 !== gen) return;
            const spr = new P.Sprite(texOf(r)); spr.position.set(x0 + (p.dx || 0), y0); spr.scale.set(1 / kk); spr.zIndex = p.z;
            if (p.spr) p.spr.destroy(true);
            p.spr = spr; p.gen = g0; p.box = [x0 + (p.dx || 0), y0, r.cw / kk, r.ch / kk];
            walk.addChild(spr);
            need();
          },
        });
      }
    }

    /* --- человечки: картинка — по облику (одинаковые делят одну), шаг — сдвигом, покачивание — поворотом --- */
    const looks = new Map();   // ключ облика → { tex, refs, gen, p (идёт запекание), bb }
    function look(svg) {
      let L = looks.get(svg);
      if (!L) { L = { tex: null, refs: 0, gen: -1, p: null, bb: null, used: 0 }; looks.set(svg, L); }
      return L;
    }
    function bakeLook(svg, L) {
      if (L.p || (o.lookK ? !!L.tex : L.gen === gen)) return;
      const g0 = gen, kk = +o.lookK || k * 1.0;   // 27.10: o.lookK - облики печём один раз в этом масштабе (оверлей: 600 героев не перепекаются на каждый зум)   // крупнее 1:1 человечек в городе не бывает (масштаб глубины ×1,3 ≤ 0,99)
      L.p = true;
      job({
        pri: () => 0.5, skip: () => { if (G.dead || !L.refs) { L.p = null; return true; } return false; },
        run: async () => {
          // человечек 120×170, ноги — (60, 170); шапки, оружие, аура выходят за рамку — берём настоящую рамку рисунка
          const svgA = svg.replace(/<svg\b/, '<svg x="0" y="0" width="120" height="170" overflow="visible"');
          const m = measure(svgA, true, true), b = m.bb || { x: 0, y: 0, w: 120, h: 170 };
          const x0 = b.x - 10, y0 = b.y - 10;
          const r = await raster(m.xml, x0, y0, b.w + 20, b.h + 20, kk, 1);
          L.p = null;
          if (G.dead) return;
          const t = texOf(r);
          if (L.tex) L.tex.destroy(true);
          L.tex = t; L.gen = g0; L.bb = { x: x0, y: y0, k: kk };
          for (const w of walkers) if (w.gl && w.gl.svg === svg) skin(w);
          if (g0 !== gen && L.refs && !o.lookK) bakeLook(svg, L);   // пока пеклось, поменялся масштаб — ещё раз, под новый
          need();
        },
      });
    }
    function skin(w) {
      const L = looks.get(w.gl.svg); const s = w.gl.spr;
      if (!L || !L.tex) { s.visible = false; return; }
      s.texture = L.tex; s.visible = true;
      s.position.set(L.bb.x - 60, L.bb.y - 170); s.scale.set(1 / L.bb.k);   // ноги (60, 170) рисунка — в (0, 0) человечка
    }
    function release(svg) {
      const L = looks.get(svg); if (!L) return;
      L.refs--; L.used = performance.now();
      // ненужные облики: держим до 40 (ушёл и вернулся — без повторного запекания), дальше — самые давние
      const idle = [...looks.entries()].filter(([, x]) => x.refs <= 0);
      if (idle.length > 40) { idle.sort((a, b) => a[1].used - b[1].used); for (const [key, x] of idle.slice(0, idle.length - 40)) { if (x.tex) x.tex.destroy(true); looks.delete(key); } }
    }
    const walkers = new Set();
    function labelTex(w) {
      const d = res(), r = labelCanvas(w.gl.lab, lst, d);
      const t = new P.Texture({ source: new P.CanvasSource({ resource: r.c }) });
      if (w.gl.nm.texture && w.gl.nm.texture !== P.Texture.EMPTY) w.gl.nm.texture.destroy(true);
      w.gl.nm.texture = t; w.gl.lw = r.w; w.gl.lh = r.h; w.gl.ld = d;
    }

    /* --- кружок «иду сюда» --- */
    const rips = [];

    /* --- рендерер: WebGL; нет его (или он программный — SwiftShader) — canvas 2D; не вышло — city.js вернёт SVG --- */
    const pref = o.mode === 'canvas' ? ['canvas'] : ['webgl', 'canvas'];
    const ready = (async () => {
      await loadFont(o.V);
      try { await Promise.race([document.fonts && document.fonts.ready, new Promise((ok) => setTimeout(ok, 1500))]); } catch {}
      const make = (preference) => P.autoDetectRenderer({
        preference, failIfMajorPerformanceCaveat: o.mode !== 'webgl',
        width: Math.max(1, cam.vw), height: Math.max(1, cam.vh), resolution: res(), autoDensity: true,
        background: '#0d0b22', antialias: false, powerPreference: 'low-power', clearBeforeRender: true,
        eventMode: 'none', eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
      });
      renderer = await make(pref);
      // WebGL без видеокарты (Chrome сам переходит на программный SwiftShader) — втрое тяжелее canvas: берём canvas
      if (renderer.name !== 'canvas' && o.mode !== 'webgl') {
        let soft = false;
        try { const gl = renderer.gl, ext = gl.getExtension('WEBGL_debug_renderer_info'); soft = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER))); } catch {}
        if (soft) { G.soft = true; try { renderer.destroy(); } catch {} renderer = await make(['canvas']); }
      }
      if (G.dead) { renderer.destroy(); return; }
      // Pixi сам заводит «системный» таймер (requestAnimationFrame каждый кадр — для уборки памяти и событий мыши);
      // нам он не нужен: кадры рисуем сами и только по делу, картинки удаляем сами — в покое ни одного кадра
      try { for (const T of [P.Ticker.system, P.Ticker.shared]) { T.autoStart = false; T.stop(); } } catch {}
      G.mode = renderer.name === 'canvas' ? 'canvas' : 'webgl';
      reres();   // canvas — плотность не выше CANVAS_RES (картинки — сразу под неё)
      canvas = renderer.canvas;
      canvas.className = 'cy-gl';
      canvas.setAttribute('aria-hidden', 'true');
      o.host.insertBefore(canvas, o.host.firstChild);
      canvas.addEventListener('webglcontextrestored', () => need());
      G.ok = true;
      need();
    })().catch((e) => { console.warn('[город] Pixi не запустился — SVG', e); if (!G.dead && o.onFail) o.onFail(String(e && e.message || e)); });

    // плохая производительность canvas-режима (очень медленная машина): кадр дольше 60 мс подряд — назад на SVG
    let slow = 0, frames = 0;
    G.ready = ready;
    G.view = (x, y, z, vw, vh, now) => {
      const resized = vw !== cam.vw || vh !== cam.vh;
      cam = { x, y, z, vw: vw || cam.vw, vh: vh || cam.vh };
      if (renderer && (resized || renderer.resolution !== res())) renderer.resize(cam.vw, cam.vh, res());
      // масштаб картинок = масштаб камеры × плотность экрана; поменялся заметно (поворот телефона, другое окно) — перепечь
      const nk = Math.min(K_MAX, Math.max(0.3, z * res()));
      if (Math.abs(nk / k - 1) > 0.004 || gen === 0) {
        clearTimeout(G.rk);
        const go = () => {
          k = nk; gen++; TS = TILE / k;
          for (const t of tiles.values()) if (t.spr) old.push(t);
          tiles.clear();
          if (!o.lookK) for (const w of walkers) if (w.gl) bakeLook(w.gl.svg, look(w.gl.svg));
          for (const w of walkers) if (w.gl && w.gl.ld !== res()) labelTex(w);
          need();
        };
        if (gen === 0 || now) go(); else G.rk = setTimeout(go, 250);   // окно тянут — не печь на каждом шаге
      }
      dirty = true;
    };
    G.add = (w, svg, lab) => {
      const root = new P.Container(), body = new P.Container(), bob = new P.Container(), spr = new P.Sprite(), nm = new P.Sprite();
      bob.pivot.set(0, -85); bob.position.set(0, -85);
      bob.addChild(spr); body.addChild(bob); root.addChild(body);
      spr.visible = false;
      w.gl = { root, body, bob, spr, nm, svg, lab, ph: Math.random() * 10 };
      if (lab.gh) body.alpha = 0.75;
      walk.addChild(root); names.addChild(nm);
      if (lab.mine) nm.zIndex = 1;
      walkers.add(w);
      const L = look(svg); L.refs++;
      if (L.tex && (o.lookK || L.gen === gen)) skin(w); else { if (L.tex) skin(w); bakeLook(svg, L); }
      labelTex(w);
      dirty = true;
    };
    G.relook = (w, svg, lab) => {
      if (!w.gl) return;
      if (svg !== w.gl.svg) { release(w.gl.svg); w.gl.svg = svg; const L = look(svg); L.refs++; if (L.tex) skin(w); if (!L.tex || (!o.lookK && L.gen !== gen)) bakeLook(svg, L); }
      if (lab && JSON.stringify(lab) !== JSON.stringify(w.gl.lab)) { w.gl.lab = lab; labelTex(w); }
      dirty = true;
    };
    // в кадре (с запасом на рост и ник) — по нему решаем, нужен ли новый кадр: шаги за краем экрана кадров не тратят
    const inView = (x, y) => { const vw = cam.vw / cam.z, vh = cam.vh / cam.z; return x > cam.x - 160 && x < cam.x + vw + 160 && y + 40 > cam.y && y - 280 < cam.y + vh; };
    // 23.10: значок звания в подписи (ник у Pixi — картинка): где значок i героя w в координатах сцены, и какой значок под точкой (x, y) —
    // для подсказки по тапу и наведению. Та же раскладка, что в labelCanvas: значки — в конце подписи (отступ 7, шаг 4 + 13), круг 13
    const awOfW = (w) => { const g = w.gl, aw = g && g.lab && Array.isArray(g.lab.aw) ? g.lab.aw.slice(0, 3) : null; return aw && aw.length && g.lw ? aw : null; };
    function badgeXY(w, i, n) {
      const g = w.gl, z = cam.z, L = w.x - g.lw / z / 2;
      return { x: L + (g.lw - 7 - (n - 1 - i) * 17 - 6.5) / z, y: w.y - (w.lift || 128) * (g.sc || 1) - 4 - g.lh / z / 2, r: 6.5 / z };
    }
    G.badgeOf = (w, i = 0) => { const aw = w && awOfW(w); return aw && aw[i] ? { a: aw[i], l: w.l, i, ...badgeXY(w, i, aw.length) } : null; };
    G.badgeAt = (x, y, pad = 6) => {
      const z = cam.z; let hit = null;
      for (const w of walkers) {
        const aw = awOfW(w); if (!aw || !w.gl.nm.visible) continue;
        for (let i = 0; i < aw.length; i++) {
          const b = badgeXY(w, i, aw.length);
          if (Math.abs(y - b.y) <= (w.gl.lh / 2 + pad) / z && Math.abs(x - b.x) <= (6.5 + pad) / z && (!hit || w.mine)) hit = { a: aw[i], l: w.l, i, ...b };
        }
      }
      return hit;
    };
    G.place = (w, sc) => {
      const g = w.gl; if (!g) return;
      g.root.position.set(w.x, w.y);
      g.root.zIndex = Math.round(w.y) + (w.mine ? 1 : 0);
      g.body.scale.set(w.face * sc, sc);
      g.sc = sc;
      if (!w.cull && (g.root.visible || inView(w.x, w.y))) dirty = true;   // шаги убранных и тех, кто за краем, кадров не тратят
    };
    // 23.10: проявление чужого (встал на место после большого расхождения, новенький, вернулся в ближние) — герой и ник
    G.alpha = (w, a) => { const g = w.gl; if (!g || g.root.alpha === a) return; g.root.alpha = a; g.nm.alpha = a; if (!w.cull && (g.root.visible || inView(w.x, w.y))) dirty = true; };
    G.moving = (w, on) => { if (w.gl) { w.gl.mv = on; if (!on) { w.gl.bob.position.y = -85; w.gl.bob.rotation = 0; } dirty = true; } };
    G.remove = (w) => {
      const g = w.gl; if (!g) return;
      walkers.delete(w); release(g.svg);
      g.root.destroy({ children: true });
      if (g.nm.texture && g.nm.texture !== P.Texture.EMPTY) g.nm.texture.destroy(true);
      g.nm.destroy(); w.gl = null; dirty = true;
    };
    G.ripple = (x, y) => {
      const r = new P.Graphics().ellipse(0, 0, 28, 9).stroke({ width: 4, color: 0xffffff });
      r.position.set(x, y); r.zIndex = Math.round(y) - 1; r.alpha = 0.9; r.scale.set(0.3);
      walk.addChild(r); rips.push({ r, t0: performance.now() });
      dirty = true;
    };
    // обводка наведённого (готовая картинка из outliner): плавно появляется за 150 мс, прежняя так же тает
    const ols = [];   // { s, e, a0, a1, t0 }
    G.outline = (e) => {
      const cur = ols.find((o) => o.a1 === 1);
      if (cur && cur.e === e) return;
      const now = performance.now();
      for (const o of ols) if (o.a1 === 1) { o.a0 = o.s.alpha; o.a1 = 0; o.t0 = now; }
      if (e) {
        if (!e.tex) e.tex = new P.Texture({ source: new P.CanvasSource({ resource: e.c }) });
        const s = new P.Sprite(e.tex); s.position.set(e.x, e.y); s.scale.set(1 / e.k); s.alpha = 0;
        hl.addChild(s); e.on++;
        ols.push({ s, e, a0: 0, a1: 1, t0: now });
      }
      need();
    };
    G.dirty = () => { dirty = true; };
    // 22.10: адаптивное качество (city.js): предел плотности кадра — перепечь картинки под неё; покачивание чужих на ходу — вкл/выкл
    G.setRes = (cap) => { G.qcap = Math.max(1, +cap || 4); reres(); dirty = true; };
    G.busy = () => busy || Q.length > 0;   // печём картинки (кадры в это время реже — адаптивное качество их не считает)
    G.res = () => res();
    G.noBob = false;
    G.setBob = (on) => { G.noBob = !on; if (!on) for (const w of walkers) if (w.gl && !w.mine) { w.gl.bob.position.y = -85; w.gl.bob.rotation = 0; } dirty = true; };
    // кадр: возвращает true, если нужен следующий (кто-то качается на ходу, кружок ещё тает, плитки кадра не допеклись)
    G.render = (t, reduce) => {
      if (!renderer || G.dead) return false;
      t = t || performance.now();
      let more = false;
      for (const w of walkers) {
        const g = w.gl; if (!g || !g.mv || reduce || !g.root.visible || (G.noBob && !w.mine)) continue;
        // покачивание на ходу — как cyBob в city.css: вверх на 7 px и поворот на 2°, 0,42 с туда и обратно
        const u = ((t / 420) + g.ph) % 2, p0 = u < 1 ? u : 2 - u, p = p0 * p0 * (3 - 2 * p0);
        g.bob.position.y = -85 - 7 * p; g.bob.rotation = 2 * Math.PI / 180 * p;
        more = true; dirty = true;
      }
      for (let i = rips.length - 1; i >= 0; i--) {
        const R = rips[i], a = Math.min(1, (t - R.t0) / 650), e = 1 - Math.pow(1 - a, 2);
        R.r.scale.set(0.3 + 0.9 * e); R.r.alpha = 0.9 * (1 - a);
        if (a >= 1) { R.r.destroy(); rips.splice(i, 1); } else more = true;
        dirty = true;
      }
      for (let i = ols.length - 1; i >= 0; i--) {
        const o = ols[i], u = reduce ? 1 : Math.min(1, (t - o.t0) / (o.a1 ? 150 : 120)), e = 1 - (1 - u) * (1 - u);
        const a = o.a0 + (o.a1 - o.a0) * e;
        if (a !== o.s.alpha) { o.s.alpha = a; dirty = true; }
        if (u < 1) more = true;
        else if (!o.a1) { o.s.destroy(); o.e.on--; ols.splice(i, 1); dirty = true; }
      }
      if (!dirty) return more;
      dirty = false;
      const z = cam.z, d = res(), vx = cam.x, vy = cam.y, vw = cam.vw / z, vh = cam.vh / z;
      // камера — на целый пиксель экрана: плитки фона ложатся пиксель в пиксель (без мыла)
      world.scale.set(z); world.position.set(Math.round(-vx * z * d) / d, Math.round(-vy * z * d) / d);
      const missing = wantTiles(vx, vy, vw, vh);
      if (!missing && old.length) { for (const q of old) q.spr.destroy(true); old = []; }   // новый масштаб допёкся — старые плитки не нужны
      wantProps(vx, vy, vw, vh);
      for (const w of walkers) {
        const g = w.gl; if (!g) continue;
        // 22.10: cull — адаптивное качество убрало его с экрана (дальние, когда кадр не успевает); nolab — без подписи
        const on = !w.cull && inView(w.x, w.y);
        g.root.visible = on; g.nm.visible = on && !w.nolab;
        if (!on) continue;
        // ник — над головой, одного размера на экране при любом масштабе, на целом пикселе (чётко)
        const sc = g.sc || 1, k2 = z * d;
        g.nm.scale.set(1 / (z * g.ld));
        g.nm.position.set(Math.round((w.x - g.lw / z / 2) * k2) / k2, Math.round((w.y - (w.lift || 128) * sc - 4 - g.lh / z) * k2) / k2);
      }
      const t0 = performance.now();
      renderer.render(stage);
      const dt = performance.now() - t0;
      G.nf = (G.nf || 0) + 1; G.ms = (G.ms || 0) + dt;
      if (G.mode === 'canvas' && ++frames > 10) { slow = dt > 60 ? slow + 1 : 0; if (slow > 20 && o.onFail) { o.onFail('медленно: ' + dt.toFixed(0) + ' мс на кадр'); return false; } }
      return more || missing > 0;
    };
    G.stats = () => ({ nf: G.nf, ms: G.ms, js: G.js, looks: looks.size, baked: [...looks.values()].filter((x) => x.tex).length, tiles: tiles.size, tilesBaked: [...tiles.values()].filter((t) => t.spr).length, props: props.filter((p) => p.spr).length, queue: Q.length, k, gen,
      walkers: [...walkers].slice(0, 3).map((w) => ({ x: w.x, y: w.y, vis: w.gl && w.gl.root.visible, sv: w.gl && w.gl.spr.visible, tex: w.gl && w.gl.spr.texture && w.gl.spr.texture.width, pos: w.gl && [w.gl.spr.x, w.gl.spr.y, w.gl.spr.scale.x] })) });
    G.hide = (on) => { if (canvas) canvas.style.visibility = on ? 'hidden' : ''; if (!on) dirty = true; };
    G.destroy = () => {
      if (G.dead) return; G.dead = true;
      try { for (const L of looks.values()) if (L.tex) L.tex.destroy(true); } catch {}
      try { stage.destroy({ children: true, texture: true, textureSource: true }); } catch {}
      try { if (renderer) renderer.destroy({ removeView: true }); } catch {}
      if (probe) { probe.remove(); probe = null; }
    };
    return G;
  }

  window.LGCityGL = { load, create, skyDef, outliner };   // skyDef — и сцене «Заточка» (кусок улицы в city.js)
})();
