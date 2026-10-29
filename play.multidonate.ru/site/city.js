/* 20.10: вкладка «Город» — зритель ходит своим героем по Ярмарке канала (styles/<стиль>/fair.js) и новому кварталу слева
   (cityart.js), видит других игроков онлайн и заходит в здания: Кузня (заточка), Шатёр (облик), Лавка, Тренер (навыки),
   Доска объявлений (новости); Ратуша и Аукцион — «скоро». Поход отсюда недоступен — только на стриме.
   Лёгкость: рисунок сцены — один раз (SMIL-анимации сцены на паузе), камера — один transform, человечки двигаются только
   пока идут (requestAnimationFrame останавливается, когда все стоят), их SVG — без анимаций. Сеть: свой шаг — POST цели
   (не чаще 300 мс), чужие — пачками по живому каналу сайта (SSE «city»), без SSE — один запрос раз в 3 с. Подробно — docs/CITY.md.
   20.10: улицу рисует PixiJS (citygl.js: SVG запекается в картинки один раз, кадр — только когда что-то поменялось); прежняя
   SVG-отрисовка — запасной путь (Pixi не загрузился / не запустился / слишком медленный, или флаг ?cityr=svg / localStorage lgCityR).
   app.js грузит этот файл, только когда открыли вкладку, и передаёт в open() свои помощники (X). */
