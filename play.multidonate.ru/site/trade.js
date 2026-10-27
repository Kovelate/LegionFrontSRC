/* 23.10: обмен между игроками — лицом к лицу в «Городе» (решение стримера 23.10) — window.LGTrade. Сервер — src/site/trade.ts,
   проводит обмен комната (products/legion/modules/legionary/trade.js). Правила — legacy/md/docs/CITY.md.
   Нажал на героя другого игрока → меню «Предложить обмен» → у него приглашение (60 с) → окно обмена у обоих:
   «Ты отдаёшь» (до 6 вещей и монеты — из своей сумки перетаскиванием или нажатием; стопка — сколько штук) / «Тебе дают».
   Любое изменение снимает «Готово» у обоих и подсвечивает, что поменялось; оба «Готово» → 3 секунды → «Подтвердить обмен».
   Отдаёшь по цене лавки в разы больше, чем получаешь, — перед подтверждением переспросим.
   Лёгкость: никаких циклов по кадрам — перерисовка только по событию сервера; таймер в 1 с — только пока идёт отсчёт или
   висит приглашение. Ячейки и перетаскивание — общие (itemgrid.js → window.LGItems), карточка вещи — общая (app.js itemBody). */
(function () {
  'use strict';
  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  const IG = () => window.LGItems;
  const T = { X: null, host: null, tr: null, menu: null, win: null, inv: null, tick: 0, cdEnd: 0, drag: null, qty: null, warn: false, coinT: 0, later: 0, busy: false };
  const me = () => (T.X && T.X.login()) || '';
  const hero = () => (T.X && T.X.hero()) || null;
  const money = (n) => (T.X ? T.X.money(n) : String(n));
  const sec = (ms) => Math.max(0, Math.ceil(ms / 1000));
  // 26.10: тот же текст, что у сервера (src/site/trade.ts lowText)
  const lowText = (min, lv, who) => `Обмен и передача доступны с ${min} уровня (${who ? `у игрока ${who} сейчас` : 'сейчас у тебя'} ${lv}-й)`;

  /* ---------- сеть ---------- */
  async function op(b, btn) {
    if (!T.X) return null;
    if (btn) btn.disabled = true;
    const r = await T.X.api('/api/city/trade', b);
    if (btn && btn.isConnected) btn.disabled = false;
    if (r && r.tr !== undefined) on(r.tr);
    if (r && r.ok === false) toast(r.error || 'не вышло', true);
    return r;
  }
  const toast = (t, bad) => { if (T.X && T.X.toast) T.X.toast(t, bad); };

  /* ---------- меню героя (нажали на чужого героя в «Городе») ---------- */
  function menu(l, v, cx, cy) {
    closeMenu();
    if (!T.host) return;
    const h = hero(), can = !!(h && h.tr), busy = T.tr && T.tr.s;
    // 26.10: порог уровня (tradeMinLevel, флаг tml) - у обеих сторон; окончательно проверит сервер
    const min = (h && +h.tml) || 0, myLv = (h && +h.level) || 1, low = min > 1 && myLv < min ? lowText(min, myLv) : min > 1 && v.lv && +v.lv < min ? lowText(min, +v.lv, v.n || l) : '';
    const m = document.createElement('div');
    m.className = 'tr-menu'; m.setAttribute('role', 'menu');
    m.innerHTML = `<div class="tr-mh"><b>${esc(v.n || l)}</b>${v.lv ? `<small>ур. ${+v.lv}</small>` : ''}</div>
      <button type="button" role="menuitem" class="btn primary sm" data-trinv${can && !busy && !low ? '' : ' disabled'}>Предложить обмен</button>
      ${!can ? '<p class="note">Обмен пока закрыт.</p>' : low ? `<p class="note">${esc(low)}.</p>` : busy ? '<p class="note">Сначала закончи текущий обмен.</p>' : ''}`;
    document.body.appendChild(m);
    const r = m.getBoundingClientRect(), [x, y] = window.LGSiteUi.clampXY(m, cx - r.width / 2, cy - r.height - 14);   // 25.10: не за край экрана - packages/site-ui
    m.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    T.menu = m;
    m.querySelector('[data-trinv]').onclick = (e) => { closeMenu(); op({ op: 'invite', to: l }, e.currentTarget); };
    setTimeout(() => { document.addEventListener('pointerdown', outMenu, true); document.addEventListener('keydown', escMenu); }, 0);
    try { m.querySelector('button:not([disabled])').focus({ preventScroll: true }); } catch {}
  }
  const outMenu = (e) => { if (T.menu && !T.menu.contains(e.target)) closeMenu(); };
  const escMenu = (e) => { if (e.key === 'Escape') closeMenu(); };
  function closeMenu() { if (!T.menu) return; T.menu.remove(); T.menu = null; document.removeEventListener('pointerdown', outMenu, true); document.removeEventListener('keydown', escMenu); }

  /* ---------- состояние с сервера ---------- */
  // tr — вид от сервера (trade.ts view): inv — входящие приглашения, out — своё, s — окно обмена; d — всё событие (trNote, trDone)
  function on(tr, d) {
    if (d && d.trNote) toast(d.trNote);
    if (d && d.trDone && d.trDone.ok) { toast(`Обмен с ${d.trDone.with} проведён — вещи и монеты уже у вас`); T.warn = false; T.qty = null; }
    if (tr === undefined) return;
    const was = T.tr && T.tr.s;
    T.tr = tr || { inv: [], s: null };
    const s = T.tr.s;
    if (s && s.cd != null && s.cd > 0) T.cdEnd = Date.now() + s.cd; else if (!s || s.cd == null) T.cdEnd = 0;
    if (!s || (was && was.id !== s.id)) { T.warn = false; T.qty = null; }
    render();
  }
  function render() {
    if (!T.host) return;
    if (T.drag && T.drag.active()) { clearTimeout(T.later); T.later = setTimeout(render, 300); return; }   // тянут вещь — перерисуем после
    invRender(); winRender(); timer();
  }
  // один таймер в секунду — только пока есть приглашения или идёт отсчёт
  function timer() {
    const need = !!(T.tr && ((T.tr.inv && T.tr.inv.length) || T.tr.out || (T.tr.s && T.cdEnd > Date.now())));
    if (need && !T.tick) T.tick = setInterval(() => { if (T.cdEnd && Date.now() >= T.cdEnd) { T.cdEnd = 0; winRender(); } else tickText(); if (!(T.tr && ((T.tr.inv && T.tr.inv.length) || T.tr.out || T.cdEnd))) { clearInterval(T.tick); T.tick = 0; } }, 1000);
    if (!need && T.tick) { clearInterval(T.tick); T.tick = 0; }
  }
  function tickText() {
    const now = Date.now();
    if (T.inv) T.inv.querySelectorAll('[data-left]').forEach((e) => { const end = +e.dataset.left; e.textContent = sec(end - now) + ' с'; });
    const c = T.win && T.win.querySelector('[data-cd]'); if (c) c.textContent = String(sec(T.cdEnd - now));
  }

  /* ---------- приглашения ---------- */
  function invRender() {
    const tr = T.tr || {}, list = tr.inv || [], out = tr.out;
    if (!list.length && !out) { if (T.inv) { T.inv.remove(); T.inv = null; } return; }
    if (!T.inv) { T.inv = document.createElement('div'); T.inv.className = 'tr-inv'; T.inv.setAttribute('aria-live', 'polite'); T.host.appendChild(T.inv); }
    const now = Date.now();
    T.inv.innerHTML = list.map((x) => `<div class="tr-ic" role="alertdialog" aria-label="Предложение обмена"><p><b>${esc(x.n)}</b>${x.lv ? ` <small>ур. ${+x.lv}</small>` : ''} предлагает обмен <span class="tr-left" data-left="${now + x.left}">${sec(x.left)} с</span></p>
        <div class="tr-ib"><button type="button" class="btn primary sm" data-tracc="${esc(x.l)}">Принять</button><button type="button" class="btn ghost sm" data-trdec="${esc(x.l)}">Отказать</button></div></div>`).join('')
      + (out ? `<div class="tr-ic out"><p>Ждём ответа: <b>${esc(out.n)}</b> <span class="tr-left" data-left="${now + out.left}">${sec(out.left)} с</span></p><div class="tr-ib"><button type="button" class="btn ghost sm" data-trout>Отменить</button></div></div>` : '');
    T.inv.querySelectorAll('[data-tracc]').forEach((b) => b.onclick = () => op({ op: 'accept', from: b.dataset.tracc }, b));
    T.inv.querySelectorAll('[data-trdec]').forEach((b) => b.onclick = () => op({ op: 'decline', from: b.dataset.trdec }, b));
    const o = T.inv.querySelector('[data-trout]'); if (o) o.onclick = () => op({ op: 'cancel' }, o);
  }

  /* ---------- окно обмена ---------- */
  const cellOf = (it) => ({ it, n: Math.max(1, +it.n || 1), uids: [it.uid] });
  function sideCells(side, mine) {
    const chg = !mine && side.chg ? new Set(side.chg.add || []) : null;
    const L = IG(), body = side.items.map((it) => {
      const c = cellOf(it), cls = chg && chg.has(it.uid) ? ' tr-chg' : '';
      return `<div class="tr-slot${cls}">${L.cell(c, { art: (x) => T.X.art(x), attr: `data-trit="${mine ? 'me' : 'th'}"` })}${mine ? `<button type="button" class="tr-rm" data-trrm="${esc(it.uid)}" aria-label="Убрать ${esc(it.name)}">×</button>` : ''}${chg && chg.has(it.uid) ? '<i class="tr-new">новое</i>' : ''}</div>`;
    }).join('');
    const empty = Math.max(0, (T.tr.s.max || 6) - side.items.length);
    return body + `<span class="tr-slot e"${mine ? ' data-igdrop="give"' : ''} aria-hidden="true"></span>`.repeat(empty);
  }
  function winRender() {
    const s = T.tr && T.tr.s;
    if (!s) { if (T.win) { offDrag(); T.win.remove(); T.win = null; if (T.X.tipHide) T.X.tipHide(); } return; }
    const h = hero(); if (!h) return;
    const first = !T.win;
    if (first) { T.win = document.createElement('section'); T.win.className = 'tr-win'; T.win.setAttribute('role', 'dialog'); T.win.setAttribute('aria-label', 'Обмен'); T.host.appendChild(T.win); }
    const keepCoin = document.activeElement && document.activeElement.matches && document.activeElement.matches('.tr-coins input') ? document.activeElement.value : null;
    const sc = T.win.querySelector('.tr-body'), top = sc ? sc.scrollTop : 0;
    const M = s.me, H = s.th, now = Date.now(), cdLeft = T.cdEnd > now ? T.cdEnd - now : 0;
    const both = M.ready && H.ready, canConf = both && !cdLeft && !s.wait;
    // сумка: то, что ещё не положено в обмен (стопка — остаток), без надетого
    const used = new Map(); for (const it of M.items) used.set(it.wearable ? it.uid : 'id:' + it.id, it.wearable ? 1 : +it.n || 1);
    const bagItems = (h.items || []).filter((x) => !x.on && !(x.wearable && used.has(x.uid)));
    const left = new Map(); for (const it of M.items) if (!it.wearable) left.set(it.id, +it.n || 1);
    const bag = []; for (const it of bagItems) { if (!it.wearable && left.get(it.id) > 0) { left.set(it.id, left.get(it.id) - 1); continue; } bag.push(it); }
    const full = M.items.length >= (s.max || 6);
    T.bag2 = bag;   // 25.10: что ещё в сумке — для новой сумки (inv2, bindWin → mount2)
    const cells = IG().cells(bag, (h.sg && h.sg.bs) || 20);
    const chgH = H.chg && ((H.chg.add || []).length || (H.chg.del || []).length || H.chg.coins);
    let act;
    if (s.wait) act = '<p class="tr-st wait">Игра проводит обмен…</p>';
    else if (canConf && M.conf) act = `<p class="tr-st">Ждём, пока подтвердит ${esc(H.n)}…</p>`;
    else if (canConf) act = `<button type="button" class="btn primary wide tr-go" data-trconf>Подтвердить обмен</button>`;
    else if (both) act = `<p class="tr-st cd">Подтвердить можно через <b data-cd>${sec(cdLeft)}</b></p>`;
    else act = '';
    T.win.innerHTML = `<header class="tr-h"><h2>Обмен с <b>${esc(H.n)}</b> <small>ур. ${+H.lv || 1}</small></h2><button type="button" class="btn ghost sm" data-trx>Отмена</button></header>
      <div class="tr-body">
        <div class="tr-halves">
          <section class="tr-half me${M.ready ? ' rdy' : ''}" aria-label="Ты отдаёшь">
            <h3>Ты отдаёшь <span class="tr-flag">${M.ready ? '✓ готов' : 'не готов'}</span></h3>
            <div class="tr-slots" data-igdrop="give">${sideCells(M, true)}</div>
            <label class="tr-coins"><span>Монеты (медь)</span><input type="number" inputmode="numeric" min="0" max="${Math.max(0, Math.floor(+h.money || 0))}" step="1" value="${M.coins || 0}"${s.wait ? ' disabled' : ''} aria-label="Сколько монет отдаёшь (в медных)"><em>${M.coins ? money(M.coins) : 'есть ' + money(h.money)}</em></label>
          </section>
          <section class="tr-half th${H.ready ? ' rdy' : ''}${chgH ? ' chg' : ''}" aria-label="Тебе дают">
            <h3>Тебе дают <span class="tr-flag">${H.ready ? '✓ готов' : 'не готов'}</span></h3>
            ${chgH ? `<p class="tr-chgn" role="status">${esc(H.n)} изменил предложение — готовность снята${(H.chg.del || []).length ? `; убрал: ${esc(H.chg.del.join(', '))}` : ''}</p>` : ''}
            <div class="tr-slots">${sideCells(H, false)}</div>
            <p class="tr-coins th${H.chg && H.chg.coins ? ' tr-chg' : ''}"><span>Монеты</span><em>${H.coins ? money(H.coins) : 'нет'}</em></p>
          </section>
        </div>
        ${s.err ? `<p class="tr-err" role="alert">${esc(s.err)}</p>` : ''}
        <div class="tr-act">
          <button type="button" class="btn ${M.ready ? 'ghost' : 'primary'} tr-rdy" data-trrdy aria-pressed="${!!M.ready}"${s.wait ? ' disabled' : ''}>${M.ready ? 'Не готов' : 'Готово'}</button>
          ${act}
        </div>
        ${T.warn && s.warn ? warnHtml(s.warn) : ''}
        ${T.qty ? qtyHtml() : ''}
        <div class="tr-bagh"><h3>Твоя сумка</h3><span class="note">${full ? `Не больше ${s.max || 6} вещей` : 'Перетащи вещь в «Ты отдаёшь» или нажми на неё'}</span></div>
        ${inv2(h) ? '<div class="tr-inv2" data-trinv></div>' : cells.length ? IG().grid(cells, { art: (x) => T.X.art(x), drag: !full && !s.wait, label: 'Сумка' }) : '<p class="note">В сумке пусто.</p>'}
        <p class="note">Надетое не отдаётся — сначала сними. Обмен без налога; игра проверит обе сумки и монеты и проведёт его целиком или никак.</p>
      </div>`;
    const sc2 = T.win.querySelector('.tr-body'); if (sc2) sc2.scrollTop = top;
    if (keepCoin != null) { const i = T.win.querySelector('.tr-coins input'); if (i) { i.value = keepCoin; i.focus({ preventScroll: true }); } }
    bindWin();
    if (first) try { T.win.querySelector('.tr-rdy').focus({ preventScroll: true }); } catch {}
  }
  function warnHtml(w) {
    return `<div class="tr-warn" role="alertdialog" aria-label="Неравный обмен"><p>Ты отдаёшь вещи на <b>${money(w.give)}</b>, а получаешь на <b>${money(w.get)}</b> — уверен?</p>
      <div class="tr-ib"><button type="button" class="btn primary sm" data-trsure>Да, подтвердить</button><button type="button" class="btn ghost sm" data-trback>Назад</button></div></div>`;
  }
  function qtyHtml() {
    const q = T.qty;
    return `<div class="tr-qty" role="dialog" aria-label="Сколько отдать"><span class="cy-gi">${T.X.art(q.it)}</span><b>${esc(q.it.name)}</b>
      <label>Сколько: <input type="number" inputmode="numeric" min="1" max="${q.max}" value="${q.max}" data-qn></label><small>из ${q.max}</small>
      <div class="tr-ib"><button type="button" class="btn primary sm" data-qok>Положить</button><button type="button" class="btn ghost sm" data-qno>Отмена</button></div></div>`;
  }
  // своё предложение → сервер (весь список: строки { uid, n } и монеты)
  function send(items, coins) {
    const s = T.tr && T.tr.s; if (!s) return;
    op({ op: 'offer', items: items.map((x) => ({ uid: x.uid, n: Math.max(1, +x.n || 1) })), coins: Math.max(0, Math.floor(+coins || 0)) });
  }
  function add(uid, n) {
    const s = T.tr && T.tr.s, h = hero(); if (!s || !h || s.wait) return;
    const it = (h.items || []).find((x) => x.uid === uid); if (!it || it.on) return;
    const items = s.me.items.map((x) => ({ uid: x.uid, n: x.n }));
    if (!it.wearable) {
      const total = (h.items || []).filter((x) => x.id === it.id && !x.on).length, had = s.me.items.find((x) => x.id === it.id);
      if (n == null) { const max = total - (had ? +had.n || 1 : 0); if (max > 1) { T.qty = { it, max: had ? total : max, uid: had ? had.uid : uid }; winRender(); return; } n = (had ? +had.n || 1 : 0) + 1; }
      if (had) { had.n = Math.min(total, n); const x = items.find((y) => y.uid === had.uid); if (x) x.n = had.n; send(items, s.me.coins); return; }
      n = Math.min(total, n);
    }
    if (items.length >= (s.max || 6)) { toast(`не больше ${s.max || 6} вещей`, true); return; }
    items.push({ uid, n: n || 1 });
    send(items, s.me.coins);
  }
  function bindWin() {
    const W = T.win, s = T.tr.s;
    W.querySelector('[data-trx]').onclick = (e) => op({ op: 'cancel' }, e.currentTarget);
    const rd = W.querySelector('[data-trrdy]'); if (rd) rd.onclick = () => { T.warn = false; op({ op: 'ready', on: !s.me.ready }, rd); };
    const cf = W.querySelector('[data-trconf]'); if (cf) cf.onclick = () => { if (s.warn) { T.warn = true; winRender(); return; } op({ op: 'confirm' }, cf); };
    const su = W.querySelector('[data-trsure]'); if (su) su.onclick = () => { T.warn = false; op({ op: 'confirm' }, su); };
    const bk = W.querySelector('[data-trback]'); if (bk) bk.onclick = () => { T.warn = false; winRender(); };
    W.querySelectorAll('[data-trrm]').forEach((b) => b.onclick = () => send(s.me.items.filter((x) => x.uid !== b.dataset.trrm), s.me.coins));
    const ci = W.querySelector('.tr-coins input');
    if (ci) {
      const go = () => { clearTimeout(T.coinT); const v = Math.max(0, Math.floor(+ci.value || 0)); if (v !== (s.me.coins || 0)) send(s.me.items, v); };
      ci.oninput = () => { clearTimeout(T.coinT); T.coinT = setTimeout(go, 700); };
      ci.onchange = go; ci.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
    }
    const qn = W.querySelector('[data-qn]');
    if (qn) {
      W.querySelector('[data-qok]').onclick = () => { const q = T.qty; T.qty = null; add(q.uid, Math.max(1, Math.min(q.max, Math.floor(+qn.value || 1)))); };
      W.querySelector('[data-qno]').onclick = () => { T.qty = null; winRender(); };
      // 24.10: Enter в «Сколько» — «Положить», Esc — «Отмена» (поле не в форме — само по Enter ничего не делало)
      qn.onkeydown = (e) => { if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter') { e.preventDefault(); W.querySelector('[data-qok]').click(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); W.querySelector('[data-qno]').click(); } };
      try { qn.focus({ preventScroll: true }); qn.select(); } catch {}
    }
    // вещи: карточка при наведении (мышь) и по нажатию на чужую / свою выложенную; из сумки — нажатие кладёт, перетаскивание тоже
    const itemOf = (el) => {
      const uid = el.dataset.ig, w = el.dataset.trit;
      if (w === 'th') return s.th.items.find((x) => x.uid === uid);
      if (w === 'me') return s.me.items.find((x) => x.uid === uid);
      return ((hero() || {}).items || []).find((x) => x.uid === uid);
    };
    const tip = (el) => { const it = itemOf(el); if (it && T.X.cardTip) T.X.cardTip(el, it, hero(), { cls: true, dur: true }); };
    W.onpointerover = (e) => { if (e.pointerType !== 'mouse' || (T.drag && T.drag.active())) return; const el = e.target.closest('[data-ig]'); if (el) tip(el); };
    W.onpointerout = (e) => { const el = e.target.closest('[data-ig]'); if (el && (!e.relatedTarget || !el.contains(e.relatedTarget)) && T.X.tipHide) T.X.tipHide(); };
    W.onfocusin = (e) => { const el = e.target.closest('[data-ig]'); if (el && el.matches(':focus-visible')) tip(el); };
    offDrag();
    { const h2 = hero(); if (inv2(h2)) { mount2(W, h2, T.bag2 || [], s); return; } }   // 25.10: новая сумка (inv2) — выбор и перетаскивание у библиотеки
    let pt = 'mouse';
    W.onpointerdown = (e) => { pt = e.pointerType || 'mouse'; if (!e.target.closest('[data-ig]') && T.X.tipHide) T.X.tipHide(); };
    T.drag = IG().drag(W, {
      ok: (src, t) => t.dataset.igdrop === 'give' && !src.dataset.trit,
      onStart: () => T.X.tipHide && T.X.tipHide(),
      onDrop: (src) => add(src.dataset.ig),
      tap: (src) => {
        if (src.dataset.trit) { if (pt !== 'mouse') tip(src); return; }   // выложенное — показать карточку
        if (s.wait) return;
        if (s.me.items.length >= (s.max || 6) && !s.me.items.some((x) => !x.wearable && x.id === (itemOf(src) || {}).id)) { toast(`не больше ${s.max || 6} вещей`, true); return; }
        if (pt !== 'mouse' && T.X.tipHide) T.X.tipHide();
        add(src.dataset.ig);
      },
    });
  }
  function offDrag() { if (T.drag) { T.drag.off(); T.drag = null; } if (T.lgi) { try { T.lgi.destroy(); } catch (e) {} T.lgi = null; } }
  /* 25.10: новая сумка (новинка inv2 — флаг i2 у героя): «Твоя сумка» в окне обмена — библиотека инвентаря, режим 'pick':
     нажатие или перетаскивание в «Ты отдаёшь» — та же add(uid); правило «не больше N вещей» — то же */
  const inv2 = (h) => !!(h && h.i2 && window.LGInventory);
  function tradePick(s, it) {
    if (s.wait || !it) return;
    if (s.me.items.length >= (s.max || 6) && !s.me.items.some((x) => !x.wearable && x.id === it.id)) { toast(`не больше ${s.max || 6} вещей`, true); return; }
    if (T.X.tipHide) T.X.tipHide();
    add(it.uid);
  }
  function mount2(W, h, bag, s) {
    const el = W.querySelector('[data-trinv]'); if (!el) return;
    T.lgi = window.LGInventory.mount(el, { variant: 'full', mode: 'pick', data: { hero: h, items: bag },
      actions: { pick: (it) => tradePick(s, it), drop: (it) => tradePick(s, it) },
      options: { header: false, vitals: false, detail: false, doll: false, art: (x) => T.X.art(x), storeKey: 'lgInv2Tr', dragRoot: W, dropSel: '[data-igdrop="give"]',
        can: () => (s.wait ? 'Игра проводит обмен' : true), labels: { empty: 'В сумке пусто.' },
        cardTip: T.X.cardTip ? (c, it) => T.X.cardTip(c, it, T.X.hero(), { cls: true }) : null, tipHide: T.X.tipHide ? () => T.X.tipHide() : null } });
  }

  /* ---------- жизнь вместе с «Городом» ---------- */
  function mount(X, host) { T.X = X; if (T.host !== host) { reset(); T.host = host; } }
  function reset() {
    closeMenu(); offDrag(); clearInterval(T.tick); T.tick = 0; clearTimeout(T.later); clearTimeout(T.coinT);
    if (T.win) T.win.remove(); if (T.inv) T.inv.remove();
    Object.assign(T, { win: null, inv: null, tr: null, cdEnd: 0, warn: false, qty: null });
  }
  // герой поменялся (пришёл ответ игры) — сумка в окне обмена другая
  function heroChanged() { if (T.win && T.tr && T.tr.s) render(); }
  // 24.10: предложить обмен из меню ника в чате «Города» (то же приглашение, что из меню героя)
  const invite = (l) => op({ op: 'invite', to: String(l || '').toLowerCase() });
  window.LGTrade = { mount, on, menu, closeMenu, reset, heroChanged, invite, state: () => T.tr, open: () => !!(T.tr && T.tr.s) };
})();
