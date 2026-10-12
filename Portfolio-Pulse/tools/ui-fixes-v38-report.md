# Проверка шести исправлений v38

Исправления выполнены точечными заменами в `assets/app-v38.js` и `assets/workforce-v38.js`. Перед первой записью созданы соседние `app-v38.backup.js` и `workforce-v38.backup.js`. После каждого пакета замен соответствующий файл проверен `node --check` (код 0). CSS, `tools/build_system_css.py`, `api/`, `api/seed/` не редактировались. Команды commit не выполнялись; параллельная работа в репозитории не откатывалась.

## Воспроизведение

```bash
cd /home/hermes/projects/converter/Portfolio-Pulse
python tools/verify_ui_fixes_v38.py
node --check assets/app-v38.js
node --check assets/workforce-v38.js
npm test
```

Браузерный скрипт требует установленный Python Playwright (в данном окружении доступен) и указанный бинарник Chromium. Он запускает реальные страницы `file://`, не jsdom, последовательно проверяет оба размера, переключает RU/EN через видимые кнопки. Локальные данные каждого размера изолированы новым browser context. Изменения тестовых проектов выполняются через `PPSecretaryBridge.commit`, недельные бронирования — через `PPWorkforceCore.saveBooking` и отдельный локальный журнал браузера. После тестов контексты закрываются. Репозиторные данные не меняются. Для Workforce Playwright проходит открытые shadow roots; чтение текста использует `element.shadowRoot`, исключая стили.

Скрипт также исполняет именно эти команды (реальные коды выхода 0):

```bash
/home/hermes/.hermes/tools/chromium-1208/chrome-linux64/chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=15000 --window-size=1440,1000 --dump-dom file:///home/hermes/projects/converter/Portfolio-Pulse/index.html
/home/hermes/.hermes/tools/chromium-1208/chrome-linux64/chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=15000 --window-size=390,844 --dump-dom file:///home/hermes/projects/converter/Portfolio-Pulse/index.html
```

Результаты всех assertions и реальные наблюдения сохранены в `tools/ui-fixes-v38-observations.json`. Снимки последнего прогона: `/tmp/ui-fixes-v38-1440.png`, `/tmp/ui-fixes-v38-390.png`, `/tmp/ui-create-v38-1440.png`, `/tmp/ui-create-v38-390.png`. Снимок мобильной формы просмотрен визуально: объяснение помещается справа от недоступной кнопки, текст переносится внутри диалога.

## 1. Загрузка относительно личной ёмкости

Место: `assets/app-v38.js`, функция `_9`, классификатор `h`, счётчики `S`/`x`, русские `availableStatus`/`partialStatus`/`fullStatus`; также `U9` — пороги оформления ресурсного радара. `assets/workforce-v38.js`, `renderResources` — список, оформление и счётчик перегруженных. Общие границы: отношение нагрузки к ёмкости >1.1 — перегрузка; >=.85 и <=1.1 — полная загрузка; <.85 — резерв. Полоса каталога также учитывает личную ёмкость.

Шаги: очистить назначения в изолированном контексте через commit; задать четырём специалистам личную ёмкость 90 и нагрузки 75.6 / 76.5 / 99 / 99.9; открыть «Персонал», раскрыть весь каталог и прочитать строки и сводку. Отдельно создать реальные недельные бронирования при ёмкости 20 ч: 16.75 / 17 / 22 / 22.25; открыть Workforce → «Ресурсы», выбрать неделю 27 июля.

Наблюдения в обоих размерах:

| Относительная загрузка каталога | Нагрузка / ёмкость | Статус |
| --- | --- | --- |
| 84% | 75.6 / 90 | Есть резерв |
| 85% | 76.5 / 90 | Полная загрузка |
| 110% | 99 / 90 | Полная загрузка |
| 111% | 99.9 / 90 | Перегрузка |

Сводка: всего 40; активны 4; резерв 37; перегрузка 1. Список содержит ровно одного перегруженного. Workforce: `17 / 20 ч — Полная загрузка`, `22 / 20 ч — Полная загрузка`, `22,3 / 20 ч — Перегрузка +2,3`; резерв — `16,8 / 20 ч — Есть резерв · 3,3`. Это отображаемое округление исходных 16.75 и 22.25. Недельный счётчик: `Перегружены — 1`.

## 2. Ввод проекта в «Моя неделя»

