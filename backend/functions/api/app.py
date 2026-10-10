"""API Gateway (HTTP API, payload v2) entry point for every route."""
import base64
import json

from core import router


def handler(event, context):
    http = event.get("requestContext", {}).get("http", {})
    method = http.get("method", "GET")
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": {"access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "*"}, "body": ""}
    path = event.get("rawPath", "/")
    raw = event.get("body") or ""
    if event.get("isBase64Encoded") and raw:
        raw = base64.b64decode(raw).decode("utf-8")
    try:
        body = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {"statusCode": 400, "headers": {"content-type": "application/json"},
                "body": json.dumps({"error": "body must be valid JSON"})}
    status, payload = router.handle(method, path, event.get("queryStringParameters") or {}, body)
    return {"statusCode": status, "headers": {"content-type": "application/json"},
            "body": json.dumps(payload, default=str)}
