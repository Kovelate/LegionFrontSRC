# API фронтенда «Легион»

Документ собран по JS/HTML/CSS из этого репозитория и проверен запросами к
`https://play.multidonate.ru` 28.10.2026.

## 1. Базовые правила

- Сайт канала: `https://play.multidonate.ru/c/<channel>/`.
- Все пути `/api/...` ниже **относятся к каналу**, то есть реально вызываются как
  `/c/<channel>/api/...`. Это делает загрузчик страницы:
  `window.fetch` переписывает строки, начинающиеся с `/api/`.
- `/admin/api/...`, `/auth/...`, `/site/ver` и `/site/worldgeo.json` — глобальные,
  без префикса канала.
- Формат тела: JSON (`Content-Type: application/json`), ответы — JSON UTF-8.
  Исключения: загрузка картинок — сырые байты, SSE — `text/event-stream`,
  `stylepack.js` — JavaScript.
- Авторизация — cookie сессии Twitch. При отсутствии входа сервер отвечает
  `401` и `{"ok":false,"error":"login_required"}` или
  `{"ok":false,"error":"войди через Twitch"}`.
- Успешный ответ почти всегда содержит `ok: true`.
- Ошибка: `{"ok":false,"error":"<код>","text":"<текст>"}`.
  Известные коды: `login_required`, `not_found`, `method_not_allowed`,
  `rate_limited`, `forbidden`, `bad_origin`, `town_closed`, `comments_off`,
  `muted`, `bad_images`, `no_comment`, `other`.
- Многие действия с вещами/городом/шахтой не выполняются синхронно: сервер
  ставит задание в очередь игры и сразу отвечает `{"ok":true,"id":"<id>"}`.
  Итог приходит позже:
  - в `GET /api/me` → `results: [{ id, ok, error?, x: { op, ... } }]`;
  - или событием SSE `me` / `city` / `mine` / `q`.
- Каталоги и лента отдают `ETag`; повторный запрос может вернуть `304` без тела.
- Есть ограничения частоты (`429`, `rate_limited`) на поиск, чат, смену стиля,
  создание канала, репорты и админские действия.

## 2. Каналы и стили

Список каналов: `GET /api/channels` (можно вызывать с любого канала).

На 28.10.2026:

| login | name | LG_STYLES | Примечание |
|---|---|---|---|
| `zakvielchannel` | ZakvielChannel | `["cats"]` | основной канал Заквиеля, стиль «Котики» |
| `exx1dae` | exx1dae | `["cherts"]` | второй канал, стиль «Чертики» |
| `5opka` | 5opka | `["legion"]` | «Пятёрка»; стиль канала пока «Легион», в коде уже есть стиль `42brothers` |
| `zakvielnight` | ZakvielNight | `["legion"]` | ночной канал, стиль «Легион» |

Всего в сборке стилей (`/lib/site-ui.js`, `STYLES`) семь:
`legion`, `cats`, `monkeys`, `veggies`, `42brothers`, `cherts`, `ugabugi`.
Стиль `42brothers` («42 Братухи») уже полностью собирается сервером в
`/stylepack.js?s=42brothers`, хотя активным стилем `5opka` пока не назначен.

## 3. Общие объекты

### Ошибка

```json
{ "ok": false, "error": "rate_limited", "text": "Слишком часто — подожди минуту" }
```

### Герой (`hero`)

Основные поля, которые читает фронтенд:

```json
{
  "login": "twitch_login",
  "name": "Имя героя",
  "level": 8,
  "role": "priest",
  "roleName": "Жрец",
  "xp": 1200,
  "xpInLevel": 120,
  "xpToNext": 400,
  "hpNow": 90,
  "stats": { "hp": 120, "atk": 12, "mag": 30, "def": 8 },
  "xs": { "crit": 3, "dodge": 2 },
  "money": 12345,
  "debt": 0,
  "busy": false,
  "ghost": false,
  "deadUntil": 0,
  "look": { "shapes": "…", "eyes": "…", "hat": "…", "ps": "cherts" },
  "gear": { "w": "staff", "wr": "rare", "a": "robe", "ar": "common" },
  "items": [ /* Item[] */ ],
  "sg": { "used": 7, "cap": 30, "bs": 20 },
  "sk": { "md": "class", "c": "priest", "m": {}, "t": {}, "rp": 3, "lv": 8 },
  "ac": { "g": {}, "p": {}, "lk": [], "t": null, "sh": null, "n": 0 },
  "mn": { "home": { "…": "…" } },
  "hm": { "id": "…", "camp": false },
  "cp": false,
  "qa": false,
  "i2": false,
  "tr": false,
  "tml": 0,
  "aw": [ { "id": "…", "n": "…", "d": "…", "i": "✦", "t": "…" } ]
}
```

`hm` — домашний округ/город канала; `qa` — доступ к кнопкам похода;
`i2` — новая сумка; `tr` — обмен; `tml` — минимальный уровень обмена;
`aw` — значки наград платформы.

### Вещь (`Item`)

```json
{
  "uid": "уникальный id в сумке",
  "id": "wood_club",
  "name": "Твёрдая колбаса",
  "baseName": "Дубина",
  "rarity": "common",
  "slot": "weapon",
  "gear": "any",
  "role": "legionary",
  "stats": { "atk": 5 },
  "en": 3,
  "dur": 87,
  "mat": "star|sphere|seal",
  "seal": 5,
  "n": 4,
  "q": 1200,
  "on": true,
  "wearable": true,
  "no": 2,
  "qty": true
}
```