Место: `assets/workforce-v38.js`, `renderWeek`, обработчик `#add-entry`, текст инструкции и placeholder `#project-picker`. Поиск использует точное составное значение или точное совпадение кода/клиента без учёта регистра; допускается ровно один результат. При нескольких совпадениях выводятся все варианты; строка не добавляется. Технические ID проектов сохраняются.

Шаги: Workforce → «Моя неделя»; последовательно ввести полное значение, `PP-001`, `Aster Energy`, нажать «+ Проект». Затем через commit присвоить второму проекту того же клиента и повторить ввод клиента.

Наблюдения в обоих размерах: счётчик строк 0→1→2→3, каждый добавленный `projectId=project-1`. При неоднозначности осталось 3 строки; текст: `Найдено несколько проектов. Выберите: PP-001 · Aster Energy · Reserves evaluation; PP-002 · Aster Energy · Reserves evaluation`. Инструкция: `Введите точный код, однозначного клиента или выберите полное значение из списка. Для каждого типа работы добавьте отдельную строку.` Placeholder: `Точный код, клиент или значение из списка`.

## 3. Русские подписи только в отображении

Место: `assets/app-v38.js`, русская ветка словаря `Q`, helper `ppMilestoneLabel`, места вывода названий платёжных вех (обзор, маркеры/подсказки графика, заголовок редактора и карточки платежей). `assets/workforce-v38.js`: RU подписи в `renderEconomics` / `renderPersonnel` и fallback дивизиона вместо пустого офиса. Данные и технические ключи `international`, `americas`, `advisory`, названия вех в модели не заменялись. Поле редактирования названия вехи продолжает работать с исходным значением.

Шаги: обзор RU→EN→RU; Workforce «Экономика проектов» RU→EN→RU; «Персонал» RU→EN→RU, с чтением shadow roots.

| RU (наблюдалось) | EN (наблюдалось, исходные строки сохранены) |
| --- | --- |
| Международный | International |
| Америки | North America |
| Консультационный | Advisory |
| Оплачиваемые часы / стоимость | Billable h / cost |
| Доля оплачиваемых часов | Billable share |
| Техническая работа | Technical delivery |
| Финальная сдача | Final delivery |

Проверка модели в браузере: `projects[0].milestones.map(m=>m.name)` по-прежнему `['Mobilisation','Technical delivery','Final delivery']`; технические значения дивизионов по-прежнему из исходного набора. RU fallback дивизионов прочитан в таблице Personnel без офисов. Изменены конкретные точки отображения, глобального перевода DOM нет.

## 4. Динамический брифинг CEO

Место: `assets/app-v38.js`, RU `M.next14` и `brief-cash-line`: прежняя вычисленная сумма `s` выводится через `Intl.NumberFormat('ru-RU', {minimumFractionDigits:2, maximumFractionDigits:2})`, в миллионах USD. Расчёт выборки/суммы не менялся. EN использует прежний `X(s,t)`.

Шаги: прочитать обзор RU; увеличить сумму одной открытой вехи в окне 1–14 августа на 100000 USD через commit; снова прочитать строку; переключиться EN.

Наблюдалось в обоих размерах: `По срезу на 31 июля ожидаемые поступления за следующие 14 дней — $1,51 млн.` → после изменения данных `$1,61 млн.`. EN: `Expected in 14 days after July 31` и `$1.61M.`. Число не захардкожено.

## 5. Причина недоступной кнопки «Создать»

Место: `assets/app-v38.js`, `Q9`: `ppMissing`, `v`, footer формы и `#pp-create-reason`; кнопка связана с объяснением через `aria-describedby`. Перечисляются отсутствующие название, клиент, страна, дивизион, координатор, дата старта; контракт проверяется на конечное число >=1000 USD. Шаг числового поля теперь 1 USD, поэтому допустимые суммы вроде 1500 не блокируются прежним шагом 1000.

Шаги: открыть «Новый проект», не отправляя форму читать причину; заполнить название/клиента; ввести 999, 1000 и 1500; очистить дату; проверить disabled, validity и границы видимого объяснения. Форма в тесте не создаёт проект.

Наблюдалось на обоих размерах: `Для создания заполните: Название проекта, Клиент.`; при 999 — `Для создания заполните: Контракт ≥ 1000 USD.` и disabled=true; при 1000 disabled=false; при 1500 disabled=false и validity.valid=true; без даты — `Для создания заполните: Дата начала.` и disabled=true. Объяснение видно внутри viewport после прокрутки формы, рядом с кнопкой.

