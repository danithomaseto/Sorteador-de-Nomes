# Design do Sorteio360

Como a interface é pensada: o que foi auditado, a direção visual e o sistema que a sustenta. Os
valores ficam em [`src/styles/tokens.css`](../src/styles/tokens.css); mudar um token muda o produto
inteiro.

Prioridade: clareza → hierarquia → usabilidade → consistência → desempenho → refinamento → estética.

## 1. Auditoria (antes desta versão)

| Problema | Impacto | O que mudou |
|---|---|---|
| Conteúdo limitado a 1152 px | Em 1920 px, 40% da tela vazia | Área do sorteio usa até 1600 px; a lista vira colunas |
| Lista com rolagem própria dentro da página que também rola | Rolagem dupla; ~11 nomes visíveis em qualquer tela | Desktop: a página não rola, cada coluna rola por conta própria. Celular: a lista rola com a página |
| "Sortear" abaixo da dobra em notebook com lista vazia | A ação principal sumia | Botão fixo na base da coluna de regras |
| Cartão dentro de cartão (painel + lista com borda) | Ruído visual, bordas duplicadas | Uma superfície para a lista; regras e histórico sem moldura, separados por linhas |
| Editar e excluir sempre visíveis em cada linha | 500 nomes = 1000 ícones | Aparecem ao passar o mouse ou com foco; em toque, sempre visíveis |
| Contagens em fonte mono ("5Ø0") | Leitura estranha, dois estilos de número | Algarismos tabulares da própria Archivo |
| Ícones em quadrados amarelos (blocos iniciais, recursos da página inicial) | Aparência de modelo pronto | Ícone discreto ou nenhum; hierarquia por tipografia |
| Botão desabilitado ainda amarelo | Parecia uma ação | Desabilitado neutro em todas as variantes |
| Celular: configuração depois de toda a lista | Rolagem longa até as regras | Abas (Participantes · Regras · Histórico) fixas no topo; "Sortear" na barra do rodapé |
| Vários vencedores revelados por uma única roleta | Animação não representava o resultado | Roletas lado a lado, todas girando juntas |

## 2. Identidade

