/* 23.10: общие ячейки вещей и перетаскивание для окон «Города» (Кузня - заточка, Склад) - window.LGItems.
   25.10: код переехал в библиотеку инвентаря (packages/inventory, /lib/inventory.js - window.LGInventory.items, тот же API:
   esc, cells, cell, grid, drag, menu, menuClose). Этот файл остался для прежних загрузчиков (city.js, наковальня, шахта):
   библиотека уже на странице сайта (index.html грузит её до app.js), здесь - только прежнее имя. */
(function () {
  'use strict';
  if (window.LGInventory && window.LGInventory.items) window.LGItems = window.LGInventory.items;
  else console.warn('[itemgrid] нет библиотеки инвентаря (/lib/inventory.js) - ячейки «Города» не работают');
})();
