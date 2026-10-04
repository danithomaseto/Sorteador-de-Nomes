# Sorteia — sorteio de nomes

Plataforma web para sortear participantes: cole uma lista ou importe uma planilha, escolha quantos
vencedores e sorteie, em uma ou várias rodadas, com resultado pronto para apresentar e exportar.

> **Seus dados ficam apenas durante o sorteio. Não armazenamos sua lista de participantes nem seus
> resultados.**

Não há banco de dados, login, cookies nem armazenamento no navegador. A lista vive na memória da aba
e some ao recarregar ou fechar a página; o servidor processa cada pedido em memória e descarta tudo
ao responder. Para sortear, o navegador envia só **quantas** pessoas estão disponíveis, nunca os
nomes.

## Funcionalidades

* **Participantes:** digitar um a um, colar uma lista (linha, vírgula ou ponto e vírgula), importar
  `.xlsx` (com escolha de aba e coluna) ou `.csv`; editar, excluir com desfazer, filtrar. Lista de
  até 50 mil nomes, virtualizada.
* **Duplicados:** nomes repetidos são apontados (ignorando acentos, maiúsculas e espaços) e nunca
  removidos sozinhos. Quem organiza decide.
* **Sorteio:** 1, 3, 5, 10, 20 ou outra quantidade; remover vencedores das próximas rodadas; permitir
  repetição na mesma rodada; várias rodadas numeradas que não podem ser refeitas.
* **Resultado:** animação curta (respeita "reduzir movimento"), revelação em lista ou um a um,
  metadados (data, hora, participantes, regras), copiar, exportar CSV ou XLSX.
* **Modo apresentação:** tela cheia para projetor, tema claro ou escuro, atalhos de teclado (Espaço
  sorteia, F alterna tela cheia, Esc sai) e tela sempre acesa.
* **Páginas públicas:** apresentação do produto, "Como funciona o sorteio" e privacidade e termos.
* **Acessibilidade:** WCAG 2.2 AA verificado automaticamente (axe), navegação completa por teclado,
  anúncios para leitores de tela, funciona a partir de 320 px de largura.

## Como é feito

| Parte | Tecnologia |
|---|---|
| API | Python 3.12, FastAPI, Pydantic, openpyxl (somente leitura, com defusedxml) |
| Sorteio | `secrets` (gerador criptográfico do sistema operacional) + Fisher–Yates parcial |
| Site | React 19, React Router 8 (SPA com páginas públicas pré-renderizadas), TypeScript, Vite, CSS Modules |
| Servidor web | Caddy 2 (HTTPS automático, cabeçalhos de segurança, CSP com hashes) |
| Testes | pytest + Hypothesis, Vitest + Testing Library + MSW, Playwright + axe-core |

```
Navegador (sessão só na memória da aba)
   │ HTTPS, mesma origem
   ▼
Caddy ── /        → site estático
      └─ /api/*   → FastAPI — sem estado, sem disco, sem banco, sem acesso à internet
```

```
backend/    API (app/: domínio, importação, exportação, serviços, rotas) e testes
frontend/   Site (src/: componentes, funcionalidades, rotas) e scripts de build
e2e/        Testes de ponta a ponta (Playwright) e planilhas de exemplo
deploy/     Caddyfile e imagem do site
docs/       Arquitetura, decisões (ADRs), API e segurança
```

---

## Rodar na sua máquina (desenvolvimento)

### 1. Instale os pré-requisitos

