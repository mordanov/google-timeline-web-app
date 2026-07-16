"""Provision the single application user account."""
import argparse
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import hash_password
from app.db import AsyncSessionLocal
from app.models.user import User


async def create_user(username: str, password: str) -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            print(f"User '{username}' already exists.")
            return
        user = User(username=username, password_hash=hash_password(password))
        session.add(user)
        await session.commit()
        print(f"User '{username}' created successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create the application user")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    asyncio.run(create_user(args.username, args.password))
