# Imagem da API (FastAPI + uvicorn). Sem estado: nada é gravado em disco (ADR-017).
#
#   docker build -t sorteia-api backend
#   docker run --rm -p 127.0.0.1:8000:8000 sorteia-api

FROM python:3.12-slim AS build

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PIP_DISABLE_PIP_VERSION_CHECK=1
RUN pip install --no-cache-dir uv==0.8.17

WORKDIR /app
# Dependências primeiro (camada reaproveitada enquanto o uv.lock não muda); só as de produção.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app


FROM python:3.12-slim

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    APP_DOCS_ENABLED=false

RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin sorteia
WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/app ./app

USER sorteia
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"]

# Um processo: o rate limit fica na memória do processo (ver docs/architecture.md, "Escala").
# --proxy-headers: o IP do cliente vem do X-Forwarded-For do Caddy. A API não é publicada fora da
# rede interna do docker compose; FORWARDED_ALLOW_IPS restringe quem pode enviar esse cabeçalho.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--no-server-header", "--no-access-log", "--timeout-graceful-shutdown", "10"]
