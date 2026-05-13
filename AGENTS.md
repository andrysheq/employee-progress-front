# AGENTS.md — `employee-progress-front`

## 1) Назначение

Веб-клиент (SPA) для **информационной системы карьерного развития и оценки сотрудников IT-компании**: грейдовая модель, политики ревью, индивидуальные планы развития (ИПР), циклы ревью, кадровые решения по повышению, отчёты.

Источник домена и бизнес-процессов: репозиторий backend `D:\javaprojects\employee-progress` (корневой `D:\javaprojects\employee-progress\README.md`, статус реализации `D:\javaprojects\employee-progress\BUSINESS_PROCESSES_IMPLEMENTATION_STATUS.md`).

## 2) Технологический стек (текущий)

- **Runtime/UI:** React 19, Vite 8, JSX.
- **Язык:** TypeScript можно вводить точечно; новые модули предпочтительно на TS.
- **Кодировка проекта:** UTF-8 (без BOM), в т.ч. для пользовательских строк на русском.

## 3) Связанные сервисы

| Сервис | Назначение | Локальный URL (по умолчанию из конфигов) |
|--------|------------|------------------------------------------|
| `employee-progress-service` | Основной REST API | `http://localhost:8008/employee-progress` (`D:\javaprojects\employee-progress\employee-progress-service\src\main\resources\application.yaml`) |
| `users-service` (auth) | JWT, JWKS, issuer | `http://localhost:8001/users` (см. `security.jwt.*` в `application.yaml` backend) |
| PostgreSQL | БД backend | `localhost:5436`, БД `employee_progress` (`D:\javaprojects\employee-progress\docker-compose-local-up.yml`) |
| MinIO | Преподписанные URL для вложений к задачам ИПР | `http://localhost:9000` (настройки `minio.*` в backend) |

**OpenAPI (контракт):** `GET http://localhost:8008/employee-progress/contract` (`springdoc.api-docs.path: /contract`).

Инструкции по контрактам HTTP в backend: `D:\javaprojects\employee-progress\employee-progress-service\docs\api-contract-guidelines.md`.

## 4) Правила HTTP/API для фронта

1. **Базовый path:** все методы `employee-progress-service` идут под префиксом контекста `/employee-progress` (не забывать при сборке `fetch`/`axios` base URL).
2. **JSON:** поля в **snake_case** (Jackson `SNAKE_CASE` на сервере). Во фронте типы и парсинг должны ожидать snake_case или единый слой нормализации в camelCase — главное **не смешивать** без явного решения.
3. **Корреляция:** заголовок `X-Request-ID`. Если клиент отправил UUID — сервер пробрасывает его в ответ; если нет — генерирует. Имеет смысл всегда слать свой UUID с UI для трассировки.
4. **Ошибки:** пользовательские тексты с backend — на **русском**; при отображении не «переводить» ключи, а показывать текст из ответа (структура ответа уточняется по OpenAPI/фактическим `ApiResult` в backend).
5. **Идентификация субъекта:** в backend зафиксирован ориентир OU: после полноценного security **не передавать** в теле запросов поля вида `employee_id`/`author_employee_id` для обозначения «текущего пользователя» — брать из JWT (`employee_id` claim, см. `security.jwt.employee-id-claim`). На этапе интеграции сверять актуальные правила в `D:\javaprojects\employee-progress\employee-progress-service\AGENTS.md`.
6. **Авторизация:** при `security.enabled: true` запросы к API сопровождать **Bearer JWT**, выданным auth-сервисом; audience по умолчанию `employee-progress`. Права проверяются как `hasAuthority('...')` по кодам из таблицы `auth_grant` (см. ниже).

## 5) Доменная модель (кратко для UI)

