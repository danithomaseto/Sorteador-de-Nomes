# Arquitetura

Como o Sorteio360 é construído e por quê. As decisões estão em [`decisions.md`](decisions.md);
segurança e privacidade em [`security.md`](security.md).

## 1. Visão geral

> Um sorteador de nomes que qualquer pessoa usa em menos de um minuto, que um organizador pode
> projetar num telão — e que nunca recebe a lista de ninguém.

| Princípio | Consequência técnica |
|---|---|
| **Nada sai do navegador** | Sem backend: importação, sorteio e exportação rodam no dispositivo. A CSP (`connect-src 'none'`) proíbe o navegador de enviar dados |
| **Nada fica guardado** | Sem banco, cookies ou armazenamento do navegador. A sessão vive na memória da aba |
| Rápido até o primeiro sorteio | Sem cadastro nem etapa de criação: abrir → colar ou importar → sortear |
| Confiável | Gerador criptográfico (`crypto.getRandomValues`), amostragem sem viés, rodadas que não podem ser refeitas |
| Honesto | "Como funciona" descreve o algoritmo e os limites; nenhuma alegação de "impossível manipular" |
| Leve | ~120 KB de JavaScript comprimido na primeira página; leitores de planilha (13 KB) carregados só quando usados |

Mensagem de produto: **"Seus dados ficam apenas no seu navegador, durante o sorteio. Não recebemos
nem armazenamos sua lista de participantes ou seus resultados."**

## 2. Onde ficam os dados

| Dado | Onde existe | Quando é descartado |
|---|---|---|
| Lista de participantes, configurações, rodadas | memória JavaScript da aba | ao recarregar/fechar a aba ou em "Novo sorteio" |
| Arquivo importado | memória da aba e do Web Worker de importação, durante a leitura | ao montar a pré-visualização |
| Arquivo exportado | gerado na memória da aba e entregue como download | o link temporário é revogado em 1 s |
| Cena do telão (nome do sorteio, vencedores na tela, amostra da animação) | memória das duas janelas; passa de uma para a outra pelo `BroadcastChannel` do navegador | ao fechar as janelas |

Não há servidor de aplicação, banco, cookies, `localStorage`, `sessionStorage` nem IndexedDB (uma
regra de lint proíbe essas APIs). Antes de recarregar ou fechar a aba com dados, o navegador pede
confirmação.

## 3. Topologia

```
                 arquivos estáticos (HTML, JS, CSS, fontes, ícones)
Vercel (CDN) ───────────────────────────────────────────────────────▶ Navegador
                                                                       │
                     ┌─────────────────────────────────────────────────┤
                     │ Aba (thread principal)                          │
                     │  React + React Router                            │
                     │  sessão (reducer em memória) · sorteio · exportar│
                     │            │ postMessage (texto ou bytes)       │
                     │            ▼                                    │
                     │  Web Worker de importação                       │
                     │  CSV · XLSX (fflate) · XLS (CFB + BIFF8)        │
                     └─────────────────────────────────────────────────┘
                     Nenhuma requisição depois do carregamento (connect-src 'none')
```

* As páginas públicas (`/`, `/como-funciona`, `/privacidade`) são **pré-renderizadas** no build
  (SEO e primeira pintura rápida). As telas do sorteio (`/sorteio`, `/sorteio/rodadas/:n`,
  `/sorteio/apresentacao`, `/sorteio/telao`) usam o fallback da SPA.
* A Vercel serve os arquivos com os cabeçalhos do `vercel.json`. A prévia local (`npm start`) e os
  testes E2E leem o mesmo arquivo (`scripts/serve.mjs`), então testam a configuração de produção.

## 4. Estrutura do projeto

```
/
├── public/                 favicon, ícones, imagem de compartilhamento (og.png), manifest, robots
├── scripts/
│   ├── postbuild.mjs       CSP por hash em cada página, sitemap
│   └── serve.mjs           prévia local do build, como na Vercel
├── src/
│   ├── components/         design system (botões, campos, diálogos, alertas, toasts…)
│   ├── features/           telas e fluxos com React
│   │   ├── draw/           configuração do sorteio, nome, quantidade
│   │   ├── import/         colar lista, importar arquivo, revisão
│   │   ├── participants/   adicionar, editar, excluir, lista virtualizada
│   │   ├── rounds/         palco do sorteio, resultado, histórico, exportar
│   │   ├── presentation/   modo apresentação (tela cheia) e telão em segunda janela
│   │   ├── session/        estado da sessão (modelo, reducer, seletores)
│   │   └── marketing/      peças da landing
│   ├── routes/             páginas (landing, como funciona, privacidade, sorteio…)
│   ├── services/           lógica pura, sem React (testada à parte)
│   │   ├── draw/           motor de sorteio e fonte de aleatoriedade
│   │   ├── import/         leitores de texto, CSV, XLSX, XLS; pré-visualização; Worker
│   │   ├── export/         TXT, CSV e XLSX
│   │   └── names.ts        normalização e chave de duplicidade
│   ├── styles/             tokens, reset, estilos globais
│   ├── utils/              formatação, busca, anúncios para leitores de tela, SEO
│   ├── config.ts           nome do produto, mensagens e limites
│   └── root.tsx            documento HTML, provedores e metadados globais
├── e2e/                    testes de ponta a ponta (Playwright) e planilhas de exemplo
├── docs/                   arquitetura, decisões, segurança
└── vercel.json             build, reescritas e cabeçalhos de produção
```

