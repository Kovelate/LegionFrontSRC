#!/bin/bash

# === НАСТРОЙКИ ===
ENDPOINT="play.multidonate.ru/site/ver"     # URL эндпоинта с версией
FILES_LIST="files.link"                     # Файл со списком ссылок

INTERVAL_NORMAL=600                         # Обычный интервал (10 минут)
INTERVAL_ERROR=2400                         # Интервал при ошибке (40 минут)

LAST_VERSION_FILE=".last_version"           # Файл для хранения версии
CURRENT_INTERVAL=$INTERVAL_NORMAL           # Текущий интервал (по умолчанию обычный)

echo "Запуск мониторинга версий..."
echo ""

while true; do
    # 1. Получаем текущую версию
    CURRENT_VERSION=$(curl -L -s --max-time 15 "$ENDPOINT")

    # Проверяем, что ответ от сервера вообще пришел
    if [ -z "$CURRENT_VERSION" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ошибка: эндпоинт не ответил. Включаем увеличенный интервал ожидания."
        CURRENT_INTERVAL=$INTERVAL_ERROR
    else
        # Читаем сохраненную версию
        if [ -f "$LAST_VERSION_FILE" ]; then
            OLD_VERSION=$(cat "$LAST_VERSION_FILE")
        else
            OLD_VERSION=""
        fi

        # 2. Сравниваем версии текстом
        if [ "$CURRENT_VERSION" != "$OLD_VERSION" ]; then
            echo "--------------------------------------------------"
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] - Обнаружена новая версия!"
            echo "Старая: $OLD_VERSION"
            echo "Новая:  $CURRENT_VERSION"
            echo "--------------------------------------------------"

            if [ -f "$FILES_LIST" ]; then
                echo "Скачивание файлов..."
                
                # 3. Скачиваем файлы и проверяем успешность
                wget -q -x -i "$FILES_LIST"
                WGET_STATUS=$?

                if [ $WGET_STATUS -eq 0 ]; then
                    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Все файлы успешно скачаны."
                    
                    # Сохраняем версию только при успешном скачивании
                    echo "$CURRENT_VERSION" > "$LAST_VERSION_FILE"

                    # 4. Делаем коммит в Git
                    COMMIT_DATE=$(date '+%Y-%m-%d %H:%M:%S')
                    echo "Фиксация изменений в Git..."
                    git add .
                    git commit -m "Update to version $CURRENT_VERSION ($COMMIT_DATE)"
                    
                    # 5. Пушим на сервер
                    echo "Отправка изменений на сервер"
                    git push origin main
                    
                    # Возвращаем обычный интервал, если до этого была ошибка
                    CURRENT_INTERVAL=$INTERVAL_NORMAL
                    echo "Обновление завершено. Ждем следующей проверки..."
                else
                    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ошибка: wget завершился с кодом $WGET_STATUS."
                    echo "Версия НЕ обновлена в логах. Переходим на увеличенный интервал."
                    
                    # Включаем аварийный интервал
                    CURRENT_INTERVAL=$INTERVAL_ERROR
                fi
            else
                echo "Ошибка: Файл со ссылками '$FILES_LIST' не найден! Скачивание отменено."
                CURRENT_INTERVAL=$INTERVAL_ERROR
            fi
        else
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] - Версия не изменилась"
            echo "Версия: $CURRENT_VERSION"
            # Если версии совпали, убеждаемся, что интервал обычный
            CURRENT_INTERVAL=$INTERVAL_NORMAL
        fi
    fi

    # Спим установленное количество времени
    echo "Ожидание $((CURRENT_INTERVAL / 60)) мин..."
    sleep "$CURRENT_INTERVAL"
    echo ""
done
