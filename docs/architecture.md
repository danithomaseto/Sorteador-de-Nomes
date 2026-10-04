# Arquitetura

Este documento descreve como o Sorteia é construído e por quê. As decisões estão registradas em
[`decisions.md`](decisions.md); segurança e privacidade em [`security.md`](security.md); o contrato
HTTP em [`api.md`](api.md).

## 1. Visão geral

> Uma ferramenta de sorteio de nomes que qualquer pessoa usa em menos de um minuto e que um
> organizador pode projetar num telão sem constrangimento.

| Princípio | Consequência técnica |
|---|---|
| Rápido até o primeiro sorteio | Sem cadastro, sem login, sem etapa de criação: abrir → adicionar nomes → sortear |
| **Sem armazenamento** | Nenhum banco de dados. Nomes, arquivos, configurações, resultados e histórico existem apenas durante a sessão (a aba aberta) |
| Confiável | Vencedores escolhidos no servidor com o gerador criptográfico do sistema operacional; horário do servidor; rodadas nunca sobrescritas |
| Honesto | Página "Como funciona" descreve exatamente o algoritmo; nenhuma alegação de "impossível manipular" |
| Discreto | Design system próprio, animação curta, um destaque por tela |

Mensagem de produto: **"Seus dados ficam apenas durante o sorteio. Não armazenamos sua lista de
participantes nem seus resultados."**

Fora do escopo do MVP: amigo secreto, divisão em times, roleta/rifa paga, contas, pagamentos, IA.

## 2. Onde ficam os dados

| Dado | Onde existe | Quando é descartado |
|---|---|---|
| Lista de participantes | memória JavaScript da aba | ao recarregar/fechar a aba ou em "Novo sorteio" |
| Configurações e nome do sorteio | memória JavaScript da aba | idem |
| Rodadas e histórico | memória JavaScript da aba | idem |
| Arquivo importado (XLSX/CSV) | memória do servidor durante **uma** requisição | ao fim da requisição; nunca vai para disco |
| Texto colado / nome digitado | memória do servidor durante uma requisição | ao fim da requisição |
| Pedido de sorteio | servidor recebe só **tamanho da lista e quantidade** — nenhum nome | ao fim da requisição |
| Pedido de exportação | memória do servidor durante uma requisição | ao fim da requisição; o arquivo gerado vai direto para o navegador |

Não há banco de dados, cookies, `localStorage`, `sessionStorage` nem IndexedDB. Uma regra de lint
proíbe essas APIs no frontend. Antes de recarregar ou fechar a aba com dados, o navegador pede
confirmação.

## 3. Topologia

```
Navegador (SPA React — estado da sessão em memória)
   │ HTTPS, mesma origem
   ▼
Caddy ── /        → arquivos estáticos (/, /como-funciona e /privacidade pré-renderizadas)
      └─ /api/*   → FastAPI (uvicorn) — sem estado, sem disco, sem banco
```

* Frontend e API no **mesmo domínio**: sem CORS em produção. Em desenvolvimento o Vite faz proxy de
  `/api` para `http://localhost:8000`.
* A API não guarda estado entre requisições: qualquer processo atende qualquer requisição, sem
  sessão "grudada".
* **Escala.** A única memória entre requisições são os contadores do rate limit (hash do IP, por
  minutos), que ficam no processo. Com N processos, o limite efetivo por IP chega a N vezes o
  configurado. A imagem roda um processo, o que basta para o volume esperado (uma rodada leva
  milissegundos; a leitura de planilhas roda fora do event loop). Para escalar horizontalmente,
  levar o rate limit para o proxy ou para um armazenamento compartilhado de contadores com
  expiração, sem nenhum dado de participantes.

### Implantação (docker compose)

| Container | Imagem | Exposição | Proteções |
|---|---|---|---|
| `web` | `deploy/web.Dockerfile`: build do frontend + Caddy | portas 80/443 | HTTPS automático, cabeçalhos de segurança e CSP gerada no build, sem log de acesso, sem painel de administração |
| `api` | `backend/Dockerfile`: Python 3.12 slim + uvicorn | nenhuma (só a rede interna) | usuário sem privilégios, sistema de arquivos somente leitura, sem capabilities, rede **sem acesso à internet** |

O único volume é o do Caddy (certificados TLS). Nenhum container guarda dados de usuário.

## 4. Camadas do backend

```
app/
  api/            HTTP: rotas v1, limites de corpo, rate limit, cabeçalhos, tradução de erros
    └► services/  casos de uso: interpretar texto, interpretar planilha, executar rodada, exportar
         ├► domain/draw_engine   PURO — seleção aleatória (sem FastAPI, sem I/O)
         ├► domain/names         PURO — normalização de nomes e chave de duplicidade
         ├► importing/           texto | CSV | XLSX → tabela → pré-visualização
         └► exporting/           CSV | XLSX com proteção contra injeção de fórmula
```

