// 26.10: раскладка прилавка лавки похода - ОДНА на оверлей (shopui.js, «Прилавок») и вкладку «Поход» сайта (quest.js shopHtml):
// по PER вещей на полке, номера по порядку слева направо, сверху вниз (1-3 верхняя, 4-6 средняя, 7-8 нижняя...). Номер = «купить N».
// Вещи неполной полки - по правилу space-around (как .shelf оверлея): центр j-й из k вещей - (2j + 1) / 2k ширины полки.
// В браузере - window.QShelf, в Node - module.exports (тесты). Без зависимостей и без работы на кадр.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QShelf = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PER = 3;
  // место i-й вещи (с 0) из n: полка, место на полке, сколько вещей на этой полке, центр по ширине полки (0..1), номер для «купить N»
  function place(i, n) {
    const row = Math.floor(i / PER), col = i % PER, k = Math.min(PER, n - row * PER);
    return { row, col, k, x: (2 * col + 1) / (2 * k), n: i + 1 };
  }
  // полки: [[0, 1, 2], [3, 4, 5], [6, 7]] - номера вещей (с 0) по полкам
  function rows(n) {
    const out = [];
    for (let i = 0; i < n; i += PER) out.push(Array.from({ length: Math.min(PER, n - i) }, (_, j) => i + j));
    return out;
  }
  return { PER, place, rows };
});
