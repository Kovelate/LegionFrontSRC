


(function (root) {
  const BASE = 50, K = 0.37, MIN = 0.45, MAX_DEF = 200;
   

  const ROOM = { 'Пещера': { maxK: 0.5, depth: 0.78 }, 'Шахта': { maxK: 0.5, depth: 0.78 }, 'Данж': { maxK: 0.5, depth: 0.78 } };
  const roomOf = (terrain) => ROOM[terrain] || { maxK: 1, depth: 1 };

  const capFor = (max = MAX_DEF, terrain) => Math.max(BASE, Math.round((+max || MAX_DEF) * roomOf(terrain).maxK));

  function camFor(fighters, max = MAX_DEF, terrain) {
    const n = Math.max(1, Math.min(+fighters || 0, capFor(max, terrain)));
    return n <= BASE ? 1 : Math.max(MIN, +Math.pow(BASE / n, K).toFixed(3));
  }

  const foesFor = (cam) => Math.max(6, Math.min(20, Math.round(6 / (cam * cam))));
  

  const frontsFor = (roll) => (+roll === 1 ? ['L', 'R', 'F'] : +roll >= 2 && +roll <= 9 ? ['L', 'R'] : ['R']);
  const API = { BASE, MIN, MAX_DEF, ROOM, roomOf, capFor, camFor, foesFor, frontsFor };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.QCrowdCam = API;
})(typeof window !== 'undefined' ? window : this);