**Regra de dependência:** as setas só apontam para dentro. `domain/` não importa nada do projeto nem
de frameworks; `importing/` e `exporting/` não conhecem HTTP; `services/` orquestra; `api/` só traduz
HTTP ↔ casos de uso.

| Responsabilidade (briefing) | Onde vive |
|---|---|
| Dados | estado da sessão no frontend (`features/session`), contratos em `schemas/` |
| Motor de sorteio | `backend/app/domain/draw_engine/` |
| Interface | `frontend/` (apresentação e interação) |
| Persistência | **nenhuma** — decisão de produto (ADR-017) |
| Importação | `backend/app/importing/` |

## 5. Fluxo de uma rodada

```
1. Clique em "Sortear"          o frontend congela a lista de disponíveis (n pessoas, na ordem da lista)
2. POST /api/v1/rounds          { pool_size: n, quantity: k, allow_repeat }
3. services.rounds              valida limites → draw_engine.draw(range(n), k, …, SecretsRandomSource)
4. 200                          { positions: [i1, i2, …], drawn_at, algorithm, … }
5. Frontend                     traduz posições → participantes da lista congelada; registra a rodada;
                                marca vencedores como removidos se "remover vencedores" estiver ativo
6. Animação                     termina sempre no vencedor real; leitores de tela recebem o resultado
```

* **Minimização:** o servidor não precisa de nomes para sortear, então não os recebe. O motor
  continua genérico (recebe a lista de candidatos); a API passa a ele as posições `0..n-1`.
* A animação usa uma amostra cosmética de até 40 nomes escolhida no navegador e só começa a
  desacelerar depois que o resultado real chegou.
* Se a resposta não chegar (falha de rede), nada foi registrado em lugar nenhum: o resultado nunca foi
  visto, e tentar de novo é seguro.

## 6. Estado da sessão (frontend)

```ts
type Participant = { id: string; name: string; key: string; source: Source; removedInRound: number | null };
type Settings    = { quantity: number; allowRepeat: boolean; removeWinners: boolean; revealMode: "compact" | "sequential" };
type Round       = { number: number; drawnAt: string; quantity: number; allowRepeat: boolean; removeWinners: boolean;
                     totalParticipants: number; poolSize: number; availableAfter: number; algorithm: string;
                     winners: { position: number; participantId: string; name: string }[] };
type Session     = { name: string; participants: Participant[]; settings: Settings; rounds: Round[] };
```

* Um único reducer puro (`features/session/sessionReducer.ts`) concentra as transições: adicionar,
  renomear, excluir, limpar, restaurar, registrar rodada, novo sorteio. Ele é testado isoladamente —
  as regras de sessão não ficam espalhadas pelos componentes.
* `name` e `key` (chave de duplicidade) sempre vêm do servidor (`/imports/text` ou `/imports/file`):
  a normalização de nomes tem uma única implementação, em Python.
* IDs de participantes: `crypto.randomUUID()`. Cada entrada é um participante distinto, mesmo com
  nomes iguais.
* Rodadas só são adicionadas (ADR-005). "Restaurar participantes" zera `removedInRound` de todos.

## 7. Motor de sorteio

* Entrada: sequência de candidatos (qualquer tipo), quantidade, `allow_repeat`, fonte de aleatoriedade.
* Saída: vencedores (em ordem), restantes (na ordem original), metadados (`pool_size`, `quantity`,
  `allow_repeat`, `algorithm`).
* Sem repetição: **Fisher–Yates parcial** sobre os índices — O(n) para copiar, O(k) para sortear.
* Com repetição: `k` sorteios independentes e uniformes em `[0, n)`.
* Produção: `secrets.randbelow` → `SystemRandom` → `os.urandom` (`getrandom()` no Linux), com
  amostragem por rejeição (sem viés de módulo). Testes: `SeededRandomSource`. **A API nunca aceita
  seed.**

## 8. Importação

```
fonte (texto | CSV | XLSX)
  → leitura segura (limites, assinatura do arquivo, decodificação)
  → tabela (linhas × colunas)
  → aba / cabeçalho / coluna prováveis      ← o usuário pode trocar
  → normalização (domain/names)
  → classificação: válido | vazio (ignorado) | inválido (motivo) | repetido (agrupado)
  → pré-visualização  →  o usuário decide duplicados e confirma  →  entra no estado da sessão
```

* O arquivo vai como **corpo bruto** da requisição (não multipart, que gravaria arquivos temporários
  em disco) e é lido em memória com limite de tamanho. Para trocar de aba/coluna o navegador reenvia o
  arquivo, que só existe na memória da aba.
