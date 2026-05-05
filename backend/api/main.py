import os
import jwt
import datetime
from functools import wraps
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt

from database import (
    create_user, 
    find_user_by_email, 
    find_user_by_id,
    reset_user_balance, 
    consume_user_token
)

app = Flask(__name__)
CORS(app) 
bcrypt = Bcrypt(app)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_super_secret_key_change_it_please')

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
            del current_user['password_hash'] # Не передаем хэш пароля
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
    # Возвращает информацию о текущем пользователе
    return jsonify({"user": current_user})

@app.route('/api/balance/reset', methods=['POST'])
@token_required
def reset_my_balance(current_user):
    # Обнуляет баланс текущего пользователя
    success = reset_user_balance(current_user['id'])
    if success:
        # Возвращаем обновленные данные пользователя
        updated_user = find_user_by_id(current_user['id'])
        del updated_user['password_hash']
        return jsonify({"message": "Баланс обнулен", "user": updated_user})
    else:
        return jsonify({"message": "Не удалось обнулить баланс"}), 500

@app.route('/api/openai/request', methods=['POST'])
@token_required
def handle_openai_request(current_user):
    # Это будет эндпоинт-прокси, который сначала списывает токен, 
    # а потом делает запрос к OpenAI (логику OpenAI добавим позже)
    
    # Пытаемся списать токен
    success, message = consume_user_token(current_user['id'])
    
    if not success:
        return jsonify({"message": message}), 402 # 402 Payment Required
    
    # TODO: Здесь будет логика запроса к реальному API OpenAI
    # Сейчас просто имитируем успешный ответ
    
    # Возвращаем обновленный баланс
    updated_user = find_user_by_id(current_user['id'])
    new_balance = updated_user['tokens_balance']
    
    return jsonify({
        "message": "Запрос к AI успешно обработан", 
        "new_balance": new_balance,
        "ai_response": "Это тестовый ответ от AI..."
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001) # Убедитесь, что порт не занят
