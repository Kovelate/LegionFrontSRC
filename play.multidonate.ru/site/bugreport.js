'use strict';
/* 24.10: «Отправить баг» — окно формы (грузится только по первому нажатию на кнопку 🐞, см. bfPlace / bugOpen в app.js).
   Тема (до 100), описание (до 10000), до 5 скриншотов: выбрать, перетащить или вставить из буфера (Ctrl+V). Картинки браузер
   уменьшает до 1920 px по большей стороне и пережимает в WebP (нет WebP — JPEG) ~0.85: так они лёгкие, а метаданные (EXIF:
   место съёмки, телефон) не уходят вовсе. Сервер (src/site/bugreports.ts) всё равно проверяет и чистит сам.
   Отправка: каждая картинка — POST /api/bugs/img (тело — байты), потом POST /api/bugs { title, body, images, context }.
   Черновик живёт, пока открыта страница: закрыл окно — текст и картинки на месте. */
window.LGBug = (() => {
  const L = { title: 100, body: 10000, images: 5, pick: 20 * 1024 * 1024, bytes: 5 * 1024 * 1024, side: 1920, q: 0.85 };
  const OK = /^image\/(png|jpeg|webp)$/;
  const esc = window.LGSiteUi.esc;   // 25.10: общая (packages/site-ui → ui-kit), была своя копия
  const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(n / 1024)) + ' КБ');
  const len = (s) => [...String(s)].length;
  const draft = { title: '', body: '', imgs: [] };   // imgs: { blob, url, w, h, id? }
  let W = null, ctx = null, busy = false, lastFocus = null;

  /* ---------- картинки: уменьшить и пережать в браузере ---------- */
  function loadImg(file) {
    return new Promise((ok, bad) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { ok(im); setTimeout(() => URL.revokeObjectURL(u), 0); }; im.onerror = () => { URL.revokeObjectURL(u); bad(new Error('img')); }; im.src = u; });
  }
  const toBlob = (cv, type, q) => new Promise((ok) => { try { cv.toBlob((b) => ok(b), type, q); } catch { ok(null); } });
  async function shrink(file) {
    let src = null;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { src = await loadImg(file); }
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
    if (!w0 || !h0) throw new Error('img');
    const k0 = Math.min(1, L.side / Math.max(w0, h0));
    for (const [k, q] of [[k0, L.q], [k0, 0.72], [k0 * 0.75, 0.8], [k0 * 0.5, 0.8]]) {
      const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h);
      let b = await toBlob(cv, 'image/webp', q);
      if (!b || b.type !== 'image/webp') {   // старый Safari: WebP не умеет — JPEG на белом фоне (прозрачное не станет чёрным)
        g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
        b = await toBlob(cv, 'image/jpeg', q);
      }
      if (b && b.size <= L.bytes) { try { src.close && src.close(); } catch {} return { blob: b, w, h }; }
    }
    throw new Error('big');
  }
  async function addFiles(files) {
    const list = [...files].filter(Boolean);
    if (!list.length) return;
    let err = '';
    for (const f of list) {
      if (draft.imgs.length >= L.images) { err = `Можно не больше ${L.images} картинок`; break; }
      if (!OK.test(f.type)) { err = 'Подходят только картинки PNG, JPG или WebP'; continue; }
      if (f.size > L.pick) { err = 'Картинка слишком большая (больше 20 МБ)'; continue; }
      const slot = { blob: null, url: '', w: 0, h: 0, wait: true };
      draft.imgs.push(slot); drawThumbs();
      try { const r = await shrink(f); Object.assign(slot, r, { url: URL.createObjectURL(r.blob), wait: false }); }
      catch (e) { draft.imgs.splice(draft.imgs.indexOf(slot), 1); err = e && e.message === 'big' ? 'Картинку не удалось сжать до 5 МБ' : 'Картинка не открылась - попробуй другой файл'; }
      drawThumbs();
    }
    say(err);
  }

  /* ---------- что приложим автоматически ---------- */
  function browser() {
    const u = navigator.userAgent, m = /(Edg|OPR|YaBrowser|Firefox|Chrome|CriOS|FxiOS|Version)\/(\d+)/.exec(u);
    const name = !m ? '' : { Edg: 'Edge', OPR: 'Opera', YaBrowser: 'Яндекс Браузер', Firefox: 'Firefox', FxiOS: 'Firefox', CriOS: 'Chrome', Chrome: 'Chrome', Version: /Safari/.test(u) ? 'Safari' : '' }[m[1]] || '';
    const os = /Android/.test(u) ? 'Android' : /iPhone|iPad|iPod/.test(u) ? 'iOS' : /Windows/.test(u) ? 'Windows' : /Mac OS X/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : '';
    return [name && name + ' ' + m[2], os].filter(Boolean).join(', ') || 'браузер';
  }
  function context() {
    let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
    return {
      tab: ctx.tab || '', view: ctx.view || '', page: location.pathname, ch: ctx.ch ? ctx.ch.login : '', ua: navigator.userAgent,
      screen: `${screen.width}×${screen.height}`, vp: `${window.innerWidth}×${window.innerHeight}`, dpr: String(Math.round((window.devicePixelRatio || 1) * 100) / 100),
      ver: String(ctx.ver || ''), lang: navigator.language || '', style: ctx.style || '', tz, at: new Date().toISOString(),
    };
  }
  function ctxText(c) {
    const where = [ctx.tabName, ctx.viewName].filter(Boolean).join(' · ');
    return [where && `раздел «${where}»`, c.ch && `канал ${c.ch}`, browser(), `экран ${c.screen}`, c.ver && `версия сайта ${c.ver.slice(0, 8)}`].filter(Boolean).join(', ');
  }

  /* ---------- окно ---------- */
  function build() {
    const c = context();
    W = document.createElement('div');
    W.className = 'bugm';
    W.innerHTML = `<div class="bugm-scrim" data-bclose></div>
      <section class="bugm-box panel" role="dialog" aria-modal="true" aria-labelledby="bugmT" aria-describedby="bugmD">
        <button type="button" class="bugm-x" data-bclose aria-label="Закрыть">×</button>
        <h2 class="h2 bugm-h" id="bugmT"><span aria-hidden="true">🐞</span> Отправить баг</h2>
        <p class="muted bugm-lead" id="bugmD">Что-то сломалось или работает не так? Опиши - стример канала прочитает.</p>
        <form class="bugm-f" novalidate>
          <label class="bugm-l"><span class="bugm-lt">Тема <b aria-hidden="true">*</b></span>
            <input name="title" type="text" maxlength="${L.title}" required autocomplete="off" enterkeyhint="next" placeholder="Коротко: что не так" aria-describedby="bugmNt">
            <span class="bugm-n" id="bugmNt" data-n="title"></span></label>
          <label class="bugm-l"><span class="bugm-lt">Описание <b aria-hidden="true">*</b></span>
            <textarea name="body" rows="6" maxlength="${L.body}" required placeholder="Что делал, что ожидал увидеть и что случилось. Если повторяется - как повторить." aria-describedby="bugmNb"></textarea>
            <span class="bugm-n" id="bugmNb" data-n="body"></span></label>
          <div class="bugm-l"><span class="bugm-lt" id="bugmIt">Скриншоты <span class="muted">до ${L.images}, PNG, JPG или WebP</span></span>
            <button type="button" class="bugm-drop" aria-describedby="bugmIt"><span class="bugm-dropt">Перетащи сюда, вставь из буфера (Ctrl+V) или <u>выбери файлы</u></span><span class="bugm-dropp">Добавить скриншот</span></button>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden>
            <ul class="bugm-th" aria-label="Прикреплённые скриншоты"></ul></div>
          <details class="bugm-ctx"><summary><span>Будет приложено:</span> ${esc(ctxText(c))}</summary>
            <p class="muted">Это поможет найти ошибку. Ник в Twitch тоже будет виден стримеру.</p>
            <dl>${[['Страница', c.page], ['Раздел', [ctx.tabName, ctx.viewName].filter(Boolean).join(' · ') || c.tab], ['Канал', c.ch], ['Браузер', c.ua], ['Экран', `${c.screen} (окно ${c.vp}, масштаб ${c.dpr})`], ['Версия сайта', c.ver], ['Оформление', c.style]]
              .filter((x) => x[1]).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>
          <p class="bugm-err" role="alert" aria-live="assertive"></p>
          <div class="bugm-acts"><button type="button" class="btn ghost" data-bclose>Отмена</button><button type="submit" class="btn primary bugm-send">Отправить</button></div>
        </form>
      </section>`;
    document.body.appendChild(W);
    const f = W.querySelector('form'), ti = f.elements.title, bo = f.elements.body, file = W.querySelector('input[type=file]'), drop = W.querySelector('.bugm-drop');
    ti.value = draft.title; bo.value = draft.body;
    const count = () => {
      draft.title = ti.value; draft.body = bo.value;
      for (const [n, el, max] of [['title', ti, L.title], ['body', bo, L.body]]) { const x = W.querySelector(`[data-n="${n}"]`), v = len(el.value); x.textContent = `${v}/${max}`; x.classList.toggle('over', v > max); }
    };
    ti.addEventListener('input', () => { count(); ti.removeAttribute('aria-invalid'); });
    bo.addEventListener('input', () => { count(); bo.removeAttribute('aria-invalid'); });
    count();
    ti.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); bo.focus(); } });
    drop.onclick = () => file.click();
    file.onchange = () => { addFiles(file.files); file.value = ''; };
    // перетаскивание — на всё окно (не только на поле): уронил мимо — всё равно прикрепится, а не откроется в браузере
    const box = W.querySelector('.bugm-box');
    box.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); drop.classList.add('over'); } });
    box.addEventListener('dragleave', (e) => { if (!box.contains(e.relatedTarget)) drop.classList.remove('over'); });
    box.addEventListener('drop', (e) => { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
    W.addEventListener('click', (e) => { if (e.target.closest('[data-bclose]')) close(); });
    W.querySelector('.bugm-th').addEventListener('click', (e) => {
      const b = e.target.closest('[data-rm]'); if (!b || busy) return;
      const i = +b.dataset.rm, it = draft.imgs[i]; if (!it) return;
      draft.imgs.splice(i, 1); if (it.url) URL.revokeObjectURL(it.url); drawThumbs();
      const nx = W.querySelector(`[data-rm="${Math.min(i, draft.imgs.length - 1)}"]`) || drop; nx.focus();
    });
    f.onsubmit = (e) => { e.preventDefault(); send(); };
    drawThumbs();
  }
  function drawThumbs() {
    if (!W) return;
    const ul = W.querySelector('.bugm-th');
    ul.innerHTML = draft.imgs.map((x, i) => `<li${x.wait ? ' class="wait"' : ''}>${x.wait ? '<span class="bugm-sp" aria-label="Сжимаем…"></span>' : `<img src="${x.url}" alt="Скриншот ${i + 1}" width="${x.w}" height="${x.h}"><span class="bugm-sz">${kb(x.blob.size)}</span>`}
      ${x.wait ? '' : `<button type="button" class="bugm-rm" data-rm="${i}" aria-label="Убрать скриншот ${i + 1}">×</button>`}</li>`).join('');
    const full = draft.imgs.length >= L.images, drop = W.querySelector('.bugm-drop');
    drop.disabled = full; drop.classList.toggle('full', full);
  }
  function say(t) { if (W) W.querySelector('.bugm-err').textContent = t || ''; }
  function sayLogin() {
    const p = W && W.querySelector('.bugm-err'); if (!p) return;
    p.innerHTML = `Вход через Twitch закончился. <a href="${esc(ctx.login)}">Войти снова</a> - черновик пропадёт, скопируй текст.`;
  }

  async function req(url, opt) {
    try { const r = await fetch(url, { credentials: 'same-origin', ...opt }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, j: j || {} }; }
    catch { return { status: 0, j: { text: 'Нет связи с сайтом - проверь интернет и попробуй ещё раз' } }; }
  }
  async function send() {
    if (busy || !W) return;
    const f = W.querySelector('form'), ti = f.elements.title, bo = f.elements.body;
    const t = ti.value.trim(), b = bo.value.trim();
    let bad = null;
    if (!t) { ti.setAttribute('aria-invalid', 'true'); bad = bad || [ti, 'Напиши тему']; }
    else if (len(t) > L.title) { ti.setAttribute('aria-invalid', 'true'); bad = bad || [ti, `Тема - не длиннее ${L.title} символов`]; }
    if (!b) { bo.setAttribute('aria-invalid', 'true'); bad = bad || [bo, 'Опиши, что случилось']; }
    else if (len(b) > L.body) { bo.setAttribute('aria-invalid', 'true'); bad = bad || [bo, `Описание - не длиннее ${L.body} символов`]; }
    if (bad) { say(bad[1]); bad[0].focus(); return; }
    if (draft.imgs.some((x) => x.wait)) { say('Подожди - картинки ещё сжимаются'); return; }
    busy = true; W.classList.add('busy');
    const btn = W.querySelector('.bugm-send'), lbl = btn.textContent;
    W.querySelectorAll('input, textarea, button').forEach((x) => { if (!x.matches('[data-bclose]')) x.disabled = true; });
    const done = (msg) => { busy = false; if (!W) return; W.classList.remove('busy'); btn.textContent = lbl; W.querySelectorAll('input, textarea, button').forEach((x) => { x.disabled = false; }); drawThumbs(); if (msg) say(msg); };
    say('');
    const imgs = draft.imgs;
    for (let i = 0; i < imgs.length; i++) {
      if (imgs[i].id) continue;
      btn.textContent = imgs.length > 1 ? `Картинки ${i + 1}/${imgs.length}…` : 'Картинка…';
      const up = () => req('/api/bugs/img', { method: 'POST', headers: { 'Content-Type': imgs[i].blob.type || 'application/octet-stream' }, body: imgs[i].blob });
      let r = await up();
      // 27.10: сбой связи или сервера (мобильный интернет) - ещё две попытки, сами
      for (let k = 0; k < 2 && !r.j.ok && (r.status === 0 || r.status >= 500); k++) { await new Promise((ok) => setTimeout(ok, 1500 * (k + 1))); r = await up(); }
      if (r.status === 401) { done(); sayLogin(); return; }
      if (!r.j.ok) { done(r.j.text || `Картинка не загрузилась - попробуй ещё раз (код ${r.status}${r.j.error ? ' ' + String(r.j.error).replace(/[^\w-]/g, '') : ''})`); return; }
      imgs[i].id = r.j.id;
    }
    btn.textContent = 'Отправляем…';
    const r = await req('/api/bugs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t, body: b, images: imgs.map((x) => x.id), context: context() }) });
    if (r.status === 401) { done(); sayLogin(); return; }
    if (!r.j.ok) {
      if (r.j.error === 'bad_images') imgs.forEach((x) => { delete x.id; });   // картинки устарели — загрузим заново
      done(r.j.text || 'Не отправилось - попробуй ещё раз'); return;
    }
    // отправлено: черновик — с чистого листа
    for (const x of draft.imgs) if (x.url) URL.revokeObjectURL(x.url);
    draft.title = ''; draft.body = ''; draft.imgs = [];
    busy = false;
    close();
    ctx.toast('Спасибо! Репорт отправлен');
  }

  /* ---------- открыть / закрыть ---------- */
  function onKey(e) {
    if (!W) return;
    if (e.key === 'Escape') { if (!busy) { e.preventDefault(); close(); } return; }
    if (e.key !== 'Tab') return;
    const f = [...W.querySelectorAll('button:not([disabled]), input:not([hidden]):not([disabled]), textarea:not([disabled]), summary, a[href]')].filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function onPaste(e) {
    if (!W || busy) return;
    const fs = [...((e.clipboardData && e.clipboardData.items) || [])].filter((x) => x.kind === 'file' && OK.test(x.type)).map((x) => x.getAsFile());
    if (fs.length) { e.preventDefault(); addFiles(fs); }
  }
  function open(c) {
    ctx = c;
    if (W) { W.querySelector('[name=title]').focus(); return; }
    lastFocus = document.activeElement;
    build();
    document.documentElement.classList.add('bugm-lock');
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('paste', onPaste);
    requestAnimationFrame(() => { if (W) { W.classList.add('on'); const ti = W.querySelector('[name=title]'); (ti.value ? W.querySelector('[name=body]') : ti).focus({ preventScroll: true }); } });
  }
  function close() {
    if (!W || busy) return;
    W.remove(); W = null;
    document.documentElement.classList.remove('bugm-lock');
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('paste', onPaste);
    try { if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); } catch {}
    if (ctx && ctx.onClose) ctx.onClose();
  }
  return { open, close, draft, L };
})();