Regra de dependência: `services` não importa nada de React nem de `features`; `features` usa
`services` e `components`; `routes` monta as telas.

## 5. Fluxo principal

```
Abrir /sorteio ──▶ Colar lista │ Importar planilha │ Digitar nomes
                         │
                         ▼  (Web Worker: normaliza, valida, aponta repetidos)
                  Revisão: N encontrados · repetidos ignorados (ou mantidos) · problemas por linha
                         │  confirmar
                         ▼
                  Lista + configuração (quantidade, repetição, remover vencedores, exibição)
                         │  Sortear
                         ▼
             Rodada registrada ──▶ Palco (rolo de nomes) ──▶ Resultado: 1º, 2º, 3º…
                         │
           Copiar · Exportar (TXT/CSV/XLSX) · Sortear novamente · Reiniciar · Novo sorteio
```

## 6. Estado da sessão

Um reducer puro (`features/session/sessionReducer.ts`) guarda nome do sorteio, participantes,
configuração e rodadas. Ações: adicionar, renomear, excluir/desfazer, limpar lista, restaurar
participantes, **reiniciar** (apaga as rodadas e devolve todos), registrar rodada, novo sorteio.

* Cada participante tem um `id` (`crypto.randomUUID`), o nome normalizado e a chave de duplicidade.
  Nomes iguais são participantes distintos.
* Ao registrar uma rodada, o reducer recebe a lista congelada no clique e as posições sorteadas; as
  rodadas só são acrescentadas, nunca editadas.

## 7. Motor de sorteio

`services/draw`: `drawPositions(tamanho, quantidade, { allowRepeat, random })`.

* Sem repetição: **Fisher–Yates parcial** — a cada passo `i`, troca a posição `i` com uma posição
  uniforme em `[i, n)`; as `k` primeiras são o resultado, na ordem do sorteio.
* Com repetição: `k` sorteios independentes e uniformes.
* `CryptoRandomSource`: `crypto.getRandomValues` em lotes de 32 bits, com **amostragem por
  rejeição** (descarta valores acima do maior múltiplo de `n`), sem viés de módulo.
* O resultado registra o algoritmo (`partial-fisher-yates/1+web-crypto`), exportado nos arquivos.

## 8. Importação

`services/import`, executado no Web Worker (com fallback na thread principal onde não houver Worker):

1. **Formato pelo conteúdo**, não pela extensão: ZIP → `.xlsx`; Compound File → `.xls`; PDF,
   imagens e compactados recebem mensagens próprias; o resto é texto (CSV).
2. **Leitura**:
   * texto colado: uma pessoa por linha, ou `;` ou `,`; colunas coladas de uma planilha viram tabela;
   * CSV: UTF-8 (com ou sem BOM), UTF-16 ou Windows-1252; delimitador detectado (`;`, tab, `,`);
   * `.xlsx`: ZIP com limites, XML sem DTD, strings compartilhadas, datas pelo formato da célula,
     abas ocultas, resultado salvo de fórmulas;
   * `.xls`: Compound File + BIFF8 (strings com continuações, números compactos, datas, fórmulas).
3. **Tabela**: detecta cabeçalho ("Nome", "Aluno"… ou texto sobre coluna numérica) e a coluna de
   nomes; a pessoa pode trocar aba, coluna e cabeçalho.
4. **Pré-visualização**: normaliza cada valor, ignora vazios, aponta nomes longos demais e erros de
   fórmula (`#N/A`), datas suspeitas e repetidos. A pessoa confirma antes de adicionar.

Limites (`config.ts`): 50 mil participantes, arquivo de 10 MB, 80 MB descompactados, 2 milhões de
caracteres colados, 50 colunas, leitura interrompida após 10 mil linhas vazias seguidas, 60 s de
tempo máximo de leitura.

## 9. Exportação

`services/export`, na thread principal:

