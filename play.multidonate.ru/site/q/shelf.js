



(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QShelf = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PER = 3;

  function place(i, n) {
    const row = Math.floor(i / PER), col = i % PER, k = Math.min(PER, n - row * PER);
    return { row, col, k, x: (2 * col + 1) / (2 * k), n: i + 1 };
  }

  function rows(n) {
    const out = [];
    for (let i = 0; i < n; i += PER) out.push(Array.from({ length: Math.min(PER, n - i) }, (_, j) => i + j));
    return out;
  }
  return { PER, place, rows };
});
