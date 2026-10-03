"""Casos do motor de sorteio exigidos pelo briefing (§11) e invariantes básicos."""

import secrets
from dataclasses import dataclass

import pytest

from app.domain.draw_engine import (
    WITH_REPETITION,
    WITHOUT_REPETITION,
    EmptyPoolError,
    InsufficientParticipantsError,
    InvalidQuantityError,
    SecretsRandomSource,
    SeededRandomSource,
    draw,
)


@dataclass(frozen=True)
class Person:
    id: int
    name: str


def rng(seed: int = 7) -> SeededRandomSource:
    return SeededRandomSource(seed)


class TestValidacao:
    def test_lista_vazia_gera_erro(self) -> None:
        with pytest.raises(EmptyPoolError) as exc:
            draw([], 1, allow_repeat=False, rng=rng())
        assert exc.value.code == "empty_pool"

    def test_lista_vazia_com_repeticao_tambem_gera_erro(self) -> None:
        with pytest.raises(EmptyPoolError):
            draw([], 3, allow_repeat=True, rng=rng())

    @pytest.mark.parametrize("quantity", [0, -1, -50])
    def test_quantidade_menor_que_um_gera_erro(self, quantity: int) -> None:
        with pytest.raises(InvalidQuantityError) as exc:
            draw(["Ana"], quantity, allow_repeat=False, rng=rng())
        assert exc.value.params == {"quantity": quantity}

    def test_booleano_nao_e_quantidade_valida(self) -> None:
        with pytest.raises(InvalidQuantityError):
            draw(["Ana"], True, allow_repeat=False, rng=rng())

    def test_quantidade_maior_que_participantes_sem_repeticao_gera_erro(self) -> None:
        with pytest.raises(InsufficientParticipantsError) as exc:
            draw(["Ana", "Bia"], 3, allow_repeat=False, rng=rng())
        assert exc.value.code == "insufficient_participants"
        assert exc.value.params == {"available": 2, "requested": 3}
        assert "Há 2 participantes disponíveis e 3 foram solicitados" in exc.value.detail

    def test_mensagem_no_singular(self) -> None:
        with pytest.raises(InsufficientParticipantsError) as exc:
            draw(["Ana"], 2, allow_repeat=False, rng=rng())
        assert "Há 1 participante disponível e 2 foram solicitados" in exc.value.detail


class TestSemRepeticao:
    def test_um_participante(self) -> None:
        result = draw(["Ana"], 1, allow_repeat=False, rng=rng())
        assert result.winners == ("Ana",)
        assert result.positions == (0,)
        assert result.remaining == ()

    def test_quantidade_menor_que_participantes(self) -> None:
        names = [f"Pessoa {i}" for i in range(20)]
        result = draw(names, 5, allow_repeat=False, rng=rng())
        assert len(result.winners) == 5
        assert len(set(result.winners)) == 5
        assert set(result.winners) <= set(names)
        assert len(result.remaining) == 15

    def test_quantidade_igual_ao_total_gera_permutacao_completa(self) -> None:
        names = [f"Pessoa {i}" for i in range(30)]
        result = draw(names, 30, allow_repeat=False, rng=rng())
        assert sorted(result.winners) == sorted(names)
        assert result.remaining == ()

    def test_vencedores_nunca_se_repetem(self) -> None:
        for seed in range(200):
            result = draw(list(range(10)), 10, allow_repeat=False, rng=rng(seed))
            assert len(set(result.positions)) == 10

    def test_algoritmo_registrado(self) -> None:
        result = draw(["Ana", "Bia"], 1, allow_repeat=False, rng=rng(3))
        assert result.algorithm == f"{WITHOUT_REPETITION}+seeded-prng/3"


class TestComRepeticao:
    def test_um_participante_pode_ganhar_varias_vezes(self) -> None:
        result = draw(["Ana"], 4, allow_repeat=True, rng=rng())
        assert result.winners == ("Ana", "Ana", "Ana", "Ana")
        assert result.remaining == ()

    def test_quantidade_maior_que_participantes_e_permitida(self) -> None:
        result = draw(["Ana", "Bia"], 50, allow_repeat=True, rng=rng())
        assert len(result.winners) == 50
        assert set(result.winners) <= {"Ana", "Bia"}

    def test_repeticao_de_fato_acontece(self) -> None:
        result = draw(["Ana", "Bia"], 50, allow_repeat=True, rng=rng())
        assert len(set(result.winners)) < len(result.winners)

    def test_restantes_excluem_quem_ganhou(self) -> None:
        result = draw(list(range(100)), 5, allow_repeat=True, rng=rng())
        assert set(result.remaining) == set(range(100)) - set(result.winners)

    def test_algoritmo_registrado(self) -> None:
        result = draw(["Ana"], 2, allow_repeat=True, rng=rng(9))
        assert result.algorithm == f"{WITH_REPETITION}+seeded-prng/9"