`on` — надето, `wearable` — можно надеть, `en` — заточка, `dur` — прочность,
`n` — количество в стопке, `q` — осколки руды, `no` — номер в сумке для
команд чата.

### Сообщение чата (`ChatMessage`)

```json
{
  "id": "…",
  "l": "login",
  "n": "Имя",
  "t": "текст",
  "at": 1793180025434,
  "k": "g|tr|dm",
  "to": "login",
  "c": "priest",
  "cn": "Жрец",
  "r": "own|mod",
  "aw": [],
  "ev": 1,
  "tb": "g|tr|dm|ev"
}
```

### Результат действия (`results[]`)

```json
{
  "id": "queue-id",
  "ok": true,
  "error": null,
  "x": { "op": "enchant|mineBuy|qact|seal|st|auc|note|…", "…": "…" }
}
```

## 4. Загрузка и состояние

### `GET /site/ver`

Глобальный, без `/c/<channel>`.

```json
{ "v": "cbd57a37fa" }
```

### `GET /api/me`

Главный запрос страницы. Без входа:

```json
{ "ok": true, "user": null, "twitch": true, "find": true }
```

С входом:

```json
{
  "ok": true,
  "user": { "login": "…", "name": "…" },
  "hero": { "…": "Hero" },
  "creating": false,
  "results": [],
  "synced": 1793207545000,
  "fq": [],
  "classes": [ { "id": "legionary", "name": "Легионер", "beta": false } ],
  "ql": { "…": "вид похода" },
  "now": 1793207545889,
  "mine": [ { "login": "channel", "name": "Channel" } ],
  "ownNew": false,
  "roleSw": true,
  "find": true,
  "seal": true,
  "streamer": true,
  "admin": false,
  "twitch": true,
  "hm": { "id": "…", "camp": false }
}
```

Поля-флаги:

- `roleSw` — доступен переключатель «Зритель / Стример»;
- `find` — доступен поиск стримеров и «Мой список»;
- `seal` — доступна Печать Метаморфозы (личный стиль героя);
- `streamer` — доступен режим стримера;
- `ownNew` — можно создать свой канал;
- `admin` — администратор игры;
- `mine` — свои каналы.

### `GET /api/channels`

```json
{
  "ok": true,
  "channels": [
    { "login": "5opka", "name": "5opka", "live": false },
    { "login": "exx1dae", "name": "exx1dae", "live": false },
    { "login": "zakvielchannel", "name": "ZakvielChannel", "live": false },
    { "login": "zakvielnight", "name": "ZakvielNight", "live": false }
  ]
}
```

### `GET /api/find?q=<строка>`

Минимум 2 символа, поиск по нику/названию канала, есть ограничение частоты.

```json
{
  "ok": true,
  "q": "zak",
  "list": [
    { "login": "zakvielnight", "name": "ZakvielNight", "live": false },
    { "login": "zakvielchannel", "name": "ZakvielChannel", "live": false }
  ]
}
```

### `GET /api/mylist`

Требует входа.

```json
{
  "ok": true,
  "list": [
    {
      "login": "zakvielchannel",
      "name": "ZakvielChannel",
      "pinned": true,
      "hero": true,
      "live": false
    }
  ]
}
```

### `POST /api/mylist`

```json
{ "act": "open|pin|unpin|remove|order", "ch": "login", "order": ["login2", "login1"] }
```

`order` используется только с `act:"order"`. Ответ — новый `{ ok, list }`.

### `POST /api/ownchannel`

Создать свой канал (если разрешено `ownNew`). Тело `{}`.

```json
{ "ok": true, "login": "new_channel" }
```

## 5. Стиль канала

### `GET /api/style`

Требует входа.

```json
{
  "ok": true,
  "active": "cats",
  "styles": [
    { "id": "legion", "name": "Легион" },
    { "id": "cats", "name": "Котики" },
    { "id": "cherts", "name": "Чертики" },
    { "id": "42brothers", "name": "42 Братухи" }
  ],
  "lock": {
    "vote": false,
    "chosen": true,
    "once": false,
    "changed": false,
    "canChange": true
  },
  "admin": false,
  "bn": { "g": "Закхуэля", "i": "Закхуэлем" }
}
```

`lock` — правила смены стиля; `bn` — имя босса Пролога для текстов.

### `POST /api/style`

Выбрать стиль самому:

```json
{ "id": "42brothers", "confirm": true }
```

`confirm` нужен, если `lock.once` — смена последняя.

Отдать выбор чату:

```json
{ "vote": true }
```

Ответ — обновлённый объект стиля (`{ ok, active, styles, lock, … }`).

### `POST /api/seal`

Печать Метаморфозы: личный стиль героя.

```json
{ "uid": "uid печати в сумке", "style": "cherts" }
```

Ответ очереди: `{ "ok": true, "id": "…" }`.

### `GET /stylepack.js?s=<style>`

Путь канала: `/c/<channel>/stylepack.js?s=cats`.
Отдаёт JavaScript-бандл одного стиля (`styles/<style>/*`), который регистрируется
в `window.MDDoodle.styles`. Доступны все 7 стилей. Без `?s=` — 404.
Это не JSON API, а генератор статических JS-модулей.

### `GET /api/streamer`

Требует прав стримера/админа канала. Иначе `403`
`{"ok":false,"error":"режим стримера недоступен"}`.

