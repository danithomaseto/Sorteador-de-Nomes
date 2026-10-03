from dataclasses import dataclass

# Planilhas muito largas são truncadas: só as primeiras colunas são oferecidas para escolha.
MAX_COLUMNS = 50
# Leitura de uma aba termina depois de tantas linhas vazias seguidas (planilhas com formatação
# aplicada à coluna inteira chegam a ter 1 milhão de linhas "vazias").
MAX_BLANK_STREAK = 10_000


@dataclass(frozen=True, slots=True)
class ImportLimits:
    max_bytes: int
    max_uncompressed_bytes: int
    max_rows: int
    max_text_chars: int
    max_columns: int = MAX_COLUMNS
    max_blank_streak: int = MAX_BLANK_STREAK
