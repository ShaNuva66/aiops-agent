from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.auth import COOKIE, digest, verify_password
from backend.main import create_app
from backend.models import User, UserSession, now

CREDS = {"username": "test.operator", "password": "OnlyForTests-12345"}


def setup(client, remember=False):
    return client.post("/api/auth/setup", json={**CREDS, "remember": remember})


def test_first_account_and_hashed_password(client, factory):
    assert client.get("/api/auth/status").json() == {"setup_required": True}
    response = setup(client)
    assert response.status_code == 201
    assert response.json()["username"] == CREDS["username"]
    assert "password" not in response.text
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=strict" in response.headers["set-cookie"]
    assert "Max-Age" not in response.headers["set-cookie"]
    assert client.get("/api/overview").status_code == 200
    assert client.get("/api/auth/status").json() == {"setup_required": False}
    assert setup(client).status_code == 409
    with factory() as session:
        user = session.scalar(select(User))
        assert user.password_hash != CREDS["password"]
        assert verify_password(CREDS["password"], user.password_hash)
        assert not verify_password("wrong-password", user.password_hash)
        auth_session = session.scalar(select(UserSession))
        assert auth_session.token_hash == digest(client.cookies.get(COOKIE))


def test_login_csrf_and_logout_revokes_session(client, factory):
    setup(client)
    csrf = client.get("/api/auth/me").json()["csrf_token"]
    cookie = client.cookies.get(COOKIE)
    assert client.post("/api/operations/cycle").status_code == 403
    assert client.post("/api/auth/logout").status_code == 403
    assert client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf}).status_code == 200
    assert client.get("/api/overview").status_code == 401
    assert client.get("/api/auth/me").status_code == 401
    with factory() as session:
        assert session.get(UserSession, digest(cookie)) is None
    assert (
        client.post("/api/auth/login", json={**CREDS, "password": "wrong-password"}).status_code
        == 401
    )
    assert (
        client.post("/api/auth/login", json={**CREDS, "username": "unknown-user"}).status_code
        == 401
    )
    logged = client.post("/api/auth/login", json={**CREDS, "remember": True})
    assert logged.status_code == 200
    assert "Max-Age=2592000" in logged.headers["set-cookie"]
    assert client.get("/api/overview").status_code == 200
    assert (
        client.post(
            "/api/operations/cycle",
            headers={
                "X-CSRF-Token": logged.json()["csrf_token"],
                "Origin": "http://testserver",
            },
        ).status_code
        == 200
    )


def test_cookie_does_not_authorize_ingestion(client):
    setup(client)
    from tests.test_incidents import event

    assert client.post("/api/monitoring/events", json=event()).status_code == 401


def test_cross_origin_requests_denied(client):
    assert (
        client.post(
            "/api/auth/setup",
            json=CREDS,
            headers={
                "Origin": "https://malicious.example",
            },
        ).status_code
        == 403
    )
    setup(client)
    csrf = client.get("/api/auth/me").json()["csrf_token"]
    assert (
        client.post(
            "/api/auth/logout",
            headers={
                "Origin": "https://malicious.example",
                "X-CSRF-Token": csrf,
            },
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/auth/login",
            json=CREDS,
            headers={
                "Origin": "https://malicious.example",
            },
        ).status_code
        == 403
    )


def test_expired_session_is_denied(client, factory):
    setup(client)
    with factory() as session:
        item = session.scalar(select(UserSession))
        item.expires_at = now() - timedelta(seconds=1)
        session.commit()
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/incidents").status_code == 401


def test_session_survives_backend_restart(client, factory, settings):
    setup(client, remember=True)
    cookie = client.cookies.get(COOKIE)
    with TestClient(create_app(settings, factory)) as restarted:
        restarted.cookies.set(COOKIE, cookie, path="/api")
        assert restarted.get("/api/auth/me").json()["username"] == CREDS["username"]


def test_login_attempts_are_limited(client):
    setup(client)
    for _ in range(10):
        assert (
            client.post("/api/auth/login", json={**CREDS, "password": "wrong-password"}).status_code
            == 401
        )
    assert client.post("/api/auth/login", json=CREDS).status_code == 429


def test_short_password_and_extra_fields_rejected(client):
    assert client.post("/api/auth/setup", json={**CREDS, "password": "short"}).status_code == 422
    assert client.post("/api/auth/setup", json={**CREDS, "role": "admin"}).status_code == 422


def test_non_ascii_bearer_is_denied_without_a_server_error(client):
    from tests.test_incidents import event

    malformed = [(b"authorization", b"Bearer \xff\xfe")]
    response = client.get("/api/overview", headers=malformed)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == 401
    response = client.post("/api/monitoring/events", headers=malformed, json=event())
    assert response.status_code == 401
    assert response.json()["error"]["code"] == 401