```json
{
  "ok": true,
  "style": "cats",
  "smg": true,
  "dock": false,
  "pult": "…",
  "channel": { "login": "zakvielchannel", "name": "ZakvielChannel" },
  "ready": { "ok": true, "left": 0 },
  "sections": [
    { "id": "game", "t": "Игра" },
    { "id": "shop", "t": "Стрим сейчас" },
    { "id": "bugs", "t": "Репорты", "n": 3 },
    { "id": "ready", "t": "Готовность", "off": false },
    { "id": "panel", "t": "Пульт", "panel": true }
  ]
}
```

`smg` — доступна вкладка «Игра»; `sections[].off` — раздел выключен,
`panel` — это iframe пульта платформы, `n` — счётчик.

## 6. Каталоги и рейтинги

### `GET /api/legion`

```json
{
  "ok": true,
  "roles": {
    "recruit": { "name": "Котёнок", "n": 4105, "ghosts": 0 },
    "legionary": { "name": "Котоармеец", "n": 421, "ghosts": 0 }
  },
  "groups": [
    { "id": "mage", "name": "Маги", "icon": "✨", "n": 1168, "roles": ["mage", "necromancer"] }
  ],
  "total": { "heroes": 7650, "ghosts": 0, "levels": 19474, "avgLevel": 2.5 },
  "at": 1793207545889,
  "roster": [
    {
      "login": "larcequee",
      "name": "LarceQuee",
      "level": 8,
      "role": "priest",
      "ghost": false,
      "look": null,
      "gear": { "w": "censer", "wr": "rare", "a": "shroud", "ar": "common" },
      "aw": []
    }
  ]
}
```

`roster` — до 120 самых опытных героев.

### `GET /api/soc`

```json
{
  "ok": true,
  "top": [ { "login": "winonke", "name": "winonke", "score": 545, "rank": "aquilifer" } ],
  "total": 18120,
  "ranks": {
    "tiro": { "name": "Новобранец", "icon": "🔰", "bad": false },
    "hostis": { "name": "Враг Легиона", "icon": "☠️", "bad": true }
  },
  "me": null,
  "near": [],
  "at": 1793207545889,
  "aw": { "login": [ { "id": "…", "n": "…", "d": "…", "i": "✦", "t": "…" } ] }
}
```

`me` — своя строка `{ login, name, score, rank, place }` или `null`;
`near` — соседи по местам; `aw` — значки наград по логинам.

### `GET /api/skills`

```json
{
  "ok": true,
  "v": 1,
  "mode": "class",
  "on": true,
  "resetBase": 500,
  "resetMax": 20000,
  "resetDays": 7,
  "maxLevel": 50,
  "xp": [0, 40, 140],
  "classes": [
    {
      "id": "legionary",
      "name": "Легионер",
      "color": "#d9534f",
      "actions": [
        {
          "id": "natisk",
          "word": "натиск",
          "type": "second|active",
          "name": "Натиск",
          "text": "…",
          "cd": 1,
          "unlock": { "mastery": 5 }
        }
      ],
      "branches": [
        {
          "id": "blade",
          "name": "Клинок",
          "icon": "⚔",
          "text": "…",
          "nodes": [
            {
              "id": "leg_a_edge",
              "name": "Закалка клинка",
              "max": 5,
              "req": 0,
              "fx": { "melee": 1.2 },
              "text": "Урон мечом +{melee}%"
            }
          ]
        }
      ]
    }
  ]
}
```

### `POST /api/skill`

```json
{ "cls": "legionary", "node": "leg_a_edge" }
```

Ответ очереди `{ ok, id }`.

### `POST /api/skillReset`

```json
{ "cls": "legionary" }
```

### `GET /api/ach`

```json
{
  "ok": true,
  "cats": [["hero", "Герой и прогресс"], ["craft", "Ремёсла"]],
  "sys": { "mine": "Промыслы", "auction": "Аукцион" },
  "tierNames": ["бронза", "серебро", "золото"],
  "rarNames": { "О": "обычное", "Н": "необычное", "Р": "редкое" },
  "list": [
    {
      "id": "РМ-01",
      "cat": "craft",
      "sys": "mine",
      "coins": [50],
      "rar": ["О"],
      "name": "Первый камень",
      "desc": "Выкопать в шахте первый камень",
      "icon": "⛏️",
      "tiers": [1, 10, 100],
      "need": 1,
      "hidden": false,
      "tn": ["…"]
    }
  ]
}
```

Свой прогресс лежит в `hero.ac`: `g` — полученные ступени,
`p` — текущий прогресс, `lk` — открытые системы, `h` — открытые скрытые,
`t` — титул, `sh` — витрина, `tl` — доступные титулы, `n` — открыто ступеней.

### `POST /api/achPick`

Витрина:

```json
{ "show": "РМ-01" }
```

Титул:

```json
{ "title": "РМ-01" }
```

Снять титул: `{ "title": null }`.

### `GET /api/lore`

```json
{
  "ok": true,
  "items": {
    "dagger": ["Накладной коготок — оружие котоармейца…"],
    "rusty_sword": ["Сушёная вобла — оружие котоармейца…"]
  }
}
```

Значение — массив вариантов текста (по стилям/версиям).

## 7. Герой и сумка

Все POST-ответы ниже, если не сказано иное, — `{ ok: true, id }`; итог
приходит в `results[]` или SSE. `equip`/`unequip`/`use` часто сразу
возвращают `hero`.

