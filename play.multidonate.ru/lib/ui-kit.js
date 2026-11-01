







(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LGUi = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

  function plural(n, one, few, many) {
    if (Array.isArray(one)) { [one, few, many] = one; }
    const a = Math.abs(Math.trunc(Number(n) || 0)), m10 = a % 10, m100 = a % 100;
    return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  }
  const pluralN = (n, one, few, many) => `${n} ${plural(n, one, few, many)}`;

  function timeAgo(ts, now = Date.now()) {
    const s = Math.max(0, Math.round((now - Number(ts)) / 1000));
    if (!Number.isFinite(s)) return '';
    if (s < 45) return 'только что';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} мин назад`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} ч назад`;
    const d = Math.round(h / 24);
    if (d === 1) return 'вчера';
    return `${d} дн назад`;
  }

  let toastEl = null, toastT = 0;
  const elT = typeof WeakMap === 'function' ? new WeakMap() : null;
  function toast(text, o = {}) {
    if (typeof document === 'undefined') return;
    if (o.el) {
      const e = o.el, cls = o.cls || 'toast', T = elT.get(e) || {}, k = o.key || '';
      e.textContent = String(text == null ? '' : text);
      e.className = cls + ' on' + (o.err ? ' err' : '');
      clearTimeout(T[k]); T[k] = setTimeout(() => { e.className = cls; }, o.ms || (o.long ? 4500 : 1800)); elT.set(e, T);
      return;
    }
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'lg-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483646;padding:10px 16px;border-radius:10px;background:rgba(20,20,26,.92);color:#fff;font:600 15px/1.3 system-ui,sans-serif;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = String(text == null ? '' : text);
    toastEl.style.opacity = '1';
    clearTimeout(toastT);
    toastT = setTimeout(() => { if (toastEl) toastEl.style.opacity = '0'; }, o.long ? 4500 : 1800);
  }

  return { esc, plural, pluralN, timeAgo, toast };
});
