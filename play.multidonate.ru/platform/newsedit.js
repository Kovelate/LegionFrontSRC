// 18.10: редактор новостей игры — один на пульт (страница «Новости», newsadmin.js) и сайт (кнопка «+» на вкладке «Новости», newssite.js).
// Права проверяет сервер (/admin/api/news*: 401/403); здесь — только интерфейс.
// Правило: само ничего не публикуется. Новая запись — черновик; «Опубликовать» — отдельное действие с подтверждением.
window.NewsEdit = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TAGS = { update: 'Обновление', balance: 'Баланс', event: 'Событие', fix: 'Исправления' };
  const LIM = { title: 200, body: 20000 };
  // цвета текста — те же имена, что понимает сервер (src/site/news.ts NEWS_COLORS); цвет в каждом оформлении — CSS (.nc-*)
  const COLORS = [['gold', 'Золотой'], ['red', 'Красный'], ['green', 'Зелёный'], ['blue', 'Синий'], ['purple', 'Фиолетовый'], ['orange', 'Оранжевый'], ['grey', 'Серый']];
  const COLOR_TOKEN = /\{\{(gold|red|green|blue|purple|orange|grey)\|([^{}\n]*?)\}\}/g;
  const when = (t) => (t ? new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const day = (t) => (t ? new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const stateOf = (x) => (x.published ? ['is-pub', 'Опубликовано'] : x.publishedAt ? ['is-off', 'Снято'] : ['is-draft', 'Черновик']);
  let uid = 0;

  async function call(path, body) {
    try {
      const r = await fetch(path, body === undefined ? { credentials: 'same-origin', cache: 'no-store' }
        : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => null);
      if (r.status === 401) return { ok: false, status: 401, text: 'Войди заново: сессия закончилась' };
      if (r.status === 403) return { ok: false, status: 403, text: 'Только для администратора игры' };
      if (r.status === 429) return { ok: false, status: 429, text: 'Слишком часто — подожди минуту и повтори' };
      if (!r.ok || !j || !j.ok) return { ok: false, status: r.status, text: (j && j.text) || 'Не получилось: ' + ((j && j.error) || r.status) + '. Повтори через минуту' };
      return j;
    } catch { return { ok: false, status: 0, text: 'Нет связи с сервером — проверь интернет и повтори' }; }
  }
  // 20.10: картинка в новость. Браузер сам уменьшает до 1600 px по ширине и пережимает в WebP (~80%), чтобы зрителям не тянуть тяжёлое;
  // анимированный GIF — как есть (его не пережать без потери анимации). Сервер ещё раз проверяет, что это картинка, и лимиты.
  const IMG = { pick: 8 << 20, gif: 3 << 20, width: 1600, q: 0.8 };
  const IMG_TYPES = /^image\/(png|jpeg|webp|gif)$/;
  // несколько кадров в GIF: блоки управления кадром (21 F9 04) — грубо, без декодера
  const gifAnimated = (u8) => { let n = 0; for (let i = 0; i + 2 < u8.length; i++) if (u8[i] === 0x21 && u8[i + 1] === 0xf9 && u8[i + 2] === 0x04 && ++n > 1) return true; return false; };
  const toBlob = (c, type, q) => new Promise((ok) => { try { c.toBlob((b) => ok(b), type, q); } catch { ok(null); } });
  async function decode(file) {
    if (window.createImageBitmap) { try { return await createImageBitmap(file); } catch { /* ниже — через <img> */ } }
    const url = URL.createObjectURL(file);
    try { const im = new Image(); im.src = url; await im.decode(); return im; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  /** Файл → что отправить на сервер (Blob) или текст ошибки. */
  async function prepImage(file) {
    if (!file || !IMG_TYPES.test(file.type)) return { err: 'Нужна картинка: PNG, JPG, WebP или GIF' };
    if (file.size > IMG.pick) return { err: 'Файл больше 8 МБ — уменьши его' };
    if (file.type === 'image/gif' && gifAnimated(new Uint8Array(await file.arrayBuffer()))) {
      return file.size > IMG.gif ? { err: 'Анимированный GIF больше 3 МБ — его не сжать без потери анимации, уменьши' } : { blob: file };
    }
    let src; try { src = await decode(file); } catch { return { err: 'Не получилось открыть картинку — файл повреждён?' }; }
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
    if (!w0 || !h0) return { err: 'Не получилось открыть картинку' };
    const k = Math.min(1, IMG.width / w0), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(src, 0, 0, w, h);
    if (src.close) src.close();
    // WebP; старый Safari его не кодирует (вернёт PNG) — тогда JPEG
    let blob = await toBlob(c, 'image/webp', IMG.q);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(c, 'image/jpeg', 0.85);
    if (!blob) return { err: 'Не получилось сжать картинку' };
    // исходник уже маленький и не больше нужного — пусть идёт как есть, если пережатый вышел тяжелее
    if (k === 1 && file.type !== 'image/gif' && file.size < blob.size && file.size <= (2 << 20)) blob = file;
    return { blob };
  }
  async function uploadImage(file) {
    const p = await prepImage(file);
    if (p.err) return { ok: false, text: p.err };
    try {
      const r = await fetch('/admin/api/news/upload', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': p.blob.type || 'application/octet-stream' }, body: p.blob });
      const j = await r.json().catch(() => null);
      if (r.status === 401) return { ok: false, text: 'Войди заново: сессия закончилась' };
      if (r.status === 403) return { ok: false, text: 'Только для администратора игры' };
      if (!r.ok || !j || !j.ok) return { ok: false, text: (j && j.text) || (r.status === 413 ? 'Картинка слишком большая' : 'Не загрузилось: ' + ((j && j.error) || r.status)) };
      return j;
    } catch { return { ok: false, text: 'Нет связи с сервером — проверь интернет и повтори' }; }
  }

  // «опасная» кнопка: первый клик — «Точно?», второй (в течение 4 с) — действие
  function confirmBtn(b, ask, act) {
    b.addEventListener('click', () => {
      if (b.dataset.armed) { delete b.dataset.armed; clearTimeout(b._t); b.textContent = b.dataset.label; act(); return; }
      b.dataset.label = b.textContent; b.dataset.armed = '1'; b.textContent = ask;
      b._t = setTimeout(() => { if (!b.dataset.armed) return; delete b.dataset.armed; b.textContent = b.dataset.label; }, 4000);
    });
  }
  /** Опубликовать / снять. Возвращает новую запись или null (ошибку показывает say). */
  async function setPub(id, on, say) {
    const j = await call('/admin/api/news/publish', { id, on });
    if (!j.ok) { say(j.text, true); return null; }
    say(on ? 'Опубликовано — зрители видят на вкладке «Новости»' : 'Снято — зрители больше не видят');
    return j.post;
  }
  // 19.10: «Удалить» — в «Удалённые» на 30 дней (с лайками и комментариями); оттуда — «Вернуть» или «Удалить навсегда»
  async function del(id, say) {
    const j = await call('/admin/api/news/delete', { id });
    if (!j.ok) { say(j.text, true); return false; }
    say(`Перенесено в «Удалённые» — вернуть можно ${j.days || 30} дней`); return true;
  }
  const trash = () => call('/admin/api/news/trash');
  async function restore(id, say) {
    const j = await call('/admin/api/news/restore', { id });
    if (!j.ok) { say(j.text, true); return null; }
    say(j.post.published ? 'Возвращено — зрители снова видят запись с прежней датой' : 'Возвращено в черновики'); return j.post;
  }
  async function purge(id, say) {
    const j = await call('/admin/api/news/purge', { id });
    if (!j.ok) { say(j.text, true); return false; }
    say('Удалено навсегда'); return true;
  }
  // сколько осталось до окончательного удаления: «ещё 29 дн.» / «сегодня»
  const left = (t) => { const d = Math.ceil(((t || 0) - Date.now()) / 864e5); return d > 0 ? `удалится сама через ${d} дн.` : 'удалится сама сегодня'; };

  /**
   * Редактор в box. post — запись (правка) или null (новая).
   * o.say(text, bad) — сообщение; o.onChange(post) — запись сохранена/опубликована/снята; o.onClose() — закрыть редактор;
   * o.closeLabel — подпись кнопки выхода; o.titleTag — тег заголовка (h2 в окне сайта, h3 в пульте).
   * Возвращает { dirty(), close() } — close() с защитой несохранённого (true — закрыто).
   */
  function editor(box, post, o) {
    const id0 = 'ne' + (++uid);
    const ed = { id: post ? post.id : null, tag: post ? post.tag || '' : '', published: !!(post && post.published), publishedAt: post ? post.publishedAt : null, dirty: false };
    const H = o.titleTag || 'h3', closeLabel = o.closeLabel || 'К списку';
    box.innerHTML = `<div class="nwa-ed">
      <div class="card nwa-form">
        <div class="card-head"><${H} id="${id0}-h" data-head>${post ? 'Правка записи' : 'Новый пост'}</${H}><span class="nwa-st-ed" data-state></span></div>
        <div class="nwa-f"><label for="${id0}-t">Заголовок</label><small data-tc></small>
          <input type="text" id="${id0}-t" data-title maxlength="${LIM.title}" placeholder="Например: Новый босс в Шахте" value="${esc(post ? post.title : '')}" aria-describedby="${id0}-err" autocomplete="off"></div>
        <div class="nwa-f"><span id="${id0}-tl">Метка</span><div class="nwa-tags" role="radiogroup" aria-labelledby="${id0}-tl">
          ${[['', 'Без метки'], ...Object.entries(TAGS)].map(([k, t]) => `<label><input type="radio" name="${id0}-tag" value="${k}"${ed.tag === k ? ' checked' : ''}><span${k ? ` data-tag="${k}"` : ''}>${t}</span></label>`).join('')}</div></div>
        <div class="nwa-f"><label for="${id0}-b">Текст</label><small data-bc></small>
          <div class="nwa-tools" role="toolbar" aria-label="Оформление текста"><button type="button" class="small" data-fx="b" aria-label="Жирный" title="Жирный: **текст**"><b>Ж</b></button><button type="button" class="small" data-fx="i" aria-label="Курсив" title="Курсив: *текст*"><i>К</i></button><button type="button" class="small" data-fx="ul" title="Список: строки с «- »">• Список</button><button type="button" class="small" data-fx="ol" title="Нумерованный: «1. »">1. Список</button><button type="button" class="small" data-fx="h" title="Подзаголовок: «## »">Подзаголовок</button><button type="button" class="small" data-fx="a" title="Ссылка: [текст](https://…)">Ссылка</button><button type="button" class="small nwe-imgb" data-img aria-controls="${id0}-b" title="Картинка: PNG, JPG, WebP или GIF до 8 МБ. Можно вставить из буфера (Ctrl+V) или перетащить в текст"><svg class="nwe-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17"/></svg>Картинка</button><input type="file" data-imgf accept="image/png,image/jpeg,image/webp,image/gif" hidden><span class="nwe-cwrap"><button type="button" class="small nwe-cbtn" data-color aria-haspopup="true" aria-expanded="false" aria-controls="${id0}-pal" title="Цвет выделенного текста"><i class="nwe-cdot" aria-hidden="true"></i>Цвет</button>
            <span class="nwe-pal" id="${id0}-pal" role="group" aria-label="Цвет выделенного текста" hidden>${COLORS.map(([k, t]) => `<button type="button" class="nwe-sw nc-${k}" data-col="${k}" aria-label="${t}" title="${t}"><i aria-hidden="true"></i></button>`).join('')}<button type="button" class="nwe-sw nwe-none" data-col="" title="Убрать цвет с выделения">Без цвета</button></span></span></div>
          <textarea id="${id0}-b" data-text rows="12" maxlength="${LIM.body}" placeholder="Что изменилось и почему. Пустая строка — новый абзац.">${esc(post ? post.body : '')}</textarea></div>
        <details class="nwa-help"><summary>Как оформлять</summary><ul>
          <li>Пустая строка — новый абзац, Enter — перенос строки.</li>
          <li><code>**жирный**</code>, <code>*курсив*</code>, <code>## Подзаголовок</code></li>
          <li>Списки — строки с <code>- </code> или <code>1. </code> в начале.</li>
          <li>Цвет — выдели слова и нажми «Цвет»: получится <code>{{gold|текст}}</code>.</li>
          <li>Ссылки — <code>[текст](https://адрес)</code> или просто адрес https://… (только http/https).</li>
          <li>Картинка — кнопка «Картинка», вставка из буфера (Ctrl+V) или перетаскивание файла в текст. Появится строка <code>![подпись](news-img:…)</code>: подпись пиши в квадратных скобках. Картинки только свои — по чужому адресу картинка не покажется.</li>
          <li>HTML не работает: теги покажутся как текст.</li></ul></details>
        <p class="nwa-err" id="${id0}-err" data-err role="alert"></p>
        <div class="nwa-btns" data-btns></div>
      </div>
      <div class="card nwa-prev" role="region" aria-labelledby="${id0}-ph"><div class="card-head"><h3 id="${id0}-ph">Как увидят зрители</h3><span class="hint" data-pst aria-live="polite"></span></div>
        <article class="nwa-post"><div class="nwa-pmeta"><span data-ptag></span><time data-pdate></time></div><p class="nwa-pt" data-ptitle></p><div class="nwa-pbody" data-pbody></div></article></div>
    </div>`;
    const $ = (s) => box.querySelector(s), $$ = (s) => [...box.querySelectorAll(s)];
    const ti = $('[data-title]'), tx = $('[data-text]'), err = $('[data-err]');
    const counts = () => { $('[data-tc]').textContent = `${ti.value.length}/${LIM.title}`; $('[data-bc]').textContent = `${tx.value.length}/${LIM.body}`; };
    const state = () => {
      const [cls, lbl] = ed.id ? stateOf(ed) : ['is-draft', 'Ещё не сохранено'];
      const s = $('[data-state]'); s.className = 'nwa-st-ed ' + cls; s.textContent = lbl + (ed.dirty ? ' · есть несохранённые правки' : '');
    };
    const upd = (p) => { ed.id = p.id; ed.published = p.published; ed.publishedAt = p.publishedAt; o.onChange && o.onChange(p); buttons(); state(); };
    function buttons() {
      const b = $('[data-btns]');
      b.innerHTML = ed.published
        ? `<button type="button" class="primary" data-save>Сохранить</button><button type="button" data-unpub>Снять с публикации</button><button type="button" class="ghost" data-back>${esc(closeLabel)}</button>
           <p class="hint nwa-warn">Запись опубликована: сохранённые правки зрители увидят сразу.</p>`
        : `<button type="button" class="primary" data-save>Сохранить черновик</button><button type="button" data-pub>Опубликовать</button><button type="button" class="ghost" data-back>${esc(closeLabel)}</button>`;
      $('[data-save]').onclick = () => save(false);
      const pb = $('[data-pub]'); if (pb) confirmBtn(pb, 'Точно опубликовать для всех?', () => save(true));
      const ub = $('[data-unpub]'); if (ub) confirmBtn(ub, 'Снять с сайтов?', async () => { if (ed.dirty && !(await save(false, true))) return; const p = await setPub(ed.id, false, o.say); if (p) upd(p); });
      $('[data-back]').onclick = () => close();
    }
    // выйти: есть несохранённые правки — сначала «Выйти без сохранения?» (второе нажатие или Esc ещё раз)
    function close() {
      const back = $('[data-back]');
      if (ed.dirty && back && !back.dataset.armed) { back.dataset.armed = '1'; back.textContent = 'Выйти без сохранения?'; back.focus(); return false; }
      o.onClose && o.onClose(); return true;
    }
    // предпросмотр — тем же кодом сервера, что у зрителей (с задержкой, чтобы не слать каждую букву)
    let pt = 0, pseq = 0;
    async function preview() {
      const tag = ed.tag && TAGS[ed.tag];
      $('[data-ptag]').innerHTML = tag ? `<span class="nwa-tag" data-tag="${esc(ed.tag)}">${tag}</span>` : '';
      $('[data-pdate]').textContent = day(ed.publishedAt || Date.now());
      $('[data-ptitle]').textContent = ti.value.trim() || 'Заголовок новости';
      $('[data-ptitle]').classList.toggle('is-ph', !ti.value.trim());
      const seq = ++pseq, j = await call('/admin/api/news/preview', { body: tx.value });
      if (seq !== pseq || !box.isConnected) return;
      $('[data-pst]').textContent = j.ok ? '' : j.text;
      if (j.ok) $('[data-pbody]').innerHTML = j.html || '<p class="nwa-ph">Текст новости появится здесь.</p>';
    }
    const changed = () => {
      ed.dirty = true; err.textContent = ''; ti.removeAttribute('aria-invalid'); counts(); state(); clearTimeout(pt); pt = setTimeout(preview, 300);
      const back = $('[data-back]'); if (back && back.dataset.armed) { delete back.dataset.armed; back.textContent = closeLabel; }
    };
    ti.oninput = changed; tx.oninput = changed;
    ti.addEventListener('blur', () => { if (ed.dirty && !ti.value.trim()) { err.textContent = 'Нужен заголовок'; ti.setAttribute('aria-invalid', 'true'); } });
    $$(`input[name="${id0}-tag"]`).forEach((r) => { r.onchange = () => { ed.tag = r.value; ed.dirty = true; state(); preview(); }; });
    // кнопки оформления: оборачивают выделение или вставляют заготовку
    $$('[data-fx]').forEach((b) => b.addEventListener('click', () => {
      const a = tx.selectionStart, z = tx.selectionEnd, sel = tx.value.slice(a, z), fx = b.dataset.fx;
      const lineStart = tx.value.lastIndexOf('\n', a - 1) + 1;
      let ins, from = a, to = z, cur;
      if (fx === 'b' || fx === 'i') { const m = fx === 'b' ? '**' : '*'; ins = m + (sel || 'текст') + m; cur = [a + m.length, a + m.length + (sel || 'текст').length]; }
      else if (fx === 'a') { ins = `[${sel || 'текст ссылки'}](https://)`; cur = [a + ins.length - 1, a + ins.length - 1]; }
      else {
        const pre = fx === 'ul' ? '- ' : '## ';
        from = lineStart; const block = tx.value.slice(lineStart, z) || '';
        let k = 0; ins = (block || 'пункт').split('\n').map((l) => (fx === 'ol' ? `${++k}. ` : pre) + l.replace(/^(\s*([-*•]|\d+[.)]|#{1,3})\s+)/, '')).join('\n');
        cur = [from + ins.length, from + ins.length];
      }
      tx.setRangeText(ins, from, to, 'end'); tx.focus(); if (cur) tx.setSelectionRange(cur[0], cur[1]);
      changed();
    }));
    // цвет выделенного: оборачиваем {{цвет|…}}; «Без цвета» — снимаем цвет с выделения (и с метки, внутри которой курсор)
    const cbtn = $('[data-color]'), pal = $('.nwe-pal');
    let selKeep = [0, 0];
    const palShow = (on) => { pal.hidden = !on; cbtn.setAttribute('aria-expanded', String(on)); if (on) { selKeep = [tx.selectionStart, tx.selectionEnd]; const f = pal.querySelector('button'); if (f) f.focus(); } };
    cbtn.addEventListener('mousedown', (e) => e.preventDefault());   // не сбрасывать выделение в тексте
    cbtn.onclick = () => palShow(pal.hidden);
    pal.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); palShow(false); cbtn.focus(); } });
    box.addEventListener('click', (e) => { if (!pal.hidden && !e.target.closest('.nwe-cwrap')) palShow(false); });
    pal.querySelectorAll('[data-col]').forEach((b) => b.addEventListener('click', () => {
      const [a0, z0] = selKeep, v = tx.value, col = b.dataset.col;
      // метки цвета, которые задевает выделение (или в которых стоит курсор), — снимаем
      let a = a0, z = z0, m; COLOR_TOKEN.lastIndex = 0;
      while ((m = COLOR_TOKEN.exec(v))) { const s0 = m.index, e0 = s0 + m[0].length; if (s0 < Math.max(z, a + 1) && e0 > a) { a = Math.min(a, s0); z = Math.max(z, e0); } }
      const plain = v.slice(a, z).replace(COLOR_TOKEN, '$2');
      const inner = a0 === z0 && a === a0 ? 'текст' : plain;
      const ins = col ? `{{${col}|${inner}}}` : plain;
      tx.setRangeText(ins, a, z, 'end'); tx.focus();
      if (col) tx.setSelectionRange(a + col.length + 3, a + col.length + 3 + inner.length); else tx.setSelectionRange(a, a + ins.length);
      palShow(false); changed();
    }));
    // 20.10: картинка — кнопка, вставка из буфера, перетаскивание. Строка разметки — на своей строке в месте курсора, курсор — в подпись
    const ib = $('[data-img]'), inp = $('[data-imgf]');
    let imgBusy = false;
    async function addImage(file) {
      if (imgBusy) { o.say('Подожди: предыдущая картинка ещё загружается', true); return; }
      imgBusy = true; ib.disabled = true; const lbl = ib.lastChild.textContent; ib.lastChild.textContent = 'Загружаю…';
      const a = tx.selectionStart, z = tx.selectionEnd;
      try {
        const j = await uploadImage(file);
        if (!j.ok) { err.textContent = j.text; return; }
        const v = tx.value, pre = a > 0 && v[a - 1] !== '\n' ? '\n\n' : '', post = v[z] === '\n' ? '\n' : '\n\n';
        const ins = pre + j.md + post;
        if (v.length - (z - a) + ins.length > LIM.body) { err.textContent = 'Текст и так на пределе длины — картинка не поместится'; return; }
        tx.setRangeText(ins, a, z, 'end'); tx.focus();
        const cap = a + pre.length + 2; tx.setSelectionRange(cap, cap);   // курсор — в [подпись]
        changed();
        o.say('Картинка добавлена — подпись можно написать в квадратных скобках');
      } finally { imgBusy = false; ib.disabled = false; ib.lastChild.textContent = lbl; }
    }
    ib.addEventListener('mousedown', (e) => e.preventDefault());   // не сбрасывать курсор в тексте
    ib.onclick = () => inp.click();
    inp.onchange = () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) addImage(f); };
    tx.addEventListener('paste', (e) => {
      const f = [...((e.clipboardData && e.clipboardData.files) || [])].find((x) => /^image\//.test(x.type));
      if (f) { e.preventDefault(); addImage(f); }
    });
    tx.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); tx.classList.add('is-drop'); } });
    tx.addEventListener('dragleave', () => tx.classList.remove('is-drop'));
    tx.addEventListener('drop', (e) => {
      tx.classList.remove('is-drop');
      const f = [...((e.dataTransfer && e.dataTransfer.files) || [])].find((x) => /^image\//.test(x.type));
      if (!f) return;
      e.preventDefault();
      // место вставки — куда бросили (если браузер умеет сказать), иначе — курсор
      try { const p = document.caretPositionFromPoint ? document.caretPositionFromPoint(e.clientX, e.clientY) : null; if (p && p.offsetNode === tx) tx.setSelectionRange(p.offset, p.offset); } catch { /* курсор как есть */ }
      addImage(f);
    });
    // quiet — без сообщения (сохранение перед снятием с публикации)
    async function save(publish, quiet) {
      const title = ti.value.trim();
      if (!title) { err.textContent = 'Нужен заголовок'; ti.setAttribute('aria-invalid', 'true'); ti.focus(); return false; }
      const btns = $$('[data-btns] button'); btns.forEach((x) => { x.disabled = true; });
      const sv = $('[data-save]'), svl = sv.textContent; sv.textContent = 'Сохраняю…';
      try {
        const j = await call('/admin/api/news/save', { id: ed.id || undefined, title, body: tx.value, tag: ed.tag || null });
        if (!j.ok) { err.textContent = j.text; return false; }
        ed.dirty = false;
        $('[data-head]').textContent = 'Правка записи';
        if (publish) { upd(j.post); const p = await setPub(j.post.id, true, o.say); if (p) upd(p); }
        else { if (!quiet) o.say(ed.published ? 'Сохранено — зрители уже видят правки' : 'Черновик сохранён — зрители его не видят'); upd(j.post); }
        return true;
      } finally { if (sv.isConnected) sv.textContent = svl; btns.forEach((x) => { x.disabled = false; }); }
    }
    counts(); state(); buttons(); preview();
    return { dirty: () => ed.dirty, close, focus: () => (ed.id ? tx : ti).focus(), headId: id0 + '-h' };
  }

  return { TAGS, LIM, COLORS, esc, when, day, stateOf, call, confirmBtn, setPub, del, trash, restore, purge, left, editor };
})();
