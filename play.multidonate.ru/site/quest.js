// 22.10: вкладка «Поход» и плашка похода над вкладками (docs/QUEST-TAB.md). Пока — только тестерам (флаг qt у героя).
// Команды — в чате; 23.10: голос «Куда идём?» и за проход данжа — ещё и кликом (X.vote, правила те же). Данные — вид похода для этого зрителя (src/site/questlive.ts), событие «q» живого канала.
// Задержка: стрим у зрителя отстаёт, поэтому события (удары, итоги, таймеры) показываем с задержкой стрима (dl с сервера + своя
// подстройка зрителя, хранится в браузере). Своё — «принято», свой голос, «опоздал» — сразу: это уже видно в чате.
// Схема отряда в бою — те же места, что у оверлея (battlecrowd.js: строй по классам, окружение), все полупрозрачно, свой герой — ярко.
(function () {
  let X = null;   // что нужно от сайта (app.js → QX)
  const RAW = [];   // полученные виды по порядку (для задержки)
  let NEW = null, CUR = null, shown = false, timer = 0, keyBar = '', keyTab = '', lateSeen = new Set(), myImg = null, myImgKey = '';
  const memoD = new Map(); let memoH = null;
  let PV = null;   // 23.10: голос, отправленный кликом: { vid, n, t }   // рисунок своего героя по настроению — один раз на облик
  const ADJ = 'lgQDelay';
  let adj = 0; try { adj = Math.max(-10, Math.min(30, +localStorage.getItem(ADJ) || 0)); } catch (e) { adj = 0; }
  const esc = (s) => (X ? X.esc(s) : String(s ?? ''));
  const now = () => (X ? X.now() : Date.now());
  // 28.10 (стример: «слово ПРИГНИСЬ на вкладке появляется, когда на оверлее время уже вышло»): задержка стрима нужна зрителю - он видит
  // эфир с опозданием. Сам стример видит оверлей вживую: на его канале задержки нет (только своя подстройка)
  const isOwner = () => { try { const me = X && X.login ? X.login() : '', ch = String((window.LG_CH && window.LG_CH.login) || '').toLowerCase(); return !!me && me === ch; } catch (e) { return false; } };
  const delayS = (q) => Math.max(0, (isOwner() ? 0 : ((q && q.dl) || 0)) + adj);
  const sec = (until, q) => Math.max(0, Math.ceil(((+until || 0) + delayS(q) * 1000 - now()) / 1000));
  const plural = window.LGSiteUi.plural;   // 25.10: packages/site-ui (ui-kit), была своя копия
  const SKN = () => (window.QBattleCrowd && window.QBattleCrowd.SK) || {};
  const ZONE_COL = ['#c9a36a', '#d07a5a', '#6f9fd8', '#79c98f'];   // щиты, ближний бой, стрелки и маги, жрецы
  const SIDE_RU = { L: 'левое крыло', R: 'правое крыло', F: 'дальнее крыло' }, SIDE_CMD = { L: 'лево', R: 'право', F: 'вдали' };
  // 25.10: обычная команда класса (удар / выстрел / магия / лечить) - из данных игры (packages/game-data), как в комнате (quest/siteact.js)
  const GD = window.LGGameData, BASE_CMD = Object.fromEntries([...GD.classIds(), 'recruit'].map((r) => [r, GD.baseCmd(r)]));
  const KIND_RU = { battle: 'Бой', trap: 'Ловушка', treasure: 'Сокровищница', lair: 'Логово', rest: 'Привал', shop: 'Лавка', event: 'Событие', map: 'Карта', travel: 'В пути', town: 'Город', gather: 'Сбор отряда', boss: 'Босс', dungeon: 'Данж', bossgen: 'Главный враг', puzzle: 'Головоломка' };   // 22.10: генерированный босс округа
  const ico = (k) => ({
    sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', check: '<path d="M20 6L9 17l-5-5"/>', warn: '<path d="M12 3l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    right: '<path d="M9 6l6 6-6 6"/>', map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>', trap: '<path d="M4 20h16"/><path d="M6 20l3-8 3 5 3-9 3 12"/>',
    isle: '<path d="M3 17c3-2 6-2 9 0s6 2 9 0"/><path d="M8 13c0-3 2-6 4-6s4 3 4 6z"/>', gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/><path d="M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/>',
  }[k] || '');
  const svgI = (k, cls) => `<svg class="qi ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ico(k)}</svg>`;

  /* ---------- данные и задержка ---------- */
  function data(q) {
    if (!q) return;
    if (!q.on) { RAW.length = 0; NEW = q; CUR = q; lates(q); paint(); return; }
    q._rx = now(); NEW = q; RAW.push(q); if (RAW.length > 80) RAW.splice(0, RAW.length - 80);
    lates(q);
    tick();
    if (!timer) timer = setInterval(tick, 250);
  }
  // показываем вид, «дошедший» до стрима зрителя: время снимка + задержка ≤ сейчас; открыли страницу посреди похода — сразу первый
  function tick() {
    if (!NEW) return;
    const t = now(); let pick = null;
    for (const q of RAW) if ((q.at || q._rx) + delayS(q) * 1000 <= t) pick = q;
    if (pick) { const i = RAW.indexOf(pick); if (i > 0) RAW.splice(0, i); CUR = pick; }
    else if (!CUR || !CUR.on) CUR = RAW[0] || NEW;
    paint();
    clocks();
  }
  // своё — сразу (из самого нового вида): «принято», свой голос, остров, куда прыгнул
  function view() {
    const c = CUR, n = NEW; if (!c || !c.on || !n || !n.on) return c;
    const v = { ...c };
    if (c.b && n.b && c.b.id === n.b.id) {
      v.b = { ...c.b };
      if (n.b.round === c.b.round) { v.b.turn = n.b.turn; v.b.tg = n.b.tg; }   // 25.10: и цель хода (кнопки)
      if (c.b.tele && n.b.tele && c.b.tele.word === n.b.tele.word) v.b.tele = { ...c.b.tele, ok: n.b.tele.ok };
    }
    if (c.tr && n.tr && c.tr.name === n.tr.name && !c.tr.res) v.tr = { ...c.tr, acted: n.tr.acted, ...(c.tr.rd2 && n.tr.rd2 ? { rd2: { ...c.tr.rd2, left: n.tr.rd2.left, my: n.tr.rd2.my } } : {}) };   // 27.10: свои попытки и голос - сразу
    if (c.bg && n.bg && c.bg.round === n.bg.round) v.bg = { ...c.bg, acted: n.bg.acted };   // 25.10: свой ход в бою с боссом - сразу
    if (c.lair && c.lair.is && n.lair && n.lair.is) {
      const is = { ...c.lair.is };
      if (c.lair.is.pick && n.lair.is.pick) is.pick = { ...c.lair.is.pick, my: n.lair.is.pick.my };
      if (c.lair.is.at && n.lair.is.at) is.at = { ...c.lair.is.at, my: n.lair.is.at.my };
      v.lair = { ...c.lair, is };
    }
    if (c.vote && n.vote && c.vote.id === n.vote.id) v.vote = { ...c.vote, my: n.vote.my };
    if (c.dgn && n.dgn && c.dgn.vote && n.dgn.vote && c.dgn.vote.id === n.dgn.vote.id) v.dgn = { ...c.dgn, vote: { ...c.dgn.vote, my: n.dgn.vote.my } };
    if (c.loot && n.loot && c.loot.name === n.loot.name) v.loot = { ...c.loot, my: n.loot.my };
    if (c.pz && n && n.pz && n.pz.id === c.pz.id && n.pz.st === c.pz.st) v.pz = { ...c.pz, my: n.pz.my };   // 28.10 (map-puzzles): свой ответ - сразу (итог - со стримом)
    if (c.ev && c.ev.gob) v.ev = gobView(c.ev, n);   // 28.10: ярмарка гоблинов - своя ставка, ответ и голос сразу, итог - с задержкой стрима
    else if (c.ev && c.ev.hw) v.ev = hwView(c.ev, n);   // 28.10: событие Изнанки - свой ответ сразу, па пляски - по мере показа (с задержкой стрима)
    else if (c.ev && n.ev && c.ev.look === n.ev.look) v.ev = { ...c.ev, my: n.ev.my, used: n.ev.used, said: n.ev.said };   // 25.10: свой выбор в событии — сразу
    // 23.10: свой голос кликом — сразу (пока игра не подтвердила)
    if (PV && Date.now() - PV.t < 15000) for (const k of ['vote', 'dgn']) { const V = k === 'dgn' ? v.dgn && v.dgn.vote : v.vote; if (V && V.id === PV.vid && !V.done && V.my !== PV.n) { if (k === 'dgn') v.dgn = { ...v.dgn, vote: { ...V, my: PV.n } }; else v.vote = { ...V, my: PV.n }; } }
    return v;
  }
  // 28.10 (hw-site-events): свой ответ - из самого нового вида (его уже видно в чате); па пляски - из снимков, что уже пришли: каждое па -
  // когда его показал оверлей + задержка стрима (снимки идут раз в несколько секунд, па - чаще: иначе па выскакивали бы пачкой)
  function hwView(e, n) {
    const o = { ...e }, ne = n && n.ev && n.ev.hw && n.ev.id === e.id ? n.ev : null;
    if (ne) o.my = ne.my;
    if (e.look === 'skeldance' && e.st === 'show') {
      const t = now(), d = delayS(n || e) * 1000; let best = e.sq || [];
      for (let i = RAW.length - 1; i >= 0; i--) { const x = RAW[i].ev; if (x && x.hw && x.id === e.id && x.sq && x.sq.length > best.length) best = x.sq; }
      const sq = best.filter((p, i) => i < (e.sq || []).length || (p[1] && p[1] + d <= t));
      if (sq.length >= (e.sq || []).length) o.sq = sq;
    }
    return o;
  }
  // 28.10: ярмарка гоблинов - голос, ставка и ответ (это уже видно в чате) - из самого нового вида той же игры; итог розыгрыша - из показанного
  function gobView(e, n) {
    const ne = n && n.ev && n.ev.gob && n.ev.id === e.id ? n.ev : null; if (!ne || !ne.me) return e;
    const me = (e.me || ['', 0, '', '', 0, 0, 0]).slice(); me[0] = ne.me[0];
    if (ne.g === e.g) { me[1] = ne.me[1]; me[2] = ne.me[2]; }
    return { ...e, me };
  }
  // «опоздал»: команда пришла, когда окно уже закрылось — сразу сообщение
  function lates(q) {
    for (const x of (q && q.late) || []) {
      const k = x[0] + ':' + x[1]; if (lateSeen.has(k)) continue; lateSeen.add(k);
      if (now() - x[0] > 30000) continue;
      toastLate(x[1], x[2]);
    }
  }
  function toastLate(what, s) {
    const el = document.createElement('div'); el.className = 'q-late'; el.setAttribute('role', 'alert');
    el.innerHTML = `${svgI('warn')}<div><b>Опоздал на ${s} с</b> — ${esc(what)} пришло, когда окно уже закрылось. Похоже, стрим у тебя идёт с большой задержкой: включи в плеере Twitch «Низкую задержку» или обнови страницу стрима.</div><button type="button" aria-label="Закрыть">×</button>`;
    el.querySelector('button').onclick = () => el.remove();
    document.body.appendChild(el); setTimeout(() => el.remove(), 12000);
  }

  /* ---------- 26.10: слово-подсказка без копирования (решение стримера: слова реакций - печатать самому) ----------
     Слово рисуется на <canvas> (в DOM текста нет: ни title, ни alt, ни aria с самим словом), выделить, скопировать, перетащить, «сохранить
     картинку» нельзя (user-select, contextmenu, copy, dragstart). Экранному диктору - общая фраза. В DOM - только номер слова (data-nc).
     Не 100%: распознавание картинки (OCR) и данные вида похода в инструментах разработчика - см. docs/reports/quest-act.md, «Сомнения». */
  const NC = { id: new Map(), w: new Map(), n: 0 };
  function ncWord(word, cls) {
    const w = String(word || '').trim(); if (!w) return '';
    let id = NC.id.get(w); if (!id) { id = 'w' + (++NC.n); NC.id.set(w, id); NC.w.set(id, w); if (NC.id.size > 200) { const k = NC.id.keys().next().value; NC.w.delete(NC.id.get(k)); NC.id.delete(k); } }
    return `<canvas class="q-nc ${cls || ''}" data-nc="${id}" role="img" aria-label="слово с экрана стрима - напечатай его в строке команд" draggable="false" width="10" height="10"></canvas>`;
  }
  // текст с «словами в кавычках» (что писать): кавычки - без копирования, остальное - текстом
  const ncText = (t) => (qaOn() ? String(t || '').split(/«([^»]{1,40})»/).map((x, i) => (i % 2 ? wd(x, 'sm') : esc(x))).join('') : esc(t));
  // тестерам кнопок (строка команд есть) - без копирования; остальным - как было (текстом)
  const wd = (word, cls) => (qaOn() ? ncWord(word, cls) : `<b class="w">${esc(word)}</b>`);
  function ncPaint(root) {
    if (!root) return;
    root.querySelectorAll('canvas[data-nc]').forEach((c) => {
      const w = NC.w.get(c.dataset.nc); if (!w || c.dataset.ncp === c.dataset.nc) return;
      const cs = getComputedStyle(c), px = parseFloat(cs.fontSize) || 20, dpr = Math.min(3, window.devicePixelRatio || 1), font = `800 ${px}px ${cs.fontFamily || 'sans-serif'}`;
      const g = c.getContext('2d'); if (!g) return; g.font = font;
      const tw = Math.ceil(g.measureText(w).width) + Math.round(px * 0.6), th = Math.ceil(px * 1.35);
      c.width = tw * dpr; c.height = th * dpr; c.style.width = tw + 'px'; c.style.height = th + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.font = font; g.textBaseline = 'middle'; g.fillStyle = cs.color || '#fff';
      g.fillText(w, Math.round(px * 0.3), th / 2 + 1);
      c.dataset.ncp = c.dataset.nc;
    });
  }
  // нельзя: контекстное меню («сохранить картинку»), копирование, перетаскивание
  for (const ev of ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart']) document.addEventListener(ev, (e) => { if (e.target && e.target.closest && e.target.closest('.q-nc, .q-ncw')) e.preventDefault(); }, { capture: true });

  /* ---------- общее: кто я в бою ---------- */
  function meIn(b) {
    const l = X.login(), i = b.me, p = i >= 0 ? b.form[i] : null, f = !p && Array.isArray(b.mf) ? b.mf : null;   // 25.10: mf - в строю, но дальше схемы (420)
    const st = b.hp == null ? 'out' : b.hp === 0 ? 'dead' : b.hp < 0 ? 'fled' : i >= 0 || f ? 'on' : 'reserve';
    return { l, p, st, side: p ? p[2] || 'R' : f ? f[1] || 'R' : '', role: p ? p[1] : f ? f[0] : (X.hero() && X.hero().role) || 'recruit' };
  }
  const multi = (b) => !!(b.cr && b.cr.fr && b.cr.fr.length > 1) || b.two;
  function cmdFor(b, m) {
    const base = BASE_CMD[m.role] || 'удар';
    return multi(b) && m.side && base !== 'лечить' ? `${base} ${SIDE_CMD[m.side] || ''}`.trim() : base;
  }
  const skName = (w) => { const S = SKN(); for (const k of Object.keys(S)) if (S[k].name.toLowerCase() === String(w).toLowerCase()) return S[k]; return null; };
  function lastLine(b) {
    const M = b.mine, r = M && M.me; if (!M || !r) return '';
    // 22.10: «Отбили», но к тебе прорвались (★2–★5, ты не написал слово) — как «Отбили… но N прорвались!» на оверлее
    if (M.k === 'tele') return r.dead ? (M.ok ? 'Отбили… но враг прорвался и сразил тебя' : 'Враг сразил тебя') : r.hurt ? (M.ok ? `Отбили… но ${esc(r.by || 'враг')} прорвался к тебе <b class="dn">−${r.hurt}</b>` : `${esc(r.by || 'Враг')} ударил тебя <b class="dn">−${r.hurt}</b>`) : '';
    const sk = r.sk && SKN()[r.sk] ? SKN()[r.sk] : null, parts = [];
    if (r.n) parts.push(`${sk ? `${sk.icon} ${esc(sk.name)}` : r.k === 'ranged' ? 'Выстрел' : r.k === 'magic' ? 'Магия' : 'Удар'}${r.e ? ` → ${esc(r.e)}` : ''} <b class="hit">−${r.d || 0}</b>${r.c ? ' · крит' : ''}${r.m && r.m === r.n ? ' · мимо' : ''}`);
    if (r.heal) parts.push(`${sk ? `${sk.icon} ${esc(sk.name)}` : 'Лечение'} <b class="up">+${r.heal}</b>`);
    if (!r.n && !r.heal && sk) parts.push(`${sk.icon} ${esc(sk.name)}`);
    if (r.healed) parts.push(`тебя подлечили <b class="up">+${r.healed}</b>`);
    if (r.dead) parts.push('<b class="dn">пал</b>');
    return parts.join(' · ');
  }

  // 23.10: лично — надетое с прочностью ≤30%: дойдёт до 0 при гибели — исчезнет навсегда
  const lwHtml = (v, cls) => (v && v.lw && v.lw.length ? `<p class="${cls}">⚠ ${v.lw.map((x) => `${esc(x[0])} — прочность ${+x[1]}%`).join(', ')}: если дойдёт до 0, вещь исчезнет навсегда. Почини у кузнеца</p>` : '');
  /* ---------- плашка поверх вкладок ---------- */
  function bannerHtml(v) {
    if (!v || !v.on) return '';
    const head = (icon, t, right) => `<div class="qb-h">${svgI(icon)}<b>${t}</b>${right ? `<span class="qb-r">${right}</span>` : ''}</div>`;
    if (v.b && !(v.b.gb && v.bg)) {   // 25.10: генерированный босс с видом механики (bg) - плашка босса ниже
      const b = v.b, m = meIn(b), stage = b.st === 'party' ? `ход отряда · <span data-until="${b.until}"></span> с` : b.st === 'tele' ? `ход врага · <span data-until="${b.until}"></span> с` : b.st === 'end' ? 'бой окончен' : 'удары';
      let line = '';
      if (b.tele && m.st === 'on' || b.tele && m.st === 'reserve') line = b.tele.ok ? `${svgI('check', 'ok')} слово принято` : `<b class="urge">Пиши:</b> ${wd(b.tele.word, 'sm')}`;   // 26.10: слово врага - без копирования (тестерам)
      else if (b.st === 'party' && (m.st === 'on' || m.st === 'reserve')) {
        const ready = (b.sk || []).find((x) => !x[1]);
        line = b.turn ? `${svgI('check', 'ok')} ход сделан: ${esc(turnRu(b.turn))}` : ready ? `пиши «${esc(ready[0])}» — готово` : `пиши «${esc(cmdFor(b, m))}»`;
      } else line = lastLine(b) || '';
      const where = m.st === 'on' ? `ты на экране${multi(b) && m.side ? ' · ' + SIDE_RU[m.side] : ''}` : m.st === 'reserve' ? 'ты в бою, но вне кадра стрима' : m.st === 'dead' ? 'твой герой пал' : m.st === 'fled' ? 'ты сбежал из боя' : 'ты не в этом бою';
      return head('sword', `Бой · ${esc(b.title || v.t)} · раунд ${b.round}`, stage) + `<div class="qb-b">${heroThumb()}<div class="qb-m"><div>${where}</div>${hpBar(b.hp)}${line ? `<div class="qb-l">${line}</div>` : ''}</div>${svgI('right', 'go')}</div>`;
    }
    if (v.lair && v.lair.is) {
      const I = v.lair.is, my = (I.at && I.at.my) || (I.pick && I.pick.my) || 0;
      const t = I.pick ? `выбор острова · <span data-until="${I.pick.until}"></span> с` : I.doom ? `какой остров уничтожить · <span data-until="${I.doom.until}"></span> с` : 'острова';
      return head('isle', 'Закхуэль · острова', t) + `<div class="qb-b">${heroThumb()}<div class="qb-m"><div>${my ? `ты на острове ${my}` : I.pick ? '<b class="urge">Пиши номер острова: 1–4</b>' : 'ты не на острове'}</div>${hpBar(v.lair.hp)}</div>${svgI('right', 'go')}</div>`;
    }
    if (v.bg) {   // 25.10: бой с генерированным боссом - механика и что писать
      const g = v.bg, M = g.mech;
      const line = M ? (M.fake ? '<b class="urge">ФИНТ - не пиши!</b>' : M.me ? `<b class="urge">Цель - ты! ${ncText(M.how ? '«' + M.how + '»' : M.tip || '')}</b>` : `<b class="urge">${esc(M.name)}</b>: ${M.how ? `пиши ${qaOn() ? wd(M.how, 'sm') : '«' + esc(M.how) + '»'}` : M.word ? `пиши ${qaOn() ? wd(M.word.toLowerCase(), 'sm') : '«' + esc(M.word.toLowerCase()) + '»'}` : ncText(M.tip)}`)
        : g.st === 'party' ? (g.acted ? `${svgI('check', 'ok')} ход сделан` : 'пиши «удар» / «выстрел» / «магия» / «лечить»') : g.st === 'boss' ? 'босс бьёт' : '';
      return head('sword', `${esc(g.name)} · фаза ${g.ph} из ${g.phs}`, M && M.until ? `<span data-until="${M.until}"></span> с` : `босс ${Math.round(g.hp * 100)}%`) + `<div class="qb-b">${heroThumb()}<div class="qb-m"><div>${g.in ? (g.my > 0 ? 'ты в бою' : 'твой герой пал') : 'ты не в этом бою'}</div>${g.in ? hpBar(g.my) : ''}${line ? `<div class="qb-l">${line}</div>` : ''}</div>${svgI('right', 'go')}</div>`;
    }
    if (v.tr) {
      const T = v.tr, act = T.st === 'act';
      const line = T.res ? trapMine(T) : act && T.gas ? (T.acted ? '<b class="dn">ты написал — вдохнул газ</b>' : '<b class="urge">Не пиши в чат!</b>') : act && T.word ? (T.acted ? `${svgI('check', 'ok')} слово принято` : `<b class="urge">Пиши:</b> ${wd(T.word, 'sm')}`) : act ? (T.acted ? `${svgI('check', 'ok')} принято` : esc(T.how)) : esc(T.intro);
      return head('trap', `${esc(T.icon || '')} ${esc(T.name)}`, act && T.until ? `<span data-until="${T.until}"></span> с` : '') + `<div class="qb-b">${heroThumb()}<div class="qb-m"><div class="qb-l">${line}</div></div>${svgI('right', 'go')}</div>`;
    }
    if (v.pz) { const P = v.pz, done = P.st === 'done', M = pzMy(P);   // 28.10 (map-puzzles): головоломка - что писать сейчас
      const line = done ? esc(P.res ? P.res.text : 'итог') : P.st === 'show' ? '<b class="urge">Смотри на стрим!</b>' : M.ans ? `${svgI('check', 'ok')} твой ответ: ${esc(pzAnsText(P, M.ans))}` : `<b class="urge">${esc(P.how || '')}</b>`;
      const u = P.st === 'show' ? P.showUntil : P.until;
      return head('map', `${esc(P.icon || '')} ${esc(P.name)}`, !done && u ? `<span data-until="${u}"></span> с` : '') + `<div class="qb-b"><div class="qb-m"><div class="qb-l">${line}</div></div>${svgI('right', 'go')}</div>`; }
    if (v.ev && v.ev.gob) { const E = v.ev, me = E.me || [], done = E.st === 'done';   // 28.10: ярмарка гоблинов - что писать сейчас
      const line = done ? esc(E.res ? E.res.text : 'итог') : E.st === 'ask' ? (me[0] ? `${svgI('check', 'ok')} твой голос: ${me[0] === 'yes' ? 'да' : 'нет'}` : '<b class="urge">Пиши «да» или «нет»</b>')
        : E.st === 'bet' ? (me[1] ? `${svgI('check', 'ok')} твоя ставка ${X.money(me[1])}` : `<b class="urge">${esc(E.how || '')}</b>`) : E.st === 'guess' && me[1] ? (me[2] ? `${svgI('check', 'ok')} твой ответ: ${esc(gobAns(E.gk, me[2]))}` : `<b class="urge">${esc(E.how || '')}</b>`) : esc(E.how || (E.rv ? E.rv.text : ''));
      return head('map', `${esc(E.icon || '')} ${esc(E.name)}`, !done && E.until ? `<span data-until="${E.until}"></span> с` : '') + `<div class="qb-b"><div class="qb-m"><div class="qb-l">${line}</div></div>${svgI('right', 'go')}</div>`; }
    if (v.ev && v.ev.hw) { const E = v.ev, done = E.st === 'done' || !!E.res;   // 28.10: событие Изнанки - что писать сейчас
      const line = done ? esc(E.res ? E.res.text : 'итог') : E.my ? `${svgI('check', 'ok')} ${E.look === 'trick' ? `твой голос: ${E.my === 'trick' ? 'гадость' : 'сладость'}` : E.my === 'bad' ? 'твоя цепочка - мимо' : 'принято'}` : `<b class="urge">${esc(E.how || '')}</b>`;
      return head('map', `${esc(E.icon || '')} ${esc(E.name)}`, !done && E.until ? `<span data-until="${E.until}"></span> с` : '') + `<div class="qb-b"><div class="qb-m"><div class="qb-l">${line}</div></div>${svgI('right', 'go')}</div>`; }
    if (v.ev) { const E = v.ev, vote = E.look === 'traveler' && E.st === 'vote';
      const line = E.res && E.st === 'done' ? esc(E.res.text) : vote ? (E.my ? `${svgI('check', 'ok')} твой выбор: ${E.my === 'rob' ? 'обобрать' : 'помочь'}` : '<b class="urge">Пиши «помочь» или «обобрать»</b>') : E.cmds && E.cmds[0] ? `пиши «${esc(E.cmds[0][0])}»` : '';
      return head('map', `${esc(E.icon || '')} ${esc(E.name)}`, vote && E.until ? `<span data-until="${E.until}"></span> с` : '') + `<div class="qb-b"><div class="qb-m"><div class="qb-l">${line}</div></div>${svgI('right', 'go')}</div>`; }
    if (v.dgn && v.dgn.vote && !v.dgn.vote.done && v.dgn.vote.mode !== 'ring') { const V = v.dgn.vote, o = V.my && V.opts.find((x) => x[0] === V.my); return head('map', `Данж · ${esc(V.title)}`, `<span data-until="${V.end}"></span> с`) + `<div class="qb-b"><div class="qb-m"><div>${o ? `${svgI('check', 'ok')} твой голос: ${o[0]} · ${esc(o[2])}` : v.party === 'in' ? 'Нажми на проход или пиши номер в чат' : 'Отряд выбирает проход'}</div></div>${svgI('right', 'go')}</div>`; }
    if (v.vote && !v.vote.done) return head('map', esc(v.vote.title), `<span data-until="${v.vote.end}"></span> с`) + `<div class="qb-b"><div class="qb-m"><div>${v.vote.my ? `${svgI('check', 'ok')} твой голос: ${v.vote.my}` : 'Пиши номер в чат'}</div></div>${svgI('right', 'go')}</div>`;
    if (v.loot) return head('gift', `Делёж: ${esc(v.loot.name)}`, `<span data-until="${v.loot.until}"></span> с`) + `<div class="qb-b"><div class="qb-m"><div>${v.loot.my ? `${svgI('check', 'ok')} твой голос учтён` : 'Голосуй в чате, кому отдать вещь'}</div></div>${svgI('right', 'go')}</div>`;
    return head('map', `${esc(KIND_RU[v.k] || 'Поход')}${v.t ? ' · ' + esc(v.t) : ''}`, v.n ? `отряд ${v.n}` : '') + `<div class="qb-b"><div class="qb-m"><div>${v.party === 'in' ? 'ты в отряде' : v.party === 'ghost' ? 'ты призрак в этом походе' : v.party === 'q' ? 'ты в очереди в отряд' : 'ты не в отряде'}</div>${v.dg ? `<div class="qb-l q-dg">⚠ ${esc(v.dg)}</div>` : ''}${lwHtml(v, 'qb-l q-dg')}</div>${svgI('right', 'go')}</div>`;   // 22.10: ★3+ — потери при гибели
  }
  const turnRu = (t) => { const s = SKN()[t]; return s ? s.name.toLowerCase() : ({ melee: 'удар', ranged: 'выстрел', magic: 'магия', heal: 'лечение', guard: 'стойка', pull: 'вытащить', auto: 'атака' }[t] || t); };
  const hpBar = (hp) => (hp == null || hp < 0 ? '' : `<div class="q-hp" role="img" aria-label="Здоровье ${Math.round(hp * 100)}%"><i style="width:${Math.max(2, Math.round(hp * 100))}%" class="${hp <= 0.25 ? 'low' : hp <= 0.5 ? 'mid' : ''}"></i></div>`);
  function dd(mood) { const h = X.hero(); if (!h) return ''; if (h !== memoH) { memoH = h; memoD.clear(); } let s = memoD.get(mood); if (s == null) { s = X.doodle(X.login(), h, mood, 'battle') || ''; memoD.set(mood, s); } return s; }
  function heroThumb() { const s = dd('stern'); return s ? `<div class="q-thumb">${s}</div>` : ''; }
  // 25.10: итог для себя - тот же, что в журнале (me.st из комнаты: dead | hurt | ok | pass | by, «~» - засчитан неактивным).
  // Старая комната без st - как раньше (по урону); новая, а тебя в итоге нет - тебя не было у ловушки (не «тебя не задело»)
  function trapMine(T) {
    const r = T.res, me = r.me || {}, st = String(me.st || ''), code = st.replace('~', ''), what = T.tre ? 'сокровищнице' : 'ловушке';
    if (me.dmg === 'dead' || code === 'dead') return `<b class="dn">Твой герой погиб в ${what}</b>`;
    const p = [];
    if (+me.dmg > 0) p.push(`<b class="dn">−${me.dmg} здоровья</b>`);
    if (+me.gain > 0) p.push(`<b class="up">+${X.money(me.gain)}</b>`);
    if (+me.xp > 0) p.push(`<b class="up">+${me.xp} опыта</b>`);
    for (const n of Array.isArray(me.it) ? me.it : []) p.push(`<b class="up">«${esc(n)}»</b>`);
    const afk = st.endsWith('~') ? ' <span class="muted">· засчитан неактивным: твоих команд игра не получила</span>' : '';
    if (code === 'hurt' && !(+me.dmg > 0)) p.unshift('<b class="dn">Задело</b>');
    if (p.length) return p.join(' · ') + afk;
    if (r.sv && !code) return `Тебя не было в этой ${what}`;
    return (code === 'ok' ? 'Справился' : code === 'pass' ? 'Пронесло - не задело' : code === 'by' ? 'Прошёл мимо' : r.win ? 'Прошёл без потерь' : 'Тебя не задело') + afk;
  }

  /* ---------- вкладка ---------- */
  function tabHtml(v) {
    if (!v || !v.on) return '<p class="empty">Похода сейчас нет. Как только стример поведёт отряд — здесь будет видно, где твой герой и что писать в чат.</p>';
    if (qaOn()) return '';   // 26.10 (стример): тестерам кнопок - раскладка по схеме (layPaint); остальным - как было
    // 26.10 (стример): своё участие - значком у заголовка (зелёный «в отряде», красный «не в отряде», жёлтый «вступишь на остановке» - написал «поход», пока отряд в пути: вступит на ближайшей остановке, серый «призрак»)
    const pp = partyOf(v), pb = pp === 'in' ? ['in', 'в отряде'] : pp === 'q' ? ['q', 'вступишь на остановке'] : pp === 'ghost' ? ['gh', 'призрак'] : ['out', 'не в отряде'];
    const top = `<div class="q-top"><div><h2>${esc(v.b ? `Бой · ${v.b.title || v.t}` : v.lair ? 'Логово Закхуэля' : v.tr ? `${v.tr.icon || ''} ${v.tr.name}` : `${KIND_RU[v.k] || 'Поход'}${v.t ? ' · ' + v.t : ''}`)} <span class="q-pt ${pb[0]}" role="status">${pb[1]}</span></h2><p class="muted">${esc([v.ter, v.roll && v.roll.n ? `бросок ${v.roll.by}: ${v.roll.n}` : '', v.n ? `отряд ${v.n}` : ''].filter(Boolean).join(' · '))}</p>${v.dg ? `<p class="q-dg">⚠ ${esc(v.dg)}</p>` : ''}${lwHtml(v, 'q-dg')}</div>`
      + `<div class="q-sync"><button type="button" class="q-dl" aria-expanded="false">${svgI('clock')}как на стриме · ${delayS(v)} с</button><div class="q-dlp" hidden><p>Сайт показывает бой с задержкой твоего стрима. Обгоняет стрим — прибавь, отстаёт — убавь.</p><div class="q-dlb"><button type="button" data-adj="-1" aria-label="Меньше на секунду">−</button><b>${delayS(v)} с</b><button type="button" data-adj="1" aria-label="Больше на секунду">+</button><button type="button" data-adj="0">как у стримера</button></div></div></div></div>`;
    // 23.10: отряд в округе ★1–2 — первая остановка — город округа: участнику отряда (кому открыты города) — кнопка входа
    const h0 = X.hero(), tw = v.town && h0 && h0.cy && h0.tw && X.openTown ? `<p class="q-town"><button type="button" class="btn primary" data-qtown="${esc(v.town.id)}">🏘 Войти в город «${esc(v.town.name)}»</button></p>` : '';
    if (tw) return top + tw + (v.b ? battleHtml(v) : v.lair && v.lair.is ? islesHtml(v) : v.tr ? trapHtml(v) : v.vote && !v.vote.done ? voteHtml(v) : v.loot ? lootHtml(v) : '');
    // 25.10: генерированный босс: вид механики (bg, bossSitePublic) - и тестерам кнопок (qa) панель хода отряда сразу под стадией
    if (v.b && v.b.gb && v.bg) return top + bgHtml(v, qaOn() ? qaBattle(v, v.b, meIn(v.b)) : '') + (qaOn() ? qaHero(v) : '');
    if (v.b) return top + battleHtml(v);
    if (v.bg) return top + bgHtml(v);   // 25.10: бой с генерированным боссом
    if (v.dgn) return top + dgHtml(v);   // 23.10: данж — комната (та же сцена, что на стриме) и проходы кликом
    if (v.lair && v.lair.is) return top + islesHtml(v);
    if (v.lair && qaOn()) return top + lairHtml(v) + qaHero(v);   // 26.10: логово Закхуэля (бой) - ход, слова без копирования; кнопки - кнопки мест
    if (v.tr) return top + trapHtml(v);
    if (v.pz) return top + pzHtml(v) + (qaOn() ? qaHero(v) : '');   // 28.10 (map-puzzles): головоломка
    if (v.ev && v.ev.gob) return top + gobHtml(v) + (qaOn() ? qaHero(v) : '');   // 28.10: ярмарка гоблинов
    if (v.ev && v.ev.hw) return top + hwEvHtml(v) + (qaOn() ? qaHero(v) : '');   // 28.10: событие Изнанки
    if (v.ev && qaOn()) return top + qaEvent(v) + qaHero(v);   // 25.10: событие — выбор кнопками (тестерам)
    if (v.ev) return top + evHtml(v);   // 25.10: событие - что писать в чат и свой выбор
    if (v.vote && !v.vote.done) return top + voteHtml(v) + (qaOn() ? qaSquad(v) : '');
    if (v.loot) return top + lootHtml(v);
    if (v.sh && v.sh.items && v.sh.items.length) return top + shopHtml(v) + (qaOn() ? qaHero(v) : '');   // 23.10: лавка — прилавок
    if (qaOn()) return top + (v.gather ? `<section class="q-card"><p class="muted">${gwName(v)} · <span data-until="${v.gather.until}"></span> с${partyOf(v) === 'q' ? ' · вступишь, когда отряд остановится' : ''}</p></section>` : '') + qaSquad(v, true) + qaHero(v);   // 26.10: «в отряде / не в отряде» - значок у заголовка   // 25.10: вступить / покинуть, панель героя
    return top + `<section class="q-card"><p>${v.party === 'in' ? 'Твой герой в отряде.' : v.party === 'ghost' ? 'Твой герой — призрак в этом походе.' : v.party === 'q' ? 'Ты в очереди: вступишь, когда отряд остановится.' : (v.gather && v.gather.hw ? 'Ты не в отряде — пиши «портал» в чат, чтобы шагнуть в Изнанку с отрядом.' : 'Ты не в отряде — пиши «поход» в чат, когда стример объявит сбор.')}</p>${v.gather ? `<p class="muted">${gwName(v)} · <span data-until="${v.gather.until}"></span> с</p>` : ''}</section>`;
  }
  /* 26.10 (п. 26): арена босса - площадки (контуры как на стриме), опасные - красным, уцелеющие - зелёным, своя - «ты»; кнопки «прыжок N»:
     на соседнюю (или на любую, если механика разрешает) - уходят строкой */
  function zonesHtml(g, M) {
    const Z = g.zn, gone = new Set(Z.gone || []), my = g.area || 0, bad = new Set(M.id === 'M32' ? [] : M.zones || []), keep = new Set(M.id === 'M32' ? M.zones || [] : []);
    const pts = Z.a.flatMap((a) => a[2]); if (!pts.length) return '';
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs) - 40, y0 = Math.min(...ys) - 40, w = Math.max(...xs) - x0 + 40, hgt = Math.max(...ys) - y0 + 40;
    const cen = (P) => [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
    const shapes = Z.a.map(([n, , P]) => { if (!P.length) return ''; const [cx, cy] = cen(P), cls = gone.has(n) ? 'gone' : bad.has(n) ? 'bad' : keep.has(n) ? 'keep' : '';
      return `<g class="za ${cls}${n === my ? ' me' : ''}"><polygon points="${P.map((p) => p.join(',')).join(' ')}"/><text x="${cx}" y="${cy}" dy="0.35em">${n}</text>${n === my ? `<text class="you" x="${cx}" y="${cy + 70}">ты</text>` : ''}</g>`; }).join('');
    const nb = (Z.a.find((a) => a[0] === my) || [0, []])[1], cand = Z.a.map((a) => a[0]).filter((n) => !gone.has(n) && n !== my && (M.any || !my || nb.includes(n)));
    const btns = qaOn() && X.say && cand.length ? `<div class="qa-row">${cand.map((n) => `<button type="button" class="qa-b ${bad.has(n) ? 'warn' : keep.has(n) ? 'main' : ''}" data-qpb="${esc('прыжок ' + n)}">⤴ на площадку ${n}</button>`).join('')}</div>` : '';
    const art = `<svg viewBox="${x0} ${y0} ${w} ${hgt}" role="img" aria-label="Арена: площадки ${Z.a.map((a) => a[0]).join(', ')}${my ? `; ты на площадке ${my}` : ''}">${shapes}</svg>${my ? '' : '<p class="muted">Где ты - видно на стриме</p>'}`;
    if (SCH) { SCH.h += `<div class="q-arena">${art}</div>`; return btns; }   // 26.10: раскладка - схема арены слева, кнопки «прыжок» - в окне действий
    return `<div class="q-arena">${art}${btns}</div>`;
  }
  // 25.10: бой с генерированным боссом - босс (фаза, здоровье, приспешники), механика сейчас (что писать, слово, варианты, счётчик, таймер), мой герой
  function bgHtml(v, mid = '') {
    const g = v.bg, M = g.mech;
    const stage = M ? `${esc(M.name)}${M.until ? ` · <span data-until="${M.until}"></span> с` : ''}` : g.st === 'party' ? 'Ход отряда' : g.st === 'boss' ? 'Ход босса' : g.st === 'trans' ? 'Новая фаза' : g.st === 'end' ? 'Бой окончен' : 'Бой';
    let h = `<div class="q-stage ${M ? 'tele' : g.st === 'party' ? 'party' : ''}"><b>${stage}</b><span>фаза ${g.ph} из ${g.phs}${g.hw && g.hw.phn ? ` «${esc(g.hw.phn)}»` : ''}${g.limit ? ` · ход ${g.round} из ${g.limit}` : ''}${g.form ? ` · «${esc(g.form)}»` : ''}${g.rage ? ' · ярость: удары сильнее' : ''}</span></div>` + mid;
    let bc = `<section class="q-card q-bgc"><p><b>${esc(g.name)}</b>, ${esc(g.title)} · ★${g.danger} · здоровье ${Math.round(g.hp * 100)}%</p>${hpBar(g.hp)}`;
    if (g.adds && g.adds.length) bc += `<p class="muted">Приспешники: ${g.adds.map((a) => `${esc(a[0])} ${a[1]} (${Math.round(a[2] * 100)}%)`).join(', ')} - пиши «удар ${esc(g.adds[0][0])} N»: пока живы, урон по боссу вдвое меньше</p>`;
    bc += '</section>';
    if (SCH) SCH.h += bc; else h += bc;   // 26.10: раскладка - босс над ареной (схема)
    if (g.hw) h += jackHtml(g, M);   // HW: Джек-Фонарщик - фонари, горячая тыква, куранты
    if (M) {
      h += `<section class="q-card"><h3>${esc(M.name)}</h3>`;
      if (M.fake) h += '<p><b class="urge">ФИНТ - ничего не пиши!</b></p>';
      if (M.text) h += `<p>${ncText(M.text)}</p>`;
      // 26.10: механики-слова (телеграф, фраза, руны, «за легион»…) - тестерам слово без копирования: печатать самому в строке команд
      if (M.word) h += `<p class="q-word">${qaOn() ? wd(M.word, 'big') : `<b>${esc(M.word)}</b>`}</p>`;
      if (M.words && M.words.length) h += `<p class="q-word">${qaOn() ? M.words.map((w) => wd(w, 'big')).join(' ') : `<b>${M.words.map(esc).join(' ')}</b>`}</p>`;
      if (M.opts && M.opts.length) h += `<p>${M.opts.map((o, i) => `<b>${i + 1}</b> - ${esc(o)}`).join(' · ')}</p>`;
      if (g.zn && M.fam === 'position') h += zonesHtml(g, M);   // 26.10: арена - схема и кнопки площадок
      else if (M.zones && M.zones.length) h += `<p>Зоны: ${M.zones.join(', ')} - номера площадок видно на стриме</p>`;
      h += `<p><b class="urge">${M.me ? 'Цель - ты! ' : ''}${M.how ? `Пиши: ${qaOn() ? wd(M.how, 'sm') : '«' + esc(M.how) + '»'}` : ncText(M.tip || 'Смотри табличку на стриме')}</b></p>`;
      if (M.need != null) h += `<p class="muted">Набрано ${M.got != null ? M.got : 0} из ${M.need}</p>`;
      h += '</section>';
    } else if (g.st === 'party') h += `<section class="q-card"><p>${g.acted ? `${svgI('check', 'ok')} Твой ход принят` : 'Пиши в чат: <b>удар</b> · <b>выстрел</b> · <b>магия</b> · <b>лечить</b> (или умение класса)'}</p></section>`;
    if (!SCH) h += `<section class="q-card"><p>${g.in ? (g.my > 0 ? 'Твой герой в бою' : 'Твой герой пал') : 'Ты не в этом бою'}</p>${g.in ? hpBar(g.my) : ''}</section>`;   // раскладка: герой - в карточке героя
    if (SCH && !(g.zn && M && M.fam === 'position')) SCH.h += bossArt(g);
    return h;
  }
  // 26.10: журнал боя (тестерам кнопок) - последние строки ленты боя; массовая гибель приходит одной строкой «💀 Пало N игроков»
  const fdHtml = (b) => (Array.isArray(b.fd) && b.fd.length ? `<section class="q-card q-fd"><div class="q-ch"><b>Журнал боя</b></div><ul class="q-cmds">${b.fd.map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ul></section>` : '');
  // HW (26.10, hw/jack): Джек-Фонарщик - то, что на стриме нарисовано на поле: фонари (H2) с номерами, тыква у меня (H3), удары курантов (H5).
  // Слова и «передать @ник» - без копирования (печатать самому в строке команд); номера фонарей и тыкв - кнопками мест (siteact.js PB: lan, mvote)
  function jackHtml(g, M) {
    const J = g.hw || {}; let h = '';
    if (J.lan && Array.isArray(J.lan.lit)) {
      const n = J.lan.lit.filter(Boolean).length, off = J.lan.lit.map((v, i) => (v ? 0 : i + 1)).filter(Boolean);
      h += `<section class="q-card q-jack"><div class="q-ch"><b>Фонари: ${n} из 6</b><span class="muted">погаснут все - Тьма: удар Джека вдвое</span></div><div class="q-lans">${J.lan.lit.map((v, i) => `<span class="q-lan${v ? ' on' : ''}" aria-label="Фонарь ${i + 1}: ${v ? 'горит' : 'погас'}"><i></i><b>${i + 1}</b>${v ? '' : `<small>${(J.lan.prog && J.lan.prog[i]) || 0} из ${J.lan.need2 || 2}</small>`}</span>`).join('')}</div>`
        + (off.length ? `<p>${ncText(`Погасли: ${off.join(', ')} - нажми кнопку или напиши «зажечь ${off[0]}». Нужно ${J.lan.need2 || 2} на фонарь`)}</p>` : '<p class="muted">Все фонари горят</p>') + '</section>';
    }
    if (J.potMe) h += `<section class="q-card q-urge"><p class="q-big">🎃 Горячая тыква у тебя!</p><p>${ncText('Передай её, пока не взорвалась: напиши в строке команд «передать @ник» - тому, кто ещё не держал')}</p></section>`;
    else if (M && M.id === 'H3' && J.pot) h += `<section class="q-card"><p>Тыква у ${J.pot} ${plural(J.pot, 'бойца', 'бойцов', 'бойцов')} - кто держит, видно на стриме. Тебе её могут передать</p></section>`;
    if (M && M.id === 'H4') h += '<section class="q-card"><p><b>Какая тыква моргает огоньком - видно только на стриме.</b> Смотри на поле и жми номер</p></section>';
    if (J.clk != null && J.clk > 0) h += `<section class="q-card ${J.clk >= 10 ? 'q-urge' : ''}"><p><b>Куранты: удар ${J.clk} из 12</b>${J.clk >= 10 ? ' - на двенадцатом Вечная ночь: всем −40%' : ''}</p></section>`;
    return h;
  }
  function battleHtml(v) {
    const b = v.b, m = meIn(b);
    const stage = b.st === 'party' ? `Ход отряда · <span data-until="${b.until}"></span> с` : b.st === 'tele' ? (b.gb ? 'Ход босса' : `Ход врага · <span data-until="${b.until}"></span> с`) : b.st === 'mech' ? 'Механика босса' : b.st === 'trans' ? 'Новая фаза босса' : b.st === 'end' ? 'Бой окончен' : b.st === 'intro' ? 'Бой начинается…' : 'Удары!';
    let h = `<div class="q-stage ${b.st}"><b>${stage}</b><span>раунд ${b.round}${b.gb ? '' : ` из ${b.maxR}`}${b.cr && b.cr.fr.length > 1 ? ` · враги ${b.cr.fr.map((s) => ({ L: 'слева', R: 'справа', F: 'вдали' }[s])).join(', ')}` : ''}</span></div>`;
    const qa = qaOn();   // 25.10: тестерам — кнопки сразу под стадией (видно без прокрутки), слово врага — кнопкой «Блок» в той же панели
    if (qa) h += qaBattle(v, b, m);
    if (b.tele && !qa) h += `<section class="q-card q-urge"><p class="q-big">${esc(b.tele.text || 'Враг атакует!')}</p><p>${b.tele.ok ? `${svgI('check', 'ok')} ты написал «${esc(b.tele.word)}» — принято` : `Пиши в чат <b class="w">${esc(b.tele.word)}</b>`}</p><p class="muted">${b.tele.got} из ${b.tele.need} нужных</p></section>`;
    // схема отряда
    const where = m.st === 'on' ? `Где ты в строю${multi(b) && m.side ? ' · ' + SIDE_RU[m.side] : ''}` : m.st === 'reserve' ? 'Ты в бою, но вне кадра стрима' : m.st === 'dead' ? 'Твой герой пал' : m.st === 'fled' ? 'Ты сбежал из боя' : 'Тебя нет в этом бою';
    const sq = b.gb ? qaBoss(b) + (SCH ? bossArt(b.gb) : '')   // 25.10: генерированный босс — карточка босса (строя нет)
      : `<section class="q-card"><div class="q-ch"><b>${where}</b><span class="muted">на экране ${b.form.length}${b.fighters > b.form.length ? ` из ${b.fighters}` : ''}</span></div><canvas class="q-squad" width="720" height="360" role="img" aria-label="Схема боя: отряд и враги, твой герой выделен"></canvas>`
      + `<div class="q-leg"><span><i style="background:${ZONE_COL[0]}"></i>щиты</span><span><i style="background:${ZONE_COL[1]}"></i>ближний бой</span><span><i style="background:${ZONE_COL[2]}"></i>стрелки и маги</span><span><i style="background:${ZONE_COL[3]}"></i>жрецы</span><span><i class="foe"></i>враги</span></div></section>`;
    if (SCH) SCH.h += sq; else h += sq;   // 26.10: раскладка - схема боя слева от журнала
    // мой герой и умение
    const r = b.mine && b.mine.me, sk = r && r.sk && SKN()[r.sk];
    const cast = b.st === 'hit' && b.mine && b.mine.k === 'party' && r;
    if (!SCH) h += `<section class="q-card q-hero${cast ? ' cast' : ''}">${cast ? castHtml(b, r, sk) : `<div class="q-hi">${heroBig('stern')}</div>`}<div class="q-hm"><div class="q-hn"><b>${esc((X.hero() && X.hero().name) || X.login())}</b><span class="muted">${esc(X.role(m.role))}</span></div>${hpBar(b.hp)}`
      + `${b.turn && b.st === 'party' ? `<p>${svgI('check', 'ok')} ты написал «${esc(turnRu(b.turn))}» — принято, ${esc((X.hero() && X.hero().name) || 'герой')} готовится</p>` : ''}${lastLine(b) ? `<p>${lastLine(b)}</p>` : ''}</div></section>`;
    // 25.10: тестерам — кнопки вместо «что писать» (та же команда в чат), панель героя
    if (qa && SCH) return h + (b.res ? resHtml(b) : '');   // 26.10: раскладка - журнал боя в «Журнале», герой и «ход принят» - в карточке героя и истории
    if (qa) return h + qaHero(v) + (b.st === 'tele' ? '' : fdHtml(b)) + (b.res ? resHtml(b) : '');   // ход врага: лента может назвать слово (её нельзя копировать) - скрыта до конца хода
    // что писать
    if (b.st !== 'end' && (m.st === 'on' || m.st === 'reserve')) {
      const rows = [];
      for (const [w, cd] of b.sk || []) { const s = skName(w); rows.push(`<li class="${cd ? 'cd' : 'rdy'}"><b>${esc(w)}</b><span>${s ? s.icon + ' ' : ''}${cd ? `через ${cd} ${plural(cd, 'ход', 'хода', 'ходов')}` : 'готово'}</span></li>`); }
      rows.push(`<li><b>${esc(cmdFor(b, m))}</b><span>${multi(b) && m.side ? 'твоя сторона — ' + ({ L: 'слева', R: 'справа', F: 'вдали' }[m.side]) : 'обычный ход'}</span></li>`);
      h += `<section class="q-card"><div class="q-ch"><b>Что писать в чат</b><span class="muted">${b.st === 'party' ? 'сейчас ход отряда' : 'в следующий ход отряда'}</span></div><ul class="q-cmds">${rows.join('')}</ul></section>`;
    }
    if (b.res) h += resHtml(b);
    return h;
  }
  const resHtml = (b) => `<section class="q-card"><p class="q-big">${{ win: 'Победа!', away: b.gb ? 'Босс ушёл' : 'Враги сбежали', lose: 'Отряд разбит', retreat: 'Отступление' }[b.res.how] || 'Бой окончен'}</p>${b.res.xp ? `<p>+${b.res.xp} опыта${b.res.coins ? ` · ~${X.money(b.res.coins)}` : ''}</p>` : ''}</section>`;
  const heroBig = (mood) => dd(mood || 'stern');
  // умение моего героя — в момент ударов (с задержкой стрима): герой бьёт, эффект умения (тот же рисунок, что в оверлее), урон
  function castHtml(b, r, sk) {
    const fx = sk && window.QBattleCrowd && window.QBattleCrowd.fxSvg ? window.QBattleCrowd.fxSvg(r.sk, { x: 92, y: 70 }, { x: 250, y: 92 }, 0.15, { targets: [{ x: 250, y: 92 }], rnd: 0.5, amt: r.heal || 12 }) : '';
    const fo = r.e ? b.foes.find((f) => f[4] === r.e) : null, art = fo ? foeSvg(fo[1], fo[2], false) : '';
    return `<div class="q-cast" aria-label="${esc(sk ? sk.name : 'Удар')}"><div class="q-ch-h">${heroBig('stern')}</div>${r.e ? `<div class="q-foe${art ? ' art' : ''}">${art ? `<svg viewBox="0 0 340 240" aria-hidden="true">${art}</svg>` : ''}<span>${esc(r.e)}</span></div>` : ''}<svg class="q-fx" viewBox="0 0 320 180" aria-hidden="true">${fx}</svg>`
      + `${sk ? `<div class="q-skb">${sk.icon} ${esc(sk.name)}</div>` : ''}${r.d ? `<div class="q-dmg">−${r.d}</div>` : r.heal ? `<div class="q-dmg up">+${r.heal}</div>` : ''}</div>`;
  }
  function islesHtml(v) {
    const I = v.lair.is, my = (I.at && I.at.my) || (I.pick && I.pick.my) || 0, cnt = (I.at && I.at.cnt) || (I.pick && I.pick.cnt) || [0, 0, 0, 0], gone = new Set(I.gone || []);
    const P = { 1: [80, 70], 2: [86, 196], 3: [190, 130], 4: [292, 120] };
    const isl = [1, 2, 3, 4].map((n) => { const [x, y] = P[n], g = gone.has(n), me = my === n, sil = I.sil && I.sil.n === n;
      return `<g class="isl${g ? ' gone' : ''}${me ? ' me' : ''}"><ellipse cx="${x}" cy="${y}" rx="52" ry="26"/>${sil ? `<g class="cloud"><ellipse cx="${x - 10}" cy="${y - 30}" rx="34" ry="12"/><ellipse cx="${x + 14}" cy="${y - 36}" rx="24" ry="11"/></g>` : ''}<circle cx="${x - 40}" cy="${y - 20}" r="12"/><text x="${x - 40}" y="${y - 15}" class="n">${n}</text><text x="${x}" y="${y + 46}" class="c">${g ? 'уничтожен' : `${cnt[n - 1]} ${plural(cnt[n - 1], 'герой', 'героя', 'героев')}${sil ? ' · молчат' : ''}`}</text></g>`; }).join('');
    const nb = my && I.nb[my] ? I.nb[my].filter((n) => !gone.has(n)) : [];
    let h = `<div class="q-stage">${I.pick ? `<b>Выбор острова · <span data-until="${I.pick.until}"></span> с</b><span>пиши номер острова: 1–4</span>` : I.doom ? `<b>Какой остров уничтожить? · <span data-until="${I.doom.until}"></span> с</b><span>чат голосует</span>` : `<b>Фаза ${v.lair.phase || 3} · острова</b><span>держись своего острова</span>`}</div>`;
    const isv = `<section class="q-card q-isles"><svg viewBox="0 0 360 250" role="img" aria-label="Острова: ${[1, 2, 3, 4].map((n) => `${n} — ${gone.has(n) ? 'уничтожен' : cnt[n - 1]}`).join(', ')}${my ? `; ты на острове ${my}` : ''}">${isl}</svg>${my && !gone.has(my) ? `<div class="q-ime" style="left:${(P[my][0] / 360 * 100).toFixed(1)}%;top:${((P[my][1] - 40) / 250 * 100).toFixed(1)}%">${heroBig('stern')}</div>` : ''}</section>`;
    if (SCH) SCH.h += isv; else h += isv;
    if (I.pick) h += `<section class="q-card"><p>${my ? `${svgI('check', 'ok')} ты выбрал остров ${my}` : '<b class="urge">Пиши в чат номер острова: 1, 2, 3 или 4</b>'}</p><p class="muted">Кто не выберет — может рухнуть вместе с вершиной</p></section>`;
    else if (nb.length && !gone.size) h += qaOn() && X.say ? `<section class="q-card"><div class="q-ch"><b>Прыгнуть на соседний остров</b></div><div class="qa-row">${nb.map((n) => `<button type="button" class="qa-b" data-qpb="${esc('прыгнуть ' + n)}">⤴ остров ${n}<small>${cnt[n - 1]} ${plural(cnt[n - 1], 'герой', 'героя', 'героев')}</small></button>`).join('')}</div></section>`   // 26.10: прыжок - кнопками (строкой «прыгнуть N»)
      : `<section class="q-card"><div class="q-ch"><b>Прыгнуть можно на соседний остров</b></div><ul class="q-cmds">${nb.map((n) => `<li><b>прыгнуть ${n}</b><span>${cnt[n - 1]} ${plural(cnt[n - 1], 'герой', 'героя', 'героев')}</span></li>`).join('')}</ul></section>`;
    h += lairWords(v);
    if (I.doom) { const c = I.doom.cnt || {}, mine = my && +c[my] > 0; h += `<section class="q-card ${mine ? 'q-urge' : ''}"><p>${mine ? `<b>Твой остров ${my} трещит:</b> ${c[my]} ${plural(+c[my], 'голос', 'голоса', 'голосов')} за то, чтобы его уничтожили` : 'Чат голосует, какой остров уничтожить'}</p><p class="muted">${(I.doom.opts || []).map((n) => `${n}: ${c[n] || 0}`).join(' · ')}${c.none ? ` · никакой: ${c.none}` : ''}</p></section>`; }
    return h;
  }
  /* 26.10 (п. 31-32): логово Закхуэля - ход отряда (сходил ли), слово врага, фраза заклинания, «сделка» - без копирования (печатать самому) */
  function lairWords(v) {
    const X0 = v.lair; if (!X0 || !qaOn()) return '';
    let h = '';
    if (X0.tele) h += `<section class="q-card q-urge"><p class="q-big">Закхуэль атакует!</p><p class="muted">${X0.tele.got} из ${X0.tele.need} нужных</p>${X0.tele.ok ? `<p class="qa-st ok">${svgI('check', 'ok')} слово принято</p>` : `<div class="q-ncw"><span>Напечатай в строке внизу:</span>${wd(X0.tele.word, 'big')}</div>`}</section>`;
    if (X0.spell) h += `<section class="q-card"><p><b>Сорви заклинание</b> - повтори фразу целиком${X0.spell.until ? ` · <span data-until="${X0.spell.until}"></span> с` : ''}</p><div class="q-ncw">${X0.spell.words.map((w) => wd(w)).join(' ')}</div></section>`;
    if (X0.mass) h += `<section class="q-card"><p><b>Общее заклинание</b> - повтори фразу</p><div class="q-ncw">${X0.mass.words.map((w) => wd(w)).join(' ')}</div></section>`;
    if (X0.deal) h += `<section class="q-card"><p>Сделка с демоном: половина здоровья за монеты. Согласен - напечатай ${wd('сделка', 'sm')}</p></section>`;
    return h;
  }
  function lairHtml(v) {
    const X0 = v.lair;
    const st = X0.st === 'party' ? 'Ход отряда' : X0.st === 'boss' || X0.st === 'tele' ? 'Ход Закхуэля' : X0.st === 'end' ? 'Бой окончен' : 'Логово';
    return `<div class="q-stage ${X0.st === 'party' ? 'party' : ''}"><b>${st}</b><span>фаза ${X0.phase || 1}${X0.round ? ` · раунд ${X0.round}` : ''}</span></div>`
      + `<section class="q-card"><p>${X0.hp == null ? 'Ты не в этом бою' : X0.hp > 0 ? (X0.acted ? `${svgI('check', 'ok')} ход принят` : X0.st === 'party' ? 'Твой ход - кнопки выше или строкой' : 'Твой герой в бою') : 'Твой герой пал'}</p>${X0.hp != null ? hpBar(X0.hp) : ''}</section>` + lairWords(v);
  }
  /* 23.10: лавка — прилавок с теми же номерами, что на стриме («купить 3»). Наведение мышью (ПК) или нажатие (телефон) — общая
     подсказка-карточка вещи сайта (app.js cardTip, как у товара лавок «Города»); подсветка — обводка по силуэту рисунка (style.css --item-ol) */
  let shSel = '';
  function shopHtml(v) {
    const S = v.sh, art = (it) => { try { return X.art ? X.art(it) : ''; } catch (e) { return ''; } }, plain = (h) => String(h).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();   // X.money — разметка монет стиля
    // 26.10 (стример): полки - как «Прилавок» на стриме: те же места и номера (раскладка - общая с оверлеем, quest/client/shelf.js)
    const cell = (it, i) => `<li><button type="button" class="q-shi${it.qty <= 0 ? ' out' : ''}${shSel === it.id + ':' + i ? ' on' : ''}" data-qsh="${i}" data-r="${esc(it.rarity)}" aria-label="${i + 1}. ${esc(it.name)} — ${esc(plain(X.money(it.price)))}${it.qty > 0 ? `, осталось ${it.qty}` : ', раскупили'}">`
      + `<span class="n">${i + 1}</span><span class="q">${it.qty > 0 ? '×' + it.qty : 'нет'}</span>${it.curio ? '<span class="cu" aria-hidden="true">★</span>' : ''}<span class="gi">${art(it)}</span>`
      + `<b>${esc(it.name)}</b><i>${X.money(it.price)}</i></button></li>`;
    const SHF = window.QShelf, rows = SHF ? SHF.rows(S.items.length) : [S.items.map((_, i) => i)];
    const shelves = rows.map((r, k) => `<ul class="q-shf" aria-label="Полка ${k + 1}">${r.map((i) => cell(S.items[i], i)).join('')}</ul>`).join('');
    return `<section class="q-card q-shop"><div class="q-ch"><b>${esc(S.icon || '')} Прилавок · ${esc(S.name || 'Лавка')}</b><span class="muted">${window.LGSiteUi.is('hover') ? 'наведи на вещь' : 'нажми на вещь'} — что она даёт</span></div>`
      + `<div class="q-shl">${shelves}</div>${qaOn() && X.say ? `<div class="q-buy" aria-live="polite"><p class="muted">Нажми на товар - здесь появится «Купить»${shMenuOk() ? ` (или ${window.LGSiteUi.is('hover') ? 'правая кнопка мыши' : 'подержи палец'} на товаре - меню)` : ''}. Продать и украсть - строкой: <b>продать N</b>, <b>украсть N</b>.</p></div>` : '<p class="muted">Пиши в чат <b>купить N</b> — N это номер на прилавке; <b>продать N</b> — номер вещи в сумке.</p>'}</section>`;
  }
  function shopBind(el, v) {
    const box = el.querySelector('.q-shl'); if (!box || !v.sh) return;
    const itemOf = (b) => v.sh.items[+b.dataset.qsh];
    const show = (b) => { const it = itemOf(b); if (it && X.goodTip) X.goodTip(b, it); };
    box.querySelectorAll('[data-qsh]').forEach((b) => {
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(b); });
      b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !b.classList.contains('on') && X.tipHide) X.tipHide(); });
      b.addEventListener('focus', () => { if (b.matches(':focus-visible')) show(b); });
      b.addEventListener('blur', () => { if (!b.classList.contains('on') && X.tipHide) X.tipHide(); });
      // нажатие (телефон, клавиатура, мышь): выбрать — карточка остаётся; ещё раз — убрать
      b.addEventListener('click', () => {
        const it = itemOf(b); if (!it) return; const k = it.id + ':' + b.dataset.qsh, again = shSel === k;
        box.querySelectorAll('.q-shi.on').forEach((x) => x.classList.remove('on'));
        shSel = again ? '' : k; if (again) { if (X.tipHide) X.tipHide(); return; }
        b.classList.add('on'); show(b); buyBar(el, v, +b.dataset.qsh);
      });
    });
    if (shMenuOk()) shMenuBind(el, v, box, show);
    const sel = shSel ? +shSel.split(':')[1] : -1; buyBar(el, v, sel >= 0 ? sel : -1);
    if (shSel) { const b = [...box.querySelectorAll('.q-shi.on')][0]; if (b && X.tipFor && X.tipFor() !== b) show(b); }   // прилавок перерисовался (остаток, выбор) — карточка у новой кнопки
  }
  /* 26.10 (п. 4): покупка в лавке похода кликом - товар выбран → «Купить №N · цена» → «Точно? Нажми ещё раз» (4 с) → строка «купить N»
     (тот же разбор, что чат). Защита от случайного нажатия - второе нажатие */
  const BUY = { i: -1, at: 0 };
  function buyBar(el, v, i) {
    const box = el.querySelector('.q-buy'); if (!box) return;
    const it = i >= 0 && v.sh && v.sh.items[i];
    if (!it) { if (BUY.i >= 0) { BUY.i = -1; } return; }
    const armed = BUY.i === i && Date.now() - BUY.at < 4000, poor = (+(X.hero() || {}).money || 0) < it.price;
    box.innerHTML = `<div class="qa-row"><button type="button" class="qa-b ${armed ? 'urge' : 'main'}" data-qbuy="${i}"${it.qty <= 0 ? ' disabled' : ''}>${it.qty <= 0 ? 'Раскупили' : armed ? `Точно купить «${esc(it.name)}»? Нажми ещё раз` : `Купить №${i + 1} · ${X.money(it.price)}`}</button></div>${poor && it.qty > 0 ? '<p class="muted">Похоже, монет не хватит - игра скажет точно</p>' : ''}`;
    const b = box.querySelector('[data-qbuy]');
    if (b) b.onclick = () => { if (BUY.i === i && Date.now() - BUY.at < 4000) { BUY.i = -1; sayLine(`купить ${i + 1}`, { sure: true, btn: 1 }); buyBar(el, v, i); return; } BUY.i = i; BUY.at = Date.now(); buyBar(el, v, i); setTimeout(() => { if (BUY.i === i && Date.now() - BUY.at >= 3900) { BUY.i = -1; buyBar(el, v, i); } }, 4050); };
  }
  /* 26.10 (стример): правая кнопка мыши по товару (на телефоне - долгое нажатие) - своё маленькое меню вместо меню браузера:
     «Купить №N · цена» и «Что даёт» (та же карточка вещи, что по наведению). Меню - библиотеки инвентаря (LGInventory.menu, как у
     сумки): Esc, нажатие мимо, прокрутка - закрыть. «Купить» → «Точно купить?» (4 с; нажатие раньше 0,35 с - не в счёт: двойной клик
     не покупает) → строка «купить N» (тот же разбор, что чат). Пока - тестерам (те же условия, что у кнопки «Купить» под прилавком) */
  const shMenuOk = () => !!(qaOn() && X.say && window.LGInventory && window.LGInventory.menu);
  const SHM = { lp: 0, at: 0, p0: null, v: null };   // долгое нажатие: таймер, где палец, последний вид лавки; когда открыли меню пальцем (следующий «клик» - не выбор)
  function shMenuBind(el, v, box, show) {
    SHM.v = v;
    const btnOf = (e) => e.target.closest && e.target.closest('[data-qsh]');
    box.addEventListener('contextmenu', (e) => {
      const b = btnOf(e); if (!b) return; e.preventDefault();
      if (Date.now() - SHM.at < 800) return;   // палец: меню уже открыто по таймеру (Android шлёт и contextmenu)
      shMenu(el, v, +b.dataset.qsh, e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : b, show);   // Shift+F10 / клавиша меню - у кнопки
    });
    // вкладка может перерисоваться, пока палец держат (новый вид похода): таймер и место пальца - общие, кнопку ищем заново по номеру
    const stop = () => { clearTimeout(SHM.lp); SHM.lp = 0; SHM.p0 = null; };
    box.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return; const b = btnOf(e); if (!b) return;
      stop(); const i = +b.dataset.qsh; SHM.p0 = { x: e.clientX, y: e.clientY, id: e.pointerId };
      SHM.lp = setTimeout(() => {
        SHM.lp = 0; SHM.p0 = null; const nb = el.querySelector(`.q-shl [data-qsh="${i}"]`); if (!nb) return;
        SHM.at = Date.now(); if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) { /* нет вибро */ }
        shMenu(el, SHM.v || v, i, nb, show);
      }, 500);
    }, { passive: true });
    box.addEventListener('pointermove', (e) => { const p = SHM.p0; if (p && e.pointerId === p.id && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) stop(); }, { passive: true });   // палец поехал - прокрутка
    box.addEventListener('pointerup', stop); box.addEventListener('pointercancel', stop);
    // после долгого нажатия браузер может прислать «клик» - это не выбор товара
    box.addEventListener('click', (e) => { if (Date.now() - SHM.at < 800 && btnOf(e)) { e.stopPropagation(); e.preventDefault(); } }, true);
  }
  function shMenu(el, v, i, at, show) {
    const it = v.sh && v.sh.items[i], L = window.LGInventory; if (!it || !L) return;
    const b = el.querySelector(`[data-qsh="${i}"]`), rows = [];
    if (it.qty > 0) rows.push({ t: `Купить №${i + 1} · ${X.moneyText(it.price)}`, v: 'buy' });
    if (X.goodTip) rows.push({ t: 'Что даёт', v: 'tip' });
    if (!rows.length) return;
    L.menu(at, rows, { title: `${i + 1}. ${it.name}${it.qty > 0 ? '' : ' - раскупили'}`, label: `Товар ${i + 1}`, pick: (k) => {
      if (k === 'tip' && b && b.isConnected) { const box = el.querySelector('.q-shl'); if (box) box.querySelectorAll('.q-shi.on').forEach((x) => x.classList.remove('on')); shSel = it.id + ':' + i; b.classList.add('on'); show(b); buyBar(el, v, i); }
      if (k === 'buy') buyAsk(el, v, i, at, Date.now());
    } });
  }
  function buyAsk(el, v, i, at, t0) {
    const it = v.sh && v.sh.items[i], L = window.LGInventory; if (!it || !L) return;
    const poor = (+(X.hero() || {}).money || 0) < it.price;
    const m = L.menu(at, [{ t: `Да, купить за ${X.moneyText(it.price)}`, v: 'yes' }, { t: 'Отмена', v: 'no' }], { title: `Точно купить «${it.name}»?${poor ? ' Похоже, монет не хватит' : ''}`, label: 'Подтвердить покупку', pick: (k) => {
      if (k !== 'yes') return;
      if (Date.now() - t0 < 350) { buyAsk(el, v, i, at, t0); return; }   // второй клик двойного - не подтверждение
      sayLine(`купить ${i + 1}`, { sure: true, btn: 1 });
    } });
    setTimeout(() => { if (m.el.isConnected) m.close(); }, 4000);
  }
  // карточка закрылась нажатием мимо (app.js) — снять и выбор
  document.addEventListener('pointerdown', (e) => { if (shSel && !(e.target.closest && e.target.closest('.q-shi'))) { shSel = ''; document.querySelectorAll('.q-shi.on').forEach((x) => x.classList.remove('on')); } }, { capture: true, passive: true });
  // 25.10 (баг-репорты «на сайте нет выбора помочь/обобрать»): событие похода. Команды - в чате (как на стриме), здесь - что писать,
  // таймер голосования путника, свой выбор, итог. Счёт голосов - только после итога
  function evHtml(v) {
    const E = v.ev, vote = E.look === 'traveler' && E.st === 'vote', done = E.st === 'done' || !!E.res, my = E.my, n = +E.used || 0;
    let h = `<div class="q-stage"><b>${vote && E.until ? `${esc(E.name)} · <span data-until="${E.until}"></span> с` : esc(E.name)}</b><span>${vote ? 'чат решает' : done ? 'итог' : ''}</span></div>`;
    const cmds = (E.cmds || []).map(([w, d]) => `<li><b>${esc(w)}</b><span>${esc(d || '')}</span></li>`).join('');
    if (!done) h += `<section class="q-card${vote && !my ? ' q-urge' : ''}">${vote ? `<p class="q-big">${my ? `${svgI('check', 'ok')} ты выбрал: ${my === 'rob' ? 'обобрать' : 'помочь'}` : 'Помочь путнику или обобрать?'}</p><p class="muted">${my ? 'Передумал - напиши другое слово, пока идёт голосование' : 'Пиши в чат одно слово'}</p>` : n ? `<p>${svgI('check', 'ok')} уже сделано: ${n}</p>` : ''}<div class="q-ch"><b>Что писать в чат</b></div><ul class="q-cmds">${cmds}</ul></section>`;
    if (E.last && !vote) h += `<section class="q-card"><p class="muted">Последний: ${esc(E.last.name)}${E.last.me != null ? ` · 🎲${E.last.me} против 🎲${E.last.him}` : E.last.d != null ? ` · 🎲${E.last.d}` : ''}</p></section>`;
    if (done && E.res) h += `<section class="q-card q-hero"><div class="q-hm"><p class="muted">Итог</p><p class="q-big">${esc(E.res.text)}</p>${E.votes ? `<p class="muted">помочь: ${E.votes.help} · обобрать: ${E.votes.rob}</p>` : ''}${my ? `<p>Твой выбор: ${my === 'rob' ? 'обобрать' : 'помочь'}</p>` : ''}</div></section>`;
    return h;
  }
  function trapHtml(v) {
    const T = v.tr, act = T.st === 'act' || T.st === 'wait';
    const nm = T.tre ? 'Сокровищница' : 'Ловушка';   // 25.10: в сокровищнице таймер был подписан «Ловушка»
    let h = `<div class="q-stage"><b>${act ? (T.until ? `${nm} · <span data-until="${T.until}"></span> с` : nm) : T.res ? 'Итог' : 'Приготовься'}</b><span>${T.actedN ? `ответили ${T.actedN}${T.total ? ' из ' + T.total : ''}` : ''}</span></div>`;
    if (!T.res) h += `<section class="q-card q-urge"><p class="q-big">${esc(act && !T.word && !T.gas ? T.how || T.name : T.intro || T.name)}</p>${act && T.gas ? `<p>${T.acted ? '<b class="dn">Ты написал — вдохнул газ</b>' : 'Не пиши в чат, пока газ не рассеется'}</p>` : act && T.word ? `<p>${T.acted ? `${svgI('check', 'ok')} ты уже написал — принято` : `${qaOn() ? 'Напечатай в строке внизу' : 'Пиши в чат'} ${wd(T.word)}`}</p>` : act && T.acted ? `<p>${svgI('check', 'ok')} принято</p>` : ''}</section>`;
    else h += `<section class="q-card q-hero"><div class="q-hi">${heroBig(T.res.me && T.res.me.dmg ? 'sad' : 'stern')}</div><div class="q-hm"><p class="muted">Итог для тебя</p><p class="q-big">${trapMine(T)}</p>${T.res.text ? `<p class="muted">${esc(T.res.text)}</p>` : ''}</div></section>`;
    if (T.cx && !T.res) h += cxHtml(T, v);   // 28.10: переправа - шаги, кто прыгает, своё
    if (T.bog && !T.res) h += bogHtml(T, v);   // 28.10: трясина - шкалы, тварь, своё «тянем»
    if (qaOn() && !T.res) h += qaTrap(v);   // 25.10: тестерам — кнопки ответа
    return h;
  }
  // 28.10 «Переправа по кочкам»: дорожка шагов (пройденные - верная кочка, утонувшие), текущий шаг, кто прыгает, своё. Кнопки «1 / 2 / 3», «обойти» - кнопки мест (строкой)
  function cxHtml(T, v) {
    const C = T.cx, it = C.it || 'кочка', k = C.rows[Math.min(C.step, C.n - 1)] || 2, me = C.me || {}, J = C.jump;
    const cell = (i) => { const hs = C.hist[i]; if (hs) return `<li class="ok" title="шаг ${i + 1}: верная ${hs[0]}${hs[1].length ? ', утонула ' + hs[1].join(', ') : ''}"><b>${hs[0]}</b>${hs[1].length ? `<s>${hs[1].join(' ')}</s>` : ''}</li>`;
      return `<li class="${i === C.step && C.ph !== 'end' ? 'cur' : ''}"><b>${i === C.step ? '?' : ''}</b><small>${C.rows[i] === 3 ? '3' : ''}</small></li>`; };
    const now = C.ph === 'pick' ? `Шаг ${C.step + 1} из ${C.n}: ${[1, 2, 3].slice(0, k).map((d) => (C.bad.includes(d) ? `<s>${d}</s>` : `<b>${d}</b>`)).join(' · ')} - первый, кто напишет номер, прыгает`
      : C.ph === 'jump' && J ? `${esc(J.name)}${J.auto ? ' (никто не вызвался)' : ''} прыгает ${it === 'кочка' ? 'на кочку' : 'на ' + esc(it)} ${J.row}…`
      : C.ph === 'res' && J ? (J.ok ? `✓ ${esc(it)} ${J.row} держит - отряд прыгает за ${esc(J.name)}` : `✗ ${esc(it)} ${J.row} ушла под ${it === 'камень' ? 'лаву' : 'воду'}${J.show ? ` - верная была ${J.show}` : ''}. ${esc(J.name)} в топи`)
      : C.by === 'detour' ? 'Отряд уходит в обход' : 'Отряд на том берегу!';
    const my = me.fell ? '<b class="dn">Ты упал в топь - больше не прыгаешь</b>' : me.vol ? `${svgI('check', 'ok')} ты вызывался - сундук на том берегу твой` : v.party === 'in' ? 'Напиши номер - иначе сундук мимо тебя' : '';
    return `<section class="q-card q-cx"><ol class="q-steps" aria-label="Шаги переправы">${Array.from({ length: C.n }, (_, i) => cell(i)).join('')}</ol><p class="q-big">${now}</p>${my ? `<p>${my}</p>` : ''}`
      + `<p class="muted">Подсказок нет · упали: ${C.fellN || 0} · «обойти»: ${C.bv || 0} из ${C.need || 1}${me.bv ? ' (и ты)' : ''}</p></section>`;
  }
  // 28.10 «Трясина»: путь и «увязли» (0–100), тварь, когда снова можно «тянем»
  function bogHtml(T, v) {
    const G = T.bog, X = G.beast, cd = G.next ? Math.ceil((G.next - Date.now()) / 1000) : 0;
    const bar = (cls, val, lab) => `<div class="q-gauge ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${val}" aria-label="${lab}"><i style="transform:scaleX(${(val / 100).toFixed(2)})"></i><span>${lab}: ${val}%</span></div>`;
    const beast = X ? (X.res === 'cut' ? `<p class="q-big">🗡 ${esc(X.name)} отрублен!</p>` : X.res === 'took' ? `<p class="q-big dn">🫧 ${esc(X.name)} утащил ${esc(X.who || 'героя')}</p>`
      : `<p class="q-big q-urge">🫧 ${esc(X.name)} хватает! Пиши «руби» или «${esc(X.w)}» · <span data-until="${X.until}"></span> с</p><p>Рубят: <b>${X.got}</b> из ${X.need}${X.me ? ` · ${svgI('check', 'ok')} ты рубишь` : ''}</p>`) : '';
    return `<section class="q-card q-bog">${bar('pos', G.pos, 'Путь')}${bar('sink', G.sink, 'Увязли')}${beast}`
      + `<p>${v.party === 'in' ? (cd > 0 ? `«тянем» засчитано - следующее через ${cd} с` : 'Пиши «тянем» - не чаще раза в 2 секунды') : 'Тянет отряд'}</p><p class="muted">Каждое слово не по делу топит отряд · тянут: ${G.puN} · лишних слов: ${G.noise}</p></section>`;
  }
  // 23.10: в отряде — вариант можно выбрать кликом (тот же голос, что цифра в чате; сменить — кликнуть другой)
  function voteHtml(v) {
    const V = v.vote, tot = V.opts.reduce((a, o) => a + o[3], 0) || 1, can = v.party === 'in';
    return `<div class="q-stage"><b>${esc(V.title)} · <span data-until="${V.end}"></span> с</b><span>${can ? 'нажми на вариант или пиши номер в чат' : 'пиши номер в чат'}</span></div><section class="q-card"><ul class="q-vote">${V.opts.map((o) => `<li class="${V.my === o[0] ? 'me' : ''}${can ? ' can' : ''}">${can ? `<button type="button" class="q-vb" data-qv="${V.id}:${o[0]}" aria-pressed="${V.my === o[0]}">` : ''}<div><b>${o[0]} · ${esc(o[1])}</b>${o[4] ? '<span class="muted"> — назад</span>' : ''}<span class="v">${o[3]}${V.my === o[0] ? ' · твой голос' : ''}</span></div>${can ? '</button>' : ''}<i style="width:${Math.round(o[3] / tot * 100)}%"></i></li>`).join('')}</ul></section>`;
  }
  /* ---------- 23.10: данж — комната той же сценой, что на стриме (styles/<стиль>/dungeon.js), проходы кликом ----------
     Рисунок собирается один раз на комнату (DG.el — живой узел: при перерисовке вкладки переносится, не пересобирается);
     голос — X.vote (как цифра в чате; правила — в игре). Сцена шире экрана — тянуть мышью или пальцем (как «Город»). */
  const DG = { key: '', el: null, L: null, W: 1920, k: 1, x: 0, drag: null, vx: 0, raf: 0, bubT: 0, said: {}, last: null };
  function dgHtml(v) {
    const g = v.dgn, V = g.vote && g.vote.mode !== 'ring' ? g.vote : null, can = v.party === 'in', live = !!(V && !V.done);
    const sub = `Этаж ${(g.room && g.room.floor) || 1}${g.fl ? ' из ' + g.fl : ''}${g.rn ? ' · ' + g.rn : ''}`;
    let h = `<div class="q-stage"><b>${live ? `${esc(V.title)} · <span data-until="${V.end}"></span> с` : g.esc ? 'Данж рушится — пиши «бежать»!' : V && V.done ? (V.win ? 'Идём!' : 'Никто не выбрал') : `Данж «${esc(g.name)}»`}</b><span>${esc(sub)}</span></div>`;
    const dsc = `<section class="q-card q-dgs"><div class="q-dgv" data-dgv tabindex="0" role="group" aria-label="Комната данжа${live && can ? ': нажми на проход, чтобы проголосовать' : ''}"></div>`
      + `<div class="q-dgp"><button type="button" data-dgpan="-1" aria-label="Сцена левее">◀</button><span class="muted">${live ? (can ? 'Нажми на проход — голос за него · тяни сцену в сторону' : v.party === 'ghost' ? 'Призраки не голосуют' : 'Голосует отряд') : 'Тяни сцену, чтобы осмотреться'}</span><button type="button" data-dgpan="1" aria-label="Сцена правее">▶</button></div></section>`;
    if (SCH) SCH.h += dsc; else h += dsc;
    if (V) {
      const mx = Math.max(1, ...V.opts.map((o) => o[4]));
      h += `<section class="q-card"><ul class="q-vote">${V.opts.map((o) => { const me = V.my === o[0], win = V.done && V.win === o[0], c = live && can;
        return `<li class="${me ? 'me' : ''}${win ? ' win' : ''}${c ? ' can' : ''}">${c ? `<button type="button" class="q-vb" data-qv="${V.id}:${o[0]}" aria-pressed="${me}">` : ''}<div><b>${o[0]} · ${esc(o[3])} ${esc(o[2])}</b>${o[5] ? '<span class="muted"> — назад</span>' : ''}<span class="v">${o[4]}${me ? ' · твой голос' : ''}${win ? ' · идём' : ''}</span></div>${c ? '</button>' : ''}<i style="width:${Math.round(o[4] / mx * 100)}%"></i></li>`; }).join('')}</ul></section>`;
    }
    return h;
  }
  const dgScope = (svg) => String(svg || '').replace(/id="([^"]+)"/g, 'id="qd-$1"').replace(/url\(#([^)]+)\)/g, 'url(#qd-$1)').replace(/href="#([^"]+)"/g, 'href="#qd-$1"');
  // сцена комнаты: один раз на комнату. Нет рисунка данжа в стиле канала — табличка
  function dgBuild(g) {
    const D = window.MDDoodle; let L = null;
    try { L = D && D.location && g.room ? D.location('dungeon', { esc, room: g.room }) : null; } catch (e) { L = null; }
    const el = document.createElement('div'); el.className = 'q-dgc';
    if (!L || typeof L.scene !== 'function') { el.innerHTML = `<div class="q-dgn">🏰 ${esc(g.name || 'Данж')}<br><small>${esc(g.rn || '')}</small></div>`; return { el, L: null, W: 1920 }; }
    const W = L.width || 1920, sky = (/\.fr-skybg\{background:([^}]+)\}/.exec(L.css || '') || [])[1] || '#0c0914';
    let art = ''; try { art = dgScope(L.scene()); } catch (e) { art = ''; }
    const props = (L.props || []).slice().sort((a, b) => (a.z || 0) - (b.z || 0)).map((p) => { let sv = ''; try { sv = dgScope(p.svg()); } catch (e) { /* предмет без рисунка */ } return `<svg x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" overflow="visible">${sv}</svg>`; }).join('');
    // обводка наведённого (как в «Городе»: светлая золотая линия и мягкое свечение) — фильтр SVG; толщина — под масштаб сцены (dgFit)
    const ol = '<defs><filter id="qd-ol" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="6" result="d"/>'
      + '<feComposite in="d" in2="SourceAlpha" operator="out" result="r"/><feFlood flood-color="#ffd66e"/><feComposite in2="r" operator="in" result="line"/>'
      + '<feGaussianBlur in="line" stdDeviation="9" result="b"/><feFlood flood-color="rgb(255,196,84)" flood-opacity=".95"/><feComposite in2="b" operator="in" result="glow"/>'
      + '<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/><feMergeNode in="line"/></feMerge></filter></defs>';
    el.style.background = sky;
    el.innerHTML = `<svg class="q-dga" viewBox="0 0 ${W} 1080" preserveAspectRatio="xMinYMin meet">${ol}${art}${props}</svg><div class="q-dgm"></div><div class="q-dgb" role="status" hidden></div>`;
    el.querySelectorAll('svg svg.jl-doodle').forEach((d) => { const w = d.getAttribute('width'), hh = d.getAttribute('height'); if (w) d.style.width = parseFloat(w) + 'px'; if (hh) d.style.height = parseFloat(hh) + 'px'; d.style.position = 'static'; d.style.filter = 'none'; });
    el.querySelectorAll('animate, animateTransform, animateMotion').forEach((n) => n.remove());   // сайт — без анимаций сцены (легче; на стриме они есть)
    el.querySelector('.q-dgm').innerHTML = (L.spots || []).map((p) => `<span class="q-dgk" data-k="${esc(p.key)}" hidden style="left:${(p.x / W * 100).toFixed(3)}%;top:${(p.y / 1080 * 100).toFixed(3)}%;--c:${(L.colors || {})[p.key] || '#ffcf4a'}"><b></b><i></i></span>`).join('');
    return { el, L, W };
  }
  // масштаб: высота вида — один экран 1920 по ширине вкладки, на телефоне не ниже 240 px (сцена шире — тянуть)
  function dgFit(view) {
    if (!DG.L || !view) return;
    const cw = view.clientWidth || 360, hh = Math.round(Math.max(240, Math.min(560, cw * 1080 / 1920))), k = hh / 1080;
    DG.k = k; view.style.height = hh + 'px'; DG.el.style.width = Math.round(DG.W * k) + 'px'; DG.el.style.height = hh + 'px';
    const f = DG.el.querySelector('#qd-ol');
    if (f) { f.querySelector('feMorphology').setAttribute('radius', (2.5 / k).toFixed(1)); f.querySelector('feGaussianBlur').setAttribute('stdDeviation', (4.5 / k).toFixed(1)); }
    dgCam(DG.x);
  }
  const dgMax = () => { const view = DG.el && DG.el.parentNode; return view ? Math.max(0, DG.W * DG.k - (view.clientWidth || 0)) : 0; };
  function dgCam(x) { DG.x = Math.max(0, Math.min(dgMax(), x)); if (DG.el) DG.el.style.transform = `translate3d(${-Math.round(DG.x)}px,0,0)`; }
  // проходы, по которым сейчас голосуют: подсветка при наведении, номер и голоса над дверью; итог — ✓ над выбранным
  function dgMarks(v) {
    if (!DG.el || !DG.L) return;
    const g = v.dgn, V = g.vote && g.vote.mode !== 'ring' ? g.vote : null, live = !!(V && !V.done), can = live && v.party === 'in';
    const by = {}; if (V) for (const o of V.opts) by[o[1]] = o;
    DG.el.querySelectorAll('.dg-ex').forEach((x) => { const o = by[x.dataset.k], c = !!(o && can); x.classList.toggle('can', c); x.classList.toggle('me', !!(o && V.my === o[0]));
      if (c) { x.setAttribute('role', 'button'); x.setAttribute('aria-label', `${o[0]} · ${o[2]}`); } else { x.removeAttribute('role'); x.removeAttribute('aria-label'); } });
    DG.el.querySelectorAll('.q-dgk').forEach((m) => { const o = by[m.dataset.k], show = !!(V && o && (live || V.win === o[0]));
      if (m.hidden === show) m.hidden = !show;
      if (show) { const t = V.done ? '✓' : String(o[0]), c = V.done ? '' : String(o[4]); if (m.firstChild.textContent !== t) m.firstChild.textContent = t; if (m.lastChild.textContent !== c) m.lastChild.textContent = c; m.classList.toggle('me', V.my === o[0]); m.classList.toggle('sel', !!V.done); } });
  }
  function dgMount(el, v) {
    const view = el.querySelector('[data-dgv]'); if (!view) return;
    const g = v.dgn, key = `${g.name}|${g.at}|${g.room ? g.room.seed || '' : ''}`;
    if (key !== DG.key || !DG.el) {
      if (!(window.MDDoodle && window.MDDoodle.dungeonBuild) && X.dungeon) { DG.el = null; DG.key = ''; view.innerHTML = '<div class="q-dgn">Комната загружается…</div>'; X.dungeon().then(() => { keyTab = ''; paint(); }).catch(() => {}); return; }
      DG.key = key; DG.x = 0; DG.said = {}; cancelAnimationFrame(DG.raf);
      const b = dgBuild(g); DG.el = b.el; DG.L = b.L; DG.W = b.W || 1920;
    }
    if (DG.el.parentNode !== view) { view.innerHTML = ''; view.appendChild(DG.el); }
    dgInput(view);
    dgFit(view); dgMarks(v);
  }
  // ввод: тянуть сцену (мышь, палец) — как в «Городе»: порог 6 px, захват указателя; после отпускания — инерция; короткое нажатие — клик.
  // Обработчики — на узле сцены (DG.el): он переживает перерисовку вкладки
  function dgInput(view) {
    const el = DG.el; if (!el || el._in) return; el._in = 1;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !DG.L) return;
      cancelAnimationFrame(DG.raf); DG.vx = 0;
      DG.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cam: DG.x, moved: false, lx: e.clientX, lt: performance.now() };
    });
    el.addEventListener('pointermove', (e) => {
      const d = DG.drag; if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { d.moved = true; try { el.setPointerCapture(e.pointerId); } catch (er) { /* */ } el.classList.add('drag'); }
      if (!d.moved && Math.abs(dy) > 10) { DG.drag = null; return; }   // палец ведёт вверх-вниз — это прокрутка страницы
      if (d.moved) { const t = performance.now(); DG.vx = 0.7 * DG.vx + 0.3 * ((d.lx - e.clientX) / Math.max(1, t - d.lt)); d.lx = e.clientX; d.lt = t; dgCam(d.cam - dx); }
    });
    const up = (e) => {
      const d = DG.drag; if (!d || d.id !== e.pointerId) return;
      DG.drag = null; el.classList.remove('drag');
      if (e.type === 'pointercancel') return;
      if (d.moved) { dgGlide(); return; }
      const hit = e.target.closest && e.target.closest('.dg-ex, .dg-npc'); if (!hit) return;
      if (hit.classList.contains('dg-npc')) { dgSay(hit); return; }
      if (hit.classList.contains('can')) { if (e.pointerType !== 'mouse') { hit.classList.add('tap'); setTimeout(() => hit.classList.remove('tap'), 1300); } dgVote(hit.dataset.k); }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { const dx = e.shiftKey ? e.deltaY : e.deltaX; if (!dx || !DG.L) return; e.preventDefault(); cancelAnimationFrame(DG.raf); dgCam(DG.x + dx); }, { passive: false });
    if (!DG.kb) { DG.kb = 1; document.addEventListener('keydown', (e) => { if (!e.target.closest || !e.target.closest('[data-dgv]')) return; const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (k) { e.preventDefault(); dgPan(k); } });
      window.addEventListener('resize', () => { if (DG.el && DG.el.isConnected) dgFit(DG.el.parentNode); }); }
  }
  function dgGlide() {
    let v = Math.max(-3, Math.min(3, DG.vx)), t0 = performance.now();
    const step = (t) => { const dt = Math.min(40, t - t0); t0 = t; v *= Math.pow(0.94, dt / 16); if (Math.abs(v) < 0.02) return; const x0 = DG.x; dgCam(DG.x + v * dt); if (DG.x === x0) return; DG.raf = requestAnimationFrame(step); };
    if (Math.abs(v) > 0.05) DG.raf = requestAnimationFrame(step);
  }
  function dgPan(dir) {
    const view = DG.el && DG.el.parentNode; if (!view) return;
    const from = DG.x, to = Math.max(0, Math.min(dgMax(), from + dir * view.clientWidth * 0.6)), t0 = performance.now();
    cancelAnimationFrame(DG.raf);
    const step = (t) => { const p = Math.min(1, (t - t0) / 350), e = 1 - Math.pow(1 - p, 3); dgCam(from + (to - from) * e); if (p < 1) DG.raf = requestAnimationFrame(step); };
    DG.raf = requestAnimationFrame(step);
  }
  function dgVote(key) {
    const v = view(), g = v && v.dgn, V = g && g.vote; if (!V || V.done) return;
    const o = V.opts.find((x) => x[1] === key); if (o) castVote(V.id, o[0]);
  }
  // голос кликом (проход данжа или вариант «Куда идём?»): сразу «твой голос», ошибка игры — уведомлением
  async function castVote(vid, n) {
    if (!X.vote || !vid || !n) return;
    const was = PV; PV = { vid, n, t: Date.now() };
    const hi = qaOn() ? histAdd(`голос ${n}`, 'wait', { btn: 1 }) : null; keyTab = ''; paint();
    const r = await X.vote(vid, n);
    if (hi) histSet(hi, r && r.ok !== false ? 'ok' : 'no', r && r.ok !== false ? 'голос принят' : (r && r.error) || 'голос не принят');
    if (!r || r.ok === false) { PV = was && was.vid === vid ? was : null; keyTab = ''; paint(); if (X.toast) X.toast((r && r.error) || 'Голос не принят', true); }
  }
  // житель (проводник): реплика пузырём над ним — только у этого зрителя, ~4 с; реплики — по кругу, без повтора подряд
  function dgSay(n) {
    const L = DG.L, b = DG.el && DG.el.querySelector('.q-dgb'); if (!L || !b) return;
    const id = n.dataset.npc, P = (L.npcs || []).find((x) => x.id === id); if (!P || !P.lines || !P.lines.length) return;
    let q = DG.said[id];
    if (!q || !q.length) { q = P.lines.map((_, i) => i); for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } if (q.length > 1 && q[q.length - 1] === DG.last) q.unshift(q.pop()); DG.said[id] = q; }
    const i = q.pop(); DG.last = i;
    b.textContent = P.lines[i]; b.style.left = (P.x / DG.W * 100).toFixed(3) + '%'; b.style.top = (P.y / 1080 * 100).toFixed(3) + '%';
    b.hidden = false; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    n.classList.add('tap'); clearTimeout(DG.bubT);
    DG.bubT = setTimeout(() => { b.classList.remove('on'); n.classList.remove('tap'); setTimeout(() => { if (!b.classList.contains('on')) b.hidden = true; }, 250); }, 4000);
  }
  function lootHtml(v) {
    const L = v.loot;
    return `<div class="q-stage"><b>Делёж вещи · <span data-until="${L.until}"></span> с</b><span>голосов ${L.n}</span></div><section class="q-card"><p class="q-big">${esc(L.name)}</p><p>${L.my ? `${svgI('check', 'ok')} твой голос учтён` : 'Пиши в чат, кому отдать вещь (номер или ник), или «случайно»'}</p></section>`;
  }

  /* ---------- 25.10: КНОПКИ ПОХОДА (тестерам — флаг qa у героя, questActPublic; docs/QUEST-TAB.md, «Кнопки») ----------
     Кнопка = та же команда чата (комната: quest/siteact.js), чат остаётся запасным. Одно действие в пути: после нажатия кнопки
     «отправлено…», пока игра не подтвердит (ход в виде боя, ответ комнаты) — повторно не нажать. Обработчик кликов — один на вкладку
     (делегирование): перерисовка вкладки кнопки не пересобирает обработчики. Выбор цели и стороны — в памяти страницы. */
  const QA = { pend: null, sel: { t: '', lead: false, s: '' }, sum: null, ok: null, n: { bet: 20, don: 50 }, dig: '', bound: false };
  const qaOn = () => !!(X && X.act && X.hero() && X.hero().qa);
  const qaData = (o) => esc(JSON.stringify(o));
  const qaBusy = () => !!(QA.pend && Date.now() - QA.pend.at < 9000);
  // 26.10 (стример): состояние нажатой кнопки - «отправлено» (контур), «принято» (зелёная), отказ (красная, коротко)
  const qaSig = (o) => { const { _l, ...x } = o; return JSON.stringify(x); };
  const qaSt = (o) => { const g = qaSig(o), t = Date.now(); return QA.pend && QA.pend.sig === g && qaBusy() ? ' wait' : QA.bad && QA.bad.sig === g && t - QA.bad.at < 2500 ? ' bad' : QA.okb && QA.okb.sig === g && t - QA.okb.at < 12000 ? ' ok' : ''; };
  const qaBtn = (o, label, cls, dis, aria) => `<button type="button" class="qa-b ${cls || ''}${qaSt(o)}" data-qa="${qaData(o)}"${dis || qaBusy() ? ' disabled' : ''}${aria ? ` aria-label="${esc(aria)}"` : ''}>${label}</button>`;
  const qaPendLine = () => (qaBusy() ? `<p class="qa-st wait" role="status">${svgI('clock')} отправлено: ${esc(QA.pend.label)}…</p>` : '');
  /** Своё участие: сразу после «принято» (вступил / покинул) - по ответу игры, пока запоздавший вид не догонит. */
  function partyOf(v) {
    const m = QA.me; if (!m) return v.party;
    const vp = v.party === 'in' || v.party === 'q' || v.party === 'ghost' ? v.party : 'out';
    if (vp === m.p || Date.now() - m.at > 30000) { QA.me = null; return v.party; }
    return m.p;
  }
  const qaOkLine = (k) => (QA.ok && QA.ok.k === k && Date.now() - QA.ok.at < 12000 ? `<p class="qa-st ok" role="status">${svgI('check', 'ok')} принято: ${esc(QA.ok.t)}</p>` : '');
  const ROLE_HEAL = Object.fromEntries(GD.classes().filter((c) => c.kind === 'heal').map((c) => [c.id, 1]));
  const SIDE_BTN = { L: '⬅ слева', R: 'справа ➡', F: '⬆ вдали' };
  const STAT_RU = { atk: 'сила', mag: 'магия', def: 'защита', hp: 'здоровье' }, stRu = (k) => STAT_RU[k] || k;
  const pct = (x) => Math.round(Math.max(0, Math.min(1, +x || 0)) * 100);
  const nmOf = (b, l) => { if (l === X.login()) return 'себя'; const x = (b.low || []).find((y) => y[0] === l); return x ? x[1] : l; };
  async function qaSend(p, label, k) {
    if (qaBusy()) return;
    const hi = qaOn() ? histAdd(label, 'wait', { btn: 1 }) : null;   // 26.10 (стример): нажатие - строкой в «предыдущих командах», с ответом игры
    QA.pend = { label, at: Date.now(), k: k || p.k, id: '', sig: qaSig(p), hi }; keyTab = ''; paint();
    const r = await X.act(p);
    if (!r || r.ok === false) { QA.pend = null; QA.bad = { sig: qaSig(p), at: Date.now() }; if (hi) histSet(hi, 'no', (r && r.error) || 'не вышло'); keyTab = ''; paint(); if (X.toast) X.toast((r && r.error) || 'Не вышло', true); return; }
    if (QA.pend) QA.pend.id = r.id || '';
    if (hi) hi.id = r.id || '';
    setTimeout(() => { if (QA.pend && Date.now() - QA.pend.at >= 9000) { QA.pend = null; keyTab = ''; paint(); } }, 9100);
  }
  // ответ игры (комнаты) на нажатие — из results живого канала (app.js): отказ — уведомлением, принято — строкой под кнопками
  function qaResult(r) {
    if (!r) return;
    if (r.x && r.x.k === 'say') { sayResult(r); return; }   // 26.10: ответ на строку «Команда в поход»
    const mine = QA.pend && (!QA.pend.id || QA.pend.id === r.id), k = (r.x && r.x.k) || (QA.pend && QA.pend.k) || '';
    const P0 = mine ? QA.pend : null;
    if (mine) QA.pend = null;
    const hi = SAY.hist.find((x) => x.btn && x.id && x.id === r.id) || (P0 && P0.hi);
    if (hi) histSet(hi, r.ok ? 'ok' : 'no', r.ok ? (k === 'b' ? 'принято - ждём хода' : `принято${r.x && r.x.t && r.x.t !== hi.line ? ' · ' + r.x.t : ''}`) : (r.error || 'игра не приняла'));
    if (P0 && P0.sig) { if (r.ok && k !== 'b') QA.okb = { sig: P0.sig, at: Date.now() }; else if (!r.ok) QA.bad = { sig: P0.sig, at: Date.now() }; }
    if (!r.ok) { if (X.toast) X.toast(r.error || 'Игра не приняла действие', true); }
    else if (k !== 'b') QA.ok = { k, t: (r.x && r.x.t) || 'готово', at: Date.now() };
    // 26.10 (стример: «нажал покинуть - кнопка ещё несколько секунд прежняя»): вид похода приходит с задержкой стрима -
    // своё вступление / выход показываем сразу, пока вид не догонит (до 30 с)
    if (r.ok && (k === 'join' || k === 'leave')) QA.me = { p: k === 'leave' ? 'out' : (r.x && (r.x.queued || r.x.t === 'очередь')) ? 'q' : 'in', at: Date.now() };
    keyTab = ''; paint();
  }
  // в бою «принято» видно по самому бою (ход, слово) — ждать ответа комнаты не нужно
  function qaSeen(v) {
    if (!QA.pend || QA.pend.k !== 'b' || !v || !v.b) return;
    if ((QA.pend.block && v.b.tele && v.b.tele.ok) || (!QA.pend.block && v.b.turn)) { QA.pend = null; keyTab = ''; }
  }
  function qaBind(el) {
    if (QA.bound || !el) return; QA.bound = true;
    el.addEventListener('input', (e) => {   // 26.10: ползунок ставки - только подписи и кнопка, без перерисовки вкладки (палец не срывается)
      const r = e.target.closest && e.target.closest('[data-qbet]'); if (!r) return;
      const n = QA.n.bet = +r.value, box = r.closest('.q-card') || el;
      const v1 = box.querySelector('[data-qbetv]'), v2 = box.querySelector('[data-qbetb]'), b = v2 && v2.closest('[data-qa]');
      if (v1) v1.innerHTML = X.money(n); if (v2) v2.innerHTML = X.money(n);
      if (b) b.dataset.qa = JSON.stringify({ k: 'ev', a: 'bet', n, _l: 'ставка ' + n });
      box.querySelectorAll('[data-qsel^="bet|"]').forEach((c) => { const on = +c.dataset.qsel.split('|')[1] === n; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
    });
    el.addEventListener('click', (e) => {
      const jv = e.target.closest && e.target.closest('.q-jr [data-view]'); if (jv) { if (X.jrAll) X.jrAll(); return; }   // 26.10: «Весь журнал» - вкладка «Персонаж» → журнал
      const jt = e.target.closest && e.target.closest('[data-qjt]'); if (jt) { QA.jt = jt.dataset.qjt; paint(); return; }   // 26.10: журнал - «Бой» / «Мой»
      const lv = e.target.closest && e.target.closest('[data-qleave]');   // 26.10 (стример): «покинуть отряд?» - вторым нажатием за 4 с
      if (lv) { if (lv.disabled) return; if (QA.leave && Date.now() - QA.leave < 4000) { QA.leave = 0; qaSend({ k: 'leave' }, 'покинуть отряд', 'leave'); return; } QA.leave = Date.now(); paint(); setTimeout(() => { if (QA.leave && Date.now() - QA.leave >= 3900) { QA.leave = 0; paint(); } }, 4050); return; }
      const b = e.target.closest && e.target.closest('[data-qa], [data-qsel], [data-qdig], [data-qpb], [data-qhw]'); if (!b || b.disabled || !el.contains(b)) return;
      if (b.dataset.qhw) { const k = b.dataset.qhw; if (k === '<') HWC.ch.pop(); else if (HW_STEP[k] && HWC.ch.length < 12) HWC.ch.push(k); keyTab = ''; paint(); return; }   // 28.10: пляска Изнанки - цепочка па
      if (b.dataset.qpb) { pbClick(b); return; }   // 26.10: кнопка места - строкой
      if (b.dataset.qsel) { const [k, v0] = b.dataset.qsel.split('|'); if (k === 'lead') QA.sel.lead = !QA.sel.lead; else if (k === 't') QA.sel.t = QA.sel.t === v0 ? '' : v0; else if (k === 's') QA.sel.s = QA.sel.s === v0 ? '' : v0; else if (k === 'bet') QA.n.bet = +v0; else if (k === 'don') QA.n.don = +v0; keyTab = ''; paint(); return; }
      if (b.dataset.qdig) { const d = b.dataset.qdig; if (d === 'x') QA.dig = ''; else if (d === '<') QA.dig = QA.dig.slice(0, -1); else if (QA.dig.length < 14) QA.dig += d; keyTab = ''; paint(); return; }
      let o; try { o = JSON.parse(b.dataset.qa); } catch (er) { return; }
      const label = o._l || 'действие'; delete o._l;
      if (o.k === 'eat') { if (X.eat) X.eat(o.uid, b); return; }
      if (o.s === '#dig') { o.s = QA.dig; QA.dig = ''; }
      qaSend(o, label, o.k); if (o.k === 'b' && QA.pend) QA.pend.block = o.a === 'block';
    });
  }
  // итог раунда: последний свой итог хода (удар, лечение, урон по мне) — держим до следующего, чтобы успеть прочитать
  function qaSum(b) {
    const t = lastLine(b); if (t && b.mine) { const key = `${b.id}:${b.mine.r}:${b.mine.k}`; if (!QA.sum || QA.sum.key !== key) QA.sum = { key, id: b.id, r: b.mine.r, parts: QA.sum && QA.sum.id === b.id && QA.sum.r === b.mine.r ? [...QA.sum.parts.filter((p) => p.k !== b.mine.k), { k: b.mine.k, t }] : [{ k: b.mine.k, t }] }; }
    return QA.sum && QA.sum.id === b.id ? QA.sum : null;
  }
  const turnLine = (b) => {
    if (!b.turn) return '';
    const tg = b.tg || [], who = tg[0] === 'lead' ? 'вожак' : tg[0] ? nmOf(b, tg[0]) : '', sd = tg[1] ? { L: 'слева', R: 'справа', F: 'вдали' }[tg[1]] : '';
    return `${svgI('check', 'ok')} ход принят: <b>${esc(turnRu(b.turn))}</b>${who ? ` → ${esc(who)}` : ''}${sd ? ` · ${sd}` : ''}`;
  };
  // панель действий в бою (ход отряда — удар, умения, цель, сторона; ход врага — «Блок»)
  function qaBattle(v, b, m) {
    const S = qaSum(b), sum = S ? `<div class="qa-sum"><b>Итог раунда ${S.r}</b>${S.parts.map((p) => `<span>${p.t}</span>`).join('')}</div>` : '';
    if (b.st === 'end') return sum ? `<section class="q-card qa">${sum}</section>` : '';
    if (!(m.st === 'on' || m.st === 'reserve' || (m.st === 'out' && v.party === 'in'))) return sum ? `<section class="q-card qa">${sum}</section>` : '';
    const gb = b.gb, role = m.role, rows = [];
    let head = '', body = '';
    if (b.st === 'tele' && b.tele) {
      head = `Ход врага · <span data-until="${b.until}"></span> с`;
      body = `<p class="q-big">${esc(b.tele.text || 'Враг атакует!')}</p><p class="muted">${b.tele.got} из ${b.tele.need} нужных</p>` + (b.tele.ok ? `<p class="qa-st ok">${svgI('check', 'ok')} слово принято</p>` : `<div class="q-ncw"><span>Напечатай в строке внизу:</span>${wd(b.tele.word, 'big')}</div>`);   // 26.10 (решение стримера): ход врага - только строка; слово - без копирования
    } else if (b.st === 'party') {
      head = `Твой ход · <span data-until="${b.until}"></span> с`;
      if (b.turn && !SCH) body = `<p class="qa-st ok">${turnLine(b)}</p>`;
      else if (gb && gb.forbid) body = '<p class="qa-st">Босс запретил прямые слова - пиши в чат синонимом</p>';
      else {
        const base = BASE_CMD[role] || 'удар', heal = !!ROLE_HEAL[role], fronts = b.cr && b.cr.fr && b.cr.fr.length > 1 ? b.cr.fr : b.two ? ['L', 'R'] : [];
        const leadOn = !gb && b.foes.some((f) => f[2] && f[3] > 0) && (base === 'удар' || base === 'выстрел');
        // 26.10 (стример): «вожак» - сторона только та, где вожаки есть; вожак один (одна сторона) - выбора стороны нет
        const lead = QA.sel.lead && leadOn, leadSides = [...new Set(b.foes.filter((f) => f[2] && f[3] > 0).map((f) => f[0]))];
        const fr2 = lead ? fronts.filter((s) => leadSides.includes(s)) : fronts;
        const tgt = QA.sel.t, side = fr2.length > 1 && fr2.includes(QA.sel.s) ? QA.sel.s : '';
        const pick = (o) => ({ ...o, ...(side && o.a !== 'heal' ? { s: side } : {}) });
        const mainP = heal ? { k: 'b', a: 'base', ...(tgt ? { t: tgt } : {}) } : pick({ k: 'b', a: 'base', ...(QA.sel.lead && leadOn ? { t: 'lead' } : {}) });
        const mainL = `${base}${heal && tgt ? ` → ${nmOf(b, tgt)}` : QA.sel.lead && leadOn ? ' → вожак' : ''}${side && !heal ? ` · ${SIDE_BTN[side]}` : ''}`;
        // 26.10 (стример): ход принят - нажатая кнопка зелёная до нового раунда, остальные - выключены (ход один)
        const T = b.turn, tsk = T && SKN()[T], tOk = (w) => !!(T && (w === 'base' ? !tsk && !(role === 'priest' && T === 'melee') : w === 'melee' ? T === 'melee' : tsk && tsk.name.toLowerCase() === String(w).toLowerCase()));
        rows.push(qaBtn({ ...mainP, _l: mainL }, `${heal ? '✚' : base === 'выстрел' ? '🏹' : base === 'магия' ? '✨' : '⚔️'} ${esc(mainL)}`, `main big${tOk('base') ? ' ok' : ''}`, !!T));
        if (role === 'priest') rows.push(qaBtn(pick({ k: 'b', a: 'melee', _l: 'удар' }), '⚔️ удар', tOk('melee') ? 'ok' : '', !!T));
        for (const [w, cd, kind] of b.sk || []) {
          const s = skName(w), hk = kind === 'heal', o = hk ? { k: 'b', a: 'sk', w, ...(tgt ? { t: tgt } : {}) } : pick({ k: 'b', a: 'sk', w });
          rows.push(qaBtn({ ...o, _l: w + (hk && tgt ? ` → ${nmOf(b, tgt)}` : '') }, `${s ? s.icon + ' ' : ''}${esc(w)}${cd ? `<small>через ${cd} ${plural(cd, 'ход', 'хода', 'ходов')}</small>` : '<small>готово</small>'}`, cd ? 'cd' : tOk(w) ? 'sk ok' : 'sk', !!cd || !!T, cd ? `${w}: через ${cd} ${plural(cd, 'ход', 'хода', 'ходов')}` : `${w}: готово`));
        }
        body = `<div class="qa-row">${rows.join('')}</div>`;
        const healAny = heal || (b.sk || []).some((x) => x[2] === 'heal');
        if (healAny) {
          const me = X.login(), al = (b.low || []).filter((x) => x[0] !== me).slice(0, 6);
          body += `<div class="qa-sel" role="group" aria-label="Кого лечить"><span>Кого лечить:</span>${[['', 'самого раненого'], [me, 'себя'], ...al.map((x) => [x[0], `${x[1]} · ${pct(x[2])}%`])].map(([l, t]) => `<button type="button" class="qa-c${tgt === l ? ' on' : ''}" data-qsel="t|${esc(l)}" aria-pressed="${tgt === l}">${esc(t)}</button>`).join('')}</div>`;
        }
        if (leadOn) body += `<div class="qa-sel" role="group" aria-label="Цель удара"><span>Цель:</span><button type="button" class="qa-c${!QA.sel.lead ? ' on' : ''}" data-qsel="lead|0" aria-pressed="${!QA.sel.lead}">рядовые</button><button type="button" class="qa-c${QA.sel.lead ? ' on' : ''}" data-qsel="lead|1" aria-pressed="${QA.sel.lead}">вожак</button></div>`;
        if (fr2.length > 1 && !heal) body += `<div class="qa-sel" role="group" aria-label="Сторона"><span>Сторона:</span><button type="button" class="qa-c${!side ? ' on' : ''}" data-qsel="s|" aria-pressed="${!side}">своя${m.side ? ` (${SIDE_BTN[m.side] || ''})` : ''}</button>${fr2.map((s) => `<button type="button" class="qa-c${side === s ? ' on' : ''}" data-qsel="s|${s}" aria-pressed="${side === s}">${SIDE_BTN[s]}</button>`).join('')}</div>`;
      }
    } else head = b.st === 'mech' ? 'Механика босса - отвечай в чат по экрану' : b.st === 'intro' ? 'Бой начинается…' : 'Удары - жди следующего хода';
    // 26.10 (стример: «строка дважды»): стадия с таймером уже в полосе над карточкой - здесь не повторяем; пустая карточка - не рисуем
    const dup = /^(Твой ход|Ход врага|Ход босса|Бой начинается|Удары)/.test(String(head).replace(/<[^>]*>/g, ''));
    if (dup && !body && !sum && !qaBusy()) return '';
    return `<section class="q-card qa"><div class="q-ch">${dup ? '' : `<b>${head}</b>`}<span class="muted">кнопки = команды чата, чат тоже работает</span></div>${qaPendLine()}${body}${sum}</section>`;
  }
  // карточка генерированного босса вместо схемы отряда (строя у босса нет): имя, фаза, здоровье, идущая механика
  function qaBoss(b) {
    const g = b.gb, M = g.mech;
    return `<section class="q-card q-boss"><div class="q-ch"><b>${esc(g.name)}${g.title ? ` · ${esc(g.title)}` : ''}</b><span class="muted">фаза ${g.phase} из ${g.phases}${b.maxR ? ` · ход ${b.round} из ${b.maxR}` : ''}</span></div>`
      + `<div class="q-hp big" role="img" aria-label="Здоровье босса ${pct(g.hp)}%"><i style="width:${Math.max(1, pct(g.hp))}%" class="foe"></i></div><p class="muted">здоровье босса ${pct(g.hp)}%</p>`
      + `${M ? `<div class="qa-mech"><b>${esc(M.icon || '⚠')} ${esc(M.name || 'Механика')}</b>${M.text ? `<span>${ncText(M.text)}</span>` : ''}<small>${qaOn() ? 'пиши в строке команд внизу - как на экране' : 'отвечай в чат - как на экране'}</small></div>` : ''}${g.forbid ? '<p class="q-dg">⚠ Босс запретил прямые слова - пиши в чат синонимом</p>' : ''}</section>`;
  }
  // панель героя: здоровье (числом, как в «Персонаже» — то же значение), баффы с таймером, еда и зелья в один клик
  function qaHero(v) {
    const h = X.hero(); if (!h) return '';
    const hpMax = (h.stats && h.stats.hp) || 0, hp = h.ghost ? 0 : Math.max(0, Math.min(hpMax, h.hpNow ?? hpMax)), k = hpMax ? hp / hpMax : 0;
    const bf = (h.bf || []).filter((x) => +x[3] > X.now());
    const food = new Map();
    for (const it of h.items || []) { if (it.on || it.wearable || !(it.slot === 'food' || it.slot === 'potion') || !it.effect || it.effect.revive) continue; const f = food.get(it.id); if (f) f.n++; else food.set(it.id, { it, n: 1 }); }
    const eatCd = h.eatUntil && h.eatUntil > X.now() ? h.eatUntil : 0;
    const eff = (e) => [e.heal ? `+${e.heal} ❤` : '', e.buff ? `${stRu(e.buff.stat)} +${e.buff.add}` : ''].filter(Boolean).join(' · ');
    const fl = [...food.values()].slice(0, 6).map(({ it, n }) => `<li><span class="qa-fi">${qaArt(it)}</span><span class="qa-fn"><b>${esc(it.name)}${n > 1 ? ` ×${n}` : ''}</b><small>${esc(eff(it.effect))}</small></span>${h.ghost ? '' : `<button type="button" class="qa-b sm" data-qa="${qaData({ k: 'eat', uid: it.uid })}"${eatCd ? ' disabled' : ''}>${it.slot === 'potion' || it.drink ? 'Выпить' : 'Съесть'}</button>`}</li>`).join('');
    QA.rtEnd = Math.min(...[eatCd || Infinity, ...bf.map((x) => +x[3])]);
    // 26.10 (п. 35): персонаж всегда на вкладке - рисунок, надетое и сумка компактно (еда и зелья - кликом, как в «Персонаже»)
    const items = h.items || [], worn = items.filter((it) => it.on).slice(0, 8), bag = items.filter((it) => !it.on).slice(0, 40);
    const cell = (it, eat) => `<li${it.rarity ? ` data-r="${esc(it.rarity)}"` : ''}>${eat && !h.ghost ? `<button type="button" class="q-bi" data-qa="${qaData({ k: 'eat', uid: it.uid })}"${eatCd ? ' disabled' : ''} aria-label="${esc((it.slot === 'potion' || it.drink ? 'Выпить: ' : 'Съесть: ') + it.name)}">` : `<span class="q-bi" role="img" aria-label="${esc(it.name)}">`}${qaArt(it)}${it.n > 1 ? `<i>×${+it.n}</i>` : ''}${eat && !h.ghost ? '</button>' : '</span>'}</li>`;
    const isFood = (it) => !it.wearable && (it.slot === 'food' || it.slot === 'potion') && it.effect && !it.effect.revive;
    const inB = !!(v && v.b);   // 26.10 (стример: «дважды персонаж»): в бою герой уже нарисован в карточке боя - здесь без рисунка и полоски
    const kit = `<div class="q-kit">${inB ? '' : `<div class="q-kd">${dd('stern')}</div>`}<div class="q-km">${worn.length ? `<p class="muted">Надето</p><ul class="q-bag worn">${worn.map((it) => cell(it, false)).join('')}</ul>` : ''}${bag.length ? `<p class="muted">Сумка · ${bag.length}${eatCd ? ` · еда - через <i data-rt="${eatCd}"></i>` : ' · еда и зелья - нажми'}</p><ul class="q-bag">${bag.map((it) => cell(it, isFood(it))).join('')}</ul>` : ''}</div></div>`;
    return `<section class="q-card qa-hero"><div class="q-ch"><b>Мой герой</b><span class="muted">${h.ghost ? 'призрак' : `${hp} / ${hpMax} ❤`}</span></div>${h.ghost || inB ? '' : hpBar(k)}${kit}`
      + (bf.length ? `<ul class="qa-bf" aria-label="Баффы">${bf.map((x) => `<li><b>${esc(x[0] || x[1])}</b><span>${esc(stRu(x[1]))} +${+x[2]}</span><i data-rt="${+x[3]}"></i></li>`).join('')}</ul>` : '')
      + (X.jrHtml ? `<div class="q-jr">${X.jrHtml()}</div>` : '')   // 26.10 (стример): журнал - награды за места и всё, что пишет «Журнал»
      + (fl ? `<div class="q-ch"><b>Еда и зелья</b><span class="muted">${eatCd ? `ещё не готово · <i data-rt="${eatCd}"></i>` : 'в один клик'}</span></div><ul class="qa-food">${fl}</ul>` : '')
      + '</section>';
  }
  // рисунок вещи — один раз на вещь (вкладка перерисовывается часто — рисунки не пересобираем)
  const ART = new Map();
  // 26.10: пустой рисунок (рисунки стиля ещё не загрузились) не запоминаем - иначе вещь так и остаётся пустой ячейкой до перезагрузки
  function qaArt(it) { const k = `${it.id}|${it.rarity || ''}`; let a = ART.get(k); if (a == null) { try { a = X.art ? X.art(it) || '' : ''; } catch (e) { a = ''; } if (a) { ART.set(k, a); if (ART.size > 60) ART.delete(ART.keys().next().value); } } return a; }
  // вступить / покинуть отряд (вне остановки: «вступить» — в очередь до остановки, «покинуть» — не показываем)
  // said - строка «ты в отряде / в очереди / призрак» уже есть выше (карточка места): здесь её не повторяем (26.10, стример)
  function qaSquad(v, said) {
    if (v.b && v.b.st !== 'end') return '';
    const p = partyOf(v);
    let row = '';
    if (p === 'in') { if (v.cm === false) return ''; row = qaBtn({ k: 'leave', _l: 'покинуть отряд' }, 'Покинуть отряд', 'warn'); }
    else if (p === 'ghost') row = said ? '' : '<p class="muted">Твой герой - призрак: в поход - после воскрешения.</p>';
    else if (p === 'q') row = said ? '' : '<p class="muted">Ты в очереди: вступишь, когда отряд остановится.</p>';
    else row = qaBtn({ k: 'join', _l: 'вступить в поход' }, v.cm === false ? 'Встать в очередь в отряд' : 'Вступить в поход', 'main');
    const st = `${qaPendLine()}${qaOkLine('join') || qaOkLine('leave')}`;
    if (!row && !st) return '';
    return `<section class="q-card qa">${st}${row ? `<div class="qa-row">${row}</div>` : ''}</section>`;
  }
  // событие: путник (помочь / обобрать), кости (ставка), колодец (монета), жрец (дар, обряды, воскресить)
  function qaEvent(v) {
    const E = v.ev; if (!E) return '';
    const can = v.party === 'in' || E.look === 'priest', said = E.said && E.said.text ? `<p class="qa-said">«${esc(E.said.text)}»</p>` : '';
    let h = `<div class="q-stage"><b>${esc(E.icon)} ${esc(E.name)}${E.st === 'vote' && E.until ? ` · <span data-until="${E.until}"></span> с` : ''}</b><span>${E.look === 'traveler' && E.votes ? `помочь ${E.votes.help} · обобрать ${E.votes.rob}` : E.look === 'dice' ? `у бродяги ${X.money(E.purse)}` : E.look === 'well' ? `монет ${E.thrown} из ${E.need}` : E.look === 'priest' ? `в чаше ${X.money(E.pool)}` : ''}</span></div>`;
    let rows = '';
    if (!can) rows = '<p class="muted">Участвует только отряд.</p>';
    else if (E.look === 'traveler') rows = E.st === 'vote' ? `<div class="qa-row">${qaBtn({ k: 'ev', a: 'help', _l: 'помочь' }, '🤝 Помочь', E.my === 'help' ? 'main on' : 'main', E.my === 'help')}${qaBtn({ k: 'ev', a: 'rob', _l: 'обобрать' }, '💰 Обобрать', E.my === 'rob' ? 'warn on' : 'warn', E.my === 'rob')}</div>${E.my ? `<p class="qa-st ok">${svgI('check', 'ok')} твой выбор: ${E.my === 'help' ? 'помочь' : 'обобрать'} - можно передумать</p>` : ''}` : '';
    // 26.10 (п. 20): кости - одна кнопка «Играть» (ставка 30; другая - строкой «ставка N») и свои игры; про шулера - ни слова
    // 26.10 (стример): ставка - ползунком и быстрыми суммами (5…200, не больше кошелька бродяги и своего; правила - в игре: events.js BET_MIN/BET_MAX)
    else if (E.look === 'dice') { const h = X.hero() || {}, mx = Math.max(5, Math.min(200, +E.purse || 200, h.money != null ? +h.money || 5 : 200));
      const bet = QA.n.bet = Math.max(5, Math.min(mx, Math.round(+QA.n.bet || 30)));
      const chips = [10, 30, 50, 100].filter((n) => n < mx).concat([mx]);
      rows = (E.st === 'on' ? `<div class="qa-bet"><label class="qa-bl"><span>Ставка</span><input type="range" class="qa-rng" data-qbet min="5" max="${mx}" step="5" value="${bet}" aria-label="Ставка в костях"${E.used >= 3 ? ' disabled' : ''}><b data-qbetv>${X.money(bet)}</b></label>`
        + `<div class="qa-sel" role="group" aria-label="Быстрая ставка">${chips.map((n) => `<button type="button" class="qa-c${n === bet ? ' on' : ''}" data-qsel="bet|${n}" aria-pressed="${n === bet}">${n === mx && n !== 10 && n !== 30 && n !== 50 && n !== 100 ? 'макс' : n}</button>`).join('')}</div></div>`
        + `<div class="qa-row">${qaBtn({ k: 'ev', a: 'bet', n: bet, _l: 'ставка ' + bet }, `🎲 Играть · <span data-qbetb>${X.money(bet)}</span>`, 'main big', E.used >= 3)}</div><p class="muted">Твой d20 против бродяги · игр ${E.used} из 3</p>` : '<p class="muted">Бродяга больше не играет.</p>')
      + (E.gm && E.gm.length ? `<ul class="q-dice" aria-label="Твои игры">${E.gm.map(([me, him, r, n]) => `<li class="${r}"><span>🎲${me} против 🎲${him}</span><b>${r === 'win' ? `выиграл ${X.money(n)}` : r === 'tie' ? 'ничья - ставка вернулась' : `проиграл ${X.money(n)}`}</b></li>`).join('')}</ul>` : ''); }
    else if (E.look === 'well') rows = `<div class="qa-row">${qaBtn({ k: 'ev', a: 'coin', _l: 'монета' }, `🪙 Бросить монету · ${X.money(10)}`, 'main', E.filled || E.used >= 3)}</div><p class="muted">Брошено тобой ${E.used} из 3${E.filled ? ' · колодец полон' : ''}</p>`;
    else if (E.look === 'priest') {
      const P = E.prices || {};
      rows = `<div class="qa-sel" role="group" aria-label="Дар"><span>Дар в чашу:</span>${[20, 50, 100, 500].map((n) => `<button type="button" class="qa-c${QA.n.don === n ? ' on' : ''}" data-qsel="don|${n}" aria-pressed="${QA.n.don === n}">${X.money(n)}</button>`).join('')}</div>`
        + `<div class="qa-row">${qaBtn({ k: 'ev', a: 'donate', n: QA.n.don, _l: `пожертвовать ${QA.n.don}` }, '🕯 Пожертвовать', 'main')}${qaBtn({ k: 'ev', a: 'heal', _l: 'исцелить' }, `✚ Исцелить · ${X.money(P.heal || 0)}`, '', !!(E.done && E.done.heal))}${E.cursed ? qaBtn({ k: 'ev', a: 'cleanse', _l: 'очистить' }, `✨ Очистить · ${X.money(P.cleanse || 0)}`, '', !!(E.done && E.done.cleanse)) : ''}${qaBtn({ k: 'ev', a: 'bless', _l: 'благословить' }, `🙏 Благословить · ${X.money(P.bless || 0)}`, '', !!(E.done && E.done.bless))}</div>`
        + ((E.ghosts || []).length ? `<div class="qa-sel" role="group" aria-label="Воскресить"><span>Воскресить · ${X.money(P.revive || 0)}:</span>${E.ghosts.map((g) => qaBtn({ k: 'ev', a: 'revive', t: g[0], _l: `воскресить ${g[1]}` }, esc(g[1]), 'qa-c')).join('')}</div>` : '')
        + '<p class="muted">Обряд проводится, когда в чаше хватает монет.</p>';
    }
    if (E.res) rows += `<p class="q-big">${esc(E.res.text)}</p>`;
    if (E.look === 'dice' && E.last) rows += `<p class="muted">Последний бросок: ${esc(E.last.name)} 🎲${E.last.me} против 🎲${E.last.him}</p>`;
    return h + `<section class="q-card qa">${said}${qaPendLine()}${qaOkLine('ev')}${rows}</section>`;
  }
  /* ---------- 28.10 (hw-site-events, баг стримера): события Изнанки (сладость или гадость, гадалка, котёл, загадка призрака, пляска
     скелетов) - вид с комнаты quest/halloween/site.js. Что происходит, что писать сейчас (как табло оверлея), стадия и таймер (с задержкой
     стрима), счёт, свой ответ, итог и свои конфеты. Кнопки (тестерам кнопок, qa) - готовые строки команд чата: уходят строкой «Команда
     в поход» (sayLine - тот же разбор, что сообщение чата). Пляска: па - по мере показа на оверлее (sq: когда показано + задержка стрима),
     ответ - цепочкой из кнопок па и «Отправить». Загадка - ответ печатают сами в строке команд (или в чат). ---------- */
  // па: название и буква (как STEPS в quest/client/hollow-data.js: words[0] и words[2]); рисунок - свой (не эмодзи: 👏 на части устройств
  // не рисовался - пустая клетка, стример 00:51), линиями currentColor - одинаково видно в любой теме
  const HW_STEP = { l: ['влево', 'л'], r: ['вправо', 'п'], j: ['прыг', 'в'], c: ['хлоп', 'х'] };
  const HW_SVG = { l: '<path d="M20 12H5M11 5l-7 7 7 7"/>', r: '<path d="M4 12h15M13 5l7 7-7 7"/>', j: '<path d="M12 19V4M5 11l7-7 7 7"/><path d="M7 21h10"/>',
    c: '<rect x="5.5" y="9" width="5" height="12" rx="2.5" transform="rotate(-16 8 15)"/><rect x="13.5" y="9" width="5" height="12" rx="2.5" transform="rotate(16 16 15)"/><path d="M12 2v4M6.5 4l1.8 2.6M17.5 4l-1.8 2.6"/>' };
  const hwIco = (k) => (HW_SVG[k] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${HW_SVG[k]}</svg>` : '?');
  // как INGR в quest/client/hollow-data.js (28.10, hw-events2: ингредиентов 11)
  const HW_ING = { mushroom: ['🍄', 'мухомор'], eye: ['👁', 'глаз'], wing: ['🦇', 'крыло'], pumpkin: ['🎃', 'тыква'], tooth: ['🦷', 'зуб'], web: ['🕸', 'паутина'], bone: ['🦴', 'кость'], frog: ['🐸', 'лягушка'], candle: ['🕯', 'свеча'], herb: ['🌿', 'полынь'], tail: ['🐀', 'хвост'] };
  const HW_ST = { vote: 'чат решает', on: 'шатёр открыт', pay: 'сбор монет', ingr: 'пишите ингредиенты', brew: 'ведьма варит', riddle: 'загадка', pause: 'отгадали!', show: 'смотри па', input: 'повтори цепочку', done: 'итог' };
  const HWC = { id: '', ch: [] };   // своя цепочка па (пляска), пока не отправлена
  // кнопка-строка (как кнопки мест: data-qpb → pbClick → sayLine); состояние - по ответу игры на эту строку
  const hwBtn = (label, line, cls, dis) => `<button type="button" class="qa-b ${cls || ''}${lineSt(line)}" data-qpb="${esc(line)}" data-qpbc=""${dis ? ' disabled' : ''}>${label}</button>`;
  // клетка па и подпись словом под ней
  const hwCell = (k, cls) => { const s = k && HW_STEP[k]; return `<span class="q-hwx"><i class="q-hws ${cls || ''}" role="img" aria-label="${esc(s ? s[0] : 'неизвестно')}">${s ? hwIco(k) : '?'}</i><small>${s ? esc(s[0]) : '…'}</small></span>`; };
  const hwWords = (ks) => ks.map((k) => (HW_STEP[k] ? HW_STEP[k][0] : '?')).join(' ');
  function hwEvHtml(v) {
    const E = v.ev, qa = qaOn() && !!X.say, can = v.party === 'in' || v.party === 'ghost', done = E.st === 'done' || !!E.res, my = E.my || '';
    if (HWC.id !== `${E.id}:${E.st}`) { HWC.id = `${E.id}:${E.st}`; HWC.ch = []; }
    const tm = !done && E.until ? ` · <span data-until="${E.until}"></span> с` : '';
    let h = `<div class="q-stage"><b>${esc(E.icon)} ${esc(E.name)}${tm}</b><span>${esc(HW_ST[E.st] || '')}</span></div>`;
    let body = '';
    // что писать сейчас - главное (сверху, под ним - кнопки; что происходит и реплика - ниже)
    const how = E.how ? `<p class="q-big q-hwh">${esc(E.how)}${E.look === 'fortune' && E.price ? ` · ${X.money(E.price)}` : ''}</p>` : '';
    const where = E.look === 'skeldance' && E.st === 'show' ? 'Ответ - когда скелеты закончат: цепочкой из кнопок па или в чат' : E.look === 'lostghost' ? (qa ? 'Напечатай ответ в строке команд внизу - или в чат' : 'Пиши ответ в чат') : qa ? 'Кнопки ниже = команды чата, чат тоже работает' : 'Пиши в чат';
    if (!done && how) body += how + `<p class="muted">${can ? where : 'Участвует только отряд Изнанки'}</p>`;
    let rows = '';
    if (E.look === 'trick') {
      const V = E.vt || { sweet: 0, trick: 0 }, n = Math.max(1, V.sweet + V.trick);
      rows += `<div class="q-hwv"><div class="s"><i style="width:${Math.round(V.sweet / n * 100)}%"></i><span>🍬 сладость · ${V.sweet}</span></div><div class="t"><i style="width:${Math.round(V.trick / n * 100)}%"></i><span>👻 гадость · ${V.trick}</span></div></div>`;
      if (!done) rows += `<p class="muted">Сладость - немного, но наверняка. Гадость - ведьма бросит d20: 11+ - голосовавшим за гадость втрое больше конфет, иначе проклятие</p>`;   // 28.10 (hw-events2)
      if (my) rows += `<p class="qa-st ok">${svgI('check', 'ok')} твой голос: ${my === 'trick' ? 'гадость' : 'сладость'}</p>`;
      else if (qa && can && E.st === 'vote') rows += `<div class="qa-row q-hwt">${(E.bt || []).map((b) => hwBtn(esc(b[0]), b[1], b[2] === 'warn' ? 'warn big' : 'main big')).join('')}</div>`;
    } else if (E.look === 'fortune') {
      rows += `<p>Благословлено: <b>${+E.bn || 0}</b>${E.pr ? '' : ' · первому - пророчество о Джеке'}</p>` + (E.pr ? `<p class="q-hwp">🔮 «${esc(E.pr.text)}» <small class="muted">- пророчество для ${esc(E.pr.by)}</small></p>` : '') + (E.hint ? `<p class="muted">Шёпот гадалки: «${esc(E.hint)}»</p>` : '');
      if (my === 'done') rows += `<p class="qa-st ok">${svgI('check', 'ok')} гадалка тебе уже гадала - благословение на час</p>`;
      else if (qa && can) rows += `<div class="qa-row">${(E.bt || []).map((b) => hwBtn(`${esc(b[0])}<small>${X.money(E.price || 0)}</small>`, b[1], 'main big')).join('')}</div>`;
    } else if (E.look === 'cauldron') {   // 28.10 (hw-events2): сбор 25 серебра → ингредиенты → ведьма варит → зелье в сумку
      const mine = my ? my.split(',') : [], price = +E.price || 2500, pool = +E.pool || 0;
      if (E.st === 'pay' || (done && E.res && E.res.kind === 'gone')) {
        rows += `<div class="q-hwv"><div class="s"><i style="width:${Math.min(100, Math.round(pool / price * 100))}%"></i><span>🪙 ${X.money(pool)} из ${X.money(price)} · скинулись ${+E.payN || 0}</span></div></div>`;
        if (+E.mp > 0) rows += `<p class="qa-st ok">${svgI('check', 'ok')} ты скинул ${X.money(+E.mp)}${E.st === 'pay' ? ' - не соберут, вернутся' : ''}</p>`;
        if (qa && can && E.st === 'pay') rows += `<div class="qa-row">${(E.bt || []).map((b) => hwBtn(esc(b[0]), b[1], b[2] === 'main' ? 'main big' : 'big')).join('')}</div><p class="muted">Своё число - строкой: <b>скинуться 3</b> (серебро)</p>`;
      } else {
        const picked = E.picked || [];
        if (picked.length) rows += `<div class="q-hwk" aria-label="В котле: ${picked.length}">${picked.map((k) => `<i title="${esc((HW_ING[k] || [])[1] || k)}">${HW_ING[k] ? HW_ING[k][0] : '?'}</i>`).join('')}</div>`;
        if (E.st === 'ingr') rows += `<ul class="q-hwg">${Object.entries(HW_ING).map(([k, [ic, nm]]) => { const n = (E.ing || {})[k] || 0, me = mine.includes(k), line = ((E.bt || []).find((b) => b[1] === nm) || [])[1];
          const lab = `${ic} ${esc(nm)}<small>${n ? `пишут: ${n}` : ''}${me ? ' · твой' : ''}</small>`;
          return `<li class="${me ? 'me' : ''}">${qa && can && line ? hwBtn(lab, line, me ? 'on' : '', me) : `<span class="qa-b${me ? ' on' : ''}" aria-disabled="true">${lab}</span>`}</li>`; }).join('')}</ul>`;
        if (mine.includes('pot')) rows += `<p class="qa-st ok">${svgI('check', 'ok')} «Загадочное зелье» - в твоей сумке. Выпить: <b>выпить зелье</b> или кнопкой в сумке. Сгорит на выходе из Изнанки</p>`;
        else if (!done && (mine.includes('paid') || mine.length)) rows += `<p class="muted">Ты в деле - зелье будет и у тебя</p>`;
      }
    } else if (E.look === 'lostghost') {   // 28.10 (hw-events2): цепочка загадок; ответ виден, только когда загадку отгадали
      const qi = +E.qi || 0, qn = +E.qn || 0, sv = E.solved || [];
      if (qn && done) rows += `<p class="q-hwn">Загадок в цепочке: <b>${qn}</b></p>`;   // идёт - номер в «что писать»
      if (E.q) rows += `<p class="q-big q-hwq">«${esc(E.q)}»</p>`;
      if (sv.length) rows += `<ol class="q-hwo">${sv.map((r) => `<li>${+r[0]}. <b>${esc(r[1])}</b>: «${esc(r[2])}»</li>`).join('')}</ol>`;
      if (my === 'ok' && E.st === 'riddle') rows += `<p class="qa-st ok">${svgI('check', 'ok')} твой ответ верный - засчитывается первый по времени отправки</p>`;
    } else if (E.look === 'skeldance') {
      const L = +E.len || 0, sq = E.sq || [], seq = E.seq || [];
      if (E.st === 'show') rows += `<div class="q-hwd" aria-live="polite">${Array.from({ length: L }, (_, i) => hwCell(sq[i] && sq[i][0], sq[i] ? (i === sq.length - 1 ? 'on now' : 'on') : '')).join('')}</div>${sq.length ? `<p class="q-big q-hwl">Запомни: <b>${esc(hwWords(sq.map((x) => x[0])))}</b>${sq.length < L ? ' …' : ''}</p>` : ''}`;
      else if (E.st === 'input') {
        const build = !my && qa && can;   // своя цепочка - вместо пустого табло («?» на оверлее)
        // стример 00:51: «зрители не знают, что писать» - формат словами и буквами (сама цепочка не подсказывается: на табло тоже «?»)
        if (!my) rows += `<p class="q-hwl">Все ${L} па по порядку - одним сообщением, через пробел. Буквами можно: <b>л</b> - влево, <b>п</b> - вправо, <b>в</b> - прыг, <b>х</b> - хлоп</p>`;
        rows += `${build ? '' : `<div class="q-hwd">${Array.from({ length: L }, () => hwCell('', '')).join('')}</div>`}<p class="muted">Верно: <b>${+E.okN || 0}</b> · мимо: <b>${+E.badN || 0}</b></p>`;
        if (my) rows += my === 'ok' ? `<p class="qa-st ok">${svgI('check', 'ok')} ты повторил верно!</p>` : '<p class="qa-st q-dg">Твоя цепочка - мимо. Ответ один, ждём итог</p>';
        else if (qa && can) {
          const ch = HWC.ch, line = ch.map((k) => HW_STEP[k][0]).join(' ');
          rows += `<div class="q-hwc" aria-live="polite"><span class="muted">Твоя цепочка · ${ch.length} из ${L}</span><div class="q-hwd">${Array.from({ length: L }, (_, i) => hwCell(ch[i] || '', ch[i] ? 'on' : '')).join('')}</div></div>`
            + `<div class="qa-row q-hwb">${Object.entries(HW_STEP).map(([k, [nm, ab]]) => `<button type="button" class="qa-b big" data-qhw="${k}"${ch.length >= L ? ' disabled' : ''} aria-label="Добавить па: ${nm}"><span class="q-hwi2">${hwIco(k)}</span><small>${nm} · ${ab}</small></button>`).join('')}</div>`
            + `<div class="qa-row"><button type="button" class="qa-b" data-qhw="<"${ch.length ? '' : ' disabled'} aria-label="Стереть последнее па">⌫</button>${line ? hwBtn(`Отправить<small>${esc(line)}</small>`, line, 'main big', ch.length !== L) : hwBtn('Отправить', '-', 'main big', true)}</div>`;
        }
      } else if (seq.length) rows += `<div class="q-hwd">${seq.map((k) => hwCell(k, 'on')).join('')}</div><p class="muted">Цепочка: ${esc(hwWords(seq))}</p>${E.fight ? '<p class="qa-st q-dg">Скелеты нападают - сейчас бой!</p>' : ''}`;
    }
    if (done && E.res) rows += `<p class="q-big q-hwr">${esc(E.res.text)}</p>`;
    if (E.said && E.said.text) rows += `<p class="qa-said">${esc(E.npc || E.name)}: «${esc(E.said.text)}»</p>`;
    if (E.intro && !done) rows += `<p class="muted q-hwi">${esc(E.intro)}</p>`;
    if (+E.got > 0) rows += `<p class="qa-st ok">🍬 Тебе: +${+E.got} ${plural(+E.got, 'конфета', 'конфеты', 'конфет')}</p>`;
    else if (done && my) rows += '<p class="muted">Ты участвовал - награда по итогу, смотри журнал</p>';
    return h + `<section class="q-card qa q-hw${!done && can && !my ? ' q-urge' : ''}">${body}${rows}</section>`;
  }
  /* ---------- 28.10 (map-puzzles): головоломка на карте похода (quest/mappuzzles.js siteView). Что происходит, что писать сейчас, стадия
     и таймер (с задержкой стрима), сама задача (загадка, равенства рун - рисунком, надписи кубков, буква и слова, весы), свой ответ;
     ответ головоломки - только после итога. Кнопки (тестерам кнопок) - там, где ответ - выбор (кубок, номер предмета, плита весов): строка
     команды чата, как у событий Изнанки (data-qpb → sayLine). Загадку, число и слова - печатают сами (строка «Команда в поход» или чат). ---------- */
  const PZ_ST = { show: 'смотри на стрим', answer: 'отвечай', done: 'итог' };
  const PZ_RUNE = { R: '<path d="M9 20V4h5a4 4 0 0 1 0 8H9l7 8"/>', T: '<path d="M9 3v18M9 7l6 4-6 4"/>' };
  const pzRune = (c) => `<i class="q-pzr q-pzr-${c}" role="img" aria-label="руна ${c === 'R' ? 'Рад' : 'Турс'}"><svg viewBox="0 0 24 24" aria-hidden="true">${PZ_RUNE[c]}</svg></i>`;
  // свой ответ и итог: «a:X» (ответ), «w:N» (слов на букву); после итога - «ok:монеты:-урон|a:X» / «bad…|a:X»
  function pzMy(P) {
    const parts = String(P.my || '').split('|'), done = P.st === 'done', fin = done && /^(ok|bad)/.test(parts[0]) ? parts[0].split(':') : null, raw = (fin ? parts[1] : parts[0]) || '';
    const c = fin ? +((fin.find((x, i) => i > 0 && /^\d+$/.test(x))) || 0) : 0, hp = fin ? +((fin.find((x) => /^-\d+$/.test(x)) || '0').slice(1)) : 0;
    return { st: fin ? fin[0] : '', c, hp, ans: raw.startsWith('a:') ? raw.slice(2) : '', words: raw.startsWith('w:') ? +raw.slice(2) || 0 : 0 };
  }
  const pzAnsText = (P, a) => (P.kind === 'scales' ? (a === 'l' ? 'левая плита' : a === 'r' ? 'правая плита' : a) : P.kind === 'cups' ? `кубок ${a}` : P.kind === 'changed' ? `предмет ${a}` : `«${a}»`);
  function pzHtml(v) {
    const P = v.pz, qa = qaOn() && !!X.say, can = v.party === 'in', done = P.st === 'done', M = pzMy(P), u = P.st === 'show' ? P.showUntil : P.until;
    const tm = !done && u ? ` · <span data-until="${u}"></span> с` : '';
    let h = `<div class="q-stage"><b>${esc(P.icon || '')} ${esc(P.name)}${tm}</b><span>${esc(PZ_ST[P.st] || '')}</span></div>`, rows = '';
    const typed = P.kind === 'riddle' || P.kind === 'count' || P.kind === 'runes' || P.kind === 'letter';
    if (!done) {
      rows += `<p class="q-big q-hwh">${P.st === 'show' ? (P.kind === 'count' ? 'Зверьки бегут по поляне на стриме - считай!' : 'Предметы на стриме - запоминай, какой под каким номером!') : esc(P.how || '')}</p>`;
      rows += `<p class="muted">${!can ? 'Отвечает только отряд' : P.st === 'show' ? 'Ответ - когда покажут' : typed ? (qa ? 'Напечатай ответ в строке команд внизу - или в чат' : 'Пиши ответ в чат') : qa ? 'Кнопки ниже = команды чата, чат тоже работает' : 'Пиши в чат'}</p>`;
    }
    if (P.kind === 'riddle') rows += `<p class="q-big q-hwq">«${esc(P.q || '')}»</p>`;
    else if (P.kind === 'count') rows += `<p class="q-big">${esc(P.q || '')}</p>`;
    else if (P.kind === 'runes') rows += `<div class="q-pzeq" aria-label="Равенства рун">${(P.rows || []).map((r) => `<p>${r.map((c) => (PZ_RUNE[c] ? pzRune(c) : `<b>${esc(c)}</b>`)).join('')}</p>`).join('')}</div>`;
    else if (P.kind === 'cups') rows += `${done ? '<p class="muted">Правдива ровно одна надпись, в одном кубке - яд</p>' : ''}<ol class="q-pzc">${(P.signs || []).map((t, i) => { const c = String(i + 1), mine = M.ans === c, pois = done && P.res && P.res.ans === c;
      return `<li class="${mine ? 'me' : ''}${pois ? ' pois' : ''}"><span class="q-pzs">«${esc(t)}»</span>${qa && can && !done ? hwBtn(`Кубок ${c}`, c, mine ? 'on big' : 'main big') : `<b>Кубок ${c}${pois ? ' - яд' : ''}</b>`}</li>`; }).join('')}</ol>`;
    else if (P.kind === 'changed') { if (P.st === 'answer' && qa && can) rows += `<div class="qa-row q-pzn">${(P.bt || []).map((b) => hwBtn(esc(b[0]), b[1], M.ans === b[1] ? 'on big' : 'main big')).join('')}</div>`; else if (P.st === 'answer') rows += `<p class="q-big">Номер пропавшего: от 1 до ${+P.items || 0}</p>`; }
    else if (P.kind === 'letter') rows += `<p class="q-pzl"><b>${esc(String(P.letter || '').toUpperCase())}</b></p><p>Слов: <b>${+P.got || 0}</b> из ${+P.goal || 0}${M.words ? ` · твоих: <b>${M.words}</b>` : ''}</p>${(P.words || []).length ? `<p class="q-pzw">${P.words.map((w) => `<span>${esc(w)}</span>`).join('')}</p>` : ''}`;
    else if (P.kind === 'scales') { const S = P.sums || [0, 0, 0, 0];
      rows += `<p class="q-big">Левая плита должна быть ${esc(P.rt || '')}</p><p class="q-pzsc"><span>лево <b>${S[0]}</b><small>${S[2]} чел.</small></span><span>право <b>${S[1]}</b><small>${S[3]} чел.</small></span></p><p class="muted">Вес героя: легионер и паладин - 3, новобранец, лучник, разбойник - 2, маг, жрец, некромант - 1</p>`;
      if (qa && can && !done) rows += `<div class="qa-row q-pzn">${(P.bt || []).map((b) => hwBtn(esc(b[0]), b[1], (M.ans === 'l' && b[1] === 'лево') || (M.ans === 'r' && b[1] === 'право') ? 'on big' : b[1] === 'сойти' ? 'big' : 'main big')).join('')}</div>`; }
    if (M.ans && !done) rows += `<p class="qa-st ok">${svgI('check', 'ok')} твой ответ: ${esc(pzAnsText(P, M.ans))}${P.kind === 'riddle' ? ' - верный или нет, узнаешь в итоге' : ''}</p>`;
    if (!done) rows += `<p class="muted">Ответили: <b>${+P.an || 0}</b> · награда: ${P.prize === 'buff' ? 'враги следующего боя ослаблены' : `${X.money(+P.coins || 0)} каждому, кто ответит верно`}</p>`;
    if (done && P.res) {
      rows += `<p class="q-big q-hwr ${P.res.ok ? 'q-pzok' : 'q-dg'}">${esc(P.res.text)}</p>` + (P.res.ok && P.res.prize ? `<p class="qa-st ok">${esc(P.res.prize)}</p>` : '');
      if (M.st === 'ok') rows += `<p class="qa-st ok">${svgI('check', 'ok')} ты ответил верно${M.c ? ` · +${X.money(M.c)}` : ''}</p>`;
      else if (M.st === 'bad') rows += `<p class="qa-st q-dg">твой ответ - мимо${M.ans ? ` (${esc(pzAnsText(P, M.ans))})` : ''}${M.hp ? ` · яд: −${M.hp} ❤` : ''}</p>`;
    }
    return h + `<section class="q-card qa q-hw q-pz${!done && can && !M.ans && P.st === 'answer' ? ' q-urge' : ''}">${rows}</section>`;
  }
  /* ---------- 28.10: «Ярмарка гоблинов» (quest/goblin.js siteView) - три игры на ставки. Что писать сейчас, игра и стадия с таймером (с задержкой
     стрима), ставка - кнопками сумм, ответ - кнопками (готовые строки команд: уходят строкой «Команда в поход», как hwBtn), свой итог и итоги ярмарки.
     Перестановки стаканов здесь не рисуем - смотреть на стриме. ---------- */
  const GOB_GN = { shell: ['🥤', 'Напёрстки'], coin: ['🪙', 'Орёл или решка'], hilo: ['🃏', 'Больше или меньше'] };
  const GOB_ST = { ask: 'сыграем?', bet: 'ставки', shuffle: 'гоблин крутит стаканы', guess: 'ответы', reveal: 'итог игры', next: 'следующая игра', done: 'ярмарка закрыта' };
  const gobAns = (gk, a) => (gk === 'shell' ? `стакан ${a}` : gk === 'coin' ? (a === 't' ? 'решка' : 'орёл') : a === 'hi' ? 'больше' : 'меньше');
  const gobK = (x) => String(x).replace('.', ',');
  const gobPm = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${X.money(Math.abs(n))}`;
  function gobHtml(v) {
    const E = v.ev, qa = qaOn() && !!X.say, can = v.party === 'in', me = E.me || ['', 0, '', '', 0, 0, 0], done = E.st === 'done';
    const tm = !done && E.until ? ` · <span data-until="${E.until}"></span> с` : '';
    let h = `<div class="q-stage"><b>${esc(E.icon)} ${esc(E.name)}${tm}</b><span>${E.g ? `игра ${E.g} из 3 · ` : ''}${esc(GOB_ST[E.st] || '')}</span></div>`;
    let rows = `<div class="q-gfg" role="list" aria-label="Игры ярмарки">${(E.games || []).map(([k, st]) => (GOB_GN[k] ? `<span role="listitem" class="${st}">${GOB_GN[k][0]} ${GOB_GN[k][1]}${st === 'done' ? ' ✓' : st === 'skip' ? ' - пропущена' : ''}</span>` : '')).join('')}</div>`;
    if (E.how && !done) rows += `<p class="q-big q-hwh">${esc(E.how)}</p><p class="muted">${can ? (qa ? 'Кнопки ниже = команды чата, чат тоже работает' : 'Пиши в чат') : 'Играет только отряд - можно смотреть'}</p>`;
    const R = E.round;
    if (E.st === 'ask') {
      const V = E.votes || { yes: 0, no: 0 }, n = Math.max(1, V.yes + V.no);
      rows += `<div class="q-hwv"><div class="s"><i style="width:${Math.round(V.yes / n * 100)}%"></i><span>👍 да · ${V.yes}</span></div><div class="t"><i style="width:${Math.round(V.no / n * 100)}%"></i><span>👎 нет · ${V.no}</span></div></div>`;
      if (me[0]) rows += `<p class="qa-st ok">${svgI('check', 'ok')} твой голос: ${me[0] === 'yes' ? 'да' : 'нет'} - можно передумать</p>`;
      if (qa && can) rows += `<div class="qa-row q-hwt">${(E.bt || []).map((b) => hwBtn(esc(b[0]), b[1], b[2] === 'warn' ? 'warn big' : 'main big')).join('')}</div>`;
    } else if (E.st === 'bet') {
      if (R) rows += `<p>Поставили: <b>${R.n}</b> · на кону ${X.money(R.pot)}${R.pay ? ` · угадал - ×${gobK(R.pay)}` : E.gk === 'hilo' ? ' · выплата - по открытой карте' : ''}</p>`;
      if (me[1]) rows += `<p class="qa-st ok">${svgI('check', 'ok')} твоя ставка: ${X.money(me[1])} - жди ${E.gk === 'shell' ? 'перестановок' : 'ответа'}</p>`;
      else if (qa && can) {
        const hm = X.hero() || {}, have = hm.money != null ? Math.max(0, Math.floor(+hm.money || 0)) : E.cap, mx = Math.min(E.cap, have);
        const sums = [10, 30, 50, 100].filter((n) => n >= E.min && n < mx).concat(mx >= E.min ? [mx] : []);
        rows += sums.length ? `<div class="qa-row q-gfb" role="group" aria-label="Ставка">${sums.map((n) => hwBtn(`🪙 ${X.money(n)}${n === mx && ![10, 30, 50, 100].includes(n) ? '<small>максимум</small>' : ''}`, `ставка ${n}`, n === 30 ? 'main' : '')).join('')}</div><p class="muted">Другая сумма - строкой: «ставка N» (от ${X.money(E.min)} до ${X.money(E.cap)})</p>` : `<p class="muted">В кошельке меньше ${X.money(E.min)} - можно только смотреть</p>`;
      }
    } else if (E.st === 'shuffle') {
      rows += `<p class="q-big">👀 Смотри на стрим - где шарик?</p>${me[1] ? `<p class="qa-st ok">${svgI('check', 'ok')} твоя ставка: ${X.money(me[1])}</p>` : '<p class="muted">Ты не ставил - просто смотришь</p>'}`;
    } else if (E.st === 'guess') {
      if (E.gk === 'hilo' && E.hl) rows += `<div class="q-gfc"><span class="q-gfcard">${esc(E.hl.c1)}</span><span class="q-gfcard down">?</span><p>⬆ больше <b>×${gobK(E.hl.hp)}</b> · ⬇ меньше <b>×${gobK(E.hl.lp)}</b><br><small class="muted">равная - гоблину</small></p></div>`;
      else if (R && R.pay) rows += `<p>Угадал - <b>×${gobK(R.pay)}</b> ставки · ответили ${R.ans} из ${R.n}</p>`;
      if (!me[1]) rows += '<p class="muted">Ты не ставил в этой игре - смотришь</p>';
      else if (me[2]) rows += `<p class="qa-st ok">${svgI('check', 'ok')} твой ответ: ${esc(gobAns(E.gk, me[2]))} · ставка ${X.money(me[1])} - можно передумать, пока идёт время</p>`;
      if (me[1] && qa && can) rows += `<div class="qa-row q-hwt">${(E.bt || []).map((b) => hwBtn(esc(b[0]), b[1], (me[2] && gobAns(E.gk, me[2]).endsWith(b[1]) ? 'on ' : '') + 'main big')).join('')}</div>`;
      else if (me[1] && !me[2]) rows += '<p class="qa-st warn">Не ответишь - ставка останется гоблину</p>';
    }
    if (E.rv && (E.st === 'reveal' || E.st === 'next')) {
      rows += `<p class="q-big q-hwr">${GOB_GN[E.rv.gk] ? GOB_GN[E.rv.gk][0] : ''} ${esc(E.rv.text)}${E.rv.cheat ? ' · ✋ ловкость рук!' : ''}</p><p class="muted">угадали ${E.rv.win} · мимо ${E.rv.lose}</p>`;
      if (me[3] && me[1]) rows += me[3] === 'win' ? `<p class="qa-st ok">🏆 Ты угадал: ${gobPm(me[4])}</p>` : me[3] === 'skip' ? `<p class="qa-st q-dg">Ты не ответил - ставка ${X.money(me[1])} осталась гоблину</p>` : `<p class="qa-st q-dg">Мимо: ${gobPm(me[4])}</p>`;
    }
    if (E.st === 'next' && E.next && GOB_GN[E.next]) rows += `<p>Дальше - ${GOB_GN[E.next][0]} <b>${GOB_GN[E.next][1]}</b>: будут ставки, можно пропустить</p>`;
    if (done) {
      if (E.res) rows += `<p class="q-big q-hwr">${esc(E.res.text)}</p>`;
      if (E.board && E.board.top.length) rows += `<ol class="q-gft" aria-label="Топ ярмарки">${E.board.top.map(([nm, n]) => `<li><span>${esc(nm)}</span><b class="${n >= 0 ? 'ok' : 'q-dg'}">${gobPm(n)}</b></li>`).join('')}</ol>`;
    }
    if (me[6] > 0) rows += `<p class="qa-st ${me[5] >= 0 ? 'ok' : 'q-dg'}">Твой итог на ярмарке: ${gobPm(me[5])} · игр ${me[6]}</p>`;
    if (E.said && E.said.text) rows += `<p class="qa-said">${esc(E.npc || 'Гоблин')}: «${esc(E.said.text)}»</p>`;
    const urge = !done && can && ((E.st === 'ask' && !me[0]) || (E.st === 'bet' && !me[1]) || (E.st === 'guess' && me[1] && !me[2]));
    return h + `<section class="q-card qa q-hw q-gf${urge ? ' q-urge' : ''}">${rows}</section>`;
  }
  // ловушка и сокровищница: слово, верёвка, «держу», «взять», путь и код (цифры), поровну / себе
  function qaTrap(v) {
    const T = v.tr, act = T.st === 'act' || T.st === 'wait'; if (!act || v.party !== 'in') return '';
    let rows = '';
    if (T.gas) return '<section class="q-card q-urge"><p><b>Газ: ничего не пиши и не жми!</b></p></section>';
    if (T.type === 'crossing' || T.type === 'bog') return '';   // 28.10: кнопки - кнопки мест (строкой «Команда в поход»)
    if (T.type === 'greed') rows = '<p class="muted">Хватай, пока не рухнуло, и беги с добычей - кнопки выше или строкой команд.</p>';   // 26.10: кнопки - кнопки мест (greed)
    else if (T.type === 'react' && T.word) rows = T.acted ? '' : `<div class="q-ncw"><span>Напечатай в строке внизу:</span>${wd(T.word, 'big')}</div>`;   // 26.10: слово-реакция - только строка, без копирования
    else if (T.type === 'ropes') rows = `<div class="qa-row">${Array.from({ length: T.n || 0 }, (_, i) => qaBtn({ k: 'tr', a: 'rope', n: i + 1, _l: `резать ${i + 1}` }, `✂ ${i + 1}`)).join('')}</div>`;
    else if (T.type === 'ceiling') rows = T.acted ? (SCH ? qaBtn({ k: 'tr', a: 'hold' }, '🙌 Держу!', 'ok big', true) : '') : qaBtn({ k: 'tr', a: 'hold', _l: 'держу' }, '🙌 Держу!', 'urge big');
    else if (T.type === 'bait') rows = T.taker ? '<p class="muted">Сундук уже открывают.</p>' : qaBtn({ k: 'tr', a: 'take', _l: 'взять' }, '🧰 Взять', 'main big');
    else if (T.type === 'share') rows = T.acted ? '' : `<div class="qa-row">${qaBtn({ k: 'tr', a: 'eq', _l: 'поровну' }, '🤝 Поровну', 'main')}${qaBtn({ k: 'tr', a: 'me', _l: 'себе' }, '💰 Себе', 'warn')}</div><p class="muted">Решение одно - передумать нельзя</p>`;
    else if (T.type === 'code' && T.rd2) rows = qaRune2(T);   // 27.10: «Дверь с рунами 2»
    else if ((T.type === 'code' || T.type === 'plates') && !(T.type === 'plates' && T.acted)) {
      const max = T.type === 'code' ? T.max || 9 : 9, need = T.type === 'code' ? T.len : 0, d = QA.dig;
      rows = `<div class="qa-dig" aria-live="polite"><b>${d ? esc(d.split('').join(' ')) : '…'}</b><span class="muted">${need ? `${need} разных цифр 1–${max}` : 'путь - цифры плит по порядку'}</span></div>`
        + `<div class="qa-pad">${Array.from({ length: max }, (_, i) => `<button type="button" class="qa-c" data-qdig="${i + 1}"${need && (d.length >= need || d.includes(String(i + 1))) ? ' disabled' : ''}>${i + 1}</button>`).join('')}<button type="button" class="qa-c" data-qdig="<" aria-label="Стереть">⌫</button></div>`
        + `<div class="qa-row">${qaBtn({ k: 'tr', a: T.type === 'code' ? 'code' : 'path', s: '#dig', _l: `${T.type === 'code' ? 'код' : 'путь'} ${d}` }, T.type === 'code' ? 'Ввести код' : 'Пройти', 'main', need ? d.length !== need : d.length < 2)}</div>`;
      // 26.10 (п. 16): дверь с рунами - лучшие попытки отряда сбоку (🟢 на месте, 🟡 есть, но не там, 🔴 нет)
      if (T.type === 'code' && T.best && T.best.length) rows = `<div class="q-code"><div>${rows}</div><aside class="q-best" aria-label="Лучшие попытки"><b>Лучшие попытки</b><ol>${T.best.map(([g, m, nm]) => `<li><span class="rn">${g.split('').map((c, i) => `<i class="${m[i] || 'r'}">${c}</i>`).join('')}</span><small>${esc(nm)}</small></li>`).join('')}</ol></aside></div>`;
    }
    if (!rows && !T.acted) return '';
    return `<section class="q-card qa">${qaPendLine()}${qaOkLine('tr')}${T.acted && !rows ? `<p class="qa-st ok">${svgI('check', 'ok')} принято</p>` : rows}<p class="muted">Кнопка = команда в чат, чат тоже работает</p></section>`;
  }

  // 27.10 «Дверь с рунами 2»: руны могут повторяться, злая дверь (таймер смены), голосование «забрать / дальше», попытки - общие на обе двери
  function qaRune2(T) {
    const R = T.rd2, mx = +T.per || 3;
    if (R.ph === 'vote') {
      const V = R.vote || { take: 0, next: 0 };
      return `<div class="qa-row">${qaBtn({ k: 'tr', a: 'keep', _l: 'забрать' }, `💰 Забрать${R.my === 'take' ? ' ✓' : ''}`, R.my === 'take' ? 'ok' : 'main')}${qaBtn({ k: 'tr', a: 'next', _l: 'дальше' }, `🚪 Дальше · награда ×2${R.my === 'next' ? ' ✓' : ''}`, R.my === 'next' ? 'ok' : 'warn')}</div>`
        + `<p class="muted">Забрать: ${V.take} · дальше: ${V.next} · голос можно сменить. Вторая дверь - вдвое больше рун, попытки те же (у тебя ${R.left} из ${mx}); не откроем - потеряем всё</p>`;
    }
    const need = +T.len || 0, max = +T.max || 9, d = QA.dig, left = +R.left || 0;
    const ang = R.ang && R.ang.at > Date.now() ? `<p class="q-rd-ang">Дверь злится через <span data-until="${R.ang.at}"></span> с - сменит руны</p>` : R.ang ? '<p class="q-rd-ang">Дверь злая: время от времени меняет руны</p>' : '';
    const head = `${R.door === 2 ? '<p class="q-big">Вторая дверь</p>' : ''}${ang}<p class="muted">Руны могут повторяться · твоих попыток: <b>${left}</b> из ${mx}${R.dbl ? ' (на обе двери)' : ''}</p>`;
    let rows = left <= 0 ? '<p class="muted">Попытки кончились - смотри, как справится отряд.</p>'
      : `<div class="qa-dig${need > 8 ? ' long' : ''}" aria-live="polite"><b>${d ? esc(d) : '…'}</b><span class="muted">${d.length} из ${need} · цифры 1–${max}</span></div>`
        + `<div class="qa-pad">${Array.from({ length: max }, (_, i) => `<button type="button" class="qa-c" data-qdig="${i + 1}"${d.length >= need ? ' disabled' : ''}>${i + 1}</button>`).join('')}<button type="button" class="qa-c" data-qdig="<" aria-label="Стереть">⌫</button></div>`
        + `<div class="qa-row">${qaBtn({ k: 'tr', a: 'code', s: '#dig', _l: `код ${d}` }, 'Ввести код', 'main', d.length !== need)}</div>`;
    if (T.best && T.best.length) rows = `<div class="q-code"><div>${rows}</div><aside class="q-best${need > 8 ? ' long' : ''}" aria-label="Лучшие попытки"><b>Лучшие попытки</b><ol>${T.best.map(([g, m, nm, old]) => `<li${old ? ' class="old"' : ''}><span class="rn">${g.split('').map((c, i) => `<i class="${m[i] || 'r'}">${c}</i>`).join('')}</span><small>${esc(nm)}${old ? ' · до смены' : ''}</small></li>`).join('')}</ol></aside></div>`;
    return head + rows;
  }

  /* ---------- враги — рисунки оверлея (client/battle.js, враги стиля), грузятся, когда открыли бой ---------- */
  let foesAsked = false;
  const QB = () => (window.QBattle && window.QBattle.foe ? window.QBattle : null);
  function foesWant() { if (foesAsked || QB() || !X.foes) return; foesAsked = true; X.foes().then(() => { keyTab = null; foeImgs.clear(); paint(); }).catch(() => {}); }
  const foeSvg = (type, boss, flip) => { const B = QB(); if (!B) return ''; try { return B.foe(type, 170, 225, 1, { boss: !!boss, flip: !!flip }); } catch (e) { return ''; } };
  const foeImgs = new Map();
  function foeImg(type, boss, flip) {
    const k = type + (boss ? ':b' : '') + (flip ? ':f' : ''); let im = foeImgs.get(k); if (im !== undefined) return im;
    const g = foeSvg(type, boss, flip); if (!g) { foeImgs.set(k, null); return null; }
    im = new Image(); im.onload = () => { keyTab = null; paint(); };
    try { im.src = URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="240" viewBox="0 0 340 240" overflow="visible">${g}</svg>`], { type: 'image/svg+xml' })); } catch (e) { im = null; }
    foeImgs.set(k, im); return im;
  }

  /* ---------- схема отряда (canvas): те же места, что у оверлея ---------- */
  const HASH = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  function squad(cv, b) {
    const C = window.QBattleCrowd; if (!cv || !C) return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, me = X.login();
    const fronts = b.cr && b.cr.fr && b.cr.fr.length ? b.cr.fr : b.two ? ['L', 'R'] : ['R'], cam = (b.cr && b.cr.cam) || 1, ter = '';
    const heroes = b.form.map((p) => ({ login: p[0], cls: p[1], side: p[2] || undefined, shield: !!p[4], def: 5 - (+p[5] || 2) }));
    let pl; try { pl = fronts.length > 1 ? C.ringLayout(heroes, cam, ter, fronts, !!(b.cr && b.cr.chaos)) : C.layout(heroes, cam, ter); } catch (e) { pl = []; }
    let foes = []; try { foes = fronts.length > 1 ? C.foeRing(b.foes.length, cam, ter, fronts) : C.foeLayout(b.foes.length, cam, ter); } catch (e) { foes = []; }
    // рамка: всё, что на поле
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pl) { x0 = Math.min(x0, p.x - 60 * p.s); x1 = Math.max(x1, p.x + 60 * p.s); y0 = Math.min(y0, p.y - 170 * p.s); y1 = Math.max(y1, p.y + 10); }
    for (const f of foes) { x0 = Math.min(x0, f.x - 90 * f.s); x1 = Math.max(x1, f.x + 90 * f.s); y0 = Math.min(y0, f.y - 120 * f.s); y1 = Math.max(y1, f.y + 10); }
    if (!(x1 > x0)) { g.clearRect(0, 0, W, H); return; }
    const pad = 16, k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0)), ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = (H - (y1 - y0) * k) / 2 - y0 * k;
    const X2 = (x) => ox + x * k, Y2 = (y) => oy + y * k;
    g.clearRect(0, 0, W, H);
    const css = getComputedStyle(cv), ink = css.getPropertyValue('--ink').trim() || '#ece2cc', bad = css.getPropertyValue('--dn').trim() || '#ff7a6e';
    // земля
    g.fillStyle = 'rgba(120,150,90,.10)'; g.beginPath(); g.ellipse(W / 2, H * 0.62, W * 0.48, H * 0.36, 0, 0, Math.PI * 2); g.fill();
    // враги
    b.foes.forEach((f, i) => { const p = foes[i]; if (!p) return; const s = p.s * k, x = X2(p.x), y = Y2(p.y), dead = f[3] <= 0;
      const im = foeImg(f[1], f[2], p.flip);
      if (im && im.complete && im.naturalWidth) { const kb = f[2] ? 1.25 : 1; g.globalAlpha = dead ? 0.15 : 0.85; g.drawImage(im, x - 170 * s * kb, y - 225 * s * kb, 340 * s * kb, 240 * s * kb); }
      else { g.globalAlpha = dead ? 0.15 : 0.75; g.fillStyle = bad; g.beginPath(); g.ellipse(x, y - 40 * s, (f[2] ? 70 : 52) * s, (f[2] ? 40 : 30) * s, 0, 0, Math.PI * 2); g.fill(); }
      if (!dead) { g.globalAlpha = 0.9; g.fillStyle = '#2a2236'; g.fillRect(x - 40 * s, y - 92 * s, 80 * s, 8 * s); g.fillStyle = bad; g.fillRect(x - 40 * s, y - 92 * s, 80 * s * f[3], 8 * s); } });
    // отряд: полупрозрачно, по классам; свой — ярко (картинка героя)
    let mine = null;
    const sorted = pl.slice().sort((a, b2) => a.y - b2.y);
    for (const p of sorted) {
      if (p.h.login === me) { mine = p; continue; }
      const s = p.s * k, x = X2(p.x), y = Y2(p.y);
      g.globalAlpha = 0.38; g.fillStyle = ZONE_COL[p.zone] || ink;
      g.beginPath(); g.ellipse(x, y - 52 * s, 30 * s, 50 * s, 0, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    if (mine) {
      const s = mine.s * k, x = X2(mine.x), y = Y2(mine.y), w = Math.max(44, 120 * s * 2.2), h = w * 170 / 120;   // свой — крупнее, чтобы найти сразу
      g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y - 2, w * 0.42, w * 0.14, 0, 0, Math.PI * 2); g.stroke();
      const img = heroImg();
      if (img && img.complete && img.naturalWidth) { if (mine.wing === 'L') { g.save(); g.translate(x, 0); g.scale(-1, 1); g.drawImage(img, -w / 2, y - h + 6 * s, w, h); g.restore(); } else g.drawImage(img, x - w / 2, y - h + 6 * s, w, h); }
      else { g.fillStyle = '#ffd34d'; g.beginPath(); g.ellipse(x, y - 52 * s, 34 * s, 54 * s, 0, 0, Math.PI * 2); g.fill(); }
      g.font = '800 14px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(16,10,24,.9)'; g.strokeText('ты', x, y + 18); g.fillStyle = '#ffd34d'; g.fillText('ты', x, y + 18);
    }
  }
  // картинка своего героя для схемы (из рисунка сайта), одна на облик
  function heroImg() {
    const h = X.hero(); if (!h) return null;
    const svg = dd('stern'), key = svg.length + ':' + HASH(svg);
    if (myImg && myImgKey === key) return myImg;
    myImgKey = key; const m = svg.match(/^<svg\b[^>]*>/); if (!m) return null;
    let open = m[0].replace(/\s(width|height|style)="[^"]*"/g, ''); if (!/xmlns=/.test(open)) open = open.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    open = open.replace('<svg', '<svg width="120" height="170"');
    const img = new Image(); img.onload = () => { keyTab = ''; paint(); };
    try { img.src = URL.createObjectURL(new Blob([open + svg.slice(m[0].length)], { type: 'image/svg+xml' })); } catch (e) { return null; }
    myImg = img; return img;
  }

  /* ---------- 25.10: сумка во вкладке «Поход» — проба библиотеки инвентаря (packages/inventory: LGInventory.mount, вид 'inline').
     Только тестерам (флаг i2 у героя - новинка inv2, inv2Public). Надетое — значками (только смотреть), еда и зелья — ячейками со стопками;
     наведение / нажатие — карточка вещи сайта, двойной клик, Shift + правая кнопка или кнопка — съесть / выпить (X.eat, как в «Персонаже»).
     Блок живёт в своём элементе: вкладка перерисовывается целиком, а он только переставляется в новую разметку
     и обновляет изменившиеся ячейки, когда меняется герой. ---------- */
  let QBG = null;
  const qbOn = () => { const h = X && X.hero(); return !!(h && h.i2 && window.LGInventory); };
  const qbData = () => { const h = X.hero() || {}; return { hero: h, items: h.items || [] }; };
  function qbag(el, v) {
    if (!qbOn() || !v || !v.on || qaOn()) { if (QBG) { QBG.inv.destroy(); QBG.host.remove(); QBG = null; } return; }
    if (!QBG) {
      const host = document.createElement('section'); host.className = 'q-card q-inv';
      const inv = window.LGInventory.mount(host, {
        variant: 'inline', mode: 'equip', data: qbData(),
        actions: { use: async (uid) => { if (X.eat) await X.eat(uid, null); if (QBG) QBG.inv.update(qbData()); } },
        options: {
          title: 'Еда и зелья', sub: 'и что надето', gridLabel: 'Еда и зелья', art: X.art ? (it) => X.art(it) : null,
          only: (it) => !it.wearable && (it.slot === 'food' || it.slot === 'potion') && !!it.effect && !it.effect.revive,
          canUse: (it) => { const h = X.hero() || {}; return h.ghost ? 'Призрак не ест' : h.eatUntil && h.eatUntil > X.now() && !(it && it.effect && it.effect.hw) ? 'Еда и зелья ещё не готовы' : true; },
          cardTip: X.cardTip ? (c, it) => X.cardTip(c, it) : null, tipHide: X.tipHide ? () => X.tipHide() : null,
          say: X.toast ? (t) => X.toast(t, true) : null, labels: { empty: 'Еды и зелий нет - купи в лавке похода или на Ярмарке' },
        },
      });
      QBG = { host, inv };
    }
    const w = el.querySelector('.q-wrap'); if (w && QBG.host.parentNode !== w) w.appendChild(QBG.host);
  }

  /* ---------- 26.10: строка «Команда в поход» (docs/QUEST-TAB.md, «Строка команд») ----------
     Личное поле ввода: строка уходит в игру тем же путём, что сообщение чата Twitch от тебя (в чат Twitch не пишется, никому не видна).
     Не команда текущего места - игра отвечает «не поняла». Одна строка в пути; лимит - как в чате Twitch (20 за 30 с).
     История последних строк с ответом игры - только в памяти этой страницы. Enter - отправить, ↑ / ↓ - прошлые строки.
     Узел постоянный (не пересобирается с вкладкой): набор текста и фокус не сбиваются; обновляется только по событиям (без таймеров). */
  const SAY = { el: null, hist: [], recall: [], ri: -1, pend: null, warnAt: 0, warnKey: '' };
  const SAY_MAX = 100, SAY_HIST = 8;
  // экран просит молчать (газ ловушки, финт или тишина у босса) - первое Enter только предупреждает
  function sayHush(v) {
    if (!v || !v.on) return '';
    if (v.tr && v.tr.gas && (v.tr.st === 'act' || v.tr.st === 'wait')) return 'Газ: ничего не пиши, пока он не рассеется';
    const M = v.bg && v.bg.mech; if (M && (M.fake || (M.fam === 'silence' && M.id !== 'M94' && M.id !== 'M55') || /ничего не пиш|молчите|не пишите/i.test(M.tip || ''))) return M.fake ? 'Финт: ничего не пиши!' : 'Тишина: молчи - кто напишет, тот получит';
    return '';
  }
  function sayMount(el, v) {
    const on = !!(v && v.on && qaOn() && X.say);
    if (!on) { if (SAY.el) SAY.el.hidden = true; return; }
    if (!SAY.el) {
      const box = document.createElement('section'); box.className = 'q-say'; box.setAttribute('aria-label', 'Команда в поход');
      // 26.10 (стример): «предыдущие команды» - видно 2-3 последние строки, «все» - раскрыть; ниже - «окно ввода команд»
      box.innerHTML = `<div class="q-sayb"><div class="q-sayt"><span>Предыдущие команды</span><button type="button" class="q-sayx" aria-expanded="false" aria-controls="qSayH">все ▾</button></div><ol class="q-sayh" id="qSayH" aria-live="polite" aria-label="Твои последние строки и нажатия"></ol><p class="q-say0 muted">Здесь будут твои команды и нажатия - с ответом игры</p></div><p class="q-sayw" role="alert" hidden></p>`
        + `<form class="q-sayf" autocomplete="off"><label class="q-sayl" for="qSayIn">Команда в поход</label><input id="qSayIn" class="q-sayi" type="text" maxlength="${SAY_MAX}" enterkeyhint="send" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Команда в поход: удар, лечить, 2…">`
        + `<button type="submit" class="qa-b main q-says" aria-label="Отправить">${svgI('right')}</button></form><p class="q-sayn muted">Как сообщение в чат Twitch, только видит его одна игра. Enter - отправить, ↑ - прошлое.</p>`;
      const inp = box.querySelector('input'), form = box.querySelector('form'), tg = box.querySelector('.q-sayx');
      tg.addEventListener('click', () => { const o = !box.classList.contains('open'); box.classList.toggle('open', o); tg.setAttribute('aria-expanded', String(o)); tg.textContent = o ? 'свернуть ▴' : 'все ▾'; sayPaint(); });
      form.addEventListener('submit', (e) => { e.preventDefault(); saySend(inp); });
      // 26.10 (решение стримера): вставлять в строку нельзя - слово печатают сами (и вставкой, и перетаскиванием, и подсказкой ввода)
      const noPaste = (e) => { e.preventDefault(); sayNote('вставлять нельзя - напечатай сам'); };
      inp.addEventListener('paste', noPaste); inp.addEventListener('drop', noPaste);
      inp.addEventListener('beforeinput', (e) => { if (/^insertFrom(Paste|Drop|PasteAsQuotation)$/.test(e.inputType || '')) noPaste(e); });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); saySend(inp); return; }   // сам: форма с выключенной кнопкой Enter не отправляет (а ответить «ещё в пути» надо)
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          if (!SAY.recall.length) return; e.preventDefault();
          SAY.ri = e.key === 'ArrowUp' ? Math.min(SAY.recall.length - 1, SAY.ri + 1) : Math.max(-1, SAY.ri - 1);
          inp.value = SAY.ri < 0 ? '' : SAY.recall[SAY.ri]; try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (er) {}
        } else if (e.key === 'Escape') { inp.value = ''; SAY.ri = -1; }
      });
      SAY.el = box;
    }
    if (SAY.el.parentNode !== el) el.appendChild(SAY.el);
    SAY.el.hidden = false;
    const hush = sayHush(v), w = SAY.el.querySelector('.q-sayw');
    if (hush !== SAY.warnKey) { SAY.warnKey = hush; SAY.warnAt = 0; w.hidden = !hush; w.textContent = hush ? `⚠ ${hush}` : ''; }
    sayPaint();
  }
  async function saySend(inp) {
    const line = String(inp.value || '').replace(/\s+/g, ' ').trim().slice(0, SAY_MAX);
    if (!line) return;
    if (await sayLine(line)) { SAY.ri = -1; inp.value = ''; }
  }
  // строка в игру (поле ввода и кнопки мест - одна дорога): false - не ушла (в пути другая, экран просит молчать)
  async function sayLine(line, o = {}) {
    if (SAY.pend && Date.now() - SAY.pend.at < 9000) { sayNote('подожди - прошлая строка ещё в пути'); return false; }
    // экран просит молчать - отправим, только если Enter нажали ещё раз (строка с сайта считается так же, как сообщение чата)
    if (SAY.warnKey && !o.sure && Date.now() - SAY.warnAt > 4000) { SAY.warnAt = Date.now(); sayNote('экран просит молчать - нажми Enter ещё раз, если всё же отправить'); return false; }
    SAY.warnAt = 0;
    const it = { line, st: 'wait', at: Date.now(), id: '', msg: '', ...(o.btn ? { btn: 1, pb: 1 } : {}) };
    SAY.hist.push(it); if (SAY.hist.length > SAY_HIST) SAY.hist.shift();
    if (SAY.recall[0] !== line) { SAY.recall.unshift(line); if (SAY.recall.length > SAY_HIST) SAY.recall.pop(); }
    SAY.pend = it; sayPaint();
    const r = await X.say(line);
    if (!r || r.ok === false) { it.st = 'no'; it.msg = (r && r.error) || 'не отправлено'; if (SAY.pend === it) SAY.pend = null; sayPaint(); return true; }
    it.id = r.id || ''; if (r.t && r.t !== line) { it.line = r.t; const i = SAY.recall.indexOf(line); if (i >= 0) SAY.recall[i] = r.t; }   // ↑ вернёт то, что ушло в игру («!щит» → «щит»)
    setTimeout(() => { if (it.st === 'wait') { it.st = 'no'; it.msg = 'игра не ответила - проверь на стриме'; if (SAY.pend === it) SAY.pend = null; sayPaint(); } }, 15000);
    return true;
  }
  /* 26.10: кнопки мест (основа; какие включены - настройка похода siteBtns, выбирает стример): готовая строка команды - уходит строкой,
     как из поля ввода (ответ игры - в истории строк). «warn» (бежать, откуп…) - вторым нажатием за 4 с. Под стадией места */
  const PBA = { k: '', at: 0 };
  // предупреждение перед вторым нажатием (бегство - урон в спину; откуп - сколько монет уйдёт: pct % кошелька, как в бою)
  function pbWarn(x) {
    if (x.x && x.x.k === 'flee') return 'Точно бежать? Враг может ударить в спину - получишь урон';
    if (x.x && x.x.k === 'pay') { const h = X.hero() || {}, have = Math.max(0, Math.floor(+h.money || 0)), pct = +x.x.pct || 10; if (have <= 0) return 'Откупиться нечем - кошелёк пуст'; const cost = Math.max(1, Math.round(have * pct / 100)); return `Точно откуп? Уйдёт ${X.moneyText ? X.moneyText(cost) : cost} (${pct}% кошелька), зато без урона`; }
    return `Точно? ${x.l}`;
  }
  // 28.10 (стример): подсказка при наведении - чем грозит бегство и сколько стоит откуп (до нажатия)
  function pbTip(x) {
    if (x.x && x.x.k === 'flee') return 'Сбежать из боя. Враг может ударить в спину - можно получить урон. Нажми дважды';
    if (x.x && x.x.k === 'pay') { const h = X.hero() || {}, have = Math.max(0, Math.floor(+h.money || 0)), pct = +x.x.pct || 10; if (have <= 0) return 'Откупиться и уйти из боя без урона. Сейчас нечем - кошелёк пуст'; const cost = Math.max(1, Math.round(have * pct / 100)); return `Откупиться и уйти из боя: спишется ${X.moneyText ? X.moneyText(cost) : cost} (${pct}% кошелька), урона 0. Нажми дважды`; }
    return '';
  }
  const GROUPS = [['', ''], ['tg', 'Помочь своим'], ['act', ''], ['esc', 'Уйти из боя']];
  function pbHtml(v) {
    if (!v.pb || !v.pb.b || !v.pb.b.length || !qaOn() || !X.say) return '';
    const arm = (t) => PBA.k === t && Date.now() - PBA.at < 4000, role = (X.hero() && X.hero().role) || '';
    const inB = !v.b || ['on', 'reserve'].includes(meIn(v.b).st);   // бегство, «вытащить», «освободить» - только тем, кто в этом бою
    const list = v.pb.b.filter((x) => !(x.x && x.x.role && !x.x.role.split(',').includes(role)) && (inB || !['esc', 'tg'].includes(x.g || ''))), warnOn = list.find((x) => x.c === 'warn' && arm(x.t));
    const one = (x) => { const tip = pbTip(x); return `<button type="button" class="qa-b ${x.c === 'main' ? 'main' : x.c === 'warn' ? (arm(x.t) ? 'urge' : 'warn') : ''}${lineSt(x.t)}" data-qpb="${esc(x.t)}" data-qpbc="${x.c || ''}"${tip ? ` data-tip="${esc(tip)}" aria-description="${esc(tip)}"` : ''}>${esc(x.l)}${arm(x.t) ? '<small>ещё раз - точно</small>' : ''}</button>`; };
    const rows = GROUPS.map(([g, title]) => { const xs = list.filter((x) => (x.g || '') === g); return xs.length ? `<div class="q-pbg ${g ? 'g-' + g : ''}">${title ? `<span class="muted">${title}</span>` : ''}<div class="qa-row">${xs.map(one).join('')}</div></div>` : ''; }).join('');
    return rows ? `<section class="q-card qa q-pb" aria-label="Действия здесь">${rows}${warnOn ? `<p class="qa-st warn" role="alert">⚠ ${esc(pbWarn(warnOn))}</p>` : ''}</section>` : '';
  }
  function pbClick(b) {
    const t = b.dataset.qpb; if (!t) return;
    if (b.dataset.qpbc === 'warn' && !(PBA.k === t && Date.now() - PBA.at < 4000)) { PBA.k = t; PBA.at = Date.now(); keyTab = ''; paint(); setTimeout(() => { if (PBA.k === t) { PBA.k = ''; keyTab = ''; paint(); } }, 4100); return; }
    PBA.k = ''; sayLine(t, { sure: true, btn: 1 }); keyTab = ''; paint();
  }
  function sayResult(r) {
    const it = SAY.hist.find((x) => x.id && x.id === r.id) || (SAY.pend && !SAY.pend.id ? SAY.pend : null); if (!it) return;
    if (SAY.pend === it) SAY.pend = null;
    it.st = r.ok ? 'ok' : 'no'; it.msg = r.ok ? (r.x && r.x.w ? `принято · ${r.x.w}` : 'принято') : (r.error || 'игра не приняла');
    if (r.x && r.x.t) it.line = r.x.t;
    sayPaint();
    if (it.pb || qaOn()) { keyTab = ''; paint(); }   // 26.10: кнопка места - зелёная / красная по ответу
  }
  // 26.10 (стример): история «предыдущих команд» - и строки, и нажатия кнопок, с ответом игры
  function histAdd(line, st, o = {}) { const it = { line, st, at: Date.now(), id: '', msg: '', ...o }; SAY.hist.push(it); if (SAY.hist.length > SAY_HIST) SAY.hist.shift(); sayPaint(); return it; }
  function histSet(it, st, msg) { it.st = st; it.msg = msg; it.at2 = Date.now(); sayPaint(); }
  // кнопка места по строке: в пути - контур, принято - зелёная (12 с), отказ - красная (2,5 с)
  function lineSt(t) { for (let i = SAY.hist.length - 1; i >= 0; i--) { const x = SAY.hist[i]; if (x.line !== t) continue; const age = Date.now() - (x.at2 || x.at); return x.st === 'wait' ? ' wait' : x.st === 'ok' && age < 12000 ? ' ok' : x.st === 'no' && age < 2500 ? ' bad' : ''; } return ''; }
  function sayNote(t) { const it = { line: '', st: 'note', at: Date.now(), msg: t }; SAY.hist.push(it); if (SAY.hist.length > SAY_HIST) SAY.hist.shift(); sayPaint(); setTimeout(() => { const i = SAY.hist.indexOf(it); if (i >= 0) { SAY.hist.splice(i, 1); sayPaint(); } }, 5000); }
  function sayPaint() {
    if (!SAY.el) return;
    const ol = SAY.el.querySelector('.q-sayh'), btn = SAY.el.querySelector('.q-says');
    const h = SAY.hist.map((x) => x.st === 'note' ? `<li class="note">${esc(x.msg)}</li>` : `<li class="${x.st}${x.btn ? ' btn' : ''}"><b>${esc(x.line)}</b><span>${x.st === 'wait' ? 'в пути…' : x.st === 'ok' ? `${svgI('check', 'ok')}${esc(x.msg)}` : esc(x.msg)}</span></li>`).join('');
    if (ol.innerHTML !== h) ol.innerHTML = h;
    ol.hidden = !SAY.hist.length;
    const z = SAY.el.querySelector('.q-say0'); if (z) z.hidden = !!SAY.hist.length;
    if (!SAY.el.classList.contains('open')) ol.scrollTop = ol.scrollHeight;   // свёрнуто - видны последние
    btn.disabled = !!SAY.pend;
  }

  /* ---------- 26.10 (стример): РАСКЛАДКА ВКЛАДКИ по схеме (тестерам кнопок - qaOn; остальным вкладка как была) ----------
     Сверху вниз: шапка (место, значок участия, «всего в отряде», покинуть / вступить, «как на стриме») → окно действий во всю ширину
     (стадия с таймером, все кнопки и подсказки места) → схема места (≈60%) и журнал (≈40%) → карточка героя (кукла, слоты вокруг,
     здоровье под персонажем) и сумка (библиотека инвентаря) → внизу, прилеплено: «предыдущие команды» и строка ввода.
     Узлы постоянные: каркас собирается один раз, дальше меняется только та часть, чья разметка поменялась (кукла и сумка -
     библиотека инвентаря, её узлы не пересоздаются; строка ввода - своя). Функции мест кладут схему в SCH, а не в поток. */
  let SCH = null;
  const QL = { k: {}, wrap: null, doll: null, bag: null, inv: null, invTry: 0, lv: { at: 0, hp: 0 }, tk: '' };
  const QL_SKEL = '<div class="ql">'
    + '<header class="ql-top" data-ql="top"></header>'
    + '<section class="q-card ql-act" data-ql="act" aria-label="Действия" aria-live="polite"></section>'
    + '<div class="ql-row ql-r1"><section class="q-card ql-sch" data-ql="sch" aria-label="Схема места"></section><section class="q-card ql-log" data-ql="log" aria-label="Журнал"></section></div>'
    + '<div class="ql-row ql-r2"><section class="q-card ql-hero" aria-label="Мой герой"><div data-ql="hn"></div><div class="ql-doll" data-qlp="doll"></div><div data-ql="dollf"></div><div data-ql="hv"></div></section>'
    + '<section class="q-card ql-inv" aria-label="Сумка"><div data-ql="ih"></div><div class="ql-bag" data-qlp="bag"></div><div data-ql="bagf"></div></section></div>'
    + '</div>';
  const libOn = () => !!(window.LGInventory && X.invMount && X.invData);
  function layTitle(v) { return v.b ? `Бой · ${v.b.title || v.t}` : v.lair ? 'Логово Закхуэля' : v.tr ? `${v.tr.icon || ''} ${v.tr.name}` : `${KIND_RU[v.k] || 'Поход'}${v.t ? ' · ' + v.t : ''}`; }
  // шапка: место и значок участия; мелко - «Всего в отряде: N», местность, бросок; справа - покинуть / вступить и «как на стриме»
  function layTop(v) {
    const pp = partyOf(v), pb = pp === 'in' ? ['in', 'в отряде'] : pp === 'q' ? ['q', 'вступишь на остановке'] : pp === 'ghost' ? ['gh', 'призрак'] : ['out', 'не в отряде'];
    const sub = [v.n ? `Всего в отряде: ${v.n}` : '', v.ter, v.roll && v.roll.n ? `бросок ${v.roll.by}: ${v.roll.n}` : ''].filter(Boolean).join(' · ');
    let pbtn = '';
    // там же, где было «Вступить / Покинуть отряд» (qaSquad): карта и голосование за путь; в бою, ловушке, событии, лавке, данже - нет
    const sq = !v.b && !v.bg && !v.dgn && !v.lair && !v.tr && !v.ev && !v.pz && !v.loot && !(v.sh && v.sh.items && v.sh.items.length) && !(v.town && X.hero() && X.hero().cy && X.hero().tw);
    if (sq) {
      if (pp === 'in' && v.cm !== false) { const arm = QA.leave && Date.now() - QA.leave < 4000; pbtn = `<button type="button" class="qa-b ${arm ? 'urge' : 'warn'} ql-pb${qaSt({ k: 'leave' })}" data-qleave${qaBusy() ? ' disabled' : ''}>${arm ? 'точно покинуть?' : 'покинуть отряд?'}</button>`; }
      else if (pp !== 'in' && pp !== 'q' && pp !== 'ghost') pbtn = qaBtn({ k: 'join', _l: 'вступить в поход' }, 'вступить в поход?', 'main ql-pb', false, v.cm === false ? 'Вступить в поход: отряд в пути - вступишь на остановке' : '');
    }
    return `<div class="ql-tt"><h2>${esc(layTitle(v))} <span class="q-pt ${pb[0]}" role="status">${pb[1]}</span></h2>${sub ? `<p class="ql-sub muted">${esc(sub)}</p>` : ''}${v.dg ? `<p class="q-dg">⚠ ${esc(v.dg)}</p>` : ''}${lwHtml(v, 'q-dg')}</div>`
      + `<div class="ql-tr">${pbtn}<div class="q-sync"><button type="button" class="q-dl" aria-expanded="false">${svgI('clock')}как на стриме · ${delayS(v)} с</button><div class="q-dlp" hidden><p>Сайт показывает бой с задержкой твоего стрима. Обгоняет стрим — прибавь, отстаёт — убавь.</p><div class="q-dlb"><button type="button" data-adj="-1" aria-label="Меньше на секунду">−</button><b>${delayS(v)} с</b><button type="button" data-adj="1" aria-label="Больше на секунду">+</button><button type="button" data-adj="0">как у стримера</button></div></div></div></div>`;
  }
  // окно действий: то же, что места рисовали отдельными карточками (стадия, кнопки, подсказки, итог), - одним окном по центру
  function layAct(v) {
    const h0 = X.hero(), tw = v.town && h0 && h0.cy && h0.tw && X.openTown ? `<p class="q-town"><button type="button" class="btn primary" data-qtown="${esc(v.town.id)}">🏘 Войти в город «${esc(v.town.name)}»</button></p>` : '';
    let a = '';
    if (v.b && v.b.gb && v.bg) a = bgHtml(v, qaBattle(v, v.b, meIn(v.b)));
    else if (v.b) a = battleHtml(v);
    else if (v.bg) a = bgHtml(v);
    else if (v.dgn) a = dgHtml(v);
    else if (v.lair && v.lair.is) a = islesHtml(v);
    else if (v.lair) a = lairHtml(v);
    else if (v.tr) a = trapHtml(v);
    else if (v.pz) a = pzHtml(v);   // 28.10 (map-puzzles): головоломка
    else if (v.ev) a = v.ev.gob ? gobHtml(v) : v.ev.hw ? hwEvHtml(v) : qaEvent(v);   // 28.10: событие Изнанки, ярмарка гоблинов
    else if (v.vote && !v.vote.done) a = voteHtml(v);
    else if (v.loot) a = lootHtml(v);
    else if (v.sh && v.sh.items && v.sh.items.length) a = shopHtml(v);
    const pb = pbHtml(v);
    if (pb) { const i = a.indexOf('<div class="q-stage'), j = i >= 0 ? a.indexOf('</div>', i) : -1; a = j >= 0 ? a.slice(0, j + 6) + pb + a.slice(j + 6) : pb + a; }   // кнопки мест - сразу под стадией
    if (!a.replace(/<[^>]*>/g, '').trim()) a = layHint(v);
    return tw + a;
  }
  const gwName = (v) => (v.gather && v.gather.hw ? '🎃 Сбор у портала' : 'Сбор отряда');   // 28.10 (hw-portal-map)
  // нет действий - коротко, что сейчас происходит
  function layHint(v) {
    const p = partyOf(v), g = v.gather ? `<p class="q-big">${gwName(v)} · <span data-until="${v.gather.until}"></span> с</p>` : '';
    const t = v.k === 'rest' ? 'Привал: отряд отдыхает у костра' : v.k === 'travel' ? 'Отряд в пути' : v.k === 'town' ? 'Отряд в городе' : v.gather && v.gather.hw ? 'Отряд собирается у портала - пиши «портал»' : v.k === 'gather' || v.gather ? 'Стример собирает отряд' : 'Отряд на карте - стример выбирает, куда идти';
    const me = p === 'in' ? 'Ты в отряде - жди следующего места: кнопки появятся здесь' : p === 'q' ? 'Вступишь, когда отряд остановится' : p === 'ghost' ? 'Твой герой - призрак: в поход - после воскрешения' : 'Ты не в отряде - нажми «вступить в поход?» сверху или напиши «поход»';
    return `<div class="q-stage"><b>${esc(KIND_RU[v.k] || 'Поход')}</b><span>${esc(t)}</span></div>${g}<p class="muted ql-hint">${esc(me)}</p>`;
  }
  // журнал: в бою - вкладки «Бой» (журнал боя) и «Мой» (журнал игрока); вне боя - журнал игрока
  function layLog(v) {
    const b = v.b, fd = b && Array.isArray(b.fd) && b.fd.length ? b.fd : null, jr = X.jrHtml ? X.jrHtml(30) : '';
    const tabs = !!(b && b.st !== 'end' || fd);
    const t = tabs ? (QA.jt || 'b') : 'j';
    const bt = b && b.st === 'tele' ? '<p class="muted">Журнал боя - после хода врага (в нём может быть слово)</p>' : fd ? `<ul class="q-cmds q-fd">${fd.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ul>` : '<p class="muted">Пока тихо</p>';
    return `<div class="ql-lh"><b>Журнал</b>${tabs ? `<div class="ql-lt" role="tablist">${[['b', 'Бой'], ['j', 'Мой']].map(([k, l]) => `<button type="button" role="tab" data-qjt="${k}" aria-selected="${t === k}">${l}</button>`).join('')}</div>` : ''}</div>`
      + `<div class="ql-lb">${t === 'b' ? bt : `<div class="q-jr">${jr || '<p class="muted">Журнал загружается…</p>'}</div>`}</div>`;
  }
  const hpOf = (h, v) => { const mx = (h.stats && h.stats.hp) || 0; let now0 = h.ghost ? 0 : Math.max(0, Math.min(mx, h.hpNow ?? mx)); if (v && v.b && v.b.hp != null && v.b.hp >= 0 && mx) now0 = Math.round(v.b.hp * mx); return [now0, mx]; };
  // карточка героя: имя и класс; под куклой - полоса здоровья (под персонажем) и «Здоровье a/b», баффы, еда
  function layHero(v) {
    const h = X.hero(); if (!h) return { hn: '<p class="muted">Герой загружается…</p>', hv: '' };
    const [hp, mx] = hpOf(h, v), k = mx ? hp / mx : 0, bf = (h.bf || []).filter((x) => +x[3] > X.now()), eatCd = h.eatUntil && h.eatUntil > X.now() ? h.eatUntil : 0;
    QA.rtEnd = Math.min(...[eatCd || Infinity, ...bf.map((x) => +x[3])]);
    const hn = `<div class="q-ch"><b>${esc(h.name || X.login())}</b><span class="muted">${h.ghost ? 'призрак' : `${esc(X.role(h.role))}${h.level ? ` · ур. ${+h.level}` : ''}`}</span></div>`;
    const hv = `<div class="ql-hp">${h.ghost ? '<p class="muted">Призрак - здоровье после воскрешения</p>' : `${hpBar(k)}<p>Здоровье <b>${hp}/${mx}</b></p>`}</div>`
      + (bf.length ? `<ul class="qa-bf" aria-label="Баффы">${bf.map((x) => `<li><b>${esc(x[0] || x[1])}</b><span>${esc(stRu(x[1]))} +${+x[2]}</span><i data-rt="${+x[3]}"></i></li>`).join('')}</ul>` : '')
      + (eatCd ? `<p class="muted ql-eat">Еда и зелья - через <i data-rt="${eatCd}"></i></p>` : '');
    return { hn, hv };
  }
  // без библиотеки инвентаря (не загрузилась) - кукла и сумка простой разметкой: надетое по слотам, еда и зелья - кнопкой
  const SLOT5 = [['helmet', 'шлем'], ['weapon', 'оружие'], ['armor', 'доспех'], ['trinket', 'амулет'], ['shield', 'щит']];
  function layDollF(v) {
    const h = X.hero(); if (!h) return '';
    const items = h.items || [];
    return `<div class="lgi-stage ql-fb">${SLOT5.map(([s, n]) => { const it = items.find((x) => x.on && x.slot === s); return `<span class="ql-sl${it ? '' : ' e'}" data-slot="${s}"${it && it.rarity ? ` data-r="${esc(it.rarity)}"` : ''} role="img" aria-label="${n}: ${esc(it ? it.name : 'пусто')}">${it ? qaArt(it) : ''}<small>${it ? esc(it.name) : n}</small></span>`; }).join('')}<div class="lgi-ped">${dd('stern')}</div></div>`;
  }
  function layBagF() {
    const h = X.hero(); if (!h) return '';
    const bag = (h.items || []).filter((it) => !it.on).slice(0, 60), eatCd = h.eatUntil && h.eatUntil > X.now();
    const isFood = (it) => !it.wearable && (it.slot === 'food' || it.slot === 'potion') && it.effect && !it.effect.revive;
    const cell = (it) => { const eat = isFood(it) && !h.ghost; return `<li${it.rarity ? ` data-r="${esc(it.rarity)}"` : ''}>${eat ? `<button type="button" class="q-bi" data-qa="${qaData({ k: 'eat', uid: it.uid })}"${eatCd ? ' disabled' : ''} aria-label="${esc((it.slot === 'potion' || it.drink ? 'Выпить: ' : 'Съесть: ') + it.name)}">` : `<span class="q-bi" role="img" aria-label="${esc(it.name)}">`}${qaArt(it)}${eat ? '</button>' : '</span>'}</li>`; };
    return bag.length ? `<ul class="q-bag">${bag.map(cell).join('')}</ul>` : '<p class="muted">Сумка пуста</p>';
  }
  function layInvHead() {
    const h = X.hero() || {}, n = (h.items || []).filter((it) => !it.on).length;
    return `<div class="q-ch"><b>Сумка</b><span class="muted">${h.sg ? `${h.sg.used} / ${h.sg.cap}` : `${n} ${plural(n, 'вещь', 'вещи', 'вещей')}`}${h.money != null && X.money ? ` · ${X.money(h.money)}` : ''}</span></div>`;
  }
  function layParts(v) {
    SCH = { h: '' };
    let act;
    try { act = layAct(v); } finally { /* SCH заполнен местом */ }
    const sch = SCH.h || schemeHtml(v); SCH = null;
    const H = layHero(v), lib = libOn();
    return { top: layTop(v), act, sch, log: layLog(v), hn: H.hn, hv: H.hv, dollf: lib ? '' : layDollF(v), ih: layInvHead(), bagf: lib ? '' : layBagF() };
  }
  // сумка и кукла - один раз (библиотека инвентаря через app.js: те же действия, что «Персонаж»); дальше - только новые данные
  function invSync(el) {
    if (!libOn()) { if (QL.inv) { try { QL.inv.destroy(); } catch (e) { /* уже снята */ } QL.inv = null; } return; }
    if (!QL.inv) { try { QL.inv = X.invMount(QL.bag, QL.doll, el); } catch (e) { QL.inv = null; console.warn('[поход] сумка', e); } return; }
    const d = X.invData(); if (d) QL.inv.update(d);
  }
  // «ход принят» (бой) и «слово принято» - комментарием к строке / нажатию в «предыдущих командах»; ход из чата - отдельной строкой
  function turnHist(v) {
    const b = v && v.b; if (!b) return;
    const k1 = b.turn ? `t:${b.id}:${b.round}:${b.turn}` : '', k2 = b.tele && b.tele.ok ? `w:${b.id}:${b.round}` : '';
    for (const [k, msg, line] of [[k1, k1 && turnLine(b).replace(/<[^>]*>/g, '').trim(), k1 && turnRu(b.turn)], [k2, 'слово принято', 'слово врага']]) {
      if (!k || QL.tk.includes(k)) continue;
      QL.tk = (QL.tk + '|' + k).slice(-400);
      const it = [...SAY.hist].reverse().find((x) => x.st !== 'note' && x.st !== 'no' && Date.now() - x.at < 20000);
      if (it) { it.st = 'ok'; it.msg = msg; it.at2 = Date.now(); sayPaint(); } else histAdd(line, 'ok', { msg: msg + ' · из чата' });
    }
  }
  function layPaint(el, v) {
    if (QL.inv && QL.inv.dragging && QL.inv.dragging()) return;   // тянут вещь - дорисуем после (paint по таймеру)
    turnHist(v);
    const P = layParts(v), key = Object.values(P).join('\u0001');
    let wrap = el.querySelector(':scope > .q-wrap');
    const fresh = !wrap || !wrap.classList.contains('ql-on');
    if (!fresh && key === keyTab) { if (v.dgn && !v.b) dgMarks(v); sayMount(el, v); return; }
    const forced = !keyTab; keyTab = key;
    if (!wrap) { el.innerHTML = ''; wrap = document.createElement('div'); el.appendChild(wrap); }
    if (fresh) {
      wrap.className = 'q-wrap ql-on'; wrap.innerHTML = QL_SKEL; QL.k = {};
      if (!QL.doll) { QL.doll = document.createElement('div'); QL.doll.className = 'ql-dolli'; QL.bag = document.createElement('div'); QL.bag.className = 'ql-bagi'; }
      wrap.querySelector('[data-qlp="doll"]').appendChild(QL.doll); wrap.querySelector('[data-qlp="bag"]').appendChild(QL.bag);
    } else if (forced) QL.k = {};
    QL.wrap = wrap;
    const ch = {};
    for (const [r, h] of Object.entries(P)) { if (QL.k[r] === h) continue; QL.k[r] = h; const box = wrap.querySelector(`[data-ql="${r}"]`); if (!box) continue; box.innerHTML = h; ncPaint(box); ch[r] = 1; }
    sayMount(el, v); qbag(el, v); invSync(el);
    if (ch.top) { const dl = wrap.querySelector('.q-dl'), dp = wrap.querySelector('.q-dlp');
      if (dl && dp) { dl.onclick = () => { dp.hidden = !dp.hidden; dl.setAttribute('aria-expanded', String(!dp.hidden)); };
        dp.querySelectorAll('[data-adj]').forEach((b) => b.onclick = () => { const d = +b.dataset.adj; adj = d ? Math.max(-10, Math.min(30, adj + d)) : 0; try { localStorage.setItem(ADJ, String(adj)); } catch (e) {} keyTab = ''; tick(); const p2 = el.querySelector('.q-dlp'); if (p2) p2.hidden = false; }); } }
    if (ch.act) {
      const tb = wrap.querySelector('[data-qtown]'); if (tb) tb.onclick = () => X.openTown(tb.dataset.qtown);
      wrap.querySelectorAll('[data-qv]').forEach((b) => { b.onclick = () => { const [vid, n] = b.dataset.qv.split(':').map(Number); castVote(vid, n); }; });
      if (v.sh) shopBind(el, v);
    }
    if (v.dgn && !v.b && (ch.sch || forced)) { dgMount(el, v); wrap.querySelectorAll('[data-dgpan]').forEach((b) => { b.onclick = () => dgPan(+b.dataset.dgpan); }); }
    if (v.b) { foesWant(); squad(wrap.querySelector('.q-squad'), v.b); }
    clocks();
  }
  function layDrop(el) {   // вкладка вернулась к прежнему виду (не тестер / похода нет): библиотека снимается, узлы - заново при возврате
    if (QL.inv) { try { QL.inv.destroy(); } catch (e) { /* уже снята */ } QL.inv = null; }
    const w = el && el.querySelector(':scope > .q-wrap.ql-on'); if (w) w.className = 'q-wrap';
    QL.k = {}; QL.wrap = null;
  }

  /* ---------- 26.10 (стример): схемы мест - простые силуэты в цветах темы сайта (переменные стиля: Легион / Котики), без анимации.
     По мотивам сцен оверлея (client/trap.js, rest.js, event.js, shop.js), упрощённо. Своего места на экране в виде похода нет
     (кроме боя, арены, островов) - рисуем отряд и подпись «ты в отряде», координат не выдумываем. ---------- */
  const SKW = 400, SKH = 230, SKG = 196;
  const skFig = (x, y, s, cls) => `<g class="${cls || 'sk-p'}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})"><circle cy="-31" r="7"/><path d="M-9-21h18l3 21h-24z"/></g>`;
  // отряд: до 14 фигурок рядом (сколько в отряде - подписью)
  function skParty(v, x0, x1, y, s = 1, max = 14) {
    const n = Math.max(1, Math.min(max, +v.n || 6)), out = [];
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1), j = ((i * 37) % 7) - 3; out.push(skFig(x0 + (x1 - x0) * t, y + (i % 2 ? 6 : 0) + j * 0.6, s * (i % 2 ? 0.92 : 1))); }
    return `<g class="sk-party">${out.join('')}</g>`;
  }
  const skGround = (y = SKG) => `<rect class="sk-g" x="0" y="${y}" width="${SKW}" height="${SKH - y}"/><path class="sk-l" d="M0 ${y}H${SKW}"/>`;
  const skT = (x, y, t, cls) => `<text class="${cls || 'sk-t'}" x="${x}" y="${y}">${esc(t)}</text>`;
  function skTrap(T, v) {
    const ty = T.type, nm = String(T.name || ''), P = skParty(v, 70, 330, SKG - 2, 0.9, 10);
    if (ty === 'gas') return skGround() + P + [[90, 110, 46], [170, 96, 54], [250, 112, 50], [320, 100, 40], [130, 140, 36], [280, 150, 34]].map(([x, y, r]) => `<circle class="sk-gas" cx="${x}" cy="${y}" r="${r}"/>`).join('') + skT(200, 40, T.gas && (T.st === 'act' || T.st === 'wait') ? 'не пиши - газ!' : nm, 'sk-t sk-dn');
    if (ty === 'ceiling') return skGround() + `<path class="sk-l" d="M120 0V40M280 0V40"/><rect class="sk-d" x="60" y="40" width="280" height="38" rx="4"/><path class="sk-l" d="M80 59h240"/>${P}<path class="sk-l" d="M70 150V100M330 150V100"/>` + skT(200, 120, 'держите плиту!', 'sk-t');
    if (ty === 'ropes') { const n = Math.max(2, Math.min(9, +T.n || 4)), w = 300 / (n + 1); return skGround() + `<rect class="sk-s" x="40" y="14" width="320" height="14" rx="4"/>${Array.from({ length: n }, (_, i) => { const x = 50 + w * (i + 1); return `<path class="sk-rope" d="M${x} 28C${x - 6} 70 ${x + 6} 100 ${x} 130"/><circle class="sk-a" cx="${x}" cy="146" r="13"/>${skT(x, 151, String(i + 1), 'sk-t sk-on')}`; }).join('')}` + skParty(v, 80, 320, SKG - 2, 0.75, 8); }
    if (ty === 'plates') { let s = ''; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const n = r * 3 + c + 1, x = 110 + c * 64 + (2 - r) * 10, y = 70 + r * 40; s += `<rect class="sk-s" x="${x}" y="${y}" width="56" height="32" rx="5"/>${skT(x + 28, y + 22, String(n))}`; } return skGround() + s + skParty(v, 40, 100, SKG - 2, 0.8, 5) + skT(330, 60, 'выход', 'sk-tm'); }
    if (ty === 'bait') return skGround() + `<rect class="sk-s" x="160" y="140" width="80" height="56"/><rect class="sk-gold" x="170" y="104" width="60" height="36" rx="6"/><path class="sk-l" d="M170 118h60"/><circle class="sk-gold" cx="252" cy="190" r="6"/><circle class="sk-gold" cx="148" cy="192" r="5"/>` + skParty(v, 30, 130, SKG - 2, 0.8, 6) + skT(200, 80, T.taker ? 'сундук уже открывают' : 'приманка', 'sk-tm');
    if (ty === 'greed') return skGround() + `<path class="sk-s" d="M0 0H400V24L370 40 340 22 300 46 260 20 220 42 180 18 140 44 100 22 60 40 30 20 0 34Z"/><path class="sk-gold" d="M120 196Q200 96 280 196Z"/><circle class="sk-gold" cx="170" cy="170" r="7"/><circle class="sk-gold" cx="226" cy="160" r="6"/>` + skParty(v, 40, 110, SKG - 2, 0.8, 5) + skParty({ n: 3 }, 310, 370, SKG - 2, 0.8, 3);
    if (ty === 'code') { const L = Math.max(3, Math.min(6, +T.len || 4)); return skGround() + `<path class="sk-s" d="M130 196V80Q200 10 270 80V196Z"/><path class="sk-l" d="M200 40V196"/>${Array.from({ length: L }, (_, i) => `<circle class="sk-rune" cx="${200 - (L - 1) * 14 + i * 28}" cy="120" r="11"/>`).join('')}` + skParty(v, 20, 110, SKG - 2, 0.8, 5) + skT(200, 160, 'руны: 1–' + (+T.max || 9), 'sk-tm'); }
    // 28.10: переправа - берега, кочки по шагам (пройденные - светлые), отряд слева; трясина - топь, отряд по пути, шкала «увязли»
    if (ty === 'crossing' && T.cx) { const C = T.cx, n = Math.max(2, C.n || 4), dx = 200 / Math.max(1, n - 1); let s = `<rect class="sk-m" x="80" y="120" width="250" height="${SKH - 120}"/><path class="sk-g" d="M0 120H90L70 ${SKH}H0Z"/><path class="sk-g" d="M400 110H320L340 ${SKH}H400Z"/>`;
      for (let i = 0; i < n; i++) { const x = 105 + dx * i, hs = C.hist[i]; for (let r = 1; r <= (C.rows[i] || 2); r++) { const y = 140 + (r - 1) * 30, on = hs ? hs[0] === r : false, sunk = hs ? hs[1].includes(r) : i === C.step && C.bad.includes(r); s += `<ellipse class="${on ? 'sk-a' : sunk ? 'sk-d' : 'sk-s'}" cx="${x}" cy="${y}" rx="15" ry="7"/>${i === C.step && !hs && !sunk ? skT(x, y + 4, String(r), 'sk-tm') : ''}`; } }
      return s + skParty(v, 8, 66, 150, 0.6, 5) + skT(360, 100, '💰', 'sk-tm') + skT(200, 60, `шаг ${Math.min(C.step + 1, n)} из ${n}`, 'sk-tm'); }
    if (ty === 'bog' && T.bog) { const G = T.bog, x0 = 20 + G.pos * 2.6; return `<rect class="sk-m" x="0" y="120" width="${SKW}" height="${SKH - 120}"/><path class="sk-g" d="M360 110H400V${SKH}H350Z"/>` + skParty(v, x0, x0 + 60, 150 + G.sink * 0.3, 0.6, 6) + `<rect class="sk-s" x="20" y="30" width="120" height="10" rx="4"/><rect class="sk-d" x="20" y="30" width="${(1.2 * G.sink).toFixed(0)}" height="10" rx="4"/>` + skT(80, 60, `увязли ${G.sink}%`, 'sk-tm') + (G.beast && !G.beast.res ? skT(260, 60, `${G.beast.name}!`, 'sk-t sk-dn') : ''); }
    if (ty === 'share') return skGround() + `<path class="sk-s" d="M90 196V70Q200 0 310 70V196Z"/><rect class="sk-m" x="150" y="140" width="100" height="40" rx="6"/><rect class="sk-gold" x="176" y="114" width="48" height="28" rx="4"/>` + skParty(v, 30, 80, SKG - 2, 0.8, 4) + skParty({ n: 3 }, 320, 370, SKG - 2, 0.8, 3) + skT(200, 60, 'поровну или себе?', 'sk-tm');
    if (/брев|маятн/i.test(nm)) return skGround() + `<path class="sk-l" d="M120 10H280"/><path class="sk-l" d="M200 10L150 120"/><rect class="sk-s" x="105" y="112" width="96" height="28" rx="14" transform="rotate(-20 150 126)"/><path class="sk-l sk-dash" d="M120 140Q200 180 280 140"/>` + P;
    if (/стрел/i.test(nm)) return skGround() + `<rect class="sk-s" x="0" y="40" width="40" height="156"/><rect class="sk-s" x="360" y="40" width="40" height="156"/>${[80, 120, 160].map((y) => `<path class="sk-arrow" d="M44 ${y}H120M120 ${y}l-10-6M120 ${y}l-10 6"/><path class="sk-arrow" d="M356 ${y + 14}H280M280 ${y + 14}l10-6M280 ${y + 14}l10 6"/>`).join('')}` + P;
    if (/валун/i.test(nm)) return skGround() + `<path class="sk-g" d="M260 196L400 60V196Z"/><circle class="sk-s" cx="320" cy="118" r="40"/><path class="sk-l" d="M306 104l10 12M332 110l-8 10M314 136l8-4"/><path class="sk-l sk-dash" d="M270 160Q230 180 200 186"/>` + skParty(v, 40, 230, SKG - 2, 0.85, 9);
    return skGround() + `<path class="sk-d" d="M200 40L240 110H160Z"/>${skT(200, 100, '!', 'sk-t sk-on')}` + P;
  }
  function skEvent(E, v) {
    const lk = E.look, P = skParty(v, 30, 150, SKG - 2, 0.85, 7);
    if (lk === 'traveler') return skGround() + `<rect class="sk-s" x="220" y="120" width="110" height="50" rx="6"/><path class="sk-m" d="M216 120Q275 70 334 120Z"/><circle class="sk-s" cx="240" cy="178" r="16"/><circle class="sk-s" cx="310" cy="178" r="16"/>${skFig(195, SKG - 2, 1.1, 'sk-p sk-npc')}` + P + skT(275, 60, E.st === 'vote' ? 'помочь или обобрать?' : 'путник', 'sk-tm');
    if (lk === 'dice') return skGround() + `<rect class="sk-s" x="200" y="150" width="120" height="14" rx="4"/><path class="sk-l" d="M215 164V196M305 164V196"/><rect class="sk-dice" x="230" y="124" width="24" height="24" rx="4"/><rect class="sk-dice" x="264" y="128" width="22" height="22" rx="4" transform="rotate(12 275 139)"/><circle class="sk-pip" cx="242" cy="136" r="3"/><circle class="sk-pip" cx="272" cy="134" r="2.6"/><circle class="sk-pip" cx="279" cy="143" r="2.6"/>${skFig(350, SKG - 2, 1.1, 'sk-p sk-npc')}` + P + skT(260, 60, `у бродяги ${+E.purse || 0}`, 'sk-tm');
    if (lk === 'well') return skGround() + `<rect class="sk-s" x="200" y="130" width="100" height="66" rx="8"/><path class="sk-l" d="M210 130V70M290 130V70"/><path class="sk-m" d="M190 74L250 40 310 74Z"/><path class="sk-l" d="M250 74V110"/><circle class="sk-gold" cx="250" cy="116" r="7"/>` + P + skT(250, 26, `монет ${+E.thrown || 0} из ${+E.need || 0}`, 'sk-tm');
    // 28.10: события Изнанки
    if (lk === 'trick') return skGround() + `<rect class="sk-s" x="220" y="96" width="120" height="100"/><path class="sk-m" d="M210 98L280 44 350 98Z"/><rect class="sk-d" x="266" y="140" width="28" height="56"/><circle class="sk-gold" cx="236" cy="188" r="10"/><circle class="sk-gold" cx="326" cy="188" r="10"/>${skFig(190, SKG - 2, 1.1, 'sk-p sk-npc')}` + P + skT(280, 30, E.vt ? `сладость ${E.vt.sweet} · гадость ${E.vt.trick}` : 'сладость или гадость?', 'sk-tm');
    if (lk === 'fortune') return skGround() + `<path class="sk-m" d="M200 196L270 60 340 196Z"/><circle class="sk-a" cx="270" cy="160" r="20"/><rect class="sk-s" x="246" y="180" width="48" height="10" rx="3"/>${skFig(316, SKG - 2, 1.05, 'sk-p sk-npc')}` + P + skT(270, 40, `благословлено ${+E.bn || 0}`, 'sk-tm');
    if (lk === 'cauldron') return skGround() + `<path class="sk-flame" d="M240 196c-10-12-6-24 4-30c-2 12 10 14 6 30zM290 196c-10-12-6-24 4-30c-2 12 10 14 6 30z"/><path class="sk-d" d="M220 120h110l-12 56q-43 16-86 0z"/><ellipse class="sk-a" cx="275" cy="120" rx="58" ry="10"/>${(E.picked || []).map((k, i) => `<circle class="sk-gold" cx="${235 + i * 20}" cy="${102 - (i % 2) * 8}" r="6"/>`).join('')}` + P + skT(275, 40, E.st === 'pay' ? `миска ведьмы: ${Math.min(100, Math.round((+E.pool || 0) / Math.max(1, +E.price || 1) * 100))}%` : (E.picked || []).length ? `в котле ${(E.picked || []).length}` : 'пишите ингредиенты', 'sk-tm');   // 28.10 (hw-events2)
    if (lk === 'lostghost') return skGround() + `<rect class="sk-s" x="300" y="140" width="40" height="56" rx="18"/><path class="sk-a" d="M220 160V96a30 30 0 0 1 60 0v64l-10-10-10 10-10-10-10 10-10-10z"/><circle class="sk-eye" cx="240" cy="98" r="4"/><circle class="sk-eye" cx="260" cy="98" r="4"/>` + P + skT(250, 40, +E.qn ? `загадка ${Math.max(1, +E.qi || 1)} из ${E.qn}` : 'загадка призрака', 'sk-tm');
    if (lk === 'skeldance') return skGround() + [220, 280, 340].map((x) => `<circle class="sk-a" cx="${x}" cy="110" r="14"/><path class="sk-l" d="M${x} 124v40M${x - 16} 138h32M${x} 164l-12 30M${x} 164l12 30"/>`).join('') + P + skT(280, 40, E.st === 'show' ? 'запоминай па!' : E.st === 'input' ? 'повтори цепочку' : 'пляска скелетов', 'sk-tm');
    if (lk === 'priest') return skGround() + `<rect class="sk-s" x="210" y="140" width="90" height="56" rx="4"/><path class="sk-gold" d="M232 140Q255 118 278 140Z"/><rect class="sk-a" x="296" y="104" width="8" height="36"/><path class="sk-flame" d="M300 104q-6-10 0-18q6 8 0 18z"/>${skFig(350, SKG - 2, 1.15, 'sk-p sk-npc')}` + P + skT(255, 60, 'чаша жреца', 'sk-tm');
    return skGround() + P;
  }
  // 28.10 (map-puzzles): головоломка - камень-плита посередине, отряд слева (что на плите - не рисуем: ответ - на стриме и во вкладке)
  function skPuzzle(P, v) {
    const k = P.kind, P0 = skParty(v, 30, 150, SKG - 2, 0.85, 7);
    let x = '';
    if (k === 'cups') x = [230, 290, 350].map((cx, i) => `<path class="${P.res && P.res.ans === String(i + 1) ? 'sk-gas' : 'sk-gold'}" d="M${cx - 18} 132h36q0 28-18 32q-18-4-18-32z"/><path class="sk-l" d="M${cx} 164v20M${cx - 12} 190h24"/>${skT(cx, 126, String(i + 1), 'sk-tm')}`).join('');
    else if (k === 'scales') x = `<path class="sk-l" d="M290 190V90M220 ${100 + Math.max(-12, Math.min(12, ((P.sums || [])[1] || 0) - ((P.sums || [])[0] || 0)) * 2)}L360 ${100 - Math.max(-12, Math.min(12, ((P.sums || [])[1] || 0) - ((P.sums || [])[0] || 0)) * 2)}"/><ellipse class="sk-s" cx="220" cy="${130}" rx="36" ry="9"/><ellipse class="sk-s" cx="360" cy="${130}" rx="36" ry="9"/>`;
    else x = `<path class="sk-s" d="M230 196V70Q290 26 350 70V196Z"/><path class="sk-l" d="M250 100h80M250 124h80M250 148h60"/>`;
    return skGround() + x + P0 + skT(290, 34, P.st === 'done' ? (P.res && P.res.ok ? 'разгадано!' : 'не вышло') : P.st === 'show' ? 'смотри на стрим' : P.name, 'sk-tm');
  }
  function skRoute(v) {
    const V = v.vote && !v.vote.done ? v.vote : null, S = [70, 150];
    let s = skGround(SKG + 12) + `<path class="sk-road" d="M0 175Q40 160 ${S[0]} ${S[1]}"/>`;
    if (V) {
      const n = V.opts.length;
      V.opts.forEach((o, i) => { const y = n === 1 ? 110 : 40 + (150 / (n - 1)) * i, x = 330, me = V.my === o[0];
        s += `<path class="sk-road${o[4] ? ' sk-dash' : ''}${me ? ' sk-me' : ''}" d="M${S[0]} ${S[1]}C${S[0] + 120} ${S[1]} ${x - 120} ${y} ${x - 16} ${y}"/><circle class="${me ? 'sk-a' : 'sk-s'}" cx="${x}" cy="${y}" r="15"/>${skT(x, y + 5, String(o[0]), me ? 'sk-t sk-on' : 'sk-t')}${skT(x - 28, y - 18, `${o[1]}${o[4] ? ' (назад)' : ''} · ${o[3]}`, 'sk-tm sk-r')}`; });
    } else s += `<path class="sk-road" d="M${S[0]} ${S[1]}C160 150 220 90 330 80"/><circle class="sk-s" cx="330" cy="80" r="12"/>`;
    return s + `<circle class="sk-a" cx="${S[0]}" cy="${S[1]}" r="10"/>` + skParty(v, S[0] - 40, S[0] + 40, S[1] - 14, 0.6, 5) + skT(S[0], S[1] + 30, 'отряд', 'sk-tm');
  }
  function skRest(v) {
    // костёр в центре, отряд кругом (дальние - за костром, ближние - перед ним)
    const n = Math.max(3, Math.min(14, +v.n || 8)), back = [], front = [];
    for (let i = 0; i < n; i++) { const a = Math.PI * 2 * (i / n) + 0.3, f = skFig(200 + Math.cos(a) * 140, 160 + Math.sin(a) * 42, 0.8 + Math.sin(a) * 0.12); (Math.sin(a) < 0 ? back : front).push(f); }
    return skGround(120) + `<ellipse class="sk-g" cx="200" cy="160" rx="170" ry="54"/>${back.join('')}<path class="sk-log" d="M176 176l48-16M176 160l48 16"/><path class="sk-flame" d="M200 168c-16-10-14-28 0-46c14 18 16 36 0 46z"/><path class="sk-flame2" d="M200 166c-7-6-6-16 0-26c6 10 7 20 0 26z"/>${front.join('')}`;
  }
  function skShop(v) {
    const S = v.sh || {}, n = Math.min(6, (S.items || []).length);
    return skGround() + `<path class="sk-awn" d="M70 40H330L345 70H55Z"/><path class="sk-l" d="M80 70V196M320 70V196"/><rect class="sk-s" x="70" y="132" width="260" height="22" rx="4"/>${Array.from({ length: n }, (_, i) => `<rect class="sk-m" x="${92 + i * 40}" y="108" width="28" height="24" rx="4"/>${skT(106 + i * 40, 126, String(i + 1), 'sk-tm')}`).join('')}${skFig(200, 104, 0.9, 'sk-p sk-npc')}` + skParty(v, 90, 310, SKG - 2, 0.8, 9);
  }
  function skLair(v) {
    return skGround() + `<path class="sk-d" d="M260 196V100Q260 50 300 50T340 100V196Z"/><path class="sk-d" d="M282 60L270 26 292 52M318 60L330 26 308 52"/><circle class="sk-eye" cx="290" cy="80" r="4"/><circle class="sk-eye" cx="310" cy="80" r="4"/>` + skParty(v, 30, 220, SKG - 2, 0.85, 10);
  }
  function bossArt(g) {   // генерированный босс без арены: силуэт и отряд
    return `<figure class="ql-sc"><svg viewBox="0 0 ${SKW} ${SKH}" role="img" aria-label="Бой с боссом: отряд против ${esc((g && g.name) || 'босса')}">${skGround()}<path class="sk-d" d="M250 196V96Q250 40 300 40T350 96V196Z"/><circle class="sk-eye" cx="288" cy="78" r="5"/><circle class="sk-eye" cx="312" cy="78" r="5"/>${skParty({ n: 10 }, 30, 220, SKG - 2, 0.85, 10)}</svg><figcaption class="muted">Где ты - видно на стриме</figcaption></figure>`;
  }
  function schemeHtml(v) {
    let art = '', what = '';
    if (v.tr) { art = skTrap(v.tr, v); what = v.tr.name; }
    else if (v.ev) { art = skEvent(v.ev, v); what = v.ev.name; }
    else if (v.pz) { art = skPuzzle(v.pz, v); what = v.pz.name; }   // 28.10 (map-puzzles)
    else if (v.sh && v.sh.items && v.sh.items.length) { art = skShop(v); what = 'лавка'; }
    else if (v.lair) { art = skLair(v); what = 'логово Закхуэля'; }
    else if (v.k === 'rest') { art = skRest(v); what = 'привал'; }
    else if (v.loot) { art = skGround() + `<rect class="sk-gold" x="170" y="120" width="60" height="44" rx="6"/><path class="sk-l" d="M170 138h60"/>` + skParty(v, 40, 360, SKG - 2, 0.8, 12) + skT(200, 90, v.loot.name, 'sk-tm'); what = 'делёж вещи'; }
    else if (v.k === 'town') { art = skGround() + [60, 150, 240, 320].map((x, i) => `<rect class="sk-s" x="${x}" y="${120 - i % 2 * 20}" width="60" height="${76 + i % 2 * 20}"/><path class="sk-m" d="M${x - 6} ${120 - i % 2 * 20}L${x + 30} ${84 - i % 2 * 20} ${x + 66} ${120 - i % 2 * 20}Z"/>`).join(''); what = 'город'; }
    else { art = skRoute(v); what = v.vote && !v.vote.done ? 'выбор пути' : 'карта похода'; }
    const p = partyOf(v), me = p === 'in' ? 'ты в отряде' : p === 'q' ? 'вступишь на остановке' : p === 'ghost' ? 'ты призрак' : 'ты не в отряде';
    return `<figure class="ql-sc"><svg viewBox="0 0 ${SKW} ${SKH}" role="img" aria-label="Схема: ${esc(what)}; ${esc(me)}">${art}</svg><figcaption><span class="ql-me ${p === 'in' ? 'in' : ''}">${esc(me)}</span>${v.n ? `<span class="muted">в отряде ${+v.n}</span>` : ''}</figcaption></figure>`;
  }

  /* ---------- отрисовка ---------- */
  function paint() {
    if (!X) return;
    const v = view(), on = !!(v && v.on);
    X.onOff(on, on ? String(v.party || '') : '');   // 23.10: вступил в поход — «Город» закрыт
    const bar = X.bar(), el = X.el();
    // плашка — над любой вкладкой, кроме самой «Похода»
    const bh = on && !X.showing() ? bannerHtml(v) : '';
    if (bar) { if (bh !== keyBar) { keyBar = bh; bar.innerHTML = bh ? `<button type="button" class="q-bar">${bh}</button>` : ''; bar.hidden = !bh; ncPaint(bar); const btn = bar.querySelector('button'); if (btn) btn.onclick = () => X.tab('quest'); clocks(); } }
    if (!el || !shown) return;
    qaBind(el); qaSeen(NEW);   // 25.10: кнопки похода — обработчик один на вкладку; «принято» по самому бою
    if (v && v.on && qaOn()) { layPaint(el, v); return; }   // 26.10 (стример): тестерам кнопок - раскладка по схеме
    if (QL.wrap) { layDrop(el); keyTab = ''; }
    let th = tabHtml(v);
    if (v && v.on && qaOn() && !th.includes('class="q-card qa-hero"')) th += qaHero(v);   // 26.10 (п. 35): персонаж - на вкладке всегда
    { const pb = v && v.on ? pbHtml(v) : ''; if (pb) { const i = th.indexOf('<div class="q-stage'); const j = i >= 0 ? th.indexOf('</div>', i) : -1; th = j >= 0 ? th.slice(0, j + 6) + pb + th.slice(j + 6) : th + pb; } }   // 26.10: кнопки мест - сразу под стадией
    if (th === keyTab) { if (v && v.dgn && !v.b) dgMarks(v); sayMount(el, v); return; }
    keyTab = th;
    // 26.10: вкладка - два узла: .q-wrap (перерисовывается) и строка «Команда в поход» (.q-say - постоянная: ввод и фокус не сбиваются)
    let wrap = el.querySelector(':scope > .q-wrap'); if (!wrap) { el.innerHTML = ''; wrap = document.createElement('div'); wrap.className = 'q-wrap'; el.appendChild(wrap); }
    wrap.innerHTML = th; ncPaint(wrap); sayMount(el, v);
    qbag(el, v);   // 25.10: сумка (библиотека инвентаря) — тот же элемент в новой разметке
    const dl = el.querySelector('.q-dl'), dp = el.querySelector('.q-dlp');
    if (dl && dp) { dl.onclick = () => { dp.hidden = !dp.hidden; dl.setAttribute('aria-expanded', String(!dp.hidden)); };
      dp.querySelectorAll('[data-adj]').forEach((b) => b.onclick = () => { const d = +b.dataset.adj; adj = d ? Math.max(-10, Math.min(30, adj + d)) : 0; try { localStorage.setItem(ADJ, String(adj)); } catch (e) {} keyTab = ''; tick(); const p2 = el.querySelector('.q-dlp'); if (p2) p2.hidden = false; }); }
    { const tb = el.querySelector('[data-qtown]'); if (tb) tb.onclick = () => X.openTown(tb.dataset.qtown); }   // 23.10: город округа
    el.querySelectorAll('[data-qv]').forEach((b) => { b.onclick = () => { const [vid, n] = b.dataset.qv.split(':').map(Number); castVote(vid, n); }; });   // 23.10: голос кликом
    if (v && v.dgn && !v.b) { dgMount(el, v); el.querySelectorAll('[data-dgpan]').forEach((b) => { b.onclick = () => dgPan(+b.dataset.dgpan); }); }
    if (v && v.b) { foesWant(); squad(el.querySelector('.q-squad'), v.b); }
    if (v && v.sh) shopBind(el, v);
    const fx = el.querySelector('.q-fx'); if (fx) try { fx.setCurrentTime(0); fx.unpauseAnimations(); } catch (e) {}
    clocks();
  }
  // таймеры — каждую четверть секунды, без перерисовки
  function clocks() {
    const v = CUR; if (!v) return;
    document.querySelectorAll('#qbar [data-until], #tab-quest [data-until]').forEach((s) => { const t = String(sec(+s.dataset.until, v)); if (s.textContent !== t) s.textContent = t; });
    // 25.10: свои таймеры (еда, баффы) — без задержки стрима; кончился — перерисовать (кнопка «Съесть» снова доступна)
    const t0 = now();
    document.querySelectorAll('#tab-quest [data-rt]').forEach((s) => { const left = Math.max(0, Math.ceil((+s.dataset.rt - t0) / 1000)), t = left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${left} с`; if (s.textContent !== t) s.textContent = t; });
    if (QA.rtEnd && QA.rtEnd <= t0) { QA.rtEnd = 0; keyTab = ''; }
  }
  function show(on) { shown = !!on; keyTab = null; keyBar = null; paint(); }
  function init(ctx) { X = ctx; paint(); }
  // 25.10: result — ответ игры на кнопку похода (app.js, results живого канала); hero — герой обновился (здоровье, еда, баффы в панели)
  window.LGQuest = { init, data, show, _view: () => view(), result: (r) => qaResult(r), hero: () => { if (QBG && qbOn()) QBG.inv.update(qbData()); if (QL.inv && X.invData) { const d = X.invData(); if (d) QL.inv.update(d); } const flip = !!QBG !== qbOn(); if (shown && (qaOn() || flip)) { if (!QL.wrap) keyTab = ''; paint(); } } };   // раскладка: меняется только своя часть
})();
