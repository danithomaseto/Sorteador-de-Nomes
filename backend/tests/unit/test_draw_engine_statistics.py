"""Testes estatísticos: o algoritmo não pode favorecer participantes nem posições.

Os testes com seed fixa são determinísticos (nunca oscilam no CI). O limite usado é o valor
crítico do qui-quadrado para α = 0,001 (tabela padrão): um algoritmo correto passa; um erro
clássico (por exemplo, trocar com um índice em ``[0, n)`` em vez de ``[i, n)``) falha.
"""

from collections import Counter
from collections.abc import Iterable
from itertools import permutations, product

from app.domain.draw_engine import SecretsRandomSource, SeededRandomSource, draw

# Valores críticos do qui-quadrado para α = 0,001, por graus de liberdade.
CHI2_CRITICAL_0001 = {4: 18.467, 5: 20.515, 8: 26.124, 9: 27.877, 11: 31.264}


def chi_square(observed: Counter[object], categories: Iterable[object], total: int) -> float:
    keys = list(categories)
    expected = total / len(keys)
    return sum((observed.get(key, 0) - expected) ** 2 / expected for key in keys)


def test_cada_participante_tem_a_mesma_chance() -> None:
    source = SeededRandomSource(2026)
    trials = 50_000
    counts: Counter[object] = Counter()
    for _ in range(trials):
        counts.update(draw(range(10), 1, allow_repeat=False, rng=source).winners)
    assert chi_square(counts, range(10), trials) < CHI2_CRITICAL_0001[9]


def test_cada_posicao_do_resultado_e_uniforme() -> None:
    source = SeededRandomSource(31)
    trials = 30_000
    per_position: list[Counter[object]] = [Counter(), Counter(), Counter()]
    for _ in range(trials):
        result = draw(range(6), 3, allow_repeat=False, rng=source)
        for position, winner in enumerate(result.winners):
            per_position[position][winner] += 1
    for counts in per_position:
        assert chi_square(counts, range(6), trials) < CHI2_CRITICAL_0001[5]


def test_todas_as_sequencias_ordenadas_sao_equiprovaveis() -> None:
    source = SeededRandomSource(77)
    trials = 24_000
    counts: Counter[object] = Counter()
    for _ in range(trials):
        counts[draw(range(4), 2, allow_repeat=False, rng=source).winners] += 1
    assert chi_square(counts, permutations(range(4), 2), trials) < CHI2_CRITICAL_0001[11]


def test_com_repeticao_os_pares_sao_independentes_e_uniformes() -> None:
    source = SeededRandomSource(5)
    trials = 27_000
    counts: Counter[object] = Counter()
    for _ in range(trials):
        counts[draw(range(3), 2, allow_repeat=True, rng=source).winners] += 1
    assert chi_square(counts, product(range(3), repeat=2), trials) < CHI2_CRITICAL_0001[8]


def test_fonte_de_producao_e_uniforme() -> None:
    """Com o CSPRNG real o teste não é determinístico, então a margem é larga: ±10% em torno de
    10.000 ocorrências equivale a mais de 10 desvios-padrão (falso alarme praticamente impossível).
    Ainda assim, detecta uma fonte quebrada (constante, enviesada ou com faixa errada)."""
    source = SecretsRandomSource()
    trials = 100_000
    counts = Counter(
        draw(range(10), 1, allow_repeat=False, rng=source).winners[0] for _ in range(trials)
    )
    assert set(counts) == set(range(10))
    for occurrences in counts.values():
        assert 9_000 < occurrences < 11_000
