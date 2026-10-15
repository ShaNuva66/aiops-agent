"""Single-operator account bootstrap and revocable, server-side browser sessions."""

import hashlib
import hmac
import secrets
import threading
from datetime import timedelta
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.incidents import utc
from backend.models import AuditEvent, User, UserSession, now
from backend.security import audit

COOKIE = "aiops_session"
HASH_WORKERS = threading.BoundedSemaphore(2)


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    remember: bool = False


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    if not HASH_WORKERS.acquire(blocking=False):
        raise HTTPException(429, "Giriş işlemi yoğun. Biraz sonra tekrar deneyin.")
    try:
        derived = hashlib.scrypt(
            password.encode(), salt=bytes.fromhex(salt), n=32768, r=8, p=3, maxmem=64 * 1024 * 1024
        ).hex()
        return f"scrypt-v1${salt}${derived}"
    finally:
        HASH_WORKERS.release()


def verify_password(password: str, stored: str) -> bool:
    _, salt, _ = stored.split("$")
    return hmac.compare_digest(password_hash(password, salt), stored)


def same_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin:
        expected = urlsplit(str(request.url))
        parsed = urlsplit(origin)
        if (parsed.scheme, parsed.netloc) != (expected.scheme, request.headers.get("host")):
            raise HTTPException(403, "İstek kaynağına izin verilmiyor.")


def current_session(session: Session, request: Request) -> UserSession | None:
    raw = request.cookies.get(COOKIE, "")
    if not raw or len(raw) > 200:
        return None
    item = session.get(UserSession, digest(raw))
    return item if item and utc(item.expires_at) > now() else None


def require_browser(session: Session, request: Request) -> UserSession:
    item = current_session(session, request)
    if not item:
        raise HTTPException(401, "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        same_origin(request)
        if not hmac.compare_digest(
            request.headers.get("X-CSRF-Token", "").encode(), item.csrf_token.encode()
        ):
            raise HTTPException(403, "Oturum doğrulanamadı. Sayfayı yenileyin.")
    return item


def router(factory, settings) -> APIRouter:
    routes = APIRouter(prefix="/api/auth", tags=["Account"])

    def db():
        with factory() as session:
            yield session

    def throttle(session: Session, request: Request) -> None:
        actor = "auth:" + (request.client.host if request.client else "local")
        failures = session.scalar(
            select(func.count())
            .select_from(AuditEvent)
            .where(
                AuditEvent.actor == actor,
                AuditEvent.action == "auth.login_failed",
                AuditEvent.created_at > now() - timedelta(minutes=5),
            )
        )
        if failures >= 10:
            raise HTTPException(429, "Çok fazla deneme. 5 dakika sonra tekrar deneyin.")

    def start_session(session: Session, user: User, response: Response, remember: bool) -> dict:
        raw = secrets.token_urlsafe(32)
        csrf = secrets.token_urlsafe(32)
        seconds = 30 * 86400 if remember else 8 * 3600
        session.execute(delete(UserSession).where(UserSession.expires_at <= now()))
        session.add(
            UserSession(
                token_hash=digest(raw),
                user_id=user.id,
                csrf_token=csrf,
                expires_at=now() + timedelta(seconds=seconds),
            )
        )
        audit(session, user.username, "auth.login", user.id, {"remember": remember})
        session.commit()
        response.set_cookie(
            COOKIE,
            raw,
            max_age=seconds if remember else None,
            path="/api",
            httponly=True,
            samesite="strict",
            secure=settings.cookie_secure,
        )
        return {"username": user.username, "csrf_token": csrf}

    @routes.get("/status")
    def status(session: Session = Depends(db)):
        return {"setup_required": session.scalar(select(func.count()).select_from(User)) == 0}

    @routes.post("/setup", status_code=201)
    def setup(
        payload: Credentials, request: Request, response: Response, session: Session = Depends(db)
    ):
        same_origin(request)
        if session.scalar(select(func.count()).select_from(User)):
            raise HTTPException(409, "Hesap zaten oluşturulmuş. Lütfen giriş yapın.")
        user = User(
            username=payload.username.casefold(), password_hash=password_hash(payload.password)
        )
        session.add(user)
        try:
            session.flush()
        except IntegrityError:
            session.rollback()
            raise HTTPException(409, "Hesap zaten oluşturulmuş. Lütfen giriş yapın.") from None
        audit(session, user.username, "auth.account_created", user.id)
        return start_session(session, user, response, payload.remember)

    @routes.post("/login")
    def login(
        payload: Credentials, request: Request, response: Response, session: Session = Depends(db)
    ):
        same_origin(request)
        throttle(session, request)
        user = session.scalar(select(User).where(User.username == payload.username.casefold()))
        # A fixed dummy hash gives unknown usernames the same expensive verification path.
        dummy = "scrypt-v1$" + "00" * 16 + "$" + "00" * 64
        verified = verify_password(payload.password, user.password_hash if user else dummy)
        if not user or not verified:
            actor = "auth:" + (request.client.host if request.client else "local")
            audit(session, actor, "auth.login_failed", "account")
            session.commit()
            raise HTTPException(401, "Kullanıcı adı veya şifre hatalı.")
        return start_session(session, user, response, payload.remember)

    @routes.get("/me")
    def me(request: Request, session: Session = Depends(db)):
        item = require_browser(session, request)
        user = session.get(User, item.user_id)
        return {"username": user.username, "csrf_token": item.csrf_token}

    @routes.post("/logout")
    def logout(request: Request, response: Response, session: Session = Depends(db)):
        item = require_browser(session, request)
        audit(session, session.get(User, item.user_id).username, "auth.logout", item.user_id)
        session.delete(item)
        session.commit()
        response.delete_cookie(
            COOKIE, path="/api", httponly=True, samesite="strict", secure=settings.cookie_secure
        )
        return {"message": "Çıkış yapıldı."}

    return routes
