# AI BUILDER — Telegram Mini App для практического курса

Production-ready платформа из пяти практических уроков на Next.js App Router, Supabase и Telegram Mini Apps. Ученик получает доступ, проходит урок, сохраняет черновик, прикладывает файлы и отправляет работу. Следующий урок открывается по правилу урока. Администратор управляет учениками, контентом, проверками и настройками.

## Что входит

- безопасный вход через проверенный на сервере `Telegram.WebApp.initData`;
- подписанная сессия в `Secure HttpOnly` cookie;
- роли `student`, `admin` и подготовленная роль `mentor`;
- курс, уроки, структурированные блоки, промпты и материалы из PostgreSQL;
- четыре правила открытия: `after_submission`, `after_approval`, `manual`, `none`;
- черновики, повторные попытки, комментарии и история заданий;
- приватные файлы в Supabase Storage и временные signed URL;
- админ-панель: метрики, ученики, проверка, редактор курса и настройки;
- Telegram-уведомления с idempotency-защитой;
- RLS, server-only service role, rate limiting и Zod-валидация;
- собственные MVP-события аналитики;
- адаптивный Telegram-friendly интерфейс;
- конфигурация Netlify, миграции, development seed и тесты.

## Требования

- Node.js 22 LTS;
- npm 10+;
- проект Supabase;
- Telegram-бот;
- аккаунт Netlify для публикации;
- для полностью локального Supabase: Docker и Supabase CLI.

## Быстрый локальный запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Откройте `http://localhost:3000`. Пока Supabase не настроен, приложение покажет безопасный экран первого запуска вместо выдуманных данных.

## 1. Создание Supabase-проекта

1. Создайте проект в Supabase Dashboard.
2. В **Project Settings → API** скопируйте:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`;
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`.
3. Никогда не добавляйте `SUPABASE_SERVICE_ROLE_KEY` в переменную с префиксом `NEXT_PUBLIC_`.

### Применение миграций через CLI

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Миграции находятся в `supabase/migrations` и создают схему, индексы, функции, RLS, приватные Storage buckets и политики. Альтернативно SQL-файлы можно выполнить по порядку в Supabase SQL Editor.

### Локальный Supabase и seed

```bash
npx supabase start
npx supabase db reset
```

`supabase/seed.sql` предназначен только для development. Он добавляет курс, пять уроков, примеры блоков и три тестовых профиля:

- ученик: Telegram ID `100000001`;
- администратор: Telegram ID `100000002`;
- ученик без доступа: Telegram ID `100000003`.

Не запускайте seed в production. Он не входит ни в build, ни в deploy-команды, а `NEXT_PUBLIC_DEV_MODE` принудительно выключен для production-контекста Netlify. Тестовый набор определяется фиксированными UUID из `seed.sql` и `enrollments.access_source = 'development_seed'`; это позволяет удалить только связанные тестовые строки после отдельного подтверждения, не затрагивая курс и реальные профили.

## 2. Storage

Первая миграция безопасности автоматически создаёт приватные buckets:

- `submission-files`;
- `course-materials`;
- `course-images`.

Файлы заданий сохраняются по шаблону:

```text
submissions/{telegramUserId}/{lessonId}/{submissionId}/{uuid}-{safeFileName}
```

Загрузка идёт только через защищённый server endpoint. MIME type и размер проверяются до загрузки. Для чтения сервер выдаёт signed URL на 15 минут. Значение по умолчанию — 25 МБ; его можно изменить в админке, а лимит bucket при необходимости синхронно обновить в Supabase.

## 3. Переменные окружения

