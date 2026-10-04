# Registro de decisões (ADRs)

Cada decisão segue o formato **Contexto → Decisão → Consequências**. Decisões novas entram no fim;
decisões substituídas são marcadas, nunca apagadas.

---

## ADR-001 — Monólito modular

**Contexto.** Produto inicial, uma equipe pequena, tráfego modesto.
**Decisão.** Um backend (FastAPI) e um frontend (SPA), organizados em módulos com regra de
dependência explícita. Sem microsserviços, filas ou cache distribuído.
**Consequências.** Deploy simples. As fronteiras (`domain/`, `importing/`, `exporting/`) já estão
definidas caso algum módulo precise evoluir sozinho.

## ADR-002 — Sorteio executado no servidor ~~e gravado~~

*Revisada pela ADR-017 (sem persistência) e pela ADR-018 (minimização).*

**Decisão vigente.** Os vencedores são escolhidos no servidor, pelo motor em Python com o gerador
criptográfico do sistema operacional, e o horário oficial da rodada é o do servidor. O servidor não
grava nada: o resultado existe apenas na sessão do usuário e nos arquivos que ele exportar.
**Consequências.** Exige conexão no momento do sorteio (a requisição tem poucos bytes). Como nada é
gravado no servidor, a transparência se apoia em: algoritmo documentado, rodadas numeradas que nunca
são sobrescritas na sessão, exportação com metadados e a página "Como funciona".

## ADR-003 — ~~Sessão anônima por cookie~~

*Substituída pela ADR-017.* Não há sessão no servidor nem cookies.

## ADR-004 — Aleatoriedade: `secrets` + Fisher–Yates parcial

**Decisão.** Produção usa `secrets.randbelow` (CSPRNG do sistema operacional, amostragem por
rejeição sem viés de módulo) e Fisher–Yates parcial explícito. Seed apenas em testes.
**Por que não `random`.** O Mersenne Twister tem boa distribuição, mas é previsível: com ~624 saídas
observadas, o estado interno pode ser reconstruído.
**Por que não `random.sample`.** Queremos um algoritmo documentado, estável entre versões do Python,
explicável na página de transparência e versionado (`algorithm` em cada rodada).
**O que comunicamos.** "Cada participante disponível tem a mesma probabilidade, usando o gerador
criptográfico do sistema operacional." **Não** comunicamos "comprovadamente justo" ou "impossível de
manipular".

## ADR-005 — Rodadas imutáveis

**Decisão.** Rodadas só são adicionadas ao histórico da sessão. "Sortear novamente" cria uma nova
rodada. Não existe "refazer" nem edição de resultado. O histórico some apenas com a sessão.

## ADR-006 — Repetição e remoção são regras independentes

**Contexto.** O briefing usa "repetição" em dois sentidos: dentro da rodada (§8–9) e entre rodadas
(§37).
**Decisão.**

| Repetir na mesma rodada | Remover vencedores | Comportamento |
|---|---|---|
| Não (padrão) | Sim (padrão) | vencedores distintos; saem das próximas rodadas (100 → 95 → 90) |
| Não | Não | vencedores distintos em cada rodada; todos voltam na seguinte |
| Sim | Não | sorteio com reposição; quantidade pode passar do tamanho da lista |
| Sim | Sim | com reposição na rodada; quem ganhou sai das próximas |

"Remover" marca o participante (`removedInRound`); "Restaurar participantes" devolve todos.

## ADR-007 — Importação sem estado

**Decisão.** A pré-visualização não grava nada. O arquivo é enviado como corpo bruto (não
multipart, cujo parser grava partes grandes em arquivos temporários), lido em memória com limite de
tamanho e descartado ao fim da requisição. Para trocar de aba/coluna o navegador reenvia o arquivo.
As opções viajam como índices (`sheet=0`, `column=2`), nunca como nomes de abas ou de arquivos.

## ADR-008 — Mesma origem

**Decisão.** Frontend e API sob o mesmo domínio (Caddy em produção, proxy do Vite em
desenvolvimento). CORS desabilitado.

## ADR-009 — Contrato gerado

**Decisão.** O backend é a fonte do contrato (Pydantic → OpenAPI). O frontend gera os tipos com
`openapi-typescript` e usa `openapi-fetch`. O CI falha se os tipos gerados estiverem desatualizados.

## ADR-010 — Estilos e componentes

**Decisão.** CSS Modules + design tokens em custom properties. Componentes próprios sobre HTML nativo
acessível (`<dialog>`, `<select>`, `input type="checkbox" role="switch"`, grupos de rádio). Sem
biblioteca de UI e sem Tailwind.
**Por quê.** Identidade visual própria, zero custo em tempo de execução, acessibilidade nativa.

## ADR-011 — Erros RFC 9457

**Decisão.** Erros em `application/problem+json` com `code` estável e `params`. O frontend traduz
`code` em mensagens amigáveis; `detail` (pt-BR) é fallback. Erros inesperados devolvem `500` genérico
com `request_id`; nada de stack trace para o usuário.

## ADR-012 — ~~Retenção de 30 dias sem uso~~

*Substituída pela ADR-017.* Não há dados a reter.

## ADR-013 — Terminologia

**Decisão.** **Sorteio** = a lista e suas regras. **Rodada** = cada execução. "Novo sorteio" descarta a
sessão e começa outra; "Sortear novamente" cria uma nova rodada na mesma lista.

## ADR-014 — "Modo de apresentação" no formulário

**Decisão.** O campo "modo de apresentação" do item 5.1 do briefing vira a preferência de exibição do
resultado (`revealMode`: lista compacta ou um a um) mais a ação "Apresentar em tela cheia".

