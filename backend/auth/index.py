"""
Авторизация пользователей + система запросов/оплаты Муравья.
Action передаётся в теле: { "action": "register" | "login" | "me" | "logout" |
  "muravey_get" | "muravey_spend" | "muravey_restore" |
  "muravey_create_payment" | "muravey_check_payment" | "muravey_confirm_test" }
"""
import json
import os
import hashlib
import secrets
import uuid
import psycopg2

FREE_REQUESTS = 10

PACKAGES = {
    "20req":  {"requests": 20,  "amount": 100000, "label": "20 запросов — 1 000 ₽"},
    "40req":  {"requests": 40,  "amount": 200000, "label": "40 запросов — 2 000 ₽"},
    "100req": {"requests": 100, "amount": 500000, "label": "100 запросов — 5 000 ₽"},
}

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


def verify_tbank_token(data: dict, secret_key: str) -> bool:
    filtered = {k: v for k, v in data.items() if k not in ("Token", "DATA", "Receipt")}
    filtered["Password"] = secret_key
    sorted_vals = "".join(str(v) for k, v in sorted(filtered.items()))
    expected = hashlib.sha256(sorted_vals.encode("utf-8")).hexdigest()
    return data.get("Token", "").lower() == expected.lower()


# ── Муравей: баланс ────────────────────────────────────────────────────────────

def muravey_get(cur, device_id: str) -> dict:
    cur.execute(
        """
        INSERT INTO muravey_users (device_id)
        VALUES (%s)
        ON CONFLICT (device_id) DO UPDATE SET updated_at = NOW()
        RETURNING id, email, phone, free_requests_used, paid_requests_balance
        """,
        (device_id,)
    )
    row = cur.fetchone()
    free_left = max(0, FREE_REQUESTS - row[3])
    paid_left = row[4]
    return {
        "user_id": row[0],
        "email": row[1],
        "phone": row[2],
        "free_requests_left": free_left,
        "paid_requests_balance": paid_left,
        "total_requests_left": free_left + paid_left,
        "can_send": (free_left + paid_left) > 0,
    }


def muravey_spend(cur, device_id: str) -> dict:
    cur.execute(
        "SELECT free_requests_used, paid_requests_balance FROM muravey_users WHERE device_id = %s",
        (device_id,)
    )
    row = cur.fetchone()
    if not row:
        return {"can_send": False, "reason": "user_not_found"}

    free_used, paid_balance = row
    free_left = max(0, FREE_REQUESTS - free_used)

    if free_left == 0 and paid_balance == 0:
        return {"can_send": False, "reason": "no_balance"}

    if free_left > 0:
        cur.execute(
            "UPDATE muravey_users SET free_requests_used = free_requests_used + 1, updated_at = NOW() WHERE device_id = %s",
            (device_id,)
        )
        new_free_left = free_left - 1
        new_paid = paid_balance
    else:
        cur.execute(
            "UPDATE muravey_users SET paid_requests_balance = paid_requests_balance - 1, updated_at = NOW() WHERE device_id = %s",
            (device_id,)
        )
        new_free_left = 0
        new_paid = paid_balance - 1

    return {
        "can_send": True,
        "free_requests_left": new_free_left,
        "paid_requests_balance": new_paid,
        "total_requests_left": new_free_left + new_paid,
    }


def muravey_restore(cur, device_id: str, email: str) -> dict:
    cur.execute(
        "SELECT id, paid_requests_balance FROM muravey_users WHERE email = %s AND device_id != %s ORDER BY updated_at DESC LIMIT 1",
        (email, device_id)
    )
    existing = cur.fetchone()
    cur.execute(
        "UPDATE muravey_users SET email = %s, updated_at = NOW() WHERE device_id = %s",
        (email, device_id)
    )
    transferred = 0
    if existing and existing[1] > 0:
        transferred = existing[1]
        cur.execute(
            "UPDATE muravey_users SET paid_requests_balance = paid_requests_balance + %s, updated_at = NOW() WHERE device_id = %s",
            (transferred, device_id)
        )
        cur.execute(
            "UPDATE muravey_users SET paid_requests_balance = 0, updated_at = NOW() WHERE id = %s",
            (existing[0],)
        )
    cur.execute(
        "SELECT free_requests_used, paid_requests_balance FROM muravey_users WHERE device_id = %s",
        (device_id,)
    )
    row = cur.fetchone()
    free_left = max(0, FREE_REQUESTS - row[0])
    paid_left = row[1]
    return {
        "ok": True,
        "transferred": transferred,
        "free_requests_left": free_left,
        "paid_requests_balance": paid_left,
        "total_requests_left": free_left + paid_left,
    }


