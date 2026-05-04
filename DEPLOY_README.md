# Развёртывание на Reg.ru (автономный билд)

## Зависимости от poehali.dev — что было сделано

Все зависимости от poehali.dev удалены:

| Что было | Что стало |
|----------|-----------|
| AI-прокси `functions.poehali.dev/lumen-proxy` | Прямые вызовы `api.proxyapi.ru` из браузера |
| Скрипты `cdn.poehali.dev/intertnal/js/*.js` | Удалены полностью |
| Мета-теги `poehali.dev` в `index.html` | Удалены |
| Плагин `pp-tagger` | Удалён из `vite.config.ts` и `package.json` |
| CDN-картинки `cdn.poehali.dev` | Заменены на Unsplash (бесплатно) |
| Генерация картинок `functions.poehali.dev/generate-image` | Перенесено на `pollinations.ai` (бесплатно) |
| GitHub-прокси `functions.poehali.dev/github-download` | Прямые вызовы GitHub API |
| URL авторизации `AUTH_URL` (hardcoded) | Берётся из `.env` → `VITE_AUTH_URL` |

---

## Настройка перед сборкой

### 1. Создайте файл `.env` (или отредактируйте существующий)

```env
# API для OpenAI-моделей (proxyapi.ru принимает рублёвые карты)
VITE_DEFAULT_OPENAI_BASE=https://api.proxyapi.ru/openai

# API для Claude-моделей
VITE_DEFAULT_CLAUDE_BASE=https://api.proxyapi.ru/anthropic

# URL вашего бэкенда авторизации (если есть)
# Если оставить пустым — авторизация не работает, всё остальное работает
VITE_AUTH_URL=

# URL сервиса генерации картинок (если есть свой)
# Если пустой — используется pollinations.ai автоматически
VITE_IMAGE_GENERATE_URL=
```

> **Важно:** API-ключ пользователь вводит сам в настройках приложения (хранится в браузере).
> Не нужно прописывать его в `.env`.

---

## Сборка

```bash
# 1. Установить зависимости
npm install

# 2. Собрать билд для продакшена
npm run build
```

После этого появится папка `dist/` — её и нужно загрузить на хостинг.

---

## Загрузка на Reg.ru

1. Заархивируйте содержимое папки `dist/` (не саму папку, а её содержимое)
2. Зайдите в панель управления Reg.ru → Файловый менеджер
3. Перейдите в `public_html/` (или нужную папку сайта)
4. Загрузите архив и распакуйте
5. Убедитесь, что файл `.htaccess` присутствует (он уже в папке `public/` и попадает в билд)

### Содержимое `.htaccess` (уже есть в `public/`)

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]
```

Это нужно для SPA-маршрутизации (чтобы обновление страницы не давало 404).

---

## Проверка после деплоя

- Откройте сайт — он должен работать без ошибок в консоли
- Зайдите в Настройки (шестерёнка) → AI → введите API-ключ proxyapi.ru
- Попробуйте создать сайт — ИИ должен ответить напрямую через proxyapi.ru