(function () {
  'use strict';
  const M = window.LGCityMap, ART = window.LGCityArt;
  if (!M || !ART) return;
  const TOP = 170;                 // верх неба, который не показываем (сцена 1080 — видно 910)
    const IDS = { anvil: 1, forge: 1, tent: 1, shop: 1, trainer: 1, board: 1, hall: 1, auction: 1, gate: 1, storage: 1, magic: 1, mine: 1, mineboard: 1 };
  IDS.hwshop = 1; IDS.hwpass = 1;   // HW-NPC: хэллоуинские НПС (hwnpc.js) - окна поверх города
  let X = null;                    // помощники сайта (app.js)
  // 23.10: «Города округов» (legacy/md/docs/CITY.md): какой город открыт — fair (Ярмарка, как раньше) или город округа ★1–2
  // (раскладка — towngen.js, рисунок — townart.js; оба грузятся только при входе в город округа). acc — доступ с сервера
  // (own — канал владеет округом: обычные цены, Ратуша; иначе лучшие сделки закрыты, цены ×k). WD — мир сцены: Ярмарка — citymap.js
  let TOWN = { id: 'fair', L: null, acc: null, meta: null };
  let WD = M;
  let TLIST = null;                // города, куда можно (GET /api/city/towns), — для выбора
  const townGet = () => { try { return sessionStorage.getItem('lgCityTown') || 'fair'; } catch { return 'fair'; } };
  const townSet = (id) => { try { if (id && id !== 'fair') sessionStorage.setItem('lgCityTown', id); else sessionStorage.removeItem('lgCityTown'); } catch {} };
  const inTown = () => !!(TOWN.L);
  /* 26.10 (art/camp): стартовый лагерь «Перепутье» (packages/world/campmap.js - раскладка, campart.js - рисунок по стилю канала) - ещё один
     «город» (id camp): те же здания по id, что у Ярмарки, цены обычные. Открыт тем, у кого cp у героя (campPublic или тестер): выбор в списке
     городов или явный ?town=camp. Какой город показывать каналу до пролога, решает не этот файл. */
  const CAMP = 'camp';
  const isCamp = () => TOWN.id === CAMP && !!TOWN.L;
  // 26.10 (district-draw): лагерь открыт и каналу в Прологе при жребии края (hm.camp) - без campPublic; после жребия - закрыт всем
  const cpOn = () => !!(X && X.hero() && (X.hero().cp || (X.hero().hm && X.hero().hm.camp))) && !fairGone();
  const campName = () => { try { const n = (D().names || {})[X.style()] || {}, c = n.places && n.places.camp; return { name: (c && c.name) || 'Перепутье', sub: (c && c.sub) || 'лагерь новобранцев Легиона' }; } catch { return { name: 'Перепутье', sub: 'лагерь новобранцев Легиона' }; } };
  const foreignK = () => (inTown() && TOWN.acc && (!TOWN.acc.own || TOWN.acc.home) ? Math.max(1, +TOWN.acc.k || (TOWN.acc.home ? 1 : 2)) : 1);   // 26.10: край канала - своя наценка (k)
  // START: district-draw (quest/draw.js) - какой город показывать каналу. hm - с сервера (/api/me → hm; нет - всё как раньше):
  //   hm.camp - канал в Прологе: «Город» открывается в лагере «Перепутье» (город camp - раскладка и рисунок art/camp выше), Ярмарка - в списке;
  //   hm.id (округ) - город края канала: «Город» открывает его сразу, Перепутье и Ярмарка закрыты; k - наценка до победы над боссом округа.
  const homeOf = () => (X && X.hero() && X.hero().hm) || null;
  function homePick(hm) { if (!hm || !hm.id) return null; return { id: hm.camp ? 'camp' : String(hm.id) }; }
  const homeHere = () => inTown() && !!(TOWN.acc && TOWN.acc.home);
  const fairGone = () => { const hm = homeOf(); return !!(hm && hm.id && !hm.camp && hm.id !== 'fair' && hm.id !== 'camp'); };
  let S = null;                    // построенный город: DOM, карта, камера, человечки
  // 22.10: один MediaQueryList на всё (reduce() зовётся каждый кадр — matchMedia каждый раз создавал новый)
  const RM = window.LGSiteUi.media('reduced');   // 25.10: packages/site-ui
  const reduce = () => !!(RM && RM.matches);
  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  const D = () => window.MDDoodle;
  // 28.10 (hw-npc-ghosts): НПС рисуются и призраками (doodle-core.js npcWrap) - на время рисования стиля: 'both' (улица) / 'ghost' (помещения)
  const npcAs = (md, fn) => { const d = D(); if (!d || !md) return fn(); const was = d.npcGh; d.npcGh = md; try { return fn(); } finally { d.npcGh = was; } };
  const npcBoth = (L, fn) => npcAs(L && L.hw ? 'both' : '', fn);
  // хэллоуинский («мёртвый») вид города сейчас (Перепутье не преображается) - НПС в помещениях тоже призраки
  const hwDead = () => { try { if (isCamp()) return false; const c = hwNow(); return !!(c && c.look); } catch { return false; } };
  const ghostSvg = (svg) => String(svg).replace(/(<svg class="jl-doodle jd-ghost"[^>]*?) style="[^"]*"/, '$1');   // без filter (свечение призрака - CSS filter)
  const scopeIds = (svg, p) => svg.replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`).replace(/href="#([^"]+)"/g, `href="#${p}$1"`);
  // 20.10: Аукцион открыт тестерам (флаг au у героя) — без таблички «скоро»; сам зал — модуль auction.js (грузится при входе)
  const auOpen = () => !!(X && X.hero() && X.hero().au);
  // 22.10: Склад открыт тестерам (у героя есть sg — ячейки сумки и склада)
  const stOpen = () => !!(X && X.hero() && X.hero().sg);
  const soonB = (b) => !!b.soon && !((b.id === 'auction' && auOpen()) || (b.id === 'storage' && stOpen()) || (b.id === 'mine' && mnOn()));
  // 24.10: шахта (промысел, mine.js) — у кого открыта (mn у героя: тестерам, minePublic) — портал без досок, клик — X.openMine(id); остальным — «скоро»
  // 23.10: магическая лавка — у кого открыта (ms у героя — её название; magicShopPublic или тестер); покупки за монеты — cs (cityShopPublic или тестер)
  const msOn = () => !!(X && X.hero() && X.hero().ms);
  const csOn = () => !!(X && X.hero() && X.hero().cs);
  const mnOn = () => !!(X && X.hero() && X.hero().mn && Object.keys(X.hero().mn).length);   // 23.10: шахта открыта (тестерам, minePublic); 24.10: mn — { id шахты: … }
  const bOk = (b) => (!b.magic || msOn()) && (!b.mine || mnOn());
  // HW-NPC (слияние 27.10): хэллоуинские НПС «Ступа сладостей» и Призрачный Фонарщик (рисунок и окна - hwnpc.js). Где - крючок
  // cityhw.js npcSpots (только Ярмарка «Города»), когда - хэллоуинский вид города (hwc.look; Перепутье и города края - никогда).
  // Ставятся поверх собранного города, без пересборки (hwApply → hwNpc): предметы citygl с меткой 'hwn' - «мёртвая» перекраска и тон
  // города их не трогают (тёплые пятна), препятствия - в карту, «здания» - наведение, клик, подписи. Только Pixi (как убранство ивента).
  let hnJs = null;
  const hnLv = () => { const h = X && X.hero(); return h && h.hw ? Math.max(0, Math.min(20, +h.hw.p || 0)) : 0; };   // у зрителя горят его фонарики пасса
  function hwNpc(on) {
    if (!S || !S.gl || !S.mk) return;   // mk - только у Ярмарки (buildFair)
    S.hnOn = on = !!on && !inTown() && !!window.LGCityHW;
    const N = window.LGHwNpc, k = on ? 'n' + hnLv() : '';
    if (k === (S.hnK || '')) return;
    if (on && !N) {   // файл НПС - только когда они нужны
      if (!hnJs) hnJs = townJs(`/site/hwnpc.js?v=${(window.LG_CITYV || {}).hn || ''}`).catch((e) => { hnJs = null; console.warn('[город] hwnpc.js', e); });
      hnJs.then(() => { if (S && window.LGHwNpc) hwNpc(S.hnOn); }); return;
    }
    S.hnK = k;
    S.gl.dropProps('hwn'); for (const e of S.el.querySelectorAll('.hwn-live, [data-hwn]')) e.remove();
    let G = [];
    if (on) try { G = window.LGCityHW.npcSpots({ fair: true }).map((sp) => N.geo(sp, { lv: hnLv() })).filter(Boolean); } catch (e) { console.warn('[город] хэллоуинские НПС', e); G = []; }
    const B = G.map((g) => g.building), props = G.map((g) => ({ x: g.prop.x, y: g.prop.y, w: g.prop.w, h: g.prop.h, z: g.prop.z, dx: 0, svg: scopeIds(g.prop.svg(), 'cyh' + g.building.id + '-') }));
    WD = B.length ? { ...M, BUILDINGS: [...M.BUILDINGS, ...B] } : M;
    S.map = S.mk(B.length ? { hwObst: G.flatMap((g) => g.obst), hwB: B } : {});
    if (S.ol && S.ol.set) S.ol.set('hwn', props.map((p) => ({ svg: p.svg, dx: 0 })));
    if (props.length) S.gl.addProps(props, 'hwn');
    // подписи и кнопки «зданий» (как у зданий города) и живые слои (искры, конфеты, призрак, мерцание огней) - только transform / opacity
    const tags = S.el.querySelector('.cy-tags'), bar = S.el.querySelector('.cy-bar');
    for (const b of B) {
      if (tags) tags.insertAdjacentHTML('beforeend', `<button type="button" class="cy-tag" data-b="${b.id}" data-hwn="1" style="left:${b.tag ? b.tag[0] : (b.hit[0] + b.hit[1]) / 2}px;top:${tagY(b)}px"><span aria-hidden="true">${b.icon}</span>${esc(titleOf(b))}</button>`);
      if (bar) bar.insertAdjacentHTML('beforeend', `<button type="button" data-b="${b.id}" data-hwn="1"><span aria-hidden="true">${b.icon}</span>${esc(titleOf(b))}</button>`);
    }
    if (G.length && !document.getElementById('hwnLiveCss')) { const st = document.createElement('style'); st.id = 'hwnLiveCss'; st.textContent = N.LIVE_CSS; document.head.appendChild(st); }
    const host = S.walk || S.cam; if (host) G.forEach((g, gi) => g.live.forEach((l, i) => {
      const d = document.createElement('div'); d.className = 'hwn-live ' + l.cls; d.setAttribute('aria-hidden', 'true');
      d.style.cssText = `left:${l.x}px;top:${l.y}px;width:${l.w}px;height:${l.h}px;z-index:${l.z}`;
      d.innerHTML = scopeIds(l.svg, `cyhl${gi}${i}-`); host.appendChild(d);
    }));
    // кто стоял на месте НПС - шаг в сторону (по стенам и воде не ходят)
    for (const w of [...S.others.values(), ...(S.me ? [S.me] : [])]) if (!S.map.free(w.x, w.y)) { const [nx, ny] = S.map.nearest(w.x, w.y); w.x = nx; w.y = ny; w.path = null; place(w); }
    kick();
  }
  // HW-NPC: окно НПС (лавка / пасс) - товар и шкала из раздела Ярмарки (fair.hw), конфеты и уровень - у героя (hero.hw)
  async function hwOpen(id) {
    const N = window.LGHwNpc; if (!N || !N.open) return;
    const st = await loadStock().catch(() => null);
    N.open(id, { hero: () => X.hero(), data: (st && st.hw) || null, D: window.MDDoodle, login: () => (X.login ? X.login() : ''), toast: (t) => X.toast && X.toast(t), swap: async (b) => { const r = await X.api('/api/hwSwap', b); if (!r || !r.ok) { if (X.toast) X.toast((r && r.error) || 'Обмен не вышел', true); throw new Error('swap'); } if (X.toast) X.toast('Обмен принят: монеты придут через пару секунд'); },
      buy: async (b) => { const r = await X.api('/api/hwBuy', b); if (!r || !r.ok) { if (X.toast) X.toast((r && r.error) || 'Обмен не вышел', true); throw new Error('buy'); } } });   // 29.10: покупка вещи / облика кнопкой - ответ комнаты придёт в app.js (LGHwNpc.result)   // 29.10: обмен конфет на монеты
  }
  const titleOf = (b) => (b && b.id === 'magic' && msOn() ? String(X.hero().ms) : (b && b.title) || '');
  const still = (svg) => String(svg).replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*?(\/>|>[\s\S]*?<\/\1>)/g, '');
  // чем рисовать улицу: auto — Pixi (WebGL, программный WebGL или его нет — canvas), svg — прежняя отрисовка; для проверок
  // и на случай проблем у зрителя — ?cityr=svg|canvas|webgl или localStorage lgCityR
  let GLFAIL = '', glWait = false;
  const rmode = () => { let m = ''; try { m = new URLSearchParams(location.search).get('cityr') || localStorage.getItem('lgCityR') || ''; } catch {} return /^(svg|canvas|webgl)$/.test(m) ? m : 'auto'; };
  const useGL = () => !GLFAIL && rmode() !== 'svg' && !!window.LGCityGL;
  // 20.10: «Скрыть других игроков» — выбор зрителя, запоминается в браузере (localStorage lgCityHide)
  const hideGet = () => { try { return localStorage.getItem('lgCityHide') === '1'; } catch { return false; } };
  // 24.10: сколько других игроков рисовать (0 - всех, сколько позволяет качество) - запоминается в этом браузере
  const capGet = () => { try { const n = +localStorage.getItem('lgCityCap'); return [5, 10, 25, 50].includes(n) ? n : 0; } catch { return 0; } };
  const capSet = (n) => { try { if (n) localStorage.setItem('lgCityCap', String(n)); else localStorage.removeItem('lgCityCap'); } catch {} };
  const hideSet = (on) => { try { if (on) localStorage.setItem('lgCityHide', '1'); else localStorage.removeItem('lgCityHide'); } catch {} };
  // значок: двое; скрыто — перечёркнуто
  // 21.10: «На весь экран» — Fullscreen API (без шапки сайта и рамки браузера); нет его (iPhone) — кнопки нет, город и так во всё окно
  const FS_OK = () => !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const FS_ICO = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path class="cy-fs-on" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path class="cy-fs-off" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  const OTH_ICO = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 13.6c2.6.2 4.5 2 4.5 4.6"/><path class="cy-oth-x" d="M3 3l18 18"/></svg>';
  // 21.10: чат «Города» — окно слева снизу поверх карты (рядом с ней, не внутри: клики и стрелки в поле не двигают героя и вид)
  // 21.10: чат «Города» — окно слева снизу поверх карты (рядом с ней, не внутри: клики и стрелки в поле не двигают героя и вид)
  // 25.10: разметка и код чата — общий модуль чата (packages/site-ui/chat.js, тот же чат у шахты)
  const chatHtml = () => (window.LGChat ? window.LGChat.html({ name: 'Чат города', ph: 'Написать в чат города…' }) : '');
  const defsOf = (svg) => (String(svg).match(/<defs>[\s\S]*?<\/defs>/g) || []).join('');
  // 22.10: качество кадра при толпе. fps — [свой герой идёт или камера едет, идут только другие]: canvas (без видеокарты, кадр рисует
  // процессор) / webgl / svg — делители 60, чтобы кадр ложился на обновление экрана; vis — сколько других рисовать (ближайших к своему герою; сервер шлёт до 30), lab — у скольких
  // ближайших подпись, bob — покачивание чужих на ходу, res — предел плотности кадра (canvas / webgl; null — как есть).
  // Уровень понижается сам, если кадры не успевают (рывки), и повышается, когда снова легко (см. qualityTick).
  // Вручную — localStorage lgCityQ = 0|1|2 (или LGCity.quality(n) для проверок).
  // 23.10: обычный уровень canvas — 30 и когда идут только другие (при 20 чужие шли заметно «рывками»); ходьба — по времени
  // (M.stepAlong), так что и на нижних уровнях (15, 12 кадров) герои идут с той же скоростью, просто реже кадры.
  const QL = [
    { canvas: [30, 30], webgl: [60, 30], svg: [30, 20], vis: 30, lab: 30, bob: true, res: [null, null] },
    { canvas: [20, 15], webgl: [30, 20], svg: [20, 15], vis: 20, lab: 10, bob: false, res: [1.25, 2] },
    { canvas: [15, 12], webgl: [20, 15], svg: [15, 12], vis: 12, lab: 5, bob: false, res: [1, 1.5] },
  ];
  const qForced = () => { try { const v = localStorage.getItem('lgCityQ'); return /^[012]$/.test(v || '') ? +v : null; } catch { return null; } };

  /* ===================== сборка сцены ===================== */
  // 23.10: оболочка вкладки (вид, подписи зданий, кнопки, чат, список зданий, место для зала) — одна у Ярмарки и у городов округов
  /* 24.10 (снимок стримера: ярлык «📜 Доска объявлений» закрывал нарисованную вывеску «ДОСКА»): ярлык здания — НАД верхом его рисунка
     (низ ярлыка — на 4 px выше места клика hit, а место клика — по верху рисунка с крышей, башнями, флагами), но не выше края кадра
     (TOP + высота ярлыка при самом мелком зуме). Вывески нарисованы ниже верха здания — ярлык их не закрывает (тест test/townlevels.test.ts). */
  const TAG_H = 56;
  const tagY = (b) => (b.tag ? b.tag[1] : Math.max(TOP + TAG_H, b.hit[2] - 4));
  function shellHtml(st, art) {
    return `<div class="cy" data-st="${esc(st)}">
      <div class="cy-view" tabindex="0" aria-label="Город: нажми на землю — герой пойдёт туда, на здание — зайдёт внутрь. Стрелки — двигать вид">
        <div class="cy-cam" style="width:${WD.W}px;height:${WD.H}px">
          ${art}
          <div class="cy-ols" aria-hidden="true"></div><div class="cy-hov" aria-hidden="true"><b class="cy-tip"></b></div>
          <div class="cy-tags">${WD.BUILDINGS.filter(bOk).map((b) => `<button type="button" class="cy-tag${soonB(b) ? ' soon' : ''}" data-b="${b.id}" style="left:${b.tag ? b.tag[0] : (b.hit[0] + b.hit[1]) / 2}px;top:${tagY(b)}px"><span aria-hidden="true">${b.icon}</span>${esc(titleOf(b))}${soonB(b) ? '<small>скоро</small>' : ''}</button>`).join('')}</div>
        </div>
        <div class="cy-hud"><span class="cy-on" aria-live="polite"></span><label class="cy-capl" title="Сколько других игроков рисовать на экране (меньше - легче для слабого ПК или телефона)"><span>Показывать:</span><select class="cy-cap" aria-label="Сколько игроков показывать"><option value="0">всех</option><option value="50">50</option><option value="25">25</option><option value="10">10</option><option value="5">5</option></select></label><span class="cy-hint">Нажми на землю — герой пойдёт; на здание — зайдёт</span></div>
        <button type="button" class="cy-others" aria-pressed="false">${OTH_ICO}<span class="cy-tipb" aria-hidden="true"></span></button>
        <button type="button" class="cy-town" hidden aria-haspopup="dialog" aria-expanded="false"><span aria-hidden="true">🏘</span><b></b><i aria-hidden="true">▾</i></button>
        <div class="cy-tp" hidden role="dialog" aria-label="Выбрать город"></div>
        ${FS_OK() ? `<button type="button" class="cy-fs" aria-pressed="false" aria-label="На весь экран" title="На весь экран">${FS_ICO}</button>` : ''}
        <div class="cy-arrows"><button type="button" class="cy-ar l" data-pan="-1" aria-label="Вид влево"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="cy-ar u" data-pany="-1" aria-label="Вид вверх"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="cy-ar d" data-pany="1" aria-label="Вид вниз"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="cy-ar zi" data-zoom="1" aria-label="Приблизить" title="Приблизить"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button><button type="button" class="cy-ar zo" data-zoom="-1" aria-label="Отдалить" title="Отдалить"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button><button type="button" class="cy-ar r" data-pan="1" aria-label="Вид вправо"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
      </div>
      ${chatHtml()}
      <nav class="cy-bar" aria-label="Здания города">${WD.BUILDINGS.filter(bOk).map((b) => `<button type="button" data-b="${b.id}"${soonB(b) ? ' class="soon"' : ''}><span aria-hidden="true">${b.icon}</span>${esc(titleOf(b))}</button>`).join('')}</nav>
      <section class="cy-room" hidden aria-live="polite" role="dialog" aria-label="Здание"></section>
    </div>`;
  }
  function build(root, gl) {
    const st = X.style();
    let L = null; try { L = D().location('fair', { esc }); } catch (e) { console.warn('[город] нет Ярмарки', e); }
    if (!L) { root.innerHTML = '<div class="panel cy-err"><p class="lead">Город не загрузился — обнови страницу.</p></div>'; return null; }
    // разделители экранов стрима (труба котиков, ствол обезьян) — в городе их нет, и там можно ходить
    // 23.10: магическая лавка (тем, у кого открыта): башня звездочёта вместо тележки, её интерьер — rooms.magic
    if (L.magic && L.magic.room) L.rooms = Object.assign({}, L.rooms, { magic: L.magic.room });
    const MS = msOn() && !!L.magic;
    if (TOWN.L) return isCamp() ? buildCamp(root, gl, st, L) : buildTown(root, gl, st, L, MS);
    WD = M;
    const mk = (hw) => M.make((L.obstacles || []).filter((o) => !o.divider), { magic: MS, magicObst: L.magic && L.magic.obstacle, mine: mnOn(), ...(hw || {}) });   // HW-NPC: mk - карта с НПС ивента (hwNpc)
    const map = mk(), Q = ART.quarter(st, M.QW, { auction: auOpen() }), LW = ART.lower(st, M, { storage: stOpen(), mine: mnOn() });
    // небо: у стиля Ярмарки своё (.fr-skybg в css стиля), нет — как у квартала
    const skyM = /\.fr-skybg\{background:([^}]+)\}/.exec(L.css || ''), sky = skyM ? skyM[1] : Q.sky;
    // 28.10 (hw-npc-ghosts): НПС Ярмарки - и призраками рядом (скрыты): их покажут мёртвые плитки хэллоуинского города (citygl)
    const fairSvg = npcBoth(L, () => scopeIds(L.scene({ city: true, ...(MS ? { magic: true, magicName: String(X.hero().ms) } : {}) }), 'cyf-'));
    const stars = (L.skyStars || []).map((g) => g.join('')).join('');
    root.innerHTML = shellHtml(st, gl ? '' : `<div class="cy-art" style="background:${esc(sky)}">
            <svg class="cy-q" width="${M.QW + 40}" height="1080" viewBox="0 0 ${M.QW + 40} 1080" aria-hidden="true">${scopeIds(Q.svg, 'cyq-')}</svg>
            <svg class="cy-f" style="left:${M.QW + 8}px" width="${L.width - 8}" height="1080" viewBox="8 0 ${L.width - 8} 1080" aria-hidden="true"><g>${stars}</g>${fairSvg}</svg>
            <svg class="cy-l" style="top:${M.LOW.top}px" width="${M.W}" height="${M.H - M.LOW.top}" viewBox="0 ${M.LOW.top} ${M.W} ${M.H - M.LOW.top}" aria-hidden="true">${scopeIds(LW.svg, 'cyl-')}</svg>
          </div>
          <div class="cy-walk">
            ${Q.props.map((p) => `<svg class="cy-prop" style="left:${p.x}px;top:${p.y}px;z-index:${p.z}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible" aria-hidden="true">${scopeIds(p.svg(), 'cyq-')}</svg>`).join('')}
            ${LW.props.map((p) => `<svg class="cy-prop" style="left:${p.x}px;top:${p.y}px;z-index:${p.z}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible" aria-hidden="true">${scopeIds(p.svg(), 'cyl-')}</svg>`).join('')}
            ${(L.props || []).map((p, i) => p.divider ? '' : `<svg class="cy-prop" style="left:${p.x + M.QW}px;top:${p.y}px;z-index:${p.z}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible" aria-hidden="true">${scopeIds(p.svg(), 'cyp' + i + '-')}</svg>`).join('')}
          </div>
          <div class="cy-names"></div>`);
    const el = root.querySelector('.cy');
    el.classList.toggle('cy-pixi', !!gl);
    // Pixi: тот же рисунок, что в SVG-версии (те же слои, предметы, сдвиги и префиксы id) — его запечёт citygl.js
    // слои улицы (те же, что рисует SVG-версия) — для Pixi и для сцены «Заточка» (кусок улицы у наковальни)
    const street = [
      `<svg x="0" y="0" width="${M.QW + 40}" height="1080" viewBox="0 0 ${M.QW + 40} 1080">${scopeIds(Q.svg, 'cyq-')}</svg>`,
      `<svg x="${M.QW + 8}" y="0" width="${L.width - 8}" height="1080" viewBox="8 0 ${L.width - 8} 1080"><g>${stars}</g>${fairSvg}</svg>`,
      `<svg x="0" y="${M.LOW.top}" width="${M.W}" height="${M.H - M.LOW.top}" viewBox="0 ${M.LOW.top} ${M.W} ${M.H - M.LOW.top}">${scopeIds(LW.svg, 'cyl-')}</svg>`,
    ];
    const qd = defsOf(scopeIds(Q.svg, 'cyq-')), ld = defsOf(scopeIds(LW.svg, 'cyl-'));
    // 28.10 (hw-city-dead, договор с художником - шапка cityhw.js): свой «мёртвый» рисунок стиля (hw.dead, quarter(…, { dead: true })) - как есть
    const DH = (L.hw && L.hw.dead) || null;
    let Qd = null; try { const q = ART.quarter(st, M.QW, { auction: auOpen(), dead: true }); if (q && q.dead) Qd = q; } catch { Qd = null; }
    let fairD = ''; try { if (DH && typeof DH.scene === 'function') fairD = scopeIds(DH.scene({ city: true, ...(MS ? { magic: true, magicName: String(X.hero().ms) } : {}) }), 'cyfd-'); } catch { fairD = ''; }
    const layers = [
      { x: 0, y: 0, w: M.QW + 40, h: 1080, svg: street[0], ...(Qd ? { dead: `<svg x="0" y="0" width="${M.QW + 40}" height="1080" viewBox="0 0 ${M.QW + 40} 1080">${scopeIds(Qd.svg, 'cyqd-')}</svg>` } : {}) },
      { x: M.QW + 8, y: 0, w: L.width - 8, h: 1080, svg: street[1], ...(fairD ? { dead: `<svg x="${M.QW + 8}" y="0" width="${L.width - 8}" height="1080" viewBox="8 0 ${L.width - 8} 1080">${fairD}</svg>` } : {}) },
      { x: 0, y: M.LOW.top, w: M.W, h: M.H - M.LOW.top, svg: street[2] },
    ];
    const qdd = Qd ? defsOf(scopeIds(Qd.svg, 'cyqd-')) : '';
    // предметы квартала и нижней улицы ссылаются на градиенты своего слоя (в SVG-версии они в том же документе) — кладём их рядом
    const props = [
      ...Q.props.map((p, i) => ({ x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: 0, svg: qd + scopeIds(p.svg(), 'cyq-'), ...(Qd && Qd.props && Qd.props[i] ? { svgDead: qdd + scopeIds(Qd.props[i].svg(), 'cyqd-') } : {}) })),
      ...LW.props.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: 0, svg: ld + scopeIds(p.svg(), 'cyl-') })),
      ...(L.props || []).map((p, i) => (p.divider ? null : { x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: M.QW, svg: scopeIds(p.svg(), 'cyp' + i + '-'),
        ...(DH && DH.props && DH.props[i] && typeof DH.props[i].svg === 'function' ? { svgDead: scopeIds(DH.props[i].svg(), 'cypd' + i + '-') } : {}) })).filter(Boolean),
    ];
    return Object.assign(finish(root, el, gl, { L, map, st, street, sky, qprops: Q.props, layers, props, skyDead: (DH && DH.sky) || null }), { mk });   // HW-NPC: mk
  }

  // общее у Ярмарки и городов округов: Pixi (или SVG-версия), обводка, сцена на паузе, состояние города
  function finish(root, el, gl, sc) {
    const { L, map, st, street, sky, qprops, layers, props, skyDead } = sc;
    let G = null;
    if (gl) {
      G = window.LGCityGL.create({
        host: el.querySelector('.cy-view'), labelHost: el, W: WD.W, H: WD.H, top: TOP, sky, skyDead, mode: rmode(), V: window.LG_CITYV, layers, props,
        onDirty: () => kick(), onFail: (why) => glFail(why),
      });
    }
    // 20.10: обводка по силуэту того, на что навели (здания и места помечены data-ol в рисунке) — готовится один раз на цель
    const ol = window.LGCityGL && window.LGCityGL.outliner ? window.LGCityGL.outliner([...layers, ...props].map((l) => ({ svg: l.svg, dx: l.dx || 0 }))) : null;
    // сцена неподвижна: SMIL-анимации рисунка (мерцание, дыхание продавцов) — на паузе, CSS-анимации — выключены стилем
    el.querySelectorAll('.cy-art svg, .cy-prop').forEach((s) => { try { s.pauseAnimations && s.pauseAnimations(); } catch {} });
    // вложенные человечки рисунка (продавцы, франт): размер — из атрибутов, без «дрожащего» фильтра (как fixDoodles в fair/widget.js)
    el.querySelectorAll('.cy-art svg svg.jl-doodle, .cy-prop svg.jl-doodle').forEach((d) => { const w = d.getAttribute('width'), h = d.getAttribute('height'); if (w) d.style.width = parseFloat(w) + 'px'; if (h) d.style.height = parseFloat(h) + 'px'; d.style.position = 'static'; d.style.filter = 'none'; });
    return {
      root, el, L, map, st, gl: G, ol, street, sky, qprops, glide: null, inFrame: false, q: { lv: qForced() ?? 0, fixed: qForced() != null, iv: [], at: 0, up: 0, lock: false, lodAt: 0, drawAt: 0 }, camMoved: false, view: el.querySelector('.cy-view'), cam: el.querySelector('.cy-cam'), walk: el.querySelector('.cy-walk'), names: el.querySelector('.cy-names'), room: el.querySelector('.cy-room'), panel: null, hud: el.querySelector('.cy-on'), capV: capGet(),
      z: 0.6, camX: inTown() ? 0 : M.QW + 300, camY: TOP, town: TOWN.id, qpfx: inTown() ? 'cyt-' : 'cyq-', camT: null, drag: null, follow: true, freeUntil: 0,
      kw: { keys: new Set(), on: false, last: null, at: 0, dirty: false, t: 0 },
      me: null, others: new Map(), hidden: hideGet(), ghosts: new Map(), n: 0, inCity: false, entering: null, goQ: null, goAt: 0, goT: 0, raf: 0, last: 0, timer: 0, tick: 0, panelId: null, arrive: null,
    };
  }

  /* 23.10: город округа (towngen.js — раскладка, townart.js — рисунок по размеру и природе). Здания, интерьеры и окна — те же, что у Ярмарки
     (по id), интерьеры Кузни, Шатра и магической лавки — из стиля канала (L.rooms). Фон — кусками по 1024 px (citygl.js печёт плитку из своих кусков). */
  function buildTown(root, gl, st, L, MS) {
    const TL = TOWN.L, A = window.LGTownArt.draw(TL, { guy: smithGuy, mineOpen: mnOn() });
    WD = { W: TL.W, H: TL.H, QW: 0, AREA: TL.AREA, BUILDINGS: TL.BUILDINGS.filter((b) => !b.magic || MS), town: TL };
    const map = window.LGTownGen.map(TL, { magic: MS }), sky = A.sky;
    const layers = A.layers.map((l) => ({ x: l.x, y: l.y || 0, w: l.w, h: l.h || TL.H, svg: scopeIds(l.svg, 'cyt-') }));   // 23.10 (ярусы): куски — по x и по ярусам
    const props = A.props.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: 0, svg: scopeIds(A.defs + p.svg(), 'cyt-') }));
    root.innerHTML = shellHtml(st, gl ? '' : `<div class="cy-art" style="background:${esc(sky)}">
            ${layers.map((l) => `<svg class="cy-tl" style="left:${l.x}px;top:${l.y}px" width="${l.w}" height="${l.h}" viewBox="${l.x} ${l.y} ${l.w} ${l.h}" overflow="visible" aria-hidden="true">${l.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`).join('')}
          </div>
          <div class="cy-walk">
            ${props.map((p) => `<svg class="cy-prop" style="left:${p.x}px;top:${p.y}px;z-index:${p.z}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible" aria-hidden="true">${p.svg}</svg>`).join('')}
          </div>
          <div class="cy-names"></div>`);
    const el = root.querySelector('.cy');
    el.classList.toggle('cy-pixi', !!gl);
    el.dataset.town = TL.id; el.dataset.bio = TL.biome;
    fxLayer(el, A.fx);
    return finish(root, el, gl, { L, map, st, street: layers.map((l) => l.svg), sky, qprops: A.props.map((p) => ({ ...p, svg: () => A.defs + p.svg() })), layers, props });
  }
  /* 26.10 (art/camp): лагерь «Перепутье» - та же сборка, что у города округа (куски фона, предметы по глубине, Pixi), рисунок - по стилю
     канала (campart.js). Магической лавки и шахты в лагере нет. */
  function buildCamp(root, gl, st, L) {
    Object.assign(TOWN.L, campName());   // 28.10 (fix/style-live): стиль канала сменили на лету - и название лагеря по новому стилю
    const TL = TOWN.L, A = window.LGCampArt.draw(TL, st, { guy: smithGuy, name: campName() });
    WD = { W: TL.W, H: TL.H, QW: 0, AREA: TL.AREA, BUILDINGS: TL.BUILDINGS, town: TL };
    const map = window.LGCampMap.map(TL), sky = A.sky;
    const layers = A.layers.map((l) => ({ x: l.x, y: l.y || 0, w: l.w, h: l.h || TL.H, svg: scopeIds(l.svg, 'cyt-') }));
    const props = A.props.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: 0, ...(p.flick ? { flick: p.flick } : {}), svg: scopeIds(A.defs + p.svg(), 'cyt-') }));   // flick - живое пламя костра
    root.innerHTML = shellHtml(st, gl ? '' : `<div class="cy-art" style="background:${esc(sky)}">
            ${layers.map((l) => `<svg class="cy-tl" style="left:${l.x}px;top:${l.y}px" width="${l.w}" height="${l.h}" viewBox="${l.x} ${l.y} ${l.w} ${l.h}" overflow="visible" aria-hidden="true">${l.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`).join('')}
          </div>
          <div class="cy-walk">
            ${props.map((p) => `<svg class="cy-prop${p.flick ? ' cy-camp-fl' : ''}" style="left:${p.x}px;top:${p.y}px;z-index:${p.z}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible" aria-hidden="true">${p.svg}</svg>`).join('')}
          </div>
          <div class="cy-names"></div>`);
    const el = root.querySelector('.cy');
    el.classList.toggle('cy-pixi', !!gl);
    el.dataset.town = CAMP; el.dataset.bio = 'camp';
    fxLayer(el, A.fx);
    // 29.10: пламя костра - предмет с глубиной (campart.js, flick): в Pixi качается в сцене (citygl), в SVG-версии - CSS cy-camp-fl на предмете
    return finish(root, el, gl, { L, map, st, street: layers.map((l) => l.svg), sky, qprops: A.props.map((p) => ({ ...p, svg: () => A.defs + p.svg() })), layers, props });
  }
  // кузнец у наковальни города: тот же человечек и тот же удар, что у Ярмарки (styles/<стиль>/fair.js guy, anim 'smith' — streetBg ищет этот удар)
  function smithGuy(seed, base, cx, s, mood, extra, look, anim) {
    try {
      const svg = D().jDoodle(D().jhash(seed), mood, false, extra, look), w = 120 * s, h = 170 * s;
      const body = svg.replace('<svg class="jl-doodle" viewBox="0 0 120 170"', `<svg class="jl-doodle" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" viewBox="0 0 120 170" overflow="visible"`);
      const sway = anim === 'smith' ? '<animateTransform attributeName="transform" type="rotate" values="0;-7;-7;4;0;0" keyTimes="0;.3;.45;.55;.7;1" dur=".9s" repeatCount="indefinite"/>' : '';
      return `<g transform="translate(${cx} ${base})"><g>${sway}<g>${body}</g></g></g>`;
    } catch { return ''; }
  }
  // 23.10: немного частиц природы (снег, искры, светлячки, песок, пылинки) — поверх вида, CSS-анимация transform/opacity; reduced motion — нет
  function fxLayer(el, kind) {
    if (!kind || reduce()) return;
    const v = el.querySelector('.cy-view'); if (!v) return;
    const n = kind === 'snow' ? 14 : kind === 'firefly' ? 8 : 10;
    let h = ''; for (let i = 0; i < n; i++) h += `<i style="left:${(i * 97) % 100}%;animation-delay:${(-i * 1.37).toFixed(2)}s;animation-duration:${(kind === 'firefly' ? 5 : 7) + (i % 4) * 1.3}s"></i>`;
    const f = document.createElement('div'); f.className = 'cy-fx'; f.dataset.fx = kind; f.setAttribute('aria-hidden', 'true'); f.innerHTML = h; v.appendChild(f);
  }

  /* ===================== камера ===================== */
  // 20.10: карта — на всю доступную высоту окна (под шапкой, над списком зданий); масштаб — чтобы было видно ~900 px сцены
  // по высоте на ПК и ~700 px по ширине на телефоне; камера ходит по обеим осям
  function layout() {
    if (!S) return;
    if (S.gl && !S.root.classList.contains('on')) return;   // вкладка спрятана (размер 0) — не пересчитывать масштаб и не перепекать картинки
    try {
      // 21.10: город — во всё окно (html.cy-full снимает поля страницы); во весь экран (Fullscreen) — от верха экрана
      const fs = document.fullscreenElement === S.el, top = fs ? 0 : S.view.getBoundingClientRect().top + window.scrollY, bar = S.el.querySelector('.cy-bar'), bh = bar ? bar.offsetHeight : 0;
      S.view.style.height = Math.max(300, Math.round(window.innerHeight - top - bh)) + 'px';
    } catch {}
    const vh = S.view.clientHeight || 400, vw = S.view.clientWidth || 360;
    S.vw = vw; S.vh = vh;   // 22.10: размер вида — запомнить здесь (раскладка и ResizeObserver), а не читать из DOM каждый кадр
    S.zb = Math.max(0.4, Math.min(1, vh / 1100, vw / 640));   // обычный масштаб (без зума)
    S.z = zClamp(S.zb * (S.zk || zoomGet()));
    S.cam.style.setProperty('--iz', (1 / S.z).toFixed(3));   // подписи — одного размера на экране при любом масштабе
    clampCam(); applyCam();
  }
  /* 23.10: ЗУМ (решение стримера): щипок двумя пальцами (телефон), кнопки «+ / −» у стрелок; ПК — 24.10 (просьба стримера) простое
     КОЛЕСО мыши (и щипок тачпада / Ctrl+колесо), вбок — Shift+колесо или тачпад вбок; в списках и окнах колесо листает их, а не зумит.
     Пределы — от «вся сцена по высоте» (и не шире сцены) до 2× обычного;
     масштаб — вокруг точки щипка / курсора (клик по зданию и ходьба считают координаты через S.z — scenePt). Запоминается в браузере.
     Pixi не печёт заново на каждом шаге: пока жест идёт, готовые картинки просто растягиваются (citygl view: перепечь — через 250 мс тишины). */
  const ZK_KEY = 'lgCityZoom';
  const zoomGet = () => { try { const v = +localStorage.getItem(ZK_KEY); return v > 0.2 && v < 5 ? v : 1; } catch { return 1; } };
  const zoomSave = () => { try { localStorage.setItem(ZK_KEY, String(+(S.zk || 1).toFixed(3))); } catch {} };
  // 28.10 (camp-zoom, стример): лагерь ниже Ярмарки (1440 против 1980) - «вся сцена по высоте» наступала почти сразу: на телефоне «−» и
  // щипок не отдаляли вовсе, на ПК - чуть-чуть. В лагере отдаляем, как на Ярмарке (будто сцена высотой FAIR_H): лишнее - небо над лагерем
  const FAIR_H = 1980;
  const zH = () => (isCamp() ? Math.max(WD.H, FAIR_H) : WD.H);
  function zLim() {
    const vh = S.vh || 400, vw = S.vw || 360, zb = S.zb || 0.6;
    const lo = Math.max(vh / (zH() - TOP), vw / WD.W, 0.2);   // вся сцена по высоте (меньше — пустые поля за краем сцены)
    return [Math.min(lo, zb), zb * 2];
  }
  // где колесо листает своё (списки, окна), а не зумит город
  const WHEEL_OWN = '.cy-tp, .cy-chat, .cy-room, input, textarea, select, [data-wheel]';
  function zClamp(z) { const [a, b] = zLim(); return Math.max(a, Math.min(b, z)); }
  // масштаб z вокруг точки вида (sx, sy — px от левого верхнего угла вида)
  function zoomTo(z, sx, sy) {
    z = zClamp(z);
    if (Math.abs(z - S.z) < 1e-4) return;
    if (sx == null) { sx = (S.vw || 360) / 2; sy = (S.vh || 400) / 2; }
    const wx = S.camX + sx / S.z, wy = S.camY + sy / S.z;
    S.z = z; S.zk = z / (S.zb || z); zoomSave();
    S.camX = wx - sx / z; S.camY = wy - sy / z;
    S.cam.style.setProperty('--iz', (1 / S.z).toFixed(3));
    S.glide = null; clampCam(); applyCam(); S.freeUntil = Date.now() + 4000;
    if (S.hovK) hover(null);
  }
  // clientWidth в кадре заставлял браузер пересчитывать раскладку (облачка, строка «В городе» поменялись) — берём запомненный
  const viewW = () => (S.vw || 360) / S.z;
  const viewH = () => (S.vh || 400) / S.z;
  function clampCam() {
    S.camX = Math.max(0, Math.min(WD.W - viewW(), S.camX));
    const span = WD.H - TOP - viewH();
    // лагерь, отдалённый дальше своей высоты, - земля у нижнего края, сверху небо (а не пустая полоса под частоколом)
    S.camY = span > 0 ? Math.max(TOP, Math.min(WD.H - viewH(), S.camY)) : isCamp() ? WD.H - viewH() : TOP + span / 2;
  }
  function applyCam() {
    S.camMoved = true;
    S.cam.style.transform = `translate(${(-S.camX * S.z).toFixed(1)}px, ${(-S.camY * S.z).toFixed(1)}px) scale(${S.z})`;
    if (S.gl) { S.gl.view(S.camX, S.camY, S.z, S.vw || 360, S.vh || 400); kick(); }   // Pixi: кадр — в ближайшем requestAnimationFrame
    // кто вошёл в кадр, пока камера ехала, — поставить туда, где он сейчас
    for (const w of S.others.values()) if (!w.shown && onScreen(w.x, w.y)) { place(w); w.shown = true; }
  }
  // камера держит героя в средней части экрана (по обеим осям); пока зритель сам тянет вид — не мешает (4 с)
  function follow(dt) {
    if (!S.me || S.panelId || Date.now() < S.freeUntil) return false;
    const w = viewW(), h = viewH(), x = S.me.x, y = S.me.y - 60;
    let wx = S.camX, wy = S.camY;
    if (x < S.camX + w * 0.32) wx = x - w * 0.32; else if (x > S.camX + w * 0.68) wx = x - w * 0.68;
    if (y < S.camY + h * 0.3) wy = y - h * 0.3; else if (y > S.camY + h * 0.7) wy = y - h * 0.7;
    const ox = S.camX, oy = S.camY;
    S.camX += (wx - S.camX) * Math.min(1, dt * 6); S.camY += (wy - S.camY) * Math.min(1, dt * 6);
    clampCam();
    if (Math.abs(S.camX - ox) < 0.3 && Math.abs(S.camY - oy) < 0.3) return false;
    applyCam();
    return true;
  }
  function centerOn(x, y) { S.camX = x - viewW() / 2; if (y != null) S.camY = y - viewH() * 0.6; clampCam(); applyCam(); }

  /* ===================== человечки ===================== */
  // l — ник, v — { n (имя), lv, lk (облик), g (снаряжение), gh (призрак), aw }; мирный вид (руки свободны, без шлема), без анимаций SVG
  function walkerSvg(l, v) {
    if (hwGh()) v = { ...v, gh: 1 };   // 28.10 (hw-city-dead, решение В3): ночь Тыквенной Луны - все в городе «понарошку» призраками (только вид)
    if (X.fig) return X.fig(l, v);   // 25.10: общий с шахтой путь (app.js figSvg)
    const hero = { look: v.lk || null, gear: v.g || {}, ghost: !!v.gh };
    return still(X.doodle(l, hero, 'walk', 'peace'));
  }
  // 21.10: на какой высоте над ногами ставить ник (единицы рисунка 120×170): не ниже 128, но выше макушки с шапкой и нимбом —
  // раньше ник закрывал нимб, колпак, цилиндр. Меряем рисунок без ауры (свечение и искры ауры шире головы), кроме ауры «Нимб».
  // Оружия в городе нет (мирный вид). Один замер на облик — кэш по SVG
  const LIFT = new Map();
  let liftBox = null;
  function nameLift(svg, v) {
    const key = svg + '|' + ((v.lk && v.lk.aura) || '');
    if (LIFT.has(key)) return LIFT.get(key);
    let lift = 128;
    try {
      if (!liftBox) { liftBox = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); liftBox.setAttribute('aria-hidden', 'true'); liftBox.style.cssText = 'position:absolute;left:-9999px;top:0;width:120px;height:170px;overflow:hidden;visibility:hidden;pointer-events:none'; document.body.appendChild(liftBox); }
      liftBox.innerHTML = svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      liftBox.querySelectorAll('.jd-aura-b').forEach((n) => n.remove());
      if (!(v.lk && v.lk.aura === 'halo')) liftBox.querySelectorAll('.jd-aura-f').forEach((n) => n.remove());
      const b = liftBox.getBBox();
      if (b.height > 0) lift = Math.max(128, Math.min(200, 170 - b.y + 6));   // +6 — обводка и свечение нимба
      liftBox.innerHTML = '';
    } catch {}
    if (LIFT.size > 300) LIFT.clear();
    LIFT.set(key, lift);
    return lift;
  }
  const labOf = (l, v, mine) => ({ name: String(v.n || l), lv: v.lv ? +v.lv : 0, aw: Array.isArray(v.aw) ? v.aw : null, mine: !!mine, gh: !!v.gh });
  function addWalker(l, v, x, y, mine) {
    if (S.gl) {   // Pixi: картинка облика (общая у одинаковых), подпись — своя картинка
      const svg = walkerSvg(l, v), w = { l, v, x, y, path: null, face: 1, mine: !!mine, sc: 0, moving: false, lift: nameLift(svg, v) };
      S.gl.add(w, svg, labOf(l, v, mine));
      place(w);
      return w;
    }
    const svg = walkerSvg(l, v), w = { l, v, x, y, path: null, face: 1, mine: !!mine, el: document.createElement('div'), body: null, nm: null, sc: 0, moving: false, lift: nameLift(svg, v) };
    w.el.className = 'cy-w' + (mine ? ' me' : '') + (v.gh ? ' gh' : '');
    w.el.innerHTML = `<div class="cy-b">${svg}</div>`;
    w.body = w.el.firstChild;
    // ник — в своём слое над предметами (колодец, фонарь не закрывают подпись)
    w.nm = document.createElement('div'); w.nm.className = 'cy-nm' + (mine ? ' me' : '');
    w.nm.innerHTML = `${esc(v.n || l)}${v.lv ? ` <small>${+v.lv}</small>` : ''}${X.awb ? X.awb(v.aw) : ''}`;
    S.walk.appendChild(w.el); S.names.appendChild(w.nm);
    place(w);
    return w;
  }
  // 23.10 (ярусы): размер по глубине — у города округа по его ярусам (towngen scaleAt: в полосе каждого яруса как у Ярмарки), у Ярмарки — citymap
  const scaleAt = (y) => (WD && WD.town && window.LGTownGen ? window.LGTownGen.scaleAt(WD.town, y) : M.scaleAt(y));
  const HS = 1.3;   // герои в городе крупнее толпы на стриме (сайт смотрят на небольшом экране)
  function place(w) {
    const sc = scaleAt(w.y) * HS;
    if (w.bub) w.bub.style.transform = `translate(${w.x.toFixed(1)}px,${(w.y - (w.lift || 128) * sc - 4).toFixed(1)}px)`;   // 21.10: облачко чата — над ником
    if (S.gl) { S.gl.place(w, sc); w.sc = sc; return; }
    w.el.style.transform = `translate(${w.x.toFixed(1)}px,${w.y.toFixed(1)}px)`;
    w.el.style.zIndex = String(Math.round(w.y) + (w.mine ? 1 : 0));
    w.nm.style.transform = `translate(${w.x.toFixed(1)}px,${(w.y - (w.lift || 128) * sc - 4).toFixed(1)}px) translate(-50%,-100%)`;
    if (Math.abs(sc - w.sc) > 0.004 || w.faceSet !== w.face) { w.body.style.transform = `scale(${(w.face * sc).toFixed(3)},${sc.toFixed(3)})`; w.sc = sc; w.faceSet = w.face; }
  }
  const drop = (w) => { if (w.bub) { w.bub.remove(); w.bub = null; } if (S.gl) { S.gl.remove(w); return; } w.el.remove(); w.nm.remove(); };
  // идти к (tx,ty) по проходимому (свой герой)
  function walkTo(w, tx, ty) {
    const p = S.map.path([w.x, w.y], [tx, ty]);
    if (!S.map.free(w.x, w.y) || !S.map.clear([w.x, w.y], p[0])) { w.x = p[0][0]; w.y = p[0][1]; }   // стоял в стене или в воде (старые данные) — сначала на свободное место
    w.path = p.length > 1 ? p.slice(1) : null; w.lag = 0;
    setMoving(w, !!w.path);
    kick();
    return p[p.length - 1];
  }
  // 23.10: чужой шаг: вышел из (fx,fy) в (tx,ty) ago мс назад. Раньше путь «проматывался» на опоздание сразу — герой прыгал
  // вперёд до ~160 px на каждый шаг (пачка раз в 700 мс + сеть), а разошёлся больше 160 px — вставал на место рывком.
  // Теперь (M.follow): идёт от того места, где нарисован, опоздание — «долг», который он отдаёт чуть более быстрой ходьбой (до ×1,2, M.CATCH);
  // разошлись на 2+ с ходьбы (или новенький) — встаёт туда, где он сейчас, и проявляется (FADE_MS), а не прыгает
  function chase(w, fx, fy, tx, ty, ago, fresh) {
    const r = M.follow(S.map, [w.x, w.y], [fx, fy], [tx, ty], ago, { fresh });
    w.x = r.x; w.y = r.y; w.path = r.path; w.lag = r.lag;
    if (r.fade) { fadeIn(w); place(w); }
    setMoving(w, !!w.path);
    kick();
  }
  const FADE_MS = 260;
  function fadeIn(w) { if (reduce()) return; w.fadeT = performance.now(); alpha(w, 0); }
  function alpha(w, a) { if (S.gl) { if (S.gl.alpha) S.gl.alpha(w, a); } else if (w.el) { const v = a >= 1 ? '' : a.toFixed(2); w.el.style.opacity = v; w.nm.style.opacity = v; } }
  function setMoving(w, on) { if (w.moving !== on) { w.moving = on; if (S.gl) S.gl.moving(w, on && !reduce()); else w.el.classList.toggle('mv', on && !reduce()); } }
  function advance(w, dt) {
    // 23.10: шаг — по времени (dt — сколько секунд прошло), с отдачей «долга» опоздавшего чужого шага (M.stepAlong, чистая функция)
    const r = M.stepAlong(w, dt);
    w.x = r.x; w.y = r.y; w.path = r.path; w.lag = r.lag;
    // 21.10: рисунок героя смотрит влево — хвост (котики, обезьяны, черти) справа; идёт вправо — отражаем, чтобы хвост был сзади
    // (раньше было наоборот — коты ходили хвостом вперёд). У человечков «Легиона» мирный вид симметричный — им всё равно
    if (r.dx) w.face = r.dx < 0 ? 1 : -1;
    // за краем экрана DOM не трогаем (путь считается дальше): вошёл в кадр — встанет на место
    const on = !S.panelId && (w.mine || onScreen(w.x, w.y));   // в здании улицу не рисуем
    if (on || w.shown) place(w);
    w.shown = on;
    if (!w.path) { setMoving(w, false); if (w.mine && S.arrive) { const f = S.arrive; S.arrive = null; f(); } }
    // 29.10 (city-wasd): дошёл кликом до двери - подсказка «E - войти» (только у тех, кто уже нажимал клавиши)
    if (w.mine && S && S.kbd) kwHint();
  }
  const onScreen = (x, y) => x > S.camX - 160 && x < S.camX + viewW() + 160 && (y == null || (y > S.camY - 100 && y < S.camY + viewH() + 300));
  function frame(t) {
    if (!S) return;   // 26.10: «Город» отпущен (sleep / смена города), а кадр уже был заказан
    S.raf = 0;
    // 22.10: частота кадров — по делу и по уровню качества (QL): свой герой идёт или камера едет — плавнее, идут только другие — реже
    // (раньше: 60 или 30, и только при 6+ идущих — 30). В canvas каждый кадр — копия всего окна процессором: это главная цена толпы
    const Q = QL[S.q.lv], mode = S.gl ? (S.gl.mode === 'webgl' ? 'webgl' : 'canvas') : 'svg';
    // 29.10 (city-wasd): идёт клавишами - как свой путь (плавнее)
    const fast = !!((S.me && S.me.path) || (S.kw && S.kw.on) || S.glide || S.camMoved || (S.drag && S.drag.moved));
    const gap = 1000 / Q[mode][fast ? 0 : 1];
    if (S.last && t - S.last < gap - 4) { S.raf = requestAnimationFrame(frame); return; }
    S.camMoved = false;
    S.inFrame = true;
    // 23.10: камера — с ограничением шага (0,1 с), ходьба — сколько прошло на самом деле (до 2 с): раньше и ходьба резалась до 0,1 с,
    // и при медленных кадрах (слабый ПК/телефон, нижний уровень качества) чужие шли медленнее себя, отставали — и потом прыгали
    const real = Math.min(2, (t - (S.last || t)) / 1000), dt = Math.min(0.1, real); S.last = t;
    let any = false;
    // 29.10 (city-wasd): свой герой - клавишами (путь кликом при этом отменён)
    if (S.kw && S.kw.on) any = kwStep(Math.min(0.25, real)) || any;
    for (const w of [S.me, ...S.others.values()]) if (w && w.path) { advance(w, real); any = any || !!w.path; }
    if (t - S.q.lodAt > 1000) lodPick(t);   // кого рисовать и подписывать (ближайших) — раз в секунду
    for (const w of S.others.values()) if (w.fadeT) {   // проявление (после большого расхождения, новенький, вернулся в ближние)
      const a = Math.min(1, (t - w.fadeT) / FADE_MS);
      alpha(w, a); if (a >= 1) w.fadeT = 0; else any = true;
    }
    let cam = glide(t) || follow(dt || 0.016);
    // Pixi: рисуем кадр (только если что-то поменялось); в здании улицу не рисуем
    if (S.gl && !S.panelId) cam = S.gl.render(t, reduce()) || cam;
    if (!S) return;   // Pixi отказал — город пересобран на SVG
    S.inFrame = false;
    qualityTick(t, gap);
    if (any || cam) S.raf = requestAnimationFrame(frame); else S.last = 0;
  }
  // 22.10: адаптивное качество. Кадры заказаны раз в gap мс; если браузер не успевает (процессор занят), они приходят реже.
  // Среднее за ~2,5 с больше заказанного в 1,45 раза — уровень ниже (меньше кадров, видимых, подписей, плотность); полминуты
  // всё легко — уровень выше; если после повышения снова пришлось понижать — остаёмся на этом уровне до конца визита.
  function qualityTick(t, gap) {
    const q = S.q;
    if (q.fixed || S.panelId || document.hidden) { q.iv.length = 0; return; }
    if (S.gl && S.gl.busy && S.gl.busy()) { q.drawAt = 0; return; }   // печём картинки — кадры и так реже, не считаем
    if (q.drawAt && t - q.drawAt < 400) q.iv.push((t - q.drawAt) / gap);
    q.drawAt = t;
    if (q.iv.length > 120) q.iv.shift();
    if (!q.at) q.at = t;
    const n = q.iv.length; if (n < 15 || t - q.at < 2500) return;
    let sum = 0; const k = Math.min(n, 60); for (let i = n - k; i < n; i++) sum += q.iv[i];
    const r = sum / k; q.r = r;
    if (r > 1.45 && q.lv < QL.length - 1) { if (q.up && t - q.up < 60000) q.lock = true; setQuality(q.lv + 1, t); }
    else if (r < 1.12 && q.lv > 0 && !q.lock && t - q.at > 45000) { q.up = t; setQuality(q.lv - 1, t); }
  }
  function setQuality(lv, t) {
    const q = S.q; q.lv = Math.max(0, Math.min(QL.length - 1, lv)); q.iv.length = 0; q.at = t || performance.now(); q.drawAt = 0;
    const Q = QL[q.lv];
    if (S.gl && S.gl.setRes) { S.gl.setBob(Q.bob); S.gl.setRes(Q.res[S.gl.mode === 'webgl' ? 1 : 0] || 4); }
    lodPick(performance.now()); hud(); kick();
  }
  // кого из других рисовать (vis ближайших к своему герою) и кого подписывать (lab ближайших) — остальные идут «невидимо»
  function lodPick(t) {
    S.q.lodAt = t;
    const Q = QL[S.q.lv], list = [...S.others.values()];
    let ch = false;
    const set = (w, cull, nolab) => {
      if (!!w.cull !== cull || !!w.nolab !== nolab) { const back = !!w.cull && !cull; w.cull = cull; w.nolab = nolab; ch = true; if (!S.gl && w.el) { w.el.style.display = cull ? 'none' : ''; w.nm.style.display = cull || nolab ? 'none' : ''; } if (cull && w.bub) { w.bub.remove(); w.bub = null; } if (!cull) { place(w); w.shown = true; } if (back) fadeIn(w); }   // 23.10: вернулся в ближние — проявляется, а не выскакивает
    };
    const vis = S.capV > 0 ? Math.min(Q.vis, S.capV) : Q.vis;   // 24.10: зритель сам выбрал, сколько игроков рисовать (вверху слева)
    if (list.length <= Q.lab && list.length <= vis) for (const w of list) set(w, false, false);
    else {
      const cx = S.me ? S.me.x : S.camX + viewW() / 2, cy = S.me ? S.me.y : S.camY + viewH() / 2;
      list.sort((a, b) => Math.hypot(a.x - cx, (a.y - cy) * 1.5) - Math.hypot(b.x - cx, (b.y - cy) * 1.5));
      list.forEach((w, i) => set(w, i >= vis, i >= Q.lab));
    }
    if (ch) { if (S.gl) S.gl.dirty(); hud(); kick(); }
  }
  function kick() { if (S && !S.raf && !S.inFrame && (!S.gl || S.root.classList.contains('on'))) { S.last = 0; S.raf = requestAnimationFrame(frame); } }
  // Pixi: плавный сдвиг вида кнопками (в SVG-версии — CSS transition у .cy-cam); как cubic-bezier(.2, .8, .2, 1), 0,4 с
  function glide(t) {
    const g = S.glide; if (!g) return false;
    const a = Math.min(1, Math.max(0, (t - g.t0) / 400)), e = 1 - Math.pow(1 - a, 3);
    S.camX = g.x0 + (g.x1 - g.x0) * e; S.camY = g.y0 + (g.y1 - g.y0) * e;
    if (a >= 1) S.glide = null;
    applyCam();
    return true;
  }
  // Pixi не запустился или слишком медленный — город заново, прежней SVG-отрисовкой (до перезагрузки страницы)
  function glFail(why) {
    if (GLFAIL) return;
    GLFAIL = why || 'ошибка';
    console.warn('[город] Pixi отключён, рисуем SVG:', GLFAIL);
    if (!S || !S.gl) return;
    const root = S.root;
    savePos(); leave(); timers(false);
    if (S.raf) cancelAnimationFrame(S.raf);
    try { S.gl.destroy(); } catch {}
    S = null;
    if (X && root.isConnected && root.classList.contains('on')) open(root, X);
  }

  /* ===================== присутствие (сервер) ===================== */
  async function enter() {
    if (!S || S.inCity || S.entering) return;
    S.entering = X.api('/api/city/enter', { x: Math.round(S.me.x), y: Math.round(S.me.y), town: S.town || 'fair' });   // 23.10: присутствие — канал:город
    const r = await S.entering; S.entering = null;
    if (!S) return;
    if (r && !r.ok && r.error === 'town_closed' && S.town !== 'fair') { townGo('fair', 'Этот город сейчас закрыт — ты на Ярмарке'); return; }   // 23.10: доступ кончился (эфир закончился, отряд ушёл)
    if (!r || !r.ok) { hud(r && r.error ? 'Город без других игроков: ' + r.error : 'Другие игроки пока не видны — нет связи'); return; }
    S.inCity = true; S.inB = null;   // 27.10 (ov-city): вход - на улице (сервер тоже сбросил здание)
    for (const w of S.others.values()) drop(w);
    S.others.clear(); S.ghosts.clear();
    chatEnter(r);
    if (window.LGTrade) window.LGTrade.mount(X, S.el);   // 23.10: обмен между игроками
    apply(r);
    timers(true);
    if (S.goQ) flushGo();
  }
  function leave() {
    if (!S || !S.inCity) return;
    S.inCity = false;
    try { fetch((window.LG_BASE || '') + '/api/city/leave', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch {}
    if (window.LGTrade) window.LGTrade.reset();   // 23.10: ушёл из «Города» — обмен закрыт (сервер закрыл и у второго)
    for (const w of S.others.values()) drop(w);
    S.others.clear(); S.ghosts.clear(); S.n = 0; hud();
  }
  // свой шаг — на сервер (цель и где стою); чаще 300 мс — последний ждёт
  // 29.10 (city-wasd): from - [x, y] «откуда» (ходьба клавишами: прошлая отправленная точка); нет - где герой сейчас
  function sendGo(tx, ty, from) {
    S.goQ = { x: Math.round(tx), y: Math.round(ty), f: from || null };
    // шаг кликом (или E): отложенный шаг остановки клавишами больше не нужен - иначе он «остановил» бы героя посреди пути
    if (!from && S.kw) { clearTimeout(S.kw.t); S.kw.t = 0; S.kw.dirty = false; }
    if (!S.inCity) return;
    const wait = 300 - (Date.now() - S.goAt);
    if (wait > 0) { clearTimeout(S.goT); S.goT = setTimeout(flushGo, wait); return; }
    flushGo();
  }
  async function flushGo() {
    if (!S || !S.goQ || !S.inCity) return;
    const q = S.goQ; S.goQ = null; S.goAt = Date.now();
    const r = await X.api('/api/city/go', { x: q.x, y: q.y, fx: Math.round(q.f ? q.f[0] : S.me.x), fy: Math.round(q.f ? q.f[1] : S.me.y) });
    if (!S) return;
    if (r && r.ok === false && /не в городе/.test(r.error || '')) { S.inCity = false; S.goQ = q; enter(); }
    else if (r && r.ok === false && /быстро|часто/.test(r.error || '')) { S.goQ = S.goQ || q; clearTimeout(S.goT); S.goT = setTimeout(flushGo, 1500); }
  }
  // пачка изменений: a — пришли, m — шагнули, g — ушли, n — сколько других в городе; 23.10: tr / trNote / trDone — обмен между игроками (trade.js)
  function apply(d) {
    if (!S || !d) return;
    if ((d.tr !== undefined || d.trNote || d.trDone) && window.LGTrade) { window.LGTrade.mount(X, S.el); window.LGTrade.on(d.tr, d); } if (d.chat || d.chatDel || d.c != null) chatApply(d);
    if (S.hidden) { remember(d); if (d.n != null) S.n = d.n; hud(); return; }
    for (const l of d.g || []) { const w = S.others.get(l); if (w) { drop(w); S.others.delete(l); } }
    for (const e of d.a || []) {
      if (e.l === X.login()) continue;
      let w = S.others.get(e.l), fresh = false;
      if (!w) { const [nx, ny] = S.map.nearest(e.x, e.y); w = addWalker(e.l, e, nx, ny, false); S.others.set(e.l, w); fresh = true; }
      chase(w, e.x, e.y, e.tx, e.ty, +e.dt || 0, fresh);   // новенький — сразу туда, где он сейчас, и проявляется
    }
    for (const m of d.m || []) {
      const w = S.others.get(m[0]); if (!w) continue;
      chase(w, m[1], m[2], m[3], m[4], +m[5] || 0, false);
    }
    if (d.n != null) S.n = d.n;
    hud();
  }
  function hud(msg) {
    if (!S) return;
    let vis = 0; for (const w of S.others.values()) if (!w.cull) vis++;   // 22.10: убранные адаптивным качеством — в «ещё N»
    const more = Math.max(0, S.n - vis);
    const t = msg || (S.inCity ? `В городе: ${S.n + 1}${S.hidden ? (S.n ? ' · другие скрыты' : '') : more ? ` · видно ${vis}, ещё ${more}` : ''}` : 'Подключаемся к городу…');
    if (S.hud.textContent !== t) S.hud.textContent = t;   // пачки приходят чаще, чем меняется строка — DOM не трогаем зря
  }

  /* ===================== 21.10: чат «Города» (свой чат сайта, src/site/citychat.ts) ===================== */
  // Окно слева снизу поверх карты; на ПК открыто, на телефоне свёрнуто (запоминается). Новое — событием «city» (SSE) или
  // опросом state?c=<номер> без SSE. Облачко — над ником героя на несколько секунд (слой камеры: и SVG, и Pixi).
  // Чат только у тех, кому он открыт (флаг cc у героя: cityChatPublic или тестеры); остальные окна не видят вовсе.
  // 25.10: сам чат — общий модуль сайта (packages/site-ui/chat.js, window.LGChat): тот же код у чата шахты; здесь — как он живёт в «Городе»
  let CH0 = null;
  const CH = () => CH0 || (CH0 = window.LGChat ? window.LGChat.make({ state: () => S, X: () => X, base: '/api/city/chat', say: '/api/city/say', key: 'lgCityChat', name: 'Чат города', ph: 'Написать в чат города…', where: 'в чате города',
    flags: (h) => ({ on: !!(h && h.cc), tr: !!(h && h.ct), dm: !!(h && h.cd) }), trade: true,
    here: () => !!(S && S.inCity), joining: 'подключаемся к городу…', rejoin: () => enter(),
    onError: (er) => { if (/не в городе/.test(er) && S) { S.inCity = false; enter(); } },
    bubble: (l, t, id) => bubble(l, t, id), unbubble: (id) => unbubble(id) }) : null);
  const chatInit = () => { const c = CH(); if (c) c.init(); };
  const chatEnter = (r) => { const c = CH(); if (c) c.enter(r); };
  const chatApply = (d) => { const c = CH(); if (c) c.apply(d); };
  const tentMine = () => { const me = String((X && X.login && X.login()) || '').toLowerCase(); return !!me && me === chanLogin(); };   // 24.10: зритель - сам стример канала
  const chanLogin = () => { const m0 = /\/c\/([\w]+)/.exec(location.pathname); return m0 ? m0[1].toLowerCase() : ''; };
  // облачко над героем: своё и чужое (кроме «Скрыть других»); новое сообщение того же героя — заменяет старое
  function bubble(l, t, id) {
    const w = l === X.login() ? S.me : S.hidden ? null : S.others.get(l); if (!w || w.cull) return;   // 22.10: убранных качеством — без облачка
    if (!w.bub) { w.bub = document.createElement('div'); w.bub.className = 'cy-bub'; w.bub.setAttribute('aria-hidden', 'true'); w.bub.innerHTML = '<span></span>'; S.cam.appendChild(w.bub); }
    w.bub.dataset.id = id; w.bub.firstChild.textContent = [...t].length > 90 ? [...t].slice(0, 89).join('') + '…' : t;
    place(w);
    clearTimeout(w.bubT); w.bubT = setTimeout(() => { if (w.bub) { w.bub.remove(); w.bub = null; } }, Math.min(9000, 4000 + t.length * 50));
  }
  function unbubble(id) { for (const w of [S.me, ...S.others.values()]) if (w && w.bub && w.bub.dataset.id === id) { w.bub.remove(); w.bub = null; } }

  /* ===================== «Скрыть других игроков» ===================== */
  // Скрыто — чужих человечков нет совсем: ни спрайтов/DOM, ни подписей, ни путей и анимации (кадров на них не тратим).
  // Подписка на шаги остаётся (тот же живой канал сайта): помним только последнее «откуда — куда — когда» каждого,
  // чтобы при «Показать» они встали туда, где сейчас, без нового запроса к серверу.
  function remember(d) {
    const now = Date.now();
    for (const l of d.g || []) S.ghosts.delete(l);
    for (const e of d.a || []) if (e.l !== X.login()) S.ghosts.set(e.l, { e: { ...e }, at: now - (+e.dt || 0) });
    for (const m of d.m || []) { const g = S.ghosts.get(m[0]); if (g) { Object.assign(g.e, { x: m[1], y: m[2], tx: m[3], ty: m[4] }); g.at = now - (+m[5] || 0); } }
  }
  function setHidden(on) {
    if (!S || S.hidden === on) return;
    S.hidden = on; hideSet(on);
    if (on) {   // убрать всех чужих; запомнить, где стоят и куда идут
      const now = Date.now();
      for (const [l, w] of S.others) {
        const end = w.path ? w.path[w.path.length - 1] : [w.x, w.y];
        S.ghosts.set(l, { e: { ...w.v, l, x: w.x, y: w.y, tx: end[0], ty: end[1] }, at: now });
        drop(w);
      }
      S.others.clear();
      if (S.gl) S.gl.dirty();
    } else {   // вернуть: как будто пришла пачка «пришли» — догоняют свои шаги по времени
      const now = Date.now(), a = [...S.ghosts.values()].map((g) => ({ ...g.e, dt: Math.max(0, now - g.at) }));
      S.ghosts.clear();
      apply({ a });
    }
    othBtn(); hud(); kick();
  }
  function othBtn() {
    const b = S.el.querySelector('.cy-others'); if (!b) return;
    const t = S.hidden ? 'Показать других игроков' : 'Скрыть других игроков';
    b.setAttribute('aria-pressed', String(S.hidden)); b.setAttribute('aria-label', t);
    b.classList.toggle('off', S.hidden);
    b.lastChild.textContent = t;
  }
  // один таймер на 3 с, пока «Город» открыт и вкладка видна: без живого канала — спросить изменения; раз в минуту — «я тут»
  function timers(on) {
    if (!S) return;
    clearInterval(S.timer); S.timer = 0;
    if (!on) return;
    S.tick = 0;
    S.timer = setInterval(async () => {
      if (!S || !S.inCity || document.hidden) return;
      S.tick++;
      if (!X.live()) { const r = await X.api('/api/city/state' + (S.chat && S.chat.on ? '?c=' + S.chat.c : '')); if (r && r.ok) apply(r); else if (r && /не в городе/.test(r.error || '')) { S.inCity = false; enter(); } }
      else if (S.tick % 20 === 0) { const r = await X.api('/api/city/ping', {}); if (r && r.ok === false && /не в городе/.test(r.error || '')) { S.inCity = false; enter(); } }
    }, 3000);
  }

  /* ===================== ввод: клик/тап, тянуть вид, стрелки ===================== */
  function scenePt(cx, cy) { const r = S.view.getBoundingClientRect(); return [S.camX + (cx - r.left) / S.z, S.camY + (cy - r.top) / S.z]; }
  // 23.10: значок звания у ника (Pixi — ник картинкой): подсказка у значка (app.js awPop). Рамка значка — в координатах окна
  function awAt(x, y, pad) { return S.gl && S.gl.badgeAt ? S.gl.badgeAt(x, y, pad) : null; }
  function awShow(h) {
    if (!X.awPop) return;
    const r = S.view.getBoundingClientRect(), cx = r.left + (h.x - S.camX) * S.z, cy = r.top + (h.y - S.camY) * S.z, d = h.r * S.z + 2;
    X.awPop(h.a, { left: cx - d, right: cx + d, top: cy - d, bottom: cy + d }, 'cy:' + h.l + ':' + h.i);
  }
  // колесо — «своё» у элемента поверх улицы (не .cy-cam): прокручиваемый предок под курсором забирает его целиком
  // (и на краю списка вид не дёргается); окно выбора города без прокрутки тоже не двигает вид; кнопки/плашки — как улица
  function wheelOwn(e, v) {
    const t = e.target; if (!(t instanceof Element) || t === v || t.closest('.cy-cam')) return false;
    for (let n = t; n && n !== v; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) {
        const atEnd = e.deltaY > 0 ? n.scrollTop + n.clientHeight >= n.scrollHeight - 1 : e.deltaY < 0 ? n.scrollTop <= 0 : false;
        if (atEnd) e.preventDefault();   // на краю — не прокручивать страницу под окном
        return true;
      }
    }
    if (t.closest('.cy-tp')) { e.preventDefault(); return true; }   // окно выбора города без прокрутки — колесо ему, а не виду
    return false;
  }
  function bindInput() {
    const v = S.view;
    // 23.10 (зум): пальцы на виде — два пальца: щипок (масштаб вокруг середины, середина ведёт вид); поднял — ни клика, ни хода
    const fingers = new Map();
    const pinchOf = () => { const [a, b] = [...fingers.values()], r = v.getBoundingClientRect(); return { d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top }; };
    v.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !e.target.closest('button, .awb, .cy-capl')) {
        fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (fingers.size === 2) { const q = pinchOf(); S.pinch = { d0: q.d, z0: S.z, mx: q.mx, my: q.my }; S.drag = null; v.classList.remove('cy-dragging'); return; }
        if (fingers.size > 2) return;
      }
      if ((e.button !== 0 && e.button !== 2) || e.target.closest('button, .awb, .cy-capl')) return;   // 23.10: значок звания у ника — своя подсказка, не ход   // 23.10: правая кнопка — тоже «идти сюда» (как левая)
      S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cam: S.camX, camY: S.camY, moved: false };
    });
    const unfinger = (e) => { if (!fingers.delete(e.pointerId)) return; if (fingers.size < 2 && S.pinch) { S.pinch = null; S.drag = null; } };
    v.addEventListener('pointerup', unfinger); v.addEventListener('pointercancel', unfinger);
    v.addEventListener('pointermove', (e) => {
      if (fingers.has(e.pointerId)) { fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (S.pinch && fingers.size === 2) { const q = pinchOf(), P = S.pinch; S.camX += (P.mx - q.mx) / S.z; S.camY += (P.my - q.my) / S.z; P.mx = q.mx; P.my = q.my; zoomTo(P.z0 * q.d / P.d0, q.mx, q.my); clampCam(); applyCam(); return; } }
      const d = S.drag; if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; try { v.setPointerCapture(e.pointerId); } catch {} v.classList.add('cy-dragging'); }
      if (d.moved) { S.glide = null; S.camX = d.cam - dx / S.z; S.camY = d.camY - dy / S.z; clampCam(); applyCam(); S.freeUntil = Date.now() + 4000; }
    });
    const up = (e) => {
      const d = S.drag; if (!d || d.id !== e.pointerId) return;
      S.drag = null; v.classList.remove('cy-dragging');
      if (d.moved || e.type === 'pointercancel') return;
      const [x, y] = scenePt(e.clientX, e.clientY);
      const ab = e.button === 0 ? awAt(x, y, e.pointerType === 'mouse' ? 3 : 8) : null; if (ab) { awShow(ab); return; }   // 23.10: тап по значку звания — подсказка
      // 23.10: по чужому герою — меню «Предложить обмен» (если обмен открыт); иначе — как раньше
      // 24.10 (стример): мышью - только правой кнопкой (левая - просто идти); на телефоне - тапом, как было
      const wh = window.LGTrade && X.hero() && X.hero().tr && (e.pointerType !== 'mouse' || e.button === 2) ? walkerAt(x, y) : null;
      if (wh) { window.LGTrade.mount(X, S.el); window.LGTrade.menu(wh.l, wh.v, e.clientX, e.clientY); return; }
      const b = S.map.hoverAt(x, y);
      // по зданию (выше полосы, где ходят, или по прилавку), наковальне, кузнецу — зайти; по земле — идти.
      // На телефоне наведения нет — короткая подсветка с подписью на тап
      if (b) { if (e.pointerType !== 'mouse') { S.touch = true; hover(b, x, y); clearTimeout(S.hovT); S.hovT = setTimeout(() => hover(null), 1300); } goBuilding(b.id); } else goPoint(x, y);
    };
    // мышь: подсветка того, с чем можно что-то сделать (контур + подпись) — слой DOM над улицей, кадров Pixi не тратит; меняется только при смене цели
    v.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || (S.drag && S.drag.moved) || S.panelId) return;
      const [x, y] = scenePt(e.clientX, e.clientY);
      S.touch = false;
      // 23.10: мышь над значком звания у ника — подсказка (и курсор «справка»), ушла — подсказка закрывается
      const ab = awAt(x, y, 3), k = ab ? 'cy:' + ab.l + ':' + ab.i : '';
      if (k !== (S.awK || '')) { S.awK = k; v.style.cursor = ab ? 'help' : ''; if (ab) awShow(ab); else if (X.awHide) X.awHide('cy:'); }
      if (ab) { hover(null); return; }
      hover(S.map.hoverAt(x, y), x, y);
    });
    v.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover(null); if (S.awK) { S.awK = ''; v.style.cursor = ''; if (X.awHide) X.awHide('cy:'); } } });   // палец «уходит» сразу после тапа — подсветка тапа остаётся
    v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
    // 23.10: ПКМ по улице — не меню браузера, а ход героя (меню остаётся в окнах, полях ввода и на ссылках)
    v.addEventListener('contextmenu', (e) => { if (e.target.closest('input, textarea, a, [contenteditable]')) return; e.preventDefault(); });
    // 24.10 (просьба стримера): колесо мыши — ЗУМ вокруг курсора; Ctrl+колесо / щипок тачпада — тоже зум; Shift+колесо и тачпад вбок —
    // сдвиг вида вбок. В выпадающих списках, чате и окнах (выбор города, …) колесо листает их — здесь не трогаем
    v.addEventListener('wheel', (e) => {
      if (wheelOwn(e, v) || e.target.closest(WHEEL_OWN)) return;   // 23.10 city-ux: прокручиваемое поверх карты — листаем его
      e.preventDefault(); S.glide = null;
      const r = v.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      if (e.ctrlKey || e.metaKey) { zoomTo(S.z * Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.01), mx, my); return; }
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { const dx = e.shiftKey ? e.deltaY || e.deltaX : e.deltaX; S.camX += dx / S.z; clampCam(); applyCam(); S.freeUntil = Date.now() + 4000; return; }
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);   // строки / страницы — в пиксели
      zoomTo(S.z * Math.exp(-Math.max(-120, Math.min(120, dy)) * 0.0018), mx, my);   // щелчок колеса (~100) — ×0,84 / ×1,2
    }, { passive: false });
    v.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('select, input, textarea')) return;   // 24.10: стрелки в «Показывать» - выбор, а не сдвиг вида
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') { e.preventDefault(); zoomTo(S.z * (e.key === '+' || e.key === '=' ? 1.25 : 0.8)); return; }
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (k) { e.preventDefault(); pan(k[0], k[1]); } });
    S.el.addEventListener('click', (e) => {
      // кнопка «другие игроки»: переключить и на 1,6 с сказать, что теперь (на телефоне наведения нет — подсказка только так)
      if (e.target.closest('.cy-others')) {
        setHidden(!S.hidden);
        const ob = S.el.querySelector('.cy-others'); ob.lastChild.textContent = S.hidden ? 'Другие игроки скрыты' : 'Другие игроки видны'; ob.classList.add('said');
        clearTimeout(S.othT); S.othT = setTimeout(() => { if (S) { ob.classList.remove('said'); othBtn(); } }, 1600);
        return;
      }
      const zb = e.target.closest('[data-zoom]'); if (zb) { zoomTo(S.z * (+zb.dataset.zoom > 0 ? 1.25 : 0.8)); return; }
      const p = e.target.closest('[data-pan], [data-pany]'); if (p) { pan(+(p.dataset.pan || 0), +(p.dataset.pany || 0)); return; }
      const b = e.target.closest('[data-b]'); if (b && !e.target.closest('.cy-room')) { goBuilding(b.dataset.b); }
    });
  }
  // 23.10: чей герой под точкой сцены (рисунок 120×170 с ногами в x,y; масштаб — как у place); ближний к зрителю (ниже) — первым
  function walkerAt(x, y) {
    if (S.hidden) return null;
    let best = null;
    for (const w of S.others.values()) {
      if (w.cull) continue;
      const sc = scaleAt(w.y) * HS;
      if (Math.abs(x - w.x) <= 36 * sc && y <= w.y + 8 && y >= w.y - 150 * sc && (!best || w.y > best.y)) best = w;
    }
    return best;
  }
  // что делает место — в подсказке при наведении
  const ACT = { mineboard: 'кто копает лучше всех', magic: 'посохи, мантии, амулеты', anvil: 'наточить оружие', forge: 'лавка кузнеца', tent: 'примерить облик', shop: 'еда, зелья, материалы', trainer: 'дерево навыков', board: 'новости игры', gate: 'в поход — только на стриме', hall: 'скоро: оборона города', auction: 'торговля между игроками', storage: 'хранение вещей', mine: 'промысел: руда' };
  function hover(t, x, y) {
    const key = t ? t.id + '|' + t.r.join(',') : '';
    if (!S || key === (S.hovK || '')) return;
    S.hovK = key;
    const box = S.el.querySelector('.cy-hov'); if (!box) return;
    S.view.classList.toggle('hov', !!t);
    outline(t);
    if (!t) { box.classList.remove('on'); return; }
    const B = WD.BUILDINGS.find((b) => b.id === t.id) || {}, [x0, x1, y0] = t.r, top = Math.max(y0, S.camY + 20);
    const tip = box.lastChild;
    tip.textContent = `${t.what ? t.what + ' · ' : ''}${titleOf(B)} — ${(t.id === 'auction' || t.id === 'storage' || t.id === 'mine') && soonB(B) ? 'скоро: ' + (ACT[t.id] || B.sub || '') : ACT[t.id] || B.sub || ''}`;
    tip.style.cssText = `left:${x != null ? x : (x0 + x1) / 2}px;top:${(y != null ? y : top) - 26 / S.z}px`;
    box.classList.add('on');
  }
  // 20.10: обводка по силуэту (citygl.js outliner) вместо рамки: светлая золотая линия 2,5 px и мягкое свечение, появляется за 150 мс.
  // Картинка обводки — одна на цель и масштаб (готовится при первом наведении, дальше из запаса); Pixi — спрайт между фоном
  // и человечками, SVG-версия — canvas над улицей (прозрачность — CSS). Остальные здания не стоят ничего.
  function outline(t) {
    const id = t ? t.ol || t.id : '';
    S.olWant = id;
    if (!id || !S.ol) { olShow(null); return; }
    // палец: вспышка на секунду — картинку помельче (вдвое дешевле на телефоне с плотным экраном, на глаз не видно)
    const k = Math.min(S.touch ? 1.3 : 2.5, Math.max(0.3, S.z * Math.min(4, window.devicePixelRatio || 1)));
    S.ol.bake(id, k, S.z).then((e) => { if (S && S.olWant === id && !S.panelId) olShow(e); });
  }
  function olShow(e) {
    if (S.gl) { if (S.gl.outline) { S.gl.outline(e); kick(); } return; }
    const box = S.el.querySelector('.cy-ols'); if (!box) return;
    for (const c of box.children) if (c !== (e && e.c)) { c.classList.remove('on'); setTimeout(() => { if (!c.classList.contains('on')) c.remove(); }, 200); }
    if (!e) return;
    const c = e.c;
    if (c.parentNode !== box) { c.style.cssText = `left:${e.x}px;top:${e.y}px;width:${c.width / e.k}px;height:${c.height / e.k}px`; box.appendChild(c); void c.offsetWidth; }
    c.classList.add('on');
  }
  // мышь есть — силуэты размечаем заранее, когда браузер свободен (первое наведение — без задержки на разбор рисунка)
  function olWarm() {
    if (!S || !S.ol || !window.LGSiteUi.is('hover')) return;
    const s = S, go = () => { if (S === s) try { s.ol.prep(); } catch {} };
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 4000 }) : go()), 2500);
  }
  function pan(dir, dy = 0) {
    const x0 = S.camX, y0 = S.camY;
    S.camX += dir * viewW() * 0.6; S.camY += dy * viewH() * 0.6; clampCam(); S.freeUntil = Date.now() + 4000;
    if (S.gl) { S.glide = { x0, y0, x1: S.camX, y1: S.camY, t0: performance.now() }; S.camX = x0; S.camY = y0; kick(); return; }
    S.cam.classList.add('glide'); applyCam(); setTimeout(() => S && S.cam.classList.remove('glide'), 420);
  }
  function goPoint(x, y) {
    if (!S.me) return;
    closePanel(); S.el.classList.add('went');
    S.arrive = null; S.freeUntil = 0;
    const end = walkTo(S.me, x, y);
    sendGo(end[0], end[1]);
    ripple(end[0], end[1]);
  }
  function goBuilding(id) {
    const B = WD.BUILDINGS.find((b) => b.id === id); if (!B || !bOk(B) || !S.me) return;
    S.freeUntil = 0;
    if (id === 'mine') { const end = walkTo(S.me, B.door.x, B.door.y); sendGo(end[0], end[1]); closePanel(); if (!S.me.path) mineOpen(); else S.arrive = mineOpen; return; }
    // 23.10 (стройка): здание улучшается — вход закрыт: идём к двери, но внутрь не заходим, говорим, сколько осталось
    const bm = buildSay(B);
    if (bm) { closePanel(); const end = walkTo(S.me, B.door.x, B.door.y); sendGo(end[0], end[1]); S.arrive = null; hud(bm); if (X.toast) X.toast(bm); clearTimeout(S.bmT); S.bmT = setTimeout(() => S && hud(), 4000); return; }
    const end = walkTo(S.me, B.door.x, B.door.y);
    sendGo(end[0], end[1]);
    if (!S.me.path) openPanel(id); else { closePanel(); S.arrive = () => openPanel(id); }
  }
  /* ===================== 29.10 (city-wasd): ходьба клавишами WASD, E - войти ===================== */
  // Решение стримера: на компьютере - W A S D (по диагонали - две сразу, скорость та же, M.SPEED), E у двери - войти (как клик по
  // зданию: goBuilding). На телефонах ничего не меняется: клавиш нет, подсказка «E - войти» - только после первого нажатия.
  // Открыто героям с kw (cityWasdPublic или тестер). Стрелки по-прежнему двигают вид. Сквозь стены и воду не идёт: шаг - только
  // по свободному (S.map.free / clear - та же проходимость, что у пути кликом), упёрся - скользит вдоль (по одной оси).
  // Сервер: шаг (откуда - прошлая отправленная точка, куда - где герой сейчас) раз в KW_GO мс, пока идёт, и сразу при остановке
  // (не чаще KW_STOP мс после прошлого) - до 80 в минуту при лимите сервера 90 (CITY.GO_PER_MIN); другие видят его «ступеньками».
  const KW = { KeyW: [0, -1], KeyA: [-1, 0], KeyS: [0, 1], KeyD: [1, 0] };
  const KW_GO = 800, KW_STOP = 750, KW_DOOR = 120;
  const kwOn = () => !!(X && X.hero() && X.hero().kw);
  // поверх «Города» открыто окно, меню или поле ввода - клавиши ему, а не герою
  const KW_OWN = '[role="dialog"], [role="alertdialog"], [role="menu"], [aria-modal="true"]';
  function kwBusy(e) {
    if (!S || !S.me || !S.root || !S.root.isConnected || !S.root.classList.contains('on') || S.panelId || document.hidden) return true;
    if (e && (e.ctrlKey || e.metaKey || e.altKey)) return true;
    const t = e && e.target;
    if (t && t.closest && (t.closest('input, textarea, select, [contenteditable]') || t.isContentEditable)) return true;
    for (const d of document.querySelectorAll(KW_OWN)) if (d.getClientRects().length) return true;
    return false;
  }
  // ближайшее здание, у двери которого стоит герой (не дальше KW_DOOR px), - его открывает E
  function kwNear() {
    if (!S || !S.me) return null;
    let best = null, bd = KW_DOOR;
    for (const b of WD.BUILDINGS) {
      if (!b.door || !bOk(b)) continue;
      const d = Math.hypot(b.door.x - S.me.x, b.door.y - S.me.y);
      if (d <= bd) { bd = d; best = b; }
    }
    return best;
  }
  // подсказка «E - войти» у двери ближайшего здания: слой камеры, двигается transform, появляется opacity
  function kwHint() {
    if (!S || !S.cam) return;
    const b = S.kbd && !S.panelId ? kwNear() : null, id = b ? b.id : '';
    if (id === (S.ehK || '')) return;
    S.ehK = id;
    let el = S.cam.querySelector('.cy-ekey');
    if (!el) { el = document.createElement('div'); el.className = 'cy-ekey'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<kbd>E</kbd> - войти'; S.cam.appendChild(el); }
    if (b) el.style.transform = `translate(${Math.round(b.door.x)}px,${Math.round(b.door.y)}px) translate(-50%, 40px)`;
    el.classList.toggle('on', !!b);
  }
  // шаг клавишами за dt с; false - стоит (отпустил клавиши)
  function kwStep(dt) {
    const k = S.kw, w = S.me;
    if (!w || S.panelId) { kwHalt(); return false; }
    let dx = 0, dy = 0;
    for (const c of k.keys) { const v = KW[c]; if (v) { dx += v[0]; dy += v[1]; } }
    const len = Math.hypot(dx, dy);
    if (!len) { setMoving(w, false); return true; }
    const s = M.SPEED * dt, vx = dx / len * s, vy = dy / len * s, x = w.x, y = w.y;
    const ok = (a, b) => S.map.free(a, b) && S.map.clear([x, y], [a, b]);
    let nx = x, ny = y;
    if (ok(x + vx, y + vy)) { nx = x + vx; ny = y + vy; }
    // упёрся - вдоль стены: по той оси, по которой можно
    else if (vx && ok(x + vx, y)) nx = x + vx;
    else if (vy && ok(x, y + vy)) ny = y + vy;
    w.path = null; w.lag = 0; S.arrive = null;
    if (nx !== x || ny !== y) {
      if (nx !== x) w.face = nx < x ? 1 : -1;
      w.x = nx; w.y = ny; k.dirty = true;
      setMoving(w, true); place(w); w.shown = true;
      kwSync(false); kwHint();
    } else setMoving(w, false);
    return true;
  }
  function kwHalt() {
    if (!S || !S.kw) return;
    const k = S.kw;
    k.keys.clear();
    if (!k.on) return;
    k.on = false;
    if (S.me && !S.me.path) setMoving(S.me, false);
    kwSync(true); kwHint();
  }
  // свой шаг клавишами - на сервер: откуда (прошлая отправленная точка) → где сейчас
  function kwSync(stop) {
    const k = S && S.kw; if (!k || !k.dirty || !S.me) return;
    const wait = (stop ? KW_STOP : KW_GO) - (Date.now() - k.at);
    if (wait > 0) {
      if (stop && !k.t) k.t = setTimeout(() => { k.t = 0; if (S && S.kw === k && !k.on) kwSync(true); }, wait);
      return;
    }
    clearTimeout(k.t); k.t = 0;
    const from = k.last, x = Math.round(S.me.x), y = Math.round(S.me.y);
    k.last = [x, y]; k.at = Date.now(); k.dirty = false;
    sendGo(x, y, from);
  }
  function kwDown(e) {
    const v = KW[e.code];
    if ((!v && e.code !== 'KeyE') || !kwOn() || kwBusy(e)) return;
    e.preventDefault();
    S.kbd = true;
    if (e.code === 'KeyE') {
      if (e.repeat) return;
      const b = kwNear(); if (b) goBuilding(b.id);
      return;
    }
    const k = S.kw;
    if (!k.on) {
      // первая клавиша: путь кликом отменён, камера снова ведёт героя
      k.on = true; S.me.path = null; S.me.lag = 0; S.arrive = null; S.freeUntil = 0;
      if (!k.dirty) k.last = [Math.round(S.me.x), Math.round(S.me.y)];
      S.el.classList.add('went');
    }
    k.keys.add(e.code);
    kick();
  }
  function kwUp(e) {
    if (!S || !S.kw || !KW[e.code]) return;
    S.kw.keys.delete(e.code);
    if (!S.kw.keys.size) kwHalt();
  }
  document.addEventListener('keydown', kwDown);
  document.addEventListener('keyup', kwUp);
  // окно потеряло фокус (Alt+Tab) - keyup не придёт: остановиться
  window.addEventListener('blur', () => kwHalt());
  document.addEventListener('visibilitychange', () => { if (document.hidden) kwHalt(); });

  // кружок там, куда идём (CSS-анимация один раз)
  function ripple(x, y) {
    if (S.gl) { S.gl.ripple(x, y); kick(); return; }
    const r = document.createElement('i'); r.className = 'cy-rip'; r.style.left = x + 'px'; r.style.top = y + 'px'; r.style.zIndex = String(Math.round(y) - 1);
    S.walk.appendChild(r); setTimeout(() => r.remove(), 700);
  }

  /* ===================== здания: заходим внутрь — локация на весь экран ===================== */
  // Интерьер — сцена 1920×1080 (у Кузни и Шатра — те же, что на стриме: styles/<стиль>/fair.js rooms; у остальных — cityart.room),
  // в ней свой герой и продавец, поверх — интерфейс места (ПК — сбоку, телефон — снизу). «Выйти» — обратно на улицу к двери.
  // Пока открыта локация, улица не рисуется (visibility: hidden) — браузер её не перерисовывает.
  const ROOM = {   // где в сцене стоят герой и продавец (ноги, координаты 1920×1080), куда смотреть (focus), с какой стороны интерфейс
    forge: { hero: [1872, 1076], k: 1.2, focus: 1300, ui: 'l', fit: true },   // герой — справа у горна, не закрывает полки и витрины; fit — все три стенда видны целиком
    magic: { hero: [1872, 1076], k: 1.2, focus: 1300, ui: 'l', fit: true },   // 23.10: магическая лавка — как Кузня (стенды, витрины, звездочёт за прилавком)
    // 20.10: заточка — кусок улицы у наковальни под навесом Кузни (×2): кузнец — тот, что на Ярмарке; сцена ударов — над настоящей наковальней
    anvil: { hero: [1470, 1040], k: 2, focus: 1000, ui: 'l', art: 'street', say: [1450, 650] },   // реплика — правее и ниже кузнеца: не на вывесках
    tent: { hero: [1800, 1074], k: 1.35, focus: 1250, ui: 'l', fit: true },    // у зеркала, не закрывает кабинки; fit — все кабинки видны (21.10)
    shop: { hero: [880, 1060], k: 1.6, npc: [1440, 860, 'Лавочница', 'happy', {}, { hat: 'chef' }], focus: 1150, ui: 'l', art: 'shop', fit: true },   // fit — левые полки не под панелью (21.10)
    trainer: { hero: [1640, 1040], npc: [240, 1040, 'Тренер', 'stern', { armed: true, gear: { w: 'gladius' } }, { hat: 'bandana' }], focus: 960, ui: 'o', art: 'trainer' },
    board: { hero: [1850, 1076], k: 1.3, focus: 960, ui: 'o', art: 'board' },
    hall: { hero: [760, 1010], npc: [1240, 1010, 'Мастер-строитель', 'happy', {}, { hat: 'cap' }], focus: 1000, ui: 'l', art: 'plain' },
    auction: { hero: [760, 1010], npc: [1240, 1010, 'Аукционист', 'happy', {}, { hat: 'tophat' }], focus: 1000, ui: 'l', art: 'plain' },
    storage: { hero: [760, 1010], npc: [1260, 1010, 'Кладовщик', 'happy', {}, { hat: 'cap' }], focus: 1000, ui: 'l', art: 'storage', keep: 250 },   // 22.10; 23.10: keep — вывеска (верх 260) не уходит за край окна и под шапку
    gate: { hero: [760, 1010], npc: [1240, 1010, 'Страж ворот', 'stern', { armed: true, gear: { w: 'spear', s: 'scutum' } }, { hat: 'legion' }], focus: 1000, ui: 'l', art: 'plain' },
  };
  // 23.10 (решение стримера): лавки — на весь экран, без панели слева: интерьер с полками во всё окно (телефон — по высоте,
  // вбок — прокрутка внутри лавки), сверху — тонкая полоса (кошелёк, сумка, «К наковальне»), реплика продавца — снизу справа
  const FULL = { forge: 1, magic: 1, tent: 1, shop: 1 };
  let STOCK = null;   // товар Кузни и Шатра (тот же, что на стриме) — один раз за открытие города
  const loadStock = () => (STOCK ? Promise.resolve(STOCK) : X.api('/api/city/stock').then((r) => { if (r && r.ok) STOCK = r; return STOCK; }).catch(() => null));
  // 22.10: сцена «во всю ширину» (ROOM.fit) ниже окна — над ней место. Раньше — ровная заливка с размытым стыком, и верх
  // сцены обрывался. Теперь стена продолжается вверх: полоска сцены у самого верха (y 4…6) растянута вверх на WALL_UP —
  // гофра, скотч, столбы света, труба горна, верёвки вывески идут дальше без стыка. Рисуется один раз (статичный SVG).
  const WALL_UP = 2400;
  const ROOM_HEAD = 64;   // 23.10: шапка зала (название и «Выйти», city.css .cy-rh) — столько сверху окна закрыто
  const WALL_S = (WALL_UP + 4) / 2, WALL_TY = -WALL_UP - 4 * WALL_S;
  // 23.10 (баг от зрителя): товар под мышью — контур самой вещи (группа data-it у рисунка стиля, fair.js), а не рамка поверх ценников.
  // Альфа рисунка порогом (полупрозрачные ореолы и свечение редкости не обводятся) → расширить → золотая обводка и мягкий свет вокруг
  const OL_DEFS = '<defs>' + [['cy-itol', '#ffe9a0', 0.55], ['cy-itol2', '#ffc94d', 0.8]].map(([id, c, o]) => `<filter id="${id}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feComponentTransfer in="SourceAlpha" result="a"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer><feMorphology class="cy-olm" in="a" operator="dilate" radius="4" result="d"/><feFlood flood-color="${c}"/><feComposite in2="d" operator="in" result="o"/><feGaussianBlur in="o" stdDeviation="4" result="b"/><feComponentTransfer in="b" result="g"><feFuncA type="linear" slope="${o}"/></feComponentTransfer><feMerge><feMergeNode in="g"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`).join('') + '</defs>';
  const doodSize = (r, street) => r.querySelectorAll(street ? '.cy-rbg svg svg.jl-doodle' : '.cy-rbg svg.jl-doodle').forEach((d) => { const w = d.getAttribute('width'), hh = d.getAttribute('height'); if (w) d.style.width = parseFloat(w) + 'px'; if (hh) d.style.height = parseFloat(hh) + 'px'; if (street) { d.style.position = 'static'; d.style.filter = 'none'; } });
  function roomSvg(id) {
    const inner = OL_DEFS + roomBg(id);
    if (!ROOM[id] || !ROOM[id].fit) return inner;
    return `<defs><clipPath id="cy-wall-top" clipPathUnits="userSpaceOnUse"><rect x="0" y="4" width="1920" height="2"/></clipPath></defs>`
      + `<g id="cy-room-scene">${inner}</g><use href="#cy-room-scene" clip-path="url(#cy-wall-top)" transform="translate(0 ${WALL_TY}) scale(1 ${WALL_S})"/>`;
  }
  function roomBg(id) {
    const R = ROOM[id], L = S.L;
    if (R.art === 'street') return streetBg();
    try {
      if (!R.art && L.rooms && L.rooms[id] && typeof L.rooms[id].svg === 'function') {
        const st = shopView(id, stockOf(id)) || (id === 'forge' || id === 'magic' ? { stands: [], shelf1: [], shelf2: [], case: [], mats: [] } : { booths: [], amulets: [] });
        S.itemPos = {};   // 23.10: где на полках какая вещь — туда кладём кнопки товара (наведение — карточка, двойной клик — купить)
        return `<rect width="1920" height="1080" fill="${esc(L.rooms[id].artBg || '#1d1626')}"/>` + scopeIds(still(npcAs(hwDead() ? 'ghost' : '', () => L.rooms[id].svg(st, S.itemPos))), 'cyr-');   // 28.10 (hw-npc-ghosts)
      }
    } catch (e) { console.warn('[город] интерьер', id, e); }
    return scopeIds(ART.room(S.st, R.art || 'plain'), 'cyr-');
  }
  // кусок улицы вокруг наковальни (мир x QW−330…QW+630, y 430…970) в масштабе 2 — наковальня в (960, 660) сцены
  const ANV0 = { ox: M.QW - 330, oy: 430, k: 2 };
  function streetBg() {
    // 23.10: город округа — наковальня у его Кузни (towngen.js: anvil.x, низ 810 — как у Ярмарки), предметы — свои, Ярмарки нет
    const ANV = inTown() ? { ox: TOWN.L.anvil.x - 480, oy: 430 + (TOWN.L.anvil.oy || 0), k: 2 } : ANV0;   // 23.10 (ярусы): Кузня может быть на нижнем ярусе
    let sky = '';
    try { sky = window.LGCityGL && window.LGCityGL.skyDef ? window.LGCityGL.skyDef(S.sky, WD.H) : ''; } catch {}
    const props = (S.qprops || []).filter((p) => p.x < ANV.ox + 960 && p.x + p.w > ANV.ox).map((p) => `<svg x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible">${scopeIds(p.svg(), S.qpfx || 'cyq-')}</svg>`).join('');
    const fp = inTown() ? '' : (S.L.props || []).filter((p) => !p.divider && p.x < 630 && p.x + p.w > -330).map((p, i) => `<svg x="${p.x + M.QW}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible">${scopeIds(p.svg(), 'cyp' + i + '-')}</svg>`).join('');
    // удар кузнеца — его же покачивание со стрима (rotate 0…−7…4, у всех стилей одно), но не по кругу, а по команде на каждый удар (FX.strike)
    const SM = /<animateTransform attributeName="transform" type="rotate" values="0;-7;-7;4;0;0"[^>]*\/>/;
    const street = S.street.join('').replace(SM, '@@SMITH@@');
    const art = still(street).replace('@@SMITH@@', '<animateTransform data-smith="1" attributeName="transform" type="rotate" values="0;-7;-7;4;0;0" keyTimes="0;.3;.45;.55;.7;1" dur=".9s" begin="indefinite" fill="remove"/>');
    return scopeIds(`<g transform="scale(${ANV.k}) translate(${-ANV.ox} ${-ANV.oy})">${sky ? `<defs>${sky}</defs><rect x="${ANV.ox}" y="${ANV.oy}" width="960" height="540" fill="url(#cyglsky)"/>` : ''}${art}${props}${fp}</g>`, 'cyr-');
  }
  const fig = (x, y, svg, k = 2, cls = '') => `<div class="cy-fig2 ${cls}" style="left:${x - 60 * k}px;top:${y - 170 * k}px;width:${120 * k}px">${svg}</div>`;
  // 27.10 (ov-city): зашёл в здание / вышел - серверу (POST /api/city/in): на оверлее канала герой пропадает и появляется у двери.
  // Только настоящие здания (наковальня, доска объявлений, ворота - на улице: герой виден)
  const INDOOR = { forge: 1, tent: 1, shop: 1, storage: 1, magic: 1, hall: 1, auction: 1, trainer: 1 };
  function inSay(id) {
    const b = id && INDOOR[id] ? id : null;
    if (!S || !S.inCity || (S.inB || null) === b) return;
    S.inB = b;
    try { Promise.resolve(X.api('/api/city/in', { b })).catch(() => {}); } catch {}
  }
  function closePanel() {
    newsClose();   // 22.10: ушёл от доски — и новость закрылась
    if (!S || S.panelId == null) return;
    const was = S.panelId;
    S.panelId = null; inSay(null); X.forgeClose && X.forgeClose(); FX.reset(); if (X.tipHide) X.tipHide(); igOff(); stOff();
    if (was === 'auction' && window.LGAuction) window.LGAuction.close();
    if (was === 'tent' && tentMine()) { try { X.api('/api/tentShop', { on: false }); } catch (e) {} }   // 24.10: стример вышел из Будуара - награды за баллы убираются
    S.view.style.visibility = '';
    for (const w of [S.me, ...S.others.values()]) if (w) { place(w); w.shown = true; }
    if (S.gl) { S.gl.dirty(); kick(); }
    const r = S.room; r.classList.remove('in');
    setTimeout(() => { if (S && S.panelId == null) { r.hidden = true; r.innerHTML = ''; } }, reduce() ? 0 : 260);
    try { S.view.focus({ preventScroll: true }); } catch {}
    if (was) kick();
  }
  function openPanel(id) {
    if (!S || !IDS[id]) return;
    { const B0 = WD.BUILDINGS.find((b) => b.id === id); if (B0 && buildSay(B0)) return; }   // 23.10 (стройка): на стройке — не заходим
    if (id === 'mine') { mineOpen(); return; }
    if (id === 'hwshop' || id === 'hwpass') { hwOpen(id); return; }   // HW-NPC: окна лавки и пасса - поверх города (hwnpc.js)
    if (id === 'mineboard') { if (X.openMineBoard) X.openMineBoard(); return; }   // 23.10: доска итогов шахты — окно поверх города   // 23.10: шахта — своя локация (mine.js), не зал «Города»
    // 23.10: сайт обновили, а страница старая (app.js LG_VER) — перезагрузить на свежий код, а не открывать старую лавку
    const V = window.LG_VER; if (V) { if (V.old() && V.reload()) return; V.check(); }
    hover(null);
    const B = WD.BUILDINGS.find((b) => b.id === id), h = X.hero(), R = ROOM[id];
    if (S.panelId === 'anvil' || id === 'anvil') { FX.reset(); X.forgeClose && X.forgeClose(); }   // новая сцена Кузни — с чистого листа
    const fresh = S.panelId == null;
    if (S.panelId === 'tent' && id !== 'tent' && tentMine()) { try { X.api('/api/tentShop', { on: false }); } catch (e) {} }
    S.panelId = id; inSay(id);
    if (id === 'tent' && tentMine()) { try { X.api('/api/tentShop', { on: true }); } catch (e) {} }   // 24.10: стример зашёл в Будуар - награды за баллы Шатра на Twitch
    const r = S.room;
    r.dataset.b = id; r.dataset.ui = FULL[id] ? 'f' : R.ui;
    r.classList.toggle('cy-hwd', hwDead());   // 28.10 (hw-npc-ghosts): «Заточка» (кусок улицы) - кузнец-призрак
    const hero = h ? fig(R.hero[0], R.hero[1], still(X.doodle(X.login(), X.heroLook(h), 'happy', 'peace')), R.k || 2.1, 'me') : '';
    const npcF = R.npc ? fig(R.npc[0], R.npc[1], npc(R.npc[2], R.npc[3], R.npc[4], R.npc[5]), 2.1, 'npc') : '';
    const hello = FULL[id] ? '' : helloOf(id);
    r.innerHTML = `<div class="cy-rs"><div class="cy-rsz"></div><div class="cy-rin"><svg class="cy-rbg" width="1920" height="1080" viewBox="0 0 1920 1080" overflow="visible" aria-hidden="true">${roomSvg(id)}</svg>${npcF}${id === 'anvil' ? forgeStage() : ''}${hero}${hello ? `<p class="cy-rsay" style="left:${(R.say ? R.say[0] : R.npc ? R.npc[0] : 1400)}px;top:${(R.say ? R.say[1] : R.npc ? R.npc[1] - 420 : 330)}px">${esc(hello)}</p>` : ''}</div></div>
      <header class="cy-rh"><h2><span aria-hidden="true">${B.icon}</span>${esc(titleOf(B))}</h2><button type="button" class="btn cy-exit" data-cyexit>Выйти</button></header>
      ${FULL[id] ? `<div class="cy-rui cy-rbar"><div class="cy-pb">${body(id, h)}</div></div><p class="cy-rsay2" role="status">${esc(siteSay(id, h))}</p>` : `<div class="cy-rui panel"><div class="cy-pb">${body(id, h)}</div></div>`}`;
    S.panel = r.querySelector('.cy-rui');
    // «Заточка» — кусок улицы: вложенные человечки Ярмарки (кузнец) — размер из атрибутов, как на улице (иначе .jl-doodle{width:100%} раздувает их)
    // 23.10: и образцы кабинок Шатра (человечки-манекены) — с width:auto их раздувало до 1920×1080, на сцене их не было видно
    doodSize(r, R.art === 'street');
    r.hidden = false;
    r.querySelector('[data-cyexit]').onclick = closePanel;
    goodsHots(id);   // 23.10: товар на полках — наведение / нажатие / двойной клик
    if (fresh) { void r.offsetWidth; r.classList.add('in'); setTimeout(() => { if (S && S.panelId) S.view.style.visibility = 'hidden'; }, 280); }
    S.roomScroll = null;   // телефон: лавка шире экрана — сначала показываем полки с товаром (слева)
    S.roomUser = false;    // 23.10: зритель сам листал сцену зала — подгонка размера его вид не сбивает
    { const rs = r.querySelector('.cy-rs'); if (rs) { for (const ev of ['pointerdown', 'wheel', 'touchstart', 'keydown']) rs.addEventListener(ev, () => { if (S) S.roomUser = true; }, { passive: true }); roomPinch(rs); } }
    S.roomZ = 1; S.roomK = null;   // 23.10: зум лавки — с обычного
    { const sy = r.querySelector('.cy-rsay2'); if (sy) { clearTimeout(S.sayT); S.sayT = setTimeout(() => sy.classList.add('off'), 9000); sy.onclick = () => sy.classList.add('off'); } }
    r.scrollTop = 0;
    after(id, h);
    fitRoom();
    // интерфейс меняет высоту (товар пришёл, выбрали навык) — сцена подстраивается
    try { if (S.roomRO) S.roomRO.disconnect(); S.roomRO = new ResizeObserver(() => fitRoom()); S.roomRO.observe(S.panel); } catch {}
    if (fresh) try { r.querySelector('[data-cyexit]').focus({ preventScroll: true }); } catch {}
    // товар для полок — один раз; пришёл — перерисовать фон (полки Кузни и кабинки Шатра — как на стриме)
    if (!STOCK && (id === 'forge' || id === 'tent' || id === 'magic' || id === 'shop')) loadStock().then((st) => { if (st && S && S.panelId === id) { const bg = S.room.querySelector('.cy-rbg'); if (bg && id !== 'shop') { bg.innerHTML = roomSvg(id); doodSize(S.room, false); } goodsHots(id); if (id === 'forge' || id === 'magic' || id === 'shop') rerenderUi(id); } });
  }
  // сцена 1920×1080 «по размеру»: заполняет место, свободное от интерфейса; герой и продавец — в середине этого места
  function fitRoom() {
    if (!S || !S.panelId) return;
    const r = S.room, inn = r.querySelector('.cy-rin'), ui = r.querySelector('.cy-rui'), R = ROOM[S.panelId]; if (!inn || !ui) return;
    const vw = r.clientWidth || innerWidth, vh = r.clientHeight || innerHeight, ur = ui.getBoundingClientRect(), mob = vw <= 720 || vh <= 500;   // как в city.css (max-width: 720px; телефон боком — max-height: 500px)
    if (FULL[S.panelId]) { fitFull(r, inn, vw, vh, mob, R); return; }
    let x0 = 0, x1 = vw, y1 = vh;
    if (mob) y1 = Math.max(160, vh - ur.height);
    else if (R.ui === 'l') x0 = ur.right; else if (R.ui === 'r') x1 = ur.left;   // 'o' — интерфейс поверх доски в самой сцене
    let k = mob ? Math.max(y1 / 1080, vw / 1920) : Math.max(vw / 1920, vh / 1080);
    let left, top;
    // 21.10: fit — вся ширина сцены в месте рядом с интерфейсом (полки Кузни не уходят под панель); сверху остаётся стена цвета artBg.
    // Не мельче 0.6 высоты окна: на узком окне лучше отрезать край, чем показать крошечную сцену
    if (R.fit && !mob) {
      k = Math.max(Math.min(k, (x1 - x0) / 1920), 0.6 * vh / 1080);
      const w = 1920 * k;
      left = w <= x1 - x0 ? x0 + (x1 - x0 - w) / 2 : Math.min(x0, Math.max(x1 - w, (x0 + x1) / 2 - R.focus * k));
      top = y1 - 1080 * k;   // пол — у низа окна
    } else {
      left = (x0 + x1) / 2 - R.focus * k; left = Math.min(0, Math.max(vw - 1920 * k, left));
      top = Math.min(0, y1 - 1080 * k);
      if (R.keep) top = Math.min(0, Math.max(top, ROOM_HEAD - R.keep * k));   // 23.10: не срезать сцену выше keep (вывеска) — пол чуть ниже края, герой виден
    }
    // цвет стены над сценой: artBg стиля (Кузня, Шатёр), иначе — фон самой сцены (первый прямоугольник во всю ширину: Лавка из cityart)
    let bg = R.fit && !mob && top > 0 && ((S.L.rooms && S.L.rooms[S.panelId] && S.L.rooms[S.panelId].artBg) || '');
    if (R.fit && !mob && top > 0 && !bg) { const rc = r.querySelector('.cy-rbg rect[width="1920"]'), f = rc && rc.getAttribute('fill'); if (f && /^#[\da-f]{3,8}$/i.test(f)) bg = f; }
    r.classList.toggle('cy-fit', !!bg); r.style.setProperty('--cy-fitbg', bg || 'transparent');
    panRoom(r, inn, k, left, top, 0, vw, R.keep ? ROOM_HEAD : 0, y1, vw, vh);   // место — окно (под панелью сбоку сцена и раньше была закрыта панелью)
  }
  /* 23.10 (баг с телефона): сцена не влезла в своё место (узкое окно, телефон) — край интерьера раньше просто срезался, без
     способа его увидеть. Теперь срезанное можно досмотреть прокруткой внутри зала (палец — вбок, мышь — колесо / полоса):
     сначала — тот же вид, что раньше (left, top), а прокрутка доходит до любого края сцены в месте [x0…x1]×[y0…y1].
     Страница сама не прокручивается (зал — position: fixed). Влезла целиком — без прокрутки, как было */
  function panRoom(r, inn, k, left, top, x0, x1, y0, y1, vw, vh) {
    const rs = r.querySelector('.cy-rs'), sz = r.querySelector('.cy-rsz'), w = 1920 * k, h = 1080 * k;
    const ox = Math.min(0, left - x0), oy = Math.min(0, top - y0);   // насколько сцена ушла за левый / верхний край места
    const bx = left - ox, by = top - oy;   // положение сцены при прокрутке 0
    // 23.10 (с телефона, Тренер): лишние несколько пикселей (сцена чуть шире / выше места) — не прокрутка, а обрезка: раньше зал
    // «дрожал» вбок на 2–20 px, как будто сломан
    const sx0 = Math.max(0, Math.max(bx + w - x1, -ox)), sy0 = Math.max(0, Math.max(by + h - y1, -oy));
    const sx = sx0 < 24 ? 0 : sx0, sy = sy0 < 24 ? 0 : sy0;   // сколько прокручивать
    const pan = sx > 1 || sy > 1;
    if (rs) { rs.classList.toggle('cy-pan', pan); rs.style.overflowX = pan && !sx ? 'hidden' : ''; rs.style.overflowY = pan && !sy ? 'hidden' : ''; }   // листается только туда, где есть что листать
    if (!pan || !rs || !sz) {
      if (sz) { sz.style.width = '0'; sz.style.height = '0'; }
      inn.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) scale(${k.toFixed(4)})`;
      return;
    }
    sz.style.width = Math.ceil(vw + sx) + 'px'; sz.style.height = Math.ceil(vh + sy) + 'px';
    inn.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) scale(${k.toFixed(4)})`;
    if (!S.roomUser) { rs.scrollLeft = Math.round(-ox); rs.scrollTop = Math.round(-oy); }   // пока зритель сам не листал — прежний вид
  }
  // лавка на весь экран: ПК и телефон боком — вся сцена целиком, телефон стоя — по высоте места под шапкой, вбок — прокрутка
  /* 23.10 (с телефона стримера): сцена — ПОД шапкой лавки (название, «Выйти», кошелёк, сумка — раньше закрывали
     таблички стендов «Котоармеец», «Рогаточник»…). ПК и телефон боком — вся сцена в окне (по меньшей стороне, края — цветом стены).
     Телефон стоя — по высоте места под шапкой, вбок — прокрутка внутри лавки (как в Будуаре котиков — она удобная); но колонка товара
     (стенд Кузни / магической лавки, кабинка Шатра) не шире экрана: шире — сцена мельче, чтобы колонка влезала целиком, по вертикали — по центру
     (пустота — цветом стены), и листание останавливается на колонках (scroll-snap). Щипок / Ctrl+колесо — приблизить товар (S.roomZ). */
  function roomHead(r) {
    const rr = r.getBoundingClientRect(); let b = 0;
    for (const el of r.querySelectorAll('.cy-rh, .cy-rui.cy-rbar .cy-bar2')) { const q = el.getBoundingClientRect(); if (q.height) b = Math.max(b, q.bottom - rr.top); }
    return Math.round(b + 6);
  }
  // колонки товара в сцене (x0…x1, координаты 1920×1080): стенды Кузни и магической лавки (stands). Шатёр (кабинки) и Лавка — как были
  function roomCols(id) {
    const pos = S.itemPos || {}, st = stockOf(id) || {}, groups = [];
    const at = (list) => (list || []).map((it) => it && pos[it.id]).filter(Boolean);
    for (const s of st.stands || []) groups.push(at([...(s.top || []), ...(s.mid || []), ...(s.case || [])]));
    const cols = groups.filter((g) => g.length).map((g) => [Math.min(...g.map((p) => p.x)) - 150, Math.max(...g.map((p) => p.x)) + 150]);
    return cols.map(([a, b]) => [Math.max(0, a), Math.min(1920, b)]).sort((a, b) => a[0] - b[0]);
  }
  function fitFull(r, inn, vw, vh, mob, R) {
    const rs = r.querySelector('.cy-rs'), sz = r.querySelector('.cy-rsz');
    const bg = (S.L.rooms && S.L.rooms[S.panelId] && S.L.rooms[S.panelId].artBg) || ((r.querySelector('.cy-rbg rect[width="1920"]') || { getAttribute: () => '' }).getAttribute('fill')) || '#15122e';
    r.classList.add('cy-fit'); r.style.setProperty('--cy-fitbg', /^#[\da-f]{3,8}$/i.test(bg) ? bg : '#15122e');
    const head = roomHead(r), avail = Math.max(120, vh - head), zr = S.roomZ || 1;
    const port = mob && vh > vw;
    let k, cols = [];
    if (port) {
      k = Math.max(avail / 1080, vw / 1920);
      cols = roomCols(S.panelId);
      const cw = cols.length ? Math.max(...cols.map((c) => c[1] - c[0])) : 0;
      if (cw && cw * k > vw - 12) k = Math.max(vw / 1920, (vw - 12) / cw);
    } else k = Math.min(vw / 1920, avail / 1080);
    const k0 = k; k *= zr;
    const w = 1920 * k, h = 1080 * k;
    const left = w < vw ? (vw - w) / 2 : 0, top = head + Math.max(0, (avail - h) / 2);
    const pan = w > vw + 1 || top + h > vh + 1;
    if (rs) { rs.classList.toggle('cy-pan', pan); rs.classList.toggle('cy-snap', port && zr === 1 && cols.length > 1); }
    if (sz) { sz.style.width = (pan ? Math.ceil(Math.max(vw, left + w)) : 0) + 'px'; sz.style.height = (pan ? Math.ceil(Math.max(vh, top + h)) : 0) + 'px'; }
    inn.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) scale(${k.toFixed(4)})`;
    S.roomK = { k, k0, left, top };
    // точки остановки листания — середины колонок (телефон стоя)
    if (rs) { let sn = rs.querySelector('.cy-snaps'); if (!sn) { sn = document.createElement('div'); sn.className = 'cy-snaps'; sn.setAttribute('aria-hidden', 'true'); rs.appendChild(sn); }
      sn.innerHTML = port && zr === 1 ? cols.map(([a, b]) => `<i style="left:${Math.round(left + a * k)}px;width:${Math.round((b - a) * k)}px"></i>`).join('') : ''; }
    if (rs && S.roomScroll == null) { S.roomScroll = 1; rs.scrollLeft = port && cols.length ? Math.max(0, Math.round(cols[0][0] * k - (vw - (cols[0][1] - cols[0][0]) * k) / 2)) : 0; rs.scrollTop = 0; }   // товар — слева (первая колонка целиком)
  }
  // 23.10: зум внутри лавки — щипок двумя пальцами / Ctrl+колесо: масштаб вокруг точки, сцена листается в обе стороны (1…3×)
  function roomZoom(z, cx, cy) {
    const rs = S.room.querySelector('.cy-rs'), K = S.roomK; if (!rs || !K) return;
    z = Math.max(1, Math.min(3, z)); if (Math.abs(z - (S.roomZ || 1)) < 0.005) return;
    const rr = rs.getBoundingClientRect(), mx = cx - rr.left, my = cy - rr.top;
    const sx = (rs.scrollLeft + mx - K.left) / K.k, sy = (rs.scrollTop + my - K.top) / K.k;   // точка сцены под пальцами
    S.roomZ = z; S.roomUser = true; fitRoom();
    const N = S.roomK; rs.scrollLeft = Math.round(sx * N.k + N.left - mx); rs.scrollTop = Math.round(sy * N.k + N.top - my);
  }
  function roomPinch(rs) {
    let P = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    rs.addEventListener('touchstart', (e) => { if (e.touches.length === 2) P = { d: dist(e.touches), z: S.roomZ || 1 }; }, { passive: true });
    rs.addEventListener('touchmove', (e) => { if (!P || e.touches.length !== 2 || !S) return; e.preventDefault(); roomZoom(P.z * dist(e.touches) / P.d, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2); }, { passive: false });
    rs.addEventListener('touchend', (e) => { if (e.touches.length < 2) P = null; }, { passive: true });
    // ПК: колесо над сценой лавки — зум (24.10, как на улице); Shift+колесо — листать вбок; Ctrl+колесо / щипок тачпада — зум
    rs.addEventListener('wheel', (e) => {
      if (!S || !FULL[S.panelId] || !S.roomK || e.shiftKey || (!(e.ctrlKey || e.metaKey) && Math.abs(e.deltaX) > Math.abs(e.deltaY))) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      roomZoom((S.roomZ || 1) * Math.exp(-Math.max(-120, Math.min(120, dy)) * (e.ctrlKey || e.metaKey ? 0.01 : 0.0018)), e.clientX, e.clientY);
    }, { passive: false });
  }
  window.addEventListener('resize', () => fitRoom());
  // приветствие продавца — из стиля (те же реплики, что на стриме), иначе — своё
  function helloOf(id) {
    if (id === 'anvil') {   // у наковальни — свои реплики (у стиля реплики — для лавки Кузни)
      const h = X.hero();
      if (!h || !h.ef) return 'Скоро открою мастерскую — заточку вещей. Загляни позже!';
      return ['Клади на наковальню — подточим!', 'Звезда — к удаче, сфера — от поломки. Что точим?', 'Горн разогрет. Выбирай вещь!'][Math.floor(Math.random() * 3)];
    }
    const RR = S.L.rooms && S.L.rooms[id], pick = (a) => (Array.isArray(a) && a.length ? String(a[Math.floor(Math.random() * a.length)]) : '');
    const n = (X.hero() && X.hero().name) || X.login();
    const t = RR && pick(RR.hello);
    if (t) return t.replace(/\{n\}/g, n);
    if (id === 'auction' && auOpen()) return `Добро пожаловать, ${n}! Покупай, продавай — монеты продавцу, вещь тебе, всё честно.`;
    if (id === 'hall' && inTown() && TOWN.acc && !TOWN.acc.own) return 'Ратуша не для чужих. Захватите округ — тогда и поговорим.';   // 23.10: чужой округ
    if (id === 'storage') return stOpen() ? `Заходи, ${n}! Что положим на полку, что заберём?` : 'Склад скоро откроется — будет где хранить вещи, когда сумка полна.';
    return { shop: `Заходи, ${n}! Еда лечит раны, зелья — быстрее.`, hall: 'Добро пожаловать в Ратушу! Всё, что сдают скупщику шахты этого города, - на нашем складе.', auction: 'Аукцион откроется позже — торговать будем вещами, звёздами и печатями.', gate: 'В поход отсюда не выйти — отряд собирает стример на стриме.' }[id] || '';
  }
  // 23.10: реплика продавца в лавках «Города» — под сайт (не «номер в чат»): клик, «Купить? Да / Нет»; облик — за баллы на стриме
  function siteSay(id, h) {
    if (!h) return 'Героя пока нет — он появится, когда ты напишешь в чат на стриме.';
    if (id === 'tent') return 'Нажми на образец — примерю на тебе. Своё из гардероба — «Надеть», новое купить можно на стриме, за баллы канала.';
    const buy = csOn() ? 'Нажми на вещь — покажу, что даёт; ещё раз (или двойной клик) — «Купить? Да / Нет».' : 'Нажми на вещь — покажу, что даёт. Купить можно на стриме, за баллы канала.';
    if (id === 'forge') return 'Оружие и доспехи — на стойках. ' + buy;
    if (id === 'magic') return 'Посохи, мантии, амулеты, звёзды и сферы — на полках. ' + buy;
    return 'Еда лечит раны, зелья — быстрее. ' + buy;
  }
  const npc = (seed, mood, extra, look) => { try { const gh = hwDead(); const v = still(D().jDoodle(D().jhash(seed), mood, false, gh ? { ...(extra || {}), ghost: true } : extra || {}, look)); return gh ? ghostSvg(v) : v; } catch { return ''; } };   // 28.10 (hw-npc-ghosts): в хэллоуинском виде - призрак
  const say = (t) => `<p class="cy-say">${esc(t)}</p>`;
  function body(id, h) {
    if (id === 'hall' && inTown() && TOWN.acc && !TOWN.acc.own) return `${say('Ратуша закрыта: этот округ не принадлежит каналу. Стража пускает только своих.')}<p class="note">Захватите округ на стриме — Ратуша откроется (и цены в лавках станут обычными).</p>`;   // 23.10: quest/towns.js townRoom
    if (id === 'hall') return `${say('Склад Ратуши: сюда скупщик шахты этого города свозит всё, что сдали игроки. Потратить на город можно будет позже.')}<div class="cy-hall" aria-busy="true"><p class="note">Писарь листает книгу склада…</p></div><p class="note">Скоро: город можно будет укреплять всем каналом — и защищать от набегов.</p>`;   // 24.10: склад города
    if (id === 'auction' && h && h.au) return '<div class="au-root" aria-busy="true"><p class="note">Аукционист раскладывает лоты…</p></div>';
    if (id === 'auction') return `${say('Аукцион скоро откроется: здесь игроки будут продавать и покупать вещи, звёзды, сферы и печати.')}<p class="note">Пока торговать можно только на Ярмарке во время стрима.</p>`;
    if (id === 'storage' && !(h && h.sg)) return `${say('Склад скоро откроется: здесь можно будет хранить вещи, которые не помещаются в сумку.')}<p class="note">Пока сумка без предела — носи всё с собой.</p>`;
    if (id === 'gate') return `${say('В поход отсюда не выйти — отряд собирает стример на стриме.')}<p class="note">Ворота откроются, когда начнётся поход. А пока — заточи оружие, загляни к Тренеру и в Шатёр.</p>`;
    if (id === 'board') return `<div class="cy-news" aria-busy="true"><p class="note">Срываем свежие листки с доски…</p></div>`;
    if (!h) return say('Героя пока нет — он появится, когда ты напишешь в чат на стриме.');
    if (id === 'trainer') {
      if (!h.sk || !window.LGSkills) return `${say('Тренер скоро начнёт обучение. Приходи позже — покажу пару приёмов.')}<p class="note">Дерево навыков пока открыто только тестерам.</p>`;
      return `<div class="cy-sk sk-wrap">${window.LGSkills.html(h, X.skx(() => rerenderUi('trainer')), { tree: true })}</div>`;
    }
    if (id === 'anvil') return forgeBody(h);
    if (id === 'forge') return forgeShop(h);
    if (id === 'magic') return magicBody(h);
    if (id === 'tent') return tentBody(h);
    if (id === 'shop') return shopBody(h);
    if (id === 'storage') return storageBody(h);
    return '';
  }
  // 22.10: воровская наценка (app.js → window.LGThief); без неё — как раньше
  const TH = { k: (h) => (window.LGThief ? window.LGThief.k(h) : 1), price: (h, b) => (window.LGThief ? window.LGThief.price(h, b) : b), note: (h) => (window.LGThief ? window.LGThief.note(h) : ''), arm: (b, h, base) => (window.LGThief ? window.LGThief.arm(b, h, base) : true) };
  function after(id, h) {
    if (id === 'board') loadNews();
    if (id === 'hall') hallLoad();
    if (id === 'auction' && h && h.au) auctionOpen();
    if (id === 'trainer' && h && h.sk && window.LGSkills) window.LGSkills.bind(S.panel, X.skx(() => rerenderUi('trainer')));
    if (id === 'anvil') forgeAfter(h);
    if (id === 'forge') { const g = S.panel.querySelector('[data-goanvil]'); if (g) g.onclick = () => goBuilding('anvil'); }
    if (id === 'shop') S.panel.querySelectorAll('[data-good]').forEach((b) => bindGood(b, 'shop', b.dataset.good));   // 23.10: товар прилавка — карточка и покупка
    if (id === 'shop') { const pb = S.panel.querySelector('[data-pantry]'); if (pb) pb.onclick = () => { PANTRY = !PANTRY; rerenderUi('shop'); }; }
    if (id === 'tent') tentAfter(h);
    if (id === 'storage' && h && h.sg) storageAfter(h);
    if (id === 'shop') {
      S.panel.querySelectorAll('[data-use]').forEach((b) => b.onclick = () => X.act('/api/use', { uid: b.dataset.use }, b.dataset.ok || 'Готово', b));
      // 22.10: воровская наценка — цена для вора и второе нажатие (window.LGThief из app.js)
      // 23.10: и здесь — «Купить … за …? Да / Нет» (цена для вора — сразу в вопросе)
      S.panel.querySelectorAll('[data-buymat]').forEach((b) => b.onclick = () => { const E = X.ench ? X.ench() : null, mat = b.dataset.buymat, id = mat === 'star' ? 'enchant_star' : 'enchant_sphere'; buyAsk({ id, mat, name: (X.itemName(id) || (mat === 'star' ? 'Счастливая звезда' : 'Сфера сохранения')), slot: 'material', rarity: mat === 'star' ? 'uncommon' : 'rare' }, 'shop', b, E && E.coins ? E.coins[mat] : 0); });
    }
  }
  // интерфейс места перерисовать, сцену (герой, продавец, наковальня) — не трогать
  function rerenderUi(id) {
    if (!S || S.panelId !== id) return;
    if (id === 'storage' && STD && STD.dragging && STD.dragging() && STP) { STP.dataset.stdirty = '1'; return; }   // 23.10: тащат вещь — перерисуем после
    if (id === 'storage' && STI && STI.inv.dragging()) { STI.dirty = true; return; }   // 25.10: новая сумка (inv2) — так же
    const pb = S.panel.querySelector('.cy-pb'), sc = pb ? pb.scrollTop : 0;
    S.panel.innerHTML = `<div class="cy-pb">${body(id, X.hero())}</div>`;
    after(id, X.hero());   // (сцену подстроит ResizeObserver панели)
    const pb2 = S.panel.querySelector('.cy-pb'); if (pb2) pb2.scrollTop = sc;
    if (id === 'tent') { const f = S.room.querySelector('.cy-fig2.me'); const h = X.hero(); if (f && h) f.innerHTML = still(X.doodle(X.login(), { ...h, look: { ...((h.wardrobe && h.wardrobe.cur) || {}), ...TRY }, gear: {} }, 'happy', 'peace')); }
    fitRoom();
  }
  // герой поменялся (пришёл ответ игры) — перерисовать интерфейс места (Кузня — только список вещей: у неё своё окно; Тренер — сам)
  /* 28.10 (hw-city): «Ночь Тыквенной Луны» - хэллоуинский вид города канала (hwc.look: настройка канала quest.hwCity) и портал на месте
     ворот (hwc.portal: город превращён, ночь ещё не прошла). Рисунок - общий с оверлеем стрима (cityhw.js): убранство по зданиям и портал
     запекаются в картинки один раз (предметы citygl), город - в холодном тоне (tint спрайтов). Живого на сайте ничего (кадр в покое не
     рисуется) - ни пепла, ни вращения воронки: зрителям без видеокарты не тяжелее, чем обычно. Только Pixi (SVG-версия - как была). */
  const hwNow = () => { const h = X && X.hero(); return (h && h.hwc) || null; };
  // портал открыт (с превращения до конца ночи) - все человечки «Города» призраками; карточку героя и куклу «Персонажа» это не трогает
  let hwGhK = false;
  const hwGh = () => hwGhK;
  function hwGhSet(on) {
    on = !!on; if (on === hwGhK) return; hwGhK = on;
    if (!S || !S.gl) return;
    for (const w of [...S.others.values(), ...(S.me ? [S.me] : [])]) { if (!w.v) continue; const svg = walkerSvg(w.l, w.v); S.gl.relook(w, svg, labOf(w.l, w.v, !!w.mine)); }
    kick();
  }
  let hwJs = null;
  function hwApply() {
    if (!S || !S.gl) return;
    const c = isCamp() ? null : hwNow(), k = c ? (c.look ? 'l' : '') + (c.portal ? 'p' : '') : '';   // 28.10 (стример): Перепутье не преображается
    if (k === (S.hwk || '') || S.hwPlay) { if (S.hwk == null) S.hwk = k; if (!S.hwPlay) { hwGhSet(!!(c && c.portal)); hwNpc(!!(c && c.look)); } return; }   // HW-NPC: НПС - и уровень пасса зрителя   // первый взгляд без Хэллоуина - запомнить: превращение при нас покажем сценой
    if (k && !window.LGCityHW) { if (!hwJs) hwJs = townJs(`/site/cityhw.js?v=${(window.LG_CITYV || {}).hw || ''}`).catch((e) => { hwJs = null; console.warn('[город] Хэллоуин', e); }); hwJs.then(() => { if (window.LGCityHW) hwApply(); }); return; }
    const was = S.hwk; S.hwk = k;
    const L = window.LGCityHW, sc = { B: WD.BUILDINGS.filter(bOk), AREA: WD.AREA, fair: !inTown() }, hw = S.L && S.L.hw, o = { frame: hw && hw.frame, decor: hw && hw.decor, dx: inTown() ? 0 : M.QW };
    const TC = [0x8e, 0x9a, 0xb8], tint = (q) => { const v = TC.map((x) => Math.round(255 + (x - 255) * q)); S.gl.tint(q <= 0 ? null : (v[0] << 16) | (v[1] << 8) | v[2]); kick(); };
    // мёртвый город: живое пламя костра лагеря (CSS-слой поверх Pixi) гаснет - свет только у тыкв и конфет
    const fire = (on) => { for (const e of S.el.querySelectorAll('.cy-camp-fl')) e.style.display = on ? '' : 'none'; };
    // убранство и портал - прямо в мёртвых плитках (кадр их не рисует); вид выключен, а ночь идёт - портал предметами
    const stat = () => { fire(!(c && c.look)); hwGhSet(!!(c && c.portal)); S.gl.dropProps('hw'); S.gl.dropProps('hwp');
      if (c && c.look) S.gl.setDeadArt(L.art(sc, { ...o, portal: !!c.portal })); else if (c && c.portal) S.gl.addProps(L.portal(sc, o), 'hwp');
      S.gl.setDead(!!(c && c.look)); tint(0); hwNpc(!!(c && c.look));   // HW-NPC: НПС ивента - только в хэллоуинском виде Ярмарки
      // мерцание огня - на сайте облегчённо: 3 тыквы у ворот (остальной свет запечён); телефон с «меньше движения» - без него
      const fl = S.cam.querySelector('.hwc-fls'); if (fl) fl.remove(); if (c && c.look && !reduce()) { const f = L.flickers(sc, 3); if (f) S.cam.appendChild(f); } };   // 28.10 (hw-city-dead): мёртвый город - перекраска при запекании
    // зритель смотрит город в момент превращения (портал только что открылся) - та же сцена, но без тряски и с меньшим числом частиц;
    // открыл позже - сразу итоговый вид. Повторного показа нет
    if (was != null && !/p/.test(was) && c && c.portal && c.look && c.at && Date.now() - c.at < 20000 && !reduce() && S.cam) {
      S.gl.dropProps('hw'); S.gl.dropProps('hwp'); S.gl.setDeadArt(null); hwNpc(false);   // HW-NPC: НПС появятся после сцены
      setTimeout(() => { if (S) fire(false); }, 3000);
      S.hwPlay = L.play({ sc, art: o, world: S.cam, screen: S.view, light: true, ghosts: () => hwGhSet(true), dead: (w) => { if (S && S.gl) { S.gl.setDead(true, w); kick(); } }, bake: () => { if (S && S.gl) { S.gl.setDeadArt(L.art(sc, { ...o, portal: true })); kick(); } }, done: () => { if (S) { S.hwPlay = null; hwNpc(!!(hwNow() || {}).look); const f = L.flickers(sc, 3); if (f && !reduce() && !S.cam.querySelector('.hwc-fls')) S.cam.appendChild(f); kick(); } } });
      return;
    }
    stat(); kick();
  }
  function heroChanged() {
    if (!S) return;
    hwApply();
    if (window.LGTrade) window.LGTrade.heroChanged();   // 23.10: окно обмена — сумка поменялась
    chatInit();   // 21.10: чат открыли / закрыли тестерам
    const h = X.hero();
    if (S.me && h) {
      const v = mineView(h);
      if (JSON.stringify(v) !== S.me.vKey) {
        S.me.vKey = JSON.stringify(v); S.me.v = v;
        const svg = walkerSvg(X.login(), v); S.me.lift = nameLift(svg, v);
        if (S.gl) { S.gl.relook(S.me, svg, labOf(X.login(), v, true)); kick(); } else { S.me.body.innerHTML = svg; place(S.me); }
      }
    }
    // 29.10: все лавки с кошельком (FULL: Кузня, Магическая лавка, шатёр, ряды) - после покупки «у тебя N» было старым в Кузне и Магической лавке
    if (FULL[S.panelId] || S.panelId === 'storage') rerenderUi(S.panelId);
    if (S.panelId === 'anvil') forgeList(h);
    if (S.panelId === 'auction' && window.LGAuction) window.LGAuction.update(h);
  }
  // 20.10: зал Аукциона — свой модуль (auction.js / auction.css), грузится при первом входе
  let auLoading = null;
  function auctionOpen() {
    const box = S.panel.querySelector('.au-root'); if (!box) return;
    if (!auLoading) {
      const V = window.LG_CITYV || {};
      if (!document.getElementById('auCss')) { const l = document.createElement('link'); l.id = 'auCss'; l.rel = 'stylesheet'; l.href = `/site/auction.css?v=${V.auc || ''}`; document.head.appendChild(l); }
      auLoading = new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = `/site/auction.js?v=${V.au || ''}`; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); }).catch((e) => { auLoading = null; throw e; });
    }
    auLoading.then(() => { if (S && S.panelId === 'auction' && box.isConnected && window.LGAuction) window.LGAuction.render(box, X, { fit: fitRoom }); })
      .catch(() => { box.innerHTML = '<p class="note">Аукцион не загрузился — проверь связь и зайди ещё раз.</p>'; });
  }

  /* ----- 24.10: Ратуша — склад города: что сдали скупщику шахты этого города (Ярмарка — домашняя шахта), кто сколько сдал.
     Данные — GET /api/mine/hall?c= (ETag); пока Ратуша открыта — раз в 30 с. Тратить склад — позже. ----- */
  let hallT = 0;
  async function hallLoad() {
    clearTimeout(hallT);
    const box = S && S.panel && S.panel.querySelector('.cy-hall'); if (!box) return;
    const c = inTown() ? TOWN.id : 'home';
    try { if (X.mineFiles) await X.mineFiles(); } catch {}   // цвета ресурсов — из craftworld.js (как в сумке шахты)
    const r = await X.api('/api/mine/hall?c=' + encodeURIComponent(c));
    if (!S || S.panelId !== 'hall' || !box.isConnected) return;
    box.removeAttribute('aria-busy');
    if (!(box.contains(document.activeElement) && /^(INPUT|SELECT)$/.test(document.activeElement.tagName))) { box.innerHTML = hallHtml(r && r.ok ? r : null); hallBind(box); }
    // 29.10 (Шахта 3.0): Ратуша уже не заглушка - старые «потратить можно будет позже» и «скоро» убираем
    if (r && r.hall) { const nx = box.nextElementSibling; if (nx && nx.classList.contains('note')) nx.hidden = true; const pv = box.previousElementSibling; if (pv && !pv.dataset.h3) { pv.dataset.h3 = '1'; const t = pv.querySelector('p') || pv; t.textContent = 'Ратуша: казна канала, мэр и стройки города. Казну пополняют скупщик, сборы на лифт и буровые и взносы зрителей.'; } }   // 29.10: поле ника / лимита в фокусе - не перерисовываем
    hallT = setTimeout(() => { if (S && S.panelId === 'hall') hallLoad(); }, 30000);
  }
  function hallHtml(r) {
    if (!r) return '<p class="note">Книга склада не открылась - попробуй ещё раз.</p>';
    const RES = (window.LGCraftWorld && window.LGCraftWorld.RES) || {}, me = X.login();
    const group = (kind, title) => { const a = r.res.filter((x) => x.kind === kind); return a.length ? `<h4>${esc(title)}</h4><ul class="cy-hres">${a.map((x) => `<li class="${kind}" data-res="${esc(x.id)}"><i style="background:${esc(RES[x.id] || '#a89c88')}"></i><span>${esc(x.name)}</span><b>${x.q}</b></li>`).join('')}</ul>` : ''; };
    const res = r.res.length ? group('gem', 'Самоцветы') + group('rare', 'Редкое') + group('ore', 'Руда и камень') : '<p class="note">Склад пока пуст: сдай руду скупщику в шахте этого города - она приедет сюда.</p>';
    const top = r.gv.length ? `<h4>Больше всех сдали</h4><ol class="cy-hgv">${r.gv.slice(0, 50).map(([l, n], i) => `<li class="${l === me ? 'me' : ''}"><span>${i + 1}</span><b>${esc(l === me ? l + ' (ты)' : l)}</b><em>${n}</em></li>`).join('')}</ol>` : '';
    if (r.hall) return hall3Html(r, RES, top, res);   // 29.10 (Шахта 3.0, шаг 5): казна канала, мэр, улучшения зданий, склад на 100 ячеек
    return `<h3 class="h3">Склад города</h3>${res}${top}`;
  }
  /* ----- 29.10 (Шахта 3.0, шаг 5): Ратуша - казна канала (одна на все города, не сбрасывается), склад на 100 ячеек, мэр (назначает
     стример; нет мэра - стример), улучшения зданий 1-5 (цена - из казны, рудой по ценам скупщика), лимит мэра в сутки (ставит стример).
     Склад и траты - только стримеру и мэру; остальным - что в казне и кто сколько сдал. Действия - /api/mineHall, комната проверяет права. ----- */
  const BLD_NAMES = { gate: 'Ворота', hall: 'Ратуша', auction: 'Аукцион', trainer: 'Тренер', board: 'Доска объявлений', storage: 'Склад', anvil: 'Наковальня', forge: 'Кузня', tent: 'Шатёр', shop: 'Лавка', magic: 'Магическая лавка' };
  function hall3Html(r, RES, top, resList) {
    const H = r.hall, role = r.role || '', M = (n) => (X.money ? X.money(n) : String(n)), can = !!role, now = Date.now();
    const cells = []; for (const x of r.res) { let q = x.q; while (q > 0 && cells.length < 400) { const n = Math.min(q, H.stack); cells.push([x, n]); q -= n; } }
    const used = cells.length, grid = Array.from({ length: Math.max(Math.min(H.slots, 20), used) }, (_, i) => { const c = cells[i]; return c ? `<li class="cy-hs ${c[0].kind}${i >= H.slots ? ' over' : ''}" title="${esc(c[0].name)} ×${c[1]}"><i style="background:${esc(RES[c[0].id] || '#c8b89a')}"></i><b>${c[1]}</b>${can ? `<button type="button" class="cy-htk" data-htake="${esc(c[0].id)}" data-q="${c[1]}" aria-label="Забрать ${esc(c[0].name)} в сумку">↓</button>` : ''}</li>` : '<li class="cy-hs empty"></li>'; }).join('');
    const who = H.mayor ? `Мэр - <b>${esc(H.mayor)}</b>` : `Мэра нет - казной управляет стример <b>${esc(H.ch || '')}</b>`;
    let mayorBox = `<p>${who}.${H.mayor ? ` Лимит мэра - ${M(H.lim)} ${H.per === 'week' ? 'в неделю, на этой неделе' : 'в сутки, сегодня'} потрачено ${M(H.sp)}` : ''}</p>`;
    if (role === 'streamer') mayorBox += `<div class="cy-hrow"><input class="input" data-hmayor placeholder="ник мэра" maxlength="25" value="${esc(H.mayor)}"><button type="button" class="btn primary sm" data-hset>Назначить</button>${H.mayor ? '<button type="button" class="btn ghost sm" data-hunset>Снять</button>' : ''}</div>
      <div class="cy-hrow"><label>Лимит мэра <input class="input" data-hlim type="number" min="0" step="100" value="${H.lim}"></label><select class="input" data-hper><option value="day"${H.per !== 'week' ? ' selected' : ''}>в сутки</option><option value="week"${H.per === 'week' ? ' selected' : ''}>в неделю</option></select><button type="button" class="btn ghost sm" data-hlimset>Сохранить</button></div>`;
    let bld = '';
    if (H.town) bld = `<h4>Здания города</h4><ul class="cy-hbld">${Object.keys(BLD_NAMES).filter((k) => H.lv[k]).map((k) => { const lv = H.lv[k], b = H.b[k], to = lv + 1, cost = H.cost[to - 2];
      const st = b && b.until > now ? `стройка до ур. ${b.to}: ${Math.ceil((b.until - now) / 3600e3)} ч` : lv >= 5 ? 'ур. 5 - лучше не бывает' : `ур. ${lv} → ${to}: ${M(cost)}, ${H.hours[to - 2]} ч`;
      return `<li><span><b>${esc(BLD_NAMES[k])}</b> · ур. ${lv}</span><em>${st}</em>${can && !(b && b.until > now) && lv < 5 ? `<button type="button" class="btn ghost sm" data-hup="${k}"${cost > H.val ? ' disabled title="в казне не хватает"' : ''}>Улучшить</button>` : ''}</li>`; }).join('')}</ul>
      <p class="note">Лучше здание - лучше товар: на ур. 5 в лавках появляются эпические вещи.</p>`;
    const ore = can ? (X.hero().items || []).filter((it) => it && it.qty && it.q > 0 && it.res) : [];
    // взнос в казну - всем: руда из сумки вместо продажи скупщику (по ценам скупщика), доска почёта
    const P = r.bp || {}, mine = (X.hero().items || []).filter((it) => it && it.qty && it.q > 0 && it.res && +P[it.res] > 0);
    const give = mine.length ? `<h4>Взнос в казну</h4><p class="note">Отдай руду городу вместо продажи скупщику - попадёшь на доску почёта.</p><ul class="cy-hput">${mine.slice(0, 10).map((it) => `<li><span>${esc(it.name)}</span><button type="button" class="btn ghost sm" data-hgive="${esc(it.uid)}" data-q="${it.q}">Отдать ≈${M(Math.floor(it.q * P[it.res] / 100))}</button></li>`).join('')}</ul>` : '';
    const me0 = X.login(), board = (H.donors || []).length ? `<h4>Доска почёта казны</h4><ol class="cy-hgv">${H.donors.map(([l, v], i) => `<li class="${l === me0 ? 'me' : ''}"><span>${i + 1}</span><b>${esc(l === me0 ? l + ' (ты)' : l)}</b><em>${M(v)}</em></li>`).join('')}</ol>` : '';
    const put = can && ore.length ? `<h4>Положить из сумки</h4><ul class="cy-hput">${ore.slice(0, 12).map((it) => `<li><span>${esc(it.name)}</span><button type="button" class="btn ghost sm" data-hput="${esc(it.uid)}" data-q="${it.q}">Положить</button></li>`).join('')}</ul>` : '';
    const log = (H.log || []).length ? `<details class="cy-hlog"><summary>Журнал Ратуши</summary><ul>${H.log.map((e) => `<li>${esc(e.t)}</li>`).join('')}</ul></details>` : '';
    return `<h3 class="h3">Казна канала</h3><p class="note">Одна на все города канала, не сбрасывается. Сюда - то, что сдают скупщику, руда со сборов на лифт и буровые, доля буровых. В казне руды на ${M(H.val)}</p>
      <div class="m2-k">Склад Ратуши <small>${used} из ${H.slots} ячеек${used > H.slots ? ' - склад полон, лишнее лежит во дворе' : ''}${can ? ' · ↓ - забрать в сумку' : ''}</small></div><ul class="cy-hgrid">${grid}</ul>
      ${can ? '' : '<p class="note">Брать со склада и тратить казну могут стример и мэр.</p>'}
      <details class="cy-hlist"><summary>Склад города по видам</summary>${resList}</details>
      <h4>Мэр</h4>${mayorBox}${bld}${put}${give}${board}${log}${top}`;
  }
  async function hallAct(b) {
    const c = inTown() ? TOWN.id : 'home';
    const r = await X.api('/api/mineHall', { c, ...b });
    const tell = (t, bad) => { if (X.toast) X.toast(t, bad); };   // say() здесь - разметка реплики, не сообщение
    if (!r || !r.ok) { tell((r && r.error) || 'Не получилось', true); return; }
    tell((r.x && r.x.t) || 'Готово - Ратуша обновится через пару секунд'); setTimeout(() => { if (S && S.panelId === 'hall') hallLoad(); }, 2500);
  }
  function hallBind(box) {
    const q = (sel) => box.querySelector(sel);
    box.querySelectorAll('[data-htake]').forEach((b) => { b.onclick = () => hallAct({ a: 'take', item: b.dataset.htake, n: +b.dataset.q }); });   // ↓ - ячейка целиком
    box.querySelectorAll('[data-hup]').forEach((b) => { b.onclick = () => hallAct({ a: 'up', item: b.dataset.hup }); });
    box.querySelectorAll('[data-hput]').forEach((b) => { b.onclick = () => hallAct({ a: 'put', lines: [[b.dataset.hput, +b.dataset.q]] }); });
    box.querySelectorAll('[data-hgive]').forEach((b) => { b.onclick = () => hallAct({ a: 'give', lines: [[b.dataset.hgive, +b.dataset.q]] }); });
    const st = q('[data-hset]'); if (st) st.onclick = () => hallAct({ a: 'mayor', item: (q('[data-hmayor]') || {}).value || '' });
    const un = q('[data-hunset]'); if (un) un.onclick = () => hallAct({ a: 'mayor', item: '' });
    const lm = q('[data-hlimset]'); if (lm) lm.onclick = () => hallAct({ a: 'lim', n: +((q('[data-hlim]') || {}).value || 0), item: (q('[data-hper]') || {}).value || 'day' });
  }
  /* ----- Доска объявлений: последние новости игры (то же, что вкладка «Новости») ----- */
  /* ----- Доска объявлений (22.10, решение стримера): на доске — короткие листки (тема, дата, пара строк), по нажатию —
     новость на весь экран: обложка, весь текст, листать соседние (кнопками и стрелками), Esc — закрыть. Полная лента — «Новости». */
  const NEWS_TAGS = { update: 'Обновление', balance: 'Баланс', event: 'Событие', fix: 'Исправления' };
  let NEWS = [];
  const newsDay = (t) => (t ? new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '');
  const newsText = (html) => { const d = document.createElement('div'); d.innerHTML = html || ''; d.querySelectorAll('figure').forEach((f) => f.remove()); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
  async function loadNews() {
    const box = S.panel.querySelector('.cy-news'); if (!box) return;
    let r = null; try { r = await (await fetch((window.LG_BASE || '') + '/api/news', { credentials: 'same-origin' })).json(); } catch {}
    if (!S || S.panelId !== 'board') return;
    box.removeAttribute('aria-busy');
    newsBoard(box, (r && r.list) || []);
  }
  function newsBoard(box, list) {
    NEWS = list.slice(0, 10);
    if (!NEWS.length) { box.innerHTML = '<p class="note">На доске пока пусто.</p>'; return; }
    box.innerHTML = `<ul class="cy-notes">${NEWS.slice(0, 6).map((p, i) => { const t = newsText(p.html), tag = NEWS_TAGS[p.tag];
      // 22.10 (баг со стрима): на каждом листке — явная кнопка «Читать полностью»; нажатие на сам листок — то же самое
      return `<li class="cy-note" data-read="${i}" style="--r:${[-1.5, 1, -0.5, 1.5, -1, 0.5][i]}deg"><div class="cy-nin"><span class="cy-ntop">${tag ? `<em>${esc(tag)}</em>` : ''}<time>${esc(newsDay(p.at))}</time></span><b id="cyn-${i}">${esc(p.title)}</b><p>${esc(t.length > 140 ? t.slice(0, 138) + '…' : t)}</p><button type="button" class="cy-nr" aria-describedby="cyn-${i}">Читать полностью</button></div></li>`; }).join('')}</ul>`
      + `<div class="cy-nbtn"><button type="button" class="btn primary" data-read="0">Читать на весь экран</button><button type="button" class="btn ghost" data-news>Все новости</button></div>`;
    // листок целиком и кнопка на нём (нажатие всплывает до листка) — один обработчик; фокус потом — обратно на кнопку
    box.querySelectorAll('[data-read]').forEach((b) => { b.onclick = () => newsRead(+b.dataset.read, b.querySelector('.cy-nr') || b); });
    box.querySelector('[data-news]').onclick = () => X && X.tab('news');
  }
  // новость на весь экран (поверх Города): тот же текст, что во вкладке «Новости» (html собирает сервер), читать удобно и на телефоне
  let readEl = null, readBack = null;
  function newsRead(i, from) {
    if (!NEWS.length) return;
    i = (i + NEWS.length) % NEWS.length;
    const p = NEWS[i], html = p.html || '', m = /<figure class="nw-fig">[\s\S]*?<\/figure>/.exec(html);
    const cover = m ? m[0].replace('<figure class="nw-fig">', '<figure class="nw-fig nw-cover">') : '', bodyHtml = m ? (html.slice(0, m.index) + html.slice(m.index + m[0].length)).replace(/^\s+/, '') : html;
    if (!readEl) {
      readBack = from || document.activeElement;
      readEl = document.createElement('div'); readEl.className = 'cy-read'; readEl.setAttribute('role', 'dialog'); readEl.setAttribute('aria-modal', 'true'); readEl.setAttribute('aria-labelledby', 'cyr-t');
      (document.fullscreenElement || document.body).appendChild(readEl); document.documentElement.classList.add('cy-reading');   // Город во весь экран — окно внутри него
      readEl.addEventListener('keydown', newsKeys);
    }
    readEl.dataset.i = String(i);
    const tag = NEWS_TAGS[p.tag];
    readEl.innerHTML = `<div class="cy-rd-top"><b>Доска объявлений</b><span>${i + 1} из ${NEWS.length}</span><button type="button" class="cy-rd-x" aria-label="Закрыть"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`
      + `<div class="cy-rd-in">${NEWS.length > 1 ? `<nav class="cy-rd-list" aria-label="Новости на доске">${NEWS.map((x, k) => `<button type="button" data-go="${k}"${k === i ? ' aria-current="true"' : ''}><time>${esc(newsDay(x.at))}</time>${esc(x.title)}</button>`).join('')}</nav>` : ''}`
      + `<article class="cy-rd-paper">${cover}<div class="nw-meta">${tag ? `<span class="nw-tag" data-tag="${esc(p.tag)}">${esc(tag)}</span>` : ''}<time>${esc(newsDay(p.at))}</time></div><h2 class="nw-t" id="cyr-t">${esc(p.title)}</h2><div class="nw-body">${bodyHtml}</div>`
      + `<div class="cy-rd-nav">${NEWS.length > 1 ? `<button type="button" class="btn ghost" data-go="${i - 1}">← Новее</button><button type="button" class="btn ghost" data-go="${i + 1}">Старее →</button>` : ''}<button type="button" class="btn ghost" data-talk>Обсудить в «Новостях»</button></div></article></div>`;
    readEl.querySelector('.cy-rd-x').onclick = newsClose;
    readEl.onclick = (e) => { if (e.target === readEl || e.target.classList.contains('cy-rd-in')) newsClose(); };   // нажал мимо листа — закрыть (удобно на телефоне)
    readEl.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => newsRead(+b.dataset.go); });
    readEl.querySelector('[data-talk]').onclick = () => { newsClose(); if (X) X.tab('news'); };
    const paper = readEl.querySelector('.cy-rd-paper'); if (paper) paper.scrollTop = 0;
    readEl.querySelector('.cy-rd-in').scrollTop = 0;
    readEl.querySelector('.cy-rd-x').focus();
  }
  function newsKeys(e) {
    if (e.key === 'Escape') { e.preventDefault(); newsClose(); return; }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && NEWS.length > 1 && !/^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); newsRead(+readEl.dataset.i + (e.key === 'ArrowLeft' ? -1 : 1)); return; }
    if (e.key === 'Tab') {   // фокус — внутри окна
      const f = [...readEl.querySelectorAll('button, a[href]')].filter((x) => x.offsetParent !== null); if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  function newsClose() {
    if (!readEl) return;
    readEl.remove(); readEl = null; document.documentElement.classList.remove('cy-reading');
    try { if (readBack && readBack.isConnected) readBack.focus(); } catch {}
    readBack = null;
  }

  /* ----- Лавка: еда и зелья (своё — съесть; купить — на стриме), материалы заточки — тестерам ----- */
  // товар Торговых рядов (как ROWS в modules/fair/server.js); названия — из стиля, нет — «легионские»
  const ROWS = { potion_small: 'Малое зелье здоровья', potion_hp: 'Большое зелье здоровья', apple: 'Яблоко', pretzel: 'Баранка', bread: 'Хлеб', cheese: 'Сыр', pie: 'Пирог', ham: 'Окорок', roast: 'Жареный гусь', honey_cake: 'Медовая лепёшка', sage_tea: 'Шалфейный отвар', spicy_stew: 'Острая похлёбка' };
  let PANTRY = false;   // открыт ли список своих припасов (полоса Лавки)
  function shopBody(h) {
    if (FULL.shop) {
      const mine = h ? (h.items || []).filter((it) => !it.on && (it.slot === 'food' || it.slot === 'potion') && it.effect && !it.effect.revive) : [];
      const seen = new Set(), stack = []; for (const it of mine) { if (seen.has(it.id)) { stack.find((x) => x.id === it.id).n++; continue; } seen.add(it.id); stack.push({ ...it, n: 1 }); }
      const cd = h && h.eatUntil && h.eatUntil > Date.now();
      const list = PANTRY ? `<div class="cy-pantry panel">${stack.length ? `<ul class="cy-goods">${stack.map((it) => `<li><span class="cy-gi">${X.art(it)}</span><span><b>${esc(it.name)}</b>${it.n > 1 ? ` <small>×${it.n}</small>` : ''}<em>${esc(X.eff(it))}</em></span><button type="button" class="btn ghost sm" data-use="${esc(it.uid)}" data-ok="${it.slot === 'potion' || it.drink ? 'Выпито' : 'Съедено'}"${cd || h.ghost ? ' disabled' : ''}>${it.slot === 'potion' || it.drink ? 'Выпить' : 'Съесть'}</button></li>`).join('')}</ul>${cd ? '<p class="note">Еда и зелья ещё не готовы — пауза после прошлого.</p>' : ''}` : '<p class="note">Припасов нет.</p>'}</div>` : '';
      return shopBar(h, h ? `<button type="button" class="btn ghost sm" data-pantry aria-expanded="${PANTRY}">🍎 Мои припасы (${mine.length})</button>` : '') + list;
    }
    return shopBody0(h);
  }
  function shopBody0(h) {
    const mine = (h.items || []).filter((it) => !it.on && (it.slot === 'food' || it.slot === 'potion') && it.effect && !it.effect.revive);
    const seen = new Set(), stack = [];
    for (const it of mine) { if (seen.has(it.id)) { stack.find((x) => x.id === it.id).n++; continue; } seen.add(it.id); stack.push({ ...it, n: 1 }); }
    const cd = h.eatUntil && h.eatUntil > Date.now();
    const rs = stockOf('shop'), goods = rs ? [...(rs.potions || []), ...(rs.food || [])] : Object.keys(ROWS).map((id) => ({ id, slot: /^potion/.test(id) ? 'potion' : 'food', name: X.itemName(id) || ROWS[id] }));
    const E = X.ench(), m = X.mats(h);
    return `<div class="cy-shop">
      <div class="cy-soon">${npc('Лавочница', 'happy', {}, { hat: 'chef' })}<div>${say(csOn() ? 'Еда лечит раны, зелья — быстрее. Нажми на товар — расскажу, дважды — продам за монеты.' : 'Еда лечит раны, зелья — быстрее. Купить можно на стриме — в Торговых рядах за баллы канала.')}</div></div>
      <h3 class="h3">Твои припасы</h3>
      ${stack.length ? `<ul class="cy-goods">${stack.map((it) => `<li><span class="cy-gi">${X.art(it)}</span><span><b>${esc(it.name)}</b>${it.n > 1 ? ` <small>×${it.n}</small>` : ''}<em>${esc(X.eff(it))}</em></span><button type="button" class="btn ghost sm" data-use="${esc(it.uid)}" data-ok="${it.slot === 'potion' || it.drink ? 'Выпито' : 'Съедено'}"${cd || h.ghost ? ' disabled' : ''}>${it.slot === 'potion' || it.drink ? 'Выпить' : 'Съесть'}</button></li>`).join('')}</ul>${cd ? '<p class="note">Еда и зелья ещё не готовы — пауза после прошлого.</p>' : ''}` : '<p class="note">Припасов нет.</p>'}
      <h3 class="h3">На прилавке</h3>
      <ul class="cy-goods cy-goods-c">${goods.map((it) => `<li><button type="button" class="cy-good" data-good="${esc(it.id)}" aria-label="${esc(X.itemName(it.id) || it.name)} — ${csOn() && it.coins ? esc(plainMoney(TH.price(h, it.coins))) : 'купить на стриме'}"><span class="cy-gi">${X.art(it)}</span><span><b>${esc(X.itemName(it.id) || it.name)}</b><em>${csOn() && it.coins ? X.money(TH.price(h, it.coins)) : 'на стриме'}</em></span></button></li>`).join('')}</ul>
      ${goodsHelp(h)}
      ${h.ef && !msOn() ? `<h3 class="h3">Для заточки</h3><div class="cy-mats"><span>Звёзд: <b>${m.star}</b> · сфер: <b>${m.sphere}</b></span>
        <button type="button" class="btn ghost sm" data-buymat="star"${(+h.money || 0) < TH.price(h, E.coins.star) || h.ghost ? ' disabled' : ''}>Счастливая звезда · ${X.money(TH.price(h, E.coins.star))}</button>
        <button type="button" class="btn ghost sm" data-buymat="sphere"${(+h.money || 0) < TH.price(h, E.coins.sphere) || h.ghost ? ' disabled' : ''}>Сфера сохранения · ${X.money(TH.price(h, E.coins.sphere))}</button></div>${TH.note(h)}` : ''}
    </div>`;
  }

  /* ----- 22.10: Склад — сумка и склад ячейками (одинаковые расходники — стопкой), положить / забрать, расширить за монеты -----
     23.10: перетаскивание между сумкой и складом (мышь и палец; на телефоне — удержание, у края окно прокручивается), «Положить всё ↓» /
     «Взять всё ↑» (одно действие, итог «перенесено N, не влезло M»), «Разложить» (порядок хранит игра), подсказка-карточка вещи.
     Ячейки и перетаскивание — общие с наковальней (itemgrid.js → window.LGItems), подсказка — общая карточка сайта (X.cardTip) */
  let STSEL = null;   // выбранная ячейка: { from: 'b' | 's', uid }
  let STRES = null;   // итог «всё разом» / сообщение перетаскивания: { t, bad }
  let STCELLS = {};   // 'b:uid' / 's:uid' → { it, n, uids } — для подсказки и перетаскивания
  let STD = null, STP = null, STTAP = '';   // перетаскивание (LGItems.drag) в окне Склада, его окно, чем нажали последний раз
  const STCOARSE = () => window.LGSiteUi.is('touch');   // 24.10: телефон — подсказка про удержание
  // ячейки — как у игры (legionary/storage.js): снаряжение по одной, расходники стопками; порядок — как в игре (keep)
  const stCellsOf = (list, stack) => IGW().cells(list, stack, { keep: true });
  // влезет ли ячейка c (из from) на другую сторону: свободная ячейка или неполная стопка того же (как кнопки и игра)
  function stCan(h, from, c) {
    const G = h.sg, toSt = from === 'b';
    if (c.it.event && !c.it.wearable) return true;
    const list = toSt ? stCellsOf(G.store || [], G.ss) : stCellsOf(h.items || [], G.bs), cap = toSt ? G.scap : G.cap, used = toSt ? G.sused : G.used, stack = toSt ? G.ss : G.bs;
    return used < cap || (!c.it.wearable && list.some((x) => x.it.id === c.it.id && x.n < stack));
  }
  // одна дорога и для кнопок, и для перетаскивания: /api/stPut · /api/stTake (uid + сколько из стопки)
  function stMove(from, uid, n, btn) {
    const toSt = from === 'b'; STSEL = null;
    return stAct(toSt ? '/api/stPut' : '/api/stTake', { uid, n }, toSt ? 'Положено на склад' : 'Забрано в сумку', btn);
  }
  /* 29.10 (баг: «с телефона двойное касание на вещи Склада - перенос не виден, пока не закроешь окно»): ответ игры (X.act) обновляет
     героя и вкладку «Персонаж», но окно Города перерисовывалось только живым обновлением героя (heroChanged из SSE) - а на телефоне
     канал часто закрыт (вкладка в фоне, сеть). Теперь окно Склада перерисовывается само, когда ответ пришёл: и при успехе, и при ошибке
     (вещь остаётся на месте, причина - в уведомлении act) */
  function stSync() { if (S && S.panelId === 'storage') rerenderUi('storage'); }
  function stAct(path, body, ok, btn) {
    return Promise.resolve(X.act(path, body, ok, btn)).then(stSync, (e) => {
      stSync(); stResShow('Не получилось - попробуй ещё раз', true);
      console.warn('[склад]', e);
    });
  }
  // 24.10: сколько одинаковых на этой стороне (снаряжение — одна) и «половина» (не меньше 1)
  function stAllOf(h, from, c) {
    if (!h || !h.sg || !c) return 1; if (c.it.wearable) return 1;
    return (from === 'b' ? (h.items || []).filter((x) => !x.on) : h.sg.store || []).filter((x) => x.id === c.it.id).length || 1;
  }
  const stHalf = (all) => Math.max(1, Math.floor(all / 2));
  // 24.10: перенести n из ячейки (Shift — всё, Ctrl — половина, меню): бой / нет места — строкой, без запроса
  function stGo(from, uid, n) {
    const h = X.hero(), c = STCELLS[from + ':' + uid]; if (!h || !h.sg || !c) return;
    if (h.busy) { stResShow('Идёт бой - склад после боя', true); return; }
    if (!stCan(h, from, c)) { stResShow(from === 'b' ? 'На складе нет места - расширь склад или забери что-нибудь' : 'Сумка полна - освободи место', true); return; }
    stResShow('', false); return stMove(from, uid, Math.max(1, Math.min(stAllOf(h, from, c), Math.floor(n) || 1)), null);   // 25.10: ответ ждёт новая сумка (inv2)
  }
  // 24.10: меню ячейки (ПКМ, клавиша меню / Shift+F10, на телефоне — удержать и отпустить): 1 / половина / всё / N…
  function stMenu(el, from, uid, xy) {
    const h = X.hero(), c = STCELLS[from + ':' + uid]; if (!h || !h.sg || !c || !IGW().menu) return;
    const all = stAllOf(h, from, c), toSt = from === 'b', verb = toSt ? 'На склад' : 'В сумку';
    const items = all > 1 ? [{ t: `${verb}: 1`, v: 1 }, ...(all > 2 ? [{ t: `${verb}: половину (${stHalf(all)})`, v: stHalf(all) }] : []), { t: `${verb}: всё (${all})`, v: all }, { t: `${verb}: сколько…`, v: 'n' }] : [{ t: verb, v: 1 }];
    IGW().menu(xy && !(xy.x === 0 && xy.y === 0) ? xy : el, items, { title: `${c.it.name}${all > 1 ? ' ×' + all : ''}`, label: `${c.it.name}: ${toSt ? 'положить на склад' : 'забрать в сумку'}`, max: all, def: stHalf(all), pick: (n) => stGo(from, uid, n) });
  }
  /* 25.10: новая сумка (новинка inv2 — флаг i2 у героя): обе сетки Склада — библиотека инвентаря (packages/inventory, режим
     'storage'): перетаскивание между сеткой и сеткой, Shift+клик / правая кнопка / двойной клик — вся стопка, удержание пальцем —
     «1 / половина / всё / сколько», кнопки переноса внизу. Перенос — та же дорога stGo → stMove (/api/stPut · /api/stTake), «всё разом»,
     «Разложить» и «+N ячеек» — как были. Библиотека живёт в своём элементе между перерисовками окна (обновляются только ячейки) */
  let STI = null;   // { host, inv }
  const stInv2 = (h) => !!(h && h.i2 && window.LGInventory);
  const stData2 = (h) => ({ hero: h, items: h.items || [], storage: h.sg.store || [], bagCap: h.sg.cap, storageCap: h.sg.scap, stack: h.sg.bs, storageStack: h.sg.ss, ...(+h.ob > 0 ? { obCap: +h.ob } : {}) });   // 26.10: рудная сумка - своей сеткой (руда со склада - туда)
  function stInvOff() { if (STI) { try { STI.inv.destroy(); } catch (e) { /* уже снят */ } STI = null; } }
  function storageBody2(h, G, bag, st) {
    const full = G.used >= G.cap, sfull = G.sused >= G.scap;
    const canPut = !h.busy && bag.some((c) => stCan(h, 'b', c)), canTake = !h.busy && st.some((c) => stCan(h, 's', c));
    const sortBtn = (box, n) => `<button type="button" class="btn ghost sm cy-sort" data-stsort="${box}"${h.busy || n < 2 ? ' disabled' : ''}>⇅ Разложить ${box === 'b' ? 'сумку' : 'склад'}</button>`;
    return `<div class="cy-store cy-store2">
      <div class="cy-soon">${npc('Кладовщик', 'happy', {}, { hat: 'cap' })}<div>${say('Сумка у героя небольшая. Что не нужно в походе — оставь у меня: здесь не потеряется, даже если герой падёт.')}</div></div>
      ${h.busy ? '<p class="note cy-warn">Идёт бой — склад после боя.</p>' : ''}
      ${full ? '<p class="note cy-warn">Сумка полна: в походе новые вещи достанутся другим, пока не освободишь место.</p>' : ''}
      <div class="cy-stall" role="group" aria-label="Перенести всё разом">
        <button type="button" class="btn ghost sm" data-stall="put"${canPut ? '' : ' disabled'} aria-label="Положить всё из сумки на склад">Положить всё ↓</button>
        <button type="button" class="btn ghost sm" data-stall="take"${canTake ? '' : ' disabled'} aria-label="Взять всё со склада в сумку">Взять всё ↑</button>
        ${sortBtn('b', bag.length)}${sortBtn('s', st.length)}
        ${G.price ? `<button type="button" class="btn ${stxSure(G) ? 'primary' : 'ghost'} sm${stxSure(G) ? ' cy-sure' : ''}" data-stx${(+h.money || 0) < G.price || h.busy ? ' disabled' : ''}>${stxSure(G) ? `Точно? ${X.money(G.price)}` : `+${G.step} ячеек склада · ${X.money(G.price)}`}</button>` : ''}
        <p class="cy-stres${STRES && STRES.bad ? ' bad' : ''}" role="status" aria-live="polite">${STRES ? esc(STRES.t) : ''}</p>
      </div>
      ${G.price && X.bal ? X.bal(G.price, h.money, 'cy-lack') : ''}${sfull ? '<p class="note cy-warn">Склад полон — расширь его или забери что-нибудь.</p>' : ''}
      <div data-stinv></div>
      <p class="note">Надетое и угощения особых событий (Хэллоуин и другие) места не занимают. Одинаковые еда, зелья и материалы лежат стопкой: в сумке — до ${G.bs}, на складе — до ${G.ss}.</p>
    </div>`;
  }
  function stMount2(h, P) {
    const ph = P.querySelector('[data-stinv]'); if (!ph) return;
    if (STI) { ph.replaceWith(STI.host); STI.inv.update(stData2(h)); return; }
    STI = { host: ph, inv: window.LGInventory.mount(ph, { variant: 'full', mode: 'storage', data: stData2(h),
      actions: { move: (uid, from, to, n) => stGo(from === 'st' ? 's' : 'b', uid, n) },
      options: { header: false, detail: false, art: X.art, storeKey: 'lgInv2St', sortDefault: 'new', filters: ['all', 'weapon', 'armor', 'helmet', 'shield', 'trinket', 'use', 'other'],
        cardTip: X.cardTip ? (el, it) => X.cardTip(el, it, X.hero()) : null, tipHide: X.tipHide ? () => X.tipHide() : null,
        say: (t) => stResShow(t, true), labels: { full: 'Нет места', storage: 'Склад' },
        onDragEnd: () => { if (STI && STI.dirty) { STI.dirty = false; rerenderUi('storage'); } } } }) };
  }
  // 24.10: подтверждение «+N ячеек» — до 4 с и только для той же цены
  let STX = null, STX_T = 0;
  const stxSure = (G) => !!(STX && STX.until > Date.now() && G && STX.price === G.price);
  function storageBody(h) {
    if (!IGW()) return '<p class="note">Склад раскладывается… обнови страницу, если не появится.</p>';
    const G = h.sg, bag = stCellsOf(h.items || [], G.bs), st = stCellsOf(G.store || [], G.ss);
    STCELLS = {}; for (const c of bag) STCELLS['b:' + c.uids[0]] = c; for (const c of st) STCELLS['s:' + c.uids[0]] = c;
    if (stInv2(h)) return storageBody2(h, G, bag, st);   // 25.10: новая сумка (новинка inv2) — библиотека инвентаря
    const full = G.used >= G.cap, sfull = G.sused >= G.scap;
    const grid = (cs, from, cap, label) => IGW().grid(cs, { art: X.art, cap, label, low: (it) => it.dur != null && +it.dur <= (X.durLow ? X.durLow() : 30),
      gattr: `data-igdrop="${from}" data-stgrid="${from}"`, drag: true, on: (c) => !!STSEL && STSEL.from === from && c.uids.includes(STSEL.uid), attr: (c) => `data-st="${from}:${esc(c.uids[0])}"` });
    // выбранное: что это и куда
    let pick = '<p class="note">Выбери вещь или перетащи её в сумку / на склад (на телефоне — нажми и подержи).</p>';
    if (STSEL) {
      const list = STSEL.from === 'b' ? bag : st, c = list.find((x) => x.uids.includes(STSEL.uid));
      if (!c) STSEL = null;
      else {
        const toSt = STSEL.from === 'b', all = (toSt ? (h.items || []).filter((x) => !x.on) : G.store).filter((x) => x.id === c.it.id && !c.it.wearable).length;
        const can = stCan(h, STSEL.from, c);
        pick = `<div class="cy-stp"><span class="cy-gi">${X.art(c.it)}</span><div><b>${esc(c.it.name)}</b>${all > 1 ? ` <small>×${all}</small>` : ''}<em>${toSt ? 'в сумке' : 'на складе'}</em></div>
          <div class="cy-stb">${all > 1 ? `<button type="button" class="btn ghost sm" data-stgo="1"${can && !h.busy ? '' : ' disabled'}>${toSt ? 'Положить 1' : 'Забрать 1'}</button>` : ''}${all > 2 ? `<button type="button" class="btn ghost sm" data-stgo="${stHalf(all)}"${can && !h.busy ? '' : ' disabled'}>Половину (${stHalf(all)})</button>` : ''}
          <button type="button" class="btn primary sm" data-stgo="${all > 1 ? all : 1}"${can && !h.busy ? '' : ' disabled'}>${toSt ? (all > 1 ? 'Положить все' : 'На склад') : (all > 1 ? 'Забрать все' : 'В сумку')}</button></div></div>
          ${!can ? `<p class="note cy-warn">${toSt ? 'На складе нет места — расширь склад или забери что-нибудь.' : 'Сумка полна — освободи место.'}</p>` : ''}`;
      }
    }
    const canPut = !h.busy && bag.some((c) => stCan(h, 'b', c)), canTake = !h.busy && st.some((c) => stCan(h, 's', c));
    const sortBtn = (box, n) => `<button type="button" class="btn ghost sm cy-sort" data-stsort="${box}"${h.busy || n < 2 ? ' disabled' : ''} aria-label="Разложить ${box === 'b' ? 'сумку' : 'склад'}: оружие, доспехи, шлемы, щиты, амулеты, расходники, материалы; лучшие первыми">⇅ Разложить</button>`;
    return `<div class="cy-store">
      <div class="cy-soon">${npc('Кладовщик', 'happy', {}, { hat: 'cap' })}<div>${say('Сумка у героя небольшая. Что не нужно в походе — оставь у меня: здесь не потеряется, даже если герой падёт.')}</div></div>
      ${h.busy ? '<p class="note cy-warn">Идёт бой — склад после боя.</p>' : ''}
      <div class="cy-stsel" aria-live="polite">${pick}</div>
      <div class="cy-sth"><h3 class="h3">Сумка</h3><span class="cy-cnt${full ? ' full' : ''}">${G.used} / ${G.cap}</span>${sortBtn('b', bag.length)}</div>
      ${full ? '<p class="note cy-warn">Сумка полна: в походе новые вещи достанутся другим, пока не освободишь место.</p>' : ''}
      ${grid(bag, 'b', G.cap, 'Сумка')}
      <p class="cy-sthint">${STCOARSE() ? 'Нажми и подержи вещь - меню: 1 / половина / всё / сколько; подержи и тяни - перенести стопку.' : 'Shift+клик - весь стак, Ctrl+клик - половина, правая кнопка - меню (1 / половина / всё / сколько).'}</p>
      <div class="cy-stall" role="group" aria-label="Перенести всё разом">
        <button type="button" class="btn ghost sm" data-stall="put"${canPut ? '' : ' disabled'} aria-label="Положить всё из сумки на склад">Положить всё ↓</button>
        <button type="button" class="btn ghost sm" data-stall="take"${canTake ? '' : ' disabled'} aria-label="Взять всё со склада в сумку">Взять всё ↑</button>
        <p class="cy-stres${STRES && STRES.bad ? ' bad' : ''}" role="status" aria-live="polite">${STRES ? esc(STRES.t) : ''}</p>
      </div>
      <div class="cy-sth"><h3 class="h3">Склад</h3><span class="cy-cnt${sfull ? ' full' : ''}">${G.sused} / ${G.scap}</span>${sortBtn('s', st.length)}
        ${G.price ? `<button type="button" class="btn ${stxSure(G) ? 'primary' : 'ghost'} sm${stxSure(G) ? ' cy-sure' : ''}" data-stx${(+h.money || 0) < G.price || h.busy ? ' disabled' : ''}>${stxSure(G) ? `Точно? ${X.money(G.price)}` : `+${G.step} ячеек · ${X.money(G.price)}`}</button>` : ''}</div>
      ${G.price && X.bal ? X.bal(G.price, h.money, 'cy-lack') : ''}
      ${grid(st, 's', G.scap, 'Склад')}
      <p class="note">Надетое и угощения особых событий (Хэллоуин и другие) места не занимают. Одинаковые еда, зелья и материалы лежат стопкой: в сумке — до ${G.bs}, на складе — до ${G.ss}.</p>
    </div>`;
  }
  function stResShow(t, bad) {
    STRES = t ? { t, bad: !!bad } : null;
    const el = S && S.panel && S.panel.querySelector('.cy-stres'); if (el) { el.textContent = t || ''; el.classList.toggle('bad', !!bad); }
  }
  // итог «всё разом» из игры (app.js storeNote → LGCity.storeRes)
  function storeRes(x) { if (x && (x.op === 'stPutAll' || x.op === 'stTakeAll')) stResShow(`Перенесено ${x.n || 0}${x.left ? `, не влезло ${x.left}` : ''}`); }
  const stItem = (el) => { const c = el && STCELLS[el.dataset.st]; return c ? { ...c.it, n: c.n, uids: c.uids } : null; };
  function stTipShow(el) { if (X.cardTip && el && !(STD && STD.active())) { const it = stItem(el); if (it) X.cardTip(el, it, X.hero()); } }
  function stTipHide() { if (X.tipHide) X.tipHide(); }
  const stTipOn = () => (X.tipFor ? X.tipFor() : null);
  const stOff = () => { if (STD) { STD.off(); STD = null; STP = null; } stInvOff(); };   // 25.10: и новая сумка (inv2)
  // перетаскивание и подсказки — один раз на окно зала (окно новое при каждом входе)
  function stBind(P) {
    if (STP === P) return;
    stOff(); STP = P;
    const SEL = '.cy-store .cy-sc[data-st]', mine = () => S && S.panelId === 'storage' && S.panel === P;
    const why = (src, t) => { const h = X.hero(), from = src.dataset.st.slice(0, 1), c = STCELLS[src.dataset.st]; if (!h || !h.sg || !c || t.dataset.igdrop === from) return 'same'; if (h.busy) return 'busy'; return stCan(h, from, c) ? '' : 'full'; };
    STD = IGW().drag(P, {
      src: '.cy-store [data-igdrag][data-st]', drop: '.cy-store [data-igdrop]', tapSel: '.cy-store [data-st]', snap: true, scroll: true,
      ok: (src, t) => !why(src, t),
      onStart: () => stTipHide(),
      onDrop: (src) => { const [from, uid] = src.dataset.st.split(':'), c = STCELLS[src.dataset.st]; if (!c) return; stResShow('', false); stMove(from, uid, c.n, null); },
      reject: (src, t) => { const w = why(src, t), from = src.dataset.st.slice(0, 1); if (w === 'busy') stResShow('Идёт бой — склад после боя', true); else if (w === 'full') stResShow(from === 'b' ? 'На складе нет места — расширь склад или забери что-нибудь' : 'Сумка полна — освободи место', true); },
      onEnd: () => { if (STP && STP.dataset.stdirty) { delete STP.dataset.stdirty; rerenderUi('storage'); } },   // пока тащили, пришёл новый вид героя
      // нажатие без перетаскивания — выбрать ячейку (кнопки «На склад» / «В сумку» ниже); пальцем — ещё и карточка вещи
      // 24.10: Shift+клик — вся стопка (все одинаковые на этой стороне), Ctrl / ⌘+клик — половина; без клавиш — выбрать, как раньше
      hold: (src) => { const [from, uid] = src.dataset.st.split(':'); stTipHide(); stMenu(src, from, uid); },
      tap: (src, e) => { const [from, uid] = src.dataset.st.split(':');
        if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) { const h = X.hero(), all = stAllOf(h, from, STCELLS[src.dataset.st]); stGo(from, uid, e.shiftKey ? all : stHalf(all)); return; }
        STSEL = STSEL && STSEL.from === from && STSEL.uid === uid ? null : { from, uid }; rerenderUi('storage'); },
    });
    // 24.10: правая кнопка (и клавиша меню / Shift+F10 на ячейке) — меню «1 / половина / всё / N…»
    P.addEventListener('contextmenu', (e) => { if (!mine()) return; const el = e.target.closest(SEL); if (!el) return; e.preventDefault(); if (STD && STD.dragging()) return; const [from, uid] = el.dataset.st.split(':'); stTipHide(); stMenu(el, from, uid, e.pointerType === 'touch' ? null : { x: e.clientX, y: e.clientY }); });
    P.addEventListener('pointerdown', (e) => { if (!mine()) return; STTAP = e.pointerType || 'mouse'; if (e.pointerType === 'mouse' || !e.target.closest(SEL)) stTipHide(); });
    P.addEventListener('pointerover', (e) => { if (!mine() || e.pointerType !== 'mouse' || STD.active()) return; const el = e.target.closest(SEL); if (el && stTipOn() !== el) stTipShow(el); });
    P.addEventListener('pointerout', (e) => { if (!mine() || e.pointerType !== 'mouse') return; const el = e.target.closest(SEL); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) stTipHide(); });
    P.addEventListener('focusin', (e) => { if (!mine()) return; const el = e.target.closest(SEL); if (el && el.matches(':focus-visible')) stTipShow(el); });
    P.addEventListener('focusout', (e) => { if (mine() && e.target.closest(SEL)) stTipHide(); });
    P.addEventListener('scroll', () => { if (mine()) stTipHide(); }, { passive: true, capture: true });
  }
  function storageAfter(h) {
    const P = S.panel; if (!IGW()) return;
    if (stInv2(h)) stMount2(h, P); else { stInvOff(); stBind(P); }
    const f = stTipOn(); if (f && !f.isConnected) stTipHide();
    P.querySelectorAll('[data-stgo]').forEach((b) => b.onclick = () => { if (!STSEL) return; stMove(STSEL.from, STSEL.uid, +b.dataset.stgo || 1, b); });
    P.querySelectorAll('[data-stall]').forEach((b) => b.onclick = () => { const put = b.dataset.stall === 'put'; stResShow('', false); stAct(put ? '/api/stPutAll' : '/api/stTakeAll', {}, put ? 'Кладовщик относит всё на склад' : 'Кладовщик несёт всё в сумку', b); });
    P.querySelectorAll('[data-stsort]').forEach((b) => b.onclick = () => stAct('/api/stSort', { box: b.dataset.stsort }, b.dataset.stsort === 'b' ? 'Сумка разложена' : 'Склад разложен', b));
    // 24.10 (баг тестера): «Точно?» помним вне кнопки (STX) — склад перерисовывается на каждое обновление героя, и второе нажатие
    // попадало в новую кнопку без пометки. Через 4 с без ответа — снова «+N ячеек»
    const x = P.querySelector('[data-stx]'); if (x) x.onclick = () => {
      const H = X.hero(), G = H && H.sg; if (!G || !G.price) return;
      if (!stxSure(G)) { STX = { until: Date.now() + 4000, price: G.price }; clearTimeout(STX_T); STX_T = setTimeout(() => { STX = null; rerenderUi('storage'); }, 4000); rerenderUi('storage'); const b = S && S.panel && S.panel.querySelector('[data-stx]'); if (b) b.focus(); return; }
      STX = null; clearTimeout(STX_T);
      stAct('/api/stExpand', { price: G.price }, `Склад расширен: +${G.step} ячеек`, x);
    };
    // на телефоне подсказка — по нажатию: выбранная ячейка показывает карточку вещи
    if (STTAP && STTAP !== 'mouse' && STSEL) { const el = P.querySelector(`[data-st="${STSEL.from}:${CSS.escape(STSEL.uid)}"]`); if (el) stTipShow(el); }
  }

  /* ----- Шатёр: облик — примерка на своём герое; своё — надеть, новое — купить на стриме ----- */
  const TENT = [['shape', 'Форма', 'shapes'], ['color', 'Цвет', 'colors'], ['eyes', 'Глаза', 'eyes'], ['mouth', 'Рот', 'mouths'], ['hat', 'Шапка', 'hats'], ['acc', 'Аксессуар', 'acc']];
  let TRY = {}, TF = 'hat';
  function tentBody(h) {
    if (FULL.tent) return shopBar(h, Object.keys(TRY).length ? '<button type="button" class="btn ghost sm" data-untry>Снять примерку</button>' : '');
    return tentBody0(h);
  }
  function tentBody0(h) {
    const W0 = h.wardrobe || { cur: {}, own: {} }, cur = W0.cur || {}, own = W0.own || {};
        const C = (D() && D().CATALOG) || {};
    const [f, , cat] = TENT.find((x) => x[0] === TF) || TENT[0];
    const list = (C[cat] || []).filter(([id]) => id !== 'none');
    const has = (v) => (own[f] || []).some((x) => String(x).toLowerCase() === String(v).toLowerCase());
    const worn = (v) => (f === 'acc' ? (Array.isArray(cur.acc) ? cur.acc : []).includes(v) : String(cur[f] || '').toLowerCase() === String(v).toLowerCase());
    const sel = TRY[f] != null ? (f === 'acc' ? TRY.acc[0] : TRY[f]) : null;
    const pick = sel != null ? list.find(([id]) => String(id).toLowerCase() === String(sel).toLowerCase()) : null;
    const act = pick ? (worn(pick[0]) ? '<p class="note">Уже надето.</p>' : has(pick[0]) ? `<button type="button" class="btn primary wide" data-wear="${esc(f)}" data-v="${esc(pick[0])}"${h.busy ? ' disabled' : ''}>Надеть «${esc(pick[1])}»</button>` : `<p class="note cy-buy">Купить — на стриме, в Шатре: кабинка «${esc((TENT.find((x) => x[0] === f) || [])[1] || '')}», образец «${esc(pick[1])}» (баллы канала).</p>`) : '<p class="note">Выбери образец — примерим на твоём герое.</p>';
    // 21.10: на телефоне герой в сцене мелкий (а то и за краем) — примерку показываем ещё и тут, крупно (CSS: только на телефоне)
    const fig = `<div class="cy-tryfig" aria-hidden="true">${still(X.doodle(X.login(), { ...h, look: { ...cur, ...TRY }, gear: {} }, 'happy', 'peace'))}</div>`;
    return `<div class="cy-tent">
      <div class="cy-trytop">${fig}${Object.keys(TRY).length ? '<button type="button" class="btn ghost sm" data-untry>Снять примерку</button>' : '<p class="note">Примерка — прямо на твоём герое в Шатре.</p>'}</div>
      <div class="cy-try">
        <div class="filters" role="group" aria-label="Что примерить">${TENT.map(([k, l]) => `<button type="button" data-tf="${k}" aria-pressed="${TF === k}">${l}</button>`).join('')}</div>
        <div class="cy-opts">${list.map(([id, nm]) => `<button type="button" class="cy-opt${has(id) ? ' own' : ''}${sel != null && String(sel).toLowerCase() === String(id).toLowerCase() ? ' on' : ''}" data-try="${esc(id)}" title="${esc(nm)}">${cat === 'colors' ? `<i style="background:${esc(id)}"></i>` : ''}${esc(nm)}${has(id) ? '<small>есть</small>' : ''}</button>`).join('')}</div>
        ${act}
      </div>
    </div>`;
  }
  function tentAfter(h) {
    const P = S.panel;
    if (FULL.tent) { const u0 = P.querySelector('[data-untry]'); if (u0) u0.onclick = () => { TRY = {}; GSEL = null; cardDrop(); rerenderUi('tent'); }; return; }
    P.querySelectorAll('[data-tf]').forEach((b) => b.onclick = () => { TF = b.dataset.tf; rerenderUi('tent'); });
    P.querySelectorAll('[data-try]').forEach((b) => b.onclick = () => { const v = b.dataset.try; if (TF === 'acc') TRY.acc = [v]; else TRY[TF] = v; rerenderUi('tent'); });
    const u = P.querySelector('[data-untry]'); if (u) u.onclick = () => { TRY = {}; rerenderUi('tent'); };
    const w = P.querySelector('[data-wear]'); if (w) w.onclick = () => { const f = w.dataset.wear, v = w.dataset.v; delete TRY[f]; X.act('/api/wear', { field: f, value: v }, 'Надето', w); };
  }

  /* ----- 23.10: лавки «Города» — товар на полках (Кузня, магическая лавка, амулеты Шатра) и на прилавке Лавки -----
     Наведение мыши (ПК) или нажатие (телефон) — карточка вещи (общая карточка сайта X.itemBody: характеристики, новые — только кому открыты,
     класс, тип брони, описание) и цена. Двойной клик или второе нажатие — табличка «Купить … за …? Да / Нет»; без «Да» ничего не покупается.
     Покупки за монеты (cs у героя: cityShopPublic или тестер) — в любое время, и без стрима (очередь действий сайта → комната канала:
     modules/site/server.js → cityBuyOp). Нет cs — в табличке «Купить можно на стриме» (за баллы канала). Облик Шатра — только за баллы. */
  const WEARS = ['weapon', 'armor', 'shield', 'helmet', 'trinket'];
  // товар места: у кого открыта магическая лавка — Кузня и Шатёр без её товара (forgeM / tentM)
  const stockOf = (id) => { if (!STOCK) return null; if (id === 'magic') return STOCK.magic || null; if (id === 'forge') return (msOn() && STOCK.forgeM) || STOCK.forge || null; if (id === 'tent') return (msOn() && STOCK.tentM) || STOCK.tent || null; if (id === 'shop') return STOCK.rows || null; return null; };
  const goodsOf = (id, st) => (!st ? [] : id === 'tent' ? st.amulets || [] : id === 'shop' ? [...(st.potions || []), ...(st.food || [])] : [...(st.shelf1 || []), ...(st.shelf2 || []), ...(st.case || []), ...(st.mats || [])]);
  const matCoins = (it) => { const E = X.ench ? X.ench() : null; return it.mat && E && E.coins ? +E.coins[it.mat] || 0 : 0; };
  // цена в монетах (с воровской наценкой) — 0: за монеты не продаётся (звёзды и сферы — пока заточка закрыта)
  // 23.10: город чужого округа (quest/towns.js): цена ×k, лучшие сделки (эпические и легендарные, верхний ряд стендов) и материалы заточки закрыты
  const coinsFor = (it, h) => { const b = it.mat ? (h && h.ef ? matCoins(it) : 0) : +it.coins || 0; return b > 0 ? Math.round(TH.price(h, b) * (it.mat ? 1 : foreignK())) : 0; };
  const topIds = () => { const o = new Set(); for (const k of ['forge', 'forgeM', 'magic']) for (const x of ((STOCK && STOCK[k] && STOCK[k].stands) || [])) for (const it of x.top || []) o.add(it.id); return o; };
  const lockedHere = (it) => foreignK() > 1 && !homeHere() && !!it && (!!it.mat || ['epic', 'legendary'].includes(it.rarity) || topIds().has(it.id));
  const LOCK_T = 'Откроется после захвата';
  const plainMoney = (n) => { const d = document.createElement('div'); d.innerHTML = X.money(n); return d.textContent.replace(/\s+/g, ' ').trim(); };
  const shortMoney = (n) => { n = Math.max(0, Math.floor(+n || 0)); const g = Math.floor(n / 10000), s2 = Math.floor(n / 100) % 100, b = n % 100; return [g && g + 'з', s2 && s2 + 'с', (b || (!g && !s2)) && b + 'м'].filter(Boolean).join(' '); };
  // рисунок полок с ценами в монетах (кому покупки за монеты открыты); иначе — баллы, как на стриме
  function shopView(id, st) {
    if (!st || !csOn()) return st;
    const h = X.hero(), conv = (it) => { if (it && it.out) return { ...it, priceText: 'Закончились' };   // 27.10: звёзды и сферы закончились (enchantMatsOut)
      if (lockedHere(it)) return { ...it, priceText: '🔒' }; const c = coinsFor(it, h); return c ? { ...it, price: c, priceText: shortMoney(c) } : it; };
    // 29.10 (Шахта 3.0, шаг 5): в городе с Ратушей нового образца товар - по уровню здания (towngen.goodsOk): лучше здание - больше вещей, эпик - на ур. 5
    const lvB = inTown() && TOWN.meta && TOWN.meta.lv3 && window.LGTownGen && window.LGTownGen.goodsOk ? +((TOWN.meta.levels || {})[id] || 1) : 0;
    const keep = (it) => !lvB || !it || it.mat || window.LGTownGen.goodsOk(it.id, it.rarity, lvB);
    const L2 = (a) => (a || []).filter(keep).map(conv);
    return { ...st, stands: (st.stands || []).map((x) => ({ ...x, top: L2(x.top), mid: L2(x.mid), case: L2(x.case) })), shelf1: L2(st.shelf1), shelf2: L2(st.shelf2), case: L2(st.case), mats: L2(st.mats), amulets: L2(st.amulets) };
  }
  // 25.10: названия редкостей и слотов - из данных игры (packages/game-data), как в сумке сайта (было своё «Броня» вместо «Доспех»)
  const RAR_RU = window.LGGameData.rarityNames();
  const SLOT_RU = window.LGGameData.slotNames();
  const placeName = (b) => (b === 'magic' ? (msOn() ? String(X.hero().ms) : 'магической лавке') : b === 'tent' ? 'Шатре' : b === 'shop' ? 'Торговых рядах' : 'Кузне');
  function cardHtml(it, b, h) {
    // характеристики и описание — общая подсказка-карточка сайта (app.js cardTip у вещи); здесь — цена и покупка
    const nm = X.itemName(it.id) || it.name, c = coinsFor(it, h), body = X.cardTip ? '' : (it.desc ? `<p class="d-desc">${esc(it.desc)}</p>` : '');
    const k = TH.k(h);
    const price = lockedHere(it) ? `<p class="cy-icp pts">🔒 ${LOCK_T}</p>` : csOn() && c ? `<p class="cy-icp">${X.money(c)}${k > 1 ? ` <small class="thiefl">для вора ×${String(k).replace('.', ',')}</small>` : ''}${foreignK() > 1 ? ` <small class="thiefl">${homeHere() ? 'край' : 'чужой округ'} ×${String(foreignK()).replace('.', ',')}</small>` : ''}</p>`
      : `<p class="cy-icp pts">${it.price ? (+it.price).toLocaleString('ru-RU') + ' баллов канала' : ''} <small>на стриме, в ${esc(placeName(b))}${it.rank ? `, звание не ниже «${esc(it.rank)}»` : ''}</small></p>`;
    return `<div class="cy-ich"><b data-r="${esc(it.rarity || 'common')}">${esc(nm)}</b><small>${RAR_RU[it.rarity] || ''}${SLOT_RU[it.slot] ? ' · ' + SLOT_RU[it.slot] : ''}</small></div>${body}${price}<p class="cy-ichint">${touchy() ? 'Нажми на вещь ещё раз — купить' : 'Двойной клик — купить'}</p><button type="button" class="btn primary sm wide cy-icbuy" data-cardbuy>Купить…</button>`;
  }
  const touchy = () => !!((S && S.touch) || window.LGSiteUi.is('nohover'));
  // подсказка под интерфейсом места: как покупать (и воровская наценка)
  const goodsHelp = (h) => `<p class="note cy-gh">${csOn() ? 'Покупки — за монеты героя, в любое время: двойной клик по товару (на телефоне — нажми дважды) и «Да».' : 'Купить можно на стриме, за баллы канала. Здесь — посмотреть, что даёт вещь (наведи или нажми).'}</p>${csOn() ? TH.note(h) : ''}`;
  let GSEL = null;   // выбранный товар: { b, id }
  const card = () => { let c = S.room.querySelector('.cy-icard'); if (!c) { c = document.createElement('div'); c.className = 'cy-icard panel'; c.setAttribute('role', 'tooltip'); S.room.appendChild(c); } return c; };
  function cardShow(el, it, b, pinned) {
    const h = X.hero();
    if (X.cardTip) { try { X.cardTip(el, tipItem(it), h); } catch (e) {} }   // характеристики — общей карточкой рядом с вещью
    if (!pinned && X.cardTip) return;
    const c = card(); c.innerHTML = cardHtml(it, b, h); c.classList.add('on'); c.classList.toggle('pin', !!pinned);
    const cb = c.querySelector('[data-cardbuy]'); if (cb) cb.onclick = () => buyAsk(it, b, el);
    if (pinned) { const x = document.createElement('button'); x.type = 'button'; x.className = 'cy-icx'; x.setAttribute('aria-label', 'Закрыть'); x.textContent = '×'; x.onclick = (e) => { e.stopPropagation(); unselect(); }; c.appendChild(x); }   // 23.10: закрыть карточку   // выбранная вещь — и кнопкой (телефон, клавиатура)
    // цена и «Купить…» — внизу слева (ПК) или внизу (телефон): не на полках и не поверх общей карточки у вещи
    const rr = S.room.getBoundingClientRect(), w = c.offsetWidth;
    c.style.top = 'auto'; c.style.bottom = rr.width <= 720 ? '8px' : '16px'; c.style.left = (rr.width <= 720 ? Math.max(8, (rr.width - w) / 2) : 16) + 'px';
  }
  const cardHide = () => { const c = S && S.room && S.room.querySelector('.cy-icard'); if (c && !c.classList.contains('pin')) c.classList.remove('on'); };
  const cardDrop = () => { if (X && X.tipHide) X.tipHide(); const c = S && S.room && S.room.querySelector('.cy-icard'); if (c) c.classList.remove('on', 'pin'); };
  const tipItem = (it) => ({ ...it, name: X.itemName(it.id) || it.name, stats: it.stats || {}, wearable: WEARS.includes(it.slot), on: false, uids: [] });
  const findGood = (b, id) => goodsOf(b, stockOf(b)).find((x) => x.id === id) || null;
  // одна кнопка товара: наведение — карточка, нажатие — выбрать (второе нажатие или двойной клик — «Купить?»)
  function bindGood(el, b, id) {
    // наведение мыши — общая подсказка-карточка сайта (app.js cardTip, как у склада и наковальни); выбранная вещь — своя карточка с ценой и «Купить…»
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || !S || S.panelId == null || buyOpen() || (GSEL && GSEL.id === id)) return; const it = findGood(b, id); if (!it) return; if (X.cardTip) X.cardTip(el, tipItem(it), X.hero()); else cardShow(el, it, b, false); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; if (X.tipHide) X.tipHide(); if (!(GSEL && GSEL.id === id)) cardHide(); });
    el.addEventListener('click', () => {
      const it = findGood(b, id); if (!it) return; if (X.tipHide) X.tipHide();
      if (GSEL && GSEL.id === id && GSEL.b === b) { buyAsk(it, b, el); return; }
      GSEL = { b, id }; S.room.querySelectorAll('.cy-hot.on, .cy-good.on').forEach((x) => x.classList.remove('on')); el.classList.add('on'); cardShow(el, it, b, true);
    });
    el.addEventListener('dblclick', (e) => { e.preventDefault(); const it = findGood(b, id); if (it && !buyOpen()) buyAsk(it, b, el); });
  }
  // кнопки поверх полок сцены (в координатах сцены — масштабируются вместе с ней)
  function goodsHots(id) {
    GSEL = null; cardDrop(); buyClose();
    const inn = S.room.querySelector('.cy-rin'); if (!inn) return;
    const old = inn.querySelector('.cy-hots'); if (old) old.remove();
    if (!(id === 'forge' || id === 'magic' || id === 'tent' || id === 'shop')) return;
    const st = stockOf(id), h = X.hero();
    if (id === 'shop' && FULL.shop) { shopTiles(inn, st, h); return; }
    const pos = S.itemPos || {}, list = goodsOf(id, st).filter((it) => pos[it.id]);
    if (id === 'tent' && FULL.tent) tentHots(inn, st, pos);
    if (!list.length) return;
    const box = document.createElement('div'); box.className = 'cy-hots';
    box.innerHTML = list.map((it) => { const p = pos[it.id], c = coinsFor(it, h); return `<button type="button" class="cy-hot${lockedHere(it) ? ' lock' : ''}" data-good="${esc(it.id)}" style="left:${Math.round(p.x - 64)}px;top:${Math.round(p.y - 92)}px" aria-label="${esc(X.itemName(it.id) || it.name)} — ${csOn() && c ? esc(plainMoney(c)) : 'купить на стриме'}"></button>`; }).join('');
    inn.appendChild(box);
    box.querySelectorAll('[data-good]').forEach((el) => bindGood(el, id, el.dataset.good));
    olHots(box);
  }
  /* 23.10 (баг от зрителя): кнопка товара — ровно по рисунку вещи на сцене (раньше — 128×210 от точки itemPos: залезала на ценники полки выше),
     наведение / фокус — контур вещи (.cy-olh), выбранная (.on) — контур ярче (.cy-olo). Толщина — по масштабу сцены: на телефоне тоже видно.
     У стиля нет группы data-it — кнопка как была, мягкий свет (city.css) */
  const dIt = (id) => String(id).replace(/[^\w:.-]/g, '_');
  function olHots(box) {
    const svg = S && S.room && S.room.querySelector('.cy-rbg'); if (!svg || !box.isConnected) return;
    const k = () => { const r = svg.getBoundingClientRect(); return r.width > 0 ? r.width / 1920 : 0; };
    const olR = () => { const kk = k(); if (!kk) return; const r = Math.min(9, Math.max(3, 2.6 / kk)); svg.querySelectorAll('#cy-itol .cy-olm, #cy-itol2 .cy-olm').forEach((m, i) => m.setAttribute('radius', (i ? r * 1.35 : r).toFixed(1))); };
    // рисунок вещи (в координатах сцены) ∩ прежняя зона кнопки: у человечков-образцов рамка рисунка огромная (вложенные svg) — тогда зона как была
    const place = () => {
      const kk = k(), sr = svg.getBoundingClientRect(); if (!kk) return;
      box.querySelectorAll('.cy-hot.ol').forEach((el) => {
        const r = el._ol.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return;
        const d = el._z || (el._z = [el.offsetLeft, el.offsetTop, el.offsetLeft + el.offsetWidth, el.offsetTop + el.offsetHeight]), p = 8;
        let L = Math.max(d[0], (r.left - sr.left) / kk - p), T = Math.max(d[1], (r.top - sr.top) / kk - p), R = Math.min(d[2], (r.right - sr.left) / kk + p), B = Math.min(d[3], (r.bottom - sr.top) / kk + p);
        if (R - L < 24 || B - T < 24) return;   // рисунок не там, где кнопка — не трогаем
        const mw = Math.min(56, d[2] - d[0]), mh = Math.min(56, d[3] - d[1]);   // мелкую вещь — не меньше 56
        if (R - L < mw) { const c = (L + R) / 2; L = c - mw / 2; R = c + mw / 2; }
        if (B - T < mh) { const c = (T + B) / 2; T = c - mh / 2; B = c + mh / 2; }
        Object.assign(el.style, { left: Math.round(L) + 'px', top: Math.round(T) + 'px', width: Math.round(R - L) + 'px', height: Math.round(B - T) + 'px' });
      });
    };
    box.querySelectorAll('[data-good], [data-smp]').forEach((el) => {
      const g = svg.querySelector(`[data-it="${dIt(el.dataset.good || el.dataset.smp).replace(/["\\]/g, '')}"]`), a = g && g.querySelector(':scope > [data-ia]');
      if (!a) return;
      el._ol = a; el.classList.add('ol');
      const hl = (on) => { if (on) olR(); g.classList.toggle('cy-olh', on); };
      el.addEventListener('pointerenter', () => hl(true)); el.addEventListener('pointerleave', () => hl(false));
      el.addEventListener('focus', () => hl(true)); el.addEventListener('blur', () => hl(false));
    });
    // выбор (.on) ставят и снимают в разных местах (bindGood, unselect, кабинки Шатра) — следим за классом кнопок
    const sync = () => box.querySelectorAll('.cy-hot.ol').forEach((el) => { const g = el._ol.parentNode, on = el.classList.contains('on'); if (on) olR(); if (g.classList.contains('cy-olo') !== on) g.classList.toggle('cy-olo', on); });
    new MutationObserver(sync).observe(box, { subtree: true, attributes: true, attributeFilter: ['class'] });
    place(); olR(); if (!k()) requestAnimationFrame(() => { place(); olR(); });
  }
  // Лавка: товар прилавка — плитками на полках слева (рисунок Лавки — cityart: полки x 80…640, y 330 и 560), звёзды и сферы — справа
  function shopTiles(inn, st, h) {
    const goods = st ? [...(st.potions || []), ...(st.food || [])] : [];
    const mats = h && h.ef && !msOn() ? [{ id: 'enchant_star', mat: 'star', slot: 'material', rarity: 'uncommon', name: X.itemName('enchant_star') || 'Счастливая звезда' }, { id: 'enchant_sphere', mat: 'sphere', slot: 'material', rarity: 'rare', name: X.itemName('enchant_sphere') || 'Сфера сохранения' }] : [];
    if (!goods.length && !mats.length) return;
    const tile = (it, x, y) => { const c = coinsFor(it, h), nm = X.itemName(it.id) || it.name, pr = csOn() && c ? shortMoney(c) : it.price ? (+it.price).toLocaleString('ru-RU') + ' б.' : '';
      return `<button type="button" class="cy-hot cy-tile${lockedHere(it) ? ' lock' : ''}" data-good="${esc(it.id)}" data-r="${esc(it.rarity || 'common')}" style="left:${x - 44}px;top:${y - 118}px" aria-label="${esc(nm)} — ${csOn() && c ? esc(plainMoney(c)) : 'купить на стриме'}"><span class="cy-gi">${X.art(it)}</span><b>${esc(nm)}</b><i>${esc(pr)}</i></button>`; };
    const box = document.createElement('div'); box.className = 'cy-hots';
    box.innerHTML = goods.slice(0, 12).map((it, i) => tile(it, 80 + 50 + (i % 6) * 92, i < 6 ? 330 : 560)).join('') + mats.map((it, i) => tile(it, 1300 + 50 + i * 92, 330)).join('');
    inn.appendChild(box);
    const all = [...goods, ...mats];
    box.querySelectorAll('[data-good]').forEach((el) => { const id = el.dataset.good, it = all.find((x) => x.id === id); if (it && it.mat) { el.addEventListener('click', () => { if (GSEL && GSEL.id === id) buyAsk(it, 'shop', el); else { GSEL = { b: 'shop', id }; box.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); el.classList.add('on'); cardShow(el, it, 'shop', true); } }); el.addEventListener('dblclick', () => { if (!buyOpen()) buyAsk(it, 'shop', el); }); el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !buyOpen()) cardShow(el, it, 'shop', GSEL && GSEL.id === id); }); el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !(GSEL && GSEL.id === id)) cardHide(); }); } else bindGood(el, 'shop', id); });
  }
  // Шатёр: образцы кабинок на сцене — нажать: примерить на своём герое и карточка (своё — «Надеть», новое — за баллы на стриме)
  const BOOTH_RU = { shape: 'Форма тела', color: 'Цвет тела', eyes: 'Глаза', mouth: 'Рот', blush: 'Румянец', hat: 'Головной убор', acc: 'Аксессуар', aura: 'Аура' };
  function tentHots(inn, st, pos) {
    const smps = []; for (const b of (st && st.booths) || []) for (const smp of b.samples || []) if (pos[smp.pos]) smps.push([b, smp]);
    if (!smps.length) return;
    const box = document.createElement('div'); box.className = 'cy-hots';
    box.innerHTML = smps.map(([b, smp]) => { const p = pos[smp.pos]; return `<button type="button" class="cy-hot sm" data-smp="${esc(smp.pos)}" style="left:${Math.round(p.x - 34)}px;top:${Math.round(p.y - 44)}px" aria-label="${esc(b.title)}: ${esc(smp.name)}"></button>`; }).join('');
    inn.appendChild(box);
    const valOf = (b, smp) => (b.key === 'blush' ? String(!!(smp.look && smp.look.blush)) : smp.id);
    const owned = (b, smp) => { const h = X.hero(), own = (h && h.wardrobe && h.wardrobe.own && h.wardrobe.own[b.key]) || []; const v = valOf(b, smp); return own.some((x) => String(x).toLowerCase() === String(v).toLowerCase()); };
    const html = (b, smp) => `<div class="cy-ich"><b>${esc(smp.name)}</b><small>${esc(b.title || BOOTH_RU[b.key] || '')} · образец №${smp.n}</small></div><p class="d-desc">Только внешность — на характеристики не влияет. Примерено на твоём герое.</p>`
      + (owned(b, smp) ? `<p class="cy-icp">Уже есть в гардеробе</p><button type="button" class="btn primary sm wide" data-tentwear>Надеть</button>` : `<p class="cy-icp pts">${(+b.price || 0).toLocaleString('ru-RU')} баллов канала <small>на стриме, в Шатре: кабинка «${esc(b.title || '')}», образец №${smp.n}</small></p><p class="cy-ichint">${touchy() ? 'Нажми ещё раз' : 'Двойной клик'} — как купить</p>`);
    const tryOn = (b, smp) => { const f = b.key; if (f === 'acc') TRY.acc = [smp.id]; else if (f === 'blush') TRY.blush = !!(smp.look && smp.look.blush); else TRY[f] = smp.id; const fg = S.room.querySelector('.cy-fig2.me'), h = X.hero(); if (fg && h) fg.innerHTML = still(X.doodle(X.login(), { ...h, look: { ...((h.wardrobe && h.wardrobe.cur) || {}), ...TRY }, gear: {} }, 'happy', 'peace')); };
    const ask = (b, smp, el) => { if (owned(b, smp)) { delete TRY[b.key]; X.act('/api/wear', { field: b.key, value: valOf(b, smp) }, 'Надето', null); cardDrop(); return; } buyAsk({ id: smp.pos, name: smp.name, price: b.price, look: true }, 'tent', el); };
    box.querySelectorAll('[data-smp]').forEach((el) => {
      const [b, smp] = smps.find(([, x]) => x.pos === el.dataset.smp);
      const show = (pin) => { const c = card(); c.innerHTML = html(b, smp); c.classList.add('on'); c.classList.toggle('pin', pin); const w = c.querySelector('[data-tentwear]'); if (w) w.onclick = () => ask(b, smp, el); cardPlace(c, el); };
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !buyOpen()) show(GSEL && GSEL.id === smp.pos); });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !(GSEL && GSEL.id === smp.pos)) cardHide(); });
      el.addEventListener('click', () => { if (GSEL && GSEL.id === smp.pos) { ask(b, smp, el); return; } GSEL = { b: 'tent', id: smp.pos }; box.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); el.classList.add('on'); tryOn(b, smp); show(true); rerenderUi('tent'); });
      el.addEventListener('dblclick', (e) => { e.preventDefault(); if (!buyOpen()) ask(b, smp, el); });
    });
    olHots(box);
  }
  // карточка рядом с местом (ПК) или внизу (телефон)
  function cardPlace(c, el) {
    const rr = S.room.getBoundingClientRect(), r = el.getBoundingClientRect(), w = c.offsetWidth, hh = c.offsetHeight;
    if (rr.width <= 720) { c.style.left = Math.max(8, (rr.width - w) / 2) + 'px'; c.style.top = 'auto'; c.style.bottom = '8px'; return; }
    c.style.bottom = ''; let x = r.right - rr.left + 10; if (x + w > rr.width - 8) x = r.left - rr.left - w - 10;
    c.style.left = Math.max(8, x) + 'px'; c.style.top = Math.max(64, Math.min(rr.height - hh - 8, r.top - rr.top + r.height / 2 - hh / 2)) + 'px';
  }
  const buyOpen = () => !!(S && S.room && S.room.querySelector('.cy-buyq'));
  function buyClose() { const q = S && S.room && S.room.querySelector('.cy-buyq'); if (q) q.remove(); }
  // 23.10 (баг зрителя): после «Понятно» / «Нет» карточка выбранного товара оставалась и закрывала полки — снимаем выбор целиком
  // нажатие мимо товара, карточки и таблички «Купить?» — выбор снимается (карточка не закрывает полки)
  document.addEventListener('pointerdown', (e) => { if (!GSEL || !S || !S.room || S.room.hidden) return; if (e.target.closest && e.target.closest('.cy-icard, .cy-hot, .cy-good, .cy-buyq')) return; unselect(); }, { capture: true, passive: true });
  function unselect() { buyClose(); cardDrop(); GSEL = null; if (S && S.room) S.room.querySelectorAll('.cy-hot.on, .cy-good.on').forEach((x) => x.classList.remove('on')); }
  // «Купить … за …? Да / Нет»; покупки на сайте закрыты (или за монеты не продаётся) — «Купить можно на стриме»
  function buyAsk(it, b, from, matBase) {
    buyClose();
    const h = X.hero(), nm = X.itemName(it.id) || it.name;
    if (lockedHere(it)) {   // 23.10: чужой округ — лучшие сделки закрыты (сервер тоже не продаст)
      const q = document.createElement('div'); q.className = 'cy-buyq'; q.setAttribute('role', 'dialog'); q.setAttribute('aria-modal', 'true'); q.setAttribute('aria-label', 'Покупка');
      q.innerHTML = `<div class="cy-buyb panel"><p class="lead">🔒 «${esc(nm)}» — ${LOCK_T.toLowerCase()}</p><p class="note">Этот округ не принадлежит каналу: лучшие вещи торговец бережёт для своих. Захватите округ на стриме — откроется всё и по обычной цене.</p><div class="cy-buyr"><button type="button" class="btn primary" data-no>Понятно</button></div></div>`;
      S.room.appendChild(q); const no = q.querySelector('[data-no]'); no.onclick = () => { unselect(); try { from && from.focus(); } catch {} }; q.addEventListener('click', (e) => { if (e.target === q) unselect(); }); try { no.focus(); } catch {}
      return;
    }
    const mb = matBase || (it.mat ? matCoins(it) : 0), c = it.mat ? (h && h.ef && mb ? TH.price(h, mb) : 0) : coinsFor(it, h);
    const can = it.look !== true && !!h && (it.mat ? !!(h.ef && c) : csOn() && c > 0);   // облик (кабинки Шатра) — только за баллы на стриме
    // 29.10: расходники (еда, зелья) - сразу N штук, если открыто (h.bq - предел за раз); не больше, чем хватает монет
    const qmax = !it.mat && h && +h.bq > 1 && c > 0 && (b === 'shop' || it.slot === 'food' || it.slot === 'potion') ? Math.max(1, Math.min(+h.bq, Math.floor((+h.money || 0) / c))) : 1;
    let qn = 1;
    const q = document.createElement('div'); q.className = 'cy-buyq'; q.setAttribute('role', 'dialog'); q.setAttribute('aria-modal', 'true'); q.setAttribute('aria-label', 'Покупка');
    // 24.10 (баг тестера): не хватает — две строки обычным текстом: «У тебя: …» и «Не хватает: …» (единицы — как у цены)
    const poor = !!h && !h.ghost && (+h.money || 0) < c;
    const why = !h ? 'Героя пока нет.' : h.ghost ? 'Призраку не продают.' : poor ? 'Не хватает монет' : '';
    q.innerHTML = `<div class="cy-buyb panel">${can
      ? `<p class="lead">Купить «${esc(nm)}» за <span data-qt>${X.money(c)}</span>?</p>${qmax > 1 ? `<div class="cy-qty" role="group" aria-label="Сколько штук"><button type="button" class="btn ghost" data-q="-1" aria-label="Меньше">−</button><b data-qn aria-live="polite">1</b><button type="button" class="btn ghost" data-q="1" aria-label="Больше">+</button><small>шт., до ${qmax}</small></div>` : ''}${TH.k(h) > 1 ? `<p class="note thiefl">Для тебя за воровство цена ×${String(TH.k(h)).replace('.', ',')}.</p>` : ''}${why && !poor ? `<p class="note cy-warn">${why}</p>` : h && X.bal ? X.bal(c, h.money, 'cy-lack') : poor ? `<p class="note cy-warn">${why}</p>` : ''}<div class="cy-buyr"><button type="button" class="btn primary" data-yes${why ? ' disabled' : ''}>Да</button><button type="button" class="btn ghost" data-no>Нет</button></div>`
      : `<p class="lead">«${esc(nm)}» — купить можно на стриме</p><p class="note">${it.look === true ? `Облик — только за баллы канала: на стриме, в Шатре, ${(+it.price || 0).toLocaleString('ru-RU')} баллов.` : it.price && !it.mat ? `В ${esc(placeName(b))} на Ярмарке за ${(+it.price).toLocaleString('ru-RU')} баллов канала.` : it.mat ? 'На стриме — за баллы канала; за монеты — когда откроется заточка.' : 'На Ярмарке во время стрима.'}</p><div class="cy-buyr"><button type="button" class="btn primary" data-no>Понятно</button></div>`}</div>`;
    S.room.appendChild(q);
    const no = q.querySelector('[data-no]'), yes = q.querySelector('[data-yes]');
    q.querySelectorAll('[data-q]').forEach((bt) => bt.onclick = () => { qn = Math.max(1, Math.min(qmax, qn + +bt.dataset.q)); q.querySelector('[data-qn]').textContent = String(qn); q.querySelector('[data-qt]').innerHTML = X.money(c * qn); });
    q.addEventListener('click', (e) => { if (e.target === q) unselect(); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); unselect(); try { from && from.focus(); } catch {} } });
    no.onclick = () => { unselect(); try { from && from.focus(); } catch {} };
    if (yes) yes.onclick = () => {
      buyClose(); cardDrop(); GSEL = null;
      const btn = from && from.classList && from.classList.contains('btn') ? from : null;   // кнопка товара на полке — без «Секунду…» в ней
      if (it.mat) X.act('/api/buymat', { mat: it.mat, ...(TH.k(h) > 1 ? { ack: 1 } : {}) }, `Заказано: «${nm}» — принесут через пару секунд`, btn);
      else X.act('/api/cityBuy', { item: it.id, price: c, ...(qn > 1 ? { n: qn } : {}), ...(inTown() ? { town: TOWN.id } : {}) }, `Куплено: «${nm}»${qn > 1 ? ` ×${qn}` : ''} — сейчас будет в сумке`, btn);
    };
    try { (yes || no).focus(); } catch {}
  }
  // полоса лавки: кошелёк, сумка (склад: N / предел), воровская наценка, свои кнопки места
  function shopBar(h, extra) {
    if (!h) return `<div class="cy-bar2"><span class="cy-bnote">Героя пока нет — он появится, когда ты напишешь в чат на стриме.</span></div>`;
    const G = h.sg, n = (h.items || []).filter((x) => !x.on).length, k = TH.k(h);
    const bag = G ? `${G.used} / ${G.cap}` : String(n), full = !!(G && G.used >= G.cap);
    return `<div class="cy-bar2"><span class="cy-wal" title="Кошелёк героя">у тебя ${X.money(+h.money || 0)}</span><span class="cy-bagc${full ? ' full' : ''}" title="${full ? 'Сумка полна — разгрузи на склад' : 'Сумка'}">🎒 Сумка ${bag}</span>${k > 1 ? `<span class="cy-thk thiefl" title="Тебя ловили на краже — торговцы продают дороже">для тебя цены ×${String(k).replace('.', ',')}</span>` : ''}${foreignK() > 1 ? (homeHere() ? `<span class="cy-thk thiefl" title="Край отряда: пока не побеждён босс округа, торговцы продают дороже (продажа - как обычно)">край: цены ×${String(foreignK()).replace('.', ',')} до победы над боссом округа</span>` : `<span class="cy-thk thiefl" title="Округ не принадлежит каналу: лучшие вещи закрыты, остальное дороже">чужой округ: цены ×${String(foreignK()).replace('.', ',')}, лучшее — после захвата</span>`) : ''}${extra || ''}</div>`;
  }
  function magicBody(h) {
    return shopBar(h, stockOf('magic') ? '' : '<span class="cy-bnote">Звездочёт раскладывает товар…</span>');
  }

  /* ----- Кузня: сцена с наковальней — кузнец бьёт 2–5 раз, искры, свечение растёт; итог — вспышка «+8», трещины, «−1» ----- */
  /* ----- Кузня внутри — лавка кузнеца: товар стоек (тот же, что на стриме), покупка — на стриме; точить — у наковальни на улице ----- */
  // 26.10 (art/camp): в лагере «Перепутье» наковальни нет - заточка откроется в городе канала после пролога
  const goAnvil = () => (isCamp() ? '<span class="cy-bnote">Заточка - в городе канала, после пролога</span>' : '<button type="button" class="btn primary sm cy-goanvil" data-goanvil>🔨 К наковальне — заточка</button>');
  function forgeShop(h) {
    const st = STOCK && STOCK.forge;
    if (!st) return shopBar(h, `<span class="cy-bnote">Кузнец раскладывает товар…</span>${goAnvil()}`);
    // 23.10 (решение стримера): лавка на весь экран — товар на стойках (наведение / нажатие — карточка, двойной клик — «Купить? Да / Нет»),
    // сверху — полоса: кошелёк, сумка и «К наковальне»
    return shopBar(h, `${goAnvil()}`);
  }
  /* 23.10: окно наковальни — кукла героя (как во вкладке «Персонаж»), сумка ячейками (как на Складе), слот наковальни посередине.
     Вещь — перетащить на наковальню (мышь; палец — удержать) или просто нажать на неё. Подсказка — общая карточка вещи сайта.
     Ячейки и перетаскивание — общие (itemgrid.js → window.LGItems), способ заточки, шанс, цена — окно Кузни app.js (forgeOpen) */
  function forgeBody(h) {
    const rp = X.repBlock ? X.repBlock(h) : '';   // 22.10: починка — всем, даже пока заточка закрыта
    if (!h.ef) return `${say('Чиню снаряжение после походов. А заточку открою позже — загляни!')}${rp}<p class="note">Заточка пока открыта только тестерам.</p>`;
    return `<div class="cyf-wrap">
      <div class="cyf-anvbox" aria-live="polite"></div>
      <div class="cyf-dollbox" role="group" aria-label="Надето"></div>
      <div class="cyf-bagbox"></div>
      <div class="cyf-matbox"></div>
      <div class="cyf-ctl"><p class="note cyf-hint">${IGW() && window.LGSiteUi.is('touch') ? 'Нажми на вещь на герое или в сумке — кузнец положит её на наковальню. Или удерживай и перетащи.' : 'Перетащи вещь с героя или из сумки на наковальню — или просто нажми на неё.'}</p></div>
    </div>${rp}`;
  }
  const IGW = () => window.LGItems;
  let IGD = null;   // перетаскивание в окне наковальни (снимаем при выходе)
  const igOff = () => { if (IGD) { IGD.off(); IGD = null; } if (FGI) { try { FGI.destroy(); } catch (e) { /* уже снята */ } FGI = null; } };
  /* 25.10: новая сумка (новинка inv2 — флаг i2 у героя): кукла и сумка у наковальни — библиотека инвентаря, режим 'pick': нажатие
     или перетаскивание на наковальню — та же pickForge (окно Кузни app.js с этим uid); что не точится — тусклое. */
  let FGI = null;
  const fgInv2 = (h) => !!(h && h.i2 && window.LGInventory);
  function fgMount2(h, box, P) {
    const bb = box.querySelector('.cyf-bagbox'); if (!bb) return;
    const data = { hero: h, items: h.items || [], stack: h.sg ? h.sg.bs : 20, bagCap: h.sg ? h.sg.cap : null };
    if (FGI && FGI.el.isConnected && bb.contains(FGI.el)) { FGI.update(data); FGI.select(FX.uid || ''); return; }
    if (FGI) { try { FGI.destroy(); } catch (e) { /* уже снята */ } }
    bb.innerHTML = '<div class="cyf-inv2"></div>'; bb.dataset.k = '';
    FGI = window.LGInventory.mount(bb.firstChild, { variant: 'full', mode: 'pick', data,
      actions: { pick: (it) => pickForge(it.uid, P), drop: (it) => pickForge(it.uid, P) },
      options: { header: false, vitals: false, detail: false, art: X.art, storeKey: 'lgInv2Fg', dragRoot: P, dropSel: '[data-igdrop="anvil"]', dropOk: () => !FX.busy,
        can: (it) => { const hh = X.hero() || {}; return !X.canEnch(it) ? 'Это не точится' : hh.ghost ? 'Призрак не точит' : hh.busy ? 'Идёт бой - заточка после боя' : true; },
        figure: (hh) => (X.still && X.doodle ? X.still(X.doodle(X.login(), X.heroLook ? X.heroLook(hh) : hh, 'stern', 'battle')) : ''),
        cardTip: X.cardTip ? (el, it) => X.cardTip(el, it, X.hero()) : null, tipHide: X.tipHide ? () => X.tipHide() : null, sel: FX.uid || '' } });
  }
  const itemOf = (h, uid) => (h && (h.items || []).find((x) => x.uid === uid)) || null;
  // наковальня: вещь на ней (или пустой слот), под ней — наковальня Кузни
  function anvilHtml(h) {
    const it = itemOf(h, FX.uid) || FX.keep, gone = !!it && it === FX.keep;
    const cls = FX.busy ? ' work' : FX.anim && FX.anim.t > Date.now() ? ' ' + FX.anim.c : '';
    return `<div class="cyf-anv${it ? ' full' : ''}" data-igdrop="anvil">
      <div class="cyf-anvslot cy-sc${gone ? ' gone' : ''}${cls}" style="--n:${FX.n || 2}" data-r="${esc((it && it.rarity) || 'common')}">${it ? `${gone ? '' : `<button type="button" class="cyf-anvit" data-ig="${esc(it.uid)}" aria-label="На наковальне: ${esc(it.name)}">`}<span class="cy-gi">${X.art(it)}</span>${it.en > 0 ? `<i class="en">+${+it.en}</i>` : ''}${it.dur != null ? `<i class="du${+it.dur <= (X.durLow ? X.durLow() : 30) ? ' br' : ''}">${+it.dur}%</i>` : ''}${gone ? '' : '</button>'}` : '<span class="cyf-anvph" aria-hidden="true">+</span>'}</div>
      <div class="cyf-anvsvg" aria-hidden="true">${anvilSvg()}</div>
      <div class="cyf-anvn">${it ? `<b data-r="${esc(it.rarity)}">${esc(it.name)}</b><small>${gone ? 'сломалась' : it.on ? 'надето' : 'из сумки'}</small>` : '<b>Наковальня пуста</b><small>положи сюда вещь</small>'}${FX.last && it ? `<small class="cyf-anvres ${FX.last.c}" role="status">${esc(FX.last.t)}</small>` : ''}
        ${it && !FX.busy ? '<button type="button" class="btn ghost sm" data-anvoff>Убрать</button>' : ''}${it && !gone ? '<button type="button" class="btn ghost sm cyf-toctl" data-anvgo>К заточке ↓</button>' : ''}</div>
    </div>`;
  }
  function matsHtml(h) {
    const m = X.mats(h), seals = Object.keys(m.seals).map(Number).sort((a, b) => a - b);
    const one = (it, n, nm) => `<span class="cyf-mat${n ? '' : ' none'}" title="${esc(nm)}: ${n}"><span class="cy-gi">${X.art(it)}</span><b>×${n}</b><small>${esc(nm)}</small></span>`;
    return `<div class="cyf-mats" role="group" aria-label="Материалы заточки">${one({ slot: 'material', mat: 'star', rarity: 'uncommon' }, m.star, 'Счастливая звезда')}${one({ slot: 'material', mat: 'sphere', rarity: 'rare' }, m.sphere, 'Сфера сохранения')}`
      + `${seals.length ? seals.map((n) => one({ slot: 'material', mat: 'seal', seal: n, rarity: 'epic' }, m.seals[n], `Печать Ауруса ${n}`)).join('') : one({ slot: 'material', mat: 'seal', seal: 5, rarity: 'epic' }, 0, 'Печать Ауруса')}</div>`;
  }
  // перерисовать куклу, сумку, наковальню и материалы (окно способа заточки — своё, не трогаем); то, что не поменялось, — не трогаем
  // P — окно (панель места); по умолчанию — открытая панель «Города»
  function forgeList(h, P = S && S.panel) {
    const box = P && P.querySelector('.cyf-wrap'); if (!box || !h || !IGW()) return;
    if (IGD && IGD.active()) { FX.later(() => forgeList(X.hero(), P), 400); return; }   // тянут вещь — перерисуем после
    if (FX.uid && !itemOf(h, FX.uid) && !FX.busy) FX.uid = null;
    const L = IGW(), can = (it) => X.canEnch(it), drag = (it) => can(it) && !h.ghost && !h.busy;
    const put = (sel, html) => { const e = box.querySelector(sel); if (e && e.dataset.k !== html) { e.innerHTML = html; e.dataset.k = html; } };
    put('.cyf-anvbox', anvilHtml(h));
    box.classList.toggle('cyf-i2', fgInv2(h));   // 29.10: новая сумка - кукла внутри сумки (.cyf-bagbox): сетка без пустой области «doll»
    if (fgInv2(h)) { put('.cyf-dollbox', ''); fgMount2(h, box, P); put('.cyf-matbox', matsHtml(h)); forgeAway(box); return; }   // 25.10: новая сумка (inv2)
    put('.cyf-dollbox', !X.doll ? '' : X.doll(h, { forge: true, sel: FX.uid, can, still: true, kit: 'battle' }));
    const cs = L.cells(h.items || [], h.sg ? h.sg.bs : 20);
    put('.cyf-bagbox', `<div class="cy-sth"><h3 class="h3">Сумка</h3>${h.sg ? `<span class="cy-cnt${h.sg.used >= h.sg.cap ? ' full' : ''}">${h.sg.used} / ${h.sg.cap}</span>` : ''}</div>`
      + L.grid(cs, { art: X.art, cap: h.sg ? h.sg.cap : 20, label: 'Сумка', on: (c) => c.uids.includes(FX.uid), drag: (c) => drag(c.it), off: (c) => !can(c.it) }));
    put('.cyf-matbox', matsHtml(h));
    forgeAway(box);
  }
  // 24.10 (просьба стримера): вещь на наковальне — её место (слот на герое или ячейка сумки) пустое: блёклая рамка и значок наковальни.
  // Только вид: вещь остаётся надетой / в сумке. «Убрать» или закрыли окно — место снова с вещью (перерисовка без FX.uid)
  const AWAY_I = '<span class="cyf-awayi" aria-hidden="true"><svg viewBox="-80 -60 160 80"><path d="M-70 -50 H50 Q78 -50 78 -38 Q60 -34 44 -30 V-22 H-44 V-30 Q-62 -34 -70 -50 Z M-30 -22 H30 L38 10 H-38 Z" fill="currentColor"/></svg></span>';
  function forgeAway(box) {
    const uid = FX.uid ? String(FX.uid) : '';
    box.querySelectorAll('.cyf-dollbox [data-ig], .cyf-bagbox [data-ig]').forEach((el) => {
      const on = !!uid && el.dataset.ig === uid, was = el.classList.contains('cyf-away');
      if (on === was) return;
      el.classList.toggle('cyf-away', on);
      const ic = el.querySelector(':scope > .cyf-awayi'); if (ic) ic.remove();
      if (on) { el.insertAdjacentHTML('beforeend', AWAY_I); el.dataset.al = el.getAttribute('aria-label') || ''; el.setAttribute('aria-label', `${el.dataset.al.split(' — ')[0]} - сейчас на наковальне`); }
      else if (el.dataset.al != null) { el.setAttribute('aria-label', el.dataset.al); delete el.dataset.al; }
    });
  }
  function forgeAfter(h, P = S && S.panel) {
    try { if (X.repBind && P) X.repBind(P); } catch (e) { /* починка — не обязательна */ }
    igOff();
    if (!h || !h.ef || !IGW() || !P) return;
    forgeList(h, P);
    if (P.dataset.igb) return; P.dataset.igb = '1';   // обработчики — один раз на окно
    let pt = 'mouse';
    IGD = fgInv2(h) ? null : IGW().drag(P, {   // 25.10: новая сумка (inv2) — перетаскивание у библиотеки
      ok: (src, t) => t.dataset.igdrop === 'anvil' && !FX.busy,
      onStart: () => X.tipHide && X.tipHide(),
      onDrop: (src) => pickForge(src.dataset.ig, P),
      // нажатие без перетаскивания — на наковальню; пальцем — ещё и карточка вещи
      tap: (src) => {
        const hh = X.hero(), it = itemOf(hh, src.dataset.ig); if (!it) return;
        if (!src.classList.contains('cyf-anvit') && X.canEnch(it)) pickForge(it.uid, P);
        if (pt !== 'mouse' && X.cardTip) { const el = P.querySelector(`[data-ig="${String(it.uid).replace(/["\\]/g, '')}"]${src.classList.contains('cyf-anvit') ? '.cyf-anvit' : ''}`) || src; X.cardTip(el, it, hh); }
      },
    });
    P.addEventListener('pointerdown', (e) => { pt = e.pointerType || 'mouse'; if (X.tipHide && !e.target.closest('[data-ig]')) X.tipHide(); });
    // подсказка: мышь — при наведении, клавиатура — при фокусе
    const tipEl = (e) => e.target.closest && e.target.closest('[data-ig]');
    P.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse' || (IGD && IGD.active())) return; const el = tipEl(e); if (el && X.cardTip && X.tipFor() !== el) X.cardTip(el, itemOf(X.hero(), el.dataset.ig), X.hero()); });
    P.addEventListener('pointerout', (e) => { const f = X.tipFor && X.tipFor(); if (f && P.contains(f) && (!e.relatedTarget || !f.contains(e.relatedTarget))) X.tipHide(); });
    P.addEventListener('focusin', (e) => { const el = tipEl(e); if (el && el.matches(':focus-visible') && X.cardTip) X.cardTip(el, itemOf(X.hero(), el.dataset.ig), X.hero()); });
    P.addEventListener('focusout', () => { const f = X.tipFor && X.tipFor(); if (f && P.contains(f)) X.tipHide(); });
    P.addEventListener('scroll', () => { const f = X.tipFor && X.tipFor(); if (f && P.contains(f)) X.tipHide(); }, { passive: true, capture: true });
    P.addEventListener('click', (e) => {
      if (e.target.closest('[data-anvoff]')) { if (FX.busy) return; FX.uid = null; FX.keep = null; FX.last = null; X.forgeClose && X.forgeClose(); forgeList(X.hero(), P); FX.item(null); return; }
      if (e.target.closest('[data-anvgo]')) { const c = P.querySelector('.cyf-ctl'); if (c) c.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' }); }
    });
  }
  function pickForge(uid, P = S && S.panel) {
    const h = X.hero(), it = itemOf(h, uid); if (!it || FX.busy || !X.canEnch(it) || !P) return;
    FX.uid = uid; FX.keep = null; FX.anim = null; FX.last = null;
    forgeList(h, P);
    FX.item(it);
    const host = P.querySelector('.cyf-ctl'); if (host) X.forgeOpen(uid, host);   // способ, шанс, цена — окно Кузни app.js; заточка уйдёт с этим uid
    // 25.10: узкая панель (телефон) — вещь выбрали в кукле или сумке ниже; показать способ, шанс, цену и кнопку (они сразу под наковальней)
    try { if (host && window.LGSiteUi.is('narrow') && host.scrollIntoView) host.scrollIntoView({ behavior: 'auto', block: 'start' }); } catch (e) {}
  }
  // наковальня у горна: вещь, молот кузнеца (бьёт по вещи), искры, свечение, крупный итог — в координатах интерьера 1920×1080
  // 20.10: на улице — над наковальней Ярмарки: та же сцена (координаты интерьера, верх наковальни — 1620, 944), сдвинутая на настоящую
  // наковальню (960, 660 сцены «Заточка»); своя нарисованная наковальня не нужна
  const forgeStage = () => `<div class="cyf-out" style="transform:translate(${960 - 1620}px, ${660 - 944}px)">` + forgeStage0() + '</div>';
  const forgeStage0 = () => `<div class="cyf-stage cyf-r" aria-hidden="true"><div class="cyf-anvil">${anvilSvg()}</div><div class="cyf-item"><i class="cyf-glow"></i><div class="cyf-ia"></div><div class="cyf-ia2"></div><i class="cyf-crack"></i></div><div class="cyf-ham">${hammerSvg()}</div><div class="cyf-sparks"></div><div class="cyf-big"></div><div class="cyf-flash"></div></div>`;
  const anvilSvg = () => `<svg viewBox="-80 -60 160 80" width="180" height="90"><path d="M-70 -50 H50 Q78 -50 78 -38 Q60 -34 44 -30 V-22 H-44 V-30 Q-62 -34 -70 -50 Z" fill="#5a5768" stroke="#f5f2ff" stroke-width="4" stroke-linejoin="round"/><path d="M-30 -22 H30 L38 10 H-38 Z" fill="#4a4759" stroke="#f5f2ff" stroke-width="4" stroke-linejoin="round"/><path d="M-60 -46 H40" stroke="#8b8796" stroke-width="4"/></svg>`;
  // молот кузнеца: точка вращения — рука кузнеца (справа), боёк — слева (бьёт по вещи на наковальне)
  const hammerSvg = () => `<svg viewBox="-150 -30 160 60" width="160" height="60"><rect x="-112" y="-5" width="116" height="10" rx="4" fill="#8a5a2b" stroke="#f5f2ff" stroke-width="3"/><rect x="-142" y="-24" width="40" height="48" rx="6" fill="#a9b1b6" stroke="#f5f2ff" stroke-width="4"/><path d="M-134 -16 V16" stroke="#6e7a80" stroke-width="3"/></svg>`;
  // анимация Кузни: только transform/opacity, всё конечное (таймеры — по счёту ударов, без бесконечных циклов)
  const FX = {
    uid: null, busy: false, T: [], res: null, done: false, keep: null, anim: null, cur: null, n: 0,   // 23.10: keep — сломанная вещь (видна на наковальне), anim — итог на слоте
    q: (s) => S && S.room.querySelector(s),
    reset() { FX.T.forEach(clearTimeout); FX.T = []; FX.busy = false; FX.res = null; FX.uid = null; FX.keep = null; FX.anim = null; FX.cur = null; FX.last = null; },
    slot: () => S && S.panel && S.panel.querySelector('.cyf-anvslot'),
    later(fn, ms) { FX.T.push(setTimeout(fn, ms)); },
    item(it) {
      const ia = FX.q('.cyf-ia'), st = FX.q('.cyf-stage'); if (!ia || !st) return;
      if (!it) { ia.innerHTML = ''; const b = FX.q('.cyf-ia2'); if (b) b.innerHTML = ''; st.classList.remove('ok', 'bad', 'save', 'work', 'gone'); return; }   // 23.10: наковальню очистили
      ia.innerHTML = X.art(it); st.dataset.r = it.rarity || 'common';
      const ia2 = FX.q('.cyf-ia2'); if (ia2) ia2.innerHTML = ia.innerHTML;   // вторая половинка — для поломки
      st.style.setProperty('--glow', String(Math.min(1, 0.15 + (+it.en || 0) / 15 * 0.85)));
      st.classList.remove('ok', 'bad', 'save', 'work', 'gone');
      const big = FX.q('.cyf-big'); if (big) big.textContent = '';
    },
    // отправили заточку: n ударов (2–5 — чем выше уровень, тем дольше куёт), свечение растёт с каждым ударом
    start(it, tg) {
      const st = FX.q('.cyf-stage'); if (!st) return;
      FX.T.forEach(clearTimeout); FX.T = []; FX.busy = true; FX.res = null; FX.done = false;
      st.classList.remove('ok', 'bad', 'save', 'gone'); st.classList.add('work');
      const big = FX.q('.cyf-big'); if (big) big.textContent = '';
      const n = tg <= 3 ? 2 : tg <= 6 ? 3 : tg <= 10 ? 4 : 5, beat = reduce() ? 250 : 620;
      FX.cur = it ? { ...it } : null; FX.n = n; FX.anim = null; FX.last = null;
      const sl = FX.slot(); if (sl) { sl.classList.remove('ok', 'bad', 'save'); sl.style.setProperty('--n', n); sl.classList.add('work'); }   // 23.10: вещь на наковальне вздрагивает от ударов (n раз)
      if (S && S.panel) { const off = S.panel.querySelector('[data-anvoff]'); if (off) off.hidden = true; }
      const g0 = Math.min(1, 0.15 + (tg - 1) / 15 * 0.85);
      for (let i = 0; i < n; i++) FX.later(() => FX.strike(g0 + (i + 1) / n * 0.5), i * beat);
      FX.later(() => { FX.done = true; if (FX.res) FX.show(FX.res); else st.classList.add('wait'); }, n * beat + 120);
    },
    strike(g) {
      const st = FX.q('.cyf-stage'), sp = FX.q('.cyf-sparks'); if (!st || !sp) return;
      st.style.setProperty('--glow', String(Math.min(1.4, g)));
      const ham = FX.q('.cyf-ham'); if (ham) { ham.classList.remove('hit'); void ham.offsetWidth; ham.classList.add('hit'); }
      // на улице бьёт сам кузнец Ярмарки своим молотком (летающего молота нет)
      const sm = FX.q('[data-smith]'); if (sm && !reduce()) try { sm.beginElement(); } catch {}
      if (reduce()) return;
      // искры: 8 точек разлетаются (одна CSS-анимация на каждую), потом удаляются
      const big = st.classList.contains('cyf-r') ? 2.2 : 1;   // в интерьере Кузни — крупнее
      let s = ''; for (let i = 0; i < 8; i++) { const a = -160 + i * 20 + Math.random() * 14, d = (50 + Math.random() * 60) * big; s += `<i style="--dx:${(Math.cos(a * Math.PI / 180) * d).toFixed(0)}px;--dy:${(Math.sin(a * Math.PI / 180) * d).toFixed(0)}px;animation-delay:${(0.27 + Math.random() * 0.05).toFixed(2)}s"></i>`; }
      sp.innerHTML = s; FX.later(() => { if (sp.isConnected) sp.innerHTML = ''; }, 1000);
    },
    // итог из игры; удары ещё идут — покажем после них
    result(x) { FX.res = x; if (FX.done || !FX.busy) FX.show(x); },
    show(x) {
      const st = FX.q('.cyf-stage'), big = FX.q('.cyf-big'); FX.busy = false;
      if (!st || !big) return;
      st.classList.remove('work', 'wait');
      // 23.10: итог и на слоте наковальни (одна анимация; сломанная вещь остаётся видна, пока не положат другую)
      const c = x.out === 'up' ? 'ok' : x.out === 'broken' ? 'bad' : 'save';
      FX.anim = { c, t: Date.now() + 1500 }; if (x.out === 'broken') FX.keep = FX.cur;
      FX.last = { c, t: x.out === 'up' ? `Удалось: +${x.to}` : x.out === 'broken' ? 'Не выдержала заточки' : x.out === 'down' ? 'Не вышло — сфера сберегла, −1' : 'Не вышло — вещь цела' };   // итог — и у наковальни (на телефоне окно способа ниже)
      const sl = FX.slot(); if (sl) { sl.classList.remove('work', 'ok', 'bad', 'save'); void sl.offsetWidth; sl.classList.add(c); }
      if (S && S.panel) forgeList(X.hero());
      if (x.out === 'up') { st.classList.add('ok'); big.textContent = '+' + x.to; st.style.setProperty('--glow', String(Math.min(1.4, 0.4 + x.to / 15))); }
      else if (x.out === 'broken') { st.classList.add('bad'); big.textContent = 'Сломалось'; FX.later(() => st.classList.add('gone'), reduce() ? 0 : 900); }
      else if (x.out === 'down') { st.classList.add('save'); big.textContent = '−1'; }
      else { st.classList.add('save'); big.textContent = 'Цела'; }
    },
  };

  /* ===================== свой герой ===================== */
  function mineView(h) {
    const cur = h.wardrobe && h.wardrobe.cur && Object.keys(h.wardrobe.cur).length ? h.wardrobe.cur : h.look;
    return { n: h.name || X.login(), lv: h.level, lk: cur || null, g: h.gear || {}, gh: h.ghost ? 1 : 0, aw: h.aw };
  }
  function spawnMe() {
    const h = X.hero(); if (!h) return;
    let p = null; try { p = JSON.parse(sessionStorage.getItem(posKey()) || 'null'); } catch {}
    const d0 = inTown() ? TOWN.L.spawn : [M.QW + 660, 1010];   // 23.10: в городе округа — у ворот
    const [x, y] = S.map.nearest(p ? p[0] : d0[0], p ? p[1] : d0[1]);
    const v = mineView(h);
    S.me = addWalker(X.login(), v, x, y, true); S.me.vKey = JSON.stringify(v);
    centerOn(x, y);
  }
  const posKey = () => 'lgCityPos' + (S && S.town && S.town !== 'fair' ? ':' + S.town : '');   // 23.10: у каждого города — своё место
  const savePos = () => { try { if (S && S.me) sessionStorage.setItem(posKey(), JSON.stringify([Math.round(S.me.path ? S.me.path[S.me.path.length - 1][0] : S.me.x), Math.round(S.me.path ? S.me.path[S.me.path.length - 1][1] : S.me.y)])); } catch {} };

  // 24.10: шахта: город округа — его шахта (id округа), Ярмарка — домашняя шахта канала (home); локация — mine.js (app.js X.openMine)
  function mineOpen() {
    if (!S) return;
    const say = (m) => { hud(m); if (X.toast) X.toast(m); clearTimeout(S.bmT); S.bmT = setTimeout(() => S && hud(), 4000); };
    if (!mnOn() || !X.openMine) { say('Шахта пока закрыта - откроется скоро'); return; }
    const c = inTown() ? TOWN.id : 'home', mn = X.hero().mn || {};
    // 29.10: шахты городов закрыты настройкой (mn.home.tc) - копать можно только в домашней шахте (Ярмарка)
    if (!mn[c]) { say(mn.home && mn.home.tc ? 'Шахты городов пока закрыты - копать можно в домашней шахте, в Ярмарке' : 'Шахта этого города откроется, когда округ станет нашим'); return; }
    X.openMine(c);
  }
  /* ===================== 23.10 (стройка): улучшение здания мэром — 6/12/24/36/48 ч ===================== */
  // Описание города (элемент GET /api/city/towns) — поле building: { id: { to, until } }. Пока идёт — здание в лесах (townart.js scaffold),
  // над ним ярлык-таймер (обновляется раз в секунду, только пока город открыт), вход закрыт. Кончилась — город перерисовывается уже с уровнем to.
  // Сам запуск стройки (мэр, ресурсы) — не сделан.
  const buildSay = (B) => (inTown() && B && B.build && window.LGTownGen ? window.LGTownGen.buildMsg(B, Date.now()) : '');
  /** Описание города на сейчас: кончившиеся стройки — уже уровень to, их нет в building. */
  function townMeta(t) {
    const b = (t && t.building) || {}, now = Date.now(), lv = { ...((t && t.levels) || {}) }, left = {};
    for (const [k, v] of Object.entries(b)) { if (v && +v.until > now) left[k] = v; else if (v) lv[k] = Math.max(+lv[k] || 0, +v.to || 0) || undefined; }
    return { ...t, levels: lv, building: left };
  }
  let BT = 0;
  function buildStart() {
    clearInterval(BT); BT = 0;
    if (!S || !inTown() || !WD.BUILDINGS.some((b) => b.build)) return;
    buildTick(); BT = setInterval(buildTick, 1000);
  }
  function buildTick() {
    if (!S || !inTown()) { clearInterval(BT); BT = 0; return; }
    if (document.hidden || !S.root.classList.contains('on')) return;   // город не виден — не трогаем DOM
    const box = S.el.querySelector('.cy-tags'); if (!box) return;
    let done = false;
    for (const B of WD.BUILDINGS) if (B.build) {
      const ms = window.LGTownGen.buildLeft(B, Date.now());
      let el = box.querySelector(`.cy-bt[data-bt="${B.id}"]`);
      if (!ms) { if (el) { el.remove(); done = true; } continue; }
      if (!el) {
        el = document.createElement('div'); el.className = 'cy-bt'; el.dataset.bt = B.id; el.setAttribute('role', 'timer');
        el.style.left = Math.round((B.hit[0] + B.hit[1]) / 2) + 'px'; el.style.top = Math.max(TOP + 60, B.hit[2] + 4) + 'px';
        box.appendChild(el);
      }
      const t = `🏗 ${window.LGTownGen.buildClock(ms)}`;
      if (el.textContent !== t) { el.textContent = t; el.title = buildSay(B); }
    }
    if (done) townRefresh();
  }
  // стройка кончилась — тот же город заново (новый уровень, без лесов); герой остаётся где был
  function townRefresh() {
    if (!S || !inTown() || !TOWN.meta) return;
    const root = S.root;
    clearInterval(BT); BT = 0;
    savePos(); closePanel(); leave(); timers(false);
    if (S.raf) cancelAnimationFrame(S.raf); if (S.gl) try { S.gl.destroy(); } catch {}
    S = null;
    TOWN = { ...TOWN, L: window.LGTownGen.generate(townMeta(TOWN.meta)) };
    if (root.isConnected && root.classList.contains('on')) open(root, X);
  }

  /* ===================== 23.10: города округов — выбор и загрузка ===================== */
  // Кнопка слева сверху (под «Скрыть других»): Ярмарка — всегда, города — какие открыты зрителю (сервер: GET /api/city/towns, одно правило —
  // quest/towns.js townAccess). Файлы генератора и рисунка (towngen.js, townart.js) грузятся только при входе в город округа.
  const BIO_ICO = { meadow: '🌾', forest: '🌳', taiga: '🌲', ice: '❄️', mount: '⛰️', swamp: '🪷', ash: '🌋', desert: '🏜️', coast: '🌊', blight: '☠️', ruin: '🏚️' };
  const BIO_RU = { meadow: 'луга', forest: 'лес', taiga: 'тайга', ice: 'льды', mount: 'горы', swamp: 'болота', ash: 'пепел', desert: 'пустыня', coast: 'побережье', blight: 'порча', ruin: 'руины' };
  const sizeRu = (t) => (t.kind === 'capital' ? 'столица' : t.danger >= 2 ? 'посёлок' : 'деревня');
  const WHY_RU = { owned: 'округ канала', party: 'отряд в округе', tester: 'тестерам' };
  let townInit = false;
  const townJs = (src) => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  async function townsLoad() { const r = await X.api('/api/city/towns'); if (r && r.ok) TLIST = r; return TLIST; }
  async function townPrep(root) {
    const want = TOWN.id;
    root.innerHTML = '<p class="empty">Город строится на глазах…</p>';
    if (want === CAMP) {   // 26.10 (art/camp): лагерь - свои файлы (раскладка и рисунок), без списка городов с сервера
      try {
        if (!cpOn()) throw new Error('закрыт');
        const V = window.LG_CITYV || {};
        if (!window.LGCampMap) await townJs(`/site/campmap.js?v=${V.cm || ''}`);
        if (!window.LGCampArt) await townJs(`/site/campart.js?v=${V.ca || ''}`);
        if (TOWN.id !== want) return;
        TOWN = { id: CAMP, meta: null, acc: { own: true, k: 1, why: 'camp' }, L: { ...window.LGCampMap.get(), ...campName() } };
      } catch (e) {
        console.warn('[город] лагерь', e);
        TOWN = { id: 'fair', L: null, acc: null, meta: null }; townSet('fair');
        if (X.toast) X.toast('Лагерь сейчас закрыт - ты на Ярмарке', true);
      }
      if (root.isConnected && root.classList.contains('on')) open(root, X);
      return;
    }
    try {
      const T = await townsLoad(), t = T && (T.list || []).find((x) => x.id === want);
      if (!t) throw new Error('закрыт');
      const V = window.LG_CITYV || {};
      if (!window.LGTownGen) await townJs(`/site/towngen.js?v=${V.tg || ''}`);
      if (!window.LGTownArt) await townJs(`/site/townart.js?v=${V.ta || ''}`);
      await window.LGTownGen.prep(want, (f) => townJs(`${f}?v=${V.vg || ''}`));   // 28.10 (art/district-towns): ручная деревня - её файл (нет - генератор)
      if (TOWN.id !== want) return;
      TOWN = { id: want, meta: t, acc: { own: !!t.own, k: +t.k || 2, why: t.why || '', ...(t.home ? { home: 1 } : {}) }, L: window.LGTownGen.generate(townMeta(t)) };   // 26.10: home - край канала
    } catch (e) {
      console.warn('[город] город округа', want, e);
      TOWN = { id: 'fair', L: null, acc: null, meta: null }; townSet('fair');
      if (fairGone()) { root.innerHTML = '<div class="panel cy-err"><p class="lead">Город края не загрузился — обнови страницу.</p></div>'; return; }   // 26.10: Перепутье позади - Ярмарки нет
      if (X.toast) X.toast('Этот город сейчас закрыт — ты на Ярмарке', true);
    }
    if (root.isConnected && root.classList.contains('on')) open(root, X);
  }
  // перейти в другой город (или на Ярмарку): уйти из прежнего (присутствие — другой ключ), собрать новый
  function townGo(id, msg) {
    id = id || 'fair';
    if ((id === 'fair' || id === CAMP) && fairGone()) id = String(homeOf().id);   // 26.10 (district-draw): Перепутье и Ярмарка позади - вместо них город края
    if (!S) { TOWN = { id, L: null, acc: null, meta: null }; townSet(id); return; }
    if (id === TOWN.id && S.town === id) { townPick(false); return; }
    const root = S.root;
    savePos(); closePanel(); leave(); timers(false);
    if (S.raf) cancelAnimationFrame(S.raf); if (S.gl) try { S.gl.destroy(); } catch {}
    S = null;
    TOWN = { id, L: null, acc: null, meta: null }; townSet(id);
    if (msg && X.toast) X.toast(msg);
    if (root.isConnected && root.classList.contains('on')) open(root, X);
  }
  function townBtn() {
    const b = S.el.querySelector('.cy-town'), h = X.hero(); if (!b) return;
    b.hidden = !((h && (h.tw || h.cp)) || inTown()) || !!(X.inQuest && X.inQuest());   // 25.10: в походе город не сменить (только город, где стоит отряд)
    b.querySelector('b').textContent = inTown() ? TOWN.L.name : 'Ярмарка';
    b.title = isCamp() ? `${TOWN.L.name} - ${TOWN.L.sub}` : inTown() ? `${TOWN.L.name} — ${sizeRu(TOWN.meta)}, ${BIO_RU[TOWN.L.biome] || ''}${TOWN.acc && !TOWN.acc.own && foreignK() > 1 ? (homeHere() ? ' · край: цены ×' : ' · чужой округ: цены ×') + String(foreignK()).replace('.', ',') : ''}` : 'Выбрать город';
    b.onclick = () => townPick(b.getAttribute('aria-expanded') !== 'true');
  }
  async function townPick(on) {
    const b = S && S.el.querySelector('.cy-town'), box = S && S.el.querySelector('.cy-tp'); if (!b || !box) return;
    b.setAttribute('aria-expanded', String(!!on)); box.hidden = !on;
    if (!on) return;
    box.innerHTML = '<p class="note">Смотрю, какие города открыты…</p>';
    const T = await townsLoad(); if (!S || box.hidden) return;
    const list = (T && T.list) || [], fairOk = !(T && T.gone) && (!(T && T.quest) || !!T.fair);   // 25.10: в походе Ярмарка - только если отряд в её округе; 26.10: gone - Перепутье позади
    const campRow = cpOn() ? (() => { const c = campName(); return `<button type="button" data-town="${CAMP}"${TOWN.id === CAMP ? ' aria-current="true"' : ''}><span class="cy-tpi" aria-hidden="true">⛺</span><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></button>`; })() : '';   // 26.10 (art/camp)
    const row = (t) => `<button type="button" data-town="${esc(t.id)}"${t.id === TOWN.id ? ' aria-current="true"' : ''}><span class="cy-tpi" aria-hidden="true">${BIO_ICO[t.biome] || '🏘'}</span><b>${esc(t.town)}</b><small>${'★'.repeat(t.danger)} ${sizeRu(t)} · ${esc(BIO_RU[t.biome] || '')}${t.own || (t.home && +t.k <= 1) ? '' : ` · цены ×${String(+t.k || 2).replace('.', ',')}`}${t.home ? ' · край отряда' : ''}${WHY_RU[t.why] ? ' · ' + WHY_RU[t.why] : ''}</small></button>`;
    box.innerHTML = `<div class="cy-tph"><b>Города</b><button type="button" class="cy-tpx" aria-label="Закрыть">×</button></div><div class="cy-tpl">${fairOk ? `<button type="button" data-town="fair"${TOWN.id === 'fair' ? ' aria-current="true"' : ''}><span class="cy-tpi" aria-hidden="true">🎪</span><b>Ярмарка</b><small>${T && T.quest ? 'отряд здесь' : 'всегда открыта'}</small></button>` : ''}${T && T.quest ? '' : campRow}${list.map(row).join('')}</div>`
      + `<p class="note">${list.length ? '' : 'Других городов пока нет. '}Город округа открывается, когда канал захватит округ; на стриме — пока отряд стоит в округе (участникам отряда).</p>`;
    box.querySelector('.cy-tpx').onclick = () => townPick(false);
    box.querySelectorAll('[data-town]').forEach((x) => { x.onclick = () => { townPick(false); townGo(x.dataset.town); }; });
  }

  /* ===================== вкладка ===================== */
  function open(root, ctx) {
    X = ctx;
    const h = X.hero();
    // 23.10: город округа — сначала его файлы и раскладка (один раз на город; Ярмарка — как раньше)
    if (!townInit) {
      townInit = true;
      let t = townGet();
      try { const q = new URLSearchParams(location.search).get('town'); if (q === CAMP) { t = CAMP; townSet(CAMP); } } catch {}   // 26.10 (art/camp): явный ?town=camp
      const hp0 = homePick(h && h.hm); if (hp0 && hp0.id === CAMP && t === 'fair') t = CAMP;   // 26.10 (district-draw): канал в Прологе - «Город» открывается в лагере
      if (t !== 'fair' && h && (t === CAMP ? cpOn() : h.tw) && TOWN.id === 'fair') TOWN = { id: t, L: null, acc: null, meta: null };
    }
    { const hp = homePick(h && h.hm); if (hp && hp.id !== CAMP && (TOWN.id === 'fair' || TOWN.id === CAMP)) { TOWN = { id: hp.id, L: null, acc: null, meta: null }; townSet(hp.id); } }   // 26.10 (district-draw): город края - сразу (Перепутье и Ярмарка позади)
    if (TOWN.id !== 'fair' && !TOWN.L) { townPrep(root); return; }
    if (!S || !S.root.isConnected || S.root !== root || S.st !== X.style() || S.town !== TOWN.id) {
      // Pixi грузим только здесь — при первом открытии «Города» (остальные страницы сайта его не качают)
      if (useGL() && !(window.PIXI && window.PIXI.autoDetectRenderer)) {
        if (!glWait) {
          glWait = true;
          root.innerHTML = '<p class="empty">Город строится на глазах…</p>';
          window.LGCityGL.load(window.LG_CITYV).catch((e) => { GLFAIL = 'Pixi не загрузился'; console.warn('[город]', e); })
            .then(() => { glWait = false; if (root.isConnected && root.classList.contains('on')) open(root, X); });
        }
        return;
      }
      if (S) { leave(); timers(false); if (S.raf) cancelAnimationFrame(S.raf); if (S.gl) try { S.gl.destroy(); } catch {} }
      S = build(root, useGL()); if (!S) return;
      { const cs = S.el.querySelector('.cy-cap'); if (cs) { cs.value = String(S.capV || 0); cs.onchange = () => { if (!S) return; S.capV = +cs.value || 0; capSet(S.capV); lodPick(performance.now()); if (S.gl) S.gl.dirty(); hud(); kick(); }; } }   // 24.10: «Показывать: всех / 50 / 25 / 10 / 5»
      bindInput(); olWarm(); othBtn(); fsBtn(); townBtn();
      if (S.q.lv) setQuality(S.q.lv);   // 22.10: качество задано вручную (lgCityQ)
      new ResizeObserver(() => layout()).observe(S.root);
      window.addEventListener('resize', () => layout());
    }
    document.documentElement.classList.add('cy-full');   // 21.10: город — во всё окно браузера
    layout();
    chatInit();   // 21.10: чат «Города»
    if (!S.me && h) spawnMe();
    if (!h) { hud('Героя пока нет — он появится, когда ты напишешь в чат на стриме'); return; }
    hud(); enter();
    hwApply();   // 28.10 (hw-city)
    buildStart();   // 23.10 (стройка): таймеры над зданиями в лесах
    setTimeout(() => { if (S) S.el.classList.add('went'); }, 6000);   // подсказка — только первые секунды
  }
  // 21.10: кнопка «На весь экран»; Esc / жест браузера — выход, кнопка и раскладка подстраиваются по fullscreenchange
  function fsBtn() {
    const b = S.el.querySelector('.cy-fs'); if (!b) return;
    b.onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else S.el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch {} };
  }
  document.addEventListener('fullscreenchange', () => {
    if (!S) return;
    const on = document.fullscreenElement === S.el, b = S.el.querySelector('.cy-fs');
    if (b) { b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Выйти из полноэкранного режима' : 'На весь экран'); b.title = b.getAttribute('aria-label'); }
    S.el.classList.toggle('cy-fsm', on);
    layout();
  });
  function close() { clearInterval(BT); BT = 0; newsClose(); document.documentElement.classList.remove('cy-full'); try { if (S && document.fullscreenElement === S.el) document.exitFullscreen(); } catch {} if (!S) return; savePos(); leave(); timers(false); closePanel(); if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; }
  /* 26.10 (iPhone 13: вкладка падала при входе в шахту - WebKit убивал её по памяти): пока открыта шахта (она во весь экран поверх
     «Города»), «Город» не держит свою сцену - холст Pixi (WebGL), плитки фона (до 28 Мп ≈ 110 МБ), человечков, слои и DOM улицы, и
     не рисует кадры под шахтой. sleep - как смена города (townGo): ушёл из «Города» (место героя запомнено), всё отпущено; wake
     («В город» из шахты) - «Город» собирается заново. «Город» во весь экран (шахта внутри его элемента) - не трогаем */
  let SLEPT = null;
  function sleep() {
    if (!S || !S.root) return;
    const root = S.root;
    if (document.fullscreenElement && root.contains(document.fullscreenElement)) return;
    clearInterval(BT); BT = 0;
    try { savePos(); closePanel(); newsClose(); leave(); timers(false); } catch (e) { console.warn('[город] sleep', e); }
    if (S.raf) cancelAnimationFrame(S.raf); if (S.gl) try { S.gl.destroy(); } catch {}
    S = null; SLEPT = root; root.innerHTML = '';
  }
  function wake() {
    const root = SLEPT; SLEPT = null;
    if (root && X && !S && root.isConnected && root.classList.contains('on')) open(root, X);
  }
  document.addEventListener('visibilitychange', () => {
    if (!S || !S.root.isConnected || !S.root.classList.contains('on')) return;
    if (document.hidden) { savePos(); leave(); timers(false); } else enter();
  });
  window.addEventListener('pagehide', () => { if (S && S.inCity) { savePos(); leave(); } });
  window.LGCity = {
    board: { render: (box, list) => newsBoard(box, list), read: (i) => newsRead(i) },   // 22.10: доска объявлений (и для проверки без Города)
    open, close, sleep, wake,
    onEvent: (d) => { if (S && S.inCity) apply(d); },
    heroChanged,
    forgeStart: (it, tg) => { if (S && S.panelId === 'anvil') FX.start(it, tg); },
    forgeFx: (x) => { if (S && S.panelId === 'anvil') FX.result(x); },
    // 25.10: итог потерялся или заказ отменён - кузнец перестаёт бить, вещь снова на наковальне
    forgeCancel: () => { try { if (!S || S.panelId !== 'anvil') return; const st = FX.q('.cyf-stage'), sl = FX.slot(), it = FX.cur; FX.reset(); if (st) st.classList.remove('work', 'wait'); if (sl) sl.classList.remove('work'); if (it) FX.item(it); } catch (e) {} },
    storeRes: (x) => storeRes(x),   // 23.10: итог «Положить всё» / «Взять всё»
    // 23.10: окно наковальни отдельно от сцены — для проверок (test/enchant-ui.test.ts): разметка, подключение к панели, выбор вещи
    anvil: { body: (h) => forgeBody(h), mount: (P, ctx) => { X = X || ctx; forgeAfter(X.hero(), P); }, pick: (uid, P) => pickForge(uid, P), uid: () => FX.uid, off: () => igOff() },
    // для проверок и снимков: где мой герой, кто виден
    npcs: () => (S && S.gl && S.gl.npcs ? S.gl.npcs() : []),
    room: (id) => openPanel(id),   // 28.10 (hw-npc-ghosts): открыть помещение - для снимков   // 28.10 (hw-npc-ghosts): НПС Ярмарки на улице (рамки)
    debug: () => S && { me: S.me && [S.me.x, S.me.y], others: [...S.others.keys()], hidden: S.hidden, ghosts: S.ghosts.size, n: S.n, camX: S.camX, camY: S.camY, z: S.z, inCity: S.inCity, render: S.gl ? (S.gl.mode || 'pixi…') : 'svg', fail: GLFAIL, lod: { lv: S.q.lv, r: S.q.r && +S.q.r.toFixed(2), lock: S.q.lock, res: S.gl && S.gl.res ? S.gl.res() : null, cull: [...S.others.values()].filter((w) => w.cull).length, nolab: [...S.others.values()].filter((w) => w.nolab).length }, gl: S.gl && S.gl.stats(), ol: S.ol && S.ol.stats(), npc: WD.BUILDINGS.filter((b) => b.hw).map((b) => b.id) },   // HW-NPC: npc - хэллоуинские НПС на улице
    // 23.10: для замера плавности — где сейчас другие (после кадра): ник, x, y, идёт, убран качеством, нарисован, прозрачность; nf — номер кадра Pixi
    peek: () => S && { nf: S.gl ? (S.gl.nf || 0) : -1, z: S.z, w: [...S.others.values()].map((w) => [w.l, w.x, w.y, w.path ? 1 : 0, w.cull ? 1 : 0, w.gl ? (w.gl.root.visible ? 1 : 0) : (w.shown ? 1 : 0), w.gl ? w.gl.root.alpha : 1]) },
    // 29.10 (city-wasd): для проверок - можно ли стоять в точке (карта города), какое здание откроет E, открыто ли здание
    kw: () => S && { free: S.me ? S.map.free(S.me.x, S.me.y) : null, near: (kwNear() || {}).id || null, panel: S.panelId, on: !!(S.kw && S.kw.on), hint: S.ehK || null },
    hideOthers: (on) => S && setHidden(!!on),
    // 23.10: для проверок и снимков — где на экране значок звания у ника (Pixi: ник — картинка; SVG — элемент .awb)
    awb: (l, i = 0) => { if (!S) return null; const w = l === X.login() ? S.me : S.others.get(l); if (!w) return null;
      if (!S.gl) { const e = w.nm && w.nm.querySelectorAll('.awb')[i]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      const h = S.gl.badgeOf && S.gl.badgeOf(w, i); if (!h) return null; const r = S.view.getBoundingClientRect(); return { x: r.left + (h.x - S.camX) * S.z, y: r.top + (h.y - S.camY) * S.z }; },
    tradeMenu: (l, cx, cy) => { const w = S && S.others.get(l); if (w && window.LGTrade) { window.LGTrade.mount(X, S.el); window.LGTrade.menu(l, w.v, cx, cy); } },   // 23.10: для проверок и снимков
    quality: (lv) => { if (!S) return; S.q.fixed = lv != null; if (lv != null) setQuality(+lv); },
    // 23.10: города округов — перейти (fair — Ярмарка); с вкладки «Поход» — «Войти в город N» (до открытия вкладки — запомнить)
    town: (id) => { townInit = true; townGo(String(id || 'fair')); },
    questChanged: () => { try { if (S && S.el) { townBtn(); townPick(false); } } catch (e) {} },   // 25.10: поход начался/кончился - кнопка выбора города towns: () => TLIST, where: () => ({ id: TOWN.id, own: TOWN.acc ? !!TOWN.acc.own : true, k: foreignK() }),
    go: (x, y) => S && goPoint(x, y), goBuilding: (id) => S && goBuilding(id), center: (x, y) => { if (S) { S.freeUntil = Date.now() + 8000; centerOn(x, y); } }, panel: (id) => S && openPanel(id),
  };
})();