Создайте `.env.local` на основе `.env.example`:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=123456:replace-me
TELEGRAM_BOT_USERNAME=your_bot
TELEGRAM_WEBHOOK_SECRET=replace-with-a-random-webhook-secret
SESSION_SECRET=replace-with-at-least-32-random-characters
ADMIN_TELEGRAM_IDS=100000002
NEXT_PUBLIC_DEV_MODE=true
PAYMENT_WEBHOOK_SECRET=replace-when-payment-is-connected
```

Сгенерировать независимые секреты для сессии и webhook:

```bash
openssl rand -base64 48
openssl rand -hex 32
```

Второй результат запишите в `TELEGRAM_WEBHOOK_SECRET`. Допустимы только латинские буквы, цифры, `_` и `-`; значение должно содержать 16–256 символов. Не используйте одинаковое значение для `SESSION_SECRET` и webhook.

`NEXT_PUBLIC_DEV_MODE=true` работает только при `NODE_ENV !== production`. В production endpoint тестового входа возвращает 404, даже если переменная была ошибочно включена. В `netlify.toml` production-значение дополнительно зафиксировано как `false`.

## 4. Создание Telegram-бота

1. Откройте [@BotFather](https://t.me/BotFather).
2. Отправьте `/newbot`, задайте название и username.
3. Скопируйте токен в `TELEGRAM_BOT_TOKEN`.
4. После первого production-деплоя откройте `/mybots`, выберите бота → **Bot Settings → Configure Mini App** и включите Mini App с canonical HTTPS URL приложения.
5. Команды и кнопка меню будут установлены серверным скриптом из раздела «Production-проверка Telegram». При желании проверьте их в **Edit Commands** и **Menu Button**.

Бот должен открывать именно production HTTPS URL. Для локального тестирования внутри Telegram используйте временный HTTPS tunnel и временно задайте его URL в `NEXT_PUBLIC_APP_URL` и BotFather.

### Как работает авторизация

1. Клиент получает только `Telegram.WebApp.initData` и отправляет строку на сервер.
2. Сервер строит `data_check_string`, вычисляет HMAC-SHA256 по алгоритму Telegram и сравнивает hash через constant-time comparison.
3. `auth_date` старше 24 часов отклоняется.
4. Только после проверки сервер создаёт или обновляет `profiles`.
5. Роль сверяется с `ADMIN_TELEGRAM_IDS`, а состояние блокировки — с базой.
6. Сервер выдаёт подписанную cookie-сессию на семь дней.

`initDataUnsafe` не используется как подтверждение личности. Каждый чувствительный endpoint повторно проверяет сессию, актуальную роль и блокировку в базе.

### Команды и webhook бота

- `/start` — приветствие и inline-кнопка `Открыть курс`;
- `/course` — inline-кнопка `Продолжить обучение`;
- `/support` — контакт из настройки `support`, которую можно изменить в админке;
- `POST /api/telegram/webhook` — endpoint Telegram Bot API.

Webhook принимает обновление только при точном совпадении заголовка `X-Telegram-Bot-Api-Secret-Token` с `TELEGRAM_WEBHOOK_SECRET`. Токен бота и webhook secret читаются только серверным кодом; ни одна из этих переменных не должна начинаться с `NEXT_PUBLIC_`.

Скрипт установки также регистрирует команды и кнопку меню Mini App:

```bash
npm run telegram:webhook:set
npm run telegram:webhook:info
```

Он использует `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` и `NEXT_PUBLIC_APP_URL` из `.env.local`. URL обязан быть production HTTPS URL, не localhost. Для удаления webhook доступна команда `npm run telegram:webhook:delete`.

## 5. Первый администратор

1. Узнайте свой numeric Telegram ID.
2. Добавьте его в `ADMIN_TELEGRAM_IDS`. Несколько ID разделяются запятыми без пробелов.
3. Перезапустите приложение и откройте Mini App своим аккаунтом.
4. Сервер создаст профиль с ролью `admin` или обновит существующий профиль.
5. Следующих администраторов можно назначить на странице конкретного ученика. Не удаляйте последний рабочий ID из окружения до проверки второго администратора.

## 6. Режим разработки

После применения development seed установите:

```dotenv
NEXT_PUBLIC_DEV_MODE=true
```

На входе появятся три тестовых профиля: ученик, администратор и пользователь без доступа. Все действия используют настоящую development-базу и server endpoints; статическая подмена CRUD не используется.

Команды:

```bash
npm run dev        # Next.js dev server
npm run typecheck  # строгая проверка TypeScript
npm run lint       # ESLint
npm test           # Vitest
npm run build      # production build
```

Для проверки Netlify runtime и переменных окружения можно использовать `npx netlify dev`.

## 7. Логика открытия уроков

- первый опубликованный урок создаётся со статусом `available` при выдаче доступа;
- `after_submission` завершает текущий урок и открывает следующий в одной PostgreSQL-функции;
- `after_approval` оставляет следующий урок закрытым до действия администратора;
- `manual` открывается только из админ-панели;
- `none` завершает курс после финальной отправки;
- прямой URL заблокированного урока возвращает 404 после server-side проверки.

Транзакционные функции `save_submission`, `review_submission`, `grant_course_access`, `unlock_next_lesson`, `reorder_lessons` и `reorder_lesson_blocks` не доступны ролям `anon` и `authenticated`; их вызывает только сервер через service role.

## 8. Домашние задания

Ученик может сохранить черновик, добавить ссылку, загрузить файлы с прогрессом и отправить работу. Текст также восстанавливается из localStorage при сворачивании Telegram или сетевой ошибке. После возврата на доработку создаётся новая попытка, а предыдущая остаётся в истории.

Сервер не принимает пустую работу: нужен текст, ссылка или хотя бы один файл. Повторный клик безопасно обрабатывается через статус черновика и уникальный номер попытки.

## 9. Админ-панель

- `/admin` — реальные метрики и последние действия;
- `/admin/students` — поиск, фильтры, выдача/отзыв доступа и блокировка;
- `/admin/students/[id]` — история, роли и ручной доступ к урокам;
- `/admin/submissions` — очередь, комментарии, приём и доработка;
- `/admin/course` — название курса, настройки уроков, видео и блоки;
- `/admin/settings` — бренд, поддержка, загрузки и уведомления.

При возврате работы комментарий обязателен. При принятии `after_approval` следующий урок открывается внутри той же транзакции.

Администратор может нажать **«Посмотреть как ученик»**. Сервер сохраняет в подписанной HttpOnly-сессии отдельный временный preview-флаг, не меняя Telegram ID и роль в `profiles`. В preview админ-маршруты и любые изменяющие API закрыты, задания доступны только для чтения, а кнопка **«В админку»** возвращает обычный режим. Новый Telegram-вход создаёт сессию без preview-флага.

## 10. Telegram-уведомления

Уведомления создаются для выдачи доступа, отправки, открытия урока, принятия, доработки и завершения. Команды webhook и уведомления используют один серверный Telegram Bot API client и один `TELEGRAM_BOT_TOKEN`. Таблица `notifications_log` имеет уникальный `idempotency_key`: повторная обработка того же события не отправляет сообщение второй раз. Ошибка Telegram Bot API сохраняется без утечки токена.

Каждое сообщение содержит inline-кнопку `web_app` с `NEXT_PUBLIC_APP_URL`. Уведомления можно отключить в настройках администратора.

## 11. Безопасность и RLS

- RLS включён для всех прикладных таблиц;
- authenticated JWT с Telegram claim может читать только собственный профиль, enrollment, прогресс, задания, файлы и видимые комментарии;
- direct insert/update/delete для `anon` и `authenticated` отозваны;
- ученик не может изменить роль, выдать доступ или одобрить работу;
- Storage private, service key server-only;
- Telegram bot token, webhook secret и session secret доступны только server-only модулям;
- Telegram webhook проверяет secret header до разбора payload;
- вход, отправки и загрузки ограничены database-backed rate limit;
- пользовательский HTML не рендерится;
- все входящие payload проверяются Zod;
- критичные действия пишутся в `audit_log`.

Текущая архитектура использует Telegram-сессию приложения и server endpoints. RLS остаётся второй линией защиты и готов к выдаче Supabase JWT с `telegram_user_id` claim, если это понадобится в будущем.

## 12. События аналитики

Таблица `analytics_events` принимает только разрешённые события: открытие приложения/урока, копирование промпта, начало задания, сохранение, отправка, повторная отправка, доработка и завершение. Внешний платный сервис не подключён.

## 13. Деплой на Netlify

Рекомендуемый вариант — Git-based deploy:

1. Создайте Git-репозиторий и отправьте проект в GitHub/GitLab.
2. Выполните `npx netlify login`, затем `npx netlify init` или импортируйте репозиторий в Netlify UI.
3. Netlify автоматически определит Next.js и применит `@netlify/next`; вручную устанавливать адаптер не нужно.
4. Build command и publish directory уже заданы в `netlify.toml`: `npm run build` и `.next`.
5. В **Site configuration → Environment variables** добавьте все значения из `.env.example`.
6. Секреты задавайте как sensitive values. Через CLI:

```bash
npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "..." --secret
npx netlify env:set TELEGRAM_BOT_TOKEN "..." --secret
npx netlify env:set TELEGRAM_WEBHOOK_SECRET "..." --secret
npx netlify env:set SESSION_SECRET "..." --secret
npx netlify env:set NEXT_PUBLIC_DEV_MODE "false" --context production
```

7. Выполните `npx netlify build` для локальной проверки Netlify-окружения.
8. Push в production branch создаст production deploy; pull request получит отдельный Deploy Preview.
9. После публикации обновите `NEXT_PUBLIC_APP_URL` на canonical HTTPS URL, повторно задеплойте и только после этого установите webhook.

Не добавляйте секреты в `netlify.toml`: файл находится в репозитории.

## 14. Production-проверка Telegram

После деплоя:

1. Убедитесь, что `NEXT_PUBLIC_DEV_MODE=false`.
2. Убедитесь, что `NEXT_PUBLIC_APP_URL` равен финальному HTTPS URL и все серверные секреты заданы в production context Netlify.
3. Установите webhook из локальной копии с заполненным `.env.local`: `npm run telegram:webhook:set`. Для linked Netlify site можно вместо локальных секретов выполнить `npx netlify dev:exec npm run telegram:webhook:set`.
4. Проверьте регистрацию: `npm run telegram:webhook:info`. Ожидаемый URL — `https://ВАШ-ДОМЕН/api/telegram/webhook`, без `last_error_message`.
5. В BotFather откройте `/mybots` → выберите бота → **Bot Settings → Configure Mini App**, включите Mini App и задайте тот же production URL. Скрипт уже устанавливает команды и Menu Button через Bot API.
6. Если хотите задать команды вручную через `/setcommands`, используйте:

   ```text
   start - Начать работу с курсом
   course - Продолжить обучение
   support - Связаться с поддержкой
   ```

