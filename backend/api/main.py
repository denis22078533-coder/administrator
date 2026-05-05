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
CORS(app, resources={r"/api/*": {"origins": "https://югазин.рф"}})
bcrypt = Bcrypt(app)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_super_secret_key_change_it_please')

RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY', 'your-rapidapi-key-here')
RAPIDAPI_HOST = 'suno-ai-music-generator.p.rapidapi.com'

# --- Глобальные обработчики ошибок для JSON ответов ---
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"message": "Ресурс не найден (404). Проверьте URL запроса."}), 404

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
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Email и пароль обязательны"}), 400

    user, error = create_user(data['email'], data['password'])

    if error:
        return jsonify({"message": error}), 409
        
    return jsonify({"message": "Пользователь успешно создан", "user": user}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = find_user_by_email(data['email'])

    if user and bcrypt.check_password_hash(user['password_hash'], data['password']):
        token = jwt.encode({
            'user_id': user['id'],
            'is_admin': user['is_admin'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        
        del user['password_hash']
        return jsonify({'token': token, 'user': user})
    else:
        return jsonify({"message": "Неверный email или пароль"}), 401

@app.route('/api/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({"user": current_user})

@app.route('/api/balance/reset', methods=['POST'])
@token_required
def reset_my_balance(current_user):
    success = reset_user_balance(current_user['id'])
    if success:
        updated_user = find_user_by_id(current_user['id'])
        del updated_user['password_hash']
        return jsonify({"message": "Баланс обнулен", "user": updated_user})
    else:
        return jsonify({"message": "Не удалось обнулить баланс"}), 500


@app.route('/api/music/generate', methods=['POST'])
@token_required
def generate_music_route(current_user):
    success, message = consume_user_tokens(current_user['id'], 10)
    if not success:
        return jsonify({"message": message}), 402

    data = request.get_json()
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({"message": "Требуется текстовый промпт"}), 400

    try:
        api_url = f"https://{RAPIDAPI_HOST}/api/generate"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": RAPIDAPI_HOST,
            "Content-Type": "application/json"
        }
        payload = {"prompt": prompt}
        response = requests.post(api_url, json=payload, headers=headers)
        response.raise_for_status()
        music_data = response.json()

        return jsonify(music_data)

    except requests.exceptions.HTTPError as e:
        return jsonify({"message": f"Ошибка от Suno API: {e.response.text}"}), e.response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({"message": f"Ошибка при обращении к Suno API: {e}"}), 500
    except Exception as e:
        return jsonify({"message": f"Неизвестная ошибка: {e}"}), 500


@app.route('/api/openai/request', methods=['POST'])
@token_required
def handle_openai_request(current_user):
    success, message = consume_user_token(current_user['id'])
    
    if not success:
        return jsonify({"message": message}), 402
    
    updated_user = find_user_by_id(current_user['id'])
    new_balance = updated_user['tokens_balance']
    
    return jsonify({
        "message": "Запрос к AI успешно обработан", 
        "new_balance": new_balance,
        "ai_response": "Это тестовый ответ от AI..."
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001)