## 6. Доступное имя выбора рабочей роли

Место: `assets/app-v38.js`, верхний `.role-control select`. Добавлен локализованный `aria-label`.

Шаги: обзор RU→EN→RU, чтение атрибута select.

В обоих размерах: RU `aria-label="Рабочая роль"`, EN `aria-label="Working role"`. CLI DOM также содержит русский атрибут.

## Итог проверки и ограничения

Финальный `node --check` каждого бандла: код 0. Финальный `npm test`: код 0. Браузерный проверочный скрипт: код 0, все assertions прошли в 1440×1000 и 390×844; JS page errors: [] на обоих размерах.

Это реальные DOM/атрибуты и счётчики Chromium. Проверка доступного имени ограничена атрибутом aria-label, без внешнего экранного диктора. Другие обязательные поля с непустыми значениями по умолчанию проверяются кодом, но сценарии их искусственного удаления через DevTools отдельно не прогонялись. Поле редактирования произвольного имени вехи сохраняет техническое значение; переводятся только известные отображаемые названия. API и серверные сценарии не проверялись и не входят в эти изменения.

## Точные места и контрольные суммы

В минифицированном app основной код находится на одной строке, поэтому ниже указаны функция/маркер, строка и символьное смещение (от 0) в итоговом файле.

- `assets/app-v38.js`: `ppMilestoneLabel`, строка 1, смещение 4.
- `assets/app-v38.js`: `function _9`, строка 9, смещение 490297.
- `assets/app-v38.js`: `function U9`, строка 9, смещение 487697.
- `assets/app-v38.js`: `next14:"По срезу`, строка 9, смещение 401256.
- `assets/app-v38.js`: `pp-create-reason`, строка 9, смещение 536016.
- `assets/app-v38.js`: `"Рабочая роль"`, строка 32, смещение 561013.
- `assets/workforce-v38.js`: `$('#add-entry').onclick`, строка 50, смещение 33039.
- `assets/workforce-v38.js`: `function renderResources`, строка 67, смещение 52939.
- `assets/workforce-v38.js`: `Оплачиваемые часы / стоимость`, строка 74, смещение 60632.
- `assets/workforce-v38.js`: `Доля оплачиваемых часов`, строка 60, смещение 41315.

SHA-256 на момент финального прогона:

- `assets/app-v38.backup.js`: `bd58ebf4d3a7dfc5bd2f72166d4f16be5def8662cdcf15889ea416b30e9ffcfe`
- `assets/workforce-v38.backup.js`: `42ce1c561c61a50654ee119d23df2dffd18b5a1b441c388888225de3b415218d`
- `assets/app-v38.js`: `26aa8d09b0ad84f76fc70b6e2d9323b0a0c1ed94e17c47994b95d40f6ca60da1`
- `assets/workforce-v38.js`: `03127eb7c877063717f829ab34ad5eeb58a4a6c77fd4cf8a6e5c30ea5a02b194`

## Полный журнал наблюдений

### CLI 1440,1000

```text
{
  "exit": 0,
  "DOM_bytes": 340459,
  "role_label": true
}
```

### CLI 390,844

```text
{
  "exit": 0,
  "DOM_bytes": 340459,
  "role_label": true
}
```

### 1440 RU CEO / milestones

```text
По срезу на 31 июля ожидаемые поступления за следующие 14 дней —
$1,51 млн.
```

### 1440 CEO +100000 USD

```text
По срезу на 31 июля ожидаемые поступления за следующие 14 дней —
$1,61 млн.
```

### 1440 EN

```text
{
  "brief": "Expected in 14 days after July 31\n$1.61M.",
  "select": "Working role"
}
```

### 1440 missing fields

```text
Для создания заполните: Название проекта, Клиент.
```

### 1440 reason visible

```text
{
  "x": 645.96875,
  "y": 797.5,
  "width": 335.03125,
  "height": 45
}
```

### 1440 contract 999

```text
Для создания заполните: Контракт ≥ 1000 USD.
```

### 1440 contract 1000

```text
{
  "disabled": false
}
```

### 1440 contract 1500

```text
{
  "disabled": false,
  "valid": true
}
```

### 1440 missing date

```text
Для создания заполните: Дата начала.
```

