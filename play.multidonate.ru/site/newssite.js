'use strict';
/* 18.10: правка новостей прямо на сайте — только администратору игры (зрителям этот файл не грузится вовсе: его подгружает news.js,
   когда сервер прислал флаг admin). Редактор — общий с пультом (/platform/newsedit.js, window.NewsEdit); права проверяет сервер.
   На вкладке «Новости»: кнопка «+» (новый пост), черновики сверху ленты, у каждой записи «Изменить / Снять / Удалить». */
window.LGNewsSite = (feed) => {
  const N = window.NewsEdit, esc = N.esc;
  let all = [], byId = new Map();
  let bin = [], inTrash = false;   // 19.10: «Удалённые» (30 дней) и показаны ли они вместо ленты
  const toast = (t, bad) => window.LGSiteUi.toast(t, bad, { ms: bad ? 5000 : 3200 });   // 25.10: packages/site-ui (один таймер на #toast)
  const PLUS = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const BIN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 10.5v6M14 10.5v6"/></svg>';

  async function refresh() {
    const [j, t] = await Promise.all([N.call('/admin/api/news'), N.trash()]);
    bin = t.ok ? t.list || [] : bin;
    if (!j.ok) { all = []; byId = new Map(); return false; }
    all = j.list || []; byId = new Map(all.map((x) => [x.id, x]));
    return true;
  }
  // после правки: свой список и ленту зрителей — заново (лента у сервера уже сброшена)
  async function changed() { await refresh(); await feed.reload(); }

  /* ---------- окно редактора (на телефоне — во весь экран) ---------- */
  let modal = null;
  function openEditor(x, from) {
    if (modal) return;
    const wrap = document.createElement('div');
    wrap.className = 'nwm';
    wrap.innerHTML = `<div class="nwm-scrim" data-close-scrim></div>
      <div class="nwm-box" role="dialog" aria-modal="true">
        <p class="nwm-cap">Новости игры · публикация видна на сайтах всех каналов</p>
        <button type="button" class="nwm-x" data-x aria-label="Закрыть редактор"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <div class="nwm-body" data-ed></div></div>`;
    document.body.appendChild(wrap);
    document.documentElement.classList.add('nwm-open');
    const box = wrap.querySelector('.nwm-box');
    let dirtyAny = false;
    const ed = N.editor(wrap.querySelector('[data-ed]'), x ? byId.get(x.id) || null : null, {
      titleTag: 'h2', closeLabel: 'Закрыть', say: toast,
      onChange: (p) => { dirtyAny = true; byId.set(p.id, p); },
      onClose: () => close(),
    });
    box.setAttribute('aria-labelledby', ed.headId);
    function close() {
      wrap.remove(); modal = null;
      document.documentElement.classList.remove('nwm-open');
      document.removeEventListener('keydown', key, true);
      if (from && from.isConnected) from.focus();
      // лента перерисуется — фокус на «+», если прежней кнопки больше нет
      if (dirtyAny) changed().then(() => { if (!from || !from.isConnected) { const b = document.querySelector('.nw-plus'); if (b) b.focus(); } });
    }
    // Esc и крестик — с защитой несохранённого (первый раз — «Выйти без сохранения?»); фокус не уходит из окна
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); ed.close(); return; }
      if (e.key !== 'Tab') return;
      const f = [...box.querySelectorAll('button:not([disabled]), input, textarea, summary, a[href]')].filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    document.addEventListener('keydown', key, true);
    wrap.querySelector('[data-x]').onclick = () => ed.close();
    wrap.querySelector('[data-close-scrim]').onclick = () => ed.close();
    modal = { ed };
    ed.focus();
  }

  /* ---------- в ленте ---------- */
  const plus = () => `<div class="nw-hb"><button type="button" class="btn ghost nw-binb" data-bin aria-pressed="${inTrash}" aria-label="Удалённые: ${bin.length}" title="Удалённые записи (30 дней)">${BIN}<span>Удалённые</span><b class="nw-binn">${bin.length}</b></button>`
    + '<button type="button" class="btn primary nw-plus" aria-label="Новый пост" title="Новый пост">' + PLUS + '<span>Новый пост</span></button></div>';
  // «Удалённые» вместо ленты: зрители их не видят; «Вернуть» — как была, «Удалить навсегда» — в два нажатия
  const trashBody = () => `<div class="nw-trash" role="region" aria-label="Удалённые записи">
      <p class="muted nw-trash-h">Удалённые записи видишь только ты. Через 30 дней запись удаляется сама — вместе с лайками и комментариями. <button type="button" class="nw-link" data-bin-back>К ленте</button></p>
      ${bin.length ? `<div class="nw-list">${bin.map((x) => `<article class="nw-post nw-draft nw-del" data-id="${esc(x.id)}" aria-labelledby="nw-t-${esc(x.id)}">
        <div class="nw-meta">${N.TAGS[x.tag] ? `<span class="nw-tag" data-tag="${esc(x.tag)}">${N.TAGS[x.tag]}</span>` : ''}<span class="nw-draft-l">Удалено</span><span>${esc(N.day(x.deletedAt))} · ${esc(N.left(x.purgeAt))}</span></div>
        <h2 class="nw-t" id="nw-t-${esc(x.id)}">${esc(x.title)}</h2>
        <p class="muted nw-del-i">${x.published ? `Была опубликована ${esc(N.day(x.publishedAt))} · нравится ${x.likes ?? 0} · комментарии ${x.comments ?? 0}` : 'Черновик'}</p>
        ${admBar('<button type="button" class="nw-act" data-na="restore">Вернуть</button>', '<button type="button" class="nw-act is-del" data-na="purge">Удалить навсегда</button>', 'Удалённая запись (видишь только ты)')}
      </article>`).join('')}</div>` : '<p class="empty">Здесь пусто. Удалённые записи лежат тут 30 дней — их можно вернуть.</p>'}</div>`;
  const drafts = () => all.filter((x) => !x.published).map((x) => ({ id: x.id, title: x.title, tag: x.tag, html: x.html, publishedAt: x.publishedAt }));
  // 20.10: инструменты админа — отдельной компактной панелью с подписью «Админ», чтобы не путались с «Нравится» и «Комментарии» зрителей;
  // «Удалить» — красным и отдельно от остальных
  const SHIELD = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l7 2.6v5.2c0 4.3-2.9 7.7-7 9.2-4.1-1.5-7-4.9-7-9.2V6.1z"/><path d="M9 12l2 2 4-4"/></svg>';
  const admBar = (inner, del, label) => `<div class="nw-adm" role="group" aria-label="${label}"><span class="nw-adm-l">${SHIELD}Админ</span>
      <span class="nw-adm-b">${inner}</span><span class="nw-adm-d">${del}</span></div>`;
  const tools = (x, draft) => admBar(`<button type="button" class="nw-act" data-na="edit">Изменить</button>
      ${draft ? '<button type="button" class="nw-act" data-na="pub">Опубликовать</button>' : '<button type="button" class="nw-act" data-na="unpub">Снять</button>'}
      ${draft ? '' : `<button type="button" class="nw-act" data-na="com" data-on="${x.c === false ? '1' : ''}">${x.c === false ? 'Открыть комментарии' : 'Закрыть комментарии'}</button>`}`,
    '<button type="button" class="nw-act is-del" data-na="del">Удалить</button>', 'Инструменты админа (видишь только ты)');
  function bind(box) {
    const p = box.querySelector('.nw-plus'); if (p) p.onclick = () => openEditor(null, p);
    const show = (on) => { inTrash = on; feed.render(); const f = document.querySelector(on ? '[data-bin-back]' : '[data-bin]'); if (f) f.focus(); if (on) refresh().then(() => { if (inTrash) feed.render(); }); };
    const bb = box.querySelector('[data-bin]'); if (bb) bb.onclick = () => show(!inTrash);
    const back = box.querySelector('[data-bin-back]'); if (back) back.onclick = () => show(false);
    box.querySelectorAll('.nw-adm').forEach((g) => {
      const id = g.closest('.nw-post').dataset.id;
      const b = (k) => g.querySelector(`[data-na="${k}"]`);
      const busy = async (fn) => { g.querySelectorAll('button').forEach((x) => { x.disabled = true; }); try { if (await fn()) await changed(); } finally { g.querySelectorAll('button').forEach((x) => { x.disabled = false; }); } };
      if (b('restore')) {
        b('restore').onclick = () => busy(() => N.restore(id, toast));
        N.confirmBtn(b('purge'), 'Навсегда? Не вернуть', () => busy(() => N.purge(id, toast)));
        return;
      }
      b('edit').onclick = async () => { if (!byId.has(id)) await refresh(); if (byId.has(id)) openEditor({ id }, b('edit')); else toast('Запись не найдена — обнови страницу', true); };
      if (b('pub')) N.confirmBtn(b('pub'), 'Точно опубликовать?', () => busy(() => N.setPub(id, true, toast)));
      if (b('unpub')) N.confirmBtn(b('unpub'), 'Снять с сайтов?', () => busy(() => N.setPub(id, false, toast)));
      if (b('com')) b('com').onclick = () => busy(async () => { const on = !!b('com').dataset.on; const j = await N.call('/admin/api/news/comments/switch', { id, on }); if (!j.ok) { toast(j.text, true); return false; } toast(on ? 'Комментарии открыты' : 'Комментарии закрыты — новые писать нельзя'); return true; });
      N.confirmBtn(b('del'), 'В «Удалённые»?', () => busy(() => N.del(id, toast)));
    });
  }
  return { refresh, drafts, tools, plus, bind, trashBody, inTrash: () => inTrash };
};