class TestParticipantesDuplicados:
    def test_nomes_iguais_sao_candidatos_distintos(self) -> None:
        candidates = [Person(1, "João Silva"), Person(2, "João Silva")]
        result = draw(candidates, 2, allow_repeat=False, rng=rng())
        assert {p.id for p in result.winners} == {1, 2}

    def test_entradas_identicas_continuam_separadas_por_posicao(self) -> None:
        result = draw(["João", "João", "Maria"], 3, allow_repeat=False, rng=rng())
        assert sorted(result.positions) == [0, 1, 2]
        assert sorted(result.winners) == ["João", "João", "Maria"]


class TestMultiplasRodadas:
    def test_remover_vencedores_entre_rodadas(self) -> None:
        pool: tuple[int, ...] = tuple(range(100))
        already_won: set[int] = set()
        for expected_remaining in (95, 90, 85):
            result = draw(pool, 5, allow_repeat=False, rng=rng(expected_remaining))
            assert already_won.isdisjoint(result.winners)
            already_won.update(result.winners)
            pool = result.remaining
            assert len(pool) == expected_remaining
        assert set(pool) | already_won == set(range(100))

    def test_rodadas_ate_esgotar_a_lista(self) -> None:
        pool: tuple[str, ...] = ("Ana", "Bia", "Caio")
        winners: list[str] = []
        while pool:
            result = draw(pool, 1, allow_repeat=False, rng=rng(len(pool)))
            winners.extend(result.winners)
            pool = result.remaining
        assert sorted(winners) == ["Ana", "Bia", "Caio"]
        with pytest.raises(EmptyPoolError):
            draw(pool, 1, allow_repeat=False, rng=rng())


class TestResultado:
    def test_restantes_preservam_ordem_original(self) -> None:
        names = [f"P{i:02d}" for i in range(15)]
        result = draw(names, 4, allow_repeat=False, rng=rng())
        assert list(result.remaining) == [n for n in names if n not in result.winners]

    def test_posicoes_correspondem_aos_vencedores(self) -> None:
        names = ["Ana", "Bia", "Caio", "Davi"]
        result = draw(names, 3, allow_repeat=False, rng=rng())
        assert tuple(names[p] for p in result.positions) == result.winners

    def test_metadados(self) -> None:
        result = draw(range(10), 3, allow_repeat=False, rng=rng())
        assert (result.pool_size, result.quantity, result.allow_repeat) == (10, 3, False)

    def test_nao_altera_a_lista_recebida(self) -> None:
        names = ["Ana", "Bia", "Caio"]
        draw(names, 3, allow_repeat=False, rng=rng())
        assert names == ["Ana", "Bia", "Caio"]

    def test_mesma_seed_reproduz_o_resultado(self) -> None:
        first = draw(range(1000), 10, allow_repeat=False, rng=rng(42))
        second = draw(range(1000), 10, allow_repeat=False, rng=rng(42))
        assert first == second

    def test_seeds_diferentes_geram_resultados_diferentes(self) -> None:
        first = draw(range(1000), 10, allow_repeat=False, rng=rng(1))
        second = draw(range(1000), 10, allow_repeat=False, rng=rng(2))
        assert first.positions != second.positions


class TestFonteDeProducao:
    def test_usa_o_modulo_secrets(self, monkeypatch: pytest.MonkeyPatch) -> None:
        calls: list[int] = []

        def fake_randbelow(upper: int) -> int:
            calls.append(upper)
            return 0

        monkeypatch.setattr(secrets, "randbelow", fake_randbelow)
        result = draw(["Ana", "Bia", "Caio"], 2, allow_repeat=False, rng=SecretsRandomSource())
        assert calls == [3, 2]
        assert result.algorithm == f"{WITHOUT_REPETITION}+os-csprng"

    def test_resultados_reais_respeitam_os_invariantes(self) -> None:
        source = SecretsRandomSource()
        for _ in range(100):
            result = draw(range(50), 10, allow_repeat=False, rng=source)
            assert len(set(result.positions)) == 10
            assert all(0 <= p < 50 for p in result.positions)