def muravey_create_payment(cur, device_id: str, email: str, phone: str, package_id: str) -> dict:
    if package_id not in PACKAGES:
        return {"error": "unknown package_id"}

    pkg = PACKAGES[package_id]
    payment_id = str(uuid.uuid4())
    tbank_api_key = os.environ.get("TBANK_API_KEY", "")

    cur.execute(
        "UPDATE muravey_users SET email = %s, phone = %s, updated_at = NOW() WHERE device_id = %s",
        (email, phone or None, device_id)
    )
    cur.execute(
        """
        INSERT INTO muravey_payments
          (device_id, email, phone, package_id, requests_count, amount, payment_id, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
        RETURNING id
        """,
        (device_id, email, phone or None, package_id, pkg["requests"], pkg["amount"], payment_id)
    )
    db_payment_id = cur.fetchone()[0]

    if not tbank_api_key:
        return {
            "ok": True,
            "test_mode": True,
            "payment_id": payment_id,
            "db_payment_id": db_payment_id,
            "package": pkg["label"],
            "amount_rub": pkg["amount"] // 100,
            "requests_count": pkg["requests"],
            "sbp_payload": None,
        }

    import urllib.request
    import urllib.error

    tbank_payload = json.dumps({
        "TerminalKey": tbank_api_key,
        "Amount": pkg["amount"],
        "OrderId": payment_id,
        "Description": f"Муравей — {pkg['label']}",
        "Email": email,
        "PayType": "O",
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://securepay.tinkoff.ru/v2/Init",
        data=tbank_payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            tbank_resp = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        return {"error": f"Ошибка Т-Бизнес: {str(e)}"}

    if not tbank_resp.get("Success"):
        return {"error": tbank_resp.get("Message", "Ошибка создания платежа")}

    tbank_pid = tbank_resp.get("PaymentId", "")

    qr_payload = json.dumps({
        "TerminalKey": tbank_api_key,
        "PaymentId": tbank_pid,
        "DataType": "PAYLOAD",
    }).encode("utf-8")
    qr_req = urllib.request.Request(
        "https://securepay.tinkoff.ru/v2/GetQr",
        data=qr_payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    sbp_payload = None
    try:
        with urllib.request.urlopen(qr_req, timeout=15) as resp:
            qr_resp = json.loads(resp.read().decode("utf-8"))
            if qr_resp.get("Success"):
                sbp_payload = qr_resp.get("Data")
    except Exception:
        pass

    cur.execute(
        "UPDATE muravey_payments SET payment_id = %s, sbp_payload = %s WHERE id = %s",
        (tbank_pid, sbp_payload, db_payment_id)
    )

    return {
        "ok": True,
        "test_mode": False,
        "payment_id": tbank_pid,
        "db_payment_id": db_payment_id,
        "package": pkg["label"],
        "amount_rub": pkg["amount"] // 100,
        "requests_count": pkg["requests"],
        "sbp_payload": sbp_payload,
    }


def muravey_check_payment(cur, db_payment_id: int) -> dict:
    cur.execute(
        "SELECT status, requests_count, package_id FROM muravey_payments WHERE id = %s",
        (db_payment_id,)
    )
    row = cur.fetchone()
    if not row:
        return {"error": "payment not found"}
    return {"status": row[0], "paid": row[0] == "paid", "requests_count": row[1], "package_id": row[2]}


def muravey_confirm_test(cur, db_payment_id: int) -> dict:
    cur.execute(
        "SELECT device_id, requests_count, status FROM muravey_payments WHERE id = %s",
        (db_payment_id,)
    )
    row = cur.fetchone()
    if not row:
        return {"error": "payment not found"}
    device_id, requests_count, status = row
    if status == "paid":
        return {"ok": True, "already_paid": True, "requests_added": 0}
    cur.execute("UPDATE muravey_payments SET status = 'paid', paid_at = NOW() WHERE id = %s", (db_payment_id,))
    cur.execute(
        "UPDATE muravey_users SET paid_requests_balance = paid_requests_balance + %s, updated_at = NOW() WHERE device_id = %s",
        (requests_count, device_id)
    )
    return {"ok": True, "already_paid": False, "requests_added": requests_count}


def muravey_tbank_webhook(body: dict, cur, conn) -> dict:
    tbank_secret = os.environ.get("TBANK_SECRET_KEY", "")
    if tbank_secret and not verify_tbank_token(body, tbank_secret):
        return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "invalid token"})}
    if body.get("Status") != "CONFIRMED":
        return {"statusCode": 200, "headers": CORS, "body": "OK"}
    payment_id = str(body.get("PaymentId", ""))
    cur.execute(
        "SELECT id, device_id, requests_count, status FROM muravey_payments WHERE payment_id = %s",
        (payment_id,)
    )
    row = cur.fetchone()
    if not row or row[3] == "paid":
        return {"statusCode": 200, "headers": CORS, "body": "OK"}
    db_id, device_id, requests_count, _ = row
    cur.execute("UPDATE muravey_payments SET status = 'paid', paid_at = NOW() WHERE id = %s", (db_id,))
    cur.execute(
        "UPDATE muravey_users SET paid_requests_balance = paid_requests_balance + %s, updated_at = NOW() WHERE device_id = %s",
        (requests_count, device_id)
    )
    conn.commit()
    return {"statusCode": 200, "headers": CORS, "body": "OK"}


