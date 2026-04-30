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

INCLUDE_DIRS = ["src", "backend", "db_migrations", "scripts"]
INCLUDE_ROOT_FILES = [
    "package.json", "vite.config.ts", "vite.config.js",
    "tailwind.config.ts", "tailwind.config.js",
    "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json",
    "postcss.config.js", "postcss.config.cjs",
    "index.html", ".env.example",
]
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".cache", "__pycache__", ".venv"}
SKIP_EXT = {".pyc", ".pyo", ".log"}
MAX_FILE_SIZE = 400 * 1024


def handler(event: dict, context) -> dict:
    """GitHub helper: скачать архив репозитория (action=download) или
    выгрузить исходники платформы в GitHub (action=push).
    Принимает: { action, token, repo, branch }"""

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
        return _push_to_github(token, repo, branch)

    # action == "download" — оригинальная логика
    url = f"https://api.github.com/repos/{repo}/zipball/{branch}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Lumen-Platform/1.0",
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


def _push_to_github(token: str, repo: str, branch: str) -> dict:
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    files_to_push: list[tuple[str, str]] = []

    for fname in INCLUDE_ROOT_FILES:
        fpath = os.path.join(base_dir, fname)
        if os.path.isfile(fpath):
            files_to_push.append((fname, fpath))

    for dname in INCLUDE_DIRS:
        dir_path = os.path.join(base_dir, dname)
        if not os.path.isdir(dir_path):
            continue
        for root, dirs, files in os.walk(dir_path):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for fname in files:
                ext = os.path.splitext(fname)[1].lower()
                if ext in SKIP_EXT:
                    continue
                abs_path = os.path.join(root, fname)
                if os.path.getsize(abs_path) > MAX_FILE_SIZE:
                    continue
                rel_path = os.path.relpath(abs_path, base_dir).replace("\\", "/")
                files_to_push.append((rel_path, abs_path))

    gh_headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Lumen-Engine/1.0",
    }

    pushed = 0
    errors = []

    for rel_path, abs_path in files_to_push:
        try:
            with open(abs_path, "rb") as f:
                content_b64 = base64.b64encode(f.read()).decode("utf-8")

            api_url = f"https://api.github.com/repos/{repo}/contents/{rel_path}"

            sha = None
            get_req = urllib.request.Request(f"{api_url}?ref={branch}", headers=gh_headers)
            try:
                with urllib.request.urlopen(get_req, timeout=10) as r:
                    sha = json.loads(r.read()).get("sha")
            except urllib.error.HTTPError as e:
                if e.code != 404:
                    errors.append(f"{rel_path}: GET {e.code}")
                    continue

            payload: dict = {"message": f"Engine Push: {rel_path}", "content": content_b64, "branch": branch}
            if sha:
                payload["sha"] = sha

            put_req = urllib.request.Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=gh_headers,
                method="PUT",
            )
            with urllib.request.urlopen(put_req, timeout=15) as r:
                r.read()
            pushed += 1

        except Exception as e:
            errors.append(f"{rel_path}: {str(e)[:80]}")

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "ok": True,
            "pushed": pushed,
            "total": len(files_to_push),
            "errors": errors[:10],
            "message": f"Выгружено {pushed} из {len(files_to_push)} файлов в {repo}",
        }),
    }
