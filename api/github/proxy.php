<?php
// Allow from any origin for CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method Not Allowed']);
    exit();
}

// --- Get data from frontend ---
$request_data = json_decode(file_get_contents('php://input'), true);

if (!$request_data) {
    http_response_code(400);
    echo json_encode(['message' => 'Invalid JSON in request body']);
    exit();
}

$gh_url = $request_data['url'] ?? null;
$gh_method = $request_data['method'] ?? 'GET';
$gh_token = $request_data['github_token'] ?? null;
$gh_body = $request_data['body'] ?? null; // This is expected to be a JSON string from the JS
$gh_frontend_headers = $request_data['headers'] ?? [];

// --- Validation ---
if (!$gh_url || !str_starts_with($gh_url, 'https://api.github.com/')) {
    http_response_code(400);
    echo json_encode(['message' => 'A valid GitHub API URL is required.']);
    exit();
}

if (!$gh_token) {
    http_response_code(401);
    echo json_encode(['message' => 'GitHub token is missing in proxy request.']);
    exit();
}


// --- Prepare request to GitHub ---
$headers_to_github = [
    'Authorization: Bearer ' . $gh_token,
    'User-Agent: Muravey-Proxy-PHP/1.0' // Good practice to set a User-Agent
];

// Add headers from the frontend payload
foreach ($gh_frontend_headers as $key => $value) {
    $headers_to_github[] = "$key: $value";
}
// Ensure Content-Type is set if there is a body.
if ($gh_body !== null) {
    $headers_to_github[] = 'Content-Type: application/json';
}


$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $gh_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $gh_method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers_to_github);
curl_setopt($ch, CURLOPT_HEADER, true); // We need headers to forward them

if ($gh_body !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $gh_body);
}

// --- Execute and get response ---
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$response_headers_str = substr($response, 0, $header_size);
$response_body = substr($response, $header_size);

$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    http_response_code(502); // Bad Gateway
    echo json_encode(['message' => 'cURL Error: ' . $curl_error]);
    exit();
}


// --- Forward GitHub's response to frontend ---
http_response_code($http_code);

// Forward most of GitHub's headers
$response_headers = explode("
", $response_headers_str);
foreach ($response_headers as $header) {
    // Don't forward headers that control the connection between proxy and client
    if (!empty($header) && !str_starts_with(strtolower($header), 'transfer-encoding') && !str_starts_with(strtolower($header), 'content-length')) {
        header($header);
    }
}

echo $response_body;
