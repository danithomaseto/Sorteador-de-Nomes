"""Texto colado ou digitado: uma pessoa por linha, ou separadas por ponto e vírgula ou vírgula."""

import re
from typing import Literal

type SeparatorOption = Literal["auto", "newline", "semicolon", "comma"]
type Separator = Literal["newline", "semicolon", "comma"]

_TAB_SHARE = 0.5


def resolve_separator(text: str, option: SeparatorOption) -> Separator:
    """Detecção automática: mais de uma linha com conteúdo → uma pessoa por linha (assim
    "Silva, João" não é quebrado); senão ponto e vírgula; senão vírgula."""
    if option != "auto":
        return option
    non_empty_lines = sum(1 for line in text.splitlines() if line.strip())
    if non_empty_lines >= 2:
        return "newline"
    if ";" in text:
        return "semicolon"
    if "," in text:
        return "comma"
    return "newline"


def looks_tabular(text: str) -> bool:
    """Colunas coladas de uma planilha chegam separadas por tab."""
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return False
    with_tab = sum(1 for line in lines if "\t" in line.strip())
    return with_tab / len(lines) >= _TAB_SHARE


def split_text(text: str, separator: Separator) -> list[tuple[int, str]]:
    """Itens numerados a partir de 1: número da linha (por linha) ou posição do item."""
    if separator == "newline":
        return [(number, line) for number, line in enumerate(text.splitlines(), start=1)]
    pattern = r"[;\r\n]+" if separator == "semicolon" else r"[,\r\n]+"
    return list(enumerate(re.split(pattern, text), start=1))
