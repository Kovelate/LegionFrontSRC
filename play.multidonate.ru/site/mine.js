/* 23.10: Шахта (промысел города) на сайте — локация, по которой ходят, как по «Городу»; прокрутка вверх-вниз (как Gold and Goblins).
   Рисунок — craftworld.js (по раскладке этажа, которую присылает игра: st.fl), правила — в игре (products/legion/modules/mine).
   • Клик по доступному камню (рядом с расчищенным): герой идёт к нему и копает до конца — даже если сайт закрыть; выкопал — стоит.
     Следующий камень игрок выбирает сам. Клик по расчищенному полу — просто идёт туда.
   • Скупщик у входа: сдать рудную сумку — монеты герою, руда в казну Ратуши.
   • Другие: кто копает — у своих камней (до 4 на камень, остальные цифрой «+N»), кто гуляет — до 30 ближайших (присутствие, как в «Городе»).
   • Камера подстраивается под экран: этаж по ширине, по высоте — около 7 рядов; листать — пальцем, колесом, перетаскиванием.
   • Не грузит ПК: сцена перерисовывается только при новом виде шахты; полоски прогресса — CSS-переходом; кадры — только пока кто-то идёт.
   24.10: шахта — в каждом городе своих округов (+ домашняя): open(X, c) — id шахты; ★ города и природа — в шапке, самоцвет — в панели.
   window.LGMine.open(X, c) — X: { login, hero, doodle(l, h, mood, kit), heroLook(h), api(p, b), toast(t, bad), live(), close() }. */