| Ferramenta | Versão | Como instalar |
|---|---|---|
| Git | qualquer recente | <https://git-scm.com/downloads> |
| Node.js | 22.22 ou mais nova (LTS) | <https://nodejs.org> |
| uv (gerenciador Python) | 0.8 ou mais nova | macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh \| sh` · Windows (PowerShell): `powershell -c "irm https://astral.sh/uv/install.ps1 \| iex"` |

Não é preciso instalar o Python à parte: o `uv` baixa o Python 3.12 se ele não estiver no
computador. Confira com `node --version` e `uv --version`.

### 2. Baixe o código

```bash
git clone https://github.com/danithomaseto/Sorteador-de-Nomes.git
cd Sorteador-de-Nomes
```

### 3. Suba a API (terminal 1)

```bash
cd backend
uv sync                                   # cria o ambiente e instala as dependências
uv run uvicorn app.main:app --reload      # http://localhost:8000
```

Teste: <http://localhost:8000/api/health> deve mostrar `{"status":"ok"}`. A documentação interativa
da API fica em <http://localhost:8000/api/docs> (só em desenvolvimento).

### 4. Suba o site (terminal 2)

```bash
cd frontend
npm install
npm run dev                               # http://localhost:5173
```

### 5. Use

Abra <http://localhost:5173>, clique em **Criar sorteio**, adicione nomes (ou importe
`e2e/fixtures/participantes.xlsx` como exemplo) e clique em **Sortear**.

O site encaminha `/api` para `http://127.0.0.1:8000`. Se a API estiver em outra porta:
`API_PROXY_TARGET=http://127.0.0.1:8001 npm run dev`.

---

## Rodar com Docker (igual à produção)

