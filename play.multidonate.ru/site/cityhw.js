/* 28.10 (hw-city): «Ночь Тыквенной Луны» в ГОРОДЕ канала - общий рисунок для оверлея (fair/client/ovcity.js) и вкладки «Город» сайта
   (city.js): хэллоуинское убранство по зданиям города и портал на месте ворот. Один файл - один рисунок у стрима и у зрителей.
   Работает для любого города (Ярмарка «Города», лагерь «Перепутье», город края) и любого стиля: места - из зданий города
   (packages/world citymap / campmap / towngen: BUILDINGS - hit, door), рамка портала - стиля (styles/<стиль>/fair.js → hw.frame),
   нет её - каменная арка. Реквизит (тыквы-фонари, гирлянды, паутина, свечи, привидения, котёл, ведьма, летучие мыши) - тот же, что
   у убранства Ярмарки коллеги (fair/client/portal.js), перенесён сюда.
   Что отдаёт:
     items(sc, o)  - вещи по одной: { x, y, svg (вокруг 0,0), t (секунда превращения), k (pop | drop | grow | fade | spark | zap), g, z } -
                     для сцены превращения (оверлей: каждая вещь - свой крошечный слой с анимацией transform / opacity);
     props(sc, o)  - то же убранство неподвижными предметами с глубиной для citygl (запекаются в картинки один раз, кадр их не рисует заново);
     portal(sc, o) - портал у ворот предметами citygl: задник, воронка (spin - оверлей её медленно крутит; сайт - нет) и рамка;
     portalSvg(o)  - портал целиком (вокруг 0,0) - для слоя «портал разворачивается» на оверлее;
     at(sc)        - где портал: { x, y, s } (низ - у земли ворот, по центру прохода);
     npcSpots(sc)  - где стоят НПС ивента (рисунок и окна - hwnpc.js): [{ id, x, y }] - только Ярмарка «Города» (sc.fair), иначе пусто.
   28.10 (hw-city-dead): «мёртвый» город Изнанки. Город в хэллоуинском виде печётся «мёртвым» (citygl setDead): по умолчанию - перекраска
   обычного рисунка при запекании (deadPaint: обесцветить, затемнить, огни погасить), убранство и портал - прямо в мёртвых плитках (art).
   ДОГОВОР С ХУДОЖНИКОМ (свой мёртвый рисунок вместо перекраски; геометрия - OBST, AREA, DOORS, hit, обводки data-ol - одна для обоих видов):
     • styles/<стиль>/fair.js, блок hw: необязательное поле dead = {
         scene(o)  - та же сигнатура и размеры, что scene (o.city, o.magic, o.magicName), мёртвый вид, огней нет (кроме тыкв и конфет);
         props     - массив той же длины и порядка, что props стиля (те же x/y/w/h/z, id и data-ol групп), у каждого svg();
         sky       - необязательно: CSS-градиент неба («linear-gradient(...)»), иначе - небо Изнанки по умолчанию };
     • legacy/site/public/cityart.js: quarter(style, QW, { dead: true }) может вернуть мёртвый квартал гильдий - объект с флагом dead: true
       (svg и props той же раскладки); стиль не умеет - вернёт обычный без флага, тогда перекраска;
     • есть мёртвый вариант - печётся как есть, БЕЗ перекраски; нет - перекраска. Волна превращения переходит на любой из них (маска круга).
   Перепутье (лагерь) и города края в ивенте не участвуют (решение стримера 28.10): превращение - только в Ярмарке «Города».
   Стенд художника: node scripts/proto/serve.ts → /overlay-sbx.html?mode=fair&style=cats&city=fair&look=hwdead (оверлей 1920, город сразу
   превращён) и /site-city.html?style=cats&hw=lp (вкладка «Город» сайта, телефон).
   Проходимость: всё - у стен зданий (низ вещи выше полосы, где ходят: y < AREA.y0) или внутри их препятствий (Торговые ряды) - на дорожки
   не выходит; гирлянды и ведьма - в воздухе. Без filter. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LGCityHW = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const INK = '#15122e';
  const f1 = (n) => (Math.round(n * 10) / 10).toString();
  const O = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- реквизит (как в fair/client/portal.js) ---------- */
  const lantern = (x, y, s = 1, f = 0) => { const w = 30 * s, h = 24 * s, cy = y - h;
    return `<ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(w * 3.4)}" ry="${f1(h * 2.8)}" fill="#ff9a2a" opacity=".1"/><ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(w * 2)}" ry="${f1(h * 1.7)}" fill="#ffb347" opacity=".22"/><path d="M${f1(x)} ${f1(cy - h)} q${f1(2 * s)} ${f1(-10 * s)} ${f1(9 * s)} ${f1(-11 * s)}" stroke="#4e7a2e" stroke-width="${f1(5 * s)}" fill="none" stroke-linecap="round"/><ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(w)}" ry="${f1(h)}" fill="#ff7a1a" ${O(3)}/>`
      + `<path d="M${f1(x - w * 0.42)} ${f1(cy - h * 0.9)} q${f1(-7 * s)} ${f1(h * 0.9)} 0 ${f1(h * 1.8)} M${f1(x + w * 0.42)} ${f1(cy - h * 0.9)} q${f1(7 * s)} ${f1(h * 0.9)} 0 ${f1(h * 1.8)}" stroke="#c4520e" stroke-width="${f1(2.4 * s)}" fill="none"/>`
      + `<path d="${f % 2 ? `M${f1(x - w * 0.5)} ${f1(cy - h * 0.1)} l${f1(w * 0.18)} ${f1(-h * 0.34)} l${f1(w * 0.18)} ${f1(h * 0.34)} z M${f1(x + w * 0.14)} ${f1(cy - h * 0.1)} l${f1(w * 0.18)} ${f1(-h * 0.34)} l${f1(w * 0.18)} ${f1(h * 0.34)} z` : `M${f1(x - w * 0.46)} ${f1(cy - h * 0.34)} h${f1(w * 0.3)} l${f1(-w * 0.15)} ${f1(h * 0.3)} z M${f1(x + w * 0.16)} ${f1(cy - h * 0.34)} h${f1(w * 0.3)} l${f1(-w * 0.15)} ${f1(h * 0.3)} z`} M${f1(x - w * 0.55)} ${f1(cy + h * 0.2)} q${f1(w * 0.55)} ${f1(h * 0.5)} ${f1(w * 1.1)} 0 l${f1(-w * 0.18)} ${f1(h * 0.12)} l${f1(-w * 0.18)} ${f1(-h * 0.12)} l${f1(-w * 0.18)} ${f1(h * 0.14)} l${f1(-w * 0.18)} ${f1(-h * 0.14)} l${f1(-w * 0.18)} ${f1(h * 0.12)} z" fill="#ffd34d" ${O(1.6)}/>`; };
  const pumpkin = (x, y, s = 1, c = '#ff7a1a') => `<ellipse cx="${f1(x)}" cy="${f1(y - 20 * s)}" rx="${f1(28 * s)}" ry="${f1(20 * s)}" fill="${c}" ${O(2.6)}/><path d="M${f1(x - 11 * s)} ${f1(y - 38 * s)} q${f1(-6 * s)} ${f1(18 * s)} 0 ${f1(36 * s)} M${f1(x + 11 * s)} ${f1(y - 38 * s)} q${f1(6 * s)} ${f1(18 * s)} 0 ${f1(36 * s)}" stroke="#c4520e" stroke-width="${f1(2 * s)}" fill="none"/><path d="M${f1(x)} ${f1(y - 40 * s)} q${f1(2 * s)} ${f1(-8 * s)} ${f1(8 * s)} ${f1(-9 * s)}" stroke="#4e7a2e" stroke-width="${f1(4 * s)}" fill="none" stroke-linecap="round"/>`;
  const candle = (x, y, s = 1) => `<rect x="${f1(x - 4 * s)}" y="${f1(y - 18 * s)}" width="${f1(8 * s)}" height="${f1(18 * s)}" fill="#efe6d2" ${O(1.8)}/><ellipse cx="${f1(x)}" cy="${f1(y - 24 * s)}" rx="${f1(3.6 * s)}" ry="${f1(6.4 * s)}" fill="#ffd34d"/><circle cx="${f1(x)}" cy="${f1(y - 22 * s)}" r="${f1(14 * s)}" fill="#ffd34d" opacity=".14"/>`;
  const bat = (x, y, s = 1, c = '#1c1424') => `<path d="M${f1(x)} ${f1(y)} q${f1(-10 * s)} ${f1(-12 * s)} ${f1(-26 * s)} ${f1(-6 * s)} q${f1(6 * s)} ${f1(4 * s)} ${f1(4 * s)} ${f1(10 * s)} q${f1(8 * s)} ${f1(-6 * s)} ${f1(14 * s)} ${f1(2 * s)} q${f1(4 * s)} ${f1(-6 * s)} ${f1(8 * s)} ${f1(-6 * s)} q${f1(4 * s)} 0 ${f1(8 * s)} ${f1(6 * s)} q${f1(6 * s)} ${f1(-8 * s)} ${f1(14 * s)} ${f1(-2 * s)} q${f1(-2 * s)} ${f1(-6 * s)} ${f1(4 * s)} ${f1(-10 * s)} q${f1(-16 * s)} ${f1(-6 * s)} ${f1(-26 * s)} ${f1(6 * s)} z" fill="${c}"/>`;
  function web(x, y, rad, sx, sy) {
    let s = ''; const A = [0, 0.25, 0.5, 0.75, 1].map((t) => (t * Math.PI) / 2);
    for (const a of A) s += `<path d="M${f1(x)} ${f1(y)} L${f1(x + sx * Math.cos(a) * rad)} ${f1(y + sy * Math.sin(a) * rad)}" stroke="#e8e0f4" stroke-width="1.6" opacity=".7"/>`;
    for (let k = 1; k <= 4; k++) { const rr = (rad * k) / 4.4; let d = ''; A.forEach((a, i) => { d += (i ? ` Q${f1(x + sx * Math.cos(a - 0.4) * rr * 0.86)} ${f1(y + sy * Math.sin(a - 0.4) * rr * 0.86)} ` : 'M') + `${f1(x + sx * Math.cos(a) * rr)} ${f1(y + sy * Math.sin(a) * rr)}`; }); s += `<path d="${d}" stroke="#e8e0f4" stroke-width="1.4" fill="none" opacity=".6"/>`; }
    return s + `<path d="M${f1(x + sx * rad * 0.5)} ${f1(y + sy * rad * 0.2)} v${f1(sy * 26)}" stroke="#e8e0f4" stroke-width="1.2"/><circle cx="${f1(x + sx * rad * 0.5)}" cy="${f1(y + sy * rad * 0.2 + sy * 32)}" r="6" fill="#1c1424"/>`;
  }
  // гирлянда флажков от (0,0) до (dx,dy), провис sag: тыква / фиолетовый / чёрный с летучей мышью
  function bunting(dx, dy, sag, seed) {
    const r = rng(seed); let s = `<path d="M0 0 Q${f1(dx / 2)} ${f1(dy / 2 + sag * 2)} ${f1(dx)} ${f1(dy)}" stroke="${INK}" stroke-width="3" fill="none"/>`;
    const n = Math.max(3, Math.round(Math.hypot(dx, dy) / 46));
    for (let i = 1; i < n; i++) { const t = i / n, x = dx * t, yy = dy * t + sag * 4 * t * (1 - t), k = i % 3, c = k === 0 ? '#ff7a1a' : k === 1 ? '#7b3fe4' : '#1c1424';
      s += `<path d="M${f1(x - 13)} ${f1(yy)} h26 l-13 26 z" fill="${c}" ${O(1.8)}/>` + (k === 2 ? bat(x, yy + 12, 0.42, '#ff9a2a') : k === 0 ? `<path d="M${f1(x - 5)} ${f1(yy + 6)} l3 -4 l3 4 z M${f1(x + 2)} ${f1(yy + 6)} l3 -4 l3 4 z" fill="${INK}"/>` : '');
      if (r() < 0.12) s += `<circle cx="${f1(x)}" cy="${f1(yy + 3)}" r="4" fill="#6dffb0"/>`;
    }
    return s;
  }
  // 28.10 (hw-city-dead): конфеты на верёвке вместо флажков - единственные (кроме тыкв) яркие пятна мёртвого города
  const CANDY_C = ['#ff5aa8', '#ff8a1f', '#9b5cff', '#6dffb0', '#ffd34d'];
  function candyArt(i) {
    const c = CANDY_C[i % CANDY_C.length], c2 = CANDY_C[(i + 2) % CANDY_C.length], k = i % 3;
    if (k === 0) return `<path d="M0 0 v10" stroke="${INK}" stroke-width="2"/><g transform="translate(0 22) rotate(${(i % 2 ? 18 : -18)})"><path d="M-14 0 l-10 -9 v18 z M14 0 l10 -9 v18 z" fill="${c2}" ${O(1.8)}/><ellipse rx="15" ry="11" fill="${c}" ${O(2.2)}/><path d="M-7 -9 q4 9 0 18 M2 -11 q4 11 0 22" stroke="#fff" stroke-width="2.4" fill="none" opacity=".75"/></g>`;
    if (k === 1) return `<path d="M0 0 v6" stroke="${INK}" stroke-width="2"/><path d="M0 6 v44" stroke="#efe6d2" stroke-width="4" stroke-linecap="round"/><circle cy="26" r="16" fill="${c}" ${O(2.2)}/><path d="M0 26 m-10 0 a10 10 0 1 1 10 10 a6 6 0 1 1 -6 -6" stroke="#fff" stroke-width="3" fill="none" opacity=".85"/>`;
    return `<path d="M0 0 v6" stroke="${INK}" stroke-width="2"/><path d="M-10 14 a10 10 0 0 1 20 0 V54" stroke="${INK}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M-10 14 a10 10 0 0 1 20 0 V54" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-10 14 a10 10 0 0 1 20 0 V54" stroke="#e8455c" stroke-width="7" fill="none" stroke-dasharray="6 6"/>`;
  }
  function candyRope(dx, dy, sag, seed) {
    let s = `<path d="M0 0 Q${f1(dx / 2)} ${f1(dy / 2 + sag * 2)} ${f1(dx)} ${f1(dy)}" stroke="#2b2430" stroke-width="3" fill="none"/>`;
    const n = Math.max(3, Math.round(Math.hypot(dx, dy) / 60));
    for (let i = 1; i < n; i++) { const t = i / n, x = dx * t, yy = dy * t + sag * 4 * t * (1 - t); s += `<g transform="translate(${f1(x)} ${f1(yy)}) scale(.75)">${candyArt(i + seed)}</g>`; }
    return s;
  }
  // трещины по стене (тёмные зигзаги с ветками) и лозы, ползущие от низа здания вверх
  function cracks(w, h, seed) {
    const r = rng(seed); let s = '';
    for (let k = 0; k < 3; k++) { let x = (r() - 0.5) * w * 0.8, y = -h * (0.25 + r() * 0.5), d = `M${f1(x)} ${f1(y)}`; for (let i = 0; i < 5; i++) { x += (r() - 0.5) * 30; y += 14 + r() * 20; d += ` L${f1(x)} ${f1(y)}`; }
      s += `<path d="${d}" stroke="#07080c" stroke-width="3.2" fill="none" stroke-linejoin="round" opacity=".85"/><path d="${d}" stroke="#4a5068" stroke-width="1" fill="none" opacity=".35" transform="translate(1.5 0)"/>`; }
    return s;
  }
  // голое мёртвое дерево (тёмный силуэт): ствол и ветки по зерну, низ - 0,0
  function deadTree(h, seed) {
    const r = rng(seed); let s = '';
    const br = (x, y, a, len, w, d) => { if (d > 4 || len < 10) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; s += `<path d="M${f1(x)} ${f1(y)} Q${f1((x + x2) / 2 + (r() - 0.5) * len * 0.3)} ${f1((y + y2) / 2)} ${f1(x2)} ${f1(y2)}" stroke="#14141c" stroke-width="${f1(w)}" fill="none" stroke-linecap="round"/>`;
      const n = d < 2 ? 3 : 2; for (let i = 0; i < n; i++) br(x2, y2, a + (r() - 0.5) * 1.3, len * (0.55 + r() * 0.2), w * 0.62, d + 1); };
    br(0, 0, -Math.PI / 2 + (r() - 0.5) * 0.2, h * 0.42, Math.max(6, h * 0.05), 0);
    return `<ellipse cx="0" cy="2" rx="${f1(h * 0.12)}" ry="5" fill="#0a0a10" opacity=".5"/>` + s;
  }
  const ghost = (s = 1) => `<g transform="scale(${s})"><path d="M0 -6 v10" stroke="${INK}" stroke-width="2"/><path d="M-22 60 C-24 0 24 0 22 60 q-4 -8 -8 0 q-4 -8 -7 0 q-4 -8 -7 0 q-4 -8 -7 0 q-4 -8 -8 0 Z" fill="#f4f8ff" ${O(2.6)}/><ellipse cx="-7" cy="22" rx="3.6" ry="5.4" fill="${INK}"/><ellipse cx="6" cy="22" rx="3.6" ry="5.4" fill="${INK}"/><ellipse cx="-1" cy="36" rx="4" ry="5" fill="${INK}"/></g>`;
  const cauldron = () => `<ellipse cy="0" rx="48" ry="10" fill="${INK}" opacity=".3"/><path d="M-30 0 l-8 12 M30 0 l8 12" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M-46 -52 Q-50 0 0 2 Q50 0 46 -52 Z" fill="#2a2434" ${O(3)}/><ellipse cy="-52" rx="48" ry="12" fill="#3a3448" ${O(3)}/><ellipse cy="-54" rx="40" ry="8" fill="#6dffb0"/><path d="M-30 -30 q10 6 22 0" stroke="#4a4458" stroke-width="3" fill="none"/><path d="M-60 -6 h120" stroke="#ff8a1f" stroke-width="5" opacity=".6"/><path d="M-30 -6 q6 -16 12 0 q6 -14 12 0 q6 -18 12 0 q6 -12 12 0" fill="#ffb347" opacity=".8"/>`
    + `<circle cx="-14" cy="-66" r="6" fill="#9dffc8" ${O(1.4)}/><circle cx="6" cy="-74" r="4.5" fill="#9dffc8" ${O(1.2)}/>`;
  const witch = () => `<path d="M-60 10 L60 -4" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-60 10 L60 -4" stroke="#8a5a32" stroke-width="4" stroke-linecap="round"/><path d="M52 -10 l30 -8 l-4 14 l8 8 l-32 0 z" fill="#d8b860" ${O(2)}/><path d="M-14 4 Q-22 -40 0 -46 Q22 -40 18 4 Z" fill="#1c1424"/><circle cx="-2" cy="-54" r="12" fill="#1c1424"/><path d="M-26 -58 Q0 -66 22 -58 L12 -58 Q4 -86 -6 -94 Q-6 -76 -16 -58 Z" fill="#1c1424"/><path d="M-10 6 l-8 16 M8 4 l4 16" stroke="#1c1424" stroke-width="5" stroke-linecap="round"/>`;
  const spark = (s = 1) => `<g transform="scale(${s})">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = i * Math.PI / 4; return `<path d="M${f1(Math.cos(a) * 18)} ${f1(Math.sin(a) * 18 - 24)} L${f1(Math.cos(a) * 40)} ${f1(Math.sin(a) * 40 - 24)}" stroke="${i % 2 ? '#ffd34d' : '#6dffb0'}" stroke-width="4" stroke-linecap="round"/>`; }).join('')}<circle cy="-24" r="10" fill="#fff6c8" opacity=".9"/></g>`;

  /* ---------- 28.10 (hw-city-light, стример 22:37): тыква-фонарь и её свет ----------
     Рисунок в стиле игры: плоские тона, светлая плоскость сверху, тень снизу, толстый контур; объёмные рёбра (5 долек), черенок с листом и
     усиком, вырезанное лицо с толщиной стенки (тёмная кромка, под ней светящееся нутро - ярче в центре), 4 рожицы. Свет - мягкий радиальный
     спад (градиент в запечённой картинке, без filter): ореол, тёплое пятно на земле, вытянутое по перспективе, и блик на стене за тыквой.
     Всё печётся в мёртвые плитки; живое - только мерцание у нескольких тыкв (ovcity: до 8, сайт: до 3, только opacity/scale). */
  const LIGHT_DEFS = '<defs>'
    + '<radialGradient id="hwcGl"><stop offset="0" stop-color="#ffae48" stop-opacity=".62"/><stop offset=".3" stop-color="#ff8a24" stop-opacity=".3"/><stop offset=".65" stop-color="#ff6a14" stop-opacity=".09"/><stop offset="1" stop-color="#ff6a14" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="hwcIn" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#fff8c8"/><stop offset=".4" stop-color="#ffd84a"/><stop offset="1" stop-color="#ff8a1f"/></radialGradient>'
    + '<radialGradient id="hwcPool"><stop offset="0" stop-color="#ffa03c" stop-opacity=".5"/><stop offset=".55" stop-color="#ff7a1a" stop-opacity=".16"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="hwcRed"><stop offset="0" stop-color="#ff3a2a" stop-opacity=".5"/><stop offset=".5" stop-color="#c8283a" stop-opacity=".16"/><stop offset="1" stop-color="#8a2040" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="hwcDeep" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#050307"/><stop offset=".55" stop-color="#1a0a12"/><stop offset=".85" stop-color="#3a1620"/><stop offset="1" stop-color="#5a2028"/></radialGradient>'
    + '</defs>';
  // свет тыквы (рисуется ДО неё): блик на стене, ореол, пятно на земле; s - размер, k - сила
  const glowOf = (s, k = 1) => `<ellipse cx="0" cy="${f1(-80 * s)}" rx="${f1(70 * s)}" ry="${f1(90 * s)}" fill="url(#hwcGl)" opacity="${f1(0.5 * k)}"/><circle cx="0" cy="${f1(-30 * s)}" r="${f1(82 * s)}" fill="url(#hwcGl)" opacity="${f1(k)}"/><ellipse cx="${f1(6 * s)}" cy="${f1(10 * s)}" rx="${f1(92 * s)}" ry="${f1(20 * s)}" fill="url(#hwcPool)" opacity="${f1(k)}"/>`;
  // вырезанное лицо: кромка стенки (тёмная, чуть больше) и светящееся нутро
  const FACES = [
    (s) => [`M${f1(-20 * s)} ${f1(-34 * s)} l${f1(9 * s)} ${f1(-11 * s)} l${f1(9 * s)} ${f1(11 * s)} z M${f1(2 * s)} ${f1(-34 * s)} l${f1(9 * s)} ${f1(-11 * s)} l${f1(9 * s)} ${f1(11 * s)} z M${f1(-6 * s)} ${f1(-27 * s)} l${f1(6 * s)} ${f1(-6 * s)} l${f1(6 * s)} ${f1(6 * s)} z`, `M${f1(-22 * s)} ${f1(-19 * s)} q${f1(22 * s)} ${f1(17 * s)} ${f1(44 * s)} 0 l${f1(-6 * s)} ${f1(7 * s)} l${f1(-6 * s)} ${f1(-4 * s)} l${f1(-5 * s)} ${f1(6 * s)} l${f1(-5 * s)} ${f1(-6 * s)} l${f1(-5 * s)} ${f1(6 * s)} l${f1(-6 * s)} ${f1(-4 * s)} l${f1(-5 * s)} ${f1(6 * s)} z`],
    (s) => [`M${f1(-21 * s)} ${f1(-36 * s)} h${f1(15 * s)} l${f1(-7 * s)} ${f1(11 * s)} z M${f1(6 * s)} ${f1(-36 * s)} h${f1(15 * s)} l${f1(-7 * s)} ${f1(11 * s)} z`, `M${f1(-20 * s)} ${f1(-20 * s)} h${f1(40 * s)} q${f1(-4 * s)} ${f1(14 * s)} ${f1(-20 * s)} ${f1(14 * s)} q${f1(-16 * s)} 0 ${f1(-20 * s)} ${f1(-14 * s)} z`],
    (s) => [`M${f1(-15 * s)} ${f1(-38 * s)} a${f1(6.5 * s)} ${f1(7.5 * s)} 0 1 0 0.1 0 z M${f1(15 * s)} ${f1(-38 * s)} a${f1(6.5 * s)} ${f1(7.5 * s)} 0 1 0 0.1 0 z`, `M${f1(-12 * s)} ${f1(-20 * s)} q${f1(12 * s)} ${f1(-6 * s)} ${f1(24 * s)} 0 q${f1(-2 * s)} ${f1(12 * s)} ${f1(-12 * s)} ${f1(12 * s)} q${f1(-10 * s)} 0 ${f1(-12 * s)} ${f1(-12 * s)} z`],
    (s) => [`M${f1(-22 * s)} ${f1(-40 * s)} l${f1(16 * s)} ${f1(5 * s)} l${f1(-6 * s)} ${f1(8 * s)} z M${f1(22 * s)} ${f1(-40 * s)} l${f1(-16 * s)} ${f1(5 * s)} l${f1(6 * s)} ${f1(8 * s)} z`, `M${f1(-24 * s)} ${f1(-22 * s)} q${f1(24 * s)} ${f1(22 * s)} ${f1(48 * s)} 0 q${f1(-24 * s)} ${f1(6 * s)} ${f1(-48 * s)} 0 z`],
  ];
  // тыква-фонарь: низ - 0,0 (стоит на земле), s - размер (1 ≈ 76 px в ширину), f - рожица, lit - светится
  function jack(s = 1, f = 0, lit = true, hue = 0) {
    const C1 = ['#e8661a', '#d9581a', '#f07020'][hue % 3], C2 = ['#ff8a2a', '#f07a2a', '#ff9638'][hue % 3], CD = '#a8420e', w = 2.8;
    const cy = -30 * s, ry = 29 * s;
    let b = `<ellipse cx="${f1(2 * s)}" cy="${f1(1 * s)}" rx="${f1(38 * s)}" ry="${f1(7 * s)}" fill="#05030a" opacity=".55"/>`;   // тень на земле
    // дольки: крайние темнее, средняя светлее - объём
    for (const [dx, rx, c] of [[-22, 17, C1], [22, 17, C1], [-11, 18, C2], [11, 18, C2], [0, 16, C2]]) b += `<ellipse cx="${f1(dx * s)}" cy="${f1(cy)}" rx="${f1(rx * s)}" ry="${f1(ry)}" fill="${c}" stroke="${INK}" stroke-width="${w}"/>`;
    b += `<path d="M${f1(-30 * s)} ${f1(-14 * s)} Q0 ${f1(4 * s)} ${f1(30 * s)} ${f1(-14 * s)} Q${f1(20 * s)} ${f1(-2 * s)} 0 ${f1(-1 * s)} Q${f1(-20 * s)} ${f1(-2 * s)} ${f1(-30 * s)} ${f1(-14 * s)} Z" fill="${CD}" opacity=".55"/>`;   // тень снизу
    b += `<path d="M${f1(-16 * s)} ${f1(-52 * s)} Q0 ${f1(-60 * s)} ${f1(16 * s)} ${f1(-52 * s)} Q0 ${f1(-55 * s)} ${f1(-16 * s)} ${f1(-52 * s)} Z" fill="#ffb060" opacity=".75"/>`;   // светлая плоскость сверху
    // черенок, лист, усик
    b += `<path d="M${f1(-3 * s)} ${f1(-56 * s)} q${f1(1 * s)} ${f1(-10 * s)} ${f1(9 * s)} ${f1(-14 * s)} l${f1(3 * s)} ${f1(4 * s)} q${f1(-5 * s)} ${f1(4 * s)} ${f1(-5 * s)} ${f1(11 * s)} z" fill="#5a7a2e" stroke="${INK}" stroke-width="${f1(2.2)}" stroke-linejoin="round"/>`
      + `<path d="M${f1(4 * s)} ${f1(-62 * s)} q${f1(12 * s)} ${f1(-10 * s)} ${f1(22 * s)} ${f1(-2 * s)} q${f1(-10 * s)} ${f1(8 * s)} ${f1(-22 * s)} ${f1(2 * s)} z" fill="#6a9a36" stroke="${INK}" stroke-width="2"/>`
      + `<path d="M${f1(-4 * s)} ${f1(-60 * s)} q${f1(-12 * s)} ${f1(-4 * s)} ${f1(-10 * s)} ${f1(-12 * s)} q${f1(2 * s)} ${f1(-5 * s)} ${f1(6 * s)} ${f1(-2 * s)}" stroke="#5a7a2e" stroke-width="${f1(1.8)}" fill="none" stroke-linecap="round"/>`;
    const [eyes, mouth] = FACES[f % FACES.length](s), cut = eyes + ' ' + mouth;
    b += `<path d="${cut}" fill="#4a1c06" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;   // кромка стенки
    b += `<g transform="translate(${f1(1.2 * s)} ${f1(1.6 * s + cy * 0.14)}) scale(.86)"><path d="${cut}" fill="${lit ? 'url(#hwcIn)' : '#2a1206'}"/></g>`;   // нутро (чуть меньше и ниже - видна толщина стенки)
    return (lit ? glowOf(s) : '') + b;
  }
  // группа тыкв: 1 - одна, 2 - пара (большая и малая), 3 - стопка (малая на большой) и рядом ещё одна
  function jackGroup(n, s, seed) {
    const r = rng(seed), f = () => Math.floor(r() * 4), h = () => Math.floor(r() * 3);
    if (n <= 1) return jack(s, f(), true, h());
    if (n === 2) return jack(s, f(), true, h()) + `<g transform="translate(${f1(44 * s)} ${f1(2 * s)})">${jack(s * 0.68, f(), true, h())}</g>`;
    return jack(s, f(), true, h()) + `<g transform="translate(${f1(2 * s)} ${f1(-52 * s)})">${jack(s * 0.6, f(), true, h()).replace(/<ellipse[^>]*opacity="\.55"\/>/, '')}</g>` + `<g transform="translate(${f1(-46 * s)} ${f1(2 * s)})">${jack(s * 0.72, f(), true, h())}</g>`;
  }

  /* ---------- портал (воронка как в portal.js swirl, рамка - стиля) ---------- */
  // 27.10 (стример): портал в городе - разрыв «на ту сторону»: внутри красно-серое мерцание, края в лозах (своя Изнанка, без чужих узнаваемых вещей)
  const SWIRL = () => { let s = ''; for (let k = 0; k < 4; k++) s += `<path d="M0 -170 m${-80 + k * 12} 0 a${80 - k * 12} ${140 - k * 24} 0 1 1 ${f1((80 - k * 12) * 1.6)} 30" stroke="${k % 2 ? '#9aa4b8' : '#ff4a3a'}" stroke-width="${8 - k}" fill="none" stroke-linecap="round" opacity="${f1(0.85 - k * 0.12)}"/>`; return s; };
  // лозы-корни: ветвистые тёмные плети с шипами из точки (0,0) в сторону (dx, dy) - по зерну
  function vine(dx, dy, seed, w = 7) {
    const r = rng(seed), n = 7; let x = 0, y = 0, d = 'M0 0', th = '';
    for (let i = 1; i <= n; i++) { const t = i / n, nx = dx * t + (r() - 0.5) * 40 * (1 - t * 0.5), ny = dy * t + (r() - 0.5) * 26; d += ` Q${f1((x + nx) / 2 + (r() - 0.5) * 30)} ${f1((y + ny) / 2 + (r() - 0.5) * 20)} ${f1(nx)} ${f1(ny)}`;
      if (r() < 0.7) th += `<path d="M${f1(nx)} ${f1(ny)} l${f1((r() - 0.5) * 22)} ${f1(-6 - r() * 14)}" stroke="#2a1a24" stroke-width="2.4" stroke-linecap="round"/>`;
      if (r() < 0.35) { const bx = nx + (r() - 0.5) * 70, by = ny + (r() - 0.5) * 50; th += `<path d="M${f1(nx)} ${f1(ny)} Q${f1((nx + bx) / 2 + 10)} ${f1((ny + by) / 2 - 8)} ${f1(bx)} ${f1(by)}" stroke="#241824" stroke-width="${f1(w * 0.45)}" fill="none" stroke-linecap="round"/>`; }
      x = nx; y = ny; }
    return `<path d="${d}" stroke="#120c16" stroke-width="${f1(w + 3)}" fill="none" stroke-linecap="round" opacity=".55"/><path d="${d}" stroke="#2e1e2c" stroke-width="${f1(w)}" fill="none" stroke-linecap="round"/>${th}`;
  }
  const VINES = () => vine(-120, -40, 3, 8) + vine(118, -60, 5, 8) + vine(-96, -300, 9, 6) + vine(100, -320, 11, 6) + vine(-40, -380, 13, 5) + `<ellipse cx="0" cy="-170" rx="98" ry="166" fill="none" stroke="#2e1e2c" stroke-width="9" stroke-dasharray="26 14" opacity=".85"/>`;
  /* 28.10 (hw-city-light): портал - рваный разрыв «на ту сторону»: свет на земле и воротах (холодный красный), рваный край с красной кромкой,
     глубина (темнеет к центру), корни в землю; живое (оверлей, Pixi): 2 слоя воронки в разные стороны, частицы, втягивающиеся по спирали,
     пульс сердцевины - 4 спрайта, только поворот и прозрачность. На сайте - всё неподвижно (в мёртвых плитках) */
  function riftEdge(rx, ry, seed, jag) { const r = rng(seed), n = 34; let d = ''; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 1 + (i % 2 ? jag * (0.4 + r()) : -jag * 0.3 * r()); d += `${i ? 'L' : 'M'}${f1(Math.cos(a) * rx * k)} ${f1(-170 + Math.sin(a) * ry * k)} `; } return d + 'Z'; }
  const RIFT = () => `<ellipse cx="0" cy="6" rx="260" ry="40" fill="url(#hwcRed)"/><ellipse cx="0" cy="-170" rx="250" ry="290" fill="url(#hwcRed)" opacity=".55"/>`
    + `<path d="${riftEdge(112, 186, 7, 0.16)}" fill="#120810" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="${riftEdge(100, 172, 9, 0.1)}" fill="url(#hwcDeep)"/><path d="${riftEdge(100, 172, 9, 0.1)}" fill="none" stroke="#ff3a2a" stroke-width="3.5" opacity=".7" stroke-linejoin="round"/>`
    + `<path d="${riftEdge(104, 178, 13, 0.12)}" fill="none" stroke="#9aa4b8" stroke-width="1.6" opacity=".35"/>`;
  // слои воронки: внешний (красно-серый, медленно), внутренний (быстрее, в другую сторону), частицы-пепел по спирали, пульс сердцевины
  // круги (не эллипсы): слой вращается целиком и не должен вылезать за края разрыва (rx 100)
  const arc = (r, a0, sweep, col, w, op) => { const x0 = Math.cos(a0) * r, y0 = -170 + Math.sin(a0) * r, a1 = a0 + sweep, x1 = Math.cos(a1) * r, y1 = -170 + Math.sin(a1) * r; return `<path d="M${f1(x0)} ${f1(y0)} A${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${op}"/>`; };
  const SWIRL_A = () => arc(86, 0, 4.2, '#d83a32', 6, '.7') + arc(72, 2.2, 3.6, '#8a94aa', 4.5, '.55') + arc(60, 4.1, 3.2, '#d83a32', 3.5, '.5');
  const SWIRL_B = () => arc(46, 1, 3.8, '#b8c0d0', 4, '.55') + arc(34, 3.6, 3.4, '#ff6a4a', 3, '.5') + arc(22, 0.4, 3, '#b8c0d0', 2.4, '.45');
  const MOTES = () => { let s = ''; for (let i = 0; i < 22; i++) { const a = i * 0.9, rr = 10 + i * 3.6; s += `<circle cx="${f1(Math.cos(a) * rr)}" cy="${f1(-170 + Math.sin(a) * rr)}" r="${f1(1.4 + (i % 4) * 0.5)}" fill="${i % 3 ? '#c8ccd8' : '#ff7a5a'}" opacity="${f1(0.35 + (i / 22) * 0.5)}"/>`; } return s; };
  const CORE = () => `<ellipse cx="0" cy="-170" rx="34" ry="62" fill="url(#hwcRed)"/><ellipse cx="0" cy="-168" rx="12" ry="24" fill="#ffb0a0" opacity=".25"/>`;
  const ROOTS = () => vine(-120, -40, 3, 8) + vine(118, -60, 5, 8) + vine(-96, -300, 9, 6) + vine(100, -320, 11, 6) + vine(-40, -380, 13, 5) + vine(-60, 30, 15, 7) + vine(70, 26, 17, 7);
  // тыква-«замок» над разрывом (тёплый акцент)
  const KEY = () => `<g transform="translate(0 -352)">${jack(1.05, 3, true, 0)}</g>`;
  const BACK = () => `<ellipse cx="0" cy="0" rx="130" ry="18" fill="#ff4a3a" opacity=".22"/><ellipse cx="0" cy="-170" rx="130" ry="200" fill="#ff5a4a" opacity=".1"/><ellipse cx="0" cy="-170" rx="92" ry="160" fill="#2a161c" ${O(4)}/><ellipse cx="0" cy="-170" rx="60" ry="118" fill="#5a3438" opacity=".55"/>`;
  function defaultFrame(state) {
    let s = `<path d="M-120 0 V-200 Q-120 -360 0 -372 Q120 -360 120 -200 V0 H90 V-200 Q90 -330 0 -340 Q-90 -330 -90 -200 V0 Z" fill="#6a6274" ${O(4)}/>`;
    for (let k = 0; k < 9; k++) { const a = Math.PI * (0.05 + k * 0.1125), x = Math.cos(a) * 105, y = -200 - Math.sin(a) * 155; s += `<path d="M${f1(x)} ${f1(y)} l${f1(Math.cos(a) * 14)} ${f1(-Math.sin(a) * 14)}" stroke="#4a4454" stroke-width="3"/>`; }
    return s + lantern(0, -330, 1, 0) + (state === 'open' ? candle(-104, 4, 1.2) + candle(104, 4, 1.2) : '');
  }
  const frameOf = (o, state) => { try { const f = o && typeof o.frame === 'function' ? o.frame(state) : ''; return f || defaultFrame(state); } catch (e) { return defaultFrame(state); } };
  const FRONT_L = () => `${ROOTS()}${KEY()}`;
  const FRONT = (o) => `<ellipse cx="0" cy="-170" rx="34" ry="56" fill="#ff8a1f" opacity=".45"/>${lantern(0, -150, 1.1, 1)}${frameOf(o, 'open')}${VINES()}`;
  function portalSvg(o) { return LIGHT_DEFS + RIFT() + `<g class="frhw-swirl" style="transform-origin:0px -170px">${SWIRL_A()}</g>` + CORE() + `<g opacity=".38">${frameOf(o, 'open')}</g>` + FRONT_L(); }

  /* ---------- где что ---------- */
  const DECOR = ['hall', 'auction', 'trainer', 'forge', 'tent', 'shop', 'magic', 'gate', 'storage'];   // доска, наковальня, шахта - на открытой земле, там ничего не ставим
  const TOP = 170;   // верх неба, который не показываем (как TOP в city.js, ovcity.js)
  // низ здания (земля у стены): не ниже полосы, где ходят (AREA.y0); у зданий нижней улицы (Склад) и у Торговых рядов Ярмарки - их собственный
  // низ (там до низа - препятствие). У рядов лагеря перед прилавками ходят - убранство выше полосы.
  // 29.10 (деревни ★1 вручную, PR #77): здание ниже по улице (основание намного ниже полосы, верх может быть и выше её) - тоже свой низ
  const baseOf = (b, A, fair) => (b.hit[2] >= A.y0 || b.hit[3] > A.y0 + 100 || (fair && b.id === 'shop') ? b.hit[3] : Math.min(b.hit[3], A.y0)) - 2;
  const gateOf = (sc) => (sc.B || []).find((b) => b.id === 'gate') || null;
  // портал - в проходе ворот: низ - по низу рисунка ворот (hit), не ниже полосы, где ходят (у Ярмарки ворота стоят выше площади)
  function at(sc) { const g = gateOf(sc); if (!g) return null; return { x: g.door.x, y: Math.min(g.hit[3], sc.AREA.y0) - 4, s: 0.74 }; }
  // HW-NPC: НПС ивента - «Ступа сладостей» (hwshop) и Призрачный Фонарщик (hwpass), рисунок и окна - hwnpc.js. Решение стримера 27.10:
  // только Ярмарка «Города» в хэллоуинском виде (Перепутье и города края - без них; когда - решают city.js / ovcity.js по виду города);
  // место - средняя улица у канала правее Шахты (выбор стримера по концепту): не на дорожках, не в дверях, далеко от портала и его лоз,
  // левее вебки оверлея. x, y - середина низа (земля), координаты города
  const NPC_FAIR = [{ id: 'hwshop', x: 2805, y: 1420 }, { id: 'hwpass', x: 3125, y: 1414 }];
  function npcSpots(sc) { return sc && sc.fair ? NPC_FAIR.map((o) => ({ ...o })) : []; }

  function items(sc, o = {}) {
    const A = sc.AREA, B = (sc.B || []).filter((b) => DECOR.includes(b.id)).sort((a, b) => a.hit[0] - b.hit[0]);
    const P = at(sc), gx = P ? P.x : (A.x0 + A.x1) / 2, span = Math.max(1200, A.x1 - A.x0);
    const it = [], r = rng(2026);
    const T = (x, d = 0) => Math.min(8.8, 2 + d + (Math.abs(x - gx) / span) * 6.2);   // волна от ворот к краям города: 2…9 с сцены (решение стримера 27.10)
    const add = (x, y, svg, t, k, g, z) => it.push({ x: Math.round(x), y: Math.round(y), svg, t: +t.toFixed(2), k, g, z });
    B.forEach((b, i) => {
      const y0 = baseOf(b, A, sc.fair), x0 = b.hit[0], x1 = b.hit[1], w = x1 - x0, top = Math.max(TOP + 40, b.hit[2]), h = Math.max(120, y0 - top), g = 'b:' + b.id;
      if (b.id === 'gate') {   // ворота: портал посередине (portal()), по бокам - фонари, свечи и котёл (низ - как у портала)
        const y0 = P ? P.y + 2 : baseOf(b, A, sc.fair);
        // 28.10 (hw-city-light): у портала - стопки тыкв по бокам (тёплые акценты рядом с холодным разрывом)
        for (const [dx, n, sd] of [[-150, 3, 11], [150, 3, 12]]) add(gx + dx, y0, jackGroup(n, 1.25, sd), 9.6 + Math.abs(dx) / 1000, 'light', g, y0);
        if (w > 360) for (const [x, sd] of [[x0 + 40, 13], [x1 - 40, 14]]) add(x, y0, jackGroup(1, 1.05, sd), T(x, 0.4), 'light', g, y0);
        add(x0 + 6, top + h * 0.12, web(0, 0, 96, 1, 1), 2.4, 'grow', g, y0);
        return;
      }
      // тыквы-фонари группами у входа (по бокам двери) и у углов здания; стоят на земле у стены
      const dx = b.door ? b.door.x : (x0 + x1) / 2, dl = Math.max(x0 + 50, dx - 110), dr = Math.min(x1 - 50, dx + 110);
      add(dl, y0, jackGroup(i % 2 ? 2 : 3, 1.15, 31 + i), T(dl), 'light', g, y0);
      if (dr - dl > 140) add(dr, y0, jackGroup(i % 2 ? 3 : 2, 1.1, 41 + i), T(dr), 'light', g, y0);
      if (w > 420) add(i % 2 ? x1 - 40 : x0 + 40, y0, jackGroup(1, 0.95, 51 + i), T(x0 + w / 2, 0.3), 'light', g, y0);
      if (b.id === 'shop' && w > 700) for (let x = x0 + 300; x < x1 - 240; x += 380) add(x, y0, jackGroup(x % 3 ? 1 : 2, 1, x), T(x, 0.2), 'light', g, y0);
      // мёртвое здание: трещины по стене, лоза от низа
      add(x0 + w * (0.3 + r() * 0.4), y0, cracks(w, h, 61 + i), T(x0 + w / 2, 0.2), 'fade', g, y0);
      add(i % 2 ? x0 + 14 : x1 - 14, y0, vine(i % 2 ? 26 : -26, -Math.min(h * 0.7, 300), 71 + i, 5) + vine(i % 2 ? 60 : -60, -40, 81 + i, 4), T(x0, 0.1), 'grow', g, y0);
      add(i % 2 ? x1 - 6 : x0 + 6, top + h * 0.18, web(0, 0, 60 + r() * 30, i % 2 ? -1 : 1, 1), T(x0, 0.5), 'grow', g, y0);
    });
    // гирлянды флажков между соседними зданиями (в воздухе) и привидения на них
    for (let i = 0; i + 1 < B.length; i++) {
      const a = B[i], b = B[i + 1], gap = b.hit[0] - a.hit[1];
      if (gap < 40 || gap > 760 || Math.abs(baseOf(a, A, sc.fair) - baseOf(b, A, sc.fair)) > 80) continue;
      const ya = Math.max(TOP + 70, a.hit[2] + (baseOf(a, A, sc.fair) - a.hit[2]) * 0.36), yb = Math.max(TOP + 70, b.hit[2] + (baseOf(b, A, sc.fair) - b.hit[2]) * 0.36);
      const x1 = a.hit[1] - 24, x2 = b.hit[0] + 24, g = 'w:' + a.id + ':' + b.id;
      add(x1, ya, candyRope(x2 - x1, yb - ya, 22, 7 + i), T((x1 + x2) / 2, 0.5), 'unroll', g, 0);
      if (i % 2 === 0) add((x1 + x2) / 2, (ya + yb) / 2 + 40, ghost(0.8), T((x1 + x2) / 2, 1.2), 'fly', g, 0);
      // мёртвое дерево в проходе между зданиями (у стены, выше полосы, где ходят)
      if (gap >= 110) { const ty = Math.min(baseOf(a, A, sc.fair), baseOf(b, A, sc.fair)); add((a.hit[1] + b.hit[0]) / 2, ty, deadTree(Math.min(300, Math.max(160, ty - Math.max(a.hit[2], b.hit[2]) * 0.9)), 91 + i), T((x1 + x2) / 2, 0.3), 'grow', 't:' + i, ty - 1); }
    }
    // лозы от портала: по земле перед воротами (плоский рисунок - позади всех, кто идёт) и по стенам ближайших зданий
    if (P) {
      add(P.x, baseOf(gateOf(sc), A, sc.fair) + 4, vine(-560, 26, 21, 9) + vine(540, 34, 23, 9) + vine(-300, 58, 25, 6) + vine(320, 62, 27, 6), 2.0, 'creep', 'vine', 0);
      const near = B.filter((b) => b.id !== 'gate').map((b) => ({ b, d: Math.min(Math.abs(b.hit[1] - P.x), Math.abs(b.hit[0] - P.x)) })).sort((a, c) => a.d - c.d).slice(0, 2);
      for (const { b } of near) { const left = b.hit[1] < P.x, wx = left ? b.hit[1] - 18 : b.hit[0] + 18, y0 = baseOf(b, A, sc.fair);
        add(wx, y0, vine(left ? -60 : 60, -Math.min(260, (y0 - b.hit[2]) * 0.6), 31 + b.hit[0] % 7, 7) + vine(left ? -110 : 110, -40, 33, 6), 3.0, 'grow', 'b:' + b.id, y0); }
    }
    // ведьма на метле и летучие мыши - в небе над воротами (вправо)
    if (P) {
      const wy = TOP + 90;
      add(gx + 380, wy, witch(), 6.4, 'fly', 'sky', 1);
      add(gx + 240, wy + 40, `${bat(0, 0, 1.2)}${bat(56, -26, 0.9)}${bat(108, 8, 1)}`, 5.2, 'fly', 'sky', 1);
      add(gx - 420, wy + 20, `${bat(0, 0, 1)}${bat(-60, -18, 0.8)}`, 5.8, 'fly', 'sky', 1);
    }
    // приметы стиля (щиты Легиона с тыквой, коты на крышах…) - только на Ярмарке «Города»: они нарисованы под её площадь
    // 28.10 (hw-city-light): приметы стиля (щиты, коты на крышах, тыквы с ушками) нарисованы под площадь стрима - в городе они висели в воздухе; не ставим
    // искры у тыкв при появлении и молния в ворота (только сцена превращения - в неподвижное убранство не идут)
    for (const q of it.slice()) if (q.k === 'light' && r() < 0.4) add(q.x, q.y - 30, spark(0.7), q.t, 'spark', 'fx', q.z);
    // две молнии (красно-белые): 0 с - в район ворот, 9 с - прямо в ворота (там раскрывается портал)
    if (P) for (const [zt, dx0, sd] of [[0.05, -260, 41], [9, -120, 43]]) { const zr = rng(sd); let d = `M${dx0} ` + f1(TOP - 40 - P.y), zx = dx0, zy = TOP - 40 - P.y; while (zy < -160) { zy += 40 + zr() * 40; zx += (0 - zx) * 0.3 + (zr() - 0.5) * 50; d += ` L${f1(zx)} ${f1(Math.min(-160, zy))}`; }
      add(P.x, P.y, `<path d="${d} L0 -150" stroke="#ff2a2a" stroke-width="24" fill="none" opacity=".55" stroke-linejoin="round"/><path d="${d} L0 -150" stroke="#fff4f0" stroke-width="7" fill="none" stroke-linejoin="round"/><ellipse cy="-130" rx="130" ry="96" fill="#ffd8d0" opacity=".55"/>`, zt, 'zap', 'fx', P.y); }
    return it;
  }
  const svgAt = (q) => `<g transform="translate(${q.x} ${q.y})">${q.svg}</g>`;
  // неподвижное убранство: по предмету на здание (глубина - низ здания: все, кто стоит на улице, - впереди), гирлянды и небо - позади всех
  function props(sc, o = {}) {
    const G = new Map();
    for (const q of items(sc, o)) { if (q.k === 'spark' || q.k === 'zap') continue; const e = G.get(q.g) || { z: q.z, list: [] }; e.list.push(q); G.set(q.g, e); }
    const out = [];
    for (const [g, e] of G) {
      const xs = e.list.map((q) => q.x), ys = e.list.map((q) => q.y);
      const x0 = Math.min(...xs) - (g === 'vine' ? 700 : 160), x1 = Math.max(...xs) + (g === 'style' ? 3800 : g.startsWith('w:') ? 800 : g === 'vine' ? 700 : 160), y0 = Math.min(...ys) - 260, y1 = Math.max(...ys) + (g === 'style' ? 1080 : 60);
      out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, z: e.z, dx: 0, svg: e.list.map(svgAt).join(''), hw: g });
    }
    return out;
  }
  /* 28.10 (hw-city-dead): убранство и портал - прямо в мёртвых плитках города (citygl setDeadArt): under - перекрашивается вместе с городом
     (рамка портала стиля), over - поверх перекраски как есть (тыквы, конфеты, трещины, лозы, деревья, задник портала). Всё это ниже полосы,
     где ходят, - позади всех героев, поэтому отдельные картинки с глубиной не нужны: кадр их не рисует. o.portal - портал открыт;
     o.spin - воронку и тыкву в портале (живое на оверлее) не печь: их рисует portalLive */
  function art(sc, o = {}) {
    // тыквы (и их свет) - последними: лозы, трещины, деревья - под ними (28.10, hw-city-light)
    const its = items(sc, o).filter((q) => q.k !== 'spark' && q.k !== 'zap'), lit = (q) => (q.k === 'light' ? 1 : 0);
    let over = LIGHT_DEFS + its.slice().sort((a, b) => lit(a) - lit(b)).map(svgAt).join(''), under = '';
    const P = o.portal ? at(sc) : null;
    if (P) { const T0 = `translate(${P.x} ${P.y}) scale(${P.s})`; under = `<g transform="${T0}">${frameOf(o, 'open')}</g>`; over = LIGHT_DEFS + `<g transform="${T0}">${RIFT()}${o.spin ? '' : SWIRL_A() + SWIRL_B() + MOTES() + CORE()}<g opacity=".38">${frameOf(o, 'open')}</g>${FRONT_L()}</g>` + over; }   // рамка: перекрашенная + её приглушённый цвет поверх (видна, но не светит)
    return { under, over };
  }
  // живые слои портала (оверлей): 2 воронки в разные стороны, частицы по спирали (быстро), пульс сердцевины - 4 спрайта Pixi
  function portalLive(sc, o = {}) {
    const P = at(sc); if (!P) return [];
    const k = P.s, T0 = `translate(${P.x} ${P.y}) scale(${k})`, box = { x: P.x - 140, y: P.y - 330, w: 280, h: 330 }, c = [P.x, P.y - 170 * k];
    return [
      { ...box, z: P.y - 0.5, dx: 0, svg: LIGHT_DEFS + `<g transform="${T0}">${CORE()}</g>`, hw: 'portal', pulse: [0.55, 1, 2.6] },
      { ...box, z: P.y - 0.45, dx: 0, svg: `<g transform="${T0}">${SWIRL_A()}</g>`, hw: 'portal', spin: c, spinV: 0.7 },
      { ...box, z: P.y - 0.4, dx: 0, svg: `<g transform="${T0}">${SWIRL_B()}</g>`, hw: 'portal', spin: c, spinV: -1.6 },
      { ...box, z: P.y - 0.35, dx: 0, svg: `<g transform="${T0}">${MOTES()}</g>`, hw: 'portal', spin: c, spinV: 2.4 },
    ];
  }
  // портал у ворот: три предмета (задник, воронка, рамка) - низ у земли ворот, позади всех, кто стоит перед воротами
  function portal(sc, o = {}) {
    const P = at(sc); if (!P) return [];
    const k = P.s, T0 = `translate(${P.x} ${P.y}) scale(${k})`, box = { x: P.x - 160, y: P.y - 420, w: 320, h: 450 };
    return [
      { ...box, z: P.y - 0.6, dx: 0, svg: LIGHT_DEFS + `<g transform="${T0}">${RIFT()}${CORE()}${SWIRL_B()}${MOTES()}</g>`, hw: 'portal' },
      { ...box, z: P.y - 0.4, dx: 0, svg: `<g transform="${T0}">${SWIRL_A()}</g>`, hw: 'portal', ...(o.spin ? { spin: [P.x, P.y - 170 * k] } : {}) },
      // рамка стиля - тоже «мёртвая» (перекраска при запекании, paint): неон рамок стилей не спорит с тыквами
      { ...box, z: P.y - 0.3, dx: 0, svg: `<g transform="${T0}">${frameOf(o, 'open')}</g>`, hw: 'portal', paint: true },
      { ...box, z: P.y - 0.2, dx: 0, svg: LIGHT_DEFS + `<g transform="${T0}">${FRONT_L()}</g>`, hw: 'portal' },
    ];
  }

  // живое мерцание огня - только у n тыкв, ближайших к воротам (остальной свет запечён): слой в координатах города, только opacity/scale
  function flickers(sc, n = 8) {
    const P = at(sc), gx = P ? P.x : 0;
    const it = items(sc, {}).filter((q) => q.k === 'light').sort((a, b) => Math.abs(a.x - gx) - Math.abs(b.x - gx)).slice(0, n);
    css();
    const d = (typeof document !== 'undefined') ? document.createElement('div') : null; if (!d) return null;
    d.className = 'hwc-fls';
    d.innerHTML = it.map((q, i) => `<i class="hwc-fl" style="left:${q.x - 90}px;top:${q.y - 130}px;width:180px;height:180px;animation-delay:${(-i * 0.7).toFixed(1)}s;animation-duration:${(2 + (i % 3) * 0.6).toFixed(1)}s"></i>`).join('');
    return d;
  }
  /* ---------- сцена превращения (браузер): ~12,5 с, только transform / opacity, без filter (решение стримера 27.10, 15:21) ----------
     0-0,8 с   - удар красно-белой молнии у ворот, вспышка на весь экран, тряска (затухает за 0,6 с);
     0,5-2,5 с - туман серо-синими полосами с краёв (не сплошной: город виден, плотность ~35%), тон города холодеет (tint(k) - вызывающий);
     2-9 с     - убранство волной от ворот к краям: лозы расползаются, тыквы вырастают с отскоком, фонари и свечи загораются с мерцанием,
                 гирлянды разворачиваются, привидения и ведьма вылетают; пепел (вызывающий - screenOn);
     9-11 с    - вторая молния прямо в ворота, на их месте раскрывается портал (разрыв растёт от точки);
     11-12,5 с - туман редеет, сцена убирается: неподвижное убранство и портал уже запечены (bake() - в 10,4 с), дальше - done().
     o: { screen (слой размером с экран), world (слой в координатах города - его двигает камера), sc, art (рамка, приметы стиля),
          light (сайт: без тряски, меньше вещей и искр), cam (оверлей: экранные слои не заходят под вебку), shake: [элементы],
          tint(k 0…1), dead({ x, y, ms, delay }) - волна «умирания», bake(), screenOn(), done() } */
  const CSS = `
.hwc-pops{position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none}
.hwc-p{position:absolute;width:1px;height:1px;opacity:0;will-change:transform,opacity}.hwc-p svg{position:absolute;left:0;top:0;overflow:visible}
.hwc-p.k-pop{animation:hwcPop .9s cubic-bezier(.3,1.8,.5,1) both}@keyframes hwcPop{0%{opacity:0;transform:scale(0) translateY(24px)}30%{opacity:1}100%{opacity:1;transform:none}}
.hwc-p.k-light{animation:hwcLight 2s ease-out both}@keyframes hwcLight{0%{opacity:0;transform:scale(.7)}14%{opacity:1;transform:scale(1.18)}26%{opacity:.5;transform:scale(1.02)}40%{opacity:1;transform:none}58%{opacity:.78}76%{opacity:1}100%{opacity:1;transform:none}}
.hwc-p.k-grow{animation:hwcGrow 2s cubic-bezier(.2,1,.3,1) both}@keyframes hwcGrow{0%{opacity:0;transform:scale(.04)}25%{opacity:1}100%{opacity:1;transform:none}}
.hwc-p.k-creep{animation:hwcCreep 4.5s cubic-bezier(.3,.6,.3,1) both}@keyframes hwcCreep{0%{opacity:0;transform:scale(.02,.4)}15%{opacity:1}100%{opacity:1;transform:none}}
.hwc-p.k-unroll{animation:hwcUnroll 1.4s cubic-bezier(.3,1.2,.5,1) both}@keyframes hwcUnroll{0%{opacity:0;transform:scaleX(0)}20%{opacity:1}100%{opacity:1;transform:none}}
.hwc-p.k-fly{animation:hwcFly 1.8s cubic-bezier(.2,.9,.3,1) both}@keyframes hwcFly{0%{opacity:0;transform:translate(-60px,160px) scale(.6)}40%{opacity:1}100%{opacity:1;transform:none}}
.hwc-p.k-fade{animation:hwcFade 1.6s ease-out both}@keyframes hwcFade{from{opacity:0}to{opacity:1}}
.hwc-p.k-spark{animation:hwcSpark .8s ease-out both}@keyframes hwcSpark{0%{opacity:0;transform:scale(.2)}20%{opacity:1}100%{opacity:0;transform:scale(1.8)}}
.hwc-p.k-zap{animation:hwcZap .8s ease-out both}@keyframes hwcZap{0%{opacity:0}8%{opacity:1}22%{opacity:.2}36%{opacity:1}100%{opacity:0;visibility:hidden}}
.hwc-portal{position:absolute;width:1px;height:1px;opacity:0;animation:hwcRift 2.2s cubic-bezier(.25,1.3,.4,1) 9.15s both}.hwc-portal svg{position:absolute;left:0;top:0;overflow:visible}
.hwc-portal .hwc-sw2{animation:hwcSpin 3s linear infinite reverse}.hwc-portal .hwc-sw3{animation:hwcSpin 2s linear infinite}
.hwc-fls{position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none}
.hwc-fl{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,#ffb04a59,#ff7a1a26 50%,transparent);opacity:.5;will-change:transform,opacity;animation:hwcFlick 2.4s ease-in-out infinite alternate}
@keyframes hwcFlick{0%{opacity:.32;transform:scale(.95)}35%{opacity:.7;transform:scale(1.04)}60%{opacity:.45;transform:scale(.98)}100%{opacity:.8;transform:scale(1.05)}}
@keyframes hwcRift{0%{opacity:0;transform:scale(.02,.3)}12%{opacity:1}100%{opacity:1;transform:none}}
.hwc-portal .hwc-sw{animation:hwcSpin 5s linear infinite}@keyframes hwcSpin{to{transform:rotate(360deg)}}
.hwc-scr{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:6}
.hwc-scr.cam,.hwc-amb.cam{clip-path:polygon(0 0,100% 0,100% 77.7%,78.9% 77.7%,78.9% 100%,0 100%)}
.hwc-flash{position:absolute;inset:0;background:#fff;opacity:0;animation:hwcFlash 12.5s linear both}
@keyframes hwcFlash{0%{opacity:0}.8%{opacity:.9}3%{opacity:.15}4%{opacity:.5}6.4%{opacity:0}71.6%{opacity:0}72.4%{opacity:.85}74%{opacity:.1}75%{opacity:.55}78%,100%{opacity:0}}
.hwc-scr.light .hwc-flash{animation-name:hwcFlashL}@keyframes hwcFlashL{0%{opacity:0}.8%{opacity:.55}6.4%{opacity:0}71.6%{opacity:0}72.4%{opacity:.5}78%,100%{opacity:0}}
.hwc-fog{position:absolute;opacity:0;animation:hwcFog 12.5s ease-in-out both}.hwc-fog svg{display:block}
@keyframes hwcFog{0%{opacity:0;transform:translateX(var(--fx))}4%{opacity:.5}20%{opacity:1;transform:none}80%{opacity:.85;transform:translateX(calc(var(--fx) * -.12))}100%{opacity:0;transform:translateX(calc(var(--fx) * -.3))}}
.hwc-shake{animation:hwcShake .6s linear}
@keyframes hwcShake{0%,100%{translate:0 0}8%{translate:-16px 7px}18%{translate:13px -9px}30%{translate:-10px 5px}42%{translate:8px 6px}56%{translate:-5px -3px}72%{translate:3px 2px}86%{translate:-1px -1px}}
.hwc-amb{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1}
.hwc-ash i{position:absolute;border-radius:50%;background:#c9cfdb;opacity:0;animation:hwcAsh 18s linear infinite;will-change:transform,opacity}
.hwc-ash.a1 i{background:#8e96a8;animation-duration:26s}
@keyframes hwcAsh{0%{opacity:0;transform:translate(0,-120px)}10%{opacity:.55}85%{opacity:.45}100%{opacity:0;transform:translate(-160px,520px)}}
.hwc-zarn{position:absolute;left:0;top:0;width:100%;height:32%;opacity:0;background:radial-gradient(60% 100% at 30% 0,#ff2a2a66,transparent 70%);animation:hwcZarn 13s linear infinite}
.hwc-zarn.z1{background:radial-gradient(50% 100% at 74% 0,#ff3a3a55,transparent 70%);animation-duration:19s;animation-delay:-7s}
@keyframes hwcZarn{0%,90%{opacity:0}91%{opacity:1}92.5%{opacity:.2}94%{opacity:.85}97%,100%{opacity:0}}
.hwc-hor{position:absolute;left:0;top:14%;width:100%;height:26%;background:linear-gradient(transparent,#7a6c9a26 45%,#5a5a7a1f 70%,transparent)}
.hwc-glow{position:absolute;top:8%;width:34%;height:26%;background:radial-gradient(closest-side,#ff20203a,#ff202014 55%,transparent);opacity:.8}
.hwc-zarn svg{position:absolute;top:2%}
.hwc-haze{position:absolute;left:0;bottom:0;width:100%;height:22%;background:linear-gradient(transparent,#8c9ab433 60%,#8c9ab422);opacity:.9}
@media (prefers-reduced-motion:reduce){.hwc-ash,.hwc-zarn,.hwc-fl{display:none}.hwc-p,.hwc-portal,.hwc-fog,.hwc-flash{animation-duration:.01s!important;animation-delay:0s!important}.hwc-shake{animation:none}}
`;
  function css() { if (typeof document === 'undefined' || document.getElementById('hwc-css')) return; const st = document.createElement('style'); st.id = 'hwc-css'; st.textContent = CSS; document.head.appendChild(st); }
  // постоянный слой вида (после превращения): пепел (2 слоя, мало хлопьев), красные зарницы над крышами, лёгкая дымка внизу
  function ambient(o = {}) {
    css();
    const d = document.createElement('div'); d.className = 'hwc-amb' + (o.cam ? ' cam' : '');
    const r = rng(77), W = o.w || 1920, H = o.h || 1080;
    const ash = (n, cls) => `<div class="hwc-ash ${cls}">${Array.from({ length: n }, () => `<i style="left:${(r() * W).toFixed(0)}px;top:${(r() * H * 0.9).toFixed(0)}px;animation-delay:${(-r() * 18).toFixed(1)}s;width:${(3 + r() * 4).toFixed(1)}px;height:${(3 + r() * 4).toFixed(1)}px"></i>`).join('')}</div>`;
    // 28.10 (hw-city-dead): над крышами - серо-лиловый туман горизонта и два красных зарева; в зарницах - красная молния
    const bolt = (x, sd) => { const q = rng(sd); let dd = `M${x} 0`, xx = x, y = 0; while (y < 150) { y += 18 + q() * 22; xx += (q() - 0.5) * 34; dd += ` L${f1(xx)} ${f1(y)}`; } return `<svg width="100%" height="200" style="left:0"><path d="${dd}" stroke="#ff3030" stroke-width="7" fill="none" opacity=".45" stroke-linejoin="round"/><path d="${dd}" stroke="#ffb0a8" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>`; };
    d.innerHTML = `<div class="hwc-hor"></div><div class="hwc-glow" style="left:10%"></div><div class="hwc-glow" style="left:58%"></div><div class="hwc-haze"></div><div class="hwc-zarn z0">${bolt(Math.round(W * 0.26), 5)}</div><div class="hwc-zarn z1">${bolt(Math.round(W * 0.74), 9)}</div>${o.ash === false ? '' : ash(o.light ? 8 : 16, 'a0') + ash(o.light ? 5 : 12, 'a1')}`;
    return d;
  }
  function play(o) {
    css();
    const sc = o.sc, P = at(sc), art = o.art || {}, T = [], later = (sec, fn) => T.push(setTimeout(fn, sec * 1000));
    let list = items(sc, art); if (o.light) list = list.filter((q) => q.k !== 'spark');
    const wl = document.createElement('div'); wl.className = 'hwc-pops';
    wl.innerHTML = list.map((q) => `<div class="hwc-p k-${q.k}" style="left:${q.x}px;top:${q.y}px;animation-delay:${q.t}s"><svg width="1" height="1" overflow="visible">${q.svg}</svg></div>`).join('')
      + `<svg width="0" height="0" style="position:absolute">${LIGHT_DEFS}</svg>`
      // портал раскрывается слоями (28.10, hw-city-light): разрыв от точки → внешняя воронка → внутренняя (в другую сторону) → частицы → корни и тыква-замок
      + (P ? [[RIFT() + CORE(), 9.15, ''], [SWIRL_A(), 9.5, 'hwc-sw'], [SWIRL_B(), 9.8, 'hwc-sw2'], [MOTES(), 10.1, 'hwc-sw3'], [`<g opacity=".38">${frameOf(art, 'open')}</g>` + FRONT_L(), 10.3, '']]
        .map(([g, t, cl]) => `<div class="hwc-portal" style="left:${P.x}px;top:${P.y}px;animation-delay:${t}s"><svg width="1" height="1" overflow="visible"><g transform="scale(${P.s})">${cl ? `<g class="${cl}" style="transform-origin:0px -170px">${g}</g>` : g}</g></svg></div>`).join('') : '');
    o.world.appendChild(wl);
    const fog = (side, y, w, h, i) => `<div class="hwc-fog ${side}" style="top:${y}%;${side === 'l' ? 'left' : 'right'}:${-Math.round(w * 0.3)}px;--fx:${side === 'l' ? -700 : 700}px;animation-delay:${(0.5 + i * 0.25).toFixed(2)}s"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><radialGradient id="hwcFg${i}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8c9ab4" stop-opacity=".55"/><stop offset=".55" stop-color="#a4b0c6" stop-opacity=".28"/><stop offset="1" stop-color="#a4b0c6" stop-opacity="0"/></radialGradient></defs><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="url(#hwcFg${i})"/></svg></div>`;
    const sl = document.createElement('div'); sl.className = 'hwc-scr' + (o.light ? ' light' : '') + (o.cam ? ' cam' : '');
    sl.innerHTML = `${fog('l', 6, 1100, 260, 0)}${fog('r', 30, 1200, 300, 1)}${fog('l', 52, 1300, 280, 2)}${o.light ? '' : fog('r', 70, 1000, 240, 3)}<div class="hwc-flash"></div>`;
    o.screen.appendChild(sl);
    const shake = () => { if (o.light) return; for (const e of o.shake || []) { e.classList.remove('hwc-shake'); void e.offsetWidth; e.classList.add('hwc-shake'); } later(0.65, () => { for (const e of o.shake || []) e.classList.remove('hwc-shake'); }); };
    later(0.05, shake); later(9.05, shake);
    // тон города: 0,5…2,5 с плавно холодеет (раз в кадр - один вызов tint)
    if (o.tint) { const t0 = performance.now() + 500; const step = (t) => { const k = Math.max(0, Math.min(1, (t - t0) / 2000)); o.tint(k); if (k < 1 && !done) raf = requestAnimationFrame(step); }; var raf = requestAnimationFrame(step); }
    let done = false;
    // 28.10 (hw-city-dead): волна «умирания» от ворот - город выцветает и темнеет кругом (citygl: мёртвые плитки под маской), 2…7,5 с
    later(0.3, () => { if (o.dead && P) o.dead({ x: P.x, y: P.y, ms: 5500, delay: 1700 }); });
    later(5, () => { if (o.screenOn) o.screenOn(); });   // пепел пошёл
    later(9.1, () => { if (o.ghosts) o.ghosts(); });   // решение В3: со вспышкой второй молнии все человечки - призраки (до конца ночи)
    later(10.4, () => { if (o.bake) o.bake(); });     // неподвижное убранство и портал - в картинки, пока туман ещё стоит
    later(12.6, () => stop(true));
    function stop(fin) { if (done) return; done = true; T.forEach(clearTimeout); try { cancelAnimationFrame(raf); } catch (e) { /* нет */ } wl.remove(); sl.remove(); for (const e of o.shake || []) e.classList.remove('hwc-shake'); if (o.tint) o.tint(1); if (!fin && o.bake) o.bake(); if (o.screenOn) o.screenOn(); if (o.ghosts) o.ghosts(); if (o.done) o.done(); }
    return { stop: () => stop(false), dur: 12.6 };
  }
  return { items, props, portal, portalLive, flickers, jack, jackGroup, art, portalSvg, at, npcSpots, baseOf, DECOR, lantern, pumpkin, candle, web, ghost, bat, vine, css, ambient, play, CSS };
});
