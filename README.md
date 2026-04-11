# Vertila — Magic Draw

Система для фокуса с предсказанием:
- **Master Admin** генерирует 2 ссылки для каждого покупателя (фокусника):
  - ссылка **фокусника** (настройки)
  - ссылка **зрителя** (рисовалка)
- Настройки, сделанные фокусником, применяются к зрительской ссылке.

## Роуты

- `/master` — мастер-админ (чёрный фон/белые элементы), генерирует ссылки
- `/admin/:showId?key=...` — админка фокусника для конкретного шоу
- `/draw/:showId` — spectator page (телефон зрителя)

## Backend

Backend — Node/Express + Postgres.

API:
- `POST /api/master/shows` (header `Basic Auth (Authorization)`) → создаёт шоу, возвращает `{showId, adminKey}`
- `GET /api/shows/:id/config` → public-config (без текстов/картинок предсказаний)
- `GET/PUT /api/shows/:id/admin` (header `x-admin-key`) → полный конфиг для фокусника
- `POST /api/shows/:id/session` → выдаёт `sessionId`
- `POST /api/shows/:id/reveal` → выдаёт одно предсказание после `locked`

## Локальный запуск

Нужен Postgres и переменные окружения:
- `DATABASE_URL` (строка подключения Postgres)
- `MASTER_USER / MASTER_PASS` (секрет для страницы `/master`)

```bash
npm install
npm run dev
```

По умолчанию:
- frontend: `http://localhost:5173`
- backend: `http://localhost:8787`

## Деплой на Render

1) Создай Postgres в Render.
2) Создай Web Service из этого репозитория.
3) Env vars в Web Service:
- `DATABASE_URL` — из Postgres
- `MASTER_USER / MASTER_PASS` — придумай и сохрани

Команды:
- Build: `npm install && npm run build`
- Start: `npm run start`

## Как пользоваться (быстро)

1) Открой `/master`, введи `MASTER_USER / MASTER_PASS`, нажми **Generate links**.
2) Отдай фокуснику ссылку **Magician admin (private)**.
3) Фокусник на своей ссылке настроит предсказания/mapping → **Save to server**.
4) Зрителю даёшь `/draw/:showId` — там подхватятся настройки.