7. Откройте личный чат с ботом и по очереди проверьте `/start`, `/course`, `/support`; обе кнопки курса должны открыть Mini App.
8. Проверьте появление/обновление профиля в `profiles`, поле `last_seen_at` и роль. В production cookie `ai_builder_session` должна иметь флаги HttpOnly, Secure, SameSite=None и Partitioned для работы внутри Telegram Web iframe; её значение недоступно JavaScript.
9. Попытка открыть Mini App URL в обычном production-браузере должна показать вход через Telegram без dev-кнопок.
10. Проверьте вход без enrollment, выдайте доступ из админки, отправьте и проверьте задание, затем завершите курс. Уведомления должны прийти из того же бота; результаты и ошибки фиксируются в `notifications_log`.
11. При проблемах проверьте Function logs в Netlify и `npm run telegram:webhook:info`; токен и secret не копируйте в логи или сообщения.

## 15. Возможные ошибки

- **«Подключите Supabase»** — отсутствует одна из трёх Supabase-переменных.
- **«Сначала примените development seed»** — DEV_MODE включён, но seed-профили не созданы.
- **Telegram initData устарел** — полностью закройте и снова откройте Mini App.
- **Подпись не прошла проверку** — BotFather и `TELEGRAM_BOT_TOKEN` относятся к разным ботам.
- **Файл не загружается** — проверьте bucket, размер, MIME type и service role key.
- **Бот не отправляет сообщение** — пользователь должен хотя бы раз открыть личный чат с ботом; смотрите `notifications_log`.
- **Webhook не получает команды** — проверьте production HTTPS URL, `TELEGRAM_WEBHOOK_SECRET` и результат `npm run telegram:webhook:info`.
- **Build не видит переменные** — добавьте их для нужного Netlify deploy context и повторите deploy.