| Метод | Путь | Тело | Ответ/примечание |
|---|---|---|---|
| POST | `/api/equip` | `{ "uid": "…" }` | `{ ok, hero? }` |
| POST | `/api/unequip` | `{ "slot": "helmet" }` | `{ ok, hero? }` |
| POST | `/api/use` | `{ "uid": "…" }` | `{ ok, hero? }` |
| POST | `/api/wear` | `{ "field": "hat", "value": "cap" }` | облик; `value` — строка/цвет/`null` |
| POST | `/api/repair` | `{ "uid": "…" }` или `{ "all": true }` | починка |
| POST | `/api/enchant` | `{ "uid": "…", "way": "…", "seal": 5? }` | заточка |
| POST | `/api/enchant` | `{ "cancel": 1 }` | отмена задания |
| POST | `/api/craft` | `{ "lvl": 5 }` | ковка материалов |
| POST | `/api/buymat` | `{ "mat": "star|sphere|seal", "ack": 1? }` | покупка материала |
| POST | `/api/discard` | `{ "uids": ["…", "…"] }` | выбросить вещи |

Склад и порядок:

| Метод | Путь | Тело | Примечание |
|---|---|---|---|
| POST | `/api/stPut` | `{ "uid": "…", "n": 1 }` | сумка → склад |
| POST | `/api/stTake` | `{ "uid": "…", "n": 1 }` | склад → сумка |
| POST | `/api/stPutAll` | `{}` | всё на склад |
| POST | `/api/stTakeAll` | `{}` | всё в сумку |
| POST | `/api/stSort` | `{ "box": "b|s" }` | разложить сумку/склад |
| POST | `/api/stOrder` | `{ "uids": ["…"] }` | свой порядок сумки |
| POST | `/api/stExpand` | `{ "price": 1000 }` | расширить склад |

### `GET /api/journal?tab=<вид>&before=<курсор>`

Виды: `all`, `fight`, `shop`, `find`, `coins`, `ach`, `auc` и другие из
`JTABS` сервера.

```json
{
  "ok": true,
  "items": { "wood_club": ["Твёрдая колбаса", "Дубина"] },
  "list": [
    {
      "id": "…",
      "k": "fight|boss|trap|shop|ench|loot|find|coins|hero|award|store|ach|trade|bug",
      "r": "win|lose|tie",
      "t": "текст записи",
      "at": 1793207545889,
      "c": 120,
      "x": 40
    }
  ],
  "next": "курсор следующей страницы или null"
}
```

### `POST /api/bugs/img`

Сырые байты картинки, `Content-Type: image/png|image/jpeg|image/webp|image/gif`.
Лимиты: до 5 МБ на картинку, до 5 картинок.

```json
{ "ok": true, "id": "…" }
```

### `POST /api/bugs`

```json
{
  "title": "Тема",
  "body": "Описание",
  "images": ["id1", "id2"],
  "context": {
    "tab": "city",
    "view": "",
    "page": "/c/zakvielchannel/",
    "ch": "zakvielchannel",
    "ua": "Mozilla/5.0 …",
    "screen": "1920×1080",
    "vp": "1600×900",
    "dpr": "1",
    "ver": "cbd57a37fa",
    "lang": "ru-RU",
    "style": "cats",
    "tz": "Europe/Moscow",
    "at": "2026-10-28T20:00:00.000Z"
  }
}
```

Ответ: `{ "ok": true }`. Ошибка устаревших картинок: `error:"bad_images"`.

## 8. Город

### `GET /api/city/stock`

Товар Кузни, магической лавки и Шатра.

```json
{
  "ok": true,
  "rows": [
    { "id": "wood_club", "name": "…", "price": 100, "mat": "star", "look": false }
  ],
  "magic": [ { "id": "…", "name": "…", "price": 100 } ],
  "forge": [ { "id": "…", "name": "…", "price": 100 } ],
  "forgeM": [],
  "tent": [ { "id": "…", "name": "…", "price": 100, "look": true } ],
  "tentM": []
}
```

`mat` — товар покупается за материал; `look: true` — облик за баллы канала.

### `GET /api/city/towns`

```json
{
  "ok": true,
  "list": [
    {
      "id": "…",
      "town": "Название",
      "danger": 2,
      "biome": "forest",
      "own": false,
      "k": 1.5,
      "why": "party|owned|tester",
      "home": false,
      "levels": { "hall": 2, "shop": 1 },
      "building": { "shop": { "to": 2, "until": 1793290000000 } }
    }
  ],
  "quest": false,
  "fair": true,
  "gone": false
}
```

`k` — множитель цен, `own` — округ своего канала, `home` — край отряда,
`quest` — отряд сейчас в походе, `gone` — Ярмарка/Перепутье позади.

### `POST /api/city/enter`

```json
{ "x": 1000, "y": 900, "town": "fair" }
```

Ответ:

```json
{
  "ok": true,
  "a": [ { "l": "login", "n": "Имя", "lv": 8, "x": 1000, "y": 900, "tx": 1000, "ty": 900, "dt": 0, "v": { "…": "облик" } } ],
  "m": [],
  "g": [],
  "n": 12,
  "chat": [ { "…": "ChatMessage" } ],
  "mod": "own|mod|null",
  "muted": { "until": 1793290000000 },
  "ign": ["login"],
  "c": 42,
  "tr": { "inv": [], "s": null }
}
```

Ошибка закрытого города: `{ "ok": false, "error": "town_closed" }`.

### Остальные городские методы

