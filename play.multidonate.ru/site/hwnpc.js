/* 27.10 (art/hw-npc): хэллоуинские НПС «Ночи Тыквенной Луны» в городе канала - «Ступа сладостей» (обменник конфет, ведьма в ступе)
   и Призрачный Фонарщик (хранитель баттл-пасса: кованая арка с 20 фонариками, горят - пройденные уровни).
   Одни на все 7 стилей (как враги); видны только в хэллоуинском городе (city.js / ovcity.js решают, когда). Стоят только на Ярмарке
   «Города» (вкладка «Город» сайта): средняя улица у канала правее Шахты (решение стримера 27.10); в Перепутье и городах края их нет.
   Один файл для сайта, оверлея и тестов (window.LGHwNpc):
     (где стоят - крючок cityhw.js npcSpots(sc): только Ярмарка «Города»; слияние 27.10)
     geo(spot, o)    - для места: здание (hit, door - как BUILDINGS), препятствия, предмет по глубине (prop), живые слои (live)
     open(kind, X)   - окно лавки или пасса на сайте (поверх города; телефон - на весь экран)
   Рисунок - SVG в стиле игры: контур, светлый верх, тень снизу; повторы - <symbol>; движение - только transform / opacity (CSS),
   без filter и без SMIL. Живых групп: у Ступы 2 (искры под ступой, прыгающие конфеты), у Фонарщика 2 (призрак с шестом, мерцание огней). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LGHwNpc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const INK = '#1c1424';
  const C = {
    night: '#15122e', vio: '#6a3fc4', vioD: '#47288a', vioL: '#9b6ef0', pump: '#ff7a1a', pumpD: '#c8501a', pumpL: '#ffb347', gold: '#ffc94d', goldD: '#c8901a',
    skin: '#a8d86a', skinD: '#7fb048', hair: '#ff5a2a', hairD: '#b8361a', wood: '#9a6436', woodD: '#6a4022', woodL: '#c88a50', iron: '#4a4458', ironL: '#6e6a7c',
    candy: ['#ff5aa8', '#ffd34d', '#6dffb0', '#b98aff', '#ff8a1f', '#4ab0ff'], cream: '#f3e6c8',
  };
  const O = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const f1 = (v) => Math.round(v * 10) / 10;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ===================== РИСУНОК ===================== */
  // символы и градиенты (в каждом куске рисунка - свои: куски печатаются отдельно)
  const DEFS = `<defs>
<radialGradient id="hnGlow"><stop offset="0" stop-color="#ffb347" stop-opacity=".75"/><stop offset=".45" stop-color="#ff7a1a" stop-opacity=".28"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
<radialGradient id="hnGlowG"><stop offset="0" stop-color="#9dffc8" stop-opacity=".7"/><stop offset="1" stop-color="#6dffb0" stop-opacity="0"/></radialGradient>
<symbol id="hnCandy" overflow="visible"><path d="M-11 0 l-9 -8 q-3 8 0 16 z M11 0 l9 -8 q3 8 0 16 z" ${O(2)}/><ellipse rx="12" ry="9" ${O(2.4)}/><path d="M-6 -4 q5 -3 10 0" stroke="#fff" stroke-width="2.6" fill="none" opacity=".75" stroke-linecap="round"/></symbol>
<symbol id="hnRivet" overflow="visible"><circle r="3.6" fill="${C.ironL}" stroke="${INK}" stroke-width="1.6"/><circle cx="-1" cy="-1" r="1.2" fill="#c8c4d4"/></symbol>
<symbol id="hnPump" overflow="visible"><circle cy="-22" r="46" fill="url(#hnGlow)"/><path d="M-4 -46 q2 -10 10 -12" stroke="#3a7a2a" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cy="-22" rx="27" ry="23" fill="${C.pump}" ${O(3)}/><path d="M-9 -44 Q-16 -22 -9 0 M9 -44 Q16 -22 9 0" stroke="${C.pumpD}" stroke-width="3" fill="none"/><path d="M8 -40 q12 6 14 18" stroke="${C.pumpL}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/><path d="M-15 -28 l6 -8 l6 8 z M3 -28 l6 -8 l6 8 z M-14 -14 q14 10 28 0 l-5 6 l-4 -4 l-5 5 l-5 -5 l-4 4 z" fill="#ffe08a" ${O(2)}/></symbol>
<symbol id="hnLampOn" overflow="visible"><circle cy="12" r="22" fill="url(#hnGlow)"/><path d="M-4 -6 h8 v4 h-8 z" fill="${C.iron}" ${O(1.8)}/><path d="M-9 -2 h18 l3 4 v16 l-3 4 h-18 l-3 -4 v-16 z" fill="#ffd27a" ${O(2.2)}/><path d="M0 16 C-4 14 -4 8 0 4 C3 8 4 12 0 16 Z" fill="#ff8a2a"/><path d="M-9 8 h18" stroke="${INK}" stroke-width="1.8"/><path d="M-10 22 h20" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></symbol>
<symbol id="hnLampOff" overflow="visible"><path d="M-4 -6 h8 v4 h-8 z" fill="${C.iron}" ${O(1.8)}/><path d="M-9 -2 h18 l3 4 v16 l-3 4 h-18 l-3 -4 v-16 z" fill="#3a3448" ${O(2.2)}/><path d="M-6 4 l12 12" stroke="#5a5470" stroke-width="2"/><path d="M-9 8 h18" stroke="${INK}" stroke-width="1.8"/><path d="M-10 22 h20" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></symbol>
</defs>`;
  const candy = (x, y, c, r = 0, s = 1) => `<use href="#hnCandy" fill="${c}" transform="translate(${f1(x)} ${f1(y)}) rotate(${r}) scale(${s})"/>`;
  const pumpLamp = (x, y, s = 1) => `<use href="#hnPump" transform="translate(${f1(x)} ${f1(y)}) scale(${s})"/>`;
  const flame = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 0 C-16 -2 -18 -24 0 -46 C4 -30 15 -28 12 -16 C19 -16 18 -2 0 0 Z" fill="#ff8a2a" ${O(2.6)}/><path d="M0 -3 C-7 -6 -7 -17 0 -26 C5 -17 6 -8 0 -3 Z" fill="#ffe08a"/></g>`;
  function jar(x, y, k, s = 1, lid = C.vio) {
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-17 0 Q-21 -18 -17 -38 H17 Q21 -18 17 0 Z" fill="#dff6ff" fill-opacity=".35" ${O(2.6)}/><path d="M-15 -2 Q-18 -14 -15 -24 H15 Q18 -14 15 -2 Z" fill="${k}"/>`
      + `<rect x="-14" y="-46" width="28" height="9" rx="3" fill="${lid}" ${O(2.4)}/><path d="M-11 -33 v24" stroke="#fff" stroke-width="3.4" opacity=".55" stroke-linecap="round"/><rect x="-10" y="-30" width="20" height="10" rx="2" fill="${C.cream}" ${O(1.4)}/></g>`;
  }
  // вывеска с двойной рамкой (как у зданий города)
  function board(x, y, w, h, lines, fs = 26) {
    let s = `<g transform="translate(${f1(x)} ${f1(y)})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="12" fill="${C.woodD}" ${O(4)}/>`
      + `<rect x="${-w / 2 + 7}" y="${-h / 2 + 7}" width="${w - 14}" height="${h - 14}" rx="8" fill="${C.night}" stroke="${C.gold}" stroke-width="2.6"/>`;
    lines.forEach((t, i) => { const yy = (i - (lines.length - 1) / 2) * fs * 1.08 + fs * 0.36; s += `<text y="${f1(yy)}" text-anchor="middle" font-family="Russo One" font-size="${i ? f1(fs * 0.62) : fs}" fill="${i ? '#e8e0f4' : C.pumpL}" stroke="${INK}" stroke-width="${i ? 3 : 5}" paint-order="stroke" letter-spacing="1.5">${esc(t)}</text>`; });
    return s + `</g>`;
  }
  // ведьма: x, y - низ подола; поднятой рукой держит пест (в ступе)
  function witch(x, y, s = 1) {
    const robe = C.vio, robeD = C.vioD;
    const hand = (hx, hy, r = 0) => `<g transform="translate(${hx} ${hy}) rotate(${r})"><ellipse rx="9" ry="8" fill="${C.skin}" ${O(2.6)}/><path d="M4 -6 q8 -2 9 4 M5 0 q9 0 9 6" stroke="${INK}" stroke-width="2.4" fill="${C.skin}"/></g>`;
    let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">`;
    g += `<path d="M-46 0 L-40 -12 L-32 0 L-24 -10 L-14 0 L-4 -12 L6 0 L16 -10 L26 0 L36 -12 L46 0 Q50 -70 30 -112 Q0 -126 -30 -112 Q-50 -70 -46 0 Z" fill="${robe}" ${O(3.6)}/>`;
    g += `<path d="M12 -116 Q36 -100 40 -60 Q44 -28 46 0 L36 -12 L26 0 L16 -10 L6 0 Q12 -60 12 -116 Z" fill="${robeD}"/><path d="M-26 -104 Q-10 -112 6 -110" stroke="${C.vioL}" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>`;
    g += `<path d="M-34 -78 Q0 -70 34 -78 L36 -66 Q0 -58 -36 -66 Z" fill="${C.pump}" ${O(2.6)}/><rect x="-8" y="-80" width="16" height="16" rx="3" fill="${C.gold}" ${O(2.4)}/>`;
    g += `<path d="M-30 -112 Q0 -96 30 -112 L22 -92 Q0 -82 -22 -92 Z" fill="${C.pump}" ${O(2.6)}/><path d="M-20 -104 L-14 -92 M-6 -100 L-2 -88 M8 -100 L6 -88 M20 -104 L16 -92" stroke="${C.pumpD}" stroke-width="2.4"/>`;
    // правая рука с пестом (вверх), левая - у бока
    g += `<path d="M22 -104 Q48 -104 60 -120 L70 -112 Q58 -88 40 -84 Z" fill="${robe}" ${O(3)}/><path d="M58 -170 L74 -60" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M58 -170 L74 -60" stroke="${C.woodL}" stroke-width="10" stroke-linecap="round"/><path d="M60 -160 L64 -130" stroke="#fff" stroke-width="2.4" opacity=".4"/>` + hand(66, -116, 70);
    g += `<path d="M-24 -104 Q-52 -96 -58 -74 L-56 -62 Q-44 -60 -40 -74 L-30 -84 Z" fill="${robe}" ${O(3)}/>` + hand(-52, -60, 100);
    // голова: космы, лицо с тенью, глаза с бликом, нос крючком с бородавкой, улыбка с зубом, румянец
    g += `<g transform="translate(0 -142)">`;
    g += `<path d="M-34 -6 Q-46 26 -38 52 L-26 34 Z M34 -6 Q48 24 42 54 L28 34 Z" fill="${C.hair}" ${O(2.8)}/><path d="M-38 6 Q-42 30 -36 44 M38 4 Q44 26 40 44" stroke="${C.hairD}" stroke-width="3" fill="none"/>`;
    g += `<ellipse cx="0" cy="6" rx="31" ry="33" fill="${C.skin}" ${O(3.4)}/><path d="M10 -24 Q32 -10 30 18 Q22 36 2 38 Q24 20 10 -24 Z" fill="${C.skinD}" opacity=".7"/>`;
    g += `<ellipse cx="-12" cy="0" rx="8" ry="9" fill="#fff" ${O(2.2)}/><ellipse cx="12" cy="0" rx="8" ry="9" fill="#fff" ${O(2.2)}/><circle cx="-10" cy="2" r="4.4" fill="${INK}"/><circle cx="14" cy="2" r="4.4" fill="${INK}"/><circle cx="-8.6" cy=".4" r="1.6" fill="#fff"/><circle cx="15.4" cy=".4" r="1.6" fill="#fff"/>`;
    g += `<path d="M-22 -12 q8 -6 16 -2 M6 -14 q8 -4 16 2" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    g += `<path d="M0 4 Q20 10 26 26 Q16 28 6 18" fill="${C.skin}" ${O(2.8)}/><circle cx="17" cy="16" r="3" fill="${C.skinD}" ${O(1.4)}/>`;
    g += `<path d="M-16 24 Q-2 36 12 26" stroke="${INK}" stroke-width="3" fill="#7a1a2a"/><path d="M-6 28 v5 h4 v-4" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="-22" cy="16" r="6" fill="#ff8aa0" opacity=".55"/>`;
    g += `<path d="M-62 -18 Q0 -42 64 -16 Q40 -2 0 -6 Q-40 -4 -62 -18 Z" fill="#241a3a" ${O(3.4)}/><path d="M-50 -16 Q0 -30 52 -14" stroke="#4a3a6a" stroke-width="3" fill="none"/>`;
    g += `<path d="M-30 -22 Q-24 -66 -6 -88 Q14 -106 40 -104 Q26 -94 22 -76 Q18 -52 30 -22 Z" fill="#241a3a" ${O(3.4)}/><path d="M10 -88 Q20 -80 18 -60 Q16 -40 26 -24" stroke="#120d1e" stroke-width="10" fill="none" opacity=".5"/><path d="M-20 -38 Q-16 -62 -4 -78" stroke="#4a3a6a" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    g += `<path d="M-6 -66 l14 -4 l2 14 l-14 4 z" fill="${C.vioL}" ${O(2)}/><path d="M-30 -24 Q0 -36 31 -24 L30 -32 Q0 -44 -29 -32 Z" fill="${C.pump}" ${O(2.4)}/><rect x="-6" y="-38" width="12" height="12" rx="2" fill="${C.gold}" ${O(2)}/>`;
    g += `</g>`;
    return g + '</g>';
  }

  /* --- Ступа сладостей: холст 520×560, земля y = 500, середина ступы x = 250 --- */
  const SHOP_CX = 250, PASS_CX = 260, GROUND = 500;
  function stupaArt(title) {
    let s = `<ellipse cx="250" cy="502" rx="170" ry="22" fill="#000" opacity=".28"/><ellipse cx="250" cy="470" rx="140" ry="20" fill="url(#hnGlowG)"/>`;
    s += `<ellipse cx="250" cy="250" rx="134" ry="26" fill="${C.woodD}" ${O(5)}/><ellipse cx="250" cy="246" rx="118" ry="17" fill="#3a2414"/>`;
    s += witch(250, 300, 1.08);
    const tub = 'M116 250 L140 446 Q250 470 360 446 L384 250 Q250 280 116 250 Z';
    s += `<path d="${tub}" fill="${C.wood}" ${O(5)}/>`;
    for (let i = 0; i < 8; i++) { const x = 122 + i * 33, x2 = 142 + i * 28; s += `<path d="M${x} ${262 + Math.abs(i - 3.5) * 2} L${x2} ${452 - Math.abs(i - 3.5) * 1.4}" stroke="${C.woodD}" stroke-width="3"/>`; }
    s += `<path d="M306 268 L384 250 L360 446 Q332 456 318 456 Z" fill="#000" opacity=".2"/><path d="M128 300 Q130 360 142 420" stroke="${C.woodL}" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>`;
    s += `<path d="M122 296 Q250 314 378 296 L376 314 Q250 332 124 314 Z M132 400 Q250 420 368 400 L366 418 Q250 438 134 418 Z" fill="${C.iron}" ${O(3)}/>`;
    s += [150, 200, 250, 300, 350].map((x) => `<use href="#hnRivet" x="${x}" y="${f1(308 - Math.abs(x - 250) * 0.04)}"/><use href="#hnRivet" x="${x}" y="${f1(412 - Math.abs(x - 250) * 0.04)}"/>`).join('');
    s += `<path d="M116 250 Q250 280 384 250" stroke="${C.woodL}" stroke-width="8" fill="none"/><path d="M116 250 Q250 280 384 250" ${O(4)} fill="none"/>`;
    s += [[160, 252, 0, -20], [190, 246, 1, 10], [222, 256, 2, -6], [282, 254, 3, 18], [312, 248, 4, -14], [340, 250, 5, 20], [250, 258, 4, 30]].map(([x, y, k, r]) => candy(x, y, C.candy[k], r, 0.9)).join('');
    s += jar(146, 254, C.candy[2], 0.85) + jar(356, 254, C.candy[0], 0.85, C.pump);
    // метла с вывеской слева, тыквы-фонари справа
    s += `<g transform="translate(70 500) rotate(8)"><path d="M0 -10 V-330" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M0 -10 V-330" stroke="${C.woodL}" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M-6 -46 q-30 30 -26 50 h64 q4 -20 -26 -50 z" fill="#e0b050" ${O(3)}/><path d="M-20 -8 l4 -30 M-8 -6 l2 -34 M6 -6 l-2 -34 M18 -8 l-4 -30" stroke="#a87a2a" stroke-width="2.4"/><path d="M-10 -46 h20" stroke="${C.vio}" stroke-width="7" stroke-linecap="round"/></g>`;
    const T = String(title || 'Ступа сладостей').toUpperCase().split(' ');
    s += `<path d="M60 112 L150 104" stroke="${INK}" stroke-width="3"/>` + board(118, 150, 190, 92, T.length > 1 ? [T[0], T.slice(1).join(' ')] : T, 30);
    s += pumpLamp(420, 500, 0.9) + pumpLamp(462, 500, 0.6);
    return s;
  }
  // живое у Ступы: искры под ней мерцают, две конфеты подпрыгивают над горкой
  const stupaLive = () => [
    { cls: 'hwn-tw', box: [110, 450, 300, 50], svg: [[136, 470], [210, 488], [300, 486], [366, 470]].map(([x, y], i) => `<path style="animation-delay:${-i * 0.45}s" d="M${x} ${y - 8} l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill="#c8ffe4"/>`).join('') },
    { cls: 'hwn-hop', box: [180, 190, 160, 70], svg: `<g style="animation-delay:-.4s">${candy(205, 236, C.candy[3], -18, 0.9)}</g><g style="animation-delay:-1.3s">${candy(300, 232, C.candy[1], 14, 0.9)}</g>` },
  ];

  /* --- Фонарщик: холст 520×560, земля y = 500, середина арки x = 260; lv - сколько фонарей горит (0…20) --- */
  const lampAt = (i) => { const t = (i + 0.5) / 20, a = Math.PI * (1 - t); return [260 + Math.cos(a) * 200, 470 - Math.sin(a) * 300 + 8]; };
  function archArt(lv) {
    let s = `<ellipse cx="260" cy="502" rx="230" ry="22" fill="#000" opacity=".28"/>`;
    const A = 'M60 500 V470 Q60 170 260 170 Q460 170 460 470 V500';
    s += `<path d="${A}" fill="none" stroke="${INK}" stroke-width="16"/><path d="${A}" fill="none" stroke="#5a5470" stroke-width="9"/><path d="M68 470 Q70 186 260 180" fill="none" stroke="#8a84a0" stroke-width="3"/>`;
    s += `<path d="M90 470 Q92 210 260 204 Q428 210 430 470" fill="none" stroke="${INK}" stroke-width="6" stroke-dasharray="2 14"/>`;
    s += [60, 460].map((x) => `<rect x="${x - 18}" y="470" width="36" height="30" rx="4" fill="${C.iron}" ${O(3)}/><path d="M${x - 12} 476 h24" stroke="${C.ironL}" stroke-width="3"/>`).join('');
    s += `<path d="M236 170 q24 -40 48 0" fill="none" stroke="${INK}" stroke-width="7"/><path d="M248 150 l12 -20 l12 20" fill="${C.pump}" ${O(2.6)}/>`;
    let hooks = '';
    for (let i = 0; i < 20; i++) { const [x, y] = lampAt(i); hooks += `M${f1(x)} ${f1(y - 14)} v8 `; s += `<use href="#${i < lv ? 'hnLampOn' : 'hnLampOff'}" transform="translate(${f1(x)} ${f1(y)}) scale(.9)"/>`; }
    s = s.replace('<use href="#hnLamp', `<path d="${hooks}" stroke="${INK}" stroke-width="2"/><use href="#hnLamp`);
    s += board(260, 96, 270, 70, ['ФОНАРЩИК', 'зажигай огоньки пасса'], 26);
    return s;
  }
  // призрак-фонарщик (живой - парит) и шест к следующему фонарю; плюс мерцание горящих фонарей
  // тело призрака (низ подола - 0,0; рука с шестом - у 72,-110)
  function ghostBody() {
    let s = `<ellipse cy="26" rx="44" ry="8" fill="#000" opacity=".25"/>`;
    s += `<path d="M-44 0 Q-54 -80 -36 -140 Q0 -176 36 -140 Q54 -80 44 0 q-11 -16 -22 0 q-11 -16 -22 0 q-11 -16 -22 0 q-11 -16 -22 0 Z" fill="#e8fff4" fill-opacity=".94" ${O(3.8)}/>`;
    s += `<path d="M16 -150 Q48 -120 44 -24 L44 0 q-11 -16 -22 0 Q28 -70 16 -150 Z" fill="#a8e8cc" opacity=".6"/>`;
    s += `<path d="M-46 -74 Q0 -50 46 -74 L52 -26 Q36 -4 26 -14 L0 -44 L-26 -14 Q-36 -4 -52 -26 Z" fill="#2a1846" ${O(3)}/><path d="M-12 -50 L0 -38 L12 -50" stroke="${C.gold}" stroke-width="3.4" fill="none"/><circle cx="0" cy="-30" r="3" fill="${C.gold}"/>`;
    s += `<ellipse cx="-14" cy="-112" rx="7" ry="10" fill="${INK}"/><ellipse cx="14" cy="-112" rx="7" ry="10" fill="${INK}"/><circle cx="-12" cy="-115" r="2.4" fill="#fff"/><circle cx="16" cy="-115" r="2.4" fill="#fff"/><path d="M-9 -90 q9 8 18 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-6 -94 q-16 0 -26 12 M6 -94 q16 0 26 12" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M-46 -146 Q0 -158 46 -146 L44 -136 Q0 -146 -44 -136 Z" fill="#120d1e" ${O(3)}/><path d="M-28 -148 L-26 -206 H26 L28 -148 Z" fill="#241a3a" ${O(3)}/><path d="M-27 -164 H27" stroke="${C.pump}" stroke-width="7"/><path d="M-18 -198 v26" stroke="#4a3a6a" stroke-width="4"/>`;
    s += `<path d="M36 -70 Q66 -86 74 -110" stroke="#e8fff4" stroke-width="15" fill="none" stroke-linecap="round"/><path d="M36 -70 Q66 -86 74 -110" stroke="${INK}" stroke-width="2.6" fill="none" opacity=".45"/>`;
    return s;
  }
  // шест от руки призрака (hx, hy) к фонарю next, на конце - огонёк
  function pole(hx, hy, next) {
    const len = Math.hypot(next[0] - hx, next[1] - hy) || 1, ux = (next[0] - hx) / len, uy = (next[1] - hy) / len, ex = next[0] - ux * 14, ey = next[1] - uy * 14;
    const d = `M${f1(hx - ux * 30)} ${f1(hy - uy * 30)} L${f1(ex)} ${f1(ey)}`;
    return `<path d="${d}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${d}" stroke="${C.woodL}" stroke-width="3" stroke-linecap="round"/>` + flame(ex, ey + 4, 0.4);
  }
  function ghostArt(lv) {
    const next = lampAt(Math.min(19, Math.max(0, lv))), gx = 196, gy = 470;
    return `<g transform="translate(${gx} ${gy})">${ghostBody()}</g>` + pole(gx + 72, gy - 110, next);
  }
  const passLive = (lv) => {
    const glow = []; for (let i = 0; i < Math.min(20, lv); i++) { const [x, y] = lampAt(i); glow.push(`<circle style="animation-delay:${f1(-i * 0.37)}s" cx="${f1(x)}" cy="${f1(y + 11)}" r="19" fill="url(#hnGlow)"/>`); }
    return [
      { cls: 'hwn-bob', box: [140, 150, 360, 380], svg: ghostArt(lv) },
      ...(glow.length ? [{ cls: 'hwn-tw2', box: [40, 150, 440, 330], svg: glow.join('') }] : []),
    ];
  };

  /* ===================== МЕСТО В ГОРОДЕ ===================== */
  // в координатах холста (до масштаба): где кликать, куда идти, препятствия (эллипсы основания)
  const SHAPE = {
    hwshop: { cx: SHOP_CX, hit: [40, 490, 96, 506], door: [250, 548], obst: [[250, 486, 128, 24], [72, 498, 18, 9], [434, 496, 46, 12]], box: [0, 60, 520, 470] },
    hwpass: { cx: PASS_CX, hit: [36, 484, 58, 506], door: [292, 548], obst: [[60, 492, 22, 12], [460, 492, 22, 12], [196, 494, 42, 12]], box: [0, 50, 520, 480] },
  };
  const META = {
    hwshop: { title: 'Ступа сладостей', sub: 'обмен конфет из Изнанки', icon: '🍬' },
    hwpass: { title: 'Призрачный Фонарщик', sub: 'хэллоуинский баттл-пасс', icon: '🏮' },
  };
  const S_BASE = 0.62;
  const WEBCAM = { x: 1516, y: 840, w: 384, h: 216 };   // правый нижний угол оверлея
  // вид оверлея по умолчанию (ovcity.js camHome): камера zb = 0,98, верх 170, центр по x - homeX
  const camView = (homeX) => { const z = Math.min(1, 1080 / 1100), x = homeX - 1920 / z / 2; return { x, y: 170, z }; };
  function inWebcam(rect, homeX) {
    const v = camView(homeX), wx0 = v.x + WEBCAM.x / v.z, wy0 = v.y + WEBCAM.y / v.z, wx1 = wx0 + WEBCAM.w / v.z, wy1 = wy0 + WEBCAM.h / v.z;
    return rect[0] < wx1 && rect[1] > wx0 && rect[2] < wy1 && rect[3] > wy0;
  }
  function obstOf(id, x, y, s) { const H = SHAPE[id]; return H.obst.map(([ox, oy, rx, ry]) => ({ e: [f1(x + (ox - H.cx) * s), f1(y + (oy - GROUND) * s), f1(rx * s), f1(ry * s)], hwnpc: id })); }
  /** Всё для места: building (как BUILDINGS: id, title, sub, icon, hit, door, hw), obst, prop (предмет по глубине), live (живые слои).
      o: { lv - горящих фонарей (0…20, без него - все), shopTitle, still - без живых слоёв (всё в одной картинке) } */
  function geo(sp, o) {
    o = o || {};
    const H = SHAPE[sp.id], s = sp.s || S_BASE, M = META[sp.id], tx = (cx) => f1(sp.x + (cx - H.cx) * s), ty = (cy) => f1(sp.y + (cy - GROUND) * s);
    const title = sp.id === 'hwshop' && o.shopTitle ? o.shopTitle : M.title;
    const building = { id: sp.id, title, sub: M.sub, icon: M.icon, hw: true, hit: [tx(H.hit[0]), tx(H.hit[1]), ty(H.hit[2]), ty(H.hit[3])], door: { x: tx(H.door[0]), y: ty(H.door[1]) }, tag: [f1(sp.x), ty(H.hit[2]) - 6] };
    const lv = Math.max(0, Math.min(20, o.lv == null ? 20 : +o.lv || 0));
    const L0 = sp.id === 'hwshop' ? stupaLive() : passLive(lv);
    // o.still (оверлей: город на Pixi без живых слоёв) - живое впечатано в картинку неподвижно (призрак Фонарщика, огоньки)
    const art = (sp.id === 'hwshop' ? stupaArt(title) : archArt(lv)) + (o.still ? L0.map((l) => l.svg).join('') : '');
    const [bx, by, bw, bh] = H.box, wrap = (inner, b) => `<svg x="${tx(b[0])}" y="${ty(b[1])}" width="${f1(b[2] * s)}" height="${f1(b[3] * s)}" viewBox="${b[0]} ${b[1]} ${b[2]} ${b[3]}" overflow="visible">${DEFS}${inner}</svg>`;
    const prop = { x: tx(bx), y: ty(by), w: f1(bw * s), h: f1(bh * s), z: Math.round(sp.y), svg: () => `<g data-ol="${sp.id}">${wrap(art, H.box)}</g>` };
    const live = (o.still ? [] : L0).map((l) => ({ x: tx(l.box[0]), y: ty(l.box[1]), w: f1(l.box[2] * s), h: f1(l.box[3] * s), z: Math.round(sp.y) + 1, cls: l.cls,
      svg: `<svg width="100%" height="100%" viewBox="${l.box.join(' ')}" overflow="visible">${DEFS}${l.svg}</svg>` }));
    return { building, obst: obstOf(sp.id, sp.x, sp.y, s), prop, live };
  }
  /* ===================== ОКНА НА САЙТЕ (клик по НПС) ===================== */
  /* open(id, W): W = { hero() - герой сайта (hw: { c - конфет, p - уровень пасса, x - набрано за ивент }), data - { shop, pass } с сервера
     (раздел fair.hw: ctx.bus.hollow.shopList / passList), D - MDDoodle (человечек в обновке), login, toast }. Окно - поверх города,
     на телефоне - на весь экран. Чего нет с сервера - пишем «пока нет», механику не выдумываем. */
  const LOOK_FIELD = { hats: 'hat', acc: 'acc', eyes: 'eyes', colors: 'color', auras: 'aura' };
  const KIND_NAME = { hat: 'шапка', acc: 'украшение', eyes: 'глаза', color: 'цвет', aura: 'аура', item: 'предмет', candy: 'конфеты' };
  const lookOf = (field, id) => (field === 'acc' ? { acc: [id] } : { [field]: id });
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const LINES = {
    shopHi: ['Ох, свеженький! Конфеты принёс? Меняю на чудеса!', 'Заходи, не бойся - ступа не кусается. Почти.', 'Конфеты - мне, обновки - тебе. Честный обмен, хи-хи!', 'Тыквенная Луна взошла - самое время приодеться!'],
    shopBuy: ['Ах, какой выбор! Носи на здоровье, хи-хи!', 'Отличный глаз! Это я сама шила при свете Луны.', 'Забирай, пока Джек не увидел!'],
    shopSwap: ['Монетки звенят, конфетки тают - хи-хи!', 'Менять конфеты на звонкую монету? Давай-давай!', 'Монеты - они скучные, но кошельку нравятся.'],
    shopNo: ['Ой, конфет маловато: нужно ещё {n}. Загляни в Изнанку!', 'Не-не, в долг не меняю. Не хватает: {n}.', 'Карманы пустоваты - принеси ещё {n}.'],
    passHi: ['Добрый вечер! Каждая конфета из Изнанки - искра для моих огоньков.', 'Собирай конфеты - а я зажгу тебе огонёк за огоньком.', 'Двадцать огней на моей гирлянде. Сколько зажжёшь ты?'],
    passNext: ['Ещё {n} - и зажгу {lv}-й огонёк. Там тебя ждёт {r}.', 'До награды {r} осталось собрать {n}. Огонь уже на кончике шеста!'],
    passDone: ['Все двадцать огней горят! Такого света на улице давно не было.'],
    passZero: ['Ни одного огонька пока... Сходи в Изнанку - там конфеты на каждом шагу.'],
  };
  const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };
  const cnd = (n) => `${n} ${plural(n, 'конфета', 'конфеты', 'конфет')}`;
  const cnm = (n) => `${n} ${plural(n, 'монета', 'монеты', 'монет')}`;
  // 29.10: курс обмена конфет на монеты (монет за конфету) может быть дробным (1,5): меняется кратное шагу число конфет (шаг - наименьшее число
  // конфет, дающее целые монеты: курс 1,5 - шаг 2, «2 🍬 = 3 монеты»); остаток остаётся у игрока. Та же арифметика, что у сервера (halloween/index.js swapPlan)
  const swapStep = (rate) => { for (let s = 1; s <= 100; s++) { const c = s * rate; if (Math.abs(c - Math.round(c)) < 1e-9) return s; } return 1; };
  const swapPlan = (n, rate) => { const st = swapStep(rate), spend = Math.floor(Math.max(0, n) / st) * st; return { step: st, spend, coins: Math.floor(spend * rate + 1e-9) }; };
  const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  // маленькие рисунки наград (viewBox -50 -50 100 100); символы и градиенты - один раз на окно (svg.hwn-defs)
  const art = {
    candy: (n) => `<svg viewBox="-50 -50 100 100" aria-hidden="true">${candy(-18, 8, C.candy[0], -20, 1.25)}${candy(18, 12, C.candy[1], 16, 1.25)}${candy(0, -14, C.candy[2], 4, 1.35)}${n > 5 ? candy(-4, 28, C.candy[3], -8, 1.2) : ''}</svg>`,
    candy_apple: () => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M2 -14 L10 -46" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M2 -14 L10 -46" stroke="${C.woodL}" stroke-width="4" stroke-linecap="round"/><path d="M-30 6 Q-34 -22 -8 -20 Q0 -16 8 -20 Q34 -22 30 6 Q26 32 0 34 Q-26 32 -30 6 Z" fill="#e8344a" ${O(3.4)}/><path d="M-30 6 Q-26 18 -20 14 Q-12 22 -4 14 Q4 24 12 14 Q20 22 30 6 Q26 32 0 34 Q-26 32 -30 6 Z" fill="#a8641a" ${O(2.6)}/><path d="M-20 -10 q4 -6 12 -6" stroke="#fff" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/></svg>`,
    witch_brew: () => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><rect x="-9" y="-44" width="18" height="12" rx="3" fill="${C.woodL}" ${O(2.6)}/><path d="M-7 -32 V-18 Q-30 -8 -30 14 Q-30 40 0 40 Q30 40 30 14 Q30 -8 7 -18 V-32 Z" fill="#dff6ff" fill-opacity=".4" ${O(3.4)}/><path d="M-26 8 Q0 0 26 8 Q28 36 0 36 Q-28 36 -26 8 Z" fill="${'#6dffb0'}"/><circle cx="-8" cy="18" r="4" fill="#c8ffe4"/><circle cx="8" cy="10" r="3" fill="#c8ffe4"/><path d="M-20 -2 q-4 14 0 26" stroke="#fff" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/></svg>`,
    // 29.10 (feat/hw-candy): картинки остальных вещей обменника
    hw_potion: () => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><rect x="-9" y="-44" width="18" height="12" rx="3" fill="${C.woodL}" ${O(2.6)}/><path d="M-7 -32 V-18 Q-30 -8 -30 14 Q-30 40 0 40 Q30 40 30 14 Q30 -8 7 -18 V-32 Z" fill="#dff6ff" fill-opacity=".4" ${O(3.4)}/><path d="M-26 8 Q0 0 26 8 Q28 36 0 36 Q-28 36 -26 8 Z" fill="#b98aff"/><circle cx="-8" cy="18" r="4" fill="#e6d4ff"/><circle cx="8" cy="10" r="3" fill="#e6d4ff"/><path d="M0 -4 q6 -8 0 -14 q-6 -6 0 -12" stroke="#b98aff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></svg>`,
    scarecrow_fork: () => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M0 44 V-6" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M0 44 V-6" stroke="${C.woodL}" stroke-width="5" stroke-linecap="round"/><path d="M-20 -40 V-14 Q-20 -4 0 -4 Q20 -4 20 -14 V-40 M0 -44 V-4" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M-20 -40 V-14 Q-20 -4 0 -4 Q20 -4 20 -14 V-40 M0 -44 V-4" fill="none" stroke="#c8c2d8" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M-6 6 l-10 8 M-4 12 l-12 4 M6 6 l10 8" stroke="#e8c85a" stroke-width="3" stroke-linecap="round"/></svg>`,
    bat_cloak: () => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-12 -34 Q-44 -30 -46 -6 L-34 -10 L-28 8 L-20 0 L-14 20 L0 36 L14 20 L20 0 L28 8 L34 -10 L46 -6 Q44 -30 12 -34 Q0 -28 -12 -34 Z" fill="${C.vio}" ${O(3.4)}/><path d="M-12 -34 Q0 -28 12 -34 Q0 -22 -12 -34 Z" fill="${C.vioL}" ${O(2.4)}/><circle cx="-5" cy="-24" r="3" fill="${C.gold}" ${O(1.6)}/><circle cx="5" cy="-24" r="3" fill="${C.gold}" ${O(1.6)}/><path d="M0 -20 V30" stroke="${C.vioD}" stroke-width="3" opacity=".7"/></svg>`,
    witch_broom: () => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-40 -30 L18 22" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-40 -30 L18 22" stroke="${C.woodL}" stroke-width="5" stroke-linecap="round"/><path d="M12 10 L38 4 L46 30 L22 40 Z" fill="${C.gold}" ${O(3.2)}/><path d="M20 16 L40 12 M24 26 L44 22 M27 34 L45 30" stroke="${C.goldD}" stroke-width="2.6" stroke-linecap="round"/><path d="M10 14 L24 30" stroke="${C.wood}" stroke-width="5" stroke-linecap="round"/></svg>`,
    lock: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="9" width="14" height="10" rx="2" fill="#5a5470" stroke="${INK}" stroke-width="1.6"/><path d="M6 9 V6 a4 4 0 0 1 8 0 V9" fill="none" stroke="#5a5470" stroke-width="2.6"/></svg>`,
    candyIco: `<svg viewBox="-24 -14 48 28" aria-hidden="true">${candy(0, 0, C.candy[0], -10, 1)}</svg>`,
    lampOn: `<svg viewBox="-16 -10 32 40" aria-hidden="true"><use href="#hnLampOn"/></svg>`,
    lampOff: `<svg viewBox="-16 -10 32 40" aria-hidden="true"><use href="#hnLampOff"/></svg>`,
  };
  // человечек зрителя в обновке (MDDoodle) - как вещи в обменнике Ярмарки (portal.js itemCard)
  function doodle(W, look) {
    try {
      const D = W.D; if (!D || !D.jDoodle) return '';
      const h = W.hero && W.hero(), base = h && h.look && typeof h.look === 'object' ? h.look : {};
      const seed = D.jhash ? D.jhash(W.login ? W.login() || 'hw' : 'hw') : 7;
      // картинкой (<img> c SVG внутри): один узел страницы вместо сотни - окно не тяжелее интерьера «Лавки звездочёта»
      let svg = D.jDoodle(seed, 'happy', false, {}, { ...base, ...look });
      if (!/xmlns=/.test(svg)) svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      return `<img class="hwn-dd" alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
    } catch (e) { return ''; }
  }
  // картинка вещи обменника / награды пасса
  function goodsPic(W, g) {
    if (g.candy) return art.candy(g.candy);
    if (g.item) return (art[g.item] || art.candy_apple)();
    if (g.look) return doodle(W, g.look) || art.candy(0);
    return '';
  }
  const ci = () => `<i class="hwn-ci">${art.candyIco}</i>`;
  const hwOf = (W) => { const h = W.hero && W.hero(); return (h && h.hw) || null; };

  // --- окно «Ступы сладостей» ---
  function witchHead() { return `<svg class="hwn-wt" viewBox="-80 -330 175 340" aria-hidden="true">${witch(0, 0, 1)}</svg>`; }
  // 29.10 (feat/hw-candy): пункт «Обмен конфет на монеты» - 100 / 500 / все и своё число; курс (монет за конфету) шлёт сервер (раздел fair.hw.swap)
  function swapHtml(W, have) {
    const sw = W.data && W.data.swap, rate = sw && +sw.rate > 0 ? +sw.rate : 0; if (!rate) return '';
    const steps = (sw.steps && sw.steps.length ? sw.steps : [100, 500]).map((n) => +n).filter((n) => n > 0), st = swapStep(rate);
    const b = (n, label) => `<button type="button" class="hwn-xcb${have != null && n > have ? ' hwn-lack' : ''}" data-n="${n}"><span class="hwn-xcn">${label}</span><span class="hwn-xcc">${cnm(swapPlan(n, rate).coins)}</span></button>`;
    return `<section class="hwn-xc" aria-label="Обмен конфет на монеты"><div class="hwn-xct"><b>Обмен конфет на монеты</b><span>${st} ${art.candyIco} = ${cnm(Math.round(st * rate))}. ${st > 1 ? 'Меняется чётное число конфет - лишняя остаётся у тебя. ' : ''}Уровень пропуска не падает - он считается по всем собранным конфетам.</span></div>`
      + `<div class="hwn-xcr">${steps.map((n) => b(n, n)).join('')}<button type="button" class="hwn-xcb hwn-xcall${swapPlan(have || 0, rate).coins ? '' : ' hwn-lack'}" data-all="1"><span class="hwn-xcn">все</span><span class="hwn-xcc">${have == null ? '' : cnm(swapPlan(have, rate).coins)}</span></button>`
      + `<label class="hwn-xcf"><input type="number" min="1" step="1" inputmode="numeric" class="hwn-xci" placeholder="сколько" aria-label="Сколько конфет обменять"><button type="button" class="hwn-xcb hwn-xcgo">Обменять</button></label></div></section>`;
  }
  function shopHtml(W, title) {
    const hw = hwOf(W), have = hw ? +hw.c || 0 : null, list = (W.data && W.data.shop) || [];
    const cards = list.map((it) => {
      const g = it.kind === 'item' ? { item: it.item } : { look: it.look || lookOf(String(it.field || 'hat'), it.id) };
      const kind = it.kind === 'item' ? 'item' : it.field, lack = have == null ? 0 : Math.max(0, it.price - have);
      return `<li class="hwn-g${lack ? ' hwn-lack' : ''}"><b class="hwn-n">${it.n}</b><div class="hwn-pic">${goodsPic(W, g)}</div><div class="hwn-nm">${esc(it.name || it.id || it.item || '')}</div><div class="hwn-kd">${esc(KIND_NAME[kind] || '')}</div>`
        + `<button type="button" class="hwn-buy" data-n="${it.n}" data-p="${it.price}"><span class="hwn-pr">${art.candyIco}${it.price}</span><span class="hwn-t">${lack ? `не хватает ${lack}` : 'Обменять'}</span></button></li>`;
    }).join('');
    return `<div class="hwn-hd hwn-shophd"><div class="hwn-por">${witchHead()}</div><div class="hwn-tt"><h2 class="hwn-title">${esc(title)}</h2><p class="hwn-say" aria-live="polite">${esc(pick(LINES.shopHi))}</p></div>`
      + `<div class="hwn-wallet"><span class="hwn-l">у тебя</span><span class="hwn-v">${art.candyIco}<b>${have == null ? '-' : have}</b></span><span class="hwn-s">${hw ? `собрано за ивент: ${+hw.x || 0}` : 'конфеты придут с сервера в дни ивента'}</span></div></div>`
      + swapHtml(W, have)
      + (cards ? `<ul class="hwn-grid">${cards}</ul>` : `<p class="hwn-empty">Товар обменника появится в дни ивента.</p>`)
      + `<p class="hwn-foot">Конфеты собирают в Изнанке - походе «Ночи Тыквенной Луны». После ивента остаток конфет обменяется на монеты.</p>`;
  }
  // --- окно Призрачного Фонарщика: гирлянда 20 огней над ночной улицей, призрак зажигает следующий ---
  function garland(lv) {
    const X0 = 70, X1 = 930, Y0 = 76, SAG = 70, pos = (i) => { const t = i / 19, x = X0 + (X1 - X0) * t; return [x, Y0 + 4 * SAG * t * (1 - t) + 14]; };
    let s = `<defs><linearGradient id="hnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a30"/><stop offset="1" stop-color="#2a3150"/></linearGradient></defs>`;
    s += `<rect width="1000" height="300" fill="url(#hnSky)"/><circle cx="800" cy="40" r="26" fill="#e9ecf4" opacity=".9"/><circle cx="791" cy="34" r="26" fill="#121a30" opacity=".35"/>`;
    // пепел и лозы холодного мира (неподвижно), силуэты домов
    s += [[120, 40], [260, 110], [410, 30], [560, 96], [700, 24], [790, 140], [330, 180], [610, 200], [940, 180]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#9aa4bc" opacity=".55"/>`).join('');
    s += `<path d="M0 300 V214 h70 v-34 l40 -30 l40 30 v34 h60 v-60 h70 v60 h90 v-24 l50 -34 l50 34 v24 h110 v-50 h60 v50 h80 v-40 l46 -30 l46 30 v40 h84 V300 Z" fill="#1b2136" stroke="#0d1222" stroke-width="3"/>`;
    s += `<path d="M0 300 V262 Q500 246 1000 262 V300 Z" fill="#232a42"/>`;
    s += `<path d="M30 300 Q22 250 44 214 Q60 190 50 160 M970 300 Q980 246 958 214 Q944 190 956 156" stroke="#2f5a46" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    // столбы и верёвка
    for (const x of [X0 - 30, X1 + 30]) s += `<rect x="${x - 7}" y="${Y0 - 14}" width="14" height="${262 - Y0 + 14}" rx="3" fill="${C.iron}" ${O(3)}/><circle cx="${x}" cy="${Y0 - 16}" r="9" fill="${C.pump}" ${O(2.6)}/>`;
    let rope = `M${X0 - 30} ${Y0}`; for (let i = 0; i <= 19; i++) { const [x, y] = pos(i); rope += ` L${f1(x)} ${f1(y - 14)}`; } rope += ` L${X1 + 30} ${Y0}`;
    s += `<path d="${rope}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    for (let i = 0; i < 20; i++) {
      const [x, y] = pos(i), on = i < lv;
      s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(1.25)"><use href="#${on ? 'hnLampOn' : 'hnLampOff'}"/></g>`;
      s += `<text x="${f1(x)}" y="${f1(y + 50)}" text-anchor="middle" font-family="'Russo One',sans-serif" font-size="15" fill="${on ? C.pumpL : '#7d84a0'}" stroke="${INK}" stroke-width="4" paint-order="stroke">${i + 1}</text>`;
    }
    // призрак: внизу, у следующего огня (или посредине, когда горят все)
    const n = Math.min(19, lv), [nx, ny] = pos(n), gs = 0.56;
    let gx = nx - 96, flip = 1; if (gx < 80) { gx = nx + 96; flip = -1; } if (lv >= 20) { gx = 500; flip = 1; }
    const gy = 262, hx = gx + 72 * gs * flip, hy = gy - 110 * gs;
    const ghost = `<g transform="translate(${f1(gx)} ${gy}) scale(${f1(gs * flip * 100) / 100} ${gs})">${ghostBody()}</g>` + (lv < 20 ? pole(hx, hy, [nx, ny + 10]) : '');
    return { svg: s, ghost, next: lv < 20 ? `<circle cx="${f1(nx)}" cy="${f1(ny + 12)}" r="26" fill="url(#hnGlow)"/>` : '' };
  }
  function passHtml(W) {
    const hw = hwOf(W), P = (W.data && W.data.pass) || [], lv = hw ? Math.max(0, Math.min(20, +hw.p || 0)) : 0, x = hw ? +hw.x || 0 : 0;
    const next = P.find((s) => s.lv === lv + 1) || null, prevNeed = lv > 0 ? ((P.find((s) => s.lv === lv) || {}).need || 0) : 0;
    const need = next ? next.need : prevNeed, left = next ? Math.max(0, need - x) : 0, pct = next ? Math.max(0, Math.min(100, ((x - prevNeed) / Math.max(1, need - prevNeed)) * 100)) : 100;
    const G = garland(lv);
    const say = !hw ? pick(LINES.passHi) : lv >= 20 ? LINES.passDone[0] : lv === 0 && x === 0 ? LINES.passZero[0] : next ? fill(pick(LINES.passNext), { n: cnd(left), lv: lv + 1, r: /«/.test(next.name) ? next.name : `«${next.name}»` }) : pick(LINES.passHi);
    const rw = (s) => { const r = s.reward || {}; return r.candy ? { candy: r.candy } : r.item ? { item: r.item } : r.look ? { look: lookOf(LOOK_FIELD[r.look[0]] || r.look[0], r.look[1]) } : {}; };
    const kindOf = (s) => { const r = s.reward || {}; return r.candy ? 'candy' : r.item ? 'item' : r.look ? LOOK_FIELD[r.look[0]] : ''; };
    const cards = P.map((s) => {
      const st = s.lv <= lv ? 'got' : s.lv === lv + 1 ? 'next' : 'lock';
      return `<li class="hwn-r hwn-${st}"><span class="hwn-lamp">${st === 'got' ? art.lampOn : art.lampOff}<b>${s.lv}</b></span><div class="hwn-pic">${goodsPic(W, rw(s))}</div><div class="hwn-nm">${esc(s.name)}</div>`
        + `<div class="hwn-kd">${st === 'got' ? '✓ получено' : st === 'next' ? 'следующая' : `${art.lock} ${s.need}${ci()}`}</div></li>`;
    }).join('');
    const spot = next ? `<div class="hwn-next"><div class="hwn-pic">${goodsPic(W, rw(next))}</div><div><span class="hwn-l">следующий огонёк - ${next.lv}-й</span><b>${esc(next.name)}</b><span class="hwn-s">${esc(KIND_NAME[kindOf(next)] || '')}</span></div></div>`
      : `<div class="hwn-next hwn-done"><div><span class="hwn-l">гирлянда</span><b>${lv >= 20 ? 'Все 20 огней горят!' : 'Шкала придёт с сервера в дни ивента'}</b></div></div>`;
    return `<div class="hwn-sw"><h2 class="hwn-title hwn-onscene">Призрачный Фонарщик</h2><div class="hwn-scene"><svg viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${G.svg}<g class="hwn-ember">${G.next}</g><g class="hwn-gh">${G.ghost}</g></svg></div></div>`
      + `<div class="hwn-ps"><div class="hwn-lv"><span class="hwn-l">огней</span><b>${lv}</b><span class="hwn-s">из 20</span></div>`
      + `<div class="hwn-prog"><p class="hwn-say" aria-live="polite">${esc(say)}</p>`
      + `<div class="hwn-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${f1(pct)}%"></i></div>`
      + `<div class="hwn-bl"><span>${hw ? `собрано за ивент: <b>${x}</b>${ci()}` : 'конфеты придут с сервера в дни ивента'}</span><span>${next ? `до ${next.lv}-го огня: ещё <b>${left}</b>${ci()}` : lv >= 20 ? 'пасс пройден' : ''}</span></div></div>${spot}</div>`
      + (cards ? `<ul class="hwn-rw">${cards}</ul>` : `<p class="hwn-empty">Награды пасса появятся в дни ивента.</p>`)
      + `<p class="hwn-foot">Огоньки зажигаются сами: уровень пасса растёт от конфет, собранных в Изнанке (потраченные в «Ступе сладостей» не уменьшают его).</p>`;
  }
  const WIN_CSS = `.hwn-back{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,8,20,.72)}
.hwn-win{position:relative;width:min(1060px,100%);max-height:calc(100vh - 32px);overflow:auto;border-radius:18px;background:linear-gradient(180deg,#1f1938,#141026 60%);border:3px solid #34295c;box-shadow:0 18px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);color:#ece6f6;text-align:left}
.hwn-x{position:absolute;top:10px;right:10px;z-index:3;width:40px;height:40px;border-radius:50%;border:2px solid #4a3d7a;background:#241c40;color:#fff;font-size:22px;line-height:1;cursor:pointer}
.hwn-x:hover,.hwn-x:focus-visible{background:#3a2c66;outline:2px solid #ffb347;outline-offset:2px}
.hwn-title{margin:0;font-family:'Russo One',sans-serif;font-size:28px;letter-spacing:1px;color:#ffb347;text-shadow:0 3px 0 #1c1424,0 0 18px rgba(255,122,26,.35)}
.hwn-say{position:relative;margin:10px 0 0;padding:10px 14px;border-radius:14px;background:#f3e6c8;color:#2a1c34;font-size:15px;line-height:1.35;border:2px solid #1c1424}
.hwn-hd{display:grid;grid-template-columns:150px 1fr 190px;gap:16px;align-items:center;padding:14px 64px 14px 18px;background:radial-gradient(120% 160% at 10% 0%,rgba(155,110,240,.35),transparent 60%),radial-gradient(80% 120% at 100% 100%,rgba(255,122,26,.18),transparent 60%);border-bottom:2px solid #2c2450}
.hwn-por{height:170px;display:flex;align-items:flex-end;justify-content:center}.hwn-wt{height:180px;width:auto;overflow:visible}
.hwn-shophd .hwn-say::before{content:'';position:absolute;left:-12px;top:18px;border:8px solid transparent;border-right:12px solid #1c1424}
.hwn-wallet{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px;border-radius:14px;background:#120e24;border:3px solid #ffc94d;box-shadow:0 0 22px rgba(255,201,77,.18)}
.hwn-wallet .hwn-l{font-size:13px;color:#b8acd4}.hwn-wallet .hwn-v{display:flex;align-items:center;gap:6px}.hwn-wallet .hwn-v svg{width:44px;height:26px}.hwn-wallet b{font-family:'Russo One',sans-serif;font-size:34px;color:#ffc94d}.hwn-wallet .hwn-s{font-size:12px;color:#8f86aa;text-align:center}
.hwn-xc{margin:14px 16px 0;padding:12px 14px;border-radius:14px;background:linear-gradient(180deg,#2d2250,#1d1734);border:2px solid #ffc94d;display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px}
.hwn-xct{flex:1 1 260px;display:flex;flex-direction:column;gap:2px}.hwn-xct b{font-family:'Russo One',sans-serif;font-size:17px;color:#ffc94d}.hwn-xct span{font-size:12px;color:#b8acd4;line-height:1.3}.hwn-xct svg{width:22px;height:13px;vertical-align:-2px}
.hwn-xcr{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}.hwn-xcf{display:flex;gap:6px}
.hwn-xcb{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:64px;min-height:44px;padding:6px 12px;border-radius:12px;border:2px solid #1c1424;background:linear-gradient(180deg,#ffd34d,#e8a61a);color:#1c1424;cursor:pointer;box-shadow:0 3px 0 #1c1424;font:inherit}
.hwn-xcb:hover,.hwn-xcb:focus-visible{background:linear-gradient(180deg,#ffe07a,#f0b020);outline:2px solid #ffe08a;outline-offset:2px}.hwn-xcb:active{transform:translateY(2px);box-shadow:0 1px 0 #1c1424}
.hwn-xcn{font-family:'Russo One',sans-serif;font-size:17px}.hwn-xcc{font-size:11px;font-weight:700}
.hwn-cf{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,6,24,.72)}
.hwn-cfb{width:min(420px,100%);padding:18px 18px 16px;border-radius:16px;background:linear-gradient(180deg,#2d2250,#1d1734);border:3px solid #ffc94d;color:#f3e6c8;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.6)}
.hwn-cfb p{margin:0 0 14px;font-size:18px;line-height:1.35}.hwn-cfb svg{width:30px;height:18px;vertical-align:-3px}.hwn-cfb b{color:#ffc94d;font-family:'Russo One',sans-serif}
.hwn-cfr{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.hwn-cfr .hwn-xcb{min-width:120px;font-family:'Russo One',sans-serif;font-size:16px}.hwn-cfn{background:linear-gradient(180deg,#5a5278,#3a3450)!important;color:#f3e6c8!important}.hwn-xcb:disabled,.hwn-buy:disabled{opacity:.6;cursor:default}
.hwn-xcb.hwn-lack{background:#3a3450;color:#a49cbc;box-shadow:0 3px 0 #120e24}
.hwn-xci{width:128px;min-height:44px;box-sizing:border-box;padding:4px 8px;border-radius:12px;border:2px solid #3a2e66;background:#120e24;color:#f3e6c8;font:inherit;font-size:16px}.hwn-xci:focus-visible{outline:2px solid #ffe08a;outline-offset:2px}
.hwn-grid{list-style:none;margin:0;padding:16px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.hwn-g{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px 10px;border-radius:14px;background:linear-gradient(180deg,#2a2148,#1d1734);border:2px solid #3a2e66}
.hwn-g .hwn-n{position:absolute;left:8px;top:6px;font-family:'Russo One',sans-serif;font-size:13px;color:#ffb347}
.hwn-g .hwn-pic,.hwn-r .hwn-pic,.hwn-next .hwn-pic{width:112px;height:112px;display:flex;align-items:center;justify-content:center;background:radial-gradient(closest-side,rgba(255,179,71,.22),transparent)}
.hwn-g .hwn-pic svg,.hwn-r .hwn-pic svg,.hwn-next .hwn-pic svg,.hwn-pic img{width:100%;height:100%;overflow:visible}
.hwn-g .hwn-nm,.hwn-r .hwn-nm{font-size:13px;font-weight:600;text-align:center;line-height:1.2;min-height:32px;display:flex;align-items:center}
.hwn-g .hwn-kd,.hwn-r .hwn-kd{font-size:11px;color:#9a90b8}
.hwn-buy{margin-top:4px;width:100%;display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 4px;border-radius:12px;border:2px solid #1c1424;background:linear-gradient(180deg,#ff9a3a,#e8661a);color:#1c1424;cursor:pointer;box-shadow:0 3px 0 #1c1424}
.hwn-buy:hover,.hwn-buy:focus-visible{background:linear-gradient(180deg,#ffb04a,#f07020);outline:2px solid #ffe08a;outline-offset:2px}.hwn-buy:active{transform:translateY(2px);box-shadow:0 1px 0 #1c1424}
.hwn-buy .hwn-pr{display:flex;align-items:center;gap:3px;font-family:'Russo One',sans-serif;font-size:16px}.hwn-buy .hwn-pr svg{width:24px;height:14px}.hwn-buy .hwn-t{font-size:11px;font-weight:700}
.hwn-g.hwn-lack .hwn-buy{background:#3a3450;color:#a49cbc;box-shadow:0 3px 0 #120e24}.hwn-g.hwn-lack .hwn-pic{opacity:.75}
.hwn-foot,.hwn-empty{margin:0;padding:0 18px 16px;font-size:12.5px;color:#8f86aa}.hwn-empty{padding:24px 18px;font-size:15px;color:#c8bedf}
.hwn-scene{position:relative;aspect-ratio:10/3;background:#121a30;overflow:hidden;border-bottom:3px solid #2c2450}.hwn-scene>svg{position:absolute;inset:0;width:100%;height:100%}
.hwn-sw{position:relative}.hwn-onscene{position:absolute;z-index:1;left:50%;top:10px;transform:translateX(-50%);white-space:nowrap;font-size:24px;padding:4px 18px 6px;border-radius:12px;background:rgba(18,14,36,.82);border:2px solid #ffc94d}
.hwn-ci{display:inline-flex;vertical-align:-2px;margin-left:3px}.hwn-ci svg{width:20px;height:12px}
.hwn-gh{animation:hwnBob 3.2s ease-in-out infinite}.hwn-ember{animation:hwnTw 1.6s ease-in-out infinite}
.hwn-ps{display:grid;grid-template-columns:110px 1fr 300px;gap:16px;align-items:center;padding:16px 18px}
.hwn-lv{display:flex;flex-direction:column;align-items:center;justify-content:center;width:104px;height:104px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#ffcf7a,#ff7a1a 60%,#a8400e);border:4px solid #1c1424;box-shadow:0 0 30px rgba(255,140,40,.45);color:#1c1424}
.hwn-lv b{font-family:'Russo One',sans-serif;font-size:40px;line-height:1}.hwn-lv .hwn-l,.hwn-lv .hwn-s{font-size:12px;font-weight:700}
.hwn-prog .hwn-say{margin:0 0 10px}.hwn-ps .hwn-say::before{content:'';position:absolute;left:30px;top:-14px;border:7px solid transparent;border-bottom:12px solid #1c1424}
.hwn-bar{height:16px;border-radius:9px;background:#120e24;border:2px solid #1c1424;box-shadow:inset 0 2px 0 rgba(0,0,0,.4);overflow:hidden}.hwn-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff7a1a,#ffc94d);border-radius:7px}
.hwn-bl{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 10px;margin-top:6px;font-size:13px;color:#b8acd4}.hwn-bl span{white-space:nowrap}.hwn-bl b{color:#ffc94d}
.hwn-next{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:linear-gradient(180deg,#3a2a18,#22182a);border:3px solid #ff9a3a;box-shadow:0 0 24px rgba(255,140,40,.25)}
.hwn-next .hwn-l{display:block;font-size:12px;color:#ffcf9a}.hwn-next b{display:block;font-size:17px;margin:2px 0}.hwn-next .hwn-s{font-size:12px;color:#c8bedf}.hwn-next.hwn-done{justify-content:center;text-align:center;min-height:80px}
.hwn-rw{list-style:none;margin:0;padding:0 16px 16px;display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:8px}
.hwn-r{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:26px 4px 8px;border-radius:12px;background:#1d1734;border:2px solid #2e2650}
.hwn-r .hwn-lamp{position:absolute;top:-2px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:2px}.hwn-r .hwn-lamp svg{width:18px;height:24px}.hwn-r .hwn-lamp b{font-family:'Russo One',sans-serif;font-size:13px;color:#7d84a0}
.hwn-r .hwn-pic{width:76px;height:80px}.hwn-next .hwn-pic{width:92px;height:92px}.hwn-r .hwn-nm{font-size:11.5px;min-height:28px}.hwn-r .hwn-kd{font-size:10.5px;display:flex;align-items:center;gap:2px}.hwn-r .hwn-kd svg{width:11px;height:11px}
.hwn-r.hwn-got{background:linear-gradient(180deg,#3a2a1c,#241a2a);border-color:#c8701a}.hwn-r.hwn-got .hwn-lamp b{color:#ffb347}.hwn-r.hwn-got .hwn-kd{color:#9fe8b8}
.hwn-r.hwn-next{border-color:#ffb347;box-shadow:0 0 0 2px #ff7a1a,0 0 18px rgba(255,140,40,.4);background:linear-gradient(180deg,#2e2246,#1d1734)}.hwn-r.hwn-next .hwn-lamp b,.hwn-r.hwn-next .hwn-kd{color:#ffcf7a}
.hwn-r.hwn-lock .hwn-pic,.hwn-r.hwn-lock .hwn-nm{opacity:.5}
.hwn-dd{width:100%;height:100%;object-fit:contain}.hwn-defs{position:absolute;width:0;height:0;overflow:hidden}
@media (max-width:600px){
.hwn-back{padding:0}.hwn-win{width:100%;height:100%;max-height:none;border-radius:0;border:0}
.hwn-x{position:fixed}
.hwn-hd{grid-template-columns:96px 1fr;padding:12px 56px 12px 10px;gap:10px}.hwn-por{height:120px}.hwn-wt{height:128px}.hwn-wallet{grid-column:1/-1;flex-direction:row;justify-content:center;gap:10px;padding:8px}.hwn-wallet b{font-size:26px}
.hwn-title{font-size:21px}.hwn-say{font-size:14px}
.hwn-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px;gap:10px}.hwn-g .hwn-pic{width:88px;height:88px}
.hwn-sw{background:#121a30}.hwn-onscene{position:static;transform:none;display:inline-block;margin:10px 60px 2px 10px;font-size:18px;padding:3px 12px 5px}
.hwn-ps{grid-template-columns:76px 1fr;padding:12px 10px;gap:10px}.hwn-lv{width:76px;height:76px}.hwn-lv b{font-size:28px}.hwn-next{grid-column:1/-1}
.hwn-rw{grid-template-columns:minmax(0,1fr);padding:0 10px 12px;gap:6px}
.hwn-r{flex-direction:row;padding:6px 10px 6px 8px;gap:8px;text-align:left}.hwn-r .hwn-lamp{position:static;transform:none;flex-direction:column;width:26px}.hwn-r .hwn-pic{width:46px;height:52px;flex:none}.hwn-r .hwn-nm{justify-content:flex-start;text-align:left;min-height:0;flex:1}.hwn-r .hwn-kd{margin-left:auto;white-space:nowrap}
}
@media (prefers-reduced-motion:reduce){.hwn-gh,.hwn-ember{animation:none}}`;
  let WIN = null;
  function close() { if (!WIN) return; const w = WIN; WIN = null; try { document.removeEventListener('keydown', w.key, true); w.el.remove(); if (w.back && w.back.focus) w.back.focus(); } catch (e) { /* окна уже нет */ } }
  const swapRateOf = (W) => { const sw = W.data && W.data.swap; return sw && +sw.rate > 0 ? +sw.rate : 0; };
  // сколько конфет у зрителя сейчас: ответ комнаты (el._have) главнее данных героя
  const haveOf = (el, W) => { if (el._have != null) return el._have; const hw = hwOf(W); return Math.max(0, (hw ? +hw.c || 0 : 0) - (el._spent || 0)); };
  // новый остаток: кошелёк, кнопки покупки («не хватает N») и обмена
  function setHave(el, W, v) {
    v = Math.max(0, Math.floor(+v || 0)); el._have = v;
    const wb = el.querySelector('.hwn-wallet b'); if (wb) wb.textContent = String(v);
    for (const b of el.querySelectorAll('.hwn-buy')) { const lack = Math.max(0, (+b.dataset.p || 0) - v), t = b.querySelector('.hwn-t'); b.closest('.hwn-g').classList.toggle('hwn-lack', lack > 0); if (t && !b.disabled) t.textContent = lack ? `не хватает ${lack}` : 'Обменять'; }
    const rate = swapRateOf(W);
    for (const q of el.querySelectorAll('.hwn-xcb[data-n]')) q.classList.toggle('hwn-lack', +q.dataset.n > v);
    const al = el.querySelector('.hwn-xcall'); if (al && rate) { al.classList.toggle('hwn-lack', !swapPlan(v, rate).coins); const c = al.querySelector('.hwn-xcc'); if (c) c.textContent = cnm(swapPlan(v, rate).coins); }
  }
  /** Ответ комнаты на обмен / покупку (app.js, ack hwBuy / hwSwap): обновляет открытое окно. x = { ok, error, x: { op, n, price, left, got, coins, test, fail } } */
  function result(x) {
    const w = WIN; if (!w || !w.el || !x || !x.x) return false;
    const el = w.el, W = w.W, say = el.querySelector('.hwn-say'), r = x.x;
    if (r.op === 'hwBuy') {
      el._pend = 0;
      if (!x.ok) { say.textContent = x.error || 'Не вышло.'; return true; }
      if (r.test) { say.textContent = `Тест: «${r.got || 'вещь'}» - ничего не списано.`; return true; }
      setHave(el, W, r.left); say.textContent = `Готово! «${r.got || 'вещь'}» теперь твоя. Осталось ${cnd(r.left)}.`;
      const bt = el.querySelector(`.hwn-buy[data-n="${r.n}"]`);
      if (bt && !/предмет/.test((bt.closest('.hwn-g').querySelector('.hwn-kd') || {}).textContent || '')) { bt.disabled = true; const t = bt.querySelector('.hwn-t'); if (t) t.textContent = 'уже есть'; }
      return true;
    }
    if (r.op === 'hwSwap') { if (x.ok && r.left != null && !r.test) setHave(el, W, r.left); say.textContent = !x.ok ? (x.error || 'Не вышло.') : r.coins != null ? `Держи: ${cnm(r.coins)}!` : pick(LINES.shopSwap); return true; }
    return false;
  }
  /** Окно НПС: id 'hwshop' | 'hwpass'. */
  function open(id, W) {
    if (typeof document === 'undefined' || !META[id]) return null;
    close();
    if (!document.getElementById('hwnWinCss')) { const st = document.createElement('style'); st.id = 'hwnWinCss'; st.textContent = WIN_CSS + '\n@keyframes hwnTw{0%,100%{opacity:.25}50%{opacity:1}}@keyframes hwnBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}'; document.head.appendChild(st); }
    W = W || {};
    const el = document.createElement('div'); el.className = 'hwn-back'; el.dataset.hwn = id;
    const title = id === 'hwshop' ? (W.shopTitle || META.hwshop.title) : META.hwpass.title;
    el.innerHTML = `<div class="hwn-win hwn-${id === 'hwshop' ? 'shop' : 'pass'}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><svg class="hwn-defs" width="0" height="0" aria-hidden="true" focusable="false">${DEFS}</svg><button type="button" class="hwn-x" aria-label="Закрыть">×</button>${id === 'hwshop' ? shopHtml(W, title) : passHtml(W)}</div>`;
    const back = document.activeElement, key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); const cf = el.querySelector('.hwn-cf'); if (cf) cf.remove(); else close(); } };
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('.hwn-x')) { close(); return; }
      const xb = e.target.closest('.hwn-xcb:not(.hwn-cfy):not(.hwn-cfn)');
      if (xb) {   // 29.10: обмен конфет на монеты
        const left = haveOf(el, W), say0 = el.querySelector('.hwn-say'), rate = swapRateOf(W);
        const inp = el.querySelector('.hwn-xci'), all = !!xb.dataset.all, n0 = all ? left : xb.dataset.n ? +xb.dataset.n : Math.floor(+(inp && inp.value) || 0);
        if (!(n0 >= 1)) { say0.textContent = left < 1 ? 'Конфет нет - нечего менять. Загляни в Изнанку!' : 'Сколько менять-то? Напиши число.'; return; }
        if (n0 > left) { say0.textContent = fill(pick(LINES.shopNo), { n: cnd(n0 - left) }); return; }
        const pl = swapPlan(n0, rate), n = pl.spend;
        if (!(pl.coins >= 1)) { say0.textContent = `Мало: меняю от ${cnd(pl.step)}.`; return; }
        if (!W.swap) { say0.textContent = 'Обмен с сайта пока не открыт - пиши в чат Ярмарки: «обмен монеты ' + n + '»'; return; }
        Promise.resolve(W.swap(all ? { all: true } : { n }, xb)).then(() => {
          say0.textContent = pick(LINES.shopSwap); setHave(el, W, left - n);   // сразу показываем; точное число придёт ответом комнаты (result)
        }).catch(() => { /* ошибку показал сам сайт (toast) */ });
        return;
      }
      const cfb = e.target.closest('.hwn-cfy, .hwn-cfn');   // 29.10: подтверждение покупки
      if (cfb) {
        const cf = el.querySelector('.hwn-cf'); if (!cf) return;
        if (cfb.classList.contains('hwn-cfn')) { cf.remove(); return; }
        const n = +cf.dataset.n, price = +cf.dataset.p, say1 = el.querySelector('.hwn-say');
        if (!W.buy) { cf.remove(); say1.textContent = 'Обмен с сайта пока не открыт - пиши в чат Ярмарки: «обмен ' + n + '»'; return; }
        for (const q of cf.querySelectorAll('button')) q.disabled = true;
        say1.textContent = 'Ведьма колдует над твоим обменом...';
        Promise.resolve(W.buy({ n, price }, cfb)).then(() => { cf.remove(); el._pend = n; }).catch(() => { cf.remove(); say1.textContent = 'Не вышло - попробуй ещё раз.'; });
        return;
      }
      const b = e.target.closest('.hwn-buy'); if (!b) return;
      const have = haveOf(el, W), price = +b.dataset.p || 0, say = el.querySelector('.hwn-say');
      if (el._pend) { say.textContent = 'Подожди, ведьма ещё считает прошлый обмен.'; return; }
      if (have < price) { say.textContent = fill(pick(LINES.shopNo), { n: cnd(price - have) }); return; }
      // 29.10: покупка кнопкой: подтверждение «Обменять N 🍬 на <вещь>?» → W.buy → ответ комнаты (result)
      const nm = (b.closest('.hwn-g').querySelector('.hwn-nm') || {}).textContent || 'вещь', old = el.querySelector('.hwn-cf'); if (old) old.remove();
      const cf = document.createElement('div'); cf.className = 'hwn-cf'; cf.dataset.n = b.dataset.n; cf.dataset.p = String(price);
      cf.innerHTML = `<div class="hwn-cfb" role="alertdialog" aria-label="Подтверждение обмена"><p>Обменять <b>${price} ${art.candyIco}</b> на «${esc(nm)}»?</p><div class="hwn-cfr"><button type="button" class="hwn-xcb hwn-cfy">Обменять</button><button type="button" class="hwn-xcb hwn-cfn">Отмена</button></div></div>`;
      el.appendChild(cf);
      try { cf.querySelector('.hwn-cfy').focus({ preventScroll: true }); } catch (e2) { /* без фокуса */ }
    });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(el);
    WIN = { el, key, back, W };
    try { el.querySelector('.hwn-x').focus({ preventScroll: true }); } catch (e) { /* без фокуса */ }
    return el;
  }

  // CSS живых слоёв (city.css / оверлей подключают один раз): только transform / opacity
  const LIVE_CSS = `.hwn-live{position:absolute;pointer-events:none}.hwn-live svg{display:block;overflow:visible}
.hwn-tw path,.hwn-tw2 circle{animation:hwnTw 1.8s ease-in-out infinite}
.hwn-tw2 circle{animation-duration:2.6s}
.hwn-hop>svg>g{animation:hwnHop 1.9s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.hwn-bob>svg{animation:hwnBob 3.2s ease-in-out infinite}
@keyframes hwnTw{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes hwnHop{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-22px) rotate(12deg)}}
@keyframes hwnBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@media (prefers-reduced-motion:reduce){.hwn-live *{animation:none!important}}`;

  return { C, INK, DEFS, META, SHAPE, S_BASE, WEBCAM, LINES, witch, stupaArt, archArt, ghostArt, ghostBody, garland, lampAt, geo, inWebcam, camView, open, close, result, swapStep, swapPlan, shopHtml, passHtml, LIVE_CSS, WIN_CSS, esc, candy, jar, board, flame, pumpLamp };
});