* Opções viajam na query string apenas como índices e enums (`sheet=0`, `column=2`): nomes de abas e
  de arquivos não aparecem em URLs nem em logs.
* XLSX: assinatura ZIP + estrutura OOXML, limite de descompressão, `openpyxl` somente leitura com
  `defusedxml`. `.xls` antigo ou planilha protegida por senha (assinatura CFB) recebem mensagem própria.
* CSV: UTF-8 (com ou sem BOM), UTF-16 com BOM, Windows-1252 como alternativa; delimitador detectado
  entre `;`, `,` e tab (o usuário pode trocar).
* Texto: mais de uma linha → uma pessoa por linha; senão `;`, senão `,`. Linhas com tab são tratadas
  como tabela (colunas coladas de uma planilha).
* Normalização única para todas as fontes (inclusive digitação manual): Unicode NFC, remoção de
  caracteres invisíveis e de controle, espaços colapsados, capitalização e acentos preservados,
  1–120 caracteres.
* Duplicados: chave sem maiúsculas, acentos e espaços extras. Nunca removidos sem decisão do usuário.

## 9. Exportação

O navegador envia ao servidor apenas o necessário para o arquivo (nome do sorteio, rodadas
escolhidas e seus vencedores) e recebe o CSV ou XLSX na resposta. Nada é guardado. Células que
começam com `=`, `+`, `-`, `@`, tab ou CR são neutralizadas (injeção de fórmula). O CSV usa UTF-8 com
BOM e `;` (padrão do Excel em português); o XLSX traz um cabeçalho legível com os metadados.

## 10. Frontend

```
src/
  root.tsx           layout HTML, provedores (sessão, anúncios, toasts), ErrorBoundary
  routes.ts          mapa de rotas
  routes/            telas
  features/          session · participants · import · draw (configuração) · rounds · presentation
  components/        design system (Button, Field, Dialog, Switch, SegmentedControl, Toast…)
  lib/api/           tipos gerados do OpenAPI + cliente + tradução de erros
  lib/               a11y (anúncios), formatação, configuração
  styles/            tokens.css, reset.css, global.css
```

* **React Router 8 (modo framework, `ssr: false`)**: SPA com as páginas públicas pré-renderizadas no
  build (SEO sem servidor Node em produção).
* **Estado da sessão em memória** num provedor acima das rotas: navegar entre telas mantém os dados;
  recarregar a aba descarta.
* **TanStack Virtual** para listas com até 50.000 nomes.
* **openapi-typescript + openapi-fetch**: tipos gerados do contrato do backend.
* **CSS Modules + design tokens**; HTML nativo acessível antes de qualquer biblioteca de UI.

| Rota | Tela | Renderização |
|---|---|---|
| `/` | Landing | pré-renderizada |
| `/como-funciona` | Transparência | pré-renderizada |
| `/privacidade` | Privacidade e termos de uso | pré-renderizada |
| `/sorteio` | Participantes, configuração e histórico | SPA |
| `/sorteio/rodadas/:number` | Resultado de uma rodada | SPA |
| `/sorteio/apresentacao` | Modo apresentação | SPA, tela cheia |

## 11. Desempenho

| Cenário | Meta | Como |
|---|---|---|
| Executar rodada com 50.000 participantes | p95 < 100 ms no servidor | requisição de poucos bytes; Fisher–Yates O(n) |
| Importar XLSX de 50.000 linhas | < 5 s | `openpyxl` read-only em streaming |
| Lista de 50.000 nomes na tela | rolagem fluida | virtualização (só ~30 linhas no DOM) |
| Animação | independe do tamanho da lista | amostra de até 40 nomes |

Os testes de desempenho (`backend/tests/perf`) medem 10, 100, 1.000, 10.000 e 50.000 participantes.

## 12. Preparação para o futuro

Persistência deixou de fazer parte do produto. Funcionalidades futuras que dependem de guardar dados
(link compartilhável, histórico permanente, contas, auditoria) exigirão uma decisão explícita do
produto, com consentimento do usuário (opt-in), e um novo ADR. O que já facilita esse caminho:

| Futuro | O que já está pronto |
|---|---|
| Sorteio verificável | `RandomSource` injetável e `algorithm` versionado em cada rodada |
| API pública | rotas versionadas (`/api/v1`), erros RFC 9457 com `code` estável |
| Google Sheets, outras fontes | o pipeline de importação recebe uma tabela, independente da origem |
| PDF / imagem | escritores de exportação independentes em `exporting/` |
| Personalização visual | design tokens em custom properties |
| Apresentação em segunda tela | estado da sessão centralizado num reducer (sincronizável por `BroadcastChannel`, sem gravar nada) |