| Метод | Путь | Тело | Ответ/примечание |
|---|---|---|---|
| POST | `/api/city/leave` | `{}` | `{ ok }`, `keepalive` |
| POST | `/api/city/go` | `{ "x": 1, "y": 2, "fx": 3, "fy": 4 }` | `{ ok }`; троттлинг 300 мс |
| GET | `/api/city/state?c=<номер>` | — | дельта: `a`, `m`, `g`, `n`, `chat`, `chatDel`, `chatMe`, `c`, `tr` |
| POST | `/api/city/ping` | `{}` | `{ ok }`; раз в минуту |
| POST | `/api/city/in` | `{ "b": "shop" }` | вход/выход из здания для оверлея |
| POST | `/api/city/say` | `{ "text": "…", "k": "tr"?, "to": "login"? }` | `{ ok, msg: ChatMessage }` |
| POST | `/api/tentShop` | `{ "on": true }` | стример открыл Шатёр: награды за баллы |
| POST | `/api/cityBuy` | `{ "item": "id", "price": 100, "town": "id"? }` | очередь |
| POST | `/api/buymat` | `{ "mat": "star", "ack": 1? }` | очередь |

`/api/city/state` и SSE `city` используют одинаковый формат дельты:
`a` — пришли, `m` — шагнули (`[login, x, y, tx, ty, dt]`), `g` — ушли,
`n` — сколько других в городе, `chat`/`chatDel`/`chatMe` — чат,
`c` — номер последнего сообщения, `tr`/`trNote`/`trDone` — обмен.

### Чат города

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| GET | `/api/city/chat/mod` | — | `{ ok, role, bans: [{ l, until, by }], mods: ["login"] }` |
| POST | `/api/city/chat/mod` | `{ "op": "del|mute|ban|unban|mod|unmod", "id": "…", "login": "…", "min": 30 }` | `{ ok, id?, gone? }` |
| POST | `/api/city/chat/ignore` | `{ "login": "…", "on": true }` | `{ ok, ign: ["login"] }` |

`op:"del"` принимает `id` сообщения; `mute/ban/unban/mod/unmod` — `login`.
`min` — срок мута в минутах, 1–10080.

### Обмен (`POST /api/city/trade`)

```json
{ "op": "invite", "to": "login" }
{ "op": "accept", "from": "login" }
{ "op": "decline", "from": "login" }
{ "op": "cancel" }
{ "op": "offer", "items": [{ "uid": "…", "n": 1 }], "coins": 100 }
{ "op": "ready", "on": true }
{ "op": "confirm" }
```

Ответ содержит `tr` — вид обмена:

```json
{
  "ok": true,
  "tr": {
    "inv": [ { "l": "login", "n": "Имя", "lv": 8, "left": 60000 } ],
    "out": { "l": "login", "n": "Имя", "left": 60000 },
    "s": {
      "id": "…",
      "max": 6,
      "me": { "items": [], "coins": 0, "ready": false },
      "th": { "items": [], "coins": 0, "ready": false, "n": "Имя", "lv": 8, "chg": null },
      "cd": 3000,
      "wait": false,
      "warn": null,
      "err": null
    }
  }
}
```

События обмена приходят также в `city.tr`, `city.trNote`, `city.trDone`.

## 9. Шахта

`c` — id шахты: `home` или id города/округа. Почти все запросы принимают
`?c=<id>`.

### `GET /api/mine/hall?c=<id>`

Сводка шахты (лучшие копатели, итоги). Формат — объект `{ ok, … }`,
используется Ратушей; поля зависят от игры (таблица/итоги/неделя).

### `POST /api/mine/enter?c=<id>`

```json
{ "x": 800, "y": 900 }
```

Ответ:

```json
{
  "ok": true,
  "sid": "session-id",
  "st": { "n": 1, "fl": { "c": [], "entry": 0, "exit": 0 }, "biome": "mount", "danger": 1, "gem": null, "dug": "…" },
  "me": { "…": "герой в шахте" },
  "lk": { "login": { "…": "облик" } },
  "here": 5,
  "hw": 2,
  "n": 3,
  "a": [],
  "m": [],
  "g": [],
  "mchat": { "chat": [], "c": 0, "mod": null, "muted": null }
}
```

### `GET /api/mine/state`

Параметры:

- `c` — шахта;
- `v` — хэш уже известного вида;
- `f` — `seed.n` этажа;
- `sid` — id сессии;
- `lk` — список логинов, чьи облики нужны;
- `mc` — номер последнего сообщения чата (без SSE).

Ответ — та же структура, что у `enter`, плюс `other` (шахта открыта в
другой вкладке) и `mchat`.

### Остальные методы шахты

| Метод | Путь | Тело | Ответ/примечание |
|---|---|---|---|
| POST | `/api/mine/leave?c=<id>` | `{}` | `{ ok }` |
| POST | `/api/mine/ping?c=<id>` | `{}` | `{ ok }` |
| POST | `/api/mine/go?c=<id>` | `{ "x": 1, "y": 2, "fx": 3, "fy": 4 }` | `{ ok }` |
| POST | `/api/mineStop` | `{ "c": "…", "sid": "…" }` | `{ ok, other? }` |
| POST | `/api/mineDig` | `{ "i": 12, "c": "…", "sid": "…", "x": 1, "y": 2, "q": 1 }` | очередь; итог `results[].x.op = "mineDig"` |
| POST | `/api/mineClaim` | `{ "c": "…" }` | награда за поручения |
| POST | `/api/mineLamp` | `{ "c": "…" }` | купить «Каску шахтёра» |
| POST | `/api/mineBuy` | `{ "c": "…", "lines": [["uid", 100]], "price": 50 }` | скупщик |
| POST | `/api/minePick` | `{ "c": "…", "to": 2, "use": ["uid"] }` | улучшить кирку |
| POST | `/api/mineOreBag` | `{ "c": "…" }` | купить рудную сумку |
| POST | `/api/mineSell` | `{ "c": "…" }` | сдать всё |
| POST | `/api/mineSeen` | `{ "c": "…" }` | прочитал новость шахты |

