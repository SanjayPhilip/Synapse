import time
from collections import defaultdict, deque
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse

_requests: dict[tuple[str, str], deque] = defaultdict(deque)


def rate_limiter(max_requests: int, window_seconds: int):
    async def _limit(request: Request):
        client = request.client.host if request.client else "unknown"
        key = (client, request.url.path)
        now = time.monotonic()
        window = _requests[key]
        while window and now - window[0] > window_seconds:
            window.popleft()
        if len(window) >= max_requests:
            retry = int(window[0] + window_seconds - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(max(retry, 1))},
            )
        window.append(now)

    return _limit


class RateLimitMiddleware:
    """Global per-IP burst limit across every HTTP route.

    Sits outside the per-route ``rate_limiter`` dependencies and shares the
    same ``_requests`` store, so tests can reset both via ``_requests.clear()``.
    """

    def __init__(self, app, max_requests: int = 300, window_seconds: int = 60):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request = Request(scope)
        client = request.client.host if request.client else "unknown"
        key = (client, "global")
        now = time.monotonic()
        window = _requests[key]
        while window and now - window[0] > self.window_seconds:
            window.popleft()
        if len(window) >= self.max_requests:
            retry = int(window[0] + self.window_seconds - now)
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(max(retry, 1))},
            )
            await response(scope, receive, send)
            return
        window.append(now)
        await self.app(scope, receive, send)
