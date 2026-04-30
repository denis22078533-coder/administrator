import os
import json
import uuid
import time
import requests
import boto3


def generate_via_pollinations(prompt: str) -> bytes:
    """Генерирует картинку через Pollinations.ai (бесплатно, без токена)"""
    import urllib.parse
    encoded = urllib.parse.quote(prompt)
    seed = int(time.time()) % 99999
    url = f'https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&seed={seed}&nologo=true&model=flux'
    print(f'[generate-image] pollinations url: {url}')
    resp = requests.get(url, timeout=90)
    print(f'[generate-image] pollinations status={resp.status_code} ct={resp.headers.get("content-type","")}')
    if resp.status_code == 200 and resp.content and len(resp.content) > 1000:
        return resp.content
    raise Exception(f'Pollinations failed: HTTP {resp.status_code}, size={len(resp.content)}')


def handler(event: dict, context) -> dict:
    """Генерирует картинку через Pollinations.ai и загружает в S3"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    prompt = body.get('prompt', '').strip()
    if not prompt:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'prompt required'})}

    try:
        img_data = generate_via_pollinations(prompt)
    except Exception as e:
        print(f'[generate-image] failed: {e}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'generation failed', 'detail': str(e)})
        }

    key = f'lumen-images/{uuid.uuid4()}.jpg'
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    s3.put_object(Bucket='files', Key=key, Body=img_data, ContentType='image/jpeg')
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    print(f'[generate-image] success: {cdn_url}')

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'url': cdn_url})
    }