`results[].x.op` для шахты: `mineBuy`, `minePick`, `mineOreBag`, `mineDig`,
`mineClaim`, `mineLamp`, `mineSell` и т. п.

### Чат шахты

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| GET | `/api/mine/chat/mod?c=<id>` | — | `{ ok, role, bans, mods }` |
| POST | `/api/mine/chat/mod?c=<id>` | `{ "op": "del|mute|ban|unban|mod|unmod", … }` | `{ ok, id?, gone? }` |
| POST | `/api/mine/chat/ignore?c=<id>` | `{ "login": "…", "on": true }` | `{ ok, ign }` |
| POST | `/api/mine/chat/say?c=<id>` | `{ "text": "…" }` | `{ ok, msg }` |

## 10. Поход

### `POST /api/qvote`

```json
{ "vid": "id голосования", "n": 2 }
```

Ответ: `{ ok }`; `error` — если голос не принят.

### `POST /api/qact`

Кнопки похода. Тело — объект, который кнопка собрала в `data-qa`:

```json
{ "k": "join" }
{ "k": "leave" }
{ "k": "ev", "a": "help|rob|bet|coin|donate|heal|cleanse|bless|revive", "n": 20, "t": "login" }
{ "k": "tr", "a": "rope|hold|take|eq|me|code|path|keep|next", "n": 1, "s": "#dig" }
{ "k": "b", "…": "…" }
{ "k": "eat", "…": "…" }
```

Ответ очереди: `{ ok, id }`; итог в `results[]` (`x.op = "qact"`) или SSE `q`.

### `POST /api/qsay`

Строка «Команда в поход» — то же, что ввод в чате.

```json
{ "line": "прыгнуть 2" }
```

Ответ: `{ ok, id, t? }`; `t` — нормализованная строка (например, `!щит` → `щит`).

### Вид похода

Приходит в `GET /api/me` как `ql` и событием SSE `q`. Внутри — состояние
отряда, бой, события, данж, ярмарка, голосования, сундуки, кнопки и т. п.

## 11. Карта мира

### `GET /api/world`

Требует входа.

```json
{
  "ok": true,
  "me": "zakvielchannel",
  "color": "#c8102e",
  "geo": "I5LR6p9jzMQr",
  "season": {
    "no": 1,
    "startsAt": 1792000000000,
    "endsAt": 1794592000000,
    "over": false
  },
  "ch": [["zakvielchannel", "#c8102e"], ["5opka", "#5a5a6a"]],
  "t": {
    "region-1": { "o": 0 },
    "region-2": { "o": 1 }
  },
  "gates": { "region-9": 1794592000000 },
  "lairsAt": 1794000000000,
  "party": "region-1",
  "home": "region-1",
  "city": true,
  "top": [
    {
      "ch": "zakvielchannel",
      "place": 1,
      "color": "#c8102e",
      "capital": true,
      "held": 7,
      "inf": 42
    }
  ]
}
```

- `ch` — `[login, color]` по индексам, на которые ссылается `t[].o`;
- `t` — состояние округов (`o` — индекс владельца, `null` — брошен);
- `gates` — время открытия врат, `lairsAt` — время открытия логов;
- `party` — где сейчас отряд канала, `home` — домашний округ;
- `city` — открыт ли «Город» для этого входа;
- `top` — таблица каналов по землям.
- `geo` — версия `/site/worldgeo.json`.

Ошибка закрытой карты: `{ "ok": false, "error": "world_closed" }`.

## 12. Аукцион

### `GET /api/auction`

```json
{
  "ok": true,
  "v": "версия витрины",
  "lots": [
    {
      "id": "lot-id",
      "i": "wood_club",
      "en": 3,
      "n": 1,
      "s": "seller_login",
      "u": 1793290000000,
      "p": 10000,
      "dur": 87,
      "st": { "atk": 8 },
      "pts": 0
    }
  ],
  "items": {
    "wood_club": {
      "name": "Дубина",
      "slot": "weapon",
      "rarity": "common",
      "stats": { "atk": 5 },
      "gear": "any",
      "role": "legionary"
    }
  },
  "hist": { "wood_club": [[10000, 0], [12000, 3]] },
  "vals": { "wood_club": 800 },
  "cfg": {
    "minPct": 50,
    "maxX": 5,
    "feePct": 5,
    "feeMin": 10,
    "com": 3,
    "maxLots": 5,
    "bonus": [0, 5, 10]
  }
}
```

`u` — время окончания лота, `p` — цена в меди, `en` — заточка, `st` —
характеристики с заточкой, `hist` — последние цены `[цена, заточка]`,
`vals` — базовая ценность.

### Действия

| Метод | Путь | Тело | Примечание |
|---|---|---|---|
| POST | `/api/aucBuy` | `{ "lot": "id", "price": 10000 }` | цена подтверждается клиентом |
| POST | `/api/aucCancel` | `{ "lot": "id" }` | снять свой лот |
| POST | `/api/aucSell` | `{ "uid": "…", "n": 1, "price": 10000, "hours": 24 }` | цена в меди |
| POST | `/api/aucClaim` | `{}` | забрать вещи со склада аукциона |

