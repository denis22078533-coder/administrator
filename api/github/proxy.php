<?php
// Язык: php
// Описание: PHP-прокси для безопасного взаимодействия с GitHub API.

// --- НАСТРОЙКА БЕЗОПАСНОСТИ (CORS) ---
// Разрешаем запросы с любого источника. В рабочей среде можно ограничить до конкретного домена.
header("Access-Control-Allow-Origin: *");
// Разрешаем только методы POST (для запросов к этому прокси) и OPTIONS (для preflight-запросов).
header("Access-Control-Allow-Methods: POST, OPTIONS");
// Разрешаем передавать заголовки Content-Type и Authorization.
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Браузеры отправляют preflight-запрос методом OPTIONS перед основным запросом,
// чтобы проверить, разрешен ли CORS. Отвечаем на него успехом.
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204); // No Content
    exit();
}

// --- ВАЛИДАЦИЯ ВХОДЯЩЕГО ЗАПРОСА ---
// Принимаем только POST-запросы от фронтенда.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Ошибка прокси: разрешены только POST-запросы.']);
    exit();
}

// Читаем JSON-тело запроса от фронтенда.
$request_body = file_get_contents('php://input');
$request_data = json_decode($request_body, true);

// Проверяем, что JSON корректный.
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400); // Bad Request
    echo json_encode(['message' => 'Ошибка прокси: неверный JSON в теле запроса.']);
    exit();
}

// Извлекаем данные, которые прислал фронтенд.
$gh_url = $request_data['url'] ?? null;
$gh_method = strtoupper($request_data['method'] ?? 'GET');
$gh_token = $request_data['github_token'] ?? null; // Это ENGINE_GITHUB_TOKEN или токен пользователя.
$gh_body_from_frontend = $request_data['body'] ?? null;
$gh_frontend_headers = $request_data['headers'] ?? [];

// --- ПРОВЕРКА ДАННЫХ ПЕРЕД ОТПРАВКОЙ В GITHUB ---
$github_api_base = 'https://api.github.com/';
if (!$gh_url || substr($gh_url, 0, strlen($github_api_base)) !== $github_api_base) {
    http_response_code(400);
    echo json_encode(['message' => 'Ошибка прокси: требуется валидный URL для GitHub API.']);
    exit();
}

// Токен — обязательное поле. Без него GitHub не авторизует запрос.
if (empty($gh_token)) {
    http_response_code(401); // Unauthorized
    echo json_encode(['message' => 'Ошибка прокси: отсутствует токен GitHub (ENGINE_GITHUB_TOKEN).']);
    exit();
}

// --- ПОДГОТОВКА И ВЫПОЛНЕНИЕ ЗАПРОСА К GITHUB ---
// Собираем заголовки для cURL-запроса к GitHub.
$headers_for_github = [
    // Главный заголовок авторизации. GitHub требует его для всех запросов.
    'Authorization: Bearer ' . $gh_token,
    // Рекомендуется указывать User-Agent.
    'User-Agent: Muravey-Proxy-PHP/1.2'
];

// Добавляем заголовки, которые прислал фронтенд (например, 'Accept').
if (!empty($gh_frontend_headers) && is_array($gh_frontend_headers)) {
    foreach ($gh_frontend_headers as $key => $value) {
        $headers_for_github[] = "$key: $value";
    }
}

// Инициализируем cURL.
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $gh_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// Устанавливаем метод запроса (GET, PUT, POST и т.д.). Это ключ к поддержке PUT.
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $gh_method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers_for_github);
// Мы хотим получить заголовки ответа от GitHub, чтобы переслать их клиенту.
curl_setopt($ch, CURLOPT_HEADER, true);

// Если это PUT или POST запрос, добавляем тело запроса.
if ($gh_method === 'PUT' || $gh_method === 'POST') {
    if ($gh_body_from_frontend !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $gh_body_from_frontend);
    }
}

// Выполняем запрос.
$response_from_github = curl_exec($ch);
$curl_error_num = curl_errno($ch);
$curl_error_msg = curl_error($ch);

// Проверяем на ошибки cURL.
if ($curl_error_num > 0) {
    http_response_code(502); // Bad Gateway
    echo json_encode(['message' => 'Ошибка cURL прокси: ' . $curl_error_msg]);
    curl_close($ch);
    exit();
}

// Получаем метаданные ответа.
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

// --- ПЕРЕСЫЛКА ОТВЕТА ОТ GITHUB НА ФРОНТЕНД ---
// Разделяем заголовки и тело ответа.
$response_headers = substr($response_from_github, 0, $header_size);
$response_body = substr($response_from_github, $header_size);

// Устанавливаем тот же HTTP-код, который вернул GitHub.
http_response_code($http_code);

// Пересылаем заголовки ответа GitHub клиенту.
$header_lines = explode("
", $response_headers);
foreach ($header_lines as $header) {
    // Исключаем заголовки, которые не должны быть переданы клиенту.
    if (!empty($header) && stripos($header, 'Transfer-Encoding') === false) {
        header($header, false);
    }
}

// Отправляем тело ответа от GitHub.
echo $response_body;

?>
