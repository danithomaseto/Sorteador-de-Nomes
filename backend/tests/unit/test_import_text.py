from dataclasses import replace

import pytest

from app.importing import preview_text
from app.importing.errors import TextTooLongError, TooManyRowsError
from app.importing.preview import IssueCode, Preview
from tests.helpers import DEFAULT_LIMITS


def names(preview: Preview) -> list[str]:
    return [entry.name for entry in preview.entries]


def parse(text: str, **options: object) -> Preview:
    params: dict[str, object] = {"separator": "auto", "header": "auto", "column": None}
    params.update(options)
    return preview_text(text, limits=DEFAULT_LIMITS, **params)  # type: ignore[arg-type]


class TestSeparadores:
    def test_uma_pessoa_por_linha(self) -> None:
        preview = parse("João\nMaria\nPedro\nAna\nLucas")
        assert names(preview) == ["João", "Maria", "Pedro", "Ana", "Lucas"]
        assert preview.separator == "newline"
        assert [entry.row for entry in preview.entries] == [1, 2, 3, 4, 5]

    def test_virgula_em_uma_linha(self) -> None:
        preview = parse("João, Maria, Pedro")
        assert names(preview) == ["João", "Maria", "Pedro"]
        assert preview.separator == "comma"

    def test_ponto_e_virgula_tem_prioridade_sobre_virgula(self) -> None:
        preview = parse("Silva, João; Souza, Maria")
        assert names(preview) == ["Silva, João", "Souza, Maria"]
        assert preview.separator == "semicolon"

    def test_varias_linhas_nao_quebram_na_virgula(self) -> None:
        preview = parse("Silva, João\nSouza, Maria")
        assert names(preview) == ["Silva, João", "Souza, Maria"]

    def test_separador_escolhido_pelo_usuario(self) -> None:
        preview = parse("Ana, Bia\nCaio, Davi", separator="comma")
        assert names(preview) == ["Ana", "Bia", "Caio", "Davi"]
        assert preview.separator == "comma"

    def test_quebras_de_linha_do_windows(self) -> None:
        assert names(parse("Ana\r\nBia\r\n")) == ["Ana", "Bia"]

    def test_um_unico_nome(self) -> None:
        preview = parse("Maria Souza")
        assert names(preview) == ["Maria Souza"]
        assert preview.separator == "newline"


class TestLinhasELimpeza:
    def test_linhas_vazias_sao_ignoradas_e_contadas(self) -> None:
        preview = parse("Ana\n\n   \nBia\n")
        assert names(preview) == ["Ana", "Bia"]
        assert preview.stats.empty == 2
        assert [entry.row for entry in preview.entries] == [1, 4]

    def test_espacos_e_acentos(self) -> None:
        assert names(parse("  José   da   Conceição  ")) == ["José da Conceição"]

    def test_nome_longo_demais_vira_problema_na_linha(self) -> None:
        preview = parse("Ana\n" + "x" * 121 + "\nBia")
        assert names(preview) == ["Ana", "Bia"]
        assert preview.issues == (replace(preview.issues[0], row=2, code=IssueCode.TOO_LONG),)
        assert preview.stats.invalid == 1

    def test_texto_vazio(self) -> None:
        preview = parse("")
        assert preview.entries == ()
        assert preview.stats.valid == 0


class TestDuplicados:
    def test_agrupa_variacoes_sem_remover(self) -> None:
        preview = parse("João Silva\njoao  silva\nMaria\nJOÃO SILVA")
        assert len(preview.entries) == 4
        assert preview.stats.duplicates == 2
        assert preview.stats.duplicate_groups == 1
        group = preview.duplicate_groups[0]
        assert (group.name, group.count, group.rows) == ("João Silva", 3, (1, 2, 4))

    def test_marca_a_primeira_ocorrencia(self) -> None:
        preview = parse("Ana\nBia\nana")
        assert [entry.repeat_of for entry in preview.entries] == [None, None, 1]

    def test_mesma_chave_para_variacoes(self) -> None:
        preview = parse("José\njose")
        assert preview.entries[0].key == preview.entries[1].key


class TestColunasColadas:
    def test_colunas_de_planilha_viram_tabela(self) -> None:
        preview = parse("Nome\tMatrícula\nAna Lima\t123\nBia Souza\t456")
        assert preview.separator == "tab"
        assert preview.has_header is True
        assert [column.label for column in preview.columns] == ["Nome", "Matrícula"]
        assert preview.column == 0
        assert names(preview) == ["Ana Lima", "Bia Souza"]

    def test_usuario_escolhe_outra_coluna(self) -> None:
        preview = parse("Nome\tCidade\nAna\tRecife\nBia\tNatal", column=1)
        assert names(preview) == ["Recife", "Natal"]


class TestLimites:
    def test_texto_longo_demais(self) -> None:
        limits = replace(DEFAULT_LIMITS, max_text_chars=10)
        with pytest.raises(TextTooLongError):
            preview_text("x" * 11, separator="auto", header="auto", column=None, limits=limits)

    def test_itens_demais(self) -> None:
        limits = replace(DEFAULT_LIMITS, max_rows=3)
        with pytest.raises(TooManyRowsError) as exc:
            preview_text("a\nb\nc\nd", separator="auto", header="auto", column=None, limits=limits)
        assert exc.value.params == {"max_rows": 3}