(function () {
  'use strict';
  const CW = () => window.LGCraftWorld;
  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  const GW = 7, GH = 12, SPEED = 260;   // px мира в секунду
  let S = null, X = null, C = 'mine';
  // 29.10: метка этой вкладки (одна на страницу): сервер по ней узнаёт «ту же вкладку» после возврата из фона (src/site/site.ts mineEnter)
  const TAB = (() => { try { const a = new Uint8Array(8); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); } catch (e) { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).replace(/[^a-z0-9]/g, '').slice(0, 24); } })();
  // 23.10: слова промыслов (место, этаж, мастерство, скупщик, действия, блоки, особые этажи, подсказки)
  const CT = {
    mine: { to: 'К скупщику', place: 'Шахта', fl: 'этаж', mast: 'Горное дело', seller: 'Скупщик Гром', sellerOf: 'скупщика Грома', hello: 'Сдавай руду — заплачу за работу, а руду отправлю в казну Ратуши на развитие города.', pick: 'Выбери камень, чтобы копать', doing: 'Копаешь', stop: 'Перестать копать', stopTip: 'Герой отложил кирку', bagEmpty: 'Рудная сумка пуста — накопай руды.', done: 'Камень выкопан — выбери следующий', broke: 'Камень разбит!', rare: 'Ты вскрыл редкую жилу', wall: 'Скалу не разбить — обойди', far: 'К этому камню пока не подойти — сначала расчисти путь', fresh: 'новая шахта', here: 'В шахте', today: 'Сегодня в шахте', work: 'копают', unitN: 'Выкопано камней', idle: 'Герой выкопал свой камень и ждёт — выбери ему новый.', busy: 'Герой всё ещё копает свой камень.', board: 'Итоги шахты', best: 'Лучшие копатели недели', sold: 'Скупщик принял руду', b: { rock: 'камень', hard: 'твёрдая порода', ore: 'руда', rare: 'редкая жила', chest: 'окаменевший сундук' }, sp: { vein: 'богатая жила', flood: 'затопленная штольня', den: 'логово крота' } },
  };
  const tx = () => CT.mine;
  // 30.10: угловые кнопки - глаз (тот же, что в «Городе», city.js OTH_ICO; скрыты - перечёркнутый) и кубок «Итоги»
  const EYE_ICO = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path class="mn-eye-x" d="M3 3l18 18"/></svg>';
  const CUP_ICO = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/><path d="M12 14v3M8 20h8M9 17h6"/></svg>';
  // 25.10: обновление шахты (новая панель, сумка ячейками, подсветка предметов, новые рисунки) — тестерам (betaTesters) или всем (mine2Public);
  // игра присылает это в «моём в шахте»: me.fx.m2 (modules/mine/server.js fx). Исправления — у всех, без флага
  const mine2On = () => !!(S && S.me && S.me.fx && S.me.fx.m2);
  // 26.10 (телефон тестера: чёрный экран и снова «Город»): рисунки обновления (mine-art.js, mine-biome.js) упали - шахта дальше в старом облике
  const art2On = () => mine2On() && !S.safe;
  // 26.10: окно скупщика — руда в сумке героя (вещи), продажа в окне у прилавка, оплата за работу сразу в кошелёк; тестерам или всем
  // (mine2Public + mineBuyerPublic): игра присылает me.fx.b (modules/mine/server.js fx). Без флага — прежний «Сдать всё»
  const buyerOn = () => !!(S && S.me && S.me.fx && S.me.fx.b) && mine2On();
  // 26.10 (mine/pickaxe): Фонарщик → «Снабженец Кремень» (каска, кирка, рудная сумка); тестерам или всем (minePickPublic вместе с окном скупщика) - me.fx.pk
  const pickOn = () => !!(S && S.me && S.me.fx && S.me.fx.pk) && buyerOn();
  const SUP = 'Снабженец Кремень';   // 26.10: имя над NPC и в окне (стример решит позже - менять здесь)
  const SUP_SUB = 'Торговец снаряжением';   // 26.10 (art/mine-gear): подзаголовок окна Снабженца
  // 25.10 («Шахта 2.0»): облик локации по глубине - mine-biome.js (грузится рядом с mine.js при первой нужде; пока не загрузился - старый облик)
  // 26.10 (телефон): своя версия файла (LG_CITYV.mb, static.ts) - раньше адрес брал версию mine.js: новый mine-biome.js мог прийти со старым
  const BIO_JS = (window.LG_CITYV && window.LG_CITYV.mb) ? '/site/mine-biome.js?v=' + window.LG_CITYV.mb : ((document.currentScript && document.currentScript.src) || '/site/mine.js').replace(/mine\.js(\?.*)?$/, 'mine-biome.js');
  let bioLd = 0;
  const biome = () => { if (window.LGMineBiome) return window.LGMineBiome; if (!bioLd) { bioLd = 1; const sc = document.createElement('script'); sc.src = BIO_JS; sc.onload = () => { if (S && S.st && !S.failed) { S.svgKey = ''; try { draw(); } catch (e) { recover(e, draw); } } }; document.head.appendChild(sc); } return null; };
  // 29.10 (Шахта 3.0, флаг mine3): большой этаж (вид шахты st.fl.v3) рисует mine3.js - грузится при первом таком этаже
  const M3_JS = (window.LG_CITYV && window.LG_CITYV.m3) ? '/site/mine3.js?v=' + window.LG_CITYV.m3 : ((document.currentScript && document.currentScript.src) || '/site/mine.js').replace(/mine\.js(\?.*)?$/, 'mine3.js');
  let m3Ld = 0;
  // 30.10 (репорт #2171): файл не догрузился (обрыв, таймаут) - раньше m3Ld оставался 1, и этаж не рисовался до перезагрузки страницы
  // (чёрное поле). Теперь - снова через 2, 4, 8… с (до 30 с), с подсказкой; догрузился - этаж целиком, как при входе (take0 + fit)
  let m3Err = 0;
  const m3lib = () => { if (window.LGMine3) return window.LGMine3; if (!m3Ld) { m3Ld = 1; const sc = document.createElement('script'); sc.src = M3_JS + (m3Err ? (M3_JS.includes('?') ? '&' : '?') + 'r=' + m3Err : '');
    sc.onload = () => { m3Err = 0; if (S && S.st) { const st = S.st; S.F = floorOf(st); S.svgKey = ''; try { pos3(); draw(); panel(); fit(true); } catch (e) { recover(e, draw); } } };
    sc.onerror = () => { sc.remove(); m3Err++; if (S) tip('Рисунки шахты не загрузились - пробую снова…'); setTimeout(() => { m3Ld = 0; if (S && S.st && S.st.fl && S.st.fl.v3 && !window.LGMine3) m3lib(); }, Math.min(30000, 2000 * 2 ** (m3Err - 1))); };
    document.head.appendChild(sc); } return null; };
  const V3 = () => !!(S && S.F && S.F.v3);
  // геометрия этажа: большой - библиотека мира mine3 (по этажу), прежний - craftworld / mine
  const GX = () => (V3() ? window.LGWorldLib.mine3(S.F) : CW());
  // 29.10: точку входа считали до того, как узнали, что этаж большой (старые координаты) - ставим в зал лифта
  const pos3 = () => { if (!V3() || !S.pos) return; const g = GX(), c = g.cellAt(S.pos.x, S.pos.y); if (c < 0 || !(g.inHall(c) || (S.dug && S.dug[c]))) { S.pos = spawnPt(); S.path = null; S.want = null; } };
  // 24.10: природа шахты и её самоцвет
  const BIO_RU = { mount: 'горы', ash: 'пепел', forest: 'лес', taiga: 'тайга', ice: 'лёд', meadow: 'луга', swamp: 'болото', blight: 'порча', coast: 'побережье', desert: 'пустыня', ruin: 'руины' };
  const stars = (d) => '★'.repeat(Math.max(1, Math.min(5, +d || 1)));
  const q = () => `?c=${encodeURIComponent(C)}`;
  const CB = () => C.split('.')[0];   // 29.10: шахта без этажа (чат, «моё», действия кроме копания - общие для этажей)
  // 24.10: «Город» во весь экран (city.js: requestFullscreen у .cy) — показывается только он сам: окно в body не видно, а клики уходят
  // в кнопки «Города» под ним («В город» и доска «не работали»). Шахту и доску кладём в элемент во весь экран, сменился режим — переносим
  const host = () => document.fullscreenElement || document.body;
  const rehost = () => { for (const el of document.querySelectorAll('.mn, .mn-board-w')) if (el.parentNode !== host()) host().appendChild(el); };
  document.addEventListener('fullscreenchange', rehost);

  /* ---------- этаж из вида шахты ---------- */
  // 30.10: ключ раскладки этажа для опроса (?f=) - как mineFloorKey в src/site/site.ts: у большого этажа в ключе число выкопанных клеток (туман меняется с раскопками)
  function floorKey(st) {
    const base = st.seed + '.' + st.n;
    if (!st.fl || !st.fl.v3) return base;
    const d = typeof st.dug === 'string' ? st.dug : Array.isArray(st.dug) ? st.dug.join('') : '';
    let n = 0; for (let i = d.indexOf('1'); i >= 0; i = d.indexOf('1', i + 1)) n++;
    return base + '.' + n;
  }
  function floorOf(st) {
    if (!st || !st.fl) return null;
    if (st.fl.v3) { const L3 = m3lib(); biome(); return L3 ? L3.floorOf(st) : null; }   // 29.10: большой этаж
    const cells = st.fl.c.map(([t, lv, r, a]) => ({ t, lv, r: r || null, a, k: t === 'entry' || t === 'wall' || t === 'void' ? 0 : 1 }));
    return { n: st.n, craft: 'mine', biome: st.biome || 'mount', danger: st.danger || 1, gem: st.gem || null, special: st.fl.special, coal: st.fl.coal || null, exit: st.fl.exit, entry: st.fl.entry, cells, done: false };
  }
  const dugArr = (st) => (st && st.dug ? st.dug.split('').map((c) => (c === '1' ? 1 : 0)) : []);

  /* ---------- проходимость: расчищенные клетки + площадка входа (ряд 12). 26.10 (lib/world): правила - в библиотеке мира
     (/lib/world.js, packages/world mine: walkable, cellOfPt, centerOf, pathTo, digSpot, walkPt - те же у сервера); здесь - по S.dug ---------- */
  const MW = () => (V3() ? window.LGWorldLib.mine3(S.F) : window.LGWorldLib.mine);
  const walkable = (i) => MW().walkable(S.dug, i);
  const cellOfPt = (x, y) => MW().cellOfPt(x, y);
  const centerOf = (i) => MW().centerOf(i);
  const pathTo = (from, to) => MW().pathTo(S.dug, from, to);
  // где стоять, чтобы копать камень i: расчищенный сосед (снизу — лучше всего)
  const digSpot = (i) => MW().digSpot(S.dug, i);
  /* ---------- 25.10 (mine/walk): предметы входа и NPC - препятствия (таблица craftworld FOOT, её же берёт сервер): не стоять в них, ходить
     в обход, рисовать за / перед ними по линии ног. Только площадка входа; в зале - клетки, как раньше ---------- */
  const ft = () => (S && S.ft) || GX().feet({ lamp: true });
  const freePt = (p, stop = true) => GX().free(p.x, p.y, ft(), stop);
  const zoneY = () => (V3() ? Infinity : CW().Y0 + GH * CW().RH);
  // 29.10: на большом этаже - в зале лифта (геометрия mine3.spawn)
  const spawnPt = () => { const h = hashL(X.login()); return V3() ? GX().spawn(h % 21) : freePt({ x: 290 + (h % 110), y: 2372 + ((h >>> 7) % 60) }); };
  const inZone = (c) => (V3() ? GX().inHall(c) : c >= GW * GH);   // площадка входа / зал лифта: там ходят в обход предметов   // перед вагонеткой, у подъёмника
  // точки пути: центры клеток площадки входа между двумя точками площадки не нужны (по ней идут прямо); каждый отрезок - в обход предметов
  function way(pts) {
    if (V3()) {   // 29.10: в зале лифта - в обход предметов, в рукавах - по центрам клеток
      const g = GX(), inH = (p) => g.inHall(g.cellAt(p.x, p.y)), out = [pts[0]];
      for (let k = 1; k < pts.length; k++) { const a = out[out.length - 1], b = pts[k]; if (inH(a) && inH(b)) out.push(...g.route(a, b, ft())); else out.push(b); }
      return out;
    }
    const yb = zoneY(), q = pts.filter((p, k) => !(k > 0 && k < pts.length - 1 && p.y >= yb && pts[k - 1].y >= yb && pts[k + 1].y >= yb)), out = [q[0]];
    for (let k = 1; k < q.length; k++) out.push(...CW().route(out[out.length - 1], q[k], ft()));
    return out;
  }

  /* ---------- открыть / закрыть ---------- */
  function open(x, c) {
    X = x; if (S) close(); B.lines.clear(); B.wait = null; B.said = null; C = /^[a-z0-9_-]{1,24}(\.[1-9][0-9]{0,2})?$/.test(String(c || '')) ? String(c) : 'home';   // 29.10: «home.3» - этаж Шахты 3.0
    const el = document.createElement('div'); el.className = 'mn'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Шахта');
    el.innerHTML = `<div class="mn-view" tabindex="0"><div class="mn-world"><svg class="mn-bg" aria-hidden="true"></svg><div class="mn-bars"></div><div class="mn-heroes"></div><div class="mn-labels" aria-hidden="true"></div></div><div class="mn-nowl" hidden role="status"><b data-mn-nt></b><em data-mn-left></em><button type="button" class="mn-nowx" data-mn-stop title="Перестать копать" aria-label="Перестать копать">Стоп</button></div></div>
      <div class="mn-win" role="dialog" aria-label="Окно" hidden><button type="button" class="mn-win-x" data-mn-wx aria-label="Закрыть" title="Закрыть">×</button><div class="mn-pb" data-mn="body"></div></div>
      <header class="mn-top"><div class="mn-tl"><div class="mn-ttl"><b data-mn="name">Шахта</b><span data-mn="floor"></span><span class="mn-cnt" data-mn="cnt" hidden></span><small class="mn-reset" data-mn="reset"></small></div></div><div class="mn-tr"><div class="mn-tb"><button type="button" class="mn-cb mn-info" data-mn-info title="Как устроена шахта" aria-label="Как устроена шахта" aria-haspopup="dialog">i</button><button type="button" class="mn-cb mn-hide" data-mn-hide aria-pressed="false" title="Скрыть других игроков" aria-label="Скрыть других игроков">${EYE_ICO}</button><button type="button" class="mn-cb" data-mn-board title="Итоги шахты" aria-label="Итоги шахты" aria-haspopup="dialog">${CUP_ICO}</button></div><section class="mn-wg" aria-label="Заработок и поручения"></section></div></header>
      <div class="mn-hat" role="status" hidden></div>
      <div class="mn-zoom" role="group" aria-label="Масштаб"><button type="button" class="btn ghost sm" data-mn-z="-1" aria-label="Отдалить">−</button><button type="button" class="btn ghost sm" data-mn-z="1" aria-label="Приблизить">+</button></div>
      <div class="mn-other" hidden><p>Шахта открыта в другой вкладке или окне - копать можно только в одной. Работой управляет та вкладка.</p><div class="mn-btns"><button type="button" class="btn primary" data-mn-here>Копать здесь</button><button type="button" class="btn ghost mn-exit" data-mn-exit>В город</button></div></div>
      <div class="mn-tip" role="status" hidden></div>${window.LGChat ? window.LGChat.html({ name: 'Чат шахты', ph: 'Написать в чат шахты…', log: 'Журнал' }) : ''}`;
    host().appendChild(el); document.body.classList.add('mn-on');
    S = { el, view: el.querySelector('.mn-view'), world: el.querySelector('.mn-world'), svg: el.querySelector('.mn-bg'), bars: el.querySelector('.mn-bars'), heroes: el.querySelector('.mn-heroes'), labels: el.querySelector('.mn-labels'),
      st: null, F: null, dug: [], me: null, pos: null, path: null, others: new Map(), z: 1, zk: 1, tx: 0, ty: 0, raf: 0, pollT: 0, pingT: 0, myI: -1, sel: -1, at0: Date.now(), sentAt: 0, npcOpen: false,
      sid: '', want: null, looks: new Map(), lkWant: new Set(), lkAt: 0, svgKey: '', barKey: '', hide: false, qq: [] };
    try { S.hide = localStorage.getItem('lgMineHide') === '1'; } catch (e) {}
    el.querySelector('[data-mn-wx]').onclick = () => winClose();
    // 30.10: «В город» - только аварийный (шахта в другой вкладке, ошибка); обычный выход - через лифт / подъёмник
    el.querySelector('.mn-other [data-mn-exit]').onclick = exit;
    el.querySelector('[data-mn-board]').onclick = () => { try { board({ api: X.api, login: X.login, mines: X.mines || (() => []) }, C); } catch (e) {} };
    el.querySelector('[data-mn-info]').onclick = () => { try { help(); } catch (e) {} };   // 26.10 (mine2): «Как устроена шахта»
    el.querySelector('.mn-nowl [data-mn-stop]').onclick = (e) => { if (e.detail === 0) stopDig(); };
    el.querySelector('[data-mn-here]').onclick = () => { el.querySelector('.mn-other').hidden = true; enter(true); };
    // 30.10: глаз, как в «Городе» (city.js OTH_ICO): скрыты - перечёркнутый
    const hb = el.querySelector('[data-mn-hide]'); const hideUi = () => { const t = S.hide ? 'Показать других игроков' : 'Скрыть других игроков'; hb.setAttribute('aria-pressed', String(S.hide)); hb.classList.toggle('off', S.hide); hb.title = t; hb.setAttribute('aria-label', t); };
    hideUi(); hb.onclick = () => { S.hide = !S.hide; try { localStorage.setItem('lgMineHide', S.hide ? '1' : '0'); } catch (e) {} hideUi(); heroes(); };
    el.querySelectorAll('[data-mn-z]').forEach((b) => { b.onclick = () => { S.zk = Math.max(0.6, Math.min(1.8, S.zk * (b.dataset.mnZ === '1' ? 1.2 : 1 / 1.2))); fit(); }; });
    el.querySelector('.mn-wg').addEventListener('click', wgClick);
    // 30.10: колесо над окном и виджетом - их прокрутка, не зум сцены (WHEEL_OWN); нажатия окна не уходят в сцену
    el.querySelector('.mn-win').addEventListener('pointerdown', (e) => e.stopPropagation());
    bindCamera(); bindHover();
    window.addEventListener('resize', fit);
    chatWatch();   // 25.10: чат шахты - не на предметах (chatFit)
    // 26.10: чат шахты на ПК можно перетащить за заголовок; 30.10: и единый чат (его окно встаёт сюда позже - mchatIn)
    if (!one()) chatDrag();
    // 30.10: размер чата тянут за края (chat.js) - и у единого чата
    el.addEventListener('cy-chat-size', chatSized);
    // 30.10: вкладка чата сменилась (лента «Журнала» выше) - полоса чата другой высоты: сцену пересчитать
    { const tb = el.querySelector('.cy-chat-tabs'); if (tb) tb.addEventListener('click', () => { clearTimeout(S.chatFitT); S.chatFitT = setTimeout(chatFit, 30); }); }
    document.addEventListener('visibilitychange', vis); tlOn();   // 29.10: телеметрия «Боты в шахте» (счётчик нажатий)
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', outDown, true);
    enter().catch(fail);
  }
  /* 26.10: шахта упала при отрисовке (исключение в своём коде, в рисунках, в данных) - не тихий чёрный экран и не выход: текст в окне
     по центру (30.10: правой панели больше нет), «Ещё раз» и «В город» (аварийный выход) работают; в консоль - ошибка с местом (у сайта нет сбора ошибок - видно в отчёте бага) */
  function fail(e) {
    try { console.error('[шахта]', e); } catch (x) {}
    if (!S) return;
    S.failed = String((e && e.message) || e || '').slice(0, 200); S.svgKey = '';
    // 30.10 (репорт #2171: «приходится перезагружать страницу»): первые два раза - «Ещё раз» сам через 3 с (обычно это гонка загрузки), дальше - кнопкой
    const me0 = S, auto = (S.failN = (S.failN || 0) + 1) <= 2;
    winMsg(`<div class="mn-err" role="alert"><p>Шахта не нарисовалась на этом устройстве - ошибка: <code>${esc(S.failed || 'неизвестно')}</code></p><p class="muted">${auto ? 'Пробую ещё раз сам через 3 с.' : 'Нажми «Ещё раз» или «В город».'} Если повторяется - «Отправить баг» с этим текстом.</p><div class="mn-btns"><button type="button" class="btn primary" data-mn-retry>Ещё раз</button><button type="button" class="btn ghost mn-exit" data-mn-exit>В город</button></div></div>`);
    const again = () => { if (!S || S !== me0) return; clearTimeout(S.failT); S.safe = true; S.svgKey = ''; S.failed = ''; S.npcOpen = false; S.el.querySelector('.mn-win').hidden = true; enter(true).catch(fail); };
    const rb = S.el.querySelector('[data-mn-retry]'); if (rb) rb.onclick = again;
    clearTimeout(S.failT); if (auto) S.failT = setTimeout(() => { if (S === me0 && S.failed) again(); }, 3000);
  }
  // 30.10: сообщение в окне по центру (ошибка шахты, вход не удался) - всегда с «В город»: кнопки «В город» в шапке больше нет
  function winMsg(h) {
    const body = S.el.querySelector('[data-mn="body"]'), w = S.el.querySelector('.mn-win'); if (!body || !w) return;
    body.innerHTML = h; S.bodyHtml = ''; S.bodyParts = null; w.hidden = false; w.dataset.k = 'err'; w.classList.remove('tl', 'dn');
    w.style.transform = `translate(${Math.max(8, (S.view.clientWidth - w.offsetWidth) / 2).toFixed(0)}px, ${Math.max(8, (S.view.clientHeight - w.offsetHeight) / 2).toFixed(0)}px)`;
    const xb = body.querySelector('[data-mn-exit]'); if (xb) xb.onclick = exit;
  }
  // 25.10: «В город» - подъёмник в зале (30.10: облачко лифта, аварийная кнопка в окне ошибки): закрывает, даже если что-то внутри упало
  /* ---------- 25.10 (обновление шахты): чат шахты — общий модуль чата сайта (packages/site-ui/chat.js, тот же код, что у «Города»), своя лента
     на канал (/api/mine/chat…, src/site/site.ts room 'mine'): новое — событием «mine» (chatRoom: 'mine') или опросом state?mc=<номер> ---------- */
  let CHM = null;
  const chatX = () => { if (!X || !S) return X; if (!S.chatX) S.chatX = { ...X, api: (p, b) => X.api(/^\/api\/mine\/chat/.test(p) ? p + `?c=${encodeURIComponent(CB())}` : p, b) }; return S.chatX; };
  // 30.10 (стример): журнал шахты (события) - вкладка «Журнал» чата шахты, а не блок правой панели
  const mchat = () => CHM || (CHM = window.LGChat ? window.LGChat.make({ state: () => S, X: chatX, base: '/api/mine/chat', say: '/api/mine/chat/say', key: 'lgMineChat', sz: { key: 'lgMineChatSz' }, name: 'Чат шахты', ph: 'Написать в чат шахты…', where: 'в чате шахты', log: () => (S && S.st && S.st.log) || [],
    flags: (h) => ({ on: !!(S && S.mchatOn && mine2On()), tr: false, dm: !!(window.LGDm && h && h.cd) }),   // 29.10: «Личные» и в шахте (личка страницы - LGDm, пишется из любого места) trade: false, here: () => !!(S && S.st), joining: 'подключаемся к шахте…', rejoin: () => enter(true),
    onError: (er) => { if (/не в шахте/.test(er) && S) enter(true); } }) : null);
  // 29.10 (новинка chatone): единый чат страницы - своего чата шахты нет, окно встаёт на его место (раскладка chatFit - та же)
  const one = () => !!(window.LGChatOne && window.LGChatOne.on());
  function mchatIn(r) { if (!S || !r || !r.mchat) return; if (one()) { window.LGChatOne.dock('mine', S.el); window.LGChatOne.enterFeed('mine', r.mchat); if (S.chatMo) S.chatMo.disconnect(); chatWatch(); chatDrag(); chatFit(); return; } const c = mchat(); if (!c) return; S.mchatOn = true; c.init(); c.enter(r.mchat); panel(); }
  function exit() { try { close(); } finally { try { if (X && X.close) X.close(); } catch (e) {} } }
  function close() {
    if (!S) return;
    liftMenu(false);
    try { X.api('/api/mine/leave' + q(), {}); } catch (e) {}
    cancelAnimationFrame(S.raf); clearInterval(S.pollT); clearInterval(S.pingT); if (S.chatMo) S.chatMo.disconnect(); clearTimeout(S.chatFitT); clearTimeout(S.chatT); clearTimeout(S.failT); clearTimeout(S.entT);
    if (S.chatRo) S.chatRo.disconnect(); clearTimeout(S.chatHT); if (S.viewRo) S.viewRo.disconnect();
    window.removeEventListener('resize', fit); document.removeEventListener('visibilitychange', vis); document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outDown, true); tlOff();
    try { if (CHM) CHM.menuClose(); } catch (e) {}
    if (BD && BD.mine && BD.d.isConnected) try { BD.shut(); } catch (e) { BD.d.remove(); }   // 29.10: итоги, открытые из шахты, - закрыть вместе с ней
    for (const h of document.querySelectorAll('.mn-help')) h.remove();
    S.el.remove(); document.body.classList.remove('mn-on'); S = null;
    // 29.10: единый чат - обратно в «Город» или слева внизу
    if (window.LGChatOne) setTimeout(() => window.LGChatOne.place(), 0);
  }
  // 25.10: Esc в поле чата — свернуть чат, а не уйти из шахты
  /* 30.10 (просьба стримера): нажатие мимо открытого окна или облачка (Скупщик, Снабженец, поручения, журнал, лифт, буровая, «Этажи») - закрывает его
     и ТОЛЬКО закрывает: само нажатие в сцену не уходит (не копает, не идёт, не открывает другое), и следующий за ним click глотается;
     второе нажатие действует как обычно. Не закрывают: само окно / облачко, сумка героя (часть сделки у скупщика), чат, виджет заработка,
     «−» / «+», окна поверх шахты (итоги, помощь, «пока тебя не было»), NPC или здание, чьё окно открыто, не-основная кнопка и второй палец
     (перетаскивание руды из сумки начинается внутри сумки - там нажатие "своё"). Обработчик - один на документ, только на нажатие */
  const OUT_OK = '.mn-win, .mn-lm, .mn-inv2-w, .cy-chat, .mn-wg, .mn-zoom, .mn-board-w, .mn-news-w, .mn-news, .mn-other, input, textarea, select';
  function outOwn(t) {
    const o = t && t.closest ? t.closest('[data-npc],[data-obj],[data-drill]') : null; if (!o) return false;
    const k = S.lm ? S.lmK : S.npcOpen;
    if (k === 'buy' || k === 'lamp') return o.dataset.npc === k;
    if (k === 'quests') return o.dataset.obj === 'board';
    if (k === 'lift') return o.dataset.obj === 'lift';
    if (k === 'drill') return o.dataset.drill === S.drillK;
    return false;
  }
  function outDown(e) {
    if (!S || !(S.lm || S.npcOpen) || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const t = e.target; if (!t || !t.closest || !S.el.contains(t) || t.closest(OUT_OK) || outOwn(t)) return;
    e.stopPropagation(); e.preventDefault();
    if (S.lm) liftMenu(false);
    if (S.npcOpen) winClose();
    const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); stop(); };
    const stop = () => { clearTimeout(S.eatT); document.removeEventListener('click', eat, true); };
    stop(); document.addEventListener('click', eat, true); S.eatT = setTimeout(stop, 400);
  }
  const key = (e) => { if (e.key === 'Escape' && S && !(e.target && e.target.closest && e.target.closest('input, textarea, select, .cy-nm'))) { if (document.querySelector('.mn-board-w')) return; if (S.el.querySelector('.mn-inv2-w')) bagClose(); else if (S.lm) liftMenu(false); else if (S.npcOpen) winClose(); else { close(); if (X.close) X.close(); } } };
  /* 29.10 (стример: «оставляю шахту в фоне - при возврате пишет "только в одном окне", не знаю, идёт ли работа»): герой копает на
     сервере и без страницы (камень докапывается, сайт не нужен). Вернулся в ту же вкладку - сразу спрашиваем вид (не ждём 10-го опроса
     живого канала) и, если уходил, когда герой копал, коротко говорим, что с работой */
  function vis() {
    if (!S) return;
    if (document.hidden) { cancelAnimationFrame(S.raf); S.hidAt = Date.now(); S.hidDig = S.myI >= 0; return; }
    S.last = 0; step();
    // 30.10 (репорт #2155: «в фоне сбрасывается добыча камня»): на сервере камень копается и в фоне, а полоски - нет: вид шахты от живого
    // канала приходит и в фоновой вкладке, полоски перерисовываются с остатком на тот момент, а ход полоски (hpGo) ждёт кадра браузера -
    // в фоне кадров нет. Вернулся - полоска стояла на остатке минутной давности («откатилась») и шла дальше со старым сроком.
    // Теперь при возврате полоски и «ещё N мин» - заново от текущего времени, не дожидаясь ответа опроса
    if (S.st && S.F) { S.barKey = ''; try { bars(); } catch (e) { console.error('[шахта] полоски при возврате', e); } }
    const away = S.hidAt ? Date.now() - S.hidAt : 0, dug = S.hidDig; S.hidAt = 0;
    poll(false, true).then(() => { if (S && dug && away > 60000) backTip(); }).catch((e) => console.error('[шахта] возврат', e));
  }
  function backTip() {
    if (!S || !S.el.querySelector('.mn-other').hidden) return;
    tip(S.myI >= 0 ? 'Пока вкладка была в фоне, герой копал - работа идёт' : 'Пока вкладка была в фоне, герой докопал камень - выбери следующий');
  }

  async function enter(again) {
    const start = again && S.pos ? { x: S.pos.x, y: S.pos.y } : spawnPt();   // 25.10 (mine/walk): было W/2, H-150 - внутри доски «Поручения»
    const me0 = S;
    const r = await X.api('/api/mine/enter' + q(), { ...start, tab: TAB });
    if (!S || S !== me0) return;   // 25.10: шахту закрыли (или открыли заново) пока ждали ответа — это уже не наш вход
    // 30.10 (#123): в шахту округа - только из её города (решает сервер); давно ушли из города и из шахты - в город, войти снова через портал
    if (r && !r.ok && r.error === 'mine_closed') { try { if (X.toast) X.toast('В эту шахту - через портал в её городе. Возвращаю в город', true); } catch (e) { /* без тоста */ } exit(); return; }
    // 30.10 (репорт #2171): вход не удался - раньше только «В город», и шахту открывали перезагрузкой страницы. Теперь «Ещё раз»; нет связи
    // (обрыв, таймаут 20 с) - сам снова через 2, 4, 8, 16 с; ответ дошёл - закрыть окно
    if (!r || !r.ok) {
      const net = !r || /нет связи/.test(r.error || ''), n = S.entN = (S.entN || 0) + 1, auto = net && n <= 4, wait = 2 ** n;
      winMsg(`<p class="empty">${net ? 'Нет связи с игрой - шахта не открылась.' : esc((r && r.error) || 'Шахта не открылась.')}${auto ? ` Пробую снова через ${wait} с…` : ''}</p><div class="mn-btns"><button type="button" class="btn primary" data-mn-retry>Ещё раз</button><button type="button" class="btn ghost mn-exit" data-mn-exit>В город</button></div>`);
      const redo = () => { if (!S || S !== me0) return; clearTimeout(S.entT); S.el.querySelector('.mn-win').hidden = true; enter(again).catch(fail); };
      const rb = S.el.querySelector('[data-mn-retry]'); if (rb) rb.onclick = redo;
      clearTimeout(S.entT); if (auto) S.entT = setTimeout(redo, wait * 1000);
      return;
    }
    S.entN = 0;
    S.sid = r.sid || '';
    if (!again) S.pos = { x: start.x, y: start.y };
    hereOf(r);
    presence(r, true);   // 25.10: вход — сервер прислал всех заново (свой список «кого видит» он очистил): старых не держим
    take(r.st, r.me, r.lk);
    if (!S || S !== me0) return;
    try { mchatIn(r); } catch (e) { console.error('[шахта] чат', e); }   // после take: флаг обновления (mine2) — в «моём в шахте»; чат упал - шахта работает
    pos3();
    if (!again) fit(true);
    clearInterval(S.pollT); clearInterval(S.pingT);
    S.pollT = setInterval(poll, 3000);
    S.pingT = setInterval(() => { if (!document.hidden) X.api('/api/mine/ping' + q(), {}); }, 60000);
  }
  // 25.10: копать можно только из одной вкладки — эта больше не главная: показываем, как вернуть
  function otherTab(on) { if (!S) return; S.el.querySelector('.mn-other').hidden = !on; if (on) { S.want = null; } }
  // без живого канала — спрашиваем сами раз в 3 с; с ним — раз в 30 с (на случай пропуска).
  // 24.10 (нагрузка): v — какой вид у нас уже есть (не изменился — сервер его не шлёт), f — какой этаж (раскладку этажа не шлёт)
  let pollN = 0;
  async function poll(full, force) {
    if (!S || (document.hidden && !full)) return;
    pollN++; if (!full && !force && X.live && X.live() && pollN % 10 && !S.lkWant.size) return;   // 25.10: облики копающих - не ждать 10-го опроса (минуты рисовались «чужие» коты)
    // 29.10: ключ вкладки, с которым ушёл опрос
    const sid0 = S.sid;
    const st0 = S.st, have = !full && st0 ? `&v=${encodeURIComponent(st0.v)}&f=${encodeURIComponent(floorKey(st0))}` : '';
    // 25.10: облик тех, кто копает, но не гуляет здесь (сайт у них закрыт) — спрашиваем только незнакомых
    const lk = [...S.lkWant].slice(0, 60); S.lkWant.clear(); if (lk.length) S.lkAt = Date.now();
    const mc = S.chat && S.chat.on && !(X.live && X.live()) ? `&mc=${S.chat.c || 0}` : '';   // 25.10: чат шахты без живого канала
    const r = await X.api('/api/mine/state' + q() + have + (S.sid ? `&sid=${S.sid}` : '') + (lk.length ? `&lk=${encodeURIComponent(lk.join(','))}` : '') + mc);
    // 29.10: шахту закрыли (округ потерян / доступ кончился) - не висеть в мёртвом окне: сказать и вернуть в город
    if (S && r && !r.ok && r.error === 'mine_closed') { try { if (X.toast) X.toast(C.split('.')[0] === 't-v3' ? 'Новая шахта (тест) закрыта - добытое уже у героя, ничего не пропало. Возвращаю в город' : 'Шахта закрыта: доступа сюда больше нет - возвращаю в город', true); } catch (e) { /* без тоста */ } exit(); return; }
    if (!S || !r || !r.ok) return;
    if (r.mchat && S.chat && S.chat.on) mchat().apply(r.mchat);
    // 29.10: ответ на опрос со старым ключом вкладки (пока шёл, страница вошла заново) про «другую вкладку» не говорит
    if (S.sid === sid0) otherTab(!!r.other);
    // 25.10 (баг «котики стоят»): вкладка была скрыта дольше 3 мин — сервер забыл нас (присутствия в ответе нет: n нет), шаги и уходы
    // других больше не приходили, а старые коты стояли до перезагрузки. Заходим снова — сервер пришлёт всех заново
    if (r.n == null && !r.other && Date.now() - (S.rejoinAt || 0) > 15000) { S.rejoinAt = Date.now(); enter(true); }
    hereOf(r); presence(r); take(r.st, r.me, r.lk);
  }
  /** Событие «mine» живого канала: новый вид шахты (st) и/или кто пришёл/ушёл/шагнул (a, m, g). */
  function onEvent(d) { if (!S || !d) return; if (d.chatRoom === 'mine') { if (S.chat && S.chat.on) mchat().apply(d); return; } if (d.c && d.c !== C) return;
    if (d.here != null) { hereOf(d); if (!d.st && !d.a && !d.m && !d.g && d.n == null) return; }   // 26.10: только счётчик - котов не трогаем
    if (d.st) take(d.st, null); presence(d); }
  function hereOf(d) { if (!S || !d || d.here == null) return; S.here = +d.here || 0; S.hw = d.hw != null ? +d.hw || 0 : null; S.hg = d.hg != null ? +d.hg || 0 : null; if (d.hm) S.hm = +d.hm || 0; try { cnt(); } catch (e) { console.error('[шахта] счётчик', e); } }

  /* ---------- новый вид шахты ---------- */
  // 26.10: исключение при отрисовке - один раз заново в старом облике (без рисунков обновления), снова исключение - текст ошибки (fail)
  function take(st, me, lk) {
    if (!S) return;
    try { take0(st, me, lk); } catch (e) { recover(e, () => take0(st, me, lk)); }
  }
  function recover(e, redo) {
    if (!S) return;
    if (!S.safe && mine2On()) {
      try { console.error('[шахта] рисунки обновления', e); } catch (x) {}
      S.safe = true; S.svgKey = ''; S.barKey = ''; S.bodyHtml = '';
      try { if (window.LGMineBiome) window.LGMineBiome.off(S); for (const d of [...S.heroes.children]) d.remove(); if (S.F && S.st) { draw(); panel(); fit(true); } else redo(); return; } catch (e2) { e = e2; }
    }
    fail(e);
  }
  function take0(st, me, lk) {
    if (me) S.me = me;
    else { try { const h = X.hero(); if (h && h.mn && h.mn[C]) S.me = h.mn[C]; } catch (e) {} }
    if (lk) for (const [l, v] of Object.entries(lk)) S.looks.set(l, v);
    const m2 = mine2On() ? '1' : '0'; if (S.el.dataset.m2 !== m2) { S.el.dataset.m2 = m2; if (S.mchatOn && CHM) CHM.init(); }   // 25.10: CSS обновления шахты — .mn[data-m2="1"]
    // 25.10: запоздавший вид (опрос и живой канал приходят вперемешку) — не откатываем шахту назад: «бью → не бью → бью»
    if (st && S.st && st.v < S.st.v && st.v > S.st.v - 500 && st.week === S.st.week) st = null;
    if (!st) { panel(); return; }
    // 24.10: вид без раскладки этажа (fl) — этаж тот же, раскладка у нас; этаж новый, а раскладки нет — спросить вид целиком
    if (!st.fl) { if (S.st && S.st.fl && S.st.seed === st.seed && S.st.n === st.n) st = { ...st, fl: S.st.fl }; else { if (!S.full) { S.full = true; poll(true).finally(() => { if (S) S.full = false; }); } return; } }
    const newFloor = !S.st || S.st.n !== st.n || S.st.seed !== st.seed;
    const prevDug = S.dug, prevDg = (S.st && S.st.dg) || {}, prevMy = S.myI;
    S.st = st; S.F = floorOf(st); S.dug = dugArr(st); S.stAt = Date.now();
    // 30.10 (репорт #2171): большой этаж, а mine3.js ещё грузится - этажа пока нет (S.F null): дальше не идём (раньше «+руда» и рисование
    // падали на S.F.cells, и выходило окно ошибки); догрузится - m3lib нарисует этаж, следующий опрос - остальное
    if (!S.F && st.fl && st.fl.v3) { S.burst = null; if (newFloor) { S.path = null; S.want = null; S.qq = []; } return; }
    // 25.10: «+руда» — только тому, кому она досталась (st.dl: кто сколько получил с этого камня); остальным копавшим — «Камень разбит»
    // 29.10 (антибот): в dl сервер шлёт только свою долю, d[6] - сколько всего получили (для «досталась другим копавшим»)
    // 25.10: добыча осколками (1 шт. = 100): d[4] — осколки; старый вид (без d[4]) — штуки d[3]
    const gotOf = (i) => { const d = (st.dl || []).find((x) => x[0] === i && x[1] === st.n); if (!d) return null; const m = d[4] || d[3] || {}, v = m[X.login()] || 0; return { r: d[2], q: d[4] ? v : Math.round(v * 100), any: d[6] != null ? +d[6] || 0 : Object.keys(m).length, loot: (d[5] || {})[X.login()] || null }; };
    if (!newFloor && prevDug.length) S.burst = S.dug.map((d, i) => (d && !prevDug[i] ? i : -1)).filter((i) => i >= 0).map((i) => ({ i, mine: i === prevMy || (prevDg[i] || []).includes(X.login()), got: gotOf(i) }));
    // мой камень: из вида шахты (кто где копает) — надёжнее, чем снимок героя
    // 26.10: в виде у камня - только первые 4 копающих (st.dg), всего их - st.bl[i][3]. Снимку героя (me.i) верим, только если у камня
    // копает больше, чем перечислено (меня могло не войти в 4); перечислены все, а меня нет - не копаю (снимок героя запоздал)
    const mine = Object.entries(st.dg || {}).find(([, ls]) => ls.includes(X.login())), mb = S.me && S.me.i >= 0 && !(st.fl && st.fl.v3 && S.me.f && S.me.f !== st.n) ? (st.bl || {})[S.me.i] : null;   // 29.10: копает на другом этаже - не этот камень
    S.myI = mine ? +mine[0] : (mb && st.dug[S.me.i] !== '1' && (mb[3] || 0) > ((st.dg || {})[S.me.i] || []).length ? S.me.i : -1);   // 24.10: снимок героя запаздывает — после спуска его камень с прошлого этажа не «мой»
    /* 26.10 (стример в эфире: «Сейчас» не пропадала после «Перестать копать» / шага от камня, пока не начнёшь другой камень): сам ушёл
       от камня - пока игра (вид шахты, снимок героя - на эфире запаздывают больше минуты) не подтвердит, что не копаю, этот камень
       не «мой», стоп - ещё раз раз в 30 с. Раньше защита кончалась через 60 с, и запоздавший вид возвращал «Копаешь».
       Подтвердила (камня нет у меня) или копаю другой - защиту снимаем */
    if (S.left) {
      if (S.myI >= 0 && S.myI === S.left.i && !(S.left.ok && mine)) {
        S.myI = -1;
        if (Date.now() - (S.left.sent || S.left.at) > 30000 && Date.now() - S.left.at < 30 * 60000) { S.left.sent = Date.now(); X.api('/api/mineStop', { c: C, sid: S.sid }); }
      } else if (S.myI >= 0 || Date.now() - S.left.at > 30 * 60000) S.left = null;
      // 28.10: игра подтвердила (3 с не копаю) - дальше защита только от запоздавшего снимка героя: у людного камня (больше 4
      // копающих) «мой» берётся из снимка героя, и старый снимок после подтверждения возвращал «Копаешь». Вид шахты (я в списке
      // копающих этого камня) защиту снимает - копаю снова; клик по камню - тоже (S.want)
      else if (Date.now() - S.left.at > 3000) S.left.ok = true;
    }
    // 25.10: что выбрал сам — главнее вида, пока комната не взяла действие из очереди (до 15 с): раньше цель сбрасывалась, и кот
    // «сам переключал камень» на прежний из запоздавшего снимка героя
    if (S.want) {
      const w = S.want, old = Date.now() - w.at > 15000 || newFloor;
      if (old || (w.i >= 0 ? S.myI === w.i || st.dug[w.i] === '1' : S.myI < 0)) S.want = null;
      else S.myI = w.i;
    }
    // незнакомые копающие (не гуляют здесь — сайт у них закрыт): облик спросим следующим опросом
    // 25.10: сначала тех, кого видно (до 4 у камня), - остальные копают цифрой «+N», их облик не нужен
    for (const ls of Object.values(st.dg || {})) for (const l of ls.filter((x) => x !== X.login()).slice(0, 4)) if (!S.looks.has(l) && !S.others.has(l)) S.lkWant.add(l);
    if (S.lkWant.size && Date.now() - S.lkAt > 5000) { S.lkAt = Date.now(); setTimeout(() => poll(), 50); }
    if (newFloor && S.pos && S.F) { S.pos = spawnPt(); S.path = null; S.want = null; S.qq = []; }
    if (follow3(st)) return;
    draw(); panel();
    // 30.10: журнал шахты в чате - перерисовать вкладку, только если журнал поменялся и она открыта
    { const lk = (st.log || []).length + ':' + ((st.log || [])[0] || {}).at; if (lk !== S.logK) { S.logK = lk; if (S.chat && S.chat.on && S.chat.open && S.chat.tab === 'lg' && CHM) CHM.render(); } }
    if (newFloor) fit(true);
    // 25.10: герой копает (так говорит игра), а стоит не у камня - зашёл в шахту, пока он копал без сайта, или очередь дала следующий
    // камень: идёт к нему сам (раньше махал киркой у входа). Отошёл сам (want.i = -1) - не тянем назад
    if (S.myI >= 0 && S.pos && !S.path && !atRock(S.myI) && !(S.want && S.want.i < 0)) { const sp = digSpot(S.myI); if (sp != null && pathTo(cellOfPt(S.pos.x, S.pos.y), sp)) walkTo(sp); }
    if (S.me && S.me.fx && S.me.fx.sh) sfxArt();   // 26.10: рисунки осколков (shard-art.js) - заранее, до первого выкопанного камня
    if (S.burst && S.burst.length) { for (const b of S.burst) burst(b); S.burst = null; }
    // 25.10: «Понятно» нажато — та же сводка не всплывает снова из запоздавшего снимка героя (перекрывала шахту)
    // 26.10: «Пока тебя не было» - только при входе (первые секунды). Пришло позже, пока игрок здесь, - не всплывает поверх игры
    // (закрывало кнопки панели и лавку посреди дела): отмечаем прочитанным молча
    // 30.10: «Выбери камень» - не в панели, а короткой строкой внизу, один раз в первые секунды после входа (если герой не копает)
    if (!S.pickTip && S.F && Date.now() - S.at0 < 15000) { S.pickTip = 1; if (S.myI < 0 && !(S.me && S.me.news)) tip(tx().pick); }
    if (S.me && S.me.news && !S.newsShown && NEWS_SEEN[C] !== newsKey(S.me.news)) {
      if (Date.now() - S.at0 < 15000) news(S.me.news);
      else { S.newsShown = true; NEWS_SEEN[C] = newsKey(S.me.news); try { X.api('/api/mineSeen', { c: C }); } catch (e) {} }
    }
  }

  /* ---------- 23.10: камень выкопан — осколки и «+руда» (CSS, один раз) ---------- */
  function burst(b) {
    const W = GX(), c = W.cellXY(b.i), cell = S.F.cells[b.i], col = (CW().RES || {})[cell.r] || '#9a8e80', deb = (S.Wd && S.Wd.debris) || ['#8e7f70', '#8e7f70'];
    const el = document.createElement('div'); el.className = 'mn-burst'; el.style.left = c.x + 'px'; el.style.top = (c.y - 40) + 'px'; el.style.zIndex = String(Math.round(c.y) + 5);
    let h = ''; for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + Math.random() * 0.5, d = 40 + Math.random() * 40; h += `<i style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 30).toFixed(0)}px;--r:${(Math.random() * 360).toFixed(0)}deg;background:${k % 3 ? deb[k % 2] : col}"></i>`; }
    const g = b.got, mineGot = !!(g && g.q > 0);
    // 25.10: окаменевший сундук — «Сундук: +120 осколков железа, +80 осколков угля» (только получившему)
    const lootT = b.mine && g && g.loot ? 'Сундук: ' + Object.entries(g.loot).filter(([, v]) => v > 0).map(([k, v]) => gotText(v, k)).join(', ') : '';
    const sfx = b.mine ? shardFx(cell, g, mineGot, lootT) : '';   // 26.10: осколок из камня (тестерам - mineShardFxPublic)
    if (sfx) h += sfx;
    else if (lootT) h += `<b class="mn-loot">${esc(lootT)}</b>`;
    else if (b.mine && cell.r && mineGot) h += `<b>${esc(gotText(g.q, cell.r))}</b>`;
    else if (b.mine) h += `<b>${esc(tx().broke)}</b>`;
    el.innerHTML = h; S.heroes.appendChild(el); setTimeout(() => el.remove(), 1500);
    if (sfx) el.addEventListener('animationend', (e) => { if (e.target.classList && e.target.classList.contains('mn-sfx-p')) e.target.remove(); });
    if (!b.mine) return;
    ding();
    const other = cell.r && g && !mineGot && g.any ? ` ${resName(cell.r)} досталась другим копавшим (по вкладу) — тебе монеты за работу.` : '';
    tip(cell.t === 'rare' ? (mineGot ? (cell.r === S.st.gem ? `Самоцвет! ${resName(cell.r)} — такой есть только в шахтах этой природы` : `${tx().rare}: ${resName(cell.r)}!`) : `Жила вскрыта.${other}`) : cell.t === 'chest' ? (lootT ? `${lootT}. Загляни в журнал — вдруг там ещё и приз` : 'Клад вскрыт! Загляни в журнал — вдруг там приз') : tx().done + (other ? '.' + other : ''));
  }
  /* 26.10 (новинка, тестерам - mineShardFxPublic, me.fx.sh): «всплывашка с осколком» - из камня вылетает 1-3 осколка цвета руды
     (дуга вверх и наружу, вращение, затухание), рядом «+37 осколков адамантита» со значком. Только CSS (transform / opacity, mine.css
     .mn-sfx-*), осколок удаляется по animationend; на экране не больше SFX_MAX осколков (лишние - только текст); вкладка скрыта -
     как было; prefers-reduced-motion - без полёта (CSS), значок + число. Пусто - старый вид всплывашки */
  const SFX_MAX = 12, SFX_GEM = new Set(['adamant', 'fire_opal', 'emerald', 'amber', 'sapphire', 'topaz', 'malachite', 'morion', 'aquamarine', 'ruby', 'runestone']), SFX_RARE = new Set(['gold', 'crystal', 'silver', 'relic']);
  // один рисунок осколка, три формы (самоцвет - огранка и искра, редкое - самородок с бликом, порода / руда - камешек); цвет - --c
  const SFX_SVG = {
    gem: '<path class="b" d="M12 1.6 20.6 9 12 22.4 3.4 9Z"/><path class="l" d="M12 1.6 3.4 9h8.6Z"/><path class="d" d="M12 9h8.6L12 22.4Z"/><path class="ln" d="M3.4 9h17.2M12 9v13.4M7.2 9 12 1.6l4.8 7.4"/><path class="sp" d="M19.6 1.4l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9Z"/>',
    rare: '<path class="b" d="M5.2 8.6 10.4 3.4l7.4 1.6 3.6 6.8-2.8 7.6-8 2.2-6.6-4.8Z"/><path class="d" d="M21.4 11.8l-2.8 7.6-8 2.2 1.8-6.4Z"/><path class="l" d="M10.4 3.4l7.4 1.6-4.2 4.2-6.6-.2Z"/><path class="gl" d="M8.2 11.6q.6-2.6 3-3.4"/><path class="sp" d="M17.6 7.2l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z"/>',
    rock: '<path class="b" d="M3.6 13.4 7.4 5.6l8.6-1.8 4.8 7.2-2.4 8.4-9.2 1.4Z"/><path class="l" d="M7.4 5.6l8.6-1.8 4.8 7.2-7.6-1.8Z"/><path class="d" d="M13.2 9.2l7.6 1.8-2.4 8.4-9.2 1.4Z"/>',
  };
  const sfxKind = (r) => (SFX_GEM.has(r) || (r && S.st && r === S.st.gem) ? 'gem' : SFX_RARE.has(r) ? 'rare' : 'rock');
  // 26.10 (стример: «осколки для каждого вида руд»): свой осколок у каждого из 28 видов - shard-art.js (грузится при первой нужде, как
  // mine-biome.js; своя версия - LG_CITYV.sa). Пока не загрузился (или вид неизвестен) - общий рисунок SFX_SVG по форме
  const SA_JS = (window.LG_CITYV && window.LG_CITYV.sa) ? '/site/shard-art.js?v=' + window.LG_CITYV.sa : ((document.currentScript && document.currentScript.src) || '/site/mine.js').replace(/mine\.js(\?.*)?$/, 'shard-art.js');
  let saLd = 0;
  const sfxArt = () => { if (window.LGShardArt) return window.LGShardArt; if (!saLd) { saLd = 1; const sc = document.createElement('script'); sc.src = SA_JS; sc.onerror = () => { saLd = 0; }; document.head.appendChild(sc); } return null; };
  const sfxIcon = (r, cls) => {
    const k = sfxKind(r), A = sfxArt(), own = !!(A && A.KIND && A.KIND[r]), col = (CW().RES || {})[r] || '#9a8e80';
    return `<span class="${cls} mn-sfx-${k}" data-r="${esc(r)}"${own ? ' data-art="1"' : ''} style="--c:${col}"><svg viewBox="${own ? A.VB : '0 0 24 24'}" aria-hidden="true">${own ? A.inner(r) : SFX_SVG[k]}</svg></span>`;   // span: .mn-burst i / b - обломки и текст
  };
  function shardFx(cell, g, mineGot, lootT) {
    if (!(S && S.me && S.me.fx && S.me.fx.sh)) return '';
    const loot = lootT && g && g.loot ? Object.entries(g.loot).filter(([, v]) => v > 0) : [];
    if (!loot.length && !(cell.r && mineGot)) return '';   // «Камень разбит» (руда другим) - как было
    const res = loot.length ? loot.map(([k, v]) => [k, v]) : [[cell.r, g.q]];
    // полёт - только при видимой вкладке, без «уменьшить движение» и пока на экране меньше SFX_MAX осколков (на телефоне в толпе камни бьются пачкой)
    let room = document.visibilityState === 'visible' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? SFX_MAX - S.heroes.querySelectorAll('.mn-sfx-p').length : 0, h = '', k = 0;
    const n0 = (q) => (q >= 100 ? 3 : q >= 34 ? 2 : 1);
    for (const [r, q] of res.slice(0, 4)) for (let j = 0, n = loot.length ? Math.min(2, n0(q)) : n0(q); j < n && room > 0; j++, k++, room--) {
      const side = k % 2 ? 1 : -1, dx = side * (34 + Math.random() * 34 + (k >> 1) * 14), up = -(30 + Math.random() * 26), t = 0.9 + Math.random() * 0.3, rot = side * (200 + Math.random() * 260);
      h += `<span class="mn-sfx-p" style="--dx:${dx.toFixed(0)}px;--up:${up.toFixed(0)}px;--rot:${rot.toFixed(0)}deg;--t:${t.toFixed(2)}s;--dl:${(k * 0.06).toFixed(2)}s">${sfxIcon(r, 'mn-sfx-s')}</span>`;
    }
    const ic = res.slice(0, 4).map(([r]) => sfxIcon(r, 'mn-sfx-ic')).join('');
    return h + (loot.length ? `<b class="mn-loot mn-sfx-t">${ic}<span>${esc(lootT)}</span></b>` : `<b class="mn-sfx-t">${ic}<span>${esc(gotText(g.q, cell.r))}</span></b>`);
  }
  // 25.10 (новинка, тестерам — mineSoundPublic): короткий звук, когда твой камень разбит (вкладка может быть в фоне)
  let actx = null;
  function ding() {
    if (!(S && S.me && S.me.fx && S.me.fx.snd)) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime;
      for (const [f, d] of [[880, 0], [1320, 0.09]]) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.18, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25); o.connect(g).connect(actx.destination); o.start(t + d); o.stop(t + d + 0.3); }
    } catch (e) {}
  }

  /* ---------- 23.10: «пока тебя не было» — что герой сделал без игрока ---------- */
  const NEWS_SEEN = {}, newsKey = (nw) => `${nw.b || 0}:${nw.at || 0}:${nw.f || 0}`;
  function news(nw) {
    S.newsShown = true;
    const res = resList(nw), idle = S.myI < 0;
    const d = document.createElement('div'); d.className = 'mn-news panel'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Пока тебя не было');
    // 30.10 (стример): минималистичнее - заголовок, две-три строки, «Понятно»
    d.innerHTML = `<h3 class="h3">Пока тебя не было</h3><ul><li>Камней: <b>${nw.b || 0}</b>${nw.f ? ` · находок: <b>${nw.f}</b>` : ''} · ${buyerOn() ? 'оплата' : 'заработок'} <b>+${coins(nw.cx != null ? nw.cx : nw.c)}</b></li>${res.length ? `<li>${res.slice(0, 4).map(([k, n, p]) => `${esc(resName(k))} <b>${esc(qty(n, p))}</b>`).join(', ')}${res.length > 4 ? '…' : ''}</li>` : ''}</ul>
      <p class="muted">${esc(idle ? 'Герой ждёт - выбери ему камень.' : 'Герой всё ещё копает.')}</p><div class="mn-btns"><button type="button" class="btn primary sm" data-ok>Понятно</button></div>`;
    // 25.10: окно — по центру экрана поверх всего, не выше экрана (текст прокручивается, «Понятно» всегда видно)
    const w = document.createElement('div'); w.className = 'mn-news-w'; w.appendChild(d); S.el.appendChild(w);
    w.addEventListener('pointerdown', (e) => { if (e.target === w) d.querySelector('[data-ok]').click(); });
    d.querySelector('[data-ok]').onclick = () => { w.remove(); NEWS_SEEN[C] = newsKey(nw); X.api('/api/mineSeen', { c: C }); };
    try { d.querySelector('[data-ok]').focus({ preventScroll: true }); } catch (e) {}
  }

  function draw() {
    if (!S.F && S.st && S.st.fl && S.st.fl.v3) S.F = floorOf(S.st);   // 29.10: mine3.js догрузился
    if (V3()) return draw3();
    const W = CW(), F = S.F; if (!F) return;
    // 30.10 (репорт #2148): неделя сменилась с большого этажа на прежний - убрать сцену Шахты 3.0 (куски, мини-карту, цвет фона)
    if (S.m3) { S.m3.el.remove(); S.m3 = null; S.svg.classList.remove('v3'); S.view.style.background = ''; const mm = S.el.querySelector('.mn-mm'); if (mm) mm.remove(); }
    const front = new Set(S.st.front || []);
    const lampMan = pickOn() || S.st.n >= (S.st.lampFrom || 4) || (S.st.rec || 0) >= (S.st.lampFrom || 4);   // 26.10: Снабженец - у входа всегда
    S.dark = S.st.n >= (S.st.darkFrom || 5) && !lampOn();
    // 25.10 (телефон мигал): сцену (SVG этажа) перерисовываем, только когда она поменялась — камень выкопан, фронт, этаж, темнота;
    // новый вид шахты каждые 2 с (кто сколько накопал) трогает лишь полоски и героев
    const art = art2On() && window.LGMineArt ? window.LGMineArt : null;   // 25.10: новые рисунки (mine-art.js) - обновление шахты mine2
    const B = art2On() ? biome() : null;
    const key = [S.st.seed, S.st.n, S.st.dug, (S.st.front || []).join('.'), lampMan ? 1 : 0, pickOn() ? 1 : 0, S.dark ? 1 : 0, S.st.biome, B ? 1 : 0, art ? 2 : 1].join('|');
    if (key === S.svgKey) { bars(); heroes(); return; }
    S.svgKey = key;
    F.done = S.dug.every((d, i) => d || F.cells[i].t === 'wall');
    // 25.10 (mine2): цвета камней — палитра пласта глубины (mine-biome.js palette, те же, что CSS --rock-*); пока не загрузился — слой craftworld
    const BP = art && B && B.palette ? B.palette(S.st) : null;
    const rockPal = BP && BP.rock ? (c, L) => (c.t === 'wall' ? (BP.wall ? [BP.wall, art.mix(BP.wall, '#ffffff', 0.18)] : null) : c.t === 'hard' ? BP.hard || BP.rock : BP.rock) : null;
    const Wd = W.build(F, { dug: S.dug, front, prog: {}, special: F.special ? specialName(F.special) : '', lampMan, trader: pickOn(), bare: !!B, art, rockPal });   // 26.10: trader - лавка торговца снаряжением (mine-art traderArt) вместо столба Фонарщика
    if (pickOn() && Wd.lampNpc) Wd.lampNpc = { ...Wd.lampNpc, name: SUP };   // 26.10: подпись над NPC
    S.Wd = Wd;
    S.svg.setAttribute('viewBox', `${Wd.VX0} 0 ${Wd.VW} ${Wd.H}`); S.svg.setAttribute('width', Wd.VW); S.svg.setAttribute('height', Wd.H); S.svg.style.left = Wd.VX0 + 'px';
    S.world.style.width = Wd.W + 'px'; S.world.style.height = Wd.H + 'px';
    const props = Wd.props.slice().sort((a, b) => a.y - b.y);
    // 25.10: каска у Скупщика и Фонарщика — на голове (рисует человечек: minerHat), а не отдельной картинкой над ним («левитировала»)
    // 25.10: имена NPC — в слое подписей поверх героев (в SVG их закрывали коты, стоящие перед лавкой)
    const lbl = [], occ = [];
    // 26.10: n.look - облик торговца (LGMineArt.TRADER_LOOK из entry при trader, только при флаге кирок)
    const npcG = (n, id, seed) => { if (!n) return ''; const nk = 0.8, sv = still(X.doodle(seed, n.look || { look: { hat: 'none' }, minerHat: true }, 'happy', 'peace')); lbl.push(`<span class="mn-lbl" data-for="${id}" style="left:${n.x}px;top:${(n.y - 170 * nk - 2).toFixed(0)}px">${esc(n.name)}</span>`); occ.push({ k: id === 'buy' ? 'npcBuy' : 'npcLamp', svg: figSvg(n.x, n.y, sv, nk), z: Math.round(n.y) }); return `<g data-npc="${id}" class="mn-npc">${figSvg(n.x, n.y, sv, nk)}</g>`; };
    let npcSvg = npcG(Wd.npc, 'buy', 'npc:skupshik:' + (S.st.biome || '')) + npcG(Wd.lampNpc, 'lamp', 'npc:fonarshik');
    // 23.10: с этажа darkFrom без каски с фонарём темно — камней не видно, копать нельзя
    if (S.dark) npcSvg += `<g class="mn-dark"><rect x="${Wd.VX0}" y="0" width="${Wd.VW}" height="${Wd.Y0 + Wd.GRID_H + 10}" fill="#05030a" opacity=".93"/><text x="${Wd.W / 2}" y="${Wd.Y0 + Wd.GRID_H - 140}" text-anchor="middle" font-family="Golos Text, Arial" font-weight="800" font-size="34" fill="#ffe27a">Темно — ничего не видно</text><text x="${Wd.W / 2}" y="${Wd.Y0 + Wd.GRID_H - 96}" text-anchor="middle" font-family="Golos Text, Arial" font-weight="700" font-size="24" fill="#cfc4b0">Надень «Каску шахтёра» (кнопка «Сумка») или купи у ${pickOn() ? 'Снабженца' : 'Фонарщика'}</text></g>`;
    // закрытые камни (ни с одной из 4 сторон нет расчищенного) — темнее и без «руки»: копать можно только доступные (решение стримера)
    // 25.10: предметы входа (подъёмник, лавка, доска, вагонетка, столб Фонарщика) — в своих группах <g data-obj>: клик, подсветка, подпись
    S.svg.innerHTML = GLOW + Wd.back + props.map((p) => (p.i != null ? `<g data-i="${p.i}"${front.has(p.i) ? ' class="open"' : S.F.cells[p.i].t === 'wall' ? '' : ' class="far"'}>${p.svg}</g>` : p.obj ? `<g data-obj="${p.obj}" class="mn-obj${OBJ[p.obj] && (p.obj !== 'lamp' || Wd.lampNpc) ? ' act' : ''}">${p.svg}</g>` : p.svg)).join('') + npcSvg;
    S.labels.innerHTML = lbl.join('') + '<span class="mn-hl" hidden></span>';
    occlude(Wd, props, occ);
    if (B) B.paint(S, Wd); else if (window.LGMineBiome) window.LGMineBiome.off(S);   // 25.10: «Шахта 2.0» - фон этажа своим слоем
    S.barKey = ''; bars(); heroes();   // 25.10: сцена новая - копаемые камни (mine-art) отметить заново
    S.failed = '';
  }
  /* 30.10 (просьба стримера): над лифтом и над буровой в стройке - табличка «Этаж 2 через 18 мин» / «Ур. 2 через 47 мин» (крупно, как подписи НПС).
     Свой слой подписей (.mn-tmrs в S.labels), не внутри рисунка постройки. Время - серверное (left / at с поправкой S.stAt, как в окне лифта);
     перерисовывается только когда текст поменялся (раз в минуту): по опросу шахты и раз в 30 с (setInterval ниже). Готово - таблички нет. */
  const tmrTxt = (ms) => { const m = Math.max(1, Math.ceil(ms / 60000)); return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${m % 60} мин`; };
  function tmrDraw() {
    if (!S || !S.st || !V3() || !S.m3 || !S.m3.G) return;
    const host = S.labels.querySelector('.mn-tmrs'); if (!host) return;
    const G = S.m3.G, st = S.st, el = Date.now() - (S.stAt || Date.now()), list = [], L = st.lift || {};
    if (L.st === 'up' && st.n >= (st.deep || st.n)) { const ms = L.left != null ? L.left - el : (L.at || 0) - Date.now(); if (ms > 0) { const [hx, hy] = G.hall; list.push([hx + 256, hy - 64, `Этаж ${(st.deep || st.n) + 1} через ${tmrTxt(ms)}`, 'lift']); } }
    for (const d of st.drills || []) { if (d[3] !== 'build') continue; const ms = d[7] - el; if (!(ms > 0)) continue; const p = G.cellXY(d[2]); list.push([p.cx, p.y - 150 - Math.max(1, d[4]) * 26, `Ур. ${d[4] + 1} через ${tmrTxt(ms)}`, 'drill']); }
    const k = list.map((q) => q.join('|')).join(';'); if (k === S.tmrK) return; S.tmrK = k;
    host.innerHTML = list.map(([x, y, t, c]) => `<span class="mn-lchip mn-tmr mn-tmr-${c}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${esc(t)}</span>`).join('');
  }
  /* 29.10 (Шахта 3.0): большой этаж - сцена кусками (mine3.js), туман, зал лифта (клеть, Снабженец, скупщик, доска), мини-карта.
     Перерисовка - как у прежнего этажа: только когда поменялся вид (выкопали, фронт, этаж, темнота); куски - только изменившиеся и в кадре. */
  function draw3() {
    const L3 = window.LGMine3, A = window.LGMineArt, F = S.F; if (!L3 || !A || !F) return;
    const front = new Set(S.st.front || []);
    S.dark = S.st.n >= (S.st.darkFrom || 5) && !lampOn();
    // 30.10 (баг): стадия лифта (поиск шахты, сбор, таймер) - про самый глубокий этаж; на верхних этажах над лифтом - только «этажи 1-N»
    const deep3 = S.st.deep || S.st.n, onDeep = S.st.n >= deep3;
    // 29.10: что с лифтом - над клетью
    const Lf = S.st.lift || { st: 'dig' }, lch = !onDeep ? `этажи 1-${deep3}` : Lf.st === 'fund' ? `сбор ${Math.floor(Lf.need ? Math.min(100, Lf.c / Lf.need * 100) : 0)}%` : Lf.st === 'up' ? 'лифт улучшается' : 'ищем шахту лифта';
    const key = ['v3', lch, (S.st.drills || []).map((d) => d[0] + d[3] + d[4]).join(','), S.st.seed, S.st.n, S.st.dug, (S.st.front || []).join('.'), S.dark ? 1 : 0, (S.st.fl.c || []).length, pickOn() ? 1 : 0, window.LGMineBiome ? 1 : 0].join('|');
    drillMenuFill(); tmrDraw();
    if (key === S.svgKey) { bars(); heroes(); mmap(); return; }
    const forced = !S.svgKey;
    S.svgKey = key;
    // 30.10 (репорт #2148: «фон сохранился с прошлой шахты»): шахту открыли на прежнем этаже (Шахта 2.0), потом пришла неделя Шахты 3.0 -
    // фон прежнего этажа (картинка стен с крепью и кристаллами, плитка породы, виньетка, частицы - mine-biome.js) оставался под новым
    if (window.LGMineBiome && (S.mnb || S.world.querySelector('.mnb-bg'))) { window.LGMineBiome.off(S); S.world.querySelectorAll('.mnb-bg').forEach((e) => e.remove()); }
    if (!S.m3) { S.m3 = L3.scene(S); S.world.insertBefore(S.m3.el, S.world.firstChild); }
    const Wd = S.m3.update(F, { dug: S.dug, front, dark: S.dark, lampMan: true, trader: pickOn(), lift: { ...(S.st.lift || {}), deep: S.st.deep || S.st.n } });
    if (Wd.lampNpc) Wd.lampNpc = { ...Wd.lampNpc, name: pickOn() ? SUP : 'Фонарщик', ...(pickOn() && A.TRADER_LOOK ? { look: A.TRADER_LOOK } : {}) };
    S.Wd = Wd;
    S.svg.setAttribute('viewBox', `0 0 ${Wd.W} ${Wd.H}`); S.svg.setAttribute('width', Wd.W); S.svg.setAttribute('height', Wd.H); S.svg.style.left = '0px';
    S.svg.classList.add('v3');   // пустое место слоя предметов не ловит нажатия - камни в кусках сцены под ним
    S.world.style.width = Wd.W + 'px'; S.world.style.height = Wd.H + 'px';
    S.view.style.background = Wd.theme.wallD;
    /* 30.10 (лаги на людном этаже): выкопали камень (на канале с сотней копающих - каждые несколько секунд) - зал лифта (клеть, лавки,
       доска, НПС, подписи, их копии в слое героев) раньше собирался заново целиком. Теперь - только если поменялось то, из чего он
       рисуется: этаж, природа, темнота, кирки, лифт, догрузились рисунки; перерисовку по ошибке или новому облику (svgKey '') - всегда */
    const hallK = [Wd.W, Wd.H, F.n, S.st.seed, S.st.biome, S.dark ? 1 : 0, pickOn() ? 1 : 0, lch, onDeep ? 1 : 0, JSON.stringify(S.st.lift || {}), S.st.deep || 0, window.LGMineBiome ? 1 : 0, window.LGPickArt ? 1 : 0, A.TRADER_LOOK ? 1 : 0].join('|');
    if (!forced && hallK === S.hallK && S.svg.firstChild && S.heroes.querySelector('.mn-oc')) { S.barKey = ''; bars(); heroes(); mmap(); S.failed = ''; return; }
    S.hallK = hallK;
    const lbl = [], occ = [];
    const npcG = (n, id, seed) => { if (!n) return ''; const nk = 0.8, sv = still(X.doodle(seed, n.look || { look: { hat: 'none' }, minerHat: true }, 'happy', 'peace')); lbl.push(`<span class="mn-lbl" data-for="${id}" style="left:${n.x}px;top:${(n.y - 170 * nk - 2).toFixed(0)}px">${esc(n.name)}</span>`); occ.push({ k: id === 'buy' ? 'npcBuy' : 'npcLamp', svg: figSvg(n.x, n.y, sv, nk), z: Math.round(n.y) }); return `<g data-npc="${id}" class="mn-npc">${figSvg(n.x, n.y, sv, nk)}</g>`; };
    let npcSvg = npcG(Wd.npc, 'buy', 'npc:skupshik:' + (S.st.biome || '')) + npcG(Wd.lampNpc, 'lamp', 'npc:fonarshik');
    // темно (с этажа darkFrom без каски): весь этаж, кроме зала лифта
    if (S.dark) { const [hx, hy, hw, hh] = GX().hall; npcSvg += `<g class="mn-dark"><path d="M0 0H${Wd.W}V${Wd.H}H0Z M${hx} ${hy}V${hy + hh}H${hx + hw}V${hy}Z" fill="#05030a" fill-rule="evenodd" opacity=".93"/><text x="${hx + hw / 2}" y="${hy - 60}" text-anchor="middle" font-family="Golos Text, Arial" font-weight="800" font-size="30" fill="#ffe7a0">Темно - нужна каска с фонарём</text></g>`; }
    const props = Wd.props.slice().sort((a, b) => a.y - b.y);
    S.svg.innerHTML = GLOW + props.map((p) => `<g data-obj="${p.obj}" class="mn-obj${OBJ[p.obj] && (p.obj !== 'lamp' || Wd.lampNpc) ? ' act' : ''}">${p.svg}</g>`).join('') + npcSvg;
    // 30.10: пока лифт улучшается - вместо этого табличка со временем (tmrDraw)
    { const [hx, hy] = GX().hall; if (Lf.st !== 'up' || !onDeep) lbl.push(`<span class="mn-lchip mn-lchip-${esc(onDeep ? Lf.st : 'fl')}" style="left:${hx + 256}px;top:${hy - 64}px">${esc(lch)}</span>`); }
    S.labels.innerHTML = lbl.join('') + '<span class="mn-hl" hidden></span><span class="mn-tmrs"></span>'; S.tmrK = ''; tmrDraw();
    occlude(Wd, props, occ);
    S.barKey = ''; bars(); heroes(); mmap();
    S.failed = '';
  }
  // мини-карта (под шапкой слева): лифт, ты, жилы, открытые залы, шахта лифта
  function mmap() {
    if (!V3() || !S.m3) return;
    // 30.10: мини-карта - под шапкой слева (в одной колонке с ней), меньше
    let el = S.el.querySelector('.mn-mm'); if (!el) { el = document.createElement('div'); el.className = 'mn-mm'; el.setAttribute('aria-label', 'Карта этажа'); (S.el.querySelector('.mn-tl') || S.el).appendChild(el); }
    const me = S.pos ? GX().cellAt(S.pos.x, S.pos.y) : null, k = [S.svgKey, me].join('|'); if (el.dataset.k === k) return; el.dataset.k = k;
    el.innerHTML = '<div class="mn-mm-t">Карта этажа</div>' + S.m3.minimap(me);
  }
  /* 25.10 (mine/walk): глубина у входа. Сцена (SVG) - под слоем героев, поэтому коты рисовались поверх доски и лавки, даже стоя за ними.
     Копия предметов входа и NPC - в слое героев (в нём же z героев - по линии ног): z копии - линия основания предмета (FOOT z), кто
     стоит выше неё - за предметом. Копии не ловят нажатия (клик и подсветка - у предметов сцены под ними); перерисовка - только с новой сценой */
  function occlude(Wd, props, npcs) {
    S.ft = GX().feet({ lamp: !!Wd.lampNpc });
    for (const e of S.heroes.querySelectorAll('.mn-oc')) e.remove();
    const box = (k) => { const f = GX().FOOT.find((x) => x.k === k); return f ? [f.s[0] - 60, f.z - 340, f.s[2] - f.s[0] + 120, f.s[3] - f.z + 360] : null; };
    let h = '';
    for (const o of [...props.filter((p) => p.obj).map((p) => ({ k: p.obj, svg: p.svg })), ...npcs]) {
      const b = box(o.k), f = GX().FOOT.find((x) => x.k === o.k); if (!b) continue;
      h += `<svg class="mn-oc" data-oc="${o.k}" aria-hidden="true" focusable="false" overflow="visible" width="${b[2]}" height="${b[3]}" viewBox="${b.join(' ')}" style="position:absolute;left:${b[0]}px;top:${b[1]}px;z-index:${o.z || f.z};pointer-events:none;overflow:visible">${o.svg}</svg>`;
    }
    S.heroes.insertAdjacentHTML('afterbegin', h);
  }
  // 25.10: предметы входа, на которые можно нажать (вагонетка — просто рисунок), и подпись при наведении
  const OBJ = { lift: () => (V3() ? 'Лифт - этажи и выход в город' : 'В город - подъёмник'), buyer: 'Скупщик Гром - сдать руду', board: 'Поручения скупщика', lamp: () => (pickOn() ? SUP + ' - кирки, рудная сумка, каска' : 'Фонарщик - каска шахтёра'), up: () => upText() };
  const objText = (k) => (typeof OBJ[k] === 'function' ? OBJ[k]() : OBJ[k] || '');
  // 26.10 (mine2): верхняя клеть - откуда спустились и когда спуск дальше (сам переход этажей не трогаем: он у сервера)
  function upText() {
    if (!S || !S.st || !S.F) return '';
    const n = S.st.n, left = (S.dug || []).filter((d, i) => !d && S.F.cells[i] && S.F.cells[i].t !== 'wall').length;
    const from = n > 1 ? `Отсюда спустились с этажа ${n - 1}. ` : '';
    return left ? `${from}Спуск на этаж ${n + 1} откроется, когда выкопают все камни этажа (осталось ${left})` : `${from}Этаж расчищен - спуск на этаж ${n + 1} начнётся сам`;
  }
  const NPC_OBJ = { buy: 'buyer', lamp: 'lamp' };
  // 25.10: контур по форме предмета при наведении (обновление шахты): толще альфа-канал → заливка → под рисунок; только у одной группы под мышью
  const GLOW = '<defs><filter id="mnGlow" x="-12%" y="-12%" width="124%" height="124%"><feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d"/><feFlood flood-color="#ffe27a"/><feComposite in2="d" operator="in" result="o"/><feGaussianBlur in="o" stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  // свет: надета «Каска шахтёра» (снимок героя сайта — сразу после «Надеть», игра подтвердит через пару секунд) или игра так говорит
  const LAMP_ID = 'miner_helmet';
  const heroItems = () => { try { const h = X.hero(); return (h && h.items) || []; } catch (e) { return []; } };
  const lampOn = () => heroItems().some((it) => it.id === LAMP_ID && it.on) || !!(S.me && S.me.lamp && !heroItems().some((it) => it.id === LAMP_ID && !it.on));
  const lampHave = () => heroItems().find((it) => it.id === LAMP_ID) || null;
  const specialName = (k) => tx().sp[k] || '';
  const still = (svg) => String(svg || '').replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*?(\/>|>[\s\S]*?<\/\1>)/g, '');   // 25.10: как в «Городе» (и <set>, и парные теги)
  // размер вложенного человечка — прямо в элементе: стиль сайта (.jl-doodle { width: 100% }) иначе раздувает его до всей сцены
  const figSvg = (x, y, svg, k) => `<g transform="translate(${x - 60 * k} ${y - 170 * k + 6}) scale(${k})"><rect x="-20" y="-40" width="160" height="230" fill="transparent"/>${String(svg).replace(/<svg /, '<svg width="120" height="170" style="width:120px;height:170px" overflow="visible" ')}</g>`;

  // 30.10: таблички «через N мин» над лифтом и буровой
  setInterval(() => { if (S && !document.hidden) tmrDraw(); }, 30000);
  const leftTxt = (ms) => { const m = Math.ceil(ms / 60000); return ms <= 0 ? 'почти' : m < 60 ? `ещё ${m} мин` : `ещё ${Math.floor(m / 60)} ч ${m % 60} мин`; };
  // раз в 20 с: время над своим камнем и строка «Копаешь…» (вкладка скрыта — не трогаем)
  // 25.10 (баг «котики стоят»): ушедший пропадает у других по событию «ушёл» (g). Пропало событие (живой канал переподключался,
  // вкладка спала) — кот стоял до перезагрузки. Сервер сам убирает тех, кто не шагал IDLE_MS (2,5 мин, src/site/city.ts), —
  // так же и здесь: шаг старше 2 мин 45 с — его уже нет ни у кого
  const GONE_MS = 165000;
  setInterval(() => {
    if (!S) return; const old = Date.now() - GONE_MS; let n = 0;
    for (const [l, o] of S.others) if ((o.t0 || 0) - (o.dt || 0) < old) { S.others.delete(l); n++; }
    if (n && S.st) heroes();
  }, 20000);
  setInterval(() => { if (!S || document.hidden) return; S.el.querySelectorAll('.mn-bar em[data-left], [data-mn-left][data-left]').forEach((e) => { const t = leftTxt(+e.dataset.left - Date.now()); if (e.textContent !== t) e.textContent = t; });
    if (S.digL && S.digL.length && window.LGMineArt) { const t = (Date.now() - (S.st.at || Date.now())) / 60000; for (const b of S.digL) b.p = 1 - Math.max(0, b.l - b.rate * Math.max(0, t)) / b.w; window.LGMineArt.cracks(S.bars, S.digL); } }, 20000);
  // полоски прогресса камней: ширина доходит до 100% CSS-переходом (длительность — сколько осталось), без кадров JS
  /* 26.10 (просьба стримера): полоска копания - «здоровье» камня: сколько ещё осталось (полная в начале, к концу - пустая), а не
     «сколько выкопано» (росла - казалось, камень зарастает). Цвет по остатку: зелёный → жёлтый → красный. Только CSS: ширина уходит
     к 0 переходом за то же время (eta), цвет - анимацией mnHp на всё время камня (D = eta / остаток), сдвинутой на уже выкопанное */
  const hx2 = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
  const mixC = (a, b, k) => { const A = hx2(a), B = hx2(b); return '#' + A.map((v, j) => Math.round(v + (B[j] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const hpCol = (r) => (r > 0.5 ? mixC('#ffd23f', '#5fd35f', (r - 0.5) * 2) : mixC('#ff4d3d', '#ffd23f', Math.max(0, r) * 2));
  /* 30.10 (лаги): полоска уходила к 0 переходом ширины - его браузер считает сам на каждом кадре (раскладка), и пока хоть одна полоска
     идёт, страница рисовала кадр за кадром и заново считала все анимации копающих (в покое - треть ядра слабого ПК). Теперь заливка (той же ширины, с тем же
     скруглением) уезжает влево на свою ширину за то же время (transform - видеокарта), её левый край прячет дорожка .mn-hpt
     (overflow: hidden, то же скругление): видно то же самое - полоска со скруглёнными краями, правый край идёт к нулю */
  function hpGo(el, rem, eta) {
    if (!(eta > 0 && rem > 0)) return;
    const D = eta / rem;
    el.style.transition = `transform ${eta.toFixed(1)}s linear`; el.style.transform = 'translateX(-100%)';
    el.style.animation = `mnHp ${D.toFixed(1)}s linear ${(-(D - eta)).toFixed(1)}s 1 both`;
  }
  /* 30.10 (стример: убрать правую панель): что копаю - прямо над своим камнем: «Руда 2 ур. · железо», «ещё N мин» и маленькая «Стоп».
     Полоска «здоровья» камня - та же, что у всех камней (mn-bar). Подпись - в слое вида (не в мире: размер не зависит от масштаба),
     место - из камеры (apply) и с полосками (bars) - по событиям, без кадров; текст в DOM - только когда поменялся. */
  function nowDraw() {
    const el = S.el.querySelector('.mn-nowl'); if (!el) return;
    const i = S.myI, on = i >= 0 && !!S.F && !!S.F.cells[i] && !S.dark;
    if (!on) { S.nowA = null; if (!el.hidden) el.hidden = true; return; }
    const W = GX(), c = W.cellXY(i), cell = S.F.cells[i], sc = 1.0 + Math.max(0, (cell.lv || S.F.n) - S.F.n) * 0.1;
    S.nowA = { x: c.x, y: c.y - 70 * sc };
    const t = blockTitle(cell), T = t[0].toUpperCase() + t.slice(1), nt = el.querySelector('[data-mn-nt]'); if (nt.textContent !== T) nt.textContent = T;
    const b = (S.st.bl || {})[i], lt = el.querySelector('[data-mn-left]');
    if (b && b[2] > 0) { const eta = Math.max(0, b[0] / b[2] - (Date.now() - (S.st.at || Date.now())) / 60000) * 60000, v = String(Date.now() + eta); lt.dataset.left = v; const tx2 = leftTxt(eta); if (lt.textContent !== tx2) lt.textContent = tx2; }
    else if (lt.textContent) { lt.textContent = ''; delete lt.dataset.left; }
    if (el.hidden) el.hidden = false;
    S.nowWH = null; nowPlace();
  }
  function nowPlace() {
    const el = S.el.querySelector('.mn-nowl'), a = S.nowA; if (!el || !a || el.hidden) return;
    // над камнем, но целиком на экране (камень у края - подпись прижата к краю)
    // размер подписи - один раз после смены текста (nowDraw), не на каждый сдвиг камеры
    if (!S.nowWH) S.nowWH = [el.offsetWidth, el.offsetHeight];
    const [w, h] = S.nowWH, vw = vSize().w, x = Math.max(4, Math.min(vw - w - 4, S.tx + a.x * S.z - w / 2)), y = Math.max(4, S.ty + a.y * S.z - 6 - h);
    el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
  }
  async function stopDig() {
    if (S.myI < 0 || S.stopping) return;
    S.stopping = 1; S.left = { i: S.myI, at: Date.now() }; S.want = { i: -1, at: Date.now() }; S.qq = [];
    const r = await X.api('/api/mineStop', { c: C, sid: S.sid }); if (!S) return; S.stopping = 0;
    if (r && r.ok) { S.myI = -1; S.barKey = ''; bars(); heroes(); panel(); tip(tx().stopTip); } else { S.want = null; if (r && r.other) otherTab(true); tip((r && r.error) || 'Не получилось'); }
  }
  function bars() {
    const W = GX(), st = S.st, now = Date.now(); let h = '';
    const myQ = (S.me && S.me.qq) || S.qq || [];
    const m3 = V3() && S.m3 ? S.m3 : null, inV = (i) => !m3 || i === S.myI || m3.cellIn(i);   // 29.10: большой этаж - только камни в кадре
    const key = JSON.stringify([st.bl, S.myI, myQ, S.dark, m3 ? m3.viewKey() : '']); if (key === S.barKey) return; S.barKey = key;
    // 25.10: очередь камней (новинка) — номера на камнях
    myQ.forEach((i, k) => { const c = W.cellXY(i); h += `<div class="mn-qn" style="left:${c.x - 14}px;top:${c.y - 70}px">${k + 1}</div>`; });
    for (const [k, b] of Object.entries(st.bl || {})) {
      const i = +k, [left, w, rate, n] = b; if (!w || (S.dark && i !== S.myI) || !inV(i)) continue;   // 25.10: в темноте чужие полоски не светятся поверх неё
      const age = (now - (st.at || now)) / 60000, l2 = Math.max(0, left - rate * Math.max(0, age)), p = Math.max(0, Math.min(1, 1 - l2 / w)), eta = rate > 0 ? (l2 / rate) * 60 : 0;
      const c = W.cellXY(i), cell = S.F.cells[i], sc = 1.0 + Math.max(0, (cell.lv || S.F.n) - S.F.n) * 0.1;
      // над своим камнем — сколько ещё копать (обновляется раз в 20 с, без кадров)
      h += `<div class="mn-bar${i === S.myI ? ' me' : ''}" style="left:${c.x - 44}px;top:${c.y - 70 * sc}px"><s class="mn-hpt"><i style="width:${((1 - p) * 100).toFixed(1)}%;background-color:${hpCol(1 - p)}" data-eta="${eta.toFixed(1)}" data-rem="${(1 - p).toFixed(4)}"></i></s>${n > 4 ? `<b>+${n - 4}</b>` : ''}</div>`;
    }
    // 25.10 (mine2): камни, которые копают, - копией поверх сцены: трещины растут с прогрессом, камень вздрагивает от ударов (CSS)
    const A = S.Wd && S.Wd.rk && !S.dark ? window.LGMineArt : null; S.digL = [];
    if (A) {
      for (const [k, b] of Object.entries(st.bl || {})) { const i = +k, [left, w, rate, n] = b; if (!w || !S.Wd.rk[i] || !inV(i)) continue; const l2 = Math.max(0, left - rate * Math.max(0, (now - (st.at || now)) / 60000)), cell = S.F.cells[i], c = W.cellXY(i); S.digL.push({ i, x: c.x, y: c.y, s: 1.0 + Math.max(0, (cell.lv || S.F.n) - S.F.n) * 0.1 + (cell.t === 'hard' ? 0.05 : 0), p: 1 - l2 / w, n: n || ((st.dg || {})[i] || []).length, w, l: left, rate }); }
      h = A.digging(S.Wd.rk, S.digL) + h;
    }
    S.world.querySelectorAll('[data-i].dg').forEach((g) => g.classList.remove('dg'));
    for (const b of S.digL) { const g = S.world.querySelector(`[data-i="${b.i}"]`); if (g) g.classList.add('dg'); }
    S.bars.innerHTML = h;
    nowDraw();
    requestAnimationFrame(() => { if (!S) return; S.bars.querySelectorAll('i[data-eta]').forEach((el) => hpGo(el, +el.dataset.rem, +el.dataset.eta)); });
  }

  /* ---------- герои: копающие у камней, гуляющие (присутствие), свой ---------- */
  // 25.10: облик — тот же, что в «Городе» (city.js walkerSvg): гардероб, снаряжение, призрак; раньше в шахту шёл облик «по нику»
  // (свой — вложенным не туда объектом, чужие — без снаряжения и призрака). Каска шахтёра — на голове (minerHat)
  const heroOf = (v) => ({ look: (v && v.lk) || null, gear: (v && v.g) || {}, ghost: !!(v && v.gh), minerHat: !!(v && v.g && v.g.h === 'miner') });
  const lookKey = (v) => { try { return JSON.stringify([v && v.lk, v && v.g, v && v.gh, v && v.pk]); } catch (e) { return ''; } };
  const hashL = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function heroEl(login, v, cls) {
    const d = document.createElement('div'); d.className = 'mn-h ' + (cls || ''); d.dataset.l = login;
    const dig = cls && cls.includes('dig') && login !== X.login(), mine = login === X.login();
    // 25.10: облик - тем же путём, что в «Городе» (app.js figSvg: облик, снаряжение, призрак); в шахте - ещё каска шахтёра
    // 26.10 (mine2): копатель - стойка с киркой в лапе (mine-art.js digFig); свой - оба облика (CSS: копает / ходит)
    const DA = art2On() && window.LGMineArt && window.LGMineArt.digFig ? window.LGMineArt : null, df = DA && (dig || mine) ? DA.digFig(login, v, { minerHat: heroOf(v).minerHat, ...(v && v.pk != null ? { pick: v.pk } : {}) }) : '';   // 26.10: кирка в лапах - по ступени (pk)
    const fig = df && dig ? '' : X.fig ? X.fig(login, v, { minerHat: heroOf(v).minerHat }) : still(X.doodle(login, heroOf(v), 'walk', 'peace'));
    d.innerHTML = `<div class="mn-fig${df ? ' has-d' : ''}">${fig}${df}</div>${dig || mine ? '' : `<span class="mn-nm2">${esc(login)}</span>`}`;
    d.dataset.lk = lookKey(v);
    const hs = hashL(login);   // 25.10: 300 котов не бьют в такт — свой темп и сдвиг удара
    d.style.setProperty('--dd', (1.05 + (hs % 41) / 100).toFixed(2) + 's'); d.style.setProperty('--dl', (-((hs >>> 6) % 140) / 100).toFixed(2) + 's');
    d.style.setProperty('--nmy', String(hashL(login) % 3));   // 25.10: ники соседей — на разной высоте (стояли друг на друге)
    if (dig && login[0] !== '~') d.title = login;   // 29.10 (антибот): «~…» - копающий без открытого сайта, ника сервер не даёт
    return d;
  }
  // z = линия ног (пока идёт - zSteps)
  function place(d, x, y) { d._x = x; d._y = y; d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; if (!(d._zTo > Date.now())) d.style.zIndex = String(Math.round(y)); }
  // 25.10: стоит внутри камня (этаж сменился, а шаг ещё не пришёл) — рисуем на площадке у входа, а не в камне
  // 25.10 (mine/walk): на площадке входа - не внутри предметов (stop: где стоит; false - откуда идёт, может быть за предметом)
  const walkPt = (p, stop = true) => MW().walkPt(S.dug, p, stop, ft());
  function heroes() {
    const st = S.st, me = X.login(), have = new Map(); for (const d of S.heroes.children) if (d.dataset.k) have.set(d.dataset.k, d);
    const want = new Set();
    const put = (k, login, v, cls, x, y) => { want.add(k); let d = have.get(k); if (d && d.dataset.lk !== lookKey(v)) { d.remove(); d = null; } if (!d) { d = heroEl(login, v, cls); d.dataset.k = k; S.heroes.appendChild(d); } d.className = 'mn-h ' + cls; place(d, x, y); return d; };
    const vOf = (l) => { const o = S.others.get(l); return (o && o.v) || S.looks.get(l) || null; };
    // 25.10: «Игроки: скрыты» — только свой; в темноте (нет каски) других не видно — они не светятся поверх темноты
    const showOthers = !S.hide && !S.dark;
    // копающие (из вида шахты): у камня, по сторонам места, откуда копают
    if (showOthers) for (const [k, ls] of Object.entries(st.dg || {})) {
      const i = +k, sp = digSpot(i); if (sp == null) continue;
      const c = centerOf(sp), r = GX().cellXY(i), dx = r.x - c.x;
      const OFF = [[-24, 0], [24, 4], [-8, 22], [14, -16]];
      const up = Math.abs(dx) < 20 && r.y < c.y;   // 25.10: камень над головой - бьют вверх (mine.css .dig.up)
      ls.forEach((l, j) => { if (l === me) return; const [ox, oy] = OFF[j % 4]; put('d:' + l, l, vOf(l), 'dig' + (dx < 0 ? ' fl' : '') + (up ? ' up' : ''), c.x + ox + (dx ? Math.sign(dx) * 18 : 0), c.y + oy - 10); });
    }
    // гуляющие (присутствие), кроме тех, кто копает; лицом туда, куда идут (раньше бегали хвостом вперёд)
    const digging = new Set(Object.values(st.dg || {}).flat());
    // 25.10 (нагрузка): шаги гуляющих ведёт браузер (Web Animations, transform) по пути через расчищенные клетки — без JS на каждом кадре
    if (showOthers) for (const [l, o] of S.others) { if (digging.has(l) || l === me) continue; const p = walkPt({ x: o.tx, y: o.ty }); const d = put('w:' + l, l, o.v, 'walk' + (o.tx < o.x - 2 ? ' fl' : ''), p.x, p.y); if (d.dataset.mv !== String(o.t0)) { d.dataset.mv = String(o.t0); walkAnim(d, o); } }
    // свой
    if (S.pos) {
      // 25.10 (баг «кирка машет после клика в сторону»): копает - только стоя у своего камня (как сервер: MINE_REACH) и не на ходу
      const digI = S.myI >= 0 && !S.path && atRock(S.myI) ? S.myI : -1, nx = S.path && S.path.length ? S.path[0].x : null;
      const d = put('me', me, myView(), 'me' + (digI >= 0 ? ' dig' : ''), S.pos.x, S.pos.y);
      if (digI >= 0) { const r = GX().cellXY(digI); d.classList.toggle('fl', r.x < S.pos.x - 4); d.classList.toggle('up', Math.abs(r.x - S.pos.x) < 30 && r.y < S.pos.y); } else if (nx != null) d.classList.toggle('fl', nx < S.pos.x - 2);
      // «Ты» — поверх всех ников (свой элемент над героями)
      let nm = S.heroes.querySelector('.mn-menm'); if (!nm) { nm = document.createElement('span'); nm.className = 'mn-menm'; nm.textContent = 'Ты'; S.heroes.appendChild(nm); }
      nm.style.transform = `translate(${S.pos.x.toFixed(1)}px, ${(S.pos.y - 112).toFixed(1)}px) translateX(-50%)`;
    }
    for (const [k, d] of have) if (!want.has(k)) d.remove();
    cullHeroes();
    if (art2On() && window.LGMineArt && window.LGMineArt.digSync) window.LGMineArt.digSync(S.heroes, S.bars);   // 26.10: сноп у камня, камень в такт
    mmap();   // 29.10: «ты» на мини-карте большого этажа
  }
  /* 30.10 (стример: «на 10 этаже лаги, когда двигают экран»): удар киркой у копающих - 4 CSS-анимации на каждого (тело, рука, искры,
     крошка). Двигает их видеокарта (mine-art.js digFig), но пока идут кадры страницы (камеру тащат), браузер на каждом кадре заново
     считает стиль каждой идущей анимации - и у копающих далеко за краем экрана тоже. Копающий вне кадра (с запасом CULL px мира) -
     display: none (класс mn-off): ни анимаций, ни стиля; вернулся в кадр - снова рисуется (анимация - с начала, камень - в такт по digSync).
     Проверка - по камере (camMoved, раз за кадр, только смена класса) и после героев. Гуляющих не трогаем: у них анимаций внутри нет */
  const CULL = 320;
  function cullHeroes() {
    if (!S || !S.heroes || !S.z) return 0;
    const v = vSize(), x0 = -S.tx / S.z - CULL, y0 = -S.ty / S.z - CULL, x1 = x0 + v.w / S.z + 2 * CULL, y1 = y0 + v.h / S.z + 2 * CULL;
    let shown = 0;
    for (const d of S.heroes.children) {
      if (d._x == null || !d.classList.contains('dig') || d.dataset.k === 'me') continue;
      const off = d._x < x0 || d._x > x1 || d._y < y0 || d._y > y1;
      if (off !== d.classList.contains('mn-off')) { d.classList.toggle('mn-off', off); if (!off) shown++; }
    }
    return shown;
  }
  // размер вида - из кэша (ResizeObserver сбрасывает): чтение clientWidth на каждый сдвиг камеры заставляло браузер пересчитывать стили
  // посреди кадра (с анимациями копающих - дорого); fresh - прочитать заново (fit, смена раскладки чата)
  function vSize(fresh) {
    if (fresh || !S.vsz) S.vsz = { w: S.view.clientWidth, h: S.view.clientHeight };
    if (!S.viewRo && window.ResizeObserver) { S.viewRo = new ResizeObserver(() => { if (S) S.vsz = null; }); S.viewRo.observe(S.view); }
    return S.vsz;
  }
  // стоит у камня i: не дальше REACH (200 px мира) от его центра (библиотека мира - та же у сервера: site.ts MINE_REACH) и камень ещё не выкопан
  function atRock(i) { if (!S.pos || i < 0 || S.dug[i]) return false; const c = GX().cellXY(i); return Math.hypot(S.pos.x - c.cx, S.pos.y - c.cy) <= MW().REACH; }
  // свой облик — как в «Городе» (city.js mineView): гардероб, снаряжение, призрак; каска — если надета
  const myView = () => { try { const h = X.hero(); if (!h) return null; const cur = h.wardrobe && h.wardrobe.cur && Object.keys(h.wardrobe.cur).length ? h.wardrobe.cur : h.look; return { lk: cur || null, g: { ...(h.gear || {}), ...(lampOn() ? { h: 'miner' } : {}) }, gh: h.ghost ? 1 : 0, ...(pickOn() && S.me && S.me.pkx ? { pk: S.me.pkx.lv } : {}) }; } catch (e) { return null; } };
  function walkAnim(d, o) {
    if (d._a) { try { d._a.cancel(); } catch (e) {} d._a = null; }
    const el = Date.now() - o.t0 + (o.dt || 0); if (!(el < o.dur) || !d.animate) return;
    const from = walkPt({ x: o.x, y: o.y }, false), to = walkPt({ x: o.tx, y: o.ty }), a = cellOfPt(from.x, from.y), b = cellOfPt(to.x, to.y);
    let pts = [from]; const pth = a >= 0 && b >= 0 && a !== b ? pathTo(a, b) : null;   // по клеткам — не сквозь камни и стены
    if (pth) for (const i of pth.slice(1, -1)) pts.push(centerOf(i));
    pts.push(to); pts = way(pts);   // 25.10 (mine/walk): у входа - в обход предметов
    const L = [0]; for (let k = 1; k < pts.length; k++) L.push(L[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    const tot = L[L.length - 1]; if (!tot) return;
    const dur = Math.max(o.dur, tot / SPEED * 1000);
    try { d._a = d.animate(pts.map((q, k) => ({ transform: `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`, offset: L[k] / tot })), { duration: dur, easing: 'linear' }); d._a.currentTime = Math.min(el, dur - 1); } catch (e) { d._a = null; }
    zSteps(d, pts, L, tot, dur, el);
  }
  // 25.10 (mine/walk): глубина гуляющего - z по линии ног; меняется только когда он переходит линию основания предмета (зашёл за него /
  // вышел перед ним) - таймер на переход, не кадр и не сортировка 300 котов
  function zSteps(d, pts, L, tot, dur, el) {
    for (const t of d._zt || []) clearTimeout(t); d._zt = [];
    const ev = [];
    for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k]; if (a.y === b.y) continue; for (const f of ft()) { const u = (f.z - a.y) / (b.y - a.y); if (u > 0 && u < 1) ev.push([(L[k - 1] + u * (L[k] - L[k - 1])) / tot * dur, b.y > a.y ? f.z + 1 : f.z - 1]); } }
    ev.sort((p, q) => p[0] - q[0]); ev.push([dur, Math.round(pts[pts.length - 1].y)]);
    let z = Math.round(pts[0].y);
    for (const [t, zz] of ev) { if (t <= el) z = zz; else d._zt.push(setTimeout(() => { d.style.zIndex = String(zz); }, t - el)); }
    d._zTo = Date.now() + Math.max(0, dur - el); d.style.zIndex = String(z);
  }
  function posOf(o) { const t = Math.min(1, (Date.now() - o.t0 + (o.dt || 0)) / Math.max(1, o.dur)); return { x: o.x + (o.tx - o.x) * t, y: o.y + (o.ty - o.y) * t }; }
  function presence(d, snap) {
    if (!d) return;
    if (snap) S.others.clear();
    for (const a of d.a || []) S.others.set(a.l, { v: { lk: a.lk, g: a.g, gh: a.gh }, lk: a.lk, x: a.x, y: a.y, tx: a.tx, ty: a.ty, t0: Date.now(), dt: a.dt || 0, dur: Math.hypot(a.tx - a.x, a.ty - a.y) / SPEED * 1000 });
    for (const [l, x, y, tx, ty, dt] of d.m || []) { const o = S.others.get(l) || {}; S.others.set(l, { ...o, x, y, tx, ty, t0: Date.now(), dt: dt || 0, dur: Math.hypot(tx - x, ty - y) / SPEED * 1000 }); }
    for (const l of d.g || []) S.others.delete(l);
    if (d.n != null && S.nOthers !== d.n) { S.nOthers = d.n; try { cnt(); } catch (e) { console.error('[шахта] счётчик', e); } }
    if (S.st) { try { heroes(); } catch (e) { recover(e, heroes); } anim(); }
  }

  /* ---------- ходьба: свой герой по пути (кадры — только пока кто-то идёт) ---------- */
  // pt - 25.10 (mine/walk): точка на площадке входа (клик по полу, «к скупщику», «к доске»), уже свободная (freePt)
  function walkTo(cell, then, pt) {
    const from = cellOfPt(S.pos.x, S.pos.y), p = pathTo(from, cell);
    if (!p) { tip('Туда не пройти — сначала расчисти путь'); return false; }
    const pts = [S.pos, ...p.slice(1).map(centerOf)]; if (pt) pts.push(pt);
    S.path = pts.length > 1 ? way(pts).slice(1) : []; S.then = then || null;
    const last = S.path.length ? S.path[S.path.length - 1] : S.pos;
    npcGo(last);
    try { X.api('/api/mine/go' + q(), { x: last.x, y: last.y, fx: S.pos.x, fy: S.pos.y }); } catch (e) {}
    if (!S.path.length) { S.path = null; if (then) then(); return true; }
    heroes(); anim(); return true;
  }
  function anim() { if (!S || S.raf || document.hidden) return; S.last = 0; S.raf = requestAnimationFrame(step); }
  function step(t) {
    if (!S) return; S.raf = 0;
    const dt = S.last ? Math.min(0.1, (t - S.last) / 1000) : 0; S.last = t;
    let moving = false;
    if (S.path && S.path.length) {
      moving = true; let left = SPEED * dt;
      while (left > 0 && S.path.length) { const p = S.path[0], dx = p.x - S.pos.x, dy = p.y - S.pos.y, L = Math.hypot(dx, dy); if (L <= left) { S.pos = { x: p.x, y: p.y }; S.path.shift(); left -= L; } else { S.pos = { x: S.pos.x + dx / L * left, y: S.pos.y + dy / L * left }; left = 0; } }
      if (!S.path.length) { S.path = null; const f = S.then; S.then = null; if (f) f(); heroes(); }
      else { const d = S.heroes.querySelector('[data-k="me"]'); if (d) place(d, S.pos.x, S.pos.y); }
      if (S) npcFar();
    }
    if (S.pos) { const nm = S.heroes.querySelector('.mn-menm'); if (nm) nm.style.transform = `translate(${S.pos.x.toFixed(1)}px, ${(S.pos.y - 112).toFixed(1)}px) translateX(-50%)`; }
    if (moving) S.raf = requestAnimationFrame(step);
  }

  /* ---------- клики: камень, пол, скупщик ---------- */
  function worldPt(e) { const r = S.view.getBoundingClientRect(); return { x: (e.clientX - r.left - S.tx) / S.z, y: (e.clientY - r.top - S.ty) / S.z }; }
  function click(e) {
    if (!S.st || !S.pos) return;
    if (e.target.closest && e.target.closest('.mn-nowl [data-mn-stop]')) { stopDig(); return; }
    // 30.10: облачко поручений, журнала, лифта, буровой - закрывается нажатием мимо (окна Скупщика и Снабженца - когда герой отошёл, npcFar)
    if (S.npcOpen && !NPC_AT[S.npcOpen]) winClose();
    const t = e.target.closest && e.target.closest('[data-i],[data-npc],[data-obj],[data-drill]');
    if (t && t.dataset.npc) { goNpc(t.dataset.npc); return; }
    // 29.10 (шаг 4): буровая - окно
    if (t && t.dataset.drill) { S.drillK = t.dataset.drill; if (V3()) liftMenu(true, 'drill'); else openPanel('drill'); return; }
    if (t && t.dataset.obj && useObj(t.dataset.obj)) return;   // 25.10: подъёмник, лавка, доска, столб Фонарщика — нажимаются (раньше только ходили к ним)
    if (S.dark && GX().cellAt(worldPt(e).x, worldPt(e).y) >= 0) { tip('Темно — без каски с фонарём не видно, куда бить. Фонарщик — у входа'); return; }
    const p = worldPt(e);
    // 30.10 (стример): найденная шахта лифта на верхнем этаже - не путь вниз: облачко «спускайся лифтом» и «К лифту»
    if (V3() && S.st.n < (S.st.deep || S.st.n)) { const sc = GX().cellAt(p.x, p.y); if (sc >= 0 && sc === S.F.shaft) { liftMenu(true, 'shaft'); return; } }
    let i = t && t.dataset.i != null ? +t.dataset.i : GX().cellAt(p.x, p.y);
    if (i >= 0 && !S.dug[i]) return clickRock(i, e.shiftKey || e.long, p, e.tr);
    const c = cellOfPt(p.x, p.y); if (c >= 0 && walkable(c)) { const at = inZone(c) ? freePt(p) : null; S.sel = -1; leaveRock(c, at); walkTo(c, null, at); }   // 25.10 (mine/walk): у входа - куда нажал (не в предмет)
  }
  // 25.10: ушёл от своего камня — герой перестаёт копать (раньше копал «на расстоянии»); сервер тоже снимает по шагу (mine/go)
  function leaveRock(c, at) {
    if (S.myI < 0) return;
    const sp = digSpot(S.myI), rc = GX().cellXY(S.myI); if (c === sp && !(at && Math.hypot(at.x - rc.cx, at.y - rc.cy) > MW().REACH)) return;   // at: точка у входа - далеко от камня (MINE_REACH) - тоже ушёл
    S.left = { i: S.myI, at: Date.now() }; S.want = { i: -1, at: Date.now() }; S.myI = -1; S.qq = [];
    X.api('/api/mineStop', { c: C, sid: S.sid }); heroes(); panel(); tip('Герой отошёл от камня и отложил кирку');
  }
  // 25.10 (новинка, тестерам): очередь — Shift+клик (на телефоне — долгое нажатие) по камню: следующий после текущего, до 2
  // 26.10 («Боты в шахте», только данные для стримера): к «Копать» - точка клика. 29.10: метку страницы (k) и «скрыта ли вкладка» (vh)
  // не шлём - сервер им не верит (docs/reports/mine-antibot.md)
  // 29.10: и телеметрия tl - только добавка к оценке у стримера (подделать её можно, поэтому оценка по ней только растёт; наказаний нет).
  // tr - клик по камню был настоящий (isTrusted); false - программный
  const bwOf = (pt, tr) => ({ ...(pt ? { pt: [Math.round(pt.x), Math.round(pt.y)] } : {}), tl: tele(tr === false) });
  /* ---------- 29.10 (решение стримера): телеметрия «Боты в шахте». Без нагрузки: счётчик нажатий (пассивный слушатель), на каждое
     «Копать» - один rAF и один таймер (видна ли вкладка на деле), свойства вкладки - несколько чтений дескрипторов ---------- */
  const TL = { ti: 0, rv: 0, on: false };
  const tlIn = (e) => { if (e.isTrusted) TL.ti++; };
  function tlOn() { if (TL.on) return; TL.on = true; TL.ti = 0; TL.rv = 0; document.addEventListener('pointerdown', tlIn, { capture: true, passive: true }); document.addEventListener('keydown', tlIn, { capture: true, passive: true }); }
  function tlOff() { if (!TL.on) return; TL.on = false; document.removeEventListener('pointerdown', tlIn, { capture: true }); document.removeEventListener('keydown', tlIn, { capture: true }); }
  const natv = (f) => { try { return typeof f === 'function' && /\{\s*\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(f)); } catch (e) { return true; } };   // не прочитать - не признак
  // подменены ли hidden / visibilityState / hasFocus (свойство на самом document или не родной getter)
  function tlHp() {
    try {
      for (const k of ['hidden', 'visibilityState']) { if (Object.getOwnPropertyDescriptor(document, k)) return 1; const d = Object.getOwnPropertyDescriptor(Document.prototype, k); if (!d || !natv(d.get)) return 1; }
      if (Object.prototype.hasOwnProperty.call(document, 'hasFocus') || !natv(Document.prototype.hasFocus)) return 1;
    } catch (e) { return 0; }   // старый браузер без дескрипторов - не признак
    return 0;
  }
  // вкладка говорит «видна», а кадр не нарисован за 1,5 с - на деле она в фоне (там rAF не идёт); итог - со следующим «Копать»
  function tlFrame() { if (document.visibilityState !== 'visible') return; let f = 0; const id = requestAnimationFrame(() => { f = 1; }); setTimeout(() => { if (!f) { TL.rv = 1; cancelAnimationFrame(id); } }, 1500); }
  // шахта спрятана (ghost: страница на вкладке «Город», шахта скрыта стилем) - сам по себе не признак, только вместе с другими
  const ghostM = () => { try { return !!S && (!S.el.isConnected || !S.el.getClientRects().length || getComputedStyle(S.el).visibility === 'hidden'); } catch (e) { return false; } };
  /* 30.10 (репорт #2168, авто-майнер): подменены ли функции страницы - биты: 1 - fetch, 2 - requestAnimationFrame (бывает и у
     расширений браузера), 4 - функции самой шахты (LGMine.open / onEvent, LGMineBiome.paint / off - их меняет только чужой скрипт,
     чтобы читать состояние шахты и вид). Только добавка к оценке у стримера; несколько сравнений на «Копать», без нагрузки */
  function tlPi() {
    let b = 0;
    try {
      // своя обёртка сайта (src/gateway/static.ts, LG_FETCH) - не подмена, если под ней был родной fetch
      const F = window.LG_FETCH, fOwn = !!(F && window.fetch === F.w && F.n);
      if (typeof window.fetch === 'function' && !natv(window.fetch) && !fOwn) b |= 1;
      if (typeof window.requestAnimationFrame === 'function' && !natv(window.requestAnimationFrame)) b |= 2;
      const M = window.LGMine, B = window.LGMineBiome;
      if ((M && (M.open !== open || M.onEvent !== onEvent)) || (B && typeof B.own === 'function' && !B.own())) b |= 4;
    } catch (e) {
      // не прочитать - не признак
      return 0;
    }
    return b;
  }
  function tele(ut) { const pi = tlPi(), o = { ti: TL.ti, ...(ut ? { ut: 1 } : {}), ...(TL.rv ? { rv: 1 } : {}), ...(tlHp() ? { hp: 1 } : {}), ...(ghostM() ? { gm: 1 } : {}), ...(pi ? { pi } : {}) }; TL.ti = 0; TL.rv = 0; tlFrame(); return o; }
  async function queueRock(i, pt, tr) {
    if (S.myI < 0) return false;
    if (i === S.myI) return true;
    const cur = ((S.me && S.me.qq) || S.qq || []).filter((x) => x !== i);
    const qq = [...cur, i].slice(-2);
    const sp = centerOf(digSpot(S.myI) ?? cellOfPt(S.pos.x, S.pos.y));
    const r = await X.api('/api/mineDig', { i: S.myI, c: C, sid: S.sid, x: sp.x, y: sp.y, q: qq, ...bwOf(pt, tr) }); if (!S) return true;
    if (!r || !r.ok) { tip((r && r.error) || 'Не получилось'); return true; }
    S.qq = qq; if (S.me) S.me = { ...S.me, qq }; S.barKey = ''; bars();
    tip(`В очереди камней: ${qq.length} — герой возьмёт их сам, когда докопает этот`);
    return true;
  }
  function clickRock(i, toQueue, pt, tr) {
    const cell = S.F.cells[i];
    if (S.dark) return tip('Темно — без каски с фонарём не видно, куда бить. Фонарщик — у входа');
    if (cell.t === 'wall') return tip(tx().wall);
    if (!(S.st.front || []).includes(i)) return tip(tx().far);
    if (S.me && S.me.cap > 0 && S.me.day >= S.me.cap) return tip(`На сегодня хватит: ${mmss(S.me.cap)} работы. Новые сутки - в 05:00`);   // 25.10: лимит суток - только если включён (cap > 0)
    if (toQueue && S.me && S.me.fx && S.me.fx.q && S.myI >= 0) { queueRock(i, pt, tr); return; }
    const sp = digSpot(i); if (sp == null) return tip('Не подойти');
    // 25.10: выбранный камень — сразу «мой» (до ответа комнаты), запоздавший вид его не сбросит
    S.want = { i, at: Date.now() }; S.qq = []; S.left = null;
    walkTo(sp, async () => {
      if (!S || !S.want || S.want.i !== i) return;   // пока шёл, выбрал другое
      const at = centerOf(sp);
      const r = await X.api('/api/mineDig', { i, c: C, sid: S.sid, x: at.x, y: at.y, ...(V3() && S.st ? { n: S.st.n } : {}), ...bwOf(pt, tr) });   // 29.10: n - этаж, который видит игрок
      if (!S) return;
      if (!r || !r.ok) { if (S.want && S.want.i === i) S.want = null; if (r && r.other) otherTab(true); tip((r && r.error) || 'Не получилось'); S.myI = -1; heroes(); panel(); return; }
      // 30.10: пока шёл ответ, нажали «Стоп» над камнем (он виден сразу) - не «копаю», а снова стоп
      if (S.want && S.want.i < 0) { X.api('/api/mineStop', { c: C, sid: S.sid }); return; }
      S.want = { i, at: Date.now() }; S.myI = i; S.barKey = ''; bars(); heroes(); panel();
      tip(`${tx().doing}: ${blockTitle(cell)} — герой будет работать, пока не закончит (даже если закроешь сайт)`);
    });
  }
  /* ---------- 29.10 (Шахта 3.0, шаг 3): лифт - этажи (любой открытый), сбор на следующий этаж, таймер ----------
     Этаж выше самого глубокого - своя шахта сайта «id.этаж» (свой вид и свои гуляющие); самый глубокий - «id». Поехать: комнате mineRide
     (герой встаёт с камня на другом этаже), потом шахта открывается заново на выбранном этаже. Игра говорит, что герой на другом этаже
     (me.at: копал, когда открылся новый этаж) - едем туда сами (раз в минуту, не сразу после своей поездки). */
  const keyOf = (f, deep) => (f >= deep ? CB() : `${CB()}.${f}`);
  function follow3(st) {
    if (!(st.fl && st.fl.v3) || !S.me || !(S.me.at >= 1) || S.me.at === st.n) return false;
    if (S.rideAt && Date.now() - S.rideAt < 60000) return false;
    const k = keyOf(S.me.at, st.deep || st.n); if (k === C) return false;
    S.rideAt = Date.now(); const x = X; setTimeout(() => { if (S && x === X) open(x, k); }, 0); return true;
  }
  async function ride(f) {
    const st = S.st, deep = (st && (st.deep || st.n)) || 1; f = Math.max(1, Math.min(deep, Math.floor(+f) || 1));
    if (S.busyOp) return; S.busyOp = 1;
    const r = await X.api('/api/mineRide', { c: CB(), n: f }); if (!S) return; S.busyOp = 0;
    if (!r || !r.ok) { tip((r && r.error) || 'Лифт не поехал'); return; }
    S.rideAt = Date.now(); tip(`Лифт едет на этаж ${f}…`);
    const x = X, k = keyOf(f, deep); setTimeout(() => { if (S && x === X) open(x, k); }, f >= deep ? 300 : 2500);   // этажу выше вид приходит со следующей выгрузкой
  }
  async function liftFund(coins, lines) {
    if (S.busyOp) return; S.busyOp = 1;
    const r = await X.api('/api/mineLift', { c: CB(), coins, ...(lines ? { lines } : {}) }); if (!S) return; S.busyOp = 0;
    if (!r || !r.ok) { tip((r && r.error) || 'Вклад не принят'); return; }
    const gave = oreGave(lines);
    tip(gave ? `Вклад принят - из сумки ушло: ${gave}. Полоса сбора обновится через пару секунд` : 'Вклад принят - спасибо! Полоса сбора обновится через пару секунд');
  }
  const hm = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`; };
  function liftHtml(st) {
    const L = st.lift || { st: 'dig' }, deep = st.deep || st.n, money = (n) => (X.money ? X.money(n) : String(n));
    const fl = []; for (let f = deep; f >= 1; f--) fl.push(`<button type="button" class="btn ${f === st.n ? 'primary' : 'ghost'} sm" data-mn-ride="${f}"${f === st.n ? ' aria-current="true" disabled' : ''}>${f}</button>`);
    let stage = '';
    if (L.st === 'dig') stage = `<p>Этаж ${deep + 1}: сначала докопайтесь до <b>шахты лифта</b> на этаже ${deep} - она далеко от лифта, под туманом. Потом - сбор ${money(L.need || 0)} и таймер ${hm(L.ms || 0)}.</p>`;
    else if (L.st === 'fund') {
      const p = L.need ? Math.min(100, L.c / L.need * 100) : 0, left = Math.max(0, (L.need || 0) - (L.c || 0));
      const ore = oreRows(st, 'data-mn-lore');
      stage = `<p>Шахта лифта найдена! Скидываемся на этаж ${deep + 1} - монетами и рудой (руда - по цене скупщика, уходит в казну Ратуши).</p>
        <div class="mn-lbar" role="progressbar" aria-valuemin="0" aria-valuemax="${L.need}" aria-valuenow="${L.c}"><i style="width:${p.toFixed(1)}%"></i><span>${money(L.c || 0)} из ${money(L.need || 0)}</span></div>
        <div class="mn-btns">${[100, 500, 1000].filter((v) => v < left).map((v) => `<button type="button" class="btn ghost sm" data-mn-lfund="${v}">${money(v)}</button>`).join('')}${left > 0 ? `<button type="button" class="btn primary sm" data-mn-lfund="${left}">Весь остаток ${money(left)}</button>` : ''}</div>
        ${ore ? `<h4>Руда из сумки</h4>${ORE_NOTE}<ul class="mn-lore">${ore}</ul>` : ''}`;
    } else stage = `<p>Собрали! Лифт улучшается: этаж ${deep + 1} откроется через <b>${hm(L.left != null ? L.left - (Date.now() - (S.stAt || Date.now())) : (L.at || 0) - Date.now())}</b>. Копать можно.</p>`;
    const by = (L.by || []).length ? `<h4>Скинулись</h4><ol class="mn-lby">${L.by.map(([l, v]) => `<li><span>${esc(l)}</span><b>${money(v)}</b></li>`).join('')}</ol>` : '';
    return `<div class="mn-npc-p mn-lift"><h3 class="h3">Лифт</h3><p class="muted">Ты на этаже ${st.n}. Открыто этажей: ${deep}.</p><div class="mn-lfl" role="group" aria-label="Этажи">${fl.join('')}</div>${stage}${by}
      <div class="mn-btns"><button type="button" class="btn ghost" data-mn-lcity>В город</button><button type="button" class="btn ghost" data-mn-back>Назад</button></div></div>`;
  }
  /* ---------- 29.10 (шаг 4): окно буровой - стадия, уровень, добыча, сбор на следующий уровень ---------- */
  async function drillFund(k, coins, lines) {
    if (S.busyOp) return; S.busyOp = 1;
    const r = await X.api('/api/mineDrill', { c: CB(), k, coins, ...(lines ? { lines } : {}) }); if (!S) return; S.busyOp = 0;
    if (!r || !r.ok) { tip((r && r.error) || 'Вклад не принят'); return; }
    const gave = oreGave(lines);
    tip(gave ? `Вклад в буровую принят - из сумки ушло: ${gave}` : 'Вклад в буровую принят - спасибо!');
  }
  /* 30.10 (репорт #2177: «нажал сдать одно - пропали железо и уголь»): «Отдать» руду в сбор (лифт, буровая) - в два нажатия.
     Первое - только спрашивает «Точно отдать: Железо 1,5 шт.?» у этой кучки (S.oreAsk - uid кучки), второе (не раньше чем через
     ORE_ASK_MIN, не позже ORE_ASK_MS) - отдаёт. Раньше кучка уходила целиком с первого нажатия, а после вклада список сдвигался
     вверх: повторное нажатие на то же место отдавало СЛЕДУЮЩИЙ вид руды. Подтверждение привязано к кучке (uid), не к месту кнопки:
     сдвинулся список - под курсором другая кучка, нажатие на неё снова только спрашивает. */
  const ORE_ASK_MS = 8000, ORE_ASK_MIN = 350;
  const ORE_NOTE = '<p class="muted mn-onote">Руда уходит из твоей сумки в казну Ратуши - отдаётся вся кучка. Нажми «Отдать», потом подтверди.</p>';
  const oreAsked = (uid) => !!(S.oreAsk && S.oreAsk.uid === uid && Date.now() - S.oreAsk.at < ORE_ASK_MS);
  /** Вклад принят: кучки lines уже не в сумке (снимок героя догонит через 10-20 с - до тех пор не показываем их) → «Железо 1,5 шт.» */
  function oreGave(lines) {
    if (!lines || !lines.length) return '';
    const g = S.oreGone || (S.oreGone = new Map()), its = oreItems(), out = [];
    for (const [uid, q] of lines) { const it = its.find((x) => x.uid === uid); g.set(uid, Date.now()); if (it) out.push(`${it.name} ${oskQ(q)}`); }
    oreRedraw();
    return out.join(', ');
  }
  const oreGone = (uid) => { const t = S.oreGone && S.oreGone.get(uid); return !!(t && Date.now() - t < 60000); };
  function oreRows(st, oreAttr, max = 8) {
    const money = (n) => (X.money ? X.money(n) : String(n)), P = st.bp || {};
    return oreItems().filter((it) => +P[it.res] > 0 && !oreGone(it.uid)).slice(0, max).map((it) => { const ask = oreAsked(it.uid), v = money(Math.floor(it.q * P[it.res] / 100));
      return `<li><span>${esc(it.name)} <small>${esc(oskQ(it.q))}</small></span><button type="button" class="btn ${ask ? 'primary' : 'ghost'} sm" ${oreAttr}="${esc(it.uid)}" data-q="${it.q}"${ask ? ` aria-label="Точно отдать ${esc(it.name)} ${esc(oskQ(it.q))}?"` : ''}>${ask ? `Точно отдать ${esc(oskQ(it.q))}?` : `Отдать ≈${v}`}</button></li>`; }).join('');
  }
  // окно (лифт «Этажи», буровая «Подробнее») и облачко буровой над ней - перерисовать оба: подтверждение видно там, где нажали
  function oreRedraw() { S.bodyHtml = ''; panel(); drillMenuFill(); }
  /** Нажали «Отдать» у кучки uid: первое нажатие - спросить, второе - send(). */
  function oreAsk(uid, send) {
    const a = S.oreAsk, dt = a && a.uid === uid ? Date.now() - a.at : -1;
    if (dt >= ORE_ASK_MIN && dt < ORE_ASK_MS) { S.oreAsk = null; oreRedraw(); send(); return; }
    // двойной клик - это не подтверждение
    if (dt >= 0 && dt < ORE_ASK_MIN) return;
    S.oreAsk = { uid, at: Date.now() }; oreRedraw();
    const x = X; setTimeout(() => { if (S && x === X && S.oreAsk && S.oreAsk.uid === uid) { S.oreAsk = null; oreRedraw(); } }, ORE_ASK_MS + 50);
  }
  function fundBlock(c, need, attr, oreAttr, st, maxOre = 8) {
    const money = (n) => (X.money ? X.money(n) : String(n)), p = need ? Math.min(100, c / need * 100) : 0, left = Math.max(0, need - c);
    const ore = oreRows(st, oreAttr, maxOre);
    return `<div class="mn-lbar" role="progressbar" aria-valuemin="0" aria-valuemax="${need}" aria-valuenow="${c}"><i style="width:${p.toFixed(1)}%"></i><span>${money(c)} из ${money(need)}</span></div>
      <div class="mn-btns">${[100, 500, 1000].filter((v) => v < left).map((v) => `<button type="button" class="btn ghost sm" ${attr}="${v}">${money(v)}</button>`).join('')}${left > 0 ? `<button type="button" class="btn primary sm" ${attr}="${left}">Весь остаток ${money(left)}</button>` : ''}</div>
      ${ore ? `<h4>Руда из сумки</h4>${ORE_NOTE}<ul class="mn-lore">${ore}</ul>` : ''}`;
  }
  function drillHtml(st) {
    const d = (st.drills || []).find((x) => x[0] === S.drillK);
    if (!d) return `<div class="mn-npc-p"><h3 class="h3">Буровая</h3><p>Буровой здесь нет.</p><div class="mn-btns"><button type="button" class="btn ghost" data-mn-back>Назад</button></div></div>`;
    const [k, , , stg, lv, c, need, left, out, cap, rate, res, by] = d, money = (n) => (X.money ? X.money(n) : String(n)), nm = esc(resName(res));
    const head = stg === 'site' ? `<p>Жила «${nm}» почти выкопана - здесь можно поставить буровую. Она сама добывает руду жилы: 70% - в казну Ратуши, 30% - тем, кто копал в шахте за последний час. Строителям - бонус рудой.</p>`
      : stg === 'build' ? `<p>Стройка ур. ${lv + 1}: готово через <b>${hm(left - (Date.now() - (S.stAt || Date.now())))}</b>.${lv ? ` Пока строится - добывает как ур. ${lv}.` : ''}</p>`
      : stg === 'dry' ? `<p>Жила иссякла - буровая добыла всё, что могла (${val(out)} шт.).</p>`
      : `<p>Буровая ур. ${lv}: ${val(rate)} шт./ч руды «${nm}». Добыто ${val(out)} из ${val(cap)} шт.</p>`;
    const prog = lv && stg !== 'dry' ? `<div class="mn-lbar mn-dbar"><i style="width:${cap ? Math.min(100, out / cap * 100).toFixed(1) : 0}%"></i><span>добыто ${val(out)} из ${val(cap)} шт.</span></div>` : '';
    const fund = (stg === 'site' || stg === 'work') && lv < 3 ? `<h4>${lv ? `На ур. ${lv + 1}` : 'На постройку'}</h4>${fundBlock(c, need, 'data-mn-dfund', 'data-mn-dore', st)}` : '';
    const who = (by || []).length ? `<h4>Скинулись</h4><ol class="mn-lby">${by.map(([l, v]) => `<li><span>${esc(l)}</span><b>${money(v)}</b></li>`).join('')}</ol>` : '';
    return `<div class="mn-npc-p mn-lift"><h3 class="h3">Буровая · ${nm}</h3>${head}${prog}${fund}${who}<div class="mn-btns"><button type="button" class="btn ghost" data-mn-back>Назад</button></div></div>`;
  }
  function liftBind(el) {
    el.querySelectorAll('[data-mn-dfund]').forEach((b) => { b.onclick = () => drillFund(S.drillK, +b.dataset.mnDfund); });
    el.querySelectorAll('[data-mn-dore]').forEach((b) => { b.onclick = () => { const k = S.drillK, ln = [[b.dataset.mnDore, +b.dataset.q]]; oreAsk(b.dataset.mnDore, () => drillFund(k, 0, ln)); }; });
    el.querySelectorAll('[data-mn-ride]').forEach((b) => { b.onclick = () => ride(+b.dataset.mnRide); });
    el.querySelectorAll('[data-mn-lfund]').forEach((b) => { b.onclick = () => liftFund(+b.dataset.mnLfund); });
    el.querySelectorAll('[data-mn-lore]').forEach((b) => { b.onclick = () => { const ln = [[b.dataset.mnLore, +b.dataset.q]]; oreAsk(b.dataset.mnLore, () => liftFund(0, ln)); }; });
    const c = el.querySelector('[data-mn-lcity]'); if (c) c.onclick = exit;
  }
  function useObj(k) {
    if (k === 'lift') { if (V3()) { liftMenu(!S.lm); return true; } exit(); return true; }
    if (k === 'buyer') { goNpc('buy'); return true; }
    if (k === 'lamp' && S.Wd.lampNpc) { goNpc('lamp'); return true; }
    if (k === 'board') { goBoard(); return true; }
    if (k === 'up') { tip(upText()); return true; }   // 26.10: верхняя клеть - нажатие (и на телефоне) - та же подпись
    return false;
  }
  /* 30.10 (просьба стримера): лифт в большой шахте - крупные кнопки «В город» и «Этажи» облачком у самого лифта (над клетью, двигается с камерой,
     на телефоне прижато к краям экрана). «В город» - выход сразу; «Этажи» - прежнее окно лифта (этажи, сбор) в правой панели. Мимо / Esc - закрыть.
     Облачко - в слое вида (не в мире): размер кнопок не зависит от масштаба; место считается из камеры (S.tx, S.ty, S.z) по событиям, без кадров. */
  // к чему привязано облачко: лифт - клеть зала, буровая - её клетка (мир → x, верх и низ над / под ней)
  function bubbleAnchor() {
    if (S.lmK === 'shaft') { if (!S.m3 || !(S.F.shaft >= 0)) return null; const p = S.m3.G.cellXY(S.F.shaft); return { x: p.cx, up: p.cy - 90, dn: p.cy + 50 }; }
    if (S.lmK === 'drill') { const d = (S.st.drills || []).find((x) => x[0] === S.drillK); if (!d || !S.m3) return null; const p = S.m3.G.cellXY(d[2]); return { x: p.cx, up: p.y - (96 + Math.max(1, d[4]) * 26) - 18, dn: p.y + 34 }; }
    const L = S.Wd && S.Wd.props && S.Wd.props.find((q) => q.obj === 'lift'); return L ? { x: L.x, up: L.y - 160, dn: L.y + 14 } : null;
  }
  function liftPlace() {
    const m = S && S.lm; if (!m) return;
    const a = bubbleAnchor(); if (!a) { liftMenu(false); return; }
    const vw = S.view.clientWidth, vh = S.view.clientHeight - padB(), top0 = (S.topPad || 0) + 4, room = Math.max(120, vh - top0 - 4);
    // 30.10 (репорт #2177): облачко буровой с рудой («Отдать» с подтверждением) выше места над чатом - не уходит под чат, прокручивается
    m.style.maxHeight = ''; m.style.overflowY = ''; if (m.offsetHeight > room) { m.style.maxHeight = room + 'px'; m.style.overflowY = 'auto'; }
    const w = m.offsetWidth, h = m.offsetHeight;
    const ax = S.tx + a.x * S.z, up = S.ty + a.up * S.z - 14, dn = S.ty + a.dn * S.z;
    const above = up - h >= top0, y = Math.max(top0, Math.min(vh - h - 4, above ? up - h : dn)), x = Math.max(8, Math.min(vw - w - 8, ax - w / 2));
    m.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
    m.classList.toggle('dn', !above);
    m.style.setProperty('--tail', Math.max(18, Math.min(w - 18, ax - x)).toFixed(0) + 'px');
  }
  /* 30.10 (просьба стримера): буровая - тоже облачко над ней, а не окно справа: название и уровень, стадия (стройка - таймер, сбор - полоска и взносы,
     работает - добыча и куда идёт), «Скинулись» - три строки одной, остальное - «Подробнее» (прежнее окно справа). Обновляется с видом шахты, если текст изменился. */
  function drillMenuHtml() {
    const st = S.st, d = (st.drills || []).find((x) => x[0] === S.drillK); if (!d) return '';
    const [, , , stg, lv, c, need, left, out, cap, rate, res, by] = d, money = (n) => (X.money ? X.money(n) : String(n)), nm = esc(resName(res));
    const sub = stg === 'site' ? 'Площадка: жила почти выкопана. Буровая добывает 70% в казну, 30% - копавшим за час.'
      : stg === 'build' ? `Стройка ур. ${lv + 1}: готово через <b>${hm(left - (Date.now() - (S.stAt || Date.now())))}</b>.`
      : stg === 'dry' ? `Жила иссякла, добыто ${val(out)} шт.`
      : `${val(rate)} шт./ч. Добыто ${val(out)} из ${val(cap)}. 70% - в казну, 30% - копавшим.`;
    const fund = (stg === 'site' || stg === 'work') && lv < 3 ? `<div class="mn-lm-h">${lv ? `На ур. ${lv + 1}` : 'На постройку'}</div>${fundBlock(c, need, 'data-mn-dfund', 'data-mn-dore', st, 3)}` : '';
    const who = (by || []).length ? `<p class="mn-lm-by">Скинулись: ${by.slice(0, 3).map(([l, v]) => `<b>${esc(l)}</b> ${money(v)}`).join(', ')}${by.length > 3 ? ` и ещё ${by.length - 3}` : ''}</p>` : '';
    return `<div class="mn-lm-t">Буровая · ${nm}${lv ? ` · ур. ${lv}` : ''}</div><p class="mn-lm-s">${sub}</p>${fund}${who}<div class="mn-btns"><button type="button" class="btn ghost" data-mn-lm="more">Подробнее</button></div>`;
  }
  function drillMenuFill() {
    if (!S || !S.lm || S.lmK !== 'drill') return;
    const h = drillMenuHtml(); if (!h) { liftMenu(false); return; }
    if (h !== S.lmH) { S.lmH = h; S.lm.innerHTML = h; liftPlace(); }
  }
  function liftMenu(on, kind) {
    if (!S) return;
    if (S.lm) { S.lm.remove(); S.lm = null; S.lmK = null; S.lmH = ''; }
    if (!on || !V3()) return;
    const m = document.createElement('div'); m.className = 'mn-lm' + (kind === 'drill' ? ' mn-lmd' : ''); m.setAttribute('role', kind === 'drill' ? 'dialog' : 'menu');
    S.lmK = kind === 'drill' || kind === 'shaft' ? kind : 'lift'; S.lm = m;
    if (kind === 'shaft') { m.className = 'mn-lm mn-lmd'; m.setAttribute('role', 'dialog'); m.innerHTML = '<p class="mn-lm-s">Это шахта лифта - чтобы спуститься ниже, воспользуйся лифтом.</p><div class="mn-btns"><button type="button" class="btn primary" data-mn-lm="tolift">К лифту</button></div>'; }
    else if (kind === 'drill') { S.lmH = drillMenuHtml(); if (!S.lmH) { S.lm = null; S.lmK = null; return; } m.innerHTML = S.lmH; }
    else m.innerHTML = '<button type="button" class="btn primary" data-mn-lm="city" role="menuitem">В город</button><button type="button" class="btn ghost" data-mn-lm="floors" role="menuitem">Этажи</button>';
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    m.addEventListener('click', (e) => {
      const f = e.target.closest('[data-mn-dfund]'); if (f) { drillFund(S.drillK, +f.dataset.mnDfund); return; }
      const o = e.target.closest('[data-mn-dore]'); if (o) { const k = S.drillK, ln = [[o.dataset.mnDore, +o.dataset.q]]; oreAsk(o.dataset.mnDore, () => drillFund(k, 0, ln)); return; }
      const b = e.target.closest('[data-mn-lm]'); if (!b) return; const k = b.dataset.mnLm; liftMenu(false);
      if (k === 'tolift') { const [hx, hy] = GX().hall, at = freePt({ x: hx + 256, y: hy + 200 }); leaveRock(cellOfPt(at.x, at.y), at); walkTo(cellOfPt(at.x, at.y), null, at); return; }
      if (k === 'city') exit(); else if (k === 'floors') openPanel('lift'); else if (k === 'more') openPanel('drill');
    });
    S.view.appendChild(m); liftPlace();
    if (kind !== 'drill') { const first = m.querySelector('button'); if (first) first.focus({ preventScroll: true }); }
  }
  function openPanel(kind) { bagClose(); liftMenu(false); if (S.wgOpen) { S.wgOpen = false; S.wgH = ''; } const was = S.npcOpen; S.npcOpen = kind; npcArm(kind); if (was !== kind) S.bodyHtml = ''; panel(); const w = S.el.querySelector('.mn-win'); if (w) w.scrollTop = 0; }
  /* 26.10 (стример: «далеко отходишь от скупщика - окно автоматически закрывается»): окна у NPC - скупщик (buy) и Снабженец Кремень
     (lamp) - закрываются, когда свой герой ушёл от места перед NPC (FOOT at) дальше NPC_FAR: 2,5 клетки зала (320 px) - за пределы
     площадки NPC (скупщик и Снабженец - разные площадки, между ними ~380 px; доска поручений - на площадке скупщика). Проверка - на шаге
     своего героя (step, walkTo), без опросов и таймеров. Окно открыто издалека (герой идёт к NPC) - не закрываем, пока не дошёл или пока
     не пошёл в другую сторону (цель пути дальше порога). Прилавок скупщика при этом - снова в сумке, как «Забрать обратно» */
  const NPC_FAR = 2.5 * 128, NPC_AT = { buy: 'buyer', lamp: 'lamp' };
  function npcArm(kind) { const k = NPC_AT[kind]; S.npcAt = k ? { kind, at: frontOf(k), on: false } : null; }
  // цель нового пути - дальше порога: «уходит» (закроется, как только окажется дальше)
  function npcGo(to) { const a = S && S.npcAt; if (a && to && Math.hypot(to.x - a.at.x, to.y - a.at.y) > NPC_FAR) a.on = true; }
  function npcFar() {
    const a = S.npcAt; if (!a || !S.pos) return;
    if (S.npcOpen !== a.kind) { S.npcAt = null; return; }   // окно уже закрыли («Назад», Esc) или открыли другое
    const d = Math.hypot(S.pos.x - a.at.x, S.pos.y - a.at.y);
    if (d <= NPC_FAR) { a.on = true; return; }
    if (!a.on) return;
    S.npcAt = null; S.npcOpen = false;
    const back = a.kind === 'buy' && B.lines.size && !B.wait; if (back) B.lines.clear();   // идёт обмен (B.wait) - прилавок снимет итог игры
    panel();
    if (back) tip('Отошёл от скупщика - окно закрыто, руда снова в сумке');
  }
  // 25.10: окно — сразу (раньше — когда герой дойдёт: не дошёл — окна нет), герой идёт к NPC
  function goNpc(kind = 'buy') {
    const n = kind === 'lamp' ? S.Wd.lampNpc : S.Wd.npc; if (!n) return;
    const at = frontOf(kind === 'lamp' ? 'lamp' : 'buyer'), c = cellOfPt(at.x, at.y);   // 25.10 (mine/walk): к прилавку спереди, а не в лавку
    openPanel(kind);
    leaveRock(c, at);   // 25.10: к скупщику — от камня (раньше «копал» и у прилавка)
    walkTo(c, null, at);
  }
  // 25.10: доска поручений — список поручений; герой подходит, только если не копает (посмотреть поручения — не повод бросать камень)
  function goBoard() {
    openPanel('quests');
    if (S.myI >= 0) return;
    const at = frontOf('board'); walkTo(cellOfPt(at.x, at.y), null, at);   // 25.10 (mine/walk): встаёт перед доской, а не между её ножек
  }
  // куда подходить к предмету: перед ним (FOOT at)
  const frontOf = (k) => { const f = GX().FOOT.find((x) => x.k === k); return f && f.at ? freePt({ x: f.at[0], y: f.at[1] }) : spawnPt(); };
  // 25.10 (обновление шахты): подсветка контуром и подпись у предмета под мышью; на телефоне наведения нет — только клик
  // 26.10: у верхней клети (у самого верха зала) подпись - под ней (класс dn)
  function bindHover() {
    let cur = null;
    const off = () => { if (!cur) return; for (const g of cur) g.classList.remove('hl'); cur = null; const h = S && S.labels.querySelector('.mn-hl'); if (h) h.hidden = true; };
    S.svg.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse' || !mine2On()) return;
      const t = e.target.closest('[data-npc],[data-obj].act'); if (!t) return off();
      const k = t.dataset.npc ? NPC_OBJ[t.dataset.npc] : t.dataset.obj; if (cur && cur.includes(t)) return;
      off(); cur = [...S.svg.querySelectorAll(`[data-obj="${k}"].act` + (k === 'buyer' ? ',[data-npc="buy"]' : k === 'lamp' ? ',[data-npc="lamp"]' : ''))]; if (!cur.length) cur = [t];
      for (const g of cur) g.classList.add('hl');
      const h = S.labels.querySelector('.mn-hl'); if (!h) return;
      try { const b = t.getBBox(); const tt = objText(k); h.textContent = tt; h.style.left = (b.x + b.width / 2).toFixed(0) + 'px'; h.style.top = (k === 'up' ? b.y + b.height + 8 : b.y - 6).toFixed(0) + 'px'; h.hidden = !tt; h.classList.toggle('long', tt.length > 40); h.classList.toggle('dn', k === 'up'); } catch (x) {}
    });
    S.svg.addEventListener('pointerleave', off);
    S.view.addEventListener('pointerdown', off);
  }
  const blockTitle = (c) => `${tx().b[c.t] || tx().b.rock} ${c.lv} ур.${c.r && (c.t === 'ore' || c.t === 'rare') ? ' · ' + resName(c.r) : ''}`;
  // названия ресурсов всех промыслов (как products/legion/modules/mine/content/crafts.json → res), строчными
  const RES = { stone: 'камень', basalt: 'базальт', coal: 'уголь', iron: 'железо', silver: 'серебро', gold: 'золото', crystal: 'кристаллы', sulfur: 'сера', obsidian: 'обсидиан',
    wood: 'дерево', pine: 'сосна', resin: 'смола', moss: 'мох', oak: 'крепкий дуб', heartwood: 'редкая древесина', spiritwood: 'дерево духов', furs: 'меха', cedar: 'кедр',
    grain: 'зерно', flax: 'лён', wool: 'шерсть', honey: 'мёд', seeds: 'редкие семена', golden_wheat: 'золотая пшеница',
    herbs: 'травы', blight_herbs: 'гнилые травы', mushrooms: 'грибы', peat: 'торф', poison_root: 'ядовитые корни', moonflower: 'лунный цветок', witch_bloom: 'ведьмин цвет', bone_dust: 'костяная пыль', black_lotus: 'чёрный лотос',
    fish: 'рыба', ice_fish: 'северная рыба', salt: 'соль', shells: 'раковины', amber: 'янтарь', pearl: 'жемчуг', black_pearl: 'чёрный жемчуг', fish_oil: 'рыбий жир', seal_hide: 'тюленьи шкуры', walrus_tusk: 'моржовый клык', ice_amber: 'ледяной янтарь',
    clay: 'глина', rubble: 'щебень', glass: 'стекло', relic: 'древности', scarab: 'золотой скарабей', statue_shard: 'осколки статуй', crown: 'древняя корона',
    copper: 'медь', frost_stone: 'мёрзлый камень', limestone: 'известняк', sandstone: 'песчаник',
    adamant: 'адамантит', fire_opal: 'огненный опал', emerald: 'изумруд', sapphire: 'сапфир', topaz: 'топаз', malachite: 'малахит', morion: 'морион', aquamarine: 'аквамарин', ruby: 'рубин', runestone: 'рунный камень' };
  const resName = (k) => RES[k] || k;
  // 25.10: осколки (1 шт. = 100): «2 шт. + 37 осколков», «+37 осколков адамантита» (родительный падеж — для всплывашки)
  const RESG = { stone: 'камня', basalt: 'базальта', coal: 'угля', iron: 'железа', silver: 'серебра', gold: 'золота', crystal: 'кристаллов', sulfur: 'серы', obsidian: 'обсидиана',
    wood: 'дерева', pine: 'сосны', resin: 'смолы', moss: 'мха', oak: 'крепкого дуба', heartwood: 'редкой древесины', spiritwood: 'дерева духов', furs: 'мехов', cedar: 'кедра',
    grain: 'зерна', flax: 'льна', wool: 'шерсти', honey: 'мёда', seeds: 'редких семян', golden_wheat: 'золотой пшеницы',
    herbs: 'трав', blight_herbs: 'гнилых трав', mushrooms: 'грибов', peat: 'торфа', poison_root: 'ядовитых корней', moonflower: 'лунного цветка', witch_bloom: 'ведьмина цвета', bone_dust: 'костяной пыли', black_lotus: 'чёрного лотоса',
    fish: 'рыбы', ice_fish: 'северной рыбы', salt: 'соли', shells: 'раковин', amber: 'янтаря', pearl: 'жемчуга', black_pearl: 'чёрного жемчуга', fish_oil: 'рыбьего жира', seal_hide: 'тюленьих шкур', walrus_tusk: 'моржового клыка', ice_amber: 'ледяного янтаря',
    clay: 'глины', rubble: 'щебня', glass: 'стекла', relic: 'древностей', scarab: 'золотого скарабея', statue_shard: 'осколков статуй', crown: 'древней короны',
    copper: 'меди', frost_stone: 'мёрзлого камня', limestone: 'известняка', sandstone: 'песчаника',
    adamant: 'адамантита', fire_opal: 'огненного опала', emerald: 'изумруда', sapphire: 'сапфира', topaz: 'топаза', malachite: 'малахита', morion: 'мориона', aquamarine: 'аквамарина', ruby: 'рубина', runestone: 'рунного камня' };
  const oskW = (n) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'осколок' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'осколка' : 'осколков'; };
  const qty = (n, p) => (n && p ? `${n} шт. + ${p} ${oskW(p)}` : n ? `${n} шт.` : `${p} ${oskW(p)}`);
  /** Сумка / сводка: r — целые штуки, p — осколки сверх целых → [[ресурс, штук, осколков]]. */
  const resList = (b) => { const r = (b && b.r) || {}, p = (b && b.p) || {}; return [...new Set([...Object.keys(r), ...Object.keys(p)])].map((k) => [k, +r[k] || 0, +p[k] || 0]).filter(([, n, x]) => n > 0 || x > 0); };
  const gotText = (v, k) => { const n = Math.floor(v / 100), p = v % 100; return n ? `+${n} ${resName(k)}${p ? ` и ${p} ${oskW(p)}` : ''}` : `+${p} ${oskW(p)} ${RESG[k] || resName(k)}`; };
  let tipT = 0;
  function tip(t) { const el = S && S.el.querySelector('.mn-tip'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(tipT); tipT = setTimeout(() => { el.hidden = true; }, 4200); }

  /* ---------- панель: мой герой, сумка, скупщик ---------- */
  // 25.10: заработок с долями: целые — как везде, меньше 10 — с десятыми (в толпе за камень набегает 0,1-0,5 монеты, было «+0»)
  const coins = (x) => { const v = Math.max(0, +x || 0), n = Math.floor(v + 1e-9); if (v - n < 0.05 || n >= 10) return X.money ? X.money(n) : String(n); const t = v.toFixed(v < 1 ? 2 : 1).replace('.', ','); return n ? `${X.money ? X.money(n) : n} <small class="mn-frac">(${t})</small>` : (X.money ? X.money(1).replace('>1<', `>${t}<`) : t); };
  const mmss = (min) => { const m = Math.max(0, Math.round(min)); return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`; };
  // 26.10 (mine/count-fix): «В шахте N» - число сервера (here: разных героев, что были в шахте - копали или на странице - за последние
  // hm минут, по умолчанию 30; одно на всех, меняется не чаще раза в 4 с), было working + n присутствия (копающие с открытым сайтом - дважды, стоящий у камня без шага 2,5 мин - «ушёл»: 400/500/600).
  // Узлы шапки строим раз, число меняем свойством --mn-n: CSS сам плавно докручивает (mine.css, @property), без таймеров и кадров в JS
  function cnt() {
    if (!S || !S.st) return;
    const ce = S.el.querySelector('[data-mn="cnt"]'); if (!ce) return;
    if (!mine2On()) { if (!ce.hidden) { ce.hidden = true; ce.textContent = ''; } return; }
    const w = S.hw != null ? S.hw : S.st.working || 0, all = S.here != null ? Math.max(S.here, w) : w + (S.nOthers || 0);   // старый сервер без here - как было
    if (!ce.firstChild) ce.innerHTML = '<b data-cn="ht" title="Сейчас в шахте">👥 <i>В шахте </i><span class="mn-num" data-cn="here"></span></b><b data-cn="wt" title="Сейчас копают">⛏ <i>копают </i><span class="mn-num" data-cn="w"></span></b><b title="Гуляют по шахте (с открытым сайтом)" data-cn="gt" hidden>🚶 <i>гуляют </i><span class="mn-num" data-cn="g"></span></b>';
    // 30.10 (mine/online-total): числа - вся шахта (все этажи); в Шахте 3.0 (st.deep) в подсказке - сколько копают на этом этаже (st.working вида этажа)
    const fl = S.st.deep != null ? ` На этом этаже: ${S.st.working || 0}.` : '';
    const ht = (S.hm ? `Были в шахте за последние ${S.hm} мин (вся шахта).` : 'Сейчас в шахте (вся шахта).') + fl, hb = ce.querySelector('[data-cn="ht"]'); if (hb && hb.title !== ht) hb.title = ht;
    const wt = 'Сейчас копают (вся шахта).' + fl, wb = ce.querySelector('[data-cn="wt"]'); if (wb && wb.title !== wt) wb.title = wt;
    // 30.10: «гуляют M» (из журнала шахты) - рядом, в шапке
    const g = S.hg != null ? Math.max(0, S.hg - 1) : S.nOthers || 0, gt = ce.querySelector('[data-cn="gt"]'); if (gt && gt.hidden !== !g) gt.hidden = !g;
    for (const [k, v] of [['here', all], ['w', w], ['g', g]]) { const e = ce.querySelector(`[data-cn="${k}"]`); if (e && e.dataset.v !== String(v)) { e.dataset.v = String(v); e.style.setProperty('--mn-n', String(v)); e.setAttribute('aria-label', String(v)); } }
    ce.hidden = false;
  }
  function panel() {
    // 26.10: шахта не нарисовалась - в окне текст ошибки (fail), пока этаж не нарисуется
    if (!S || !S.st || S.failed) return;
    const st = S.st, me = S.me || { day: 0, cap: 480, bag: { c: 0, r: {} }, mx: { lv: 1, xp: 0, need: 60 }, wk: 0 };
    const setT = (sel, t) => { const e = S.el.querySelector(sel); if (e && e.textContent !== t) e.textContent = t; };
    // 30.10: «Новая шахта (тест)» - пометка «тест» (итогов и наград недели нет)
    setT('[data-mn="name"]', st.id === 't-v3' ? 'Новая шахта · тест' : st.name && st.id !== 'home' ? `Шахта · ${st.name}` : 'Шахта');
    setT('[data-mn="floor"]', `${stars(st.danger)} ${BIO_RU[st.biome] || ''} · этаж ${st.n}${st.rec > st.n ? ` · рекорд ${st.rec}` : ''}`);
    // 27.10: угольный этаж - табличка в шапке (рядом с номером этажа)
    { const fe = S.el.querySelector('[data-mn="floor"]'), cb = fe.parentNode.querySelector('.mn-coal'), on = !!(S.F && S.F.coal && S.F.coal.length);
      if (on && !cb) fe.insertAdjacentHTML('afterend', '<span class="mn-coal" title="На этом этаже - кучи угля, вокруг каждой жила угольных камней (5-9). Такой этаж - один из каждых десяти">Угольный этаж</span>');
      else if (!on && cb) cb.remove(); }
    const left = st.reset - Date.now(), dd = Math.floor(left / 864e5), hh = Math.floor((left % 864e5) / 36e5);
    setT('[data-mn="reset"]', left > 0 ? `новая шахта через ${dd ? dd + ' д ' : ''}${hh} ч` : '');
    cnt();
    const bag = me.bag || { c: 0, r: {} }, res = resList(bag);
    // 26.10 (окно скупщика): добытое — в сумке героя, оплата — сразу в кошелёк; в рудной сумке шахты — только не влезшее (сумка и склад полны)
    const bagHtml = buyerOn() ? `<div class="mn-bag mb-earn"><div class="mn-bag-c"><span>Оплата за работу — сразу в кошелёк, после каждого камня</span><b>${coins(bag.cx != null ? bag.cx : bag.c)}</b></div>${res.length ? `<p class="mb-wait">Сумка и склад полны — ждёт в шахте: ${res.map(([k, n, p]) => `${esc(resName(k))} ${esc(qty(n, p))}`).join(', ')}. Освободи место — перенесём сами.</p>` : ''}</div>` : `<div class="mn-bag"><div class="mn-bag-c"><span>Заработок — выдаст ${esc(tx().seller.split(' ')[0].toLowerCase())}</span><b>${coins(bag.cx != null ? bag.cx : bag.c)}</b></div>${res.length ? `<ul class="mn-res">${res.map(([k, n, p]) => `<li><i style="background:${(CW().RES || {})[k] || '#999'}"></i><span>${esc(resName(k))}</span><b>${esc(qty(n, p))}</b></li>`).join('')}</ul>${res.some(([, , p]) => p) ? '<p class="muted mn-osk">100 осколков - 1 шт.; скупщик сложит сам и примет остаток</p>' : ''}` : `<p class="muted">${esc(tx().bagEmpty)}</p>`}</div>`;
    const mx = me.mx || { lv: 1, xp: 0, need: 60 };
    const q = me.q || { d: [], w: [] }, qli = mine2On()
      // 25.10 (mine2): строка поручения - название целиком слева, прогресс и награда - фишками справа (в узком окне - строкой ниже)
      ? (x) => `<li class="mn-qr${x.done ? ' done' : ''}${x.cl ? ' cl' : ''}"><span class="mn-qt">${esc(x.t)}${x.h ? `<small>Где: ${esc(x.h)}</small>` : ''}</span><span class="mn-qx"><b class="mn-qp">${x.cl ? 'получено' : x.done ? 'готово' : `${x.p} / ${x.g}`}</b><em class="mn-qrw">+${X.money ? X.money(x.c) : x.c}</em></span></li>`
      : (x) => `<li class="${x.done ? 'done' : ''}${x.cl ? ' cl' : ''}"><span>${esc(x.t)}${x.h ? `<small style="display:block;font-size:11px;opacity:.7">Где: ${esc(x.h)}</small>` : ''}</span><b>${x.cl ? 'получено' : x.done ? 'готово' : `${x.p} / ${x.g}`}</b><em>+${X.money ? X.money(x.c) : x.c}</em></li>`;
    // 25.10: забрал — кнопки нет, пока снимок героя не догонит (раньше через 2 с она возвращалась из запоздавшего снимка)
    if (S.claimed && Date.now() - S.claimed > 60000) S.claimed = 0;
    // 28.10 (новые поручения, тестерам - mineQuests2Public): общее поручение шахты на неделю - q.c: общий прогресс, свой вклад, порог
    const qc = q.c || null, qcReady = !!(qc && qc.done && qc.ok && !qc.cl);
    const canClaim = !S.claimed && ([...q.d, ...q.w].some((x) => x.done && !x.cl) || qcReady);
    const qcHtml = qc ? `<h4>Общее поручение шахты</h4><div class="mn-qc${qc.done ? ' done' : ''}"><span class="mn-qt">${esc(qc.t)}<small>Награда +${X.money ? X.money(qc.c) : qc.c} каждому, кто вложил от ${qc.min}. Твой вклад: ${qc.me}${qc.ok ? ' - хватает' : ` - ещё ${Math.max(0, qc.min - qc.me)}`}. Участников: ${qc.n || 0}</small></span><span class="mn-qx"><b class="mn-qp">${qc.cl ? 'получено' : qc.done ? (qc.ok ? 'готово' : 'выполнено') : `${qc.p} / ${qc.g}`}</b></span><span class="m2-mini"><i style="width:${Math.min(100, qc.p / Math.max(1, qc.g) * 100).toFixed(1)}%"></i></span></div>` : '';
    const quests = `<div class="mn-q"><h4>Поручения на сегодня</h4><ul>${q.d.map(qli).join('')}</ul><h4>Поручения недели</h4><ul>${q.w.map(qli).join('')}</ul>${qcHtml}${canClaim ? '<button type="button" class="btn primary" data-mn-claim>Забрать награду</button>' : mine2On() ? '<button type="button" class="btn primary" data-mn-claim disabled title="Пока нечего забирать - выполни поручение">Забрать награду</button>' : ''}</div>`;
    const have = lampHave();
    wgDraw(me, mx, bag, res, canClaim);
    hatLine(have);
    // 30.10 (стример: убрать правую панель): окна NPC, поручения, лифт, буровая - облачко у своего предмета (mn-win), без окна - ничего
    const body = !S.npcOpen ? ''
      : S.npcOpen === 'lift' && V3() ? liftHtml(st)
      : S.npcOpen === 'drill' && V3() ? drillHtml(st)
      : S.npcOpen === 'quests' ? boardHtml(st, me, quests)
      : S.npcOpen === 'log' ? `<div class="mn-npc-p mn-log"><h3 class="h3">Журнал шахты</h3><p class="muted">${esc(tx().work)}: ${st.working || 0}${S.nOthers ? ` · гуляют: ${S.nOthers}` : ''}</p><ul>${(st.log || []).slice(0, 12).map((e) => `<li>${esc(e.t)}</li>`).join('') || '<li class="muted">Пока тихо</li>'}</ul></div>`
      : S.npcOpen === 'bag' ? bagPanel()
      : S.npcOpen === 'buy' && buyerOn() ? buyerHtml(st)
      : S.npcOpen === 'lamp' && pickOn() ? supHtml(st, have)
      : S.npcOpen === 'lamp'
      ? `<div class="mn-npc-p"><h3 class="h3">Фонарщик</h3>${lampOn() ? '<p>«Каска шахтёра» на тебе — фонарь светит на любом этаже.</p>' : !have && S.lampBought && Date.now() - S.lampBought < 60000 ? '<p>Каска куплена — несу в сумку, через пару секунд появится.</p>' : have ? `<p>«Каска шахтёра» у тебя в сумке — надень её, и фонарь загорится.</p><div class="mn-btns"><button type="button" class="btn primary" data-mn-wear="${esc(have.uid)}">Надеть каску</button></div>` : `<p>Дальше — темнота: с ${st.darkFrom || 5}-го этажа без света ничего не видно и копать нельзя. «Каска шахтёра» — обычная вещь в сумку: надел — светит; можно снять и убрать на склад.</p><div class="mn-btns"><button type="button" class="btn primary" data-mn-lamp>Купить каску — ${X.money ? X.money(st.lampPrice || 150) : st.lampPrice}</button></div>`}</div>`
      : `<div class="mn-npc-p"><h3 class="h3">${esc(tx().seller)}</h3><p>${esc(tx().hello)}</p>${bagHtml}<div class="mn-btns"><button type="button" class="btn primary" data-mn-sell>Сдать всё</button></div>${quests}</div>`;
    const el = S.el.querySelector('[data-mn="body"]'), win = S.el.querySelector('.mn-win');
    if (!body) { if (!win.hidden) { win.hidden = true; el.innerHTML = ''; S.bodyHtml = ''; S.bodyParts = null; } buyInv(); return; }
    // 25.10: окно перерисовываем, только если в нём что-то поменялось: новый вид шахты каждые 2 с пересоздавал кнопки — нажатие
    // попадало в исчезнувшую кнопку, мигало и сбрасывало прокрутку
    if (body === S.bodyHtml && el.firstChild && !win.hidden) { buyInv(); return; }
    const first = win.hidden; win.hidden = false; win.dataset.k = S.npcOpen;
    // 25.10 (обновление шахты): меняем только изменившиеся части окна (кнопки рядом не пересоздаются, нажатие не теряется)
    const tp = document.createElement('template'); tp.innerHTML = body; const nw = [...tp.content.children], parts = nw.map((n) => n.outerHTML);
    if (!first && S.bodyParts && el.children.length === S.bodyParts.length && parts.length === S.bodyParts.length && el.firstChild) nw.forEach((n, k) => { if (parts[k] !== S.bodyParts[k]) el.children[k].replaceWith(n); });
    else el.innerHTML = body;
    S.bodyHtml = body; S.bodyParts = parts;
    if (first) win.scrollTop = 0;
    const b1 = el.querySelector('[data-mn-sell]'); if (b1) b1.onclick = sell;   // 24.10: всегда активна — сумка на сайте запаздывает (снимок героя раз в 10-20 с): «пуста» сразу после камня, а у комнаты уже есть что сдать
    el.querySelectorAll('[data-mn-back]').forEach((b) => { b.onclick = () => winClose(); });
    el.querySelectorAll('[data-mn-bt]').forEach((b) => { b.onclick = () => { S.qTab = b.dataset.mnBt; S.bodyHtml = ''; panel(); }; });
    const b5 = el.querySelector('[data-mn-claim]'); if (b5) b5.onclick = async () => { if (S.busyOp) return; S.busyOp = 1; b5.disabled = true; const r = await X.api('/api/mineClaim', { c: C }); if (!S) return; S.busyOp = 0; if (r && r.ok) { S.claimed = Date.now(); tip('Награда за поручения — монеты придут через пару секунд'); if (S.me && S.me.q) { for (const x of [...S.me.q.d, ...S.me.q.w]) if (x.done) x.cl = 1; if (S.me.q.c && S.me.q.c.done && S.me.q.c.ok) S.me.q.c.cl = 1; } panel(); } else { b5.disabled = false; tip((r && r.error) || 'Не получилось'); } };
    el.querySelectorAll('[data-mn-wear]').forEach((b) => b.onclick = () => wear(b, b.dataset.mnWear));
    el.querySelectorAll('[data-mn-off]').forEach((b) => b.onclick = () => takeOff(b, b.dataset.mnOff));
    const b6 = el.querySelector('[data-mn-lamp]'); if (b6) b6.onclick = async () => { if (S.busyOp) return; S.busyOp = 1; b6.disabled = true; const r = await X.api('/api/mineLamp', { c: C }); if (!S) return; S.busyOp = 0; if (r && r.ok) { S.lampBought = Date.now(); tip('«Каска шахтёра» в сумке — сейчас появится, тогда надень её'); panel(); } else { b6.disabled = false; tip((r && r.error) || 'Не получилось'); } };
    buyBind(el); supBind(el); liftBind(el);
    winPlace();
  }
  /* ---------- 30.10 (стример): виджет справа сверху под угловыми кнопками - заработок, сегодня, горное дело, общее поручение,
     «Поручения» и «Сумка». Полупрозрачная плашка, мелкий шрифт, ~240 px; на телефоне - одна строка, раскрывается нажатием.
     DOM - только когда поменялся текст (S.wgH). ---------- */
  const pc1 = (a, b) => (b ? Math.min(100, a / b * 100) : 100).toFixed(1);
  function wgDraw(me, mx, bag, res, canClaim) {
    const el = S.el.querySelector('.mn-wg'); if (!el) return;
    const phone = window.LGSiteUi.is('phone'), open = !phone || !!S.wgOpen, earn = coins(bag.cx != null ? bag.cx : bag.c), qc = me.q && me.q.c;
    const row = (k, v, bar, cls) => `<div class="mn-wg-r${cls ? ' ' + cls : ''}"><span>${k}</span><b>${v}</b>${bar != null ? `<i class="mn-wg-b"><i style="width:${bar}%"></i></i>` : ''}</div>`;
    let h = phone ? `<button type="button" class="mn-wg-t" data-wg="tog" aria-expanded="${open}"><span>${earn}</span><span>ур. ${mx.lv}</span>${canClaim ? '<em class="mn-wg-dot" aria-label="награда готова"></em>' : ''}<i aria-hidden="true"></i></button>` : '';
    if (open) {
      h += '<div class="mn-wg-in">';
      h += row(buyerOn() ? 'Заработок' : 'Заработок <small>у скупщика</small>', earn, null, 'mn-wg-e');
      if (res.length && buyerOn()) h += `<p class="mn-wg-w">Сумка и склад полны - руда ждёт в шахте</p>`;
      else if (res.length) h += `<p class="mn-wg-w">В рудной сумке: ${res.slice(0, 3).map(([k, n, p]) => `${esc(resName(k))} ${esc(qty(n, p))}`).join(', ')}${res.length > 3 ? '…' : ''}</p>`;
      h += row('Сегодня', `${mmss(me.day)}${me.cap > 0 ? ` <small>из ${mmss(me.cap)}</small>` : ''}`, me.cap > 0 ? pc1(me.day, me.cap) : null, 'mn-wg-day');
      h += row(esc(tx().mast), `ур. ${mx.lv}`, pc1(mx.xp, mx.need), 'mn-wg-xp');
      if (qc) h += row('Общее поручение', `${qc.p} <small>из ${qc.g}</small>`, pc1(qc.p, Math.max(1, qc.g)), 'mn-wg-qc');
      h += `<div class="mn-wg-a"><button type="button" data-wg="quests" data-mn-quests>Поручения${canClaim ? '<em class="mn-wg-dot" aria-label="награда готова"></em>' : ''}</button><button type="button" data-wg="bag" data-mn-bag>Сумка</button>${S.mchatOn && mine2On() ? '' : '<button type="button" data-wg="log" data-mn-log>Журнал</button>'}</div></div>`;
    }
    if (h === S.wgH) return; S.wgH = h; el.innerHTML = h; el.classList.toggle('open', open);
  }
  function wgClick(e) {
    const b = e.target.closest('[data-wg]'); if (!b || !S) return;
    const k = b.dataset.wg;
    if (k === 'tog') { S.wgOpen = !S.wgOpen; S.wgH = ''; panel(); return; }
    if (k === 'quests') { if (S.npcOpen === 'quests') winClose(); else { S.qTab = 'q'; openPanel('quests'); } return; }
    if (k === 'log') { if (S.npcOpen === 'log') winClose(); else openPanel('log'); return; }
    if (k === 'bag') { if (S.wgOpen && window.LGSiteUi.is('phone')) { S.wgOpen = false; S.wgH = ''; panel(); } if (mine2On()) bag2(); else if (S.npcOpen === 'bag') winClose(); else openPanel('bag'); }
  }
  // 30.10 (стример): каска - только если на этом этаже нужна и не надета: строка сверху по центру; не нужна или надета - ничего
  function hatLine(have) {
    const el = S.el.querySelector('.mn-hat'); if (!el) return;
    const need = S.st.n >= (S.st.darkFrom || 5) && !lampOn();
    const t = !need ? '' : have ? 'Нужна каска шахтёра - она в сумке, надень её' : `Нужна каска шахтёра - купи у ${pickOn() ? 'Снабженца' : 'Фонарщика'}`;
    if (el.textContent !== t) el.textContent = t;
    if (el.hidden !== !t) el.hidden = !t;
  }
  /* ---------- 30.10 (стример): доска в зале - вкладки «Поручения» (прежнее окно) и «Доска почёта» (мой вклад за неделю, топ недели
     шахты, прошлая неделя - те же данные, что у «Итогов»: st.top, st.hist) ---------- */
  function boardHtml(st, me, quests) {
    const tab = S.qTab === 'hon' ? 'hon' : 'q';
    const tabs = `<div class="sp-tabs mn-bt" role="tablist" aria-label="Доска">${[['q', 'Поручения'], ['hon', 'Доска почёта']].map(([k, t]) => `<button type="button" role="tab" class="sp-tab" data-mn-bt="${k}" aria-selected="${tab === k}">${t}</button>`).join('')}</div>`;
    if (tab === 'q') return `<div class="mn-npc-p"><h3 class="h3">Поручения скупщика</h3>${tabs}<p class="muted">Награду выдаёт ${esc(tx().seller)} - «Забрать награду», когда поручение готово.</p>${quests}</div>`;
    const ml = X.login(), top = st.top || [], k = top.findIndex(([l]) => l === ml), h0 = st.hist && st.hist[0];
    const row = (l, u, i) => `<li class="${l === ml ? 'me' : ''}"><span>${i + 1}</span><b>${esc(l === ml ? l + ' (ты)' : l)}</b><em>${u}</em></li>`;
    return `<div class="mn-npc-p mn-hon"><h3 class="h3">Доска почёта</h3>${tabs}
      <div class="mn-hon-me"><span>Твой вклад за неделю</span><b>${me.wk || 0}</b>${k >= 0 ? `<small>${k + 1}-е место</small>` : ''}</div>
      <h4>Лучшие копатели недели</h4><ol class="mn-bd-top">${top.map(([l, u], i) => row(l, u, i)).join('') || '<li class="muted">Пока никто не копал</li>'}</ol>
      ${h0 ? `<h4>Прошлая неделя - до этажа ${h0.floor}</h4><ol class="mn-bd-top">${(h0.top || []).slice(0, 3).map((x, i) => row(x.l, x.u, i)).join('')}</ol>` : ''}
      <p class="muted">Вклад - сколько работы вложил герой. Каждую субботу в 18:00 - новая шахта.</p></div>`;
  }
  /* ---------- 30.10: окно-облачко (mn-win) у предмета, к которому относится: Скупщик, Снабженец, доска, лифт, буровая; место - из
     камеры (S.tx, S.ty, S.z) по событиям (apply, перерисовка окна), без кадров; не влезает - прокрутка внутри; на телефоне - по ширине экрана ---------- */
  const WIN_AT = { buy: 'buyer', lamp: 'lamp', quests: 'board', lift: 'lift' };
  function winAnchor(kind) {
    if (kind === 'drill') { const d = S.st && (S.st.drills || []).find((x) => x[0] === S.drillK); if (!d || !S.m3) return null; const p = S.m3.G.cellXY(d[2]); return { x: p.cx, up: p.y - (96 + Math.max(1, d[4]) * 26), dn: p.y + 34 }; }
    const f = WIN_AT[kind] && GX().FOOT.find((x) => x.k === WIN_AT[kind]); if (!f) return null;
    return { x: (f.s[0] + f.s[2]) / 2, up: f.s[1] - 10, dn: f.z + 14 };
  }
  function winPlace() {
    const m = S && S.el.querySelector('.mn-win'); if (!m || m.hidden) return;
    const vw = S.view.clientWidth, vh = S.view.clientHeight, top0 = Math.max((S.topPad || 0) + 4, 8), phone = vw < 721, cap = phone ? vh * 0.62 : 560;
    const a = S.npcOpen ? winAnchor(S.npcOpen) : null;
    const ax = a ? S.tx + a.x * S.z : vw / 2, up = a ? S.ty + a.up * S.z - 14 : 0, dn = a ? S.ty + a.dn * S.z + 12 : 0;
    const vis = !!a && ax > 0 && ax < vw && dn > 0 && up < vh;
    // над предметом или под ним - где места больше; высота облачка - не больше этого места (дальше - прокрутка внутри), предмет не закрываем
    // места мало и сверху, и снизу (низкий экран) - облачко во весь рост вида, пусть и на предмете
    const roomUp = up - top0, roomDn = vh - 8 - dn, above = !vis || roomUp >= roomDn, room = vis && Math.max(roomUp, roomDn) >= 260 ? Math.max(roomUp, roomDn) : vh - top0 - 12;
    m.style.maxHeight = Math.max(180, Math.min(cap, room)) + 'px';
    const w = m.offsetWidth, h = m.offsetHeight;
    let x, y;
    if (!vis) { x = (vw - w) / 2; y = Math.max(top0, (vh - h) / 2); }
    else { y = Math.max(top0, Math.min(vh - h - 8, above ? up - h : dn)); x = ax - w / 2; }
    x = Math.max(8, Math.min(vw - w - 8, x));
    m.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
    m.classList.toggle('dn', vis && !above); m.classList.toggle('tl', vis);
    m.style.setProperty('--tail', Math.max(18, Math.min(w - 18, ax - x)).toFixed(0) + 'px');
  }
  function winClose() {
    if (!S) return;
    if (S.npcOpen === 'buy' && B.lines.size && !B.wait) B.lines.clear();
    S.npcOpen = false; S.npcAt = null; panel();
  }

  /* ---------- 25.10 (обновление шахты): сумка — компактная карточка сбоку, как карточка героя в расширении Twitch.
     Вся сумка — библиотека инвентаря (packages/inventory, /lib/inventory.js: LGInventory.mount, вид 'compact', режим 'equip'):
     кукла, ячейки, фильтр значками и порядок, стопки, перетаскивание на слот с обменом, зелёный / красный слот, Shift + правая кнопка (надеть / снять), правая кнопка - карточка вещи,
     двойной клик, удержание пальцем, строка подсказки. Здесь — только обёртка на месте правой панели (шахта рядом видна и нажимается),
     данные героя, надеть / снять (/api/equip, /api/unequip через app.js) и рисунки сайта (человечек, карточка вещи с сравнением).
     Закрыть — той же «Сумкой», «×» или Esc (Esc — общий обработчик шахты). На телефоне обёртка встаёт снизу на ~60% высоты. ---------- */
  const tipOff = () => { try { if (X.tipHide) X.tipHide(); } catch (e) {} };
  const bagData = () => { const h = X.hero() || {}; return { hero: h, items: h.items || [], ...(+h.ob > 0 ? { obCap: +h.ob } : {}) }; };   // 26.10: obCap - рудная сумка отдельным блоком
  function bag2() {
    if (!S) return; let w = S.el.querySelector('.mn-inv2-w');
    if (w) { bagClose(); return; }   // та же «Сумка» — закрыть
    if (!window.LGInventory) { S.npcOpen = 'bag'; panel(); return; }   // библиотеки нет (старая страница) — сумка списком
    w = document.createElement('div'); w.className = 'mn-inv2-w'; w.innerHTML = '<section class="mn-inv2" aria-label="Сумка"></section>'; S.el.appendChild(w); S.el.classList.add('bag-on');
    // 30.10: сумка - отдельным окном справа под виджетом (правой панели больше нет; на телефоне - снизу, как было)
    { const g = S.el.querySelector('.mn-wg'), r = g && g.getBoundingClientRect(), t0 = S.el.getBoundingClientRect().top; if (r && r.height && !window.LGSiteUi.is('phone')) w.style.setProperty('--mn-bagt', Math.round(r.bottom - t0 + 6) + 'px'); }
    S.bag = window.LGInventory.mount(w.firstChild, {
      variant: 'compact', mode: 'equip', data: bagData(),
      actions: { equip: (uid) => wear(null, uid), unequip: (slot) => takeOff(null, slot), close: () => bagClose() },
      options: {
        title: 'Сумка', role: 'dialog', storeKey: 'lgMineBag', esc: false, say: (t) => tip(t),
        art: X.art ? (it) => X.art(it) : null,
        figure: (h) => { const st = h.stats || {}, hpMax = +st.hp || 0, hpNow = h.hpNow != null ? +h.hpNow : hpMax; return still(X.doodle(X.login(), X.heroLook ? X.heroLook(h) : h, hpMax && hpNow / hpMax < 0.3 ? 'hurt' : 'stern', h.ghost ? undefined : 'battle')); },
        money: (n) => (X.money ? X.money(n) : String(n)),
        cardTip: X.cardTip ? (el, it) => X.cardTip(el, it, X.hero()) : null, tipHide: tipOff,
        labels: { noUse: 'Во вкладке «Персонаж»', cantUse: 'Это не надеть - еда, зелья и склад во вкладке «Персонаж» и в «Городе»' },
      },
    });
  }
  function bagClose() { const w = S && S.el.querySelector('.mn-inv2-w'); if (!w) return; if (S.bag) { try { S.bag.destroy(); } catch (e) {} S.bag = null; } tipOff(); w.remove(); S.el.classList.remove('bag-on'); }
  function bagDraw() { if (S && S.bag) S.bag.update(bagData()); }
  /* ---------- 26.10: окно скупщика (идея стримера): игрок кладёт руду и осколки из своей сумки на прилавок — перетаскиванием, нажатием
     или Shift+кликом (библиотека инвентаря, режим 'pick', как «Ты отдаёшь» в обмене); скупщик пишет «Дам за это N» (по ценам игры st.bp —
     так же считает и комната), «Обменять» — монеты в кошелёк, руда в казну Ратуши; «Забрать обратно» — прилавок пуст (руда и не уходила
     из сумки: прилавок — только в окне). Цену и наличие проверяет комната (modules/mine/server.js mineBuy): видела другую цену — отказ
     с новой, окно её покажет. Окно — в панели (на широком ПК — у правой стены зала, на телефоне — снизу). ---------- */
  const B = { lines: new Map(), wait: null, said: null };   // said — 26.10: благодарность скупщика после обмена { t, c, at } (на месте предложения)   // lines: uid → осколков на прилавке; wait — ждём итог игры { at, price }
  const oreItems = () => { const h = (X && X.hero && X.hero()) || {}; return (h.items || []).filter((it) => it && it.qty && it.q > 0); };
  const bpOf = () => (S && S.st && S.st.bp) || {};
  const priceOf = (lines) => { const P = bpOf(); let t = 0; for (const [uid, q] of lines) { const it = oreItems().find((x) => x.uid === uid); if (it) t += q * (+P[it.res] || 0); } return Math.floor(t / 100 + 1e-9); };
  // прилавок — только то, что ещё есть в сумке (продали, унесли на склад — строка уходит; кучка меньше — столько, сколько есть)
  function buyTidy() { const its = new Map(oreItems().map((it) => [it.uid, it])); for (const [uid, q] of [...B.lines]) { const it = its.get(uid); if (!it) B.lines.delete(uid); else if (q > it.q) B.lines.set(uid, it.q); } }
  const oskQ = (q) => (window.LGInventory && window.LGInventory.oreQty ? window.LGInventory.oreQty(q) : qty(Math.floor(q / 100), q % 100));
  const val = (x) => { const v = Math.round(x * 10) / 10; return String(v).replace('.', ','); };
  function buyerHtml(st) {
    buyTidy();
    const P = st.bp || {}, its = oreItems(), lines = [...B.lines].map(([uid, q]) => [its.find((x) => x.uid === uid), q]).filter(([it]) => it), price = priceOf(B.lines), wait = !!B.wait;
    const row = ([it, q]) => `<li class="mb-ln" data-mb-uid="${esc(it.uid)}"><span class="mb-ic">${X.art ? X.art(it) : ''}</span><span class="mb-nm"><b>${esc(it.name)}</b><small>${esc(oskQ(q))}${q < it.q ? ` из ${esc(oskQ(it.q))}` : ''}</small></span><em class="mb-v" title="Столько это стоит у скупщика">≈ ${val(q * (+P[it.res] || 0) / 100)}</em>`
      + `<span class="mb-lb"><button type="button" class="btn ghost sm" data-mb-half${q < 2 || wait ? ' disabled' : ''} title="Оставить на прилавке половину">½</button><button type="button" class="btn ghost sm" data-mb-all${q >= it.q || wait ? ' disabled' : ''} title="Всю кучку">Всё</button><button type="button" class="btn ghost sm mb-x" data-mb-x${wait ? ' disabled' : ''} aria-label="Убрать с прилавка">×</button></span></li>`;
    const thx = B.said && !lines.length && Date.now() - B.said.at < 120000 ? B.said : null;
    const say = thx ? esc(thx.t).replace(/\{coins\}/g, X.money ? X.money(thx.c) : String(thx.c)) : !lines.length ? 'Клади руду на прилавок — скажу, сколько дам.' : price > 0 ? `Дам за это ${X.money ? X.money(price) : price}.` : 'За это и медяка не дам — добавь ещё.';
    const pl = Object.entries(P).filter(([k]) => its.some((it) => it.res === k)).sort((a, b) => b[1] - a[1]);
    return `<section class="m2-card mb-head"><div class="mb-who"><h3 class="h3">${esc(tx().seller)}</h3><p class="mb-say${thx ? ' thx' : ''}" aria-live="polite">«${say}»</p></div></section>
      <section class="m2-card mb-counter" data-igdrop="buy" aria-label="Прилавок скупщика"><div class="m2-k">Прилавок <small>${lines.length ? `${lines.length} ${lines.length === 1 ? 'вид' : lines.length < 5 ? 'вида' : 'видов'}` : 'пусто'}</small></div>
        ${lines.length ? `<ul class="mb-lines">${lines.map(row).join('')}</ul>` : `<p class="mb-empty">Перетащи сюда руду или осколки из сумки ниже — или просто нажми на кучку${window.matchMedia && window.matchMedia('(pointer: fine)').matches ? ' (Shift+клик — тоже)' : ''}.</p>`}
        <div class="mb-offer${price > 0 ? ' on' : ''}"><span>Скупщик даст</span><b>${X.money ? X.money(price) : price}</b></div>
        <div class="mn-btns"><button type="button" class="btn primary" data-mb-go${!(price > 0) || wait ? ' disabled' : ''}>${wait ? 'Скупщик считает…' : 'Обменять'}</button><button type="button" class="btn ghost" data-mb-back${!lines.length || wait ? ' disabled' : ''}>Забрать обратно</button></div></section>
      <section class="m2-card mb-inv"><div class="m2-k">Руда в сумке <small>100 осколков — 1 шт.</small></div><div class="mb-grid" data-mn-buyinv></div></section>
      <section class="mb-foot">${pl.length ? `<details class="mb-prices"><summary>Цены скупщика</summary><ul>${pl.map(([k, v]) => `<li><span>${esc(resName(k))}</span><b>${val(v)}</b></li>`).join('')}</ul><p class="muted">монет за 1 шт.; осколки — долей</p></details>` : ''}
        <p class="muted">Купленное скупщик отправит в казну Ратуши — на развитие города.</p><div class="mn-btns"><button type="button" class="btn ghost" data-mn-back>Назад</button></div></section>`;
  }
  // сумка (только руда) — библиотека инвентаря в окне; на прилавке лежащее — меньше в ячейках
  const buyData = () => { const h = (X.hero && X.hero()) || {}; const items = oreItems().map((it) => { const on = B.lines.get(it.uid) || 0; return on ? { ...it, q: it.q - on } : it; }).filter((it) => it.q > 0); return { hero: h, items }; };
  function buyInv() {
    if (!S) return;
    const host = S.npcOpen === 'buy' && buyerOn() ? S.el.querySelector('[data-mn-buyinv]') : null;
    if (!host) { if (S.buyInv) { try { S.buyInv.destroy(); } catch (e) {} S.buyInv = null; } return; }
    if (S.buyInv && S.buyInv.el === host && host.__lgi) { S.buyInv.update(buyData()); return; }
    if (S.buyInv) { try { S.buyInv.destroy(); } catch (e) {} S.buyInv = null; }
    if (!window.LGInventory) { host.innerHTML = '<p class="muted">Сумка не загрузилась — обнови страницу.</p>'; return; }
    S.buyInv = window.LGInventory.mount(host, { variant: 'full', mode: 'pick', data: buyData(),
      actions: { pick: (it) => buyPut(it), drop: (it) => buyPut(it) },
      options: { header: false, vitals: false, detail: false, doll: false, filters: false, sort: false, hint: false, art: X.art ? (it) => X.art(it) : null, storeKey: 'lgMineBuy',
        dragRoot: S.el.querySelector('.mn-win'), dropSel: '[data-igdrop="buy"]', can: () => (B.wait ? 'Скупщик считает прошлое' : true),
        labels: { empty: 'Руды в сумке нет — накопай в шахте или забери со склада.' },
        cardTip: X.cardTip ? (c, it) => X.cardTip(c, it, X.hero()) : null, tipHide: tipOff, say: (t) => tip(t) } });
  }
  function buyPut(it) {
    if (!it || B.wait) return;
    const full = oreItems().find((x) => x.uid === it.uid); if (!full) return;
    if (!B.lines.has(it.uid) && B.lines.size >= 30) { tip('На прилавке не больше 30 видов за раз'); return; }
    B.lines.set(it.uid, full.q); B.said = null; tipOff(); S.bodyHtml = ''; panel();
  }
  function buyBind(el) {
    buyInv();
    const box = el.querySelector('.mb-counter'); if (!box) return;
    box.onclick = (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const li = b.closest('[data-mb-uid]'), uid = li && li.dataset.mbUid, it = uid && oreItems().find((x) => x.uid === uid);
      if (b.hasAttribute('data-mb-x') && uid) B.lines.delete(uid);
      else if (b.hasAttribute('data-mb-half') && uid) B.lines.set(uid, Math.max(1, Math.ceil((B.lines.get(uid) || 0) / 2)));
      else if (b.hasAttribute('data-mb-all') && it) B.lines.set(uid, it.q);
      else if (b.hasAttribute('data-mb-back')) { B.lines.clear(); tip('Руда снова в сумке'); }
      else if (b.hasAttribute('data-mb-go')) { buyGo(); return; }
      else return;
      S.bodyHtml = ''; panel();
    };
  }
  async function buyGo() {
    buyTidy();
    const lines = [...B.lines].filter(([, q]) => q > 0), price = priceOf(lines);
    if (!lines.length || !(price > 0) || B.wait) return;
    B.wait = { at: Date.now(), price }; S.bodyHtml = ''; panel();
    const r = await X.api('/api/mineBuy', { c: C, lines, price });
    if (!S) return;
    if (!r || !r.ok) { B.wait = null; tip((r && r.error) || 'Не получилось'); S.bodyHtml = ''; panel(); return; }
    B.wait.id = r.id;
    setTimeout(() => { if (S && B.wait && B.wait.id === r.id) { B.wait = null; S.bodyHtml = ''; panel(); } }, 25000);   // итог не пришёл — кнопки снова доступны
  }
  /** Итог игры по действию шахты (app.js: results[].x.op = mine…): окно скупщика — монеты или отказ (с новой ценой). */
  function result(x) {
    const r = x && x.x; if (!r) return;
    if (r.op === 'mineBuy') {
      const mineW = !!(B.wait && (!B.wait.id || B.wait.id === x.id)); if (mineW) B.wait = null;
      if (x.ok) { B.lines.clear(); if (r.t) B.said = { t: String(r.t), c: r.c || 0, at: Date.now() }; if (S && (!r.t || S.npcOpen !== 'buy')) tip(`${tx().seller.split(' ')[1] || 'Скупщик'} заплатил ${r.c || 0} — монеты в кошельке, руда ушла в казну Ратуши`); else if (window.LGMine && X && X.toast) X.toast(`Скупщик заплатил ${r.c || 0}`); }
      else if (S) tip((x.error || 'Скупщик не взял') + (r.c ? '' : ''));
      if (S) { S.bodyHtml = ''; panel(); }
      return;
    }
    if (r.op === 'minePick' || r.op === 'mineOreBag') { supResult(x, r); return; }
    if (!x.ok && S) tip(x.error || 'Не вышло');
  }
  /* ---------- 26.10 (mine/pickaxe, решения стримера): окно Снабженца Кремня - торговца снаряжением для шахт (бывший Фонарщик).
     Вкладки: «Кирка» (нынешняя, следующая ступень, что даёт, что нужно - мастерство, монеты, руда из сумки со значками и «есть N /
     нужно M», «Улучшить»), «Рудная сумка» (купить), «Каска» (как у Фонарщика). Источник правды - игра (mine/server.js minePick,
     mineOreBag): окно только показывает; кнопка не жмётся дважды, пока ждём итог (а игра ещё проверяет ступень: вторая вкладка). ---------- */
  const PK = { tab: 'pick', wait: null, no: new Set(), ladder: false };   // ladder - «Все кирки» раскрыт (29.10: окно перерисовывается опросом - не сворачивать)   // no - скидки, которые игрок не хочет отдавать (снял галочку)
  /** Цена со скидкой - как minecore.pickPay (игра считает так же). */
  function pickPay(s, opt, have, use) {
    const out = { ...(s || {}) }, used = {};
    for (const [r, a] of Object.entries(opt || {})) { if (!use.includes(r)) continue; const t = a[0], k = +a[1] || 1, need = out[t] || 0, u = Math.min(Math.max(0, Math.floor(+have[r] || 0)), Math.ceil(need / k)); if (!(u > 0)) continue; out[t] = Math.max(0, need - u * k); if (!out[t]) delete out[t]; out[r] = (out[r] || 0) + u; used[r] = u; }
    return { s: out, used };
  }
  const pkT = (x) => (x && Array.isArray(x.t) ? x.t : []);
  const pkName = (k) => { const t = pkT(S && S.me && S.me.pkx)[k]; return t ? t[0] : (window.LGMineArt && window.LGMineArt.PICK_NAMES || [])[k] || 'Кирка'; };
  const pkMul = (x, k) => { const t = pkT(x)[k]; return t ? +t[1] : 1; };
  // 26.10 (art/mine-gear): значки - LGPickArt (pick-art.js); не загрузился - прежние временные из mine-art.js / эмодзи
  const pkIcon = (k, z) => (window.LGPickArt && window.LGPickArt.icon ? window.LGPickArt.icon(k, z) : window.LGMineArt && window.LGMineArt.pickIcon ? window.LGMineArt.pickIcon(k, z) : '');
  const bagIcon = (z) => (window.LGPickArt && window.LGPickArt.oreBag ? window.LGPickArt.oreBag(z) : '🎒');
  const pct = (m) => `+${Math.round((m - 1) * 100)}%`;
  /** Сколько руды в сумках героя (обычной и рудной): { ресурс: осколков }. */
  const oreHave = () => { const o = {}; for (const it of oreItems()) o[it.res] = (o[it.res] || 0) + (+it.q || 0); return o; };
  const pcs = (q) => { const v = Math.floor(q) / 100; return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, '')).replace('.', ','); };
  function supHtml(st, have) {
    const x = (S.me && S.me.pkx) || null, mx = (S.me && S.me.mx) || { lv: 1 }, h = (X.hero && X.hero()) || {}, money = Math.max(0, Math.floor(+h.money || 0));
    const tab = ['pick', 'bag', 'lamp'].includes(PK.tab) ? PK.tab : 'pick', T = pkT(x), lv = x ? x.lv : 0, nx = lv + 1 < T.length ? lv + 1 : -1;
    const tabs = `<div class="sp-tabs" role="tablist" aria-label="Товары Снабженца">${[['pick', 'Кирка'], ['bag', 'Рудная сумка'], ['lamp', 'Каска']].map(([k, t]) => `<button type="button" role="tab" class="sp-tab" data-sp-tab="${k}" aria-selected="${tab === k}">${t}</button>`).join('')}</div>`;
    const row = (ic, name, hv, need, ok, hint) => `<li class="sp-req${ok ? ' ok' : ' no'}"><span class="sp-ri">${ic}</span><span class="sp-rn">${name}${hint ? `<small>${hint}</small>` : ''}</span><b class="sp-rv"><span>есть ${hv}</span> / нужно ${need}</b></li>`;
    let body = '';
    if (tab === 'pick') {
      if (!x) body = '<p class="muted">Снабженец раскладывает товар - загляни через пару секунд.</p>';
      else {
        const cur = T[lv] || ['Кирка', 1];
        body = `<div class="sp-now"><span class="sp-pic">${pkIcon(lv, 64)}</span><div><div class="m2-k">Твоя кирка</div><p class="sp-nm">${esc(cur[0])}</p><p class="muted">Сила удара ×${val(+cur[1])}${lv ? ` (${pct(+cur[1])})` : ''} · навсегда, только твоя</p></div></div>`;
        if (nx < 0) body += '<p class="sp-max">Лучше кирки не бывает - у тебя адамантитовая.</p>';
        else {
          const N = T[nx], hv = oreHave(), wait = !!PK.wait, reqs = [];
          let ok = true;
          const mOk = (mx.lv || 1) >= N[2]; ok = ok && mOk;
          reqs.push(row('<span class="sp-ix">⛏</span>', 'Горное дело', `ур. ${mx.lv || 1}`, `ур. ${N[2]}`, mOk, ''));
          const cOk = money >= N[3]; ok = ok && cOk;
          if (N[3] > 0) reqs.push(row('<span class="sp-ix">●</span>', 'Монеты', X.money ? X.money(money) : money, X.money ? X.money(N[3]) : N[3], cOk, ''));
          // 26.10 (решение стримера): скидки - медь вместо части железа, кристаллы вместо части золота; есть в сумке - отдаём, если игрок не снял галочку
          const opt = N[5] || {}, can = Object.keys(opt).filter((r) => (hv[r] || 0) > 0), use = can.filter((r) => !PK.no.has(r)), pay = pickPay(N[4] || {}, opt, hv, use);
          const oreIc = (r) => (X.art ? X.art({ id: 'ore_' + r, res: r, qty: 100, q: 100, name: resName(r), slot: 'material', mat: 'ore' }) : '');
          const Up = (r) => esc(resName(r)[0].toUpperCase() + resName(r).slice(1));
          for (const [r, need] of Object.entries(pay.s)) {
            const got = hv[r] || 0, o2 = got >= need, base = (N[4] || {})[r] || 0; ok = ok && o2;
            reqs.push(row(oreIc(r), Up(r), pcs(Math.min(got, 1e9)), pcs(need), o2, pay.used[r] ? 'скидка' : base > need ? `дешевле: без скидки ${pcs(base)}` : ''));
          }
          var cheap = can.length ? `<div class="sp-cheap"><div class="m2-k">Можно дешевле</div>${can.map((r) => `<label class="sp-opt"><input type="checkbox" data-sp-use="${esc(r)}"${use.includes(r) ? ' checked' : ''}${wait ? ' disabled' : ''}><span class="sp-ri">${oreIc(r)}</span><span>${Up(r)}: 1 шт. вместо ${val(+opt[r][1])} шт. - ${esc(RESG[opt[r][0]] || resName(opt[r][0]))} <small>есть ${pcs(hv[r])}</small></span></label>`).join('')}</div>` : '';
          body += `<section class="m2-card sp-next"><div class="m2-k">Следующая</div><div class="sp-up"><span class="sp-pic">${pkIcon(nx, 52)}</span><div><p class="sp-nm">${esc(N[0])}</p><p class="sp-gain">${pct(+N[1])} к силе удара <small>сейчас ${lv ? pct(+cur[1]) : '+0%'}</small></p></div></div>
            <ul class="sp-reqs">${reqs.join('')}</ul>${cheap}
            <p class="muted sp-note">Руда - из сумки героя (и рудной сумки), 100 осколков = 1 шт. Камни копаются быстрее, оплата за время работы не меняется.</p>
            <div class="mn-btns"><button type="button" class="btn primary" data-sp-pick="${nx}"${!ok || wait ? ' disabled' : ''}>${wait ? 'Снабженец работает…' : 'Улучшить'}</button></div></section>`;
        }
        body += `<details class="sp-ladder"${PK.ladder ? ' open' : ''}><summary>Все кирки</summary><ol>${T.map((t, k) => `<li class="${k <= lv ? 'got' : ''}${k === nx ? ' nx' : ''}"><span class="sp-pic">${pkIcon(k, 28)}</span><span>${esc(t[0])}</span><b>×${val(+t[1])}</b><small>${k ? `мастерство ${t[2]}` : 'у всех'}</small></li>`).join('')}</ol></details>`;
      }
    } else if (tab === 'bag') {
      const ob = x && x.ob;
      if (ob) body = `<div class="sp-now"><span class="sp-pic sp-bagi">${bagIcon(56)}</span><div><div class="m2-k">Рудная сумка у тебя</div><p class="sp-nm">${ob.used} / ${ob.cap} ячеек</p><p class="muted">Новая руда кладётся в неё и не занимает места в сумке героя. Полна - руда идёт в обычную сумку, потом на склад. Перекладывать - на «Складе» в «Городе».</p></div></div>`;
      else if (x) {
        const wait = !!PK.wait, mOk = (mx.lv || 1) >= x.obL, cOk = money >= x.obP;
        body = `<section class="m2-card sp-next"><div class="sp-up"><span class="sp-pic sp-bagi">${bagIcon(56)}</span><div><p class="sp-nm">Рудная сумка</p><p class="sp-gain">${x.obC} ячеек для руды <small>одна кучка на вид = одна ячейка</small></p></div></div>
          <p class="muted">Навсегда и только твоя: руда из шахты кладётся в неё и не занимает места в сумке героя. Скупщик и кирка берут руду и отсюда.</p>
          <ul class="sp-reqs">${row('<span class="sp-ix">⛏</span>', 'Горное дело', `ур. ${mx.lv || 1}`, `ур. ${x.obL}`, mOk, '')}${x.obP > 0 ? row('<span class="sp-ix">●</span>', 'Монеты', X.money ? X.money(money) : money, X.money ? X.money(x.obP) : x.obP, cOk, '') : ''}</ul>
          <div class="mn-btns"><button type="button" class="btn primary" data-sp-bag${!mOk || !cOk || wait ? ' disabled' : ''}>${wait ? 'Снабженец работает…' : 'Купить'}</button></div></section>`;
      }
    } else {
      body = lampOn() ? '<p>«Каска шахтёра» на тебе — фонарь светит на любом этаже.</p>' : !have && S.lampBought && Date.now() - S.lampBought < 60000 ? '<p>Каска куплена — несу в сумку, через пару секунд появится.</p>' : have ? `<p>«Каска шахтёра» у тебя в сумке — надень её, и фонарь загорится.</p><div class="mn-btns"><button type="button" class="btn primary" data-mn-wear="${esc(have.uid)}">Надеть каску</button></div>` : `<p>С ${st.darkFrom || 5}-го этажа без света ничего не видно и копать нельзя. «Каска шахтёра» — обычная вещь в сумку: надел — светит; можно снять и убрать на склад.</p><div class="mn-btns"><button type="button" class="btn primary" data-mn-lamp>Купить каску — ${X.money ? X.money(st.lampPrice || 150) : st.lampPrice}</button></div>`;
    }
    return `<section class="m2-card mb-head sp-head"><div class="mb-who"><h3 class="h3">${esc(SUP)}</h3><p class="muted sp-sub">${esc(SUP_SUB)}</p><p class="mb-say">«${esc(PK.say && Date.now() - PK.say.at < 60000 ? PK.say.t : 'Снаряжение для шахты: кирки, рудные сумки, каски. Хорошая кирка - полдела.')}»</p></div>${tabs}</section>
      <section class="m2-card sp-body" role="tabpanel">${body}</section>
      <section class="mb-foot"><div class="mn-btns"><button type="button" class="btn ghost" data-mn-back>Назад</button></div></section>`;
  }
  function supBind(el) {
    const ld = el.querySelector('details.sp-ladder'); if (ld) ld.ontoggle = () => { PK.ladder = ld.open; };   // 29.10: как журнал шахты (S.logOpen)
    el.querySelectorAll('[data-sp-tab]').forEach((b) => b.onclick = () => { PK.tab = b.dataset.spTab; S.bodyHtml = ''; panel(); const t = S.el.querySelector(`[data-sp-tab="${PK.tab}"]`); if (t) t.focus(); });
    el.querySelectorAll('[data-sp-use]').forEach((b) => b.onchange = () => { if (b.checked) PK.no.delete(b.dataset.spUse); else PK.no.add(b.dataset.spUse); S.bodyHtml = ''; panel(); });
    const bp = el.querySelector('[data-sp-pick]'); if (bp) bp.onclick = () => supGo('/api/minePick', { c: C, to: +bp.dataset.spPick, use: [...el.querySelectorAll('[data-sp-use]:checked')].map((b) => b.dataset.spUse) });
    const bb = el.querySelector('[data-sp-bag]'); if (bb) bb.onclick = () => supGo('/api/mineOreBag', { c: C });
  }
  async function supGo(url, body) {
    if (PK.wait || S.busyOp) return;
    PK.wait = { at: Date.now() }; S.bodyHtml = ''; panel();
    const r = await X.api(url, body);
    if (!S) return;
    if (!r || !r.ok) { PK.wait = null; tip((r && r.error) || 'Не получилось'); S.bodyHtml = ''; panel(); return; }
    if (PK.wait) PK.wait.id = r.id;   // 26.10: итог мог прийти событием раньше ответа API (PK.wait уже снят)
    setTimeout(() => { if (S && PK.wait && PK.wait.id === r.id) { PK.wait = null; S.bodyHtml = ''; panel(); } }, 25000);
  }
  function supResult(x, r) {
    if (PK.wait && (!PK.wait.id || PK.wait.id === x.id)) PK.wait = null;
    if (x.ok) {
      if (r.op === 'minePick') { if (S && S.me && S.me.pkx) S.me.pkx = { ...S.me.pkx, lv: r.to }; PK.say = { t: `Держи - ${pkName(r.to).toLowerCase()} кирка. Бей смело!`, at: Date.now() }; tip(`Кирка улучшена: ${pkName(r.to)}`); if (S) heroes(); }
      else { if (S && S.me && S.me.pkx && !S.me.pkx.ob) S.me.pkx = { ...S.me.pkx, ob: { cap: S.me.pkx.obC || 10, used: 0 } }; PK.say = { t: 'Рудная сумка твоя - руда теперь ляжет в неё.', at: Date.now() }; tip('Рудная сумка куплена'); }
    } else if (S) tip(x.error || 'Снабженец отказал');
    if (S) { S.bodyHtml = ''; panel(); }
  }
  /* ---------- 23.10: сумка в шахте — надеть / снять вещи (например, «Каску шахтёра») ---------- */
  const SLOT_RU = { weapon: 'оружие', shield: 'щит', armor: 'доспех', helmet: 'шлем', trinket: 'амулет' };
  function bagPanel() {
    const items = heroItems(), on = items.filter((it) => it.on), bag = items.filter((it) => !it.on && it.wearable);
    const row = (it, worn) => `<li class="${it.id === LAMP_ID ? 'lamp' : ''}"><span>${esc(it.name)}<small>${esc(SLOT_RU[it.slot] || '')}</small></span>${worn ? `<button type="button" class="btn ghost sm" data-mn-off="${esc(it.slot)}">Снять</button>` : `<button type="button" class="btn primary sm" data-mn-wear="${esc(it.uid)}">Надеть</button>`}</li>`;
    return `<div class="mn-npc-p mn-inv"><h3 class="h3">Сумка</h3><h4>Надето</h4><ul>${on.map((it) => row(it, true)).join('') || '<li class="muted">Ничего</li>'}</ul><h4>В сумке</h4><ul>${bag.map((it) => row(it, false)).join('') || '<li class="muted">Нечего надеть</li>'}</ul>
      <p class="muted">Еда, зелья и склад — во вкладке «Персонаж» и в «Городе».</p><div class="mn-btns"><button type="button" class="btn ghost" data-mn-back>Назад</button></div></div>`;
  }
  async function wear(b, uid) { if (b) b.disabled = true; const r = X.equip ? await X.equip(uid) : await X.api('/api/equip', { uid }); if (!S) return; if (!r || !r.ok) { if (b) b.disabled = false; tip((r && r.error) || 'Не получилось'); return; } tip('Надето'); draw(); panel(); bagDraw(); }
  async function takeOff(b, slot) { if (b) b.disabled = true; const r = X.unequip ? await X.unequip(slot) : await X.api('/api/unequip', { slot }); if (!S) return; if (!r || !r.ok) { if (b) b.disabled = false; tip((r && r.error) || 'Не получилось'); return; } tip('Снято'); draw(); panel(); bagDraw(); }
  async function sell(e) {
    const b = e.currentTarget; b.disabled = true;
    const r = await X.api('/api/mineSell', { c: C });
    if (!S) return;
    if (!r || !r.ok) { b.disabled = false; tip((r && r.error) || 'Не получилось'); return; }
    tip(`${tx().sold} — монеты придут через пару секунд`);
    if (S.me) S.me = { ...S.me, bag: { c: 0, r: {}, p: {} } };
    panel();
  }

  /* ---------- камера: этаж по ширине, ~7 рядов по высоте; листать вверх-вниз ---------- */
  // масштаб сцены по множителю «−» / «+» / колеса (zk): старая шахта - этаж по ширине, ~9 рядов; большая - ~15 клеток по ширине (телефон - 7), не дальше, чем этаж заполняет экран
  function zFor(zk) {
    const W = S.Wd, { w: vw, h: vh } = vSize();
    if (W.v3) {
      // 30.10: не отдаляем дальше, чем этаж заполняет экран (иначе по краям - пустой фон); внешняя половина поля вокруг этажа в кадр не попадает
      const phone = vw < 720, z0 = phone ? vw / (7.2 * W.CW) : Math.min(1, vw / (15 * W.CW), vh / (6.5 * W.RH));
      const mg = m3Margin(), zmin = Math.min(1.6, Math.max(0.2, vw / Math.max(1, W.W - 2 * mg), (vh - padB()) / Math.max(1, W.H - 2 * mg)));
      return Math.max(zmin, Math.min(1.6, z0 * zk));
    }
    // узкий экран: по ширине — сам этаж (стенки шахты за краем)
    const gridW = W.CW * GW + 24;
    // 25.10: «вид сильно приближен» — на ПК видно ~9 рядов и не крупнее 1:1 (было ~7 рядов и до 1,6); «−» / «+» — свой масштаб
    const z0 = Math.min(1, vw < W.W ? vw / gridW : vw / W.W, vh / (W.RH * 9));
    return Math.max(0.25, Math.min(1.6, z0 * zk));
  }
  function fit(reset) {
    if (!S || !S.Wd) return;
    vSize(true);
    if (S.Wd.v3) return fit3(reset);
    const W = S.Wd, vw = S.view.clientWidth, vh = S.view.clientHeight;
    // 25.10: «вид сильно приближен» — на ПК видно ~9 рядов и не крупнее 1:1 (было ~7 рядов и до 1,6); «−» / «+» — свой масштаб
    S.z = zFor(S.zk || 1);
    S.tx = (vw - W.W * S.z) / 2;
    if (reset === true) S.ty = vh - W.H * S.z - padB();   // начинаем у входа (внизу; на телефоне — над свёрнутой панелью)
    clampY(); apply();
    S.el.style.setProperty('--mnb-ts', (200 * S.z).toFixed(1) + 'px');   // 25.10: плитка породы за краем фона - в масштабе сцены (mine-biome.js)
    chatFit();
  }
  /* 25.10 (mine2, просьба стримера): чат шахты не закрывает подъёмник «В город» и другие предметы.
     ПК: слева от шахты хватает места - чат стоит там (ширина - по свободному месту, не заходит на шахту). Места нет (узкий экран,
     телефон) - нижняя полоса: сцена (.mn-view) кончается над чатом / строкой кнопок, под ними ничего из шахты нет; камера, если
     смотрела на вход, остаётся на входе. Свернуть - «×» в чате: язычок «Чат» с числом непрочитанных у левого края (на телефоне - в
     строке кнопок, «−/+» - справа). Открыт / свёрнут - запоминается у зрителя (localStorage lgMineChat, packages/site-ui/chat.js).
     Пересчёт - по событиям (размер окна, камера, открыть / свернуть, панель, сумка), без кадров.
     30.10 (стример): на ПК полосы больше нет - открытый чат всегда окно поверх сцены (слева от зала, если там есть место, иначе слева
     внизу), его тянут за края и переставляют за заголовок; полоса и «слева от зала» с подгонкой ширины - только на телефоне */
  const shown = (e) => !!e && !e.hidden && e.getClientRects().length > 0;
  // 30.10: правой панели нет - у правой стены зала ничего не ставим (было data-dock); остаётся низ шапки: до него сцену можно опустить,
  // чтобы верх зала был виден (S.topPad), и облачка не заходят под шапку
  function dockFit() {
    if (!S || !S.Wd || !S.view) return;
    if (S.el.dataset.m2 === '1') { const t0 = S.view.getBoundingClientRect().top; let b = 0; for (const e of S.el.querySelectorAll('.mn-ttl, .mn-tb')) { const r = e.getBoundingClientRect(); if (r.height) b = Math.max(b, r.bottom - t0); } S.topPad = Math.round(b + 6); } else S.topPad = 0;
  }
  function chatFit() {
    if (!S || !S.view || !S.Wd || S.inFit) return;
    S.inFit = 1; try { chatFit0(); } finally { if (S) S.inFit = 0; }
  }
  // где место у чата решаем по масштабу сцены БЕЗ нижней полосы: иначе полоса меняет высоту → масштаб → ширину зала → решение
  // (в альбомном телефоне это качалось по кругу)
  function txFull() {
    const W = S.Wd, vw = S.view.clientWidth, vh = S.view.clientHeight + (S.res || 0), gridW = W.CW * GW + 24;
    const z = Math.max(0.25, Math.min(1.6, Math.min(1, vw < W.W ? vw / gridW : vw / W.W, vh / (W.RH * 9)) * (S.zk || 1)));
    return (vw - W.W * z) / 2;
  }
  // 30.10 (просьба стримера): ПК (мышь, окно шире 720 px) - открытый чат всегда окно поверх сцены (data-chat="free"), сцену не укорачивает
  // и полосой во всю ширину не встаёт; размер - тянуть за края (packages/site-ui/chat.js), место - перетащить за заголовок (chatDrag).
  // Телефон (≤ 720 px или касание без мыши) - как было: нижняя полоса (band) или слева от зала (side)
  const pcChat = () => !window.LGSiteUi.is('phone') && !(window.LGSiteUi.is('nohover') && window.LGSiteUi.is('touch'));
  const chatSize = () => { const c = one() ? window.LGChatOne : CHM; if (c && c.size) c.size(); };
  function chatFit0() {
    dockFit();
    const box = S.el.querySelector('.cy-chat'), m2 = S.el.dataset.m2 === '1', phone = window.LGSiteUi.is('phone'), pc = pcChat();
    // телефон: сумка закрывает экран (и прячет чат) - полосу не трогаем, иначе сцена прыгает дважды
    if (phone && S.el.dataset.chat && S.el.classList.contains('bag-on')) return;
    let dock = '', room = false;
    if (m2 && shown(box)) {
      const free = Math.floor(txFull() - 24);   // слева от шахты (вид начинается у левого края)
      if (pc) {
        // слева от зала есть место - по умолчанию чат там (не на предметах входа), иначе - слева внизу поверх сцены
        room = free >= 280;
        dock = box.classList.contains('open') ? 'free' : 'tab';
        if (room) box.style.setProperty('--mn-chw', Math.min(360, free) + 'px'); else box.style.removeProperty('--mn-chw');
        S.chatDx = room ? Math.max(12, Math.round(S.tx - 16 - Math.min(360, free))) : 12;
      } else if (!phone && S.chatPos && box.classList.contains('open')) {
        // 26.10: перетащен зрителем - стоит, где поставили
        dock = 'free';
      } else if (free >= 240) {
        // вплотную к левой стене зала
        const w = Math.min(360, free); dock = 'side'; box.style.setProperty('--mn-chw', w + 'px'); box.style.setProperty('--mn-chx', Math.max(12, Math.round(S.tx - 16 - w)) + 'px');
      } else { dock = 'band'; box.style.removeProperty('--mn-chw'); box.style.removeProperty('--mn-chx'); }
    }
    if (S.el.dataset.chat !== dock) S.el.dataset.chat = dock;
    // шапка шахты сверху - выше неё чат не растягивается (chat.js: data-chat-top)
    const tp = String(S.topPad || 0); if (S.el.dataset.chatTop !== tp) S.el.dataset.chatTop = tp;
    let res = 0, padC = 0, padA = 0;
    if (dock === 'free') {
      chatSize();
      const p = chatPlace(box);
      // чат поверх зала: камеру можно поднять, чтобы низ этажа (вход, подъёмник) вышел из-под чата; сама камера не прыгает
      const w = box.offsetWidth, h = box.offsetHeight;
      if (p.x < S.tx + S.Wd.W * S.z && p.x + w > S.tx) padA = Math.max(0, Math.round(p.b + h + 6));
    } else chatSize();
    if (dock === 'band' || (dock === 'tab' && !room)) {
      const top0 = S.el.getBoundingClientRect().top, h = S.el.clientHeight; let top = h;
      for (const e of [box, S.el.querySelector('.mn-zoom')]) if (shown(e)) top = Math.min(top, e.getBoundingClientRect().top - top0);
      res = Math.max(0, Math.round(h - top + 6));
      // 30.10 (репорт #2140): свёрнутый чат - только язычок и «−/+»: сцену не укорачиваем (была тёмная полоса во всю ширину под шахтой),
      // кнопки лежат поверх сцены, а камера у нижнего края может поднять вход над ними (padB)
      if (!box.classList.contains('open')) { padC = res; res = 0; }
      // 30.10 (стример: «чат на телефоне занимает полэкрана»): открытый чат на телефоне - компактное окно поверх сцены (city.css, ≤ 30%
      // высоты), сцену не укорачивает. Низ этажа (подъёмник, Фонарщик, лавка) - над окном: запас снизу как у свёрнутого (padC), камера
      // у входа остаётся у входа, а этаж не опускается под чат (предметы шахты 2 и 3 им не закрыты)
      else if (phone) { res = 0; padC = Math.round(64 + box.offsetHeight + 6); }
    }
    // телефон, чат открыт: плашки шахты («Выбери камень» и др.) встают над окном чата (--mn-chb - его верхний край от низа шахты), свёрнут - как раньше
    {
      const up = phone && m2 && shown(box) && box.classList.contains('open') ? Math.round(64 + box.offsetHeight + 8) + 'px' : '';
      if ((S.el.style.getPropertyValue('--mn-chb') || '') !== up) { if (up) S.el.style.setProperty('--mn-chb', up); else S.el.style.removeProperty('--mn-chb'); }
    }
    if (res === (S.res || 0) && padC === (S.padC || 0) && padA === (S.padA || 0)) return;
    // камера у входа - и останется у входа (запас под чатом, padA, камеру не двигает)
    const atB = (res !== (S.res || 0) || padC !== (S.padC || 0)) && S.ty <= S.view.clientHeight - S.Wd.H * S.z - padB() + 2;
    S.res = res; S.padC = padC; S.padA = padA; S.view.style.bottom = res ? res + 'px' : '';
    fit(atB ? true : undefined);
  }
  function chatWatch() {
    if (!S || S.chatMo || !window.MutationObserver) return;
    const mo = new MutationObserver(() => { clearTimeout(S.chatFitT); S.chatFitT = setTimeout(chatFit, 30); });   // 25.10: своё имя - S.chatT у sitechat.js (дописать ленту), общий таймер останавливал чат шахты
    const box = S.el.querySelector('.cy-chat');
    if (box) mo.observe(box, { attributes: true, attributeFilter: ['class', 'hidden'] });
    mo.observe(S.el, { attributes: true, attributeFilter: ['class', 'data-m2'] });
    S.chatMo = mo;
  }
  /* 26.10 (mine2, просьба игрока, одобрил стример): на ПК чат шахты можно взять за заголовок («ЧАТ ШАХТЫ») и поставить в любое место
     экрана - режим data-chat="free": chatFit его не двигает и сцену не укорачивает. Позиция помнится у зрителя (localStorage
     lgMineChatPos: x - от левого края, b - от нижнего края шахты: окно растёт вверх, когда тянут верхний край); окно стало меньше -
     чат прижимается в видимую область (сохранённое место не меняется: окно снова больше - чат там, где был). 30.10: двойной клик по
     заголовку - место и размер по умолчанию (кнопки «⤢» больше нет: на ПК чат всегда окно поверх сцены, «на место» - не нужно).
     Кнопки заголовка и поле ввода не тащат. Телефон (≤ 720 px) и нижняя полоса (band) - не перетаскивается. Только события указателя. */
  const CHAT_POS = 'lgMineChatPos';
  function chatPosLoad() {
    try {
      const p = JSON.parse(localStorage.getItem(CHAT_POS) || 'null');
      if (p && Number.isFinite(p.x) && Number.isFinite(p.b)) return { x: +p.x, b: +p.b };
      // до 30.10 - от верхнего края (y): пересчитаем в b при первой расстановке (chatPlace)
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return { x: +p.x, y: +p.y };
    } catch (e) {
      // в хранилище чужое или оно закрыто - место по умолчанию
      return null;
    }
    return null;
  }
  function chatPosSave() {
    try { if (S.chatPos) localStorage.setItem(CHAT_POS, JSON.stringify(S.chatPos)); else localStorage.removeItem(CHAT_POS); } catch (e) {
      // приватный режим - место живёт до закрытия шахты
      S.chatPos = S.chatPos || null;
    }
  }
  // поставить чат (data-chat="free"): x, b (от нижнего края) - куда; не задано - сохранённое место или по умолчанию (слева внизу; есть
  // место слева от зала - вплотную к его левой стене); целиком в видимой области шахты. Вернёт { x, b } - где встал
  function chatPlace(box, x, b) {
    const W = S.el.clientWidth, H = S.el.clientHeight, w = box.offsetWidth || 0, h = box.offsetHeight || 0, p = S.chatPos;
    if (p && p.b == null && Number.isFinite(p.y)) { p.b = Math.max(0, Math.round(H - p.y - h)); delete p.y; chatPosSave(); }
    // по умолчанию левый край - у левой стены зала по ширине по умолчанию (S.chatDx): потянули правый край - левый не едет
    const dx = S.chatDx || 12, dB = 64;
    // на месте по умолчанию чат не заходит на шапку шахты (S.topPad), даже когда его вытянули вверх; поставленный зрителем - где поставили
    const bMax = H - h - (b == null && !p ? Math.min(S.topPad || 0, Math.max(0, H - h)) : 0);
    const cx = Math.round(Math.max(0, Math.min(W - w, x != null ? x : p ? p.x : dx))), cb = Math.round(Math.max(0, Math.min(bMax, b != null ? b : p ? p.b : dB)));
    box.style.setProperty('--mn-cfx', cx + 'px'); box.style.setProperty('--mn-cfb', cb + 'px');
    return { x: cx, b: cb };
  }
  function chatHome() {
    if (!S) return;
    S.chatPos = null; chatPosSave();
    const box = S.el.querySelector('.cy-chat'); if (box) for (const k of ['--mn-cfx', '--mn-cfb']) box.style.removeProperty(k);
    chatFit();
  }
  function chatDrag() {
    const box = S.el.querySelector('.cy-chat'), hd = box && box.querySelector('.cy-chat-h');
    if (!hd) return;
    S.chatPos = chatPosLoad();
    // 30.10: окно единого чата живёт дольше шахты и одно на страницу - слушатели вешаются один раз, шахта берётся текущая (S)
    if (hd.dataset.mnDrag) return;
    hd.dataset.mnDrag = '1';
    const can = () => !!S && S.el.contains(box) && S.el.dataset.m2 === '1' && !window.LGSiteUi.is('phone') && (S.el.dataset.chat === 'side' || S.el.dataset.chat === 'free');
    const noDrag = (t) => !!(t && t.closest && t.closest('button, input, a, select, textarea'));
    let d = null;
    hd.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || noDrag(e.target) || !can()) return;
      const r = box.getBoundingClientRect(), o = S.el.getBoundingClientRect();
      d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: r.left - o.left, b: o.bottom - r.bottom, moved: false };
      try { hd.setPointerCapture(e.pointerId); } catch (x) {
        // без захвата перетаскивание идёт, пока указатель над заголовком
        d.nc = 1;
      }
      e.preventDefault();   // без выделения текста
    });
    hd.addEventListener('pointermove', (e) => {
      if (!d || e.pointerId !== d.id || !S) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 4) return;
        d.moved = true;
        S.chatPos = { x: d.x, b: d.b }; box.classList.add('mn-chat-drag'); chatFit();
      }
      const p = chatPlace(box, d.x + dx, d.b - dy); S.chatPos.x = p.x; S.chatPos.b = p.b;
    });
    const up = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const was = d.moved; d = null; box.classList.remove('mn-chat-drag');
      try { if (hd.hasPointerCapture && hd.hasPointerCapture(e.pointerId)) hd.releasePointerCapture(e.pointerId); } catch (x) { console.error('[шахта] чат', x); }
      if (was && S) { chatPosSave(); chatFit(); }
    };
    hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
    // двойной клик по заголовку - место по умолчанию (размер по умолчанию - chat.js)
    hd.addEventListener('dblclick', (e) => { if (noDrag(e.target) || !S || !pcChat()) return; chatHome(); });
  }
  // 30.10: тянут край чата (chat.js, событие «cy-chat-size») - чат остаётся в видимой области; отпустили - пересчёт запаса под чатом (padA)
  function chatSized(e) {
    if (!S || S.el.dataset.chat !== 'free') return;
    const box = S.el.querySelector('.cy-chat'); if (!box) return;
    if (e && e.detail && e.detail.end) chatFit(); else chatPlace(box);
  }
  // 25.10: на телефоне снизу — свёрнутая панель: вход (Скупщик, подъёмник) можно поднять над ней, а не прятать под ней
  // 30.10: правой (на телефоне - нижней) панели больше нет - снизу сцену ничто не закрывает, кроме полосы чата (S.res)
  // 30.10 (репорт #2140): свёрнутый чат лежит поверх сцены - нижний край этажа можно поднять над язычком и «−/+» (S.padC, chatFit0)
  const padB = () => (S && S.padC) || 0;
  // 26.10 (mine2): верх зала (клеть «ЭТАЖ N ↓») можно опустить под шапку - шапка его не закрывает (S.topPad - низ шапки, dockFit)
  // 30.10: открытый чат поверх зала (ПК) - низ этажа можно поднять над ним (S.padA), но сама камера к этому не прыгает
  const padX = () => Math.max(padB(), (S && S.padA) || 0);
  function clampY() { if (S.Wd && S.Wd.v3) return clamp3(); const vh = S.view.clientHeight, H = S.Wd.H * S.z; S.ty = Math.min(S.topPad || 0, Math.max(vh - H - padX(), S.ty)); }
  /* 29.10 (Шахта 3.0): камера во все стороны. Масштаб: телефон - ~7 клеток по ширине, ПК - до 15 клеток и не крупнее 1:1 («−» / «+» - свой).
     Начало - на своём герое (зал лифта). Края - не дальше края пещеры (за ней - сплошная порода). */
  function fit3(reset) {
    const { w: vw, h: vh } = vSize(true);
    S.z = zFor(S.zk || 1);
    if (reset === true || S.tx == null) { const p = S.pos || spawnPt(); S.tx = vw / 2 - p.x * S.z; S.ty = (vh - padB()) / 2 - (p.y - 60) * S.z; }
    clamp3(); apply();
    chatFit();
  }
  const m3Margin = () => { const G3 = S.Wd && S.Wd.G; return G3 ? G3.PAD * G3.CW * 0.5 : 0; };
  function clamp3() {
    const W = S.Wd, v = vSize(), vw = v.w, vh = v.h - padB(), mg = m3Margin() * S.z, w = W.W * S.z, h = W.H * S.z, pa = Math.max(0, ((S && S.padA) || 0) - padB());
    S.tx = w - 2 * mg <= vw ? (vw - w) / 2 : Math.min(-mg, Math.max(vw - w + mg, S.tx));
    S.ty = h - 2 * mg <= vh ? (vh - h) / 2 : Math.min(-mg, Math.max(vh - h + mg - pa, S.ty));
  }
  // смена камеры на большом этаже: дорисовать куски, вошедшие в кадр (раз за кадр браузера)
  // 30.10: куски и полоски - только когда сменился набор кусков в кадре (раньше - каждый кадр: ключи кусков и полосок); копающие вне кадра - скрыть
  function camMoved() {
    if (!S || S.camRaf) return;
    S.camRaf = requestAnimationFrame(() => {
      if (!S) return; S.camRaf = 0; vSize();
      let re = false;
      if (V3() && S.m3) { const vk = S.m3.viewKey(); if (vk !== S.camVK) { S.camVK = vk; S.m3.ensure(); if (S.st && S.F) { bars(); re = true; } } }
      if ((cullHeroes() || re) && art2On() && window.LGMineArt && window.LGMineArt.digSync) window.LGMineArt.digSync(S.heroes, S.bars);
    });
  }
  function apply() { S.world.style.transform = `translate(${S.tx.toFixed(1)}px, ${S.ty.toFixed(1)}px) scale(${S.z})`; if (S.lm) liftPlace(); if (S.nowA) nowPlace(); if (S.npcOpen) winPlace(); camMoved(); }
  const WHEEL_OWN = '.mn-win, .mn-wg, .cy-chat, .mn-lm, input, textarea, select, [data-wheel]';
  // зум колесом: S.zk (пределы 0,6…1,8 - как у кнопок), точка мира под курсором остаётся на месте; дорогое (чат, плитка фона) - после паузы
  function zoomWheel(k, mx, my) {
    if (!S || !S.Wd) return;
    // сцену перестроили, а масштаб ещё старый - сперва привести к «−» / «+», потом зумить
    if (Math.abs(S.z - zFor(S.zk || 1)) > 1e-3) fit();
    const z0 = S.z, zk0 = S.zk || 1, zk1 = Math.max(0.6, Math.min(1.8, zk0 * k)), z1 = zFor(zk1);
    // упёрлись в предел масштаба - множитель не копим
    if (Math.abs(z1 - z0) < 1e-4) return;
    const wx = (mx - S.tx) / z0, wy = (my - S.ty) / z0;
    S.zk = zk1; S.z = z1;
    S.tx = mx - wx * z1; S.ty = my - wy * z1;
    if (!S.Wd.v3) S.tx = (S.view.clientWidth - S.Wd.W * S.z) / 2;
    clampY();
    if (!S.lm) { S.world.classList.add('zm'); clearTimeout(S.zmT); S.zmT = setTimeout(() => { if (S && S.world) S.world.classList.remove('zm'); }, 180); }
    apply();
    clearTimeout(S.zfT); S.zfT = setTimeout(() => { if (!S) return; S.el.style.setProperty('--mnb-ts', (200 * S.z).toFixed(1) + 'px'); dockFit(); chatFit(); }, 160);
  }
  function bindCamera() {
    const v = S.view; let drag = null;
    /* 30.10 (pinchZoomPublic, тестерам): щипок двумя пальцами - масштаб вокруг точки между пальцами, та же точка мира ведёт вид, поэтому
       щипок одновременно сдвигает (как «Город», city.js). Пределы - те же, что у «−» / «+» и колеса (S.zk 0,6…1,8; zFor не отдаляет
       дальше, чем этаж заполняет экран - пустоты за картой нет). Только transform слоя мира: события пальцев лишь запоминают положение,
       слой пишется один раз за кадр (requestAnimationFrame, только пока пальцы двигаются). Поднял палец после щипка - ни хода, ни нажатия по камню */
    const fingers = new Map();
    const pinchOf = () => { const [a, b] = [...fingers.values()], r = v.getBoundingClientRect(); return { d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top }; };
    const pzOn = () => { try { const h = X.hero(); return !!(h && h.pz); } catch (e) { return false; } };
    function pinchFrame() {
      const P = S && S.pinch; if (!P) return;
      S.pinchRaf = 0;
      if (fingers.size !== 2 || !S.Wd) return;
      const q = pinchOf();
      if (Math.abs(S.z - zFor(S.zk || 1)) > 1e-3) fit();
      // старый этаж (до Шахты 3.0) уже по ширине экрана - отдалять щипком ниже этого нельзя (по бокам была бы пустота)
      const z0 = S.z, zk1 = Math.max(S.Wd.v3 ? 0.6 : 1, Math.min(1.8, P.zk0 * q.d / P.d0)), z1 = zFor(zk1);
      const wx = (P.mx - S.tx) / z0, wy = (P.my - S.ty) / z0;
      S.zk = zk1; S.z = z1;
      S.tx = q.mx - wx * z1; S.ty = q.my - wy * z1;
      P.mx = q.mx; P.my = q.my;
      if (!S.Wd.v3) S.tx = (S.view.clientWidth - S.Wd.W * S.z) / 2;
      clampY(); apply();
      clearTimeout(S.zfT); S.zfT = setTimeout(() => { if (!S) return; S.el.style.setProperty('--mnb-ts', (200 * S.z).toFixed(1) + 'px'); dockFit(); chatFit(); }, 160);
    }
    const unfinger = (e) => { if (!fingers.delete(e.pointerId)) return; if (fingers.size < 2 && S && S.pinch) { S.pinch = null; S.pinchEnd = Date.now(); } };
    v.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && pzOn()) {
        fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (fingers.size === 2) { const q = pinchOf(); S.pinch = { d0: q.d, zk0: S.zk || 1, mx: q.mx, my: q.my }; drag = null; return; }
        if (fingers.size > 2) return;
      }
      drag = { x: e.clientX, y: e.clientY, tx: S.tx, ty: S.ty, moved: false, id: e.pointerId, at: Date.now() };
    }, { passive: true });
    // 29.10: большой этаж - перетаскивание во все стороны
    v.addEventListener('pointermove', (e) => {
      if (fingers.has(e.pointerId)) { fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (S.pinch) { if (!S.pinchRaf) S.pinchRaf = requestAnimationFrame(pinchFrame); return; } }
      if (!drag) return; const v3 = !!(S.Wd && S.Wd.v3), dx = v3 ? e.clientX - drag.x : 0, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 6) { drag.moved = true; try { v.setPointerCapture(drag.id); } catch (x) {} } if (drag.moved) { if (v3) S.tx = drag.tx + dx; S.ty = drag.ty + dy; clampY(); apply(); }
    }, { passive: true });
    v.addEventListener('pointerup', (e) => { unfinger(e); const d = drag; drag = null; if (d && !d.moved) click({ target: e.target, clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, long: Date.now() - d.at > 550, tr: e.isTrusted }); });
    v.addEventListener('pointercancel', (e) => { unfinger(e); drag = null; });
    // после щипка настоящий click (кнопки внутри вида) не пропускаем
    v.addEventListener('click', (e) => { if (S && S.pinchEnd && Date.now() - S.pinchEnd < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
    /* 30.10 (просьба стримера, как в «Городе», city.js): колесо мыши - ЗУМ вокруг курсора (пределы и множитель - те же, что у «−» / «+», S.zk);
       Ctrl+колесо и щипок тачпада - тоже зум; Shift+колесо и тачпад вбок - сдвиг вида вбок (большая шахта; в старой этаж по ширине).
       Вверх-вниз - перетаскиванием. Прокручиваемое поверх сцены (чат, панель, окна) колесо забирает себе. Только transform слоя мира. */
    v.addEventListener('wheel', (e) => {
      if (e.target.closest && e.target.closest(WHEEL_OWN)) return;
      e.preventDefault();
      // место вида на странице - одно чтение за кадр (колесо тачпада шлёт событий больше, чем кадров)
      if (!S.vr) { S.vr = v.getBoundingClientRect(); requestAnimationFrame(() => { if (S) S.vr = null; }); }
      const r = S.vr, mx = e.clientX - r.left, my = e.clientY - r.top, px = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1, dy = e.deltaY * px, dx0 = e.deltaX * px;
      if (e.ctrlKey || e.metaKey) { zoomWheel(Math.exp(-Math.max(-60, Math.min(60, dy)) * 0.01), mx, my); return; }
      if (e.shiftKey || Math.abs(dx0) > Math.abs(dy)) { if (S.Wd && S.Wd.v3) { S.tx -= e.shiftKey ? dy || dx0 : dx0; clampY(); apply(); } return; }
      // щелчок колеса (~100) - ×1,2 / ×0,84, как «+» / «−»
      zoomWheel(Math.exp(-Math.max(-120, Math.min(120, dy)) * 0.0018), mx, my);
    }, { passive: false });
    // 27.10 (просьба стримера): ПКМ в шахте - не меню браузера (как в «Городе»); в полях ввода, чате и на ссылках меню остаётся
    S.el.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('input, textarea, select, a, [contenteditable]')) return; e.preventDefault(); });
  }

  /* ---------- 26.10 (mine2, просьба стримера): «Как устроена шахта» - значок «i» в шапке, окно в стиле окон шахты (как «Итоги»:
     закрыть - ×, «Понятно», Esc, клик мимо; на телефоне - на весь экран со скроллом). ВЕСЬ ТЕКСТ - здесь, в HELP: правится в одном
     месте. Числа - как в коде (docs/mine.md): лимит суток и этажи Фонарщика / темноты - из состояния шахты (настройки модуля), награда
     за неделю - weekCoinsAt по умолчанию (products/legion/modules/mine/server.js weekCoins), 100 осколков = 1 шт. (minecore.js).
     Скупщик - отдельным пунктом (окно скупщика переделывается: поправить только его) ---------- */
  // 30.10 (репорт #2173, стример: «обновить и покороче»): по пунктам, коротко; Шахта 3.0 (v.v3) - лифт и буровые вместо «Этажей».
  // Числа - из кода: буровая - площадка на 70% жилы, не больше 2 на этаж, 70% добычи в казну (minecore.js DRILL_MAX, server.js mineDrill),
  // сумма на лифт и таймер растут с глубиной (mineLiftCost / mineLiftHours - настройка, поэтому без цифр), поручения - 3 на день, 2 на неделю (minequest.js)
  const HELP = (v) => ({
    title: 'Как устроена шахта',
    parts: [
      ['Копать', [
        'Нажми на камень с жёлтым кругом - герой докопает его сам, даже если закроешь сайт.',
        'Число на камне - уровень: выше - дольше копать. На одном камне могут работать несколько героев.',
        ...(v.v3 ? ['Этаж большой, дальше - туман: копай проходы, ищи жилы и шахту лифта. Карта этажа - слева сверху.'] : []),
        v.cap > 0 ? `Работать можно до ${v.capT} в сутки на все шахты, новые сутки - в 05:00 МСК.` : 'Время работы за сутки считается от 05:00 МСК.',
      ]],
      ['Руда и скупщик', [
        'Руда делится по вкладу - сколько работы вложил каждый. 100 осколков = 1 штука.',
        v.buyer ? 'Оплата за работу - сразу в кошелёк. Руда - в сумке героя: продай её Скупщику Грому у прилавка (монеты - тебе, руда - в казну Ратуши).'
          : 'За работу у скупщика копятся монеты и руда в рудной сумке. Сдай сумку скупщику: монеты - тебе, руда - в казну Ратуши.',
        'Окаменевший сундук и редкая жила - бонус всем, кто их копал.',
      ]],
      ['Каска и кирка', [
        `С ${v.darkFrom}-го этажа без надетой каски темно - копать нельзя. ${v.pick ? '«Каску шахтёра» продаёт Снабженец Кремень' : `«Каску шахтёра» продаёт Фонарщик (с ${v.lampFrom}-го этажа)`}, надеть - «Сумка».`,
        ...(v.pick ? ['Кирка - навсегда твоя: от деревянной до адамантитовой (удар +10…+70%). Улучшать - у Снабженца: мастерство «Горное дело», монеты и руда.', 'Рудная сумка - руда в ней не занимает места в сумке героя.'] : []),
      ]],
      ...(v.v3 ? [
        ['Лифт', [
          'Новый этаж открывает лифт. На самом глубоком этаже найдите шахту лифта и докопайтесь до неё.',
          'Потом все скидываются монетами или рудой (по цене скупщика, руда - в казну Ратуши); чем глубже, тем больше нужно.',
          'Собрали - лифт улучшается сам по таймеру, потом открывается следующий этаж. Копать в это время можно.',
          'Лифт возит на любой открытый этаж - нажми на него и выбери этаж.',
        ]],
        ['Буровые', [
          'Жилу выкопали на 70% - на ней площадка буровой. На этаже - не больше 2 буровых.',
          'Скиньтесь монетами или рудой - буровая строится по таймеру, уровни 1-3. Строителям - бонус рудой жилы по вкладу.',
          'Буровая сама добывает руду жилы, пока та не иссякнет: 70% - в казну Ратуши, 30% - тем, кто копал в шахте за последний час.',
        ]],
      ] : [
        ['Этажи', [
          'Расчистили этаж - шахта спускается на следующий: камни там выше уровнем, в глубоких пластах - другая руда.',
          'В каждом десятке этажей один - угольный: кучи угля и камни с углём вокруг них.',
        ]],
      ]),
      ['Поручения и доска почёта', [
        'Доска в зале: поручения скупщика - 3 на день и 2 на неделю, награду забирай у скупщика.',
        ...(v.q2 ? ['Общее поручение - всей шахтой за неделю, награда каждому, кто вложил не меньше порога.'] : []),
        'Доска почёта - твой вклад за неделю и лучшие копатели.',
      ]],
      ['Неделя', [
        'Каждую субботу в 18:00 МСК - новая шахта с 1-го этажа. Сумка, казна и мастерство остаются.',
        `Вложил за неделю хотя бы 1 час работы - награда за глубину: ${v.week}. С 30-го этажа ещё сфера, с 60-го - звезда.`,
      ]],
    ],
  });
  function help() {
    if (document.querySelector('.mn-help')) return;
    const st = (S && S.st) || {}, me = (S && S.me) || {}, cap = +me.cap || 0;
    const week = [[10, 80], [20, 200], [30, 400], [40, 550], [60, 900]].map(([f, c]) => `${f}-й этаж - ${c}`).join(', ') + ' монет';
    const H = HELP({ lampFrom: st.lampFrom || 4, darkFrom: st.darkFrom || 5, cap, capT: mmss(cap), week, pick: pickOn(), buyer: buyerOn(), v3: V3(), q2: !!(S.me && S.me.q && S.me.q.c) });
    const d = document.createElement('div'); d.className = 'mn-board-w mn-help'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'mn-help-h');
    d.innerHTML = `<div class="mn-board panel"><div class="mn-help-hd"><h3 class="h3" id="mn-help-h">${esc(H.title)}</h3><button type="button" class="mn-help-x" data-x aria-label="Закрыть" title="Закрыть">×</button></div>
      ${H.parts.map(([h, li]) => `<h4>${esc(h)}</h4><ul class="mn-help-l">${li.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`).join('')}
      <button type="button" class="btn primary" data-x>Понятно</button></div>`;
    host().appendChild(d);
    const from = document.activeElement;
    const shut = () => { d.remove(); document.removeEventListener('keydown', k2, true); try { if (from && from.isConnected) from.focus({ preventScroll: true }); } catch (e) {} };
    const k2 = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); } };   // Esc - только окно, не выход из шахты
    document.addEventListener('keydown', k2, true);
    d.addEventListener('pointerdown', (e) => { if (e.target === d) shut(); });
    d.querySelectorAll('[data-x]').forEach((b) => { b.onclick = shut; });
    try { d.querySelector('.mn-help-x').focus({ preventScroll: true }); } catch (e) {}
  }

  /* ---------- доска итогов шахт (у входа в шахту в «Городе»): вкладки — шахты канала (домашняя и города своих округов) ---------- */
  // 29.10: окно «Итоги» - одно: повторное нажатие не плодит окна (они наслаивались и оставались после выхода из шахты)
  let BD = null;
  async function board(Y, c0) {
    if (BD && BD.d.isConnected) { if (c0) BD.show(c0); try { BD.d.querySelector('button').focus(); } catch (e) { /* фокус не главное */ } return; }
    const d = document.createElement('div'); d.className = 'mn-board-w'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Итоги шахт');
    d.innerHTML = '<div class="mn-board panel"><p class="muted">Смотрю доску…</p></div>'; host().appendChild(d);
    // 30.10: из шахты - окно по центру (правой панели, на месте которой оно стояло, больше нет)
    const M = S && S.el ? S : null;
    // 25.10: Esc и нажатие мимо закрывают - packages/site-ui
    const shut = window.LGSiteUi.layer(d, {});
    const list = (Y.mines && Y.mines()) || [];
    async function show(c) {
      const r = await Y.api(`/api/mine/state?c=${encodeURIComponent(c)}`); if (!d.isConnected) return;
      const st = r && r.st;
      const me = Y.login(), row = (l, u, i) => `<li class="${l === me ? 'me' : ''}"><span>${i + 1}</span><b>${esc(l === me ? l + ' (ты)' : l)}</b><em>${u}</em></li>`;
      const h0 = st && st.hist && st.hist[0];
      const tabs = list.length > 1 ? `<div class="mn-bd-tabs" role="tablist">${list.map((m) => `<button type="button" role="tab" class="btn ${m.id === c ? 'primary' : 'ghost'} sm" aria-selected="${m.id === c}" data-bt="${esc(m.id)}">${esc(m.id === 'home' ? 'Домашняя' : m.nm)} ${stars(m.dg)}</button>`).join('')}</div>` : '';
      const title = st && st.name && st.id !== 'home' ? `Итоги шахты · ${st.name}` : 'Итоги шахты';
      d.querySelector('.mn-board').innerHTML = !st ? `${tabs}<p>${esc((r && r.error) || 'Доска пока пуста — шахта ещё не открылась.')}</p><button type="button" class="btn primary" data-x>Закрыть</button>`
        : `<h3 class="h3">${esc(title)}</h3>${tabs}<p class="muted">${stars(st.danger)} · ${esc(BIO_RU[st.biome] || '')}${st.gem ? ` · самоцвет — ${esc(resName(st.gem))}` : ''}</p>
          <div class="mn-bd-sum"><div><b>${st.n}</b><span>этаж сейчас</span></div><div><b>${st.rec || st.n}</b><span>рекорд</span></div><div><b>${st.working || 0}</b><span>копают</span></div></div>
          <h4>Лучшие копатели недели</h4><ol class="mn-bd-top">${(st.top || []).map(([l, u], i) => row(l, u, i)).join('') || '<li class="muted">Пока никто не копал</li>'}</ol>
          ${h0 ? `<h4>Прошлая неделя — до этажа ${h0.floor}, копателей: ${h0.players}</h4><ol class="mn-bd-top">${(h0.top || []).slice(0, 5).map((x, i) => row(x.l, x.u, i)).join('')}</ol>` : ''}
          <p class="muted">Вклад — сколько работы вложил герой. Каждую субботу в 18:00 — новая шахта.</p><button type="button" class="btn primary" data-x>Закрыть</button>`;
      d.querySelector('[data-x]').onclick = shut;
      d.querySelectorAll('[data-bt]').forEach((b) => { b.onclick = () => show(b.dataset.bt); });
    }
    BD = { d, shut, show, mine: !!M };
    show(c0 || (list[0] && list[0].id) || 'home');
  }
  // 29.10: камера для снимков и проверок (стенд, e2e): центр мира (x, y) и масштаб z
  const cam = (x, y, z) => { if (!S || !S.view) return false; S.z = Math.max(0.2, Math.min(2, +z || S.z)); S.tx = S.view.clientWidth / 2 - x * S.z; S.ty = S.view.clientHeight / 2 - y * S.z; apply(); return true; };
  // 27.10: hero - данные героя обновились (app.js apply)
  window.LGMine = { cam, open, close, exit, onEvent, board, host, result, hero: () => { bagDraw(); if (S && S.buyInv) buyInv(); }, get on() { return !!S; } };
})();
