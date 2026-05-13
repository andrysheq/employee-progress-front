# HTTP-клиент (`src/api`)

## Контракт backend

- **Успех (2xx):** тело ответа — это сразу данные (`DepartmentView`, массив, число `id` и т.д.), **без** обёртки `ApiResult`.
- **Ошибка (4xx/5xx):** тело в формате `ApiResult` с полями в **snake_case**: `meta.code`, `meta.message`, `meta.request_id`, опционально `meta.timestamp`.
- Заголовок **`X-Request-ID`**: клиент всегда отправляет UUID; при ответе сервера предпочтительно читать `X-Request-ID` из заголовка (клиент подставляет его в `ApiError`, если в `meta` нет `request_id`).
- **JSON:** имена полей в запросах и ответах — **snake_case** (как в Spring с `property-naming-strategy: SNAKE_CASE`).

## Переменные окружения

Файл `.env.example` в корне проекта.

| Переменная | Назначение |
|------------|------------|
| `VITE_API_BASE_URL` | Необязательно. Origin API без слэша в конце, например `http://localhost:8008`. Если **не задана**, запросы идут на тот же origin, что и SPA — в dev срабатывает **прокси Vite** (`/employee-progress` → backend). |
| `VITE_JWT_COMPANY_CLAIM` | Необязательно. Имя claim в JWT с числовым `company_id` (по умолчанию `company_id`, как в `users-service` `security.jwt.company-id-claim`). |
| `VITE_JWT_EMPLOYEE_CLAIM` | Необязательно. Имя claim с `employee_id` (по умолчанию `employee_id`). Используется для экрана ИПР и подсказок на «Сотрудники». |
| `VITE_DEV_COMPANY_ID` | Fallback, если в токене нет компании: числовой `id` компании в БД для dev-экранов (отделы, матрица, политики). |
| `VITE_USERS_API_BASE_URL` | Необязательно. Origin **users-service** без слэша (например `http://localhost:8001`). Если не задан, в dev запросы логина идут на тот же origin, что и SPA — **прокси Vite** пересылает префикс `/users` на порт 8001. |

## Вход (users-service)

Страница `/login` вызывает `POST {origin}/users/auth/login` с телом JSON **`{ "email", "password" }`** (camelCase). Успешный ответ: **`{ "accessToken", "tokenType" }`**. Токен сохраняется в `sessionStorage` под ключом `ep_access_token` (тот же, что читает `configureSessionStorageAccessToken` в `main.jsx`).

## Использование

```javascript
import {
  configureSessionStorageAccessToken,
  departmentsApi,
  ApiError,
} from './api/index.js'

configureSessionStorageAccessToken()

try {
  const list = await departmentsApi.fetchDepartmentsByCompany(1, true)
} catch (e) {
  if (e instanceof ApiError) {
    console.error(e.message, e.requestId, e.httpStatus)
  }
}
```

Токен для ручной проверки в dev можно положить в `sessionStorage` под ключом по умолчанию `ep_access_token`:

```javascript
sessionStorage.setItem('ep_access_token', '<JWT>')
```

Или задать свой getter:

```javascript
import { setAccessTokenGetter } from './api/index.js'

setAccessTokenGetter(() => memoryToken)
```

## Низкоуровневый вызов

```javascript
import { apiGet, apiPost } from './api/index.js'

await apiGet('/grade-model/companies/1/matrix')
await apiPost('/departments/companies/1', { code: 'rnd', name: 'R&D' })
```

Параметр запроса `onlyActive` для списка отделов передаётся в **camelCase**, как в Spring (`@RequestParam` без явного имени).

## Расширение

Новые ресурсы оформляйте модулями рядом с `departments.js`, реэкспортируйте из `index.js` при необходимости.
