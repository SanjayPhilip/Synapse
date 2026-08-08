import asyncio
from app.db import async_session
from app.models import User
from sqlalchemy import select

async def check():
    async with async_session() as s:
        r = await s.execute(select(User).where(User.email.in_(['admin@synapse.demo', 'testemployer@example.com', 'testseeker@example.com'])))
        users = r.scalars().all()
        print([u.email for u in users])
        await s.close()

asyncio.run(check())