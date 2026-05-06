
import json
from flask import Request, Response

def main(request: Request):
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }

    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # Для разработки, пропускаем всех с паролем Lumen2024
        if password == "Lumen2024":
            response_data = {"success": True, "message": "Development login successful."}
            return (json.dumps(response_data), 200, headers)
        else:
            response_data = {"success": False, "message": "Invalid credentials."}
            return (json.dumps(response_data), 401, headers)

    except Exception as e:
        response_data = {"success": False, "message": f"An error occurred: {str(e)}"}
        return (json.dumps(response_data), 500, headers)
