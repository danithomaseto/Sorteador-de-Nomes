"""Proteção contra injeção de fórmula em planilhas (CSV/formula injection, OWASP).

Um nome como ``=HYPERLINK("http://…")`` seria executado como fórmula ao abrir o arquivo no
Excel. No CSV, valores que começam com ``= + - @``, tab ou CR recebem um apóstrofo na frente
(recomendação OWASP). No XLSX, as células de texto são gravadas com o tipo "string" explícito,
então nunca são interpretadas como fórmula.
"""

FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")


def neutralize_formula(value: str) -> str:
    return f"'{value}" if value.startswith(FORMULA_TRIGGERS) else value
