'use strict';
/* 18.10: описания вещей на сайте — что это и для кого (desc) и короткая история (lore, у редких и выше — под «Историей»).
   Отдельным файлом, чтобы не трогать app.js больше двух строк. Тексты не едут в каждом герое (/api/me, live):
   их берём один раз за визит из /api/lore — только когда зритель навёл на вещь или открыл её карточку (повторно — 304 по ETag).
   Нет /api/lore (старый сервер, демо) — показываем desc/lore, если они пришли в самой вещи. */
(() => {
  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  const RICH = { rare: 1, epic: 1, legendary: 1 };
  let DATA = null, wait = null, open = false;   // open — «История» раскрыта (помним до конца визита: открыл одну — читает и другие)
  function load() {
    if (DATA || wait || window.LG_DEMO) return;
    wait = fetch('/api/lore').then((r) => (r.ok ? r.json() : null)).then((j) => { DATA = (j && j.ok && j.items) || {}; }).catch(() => { DATA = {}; })
      .then(() => { wait = null; fill(); });
  }
  const pick = (it) => { const x = DATA && DATA[it.id]; return x ? [x[0] || '', x[1] || ''] : [it.desc || '', it.lore || '']; };
  function inner(it, full) {
    const [d, l] = pick(it);
    let h = d ? `<p class="lg-desc">${esc(d)}</p>` : '';
    if (full && l) h += RICH[it.rarity] ? `<details class="lg-hist"${open ? ' open' : ''}><summary>История</summary><p class="lg-lore">${esc(l)}</p></details>` : `<p class="lg-lore">${esc(l)}</p>`;
    return h;
  }
  // full: карточка вещи (описание + история); иначе подсказка при наведении (только описание)
  function html(it, full) {
    try {
      if (!it || !it.id) return '';
      if (!DATA) load();
      return `<div class="lg-lorebox" data-lore="${esc(it.id)}" data-r="${esc(it.rarity || 'common')}"${full ? ' data-full="1"' : ''}${it.desc ? ` data-d="${esc(it.desc)}"` : ''}${full && it.lore ? ` data-l="${esc(it.lore)}"` : ''}>${inner(it, full)}</div>`;
    } catch (e) { return ''; }
  }
  // тексты пришли — дописываем их в уже открытые подсказку и карточку
  function fill() {
    document.querySelectorAll('.lg-lorebox[data-lore]').forEach((el) => {
      try { el.innerHTML = inner({ id: el.dataset.lore, rarity: el.dataset.r, desc: el.dataset.d || '', lore: el.dataset.l || '' }, el.dataset.full === '1'); } catch (e) {}
    });
    window.dispatchEvent(new Event('lg-lore'));
  }
  document.addEventListener('toggle', (e) => { if (e.target && e.target.classList && e.target.classList.contains('lg-hist')) open = e.target.open; }, true);
  const css = document.createElement('style'); css.id = 'lg-lore-css';
  css.textContent = `
.lg-lorebox:empty { display: none; }
.lg-desc { margin: var(--s3, 12px) 0 0; font-size: var(--t-sm, 14px); line-height: 1.5; color: var(--ink, inherit); }
.tip .lg-desc { margin-top: var(--s2, 8px); font-size: 13px; line-height: 1.45; max-width: 300px; color: var(--mute, inherit); }
.lg-lore { margin: var(--s2, 8px) 0 0; font-size: var(--t-sm, 14px); line-height: 1.5; font-style: italic; color: var(--mute, inherit); }
.lg-hist { margin-top: var(--s2, 8px); }
.lg-hist > summary { cursor: pointer; width: max-content; font-size: var(--t-sm, 14px); font-weight: 600; color: var(--mute, inherit); list-style: none; }
.lg-hist > summary::-webkit-details-marker { display: none; }
.lg-hist > summary::before { content: '▸'; display: inline-block; margin-right: 6px; transition: transform .15s; }
.lg-hist[open] > summary::before { transform: rotate(90deg); }
.lg-hist > summary:hover, .lg-hist > summary:focus-visible { color: var(--ink, inherit); }
.lg-hist .lg-lore { padding-left: 14px; border-left: 2px solid color-mix(in srgb, var(--mute, #888) 40%, transparent); }
@media (prefers-reduced-motion: reduce) { .lg-hist > summary::before { transition: none; } }`;
  document.head.appendChild(css);
  window.LG_LORE = { html };
})();