* **TXT**: resultado legível para e-mail, chat ou ata.
* **CSV**: UTF-8 com BOM e `;` (abre certo no Excel em português), uma linha por vencedor, com
  proteção contra injeção de fórmula.
* **XLSX**: gerado diretamente no formato Office Open XML (com `fflate`), com metadados, tabela de
  vencedores, cabeçalho destacado e painel congelado; textos gravados como texto (nunca fórmula).
* **PDF**: a tela da rodada tem estilos de impressão (só o resultado, tema claro, nota com data,
  método e privacidade); "PDF ou impressão" abre a impressão do navegador, que oferece "Salvar como
  PDF". Sem biblioteca de PDF.
* **PNG**: imagem 1200 × 675 (desenhada em 2×) num `<canvas>`, com a identidade do bilhete: vencedor
  em destaque (nomes longos em duas linhas) ou lista com até 12 vencedores.

## 10. Interface

* **Design system próprio** (CSS Modules + tokens), identidade "bilhete": tinta, amarelo e papel;
  Archivo (com eixo de largura) e IBM Plex Mono, servidas pelo próprio site. Temas claro e escuro.
  Detalhes em [`design.md`](design.md).
* **Área do sorteio** (`routes/draw.tsx`): a partir de 1024 px, `PageLayout layout="app"` ocupa a
  altura da tela; a lista (`ParticipantsPanel fill`) rola por dentro, em colunas
  (`useVirtualizer` com `lanes`), e a coluna de regras rola acima de uma base fixa com "Sortear".
  Abaixo de 1024 px, abas (`components/Tabs`) e a lista rola com a página (`useWindowVirtualizer`).
* **Palco do sorteio** (`features/rounds/DrawReel.tsx`): roletas lado a lado, uma por vencedor ou
  várias faixas por roleta (`reelLayout.ts`: 10 = 5 × 2; até 30 na tela, conforme a largura). Os
  nomes que passam são uma amostra cosmética de até 40; cada roleta para em cascata nos vencedores,
  já sorteados. Com "reduzir movimento", aparecem paradas.
* **Telão** (`features/presentation/screen.ts`): "Abrir telão" abre `/sorteio/telao#<canal>` numa
  janela separada. O modo apresentação descreve o palco como uma cena serializável
  (`scene.ts`: pronto, roletas, vencedor ou lista) e a publica num `BroadcastChannel` com nome
  aleatório por aba; o telão desenha a mesma cena com o mesmo componente (`StageScene`) e gira as
  próprias roletas. Espaço no telão pede ao modo apresentação para avançar. Sair da apresentação pausa o
  telão (fica só o nome do sorteio); voltar o reconecta; fechar a janela do sorteio o encerra.
* **Lista virtualizada** (TanStack Virtual): só as linhas visíveis existem no DOM.
* **Responsivo** de 320 px a telões; no celular, abas e uma barra fixa "Sortear".
* **Acessibilidade**: HTML semântico, foco visível, diálogos nativos, anúncios para leitores de tela,
  contraste AA verificado com axe nos testes.

## 11. Desempenho

| Cenário (50 mil participantes) | Tempo típico | Onde |
|---|---|---|
| Colar a lista | ~0,2 s | Web Worker |
| Importar CSV de três colunas | ~0,3 s | Web Worker |
| Importar `.xlsx` de três colunas | ~0,6 s | Web Worker |
| Sortear 10 | ~0,2 ms | thread principal |
| Embaralhar todos (50 mil vencedores) | ~3 ms | thread principal |

Medido em `src/services/import/performance.test.ts` e `src/services/draw/statistics.test.ts`.

## 12. Testes

| Camada | Ferramenta | O que cobre |
|---|---|---|
| Serviços | Vitest | motor (inclusive qui-quadrado), nomes, texto, CSV, XLSX, XLS, arquivos maliciosos, exportação, desempenho |
| Estado | Vitest | reducer: adicionar, excluir, limpar, restaurar, reiniciar, rodadas |
| Componentes | Vitest + Testing Library | área do sorteio, colar lista, duplicados, revelação, cenas do palco, canal do telão |
| Ponta a ponta | Playwright + axe-core | fluxos completos, importação real, exportações (inclusive PNG e impressão), apresentação, telão em segunda janela, celular, 320/768 px, acessibilidade, CSP, nenhuma requisição de dados |

## 13. Evolução

| Futuro | O que já facilita |
|---|---|
| Sorteio verificável, com compromisso público (ver ADR-029) | `RandomSource` injetável; algoritmo versionado em cada rodada |
| Telão em outro aparelho | a cena já é serializável; faltaria um meio de entrega — que exigiria rede (decisão de produto) |
| Outras fontes (Google Planilhas por link público) | o pipeline recebe uma tabela, independente da origem — mas exigiria rede (decisão de produto) |