### 1440 add PP-001 · Aster Energy · Reserves evaluation

```text
{
  "rows_before": 0,
  "rows_after": 1,
  "projectId": "project-1"
}
```

### 1440 add PP-001

```text
{
  "rows_before": 1,
  "rows_after": 2,
  "projectId": "project-1"
}
```

### 1440 add Aster Energy

```text
{
  "rows_before": 2,
  "rows_after": 3,
  "projectId": "project-1"
}
```

### 1440 ambiguous

```text
Найдено несколько проектов. Выберите: PP-001 · Aster Energy · Reserves evaluation; PP-002 · Aster Energy · Reserves evaluation
```

### 1440 economics RU

```text
Доля оплачиваемых часов
```

### 1440 economics EN

```text
Billable share
```

### 1440 personnel RU

```text
Оплачиваемые часы / стоимость
```

### 1440 division fallback RU

```text
[
  "Международный",
  "Америки",
  "Консультационный"
]
```

### 1440 personnel EN

```text
Billable h / cost
```

### 1440 personal capacity 84%

```text
{
  "capacity": 90,
  "load": 75.6,
  "text": "SD\nSofia D. Altrui\nИнженер · Houston\nМеждународный\nReservoir modelling\n1\n75.6%\nЕсть резерв\n14.400000000000006%"
}
```

### 1440 personal capacity 85%

```text
{
  "capacity": 90,
  "load": 76.5,
  "text": "NB\nNeha Bansal\nИнженер · London\nАмерики\nReservoir modelling\n1\n76.5%\nПолная загрузка\n13.5%"
}
```

### 1440 personal capacity 110%

```text
{
  "capacity": 90,
  "load": 99.00000000000001,
  "text": "IB\nIñaki Barrangu\nИнженер · Almaty\nКонсультационный\nReservoir modelling\n1\n99%\nПолная загрузка\n0%"
}
```

### 1440 personal capacity 111%

```text
{
  "capacity": 90,
  "load": 99.9,
  "text": "AB\nAlvaro Betancourt\nИнженер · Dubai\nМеждународный\nReservoir modelling\n1\n99.9%\nПерегрузка\n0%"
}
```

### 1440 summary

```text
[
  "ВСЕГО СПЕЦИАЛИСТОВ\n40\n9% средняя загрузка",
  "В АКТИВНЫХ ПРОЕКТАХ\n4\n10%",
  "ДОСТУПНЫ СЕЙЧАС\n37\nзагрузка < 85% личной ёмкости",
  "РИСК ПЕРЕГРУЗКИ\n1\nзагрузка > 110% личной ёмкости"
]
```

### 1440 weekly capacity Sofia D. Altrui

```text
SD
Sofia D. Altrui
Инженер · Houston
16,8 / 20 ч
Есть резерв · 3,3
Отправлено: 0 ч
План недели
Бронировать
PP-001 · 16,8 ч
```

### 1440 weekly capacity Neha Bansal

```text
NB
Neha Bansal
Инженер · London
17 / 20 ч
Полная загрузка
Отправлено: 0 ч
План недели
Бронировать
PP-001 · 17 ч
```

### 1440 weekly capacity Iñaki Barrangu

```text
IB
Iñaki Barrangu
Инженер · Almaty
22 / 20 ч
Полная загрузка
Отправлено: 0 ч
План недели
Бронировать
PP-001 · 22 ч
```

### 1440 weekly capacity Alvaro Betancourt

```text
AB
Alvaro Betancourt
Инженер · Dubai
22,3 / 20 ч
Перегрузка +2,3
Отправлено: 0 ч
План недели
Бронировать
PP-001 · 22,3 ч
```

### 1440 weekly summary

```text
Запланировано
78 ч
В выбранной неделе
Свободный ресурс
1 414,3 ч
С учётом всех проектов сотрудника
Перегружены
1
Сотрудников · видны фактические часы перегруза
Отправлено за неделю
0 ч
Отдельно от плановых бронирований
```

### 1440 JS errors

```text
[]
```

### 390 RU CEO / milestones

```text
По срезу на 31 июля ожидаемые поступления за следующие 14 дней —
$1,51 млн.
```

### 390 CEO +100000 USD

```text
По срезу на 31 июля ожидаемые поступления за следующие 14 дней —
$1,61 млн.
```

### 390 EN

```text
{
  "brief": "Expected in 14 days after July 31\n$1.61M.",
  "select": "Working role"
}
```