"Bilhete de sorteio": tinta (#1B1A17), papel (#F6F5F1) e amarelo (#F2B300). O canhoto com picote
aparece no logotipo e nos recortes laterais do palco. Nada de gradientes decorativos, vidro fosco
ou sombras grandes.

**Regra de cor.** O amarelo marca só duas coisas: a ação de sortear e o que foi sorteado (faixas
das roletas, vencedor em destaque, posições no palco). Todo o resto é tinta, papel e cinzas. A
interface continua compreensível sem cor: estados usam também ícone, texto ou traço.

## 3. Grid e larguras

| Token | Valor | Uso |
|---|---|---|
| `--gutter` | 16 → 40 px (fluido) | Margem lateral de todas as páginas |
| `--app-max` | 1600 px | Área do sorteio e resultado |
| `--content-max` | 1152 px | Página inicial, como funciona, privacidade |
| `--reading-max` | 640 px | Blocos de texto corrido |
| `--aside-width` | 320 → 400 px | Coluna de regras no desktop |
| `--header-height` | 56 px | Cabeçalho do site |

Pontos de quebra: 480 (celular grande), 768 (tablet: campos lado a lado, lista em 2 colunas),
1024 (área do sorteio em colunas, sem rolagem da página), 1280 e 1536.

A lista de participantes calcula as colunas pela largura (mínimo de 272 px cada, até 4), na ordem
da lista, linha a linha.

## 4. Espaçamento

Base de 4 px: 4 micro · 8 pequeno · 12 compacto · 16 padrão · 24 confortável · 32 seção pequena ·
48 seção média · 64 e 96 seções principais (`--space-1` a `--space-9`).

## 5. Tipografia

Uma família (Archivo, com eixo de largura) e três pesos: 400, 600 e 720. Largura expandida só em
títulos de página e no palco; condensada só nos nomes das roletas.

| Papel | Tamanho / altura de linha |
|---|---|
| Display (página inicial) | 40 → 72 px / 1,02 |
| H1 | 26 → 34 px / 1,15 |
| H2 | 20 / 28 px |
| H3, corpo | 16 / 24 px |
| Lead | 18 / 28 px |
| Pequeno | 14 / 20 px |
| Rótulo em caixa alta | 12 / 16 px, espaçamento 0,12 em |

IBM Plex Mono fica restrita às teclas de atalho (`Kbd`).

## 6. Cores

Tokens semânticos, redefinidos nos temas claro e escuro: `bg`, `surface`, `surface-raised`,
`surface-sunken`, `text`, `text-muted`, `border`, `border-subtle` (divisórias de lista),
`border-strong` (contorno de controles, ≥ 3:1), `hover`, `selected`, `primary` (amarelo),
`secondary` (tinta), `success`, `warning`, `error`, `info-bg`, `disabled-bg`, `disabled-text`,
`focus`. O palco (`stage-*`) é escuro nos dois temas. Contraste AA verificado com axe nos testes.

## 7. Forma, bordas e sombras

| Raio | Uso |
|---|---|
| 4 px | Selos, teclas |
| 6 px | Opções segmentadas |
| 8 px | Botões, campos, faixas das roletas |
| 12 px | Painéis, diálogos, menus |
| 16 px | Palco do sorteio |
| total | Interruptores |

Linhas de lista não têm raio (continuidade). Sombras só em camadas sobrepostas (menus, diálogos,
avisos, barra fixa do celular).

## 8. Movimento

| Token | Duração | Uso |
|---|---|---|
| `--duration-micro` | 120 ms | Hover, pressionar |
| `--duration-ui` | 200 ms | Interruptores, menus, avisos |
| `--duration-layout` | 320 ms | Entrada do resultado |

Curvas: `--ease-standard` (mudanças), `--ease-enter` (entradas), `--ease-exit` (saídas). Distância
padrão de deslocamento: 6 px. Com "reduzir movimento", as roletas aparecem paradas e as transições
são instantâneas.

**Roletas.** Uma roleta por vencedor; com muitos, várias faixas por roleta (10 vencedores = 5
roletas com 2). Desaceleram longamente e param da esquerda para a direita, no máximo 1 s depois da
primeira. As faixas se acendem quando cada roleta para; o resultado aparece no mesmo palco, em
sequência curta (35 ms por item). A animação nunca decide nada: o resultado já está registrado.

## 9. Componentes

| Componente | Estados |
|---|---|
| `Button` — primário (sortear), secundário, fantasma, perigo | padrão, hover, pressionado, foco, desabilitado (neutro), carregando |
| `TextField`, `TextArea`, `Select` | rótulo, dica, erro com ícone e texto, desabilitado, foco |
| `Switch`, `SegmentedControl` (rádios nativos), `Tabs` (WAI-ARIA, setas/Home/End) | selecionado, hover, foco |
| `Dialog`, `ConfirmDialog` (nativo `<dialog>`: Esc e clique fora fecham) | — |
| `Toast` (região ao vivo), `InlineAlert`, `Badge`, `EmptyState`, `Spinner` | tons informativo, sucesso, aviso, erro |

Ícones: um conjunto só (traço de 2 px, grade de 24 px, cantos arredondados), sempre acompanhados de
texto ou de nome acessível.

## 10. Composição por tela

* **Área do sorteio (desktop):** título editável e privacidade no topo; à esquerda, a lista
  (superfície única, cabeçalho com ações, campos de adicionar e filtrar lado a lado, lista em
  colunas); à direita, regras e histórico rolando, e a base fixa com disponíveis, "Sortear" e
  "Apresentar".
* **Área do sorteio (celular e tablet):** abas fixas no topo; a lista rola com a página; "Limpar
  lista" no fim da lista; "Sortear" na barra do rodapé.
* **Resultado:** o palco escuro é o elemento principal; abaixo, ações (primária à esquerda) e os
  fatos da rodada numa linha discreta.
* **Modo apresentação e telão:** só o palco, com controles que somem após 3 s sem uso.

## 11. Acessibilidade

Navegação completa por teclado, foco visível em todos os controles, alvos de 44 px em telas de
toque, nomes acessíveis para ações só com ícone, anúncios em regiões ao vivo, `aria-setsize` e
`aria-posinset` na lista virtualizada, conteúdo da animação oculto para leitores de tela (que ouvem
"Sorteando…" e o resultado). Verificado com axe (WCAG 2.2 AA) em 320, 768, 1366 px e celular.
