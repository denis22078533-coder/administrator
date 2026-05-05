import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import jwt
import datetime

from database import create_user, find_user_by_email

app = Flask(__name__)
CORS(app) # Разрешаем кросс-доменные запросы для фронтенда
bcrypt = Bcrypt(app)

# Секретный ключ для подписи JWT-токенов
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_super_secret_key_change_it_please')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Email и пароль обязательны"}), 400

    user, error = create_user(data['email'], data['password'])

    if error:
        return jsonify({"message": error}), 409 # 409 Conflict - такой пользователь уже есть
        
    return jsonify({"message": "Пользователь успешно создан", "user": user}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Email и пароль обязательны"}), 400

    user = find_user_by_email(data['email'])

    if user and bcrypt.check_password_hash(user['password_hash'], data['password']):
        # Пароль верный, создаем токен
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        
        # Убираем хэш пароля из ответа
        del user['password_hash']
        
        return jsonify({
            'message': 'Вход выполнен успешно',
            'token': token,
            'user': user
        })
    else:
        return jsonify({"message": "Неверный email или пароль"}), 401

if __name__ == '__main__':
    app.run(debug=True, port=5001)
