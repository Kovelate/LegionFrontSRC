'use strict';
/* 23.10 (вечер, по просьбе стримера): «Достижения» во вкладке «Персонаж» — ДЕРЕВО из значков-медальонов вместо карточек.
   Каждый раздел — ветка («созвездие»): ступени (бронза → серебро → золото) и цепочки по смыслу (Первая кровь → Гроза округов,
   Первая находка → Все цвета радуги → Легендарный…) — узлы, соединённые линиями. Полученное светится, следующее — приглушено,
   дальше — тусклые силуэты; скрытое — тёмный медальон «?», закрытая система — медальон с матричным шифром.
   Текст — только в подсказке (наведение / фокус) и в панели деталей (ПК — сбоку, телефон — снизу листом).
   Каталог — /api/ach (один на канал, ETag), свой прогресс — hero.ac из /api/me: { g: { id: [ступени] }, p: { id: n }, lk: [системы],
   h: { id: { name, desc, icon } } — открытые скрытые, t — титул, sh — витрина, tl — титулы, n — открыто ступеней, since }.
   Титул и витрина — /api/achPick через act() сайта. Нагрузка: раскладка считается один раз при отрисовке (сетка → координаты),
   линии — один SVG на ветку; без покадровой работы и таймеров; свечение — статичное (box-shadow), шифр — одна CSS-анимация opacity. */