### 390 missing fields

```text
Для создания заполните: Название проекта, Клиент.
```

### 390 reason visible

```text
{
  "x": 209.96875,
  "y": 743.5,
  "width": 157.03125,
  "height": 67.5
}
```

### 390 contract 999

```text
Для создания заполните: Контракт ≥ 1000 USD.
```

### 390 contract 1000

```text
{
  "disabled": false
}
```

### 390 contract 1500

```text
{
  "disabled": false,
  "valid": true
}
```

### 390 missing date

```text
Для создания заполните: Дата начала.
```

### 390 add PP-001 · Aster Energy · Reserves evaluation

```text
{
  "rows_before": 0,
  "rows_after": 1,
  "projectId": "project-1"
}
```

### 390 add PP-001

```text
{
  "rows_before": 1,
  "rows_after": 2,
  "projectId": "project-1"
}
```

### 390 add Aster Energy

```text
{
  "rows_before": 2,
  "rows_after": 3,
  "projectId": "project-1"
}
```

### 390 ambiguous

```text
Найдено несколько проектов. Выберите: PP-001 · Aster Energy · Reserves evaluation; PP-002 · Aster Energy · Reserves evaluation
```

### 390 economics RU

```text
Доля оплачиваемых часов
```

### 390 economics EN

```text
Billable share
```

### 390 personnel RU

```text
Оплачиваемые часы / стоимость
```

### 390 division fallback RU

```text
[
  "Международный",
  "Америки",
  "Консультационный"
]
```

### 390 personnel EN

```text
Billable h / cost
```

### 390 personal capacity 84%

```text
{
  "capacity": 90,
  "load": 75.6,
  "text": "SD\nSofia D. Altrui\nИнженер · Houston\n75.6%\nЕсть резерв\n14.400000000000006%"
}
```

### 390 personal capacity 85%

```text
{
  "capacity": 90,
  "load": 76.5,
  "text": "NB\nNeha Bansal\nИнженер · London\n76.5%\nПолная загрузка\n13.5%"
}
```

### 390 personal capacity 110%

```text
{
  "capacity": 90,
  "load": 99.00000000000001,
  "text": "IB\nIñaki Barrangu\nИнженер · Almaty\n99%\nПолная загрузка\n0%"
}
```

### 390 personal capacity 111%

```text
{
  "capacity": 90,
  "load": 99.9,
  "text": "AB\nAlvaro Betancourt\nИнженер · Dubai\n99.9%\nПерегрузка\n0%"
}
```

### 390 summary

```text
[
  "ВСЕГО СПЕЦИАЛИСТОВ\n40\n9% средняя загрузка",
  "В АКТИВНЫХ ПРОЕКТАХ\n4\n10%",
  "ДОСТУПНЫ СЕЙЧАС\n37\nзагрузка < 85% личной ёмкости",
  "РИСК ПЕРЕГРУЗКИ\n1\nзагрузка > 110% личной ёмкости"
]
```

### 390 weekly capacity Sofia D. Altrui

```text
SD
Sofia D. Altrui
Инженер · Houston
16,8 / 20 ч
Есть резерв · 3,3
Отправлено: 0 ч
План недели
Бронировать
PP-001 · 16,8 ч
```

### 390 weekly capacity Neha Bansal

```text
NB
Neha Bansal
Инженер · London
17 / 20 ч
Полная загрузка
Отправлено: 0 ч
План недели
Бронировать
PP-001 · 17 ч
```

### 390 weekly capacity Iñaki Barrangu

```text
IB
Iñaki Barrangu
Инженер · Almaty
22 / 20 ч
Полная загрузка
Отправлено: 0 ч
План недели
Бронировать
PP-001 · 22 ч
```

### 390 weekly capacity Alvaro Betancourt

```text
AB
Alvaro Betancourt
Инженер · Dubai
22,3 / 20 ч
Перегрузка +2,3
Отправлено: 0 ч
План недели
Бронировать
PP-001 · 22,3 ч
```

### 390 weekly summary

```text
Запланировано
78 ч
В выбранной неделе
Свободный ресурс
1 414,3 ч
С учётом всех проектов сотрудника
Перегружены
1
Сотрудников · видны фактические часы перегруза
Отправлено за неделю
0 ч
Отдельно от плановых бронирований
```

### 390 JS errors

```text
[]
```

