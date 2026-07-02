# wai-pitch — полный клон pitch.com

Задача от Mik (2026-07-02): сервис презентаций — полный клон pitch.com.
Создание, редактирование и т.д. + **полная выгрузка** его контента из app.pitch.com (workspace WaiWai).

## Статус

- [ ] 0. Разведка: auth к app.pitch.com (cookies из браузера Comet/Chrome)
- [ ] 1. Выгрузка: все тимспейсы/папки/деки → JSON (внутренний API) + PDF + ассеты → `pitch-export/`
- [ ] 2. Изучение pitch.com: UI-обход + карта их API (network capture) → `docs/pitch-study.md`
- [ ] 3. Скаффолд: Next.js 16 + TS + Tailwind v4 + SQLite (Drizzle) + Zod
- [ ] 4. Дашборд: sidebar (teamspaces → папки, вложенность), grid документов с live-превью,
      создать/переименовать/дублировать/переместить/удалить, Recently deleted (trash + restore), поиск, сортировка
- [ ] 5. Редактор: слайд-лист (dnd reorder, duplicate, delete), канвас 1920×1080 transform-scale,
      блоки: text (rich), image, shape, table, embed, chart; drag/resize/rotate + snap guides;
      undo/redo; автосейв; slide style (цвет/фон); speaker notes; zoom; шорткаты
- [ ] 6. Player: present mode (fullscreen, клавиатура, #N deep links), share-ссылка /v/[token] (read-only)
- [ ] 7. Create with AI: Claude API → структурированный дек из промпта
- [ ] 8. PDF-экспорт дека (headless render)
- [ ] 9. Импорт pitch-export → наша схема
- [ ] 10. QA: Playwright-скриншоты vs оригинал, self-review, README, git push

## Решения

- Стек: Next.js 16 App Router · React 19 · TS · Tailwind v4 · Zod 4 · SQLite (better-sqlite3 + Drizzle)
  · Zustand (+zundo undo) · TipTap (rich text) · dnd-kit (reorder). Версии проверить перед установкой.
- Один воркспейс (WaiWai), без мультиюзер-логина в v1; структура данных готова к расширению.
- Стейдж: фиксированный 1920×1080, transform-scale — WYSIWYG везде (карточки, редактор, плеер).
- Файлы: uploads на диск `data/uploads/`, БД `data/wai-pitch.db`.
- Выгрузка pitch.com: авторизация через cookies реального браузера (пользователь: Comet).
  Деки pitch — публичные share-links есть у многих (см. "Links overview").

## Прогресс-лог

- 2026-07-02: старт. Папка была пустой (прототип из memory не существует). Git init.
