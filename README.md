# Kids Quest Hub Fusion

Версія для тесту після об'єднання з ідеями Robocamp / Google AI Studio, але без акаунтів, покупок і зайвої логіки.

## Що додано

- Єдиний стиль RoboCity.
- Звуковий супровід через Web Audio API: клік, успіх, помилка, старт рівня, перемога.
- Режим викладача з кімнатами, командами, балами й realtime через Supabase.
- Режим дитини по коду кімнати.
- Вибір кількості рівнів перед стартом: 5 / 10 / 15 / 20 / 30 / усі.
- 3 великі ігри по 45 рівнів кожна, разом 135 демо-рівнів.
- Інтерактивні типи рівнів:
  - robotRoute — робот їде по карті, бере вантаж, ремонтує об’єкти, фінішує;
  - robotAssembly — збірка WeDo/Spike-подібної моделі та програми;
  - desktopDrag — імітація робочого столу з перетягуванням файлів;
  - browserHunt — браузер, пошук, реклама, небезпечні посилання;
  - emailAction — фішингові листи;
  - chatAction — повідомлення в чаті;
  - aiTrainerGame — тренування ШІ на прикладах;
  - passwordBuilder — складання сильного пароля;
  - typingGame — клавіатурні спринти;
  - hardwareSort — пристрій чи програма;
  - quizBattle — тестики;
  - scratchBlocks — міні-сцена з блоками Scratch;
  - scratchScene — складання сцени гри.

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

У `.env.local` вставити:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_OR_ANON_KEY
VITE_TEACHER_PIN=0987
```

Після зміни `.env.local` обов'язково перезапустити `npm run dev`.

## Supabase

У Supabase SQL Editor запусти:

```txt
supabase/001_schema_and_seed.sql
```

Цей файл створює/оновлює таблиці, policies для тестового classroom-режиму, 3 ігри та 135 рівнів.

Якщо в тебе вже є стара база Kids Quest Hub, можна запустити:

```txt
supabase/004_fusion_levels.sql
```

Він теж містить фікс для `game_levels_type_check`, додає `rooms.level_limit` і перезаписує демо-рівні для 3 ігор.

## Важливо

RLS зараз відкритий для тесту, щоб діти могли швидко заходити без акаунтів. Для публічного запуску треба буде закрити policies під teacher token або нормальну авторизацію викладача.
