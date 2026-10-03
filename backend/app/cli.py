"""Comandos de apoio: ``python -m app.cli openapi`` imprime o contrato OpenAPI (JSON)."""

import argparse
import json
import sys

from app.core.config import Settings
from app.main import create_app


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("openapi", help="imprime o contrato OpenAPI")
    args = parser.parse_args(argv)

    if args.command == "openapi":
        schema = create_app(Settings(docs_enabled=True, log_level="WARNING")).openapi()
        sys.stdout.write(json.dumps(schema, ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
