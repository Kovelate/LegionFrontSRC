'use strict';
/* 18.10: вкладка «Новости» — новости игры от администратора (одна лента для сайтов всех каналов).
   Бережём компьютеры и сеть зрителей: ленту грузим только когда вкладку открыли; для точки «есть новое» —
   один крошечный запрос /api/news/head за загрузку страницы (ответ браузер держит в кэше минуту, повтор — 304).
   Текст новости сервер уже превратил в безопасный HTML (из экранированного текста) — здесь его только вставляем.
   app.js вызывает window.LGNews.open() при открытии вкладки. */
(() => {
  const DEMO = window.LG_DEMO || null, DOCK = !!window.LG_DOCK;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  // 19.10: значок звания у ника автора (награды платформы), как на сайте канала (.awb в style.css)
  const awbN = (aw) => (Array.isArray(aw) ? aw.slice(0, 3).map((a) => `<span class="awb aw-${esc(String(a.t || a.id).replace(/[^a-z0-9-]/gi, ''))}" role="img" title="${esc(a.n)}: ${esc(a.d)}" aria-label="${esc(a.n)}: ${esc(a.d)}">${(a.i || '✦') === '✦' ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0.8 9.7 6.3 15.2 8 9.7 9.7 8 15.2 6.3 9.7 0.8 8 6.3 6.3Z" fill="currentColor"/></svg>' : esc(a.i)}</span>`).join('') : '');
  const TAGS = { update: 'Обновление', balance: 'Баланс', event: 'Событие', fix: 'Исправления' };
  const KEY = 'lgNewsSeen';   // время самой свежей новости, которую зритель уже видел (у каждого браузера своё)
  const seenGet = () => { try { return +localStorage.getItem(KEY) || 0; } catch { return 0; } };
  const seenSet = (t) => { try { if (t > seenGet()) localStorage.setItem(KEY, String(t)); } catch {} };
  // 19.10: сортировка комментариев как на YouTube — «Популярные» (по умолчанию) или «Сначала новые»; выбор помнит браузер зрителя
  const SKEY = 'lgNewsComSort';
  const sortGet = () => { try { return localStorage.getItem(SKEY) === 'new' ? 'new' : 'top'; } catch { return 'top'; } };
  const sortSet = (v) => { try { localStorage.setItem(SKEY, v); } catch {} };
  const get = (p) => (DEMO && DEMO.api ? Promise.resolve(DEMO.api(p)) : fetch(p, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)))
    .catch(() => null);

  const st = { list: null, next: null, loading: false, at: 0, prevSeen: 0, err: false, open: new Set(),
    me: null, liked: new Set(), checked: new Set(), muted: false, com: new Map(), likeBusy: new Set(), replies: null, askedReplies: false };
  const btn = () => $('.tabs button[data-tab="news"]');
  const el = () => $('#tab-news');

  /* ---------- точка «есть новое» на вкладке ---------- */
  function dot(on) {
    const b = btn(); if (!b) return;
    let d = b.querySelector('.nw-dot');
    if (on && !d) { d = document.createElement('i'); d.className = 'nw-dot'; d.innerHTML = '<span class="nw-sr">: есть новое</span>'; b.appendChild(d); }
    if (!on && d) d.remove();
    edge(on);
  }
  // телефон: вкладки прокручиваются, и «Новости» могут быть за краем — тогда точка ещё и у правого края полосы вкладок
  // 30.10 (репорт #2178: «кружочек нового в новостях двоится на телефоне»): «за краем» считалось по offsetLeft - а он от шапки (.top
  // sticky - её offsetParent), не от полосы вкладок: к нему прибавлялось всё, что левее полосы (кнопка друзей, логотип), и вкладку,
  // которую видно целиком, считало скрытой - рядом со своей точкой вставала вторая, у края полосы (над «Картой»). Теперь - по экранным
  // рамкам кнопки и полосы; и пересчёт, когда вкладки появляются или прячутся (Город, Карта мира - hidden), не только при прокрутке
  let edgeOn = false, edgeMo = null;
  const edgeUpd = () => {
    const b = btn(), T = b && b.parentElement; if (!T) return;
    let hid = false;
    if (edgeOn && b.offsetParent) { const r = b.getBoundingClientRect(), t = T.getBoundingClientRect(); hid = r.right - 4 > t.right; }
    T.classList.toggle('nw-edge', hid);
  };
  function edge(on) {
    const T = btn() && btn().parentElement; if (!T) return;
    if (on && !edgeOn) {
      edgeOn = true; T.addEventListener('scroll', edgeUpd, { passive: true }); window.addEventListener('resize', edgeUpd, { passive: true });
      if (window.MutationObserver) { edgeMo = new MutationObserver(edgeUpd); edgeMo.observe(T, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] }); }
    }
    if (!on && edgeOn) { edgeOn = false; T.removeEventListener('scroll', edgeUpd); window.removeEventListener('resize', edgeUpd); if (edgeMo) { edgeMo.disconnect(); edgeMo = null; } }
    edgeUpd();
  }
  function headCheck() {
    if (DOCK) return;
    get('/api/news/head').then((h) => {
      if (!h || !h.ok || !h.last) return;
      if (el() && el().classList.contains('on')) return;   // вкладка уже открыта — новое увидят сами
      dot(h.last > seenGet());
    });
  }

  /* ---------- лента ---------- */
  const DAY = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const dayOf = (t) => { try { const d = new Date(t), n = new Date(), a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), b = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()), k = Math.round((b - a) / 864e5);
    return k === 0 ? 'Сегодня' : k === 1 ? 'Вчера' : DAY.format(d).replace(/\s*г\.$/, '').replace(' ' + n.getFullYear(), ''); } catch { return ''; } };
  // ADM — правка новостей на сайте (newssite.js): только администратору игры, код грузится лишь у него
  let ADM = null, admWant = false;
  // html записи собирает сервер (renderNews): картинки — блоки <figure class="nw-fig">…</figure> без вложенных figure
  function coverOf(html) {
    const m = /<figure class="nw-fig">[\s\S]*?<\/figure>/.exec(html);
    if (!m) return { cover: '', body: html };
    return { cover: m[0].replace('<figure class="nw-fig">', '<figure class="nw-fig nw-cover">'), body: (html.slice(0, m.index) + html.slice(m.index + m[0].length)).replace(/^\s+/, '') };
  }
  function post(x, draft) {
    const tag = TAGS[x.tag] ? `<span class="nw-tag" data-tag="${esc(x.tag)}">${TAGS[x.tag]}</span>` : '';
    const fresh = !draft && st.prevSeen && x.at > st.prevSeen ? '<span class="nw-new">Новое</span>' : '';
    const when = draft ? `<span class="nw-draft-l">${x.publishedAt ? 'Снято с публикации' : 'Черновик'}</span><span>видишь только ты</span>`
      : `<time datetime="${new Date(x.at || 0).toISOString()}">${esc(dayOf(x.at))}</time>${fresh}`;
    // 20.10: первая картинка записи — обложкой вверху поста, текст — после неё (решение стримера)
    const { cover, body } = coverOf(x.html || '');
    return `<article class="nw-post${draft ? ' nw-draft' : ''}${cover ? ' has-cover' : ''}" data-id="${esc(x.id)}" aria-labelledby="nw-t-${esc(x.id)}">
      ${cover}
      <div class="nw-meta">${tag}${when}</div>
      <h2 class="nw-t" id="nw-t-${esc(x.id)}">${esc(x.title)}</h2>
      <div class="nw-body">${body}</div>
      <button type="button" class="nw-more" hidden aria-expanded="false">Читать полностью</button>
      ${draft ? '' : soc(x)}
      ${ADM ? ADM.tools(x, draft) : ''}
    </article>`;
  }
  /* ---------- 18.10: лайки и комментарии ----------
     Счётчики приходят с лентой; что лайкнул сам зритель — один запрос /api/news/my (только вошедшим);
     комментарии — только когда их раскрыли (по 20, «Показать раньше»). Без опроса: обновляются при раскрытии. */
  const post2 = (p, body) => fetch(p, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => null); return j || { ok: false, text: 'Ошибка сервера (' + r.status + ')' }; })
    .catch(() => ({ ok: false, text: 'Нет связи — проверь интернет и повтори' }));
  const HEART = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/></svg>';
  const BUBBLE = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z"/></svg>';
  const login = () => esc(window.LG_LOGIN || '/auth/login');
  const plural = window.LGSiteUi.plural;   // 25.10: packages/site-ui (ui-kit), была своя копия
  const hue = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) % 360; return h; };
  const hm = (t) => { try { const d = new Date(t); return dayOf(t) + ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  // 19.10: th — раскрытые ветки ответов (cid → состояние), rep — на что сейчас отвечаем, rask — у какого комментария показать «Войди»
  const cs = (id) => { let c = st.com.get(id); if (!c) { c = { open: false, list: null, more: null, total: null, loading: false, err: '', draft: '', sending: false, msg: '', ask: false,
    sort: sortGet(), th: new Map(), rep: null, rdraft: '', rsending: false, rmsg: '', rmsgBad: false, rask: null }; st.com.set(id, c); } return c; };
  const thOf = (c, cid) => { let t = c.th.get(cid); if (!t) { t = { open: false, list: null, more: null, loading: false, err: '' }; c.th.set(cid, t); } return t; };
  async function mine(list) {
    if (!st.me || DEMO) return;
    const ids = (list || []).map((x) => x.id).filter((id) => !st.checked.has(id));
    if (!ids.length) return;
    ids.forEach((id) => st.checked.add(id));
    // «Вам ответили» — тем же запросом, один раз за открытие страницы (без опроса)
    const askR = !st.askedReplies; st.askedReplies = true;
    const r = await get('/api/news/my?ids=' + ids.join(',') + (askR ? '&r=1' : ''));
    if (!r || !r.ok) return;
    (r.liked || []).forEach((id) => st.liked.add(String(id)));
    st.muted = !!r.muted;
    if (askR && r.replies && r.replies.n) { st.replies = r.replies; paintNote(); }
    if (st.list) for (const id of ids) paintSoc(id);
  }
  function soc(x) {
    const c = cs(x.id), on = st.liked.has(x.id), n = +x.likes || 0, k = c.total ?? (+x.comments || 0);
    return `<div class="nw-soc" data-soc="${esc(x.id)}">
      <button type="button" class="nw-like" data-like aria-pressed="${on}" aria-label="${on ? 'Убрать отметку «Нравится»' : 'Нравится'}, ${n}">${HEART}<span class="nw-n">${n}</span></button>
      <button type="button" class="nw-cmt" data-cmt aria-expanded="${c.open}" aria-controls="nw-c-${esc(x.id)}">${BUBBLE}<span>Комментарии (${k})</span></button>
      ${c.ask ? `<p class="nw-ask" role="status"><a class="btn twitch sm" href="${login()}">Войти через Twitch</a><span>чтобы отмечать «Нравится» и писать комментарии</span></p>` : ''}
    </div>
    <div class="nw-com" id="nw-c-${esc(x.id)}" data-com="${esc(x.id)}"${c.open ? '' : ' hidden'}>${c.open ? comBody(x, c) : ''}</div>`;
  }
  // 19.10: значок автора (перо) — у имени автора и у ветки, где он ответил
  const AU_ICON = '<svg class="nw-aui" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 10-10-3-3L5 16l-1 4z"/><path d="M13.5 7.5l3 3"/></svg>';
  // один комментарий или ответ (rep — ответ в ветке). Удалённый верхний с ответами — заглушка без автора и текста
  function citem(x, c, m, rep) {
    const me = st.me, off = x.c === false || c.closed;
    const id = esc(m.id), thread = rep ? m.p : m.id;
    if (m.del) return `<li class="nw-ci is-del" data-cid="${id}"><span class="nw-av is-gone" aria-hidden="true"></span>
      <div class="nw-cb"><p class="nw-ct nw-gone">Комментарий удалён</p>${thread_(x, c, m)}</div></li>`;
    const own = me && me.login === m.login, adm = me && me.admin, liked = !!m.ml, n = +m.l || 0;
    const canReply = !off && !(me && st.muted);
    const acts = `<button type="button" class="nw-clike" data-clike aria-pressed="${liked}" aria-label="${liked ? 'Убрать отметку «Нравится»' : 'Нравится'}, ${n}">${HEART}<span class="nw-n">${n || ''}</span></button>`
      + (canReply ? `<button type="button" class="nw-link" data-creply>Ответить</button>` : '')
      + (own || adm ? '<button type="button" class="nw-link is-del" data-cdel>Удалить</button>' : '')
      + (adm && !own ? `<button type="button" class="nw-link is-del" data-cmute="${esc(m.login)}" aria-label="Скрыть все комментарии ${esc(m.name || m.login)} и запретить писать" title="Скрыть все комментарии этого зрителя во всех новостях и запретить ему писать">Скрыть все и запретить</button>` : '');
    const ask = c.rask === m.id ? `<p class="nw-cnone nw-rask" role="status"><a href="${login()}">Войди через Twitch</a>, чтобы отвечать и отмечать «Нравится».</p>` : '';
    const form = c.rep && c.rep.cid === m.id && me && canReply ? rform(x, c) : '';
    // 19.10: комментарий и ответы автора игры (админ платформы) выделены (как на YouTube): имя в плашке со значком, рамка у аватара
    const nm = m.au ? `<b class="nw-au" title="Автор игры">${esc(m.name || m.login)}${AU_ICON}</b>` : `<b>${esc(m.name || m.login)}</b>`;
    return `<li class="nw-ci${rep ? ' is-rep' : ''}${m.au ? ' is-au' : ''}" data-cid="${id}" data-thread="${esc(thread)}"><span class="nw-av" style="--h:${hue(m.login)}" aria-hidden="true">${esc((m.name || m.login).slice(0, 1).toUpperCase())}</span>
      <div class="nw-cb"><p class="nw-ch">${nm}${awbN(m.aw)}${m.au ? '<span class="sr-only">(автор игры)</span>' : ''}<time datetime="${new Date(m.at).toISOString()}">${esc(hm(m.at))}</time></p>
      <p class="nw-ct">${m.to ? `<span class="nw-to">@${esc(m.to)}</span> ` : ''}${esc(m.text)}</p>
      <p class="nw-cact">${acts}</p>${ask}${form}${rep ? '' : thread_(x, c, m)}</div></li>`;
  }
  // «Ответы (N)» под верхним комментарием: свёрнуты, грузятся по раскрытию (по 20)
  function thread_(x, c, m) {
    const n = +m.r || 0; if (!n) return '';
    const t = thOf(c, m.id), tid = esc(m.id);
    const btn = `<button type="button" class="nw-rtog" data-rtog aria-expanded="${t.open}" aria-controls="nw-r-${tid}"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>${t.open ? 'Скрыть ответы' : `Ответы (${n})`}${m.ar ? `<span class="nw-arb" title="В ветке есть ответ автора">${AU_ICON}<span>ответ автора</span></span>` : ''}</button>`;
    if (!t.open) return btn;
    let inner;
    if (!t.list) inner = t.err ? `<p class="nw-cerr" role="alert">${esc(t.err)} <button type="button" class="nw-link" data-rretry>Повторить</button></p>` : '<p class="nw-cnone">Загружаю ответы…</p>';
    else inner = `<ol class="nw-cl nw-rl">${t.list.map((r) => citem(x, c, r, true)).join('')}</ol>`
      + (t.more ? `<button type="button" class="nw-link nw-earlier" data-rmore${t.loading ? ' disabled' : ''}>${t.loading ? 'Загружаю…' : 'Показать ещё ответы'}</button>` : '');
    return `${btn}<div class="nw-thread" id="nw-r-${tid}">${inner}</div>`;
  }
  function rform(x, c) {
    const fid = `nw-rta-${esc(x.id)}`;
    return `<form class="nw-cf nw-rf" data-rform novalidate><label class="nw-rlab" for="${fid}">Ответ${c.rep.to ? ` для <b>@${esc(c.rep.to)}</b>` : ` для <b>${esc(c.rep.name)}</b>`}</label>
      <textarea id="${fid}" data-rta rows="2" maxlength="500" placeholder="Напиши ответ…" aria-describedby="nw-rm-${esc(x.id)}">${esc(c.rdraft)}</textarea>
      <div class="nw-cfr"><span class="nw-cmsg${c.rmsgBad ? ' bad' : ''}" id="nw-rm-${esc(x.id)}" aria-live="polite">${esc(c.rmsg || `${c.rdraft.length}/500`)}</span>
      <span class="nw-rbtns"><button type="button" class="btn ghost sm" data-rcancel>Отмена</button><button type="submit" class="btn primary sm"${c.rsending ? ' disabled' : ''}>${c.rsending ? 'Отправляю…' : 'Ответить'}</button></span></div></form>`;
  }
  function comBody(x, c) {
    if (!c.list) return c.err ? `<p class="nw-cerr" role="alert">${esc(c.err)} <button type="button" class="nw-link" data-cretry>Повторить</button></p>` : '<p class="nw-cnone">Загружаю комментарии…</p>';
    const me = st.me, off = x.c === false || c.closed;
    const items = c.list.map((m) => citem(x, c, m, false)).join('');
    let form;
    if (off) form = '<p class="nw-cnone">Комментарии к этой новости закрыты.</p>';
    else if (!me) form = `<p class="nw-cnone"><a href="${login()}">Войди через Twitch</a>, чтобы написать комментарий.</p>`;
    else if (st.muted) form = '<p class="nw-cnone">Администратор игры запретил тебе комментировать.</p>';
    else form = `<form class="nw-cf" data-cform novalidate><label class="nw-sr" for="nw-cta-${esc(x.id)}">Твой комментарий</label>
      <textarea id="nw-cta-${esc(x.id)}" data-cta rows="2" maxlength="500" placeholder="Напиши комментарий…" aria-describedby="nw-cm-${esc(x.id)}">${esc(c.draft)}</textarea>
      <div class="nw-cfr"><span class="nw-cmsg${c.msgBad ? ' bad' : ''}" id="nw-cm-${esc(x.id)}" aria-live="polite">${esc(c.msg || `${c.draft.length}/500`)}</span>
      <button type="submit" class="btn primary sm"${c.sending ? ' disabled' : ''}>${c.sending ? 'Отправляю…' : 'Отправить'}</button></div></form>`;
    // как на YouTube: переключатель сортировки и поле ввода — сверху, «Показать ещё» — внизу (порядок считает сервер)
    const sw = c.list.length > 1 || c.more ? `<div class="nw-csort" role="group" aria-label="Порядок комментариев">${[['top', 'Популярные'], ['new', 'Сначала новые']]
      .map(([k, t]) => `<button type="button" data-csort="${k}" aria-pressed="${c.sort === k}"${c.sorting ? ' disabled' : ''}>${t}</button>`).join('')}</div>` : '';
    return `${sw}${form}
      ${items ? `<ol class="nw-cl${c.sorting ? ' is-busy' : ''}">${items}</ol>` : (off ? '' : '<p class="nw-cnone">Комментариев пока нет — будь первым.</p>')}
      ${c.more ? `<button type="button" class="nw-link nw-earlier" data-cmore${c.loading ? ' disabled' : ''}>${c.loading ? 'Загружаю…' : 'Показать ещё'}</button>` : ''}`;
  }
  const postOf = (id) => (st.list || []).find((x) => x.id === id);
  // перерисовать только кусок одной записи (не всю ленту — не сбивать ввод и прокрутку)
  function paintSoc(id, focusSel) {
    const box = el(), x = postOf(id); if (!box || !x) return;
    const a = box.querySelector(`.nw-post[data-id="${CSS.escape(id)}"]`); if (!a) return;
    const tmp = document.createElement('div'); tmp.innerHTML = soc(x);
    const o1 = a.querySelector('.nw-soc'), o2 = a.querySelector('.nw-com');
    if (o1) o1.replaceWith(tmp.children[0]); if (o2) o2.replaceWith(tmp.children[0]);
    if (focusSel) { const f = a.querySelector(focusSel); if (f) f.focus(); }
  }
  // older — «Показать ещё»: следующая страница в том же порядке (курсор more от сервера), уже показанные (свой новый, сдвиг от лайков) не повторяем
  async function loadCom(id, older, focusSel) {
    const c = cs(id); if (c.loading) return;
    c.loading = true; c.err = ''; if (older) paintSoc(id);
    const sort = c.sort;
    const r = await get(`/api/news/${encodeURIComponent(id)}/comments?sort=${sort}${older && c.more ? '&cur=' + encodeURIComponent(c.more) : ''}`);
    c.loading = false; c.sorting = false;
    if (sort !== c.sort) return;   // пока грузилось, переключили порядок — придёт свой ответ
    if (!r || !r.ok) { c.err = 'Комментарии не загрузились.'; paintSoc(id); return; }
    if (!older) c.th = new Map();   // свежая страница — ветки заново (свёрнуты)
    let first = null;
    if (older && c.list) { const had = new Set(c.list.map((m) => m.id)), add = (r.list || []).filter((m) => !had.has(m.id)); first = add[0]; c.list = [...c.list, ...add]; }
    else c.list = r.list || [];
    c.more = r.more || null; c.total = r.total; c.closed = r.open === false;
    // после «Показать ещё» фокус — на первом подгруженном (кнопка исчезла, если страниц больше нет)
    paintSoc(id, focusSel || (older ? (first ? `[data-cid="${CSS.escape(first.id)}"] button` : '[data-cmt]') : null));
  }
  function setSort(id, v) {
    const c = cs(id); if (c.sort === v) return;
    c.sort = v; sortSet(v);
    for (const [, cc] of st.com) if (!cc.open) cc.sort = v;   // свёрнутые откроются уже в новом порядке
    c.loading = false; c.sorting = true; c.rep = null; paintSoc(id, `[data-csort="${v}"]`);
    loadCom(id, false, `[data-csort="${v}"]`);
  }
  // ответы ветки: по раскрытию, дальше — «Показать ещё ответы» (after)
  async function loadThread(id, cid, next) {
    const c = cs(id), t = thOf(c, cid); if (t.loading) return;
    t.loading = true; t.err = ''; if (next) paintSoc(id);
    const r = await get(`/api/news/${encodeURIComponent(id)}/comments/${encodeURIComponent(cid)}/replies${next && t.more ? '?after=' + encodeURIComponent(t.more) : ''}`);
    t.loading = false;
    if (!r || !r.ok) { t.err = 'Ответы не загрузились.'; paintSoc(id); return; }
    t.list = next && t.list ? [...t.list, ...(r.list || [])] : r.list || [];
    t.more = r.more || null;
    const top = (c.list || []).find((m) => m.id === cid); if (top) top.r = r.total;
    paintSoc(id, next ? `[data-cid="${CSS.escape(cid)}"] [data-rmore], [data-cid="${CSS.escape(cid)}"] [data-rtog]` : null);
  }
  const findC = (c, cid) => { for (const m of c.list || []) { if (m.id === cid) return { m, top: m }; const t = c.th.get(m.id); const r = t && t.list && t.list.find((q) => q.id === cid); if (r) return { m: r, top: m }; } return null; };
  async function sendReply(id, form) {
    const c = cs(id), ta = form.querySelector('[data-rta]'), text = ta.value.trim(), to = c.rep;
    c.rdraft = ta.value;
    if (!text) { c.rmsg = 'Напиши что-нибудь'; c.rmsgBad = true; paintSoc(id, '[data-rta]'); return; }
    c.rsending = true; c.rmsg = ''; paintSoc(id);
    const r = await post2(`/api/news/${encodeURIComponent(id)}/comments`, { text, reply: to.cid });
    c.rsending = false;
    if (r && r.ok) {
      const nc = r.comment, f = findC(c, nc.p), x = postOf(id);
      c.rdraft = ''; c.rmsg = ''; c.rep = null;
      c.total = (c.total || 0) + 1; if (x) x.comments = c.total;
      if (f) {
        f.top.r = (+f.top.r || 0) + 1; if (nc.au) f.top.ar = true;   // 19.10: ответил автор — значок у ветки сразу
        const t = thOf(c, nc.p); t.open = true;
        if (t.list && !t.more) t.list.push(nc); else if (!t.list) { paintSoc(id); await loadThread(id, nc.p); }
      }
      paintSoc(id, `[data-cid="${CSS.escape(nc.id)}"] [data-creply]`);
      toastN('Ответ опубликован');
      return;
    }
    c.rmsg = (r && r.text) || 'Не отправилось — повтори'; c.rmsgBad = true;
    if (r && r.error === 'muted') { st.muted = true; c.rep = null; }
    if (r && r.error === 'comments_off') { c.closed = true; c.rep = null; }
    if (r && r.error === 'no_comment') { c.rep = null; toastN(c.rmsg, true); loadCom(id); return; }
    paintSoc(id, '[data-rta]');
  }
  // «Нравится» у комментария/ответа: сразу на экране, ответ сервера поправит
  const clBusy = new Set();
  async function clike(id, cid) {
    const c = cs(id);
    if (!st.me) { c.rask = cid; paintSoc(id, `[data-cid="${CSS.escape(cid)}"] .nw-rask a`); return; }
    const f = findC(c, cid); if (!f || clBusy.has(cid)) return;
    const m = f.m, on = !m.ml, sel = `[data-cid="${CSS.escape(cid)}"] [data-clike]`;
    clBusy.add(cid); m.ml = on; m.l = Math.max(0, (+m.l || 0) + (on ? 1 : -1)); paintSoc(id, sel);
    const r = await post2('/api/news/comments/like', { id: cid, on });
    clBusy.delete(cid);
    if (r && r.ok) { m.ml = r.liked; m.l = r.likes; } else { m.ml = !on; m.l = Math.max(0, (+m.l || 0) + (on ? -1 : 1)); toastN((r && r.text) || 'Не получилось', true); }
    paintSoc(id, sel);
  }
  /* ---------- «Вам ответили (N)»: при открытии вкладки, из /api/news/my (без опроса) ---------- */
  function noteHtml() {
    const R = st.replies; if (!R || !R.n) return '';
    const by = new Map(); for (const q of R.list) { const g = by.get(q.post) || { title: q.title, n: 0 }; g.n++; by.set(q.post, g); }
    const posts = [...by].map(([pid, g]) => postOf(pid)
      ? `<button type="button" class="nw-link" data-rgo="${esc(pid)}">«${esc(g.title)}»${by.size > 1 ? ` (${g.n})` : ''}</button>`
      : `<span>«${esc(g.title)}»</span>`).join(', ');
    return `<div class="nw-note" role="status"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z"/></svg>
      <p><b>Вам ответили (${R.n >= 50 ? '50+' : R.n})</b> <span class="muted">в ${by.size > 1 ? 'новостях' : 'новости'}</span> ${posts}</p>
      <button type="button" class="nw-link" data-rseen>Скрыть</button></div>`;
  }
  function paintNote() {
    const box = el(); if (!box) return;
    const old = box.querySelector('.nw-note'); if (old) old.remove();
    const h = box.querySelector('.nw-h'); if (h && st.replies && !(ADM && ADM.inTrash())) h.insertAdjacentHTML('afterend', noteHtml());
  }
  function seenReplies() {
    const R = st.replies; if (!R) return;
    st.replies = null; paintNote();
    post2('/api/news/replies/seen', { upto: R.last });
  }
  // перейти к ответам: раскрыть комментарии записи и ветки, где ответили
  async function goReplies(pid) {
    const R = st.replies; if (!R) return;
    const threads = new Set(R.list.filter((q) => q.post === pid).map((q) => q.thread));
    seenReplies();
    const c = cs(pid); c.open = true;
    await loadCom(pid);
    for (const tid of threads) if ((c.list || []).some((m) => m.id === tid)) { thOf(c, tid).open = true; await loadThread(pid, tid); }
    const a = el() && el().querySelector(`.nw-post[data-id="${CSS.escape(pid)}"] .nw-com`);
    const tgt = a && (a.querySelector('.nw-thread') || a);
    if (tgt) { tgt.scrollIntoView({ block: 'start', behavior: window.LGSiteUi.is('reduced') ? 'auto' : 'smooth' }); const b = tgt.closest('.nw-ci') ? tgt.closest('.nw-ci').querySelector('[data-rtog]') : a.querySelector('[data-cmt]'); if (b) b.focus({ preventScroll: true }); }
  }
  async function like(id) {
    if (!st.me) { const c = cs(id); c.ask = true; paintSoc(id, '.nw-ask a'); return; }
    if (st.likeBusy.has(id)) return;
    const x = postOf(id); if (!x) return;
    const on = !st.liked.has(id);
    // сразу на экране, ответ сервера — поправит
    st.likeBusy.add(id); on ? st.liked.add(id) : st.liked.delete(id); x.likes = Math.max(0, (+x.likes || 0) + (on ? 1 : -1)); paintSoc(id, '[data-like]');
    const r = await post2('/api/news/like', { id, on });
    st.likeBusy.delete(id);
    if (r && r.ok) { x.likes = r.likes; r.liked ? st.liked.add(id) : st.liked.delete(id); }
    else { on ? st.liked.delete(id) : st.liked.add(id); x.likes = Math.max(0, (+x.likes || 0) + (on ? -1 : 1)); toastN((r && r.text) || 'Не получилось', true); }
    paintSoc(id, '[data-like]');
  }
  async function send(id, form) {
    const c = cs(id), ta = form.querySelector('[data-cta]'), text = ta.value.trim();
    c.draft = ta.value;
    if (!text) { c.msg = 'Напиши что-нибудь'; c.msgBad = true; paintSoc(id, '[data-cta]'); return; }
    c.sending = true; c.msg = ''; paintSoc(id);
    const r = await post2(`/api/news/${encodeURIComponent(id)}/comments`, { text });
    c.sending = false;
    if (r && r.ok) { c.draft = ''; c.msg = 'Опубликовано'; c.msgBad = false; (c.list = c.list || []).unshift(r.comment); c.total = (c.total || 0) + 1; const x = postOf(id); if (x) x.comments = c.total; }
    else { c.msg = (r && r.text) || 'Не отправилось — повтори'; c.msgBad = true; if (r && r.error === 'muted') st.muted = true; if (r && r.error === 'comments_off') c.closed = true; }
    paintSoc(id, '[data-cta]');
  }
  function toastN(t, bad) { window.LGSiteUi.toast(t, bad, { ms: 4000 }); }   // 25.10: packages/site-ui (один таймер на #toast)
  // «Удалить» и админское «скрыть все и запретить» — в два нажатия
  const arm = (b, ask) => window.LGSiteUi.confirmTwice(b, { text: ask, mark: 'armed' });   // 25.10: packages/site-ui ([data-armed] - красный, news.css)
  // 20.10: картинка новости крупно — та же, что в ленте (уже в кеше браузера: лишнего не качаем). Закрыть: клик, Esc, «×»
  function zoom(a) {
    const im = a.querySelector('img'); if (!im) return;
    const cap = a.parentElement && a.parentElement.querySelector('figcaption');
    const lb = document.createElement('div');
    lb.className = 'nw-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', im.alt || 'Картинка');
    lb.innerHTML = `<button type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button><img src="${esc(a.getAttribute('href'))}" alt="${esc(im.alt)}">${cap ? `<p>${esc(cap.textContent)}</p>` : ''}`;
    const done = () => { lb.remove(); document.documentElement.classList.remove('nw-lb-open'); document.removeEventListener('keydown', key, true); if (a.isConnected) a.focus(); };
    const key = (e) => { if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); if (e.key === 'Escape') done(); } };
    lb.addEventListener('click', done);
    document.addEventListener('keydown', key, true);
    document.body.appendChild(lb);
    document.documentElement.classList.add('nw-lb-open');
    lb.querySelector('button').focus();
  }
  let socBound = null;
  function bindSoc(box) {
    if (socBound === box) return; socBound = box;
    box.addEventListener('click', async (e) => {
      const z = e.target.closest('a.nw-zoom');
      if (z && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) { e.preventDefault(); zoom(z); return; }
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-rseen]')) { seenReplies(); return; }
      if (t.matches('[data-rgo]')) { goReplies(t.dataset.rgo); return; }
      const a = t.closest('.nw-post'); if (!a) return;
      const ci = t.closest('[data-cid]'), cid = ci && ci.dataset.cid;
      const id = a.dataset.id, c = cs(id);
      if (t.matches('[data-like]')) like(id);
      else if (t.matches('[data-cmt]')) { c.open = !c.open; paintSoc(id, '[data-cmt]'); if (c.open) loadCom(id); }
      else if (t.matches('[data-cmore]')) loadCom(id, true);
      else if (t.matches('[data-csort]')) setSort(id, t.dataset.csort);
      else if (t.matches('[data-cretry]')) loadCom(id);
      else if (t.matches('[data-clike]')) clike(id, cid);
      else if (t.matches('[data-rtog]')) { const th = thOf(c, cid); th.open = !th.open; paintSoc(id, `[data-cid="${CSS.escape(cid)}"] [data-rtog]`); if (th.open && !th.list) loadThread(id, cid); }
      else if (t.matches('[data-rmore]')) loadThread(id, cid, true);
      else if (t.matches('[data-rretry]')) loadThread(id, cid);
      else if (t.matches('[data-creply]')) {
        if (!st.me) { c.rask = c.rask === cid ? null : cid; paintSoc(id, `[data-cid="${CSS.escape(cid)}"] .nw-rask a`); return; }
        const f = findC(c, cid); if (!f) return;
        const isRep = f.m !== f.top;
        if (!c.rep || c.rep.cid !== cid) { c.rep = { cid, to: isRep ? f.m.login : null, name: f.m.name || f.m.login }; c.rmsg = ''; c.rmsgBad = false; }
        paintSoc(id, '[data-rta]');
      } else if (t.matches('[data-rcancel]')) { const back = c.rep && c.rep.cid; c.rep = null; c.rmsg = ''; paintSoc(id, back ? `[data-cid="${CSS.escape(back)}"] [data-creply]` : null); }
      else if (t.matches('[data-cdel]')) {
        if (!arm(t, 'Точно удалить?')) return;
        const r = await post2('/api/news/comments/delete', { id: cid });
        if (!r || !r.ok) { toastN((r && r.text) || 'Не удалилось', true); return; }
        const f = findC(c, cid);
        if (f && f.m !== f.top) {
          // ответ: убрать из ветки; заглушка без ответов исчезает (как на сервере)
          const th = thOf(c, f.top.id); th.list = (th.list || []).filter((q) => q.id !== cid); f.top.r = Math.max(0, (+f.top.r || 1) - 1);
          if (f.top.del && !f.top.r) c.list = c.list.filter((m) => m !== f.top);
        } else if (r.kept && f) { c.list = c.list.map((m) => (m.id === cid ? { id: m.id, at: m.at, del: true, r: m.r } : m)); }
        else c.list = (c.list || []).filter((m) => m.id !== cid);
        if (c.rep && c.rep.cid === cid) c.rep = null;
        c.total = Math.max(0, (c.total || 1) - 1); const x = postOf(id); if (x) x.comments = c.total;
        toastN('Комментарий удалён'); paintSoc(id, '[data-cmt]');
      } else if (t.matches('[data-cmute]')) {
        if (!arm(t, 'Точно скрыть все и запретить?')) return;
        const r = await post2('/admin/api/news/comments/mute', { login: t.dataset.cmute, hide: true, ban: true });
        if (!r || !r.ok) { toastN((r && r.text) || 'Не получилось', true); return; }
        toastN(`Скрыто комментариев: ${r.hidden}. Писать больше не сможет`);
        for (const [pid, cc] of st.com) if (cc.list) { cc.list = null; if (cc.open) loadCom(pid); }
      }
    });
    box.addEventListener('submit', (e) => {
      const r = e.target.closest('[data-rform]'); if (r) { e.preventDefault(); sendReply(r.closest('.nw-post').dataset.id, r); return; }
      const f = e.target.closest('[data-cform]'); if (!f) return; e.preventDefault(); send(f.closest('.nw-post').dataset.id, f);
    });
    box.addEventListener('input', (e) => {
      const ra = e.target.closest('[data-rta]');
      if (ra) { const c = cs(ra.closest('.nw-post').dataset.id); c.rdraft = ra.value; c.rmsg = ''; c.rmsgBad = false; const m = ra.closest('form').querySelector('.nw-cmsg'); if (m) { m.textContent = `${ra.value.length}/500`; m.classList.remove('bad'); } return; }
      const ta = e.target.closest('[data-cta]'); if (!ta) return;
      const c = cs(ta.closest('.nw-post').dataset.id); c.draft = ta.value; c.msg = ''; c.msgBad = false;
      const m = ta.closest('form').querySelector('.nw-cmsg'); if (m) { m.textContent = `${ta.value.length}/500`; m.classList.remove('bad'); }
    });
    // Ctrl+Enter — отправить
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.matches('[data-cta], [data-rta]')) { e.preventDefault(); e.target.form.requestSubmit(); }
      // Esc в ответе — отмена (фокус обратно на «Ответить»)
      if (e.key === 'Escape' && e.target.matches('[data-rta]')) { const b = e.target.form.querySelector('[data-rcancel]'); if (b) b.click(); }
    });
  }
  function render() {
    const box = el(); if (!box) return;
    const list = st.list || [];
    let body;
    const drafts = ADM ? ADM.drafts() : [];
    if (ADM && ADM.inTrash()) body = ADM.trashBody();   // 19.10: «Удалённые» — только админу
    else if (!st.list) body = st.err ? '<p class="empty">Новости пока не загрузились. Загляни чуть позже.</p>' : '<p class="empty">Открываю новости…</p>';
    else if (!list.length && !drafts.length) body = '<p class="empty nw-empty">Новостей пока нет. Здесь администратор игры рассказывает об обновлениях, изменениях баланса, событиях и исправлениях.</p>';
    else body = noteHtml() + `<div class="nw-list">${drafts.map((x) => post(x, true)).join('')}${list.map((x) => post(x)).join('')}</div>`
      + (st.next ? `<div class="nw-pager"><button type="button" class="btn ghost sm nw-next"${st.loading ? ' disabled' : ''}>${st.loading ? 'Загружаю…' : 'Показать ещё'}</button></div>` : '');
    box.innerHTML = `<div class="nw panel"><div class="nw-h"><h1 class="h2">${ADM && ADM.inTrash() ? 'Удалённые новости' : 'Новости игры'}</h1><p class="muted">Обновления, баланс, события и исправления Похода Легиона</p>${ADM ? ADM.plus() : ''}</div>${body}</div>`;
    clamp(box);
    if (ADM) ADM.bind(box);
    bindSoc(box);
    const nx = box.querySelector('.nw-next'); if (nx) { nx.onclick = more; watch(nx); }
  }
  // длинные новости — свёрнуты до «Читать полностью» (лента остаётся обозримой и на телефоне)
  function clamp(box) {
    box.querySelectorAll('.nw-post').forEach((a) => {
      const b = a.querySelector('.nw-body'), m = a.querySelector('.nw-more');
      if (!b || !m) return;
      if (st.open.has(a.dataset.id)) { m.remove(); return; }
      // с картинкой — сворачиваем позже (картинку не режем пополам на первом экране)
      const fig = !!b.querySelector('.nw-fig'); b.classList.toggle('has-fig', fig);
      if (b.scrollHeight > (fig ? 900 : 420)) { a.classList.add('nw-cut'); m.hidden = false; m.onclick = () => { a.classList.remove('nw-cut'); st.open.add(a.dataset.id); m.remove(); }; }
    });
  }
  // «Показать ещё» сам, когда кнопка доехала до экрана (без опроса — только по прокрутке зрителя)
  let io = null;
  function watch(b) {
    if (!('IntersectionObserver' in window)) return;
    if (io) io.disconnect();
    io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) more(); }, { rootMargin: '200px' });
    io.observe(b);
  }
  async function load() {
    if (st.loading) return;
    st.loading = true;
    const r = await get('/api/news');
    st.loading = false;
    if (!r || !r.ok) { st.err = true; if (!st.list) render(); return; }
    st.err = false; st.list = r.list || []; st.next = r.next || null; st.at = Date.now();
    render();
    const top = st.list[0]; if (top) seenSet(top.at);
    mine(st.list);
  }
  async function more() {
    if (st.loading || !st.next) return;
    st.loading = true; render();
    const r = await get('/api/news?before=' + encodeURIComponent(st.next));
    st.loading = false;
    if (r && r.ok) { const ids = new Set(st.list.map((x) => x.id)); const add = (r.list || []).filter((x) => !ids.has(x.id)); st.list.push(...add); st.next = r.next || null; mine(add); }
    render();
  }
  // админ игры вошёл (флаг ставит сервер; права на запись всё равно проверяет он же) — подгружаем правку новостей
  const addCss = (h) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); };
  const addJs = (src) => new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = ok; document.body.appendChild(s); });
  function me(m) {
    const was = st.me && st.me.login;
    st.me = m && m.user ? { login: String(m.user.login || '').toLowerCase(), name: m.user.name, admin: !!m.admin } : null;
    if ((st.me && st.me.login) !== was) { st.liked = new Set(); st.checked = new Set(); st.muted = false; st.replies = null; st.askedReplies = false; for (const [pid, cc] of st.com) if (cc.list) { cc.list = null; cc.rep = null; cc.rask = null; if (cc.open) loadCom(pid); } if (st.list) { mine(st.list); render(); } }
    const want = !!(m && m.user && m.admin) && !DOCK && !DEMO;
    if (!want) { if (ADM) { ADM = null; render(); } admWant = false; return; }
    if (ADM || admWant) return;
    admWant = true;
    addCss('/platform/newsedit.css?v=3'); addCss('/site/newssite.css?v=4');
    addJs('/platform/newsedit.js?v=4').then(() => addJs('/site/newssite.js?v=4')).then(async () => {
      if (!admWant || !window.NewsEdit || !window.LGNewsSite) return;
      ADM = window.LGNewsSite({ reload: () => { st.at = 0; return load(); }, render: () => { if (st.list) render(); } });
      await ADM.refresh();
      if (st.list) render();
    });
  }
  function open() {
    if (!st.list) st.prevSeen = seenGet();
    dot(false);
    if (!st.list) { render(); load(); return; }
    // открыли снова: перепроверим не чаще раза в 5 минут (без изменений сервер ответит 304)
    if (Date.now() - st.at > 300000) { st.prevSeen = seenGet(); load(); }
  }

  window.LGNews = { open, me, rerender: () => { if (st.list) render(); } };
  if (!DOCK && !DEMO) {
    const go = () => setTimeout(headCheck, 1500);   // после основного: герой и человечки важнее
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
})();
