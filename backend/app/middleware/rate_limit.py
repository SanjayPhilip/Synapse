import time
from collections import defaultdict, deque
from fastapi import Request, HTTPException, status

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