(() => {
  let CAT = null, loading = false, failed = false;
  let sec = null, sel = null, flt = 'all';
  try { flt = localStorage.getItem('lgAcF') || 'all'; sec = localStorage.getItem('lgAcS') || null; } catch {}
  const GLYPH = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ012345789Z:・=*+<>';
  const TIER = ['бронза', 'серебро', 'золото'], TROM = ['I', 'II', 'III'];
  const RAR = { 'О': 'обычное', 'Н': 'необычное', 'Р': 'редкое', 'Э': 'эпическое', 'Л': 'легендарное', F: 'скрытое', Z: 'особое' };
  const RCOL = { 'О': 'common', 'Н': 'uncommon', 'Р': 'rare', 'Э': 'epic', 'Л': 'legendary', F: 'common', Z: 'common' };
  // ветки: ряды узлов («ID» — одиночное, «ID#i» — ступень i), at — с какой колонки ряд, solo — узлы ряда не соединены;
  // e — связи между рядами [откуда, куда]. Чего нет в раскладке (новое в каталоге), — отдельным рядом в конце своего раздела.
  const TREE = {
    hero: { rows: [{ n: ['ГП-01', 'ГП-02#0', 'ГП-02#1', 'ГП-02#2'] }, { n: ['ГП-06', 'ГП-08'] }, { at: 1, n: ['ГП-23'] }, { n: ['ГП-13#0', 'ГП-13#1', 'ГП-13#2'] }, { n: ['ГП-19#0', 'ГП-19#1', 'ГП-19#2'] }, { n: ['ГП-22'] }],
      e: [['ГП-06', 'ГП-23']] },
    gear: { rows: [{ n: ['СЛ-01', 'СЛ-02', 'СЛ-04'] }, { n: ['СЛ-11#0', 'СЛ-11#1', 'СЛ-11#2'] }, { n: ['ЗМ-09', 'ЗМ-08#0', 'ЗМ-08#1', 'ЗМ-08#2'] }, { n: ['ЗМ-01', 'ЗМ-02#0', 'ЗМ-02#1', 'ЗМ-02#2'] }, { at: 1, n: ['ЗМ-04'] }],
      e: [['ЗМ-01', 'ЗМ-04']] },
    fight: { rows: [{ n: ['ПБ-01', 'ПБ-02#0', 'ПБ-02#1', 'ПБ-02#2'] }, { n: ['БО-03', 'ПБ-03#0', 'ПБ-03#1', 'ПБ-03#2'] }, { n: ['БО-14#0', 'БО-14#1', 'БО-14#2'] }, { n: ['БО-16'] }, { n: ['КН-06#0', 'КН-06#1', 'КН-06#2'] }],
      e: [['ПБ-01', 'БО-03'], ['БО-14#0', 'БО-16']] },
    road: { rows: [{ n: ['ПБ-18#0', 'ПБ-18#1', 'ПБ-18#2'] }, { n: ['ЛС-19#0', 'ЛС-19#1', 'ЛС-19#2'] }, { n: ['ПБ-21#0', 'ПБ-21#1', 'ПБ-21#2'] }, { n: ['ПБ-22', 'СП-08'], solo: true }, { n: ['ПБ-23#0', 'ПБ-23#1', 'СП-02'] }, { n: ['ПБ-24', 'ПБ-20', 'ДН-02'], solo: true }],
      e: [['ПБ-21#0', 'ПБ-22'], ['ПБ-21#0', 'СП-08'], ['ПБ-23#0', 'ПБ-24']] },
    fair: { rows: [{ n: ['ЯТ-06#0', 'ЯТ-06#1', 'ЯТ-06#2'] }, { n: ['ЯТ-07', 'ЯТ-16'] }, { n: ['ЯТ-10', 'ХР-05'], solo: true }], e: [['ЯТ-06#0', 'ЯТ-07']] },
    // 26.10 (просьба стримера): «Ремёсла» - компактно, по 4 в ряд (без раскладки каждое достижение шло своим рядом - ~25 рядов);
    // cut - с какого узла ряд не соединён с предыдущим (две цепочки в одном ряду)
    craft: { rows: [{ n: ['РМ-01', 'РМ-02#0', 'РМ-02#1', 'РМ-02#2'] }, { n: ['РМ-05#0', 'РМ-05#1', 'РМ-05#2', 'РМ-30'] }, { n: ['РМ-23#0', 'РМ-23#1', 'РМ-23#2', 'РМ-23#3'] },
      { n: ['РМ-03#0', 'РМ-03#1', 'РМ-03#2', 'РМ-35'] }, { n: ['РМ-28#0', 'РМ-28#1', 'РМ-28#2', 'РМ-29'], cut: [3] }, { n: ['РМ-24#0', 'РМ-24#1', 'РМ-24#2', 'РМ-06'], cut: [3] },
      { n: ['РМ-25#0', 'РМ-25#1', 'РМ-25#2', 'РМ-34'], cut: [3] }, { n: ['РМ-07#0', 'РМ-07#1', 'РМ-07#2', 'РМ-09'], cut: [3] }, { n: ['РМ-26#0', 'РМ-26#1', 'РМ-26#2', 'РМ-10'], cut: [3] },
      { n: ['РМ-08#0', 'РМ-08#1', 'РМ-08#2', 'РМ-32'], cut: [3] }, { n: ['РМ-22#0', 'РМ-22#1', 'РМ-22#2'] }, { n: ['РМ-27#0', 'РМ-27#1', 'РМ-27#2'] },
      { n: ['РМ-04#0', 'РМ-04#1', 'РМ-21#0', 'РМ-21#1'], cut: [2] }, { n: ['РМ-31#0', 'РМ-31#1', 'РМ-33#0', 'РМ-33#1'], cut: [2] }],
      e: [['РМ-22#0', 'РМ-27#0']] },
    soc: { rows: [{ n: ['СР-02#0', 'СР-02#1', 'СР-02#2'] }, { n: ['СР-03#0', 'СР-03#1', 'СР-03#2', 'СР-04'] }, { at: 1, n: ['СР-05'] }], e: [['СР-03#2', 'СР-04'], ['СР-03#0', 'СР-05']] },   // 24.10: и вниз - «Позор Легиона», «Враг Легиона», «Искупление»
  };
  const CW = 72, RH = 80, M = 56;   // шаг колонки и ряда, размер медальона (px)
  function scramble(seed, n) {
    let h = 2166136261; for (const c of String(seed)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
    let s = ''; for (let i = 0; i < n; i++) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; s += (i && i % 7 === 0) ? ' ' : GLYPH[(h >>> 0) % GLYPH.length]; }
    return s;
  }
  function load(X) {
    if (CAT || loading) return;
    loading = true; failed = false;
    X.api('/api/ach').then((r) => { loading = false; if (r && r.ok && Array.isArray(r.list)) CAT = r; else failed = true; X.rerender(); });
  }
  const tiersOf = (d) => (Array.isArray(d.tiers) ? d.tiers.length : 1);
  const byId = () => Object.fromEntries((CAT.list || []).map((d) => [d.id, d]));
  const split = (k) => { const [id, t] = String(k).split('#'); return [id, t == null ? 0 : +t]; };

  // состояние узла: got — получен; next — следующий (предыдущий получен или начало цепочки); far — дальше; hid — скрытое не получено; enc — шифр
  function nodeOf(k, D, ac) {
    const [id, t] = split(k), d = D[id]; if (!d) return null;
    const got = ((ac.g && ac.g[id]) || []).includes(t), lk = new Set(ac.lk || []);
    const H = d.hidden ? (ac.h && ac.h[id]) : null;
    const enc = !!(d.sys && lk.has(d.sys) && !got), hid = !!(d.hidden && !H);
    const steps = d.tiers || (d.need ? [d.need] : null), p = ac.p && ac.p[id] != null ? +ac.p[id] : null;
    return { k, id, t, d, got, enc, hid, H, name: H ? H.name : d.name, desc: H ? H.desc : d.desc, icon: H ? H.icon : d.icon,
      rar: d.rar[Math.min(t, d.rar.length - 1)], coins: (d.coins || [])[t] || 0, goal: steps ? steps[Math.min(t, steps.length - 1)] : null, p,
      tw: tiersOf(d) > 1 ? (d.tn ? d.tn[t] : TIER[t]) : '', at: got && ac.at && ac.at[id] ? ac.at[id][t] : 0 };
  }
  // раскладка ветки: координаты узлов и связи (считается один раз при отрисовке)
  function layout(cat, D) {
    const T = TREE[cat] || { rows: [], e: [] }, pos = {}, edges = [];
    const rows = T.rows.map((r) => ({ ...r, n: r.n.filter((k) => D[split(k)[0]]) })).filter((r) => r.n.length);
    // новое в каталоге, чего нет в раскладке, — рядом в конце
    const placed = new Set(rows.flatMap((r) => r.n.map((k) => split(k)[0])));
    for (const d of CAT.list) if (d.cat === cat && !placed.has(d.id)) rows.push({ n: tiersOf(d) > 1 ? d.tiers.map((_, i) => d.id + '#' + i) : [d.id] });
    let cols = 1;
    rows.forEach((r, y) => r.n.forEach((k, i) => { const x = (r.at || 0) + i; pos[k] = { x, y }; cols = Math.max(cols, x + 1); if (i && !r.solo && !(r.cut && r.cut.includes(i))) edges.push([r.n[i - 1], k]); }));
    for (const [a, b] of T.e || []) if (pos[a] && pos[b]) edges.push([a, b]);
    return { pos, edges, cols, rows: rows.length };
  }
  const cx = (q) => q.x * CW + M / 2 + 4, cy = (q) => q.y * RH + M / 2 + 4;
  function medal(X, nd, state, dim) {
    const cls = `ac-m ${nd.got ? 'got' : state}${nd.enc ? ' enc' : ''}${nd.hid ? ' hid' : ''}${dim ? ' dim' : ''}${sel === nd.k ? ' sel' : ''}`;
    const face = nd.enc ? `<span class="ac-g" aria-hidden="true">${X.esc(scramble(nd.id, 3))}</span>` : nd.hid ? '<span class="ac-q" aria-hidden="true">?</span>' : (window.LGPickArt && window.LGPickArt.ach(nd.id, 34)) ? `<span class="ac-e" aria-hidden="true">${window.LGPickArt.ach(nd.id, 34)}</span>` : `<span class="ac-e" aria-hidden="true">${X.esc(nd.icon || '🏅')}</span>`;   // 26.10: РМ-24…35 - рисунок (pick-art.js)
    const tb = nd.tw && !nd.hid && !nd.enc ? `<span class="ac-tb" aria-hidden="true">${TROM[nd.t] || ''}</span>` : '';
    const label = nd.enc ? 'Зашифровано — откроется позже' : nd.hid ? 'Скрытое достижение' : `${nd.name}${nd.tw ? ' (' + nd.tw + ')' : ''}${nd.got ? ' — открыто' : ''}`;
    const tip = nd.enc ? `<b>${X.esc(scramble(nd.id, 10))}</b>Откроется позже` : nd.hid ? '<b>???</b>Скрытое — откроется, когда случится' : `<b>${X.esc(nd.name)}${nd.tw ? ' · ' + X.esc(nd.tw) : ''}</b>${X.esc(nd.desc || '')}`;
    return `<button type="button" class="${cls}" data-r="${RCOL[nd.rar] || 'common'}" data-ack="${X.esc(nd.k)}" aria-label="${X.esc(label)}" aria-pressed="${sel === nd.k}">${face}${tb}<span class="ac-tip" role="tooltip">${tip}</span></button>`;
  }
  function branch(X, cat, title, D, ac) {
    const L = layout(cat, D), W = L.cols * CW, Hh = L.rows * RH;
    const nodes = {}; for (const k of Object.keys(L.pos)) nodes[k] = nodeOf(k, D, ac);
    // «следующий» — начало цепочки или предыдущий в цепочке получен
    const prev = {}; for (const [a, b] of L.edges) (prev[b] || (prev[b] = [])).push(a);
    const state = (k) => (nodes[k].got ? 'got' : !prev[k] || prev[k].some((a) => nodes[a] && nodes[a].got) ? 'next' : 'far');
    const pass = (k) => { const n = nodes[k]; if (flt === 'got') return n.got; if (flt === 'prog') return !n.got && !n.enc && !n.hid && (n.p > 0 || state(k) === 'next' && (prev[k] || []).length > 0); return true; };
    const lines = L.edges.map(([a, b]) => { const A = L.pos[a], B = L.pos[b], lit = nodes[a].got && nodes[b].got, half = nodes[a].got && !nodes[b].got;
      return `<line class="ac-l${lit ? ' lit' : half ? ' half' : ''}" data-e="${X.esc(a)}>${X.esc(b)}" x1="${cx(A)}" y1="${cy(A)}" x2="${cx(B)}" y2="${cy(B)}"/>`; }).join('');
    const items = Object.entries(L.pos).map(([k, q]) => `<div class="ac-n" style="left:${q.x * CW + 4}px;top:${q.y * RH + 4}px">${medal(X, nodes[k], state(k), !pass(k))}</div>`).join('');
    const got = Object.values(nodes).filter((n) => n.got).length, all = Object.keys(nodes).length;
    return `<section class="ac-br${sec === cat ? ' on' : ''}" data-acsec="${X.esc(cat)}" aria-label="${X.esc(title)}">
      <header class="ac-bh"><h3>${X.esc(title)}</h3><span class="muted">${got} / ${all}</span></header>
      <div class="ac-sc"><div class="ac-tree" style="width:${W + 8}px;height:${Hh + 8}px"><svg class="ac-svg" width="${W + 8}" height="${Hh + 8}" aria-hidden="true">${lines}</svg>${items}</div></div></section>`;
  }
  function detail(X, ac) {
    if (!sel || !CAT) return '<p class="ac-dh muted">Выбери значок — здесь условие, прогресс и награда.</p>';
    const D = byId(), nd = nodeOf(sel, D, ac); if (!nd) return '';
    const close = '<button type="button" class="ac-x" data-acclose aria-label="Закрыть">×</button>';
    if (nd.enc) return `${close}<div class="ac-dt"><span class="ac-m enc big" aria-hidden="true"><span class="ac-g">${X.esc(scramble(nd.id, 3))}</span></span><div><h4 class="ac-enc-t">${X.esc(scramble(nd.id, 14))}</h4><p>Откроется позже · ${X.esc((CAT.sys && CAT.sys[nd.d.sys]) || 'новая система')}</p></div></div>`;
    if (nd.hid) return `${close}<div class="ac-dt"><span class="ac-m hid big" aria-hidden="true"><span class="ac-q">?</span></span><div><h4>???</h4><p>Скрытое достижение — откроется, когда случится. Название и условие узнаешь, когда получишь.</p></div></div>`;
    const steps = nd.d.tiers || (nd.d.need ? [nd.d.need] : null);
    const prog = steps && nd.p != null && !nd.got ? `<div class="ac-pr"><div class="bar"><i style="width:${Math.max(0, Math.min(100, nd.p / nd.goal * 100)).toFixed(1)}%"></i></div><span>${nd.p} / ${nd.goal}${nd.d.unit ? ' ' + X.esc(nd.d.unit) : ''}</span></div>` : '';
    const tiers = nd.tw ? `<ol class="ac-ts">${nd.d.tiers.map((t, i) => `<li class="${((ac.g && ac.g[nd.id]) || []).includes(i) ? 'on' : ''}${i === nd.t ? ' cur' : ''}" data-r="${RCOL[nd.d.rar[i]] || 'common'}">${X.esc(nd.d.tn ? nd.d.tn[i] : TIER[i])} · ${t}</li>`).join('')}</ol>` : '';
    const shown = (ac.sh || []).includes(nd.id);
    return `${close}<div class="ac-dt"><span class="ac-m big ${nd.got ? 'got' : 'next'}" data-r="${RCOL[nd.rar] || 'common'}" aria-hidden="true"><span class="ac-e">${X.esc(nd.icon || '🏅')}</span></span>
      <div><h4>${X.esc(nd.name)}${nd.tw ? ` <em>${X.esc(nd.tw)}</em>` : ''}</h4><p class="ac-r" data-r="${RCOL[nd.rar] || 'common'}">${RAR[nd.rar] || ''}</p></div></div>
      <p>${X.esc(nd.desc || '')}</p>${tiers}${prog}
      <dl class="ac-dl"><div><dt>Награда</dt><dd>${nd.coins > 0 ? `+${nd.coins} бронзы` : 'без монет'}</dd></div><div><dt>Получено</dt><dd>${nd.got ? (nd.at ? new Date(nd.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'да') : 'ещё нет'}</dd></div></dl>
      ${nd.got ? `<button type="button" class="btn sm ghost" data-acpin="${X.esc(nd.id)}" aria-pressed="${shown}">${shown ? 'Убрать из витрины' : 'В витрину (до 3)'}</button>` : ''}`;
  }
  function html(h, X) {
    const ac = h.ac; if (!ac) return '<p class="empty">Достижения пока закрыты</p>';
    load(X);
    if (!CAT) return `<p class="empty">${failed ? 'Не удалось загрузить достижения — обнови страницу чуть позже.' : 'Открываю достижения…'}</p>`;
    const D = byId(), list = CAT.list || [], total = list.reduce((a, d) => a + tiersOf(d), 0);
    const cats = (CAT.cats || []).filter(([k]) => list.some((d) => d.cat === k));
    if (!sec || !cats.some(([k]) => k === sec)) sec = cats[0] ? cats[0][0] : null;
    if (sel && !nodeOf(sel, D, ac)) sel = null;
    let coins = 0; for (const [id, ts] of Object.entries(ac.g || {})) for (const t of ts) coins += ((D[id] && D[id].coins) || [])[t] || 0;
    const per = cats.map(([k, title]) => { const ds = list.filter((d) => d.cat === k), all = ds.reduce((a, d) => a + tiersOf(d), 0), got = ds.reduce((a, d) => a + ((ac.g && ac.g[d.id]) || []).length, 0); return [k, title, got, all]; });
    const sh = (ac.sh || []).map((id) => D[id]).filter(Boolean), tl = ac.tl || [];
    const icon = (d) => (d.hidden ? ((ac.h && ac.h[d.id]) || {}).icon || '?' : d.icon), nm = (d) => (d.hidden ? ((ac.h && ac.h[d.id]) || {}).name || '???' : d.name);
    return `<div class="ac2 f-${flt}">
      <header class="ac-sum">
        <div class="ac-tot"><b>${ac.n || 0}</b><span>из ${total} открыто</span><em>+${coins} бронзы</em></div>
        <div class="ac-secs" role="tablist" aria-label="Разделы">${per.map(([k, title, got, all]) => `<button type="button" role="tab" data-acs="${X.esc(k)}" aria-selected="${sec === k}"><span>${X.esc(title)}</span><i class="bar"><i style="width:${all ? (got / all * 100).toFixed(1) : 0}%"></i></i><em>${got}/${all}</em></button>`).join('')}</div>
        <div class="ac-tools">
          <div class="filters" role="group" aria-label="Что показать">${[['all', 'Все'], ['got', 'Открытые'], ['prog', 'В процессе']].map(([k, l]) => `<button type="button" data-acf="${k}" aria-pressed="${flt === k}">${l}</button>`).join('')}</div>
          <div class="ac-sh" aria-label="Витрина">${[0, 1, 2].map((i) => sh[i] ? `<span class="ac-sb" title="${X.esc(nm(sh[i]))}">${X.esc(icon(sh[i]))}</span>` : '<span class="ac-sb empty" aria-hidden="true"></span>').join('')}</div>
          ${tl.length ? `<label class="ac-tt"><span class="muted">Титул</span><select data-actitle><option value="">—</option>${tl.map((t) => `<option${ac.t === t ? ' selected' : ''}>${X.esc(t)}</option>`).join('')}</select></label>` : ''}
        </div>
        <p class="ac-note muted">Счёт — с ${ac.since ? new Date(ac.since).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'открытия'}: прошлое не засчитывается.</p>
      </header>
      <div class="ac-body"><div class="ac-brs">${cats.map(([k, title]) => branch(X, k, title, D, ac)).join('')}</div>
        <aside class="ac-det${sel ? ' open' : ''}" aria-label="Достижение" aria-live="polite">${detail(X, ac)}</aside></div>
    </div>`;
  }
  function bind(el, X, h) {
    const ac = h && h.ac; if (!ac) return;
    const root = el.querySelector('.ac2'); if (!root) return;
    const det = root.querySelector('.ac-det');
    const pick = (k) => {   // выбор узла — без перерисовки всей вкладки: только панель и отметка
      sel = k;
      root.querySelectorAll('[data-ack]').forEach((b) => { const on = b.dataset.ack === k; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on)); });
      det.innerHTML = detail(X, ac); det.classList.toggle('open', !!k); bindDet();
    };
    function bindDet() {
      const c = det.querySelector('[data-acclose]'); if (c) c.onclick = () => pick(null);
      const p = det.querySelector('[data-acpin]'); if (p) p.onclick = () => {
        const id = p.dataset.acpin, cur = (ac.sh || []).slice(), i = cur.indexOf(id);
        if (i >= 0) cur.splice(i, 1); else { if (cur.length >= 3) cur.shift(); cur.push(id); }
        X.act('/api/achPick', { show: cur }, 'Витрина обновлена', p);
      };
    }
    root.querySelectorAll('[data-ack]').forEach((b) => b.onclick = () => pick(sel === b.dataset.ack ? null : b.dataset.ack));
    root.querySelectorAll('[data-acs]').forEach((b) => b.onclick = () => {
      sec = b.dataset.acs; try { localStorage.setItem('lgAcS', sec); } catch {}
      root.querySelectorAll('[data-acs]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      root.querySelectorAll('[data-acsec]').forEach((x) => x.classList.toggle('on', x.dataset.acsec === sec));
      const br = root.querySelector(`[data-acsec="${CSS.escape(sec)}"]`); if (br && window.LGSiteUi.is('(min-width: 900px)')) br.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    root.querySelectorAll('[data-acf]').forEach((b) => b.onclick = () => { flt = b.dataset.acf; try { localStorage.setItem('lgAcF', flt); } catch {} X.rerender(); });
    const s = root.querySelector('[data-actitle]');
    if (s) s.onchange = () => X.act('/api/achPick', { title: s.value || null }, s.value ? `Титул: «${s.value}»` : 'Титул снят');
    root.onkeydown = (e) => { if (e.key === 'Escape' && sel) pick(null); };
    bindDet();
  }
  // витрина и титул — под именем героя (карточка персонажа)
  function plate(h, X) {
    const ac = h && h.ac; if (!ac) return '';
    const sh = (ac.sh || []).map((id) => { const d = CAT && CAT.list.find((x) => x.id === id); const H = ac.h && ac.h[id]; return d ? { icon: d.hidden ? (H && H.icon) || '?' : d.icon, name: d.hidden ? (H && H.name) || '???' : d.name } : null; }).filter(Boolean);
    if (!CAT && (ac.sh || []).length) load(X);
    return `${ac.t ? `<div class="ac-ttl">«${X.esc(ac.t)}»</div>` : ''}${sh.length ? `<div class="ac-pl" aria-label="Витрина достижений">${sh.map((x) => `<span title="${X.esc(x.name)}">${X.esc(x.icon)}</span>`).join('')}</div>` : ''}`;
  }
  window.LGAch = { html, bind, plate, scramble, TREE, layout: (cat) => (CAT ? layout(cat, byId()) : null), select: (k) => { sel = k; }, reset: () => { CAT = null; sel = null; } };
})();
