import json
import urllib.request
import urllib.error
import base64
import os


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def handler(event: dict, context) -> dict:
    """GitHub helper:
    - action=download : скачать ZIP архив репозитория
    - action=push     : выгрузить файлы (переданные фронтендом) в GitHub
    - action=push_file: записать один файл в GitHub
    Тело: { action, token, repo, branch, files?, path?, content? }
    """

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Invalid JSON"})}

    token = (body.get("token") or "").strip()
    repo = (body.get("repo") or "").strip()
    branch = (body.get("branch") or "main").strip()
    action = (body.get("action") or "download").strip()

    if not token or not repo:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "token and repo required"})}

    if action == "push":
        return _push_files(token, repo, branch, body)

    if action == "push_file":
        return _push_single_file(token, repo, branch, body)

    # action == "download"
    return _download_zip(token, repo, branch)


def _gh_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Muravey-Engine/1.0",
    }


def _get_sha(token: str, repo: str, branch: str, path: str) -> str | None:
    """Получить текущий SHA файла (None если файл не существует)."""
    url = f"https://api.github.com/repos/{repo}/contents/{path}?ref={branch}"
    req = urllib.request.Request(url, headers=_gh_headers(token))
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read()).get("sha")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    except Exception:
        return None


def _put_file(token: str, repo: str, branch: str, path: str, content_b64: str, sha: str | None, message: str) -> tuple[bool, str]:
    """Записать файл в GitHub. Возвращает (ok, error_message)."""
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    payload: dict = {"message": message, "content": content_b64, "branch": branch}
    if sha:
        payload["sha"] = sha
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=_gh_headers(token),
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            r.read()
        return True, ""
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")[:200]
        return False, f"HTTP {e.code}: {err}"
    except Exception as e:
        return False, str(e)


def _push_files(token: str, repo: str, branch: str, body: dict) -> dict:
    """
    Принимает список файлов от фронтенда и пушит каждый в GitHub.
    body.files = [ { path: "src/App.tsx", content_b64: "base64..." }, ... ]
    """
    files = body.get("files")
    if not files or not isinstance(files, list):
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "files array required. Send files from frontend as base64."}),
        }

    pushed = 0
    errors = []

    for item in files:
        path = (item.get("path") or "").strip()
        content_b64 = (item.get("content_b64") or "").strip()
        if not path or not content_b64:
            errors.append(f"Пропущен файл: нет path или content_b64")
            continue

        try:
            sha = _get_sha(token, repo, branch, path)
        except Exception as e:
            errors.append(f"{path}: ошибка получения SHA: {e}")
            continue

        ok, err = _put_file(token, repo, branch, path, content_b64, sha, f"Муравей: {path}")
        if ok:
            pushed += 1
        else:
            errors.append(f"{path}: {err}")

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "ok": pushed > 0,
            "pushed": pushed,
            "total": len(files),
            "errors": errors[:10],
            "message": f"Выгружено {pushed} из {len(files)} файлов в {repo}",
        }),
    }


def _push_single_file(token: str, repo: str, branch: str, body: dict) -> dict:
    """
    Записывает один файл в GitHub.
    body.path = "src/lumen/LumenApp.tsx"
    body.content_b64 = "base64 строка"
    body.message = "необязательный коммит-сообщение"
    """
    path = (body.get("path") or "").strip()
    content_b64 = (body.get("content_b64") or "").strip()
    message = (body.get("message") or f"Муравей: обновил {path}").strip()

    if not path or not content_b64:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "path and content_b64 required"})}

    try:
        sha = _get_sha(token, repo, branch, path)
    except Exception as e:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": f"Ошибка получения SHA: {e}"})}

    ok, err = _put_file(token, repo, branch, path, content_b64, sha, message)
    if ok:
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "message": f"Файл {path} записан в {repo}"})}
    else:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"ok": False, "error": err})}


def _download_zip(token: str, repo: str, branch: str) -> dict:
    url = f"https://api.github.com/repos/{repo}/zipball/{branch}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Muravey-Platform/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            zip_bytes = resp.read()
            zip_b64 = base64.b64encode(zip_bytes).decode("utf-8")
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"zip_b64": zip_b64, "size": len(zip_bytes)})}
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        return {"statusCode": e.code, "headers": CORS, "body": json.dumps({"error": f"GitHub {e.code}: {err[:300]}"})}
    except Exception as e:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": str(e)})}
