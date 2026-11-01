








(function () {
  'use strict';
  const M = window.LGCityMap, ART = window.LGCityArt;
  if (!M || !ART) return;

  const CITY_B = ['forge', 'tent', 'shop', 'magic', 'hall', 'board', 'trainer'];
  if (!window.LGCityShop || !CITY_B.every((id) => typeof (window.LGCityBuildings || {})[id] === 'function')) { console.warn('[город] нет файлов окон зданий (модуль «Город»)'); return; }
  const TOP = 170;
    const IDS = { anvil: 1, forge: 1, tent: 1, shop: 1, trainer: 1, board: 1, hall: 1, auction: 1, gate: 1, storage: 1, magic: 1, mine: 1, mineboard: 1 };
  IDS.hwshop = 1; IDS.hwpass = 1;
  let X = null;



  let TOWN = { id: 'fair', L: null, acc: null, meta: null };
  let WD = M;
  let TLIST = null;
  const townGet = () => { try { return sessionStorage.getItem('lgCityTown') || 'fair'; } catch { return 'fair'; } };
  const townSet = (id) => { try { if (id && id !== 'fair') sessionStorage.setItem('lgCityTown', id); else sessionStorage.removeItem('lgCityTown'); } catch {} };
  const inTown = () => !!(TOWN.L);
  


  const CAMP = 'camp';
  const isCamp = () => TOWN.id === CAMP && !!TOWN.L;


  const cpOn = () => !!(X && X.hero() && (X.hero().cp || (X.hero().hm && X.hero().hm.camp))) && !fairGone();
  const campName = () => { try { const n = (D().names || {})[X.style()] || {}, c = n.places && n.places.camp; return { name: (c && c.name) || 'Перепутье', sub: (c && c.sub) || 'лагерь новобранцев Легиона' }; } catch { return { name: 'Перепутье', sub: 'лагерь новобранцев Легиона' }; } };
  const foreignK = () => (inTown() && TOWN.acc && (!TOWN.acc.own || TOWN.acc.home) ? Math.max(1, +TOWN.acc.k || (TOWN.acc.home ? 1 : 2)) : 1);



  const homeOf = () => (X && X.hero() && X.hero().hm) || null;
  function homePick(hm) { if (!hm || !hm.id) return null; return { id: String(hm.id) }; }
  const homeHere = () => inTown() && !!(TOWN.acc && TOWN.acc.home);

  const fairGone = () => { const hm = homeOf(); return !!(hm && hm.id && hm.id !== 'fair' && hm.id !== CAMP); };
  let S = null;

  const RM = window.LGSiteUi.media('reduced');
  const reduce = () => !!(RM && RM.matches);
  const esc = window.LGSiteUi.esc;
  const D = () => window.MDDoodle;

  const npcAs = (md, fn) => { const d = D(); if (!d || !md) return fn(); const was = d.npcGh; d.npcGh = md; try { return fn(); } finally { d.npcGh = was; } };
  const npcBoth = (L, fn) => npcAs(L && L.hw ? 'both' : '', fn);

  const hwDead = () => { try { if (isCamp()) return false; const c = hwNow(); return !!(c && c.look); } catch { return false; } };
  const ghostSvg = (svg) => String(svg).replace(/(<svg class="jl-doodle jd-ghost"[^>]*?) style="[^"]*"/, '$1');
  const scopeIds = (svg, p) => svg.replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`).replace(/href="#([^"]+)"/g, `href="#${p}$1"`);

  const auOpen = () => !!(X && X.hero() && X.hero().au);

  const stOpen = () => !!(X && X.hero() && X.hero().sg);
  const soonB = (b) => !!b.soon && !((b.id === 'auction' && auOpen()) || (b.id === 'storage' && stOpen()) || (b.id === 'mine' && mnOn()));


  const msOn = () => !!(X && X.hero() && X.hero().ms);
  const csOn = () => !!(X && X.hero() && X.hero().cs);
  const mnOn = () => !!(X && X.hero() && X.hero().mn && Object.keys(X.hero().mn).length);
  const bOk = (b) => (!b.magic || msOn()) && (!b.mine || mnOn());




  let hnJs = null;
  const hnLv = () => { const h = X && X.hero(); return h && h.hw ? Math.max(0, Math.min(20, +h.hw.p || 0)) : 0; };


  const hnSeen = () => {
    try { return sessionStorage.getItem('lgHwNpcIn') === '1'; } catch (e) {

      return !!(S && S.hnPlayed);
    }
  };
  const hnMark = () => {
    if (S) S.hnPlayed = true;
    try { sessionStorage.setItem('lgHwNpcIn', '1'); } catch (e) {

    }
  };
  const hnView = () => ({ x0: S.camX, y0: S.camY, x1: S.camX + viewW(), y1: S.camY + viewH() });
  function hnEntStop() { if (S && S.hnEnt) { const e = S.hnEnt; S.hnEnt = null; e.stop(); } }

  function hnNear() {
    const N = window.LGHwNpc, L = window.LGCityHW; if (!N || !N.inView || !L) return false;
    const v = hnView(); return L.npcSpots({ fair: true }).some((sp) => N.inView(sp, v, 140));
  }
  function hwNpc(on, wave) {
    if (!S || !S.gl || !S.mk) return;
    S.hnOn = on = !!on && !inTown() && !!window.LGCityHW;
    const N = window.LGHwNpc, k = on ? 'n' + hnLv() : '';
    if (k === (S.hnK || '')) return;
    if (on && !N) {
      if (!hnJs) hnJs = townJs(`/site/hwnpc.js?v=${(window.LG_CITYV || {}).hn || ''}`).catch((e) => { hnJs = null; console.warn('[город] hwnpc.js', e); });
      hnJs.then(() => { if (S && window.LGHwNpc) hwNpc(S.hnOn, wave); }); return;
    }

    const was = S.hnK || '';
    S.hnK = k; S.hnArm = false;
    hnEntStop();
    let ent = false;
    if (on && !was && N.enter && (wave || !hnSeen())) { if (hnNear()) ent = true; else S.hnArm = true; }
    S.gl.dropProps('hwn'); for (const e of S.el.querySelectorAll('.hwn-live, [data-hwn]')) e.remove();
    let G = [];
    if (on) try { G = window.LGCityHW.npcSpots({ fair: true }).map((sp) => N.geo(sp, { lv: hnLv() })).filter(Boolean); } catch (e) { console.warn('[город] хэллоуинские НПС', e); G = []; }
    const B = G.map((g) => g.building), props = G.map((g) => ({ x: g.prop.x, y: g.prop.y, w: g.prop.w, h: g.prop.h, z: g.prop.z, dx: 0, svg: scopeIds(g.prop.svg(), 'cyh' + g.building.id + '-') }));
    WD = B.length ? { ...M, BUILDINGS: [...M.BUILDINGS, ...B] } : M;
    S.map = S.mk(B.length ? { hwObst: G.flatMap((g) => g.obst), hwB: B } : {});
    if (S.ol && S.ol.set) S.ol.set('hwn', props.map((p) => ({ svg: p.svg, dx: 0 })));

    const tags = S.el.querySelector('.cy-tags'), bar = S.el.querySelector('.cy-bar');
    for (const b of B) {
      if (tags) tags.insertAdjacentHTML('beforeend', `<button type="button" class="cy-tag" data-b="${b.id}" data-hwn="1" style="left:${b.tag ? b.tag[0] : (b.hit[0] + b.hit[1]) / 2}px;top:${tagY(b)}px"><span aria-hidden="true">${b.icon}</span>${esc(titleOf(b))}</button>`);
      if (bar) bar.insertAdjacentHTML('beforeend', `<button type="button" data-b="${b.id}" data-hwn="1"><span aria-hidden="true">${b.icon}</span>${esc(titleOf(b))}</button>`);
    }
    if (G.length && !document.getElementById('hwnLiveCss')) { const st = document.createElement('style'); st.id = 'hwnLiveCss'; st.textContent = N.LIVE_CSS; document.head.appendChild(st); }

    const host = S.walk || S.cam;
    const show = () => {
      if (!S || S.hnK !== k) return;
      if (props.length) S.gl.addProps(props, 'hwn');
      if (host) G.forEach((g, gi) => g.live.forEach((l, i) => {
        const d = document.createElement('div'); d.className = 'hwn-live ' + l.cls; d.setAttribute('aria-hidden', 'true');
        d.style.cssText = `left:${l.x}px;top:${l.y}px;width:${l.w}px;height:${l.h}px;z-index:${l.z}`;
        d.innerHTML = scopeIds(l.svg, `cyhl${gi}${i}-`); host.appendChild(d);
      }));
      kick();
    };
    if (ent && host && G.length) {
      hnMark();
      const h = N.enter(window.LGCityHW.npcSpots({ fair: true }), { host, view: hnView(), map: S.map, lv: hnLv(), reduce: reduce(), done: () => { if (S && S.hnEnt === h) { S.hnEnt = null; show(); } } });
      if (h) {
        S.hnEnt = h;

        for (const t of S.el.querySelectorAll('[data-hwn]')) t.animate([{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }], { duration: Math.round(h.dur * 1000) + 500, fill: 'both', easing: 'linear' });
      } else show();
    } else show();

    for (const w of [...S.others.values(), ...(S.me ? [S.me] : [])]) if (!S.map.free(w.x, w.y)) { const [nx, ny] = S.map.nearest(w.x, w.y); w.x = nx; w.y = ny; w.path = null; place(w); }
    kick();
  }

  async function hwOpen(id) {
    const N = window.LGHwNpc; if (!N || !N.open) return;
    const st = await loadStock().catch(() => null);

    N.open(id, { hero: () => X.hero(), data: (st && st.hw) || null, D: window.MDDoodle, art: X.art ? (it) => X.art(it) : null,
      tip: X.cardTip ? (el, it) => X.cardTip(el, it, X.hero()) : null, tipHide: X.tipHide ? () => X.tipHide() : null, login: () => (X.login ? X.login() : ''), toast: (t) => X.toast && X.toast(t), swap: async (b) => { const r = await X.api('/api/hwSwap', b); if (!r || !r.ok) { if (X.toast) X.toast((r && r.error) || 'Обмен не вышел', true); throw new Error('swap'); } if (X.toast) X.toast('Обмен принят: монеты придут через пару секунд'); },

      back: async (b) => { const r = await X.api('/api/hwBack', b); if (!r || !r.ok) { if (X.toast) X.toast((r && r.error) || 'Обмен не вышел', true); throw new Error('back'); } if (X.toast) X.toast('Обмен принят: конфеты придут через пару секунд'); },
      buy: async (b) => { const r = await X.api('/api/hwBuy', b); if (!r || !r.ok) { if (X.toast) X.toast((r && r.error) || 'Обмен не вышел', true); throw new Error('buy'); } },

      pick: async (b) => { const r = await X.api('/api/hwPick', b); if (!r || !r.ok) { if (X.toast) X.toast((r && r.error) || 'Получить не вышло', true); throw new Error('pick'); } } });
  }
  const titleOf = (b) => (b && b.id === 'magic' && msOn() ? String(X.hero().ms) : (b && b.title) || '');
  const still = (svg) => String(svg).replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*?(\/>|>[\s\S]*?<\/\1>)/g, '');


  let GLFAIL = '', glWait = false;
  const rmode = () => { let m = ''; try { m = new URLSearchParams(location.search).get('cityr') || localStorage.getItem('lgCityR') || ''; } catch {} return /^(svg|canvas|webgl)$/.test(m) ? m : 'auto'; };
  const useGL = () => !GLFAIL && rmode() !== 'svg' && !!window.LGCityGL;

  const hideGet = () => { try { return localStorage.getItem('lgCityHide') === '1'; } catch { return false; } };

  const capGet = () => { try { const n = +localStorage.getItem('lgCityCap'); return [5, 10, 25, 50].includes(n) ? n : 0; } catch { return 0; } };
  const capSet = (n) => { try { if (n) localStorage.setItem('lgCityCap', String(n)); else localStorage.removeItem('lgCityCap'); } catch {} };
  const hideSet = (on) => { try { if (on) localStorage.setItem('lgCityHide', '1'); else localStorage.removeItem('lgCityHide'); } catch {} };


  const FS_OK = () => !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const FS_ICO = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path class="cy-fs-on" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path class="cy-fs-off" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

  const OTH_ICO = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path class="cy-oth-x" d="M3 3l18 18"/></svg>';
  const FR_ICO = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 13.6c2.6.2 4.5 2 4.5 4.6"/></svg>';

  const frN = () => { const f = window.LGFriends; return f && f.n ? f.n() : 0; };
  const frHtml = () => { if (!window.LGFriends || !window.LGFriends.open) return ''; const n = frN(); return `<button type="button" class="cy-fr" title="Друзья" aria-label="${n ? 'Друзья, новых заявок: ' + n : 'Друзья'}">${FR_ICO}<b class="cy-fr-n"${n ? '' : ' hidden'}>${n > 99 ? '99+' : n}</b></button>`; };
  function frSync() {
    if (!S || !S.el) return;
    let b = S.el.querySelector('.cy-fr');
    if (!b) { const h = frHtml(), o = S.el.querySelector('.cy-others'); if (!h || !o) return; o.insertAdjacentHTML('beforebegin', h); b = S.el.querySelector('.cy-fr'); }
    const n = frN(), c = b.querySelector('.cy-fr-n');
    c.hidden = !n; c.textContent = n > 99 ? '99+' : String(n);
    b.setAttribute('aria-label', n ? 'Друзья, новых заявок: ' + n : 'Друзья');
  }

  window.addEventListener('lgfriends', frSync);



  const chatHtml = () => (window.LGChat ? window.LGChat.html({ name: 'Чат города', ph: 'Написать в чат города…' }) : '');
  const defsOf = (svg) => (String(svg).match(/<defs>[\s\S]*?<\/defs>/g) || []).join('');







  const QL = [
    { canvas: [30, 30], webgl: [60, 30], svg: [30, 20], vis: 30, lab: 30, bob: true, res: [null, null] },
    { canvas: [20, 15], webgl: [30, 20], svg: [20, 15], vis: 20, lab: 10, bob: false, res: [1.25, 2] },
    { canvas: [15, 12], webgl: [20, 15], svg: [15, 12], vis: 12, lab: 5, bob: false, res: [1, 1.5] },
  ];
  const qForced = () => { try { const v = localStorage.getItem('lgCityQ'); return /^[012]$/.test(v || '') ? +v : null; } catch { return null; } };

   

  


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
        ${frHtml()}<button type="button" class="cy-others" aria-pressed="false">${OTH_ICO}<span class="cy-tipb" aria-hidden="true"></span></button>
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


    if (L.magic && L.magic.room) L.rooms = Object.assign({}, L.rooms, { magic: L.magic.room });
    const MS = msOn() && !!L.magic;
    if (TOWN.L) return isCamp() ? buildCamp(root, gl, st, L, MS) : buildTown(root, gl, st, L, MS);
    WD = M;

    const mk = (hw) => M.make((L.obstacles || []).filter((o) => !o.divider), { magic: MS, magicObst: L.magic && L.magic.obstacle, mine: mnOn(), jail: jlOn(), ...(hw || {}) });
    const map = mk(), Q = ART.quarter(st, M.QW, { auction: auOpen() }), LW = ART.lower(st, M, { storage: stOpen(), mine: mnOn(), jail: jlOn() });

    const skyM = /\.fr-skybg\{background:([^}]+)\}/.exec(L.css || ''), sky = skyM ? skyM[1] : Q.sky;

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


    const street = [
      `<svg x="0" y="0" width="${M.QW + 40}" height="1080" viewBox="0 0 ${M.QW + 40} 1080">${scopeIds(Q.svg, 'cyq-')}</svg>`,
      `<svg x="${M.QW + 8}" y="0" width="${L.width - 8}" height="1080" viewBox="8 0 ${L.width - 8} 1080"><g>${stars}</g>${fairSvg}</svg>`,
      `<svg x="0" y="${M.LOW.top}" width="${M.W}" height="${M.H - M.LOW.top}" viewBox="0 ${M.LOW.top} ${M.W} ${M.H - M.LOW.top}">${scopeIds(LW.svg, 'cyl-')}</svg>`,
    ];
    const qd = defsOf(scopeIds(Q.svg, 'cyq-')), ld = defsOf(scopeIds(LW.svg, 'cyl-'));

    const DH = (L.hw && L.hw.dead) || null;
    let Qd = null; try { const q = ART.quarter(st, M.QW, { auction: auOpen(), dead: true }); if (q && q.dead) Qd = q; } catch { Qd = null; }
    let fairD = ''; try { if (DH && typeof DH.scene === 'function') fairD = scopeIds(DH.scene({ city: true, ...(MS ? { magic: true, magicName: String(X.hero().ms) } : {}) }), 'cyfd-'); } catch { fairD = ''; }
    const layers = [
      { x: 0, y: 0, w: M.QW + 40, h: 1080, svg: street[0], ...(Qd ? { dead: `<svg x="0" y="0" width="${M.QW + 40}" height="1080" viewBox="0 0 ${M.QW + 40} 1080">${scopeIds(Qd.svg, 'cyqd-')}</svg>` } : {}) },
      { x: M.QW + 8, y: 0, w: L.width - 8, h: 1080, svg: street[1], ...(fairD ? { dead: `<svg x="${M.QW + 8}" y="0" width="${L.width - 8}" height="1080" viewBox="8 0 ${L.width - 8} 1080">${fairD}</svg>` } : {}) },
      { x: 0, y: M.LOW.top, w: M.W, h: M.H - M.LOW.top, svg: street[2] },
    ];
    const qdd = Qd ? defsOf(scopeIds(Qd.svg, 'cyqd-')) : '';

    const props = [
      ...Q.props.map((p, i) => ({ x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: 0, svg: qd + scopeIds(p.svg(), 'cyq-'), ...(Qd && Qd.props && Qd.props[i] ? { svgDead: qdd + scopeIds(Qd.props[i].svg(), 'cyqd-') } : {}) })),
      ...LW.props.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: 0, svg: ld + scopeIds(p.svg(), 'cyl-') })),
      ...(L.props || []).map((p, i) => (p.divider ? null : { x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: M.QW, svg: scopeIds(p.svg(), 'cyp' + i + '-'),
        ...(DH && DH.props && DH.props[i] && typeof DH.props[i].svg === 'function' ? { svgDead: scopeIds(DH.props[i].svg(), 'cypd' + i + '-') } : {}) })).filter(Boolean),
    ];
    return Object.assign(finish(root, el, gl, { L, map, st, street, sky, qprops: Q.props, layers, props, skyDead: (DH && DH.sky) || null }), { mk });
  }


  function finish(root, el, gl, sc) {
    const { L, map, st, street, sky, qprops, layers, props, skyDead } = sc;
    let G = null;
    if (gl) {
      G = window.LGCityGL.create({
        host: el.querySelector('.cy-view'), labelHost: el, W: WD.W, H: WD.H, top: TOP, sky, skyDead, mode: rmode(), V: window.LG_CITYV, layers, props,
        onDirty: () => kick(), onFail: (why) => glFail(why),
      });
    }

    const ol = window.LGCityGL && window.LGCityGL.outliner ? window.LGCityGL.outliner([...layers, ...props].map((l) => ({ svg: l.svg, dx: l.dx || 0 }))) : null;

    el.querySelectorAll('.cy-art svg, .cy-prop').forEach((s) => { try { s.pauseAnimations && s.pauseAnimations(); } catch {} });

    el.querySelectorAll('.cy-art svg svg.jl-doodle, .cy-prop svg.jl-doodle').forEach((d) => { const w = d.getAttribute('width'), h = d.getAttribute('height'); if (w) d.style.width = parseFloat(w) + 'px'; if (h) d.style.height = parseFloat(h) + 'px'; d.style.position = 'static'; d.style.filter = 'none'; });
    return {
      root, el, L, map, st, gl: G, ol, street, sky, qprops, glide: null, inFrame: false, q: { lv: qForced() ?? 0, fixed: qForced() != null, iv: [], at: 0, up: 0, lock: false, lodAt: 0, drawAt: 0 }, camMoved: false, view: el.querySelector('.cy-view'), cam: el.querySelector('.cy-cam'), walk: el.querySelector('.cy-walk'), names: el.querySelector('.cy-names'), room: el.querySelector('.cy-room'), panel: null, hud: el.querySelector('.cy-on'), capV: capGet(),
      z: 0.6, camX: inTown() ? 0 : M.QW + 300, camY: TOP, town: TOWN.id, qpfx: inTown() ? 'cyt-' : 'cyq-', camT: null, drag: null, follow: true, freeUntil: 0,
      kw: { keys: new Set(), on: false, last: null, at: 0, dirty: false, t: 0 },
      me: null, others: new Map(), hidden: hideGet(), ghosts: new Map(), n: 0, inCity: false, entering: null, goQ: null, goAt: 0, goT: 0, raf: 0, last: 0, timer: 0, tick: 0, panelId: null, arrive: null,
    };
  }

  

  function buildTown(root, gl, st, L, MS) {
    const TL = TOWN.L, A = window.LGTownArt.draw(TL, { guy: smithGuy, mineOpen: mnOn() });
    WD = { W: TL.W, H: TL.H, QW: 0, AREA: TL.AREA, BUILDINGS: TL.BUILDINGS.filter((b) => !b.magic || MS), town: TL };
    const map = window.LGTownGen.map(TL, { magic: MS }), sky = A.sky;
    const layers = A.layers.map((l) => ({ x: l.x, y: l.y || 0, w: l.w, h: l.h || TL.H, svg: scopeIds(l.svg, 'cyt-') }));
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
  


  function buildCamp(root, gl, st, L, MS) {
    Object.assign(TOWN.L, campName());
    const TL = TOWN.L, A = window.LGCampArt.draw(TL, st, { guy: smithGuy, name: campName(), ...(MS ? { magic: String(X.hero().ms) } : {}) });
    WD = { W: TL.W, H: TL.H, QW: 0, AREA: TL.AREA, BUILDINGS: TL.BUILDINGS.filter((b) => !b.magic || MS), town: TL };
    const map = window.LGCampMap.map(TL, { magic: MS }), sky = A.sky;
    const layers = A.layers.map((l) => ({ x: l.x, y: l.y || 0, w: l.w, h: l.h || TL.H, svg: scopeIds(l.svg, 'cyt-') }));
    const props = A.props.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, z: p.z, dx: 0, ...(p.flick ? { flick: p.flick } : {}), svg: scopeIds(A.defs + p.svg(), 'cyt-') }));
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

    return finish(root, el, gl, { L, map, st, street: layers.map((l) => l.svg), sky, qprops: A.props.map((p) => ({ ...p, svg: () => A.defs + p.svg() })), layers, props });
  }

  function smithGuy(seed, base, cx, s, mood, extra, look, anim) {
    try {
      const svg = D().jDoodle(D().jhash(seed), mood, false, extra, look), w = 120 * s, h = 170 * s;
      const body = svg.replace('<svg class="jl-doodle" viewBox="0 0 120 170"', `<svg class="jl-doodle" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" viewBox="0 0 120 170" overflow="visible"`);
      const sway = anim === 'smith' ? '<animateTransform attributeName="transform" type="rotate" values="0;-7;-7;4;0;0" keyTimes="0;.3;.45;.55;.7;1" dur=".9s" repeatCount="indefinite"/>' : '';
      return `<g transform="translate(${cx} ${base})"><g>${sway}<g>${body}</g></g></g>`;
    } catch { return ''; }
  }

  function fxLayer(el, kind) {
    if (!kind || reduce()) return;
    const v = el.querySelector('.cy-view'); if (!v) return;
    const n = kind === 'snow' ? 14 : kind === 'firefly' ? 8 : 10;
    let h = ''; for (let i = 0; i < n; i++) h += `<i style="left:${(i * 97) % 100}%;animation-delay:${(-i * 1.37).toFixed(2)}s;animation-duration:${(kind === 'firefly' ? 5 : 7) + (i % 4) * 1.3}s"></i>`;
    const f = document.createElement('div'); f.className = 'cy-fx'; f.dataset.fx = kind; f.setAttribute('aria-hidden', 'true'); f.innerHTML = h; v.appendChild(f);
  }

   


  function layout() {
    if (!S) return;
    if (S.gl && !S.root.classList.contains('on')) return;
    try {

      const fs = document.fullscreenElement === S.el, top = fs ? 0 : S.view.getBoundingClientRect().top + window.scrollY, bar = S.el.querySelector('.cy-bar'), bh = bar ? bar.offsetHeight : 0;
      S.view.style.height = Math.max(300, Math.round(window.innerHeight - top - bh)) + 'px';
    } catch {}
    const vh = S.view.clientHeight || 400, vw = S.view.clientWidth || 360;
    S.vw = vw; S.vh = vh;
    S.zb = Math.max(0.4, Math.min(1, vh / 1100, vw / 640));
    S.z = zClamp(S.zb * (S.zk || zoomGet()));
    S.cam.style.setProperty('--iz', (1 / S.z).toFixed(3));
    clampCam(); applyCam();
  }
  




  const ZK_KEY = 'lgCityZoom';
  const zoomGet = () => { try { const v = +localStorage.getItem(ZK_KEY); return v > 0.2 && v < 5 ? v : 1; } catch { return 1; } };
  const zoomSave = () => { try { localStorage.setItem(ZK_KEY, String(+(S.zk || 1).toFixed(3))); } catch {} };


  const FAIR_H = 1980;
  const zH = () => (isCamp() ? Math.max(WD.H, FAIR_H) : WD.H);
  function zLim() {
    const vh = S.vh || 400, vw = S.vw || 360, zb = S.zb || 0.6;
    const lo = Math.max(vh / (zH() - TOP), vw / WD.W, 0.2);
    return [Math.min(lo, zb), zb * 2];
  }

  const WHEEL_OWN = '.cy-tp, .cy-chat, .cy-room, input, textarea, select, [data-wheel]';
  function zClamp(z) { const [a, b] = zLim(); return Math.max(a, Math.min(b, z)); }

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

  const viewW = () => (S.vw || 360) / S.z;
  const viewH = () => (S.vh || 400) / S.z;
  function clampCam() {
    S.camX = Math.max(0, Math.min(WD.W - viewW(), S.camX));
    const span = WD.H - TOP - viewH();

    S.camY = span > 0 ? Math.max(TOP, Math.min(WD.H - viewH(), S.camY)) : isCamp() ? WD.H - viewH() : TOP + span / 2;
  }
  function applyCam() {
    S.camMoved = true;
    S.cam.style.transform = `translate(${(-S.camX * S.z).toFixed(1)}px, ${(-S.camY * S.z).toFixed(1)}px) scale(${S.z})`;
    if (S.gl) { S.gl.view(S.camX, S.camY, S.z, S.vw || 360, S.vh || 400); kick(); }

    if (S.hnArm && hnNear()) { S.hnArm = false; S.hnK = ''; hwNpc(S.hnOn, true); }

    for (const w of S.others.values()) if (!w.shown && onScreen(w.x, w.y)) { place(w); w.shown = true; }
  }

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

   

  function walkerSvg(l, v) {
    if (hwGh()) v = { ...v, gh: 1 };
    if (X.fig) return X.fig(l, v);
    const hero = { look: v.lk || null, gear: v.g || {}, ghost: !!v.gh };
    return still(X.doodle(l, hero, 'walk', 'peace'));
  }



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
      if (b.height > 0) lift = Math.max(128, Math.min(200, 170 - b.y + 6));
      liftBox.innerHTML = '';
    } catch {}
    if (LIFT.size > 300) LIFT.clear();
    LIFT.set(key, lift);
    return lift;
  }
  const labOf = (l, v, mine) => ({ name: String(v.n || l), lv: v.lv ? +v.lv : 0, aw: Array.isArray(v.aw) ? v.aw : null, mine: !!mine, gh: !!v.gh });
  function addWalker(l, v, x, y, mine) {
    if (S.gl) {
      const svg = walkerSvg(l, v), w = { l, v, x, y, path: null, face: 1, mine: !!mine, sc: 0, moving: false, lift: nameLift(svg, v) };
      S.gl.add(w, svg, labOf(l, v, mine));
      place(w);
      return w;
    }
    const svg = walkerSvg(l, v), w = { l, v, x, y, path: null, face: 1, mine: !!mine, el: document.createElement('div'), body: null, nm: null, sc: 0, moving: false, lift: nameLift(svg, v) };
    w.el.className = 'cy-w' + (mine ? ' me' : '') + (v.gh ? ' gh' : '');
    w.el.innerHTML = `<div class="cy-b">${svg}</div>`;
    w.body = w.el.firstChild;

    w.nm = document.createElement('div'); w.nm.className = 'cy-nm' + (mine ? ' me' : '');
    w.nm.innerHTML = `${esc(v.n || l)}${v.lv ? ` <small>${+v.lv}</small>` : ''}${X.awb ? X.awb(v.aw) : ''}`;
    S.walk.appendChild(w.el); S.names.appendChild(w.nm);
    place(w);
    return w;
  }

  const scaleAt = (y) => (WD && WD.town && window.LGTownGen ? window.LGTownGen.scaleAt(WD.town, y) : M.scaleAt(y));
  const HS = 1.3;
  function place(w) {
    const sc = scaleAt(w.y) * HS;
    if (w.bub) w.bub.style.transform = `translate(${w.x.toFixed(1)}px,${(w.y - (w.lift || 128) * sc - 4).toFixed(1)}px)`;
    if (S.gl) { S.gl.place(w, sc); w.sc = sc; return; }
    w.el.style.transform = `translate(${w.x.toFixed(1)}px,${w.y.toFixed(1)}px)`;
    w.el.style.zIndex = String(Math.round(w.y) + (w.mine ? 1 : 0));
    w.nm.style.transform = `translate(${w.x.toFixed(1)}px,${(w.y - (w.lift || 128) * sc - 4).toFixed(1)}px) translate(-50%,-100%)`;
    if (Math.abs(sc - w.sc) > 0.004 || w.faceSet !== w.face) { w.body.style.transform = `scale(${(w.face * sc).toFixed(3)},${sc.toFixed(3)})`; w.sc = sc; w.faceSet = w.face; }
  }
  const drop = (w) => { if (w.bub) { w.bub.remove(); w.bub = null; } if (S.gl) { S.gl.remove(w); return; } w.el.remove(); w.nm.remove(); };

  function walkTo(w, tx, ty) {
    const p = S.map.path([w.x, w.y], [tx, ty]);
    if (!S.map.free(w.x, w.y) || !S.map.clear([w.x, w.y], p[0])) { w.x = p[0][0]; w.y = p[0][1]; }
    w.path = p.length > 1 ? p.slice(1) : null; w.lag = 0;
    setMoving(w, !!w.path);
    kick();
    return p[p.length - 1];
  }




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

    const r = M.stepAlong(w, dt);
    w.x = r.x; w.y = r.y; w.path = r.path; w.lag = r.lag;


    if (r.dx) w.face = r.dx < 0 ? 1 : -1;

    const on = !S.panelId && (w.mine || onScreen(w.x, w.y));
    if (on || w.shown) place(w);
    w.shown = on;
    if (!w.path) { setMoving(w, false); if (w.mine && S.arrive) { const f = S.arrive; S.arrive = null; f(); } }

    if (w.mine && S && S.kbd) kwHint();
  }
  const onScreen = (x, y) => x > S.camX - 160 && x < S.camX + viewW() + 160 && (y == null || (y > S.camY - 100 && y < S.camY + viewH() + 300));
  function frame(t) {
    if (!S) return;
    S.raf = 0;


    const Q = QL[S.q.lv], mode = S.gl ? (S.gl.mode === 'webgl' ? 'webgl' : 'canvas') : 'svg';

    const fast = !!((S.me && S.me.path) || (S.kw && S.kw.on) || S.glide || S.camMoved || (S.drag && S.drag.moved));
    const gap = 1000 / Q[mode][fast ? 0 : 1];
    if (S.last && t - S.last < gap - 4) { S.raf = requestAnimationFrame(frame); return; }
    S.camMoved = false;
    S.inFrame = true;


    const real = Math.min(2, (t - (S.last || t)) / 1000), dt = Math.min(0.1, real); S.last = t;
    let any = false;

    if (S.kw && S.kw.on) any = kwStep(Math.min(0.25, real)) || any;
    for (const w of [S.me, ...S.others.values()]) if (w && w.path) { advance(w, real); any = any || !!w.path; }
    if (t - S.q.lodAt > 1000) lodPick(t);
    for (const w of S.others.values()) if (w.fadeT) {
      const a = Math.min(1, (t - w.fadeT) / FADE_MS);
      alpha(w, a); if (a >= 1) w.fadeT = 0; else any = true;
    }
    let cam = glide(t) || follow(dt || 0.016);

    if (S.gl && !S.panelId) cam = S.gl.render(t, reduce()) || cam;
    if (!S) return;
    S.inFrame = false;
    qualityTick(t, gap);
    if (any || cam) S.raf = requestAnimationFrame(frame); else S.last = 0;
  }



  function qualityTick(t, gap) {
    const q = S.q;
    if (q.fixed || S.panelId || document.hidden) { q.iv.length = 0; return; }
    if (S.gl && S.gl.busy && S.gl.busy()) { q.drawAt = 0; return; }
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

  function lodPick(t) {
    S.q.lodAt = t;
    const Q = QL[S.q.lv], list = [...S.others.values()];
    let ch = false;
    const set = (w, cull, nolab) => {
      if (!!w.cull !== cull || !!w.nolab !== nolab) { const back = !!w.cull && !cull; w.cull = cull; w.nolab = nolab; ch = true; if (!S.gl && w.el) { w.el.style.display = cull ? 'none' : ''; w.nm.style.display = cull || nolab ? 'none' : ''; } if (cull && w.bub) { w.bub.remove(); w.bub = null; } if (!cull) { place(w); w.shown = true; } if (back) fadeIn(w); }
    };
    const vis = S.capV > 0 ? Math.min(Q.vis, S.capV) : Q.vis;
    if (list.length <= Q.lab && list.length <= vis) for (const w of list) set(w, false, false);
    else {
      const cx = S.me ? S.me.x : S.camX + viewW() / 2, cy = S.me ? S.me.y : S.camY + viewH() / 2;
      list.sort((a, b) => Math.hypot(a.x - cx, (a.y - cy) * 1.5) - Math.hypot(b.x - cx, (b.y - cy) * 1.5));
      list.forEach((w, i) => set(w, i >= vis, i >= Q.lab));
    }
    if (ch) { if (S.gl) S.gl.dirty(); hud(); kick(); }
  }
  function kick() { if (S && !S.raf && !S.inFrame && (!S.gl || S.root.classList.contains('on'))) { S.last = 0; S.raf = requestAnimationFrame(frame); } }

  function glide(t) {
    const g = S.glide; if (!g) return false;
    const a = Math.min(1, Math.max(0, (t - g.t0) / 400)), e = 1 - Math.pow(1 - a, 3);
    S.camX = g.x0 + (g.x1 - g.x0) * e; S.camY = g.y0 + (g.y1 - g.y0) * e;
    if (a >= 1) S.glide = null;
    applyCam();
    return true;
  }

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

   
  async function enter() {
    if (!S || S.inCity || S.entering) return;
    S.entering = X.api('/api/city/enter', { x: Math.round(S.me.x), y: Math.round(S.me.y), town: S.town || 'fair' });
    const r = await S.entering; S.entering = null;
    if (!S) return;
    if (r && !r.ok && r.error === 'town_closed' && S.town !== 'fair') { townGo('fair', 'Этот город сейчас закрыт — ты на Ярмарке'); return; }
    if (!r || !r.ok) { hud(r && r.error ? 'Город без других игроков: ' + r.error : 'Другие игроки пока не видны — нет связи'); return; }
    S.inCity = true; S.inB = null;
    for (const w of S.others.values()) drop(w);
    S.others.clear(); S.ghosts.clear();
    chatEnter(r);

    jailLoad();
    if (window.LGTrade) window.LGTrade.mount(X, S.el);
    apply(r);
    timers(true);
    if (S.goQ) flushGo();
  }
  function leave() {
    if (!S || !S.inCity) return;
    S.inCity = false;
    try { fetch((window.LG_BASE || '') + '/api/city/leave', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch {}
    if (window.LGTrade) window.LGTrade.reset();
    for (const w of S.others.values()) drop(w);
    S.others.clear(); S.ghosts.clear(); S.n = 0; hud();
  }


  function sendGo(tx, ty, from) {
    S.goQ = { x: Math.round(tx), y: Math.round(ty), f: from || null };

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

  function apply(d) {
    if (!S || !d) return;
    if ((d.tr !== undefined || d.trNote || d.trDone) && window.LGTrade) { window.LGTrade.mount(X, S.el); window.LGTrade.on(d.tr, d); } if (d.chat || d.chatDel || d.c != null) chatApply(d);
    if (S.hidden) { remember(d); if (d.n != null) S.n = d.n; hud(); return; }
    for (const l of d.g || []) { const w = S.others.get(l); if (w) { drop(w); S.others.delete(l); } }
    for (const e of d.a || []) {
      if (e.l === X.login()) continue;
      let w = S.others.get(e.l), fresh = false;
      if (!w) { const [nx, ny] = S.map.nearest(e.x, e.y); w = addWalker(e.l, e, nx, ny, false); S.others.set(e.l, w); fresh = true; }
      chase(w, e.x, e.y, e.tx, e.ty, +e.dt || 0, fresh);
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
    let vis = 0; for (const w of S.others.values()) if (!w.cull) vis++;
    const more = Math.max(0, S.n - vis);
    const t = msg || (S.inCity ? `В городе: ${S.n + 1}${S.hidden ? (S.n ? ' · другие скрыты' : '') : more ? ` · видно ${vis}, ещё ${more}` : ''}` : 'Подключаемся к городу…');
    if (S.hud.textContent !== t) S.hud.textContent = t;
  }

   




  let CH0 = null;
  const CH = () => CH0 || (CH0 = window.LGChat ? window.LGChat.make({ state: () => S, X: () => X, base: '/api/city/chat', say: '/api/city/say', key: 'lgCityChat', sz: { key: 'lgCityChatSz' }, name: 'Чат города', ph: 'Написать в чат города…', where: 'в чате города',
    flags: (h) => ({ on: !!(h && h.cc), tr: !!(h && h.ct), dm: !!(h && h.cd) }), trade: true,
    here: () => !!(S && S.inCity), joining: 'подключаемся к городу…', rejoin: () => enter(),
    onError: (er) => { if (/не в городе/.test(er) && S) { S.inCity = false; enter(); } },
    bubble: (l, t, id) => bubble(l, t, id), unbubble: (id) => unbubble(id) }) : null);

  const one = () => !!(window.LGChatOne && window.LGChatOne.on());
  const chatInit = () => { if (one()) { if (S) window.LGChatOne.dock('city', S.el); return; } const c = CH(); if (c) c.init(); };
  const chatEnter = (r) => { if (one()) { window.LGChatOne.enterFeed('city', r); return; } const c = CH(); if (c) c.enter(r); };

  const chatApply = (d) => { if (one()) return; const c = CH(); if (c) c.apply(d); };
  const tentMine = () => { const me = String((X && X.login && X.login()) || '').toLowerCase(); return !!me && me === chanLogin(); };
  const chanLogin = () => { const m0 = /\/c\/([\w]+)/.exec(location.pathname); return m0 ? m0[1].toLowerCase() : ''; };

  function bubble(l, t, id) {
    const w = l === X.login() ? S.me : S.hidden ? null : S.others.get(l); if (!w || w.cull) return;
    if (!w.bub) { w.bub = document.createElement('div'); w.bub.className = 'cy-bub'; w.bub.setAttribute('aria-hidden', 'true'); w.bub.innerHTML = '<span></span>'; S.cam.appendChild(w.bub); }
    w.bub.dataset.id = id; w.bub.firstChild.textContent = [...t].length > 90 ? [...t].slice(0, 89).join('') + '…' : t;
    place(w);
    clearTimeout(w.bubT); w.bubT = setTimeout(() => { if (w.bub) { w.bub.remove(); w.bub = null; } }, Math.min(9000, 4000 + t.length * 50));
  }
  function unbubble(id) { for (const w of [S.me, ...S.others.values()]) if (w && w.bub && w.bub.dataset.id === id) { w.bub.remove(); w.bub = null; } }

   



  function remember(d) {
    const now = Date.now();
    for (const l of d.g || []) S.ghosts.delete(l);
    for (const e of d.a || []) if (e.l !== X.login()) S.ghosts.set(e.l, { e: { ...e }, at: now - (+e.dt || 0) });
    for (const m of d.m || []) { const g = S.ghosts.get(m[0]); if (g) { Object.assign(g.e, { x: m[1], y: m[2], tx: m[3], ty: m[4] }); g.at = now - (+m[5] || 0); } }
  }
  function setHidden(on) {
    if (!S || S.hidden === on) return;
    S.hidden = on; hideSet(on);
    if (on) {
      const now = Date.now();
      for (const [l, w] of S.others) {
        const end = w.path ? w.path[w.path.length - 1] : [w.x, w.y];
        S.ghosts.set(l, { e: { ...w.v, l, x: w.x, y: w.y, tx: end[0], ty: end[1] }, at: now });
        drop(w);
      }
      S.others.clear();
      if (S.gl) S.gl.dirty();
    } else {
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

  function timers(on) {
    if (!S) return;
    clearInterval(S.timer); S.timer = 0;
    if (!on) return;
    S.tick = 0;
    S.timer = setInterval(async () => {
      if (!S || !S.inCity || document.hidden) return;
      S.tick++;
      if (!X.live()) { const r = await X.api('/api/city/state' + (S.chat && S.chat.on ? '?c=' + S.chat.c : '')); if (r && r.ok) apply(r); else if (r && /не в городе/.test(r.error || '')) { S.inCity = false; enter(); } }

      if (S.tick % 10 === 0 && !X.live()) jailLoad();
      else if (S.tick % 20 === 0) { const r = await X.api('/api/city/ping', {}); if (r && r.ok === false && /не в городе/.test(r.error || '')) { S.inCity = false; enter(); } }
    }, 3000);
  }

   
  function scenePt(cx, cy) { const r = S.view.getBoundingClientRect(); return [S.camX + (cx - r.left) / S.z, S.camY + (cy - r.top) / S.z]; }

  function awAt(x, y, pad) { return S.gl && S.gl.badgeAt ? S.gl.badgeAt(x, y, pad) : null; }
  function awShow(h) {
    if (!X.awPop) return;
    const r = S.view.getBoundingClientRect(), cx = r.left + (h.x - S.camX) * S.z, cy = r.top + (h.y - S.camY) * S.z, d = h.r * S.z + 2;
    X.awPop(h.a, { left: cx - d, right: cx + d, top: cy - d, bottom: cy + d }, 'cy:' + h.l + ':' + h.i);
  }


  function wheelOwn(e, v) {
    const t = e.target; if (!(t instanceof Element) || t === v || t.closest('.cy-cam')) return false;
    for (let n = t; n && n !== v; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) {
        const atEnd = e.deltaY > 0 ? n.scrollTop + n.clientHeight >= n.scrollHeight - 1 : e.deltaY < 0 ? n.scrollTop <= 0 : false;
        if (atEnd) e.preventDefault();
        return true;
      }
    }
    if (t.closest('.cy-tp')) { e.preventDefault(); return true; }
    return false;
  }
  function bindInput() {
    const v = S.view;

    const fingers = new Map();
    const pinchOf = () => { const [a, b] = [...fingers.values()], r = v.getBoundingClientRect(); return { d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top }; };
    v.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !e.target.closest('button, .awb, .cy-capl')) {
        fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (fingers.size === 2) { const q = pinchOf(); S.pinch = { d0: q.d, z0: S.z, mx: q.mx, my: q.my }; S.drag = null; v.classList.remove('cy-dragging'); return; }
        if (fingers.size > 2) return;
      }
      if ((e.button !== 0 && e.button !== 2) || e.target.closest('button, .awb, .cy-capl')) return;
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
      const ab = e.button === 0 ? awAt(x, y, e.pointerType === 'mouse' ? 3 : 8) : null; if (ab) { awShow(ab); return; }






      if (meJail()) { if (inCage(x, y)) { jailGo(x, y); return; } const bj = S.map.hoverAt(x, y); if (bj && bj.id === 'jail') jwOpen(); else jailGo(x, y); return; }
      if (jailAt(x, y)) { jwOpen(); return; }
      const wh = window.LGTrade && ((X.hero() && X.hero().tr) || window.LGFriends) && (e.pointerType !== 'mouse' || e.button === 2) ? walkerAt(x, y) : null;
      if (wh) { window.LGTrade.mount(X, S.el); window.LGTrade.menu(wh.l, wh.v, e.clientX, e.clientY); return; }
      const b = S.map.hoverAt(x, y);


      if (b) { if (e.pointerType !== 'mouse') { S.touch = true; hover(b, x, y); clearTimeout(S.hovT); S.hovT = setTimeout(() => hover(null), 1300); } goBuilding(b.id); } else goPoint(x, y);
    };

    v.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || (S.drag && S.drag.moved) || S.panelId) return;
      const [x, y] = scenePt(e.clientX, e.clientY);
      S.touch = false;

      const ab = awAt(x, y, 3), k = ab ? 'cy:' + ab.l + ':' + ab.i : '';
      if (k !== (S.awK || '')) { S.awK = k; v.style.cursor = ab ? 'help' : ''; if (ab) awShow(ab); else if (X.awHide) X.awHide('cy:'); }
      if (ab) { hover(null); return; }

      if (meJail() && inCage(x, y) && !jailAt(x, y)) { hover(null); return; }

      { const jw = jailAt(x, y); if (jw) { const J = WD.LOW.jail; hover({ id: 'jail', ol: 'jail', r: [J.c0, J.c1, J.ct - 50, J.fy], tip: `${jw.v.n || jw.l} - в тюрьме канала` }, x, jw.y - 150 * scaleAt(jw.y) * HS); return; } }
      hover(S.map.hoverAt(x, y), x, y);
    });
    v.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover(null); if (S.awK) { S.awK = ''; v.style.cursor = ''; if (X.awHide) X.awHide('cy:'); } } });
    v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);

    v.addEventListener('contextmenu', (e) => { if (e.target.closest('input, textarea, a, [contenteditable]')) return; e.preventDefault(); });


    v.addEventListener('wheel', (e) => {
      if (wheelOwn(e, v) || e.target.closest(WHEEL_OWN)) return;
      e.preventDefault(); S.glide = null;
      const r = v.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      if (e.ctrlKey || e.metaKey) { zoomTo(S.z * Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.01), mx, my); return; }
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { const dx = e.shiftKey ? e.deltaY || e.deltaX : e.deltaX; S.camX += dx / S.z; clampCam(); applyCam(); S.freeUntil = Date.now() + 4000; return; }
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      zoomTo(S.z * Math.exp(-Math.max(-120, Math.min(120, dy)) * 0.0018), mx, my);
    }, { passive: false });
    v.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('select, input, textarea')) return;
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') { e.preventDefault(); zoomTo(S.z * (e.key === '+' || e.key === '=' ? 1.25 : 0.8)); return; }
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (k) { e.preventDefault(); pan(k[0], k[1]); } });
    S.el.addEventListener('click', (e) => {

      if (e.target.closest('.cy-fr')) { if (window.LGFriends) window.LGFriends.open(); return; }
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

  const ACT = { mineboard: 'кто копает лучше всех', magic: 'посохи, мантии, амулеты', anvil: 'наточить оружие', forge: 'лавка кузнеца', tent: 'примерить облик', shop: 'еда, зелья, материалы', trainer: 'дерево навыков', board: 'новости игры', gate: 'в поход — только на стриме', hall: 'скоро: оборона города', auction: 'торговля между игроками', storage: 'хранение вещей', mine: 'промысел: руда' };
  function hover(t, x, y) {
    const key = t ? t.id + '|' + t.r.join(',') + (t.tip || '') : '';
    if (!S || key === (S.hovK || '')) return;
    S.hovK = key;
    const box = S.el.querySelector('.cy-hov'); if (!box) return;
    S.view.classList.toggle('hov', !!t);
    outline(t);
    if (!t) { box.classList.remove('on'); return; }
    const B = WD.BUILDINGS.find((b) => b.id === t.id) || {}, [x0, x1, y0] = t.r, top = Math.max(y0, S.camY + 20);
    const tip = box.lastChild;
    tip.textContent = t.tip ? t.tip : `${t.what ? t.what + ' · ' : ''}${titleOf(B)} — ${(t.id === 'auction' || t.id === 'storage' || t.id === 'mine') && soonB(B) ? 'скоро: ' + (ACT[t.id] || B.sub || '') : ACT[t.id] || B.sub || ''}`;
    tip.style.cssText = `left:${x != null ? x : (x0 + x1) / 2}px;top:${(y != null ? y : top) - 26 / S.z}px`;
    box.classList.add('on');
  }



  function outline(t) {
    const id = t ? t.ol || t.id : '';
    S.olWant = id;
    if (!id || !S.ol) { olShow(null); return; }

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
    if (meJail()) { jailGo(x, y); return; }
    closePanel(); S.el.classList.add('went');
    S.arrive = null; S.freeUntil = 0;
    const end = walkTo(S.me, x, y);
    sendGo(end[0], end[1]);
    ripple(end[0], end[1]);
  }
  function goBuilding(id) {

    if (id === 'jail') { jwOpen(); return; }

    if (meJail()) return;
    const B = WD.BUILDINGS.find((b) => b.id === id); if (!B || !bOk(B) || !S.me) return;
    S.freeUntil = 0;
    if (id === 'mine') { const end = walkTo(S.me, B.door.x, B.door.y); sendGo(end[0], end[1]); closePanel(); if (!S.me.path) mineOpen(); else S.arrive = mineOpen; return; }

    const bm = buildSay(B);
    if (bm) { closePanel(); const end = walkTo(S.me, B.door.x, B.door.y); sendGo(end[0], end[1]); S.arrive = null; hud(bm); if (X.toast) X.toast(bm); clearTimeout(S.bmT); S.bmT = setTimeout(() => S && hud(), 4000); return; }
    const end = walkTo(S.me, B.door.x, B.door.y);
    sendGo(end[0], end[1]);
    if (!S.me.path) openPanel(id); else { closePanel(); S.arrive = () => openPanel(id); }
  }
   






  const KW = { KeyW: [0, -1], KeyA: [-1, 0], KeyS: [0, 1], KeyD: [1, 0] };
  const KW_GO = 800, KW_STOP = 750, KW_DOOR = 120;
  const kwOn = () => !!(X && X.hero() && X.hero().kw);

  const KW_OWN = '[role="dialog"], [role="alertdialog"], [role="menu"], [aria-modal="true"]';
  function kwBusy(e) {

    if (!S || !S.me || !S.root || !S.root.isConnected || !S.root.classList.contains('on') || S.panelId || document.hidden) return true;
    if (e && (e.ctrlKey || e.metaKey || e.altKey)) return true;
    const t = e && e.target;
    if (t && t.closest && (t.closest('input, textarea, select, [contenteditable]') || t.isContentEditable)) return true;
    for (const d of document.querySelectorAll(KW_OWN)) if (d.getClientRects().length) return true;
    return false;
  }

  function kwNear() {

    if (!S || !S.me || meJail()) return null;
    let best = null, bd = KW_DOOR;
    for (const b of WD.BUILDINGS) {
      if (!b.door || !bOk(b)) continue;
      const d = Math.hypot(b.door.x - S.me.x, b.door.y - S.me.y);
      if (d <= bd) { bd = d; best = b; }
    }
    return best;
  }

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

  function kwStep(dt) {
    const k = S.kw, w = S.me;
    if (!w || S.panelId) { kwHalt(); return false; }
    let dx = 0, dy = 0;
    for (const c of k.keys) { const v = KW[c]; if (v) { dx += v[0]; dy += v[1]; } }
    const len = Math.hypot(dx, dy);
    if (!len) { setMoving(w, false); return true; }
    const s = M.SPEED * dt, vx = dx / len * s, vy = dy / len * s, x = w.x, y = w.y;


    const jl = !!meJail();
    const ok = (a, b) => S.map.free(a, b) && S.map.clear([x, y], [a, b]);
    let nx = x, ny = y;
    if (jl) [nx, ny] = M.jailWalk(x + vx, y + vy);
    else if (ok(x + vx, y + vy)) { nx = x + vx; ny = y + vy; }

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

  function kwSync(stop) {
    const k = S && S.kw; if (!k || !k.dirty || !S.me) return;

    if (meJail()) { k.dirty = false; return; }
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
      if (e.repeat || meJail()) return;
      const b = kwNear(); if (b) goBuilding(b.id);
      return;
    }
    const k = S.kw;
    if (!k.on) {

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

  window.addEventListener('blur', () => kwHalt());
  document.addEventListener('visibilitychange', () => { if (document.hidden) kwHalt(); });


  function ripple(x, y) {
    if (S.gl) { S.gl.ripple(x, y); kick(); return; }
    const r = document.createElement('i'); r.className = 'cy-rip'; r.style.left = x + 'px'; r.style.top = y + 'px'; r.style.zIndex = String(Math.round(y) - 1);
    S.walk.appendChild(r); setTimeout(() => r.remove(), 700);
  }

   



  const ROOM = {
    forge: { hero: [1872, 1076], k: 1.2, focus: 1300, ui: 'l', fit: true },
    magic: { hero: [1872, 1076], k: 1.2, focus: 1300, ui: 'l', fit: true },

    anvil: { hero: [1470, 1040], k: 2, focus: 1000, ui: 'l', art: 'street', say: [1450, 650] },
    tent: { hero: [1800, 1074], k: 1.35, focus: 1250, ui: 'l', fit: true },
    shop: { hero: [880, 1060], k: 1.6, npc: [1440, 860, 'Лавочница', 'happy', {}, { hat: 'chef' }], focus: 1150, ui: 'l', art: 'shop', fit: true },
    trainer: { hero: [1640, 1040], npc: [240, 1040, 'Тренер', 'stern', { armed: true, gear: { w: 'gladius' } }, { hat: 'bandana' }], focus: 960, ui: 'o', art: 'trainer' },
    board: { hero: [1850, 1076], k: 1.3, focus: 960, ui: 'o', art: 'board' },
    hall: { hero: [760, 1010], npc: [1240, 1010, 'Мастер-строитель', 'happy', {}, { hat: 'cap' }], focus: 1000, ui: 'l', art: 'plain' },
    auction: { hero: [760, 1010], npc: [1240, 1010, 'Аукционист', 'happy', {}, { hat: 'tophat' }], focus: 1000, ui: 'l', art: 'plain' },
    storage: { hero: [760, 1010], npc: [1260, 1010, 'Кладовщик', 'happy', {}, { hat: 'cap' }], focus: 1000, ui: 'l', art: 'storage', keep: 250 },
    gate: { hero: [760, 1010], npc: [1240, 1010, 'Страж ворот', 'stern', { armed: true, gear: { w: 'spear', s: 'scutum' } }, { hat: 'legion' }], focus: 1000, ui: 'l', art: 'plain' },
  };

  const ANV0 = { ox: M.QW - 330, oy: 430, k: 2 };
  function streetBg() {

    const ANV = inTown() ? { ox: TOWN.L.anvil.x - 480, oy: 430 + (TOWN.L.anvil.oy || 0), k: 2 } : ANV0;
    let sky = '';
    try { sky = window.LGCityGL && window.LGCityGL.skyDef ? window.LGCityGL.skyDef(S.sky, WD.H) : ''; } catch {}
    const props = (S.qprops || []).filter((p) => p.x < ANV.ox + 960 && p.x + p.w > ANV.ox).map((p) => `<svg x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible">${scopeIds(p.svg(), S.qpfx || 'cyq-')}</svg>`).join('');
    const fp = inTown() ? '' : (S.L.props || []).filter((p) => !p.divider && p.x < 630 && p.x + p.w > -330).map((p, i) => `<svg x="${p.x + M.QW}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible">${scopeIds(p.svg(), 'cyp' + i + '-')}</svg>`).join('');

    const SM = /<animateTransform attributeName="transform" type="rotate" values="0;-7;-7;4;0;0"[^>]*\/>/;
    const street = S.street.join('').replace(SM, '@@SMITH@@');
    const art = still(street).replace('@@SMITH@@', '<animateTransform data-smith="1" attributeName="transform" type="rotate" values="0;-7;-7;4;0;0" keyTimes="0;.3;.45;.55;.7;1" dur=".9s" begin="indefinite" fill="remove"/>');
    return scopeIds(`<g transform="scale(${ANV.k}) translate(${-ANV.ox} ${-ANV.oy})">${sky ? `<defs>${sky}</defs><rect x="${ANV.ox}" y="${ANV.oy}" width="960" height="540" fill="url(#cyglsky)"/>` : ''}${art}${props}${fp}</g>`, 'cyr-');
  }
  const fig = (x, y, svg, k = 2, cls = '') => `<div class="cy-fig2 ${cls}" style="left:${x - 60 * k}px;top:${y - 170 * k}px;width:${120 * k}px">${svg}</div>`;


  const INDOOR = { forge: 1, tent: 1, shop: 1, storage: 1, magic: 1, hall: 1, auction: 1, trainer: 1 };
  function inSay(id) {
    const b = id && INDOOR[id] ? id : null;
    if (!S || !S.inCity || (S.inB || null) === b) return;
    S.inB = b;
    try { Promise.resolve(X.api('/api/city/in', { b })).catch(() => {}); } catch {}
  }
  function closePanel() {
    newsClose();
    if (!S || S.panelId == null) return;
    const was = S.panelId;
    S.panelId = null; inSay(null); X.forgeClose && X.forgeClose(); FX.reset(); if (X.tipHide) X.tipHide(); igOff(); ST.off();
    if (was === 'auction' && window.LGAuction) window.LGAuction.close();
    if (was === 'tent' && tentMine()) { try { X.api('/api/tentShop', { on: false }); } catch (e) {} }
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
    { const B0 = WD.BUILDINGS.find((b) => b.id === id); if (B0 && buildSay(B0)) return; }
    if (id === 'mine') { mineOpen(); return; }
    if (id === 'hwshop' || id === 'hwpass') { hwOpen(id); return; }
    if (id === 'mineboard') { if (X.openMineBoard) X.openMineBoard(); return; }

    const V = window.LG_VER; if (V) { if (V.old() && V.reload()) return; V.check(); }
    hover(null);
    const B = WD.BUILDINGS.find((b) => b.id === id), h = X.hero(), R = ROOM[id];
    if (S.panelId === 'anvil' || id === 'anvil') { FX.reset(); X.forgeClose && X.forgeClose(); }
    const fresh = S.panelId == null;
    if (S.panelId === 'tent' && id !== 'tent' && tentMine()) { try { X.api('/api/tentShop', { on: false }); } catch (e) {} }
    S.panelId = id; inSay(id);
    if (id === 'tent' && tentMine()) { try { X.api('/api/tentShop', { on: true }); } catch (e) {} }
    const r = S.room;
    r.dataset.b = id; r.dataset.ui = FULL[id] ? 'f' : R.ui;
    r.classList.toggle('cy-hwd', hwDead());
    const hero = h ? fig(R.hero[0], R.hero[1], still(X.doodle(X.login(), X.heroLook(h), 'happy', 'peace')), R.k || 2.1, 'me') : '';
    const npcF = R.npc ? fig(R.npc[0], R.npc[1], npc(R.npc[2], R.npc[3], R.npc[4], R.npc[5]), 2.1, 'npc') : '';
    const hello = FULL[id] ? '' : helloOf(id);
    r.innerHTML = `<div class="cy-rs"><div class="cy-rsz"></div><div class="cy-rin"><svg class="cy-rbg" width="1920" height="1080" viewBox="0 0 1920 1080" overflow="visible" aria-hidden="true">${roomSvg(id)}</svg>${npcF}${id === 'anvil' ? forgeStage() : ''}${hero}${hello ? `<p class="cy-rsay" style="left:${(R.say ? R.say[0] : R.npc ? R.npc[0] : 1400)}px;top:${(R.say ? R.say[1] : R.npc ? R.npc[1] - 420 : 330)}px">${esc(hello)}</p>` : ''}</div></div>
      <header class="cy-rh"><h2><span aria-hidden="true">${B.icon}</span>${esc(titleOf(B))}</h2><button type="button" class="btn cy-exit" data-cyexit>Выйти</button></header>
      ${FULL[id] ? `<div class="cy-rui cy-rbar"><div class="cy-pb">${body(id, h)}</div></div><p class="cy-rsay2" role="status">${esc(siteSay(id, h))}</p>` : `<div class="cy-rui panel"><div class="cy-pb">${body(id, h)}</div></div>`}`;
    S.panel = r.querySelector('.cy-rui');


    doodSize(r, R.art === 'street');
    r.hidden = false;
    r.querySelector('[data-cyexit]').onclick = closePanel;
    goodsHots(id);
    if (fresh) { void r.offsetWidth; r.classList.add('in'); setTimeout(() => { if (S && S.panelId) S.view.style.visibility = 'hidden'; }, 280); }
    S.roomScroll = null;
    S.roomUser = false;
    { const rs = r.querySelector('.cy-rs'); if (rs) { for (const ev of ['pointerdown', 'wheel', 'touchstart', 'keydown']) rs.addEventListener(ev, () => { if (S) S.roomUser = true; }, { passive: true }); roomPinch(rs); } }
    S.roomZ = 1; S.roomK = null;
    { const sy = r.querySelector('.cy-rsay2'); if (sy) { clearTimeout(S.sayT); S.sayT = setTimeout(() => sy.classList.add('off'), 9000); sy.onclick = () => sy.classList.add('off'); } }
    r.scrollTop = 0;
    after(id, h);
    fitRoom();

    try { if (S.roomRO) S.roomRO.disconnect(); S.roomRO = new ResizeObserver(() => fitRoom()); S.roomRO.observe(S.panel); } catch {}
    if (fresh) try { r.querySelector('[data-cyexit]').focus({ preventScroll: true }); } catch {}

    if (!SH.STOCK && (id === 'forge' || id === 'tent' || id === 'magic' || id === 'shop')) loadStock().then((st) => { if (st && S && S.panelId === id) { const bg = S.room.querySelector('.cy-rbg'); if (bg && id !== 'shop') { bg.innerHTML = roomSvg(id); doodSize(S.room, false); } goodsHots(id); if (id === 'forge' || id === 'magic' || id === 'shop') rerenderUi(id); } });
  }

  function helloOf(id) {
    if (id === 'anvil') {
      const h = X.hero();
      if (!h || !h.ef) return 'Скоро открою мастерскую — заточку вещей. Загляни позже!';
      return ['Клади на наковальню — подточим!', 'Звезда — к удаче, сфера — от поломки. Что точим?', 'Горн разогрет. Выбирай вещь!'][Math.floor(Math.random() * 3)];
    }
    const RR = S.L.rooms && S.L.rooms[id], pick = (a) => (Array.isArray(a) && a.length ? String(a[Math.floor(Math.random() * a.length)]) : '');
    const n = (X.hero() && X.hero().name) || X.login();
    const t = RR && pick(RR.hello);
    if (t) return t.replace(/\{n\}/g, n);
    if (id === 'auction' && auOpen()) return `Добро пожаловать, ${n}! Покупай, продавай — монеты продавцу, вещь тебе, всё честно.`;
    if (id === 'hall' && inTown() && TOWN.acc && !TOWN.acc.own) return 'Ратуша не для чужих. Захватите округ — тогда и поговорим.';
    if (id === 'storage') return stOpen() ? `Заходи, ${n}! Что положим на полку, что заберём?` : 'Склад скоро откроется — будет где хранить вещи, когда сумка полна.';
    return { shop: `Заходи, ${n}! Еда лечит раны, зелья — быстрее.`, hall: 'Добро пожаловать в Ратушу! Здесь склад и казна города.', auction: 'Аукцион откроется позже — торговать будем вещами, звёздами и печатями.', gate: 'В поход отсюда не выйти — отряд собирает стример на стриме.' }[id] || '';
  }

  function siteSay(id, h) {
    if (!h) return 'Героя пока нет — он появится, когда ты напишешь в чат на стриме.';
    if (id === 'tent') return 'Нажми на образец — примерю на тебе. Своё из гардероба — «Надеть», новое купить можно на стриме, за баллы канала.';
    const buy = csOn() ? 'Нажми на вещь — покажу, что даёт; ещё раз (или двойной клик) — «Купить? Да / Нет».' : 'Нажми на вещь — покажу, что даёт. Купить можно на стриме, за баллы канала.';
    if (id === 'forge') return 'Оружие и доспехи — на стойках. ' + buy;
    if (id === 'magic') return 'Посохи, мантии, амулеты, звёзды и сферы — на полках. ' + buy;
    return 'Еда лечит раны, зелья — быстрее. ' + buy;
  }
  const npc = (seed, mood, extra, look) => { try { const gh = hwDead(); const v = still(D().jDoodle(D().jhash(seed), mood, false, gh ? { ...(extra || {}), ghost: true } : extra || {}, look)); return gh ? ghostSvg(v) : v; } catch { return ''; } };
  const say = (t) => `<p class="cy-say">${esc(t)}</p>`;
  function body(id, h) {

    if (id === 'hall') return BLD.hall.body(h);
    if (id === 'auction' && h && h.au) return '<div class="au-root" aria-busy="true"><p class="note">Аукционист раскладывает лоты…</p></div>';
    if (id === 'auction') return `${say('Аукцион скоро откроется: здесь игроки будут продавать и покупать вещи, звёзды, сферы и печати.')}<p class="note">Пока торговать можно только на Ярмарке во время стрима.</p>`;
    if (id === 'storage' && !(h && h.sg)) return `${say('Склад скоро откроется: здесь можно будет хранить вещи, которые не помещаются в сумку.')}<p class="note">Пока сумка без предела — носи всё с собой.</p>`;
    if (id === 'gate') return `${say('В поход отсюда не выйти — отряд собирает стример на стриме.')}<p class="note">Ворота откроются, когда начнётся поход. А пока — заточи оружие, загляни к Тренеру и в Шатёр.</p>`;
    if (id === 'board') return BLD.board.body();
    if (!h) return say('Героя пока нет — он появится, когда ты напишешь в чат на стриме.');
    if (id === 'trainer') return BLD.trainer.body(h);
    if (id === 'anvil') return BLD.forge.body(h);
    if (id === 'forge') return BLD.forge.shop(h);
    if (id === 'magic') return BLD.magic.body(h);
    if (id === 'tent') return BLD.tent.body(h);
    if (id === 'shop') return BLD.shop.body(h);
    if (id === 'storage') return ST.body(h);
    return '';
  }
  function after(id, h) {
    if (id === 'board') BLD.board.after();
    if (id === 'hall') BLD.hall.after();
    if (id === 'auction' && h && h.au) auctionOpen();
    if (id === 'trainer') BLD.trainer.after(h);
    if (id === 'anvil') BLD.forge.after(h);
    if (id === 'forge') BLD.forge.shopAfter();
    if (id === 'tent') BLD.tent.after(h);
    if (id === 'storage' && h && h.sg) ST.after(h);
    if (id === 'shop') BLD.shop.after(h);
  }

  function rerenderUi(id) {
    if (!S || S.panelId !== id) return;

    if (id === 'storage' && ST.hold()) return;
    const pb = S.panel.querySelector('.cy-pb'), sc = pb ? pb.scrollTop : 0;

    ST.quiet(() => { S.panel.innerHTML = `<div class="cy-pb">${body(id, X.hero())}</div>`; });
    after(id, X.hero());
    const pb2 = S.panel.querySelector('.cy-pb'); if (pb2) pb2.scrollTop = sc;
    if (id === 'tent') { const f = S.room.querySelector('.cy-fig2.me'); const h = X.hero(); if (f && h) f.innerHTML = still(X.doodle(X.login(), { ...h, look: { ...((h.wardrobe && h.wardrobe.cur) || {}), ...BLD.tent.TRY }, gear: {} }, 'happy', 'peace')); }
    fitRoom();
  }

  



  const hwNow = () => { const h = X && X.hero(); return (h && h.hwc) || null; };

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
    const c = isCamp() ? null : hwNow(), k = c ? (c.look ? 'l' : '') + (c.portal ? 'p' : '') : '';
    if (k === (S.hwk || '') || S.hwPlay) { if (S.hwk == null) S.hwk = k; if (!S.hwPlay) { hwGhSet(!!(c && c.portal)); hwNpc(!!(c && c.look)); } return; }
    if (k && !window.LGCityHW) { if (!hwJs) hwJs = townJs(`/site/cityhw.js?v=${(window.LG_CITYV || {}).hw || ''}`).catch((e) => { hwJs = null; console.warn('[город] Хэллоуин', e); }); hwJs.then(() => { if (window.LGCityHW) hwApply(); }); return; }
    const was = S.hwk; S.hwk = k;
    const L = window.LGCityHW, sc = { B: WD.BUILDINGS.filter(bOk), AREA: WD.AREA, fair: !inTown() }, hw = S.L && S.L.hw, o = { frame: hw && hw.frame, decor: hw && hw.decor, dx: inTown() ? 0 : M.QW };
    const TC = [0x8e, 0x9a, 0xb8], tint = (q) => { const v = TC.map((x) => Math.round(255 + (x - 255) * q)); S.gl.tint(q <= 0 ? null : (v[0] << 16) | (v[1] << 8) | v[2]); kick(); };

    const fire = (on) => { for (const e of S.el.querySelectorAll('.cy-camp-fl')) e.style.display = on ? '' : 'none'; };

    const stat = () => { fire(!(c && c.look)); hwGhSet(!!(c && c.portal)); S.gl.dropProps('hw'); S.gl.dropProps('hwp'); S.gl.dropProps('hwl');
      if (c && c.look) { S.gl.setDeadArt(L.art(sc, { ...o, portal: !!c.portal })); S.gl.addProps(L.lampProps(sc), 'hwl'); } else if (c && c.portal) S.gl.addProps(L.portal(sc, o), 'hwp');
      S.gl.setDead(!!(c && c.look)); tint(0); hwNpc(!!(c && c.look));

      const fl = S.cam.querySelector('.hwc-fls'); if (fl) fl.remove(); if (c && c.look && !reduce()) { const f = L.flickers(sc, 3); if (f) S.cam.appendChild(f); } };


    if (was != null && !/p/.test(was) && c && c.portal && c.look && c.at && Date.now() - c.at < 20000 && !reduce() && S.cam) {

      S.gl.dropProps('hw'); S.gl.dropProps('hwp'); S.gl.dropProps('hwl'); S.gl.setDeadArt(null); hwNpc(false);
      setTimeout(() => { if (S) fire(false); }, 3000);
      S.hwPlay = L.play({ sc, art: o, world: S.cam, screen: S.view, light: true, ghosts: () => hwGhSet(true), dead: (w) => { if (S && S.gl) { S.gl.setDead(true, w); kick(); } }, bake: () => { if (S && S.gl) { S.gl.setDeadArt(L.art(sc, { ...o, portal: true })); S.gl.dropProps('hwl'); S.gl.addProps(L.lampProps(sc), 'hwl'); kick(); } }, done: () => { if (S) { S.hwPlay = null; hwNpc(!!(hwNow() || {}).look, true); const f = L.flickers(sc, 3); if (f && !reduce() && !S.cam.querySelector('.hwc-fls')) S.cam.appendChild(f); kick(); } } });
      return;
    }
    stat(); kick();
  }
  function heroChanged() {
    if (!S) return;
    hwApply();
    if (window.LGTrade) window.LGTrade.heroChanged();
    chatInit();
    const h = X.hero();
    if (S.me && h) {
      const v = mineView(h);
      if (JSON.stringify(v) !== S.me.vKey) {
        S.me.vKey = JSON.stringify(v); S.me.v = v;
        const svg = walkerSvg(X.login(), v); S.me.lift = nameLift(svg, v);
        if (S.gl) { S.gl.relook(S.me, svg, labOf(X.login(), v, true)); kick(); } else { S.me.body.innerHTML = svg; place(S.me); }
      }
    }

    if (FULL[S.panelId] || S.panelId === 'storage') rerenderUi(S.panelId);
    if (S.panelId === 'anvil') BLD.forge.list(h);
    if (S.panelId === 'auction' && window.LGAuction) window.LGAuction.update(h);
  }

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

  

  const ST = (window.LGCityStore && window.LGCityStore({ get S() { return S; }, get X() { return X; }, npc: (...a) => npc(...a), say: (t) => say(t), IGW: () => IGW(), rerender: (id) => rerenderUi(id) }))
    || { body: () => '<p class="note">Склад не загрузился - обнови страницу.</p>', after() {}, off() {}, res() {}, hold: () => false, quiet: (fn) => fn() };

  const IGW = () => window.LGItems;

  


  const CC = {
    get S() { return S; }, get X() { return X; }, get TOWN() { return TOWN; },
    ROOM, ART, D, esc, still, scopeIds, npcAs, reduce: () => reduce(), hwDead: () => hwDead(), isCamp: () => isCamp(),
    csOn: () => csOn(), msOn: () => msOn(), inTown: () => inTown(), homeHere: () => homeHere(), foreignK: () => foreignK(),
    npc: (...a) => npc(...a), say: (t) => say(t), IGW: () => IGW(), rerender: (id) => rerenderUi(id), goBuilding: (id) => goBuilding(id), streetBg: () => streetBg(),
    bld: (id) => BLD[id],
  };
  const SH = window.LGCityShop(CC);
  const BLD = {};
  for (const id of CITY_B) BLD[id] = window.LGCityBuildings[id](CC, SH);
  const { FULL, loadStock, doodSize, roomSvg, fitRoom, roomPinch, goodsHots } = SH;
  const FX = BLD.forge.FX, forgeStage = () => BLD.forge.stage(), forgeBody = (h) => BLD.forge.body(h), forgeAfter = (h, P) => BLD.forge.after(h, P), pickForge = (uid, P) => BLD.forge.pick(uid, P), igOff = () => BLD.forge.igOff();
  const newsClose = () => BLD.board.close(), newsBoard = (box, list) => BLD.board.render(box, list), newsRead = (i) => BLD.board.read(i);

  







  const jlOn = () => !!(X && X.jailOn && X.jailOn());
  const meJail = () => (X && X.jail && X.jail()) || null;
  let JAIL = { list: [], n: 0 };
  const jailHere = () => !!(S && !inTown() && jlOn() && WD && WD.LOW && WD.LOW.jail);
  const jailDay = (u) => { if (u == null) return 'бессрочно'; try { const d = new Date(u); return 'выйдет ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }) + ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }); } catch (e) { return ''; } };
  async function jailLoad() {
    if (!jailHere()) return;
    const r = await X.api('/api/jail');
    if (r && r.ok) jailSet(r);
  }
  function jailSet(d) {
    if (!d) return;
    JAIL = { list: Array.isArray(d.list) ? d.list : [], n: +d.n || 0, staff: d.staff ? JAIL.staff || !!d.staff : JAIL.staff, why: d.why || JAIL.why, me: d.me || JAIL.me };
    if (d.staff) { JAIL.staff = true; JAIL.why = d.why; }
    if (!S || !jailHere()) return;
    jailDraw();
    if (S.jw) jwRender();
  }
  function jailDraw() {
    if (!S.jail) S.jail = new Map();
    const J = WD.LOW.jail, me = X.login(), mj = meJail();
    const show = mj ? [{ self: 1 }] : [];
    for (const e of JAIL.list) { if (show.length >= J.seats.length) break; if (e.l !== me) show.push(e); }
    const keep = new Set();
    show.forEach((e, i) => {
      const [sx, sy] = J.seats[i];

      if (e.self) { if (S.me && !inWalk(S.me)) { S.me.path = null; S.me.x = sx; S.me.y = sy; S.me.face = i % 2 ? -1 : 1; setMoving(S.me, false); S.me.sc = 0; place(S.me); } return; }
      keep.add(e.l);
      const vk = JSON.stringify([e.n, e.lv, e.lk, e.g, e.gh, e.aw]);
      let w = S.jail.get(e.l);
      if (w && w.vk !== vk) { drop(w); S.jail.delete(e.l); w = null; }
      if (!w) { w = addWalker(e.l, e, sx, sy, false); w.jail = 1; w.vk = vk; S.jail.set(e.l, w); }
      w.x = sx; w.y = sy; w.face = i % 2 ? -1 : 1; w.sc = 0; w.u = e.u; place(w);
    });
    for (const [l, w] of S.jail) if (!keep.has(l)) { drop(w); S.jail.delete(l); }

    const total = JAIL.n + (mj && !JAIL.list.some((e) => e.l === me) ? 1 : 0), more = Math.max(0, total - show.length);
    const host = S.walk || S.cam;
    let pl = S.jailPl;
    if (more > 0) {
      if (!pl || !pl.isConnected) { pl = S.jailPl = document.createElement('div'); pl.className = 'cy-jmore'; pl.setAttribute('aria-hidden', 'true'); host.appendChild(pl); }
      pl.textContent = '+' + more;

      pl.style.cssText = `left:${J.c1 + 44}px;top:${J.ct + 50}px;z-index:${J.fy + 3}`;
    } else if (pl) { pl.remove(); S.jailPl = null; }
    if (!S.sighT && (show.length || mj)) S.sighT = setInterval(jailSigh, 3200);
    kick();
  }

  function jailSigh() {
    if (!S || !S.root || !S.root.classList.contains('on') || document.hidden || reduce()) return;
    const ws = [...(S.jail ? S.jail.values() : [])]; if (meJail() && S.me) ws.push(S.me);
    if (!ws.length) return;
    const w = ws[Math.floor(Math.random() * ws.length)], sc = scaleAt(w.y) * HS;
    if (S.gl) { if (w.gl) { w.gl.body.scale.set(w.face * sc, sc * 0.94); if (S.gl.dirty) S.gl.dirty(); kick(); } }
    else if (w.body) w.body.style.transform = `scale(${(w.face * sc).toFixed(3)},${(sc * 0.94).toFixed(3)})`;
    setTimeout(() => { if (!S) return; w.sc = 0; place(w); kick(); }, 520);
  }

  const inCage = (x, y) => { const J = WD && WD.LOW && WD.LOW.jail; return !!J && x >= J.c0 && x <= J.c1 && y >= J.ct - 56 && y <= J.fy + 30; };
  const inWalk = (w) => { const q = M.jailWalk(w.x, w.y); return Math.abs(q[0] - w.x) < 0.5 && Math.abs(q[1] - w.y) < 0.5; };

  function jailGo(x, y) {
    if (!S || !S.me || !jailHere()) return;
    const w = S.me, [tx, ty] = M.jailWalk(x, y);
    if (!inWalk(w)) { const q = M.jailWalk(w.x, w.y); w.x = q[0]; w.y = q[1]; place(w); }
    if (S.kw && S.kw.on) kwHalt();
    S.el.classList.add('went'); S.arrive = null; S.freeUntil = 0;
    w.path = Math.hypot(tx - w.x, ty - w.y) > 1 ? [[tx, ty]] : null; w.lag = 0;
    setMoving(w, !!w.path); kick();
    ripple(tx, ty);
  }
  const jailAt = (x, y) => { if (!S || !S.jail) return null; let best = null; for (const w of S.jail.values()) { const sc = scaleAt(w.y) * HS; if (Math.abs(x - w.x) <= 36 * sc && y <= w.y + 8 && y >= w.y - 150 * sc && (!best || w.y > best.y)) best = w; } return best; };

  function jwOpen() {
    if (!S) return;
    if (!S.jw) {
      const w = S.jw = document.createElement('div');
      w.className = 'cy-jw'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'false'); w.setAttribute('aria-labelledby', 'cyjw-t');
      w.addEventListener('click', (e) => { if (e.target.closest('[data-jw-x]')) jwClose(); });
      w.addEventListener('keydown', (e) => { if (e.key === 'Escape') jwClose(); });
      S.el.appendChild(w);
    }
    jwRender(); jailLoad();
    const x = S.jw.querySelector('[data-jw-x]'); if (x) x.focus();
  }
  function jwClose() { if (S && S.jw) { S.jw.remove(); S.jw = null; } }
  function jwRender() {
    const w = S && S.jw; if (!w) return;
    const me = X.login(), mj = meJail(), list = JAIL.list.slice();
    if (mj && !list.some((e) => e.l === me)) list.unshift({ l: me, n: (X.hero() && X.hero().name) || me, u: mj.until });
    const row = (e) => { const why = JAIL.staff && JAIL.why ? JAIL.why[e.l] : null, self = e.l === me;
      return `<li class="${self ? 'me' : ''}"><b>${esc(e.n || e.l)}${self ? ' (ты)' : ''}</b><span>${esc(jailDay(e.u))}</span>`
        + (self && mj && mj.reason ? `<em>Причина: ${esc(mj.reason)}</em>` : '')
        + (why ? `<em>${why.reason ? 'Причина: ' + esc(why.reason) : 'Причина не указана'}${why.by ? ' · выдал ' + esc(why.by) : ''} · ${why.src === 'channel' ? 'бан канала' : 'бан платформы'}</em>` : '') + '</li>'; };
    w.innerHTML = `<div class="cy-jw-h"><b id="cyjw-t">Тюрьма канала</b><button type="button" class="cy-jw-x" data-jw-x aria-label="Закрыть">×</button></div>`
      + (list.length ? `<p class="cy-jw-n">Сидят: ${list.length}</p><ul class="cy-jw-l">${list.map(row).join('')}</ul>` : '<p class="cy-jw-n">Клетка пуста.</p>')
      + (JAIL.staff ? '<p class="cy-jw-f">Снять бан - стример или модератор канала.</p>' : '');
  }

   
  function mineView(h) {
    const cur = h.wardrobe && h.wardrobe.cur && Object.keys(h.wardrobe.cur).length ? h.wardrobe.cur : h.look;
    return { n: h.name || X.login(), lv: h.level, lk: cur || null, g: h.gear || {}, gh: h.ghost ? 1 : 0, aw: h.aw };
  }
  function spawnMe() {
    const h = X.hero(); if (!h) return;
    let p = null; try { p = JSON.parse(sessionStorage.getItem(posKey()) || 'null'); } catch {}
    const d0 = inTown() ? TOWN.L.spawn : [M.QW + 660, 1010];
    const [x, y] = S.map.nearest(p ? p[0] : d0[0], p ? p[1] : d0[1]);
    const v = mineView(h);
    S.me = addWalker(X.login(), v, x, y, true); S.me.vKey = JSON.stringify(v);

    if (meJail() && jailHere()) { const J = WD.LOW.jail; S.me.x = J.seats[0][0]; S.me.y = J.seats[0][1]; place(S.me); centerOn((J.c0 + J.c1) / 2, J.fy - 40); return; }
    centerOn(x, y);
  }
  const posKey = () => 'lgCityPos' + (S && S.town && S.town !== 'fair' ? ':' + S.town : '');
  const savePos = () => { try { if (S && S.me && !meJail()) sessionStorage.setItem(posKey(), JSON.stringify([Math.round(S.me.path ? S.me.path[S.me.path.length - 1][0] : S.me.x), Math.round(S.me.path ? S.me.path[S.me.path.length - 1][1] : S.me.y)])); } catch {} };


  function mineOpen() {
    if (!S) return;
    const say = (m) => { hud(m); if (X.toast) X.toast(m); clearTimeout(S.bmT); S.bmT = setTimeout(() => S && hud(), 4000); };
    if (!mnOn() || !X.openMine) { say('Шахта пока закрыта - откроется скоро'); return; }
    const c = inTown() ? TOWN.id : 'home', mn = X.hero().mn || {};

    if (!mn[c]) { say(mn.home && mn.home.tc ? 'Шахты городов пока закрыты - копать можно в домашней шахте, в Ярмарке' : 'Шахта этого города откроется, когда округ станет нашим'); return; }

    if (c === 'home' && mn['t-v3']) { X.openMine(null, ['home', 't-v3']); return; }
    X.openMine(c);
  }
   



  const buildSay = (B) => (inTown() && B && B.build && window.LGTownGen ? window.LGTownGen.buildMsg(B, Date.now()) : '');
   
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
    if (document.hidden || !S.root.classList.contains('on')) return;
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
    if (want === CAMP) {
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
      await window.LGTownGen.prep(want, (f) => townJs(`${f}?v=${V.vg || ''}`));
      if (TOWN.id !== want) return;
      TOWN = { id: want, meta: t, acc: { own: !!t.own, k: +t.k || 2, why: t.why || '', ...(t.home ? { home: 1 } : {}) }, L: window.LGTownGen.generate(townMeta(t)) };
    } catch (e) {
      console.warn('[город] город округа', want, e);
      TOWN = { id: 'fair', L: null, acc: null, meta: null }; townSet('fair');
      if (fairGone()) { root.innerHTML = '<div class="panel cy-err"><p class="lead">Город края не загрузился — обнови страницу.</p></div>'; return; }
      if (X.toast) X.toast('Этот город сейчас закрыт — ты на Ярмарке', true);
    }
    if (root.isConnected && root.classList.contains('on')) open(root, X);
  }

  function townGo(id, msg) {
    id = id || 'fair';
    if ((id === 'fair' || id === CAMP) && fairGone()) id = String(homeOf().id);
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
    b.hidden = !((h && (h.tw || h.cp)) || inTown()) || !!(X.inQuest && X.inQuest());
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
    const list = (T && T.list) || [], fairOk = !(T && T.gone) && (!(T && T.quest) || !!T.fair);
    const campRow = cpOn() ? (() => { const c = campName(); return `<button type="button" data-town="${CAMP}"${TOWN.id === CAMP ? ' aria-current="true"' : ''}><span class="cy-tpi" aria-hidden="true">⛺</span><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></button>`; })() : '';
    const row = (t) => `<button type="button" data-town="${esc(t.id)}"${t.id === TOWN.id ? ' aria-current="true"' : ''}><span class="cy-tpi" aria-hidden="true">${BIO_ICO[t.biome] || '🏘'}</span><b>${esc(t.town)}</b><small>${'★'.repeat(t.danger)} ${sizeRu(t)} · ${esc(BIO_RU[t.biome] || '')}${t.own || (t.home && +t.k <= 1) ? '' : ` · цены ×${String(+t.k || 2).replace('.', ',')}`}${t.home ? ' · край отряда' : ''}${WHY_RU[t.why] ? ' · ' + WHY_RU[t.why] : ''}</small></button>`;
    box.innerHTML = `<div class="cy-tph"><b>Города</b><button type="button" class="cy-tpx" aria-label="Закрыть">×</button></div><div class="cy-tpl">${fairOk ? `<button type="button" data-town="fair"${TOWN.id === 'fair' ? ' aria-current="true"' : ''}><span class="cy-tpi" aria-hidden="true">🎪</span><b>Ярмарка</b><small>${T && T.quest ? 'отряд здесь' : 'всегда открыта'}</small></button>` : ''}${T && T.quest ? '' : campRow}${list.map(row).join('')}</div>`
      + `<p class="note">${list.length ? '' : 'Других городов пока нет. '}Город округа открывается, когда канал захватит округ; на стриме — пока отряд стоит в округе (участникам отряда).</p>`;
    box.querySelector('.cy-tpx').onclick = () => townPick(false);
    box.querySelectorAll('[data-town]').forEach((x) => { x.onclick = () => { townPick(false); townGo(x.dataset.town); }; });
  }

   
  function open(root, ctx) {
    X = ctx;
    const h = X.hero();

    if (!townInit) {
      townInit = true;
      let t = townGet();
      try { const q = new URLSearchParams(location.search).get('town'); if (q === CAMP) { t = CAMP; townSet(CAMP); } } catch {}
      const hp0 = homePick(h && h.hm); if (hp0 && hp0.id === CAMP && t === 'fair') t = CAMP;
      if (t !== 'fair' && h && (t === CAMP ? cpOn() : h.tw) && TOWN.id === 'fair') TOWN = { id: t, L: null, acc: null, meta: null };
    }

    if (meJail() && TOWN.id !== 'fair') TOWN = { id: 'fair', L: null, acc: null, meta: null };
    if (!meJail()) { const hp = homePick(h && h.hm); if (hp && hp.id !== CAMP && (TOWN.id === 'fair' || TOWN.id === CAMP)) { TOWN = { id: hp.id, L: null, acc: null, meta: null }; townSet(hp.id); } }
    if (TOWN.id !== 'fair' && !TOWN.L) { townPrep(root); return; }
    if (!S || !S.root.isConnected || S.root !== root || S.st !== X.style() || S.town !== TOWN.id) {

      if (useGL() && !(window.PIXI && window.PIXI.autoDetectRenderer)) {
        if (!glWait) {
          glWait = true;
          root.innerHTML = '<p class="empty">Город строится на глазах…</p>';
          window.LGCityGL.load(window.LG_CITYV).catch((e) => { GLFAIL = 'Pixi не загрузился'; console.warn('[город]', e); })
            .then(() => { glWait = false; if (root.isConnected && root.classList.contains('on')) open(root, X); });
        }
        return;
      }
      if (S) { leave(); timers(false); clearInterval(S.sighT); jwClose(); if (S.raf) cancelAnimationFrame(S.raf); if (S.gl) try { S.gl.destroy(); } catch {} }
      S = build(root, useGL()); if (!S) return;
      { const cs = S.el.querySelector('.cy-cap'); if (cs) { cs.value = String(S.capV || 0); cs.onchange = () => { if (!S) return; S.capV = +cs.value || 0; capSet(S.capV); lodPick(performance.now()); if (S.gl) S.gl.dirty(); hud(); kick(); }; } }
      bindInput(); olWarm(); othBtn(); fsBtn(); townBtn();
      if (S.q.lv) setQuality(S.q.lv);
      new ResizeObserver(() => layout()).observe(S.root);
      window.addEventListener('resize', () => layout());
    }
    document.documentElement.classList.add('cy-full');
    layout();
    chatInit();
    if (!S.me && h) spawnMe();

    if (S.me && !meJail() && WD && WD.LOW && WD.LOW.jail && !inTown()) { const J = WD.LOW.jail; if (S.me.x >= J.c0 - 10 && S.me.x <= J.c1 + 10 && S.me.y <= J.fy + 4 && S.me.y >= J.back) { const B = WD.BUILDINGS.find((b) => b.id === 'jail'); const [x, y] = S.map.nearest(B ? B.door.x + 120 : J.c0, B ? B.door.y : J.fy + 30); S.me.x = x; S.me.y = y; S.me.path = null; S.me.face = 1; S.me.sc = 0; place(S.me); centerOn(x, y); } }
    if (!h) { hud('Героя пока нет — он появится, когда ты напишешь в чат на стриме'); return; }
    hud(); enter();
    hwApply();
    buildStart();
    setTimeout(() => { if (S) S.el.classList.add('went'); }, 6000);
  }

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
  function close() { clearInterval(BT); BT = 0; newsClose(); if (S) { clearInterval(S.sighT); S.sighT = 0; jwClose(); } document.documentElement.classList.remove('cy-full'); try { if (S && document.fullscreenElement === S.el) document.exitFullscreen(); } catch {} if (!S) return; savePos(); leave(); timers(false); closePanel(); if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; }
  



  let SLEPT = null;
  function sleep() {
    if (!S || !S.root) return;
    const root = S.root;
    if (document.fullscreenElement && root.contains(document.fullscreenElement)) return;
    clearInterval(BT); BT = 0;
    try { savePos(); closePanel(); newsClose(); leave(); timers(false); clearInterval(S.sighT); S.sighT = 0; jwClose(); } catch (e) { console.warn('[город] sleep', e); }
    if (S.raf) cancelAnimationFrame(S.raf); if (S.gl) try { S.gl.destroy(); } catch {}
    S = null; SLEPT = root; root.innerHTML = '';

    if (window.LGChatOne) setTimeout(() => window.LGChatOne.place(), 0);
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

    jail: (d) => jailSet(d),

    jailOpen: () => jwOpen(),
    board: { render: (box, list) => newsBoard(box, list), read: (i) => newsRead(i) },
    open, close, sleep, wake,
    onEvent: (d) => { if (S && S.inCity) apply(d); },

    bubble: (l, t, id) => { if (S && S.inCity) bubble(l, t, id); }, unbubble: (id) => { if (S) unbubble(id); },
    heroChanged,
    forgeStart: (it, tg) => { if (S && S.panelId === 'anvil') FX.start(it, tg); },
    forgeFx: (x) => { if (S && S.panelId === 'anvil') FX.result(x); },

    forgeCancel: () => { try { if (!S || S.panelId !== 'anvil') return; const st = FX.q('.cyf-stage'), sl = FX.slot(), it = FX.cur; FX.reset(); if (st) st.classList.remove('work', 'wait'); if (sl) sl.classList.remove('work'); if (it) FX.item(it); } catch (e) {} },
    storeRes: (x) => ST.res(x),

    anvil: { body: (h) => forgeBody(h), mount: (P, ctx) => { X = X || ctx; forgeAfter(X.hero(), P); }, pick: (uid, P) => pickForge(uid, P), uid: () => FX.uid, off: () => igOff() },

    npcs: () => (S && S.gl && S.gl.npcs ? S.gl.npcs() : []),
    room: (id) => openPanel(id),
    debug: () => S && { jl: jlOn(), jb: !!(S.map && S.map.BUILDINGS.some((b) => b.id === 'jail')), me: S.me && [S.me.x, S.me.y], others: [...S.others.keys()], hidden: S.hidden, ghosts: S.ghosts.size, n: S.n, camX: S.camX, camY: S.camY, z: S.z, inCity: S.inCity, render: S.gl ? (S.gl.mode || 'pixi…') : 'svg', fail: GLFAIL, lod: { lv: S.q.lv, r: S.q.r && +S.q.r.toFixed(2), lock: S.q.lock, res: S.gl && S.gl.res ? S.gl.res() : null, cull: [...S.others.values()].filter((w) => w.cull).length, nolab: [...S.others.values()].filter((w) => w.nolab).length }, gl: S.gl && S.gl.stats(), ol: S.ol && S.ol.stats(), npc: WD.BUILDINGS.filter((b) => b.hw).map((b) => b.id) },

    peek: () => S && { nf: S.gl ? (S.gl.nf || 0) : -1, z: S.z, w: [...S.others.values()].map((w) => [w.l, w.x, w.y, w.path ? 1 : 0, w.cull ? 1 : 0, w.gl ? (w.gl.root.visible ? 1 : 0) : (w.shown ? 1 : 0), w.gl ? w.gl.root.alpha : 1]) },

    kw: () => S && { free: S.me ? S.map.free(S.me.x, S.me.y) : null, near: (kwNear() || {}).id || null, panel: S.panelId, on: !!(S.kw && S.kw.on), hint: S.ehK || null },
    hideOthers: (on) => S && setHidden(!!on),

    awb: (l, i = 0) => { if (!S) return null; const w = l === X.login() ? S.me : S.others.get(l); if (!w) return null;
      if (!S.gl) { const e = w.nm && w.nm.querySelectorAll('.awb')[i]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      const h = S.gl.badgeOf && S.gl.badgeOf(w, i); if (!h) return null; const r = S.view.getBoundingClientRect(); return { x: r.left + (h.x - S.camX) * S.z, y: r.top + (h.y - S.camY) * S.z }; },
    tradeMenu: (l, cx, cy) => { const w = S && S.others.get(l); if (w && window.LGTrade) { window.LGTrade.mount(X, S.el); window.LGTrade.menu(l, w.v, cx, cy); } },
    quality: (lv) => { if (!S) return; S.q.fixed = lv != null; if (lv != null) setQuality(+lv); },

    town: (id) => { townInit = true; townGo(String(id || 'fair')); },
    questChanged: () => { try { if (S && S.el) { townBtn(); townPick(false); } } catch (e) {} },
    go: (x, y) => S && goPoint(x, y), goBuilding: (id) => S && goBuilding(id), center: (x, y) => { if (S) { S.freeUntil = Date.now() + 8000; centerOn(x, y); } }, panel: (id) => S && openPanel(id),
  };
})();
