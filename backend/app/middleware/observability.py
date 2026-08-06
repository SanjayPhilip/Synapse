"""Request context: request IDs, access logging, sanitized 500 responses.

Pure-ASGI middleware (not BaseHTTPMiddleware) so websocket routes pass through
untouched.
"""
import logging
import time
import uuid

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.datastructures import MutableHeaders

logger = logging.getLogger("synapse.access")


class RequestContextMiddleware:
    """Assign each request a request_id, echo it as X-Request-ID, log one line."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request = Request(scope)
        request_id = uuid.uuid4().hex[:16]
        scope.setdefault("state", {})["request_id"] = request_id
        start = time.perf_counter()
        status_holder: dict = {}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]
                headers = MutableHeaders(scope=message)
                headers.append("x-request-id", request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "%s %s -> %s %.0fms req=%s",
                request.method,
                request.url.path,
                status_holder.get("status", 500),
                duration_ms,
                request_id,
            )


def register_error_handlers(app) -> None:
    """Sanitize unhandled exceptions: log traceback with request_id, return generic 500."""

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.exception(
            "Unhandled error req=%s %s %s", request_id, request.method, request.url.path
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error", "request_id": request_id},
        )