Ответы — очередь `{ ok, id }`; итог в `results[]` (`x.op` с префиксом `auc`).

## 13. Новости

### `GET /api/news` и `GET /api/news?before=<id>`

```json
{
  "ok": true,
  "list": [
    {
      "id": "5",
      "title": "…",
      "tag": "update|balance|event|fix",
      "at": 1792946391404,
      "html": "<figure class=\"nw-fig\">…</figure><p>…</p>",
      "likes": 129,
      "comments": 26
    }
  ],
  "next": "курсор следующей страницы или null"
}
```

`html` — уже безопасный HTML, собранный сервером. Картинки — `/news-img/<file>`.

### `GET /api/news/head`

```json
{ "ok": true, "last": 1792946391404, "n": 4 }
```

`last` — время самой свежей новости, `n` — количество новостей.

### `GET /api/news/my?ids=5,4&r=1`

Можно вызывать без входа: тогда вернётся `{"ok":true,"liked":[]}` без
персональных полей. `muted`, `replies` и реальные `liked` — только с сессией.

```json
{
  "ok": true,
  "liked": ["5"],
  "muted": false,
  "replies": {
    "n": 2,
    "last": 1793200000000,
    "list": [ { "post": "5", "thread": "442", "title": "…" } ]
  }
}
```

`r=1` — заодно спросить «вам ответили»; без него `replies` может отсутствовать.

### Комментарии

`GET /api/news/<id>/comments?sort=top|new&cur=<курсор>`

```json
{
  "ok": true,
  "open": true,
  "sort": "top",
  "list": [
    {
      "id": "452",
      "login": "login",
      "name": "Имя",
      "text": "…",
      "at": 1793180025434,
      "l": 0,
      "r": 0,
      "au": true,
      "ml": false,
      "del": false,
      "p": null,
      "c": null,
      "to": null
    }
  ],
  "more": "курсор",
  "total": 26
}
```

`l` — лайки, `r` — ответы, `au` — автор новости, `ml` — лайкнул я,
`del` — удалён, `p` — родительский комментарий, `to` — кому ответ.

`GET /api/news/<id>/comments/<cid>/replies?after=<курсор>`

```json
{ "ok": true, "list": [ { "id": "443", "p": "442", "…": "…" } ], "more": null, "total": 3 }
```

`POST /api/news/<id>/comments`

```json
{ "text": "…", "reply": "442" }
```

`reply` — id комментария, на который отвечаем. Ответ:

```json
{ "ok": true, "comment": { "id": "…", "…": "…" } }
```

Ошибки: `comments_off`, `muted`, `no_comment`.

### Лайки и удаление

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| POST | `/api/news/like` | `{ "id": "5", "on": true }` | `{ ok, liked, likes }` |
| POST | `/api/news/comments/like` | `{ "id": "452", "on": true }` | `{ ok, liked, likes }` |
| POST | `/api/news/comments/delete` | `{ "id": "452" }` | `{ ok }` |
| POST | `/api/news/replies/seen` | `{ "upto": 1793200000000 }` | `{ ok }` |

## 14. Админка новостей

Требует `admin` (иначе `401`/`403`).

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| GET | `/admin/api/news` | — | `{ ok, list }` — лента с черновиками |
| GET | `/admin/api/news/trash` | — | `{ ok, list }` — удалённые, живут 30 дней |
| POST | `/admin/api/news/preview` | `{ "body": "текст" }` | `{ ok, html }` |
| POST | `/admin/api/news/save` | `{ "id"?, "title", "body", "tag" }` | `{ ok, post }` |
| POST | `/admin/api/news/publish` | `{ "id", "on": true }` | `{ ok, post }` |
| POST | `/admin/api/news/delete` | `{ "id" }` | `{ ok, days: 30 }` |
| POST | `/admin/api/news/restore` | `{ "id" }` | `{ ok, post }` |
| POST | `/admin/api/news/purge` | `{ "id" }` | `{ ok }` |
| POST | `/admin/api/news/upload` | сырые байты картинки | `{ ok, id, md, url? }` |
| POST | `/admin/api/news/comments/switch` | `{ "id", "on": true }` | `{ ok }` |
| POST | `/admin/api/news/comments/mute` | `{ "login", "hide": true, "ban": true }` | `{ ok }` |

`post` — запись новости: `id`, `title`, `body`, `tag`, `published`,
`publishedAt`, `at`, `likes`, `comments` и служебные поля.
`md` в ответе загрузки — готовая строка разметки для вставки в текст.

## 15. Авторизация

| Метод | Путь | Тело/параметры | Ответ |
|---|---|---|---|
| GET | `/auth/twitch/login?next=<url>` | — | OAuth-редирект Twitch |
| POST | `/auth/logout` | `{}` | `{ ok }` |
| POST | `/auth/device/start` | `{ "next": "/c/…/streamer" }` + заголовок `Origin` сайта | `{ ok, code, link, url, ttl }` |
| POST | `/auth/device/poll` | `{}` + cookie устройства | `{ ok, state, ttl?, next? }` |
| GET | `/link?code=<код>` | — | HTML-страница подтверждения |

`/auth/device/start` без правильного `Origin` отвечает
`403 {"ok":false,"error":"bad_origin"}`.

