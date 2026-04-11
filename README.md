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

Backend — Node/Express + файловое хранилище (JSON).

Важно: **без Render Persistent Disk** данные могут сбрасываться при редеплое/рестарте.

API:
- `POST /api/master/shows` (Basic Auth) → создаёт шоу, возвращает `{showId, adminKey}`
- `GET /api/shows/:id/config` → public-config (без текстов/картинок предсказаний)
- `GET/PUT /api/shows/:id/admin` (header `x-admin-key`) → полный конфиг для фокусника
- `POST /api/shows/:id/session` → выдаёт `sessionId`
- `POST /api/shows/:id/reveal` → выдаёт одно предсказание после `locked`

## Локальный запуск

```bash
npm install
npm run dev
```

По умолчанию:
- frontend: `http://localhost:5173`
- backend: `http://localhost:8787`

Env vars (опционально):
- `MASTER_USER` (по умолчанию `master`)
- `MASTER_PASS` (по умолчанию `master123`)
- `STORE_PATH` (например `./data/store.json`)

## Деплой на Render (один Web Service)

1) New → **Web Service** → подключи репозиторий.
2) Build: `npm install && npm run build`
3) Start: `npm run start`
4) Env vars:
- `MASTER_USER`
- `MASTER_PASS`
- `STORE_PATH` = `/data/store.json`

5) Рекомендуется: добавь **Persistent Disk** и примонтируй в `/data`.

## Как пользоваться (быстро)

1) Открой `/master`, введи логин/пароль мастера, нажми **Generate links**.
2) Отдай фокуснику ссылку **Magician admin (private)**.
3) Фокусник на своей ссылке настроит предсказания/mapping → **Save to server**.
4) Зрителю даёшь `/draw/:showId` — там подхватятся настройки.