- **Компания (`company_id`):** тенант; сотрудники, должности, грейды, политики привязаны к компании.
- **Грейдовая модель:** должности → грейды → требования по компетенциям и уровням (A–E); вилка зарплат в **рублях в месяц** без отдельного поля валюты.
- **Политика повышения:** минимальный интервал между ревью (месяцы), минимум выполнения ИПР (%), веса **только** тимлида и менеджера, в сумме **100%** (веса сотрудника в политике нет — см. миграции V33 и документацию схемы).
- **ИПР (`development_plans`):** статусы `DRAFT` → согласование → `ACTIVE` → по завершении `ARCHIVED`. Задачи: типы `LEARNING`, `MINI_PROJECT`, `MEETING`, `OTHER`; статусы задач `PLANNED`, `IN_PROGRESS`, `DONE`. Прогресс и комментарии — отдельные endpoint-ы; вложения — через преподписанные URL MinIO (upload-url → загрузка → complete).
- **Оценка по задаче:** при `DONE` оценка тимлида **1–10** (`team_lead_task_score`); самооценка в прогрессе снята (V33).
- **Циклы ревью (`review_cycles`):** типы `INTERIM` / `FINAL`, статусы `SCHEDULED`, `COMPLETED`, `CANCELLED`; промежуточная оценка ПМ, итоговое ревью на повышение, кадровое решение.
- **Чувствительные данные:** поля вилки зарплаты по грейду для роли сотрудника в продуктовой спецификации **не показывать** (ограничение RBAC на API — см. `D:\javaprojects\employee-progress\employee-progress-service\docs\database-schema-reference.md`, §6).

Подробная схема сущностей: тот же файл `database-schema-reference.md`.

## 6) Основные группы REST API (относительно `/employee-progress`)

Перечень соответствует контроллерам в `employee-progress-service`. Path-параметры везде **snake_case** в URL.

| Префикс | Назначение |
|---------|------------|
| `GET/POST/PUT/PATCH/DELETE /grade-model/...` | Матрица компании, должности, грейды, компетенции, критерии грейда |
| `POST /companies/{company_id}/employees` | Создание сотрудника в компании |
| `GET /employees/{employee_id}/grade-history`, `.../current-grade`, `POST .../grades` | История и текущий грейд, назначение грейда |
| `GET/POST/PATCH/DELETE /promotion-policies/...` | Политики ревью/повышения |
| `GET/POST/PATCH/... /development-plans/...` | ИПР: CRUD плана, статус, задачи, прогресс, комментарии, вложения, строки компетенций |
| `GET/PATCH/POST /review-cycles/...` | Циклы ревью, промежуточный прогресс, итоговое ревью, решение по повышению, перенос/отмена |
| `GET /interim-review-assessments/{assessment_id}` | Деталь промежуточной оценки |
| `GET /promotion-decisions`, `GET /promotion-decisions/{decision_id}` | Кадровые решения |
| `GET /reports/...` | Отчёты: выполнение ИПР, история решений, сводка эффективности |

Точные сигнатуры и тела — в OpenAPI `/contract` и в исходниках контроллеров пакета `lrm.employeeprogressservice.controller`.

## 7) Роли и полномочия (для маршрутизации UI и запросов)

### 7.1 Роли JWT / `auth_role` (OU-стиль, title = claim в токене)

Миграции завели роли с `id` и **русским `title`** (совпадает с claim `roles` из users-service):

| id | title (пример для JWT) | Бизнес-смысл |
|----|------------------------|--------------|
| 1000 | Директор отдела | Дирекция, матрица (изменение), кадры, финальные решения |
| 1001 | Генеральный директор | Шире доступа по оргструктуре (`check_orgs`), те же гранты что у директора в ключевых областях |
| 1002 | Тимлид | ИПР, задачи в черновике, согласование статуса ИПР, оценки/апрув компетенций, часть ревью |
| 1003 | Сотрудник | Просмотр и своя активность в ИПР, прогресс, часть смены статуса задачи |

В доменной таблице `employee_roles` также встречаются коды `EMPLOYEE`, `TEAM_LEAD`, `PM`, `DIRECTOR`, `HR`, `ADMIN` — это **справочник оргролей сотрудника**, не путать с JWT-ролями OU без явного маппинга в продукте.

