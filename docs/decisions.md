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

## ADR-002 — ~~Sorteio executado no servidor~~ ~~e gravado~~

*Substituída pela ADR-022: o sorteio acontece no navegador.*

*Revisada pela ADR-017 (sem persistência) e pela ADR-018 (minimização).*

**Decisão vigente.** Os vencedores são escolhidos no servidor, pelo motor em Python com o gerador
criptográfico do sistema operacional, e o horário oficial da rodada é o do servidor. O servidor não
grava nada: o resultado existe apenas na sessão do usuário e nos arquivos que ele exportar.
**Consequências.** Exige conexão no momento do sorteio (a requisição tem poucos bytes). Como nada é
gravado no servidor, a transparência se apoia em: algoritmo documentado, rodadas numeradas que nunca
são sobrescritas na sessão, exportação com metadados e a página "Como funciona".

## ADR-003 — ~~Sessão anônima por cookie~~

*Substituída pela ADR-017.* Não há sessão no servidor nem cookies.

## ADR-004 — Aleatoriedade: ~~`secrets`~~ + Fisher–Yates parcial

*Revisada pela ADR-022: o gerador passou a ser `crypto.getRandomValues` (Web Crypto), com a mesma amostragem por rejeição e o mesmo algoritmo.*

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

## ADR-007 — ~~Importação sem estado no servidor~~

*Substituída pelas ADRs 022 e 023: o arquivo é lido no navegador.*

**Decisão.** A pré-visualização não grava nada. O arquivo é enviado como corpo bruto (não
multipart, cujo parser grava partes grandes em arquivos temporários), lido em memória com limite de
tamanho e descartado ao fim da requisição. Para trocar de aba/coluna o navegador reenvia o arquivo.
As opções viajam como índices (`sheet=0`, `column=2`), nunca como nomes de abas ou de arquivos.

## ADR-008 — ~~Mesma origem~~

*Obsoleta (ADR-022): não há API.*

**Decisão.** Frontend e API sob o mesmo domínio (Caddy em produção, proxy do Vite em
desenvolvimento). CORS desabilitado.

## ADR-009 — ~~Contrato gerado~~

*Obsoleta (ADR-022): não há API.*

**Decisão.** O backend é a fonte do contrato (Pydantic → OpenAPI). O frontend gera os tipos com
`openapi-typescript` e usa `openapi-fetch`. O CI falha se os tipos gerados estiverem desatualizados.

## ADR-010 — Estilos e componentes

**Decisão.** CSS Modules + design tokens em custom properties. Componentes próprios sobre HTML nativo
acessível (`<dialog>`, `<select>`, `input type="checkbox" role="switch"`, grupos de rádio). Sem
biblioteca de UI e sem Tailwind.
**Por quê.** Identidade visual própria, zero custo em tempo de execução, acessibilidade nativa.

## ADR-011 — ~~Erros RFC 9457~~

*Obsoleta (ADR-022). Os erros de importação continuam com `code` estável e mensagem amigável (`services/import/errors.ts`).*

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

*Revisada pela ADR-022: sem backend; React + TypeScript + Vite + React Router continuam.*

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

**Decisão.** Nome do produto: **Sorteio360** (constante `APP_NAME`; trocar não exige refatoração). Nomes anteriores: "Sorteia" (provisório) e "Sorteia Fácil".
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

## ADR-018 — ~~Minimização no sorteio~~

*Superada pela ADR-022: agora nada é enviado, nem quantidades.*

**Decisão.** Para executar uma rodada o navegador envia apenas `pool_size` (quantos disponíveis),
`quantity` e `allow_repeat`. O servidor devolve as posições sorteadas; o navegador as traduz para os
participantes da lista congelada no momento do clique.
**Por quê.** Escolher posições não exige nomes. O motor continua recebendo uma lista de candidatos
(`range(pool_size)`), então sua interface e seus testes não mudam.

## ADR-019 — Sem biblioteca de cache de servidor no frontend

