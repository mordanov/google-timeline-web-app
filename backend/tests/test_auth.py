"""Required authentication flow tests (constitution mandate)."""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.service import hash_password
from app.db import Base, get_db
from app.main import app
from app.models.user import User

# Use in-memory SQLite for isolated auth tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Seed one user
    user = User(username="testuser", password_hash=hash_password("correctpass"))
    db_session.add(user)
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestLogin:
    @pytest.mark.asyncio
    async def test_valid_credentials_returns_jwt(self, client: AsyncClient):
        resp = await client.post("/auth/login", json={"username": "testuser", "password": "correctpass"})
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert len(body["access_token"]) > 10

    @pytest.mark.asyncio
    async def test_wrong_password_returns_401(self, client: AsyncClient):
        resp = await client.post("/auth/login", json={"username": "testuser", "password": "wrongpass"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unknown_username_returns_401(self, client: AsyncClient):
        resp = await client.post("/auth/login", json={"username": "nobody", "password": "whatever"})
        assert resp.status_code == 401


class TestProtectedEndpoints:
    @pytest.mark.asyncio
    async def test_no_token_returns_401(self, client: AsyncClient):
        resp = await client.get("/locations/days")
        assert resp.status_code in (401, 403)  # no credentials → unauthenticated

    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self, client: AsyncClient):
        resp = await client.get(
            "/locations/days",
            headers={"Authorization": "Bearer not-a-valid-token"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_valid_token_returns_200(self, client: AsyncClient):
        login_resp = await client.post(
            "/auth/login",
            json={"username": "testuser", "password": "correctpass"},
        )
        token = login_resp.json()["access_token"]

        resp = await client.get(
            "/locations/days",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