### 7.2 Матрица authority → кто имеет (сводка по Flyway V36–V39)

Коды authority совпадают со строками в `@PreAuthorize` на backend. Для детального списка endpoint → authority смотреть контроллеры и `D:\javaprojects\employee-progress\employee-progress-service\src\main\java\lrm\employeeprogressservice\security\OuGrantSpelExpressions.java`.

**Грейдовая модель и сотрудники компании**

- Просмотр матрицы / чтение справочников: все роли 1000–1003 (с ограничениями по данным в сервисе).
- Изменение должностей/грейдов/компетенций/критериев: **1000, 1001**.
- `MANAGE_COMPANY_EMPLOYEES`, `MANAGE_EMPLOYEE_ASSIGNED_GRADE`: **1000, 1001**.
- Чтение истории/текущего грейда: **1000–1003**.

**ИПР**

- `CREATE_DEVELOPMENT_PLAN`, черновик задач, обновление плана и смена статуса плана, удаление вложений, апрув компетенций тимлидом: **1002**.
- Чтение планов/задач/вложений/истории прогресса/компетенций: **1000–1003** (где выдан грант).
- `UPDATE_DEVELOPMENT_PLAN_TASK_STATUS`, `RECORD_DEVELOPMENT_PLAN_TASK_PROGRESS`: **1002, 1003** (бизнес-инварианты «кто может закрыть задачу с оценкой» — в сервисе; UI должен не предлагать недоступные действия по 403).
- Загрузка вложений (upload-url + complete): все **1000–1003**.

**Политики и отчёты**

- Чтение политик: все; **управление** политиками: **1000, 1001**.
- Отчёт выполнения ИПР и эффективности: **1000, 1001, 1002**; история кадровых решений: **1000, 1001**.
- Чтение `promotion-decisions`: **1000, 1001**.

**Циклы ревью**

- Детали цикла, промежуточная информация, финальные ревью (чтение): **1000–1003** (где выдано).
- Список циклов с фильтрами: **1000, 1001, 1002**.
- Корректировка промежуточного прогресса: **1000, 1001, 1002**.
- Назначение итогового ревью, кадровое решение, отмена цикла: **1000, 1001**.
- Перенос цикла: **1000, 1001, 1002**.

На UI: хранить список authority из token introspection / распарсенных `roles` + маппинг grant (если токен отдаёт scopes/authorities — сверить с фактической выдачей users-service) и **скрывать** недоступные кнопки; 403 обрабатывать как «нет права», а не как баг сети.

## 8) Локальный запуск фронта

```bash
cd D:\reactprojects\employee-progress-front
npm install
npm run dev
```

Прокси на API в Vite пока не настроен — при необходимости добавить `server.proxy` на `http://localhost:8008` с path `/employee-progress`, либо выносить base URL в `import.meta.env.VITE_API_BASE_URL`.

## 9) Стандарты разработки UI (рекомендации)

- **Язык интерфейса:** русский, в терминах домена из README backend (ИПР, грейд, ревью, политика).
- **Доступность:** подписи к полям форм политик и ИПР, явные статусы и даты периода.
- **Состояния:** загрузка, пустые списки, ошибки API (текст с сервера + `request_id` для поддержки).
- **Согласованность с backend:** не дублировать бизнес-валидацию «всерьёз» на клиенте — только UX; источник правды — ответы API.

## 10) Связанные документы backend (читать при смене контракта)

- `D:\javaprojects\employee-progress\employee-progress-service\AGENTS.md`
- `D:\javaprojects\employee-progress\employee-progress-service\docs\api-contract-guidelines.md`
- `D:\javaprojects\employee-progress\employee-progress-service\docs\database-schema-reference.md`
- `D:\javaprojects\employee-progress\BUSINESS_PROCESSES_IMPLEMENTATION_STATUS.md`

---

*Документ создан как стартовая точка для разработки интерфейса; при расхождении с кодом backend приоритет у актуального OpenAPI и Java-контроллеров.*
