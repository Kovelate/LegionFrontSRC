'use strict';
/* 20.10: «Навыки» во вкладке «Персонаж» — деревья классов: ветки с узлами, подсказка «что даст», «Вложить очко», «Сбросить».
   Деревья — /api/skills (одни на всех, ETag), свой герой — hero.sk из /api/me: { md, c, m: { класс: [ур., опыт в ур., нужно] }, t: { класс: { узел: ранг } }, rp, lv }.
   Действия — /api/skill { cls, node } и /api/skillReset { cls } через act() сайта (очередь → комната, как «надеть»).
   Без анимаций и таймеров: перерисовка — только по клику или по новым данным героя. */
(() => {
  let TREE = null, loading = false, failed = false;
  let cls = null, br = null, sel = null, confirmReset = false;
  try { cls = localStorage.getItem('lgSkCls') || null; } catch {}
  const STEPS = [0, 5, 10, 20, 30];
  // значки веток — простые SVG одной толщины (как IC в app.js); неизвестная ветка (новый класс) — ромб
  const BI = {
    blade: '<path d="M19.5 4.5 20 4l-.5 4.5L9.5 18.5l-4-4zM7.5 16.5l-3 3M4 15l5 5"/>',
    shield: '<path d="M12 3.5l7 2.8v5.1c0 4.6-3 7.8-7 9.6-4-1.8-7-5-7-9.6V6.3z"/>',
    veteran: '<path d="M8 3h8l-1.5 6h-5zM12 9v3"/><circle cx="12" cy="16.5" r="4.2"/><path d="M12 14.6l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>',
    aim: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
    hunt: '<path d="M5 19 19 5M15 5h4v4M5 15l4 4M7 13l4 4"/><path d="M6 6c5-2 10 3 12 12"/>',
    shade: '<path d="M4 10.5c3-1.5 5.5-1.5 8 0s5 1.5 8 0M4 14.5c3-1.5 5.5-1.5 8 0s5 1.5 8 0M7 6.5c2-1 3.5-1 5 0s3 1 5 0"/>',
    fire: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.6 3-5.8 3.6-9.5 2 1.5 3 3.4 3.2 5.3 1-1 1.6-2.4 1.6-3.8 2.7 2.2 4.6 5 4.6 8 0 3.4-2.5 6-6 6z"/>',
    frost: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
    lore: '<path d="M5 4.5h10.5a2 2 0 0 1 2 2V19.5H7a2 2 0 0 1-2-2zM5 17.5a2 2 0 0 1 2-2h10.5M9 8.5h5M9 11.5h4"/>',
    mercy: '<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>',
    faith: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    wrath: '<path d="M13.5 2.5 5.5 13.5h6l-1.5 8 8-11h-6z"/>',
    // 20.10: ветки новых классов (Разбойник, Некромант, Паладин)
    blades: '<path d="M14.5 3.5 16 5l-7.5 9-2-2zM6.5 12l-2.5 2.5 2 2 2.5-2.5M5 15.5l-1.5 1.5 3 3L8 18.5"/><path d="M15 13.5l5 5"/>',
    venom: '<path d="M9.5 3.5h5M10.5 3.5v5L6 17a2.6 2.6 0 0 0 2.3 3.5h7.4A2.6 2.6 0 0 0 18 17l-4.5-8.5v-5M8 14.5h8"/>',
    shadow: '<path d="M15.5 4.5A8 8 0 1 0 19.5 16 6.5 6.5 0 0 1 15.5 4.5z"/>',
    bones: '<path d="M12 3.5a7.5 7.5 0 0 0-4.5 13.5v3h9v-3A7.5 7.5 0 0 0 12 3.5z"/><circle cx="9.3" cy="11.5" r="1.6"/><circle cx="14.7" cy="11.5" r="1.6"/>',
    life: '<path d="M12 3.5s-6 6.6-6 10.6a6 6 0 0 0 12 0c0-4-6-10.6-6-10.6z"/>',
    dark: '<path d="M9 21h6M10 21V11h4v10M12 11V8"/><path d="M12 8c-1.6-1.2-1.6-3 0-4.5 1.6 1.5 1.6 3.3 0 4.5z"/>',
    light: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    grace: '<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>',
    bulwark: '<path d="M12 3.5l7 2.8v5.1c0 4.6-3 7.8-7 9.6-4-1.8-7-5-7-9.6V6.3z"/><path d="M12 7v10M8 11h8"/>',
  };
  const DIAM = '<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z"/>';
  const LOCK = '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>';
  const svg = (p, cls2 = '') => `<svg class="i ${cls2}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const num = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
  // подсказка узла на ранге r (как skills/index.js → text): {ключ} — итог; {critX}, {cleaveBoss}, {penBoss} — особые
  // 20.10: XON — герою открыты новые характеристики (h.xs): крит от ×1,5, «бронебойные» и «стойкость к яду» идут в «Пробивание» и «Сопротивление»
  let XON = false, SK0 = {};   // SK0 — навыки героя текущей отрисовки (открыто ли умение — в карточке узла)
  // 25.10: доля узла в характеристике (FROM_FX), подписи и сила крита основы (×1,5) - из legionary/stats.js через данные игры (packages/game-data)
  const XSD = () => window.LGGameData.xstats;
  const xnote = () => ({ pierce: [XSD().fromFx.pierce, XSD().label.pierce, '%'], resist: [XSD().fromFx.resist, XSD().label.resist, ''] });
  const xCrit = () => 1 + XSD().base.critDmg / 100;
  // значение {ключа} подсказки на ранге R
  function kv(fx, R, k) {
    if (k === 'critX') return num((XON ? xCrit() : 2) + (fx.critDmg || 0) * R / 100);
    if (k === 'cleaveBoss') return num((fx.cleave || 0) * R * 0.4);
    if (k === 'penBoss') return num((fx.pierce || 0) * R / 20);
    return fx[k] != null ? num(fx[k] * R) : '';
  }
  // 25.10: «по рангам» — как растёт первое число подсказки (1,2 → 2,4 → … ), чтобы видеть, что даст каждый ранг
  function rankLine(n) {
    if (!(n.max > 1)) return '';
    const m = /\{(\w+)\}/.exec(n.text || ''); if (!m) return '';
    return Array.from({ length: n.max }, (_, i) => kv(n.fx || {}, i + 1, m[1])).join(' → ');
  }
  // 25.10: умение, к которому относится узел («натиск» сильнее, «град» чаще, оглушение…): что оно делает и какое слово писать в чат
  const relAct = (c, n) => { if (n.kind === 'act') return null; for (const k of Object.keys(n.fx || {})) { const m = /^(?:a|cd|ctl)_([a-z]+)$/.exec(k); if (m) return (c.actions || []).find((a) => a.id === m[1]) || null; } return null; };
  function txt(n, r) {
    const fx = n.fx || {}, R = Math.max(0, r);
    const XNOTE = XON ? xnote() : {}, note = Object.keys(XNOTE).filter((k) => fx[k]).map((k) => ` · характеристика «${XNOTE[k][1]}» +${num(fx[k] * R * XNOTE[k][0])}${XNOTE[k][2]}`).join('');
    return String(n.text || '').replace(/\{(\w+)\}/g, (_, k) => kv(fx, R, k)).replace(XON ? /×2 → ×/ : /$^/, () => `×${num(xCrit())} → ×`) + note;
  }
  // 20.10: врождённое класса (крит и хрупкость разбойника) — первой строкой в списке умений
  const innateLi = (c, X) => (c.innate ? `<li class="ska on"><span class="ska-w">класс</span><div><b>${X.esc(c.innate)}</b> <span class="ska-t">всегда, пока в руках оружие класса</span></div></li>` : '');
  function load(X) {
    if (TREE || loading) return;
    loading = true; failed = false;
    X.api('/api/skills').then((r) => { loading = false; if (r && r.ok && Array.isArray(r.classes)) TREE = r; else failed = true; X.rerender(); });
  }
  // состояние дерева героя для класса c
  function st(sk, c) {
    const t = (sk.t && sk.t[c.id]) || {}, m = (sk.m && sk.m[c.id]) || [1, 0, null];
    const pts = sk.md === 'hero' ? Math.max(1, +sk.lv || 1) : Math.max(1, +m[0] || 1);
    const inB = {}; let spent = 0;
    for (const B of c.branches) { inB[B.id] = 0; for (const n of B.nodes) { const r = +t[n.id] || 0; inB[B.id] += r; spent += r; } }
    return { t, m, pts, spent, free: Math.max(0, pts - spent), inB, over: spent > pts };
  }
  // можно ли вложить в узел: '' — можно, иначе — почему нельзя
  function why(c, S, B, n, X) {
    const r = +S.t[n.id] || 0;
    if (r >= n.max) return 'Максимальный ранг';
    if (S.inB[B.id] < n.req) return `Откроется, когда в ветку «${B.name}» вложено ${n.req} ${X.plural(n.req, 'очко', 'очка', 'очков')} (сейчас ${S.inB[B.id]})`;
    if (n.pre && !(+S.t[n.pre] > 0)) { const p = B.nodes.find((x) => x.id === n.pre); return `Сначала — «${p ? p.name : n.pre}»`; }
    if (S.free <= 0) return 'Свободных очков нет';
    return '';
  }
  const KIND = { act: 'умение', ctl: 'контроль', cap: 'вершина' };
  const unlockText = (a, c, X) => (a.unlock && a.unlock.mastery ? `с ${a.unlock.mastery} уровня мастерства` : a.unlock && a.unlock.node ? `навык «${((c.branches.flatMap((b) => b.nodes).find((n) => n.id === a.unlock.node)) || {}).name || a.unlock.node}»` : '');
  function actOpen(a, c, S, sk) {
    if (a.unlock && a.unlock.mastery) return (sk.md === 'hero' ? +sk.lv || 1 : +S.m[0] || 1) >= a.unlock.mastery;
    if (a.unlock && a.unlock.node) return (+S.t[a.unlock.node] || 0) > 0;
    return false;
  }

  function html(h, X, o) {
    XON = !!(h && h.xs);
    const sk = h.sk; SK0 = sk || {};
    const TREE_MODE = !!(o && o.tree);   // зал Тренера в «Городе» — своя разметка (treeHtml), вкладка «Персонаж» — как была
    if (!sk) return `<section class="panel sk"><p class="empty">Навыки появятся, как только игра стримера пришлёт данные героя.</p></section>`;
    if (!TREE) { load(X); return `<section class="panel sk"><p class="empty">${failed ? 'Деревья навыков не загрузились — обнови страницу.' : 'Загружаем деревья навыков…'}</p></section>`; }
    const list = (TREE.classes || []).filter((x) => !x.beta || sk.cb || x.id === sk.c);   // 20.10: новые классы — только тем, кому открыты (пока — тестерам)
    if (!list.length) return `<section class="panel sk"><p class="empty">Деревьев навыков пока нет.</p></section>`;
    if (!cls || !list.some((c) => c.id === cls)) cls = list.some((c) => c.id === sk.c) ? sk.c : list[0].id;
    const c = list.find((x) => x.id === cls), S = st(sk, c), name = (id, fb) => X.roleOf(id, fb);
    if (!br || !c.branches.some((b) => b.id === br)) br = c.branches[0].id;
    const node = sel && c.branches.flatMap((b) => b.nodes.map((n) => [b, n])).find(([, n]) => n.id === sel);
    const busy = !!h.busy, ghost = !!h.ghost, off = !!sk.off, mine = sk.c === c.id;
    const ms = S.m, msPct = ms[2] == null ? 100 : Math.max(0, Math.min(100, (+ms[1] || 0) / Math.max(1, +ms[2]) * 100));
    if (TREE_MODE) return treeHtml(h, X, list, c, S, node, busy, ghost, off, mine);
    const tabs = list.map((x) => { const s2 = st(sk, x); return `<button type="button" role="tab" data-skc="${x.id}" aria-selected="${x.id === cls}" aria-pressed="${x.id === cls}"><span class="skc-n">${X.esc(name(x.id, x.name))}</span><span class="skc-m">${sk.md === 'hero' ? 'ур. ' + (sk.lv || 1) : 'мастерство ' + s2.m[0]}${s2.free ? ` · <b>${s2.free}</b> ${X.plural(s2.free, 'очко', 'очка', 'очков')}` : ''}</span>${x.id === sk.c ? '<span class="skc-on">в руках</span>' : ''}</button>`; }).join('');
    const acts = innateLi(c, X) + (c.actions || []).map((a) => { const open = actOpen(a, c, S, sk); return `<li class="ska${open ? ' on' : ''}"><span class="ska-w">${X.esc(a.word)}</span><div><b>${X.esc(a.name)}</b> <span class="ska-t">${a.type === 'second' ? 'второе действие' : 'умение'} · ${open ? (mine ? 'открыто' : 'открыто — когда в руках оружие класса') : 'откроется ' + X.esc(unlockText(a, c, X))}</span><p>${X.esc(a.text)}</p></div></li>`; }).join('');
    const branch = (B) => {
      const tiers = STEPS.map((req) => {
        const ns = B.nodes.filter((n) => n.req === req); if (!ns.length) return '';
        const open = S.inB[B.id] >= req;
        return `<div class="skt${open ? '' : ' shut'}">${req ? `<p class="skt-l">${open ? '' : svg(LOCK)}${open ? `Открыто: ${req} в ветке` : `Откроется при ${req} ${X.plural(req, 'очке', 'очках', 'очках')} в ветке · ещё ${req - S.inB[B.id]}`}</p>` : ''}<div class="skt-n">${ns.map((n) => {
          const r = +S.t[n.id] || 0, w = why(c, S, B, n, X), can = !w && !busy && !ghost && !off;
          return `<button type="button" class="skn${r ? ' has' : ''}${r >= n.max ? ' max' : ''}${can ? ' can' : ''}${!open || (n.pre && !(+S.t[n.pre] > 0)) ? ' lock' : ''}" data-skn="${n.id}" aria-pressed="${sel === n.id}" title="${X.esc(n.name)}: ${X.esc(txt(n, Math.max(1, r)))}"><span class="skn-n">${X.esc(n.name)}</span>${n.kind ? `<span class="skn-k">${KIND[n.kind] || ''}</span>` : ''}<span class="skn-r" aria-label="ранг ${r} из ${n.max}">${Array.from({ length: n.max }, (_, i) => `<i${i < r ? ' class="f"' : ''}></i>`).join('')}</span></button>`;
        }).join('')}</div></div>`;
      }).join('');
      return `<section class="skb${B.id === br ? ' cur' : ''}" data-skb="${B.id}" aria-label="Ветка ${X.esc(B.name)}"><header class="skb-h">${svg(BI[B.id] || DIAM, 'skb-i')}<div><h3>${X.esc(B.name)}</h3><p>${X.esc(B.text || '')}</p></div><b class="skb-p" title="Очков в ветке">${S.inB[B.id]}</b></header>${tiers}</section>`;
    };
    const det = node ? (() => {
      const [B, n] = node, r = +S.t[n.id] || 0, w = why(c, S, B, n, X), can = !w && !busy && !ghost && !off;
      return `<div class="skd-h"><h3>${X.esc(n.name)}</h3><button type="button" class="skd-x" data-skx aria-label="Закрыть">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div>
        <p class="skd-m">${X.esc(B.name)} · ранг <b>${r}</b> из ${n.max}${n.kind ? ' · ' + (KIND[n.kind] || '') : ''}</p>
        ${r ? `<p class="skd-now"><span>Сейчас</span>${X.esc(txt(n, r))}</p>` : ''}
        ${r < n.max ? `<p class="skd-next"><span>${r ? 'Со следующим рангом' : 'Даст'}</span>${X.esc(txt(n, r + 1))}</p>` : ''}
        ${w && r < n.max ? `<p class="skd-why">${X.esc(w)}</p>` : ''}
        ${!mine && can ? `<p class="skd-why soft">Работает, пока в руках оружие класса «${X.esc(name(c.id, c.name))}»</p>` : ''}
        ${r < n.max ? `<button type="button" class="btn primary wide" data-skl="${n.id}"${can ? '' : ' disabled'}>Вложить очко${S.free ? ` · свободно ${S.free}` : ''}</button>` : ''}`;
    })() : `<p class="empty skd-e">Выбери навык — здесь появится, что он даёт сейчас и на следующем ранге.</p>`;
    const rp = +sk.rp || 0, canReset = S.spent > 0 && !busy && !ghost && !off;
    const resetBox = confirmReset && canReset
      ? `<div class="skr-c" role="group" aria-label="Подтверждение сброса"><p>Сбросить дерево «${X.esc(name(c.id, c.name))}»? Вернётся ${S.spent} ${X.plural(S.spent, 'очко', 'очка', 'очков')}. Цена: ${rp ? X.money(rp) : '<b>бесплатно</b>'}.</p><div><button type="button" class="btn sm danger" data-skr="go">Сбросить</button><button type="button" class="btn sm ghost" data-skr="no">Отмена</button></div></div>`
      : `<button type="button" class="btn sm ghost skr-b" data-skr="ask"${canReset ? '' : ' disabled'}>Сбросить дерево · ${rp ? X.money(rp) : 'бесплатно'}</button>`;
    return `<section class="panel sk" aria-label="Навыки">
      <div class="sk-top"><h1 class="h2">Навыки</h1><p class="muted">${sk.md === 'hero' ? 'Очки каждого дерева — по уровню героя.' : 'Очки дерева дают уровни мастерства класса: опыт, полученный с оружием класса в руках.'} Всё дерево не вкачать — выбирай свой билд.</p></div>
      <div class="skc filters" role="tablist" aria-label="Класс">${tabs}</div>
      <div class="sk-sum">
        <div class="meter"><div class="mk"><span>${sk.md === 'hero' ? 'Уровень героя' : 'Мастерство «' + X.esc(name(c.id, c.name)) + '»'}</span><b>${sk.md === 'hero' ? sk.lv || 1 : `${ms[0]} ур.${!(sk.m && sk.m[c.id]) ? '' : ms[2] == null ? ' · максимум' : ` · ${ms[1]} / ${ms[2]}`}`}</b></div>${sk.md === 'hero' ? '' : `<div class="bar xp" role="progressbar" aria-label="Опыт мастерства" aria-valuenow="${Math.round(msPct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${msPct.toFixed(1)}%"></i></div>`}</div>
        <p class="sk-pts"><b>${S.free}</b> ${X.plural(S.free, 'свободное очко', 'свободных очка', 'свободных очков')} · вложено ${S.spent} из ${S.pts}${S.over ? ' · <span class="dn">очков вложено больше, чем есть — сброс бесплатный</span>' : ''}${sk.pend ? ' · <span class="muted">применяется…</span>' : ''}</p>
        ${resetBox}
      </div>
      ${busy ? '<p class="busybar" role="status">Идёт бой на стриме — навыки и сброс после боя</p>' : ghost ? '<p class="busybar" role="status">Призрак не учится — после воскрешения</p>' : off ? '<p class="busybar" role="status">Навыки сейчас выключены</p>' : ''}
      <ul class="ska-l" aria-label="Действия класса — пиши в чат одним словом">${acts}</ul>
      <div class="skbt filters" role="group" aria-label="Ветка">${c.branches.map((B) => `<button type="button" data-skbt="${B.id}" aria-pressed="${B.id === br}">${X.esc(B.name)} · ${S.inB[B.id]}</button>`).join('')}</div>
      <div class="sk-g"><div class="sk-tree">${c.branches.map(branch).join('')}</div><aside class="skd${node ? ' open' : ''}" aria-label="Навык">${det}</aside></div>
      <p class="foot">Слова действий пиши в чат во время хода отряда — одним словом, без «!». Контроль (оглушение, озноб) не складывается: после него цель 2 хода неуязвима к контролю, босса — только ослабляет.</p>
    </section>${node ? '<div class="sk-scrim" data-skx></div>' : ''}`;
  }

  /* ---------- 20.10 → 21.10: режим «дерево» — доска в зале Тренера («Город»). Ветка — колонка со стволом от корня вверх,
     узлы — жетоны со значком по эффекту, ранги — точки, пороги по очкам — засечки на стволе. Подсказка — при наведении/фокусе,
     клик — та же карточка с «Вложить очко» (на телефоне — листом сверху). Координаты по X — в % колонки (колонка тянется
     от 340px телефона до ~480px ПК), линии — SVG с non-scaling-stroke, поэтому толщина не искажается. Данные и действия — те же. ---------- */
  const NI = {   // значки узлов по тому, что даёт навык (24×24, одной толщины)
    sword: '<path d="M19.5 4.5 20 4l-.5 4.5L9.5 18.5l-4-4zM7.5 16.5l-3 3M4 15l5 5"/>',
    shield: '<path d="M12 3.5l7 2.8v5.1c0 4.6-3 7.8-7 9.6-4-1.8-7-5-7-9.6V6.3z"/>',
    bow: '<path d="M6 3c6 3 9 9 6 18M6 3l12 18M14 5h5v5M19 5 9 15"/>',
    spark: '<path d="M12 2.5l1.8 6.2 6.2 1.8-6.2 1.8L12 18.5l-1.8-6.2L4 10.5l6.2-1.8z"/><path d="M19 17l.8 2.2 2.2.8-2.2.8L19 23"/>',
    fire: BI.fire, frost: BI.frost,
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    cross: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>',
    skull: '<path d="M12 3.5a7.5 7.5 0 0 0-4.5 13.5v3h9v-3A7.5 7.5 0 0 0 12 3.5z"/><circle cx="9.3" cy="11.5" r="1.6"/><circle cx="14.7" cy="11.5" r="1.6"/><path d="M10.5 20.5v-2M13.5 20.5v-2"/>',
    star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    bolt: BI.wrath,
    crown: '<path d="M3.5 18.5h17M4.5 18.5 3.5 7l5 4 3.5-6 3.5 6 5-4-1 11.5z"/>',
    wind: '<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h8"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    dagger: BI.blades, vial: BI.venom, sun: BI.light, drop: BI.life,
    coin: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.6-.9-1.5-1.3-2.5-1.3-1.5 0-2.5.8-2.5 1.9 0 2.7 5.2 1.3 5.2 4 0 1.1-1.1 1.9-2.7 1.9-1.1 0-2.1-.5-2.6-1.4M12 6.5v1.7M12 15.8v1.7"/>',
  };
  // замкнутые силуэты — с заливкой в тон (плоский «наклеечный» значок), открытые штрихи (ветер, лук) — только контур
  const SOLID = new Set(['sword', 'shield', 'heart', 'cross', 'star', 'bolt', 'crown', 'fire', 'spark']);
  const FXI = [[/^(melee|dmg|cleave|first|a_natisk|cd_natisk)$/, 'sword'], [/^(def|block|shieldBlock|resist|a_stoyka)$/, 'shield'], [/^(ranged|volley|pierce|a_pricel|a_grad|cd_grad)$/, 'bow'],
    [/^(magic|crit|critDmg|a_vspyshka|cd_vspyshka)$/, 'spark'], [/^(hp|regen|leech|healIn)$/, 'heart'], [/^(healPow|healCrit|a_obereg|cd_obereg|a_siyanie|cd_siyanie)$/, 'cross'],
    [/^(low|lastStand)$/, 'skull'], [/^(dodge|trapDodge)$/, 'wind'], [/^(steady|lead)$/, 'eye'], [/^(a_oznob|cd_oznob)$/, 'frost'],
    // 20.10: новые классы
    [/^(poison|poisonT|a_yad|cd_yad)$/, 'vial'], [/^(steal|loot)$/, 'coin'], [/^(a_vspinu|cd_vspinu)$/, 'dagger'], [/^(skel|skelT|skelN|a_podnyat|cd_podnyat)$/, 'skull'],
    [/^(drain|a_vytyanut|cd_vytyanut)$/, 'drop'], [/^(hex|a_proklyat|cd_proklyat)$/, 'fire'], [/^(holy|a_svet)$/, 'sun'], [/^(aura|a_dlan|cd_dlan|cd_aura)$/, 'cross']];
  function iconOf(n, B) {
    if (n.kind === 'cap') return 'crown'; if (n.kind === 'act') return 'bolt'; if (n.kind === 'ctl') return 'star';
    for (const k of Object.keys(n.fx || {})) for (const [re, ic] of FXI) if (re.test(k)) return ic;
    return '';
  }
  const CLI = { legionary: 'sword', archer: 'bow', mage: 'spark', priest: 'cross', rogue: 'dagger', necromancer: 'skull', paladin: 'sun' };   // значок класса на табличке
  const TH = 140, TOP = 40, BOT = 80, XS = { 1: [50], 2: [28, 72], 3: [18, 50, 82], 4: [14, 38, 62, 86] };
  const BH = TOP + TH * (STEPS.length - 1) + BOT;   // высота доски ветки
  let TIPS = {};   // id узла → карточка-подсказка (собирается при отрисовке, показывается при наведении)
  const nodeIcon = (n, B) => { const k = iconOf(n, B); return k ? `<svg class="i${SOLID.has(k) ? ' so' : ''}" viewBox="0 0 24 24" aria-hidden="true">${NI[k]}</svg>` : svg(BI[B.id] || DIAM); };
  // содержимое карточки узла: что даёт сейчас и на следующем ранге, почему закрыт
  function nodeCard(c, S, B, n, X, can, mine) {
    const r = +S.t[n.id] || 0, w = why(c, S, B, n, X);
    return `<p class="sxt-h"><b>${X.esc(n.name)}</b><span>${X.esc(B.name)} · ранг <b>${r}</b> из ${n.max}${n.kind ? ' · ' + (KIND[n.kind] || '') : ''}</span></p>
      ${r ? `<p class="sxt-s"><span>Сейчас</span>${X.esc(txt(n, r))}</p>` : ''}
      ${r < n.max ? `<p class="sxt-s nx"><span>${r ? 'На следующем ранге' : 'Даст'}</span>${X.esc(txt(n, r + 1))}</p>` : '<p class="sxt-s mx"><span>Максимальный ранг</span>Навык вкачан полностью</p>'}
      ${rankLine(n) ? `<p class="sxt-s rk"><span>По рангам (1-${n.max})</span>${X.esc(rankLine(n))}</p>` : ''}
      ${((a) => (a ? `<p class="sxt-s ac"><span>Умение «${X.esc(a.word)}»${actOpen(a, c, S, SK0) ? '' : ' · откроется ' + X.esc(unlockText(a, c, X))}</span>${X.esc(a.text)}</p>` : ''))(relAct(c, n))}
      ${w && r < n.max ? `<p class="sxt-w">${svg(LOCK)}<span>${X.esc(w)}</span></p>` : ''}
      ${!mine && can ? `<p class="sxt-m">Работает, пока в руках оружие класса «${X.esc(X.roleOf(c.id, c.name))}»</p>` : ''}`;
  }
  function treeHtml(h, X, list, c, S, node, busy, ghost, off, mine) {
    const sk = h.sk, name = (id, fb) => X.roleOf(id, fb), rp = +sk.rp || 0, canReset = S.spent > 0 && !busy && !ghost && !off;
    const plaques = list.map((x) => {
      const s2 = st(sk, x), m = s2.m, pct = !(sk.m && sk.m[x.id]) ? 0 : m[2] == null ? 100 : Math.max(0, Math.min(100, (+m[1] || 0) / Math.max(1, +m[2]) * 100));
      const none = !(sk.m && sk.m[x.id]);   // классом ещё не воевали — данных мастерства нет (это не «максимум»)
      const meta = sk.md === 'hero' ? `уровень героя ${sk.lv || 1}` : `мастерство ${m[0]}${!none && m[2] == null ? ' · максимум' : ''}`;
      const xpT = sk.md === 'hero' || none || m[2] == null ? '' : `, опыт ${m[1]} из ${m[2]}`;   // опыт уровня — в подсказке, на табличке его показывает полоска
      return `<button type="button" role="tab" class="skc-p" data-skc="${x.id}" aria-selected="${x.id === cls}" aria-pressed="${x.id === cls}" title="${X.esc(name(x.id, x.name))}: ${meta}${xpT}" style="--c:${X.esc(x.color || '#ffc94d')}">
        <span class="skc-ic">${svg(NI[CLI[x.id]] || DIAM)}</span><span class="skc-tx"><b>${X.esc(name(x.id, x.name))}</b><small>${meta}</small>${sk.md === 'hero' ? '' : `<span class="skc-bar" aria-hidden="true"><i style="width:${pct.toFixed(1)}%"></i></span>`}</span>
        ${s2.free ? `<span class="skc-f" title="Свободных очков: ${s2.free}"><span class="sr-only">свободных очков: </span>${s2.free}</span>` : ''}${x.id === sk.c ? '<span class="skc-on">в руках</span>' : ''}</button>`;
    }).join('');
    const reset = confirmReset && canReset
      ? `<div class="skr-c skx-rc" role="group" aria-label="Подтверждение сброса"><p>Сбросить дерево? Вернётся ${S.spent} ${X.plural(S.spent, 'очко', 'очка', 'очков')}, цена — ${rp ? X.money(rp) : 'бесплатно'}.</p><div><button type="button" class="skx-btn dn" data-skr="go">Сбросить</button><button type="button" class="skx-btn gh" data-skr="no">Отмена</button></div></div>`
      : `<button type="button" class="skx-btn gh skx-rb" data-skr="ask"${canReset ? '' : ' disabled'} title="${canReset ? 'Вернуть все очки дерева' : 'Нечего сбрасывать'}">Сбросить дерево<small><span class="skx-sep"> · </span>${rp ? X.money(rp) : 'бесплатно'}</small></button>`;
    const acts = innateLi(c, X) + (c.actions || []).map((a) => { const open = actOpen(a, c, S, sk); return `<li class="ska${open ? ' on' : ''}"><span class="ska-w">${X.esc(a.word)}</span><div><p class="ska-h"><b>${X.esc(a.name)}</b> <span class="ska-t">${a.type === 'second' ? 'второе действие' : 'умение'} · ${open ? (mine ? 'открыто' : 'открыто, когда в руках оружие класса') : 'откроется ' + X.esc(unlockText(a, c, X))}</span></p><p>${X.esc(a.text)}</p></div></li>`; }).join('');
    TIPS = {};
    const nb = c.branches.length, color = c.color || '#ffc94d';
    const cols = c.branches.map((B, bi) => {
      const inB = S.inB[B.id], yT = (t) => BH - BOT - t * TH, top = yT(STEPS.length - 1);
      const openT = STEPS.reduce((a, req, t) => (inB >= req ? t : a), 0);
      const root = yT(0) + 40;   // ствол — от нижнего яруса (корень) вверх
      let ln = `<path class="tk-bg" d="M50 ${root} V${top}"/><path class="tk-on" d="M50 ${root} V${yT(openT)}"/>${openT < STEPS.length - 1 ? `<path class="tk-off" d="M50 ${yT(openT)} V${top}"/>` : ''}`;
      let gates = '', btns = '', pop = '';
      STEPS.forEach((req, t) => {
        const ns = B.nodes.filter((n) => n.req === req), xs = XS[ns.length] || ns.map((_, j) => 100 * (j + 1) / (ns.length + 1)), y = yT(t);
        if (req) { const open = inB >= req, gy = y + Math.round((48 + TH) / 2);   // засечка — посередине между подписью яруса и значками следующего
          gates += `<span class="skg${open ? ' on' : ''}" style="top:${gy}px" title="${open ? `Ярус открыт: в ветке ${inB} из ${req}` : `Откроется при ${req} ${X.plural(req, 'очке', 'очках', 'очках')} в ветке «${X.esc(B.name)}» (сейчас ${inB})`}">${open ? '' : svg(LOCK)}<span class="sr-only">${open ? 'открыто с' : 'нужно очков в ветке:'} </span>${req}</span>`; }
        ns.forEach((n, j) => {
          const x = xs[j], r = +S.t[n.id] || 0, w = why(c, S, B, n, X), can = !w && !busy && !ghost && !off;
          const shut = inB < n.req || (n.pre && !(+S.t[n.pre] > 0));
          if (x !== 50) ln += `<path class="tw${r ? ' on' : shut ? '' : ' op'}" d="M50 ${y + 40} Q50 ${y} ${x} ${y}"/>`;
          const P = n.pre && B.nodes.find((q) => q.id === n.pre);
          if (P) { const tp = STEPS.indexOf(P.req), np = B.nodes.filter((q) => q.req === P.req), xp = (XS[np.length] || [])[np.indexOf(P)] ?? 50;
            ln += `<path class="pre${r ? ' on' : +S.t[P.id] > 0 ? ' op' : ''}" d="M${xp} ${yT(tp)} L${x} ${y}"/>`; }
          const side = bi === 0 ? 'r' : bi === nb - 1 ? 'l' : x < 50 ? 'l' : 'r', low = y > BH / 2 ? 1 : 0;
          const stc = (r >= n.max ? ' max' : '') + (r ? ' has' : '') + (can ? ' can' : '') + (shut ? ' lock' : '') + (n.kind ? ' k-' + n.kind : '');
          const st2 = r >= n.max ? 'вкачан полностью' : can ? 'можно вложить очко' : shut ? 'закрыт' : r ? 'вложено' : '';
          TIPS[n.id] = nodeCard(c, S, B, n, X, can, mine) + (can ? '<p class="sxt-k">Нажми, чтобы вложить очко</p>' : '<p class="sxt-k">Нажми — карточка навыка</p>');
          btns += `<button type="button" class="skx${stc}" style="left:${x}%;top:${y}px" data-skn="${n.id}" data-sd="${side}" data-lo="${low}" aria-pressed="${sel === n.id}" aria-label="${X.esc(n.name)}, ранг ${r} из ${n.max}${st2 ? ', ' + st2 : ''}">
            <span class="skx-i">${nodeIcon(n, B)}${shut ? `<span class="skx-l">${svg(LOCK)}</span>` : r >= n.max ? `<span class="skx-l mx">${svg(NI.star)}</span>` : ''}</span>
            <span class="skx-r" aria-hidden="true">${Array.from({ length: n.max }, (_, i) => `<i${i < r ? ' class="on"' : ''}></i>`).join('')}</span><span class="skx-n">${X.esc(n.name)}</span></button>`;
          if (sel === n.id) {
            pop = `<aside class="skd skx-pop open sd-${side}${low ? ' lo' : ''}" style="--x:${x}%;--y:${y}px;--yb:${BH - y}px" aria-label="Навык ${X.esc(n.name)}">
              <button type="button" class="skd-x" data-skx aria-label="Закрыть">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button>${nodeCard(c, S, B, n, X, can, mine)}
              ${r < n.max ? `<button type="button" class="skx-btn go" data-skl="${n.id}"${can ? '' : ' disabled'}>Вложить очко${S.free ? ` · свободно ${S.free}` : ''}</button>` : ''}</aside>`;
          }
        });
      });
      return `<section class="skx-c${B.id === br ? ' cur' : ''}" data-skb="${B.id}" aria-label="Ветка ${X.esc(B.name)}">
        <header class="skx-h">${svg(BI[B.id] || DIAM, 'skb-i')}<div><h3>${X.esc(B.name)}</h3><p>${X.esc(B.text || '')}</p></div><b class="skx-pts" title="Очков в ветке">${inB}</b></header>
        <div class="skx-in" style="height:${BH}px"><svg class="skx-ln" viewBox="0 0 100 ${BH}" preserveAspectRatio="none" aria-hidden="true">${ln}</svg>${gates}${btns}${pop}<div class="skx-tip" role="tooltip" hidden></div></div></section>`;
    }).join('');
    return `<section class="sk skx-s" aria-label="Навыки" style="--c:${X.esc(color)}">
      <h1 class="sr-only">Навыки</h1>
      <div class="skx-top"><div class="skx-cls" role="tablist" aria-label="Класс">${plaques}</div>
        <div class="skx-sum"><p class="skx-free"><b>${S.free}</b><span>${X.plural(S.free, 'свободное очко', 'свободных очка', 'свободных очков')}<small>вложено ${S.spent} из ${S.pts}${sk.pend ? ' · применяется…' : ''}</small></span></p>${reset}</div></div>
      ${S.over ? '<p class="busybar" role="status">Очков вложено больше, чем есть — сброс бесплатный</p>' : ''}
      ${busy ? '<p class="busybar" role="status">Идёт бой на стриме — навыки и сброс после боя</p>' : ghost ? '<p class="busybar" role="status">Призрак не учится — после воскрешения</p>' : off ? '<p class="busybar" role="status">Навыки сейчас выключены</p>' : ''}
      ${acts ? `<ul class="ska-l skx-acts" aria-label="Действия класса — пиши в чат одним словом">${acts}</ul>` : ''}
      <div class="skx-bt" role="group" aria-label="Ветка">${c.branches.map((B) => `<button type="button" data-skbt="${B.id}" aria-pressed="${B.id === br}">${svg(BI[B.id] || DIAM)}${X.esc(B.name)}<b>${S.inB[B.id]}</b></button>`).join('')}</div>
      <div class="skx-g" style="--nb:${nb}">${cols}</div>
    </section>`;
  }
  // подсказка при наведении мышью и при фокусе с клавиатуры: та же карточка, рядом с узлом (на телефоне — тап открывает карточку)
  // после касания браузер шлёт «мышиные» события на то, что оказалось под пальцем, — подсказку не показываем (на телефоне — карточка по тапу)
  let touchAt = 0;
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') touchAt = Date.now(); }, true);
  const canHover = () => (window.matchMedia ? window.LGSiteUi.is('hover') : true);   // 25.10: packages/site-ui; без matchMedia - как было, «мышь есть»
  function tipBind(el) {
    const show = (b, kb) => {
      const id = b.dataset.skn, box = b.parentElement && b.parentElement.querySelector('.skx-tip');
      if (!box || !TIPS[id] || sel === id || (!kb && (!canHover() || Date.now() - touchAt < 1000))) return;
      box.innerHTML = TIPS[id];
      const x = parseFloat(b.style.left), y = parseFloat(b.style.top), side = b.dataset.sd, lo = b.dataset.lo === '1';
      box.className = `skx-tip sd-${side}${lo ? ' lo' : ''}`;
      box.style.cssText = `--x:${x}%;--y:${y}px;--yb:${BH - y}px`;   // место — в CSS: сбоку от узла (доска) или под/над ним (узкая доска)
      box.hidden = false;
    };
    const hide = (b) => { const box = b.parentElement && b.parentElement.querySelector('.skx-tip'); if (box) box.hidden = true; };
    el.querySelectorAll('.skx[data-skn]').forEach((b) => {
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(b); });
      b.addEventListener('pointerleave', () => hide(b));
      b.addEventListener('focus', () => { try { if (b.matches(':focus-visible') && Date.now() - touchAt > 1000) show(b, true); } catch {} });
      b.addEventListener('blur', () => hide(b));
    });
  }

  function bind(el, X) {
    const re = () => X.rerender();
    el.querySelectorAll('[data-skc]').forEach((b) => b.onclick = () => { cls = b.dataset.skc; sel = null; br = null; confirmReset = false; try { localStorage.setItem('lgSkCls', cls); } catch {} re(); });
    el.querySelectorAll('[data-skbt]').forEach((b) => b.onclick = () => { br = b.dataset.skbt; re(); });
    // в зале Тренера повторный клик по тому же узлу закрывает карточку; фокус — на «Вложить очко» (доска) или как раньше (узкий экран)
    el.querySelectorAll('[data-skn]').forEach((b) => b.onclick = () => { const tree = b.classList.contains('skx'); if (tree && sel === b.dataset.skn) { sel = null; re(); const n = el.querySelector(`[data-skn="${b.dataset.skn}"]`); if (n) n.focus(); return; } sel = b.dataset.skn; const B = b.closest('[data-skb]'); if (B) br = B.dataset.skb; re(); const d = el.querySelector('.skd [data-skl]:not([disabled]), .skd [data-skx]'); if (d && (tree || window.LGSiteUi.is('(max-width: 899px)'))) d.focus({ preventScroll: true }); });
    tipBind(el);
    fitPlaques(el);
    el.querySelectorAll('[data-skx]').forEach((b) => b.onclick = () => { const was = sel; sel = null; re(); const n = was && el.querySelector(`[data-skn="${was}"]`); if (n) n.focus(); });
    el.querySelectorAll('[data-skl]').forEach((b) => b.onclick = () => X.act('/api/skill', { cls, node: b.dataset.skl }, 'Очко вложено', b));
    el.querySelectorAll('[data-skr]').forEach((b) => b.onclick = () => {
      const k = b.dataset.skr;
      if (k === 'ask') { confirmReset = true; re(); const g = el.querySelector('[data-skr="no"]'); if (g) g.focus(); return; }
      confirmReset = false;
      if (k === 'go') X.act('/api/skillReset', { cls }, 'Дерево сброшено', b); else re();
    });
    XL = X;
  }
  /* 25.10: названия классов на табличках («Котоармеец», «Горилла-громила», «Колдун-корнеплод») — в одну строку, без разрыва посреди слова:
     шрифт уменьшается под ширину таблички (не меньше FIT_MIN px). Не влезает и так — перенос только по пробелу или дефису;
     слово всё равно шире таблички (очень узкий экран) — тогда уже перенос с дефисом (hyphens). Замер — раз после отрисовки и при смене ширины окна. */
  const FIT_MIN = 11;
  function fitName(b) {
    b.style.fontSize = ''; b.classList.remove('wrap', 'hy');
    const w = b.clientWidth; if (!w || b.scrollWidth <= w) return;
    const base = parseFloat(getComputedStyle(b).fontSize) || 17;
    const shrink = () => { const fs = Math.floor(base * (b.clientWidth / b.scrollWidth) * 10) / 10 - 0.1; b.style.fontSize = Math.max(FIT_MIN, fs) + 'px'; return fs >= FIT_MIN; };
    if (shrink()) return;   // одной строкой, мельче
    b.style.fontSize = ''; b.classList.add('wrap');   // по пробелу / дефису, самое длинное слово — целиком
    if (b.scrollWidth <= b.clientWidth || shrink()) return;
    b.classList.add('hy');   // слово шире таблички даже мелким шрифтом
  }
  function fitPlaques(el) { (el || document).querySelectorAll('.skc-tx b').forEach(fitName); }
  let fitT = 0;
  window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => fitPlaques(document), 150); });
  try { if (document.fonts) { document.fonts.ready.then(() => fitPlaques(document)); document.fonts.addEventListener('loadingdone', () => fitPlaques(document)); } } catch {}   // шрифт табличек (Russo One) догрузился — ширина другая
  // Esc закрывает карточку навыка (один обработчик на страницу)
  let XL = null;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sel && XL && document.querySelector('#tab-hero .sk, .cy-room .sk')) { sel = null; XL.rerender(); } });
  window.LGSkills = { html, bind, reset: () => { TREE = null; }, fit: fitName };
})();
