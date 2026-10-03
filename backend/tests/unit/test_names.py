import unicodedata

import pytest

from app.domain.names import (
    MAX_NAME_LENGTH,
    InvalidNameError,
    NameProblem,
    clean_name,
    match_key,
    name_problem,
    normalize_name,
)

NBSP = chr(0x00A0)
ZERO_WIDTH_SPACE = chr(0x200B)
RIGHT_TO_LEFT_OVERRIDE = chr(0x202E)
BOM = chr(0xFEFF)
ZWJ = chr(0x200D)
COMBINING_TILDE = chr(0x0303)


class TestNormalizacao:
    def test_remove_espacos_extras(self) -> None:
        assert normalize_name("   João    Silva   ") == "João Silva"

    def test_tabs_quebras_e_espaco_nao_separavel_viram_espaco(self) -> None:
        assert normalize_name(f"João\tda\nSilva{NBSP}Souza") == "João da Silva Souza"

    def test_remove_caracteres_invisiveis(self) -> None:
        raw = f"{BOM}Ma{ZERO_WIDTH_SPACE}ria {RIGHT_TO_LEFT_OVERRIDE}Lima"
        assert normalize_name(raw) == "Maria Lima"

    def test_remove_caracteres_de_controle(self) -> None:
        assert normalize_name("Ana\x00\x07 Paula\x1b") == "Ana Paula"

    def test_converte_para_nfc(self) -> None:
        decomposed = "Joa" + COMBINING_TILDE + "o"
        normalized = normalize_name(decomposed)
        assert normalized == "João"
        assert unicodedata.is_normalized("NFC", normalized)

    def test_preserva_maiusculas_e_acentos(self) -> None:
        assert normalize_name("JOSÉ da Conceição") == "JOSÉ da Conceição"

    def test_preserva_emoji_composto(self) -> None:
        family = f"{chr(0x1F468)}{ZWJ}{chr(0x1F469)}{ZWJ}{chr(0x1F467)}"
        assert normalize_name(f"Família {family}") == f"Família {family}"

    def test_texto_so_com_espacos_fica_vazio(self) -> None:
        assert normalize_name(f"  \t {NBSP} {ZERO_WIDTH_SPACE}") == ""


class TestValidacao:
    def test_nome_vazio(self) -> None:
        assert name_problem("") is NameProblem.EMPTY

    def test_nome_no_limite(self) -> None:
        assert name_problem("a" * MAX_NAME_LENGTH) is None

    def test_nome_longo_demais(self) -> None:
        assert name_problem("a" * (MAX_NAME_LENGTH + 1)) is NameProblem.TOO_LONG

    def test_clean_name_normaliza(self) -> None:
        assert clean_name("  Ana   Lima ") == "Ana Lima"

    def test_clean_name_recusa_vazio(self) -> None:
        with pytest.raises(InvalidNameError) as exc:
            clean_name("   ")
        assert exc.value.params == {"reason": "empty"}

    def test_clean_name_recusa_longo_com_limite_proprio(self) -> None:
        with pytest.raises(InvalidNameError) as exc:
            clean_name("x" * 101, max_length=100)
        assert exc.value.params == {"reason": "too_long", "max_length": 100}


class TestChaveDeDuplicidade:
    @pytest.mark.parametrize(
        "variant",
        [
            "João Silva",
            "joão silva",
            "JOAO SILVA",
            "Joao   Silva",
            "joa" + COMBINING_TILDE + "o silva",
        ],
    )
    def test_variacoes_tem_a_mesma_chave(self, variant: str) -> None:
        assert match_key(normalize_name(variant)) == match_key("João Silva")

    def test_caracteres_de_largura_total(self) -> None:
        full_width = "".join(chr(ord(c) + 0xFEE0) for c in "Ana")
        assert match_key(full_width) == "ana"

    def test_nomes_diferentes_tem_chaves_diferentes(self) -> None:
        assert match_key("Ana Lima") != match_key("Ana Lins")
