"""
Авторизация пользователей: регистрация, вход, получение профиля, выход. v2
Action передаётся в теле: { "action": "register" | "login" | "me" | "logout" }
"""
import json
import os
import hashlib
import secrets
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_token() -> str:
    return secrets.token_hex(64)


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = body.get("action", "")

    # REGISTER
    if method == "POST" and action == "register":
        username = body.get("username", "").strip()
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")
        display_name = body.get("display_name", username).strip()

        if not username or not email or not password:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}
        if len(password) < 6:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пароль минимум 6 символов"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        if cur.fetchone():
            conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Пользователь уже существует"})}

        pw_hash = hash_password(password)
        cur.execute(
            "INSERT INTO users (username, email, password_hash, display_name) VALUES (%s, %s, %s, %s) RETURNING id",
            (username, email, pw_hash, display_name)
        )
        user_id = cur.fetchone()[0]
        token = make_token()
        cur.execute("INSERT INTO sessions (user_id, token) VALUES (%s, %s)", (user_id, token))
        conn.commit()
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({
                "token": token,
                "user": {
                    "id": user_id,
                    "username": username,
                    "display_name": display_name,
                    "email": email,
                    "bio": "",
                    "avatar_emoji": "🏁",
                    "favorite_sports": [],
                    "followers_count": 0,
                    "following_count": 0,
                    "posts_count": 0,
                    "is_verified": False,
                }
            })
        }

    # LOGIN
    if method == "POST" and action == "login":
        login = body.get("login", "").strip().lower()
        password = body.get("password", "")

        conn = get_conn()
        cur = conn.cursor()
        pw_hash = hash_password(password)
        cur.execute(
            """SELECT id, username, display_name, email, bio, avatar_emoji,
               favorite_sports, followers_count, following_count, posts_count, is_verified
               FROM users WHERE (email = %s OR username = %s) AND password_hash = %s""",
            (login, login, pw_hash)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный логин или пароль"})}

        user_id, username, display_name, email, bio, avatar_emoji, fav_sports, followers, following, posts, verified = row
        token = make_token()
        cur.execute("INSERT INTO sessions (user_id, token) VALUES (%s, %s)", (user_id, token))
        conn.commit()
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({
                "token": token,
                "user": {
                    "id": user_id,
                    "username": username,
                    "display_name": display_name,
                    "email": email,
                    "bio": bio or "",
                    "avatar_emoji": avatar_emoji or "🏁",
                    "favorite_sports": list(fav_sports) if fav_sports else [],
                    "followers_count": followers,
                    "following_count": following,
                    "posts_count": posts,
                    "is_verified": verified,
                }
            })
        }

    # ME
    if method == "POST" and action == "me":
        token = body.get("token", "") or event.get("headers", {}).get("X-Auth-Token", "")
        if not token:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            """SELECT u.id, u.username, u.display_name, u.email, u.bio, u.avatar_emoji,
               u.favorite_sports, u.followers_count, u.following_count, u.posts_count, u.is_verified
               FROM sessions s JOIN users u ON s.user_id = u.id
               WHERE s.token = %s AND s.expires_at > NOW()""",
            (token,)
        )
        row = cur.fetchone()
        conn.close()

        if not row:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}

        user_id, username, display_name, email, bio, avatar_emoji, fav_sports, followers, following, posts, verified = row
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({
                "user": {
                    "id": user_id,
                    "username": username,
                    "display_name": display_name,
                    "email": email,
                    "bio": bio or "",
                    "avatar_emoji": avatar_emoji or "🏁",
                    "favorite_sports": list(fav_sports) if fav_sports else [],
                    "followers_count": followers,
                    "following_count": following,
                    "posts_count": posts,
                    "is_verified": verified,
                }
            })
        }

    # LOGOUT
    if method == "POST" and action == "logout":
        token = body.get("token", "")
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("UPDATE sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
            conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестный action"})}