'use strict';
/* Сайт Легиона: персонаж (кукла со слотами, сумка, карточка вещи) и состав Легиона.
   Данные — /api/me, /api/legion; надеть/снять — /api/equip, /api/unequip.
   window.LG_DEMO (демо-сборка для выбора дизайна) подменяет сеть на локальные данные. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SU = window.LGSiteUi;   // 25.10: общие части сайта (packages/site-ui)
  const esc = SU.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  const DEMO = window.LG_DEMO || null;
  // 25.10: данные игры (классы, редкости, слоты, броня, таблицы по умолчанию) - одна библиотека с сервером (packages/game-data, /lib/game-data.js)
  const GD = window.LGGameData;
  // 18.10: время сервера — откаты еды и воскрешения считаем от него (часы у зрителя могут спешить или отставать)
  let OFF = 0;
  const now = () => Date.now() + OFF;
  const clock = (t) => { const d = (+t || 0) - Date.now(); if (Number.isFinite(d)) OFF = Math.abs(d) > 1500 ? d : 0; };
  const api = (p, body) => (DEMO ? DEMO.api(p, body) : fetch(p, { ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(20000) } : {}) })   // 23.10: не ждём вечно — через 20 с «нет связи», кнопки оживают
    .then((r) => { try { const d = Date.parse(r.headers.get('date') || ''); if (d) clock(d + 500); } catch {} return r.json(); }))
    .catch(() => ({ ok: false, error: 'нет связи с сайтом' }));
  /* 19.10: звания зрителей (награды платформы) — значок у ника с подсказкой; aw: [{ id, n: название, d: подсказка, i: значок, t: оттенок }].
     Нажатие показывает подсказку и на телефоне (title там не видно) */
  // 19.10: значок — SVG, а не символ шрифта: у символа ✦ в разных шрифтах своё смещение (был сдвинут вниз-влево)
  const AW_STAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0.8 9.7 6.3 15.2 8 9.7 9.7 8 15.2 6.3 9.7 0.8 8 6.3 6.3Z" fill="currentColor"/></svg>';
  const awb = (aw) => (Array.isArray(aw) ? aw.slice(0, 3).map((a) => `<span class="awb aw-${esc(String(a.t || a.id).replace(/[^a-z0-9-]/gi, ''))}" role="img" tabindex="0" aria-label="${esc(a.n)}: ${esc(a.d)}" data-awn="${esc(a.n)}" data-awd="${esc(a.d)}">${(a.i || '✦') === '✦' ? AW_STAR : esc(a.i)}</span>`).join('') : '');
  /* 23.10: подсказка значка звания — маленькое окошко у самого значка (было — тост внизу экрана): нажатие/тап, у мыши — наведение.
     Закрывается тапом мимо, Esc, через 4 с. Одно окошко на весь сайт; Город, где ник нарисован картинкой, зовёт его сам: awPop(a, рамка, ключ) */
  let awEl = null, awKey = '', awT = 0, awFor = null;
  function awHide(pre) { if (!awEl || awEl.hidden || (pre && !awKey.startsWith(pre))) return; clearTimeout(awT); awEl.hidden = true; awKey = ''; awFor = null; }
  function awPop(a, r, key) {
    if (!a || !a.n) return;
    if (!awEl) { awEl = document.createElement('div'); awEl.className = 'awpop'; awEl.setAttribute('role', 'tooltip'); awEl.hidden = true; document.body.appendChild(awEl); }
    const html = `<b>${esc(a.n)}</b>${a.d ? `<span>${esc(a.d)}</span>` : ''}`;
    if (awEl.innerHTML !== html) awEl.innerHTML = html;
    awEl.hidden = false; awKey = key || '';
    const vw = document.documentElement.clientWidth, w = awEl.offsetWidth, h = awEl.offsetHeight;
    const x = Math.max(8, Math.min(vw - w - 8, (r.left + r.right) / 2 - w / 2)), up = r.top - h - 8 >= 8;
    awEl.style.left = x + 'px'; awEl.style.top = (up ? r.top - h - 8 : r.bottom + 8) + 'px'; awEl.dataset.up = up ? '1' : '';
    awEl.style.setProperty('--ax', Math.max(12, Math.min(w - 12, (r.left + r.right) / 2 - x)) + 'px');
    clearTimeout(awT); awT = setTimeout(() => awHide(), 4000);
  }
  const awOf = (b) => ({ n: b.dataset.awn || b.getAttribute('aria-label') || b.title || '', d: b.dataset.awd || '' });
  const awOpen = (b) => { awPop(awOf(b), b.getBoundingClientRect(), 'el'); awFor = b; };
  document.addEventListener('click', (e) => { const b = e.target && e.target.closest && e.target.closest('.awb'); if (!b) return; e.preventDefault(); e.stopPropagation(); if (awFor === b && e.pointerType !== 'mouse') return awHide(); awOpen(b); }, true);   // второй тап по тому же значку — закрыть
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return awHide();
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('awb')) { e.preventDefault(); awOpen(e.target); }
  });
  document.addEventListener('pointerdown', (e) => { if (!awEl || awEl.hidden || (e.target.closest && e.target.closest('.awb, .awpop'))) return; awHide(); }, true);   // тап мимо
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const b = e.target.closest && e.target.closest('.awb'); if (b) awOpen(b); });
  document.addEventListener('pointerout', (e) => { if (e.pointerType !== 'mouse' || awKey !== 'el') return; const b = e.target.closest && e.target.closest('.awb'); if (b && !(e.relatedTarget && b.contains(e.relatedTarget))) awHide(); });
  window.addEventListener('scroll', () => awHide(), { capture: true, passive: true });
  const toast = (t, err) => SU.toast(t, err);   // 25.10: всплывающая надпись #toast - packages/site-ui (2,8 с)
  const plural = SU.plural;   // 25.10: packages/site-ui (ui-kit)
  const D = () => window.MDDoodle;
  /* ---------- стиль человечков: сайт берёт из него цвета обводки, названия вещей, ролей, характеристик и монет ---------- */
  // 19.10: в доке OBS сборки человечков нет — стиль канала из LG_STYLES (первый — стиль канала)
  const sty = () => { try { return (D() && D().active) || (window.LG_STYLES && window.LG_STYLES[0]) || 'legion'; } catch { return 'legion'; } };
  // 28.10: оформление сайта для каждого стиля - одна таблица с сервером (packages/site-ui: STYLE_SKIN, skinOf; нет стиля - «Арсенал»)
  const names = () => { try { return (D().names || {})[sty()] || {}; } catch { return {}; } };
  const partCache = {};
  function part(n) { const k = sty() + ':' + n; if (!(k in partCache)) { try { partCache[k] = D().part(n) || null; } catch { partCache[k] = null; } } return partCache[k]; }
  // 28.10: тексты сайта в голосе стиля (группы Легиона, сумка, кнопки) - packages/site-ui STYLE_TEXT, у всех 7 стилей
  const word = (k, fb) => SU.styleText(sty(), 'copy', k) || fb;
  const nameOf = (it) => { const n = names().items; return (n && n[it.id] && n[it.id].name) || it.baseName || it.name; };
  // 18.10: у «Легиона» нет names.json — его названия исходные (baseName с сервера, роли — как в Легионере)
  const ROLE_BASE = GD.roleNames();
  const roleOf = (id, fb) => (names().roles || {})[id] || (sty() === 'legion' && ROLE_BASE[id]) || fb || id;
  const stLabel = (k) => { const h = part('hero'), l = h && h.stats && h.stats[k] && h.stats[k].label; const t = l ? String(l).replace(/^[^\p{L}]+/u, '').trim() : ''; return t || ST[k] || XST[k] || k; };
  function applyStyle() {
    const root = document.documentElement; root.dataset.style = sty();
    if (!DEMO) root.dataset.skin = SU.skinOf(sty());
    let e = document.getElementById('dd-css'); if (!e) { e = document.createElement('style'); e.id = 'dd-css'; document.head.appendChild(e); }
    try { e.textContent = (D() && D().style && D().style.css) || ''; } catch { e.textContent = ''; }
  }
  const jhash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* ---------- словари ---------- */
  const SLOTS = ['helmet', 'weapon', 'armor', 'shield', 'trinket'];
  const SLOT = GD.slotNames();
  const ST = { hp: 'Макс. здоровье', atk: 'Физ. урон', mag: 'Магия', def: 'Броня' };
  const STW = { hp: 0.35, atk: 1, mag: 1, def: 1.2 };   // для стрелки «лучше надетого»
  // 20.10: характеристики второго ряда (legionary/stats.js) — видны, только если они открыты герою (h.xs: тестерам, пока statsPublic выкл.)
  const XST = { ...GD.xstats.label };
  const XSTW = { crit: 0.8, critDmg: 0.25, dodge: 0.8, pierce: 0.2, healPow: 0.4, luck: 0.2, resist: 0.6 };
  const XPCT = { crit: 1, critDmg: 1, dodge: 1, pierce: 1, healPow: 1 };   // в процентах
  const stOk = (k, h) => !!ST[k] || !!(h && h.xs && XST[k]);
  const stNum = (k, v) => `${v > 0 ? '+' : ''}${String(v).replace('.', ',')}${XPCT[k] ? '%' : ''}`;
  const RAR = GD.rarityNames();
  const RORD = Object.fromEntries(GD.RARITIES.map((r) => [r, GD.RARITIES.length - 1 - GD.rarityRank(r)]));   // лучшие - первыми
  const GROUP_OF = Object.fromEntries([...GD.classIds(), 'recruit'].map((r) => [r, GD.groupOf(r)]));

  /* ---------- значки (простые, одной толщины линии) ---------- */
  const IC = {
    hp: '<path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/>',
    atk: '<path d="M19.5 4.5 20 4l-.5 4.5L9.5 18.5l-4-4zM7.5 16.5l-3 3M4 15l5 5"/>',
    mag: '<path d="M12 3.5l1.9 5.4 5.6 1.6-5.6 1.7L12 17.6l-1.9-5.4-5.6-1.7 5.6-1.6zM18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    def: '<path d="M12 3.5l7 2.8v5.1c0 4.6-3 7.8-7 9.6-4-1.8-7-5-7-9.6V6.3z"/>',
    crit: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
    critDmg: '<path d="M13.5 2.5 6 13.5h5.5l-1 8 7.5-11h-5.5z"/>',
    dodge: '<path d="M4 17c3-1 4.5-3 5-6M9 11c.5-3 2.5-5.5 6-6.5M14 19c2-1.5 3.5-4 4-7"/><circle cx="17.5" cy="5" r="1.6"/>',
    pierce: '<path d="M3 12h14M13 7l5 5-5 5"/><path d="M20.5 5v14"/>',
    healPow: '<path d="M12 4v16M4 12h16"/><path d="M17.5 4.5l2 2M19.5 4.5l-2 2"/>',
    luck: '<path d="M12 12c-3-5-7-4-7-1s4 3 7 1zM12 12c5-3 4-7 1-7s-3 4-1 7zM12 12c3 5 7 4 7 1s-4-3-7-1zM12 12c-5 3-4 7-1 7s3-4 1-7z"/>',
    resist: '<path d="M12 3.5l7 2.8v5.1c0 4.6-3 7.8-7 9.6-4-1.8-7-5-7-9.6V6.3z"/><path d="M12 8.5l1.2 2.5 2.6.4-1.9 1.8.5 2.6L12 14.5l-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"/>',
    coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    hammer: '<path d="M13.5 3.5l7 7-2.6 2.6-7-7zM12.3 8.7 3.6 17.4l3 3 8.7-8.7"/>',
    ghost: '<path d="M6 20V10a6 6 0 0 1 12 0v10l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z"/><path d="M10 10h.01M14 10h.01"/>',
    bag: '<path d="M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.6 14.6c2.6-.3 4.4 1.3 4.9 4.4"/>',
    chev: '<path d="M7 10l5 5 5-5"/>',
    twitch: '<path d="M4.5 3 3.5 6.5V19h4v2.5h2.4l2.4-2.5h3.4l4.3-4.4V3zM18.5 13.8l-2.5 2.6h-4l-2.4 2.4v-2.4H6.4V4.8h12.1z" fill="currentColor" stroke="none"/><path d="M15 7.5v4M11 7.5v4"/>',
  };
  const ico = (k, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[k] || ''}</svg>`;

  /* ---------- рисунки вещей: из того же движка, что человечки на стриме ----------
     25.10: рисунки, рамки и силуэты пустых слотов - в библиотеке инвентаря (packages/inventory, /lib/inventory.js): одна на сайт,
     шахту, «Город» и вкладку «Поход». Движок и части стиля - сайта (D, part: стиль канала) */
  const INV = window.LGInventory;
  INV.configure({ engine: () => D(), part: (n) => part(n) });
  const still = INV.still, art = (it, cls) => INV.art(it, cls), lgx = INV.lgx;
  // 26.10: руда шахты — кучка (q осколков): «4 шт. + 37 оск.» (окно скупщика, docs/mine.md)
  const oreQty = (q) => (INV.oreQty ? INV.oreQty(q) : String(q));
  const auraLine = (it, cls) => (it && it.aura && it.aura.name ? `<p class="${cls}">${esc(it.aura.icon || '✦')} <b>${esc(it.aura.name)}</b> — ${esc(it.aura.text || '')}<span>Аура на весь отряд в бою, пока владелец жив</span></p>` : '');
  const EMPTY = INV.EMPTY;

  /* ---------- человечек ---------- */
  // 26.10 (ТЗ «старт для стримера», часть 4): сборка сайта - только стиль канала; герой с личным стилем (Печать Метаморфозы,
  // метка ps в облике) - его стиль догружается отдельным файлом (без ядра человечков), один раз, потом сайт перерисовывается
  const PACKS = {};
  function stylePack(id) {
    if (!/^[\w-]{1,30}$/.test(id) || PACKS[id] || DEMO) return;
    try { if (D() && D().styles && D().styles[id]) { PACKS[id] = 1; return; } } catch {}
    PACKS[id] = 1;
    const sc = document.createElement('script');
    sc.src = (window.LG_BASE || '') + '/stylepack.js?s=' + encodeURIComponent(id);
    sc.onload = () => setTimeout(() => window.LG && window.LG.rerender(true), 0);
    document.head.appendChild(sc);
  }
  // 19.10: kit — 'battle' (боевой вид: оружие, шлем, доспех, амулет) или 'peace' (походный: косметика, руки свободны)
  function doodle(login, hero, mood, kit) {
    const d = D(); if (!d || !d.jDoodle) return '';
    const seed = jhash(String(login).toLowerCase());
    // 18.10: облик — прямо из героя (по нику), а не через общую карту по хэшу ника: у двух ников с одним хэшем был один облик
    const look = hero ? hero.look || null : undefined, who = String(login).toLowerCase();
    if (look && look.ps) stylePack(look.ps);   // 26.10: личный стиль героя (Печать Метаморфозы) - догрузить его рисунок
    try {
      if (hero && hero.ghost) return d.jDoodle(seed, 'happy', false, { ghost: true, who }, look);
      if (hero && kit === 'peace') return d.jDoodle(seed, 'walk', false, { alive: true, gear: hero.gear || {}, who, kit, ...(hero.minerHat ? { minerHat: true } : {}) }, look);   // 25.10: каска шахтёра в шахте
      return d.jDoodle(seed, mood || 'stern', false, hero ? { alive: true, armed: true, gear: hero.gear || {}, who, ...(kit ? { kit } : {}) } : { who }, look);
    } catch (e) { console.warn(e); return ''; }
  }

  // 25.10: человечек на улице «Города» и в шахте - один путь (мирный вид, без анимаций SVG): v - { lk - облик, g - снаряжение, gh - призрак },
  // o.minerHat - каска шахтёра (шахта). Раньше у шахты была своя копия (свой still, свой сбор героя) - облик расходился с «Городом»
  const figSvg = (login, v, o) => String(doodle(login, { look: (v && v.lk) || null, gear: (v && v.g) || {}, ghost: !!(v && v.gh), ...(o && o.minerHat ? { minerHat: true } : {}) }, 'walk', 'peace'))
    .replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*?(\/>|>[\s\S]*?<\/\1>)/g, '');

  /* ---------- состояние ---------- */
  let TIPS = {}, TIPHERO = null;
  let ME = null, filter = 'all', cls = 'all', sel = null, sheet = false, busy = false, last = '';
  // 18.10: в центре вкладки «Персонаж» — «Снаряжение» (кукла со слотами) или «Облик» (гардероб)
  let view = 'gear'; try { const v = localStorage.getItem('lgView'); if (v === 'look' || v === 'skills' || v === 'ach' || v === 'log') view = v; } catch {}   // 23.10: + «Журнал» (была отдельная вкладка)   // 23.10: + «Достижения» (achievements.js)   // 20.10: + «Навыки» (skills.js)
  let kit = 'battle'; try { if (localStorage.getItem('lgKit') === 'peace') kit = 'peace'; } catch {}   // 19.10: вид героя на кукле
  const mqWide = SU.media('wide');   // 25.10: (min-width: 1100px) - packages/site-ui

  /* ---------- вкладки ---------- */
  // 17.10: на узком экране вкладки прокручиваются — выбранную показываем целиком (после раскладки и шрифтов — ещё раз)
  const tabSeen = (b) => { const go = () => { try { const T = b.parentElement; if (T.scrollWidth > T.clientWidth + 1) T.scrollLeft = Math.max(0, b.offsetLeft - T.offsetLeft - (T.clientWidth - b.offsetWidth) / 2); } catch (e) {} }; go(); setTimeout(go, 120); setTimeout(go, 900); };
  window.addEventListener('load', () => { const b = document.querySelector('.tabs button[aria-current]'); if (b) tabSeen(b); });
  /* 23.10 (баг с телефона): сайт обновили, а вкладка браузера открыта со старым кодом (телефон держит страницу днями) —
     и «Город» грузился старым: лавка в старом виде. Версия кода сайта — в LG_SITEV (сервер, static.ts); сверяем с /site/ver
     при входе в «Город», при возврате на вкладку (не чаще раза в минуту) — разошлась: перезагрузка на свежий код
     (раздел запомнен в lgTab). Не в доке OBS и не посреди ввода текста */
  const SITEV = window.LG_SITEV || '';
  let verAt = 0, verP = null, siteOld = false;
  function verCheck(gap = 60000) {
    if (!SITEV || window.LG_DOCK) return Promise.resolve(false);
    if (siteOld) return Promise.resolve(true);
    if (verP) return verP;
    if (Date.now() - verAt < gap) return Promise.resolve(false);
    verAt = Date.now();
    verP = fetch('/site/ver', { cache: 'no-store', credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.v && j.v !== SITEV) siteOld = true; return siteOld; }, () => false).finally(() => { verP = null; });
    return verP;
  }
  const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && !!String(a.value || '').trim(); };
  function verReload() { if (typing()) return false; try { location.reload(); } catch {} return true; }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) verCheck().then((old) => { if (old && !$('#tab-streamer').classList.contains('on')) verReload(); }); });
  window.LG_VER = { check: verCheck, reload: verReload, old: () => siteOld };   // «Город» (city.js) — перед входом в лавку
  // 23.10: короткая подсказка под вкладкой («Вы сейчас в походе»)
  let tabNoteT = 0;
  function tabNote(b, text) {
    let n = document.getElementById('tabNote');
    if (!n) { n = document.createElement('div'); n.id = 'tabNote'; n.className = 'tab-note'; n.setAttribute('role', 'status'); document.body.appendChild(n); }
    const r = b.getBoundingClientRect();
    n.textContent = text; n.hidden = false;
    n.style.left = Math.max(8, Math.min(window.innerWidth - n.offsetWidth - 8, r.left + r.width / 2 - n.offsetWidth / 2)) + 'px';
    n.style.top = (r.bottom + 6) + 'px';
    clearTimeout(tabNoteT); tabNoteT = setTimeout(() => { n.hidden = true; }, 2500);
  }
  function tab(id) {
    if (id !== 'city') townEntry = 0;   // ушли из города, зашедшего с «Похода», — блокировка снова действует
    if (id === 'city' && cityLocked()) { const b = $('.tabs button[data-tab="city"]'); if (b) tabNote(b, 'Вы сейчас в походе'); return; }
    if (siteOld && !window.LG_DOCK) { try { localStorage.setItem('lgTab', id); } catch {} if (verReload()) return; }
    if (id === 'soc') { lgv = 'soc'; id = 'legion'; }   // 23.10: «Соц. рейтинг» — теперь вид вкладки «Легион (рейтинг)»
    $$('.tabs button').forEach((b) => { if (b.dataset.tab === id) { b.setAttribute('aria-current', 'page'); tabSeen(b); } else b.removeAttribute('aria-current'); });
    $$('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + id));
    if (!DOCK) try { localStorage.setItem('lgTab', id); } catch {}
    document.body.classList.toggle('sm-on', id === 'streamer');
    if (id === 'streamer' && window.scrollY) window.scrollTo(0, 0);   // страница в режиме стримера не прокручивается — с самого верха
    if (id === 'streamer') openStreamer(); else if (SM.frames.panel) smVisible();
    if (id === 'legion') legOpen();
    if (id === 'news' && window.LGNews) window.LGNews.open();   // 18.10: новости игры (news.js)
    // 23.10: «Город» — сначала сверить версию сайта (старая страница грузила старый «Город»); проверка не прошла — входим как есть
    if (id === 'city') verCheck(15000).then((old) => { if (old && verReload()) return; if ($('#tab-city').classList.contains('on')) openCity(); });
    else if (window.LGCity) window.LGCity.close();   // 20.10: «Город» (city.js)
    if (id !== 'city') verCheck();
    questTab(id === 'quest');   // 22.10: вкладка «Поход» (quest.js)
    if (id === 'world') openWorld(); else if (window.LGWorld) window.LGWorld.close();   // 23.10: «Карта мира» (worldmap.js)
    bfSoon();   // 24.10: «Отправить баг» — в другом разделе другие панели внизу
    if (window.LGStart) window.LGStart.tabChanged(id);   // 26.10: переключатель «Зритель / Стример» (start.js)
  }
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => tab(b.dataset.tab)));

  /* ---------- 18.10: режим стримера — пульт стримера внутри сайта ----------
     Вкладку видит только стример (сервер ставит флаг streamer в /api/me; разделы /api/streamer и сами пульты ?embed=1
     сервер отдаёт только ему). Пульты — свои страницы во фреймах того же сайта, в оформлении сайта канала.
     Ничего не грузим, пока вкладку не открыли; фрейм раздела создаём при первом открытии и дальше держим (не теряет состояние).
     LG_DOCK — док-панель OBS (/c/<канал>/streamer): сразу режим стримера, компактно, без шапки сайта. */
  const DOCK = !!window.LG_DOCK;
  const SM = { data: null, loading: false, cur: '', frames: {}, pages: null };
  let smWant = false;   // в прошлый раз ушёл из режима стримера — откроем его, как только станет известно, что он доступен
  const smOk = () => DOCK || !!(ME && ME.streamer);
  function smVis() {
    const ok = smOk(), b = $('.tabs button[data-tab="streamer"]');
    if (b) b.hidden = !ok || !!(ME && ME.roleSw);   // 26.10: открыт переключатель «Зритель / Стример» (start.js) - вкладка не нужна
    if (ok && smWant) { smWant = false; tab('streamer'); return; }
    if (!ok) { smDrop(); if ($('#tab-streamer').classList.contains('on')) tab('hero'); }
  }
  // вышел или права забрали — фреймы закрываем (их соединения с сервером — тоже)
  function smDrop() { if (!SM.data && !SM.loading) return; SM.data = null; SM.frames = {}; SM.pages = null; SM.cur = ''; $('#tab-streamer').innerHTML = ''; }
  async function openStreamer() {
    const el = $('#tab-streamer');
    if (!SM.data) {
      if (SM.loading) return;
      SM.loading = true;
      el.innerHTML = '<p class="empty">Загружаем пульт…</p>';
      const r = await api('/api/streamer');
      SM.loading = false;
      if (!r || !r.ok) { el.innerHTML = `<p class="empty">${esc((r && r.error) || 'Режим стримера недоступен')}</p>`; return; }
      SM.data = r;
      smBuild(el);
    }
    let first = SM.cur;
    // док OBS всегда открывается с главного — «Поход и Ярмарка»; на сайте — последний раздел в этом окне.
    // 18.10: пока что-то не настроено — с «Готовности» (принцип «минимум действий»)
    if (!first && smReadyFirst()) first = 'ready';
    if (!first && !DOCK) { try { first = sessionStorage.getItem('lgSm') || ''; } catch {} }
    // при открытии выключенный раздел не выбираем (он спрятан) — первый включённый
    // 25.10: новое устройство (smg, новинка «smgame») - главная вкладка «Игра» (первая в ленте), иначе - «Стрим сейчас»
    const main = SM.data.smg ? 'game' : 'shop';
    const want = smSecs().find((x) => x.id === (first || main));
    smShow(want && want.off && !smOffOpen ? '' : first || main);
  }
  // 18.10: «Готовность»: пока не всё готово — первым пунктом ленты; когда готово — значком в её конце
  // 25.10: «Готовность» — раздел пульта MultiDonate (/p/): в режиме стримера её нет, только ссылка «Готовность →» (smRd)
  const smReadyFirst = () => !!(SM.data && SM.data.ready && !SM.data.ready.ok && (SM.data.sections || []).some((x) => x.id === 'ready'));
  // доступ к виджетам меняет администратор игры — раздел может появиться или пропасть: перечитываем список разделов
  // при возвращении на вкладку (не чаще раза в 20 с) — без перезагрузки фреймов
  // 18.10: и сразу по событию «sm» живого канала (force — без ограничения 20 с; style — стиль канала из события)
  // Стример посреди работы: ничего не перезагружаем целиком — только лента разделов, значок «Готовности» и оформление;
  // открытый раздел, прокрутка и введённое в поля остаются. Раздел пропал (закрыли доступ) — только тогда переход, с объяснением
  let smAt = 0, smBusy = false, smAgain = null;
  async function smRefresh(force, style) {
    if (!SM.data || SM.loading || (!force && Date.now() - smAt < 20000)) return;
    if (smBusy) { if (force) smAgain = { style: style || (smAgain && smAgain.style) }; return; }   // запрос уже идёт — повторим после него
    smAt = Date.now(); smBusy = true;
    const r = await api('/api/streamer').catch(() => null);
    smBusy = false;
    if (smAgain) { const a = smAgain; smAgain = null; setTimeout(() => smRefresh(true, a.style), 0); }
    if (!r || !r.ok || !SM.data) {
      // права на режим стримера забрали — пульты закрываем (их соединения тоже)
      if (r && r.ok === false && /недоступен/.test(r.error || '')) { smDrop(); if (DOCK) $('#tab-streamer').innerHTML = `<p class="empty">${esc(r.error)}</p>`; else if (ME) { ME.streamer = false; smVis(); } }
      return;
    }
    // стиль канала сменили (Костюмерная) — оформление на месте, без перезагрузки страницы и фреймов
    const st = style || r.style;
    if (st && SM.data.style && st !== SM.data.style) smRestyle(st);
    if (r.style || st) SM.data.style = st || r.style;
    const same = JSON.stringify([SM.data.sections, SM.data.ready]) === JSON.stringify([r.sections, r.ready]);
    const gone = SM.cur && !r.sections.some((x) => x.id === SM.cur) ? (SM.data.sections.find((x) => x.id === SM.cur) || {}).t : '';
    SM.data.sections = r.sections; SM.data.ready = r.ready;
    if (same) return;   // ничего не поменялось — ленту не трогаем
    // раздел-игра пропал (закрыли доступ) — его фрейм закрываем (и его соединение); остальные фреймы не трогаем
    for (const k of Object.keys(SM.frames)) if (k !== 'panel' && !r.sections.some((x) => x.id === k && !x.panel)) { SM.frames[k].remove(); delete SM.frames[k]; }
    if (SM.frames.panel && !r.sections.some((x) => x.panel)) { SM.frames.panel.remove(); delete SM.frames.panel; SM.pages = null; }
    smNav();
    if (!smSecs().some((x) => x.id === SM.cur)) { smShow(''); if (gone) toast(`Раздел «${gone}» закрыл администратор игры`); }
  }
  // стиль канала: оформление сайта и пультов во фреймах меняем на месте (атрибуты), человечков сайта — новой сборкой стилей
  function smRestyle(st) { siteRestyle(st); }
  /* 28.10 (fix/style-live): стиль канала сменили (мастер, «Настройки игры», пульт) - сервер шлёт событие «style» всем открытым страницам
     сайта канала (и зрителям, и стримеру не в режиме стримера). Оформление - на месте, человечки - новой сборкой стилей сайта
     (/doodle.js - стиль канала), потом перерисовать сайт и открытые «Город» / «Поход». Без перезагрузки страницы. → Promise */
  let restyleP = null, restyleTo = '';
  function siteRestyle(st) {
    if (!/^[\w-]{1,30}$/.test(String(st || '')) || DEMO) return Promise.resolve(false);
    if (restyleTo === st && restyleP) return restyleP;
    const skin = SU.skinOf(st), root = document.documentElement;
    root.dataset.style = st; if (!DEMO) root.dataset.skin = skin;
    for (const b of Object.values(SM.frames)) { try { b.querySelector('iframe').contentDocument.documentElement.setAttribute('data-skin', skin); } catch {} }
    if (SM.data) SM.data.style = st;
    try { localStorage.removeItem('lgStyle'); } catch {}   // временный выбор стиля зрителя - стиль канала важнее
    if (DOCK) return Promise.resolve(true);   // в доке человечков нет
    const have = () => { try { return !!(D() && D().styles && D().styles[st]); } catch { return false; } };
    const redraw = () => {
      restyleP = null; restyleTo = '';
      if (!have()) return false;   // сборки нет — оформление уже сменено, человечки прежние
      try { D().use(st); } catch {}
      window.LG.rerender(true);
      // открытые «Город» и «Поход» - заново в новом стиле (city.js сам пересобирает город, если стиль другой)
      if ($('#tab-city').classList.contains('on')) { try { if (window.LGCity) window.LGCity.close(); } catch {} openCity(); }
      if ($('#tab-quest') && $('#tab-quest').classList.contains('on')) { questTab(false); questTab(true); }
      smStyleLine();
      try { document.dispatchEvent(new CustomEvent('lg-style', { detail: { style: st } })); } catch {}
      return true;
    };
    if (have()) return Promise.resolve(redraw());
    restyleTo = st;
    restyleP = new Promise((ok) => {
      const sc = document.createElement('script');
      sc.src = (window.LG_BASE || '') + '/doodle.js?v=' + Date.now();
      sc.onload = sc.onerror = () => ok(redraw());
      document.head.appendChild(sc);
    });
    return restyleP;
  }
  // 28.10 (fix/style-live): режим стримера - строка «Стиль канала: X» и что с замком (выбрать / закрыт до победы над Закхуэлем / смена)
  function smStyleLine() {
    const el = $('#smStyle'); if (!el) return;
    api('/api/style').then((r) => {
      if (!r || !r.ok) { el.hidden = true; return; }
      const L = r.lock || {}, nm = ((r.styles || []).find((x) => x.id === r.active) || {}).name || r.active;
      const why = L.vote ? 'выберет чат после «Начать сюжет»' : !L.chosen ? 'можно выбрать: «? Как играть» → «Стиль канала»' : L.changed ? 'смена стиля использована' : L.once ? 'одна смена доступна' : 'закрыт до победы над Закхуэлем';
      el.innerHTML = `Стиль канала: <b>${esc(nm)}</b> · ${esc(why)}`; el.dataset.style = r.active; el.hidden = false;
    });
  }
  function styleEvent(st) {
    if (!st || st === sty()) return;
    const nm = (() => { try { return (D().styles[st] && D().styles[st].name) || ''; } catch { return ''; } })();
    siteRestyle(st).then(() => { const n = nm || (() => { try { return D().styles[st].name || st; } catch { return st; } })(); toast(`Стиль канала сменился: «${n}»`); });
  }
  // Комната перезапустилась с другим набором модулей (пульт во фрейме сообщает «stale» или пришло «sm» mods): страницы пульта
  // платформы другие, но посреди работы фрейм не перезагружаем — только когда стример уйдёт с него (другой раздел)
  // или фрейм скрыт. Перезагружается на нужной странице (она в адресе фрейма); фреймы игр не трогаем
  let smStale = false;
  function smStaleCheck(go) {
    const b = SM.frames.panel, f = b && b.querySelector('iframe');
    if (!smStale || !f) { if (!f) smStale = false; return; }
    if (!go && !b.hidden && $('#tab-streamer').classList.contains('on') && !document.hidden) return;   // стример сейчас в нём
    smStale = false; SM.pages = null; b.classList.remove('ready');
    try { const u = new URL(f.contentWindow.location.href); if (go) u.searchParams.set('page', go); f.contentWindow.location.replace(u.href); } catch { f.src = f.src; }
  }
  // событие «sm» — и пультам во фреймах (страница «Готовность» сразу перепроверяет: канал/бот подключили — галочки зелёные)
  function smTell(why) {
    for (const b of Object.values(SM.frames)) { try { b.querySelector('iframe').contentWindow.postMessage({ lg: 'sm', why: Array.isArray(why) ? why : [] }, location.origin); } catch {} }
  }
  // нет живого канала (SSE недоступен) — лёгкий опрос разделов раз в минуту, только пока открыт режим стримера
  setInterval(() => { if (SM.data && !smEs && $('#tab-streamer').classList.contains('on') && (DOCK || !document.hidden)) smRefresh(true); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) smRefresh(); });
  window.addEventListener('focus', () => smRefresh());
  // пульт устарел (комната с другим набором модулей) — его старый список страниц не в счёт: разделы — по серверу
  const smSecs = () => (SM.data ? SM.data.sections : []).filter((x) => !x.panel || !SM.pages || smStale || SM.pages.includes(x.id));
  // 18.10: разделы — колонкой слева (решение стримера; пульт справа на всю оставшуюся ширину). Узко (док OBS 300–500 px,
  // телефон) — узкая полоса слева: кнопка «Разделы» (со счётчиком «Готовности») и название открытого раздела; список — поверх пульта
  // 25.10: режим стримера — пульт «Поход Легиона» (src/platform/pults.ts): стрим, игроки и администрирование игры
  // (aw / at / ab — под меткой «Админ игры»); game / set / adm — подписи прежнего общего пульта
  const SM_GROUP = { game: 'Стрим', ply: 'Игроки', set: 'Канал' };
  const SM_ADM = { adm: '', aw: 'Мир и сезон', at: 'Новинки и тесты', ab: 'Баланс и экономика' };
  // адрес пульта MultiDonate и его «Готовности» (в доке OBS — в том же окне: переключатель вверху ведёт обратно)
  const smMd = (page) => ((SM.data && SM.data.pult) || `/p/${encodeURIComponent((window.LG_CH && window.LG_CH.login) || '')}/`) + (page ? `?page=${page}` : '');
  function smRd() {
    const a = $('#smRd'); if (!a || !SM.data) return;
    const r = SM.data.ready, left = r && !r.ok ? r.left || 0 : 0;
    a.classList.toggle('is-bad', !!left); a.classList.toggle('is-ok', !!(r && r.ok));
    a.innerHTML = `<span class="sm-t">Готовность →</span>${left ? `<span class="sm-cnt" aria-label="не готово: ${left}">${left}</span>` : r && r.ok ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ''}`;
    a.title = left ? `Готовность к стриму (пульт MultiDonate): осталось ${left}` : 'Готовность к стриму - в пульте MultiDonate';
  }
  // 19.10: в ленте — только включённое у канала (сервер помечает выключенное off: модуль выключен или снята галочка «Видно»
  // на «Сцене»). Внизу — неброская строка «Показать выключенные (N)»: раскрывает их серым, выбор помнится.
  // Открытый раздел выключили — он остаётся в ленте (серым), пока стример сам не уйдёт с него
  let smOffOpen = false;
  try { smOffOpen = localStorage.getItem('lgSmOff') === '1'; } catch {}
  const smShown = (x) => !x.off || smOffOpen || x.id === SM.cur;
  function smBuild(el) {
    el.innerHTML = `<div class="sm-wrap">
      <aside class="sm-side" aria-label="Разделы пульта">
        <button type="button" class="sm-menu" aria-expanded="false" aria-controls="smList" title="Разделы пульта"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span class="sm-menu-cnt" hidden></span><span class="sr-only">Разделы пульта</span></button>
        <button type="button" class="sm-curv" tabindex="-1" aria-hidden="true"></button>
        <div class="sm-list" id="smList">
          <nav class="sm-switch" aria-label="Пульт"><span aria-current="page">Поход Легиона</span><a href="${esc(smMd())}" title="Донаты, виджеты, мини-игры, OBS и сцена">MultiDonate</a></nav>
          <p class="sm-style" id="smStyle" aria-live="polite" hidden></p>
          <a class="sm-rd" id="smRd" href="${esc(smMd('ready'))}"></a>
          <button type="button" class="btn ghost sm sm-dock sm-donwin" id="smDonWin" title="Отдельное окно браузера: лента донатов, алерты и музыка (как окно «Донаты» на ПК)">Открыть окно последних донатов</button>
          <nav class="filters sm-nav" aria-label="Разделы пульта"></nav>
          ${DOCK ? '' : `<button type="button" class="btn ghost sm sm-dock" id="smDock" title="Адрес для пользовательской док-панели браузера в OBS: сразу режим стримера, компактно">Скопировать адрес для OBS</button>`}
          ${!DOCK && ME && ME.roleSw ? '<button type="button" class="btn ghost sm sm-dock" id="smHelp" title="Мастер стримера: игра, окно игры, пульт, стиль канала, ссылка для зрителей">? Как играть</button>' : ''}
        </div>
      </aside><div class="sm-body"></div><div class="sm-scrim" aria-hidden="true"></div></div>`;
    smNav(); smStyleLine();
    const d = $('#smDock');
    if (d) d.onclick = () => {
      const u = location.origin + SM.data.dock;
      const ok = () => toast('Адрес док-панели скопирован: ' + u);
      try { navigator.clipboard.writeText(u).then(ok, () => toast(u)); } catch { toast(u); }
    };
    // 19.10: «Последние донаты» — отдельное окно (как на ПК); из дока OBS тоже открывается окном, без адресной строки (решение стримера)
    $('#smDonWin').onclick = () => {
      const u = `${location.origin}/p/${encodeURIComponent((SM.data && SM.data.channel) || (window.LG_CH && window.LG_CH.login) || '')}/donations`;
      const copy = (msg) => { try { navigator.clipboard.writeText(u).then(() => toast(msg), () => toast(u)); } catch { toast(u); } };
      const w = window.open(u, 'md-donations', (() => { let g = null; try { g = JSON.parse(localStorage.getItem('mdDonWin') || 'null'); } catch {} const n = (v) => Number.isFinite(v); return g && n(g.w) && n(g.h) ? `popup,width=${g.w},height=${g.h}` + (n(g.x) && n(g.y) ? `,left=${g.x},top=${g.y}` : '') : 'popup,width=470,height=1000'; })());
      if (w) { try { w.focus(); } catch {} } else copy('Браузер не дал открыть окно — ссылка скопирована');
    };
    const hb = $('#smHelp'); if (hb) hb.onclick = () => startLoad().then(() => window.LGStart && window.LGStart.help(), () => {});   // 26.10: мастер (start.js)
    const root = $('.sm-wrap', el), menu = $('.sm-menu', el);
    menu.onclick = () => smMenu(!root.classList.contains('open'));
    $('.sm-curv', el).onclick = () => smMenu(true);
    $('.sm-scrim', el).onclick = () => smMenu(false);
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('open')) { smMenu(false); menu.focus(); } });
  }
  // узкий режим: список разделов поверх пульта (открыть / закрыть)
  function smMenu(on) {
    const root = $('#tab-streamer .sm-wrap'); if (!root) return;
    root.classList.toggle('open', !!on);
    const m = $('.sm-menu', root); if (m) m.setAttribute('aria-expanded', String(!!on));
    if (on) { const b = $('.sm-nav [aria-pressed="true"]', root) || $('.sm-nav [data-sec]', root); if (b) setTimeout(() => { try { b.focus({ preventScroll: true }); smSeen(b); } catch {} }, 30); }
  }
  // выбранный раздел — в видимой части колонки (колонка прокручивается сама, страница — нет)
  function smSeen(b) {
    const L = b && b.closest('.sm-list'); if (!L) return;
    const top = b.offsetTop - L.offsetTop, bot = top + b.offsetHeight;
    if (top < L.scrollTop) L.scrollTop = Math.max(0, top - 8); else if (bot > L.scrollTop + L.clientHeight) L.scrollTop = bot - L.clientHeight + 8;
  }
  function smFold() { try { const a = JSON.parse(localStorage.getItem('lgSmFold') || '[]'); return new Set(Array.isArray(a) ? a : []); } catch { return new Set(); } }
  function smNav() {
    const nav = $('#tab-streamer .sm-nav'); if (!nav) return;
    let g = '';
    const all = smSecs(), rd = all.find((x) => x.id === 'ready'), rest = all.filter((x) => x.id !== 'ready' && smShown(x));
    const offN = all.filter((x) => x.off).length;
    const left = SM.data && SM.data.ready ? SM.data.ready.left : 0;
    const head = rd && smReadyFirst() ? `<button type="button" data-sec="ready" class="sm-ready" aria-pressed="${SM.cur === 'ready'}"><span class="sm-t">${esc(rd.t)}</span>${left ? `<span class="sm-cnt" aria-label="осталось ${left}">${left}</span>` : ''}</button>` : '';
    const tail = rd && !smReadyFirst() ? `<span class="sm-sep" aria-hidden="true"></span><button type="button" data-sec="ready" class="sm-ready-ok" aria-pressed="${SM.cur === 'ready'}" title="Готовность: всё настроено"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="sm-t">${esc(rd.t)}</span></button>` : '';
    // подписи групп: «Игра», «Канал»; разделы администратора — под меткой «Админ игры»
    // 20.10: группы сворачиваются (стрелка у подписи); свёрнутая группа показывает только открытый сейчас раздел; запоминается
    const fold = smFold();
    const capBtn = (x, inner) => `<button type="button" class="sm-gh" data-grp="${esc(x.g)}" aria-expanded="${!fold.has(x.g)}"><svg class="sm-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10l4 4 4-4"/></svg>${inner}</button>`;
    const cap = (x) => x.g in SM_ADM ? capBtn(x, `<span class="lv adm sm-adm" title="Администратор игры: здесь и глобальные настройки для всех каналов">${SM_ADM[x.g] ? 'Админ' : 'Админ игры'}</span>${SM_ADM[x.g] ? ' ' + esc(SM_ADM[x.g]) : ''}`) : SM_GROUP[x.g] ? capBtn(x, SM_GROUP[x.g]) : '';
    const L = nav.closest('.sm-list'), st = L ? L.scrollTop : 0;   // список обновился сам — прокрутку стримера не сбиваем
    const offT = 'Выключено у канала — открой раздел, чтобы включить';
    const more = offN ? `<button type="button" class="sm-offs" aria-expanded="${smOffOpen}">${smOffOpen ? 'Скрыть' : 'Показать'} выключенные (${offN})</button>` : '';
    nav.innerHTML = head + rest.map((x) => { const c = ''; void g; void fold; void cap;   // 25.10 (стример): без подписей групп («Стрим», «Админ · Мир и сезон»…) - только вкладки
      return `${c}<button type="button" data-sec="${esc(x.id)}" aria-pressed="${x.id === SM.cur}"${x.off ? ` class="sm-off" title="${offT}"` : ''}><span class="sm-t">${esc(x.t)}</span>${x.n ? `<span class="sm-cnt" aria-label="новых: ${+x.n}">${+x.n > 99 ? '99+' : +x.n}</span>` : ''}${x.off ? '<span class="sr-only"> (выключено)</span>' : ''}</button>`; }).join('') + tail + more;
    if (L) L.scrollTop = st;
    nav.onclick = (e) => {
      const gb = e.target.closest('[data-grp]');
      if (gb) { const f = smFold(), k = gb.dataset.grp; if (f.has(k)) f.delete(k); else f.add(k); try { localStorage.setItem('lgSmFold', JSON.stringify([...f])); } catch {} smNav(); const t = $(`#tab-streamer .sm-gh[data-grp="${k}"]`); if (t) t.focus(); return; }
      if (e.target.closest('.sm-offs')) {
        smOffOpen = !smOffOpen;
        try { localStorage.setItem('lgSmOff', smOffOpen ? '1' : '0'); } catch {}
        smNav(); const t = $('#tab-streamer .sm-offs'); if (t) t.focus();
        return;
      }
      const b = e.target.closest('[data-sec]'); if (b) { smShow(b.dataset.sec); smMenu(false); }
    };
    smRail(); smRd();
  }
  // узкая полоса: счётчик «Готовности» на кнопке и название открытого раздела
  function smRail() {
    const root = $('#tab-streamer .sm-wrap'); if (!root || !SM.data) return;
    const left = smReadyFirst() ? (SM.data.ready.left || 0) : 0, c = $('.sm-menu-cnt', root);
    if (c) { c.hidden = !left; c.textContent = left ? String(left) : ''; }
    const m = $('.sm-menu', root); if (m) m.title = 'Разделы пульта' + (left ? ` — не готово: ${left}` : '');
    const cur = (SM.data.sections || []).find((x) => x.id === SM.cur), v = $('.sm-curv', root);
    if (v) v.textContent = cur ? cur.t : '';
  }
  function smShow(id) {
    const list = smSecs(); if (!list.length) return;
    const sec = list.find((x) => x.id === id) || list.find((x) => !x.off) || list[0];
    const was = SM.cur;
    SM.cur = sec.id;
    // ушли с раздела, который выключили, пока он был открыт, — теперь его можно убрать из ленты
    if (was && was !== sec.id && !smOffOpen && (list.find((x) => x.id === was) || {}).off) smNav();
    try { sessionStorage.setItem('lgSm', sec.id); } catch {}
    const body = $('#tab-streamer .sm-body'); if (!body) return;
    // страницы платформенного пульта (Сцена, OBS, модули) — в одном фрейме: одно соединение, переключение мгновенное
    const key = sec.panel ? 'panel' : sec.id;
    let box = SM.frames[key];
    if (!box) {
      box = document.createElement('div'); box.className = 'sm-frame';
      box.innerHTML = '<p class="sm-wait">Загружаем…</p>';
      const f = document.createElement('iframe');
      f.title = sec.panel ? 'Пульт: настройки' : 'Пульт: ' + sec.t;
      f.src = `${sec.src}&skin=${encodeURIComponent(document.documentElement.dataset.skin || '')}`;
      f.addEventListener('load', () => box.classList.add('ready'));
      box.appendChild(f); body.appendChild(box); SM.frames[key] = box;
    } else if (sec.panel && smStale) {
      smStaleCheck(sec.id);   // стример сам ушёл на другую страницу — устаревший пульт перезагружаем сразу на ней
    } else if (sec.panel) {
      try { box.querySelector('iframe').contentWindow.postMessage({ lg: 'show', page: sec.id }, location.origin); } catch {}
    }
    Object.values(SM.frames).forEach((b) => { b.hidden = b !== box; });
    smStaleCheck();   // пульт платформы ушёл в фон — теперь его можно перезагрузить незаметно
    smVisible();
    $$('#tab-streamer .sm-nav [data-sec]').forEach((b) => { const on = b.dataset.sec === sec.id; b.setAttribute('aria-pressed', String(on)); if (on) smSeen(b); });
    smRail();
    smFit();
  }
  // пульту платформы — виден ли он сейчас (скрытый не держит включённым оверлей «Сцены»)
  function smVisible() {
    const b = SM.frames.panel, f = b && b.querySelector('iframe'); if (!f) return;
    const on = !b.hidden && $('#tab-streamer').classList.contains('on') && !document.hidden;
    try { f.contentWindow.postMessage({ lg: 'visible', on }, location.origin); } catch {}
  }
  document.addEventListener('visibilitychange', () => { smVisible(); smStaleCheck(); });
  // фрейм — на всю высоту окна под шапкой и лентой разделов (страница сайта при этом не прокручивается)
  function smFit() {
    const body = $('#tab-streamer .sm-body'); if (!body || !$('#tab-streamer').classList.contains('on')) return;
    const top = Math.max(0, Math.round(body.getBoundingClientRect().top + window.scrollY));
    (body.closest('.sm-wrap') || body).style.setProperty('--sm-top', top + 'px');
  }
  window.addEventListener('resize', () => { clearTimeout(smFit.t); smFit.t = setTimeout(smFit, 100); });
  // пульт во фрейме сообщает, какие его страницы есть на самом деле (модуль выключен — раздела нет),
  // 18.10: итог «Готовности» (галочка в ленте) и переход на свою страницу (кнопка «Открыть настройку OBS»)
  // 26.10: «? Помощь» в пульте «Игра» (фрейм раздела) - мастер стримера (start.js)
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.lg !== 'help' || !ME || !ME.roleSw) return;
    if (!Object.values(SM.frames).some((b) => { const f = b.querySelector('iframe'); return f && f.contentWindow === e.source; })) return;
    startLoad().then(() => window.LGStart && window.LGStart.help(), () => {});
  });
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data) return;
    const pf = SM.frames.panel && SM.frames.panel.querySelector('iframe');
    if (!pf || e.source !== pf.contentWindow) return;
    if (e.data.lg === 'ready' && SM.data) {
      const nx = { ok: !!e.data.ok, left: Number(e.data.left) || 0 }, was = SM.data.ready;
      if (!was || was.ok !== nx.ok || was.left !== nx.left) { SM.data.ready = nx; smNav(); }
      return;
    }
    if (e.data.lg === 'page' && SM.frames.panel && !SM.frames.panel.hidden && smSecs().some((x) => x.id === e.data.page) && SM.cur !== e.data.page) {
      SM.cur = String(e.data.page);
      $$('#tab-streamer .sm-nav [data-sec]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sec === SM.cur)));
      smRail();
      return;
    }
    if (e.data.lg === 'stale') { smStale = true; smStaleCheck(); return; }
    // 24.10: «Репорты» — пульт сообщил, сколько новых (счётчик у раздела)
    if (e.data.lg === 'bugs' && SM.data) { const x = (SM.data.sections || []).find((s) => s.id === 'bugs'), n = Math.max(0, +e.data.n || 0); if (x && (x.n || 0) !== n) { x.n = n; smNav(); } return; }
    if (e.data.lg !== 'pages' || !Array.isArray(e.data.pages)) return;
    SM.pages = e.data.pages.map((x) => String(x.id));
    smNav();
  });

  /* ---------- вход ---------- */
  function renderUser() {
    const u = $('#user');
    // 18.10: администратор игры (PLATFORM_ADMINS) — метка «Админ» рядом с ником (флаг ставит сервер)
    // 18.10: свои каналы есть — ник открывает «Мои каналы»; зашёл на чужой канал — тихая кнопка «Мой канал»
    const mine = (ME && ME.mine) || [], here = CH && mine.some((m) => m.login.toLowerCase() === CH.login.toLowerCase());
    const who = ME && ME.user ? (mine.length ? `<button type="button" class="who whob" id="whob" aria-haspopup="true" aria-expanded="false" title="Мои каналы">${esc(ME.user.name)}${ico('chev', 'chv')}</button>` : `<span class="who">${esc(ME.user.name)}</span>`) : '';
    const myc = mine.length && CH && !here ? `<a class="btn ghost sm mych" href="/c/${encodeURIComponent(mine[0].login)}/" title="Перейти в свой канал: ${esc(mine[0].name)}">Мой канал</a>` : '';
    const OUTL = 'Выйти<span class="out-x"> из аккаунта</span>';   // 24.10: на телефоне — просто «Выйти» (длинная кнопка закрывала вкладки)
    if (ME && ME.user) u.innerHTML = `${myc}${who}${ME.admin ? '<span class="lv adm" title="Администратор игры: глобальные настройки и админские действия для всех каналов">Админ</span>' : ''}<button type="button" class="btn ghost sm" id="out" title="Выйти из аккаунта Twitch на этом сайте">${OUTL}</button>`;
    else u.innerHTML = `<a class="btn twitch sm" href="${window.LG_LOGIN || '/auth/login'}" aria-label="Войти через Twitch">${ico('twitch')}<span>Войти</span></a>`;
    const o = $('#out'); if (o) o.onclick = async () => {   // 23.10: защита от случайного нажатия — второе нажатие в течение 4 с
      if (!SU.confirmTwice(o, { text: 'Точно выйти?', cls: 'warn', mark: 'sure' })) return;   // 25.10: packages/site-ui
      await api('/auth/logout', {}); last = ''; load(); };
    const w = $('#whob'); if (w) w.onclick = () => popToggle(w, 'mine');
    if (POP.el && POP.kind) popRender();   // меню открыто, а данные обновились
    if (window.LGNews && window.LGNews.me) window.LGNews.me(ME);   // 18.10: админу игры — правка новостей прямо на сайте (news.js)
    startSync();   // 26.10: переключатель «Зритель / Стример», поиск стримера (start.js)
  }

  /* ---------- 26.10: старт для стримера и зрителя (start.js, docs/reports/streamer-start.md) ----------
     Новинки «roles» (переключатель «Зритель / Стример», мастер первого запуска) и «find» (поиск стримера, свой список).
     Файл грузится, только когда сервер открыл этому входу хоть одну из них (флаги roleSw / find в /api/me) */
  let START = null;
  function startLoad() {
    if (START) return START;
    const v = window.LG_STARTV || {};
    const add = (tag, attrs) => new Promise((ok, bad) => { const x = document.createElement(tag); Object.assign(x, attrs); x.onload = () => ok(); x.onerror = bad; document.head.appendChild(x); });
    START = Promise.all([add('link', { rel: 'stylesheet', href: '/site/start.css' + (v.css ? '?v=' + v.css : '') }), add('script', { src: '/site/start.js' + (v.js ? '?v=' + v.js : '') })])
      .then(() => { if (window.LGStart) window.LGStart.init({ me: () => ME, tab, smOk, api, toast, styleLine: () => smStyleLine(), ch: CH, curTab: () => { const t = $('.tab.on'); return t ? t.id.replace(/^tab-/, '') : ''; }, sm: () => SM.data, smShow, smFrame: (id) => { const b = SM.frames[id] || (SM.data && (SM.data.sections || []).some((x) => x.id === id && x.panel) ? SM.frames.panel : null); return b ? b.querySelector('iframe') : null; } }); })
      .catch((e) => { START = null; throw e; });
    return START;
  }
  // 26.10 (новинка «seal»): Печать Метаморфозы - выбор стиля героя (окно - start.js), дальше - как остальные действия сайта
  function sealPick(uid) {
    if (!ME || !ME.seal) return;
    startLoad().then(() => window.LGStart.stylePick({
      title: 'Печать Метаморфозы', text: 'Выбери стиль своего героя. Печать сгорит, и герой останется в этом стиле, даже если канал сменит свой.',
      sel: (ME.hero && ME.hero.look && ME.hero.look.ps) || sty(), ok: 'Применить печать', confirm: 'Печать сгорит - точно?',
      pick: (style) => act('/api/seal', { uid, style }, 'Печать применяется…'),
    }), () => toast('Окно не загрузилось - проверь связь', true));
  }
  function startSync() {
    if (DOCK || DEMO) return;
    if (!ME || !(ME.roleSw || ME.find || ME.seal)) { if (window.LGStart) window.LGStart.sync(); return; }
    startLoad().then(() => { if (window.LGStart) window.LGStart.sync(); }, () => {});
  }

  /* ---------- 18.10: переключатель стримеров (шапка) и «Мои каналы» (меню ника) ----------
     Список стримеров — один небольшой ответ сервера (кеш минута, ETag), грузится только при первом открытии списка. */
  const CH = window.LG_CH || null;
  const POP = { el: null, kind: '', from: null, list: null, loading: false, err: '' };
  const chUrl = (l) => `/c/${encodeURIComponent(l)}/`;
  function popToggle(btn, kind) { if (POP.el && POP.kind === kind) popClose(true); else popOpen(btn, kind); }
  function popOpen(btn, kind) {
    popClose(false);
    const el = document.createElement('div');
    el.className = 'pop'; el.id = 'pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', kind === 'mine' ? 'Мои каналы' : 'Стримеры');
    document.body.appendChild(el);
    Object.assign(POP, { el, kind, from: btn });
    btn.setAttribute('aria-expanded', 'true');
    popRender(); popPlace();
    if (kind === 'all' && !POP.list && !POP.loading) {
      POP.loading = true; POP.err = '';
      api('/api/channels').then((r) => { POP.loading = false; if (r && r.ok) POP.list = r.channels || []; else POP.err = (r && r.error) || 'не загрузилось'; if (POP.el) { popRender(); popPlace(); } });
    }
    setTimeout(() => { const f = el.querySelector('a, button'); if (f) try { f.focus({ preventScroll: true }); } catch {} }, 0);
  }
  function popClose(back) {
    if (!POP.el) return;
    POP.el.remove(); POP.el = null;
    if (POP.from) { POP.from.setAttribute('aria-expanded', 'false'); if (back) try { POP.from.focus(); } catch {} }
    POP.kind = '';
  }
  function popPlace() {
    const el = POP.el, b = POP.from; if (!el || !b) return;
    const r = b.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 24);
    el.style.width = w + 'px';
    const left = POP.kind === 'mine' ? r.right - w : r.left;
    el.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, left)) + 'px';
    el.style.top = Math.round(r.bottom + 8) + 'px';
    el.style.maxHeight = Math.max(200, window.innerHeight - r.bottom - 24) + 'px';
  }
  function popRender() {
    const el = POP.el; if (!el) return;
    const mine = (ME && ME.mine) || [], cur = CH ? CH.login.toLowerCase() : '';
    const mineHtml = mine.length ? `<p class="pop-h">Мои каналы</p><ul class="pop-l">${mine.map((m) => `<li class="pop-mine"><span class="pop-n" title="${esc(m.name)}">${esc(m.name)}${m.login.toLowerCase() === cur ? '<span class="pop-here">здесь</span>' : ''}</span>
        <span class="pop-a"><a href="${chUrl(m.login)}">Открыть сайт</a>${m.streamer ? `<a href="${chUrl(m.login)}#streamer" data-sm="${esc(m.login)}">Режим стримера</a>` : ''}</span></li>`).join('')}</ul>` : '';
    let all = '';
    if (POP.kind === 'all') {
      const L = POP.list;
      all = `<p class="pop-h">Стримеры</p>` + (L ? (L.length ? `<ul class="pop-l">${L.map((c) => `<li><a class="pop-ch" href="${chUrl(c.login)}"${c.login.toLowerCase() === cur ? ' aria-current="page"' : ''}><span class="pop-n" title="${esc(c.name)}">${esc(c.name)}</span>${c.live ? '<span class="pop-live"><i aria-hidden="true"></i>в эфире</span>' : ''}</a></li>`).join('')}</ul>` : '<p class="pop-e">Пока никого.</p>')
        : `<p class="pop-e">${POP.err ? esc('Список ' + POP.err) : 'Загружаем…'}</p>`);
    }
    el.innerHTML = (POP.kind === 'all' ? all + (mineHtml ? '<hr class="pop-sep">' + mineHtml : '') : mineHtml);
    // «Режим стримера» своего же канала — без перезагрузки
    el.onclick = (e) => {
      const a = e.target.closest('a[data-sm]');
      if (a && a.dataset.sm.toLowerCase() === cur && smOk()) { e.preventDefault(); popClose(false); tab('streamer'); }
    };
  }
  document.addEventListener('click', (e) => { if (POP.el && !POP.el.contains(e.target) && !(POP.from && POP.from.contains(e.target))) popClose(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && POP.el) popClose(true); });
  window.addEventListener('resize', () => popPlace());
  window.addEventListener('scroll', () => popPlace(), { passive: true });
  function chswInit() {
    const b = $('#chsw'); if (!b || !CH) return;
    b.innerHTML = `${ico('users', 'chu')}<span class="chsw-n">${esc(CH.name)}</span>${ico('chev', 'chv')}`;
    b.title = `${CH.name} — стримеры: открыть сайт другого канала`;
    b.setAttribute('aria-label', `Канал ${CH.name}. Стримеры — другие каналы`);
    b.hidden = false;
    // 26.10: новинка «find» - поиск стримера и свой список (start.js) вместо общего списка «Стримеры»
    b.onclick = () => { if (ME && ME.find) { popClose(false); startLoad().then(() => window.LGStart && window.LGStart.findToggle(b), () => popToggle(b, 'all')); } else popToggle(b, 'all'); };
  }

  /* ---------- персонаж ---------- */
  const equipped = (h, sl) => h.items.find((x) => x.on && x.slot === sl);
  function deltas(it, h) {
    const c = it.wearable && !it.on ? equipped(h, it.slot) : null;
    const keys = Array.from(new Set([...Object.keys(it.stats || {}), ...Object.keys((c && c.stats) || {})])).filter((k) => stOk(k, h));   // 20.10: крит и т. п. — только если открыты (h.xs)
    const cs = (c && c.stats) || {}, own = it.stats || {};
    const rows = keys.map((k) => { const v = (it.stats || {})[k] || 0, dv = c ? Math.round(((own[k] || 0) - (cs[k] || 0)) * 10) / 10 : 0; return { k, v, dv }; });
    const score = rows.reduce((a, r) => a + r.dv * (STW[r.k] || XSTW[r.k] || 1), 0);
    return { c, rows, score, better: it.wearable && !it.on && (c ? score > 0.01 : rows.some((r) => r.v > 0)) };
  }
  function effText(it) {
    const e = it.effect; if (!e) return '';
    const p = [];
    if (e.heal) p.push(`лечит ${e.heal} здоровья`);
    if (e.revive) p.push('воскрешает павшего героя');
    if (e.buff) p.push(`${stLabel(e.buff.stat).toLowerCase()} +${e.buff.add} на ${e.buff.min || 60} мин`);
    return p.join(', ');
  }
  // еда и зелья (16.10): общий откат 3 мин после любого съеденного/выпитого; команды чата — по номеру в сумке
  const mmss = (t) => { const s2 = Math.max(0, Math.ceil(((+t || 0) - now()) / 1000)); return `${Math.floor(s2 / 60)}:${String(s2 % 60).padStart(2, '0')}`; };
  // откат вещи: еда и зелья — общий (3 мин), свиток возрождения — свой (1 час). Возвращает время конца или 0
  const cdUntil = (it, h) => { if (!h) return 0; const t = now(); if ((it.slot === 'food' || it.slot === 'potion') && h.eatUntil > t) return h.eatUntil; if (it.effect && it.effect.revive && h.scrollUntil > t) return h.scrollUntil; return 0; };
  const eatCd = (it, h) => !!cdUntil(it, h);
  // 17.10: съесть / выпить прямо с сайта (еда и зелья; свиток возрождения — только командой на стриме)
  const edible = (it) => !it.wearable && (it.slot === 'food' || it.slot === 'potion') && !!it.effect && !it.effect.revive;
  const eatVerb = (it) => (it.slot === 'potion' || it.drink ? 'Выпить' : 'Съесть');
  const BUSY_NOTE = 'Идёт бой на стриме — снаряжение менять нельзя. Снять и надеть можно после боя';
  const useCmd = (it) => { const k = it.no ? ' ' + it.no : ''; const e = it.effect || {}; if (e.revive) return 'свиток (или свиток @ник)'; if (it.slot === 'potion' || it.drink) return 'выпить' + k; if (it.slot === 'food') return 'съесть' + k; return ''; };
  // 18.10: откат кончился — перерисовываем героя целиком: кнопка «Съесть» снова доступна без обновления страницы.
  // Таймер раз в секунду работает, только пока на странице есть отсчёт и вкладка видна
  function tickCd() {
    if (document.hidden) return;
    let done = false;
    document.querySelectorAll('[data-eat]').forEach((e) => { const t = +e.dataset.eat; if (t <= now()) done = true; else { const v = mmss(t); if (e.textContent !== v) e.textContent = v; } });
    if (done && !DR.active) renderHero();
  }
  setInterval(() => { if (document.querySelector('[data-eat]')) tickCd(); }, 1000);
  // одинаковые расходники — одной стопкой
  function bagList(h) {
    const out = [], stacks = {};
    for (const it of h.items) {
      if (it.on) continue;
      if (!it.wearable) { const k = it.id; if (stacks[k]) { stacks[k].n++; stacks[k].uids.push(it.uid); continue; } stacks[k] = { ...it, n: 1, uids: [it.uid] }; out.push(stacks[k]); }
      else out.push({ ...it, n: 1, uids: [it.uid] });
    }
    // порядок — по номерам из игры (по ним работают «!надеть 2», «!съесть 3»)
    return out.sort((a, b) => ((a.no || 1e9) - (b.no || 1e9)) || (b.wearable - a.wearable) || (RORD[a.rarity] - RORD[b.rarity]) || a.name.localeCompare(b.name, 'ru'));
  }
  const catOf = (it) => (it.wearable ? it.slot : it.slot === 'material' ? 'mat' : it.relic || it.slot === 'relic' ? 'relic' : 'other');   // 20.10: mat — материалы заточки
  // 20.10: для какого класса вещь — оружие по роли, щит — легионеру, броня и шлем — по типу (тяжёлое/лёгкое/ткань); остальное — всем
  // 20.10: новые классы (Разбойник, Некромант, Паладин) — кнопка фильтра только у того, у кого есть их вещь или он сам этого класса (пока — тестеры)
  // 25.10 (баг: в фильтре аукциона не было «Разбойника», а классы были без названий стиля): список классов — один, с сервера
  // (/api/me → classes: деревья классов комнаты skills/<класс>.js, порядок и пометка beta); beta-класс — тому, кому новые классы открыты
  // (hero.cb), или кто им уже играет / носит его оружие. Названия — по стилю канала (roleOf: «Котопаладин» у котиков)
  const classIds = (h) => {
    const L = ME && Array.isArray(ME.classes) && ME.classes.length ? ME.classes : Object.keys((ME && ME.roles) || ROLE_BASE).filter((k) => k !== 'recruit').map((id) => ({ id }));
    return L.filter((c) => c && c.id && (!c.beta || (h && (h.cb || h.role === c.id || (h.items || []).some((x) => x.role === c.id))))).map((c) => c.id);
  };
  const betaOpen = (h) => classIds(h).some((k) => ((ME && ME.classes) || []).some((c) => c.id === k && c.beta));   // герою видны новые классы
  const GEAR_CLS = { heavy: GD.gearClasses('heavy'), light: GD.gearClasses('light'), cloth: GD.gearClasses('cloth') };
  const SHIELD_CLS = GD.classes().filter((c) => c.shield).map((c) => c.id);
  const clsOf = (it) => (it.slot === 'weapon' && it.role ? [it.role] : it.slot === 'trinket' && it.role ? [it.role] : it.slot === 'shield' ? SHIELD_CLS : (it.slot === 'armor' || it.slot === 'helmet') && GEAR_CLS[it.gear] ? GEAR_CLS[it.gear] : null);   // null — подходит всем
  const fitsCls = (it, c) => c === 'all' || !it.wearable || !clsOf(it) || clsOf(it).includes(c);
  try { const v = localStorage.getItem('lgCls'); if (v && /^[a-z]{2,20}$/.test(v)) cls = v; } catch {}   // нет такого класса у героя — сумка сбросит на «все»

  // 19.10: длинный ник героя — в одну строку: шрифт уменьшается под ширину (не меньше 55% от обычного)
  function fitName(n) {
    if (!n) return;
    n.style.fontSize = ''; n.style.whiteSpace = 'nowrap';
    const w = n.clientWidth, sw = n.scrollWidth; if (!w || sw <= w) return;
    const base = parseFloat(getComputedStyle(n).fontSize) || 32, k = Math.max(0.55, (w / sw) * 0.98);
    n.style.fontSize = (base * k).toFixed(1) + 'px';
    if (n.scrollWidth > n.clientWidth) n.style.whiteSpace = '';   // совсем длинный — пусть переносится
  }
  let fitT = 0; window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => fitName(document.querySelector('#tab-hero .plate .nm')), 150); });
  try { document.fonts && document.fonts.ready.then(() => fitName(document.querySelector('#tab-hero .plate .nm'))); } catch {}
  /* 23.10: кукла героя — рисунок и пять слотов вокруг. Одна на вкладку «Персонаж» и наковальню «Города» (CX.doll).
     o: { sel — uid выбранной вещи, mood, kit, still — рисунок без анимации, forge — режим наковальни: слоты не надевают/снимают, а кладут вещь на наковальню
          (data-ig — uid, data-igdrag — можно тащить; пустой слот — просто рамка), can(it) — можно ли точить } */
  function dollHtml(h, o = {}) {
    if (o.off) return '';   // 25.10: новая сумка (inv2) — кукла в библиотеке инвентаря
    const fg = !!o.forge;
    const slotBtn = (sl) => {
      const it = equipped(h, sl);
      if (it && fg) { const ok = !o.can || o.can(it); return `<button type="button" class="slot full${ok ? '' : ' off'}" data-slot="${sl}" data-r="${esc(it.rarity)}" data-ig="${esc(it.uid)}"${ok && !h.ghost && !h.busy ? ' data-igdrag="1"' : ''} aria-pressed="${it.uid === o.sel}" aria-label="${SLOT[sl]}: ${esc(it.name)}${durAria(it)} — положить на наковальню">${lgx(it)}${art(it)}${durBadge(it)}${it.en > 0 ? `<span class="en">+${+it.en}</span>` : ''}<span class="sl">${SLOT[sl]}</span><span class="sn">${esc(it.name)}</span></button>`; }
      if (it) return `<button type="button" class="slot full${h.busy ? ' locked' : ''}" data-slot="${sl}" data-r="${esc(it.rarity)}" data-sel="${esc(it.uid)}"${h.ghost || h.busy ? '' : ` data-drag="off" data-dslot="${sl}"`} aria-pressed="${it.uid === o.sel}" aria-label="${SLOT[sl]}: ${esc(it.name)}${durAria(it)}${h.busy ? ' (в бою)' : ''}">${lgx(it)}${art(it)}${durBadge(it)}<span class="sl">${SLOT[sl]}</span><span class="sn">${esc(it.name)}</span></button>`;
      if (fg) return `<span class="slot" data-slot="${sl}" aria-label="${SLOT[sl]}: пусто">${art(EMPTY[sl], 'sil')}<span class="sl">${SLOT[sl]}</span><span class="sn">пусто</span></span>`;
      return `<button type="button" class="slot${h.busy ? ' locked' : ''}" data-slot="${sl}" data-empty="${sl}" aria-label="${SLOT[sl]}: пусто — показать подходящее в сумке">${art(EMPTY[sl], 'sil')}<span class="sl">${SLOT[sl]}</span><span class="sn">пусто</span></button>`;
    };
    return `<div class="doll${fg ? ' ig-doll' : ''}">
          <div class="fig">${(o.still ? still : String)(doodle(h.login, heroLook(h), o.mood || 'stern', h.ghost ? undefined : o.kit || 'battle'))}</div>
          ${SLOTS.map(slotBtn).join('')}
        </div>`;
  }
  // 20.10: заточка — «Гладиус +7»; 23.10: отдельно — и для героя, пришедшего без перерисовки вкладки (его читает «Город»)
  function nameItems(h) { if (h && h.items) for (const it of h.items) { if (!it.srvName) it.srvName = it.name; it.baseName = it.baseName || it.srvName; it.name = nameOf(it) + (it.en > 0 ? ' +' + it.en : ''); } }
  /* ---------- 25.10: новая сумка (новинка inv2 - флаг i2 у героя, inv2Public): кукла и сумка вкладки «Персонаж» - библиотека
     инвентаря (packages/inventory: LGInventory.mount, вид 'full' на ПК и планшете, 'sheet' на телефоне, режим 'equip').
     Всё остальное вкладки - как было: шапка, характеристики, карточка вещи справа (на телефоне - шторка) с её кнопками, фильтр по
     классу, «Разложить». Надеть / снять / съесть - те же /api/equip, /api/unequip, /api/use (act); свой порядок - перетащить ячейку на
     ячейку (порядок «как в сумке») или Alt+стрелки - /api/stOrder. Библиотека живёт в своём элементе: вкладка перерисовывается
     целиком, а он только переставляется и обновляет изменившиеся ячейки. Флага нет - старая кукла и сумка, как раньше ---------- */
  const inv2On = (h) => !!(h && h.i2 && window.LGInventory && !DOCK);
  const mqInv = SU.media('tablet');   // 25.10: (min-width: 720px) - packages/site-ui
  let INV2 = null;   // { host, inv, v }
  const inv2Data = (h) => ({ hero: h, items: h.items.slice().sort((a, b) => (a.no || 1e9) - (b.no || 1e9)), stack: (h.sg && h.sg.bs) || 20, bagCap: h.sg && cls === 'all' ? h.sg.cap : null, ...(+h.ob > 0 ? { obCap: +h.ob } : {}) });   // 26.10: рудная сумка - своей сеткой
  const inv2Busy = () => { const h = ME && ME.hero; if (h && (h.ghost || h.busy)) { toast(h.ghost ? 'Призрак не переодевается' : BUSY_NOTE, true); return true; } return false; };
  function inv2Host(h, selUid) {
    const v = mqInv.matches ? 'full' : 'sheet';
    if (INV2 && INV2.v !== v) inv2Drop();
    if (!INV2) {
      // 26.10 (стример): персонаж - снова в карточке героя (крупно, слоты вокруг), сетка - в «Сумке»; библиотека одна (dollEl)
      const host = document.createElement('div'); host.className = 'inv2-host';
      const dollEl = document.createElement('div'); dollEl.className = 'inv2-doll';
      const inv = window.LGInventory.mount(host, { variant: v, mode: 'equip', data: inv2Data(h),
        actions: {
          equip: (uid) => (inv2Busy() ? null : act('/api/equip', { uid }, word('on', 'Надето'))),
          unequip: (slot) => (inv2Busy() ? null : act('/api/unequip', { slot }, word('off', 'Снято'))),
          use: (uid) => { const it = ME.hero.items.find((x) => x.uid === uid); return act('/api/use', { uid }, it && eatVerb(it) === 'Выпить' ? 'Выпито' : 'Съедено'); },
          reorder: (from, to) => (ordOk(ME && ME.hero) ? ordSave(ordMove(ME.hero, from, to), from) : null),
        },
        options: {
          header: false, vitals: false, detail: false, storeKey: 'lgInv2', label: word('bag', 'Сумка'), dollEl, dragRoot: $('#tab-hero'),
          filters: ['all', 'weapon', 'armor', 'helmet', 'shield', 'trinket', 'use', 'other'],
          art: (it) => art(it), only: (it) => fitsCls(it, cls),
          figure: (hh) => { const st = hh.stats || {}, mx = st.hp || 0, nw = hh.hpNow ?? mx; return doodle(hh.login, heroLook(hh), mx && nw / mx < 0.3 ? 'hurt' : 'stern', hh.ghost ? undefined : kit); },
          cardTip: (c, it) => cardTip(c, it, ME.hero), tipHide: () => tipHide(),
          canUse: (it) => (eatCd(it, ME.hero) && !(it && it.effect && it.effect.hw) ? 'Еда и зелья ещё не готовы' : true),
          extra: (c) => (c.it.no ? `<span class="no" title="Номер в сумке - для команд в чате">${c.it.no}</span>` : ''),
          // выбор - карточка вещи сайта справа (на телефоне - шторка) с её кнопками: починить, заточить, съесть…
          // 25.10 (решение стримера): правая кнопка - прежнее меню вещи (надеть / заменить / снять, съесть / выпить, подробнее); Shift + правая - быстро надеть / снять
          menu: (c, it, e) => { const t = TIPS[it.uid] || Object.values(TIPS).find((x) => x.uids && x.uids.includes(it.uid)) || { ...it, n: 1, uids: [it.uid] }; ctxMenu(e.clientX, e.clientY, t, ME.hero); },
          onSelect: (it) => { sel = it ? it.uid : null; sheet = !!it && !mqWide.matches; renderHero(); if (sheet) { const c = $('.detail [data-close]', $('#tab-hero')); if (c) c.focus(); } },
          say: (t) => toast(t, true),
        } });
      INV2 = { host, dollEl, inv, v };
    } else INV2.inv.update(inv2Data(h));
    INV2.inv.select(selUid || '');
    return INV2.host;
  }
  function inv2Drop() { if (!INV2) return; try { INV2.inv.destroy(); } catch {} INV2.host.remove(); INV2.dollEl.remove(); INV2 = null; }
  mqInv.addEventListener('change', () => { if (INV2) { last = ''; renderHero(); } });
  function renderHero() {
    const el = $('#tab-hero');
    if (typeof tipHide === 'function' && tip && !tip.hidden) tipHide();
    if (!ME || !ME.user) return renderHello(el);
    const h = ME.hero;
    nameItems(h);
    if (!h) {
      el.innerHTML = `<div class="nohero panel"><div class="fig">${doodle(ME.user.login, null, 'happy')}</div><div><h1 class="h1">${ME.creating ? 'Герой собирается в путь…' : 'Героя пока нет'}</h1><p class="lead">${ME.creating ? 'Создаём твоего героя — он появится здесь через несколько секунд, страницу обновлять не нужно. Если MultiDonate у стримера сейчас выключен, герой появится, как только начнётся стрим.' : 'Он появится, когда ты напишешь в чат на стриме.'}</p></div></div>`;
      calm(el); return;
    }
    const viewsBar = `<div class="views filters" role="group" aria-label="Что показать"><button type="button" data-view="gear" aria-pressed="${view === 'gear'}">Снаряжение</button><button type="button" data-view="look" aria-pressed="${view === 'look'}">Облик</button>${window.LGSkills && h.sk ? `<button type="button" data-view="skills" aria-pressed="${view === 'skills'}">Навыки</button>` : ''}${window.LGAch && h.ac ? `<button type="button" data-view="ach" aria-pressed="${view === 'ach'}">Достижения</button>` : ''}<button type="button" data-view="log" aria-pressed="${view === 'log'}">Журнал</button></div>`;
    // 20.10: «Навыки» — на всю ширину вкладки (деревья классов, skills.js); остальное — как было
    if (view === 'skills' && !h.sk) view = 'gear';   // 20.10: навыки пока только тестерам
    if (view === 'skills' && window.LGSkills) {
      el.innerHTML = `<div class="sk-wrap sk-tab">${viewsBar}${window.LGSkills.html(h, SKX, { tree: true })}</div>`;   // 20.10: та же доска-дерево, что у Тренера в «Городе»
      el.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { view = b.dataset.view; try { localStorage.setItem('lgView', view); } catch {} renderHero(); });
      window.LGSkills.bind(el, SKX); return;
    }
    // 23.10: «Достижения» — на всю ширину вкладки (пока только тестерам: h.ac есть, когда открыто)
    if (view === 'ach' && !(h.ac && window.LGAch)) view = 'gear';
    if (view === 'ach') {
      el.innerHTML = `<div class="ac-wrap">${viewsBar}${window.LGAch.html(h, SKX)}</div>`;
      el.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { view = b.dataset.view; try { localStorage.setItem('lgView', view); } catch {} renderHero(); });
      window.LGAch.bind(el, SKX, h); return;
    }
    // 23.10: «Журнал» — бывшая вкладка сверху, теперь вид «Персонажа» на всю ширину (а последние записи — коротко под характеристиками)
    if (view === 'log') {
      el.innerHTML = `<div class="jr-wrap">${viewsBar}<div id="jrFull"></div></div>`;
      el.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => goView(b.dataset.view));
      if (JL) renderLog(); else loadLog();
      return;
    }
    const s = h.stats || {}, hpMax = s.hp || 0, hpNow = h.hpNow ?? hpMax;
    const gp = !h.ghost && h.gearPen && h.gearPen.pct > 0 ? h.gearPen : null;   // 17.10: чужое снаряжение
    // 18.10: опыт — внутри уровня: «набрано в этом уровне / нужно до следующего»; полоска и цифра — по одним числам.
    // Поля xpInLevel/xpToNext даёт игра; если их нет (старая версия) — считаем от порогов уровней
    const own = h.xpInLevel != null, xin = own ? Math.max(0, +h.xpInLevel || 0) : Math.max(0, (h.xp || 0) - (h.prevXp || 0));
    const xneed = own ? (h.xpToNext == null ? null : Math.max(1, +h.xpToNext || 0)) : (h.next == null ? null : Math.max(1, h.next - (h.prevXp || 0)));
    const xpPct = xneed == null ? 100 : Math.max(0, Math.min(100, (xin / xneed) * 100));
    const hpPct = hpMax ? Math.max(0, Math.min(100, (hpNow / hpMax) * 100)) : 0;
    const bag = bagList(h), i2 = inv2On(h);   // 25.10: i2 - кукла и сумка из библиотеки инвентаря
    const cats = [['all', 'Всё'], ...SLOTS.map((k) => [k, SLOT[k]]), ['mat', 'Материалы'], ['relic', 'Особое'], ['other', 'Расходники']].filter(([k]) => k === 'all' || bag.some((x) => catOf(x) === k));
    if (!cats.some(([k]) => k === filter)) filter = 'all';
    const ids = classIds(h), myCls = ids.includes(h.role) ? h.role : null;
    const clsBtns = bag.some((x) => x.wearable && clsOf(x)) ? [['all', 'Все классы'], ...ids.map((k) => { const l = roleOf(k, ((ME && ME.roles) || {})[k]); return [k, k === myCls ? `${l} (ты)` : l]; })] : [];
    if (cls !== 'all' && !ids.includes(cls)) cls = 'all';   // 25.10: запомненный класс герою не виден (beta) — «все классы»
    const shown = bag.filter((x) => (filter === 'all' || catOf(x) === filter) && fitsCls(x, cls));
    const nOn = h.items.filter((x) => x.on).length;
    // выбранная вещь: по uid (из сумки или со слота)
    let cur = sel && (h.items.find((x) => x.uid === sel) || bag.find((x) => x.uids.includes(sel)));
    if (cur && !cur.uids) cur = { ...cur, n: 1, uids: [cur.uid] };
    // 18.10: без автовыбора — раньше на широком экране карточка «первой» вещи висела всегда, а крестик её не закрывал
    if (!cur) { sheet = false; sel = null; }
    const selUid = cur ? cur.uids[0] : null;

    TIPS = {}; TIPHERO = h;
    for (const it of h.items) if (it.on) TIPS[it.uid] = { ...it, n: 1, uids: [it.uid] };
    for (const it of bag) TIPS[it.uids[0]] = it;

    // 22.10: предел сумки (склад) — свободные ячейки до предела тусклыми (только во «Всё»: видно, сколько места осталось)
    const freeCells = (hh, all) => { const g = hh.sg; if (!g || !all) return ''; const n = Math.max(0, Math.min(60, g.cap - g.used)); return n ? '<span class="cell free" aria-hidden="true"></span>'.repeat(n) : ''; };
    const cell = (it) => {
      const dv = deltas(it, h);
      return `<button type="button" class="cell${eatCd(it, h) ? ' oncd' : ''}" data-r="${esc(it.rarity)}" data-sel="${esc(it.uids[0])}"${it.wearable && !h.ghost && !h.busy ? ` data-drag="on" data-dslot="${esc(it.slot)}"` : ordOk(h) ? ' data-drag="mv"' : ''}${ordOk(h) ? ' aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"' : ''} aria-pressed="${it.uids[0] === selUid}" title="${esc(it.name)}">
        ${lgx(it)}${it.no ? `<span class="no" title="Номер в сумке — для команд в чате">${it.no}</span>` : ''}${it.en > 0 ? `<span class="en" title="Заточка +${it.en}">+${it.en}</span>` : ''}${durBadge(it)}${art(it)}<span class="cn">${esc(it.name)}</span>${eatCd(it, h) ? `<span class="eatcd" data-eat="${cdUntil(it, h)}">${mmss(cdUntil(it, h))}</span>` : ''}
        ${it.qty ? `<span class="cnt">${esc(INV.oreN ? INV.oreN(it.q) : it.q)}</span>` : it.n > 1 ? `<span class="cnt"${h.sg && !it.wearable && it.n > (h.sg.bs || 20) ? ` title="Стопка больше ${h.sg.bs || 20} — занимает ${Math.ceil(it.n / (h.sg.bs || 20))} ячейки сумки"` : ''}>×${it.n}${h.sg && !it.wearable && it.n > (h.sg.bs || 20) ? `<em class="cc"> · ${Math.ceil(it.n / (h.sg.bs || 20))} яч.</em>` : ''}</span>` : ''}${dv.better && !h.ghost ? `<span class="upg" title="Лучше надетого">${ico('up')}</span>` : ''}</button>`;
    };

    el.innerHTML = `<div class="hero-grid${h.ghost ? ' is-ghost' : ''}${i2 ? ' inv2' : ''}">
      <section class="panel stage" aria-label="Герой и снаряжение">
        ${viewsBar}
        ${view === 'look' ? lookHtml(h) : `${dollHtml(h, { sel: selUid, mood: hpMax && hpNow / hpMax < 0.3 ? 'hurt' : 'stern', kit, off: i2 })}${i2 ? '<div data-inv2-doll></div>' : ''}${h.ghost ? '' : `<div class="kit filters" role="group" aria-label="Вид героя"><button type="button" data-kit="battle" aria-pressed="${kit === 'battle'}" title="Как в бою: оружие, шлем вместо шапки, доспех, амулет">Боевой</button><button type="button" data-kit="peace" aria-pressed="${kit === 'peace'}" title="Как на привале и в городе: своя шапка и облик">Походный</button></div>`}`}
        <div class="plate">
          <h1 class="nm">${esc(h.name)}${awb(h.aw)}</h1>${window.LGAch && h.ac ? window.LGAch.plate(h, SKX) : ''}
          <div class="role"><span class="rl">${h.ghost ? ico('ghost') + 'Призрак' : esc(roleOf(h.role, h.roleName))}</span><span class="lv">Ур. ${h.level}</span></div>
        </div>
        ${h.ghost ? `<div class="ghostnote"><div class="gt">Пал в Походе</div><div class="cd" data-until="${+h.deadUntil || 0}">${left(h.deadUntil)}</div><div class="gs">до воскрешения${h.deadUntil ? ' · ' + new Date(h.deadUntil).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''}</div><p class="gh">Раньше — свиток возрождения, молитва жреца или донат от 100 ₽ с текстом <b>воскресить @${esc(h.login)}</b></p></div>` : ''}
        ${h.busy && !h.ghost ? `<div class="busybar" role="status">⚔ ${BUSY_NOTE}</div>` : ''}
      </section>
      <section class="panel vitals" aria-label="Характеристики">
        <div class="meter"><div class="mk"><span>Опыт</span><b>${xneed == null ? 'максимум' : `${xin} / ${xneed}`}</b></div><div class="bar xp" role="progressbar" aria-label="Опыт до следующего уровня" aria-valuenow="${Math.round(xpPct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${xpPct.toFixed(1)}%"></i></div></div>
        <div class="meter"><div class="mk"><span>Здоровье</span><b>${hpNow} / ${hpMax}</b></div><div class="bar hp" role="progressbar" aria-label="Здоровье" aria-valuenow="${Math.round(hpPct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${hpPct.toFixed(1)}%"></i></div></div>
        <dl class="stats">${Object.keys(ST).map((k) => `<div class="stat" data-k="${k}" data-stat="${k}" tabindex="0">${ico(k)}<dt>${esc(stLabel(k))}</dt><dd>${gp && gp.stat === k && gp.full !== (s[k] ?? 0) ? `<s class="pen-was" title="Без штрафа за чужое снаряжение">${gp.full}</s><span class="pen-now">${s[k] ?? 0}</span>` : s[k] ?? 0}</dd></div>`).join('')}</dl>
        ${h.xs ? xsHtml(h.xs, h) : ''}
        ${gp ? `<p class="penl" role="note"><b>⚠ Надеты вещи другого класса — дебафф −${gp.pct}% ${esc(gp.statName || 'урон')}</b><span>${gp.parts.map((x) => `${esc(x.name)} (${esc(x.gearName)}, −${x.pct}%)`).join(' · ')}</span></p>` : ''}
        <div class="coins">${ico('coin')}<span>Монеты</span>${money(h.money)}</div>
        ${h.debt > 0 ? `<p class="debtl" role="note"><b>Долг: −${money(h.debt)}</b><span>Пойман на краже в лавке. Пока долг не погашен, покупать нельзя — награды сначала идут в счёт долга.</span></p>` : ''}
        ${repAllHtml(h)}
        ${h.soc ? `<button type="button" class="socl${h.soc.bad ? ' bad' : ''}" data-gosoc title="Соц. рейтинг: место ${h.soc.place || '—'} из ${h.soc.total} — открыть рейтинг"><span class="sr-i" aria-hidden="true">${esc(h.soc.icon || '')}</span><span>Соц. рейтинг</span><b class="sr-r">${esc(h.soc.rankName || '')}</b><b class="sr-s">${h.soc.score}</b>${h.soc.place ? `<em>${h.soc.place} место</em>` : ''}</button>` : ''}
        ${jrMini()}
      </section>
      <section class="panel bag" aria-label="${word('bag', 'Сумка')}">
        <div class="bag-h"><h2 class="h2">${word('bag', 'Сумка')}</h2>${ordOk(h) && bag.length > 1 ? '<button type="button" class="btn ghost sm bag-sort" data-bagsort aria-label="Разложить сумку: оружие, доспехи, шлемы, щиты, амулеты, расходники, материалы; свой порядок сбросится">⇅ Разложить</button>' : ''}${h.ghost || h.busy || i2 ? '' : `<span class="dnd-hint muted">${dragHint(h)}</span>`}<span class="muted">${h.sg ? `<b class="bag-cnt${h.sg.used >= h.sg.cap ? ' full' : h.sg.used >= h.sg.cap - 2 ? ' near' : ''}" title="Ячеек занято: одинаковые еда, зелья и материалы лежат стопкой (до ${h.sg.bs || 20}), надетое не в счёт">${h.sg.used} / ${h.sg.cap}</b> · ` : ''}${bag.length ? `${h.items.length - nOn} ${plural(h.items.length - nOn, 'вещь', 'вещи', 'вещей')}` : 'пусто'}${nOn ? ` · ${nOn} надето` : ''}</span></div>
        ${h.sg && h.sg.used >= h.sg.cap ? `<p class="note bag-full" role="status">Сумка полна (${h.sg.used} / ${h.sg.cap}): купить в лавке и на Ярмарке не выйдет, добыча в походе достанется другому из отряда, а если у всех полно — останется лежать на месте 30 минут (подобрать — «подобрать»). Лишнее — на Склад${h.cy ? ' в «Городе»' : ''}.</p>` : ''}
        ${i2 ? `${clsBtns.length ? `<div class="filters cls" role="group" aria-label="Для какого класса">${clsBtns.map(([k, l]) => `<button type="button" data-cls="${k}" aria-pressed="${cls === k}">${l}</button>`).join('')}</div>` : ''}<div data-inv2></div>`
          : bag.length ? `<div class="filters" role="group" aria-label="Что показать">${cats.map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}</div>
          ${clsBtns.length ? `<div class="filters cls" role="group" aria-label="Для какого класса">${clsBtns.map(([k, l]) => `<button type="button" data-cls="${k}" aria-pressed="${cls === k}">${l}</button>`).join('')}</div>` : ''}
          <div class="grid">${shown.map(cell).join('') || '<p class="empty">В этом разделе пусто</p>'}${freeCells(h, filter === 'all' && cls === 'all')}</div>`
          : `<p class="empty">${word('empty', 'Сумка пуста. Вещи добываются в Походе и покупаются на Ярмарке.')}</p>`}
      </section>
      <aside class="panel detail${sheet ? ' open' : ''}" aria-label="Вещь" ${cur ? '' : 'data-none'}>${cur ? detailHtml(cur, h) : `<p class="empty">${word('none', 'Выбери вещь в сумке или на герое')}</p>`}</aside>
      <div class="scrim${sheet ? ' open' : ''}" data-close></div>
    </div>
    <p class="foot">Детали облика покупаются на Ярмарке во время стрима, надеть купленное можно в «Облике» · обновлено ${ME.synced ? new Date(ME.synced).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>`;

    if (i2) { const ph = el.querySelector('[data-inv2]'); if (ph) ph.replaceWith(inv2Host(h, selUid)); const pd = el.querySelector('[data-inv2-doll]'); if (pd && INV2) pd.replaceWith(INV2.dollEl); } else inv2Drop();   // 26.10: и кукла - в карточку героя   // 25.10: новая сумка - тот же элемент
    el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filter = b.dataset.f; renderHero(); });
    el.querySelectorAll('[data-cls]').forEach((b) => b.onclick = () => { cls = b.dataset.cls; try { localStorage.setItem('lgCls', cls); } catch {} renderHero(); });
    el.querySelectorAll('[data-empty]').forEach((b) => b.onclick = () => { filter = b.dataset.empty; sel = null; sheet = false; renderHero(); const g = $('.bag', el); if (g && !mqWide.matches) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    // 21.10: повторный клик по уже выбранной вещи — снять выбор (на ПК карточка справа исчезает; на телефоне карточка — шторка, там клик её открывает)
    el.querySelectorAll('[data-sel]').forEach((b) => b.onclick = () => { if (mqWide.matches && cur && cur.uids.includes(b.dataset.sel)) { sel = null; renderHero(); return; } sel = b.dataset.sel; sheet = !mqWide.matches; renderHero(); if (sheet) { const c = $('.detail [data-close]', el); if (c) c.focus(); } });
    el.querySelectorAll('[data-close]').forEach((b) => b.onclick = closeDetail);
    el.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => goView(b.dataset.view));
    fitName($('.plate .nm', el));
    el.querySelectorAll('[data-gosoc]').forEach((b) => b.onclick = () => { lgv = 'soc'; tab('legion'); window.scrollTo(0, 0); });
    el.querySelectorAll('[data-kit]').forEach((b) => b.onclick = () => { kit = b.dataset.kit === 'peace' ? 'peace' : 'battle'; try { localStorage.setItem('lgKit', kit); } catch {} renderHero(); });
    el.querySelectorAll('[data-wear]').forEach((b) => b.onclick = () => { const v = b.dataset.v; let val = null; try { val = JSON.parse(v); } catch {} act('/api/wear', { field: b.dataset.wear, value: val }, 'Облик изменён', b); });
    calm(el); auraLive(el.querySelector('.stage .fig'), true);
    el.querySelectorAll('[data-on]').forEach((b) => b.onclick = () => act('/api/equip', { uid: b.dataset.on }, word('on', 'Надето'), b));
    el.querySelectorAll('[data-off]').forEach((b) => b.onclick = () => act('/api/unequip', { slot: b.dataset.off }, word('off', 'Снято'), b));
    el.querySelectorAll('[data-use]').forEach((b) => b.onclick = () => { const it = TIPS[b.dataset.use]; act('/api/use', { uid: b.dataset.use }, it && eatVerb(it) === 'Выпить' ? 'Выпито' : 'Съедено', b); });
    el.querySelectorAll('[data-use]').forEach((b) => { if (b.disabled) b.title = 'Еда и зелья ещё не готовы'; });
    el.querySelectorAll('[data-seal]').forEach((b) => b.onclick = () => sealPick(b.dataset.seal));   // 26.10: Печать Метаморфозы
    el.querySelectorAll('[data-forge]').forEach((b) => b.onclick = () => forgeOpen(b.dataset.forge));
    // 24.10: «Разложить» — порядок игры (свой порядок сбрасывается); Alt+стрелки на ячейке — сдвинуть на одну
    el.querySelectorAll('[data-bagsort]').forEach((b) => b.onclick = () => act('/api/stSort', { box: 'b' }, 'Сумка разложена', b));
    if (ordOk(h)) { const g = $('.bag .grid', el); if (g) g.onkeydown = (e) => {
      if (!e.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const c = e.target.closest('.cell[data-sel]'); if (!c) return; e.preventDefault();
      const cells = $$('.bag .grid .cell[data-sel]', el), i = cells.indexOf(c), j = i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1);
      if (i < 0 || j < 0 || j >= cells.length) return;
      ordSave(ordMove(h, c.dataset.sel, cells[j].dataset.sel), c.dataset.sel);
    }; }
    repBind(el);   // 22.10: починка — всем
    // 17.10: правая кнопка по вещи (в сумке или на герое) — меню: надеть / заменить / снять, съесть / выпить, подробнее
    el.oncontextmenu = (e) => {
      const t = e.target.closest('[data-sel]'); if (!t || !el.contains(t)) return;
      const it = TIPS[t.dataset.sel]; if (!it) return;
      e.preventDefault(); ctxMenu(e.clientX, e.clientY, it, h);
    };
  }
  /* ---------- перетаскивание: из сумки на слот героя — надеть, со слота в сумку — снять ----------
     Мышь: тянешь сразу (после сдвига на 6 px). Палец: удерживаешь ~0,3 с, потом тянешь — обычная прокрутка не ломается.
     Клик без перетаскивания работает как раньше (открывает карточку вещи). */
  const coarse = () => SU.is('touch');
  // 24.10: свой порядок сумки — перетаскиванием ячейки на ячейку (и Alt+стрелки с клавиатуры); пока — у кого есть Склад (h.sg)
  const ordOk = (h) => !!(h && h.sg && !h.ghost && !h.busy);
  function dragHint(h) {
    if (ordOk(h)) return coarse() ? 'удерживай вещь и тяни: на героя - надеть, на другую ячейку - поменять порядок' : 'тяни вещь: на героя - надеть, на другую ячейку - порядок (Alt+стрелки)';
    return coarse() ? 'удерживай вещь, чтобы перетащить на героя' : 'вещи можно перетаскивать на героя и обратно';
  }
  // новый порядок: ячейку from — на место ячейки to (как перестановка в списке); → первые uid ячеек
  function ordMove(h, from, to) {
    const cs = bagList(h), i = cs.findIndex((c) => c.uids.includes(from)), j = cs.findIndex((c) => c.uids.includes(to));
    if (i < 0 || j < 0 || i === j) return null;
    const [c] = cs.splice(i, 1); cs.splice(j, 0, c);
    return cs.map((x) => x.uids[0]);
  }
  async function ordSave(uids, focusUid) {
    if (!uids) return;
    await act('/api/stOrder', { uids }, 'Порядок сохранён');
    if (focusUid) { const b = document.querySelector(`#tab-hero .bag [data-sel="${CSS.escape(focusUid)}"]`); if (b) b.focus(); }
  }
  // у края экрана страница сама прокручивается (на телефоне сумка далеко от героя)
  let lastXY = [0, 0], scrollRaf = 0;
  function autoScroll() {
    scrollRaf = 0; if (!DR.active) return;
    const [x, y] = lastXY, H = window.innerHeight, zone = Math.min(90, H * 0.15);
    const v = y < zone ? -Math.ceil((zone - y) / 4) : y > H - zone ? Math.ceil((y - (H - zone)) / 4) : 0;
    if (v) { window.scrollBy(0, v); dragMove(x, y); }
    scrollRaf = requestAnimationFrame(autoScroll);
  }
  const DR = { src: null, mode: null, slot: '', uid: '', x0: 0, y0: 0, id: null, timer: 0, ghost: null, over: null, active: false, justDragged: false };
  function dragReset() {
    clearTimeout(DR.timer); if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
    if (DR.ghost) DR.ghost.remove();
    $$('.drop-ok, .drop-no, .drop-hover, .dragging, .ord-on').forEach((e) => e.classList.remove('drop-ok', 'drop-no', 'drop-hover', 'dragging', 'ord-on'));
    document.documentElement.classList.remove('is-dragging');
    Object.assign(DR, { src: null, mode: null, slot: '', uid: '', id: null, timer: 0, ghost: null, over: null, active: false });
  }
  function dragStart(x, y) {
    if (busy || !DR.src) return dragReset();
    DR.active = true;
    document.documentElement.classList.add('is-dragging');
    DR.src.classList.add('dragging');
    const g = document.createElement('div'); g.className = 'drag-ghost'; g.dataset.r = DR.src.dataset.r || 'common';
    const a = DR.src.querySelector('.art'); g.innerHTML = a ? a.outerHTML : '';
    document.body.appendChild(g); DR.ghost = g; dragMove(x, y);
    // куда можно бросить: подходящий слот (надеть) или сумка (снять)
    if (DR.mode === 'on') $$('#tab-hero .slot').forEach((sl) => sl.classList.add(sl.dataset.slot === DR.slot ? 'drop-ok' : 'drop-no'));
    else if (DR.mode !== 'mv') { const b = $('#tab-hero .bag'); if (b) b.classList.add('drop-ok'); }
    if (DR.mode !== 'off' && ordOk(ME && ME.hero)) { const g = $('#tab-hero .bag .grid'); if (g) g.classList.add('ord-on'); }   // 24.10: ячейки сумки — цели порядка
    if (navigator.vibrate && coarse()) try { navigator.vibrate(12); } catch {}
  }
  function targetAt(x, y) {
    const e = document.elementFromPoint(x, y); if (!e) return null;
    if (DR.mode !== 'off' && ordOk(ME && ME.hero)) { const c = e.closest('#tab-hero .bag .grid .cell[data-sel]'); if (c && c !== DR.src) return c; if (DR.mode === 'mv') return null; }
    if (DR.mode === 'on') { const sl = e.closest('#tab-hero .slot'); return sl && sl.dataset.slot === DR.slot ? sl : null; }
    return e.closest('#tab-hero .bag');
  }
  function dragMove(x, y) {
    lastXY = [x, y]; if (DR.active && !scrollRaf) scrollRaf = requestAnimationFrame(autoScroll);
    if (DR.ghost) DR.ghost.style.transform = `translate(${x - 36}px, ${y - 36}px)`;
    const t = targetAt(x, y);
    if (t !== DR.over) { if (DR.over) DR.over.classList.remove('drop-hover'); if (t) t.classList.add('drop-hover'); DR.over = t; }
  }
  function dragDrop() {
    const t = DR.over, mode = DR.mode, uid = DR.uid, slot = DR.slot;
    DR.justDragged = true; setTimeout(() => { DR.justDragged = false; }, 0);
    dragReset();
    if (!t) return;
    if (t.matches('.cell[data-sel]')) { ordSave(ordMove(ME.hero, uid, t.dataset.sel), uid); return; }   // 24.10: на ячейку — порядок
    if (mode === 'on') act('/api/equip', { uid }, word('on', 'Надето'));
    else act('/api/unequip', { slot }, word('off', 'Снято'));
  }
  const heroTab = $('#tab-hero');
  heroTab.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || DR.src) return;
    const src = e.target.closest('[data-drag]'); if (!src) return;
    Object.assign(DR, { src, mode: src.dataset.drag, slot: src.dataset.dslot, uid: src.dataset.sel, x0: e.clientX, y0: e.clientY, id: e.pointerId });
    if (e.pointerType === 'touch') DR.timer = setTimeout(() => { if (DR.src) dragStart(DR.x0, DR.y0); }, 280);
  });
  window.addEventListener('pointermove', (e) => {
    if (!DR.src || e.pointerId !== DR.id) return;
    if (!DR.active) {
      const moved = Math.hypot(e.clientX - DR.x0, e.clientY - DR.y0);
      if (e.pointerType === 'touch') { if (moved > 10) dragReset(); return; }   // палец поехал раньше удержания — это прокрутка
      if (moved > 6) dragStart(e.clientX, e.clientY); else return;
    }
    e.preventDefault(); dragMove(e.clientX, e.clientY);
  }, { passive: false });
  // пока тянем пальцем — страница не прокручивается
  window.addEventListener('touchmove', (e) => { if (DR.active) e.preventDefault(); }, { passive: false });
  window.addEventListener('pointerup', (e) => { if (!DR.src || e.pointerId !== DR.id) return; if (DR.active) dragDrop(); else dragReset(); });
  window.addEventListener('pointercancel', () => { if (DR.src && !DR.active) dragReset(); else if (DR.active) dragReset(); });
  heroTab.addEventListener('contextmenu', (e) => { if (DR.src) e.preventDefault(); });
  // после перетаскивания браузер шлёт «клик» по исходной ячейке — он не должен открывать карточку
  heroTab.addEventListener('click', (e) => { if (DR.justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && DR.active) dragReset(); });

  /* ---------- подсказка при наведении: характеристики вещи (только мышь; с клавиатуры — при фокусе) ---------- */
  const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.id = 'lg-tip'; tip.hidden = true;
  document.body.appendChild(tip);
  let tipFor = null;
  function tipHtml(it, h) {
    const dv = deltas(it, h), eff = effText(it);
    return `<div class="t-h"><span class="t-n" data-r="${esc(it.rarity)}">${esc(it.name)}</span>${it.qty ? `<span class="muted">${esc(oreQty(it.q))}</span>` : it.n > 1 ? `<span class="muted">×${it.n}</span>` : ''}</div>
      <div class="t-s"><span class="rar" data-r="${esc(it.rarity)}">${RAR[it.rarity] || ''}</span><span class="muted">${SLOT[it.slot] || ''}</span>${it.on ? `<span class="on">${ico('check')}надето</span>` : ''}</div>
      ${dv.rows.length ? `<ul class="t-st">${dv.rows.map((r) => `<li${XST[r.k] ? ' class="xr"' : ''}>${ico(r.k)}<span>${esc(stLabel(r.k))}</span><b>${stNum(r.k, r.v)}</b>${dv.c ? (r.dv ? `<em class="${r.dv > 0 ? 'up' : 'dn'}">${r.dv > 0 ? '+' : '−'}${String(Math.abs(r.dv)).replace('.', ',')}</em>` : '<em class="eq">=</em>') : '<em></em>'}</li>`).join('')}</ul>` : ''}
      ${eff ? `<p class="t-eff">${esc(eff[0].toUpperCase() + eff.slice(1))}</p>` : ''}${auraLine(it, 't-au')}
      <div class="d-q">${window.LG_LORE ? LG_LORE.html(it, false) : it.desc ? `<p class="t-desc">${esc(it.desc)}</p>` : ''}${dv.c ? `<p class="t-cmp">Сравнение с надетым: ${esc(dv.c.name)}</p>` : ''}${it.dur != null ? `<p class="t-dur${lowD(it) ? ' br' : ''}">${lowD(it) ? '⚠ ' + LOWT(it.dur) : `Прочность ${it.dur}% — почини у кузнеца`}</p>` : ''}</div>`;
  }
  // 20.10: что значит характеристика (в стилях названия свои: «Царапки» = физ. урон и т. п.)
  const ST_HELP = {
    hp: ['Здоровье', 'Сколько урона герой выдержит. На нуле герой падает и становится призраком.'],
    atk: ['Физический урон', 'Сила ударов оружием: «удар», «выстрел». Главное для легионеров и лучников.'],
    mag: ['Магический урон', 'Сила заклинаний («магия») и лечения жреца. Главное для магов и жрецов.'],
    def: ['Броня', 'Уменьшает урон, который герой получает в боях и ловушках.'],
  };
  // 20.10: характеристики второго ряда (видны тестерам, пока не открыты всем) и броня — с разницей «броня / сопротивление»
  const XS_HELP = {
    def: ['Броня', 'Режет ФИЗИЧЕСКИЕ удары: когти, клинки, стрелы, камни ловушек. В обычном бою и в ловушке каждая единица снимает 0,5 урона с удара (но не меньше 1), в бою с боссом — 0,3% (не больше 15%). От магии броня не спасает — для неё есть «Сопротивление».'],
    crit: ['Шанс крита', 'Как часто удар (и лечение) получается критическим. Основа у всех — 8%, прибавляют вещи и навыки; больше 50% не бывает. Единица на кубике — по-прежнему промах.'],
    critDmg: ['Сила крита', 'Во сколько раз критический удар сильнее обычного. Основа — ×1,5; вещи и навыки добавляют («+10%» — это +0,1 к множителю). Потолок — ×3.'],
    dodge: ['Уклонение', 'Шанс полностью избежать физического удара врага или босса. От магии не увернуться. От ловушки — вдвое меньше. Основа — 0%, потолок — 35%.'],
    pierce: ['Пробивание', 'Сколько брони врага твои удары не замечают (мечом, луком и магией). По боссу броня не считается, зато каждые 10% пробивания — +1% урона. Потолок — 75%.'],
    healPow: ['Сила лечения', 'Насколько сильнее твоё лечение: «лечить», «сияние», «оберег». Главное для жрецов. Потолок — +100%.'],
    luck: ['Удача', 'Немного больше монет из добычи (боёв, ловушек, сокровищниц, боссов): +0,2% за единицу, до +20%. И шанс, что вещь из добычи окажется на ступень лучше: 0,15% за единицу, до 15%. А ещё промах (единица на кубике) перебрасывается с шансом 0,2% за единицу — при удаче 100 промахов не 5%, а около 4%.'],
    resist: ['Сопротивление', 'Режет МАГИЧЕСКИЙ урон: заклинания, яд, проклятия, огонь, лёд и другие стихии — так же, как броня режет физический (0,5 урона за единицу, у босса — 0,3%, до 15%). От магии нельзя увернуться — её можно только выдержать. Часть сопротивления у героя своя и растёт с уровнем; всё, что сверх неё, ещё и даёт шанс не заметить яд и тину (2% за единицу, до 50%).'],
  };
  function statTip(k) {
    const th = TIPHERO || (ME && ME.hero), xs = th && th.xs, h = (xs && XS_HELP[k]) || ST_HELP[k]; if (!h) return ''; const nm = stLabel(k);
    const over = xs && xs[k + 'Over'] != null ? `<p class="t-cap">Набрано ${String(xs[k + 'Over']).replace('.', ',')}${XPCT[k] ? '%' : ''} — сверх потолка не считается</p>` : '';
    return `<div class="t-h"><span class="t-n">${esc(nm)}</span></div>${nm !== h[0] ? `<div class="t-s"><span class="muted">${esc(h[0])}</span></div>` : ''}<p class="t-desc">${esc(h[1])}</p>${over}`;
  }
  // окно персонажа: блок «Боевые характеристики» (крит, уклонение…)
  // 23.10: ремёсла героя (промысел в городах — шахта, лесопилка…). Уровни 1–20, без древа навыков; данных пока нет — все с 1-го уровня
  const CRAFTS = [['mine', 'Горное дело', 'Шахта: камень, руда, кристаллы'], ['wood', 'Лесное дело', 'Лесопилка: дерево, смола'], ['farm', 'Земледелие', 'Поля и пастбища: зерно, лён, шерсть'],
    ['herb', 'Травничество', 'Топи: травы, грибы, торф'], ['fish', 'Рыболовство', 'Море и полыньи: рыба, соль, жемчуг'], ['dig', 'Раскопки', 'Дюны и руины: глина, древности']];
  const CRAFT_MAX = 20;
  let xTab = 'fight'; try { if (localStorage.getItem('lgXTab') === 'craft') xTab = 'craft'; } catch {}
  function craftHtml(h) {
    const cr = (h && h.crafts) || {};
    return `<ul class="crafts">${CRAFTS.map(([k, name, what]) => {
      const c = cr[k] || {}, lv = Math.max(1, Math.min(CRAFT_MAX, +c.lv || 1)), xp = Math.max(0, +c.xp || 0), need = Math.max(1, +c.need || 100), pct = lv >= CRAFT_MAX ? 100 : Math.min(100, xp / need * 100);
      return `<li class="stat craft" title="${esc(what)}"><div class="craft-t"><b>${esc(name)}</b><span class="craft-lv">${lv >= CRAFT_MAX ? 'мастер' : `ур. ${lv}`}</span></div><div class="bar xp craft-bar" role="progressbar" aria-label="${esc(name)}: опыт до следующего уровня" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct.toFixed(1)}%"></i></div></li>`;
    }).join('')}</ul><p class="craft-n muted">Опыт ремесла даёт работа в промысле городов. Каждый уровень — +2% к скорости работы.</p>`;
  }
  function xsHtml(x, h) {
    const v = (k) => (k === 'critDmg' ? '×' + String(x.critX || 1.5).replace('.', ',') : String(x[k] ?? 0).replace('.', ',') + (XPCT[k] ? '%' : ''));
    const cell = (k) => `<div class="stat x${x[k + 'Over'] != null ? ' capped' : ''}" data-k="${k}" data-stat="${k}" tabindex="0">${ico(k)}<dt>${esc(stLabel(k))}</dt><dd>${v(k)}</dd></div>`;
    const tb = (id, label) => `<button type="button" class="xst-t" data-xtab="${id}" aria-selected="${xTab === id}" role="tab">${label}</button>`;
    return `<div class="xst"><div class="xst-h" role="tablist">${tb('fight', 'Боевые характеристики')}${tb('craft', 'Ремесло')}<span class="xst-b" title="Видно только тестерам, пока стример не откроет всем">тест</span></div>`
      + (xTab === 'craft' ? craftHtml(h) : `<dl class="stats xstats">${Object.keys(XST).map(cell).join('')}</dl>`) + `</div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-xtab]'); if (!b || xTab === b.dataset.xtab) return;
    xTab = b.dataset.xtab; try { localStorage.setItem('lgXTab', xTab); } catch {}
    const box = b.closest('.xst'), h = (TIPHERO || (ME && ME.hero)); if (!box || !h || !h.xs) return;
    box.outerHTML = xsHtml(h.xs, h);
  });
  function tipShow(el) {
    tip.classList.remove('card', 'scroll');
    if (el.dataset.stat) { const html = statTip(el.dataset.stat); if (!html || DR.active) return tipHide(); tipFor = el; tip.innerHTML = html; tip.hidden = false; tip.dataset.r = 'common'; return tipPlace(el); }
    const it = TIPS[el.dataset.sel]; if (!it || !TIPHERO || DR.active) return tipHide();
    tipFor = el; tip.innerHTML = tipHtml(it, TIPHERO); tip.hidden = false; tip.dataset.r = it.rarity || 'common';
    tipPlace(el);
  }
  function tipPlace(el) {
    el.setAttribute('aria-describedby', 'lg-tip');
    tip.classList.toggle('over', !!el.closest('.cy-room, .tr-win'));   // 23.10: и окно обмена   // 22.10: в зале «Города» (аукцион) — поверх окна зала
    tip.style.maxHeight = '';
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, m = 10, W = window.innerWidth, H = window.innerHeight;
    // 24.10: открытая карточка покупки в лавке (сверху, «Купить…») — не закрываем её: подсказка ниже её края
    const obEl = document.querySelector('.cy-icard.on.pin'), ob = obEl && obEl.getClientRects().length ? obEl.getBoundingClientRect() : null;
    const top0 = ob && ob.bottom <= r.top ? ob.bottom + m : 8;
    let th = tip.offsetHeight;
    let x = r.right + m; if (x + tw > W - 8) x = r.left - tw - m; if (x < 8) x = Math.max(8, Math.min(W - tw - 8, r.left + r.width / 2 - tw / 2));
    let y = r.top; if (x === r.right + m || x === r.left - tw - m) { if (y + th > H - 8) y = H - th - 8; }
    else {
      // 24.10: сверху или снизу от вещи - где больше места; не влезла - ниже ростом и листается, но саму вещь не закрывает
      const up = r.top - m - top0, dn = H - r.bottom - m - 8;
      if (th <= up) y = r.top - th - m; else if (th <= dn) y = r.bottom + m;
      else if (up > dn) { th = Math.max(120, up); tip.style.maxHeight = th + 'px'; y = r.top - th - m; }
      else { th = Math.max(120, dn); tip.style.maxHeight = th + 'px'; y = r.bottom + m; }
    }
    y = Math.max(8, y);
    if (ob && x < ob.right && x + tw > ob.left && y < ob.bottom && y + th > ob.top) y = ob.bottom + m;   // налезает на карточку покупки — ниже неё
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }
  function tipHide() { if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor = null; tip.hidden = true; tip.classList.remove('card', 'scroll'); }
  // 23.10: страховка — подсказка-карточка висит, а мышь уже не над вещью и не над подсказкой (вещь скрылась вместе с окном, pointerleave не пришёл)
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !tipFor || tip.hidden || !tip.classList.contains('card')) return;
    if (!tipFor.isConnected || !tipFor.getClientRects().length || !(tipFor.matches(':hover') || tip.matches(':hover'))) tipHide();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && tipFor) tipHide(); });
  // 23.10: нажатие в любое место мимо вещи — карточка закрывается (подсказка не ловит нажатия: pointer-events: none)
  document.addEventListener('pointerdown', (e) => { if (tipFor && !tip.hidden && tip.classList.contains('card') && !tipFor.contains(e.target) && !tip.contains(e.target)) tipHide(); }, { capture: true, passive: true });
  // 23.10: подсказка-карточка для окон «Города» (наковальня, склад): заголовок и общее тело карточки (itemBody) — заточка, прочность
  function cardTip(el, it, h, o) {   // 23.10: o — как у itemBody (окно обмена: класс оружия всегда)
    if (!el || !it || !h || DR.active) return tipHide();
    // 23.10 (баг зрителя): окно лавки закрывается, а мышь успела навестись на товар — подсказка оставалась висеть вне здания и в других
    // вкладках. Вещь не на экране (окно закрыто/скрыто) — не показываем
    if (!el.isConnected || !el.getClientRects().length || el.closest('[hidden]')) return tipHide();
    if (tipFor && tipFor !== el) tipFor.removeAttribute('aria-describedby');   // 23.10: Склад — подсказка переходит с ячейки на ячейку
    tipFor = el; tip.classList.add('card'); tip.dataset.r = it.rarity || 'common';
    tip.innerHTML = `<div class="t-h"><span class="t-n" data-r="${esc(it.rarity)}">${esc(it.name)}</span>${it.qty ? `<span class="muted">${esc(oreQty(it.q))}</span>` : it.n > 1 ? `<span class="muted">×${it.n}</span>` : ''}</div>
      <div class="t-s"><span class="rar" data-r="${esc(it.rarity)}">${RAR[it.rarity] || ''}</span><span class="muted">${SLOT[it.slot] || ''}</span>${it.on ? `<span class="on">${ico('check')}надето</span>` : ''}</div>${itemBody(it, h, { dur: true, ...(o || {}), tip: true })}`;
    tip.hidden = false; tip.scrollTop = 0; tipPlace(el);
    tip.classList.toggle('scroll', tip.scrollHeight > tip.clientHeight + 1);   // 24.10: не влезла — листается (иначе нажатия проходят насквозь)
  }
  // 22.10: подсказки вешаются на любой контейнер — окно персонажа и зал аукциона (CX.tips): вещь (data-sel) и характеристика (data-stat)
  function tipOn(root) {
    if (!root || root.dataset.tips) return; root.dataset.tips = '1';
    const SEL = '.cell[data-sel], .slot.full[data-sel], [data-stat]';
    root.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const el = e.target.closest(SEL); if (el && el !== tipFor) tipShow(el); });
    root.addEventListener('pointerout', (e) => { if (!tipFor) return; const to = e.relatedTarget; if (!to || !tipFor.contains(to)) tipHide(); });
    root.addEventListener('click', (e) => { const el = e.target.closest('[data-stat]'); if (el) { if (tipFor === el) tipHide(); else tipShow(el); } });   // на телефоне — по нажатию
    root.addEventListener('focusin', (e) => { const el = e.target.closest(SEL); if (el && el.matches(':focus-visible')) tipShow(el); });
    root.addEventListener('focusout', tipHide);
    root.addEventListener('pointerdown', tipHide);
  }
  tipOn(heroTab);
  window.addEventListener('scroll', tipHide, { passive: true });

  function closeSheet() { if (!sheet) return; sheet = false; const d = $('.detail'), s = $('.scrim'); if (d) d.classList.remove('open'); if (s) s.classList.remove('open'); }
  // крестик карточки: на телефоне — закрыть шторку, на широком экране — снять выбор (карточка показывает подсказку)
  function closeDetail() { if (!mqWide.matches) return closeSheet(); if (sel) { sel = null; renderHero(); } }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.querySelector('.ctxm')) closeDetail(); });

  // 17.10: броня, шлем и щит — для какого класса; в чужом — штраф к главному урону (как в игре)
  function gearLine(it, h) {
    try {
      const PEN = GD.GEAR_PEN; if (!PEN[it.slot]) return '';
      // кому подходит: «легионера и паладина» (новые классы - тем, кому они открыты), «мага, жреца и некроманта»
      const nb = betaOpen(h), whom = (f) => { const a = GD.classes().filter((c) => f(c) && (nb || !c.beta)).map((c) => c.gen); return a.length > 1 ? a.slice(0, -1).join(', ') + ' и ' + a[a.length - 1] : a[0] || ''; };
      const g = it.slot === 'shield' ? 'heavy' : it.gear || 'any', RU = { heavy: whom((c) => c.gear === 'heavy'), light: whom((c) => c.gear === 'light'), cloth: whom((c) => c.gear === 'cloth'), any: 'всех классов' };
      const want = GD.classGear(h.role);
      const bad = want && (it.slot === 'shield' ? !GD.shieldOk(h.role) : g !== 'any' && g !== want);
      const st = GD.mainStat(h.role) === 'mag' ? 'маг. урона' : 'физ. урона';
      return `<p class="d-gear${bad ? ' bad' : ''}">${it.slot === 'shield' ? `Щит — для ${whom((c) => c.shield)}` : `Снаряжение для ${RU[g] || RU.any}`}${bad ? `<br><b>Не для твоего класса: −${PEN[it.slot]}% ${st}${it.on ? '' : ', если надеть'}</b>` : ''}</p>`;
    } catch (e) { return ''; }
  }
  /* ---------- 22.10: прочность снаряжения (legionary/durability.js). dur — 1…100 (нет — целая). 23.10: дойдёт до 0 при гибели — вещь
     исчезнет навсегда; low — прочность ≤ 30%: красный значок и предупреждение везде ---------- */
  const REP0 = { ...GD.repair }, RARI = GD.RARITIES;   // таблица починки по умолчанию (пока комната не прислала свою) - durability.js
  const REP = () => ({ ...REP0, ...((ME && ME.ench && ME.ench.rep) || {}) });
  function repPrice(it) {   // как repairPrice в durability.js; итог считает игра
    if (!it || it.dur == null) return 0; const R = REP(), lost = 100 - Math.max(0, Math.min(100, +it.dur));
    return Math.max(Math.round(R.min), Math.round((R.base[Math.max(0, RARI.indexOf(it.rarity))] || 60) * (1 + (+it.en || 0) * R.enPct / 100) * lost / 100));
  }
  const lowD = (it) => !!it && it.dur != null && (it.low || +it.dur <= REP().low);
  const LOWT = (d) => `Прочность ${d}% — если дойдёт до 0, вещь исчезнет навсегда. Почини у кузнеца`;
  const durBadge = (it) => (it && it.dur != null ? `<span class="dur${lowD(it) ? ' br' : ''}" title="${lowD(it) ? LOWT(it.dur) : `Прочность ${it.dur}%`}">${lowD(it) ? '⚠ ' : ''}${it.dur}%</span>` : '');
  const durAria = (it) => (it && it.dur != null ? `, прочность ${it.dur}%${lowD(it) ? ' — может исчезнуть' : ''}` : '');
  const durLine = (it) => (it && it.dur != null ? `<p class="d-dur${lowD(it) ? ' br' : ''}">${lowD(it) ? `<b>⚠ ${LOWT(it.dur)}</b>` : `Повреждена: прочность <b>${it.dur}%</b> — работает полностью. Дойдёт до 0 при гибели — исчезнет навсегда`}</p>` : '');
  function repBtn(it, h) {
    if (!it.wearable || it.dur == null || REP().on === false) return '';
    const p = repPrice(it), debt = +h.debt > 0 || (+h.money || 0) < 0, poor = debt || (+h.money || 0) < p;
    return `<button type="button" class="btn ${lowD(it) ? 'primary' : 'ghost'} wide rep-btn" data-repair="${esc(it.uids ? it.uids[0] : it.uid)}"${h.busy || poor ? ' disabled' : ''}>${ico('hammer')}Починить — ${money(p)}</button>${debt ? '<p class="note">В долг кузнец не чинит.</p>' : poor ? lackHtml(p, h.money) : h.busy ? `<p class="note">Идёт бой — чинить после боя.</p>` : '<p class="note muted">Или на стриме в Кузне Ярмарки: <b class="cmd">починить всё</b></p>'}`;
  }
  function repAllHtml(h) {
    const bad = h.items.filter((x) => x.wearable && x.dur != null); if (!bad.length || REP().on === false) return '';
    const br = bad.filter(lowD).length, sum = bad.reduce((a, x) => a + repPrice(x), 0);
    return `<div class="repl${br ? ' br' : ''}" role="note"><span>${br ? `<b>⚠ Почти сломано (≤${REP().low}%): ${br} — дойдёт до 0, исчезнет навсегда</b>` : ''}${br && bad.length > br ? ' · ' : ''}${bad.length > br ? `повреждено: ${bad.length - br}` : ''}</span><button type="button" class="btn ghost" data-repall${h.busy || +h.debt > 0 || (+h.money || 0) < Math.min(...bad.map(repPrice)) ? ' disabled' : ''}>${ico('hammer')}Починить всё — ${money(sum)}</button></div>`;
  }
  // у наковальни в «Городе» — для всех (даже пока заточка закрыта): что повреждено и «починить»
  function repBlockHtml(h) {
    const bad = h.items.filter((x) => x.wearable && x.dur != null).sort((a, b) => (b.on - a.on) || (a.dur - b.dur));
    if (!bad.length || REP().on === false) return '<p class="note">Кузнец чинит снаряжение, испорченное при гибели. Сейчас у тебя всё целое.</p>';
    return `<div class="rep-box"><h3 class="h3">${ico('hammer')}Починка</h3>${repAllHtml(h)}<ul class="rep-list">${bad.map((it) => `<li><span data-r="${esc(it.rarity)}">${esc(it.name)}</span><em class="${lowD(it) ? 'br' : ''}">${lowD(it) ? '⚠ ' : ''}${it.dur}%</em><button type="button" class="btn ghost" data-repair="${esc(it.uid)}"${h.busy || (+h.money || 0) < repPrice(it) ? ' disabled' : ''}>${money(repPrice(it))}</button></li>`).join('')}</ul></div>`;
  }
  function repBind(el) {
    el.querySelectorAll('[data-repair]').forEach((b) => b.onclick = () => act('/api/repair', { uid: b.dataset.repair }, 'Кузнец починил', b));
    el.querySelectorAll('[data-repall]').forEach((b) => b.onclick = () => act('/api/repair', { all: true }, 'Кузнец починил', b));
  }
  /* 22.10: тело карточки вещи — характеристики (с подсказкой по нажатию и сравнением с надетым), эффект, описание, аура легендарки,
     тип брони, класс оружия, заточка и её прибавки, пометка «куплено за баллы» (pts), прочность. Одно на окно персонажа и аукцион (auction.js зовёт через CX.itemBody),
     чтобы вещь везде выглядела одинаково. Новые характеристики — только если открыты герою (h.xs), как везде на сайте.
     o: { bonus — таблица прибавок заточки (по умолчанию — Кузни), cls — всегда писать класс оружия, dur — целой вещи писать «прочность 100%»,
          verdict — итог сравнения «в целом лучше / слабее» по весам сумки (аукцион, PR #37) }.
     Прочность — durLine (death-rework; 23.10: ≤30% — предупреждение «исчезнет навсегда») */
  function itemBody(it, h, o = {}) {
    const dv = deltas(it, h), eff = effText(it);
    const roles = (ME && ME.roles) || {};
    const roleChange = it.slot === 'weapon' && it.role && !it.on && it.role !== h.role ? roleOf(it.role, roles[it.role]) : null;
    const b = it.en > 0 ? (o.bonus || EN().bonus)[Math.min(15, it.en)] || 0 : 0, bx = Math.round(b / 4 * 10) / 10;
    const P = {
      st: dv.rows.length ? `<ul class="d-st">${dv.rows.map((r) => `<li${XST[r.k] ? ' class="xr"' : ''} data-stat="${r.k}" tabindex="0">${ico(r.k)}<span>${esc(stLabel(r.k))}</span><b>${stNum(r.k, r.v)}</b>${dv.c && r.dv ? `<em class="${r.dv > 0 ? 'up' : 'dn'}">${r.dv > 0 ? '+' : '−'}${String(Math.abs(r.dv)).replace('.', ',')}</em>` : dv.c ? '<em class="eq">=</em>' : ''}</li>`).join('')}</ul>` : '',
      eff: eff ? `<p class="d-eff">${esc(eff[0].toUpperCase() + eff.slice(1))}</p>` : '',
      lore: window.LG_LORE ? LG_LORE.html(it, true) : it.desc ? `<p class="d-desc">${esc(it.desc)}</p>` : '',
      au: auraLine(it, 'd-au'),
      cmp: dv.c ? `<p class="d-cmp">Сравнение с надетым: <b>${esc(dv.c.name)}</b>${o.verdict ? (dv.score > 0.01 ? ' — в целом <b class="up">лучше</b>' : dv.score < -0.01 ? ' — в целом <b class="dn">слабее</b>' : '') : ''}</p>` : '',
      gear: gearLine(it, h),
      role: (roleChange ? `<p class="d-role">С этим оружием станешь: <b>${esc(roleChange)}</b></p>` : o.cls && it.slot === 'weapon' && it.role ? `<p class="d-role">Оружие класса: <b>${esc(roleOf(it.role, roles[it.role]))}</b></p>` : '')
        + (it.slot !== 'weapon' && it.role ? `<p class="d-role">Вещь класса <b>${esc(roleOf(it.role, roles[it.role]))}</b>: бонус к навыкам — только герою этого класса${it.role === h.role ? ' (твой класс)' : ''}</p>` : ''),
      en: it.en > 0 ? `<p class="d-en">${ico('hammer')}Заточка +${it.en}: характеристики +${b}%${dv.rows.some((r) => XST[r.k] && r.v > 0) ? `, боевые (крит, уклонение…) +${String(bx).replace('.', ',')}%` : ''}</p>` : '',
      pts: it.pts ? '<p class="d-pts">Куплено за баллы канала — лавка Ярмарки такую вещь не берёт</p>' : '',
      dur: `${durLine(it)}` + (it.dur == null && o.dur && (it.wearable || SLOTS.includes(it.slot)) ? '<p class="d-dur ok">Прочность 100% — целая</p>' : ''),
    };
    // 23.10 (просьба стримера): подсказка-карточка (o.tip) — главное сверху: характеристики (со сравнением), сразу за ними эффект, аура, заточка;
    // всё остальное — описание, сравнение с надетым, класс, прочность, история — ниже, мелко и приглушённо (.d-q)
    if (o.tip) { const q = P.lore + P.cmp + P.gear + P.role + P.pts + P.dur; return P.st + P.eff + P.au + P.en + (q ? `<div class="d-q">${q}</div>` : ''); }
    return [P.st, P.eff, P.lore, P.au, P.cmp, P.gear, P.role, P.en, P.pts, P.dur].join('');
  }
  function detailHtml(it, h) {
    const dv = deltas(it, h);
    const act = h.ghost ? `<p class="note">${ico('ghost')}Призрак не переодевается — дождись воскрешения.</p>`
      : it.wearable && h.busy ? `<p class="note busyn">⚔ ${BUSY_NOTE}.</p>`
      : it.id === 'metamorph_seal' && ME && ME.seal ? `<button type="button" class="btn primary wide" data-seal="${esc(it.uids[0])}">Применить печать</button><p class="note relicn">✦ Выбери стиль героя: печать сгорит, у героя будет свой стиль - смена стиля канала его не тронет.</p>`   // 26.10: новинка «seal»
      : it.relic || it.slot === 'relic' ? `<p class="note relicn">✦ Использовать пока нельзя — печать хранится в сумке.</p>`
      : it.mat === 'ore' ? `<p class="note use"><span>${esc(oreQty(it.q))} — добыто в шахте (100 осколков — 1 шт.). Продать — скупщику Грому в шахте: окно у прилавка. Хранить — на складе в «Городе».</span></p>`   // 26.10: руда шахты
      : it.slot === 'material' ? `<p class="note use"><span>Материал заточки. Выбери оружие или снаряжение и нажми «Заточка» — или на стриме в Кузне: <b class="cmd">точить 3 ${it.mat === 'seal' ? 'печать' : it.mat === 'star' ? 'звезда' : 'сфера'}</b>${it.mat === 'seal' ? `<br>Гарантирует успех до +${+it.seal || 5}. ${EN().craftN} печати ${+it.seal || 5} куются в печать ${(+it.seal || 5) + 1} — в окне заточки.` : ''}</span></p>`
      : edible(it) ? `<button type="button" class="btn primary wide" data-use="${esc(it.uids[0])}"${eatCd(it, h) ? ' disabled' : ''}>${eatVerb(it)}</button><p class="note use">` + `<span>${useCmd(it) ? `Или на стриме: <b class="cmd">${useCmd(it)}</b>` : ''}${eatCd(it, h) ? `<br><span class="eatcd-t">⏳ Еда и зелья будут готовы через <b data-eat="${cdUntil(it, h)}">${mmss(cdUntil(it, h))}</b></span>` : ''}</span></p>`
      : !it.wearable ? `<p class="note use"><span>${useCmd(it) ? `На стриме напиши в чат: <b class="cmd">${useCmd(it)}</b>` : 'Используется на стриме командой в чате.'}${eatCd(it, h) ? `<br><span class="eatcd-t">⏳ ${it.effect && it.effect.revive ? 'Свиток можно будет прочитать' : 'Еда и зелья будут готовы'} через <b data-eat="${cdUntil(it, h)}">${mmss(cdUntil(it, h))}</b></span>` : (it.slot === 'food' || it.slot === 'potion') ? '<br><span class="muted">Съел или выпил — вся еда и зелья ждут 3 минуты.</span>' : it.effect && it.effect.revive ? '<br><span class="muted">Свиток возрождения — не чаще раза в час.</span>' : ''}</span></p>`
      : it.on ? `<button type="button" class="btn ghost wide" data-off="${it.slot}">${word('take', 'Снять')}</button>`
      : `<button type="button" class="btn primary wide" data-on="${esc(it.uids[0])}">${dv.c ? 'Заменить' : word('wear', 'Надеть')}</button>`;
    return `<button type="button" class="x" data-close aria-label="Закрыть">${ico('x')}</button>
      <div class="d-art" data-r="${esc(it.rarity)}">${lgx(it)}${art(it)}</div>
      <div class="d-h"><span class="rar" data-r="${esc(it.rarity)}">${RAR[it.rarity] || ''}</span><span class="muted">${SLOT[it.slot] || ''}</span>${it.on ? `<span class="on">${ico('check')}надето</span>` : ''}${it.qty ? `<span class="muted">${esc(oreQty(it.q))}</span>` : it.n > 1 ? `<span class="muted">×${it.n}</span>` : ''}</div>
      <h2 class="d-n">${esc(it.name)}</h2>
      ${itemBody(it, h)}
      <div class="d-a">${act}${repBtn(it, h)}${canEnch(it) && !h.ghost && h.ef ? `<button type="button" class="btn ghost wide fg-btn" data-forge="${esc(it.uids[0])}">${ico('hammer')}${it.en >= EN().max ? 'Заточка — предел' : 'Заточка'}</button>` : ''}</div>`;
  }

  // 20.10: что нужно «Навыкам» (skills.js) от сайта
  const SKX = { api: (p, b) => api(p, b), act: (p, b, ok, btn) => act(p, b, ok, btn), esc, plural, money: (n, r) => money(n, r), roleOf: (id, fb) => roleOf(id, fb), rerender: () => { last = ''; renderHero(); } };
  // 24.10 (баг тестера): одна запись денег везде — крупные единицы слева, через пробел: «10 серебряных рыбок 5 чешуек».
  // 25.10: сама запись — packages/site-ui (money / moneyText / lack / bal); здесь — только монеты стиля канала
  const coins = () => part('coins');
  function money(n, ref) { return SU.money(n, ref, coins); }
  const moneyText = (n, ref) => SU.moneyText(n, ref, coins);
  // «У тебя: … / Не хватает: …» — две строки обычным текстом (лавки, Кузня, склад, аукцион)
  const lackHtml = (price, have, cls = '') => SU.lack(price, have, cls, coins);
  // 24.10: кошелёк рядом с ценой: хватает — «У тебя: …», не хватает — «У тебя / Не хватает»
  const balHtml = (price, have, cls = '') => SU.bal(price, have, cls, coins);
  // сколько осталось до воскрешения: «3 д 04:12:55»
  function left(t) { const ms = (+t || 0) - now(); if (!t) return 'скоро'; if (ms <= 0) return 'вот-вот…'; const d = Math.floor(ms / 864e5), hh = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4), sec = Math.floor((ms % 6e4) / 1e3), p = (x) => String(x).padStart(2, '0'); return (d ? d + ' д ' : '') + `${p(hh)}:${p(m)}:${p(sec)}`; }
  setInterval(() => { if (document.hidden) return; $$('.cd[data-until]').forEach((e) => { const t = left(+e.dataset.until); if (e.textContent !== t) e.textContent = t; if (+e.dataset.until && +e.dataset.until < now() - 15000 && !left.reload) { left.reload = true; last = ''; load().then(() => { left.reload = false; }); } }); }, 1000);

  function ctxClose() { const m = document.querySelector('.ctxm'); if (m) m.remove(); document.removeEventListener('pointerdown', ctxOut, true); window.removeEventListener('scroll', ctxClose, true); document.removeEventListener('keydown', ctxKey, true); }
  function ctxOut(e) { if (!e.target.closest('.ctxm')) ctxClose(); }
  function ctxKey(e) { if (e.key === 'Escape') ctxClose(); }
  function ctxMenu(x, y, it, h, more) {   // 28.10: more.discard - пункт «Выбросить» (сумка вкладки «Поход»)
    ctxClose();
    const uid = it.uids ? it.uids[0] : it.uid, rows = [], cur = it.slot ? equipped(h, it.slot) : null;
    if (h.ghost) rows.push({ t: 'Призрак — ничего нельзя', off: true });
    else if (it.wearable) {
      if (it.on) rows.push(h.busy ? { t: 'Снять — в бою нельзя', off: true } : { t: 'Снять', fn: () => act('/api/unequip', { slot: it.slot }, word('off', 'Снято')) });
      else rows.push(h.busy ? { t: (cur ? 'Заменить' : 'Надеть') + ' — в бою нельзя', off: true } : { t: cur ? `Заменить «${cur.name}»` : 'Надеть', main: true, fn: () => act('/api/equip', { uid }, word('on', 'Надето')) });
    } else if (edible(it)) rows.push(eatCd(it, h) ? { t: `${eatVerb(it)} — ещё не готово (${mmss(cdUntil(it, h))})`, off: true } : { t: eatVerb(it), main: true, fn: () => act('/api/use', { uid }, eatVerb(it) === 'Выпить' ? 'Выпито' : 'Съедено') });
    else if (it.effect && it.effect.revive) rows.push({ t: 'Свиток — командой на стриме', off: true });
    else if (it.id === 'metamorph_seal' && ME && ME.seal) rows.push(h.busy ? { t: 'Применить печать - в бою нельзя', off: true } : { t: 'Применить печать', main: true, fn: () => sealPick(uid) });   // 26.10: новинка «seal»
    else if (it.relic || it.slot === 'relic') rows.push({ t: 'Пока недоступно', off: true });
    if (canEnch(it) && !h.ghost && h.ef) rows.push({ t: 'Заточка', fn: () => forgeOpen(uid) });
    if (it.wearable && it.dur != null) rows.push(h.busy ? { t: 'Починить — в бою нельзя', off: true } : { t: `Починить (${repPrice(it)} бронзы)`, fn: () => act('/api/repair', { uid }, 'Кузнец починил') });   // 22.10
    if (more && more.discard && !it.on) { const why = GD.discardWhy ? GD.discardWhy(it) : ''; rows.push(why ? { t: 'Выбросить - ' + why, off: true } : { t: '🗑 Выбросить…', fn: () => more.discard(uid) }); }
    rows.push({ t: 'Подробнее', fn: () => { sel = uid; sheet = !mqWide.matches; renderHero(); } });
    const m = document.createElement('div'); m.className = 'ctxm'; m.setAttribute('role', 'menu');
    m.innerHTML = `<div class="ctxh">${esc(it.name)}</div>` + rows.map((r, i) => `<button type="button" role="menuitem" data-i="${i}"${r.off ? ' disabled' : ''} class="${r.main ? 'main' : ''}">${esc(r.t)}</button>`).join('');
    document.body.appendChild(m);
    const W0 = window.innerWidth, H0 = window.innerHeight, bw = m.offsetWidth, bh = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(x, W0 - bw - 8)) + 'px'; m.style.top = Math.max(8, Math.min(y, H0 - bh - 8)) + 'px';
    m.querySelectorAll('button[data-i]').forEach((b) => b.onclick = () => { const r = rows[+b.dataset.i]; ctxClose(); if (r && r.fn) r.fn(); });
    const first = m.querySelector('button:not([disabled])'); if (first) first.focus();
    setTimeout(() => { document.addEventListener('pointerdown', ctxOut, true); window.addEventListener('scroll', ctxClose, true); document.addEventListener('keydown', ctxKey, true); }, 0);
  }
  async function act(p, body, ok, btn) {
    if (busy) return; busy = true;
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Секунду…'; }
    const r = await api(p, body); busy = false;
    if (!r.ok) { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; } return toast(r.error || 'Не получилось', true); }
    // съел одну из стопки — карточка остаётся на той же стопке (а не пропадает, будто съедена вся)
    if (p === '/api/use' && r.hero) { const was = TIPS[body.uid] || (ME.hero && ME.hero.items.find((x) => x.uid === body.uid)); const next = was && r.hero.items.find((x) => x.id === was.id && !x.on); sel = next ? next.uid : null; if (!next) sheet = false; }
    if (r.hero) ME.hero = r.hero;   // 24.10: ответ без героя не стирает героя (иначе вкладка падала, а кнопка оставалась «Секунду…»)
    last = ''; renderHero(); toast(ok);
    // 19.10: вместо мигающей плашки — уведомление, и только если игра стримера долго не подтверждает (комната не в сети)
    clearTimeout(act.pt); if (r.hero && r.hero.pending) act.pt = setTimeout(() => { if (ME && ME.hero && ME.hero.pending) toast('Сохранено — применится, когда игра стримера будет в сети'); }, 6000);
  }

  /* ---------- 20.10: Кузня — заточка вещи (+1…+15), ковка Печати Ауруса, звёзды и сферы за монеты ----------
     Шанс и цену показываем по таблицам игры (ME.ench — их шлёт игра стримера); бросок и списание — в игре (legionary/enchant.js),
     итог приходит в results[].x. Окно поверх страницы: Esc и крестик закрывают, фокус возвращается на кнопку. Анимация — transform/opacity */
  const ENCH0 = { on: true, ...GD.enchant };   // таблицы заточки по умолчанию (пока комната не прислала свои) - enchant.js
  const EN = () => ({ ...ENCH0, ...((ME && ME.ench) || {}) });
  const canEnch = (it) => !!(it && it.wearable && (EN().slots || ENCH0.slots).includes(it.slot));
  const fmtPct = (x) => String(Math.round((+x || 0) * 10) / 10).replace('.', ',') + '%';
  const FG = { uid: null, way: 'plain', wait: null, sure: 0, res: null, el: null, back: null, gone: null, busyAt: 0, waitAt: 0, queued: false };
  // 25.10 (баг-репорты «зависло "Кузнец работает…"», «занято предыдущим, но ничего не точится»): сверка с очередью шлюза (ME.fq):
  // итог потерялся (заказа в очереди нет, итога не пришло) - снимаем ожидание; после перезагрузки страницы заказ ещё в очереди - показываем его;
  // заказ ждёт игру стримера (комнате не отдан) - можно отменить
  function fgSync() {
    const q = ME && Array.isArray(ME.fq) ? ME.fq : null; if (!q) return;   // старый шлюз - как раньше
    if (FG.wait && !q.some((x) => x.id === FG.wait) && !shownRes.has(FG.wait) && Date.now() - FG.waitAt > 15000) {
      FG.wait = null; FG.queued = false; FG.res = { cls: 'err', t: 'Итог не дошёл до страницы - кузнец уже закончил: посмотри вещь в сумке' };
      try { if (window.LGCity && window.LGCity.forgeCancel) window.LGCity.forgeCancel(); } catch {}
    }
    if (!FG.wait && q.length) { FG.wait = q[0].id; FG.waitAt = Date.now(); }
    FG.queued = !!(FG.wait && q.some((x) => x.id === FG.wait && !x.s));
  }
  async function fgCancel() {
    const r = await api('/api/enchant', { cancel: 1 });
    if (r && Array.isArray(r.fq)) ME.fq = r.fq;
    if (r && r.ok) { FG.wait = null; FG.queued = false; FG.res = { cls: 'save', t: 'Заказ отменён - монеты и материалы не тронуты' }; try { if (window.LGCity && window.LGCity.forgeCancel) window.LGCity.forgeCancel(); } catch {} }
    else { FG.res = { cls: 'err', t: (r && r.error) || 'Не получилось' }; fgSync(); }
    fgRender();
  }
  function matsOf(h) {
    const m = { star: 0, sphere: 0, seals: {} };
    for (const it of (h && h.items) || []) { if (it.mat === 'star') m.star++; else if (it.mat === 'sphere') m.sphere++; else if (it.mat === 'seal' && it.seal) m.seals[it.seal] = (m.seals[it.seal] || 0) + 1; }
    return m;
  }
  // что будет при заточке этим способом (как quote() в игре)
  function enchQuote(it, h, way) {
    const E = EN(), en = +it.en || 0, tg = en + 1, m = matsOf(h);
    const q = { en, tg, way, price: Math.max(E.priceMin, Math.round((+it.v || 0) * (E.price[tg] || 0) / 100)), chance: 0, fail: 'break', err: '' };
    if (en >= E.max) return { ...q, err: 'Вещь заточена до предела' };
    if (way === 'seal') {
      const own = Object.keys(m.seals).map(Number), lv = own.filter((n) => n >= tg && n >= E.sealMin).sort((a, b) => a - b)[0];
      if (!lv) return { ...q, chance: 100, fail: 'none', err: own.length ? `Нужна Печать Ауруса ${Math.max(tg, E.sealMin)} или старше` : 'Нет Печати Ауруса — она только выпадает (босс, данж)' };
      Object.assign(q, { seal: lv, chance: 100, fail: 'none' });
    } else {
      const star = way === 'star' || way === 'both', sph = way === 'sphere' || way === 'both';
      q.chance = Math.min(100, (E.chance[tg] || 0) + (star ? E.star : 0)); q.fail = sph ? 'down' : 'break';
      if (star && !m.star) q.err = 'Нет Счастливой звезды'; else if (sph && !m.sphere) q.err = 'Нет Сферы сохранения';
      else if (q.chance <= 0) q.err = `На +${tg} без звезды не заточить`;
    }
    if (!q.err && (+h.money || 0) < q.price) { q.err = 'Не хватает монет'; q.lack = 1; }
    return q;
  }
  const enchStatsN = (base, en, bonus) => { const b = en > 0 ? (bonus || EN().bonus)[Math.min(15, en)] || 0 : 0, o = {}; for (const [k, v] of Object.entries(base || {})) o[k] = b && v > 0 ? Math.round(v * (1 + (XST[k] ? b / 4 : b) / 100)) : v; return o; };   // 20.10: крит и т. п. — вчетверо медленнее
  // название в стиле сайта + «+N» (вещь из нового ответа сервера ещё не переименована renderHero)
  const fgName = (it) => { const n = names().items, own = n && n[it.id] && n[it.id].name; return (own || it.baseName || it.srvName || String(it.name || '').replace(/ \+\d+$/, '')) + (it.en > 0 ? ' +' + it.en : ''); };
  // 20.10: host — окно внутри панели Кузни «Города» (без затемнения страницы и ловушки фокуса)
  function forgeOpen(uid, host) {
    if (!ME || !ME.hero) return;
    ctxClose(); FG.uid = uid; FG.res = null; FG.sure = 0; FG.gone = null;
    FG.back = document.activeElement;
    if (FG.el && (FG.host || null) !== (host || null)) forgeClose();
    if (!FG.el) {
      FG.el = document.createElement('div'); FG.el.className = 'fg-wrap' + (host ? ' fg-in' : '');
      FG.el.addEventListener('click', fgClick);
      FG.host = host || null;
      (host || document.body).appendChild(FG.el);
      if (!host) document.addEventListener('keydown', fgKey);
    }
    if (host) { fgRender(); return; }
    fgRender();
    const f = FG.el.querySelector('[data-fgo]:not([disabled]), [data-way]'); if (f) f.focus();
  }
  function forgeClose() {
    if (!FG.el) return;
    FG.el.remove(); FG.el = null; FG.uid = null; FG.res = null; FG.sure = 0; FG.gone = null;
    const was = FG.host; FG.host = null; if (was) return;
    document.removeEventListener('keydown', fgKey);
    try { if (FG.back && document.contains(FG.back)) FG.back.focus(); } catch {}
  }
  function fgKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); forgeClose(); return; }
    if (e.key === 'Tab' && FG.el) {   // фокус не уходит из окна
      const f = $$('button:not([disabled]), summary', FG.el); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  const WAYS = [['plain', 'Обычная'], ['star', 'Звезда'], ['sphere', 'Сфера'], ['both', 'Звезда + сфера'], ['seal', 'Печать']];
  const FAIL = { break: ['bad', 'вещь сломается и исчезнет'], down: ['save', 'заточка −1, вещь цела'], none: ['ok', 'неудачи не бывает'] };
  function fgRender() {
    if (!FG.el) return;
    const h = ME && ME.hero; if (!h) return forgeClose();
    const it0 = h.items.find((x) => x.uid === FG.uid);
    // вещь сломалась — окно показывает итог с прежней вещью, пока его не закроют
    const it = it0 || FG.gone; if (!it) return forgeClose();
    if (it0) FG.gone = { ...it0 };
    const E = EN(), m = matsOf(h), q = enchQuote(it, h, FG.way), wait = !!FG.wait, broken = !it0;
    const base = it.stats0 || it.stats || {}, now = enchStatsN(base, q.en), nx = enchStatsN(base, Math.min(E.max, q.tg));
    const keys = Object.keys(base).filter((k) => stOk(k, h) && base[k]);
    const sealOwn = Object.keys(m.seals).map(Number).sort((a, b) => a - b);
    const wayLbl = (k, l) => k === 'star' ? `${l} <small>×${m.star}</small>` : k === 'sphere' ? `${l} <small>×${m.sphere}</small>` : k === 'both' ? `${l} <small>${Math.min(m.star, m.sphere) ? '' : '—'}</small>` : k === 'seal' ? `${l} <small>${sealOwn.length ? sealOwn.map((n) => n).join(', ') : '—'}</small>` : l;
    const off = h.ghost ? 'Призрак не может точить' : h.busy ? 'Идёт бой на стриме — точить можно после боя' : !E.on ? 'Заточка выключена' : '';
    const [fc, ft] = FAIL[q.fail] || FAIL.break, danger = q.fail === 'break' && FG.sure > Date.now();
    const qd = wait && FG.queued ? `<p class="note" role="note">Заказ ждёт игру стримера: кузнец ударит, когда она будет в сети.</p><button type="button" class="btn ghost sm wide" data-fcancel>Отменить заказ</button>` : '';   // 25.10
    const go = broken ? `<button type="button" class="btn ghost wide" data-fclose>Закрыть</button>`
      : `<button type="button" class="btn primary wide${danger ? ' fg-sure' : ''}" data-fgo${off || q.err || wait ? ' disabled' : ''}>${wait ? 'Кузнец работает…' : danger ? 'Точно? Вещь может сломаться' : q.en >= E.max ? 'Предел заточки' : `${ico('hammer')}Точить до +${q.tg}`}</button>`;
    const R = FG.res;
    const crafts = []; for (let n = E.sealMin + 1; n <= E.max; n++) if ((m.seals[n - 1] || 0) >= E.craftN) crafts.push(n);
    FG.el.innerHTML = `<div class="fg-scrim" data-fclose></div>
      <section class="fg panel" role="dialog" aria-modal="true" aria-labelledby="fgT">
        <button type="button" class="x fg-x" data-fclose aria-label="Закрыть">${ico('x')}</button>
        <h2 class="h2" id="fgT">${ico('hammer')}Кузня — заточка</h2>
        <div class="fg-item">
          <div class="fg-art${wait ? ' work' : ''}${R && R.cls ? ' ' + R.cls : ''}" data-r="${esc(it.rarity)}">${lgx(it)}${art(it)}${R && R.anim ? `<i class="fg-fx ${R.cls}" aria-hidden="true"></i>` : ''}</div>
          <div class="fg-nm"><b data-r="${esc(it.rarity)}">${esc(fgName(it))}</b><span class="muted">${esc(SLOT[it.slot] || '')}${q.en < E.max && !broken ? ` · следующий уровень <b class="fg-tg">+${q.tg}</b>` : ''}</span></div>
        </div>
        ${R ? `<div class="fg-res ${R.cls}${R.anim ? ' go' : ''}" role="status"><b>${esc(R.big || '')}</b><span>${esc(R.t || '')}</span></div>` : '<div class="fg-res" role="status"></div>'}
        ${broken ? '' : `${keys.length && q.en < E.max ? `<ul class="fg-st">${keys.map((k) => `<li>${ico(k)}<span>${esc(stLabel(k))}</span><b>${stNum(k, now[k])}</b><em>→ ${stNum(k, nx[k])}</em></li>`).join('')}</ul>` : ''}
        <div class="filters fg-ways" role="radiogroup" aria-label="Способ заточки">${WAYS.map(([k, l]) => `<button type="button" role="radio" data-way="${k}" aria-checked="${FG.way === k}" aria-pressed="${FG.way === k}">${wayLbl(k, l)}</button>`).join('')}</div>
        <dl class="fg-q">
          <div><dt>Шанс</dt><dd class="fg-ch">${q.way === 'seal' && q.seal ? '100%' : fmtPct(q.chance)}</dd></div>
          <div><dt>Цена</dt><dd>${money(q.price)}</dd></div>
          <div><dt>При неудаче</dt><dd class="fg-f ${fc}">${ft}</dd></div>
        </dl>
        ${q.way === 'seal' && q.seal ? `<p class="note">Уйдёт Печать Ауруса ${q.seal} — она гарантирует успех до +${q.seal}.</p>` : q.way === 'star' || q.way === 'both' ? `<p class="note">Счастливая звезда: +${E.star}% к шансу${q.way === 'both' ? ', сфера сбережёт вещь' : ''}.</p>` : q.way === 'sphere' ? '<p class="note">Сфера сохранения: при неудаче вещь не сломается, а потеряет один уровень.</p>' : ''}
        ${q.lack ? lackHtml(q.price, h.money, 'fg-why') : balHtml(q.price, h.money, 'fg-bal')}${off || (q.err && !q.lack) ? `<p class="note fg-why" role="note">${esc(off || q.err)}</p>` : ''}
        <div class="fg-go">${go}${qd}</div>
        <p class="note fg-cmd"><span>На стриме — в Кузне на Ярмарке: <b class="cmd">точить${it.no ? ' ' + it.no : it.on ? ' ' + (GD.WEAR_SLOTS.includes(it.slot) ? GD.SLOT[it.slot].low : '') : ' N'}${{ plain: '', star: ' звезда', sphere: ' сфера', both: ' звезда сфера', seal: ' печать' }[FG.way]}</b></span></p>`}
        <details class="fg-more"${crafts.length ? ' open' : ''}><summary>Материалы: звёзд ${m.star} · сфер ${m.sphere} · печатей ${sealOwn.reduce((a, n) => a + m.seals[n], 0)}</summary>
          <div class="fg-buy">
            <button type="button" class="btn ghost sm" data-buy="star"${(+h.money || 0) < thPrice(h, E.coins.star) || wait || h.ghost ? ' disabled' : ''}><span>Купить звезду · ${money(thPrice(h, E.coins.star))}${thK(h) > 1 ? ` (${thTxt(thK(h))})` : ''}</span></button>
            <button type="button" class="btn ghost sm" data-buy="sphere"${(+h.money || 0) < thPrice(h, E.coins.sphere) || wait || h.ghost ? ' disabled' : ''}><span>Купить сферу · ${money(thPrice(h, E.coins.sphere))}${thK(h) > 1 ? ` (${thTxt(thK(h))})` : ''}</span></button>
          </div>${thNote(h)}
          ${sealOwn.length ? `<p class="note">Печати Ауруса: ${sealOwn.map((n) => `${n} ×${m.seals[n]}`).join(' · ')}</p>` : '<p class="note">Печать Ауруса только выпадает: босс, данж, сокровищницы.</p>'}
          ${crafts.map((n) => `<button type="button" class="btn ghost sm wide" data-craft="${n}"${wait || h.ghost || (+h.money || 0) < E.craftCost * Math.max(1, n - E.sealMin) ? ' disabled' : ''}><span>Сковать Печать Ауруса ${n} · ${E.craftN} × печать ${n - 1} + ${money(E.craftCost * Math.max(1, n - E.sealMin))}</span></button>`).join('')}
        </details>
      </section>`;
    if (R && R.anim) R.anim = false;   // анимация — один раз (следующая перерисовка — без неё)
  }
  // 22.10: воровская наценка — много раз ловили на краже: торговцы (и лавка сайта) продают дороже; покупка — вторым нажатием
  const thK = (h) => (h && +h.thK > 1 ? +h.thK : 1);
  const thPrice = (h, base) => Math.round((+base || 0) * thK(h));
  const thTxt = (k) => '×' + String(k).replace('.', ',');
  const thNote = (h) => (thK(h) > 1 ? `<p class="note thiefl" role="note">Торговцы тебя запомнили: поймали на краже ${h.thN || ''} раз — для тебя цены ${thTxt(thK(h))}.${h.thU ? ` Одна поимка забудется ${new Date(h.thU).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.` : ''}</p>` : '');
  // первое нажатие — показать цену для вора и ждать второго (4 с); true — можно покупать (наценки нет или подтвердили)
  function thArm(btn, h, base) {
    const k = thK(h); if (k <= 1) return true;
    // 25.10: packages/site-ui (once - после подтверждения надпись не возвращаем: кнопку перерисует покупка)
    return SU.confirmTwice(btn, { html: `<span>Для тебя за воровство цена ${thTxt(k)}: ${money(thPrice(h, base))} — нажми ещё раз</span>`, cls: 'arm', once: true });
  }
  window.LGThief = { k: thK, price: thPrice, note: thNote, arm: thArm };
  async function fgPost(path, body) {
    FG.res = null; const r = await api(path, body);
    if (!r.ok) { if (Array.isArray(r.fq) && ME) { ME.fq = r.fq; fgSync(); } FG.res = { cls: 'err', t: r.error || 'Не получилось' }; fgRender(); return null; }
    FG.wait = r.id; FG.waitAt = Date.now(); if (r.hero) { ME.hero = r.hero; last = ''; renderHero(); }
    // 20.10: «Город» — кузнец начинает бить (2–5 ударов по уровню), итог покажет forgeDone
    if (path === '/api/enchant' && window.LGCity) { const it = ME.hero && ME.hero.items.find((x) => x.uid === body.uid); try { window.LGCity.forgeStart(it, ((it && it.en) || 0) + 1); } catch {} }
    fgRender();
    const id = r.id; setTimeout(() => { if (FG.wait === id) toast('Сохранено — кузнец ударит, когда игра стримера будет в сети'); }, 9000);
    // 25.10: итог так и не пришёл (живой канал оборвался и т. п.) - через 30 с спрашиваем заново (и ещё раз через минуту)
    for (const ms of [30000, 90000]) setTimeout(() => { if (FG.wait === id) load().catch(() => {}); }, ms);
    return r;
  }
  function fgClick(e) {
    const t = e.target.closest('button, [data-fclose]'); if (!t || t.disabled) return;
    if (t.hasAttribute('data-fclose')) return forgeClose();
    if (t.hasAttribute('data-fcancel')) return void fgCancel();
    if (t.dataset.way) { FG.way = t.dataset.way; FG.sure = 0; FG.res = null; fgRender(); const b = FG.el && FG.el.querySelector(`[data-way="${FG.way}"]`); if (b) b.focus(); return; }
    if (t.dataset.buy) { const h = ME.hero, E = h && EN(); if (h && E && E.coins && !thArm(t, h, E.coins[t.dataset.buy])) return; return void fgPost('/api/buymat', { mat: t.dataset.buy, ...(thK(h) > 1 ? { ack: 1 } : {}) }); }
    if (t.dataset.craft) return void fgPost('/api/craft', { lvl: +t.dataset.craft });
    if (t.hasAttribute('data-fgo')) {
      const h = ME.hero, it = h && h.items.find((x) => x.uid === FG.uid); if (!it || FG.wait) return;
      const q = enchQuote(it, h, FG.way); if (q.err) return;
      // риск сломать вещь — второе нажатие подтверждает (4 с)
      if (q.fail === 'break' && !(FG.sure > Date.now())) { FG.sure = Date.now() + 4000; fgRender(); const b = FG.el.querySelector('[data-fgo]'); if (b) b.focus(); setTimeout(() => { if (FG.sure && FG.sure <= Date.now()) { FG.sure = 0; fgRender(); } }, 4100); return; }
      FG.sure = 0;
      fgPost('/api/enchant', { uid: it.uid, way: FG.way, ...(q.seal ? { seal: q.seal } : {}) });
    }
  }
  // 22.10: итог склада и аукциона (куда ушла вещь) и сообщения без действия — всплывающим
  function storeNote(r) {
    const x = r.x || {};
    if (!r.ok) { toast(r.error || 'Не вышло', true); return; }
    if (x.op === 'note') { toast(x.t); return; }
    const it = x.item ? `«${x.item}»` : 'Вещь';
    if (/^auc/.test(x.op)) {
      if (x.ret && !x.store && x.op !== 'aucClaim') toast(`${it} ждёт на складе аукциона: сумка и склад полны — освободи место и забери в зале`, true);
      else if (x.store) toast(x.op === 'aucClaim' ? `Забрано со склада аукциона: ${x.n}; на склад — ${x.store}, поскольку сумка была полна${x.ret ? `; ещё ${x.ret} ждут` : ''}` : `${it} отправлена на склад, поскольку сумка была полна`);
      return;
    }
    if (x.op === 'stTake' && x.left) toast(`Забрано ${x.n}, ещё ${x.left} осталось на складе — сумка полна`);
    // 23.10: «Положить всё» / «Взять всё» — итог строкой в окне Склада и всплывающим; «Разложить» — тихо (видно по ячейкам)
    if (x.op === 'stPutAll' || x.op === 'stTakeAll') { const t = `Перенесено ${x.n || 0}${x.left ? `, не влезло ${x.left}` : ''}`; toast(t); try { if (window.LGCity && window.LGCity.storeRes) window.LGCity.storeRes(x); } catch {} }
  }
  // итог из игры (results[].x): заточка — в окне с анимацией; ковка и покупка — уведомлением
  function forgeDone(r) {
    const mine = r.id === FG.wait; if (mine) FG.wait = null;
    const x = r.x || {};
    if (!r.ok) { if (mine && FG.el) FG.res = { cls: 'err', t: r.error || 'Не вышло' }; else toast('Кузня: ' + (r.error || 'не вышло'), true); return; }
    if (x.op === 'craft') { toast(`Скована Печать Ауруса ${x.lvl}`); return; }
    if (x.op === 'buymat') { toast(x.mat === 'star' ? 'Куплена Счастливая звезда' : 'Куплена Сфера сохранения'); return; }
    const res = x.out === 'up' ? { cls: 'ok', big: `+${x.to}`, t: 'Заточка удалась!' } : x.out === 'broken' ? { cls: 'bad', big: 'Сломалось', t: `«${x.item}» не выдержала заточки на +${x.target}` }
      : x.out === 'down' ? { cls: 'save', big: x.to ? `+${x.to}` : '+0', t: 'Не вышло — сфера сберегла вещь, заточка −1' } : { cls: 'save', big: `+${x.from}`, t: 'Не вышло — вещь цела' };
    if (window.LGCity && (x.op === 'enchant' || x.out)) { try { window.LGCity.forgeFx(x); } catch {} }   // 20.10: сцена Кузни в «Городе»
    if (mine && FG.el && FG.uid === x.uid) { FG.res = { ...res, anim: !(reduceMQ && reduceMQ.matches) }; return; }
    toast(`Кузня: ${x.item}${x.from ? ' +' + x.from : ''} — ${res.t}`, x.out === 'broken');
  }

  /* ---------- 18.10: облик (гардероб): купленные элементы стиля по полям, «как по нику», в бою — нельзя ---------- */
  // человечек — с образом из гардероба (с ещё не применённым выбором), иначе — как пришёл с сервера
  const heroLook = (h) => (h && h.wardrobe ? { ...h, look: h.wardrobe.cur || null } : h);
  const LOOK_FIELDS = [['shape', 'Форма', 'shapes'], ['color', 'Цвет', 'colors'], ['color2', 'Второй цвет', 'colors'], ['eyes', 'Глаза', 'eyes'], ['mouth', 'Рот', 'mouths'], ['blush', 'Румянец', null], ['hat', 'Шапка', 'hats'], ['aura', 'Аура', 'auras'], ['acc', 'Аксессуары', 'acc'], ['accColor', 'Цвет аксессуаров', 'colors'], ['capeColor', 'Цвет плаща', 'colors']];
  const sameV = (a, b) => String(a).replace(/^#/, '').toLowerCase() === String(b).replace(/^#/, '').toLowerCase();
  function lookName(cat, v) {
    try { const C = D().CATALOG || {}, list = C[cat] || [], hex = String(v).replace(/^#?/, '#').toLowerCase(); const f = list.find(([id]) => String(id).toLowerCase() === String(v).toLowerCase() || String(id).toLowerCase() === hex); if (f) return f[1]; } catch {}
    return v === true || v === 'true' ? 'Есть' : v === false || v === 'false' ? 'Нет' : String(v);
  }
  // 19.10: образец цвета — и hex из каталога, и hsl «по нику»
  const swatch = (v) => (/^#?[0-9a-f]{3,8}$/i.test(v) ? String(v).replace(/^#?/, '#') : /^hsl\([\d\s.,%]+\)$/i.test(v) ? String(v) : '#888');
  /* 20.10: показываем только то, что реально меняет рисунок. Цвет плаща — только с надетым плащом, цвет аксессуаров —
     с аксессуаром, который красится, «второй цвет» — только если его что-то носит (у котика это шапка: кепка, бантик, берет…;
     с банданой и одними плащами он не виден нигде — а кнопка «Второй цвет: Синий» была). Проверка — без знаний о стилях:
     рисуем человечка с двумя пробными цветами; рисунок не изменился — поле ни на что не влияет. Кэш — по облику и нику */
  const LOOK_PROBE = new Map();
  function lookProbe(login, cur) {
    const d = D(); if (!d || !d.jDoodle) return null;
    const key = String(login).toLowerCase() + '|' + (d.active || '') + '|' + JSON.stringify(cur || {});
    if (LOOK_PROBE.has(key)) return LOOK_PROBE.get(key);
    const seed = jhash(String(login).toLowerCase()), who = String(login).toLowerCase();
    const draw = (lk) => { try { return String(d.jDoodle(seed, 'happy', false, { alive: true, noAura: true, who }, lk)).replace(/(id="|url\(#|href="#)([A-Za-z_-]+)\d+/g, '$1$2'); } catch (e) { return ''; } };
    const base = { ...(cur || {}) };
    const uses = (f, lk) => draw({ ...lk, [f]: '#010203' }) !== draw({ ...lk, [f]: '#fdfcfb' });
    const noAccCol = { ...base }; delete noAccCol.accColor;
    const r = {
      color2: uses('color2', base), accColor: uses('accColor', base), capeColor: uses('capeColor', base),
      c2hat: uses('color2', { ...noAccCol, acc: [] }),   // второй цвет красит шапку
      c2acc: !base.accColor && uses('color2', { ...noAccCol, hat: 'none' }),   // …и аксессуары, пока свой цвет аксессуаров не выбран
    };
    if (LOOK_PROBE.size > 50) LOOK_PROBE.clear();
    LOOK_PROBE.set(key, r);
    return r;
  }
  function lookHtml(h) {
    const W0 = h.wardrobe || { cur: {}, own: {} }, cur = W0.cur || {}, own = W0.own || {};
    const off = h.busy;
    const accOn = Array.isArray(cur.acc) ? cur.acc : [];
    // 19.10: первая кнопка — НАЗВАНИЕ того, что даёт ник (в стиле сайта), с пометкой «по нику»; нет сборки — как раньше
    let DEF = null; try { DEF = D() && D().defaultsFor ? D().defaultsFor(String(h.login || '')) : null; } catch {}
    const same = (f, a, b) => { try { if (D() && D().sameLook) return D().sameLook(f, a, b); } catch {} return a != null && b != null && sameV(a, b); };
    const PR = lookProbe(h.login || '', cur);
    const label = (f, l) => (f !== 'color2' || !PR ? l : PR.c2hat ? (PR.c2acc ? 'Цвет шапки и аксессуаров' : 'Цвет шапки') : PR.c2acc ? 'Цвет аксессуаров' : 'Цвет деталей');
    const fixed = [];   // 20.10: выбирать нечего (только «по нику») — не отдельной строкой, а одной свёрнутой сводкой
    // 20.10: все части облика видны всегда — купленного нет, значит пока только «по нику» (раньше без покупок показывалась одна шапка)
    const rows = LOOK_FIELDS.map(([f, label0, cat]) => {
      if (PR && (f === 'color2' || f === 'accColor' || f === 'capeColor') && !PR[f]) return '';   // на рисунке не видно — не показываем
      const lbl = label(f, label0);
      const ownF = Array.isArray(own[f]) ? own[f] : [];
      const def = DEF && DEF[f];
      const isOn = (v) => (f === 'acc' ? accOn.some((x) => sameV(x, v)) : f === 'blush' ? String(!!cur.blush) === String(v) && cur.blush != null : cur[f] != null && sameV(cur[f], v));
      // надето то же, что даёт ник (купленное «Без шапки» у ника без шапки) — горит кнопка «по нику»: она за них обеих
      const byNick = f === 'acc' ? !accOn.length : cur[f] == null || (!!def && same(f, cur[f], def.v));
      // купленное, совпадающее с «по нику», отдельной кнопкой не показываем (иначе две одинаковые)
      const list = def ? ownF.filter((v) => !same(f, v, def.v)) : ownF;
      // value — что уйдёт в wear: null — «как по нику»; аксессуар — добавить, а уже надетый — снять (остальные — списком)
      const valOf = (v) => (f === 'acc' && isOn(v) ? accOn.filter((x) => !sameV(x, v)) : f === 'blush' ? String(v) : v);
      const isColor = /color/i.test(f);
      // 19.10: вариант всего один (только «по нику») — выбирать нечего: в сводку «по нику»
      if (!list.length && byNick) { fixed.push(`<span class="lk-fx">${isColor && def ? `<i class="sw" style="background:${esc(swatch(def.v))}"></i>` : ''}<b>${esc(lbl)}</b> ${esc(def ? def.name : 'как по нику')}</span>`); return ''; }
      const chip = (v, txt, on, sw, hint) => `<button type="button" data-wear="${esc(f)}" data-v="${esc(JSON.stringify(v))}" aria-pressed="${on}"${hint ? ` class="lk-nick" title="${esc(hint)}"` : ''}${off ? ' disabled' : ''}>${isColor && sw ? `<i class="sw" style="background:${esc(swatch(sw))}"></i>` : ''}${esc(txt)}${hint ? '<small>по нику</small>' : ''}</button>`;
      const first = def ? chip(null, def.name, byNick, def.v, 'Даёт ник — бесплатно, всегда доступно') : chip(null, 'как по нику', byNick);
      return `<div class="lk-f"><span class="lk-l">${esc(lbl)}</span><div class="lk-c filters">${first}${list.map((v) => chip(valOf(v), cat ? lookName(cat, v) : lookName(null, v), isOn(v), v)).join('')}</div></div>`;
    }).join('');
    const more = fixed.length ? `<details class="lk-more"><summary>Ещё по нику — выбрать пока нечего (${fixed.length})</summary><p class="lk-fxs">${fixed.join('')}</p></details>` : '';
    return `<div class="lookv">
      <div class="fig">${doodle(h.login, heroLook(h), 'happy')}</div>
      <div class="lk">${off && !h.ghost ? `<p class="note busyn">⚔ Идёт бой на стриме — облик менять нельзя. Сменить можно после боя.</p>` : ''}
        ${rows || '<p class="note">Купленных деталей облика пока нет.</p>'}${more}
        <p class="note lk-tip">Новое покупается в Шатре на Ярмарке; надевать можно в любой момент, кроме боя.</p></div>
    </div>`;
  }
  // 18.10: SVG-анимации человечка (искры ауры, хвосты) вместе со свечением оружия (размытие) заставляли браузер
  // перерисовывать рисунок каждый кадр — вкладка «Персонаж» грузила процессор (замер: ~120% ядра в Chromium без видеокарты,
  // на паузе — 0,6%). Человечек стоит неподвижно (кадр, где искры видны) и оживает, пока на него наведена мышь
  // 18.10 (вечер): стоять столбом тоже не дело — человечек «дышит» (CSS transform всего рисунка: его двигает видеокарта,
  // SVG не перерисовывается), раз в 3–6 с моргает и изредка поводит оружием (короткая смена класса — перерисовка
  // на доли секунды). На паузе: вкладка скрыта, человечек вне экрана, «меньше движения» в системе
  const LIVE = new Set();
  const reduceMQ = SU.media('reduced');
  const seen = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((es) => es.forEach((e) => { e.target.classList.toggle('zz', !e.isIntersecting); auraRun(e.target); })) : null;

  /* 19.10 (решение стримера): у СВОЕГО героя (вкладка «Персонаж») аура живёт всегда, а не только под мышью.
     SMIL-анимация ауры внутри рисунка заставляла перерисовывать весь SVG (со свечением оружия) каждый кадр — ~130% ядра
     без видеокарты. Вечером: аура «запекается» — каждая её часть (свечение, нимб, каждая искра) один раз рисуется в картинку
     (canvas → PNG, по размеру на экране × devicePixelRatio, кэш по разметке и размеру: одинаковые искры — одна картинка),
     а двигают картинки CSS-анимации transform/opacity (@keyframes). Их ведёт поток композиции (видеокарта): ни таймера
     на кадр, ни перерисовки SVG, ни filter — поэтому плавно, без шагов (раньше было 4 кадра в секунду).
     В толпе (вкладка «Облик» и т. п.) — тем же способом, но только под мышью. «Меньше движения» — аура стоит.
     Пауза (animation-play-state: paused) — человечек вне экрана (.zz), вкладка скрыта (.zz-all), другая вкладка сайта */
  const VBW = 120, VBH = 170;   // viewBox человечка
  /* Плавность стоит кадров композиции: с видеокартой они почти бесплатны, а у зрителя БЕЗ ускорения (программная отрисовка:
     SwiftShader, llvmpipe, «Microsoft Basic Render», WebGL выключен) каждый кадр — работа процессора (замер: 60 к/с ≈ 20% CPU,
     8 к/с ≈ 9%). Таким зрителям аура идёт шагами по общим часам (AURA_SOFT_TICK): все части меняются в одни и те же моменты.
     Проверка — один раз (маленький WebGL-контекст, сразу отпускаем). Принудительно: localStorage['lg-aura'] = 'smooth' | 'soft' */
  const AURA_SOFT_TICK = 0.125;
  let auraSoftV = null;
  function auraSoft() {
    if (auraSoftV != null) return auraSoftV;
    try { const f = localStorage.getItem('lg-aura'); if (f === 'smooth' || f === 'soft') return (auraSoftV = f === 'soft'); } catch (e) {}
    auraSoftV = false;
    try {
      const g = document.createElement('canvas').getContext('webgl', { failIfMajorPerformanceCaveat: false });
      if (!g) auraSoftV = true;
      else {
        const ext = g.getExtension('WEBGL_debug_renderer_info');
        const r = String(ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER) || '');
        auraSoftV = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
        try { const l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) {}
      }
    } catch (e) {}
    return auraSoftV;
  }
  function auraLive(fig, own) {
    try {
      if (!fig || fig.dataset.aura || reduceMQ.matches) return;
      const sv = fig.querySelector('svg.jl-doodle'); if (!sv || !sv.querySelector('.jd-aura-b, .jd-aura-f')) return;
      fig.dataset.aura = 'wait';   // слои строим, когда человечек впервые виден (у скрытого getBBox — нули)
      if (own) fig.dataset.auraOwn = '1';
      auraRun(fig);
    } catch (e) { console.warn('аура', e); }
  }
  // SMIL-значения: «a;b;c» → числа / пары «x y»
  const smilVals = (a) => String(a.getAttribute('values') || '').split(';').map((v) => v.trim()).filter(Boolean);
  const smilSec = (v) => { const m = /^(-?[\d.]+)(ms|s)?$/.exec(String(v || '').trim()); return m ? (+m[1]) * (m[2] === 'ms' ? 0.001 : 1) : 0; };
  // запечённые картинки: разметка части ауры + размер в пикселях → Promise<адрес картинки>. Не вышло (старый браузер,
  // canvas запрещён) — та же разметка как SVG-картинка: она тоже слой, который только двигают, просто без запекания
  const AURA_PX = new Map();
  function auraBake(svgText, pw, ph) {
    const key = pw + 'x' + ph + svgText;
    let p = AURA_PX.get(key); if (p) return p;
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    p = new Promise((ok) => {
      const im = new Image();
      im.onload = () => {
        try {
          const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
          cv.getContext('2d').drawImage(im, 0, 0, pw, ph);
          cv.toBlob((b) => ok(b ? URL.createObjectURL(b) : svgUrl), 'image/png');
        } catch (e) { ok(svgUrl); }
      };
      im.onerror = () => ok(svgUrl);
      im.src = svgUrl;
    });
    AURA_PX.set(key, p); return p;
  }
  // @keyframes для каждого своего набора кадров (одинаковые — одно правило); не вставилось — Web Animations, тоже плавно
  let auraSheet = null; const AURA_KF = new Map();
  function auraKf(frames) {
    const body = frames.map((k) => `${+(k.offset * 100).toFixed(3)}%{${k.transform ? `transform:${k.transform};` : ''}${k.opacity != null ? `opacity:${+k.opacity.toFixed(3)}` : ''}}`).join('');
    let n = AURA_KF.get(body); if (n) return n;
    try {
      if (!auraSheet) { const st = document.createElement('style'); st.id = 'jd-aura-kf'; document.head.appendChild(st); auraSheet = st.sheet; }
      n = 'jdak' + AURA_KF.size; auraSheet.insertRule(`@keyframes ${n}{${body}}`, auraSheet.cssRules.length);
    } catch (e) { n = ''; }
    AURA_KF.set(body, n); return n;
  }
  async function auraBuild(fig) {
    const sv = fig.querySelector('svg.jl-doodle'); if (!sv) return;
    const soft = auraSoft(), T = AURA_SOFT_TICK;
    const wrap = document.createElement('div'); wrap.className = 'jd-aura-w' + (fig.dataset.auraOwn ? ' au-own' : '') + (soft ? ' au-soft' : '');
    const mk = (cls) => { const d = document.createElement('div'); d.className = 'jd-aura-l ' + cls; d.setAttribute('aria-hidden', 'true'); return d; };
    const back = mk('jd-al-b'), front = mk('jd-al-f'), NS = 'http://www.w3.org/2000/svg', waits = [];
    // пикселей на единицу рисунка (с запасом на чёткость экрана: devicePixelRatio, не больше 3)
    const ppu = (sv.getBoundingClientRect().width / VBW || 2) * Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const defs = [...sv.querySelectorAll('.jd-aura-b defs, .jd-aura-f defs')].map((d) => d.outerHTML).join('');
    const grps = [[sv.querySelector('.jd-aura-b'), back], [sv.querySelector('.jd-aura-f'), front]];
    for (const [grp, layer] of grps) {
      if (!grp) continue;
      for (const el of [...grp.children]) {
        if (el.tagName.toLowerCase() === 'defs') continue;
        const own = [...el.children].filter((a) => /^(animate|animateTransform)$/.test(a.tagName));
        let bb; try { bb = el.getBBox(); } catch (e) { bb = null; }
        if (!bb || !(bb.width + bb.height)) continue;
        const pad = 6, x = bb.x - pad, y = bb.y - pad, w = bb.width + pad * 2, h = bb.height + pad * 2;
        const c = el.cloneNode(true);
        // вложенные анимации (мерцание обводки нимба и т. п.) — застывают на первом значении
        c.querySelectorAll('animate, animateTransform, animateMotion, set').forEach((a) => {
          if (a.parentNode === c) { a.remove(); return; }
          const v = smilVals(a)[0], n = a.getAttribute('attributeName');
          if (v != null && n && a.tagName === 'animate') try { a.parentNode.setAttribute(n, v); } catch (e) {}
          a.remove();
        });
        c.removeAttribute('opacity');
        const pw = Math.max(1, Math.ceil(w * ppu)), ph = Math.max(1, Math.ceil(h * ppu));
        const svgText = `<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${pw}" height="${ph}">${/url\(#/.test(c.outerHTML) ? defs : ''}${c.outerHTML}</svg>`;
        const img = document.createElement('img'); img.className = 'jd-al'; img.alt = ''; img.decoding = 'async';
        img.style.cssText = `left:${(x / VBW) * 100}%;top:${(y / VBH) * 100}%;width:${(w / VBW) * 100}%;height:${(h / VBH) * 100}%`;
        waits.push(auraBake(svgText, pw, ph).then((u) => { img.src = u; return img.decode ? img.decode().catch(() => null) : null; }));
        layer.appendChild(img);
        // анимации самого элемента: сдвиг (translate) и прозрачность — в кадры transform/opacity
        const base = el.getAttribute('opacity');
        let dur = 0, delay = 0, tr = null, op = null, kt = null;
        for (const a of own) {
          const vals = smilVals(a); if (vals.length < 2) continue;
          // begin="-1.2s" — анимация идёт уже 1,2 с: в CSS это отрицательная задержка (с положительной искра до старта
          // стояла бы видимой в своём углу)
          dur = dur || smilSec(a.getAttribute('dur')); delay = delay || smilSec(a.getAttribute('begin'));
          if (a.tagName === 'animateTransform' && (a.getAttribute('type') || 'translate') === 'translate') tr = vals.map((v) => v.split(/[\s,]+/).map(Number));
          else if (a.getAttribute('attributeName') === 'opacity') { op = vals.map(Number); kt = a.getAttribute('keyTimes'); }
        }
        if (!dur || (!tr && !op)) { if (base != null) img.style.opacity = base; continue; }
        // кадры: прозрачность — по своим keyTimes, сдвиг — равномерно между ними (как SMIL: линейно)
        const kts = kt ? kt.split(';').map(Number) : null;
        const pts = new Set([0, 1]); (kts || (op || []).map((_, i, A) => i / (A.length - 1))).forEach((t) => pts.add(t)); if (tr) tr.forEach((_, i, A) => pts.add(i / (A.length - 1)));
        const at = (A, t, times) => { const T = times || A.map((_, i) => i / (A.length - 1)); let i = 0; while (i < T.length - 2 && t > T[i + 1]) i++; const f = T[i + 1] === T[i] ? 0 : Math.max(0, Math.min(1, (t - T[i]) / (T[i + 1] - T[i]))); return Array.isArray(A[i]) ? A[i].map((v, j) => v + (A[i + 1][j] - v) * f) : A[i] + (A[i + 1] - A[i]) * f; };
        // без ускорения: длительность и задержка — кратны шагу, кадры — в каждом шаге (между ними steps(1): скачок ровно на шаге)
        if (soft) { dur = Math.max(2, Math.round(dur / T)) * T; delay = Math.round(delay / T) * T; pts.clear(); const n = Math.round(dur / T); for (let i = 0; i <= n; i++) pts.add(i / n); }
        const frames = [...pts].sort((a, b) => a - b).map((t) => {
          const k = { offset: t };
          if (tr) { const [dx, dy = 0] = at(tr, t); k.transform = `translate(${((dx / w) * 100).toFixed(3)}%, ${((dy / h) * 100).toFixed(3)}%)`; }
          if (op) k.opacity = at(op, t, kts);
          return k;
        });
        if (!op && base != null) img.style.opacity = base;
        const name = auraKf(frames);
        if (name) Object.assign(img.style, { animationName: name, animationDuration: dur + 's', animationDelay: delay + 's' }, soft ? { animationTimingFunction: 'steps(1, end)' } : {});   // остальное (linear, infinite, пауза) — в style.css
        else if (typeof img.animate === 'function') { const an = img.animate(frames, { duration: dur * 1000, delay: delay * 1000, iterations: Infinity, ...(soft ? { easing: `steps(${Math.round(dur / T)})` } : {}) }); (fig._aura = fig._aura || []).push(an); }
      }
    }
    // картинки готовы — подменяем разом (до этого аура остаётся в рисунке, мигания нет)
    await Promise.all(waits);
    if (!sv.isConnected) return;
    for (const [grp] of grps) if (grp) grp.remove();   // в самом рисунке ауры больше нет — его SMIL (хвосты и т. п.) по-прежнему только под мышью
    sv.replaceWith(wrap); wrap.append(back, sv, front);
  }
  // запустить / поставить на паузу ауру: свой герой — пока виден, в толпе — пока под мышью
  function auraRun(fig) {
    try {
      if (!fig || !fig.dataset.aura || fig.dataset.aura === 'off') return;
      const vis = !document.hidden && !reduceMQ.matches && !fig.classList.contains('zz') && fig.isConnected && !!fig.offsetParent;
      const on = vis && (!!fig.dataset.auraOwn || !!fig._hov);
      if (fig.dataset.aura === 'wait') {
        if (!on) return;
        fig.dataset.aura = 'build';
        auraBuild(fig).then(() => { fig.dataset.aura = 'on'; auraRun(fig); }, (e) => { console.warn('аура', e); fig.dataset.aura = 'off'; });
        return;
      }
      fig.classList.toggle('au-on', on);
      for (const a of fig._aura || []) if (on) a.play(); else a.pause();
    } catch (e) { console.warn('аура', e); fig.dataset.aura = 'off'; }
  }
  function calm(root) {
    const reduce = reduceMQ.matches;
    root.querySelectorAll('.fig svg, .cf svg').forEach((sv) => {
      try { sv.setCurrentTime(1.4); sv.pauseAnimations(); } catch {}
      const fig = sv.closest('.fig, .cf'); if (!fig || fig.dataset.calm) return;
      fig.dataset.calm = '1'; fig.classList.add('alive');
      LIVE.add(fig); try { if (seen) seen.observe(fig); } catch {}
      if (reduce) return;
      // под мышью: хвосты и прочий SMIL рисунка оживают, аура (если есть) — запечёнными слоями, как у своего героя
      fig.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; try { sv.unpauseAnimations(); } catch {} fig._hov = true; auraLive(fig); auraRun(fig); });
      fig.addEventListener('pointerleave', () => { try { sv.pauseAnimations(); } catch {} fig._hov = false; auraRun(fig); });
    });
    // убранные со страницы (перерисовка вкладки) — забываем
    for (const f of LIVE) if (!f.isConnected) { LIVE.delete(f); try { if (seen) seen.unobserve(f); for (const a of f._aura || []) a.cancel(); } catch {} }
    lifeTick();
  }
  // один таймер на всех: моргнуть (180 мс) и изредка повести оружием (1,6 с) у видимых человечков
  let lifeT = 0;
  function lifeTick() {
    clearTimeout(lifeT); lifeT = 0;
    if (document.hidden || reduceMQ.matches || !LIVE.size) return;
    lifeT = setTimeout(() => {
      lifeT = 0;
      try {
        for (const f of LIVE) {
          if (!f.isConnected || f.classList.contains('zz') || !f.offsetParent) continue;   // нет на экране / вкладка не та
          const sv = f.querySelector('svg.jl-doodle'); if (!sv || sv.classList.contains('jd-ghost')) continue;
          if (Math.random() < 0.8) { sv.classList.add('blink'); setTimeout(() => sv.classList.remove('blink'), 200); }
          if (Math.random() < 0.2 && sv.querySelector('.jd-weapon')) { sv.classList.add('sway'); setTimeout(() => sv.classList.remove('sway'), 1700); }
        }
      } catch {}
      lifeTick();
    }, 3000 + Math.random() * 3000);
  }
  document.addEventListener('visibilitychange', () => { document.documentElement.classList.toggle('zz-all', document.hidden); lifeTick(); for (const f of LIVE) auraRun(f); });
  try { reduceMQ.addEventListener('change', () => { lifeTick(); for (const f of LIVE) auraRun(f); }); } catch {}   // «меньше движения» включили — аура встаёт

  function renderHello(el) {
    const names = ['центурион', 'лучница', 'жрец', 'маг', 'новобранец'];
    el.innerHTML = `<div class="hello panel"><div class="hello-t"><h1 class="h1">Твой герой Легиона</h1><p class="lead">Войди через Twitch — увидишь своего героя, всё, что он добыл в Походе, и переоденешь его перед следующим стримом.</p><a class="btn twitch" href="${window.LG_LOGIN || '/auth/login'}">${ico('twitch')}<span>Войти через Twitch</span></a></div>
      <div class="crowd" aria-hidden="true">${names.map((n, i) => `<div class="cf">${doodle('гость·' + n, null, i % 2 ? 'happy' : 'stern')}</div>`).join('')}</div></div>`;
    calm(el);
  }

  /* ---------- Легион ---------- */
  /* 23.10: вкладка «Легион (рейтинг)» — два вида: «Состав» (кто в Легионе) и «Соц. рейтинг» (была отдельная вкладка) */
  let lgv = 'roster'; try { if (localStorage.getItem('lgLegView') === 'soc') lgv = 'soc'; } catch {}
  function legOpen() {
    const T = $('#tab-legion');
    if (!$('#lgRoster', T)) {
      T.innerHTML = `<div class="views filters lg-views" role="group" aria-label="Что показать"><button type="button" data-lgv="roster">Состав</button><button type="button" data-lgv="soc">Соц. рейтинг</button></div><div id="lgRoster"></div><div id="lgSoc"></div>`;
      T.querySelectorAll('[data-lgv]').forEach((b) => b.onclick = () => { if (lgv === b.dataset.lgv) return; lgv = b.dataset.lgv; try { localStorage.setItem('lgLegView', lgv); } catch {} legOpen(); });
    }
    T.querySelectorAll('[data-lgv]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lgv === lgv)));
    $('#lgRoster', T).hidden = lgv !== 'roster'; $('#lgSoc', T).hidden = lgv !== 'soc';
    if (lgv === 'soc') loadSoc(); else loadLegion();
  }
  let legAt = '';
  async function loadLegion() {
    const el = $('#lgRoster'); if (!el) return;
    if (!el.innerHTML) el.innerHTML = '<p class="empty">Собираю Легион…</p>';
    const r = await api('/api/legion');
    if (!r.ok) { if (!el.querySelector('.legion')) el.innerHTML = '<div class="panel"><p class="empty">Не удалось загрузить Легион. Обнови страницу чуть позже.</p></div>'; return; }
    const lk = sty() + JSON.stringify(r); if (lk === legAt && el.querySelector('.legion')) return; legAt = lk;   // ничего не поменялось — 120 человечков не перерисовываем
    const T = r.total, tot = Math.max(1, T.heroes);
    const roleLines = (g) => g.roles.filter((k) => r.roles[k] && r.roles[k].n).map((k) => `${esc(roleOf(k, r.roles[k].name))} ${r.roles[k].n}`).join(' · ');
    const gName = (g) => SU.styleText(sty(), 'groups', g.id) || g.name;
    const roster = (r.roster || []);
    const byGroup = {}; for (const v of roster) (byGroup[GROUP_OF[v.role] || 'recruit'] = byGroup[GROUP_OF[v.role] || 'recruit'] || []).push(v);
    const fig = (v) => `<li class="rf${v.ghost ? ' gh' : ''}" title="${esc(v.name)} · ур. ${v.level}"><div class="rd">${doodle(v.login, { look: v.look, gear: v.gear, ghost: v.ghost }, 'stern')}</div><span class="rn">${esc(v.name)}${awb(v.aw)}</span><span class="rlv">${v.level}</span></li>`;
    el.innerHTML = `<div class="legion">
      <header class="lg-head panel">
        <div class="lg-big"><b>${T.heroes}</b><span>${plural(T.heroes, 'герой', 'героя', 'героев')} в Легионе</span></div>
        <dl class="lg-t"><div><dt>в строю</dt><dd>${T.heroes - T.ghosts}</dd></div><div><dt>призраков</dt><dd>${T.ghosts}</dd></div><div><dt>средний уровень</dt><dd>${T.avgLevel}</dd></div></dl>
        <div class="mix" role="img" aria-label="Состав: ${r.groups.map((g) => `${gName(g)} ${g.n}`).join(', ')}">${r.groups.filter((g) => g.n).map((g) => `<i data-g="${g.id}" style="flex:${g.n}"></i>`).join('')}</div>
      </header>
      <div class="groups">${r.groups.map((g) => `<section class="grp panel" data-g="${g.id}"><h2 class="gn"><i class="sw" aria-hidden="true"></i>${esc(gName(g))}</h2><div class="gv"><b>${g.n}</b><span>${Math.round((g.n / tot) * 100)}%</span></div><p class="gr">${roleLines(g) || 'пока никого'}</p></section>`).join('')}</div>
      ${roster.length ? `<section class="panel ranks"><div class="bag-h"><h2 class="h2">Строй</h2><span class="muted">${roster.length < T.heroes ? `${roster.length} самых опытных из ${T.heroes}` : 'все герои'} · по уровню</span></div>
        ${r.groups.filter((g) => (byGroup[g.id] || []).length).map((g) => `<div class="row" data-g="${g.id}"><h3 class="rh"><i class="sw" aria-hidden="true"></i>${esc(gName(g))}</h3><ul class="rlist">${byGroup[g.id].map(fig).join('')}</ul></div>`).join('')}</section>` : ''}
      <p class="foot">Роль зависит от оружия в руках: меч — легионер, лук — лучник, посох — маг, кадило — жрец. Без оружия — новобранец. · обновлено ${r.at ? new Date(r.at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
    </div>`;
    // 17.10: в строю до 120 человечков, у котиков и обезьян в каждом шевелятся хвосты, уши, глаза (SVG-анимации) —
    // браузер перерисовывал всю страницу каждый кадр и «съедал» ресурсы. В строю человечки стоят спокойно.
    try { el.querySelectorAll('.rd svg').forEach((sv) => { try { sv.pauseAnimations(); sv.setCurrentTime(0); } catch (e) {} sv.querySelectorAll('animate,animateTransform,animateMotion,set').forEach((a) => a.remove()); }); } catch (e) {}
  }

  /* ---------- 17.10: Соц. рейтинг — топ-100 Легиона и твоё место ---------- */
  let socAt = '';
  async function loadSoc() {
    const el = $('#lgSoc'); if (!el) return;
    if (!el.innerHTML) el.innerHTML = '<div class="panel"><p class="empty">Считаю рейтинг…</p></div>';
    const r = await api('/api/soc');
    if (!r || !r.ok) { el.innerHTML = '<div class="panel"><p class="empty">Не удалось загрузить рейтинг. Обнови страницу чуть позже.</p></div>'; return; }
    const k = JSON.stringify([r.top, r.me, r.near]); if (k === socAt && el.querySelector('.soc')) return; socAt = k;
    const R0 = r.ranks || {}, rk = (id) => R0[id] || { name: '', icon: '' };
    const me = r.me, inTop = me && (r.top || []).some((x) => x.login === me.login);
    const row = (x, i, mine) => { const q = rk(x.rank); return `<li class="sr${mine ? ' me' : ''}${q.bad ? ' bad' : ''}${i < 3 ? ' p' + (i + 1) : ''}"><span class="sp">${i + 1}</span><span class="sn">${esc(x.name)}${awb((r.aw || {})[x.login])}</span><span class="sk"><i aria-hidden="true">${esc(q.icon)}</i>${esc(q.name)}</span><b class="ss">${x.score}</b></li>`; };
    if (!(r.top || []).length) { el.innerHTML = '<div class="panel"><p class="empty">Рейтинг появится после синхронизации со стримом.</p></div>'; return; }
    // 21.10: под топом — кто рядом с тобой (по 5 мест выше и ниже); в топе — только те соседи, что ниже 100-го места.
    // Соседей ещё нет (игра пришлёт со следующей синхронизацией) — как раньше, только твоя строка
    const T = r.top.length, nb = (Array.isArray(r.near) ? r.near : []).filter((x) => x.place > T);
    const nbRows = (xs) => `${inTop ? '' : '<h3 class="h3 soc-nh">Рядом с тобой</h3>'}<ol class="srl tail${inTop ? '' : ' nh'}" start="${xs[0].place}" aria-label="Рядом с тобой">${xs.map((x) => row(x, x.place - 1, me && x.login === me.login)).join('')}</ol>`;
    const tail = nb.length && me && me.place ? nbRows(nb) : me && !inTop && me.place ? `<ol class="srl tail" start="${me.place}">${row({ ...me, name: me.name }, me.place - 1, true)}</ol>` : '';
    el.innerHTML = `<div class="soc">
      <header class="panel soc-h"><div><h1 class="h1">Соц. рейтинг</h1><p class="lead">Рейтинг меняется за дела на стриме. Чем он выше — тем выше звание.</p></div>
        ${me ? `<div class="soc-me${(rk(me.rank).bad) ? ' bad' : ''}"><span class="mi" aria-hidden="true">${esc(rk(me.rank).icon || '')}</span><div><b>${me.place ? me.place + ' место' : 'ещё нет места'}</b><span>${esc(rk(me.rank).name || '—')} · ${me.score} ${plural(Math.abs(me.score), 'очко', 'очка', 'очков')}</span></div></div>` : ''}</header>
      <section class="panel"><div class="bag-h"><h2 class="h2">Топ-100</h2><span class="muted">всего в рейтинге: ${r.total}</span></div>
        <ol class="srl">${r.top.map((x, i) => row(x, i, me && x.login === me.login)).join('')}</ol>
        ${tail}
      </section></div>`;
  }

  /* ---------- 17.10: Журнал — что герой делал в игре и чем кончилось (бои, кости, ловушки, покупки, добыча…) ---------- */
  const JK = [['all', 'Всё'], ['fight', 'Бой'], ['boss', 'Закхуэль'], ['dice', 'Кости'], ['event', 'Событие'], ['trap', 'Ловушка'], ['shop', 'Покупка'], ['ench', 'Заточка'], ['auc', 'Аукцион'], ['look', 'Облик'], ['loot', 'Вещь'], ['find', 'Находка'], ['coins', 'Монеты'], ['hero', 'Герой'], ['award', 'Награда'], ['store', 'Склад'], ['ach', 'Достижение'], ['trade', 'Обмен'], ['bug', 'Репорт']];   // 24.10: репорт зрителя одобрен (src/site/bugreports.ts)   // 23.10: + склад, достижения, обмен между игроками
  const JKN = Object.fromEntries(JK);
  // 18.10: вкладки журнала (виды записей — как JTABS на сервере)
  const JT = [['all', 'Все', null], ['fight', 'Бой', ['fight', 'boss', 'trap', 'hero']], ['shop', 'Покупки', ['shop', 'look', 'ench', 'auc', 'store', 'trade']], ['find', 'Находки', ['loot', 'find']], ['coins', 'Монеты', ['coins', 'dice', 'event']], ['ach', 'Достижения', ['ach']]];   // 23.10: + склад, вкладка «Достижения»
  const JTK = Object.fromEntries(JT.map(([k, , ks]) => [k, ks]));
  const JR = { win: 'Победа', lose: 'Неудача', tie: 'Ничья' };
  const JRK = { dice: { win: 'Выиграл', lose: 'Проиграл', tie: 'Ничья' }, fight: { win: 'Победа', lose: 'Поражение' }, boss: { win: 'Победа', lose: 'Поражение' }, trap: { win: 'Справился', lose: 'Пострадал' }, shop: { win: 'Готово', lose: 'Не вышло' }, hero: { win: '', lose: '' }, ach: { win: 'Открыто' }, store: { win: '', lose: '' } };   // 23.10
  let jf = 'all', JL = null, jAt = '', JITEMS = {}, jSeq = 0, jNext = null, jCap = 300, jMoreP = null;   // 25.10: jNext - курсор следующей (более старой) страницы журнала
  try { const v = localStorage.getItem('lgJf'); if (v && JTK[v] !== undefined) jf = v; } catch {}
  // 23.10: вид «Персонажа» (view) — сменить и запомнить; «Весь журнал» из короткого списка — сразу наверх, к журналу
  function goView(v) { view = v; try { localStorage.setItem('lgView', view); } catch {} renderHero(); if (v === 'log') { const t = $('#tab-hero'); if (t && t.getBoundingClientRect().top < 0) t.scrollIntoView({ block: 'start' }); } }
  const logOn = () => view === 'log' && $('#tab-hero').classList.contains('on') && !!$('#jrFull');
  async function loadLog() {
    const el = $('#jrFull'); if (!el) return;
    if (!ME || !ME.user) { el.innerHTML = '<div class="panel jr-out"><h2 class="h2">Журнал</h2><p class="lead">Войди через Twitch — здесь появятся главные события твоего героя: бои, находки, новые вещи, покупки, выигрыши и награды монетами, новые уровни, смерть и воскрешение.</p></div>'; return; }
    if (!JL) el.innerHTML = '<p class="empty">Открываю журнал…</p>';
    const want = jf, seq = ++jSeq;
    const r = await api('/api/journal?tab=' + encodeURIComponent(want));
    if (seq !== jSeq || !$('#jrFull')) return;   // пока ждали — переключили вкладку журнала или ушли из него
    if (!r || !r.ok) { if (!JL) el.innerHTML = '<div class="panel"><p class="empty">Журнал пока не загрузился. Обнови страницу чуть позже.</p></div>'; return; }
    if (r.items) JITEMS = r.items;
    const k = want + JSON.stringify(r.list || []); if (JL && k === jAt) return; jAt = k;
    JL = r.list || []; jNext = r.next || null; jCap = 300; renderLog();
  }
  // 25.10: «Показать ещё» - следующая страница журнала (старые записи), к уже показанным
  async function moreLog() {
    if (!jNext || jMoreP) return;
    const want = jf, seq = jSeq;
    jMoreP = api('/api/journal?tab=' + encodeURIComponent(want) + '&before=' + encodeURIComponent(jNext));
    let r = null; try { r = await jMoreP; } catch {} finally { jMoreP = null; }
    if (seq !== jSeq || want !== jf || !JL) return;
    if (!r || !r.ok) { const b = $('#jrFull [data-jmore]'); if (b) b.textContent = 'Не загрузилось - ещё раз'; return; }
    const ids = new Set(JL.map((e) => e.id));
    for (const e of r.list || []) if (!ids.has(e.id)) JL.push(e);
    jCap = JL.length; jNext = r.next || null; jAt = '';
    renderLog();
  }
  // 18.10: живые записи (SSE) — сразу в начало списка, если подходят под вкладку
  // 23.10: короткий журнал на «Персонаже» — последние записи (все виды), под характеристиками
  let JA = null, jaP = null, jaFail = 0;
  const JMINI = 5;
  function loadMini(force) {
    if (jaP || !ME || !ME.user || (!force && Date.now() - jaFail < 60000)) return;
    jaP = api('/api/journal?tab=all').then((r) => { if (r && r.ok) { if (r.items) JITEMS = r.items; JA = r.list || []; miniPatch(); if (window.LGQuest && window.LGQuest.hero) window.LGQuest.hero(); } else jaFail = Date.now(); }, () => { jaFail = Date.now(); }).finally(() => { jaP = null; });
  }
  function jrMini(n = JMINI) {   // 26.10: n - сколько строк (вкладка «Поход»: журнал - своё окно, строк больше)
    if (!JA) loadMini();
    const head = `<div class="jr-mh"><h2 class="h3">Журнал</h2>${JA && JA.length ? '<button type="button" class="jr-more" data-view="log">Весь журнал</button>' : ''}</div>`;
    if (!JA) return `<div class="jr-mini">${head}<p class="muted">Открываю…</p></div>`;
    if (!JA.length) return `<div class="jr-mini">${head}<p class="muted">Пока пусто. Сюда попадут бои, находки, покупки, выигрыши и награды.</p></div>`;
    const when = (t) => { const d = dayName(t); return d === 'Сегодня' ? hm(t) : d === 'Вчера' ? 'вчера' : new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); };
    const li = (e) => { const lbl = e.r ? ((JRK[e.k] || JR)[e.r] ?? JR[e.r]) : '', t = itemText(e.t);
      return `<li data-k="${esc(e.k)}"><time datetime="${new Date(e.at).toISOString()}">${esc(when(e.at))}</time><span class="jr-t" title="${esc(t)}">${esc(t)}</span><span class="jr-m">${lbl ? `<span class="jr-r ${e.r}">${esc(lbl)}</span>` : ''}${coinsTxt(+e.c || 0)}</span></li>`; };
    return `<div class="jr-mini">${head}<ol class="jr-ml" aria-label="Последние события">${JA.slice(0, n).map(li).join('')}</ol></div>`;
  }
  function miniPatch() {
    const m = $('#tab-hero .jr-mini'); if (!m) return;
    m.outerHTML = jrMini();
    $$('#tab-hero .jr-mini [data-view]').forEach((b) => b.onclick = () => goView(b.dataset.view));
  }
  function logAdd(list) {
    if (!Array.isArray(list)) return;
    if (JA) { const ids = new Map(JA.map((e, i) => [e.id, i])); for (const e of list) { if (ids.has(e.id)) JA[ids.get(e.id)] = e; else JA.unshift(e); } JA.sort((a, b) => b.at - a.at); if (JA.length > 300) JA.length = 300; miniPatch();  if (window.LGQuest && window.LGQuest.hero) window.LGQuest.hero(); }
    if (!JL) return;
    const ks = JTK[jf], ids = new Set(JL.map((e) => e.id));
    let n = 0;
    for (const e of list) { if (ks && !ks.includes(e.k)) continue; if (ids.has(e.id)) { const i = JL.findIndex((x) => x.id === e.id); JL[i] = e; } else { JL.unshift(e); n++; } }
    JL.sort((a, b) => b.at - a.at); if (JL.length > Math.max(300, jCap)) JL.length = Math.max(300, jCap);
    jAt = '';
    if ((n || list.length) && logOn()) renderLog();
  }
  // 18.10: в тексте — название вещи того стиля, что был включён при записи; показываем название стиля сайта
  let nameMap = null, nameMapFor = '';
  function itemText(t) {
    try {
      const st = sty() + '|' + Object.keys(JITEMS).length;
      if (nameMapFor !== st) {
        nameMap = new Map(); nameMapFor = st;
        const N = (D() && D().names) || {};
        for (const [id, ns] of Object.entries(JITEMS)) {
          const all = [...ns]; for (const k of Object.keys(N)) { const x = N[k] && N[k].items && N[k].items[id]; if (x && x.name) all.push(x.name); }
          const mine = nameOf({ id, baseName: ns[ns.length - 1], name: ns[0] });
          for (const n of all) if (n && n !== mine && !nameMap.has(n)) nameMap.set(n, mine);
        }
      }
      return nameMap.size ? String(t).replace(/«([^»]+)»/g, (m, n) => (nameMap.has(n) ? `«${nameMap.get(n)}»` : m)) : t;
    } catch { return t; }
  }
  const dayName = (t) => { const d = new Date(t), now = new Date(), a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date(now.getFullYear(), now.getMonth(), now.getDate()), diff = Math.round((b - a) / 864e5);
    return diff === 0 ? 'Сегодня' : diff === 1 ? 'Вчера' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); };
  const hm = (t) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const coinsTxt = (c) => (c ? `<span class="jr-c ${c > 0 ? 'up' : 'dn'}">${c > 0 ? '+' : '−'}${money(Math.abs(c))}</span>` : '');
  function renderLog() {
    const el = $('#jrFull'), all = JL || []; if (!el) return;
    const list = all;
    // итог по выбранной вкладке: побед / неудач, сумма монет и опыта
    const W = list.filter((e) => e.r === 'win').length, Ls = list.filter((e) => e.r === 'lose').length, Ti = list.filter((e) => e.r === 'tie').length;
    const C = list.reduce((a, e) => a + (+e.c || 0), 0), X = list.reduce((a, e) => a + (+e.x || 0), 0);
    const PW = jf === 'fight' ? [['победа', 'победы', 'побед'], ['поражение', 'поражения', 'поражений']] : [['удача', 'удачи', 'удач'], ['неудача', 'неудачи', 'неудач']];
    const sum = jf === 'all' ? '' : [W ? `<span><b class="up">${W}</b> ${plural(W, ...PW[0])}</span>` : '', Ls ? `<span><b class="dn">${Ls}</b> ${plural(Ls, ...PW[1])}</span>` : '', Ti ? `<span><b>${Ti}</b> ${plural(Ti, 'ничья', 'ничьи', 'ничьих')}</span>` : '',
      C ? `<span>монеты ${coinsTxt(C)}</span>` : '', X ? `<span><b>+${X}</b> опыта</span>` : ''].filter(Boolean).join('');
    let rows = '', day = '';
    for (const e of list) {
      const d = dayName(e.at); if (d !== day) { day = d; rows += `<li class="jr-day">${esc(d)}</li>`; }
      const lbl = e.r ? ((JRK[e.k] || JR)[e.r] ?? JR[e.r]) : '';
      rows += `<li class="jr-e" data-k="${esc(e.k)}"><time datetime="${new Date(e.at).toISOString()}">${hm(e.at)}</time><span class="jr-k">${esc(JKN[e.k] || 'Прочее')}</span><p class="jr-t">${esc(itemText(e.t))}</p>`
        + `<span class="jr-m">${lbl ? `<span class="jr-r ${e.r}">${esc(lbl)}</span>` : ''}${coinsTxt(+e.c || 0)}${+e.x ? `<span class="jr-x">+${+e.x} опыта</span>` : ''}</span></li>`;
    }
    const EMPTY = { all: 'Журнал пуст. Сюда попадут бои, находки, новые вещи, покупки, выигрыши и проигрыши, награды монетами, новые уровни, смерть и воскрешение героя.', fight: 'Боёв пока не было.', shop: 'Покупок пока не было.', find: 'Находок пока не было.', coins: 'Монет пока не было.' };
    el.innerHTML = `<div class="jr panel">
      <div class="bag-h"><h2 class="h2">Журнал</h2><span class="muted">${all.length ? `${all.length} ${plural(all.length, 'запись', 'записи', 'записей')}${jNext ? ' · последние' : ''}` : ''}</span></div>
      <div class="filters jr-tabs" role="group" aria-label="Что показать">${JT.map(([k, l]) => `<button type="button" data-jf="${k}" aria-pressed="${jf === k}">${l}</button>`).join('')}</div>
      ${sum ? `<div class="jr-sum">${sum}</div>` : ''}
      ${list.length ? `<ol class="jr-list">${rows}</ol>` : `<p class="empty">${EMPTY[jf] || EMPTY.all}</p>`}
      ${jNext && list.length ? '<button type="button" class="btn jr-page" data-jmore>Показать ещё</button>' : ''}
      <p class="foot">Журнал обновляется сам, через несколько секунд после события.</p>
    </div>`;
    const mb = el.querySelector('[data-jmore]'); if (mb) mb.onclick = () => { mb.disabled = true; mb.textContent = 'Загружаю…'; moreLog(); };
    el.querySelectorAll('[data-jf]').forEach((b) => b.onclick = () => { if (jf === b.dataset.jf) return; jf = b.dataset.jf; try { localStorage.setItem('lgJf', jf); } catch {} JL = null; jAt = ''; jNext = null; jCap = 300; loadLog(); });
  }

  /* ---------- 22.10: вкладка «Поход» и плашка похода (quest.js; пока только тестерам — флаг qt у героя) ----------
     Данные — событие «q» живого канала (или ql в /api/me): что сейчас в походе, только своё и общее. Файлы грузятся,
     когда пришёл первый вид похода, — пока похода нет, сайт их не качает. */
  let questLoading = null, questOn = false, questPend = null, questParty = '';
  // 23.10: герой вступил в поход (в отряде, пока идёт поход на стриме) — вкладка «Город» видна, но не открывается
  // вход в город округа с кнопки на «Походе» (townEntry) — исключение: отряд стоит в городе, в него можно
  const cityLocked = () => questOn && questParty === 'in' && !townEntry;
  const questOk = () => !!(ME && ME.hero && ME.hero.qt);
  function questFiles() {
    if (questLoading) return questLoading;
    const V = window.LG_QV || {};
    if (!document.getElementById('questCss')) { const l = document.createElement('link'); l.id = 'questCss'; l.rel = 'stylesheet'; l.href = `/site/quest.css?v=${V.css || ''}`; document.head.appendChild(l); }
    questLoading = loadJs(`/site/q/crowdcam.js?v=${V.cc || ''}`).then(() => loadJs(`/site/q/battlecrowd.js?v=${V.bc || ''}`)).then(() => loadJs(`/site/q/shelf.js?v=${V.sh || ''}`))   // shelf.js - полки прилавка, как на оверлее (26.10)
      .then(() => loadJs(`/site/quest.js?v=${V.js || ''}`))
      .then(() => { window.LGQuest.init(QX); }).catch((e) => { questLoading = null; throw e; });
    return questLoading;
  }
  const QX = {
    // 26.10 (стример): журнал на вкладке «Поход» - те же записи, что «Журнал» на «Персонаже» (награды за места, находки, покупки)
    jrHtml: (n) => jrMini(n), jrAll: () => { tab('hero'); goView('log'); },
    // 26.10 (стример): вкладка «Поход» - кукла (слоты вокруг) и сумка: библиотека инвентаря с теми же действиями, что «Персонаж» (inv2Host):
    // двойной клик - надеть / съесть, ПКМ - меню вещи, перетаскивание на слот; монтирует quest.js один раз, дальше - invData
    invData: () => { const h = ME && ME.hero; return h ? { hero: h, items: (h.items || []).slice().sort((a, b) => (a.no || 1e9) - (b.no || 1e9)), stack: (h.sg && h.sg.bs) || 20, bagCap: h.sg ? h.sg.cap : null, ...(+h.ob > 0 ? { obCap: +h.ob } : {}) } : null; },
    invMount: (host, dollEl, root) => {
      const d = QX.invData(); if (!d || !window.LGInventory) return null;
      // 28.10 (bag-trash, стример): слот «Выбросить» под сумкой - только во вкладке «Поход» (у «Персонажа» нет); меню вещи - и там «Выбросить…»
      const trash = (uid) => { if (inv) inv.discard(uid); };
      const inv = window.LGInventory.mount(host, { variant: 'compact', mode: 'equip', data: d,
        actions: {
          equip: (uid) => (inv2Busy() ? null : act('/api/equip', { uid }, word('on', 'Надето'))),
          unequip: (slot) => (inv2Busy() ? null : act('/api/unequip', { slot }, word('off', 'Снято'))),
          use: (uid) => { const it = ME.hero.items.find((x) => x.uid === uid); return act('/api/use', { uid }, it && eatVerb(it) === 'Выпить' ? 'Выпито' : 'Съедено'); },
          reorder: (from, to) => (ordOk(ME && ME.hero) ? ordSave(ordMove(ME.hero, from, to), from) : null),
          discard: async (uids, it, n) => { await act('/api/discard', { uids }, `Выброшено: ${it.name}${n > 1 ? ` ×${n}` : ''}`); const d2 = QX.invData(); if (inv && d2) inv.update(d2); },
        },
        options: {
          trashWhy: (it) => (GD.discardWhy ? GD.discardWhy(it) : ''),
          header: false, vitals: false, storeKey: 'lgQInv', label: word('bag', 'Сумка'), dollEl, dragRoot: root,
          filters: ['all', 'weapon', 'armor', 'helmet', 'shield', 'trinket', 'use', 'other'], art: (it) => art(it),
          figure: (hh) => { const st = hh.stats || {}, mx = st.hp || 0, nw = hh.hpNow ?? mx; return doodle(hh.login, heroLook(hh), mx && nw / mx < 0.3 ? 'hurt' : 'stern', hh.ghost ? undefined : 'battle'); },
          cardTip: (c, it) => cardTip(c, it, ME.hero), tipHide: () => tipHide(),
          canUse: (it) => (eatCd(it, ME.hero) && !(it && it.effect && it.effect.hw) ? 'Еда и зелья ещё не готовы' : true),
          extra: (c) => (c.it.no ? `<span class="no" title="Номер в сумке - для команд в чате">${c.it.no}</span>` : ''),
          menu: (c, it, e) => { const t = TIPS[it.uid] || Object.values(TIPS).find((x) => x.uids && x.uids.includes(it.uid)) || { ...it, n: 1, uids: [it.uid] }; ctxMenu(e.clientX, e.clientY, t, ME.hero, { discard: trash }); },
          say: (t) => toast(t, true),
        } });
      return inv;
    },
    login: () => (ME && ME.user ? String(ME.user.login).toLowerCase() : ''), hero: () => (ME && ME.hero) || null, now: () => now(),
    doodle: (l, h, mood, k) => doodle(l, h, mood, k), esc: (s) => esc(s), tab: (id) => tab(id), money: (n, r) => money(n, r), moneyText: (n, r) => moneyText(n, r), lack: (p, hv, c) => lackHtml(p, hv, c), bal: (p, hv, c) => balHtml(p, hv, c),
    role: (r) => { const n = names().roles; return (n && n[r]) || ROLE_BASE[r] || r; },
    bar: () => document.getElementById('qbar'), el: () => document.getElementById('tab-quest'),
    showing: () => document.getElementById('tab-quest').classList.contains('on'),
    onOff: (on, party) => { const p = on ? String(party || '') : ''; if (questOn === !!on && questParty === p) return; questOn = !!on; questParty = p; questVis(); cityVis(); try { if (window.LGCity && window.LGCity.questChanged) window.LGCity.questChanged(); } catch {} },
    foes: () => questFoes(),
    // 23.10: прилавок лавки похода — рисунок вещи и та же подсказка-карточка, что у товара лавок «Города» (cardTip: характеристики, эффект, описание)
    art: (it) => art(it),
    goodTip: (el, it) => cardTip(el, { ...it, stats: it.stats || {}, wearable: SLOTS.includes(it.slot), on: false, uids: [] }, (ME && ME.hero) || null),
    tipHide: () => tipHide(), tipFor: () => tipFor,
    cardTip: (el, it) => cardTip(el, it, (ME && ME.hero) || null),   // 25.10: сумка вкладки «Поход» (библиотека инвентаря, флаг i2) - та же карточка вещи, что в «Персонаже»
    // 23.10: данж — рисунок комнат стиля канала (грузится, только когда отряд в данже) и голос кликом по проходу (как цифра в чате)
    dungeon: () => questDungeon(),
    vote: (vid, n) => api('/api/qvote', { vid, n }), toast: (t, bad) => toast(t, bad),
    // 25.10: кнопки похода (тестерам — флаг qa у героя): действие — та же команда чата (комната: quest/siteact.js); еда и зелья — как в «Персонаже»
    act: (p) => api('/api/qact', p), say: (line) => api('/api/qsay', { line }),   // 26.10: строка «Команда в поход»
    eat: (uid, btn) => { const it = ME && ME.hero && (ME.hero.items || []).find((x) => x.uid === uid); return act('/api/use', { uid }, it && eatVerb(it) === 'Выпить' ? 'Выпито' : 'Съедено', btn); },   // 25.10: return - сумка вкладки «Поход» ждёт ответа
    // 23.10: «Войти в город N» (отряд стоит в округе ★1–2): «Город» открывается сразу в городе округа (city.js LGCity.town).
    // townEntry — когда вошли так: блокировка «Города» на время похода (если она есть) должна пропускать этот вход
    openTown: (id) => { townEntry = Date.now(); cityFiles().then(() => { if (window.LGCity && window.LGCity.town) window.LGCity.town(id); tab('city'); }).catch(() => toast('Город не загрузился — проверь связь', true)); },
  };
  let townEntry = 0;
  // 22.10: рисунки врагов для вкладки «Поход» (как в оверлее): artkit + враги стиля + client/battle.js — только когда открыли бой
  let questFoesP = null;
  function questFoes() {
    if (window.QBattle && window.QBattle.foe) return Promise.resolve();
    if (questFoesP) return questFoesP;
    const V = window.LG_QV || {}, base = window.LG_BASE || '';
    questFoesP = (window.QArt ? Promise.resolve() : loadJs(`/site/q/artkit.js?v=${V.ak || ''}`)).then(() => loadJs(`${base}/questfoes.js?v=${V.foes || ''}`)).then(() => loadJs(`/site/q/battle.js?v=${V.bt || ''}`))
      .catch((e) => { questFoesP = null; throw e; });
    return questFoesP;
  }
  let questDgP = null;
  function questDungeon() {
    if (window.MDDoodle && window.MDDoodle.dungeonBuild) return Promise.resolve();
    if (questDgP) return questDgP;
    const V = window.LG_QV || {}, base = window.LG_BASE || '';
    questDgP = loadJs(`${base}/questdungeon.js?v=${V.dg || ''}`).catch((e) => { questDgP = null; throw e; });
    return questDgP;
  }
  function questData(d, t) {
    if (t) clock(t);
    if (!questOk() || DOCK) return;
    if (window.LGQuest) { window.LGQuest.data(d); return; }
    questPend = d; if (!d || !d.on) return;
    questFiles().then(() => { if (questPend) { window.LGQuest.data(questPend); questPend = null; } }).catch(() => {});
  }
  function questVis() {
    const b = $('.tabs button[data-tab="quest"]'); if (!b) return;
    const ok = questOk() && questOn;
    b.hidden = !ok;
    if (!questOk() && window.LGQuest) window.LGQuest.data({ on: false });
    if (!ok && $('#tab-quest').classList.contains('on')) tab('hero');
  }
  function questTab(on) { if (window.LGQuest) window.LGQuest.show(on); }

  /* ---------- 23.10: «Карта мира» — мир сезона (worldmap.js; пока только тестерам — флаг wt у героя, worldTabPublic) ----------
     Файлы карты (код, стили, геометрия мира) грузятся, только когда вкладку открыли; данные — при открытии и раз в минуту, пока видна. */
  let worldWant = false, worldLoading = null;
  const worldOk = () => !!(ME && ME.hero && ME.hero.wt);
  function worldVis() {
    const b = $('.tabs button[data-tab="world"]'); if (!b) return;
    const ok = worldOk();
    b.hidden = !ok;
    if (!ok && $('#tab-world').classList.contains('on')) tab('hero');
    if (ok && worldWant) { worldWant = false; tab('world'); }
  }
  function worldFiles() {
    if (worldLoading) return worldLoading;
    const V = window.LG_WORLDV || {};
    if (!document.getElementById('worldCss')) { const l = document.createElement('link'); l.id = 'worldCss'; l.rel = 'stylesheet'; l.href = `/site/worldmap.css?v=${V.css || ''}`; document.head.appendChild(l); }
    worldLoading = loadJs(`/site/worldmap.js?v=${V.js || ''}`).catch((e) => { worldLoading = null; throw e; });
    return worldLoading;
  }
  const WX = {
    api: (p) => api(p), now: () => now(), toast: (t, bad) => toast(t, bad),
    // «Войти в город» из карточки округа: тот же вход, что с «Похода» (openTown). Блокировку «Города» на время похода
    // пропускает только вход участника отряда в город, где стоит отряд (why = party) — как кнопка во вкладке «Поход»
    openTown: (id, why) => { if (cityLocked() && why !== 'party') { toast('Вы сейчас в походе — в город после похода', true); return; } QX.openTown(id); },
  };
  async function openWorld() {
    const el = $('#tab-world');
    if (!worldOk()) { el.innerHTML = SU.note('Карта мира пока закрыта.'); return; }
    if (!window.LGWorld && !(await SU.loadInto(el, worldFiles, 'Карта мира разворачивается…', 'Карта мира не загрузилась — проверь связь и открой вкладку ещё раз.'))) return;   // 25.10: packages/site-ui
    if (!$('#tab-world').classList.contains('on') || !window.LGWorld) return;
    window.LGWorld.open(el, WX);
  }

  /* ---------- 20.10: «Город» — Ярмарка канала, где гуляют герои (city.js; пока только тестерам — флаг cy у героя) ----------
     Файлы «Города» (Ярмарка стиля, карта, рисунок квартала, сам город) грузятся, только когда вкладку открыли. */
  let cityWant = false, cityLoading = null;
  function cityVis() {
    const ok = !!(ME && ME.hero && ME.hero.cy), b = $('.tabs button[data-tab="city"]');
    if (!b) return;
    b.hidden = !ok;
    const lock = ok && cityLocked();
    b.classList.toggle('tab-lock', lock);
    if (lock) { b.setAttribute('aria-disabled', 'true'); b.title = 'Вы сейчас в походе'; } else { b.removeAttribute('aria-disabled'); b.removeAttribute('title'); }
    if (!ok && $('#tab-city').classList.contains('on')) tab('hero');
    if (lock && $('#tab-city').classList.contains('on')) tab(questOk() && questOn ? 'quest' : 'hero');
    if (ok && !lock && cityWant) { cityWant = false; tab('city'); }
  }
  const loadJs = (src) => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  function cityFiles() {
    if (cityLoading) return cityLoading;
    const V = window.LG_CITYV || {}, base = window.LG_BASE || '';
    if (!document.getElementById('cityCss')) { const l = document.createElement('link'); l.id = 'cityCss'; l.rel = 'stylesheet'; l.href = `/site/city.css?v=${V.css || ''}`; document.head.appendChild(l); }
    cityLoading = loadJs(`${base}/cityfair.js?v=${V.fair || ''}`).then(() => loadJs(`/site/citymap.js?v=${V.map || ''}`)).then(() => loadJs(`/site/cityart.js?v=${V.art || ''}`)).then(() => loadJs(`/site/citygl.js?v=${V.gl || ''}`)).then(() => loadJs(`/site/itemgrid.js?v=${V.ig || ''}`)).then(() => loadJs(`/lib/site-chat.js?v=${V.sc || ''}`)).then(() => loadJs(`/site/city.js?v=${V.js || ''}`)).then(() => loadJs(`/site/trade.js?v=${V.tr || ''}`))
      .catch((e) => { cityLoading = null; throw e; });
    return cityLoading;
  }
  // что нужно городу от сайта
  const CX = {
    hero: () => (ME && ME.hero) || null, login: () => (ME && ME.user ? String(ME.user.login).toLowerCase() : ''), style: () => sty(),
    doodle: (l, h, mood, k) => doodle(l, h, mood, k), fig: (l, v, o) => figSvg(l, v, o), heroLook: (h) => heroLook(h), still: (svg) => still(svg), awb: (aw) => awb(aw), awPop: (a, r, k) => awPop(a, r, k), awHide: (pre) => awHide(pre), ico: (k) => ico(k),
    api: (p, b) => api(p, b), act: (p, b, ok, btn) => act(p, b, ok, btn), money: (n, r) => money(n, r), moneyText: (n, r) => moneyText(n, r), lack: (p, hv, c) => lackHtml(p, hv, c), bal: (p, hv, c) => balHtml(p, hv, c), art: (it) => art(it),
    itemName: (id) => { const n = names().items; return (n && n[id] && n[id].name) || ''; }, eff: (it) => effText(it),
    inQuest: () => questOn && questParty === 'in',   // 25.10: в отряде идущего похода - выбор городов скрыт (только город отряда)
    ench: () => EN(), mats: (h) => matsOf(h), canEnch: (it) => canEnch(it) && !it.mat, forgeOpen: (uid, host) => forgeOpen(uid, host), forgeClose: () => { if (FG.host) forgeClose(); },
    repBlock: (h) => repBlockHtml(h), repBind: (el) => repBind(el), durLow: () => REP().low,   // 22.10: починка у наковальни — всем
    skx: (re) => ({ ...SKX, act: (p, b, ok, btn) => act(p, b, ok, btn).then(() => { if (btn && btn.isConnected && btn.textContent === 'Секунду…' && !busy) re(); }), rerender: () => { last = ''; renderHero(); re(); } }), live: () => esOk, tab: (id) => tab(id),   // 23.10: в Городе (Тренер) окно — своё, renderHero его не трогает: перерисовываем сами, иначе кнопка навсегда «Секунду…»
    // 22.10: карточка вещи для аукциона — те же функции, что у окна персонажа (характеристики, подсказки, аура, класс, заточка, прочность)
    itemBody: (it, h, o) => itemBody(it, h, o), enchStats: (base, en, bonus) => enchStatsN(base, en, bonus), lgx: (it) => lgx(it), tips: (el) => tipOn(el),
    stOk: (k, h) => stOk(k, h), stLabel: (k) => stLabel(k), stNum: (k, v) => stNum(k, v), xst: () => Object.keys(XST), st: () => Object.keys(ST),
    clsOf: (it) => clsOf(it), roleOf: (id) => roleOf(id, ((ME && ME.roles) || {})[id]), classes: () => classIds(ME && ME.hero),   // 25.10: классы для фильтров (аукцион) — тот же список, что у сумки
    // 23.10: наковальня — кукла героя (та же, что во вкладке «Персонаж») и подсказка-карточка вещи
    doll: (h, o) => dollHtml(h, o), cardTip: (el, it, h, o) => cardTip(el, it, h, o), tipHide: () => tipHide(), tipFor: () => tipFor,
    toast: (t, bad) => toast(t, bad),   // 23.10: обмен между игроками (trade.js) — приглашения, итог
    mineFiles: () => mineFiles(),   // 24.10: Ратуша — цвета ресурсов склада (craftworld.js)
    openMine: (c) => (c ? openMine(c) : openMines()),   // 24.10: шахты городов — портал «ШАХТА» в «Городе» (c — id шахты: округ или home — Ярмарка); без c — выбор
    openMineBoard: async () => { try { await mineFiles(); } catch { toast('Не загрузилось — проверь связь', true); return; } window.LGMine.board({ api: (p, b) => api(p, b), login: () => (ME && ME.user ? String(ME.user.login).toLowerCase() : ''), mines: () => mineList() }); },
  };
  /* ---------- 23.10: шахта (промысел города): mine.js + craftworld.js, грузятся при первом входе ---------- */
  let mineLoading = null;
  function mineFiles() {
    if (mineLoading) return mineLoading;
    const V = window.LG_CITYV || {};
    if (!document.getElementById('mineCss')) { const l = document.createElement('link'); l.id = 'mineCss'; l.rel = 'stylesheet'; l.href = `/site/mine.css?v=${V.mc || ''}`; document.head.appendChild(l); }
    // 25.10: mine-art.js - новые рисунки шахты (обновление mine2; без флага не используется)
    mineLoading = loadJs(`/site/craftworld.js?v=${V.mw || ''}`).then(() => loadJs(`/site/mine-art.js?v=${V.ma || ''}`)).then(() => loadJs(`/site/mine.js?v=${V.mj || ''}`)).then(() => (window.LGItems ? null : loadJs(`/site/itemgrid.js?v=${V.ig || ''}`).catch(() => null))).then(() => (window.LGChat ? null : loadJs(`/lib/site-chat.js?v=${V.sc || ''}`).catch(() => null))).catch((e) => { mineLoading = null; throw e; });
    return mineLoading;
  }
  // 24.10: шахты канала — домашняя и шахты городов своих округов (★ — опасность округа, природа — вид и самоцвет)
  const BIO_RU = { mount: 'горы', ash: 'пепел', forest: 'лес', taiga: 'тайга', ice: 'лёд', meadow: 'луга', swamp: 'болото', blight: 'порча', coast: 'побережье', desert: 'пустыня', ruin: 'руины' };
  const GEM_RU = { adamant: 'адамантит', fire_opal: 'огненный опал', emerald: 'изумруд', sapphire: 'сапфир', topaz: 'топаз', malachite: 'малахит', morion: 'морион', aquamarine: 'аквамарин', ruby: 'рубин', runestone: 'рунный камень' };
  const mineList = () => Object.entries((ME && ME.hero && ME.hero.mn) || {}).map(([id, m]) => ({ id, nm: (m && m.nm) || 'Шахта', dist: (m && m.dist) || '', bi: (m && m.bi) || 'mount', dg: (m && m.dg) || 1, gem: (m && m.gem) || null, busy: !!(m && m.i >= 0) }))
    .sort((a, b) => (a.id === 'home' ? -1 : b.id === 'home' ? 1 : b.dg - a.dg || a.nm.localeCompare(b.nm, 'ru')));
  function openMines() {
    const list = mineList();
    if (!list.length) { toast('Шахта пока закрыта', true); return; }
    if (list.length === 1) { openMine(list[0].id); return; }
    const d = document.createElement('div'); d.className = 'mn-board-w'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Шахты наших городов');
    d.innerHTML = `<div class="mn-board panel mn-go"><h3 class="h3">Шахты наших городов</h3><p class="muted">Шахта есть в каждом городе ваших округов. Чем опаснее округ (★), тем богаче руда; у каждой природы — свой самоцвет.</p><ul>${list.map((m) => `<li><button type="button" class="btn ghost" data-go="${esc(m.id)}"><span aria-hidden="true">⛏</span><b>${esc(m.id === 'home' ? 'Домашняя шахта' : m.nm)} ${'★'.repeat(Math.max(1, Math.min(5, m.dg)))}</b><small>${esc([m.dist, BIO_RU[m.bi]].filter(Boolean).join(' · '))}${m.gem ? ` · самоцвет: ${esc(GEM_RU[m.gem] || m.gem)}` : ''}</small>${m.busy ? '<em>твой герой копает здесь</em>' : ''}</button></li>`).join('')}</ul><button type="button" class="btn primary" data-x>Закрыть</button></div>`;
    // 25.10: окно поверх страницы (Esc и нажатие мимо закрывают) - packages/site-ui; кладётся в полноэкранный элемент, если он есть
    const shut = SU.layer(d);   // 24.10: «Город» во весь экран — окно внутри него, иначе не видно
    d.querySelector('[data-x]').onclick = shut;
    d.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { shut(); openMine(b.dataset.go); }; });
    try { d.querySelector('[data-go]').focus({ preventScroll: true }); } catch {}
  }
  async function openMine(c = 'home') {
    if (!ME || !ME.hero || !ME.hero.mn || !ME.hero.mn[c]) { toast('Эта шахта закрыта', true); return; }
    try { await mineFiles(); } catch { toast('Шахта не загрузилась — проверь связь', true); return; }
    // 26.10 (iPhone: вкладка падала по памяти): пока открыта шахта, «Город» отпускает сцену (city.js sleep), «В город» - собирает заново
    const C = window.LGCity; try { if (C && C.sleep) C.sleep(); } catch (e) { console.warn('[город] sleep', e); }
    window.LGMine.open({ login: () => (ME && ME.user ? String(ME.user.login).toLowerCase() : ''), hero: () => (ME && ME.hero) || null, doodle: (l, h, mood, k) => doodle(l, h, mood, k), fig: (l, v, o) => figSvg(l, v, o), heroLook: (h) => heroLook(h),
      api: (p, b) => api(p, b), money: (n) => money(n), toast: (t, bad) => toast(t, bad), live: () => esOk, close: () => { try { if (C && C.wake) C.wake(); } catch (e) { console.warn('[город] wake', e); } },
      mines: () => mineList(),   // 25.10: доска «Итоги шахты» — и из самой шахты (кнопка «Итоги»)
      // 25.10: сумка шахты (обновление mine2) — та же кукла, рисунки вещей и карточка с сравнением, что во вкладке «Персонаж»
      art: (it) => art(it), doll: (h, o) => dollHtml(h, o), cardTip: (el, it, h, o) => cardTip(el, it, h, o), tipHide: () => tipHide(),
      // 23.10: сумка в шахте — надеть / снять (как во вкладке «Персонаж»: снимок героя сразу, игра применит через пару секунд)
      equip: async (uid) => { const r = await api('/api/equip', { uid }); if (r && r.ok && r.hero) { ME.hero = r.hero; last = ''; renderHero(); } return r; },
      unequip: async (slot) => { const r = await api('/api/unequip', { slot }); if (r && r.ok && r.hero) { ME.hero = r.hero; last = ''; renderHero(); } return r; } }, c);
  }
  async function openCity() {
    const el = $('#tab-city');
    if (!ME || !ME.hero || !ME.hero.cy) { el.innerHTML = SU.note('Город пока закрыт.'); return; }
    if (!window.LGCity && !(await SU.loadInto(el, cityFiles, 'Город строится на глазах…', 'Город не загрузился — проверь связь и открой вкладку ещё раз.'))) return;   // 25.10: packages/site-ui
    if (!$('#tab-city').classList.contains('on') || !window.LGCity) return;
    window.LGCity.open(el, CX);
  }

  /* ---------- 24.10: «Отправить баг» — маленькая кнопка внизу справа (только вошедшим); форма (bugreport.js) — по первому нажатию ----------
     Кнопка не мешает: если в её углу нижняя панель, окно, затемнение, чат или кнопки «Города», кнопки карты, переключатель стиля —
     она поднимается над ними, а места нет — прячется; пока набирают текст (поле в фокусе, клавиатура телефона) — тоже прячется.
     Проверка — по событиям (прокрутка, размер окна, клики, фокус, изменения страницы; не чаще раза в 150 мс), не каждый кадр.
     «×» — свернуть в язычок у края экрана (помнится в браузере), нажатие на язычок — развернуть. */
  const BF = { el: null, up: 0, t: 0, min: false, loading: null };
  try { BF.min = localStorage.getItem('lgBugMin') === '1'; } catch {}
  const bfWant = () => !DOCK && !!(ME && ME.user) && !$('#tab-streamer').classList.contains('on');
  function bfInit() {
    if (BF.el || DOCK) return;
    const d = document.createElement('div');
    d.className = 'bugfab off'; d.id = 'bugfab';
    d.innerHTML = '<button type="button" class="bugfab-b" aria-label="Отправить баг или отзыв" title="Нашли ошибку? Отправить баг"><span class="bugfab-i" aria-hidden="true">🐞</span><span class="bugfab-t">Отправить баг</span></button>'
      + '<button type="button" class="bugfab-x" aria-label="Свернуть кнопку «Отправить баг»" title="Свернуть">×</button>';
    document.body.appendChild(d); BF.el = d;
    d.querySelector('.bugfab-b').onclick = () => { if (BF.min) bfMin(false); else bugOpen(); };
    d.querySelector('.bugfab-x').onclick = (e) => { e.stopPropagation(); bfMin(true); };
    const kick = () => bfSoon();
    window.addEventListener('resize', kick);
    window.addEventListener('scroll', kick, { passive: true, capture: true });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', kick);
    document.addEventListener('focusin', kick);
    document.addEventListener('focusout', () => setTimeout(bfSoon, 60));
    document.addEventListener('click', () => { bfSoon(); setTimeout(bfSoon, 400); }, true);   // открылась панель с анимацией — ещё раз, когда доехала
    document.addEventListener('transitionend', kick, true);
    try { new MutationObserver((ms) => { for (const m of ms) if (!d.contains(m.target)) { bfSoon(); return; } }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] }); } catch {}
  }
  function bfMin(on) {
    BF.min = !!on; try { if (on) localStorage.setItem('lgBugMin', '1'); else localStorage.removeItem('lgBugMin'); } catch {}
    bfPlace();
    if (on) toast('Кнопка «Отправить баг» свёрнута - она у правого края');
  }
  function bfSoon() { if (BF.t || !BF.el) return; BF.t = setTimeout(() => { BF.t = 0; bfPlace(); }, 150); }
  const BF_IA = 'button, a[href], input, textarea, select, label, summary, [role="button"], [role="tab"], [role="slider"], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';
  // что под точкой мешает кнопке: слой поверх страницы (position: fixed — нижняя панель, окно, затемнение, комната «Города»)
  // или кнопка/поле поверх карты (у неё или предка position: absolute; в «Городе» — его чат, полоса зданий, стрелки).
  // Обычные кнопки страницы прокручиваются вместе с ней — их не считаем (внизу страницы под кнопку оставлен запас)
  function bfBlock(e) {
    if (!e || e === document.documentElement || e === document.body) return null;
    for (let n = e; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return n;
    const ia = e.closest(BF_IA); if (!ia) return null;
    const ir = ia.getBoundingClientRect();
    if (ir.width * ir.height > window.innerWidth * window.innerHeight * 0.25) return null;   // сама карта (tabindex для клавиатуры) — не кнопка
    if (ia.closest('.cy'))return ia.closest('.cy-chat, .cy-bar') || ia;
    for (let n = ia; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'absolute') return n;
    return null;
  }
  function bfHit(x, y, w, h) {
    for (const [px, py] of [[x + 3, y + 3], [x + w - 3, y + 3], [x + 3, y + h - 3], [x + w - 3, y + h - 3], [x + w / 2, y + h / 2]]) {
      if (py < 0 || px < 0) return { top: 0 };
      for (const e of document.elementsFromPoint(px, py)) { if (BF.el.contains(e)) continue; const b = bfBlock(e); if (b) return b.getBoundingClientRect(); break; }
    }
    return null;
  }
  function bfPlace() {
    const el = BF.el; if (!el) return;
    const want = bfWant();
    el.hidden = !want;
    document.documentElement.classList.toggle('bugfab-on', want && !BF.min);
    if (!want) return;
    el.classList.toggle('min', BF.min);
    const ae = document.activeElement;
    const typing = ae && ae !== document.body && !el.contains(ae) && ae.matches && ae.matches('input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]), textarea, select, [contenteditable]:not([contenteditable="false"])');
    const vv = window.visualViewport, kb = !!vv && window.innerHeight - vv.height > 150;
    if (typing || kb || document.querySelector('.bugm')) { el.classList.add('off'); return; }
    // где кнопка стоит без подъёма (сейчас она может быть уже поднята или ещё доезжать — вычитаем текущий сдвиг)
    let dy = 0; try { dy = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42; } catch {}
    const r = el.getBoundingClientRect(), top0 = r.top - dy, vh = window.innerHeight, maxUp = vh * 0.55;
    for (let up = 0, n = 0; up <= maxUp && n < 12; n++) {
      const b = bfHit(r.left, top0 - up, r.width, r.height);
      if (!b) { el.classList.remove('off'); if (up !== BF.up) { BF.up = up; el.style.setProperty('--bf-up', up + 'px'); } return; }
      up = Math.max(up + 16, Math.ceil(top0 + r.height + 10 - b.top));   // над мешающим
    }
    el.classList.add('off');
  }
  function bugOpen() {
    if (!ME || !ME.user) { toast('Войди через Twitch, чтобы отправить баг', true); return; }
    const v = window.LG_BUGV || {};
    const add = (tag, attrs) => new Promise((ok, bad) => { const x = document.createElement(tag); Object.assign(x, attrs); x.onload = () => ok(); x.onerror = bad; document.head.appendChild(x); });
    if (!BF.loading) BF.loading = Promise.all([add('link', { rel: 'stylesheet', href: '/site/bugreport.css' + (v.css ? '?v=' + v.css : '') }), add('script', { src: '/site/bugreport.js' + (v.js ? '?v=' + v.js : '') })])
      .catch((e) => { BF.loading = null; throw e; });
    BF.el.classList.add('busy');
    BF.loading.then(() => { if (window.LGBug) { window.LGBug.open(bugCtx()); bfPlace(); } }, () => toast('Форма не загрузилась - проверь связь', true)).finally(() => { if (BF.el) BF.el.classList.remove('busy'); });
  }
  // что приложим к репорту: раздел сайта, канал, оформление, версия сайта (браузер и экран форма добавит сама)
  function bugCtx() {
    const t = $('.tab.on'), id = t ? t.id.replace(/^tab-/, '') : '', tb = id && $(`.tabs button[data-tab="${id}"]`);
    const VN = { gear: 'Снаряжение', look: 'Облик', skills: 'Навыки', ach: 'Достижения', log: 'Журнал' };
    return { user: ME.user, ch: CH, tab: id, tabName: tb ? tb.textContent.trim() : '', view: id === 'hero' ? view : '', viewName: id === 'hero' ? VN[view] || '' : '',
      style: sty(), ver: window.LG_SITEV || '', login: window.LG_LOGIN || '/auth/login', toast, demo: DEMO,
      onClose: () => { bfSoon(); const b = BF.el && BF.el.querySelector('.bugfab-b'); if (b && BF.el.contains(document.activeElement) === false) try { b.focus({ preventScroll: true }); } catch {} } };
  }

  /* ---------- загрузка ---------- */
  async function load() {
    const r = await api('/api/me');
    if (!r || r.ok === false) return;
    apply(r, true);
    if (r.ql) questData(r.ql, r.now);   // 22.10: вкладка «Поход» без живого канала — по опросу
  }
  // данные героя пришли (запросом или по живому каналу) — перерисовываем, только если что-то поменялось
  let laterT = 0;
  function apply(r, full) {
    const wasUser = !!(ME && ME.user);
    const next = full ? r : { ...ME, hero: r.hero, creating: r.creating, results: r.results, synced: r.synced || (ME && ME.synced), ...(r.fq ? { fq: r.fq } : {}) };
    const k = JSON.stringify([next.user, next.hero, next.creating, (next.results || []).map((x) => x.id)]);
    ME = next; nameItems(ME && ME.hero);
    for (const x of (ME && ME.results) || []) {
      if (shownRes.has(x.id)) continue;
      if (x.x && x.x.op === 'qact') { shownRes.add(x.id); if (window.LGQuest && window.LGQuest.result) window.LGQuest.result(x); else if (!x.ok) toast(x.error || 'Не вышло', true); continue; }   // 25.10: ответ игры на кнопку похода
      if (x.x && x.x.op === 'seal') { shownRes.add(x.id); toast('Печать применена: у героя теперь свой стиль'); continue; }   // 26.10: Печать Метаморфозы
      if (x.x && /^(st|auc|note)/.test(x.x.op || '')) { shownRes.add(x.id); storeNote(x); continue; }
      if (x.x && /^mine/.test(x.x.op || '')) { shownRes.add(x.id); if (window.LGMine && window.LGMine.result) window.LGMine.result(x); else if (!x.ok) toast(x.error || 'Не вышло', true); continue; }   // 26.10: шахта (окно скупщика) — не в окно Кузни   // 22.10: склад, аукцион (вещь ушла на склад), сообщение без действия
      if (x.x || x.id === FG.wait) { shownRes.add(x.id); forgeDone(x); continue; }   // 20.10: заточка, ковка, покупка — итог в окне Кузни
      if (!x.ok) { shownRes.add(x.id); toast('Игра не применила изменение: ' + (x.error || 'вещи больше нет'), true); }
    }
    fgSync();   // 25.10: «кузнец работает» - по очереди шлюза
    if (FG.el) fgRender();
    if (k === last) return; last = k;   // ничего не поменялось — не перерисовываем (не сбиваем прокрутку)
    // пока тянут вещь или открыто меню — перерисуем чуть позже
    if (DR.active || DR.src || document.querySelector('.ctxm') || busy) { clearTimeout(laterT); laterT = setTimeout(() => { last = ''; apply(ME, true); }, 700); return; }
    renderUser(); renderHero(); smVis(); cityVis(); questVis(); worldVis();
    if (window.LGQuest && window.LGQuest.hero) window.LGQuest.hero();   // 25.10: панель героя во вкладке «Поход» (здоровье, еда, баффы)
    if (window.LGMine && window.LGMine.on && window.LGMine.hero) window.LGMine.hero();   // 27.10: сумка в шахте - сразу новые кучки и осколки (раньше рисовалась только при открытии)
    if (ME && ME.user) bfInit(); bfSoon();   // 24.10: «Отправить баг»
    if (window.LGCity && $('#tab-city').classList.contains('on')) window.LGCity.heroChanged();
    if (!wasUser && ME.user) { if (logOn()) loadLog(); live(); }
  }

  /* ---------- 18.10: живые обновления: свой герой и свои записи журнала приходят сами (SSE), без опроса ----------
     Вкладка в фоне дольше минуты — соединение закрываем (вернулся — открываем и разом догоняем). Нет SSE — опрос раз в 30 с с ETag. */
  // 18.10: стримеру (вкладка «Режим стримера» или док OBS) — в том же канале событие «sm»: разделы, «Готовность», стиль канала
  // поменялись — док обновляется сам. Док OBS никогда не «прячется» — его канал не закрываем; героя ему не шлют (only=sm)
  let ES = null, esOk = false, esFails = 0, hideT = 0, smEs = false, smOpen = 0;
  function live() {
    if (DEMO || ES || !window.EventSource) return;
    if (!DOCK && (!ME || !ME.user || document.hidden)) return;
    const q = DOCK ? '?sm=1&only=sm' : ME.streamer ? '?sm=1' : '';
    try { ES = new EventSource((window.LG_BASE || '') + '/api/live' + q); } catch { ES = null; return; }
    if (!DOCK) {
      ES.addEventListener('me', (e) => { esOk = true; esFails = 0; try { const d = JSON.parse(e.data); if (d.now) clock(d.now); apply(d, false); } catch {} });
      ES.addEventListener('j', (e) => { try { logAdd(JSON.parse(e.data)); } catch {} });
      ES.addEventListener('city', (e) => { try { if (window.LGCity) window.LGCity.onEvent(JSON.parse(e.data)); } catch {} });
      ES.addEventListener('mine', (e) => { try { if (window.LGMine && window.LGMine.on) window.LGMine.onEvent(JSON.parse(e.data)); } catch {} });   // 23.10: шахта   // 20.10: «Город»
      ES.addEventListener('q', (e) => { try { const d = JSON.parse(e.data); questData(d, d.now); } catch {} });   // 22.10: вкладка «Поход»
    }
    ES.addEventListener('style', (e) => { let d = {}; try { d = JSON.parse(e.data) || {}; } catch {} styleEvent(String(d.style || '')); });   // 28.10 (fix/style-live)
    ES.addEventListener('sm', (e) => { let d = {}; try { d = JSON.parse(e.data) || {}; } catch {} if ((d.why || []).includes('mods')) { smStale = true; smStaleCheck(); } smRefresh(true, d.style); smTell(d.why); });
    ES.onopen = () => { smEs = !!q; if (DOCK) esFails = 0; if (q && smOpen++ && SM.data) smRefresh(true); };   // переподключились — что-то могли пропустить
    ES.addEventListener('busy', () => { stopLive(); esFails = 99; });
    ES.onerror = () => { esOk = false; smEs = false; if (++esFails > 5) stopLive(); };   // браузер переподключается сам; совсем не выходит — опрос
  }
  function stopLive() { if (ES) { try { ES.close(); } catch {} ES = null; } esOk = false; smEs = false; }
  document.addEventListener('visibilitychange', () => {
    if (DOCK) return;
    clearTimeout(hideT);
    if (document.hidden) { hideT = setTimeout(stopLive, 60000); return; }
    if (!ES) { if (esFails < 99) esFails = 0; load(); live(); if (logOn()) loadLog(); if (JA) loadMini(true); }
  });
  const shownRes = new Set();
  mqWide.addEventListener && mqWide.addEventListener('change', () => { sheet = false; renderHero(); });
  window.LG = { restyle: (st) => siteRestyle(st), rerender: (keepSm) => { last = ''; INV.artReset(); applyStyle(); if (SM.data && !keepSm) { smDrop(); if ($('#tab-streamer').classList.contains('on')) openStreamer(); } load(); if ($('#tab-legion').classList.contains('on')) legOpen(); if (logOn()) { jAt = ''; loadLog(); } } };
  /* ---------- ВРЕМЕННО: переключатель стиля сайта (для каждого зрителя свой, запоминается в браузере) ----------
     Убрать: TEMP_STYLE_SWITCH = false. Без выбора сайт берёт стиль, включённый у стримера в MultiDonate. */
  const TEMP_STYLE_SWITCH = true;
  const STYLE_LIST = SU.STYLES;   // 28.10: все 7 стилей (packages/site-ui)
  const BASE_STYLE = sty();
  // 18.10: стили, открытые зрителям канала (сервер: LG_STYLES; сейчас — только стиль канала). Один — выбора нет, кнопки не нужны
  const OPEN = Array.isArray(window.LG_STYLES) ? window.LG_STYLES : STYLE_LIST.map(([k]) => k);
  const canSwitch = STYLE_LIST.filter(([k]) => OPEN.includes(k) && D() && D().styles && D().styles[k]).length > 1;
  if (!canSwitch) try { localStorage.removeItem('lgStyle'); } catch {}
  if (TEMP_STYLE_SWITCH && !DEMO && !DOCK && canSwitch) {
    try { const v = localStorage.getItem('lgStyle'); if (v && OPEN.includes(v) && D() && D().styles && D().styles[v]) D().use(v); } catch {}
    const box = document.createElement('div');
    box.className = 'style-switch'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Стиль сайта');
    const paint = () => { box.innerHTML = `<span class="ss-l">Стиль</span>` + STYLE_LIST.filter(([k]) => OPEN.includes(k) && D() && D().styles && D().styles[k]).map(([k, l]) => `<button type="button" data-st="${k}" aria-pressed="${sty() === k}">${l}</button>`).join(''); };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-st]'); if (!b) return;
      try { D().use(b.dataset.st); } catch {}
      try { if (b.dataset.st === BASE_STYLE) localStorage.removeItem('lgStyle'); else localStorage.setItem('lgStyle', b.dataset.st); } catch {}
      paint(); window.LG.rerender();
    });
    paint(); document.body.appendChild(box);
  }
  applyStyle();
  // док-панель OBS: только режим стримера (права уже проверил сервер) — героя, журнал и живой канал не грузим
  if (DOCK) { document.documentElement.classList.add('dock'); $('.tabs button[data-tab="streamer"]').hidden = false; tab('streamer'); live(); return; }
  chswInit();
  let t0 = 'hero'; try { t0 = localStorage.getItem('lgTab') || 'hero'; } catch {}
  // 18.10: ссылка «Режим стримера» из «Моих каналов» — /c/<канал>/#streamer
  if (location.hash === '#streamer') { t0 = 'streamer'; try { history.replaceState(history.state, '', location.pathname + location.search); } catch {} }
  // 25.10: из закрытой «Песочницы» перенаправляют на «Город» канала владельца - /c/<канал>/#city
  if (location.hash === '#city') { t0 = 'city'; try { history.replaceState(history.state, '', location.pathname + location.search); } catch {} }
  window.addEventListener('hashchange', () => { if (location.hash === '#streamer') { try { history.replaceState(history.state, '', location.pathname + location.search); } catch {} if (smOk()) tab('streamer'); else smWant = true; } });
  if (t0 === 'streamer') smWant = true;
  if (t0 === 'world') worldWant = true;   // 23.10: «Карта мира» — когда придёт герой с доступом
  if (t0 === 'city') cityWant = true;   // 20.10: «Город» — когда придёт герой с доступом
  if (t0 === 'log') { view = 'log'; t0 = 'hero'; }   // 23.10: вкладки «Журнал» больше нет — он внутри «Персонажа»
  if (t0 === 'soc') { lgv = 'soc'; t0 = 'legion'; }   // 23.10: вкладки «Соц. рейтинг» больше нет — она в «Легионе»
  tab(t0 === 'legion' || t0 === 'news' ? t0 : 'hero');
  load().then(live);
  // без живого канала — опрос (ответ без изменений — 304, почти без трафика); героя создают — чаще, пока не появится
  setInterval(() => { if (document.visibilityState === 'visible' && !busy && !DEMO && !esOk) load(); }, 30000);
  setInterval(() => { if (document.visibilityState === 'visible' && !busy && !DEMO && !esOk && ME && ME.user && !ME.hero) load(); }, 5000);
  // Легион и рейтинг меняются медленно — раз в минуту, только если вкладка открыта и видна
  setInterval(() => { if (document.hidden || DEMO) return; if ($('#tab-legion').classList.contains('on')) legOpen(); }, 60000);
})();