## ADR-015 — Stack

| Camada | Escolha | Alternativas descartadas |
|---|---|---|
| Frontend | React 19 + TypeScript 5.9 + Vite 8 + React Router 8 (modo framework, SPA + pré-renderização) | HTML/JS puro (estado demais para gerir à mão); Next.js (recursos de servidor sobrepostos ao FastAPI e Node em produção para só 3 páginas com SEO) |
| Backend | Python 3.12 + FastAPI + Pydantic v2, sem estado | Flask (validação e OpenAPI via extensões, tipagem mais fraca) |
| Banco | **nenhum** (ADR-017) | SQLite/PostgreSQL — aprovados inicialmente, removidos pela regra de não persistência |
| Planilhas | openpyxl + defusedxml; `csv` da biblioteca padrão | pandas (pesado e desnecessário) |
| Rate limit | `limits` em memória, por processo | Redis — desnecessário enquanto os limites forem aproximados por processo |

Notas de versão:
* **TypeScript 5.9** (não 7.0): `typescript-eslint` e `openapi-typescript` ainda não suportam o
  compilador nativo.
* **ESLint 9** (linha de manutenção): `eslint-plugin-jsx-a11y` ainda não declara suporte ao ESLint 10.
  Atualizar quando o plugin suportar.

## ADR-016 — Identidade visual

**Decisão.** Nome provisório **Sorteia** (constante `APP_NAME`; trocar não exige refatoração).
Identidade "bilhete": tinta `#1B1A17` + amarelo `#F2B300`, fundo papel `#F6F5F1`. Tipografia Archivo
(variável, com eixo de largura para nomes longos) e IBM Plex Mono para numerais. Fontes servidas pelo
próprio site (sem CDN de terceiros).
**Pendências antes do lançamento.** Busca de marca no INPI (classes 9 e 42), registro.br, `.com` e
perfis sociais.

## ADR-017 — Sem persistência (regra fundamental de privacidade)

**Contexto.** Decisão de produto: todos os dados inseridos pelo usuário — nomes, arquivos,
configurações, resultados e histórico — devem existir apenas durante a sessão de uso.
**Decisão.**
* Nenhum banco de dados (nem SQLite, nem PostgreSQL), nenhum armazenamento em disco no servidor.
* Nenhum cadastro, login, cookie ou sessão no servidor.
* No navegador, os dados vivem só na memória JavaScript da aba. Proibido `localStorage`,
  `sessionStorage`, IndexedDB e equivalentes — garantido por regra de lint.
* O backend processa importações, sorteios e exportações apenas em memória, dentro de cada requisição.
* Mensagem de produto: "Seus dados ficam apenas durante o sorteio. Não armazenamos sua lista de
  participantes nem seus resultados."
**Consequências.**
* (+) Privacidade máxima e superfície de ataque mínima: não há dados para vazar no servidor.
* (+) Backend sem estado: escala horizontalmente sem sessão "grudada"; deploy sem banco nem backups.
* (−) Recarregar ou fechar a aba descarta tudo. Mitigação: confirmação do navegador antes de sair
  com dados; exportação CSV/XLSX como registro controlado pelo próprio usuário.
* (−) Sem "meus sorteios", sem retomar em outro dispositivo, apresentação na mesma aba.
* Substitui as ADRs 003 e 012 e revisa a ADR-002.

## ADR-018 — Minimização no sorteio

**Decisão.** Para executar uma rodada o navegador envia apenas `pool_size` (quantos disponíveis),
`quantity` e `allow_repeat`. O servidor devolve as posições sorteadas; o navegador as traduz para os
participantes da lista congelada no momento do clique.
**Por quê.** Escolher posições não exige nomes. O motor continua recebendo uma lista de candidatos
(`range(pool_size)`), então sua interface e seus testes não mudam.

## ADR-019 — Sem biblioteca de cache de servidor no frontend

**Decisão.** TanStack Query foi removido: sem persistência não existe "estado do servidor" para
cachear — só chamadas pontuais (importar, sortear, exportar). Um hook pequeno (`useAsyncAction`)
trata carregamento, erro e cancelamento.

## ADR-020 — Implantação: Caddy na frente, API isolada

**Contexto.** O produto precisa de HTTPS, cabeçalhos de segurança e deploy simples, sem guardar
dados de usuário.
**Decisão.** `docker compose` com dois containers. `web`: Caddy servindo o build estático e fazendo
proxy de `/api` (HTTPS automático, sem log de acesso, sem painel de administração). `api`: uvicorn
com um processo, usuário sem privilégios, sistema de arquivos somente leitura, sem capabilities e
numa rede interna **sem acesso à internet** e sem porta publicada.
**Consequências.** Um servidor pequeno (1 vCPU, 1 GB) basta. O único volume guarda certificados
TLS. Como o rate limit vive na memória do processo, escalar para vários processos exige movê-lo
(docs/architecture.md, "Escala").

## ADR-021 — CSP com hashes gerados no build

**Contexto.** O React Router insere scripts pequenos no HTML pré-renderizado. Liberar
`'unsafe-inline'` anularia boa parte da proteção da CSP contra XSS.
**Decisão.** `frontend/scripts/csp.mjs` roda ao fim de `npm run build`: calcula o SHA-256 de cada
script embutido e gera a política (`build/csp.caddy` para o Caddy, `build/csp.txt` para a prévia
local e os testes). O build falha se houver atributo `style` no HTML. Os testes E2E rodam com a
mesma política e reprovam qualquer violação.
**Consequências.** A política muda a cada build e nunca é editada à mão. Nenhuma fonte externa é
permitida (fontes auto-hospedadas, sem CDN).