## 16. Резервное копирование

На платном Supabase включите Point-in-Time Recovery или ежедневные backups. Для дополнительной ручной копии используйте connection string из Database Settings:

```bash
pg_dump --format=custom --no-owner "$DATABASE_URL" > ai-builder-$(date +%F).dump
```

Периодически тестируйте восстановление в отдельный staging-проект. Storage-файлы резервируйте отдельно: dump PostgreSQL не содержит сами объекты bucket.

## 17. Обновление контента

Откройте `/admin/course`. Можно менять название и описание курса, видео, результат, задание, правило открытия, публикацию и порядок уроков. Редактор поддерживает `heading`, `paragraph`, `callout`, `checklist`, `prompt`, `image`, `video`, `file` и `divider`; порядок блоков меняется кнопками вверх/вниз.

Не меняйте unlock rule уже активного урока без проверки текущих `lesson_progress`: новое правило влияет на будущие события, но не должно автоматически отзывать ранее выданный доступ.

## 18. Будущая оплата

Полноценная оплата намеренно не реализована. В `enrollments` уже есть `access_source`, `external_payment_id` и `plan`, а `/api/payments/webhook` возвращает `501`, пока не подключён конкретный провайдер.

Перед включением оплаты:

1. выберите провайдера и реализуйте его официальный алгоритм проверки подписи;
2. проверяйте сумму, валюту, статус и merchant account на сервере;
3. храните provider event ID с уникальным ограничением;
4. вызывайте `grant_course_access` только после подтверждённого события;
5. добавьте обработку refund/chargeback и тесты sandbox webhooks;
6. только после этого показывайте кнопку оплаты.

Автоматический сертификат также не входит в первую версию; завершённый enrollment и итоговый экран уже дают точку расширения для будущей генерации.

## Таблицы

`profiles`, `courses`, `lessons`, `lesson_blocks`, `enrollments`, `lesson_progress`, `submissions`, `submission_files`, `submission_comments`, `notifications_log`, `app_settings`, `analytics_events`, `rate_limits`, `audit_log`.

## Проверка перед релизом

```bash
npm run typecheck
npm run lint
npm test
npm audit
npm run build
```

Production build не требует `output: "standalone"`: Netlify Next.js runtime самостоятельно преобразует App Router, Route Handlers и server rendering в нужные функции.
