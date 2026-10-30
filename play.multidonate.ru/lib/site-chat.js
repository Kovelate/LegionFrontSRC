/* 25.10: чат сайта — общий для чата «Города» и чата шахты (window.LGChat). Часть библиотеки site-ui (packages/site-ui/chat.js,
   шлюз отдаёт /lib/site-chat.js; до 25.10 - legacy/site/public/sitechat.js). Грузится по требованию (app.js: cityFiles / mineFiles).
   Код перенесён из city.js как есть (21.10-24.10:
   вкладки, личные, игнор, модерация, команды /mute /ban, меню ника); разница чатов — в параметрах K:
   K = { state() — объект хозяина (город или шахта: el — корень, в нём .cy-chat; chat — состояние чата), X() — помощники сайта (api, hero,
          login, awb), base — адрес чата ('/api/city/chat'), say — куда писать ('/api/city/say'), key — ключ localStorage (открыт / свёрнут),
          name — заголовок, ph — подсказка в поле, where — «в чате города» (подтверждение бана), flags(hero) → { on, tr, dm },
          trade — пункт «Предложить обмен», here() / joining / rejoin() — хозяин на месте? (иначе — «подключаемся», войти заново),
          onError(текст) — ошибка отправки, bubble(l, t, id) / unbubble(id) — облачко над героем (есть только в «Городе»),
          log() - 30.10: вкладка «Журнал» (только чтение): события хозяина [{ t, at }] новыми сверху (есть только у шахты; в html(K) - log: подпись) }
   Сервер — src/site/citychat.ts (одна лента на чат) и SiteChannel.chat* (src/site/site.ts) с комнатой чата (город / шахта). */
