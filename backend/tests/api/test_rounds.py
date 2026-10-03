from typing import Any

from fastapi.testclient import TestClient

from app.domain.draw_engine import WITH_REPETITION, WITHOUT_REPETITION
from tests.api.conftest import ClientFactory


def post_round(client: TestClient, **body: Any) -> Any:
    payload = {"pool_size": 10, "quantity": 3, "allow_repeat": False}
    payload.update(body)
    return client.post("/api/v1/rounds", json=payload)


class TestSucesso:
    def test_sorteia_posicoes_distintas(self, client: TestClient) -> None:
        response = post_round(client)
        assert response.status_code == 200
        body = response.json()
        assert len(body["positions"]) == 3
        assert len(set(body["positions"])) == 3
        assert all(0 <= p < 10 for p in body["positions"])
        assert body["pool_size"] == 10
        assert body["quantity"] == 3
        assert body["allow_repeat"] is False
        assert body["algorithm"] == f"{WITHOUT_REPETITION}+seeded-prng/2026"
        assert body["drawn_at"] == "2026-10-03T21:35:12Z"

    def test_com_repeticao_aceita_quantidade_maior_que_a_lista(self, client: TestClient) -> None:
        response = post_round(client, pool_size=2, quantity=5, allow_repeat=True)
        assert response.status_code == 200
        assert len(response.json()["positions"]) == 5
        assert response.json()["algorithm"].startswith(WITH_REPETITION)

    def test_quantidade_igual_a_lista(self, client: TestClient) -> None:
        response = post_round(client, pool_size=5, quantity=5)
        assert sorted(response.json()["positions"]) == [0, 1, 2, 3, 4]

    def test_fonte_real_de_producao(self, make_client: ClientFactory) -> None:
        client = make_client(real_random=True)
        body = post_round(client).json()
        assert body["algorithm"] == f"{WITHOUT_REPETITION}+os-csprng"


class TestErros:
    def test_participantes_insuficientes(self, client: TestClient) -> None:
        response = post_round(client, pool_size=2, quantity=3)
        assert response.status_code == 422
        assert response.headers["content-type"] == "application/problem+json"
        body = response.json()
        assert body["code"] == "insufficient_participants"
        assert body["params"] == {"available": 2, "requested": 3}
        assert body["title"] == "Participantes insuficientes"
        assert body["request_id"]

    def test_lista_vazia(self, client: TestClient) -> None:
        response = post_round(client, pool_size=0, quantity=1)
        assert response.status_code == 422
        assert response.json()["code"] == "empty_pool"

    def test_quantidade_zero(self, client: TestClient) -> None:
        response = post_round(client, quantity=0)
        assert response.status_code == 422
        body = response.json()
        assert body["code"] == "invalid_request"
        assert body["errors"] == [{"field": "quantity", "type": "greater_than_equal"}]

    def test_tipos_estritos(self, client: TestClient) -> None:
        response = post_round(client, quantity="3")
        assert response.status_code == 422
        assert response.json()["errors"][0]["field"] == "quantity"

    def test_campo_desconhecido(self, client: TestClient) -> None:
        response = post_round(client, seed=42)
        assert response.status_code == 422
        assert response.json()["errors"] == [{"field": "seed", "type": "extra_forbidden"}]

    def test_json_invalido(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/rounds", content=b"{", headers={"content-type": "application/json"}
        )
        assert response.status_code == 422
        assert response.json()["code"] == "invalid_request"

    def test_limite_de_participantes(self, make_client: ClientFactory) -> None:
        client = make_client(max_participants=100)
        response = post_round(client, pool_size=101, quantity=1)
        assert response.status_code == 422
        assert response.json()["code"] == "limit_exceeded"
        assert response.json()["params"] == {"limit": "participants", "maximum": 100}

    def test_limite_de_vencedores_por_rodada(self, make_client: ClientFactory) -> None:
        client = make_client(max_round_quantity=5)
        response = post_round(client, pool_size=10, quantity=6)
        assert response.json()["params"] == {"limit": "round_quantity", "maximum": 5}
