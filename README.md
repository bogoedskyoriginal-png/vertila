# Vertila — Magic Draw

## Идея

Есть мастер-админка, которая генерирует 5-символьный код шоу (например `TY1QZ`).

Дальше получаются две короткие ссылки:
- зритель: `https://domain/TY1QZ`
- фокусник: `https://domain/TY1QZ/admin`

Если код не создан через Master Admin — по нему ничего не откроется.

## Роуты

- `/master` — мастер-админ (генерация кодов)
- `/:code` — spectator page
- `/:code/admin` — magician admin

## Backend

Backend — Node/Express + файловое хранилище (JSON).

Важно: **без Render Persistent Disk** данные могут сбрасываться при редеплое/рестарте.

API:
- `POST /api/master/shows` (Basic Auth) → создаёт шоу, возвращает `{showCode, adminKey}`
- `GET /api/shows/:code/config` → public-config (без текстов/картинок предсказаний)
- `GET/PUT /api/shows/:code/admin` (header `x-admin-key`) → полный конфиг для фокусника
- `POST /api/shows/:code/session` → выдаёт `sessionId`
- `POST /api/shows/:code/reveal` → выдаёт одно предсказание после `locked`

## Локальный запуск

```bash
npm install
npm run dev
```

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

## Использование (быстро)

1) Открой `/master`, введи логин/пароль мастера, нажми **Generate links**.
2) В Master скопируй:
   - spectator link (для телефона зрителя)
   - magician link (для фокусника)
   - admin key (фокусник введёт его один раз при входе)
3) Фокусник на `/:code/admin` настраивает → жмёт **Save to server**.
4) Зритель открывает `/:code` — настройки подхватываются.