(function () {
  'use strict';
  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
    const html = (K) => `<section class="cy-chat" hidden aria-label="${esc(K.name || 'Чат')}">
          <button type="button" class="cy-chat-t" aria-expanded="false"><span aria-hidden="true">💬</span> Чат<b class="cy-chat-n" hidden></b></button>
          <div class="cy-chat-b" hidden>
            <div class="cy-chat-h"><span>${esc(K.name || 'Чат')}</span><button type="button" class="cy-chat-sh" hidden aria-pressed="false" aria-label="Модерация чата" title="Модерация чата">⚙︎</button><button type="button" class="cy-chat-x" aria-label="Свернуть чат" title="Свернуть чат"><i aria-hidden="true"></i></button></div>
            <div class="cy-chat-tabs" role="tablist" aria-label="Вкладки чата" hidden><button type="button" role="tab" data-tab="g" aria-selected="true">${K.one ? 'Город' : 'Общий'}<b class="cy-chat-tn" hidden></b></button><button type="button" role="tab" data-tab="tr" aria-selected="false" hidden>Торговля<b class="cy-chat-tn" hidden></b></button><button type="button" role="tab" data-tab="ev" aria-selected="false" hidden title="События игры: заточки, достижения">Достижения<b class="cy-chat-tn" hidden></b></button><button type="button" role="tab" data-tab="mn" aria-selected="false" hidden>Шахта<b class="cy-chat-tn" hidden></b></button><button type="button" role="tab" data-tab="dm" aria-selected="false" hidden>Личные<b class="cy-chat-tn" hidden></b></button>${K.log ? `<button type="button" role="tab" data-tab="lg" aria-selected="false" hidden title="События шахты">${esc(K.log)}<b class="cy-chat-tn" hidden></b></button>` : ''}</div>
            <div class="cy-chat-p" hidden></div>
            <ol class="cy-chat-l" role="log" aria-label="Сообщения"></ol>
            <div class="cy-chat-dmx" hidden></div>
            <div class="cy-chat-to" hidden></div>
            <p class="cy-chat-e" role="status"></p>
            <form class="cy-chat-f" autocomplete="off"><input type="text" maxlength="200" enterkeyhint="send" placeholder="${esc(K.ph || 'Написать в чат…')}" aria-label="Сообщение в чат"><button type="submit" aria-label="Отправить">➤</button></form>
          </div>
        </section>`;
  function make(K) {
    let X = null;
    const St = () => { X = K.X(); return K.state(); };
    const CHAT_N = 80;
    const CHAT_ERR = { rate_limited: 'не так быстро', forbidden: 'нет прав', city_closed: 'Город закрыт', login_required: 'войди через Twitch' };
    const chatPref = () => { try { const v = localStorage.getItem(K.key); if (v === '1' || v === '0') return v === '1'; } catch {} return !window.LGSiteUi.is('(max-width: 720px), (max-height: 480px)'); };   // 26.10: и телефон боком - свёрнут, пока зритель сам не откроет
    // 22.10: модерация — у модераторов (C.mod: 'own' владелец / 'mod') «⋯» у чужих сообщений и «⚙» в заголовке (окно модерации; 26.10: было «🛡» - стример принял за «свернуть»)
    const MUTES = [[5, '5 мин'], [30, '30 мин'], [60, '1 ч'], [1440, '1 день'], [10080, '7 дней']];
    const ROLE_ICO = { own: ['👑', 'админ чата'], mod: ['🛡', 'модератор чата'] };
    // 24.10: вкладки — «Общий» (g), «Торговля» (tr: ct у героя — chatTradePublic или тестер). Сообщение «Торговли» — с k: 'tr';
    // транспорт тот же (SSE «city» / state?c=), лента — одна с общим номером, страница раскладывает по вкладкам сама
    // «Личные» (dm: cd у героя — chatDmPublic или тестер): k: 'dm', to — кому; сервер отдаёт их только автору и адресату.
    // меню ника в ленте → «Написать» - открыть переписку с ним (C.peer; 30.10: кнопки «✉» у ника больше нет); игнор (C.ign) — его не видно нигде, писать мне лично он не может
    // «Достижения» (ev): «Летопись» — события игры (ev: 1), только чтение; вкладка — вместе с «Торговлей» (ct), без вкладок — в «Общем»
    const tabOf = (m) => m.tb || (m.rm === 'mine' ? 'mn' : m.ev ? (St().chat && St().chat.tr ? 'ev' : 'g') : m.k === 'tr' ? 'tr' : m.k === 'dm' ? 'dm' : 'g');
    const TAB_EMPTY = { g: 'Здесь пока тихо - напиши первым.', tr: 'Здесь объявления: куплю, продам, меняю. Ссылки нельзя.', dm: 'Личных пока нет. Нажми на ник правой кнопкой (на телефоне - подержи) → «Написать».', ev: 'Здесь - громкие события игры: заточки +7 и выше, полученные достижения.' };
    const TAB_PH = { g: K.ph || 'Написать в чат…', tr: 'Куплю / продам / меняю…', dm: 'Лично…' };
    const leftT = (ms) => { const m = Math.max(1, Math.ceil(ms / 60000)); return m < 60 ? `${m} мин` : m < 1440 ? `${Math.ceil(m / 60)} ч` : `${Math.ceil(m / 1440)} дн`; };
    // 29.10 (единый чат, K.one): две ленты в одном окне - «Город» (g, tr, ev) и «Шахта» (mn: сообщения с rm: 'mine', id с «m:»);
    // куда писать и чем модерировать - по вкладке / ленте сообщения (K.sayTo, K.baseFor); мут - свой у каждой ленты (C.mutes)
    const tabRoom = (t) => (t === 'mn' ? 'mine' : 'city');
    const baseOf = (rm) => (K.baseFor ? K.baseFor(rm || 'city') : K.base);
    const setMuted = (rm, v) => { const C = St().chat; if (K.one) { C.mutes[rm || 'city'] = v; if (tabRoom(C.tab) === (rm || 'city')) C.muted = v; } else C.muted = v; };
    /* 30.10 (просьба стримера): на ПК окно чата тянут за края - верхний край: высота, правый: ширина, правый верхний угол: оба
       (вместо разворачивания полосой во всю ширину). Пределы: ширина 280…min(720, 60% окна), высота 160…(окно - шапка - 24).
       Размер помнится у зрителя (localStorage K.sz.key - свой у «Города» и у шахты); окно браузера меньше - чат ужимается в видимую
       область, сохранённый размер не меняется. Двойной клик по заголовку - размер по умолчанию. Телефон (≤ 720 px или касание без мыши) -
       как было (размер из CSS). Хозяин (St().el): data-chat="free" - место чата ставит он сам (шахта: чат перетаскивают), тогда высота
       не ограничивается местом над чатом; data-chat-top - высота своей шапки сверху. После смены размера - событие «cy-chat-size» на
       окне (detail.end - отпустили). Только события указателя, в покое ничего не работает. */
    const rzPc = () => !window.LGSiteUi.is('phone') && !(window.LGSiteUi.is('nohover') && window.LGSiteUi.is('touch'));
    const szKey = () => (K.sz ? (typeof K.sz.key === 'function' ? K.sz.key() : K.sz.key) : '');
    const szMem = {};
    function szGet() {
      const k = szKey(); if (!k) return null;
      if (!(k in szMem)) {
        let v = null;
        try { const o = JSON.parse(localStorage.getItem(k) || 'null'); if (o && (+o.w > 0 || +o.h > 0)) v = { w: +o.w > 0 ? +o.w : 0, h: +o.h > 0 ? +o.h : 0 }; } catch (e) {
          // хранилище закрыто или там чужое - размер по умолчанию
          v = null;
        }
        szMem[k] = v;
      }
      return szMem[k];
    }
    function szPut(v, keep) {
      const k = szKey(); if (!k) return; szMem[k] = v; if (keep) return;
      try { if (v) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch (e) {
        // приватный режим - размер живёт до перезагрузки
        szMem[k] = v;
      }
    }
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
    // пределы для окна box (размер ленты - у .cy-chat-b): от места окна на экране и от хозяина
    function szLim(box) {
      const host = St().el, b = box.querySelector('.cy-chat-b'), br = b.getBoundingClientRect();
      const ar = K.sz && K.sz.area && !K.sz.area() ? { left: 0, top: 0, right: innerWidth, bottom: innerHeight } : host.getBoundingClientRect();
      const free = host.dataset.chat === 'free', top = Math.max(0, ar.top) + (+host.dataset.chatTop || 0);
      const w1 = Math.min(720, innerWidth * 0.6, free ? Math.min(ar.right, innerWidth) - Math.max(0, ar.left) - 16 : Math.min(ar.right, innerWidth) - br.left - 8);
      const h1 = Math.min(innerHeight - top - 24, free ? Infinity : br.bottom - top - 8);
      return { w0: 280, w1: Math.max(280, Math.floor(w1)), h0: 160, h1: Math.max(160, Math.floor(h1)) };
    }
    // применить сохранённый размер (или снять его: телефон, свёрнут, размера нет)
    function szFit(box) {
      box = box || (St() && St().el.querySelector('.cy-chat')); if (!box || !K.sz) return;
      const b = box.querySelector('.cy-chat-b'); if (!b) return;
      const on = rzPc() && box.classList.contains('open') && !b.hidden;
      box.classList.toggle('cy-rz', on);
      const v = on ? szGet() : null;
      if (!v) { if (box.style.width) box.style.width = ''; if (b.style.height) b.style.height = ''; return; }
      const L = szLim(box), w = v.w ? Math.round(clampN(v.w, L.w0, L.w1)) + 'px' : '', h = v.h ? Math.round(clampN(v.h, L.h0, L.h1)) + 'px' : '';
      if (box.style.width !== w) box.style.width = w;
      if (b.style.height !== h) b.style.height = h;
    }
    const szSaid = (box, end) => { try { box.dispatchEvent(new CustomEvent('cy-chat-size', { bubbles: true, detail: { end: !!end } })); } catch (e) { console.error('[чат] размер', e); } };
    function szBind(box) {
      const b = box.querySelector('.cy-chat-b'), hd = box.querySelector('.cy-chat-h'); if (!b || !K.sz) return;
      for (const [d, t] of [['n', 'Потянуть - высота чата'], ['e', 'Потянуть - ширина чата'], ['ne', 'Потянуть - размер чата']]) {
        const g = document.createElement('i'); g.className = 'cy-chat-rz'; g.dataset.rz = d; g.title = t; g.setAttribute('aria-hidden', 'true'); b.appendChild(g);
      }
      let rz = null;
      b.addEventListener('pointerdown', (e) => {
        const g = e.target.closest && e.target.closest('.cy-chat-rz');
        if (!g || e.button !== 0 || !box.classList.contains('cy-rz')) return;
        e.preventDefault(); e.stopPropagation();
        rz = { id: e.pointerId, d: g.dataset.rz, x: e.clientX, y: e.clientY, w: box.getBoundingClientRect().width, h: b.getBoundingClientRect().height, g, L: szLim(box) };
        try { g.setPointerCapture(e.pointerId); } catch (x) {
          // без захвата тоже тянется, пока указатель над краем
          rz.nc = 1;
        }
        g.classList.add('on'); box.classList.add('cy-rzing');
      });
      b.addEventListener('pointermove', (e) => {
        if (!rz || e.pointerId !== rz.id) return;
        const v = { ...(szGet() || { w: 0, h: 0 }) };
        if (rz.d !== 'n') v.w = Math.round(clampN(rz.w + e.clientX - rz.x, rz.L.w0, rz.L.w1));
        if (rz.d !== 'e') v.h = Math.round(clampN(rz.h - (e.clientY - rz.y), rz.L.h0, rz.L.h1));
        szPut(v, true);
        if (v.w) box.style.width = v.w + 'px';
        if (v.h) b.style.height = v.h + 'px';
        szSaid(box, false);
      });
      const up = (e) => {
        if (!rz || e.pointerId !== rz.id) return;
        const g = rz.g; rz = null; g.classList.remove('on'); box.classList.remove('cy-rzing');
        try { if (g.hasPointerCapture && g.hasPointerCapture(e.pointerId)) g.releasePointerCapture(e.pointerId); } catch (x) { console.error('[чат] размер', x); }
        const v = szGet(); if (v) szPut(v);
        szSaid(box, true);
      };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      // двойной клик по заголовку (не по кнопкам) - размер по умолчанию; место по умолчанию - у хозяина (шахта)
      if (hd) hd.addEventListener('dblclick', (e) => { if ((e.target.closest && e.target.closest('button, input, a, select, textarea')) || !rzPc()) return; szPut(null); szFit(box); szSaid(box, true); });
      if (!szBind.win) { szBind.win = 1; window.addEventListener('resize', () => { if (St() && St().chat && St().chat.open) szFit(); }); }
    }
    function chatInit() {
      if (!St()) return;
      const h = X.hero(), box = St().el.querySelector('.cy-chat'); if (!box) return;
      const F = K.flags(h) || {}, on = !!F.on;
      if (!St().chat) St().chat = { on, list: [], c: 0, mod: null, muted: null, open: chatPref(), unread: 0, panel: false, info: null, tab: K.lastTab || 'g',   // 29.10: выбранная вкладка чата - переживает пересоздание сцены
        un: { g: 0, tr: 0, dm: 0, ev: 0, mn: 0 }, peer: null, ign: new Set(), mutes: { city: null, mine: null } };
      St().chat.on = on; box.hidden = !on;
      St().chat.tr = !!F.tr;
      St().chat.dm = !!F.dm;
      St().chat.ev = St().chat.tr;   // 24.10: «Достижения» — под тем же флагом, что «Торговля»
      // 29.10: единый чат - лента шахты; лента «Города» может быть закрыта
      St().chat.mn = !!F.mn; St().chat.g = F.g !== false;
      St().chat.lg = !!K.log;
      if (((St().chat.tab === 'tr' || St().chat.tab === 'ev') && !St().chat.tr) || (St().chat.tab === 'dm' && !St().chat.dm) || (St().chat.tab === 'mn' && !St().chat.mn) || (St().chat.tab === 'lg' && !St().chat.lg)) St().chat.tab = 'g';
      if (St().chat.tab === 'g' && !St().chat.g && St().chat.mn) St().chat.tab = 'mn';
      if (!on || box.dataset.bound) { if (on) chatRender(); return; }
      box.dataset.bound = '1';
      szBind(box);
      // 29.10: личка страницы (window.LGDm, packages/site-ui/dm.js) - живёт вне сцены: здесь только её место во вкладке «Личные»
      if (window.LGDm) {
        window.LGDm.dock(K.key, box, box.querySelector('.cy-chat-dmx'));
        window.LGDm.on(K.key, (why) => { if (!St() || !St().chat || !St().el.contains(box)) return; if (why === 'show' && St().chat.dm) { if (!St().chat.open) chatOpen(true); chatTab('dm'); } else chatBadges(box, St().chat); });
      }
      const f = box.querySelector('.cy-chat-f'), inp = f.querySelector('input'), l = box.querySelector('.cy-chat-l'), pn = box.querySelector('.cy-chat-p');
      box.querySelector('.cy-chat-t').onclick = () => chatOpen(!St().chat.open);
      box.querySelector('.cy-chat-x').onclick = () => { chatOpen(false); try { box.querySelector('.cy-chat-t').focus({ preventScroll: true }); } catch {} };
      box.querySelector('.cy-chat-sh').onclick = () => chatPanel(!St().chat.panel);
      box.querySelector('.cy-chat-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) chatTab(b.dataset.tab); });
      box.querySelector('.cy-chat-to').addEventListener('click', (e) => {   // 24.10: кому пишу лично: выбрать переписку, игнор, «все»
        const p = e.target.closest('[data-peer]'), ig = e.target.closest('[data-ign]');
        if (p) { St().chat.peer = p.dataset.peer || null; St().chat.ren = null; chatRender(true); }
        if (ig) chatIgnore(ig.dataset.ign, ig.dataset.on === '1');
      });
      f.onsubmit = (e) => { e.preventDefault(); chatSend(inp); };
      // 24.10: ответ - нажал на ник в чате, в поле подставляется «@ник » (свой ник - нет)
      l.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('b[data-nick]'); if (!b || inp.disabled) return;
        const nk = b.dataset.nick; if (!nk || nk === X.login()) return;
        if (St().chat.tab === 'dm') { chatPeer(nk); return; }   // 24.10: в «Личных» ник — открыть переписку с ним
        chatReply(nk);
      });
      // 24.10: меню ника — правая кнопка (клавиша меню / Shift+F10 на нике в фокусе), на телефоне — долгое нажатие:
      // «Ответить», «Написать в личку» (если «Личные» открыты), «Предложить обмен» (если обмен открыт; не себе)
      l.addEventListener('contextmenu', (e) => {
        // 24.10: ПКМ по значку класса/роли или по самой строке - то же меню ника (не меню браузера)
        const li = e.target.closest && e.target.closest('li'); if (li && l.contains(li)) e.preventDefault();
        const b = e.target.closest && (e.target.closest('b[data-nick]') || (li && li.querySelector('b[data-nick]'))); if (!b) return;
        e.preventDefault(); if (St().chatLpT === -1) return;   // уже открыто долгим нажатием
        const r = b.getBoundingClientRect(); nickMenu(b.dataset.nick, b.textContent, e.clientX || r.left, e.clientY || r.bottom, b);
      });
      l.addEventListener('keydown', (e) => {
        const b = e.target.closest && e.target.closest('b[data-nick]'); if (!b) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
      });
      l.addEventListener('pointerdown', (e) => {
        if (St().chatLpT === -1) St().chatLpT = 0;   // прошлое долгое нажатие закончилось без «клика»
        if (e.pointerType !== 'touch') return;
        const b = e.target.closest && e.target.closest('b[data-nick]'); if (!b) return;
        clearTimeout(St().chatLpT); St().chatLpT = setTimeout(() => { St().chatLpT = -1; const r = b.getBoundingClientRect(); nickMenu(b.dataset.nick, b.textContent, r.left, r.bottom, b); }, 500);
      });
      const lpEnd = () => { if (St().chatLpT && St().chatLpT !== -1) clearTimeout(St().chatLpT); };
      l.addEventListener('pointerup', lpEnd); l.addEventListener('pointercancel', lpEnd); l.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch' && Math.abs(e.movementX) + Math.abs(e.movementY) > 6) lpEnd(); });
      l.addEventListener('click', (e) => { if (St().chatLpT === -1) { St().chatLpT = 0; e.stopImmediatePropagation(); e.preventDefault(); } }, true);   // долгое нажатие — не ещё и «ответ»
      // 24.10: Enter — отправить сразу из поля (не полагаясь на неявную отправку формы браузером: у стримера Enter не отправлял,
      // только ➤); набор через IME (isComposing / 229) Enter не отправляет — он подтверждает набранное
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { inp.blur(); chatOpen(false); return; }
        if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
          if (e.isComposing || e.keyCode === 229) return;
          e.preventDefault(); e.stopPropagation(); chatSend(inp);
        }
      });
      l.addEventListener('click', (e) => {
        // 30.10 (стример): кнопка ✉ у сообщений убрана - написать лично можно из меню ника (правая кнопка или долгое нажатие)
        const m = e.target.closest('[data-cmod]'), a = e.target.closest('[data-cact]');
        if (m) { const li = m.closest('li'), was = li.classList.contains('mm'); l.querySelectorAll('li.mm').forEach((x) => x.classList.remove('mm')); if (!was) li.classList.add('mm'); return; }
        if (a) chatAct(a.dataset.cact, { id: a.dataset.id, login: a.dataset.l, min: +a.dataset.min || undefined, n: a.dataset.n, rm: a.closest('li') && a.closest('li').dataset.rm });
      });
      pn.addEventListener('click', (e) => {
        const a = e.target.closest('[data-cact]'); if (a) chatAct(a.dataset.cact, { login: a.dataset.l, n: a.dataset.l });
        if (e.target.closest('[data-pback]')) chatPanel(false);
      });
      pn.addEventListener('keydown', (e) => {   // 24.10: Enter в поле ника окна модерации — «Ок» / «Добавить» (так же, как в чате)
        if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229 || !e.target.matches('.cy-chat-pf input')) return;
        e.preventDefault(); e.stopPropagation(); const fm = e.target.form; if (fm) { if (fm.requestSubmit) fm.requestSubmit(); else fm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
      });
      pn.addEventListener('submit', (e) => {
        e.preventDefault(); const fm = e.target, nick = (fm.querySelector('input').value || '').trim().replace(/^@/, '').toLowerCase(); if (!nick) return;
        if (fm.matches('[data-pmod]')) chatAct('mod', { login: nick, n: nick }, () => { fm.reset(); });
        else { const v = fm.querySelector('select').value; chatAct(v === 'ban' ? 'ban' : 'mute', { login: nick, n: nick, min: +v || undefined }, () => { fm.reset(); }); }
      });
      chatRender(true);
    }
    // 24.10: ответ — в поле «@ник » (свой ник — нет)
    function chatReply(nk) {
      const inp = St().el.querySelector('.cy-chat-f input'); if (!inp || inp.disabled || !nk || nk === X.login()) return;
      const rest = inp.value.replace(/^@[\w]+\s*/, '');
      inp.value = `@${nk} ${rest}`; inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch {}
    }
    // 24.10: меню ника в чате (одно на странице; закрывается по Esc, клику мимо, выбору; стрелки — по пунктам)
    function nickMenuClose(back) {
      const m = St() && St().nickM; if (!m) return; St().nickM = null; m.el.remove();
      document.removeEventListener('pointerdown', m.out, true); document.removeEventListener('keydown', m.key, true);
      if (back && m.from && m.from.isConnected) try { m.from.focus({ preventScroll: true }); } catch {}
    }
    function nickMenu(nk, name, cx, cy, from) {
      nickMenuClose(); if (!nk) return;
      const me = nk === X.login(), h = X.hero(), C = St().chat;
      const items = [];
      if (!me && C.tab !== 'ev') items.push(['reply', 'Ответить']);
      if (!me && C.dm) items.push(['dm', window.LGDm ? 'Написать' : 'Написать в личку']);
      if (!me && C.dm && window.LGDm) items.push(['dmrep', 'Пожаловаться']);   // 29.10: снимок переписки - модераторам
      if (!me && K.trade && h && h.tr && window.LGTrade) items.push(['trade', 'Предложить обмен']);
      if (!me && window.LGFriends) for (const it of window.LGFriends.menuItems(nk)) items.push(it);   // 29.10: друзья и блок (friends.js)
      if (!items.length) return;
      const el = document.createElement('div'); el.className = 'cy-nm'; el.setAttribute('role', 'menu'); el.setAttribute('aria-label', `Ник ${name || nk}`);
      el.innerHTML = `<div class="cy-nm-h">${esc(name || nk)}</div>` + items.map(([k, t]) => `<button type="button" role="menuitem" data-nm="${k}">${t}</button>`).join('');
      document.body.appendChild(el);
      const [x, y] = window.LGSiteUi.clampXY(el, cx, cy + 4);   // 25.10: не за край экрана - packages/site-ui
      el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
      const out = (e) => { if (!el.contains(e.target)) nickMenuClose(); };
      const key = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); nickMenuClose(true); return; }
        if (e.key === 'Tab') { nickMenuClose(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); const bs = [...el.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
          bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus();
        }
      };
      St().nickM = { el, out, key, from };
      // 28.10: только если это меню ещё открыто - иначе (ПКМ, Esc, ПКМ быстрее одного такта) «щелчок мимо» закрытого меню
      // оставался висеть и закрывал следующее меню на первом же нажатии по его пункту («Ответить» не срабатывал)
      setTimeout(() => { if (St() && St().nickM && St().nickM.el === el) document.addEventListener('pointerdown', out, true); }, 0);
      document.addEventListener('keydown', key, true);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-nm]'); if (!b) return;
        const k = b.dataset.nm; nickMenuClose();
        if (k === 'reply') { if (C.tab === 'dm') chatTab('g'); chatReply(nk); }
        else if (k === 'dm') chatPeer(nk);
        else if (k === 'dmrep') { const why = window.prompt(`Пожаловаться на ${name || nk}? Модераторы канала увидят последние 30 сообщений вашей переписки. Что случилось (можно пусто):`, ''); if (why !== null) window.LGDm.report(nk, why); }
        else if (k === 'trade') { window.LGTrade.mount(X, St().el); window.LGTrade.invite(nk); }
        else if (k.startsWith('fr-') && window.LGFriends) window.LGFriends.menuAct(k, nk);
      });
      try { el.querySelector('button').focus({ preventScroll: true }); } catch {}
    }
    function chatPeer(nk) { if (!St().chat.dm || !nk || nk === X.login()) return; if (window.LGDm) { window.LGDm.open(nk); chatTab('dm'); return; } St().chat.peer = nk; chatTab('dm'); }   // 29.10: вкладка собеседника - в LGDm
    async function chatIgnore(nk, on) {
      const r = await X.api(baseOf('city') + '/ignore', { login: nk, on }); if (!St() || !St().chat) return;
      if (!r || !r.ok) { chatErr((r && (CHAT_ERR[r.error] || r.error)) || 'не вышло'); return; }
      St().chat.ign = new Set(r.ign || []); chatErr(on ? `${nk}: в игноре - не видно и не пишет тебе лично` : `${nk}: игнор снят`, true); St().chat.ren = null; chatRender(true);
    }
    function chatTab(t) {
      const C = St().chat; if (((t === 'tr' || t === 'ev') && !C.tr) || (t === 'dm' && !C.dm) || (t === 'mn' && !C.mn) || (t === 'lg' && !C.lg)) t = 'g';
      if (K.one) C.muted = C.mutes[tabRoom(t)] || null;
      C.tab = t; K.lastTab = t; C.un[t] = 0; C.ren = null; chatRender(true);
      const i = St().el.querySelector(St().chat.tab === 'dm' && window.LGDm ? '.cy-chat-dmx .dm-f input' : '.cy-chat-f input'); if (i && !window.LGSiteUi.is('touch')) try { i.focus({ preventScroll: true }); } catch {}
    }
    function chatOpen(on) {
      St().chat.open = on; if (on) { St().chat.unread = 0; St().chat.un[St().chat.tab] = 0; }
      try { localStorage.setItem(K.key, on ? '1' : '0'); } catch {}
      chatRender(true);
      if (on && !St().chat.panel) { const i = St().el.querySelector(St().chat.tab === 'dm' && window.LGDm ? '.cy-chat-dmx .dm-f input' : '.cy-chat-f input'); if (i && !window.LGSiteUi.is('touch')) try { i.focus({ preventScroll: true }); } catch {} }
    }
    function chatEnter(r, rm) {
      if (!St().chat || !St().chat.on) return;
      St().chat.mod = r.mod === 'own' || r.mod === 'mod' ? r.mod : null; setMuted(rm, r.muted || null);
      if (!St().chat.mod) St().chat.panel = false;
      if (Array.isArray(r.chat)) {
        const nw = r.chat.filter((m) => !(m && m.k === 'dm' && window.LGDm));
        // 29.10: заменить только свою ленту
        if (K.one) { const keep = St().chat.list.filter((m) => (m.rm || 'city') !== (rm || 'city')); St().chat.list = [...keep, ...nw].sort((a, b) => (a.at || 0) - (b.at || 0)); chatTrim(); }
        else { St().chat.list = nw; chatTrim(); St().chat.unread = 0; St().chat.un = { g: 0, tr: 0, dm: 0, ev: 0, mn: 0 }; }
      }
      if (Array.isArray(r.ign)) St().chat.ign = new Set(r.ign);
      if (r.c != null) St().chat.c = +r.c || 0;
      chatRender(true);
    }
    function chatApply(d, rm) {
      if (!St().chat || !St().chat.on) return;
      let ch = false;
      for (const m of d.chat || []) {
        if (!m || !m.id || St().chat.list.some((x) => x.id === m.id)) continue;
        if (m.k === 'dm' && window.LGDm) continue;   // 29.10: личные - событием «dm» в LGDm (сервер на время выкладки шлёт их и сюда)
        St().chat.list.push(m); ch = true;
        const tb = tabOf(m);
        if (St().chat.ign.has(m.l)) continue;   // игнор — не считаем и облачко не показываем
        if (tb === 'ev') continue;   // 24.10: «Достижения» — без счётчиков и облачков (ненавязчиво)
        if (m.l !== X.login() && !St().chat.open) St().chat.unread++;
        if (m.l !== X.login() && !(St().chat.open && St().chat.tab === tb)) St().chat.un[tb] = (St().chat.un[tb] || 0) + 1;   // 24.10: счётчик на вкладке
        if (tb !== 'dm' && !m.ev) { if (K.bubble) K.bubble(m.l, String(m.t || ''), m.id); }   // личное — без облачка над героем
      }
      chatTrim();
      for (const id of d.chatDel || []) { const n = St().chat.list.length; St().chat.list = St().chat.list.filter((x) => x.id !== id); if (St().chat.list.length !== n) ch = true; if (K.unbubble) K.unbubble(id); }
      if (d.c != null) St().chat.c = Math.max(St().chat.c, +d.c || 0);
      // 22.10: мне дали мут / бан / сняли, назначили или сняли модератором (адресно, по SSE)
      if (d.chatMe) {
        if ('muted' in d.chatMe) { setMuted(rm, d.chatMe.muted || null); if (d.chatMe.muted) chatErr(St().chat.muted.until ? `Модератор запретил тебе писать на ${leftT(St().chat.muted.until - Date.now())}` : 'Модератор запретил тебе писать в чат'); }
        if ('mod' in d.chatMe && St().chat.mod !== 'own') { St().chat.mod = d.chatMe.mod || null; if (!St().chat.mod) St().chat.panel = false; }
        ch = true;
      }
      if (ch) { if (d.chatDel || d.chatMe) chatRender(); else chatAppendSoon(); }
    }
    // 22.10: новые сообщения — дописать в конец ленты (раньше вся лента — до 80 строк с кнопками модерации — собиралась заново
    // на каждое сообщение: при сотнях в Городе это несколько перестроек и раскладок в секунду); несколько подряд — одним разом
    // 24.10: в каждой вкладке — не больше CHAT_N последних
    function chatTrim() {
      const L = St().chat.list, n = {}; for (const m of L) { const t = tabOf(m); n[t] = (n[t] || 0) + 1; }
      if (!Object.keys(n).some((t) => n[t] > CHAT_N)) return;
      St().chat.list = L.filter((m) => { const t = tabOf(m); if (n[t] > CHAT_N) { n[t]--; return false; } return true; });
    }
    const chatVis = () => { const C = St().chat; return C.list.filter((m) => tabOf(m) === C.tab && !C.ign.has(m.l) && (C.tab !== 'dm' || !C.peer || m.sys || m.l === C.peer || m.to === C.peer)); };
    // 24.10: строка «кому» в «Личных»: переписки (последние собеседники), выбранный — с «Игнор»; кто в игноре — «Снять игнор»
    function chatTo(box, C) {
      const el = box.querySelector('.cy-chat-to'), on = C.tab === 'dm' && !C.panel && !window.LGDm; el.hidden = !on; if (!on) return;
      const me = X.login(), peers = [];
      for (let i = C.list.length - 1; i >= 0 && peers.length < 8; i--) { const m = C.list[i]; if (m.k !== 'dm') continue; const p = m.l === me ? m.to : m.l; if (p && !peers.includes(p) && !C.ign.has(p)) peers.push(p); }
      if (C.peer && !peers.includes(C.peer)) peers.unshift(C.peer);
      const chip = (p) => `<button type="button" data-peer="${esc(p)}" aria-pressed="${String(C.peer === p)}" style="color:${nickColor(p)}">${esc(p)}</button>`;
      el.innerHTML = (peers.length ? `<button type="button" data-peer="" aria-pressed="${String(!C.peer)}">Все</button>${peers.map(chip).join('')}` : '')
        + (C.peer ? `<span class="cy-chat-tw">Кому: <b>${esc(C.peer)}</b></span><button type="button" class="bad" data-ign="${esc(C.peer)}" data-on="1">Игнор</button>` : peers.length ? '<span class="cy-chat-tw">Выбери, кому писать</span>' : '')
        + [...C.ign].slice(0, 5).map((p) => `<button type="button" data-ign="${esc(p)}" data-on="0" title="Снять игнор">🚫 ${esc(p)} ×</button>`).join('');
    }
    function chatAppendSoon() { if (!St().chatT) St().chatT = setTimeout(() => { if (St()) { St().chatT = 0; chatAppend(); } }, 250); }
    function chatAppend() {
      const box = St().el.querySelector('.cy-chat'), C = St().chat; if (!box || !C || !C.on) return;
      if (!C.open || C.panel || !C.ren) { chatRender(); return; }
      chatBadges(box, C);
      const V = chatVis(), l = box.querySelector('.cy-chat-l'), ids = V.map((m) => m.id), k = C.ren.indexOf(ids[0]);
      const keep = k < 0 ? -1 : C.ren.length - k;
      if (keep <= 0 || keep > ids.length || C.ren.slice(k).some((id, i) => id !== ids[i]) || l.children.length !== C.ren.length) { chatRender(); return; }
      const end = l.scrollHeight - l.scrollTop - l.clientHeight < 40;
      for (let i = 0; i < k; i++) l.firstElementChild.remove();
      l.insertAdjacentHTML('beforeend', V.slice(keep).map(chatLi).join(''));
      C.ren = ids;
      if (end) l.scrollTop = l.scrollHeight;
    }
    let HM = null;   // 22.10: один форматтер времени (toLocaleTimeString на каждое сообщение — новый Intl каждый раз)
    const hm = (t) => { try { HM = HM || new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }); return HM.format(new Date(t)); } catch { return ''; } };
    // кого можно модерировать: не себя; модератору — не владельца и не модераторов (сервер проверяет и сам)
    // 24.10: стример канала (его ник в адресе /c/<канал>/) - в чате с красной обводкой, модераторы - на подложке
    const tentMine = () => { const me = String((X && X.login && X.login()) || '').toLowerCase(); return !!me && me === chanLogin(); };   // 24.10: зритель - сам стример канала
    const chanLogin = () => { const m0 = /\/c\/([\w]+)/.exec(location.pathname); return m0 ? m0[1].toLowerCase() : ''; };
    // 24.10: значок класса героя перед ником (подпись - при наведении)
    const CLS_ICO = { legionary: '⚔️', archer: '🏹', mage: '🔮', priest: '✨', rogue: '🗡️', necromancer: '💀', paladin: '☀️', recruit: '🌱' };
    const clsIco = (m) => m.c ? `<i class="cy-cls" title="${esc(m.cn || m.c)}" aria-label="${esc(m.cn || m.c)}">${CLS_ICO[m.c] || '◆'}</i>` : '';
    // 24.10: у каждого ника в чате свой цвет (постоянный: по нику; светлые, читаются на тёмном фоне чата)
    const NICK_COLORS = ['#ffc94d', '#ff8a80', '#ffab6e', '#f4ff81', '#b9f6ca', '#69f0ae', '#84ffff', '#80d8ff', '#9fa8ff', '#b388ff', '#ea80fc', '#ff80ab', '#ffd180', '#a7ffeb', '#ccff90', '#ffcdd2'];
    const nickColor = (l) => { let h = 2166136261; const t = String(l || ''); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return NICK_COLORS[(h >>> 0) % NICK_COLORS.length]; };
    const canMod = (m) => m.k !== 'dm' && St().chat.mod && m.l !== X.login() && (St().chat.mod === 'own' || !m.r);
    // 24.10: вкладки (видны, только если открыта хоть одна, кроме «Общего»), счётчики непрочитанного на них и на кнопке «Чат»
    function chatBadges(box, C) {
      const du = C.dm && window.LGDm ? window.LGDm.unread() : 0, nu = C.unread + (C.open ? 0 : du);   // 29.10: непрочитанные личные - из LGDm
      const n = box.querySelector('.cy-chat-n'); n.hidden = !nu; n.textContent = nu > 99 ? '99+' : String(nu);
      const tabs = box.querySelector('.cy-chat-tabs'); tabs.hidden = !(C.tr || C.dm || C.mn || C.lg) || !!C.panel;
      for (const tb of tabs.querySelectorAll('[data-tab]')) {
        const t = tb.dataset.tab, u = t === 'dm' && window.LGDm ? du : C.un[t] || 0, bn = tb.querySelector('.cy-chat-tn');
        if (t !== 'g') tb.hidden = !C[t]; else if (K.one) tb.hidden = !C.g;
        tb.setAttribute('aria-selected', String(C.tab === t)); bn.hidden = !u || C.tab === t; bn.textContent = u > 99 ? '99+' : String(u);
      }
    }
    function chatRender(toEnd) {
      const box = St() && St().el.querySelector('.cy-chat'); if (!box || !St().chat || !St().chat.on) return;
      const C = St().chat, b = box.querySelector('.cy-chat-b'), n = box.querySelector('.cy-chat-n'), l = box.querySelector('.cy-chat-l'), inp = box.querySelector('.cy-chat-f input'), sh = box.querySelector('.cy-chat-sh');
      box.querySelector('.cy-chat-t').setAttribute('aria-expanded', String(C.open)); b.hidden = !C.open; box.classList.toggle('open', C.open);
      // 30.10: размер окна (ПК) - когда открыли / свернули; смена места - хозяин зовёт size()
      if (box.dataset.szo !== String(C.open)) { box.dataset.szo = String(C.open); szFit(box); }
      chatBadges(box, C); chatTo(box, C);
      if (K.one) C.muted = C.mutes[tabRoom(C.tab)] || null;
      // мут истёк
      if (C.muted && C.muted.until && C.muted.until <= Date.now()) { C.muted = null; if (K.one) C.mutes[tabRoom(C.tab)] = null; }
      clearTimeout(St().chatMuteT); if (C.muted && C.muted.until) St().chatMuteT = setTimeout(() => chatRender(), Math.min(C.muted.until - Date.now() + 500, 60000));
      inp.disabled = !!C.muted || (C.tab === 'dm' && !C.peer); inp.placeholder = C.muted ? (C.muted.until ? `Мут ещё ${leftT(C.muted.until - Date.now())}` : 'Модератор запретил тебе писать') : (C.tab === 'dm' ? (C.peer ? `Лично для ${C.peer}…` : 'Выбери собеседника: меню ника → «Написать»') : C.mod && C.tab === 'g' ? 'Написать… (/help — команды)' : TAB_PH[C.tab] || TAB_PH.g);
      sh.hidden = !C.mod; sh.setAttribute('aria-pressed', String(!!C.panel)); box.classList.toggle('pnl', !!C.panel);
      const dmx = box.querySelector('.cy-chat-dmx'), dmOn = C.tab === 'dm' && !!window.LGDm && !!dmx;   // 29.10: «Личные» рисует LGDm
      // 24.10: «Достижения» — только чтение
      box.querySelector('.cy-chat-p').hidden = !C.panel; l.hidden = !!C.panel || dmOn; box.querySelector('.cy-chat-f').hidden = !!C.panel || C.tab === 'ev' || C.tab === 'lg' || dmOn;
      if (dmx) { dmx.hidden = !dmOn || !!C.panel; if (window.LGDm) window.LGDm.place(); }
      if (!C.open || C.panel || dmOn) return;
      const end = toEnd || l.scrollHeight - l.scrollTop - l.clientHeight < 40;
      // 30.10: «Журнал» хозяина (шахта) - не сообщения чата: новыми снизу, перерисовка - только когда список поменялся
      if (C.tab === 'lg') {
        const L = (K.log() || []).slice().reverse(), h = L.length ? L.map((e) => `<li class="cy-chat-ev cy-chat-lg" title="${esc(hm(e.at))}">${esc(e.t)}</li>`).join('') : '<li class="cy-chat-0">Пока тихо.</li>';
        if (C.lgH !== h || !l.firstChild) { C.lgH = h; l.innerHTML = h; }
        C.ren = null; if (end) l.scrollTop = l.scrollHeight; return;
      }
      C.lgH = '';
      const V = chatVis();
      l.innerHTML = V.length ? V.map(chatLi).join('') : `<li class="cy-chat-0">${esc(TAB_EMPTY[C.tab] || TAB_EMPTY.g)}</li>`;
      C.ren = V.length ? V.map((m) => m.id) : null;
      if (end) l.scrollTop = l.scrollHeight;
    }
    function chatLi(m) {
      const C = St().chat;
      if (m.sys) return `<li class="cy-chat-sys">${esc(m.t)}</li>`;
      if (m.ev) return `<li class="cy-chat-ev" title="${esc(hm(m.at))}">📜 ${esc(m.t)}</li>`;   // 24.10: «Летопись» - громкое событие игры
      const nm = esc(m.n || m.l), ri = ROLE_ICO[m.r], role = ri ? `<i class="cy-chat-r" title="${ri[1]}" aria-label="${ri[1]}">${ri[0]}</i>` : '';
      const mod = canMod(m) ? `<button type="button" class="cy-chat-m" data-cmod aria-label="Модерация: ${nm}">⋯</button><span class="cy-chat-mm">`
        + `<button type="button" data-cact="del" data-id="${esc(m.id)}">Удалить</button>`
        + `<span class="cy-chat-mt">Мут:${MUTES.map(([k, t]) => `<button type="button" data-cact="mute" data-l="${esc(m.l)}" data-n="${nm}" data-min="${k}">${t}</button>`).join('')}</span>`
        + `<button type="button" class="bad" data-cact="ban" data-l="${esc(m.l)}" data-n="${nm}">Бан</button>`
        + (C.mod === 'own' ? (m.r === 'mod' ? `<button type="button" data-cact="unmod" data-l="${esc(m.l)}" data-n="${nm}">Снять модератора</button>` : m.r ? '' : `<button type="button" data-cact="mod" data-l="${esc(m.l)}" data-n="${nm}">Сделать модератором</button>`) : '')
        + '</span>' : '';
      const me0 = String(X.login() || '').toLowerCase(), pinged = me0 && m.l !== me0 && new RegExp('(^|\\s)@' + me0 + '(\\b|$)', 'i').test(String(m.t || ''));
      const cls = [m.l === X.login() ? 'me' : '', m.l === chanLogin() ? 'st' : m.r ? 'md' : '', pinged ? 'ping' : ''].filter(Boolean).join(' ');
      return `<li${cls ? ` class="${cls}"` : ''}${m.rm ? ` data-rm="${esc(m.rm)}"` : ''} title="${esc(hm(m.at))}">${role}${clsIco(m)}<b data-nick="${esc(m.l)}" tabindex="0" title="${m.k === 'dm' ? 'Переписка' : 'Ответить'} (правая кнопка или долгое нажатие - меню)" style="color:${nickColor(m.l)}">${nm}</b>${m.k === 'dm' && m.l === X.login() && m.to ? ` → <b data-nick="${esc(m.to)}" style="color:${nickColor(m.to)}">${esc(m.to)}</b>` : ''}${X.awb ? X.awb(m.aw) : ''} <span>${esc(m.t)}</span>${mod}</li>`;
    }
    // окно модерации: ограничить по нику, кто в муте и бане (снять), модераторы (только владелец: назначить, снять)
    async function chatPanel(on) {
      St().chat.panel = on && !!St().chat.mod; chatRender();
      if (!St().chat.panel) { chatRender(true); return; }
      const pn = St().el.querySelector('.cy-chat-p');
      pn.innerHTML = '<p class="cy-chat-pl">Загружаю…</p>';
      const r = await X.api(baseOf(tabRoom(St().chat.tab)) + '/mod');
      if (!St() || !St().chat || !St().chat.panel) return;
      if (!r || !r.ok) { pn.innerHTML = `<p class="cy-chat-pl">${esc((r && (CHAT_ERR[r.error] || r.error)) || 'не загрузилось')}</p><button type="button" class="cy-chat-pb" data-pback>← К чату</button>`; return; }
      St().chat.info = r; if (r.role === 'own' || r.role === 'mod') St().chat.mod = r.role;
      const bans = (r.bans || []).map((x) => `<li><b>${esc(x.l)}</b> <span>${x.until ? `мут до ${esc(hm(x.until))}${x.until - Date.now() > 864e5 ? ` (${leftT(x.until - Date.now())})` : ''}` : 'бан'}${x.by ? ` · ${esc(x.by)}` : ''}</span><button type="button" data-cact="unban" data-l="${esc(x.l)}">Снять</button></li>`).join('');
      const mods = r.role === 'own' ? `<h4>Модераторы чата</h4><ul class="cy-chat-pu">${(r.mods || []).map((x) => `<li><b>${esc(x)}</b><button type="button" data-cact="unmod" data-l="${esc(x)}" aria-label="Снять модератора ${esc(x)}">×</button></li>`).join('') || '<li class="cy-chat-pl">Пока никого. Модераторы канала на платформе модерируют чат и без этого списка.</li>'}</ul>
        <form class="cy-chat-pf" data-pmod><input type="text" maxlength="26" placeholder="ник модератора" aria-label="Ник нового модератора" autocomplete="off"><button type="submit">Добавить</button></form>` : '';
      pn.innerHTML = `<form class="cy-chat-pf" data-pban><input type="text" maxlength="26" placeholder="ник" aria-label="Ник, кого ограничить" autocomplete="off"><select aria-label="Срок">${MUTES.map(([k, t]) => `<option value="${k}">мут ${t}</option>`).join('')}<option value="ban">бан</option></select><button type="submit">Ок</button></form>
        <h4>Мут и бан</h4><ul class="cy-chat-pu">${bans || '<li class="cy-chat-pl">Никто не ограничен.</li>'}</ul>${mods}
        <button type="button" class="cy-chat-pb" data-pback>← К чату</button>`;
    }
    function chatErr(t, ok) {
      const e = St() && St().el.querySelector('.cy-chat-e'); if (!e) return;
      e.textContent = CHAT_ERR[t] || t; e.classList.toggle('ok', !!ok); clearTimeout(St().chatErrT); St().chatErrT = setTimeout(() => { e.textContent = ''; }, 4000);
    }
    // 22.10: команды модераторов в поле ввода (в ленту не уходят): /mod ник, /unmod ник, /mods — админ чата;
    // /mute ник [минут, по умолчанию 30], /ban ник, /unban ник, /help — админ и модераторы
    const CHAT_HELP = '/mute ник [минут] · /ban ник · /unban ник' ;
    async function chatCmd(t) {
      const [cmd0, nick0, arg] = t.slice(1).trim().split(/\s+/), cmd = String(cmd0 || '').toLowerCase(), nick = String(nick0 || '').replace(/^@/, '').toLowerCase();
      const C = St().chat;
      if (!C.mod) { chatErr('команды — только модераторам чата'); return false; }
      const own = C.mod === 'own', needNick = () => { if (!/^[a-z0-9_]{1,25}$/.test(nick)) { chatErr(`укажи ник: /${cmd} ник`); return false; } return true; };
      if (cmd === 'help' || cmd === 'помощь') { chatSys(own ? `Команды: /mod ник · /unmod ник · /mods · ${CHAT_HELP}` : `Команды: ${CHAT_HELP}`); return true; }
      if (cmd === 'mods') {
        if (!own) { chatErr('список модераторов — у админа чата'); return false; }
        const r = await X.api(baseOf('city') + '/mod'); if (!St() || !St().chat) return false;
        if (!r || !r.ok) { chatErr((r && (CHAT_ERR[r.error] || r.error)) || 'не вышло'); return false; }
        chatSys((r.mods || []).length ? `Модераторы чата (${r.mods.length}): ${r.mods.join(', ')}` : 'Модераторов чата пока нет. Назначить: /mod ник');
        return true;
      }
      if (cmd === 'mod' || cmd === 'unmod') { if (!own) { chatErr('назначать модераторов может только админ чата'); return false; } if (!needNick()) return false; return chatAct(cmd, { login: nick, n: nick }); }
      if (cmd === 'mute') { if (!needNick()) return false; const m = arg == null ? 30 : Math.round(+arg); if (!(m >= 1 && m <= 10080)) { chatErr('срок мута — от 1 до 10080 минут (7 дней)'); return false; } return chatAct('mute', { login: nick, n: nick, min: m }); }
      if (cmd === 'ban' || cmd === 'unban') { if (!needNick()) return false; return chatAct(cmd, { login: nick, n: nick, sure: cmd === 'ban' }); }
      chatErr(`нет такой команды: /${cmd}. Список — /help`); return false;
    }
    // строка только для себя (ответ на команду): в ленте, не отправляется
    function chatSys(t) { St().chat.list.push({ id: 'sys' + Date.now() + Math.random().toString(36).slice(2, 6), sys: true, t, at: Date.now(), tb: St().chat.tab }); chatTrim(); chatRender(true); }
    async function chatSend(inp) {
      const t = inp.value.trim(); if (!t || !St().chat || St().chat.sending) return;
      if (t.startsWith('/') && St().chat.tab === 'g') { St().chat.sending = true; const ok = await chatCmd(t); if (!St() || !St().chat) return; St().chat.sending = false; if (ok) inp.value = ''; return; }
      if (K.here && !K.here()) { chatErr(K.joining || 'подключаемся…'); if (K.rejoin) K.rejoin(); return; }
      // 26.10: до «отправляется» - иначе флаг залипал и дальше все отправки молча пропадали
      if (St().chat.tab === 'dm' && !St().chat.peer) { chatErr('кому? меню ника в ленте → «Написать»'); return; }
      St().chat.sending = true;
      // 29.10: единый чат - куда писать, по вкладке
      const tab0 = St().chat.tab, dest = K.sayTo ? K.sayTo(tab0) : null;
      let r = await X.api(dest ? dest.url : K.say, { text: t, ...(dest ? dest.body : tab0 === 'tr' ? { k: 'tr' } : tab0 === 'dm' ? { to: St().chat.peer } : {}) });
      if (r && r.ok && r.msg && K.tag) r = { ...r, msg: K.tag(r.msg, tabRoom(tab0)) };
      if (!St() || !St().chat) return;
      St().chat.sending = false;
      if (r && r.ok && r.msg) { inp.value = ''; chatApply({ chat: [r.msg] }); chatRender(true); return; }
      const er = (r && r.error) || 'не отправилось — нет связи';
      if (/запретил/.test(er)) { setMuted(tabRoom(St().chat.tab), St().chat.muted || { until: 0 }); chatRender(); }
      if (K.onError) K.onError(er);
      chatErr(er);
    }
    // действие модератора: del | mute | ban | unban | mod | unmod
    async function chatAct(op, o, done) {
      if (op === 'ban' && !o.sure && !confirm(`Забанить «${o.n || o.login}» ${K.where || 'в чате'}? Все его сообщения пропадут у всех.`)) return false;
      const rm = o.rm || (K.one ? tabRoom(St().chat.tab) : 'city');
      const r = await X.api(baseOf(rm) + '/mod', { op, id: o.id && rm === 'mine' ? String(o.id).replace(/^m:/, '') : o.id, login: o.login, min: o.min });
      if (!St() || !St().chat) return;
      if (!r || !r.ok) { chatErr((r && (CHAT_ERR[r.error] || r.error)) || 'не вышло'); return false; }
      const pre = (id) => (K.one && rm === 'mine' ? 'm:' + id : id);
      if (op === 'del') chatApply({ chatDel: [pre(r.id)] });
      if (r.gone && r.gone.length) chatApply({ chatDel: r.gone.map(pre) });
      const who = o.n || o.login || '';
      chatErr({ del: 'Сообщение удалено', mute: `${who}: мут ${(MUTES.find((x) => x[0] === o.min) || [0, leftT(o.min * 60000)])[1]}`, ban: `${who}: бан в чате`, unban: `${who}: снова может писать`, mod: `${who} — модератор чата`, unmod: `${who} больше не модератор` }[op] || 'Готово', true);
      if (op === 'mod' || op === 'unmod') for (const m of St().chat.list) if (m.l === r.login) m.r = op === 'mod' ? 'mod' : undefined;
      if (done) done();
      if (St().chat.panel) chatPanel(true); else chatRender();
      return true;
    }
    // 29.10: tab, unAdd - для единого чата (chatone.js)
    return { init: () => { St(); chatInit(); }, enter: (r, rm) => { St(); chatEnter(r, rm); }, apply: (d, rm) => { St(); chatApply(d, rm); },
      tab: (t) => { St(); if (St() && St().chat) chatTab(t); }, unAdd: (t, n) => { St(); const C = St() && St().chat; if (!C || !n) return; C.un[t] = (C.un[t] || 0) + n; C.unread += n; const box = St().el.querySelector('.cy-chat'); if (box) chatBadges(box, C); },
      render: (e) => { St(); chatRender(e); }, open: (on) => { St(); chatOpen(on); }, menuClose: () => { St(); nickMenuClose(); },
      // 30.10: размер окна чата на ПК - заново по месту (хозяин переставил окно, сменился data-chat)
      size: () => { if (St()) szFit(); } };
  }
  window.LGChat = { make, html };
})();
