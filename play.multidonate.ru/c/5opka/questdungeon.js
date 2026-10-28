
/* ───── стиль «cats»: styles/cats/dungeon-themes.js ───── */
try {
/* Стиль «Котики» (рисовка) — ТЕМЫ РЕГИОНОВ для генератора данжей (styles/cats/dungeon.js).
   Порядок загрузки файлов не важен: темы складываются в MDDoodle.dungeonThemes, генератор берёт их при сборке комнаты.
   Тема = данные (палитра, материалы, рамки проходов, свет, декор, таблички) + необязательный extra(P, ctx) —
   «фирменные» эффекты региона (струи песка, водопады, лавопады…), рисуются кистями P из генератора.

   Каждый регион — в двух вариациях: T.<регион> (вариация 1) и T.<регион>_b (вариация 2, room.variant === 2).

   Поля темы:
     region — название региона на карте; names — запасные названия данжей;
     pal — цвета на малой глубине; deep — к каким цветам смещаться на дне (depth → 1);
     sky — CSS-подложка [верх, низ]; motes — цвета пылинок/светлячков в темноте свода;
     wall: strata|blocks|brick|marble|ice|basalt|roots|mossy|coral|void|planks|hull|plates|shelves|frost|fort; frieze — цветной пояс по стене;
     floor: pebbles|ripples|planks|tiles|cracks|snow|moss|wetsand; ceil: rock|ice|roots|vines|blocks|crystal;
     frame: { tunnel, back, down: timber|block|arch|door|cave|roots|ice|basalt|rune|gate, hole: crack|mouse,
              shaft: lift|chute|vine|portal, pit: hole|sand|water|lava|ice, out: ladder|slope|portal };
     sign: wood|stone|ice|metal; light: вид или список (jar|lantern|torch|brazier|crystal|mushroom|wisp|lava);
     decor: [[имя, ширина, минГлубина?, максГлубина?]…]; wallDecor: […]; props: […];
     signs: короткие надписи на табличках по видам проходов; jokes: [[строка, строка-шутка]…]; npc: внешность проводника;
     fxOver: true — extra рисуется поверх настенного декора (колокол, груз на цепи), иначе под ним. */
(function () {
  'use strict';
  if (!window.MDDoodle) return;
  const T = (window.MDDoodle.dungeonThemes = window.MDDoodle.dungeonThemes || {});

  // общий эффект: «струя» из трещины свода до пола (песок, вода, снег, лава). 1 SMIL.
  function stream(P, x, col, w = 16, base = 786, pool) {
    const { O, f1 } = P, on = P.anim();
    let s = `<path d="M${x + 16} 250 L${x - 4} 300 L${x + 18} 360" fill="none" stroke="${P.pal.hole}" stroke-width="8" stroke-linejoin="round"/>`;
    if (pool) s += `<path d="M${x - 70} ${base + 6} Q${x} ${base - 24} ${x + 70} ${base + 6} Z" fill="${pool}" ${O(3.5)}/>`;
    s += `<path d="M${x} 256 V${base - 6}" stroke="${P.INK}" stroke-width="${w + 8}" stroke-linecap="round" opacity=".55"/>`
      + `<path d="M${x} 256 V${base - 6}" stroke="${col}" stroke-width="${w}" stroke-dasharray="${f1(w * 1.2)} ${f1(w * 0.7)}" stroke-linecap="round">${on ? `<animate attributeName="stroke-dashoffset" from="0" to="${f1(-w * 3.8)}" dur="0.8s" repeatCount="indefinite"/>` : ''}</path>`;
    return s;
  }
  // выбрать 1–2 места в промежутках стены для эффекта
  function spotsIn(ctx, P, n, minW = 220) {
    const out = [];
    ctx.gaps.filter((g) => g[1] - g[0] >= minW).forEach((g) => { if (out.length < n && P.rnd() < 0.8) out.push(g[0] + (g[1] - g[0]) * (0.3 + P.rnd() * 0.4)); });
    return out;
  }

  /* ===================== ПЕСКИ ЗАБВЕНИЯ — гробницы ===================== */
  T.sands = {
    pillar: 'column',
    region: 'Пески Забвения', names: ['Гробница Забвения', 'Усыпальница Зноебора'],
    pal: { wall: '#b47e4e', wallL: '#c8935e', wallD: '#8f5f38', floor: '#7a5236', floorL: '#8f6442', ceil: '#1f1418', stone: '#b47e4e', stoneL: '#c8935e', stoneD: '#6e4a2f',
      accent: '#3fa89a', accent2: '#ffcf4a', sand: '#c49260', signFill: '#6e4a2f', signRim: '#7fd6c6', banner: '#c8664a', bannerD: '#8f3f2c', cloth: '#c8664a', deep0: '#3a2228', deep1: '#0c0810' },
    deep: { wall: '#7a5a5a', wallL: '#8a6a68', floor: '#5a3e36', stoneL: '#a88a78', accent: '#5a7ab0' },
    sky: ['#0c0810', '#1f1418'], motes: ['#ffd9a0', '#7fd6c6'],
    wall: 'blocks', frieze: true, floor: 'ripples', ceil: 'blocks',
    frame: { tunnel: 'block', back: 'block', down: 'arch', hole: 'crack', shaft: 'chute', pit: 'sand', out: 'slope' }, chuteColor: '#d9a870', slopeColor: '#c49260',
    sign: 'stone', light: 'brazier', rampChance: 0.4,
    decor: [['amphorae', 120], ['urns', 110], ['bones', 120], ['statue', 120], ['column', 80], ['brokenColumn', 120], ['chest', 110, 0.3], ['joke', 200], ['rocks', 120]],
    wallDecor: ['mural', 'mural', 'gems'], props: ['column', 'stalagmite', 'rock'],
    signs: { tunnel: 'ГАЛЕРЕЯ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'КОЛОДЕЦ', pit: 'ВОРОНКА', out: 'НАРУЖУ', deadend: 'ЗАВАЛЕНО', boss: 'УСЫПАЛЬНИЦА' },
    jokes: [['НЕ БУДИТЬ', 'СПИТ С ПРОШЛОГО ТЫСЯЧЕЛЕТИЯ'], ['ПЕСОК НЕ ЕСТЬ', 'ДАЖЕ ЕСЛИ ЗОЛОТОЙ'], ['ЛОВУШЕК НЕТ', 'ЧЕСТНО-ЧЕСТНО'], ['ВЫХОД ТАМ', 'НАВЕРНОЕ']],
    npc: { hat: 'bandana', shape: 'tall', color: '#e7b98a' },
    extra(P, ctx) { return spotsIn(ctx, P, ctx.S).map((x) => stream(P, x, '#e8c088', 15, 790, P.pal.sand)).join(''); },
  };

  /* ===================== ГНИЛЫЕ ТОПИ — затопленные руины ===================== */
  T.rot = {
    pillar: 'root',
    region: 'Гнилые Топи', names: ['Затопленный храм', 'Логово Болотной Ведьмы'],
    pal: { wall: '#4f5a44', wallL: '#5f6c50', wallD: '#3a4232', floor: '#4a4536', floorL: '#5a5442', ceil: '#141a14', stone: '#6e7460', stoneL: '#7f8670', stoneD: '#4a5040',
      wood: '#8a6a4a', woodD: '#5a4630', woodL: '#a07c56', accent: '#8ab060', accent2: '#c9a85a', plant: '#5a8a4a', plantL: '#b6e36a', water: '#3a5a4a', waterL: '#7ab09a',
      glow: '#d8ff9a', glow2: '#8ad85a', banner: '#5a7a3a', bannerD: '#3a5228', signFill: '#5a4630', cloth: '#7a5a8a', deep0: '#24301e', deep1: '#0a0e0a' },
    deep: { wall: '#3a4040', floor: '#363a30', plantL: '#9fe3c0' },
    sky: ['#080c0a', '#141a14'], motes: ['#d8ff9a', '#9fe39a', '#ffe59a'],
    wall: 'mossy', floor: 'planks', ceil: 'vines',
    frame: { tunnel: 'roots', back: 'roots', down: 'cave', hole: 'crack', shaft: 'vine', pit: 'water', out: 'ladder' },
    sign: 'wood', light: ['wisp', 'mushroom', 'jar'], rampChance: 0.25,
    decor: [['reeds', 100], ['cauldron', 120, 0.2], ['totem', 80], ['stump', 110], ['shrooms', 130], ['waterPool', 150], ['bones', 120, 0.4], ['joke', 200], ['barrels', 130]],
    wallDecor: ['moss', 'roots', 'shelf'], props: ['bigShroom', 'stump', 'totem'],
    signs: { tunnel: 'ГАТЬ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'НОРА', shaft: 'ЛИАНА', pit: 'ОМУТ', out: 'НАРУЖУ', deadend: 'ТРЯСИНА', boss: 'ЛОГОВО' },
    jokes: [['НЕ КОРМИТЬ', 'ТРЯСИНУ'], ['КВА', 'ЭТО ПРИВЕТСТВИЕ'], ['ВЕДЬМА ДОМА', 'СТУЧАТЬ ТРИЖДЫ'], ['БОЛОТО ЧИСТОЕ', 'ПО-СВОЕМУ']],
    npc: { hat: 'wizard', shape: 'cone', color: '#9aa3ad' },
    extra(P, ctx) {
      // пузыри в болотных лужах у стены
      return spotsIn(ctx, P, ctx.S, 200).map((x) => {
        const on = P.anim();
        return `<path d="M${x - 80} 798 Q${x} 770 ${x + 80} 798 Z" fill="${P.pal.water}" ${P.O(3.5)}/><circle cx="${x - 10}" cy="786" r="7" fill="${P.pal.waterL}" ${P.O(2.4)}>${on ? '<animate attributeName="r" values="0;8;0" dur="2.6s" repeatCount="indefinite"/>' : ''}</circle><circle cx="${x + 24}" cy="790" r="4" fill="${P.pal.waterL}" ${P.O(2)}/>`;
      }).join('');
    },
  };

  /* ===================== ДИКАЯ ПУЩА — корни древнего леса ===================== */
  T.wildwood = {
    pillar: 'root',
    region: 'Дикая Пуща', names: ['Корни Древа-Отца', 'Чертоги Грибного Короля'],
    pal: { wall: '#6a5038', wallL: '#7a5e44', wallD: '#4e3a28', floor: '#4e3e2e', floorL: '#5e4c38', ceil: '#14100c', stone: '#8a7a5a', stoneL: '#9a8a6a', stoneD: '#5e5038',
      wood: '#9a6a40', woodD: '#5e3e24', woodL: '#b8844e', accent: '#6ab85a', accent2: '#ffcf4a', plant: '#4a9a4a', plantL: '#9fe39a', glow: '#eaffa0', glow2: '#a8e05a',
      banner: '#4a8a3a', bannerD: '#2e5e24', signFill: '#5e3e24', deep0: '#2a2018', deep1: '#0a0806' },
    deep: { wall: '#3e3a48', wallL: '#4a4658', floor: '#36303e', plantL: '#7fd6e6' },
    sky: ['#06080a', '#141a10'], motes: ['#eaffa0', '#9fe39a', '#ffe59a'],
    wall: 'roots', floor: 'moss', ceil: 'roots',
    frame: { tunnel: 'roots', back: 'roots', down: 'roots', hole: 'crack', shaft: 'vine', pit: 'hole', out: 'ladder' },
    sign: 'wood', light: ['wisp', 'mushroom', 'jar'], rampChance: 0.3,
    decor: [['stump', 110], ['shrooms', 130], ['shrooms', 130], ['rocks', 120], ['crystals', 120, 0.5], ['joke', 200], ['chest', 110, 0.4], ['reeds', 100]],
    wallDecor: ['roots', 'moss', 'gems'], props: ['bigShroom', 'stump', 'rock'],
    signs: { tunnel: 'ХОД', back: 'НАЗАД', down: 'ВНИЗ', hole: 'НОРА', shaft: 'ЛИАНА', pit: 'ЯМА', out: 'НАРУЖУ', deadend: 'КОРНИ', boss: 'ЧЕРТОГ' },
    jokes: [['НЕ БУДИТЬ ДУБ', 'ОН ЗАНУДА'], ['ГРИБЫ НЕ ЕСТЬ', 'ОНИ ЕЩЁ ГОВОРЯТ'], ['СВЕТЛЯЧКИ', 'РАБОТАЮТ ДО УТРА']],
    npc: { hat: 'beret', shape: 'egg', color: '#a8754f' },
  };

  /* ===================== КАМЕННЫЙ ХРЕБЕТ — гномья шахта ===================== */
  T.ridge = {
    pillar: 'crib',
    region: 'Каменный Хребет', names: ['Старая гномья шахта', 'Копи Каменного Хребта'],
    pal: { wall: '#7a6a6e', wallL: '#8a7a7e', wallD: '#5a4e54', floor: '#4a4250', floorL: '#56505e', ceil: '#141220', stone: '#8a8290', stoneL: '#9a929e', stoneD: '#5e5868',
      accent: '#c8664a', accent2: '#ffcf4a', banner: '#7a3426', bannerD: '#5a2418', signFill: '#6e4a2f', deep0: '#2a2436', deep1: '#0a0812' },
    deep: { wall: '#4a4060', wallL: '#5a4e74', floor: '#363048' },
    sky: ['#0a0812', '#18142a'], motes: ['#ffe59a', '#7fd6e6'],
    wall: 'strata', floor: 'pebbles', ceil: 'rock', rails: true,
    frame: { tunnel: 'timber', back: 'timber', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'wood', light: ['lantern', 'jar'], dimDeep: 0.5, rampChance: 0.25,
    decor: [['crates', 150], ['barrels', 130], ['cart', 150], ['rocks', 120], ['crystals', 120, 0.45], ['weaponRack', 130], ['joke', 200], ['sacks', 120]],
    wallDecor: ['vein', 'vein', 'gems'], props: ['stalagmite', 'lampPost', 'rock'],
    signs: { tunnel: 'ШТРЕК', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'КЛЕТЬ', pit: 'ШУРФ', out: 'НАРУЖУ', deadend: 'ОБВАЛ', boss: 'ГЛУБИНА' },
    jokes: [['ПРАВИЛА ШАХТЫ', 'КАСКУ НЕ СНИМАТЬ'], ['КОПАТЬ ТУТ', 'НЕТ, ЛУЧШЕ ТАМ'], ['ГНОМОВ НЕ ТРОГАТЬ', 'ОНИ ОБЕДАЮТ']],
    npc: { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#f2a65a' },
  };

  /* ===================== ЛЕДЯНОЙ ПРЕДЕЛ — ледяные пещеры ===================== */
  T.ice = {
    pillar: 'icepillar',
    region: 'Ледяной Предел', names: ['Ледяные пещеры Инейграда', 'Хрустальный грот'],
    pal: { wall: '#6a8ab0', wallL: '#86a6c8', wallD: '#4a6a90', floor: '#4e5c7a', floorL: '#62708e', ceil: '#0e1626', stone: '#9ab0c8', stoneL: '#b8cce0', stoneD: '#5a7090',
      gem: '#bfe6ff', gem2: '#d8c8ff', snow: '#eef4ff', accent: '#7fd6e6', accent2: '#ffcf4a', glow: '#d8f0ff', glow2: '#7ab8e6', banner: '#3a6aa8', bannerD: '#24487a',
      signFill: '#3a5a7a', signRim: '#bfe6ff', deep0: '#2a3a5a', deep1: '#080c18', hole: '#0e1626' },
    deep: { wall: '#4a5a90', wallL: '#5a6aa8', floor: '#3e4a70', gem: '#d8c8ff' },
    sky: ['#060a14', '#0e1626'], motes: ['#ffffff', '#bfe6ff'],
    wall: 'ice', floor: 'snow', ceil: 'ice',
    frame: { tunnel: 'ice', back: 'ice', down: 'ice', hole: 'crack', shaft: 'chute', pit: 'water', out: 'slope' }, chuteColor: '#eef4ff', slopeColor: '#eef4ff',
    sign: 'ice', light: ['crystal', 'torch'], rampChance: 0.3,
    decor: [['iceBlock', 120], ['snowDrift', 170], ['crystals', 120], ['rocks', 120], ['joke', 200], ['chest', 110, 0.3], ['crates', 150, 0, 0.4]],
    wallDecor: ['icicles', 'gems', 'icicles'], props: ['iceSpire', 'snowman', 'iceSpire'],
    signs: { tunnel: 'КОРИДОР', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ТРЕЩИНА', shaft: 'ЖЁЛОБ', pit: 'ПОЛЫНЬЯ', out: 'НАРУЖУ', deadend: 'ЛЁД', boss: 'ЧЕРТОГ СТУЖИ' },
    jokes: [['ЯЗЫКОМ', 'НЕ ТРОГАТЬ'], ['СКОЛЬЗКО', 'ПАДАТЬ КРАСИВО'], ['ВАРЕЖКИ', 'ВЫДАЮТСЯ НА ВЫХОДЕ']],
    npc: { hat: 'beret', shape: 'ball', color: '#f4f1ec' },
  };

  /* ===================== БЕЛЫЙ ВЕНЕЦ — заснеженная горная обитель ===================== */
  T.crown = {
    pillar: 'column',
    region: 'Белый Венец', names: ['Обитель на вершине', 'Крепость Снежных Орлов'],
    pal: { wall: '#8a8aa0', wallL: '#a0a0b8', wallD: '#6a6a84', floor: '#5e6074', floorL: '#70728a', ceil: '#10121e', stone: '#a8a8bc', stoneL: '#c0c0d4', stoneD: '#70708a',
      snow: '#f4f6ff', accent: '#4a7ab8', accent2: '#ffcf4a', cloth: '#3a6aa8', banner: '#3a6aa8', bannerD: '#24487a', signFill: '#4a4a64', signRim: '#ffcf4a', deep0: '#2a2a40', deep1: '#08080e' },
    deep: { wall: '#5a5a7a', floor: '#464860', accent: '#7fd6e6' },
    sky: ['#080a14', '#14162a'], motes: ['#ffffff', '#ffe59a'],
    wall: 'blocks', frieze: false, floor: 'tiles', ceil: 'ice',
    frame: { tunnel: 'arch', back: 'arch', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'ice', out: 'ladder' },
    sign: 'stone', light: ['brazier', 'lantern'], rampChance: 0.35,
    decor: [['snowDrift', 170], ['statue', 120], ['column', 80], ['shields', 120], ['weaponRack', 130], ['urns', 110], ['joke', 200], ['chest', 110, 0.3]],
    wallDecor: ['flag', 'window', 'icicles'], props: ['column', 'snowman', 'iceSpire'],
    signs: { tunnel: 'ГАЛЕРЕЯ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ПРОЛОМ', shaft: 'ПОДЪЁМНИК', pit: 'ПРОВАЛ', out: 'НАРУЖУ', deadend: 'ЗАМЕЛО', boss: 'ТРОННЫЙ ЗАЛ' },
    jokes: [['ТИШЕ', 'ЛАВИНЫ НЕ ЛЮБЯТ ШУМ'], ['ОРЛЫ НЕ КУСАЮТСЯ', 'ОБЫЧНО'], ['ЗВОНИТЬ В КОЛОКОЛ', 'ЗАПРЕЩЕНО']],
    npc: { hat: 'legion', shape: 'box', color: '#c9ccd3' },
  };

  /* ===================== ВЫЖЖЕННЫЙ КРАЙ — лавовые пещеры ===================== */
  T.scorch = {
    pillar: 'basalt',
    region: 'Выжженный Край', names: ['Горнило Пеплогорска', 'Обсидиановый храм'],
    pal: { wall: '#5a3a40', wallL: '#6a4650', wallD: '#3e2830', floor: '#3a2a30', floorL: '#4a363c', ceil: '#140a0c', stone: '#5a4a5a', stoneL: '#6e5e6e', stoneD: '#3a2e3e',
      accent: '#ff8a3d', accent2: '#ffcf4a', lava: '#ff6a2a', lavaL: '#ffd27a', glow: '#ffd27a', glow2: '#ff7a2a', banner: '#a33a1a', bannerD: '#6e2410', signFill: '#3a2a30', signRim: '#ff8a3d', deep0: '#5a1e12', deep1: '#1a0608' },
    deep: { wall: '#4a2a2a', floor: '#2e1e22', lava: '#ff4a1a' },
    sky: ['#0e0608', '#1e0c0c'], motes: ['#ffb24a', '#ff7a2a', '#ffe27a'],
    wall: 'basalt', floor: 'cracks', ceil: 'rock',
    frame: { tunnel: 'basalt', back: 'basalt', down: 'basalt', hole: 'crack', shaft: 'chute', pit: 'lava', out: 'ladder' }, chuteColor: '#ff8a2a',
    sign: 'metal', light: ['lava', 'brazier'], rampChance: 0.35,
    decor: [['obsidian', 120], ['lavaPool', 170], ['rocks', 120], ['bones', 120], ['weaponRack', 130], ['joke', 200], ['chest', 110, 0.4], ['barrels', 130, 0, 0.5]],
    wallDecor: ['lavaCrack', 'lavaCrack', 'vein'], props: ['obsidian', 'rock', 'stalagmite'],
    signs: { tunnel: 'КОРИДОР', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ТРЕЩИНА', shaft: 'ЖЁЛОБ', pit: 'РАСЩЕЛИНА', out: 'НАРУЖУ', deadend: 'ОСТЫЛО', boss: 'ГОРНИЛО' },
    jokes: [['ГОРЯЧО!', 'НЕ ТРОГАТЬ ЛАПАМИ'], ['ЖАРКО?', 'ВЫ ЕЩЁ ВНИЗУ НЕ БЫЛИ'], ['ЗАПАСНОЙ ВЫХОД', 'ТОЖЕ В ЛАВЕ']],
    npc: { hat: 'bandana', shape: 'box', color: '#4a4350' },
    extra(P, ctx) { return spotsIn(ctx, P, Math.max(1, ctx.S - 1), 240).map((x) => `<circle cx="${x}" cy="760" r="110" fill="url(#dgLava)" opacity=".6"/>` + stream(P, x, '#ff8a2a', 18, 792, P.pal.lava)).join(''); },
  };

  /* ===================== ЗЕМЛИ ЗА КРАЕМ — руины у края мира ===================== */
  T.beyond = {
    pillar: 'obelisk',
    region: 'Земли за Краем', names: ['Руины на краю мира', 'Звёздный разлом'],
    pal: { wall: '#3e3458', wallL: '#4c4068', wallD: '#2c2442', floor: '#2e2840', floorL: '#3a3450', ceil: '#08061a', stone: '#5a5078', stoneL: '#6e6490', stoneD: '#3a3254',
      gem: '#7fd6e6', gem2: '#c8a2ff', accent: '#c8a2ff', accent2: '#7fd6e6', plant: '#6a5aa8', plantL: '#c8a2ff', glow: '#e0d0ff', glow2: '#9a7aff',
      banner: '#4a3a8a', bannerD: '#2e2460', signFill: '#2c2442', signRim: '#c8a2ff', deep0: '#2a2050', deep1: '#04030c' },
    deep: { wall: '#2a2244', floor: '#201c32' },
    sky: ['#04030c', '#100c24'], motes: ['#ffffff', '#c8a2ff', '#7fd6e6'],
    wall: 'void', floor: 'tiles', ceil: 'crystal',
    frame: { tunnel: 'rune', back: 'rune', down: 'rune', hole: 'crack', shaft: 'portal', pit: 'hole', out: 'portal' },
    sign: 'stone', light: ['crystal', 'wisp'], rampChance: 0.45,
    decor: [['floatRock', 100], ['crystals', 120], ['brokenColumn', 120], ['statue', 120], ['rocks', 120], ['joke', 200], ['chest', 110, 0.4]],
    wallDecor: ['runes', 'runes', 'gems'], props: ['crystalPillar', 'column', 'rock'],
    signs: { tunnel: 'ПРОХОД', back: 'НАЗАД', down: 'ВНИЗ', hole: 'РАЗЛОМ', shaft: 'ПОРТАЛ', pit: 'ДЫРА', out: 'ДОМОЙ', deadend: 'ПУСТОТА', boss: 'КРАЙ' },
    jokes: [['КРАЙ МИРА', 'НЕ ПРИСЛОНЯТЬСЯ'], ['ГРАВИТАЦИЯ', 'ПО ВЫХОДНЫМ'], ['ЗВЁЗДЫ НЕ ТРОГАТЬ', 'ОНИ ГОРЯЧИЕ']],
    npc: { hat: 'wizard', shape: 'tall', color: '#b6a6c9' },
  };

  /* ===================== ДОЛИНЫ РУЧЬЁВ — гроты с водопадами ===================== */
  T.brooks = {
    pillar: 'rock',
    region: 'Долины Ручьёв', names: ['Грот Поющих Ручьёв', 'Пещера Водопадов'],
    pal: { wall: '#5a7a74', wallL: '#6a8c84', wallD: '#44605a', floor: '#4a5a58', floorL: '#5a6c68', ceil: '#0c1414', stone: '#7a8e88', stoneL: '#8ea49c', stoneD: '#56685e',
      water: '#3a7aa8', waterL: '#8fdcf0', plant: '#5aa86a', plantL: '#9fe39a', accent: '#4ab0ff', accent2: '#ffcf4a', banner: '#2e7aa0', bannerD: '#1e5674', signFill: '#5a4630', deep0: '#1e3a3a', deep1: '#060c0c' },
    deep: { wall: '#3e5a6a', floor: '#344650', gem: '#9fe3c0' },
    sky: ['#060c0e', '#0e1a1c'], motes: ['#bfe6ff', '#9fe39a'],
    wall: 'mossy', floor: 'wetsand', ceil: 'rock',
    frame: { tunnel: 'cave', back: 'cave', down: 'arch', hole: 'crack', shaft: 'chute', pit: 'water', out: 'ladder' }, chuteColor: '#8fdcf0',
    sign: 'wood', light: ['lantern', 'crystal'], rampChance: 0.35,
    decor: [['waterPool', 150], ['reeds', 100], ['rocks', 120], ['barrels', 130], ['shrooms', 130, 0.3], ['joke', 200], ['chest', 110, 0.4]],
    wallDecor: ['moss', 'moss', 'net'], props: ['rock', 'stalagmite', 'stump'],
    signs: { tunnel: 'ТРОПА', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'ВОДОПАД', pit: 'ВОДОВОРОТ', out: 'НАРУЖУ', deadend: 'ЗАТОПЛЕНО', boss: 'ЗАТОН' },
    jokes: [['ОСТОРОЖНО', 'СКОЛЬЗКО'], ['РЫБУ НЕ ЛОВИТЬ', 'ОНА ВЕДЁТ УЧЁТ'], ['ВОДОПАД', 'ВЫКЛЮЧАТЬ НЕЛЬЗЯ']],
    npc: { hat: 'bandana', shape: 'bean', color: '#9aa3ad' },
    extra(P, ctx) { return spotsIn(ctx, P, ctx.S, 220).map((x) => stream(P, x, P.pal.waterL, 44, 794, 'url(#dgWater)')).join(''); },
  };

  /* ===================== СРЕДИННЫЕ ЗЕМЛИ — погреба и схроны ===================== */
  T.midlands = {
    pillar: 'buttress',
    region: 'Срединные Земли', names: ['Подвалы Перекрёстка', 'Разбойничий схрон'],
    pal: { wall: '#9a5a44', wallL: '#ac6a52', wallD: '#7a4232', floor: '#5a4038', floorL: '#6a4c42', ceil: '#180e0e', stone: '#9a8478', stoneL: '#b09a8c', stoneD: '#6e5a50',
      accent: '#a3122a', accent2: '#ffcf4a', cloth: '#a3122a', banner: '#a3122a', bannerD: '#7a0f1d', signFill: '#6e4a2f', deep0: '#3a2020', deep1: '#0c0606' },
    deep: { wall: '#6a4a50', floor: '#44323a' },
    sky: ['#0c0606', '#1a0e0e'], motes: ['#ffe59a', '#ffb24a'],
    wall: 'brick', floor: 'tiles', ceil: 'blocks',
    frame: { tunnel: 'door', back: 'door', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'wood', light: ['torch', 'lantern'], rampChance: 0.25,
    decor: [['barrels', 130], ['wineRack', 150], ['sacks', 120], ['crates', 150], ['shields', 120], ['weaponRack', 130], ['joke', 200], ['chest', 110, 0.3]],
    wallDecor: ['flag', 'shelf', 'window'], props: ['barrels', 'column', 'lampPost'],
    signs: { tunnel: 'ПОГРЕБ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'КОЛОДЕЦ', pit: 'ЛЮК', out: 'НАРУЖУ', deadend: 'ЗАМУРОВАНО', boss: 'СХРОН' },
    jokes: [['ВХОД ТОЛЬКО', 'ДЛЯ ЛЕГИОНА'], ['ВИНО НЕ ПИТЬ', 'ОНО 300 ЛЕТ ЖДЁТ'], ['РАЗБОЙНИКОВ НЕТ', 'ВЫ ИХ НЕ ВИДИТЕ']],
    npc: { hat: 'legion', shape: 'box', color: '#c9c4dc' },
  };

  /* ===================== СЕРДЦЕ МИРА — катакомбы древнего города ===================== */
  T.heart = {
    pillar: 'column',
    region: 'Сердце Мира', names: ['Катакомбы Сердца Мира', 'Зал Первых Королей'],
    pal: { wall: '#b0a090', wallL: '#c4b6a6', wallD: '#8a7a6e', floor: '#6a5a58', floorL: '#7e6e6a', ceil: '#14100e', stone: '#d8ccba', stoneL: '#ece2d2', stoneD: '#9a8c7c',
      accent: '#3fa89a', accent2: '#ffcf4a', banner: '#a3245a', bannerD: '#7a1a4a', cloth: '#a3245a', signFill: '#7a6a5a', signRim: '#ffcf4a', deep0: '#3a2a2a', deep1: '#0c0808' },
    deep: { wall: '#7a6a7a', wallL: '#8c7c8c', floor: '#4e4250', accent: '#ffcf4a' },
    sky: ['#0c0808', '#1c1414'], motes: ['#ffe59a', '#ffffff'],
    wall: 'marble', frieze: true, floor: 'tiles', ceil: 'blocks',
    frame: { tunnel: 'arch', back: 'arch', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'stone', light: ['brazier', 'lantern'], rampChance: 0.45,
    decor: [['statue', 120], ['column', 80], ['urns', 110], ['brokenColumn', 120], ['chest', 110, 0.2], ['shields', 120], ['joke', 200]],
    wallDecor: ['mural', 'flag', 'gems'], props: ['column', 'column', 'rock'],
    signs: { tunnel: 'ГАЛЕРЕЯ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ПРОХОД', shaft: 'ПЛАТФОРМА', pit: 'ПРОВАЛ', out: 'НАРУЖУ', deadend: 'ОБРУШЕНО', boss: 'ТРОННЫЙ ЗАЛ' },
    jokes: [['СТАРИНА', 'РУКАМИ НЕ ТРОГАТЬ'], ['КОРОЛЬ НА ОБЕДЕ', 'УЖЕ 1000 ЛЕТ'], ['ЭКСКУРСИИ', 'ПО ЧЕТВЕРГАМ']],
    npc: { hat: 'tophat', shape: 'tall', color: '#e6e6ee' },
  };

  /* ===================== БЕРЕГА ВНУТРЕННЕГО МОРЯ — морские пещеры ===================== */
  T.shores = {
    pillar: 'rock',
    region: 'Берега Внутреннего моря', names: ['Пещера Контрабандистов', 'Грот Утопленников'],
    pal: { wall: '#4e6478', wallL: '#5e768a', wallD: '#3a4c5e', floor: '#7a6a52', floorL: '#8a7a60', ceil: '#0a1018', stone: '#7a8a98', stoneL: '#8e9eac', stoneD: '#56667a',
      water: '#2e6aa0', waterL: '#7fd6e6', sand: '#c4a46a', accent: '#ff8fa3', accent2: '#ffcf4a', wood: '#a07850', woodD: '#6a4a30', banner: '#2e6aa0', bannerD: '#1e4a74', signFill: '#6a4a30', deep0: '#1e2e3e', deep1: '#04080c' },
    deep: { wall: '#3a4a6a', floor: '#5a5048', waterL: '#9fe3c0' },
    sky: ['#04080c', '#0e1620'], motes: ['#bfe6ff', '#ffffff'],
    wall: 'coral', floor: 'wetsand', ceil: 'rock',
    frame: { tunnel: 'cave', back: 'cave', down: 'cave', hole: 'crack', shaft: 'chute', pit: 'water', out: 'ladder' }, chuteColor: '#7fd6e6',
    sign: 'wood', light: ['lantern', 'jar'], rampChance: 0.3,
    decor: [['anchor', 130], ['shells', 110], ['wreck', 180], ['barrels', 130], ['coral', 100], ['chest', 110], ['joke', 200], ['crates', 150]],
    wallDecor: ['net', 'net', 'moss'], props: ['coralRock', 'rock', 'barrels'],
    signs: { tunnel: 'ХОД', back: 'НАЗАД', down: 'ВНИЗ', hole: 'НОРА', shaft: 'КОЛОДЕЦ', pit: 'ВОДОВОРОТ', out: 'НАРУЖУ', deadend: 'ПРИЛИВ', boss: 'ЛОГОВО ЗМЕЯ' },
    jokes: [['ПРИЛИВ В ПОЛНОЧЬ', 'ДЕРЖИТЕ ХВОСТЫ'], ['КЛАДА НЕТ', 'КОНТРАБАНДИСТЫ'], ['КРАБАМ', 'ВХОД СВОБОДНЫЙ']],
    npc: { hat: 'tophat', shape: 'ball', color: '#9aa3ad' },
    extra(P, ctx) {
      // приливная вода у основания стены: лёгкая волна (1 SMIL на экран, не больше 2)
      let s = '';
      for (let i = 0; i < Math.min(2, ctx.S); i++) {
        const x0 = i * 1920 + 60 + P.rnd() * 300, w = 360, on = P.anim();
        if (ctx.gaps.some((g) => g[0] <= x0 && g[1] >= x0 + w)) s += `<path d="M${x0} 798 Q${x0 + w / 2} 772 ${x0 + w} 798 Z" fill="url(#dgWater)" ${P.O(3)}/><path d="M${x0 + 40} 790 q20 -8 40 0 t40 0 t40 0" fill="none" stroke="#fff" stroke-width="3" opacity=".7">${on ? '<animateTransform attributeName="transform" type="translate" values="0 0;30 0;0 0" dur="5s" repeatCount="indefinite"/>' : ''}</path>`;
      }
      return s;
    },
  };
  /* ===================== ВОСТОЧНАЯ МАРКА — казематы пограничной крепости ===================== */
  // фирменное: дозорный колокол под сводом качается; в решётке свода проходит отблеск фонаря часового (по 1 SMIL)
  function markaWatch(P, ctx) {
    const { O, INK, pal } = P;
    return ctx.gaps.filter((g) => g[1] - g[0] >= 300).slice(0, Math.min(2, ctx.S)).map((g, i) => {
      const on = P.anim();
      if (i % 2 === 0) {
        // колокол — у левого края промежутка: факелы висят ниже (y ~520), настенный декор — ближе к середине
        const x = Math.round(g[0] + 70);
        return `<path d="M${x - 44} 262 H${x + 30}" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M${x - 44} 262 H${x + 30}" stroke="${pal.woodD}" stroke-width="9" stroke-linecap="round"/>`
          + `<g transform="translate(${x} 266)"><g>${on ? '<animateTransform attributeName="transform" type="rotate" values="-9;9;-9" dur="2.8s" repeatCount="indefinite"/>' : ''}`
          + `<path d="M0 0 V36" stroke="${pal.sand}" stroke-width="4"/><path d="M-28 92 Q-30 46 0 38 Q30 46 28 92 L36 102 H-36 Z" fill="#c8963a" ${O(4)}/>`
          + `<circle cy="108" r="8" fill="${pal.iron}" ${O(2.6)}/></g></g>`
          + `<path d="M${x + 30} 262 q30 60 4 130" fill="none" stroke="${pal.sand}" stroke-width="3" opacity=".8"/>`;
      }
      // решётка в своде: наверху ходит часовой с фонарём — сквозь прутья то и дело падает тёплый свет
      const x = Math.round((g[0] + g[1]) / 2);
      let bars = ''; for (let dx = -66; dx <= 66; dx += 22) bars += `M${x + dx} 252V274`;
      return `<path d="M${x - 70} 274 L${x + 70} 274 L${x + 150} 640 L${x - 150} 640 Z" fill="${pal.glow}" opacity="${on ? 0 : 0.12}">${on ? '<animate attributeName="opacity" values="0;0;.2;.28;.2;0;0" dur="9s" repeatCount="indefinite"/>' : ''}</path>`
        + `<rect x="${x - 80}" y="250" width="160" height="26" rx="4" fill="${pal.ceil}" ${O(4)}/><path d="${bars}" stroke="${pal.metalD}" stroke-width="5"/>`;
    }).join('');
  }
  T.marka = {
    pillar: 'palisade',
    region: 'Восточная Марка', names: ['Казематы Маркграда', 'Застава Дозорных'],
    pal: { wall: '#6b6f5e', wallL: '#7c8070', wallD: '#50544a', floor: '#4c463a', floorL: '#5a5446', ceil: '#12130e', stone: '#8a8c7a', stoneL: '#a0a28e', stoneD: '#5e6052',
      wood: '#946238', woodD: '#5e3c22', woodL: '#b07a48', metal: '#c4c8cc', metalD: '#8a9098', accent: '#e0862a', accent2: '#ffcf4a', cloth: '#a3122a', sand: '#c8b48a',
      banner: '#2f5e4e', bannerD: '#1e3e34', signFill: '#5e3c22', signRim: '#e0862a', glow: '#ffd890', glow2: '#ff9a3a', deep0: '#2a2a1e', deep1: '#08080a' },
    deep: { wall: '#4e5058', wallL: '#5c5e68', floor: '#3a3840', stoneL: '#8a8c96', accent: '#ff6a3a' },
    sky: ['#08080a', '#16170f'], motes: ['#ffcf7a', '#ff9a3a'],
    wall: 'fort', floor: 'tiles', ceil: 'blocks',
    frame: { tunnel: 'gate', back: 'gate', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'wood', light: ['torch', 'brazier'], rampChance: 0.3,
    decor: [['spearRack', 150], ['barrels', 130], ['sacks', 120], ['crates', 150], ['ballista', 240, 0.25], ['cage', 120, 0.45], ['joke', 200], ['chest', 110, 0.3]],
    wallDecor: ['warBanner', 'arrowSlit', 'shieldRow', 'arrowSlit'], props: ['standard', 'dummy', 'barrels'],
    signs: { tunnel: 'КАЗЕМАТ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ПОДКОП', shaft: 'ПОДЪЁМНИК', pit: 'ЛЮК', out: 'НАРУЖУ', deadend: 'ЗАВАЛЕНО', boss: 'ШТАБ' },
    jokes: [['СТОЙ, КТО ИДЁТ?', 'МЯУ — ПРОХОДИ'], ['КОПЬЯ НЕ ГРЫЗТЬ', 'ЭТО НЕ КОГТЕТОЧКА'], ['ПОСТ СДАЛ', 'ПОСТ ПРОСПАЛ'], ['ЗНАМЯ НЕ ЖЕВАТЬ', 'ОНО ДРЕВНЕЕ'], ['В КЛЕТКУ НЕ ЛЕЗТЬ', 'ДАЖЕ ЕСЛИ ТАМ КОРОБКА']],
    npc: { hat: 'legion', shape: 'tall', color: '#d8a46a' },
    fxOver: true,
    extra: markaWatch,
  };

  /* =====================================================================================
     ВАРИАЦИЯ 2 каждого региона (room.variant === 2 → тема «<регион>_b»)
     ===================================================================================== */

  // Пески Забвения · 2 — логово песчаного червя: рыжие пещеры, рёбра великанов, янтарь
  T.sands_b = {
    region: 'Пески Забвения', pillar: 'ribs', names: ['Логово Песчаного Червя', 'Кости Великанов'],
    pal: { wall: '#a8603e', wallL: '#bc744e', wallD: '#7e4428', floor: '#6e4430', floorL: '#80543c', ceil: '#1c0e0c', stone: '#b8845a', stoneL: '#cc9a6a', stoneD: '#7e5434',
      gem: '#ffb84a', gem2: '#ff8a5a', bone: '#f3e6c8', accent: '#e8a23d', accent2: '#ffcf4a', sand: '#d9a870', banner: '#a84a2a', bannerD: '#74301a', signFill: '#5e3a24', signRim: '#ffcf4a', deep0: '#4a2018', deep1: '#0e0604' },
    deep: { wall: '#7a4a48', floor: '#4e3430', gem: '#ff7a5a' },
    sky: ['#0e0604', '#1c0e0c'], motes: ['#ffb84a', '#ffd9a0'],
    wall: 'strata', floor: 'ripples', ceil: 'rock',
    frame: { tunnel: 'cave', back: 'cave', down: 'cave', hole: 'crack', shaft: 'chute', pit: 'sand', out: 'slope' }, chuteColor: '#e8c088', slopeColor: '#d9a870',
    sign: 'wood', light: ['crystal', 'torch'], rampChance: 0.35,
    decor: [['bones', 120], ['boneArch', 140], ['crystals', 120], ['rocks', 120], ['sacks', 120, 0, 0.5], ['joke', 200], ['chest', 110, 0.3]],
    wallDecor: ['gems', 'vein'], props: ['rock', 'stalagmite', 'crystalPillar'],
    signs: { tunnel: 'ХОД ЧЕРВЯ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'НОРА', shaft: 'ЖЁЛОБ', pit: 'ВОРОНКА', out: 'НАРУЖУ', deadend: 'ОСЫПЬ', boss: 'ЛОГОВО ЧЕРВЯ' },
    jokes: [['ЧЕРВЬ СПИТ', 'НЕ ТОПАТЬ'], ['РЁБРА НЕ ТРОГАТЬ', 'ОНИ ЕЩЁ ЧЬИ-ТО'], ['ЯНТАРЬ', 'НЕ ЛИЗАТЬ']],
    npc: { hat: 'bandana', shape: 'tall', color: '#e7b98a' },
    extra(P, ctx) { const g = ctx.gaps.filter((q) => q[1] - q[0] > 220); return g.slice(0, ctx.S).map((q) => { const x = q[0] + (q[1] - q[0]) * 0.5; return `<path d="M${x - 90} 794 Q${x - 40} 742 ${x + 10} 752 Q${x + 60} 736 ${x + 90} 794 Z" fill="${P.pal.sand}" ${P.O(3.5)}/>`; }).join(''); },
  };

  // Гнилые Топи · 2 — погреб болотной ведьмы: дощатые стены, зелья, травы, котлы
  T.rot_b = {
    region: 'Гнилые Топи', pillar: 'beam', names: ['Погреб Болотной Ведьмы', 'Кладовая Тётушки Тины'],
    pal: { wall: '#5a4a3a', wallL: '#6a5846', wallD: '#3e3226', floor: '#3e3a2e', floorL: '#4c473a', ceil: '#100c08', wood: '#7a5a3e', woodD: '#4e3a26', woodL: '#94704c', stone: '#6e6a58', stoneL: '#807a66', stoneD: '#4a4638',
      plant: '#5a8a4a', plantL: '#b6e36a', gem: '#9fe3c0', gem2: '#c8a2ff', accent: '#8a5aa8', accent2: '#b6e36a', cloth: '#7a5a8a', glow: '#e0ffb0', glow2: '#9ad85a', banner: '#5a3a6a', bannerD: '#3a2448', signFill: '#4e3a26', deep0: '#2a2018', deep1: '#080604' },
    deep: { wall: '#3e3644', floor: '#302c34' },
    sky: ['#060806', '#100c08'], motes: ['#b6e36a', '#c8a2ff'],
    wall: 'planks', floor: 'planks', ceil: 'roots',
    frame: { tunnel: 'door', back: 'door', down: 'arch', hole: 'crack', shaft: 'vine', pit: 'water', out: 'ladder' },
    sign: 'wood', light: ['jar', 'wisp', 'mushroom'], rampChance: 0.2,
    decor: [['cauldron', 120], ['potions', 150], ['barrels', 130], ['sacks', 120], ['shrooms', 130], ['candles', 100], ['joke', 200], ['bones', 120, 0.4]],
    wallDecor: ['herbs', 'shelf', 'cobweb'], props: ['barrels', 'bigShroom', 'stump'],
    signs: { tunnel: 'КЛАДОВАЯ', back: 'НАЗАД', down: 'В ПОГРЕБ', hole: 'НОРА', shaft: 'ЛИАНА', pit: 'ОМУТ', out: 'НАРУЖУ', deadend: 'ЗАПЕРТО', boss: 'КОМНАТА ВЕДЬМЫ' },
    jokes: [['ЗЕЛЬЯ НЕ ПИТЬ', 'ОСОБЕННО ЗЕЛЁНЫЕ'], ['ВЕДЬМА ДОБРАЯ', 'ПО СРЕДАМ'], ['ЖАБ НЕ ЦЕЛОВАТЬ', 'ЭТО НЕ ПРИНЦЫ']],
    npc: { hat: 'wizard', shape: 'cone', color: '#9aa3ad' },
  };

  // Дикая Пуща · 2 — чертоги Грибного Короля: гигантские грибы-колонны, споры, розово-бирюзовый свет
  T.wildwood_b = {
    region: 'Дикая Пуща', pillar: 'stalk', names: ['Чертоги Грибного Короля', 'Споровые залы'],
    pal: { wall: '#4e3e5e', wallL: '#5e4c70', wallD: '#382c46', floor: '#3a3048', floorL: '#463c56', ceil: '#0c0a14', stone: '#7a6a8a', stoneL: '#8c7c9c', stoneD: '#56486a',
      plant: '#5ab89a', plantL: '#9fe3c0', accent: '#e07ac0', accent2: '#ffcf4a', gem: '#7fd6e6', gem2: '#ff8fa3', glow: '#d0fff0', glow2: '#7ae0c0', banner: '#8a3a7a', bannerD: '#5e2454', signFill: '#4e3a26', deep0: '#2a2038', deep1: '#06040a' },
    deep: { wall: '#3a3054', floor: '#2c2640', accent: '#7fd6e6' },
    sky: ['#06040a', '#120e1c'], motes: ['#9fe3c0', '#ff8fa3', '#ffe59a'],
    wall: 'mossy', floor: 'moss', ceil: 'vines',
    frame: { tunnel: 'roots', back: 'roots', down: 'cave', hole: 'crack', shaft: 'vine', pit: 'hole', out: 'ladder' },
    sign: 'wood', light: ['mushroom', 'wisp'], rampChance: 0.35,
    decor: [['shrooms', 130], ['shrooms', 130], ['stump', 110], ['crystals', 120], ['rocks', 120], ['joke', 200], ['chest', 110, 0.4]],
    wallDecor: ['moss', 'gems', 'roots'], props: ['bigShroom', 'bigShroom', 'stump'],
    signs: { tunnel: 'ГРИБНОЙ ХОД', back: 'НАЗАД', down: 'ВНИЗ', hole: 'НОРА', shaft: 'ЛИАНА', pit: 'ЯМА', out: 'НАРУЖУ', deadend: 'ГРИБНИЦА', boss: 'ТРОН ГРИБОВ' },
    jokes: [['КОРОЛЬ ГРИБОВ', 'ПРИНИМАЕТ ПО ПЯТНИЦАМ'], ['СПОРЫ', 'НЕ ВДЫХАТЬ ГЛУБОКО'], ['ПОДОСИНОВИКИ', 'ВНЕ ОЧЕРЕДИ']],
    npc: { hat: 'beret', shape: 'egg', color: '#a8754f' },
  };

  // Каменный Хребет · 2 — гномья кузня-крепость: резной камень, наковальни, шестерни, щиты
  T.ridge_b = {
    region: 'Каменный Хребет', pillar: 'column', names: ['Кузня-крепость гномов', 'Чертог Наковален'],
    pal: { wall: '#6a6478', wallL: '#7c7690', wallD: '#4e4a5c', floor: '#454052', floorL: '#524c60', ceil: '#100e18', stone: '#8a8498', stoneL: '#9e98ac', stoneD: '#5e586e',
      accent: '#c8664a', accent2: '#e8b04a', cloth: '#7a3426', banner: '#7a3426', bannerD: '#5a2418', signFill: '#3e3a4a', signRim: '#e8b04a', deep0: '#3a2a2a', deep1: '#0a0808' },
    deep: { wall: '#4e4660', floor: '#38324a', accent: '#ff8a3d' },
    sky: ['#0a0810', '#18142a'], motes: ['#ffb24a', '#ffe59a'],
    wall: 'blocks', frieze: true, floor: 'tiles', ceil: 'blocks',
    frame: { tunnel: 'block', back: 'block', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'metal', light: ['brazier', 'lantern'], rampChance: 0.4,
    decor: [['anvil', 130], ['gear', 130], ['shields', 120], ['weaponRack', 130], ['barrels', 130], ['crates', 150], ['joke', 200], ['chest', 110, 0.3]],
    wallDecor: ['flag', 'vein', 'chains'], props: ['column', 'lampPost', 'barrels'],
    signs: { tunnel: 'ЧЕРТОГ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'ПОДЪЁМНИК', pit: 'ШАХТА', out: 'НАРУЖУ', deadend: 'ЗАПЕЧАТАНО', boss: 'ГЛАВНЫЙ ГОРН' },
    jokes: [['КУЙ', 'ПОКА ГОРЯЧО'], ['БОРОДОЙ', 'В МЕХАНИЗМ НЕ ЛЕЗТЬ'], ['ГНОМЫ ПРОТИВ', 'СКВОЗНЯКОВ']],
    npc: { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#f2a65a' },
  };

  // Ледяной Предел · 2 — замёрзшая крипта: кладка в инее, саркофаги, синие огни
  T.ice_b = {
    region: 'Ледяной Предел', pillar: 'column', names: ['Замёрзшая крипта', 'Гробница Ледяного Ярла'],
    pal: { wall: '#5a6888', wallL: '#6c7a9a', wallD: '#44506c', floor: '#465270', floorL: '#56628a', ceil: '#0a0e1a', stone: '#8a9ab4', stoneL: '#a0b0c8', stoneD: '#5a6a88',
      gem: '#bfe6ff', gem2: '#d8c8ff', snow: '#eef4ff', accent: '#7fd6e6', accent2: '#bfe6ff', glow: '#d8f0ff', glow2: '#7ab8e6', banner: '#3a5a8a', bannerD: '#24406a', signFill: '#3a4a6a', signRim: '#bfe6ff', deep0: '#24304a', deep1: '#06080e', hole: '#0a0e1a' },
    deep: { wall: '#46507a', floor: '#38406a' },
    sky: ['#05070e', '#0e1426'], motes: ['#ffffff', '#bfe6ff'],
    wall: 'frost', floor: 'tiles', ceil: 'ice',
    frame: { tunnel: 'arch', back: 'arch', down: 'arch', hole: 'crack', shaft: 'chute', pit: 'ice', out: 'slope' }, chuteColor: '#eef4ff', slopeColor: '#eef4ff',
    sign: 'ice', light: ['crystal', 'lantern'], rampChance: 0.35,
    decor: [['sarcophagus', 100], ['iceBlock', 120], ['snowDrift', 170], ['candles', 100], ['urns', 110], ['joke', 200], ['chest', 110, 0.3]],
    wallDecor: ['icicles', 'cobweb', 'mural'], props: ['iceSpire', 'column', 'snowman'],
    signs: { tunnel: 'КРИПТА', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ТРЕЩИНА', shaft: 'ЖЁЛОБ', pit: 'ПРОВАЛ', out: 'НАРУЖУ', deadend: 'ЗАМУРОВАНО', boss: 'ГРОБНИЦА ЯРЛА' },
    jokes: [['ЯРЛ СПИТ', 'ЕМУ ХОЛОДНО'], ['САРКОФАГИ', 'НЕ ОТКРЫВАТЬ ДО ВЕСНЫ'], ['ДЫХАНИЕ ВИДНО', 'ЗНАЧИТ ЖИВЫ']],
    npc: { hat: 'beret', shape: 'ball', color: '#f4f1ec' },
  };

  // Белый Венец · 2 — обсерватория на вершине: тёмно-синий камень, телескопы, глобусы, звёздные карты
  T.crown_b = {
    region: 'Белый Венец', pillar: 'column', names: ['Обсерватория Белого Венца', 'Башня Звездочётов'],
    pal: { wall: '#3e4a78', wallL: '#4c5a8c', wallD: '#2e385e', floor: '#3a3e5a', floorL: '#474c6c', ceil: '#080a18', stone: '#8a96c0', stoneL: '#a6b0d4', stoneD: '#5a6490',
      accent: '#4a7ab8', accent2: '#e8c060', gem: '#bfe6ff', snow: '#f4f6ff', cloth: '#3a6aa8', banner: '#24487a', bannerD: '#18305a', signFill: '#2e385e', signRim: '#e8c060', deep0: '#1e2448', deep1: '#04050c' },
    deep: { wall: '#30386a', floor: '#2e3250' },
    sky: ['#04050c', '#0e1228'], motes: ['#ffffff', '#ffe39a'],
    wall: 'blocks', frieze: false, floor: 'tiles', ceil: 'blocks',
    frame: { tunnel: 'arch', back: 'arch', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'stone', light: ['lantern', 'crystal'], rampChance: 0.4,
    decor: [['telescope', 120], ['globe', 90], ['bookshelf', 140], ['snowDrift', 170], ['urns', 110], ['joke', 200], ['chest', 110, 0.3]],
    wallDecor: ['starChart', 'window', 'starChart'], props: ['column', 'lampPost', 'iceSpire'],
    signs: { tunnel: 'ГАЛЕРЕЯ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ПРОЛОМ', shaft: 'ПОДЪЁМНИК', pit: 'ЛЮК', out: 'НАРУЖУ', deadend: 'ЗАМЕЛО', boss: 'ЗАЛ ТЕЛЕСКОПА' },
    jokes: [['ЗВЁЗДЫ НЕ ПАДАЮТ', 'ИХ РОНЯЮТ'], ['ТЕЛЕСКОП', 'НЕ ДЛЯ СОСЕДЕЙ'], ['ТИШЕ', 'КОМЕТЫ ПУГЛИВЫЕ']],
    npc: { hat: 'wizard', shape: 'tall', color: '#c9ccd3' },
  };

  // Выжженный Край · 2 — кузня Огненного Великана: клёпаный металл, фермы, цепи, наковальни
  T.scorch_b = {
    region: 'Выжженный Край', pillar: 'girder', names: ['Кузня Огненного Великана', 'Плавильни Пеплогорска'],
    pal: { wall: '#5a4448', wallL: '#6c5458', wallD: '#3e2e32', floor: '#3a2c2e', floorL: '#4a383a', ceil: '#120808', stone: '#6a5a5e', stoneL: '#7e6e72', stoneD: '#46383c',
      metal: '#b0a0a0', metalD: '#7a6a6e', accent: '#ff8a3d', accent2: '#e8a23d', lava: '#ff6a2a', lavaL: '#ffd27a', glow: '#ffd27a', glow2: '#ff7a2a', banner: '#8a2a14', bannerD: '#5e1c0c', signFill: '#3a2c2e', signRim: '#ff8a3d', deep0: '#5a1e12', deep1: '#1a0608' },
    deep: { wall: '#4a3034', floor: '#2e2022' },
    sky: ['#0e0606', '#1e0c0a'], motes: ['#ffb24a', '#ff7a2a'],
    wall: 'plates', floor: 'cracks', ceil: 'blocks',
    frame: { tunnel: 'basalt', back: 'basalt', down: 'block', hole: 'crack', shaft: 'chute', pit: 'lava', out: 'ladder' }, chuteColor: '#ff8a2a',
    sign: 'metal', light: ['brazier', 'lava'], rampChance: 0.35,
    decor: [['anvil', 130], ['gear', 130], ['lavaPool', 170], ['weaponRack', 130], ['barrels', 130], ['joke', 200], ['chest', 110, 0.4]],
    wallDecor: ['chains', 'lavaCrack', 'chains'], props: ['obsidian', 'barrels', 'rock'],
    signs: { tunnel: 'ЦЕХ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ТРЕЩИНА', shaft: 'ЖЁЛОБ', pit: 'ПЛАВИЛЬНЯ', out: 'НАРУЖУ', deadend: 'ОСТЫЛО', boss: 'ГОРН ВЕЛИКАНА' },
    jokes: [['ТЕХНИКА БЕЗОПАСНОСТИ', 'НЕ ВСПОМНИЛИ'], ['ВЕЛИКАН НА ОБЕДЕ', 'НЕ ТРОГАТЬ МОЛОТ'], ['ГОРЯЧИЙ ЦЕХ', 'ЛАПЫ БЕРЕЧЬ']],
    npc: { hat: 'bandana', shape: 'box', color: '#4a4350' },
    extra(P, ctx) { return T.scorch.extra(P, ctx); },
  };

  // Земли за Краем · 2 — часовая башня Безвременья: шестерни, циферблаты, латунь на фиолетовом
  T.beyond_b = {
    region: 'Земли за Краем', pillar: 'gears', names: ['Часовая башня Безвременья', 'Механизм Края'],
    pal: { wall: '#4a3a5e', wallL: '#5a4870', wallD: '#342844', floor: '#30283e', floorL: '#3c344c', ceil: '#08061a', stone: '#6a5a80', stoneL: '#7e6e94', stoneD: '#4a3e5e',
      accent: '#c8a2ff', accent2: '#e8b04a', gem: '#7fd6e6', gem2: '#c8a2ff', cloth: '#6a3a8a', glow: '#ffe2a0', glow2: '#e8a04a', banner: '#5a3a8a', bannerD: '#3a2460', signFill: '#342844', signRim: '#e8b04a', deep0: '#2a2050', deep1: '#04030c' },
    deep: { wall: '#2e2648', floor: '#221c34', accent2: '#c8a2ff' },
    sky: ['#04030c', '#100c24'], motes: ['#ffe39a', '#c8a2ff'],
    wall: 'plates', floor: 'tiles', ceil: 'crystal',
    frame: { tunnel: 'arch', back: 'arch', down: 'rune', hole: 'crack', shaft: 'portal', pit: 'hole', out: 'portal' },
    sign: 'metal', light: ['lantern', 'crystal'], rampChance: 0.4,
    decor: [['gear', 130], ['gear', 130], ['floatRock', 100], ['globe', 90], ['crystals', 120], ['joke', 200], ['chest', 110, 0.4]],
    wallDecor: ['clock', 'clock', 'runes'], props: ['crystalPillar', 'column', 'rock'],
    signs: { tunnel: 'ПРОХОД', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЩЕЛЬ', shaft: 'ПОРТАЛ', pit: 'ДЫРА', out: 'ДОМОЙ', deadend: 'ТУПИК ВРЕМЕНИ', boss: 'СЕРДЦЕ ЧАСОВ' },
    jokes: [['ОПАЗДЫВАТЬ', 'ЗДЕСЬ НЕВОЗМОЖНО'], ['ЧАСЫ НЕ ПОДВОДИТЬ', 'ОНИ ОБИДЧИВЫЕ'], ['ВЧЕРА', 'ЗАКРЫТО НА РЕМОНТ']],
    npc: { hat: 'tophat', shape: 'tall', color: '#b6a6c9' },
  };

  // Долины Ручьёв · 2 — мельничьи подвалы: доски, водяное колесо, жернова, мешки муки
  T.brooks_b = {
    region: 'Долины Ручьёв', pillar: 'beam', names: ['Мельничьи подвалы', 'Подвал Старого Мельника'],
    pal: { wall: '#6a5a48', wallL: '#7c6a56', wallD: '#4e4234', floor: '#4a443c', floorL: '#58524a', ceil: '#0e0c0a', wood: '#8a6a48', woodD: '#5a4630', woodL: '#a8845a', stone: '#8a8478', stoneL: '#a09a8c', stoneD: '#605a50',
      water: '#3a7aa8', waterL: '#8fdcf0', sand: '#e8dcc0', accent: '#4ab0ff', accent2: '#ffcf4a', banner: '#3a6a8a', bannerD: '#24485e', signFill: '#5a4630', deep0: '#2a2420', deep1: '#080606' },
    deep: { wall: '#4e4a54', floor: '#3a3a44' },
    sky: ['#080606', '#121010'], motes: ['#fff4e0', '#bfe6ff'],
    wall: 'planks', floor: 'planks', ceil: 'blocks',
    frame: { tunnel: 'door', back: 'door', down: 'arch', hole: 'crack', shaft: 'chute', pit: 'water', out: 'ladder' }, chuteColor: '#8fdcf0',
    sign: 'wood', light: ['lantern', 'jar'], rampChance: 0.3,
    decor: [['waterWheel', 280], ['millstone', 130], ['sacks', 120], ['sacks', 120], ['barrels', 130], ['crates', 150], ['joke', 200]],
    wallDecor: ['shelf', 'herbs', 'cobweb'], props: ['barrels', 'lampPost', 'rock'],
    signs: { tunnel: 'КЛАДОВАЯ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'ЖЁЛОБ', pit: 'ВОДОВОРОТ', out: 'НАРУЖУ', deadend: 'ЗАТОПЛЕНО', boss: 'ЖЕРНОВА' },
    jokes: [['МУКУ НЕ ЧИХАТЬ', 'ВЗЛЕТИТ'], ['КОЛЕСО КРУТИТСЯ', 'НЕ ЛЕЗТЬ'], ['МЕЛЬНИК СПИТ', 'НАВЕРХУ']],
    npc: { hat: 'chef', shape: 'ball', color: '#f4f1ec' },
  };

  // Срединные Земли · 2 — склеп старого рыцаря: серый камень, саркофаги, свечи, паутина
  T.midlands_b = {
    region: 'Срединные Земли', pillar: 'column', names: ['Склеп старого рыцаря', 'Усыпальница Перекрёстка'],
    pal: { wall: '#6a6070', wallL: '#7c7284', wallD: '#4e4656', floor: '#45404a', floorL: '#534e5a', ceil: '#0c0a10', stone: '#8a8290', stoneL: '#a098a6', stoneD: '#5e5866',
      accent: '#7a4a8a', accent2: '#e8c060', cloth: '#a3122a', banner: '#5a2a5a', bannerD: '#3a1a3a', signFill: '#4e4656', signRim: '#e8c060', deep0: '#2a2230', deep1: '#06040a' },
    deep: { wall: '#4e4660', floor: '#38323e' },
    sky: ['#06040a', '#120e16'], motes: ['#ffe59a', '#c8a2ff'],
    wall: 'blocks', frieze: false, floor: 'tiles', ceil: 'blocks',
    frame: { tunnel: 'arch', back: 'arch', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'stone', light: ['torch', 'lantern'], rampChance: 0.4,
    decor: [['sarcophagus', 100], ['candles', 100], ['statue', 120], ['urns', 110], ['shields', 120], ['joke', 200], ['chest', 110, 0.3]],
    wallDecor: ['cobweb', 'flag', 'cobweb'], props: ['column', 'lampPost', 'rock'],
    signs: { tunnel: 'КРИПТА', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'КОЛОДЕЦ', pit: 'ЛЮК', out: 'НАРУЖУ', deadend: 'ЗАМУРОВАНО', boss: 'ГРОБНИЦА РЫЦАРЯ' },
    jokes: [['РЫЦАРЬ ОТДЫХАЕТ', 'С 1312 ГОДА'], ['СВЕЧИ НЕ ЗАДУВАТЬ', 'ОНИ ПОМНЯТ'], ['ПАУКИ ДОБРЫЕ', 'ПОЧТИ']],
    npc: { hat: 'legion', shape: 'box', color: '#c9c4dc' },
  };

  // Сердце Мира · 2 — архив древних: книжные стены, глобусы, свитки, тёплые лампы
  T.heart_b = {
    region: 'Сердце Мира', pillar: 'column', names: ['Архив Древних', 'Библиотека Первых Королей'],
    pal: { wall: '#6e4a36', wallL: '#805a42', wallD: '#523626', floor: '#4a3a34', floorL: '#5a4840', ceil: '#100a08', wood: '#8a5a3a', woodD: '#5a3a24', woodL: '#a8744c', stone: '#c8b8a0', stoneL: '#dccdb6', stoneD: '#9a8a74',
      accent: '#3fa89a', accent2: '#e8c060', cloth: '#a3245a', gem: '#7fd6e6', banner: '#a3245a', bannerD: '#7a1a4a', signFill: '#5a3a24', signRim: '#e8c060', deep0: '#2a1e18', deep1: '#080604' },
    deep: { wall: '#4e3a3e', floor: '#3a2e32' },
    sky: ['#080604', '#140e0a'], motes: ['#ffe59a', '#fff4e0'],
    wall: 'shelves', floor: 'tiles', ceil: 'blocks',
    frame: { tunnel: 'arch', back: 'arch', down: 'arch', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'wood', light: ['lantern', 'jar'], rampChance: 0.4,
    decor: [['bookshelf', 140], ['globe', 90], ['candles', 100], ['statue', 120], ['chest', 110], ['urns', 110], ['joke', 200]],
    wallDecor: ['mural', 'starChart', 'flag'], props: ['column', 'lampPost', 'column'],
    signs: { tunnel: 'ХРАНИЛИЩЕ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ТАЙНИК', shaft: 'ПЛАТФОРМА', pit: 'ЛЮК', out: 'НАРУЖУ', deadend: 'СПЕЦХРАН', boss: 'ЗАПРЕТНЫЙ ЗАЛ' },
    jokes: [['ТИШИНА', 'КНИГИ СПЯТ'], ['ВЕРНУТЬ ДО', 'КОНЦА ЭПОХИ'], ['СВИТКИ НЕ МЯТЬ', 'ОНИ СТАРШЕ ВАС']],
    npc: { hat: 'tophat', shape: 'tall', color: '#e6e6ee' },
  };

  // Берега Внутреннего моря · 2 — затонувший корабль: обшивка, шпангоуты, иллюминаторы, пушки, сундуки
  T.shores_b = {
    region: 'Берега Внутреннего моря', pillar: 'hullRib', names: ['Затонувший корабль «Чайка»', 'Трюм Морского Змея'],
    pal: { wall: '#5a4a3e', wallL: '#6c5a4c', wallD: '#3e3228', floor: '#4a3e34', floorL: '#5a4c40', ceil: '#060a10', wood: '#8a6a4a', woodD: '#5a4430', woodL: '#a8845a', stone: '#7a8a98', stoneL: '#8e9eac', stoneD: '#56667a',
      water: '#2e6aa0', waterL: '#7fd6e6', accent: '#3fa89a', accent2: '#e8c060', cloth: '#a3122a', banner: '#2e6aa0', bannerD: '#1e4a74', signFill: '#5a4430', deep0: '#1e2a36', deep1: '#04080c' },
    deep: { wall: '#3e4250', floor: '#363a44', waterL: '#9fe3c0' },
    sky: ['#04080c', '#0a121c'], motes: ['#bfe6ff', '#9fe3c0'],
    wall: 'hull', floor: 'planks', ceil: 'blocks',
    frame: { tunnel: 'door', back: 'door', down: 'arch', hole: 'crack', shaft: 'chute', pit: 'water', out: 'ladder' }, chuteColor: '#7fd6e6',
    sign: 'wood', light: ['lantern', 'jar'], rampChance: 0.25,
    decor: [['cannon', 200], ['barrels', 130], ['chest', 110], ['anchor', 130], ['shells', 110], ['crates', 150], ['joke', 200]],
    wallDecor: ['porthole', 'porthole', 'net'], props: ['barrels', 'coralRock', 'rock'],
    signs: { tunnel: 'ТРЮМ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ПРОБОИНА', shaft: 'ЛЮК', pit: 'ВОДОВОРОТ', out: 'НАВЕРХ', deadend: 'ЗАТОПЛЕНО', boss: 'КАЮТА КАПИТАНА' },
    jokes: [['КАПИТАН УШЁЛ', 'НА ДНО'], ['ПУШКИ НЕ ЗАРЯЖЕНЫ', 'НАВЕРНОЕ'], ['ВОДА ВЕЗДЕ', 'ЭТО НОРМАЛЬНО']],
    npc: { hat: 'tophat', shape: 'ball', color: '#9aa3ad' },
  };

  // Восточная Марка · 2 — подземный арсенал / осадная мастерская: разобранные баллисты и катапульты, ящики стрел,
  // точильный камень, карты укреплений, цепи и лебёдки. Фирменное: под сводом по рельсу ездит тележка с вязанкой болтов (1 SMIL)
  T.marka_b = {
    region: 'Восточная Марка', pillar: 'hoist', names: ['Арсенал Восточной Марки', 'Осадная мастерская'],
    pal: { wall: '#4c5560', wallL: '#5a6470', wallD: '#3a424c', floor: '#45403a', floorL: '#544e46', ceil: '#0c0e12', stone: '#7e8690', stoneL: '#949ca6', stoneD: '#565e68',
      wood: '#9a6a3e', woodD: '#62422a', woodL: '#ba8a56', metal: '#cfd4da', metalD: '#8e96a0', accent: '#d8a040', accent2: '#ffcf4a', cloth: '#a3122a', sand: '#e8dcb8',
      banner: '#2f5e4e', bannerD: '#1e3e34', signFill: '#3a424c', signRim: '#d8a040', glow: '#ffe0a0', glow2: '#ffb04a', deep0: '#20262e', deep1: '#06070a' },
    deep: { wall: '#3e4458', wallL: '#4a5068', floor: '#36343a' },
    sky: ['#06070a', '#12151c'], motes: ['#ffe0a0', '#ffb04a'],
    wall: 'blocks', frieze: false, floor: 'planks', ceil: 'blocks',
    frame: { tunnel: 'door', back: 'door', down: 'block', hole: 'crack', shaft: 'lift', pit: 'hole', out: 'ladder' },
    sign: 'metal', light: ['lantern', 'brazier'], rampChance: 0.3,
    decor: [['ballistaParts', 200], ['catapult', 250], ['arrowCrates', 150], ['grindstone', 130], ['winch', 170], ['barrels', 130, 0, 0.5], ['joke', 200], ['chest', 110, 0.4]],
    wallDecor: ['fortMap', 'fortMap', 'chains', 'warBanner'], props: ['bolt', 'dummy', 'barrels'],
    signs: { tunnel: 'ЦЕХ', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'ЛЕБЁДКА', pit: 'ЛЮК', out: 'НАРУЖУ', deadend: 'СКЛАД', boss: 'ОСАДНЫЙ ДВОР' },
    jokes: [['БАЛЛИСТУ НЕ ЗАРЯЖАТЬ', 'СОБОЙ'], ['СТРЕЛЫ ПОСЧИТАНЫ', 'ВСЕ 4012 ШТУК'], ['КАТАПУЛЬТА', 'НЕ АТТРАКЦИОН'], ['ЧЕРТЕЖИ НЕ ТРОГАТЬ', 'ЛАПЫ В МАСЛЕ'], ['ТОЧИТЬ КОГТИ', 'СТРОГО ПО ЗАПИСИ']],
    npc: { hat: 'bandana', acc: ['mustache'], shape: 'box', color: '#8a8f99' },
    fxOver: true,
    extra(P, ctx) {
      const { O, INK, pal } = P;
      return ctx.gaps.filter((g) => g[1] - g[0] >= 380).slice(0, Math.min(2, ctx.S)).map((g) => {
        const x0 = Math.round(g[0] + 40), x1 = Math.round(g[1] - 40), d = x1 - x0 - 150, on = P.anim();
        let ch = ''; for (let y = 280; y < 304; y += 12) ch += P.blob(0, y, 3.5, 6);
        return `<path d="M${x0} 262 H${x1}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${x0} 262 H${x1}" stroke="${pal.metalD}" stroke-width="6" stroke-linecap="round"/>`
          + `<g transform="translate(${x0 + 75} 0)"><g>${on ? `<animateTransform attributeName="transform" type="translate" values="0 0;${d} 0;${d} 0;0 0;0 0" keyTimes="0;.4;.5;.9;1" dur="12s" repeatCount="indefinite"/>` : ''}`
          + `<rect x="-18" y="252" width="36" height="18" rx="5" fill="${pal.wood}" ${O(3)}/><path d="${P.blob(-10, 262, 5, 5)}${P.blob(10, 262, 5, 5)}${ch}" fill="${pal.iron}" stroke="${INK}" stroke-width="2.4"/>`
          + `<path d="M-56 318 L56 308 M-56 310 L56 300 M-56 302 L56 292" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-56 318 L56 308 M-56 310 L56 300 M-56 302 L56 292" stroke="${pal.woodL}" stroke-width="4" stroke-linecap="round"/>`
          + `<path d="M56 286 l14 6 l-12 9 Z M56 302 l14 6 l-12 9 Z" fill="${pal.metal}" stroke="${INK}" stroke-width="1.6"/></g></g>`;
      }).join('');
    },
  };

  /* ===================== HW: ИЗНАНКА — «Ночь Тыквенной Луны» (склеп Джека; только в стиле Котиков) ===================== */
  // тыквы-фонари у стены и паутина под сводом — общий эффект двух вариаций Изнанки (1 SMIL на фонарь)
  function hwPumpkins(P, ctx) {
    const { O, INK } = P;
    return spotsIn(ctx, P, Math.max(1, ctx.S), 160).map((x, i) => {
      const on = P.anim() && i < 2;
      return `<ellipse cx="${x}" cy="760" rx="70" ry="44" fill="#ffb347" opacity=".14"/><ellipse cx="${x}" cy="772" rx="34" ry="26" fill="#ff7a1a" ${O(3)}/><path d="M${x - 14} 748 q-6 24 0 48 M${x + 14} 748 q6 24 0 48" stroke="#c4520e" stroke-width="3" fill="none"/>`
        + `<path d="M${x - 20} 766 l8 -11 l8 11 z M${x + 4} 766 l8 -11 l8 11 z M${x - 20} 780 q20 13 40 0 l-7 5 l-6 -5 l-7 6 l-7 -6 l-6 5 z" fill="#ffd34d" ${O(1.6)}>${on ? '<animate attributeName="opacity" values=".75;1;.6;.95" dur="1.3s" repeatCount="indefinite"/>' : ''}</path>`
        + `<path d="M${x} 746 q2 -12 12 -14" stroke="#4e7a2e" stroke-width="6" fill="none" stroke-linecap="round"/>`
        + `<path d="M${x - 90} 250 L${x - 30} 250 M${x - 90} 250 L${x - 90} 310 M${x - 90} 250 L${x - 48} 292 M${x - 74} 250 q-2 14 -16 16 M${x - 56} 250 q-2 30 -34 34 M${x - 40} 250 q0 44 -50 50" stroke="#e8e0f4" stroke-width="1.8" fill="none" opacity=".7"/>`;
    }).join('');
  }
  // вариация 1 — Тыквенный склеп: тёмный камень, фиолетовые ниши, зелёные огоньки, кости и сундуки
  T.hollow = {
    pillar: 'column',
    region: 'Изнанка', names: ['Тыквенный склеп', 'Склеп Скупого Джека', 'Усыпальница Тыквенной Луны'],
    pal: { wall: '#4a4058', wallL: '#5a4e6a', wallD: '#342c40', floor: '#3a3242', floorL: '#463c50', ceil: '#100a18', stone: '#5a5068', stoneL: '#6e6280', stoneD: '#3a3246',
      accent: '#ff7a1a', accent2: '#6dffb0', banner: '#5b3fa0', bannerD: '#3a2470', signFill: '#2e2438', signRim: '#ff8a1f', cloth: '#5b3fa0', glow: '#6dffb0', glow2: '#ffb347',
      gem: '#b98aff', gem2: '#6dffb0', deep0: '#1e1428', deep1: '#06040a' },
    deep: { wall: '#2e2640', wallL: '#3a3050', floor: '#2a2234', accent: '#b98aff' },
    sky: ['#06040a', '#100a18'], motes: ['#6dffb0', '#ffb347', '#b98aff'],
    wall: 'blocks', frieze: true, floor: 'cracks', ceil: 'blocks',
    frame: { tunnel: 'arch', back: 'arch', down: 'arch', hole: 'crack', shaft: 'portal', pit: 'hole', out: 'portal' },
    sign: 'stone', light: ['wisp', 'jar', 'brazier'], rampChance: 0.3,
    decor: [['urns', 110], ['bones', 120], ['statue', 120], ['candles', 100], ['brokenColumn', 120], ['chest', 110, 0.3], ['joke', 200], ['cauldron', 120, 0.4]],
    wallDecor: ['cobweb', 'mural', 'gems'], props: ['column', 'stalagmite', 'rock'],
    signs: { tunnel: 'СКЛЕП', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'ВОРОНКА', pit: 'МОГИЛА', out: 'НАРУЖУ', deadend: 'ЗАМУРОВАНО', boss: 'КАЗНА ДЖЕКА' },
    jokes: [['НЕ ВОРОШИТЬ', 'КОСТИ ОТДЫХАЮТ'], ['КОНФЕТЫ ДЖЕКА', 'НЕ ТРОГАТЬ!!!'], ['СЛАДОСТЬ ИЛИ ГАДОСТЬ', 'ВЫБИРАЙ НАРУЖИ'], ['ТЫКВЫ НЕ ЕСТЬ', 'ОНИ ЕЩЁ СВЕТЯТ']],
    npc: { hat: 'witch', shape: 'cone', color: '#7b3fe4' },
    extra(P, ctx) { return hwPumpkins(P, ctx); },
  };
  // вариация 2 — Подвал Тыквенной Ведьмы: доски, полки банок, котлы, сушёные мухоморы
  T.hollow_b = {
    region: 'Изнанка', pillar: 'beam', names: ['Подвал Ведьмы', 'Кладовая Тыквенной Ведьмы'],
    pal: { wall: '#4a3a3a', wallL: '#5a4846', wallD: '#2e2222', floor: '#3a2e2e', floorL: '#46383a', ceil: '#0c0808', wood: '#6a4a32', woodD: '#4a3220', woodL: '#8a6442', stone: '#5a5060', stoneL: '#6a6070', stoneD: '#3a3440',
      plant: '#4e7a2e', plantL: '#9fe36a', gem: '#6dffb0', gem2: '#ff9ad0', accent: '#ff7a1a', accent2: '#6dffb0', cloth: '#5b3fa0', glow: '#ffd34d', glow2: '#6dffb0', banner: '#ff7a1a', bannerD: '#c4520e', signFill: '#4a3220', deep0: '#1e1414', deep1: '#060404' },
    deep: { wall: '#36283a', floor: '#2a2028' },
    sky: ['#060404', '#0c0808'], motes: ['#ffd34d', '#6dffb0'],
    wall: 'planks', floor: 'planks', ceil: 'roots',
    frame: { tunnel: 'door', back: 'door', down: 'arch', hole: 'crack', shaft: 'portal', pit: 'hole', out: 'ladder' },
    sign: 'wood', light: ['jar', 'lantern', 'wisp'], rampChance: 0.2,
    decor: [['cauldron', 120], ['potions', 150], ['sacks', 120], ['shrooms', 130], ['candles', 100], ['barrels', 130], ['joke', 200], ['chest', 110, 0.4]],
    wallDecor: ['herbs', 'shelf', 'cobweb'], props: ['barrels', 'bigShroom', 'stump'],
    signs: { tunnel: 'КЛАДОВАЯ', back: 'НАЗАД', down: 'В ПОГРЕБ', hole: 'НОРА', shaft: 'ВОРОНКА', pit: 'ЛЮК', out: 'НАРУЖУ', deadend: 'ЗАПЕРТО', boss: 'КАЗНА ДЖЕКА' },
    jokes: [['ЗЕЛЬЕ ЖАБЫ', 'НЕ ДЛЯ ЛЮДЕЙ'], ['МЕТЛЫ НЕ БРАТЬ', 'ОНИ КУСАЮТСЯ'], ['ТЫКВЫ СОЧТЕНЫ', 'ВСЕ 666']],
    npc: { hat: 'witch', shape: 'cone', color: '#ff8a1f' },
    extra(P, ctx) { return hwPumpkins(P, ctx); },
  };
})();

} catch (e) { console.error('[стили] styles/cats/dungeon-themes.js не загрузился:', e); }

/* ───── стиль «cats»: styles/cats/dungeon.js ───── */
try {
/* Стиль «Котики» (рисовка) — ГЕНЕРАТОР КОМНАТ ДАНЖА (id локации: dungeon).
   Рисовка как у Мурлыкиной ярмарки: тёмная тёплая обводка #2b1d18, плоские заливки, Russo One, книжный юмор.
   Содержание — от РЕГИОНА карты мира: темы лежат в styles/cats/dungeon-themes.js (порядок загрузки файлов не важен).

   Вход: env.room — описание комнаты (его выдаёт modules/dungeon/map.js):
     { region, type: 'start'|'fork'|'deadend'|'descent'|'final', seed, floor, floors, depth: 0..1, name,
       screens?: 1..3, exits: [{ key, kind, label, to }] }        // до 5 проходов, первый — назад/наружу
   Выход: обычный объект локации по договору addLocation (как у Ярмарки) + поля:
     walkPoly — неровный пол (пандусы); boss — точка босса в финальной комнате; meta — служебное.
   Генерация детерминирована: одна и та же room → одна и та же картинка. Никаких Math.random, таймеров, фильтров. */
(function () {
  'use strict';
  if (!window.MDDoodle || !window.MDDoodle.addLocation) return;
  const D = window.MDDoodle;
  D.dungeonThemes = D.dungeonThemes || {};

  /* ===================== константы кадра ===================== */
  const SW = 1920, B = 792;                       // ширина экрана; низ стены (основания проходов)
  const VIEW_NAMES = ['square', 'rows', 'far'];
  const KEY_COLORS = { back: '#9aa0b4', e1: '#ff8a3d', e2: '#e07ac0', e3: '#3fc4a8', e4: '#6ec6ff', leave: '#9aa0b4', forge: '#ff8a3d', tent: '#e07ac0', rows: '#3fc4a8', secret: '#ffcf4a' };
  const TYPE_NAMES = { start: 'ВХОД', fork: 'РАЗВИЛКА', deadend: 'ТУПИК', descent: 'СПУСК', final: 'ЛОГОВО', treasury: 'СОКРОВИЩНИЦА' };
  const INK = '#2b1d18', CREAM = '#fff4e0', PINK = '#ff8fa3', GOLD = '#ffcf4a';

  // палитра по умолчанию (тема переопределяет)
  const BASE_PAL = {
    wall: '#8a5a48', wallL: '#9c6a55', wallD: '#6e4436', floor: '#6a4a40', floorL: '#76554a', ceil: '#1d141c',
    stone: '#9a8a8a', stoneL: '#b8a8a4', stoneD: '#6e6068', wood: '#a8754f', woodD: '#6e4a2f', woodL: '#c08a5c',
    metal: '#c9ccd6', metalD: '#9aa0ae', iron: '#2a2440', accent: '#3fa89a', accent2: '#ffcf4a', gem: '#7fd6e6', gem2: '#b9a2ff',
    water: '#4a7aa8', waterL: '#7fd6e6', lava: '#ff7a2a', lavaL: '#ffd27a', plant: '#5aa86a', plantL: '#9fe39a', bone: '#f3e6c8',
    banner: '#a3245a', bannerD: '#7a1a4a', signFill: '#6e4a2f', signRim: '#ffcf4a', cloth: '#a3122a', sand: '#c49260', snow: '#eef4ff',
    hole: '#14112a', deep0: '#3a2636', deep1: '#0c0914', glow: '#ffe59a', glow2: '#ffbe5a', cold: '#9fd8ff',
  };

  /* ===================== утилиты ===================== */
  const f1 = (v) => +(+v).toFixed(1);
  function hash(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) || 1; }
  function mix(a, b, t) {
    if (!b || a === b) return a;
    const p = (c, i) => parseInt(c.substr(i, 2), 16);
    return '#' + [1, 3, 5].map((i) => Math.round(p(a, i) * (1 - t) + p(b, i) * t).toString(16).padStart(2, '0')).join('');
  }
  const pathOf = (pts) => 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L') + ' Z';
  // 23.10: проход — своя группа с ключом (data-k): сайт по ней подсвечивает проход при наведении и голосует кликом; оверлею не мешает
  const exitG = (key, svg) => `<g class="dg-ex" data-k="${String(key).replace(/[^\w-]/g, '')}">${svg}</g>`;
  // 23.10: что говорит проводник у входа, когда зритель нажимает на него на сайте (только у этого зрителя, не на стриме и не в чат)
  const NPC_SAY = {
    sands: ['Песок помнит каждого, кто сюда спускался. Почти никого — живым.', 'Здесь спят. Не будите, если сможете.', 'Ветер наверху стих. Внизу он не дул никогда.', 'Факелы гаснут раньше, чем кажется. Считайте шаги.', 'Я вожу сюда уже много лет. Обратно — реже.'],
    rot: ['Вода тут стоячая, а всё равно куда-то течёт.', 'Не трогайте огоньки над трясиной. Они не для вас.', 'Храм утонул не сразу. Сначала замолчал колокол.', 'Пахнет тиной и чем-то старше тины.', 'Если позовут по имени — не оборачивайтесь.'],
    wildwood: ['Корни слушают. Говорите тише.', 'Светлячки ведут вниз. Не все — туда, куда нужно.', 'Древо помнит тех, кто приходил с огнём.', 'Здесь грибы растут на том, что осталось от путников.', 'Лес наверху шумит. Здесь он молчит и смотрит.'],
    ridge: ['Гномы ушли отсюда в одну ночь. Инструменты оставили.', 'Слышите стук? Это не мы.', 'Жила тянется вглубь, а с ней и беда.', 'Крепь старая. Не шумите у сводов.', 'Каждая выработка где-то кончается. Не каждая — тупиком.'],
    ice: ['Лёд держит свет, как память — недолго и холодно.', 'Не смотрите долго в стены. Там кто-то смотрит в ответ.', 'Здесь тихо так, что слышно, как мёрзнет дыхание.', 'Внизу ещё холоднее. И ещё тише.', 'В хрустале застыли те, кто не дошёл. Им не больно.'],
    crown: ['Колокола обители звонят сами. Раз в сто лет — или чаще.', 'Монахи ушли наверх и не вернулись.', 'Снег сюда не падает. Он здесь был всегда.', 'Орлы кружат над крепостью. Значит, кто-то ещё внутри.', 'Молитвы на стенах стёрты. Будто кто-то не хотел их слышать.'],
    scorch: ['Камень здесь тёплый, как живой.', 'Пепел оседает на плечах. Это не только пепел.', 'Горнило остыло давно. Иногда оно об этом забывает.', 'Не наступайте на трещины — под ними свет.', 'Здесь ковали то, что лучше было не ковать.'],
    beyond: ['За Краем время идёт иначе. Не считайте часов.', 'Звёзды здесь светят снизу.', 'Я вёл сюда отряд. Вчера. Или в прошлом году.', 'Руины старше мира, на котором стоят.', 'Если тропа вернулась к началу — значит, так и было задумано.'],
    brooks: ['Ручьи поют. Слов не разобрать, а мотив знакомый.', 'Вода точит камень. И тех, кто стоит слишком долго.', 'Под водопадом есть ход. Под ходом — ещё вода.', 'Мельник уверял, что слышит тут голоса. Мельника давно нет.', 'Здесь всё мокрое, кроме слёз. Те высыхают сразу.'],
    midlands: ['Перекрёсток наверху, перекрёсток и внизу. Только дорог больше.', 'Разбойники прятали здесь добро. Добро осталось.', 'Старый рыцарь клялся охранять этот склеп. Клятвы тут крепкие.', 'Подвалы тянутся под всем городом. Под старым городом.', 'Не берите ничего, что не просит, чтобы его взяли.'],
    heart: ['Катакомбы помнят первых королей. Короли — нет.', 'Сердце мира бьётся медленно. Прислушайтесь.', 'Тут каждая плита — чьё-то имя.', 'Книги в архиве шепчут, когда их не читают.', 'Глубже — старше. Ещё глубже — тише.'],
    shores: ['Море ушло, а запах соли остался.', 'Контрабандисты не оставляют карт. Только кости.', 'Корабль «Чайка» так и не дошёл до берега.', 'В гроте слышно прибой. Хотя моря тут нет.', 'Утопленники здесь вежливые. Пока не голодны.'],
    marka: ['Казематы строили надолго. Узники так и остались.', 'Дозорные ушли со стены. Стена осталась ждать.', 'Арсенал полон. Только оружие тут больше не слушается.', 'Ключи от камер давно потеряны. Двери — нет.', 'Здесь служили. Служат до сих пор.'],
    hollow: ['Тыквы светятся изнутри. Не спрашивайте, чем.', 'Хозяин склепа не делится. Даже темнотой.', 'В склепе пахнет корицей и сырой землёй.', 'Здесь луна всегда полная. И всегда смотрит.', 'Конфеты тут сладкие. Не берите последнюю.'],
  };

  /* =====================================================================================
     КИСТИ: всё рисование. P создаётся на каждую комнату (палитра уже смешана по глубине).
     ===================================================================================== */
  function makeKit(pal, rnd, esc) {
    let SMIL = 0;
    const P = { pal, rnd, esc, INK, CREAM, PINK, GOLD, f1, pathOf, mix };
    P.anim = (n = 1) => { if (SMIL + n > 38) return false; SMIL += n; return true; };   // бюджет SMIL на сцену ≤ ~40
    P.smil = () => SMIL;
    P.pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    P.O = (w = 5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const O = P.O;
    P.txt = (x, y, t, size, fill = GOLD) => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-family="Russo One" font-size="${size}" fill="${fill}" stroke="${INK}" stroke-width="${Math.max(3, size / 7).toFixed(1)}" paint-order="stroke">${esc(t)}</text>`;
    P.shadow = (cx, cy, rx) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${Math.max(3, Math.round(rx * 0.18))}" fill="${INK}" opacity=".3"/>`;
    P.blob = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0Z`;
    P.defs = () => '<defs>'
      + `<radialGradient id="ctGlow"><stop offset="0" stop-color="${pal.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${pal.glow2}" stop-opacity="0"/></radialGradient>`
      + '<radialGradient id="ctFire"><stop offset="0" stop-color="#ffb24a" stop-opacity=".9"/><stop offset=".5" stop-color="#ff7a2a" stop-opacity=".35"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="ctMoon"><stop offset="0" stop-color="#fff6d0" stop-opacity=".9"/><stop offset=".4" stop-color="#ffe9a8" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="ctWarm" cx=".5" cy=".7" r=".8"><stop offset="0" stop-color="#ffe9c8"/><stop offset=".6" stop-color="#f0a0a8"/><stop offset="1" stop-color="#8a3a5a"/></radialGradient>'
      + `<radialGradient id="dgGem"><stop offset="0" stop-color="${pal.gem}" stop-opacity=".85"/><stop offset="1" stop-color="${pal.gem}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="dgGem2"><stop offset="0" stop-color="${pal.gem2}" stop-opacity=".8"/><stop offset="1" stop-color="${pal.gem2}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="dgPlant"><stop offset="0" stop-color="${pal.plantL}" stop-opacity=".75"/><stop offset="1" stop-color="${pal.plantL}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="dgAccent"><stop offset="0" stop-color="${pal.accent}" stop-opacity=".8"/><stop offset="1" stop-color="${pal.accent}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="dgLava"><stop offset="0" stop-color="${pal.lavaL}" stop-opacity=".95"/><stop offset=".5" stop-color="${pal.lava}" stop-opacity=".45"/><stop offset="1" stop-color="${pal.lava}" stop-opacity="0"/></radialGradient>`
      + '<radialGradient id="dgRed"><stop offset="0" stop-color="#ff5a4a" stop-opacity=".85"/><stop offset="1" stop-color="#ff5a4a" stop-opacity="0"/></radialGradient>'
      + `<linearGradient id="dgDeep" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${pal.deep0}"/><stop offset=".55" stop-color="${mix(pal.deep0, pal.deep1, 0.6)}"/><stop offset="1" stop-color="${pal.deep1}"/></linearGradient>`
      + '<linearGradient id="dgLavaIn" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffb24a"/><stop offset=".45" stop-color="#c8442a"/><stop offset="1" stop-color="#2a0e12"/></linearGradient>'
      + '<linearGradient id="dgNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1a4a"/><stop offset="1" stop-color="#5a3a7a"/></linearGradient>'
      + `<linearGradient id="dgCeil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.ceil}" stop-opacity="0"/><stop offset=".55" stop-color="${pal.ceil}" stop-opacity=".85"/><stop offset="1" stop-color="${pal.ceil}"/></linearGradient>`
      + `<linearGradient id="dgWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.waterL}"/><stop offset="1" stop-color="${pal.water}"/></linearGradient>`
      + '<linearGradient id="ctFloorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14112a" stop-opacity=".45"/><stop offset="1" stop-color="#14112a" stop-opacity="0"/></linearGradient>'
      + '</defs>';

    /* ---------- таблички, баннер, стрелки ---------- */
    // тема задаёт материал таблички: wood (доска), stone (плита с каймой), ice (льдинка), metal (жесть)
    P.signStyle = 'wood';
    P.sign = (cx, cy, w, h, lines, rot = 0) => {
      const st = P.signStyle;
      const fill = st === 'stone' ? pal.stoneD : st === 'ice' ? mix(pal.gem, '#2a4a6a', 0.55) : st === 'metal' ? '#5a5470' : pal.signFill;
      let s = `<g transform="rotate(${rot} ${f1(cx)} ${f1(cy)})"><rect x="${f1(cx - w / 2)}" y="${f1(cy - h / 2)}" width="${w}" height="${h}" rx="${st === 'ice' ? 12 : 7}" fill="${fill}" ${O(4)}/>`;
      if (st === 'wood') s += `<circle cx="${f1(cx - w / 2 + 9)}" cy="${f1(cy - h / 2 + 9)}" r="3" fill="${INK}" opacity=".7"/><circle cx="${f1(cx + w / 2 - 9)}" cy="${f1(cy - h / 2 + 9)}" r="3" fill="${INK}" opacity=".7"/>`;
      else s += `<rect x="${f1(cx - w / 2 + 7)}" y="${f1(cy - h / 2 + 7)}" width="${w - 14}" height="${h - 14}" rx="4" fill="none" stroke="${pal.signRim}" stroke-width="2.4" opacity=".8"/>`;
      lines.forEach(([t, size, col], i) => { s += P.txt(cx, cy - h / 2 + h * (i + 1) / (lines.length + 1) + size * 0.36, t, size, col || CREAM); });
      return s + '</g>';
    };
    P.signW = (t, size) => Math.max(120, Math.round(String(t).length * size * 0.72 + 46));
    P.banner = (cx, text, sub) => {   // 23.10: вывеска выше — подпись (регион · этаж · комната) целиком внутри золотой рамки
      const w = Math.max(460, text.length * 29 + 100, sub.length * 10.5 + 140);
      return `<path d="M${cx - w / 2 + 40} 0 V40 M${cx + w / 2 - 40} 0 V40" stroke="${pal.metalD}" stroke-width="4"/>`
        + `<path d="M${cx - w / 2 - 34} 56 L${cx - w / 2} 42 V114 L${cx - w / 2 - 34} 100 L${cx - w / 2 - 18} 78 Z M${cx + w / 2 + 34} 56 L${cx + w / 2} 42 V114 L${cx + w / 2 + 34} 100 L${cx + w / 2 + 18} 78 Z" fill="${pal.bannerD}" ${O(5)}/>`
        + `<rect x="${cx - w / 2}" y="38" width="${w}" height="80" rx="10" fill="${pal.banner}" ${O(6)}/>`
        + `<rect x="${cx - w / 2 + 10}" y="47" width="${w - 20}" height="62" rx="6" fill="none" stroke="${GOLD}" stroke-width="3"/>`
        + P.txt(cx, 80, text, text.length > 22 ? 24 : 30) + P.txt(cx, 101, sub, 14, CREAM)
        + `<path d="M${cx - w / 2 + 28} 78 l8 -8 l8 8 l-8 8 Z M${cx + w / 2 - 44} 78 l8 -8 l8 8 l-8 8 Z" fill="${GOLD}" ${O(2.4)}/>`;
    };
    P.arrowDown = (x, y, col = GOLD) => `<path d="M${x - 14} ${y} h28 v40 h17 l-31 34 l-31 -34 h17 Z" fill="${col}" ${O(3.5)}/>`;
    P.arrowBack = (x, y) => `<path d="M${x} ${y} h-26 v-17 l-36 29 l36 29 v-17 h26 Z" fill="${CREAM}" ${O(3.5)}/>`;
    P.arrowUp = (x, y) => `<path d="M${x - 14} ${y} h28 v-40 h17 l-31 -34 l-31 34 h17 Z" fill="${CREAM}" ${O(3.5)}/>`;

    /* ---------- свет ---------- */
    P.light = (kind, x, y, s = 1) => {
      const k = (hash(kind + x + ':' + y) % 100) / 100, on = P.anim();
      const flick = (dur) => (on ? `<animate attributeName="opacity" values=".6;.88;.66;.82;.6" dur="${(dur + k).toFixed(2)}s" repeatCount="indefinite"/>` : '');
      switch (kind) {
        case 'jar': return `<circle cx="${x}" cy="${y + 40 * s}" r="${66 * s}" fill="url(#ctGlow)" opacity=".7">${flick(2.6)}</circle>`
          + `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 V14" stroke="${pal.metalD}" stroke-width="3"/><rect x="-15" y="14" width="30" height="9" rx="3" fill="${pal.metalD}" ${O(3)}/>`
          + `<path d="M-14 23 H14 Q18 23 18 30 V54 Q18 62 10 62 H-10 Q-18 62 -18 54 V30 Q-18 23 -14 23 Z" fill="${pal.glow}" ${O(3.5)}/><rect x="-5" y="40" width="10" height="18" rx="2" fill="${CREAM}" ${O(2.4)}/>`
          + '<path d="M0 40 C-5 34 -3 28 0 24 C3 28 5 34 0 40 Z" fill="#ff8a2a"/><path d="M-11 30 v14" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/></g>';
        case 'lantern': return `<circle cx="${x}" cy="${y + 44 * s}" r="${70 * s}" fill="url(#ctGlow)" opacity=".72">${flick(2.2)}</circle>`
          + `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 V12" stroke="${pal.iron}" stroke-width="4"/><path d="M-14 14 H14 L9 24 H-9 Z" fill="${pal.iron}" ${O(2.6)}/>`
          + `<rect x="-12" y="24" width="24" height="30" rx="4" fill="${pal.glow}" ${O(3)}/><path d="M0 24 V54" stroke="${INK}" stroke-width="2.4" opacity=".45"/><rect x="-14" y="53" width="28" height="7" rx="2" fill="${pal.iron}" ${O(2.6)}/></g>`;
        case 'torch': return `<circle cx="${x}" cy="${y - 30 * s}" r="${80 * s}" fill="url(#ctFire)" opacity=".8">${flick(1.2)}</circle>`
          + `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 0 l4 -26 h4 l4 26 z" fill="${pal.woodD}" ${O(3)}/><path d="M-10 -24 h20" stroke="${pal.iron}" stroke-width="5"/>`
          + '<path d="M0 -22 C-13 -26 -15 -46 0 -68 C15 -46 13 -26 0 -22 Z" fill="#ff8a2a" stroke="#ffd76a" stroke-width="3" stroke-linejoin="round"/><path d="M0 -26 C-6 -30 -6 -40 0 -50 C6 -40 6 -30 0 -26 Z" fill="#ffe27a"/></g>';
        case 'brazier': return `<circle cx="${x}" cy="${y - 24 * s}" r="${86 * s}" fill="url(#ctFire)" opacity=".8">${flick(1.4)}</circle>`
          + `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 8 L0 44 L8 8" fill="${pal.iron}" ${O(3)}/><path d="M-26 -4 H26 Q22 14 0 14 Q-22 14 -26 -4 Z" fill="${pal.accent}" ${O(3.5)}/>`
          + '<path d="M0 -4 C-18 -10 -16 -34 -2 -52 C2 -36 16 -34 16 -16 C16 -8 8 -4 0 -4 Z" fill="#ff8a2a" stroke="#ffd76a" stroke-width="3" stroke-linejoin="round"/><path d="M1 -8 C-6 -14 -4 -26 2 -32 C8 -24 8 -14 1 -8 Z" fill="#ffe27a"/></g>';
        case 'crystal': return `<circle cx="${x}" cy="${y}" r="${74 * s}" fill="url(#dgGem)" opacity=".75">${flick(3.2)}</circle>`
          + `<g transform="translate(${x} ${y}) scale(${s})" fill="${pal.gem}" ${O(3 / s)}><path d="M-18 14 L-10 -14 L-2 -26 L4 -12 L2 14 Z"/><path d="M0 14 L8 -20 L16 -30 L22 -14 L16 14 Z"/><path d="M-24 14 L-30 -2 L-18 -8 L-14 14 Z"/></g>`
          + `<path d="M${x + 10 * s} ${y - 16 * s} l-3 12" stroke="#fff" stroke-width="2.6" opacity=".7" stroke-linecap="round"/>`;
        case 'mushroom': return `<circle cx="${x}" cy="${y}" r="${70 * s}" fill="url(#dgPlant)" opacity=".7">${flick(3.6)}</circle>`
          + `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 10 H30" stroke="${pal.woodD}" stroke-width="8" stroke-linecap="round"/>`
          + `<path d="M-22 10 v-14 M0 10 v-22 M20 10 v-12" stroke="${CREAM}" stroke-width="7" stroke-linecap="round"/><path d="M-22 10 v-14 M0 10 v-22 M20 10 v-12" fill="none" ${O(2)} stroke-opacity=".0"/>`
          + `<path d="M-34 -2 Q-34 -22 -22 -22 Q-10 -22 -10 -2 Z M-14 -10 Q-14 -38 0 -38 Q14 -38 14 -10 Z M10 0 Q10 -18 20 -18 Q30 -18 30 0 Z" fill="${pal.plantL}" ${O(3)}/></g>`;
        case 'wisp': {
          const bob = P.anim();
          return `<g transform="translate(${x} ${y})"><g>${bob ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -14;0 0" dur="${(3 + k * 2).toFixed(2)}s" repeatCount="indefinite"/>` : ''}`
            + `<circle r="${60 * s}" fill="url(#dgPlant)" opacity=".75"/><circle r="${12 * s}" fill="${pal.plantL}" ${O(3)}/><circle cx="${-3 * s}" cy="${-3 * s}" r="${4 * s}" fill="#fff" opacity=".8"/></g></g>`;
        }
        case 'lava': return `<circle cx="${x}" cy="${y}" r="${80 * s}" fill="url(#dgLava)" opacity=".7">${flick(2)}</circle>`
          + `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 14 Q-26 -10 -8 -18 Q2 -30 14 -16 Q28 -8 22 14 Z" fill="${pal.stoneD}" ${O(3.5)}/><path d="M-12 8 l8 -12 l6 6 l8 -10" fill="none" stroke="${pal.lavaL}" stroke-width="4" stroke-linecap="round"/></g>`;
        default: return '';
      }
    };

    /* ---------- декор у основания стены (x — центр, b — линия пола у стены) ---------- */
    const DEC = {};
    P.DEC = DEC;
    DEC.crates = (x, b) => {
      const box = (cx, by, w, h) => `<rect x="${cx - w / 2}" y="${by - h}" width="${w}" height="${h}" fill="${pal.woodL}" ${O(4)}/><path d="M${cx - w / 2} ${by - h} L${cx + w / 2} ${by} M${cx - w / 2 + 6} ${by - h / 2}H${cx + w / 2 - 6}" stroke="${pal.woodD}" stroke-width="4" opacity=".7"/>`;
      return P.shadow(x, b + 2, 70) + box(x - 30, b, 66, 56) + box(x + 34, b, 56, 48) + box(x - 10, b - 56, 52, 44);
    };
    DEC.barrels = (x, b) => {
      const bar = (cx, by, s) => `<g transform="translate(${cx} ${by}) scale(${s})"><path d="M-28 0 C-36 -30 -36 -60 -28 -90 H28 C36 -60 36 -30 28 0 Z" fill="${pal.woodL}" ${O(4 / s)}/><path d="M-32 -22 H32 M-33 -68 H33" stroke="${pal.metalD}" stroke-width="${5 / s}"/></g>`;
      return P.shadow(x, b + 2, 60) + bar(x - 22, b, 0.8) + bar(x + 30, b, 0.68);
    };
    DEC.amphorae = (x, b) => {
      const a = (cx, by, s, band) => `<g transform="translate(${cx} ${by}) scale(${s})"><path d="M-12 -96 H12 V-86 Q34 -74 32 -40 Q30 -8 0 0 Q-30 -8 -32 -40 Q-34 -74 -12 -86 Z" fill="${pal.accent2 === GOLD ? '#c8664a' : pal.accent2}" ${O(4 / s)}/>`
        + `<path d="M-12 -86 Q-30 -84 -26 -64 M12 -86 Q30 -84 26 -64" fill="none" ${O(4 / s)}/><path d="M-31 -50 H31 V-38 H-31 Z" fill="${band}" ${O(2.4 / s)}/></g>`;
      return P.shadow(x, b + 2, 56) + a(x - 22, b, 0.78, pal.accent) + a(x + 26, b, 0.6, pal.gem);
    };
    DEC.chest = (x, b) => P.shadow(x, b + 2, 56) + `<rect x="${x - 48}" y="${b - 56}" width="96" height="56" rx="6" fill="${pal.woodL}" ${O(4)}/><path d="M${x - 48} ${b - 56} Q${x} ${b - 92} ${x + 48} ${b - 56} Z" fill="${pal.wood}" ${O(4)}/>`
      + `<path d="M${x - 30} ${b - 76} V${b} M${x + 30} ${b - 76} V${b}" stroke="${pal.metalD}" stroke-width="7"/><rect x="${x - 9}" y="${b - 44}" width="18" height="18" rx="3" fill="${GOLD}" ${O(2.6)}/>`
      + `<path d="M${x - 40} ${b - 62} l6 -8 l6 8 Z M${x + 14} ${b - 70} l5 -7 l5 7 Z" fill="${GOLD}" ${O(2)}/>`;
    DEC.bones = (x, b) => {
      const bone = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${pal.bone}" stroke-width="7" stroke-linecap="round"/>`;
      return bone(x - 50, b - 8, x + 10, b - 18) + bone(x - 10, b - 4, x + 50, b - 10)
        + `<path d="M${x + 14} ${b} q-2 -40 26 -42 q28 2 26 42 Z" fill="${pal.bone}" ${O(3.5)}/><circle cx="${x + 32}" cy="${b - 24}" r="6" fill="${INK}"/><circle cx="${x + 50}" cy="${b - 24}" r="6" fill="${INK}"/><path d="M${x + 34} ${b - 8} h14" stroke="${INK}" stroke-width="2.4"/>`;
    };
    DEC.rocks = (x, b) => `<path d="${P.blob(x - 26, b - 16, 34, 20)} ${P.blob(x + 30, b - 12, 26, 15)} ${P.blob(x + 4, b - 34, 22, 15)}" fill="${pal.wallL}" ${O(3.5)}/>`;
    DEC.crystals = (x, b, s = 0.8, col) => {
      col = col || (rnd() < 0.5 ? pal.gem : pal.gem2);
      const on = P.anim();
      const p = (dx, h, w, a) => `<path d="M${dx - w} 0 L${dx - w * 0.6} ${-h} L${dx} ${-h - w * 1.1} L${dx + w * 0.6} ${-h} L${dx + w} 0 Z" transform="rotate(${a} ${dx} 0)"/>`;
      return `<circle cx="${x}" cy="${f1(b - 30 * s)}" r="${f1(66 * s)}" fill="url(#${col === pal.gem ? 'dgGem' : 'dgGem2'})" opacity=".7">${on ? '<animate attributeName="opacity" values=".45;.8;.45" dur="3.6s" repeatCount="indefinite"/>' : ''}</circle>`
        + `<g transform="translate(${x} ${b}) scale(${s})" fill="${col}" ${O(3 / s)}>${p(-22, 36, 11, -24)}${p(20, 30, 10, 22)}${p(0, 58, 14, 0)}</g>`
        + `<path d="M${f1(x - 4 * s)} ${f1(b - 58 * s)} l${f1(-4 * s)} ${f1(16 * s)}" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>`;
    };
    DEC.shrooms = (x, b, s = 1) => {
      const on = P.anim();
      const m = (dx, h, r, col) => `<rect x="${dx - r * 0.22}" y="${-h}" width="${r * 0.44}" height="${h}" rx="${r * 0.2}" fill="${CREAM}" ${O(3)}/><path d="M${dx - r} ${-h + 2} Q${dx - r} ${-h - r * 0.95} ${dx} ${-h - r} Q${dx + r} ${-h - r * 0.95} ${dx + r} ${-h + 2} Z" fill="${col}" ${O(3)}/>`
        + `<circle cx="${dx - r * 0.4}" cy="${-h - r * 0.45}" r="${r * 0.14}" fill="${CREAM}"/><circle cx="${dx + r * 0.3}" cy="${-h - r * 0.6}" r="${r * 0.11}" fill="${CREAM}"/>`;
      return `<circle cx="${x}" cy="${b - 40 * s}" r="${70 * s}" fill="url(#dgPlant)" opacity=".6">${on ? '<animate attributeName="opacity" values=".4;.7;.4" dur="4.2s" repeatCount="indefinite"/>' : ''}</circle>`
        + P.shadow(x, b, 44 * s) + `<g transform="translate(${x} ${b}) scale(${s})">${m(-26, 26, 18, pal.plantL)}${m(14, 44, 26, PINK)}${m(40, 18, 12, pal.gem)}</g>`;
    };
    DEC.statue = (x, b, flip) => {
      const d = flip ? -1 : 1;
      return `<g transform="translate(${x} ${b}) scale(${d} 1)">${P.shadow(0, 2, 60)}<rect x="-54" y="-50" width="108" height="50" fill="${pal.stoneD}" ${O(4)}/>`
        + `<path d="M-40 -50 V-130 Q-40 -166 -6 -172 L26 -174 Q44 -172 48 -154 L52 -50 Z" fill="${pal.stoneL}" ${O(4)}/><path d="M-6 -172 L-14 -206 L4 -188 Z M26 -174 L30 -208 L40 -180 Z" fill="${pal.stoneL}" ${O(3.5)}/>`
        + `<path d="M-26 -50 V-86 M18 -50 V-86 M-40 -104 Q-8 -96 48 -104" fill="none" stroke="${INK}" stroke-width="2.4" opacity=".4"/><rect x="-16" y="-128" width="52" height="15" fill="${pal.accent}" ${O(2.4)}/>`
        + `<circle cx="24" cy="-150" r="5" fill="${INK}"/></g>`;
    };
    DEC.column = (x, b, top = 360) => {
      const w = 48;
      return `<rect x="${x - w / 2}" y="${top + 40}" width="${w}" height="${b - top - 58}" fill="${pal.stoneL}" ${O(4)}/><path d="M${x - 10} ${top + 54}V${b - 26}M${x + 10} ${top + 54}V${b - 26}" stroke="${INK}" stroke-width="2" opacity=".28"/>`
        + `<path d="M${x - w / 2 - 20} ${top + 44} Q${x - w / 2 - 18} ${top} ${x} ${top - 6} Q${x + w / 2 + 18} ${top} ${x + w / 2 + 20} ${top + 44} Z" fill="${pal.accent}" ${O(4)}/>`
        + `<rect x="${x - w / 2 - 12}" y="${b - 20}" width="${w + 24}" height="20" fill="${pal.stoneD}" ${O(4)}/>`;
    };
    DEC.brokenColumn = (x, b) => `<path d="M${x - 24} ${b - 18} V${b - 150} L${x - 8} ${b - 166} L${x + 4} ${b - 150} L${x + 24} ${b - 172} V${b - 18} Z" fill="${pal.stoneL}" ${O(4)}/><rect x="${x - 36}" y="${b - 20}" width="72" height="20" fill="${pal.stoneD}" ${O(4)}/>`
      + `<path d="${P.blob(x + 54, b - 14, 26, 14)}" fill="${pal.stoneL}" ${O(3.5)}/>`;
    DEC.weaponRack = (x, b) => `<rect x="${x - 60}" y="${b - 130}" width="120" height="16" fill="${pal.woodD}" ${O(4)}/><rect x="${x - 60}" y="${b - 18}" width="120" height="18" fill="${pal.woodD}" ${O(4)}/>`
      + `<path d="M${x - 40} ${b - 18} L${x - 34} ${b - 160} M${x - 4} ${b - 18} L${x} ${b - 170} M${x + 34} ${b - 18} L${x + 36} ${b - 150}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${x - 40} ${b - 18} L${x - 34} ${b - 160} M${x - 4} ${b - 18} L${x} ${b - 170} M${x + 34} ${b - 18} L${x + 36} ${b - 150}" stroke="${pal.woodL}" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M${x - 34} ${b - 160} l-8 -20 l14 4 Z M${x} ${b - 170} l-6 -24 l12 0 Z M${x + 36} ${b - 150} l-10 -12 l14 -10 l6 14 Z" fill="${pal.metal}" ${O(3)}/>`;
    DEC.shields = (x, b) => {
      const sh = (cx, cy) => `<rect x="${cx - 22}" y="${cy - 34}" width="44" height="68" rx="8" fill="${pal.cloth}" ${O(4)}/><circle cx="${cx}" cy="${cy}" r="9" fill="${GOLD}" ${O(2.4)}/><path d="M${cx - 16} ${cy - 22}h32M${cx - 16} ${cy + 22}h32" stroke="${GOLD}" stroke-width="3"/>`;
      return P.shadow(x, b + 2, 60) + sh(x - 30, b - 36) + sh(x + 30, b - 40);
    };
    DEC.sacks = (x, b) => {
      const sk = (cx, by, s) => `<g transform="translate(${cx} ${by}) scale(${s})"><path d="M-32 0 Q-40 -40 -16 -56 L-20 -66 L20 -66 L16 -56 Q40 -40 32 0 Z" fill="${pal.sand}" ${O(4 / s)}/><path d="M-16 -56 H16" stroke="${pal.woodD}" stroke-width="${5 / s}"/></g>`;
      return P.shadow(x, b + 2, 60) + sk(x - 24, b, 0.9) + sk(x + 28, b, 0.75);
    };
    DEC.cauldron = (x, b) => {
      const on = P.anim();
      return `<circle cx="${x}" cy="${b - 60}" r="70" fill="url(#dgPlant)" opacity=".55"/>` + P.shadow(x, b + 2, 56)
        + `<path d="M${x - 50} ${b - 66} H${x + 50} Q${x + 52} ${b - 6} ${x} ${b - 4} Q${x - 52} ${b - 6} ${x - 50} ${b - 66} Z" fill="${pal.iron}" ${O(4)}/><ellipse cx="${x}" cy="${b - 66}" rx="50" ry="10" fill="${pal.plantL}" ${O(3)}/>`
        + `<circle cx="${x - 14}" cy="${b - 72}" r="7" fill="${pal.plantL}" ${O(2.4)}>${on ? `<animate attributeName="cy" values="${b - 68};${b - 96};${b - 68}" dur="2.4s" repeatCount="indefinite"/>` : ''}</circle>`
        + `<path d="M${x - 40} ${b - 4} l-8 6 M${x + 40} ${b - 4} l8 6" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    };
    DEC.totem = (x, b) => `<rect x="${x - 26}" y="${b - 190}" width="52" height="190" fill="${pal.woodL}" ${O(4)}/>`
      + `<path d="M${x - 26} ${b - 130}h52M${x - 26} ${b - 66}h52" stroke="${INK}" stroke-width="3" opacity=".5"/>`
      + `<circle cx="${x - 10}" cy="${b - 164}" r="6" fill="${INK}"/><circle cx="${x + 10}" cy="${b - 164}" r="6" fill="${INK}"/><path d="M${x - 12} ${b - 146} h24" stroke="${INK}" stroke-width="4"/>`
      + `<circle cx="${x - 10}" cy="${b - 100}" r="5" fill="${pal.plantL}" ${O(2)}/><circle cx="${x + 10}" cy="${b - 100}" r="5" fill="${pal.plantL}" ${O(2)}/><path d="M${x - 46} ${b - 190} L${x} ${b - 214} L${x + 46} ${b - 190} Z" fill="${pal.plant}" ${O(3.5)}/>`;
    DEC.anchor = (x, b) => P.shadow(x, b + 2, 60) + `<path d="M${x} ${b - 150} V${b - 20} M${x - 30} ${b - 120} H${x + 30} M${x - 56} ${b - 52} Q${x - 46} ${b - 10} ${x} ${b - 14} Q${x + 46} ${b - 10} ${x + 56} ${b - 52}" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>`
      + `<path d="M${x} ${b - 150} V${b - 20} M${x - 30} ${b - 120} H${x + 30} M${x - 56} ${b - 52} Q${x - 46} ${b - 10} ${x} ${b - 14} Q${x + 46} ${b - 10} ${x + 56} ${b - 52}" fill="none" stroke="${pal.metalD}" stroke-width="10" stroke-linecap="round"/><circle cx="${x}" cy="${b - 162}" r="14" fill="none" ${O(5)}/>`;
    DEC.shells = (x, b) => `<path d="M${x - 40} ${b} q14 -34 28 0 Z M${x - 6} ${b} q18 -44 36 0 Z M${x + 34} ${b} q10 -24 20 0 Z" fill="${PINK}" ${O(3)}/><path d="M${x + 12} ${b} V${b - 30} M${x + 4} ${b} l4 -24 M${x + 20} ${b} l-4 -24" stroke="${INK}" stroke-width="2" opacity=".4"/>`
      + `<path d="M${x - 30} ${b} q6 -18 12 0" fill="none" stroke="${INK}" stroke-width="2" opacity=".4"/>`;
    DEC.wreck = (x, b) => `<path d="M${x - 90} ${b} Q${x - 80} ${b - 110} ${x + 10} ${b - 140} L${x + 20} ${b - 120} Q${x - 50} ${b - 90} ${x - 54} ${b} Z" fill="${pal.woodL}" ${O(4)}/>`
      + `<path d="M${x - 70} ${b - 40} Q${x - 30} ${b - 70} ${x + 10} ${b - 80} M${x - 76} ${b - 80} Q${x - 40} ${b - 106} ${x} ${b - 116}" fill="none" stroke="${INK}" stroke-width="2.4" opacity=".45"/>`
      + `<path d="M${x + 30} ${b} V${b - 170} M${x + 30} ${b - 150} H${x + 70}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${x + 30} ${b} V${b - 170} M${x + 30} ${b - 150} H${x + 70}" stroke="${pal.wood}" stroke-width="6" stroke-linecap="round"/>`
      + `<path d="M${x + 34} ${b - 146} Q${x + 70} ${b - 120} ${x + 60} ${b - 80} L${x + 34} ${b - 86} Z" fill="${CREAM}" ${O(3)}/>`;
    DEC.iceBlock = (x, b) => {
      const inside = P.pick([
        `<path d="M${x - 18} ${b - 60} q18 -26 36 0 v14 h-36 Z" fill="${pal.cloth}" opacity=".7"/><path d="M${x} ${b - 86} v-14" stroke="${GOLD}" stroke-width="5" opacity=".7"/>`,   // шлем легионера
        `<path d="M${x - 26} ${b - 60} q20 -20 40 0 l12 -10 v20 l-12 -10 q-20 20 -40 0 Z" fill="#8fb6c8" opacity=".8"/>`,                                                  // рыба
        `<path d="M${x - 8} ${b - 90} v50 M${x - 20} ${b - 76} h24" stroke="${pal.metalD}" stroke-width="6" opacity=".7"/>`]);                                               // меч
      return P.shadow(x, b + 2, 60) + `<path d="M${x - 56} ${b} L${x - 50} ${b - 110} L${x - 10} ${b - 124} L${x + 46} ${b - 106} L${x + 56} ${b} Z" fill="${pal.gem}" opacity=".55" ${O(4)}/>`
        + inside + `<path d="M${x - 40} ${b - 98} l20 -6 M${x + 30} ${b - 90} l-10 40" stroke="#fff" stroke-width="3.5" opacity=".75" stroke-linecap="round"/>`;
    };
    DEC.snowDrift = (x, b) => `<path d="M${x - 80} ${b + 2} Q${x - 40} ${b - 40} ${x} ${b - 30} Q${x + 50} ${b - 50} ${x + 80} ${b + 2} Z" fill="${pal.snow}" ${O(3.5)}/>`;
    DEC.lavaPool = (x, b) => `<circle cx="${x}" cy="${b - 10}" r="90" fill="url(#dgLava)" opacity=".7"/><path d="M${x - 80} ${b + 2} Q${x - 70} ${b - 26} ${x} ${b - 28} Q${x + 70} ${b - 26} ${x + 80} ${b + 2} Z" fill="${pal.stoneD}" ${O(4)}/>`
      + `<path d="M${x - 60} ${b - 4} Q${x} ${b - 22} ${x + 60} ${b - 4} Z" fill="${pal.lava}" ${O(2.6)}/><circle cx="${x - 10}" cy="${b - 12}" r="5" fill="${pal.lavaL}"/>`;
    DEC.obsidian = (x, b) => `<path d="M${x - 50} ${b} L${x - 34} ${b - 110} L${x - 10} ${b} Z M${x - 10} ${b} L${x + 12} ${b - 150} L${x + 30} ${b} Z M${x + 26} ${b} L${x + 44} ${b - 80} L${x + 58} ${b} Z" fill="#3a2a40" ${O(3.5)}/>`
      + `<path d="M${x + 8} ${b - 120} l4 40 M${x - 32} ${b - 90} l2 30" stroke="#8a7aa8" stroke-width="3" opacity=".8" stroke-linecap="round"/>`;
    DEC.stump = (x, b) => P.shadow(x, b + 2, 56) + `<path d="M${x - 46} ${b} L${x - 38} ${b - 70} H${x + 38} L${x + 46} ${b} Z" fill="${pal.wood}" ${O(4)}/><ellipse cx="${x}" cy="${b - 70}" rx="38" ry="12" fill="${pal.woodL}" ${O(3.5)}/>`
      + `<ellipse cx="${x}" cy="${b - 70}" rx="20" ry="6" fill="none" stroke="${INK}" stroke-width="2" opacity=".4"/>` + DEC.shrooms(x + 30, b - 40, 0.45);
    DEC.reeds = (x, b) => {
      let s = ''; for (let i = 0; i < 6; i++) { const dx = -40 + i * 16, h = 70 + (i % 3) * 30; s += `M${x + dx} ${b} q${i % 2 ? 6 : -6} ${-h / 2} ${i % 2 ? -4 : 4} ${-h}`; }
      return `<path d="${s}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="${s}" fill="none" stroke="${pal.plant}" stroke-width="4" stroke-linecap="round"/>`
        + `<rect x="${x - 26}" y="${b - 92}" width="10" height="26" rx="5" fill="${pal.woodD}" ${O(2.4)}/><rect x="${x + 22}" y="${b - 112}" width="10" height="26" rx="5" fill="${pal.woodD}" ${O(2.4)}/>`;
    };
    DEC.cart = (x, b) => {
      const w = (cx) => `<circle cx="${cx}" cy="-14" r="16" fill="${pal.iron}" ${O(3.5)}/><circle cx="${cx}" cy="-14" r="5" fill="${pal.metalD}"/>`;
      return `<g transform="translate(${x} ${b - 4}) scale(0.85)">${P.shadow(0, 2, 74)}`
        + `<path d="M-50 -88 l14 -26 l20 6 l6 18 Z M-4 -92 l18 -30 l26 10 l2 22 Z M28 -90 l14 -18 l14 12 Z" fill="${pal.stoneL}" ${O(3)}/><path d="M-28 -100 l6 -8 l6 8 l-6 5 Z M18 -106 l6 -8 l6 8 l-6 5 Z" fill="${GOLD}" ${O(2)}/>`
        + `<path d="M-62 -24 L-72 -94 H72 L62 -24 Z" fill="${pal.metalD}" ${O(5)}/><path d="M-70 -80 H70 M-24 -94 L-21 -24 M24 -94 L21 -24" stroke="${INK}" stroke-width="3" opacity=".4"/>${w(-36)}${w(36)}</g>`;
    };
    DEC.urns = (x, b) => P.shadow(x, b + 2, 50) + `<path d="M${x - 40} ${b} Q${x - 52} ${b - 50} ${x - 30} ${b - 66} H${x - 6} Q${x + 14} ${b - 50} ${x + 2} ${b} Z" fill="${pal.stoneL}" ${O(4)}/><rect x="${x - 36}" y="${b - 76}" width="36" height="12" rx="4" fill="${pal.accent}" ${O(3)}/>`
      + `<path d="M${x + 14} ${b} Q${x + 6} ${b - 34} ${x + 24} ${b - 46} H${x + 40} Q${x + 56} ${b - 34} ${x + 48} ${b} Z" fill="${pal.accent2 === GOLD ? GOLD : pal.accent2}" ${O(4)}/>`;
    DEC.joke = (x, b, lines) => {
      const w = Math.max(P.signW(lines[0], 18), P.signW(lines[1] || '', 12), 160);
      return `<rect x="${x - 6}" y="${b - 110}" width="12" height="110" fill="${pal.woodD}" ${O(3)}/>` + P.sign(x, b - 130, w, 70, [[lines[0], 18, GOLD], [lines[1] || '', 12, PINK]], (rnd() - 0.5) * 8);
    };
    DEC.waterPool = (x, b) => `<path d="M${x - 70} ${b + 2} Q${x} ${b - 26} ${x + 70} ${b + 2} Z" fill="url(#dgWater)" ${O(3.5)}/><path d="M${x - 30} ${b - 8} h20 M${x + 10} ${b - 12} h24" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>`;
    DEC.coral = (x, b) => `<path d="M${x - 30} ${b} V${b - 50} Q${x - 30} ${b - 70} ${x - 44} ${b - 80} M${x - 30} ${b - 50} Q${x - 10} ${b - 60} ${x - 10} ${b - 90} M${x + 20} ${b} V${b - 60} Q${x + 20} ${b - 80} ${x + 36} ${b - 92} M${x + 20} ${b - 40} Q${x + 4} ${b - 50} ${x + 2} ${b - 66}" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>`
      + `<path d="M${x - 30} ${b} V${b - 50} Q${x - 30} ${b - 70} ${x - 44} ${b - 80} M${x - 30} ${b - 50} Q${x - 10} ${b - 60} ${x - 10} ${b - 90} M${x + 20} ${b} V${b - 60} Q${x + 20} ${b - 80} ${x + 36} ${b - 92} M${x + 20} ${b - 40} Q${x + 4} ${b - 50} ${x + 2} ${b - 66}" fill="none" stroke="${PINK}" stroke-width="9" stroke-linecap="round"/>`;
    DEC.floatRock = (x, b) => {
      const on = P.anim();
      return `<g transform="translate(${x} ${b - 150})"><g>${on ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 -16;0 0" dur="4.6s" repeatCount="indefinite"/>' : ''}`
        + `<path d="M-44 0 Q-40 -20 -10 -24 Q30 -28 44 -6 L20 30 L0 46 L-20 28 Z" fill="${pal.wallL}" ${O(4)}/><path d="M-40 -2 Q0 -10 42 -6" fill="none" stroke="${pal.plantL}" stroke-width="6" stroke-linecap="round"/>`
        + `<circle cx="0" cy="12" r="5" fill="${pal.gem2}" ${O(2)}/></g></g><ellipse cx="${x}" cy="${b}" rx="40" ry="7" fill="${INK}" opacity=".25"/>`;
    };
    /* --- декор для вторых вариаций регионов --- */
    DEC.anvil = (x, b) => P.shadow(x, b + 2, 60) + `<rect x="${x - 26}" y="${b - 46}" width="52" height="46" fill="${pal.stoneD}" ${O(4)}/>`
      + `<path d="M${x - 56} ${b - 46} H${x + 40} Q${x + 70} ${b - 50} ${x + 82} ${b - 70} H${x - 50} Q${x - 62} ${b - 60} ${x - 56} ${b - 46} Z" fill="${pal.metalD}" ${O(4)}/><path d="M${x - 46} ${b - 64} H${x + 60}" stroke="#fff" stroke-width="3" opacity=".5"/>`;
    DEC.gear = (x, b, r = 54) => {
      let t = ''; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; t += `M${f1(x + Math.cos(a - 0.14) * r)} ${f1(b - r - 4 + Math.sin(a - 0.14) * r)} L${f1(x + Math.cos(a - 0.1) * (r + 14))} ${f1(b - r - 4 + Math.sin(a - 0.1) * (r + 14))} L${f1(x + Math.cos(a + 0.1) * (r + 14))} ${f1(b - r - 4 + Math.sin(a + 0.1) * (r + 14))} L${f1(x + Math.cos(a + 0.14) * r)} ${f1(b - r - 4 + Math.sin(a + 0.14) * r)} Z`; }
      return P.shadow(x, b + 2, r) + `<path d="${t}" fill="${pal.accent2}" ${O(3)}/><circle cx="${x}" cy="${b - r - 4}" r="${r}" fill="${pal.accent2}" ${O(4)}/><circle cx="${x}" cy="${b - r - 4}" r="${r * 0.35}" fill="${pal.wallD}" ${O(3.5)}/>`
        + `<path d="M${x - r * 0.7} ${b - r - 4}h${r * 0.35}M${x + r * 0.35} ${b - r - 4}h${r * 0.35}" stroke="${INK}" stroke-width="2.4" opacity=".4"/>`;
    };
    DEC.telescope = (x, b) => P.shadow(x, b + 2, 50) + `<path d="M${x} ${b - 90} L${x - 40} ${b} M${x} ${b - 90} L${x + 36} ${b} M${x} ${b - 90} L${x + 4} ${b}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${x} ${b - 90} L${x - 40} ${b} M${x} ${b - 90} L${x + 36} ${b} M${x} ${b - 90} L${x + 4} ${b}" stroke="${pal.wood}" stroke-width="5" stroke-linecap="round"/>`
      + `<g transform="rotate(-32 ${x} ${b - 96})"><rect x="${x - 50}" y="${b - 110}" width="110" height="26" rx="6" fill="${pal.accent2}" ${O(4)}/><rect x="${x + 52}" y="${b - 114}" width="20" height="34" rx="4" fill="${pal.accent2}" ${O(3.5)}/><path d="M${x - 20} ${b - 110}v26M${x + 20} ${b - 110}v26" stroke="${INK}" stroke-width="2.4" opacity=".45"/></g>`;
    DEC.globe = (x, b) => P.shadow(x, b + 2, 40) + `<path d="M${x - 30} ${b} H${x + 30} L${x + 10} ${b - 20} V${b - 40} H${x - 10} V${b - 20} Z" fill="${pal.wood}" ${O(3.5)}/>`
      + `<circle cx="${x}" cy="${b - 84}" r="42" fill="${pal.gem}" ${O(4)}/><path d="M${x - 24} ${b - 104} q20 6 26 24 q-14 10 -6 26 M${x + 10} ${b - 118} q18 10 18 30" fill="none" stroke="${pal.plant}" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M${x - 48} ${b - 60} A52 52 0 0 1 ${x + 30} ${b - 132}" fill="none" stroke="${pal.accent2}" stroke-width="6"/>`;
    DEC.bookshelf = (x, b) => {
      const cols = [pal.cloth, pal.accent, pal.accent2, pal.gem, '#7a4a8a', pal.plant]; const by = {}; cols.forEach((c) => { by[c] = ''; });
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const c = cols[(i * 7 + r * 3) % cols.length], h = 30 + ((i * 13 + r * 7) % 12); by[c] += `M${x - 54 + i * 18} ${b - 18 - r * 52}v${-h}h14v${h}Z`; }
      return P.shadow(x, b + 2, 70) + `<rect x="${x - 64}" y="${b - 176}" width="128" height="176" fill="${pal.woodD}" ${O(4)}/>`
        + cols.map((c) => `<path d="${by[c]}" fill="${c}" stroke="${INK}" stroke-width="2"/>`).join('')
        + `<path d="M${x - 64} ${b - 18}h128M${x - 64} ${b - 70}h128M${x - 64} ${b - 122}h128" stroke="${pal.wood}" stroke-width="6"/>`;
    };
    DEC.sarcophagus = (x, b) => P.shadow(x, b + 2, 50) + `<path d="M${x - 40} ${b} L${x - 46} ${b - 140} Q${x - 44} ${b - 184} ${x} ${b - 190} Q${x + 44} ${b - 184} ${x + 46} ${b - 140} L${x + 40} ${b} Z" fill="${pal.stoneL}" ${O(4)}/>`
      + `<circle cx="${x}" cy="${b - 150} " r="18" fill="${pal.stone}" ${O(3)}/><path d="M${x - 8} ${b - 152} h0 M${x + 8} ${b - 152} h0" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M${x - 30} ${b - 110} H${x + 30} M${x} ${b - 126} V${b - 30} M${x - 18} ${b - 70} H${x + 18}" stroke="${pal.accent2}" stroke-width="6" stroke-linecap="round"/>`;
    DEC.candles = (x, b) => {
      let c = '', fl = ''; [[-30, 46], [-12, 64], [6, 38], [24, 56], [40, 30]].forEach(([dx, h]) => { c += `<rect x="${x + dx - 6}" y="${b - h}" width="12" height="${h}" rx="3" fill="${CREAM}" ${O(2.6)}/>`; fl += `M${x + dx} ${b - h - 2} c-6 -6 -4 -14 0 -20 c4 6 6 14 0 20 Z`; });
      return `<circle cx="${x + 4}" cy="${b - 60}" r="64" fill="url(#ctGlow)" opacity=".6"/>` + P.shadow(x + 4, b + 2, 50) + c + `<path d="${fl}" fill="#ffb24a" stroke="#ffd76a" stroke-width="2"/>`;
    };
    DEC.millstone = (x, b) => P.shadow(x, b + 2, 60) + `<circle cx="${x}" cy="${b - 62}" r="62" fill="${pal.stoneL}" ${O(4)}/><circle cx="${x}" cy="${b - 62}" r="14" fill="${pal.wallD}" ${O(3)}/>`
      + `<path d="M${x - 44} ${b - 104} L${x - 12} ${b - 70} M${x + 46} ${b - 100} L${x + 12} ${b - 70} M${x - 50} ${b - 30} L${x - 12} ${b - 54} M${x + 48} ${b - 26} L${x + 12} ${b - 54}" stroke="${INK}" stroke-width="2.4" opacity=".4"/>`;
    DEC.cannon = (x, b) => P.shadow(x, b + 2, 70) + `<path d="M${x - 60} ${b - 70} L${x + 70} ${b - 96} L${x + 76} ${b - 70} L${x - 56} ${b - 40} Z" fill="${pal.iron}" ${O(4)}/><circle cx="${x + 76}" cy="${b - 83}" r="12" fill="${INK}"/>`
      + `<path d="M${x - 66} ${b - 36} H${x + 40} L${x + 34} ${b - 14} H${x - 60} Z" fill="${pal.wood}" ${O(4)}/><circle cx="${x - 40}" cy="${b - 12}" r="13" fill="${pal.woodD}" ${O(3.5)}/><circle cx="${x + 20}" cy="${b - 12}" r="13" fill="${pal.woodD}" ${O(3.5)}/>`
      + `<path d="${P.blob(x + 96, b - 10, 12, 12)} ${P.blob(x + 116, b - 10, 12, 12)} ${P.blob(x + 106, b - 30, 12, 12)}" fill="${pal.iron}" ${O(2.6)}/>`;
    DEC.waterWheel = (x, b) => {
      const r = 104, cy = b - r + 20, on = P.anim();
      let sp = '', pd = ''; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; sp += `M0 0 L${f1(Math.cos(a) * r)} ${f1(Math.sin(a) * r)}`; pd += `M${f1(Math.cos(a) * (r - 6))} ${f1(Math.sin(a) * (r - 6))} L${f1(Math.cos(a) * (r + 22))} ${f1(Math.sin(a) * (r + 22))}`; }
      return `<g transform="translate(${x} ${cy})"><g>${on ? '<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="16s" repeatCount="indefinite"/>' : ''}`
        + `<path d="${pd}" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="${pd}" stroke="${pal.woodL}" stroke-width="13" stroke-linecap="round"/>`
        + `<circle r="${r}" fill="none" stroke="${INK}" stroke-width="18"/><circle r="${r}" fill="none" stroke="${pal.wood}" stroke-width="11"/><path d="${sp}" stroke="${pal.woodD}" stroke-width="8"/><circle r="16" fill="${pal.metalD}" ${O(3)}/></g></g>`
        + `<path d="M${x - 140} ${b + 2} Q${x} ${b - 30} ${x + 140} ${b + 2} Z" fill="url(#dgWater)" ${O(3.5)}/>`;
    };
    DEC.potions = (x, b) => {
      const bot = (cx, h, c) => `<path d="M${cx - 6} ${b - 38 - h} h12 v14 q14 6 14 22 v${h - 14} q0 12 -12 12 h-16 q-12 0 -12 -12 v${-(h - 14)} q0 -16 14 -22 Z" fill="${c}" ${O(3)}/>`;
      return P.shadow(x, b + 2, 70) + `<rect x="${x - 70}" y="${b - 40}" width="140" height="14" fill="${pal.woodL}" ${O(3.5)}/><path d="M${x - 60} ${b - 26} V${b} M${x + 60} ${b - 26} V${b}" stroke="${INK}" stroke-width="10"/><path d="M${x - 60} ${b - 26} V${b} M${x + 60} ${b - 26} V${b}" stroke="${pal.woodD}" stroke-width="5"/>`
        + bot(x - 40, 30, pal.plantL) + bot(x, 44, pal.gem2) + bot(x + 38, 24, PINK);
    };
    DEC.boneArch = (x, b) => `<path d="M${x - 60} ${b} Q${x - 80} ${b - 160} ${x} ${b - 210} M${x + 60} ${b} Q${x + 80} ${b - 160} ${x} ${b - 210}" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M${x - 60} ${b} Q${x - 80} ${b - 160} ${x} ${b - 210} M${x + 60} ${b} Q${x + 80} ${b - 160} ${x} ${b - 210}" fill="none" stroke="${pal.bone}" stroke-width="14" stroke-linecap="round"/>`;
    DEC.wineRack = (x, b) => {
      let s = `<rect x="${x - 70}" y="${b - 130}" width="140" height="130" fill="${pal.woodD}" ${O(4)}/>`, d = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) d += P.blob(x - 52 + c * 35, b - 108 + r * 40, 13, 13);
      return s + `<path d="${d}" fill="${pal.cloth}" ${O(3)}/><path d="M${x - 70} ${b - 86}h140M${x - 70} ${b - 46}h140" stroke="${INK}" stroke-width="2.4" opacity=".5"/>`;
    };

    /* --- декор Восточной Марки: крепость, гарнизон, осадные машины --- */
    // щит-скутум Легиона (cx, cy — центр, s — масштаб)
    const scutum = (cx, cy, s = 1) => { const w = f1(22 * s), h = f1(34 * s); cx = f1(cx); cy = f1(cy);
      return `<rect x="${f1(cx - w)}" y="${f1(cy - h)}" width="${f1(2 * w)}" height="${f1(2 * h)}" rx="${f1(8 * s)}" fill="${pal.cloth}" ${O(4)}/>`
        + `<path d="M${f1(cx - w)} ${cy}H${f1(cx + w)}M${cx} ${f1(cy - h)}V${f1(cy + h)}${P.blob(cx, cy, 9 * s, 9 * s)}" fill="${GOLD}" stroke="${GOLD}" stroke-width="3"/>`; };
    DEC.spearRack = (x, b) => {
      const sp = `M${x - 46} ${b - 18}L${x - 42} ${b - 196}M${x - 16} ${b - 18}L${x - 14} ${b - 206}M${x + 14} ${b - 18}L${x + 16} ${b - 200}M${x + 44} ${b - 18}L${x + 42} ${b - 190}`;
      return P.shadow(x, b + 2, 76) + `<rect x="${x - 64}" y="${b - 150}" width="128" height="14" fill="${pal.woodD}" ${O(4)}/>`
        + `<path d="${sp}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="${sp}" stroke="${pal.woodL}" stroke-width="5" stroke-linecap="round"/>`
        + `<path d="M${x - 42} ${b - 196}l-7 -22l14 0Z M${x - 14} ${b - 206}l-7 -22l14 0Z M${x + 16} ${b - 200}l-7 -22l14 0Z M${x + 42} ${b - 190}l-7 -22l14 0Z" fill="${pal.metal}" ${O(2.6)}/>`
        + `<rect x="${x - 64}" y="${b - 18}" width="128" height="18" fill="${pal.woodD}" ${O(4)}/>` + scutum(x + 60, b - 38, 0.85);
    };
    // баллиста у бойницы: станина, дуги, тетива, заряженный болт
    DEC.ballista = (x, b) => P.shadow(x, b + 2, 90)
      + `<path d="M${x - 50} ${b} L${x - 30} ${b - 70} M${x + 50} ${b} L${x + 30} ${b - 70} M${x - 40} ${b - 34} H${x + 40}" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M${x - 50} ${b} L${x - 30} ${b - 70} M${x + 50} ${b} L${x + 30} ${b - 70} M${x - 40} ${b - 34} H${x + 40}" stroke="${pal.woodD}" stroke-width="9" stroke-linecap="round"/>`
      + `<g transform="rotate(-8 ${x} ${b - 80})"><rect x="${x - 70}" y="${b - 92}" width="150" height="22" rx="4" fill="${pal.wood}" ${O(4)}/>`
      + `<path d="M${x + 40} ${b - 81} Q${x + 30} ${b - 150} ${x - 6} ${b - 168} M${x + 40} ${b - 81} Q${x + 30} ${b - 12} ${x - 6} ${b + 6}" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M${x + 40} ${b - 81} Q${x + 30} ${b - 150} ${x - 6} ${b - 168} M${x + 40} ${b - 81} Q${x + 30} ${b - 12} ${x - 6} ${b + 6}" fill="none" stroke="${pal.woodL}" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M${x - 6} ${b - 168} L${x - 50} ${b - 81} L${x - 6} ${b + 6}" fill="none" stroke="${CREAM}" stroke-width="2.6"/><path d="M${x - 60} ${b - 81} H${x + 104}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x - 60} ${b - 81} H${x + 104}" stroke="${pal.woodL}" stroke-width="4" stroke-linecap="round"/>`
      + `<path d="M${x + 104} ${b - 90} l22 9 l-22 9 Z M${x - 60} ${b - 81} l-12 -10 h10 l8 10 l-8 10 h-10 Z" fill="${pal.metal}" ${O(2.4)}/></g>`;
    // разобранная баллиста: дуги и станина лежат на козлах, болты россыпью
    DEC.ballistaParts = (x, b) => P.shadow(x, b + 2, 92)
      + `<path d="M${x - 70} ${b} l12 -46 l12 46 M${x + 46} ${b} l12 -46 l12 46" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><path d="M${x - 70} ${b} l12 -46 l12 46 M${x + 46} ${b} l12 -46 l12 46" fill="none" stroke="${pal.woodD}" stroke-width="6" stroke-linejoin="round"/>`
      + `<rect x="${x - 86}" y="${b - 60}" width="172" height="18" rx="4" fill="${pal.wood}" ${O(4)}/>`
      + `<path d="M${x - 80} ${b - 70} Q${x} ${b - 120} ${x + 80} ${b - 70}" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M${x - 80} ${b - 70} Q${x} ${b - 120} ${x + 80} ${b - 70}" fill="none" stroke="${pal.woodL}" stroke-width="8" stroke-linecap="round"/>`
      + `<path d="M${x - 60} ${b - 8} L${x + 50} ${b - 20} M${x - 40} ${b - 2} L${x + 70} ${b - 6}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x - 60} ${b - 8} L${x + 50} ${b - 20} M${x - 40} ${b - 2} L${x + 70} ${b - 6}" stroke="${pal.woodL}" stroke-width="3.5" stroke-linecap="round"/>`
      + `<path d="M${x + 50} ${b - 26} l14 4 l-12 8 Z M${x + 70} ${b - 12} l14 6 l-14 6 Z" fill="${pal.metal}" ${O(2)}/><circle cx="${x}" cy="${b - 51}" r="7" fill="${pal.metalD}" ${O(2.4)}/>`;
    // недостроенная катапульта: рама, рычаг с ложкой, камни-снаряды рядом
    DEC.catapult = (x, b) => P.shadow(x, b + 2, 96)
      + `<path d="M${x - 80} ${b - 16} H${x + 60} M${x - 60} ${b - 16} L${x - 20} ${b - 120} L${x + 20} ${b - 16}" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x - 80} ${b - 16} H${x + 60} M${x - 60} ${b - 16} L${x - 20} ${b - 120} L${x + 20} ${b - 16}" fill="none" stroke="${pal.woodD}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="M${x - 70} ${b - 40} L${x + 40} ${b - 150}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M${x - 70} ${b - 40} L${x + 40} ${b - 150}" stroke="${pal.wood}" stroke-width="8" stroke-linecap="round"/>`
      + `<path d="M${x + 26} ${b - 156} q24 -16 40 8 q-16 18 -40 -8 Z" fill="${pal.woodL}" ${O(3.5)}/><circle cx="${x - 20}" cy="${b - 92}" r="10" fill="${pal.metalD}" ${O(3)}/>`
      + `<circle cx="${x - 60}" cy="${b - 12}" r="15" fill="${pal.woodD}" ${O(3.5)}/><circle cx="${x + 40}" cy="${b - 12}" r="15" fill="${pal.woodD}" ${O(3.5)}/>`
      + `<path d="${P.blob(x + 92, b - 12, 15, 12)} ${P.blob(x + 116, b - 10, 13, 10)} ${P.blob(x + 104, b - 32, 13, 11)}" fill="${pal.stoneL}" ${O(3)}/>`;
    // ящики со стрелами: из ящиков торчат пучки стрел с оперением
    DEC.arrowCrates = (x, b) => {
      let sh = '', fl = '';
      [[-36, 56, 7], [34, 46, 6]].forEach(([dx, h, n]) => { for (let i = 0; i < n; i++) { const ax = x + dx - 22 + i * 7, top = b - h - 30 - ((i * 13) % 18); sh += `M${ax} ${b - h + 4}L${ax + (i - n / 2) * 1.6} ${top}`; fl += `M${f1(ax + (i - n / 2) * 1.6 - 4)} ${top}l4 -14l4 14l-4 -4Z`; } });
      return P.shadow(x, b + 2, 76) + `<path d="${sh}" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/><path d="${sh}" stroke="${pal.woodL}" stroke-width="2" stroke-linecap="round"/><path d="${fl}" fill="${pal.cloth}" stroke="${INK}" stroke-width="1.6"/>`
        + `<rect x="${x - 70}" y="${b - 56}" width="68" height="56" fill="${pal.woodL}" ${O(4)}/><rect x="${x + 4}" y="${b - 46}" width="60" height="46" fill="${pal.woodL}" ${O(4)}/>`
        + `<path d="M${x - 70} ${b - 28}H${x - 2}M${x + 4} ${b - 23}H${x + 64}" stroke="${pal.woodD}" stroke-width="4" opacity=".7"/><path d="M${x - 50} ${b - 20}h28M${x + 20} ${b - 14}h28" stroke="${INK}" stroke-width="3" opacity=".5"/>`;
    };
    // точильный камень на козлах с рукоятью; искры (1 SMIL)
    DEC.grindstone = (x, b) => {
      const on = P.anim();
      return P.shadow(x, b + 2, 60) + `<path d="M${x - 44} ${b} L${x - 26} ${b - 66} M${x + 44} ${b} L${x + 26} ${b - 66} M${x - 36} ${b - 30} H${x + 36}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M${x - 44} ${b} L${x - 26} ${b - 66} M${x + 44} ${b} L${x + 26} ${b - 66} M${x - 36} ${b - 30} H${x + 36}" stroke="${pal.woodD}" stroke-width="7" stroke-linecap="round"/>`
        + `<circle cx="${x}" cy="${b - 92}" r="44" fill="${pal.stoneL}" ${O(4)}/><circle cx="${x}" cy="${b - 92}" r="30" fill="none" stroke="${INK}" stroke-width="2" opacity=".3"/><circle cx="${x}" cy="${b - 92}" r="8" fill="${pal.metalD}" ${O(2.6)}/>`
        + `<path d="M${x} ${b - 92} L${x - 34} ${b - 70} v-16" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x} ${b - 92} L${x - 34} ${b - 70} v-16" fill="none" stroke="${pal.metal}" stroke-width="4" stroke-linecap="round"/>`
        + `<path d="M${x + 30} ${b - 128} l26 -10 M${x + 36} ${b - 118} l30 0 M${x + 32} ${b - 136} l16 -20" stroke="${GOLD}" stroke-width="4" stroke-linecap="round">${on ? '<animate attributeName="opacity" values="1;0;0;1;0;1" dur="1.6s" repeatCount="indefinite"/>' : ''}</path>`;
    };
    // лебёдка: барабан с цепью, уходящей вверх, и рукоять
    DEC.winch = (x, b) => {
      let ch = ''; for (let y = b - 96; y > b - 260; y -= 18) ch += P.blob(x + 30, y, 5, 8);
      return P.shadow(x, b + 2, 64) + `<path d="${ch}" fill="none" stroke="${INK}" stroke-width="6"/><path d="${ch}" fill="none" stroke="${pal.metalD}" stroke-width="2.6"/>`
        + `<path d="M${x - 56} ${b} V${b - 86} M${x + 56} ${b} V${b - 86}" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M${x - 56} ${b} V${b - 86} M${x + 56} ${b} V${b - 86}" stroke="${pal.woodD}" stroke-width="11" stroke-linecap="round"/>`
        + `<rect x="${x - 50}" y="${b - 92}" width="100" height="40" rx="18" fill="${pal.wood}" ${O(4)}/><path d="M${x - 30} ${b - 92}v40M${x - 10} ${b - 92}v40M${x + 10} ${b - 92}v40" stroke="${pal.metalD}" stroke-width="4"/>`
        + `<path d="M${x + 56} ${b - 72} h22 v34 h14" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x + 56} ${b - 72} h22 v34 h14" fill="none" stroke="${pal.metal}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    };
    // клетка для пленных — пустая, внутри клубок (кто-то уже сбежал)
    DEC.cage = (x, b) => {
      let bars = ''; for (let dx = -40; dx <= 40; dx += 16) bars += `M${x + dx} ${b - 6}V${b - 132}`;
      return P.shadow(x, b + 2, 56) + `<circle cx="${x - 10}" cy="${b - 22}" r="15" fill="${PINK}" ${O(3)}/><path d="M${x - 22} ${b - 26} q12 -8 24 4 M${x - 18} ${b - 14} q10 -12 20 -4" fill="none" stroke="${INK}" stroke-width="2" opacity=".5"/><path d="M${x + 5} ${b - 18} q30 12 52 4" fill="none" stroke="${PINK}" stroke-width="3"/>`
        + `<path d="${bars}" stroke="${INK}" stroke-width="8"/><path d="${bars}" stroke="${pal.metalD}" stroke-width="4"/>`
        + `<rect x="${x - 50}" y="${b - 140}" width="100" height="14" rx="4" fill="${pal.iron}" ${O(3.5)}/><rect x="${x - 50}" y="${b - 12}" width="100" height="12" rx="3" fill="${pal.iron}" ${O(3.5)}/><path d="M${x} ${b - 140} V${b - 176}" stroke="${pal.metalD}" stroke-width="5"/>`;
    };

    /* ---------- декор на стене (x, y — центр) ---------- */
    const WDEC = {};
    P.WDEC = WDEC;
    WDEC.mural = (x, y) => {
      const w = 170, h = 128, X = x - w / 2, Y = y - h / 2;
      const g = `M${X + 30} ${Y + 46} q16 -14 32 0 q-16 14 -32 0 Z M${X + 41} ${Y + 46} a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M${X + 90} ${Y + 40} q8 -10 16 0 t16 0 t16 0 M${X + 90} ${Y + 54} q8 -10 16 0 t16 0 t16 0`
        + ` M${X + 28} ${Y + 96} q10 -16 20 0 t20 0 t20 -8 M${X + 110} ${Y + 84} a14 10 0 1 0 1 0`;
      return `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="4" fill="${pal.stoneL}" ${O(4)}/><rect x="${X + 8}" y="${Y + 8}" width="${w - 16}" height="${h - 16}" fill="none" stroke="${pal.accent}" stroke-width="3"/>`
        + `<path d="${g}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
    };
    WDEC.vein = (x, y) => `<path d="M${x - 54} ${y + 6} Q${x - 50} ${y - 26} ${x - 16} ${y - 30} Q${x + 10} ${y - 44} ${x + 40} ${y - 24} Q${x + 62} ${y - 10} ${x + 54} ${y + 14} Q${x + 30} ${y + 34} ${x - 4} ${y + 26} Q${x - 40} ${y + 32} ${x - 54} ${y + 6} Z" fill="${pal.wallD}" ${O(3)}/>`
      + `<path d="M${x - 30} ${y} l8 -10 l8 10 l-8 6 Z M${x + 4} ${y - 14} l8 -10 l8 10 l-8 6 Z M${x + 24} ${y + 10} l6 -8 l6 8 l-6 5 Z" fill="${GOLD}" ${O(2.4)}/>`;
    WDEC.gems = (x, y) => DEC.crystals(x, y + 30, 0.6);
    WDEC.flag = (x, y) => `<path d="M${x - 44} ${y - 70} H${x + 44}" stroke="${pal.metalD}" stroke-width="6" stroke-linecap="round"/><path d="M${x - 36} ${y - 68} H${x + 36} V${y + 50} L${x} ${y + 30} L${x - 36} ${y + 50} Z" fill="${pal.cloth}" ${O(4)}/>`
      + `<circle cx="${x}" cy="${y - 14}" r="16" fill="none" stroke="${GOLD}" stroke-width="4"/><path d="M${x - 24} ${y + 16} h48" stroke="${GOLD}" stroke-width="4"/>`;
    WDEC.shelf = (x, y) => {
      let jars = '';
      [-48, -16, 16, 48].forEach((dx, i) => { jars += `<rect x="${x + dx - 12}" y="${y - 34 - (i % 2) * 8}" width="24" height="${34 + (i % 2) * 8}" rx="5" fill="${[pal.plantL, pal.gem, PINK, GOLD][i]}" ${O(3)}/>`; });
      return jars + `<rect x="${x - 72}" y="${y}" width="144" height="14" fill="${pal.woodL}" ${O(3.5)}/><path d="M${x - 56} ${y + 14} l12 20 M${x + 56} ${y + 14} l-12 20" stroke="${INK}" stroke-width="5"/>`;
    };
    WDEC.window = (x, y) => `<circle cx="${x}" cy="${y}" r="96" fill="url(#ctMoon)" opacity=".5"/><path d="M${x - 40} ${y + 40} V${y - 10} A40 40 0 0 1 ${x + 40} ${y - 10} V${y + 40} Z" fill="url(#dgNight)" ${O(5)}/>`
      + `<path d="M${x - 14} ${y + 40} V${y - 46} M${x + 14} ${y + 40} V${y - 46} M${x - 40} ${y + 6} H${x + 40}" stroke="${pal.iron}" stroke-width="6"/><circle cx="${x + 20}" cy="${y - 20}" r="2.5" fill="#fff"/>`;
    WDEC.runes = (x, y) => {
      const on = P.anim();
      return `<circle cx="${x}" cy="${y}" r="80" fill="url(#dgGem2)" opacity=".55">${on ? '<animate attributeName="opacity" values=".3;.7;.3" dur="4s" repeatCount="indefinite"/>' : ''}</circle>`
        + `<path d="M${x - 50} ${y - 20} l12 -20 l12 20 M${x - 10} ${y - 34} v40 M${x - 22} ${y - 14} h24 M${x + 24} ${y - 34} l20 20 l-20 20 M${x - 44} ${y + 34} q20 -16 40 0 t40 0" fill="none" stroke="${pal.gem2}" stroke-width="6" stroke-linecap="round"/>`;
    };
    WDEC.moss = (x, y) => { y = 282; return `<path d="M${x - 70} ${y - 20} Q${x} ${y - 46} ${x + 70} ${y - 20} Q${x + 60} ${y + 4} ${x + 40} ${y} q-4 30 -10 0 q-16 6 -30 0 q-4 40 -10 0 q-20 4 -30 -2 q-6 24 -10 0 Q${x - 60} ${y + 4} ${x - 70} ${y - 20} Z" fill="${pal.plant}" ${O(3)}/>`; };
    WDEC.roots = (x, y) => `<path d="M${x - 60} ${y - 70} C${x - 40} ${y - 20} ${x - 70} ${y + 20} ${x - 40} ${y + 70} M${x} ${y - 80} C${x + 20} ${y - 30} ${x - 10} ${y + 10} ${x + 10} ${y + 60} M${x + 50} ${y - 70} C${x + 70} ${y - 30} ${x + 40} ${y} ${x + 60} ${y + 40}" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>`
      + `<path d="M${x - 60} ${y - 70} C${x - 40} ${y - 20} ${x - 70} ${y + 20} ${x - 40} ${y + 70} M${x} ${y - 80} C${x + 20} ${y - 30} ${x - 10} ${y + 10} ${x + 10} ${y + 60} M${x + 50} ${y - 70} C${x + 70} ${y - 30} ${x + 40} ${y} ${x + 60} ${y + 40}" fill="none" stroke="${pal.wood}" stroke-width="8" stroke-linecap="round"/>`;
    WDEC.net = (x, y) => {
      let d = ''; for (let i = -3; i <= 3; i++) d += `M${x + i * 22} ${y - 60} Q${x + i * 26} ${y} ${x + i * 20} ${y + 60}M${x - 70} ${y + i * 18} Q${x} ${y + i * 18 + 10} ${x + 70} ${y + i * 18}`;
      return `<path d="${d}" fill="none" stroke="${pal.sand}" stroke-width="3" opacity=".9"/><circle cx="${x - 30}" cy="${y + 10}" r="9" fill="${GOLD}" ${O(2.4)}/><circle cx="${x + 34}" cy="${y - 20}" r="8" fill="${pal.gem}" ${O(2.4)}/>`;
    };
    WDEC.lavaCrack = (x, y) => `<circle cx="${x}" cy="${y}" r="70" fill="url(#dgLava)" opacity=".5"/><path d="M${x - 50} ${y - 40} L${x - 20} ${y - 10} L${x - 30} ${y + 20} L${x + 10} ${y + 30} L${x + 40} ${y + 60}" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>`
      + `<path d="M${x - 50} ${y - 40} L${x - 20} ${y - 10} L${x - 30} ${y + 20} L${x + 10} ${y + 30} L${x + 40} ${y + 60}" fill="none" stroke="${pal.lavaL}" stroke-width="5" stroke-linejoin="round"/>`;
    WDEC.porthole = (x, y) => {
      const on = P.anim();
      return `<circle cx="${x}" cy="${y}" r="52" fill="${pal.metalD}" ${O(4)}/><circle cx="${x}" cy="${y}" r="38" fill="url(#dgWater)" ${O(3.5)}/>`
        + `<g>${on ? `<animateTransform attributeName="transform" type="translate" values="-20 0;20 0;-20 0" dur="7s" repeatCount="indefinite"/>` : ''}<path d="M${x - 14} ${y} q10 -10 22 0 l8 -6 v12 l-8 -6 q-12 10 -22 0 Z" fill="${GOLD}" ${O(2)}/></g>`
        + [0, 1, 2, 3, 4, 5].map((i) => { const a = i / 6 * Math.PI * 2; return `<circle cx="${f1(x + Math.cos(a) * 45)}" cy="${f1(y + Math.sin(a) * 45)}" r="3.5" fill="${INK}"/>`; }).join('');
    };
    WDEC.clock = (x, y) => {
      const on = P.anim();
      let tk = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; tk += `M${f1(x + Math.cos(a) * 46)} ${f1(y + Math.sin(a) * 46)} L${f1(x + Math.cos(a) * 54)} ${f1(y + Math.sin(a) * 54)}`; }
      return `<circle cx="${x}" cy="${y}" r="66" fill="${pal.accent2}" ${O(4)}/><circle cx="${x}" cy="${y}" r="58" fill="${CREAM}" ${O(3)}/><path d="${tk}" stroke="${INK}" stroke-width="4"/>`
        + `<path d="M${x} ${y} L${x + 22} ${y - 14}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
        + `<g transform="translate(${x} ${y})"><g>${on ? '<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite"/>' : ''}<path d="M0 6 L0 -44" stroke="${pal.cloth}" stroke-width="4" stroke-linecap="round"/></g></g><circle cx="${x}" cy="${y}" r="5" fill="${INK}"/>`;
    };
    WDEC.starChart = (x, y) => {
      let st = ''; [[-50, -30], [-20, -40], [10, -20], [40, -36], [-36, 10], [0, 20], [30, 26]].forEach(([dx, dy]) => { st += P.blob(x + dx, y + dy, 4, 4); });
      return `<rect x="${x - 80}" y="${y - 60}" width="160" height="120" rx="6" fill="#1d1a4a" ${O(4)}/><rect x="${x - 72}" y="${y - 52}" width="144" height="104" fill="none" stroke="${pal.accent2}" stroke-width="2.4"/>`
        + `<path d="M${x - 50} ${y - 30} L${x - 20} ${y - 40} L${x + 10} ${y - 20} L${x + 40} ${y - 36} M${x - 36} ${y + 10} L${x} ${y + 20} L${x + 30} ${y + 26}" fill="none" stroke="${pal.accent2}" stroke-width="2" opacity=".7"/><path d="${st}" fill="#fff"/>`;
    };
    WDEC.cobweb = (x, y) => `<path d="M${x - 70} ${y - 50} L${x + 50} ${y + 50} M${x - 70} ${y - 50} L${x + 60} ${y - 10} M${x - 70} ${y - 50} L${x - 10} ${y + 60} M${x - 40} ${y - 26} Q${x - 30} ${y - 14} ${x - 50} ${y - 4} M${x - 10} ${y - 2} Q${x + 6} ${y + 10} ${x - 26} ${y + 26} M${x + 20} ${y + 22} Q${x + 30} ${y + 40} ${x - 4} ${y + 48}" fill="none" stroke="${CREAM}" stroke-width="2.4" opacity=".6"/>`
      + `<circle cx="${x + 10}" cy="${y + 20}" r="7" fill="${INK}"/><path d="M${x + 10} ${y + 13} V${y - 30}" stroke="${CREAM}" stroke-width="1.6" opacity=".6"/>`;
    WDEC.herbs = (x, y) => {
      let s = `<path d="M${x - 90} ${y - 50} Q${x} ${y - 30} ${x + 90} ${y - 50}" fill="none" stroke="${pal.sand}" stroke-width="4"/>`;
      [-60, -20, 20, 60].forEach((dx, i) => { const yy = y - 42 + Math.abs(dx) * -0.1; s += `<path d="M${x + dx} ${yy} l-14 50 q14 10 28 0 Z" fill="${[pal.plant, pal.plantL, '#c9a85a', pal.plant][i]}" ${O(3)}/><path d="M${x + dx - 8} ${yy + 4} h16" stroke="${pal.cloth}" stroke-width="5"/>`; });
      return s;
    };
    WDEC.chains = (x, y) => {
      let l = ''; for (let i = 0; i < 7; i++) l += P.blob(x - 40, y - 80 + i * 20, 7, 10) + P.blob(x + 40, y - 70 + i * 20, 7, 10);
      return `<path d="${l}" fill="none" stroke="${INK}" stroke-width="7"/><path d="${l}" fill="none" stroke="${pal.metalD}" stroke-width="3.5"/><path d="M${x - 50} ${y + 66} h20 l-4 16 h-12 Z M${x + 30} ${y + 76} h20 l-4 16 h-12 Z" fill="${pal.iron}" ${O(2.6)}/>`;
    };
    // Восточная Марка: бойница-крестовина (в ней ночь и луна), карта укреплений, знамя Марки, щиты на стене
    WDEC.arrowSlit = (x, y) => `<circle cx="${x}" cy="${y}" r="80" fill="url(#ctMoon)" opacity=".55"/><path d="M${x - 34} ${y - 72} H${x + 34} V${y + 72} H${x - 34} Z" fill="${pal.stoneL}" ${O(4)}/>`
      + `<path d="M${x - 7} ${y - 58} H${x + 7} V${y - 10} H${x + 22} V${y + 4} H${x + 7} V${y + 58} H${x - 7} V${y + 4} H${x - 22} V${y - 10} H${x - 7} Z" fill="url(#dgNight)" ${O(3.5)}/><circle cx="${x + 2}" cy="${y - 36}" r="2.4" fill="#fff"/>`;
    WDEC.fortMap = (x, y) => {
      const s = `M${x - 34} ${y - 26} L${x} ${y - 44} L${x + 34} ${y - 26} L${x + 40} ${y + 12} L${x + 12} ${y + 34} L${x - 26} ${y + 30} L${x - 44} ${y + 4} Z`;
      return `<path d="M${x - 84} ${y - 62} H${x + 84} V${y + 58} H${x - 84} Z" fill="${pal.sand}" ${O(4)}/><path d="M${x - 84} ${y - 50} q-12 -6 0 -12 M${x + 84} ${y + 46} q12 6 0 12" fill="${pal.sand}" ${O(3)}/>`
        + `<path d="${s}" fill="none" stroke="#3a5a8a" stroke-width="4" stroke-linejoin="round"/><path d="M${x - 64} ${y + 44} q20 -24 40 -6 M${x + 50} ${y - 46} l20 10 l-6 -14 M${x + 70} ${y - 36} l-4 14" fill="none" stroke="#3a5a8a" stroke-width="3" stroke-linecap="round"/>`
        + `<path d="M${x + 44} ${y + 14} l26 18 M${x + 70} ${y + 32} l-12 0 M${x + 70} ${y + 32} l-4 -12" fill="none" stroke="${pal.cloth}" stroke-width="4" stroke-linecap="round"/>`
        + `<circle cx="${x - 30}" cy="${y - 10}" r="6" fill="${pal.cloth}" ${O(2)}/><circle cx="${x + 18}" cy="${y + 20}" r="6" fill="${pal.cloth}" ${O(2)}/><circle cx="${x + 6}" cy="${y - 32}" r="6" fill="${GOLD}" ${O(2)}/>`;
    };
    WDEC.warBanner = (x, y) => `<path d="M${x - 50} ${y - 84} H${x + 50}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${x - 50} ${y - 84} H${x + 50}" stroke="${pal.woodD}" stroke-width="6" stroke-linecap="round"/>`
      + `<path d="M${x - 40} ${y - 80} H${x + 40} V${y + 54} L${x + 20} ${y + 40} L${x} ${y + 60} L${x - 20} ${y + 40} L${x - 40} ${y + 54} Z" fill="${pal.banner}" ${O(4)}/><path d="M${x - 32} ${y - 70} V${y + 36} M${x + 32} ${y - 70} V${y + 36}" stroke="${pal.accent2}" stroke-width="3" opacity=".8"/>`
      + `<path d="M${x - 16} ${y + 16} V${y - 22} h-6 v-14 h10 v8 h7 v-8 h10 v8 h7 v-8 h10 v14 h-6 V${y + 16} Z" fill="${pal.accent2}" ${O(2.6)}/><path d="M${x - 5} ${y + 16} v-14 q5 -8 10 0 v14 Z" fill="${pal.bannerD}"/>`;
    WDEC.shieldRow = (x, y) => `<path d="M${x - 90} ${y - 44} H${x + 90}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${x - 90} ${y - 44} H${x + 90}" stroke="${pal.wood}" stroke-width="6" stroke-linecap="round"/>`
      + scutum(x - 56, y, 0.95) + `<circle cx="${x}" cy="${y - 2}" r="34" fill="${pal.banner}" ${O(4)}/><circle cx="${x}" cy="${y - 2}" r="10" fill="${pal.metal}" ${O(2.6)}/><path d="M${x} ${y - 32}V${y - 14}M${x} ${y + 10}V${y + 28}" stroke="${pal.accent2}" stroke-width="3.5"/>` + scutum(x + 56, y, 0.95);
    WDEC.icicles = (x, y) => {
      let d = ''; for (let i = 0; i < 6; i++) { const dx = -60 + i * 24, h = 30 + ((i * 37) % 50); d += `M${x + dx - 8} ${y - 40} L${x + dx} ${y - 40 + h} L${x + dx + 8} ${y - 40} Z`; }
      return `<path d="M${x - 76} ${y - 46} H${x + 76}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${x - 76} ${y - 46} H${x + 76}" stroke="${pal.snow}" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="${pal.gem}" ${O(2.6)}/>`;
    };

    /* ---------- опоры (ритм стены между проходами): тема задаёт вид ---------- */
    P.pillar = (kind, x) => {
      const b = B + 2;
      switch (kind) {
        case 'crib': return `<rect x="${x - 13}" y="262" width="26" height="${b - 262}" fill="${pal.wood}" ${O(4)}/><path d="M${x - 4} 280V${b - 20}" stroke="${INK}" stroke-width="2" opacity=".3"/>`
          + `<rect x="${x - 70}" y="250" width="140" height="24" fill="${pal.woodD}" ${O(4)}/><path d="M${x - 10} 330 L${x - 54} 276 M${x + 10} 330 L${x + 54} 276" stroke="${pal.woodD}" stroke-width="10" stroke-linecap="round"/>`;
        case 'column': return DEC.column(x, b, 330);
        case 'buttress': return `<path d="M${x - 30} ${b} V300 H${x + 30} V${b} Z" fill="${pal.wallL}" ${O(4)}/><path d="M${x - 30} 340h60M${x - 30} 420h60M${x - 30} 500h60M${x - 30} 580h60M${x - 30} 660h60" stroke="${INK}" stroke-width="2" opacity=".3"/>`
          + `<path d="M${x - 30} 300 Q${x - 130} 300 ${x - 190} 250 M${x + 30} 300 Q${x + 130} 300 ${x + 190} 250" fill="none" ${O(14)}/><path d="M${x - 30} 300 Q${x - 130} 300 ${x - 190} 250 M${x + 30} 300 Q${x + 130} 300 ${x + 190} 250" fill="none" stroke="${pal.wallL}" stroke-width="8"/>`;
        case 'icepillar': return `<path d="M${x - 34} 250 Q${x - 10} 420 ${x - 26} ${b} H${x + 30} Q${x + 12} 430 ${x + 36} 250 Z" fill="${pal.gem}" opacity=".85" ${O(4)}/><path d="M${x - 8} 300 q-6 120 2 220" fill="none" stroke="#fff" stroke-width="4" opacity=".7" stroke-linecap="round"/>`;
        case 'root': return `<path d="M${x - 30} 248 C${x - 60} 420 ${x + 30} 560 ${x - 20} ${b} M${x + 20} 248 C${x + 50} 380 ${x - 20} 520 ${x + 26} ${b}" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/>`
          + `<path d="M${x - 30} 248 C${x - 60} 420 ${x + 30} 560 ${x - 20} ${b} M${x + 20} 248 C${x + 50} 380 ${x - 20} 520 ${x + 26} ${b}" fill="none" stroke="${pal.wood}" stroke-width="21" stroke-linecap="round"/>`
          + `<path d="M${x - 20} 400 q-30 -10 -40 -34 q24 0 40 34 Z" fill="${pal.plant}" ${O(3)}/>`;
        case 'basalt': return `<path d="M${x - 36} ${b} V280 l36 -24 l36 24 V${b} Z" fill="#3a2a40" ${O(4)}/><path d="M${x} 256 V${b}" stroke="${INK}" stroke-width="2" opacity=".35"/><path d="M${x - 14} 330 l8 60 l-10 40 l8 70" fill="none" stroke="${pal.lavaL}" stroke-width="4" stroke-linecap="round"/>`;
        case 'obelisk': { const on = P.anim(); return `<path d="M${x - 30} ${b} L${x - 22} 330 L${x} 296 L${x + 22} 330 L${x + 30} ${b} Z" fill="${pal.stoneL}" ${O(4)}/><circle cx="${x}" cy="420" r="46" fill="url(#dgGem2)" opacity=".6">${on ? '<animate attributeName="opacity" values=".3;.75;.3" dur="3.8s" repeatCount="indefinite"/>' : ''}</circle><path d="M${x - 10} 400 l10 -16 l10 16 M${x} 384 v50 M${x - 12} 448 h24" fill="none" stroke="${pal.gem2}" stroke-width="5" stroke-linecap="round"/>`; }
        case 'ribs': return `<path d="M${x - 70} ${b} Q${x - 90} 460 ${x + 20} 262 M${x + 70} ${b} Q${x + 40} 520 ${x + 120} 300" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/><path d="M${x - 70} ${b} Q${x - 90} 460 ${x + 20} 262 M${x + 70} ${b} Q${x + 40} 520 ${x + 120} 300" fill="none" stroke="${pal.bone}" stroke-width="21" stroke-linecap="round"/>`;
        case 'beam': return `<rect x="${x - 16}" y="252" width="32" height="${b - 252}" fill="${pal.woodD}" ${O(4)}/><path d="M${x - 6} 270V${b - 20}" stroke="${INK}" stroke-width="2" opacity=".3"/>`
          + `<path d="M${x - 16} 320 L${x - 80} 256 M${x + 16} 320 L${x + 80} 256" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M${x - 16} 320 L${x - 80} 256 M${x + 16} 320 L${x + 80} 256" stroke="${pal.woodD}" stroke-width="11" stroke-linecap="round"/><circle cx="${x}" cy="${b - 200}" r="5" fill="${INK}" opacity=".6"/>`;
        case 'stalk': { const on = P.anim(); return `<circle cx="${x}" cy="320" r="150" fill="url(#dgPlant)" opacity=".45">${on ? '<animate attributeName="opacity" values=".3;.55;.3" dur="5s" repeatCount="indefinite"/>' : ''}</circle><path d="M${x - 26} ${b} Q${x - 14} 520 ${x - 18} 340 H${x + 18} Q${x + 14} 520 ${x + 26} ${b} Z" fill="${CREAM}" ${O(4)}/>`
          + `<path d="M${x - 130} 350 Q${x - 120} 252 ${x} 244 Q${x + 120} 252 ${x + 130} 350 Q${x} 330 ${x - 130} 350 Z" fill="${pal.accent}" ${O(4)}/><path d="${P.blob(x - 60, 300, 12, 10)} ${P.blob(x + 30, 280, 16, 12)} ${P.blob(x + 80, 316, 10, 8)}" fill="${CREAM}"/>`
          + `<path d="M${x - 110} 346 v14 M${x - 70} 340 v18 M${x - 30} 336 v14 M${x + 30} 336 v18 M${x + 70} 340 v14 M${x + 110} 346 v16" stroke="${INK}" stroke-width="3" opacity=".4"/>`; }
        case 'girder': { let rv = ''; for (let y = 280; y < b - 20; y += 50) rv += P.blob(x - 16, y, 4, 4) + P.blob(x + 16, y, 4, 4); return `<rect x="${x - 28}" y="250" width="56" height="${b - 250}" fill="${pal.metalD}" ${O(4)}/><path d="M${x - 28} 260 L${x + 28} 360 L${x - 28} 460 L${x + 28} 560 L${x - 28} 660 L${x + 28} ${b - 10}" fill="none" stroke="${INK}" stroke-width="5" opacity=".45"/><path d="${rv}" fill="${INK}" opacity=".6"/>`; }
        case 'gears': return `<rect x="${x - 14}" y="252" width="28" height="${b - 252}" fill="${pal.accent2}" ${O(4)}/>` + DEC.gear(x, 520, 46) + DEC.gear(x + 40, 400, 28);
        case 'hullRib': return `<path d="M${x - 40} ${b} Q${x - 60} 520 ${x - 10} 250" fill="none" stroke="${INK}" stroke-width="34" stroke-linecap="round"/><path d="M${x - 40} ${b} Q${x - 60} 520 ${x - 10} 250" fill="none" stroke="${pal.wood}" stroke-width="24" stroke-linecap="round"/><path d="M${x - 46} 700 l-4 -40 M${x - 52} 560 l-2 -40" stroke="${INK}" stroke-width="2.4" opacity=".4"/>`;
        case 'palisade': {
          // частокол: три заострённых бревна, стянутых верёвкой
          const log = (dx, t) => `M${x + dx - 13} ${b}V${t + 22}L${x + dx} ${t}L${x + dx + 13} ${t + 22}V${b}Z`;
          return `<path d="${log(-24, 284)}${log(24, 296)}${log(0, 258)}" fill="${pal.wood}" ${O(4)}/>`
            + `<path d="M${x - 40} 430H${x + 40}M${x - 40} 650H${x + 40}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M${x - 40} 430H${x + 40}M${x - 40} 650H${x + 40}" stroke="${pal.sand}" stroke-width="6" stroke-linecap="round"/>`;
        }
        case 'hoist': {
          // опора-подъёмник: столб с перекладиной, блок и цепь с крюком (сторона — по x, чтобы ряд не был одинаковым)
          const d = Math.floor(x / 13) % 2 ? 1 : -1, px = x + d * 58;
          let ch = ''; for (let y = 326; y < 452; y += 18) ch += P.blob(px, y, 5, 8);
          return `<rect x="${x - 16}" y="252" width="32" height="${b - 252}" fill="${pal.woodD}" ${O(4)}/>`
            + `<path d="M${x - 70} 296H${x + 70}M${x} 360L${x + d * 54} 300" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M${x - 70} 296H${x + 70}M${x} 360L${x + d * 54} 300" stroke="${pal.wood}" stroke-width="11" stroke-linecap="round"/>`
            + `<path d="${ch}M${px} 458 v10 q0 20 ${d * 16} 18 q${d * 12} -4 ${d * 8} -16" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`
            + `<circle cx="${px}" cy="312" r="13" fill="${pal.metalD}" ${O(3.5)}/>`;
        }
        case 'rock': return `<path d="M${x - 46} ${b} Q${x - 30} 600 ${x - 14} 520 L${x - 6} 470 L${x + 6} 470 L${x + 16} 520 Q${x + 34} 600 ${x + 46} ${b} Z" fill="${pal.wallL}" ${O(4)}/><path d="M${x - 30} 248 Q${x - 14} 330 ${x - 4} 420 L${x + 6} 420 Q${x + 16} 330 ${x + 32} 248 Z" fill="${pal.wallL}" ${O(4)}/>`;
        default: return '';
      }
    };

    /* ---------- предметы с глубиной (props): без <defs>, свечение — кругами ---------- */
    const PROP = {};
    P.PROP = PROP;
    PROP.stalagmite = (x, z) => P.shadow(x, z, 40) + `<path d="M${x - 38} ${z} Q${x - 26} ${z - 60} ${x - 6} ${z - 132} Q${x + 2} ${z - 142} ${x + 8} ${z - 126} Q${x + 24} ${z - 60} ${x + 36} ${z} Z" fill="${pal.wallL}" ${O(4)}/>`
      + `<path d="M${x - 20} ${z - 40}h30M${x - 12} ${z - 82}h18" stroke="${INK}" stroke-width="2" opacity=".35"/>`;
    PROP.lampPost = (x, z) => `<circle cx="${x + 26}" cy="${z - 176}" r="46" fill="${pal.glow}" opacity=".16"/><circle cx="${x + 26}" cy="${z - 176}" r="26" fill="${pal.glow}" opacity=".22"/>`
      + P.shadow(x, z, 30) + `<rect x="${x - 11}" y="${z - 230}" width="22" height="230" fill="${pal.wood}" ${O(4)}/><path d="M${x} ${z - 214} h30 v12" fill="none" stroke="${pal.iron}" stroke-width="5"/>`
      + `<rect x="${x + 12}" y="${z - 200}" width="28" height="40" rx="6" fill="${pal.glow}" ${O(3.5)}/><path d="M${x + 26} ${z - 194} V${z - 164}" stroke="${INK}" stroke-width="2" opacity=".4"/>`;
    PROP.column = (x, z) => P.shadow(x, z, 46) + `<rect x="${x - 26}" y="${z - 300}" width="52" height="290" fill="${pal.stoneL}" ${O(4)}/><path d="M${x - 10} ${z - 290}V${z - 20}M${x + 10} ${z - 290}V${z - 20}" stroke="${INK}" stroke-width="2" opacity=".28"/>`
      + `<rect x="${x - 38}" y="${z - 22}" width="76" height="22" fill="${pal.stoneD}" ${O(4)}/><path d="M${x - 40} ${z - 296} Q${x} ${z - 330} ${x + 40} ${z - 296} Z" fill="${pal.accent}" ${O(4)}/>`;
    PROP.bigShroom = (x, z) => `<circle cx="${x}" cy="${z - 130}" r="70" fill="${pal.plantL}" opacity=".14"/>` + P.shadow(x, z, 44)
      + `<path d="M${x - 16} ${z} Q${x - 12} ${z - 70} ${x - 8} ${z - 110} H${x + 8} Q${x + 12} ${z - 70} ${x + 16} ${z} Z" fill="${CREAM}" ${O(4)}/><path d="M${x - 80} ${z - 104} Q${x - 76} ${z - 180} ${x} ${z - 186} Q${x + 76} ${z - 180} ${x + 80} ${z - 104} Z" fill="${PINK}" ${O(4)}/>`
      + `<circle cx="${x - 36}" cy="${z - 140}" r="9" fill="${CREAM}"/><circle cx="${x + 20}" cy="${z - 160}" r="12" fill="${CREAM}"/><circle cx="${x + 48}" cy="${z - 124}" r="7" fill="${CREAM}"/>`;
    PROP.iceSpire = (x, z) => P.shadow(x, z, 40) + `<path d="M${x - 40} ${z} L${x - 18} ${z - 170} L${x + 6} ${z - 210} L${x + 22} ${z - 140} L${x + 40} ${z} Z" fill="${pal.gem}" ${O(4)}/><path d="M${x - 10} ${z - 160} l-8 70 M${x + 10} ${z - 120} l4 50" stroke="#fff" stroke-width="4" opacity=".75" stroke-linecap="round"/>`;
    PROP.snowman = (x, z) => P.shadow(x, z, 44) + `<circle cx="${x}" cy="${z - 40}" r="42" fill="${pal.snow}" ${O(4)}/><circle cx="${x}" cy="${z - 108}" r="30" fill="${pal.snow}" ${O(4)}/>`
      + `<path d="M${x - 20} ${z - 140} q20 -40 40 0 Z" fill="${pal.cloth}" ${O(3)}/><path d="M${x} ${z - 176} v-14" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/>`
      + `<circle cx="${x - 10}" cy="${z - 112}" r="4" fill="${INK}"/><circle cx="${x + 10}" cy="${z - 112}" r="4" fill="${INK}"/><path d="M${x} ${z - 104} l18 6 l-18 2 Z" fill="#ff8a3d" ${O(1.5)}/>`
      + `<path d="M${x + 36} ${z - 70} L${x + 54} ${z - 150}" stroke="${pal.woodD}" stroke-width="6" stroke-linecap="round"/><path d="M${x + 48} ${z - 150} l6 -30 l6 30 Z" fill="${pal.metal}" ${O(2.4)}/>`;
    PROP.totem = (x, z) => P.shadow(x, z, 34) + DEC.totem(x, z).replace(/^/, '');
    PROP.obsidian = (x, z) => P.shadow(x, z, 46) + `<path d="M${x - 40} ${z} L${x - 12} ${z - 180} L${x + 10} ${z - 120} L${x + 40} ${z} Z" fill="#3a2a40" ${O(4)}/><path d="M${x - 10} ${z - 150} l-4 60" stroke="#8a7aa8" stroke-width="4" opacity=".8" stroke-linecap="round"/>`
      + `<path d="M${x - 30} ${z - 10} l20 -40 l10 20" fill="none" stroke="${pal.lavaL}" stroke-width="4" stroke-linecap="round"/>`;
    PROP.crystalPillar = (x, z) => `<circle cx="${x}" cy="${z - 110}" r="70" fill="${pal.gem2}" opacity=".14"/>` + P.shadow(x, z, 40)
      + `<path d="M${x - 30} ${z} L${x - 24} ${z - 150} L${x} ${z - 196} L${x + 24} ${z - 150} L${x + 30} ${z} Z" fill="${pal.gem2}" ${O(4)}/><path d="M${x} ${z - 196} V${z}" stroke="${INK}" stroke-width="2" opacity=".3"/><path d="M${x - 12} ${z - 150} l-4 60" stroke="#fff" stroke-width="4" opacity=".7" stroke-linecap="round"/>`;
    PROP.stump = (x, z) => DEC.stump(x, z).replace(/url\(#dgPlant\)/g, pal.plantL).replace('opacity=".6"', 'opacity=".15"');
    PROP.barrels = (x, z) => DEC.barrels(x, z);
    PROP.rock = (x, z) => P.shadow(x, z, 56) + `<path d="M${x - 56} ${z} Q${x - 60} ${z - 50} ${x - 20} ${z - 70} Q${x + 30} ${z - 84} ${x + 54} ${z - 40} Q${x + 62} ${z - 10} ${x + 52} ${z} Z" fill="${pal.wallL}" ${O(4)}/><path d="M${x - 30} ${z - 40} q20 -12 40 -4" fill="none" stroke="${INK}" stroke-width="2.4" opacity=".35"/>`;
    PROP.coralRock = (x, z) => PROP.rock(x, z) + DEC.coral(x + 6, z - 50).replace(/stroke-width="16"/g, 'stroke-width="12"').replace(/stroke-width="9"/g, 'stroke-width="6"');
    // Восточная Марка: знамя на древке, учебное чучело с ведром вместо шлема, болт баллисты, застрявший в полу
    PROP.standard = (x, z) => P.shadow(x, z, 40) + `<path d="${P.blob(x, z - 6, 34, 10)}" fill="${pal.stoneD}" ${O(3)}/><rect x="${x - 6}" y="${z - 300}" width="12" height="294" fill="${pal.woodD}" ${O(3.5)}/>`
      + `<path d="M${x - 34} ${z - 276} H${x + 34} V${z - 170} L${x} ${z - 188} L${x - 34} ${z - 170} Z" fill="${pal.banner}" ${O(4)}/>`
      + `<path d="M${x - 40} ${z - 284} h80 v8 h-80 Z M${x} ${z - 300} l-8 -14 l8 -16 l8 16 Z M${x - 12} ${z - 206} V${z - 236} h-5 v-12 h8 v6 h5 v-6 h8 v6 h5 v-6 h8 v12 h-5 V${z - 206} Z" fill="${GOLD}" ${O(2.6)}/>`;
    PROP.dummy = (x, z) => P.shadow(x, z, 44) + `<path d="M${x} ${z} V${z - 190} M${x - 54} ${z - 150} H${x + 54}" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M${x} ${z} V${z - 190} M${x - 54} ${z - 150} H${x + 54}" stroke="${pal.woodD}" stroke-width="9" stroke-linecap="round"/>`
      + `<path d="M${x - 34} ${z - 156} Q${x - 44} ${z - 90} ${x - 26} ${z - 60} H${x + 26} Q${x + 44} ${z - 90} ${x + 34} ${z - 156} Z" fill="${pal.sand}" ${O(4)}/>`
      + `<circle cx="${x}" cy="${z - 190}" r="26" fill="${pal.sand}" ${O(4)}/><path d="M${x - 9} ${z - 196} l6 6 m0 -6 l-6 6 M${x + 4} ${z - 196} l6 6 m0 -6 l-6 6 M${x - 30} ${z - 112} H${x + 30} M${x - 28} ${z - 84} H${x + 28}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M${x - 30} ${z - 204} L${x - 24} ${z - 238} H${x + 24} L${x + 30} ${z - 204} Z" fill="${pal.metalD}" ${O(3.5)}/>`
      + scutum(x + 52, z - 70, 0.8);
    PROP.bolt = (x, z) => P.shadow(x, z, 40) + `<path d="${P.blob(x - 20, z - 4, 22, 7)} ${P.blob(x + 18, z - 2, 16, 6)}" fill="${pal.floorL}" ${O(2.6)}/>`
      + `<path d="M${x} ${z - 4} L${x + 70} ${z - 200}" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M${x} ${z - 4} L${x + 70} ${z - 200}" stroke="${pal.woodL}" stroke-width="10" stroke-linecap="round"/>`
      + `<path d="M${x + 48} ${z - 140} l-16 -6 l12 -44 l18 -2 Z M${x + 62} ${z - 136} l16 6 l8 -44 l-12 -12 Z" fill="${pal.cloth}" ${O(3)}/><path d="M${x + 14} ${z - 50} l26 -6" stroke="${pal.metalD}" stroke-width="5"/>`;
    PROP.signpost =(x, z, a, bTxt) => P.shadow(x, z, 34) + `<rect x="${x - 9}" y="${z - 250}" width="18" height="250" fill="${pal.wood}" ${O(4)}/>`
      + `<path d="M${x - 10} ${z - 236} H${x + 150} L${x + 178} ${z - 214} L${x + 150} ${z - 192} H${x - 10} Z" fill="${pal.woodD}" ${O(4)}/>` + P.txt(x + 76, z - 205, bTxt, 18, GOLD)
      + `<path d="M${x + 10} ${z - 178} H${x - 150} L${x - 178} ${z - 156} L${x - 150} ${z - 134} H${x + 10} Z" fill="${pal.woodD}" ${O(4)}/>` + P.txt(x - 76, z - 147, a, 18, CREAM);

    return P;
  }

  /* =====================================================================================
     ЗАДНИК: стена, свод, пол — по «текстурам» темы
     ===================================================================================== */
  function backdrop(P, th, W) {
    const { pal, rnd, O } = P;
    let s = P.defs();
    s += `<rect x="0" y="200" width="${W}" height="512" fill="${pal.wall}"/>`;
    const tex = th.wall || 'strata';
    if (tex === 'strata' || tex === 'mossy' || tex === 'coral' || tex === 'void' || tex === 'roots') {
      let strata = '';
      for (let r = 0; r < 5; r++) { let d = `M0 ${330 + r * 78}`; for (let x = 0; x <= W; x += 120) d += ` Q${x + 60} ${f1(330 + r * 78 + (rnd() * 26 - 13))} ${x + 120} ${f1(330 + r * 78 + (rnd() * 14 - 7))}`; strata += d; }
      s += `<path d="${strata}" fill="none" stroke="${INK}" stroke-width="2.2" opacity=".26"/>`;
      let st = ''; for (let i = 0; i < W / 44; i++) st += P.blob(20 + rnd() * (W - 40), 300 + rnd() * 380, 12 + rnd() * 22, 8 + rnd() * 12);
      s += `<path d="${st}" fill="${pal.wallL}" stroke="${INK}" stroke-width="2" stroke-opacity=".3"/>`;
    }
    if (tex === 'blocks' || tex === 'brick' || tex === 'marble' || tex === 'frost' || tex === 'fort') {
      const rh = tex === 'brick' ? 28 : 46, bw = tex === 'brick' ? 58 : 120;
      let seams = '';
      for (let r = 0; r * rh < 380; r++) { const y = 334 + r * rh; seams += `M0 ${y}H${W}`; for (let x = (r % 2) * bw / 2 - 30; x < W; x += bw) seams += `M${x} ${y}V${y + rh}`; }
      s += `<path d="${seams}" stroke="${INK}" stroke-width="${tex === 'brick' ? 1.6 : 2}" opacity=".28"/>`;
      let hl = ''; for (let i = 0; i < W / 70; i++) { const r = Math.floor(rnd() * (380 / rh)), x = Math.floor(rnd() * W / bw) * bw + (r % 2) * bw / 2 - 26; hl += `M${x} ${334 + r * rh + 3}h${bw - 8}v${rh - 6}h${-(bw - 8)}Z`; }
      s += `<path d="${hl}" fill="${pal.wallL}" opacity=".55"/>`;
      if (tex === 'marble') { let v = ''; for (let i = 0; i < W / 160; i++) { const x = rnd() * W, y = 360 + rnd() * 300; v += `M${f1(x)} ${f1(y)} q30 10 50 -6 t50 4`; } s += `<path d="${v}" fill="none" stroke="${pal.wallD}" stroke-width="2.4" opacity=".5"/>`; }
    }
    if (tex === 'ice') {
      let fac = ''; for (let i = 0; i < W / 90; i++) { const x = rnd() * W, y = 300 + rnd() * 380, w = 50 + rnd() * 70; fac += `M${f1(x)} ${f1(y)} l${f1(w * 0.5)} ${f1(-w * 0.4)} l${f1(w * 0.6)} ${f1(w * 0.2)} l${f1(-w * 0.2)} ${f1(w * 0.6)} Z`; }
      s += `<path d="${fac}" fill="${pal.wallL}" stroke="${INK}" stroke-width="2" stroke-opacity=".25"/>`;
      let cr = ''; for (let i = 0; i < W / 220; i++) { const x = rnd() * W, y = 330 + rnd() * 300; cr += `M${f1(x)} ${f1(y)} l${f1(20 + rnd() * 20)} ${f1(30 + rnd() * 20)} l${f1(-10)} ${f1(30)} M${f1(x + 20)} ${f1(y + 30)} l30 10`; }
      s += `<path d="${cr}" fill="none" stroke="#fff" stroke-width="3" opacity=".55" stroke-linecap="round"/>`;
    }
    if (tex === 'basalt') {
      let cols = ''; for (let x = 0; x < W; x += 54) { const t = 300 + ((x * 37) % 60); cols += `M${x} 712 V${t} l27 -14 l27 14`; }
      s += `<path d="${cols}" fill="none" stroke="${INK}" stroke-width="2.4" opacity=".35"/>`;
      let cr = ''; for (let i = 0; i < W / 260; i++) { const x = rnd() * W, y = 380 + rnd() * 260; cr += `M${f1(x)} ${f1(y)} l18 26 l-8 24 l20 30`; }
      s += `<path d="${cr}" fill="none" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/><path d="${cr}" fill="none" stroke="${pal.lavaL}" stroke-width="4" stroke-linejoin="round"/>`;
    }
    if (tex === 'mossy' || tex === 'roots' || tex === 'coral') {
      let drip = ''; for (let x = 20 + rnd() * 80; x < W; x += 90 + rnd() * 160) { const h = 20 + rnd() * 50; drip += `M${f1(x - 24)} 300 Q${f1(x)} 296 ${f1(x + 24)} 300 L${f1(x + 10)} ${f1(300 + h * 0.5)} Q${f1(x + 4)} ${f1(300 + h)} ${f1(x - 2)} ${f1(300 + h * 0.5)} Z`; }
      s += `<path d="${drip}" fill="${tex === 'coral' ? pal.waterL : pal.plant}" opacity=".85" ${O(2.4)}/>`;
    }
    if (tex === 'roots') {
      let rt = ''; for (let x = 40 + rnd() * 60; x < W; x += 140 + rnd() * 160) rt += `M${f1(x)} 250 C${f1(x - 30)} 360 ${f1(x + 30)} 460 ${f1(x - 10)} ${f1(560 + rnd() * 120)}`;
      s += `<path d="${rt}" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="${rt}" fill="none" stroke="${pal.wood}" stroke-width="9" stroke-linecap="round"/>`;
    }
    if (tex === 'planks' || tex === 'hull') {
      // дощатая стена: вертикальные доски (planks) или горизонтальная обшивка (hull)
      let d = '';
      if (tex === 'planks') for (let x = 0; x < W; x += 46 + Math.round(rnd() * 10)) d += `M${x} 252V712`;
      else for (let y = 300; y < 712; y += 38) { d += `M0 ${y}H${W}`; for (let x = (y % 76 ? 60 : 0) + rnd() * 80; x < W; x += 240 + rnd() * 120) d += `M${f1(x)} ${y - 38}V${y}`; }
      s += `<path d="${d}" stroke="${INK}" stroke-width="2.2" opacity=".35"/>`;
      let kn = ''; for (let i = 0; i < W / 120; i++) kn += P.blob(rnd() * W, 300 + rnd() * 380, 6 + rnd() * 5, 3 + rnd() * 3);
      s += `<path d="${kn}" fill="${pal.wallD}" opacity=".7"/>`;
    }
    if (tex === 'plates') {
      let d = '', rv = '';
      for (let y = 300; y < 712; y += 102) for (let x = (y % 204 ? 0 : -70); x < W; x += 140) { d += `M${x} ${y}h140v102h-140Z`; rv += P.blob(x + 10, y + 10, 3.4, 3.4) + P.blob(x + 130, y + 10, 3.4, 3.4) + P.blob(x + 10, y + 92, 3.4, 3.4) + P.blob(x + 130, y + 92, 3.4, 3.4); }
      s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2.4" opacity=".4"/><path d="${rv}" fill="${pal.wallL}" stroke="${INK}" stroke-width="1.6"/>`;
    }
    if (tex === 'shelves') {
      // книжные стены: полки и корешки (по одному path на цвет)
      const cols = [pal.cloth, pal.accent, pal.accent2, '#7a4a8a', pal.plant], by = cols.map(() => '');
      let sh = '';
      for (let y = 380; y < 700; y += 84) {
        sh += `M0 ${y}H${W}`;
        for (let x = rnd() * 20; x < W - 20; x += 16 + rnd() * 6) { if (rnd() < 0.12) { x += 30; continue; } const h = 44 + rnd() * 26; by[Math.floor(rnd() * cols.length)] += `M${f1(x)} ${y}v${f1(-h)}h13v${f1(h)}Z`; }
      }
      s += cols.map((c, i) => `<path d="${by[i]}" fill="${c}" opacity=".85"/>`).join('') + `<path d="${sh}" stroke="${pal.woodD}" stroke-width="10"/><path d="${sh}" stroke="${INK}" stroke-width="2" opacity=".5"/>`;
    }
    if (tex === 'frost') {
      // каменная кладка, присыпанная инеем
      let fr = ''; for (let r = 0; r * 46 < 380; r++) { const y = 334 + r * 46; for (let x = rnd() * 60; x < W; x += 80 + rnd() * 120) fr += `M${f1(x)} ${y} q16 -8 30 0 q14 -6 26 0 Z`; }
      s += `<path d="${fr}" fill="${pal.snow}" opacity=".85"/>`;
    }
    if (tex === 'fort') {
      // кладка крепости, перехваченная деревянными балками (пояс под сводом и пояс на уровне плеч); проходы рисуются поверх
      const bm = [[300, 26], [566, 20]];
      s += `<path d="${bm.map(([y, h]) => `M0 ${y}H${W}v${h}H0Z`).join('')}" fill="${pal.wood}" ${O(3.5)}/>`;
      let pg = ''; bm.forEach(([y, h]) => { for (let x = 30 + rnd() * 40; x < W; x += 150 + rnd() * 60) pg += P.blob(x, y + h / 2, 4, 4); });
      s += `<path d="${bm.map(([y, h]) => `M0 ${y + h - 6}H${W}`).join('')}" stroke="${pal.woodD}" stroke-width="5"/><path d="${pg}" fill="${INK}" opacity=".55"/>`;
    }
    if (tex === 'void') {
      let sp = ''; for (let i = 0; i < W / 30; i++) sp += P.blob(rnd() * W, 300 + rnd() * 380, 1.6 + rnd() * 1.6, 1.6 + rnd() * 1.6);
      s += `<path d="${sp}" fill="#fff" opacity=".55"/>`;
    }
    if (th.frieze) {
      s += `<rect x="0" y="294" width="${W}" height="36" fill="${pal.accent}" ${O(4)}/>`;
      let zig = 'M0 324'; for (let x = 0; x < W; x += 36) zig += ` L${x + 18} 300 L${x + 36} 324`;
      s += `<path d="${zig}" fill="none" stroke="${mix(pal.accent, '#ffffff', 0.45)}" stroke-width="4"/><path d="M0 294H${W}M0 330H${W}" ${O(4)}/>`;
    }
    // свод: тьма сверху (зоны алертов и созвездия), неровный край ниже y 210
    const CE = [[0, -10], [W, -10], [W, 238]];
    for (let x = W; x > 0; x -= 70) CE.push([x - 35, 226 + Math.round(rnd() * 36)], [x - 70, 240 + Math.round(rnd() * 22)]);
    s += `<path d="${pathOf(CE)}" fill="url(#dgCeil)"/>`;
    let edge = 'M0 ' + CE[3][1]; for (let i = 3; i < CE.length; i++) edge += ` L${CE[i][0]} ${CE[i][1]}`;
    s += `<path d="${edge}" fill="none" ${O(5)}/>`;
    s += ceilingTips(P, th, W);
    // пол
    s += `<rect x="0" y="700" width="${W}" height="380" fill="${pal.floor}"/>`;
    const ft = th.floor || 'pebbles';
    if (ft === 'pebbles' || ft === 'snow' || ft === 'moss' || ft === 'wetsand') {
      let peb = ''; for (let i = 0; i < W / (ft === 'pebbles' ? 11 : 20); i++) { const y = 712 + rnd() * 360, r = 8 + rnd() * 12 * (0.6 + (y - 700) / 380); peb += P.blob(rnd() * W, y, r, r * 0.5); }
      s += `<path d="${peb}" fill="${pal.floorL}" stroke="${INK}" stroke-width="2" stroke-opacity="${ft === 'snow' ? 0.15 : 0.3}"/>`;
    }
    if (ft === 'ripples' || ft === 'wetsand' || ft === 'snow') {
      let rip = '';
      for (let y = 724; y < 1070; y += 30 + (y - 700) * 0.06) { let x = -40 + rnd() * 60; rip += `M${f1(x)} ${f1(y)}`; while (x < W + 40) { const st = 70 + rnd() * 50; rip += ` q${f1(st / 2)} ${f1(-6 - rnd() * 4)} ${f1(st)} 0`; x += st; } }
      s += `<path d="${rip}" fill="none" stroke="${pal.floorL}" stroke-width="3" stroke-linecap="round"/>`;
    }
    if (ft === 'planks') {
      let pl = ''; const rows = [700, 724, 752, 786, 826, 872, 924, 984, 1050, 1080];
      for (let i = 0; i < rows.length - 1; i++) { pl += `M0 ${rows[i]}H${W}`; const st = 140 + i * 30; for (let x = (i % 2) * st / 2 + rnd() * 30; x < W; x += st) pl += `M${f1(x)} ${rows[i]}V${rows[i + 1]}`; }
      s += `<path d="${pl}" stroke="${INK}" stroke-width="2" opacity=".35"/>`;
      let nails = ''; for (let i = 0; i < W / 60; i++) nails += P.blob(rnd() * W, 740 + rnd() * 320, 2.2, 2.2);
      s += `<path d="${nails}" fill="${INK}" opacity=".35"/>`;
    }
    if (ft === 'tiles') {
      const rows = [700, 718, 739, 764, 793, 827, 866, 910, 960, 1016, 1080];
      let tl = '';
      for (let i = 0; i < rows.length - 1; i++) { const st = 40 + i * 9, off = (i % 2) * st / 2; tl += `M0 ${rows[i]}H${W}`; for (let x = -off; x < W; x += st) tl += `M${f1(x)} ${rows[i]}V${rows[i + 1]}`; }
      s += `<path d="${tl}" stroke="${pal.floorL}" stroke-width="2" opacity=".9"/>`;
    }
    if (ft === 'cracks') {
      let cr = ''; for (let i = 0; i < W / 140; i++) { const x = rnd() * W, y = 740 + rnd() * 300; cr += `M${f1(x)} ${f1(y)} l${f1(30 + rnd() * 30)} ${f1(-6 + rnd() * 12)} l${f1(20 + rnd() * 30)} ${f1(10)}`; }
      s += `<path d="${cr}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" opacity=".6"/><path d="${cr}" fill="none" stroke="${pal.lava}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
    }
    if (ft === 'moss') {
      let ms = ''; for (let i = 0; i < W / 120; i++) ms += P.blob(rnd() * W, 740 + rnd() * 320, 40 + rnd() * 50, 8 + rnd() * 6);
      s += `<path d="${ms}" fill="${pal.plant}" opacity=".35"/>`;
    }
    s += `<rect x="0" y="700" width="${W}" height="46" fill="url(#ctFloorShade)"/><path d="M0 700H${W}" ${O(4)}/>`;
    return s;
  }
  function ceilingTips(P, th, W) {
    const { pal, rnd, O } = P, kind = th.ceil || 'rock';
    let d = '', s = '';
    for (let x = 60 + rnd() * 80; x < W - 40; x += 150 + rnd() * 230) {
      const w = 18 + rnd() * 16, h = 40 + rnd() * 60;
      if (kind === 'roots' || kind === 'vines') d += `M${f1(x)} 248 C${f1(x - 8)} ${f1(248 + h * 0.4)} ${f1(x + 10)} ${f1(248 + h * 0.8)} ${f1(x - 4)} ${f1(250 + h * 1.3)}`;
      else if (kind === 'blocks') d += `M${f1(x - w)} 246 h${f1(w * 2)} v${f1(h * 0.4)} h${f1(-w * 0.8)} v${f1(h * 0.3)} h${f1(-w * 1.2)} Z`;
      else d += `M${f1(x - w / 2)} 250 L${f1(x)} ${f1(250 + h)} L${f1(x + w / 2)} 250 Z`;
    }
    if (kind === 'roots') s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${pal.wood}" stroke-width="5" stroke-linecap="round"/>`;
    else if (kind === 'vines') s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${pal.plant}" stroke-width="5" stroke-linecap="round"/>`;
    else s += `<path d="${d}" fill="${kind === 'ice' ? pal.gem : kind === 'crystal' ? pal.gem2 : pal.wallD}" ${O(3.5)}/>`;
    return s;
  }

  /* =====================================================================================
     ПРОХОДЫ. Каждый: { svg, door:{x,y}, spot:{x,y}, hw } — hw — полуширина, занятая на стене.
     Стиль рамки задаёт тема: timber | block | arch | cave | roots | ice | basalt | rune | door
     ===================================================================================== */
  function opening(P, style, cx, hw, top, interior) {
    const { pal, O } = P;
    let back = '', inner = '', front = '';
    const trap = `M${cx - hw} ${B} L${cx - hw + 6} ${top} H${cx + hw - 6} L${cx + hw} ${B} Z`;
    const arch = `M${cx - hw} ${B} V${top + hw} A${hw} ${hw} 0 0 1 ${cx + hw} ${top + hw} V${B} Z`;
    const cave = pathOf([[cx - hw, B], [cx - hw - 8, top + 120], [cx - hw * 0.7, top + 30], [cx - hw * 0.2, top], [cx + hw * 0.4, top + 8], [cx + hw * 0.85, top + 50], [cx + hw + 6, top + 140], [cx + hw, B]]);
    let fill = 'url(#dgDeep)';
    switch (style) {
      case 'timber':
        inner = trap;
        front = `<rect x="${cx - hw - 14}" y="${top}" width="26" height="${B - top}" fill="${pal.wood}" ${O(4)}/><rect x="${cx + hw - 12}" y="${top}" width="26" height="${B - top}" fill="${pal.wood}" ${O(4)}/>`
          + `<rect x="${cx - hw - 34}" y="${top - 26}" width="${2 * hw + 68}" height="30" fill="${pal.woodD}" ${O(4)}/>`
          + `<path d="M${cx - hw + 12} ${top + 50} L${cx - hw + 54} ${top + 6} M${cx + hw - 12} ${top + 50} L${cx + hw - 54} ${top + 6}" stroke="${pal.woodD}" stroke-width="11" stroke-linecap="round"/>`;
        break;
      case 'block':
        back = `<path d="M${cx - hw - 48} ${B} L${cx - hw - 26} ${top - 20} H${cx + hw + 26} L${cx + hw + 48} ${B} Z" fill="${pal.stoneL}" ${O(5)}/>`;
        inner = trap;
        front = `<rect x="${cx - hw - 64}" y="${top - 56}" width="${2 * hw + 128}" height="44" fill="${pal.stoneD}" ${O(5)}/>`
          + `<g transform="translate(${cx} ${top - 34}) scale(.6)"><path d="M-12 0 C-30 -14 -52 -12 -66 -4 C-50 -2 -34 4 -12 8 Z M12 0 C30 -14 52 -12 66 -4 C50 -2 34 4 12 8 Z" fill="${pal.accent2}" ${O(5)}/><circle r="14" fill="${pal.accent2}" ${O(5)}/></g>`;
        break;
      case 'arch': case 'door': {
        const R = hw + 30;
        back = `<path d="M${cx - R} ${B} V${top + hw} A${R} ${R} 0 0 1 ${cx + R} ${top + hw} V${B} Z" fill="${pal.stoneL}" ${O(5)}/>`;
        let vs = ''; for (let i = 1; i < 9; i++) { const a = Math.PI * i / 9; vs += `M${f1(cx - Math.cos(a) * hw)} ${f1(top + hw - Math.sin(a) * hw)} L${f1(cx - Math.cos(a) * R)} ${f1(top + hw - Math.sin(a) * R)}`; }
        back += `<path d="${vs}" stroke="${INK}" stroke-width="2.4" opacity=".45"/><path d="M${cx - 16} ${top - 30} h32 l-6 34 h-20 Z" fill="${pal.accent}" ${O(3.5)}/>`;
        inner = arch;
        if (style === 'door') front = `<path d="M${cx + hw - 4} ${B} L${cx + hw + 40} ${B - 20} V${top + hw - 10} L${cx + hw - 4} ${top + hw + 8} Z" fill="${pal.wood}" ${O(4)}/><path d="M${cx + hw + 8} ${B - 6} V${top + hw + 6} M${cx + hw + 24} ${B - 12} V${top + hw}" stroke="${INK}" stroke-width="2" opacity=".4"/><circle cx="${cx + hw + 30}" cy="${(B + top + hw) / 2}" r="5" fill="${GOLD}" ${O(2)}/>`;
        break;
      }
      case 'gate': {
        // крепостные ворота: каменный портал, деревянная перемычка и поднятая решётка (зубья торчат сверху)
        back = `<path d="M${cx - hw - 44} ${B} L${cx - hw - 30} ${top - 20} H${cx + hw + 30} L${cx + hw + 44} ${B} Z" fill="${pal.stoneL}" ${O(5)}/>`
;
        inner = trap;
        let bars = `M${f1(cx - hw + 6)} ${top + 26}H${f1(cx + hw - 6)}`; for (let x = cx - hw + 20; x < cx + hw - 12; x += 28) bars += `M${f1(x)} ${top + 2}V${top + 58}l-6 0l6 14l6 -14l-6 0`;
        front = `<path d="${bars}" fill="${pal.metalD}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/><path d="${bars}" fill="${pal.metalD}" stroke="${pal.metalD}" stroke-width="4.5" stroke-linejoin="round"/>`
          + `<rect x="${cx - hw - 40}" y="${top - 30}" width="${2 * hw + 80}" height="30" fill="${pal.woodD}" ${O(4)}/>`
          + `<path d="M${cx - hw - 20} ${top - 30}v30M${cx + hw + 20} ${top - 30}v30" stroke="${pal.metalD}" stroke-width="8"/>`;
        break;
      }
      case 'cave':
        back = `<path d="${cave}" fill="${pal.wallD}" stroke="${pal.wallD}" stroke-width="34" stroke-linejoin="round"/>`;
        inner = cave;
        break;
      case 'roots':
        inner = cave;
        front = `<path d="M${cx - hw - 20} ${B} C${cx - hw - 30} ${top + 120} ${cx - hw} ${top + 20} ${cx} ${top - 10} C${cx + hw} ${top + 10} ${cx + hw + 40} ${top + 120} ${cx + hw + 16} ${B} M${cx - hw + 10} ${top + 40} C${cx - 20} ${top - 20} ${cx + 40} ${top + 10} ${cx + hw - 10} ${top + 60}" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/>`
          + `<path d="M${cx - hw - 20} ${B} C${cx - hw - 30} ${top + 120} ${cx - hw} ${top + 20} ${cx} ${top - 10} C${cx + hw} ${top + 10} ${cx + hw + 40} ${top + 120} ${cx + hw + 16} ${B} M${cx - hw + 10} ${top + 40} C${cx - 20} ${top - 20} ${cx + 40} ${top + 10} ${cx + hw - 10} ${top + 60}" fill="none" stroke="${pal.wood}" stroke-width="17" stroke-linecap="round"/>`
          + `<path d="M${cx - 30} ${top - 8} q-20 -20 -6 -34 q14 10 6 34 Z M${cx + 40} ${top} q24 -16 34 0 q-16 12 -34 0 Z" fill="${pal.plant}" ${O(3)}/>`;
        break;
      case 'ice': {
        const jag = pathOf([[cx - hw, B], [cx - hw - 10, top + 100], [cx - hw * 0.6, top + 20], [cx - hw * 0.1, top + 6], [cx + hw * 0.5, top + 16], [cx + hw + 8, top + 90], [cx + hw, B]]);
        back = `<path d="${jag}" fill="${pal.wallL}" stroke="${pal.gem}" stroke-width="40" stroke-linejoin="round"/><path d="${jag}" fill="none" stroke="${INK}" stroke-width="46" stroke-linejoin="round" opacity="0"/>`;
        inner = jag;
        let ic = ''; for (let i = 0; i < 7; i++) { const x = cx - hw * 0.8 + i * hw * 0.27, h = 24 + ((i * 29) % 30); ic += `M${f1(x - 8)} ${top + 14} L${f1(x)} ${f1(top + 14 + h)} L${f1(x + 8)} ${top + 14} Z`; }
        front = `<path d="${ic}" fill="${pal.snow}" ${O(2.6)}/><path d="M${cx - hw - 26} ${top + 6} Q${cx} ${top - 30} ${cx + hw + 26} ${top + 6}" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M${cx - hw - 26} ${top + 6} Q${cx} ${top - 30} ${cx + hw + 26} ${top + 6}" fill="none" stroke="${pal.snow}" stroke-width="13" stroke-linecap="round"/>`;
        break;
      }
      case 'basalt':
        inner = trap; fill = 'url(#dgLavaIn)';
        front = [cx - hw - 22, cx + hw + 22].map((x) => `<path d="M${x - 24} ${B} V${top - 10} l24 -16 l24 16 V${B} Z" fill="#3a2a40" ${O(4)}/><path d="M${x - 6} ${top + 20} l10 40 l-8 30 l10 50" fill="none" stroke="${pal.lavaL}" stroke-width="4" stroke-linecap="round"/>`).join('')
          + `<rect x="${cx - hw - 50}" y="${top - 40}" width="${2 * hw + 100}" height="32" fill="#4a3650" ${O(4)}/>`;
        break;
      case 'rune': {
        const R = hw + 26, cy = top + hw;
        back = `<circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="${pal.stoneD}" ${O(5)}/>`;
        let st = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; st += P.blob(cx + Math.cos(a) * (R + 2), cy + Math.sin(a) * (R + 2), 9, 9); }
        back += `<path d="${st}" fill="${pal.gem2}" ${O(2.4)}/>`;
        inner = `M${cx - hw} ${B} V${cy} A${hw} ${hw} 0 0 1 ${cx + hw} ${cy} V${B} Z`;
        fill = 'url(#dgNight)';
        const on = P.anim();
        front = `<g transform="translate(${cx} ${cy + 40})"><g>${on ? '<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="18s" repeatCount="indefinite"/>' : ''}`
          + `<path d="M-60 0 A60 60 0 0 1 60 0 M-40 0 A40 40 0 0 0 40 0 M-20 0 A20 20 0 0 1 20 0" fill="none" stroke="${pal.gem2}" stroke-width="5" opacity=".8" stroke-linecap="round"/></g></g>`;
        break;
      }
      default: inner = trap;
    }
    return back + `<path d="${inner}" fill="${fill}" ${O(5)}/>` + (interior || '') + front;
  }
  // рисует проход нужного вида
  function drawExit(P, th, ex, cx, opt) {
    const { pal, O, rnd } = P;
    const frames = Object.assign({ tunnel: 'timber', back: 'timber', down: 'arch', hole: 'cave', shaft: 'lift', pit: 'hole', out: 'ladder' }, th.frame || {});
    const S = th.signs || {};
    const short = ex.label && ex.label.length <= 15 && !/^(Назад|Наружу|Наверх)$/.test(ex.label) ? ex.label.toUpperCase() : null;
    const signTxt = short || S[ex.kind] || { tunnel: 'ПРОХОД', back: 'НАЗАД', down: 'ВНИЗ', hole: 'ЛАЗ', shaft: 'ВНИЗ', pit: 'ВНИЗ', out: 'НАРУЖУ' }[ex.kind];
    const big = opt.big ? 1.15 : 0.94 + rnd() * 0.14;
    let s = '', door = { x: cx, y: 812 }, spot = { x: cx, y: 640 }, hw = 150;
    const signAt = (y, rot = 0) => P.sign(cx, y, P.signW(signTxt, 24), 50, [[signTxt, 24, GOLD]], rot);
    if (ex.kind === 'tunnel' || ex.kind === 'back') {
      const h = 115 * big, top = B - 272 * big;
      const interior = `<path d="M${cx - h * 0.55} ${B} L${cx - h * 0.5} ${top + 60} H${cx + h * 0.5} L${cx + h * 0.55} ${B} M${cx - h * 0.26} ${B} L${cx - h * 0.22} ${top + 110} H${cx + h * 0.22} L${cx + h * 0.26} ${B}" fill="none" stroke="${INK}" stroke-width="5" opacity=".35"/>`
        + `<circle cx="${cx}" cy="${top + 120}" r="34" fill="url(#ctGlow)" opacity=".5"/>`;
      s += P.shadow(cx, B + 4, h + 50) + opening(P, frames[ex.kind] || frames.tunnel, cx, h, top, interior);
      s += signAt(top - 70);
      if (ex.kind === 'back') s += P.arrowBack(cx - h - 40, top + 80);
      hw = h + 60; spot = { x: cx, y: top + 130 };
    } else if (ex.kind === 'down') {
      const h = 125 * big, top = B - 300 * big;
      let steps = ''; for (let i = 0; i < 6; i++) { const y = B - 14 - i * 22, w = h - 8 - i * 15; steps += `M${f1(cx - w)} ${y}H${f1(cx + w)}v10H${f1(cx - w)}Z`; }
      const interior = `<path d="${steps}" fill="${pal.wallL}" stroke="${INK}" stroke-width="2.4" opacity=".75"/>`;
      s += P.shadow(cx, B + 4, h + 60) + opening(P, frames.down, cx, h, top, interior);
      s += signAt(top - 60) + P.arrowDown(cx + h + 52, top + 90);
      hw = h + 70; spot = { x: cx, y: top + 150 };
    } else if (ex.kind === 'hole') {
      const r = 86;
      const st = frames.hole;
      if (st === 'mouse') {
        s += P.shadow(cx, B + 4, 120) + `<path d="M${cx - r} ${B} V${B - 90} A${r} ${r} 0 0 1 ${cx + r} ${B - 90} V${B} Z" fill="url(#ctWarm)" ${O(5)}/>`;
      } else {
        const crack = pathOf([[cx - r, B], [cx - r - 6, B - 70], [cx - r * 0.5, B - 150], [cx - 6, B - 196], [cx + r * 0.4, B - 140], [cx + r * 0.6, B - 80], [cx + r + 8, B]]);
        s += P.shadow(cx, B + 4, 120) + `<path d="${crack}" fill="${pal.wallD}" stroke="${pal.wallD}" stroke-width="22" stroke-linejoin="round"/><path d="${crack}" fill="url(#dgDeep)" ${O(4.5)}/>`;
        s += `<path d="M${cx - 6} ${B - 196} l-14 -40 l10 -26 M${cx + r * 0.6} ${B - 80} l30 -20" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
        s += `<path d="${P.blob(cx - r - 22, B - 12, 22, 12)} ${P.blob(cx + r + 26, B - 10, 18, 10)}" fill="${pal.wallL}" ${O(3)}/>`;
      }
      s += P.sign(cx, B - 262, P.signW(signTxt, 22), 46, [[signTxt, 22, GOLD]], (rnd() - 0.5) * 8);
      hw = r + 60; spot = { x: cx, y: B - 120 };
    } else if (ex.kind === 'shaft') {
      const st = frames.shaft;
      s += P.shadow(cx, B + 4, 170) + `<path d="M${cx - 120} ${B} L${cx - 96} ${B - 40} H${cx + 96} L${cx + 120} ${B} Z" fill="${pal.hole}" ${O(4)}/>`;
      s += `<rect x="${cx - 132}" y="${B - 30}" width="264" height="30" rx="6" fill="${pal.stoneL}" ${O(5)}/><path d="M${cx - 80} ${B - 30}v30M${cx - 20} ${B - 30}v30M${cx + 40} ${B - 30}v30M${cx + 100} ${B - 30}v30" stroke="${INK}" stroke-width="1.8" opacity=".35"/>`;
      if (st === 'chute') {
        // струя (песок/вода/снег/лава) из свода в колодец
        const col = th.chuteColor || pal.sand, on = P.anim();
        s += `<path d="M${cx + 20} 250 L${cx - 4} 330 L${cx + 26} 420" fill="none" stroke="${pal.hole}" stroke-width="9" stroke-linejoin="round"/>`
          + `<path d="M${cx} 262 V${B - 26}" stroke="${col}" stroke-width="22" stroke-dasharray="18 10" stroke-linecap="round" opacity=".9">${on ? '<animate attributeName="stroke-dashoffset" from="0" to="-56" dur="0.9s" repeatCount="indefinite"/>' : ''}</path>`;
        spot = { x: cx - 150, y: 560 };
      } else if (st === 'vine') {
        s += `<path d="M${cx} 250 C${cx - 20} 380 ${cx + 24} 520 ${cx} ${B - 20}" fill="none" stroke="${INK}" stroke-width="16"/><path d="M${cx} 250 C${cx - 20} 380 ${cx + 24} 520 ${cx} ${B - 20}" fill="none" stroke="${pal.plant}" stroke-width="9"/>`;
        let lv = ''; for (let i = 0; i < 6; i++) { const y = 300 + i * 80, x = cx + (i % 2 ? 14 : -14); lv += `M${x} ${y} q${i % 2 ? 26 : -26} -10 ${i % 2 ? 30 : -30} 12 q${i % 2 ? -16 : 16} 6 ${i % 2 ? -30 : 30} -12 Z`; }
        s += `<path d="${lv}" fill="${pal.plantL}" ${O(2.4)}/>`;
        spot = { x: cx - 140, y: 560 };
      } else if (st === 'portal') {
        s += opening(P, 'rune', cx, 80, B - 250, '');
        spot = { x: cx, y: B - 130 };
      } else {
        // lift: копёр с воротом и ведром (ведро качается)
        s += `<path d="M${cx - 110} ${B - 26} L${cx - 20} 420 M${cx + 110} ${B - 26} L${cx + 20} 420" stroke="${INK}" stroke-width="24" stroke-linecap="round"/><path d="M${cx - 110} ${B - 26} L${cx - 20} 420 M${cx + 110} ${B - 26} L${cx + 20} 420" stroke="${pal.wood}" stroke-width="16" stroke-linecap="round"/>`;
        s += `<rect x="${cx - 54}" y="400" width="108" height="26" rx="12" fill="${pal.woodD}" ${O(4)}/><path d="M${cx + 54} 412 h22 v26" fill="none" stroke="${pal.iron}" stroke-width="6" stroke-linecap="round"/>`;
        const on = P.anim();
        s += `<g transform="translate(${cx} 426)"><g>${on ? '<animateTransform attributeName="transform" type="rotate" values="-3;3;-3" dur="3.4s" repeatCount="indefinite"/>' : ''}<path d="M0 0 V170" stroke="${pal.metalD}" stroke-width="4"/>`
          + `<path d="M-34 170 H34 L28 226 H-28 Z" fill="${pal.metal}" ${O(4)}/><path d="M-34 176 Q0 140 34 176" fill="none" stroke="${pal.iron}" stroke-width="4"/></g></g>`;
        spot = { x: cx - 120, y: 600 };
      }
      s += P.sign(cx, 370, P.signW(signTxt, 24), 50, [[signTxt, 24, GOLD]]) + P.arrowDown(cx + 150, 560);
      hw = 175;
    } else if (ex.kind === 'out') {
      const st = frames.out;
      if (st === 'portal') {
        s += opening(P, 'rune', cx, 110, B - 330, '') + P.arrowUp(cx + 170, 560);
        spot = { x: cx, y: B - 170 };
      } else {
        s += `<circle cx="${cx}" cy="330" r="180" fill="url(#ctMoon)" opacity=".6"/>`
          + `<path d="M${cx - 112} 452 L${cx - 124} 330 L${cx - 84} 262 L${cx - 20} 240 L${cx + 66} 250 L${cx + 112} 300 L${cx + 120} 400 L${cx + 94} 456 Z" fill="url(#dgNight)" ${O(5)}/>`
          + `<circle cx="${cx + 50}" cy="300" r="20" fill="#fff3c8" ${O(3)}/><circle cx="${cx - 56}" cy="300" r="2.4" fill="#fff"/><circle cx="${cx - 18}" cy="278" r="2" fill="#fff"/><circle cx="${cx + 8}" cy="340" r="2" fill="#fff"/>`;
        if (st === 'slope') {
          const col = th.slopeColor || pal.sand;
          s += `<path d="M${cx - 180} ${B + 4} Q${cx - 150} 600 ${cx - 110} 452 Q${cx} 470 ${cx + 96} 452 Q${cx + 150} 600 ${cx + 240} ${B + 4} Z" fill="${col}" ${O(4)}/>`
            + `<path d="M${cx - 120} 560 q40 -10 80 0 q40 10 80 0 M${cx - 150} 650 q50 -12 100 0 q50 12 100 0 M${cx - 160} 730 q60 -12 120 0 q60 12 120 0" fill="none" stroke="${INK}" stroke-width="2.4" opacity=".3"/>`;
        }
        // лестница к пролому
        s += `<path d="M${cx - 44} 452 L${cx - 52} ${B} M${cx + 44} 452 L${cx + 52} ${B}" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M${cx - 44} 452 L${cx - 52} ${B} M${cx + 44} 452 L${cx + 52} ${B}" stroke="${pal.wood}" stroke-width="12" stroke-linecap="round"/>`;
        let rungs = ''; for (let y = 490; y < B - 10; y += 46) rungs += `M${cx - 46} ${y}H${cx + 46}`;
        s += `<path d="${rungs}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="${rungs}" stroke="${pal.woodL}" stroke-width="6" stroke-linecap="round"/>`;
        spot = { x: cx, y: 360 };
      }
      s += P.sign(cx + 150, 640, P.signW(signTxt, 22), 46, [[signTxt, 22, GOLD]], 6);
      door = { x: cx, y: 815 }; hw = 190;
    }
    return { svg: s, door, spot, hw };
  }
  // провал В ПОЛУ (kind pit): в зоне ходьбы; закрыт препятствием-эллипсом, дверь — на кромке
  function drawPit(P, th, ex, cx, cy) {
    const { pal, O, rnd } = P;
    const st = (th.frame && th.frame.pit) || 'hole';
    const rim = st === 'sand' ? pal.sand : st === 'water' ? pal.wallL : st === 'lava' ? '#3a2a40' : st === 'ice' ? pal.gem : pal.floorL;
    let s = '';
    let slabs = ''; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = cx + Math.cos(a) * 212, y = cy + Math.sin(a) * 64; slabs += `M${f1(x - 22)} ${f1(y - 7)}l40 -4l6 14l-42 5Z`; }
    s += `<path d="${slabs}" fill="${pal.stone}" ${O(3)}/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="196" ry="60" fill="${rim}" ${O(4)}/>`;
    if (st === 'water') {
      const on = P.anim();
      s += `<ellipse cx="${cx}" cy="${cy + 4}" rx="160" ry="46" fill="url(#dgWater)" ${O(3)}/><g transform="translate(${cx} ${cy + 4})"><g>${on ? '<animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="6s" repeatCount="indefinite"/>' : ''}`
        + '<path d="M-110 0 A110 30 0 0 1 60 -20 M70 10 A70 18 0 0 1 -40 18 M-40 -6 A36 10 0 0 1 30 0" fill="none" stroke="#fff" stroke-width="4" opacity=".7" stroke-linecap="round" transform="scale(1 1)"/></g></g>'
        + `<ellipse cx="${cx}" cy="${cy + 6}" rx="30" ry="9" fill="${pal.hole}"/>`;
    } else if (st === 'lava') {
      s += `<circle cx="${cx}" cy="${cy}" r="150" fill="url(#dgLava)" opacity=".6"/><ellipse cx="${cx}" cy="${cy + 4}" rx="150" ry="42" fill="${pal.lava}" ${O(3)}/><ellipse cx="${cx}" cy="${cy + 8}" rx="90" ry="22" fill="${pal.lavaL}"/>`
        + `<path d="M${cx - 60} ${cy + 30} V${cy - 70} M${cx + 60} ${cy + 30} V${cy - 70} M${cx - 60} ${cy - 40} H${cx + 60} M${cx - 60} ${cy - 10} H${cx + 60}" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${cx - 60} ${cy + 30} V${cy - 70} M${cx + 60} ${cy + 30} V${cy - 70} M${cx - 60} ${cy - 40} H${cx + 60} M${cx - 60} ${cy - 10} H${cx + 60}" stroke="${pal.metalD}" stroke-width="6" stroke-linecap="round"/>`;
    } else {
      s += `<ellipse cx="${cx}" cy="${cy + 4}" rx="150" ry="42" fill="${mix(rim, '#000000', 0.25)}" ${O(3)}/><ellipse cx="${cx}" cy="${cy + 8}" rx="104" ry="28" fill="${mix(rim, '#000000', 0.5)}"/><ellipse cx="${cx}" cy="${cy + 11}" rx="60" ry="16" fill="${pal.hole}"/>`;
      if (st === 'sand') {
        const on = P.anim();
        s += `<path d="M${cx + 16} 262 V${cy + 6}" stroke="${pal.sand}" stroke-width="14" stroke-dasharray="14 10" stroke-linecap="round" opacity=".85">${on ? '<animate attributeName="stroke-dashoffset" from="0" to="-48" dur="0.9s" repeatCount="indefinite"/>' : ''}</path>`;
      } else {
        // верхушка лестницы, торчащая из провала
        s += `<path d="M${cx - 30} ${cy + 10} L${cx - 26} ${cy - 70} M${cx + 30} ${cy + 10} L${cx + 26} ${cy - 70}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M${cx - 30} ${cy + 10} L${cx - 26} ${cy - 70} M${cx + 30} ${cy + 10} L${cx + 26} ${cy - 70}" stroke="${pal.wood}" stroke-width="8" stroke-linecap="round"/>`
          + `<path d="M${cx - 28} ${cy - 50} H${cx + 28} M${cx - 28} ${cy - 22} H${cx + 28}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${cx - 28} ${cy - 50} H${cx + 28} M${cx - 28} ${cy - 22} H${cx + 28}" stroke="${pal.woodL}" stroke-width="5" stroke-linecap="round"/>`;
      }
    }
    const signTxt = ex.label && ex.label.length <= 15 ? ex.label.toUpperCase() : (th.signs && th.signs.pit) || 'ВНИЗ';
    // табличка-указатель на стене над провалом
    s += P.sign(cx, 520, P.signW(signTxt, 22), 46, [[signTxt, 22, GOLD]], (rnd() - 0.5) * 8) + P.arrowDown(cx, 556);
    return { svg: s, door: { x: cx + 150, y: cy - 66 }, spot: { x: cx, y: 660 }, obst: { e: [cx, cy + 4, 206, 64] }, hw: 0 };
  }
  // пандус перед проходом (неровный пол): рисунок + точки для walkPoly
  function drawRamp(P, cx, hw) {
    const { pal, O } = P;
    const x0 = cx - hw - 60, x1 = cx + hw + 60;
    return {
      svg: `<path d="M${x0} 800 L${x0 + 50} 764 H${x1 - 50} L${x1} 800 Z" fill="${pal.stoneL}" ${O(4)}/><path d="M${x0 + 30} 782 H${x1 - 30} M${x0 + 18} 792 H${x1 - 18}" stroke="${INK}" stroke-width="2" opacity=".3"/>`,
      poly: [[x0, 800], [x0 + 50, 764], [x1 - 50, 764], [x1, 800]],
    };
  }
  // заглушка логова босса: помост, свечение, пустое место под босса (особые инструкции — позже)
  function drawBossStub(P, th, cx) {
    const { pal, O } = P;
    const on = P.anim();
    let s = `<circle cx="${cx}" cy="560" r="260" fill="url(#dgRed)" opacity=".35">${on ? '<animate attributeName="opacity" values=".25;.45;.25" dur="4s" repeatCount="indefinite"/>' : ''}</circle>`;
    s += `<path d="M${cx - 230} ${B} V420 Q${cx - 230} 300 ${cx} 290 Q${cx + 230} 300 ${cx + 230} 420 V${B} Z" fill="${pal.stoneL}" ${O(5)}/>`;
    s += `<path d="M${cx - 180} ${B} V440 Q${cx - 180} 346 ${cx} 338 Q${cx + 180} 346 ${cx + 180} 440 V${B} Z" fill="url(#dgDeep)" ${O(4)}/>`;
    // закрытая решётка логова
    let bars = ''; for (let x = cx - 150; x <= cx + 150; x += 50) bars += `M${x} ${B} V${f1(440 - Math.cos((x - cx) / 180 * 1.2) * 70)}`;
    s += `<path d="${bars} M${cx - 176} 600 H${cx + 176}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="${bars} M${cx - 176} 600 H${cx + 176}" stroke="${pal.metalD}" stroke-width="7" stroke-linecap="round"/>`;
    s += `<g fill="#ff5a4a"><path d="M${cx - 34} 480 q10 -8 20 0 q-10 8 -20 0 Z M${cx + 14} 480 q10 -8 20 0 q-10 8 -20 0 Z"/>${P.anim() ? '<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.5;.6;.9;1" dur="6s" repeatCount="indefinite"/>' : ''}</g>`;
    s += P.light('brazier', cx - 300, 560) + P.light('brazier', cx + 300, 560);
    s += P.sign(cx, 250 + 30, P.signW((th.signs && th.signs.boss) || 'ЛОГОВО', 30), 58, [[(th.signs && th.signs.boss) || 'ЛОГОВО', 30, GOLD]]);
    return s;
  }

  /* =====================================================================================
     ТАЙНАЯ ДВЕРЬ, ЗНАКИ-АКТИВАТОРЫ, СОКРОВИЩНИЦА
     ===================================================================================== */
  // знак: sun | moon | star | eye | wave | key
  function symbolSvg(P, name, x, y, r, col, w = 4) {
    const { f1 } = P, st = `fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
    switch (name) {
      case 'sun': { let rays = ''; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; rays += `M${f1(x + Math.cos(a) * r * 0.62)} ${f1(y + Math.sin(a) * r * 0.62)} L${f1(x + Math.cos(a) * r * 0.95)} ${f1(y + Math.sin(a) * r * 0.95)}`; } return `<circle cx="${x}" cy="${y}" r="${f1(r * 0.4)}" ${st}/><path d="${rays}" ${st}/>`; }
      case 'moon': return `<path d="M${f1(x + r * 0.3)} ${f1(y - r * 0.8)} A${f1(r * 0.8)} ${f1(r * 0.8)} 0 1 0 ${f1(x + r * 0.3)} ${f1(y + r * 0.8)} A${f1(r * 0.6)} ${f1(r * 0.6)} 0 1 1 ${f1(x + r * 0.3)} ${f1(y - r * 0.8)} Z" ${st}/>`;
      case 'star': { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.38 : r * 0.88; d += (i ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ' ' + f1(y + Math.sin(a) * rr); } return `<path d="${d}Z" ${st}/>`; }
      case 'eye': return `<path d="M${f1(x - r * 0.85)} ${y} Q${x} ${f1(y - r * 0.8)} ${f1(x + r * 0.85)} ${y} Q${x} ${f1(y + r * 0.8)} ${f1(x - r * 0.85)} ${y} Z" ${st}/><circle cx="${x}" cy="${y}" r="${f1(r * 0.22)}" fill="${col}"/>`;
      case 'wave': return `<path d="M${f1(x - r * 0.85)} ${f1(y - r * 0.2)} q${f1(r * 0.28)} ${f1(-r * 0.4)} ${f1(r * 0.56)} 0 t${f1(r * 0.56)} 0 t${f1(r * 0.56)} 0 M${f1(x - r * 0.85)} ${f1(y + r * 0.3)} q${f1(r * 0.28)} ${f1(-r * 0.4)} ${f1(r * 0.56)} 0 t${f1(r * 0.56)} 0 t${f1(r * 0.56)} 0" ${st}/>`;
      case 'key': return `<circle cx="${f1(x - r * 0.45)}" cy="${y}" r="${f1(r * 0.32)}" ${st}/><path d="M${f1(x - r * 0.13)} ${y} H${f1(x + r * 0.85)} M${f1(x + r * 0.55)} ${y} v${f1(r * 0.3)} M${f1(x + r * 0.8)} ${y} v${f1(r * 0.3)}" ${st}/>`;
      default: return `<circle cx="${x}" cy="${y}" r="${f1(r * 0.5)}" ${st}/>`;
    }
  }
  // закрытая тайная дверь: участок кладки с едва заметной щелью и гнёздами знаков над ним
  function drawSecret(P, th, ex, cx, symbols) {
    const { pal, O } = P, top = 520, hw = 104;
    let s = `<path d="M${cx - hw} ${B} V${top + 40} Q${cx - hw} ${top} ${cx - hw + 40} ${top} H${cx + hw - 40} Q${cx + hw} ${top} ${cx + hw} ${top + 40} V${B} Z" fill="${pal.wallL}" opacity=".55"/>`;
    let seams = ''; for (let y = top + 46; y < B; y += 46) seams += `M${cx - hw} ${y}H${cx + hw}`; for (let y = top; y < B; y += 92) seams += `M${cx} ${y}v46M${cx - hw / 2} ${y + 46}v46M${cx + hw / 2} ${y + 46}v46`;
    s += `<path d="${seams}" stroke="${INK}" stroke-width="2" opacity=".3"/>`;
    s += `<path d="M${cx - hw} ${B} V${top + 40} Q${cx - hw} ${top} ${cx - hw + 40} ${top} H${cx + hw - 40} Q${cx + hw} ${top} ${cx + hw} ${top + 40} V${B}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="10 7" opacity=".55"/>`;
    // гнёзда знаков: полукругом над дверью
    const n = symbols.length, sockets = [];
    symbols.forEach((sym, i) => {
      const a = Math.PI * (0.15 + 0.7 * (n === 1 ? 0.5 : i / (n - 1))), x = cx - Math.cos(a) * 150, y = top - 40 - Math.sin(a) * 70;
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="26" fill="${pal.wallD}" ${O(3.5)}/>` + symbolSvg(P, sym, f1(x), f1(y), 18, INK, 3).replace(/stroke="#2b1d18"/g, `stroke="${INK}" opacity=".55"`);
      sockets.push({ symbol: sym, x: Math.round(x), y: Math.round(y),
        litSvg: `<circle cx="${f1(x)}" cy="${f1(y)}" r="46" fill="${pal.glow}" opacity=".35"/><circle cx="${f1(x)}" cy="${f1(y)}" r="26" fill="${pal.accent2}" ${O(3.5)}/>` + symbolSvg(P, sym, f1(x), f1(y), 18, INK, 3.5) });
    });
    // открытая дверь (слой, который виджет кладёт поверх, когда загадка решена)
    const openSvg = `<circle cx="${cx}" cy="${top + 120}" r="190" fill="${pal.glow}" opacity=".35"/><path d="M${cx - hw} ${B} V${top + 40} Q${cx - hw} ${top} ${cx - hw + 40} ${top} H${cx + hw - 40} Q${cx + hw} ${top} ${cx + hw} ${top + 40} V${B} Z" fill="url(#dgDeep)" ${O(5)}/>`
      + `<path d="M${cx - 70} ${B} Q${cx} ${B - 40} ${cx + 70} ${B} Z" fill="${GOLD}" ${O(3)}/><path d="M${cx - 30} ${B - 30} l6 -10 l6 10 Z M${cx + 14} ${B - 26} l6 -10 l6 10 Z" fill="#fff" opacity=".8"/>`
      + `<path d="M${cx + hw} ${B} L${cx + hw + 40} ${B - 12} V${top + 50} L${cx + hw} ${top + 40} Z" fill="${pal.wallL}" ${O(4)}/>`;
    return { svg: s, door: { x: cx, y: 812 }, spot: { x: cx, y: 660 }, hw: hw + 50, sockets, openSvg };
  }
  // знак-активатор на стене: камень с выбитым знаком (едва заметный) + слой «найден»
  function drawActivator(P, a, x, y) {
    const { pal, O } = P;
    const stone = `<path d="M${x - 34} ${y + 26} L${x - 38} ${y - 20} L${x - 10} ${y - 34} L${x + 30} ${y - 28} L${x + 38} ${y + 18} L${x + 8} ${y + 32} Z" fill="${pal.wallL}" ${O(3.5)}/>`;
    return {
      svg: stone + symbolSvg(P, a.symbol, x, y, 20, INK, 3).replace(/stroke="#2b1d18"/g, `stroke="${INK}" opacity=".5"`),
      foundSvg: `<circle cx="${x}" cy="${y}" r="64" fill="${pal.glow}" opacity=".45"/>` + stone.replace(pal.wallL, pal.accent2) + symbolSvg(P, a.symbol, x, y, 20, INK, 3.5),
    };
  }
  // цвета колокольчиков и камней
  const GEMC = { red: '#e8455c', blue: '#4ab0ff', green: '#6fdc6f', gold: '#ffcf4a', violet: '#b06bff' };
  // общий вид двери в стене (для видов с активаторами): кладка с едва заметной щелью + слой «открыто»
  function doorBody(P, cx, top, hw) {
    const { pal, O } = P;
    let s = `<path d="M${cx - hw} ${B} V${top + 40} Q${cx - hw} ${top} ${cx - hw + 40} ${top} H${cx + hw - 40} Q${cx + hw} ${top} ${cx + hw} ${top + 40} V${B} Z" fill="${pal.wallL}" opacity=".55"/>`;
    let seams = ''; for (let y = top + 46; y < B; y += 46) seams += `M${cx - hw} ${y}H${cx + hw}`; for (let y = top; y < B; y += 92) seams += `M${cx} ${y}v46M${cx - hw / 2} ${y + 46}v46M${cx + hw / 2} ${y + 46}v46`;
    s += `<path d="${seams}" stroke="${INK}" stroke-width="2" opacity=".3"/>`;
    s += `<path d="M${cx - hw} ${B} V${top + 40} Q${cx - hw} ${top} ${cx - hw + 40} ${top} H${cx + hw - 40} Q${cx + hw} ${top} ${cx + hw} ${top + 40} V${B}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="10 7" opacity=".45"/>`;
    return s;
  }
  function doorOpen(P, cx, top, hw) {
    const { pal, O } = P;
    return `<circle cx="${cx}" cy="${top + 120}" r="190" fill="${pal.glow}" opacity=".35"/><path d="M${cx - hw} ${B} V${top + 40} Q${cx - hw} ${top} ${cx - hw + 40} ${top} H${cx + hw - 40} Q${cx + hw} ${top} ${cx + hw} ${top + 40} V${B} Z" fill="url(#dgDeep)" ${O(5)}/>`
      + `<path d="M${cx - 70} ${B} Q${cx} ${B - 40} ${cx + 70} ${B} Z" fill="${GOLD}" ${O(3)}/><path d="M${cx - 30} ${B - 30} l6 -10 l6 10 Z M${cx + 14} ${B - 26} l6 -10 l6 10 Z" fill="#fff" opacity=".8"/>`
      + `<path d="M${cx + hw} ${B} L${cx + hw + 40} ${B - 12} V${top + 50} L${cx + hw} ${top + 40} Z" fill="${pal.wallL}" ${O(4)}/>`;
  }
  // гнёзда над дверью — по дуге
  const arcPos = (cx, top, n, i) => { const a = Math.PI * (0.15 + 0.7 * (n === 1 ? 0.5 : i / (n - 1))); return [cx - Math.cos(a) * 150, top - 40 - Math.sin(a) * 70]; };
  const bellPath = (x, y, s) => `M${f1(x - 16 * s)} ${f1(y + 14 * s)} Q${f1(x - 14 * s)} ${f1(y - 16 * s)} ${x} ${f1(y - 18 * s)} Q${f1(x + 14 * s)} ${f1(y - 16 * s)} ${f1(x + 16 * s)} ${f1(y + 14 * s)} Z`;
  const gemPath = (x, y, r) => `M${f1(x)} ${f1(y - r)} L${f1(x + r * 0.9)} ${f1(y - r * 0.2)} L${f1(x + r * 0.5)} ${f1(y + r)} L${f1(x - r * 0.5)} ${f1(y + r)} L${f1(x - r * 0.9)} ${f1(y - r * 0.2)} Z`;

  // ТАЙНАЯ ДВЕРЬ по виду. Возвращает { svg, door, spot, hw, sockets, openSvg, mode, hint? }
  function drawSecretByType(P, th, sec, cx) {
    const { pal, O } = P, top = 520, hw = 104, type = sec.type || 'glyphs';
    const res = { door: { x: cx, y: 812 }, spot: { x: cx, y: 660 }, hw: hw + 50, sockets: [], mode: 'wall' };
    if (type === 'glyphs') {
      const r = drawSecret(P, th, null, cx, sec.symbols || ['sun', 'moon', 'star']);
      return Object.assign(res, { svg: r.svg, sockets: r.sockets, openSvg: r.openSvg });
    }
    if (type === 'torches') {
      // над дверью — ряд потухших чаш; найденный рычаг зажигает одну
      let s = doorBody(P, cx, top, hw); const n = sec.count || 3;
      for (let i = 0; i < n; i++) {
        const [x, y] = arcPos(cx, top, n, i);
        s += `<path d="M${f1(x - 18)} ${f1(y)} H${f1(x + 18)} Q${f1(x + 14)} ${f1(y + 14)} ${f1(x)} ${f1(y + 14)} Q${f1(x - 14)} ${f1(y + 14)} ${f1(x - 18)} ${f1(y)} Z" fill="${pal.stoneD}" ${O(3)}/><path d="M${f1(x)} ${f1(y + 14)} v14" stroke="${pal.iron}" stroke-width="4"/>`;
        res.sockets.push({ index: i + 1, x: Math.round(x), y: Math.round(y),
          litSvg: `<circle cx="${f1(x)}" cy="${f1(y - 14)}" r="40" fill="url(#ctFire)" opacity=".85"/><path d="M${f1(x)} ${f1(y - 2)} C${f1(x - 10)} ${f1(y - 6)} ${f1(x - 10)} ${f1(y - 22)} ${f1(x)} ${f1(y - 34)} C${f1(x + 10)} ${f1(y - 22)} ${f1(x + 10)} ${f1(y - 6)} ${f1(x)} ${f1(y - 2)} Z" fill="#ff8a2a" stroke="#ffd76a" stroke-width="2.4"/>` });
      }
      return Object.assign(res, { svg: s, openSvg: doorOpen(P, cx, top, hw) });
    }
    if (type === 'bells') {
      // каменная плита над дверью: колокольчики-рельефы в нужном порядке (цвет — тусклой краской), под каждым — номер
      let s = doorBody(P, cx, top, hw); const order = sec.order || ['red', 'blue', 'gold'], n = order.length;
      const w = n * 64 + 24, y0 = top - 120;
      s += `<rect x="${cx - w / 2}" y="${y0 - 40}" width="${w}" height="92" rx="8" fill="${pal.stoneD}" ${O(3.5)}/>`;
      order.forEach((c, i) => {
        const x = cx - w / 2 + 44 + i * 64;
        s += `<path d="${bellPath(x, y0, 1)}" fill="${mix(GEMC[c], pal.stoneD, 0.55)}" ${O(2.6)}/><circle cx="${x}" cy="${y0 + 18}" r="4" fill="${INK}"/>`
          + `<text x="${x}" y="${y0 + 44}" text-anchor="middle" font-family="Russo One" font-size="14" fill="${INK}" opacity=".6">${i + 1}</text>`;
        res.sockets.push({ index: i + 1, color: c, x: Math.round(x), y: y0,
          litSvg: `<circle cx="${x}" cy="${y0}" r="34" fill="${GEMC[c]}" opacity=".35"/><path d="${bellPath(x, y0, 1)}" fill="${GEMC[c]}" ${O(2.6)}/><path d="M${x - 24} ${y0 - 14} q-6 10 0 20 M${x + 24} ${y0 - 14} q6 10 0 20" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` });
      });
      return Object.assign(res, { svg: s, openSvg: doorOpen(P, cx, top, hw) });
    }
    if (type === 'gems') {
      // «слепой глаз» над дверью: каменный рельеф с пустыми гнёздами по кругу
      let s = doorBody(P, cx, top, hw); const cols = sec.colors || ['red', 'blue', 'green'], n = cols.length, ey = top - 100;
      s += `<path d="M${cx - 130} ${ey} Q${cx} ${ey - 92} ${cx + 130} ${ey} Q${cx} ${ey + 92} ${cx - 130} ${ey} Z" fill="${pal.stoneL}" ${O(4)}/><circle cx="${cx}" cy="${ey}" r="30" fill="${pal.stoneD}" ${O(3.5)}/>`;
      cols.forEach((c, i) => {
        const a = Math.PI * 2 * i / n - Math.PI / 2, x = cx + Math.cos(a) * 66, y = ey + Math.sin(a) * 30;
        s += `<path d="${gemPath(x, y, 11)}" fill="${pal.wallD}" ${O(2.6)}/>`;
        res.sockets.push({ index: i + 1, color: c, x: Math.round(x), y: Math.round(y), litSvg: `<circle cx="${f1(x)}" cy="${f1(y)}" r="24" fill="${GEMC[c]}" opacity=".45"/><path d="${gemPath(x, y, 11)}" fill="${GEMC[c]}" ${O(2.6)}/>` });
      });
      const open = doorOpen(P, cx, top, hw) + `<circle cx="${cx}" cy="${ey}" r="56" fill="${pal.glow}" opacity=".45"/><circle cx="${cx}" cy="${ey}" r="30" fill="${pal.gem}" ${O(3.5)}/><circle cx="${cx}" cy="${ey}" r="11" fill="${INK}"/>`;
      return Object.assign(res, { svg: s, openSvg: open });
    }
    if (type === 'illusion') {
      // ИЛЛЮЗОРНАЯ СТЕНА: кладка ничем не отличается. Подсказка — паутинка у пола колышется от сквозняка (1 SMIL)
      const on = P.anim(), wx = cx + hw - 6, wy = B - 34;
      const svg = `<g transform="translate(${wx} ${wy})"><g>${on ? '<animateTransform attributeName="transform" type="skewX" values="0;9;0;-5;0" dur="2.6s" repeatCount="indefinite"/>' : ''}`
        + `<path d="M0 0 L-34 -30 M0 0 L-40 -6 M0 0 L-16 -38 M-10 -9 Q-16 -4 -22 -2 M-18 -16 Q-26 -10 -32 -6 M-8 -22 Q-16 -22 -26 -18" fill="none" stroke="${CREAM}" stroke-width="1.8" opacity=".55"/></g></g>`;
      const open = `<circle cx="${cx}" cy="${top + 140}" r="200" fill="${pal.glow}" opacity=".25"/><path d="${pathOf([[cx - hw, B], [cx - hw - 10, top + 120], [cx - hw * 0.6, top + 30], [cx, top + 10], [cx + hw * 0.6, top + 40], [cx + hw + 8, top + 130], [cx + hw, B]])}" fill="url(#dgDeep)" ${O(5)}/>`
        + `<path d="${P.blob(cx - hw - 30, B - 10, 30, 14)} ${P.blob(cx + hw + 34, B - 8, 24, 12)} ${P.blob(cx - hw - 10, B - 30, 18, 10)}" fill="${pal.wallL}" ${O(3)}/>`;
      return Object.assign(res, { svg, openSvg: open, hint: { x: wx - 20, y: wy - 18 } });
    }
    if (type === 'hatch') {
      // ЛЮК В ПОЛУ: те же цвета, что пол; выдаёт только едва заметное кольцо (рисуется в полу, в зоне ходьбы)
      const y = 975, w = 150, h = 46;
      const svg = `<path d="M${cx - w / 2} ${y - h / 2} H${cx + w / 2} L${cx + w / 2 + 10} ${y + h / 2} H${cx - w / 2 - 10} Z" fill="${pal.floor}" stroke="${INK}" stroke-width="1.6" opacity=".55"/>`
        + `<path d="M${cx - w / 4} ${y - h / 2} v${h} M${cx + w / 4} ${y - h / 2} v${h}" stroke="${INK}" stroke-width="1.4" opacity=".22"/>`
        + `<ellipse cx="${cx + 30}" cy="${y + 4}" rx="9" ry="5" fill="none" stroke="${pal.metalD}" stroke-width="2.4" opacity=".6"/>`;
      const open = `<ellipse cx="${cx}" cy="${y}" rx="${w / 2 + 30}" ry="${h / 2 + 14}" fill="${pal.glow}" opacity=".3"/><path d="M${cx - w / 2} ${y - h / 2} H${cx + w / 2} L${cx + w / 2 + 10} ${y + h / 2} H${cx - w / 2 - 10} Z" fill="${pal.hole}" ${O(4)}/>`
        + `<path d="M${cx - w / 2} ${y - h / 2} L${cx - w / 2 + 8} ${y - h / 2 - 70} H${cx + w / 2 - 8} L${cx + w / 2} ${y - h / 2} Z" fill="${pal.woodL}" ${O(4)}/><ellipse cx="${cx + 30}" cy="${y - h / 2 - 40}" rx="10" ry="6" fill="none" stroke="${pal.metalD}" stroke-width="4"/>`
        + `<path d="M${cx - 26} ${y + 10} L${cx - 22} ${y - 12} M${cx + 26} ${y + 10} L${cx + 22} ${y - 12} M${cx - 24} ${y - 2} H${cx + 24}" stroke="${pal.wood}" stroke-width="6" stroke-linecap="round"/>`;
      return Object.assign(res, { svg, openSvg: open, mode: 'floor', door: { x: cx + w / 2 + 40, y: y - 40 }, spot: { x: cx, y: y - 120 }, hw: 0, openObstacle: { e: [cx, y, w / 2 + 14, h / 2 + 8] } });
    }
    return Object.assign(res, { svg: '', openSvg: '' });
  }
  // АКТИВАТОР по виду: { svg, foundSvg, y (нужная высота) }
  function drawActivatorByType(P, th, a, x, y) {
    const { pal, O } = P, type = a.type || 'glyphs';
    if (type === 'glyphs') return drawActivator(P, a, x, y);
    if (type === 'torches') {
      // факел-рычаг: как обычный факел; выдаёт только маленькая рукоять у кронштейна
      const t = P.light('torch', x, y) + `<path d="M${x + 10} ${y - 20} l14 -6" stroke="${pal.iron}" stroke-width="3.5" stroke-linecap="round"/><circle cx="${x + 25}" cy="${y - 27}" r="3.4" fill="${pal.metalD}" ${O(1.6)}/>`;
      const found = `<rect x="${x - 34}" y="${y - 84}" width="68" height="96" fill="${pal.wall}"/>` + `<circle cx="${x}" cy="${y - 40}" r="70" fill="url(#ctFire)" opacity=".9"/>`
        + `<g transform="rotate(38 ${x} ${y})"><path d="M${x - 6} ${y} l4 -26 h4 l4 26 z" fill="${pal.woodD}" ${O(3)}/><path d="M${x} ${y - 22} C${x - 13} ${y - 26} ${x - 15} ${y - 46} ${x} ${y - 68} C${x + 15} ${y - 46} ${x + 13} ${y - 26} ${x} ${y - 22} Z" fill="#ff8a2a" stroke="#ffd76a" stroke-width="3"/></g>`
        + `<path d="M${x - 40} ${y + 10} l-10 6 M${x - 36} ${y - 6} l-12 -2" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`;
      return { svg: t, foundSvg: found };
    }
    if (type === 'bells') {
      // колокольчик под сводом (цвет приглушён — среди корней и сосулек его легко не заметить)
      const c = GEMC[a.color] || GOLD, by = y;
      const b = `<path d="M${x} 250 V${by - 18}" stroke="${pal.iron}" stroke-width="2.4"/><path d="${bellPath(x, by, 0.8)}" fill="${mix(c, pal.wallD, 0.45)}" ${O(2.4)}/><circle cx="${x}" cy="${by + 13}" r="3" fill="${INK}"/>`;
      const found = `<circle cx="${x}" cy="${by}" r="44" fill="${c}" opacity=".35"/><g transform="rotate(-18 ${x} 250)"><path d="${bellPath(x, by, 0.8)}" fill="${c}" ${O(2.6)}/></g>`
        + `<path d="M${x + 22} ${by - 16} q8 10 0 22 M${x + 32} ${by - 22} q12 16 0 34" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
      return { svg: b, foundSvg: found };
    }
    if (type === 'gems') {
      // цветной камешек у основания стены, наполовину прикрыт булыжником
      const c = GEMC[a.color] || GOLD;
      const g = `<path d="${gemPath(x, y, 9)}" fill="${mix(c, pal.wallD, 0.35)}" ${O(2.2)}/><path d="${P.blob(x + 12, y + 6, 18, 10)}" fill="${pal.wallL}" ${O(3)}/>`;
      const found = `<circle cx="${x}" cy="${y}" r="36" fill="${c}" opacity=".45"/><path d="${gemPath(x, y - 8, 14)}" fill="${c}" ${O(2.6)}/><path d="M${x - 4} ${y - 18} l-2 8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`;
      return { svg: g, foundSvg: found };
    }
    return { svg: '', foundSvg: '' };
  }
  // зоны «простукивания» (illusion — участки стены, hatch — участки пола): верная получает номер answer.
  // Число зон всегда равно search.count (его знает сервер), поэтому при нехватке места расстояние между зонами уменьшается.
  function searchZones(P, sec, doorX, W, mode, avoid, block = []) {   // 23.10: block — [x0, x1] предметов и опор у стены: пятно поиска на них не кладём
    const { rnd } = P, cnt = (sec.search && sec.search.count) || 5, ans = Math.min(cnt, (sec.search && sec.search.answer) || 1);
    const cand = [];
    if (mode === 'wall') { for (let x = 130; x < W - 100; x += 70) cand.push([x, 640]); }
    else { for (let x = 150; x < W - 100; x += 90) [910, 1005].forEach((y) => cand.push([x, y])); }
    const okX = (x) => (x % SW) < (mode === 'wall' ? 1420 : 1370) && Math.abs(x - doorX) > (mode === 'wall' ? 190 : 140) && !avoid.some((a) => Math.abs(a - x) < 90) && !(mode === 'wall' && block.some(([a, b]) => x + 85 > a && x - 85 < b));
    let pool = cand.filter(([x]) => okX(x));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    let others = [];
    for (const gap of mode === 'wall' ? [220, 180, 140, 100] : [240, 200, 160, 120]) {
      others = [];
      pool.forEach((p) => { if (others.length < cnt - 1 && others.every((o) => Math.hypot(o[0] - p[0], (o[1] - p[1]) * 2) >= gap)) others.push(p); });
      if (others.length >= cnt - 1) break;
    }
    while (others.length < cnt - 1) others.push([Math.round(200 + rnd() * (W - 400)), mode === 'wall' ? 640 : 1005]);   // крайний случай
    const doorPt = [doorX, mode === 'wall' ? 640 : 975];
    others.splice(ans - 1, 0, doorPt);
    return others.map(([x, y], i) => (mode === 'wall'
      ? { n: i + 1, x: Math.round(x), y, w: 150, h: 240, correct: i === ans - 1 }
      : { n: i + 1, x: Math.round(x), y, w: 190, h: 70, correct: i === ans - 1 }));
  }

  // сокровищница: груды золота, сундуки, реликвия на постаменте
  function drawTreasury(P, th, cx) {
    const { pal, O } = P, on = P.anim();
    let s = `<circle cx="${cx}" cy="560" r="300" fill="url(#ctGlow)" opacity=".55">${on ? '<animate attributeName="opacity" values=".4;.65;.4" dur="4s" repeatCount="indefinite"/>' : ''}</circle>`;
    s += `<path d="M${cx - 300} ${B + 2} Q${cx - 200} ${B - 120} ${cx - 60} ${B - 90} Q${cx} ${B - 150} ${cx + 80} ${B - 96} Q${cx + 220} ${B - 130} ${cx + 300} ${B + 2} Z" fill="${GOLD}" ${O(4)}/>`;
    let coins = ''; for (let i = 0; i < 26; i++) { const x = cx - 260 + P.rnd() * 520, y = B - 10 - P.rnd() * 90 * (1 - Math.abs(x - cx) / 320); coins += P.blob(x, y, 9, 4); }
    s += `<path d="${coins}" fill="#ffe27a" stroke="${INK}" stroke-width="2" stroke-opacity=".5"/>`;
    s += `<rect x="${cx - 46}" y="${B - 230}" width="92" height="120" fill="${pal.stoneL}" ${O(4)}/><rect x="${cx - 60}" y="${B - 244}" width="120" height="20" fill="${pal.stoneD}" ${O(4)}/>`;
    s += `<circle cx="${cx}" cy="${B - 300}" r="70" fill="url(#dgGem)" opacity=".9"/><path d="M${cx - 26} ${B - 250} L${cx - 34} ${B - 300} L${cx} ${B - 350} L${cx + 34} ${B - 300} L${cx + 26} ${B - 250} Z" fill="${pal.gem}" ${O(4)}/><path d="M${cx - 10} ${B - 330} l-8 40" stroke="#fff" stroke-width="4" opacity=".75" stroke-linecap="round"/>`;
    s += P.DEC.chest(cx - 230, B + 2) + P.DEC.chest(cx + 240, B + 2);
    s += P.sign(cx, 440, P.signW('СОКРОВИЩНИЦА', 28), 56, [['СОКРОВИЩНИЦА', 28, GOLD]]);
    return s;
  }

  /* =====================================================================================
     СБОРКА КОМНАТЫ
     ===================================================================================== */
  function build(room, env) {
    env = env || {};
    const esc = env.esc || ((t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
    room = Object.assign({ region: 'ridge', type: 'start', seed: 1, floor: 1, floors: 3, depth: 0 }, room || {});
    const th = (room.variant === 2 && D.dungeonThemes[room.region + '_b']) || D.dungeonThemes[room.region] || D.dungeonThemes.ridge || Object.values(D.dungeonThemes)[0] || {};
    const depth = Math.max(0, Math.min(1, room.depth || 0));
    // палитра: тема + смешивание к «глубинной» по глубине
    const pal = Object.assign({}, BASE_PAL, th.pal || {});
    Object.keys(th.deep || {}).forEach((k) => { pal[k] = mix(pal[k], th.deep[k], depth * 0.85); });
    let seedState = (room.seed % 2147483646) + 1;
    const rnd = () => (seedState = (seedState * 16807) % 2147483647) / 2147483647;
    let exits = (room.exits && room.exits.length ? room.exits : [{ key: 'back', kind: room.type === 'start' ? 'out' : 'back' }]).slice(0, 5);
    const legacy = exits.some((e) => e.key === 'leave' || e.key === 'forge');
    // ширина: 1–3 экрана (4+ прохода — минимум 2 экрана; финал — 2–3; тупик — 1)
    let S = room.screens;
    if (!S) {
      const n = exits.length;
      if (room.type === 'final') S = 2 + (rnd() < 0.4 ? 1 : 0);
      else if (room.type === 'deadend' || room.type === 'treasury') S = 1;
      else if (n >= 4) S = 2 + (rnd() < 0.35 ? 1 : 0);
      else if (n === 3) S = 1 + (rnd() < 0.5 ? 1 : 0);
      else S = 1 + (rnd() < 0.3 ? 1 : 0);
    }
    S = Math.max(1, Math.min(3, S));
    if (exits.some((e) => e.kind === 'pit') && S === 1) exits = exits.map((e) => (e.kind === 'pit' ? Object.assign({}, e, { kind: 'shaft' }) : e));   // провал в полу — только на широких сценах
    const W = SW * S;
    const P = makeKit(pal, rnd, esc);
    P.signStyle = th.sign || 'wood';
    const views = {}; for (let i = 0; i < S; i++) views[VIEW_NAMES[i]] = i * SW;

    /* --- раскладка: слоты на стене (центры) по экранам --- */
    const SLOT = [250, 640, 1020, 1350];
    const slots = []; for (let i = 0; i < S; i++) SLOT.forEach((x, j) => slots.push({ x: i * SW + x, screen: i, j }));
    const used = new Set();
    const placed = [];
    const take = (pred) => { const c = slots.filter((sl) => !used.has(sl) && pred(sl)); if (!c.length) return null; const sl = c[0]; used.add(sl); return sl; };
    // 1) назад/наружу — всегда слева на первом экране
    const backEx = exits[0];
    placed.push({ ex: backEx, x: take((sl) => sl.screen === 0 && sl.j === 0).x, mode: 'wall' });
    // центральная часть особых комнат
    const special = [];
    if (room.type === 'final') { const sc = S - 1; special.push({ kind: 'boss', x: sc * SW + 900 }); slots.forEach((sl) => { if (sl.screen === sc && sl.j > 0) used.add(sl); }); }
    if (room.type === 'deadend') { const sl = take((sl) => sl.screen === S - 1 && sl.j === 2); if (sl) special.push({ kind: 'collapse', x: sl.x }); }
    if (room.type === 'treasury') { [1, 2, 3].forEach((j) => { const sl = slots.find((q) => q.screen === S - 1 && q.j === j); if (sl) used.add(sl); }); special.push({ kind: 'treasury', x: (S - 1) * SW + 1000 }); }
    // МЕСТА ПОД СОБЫТИЯ (монстры, торговец, загадка…) — резервируем слоты стены заранее, проходы раскладываем вокруг
    const rest = exits.slice(1);
    const EVW = 340, events = [];
    {
      const want = /deadend|final|treasury/.test(room.type) ? 1 : Math.min(3, S);
      const nWall = rest.filter((e) => e.kind !== 'pit' && !(e.kind === 'secret' && room.secret && room.secret.type === 'hatch')).length;
      const pitSc = rest.filter((e) => e.kind === 'pit').map((e, i) => Math.min(S - 1, 1 + i));   // экраны с провалом в полу — там стена над провалом занята табличкой
      for (let sc = S - 1; sc >= 0 && events.length < want; sc--) {
        if (pitSc.includes(sc)) continue;
        const freeNow = slots.filter((sl) => !used.has(sl)).length;
        if (freeNow - 1 < nWall) break;
        const pref = [2, 1].filter((j) => !(room.type === 'start' && S > 1 && sc === 0 && (j === 1 || j === 2)));   // центр первого экрана стартовой — место построения отряда
        const sl = pref.map((j) => slots.find((q) => q.screen === sc && q.j === j && !used.has(q))).find(Boolean);
        if (sl) { used.add(sl); events.push({ id: 'ev' + (events.length + 1), mode: 'wall', x: sl.x, y: 830, w: EVW, h: 330, view: VIEW_NAMES[sc] }); }
      }
    }
    // 2) остальные проходы: равномерно по свободным слотам (провалы — в пол, не на первом экране)
    const isHatch = (e) => e.kind === 'secret' && room.secret && room.secret.type === 'hatch';
    const pits = rest.filter((e) => e.kind === 'pit'), wallEx = rest.filter((e) => e.kind !== 'pit' && !isHatch(e));
    rest.filter(isHatch).forEach((e) => { const sc = S - 1; placed.push({ ex: e, x: sc * SW + (S > 1 ? 1180 : 1150), mode: 'hatch' }); });
    const free = slots.filter((sl) => !used.has(sl));
    const pitScreens = [];
    pits.forEach((e, i) => { const sc = Math.min(S - 1, 1 + i); pitScreens.push(sc); placed.push({ ex: e, x: sc * SW + 760, mode: 'pit' }); });
    const freeW = free.filter((sl) => !(pitScreens.includes(sl.screen) && (sl.j === 1 || sl.j === 2)));
    if (wallEx.length) {
      // крупный проход «вниз» в комнате спуска
      const step = freeW.length / wallEx.length;
      wallEx.forEach((e, i) => { const sl = freeW[Math.min(freeW.length - 1, Math.floor(i * step + step / 2))]; if (sl) { used.add(sl); placed.push({ ex: e, x: sl.x, mode: 'wall' }); } });
    }
    /* --- рисование --- */
    let s = backdrop(P, th, W);
    if (th.rails) s += railsSvg(P, 0, W, 750);
    const occ = [];   // занятые полосы стены [x0, x1]
    let doors = {}, spots = [], obst = [], poly = null, ramps = [], secretOut = null, activators = [], floorSecretSvg = '';
    let exitSvg = '';
    placed.forEach((p) => {
      if (p.mode === 'pit') {
        const r = drawPit(P, th, p.ex, p.x, 960);
        exitSvg += exitG(p.ex.key, r.svg); doors[p.ex.key] = Object.assign({ spread: 60 }, r.door); spots.push({ key: p.ex.key, n: 0, x: r.spot.x, y: r.spot.y }); obst.push(r.obst);
        occ.push([p.x - 120, p.x + 120]);
        return;
      }
      if (p.ex.kind === 'secret') {
        const rs = room.secret || { type: 'glyphs', symbols: ['sun', 'moon', 'star'] };
        const sec = drawSecretByType(P, th, rs, p.x);
        if (sec.mode === 'floor') floorSecretSvg += exitG(p.ex.key, sec.svg); else exitSvg += exitG(p.ex.key, sec.svg);
        doors[p.ex.key] = Object.assign({ spread: 60 }, sec.door);
        secretOut = { key: p.ex.key, type: rs.type || 'glyphs', mode: sec.mode, x: p.x, door: sec.door, spot: sec.spot, riddle: rs.riddle || '',
          symbols: rs.symbols, order: rs.order, colors: rs.colors, count: rs.count, sockets: sec.sockets, openSvg: sec.openSvg, hint: sec.hint, openObstacle: sec.openObstacle };
        if (sec.mode === 'wall') occ.push([p.x - sec.hw, p.x + sec.hw]);
        return;
      }
      const ramp = p.ex.kind !== 'out' && p.ex.kind !== 'shaft' && rnd() < (th.rampChance == null ? 0.3 : th.rampChance) && p.x % SW > 400;
      const r = drawExit(P, th, p.ex, p.x, { ramp, big: room.type === 'descent' && /down|shaft/.test(p.ex.kind) });
      if (ramp) { const rp = drawRamp(P, p.x, Math.min(130, r.hw - 30)); ramps.push(rp); }
      exitSvg += exitG(p.ex.key, r.svg); doors[p.ex.key] = Object.assign({ spread: 70 }, r.door); spots.push({ key: p.ex.key, n: 0, x: r.spot.x, y: r.spot.y });
      occ.push([p.x - r.hw, p.x + r.hw]);
    });
    special.forEach((sp) => occ.push([sp.x - (sp.kind === 'boss' ? 380 : sp.kind === 'treasury' ? 330 : 170), sp.x + (sp.kind === 'boss' ? 380 : sp.kind === 'treasury' ? 330 : 170)]));
    // житель-проводник у входа (только стартовая)
    let npc = null;
    if (room.type === 'start' && th.npc) { npc = { x: placed[0].x + 200, base: 804 }; occ.push([npc.x - 60, npc.x + 60]); obst.push({ r: [npc.x - 50, npc.x + 50, 826] }); }
    // запасное место под событие — на полу посреди зоны ходьбы (если вся стена занята проходами)
    if (!events.length) {
      for (let sc = S - 1; sc >= 0 && !events.length; sc--) {
        const off = sc * SW;
        const fx = [960, 700, 1200, 300].map((x) => off + x).find((x) => !obst.some((o) => (o.e && Math.abs(o.e[0] - x) < o.e[2] + EVW / 2) || (o.r && x + EVW / 2 > o.r[0] && x - EVW / 2 < o.r[1])));
        if (fx != null) events.push({ id: 'ev1', mode: 'floor', x: fx, y: 960, w: EVW, h: 160, view: VIEW_NAMES[sc] });
      }
    }
    events.forEach((e) => { if (e.mode === 'wall') occ.push([e.x - EVW / 2, e.x + EVW / 2]); });
    // знаки-активаторы тайной двери: камень со знаком на стене, в свободном промежутке
    let actSvg = '';
    (room.activators || []).forEach((a) => {
      const g = gapsOf(occ, W).filter((q) => q[1] - q[0] >= 130).sort((q1, q2) => (q2[1] - q2[0]) - (q1[1] - q1[0]));
      const t = a.type || 'glyphs';
      let x, y = t === 'torches' ? 520 : t === 'bells' ? 300 + Math.round(rnd() * 40) : t === 'gems' ? 782 : 560 + Math.round(rnd() * 60);
      if (g.length) { const q = g[Math.floor(rnd() * Math.min(3, g.length))]; x = Math.round(q[0] + 60 + rnd() * (q[1] - q[0] - 120)); occ.push([x - 55, x + 55]); }
      else { x = Math.round(200 + rnd() * (W - 400)); if (t === 'glyphs') y = 330; }   // запасное место — высоко на стене
      if (t === 'glyphs' && x % SW > 1440 && y > 500) y = 470;                          // над углом вебки — повыше
      const d = drawActivatorByType(P, th, a, x, y);
      actSvg += d.svg; activators.push({ id: a.id, type: t, symbol: a.symbol, color: a.color, x, y, r: 44, foundSvg: d.foundSvg });
    });
    // декор: свет и предметы в промежутках стены
    let gaps = gapsOf(occ, W);
    let decSvg = '', lightPts = []; const decBlock = [];
    if (th.pillar) {
      const pg = [];
      gaps.forEach(([g0, g1]) => {
        if (g1 - g0 < 260) { pg.push([g0, g1]); return; }
        const a = g0 > 10 ? g0 + 46 : null, b = g1 < W - 10 ? g1 - 46 : null;
        if (a != null) decSvg += P.pillar(th.pillar, a);
        if (b != null && (a == null || b - a > 200)) decSvg += P.pillar(th.pillar, b);
        [a, b].forEach((q) => { if (q != null) decBlock.push([q - 40, q + 40]); });
        // широкий промежуток — ещё опора посередине
        if (g1 - g0 > 900) { decSvg += P.pillar(th.pillar, (g0 + g1) / 2); decBlock.push([(g0 + g1) / 2 - 40, (g0 + g1) / 2 + 40]); }
        pg.push([a != null ? a + 50 : g0, b != null ? b - 50 : g1]);
      });
      gaps = pg.filter((g) => g[1] - g[0] > 90);
    }
    const decor = (th.decor || ['rocks', 'crates']).filter((d) => !Array.isArray(d) || depth >= (d[2] || 0) - 0.001 && depth <= (d[3] == null ? 1 : d[3]) + 0.001);
    gaps.forEach(([g0, g1]) => {
      const w = g1 - g0;
      // свет на стене — примерно каждые 420 px
      for (let x = g0 + 70; x < g1 - 50; x += 360 + rnd() * 140) {
        const lk = Array.isArray(th.light) ? th.light[Math.floor(rnd() * th.light.length)] : th.light || 'torch';
        const dim = depth > 0.6 && rnd() < (th.dimDeep || 0) ? 'crystal' : lk;
        decSvg += P.light(dim, x, dim === 'jar' || dim === 'lantern' ? 330 : 520);
        lightPts.push({ x, y: dim === 'jar' || dim === 'lantern' ? 380 : 500 });
      }
      // настенный декор в широких промежутках
      if (w > 240 && th.wallDecor && rnd() < 0.75) decSvg += P.WDEC[P.pick(th.wallDecor)](g0 + w / 2 + (rnd() - 0.5) * (w - 220) * 0.6, 410 + rnd() * 70);
      // предметы у основания стены
      let x = g0 + 30;
      while (x < g1 - 80) {
        const it = decor[Math.floor(rnd() * decor.length)];
        const name = Array.isArray(it) ? it[0] : it, iw = (Array.isArray(it) && it[1]) || 130;
        if (x + iw > g1 - 10) break;
        const put = rnd() < 0.78; if (put && P.DEC[name]) decBlock.push([x, x + iw]);
        if (put) decSvg += P.DEC[name] ? (name === 'joke' ? P.DEC.joke(x + iw / 2, B + 2, P.pick(th.jokes || [['ОСТОРОЖНО', 'ЗДЕСЬ ДАНЖ']])) : P.DEC[name](x + iw / 2, B + 2)) : '';
        x += iw + 30 + rnd() * 90;
      }
    });
    // особые центральные части
    let specialSvg = '', bossPt = null, loot = null;
    special.forEach((sp) => {
      if (sp.kind === 'treasury') { specialSvg += drawTreasury(P, th, sp.x); loot = { x: sp.x, y: 700 }; }
      if (sp.kind === 'boss') { specialSvg += drawBossStub(P, th, sp.x); bossPt = { x: sp.x, y: 910, scale: 1.6 }; obst.push({ e: [sp.x, 912, 230, 56] }); }
      if (sp.kind === 'collapse') {
        specialSvg += opening(P, (th.frame && th.frame.tunnel) || 'timber', sp.x, 110, 520, '')
          + `<path d="M${sp.x - 120} ${B} L${sp.x - 110} 640 L${sp.x - 60} 600 L${sp.x - 10} 560 L${sp.x + 50} 590 L${sp.x + 100} 620 L${sp.x + 124} ${B} Z" fill="${pal.wallL}" ${P.O(4)}/>`
          + `<path d="${P.blob(sp.x - 60, 700, 30, 18)} ${P.blob(sp.x + 30, 660, 34, 20)} ${P.blob(sp.x - 10, 760, 40, 22)} ${P.blob(sp.x + 70, 740, 26, 16)}" fill="${pal.stoneL}" ${P.O(3)}/>`
          + P.sign(sp.x, 470, 170, 50, [[(th.signs && th.signs.deadend) || 'ТУПИК', 24, GOLD]], -4)
          + P.DEC.chest(sp.x + 200, B + 2) + P.DEC.joke(sp.x - 220, B + 2, P.pick(th.jokes || [['ТУПИК', 'ЗАТО КЛАД']]));
        loot = { x: sp.x + 200, y: 760 };
      }
    });
    // пандусы → неровный пол (walkPoly)
    const rampSvg = ramps.map((r) => r.svg).join('');
    if (ramps.length) {
      poly = [[40, 800]];
      ramps.sort((a, b) => a.poly[0][0] - b.poly[0][0]).forEach((r) => r.poly.forEach((pt) => poly.push(pt)));
      poly.push([W - 40, 800], [W - 40, 1060], [40, 1060]);
    }
    // особые эффекты темы (струи песка, водопады, лава…) — тема рисует в промежутках
    const fx = th.extra ? th.extra(P, { W, S, gaps, depth, room }) : '';
    // житель
    let npcSvg = '';
    if (npc) npcSvg = `<g class="dg-npc" data-npc="guide">${guy(P, 'проводник-' + room.region, npc.base, npc.x, 1.0, th.npc)}</g>`;   // 23.10: группа — сайт подсвечивает и даёт реплику
    // баннер на каждом экране — только на первом (название), на остальных — табличка этажа
    const title = room.name || (th.names && th.names[room.seed % th.names.length]) || 'ДАНЖ';
    const sub = `${(th.region || '').toUpperCase()} · ЭТАЖ ${room.floor} · ${TYPE_NAMES[room.type] || ''}`;
    if (secretOut && (secretOut.type === 'illusion' || secretOut.type === 'hatch')) {
      const avoid = Object.keys(doors).filter((k) => k !== secretOut.key).map((k) => doors[k].x).concat(events.map((e) => e.x));
      secretOut.search = searchZones(P, room.secret || {}, secretOut.mode === 'floor' ? secretOut.x : secretOut.x, W, secretOut.mode === 'floor' ? 'floor' : 'wall', secretOut.mode === 'floor' ? obst.filter((o) => o.e).map((o) => o.e[0]) : avoid, decBlock);
    }
    // fxOver: эффект темы висит на стене (колокол, груз на цепи) — рисуем поверх декора, а не под ним
    const scene = s + floorSecretSvg + (th.fxOver ? '' : fx) + decSvg + (th.fxOver ? fx : '') + specialSvg + exitSvg + actSvg + rampSvg + npcSvg + P.banner(960, title.toUpperCase(), sub);
    /* --- предметы с глубиной: не в центре первого экрана (там строится отряд), не у дверей, не под вебкой --- */
    const props = [];
    const propKinds = th.props || ['stalagmite'];
    for (let i = 0; i < S; i++) {
      const cands = i === 0 ? [380 + (room.type === 'start' ? 600 : 0) > 1460 ? null : 380] : [300, 760, 1180].map((x) => i * SW + x);
      cands.forEach((x) => {
        if (x == null || rnd() > (i === 0 ? 0.35 : 0.55)) return;
        if (i === 0 && room.type === 'start') return;
        const z = 930 + Math.round(rnd() * 80);
        if (Object.values(doors).some((d) => Math.abs(d.x - x) < 90) || obst.some((o) => o.e && Math.abs(o.e[0] - x) < o.e[2] + 60) || events.some((e) => Math.abs(e.x - x) < e.w / 2 + 60)) return;
        const kind = propKinds[Math.floor(rnd() * propKinds.length)];
        const pr = P.PROP[kind]; if (!pr) return;
        const svgStr = pr(x, z);
        props.push({ svg: () => svgStr, x: x - 90, y: z - 340, w: 180, h: 360, z });
        obst.push({ e: [x, z - 3, 40, 11] });
      });
    }
    // развилка: указатель на полу (если есть место слева на втором экране или справа у края первого)
    if (room.type === 'fork' && S >= 2 && exits.length >= 3) {
      const x = SW + 520, z = 1010;
      if (!obst.some((o) => o.e && Math.abs(o.e[0] - x) < o.e[2] + 120) && !events.some((e) => Math.abs(e.x - x) < e.w / 2 + 200)) {
        const shortOf = (e, d) => { const t = (e.label || '').toUpperCase(); return t && t.length <= 9 ? t : d; };
        const a = shortOf(exits[0], 'НАЗАД'), b2 = shortOf(exits[1], /down|shaft|pit/.test(exits[1].kind) ? 'ВНИЗ' : 'ВПЕРЁД');
        const svgStr = P.PROP.signpost(x, z, a, b2);
        props.push({ svg: () => svgStr, x: x - 200, y: z - 280, w: 400, h: 300, z });
        obst.push({ e: [x, z - 3, 30, 10] });
      }
    }
    /* --- номера, подписи, цвета, «помещения» --- */
    const keys = exits.map((e) => e.key);
    const labels = {}, colors = {}, rooms = {};
    const genLabel = { out: 'Наружу', back: 'Назад', tunnel: 'Проход', hole: 'Лаз', down: 'Вниз', shaft: 'Вниз', pit: 'Провал' };
    exits.forEach((e, i) => {
      labels[e.key] = e.label || genLabel[e.kind] || 'Проход';
      colors[e.key] = KEY_COLORS[e.key] || '#9aa0b4';
      if (e.kind === 'secret') { labels[e.key] = e.label || 'Тайная дверь'; rooms[e.key] = { title: 'Сокровищница', icon: '💎', bg: `radial-gradient(ellipse at 50% 70%, ${GOLD} 0%, ${pal.wall} 40%, ${pal.ceil} 80%)`, note: 'Тайник открыт!' }; return; }
      if (e.kind !== 'back' && e.kind !== 'out') rooms[e.key] = { title: labels[e.key], icon: /down|shaft|pit/.test(e.kind) ? '⬇️' : '➡️', bg: `radial-gradient(ellipse at 50% 70%, ${pal.glow} 0%, ${pal.wall} 40%, ${pal.ceil} 80%)`, note: /down|shaft|pit/.test(e.kind) ? `Спуск на этаж ${room.floor + 1}` : 'Дальше по этажу' };
    });
    // номера: порядок как в опросе (1..N), «назад» — последний
    const order = keys.slice(1).filter((k) => k !== 'secret').concat(keys.includes('secret') ? ['secret'] : [], [keys[0]]);
    spots.forEach((sp) => { sp.n = order.indexOf(sp.key) + 1; });
    if (secretOut) secretOut.spot = Object.assign({ key: secretOut.key, n: order.indexOf(secretOut.key) + 1 }, secretOut.spot);
    // старые ключи: заполнить отсутствующие (виджет ждёт все 4)
    if (legacy) ['forge', 'tent', 'rows', 'leave'].forEach((k) => {
      if (!doors[k]) doors[k] = Object.assign({}, doors.leave);
      if (!labels[k]) labels[k] = '';
      if (!colors[k]) colors[k] = KEY_COLORS[k];
      if (k !== 'leave' && !rooms[k]) rooms[k] = { title: labels[k] || '—', icon: '·', bg: '#14112a', note: '' };
    });
    const viewOf = {}; Object.keys(doors).forEach((k) => { viewOf[k] = VIEW_NAMES[Math.min(S - 1, Math.floor(doors[k].x / SW))]; });
    const backDoor = doors[keys[0]];
    const first = lightPts[0] || { x: 600, y: 500 };
    const skyStars = [[], [], [], []];
    const motes = th.motes || ['#ffe59a', '#9fe39a'];
    for (let i = 0; i < 40 * S; i++) skyStars[i % 4].push(`<circle cx="${f1(rnd() * W)}" cy="${f1(20 + rnd() * 200)}" r="${f1(1.1 + rnd() * 2)}" fill="${motes[i % motes.length]}" opacity="${(0.3 + rnd() * 0.5).toFixed(2)}"/>`);
    const sky = th.sky || ['#0c0914', '#1d1424'];
    return {
      width: W, height: 1080, views,
      scene: () => scene,                 // строка уже собрана; scene() вызывается виджетом один раз
      skyStars,
      props, obstacles: obst,
      area: { x0: 40, x1: W - 40, y0: 800, y1: 1060 }, scale: { min: 0.46, range: 0.3 },
      walkPoly: poly || undefined,
      doors,
      gate: { x0: backDoor.x - 50, x1: backDoor.x + 50, y0: 812, y1: 860 },
      exit: { x0: 860, x1: 1060, y0: 815, y1: 850 },
      colors, labels, spots,
      texts: Object.assign({ pollTitle: 'Куда идём?', pollFoot: 'Пиши цифру в чат! · голосов:', ghostsNote: '👻 призраки не голосуют', leaving: room.type === 'start' ? 'Выбираемся наружу!' : 'Возвращаемся назад!', going: (l) => `Идём: ${l}!`, noVotes: 'Никто не проголосовал' }, th.texts || {}),
      sky: { at: Object.values(views).map((o) => ({ x: o + 1264, y: 20 })), w: 388, colors: { title: '#ffe39a', name: '#fff4e0', sum: '#ffe39a' } },
      alertBox: { x: 28, y: 16, w: 560 },
      smith: npc ? { x: npc.x, y: 826, big: 1 } : { x: first.x, y: 830, big: 1 },
      anvil: { x: first.x, y: first.y },
      fx: { well: loot || (bossPt ? { x: bossPt.x, y: 860 } : { x: placed[placed.length - 1].x, y: 760 }) },
      guard: { look: { hat: 'legion', shape: 'box', color: '#5a5470' }, extra: { armed: true, gear: { w: 'spear', wr: 'common', s: 'scutum', sr: 'common' } } },
      rooms,
      boss: bossPt || undefined,
      npcs: npc ? [{ id: 'guide', x: npc.x, y: npc.base - 175, lines: NPC_SAY[room.region] || NPC_SAY.beyond }] : [],   // 23.10: жители (сайт: подсветка и реплика по клику)
      secret: secretOut || undefined,     // тайная дверь: { key, type, mode, x, door, spot, riddle, sockets:[…litSvg], openSvg, search?, hint?, openObstacle? } — в опросе скрыта до решения
      activators: activators.length ? activators : undefined,   // знаки в этой комнате: [{ id, symbol, x, y, r, foundSvg }]
      events,                             // места под события: [{ id, mode: 'wall'|'floor', x, y (где ноги), w, h, view }]
      css: `.fr-skybg{background:linear-gradient(${sky[0]} 0%,${sky[1]} 100%)}`
        + '.fr-pc{background:rgba(42,32,48,.95);border-color:#ffcf4a;box-shadow:0 0 0 3px #2b1d18,0 14px 40px rgba(0,0,0,.5)}.fr-pc-t{color:#ffcf4a;text-shadow:0 3px 0 #2b1d18}',
      meta: { hiddenKeys: secretOut ? [secretOut.key] : [], region: room.region, variant: room.variant === 2 ? 2 : 1, type: room.type, floor: room.floor, depth, screens: S, keys, order, viewOf, smil: P.smil(), legacyKeys: legacy },
    };
  }
  function railsSvg(P, x0, x1, y) {
    let sl = ''; for (let x = x0 + 6; x < x1 - 14; x += 46) sl += `M${x} ${y - 6}h18v40h-18Z`;
    return `<path d="${sl}" fill="${P.pal.woodD}" ${P.O(2.4)}/><path d="M${x0} ${y}H${x1}v7H${x0}Z M${x0} ${y + 22}H${x1}v7H${x0}Z" fill="${P.pal.metalD}" ${P.O(2.4)}/>`;
  }
  function gapsOf(occ, W) {
    const iv = occ.map((o) => [Math.max(0, o[0]), Math.min(W, o[1])]).sort((a, b) => a[0] - b[0]);
    const g = []; let x = 0;
    iv.forEach(([a, b]) => { if (a - x > 90) g.push([x, a]); x = Math.max(x, b); });
    if (W - x > 90) g.push([x, W]);
    return g;
  }
  // житель (рисуется выбранным стилем человечков; версия guy() из styles/cats/fair.js)
  function guy(P, seed, base, cx, s, look) {
    const svg = D.jDoodle(D.jhash(seed), 'happy', false, {}, look);
    const w = 120 * s, h = 170 * s, k = D.jhash(seed + '#anim') % 1000 / 1000;
    const body = svg.replace(/<svg class="jl-doodle( jd-ghost)?" viewBox="0 0 120 170"( style="([^"]*)")?/, (m, gh, st, css) => `<svg class="jl-doodle${gh || ''}" x="${f1(-w / 2)}" y="${f1(-h)}" width="${f1(w)}" height="${f1(h)}" viewBox="0 0 120 170" overflow="visible" style="${css ? css + ';' : ''}position:static;width:${f1(w)}px;height:${f1(h)}px;filter:none"`);
    const sway = P.anim(2) ? `<animateTransform attributeName="transform" type="rotate" values="0;${(2 + k).toFixed(1)};0;${(-2 - k).toFixed(1)};0" dur="${(3.2 + k * 1.6).toFixed(2)}s" begin="${(-k * 4).toFixed(2)}s" repeatCount="indefinite"/>` : '';
    return `<g transform="translate(${cx} ${base})"><g>${sway}${body}</g></g>`;
  }

  D.dungeonBuild = build;
  D.addLocation('cats', 'dungeon', function (env) { return build(env && env.room, env); });
})();

} catch (e) { console.error('[стили] styles/cats/dungeon.js не загрузился:', e); }
