/* 20.10: зал «Аукцион» в «Городе» — витрина лотов, карточка лота, «Мои лоты» (выставить / снять), «История».
   Самостоятельный модуль: city.js грузит его при входе в зал и зовёт LGAuction.render(box, X) — X — помощники сайта (app.js: hero, api,
   act, money, art, esc…). Сделки применяет игра стримера (legionary/auction.js) одним шагом; здесь — только показ и очередь действий.
   Сеть: витрина — GET /api/auction с ETag (без изменений — 304 без тела), раз в 15 с, пока зал открыт и вкладка видна;
   после своего действия — ещё пару раз сразу. Правила и формулы — legacy/md/docs/AUCTION.md. */
(function () {
  'use strict';
  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  // 25.10: слоты, редкости, броня классов, таблицы аукциона по умолчанию - из данных игры (packages/game-data, /lib/game-data.js)
  const GD = window.LGGameData;
  const SLOT = { ...GD.slotNames(), material: 'Материал' }; delete SLOT.relic;   // в фильтре «Место» - коротко
  const RAR = GD.rarityNames();
  const RORD = Object.fromEntries(GD.RARITIES.map((r) => [r, GD.RARITIES.length - 1 - GD.rarityRank(r)]));   // лучшие - первыми
  const ST = { hp: 'Здоровье', atk: 'Физ. урон', mag: 'Магия', def: 'Броня' };
  // 25.10 (баг: не было «Разбойника», названия — не по стилю): классы фильтра — с сайта (X.classes: список сервера, тот же, что у сумки),
  // названия — X.roleOf (стиль канала: «Котопаладин» у котиков). Без X.classes (старый app.js) — классы по ролям вещей витрины
  const classes = () => { try { if (X.classes) return X.classes(); } catch {} const h = hero(); return [...new Set([h && h.role, ...((D && D.items) ? Object.values(D.items).map((d) => d && d.slot === 'weapon' && d.role) : [])].filter((k) => k && k !== 'recruit'))]; };
  const clsName = (k) => (X.roleOf ? X.roleOf(k) : k);
  const WEAR = GD.WEAR_SLOTS;
  const CFG0 = { ...GD.auction, bonus: GD.enchant.bonus };   // пока витрина не пришла (legionary/auction.js, enchant.js)

  let X = null, box = null, opt = {};
  let D = null;                    // витрина: { lots, items, hist, vals, cfg }
  let tab = 'shop', sel = null, sure = null, sellUid = null, msg = null, hist = null, timer = 0, soon = [];
  const F = { q: '', slot: '', cls: '', rar: '', en: 0, st: '', pmin: '', pmax: '', sort: 'new' };
  try { Object.assign(F, JSON.parse(sessionStorage.getItem('lgAuF') || '{}')); } catch {}
  const S = { n: 1, g: 0, s: 0, b: 0, h: 24 };   // форма «выставить»

  const cfg = () => ({ ...CFG0, ...((D && D.cfg) || {}) });
  const me = () => (X && X.login()) || '';
  const hero = () => (X && X.hero()) || null;
  // 26.10: порог уровня (tradeMinLevel, флаг tml) - выставить и купить у игрока; текст - как у сервера (src/site/trade.ts lowText)
  const lowOf = (h) => { const min = (h && +h.tml) || 0, lv = (h && +h.level) || 1; return min > 1 && lv < min ? `Обмен и передача доступны с ${min} уровня (сейчас у тебя ${lv}-й)` : ''; };
  const money = (n) => X.money(n);
  // короткая цена для строк витрины: «1 ● 77 ● 30» кружками монет (полная — в подписи для чтения с экрана и в карточке)
  const plain = (html) => String(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  function cm(n) {
    n = Math.max(0, Math.floor(+n || 0)); const g = Math.floor(n / 10000), sv = Math.floor(n / 100) % 100, b = n % 100;
    const p = [g && `${g}<i class="au-c g"></i>`, sv && `${sv}<i class="au-c s"></i>`, (b || (!g && !sv)) && `${b}<i class="au-c b"></i>`].filter(Boolean).join(' ');
    return `<span class="au-m" role="img" aria-label="${esc(plain(money(n)))}" title="${esc(plain(money(n)))}">${p}</span>`;
  }
  const def = (id) => (D && D.items && D.items[id]) || {};
  const nameOf = (lot) => (def(lot.i).name || lot.i) + (lot.en ? ' +' + lot.en : '');
  // 22.10: характеристики лота — с заточкой (сервер шлёт st для заточенных; иначе — та же функция, что у Кузни сайта: app.js enchStatsN)
  const statsOf = (x) => x.st || (x.en > 0 && X.enchStats ? X.enchStats(def(x.i).stats, x.en, cfg().bonus) : def(x.i).stats) || {};
  // новые характеристики (крит и т. п.) — только если открыты герою (h.xs: statsPublic или тестер), как в окне персонажа
  const stOk = (k) => (X.stOk ? X.stOk(k, hero()) : ['hp', 'atk', 'mag', 'def'].includes(k));
  const stKeys = () => [...(X.st ? X.st() : ['hp', 'atk', 'mag', 'def']), ...(X.xst ? X.xst() : [])].filter(stOk);
  const stLabel = (k) => (X.stLabel ? X.stLabel(k) : ST[k] || k);
  const GEAR = { heavy: 'тяжёлое', light: 'лёгкое', cloth: 'ткань' };
  // вещь лота в виде вещи героя — для общей карточки сайта (X.itemBody: характеристики, аура, класс, тип брони, заточка, прочность)
  const asItem = (x) => { const d = def(x.i); return { id: x.i, ...d, uid: x.id, name: nameOf(x), rarity: d.rarity || 'common', stats: statsOf(x), stats0: d.stats || {}, en: x.en || 0, n: x.n, wearable: WEAR.includes(d.slot), on: false, ...(x.dur != null ? { dur: Math.max(1, x.dur), ...(lowD(x) ? { low: true } : {}) } : {}), ...(x.pts ? { pts: 1 } : {}) }; };
  // 22.10: прочность лота (dur; нет — целая): повреждённое и сломанное продавать можно — покупатель видит и чинит у кузнеца
  // 23.10: прочность ≤ 30% — красная пометка: дойдёт до 0 — вещь исчезнет навсегда
  const lowD = (x) => x.dur != null && x.dur <= (X.durLow ? X.durLow() : 30);
  const durTag = (x) => (x.dur == null ? '' : lowD(x) ? ` · <b class="au-br" title="Если прочность дойдёт до 0, вещь исчезнет навсегда. Почини у кузнеца">⚠ прочность ${Math.max(1, +x.dur)}%</b>` : ` · <b class="au-dm">прочность ${+x.dur}%</b>`);
  const valEn = (id, en) => { const v = (D && D.vals && D.vals[id]) || 0, b = en > 0 ? cfg().bonus[Math.min(15, en)] || 0 : 0; return Math.max(1, Math.round(v * (1 + b / 100))); };
  const limits = (id, en, n) => { const v = valEn(id, en) * n, c = cfg(); return { v, min: Math.max(1, Math.ceil(v * c.minPct / 100)), max: Math.floor(v * c.maxX) }; };
  const feeOf = (p) => Math.max(Math.floor(cfg().feeMin), Math.round(p * cfg().feePct / 100));
  const comOf = (p) => Math.floor(p * cfg().com / 100);
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
  // «обычно продают за»: средняя (медиана) из последних цен за штуку; заточку учитываем по ценности
  function usual(id, en) {
    const h = (D && D.hist && D.hist[id]) || []; if (!h.length) return 0;
    return Math.round(median(h.map((r) => r[0] / valEn(id, r[1] || 0))) * valEn(id, en));
  }
  function left(u) {
    const ms = u - Date.now(); if (ms <= 0) return 'вот-вот закончится';
    const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    return h >= 1 ? `${h} ч ${String(m).padStart(2, '0')} мин` : `${m} мин`;
  }
  // общая карточка вещи сайта (app.js itemBody); без неё (старый app.js в кэше) — хотя бы основные характеристики
  function body(it, h) {
    if (X.itemBody && h) try { return X.itemBody(it, h, { bonus: cfg().bonus, cls: true, dur: true, verdict: true }); } catch (e) { console.warn('аукцион: карточка', e); }
    const ks = Object.keys(it.stats || {}).filter((k) => ST[k]);
    return ks.length ? `<ul class="d-st">${ks.map((k) => `<li><span>${esc(ST[k])}</span><b>${it.stats[k] > 0 ? '+' : ''}${it.stats[k]}</b></li>`).join('')}</ul>` : '';
  }
  const art = (id, en) => { const d = def(id); try { return X.art({ id, ...d, en }); } catch { return ''; } };
  const forItem = (it) => ({ id: it.id, ...it });

  /* ---------- данные ---------- */
  async function load() {
    let r = null;
    try { const res = await fetch((window.LG_BASE || '') + '/api/auction', { cache: 'no-cache', credentials: 'same-origin' }); r = await res.json(); } catch { r = null; }
    if (!box || !box.isConnected) return;
    if (r && r.ok) { const was = D && D.v; D = r; if (was !== r.v || !draw.done) draw(); }
    else if (!D) { box.innerHTML = `<p class="note">${esc((r && r.error) || 'Нет связи с аукционом — попробуй позже.')}</p>`; box.removeAttribute('aria-busy'); }
  }
  function poll(on) {
    clearInterval(timer); timer = 0; soon.forEach(clearTimeout); soon = [];
    if (on) timer = setInterval(() => { if (!document.hidden) load(); }, 15000);
  }
  // своё действие ушло в игру — витрину обновить чуть позже (игра применит через 1–3 с)
  const refreshSoon = () => { soon.forEach(clearTimeout); soon = [1500, 4000, 9000].map((ms) => setTimeout(load, ms)); };

  /* ---------- отрисовка ---------- */
  function draw() {
    if (!box || !box.isConnected) return;
    draw.done = true;
    const h = hero(), c = cfg(), sc = box.querySelector('.au-body'), top = sc ? sc.scrollTop : 0;
    box.removeAttribute('aria-busy');
    const mine = D ? D.lots.filter((x) => x.s === me()).length : 0;
    box.innerHTML = `<div class="au">
      <p class="au-say">${tab === 'mine' ? 'Выставляй с умом: сбор не возвращается, а с продажи я беру комиссию.' : 'Подходи, не стесняйся! Всё честно: монеты — продавцу, вещь — тебе.'}</p>
      ${h && h.ar ? `<div class="au-ret" role="status"><span>На складе аукциона ждут вещи: ${h.ar.map((x) => esc((def(x.id).name || x.id) + (x.en ? ' +' + x.en : '') + (x.n > 1 ? ' ×' + x.n : ''))).join(', ')}</span><button type="button" class="btn primary sm" data-claim>Забрать</button></div>` : ''}
      ${c.on === false ? '<p class="note au-warn">Аукцион закрыт ведущим: купить и выставить сейчас нельзя, снять свой лот — можно.</p>' : ''}
      <div class="filters au-tabs" role="tablist" aria-label="Разделы аукциона">
        <button type="button" role="tab" data-tab="shop" aria-selected="${tab === 'shop'}" aria-pressed="${tab === 'shop'}">Витрина${D ? ` <small>${D.lots.length}</small>` : ''}</button>
        <button type="button" role="tab" data-tab="mine" aria-selected="${tab === 'mine'}" aria-pressed="${tab === 'mine'}">Мои лоты <small>${mine}/${c.maxLots}</small></button>
        <button type="button" role="tab" data-tab="hist" aria-selected="${tab === 'hist'}" aria-pressed="${tab === 'hist'}">История</button>
      </div>
      <p class="au-msg${msg && msg.bad ? ' bad' : ''}" role="status" aria-live="polite">${msg ? esc(msg.t) : ''}</p>
      <div class="au-body">${!D ? '<p class="note">Аукционист раскладывает лоты…</p>' : sel ? lotCard(sel) : tab === 'mine' ? (sellUid != null ? sellForm() : mineTab()) : tab === 'hist' ? histTab() : shopTab()}</div>
    </div>`;
    bind();
    const sc2 = box.querySelector('.au-body'); if (sc2) sc2.scrollTop = top;
    try { opt.fit && opt.fit(); } catch {}
  }
  const say = (t, bad) => { msg = { t, bad: !!bad }; const el = box && box.querySelector('.au-msg'); if (el) { el.textContent = t; el.classList.toggle('bad', !!bad); } clearTimeout(say.t); say.t = setTimeout(() => { msg = null; const e2 = box && box.querySelector('.au-msg'); if (e2) e2.textContent = ''; }, 7000); };

  // какому классу подходит вещь (фильтр «класс»): оружие — своё, доспех и шлем — свой тип или для всех, щит — легионеру, амулет — всем
  // 22.10: «мой класс» — класс героя; кому подходит вещь — та же функция, что у фильтра сумки сайта (app.js clsOf)
  const myCls = () => { const h = hero(); return h && h.role && h.role !== 'recruit' && classes().includes(h.role) ? h.role : ''; };
  function fits(d, cls) {
    if (cls === 'mine') cls = myCls();
    if (!cls) return true;
    if (!WEAR.includes(d.slot)) return false;
    if (X.clsOf) { const c = X.clsOf(d); return !c || c.includes(cls); }
    if (d.slot === 'weapon') return d.role === cls;
    if (d.slot === 'shield') return GD.shieldOk(cls);
    if (d.slot === 'armor' || d.slot === 'helmet') return !d.gear || d.gear === 'any' || d.gear === GD.classGear(cls);
    return true;
  }
  // 24.10 (баг тестера): «от» больше «до» (200 / 100) — не пустой список молча: ищем между ними и подсказываем под полями
  const priceRange = () => { let a = Math.floor(+F.pmin * 100 || 0), b = Math.floor(+F.pmax * 100 || 0); if (a && b && a > b) [a, b] = [b, a]; return [a, b]; };
  const priceSwapped = () => { const a = +F.pmin || 0, b = +F.pmax || 0; return a > 0 && b > 0 && a > b; };
  function filtered() {
    const sk = F.st && stOk(F.st) ? F.st : '';   // 22.10: «есть характеристика» — и лучшие по ней сверху
    const q = F.q.trim().toLowerCase().replace(/ё/g, 'е'), [pmin, pmax] = priceRange();
    // 22.10 (PR #37): поиск понимает и название характеристики: «крит», «уклон» — вещи с ней (только открытые герою)
    const qk = q.length >= 3 ? stKeys().filter((k) => String(stLabel(k)).toLowerCase().replace(/ё/g, 'е').includes(q)) : [];
    let a = D.lots.filter((x) => {
      const d = def(x.i);
      if (q && !qk.some((k) => +statsOf(x)[k] > 0) && !String(d.name || '').toLowerCase().replace(/ё/g, 'е').includes(q) && !String(d.base || '').toLowerCase().replace(/ё/g, 'е').includes(q) && !String(x.sn || '').toLowerCase().includes(q)) return false;
      if (F.slot === 'food' ? !(d.slot === 'food' || d.slot === 'potion') : F.slot === 'other' ? WEAR.includes(d.slot) || ['material', 'food', 'potion'].includes(d.slot) : F.slot && d.slot !== F.slot) return false;
      if (!fits(d, F.cls)) return false;
      if (F.rar && (d.rarity || 'common') !== F.rar) return false;
      if (+F.en > 0 && (x.en || 0) < +F.en) return false;
      if (sk && !(+statsOf(x)[sk] > 0)) return false;
      if (pmin && x.p < pmin) return false;
      if (pmax && x.p > pmax) return false;
      return true;
    });
    const by = { new: (p, q2) => q2.at - p.at, cheap: (p, q2) => p.p - q2.p || q2.at - p.at, dear: (p, q2) => q2.p - p.p || q2.at - p.at, end: (p, q2) => p.u - q2.u };
    const s0 = by[F.sort] || by.new;
    return a.sort(sk ? (p, q2) => (+statsOf(q2)[sk] || 0) - (+statsOf(p)[sk] || 0) || s0(p, q2) : s0);
  }
  function priceHint() {
    if (!priceSwapped()) return '<p class="au-pe" id="au-pe" role="status" hidden></p>';
    const [a, b] = priceRange();
    return `<p class="au-pe" id="au-pe" role="status">Цена «от» больше «до» - ищу от ${a / 100} до ${b / 100} серебра.</p>`;
  }
  function shopTab() {
    const opt2 = (v, t, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(t)}</option>`;
    if (F.cls && F.cls !== 'mine' && !classes().includes(F.cls)) F.cls = '';   // 25.10: класса нет в списке героя — «Любой»
    const list = filtered();
    const nf = ['slot', 'cls', 'rar', 'pmin', 'pmax'].filter((k) => F[k]).length + (F.st && stOk(F.st) ? 1 : 0) + (+F.en > 0 ? 1 : 0);
    const wide = !window.LGSiteUi.is('(max-width: 719px)');   // 25.10: свой порог (719, у остальных телефон - до 720 включительно)
    return `<form class="au-f" role="search" onsubmit="return false">
        <label class="au-q"><span class="sr">Поиск</span><input type="search" data-f="q" value="${esc(F.q)}" placeholder="Поиск: вещь, продавец, характеристика" autocomplete="off"></label>
        <details class="au-more"${wide || F.open ? ' open' : ''}><summary>Фильтры и сортировка${nf ? ` <small>(${nf})</small>` : ''}</summary>
        <div class="au-fs">
          <label><span>Место</span><select data-f="slot">${opt2('', 'Всё', F.slot)}${['weapon', 'armor', 'shield', 'helmet', 'trinket', 'material'].map((k) => opt2(k, SLOT[k], F.slot)).join('')}${opt2('food', 'Еда и зелья', F.slot)}${opt2('other', 'Прочее', F.slot)}</select></label>
          <label><span>Класс</span><select data-f="cls">${opt2('', 'Любой', F.cls)}${myCls() ? opt2('mine', `Мой (${clsName(myCls())})`, F.cls) : ''}${classes().map((k) => opt2(k, clsName(k), F.cls)).join('')}</select></label>
          <label><span>Редкость</span><select data-f="rar">${opt2('', 'Любая', F.rar)}${Object.entries(RAR).map(([k, v]) => opt2(k, v, F.rar)).join('')}</select></label>
          <label><span>Заточка от</span><select data-f="en">${[0, 1, 3, 5, 7, 9, 11, 13, 15].map((n) => opt2(n, n ? '+' + n : 'Любая', F.en)).join('')}</select></label>
          <label><span>Характеристика</span><select data-f="st" title="Только вещи с этой характеристикой — лучшие сверху">${opt2('', 'Любая', F.st)}${stKeys().map((k) => opt2(k, stLabel(k), F.st)).join('')}</select></label>
          <label class="au-fp"><span>Цена, серебра</span><span class="au-pr"><input type="number" inputmode="numeric" min="0" data-f="pmin" value="${esc(F.pmin)}" placeholder="от" aria-label="Цена от, серебра" aria-describedby="au-pe"${priceSwapped() ? ' aria-invalid="true"' : ''}><input type="number" inputmode="numeric" min="0" data-f="pmax" value="${esc(F.pmax)}" placeholder="до" aria-label="Цена до, серебра" aria-describedby="au-pe"${priceSwapped() ? ' aria-invalid="true"' : ''}></span></label>
          <label><span>Сначала</span><select data-f="sort">${opt2('new', 'Новые', F.sort)}${opt2('cheap', 'Дешёвые', F.sort)}${opt2('dear', 'Дорогие', F.sort)}${opt2('end', 'Заканчиваются', F.sort)}</select></label>
        </div></details>
      </form>
      ${priceHint()}
      ${list.length ? `<ul class="au-list">${list.slice(0, 120).map(row).join('')}</ul>${list.length > 120 ? `<p class="note">Показаны первые 120 из ${list.length} — уточни поиск.</p>` : ''}`
        : `<p class="note au-empty">${D.lots.length ? 'Ничего не нашлось — смягчи фильтры.' : 'Витрина пуста. Будь первым — выставь вещь во вкладке «Мои лоты».'}</p>`}`;
  }
  // 22.10: что за вещь — одним словом: класс оружия, тип брони (как в карточке)
  function kindOf(d) {
    if (d.slot === 'weapon' && d.role) return clsName(d.role);
    if ((d.slot === 'armor' || d.slot === 'helmet') && GEAR[d.gear]) return GEAR[d.gear];
    return '';
  }
  // характеристики строкой под названием (значки — те же, что в окне персонажа); выбранная в фильтре — первой
  function rowStats(x) {
    const st = statsOf(x), ks = Object.keys(st).filter((k) => st[k] && stOk(k));
    if (!ks.length || !X.ico) return '';
    if (F.st && ks.includes(F.st)) ks.unshift(...ks.splice(ks.indexOf(F.st), 1));
    const num = (k, v) => (X.stNum ? X.stNum(k, v) : (v > 0 ? '+' : '') + v);
    return `<span class="au-rs" aria-label="${esc(ks.map((k) => stLabel(k) + ' ' + plain(num(k, st[k]))).join(', '))}">${ks.slice(0, 5).map((k) => `<span${k === F.st ? ' class="on"' : ''} title="${esc(stLabel(k))}">${X.ico(k)}${esc(num(k, st[k]))}</span>`).join('')}</span>`;
  }
  function row(x) {
    const d = def(x.i), own = x.s === me(), kind = kindOf(d);
    return `<li><button type="button" class="au-row" data-lot="${esc(x.id)}" data-r="${esc(d.rarity || 'common')}">
      <span class="au-gi">${art(x.i, x.en)}</span>
      <span class="au-ri"><b>${esc(nameOf(x))}${x.n > 1 ? ` <small>×${x.n}</small>` : ''}</b><em><span class="rar" data-r="${esc(d.rarity || 'common')}">${esc(RAR[d.rarity] || '')}</span> · ${esc(SLOT[d.slot] || '')}${kind ? ` · ${esc(kind)}` : ''}${durTag(x)} · ${own ? 'твой лот' : esc(x.sn || x.s)}</em>${rowStats(x)}</span>
      <span class="au-rp">${cm(x.p)}<small>${esc(left(x.u))}</small></span></button></li>`;
  }
  // карточка лота: характеристики с заточкой, сравнение с надетым, продавец, срок, «Купить за …» с подтверждением
  function lotCard(id) {
    const x = D.lots.find((l) => l.id === id);
    if (!x) return `<button type="button" class="btn ghost sm" data-back>← К витрине</button><p class="note au-empty">Лота уже нет — его купили или сняли.</p>`;
    const d = def(x.i), h = hero(), own = x.s === me(), wear = WEAR.includes(d.slot), it = asItem(x);
    const on = wear && h ? (h.items || []).find((y) => y.on && y.slot === d.slot) : null;
    const us = usual(x.i, x.en || 0) * x.n, c = cfg(), cant = !h ? 'Героя пока нет' : own ? 'Это твой лот' : lowOf(h) ? lowOf(h) : h.ghost ? 'Призрак не торгует — дождись воскрешения' : h.busy ? 'Идёт бой — купить после боя' : c.on === false ? 'Аукцион закрыт' : h.debt > 0 ? 'Сначала погаси долг — в долг не продают' : (+h.money || 0) < x.p ? 'lack' : '';
    const ok = sure === x.id;
    return `<button type="button" class="btn ghost sm" data-back>← К витрине</button>
      <article class="au-card" data-r="${esc(d.rarity || 'common')}" aria-label="${esc(nameOf(x))}">
        <div class="au-art">${X.lgx ? X.lgx(it) : ''}${art(x.i, x.en)}</div>
        <div class="au-ch"><span class="rar" data-r="${esc(d.rarity || 'common')}">${esc(RAR[d.rarity] || '')}</span><span class="muted">${esc(SLOT[d.slot] || '')}</span>${x.n > 1 ? `<span class="muted">×${x.n}</span>` : ''}</div>
        <h3 class="au-cn">${esc(nameOf(x))}</h3>
        <div class="au-ib">${body(it, h)}</div>
        ${!on && wear && h ? '<p class="au-cmp">В этом месте у тебя ничего не надето.</p>' : ''}
        <dl class="au-dl"><dt>Продавец</dt><dd>${esc(x.sn || x.s)}${own ? ' (ты)' : ''}</dd><dt>Осталось</dt><dd>${esc(left(x.u))}</dd>${us ? `<dt>Обычно продают</dt><dd>${money(us)}</dd>` : ''}<dt>Цена</dt><dd class="au-big">${money(x.p)}</dd></dl>
        ${own ? `<button type="button" class="btn ghost wide" data-cancel="${esc(x.id)}">Снять с продажи</button>`
          : cant === 'lack' ? (X.lack ? X.lack(x.p, h.money, 'au-lack') : '<p class="note">Не хватает монет</p>')
          : cant ? `<p class="note">${esc(cant)}</p>`
          : ok ? `<div class="au-sure" role="group" aria-label="Подтверждение"><p>Купить «${esc(nameOf(x))}»${x.n > 1 ? ' ×' + x.n : ''} за ${money(x.p)}?</p>${X.bal ? X.bal(x.p, h.money, 'au-lack') : ''}<button type="button" class="btn primary" data-buy="${esc(x.id)}" data-p="${x.p}">Да, купить</button><button type="button" class="btn ghost" data-unsure>Отмена</button></div>`
          : `${X.bal ? X.bal(x.p, h.money, 'au-lack') : ''}<button type="button" class="btn primary wide" data-ask="${esc(x.id)}">Купить за ${money(x.p)}</button>`}
      </article>`;
  }
  function mineTab() {
    const c = cfg(), list = D.lots.filter((x) => x.s === me()).sort((a, b) => a.u - b.u), h = hero();
    const low = lowOf(h);
    return `<button type="button" class="btn primary wide" data-newsell${list.length >= c.maxLots || !h || h.ghost || low || c.on === false ? ' disabled' : ''}>Выставить вещь из сумки</button>
      ${low ? `<p class="note au-warn">${esc(low)}. Снять свои лоты можно.</p>` : ''}
      <p class="note">Сбор за выставление — ${c.feePct}% цены (не меньше ${money(c.feeMin)}), не возвращается. С продажи — комиссия ${c.com}%. Срок — ${c.hours.join(', ')} ч; не продалось — вещь вернётся в сумку сама.</p>
      ${list.length ? `<ul class="au-list">${list.map((x) => `<li class="au-mine">${row(x)}<button type="button" class="btn ghost sm" data-cancel="${esc(x.id)}" aria-label="Снять «${esc(nameOf(x))}»">Снять</button></li>`).join('')}</ul>` : '<p class="note au-empty">Твоих лотов нет.</p>'}`;
  }
  // что можно выставить: не надетое, не особое; одинаковые расходники и материалы — стопкой
  function bagStacks(h) {
    const out = [], by = new Map();
    for (const it of (h && h.items) || []) {
      if (it.on || it.relic || it.slot === 'relic') continue;
      if (!it.wearable) { const s = by.get(it.id); if (s) { s.n++; continue; } }
      const s = { ...it, n: 1 }; out.push(s); if (!it.wearable) by.set(it.id, s);
    }
    return out.sort((a, b) => (RORD[a.rarity] ?? 5) - (RORD[b.rarity] ?? 5) || (b.en || 0) - (a.en || 0));
  }
  // 24.10: цена той же вещи в лавках «Города» (базовая, без надбавки вора и чужого округа) - подсказка продавцу
  let SHOP = null, shopAsk = false;
  function shopCoins(id) {
    if (!SHOP && !shopAsk) {
      shopAsk = true;
      X.api('/api/city/stock').then((r) => {
        const m = new Map(), add = (it) => { if (it && it.id && !it.mat && +it.coins > 0 && (!m.has(it.id) || m.get(it.id) > +it.coins)) m.set(it.id, +it.coins); };
        const walk = (v) => { if (Array.isArray(v)) v.forEach((x) => (x && x.id ? add(x) : walk(x))); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
        if (r && r.ok) walk(r);
        SHOP = m; if (sellUid) try { draw(); } catch {}
      }).catch(() => { SHOP = new Map(); });
    }
    return SHOP ? SHOP.get(id) || 0 : 0;
  }
  function sellForm() {
    const h = hero(), all = bagStacks(h), it = all.find((x) => x.uid === sellUid) || null, c = cfg();
    // 25.10: новая сумка (новинка inv2 — флаг i2 у героя): выбор вещи — библиотека инвентаря (режим 'pick'), см. auInv2
    const pick = h && h.i2 && window.LGInventory ? '<div class="au-inv2" data-auinv></div>' : `<div class="au-bag" role="listbox" aria-label="Что выставить">${all.length ? all.map((x) => `<button type="button" role="option" aria-selected="${x.uid === sellUid}" class="au-bi${x.uid === sellUid ? ' on' : ''}" data-pick="${esc(x.uid)}" data-r="${esc(x.rarity)}" title="${esc(x.name)}"><span class="au-gi">${X.art(forItem(x))}</span><span>${esc(x.name)}${x.n > 1 ? ` <small>×${x.n}</small>` : ''}</span></button>`).join('') : '<p class="note">В сумке нечего выставить. Надетое — сначала сними.</p>'}</div>`;
    if (!it) return `<button type="button" class="btn ghost sm" data-back>← Мои лоты</button><h3 class="h3">Что выставить?</h3>${pick}`;
    const n = it.wearable ? 1 : Math.max(1, Math.min(it.n, S.n)), en = it.wearable ? +it.en || 0 : 0, lim = limits(it.id, en, n), us = usual(it.id, en) * n;
    const p = S.g * 10000 + S.s * 100 + S.b, fee = feeOf(p), com = comOf(p);
    const err = lowOf(h) ? lowOf(h) : !p ? 'Укажи цену' : p < lim.min ? 'Слишком дёшево' : p > lim.max ? 'Слишком дорого' : (+h.money || 0) < fee ? 'lack' : h.busy ? 'Идёт бой — выставить после боя' : h.ghost ? 'Призрак не торгует' : '';
    return `<button type="button" class="btn ghost sm" data-back>← Мои лоты</button><h3 class="h3">Что выставить?</h3>${pick}
      <form class="au-sell" onsubmit="return false" aria-label="Цена и срок">
        <p class="au-sn"><b>${esc(it.name)}</b>${n > 1 ? ' ×' + n : ''} · ценность ${money(lim.v)}</p>
        <details class="au-sd"${S.sd ? ' open' : ''}><summary>Что увидят покупатели</summary><div class="au-ib">${body(it, h)}</div></details>
        <p class="au-hint">${us ? `Обычно продают за ${money(us)}.` : 'Таких на аукционе ещё не продавали.'} Можно от ${money(lim.min)} до ${money(lim.max)}.</p>
        ${shopCoins(it.id) && !en ? `<p class="au-hint au-shop">🏪 В лавке Города${n > 1 ? ' за штуку' : ''}: ${money(shopCoins(it.id))}${n > 1 ? ` (×${n} - ${money(shopCoins(it.id) * n)})` : ''}</p>` : ''}
        ${it.wearable ? '' : `<label class="au-l"><span>Сколько</span><input type="number" inputmode="numeric" min="1" max="${it.n}" data-s="n" value="${n}"> <small>из ${it.n}</small></label>`}
        <fieldset class="au-price"><legend>Цена${n > 1 ? ' за все' : ''}</legend>
          <label><input type="number" inputmode="numeric" min="0" data-s="g" value="${S.g || ''}" placeholder="0" aria-label="золотых"><i class="au-c g" aria-hidden="true"></i></label>
          <label><input type="number" inputmode="numeric" min="0" max="99" data-s="s" value="${S.s || ''}" placeholder="0" aria-label="серебряных"><i class="au-c s" aria-hidden="true"></i></label>
          <label><input type="number" inputmode="numeric" min="0" max="99" data-s="b" value="${S.b || ''}" placeholder="0" aria-label="медных"><i class="au-c b" aria-hidden="true"></i></label>
          ${us ? `<button type="button" class="btn ghost sm" data-usual="${us}">Как обычно</button>` : ''}
        </fieldset>
        <div class="filters au-hrs" role="group" aria-label="Срок">${c.hours.map((hh) => `<button type="button" data-h="${hh}" aria-pressed="${S.h === hh}">${hh} ч</button>`).join('')}</div>
        <dl class="au-dl au-sum"><dt>Цена</dt><dd>${money(p)}</dd><dt>Сбор сейчас</dt><dd>−${money(fee)}</dd><dt>Комиссия при продаже</dt><dd>−${money(com)}</dd><dt>Получишь</dt><dd class="au-big">${money(Math.max(0, p - com))}</dd></dl>
        ${err === 'lack' ? `<p class="note au-warn">Не хватает на сбор за выставление.</p>${X.lack ? X.lack(fee, h.money, 'au-lack') : ''}` : `${err ? `<p class="note au-warn">${esc(err)}</p>` : ''}${X.bal && fee ? X.bal(fee, h.money, 'au-lack') : ''}`}
        <button type="button" class="btn primary wide" data-sell${err ? ' disabled' : ''}>Выставить за ${money(p)}</button>
      </form>`;
  }
  function histTab() {
    return '<div class="au-hist" aria-busy="true"><p class="note">Листаем книгу сделок…</p></div>';
  }
  function histFill() {
    const el = box.querySelector('.au-hist'); if (!el) return;
    if (!hist) { X.api('/api/journal?tab=auc').then((r) => { hist = (r && r.list) || []; if (tab === 'hist') histFill(); }); return; }
    el.removeAttribute('aria-busy');
    el.innerHTML = hist.length ? `<ol class="au-hl">${hist.slice(0, 100).map((e) => `<li><time>${new Date(e.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><span>${esc(String(e.t || '').replace(/^Аукцион: /, ''))}</span>${e.c ? `<b class="${e.c > 0 ? 'up' : 'dn'}">${e.c > 0 ? '+' : '−'}${money(Math.abs(e.c))}</b>` : ''}</li>`).join('')}</ol>` : '<p class="note au-empty">Сделок пока не было.</p>';
  }

  /* ---------- действия ---------- */
  // что выставить: стопка расходников — целиком (цену подставляем обычную)
  function pickSell(uid) { sellUid = uid; const it = bagStacks(hero()).find((x) => x.uid === sellUid); S.n = it && !it.wearable ? it.n : 1; setPrice(it ? (usual(it.id, it.wearable ? +it.en || 0 : 0) * S.n || limits(it.id, it.wearable ? +it.en || 0 : 0, S.n).v) : 0); draw(); }
  // 25.10: новая сумка (inv2): та же сумка, что везде (ячейки, стопки, фильтр, карточка вещи), нажатие — pickSell; особое — не продаётся
  let AUI = null;
  function auInv2(B) {
    if (AUI) { try { AUI.destroy(); } catch {} AUI = null; }
    const el = B.querySelector('[data-auinv]'), h = hero(); if (!el || !h) return;
    AUI = window.LGInventory.mount(el, { variant: 'full', mode: 'pick', data: { hero: h, items: h.items || [] },
      actions: { pick: (it) => { const st = bagStacks(hero()).find((x) => x.uid === it.uid || (!it.wearable && x.id === it.id)); if (st) pickSell(st.uid); } },
      options: { header: false, vitals: false, detail: false, doll: false, art: (x) => X.art(forItem(x)), storeKey: 'lgInv2Au', sel: sellUid || '',
        can: (it) => (it.relic || it.slot === 'relic' ? 'Особое не продаётся' : true), only: (it) => !it.on,
        cardTip: X.cardTip ? (c, it) => X.cardTip(c, it, hero()) : null, tipHide: X.tipHide ? () => X.tipHide() : null } });
  }
  function bind() {
    const B = box;
    B.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; sel = null; sure = null; sellUid = null; if (tab === 'hist') hist = null; draw(); if (tab === 'hist') histFill(); });
    if (tab === 'hist' && !sel) { const el = B.querySelector('.au-body'); if (el && !el.querySelector('.au-hist')) el.innerHTML = '<div class="au-hist" aria-busy="true"><p class="note">Листаем книгу сделок…</p></div>'; histFill(); }
    B.querySelectorAll('[data-f]').forEach((el) => {
      const k = el.dataset.f, apply = () => {
        F[k] = el.value; try { sessionStorage.setItem('lgAuF', JSON.stringify(F)); } catch {}
        // перерисовать только список (форма остаётся — фокус и набранный текст не сбиваются)
        const host = B.querySelector('.au-body'), tmp = document.createElement('div'); tmp.innerHTML = shopTab();
        host.querySelectorAll(':scope > :not(.au-f)').forEach((n) => n.remove());
        [...tmp.children].filter((n) => !n.classList.contains('au-f')).forEach((n) => host.appendChild(n));
        B.querySelectorAll('[data-f="pmin"], [data-f="pmax"]').forEach((i) => { if (priceSwapped()) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); });
        bindRows();
      };
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', apply);
    });
    bindRows();
    const det = B.querySelector('.au-more'); if (det) det.addEventListener('toggle', () => { F.open = det.open; });
    const sd = B.querySelector('.au-sd'); if (sd) sd.addEventListener('toggle', () => { S.sd = sd.open; try { if (opt.fit) opt.fit(); } catch {} });
    const back = B.querySelector('[data-back]'); if (back) back.onclick = () => { if (sel) sel = null; else sellUid = null; sure = null; draw(); };
    const ask = B.querySelector('[data-ask]'); if (ask) ask.onclick = () => { sure = ask.dataset.ask; draw(); const y = box.querySelector('[data-buy]'); if (y) y.focus(); };
    const un = B.querySelector('[data-unsure]'); if (un) un.onclick = () => { sure = null; draw(); };
    const buy = B.querySelector('[data-buy]'); if (buy) buy.onclick = () => send('/api/aucBuy', { lot: buy.dataset.buy, price: +buy.dataset.p }, buy, 'Покупка отправлена — аукционист заворачивает вещь…', () => { sure = null; sel = null; });
    B.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = () => {
      if (!window.LGSiteUi.confirmTwice(b, { text: 'Точно снять?', mark: 'sure' })) return;   // 25.10: packages/site-ui
      send('/api/aucCancel', { lot: b.dataset.cancel }, b, 'Лот снят — вещь вернётся в сумку (сбор не возвращается)', () => { sel = null; });
    });
    const ns = B.querySelector('[data-newsell]'); if (ns) ns.onclick = () => { sellUid = ''; draw(); };
    B.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => pickSell(b.dataset.pick));
    auInv2(B);
    B.querySelectorAll('[data-s]').forEach((el) => el.addEventListener('change', () => { const k = el.dataset.s, v = Math.max(0, Math.floor(+el.value || 0)); S[k] = k === 's' || k === 'b' ? Math.min(99, v) : v; draw(); const e2 = box.querySelector(`[data-s="${k}"]`); if (e2) e2.focus(); }));
    const us = B.querySelector('[data-usual]'); if (us) us.onclick = () => { setPrice(+us.dataset.usual); draw(); };
    B.querySelectorAll('[data-h]').forEach((b) => b.onclick = () => { S.h = +b.dataset.h; draw(); });
    const sl = B.querySelector('[data-sell]'); if (sl) sl.onclick = () => {
      const it = bagStacks(hero()).find((x) => x.uid === sellUid); if (!it) return;
      const n = it.wearable ? 1 : Math.max(1, Math.min(it.n, S.n));
      send('/api/aucSell', { uid: it.uid, n, price: S.g * 10000 + S.s * 100 + S.b, hours: S.h }, sl, 'Выставлено — лот появится на витрине через пару секунд', () => { sellUid = null; });
    };
    const cl = B.querySelector('[data-claim]'); if (cl) cl.onclick = () => send('/api/aucClaim', {}, cl, 'Вещи несут со склада в сумку…');
  }
  function bindRows() { box.querySelectorAll('.au-row[data-lot]').forEach((b) => b.onclick = () => { sel = b.dataset.lot; sure = null; draw(); const sb = box.querySelector('.au-body'); if (sb) sb.scrollTop = 0; const bk = box.querySelector('[data-back]'); if (bk) bk.focus(); }); }
  const setPrice = (p) => { p = Math.max(0, Math.round(+p || 0)); S.g = Math.floor(p / 10000); S.s = Math.floor(p / 100) % 100; S.b = p % 100; };
  // в игру — через очередь сайта (как надеть/заточить); ответ игры придёт с героем, ошибку покажет сайт
  async function send(path, body, btn, ok, after) {
    if (send.busy) return; send.busy = true;
    if (btn) { btn.disabled = true; btn.dataset.label = btn.innerHTML; btn.textContent = 'Секунду…'; }
    const r = await X.api(path, body); send.busy = false;
    if (!r || !r.ok) { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = btn.dataset.label; } say((r && r.error) || 'Не получилось', true); return; }
    if (after) after();
    hist = null; say(ok); draw(); refreshSoon();
  }

  window.LGAuction = {
    render(el, ctx, o = {}) { X = ctx; box = el; opt = o; try { if (X.tips) X.tips(el); } catch {} draw.done = false; sel = null; sure = null; sellUid = null; msg = null; if (D) draw(); load(); poll(true); },
    // герой поменялся (игра ответила): своя сумка, монеты и склад — перерисовать, витрину — свежую
    update() { if (!box || !box.isConnected) return; if (document.activeElement && box.contains(document.activeElement) && document.activeElement.matches('input')) return; draw(); load(); },
    close() { poll(false); box = null; if (AUI) { try { AUI.destroy(); } catch {} AUI = null; } },   // 25.10: и новая сумка (inv2)
  };
})();