# ── Основной обработчик ────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = body.get("action", "")

    # Вебхук от Т-Бизнес (нет action, есть Status + PaymentId)
    if "Status" in body and "PaymentId" in body and not action:
        conn = get_conn()
        cur = conn.cursor()
        try:
            return muravey_tbank_webhook(body, cur, conn)
        finally:
            cur.close()
            conn.close()

    # ── Муравей: запросы баланса ─────────────────────────────────────────────
    if action.startswith("muravey_"):
        device_id = body.get("device_id", "")
        conn = get_conn()
        cur = conn.cursor()
        try:
            if action == "muravey_get":
                if not device_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "device_id required"})}
                result = muravey_get(cur, device_id)
                conn.commit()

            elif action == "muravey_spend":
                if not device_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "device_id required"})}
                result = muravey_spend(cur, device_id)
                conn.commit()

            elif action == "muravey_restore":
                email = body.get("email", "").strip().lower()
                if not device_id or not email:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "device_id and email required"})}
                result = muravey_restore(cur, device_id, email)
                conn.commit()

            elif action == "muravey_create_payment":
                email = body.get("email", "").strip().lower()
                phone = body.get("phone", "").strip()
                package_id = body.get("package_id", "")
                if not device_id or not email or not package_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "device_id, email, package_id required"})}
                result = muravey_create_payment(cur, device_id, email, phone, package_id)
                conn.commit()

            elif action == "muravey_check_payment":
                db_payment_id = body.get("db_payment_id")
                if not db_payment_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "db_payment_id required"})}
                result = muravey_check_payment(cur, int(db_payment_id))

            elif action == "muravey_confirm_test":
                db_payment_id = body.get("db_payment_id")
                if not db_payment_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "db_payment_id required"})}
                result = muravey_confirm_test(cur, int(db_payment_id))
                conn.commit()

            else:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown muravey action"})}

            if "error" in result:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps(result)}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(result)}

        finally:
            cur.close()
            conn.close()

    # ── Авторизация пользователей ─────────────────────────────────────────────

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
        login_val = body.get("login", "").strip().lower()
        password = body.get("password", "")

        conn = get_conn()
        cur = conn.cursor()
        pw_hash = hash_password(password)
        cur.execute(
            """SELECT id, username, display_name, email, bio, avatar_emoji,
               favorite_sports, followers_count, following_count, posts_count, is_verified
               FROM users WHERE (email = %s OR username = %s) AND password_hash = %s""",
            (login_val, login_val, pw_hash)
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
