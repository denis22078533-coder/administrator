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
        # При регистрации ставим лимит 20 токенов и is_admin = false
        cursor.execute(
            "INSERT INTO users (email, password_hash, tokens_balance, is_admin) VALUES (%s, %s, %s, %s)", 
            (email, hashed_password, 20, False) 
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {"id": user_id, "email": email, "tokens_balance": 20, "is_admin": False}, None
    except mysql.connector.IntegrityError:
        return None, "Пользователь с таким email уже существует"
    finally:
        cursor.close()
        conn.close()

def find_user_by_email(email):
    conn = get_db_connection()
    if not conn: return None
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return user

def find_user_by_id(user_id):
    conn = get_db_connection()
    if not conn: return None
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return user

def reset_user_balance(user_id):
    conn = get_db_connection()
    if not conn: return False
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET tokens_balance = 0 WHERE id = %s", (user_id,))
    conn.commit()
    success = cursor.rowcount > 0
    cursor.close()
    conn.close()
    return success

def consume_user_token(user_id):
    conn = get_db_connection()
    if not conn: return False, "Нет подключения к БД"
    
    cursor = conn.cursor(dictionary=True)
    # Проверяем баланс и списываем токен в одной транзакции
    try:
        conn.start_transaction()
        cursor.execute("SELECT tokens_balance, is_admin FROM users WHERE id = %s FOR UPDATE", (user_id,))
        user = cursor.fetchone()
        
        if user is None:
            conn.rollback()
            return False, "Пользователь не найден"

        # У админа бесконечные токены - списание не требуется
        if user['is_admin']:
            conn.commit()
            return True, "Админский аккаунт"

        if user['tokens_balance'] > 0:
            cursor.execute("UPDATE users SET tokens_balance = tokens_balance - 1 WHERE id = %s", (user_id,))
            conn.commit()
            return True, "Токен списан"
        else:
            conn.rollback()
            return False, "Недостаточно токенов"
    except mysql.connector.Error as err:
        conn.rollback()
        return False, str(err)
    finally:
        cursor.close()
        conn.close()
