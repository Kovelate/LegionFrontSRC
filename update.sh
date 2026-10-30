#!/bin/bash
set -u

# === НАСТРОЙКИ ===
ENDPOINT="play.multidonate.ru/site/ver"     # URL эндпоинта с версией
FILES_LIST="files.link"                     # Файл со списком ссылок
LAST_VERSION_FILE="last_version"            # Файл для хранения последней версии

INTERVAL_NORMAL=600                         # Обычный интервал проверки
INTERVAL_RETRY=60                           # Интервал повтора после ошибки
FAST_MODE=0                                 # 1 = ускоренный режим (--fast)

SEP="──────────────────────────────────────────────"

now() { date '+%Y-%m-%d %H:%M:%S'; }

fmt_interval() {
    local s=$1
    if (( s >= 60 && s % 60 == 0 )); then
        printf '%d мин' $((s / 60))
    else
        printf '%d сек' "$s"
    fi
}

usage() {
    cat <<EOF
Использование: $(basename "$0") [--fast]

  -f, --fast   ускоренный режим: проверка раз в минуту,
               повтор после ошибки через 15 секунд
  -h, --help   показать эту справку
EOF
}

while (( $# > 0 )); do
    case "$1" in
        -f|--fast) FAST_MODE=1 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Неизвестный аргумент: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
done

if (( FAST_MODE )); then
    INTERVAL_NORMAL=60
    INTERVAL_RETRY=15
fi

cd "$(dirname "$0")" || exit 1

if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "Ошибка: каталог не является git-репозиторием" >&2
    exit 1
fi

trap 'echo; echo "Мониторинг остановлен."; exit 0' INT TERM

MODE_TEXT="обычный"
(( FAST_MODE )) && MODE_TEXT="быстрый"

echo "Мониторинг версий запущен · режим: $MODE_TEXT"
echo "Проверка каждые $(fmt_interval "$INTERVAL_NORMAL"), повтор после ошибки через $(fmt_interval "$INTERVAL_RETRY")"
echo

PENDING_PUSH=0

while true; do
    # Отправка, которую не удалось выполнить на прошлой итерации
    if (( PENDING_PUSH )); then
        if git push -q origin HEAD; then
            PENDING_PUSH=0
            echo "[$(now)] отложенная отправка выполнена"
        else
            echo "[$(now)] ошибка: не удалось отправить изменения"
            echo "  повтор через $(fmt_interval "$INTERVAL_RETRY")"
            sleep "$INTERVAL_RETRY"
            continue
        fi
    fi

    # 1. Получаем текущую версию
    CURRENT_VERSION=$(curl -fsSL --retry 3 --max-time 5 "$ENDPOINT" 2>/dev/null | tr -d '[:space:]')

    if [ -z "$CURRENT_VERSION" ]; then
        echo "[$(now)] ошибка: эндпоинт не ответил"
        echo "  повтор через $(fmt_interval "$INTERVAL_RETRY")"
        sleep "$INTERVAL_RETRY"
        continue
    fi

    # 2. Читаем сохраненную версию
    OLD_VERSION=""
    if [ -f "$LAST_VERSION_FILE" ]; then
        OLD_VERSION=$(tr -d '[:space:]' < "$LAST_VERSION_FILE")
    fi

    # 3. Ничего не изменилось — одна строка
    if [ "$CURRENT_VERSION" = "$OLD_VERSION" ]; then
        echo "[$(now)] обновлений нет · следующая проверка через $(fmt_interval "$INTERVAL_NORMAL")"
        sleep "$INTERVAL_NORMAL"
        continue
    fi

    # 4. Новая версия — обновляемся
    echo "$SEP"
    echo "[$(now)] обнаружена новая версия — обновление"
    echo "$SEP"

    if [ ! -f "$FILES_LIST" ]; then
        echo "  ошибка: файл со ссылками '$FILES_LIST' не найден"
        echo "  повтор через $(fmt_interval "$INTERVAL_RETRY")"
        echo "$SEP"
        sleep "$INTERVAL_RETRY"
        continue
    fi

    wget -q -x -i "$FILES_LIST"
    WGET_STATUS=$?

    if [ $WGET_STATUS -ne 0 ]; then
        echo "  скачивание файлов — ошибка (код $WGET_STATUS)"
        echo "  файлы не обновлены, повтор через $(fmt_interval "$INTERVAL_RETRY")"
        echo "$SEP"
        sleep "$INTERVAL_RETRY"
        continue
    fi
    echo "  скачивание файлов — готово"

    # Версия сохраняется только после успешного скачивания
    echo "$CURRENT_VERSION" > "$LAST_VERSION_FILE"

    git add -A
    if git diff --cached --quiet; then
        echo "  коммит — нечего фиксировать"
    else
        if git commit -q -m "Front update: $(now)"; then
            echo "  коммит — готово"
        else
            echo "  коммит — ошибка"
            echo "  версия не зафиксирована, повтор через $(fmt_interval "$INTERVAL_RETRY")"
            echo "$OLD_VERSION" > "$LAST_VERSION_FILE"
            echo "$SEP"
            sleep "$INTERVAL_RETRY"
            continue
        fi
    fi

    if git push -q origin HEAD; then
        echo "  отправка на сервер — готово"
        echo "$SEP"
        echo "[$(now)] обновление завершено · следующая проверка через $(fmt_interval "$INTERVAL_NORMAL")"
        NEXT_INTERVAL=$INTERVAL_NORMAL
    else
        echo "  отправка на сервер — ошибка"
        echo "  повтор отправки через $(fmt_interval "$INTERVAL_RETRY")"
        echo "$SEP"
        PENDING_PUSH=1
        NEXT_INTERVAL=$INTERVAL_RETRY
    fi

    sleep "$NEXT_INTERVAL"
done
