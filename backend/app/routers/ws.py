import uuid
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from app.config import get_settings

router = APIRouter(prefix="/api/v1/ws", tags=["websocket"])

settings = get_settings()

connections: Dict[uuid.UUID, Set[WebSocket]] = {}


async def connect(websocket: WebSocket, user_id: uuid.UUID):
    await websocket.accept()
    connections.setdefault(user_id, set()).add(websocket)


def disconnect(websocket: WebSocket, user_id: uuid.UUID):
    user_set = connections.get(user_id)
    if user_set:
        user_set.discard(websocket)
        if not user_set:
            connections.pop(user_id, None)


async def send_to_user(user_id: uuid.UUID, message: dict):
    user_set = connections.get(user_id)
    if not user_set:
        return
    for ws in list(user_set):
        try:
            await ws.send_json(message)
        except Exception:
            user_set.discard(ws)


@router.websocket("/notifications")
async def notifications_socket(
    websocket: WebSocket,
    token: str = Query(...),
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4401)
            return
        user_id = uuid.UUID(user_id)
    except (JWTError, ValueError):
        await websocket.close(code=4401)
        return

    await connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        disconnect(websocket, user_id)
    except Exception:
        disconnect(websocket, user_id)
