
import json
from flask import Request, Response

# Mock user data that matches the frontend's expected User structure
mock_user = {
    "id": 1,
    "username": "muravey_fan",
    "display_name": "Тестовый Пользователь",
    "email": "test@example.com",
    "bio": "Это тестовая биография. Я люблю MotoGP и Формулу 1!",
    "avatar_emoji": "🏎️",
    "favorite_sports": ["MotoGP", "Formula 1"],
    "followers_count": 123,
    "following_count": 45,
    "posts_count": 6,
    "is_verified": True,
}

mock_token = "fake-jwt-token-for-dev"

def main(request: Request):
    # Handle CORS preflight requests
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }

    try:
        data = request.get_json()
        action = data.get('action')

        if not action:
            return (json.dumps(json.dumps({"error": "No action specified"})), 400, headers)

        # --- Handle Login ---
        if action == "login":
            password = data.get('password')
            if password == "Lumen2024":
                response_data = {"token": mock_token, "user": mock_user}
                # Frontend expects a double-encoded JSON string
                return (json.dumps(json.dumps(response_data)), 200, headers)
            else:
                return (json.dumps(json.dumps({"error": "Invalid credentials."})), 401, headers)

        # --- Handle Registration ---
        elif action == "register":
            # Mock registration is successful and returns the user
            response_data = {"token": mock_token, "user": mock_user}
            return (json.dumps(json.dumps(response_data)), 200, headers)
        
        # --- Handle fetching user with a token ---
        elif action == "me":
            token = data.get('token')
            if token:
                response_data = {"user": mock_user}
                return (json.dumps(json.dumps(response_data)), 200, headers)
            else:
                return (json.dumps(json.dumps({"error": "Token is missing or invalid"})), 401, headers)

        # --- Handle Logout ---
        elif action == "logout":
            return (json.dumps(json.dumps({"success": True})), 200, headers)

        else:
            return (json.dumps(json.dumps({"error": "Unknown action"})), 400, headers)

    except Exception as e:
        response_data = {"error": f"An error occurred: {str(e)}"}
        return (json.dumps(json.dumps(response_data)), 500, headers)
