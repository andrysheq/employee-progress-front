# План работ по фронтенду (этапы)

Состояние на момент появления скелета SPA: см. коммиты в `employee-progress-front`. Документ обновлять по мере закрытия этапов.

## Закрыто

- **Этап 0 — документация:** `AGENTS.md`, `docs/ui-roles.md`, `docs/ui-style-reference.md`, `docs/sequences-departments.md`, скриншоты в `docs/ui-screenshots/`.
- **Этап 1 — скелет приложения:** `react-router-dom`, `AppShell` (шапка, футер, контент), маршруты по зонам продукта, заглушки страниц, глобальные стили и токены (`src/styles/`), прокси Vite на `/employee-progress` → `http://localhost:8008`.
- **Этап 2 — конфигурация API:** модуль `src/api` (`client.js`, токен, ошибки, `departments.js`), `VITE_API_BASE_URL`, `docs/api-client.md`.
- **Этап 4 (часть) — отделы:** страница «Отделы» запрашивает список при наличии `company_id` в JWT (claim настраивается через `VITE_JWT_COMPANY_CLAIM`) или при fallback `VITE_DEV_COMPANY_ID`; токен из `sessionStorage` (`ep_access_token`) подключается в `main.jsx`.
- **Контекст компании / сотрудника:** `src/config/companyContext.js` — приоритет JWT, затем `VITE_DEV_COMPANY_ID`; для ИПР — `employee_id` из JWT (`VITE_JWT_EMPLOYEE_CLAIM`).
- **Зоны с данными по API:** «Матрица грейдов» (`GET /grade-model/companies/{id}/matrix`), «Политики» (`GET /promotion-policies/companies/{id}`), «ИПР» — список планов по `GET /development-plans/employees/{employee_id}` при наличии claim в токене. «Сотрудники» — пояснение по текущему контракту API без общего list GET.
- **Вход:** страница `/login` — `POST /users/auth/login`, токен в `sessionStorage`; прокси Vite `/users` → `localhost:8001`; фильтр верхнего меню по claim `roles` (эвристика `src/auth/roleNav.js`).

## В работе / следующие

- **Этап 3 — аутентификация:** обновление токена, полноценный профиль, скрытие маршрутов по authority с сервера (сейчас — только меню по ролям из JWT).
- **Этап 4 (остаток) — отделы:** формы создания/редактирования и назначение директора (роль ген. директора).
- **Этап 5 — сотрудники:** список с фильтром по отделу (нужен согласованный read-эндпоинт или BFF), карточка, перевод в другой отдел, создание сотрудника (если доступен Kafka в среде).
- **Этап 6 — ИПР:** деталь плана, задачи, прогресс, вложения (presigned URL); список по сотруднику уже подключён при `employee_id` в JWT.
- **Этап 7 — ревью и решения:** списки и формы по контракту OpenAPI.
- **Этап 8 — отчёты:** три отчёта с параметрами периода/фильтров.
- **Этап 9 — полировка UX:** панель фильтров в стиле референса, сетки карточек, состояния загрузки и пустых списков, доступность.

## Примечания

- Источник правды по полям и enum — OpenAPI `http://localhost:8008/employee-progress/contract` при поднятом backend.
- Локально без backend UI открывается; запросы к API идут через прокси Vite на порт 8008.