Requisito: [Docker](https://docs.docker.com/get-docker/) com o Compose (Docker Desktop já inclui).

```bash
cp .env.example .env            # SITE_ADDRESS=http://localhost já vem configurado
docker compose up -d --build
```

Abra <http://localhost>. Para parar: `docker compose down`.

Se a porta 80 estiver ocupada, defina `HTTP_PORT=8080` no `.env` e abra <http://localhost:8080>.

---

## Publicar na internet (produção)

1. **Servidor.** Uma máquina Linux com Docker instalado. 1 vCPU e 1 GB de memória bastam para
   começar.
2. **Domínio.** Crie um registro DNS `A` (e `AAAA`, se houver IPv6) apontando o domínio para o IP
   do servidor.
3. **Firewall.** Libere as portas **80** e **443** (TCP; e 443/UDP para HTTP/3).
4. **Código e configuração:**

   ```bash
   git clone https://github.com/danithomaseto/Sorteador-de-Nomes.git
   cd Sorteador-de-Nomes
   cp .env.example .env
   nano .env        # SITE_ADDRESS=seudominio.com.br e VITE_CONTACT_EMAIL=contato@seudominio.com.br
   ```

5. **Suba:** `docker compose up -d --build`. Na primeira requisição, o Caddy obtém o certificado
   HTTPS (Let's Encrypt) sozinho e passa a renová-lo.
6. **Confira:** `https://seudominio.com.br` abre o site e `https://seudominio.com.br/api/health`
   responde `{"status":"ok"}`.
7. **Atualizar para uma versão nova:** `git pull && docker compose up -d --build`.
8. **Acompanhar:** `docker compose ps` (estado e saúde) e `docker compose logs -f api` (logs em
   JSON, sem nomes nem IPs).

Antes de abrir ao público, percorra o [checklist de segurança e LGPD](docs/security.md#7-checklist-antes-de-publicar),
que inclui a revisão jurídica da política de privacidade e dos termos de uso.

---

## Testes e verificações

| O quê | Comando |
|---|---|
| API: lint, formatação, tipos | `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy` |
| API: testes (com cobertura) | `cd backend && uv run pytest --cov -m "not perf"` |
| API: desempenho (10 a 50 mil participantes) | `cd backend && uv run pytest -m perf` |
| Site: tipos, lint, formatação | `cd frontend && npm run typecheck && npm run lint && npm run format:check` |
| Site: testes | `cd frontend && npm test` |
| Site: build de produção | `cd frontend && npm run build` |
| Ponta a ponta (navegador real) | `cd e2e && npm ci && npx playwright install chromium && npx playwright test` |
| Dependências vulneráveis | `cd backend && uv run pip-audit` · `cd frontend && npm audit --omit=dev` |

Os testes de ponta a ponta sobem sozinhos a API e uma prévia do build de produção com os mesmos
cabeçalhos e CSP do Caddy. Para rodá-los contra a pilha do Docker, suba-a com
`APP_RATE_LIMIT_ENABLED=false` no `.env` e use `E2E_BASE_URL=http://localhost npx playwright test`.

Prévia local do build de produção (com a API rodando na porta 8000):
`cd frontend && npm run build && npm start` → <http://127.0.0.1:4173>.

O CI (`.github/workflows/ci.yml`) roda tudo isso a cada pull request, além de construir as imagens
Docker e testar a pilha completa.

---

## Variáveis de ambiente

**API** (prefixo `APP_`, todas opcionais):

| Variável | Padrão | Para quê |
|---|---|---|
| `APP_ENV` | `development` (`production` na imagem) | Ambiente |
| `APP_LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING` ou `ERROR` |
| `APP_DOCS_ENABLED` | `true` (`false` na imagem) | Expõe `/api/docs` |
| `APP_MAX_PARTICIPANTS` | `50000` | Participantes por sorteio |
| `APP_MAX_ROUND_QUANTITY` | `10000` | Vencedores por rodada |
| `APP_MAX_UPLOAD_BYTES` | `5242880` (5 MB) | Tamanho do arquivo importado |
| `APP_MAX_UNCOMPRESSED_BYTES` | `52428800` (50 MB) | Planilha descompactada |
| `APP_MAX_TEXT_CHARS` | `2000000` | Texto colado |
| `APP_MAX_BODY_BYTES` | `8388608` (8 MB) | Corpo de qualquer requisição |
| `APP_MAX_EXPORT_ROUNDS` | `1000` | Rodadas por exportação |
| `APP_RATE_LIMIT_ENABLED` | `true` | Limite de requisições por IP |
| `APP_RATE_LIMIT_IMPORTS` / `_ROUNDS` / `_EXPORTS` | `60/minute` / `120/minute` / `60/minute` | Limites por rota |

O site lê os limites da API (`/api/v1/limits`), então valida com os mesmos valores.

**Implantação e ferramentas:**

| Variável | Onde | Para quê |
|---|---|---|
| `SITE_ADDRESS` | `.env` (Docker) | Domínio do site (`http://localhost` para testar) |
| `HTTP_PORT`, `HTTPS_PORT` | `.env` (Docker) | Portas publicadas (padrão 80 e 443) |
| `VITE_CONTACT_EMAIL` | `.env` ou build do site | E-mail de contato na página de privacidade |
| `API_PROXY_TARGET` | `npm run dev` | Endereço da API em desenvolvimento |
| `API_TARGET`, `PORT` | `npm start` | API e porta da prévia do build |
| `E2E_BASE_URL` | testes E2E | Testar um ambiente já no ar |
| `PLAYWRIGHT_CHROMIUM_PATH` | testes E2E | Usar um Chromium já instalado |

---

## Problemas comuns

* **"Sem conexão com o servidor" ao adicionar nomes ou sortear:** a API não está rodando (passo 3)
  ou está em outra porta (use `API_PROXY_TARGET`).
* **A lista sumiu ao recarregar a página:** é intencional. Nada é guardado; exporte o resultado se
  precisar de um registro.
* **"Muitas tentativas em pouco tempo":** o limite de requisições por IP foi atingido; aguarde um
  minuto.
* **O HTTPS não funciona em produção:** confira se o DNS já aponta para o servidor e se as portas
  80 e 443 estão abertas; veja `docker compose logs web`.
* **Porta 5173, 8000 ou 80 ocupada:** `npm run dev -- --port 5174`,
  `uv run uvicorn app.main:app --reload --port 8001` (com `API_PROXY_TARGET`) ou `HTTP_PORT` no `.env`.

---

## Documentação

* [Arquitetura](docs/architecture.md): onde ficam os dados, camadas, fluxo de uma rodada,
  implantação e escala
* [Decisões (ADRs)](docs/decisions.md)
* [API](docs/api.md): rotas, exemplos e códigos de erro
* [Segurança e privacidade](docs/security.md): ameaças, cabeçalhos, logs, LGPD e checklist
