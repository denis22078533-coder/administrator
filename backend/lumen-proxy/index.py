import json
import urllib.request
import urllib.error
import re


PROXYAPI_ALIASES = {"proxyapi.ru", "www.proxyapi.ru", "api.proxyapi.ru"}


def normalize_base_url(raw: str, fallback: str) -> str:
    url = (raw or "").strip().rstrip("/")
    if not url:
        return fallback
    if not re.match(r"^https?://", url):
        url = "https://" + url
    url = re.sub(r"(?<!:)/{2,}", "/", url)
    return url.rstrip("/")


def build_openai_endpoint(raw_base: str) -> str:
    url = normalize_base_url(raw_base, "https://api.proxyapi.ru/openai/v1")
    parsed_host = re.sub(r"^https?://", "", url).split("/")[0].lower()
    if parsed_host in PROXYAPI_ALIASES:
        return "https://api.proxyapi.ru/openai/v1/chat/completions"
    if url.endswith("/chat/completions"):
        return url
    if url.endswith("/v1"):
        return url + "/chat/completions"
    return url + "/v1/chat/completions"


def build_claude_endpoint(raw_base: str) -> str:
    url = normalize_base_url(raw_base, "https://api.anthropic.com/v1")
    parsed_host = re.sub(r"^https?://", "", url).split("/")[0].lower()
    if parsed_host in PROXYAPI_ALIASES:
        return "https://api.proxyapi.ru/anthropic/v1/messages"
    if url.endswith("/messages"):
        return url
    if url.endswith("/v1"):
        return url + "/messages"
    return url + "/v1/messages"


def parse_openai_stream(raw: str) -> str:
    """Собирает полный текст из SSE-стрима OpenAI."""
    result = []
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if data == "[DONE]":
            break
        try:
            chunk = json.loads(data)
            delta = chunk.get("choices", [{}])[0].get("delta", {})
            content = delta.get("content")
            if content:
                result.append(content)
        except Exception:
            continue
    return "".join(result)


def parse_claude_stream(raw: str) -> str:
    """Собирает полный текст из SSE-стрима Claude."""
    result = []
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        data = line[5:].strip()
        try:
            chunk = json.loads(data)
            if chunk.get("type") == "content_block_delta":
                delta = chunk.get("delta", {})
                if delta.get("type") == "text_delta":
                    result.append(delta.get("text", ""))
        except Exception:
            continue
    return "".join(result)


def handler(event: dict, context) -> dict:
    """Проксирует запросы к OpenAI/Claude API со стримингом. api_key и base_url берутся из тела запроса."""

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "Invalid JSON body"})}

    provider = body.pop("__provider__", "openai")
    api_key = (body.pop("__api_key__", "") or "").strip()
    raw_base = (body.pop("__base_url__", "") or "").strip()

    # Включаем стриминг
    body["stream"] = True

    if provider == "openai":
        endpoint = build_openai_endpoint(raw_base)
        req_headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Authorization": f"Bearer {api_key}",
        }
    else:
        endpoint = build_claude_endpoint(raw_base)
        req_headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }

    print(f"[lumen-proxy] provider={provider} endpoint={endpoint} stream=true")

    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(endpoint, data=payload, headers=req_headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw_stream = resp.read().decode("utf-8")

            if provider == "openai":
                text = parse_openai_stream(raw_stream)
                result = {
                    "choices": [{"message": {"content": text}, "finish_reason": "stop"}],
                    "__endpoint__": endpoint,
                    "__streamed__": True,
                }
            else:
                text = parse_claude_stream(raw_stream)
                result = {
                    "content": [{"type": "text", "text": text}],
                    "__endpoint__": endpoint,
                    "__streamed__": True,
                }

            return {"statusCode": 200, "headers": cors_headers, "body": json.dumps(result)}

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_data = json.loads(err_body)
            err_data["__endpoint__"] = endpoint
            err_body = json.dumps(err_data)
        except Exception:
            err_body = json.dumps({"error": err_body[:500], "__endpoint__": endpoint})
        return {"statusCode": e.code, "headers": cors_headers, "body": err_body}
    except Exception as e:
        return {
            "statusCode": 502,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e), "__endpoint__": endpoint}),
        }
