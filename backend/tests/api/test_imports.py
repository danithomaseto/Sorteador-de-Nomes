import logging

import pytest
from fastapi.testclient import TestClient

from app.importing.xlsx_reader import CFB_SIGNATURE
from tests.api.conftest import ClientFactory
from tests.helpers import make_xlsx

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class TestTexto:
    def test_interpreta_lista(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/imports/text", json={"text": "João Silva\nMaria\n\njoao silva"}
        )
        assert response.status_code == 200
        body = response.json()
        assert [e["name"] for e in body["entries"]] == ["João Silva", "Maria", "joao silva"]
        assert body["entries"][2]["repeat_of"] == 1
        assert body["stats"]["empty"] == 1
        assert body["stats"]["duplicates"] == 1
        assert body["separator"] == "newline"
        assert body["source"] == "text"
        assert body["max_name_length"] == 120

    def test_valida_um_nome_digitado(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/imports/text", json={"text": "  Ana   Lima ", "separator": "newline"}
        )
        assert [e["name"] for e in response.json()["entries"]] == ["Ana Lima"]

    def test_nome_longo_vira_problema(self, client: TestClient) -> None:
        response = client.post("/api/v1/imports/text", json={"text": "x" * 121})
        body = response.json()
        assert body["entries"] == []
        assert body["issues"] == [{"row": 1, "code": "too_long"}]

    def test_separador_invalido(self, client: TestClient) -> None:
        response = client.post("/api/v1/imports/text", json={"text": "a", "separator": "pipe"})
        assert response.status_code == 422
        assert response.json()["errors"][0]["field"] == "separator"

    def test_texto_ausente(self, client: TestClient) -> None:
        response = client.post("/api/v1/imports/text", json={})
        assert response.status_code == 422
        assert response.json()["errors"] == [{"field": "text", "type": "missing"}]

    def test_texto_longo_demais(self, make_client: ClientFactory) -> None:
        client = make_client(max_text_chars=1_000)
        response = client.post("/api/v1/imports/text", json={"text": "x" * 1_001})
        assert response.status_code == 422
        assert response.json()["code"] == "text_too_long"


class TestArquivo:
    def test_xlsx(self, client: TestClient) -> None:
        data = make_xlsx([["Nome", "Área"], ["João Silva", "RH"], ["Maria Souza", "TI"]])
        response = client.post(
            "/api/v1/imports/file?format=xlsx", content=data, headers={"content-type": XLSX}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["source"] == "xlsx"
        assert [e["name"] for e in body["entries"]] == ["João Silva", "Maria Souza"]
        assert body["sheets"] == [{"index": 0, "name": "Plan1", "hidden": False}]
        assert [c["label"] for c in body["columns"]] == ["Nome", "Área"]

    def test_xlsx_escolhendo_coluna_e_aba(self, client: TestClient) -> None:
        data = make_xlsx(
            sheets={"A": [["Nome"], ["Ana"]], "B": [["Nome", "Cidade"], ["Bia", "Natal"]]}
        )
        response = client.post("/api/v1/imports/file?format=xlsx&sheet=1&column=1", content=data)
        assert [e["name"] for e in response.json()["entries"]] == ["Natal"]

    def test_csv(self, client: TestClient) -> None:
        data = "Nome;Matrícula\nAna;1\nBia;2\n".encode("cp1252")
        response = client.post("/api/v1/imports/file?format=csv", content=data)
        body = response.json()
        assert [e["name"] for e in body["entries"]] == ["Ana", "Bia"]
        assert body["separator"] == "semicolon"

    def test_arquivo_vazio(self, client: TestClient) -> None:
        response = client.post("/api/v1/imports/file?format=xlsx", content=b"")
        assert response.status_code == 422
        assert response.json()["code"] == "empty_file"

    def test_arquivo_grande_demais(self, make_client: ClientFactory) -> None:
        client = make_client(max_upload_bytes=2048)
        response = client.post("/api/v1/imports/file?format=csv", content=b"a\n" * 2000)
        assert response.status_code == 413
        assert response.json()["code"] == "file_too_large"

    def test_formato_nao_suportado(self, client: TestClient) -> None:
        response = client.post("/api/v1/imports/file", content=b"%PDF-1.7 ...")
        assert response.status_code == 415
        assert response.json()["code"] == "unsupported_file_type"

    def test_planilha_antiga(self, client: TestClient) -> None:
        response = client.post("/api/v1/imports/file", content=CFB_SIGNATURE + b"\x00" * 64)
        assert response.status_code == 422
        assert response.json()["code"] == "legacy_or_protected_spreadsheet"

    def test_aba_inexistente(self, client: TestClient) -> None:
        response = client.post("/api/v1/imports/file?sheet=4", content=make_xlsx([["Ana"]]))
        assert response.json()["code"] == "sheet_not_found"

    @pytest.mark.parametrize("query", ["sheet=-1", "column=50", "format=pdf", "header=talvez"])
    def test_opcoes_invalidas(self, client: TestClient, query: str) -> None:
        response = client.post(f"/api/v1/imports/file?{query}", content=b"Ana\n")
        assert response.status_code == 422
        assert response.json()["code"] == "invalid_request"


def test_logs_nao_contem_nomes(client: TestClient, caplog: pytest.LogCaptureFixture) -> None:
    participant = "Fulana Sigilosa da Silva"
    with caplog.at_level(logging.DEBUG):
        client.post("/api/v1/imports/text", json={"text": participant})
        client.post(
            "/api/v1/imports/file?format=xlsx", content=make_xlsx([["Nome"], [participant]])
        )
        client.post("/api/v1/imports/text", json={"text": participant, "extra": participant})
    assert caplog.records
    for record in caplog.records:
        assert "Fulana" not in str(record.__dict__)