**Decisão.** TanStack Query foi removido: sem persistência não existe "estado do servidor" para
cachear — só chamadas pontuais (importar, sortear, exportar). Um hook pequeno (`useAsyncAction`)
trata carregamento, erro e cancelamento.

## ADR-020 — ~~Implantação: Caddy na frente, API isolada~~

*Substituída pela ADR-025 (hospedagem estática na Vercel).*

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

*Revisada pela ADR-025: a política vai numa tag `<meta>` em cada página, com `connect-src 'none'`.*

**Contexto.** O React Router insere scripts pequenos no HTML pré-renderizado. Liberar
`'unsafe-inline'` anularia boa parte da proteção da CSP contra XSS.
**Decisão.** `frontend/scripts/csp.mjs` roda ao fim de `npm run build`: calcula o SHA-256 de cada
script embutido e gera a política (`build/csp.caddy` para o Caddy, `build/csp.txt` para a prévia
local e os testes). O build falha se houver atributo `style` no HTML. Os testes E2E rodam com a
mesma política e reprovam qualquer violação.
**Consequências.** A política muda a cada build e nunca é editada à mão. Nenhuma fonte externa é
permitida (fontes auto-hospedadas, sem CDN).

## ADR-022 — Aplicação 100% no navegador (sem backend)

**Contexto.** Nova decisão de produto: nenhum dado de participante deve sair do navegador e o site
deve ser publicável como aplicação estática (Vercel), sem servidor Python.
**Decisão.** Importação, normalização, validação, sorteio, histórico e exportação rodam no
navegador. O site é um conjunto de arquivos estáticos; não existe API. A lógica pura fica em
`src/services` (sem React), a interface em `src/features` e `src/routes`.
O sorteio usa `crypto.getRandomValues` com amostragem por rejeição e Fisher–Yates parcial — o mesmo
algoritmo do motor em Python, com a mesma bateria de testes (inclusive estatísticos).
**Por que manter React/Vite em vez de JavaScript puro.** O frontend já existia, testado e acessível:
sessão num reducer, lista virtualizada para 50 mil nomes, diálogos nativos, rotas para resultado e
apresentação e páginas públicas pré-renderizadas para SEO. Reescrever em JavaScript puro só trocaria
essas peças por código caseiro equivalente.
**Consequências.**
* (+) Privacidade verificável: além de não haver servidor, a CSP proíbe o navegador de enviar dados
  (ADR-025).
* (+) Hospedagem gratuita ou quase, sem manutenção de servidor; funciona com qualquer CDN estática.
* (−) O horário da rodada vem do relógio do dispositivo, não de um servidor.
* (−) Arquivos muito grandes dependem da memória do dispositivo; limites e o Web Worker evitam travar
  a tela.
* Substitui as ADRs 002, 007, 008, 009, 011, 018 e 020; revisa 004 e 015.

## ADR-023 — Leitores próprios de .xlsx e .xls

**Contexto.** A biblioteca mais completa (SheetJS) só publica versões corrigidas no próprio site; a
versão do npm (0.18.5) tem falhas conhecidas sem correção (poluição de protótipo e ReDoS) ao ler
arquivos maliciosos. Outras bibliotecas não leem `.xls` ou são grandes.
**Decisão.** Leitores próprios, só com o necessário para uma lista:
* `.xlsx`: ZIP com `fflate` (≈ 8 KB, sem dependências) e leitura das partes XML por expressões
  regulares — sem DTD, o que elimina ataques de entidades XML por construção.
* `.xls`: contêiner Compound File e registros BIFF8 (strings compartilhadas com continuações, números
  compactos, datas, fórmulas com resultado salvo), conforme [MS-CFB] e [MS-XLS].
* Tudo num Web Worker, com tempo limite; o pacote principal da página não carrega os leitores.
**Consequências.** Uma dependência a mais em vez de uma biblioteca de ~1 MB. Os leitores são
testados com planilhas geradas por openpyxl e xlwt (conferidas com o xlrd) e com arquivos
maliciosos. Formatos fora do escopo (.ods, .xlsb, Excel 95) recebem mensagens próprias.

## ADR-024 — Duplicados ignorados por padrão, com escolha

