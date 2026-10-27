// 22.10 (Issue #27): большой бой — общие правила для сервера (quest/battle.js, server.js) и оверлея (client/battlecrowd.js):
// сколько героев на экране, насколько «отъехать» камере, сколько врагов показать, с каких сторон враги по броску кубика.
// Один файл, чтобы сервер и экран не разошлись. В браузере — window.QCrowdCam, в Node — module.exports.
(function (root) {
  const BASE = 50, K = 0.37, MIN = 0.45, MAX_DEF = 200;
  /* тесные места (решение стримера 22.10): в пещере и шахте потолок вдвое меньше, строй — только на ближней части пола */
  // 22.10: бой в данже — как в пещере (решение стримера: ограниченное пространство)
  const ROOM = { 'Пещера': { maxK: 0.5, depth: 0.78 }, 'Шахта': { maxK: 0.5, depth: 0.78 }, 'Данж': { maxK: 0.5, depth: 0.78 } };
  const roomOf = (terrain) => ROOM[terrain] || { maxK: 1, depth: 1 };
  // сколько героев помещается на экране: настройка канала battleCrowdMax (по умолчанию 200) × теснота места
  const capFor = (max = MAX_DEF, terrain) => Math.max(BASE, Math.round((+max || MAX_DEF) * roomOf(terrain).maxK));
  // камера — по реальному числу бойцов в бою, не больше потолка: до 50 — как раньше (×1), 100 — ×0,77, 200 — ×0,6, не мельче ×0,45
  function camFor(fighters, max = MAX_DEF, terrain) {
    const n = Math.max(1, Math.min(+fighters || 0, capFor(max, terrain)));
    return n <= BASE ? 1 : Math.max(MIN, +Math.pow(BASE / n, K).toFixed(3));
  }
  // врагов на экране при этой камере: 6 (как раньше) … 20; остальные стаи — в запасе
  const foesFor = (cam) => Math.max(6, Math.min(20, Math.round(6 / (cam * cam))));
  /* окружение (решение стримера 22.10): бросок входа 1 — враги с трёх сторон (слева, справа и вдали), 2–9 — с двух (слева и справа),
     10 и больше — только справа, как раньше. R — справа, L — слева, F — вдали (по центру за отрядом) */
  const frontsFor = (roll) => (+roll === 1 ? ['L', 'R', 'F'] : +roll >= 2 && +roll <= 9 ? ['L', 'R'] : ['R']);
  const API = { BASE, MIN, MAX_DEF, ROOM, roomOf, capFor, camFor, foesFor, frontsFor };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.QCrowdCam = API;
})(typeof window !== 'undefined' ? window : this);
