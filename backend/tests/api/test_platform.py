"""Comportamento transversal: limites, cabeçalhos, erros genéricos, rate limit, docs e CLI."""

import json
import logging
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.cli import main as cli_main
from app.core.logging import JsonFormatter, request_id_var
from tests.api.conftest import ClientFactory


def test_limites(client: TestClient) -> None:
    body = client.get("/api/v1/limits").json()
    assert body == {
        "max_participants": 50_000,
        "max_round_quantity": 10_000,
        "max_name_length": 120,
        "max_draw_name_length": 100,
        "max_upload_bytes": 5 * 1024 * 1024,
        "max_text_chars": 2_000_000,
        "max_export_rounds": 1_000,
    }


def test_cabecalhos_de_seguranca(client: TestClient) -> None:
    response = client.get("/api/v1/limits")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["x-frame-options"] == "DENY"
    assert (
        response.headers["content-security-policy"] == "default-src 'none'; frame-ancestors 'none'"
    )


def test_request_id_gerado_ou_reaproveitado(client: TestClient) -> None:
    generated = client.get("/api/health").headers["x-request-id"]
    assert len(generated) == 32
    echoed = client.get("/api/health", headers={"x-request-id": "abc-12345678"})
    assert echoed.headers["x-request-id"] == "abc-12345678"
    replaced = client.get("/api/health", headers={"x-request-id": "<script>"})
    assert replaced.headers["x-request-id"] != "<script>"


def test_rota_inexistente(client: TestClient) -> None:
    response = client.get("/api/v1/nada")
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["code"] == "not_found"


def test_metodo_nao_permitido(client: TestClient) -> None:
    response = client.get("/api/v1/rounds")
    assert response.status_code == 405
    assert response.json()["code"] == "method_not_allowed"


def test_erro_inesperado_vira_500_generico(client: TestClient) -> None:
    def explode() -> None:
        raise RuntimeError("detalhe interno com Fulano")

    client.app.add_api_route("/api/explode", explode)  # type: ignore[attr-defined]
    response = client.get("/api/explode")
    assert response.status_code == 500
    body = response.json()
    assert body["code"] == "internal_error"
    assert "Fulano" not in response.text
    assert body["request_id"] == response.headers["x-request-id"]
    assert response.headers["x-content-type-options"] == "nosniff"


class TestTamanhoDoCorpo:
    def test_content_length_acima_do_limite(self, make_client: ClientFactory) -> None:
        client = make_client(max_body_bytes=1024 * 1024)
        response = client.post("/api/v1/imports/text", json={"text": "x" * (1024 * 1024 + 10)})
        assert response.status_code == 413
        assert response.json()["code"] == "payload_too_large"

    def test_corpo_em_partes_acima_do_limite(self, make_client: ClientFactory) -> None:
        client = make_client(max_body_bytes=1024 * 1024)

        def chunks() -> Iterator[bytes]:
            yield b'{"text": "'
            for _ in range(20):
                yield b"x" * 100_000
            yield b'"}'

        response = client.post(
            "/api/v1/imports/text", content=chunks(), headers={"content-type": "application/json"}
        )
        assert response.status_code == 413
        assert response.json()["code"] == "payload_too_large"


def test_rate_limit(make_client: ClientFactory) -> None:
    client = make_client(rate_limit_enabled=True, rate_limit_rounds="2/minute")
    body = {"pool_size": 3, "quantity": 1, "allow_repeat": False}
    assert client.post("/api/v1/rounds", json=body).status_code == 200
    assert client.post("/api/v1/rounds", json=body).status_code == 200
    blocked = client.post("/api/v1/rounds", json=body)
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "rate_limited"
    assert int(blocked.headers["retry-after"]) >= 1
    # Os limites são por grupo de rotas.
    assert client.post("/api/v1/imports/text", json={"text": "Ana"}).status_code == 200


def test_docs_podem_ser_desligadas(make_client: ClientFactory) -> None:
    client = make_client(docs_enabled=False)
    assert client.get("/api/docs").status_code == 404
    assert client.get("/api/openapi.json").status_code == 404


def test_docs_ligadas_nao_recebem_csp_restritiva(client: TestClient) -> None:
    response = client.get("/api/docs")
    assert response.status_code == 200
    assert "content-security-policy" not in response.headers


def test_cli_imprime_openapi(capsys: pytest.CaptureFixture[str]) -> None:
    assert cli_main(["openapi"]) == 0
    schema = json.loads(capsys.readouterr().out)
    assert "/api/v1/rounds" in schema["paths"]


def test_formato_do_log() -> None:
    record = logging.makeLogRecord({"msg": "request", "levelname": "INFO", "status": 200})
    token = request_id_var.set("req-123")
    try:
        payload = json.loads(JsonFormatter().format(record))
    finally:
        request_id_var.reset(token)
    assert payload["event"] == "request"
    assert payload["status"] == 200
    assert payload["request_id"] == "req-123"
