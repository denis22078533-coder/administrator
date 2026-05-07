<?php
// Язык: php
// Описание: API для прямого и безопасного управления файлами проекта на сервере.

// --- НАСТРОЙКА БЕЗОПАСНОСТИ ---
header("Access-Control-Allow-Origin: *"); // Для разработки, в продакшене лучше указать конкретный домен
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit();
}

// --- ВАЛИДАЦИЯ И АВТОРИЗАЦИЯ ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Разрешен только метод POST.']);
    exit();
}

// Тут должна быть надежная проверка токена авторизации, аналогичная той, что используется для входа в систему.
// Для примера предполагается, что фронтенд передает токен, который можно проверить.
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (empty($auth_header)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Отсутствует заголовок Authorization.']);
    exit();
}

$request_data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Неверный JSON.']);
    exit();
}

$action = $request_data['action'] ?? null;
$path = $request_data['path'] ?? null;

// --- ОБРАБОТКА ПУТИ (КЛЮЧЕВАЯ ЧАСТЬ БЕЗОПАСНОСТИ) ---
if (!$path) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Не указан путь к файлу.']);
    exit();
}

// Определяем корневую директорию проекта (на один уровень выше папки `api`).
$base_dir = realpath(__DIR__ . '/../');

// Преобразуем относительный путь от фронтенда в полный путь на сервере.
$full_path = realpath($base_dir . '/' . $path);

// ПРОВЕРКА БЕЗОПАСНОСТИ: убеждаемся, что запрашиваемый путь находится ВНУТРИ корневой директории проекта.
// Это предотвращает атаки типа "Directory Traversal" (например, чтение /etc/passwd).
if ($full_path === false || strpos($full_path, $base_dir) !== 0) {
    http_response_code(403); // Forbidden
    echo json_encode(['status' => 'error', 'message' => 'Доступ запрещен: попытка выхода за пределы рабочей директории.']);
    exit();
}

// Нормализованный путь для сообщений об успехе.
$clean_path = str_replace($base_dir . '/', '', $full_path);

// --- ВЫПОЛНЕНИЕ ДЕЙСТВИЙ ---
try {
    switch ($action) {
        case 'read':
            if (!is_readable($full_path) || is_dir($full_path)) {
                throw new Exception("Файл не найден или является директорией: " . $clean_path);
            }
            $content = file_get_contents($full_path);
            if ($content === false) {
                throw new Exception("Не удалось прочитать файл: " . $clean_path);
            }
            echo json_encode(['status' => 'success', 'path' => $clean_path, 'content' => $content]);
            break;

        case 'write':
            $content_to_write = $request_data['content'] ?? null;
            if ($content_to_write === null) {
                throw new Exception("Отсутствует содержимое для записи в файл.");
            }
            // Убедимся, что директория для файла существует.
            $dir = dirname($full_path);
            if (!is_dir($dir)) {
                if (!mkdir($dir, 0775, true)) {
                    throw new Exception("Не удалось создать директорию: " . dirname($clean_path));
                }
            }
            if (file_put_contents($full_path, $content_to_write) === false) {
                throw new Exception("Не удалось записать в файл: " . $clean_path);
            }
            
            // --- GIT PUSH ---
            $git_output = [];
            $git_status = 0;
            exec("git add . && git commit -m 'Auto-commit from file-system.php' && git push", $git_output, $git_status);
            
            if ($git_status !== 0) {
                 throw new Exception("Ошибка при выполении git push: " . implode("\n", $git_output));
            }

            echo json_encode(['status' => 'success', 'message' => 'Файл успешно записан: ' . $clean_path]);
            break;

        default:
            throw new Exception("Неизвестное действие. Используйте 'read' или 'write'.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>