**Contexto.** O pedido atual é tratar duplicados automaticamente ("3 nomes duplicados foram
ignorados"). Antes, eles eram só apontados. Homônimos existem.
**Decisão.** Na importação, repetidos (mesma chave: sem acentos, maiúsculas e espaços extras) ficam
de fora por padrão; a revisão mostra quantos e oferece "Manter todos". Ao digitar um nome que já
está na lista, o app pergunta antes de adicionar ("Adicionar mesmo assim"). Nada é removido de uma
lista já montada sem ação da pessoa.

## ADR-025 — Hospedagem estática (Vercel) e CSP embutida

**Decisão.** `vercel.json` define o build (`npm run build` → `build/client`), a reescrita das rotas
da aplicação para o fallback da SPA (arquivos existentes têm prioridade; `/assets/` nunca é
reescrito), cache imutável dos assets e cabeçalhos de segurança. A CSP vai numa tag `<meta>` gerada
no build (`scripts/postbuild.mjs`), com os hashes dos scripts embutidos do React Router e
`connect-src 'none'`; `frame-ancestors` vai no cabeçalho (não vale em `<meta>`).
A prévia local (`npm start`) e os testes E2E servem o build lendo o próprio `vercel.json`.
**Consequências.** Qualquer código que tentasse enviar dados — inclusive de uma dependência — seria
bloqueado pelo navegador. Um teste E2E prova isso e outro prova que o fluxo completo não faz nenhuma
requisição além dos arquivos do site.

## ADR-026 — Experiência do sorteio

**Decisão.** O sorteio é apresentado num "palco" escuro com um rolo de nomes (amostra cosmética,
nunca a lista inteira) que desacelera e para no vencedor já sorteado, seguido do destaque do
resultado ("Vencedor" e "Parabéns!") ou da lista em ordem (1º, 2º, 3º). Com "reduzir movimento"
ativado no sistema, o rolo aparece parado. A animação nunca decide nada: o resultado é registrado
antes de ela começar.

## ADR-027 — PDF pela impressão do navegador; imagem em canvas

**Contexto.** Pedidos de "salvar o resultado em PDF" e de uma imagem para mandar no grupo.
Bibliotecas de PDF (jsPDF, pdf-lib) somam de 100 a 350 KB e precisariam embutir as fontes.
**Decisão.** O PDF sai da impressão do navegador: a tela da rodada tem estilos de impressão (só o
resultado, sempre no tema claro, com data, método e aviso de privacidade) e o item "PDF ou
impressão" chama `window.print()`; todos os navegadores atuais oferecem "Salvar como PDF". A imagem
PNG (1200 × 675, desenhada em 2×) é feita num `<canvas>` com as fontes que a página já carregou.
**Consequências.** Nenhuma dependência nova e nenhum envio. O PDF depende da caixa de impressão do
navegador (margens e cabeçalhos do navegador ficam a critério da pessoa). A imagem lista até 12
vencedores ("e mais N"); a lista completa fica no Excel, CSV, texto ou PDF.

## ADR-028 — Telão em segunda janela, sincronizado por BroadcastChannel

**Contexto.** Em eventos, quem apresenta quer controlar pelo notebook enquanto o projetor mostra só
o palco. A regra de privacidade proíbe enviar dados a servidores, e o pedido proíbe armazenamento.
**Decisão.** "Abrir telão" abre `/sorteio/telao` numa janela separada (o projetor como segunda tela
do mesmo computador). A sincronização usa `BroadcastChannel`, que troca mensagens entre janelas do
mesmo site no mesmo navegador, sem rede e sem gravar nada; o nome do canal é aleatório por aba e vai
no fragmento do endereço (`#…`), que o navegador nunca envia ao servidor. O modo apresentação
continua sendo a única fonte do estado: ele descreve o palco como uma cena serializável e o telão só
a desenha — com o mesmo componente, girando o próprio rolo. Mensagens fora do protocolo são
ignoradas.
**Alternativas.** `window.opener.postMessage` (equivalente, mas perde a conexão se o modo
apresentação for reaberto); telão em outro aparelho (exigiria um servidor de retransmissão:
descartado pela regra de não enviar dados); `localStorage` com evento `storage` (grava dados:
descartado).
**Consequências.** Funciona nos navegadores atuais (Safari 15.4+), sem dependência e sem mudança na
CSP. Telão em outro aparelho continua fora do escopo.

## ADR-029 — Sem "sorteio verificável" por enquanto

**Contexto.** Foi avaliado um sorteio "verificável": publicar antes um compromisso (hash de uma
semente) e, depois, a semente, para qualquer pessoa refazer o sorteio e conferir o resultado.
**Decisão.** Não implementar agora. Sem um terceiro que fixe o momento do compromisso (um servidor
com registro público, um cartório, uma fonte pública de aleatoriedade com data), quem organiza pode
gerar sementes em segredo até obter o resultado desejado e só então "publicar" o compromisso. A
função entregaria uma aparência de garantia que ela não dá — contra a regra de comunicação honesta
(ADR-004, `docs/security.md` §4). Um terceiro confiável exigiria rede ou processo fora do site.
**Consequências.** A transparência continua vindo do sorteio feito na frente do público (modo
apresentação e telão), das rodadas numeradas que não podem ser refeitas e da exportação com data,
hora, regras e método. O motor já aceita uma fonte de aleatoriedade injetável e registra o algoritmo
em cada rodada; se um dia houver um terceiro confiável (ex.: beacon público de aleatoriedade), a
função pode ser adicionada sem mudar o motor.

## ADR-030 — Área do sorteio em colunas (desktop) e abas (celular)

**Contexto.** A área do sorteio tinha largura máxima de 1152 px, a lista rolava dentro de uma página
que também rolava (rolagem dupla, ~11 nomes visíveis) e, em notebooks, o botão "Sortear" ficava
abaixo da dobra. No celular, as regras ficavam depois de toda a lista.
**Decisão.** A partir de 1024 px, a área do sorteio ocupa exatamente a altura da tela: a lista à
esquerda rola por dentro e se distribui em colunas conforme a largura (até 4); à direita, regras e
histórico rolam acima de uma base fixa com disponíveis, "Sortear" e "Apresentar". Abaixo de
1024 px, as seções viram abas (padrão WAI-ARIA, fixas no topo), a lista rola com a própria página
(sem área de rolagem presa) e "Sortear" fica na barra do rodapé. A escolha entre os dois arranjos é
feita por media query em JavaScript (`useMediaQuery`), porque muda a estrutura, não só o estilo.
**Consequências.** Mais nomes visíveis (de ~11 para 40 a 90 em notebooks e monitores) e a ação
principal sempre à vista. A lista tem linhas de altura fixa (colunas alinhadas, rolagem previsível);
nomes longos terminam em reticências na linha (o nome completo continua no DOM e no `title`).

## ADR-031 — Roletas múltiplas para vários vencedores

**Contexto.** Com vários vencedores, uma única roleta parava em um nome e a lista aparecia em
seguida: a animação não representava o resultado. Pedido: todas as roletas ao mesmo tempo, uma por
vencedor, ou várias faixas por roleta.
**Decisão.** `reelLayout` distribui os vencedores em roletas lado a lado: quantas couberem na
largura (mínimo de 172 px cada; 220 px no telão, até 6) e, se necessário, várias faixas por roleta
(até 5; 4 no telão), com a última linha o mais cheia possível (7 vencedores = 4 roletas, 2 + 2 + 2 +
1). A ordem do sorteio é lida linha a linha, como na lista do resultado. Acima da capacidade (30), as
roletas mostram os primeiros e avisam que a lista completa vem em seguida. Cada roleta percorre mais
linhas que a anterior e para depois dela (cascata de no máximo 1 s). Na revelação "um a um", segue
uma roleta por vencedor.
**Consequências.** A animação mostra exatamente quem ganhou, em qualquer quantidade; o telão recebe
no máximo 30 nomes por mensagem. A animação continua sem decidir nada (o resultado já está
registrado) e respeita "reduzir movimento".

