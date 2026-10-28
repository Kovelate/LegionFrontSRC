/* 26.10 (ТЗ «старт игры для стримера и зрителя», docs/reports/streamer-start.md): шапка сайта канала.
   - Переключатель «Зритель / Стример» (новинка «roles»): «Стример» - режим стримера СВОЕГО канала (канал = логин Twitch).
     Права проверяет сервер (/api/streamer, пульты ?embed=1); здесь - только вид и переходы. Режим помнится в браузере.
   - Поиск стримера и свой список каналов (новинка «find»): вместо общего списка «Стримеры» под кнопкой выбора канала.
     Подсказки - после паузы в наборе (debounce), сервер ограничивает частоту; без запроса никого не показываем.
   Файл грузится, только когда сервер открыл этому входу хоть одну из новинок (app.js → startSync). */
(function () {
  'use strict';
  let H = null;   // крючки app.js: me(), tab(id), smOk(), api(), toast(), esc(), ch, curTab()
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch {} } };
  const chUrl = (l) => `/c/${encodeURIComponent(l)}/`;
  const me = () => (H && H.me()) || null;
  const curLogin = () => (H && H.ch ? String(H.ch.login).toLowerCase() : '');
  const ownLogin = () => { const m = me(); return m && m.own ? String(m.own.login).toLowerCase() : ''; };

  /* ---------- переключатель «Зритель / Стример» ---------- */
  let swEl = null, lastViewerTab = 'hero';
  function swRender() {
    const m = me();
    if (!swEl) swEl = $('#roleSw');
    if (!swEl) return;
    const on = !!(m && m.user && m.roleSw);
    swEl.hidden = !on;
    // вкладка «Режим стримера» в ленте не нужна - её место занял переключатель
    const tb = $('.tabs button[data-tab="streamer"]'); if (tb && on) tb.hidden = true;
    document.documentElement.classList.toggle('has-roles', on);
    if (!on) { swEl.innerHTML = ''; return; }
    const sm = H.curTab() === 'streamer';
    swEl.innerHTML = `<button type="button" data-role="viewer" aria-pressed="${!sm}" title="Вкладки игрока: герой, поход, город">Зритель</button>`
      + `<button type="button" data-role="streamer" aria-pressed="${sm}" title="${ownLogin() ? 'Режим стримера своего канала: пульт игры' : 'Режим стримера - для своего канала'}">Стример</button>`;
  }
  function swNote(text) {
    let n = $('#roleNote');
    if (!n) { n = document.createElement('div'); n.id = 'roleNote'; n.className = 'role-note'; n.setAttribute('role', 'status'); document.body.appendChild(n); }
    const r = swEl.getBoundingClientRect();
    n.textContent = text; n.hidden = false;
    n.style.top = Math.round(r.bottom + 8) + 'px';
    n.style.left = Math.max(12, Math.min(window.innerWidth - 12 - Math.min(320, window.innerWidth - 24), r.right - Math.min(320, window.innerWidth - 24))) + 'px';
    clearTimeout(swNote.t); swNote.t = setTimeout(() => { n.hidden = true; }, 6000);
  }
  function toStreamer() {
    const own = ownLogin();
    if (!own) {
      const m = me();
      // 27.10: своего канала нет, сервер разрешил создать (ownNew: спящие каналы включены) - создаём и идём в режим стримера (там мастер).
      // Права и лимиты - на сервере (POST /api/ownchannel); выключено - как раньше, только надпись
      if (!(m && m.ownNew)) { swNote('Твой канал ещё не подключён к игре. Как только он появится, здесь откроется режим стримера.'); return; }
      // 27.10 (решение стримера): создание канала - только после подтверждения в окне (Esc / × / «Отмена» - ничего не создаём)
      if (!toStreamer.busy) ownConfirm(m.user && (m.user.name || m.user.login) || '');
      return;
    }
    ls.set('lgRole', 'streamer');
    if (own !== curLogin()) { location.href = chUrl(own) + '#streamer'; return; }
    if (!H.smOk()) { swNote('Режим стримера сейчас недоступен - обнови страницу через минуту.'); return; }
    H.tab('streamer');   // мастер при первом переходе - tabChanged
  }
  // окно «Создать свой канал?»: фокус - на «Создать», Tab не уходит из окна, Esc / × / «Отмена» / клик мимо - закрыть
  function ownConfirm(nick) {
    if (document.getElementById('ownNewDlg')) return;
    const M = modal('wz-own', 'Создать свой канал');
    M.back.id = 'ownNewDlg';
    M.box.innerHTML = `<div class="wz-h"><h2>Создать свой канал ${esc(nick)}?</h2><button type="button" class="wz-x" data-x aria-label="Отмена">×</button></div>
      <p class="wz-t">Ты станешь стримером в игре «Легион»: у твоего канала появятся свой сайт, пульт игры и оверлей для OBS. Зрители будут играть у тебя на стриме.</p>
      <p class="wz-t wz-note" data-err hidden></p>
      <div class="wz-f"><button type="button" class="btn ghost" data-x>Отмена</button><button type="button" class="btn primary" data-ok>Создать</button></div>`;
    const ok = M.box.querySelector('[data-ok]'), err = M.box.querySelector('[data-err]');
    const done = () => { if (!toStreamer.busy) M.close(); };
    M.box.addEventListener('wz-esc', done);
    M.back.addEventListener('click', (e) => { if (e.target === M.back) done(); });
    M.box.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...M.box.querySelectorAll('button:not([disabled])')]; if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    M.box.addEventListener('click', (e) => {
      const q = (k) => { const x = e.target.closest(k); return x && M.box.contains(x) ? x : null; };
      if (q('[data-x]')) { done(); return; }
      if (!q('[data-ok]') || toStreamer.busy) return;
      toStreamer.busy = true; ok.disabled = true; ok.textContent = 'Создаём…'; err.hidden = true;
      H.api('/api/ownchannel', {}).then((r) => {
        toStreamer.busy = false;
        if (r && r.ok && r.login) { ls.set('lgRole', 'streamer'); location.href = chUrl(String(r.login).toLowerCase()) + '#streamer'; return; }
        ok.disabled = false; ok.textContent = 'Создать';
        err.textContent = r && r.error === 'rate_limited' ? 'Слишком часто - попробуй через несколько минут.' : 'Не получилось создать канал - попробуй ещё раз позже.';
        err.hidden = false;
      });
    });
    setTimeout(() => { try { ok.focus(); } catch {} }, 0);
  }
  function toViewer() {
    ls.set('lgRole', 'viewer');
    if (H.curTab() === 'streamer') H.tab(lastViewerTab && lastViewerTab !== 'streamer' ? lastViewerTab : 'hero');
    swRender();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('#roleSw [data-role]'); if (!b) return;
    if (b.dataset.role === 'streamer') toStreamer(); else toViewer();
  });

  /* ---------- поиск стримера и свой список ---------- */
  const F = { el: null, from: null, q: '', res: null, busy: false, err: '', list: null, listErr: '', t: 0, ctl: null, cache: new Map() };
  function findOpen(btn) {
    findClose(false);
    const el = document.createElement('div');
    el.className = 'pop sf-pop'; el.id = 'sfPop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Стримеры');
    el.innerHTML = `<label class="sf-q"><span class="sr-only">Найти стримера по нику</span>
        <input type="search" id="sfQ" placeholder="Найти стримера по нику" autocomplete="off" spellcheck="false" maxlength="25" enterkeyhint="search"></label>
      <div class="sf-res" id="sfRes" aria-live="polite"></div><div class="sf-my" id="sfMy"></div>`;
    document.body.appendChild(el);
    Object.assign(F, { el, from: btn });
    btn.setAttribute('aria-expanded', 'true');
    const inp = $('#sfQ', el);
    inp.value = F.q;
    inp.addEventListener('input', () => findInput(inp.value));
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const a = $('#sfRes a', el); if (a) { e.preventDefault(); a.click(); } }
      if (e.key === 'ArrowDown') { const a = $('#sfRes a, #sfMy a', el); if (a) { e.preventDefault(); a.focus(); } }
    });
    el.addEventListener('click', findClick);
    findRender(); findPlace();
    listLoad();
    setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch {} }, 0);
  }
  function findClose(back) {
    if (!F.el) return;
    F.el.remove(); F.el = null;
    clearTimeout(F.t); if (F.ctl) { try { F.ctl.abort(); } catch {} F.ctl = null; }
    if (F.from) { F.from.setAttribute('aria-expanded', 'false'); if (back) try { F.from.focus(); } catch {} }
  }
  function findPlace() {
    const el = F.el, b = F.from; if (!el || !b) return;
    const r = b.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24);
    el.style.width = w + 'px';
    el.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left)) + 'px';
    el.style.top = Math.round(r.bottom + 8) + 'px';
    el.style.maxHeight = Math.max(220, window.innerHeight - r.bottom - 24) + 'px';
  }
  // набор: пауза 300 мс, предыдущий запрос - отменяем; одинаковый запрос - из памяти
  function findInput(v) {
    const q = String(v || '').trim().toLowerCase().replace(/^@/, '');
    F.q = v; clearTimeout(F.t);
    if (q.length < 2) { F.res = null; F.err = ''; F.busy = false; findRender(); return; }
    if (F.cache.has(q)) { F.res = F.cache.get(q); F.err = ''; F.busy = false; findRender(); return; }
    F.busy = true; findRender();
    F.t = setTimeout(() => {
      if (F.ctl) { try { F.ctl.abort(); } catch {} }
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; F.ctl = ctl;
      fetch((window.LG_BASE || '') + '/api/find?q=' + encodeURIComponent(q), ctl ? { signal: ctl.signal } : {})
        .then((r) => r.json().then((d) => ({ st: r.status, d })))
        .then(({ st, d }) => {
          if (F.ctl !== ctl) return;
          F.busy = false; F.ctl = null;
          if (d && d.ok) { F.res = d.list || []; F.err = ''; F.cache.set(q, F.res); if (F.cache.size > 50) F.cache.delete(F.cache.keys().next().value); }
          else F.err = st === 429 ? 'Слишком часто - подожди пару секунд' : 'Поиск не ответил';
          findRender();
        })
        .catch((e) => { if (e && e.name === 'AbortError') return; F.busy = false; F.err = 'Нет связи с сайтом'; findRender(); });
    }, 300);
  }
  function listLoad() {
    const m = me();
    if (!m || !m.user) { F.list = null; findRender(); return; }
    H.api('/api/mylist').then((r) => { if (r && r.ok) { F.list = r.list || []; F.listErr = ''; } else F.listErr = 'Список не загрузился'; findRender(); });
  }
  function listAct(act, ch, extra) {
    return H.api('/api/mylist', Object.assign({ act, ch }, extra || {})).then((r) => {
      if (r && r.ok) { F.list = r.list || []; findRender(); return true; }
      H.toast((r && r.error === 'rate_limited') ? 'Слишком часто - подожди немного' : 'Не вышло - попробуй ещё раз', true); return false;
    });
  }
  const liveTag = (c) => (c.live ? '<span class="pop-live"><i aria-hidden="true"></i>в эфире</span>' : '');
  const SVG = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    dn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  };
  function findRender() {
    const el = F.el; if (!el) return;
    const cur = curLogin(), q = String(F.q || '').trim();
    const res = $('#sfRes', el);
    if (q.replace(/^@/, '').length < 2) res.innerHTML = q ? '<p class="pop-e">Ещё хотя бы одна буква</p>' : '';
    else if (F.err) res.innerHTML = `<p class="pop-e">${esc(F.err)}</p>`;
    else if (F.busy && !F.res) res.innerHTML = '<p class="pop-e">Ищем…</p>';
    else if (F.res && !F.res.length) res.innerHTML = '<p class="pop-e">Таких стримеров в игре нет</p>';
    else if (F.res) res.innerHTML = `<p class="pop-h">Найдено</p><ul class="pop-l">${F.res.map((c) => `<li><a class="pop-ch" href="${chUrl(c.login)}" data-open="${esc(c.login)}"${c.login.toLowerCase() === cur ? ' aria-current="page"' : ''}><span class="pop-n" title="${esc(c.name)}">${esc(c.name)}</span>${liveTag(c)}</a></li>`).join('')}</ul>`;
    const my = $('#sfMy', el), m = me();
    let h = '';
    if (!m || !m.user) h = '<p class="pop-e">Войди через Twitch - здесь будут каналы, которые ты открывал, и те, где у тебя есть герой.</p>';
    else if (F.listErr) h = `<p class="pop-e">${esc(F.listErr)}</p>`;
    else if (!F.list) h = '<p class="pop-e">Загружаем твой список…</p>';
    else if (!F.list.length) h = '<p class="pop-e">Твой список пуст: найди стримера по нику - он появится здесь.</p>';
    else {
      const pins = F.list.filter((c) => c.pinned);
      h = `<p class="pop-h">Мой список</p><ul class="pop-l sf-l">${F.list.map((c) => {
        const pi = c.pinned ? pins.indexOf(c) : -1;
        return `<li class="sf-it${c.pinned ? ' is-pin' : ''}"><a class="pop-ch" href="${chUrl(c.login)}"${c.login.toLowerCase() === cur ? ' aria-current="page"' : ''}><span class="pop-n" title="${esc(c.name)}">${esc(c.name)}</span>${c.hero ? '<span class="sf-hero" title="Здесь у тебя есть герой">герой</span>' : ''}${liveTag(c)}</a>
          <span class="sf-a">${c.pinned && pins.length > 1 ? `<button type="button" class="sf-b" data-mv="-1" data-ch="${esc(c.login)}" aria-label="Выше: ${esc(c.name)}"${pi === 0 ? ' disabled' : ''}>${SVG.up}</button><button type="button" class="sf-b" data-mv="1" data-ch="${esc(c.login)}" aria-label="Ниже: ${esc(c.name)}"${pi === pins.length - 1 ? ' disabled' : ''}>${SVG.dn}</button>` : ''}
          <button type="button" class="sf-b sf-pin" data-act="${c.pinned ? 'unpin' : 'pin'}" data-ch="${esc(c.login)}" aria-pressed="${!!c.pinned}" title="${c.pinned ? 'Открепить' : 'Закрепить сверху'}" aria-label="${c.pinned ? 'Открепить' : 'Закрепить'}: ${esc(c.name)}">${SVG.pin}</button>
          <button type="button" class="sf-b sf-x" data-act="remove" data-ch="${esc(c.login)}" title="Убрать из списка (герой и вещи на канале останутся)" aria-label="Убрать из списка: ${esc(c.name)}">${SVG.x}</button></span></li>`;
      }).join('')}</ul>`;
    }
    // свои каналы (владелец / админ) - как раньше в «Моих каналах»
    const mine = (m && m.mine) || [];
    if (mine.length) h += `<hr class="pop-sep"><p class="pop-h">Мои каналы</p><ul class="pop-l">${mine.map((c) => `<li><a class="pop-ch" href="${chUrl(c.login)}"${c.login.toLowerCase() === cur ? ' aria-current="page"' : ''}><span class="pop-n">${esc(c.name)}</span></a></li>`).join('')}</ul>`;
    my.innerHTML = h;
  }
  function findClick(e) {
    const el = F.el, q = (k) => { const x = e.target.closest(k); return x && el && el.contains(x) ? x : null; };
    const mv = q('[data-mv]');
    if (mv && F.list) {
      const pins = F.list.filter((c) => c.pinned).map((c) => c.login), i = pins.indexOf(mv.dataset.ch), j = i + Number(mv.dataset.mv);
      if (i < 0 || j < 0 || j >= pins.length) return;
      [pins[i], pins[j]] = [pins[j], pins[i]];
      listAct('order', mv.dataset.ch, { order: pins }).then(() => { const b = F.el && F.el.querySelector(`[data-mv="${mv.dataset.mv}"][data-ch="${mv.dataset.ch}"]`); if (b && !b.disabled) b.focus(); });
      return;
    }
    const b = q('[data-act]');
    if (b) { listAct(b.dataset.act, b.dataset.ch); return; }
    const a = q('a[data-open]');
    if (a && me() && me().user) {
      // выбрал в поиске - канал сразу в список (на случай, если он закроет вкладку до загрузки)
      e.preventDefault();
      const go = () => { location.href = a.href; };
      H.api('/api/mylist', { act: 'open', ch: a.dataset.open }).then(go, go);
    }
  }
  document.addEventListener('click', (e) => { if (F.el && !F.el.contains(e.target) && !(F.from && F.from.contains(e.target))) findClose(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && F.el) findClose(true); });
  window.addEventListener('resize', () => findPlace());
  // открыл канал по ссылке - в свой список (раз за сессию браузера на канал)
  function markOpen() {
    const m = me(), c = curLogin();
    if (!m || !m.user || !m.find || !c || ss.get('lgOpen:' + c)) return;
    ss.set('lgOpen:' + c, '1');
    H.api('/api/mylist', { act: 'open', ch: c });
  }

  /* ---------- общее: цвета темы для фрейма выбора стиля, копирование, окно ---------- */
  function cssHex(v) {
    const p = document.createElement('span'); p.style.color = v; p.style.display = 'none'; document.body.appendChild(p);
    const c = getComputedStyle(p).color; p.remove();
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); if (!m) return '';
    return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('');
  }
  function copyText(text, okMsg) {
    const done = () => H.toast(okMsg || 'Скопировано');
    const old = () => { const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.append(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} t.remove(); if (ok) done(); else H.toast('Не удалось скопировать - выдели текст и скопируй вручную', true); };
    try { navigator.clipboard.writeText(text).then(done, old); } catch { old(); }
  }
  // фрейм с 7 стилями (превью героев): выбор приходит сообщением { lg: 'stylepick', id }
  function pickFrame(sel, onPick) {
    const f = document.createElement('iframe');
    f.className = 'wz-pick'; f.title = 'Выбор стиля'; f.setAttribute('loading', 'lazy');
    const q = new URLSearchParams({ sel: sel || '' });
    const fg = cssHex('var(--ink)'), ac = cssHex('var(--accent)'); if (fg) q.set('fg', fg); if (ac) q.set('ac', ac);
    f.src = '/site/stylepick?' + q.toString();
    const on = (e) => {
      if (e.origin !== location.origin || !e.data || e.source !== f.contentWindow) return;
      if (e.data.lg === 'stylepick') onPick(String(e.data.id || ''));
      if (e.data.lg === 'stylepick-h') f.style.height = Math.min(640, Math.max(140, +e.data.h || 0) + 6) + 'px';
    };
    window.addEventListener('message', on);
    f._off = () => window.removeEventListener('message', on);
    return f;
  }
  // окно поверх сайта (мастер, выбор стиля печати): Escape и «×» закрывают, фокус - внутри
  function modal(cls, label) {
    const back = document.createElement('div');
    back.className = 'wz-back'; back.innerHTML = `<div class="wz ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}"></div>`;
    document.body.appendChild(back);
    document.documentElement.classList.add('wz-open');
    const box = back.firstChild, was = document.activeElement;
    const close = () => { back.remove(); document.documentElement.classList.remove('wz-open'); document.removeEventListener('keydown', key); box.querySelectorAll('iframe').forEach((f) => f._off && f._off()); try { if (was && was.focus) was.focus(); } catch {} };
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); box.dispatchEvent(new CustomEvent('wz-esc')); } };
    document.addEventListener('keydown', key);
    return { back, box, close };
  }

  /* ---------- Печать Метаморфозы: выбор личного стиля героя (новинка «seal») ---------- */
  function stylePick(o) {
    const M = modal('wz-seal', o.title || 'Выбор стиля');
    let sel = '', armed = 0;
    M.box.innerHTML = `<div class="wz-h"><h2>${esc(o.title)}</h2><button type="button" class="wz-x" data-x aria-label="Закрыть">×</button></div>
      <p class="wz-t">${esc(o.text || '')}</p><div class="wz-pickbox"></div>
      <div class="wz-f"><button type="button" class="btn ghost" data-x>Отмена</button><button type="button" class="btn primary" data-ok disabled>${esc(o.ok || 'Выбрать')}</button></div>`;
    const ok = M.box.querySelector('[data-ok]');
    M.box.querySelector('.wz-pickbox').appendChild(pickFrame(o.sel, (id) => { sel = id; ok.disabled = !id; armed = 0; ok.textContent = o.ok || 'Выбрать'; }));
    M.box.addEventListener('click', (e) => {
      const q = (k) => { const x = e.target.closest(k); return x && M.box.contains(x) ? x : null; };
      if (q('[data-x]')) { M.close(); return; }
      if (q('[data-ok]') && sel) {
        if (o.confirm && Date.now() - armed > 4000) { armed = Date.now(); ok.textContent = o.confirm; return; }
        M.close(); o.pick(sel);
      }
    });
    M.box.addEventListener('wz-esc', () => M.close());
    setTimeout(() => { try { M.box.querySelector('[data-x]').focus(); } catch {} }, 0);
  }

  /* ---------- мастер первого запуска стримера (часть 3): 5 шагов, можно пропустить, снова - «? Как играть» ---------- */
  const wizKey = () => 'lgWiz:' + (ownLogin() || curLogin());
  const wizSeen = () => ls.get(wizKey()) === '1';
  const W = { m: null, step: 0, style: null, styleSel: '', mode: 'self', busy: false };
  const STEPS = ['Что за игра', 'Окно игры', 'Пульт', 'Стиль канала', 'Что дальше'];
  const myLink = () => `${location.origin}/c/${encodeURIComponent(ownLogin() || curLogin())}/`;
  const descText = () => `Играю со зрителями в «Поход Легиона»: твой герой, вещи и город - ${myLink()} . На стриме напиши в чат «поход» - и ты в отряде.`;
  const botText = () => `Поход Легиона: заходи на ${myLink()} - там твой герой. Вступить в отряд на стриме - напиши в чат: поход`;
  function wizOpenImpl(step) {
    if (W.m) W.m.close();
    W.m = modal('wz-main', 'Как играть - мастер стримера');
    W.step = Math.max(0, Math.min(STEPS.length - 1, step || 0));
    W.m.box.addEventListener('click', wizClick);
    W.m.box.addEventListener('wz-esc', () => wizEnd(false));
    wizRender();
    // стиль канала и замок - сразу, к шагу 4 уже будет
    H.api('/api/style').then((r) => { if (r && r.ok) { W.style = r; if (!W.styleSel) W.styleSel = r.active || 'legion'; W.mode = r.lock && r.lock.vote ? 'chat' : 'self'; if (W.step === 3) wizRender(); } });
  }
  function wizEnd(done) {
    ls.set(wizKey(), '1');
    if (W.m) { W.m.close(); W.m = null; }
    if (done) H.toast('Готово! Включи эфир и нажми «Начать сюжет»');
  }
  function wizBody() {
    const own = ownLogin() || curLogin();
    switch (W.step) {
      case 0: return `<h2>«Поход Легиона» - игра со зрителями</h2>
        <div class="wz-cols"><div class="wz-card"><b>Зрители</b><span>Играют в чате и на сайте: пишут «поход», голосуют, куда идти, бьются, собирают вещи. На сайте - свой герой, сумка и город.</span></div>
        <div class="wz-card"><b>Ты</b><span>Ведёшь поход с пульта: начинаешь сюжет, собираешь отряд, запускаешь голосования. Бои и ловушки идут сами - кнопки только ускоряют.</span></div></div>
        <p class="wz-t">Мастер займёт пару минут. Его можно пропустить и открыть снова кнопкой «? Как играть».</p>`;
      case 1: return `<h2>Окно игры</h2>
        <p class="wz-t">Игра - отдельное окно браузера. Его и показывай на стриме.</p>
        <ol class="wz-ol"><li>Нажми «Открыть игру» - откроется новая вкладка, разверни её на весь экран (F11).</li>
        <li>В OBS: «Источники» → «+» → <b>«Захват окна»</b> → выбери окно браузера с игрой.</li>
        <li>Размер сцены - 1920×1080. Правый нижний угол игра оставляет пустым - там твоя вебка.</li></ol>
        <div class="wz-row"><button type="button" class="btn primary" data-game>Открыть игру</button></div>
        <p class="wz-note">Ссылка для источника «Браузер» (с ключом) - в пульте «Игра», кнопка «Скопировать ссылку для OBS»: она сразу копируется и на экран не выводится. Экран стримера может быть в эфире - ключ не показываем.</p>`;
      case 2: return `<h2>Пульт игры</h2>
        <p class="wz-t">Весь поход ведётся с одной вкладки - «Игра». Покажем, где что: статус, этапы, главная кнопка и что сейчас на экране.</p>
        <div class="wz-row"><button type="button" class="btn primary" data-tour>Показать на пульте</button></div>
        <p class="wz-note">Подсказки появятся поверх настоящего пульта. После них мастер продолжится.</p>`;
      case 3: {
        const st = W.style, L = st && st.lock;
        if (!st) return `<h2>Стиль канала</h2><p class="wz-t">Загружаем стили…</p>`;
        const name = (id) => ((st.styles || []).find((x) => x.id === id) || {}).name || id;
        if (L && !L.canChange && !st.admin) return `<h2>Стиль канала</h2>
          <p class="wz-t">Стиль канала - <b>${esc(name(st.active))}</b>. ${L.changed ? 'Смена стиля уже использована.' : 'Сменить его можно будет один раз - после победы над Закхуэлем (конец пролога).'}</p>
          <p class="wz-note">Свой стиль герой может получить Печатью Метаморфозы - она падает с Закхуэля.</p>`;
        return `<h2>Стиль канала</h2>
          <p class="wz-t">Стиль меняет героев зрителей и стартовый лагерь. Враги, боссы и города мира - общие для всех.</p>
          <div class="wz-seg" role="radiogroup" aria-label="Кто выбирает">
            <button type="button" role="radio" data-mode="self" aria-checked="${W.mode === 'self'}">Выбрать самому</button>
            <button type="button" role="radio" data-mode="chat" aria-checked="${W.mode === 'chat'}">Выбрать со зрителями</button></div>
          <div class="wz-pickbox"${W.mode === 'chat' ? ' hidden' : ''}></div>
          ${W.mode === 'chat' ? '<p class="wz-t">После «Начать сюжет» первым будет опрос чата за стиль. Пока опроса нет - стиль «Легион».</p>' : ''}
          <p class="wz-warn">⚠ ${L && L.once ? 'Это твоя единственная смена стиля - потом стиль закроется насовсем.' : 'Сменить стиль потом можно только один раз - после победы над Закхуэлем (конец пролога).'}</p>
          <div class="wz-row"><button type="button" class="btn primary" data-stylesave ${W.busy ? 'disabled' : ''}>${W.mode === 'chat' ? 'Выбирать будет чат' : `Выбрать «${esc(name(W.styleSel || 'legion'))}»`}</button></div>`;
      }
      default: return `<h2>Что дальше</h2>
        <ol class="wz-ol"><li><b>Включи эфир</b> и открой окно игры в OBS.</li><li>В пульте «Игра» нажми <b>«Начать сюжет»</b> - дальше главная кнопка всегда подскажет следующий шаг.</li></ol>
        <p class="wz-h3">Твоя ссылка для зрителей</p>
        <div class="wz-link"><code>${esc(myLink())}</code><button type="button" class="btn ghost sm" data-copy="link">Скопировать</button></div>
        <p class="wz-note">В ссылке нет ключей - её можно показывать на стриме. По ней зрители найдут тебя, героя и город.</p>
        ${own ? '' : ''}`;
    }
  }
  function wizRender() {
    if (!W.m) return;
    const n = STEPS.length, i = W.step;
    W.m.box.innerHTML = `<div class="wz-h"><span class="wz-n">Шаг ${i + 1} из ${n} · ${esc(STEPS[i])}</span><button type="button" class="wz-x" data-skip aria-label="Закрыть мастер">×</button></div>
      <ol class="wz-dots" aria-hidden="true">${STEPS.map((t, k) => `<li class="${k < i ? 'done' : k === i ? 'cur' : ''}"></li>`).join('')}</ol>
      <div class="wz-b">${wizBody()}</div>
      <div class="wz-f"><button type="button" class="btn ghost" data-skip>Пропустить</button><span class="wz-sp"></span>
        ${i ? '<button type="button" class="btn ghost" data-prev>Назад</button>' : ''}
        ${i < n - 1 ? '<button type="button" class="btn primary" data-next>Далее</button>' : '<button type="button" class="btn primary" data-done>В пульт «Игра»</button>'}</div>`;
    const pb = W.m.box.querySelector('.wz-pickbox');
    if (pb && !pb.hidden) pb.appendChild(pickFrame(W.styleSel || 'legion', (id) => { if (!id) return; W.styleSel = id; const b = W.m && W.m.box.querySelector('[data-stylesave]'); if (b) { const st = W.style; b.textContent = `Выбрать «${((st && st.styles) || []).find((x) => x.id === id)?.name || id}»`; } }));
    setTimeout(() => { try { const f = W.m && (W.m.box.querySelector('[data-next], [data-done]')); if (f) f.focus({ preventScroll: true }); } catch {} }, 0);
  }
  async function styleSave() {
    const st = W.style; if (!st || W.busy) return;
    W.busy = true; wizRender();
    const body = W.mode === 'chat' ? { vote: true } : { id: W.styleSel || 'legion', ...(st.lock && st.lock.once ? { confirm: true } : {}) };
    const r = await H.api('/api/style', body);
    W.busy = false;
    if (r && r.ok) { W.style = { ...st, ...r }; H.toast(W.mode === 'chat' ? 'Стиль выберет чат после «Начать сюжет»' : 'Стиль канала выбран - оверлей перезагрузится сам'); W.step = 4; }
    else H.toast((r && r.error) || 'Не сохранено', true);
    wizRender();
  }
  function wizClick(e) {
    // только кнопки внутри окна мастера (у <html> свои data-атрибуты: data-style, data-skin…)
    const box = W.m && W.m.box, q = (sel) => { const x = e.target.closest(sel); return x && box && box.contains(x) ? x : null; };
    if (q('[data-skip]')) { wizEnd(false); return; }
    if (q('[data-next]')) { W.step++; wizRender(); return; }
    if (q('[data-prev]')) { W.step--; wizRender(); return; }
    if (q('[data-done]')) { wizEnd(true); try { H.smShow(((H.sm() || {}).sections || []).some((x) => x.id === 'game') ? 'game' : 'shop'); } catch {} return; }
    if (q('[data-game]')) {
      const w = window.open(`/c/${encodeURIComponent(ownLogin() || curLogin())}/game`, 'lg-game');
      if (w) { try { w.focus(); } catch {} H.toast('Игра открыта в новой вкладке: разверни на весь экран (F11)'); } else H.toast('Браузер не дал открыть окно: разреши всплывающие окна для этого сайта', true);
      return;
    }
    if (q('[data-tour]')) { tourStart(); return; }
    const md = q('[data-mode]'); if (md) { W.mode = md.dataset.mode; wizRender(); return; }
    if (q('[data-stylesave]')) { styleSave(); return; }
    const cp = q('[data-copy]');
    if (cp) { const k = cp.dataset.copy; copyText(k === 'link' ? myLink() : k === 'desc' ? descText() : botText(), k === 'link' ? 'Ссылка скопирована' : 'Текст скопирован'); }
  }

  /* ---------- тур по пульту: подсказки поверх настоящего пульта (вкладка «Игра» во фрейме того же сайта) ---------- */
  const TOUR = [
    { k: 'status', sel: '[data-tour="status"], #sgSt', t: 'Статус', d: 'Игра на связи, OBS видит игру, идёт ли эфир. Всё зелёное - можно начинать.' },
    { k: 'stages', sel: '[data-tour="stages"], .sg-path', t: 'Этапы', d: 'Подготовка → Сбор → Поход → Бой → Итог. Текущий этап подсвечен.' },
    { k: 'main', sel: '[data-tour="main"], #main', t: 'Главная кнопка', d: 'Всегда показывает следующий шаг: начать сюжет, в путь, куда идём. Просто жми её.' },
    { k: 'now', sel: '[data-tour="now"], #where', t: 'Сейчас на экране', d: 'Одна строка: что сейчас видят зрители.' },
  ];
  let TR = null;
  function tourStart() {
    if (W.m) { W.m.close(); W.m = null; }
    const id = ((H.sm() || {}).sections || []).some((x) => x.id === 'game') ? 'game' : 'shop';
    try { H.smShow(id); } catch {}
    TR = { i: 0, id, el: null, tries: 0 };
    tourStep();
  }
  function tourFind() {
    const f = H.smFrame(TR.id); if (!f) return null;
    let doc = null; try { doc = f.contentDocument; } catch { return null; }
    if (!doc) return null;
    const s = TOUR[TR.i];
    const el = [...doc.querySelectorAll(s.sel)].find((x) => x.offsetParent !== null || x.getClientRects().length);
    return el ? { f, el } : null;
  }
  function tourStep() {
    if (!TR) return;
    const hit = tourFind();
    if (!hit) { if (++TR.tries < 40) { setTimeout(tourStep, 250); return; } TR.i++; TR.tries = 0; if (TR.i >= TOUR.length) { tourEnd(); return; } }
    if (!hit) { setTimeout(tourStep, 0); return; }
    TR.tries = 0;
    try { hit.el.scrollIntoView({ block: 'center' }); } catch {}
    setTimeout(() => tourDraw(hit), 60);
  }
  function tourDraw(hit) {
    if (!TR) return;
    const fr = hit.f.getBoundingClientRect(), r = hit.el.getBoundingClientRect();
    const x = fr.left + r.left, y = fr.top + r.top, w = r.width, h = r.height, s = TOUR[TR.i];
    if (!TR.el) { TR.el = document.createElement('div'); TR.el.className = 'tour'; document.body.appendChild(TR.el); TR.el.addEventListener('click', tourClick); }
    const below = y + h + 180 < window.innerHeight, bw = Math.min(320, window.innerWidth - 24);
    const bx = Math.max(12, Math.min(window.innerWidth - bw - 12, x + w / 2 - bw / 2)), by = below ? y + h + 12 : Math.max(12, y - 12 - 150);
    TR.el.innerHTML = `<div class="tour-hole" style="left:${x - 6}px;top:${y - 6}px;width:${w + 12}px;height:${h + 12}px"></div>
      <div class="tour-tip" role="dialog" aria-live="polite" style="left:${bx}px;top:${by}px;width:${bw}px"><span class="wz-n">${TR.i + 1} из ${TOUR.length}</span><b>${esc(s.t)}</b><p>${esc(s.d)}</p>
      <div class="wz-f"><button type="button" class="btn ghost sm" data-tend>Хватит</button><span class="wz-sp"></span><button type="button" class="btn primary sm" data-tnext>${TR.i < TOUR.length - 1 ? 'Дальше' : 'Понятно'}</button></div></div>`;
    try { TR.el.querySelector('[data-tnext]').focus({ preventScroll: true }); } catch {}
  }
  function tourClick(e) {
    if (!TR || !TR.el) return;
    const q = (k) => { const x = e.target.closest(k); return x && TR.el.contains(x) ? x : null; };
    if (q('[data-tend]')) { tourEnd(); return; }
    if (q('[data-tnext]')) { TR.i++; if (TR.i >= TOUR.length) tourEnd(); else tourStep(); }
  }
  function tourEnd() {
    if (TR && TR.el) TR.el.remove();
    TR = null;
    wizOpenImpl(3);
  }
  window.addEventListener('resize', () => { if (TR && TR.el) { const hit = tourFind(); if (hit) tourDraw(hit); } });
  document.addEventListener('keydown', (e) => { if (TR && e.key === 'Escape') tourEnd(); });
  const wizOpen = (step) => wizOpenImpl(step);
  // первый переход в «Стример» своего канала (переключателем или по ссылке #streamer) - мастер, один раз в этом браузере
  let wizT = 0;
  function wizMaybe() {
    const m = me();
    if (!H || H.curTab() !== 'streamer' || !m || !m.roleSw || !ownLogin() || ownLogin() !== curLogin() || wizSeen() || W.m || TR || wizT) return;
    wizT = setTimeout(() => { wizT = 0; if (H.curTab() === 'streamer' && !W.m && !TR && !wizSeen()) wizOpen(0); }, 600);
  }

  window.LGStart = {
    init(h) { H = h; },
    sync() { swRender(); markOpen(); if (F.el) findRender(); wizMaybe(); },
    tabChanged(id) {
      if (id !== 'streamer') lastViewerTab = id;
      swRender(); wizMaybe();
    },
    findToggle(btn) { if (F.el) findClose(true); else findOpen(btn); },
    help() { wizOpen(0); },
    stylePick,
    copyText,
    link: myLink,
    texts: () => ({ link: myLink(), desc: descText(), bot: botText() }),
    _F: F,
  };
})();
