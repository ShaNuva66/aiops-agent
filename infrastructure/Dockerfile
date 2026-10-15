FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
WORKDIR /app
RUN pip install --no-cache-dir uv==0.12.2
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev
ENV PATH="/app/.venv/bin:$PATH"
COPY backend ./backend
COPY infrastructure/lab ./infrastructure/lab
COPY migrations ./migrations
COPY alembic.ini ./
COPY knowledge-base ./knowledge-base
COPY scripts/verify_qdrant.py ./scripts/verify_qdrant.py
USER 10001:10001
CMD ["sh", "-c", "alembic upgrade head && uvicorn backend.main:create_app --factory --host 0.0.0.0 --port 8000"]
