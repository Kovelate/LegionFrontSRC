// Вход в пульт без сессии (обычно — док-панель OBS): «через основной браузер» по коду или через Twitch здесь.
(() => {
  const A = window.LG_AUTH || {};
  const $ = (id) => document.getElementById(id);
  const show = (id) => { for (const s of ['choose', 'wait', 'end']) $(s).hidden = s !== id; };
  const twitch = '/auth/twitch/login?next=' + encodeURIComponent(A.next || '/');
  $('tw').href = $('tw2').href = twitch;

  let timer = 0, deadline = 0, url = '';
  const post = async (path, body) => {
    const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    let j = null; try { j = await r.json(); } catch { /* не JSON */ }
    return { status: r.status, j: j || {} };
  };
  const left = () => {
    const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  function end(title, text) {
    clearTimeout(timer); timer = 0;
    $('endTitle').textContent = title; $('endText').textContent = text;
    show('end');
  }

  async function start() {
    $('go').disabled = $('again').disabled = true; $('err0').textContent = '';
    try {
      const { status, j } = await post('/auth/device/start', { next: A.next });
      if (!j.ok) { show('choose'); $('err0').textContent = status === 429 ? 'Слишком много попыток — подожди несколько минут.' : 'Не получилось начать вход. Попробуй ещё раз.'; return; }
      url = j.url; deadline = Date.now() + j.ttl * 1000;
      $('addr').textContent = j.link.replace(/^https?:\/\//, '');
      $('code').textContent = j.code;
      $('url').value = url;
      $('qr').innerHTML = (window.LGQR && window.LGQR.svg(url)) || '';
      $('qr').parentNode.hidden = !$('qr').innerHTML;
      $('copy').textContent = 'Скопировать ссылку';
      $('dot').className = 'dot';
      show('wait');
      tick();
    } catch {
      show('choose'); $('err0').textContent = 'Нет связи с сервером. Попробуй ещё раз.';
    } finally { $('go').disabled = $('again').disabled = false; }
  }

  // опрос раз в 2 с: подтвердили — сервер ставит куку входа, идём в пульт
  async function tick() {
    clearTimeout(timer);
    let j = null;
    try { j = (await post('/auth/device/poll')).j; } catch { /* сеть моргнула — спросим ещё раз */ }
    if (j && j.state === 'ok') {
      $('dot').className = 'dot ok'; $('st').textContent = 'Вход подтверждён, открываем пульт…';
      location.replace(j.next || A.next || '/');
      return;
    }
    if (j && j.state === 'cancelled') return end('Вход отменён', 'В браузере нажали «Отмена». Если это был ты — получи новый код.');
    if ((j && j.state === 'expired') || Date.now() > deadline) return end('Код устарел', 'Код действует 10 минут. Получи новый.');
    if (j && j.state === 'wait' && typeof j.ttl === 'number') deadline = Date.now() + j.ttl * 1000;
    $('st').textContent = `Ждём подтверждения… код действует ещё ${left()}`;
    timer = setTimeout(tick, 2000);
  }

  // копирование: буфер обмена, если нельзя (старый CEF, нет прав) — выделяем ссылку, чтобы скопировать вручную
  async function copy() {
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url); ok = true; } } catch { /* нет прав */ }
    if (!ok) {
      const i = $('url'); i.focus(); i.select(); i.setSelectionRange(0, i.value.length);
      try { ok = document.execCommand('copy'); } catch { ok = false; }
    }
    $('copy').textContent = ok ? 'Скопировано ✓' : 'Нажми Ctrl+C';
    setTimeout(() => { $('copy').textContent = 'Скопировать ссылку'; }, 2500);
  }

  $('go').onclick = start;
  $('again').onclick = start;
  $('copy').onclick = copy;
  $('url').onfocus = () => $('url').select();
  // в док-панели OBS окно может открыться внутри OBS (там тоже не вошли) — поэтому это запасной вариант, главное — ссылка и код
  $('open').onclick = () => { try { window.open(url, '_blank', 'noopener'); } catch { /* не открылось */ } };
  $('back').onclick = () => { clearTimeout(timer); timer = 0; show('choose'); };
  // вкладку вернули из фона — проверим сразу, не дожидаясь таймера
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer) tick(); });
})();
