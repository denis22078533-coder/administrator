import os
import jwt
import datetime
import requests 
from functools import wraps
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt

from database import (
    create_user, 
    find_user_by_email, 
    find_user_by_id,
    reset_user_balance, 
    consume_user_token,
    consume_user_tokens
)

app = Flask(__name__)
# Обновляем CORS для разработки, чтобы разрешить все источники
CORS(app, resources={r"/api/*": {"origins": "*"}})
bcrypt = Bcrypt(app)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'c82e0a273c52a7b6b0604b2c8c7c25c1d3c0b1a0e8c9c7b9e0f3e1d2c3b4a5f6')

# --- Пароль для входа на сайт на время разработки ---
SITE_PASSWORD = "Lumen2024"
DEV_USER_EMAIL = "dev@muravey.com"

# --- Глобальные обработчики ошибок ---
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"message": "Ресурс не найден (404)."}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"message": f"Внутренняя ошибка сервера (500): {error}"}), 500

# --- Декоратор для проверки JWT токена ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Токен отсутствует'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = find_user_by_id(data['user_id'])
            if not current_user:
                 return jsonify({'message': 'Пользователь не найден'}), 404
            del current_user['password_hash']
        except Exception as e:
            return jsonify({'message': 'Токен недействителен', 'error': str(e)}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# --- Эндпоинты API ---

@app.route('/api/register', methods=['POST'])
def register():
    # Регистрация временно отключена на время разработки
    return jsonify({"message": "Регистрация будет доступна позже."}), 403

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    password = data.get('password')

    # Проверяем пароль для входа на сайт
    if password == SITE_PASSWORD:
        user = find_user_by_email(DEV_USER_EMAIL)
        
        if not user:
            # Если пользователя для разработки нет, создаем его
            user, error = create_user(DEV_USER_EMAIL, SITE_PASSWORD)
            if error:
                return jsonify({"message": f"Не удалось создать пользователя для разработки: {error}"}), 500
        
        # Пользователь для разработки всегда админ
        user['is_admin'] = True

        token = jwt.encode({
            'user_id': user['id'],
            'is_admin': user['is_admin'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=72) # Увеличенный срок действия токена
        }, app.config['SECRET_KEY'])
        
        if 'password_hash' in user:
            del user['password_hash']
        return jsonify({'token': token, 'user': user})

    # Логика для обычных пользователей (будет использоваться позже)
    email = data.get('email')
    user = find_user_by_email(email)

    if user and bcrypt.check_password_hash(user['password_hash'], password):
        token = jwt.encode({
            'user_id': user['id'],
            'is_admin': user['is_admin'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        
        del user['password_hash']
        return jsonify({'token': token, 'user': user})
    else:
        return jsonify({"message": "Неверный пароль"}), 401


@app.route('/api/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({"user": current_user})

@app.route('/api/balance/reset', methods=['POST'])
@token_required
def reset_my_balance(current_user):
    if not current_user.get('is_admin'):
        return jsonify({"message": "Доступ запрещен"}), 403
    
    success = reset_user_balance(current_user['id'])
    if success:
        updated_user = find_user_by_id(current_user['id'])
        del updated_user['password_hash']
        return jsonify({"message": "Баланс сброшен", "user": updated_user})
    else:
        return jsonify({"message": "Не удалось сбросить баланс"}), 500

@app.route('/api/github/proxy', methods=['POST'])
@token_required
def github_proxy(current_user):
    data = request.get_json()
    if not data:
        return jsonify({"message": "Request body must be JSON."}), 400

    gh_url = data.get('url')
    gh_method = data.get('method', 'GET').upper()
    gh_headers = data.get('headers', {})
    gh_body = data.get('body')
    github_token = data.get('github_token')

    if not gh_url or not gh_url.startswith('https://api.github.com/'):
        return jsonify({"message": "A valid GitHub API URL is required."}), 400
    
    if not github_token:
        return jsonify({"message": "GitHub token is missing in proxy request."}), 401

    headers_to_github = {
        'Authorization': f'Bearer {github_token}',
    }
    headers_to_github.update(gh_headers)

    try:
        response = requests.request(
            method=gh_method,
            url=gh_url,
            headers=headers_to_github,
            data=gh_body.encode('utf-8') if gh_body else None,
            timeout=20
        )

        if 'application/json' in response.headers.get('Content-Type', ''):
            return jsonify(response.json()), response.status_code
        else:
            return response.content, response.status_code, {'Content-Type': response.headers.get('Content-Type')}

    except requests.exceptions.Timeout:
        return jsonify({"message": "GitHub API timed out."}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"message": f"Error proxying request to GitHub: {str(e)}"}), 502

# Остальные эндпоинты без изменений...
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY', 'your-rapidapi-key-here')
RAPIDAPI_HOST = 'suno-ai-music-generator.p.rapidapi.com'

@app.route('/api/music/generate', methods=['POST'])
@token_required
def generate_music_route(current_user):
    # Логика списания токенов...
    # ...

    return jsonify({"message": "Функционал в разработке"})

@app.route('/api/openai/request', methods=['POST'])
@token_required
def handle_openai_request(current_user):
    # Логика списания токенов...
    # ...
    
    return jsonify({
        "message": "Запрос к AI успешно обработан", 
        "new_balance": 999,
        "ai_response": "Это тестовый ответ от AI..."
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001)
