# Sorteia — sorteio de nomes

Plataforma web para sorteios de participantes: simples, rápida, transparente e privada.

> **Seus dados ficam apenas durante o sorteio. Não armazenamos sua lista de participantes nem seus
> resultados.**

> Projeto em desenvolvimento. Este README é atualizado a cada etapa.

## Estrutura

```
backend/   API em Python (FastAPI) — processa importações, sorteios e exportações apenas em memória
frontend/  Aplicação web (React + React Router + Vite) — guarda a sessão só na memória da aba
docs/      Arquitetura, decisões (ADRs), API e segurança
```

## Desenvolvimento local

Requisitos: Python 3.12+, [uv](https://docs.astral.sh/uv/), Node.js 22.22+.

```bash
# API (http://localhost:8000)
cd backend
uv sync
uv run uvicorn app.main:app --reload

# Web (http://localhost:5173 — faz proxy de /api para a API)
cd frontend
npm install
npm run dev
```

## Documentação

* [Arquitetura](docs/architecture.md)
* [Decisões (ADRs)](docs/decisions.md)
