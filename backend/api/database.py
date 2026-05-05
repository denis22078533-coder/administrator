import mysql.connector
import os
from flask_bcrypt import Bcrypt

# Забираем данные из переменных окружения или используем дефолтные
DB_CONFIG = {
    'user': os.environ.get('DB_USER', 'u3482742_denis'),
    'password': os.environ.get('DB_PASSWORD', 'jP8-zwa-PZd-sEg'),
    'host': os.environ.get('DB_HOST', 'localhost'),
    'database': os.environ.get('DB_NAME', 'u3482742_muravey')
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"Ошибка подключения к БД: {err}")
        return None

# --- Функции для работы с пользователями ---

def create_user(email, password):
    conn = get_db_connection()
    if not conn:
        return None, "Ошибка подключения к базе данных"
    
    cursor = conn.cursor()
    bcrypt = Bcrypt()
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    try:
        # При регистрации автоматически ставим лимит 20 токенов
        cursor.execute(
            "INSERT INTO users (email, password_hash, tokens_balance) VALUES (%s, %s, %s)", 
            (email, hashed_password, 20) 
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {"id": user_id, "email": email, "tokens_balance": 20}, None
    except mysql.connector.IntegrityError:
        return None, "Пользователь с таким email уже существует"
    finally:
        cursor.close()
        conn.close()


def find_user_by_email(email):
    conn = get_db_connection()
    if not conn:
        return None
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return user