Состояния `poll`: `wait`, `ok`, `cancelled`, `expired`.

## 16. Живой канал (SSE)

`GET /api/live` — `text/event-stream`, cookie сессии.

Параметры:

- `?sm=1` — стримерский набор событий;
- `?sm=1&only=sm` — док OBS: только события стримера.

События (`event:`), данные — JSON в `data:`:

| Событие | Данные |
|---|---|
| `me` | `{ hero, creating, results, synced, fq, now? }` — обновление героя |
| `j` | массив записей журнала (`JournalEntry[]`) |
| `city` | дельта города: `a`, `m`, `g`, `n`, `chat`, `chatDel`, `chatMe`, `c`, `tr`, `trNote`, `trDone` |
| `mine` | дельта шахты: `c`, `st`, `me`, `a`, `m`, `g`, `n`, `here`, `hw`, `hm`, `chatRoom`, `chat`, `chatDel`, `chatMe`, `mchat` |
| `q` | вид похода (как `ql` в `/api/me`) |
| `style` | `{ style, why? }` — стиль канала сменился |
| `sm` | `{ why: ["mods"|…], style? }` — изменились разделы/пульт/стиль |
| `busy` | `{}` — сервер просит закрыть живой канал (перегрузка) |

## 17. Статические и генерируемые ресурсы

### `GET /site/worldgeo.json?v=<версия>`

Геометрия мира для карты. Глобальный путь.

```json
{
  "v": 1,
  "vb": [0, 0, 10000, 7000],
  "biomes": { "…": "…" },
  "chains": [],
  "regions": [],
  "t": [],
  "gates": [],
  "rivers": [],
  "barrier": [],
  "isles": []
}
```

`t` — округа, `regions` — регионы, `chains` — связи, `gates` — врата,
`rivers` — реки, `barrier` — границы, `isles` — острова.

### `GET /c/<channel>/`

HTML-страница канала. Внутри — конфигурация:

```js
window.LG_CITYV = { fair, map, art, js, css, gl, pixi, pixiEval, font, au, auc, ig, sc, tr, tg, ta, cm, ca, hw, hn, mw, ma, mb, sa, mj, mc }
window.LG_QV = { js, css, cc, bc, ak, bt, sh, foes, dg }
window.LG_WORLDV = { js, css, geo }
window.LG_SITEV = "cbd57a37fa"
window.LG_BUGV = { js, css }
window.LG_STARTV = { js, css }
window.LG_BASE = "/c/<channel>"
window.LG_LOGIN = "/auth/twitch/login?next=…"
window.LG_STYLES = ["cats"]
window.LG_CH = { login, name }
```

Значения `*V` — версии файлов для `?v=`; их изменение — сигнал обновления.

### Прочие страницы и файлы

| Путь | Формат | Примечание |
|---|---|---|
| `/c/<channel>/streamer` | HTML | вход в пульт стримера (device flow / Twitch) |
| `/c/<channel>/game` | HTML | то же, `next` на игру |
| `/c/<channel>/doodle.js` | JS | ядро человечков + активный стиль канала |
| `/c/<channel>/cityfair.js` | JS | Ярмарка: стили `legion`/`cats`/`cherts` |
| `/c/<channel>/questfoes.js` | JS | враги похода: `legion` |
| `/c/<channel>/questdungeon.js` | JS | данжи: `cats` |
| `/stylepack.js?s=<style>` | JS | бандл одного стиля (см. §5) |
| `/news-img/<file>` | image | картинки новостей |
| `/site/vendor/pixi-8.22.0.min.js` | JS | PixiJS для «Города» |
| `/site/vendor/pixi-unsafe-eval-8.22.0.min.js` | JS | замена `new Function` для CSP |
| `/site/vendor/russo-one.woff` | font | шрифт вывесок Ярмарки |

## 18. Что упоминается в коде, но не отдаётся с сайта

Эти пути — исходники/старые расположения внутри проекта, а не публичные URL.
Проверка `wget`/`curl` даёт `404`:

- `/styles/*` (`styles/legion/*`, `styles/cats/*`, `styles/cherts/*`,
  `styles/42brothers/*`) — исходники стилей; в браузер попадают через
  `/stylepack.js` и `/c/<channel>/doodle.js`;
- `/modules/*` — серверные модули игры;
- `/site/public/*` — старые копии `cityart.js`, `cityhw.js`, `hwnpc.js`,
  `itemgrid.js`, `ore-art.js`, `sitechat.js`, `style.css`;
- `/c/panel/*`, `/c/platform/skin.css`, `/c/overlay/doodle.js` — внутренние
  пути пульта/оверлея;
- `/overlay/doodle.js` на основном домене отвечает `403` (нужен контекст
  оверлея MultiDonate);
- `/site/worldgeo.js` — нет, есть только `worldgeo.json`;
- `/site/vendor/basis/*` — Basis-транскодер не выложен; Pixi использует CDN
  `cdn.jsdelivr.net`.

## 19. Проверка ссылок

`files.link` пересобран по результатам обхода JS/CSS/HTML. Все 84 URL из него
проверены командой:

```bash
wget -x -i files.link
```

Код возврата — `0`, все файлы сохранены с сохранением структуры каталогов
(`play.multidonate.ru/...`). Файлы с query-string (`stylepack.js?s=...`) в
`files.link` не добавлялись: `wget` сохраняет их с `?` в имени, а при
изменении набора стилей это ломало бы список. Они описаны в §5.
