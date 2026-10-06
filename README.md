# Sorteio360 — sorteio de nomes

Sorteador de nomes online, grátis e sem cadastro. Cole uma lista ou importe uma planilha, escolha
quantos vencedores e sorteie — com um resultado pronto para projetar, copiar ou exportar.

> **Seus dados ficam apenas no seu navegador, durante o sorteio. Não recebemos nem armazenamos sua
> lista de participantes ou seus resultados.**

Tudo acontece no dispositivo de quem usa: não há servidor de aplicação, banco de dados, login,
cookies nem armazenamento no navegador. O site é um conjunto de arquivos estáticos, e a política de
segurança das páginas proíbe o próprio navegador de enviar dados para qualquer lugar.

---

## Funcionalidades

* **Participantes**
  * Digitar um a um.
  * Colar uma lista: um por linha, ou separados por `;` ou `,`. Colunas copiadas de uma planilha também funcionam.
  * Importar `.xlsx`, `.xls` (Excel 97–2003) ou `.csv`, com escolha de aba e coluna. Também é possível arrastar o arquivo para a página.
  * Editar, excluir (com desfazer), filtrar.
  * Até 50 mil nomes, com lista virtualizada que se distribui em colunas nas telas largas.
* **Limpeza automática**
  * Espaços extras, linhas e células vazias, caracteres invisíveis.
  * Nomes longos demais e erros de fórmula (`#N/A`) apontados por linha.
  * Datas suspeitas avisadas.
* **Duplicados**
  * Ignorados por padrão, com aviso claro: "3 nomes duplicados foram ignorados".
  * Opção de manter todos, para homônimos.
  * Nome digitado repetido pede confirmação.
* **Configuração**
  * Quantidade de vencedores: 1, 3, 5, 10, 20 ou outra.
  * Permitir ou não repetição na mesma rodada.
  * Remover ou não os vencedores das próximas rodadas.
  * Revelar todos juntos ou um a um.
* **Experiência do sorteio**
  * Roletas de nomes que desaceleram até os vencedores: uma por vencedor, todas girando ao mesmo tempo. Com muitos vencedores, cada roleta seleciona vários (10 vencedores = 5 roletas com 2 faixas cada).
  * O resultado aparece no mesmo palco: "Vencedor · Parabéns!" ou a lista em ordem (1º, 2º, 3º).
  * Respeita "reduzir movimento".
* **Resultados**
  * Sortear novamente, copiar, exportar em TXT, CSV ou Excel.
  * Salvar em PDF (pela impressão do navegador, só com o resultado) ou como imagem PNG para compartilhar.
  * Histórico de rodadas da sessão.
  * Reiniciar o sorteio (mantém a lista) ou começar um novo.
* **Modo apresentação**
  * Tela cheia para telão, com temas claro e escuro.
  * Atalhos: Espaço sorteia, F alterna tela cheia, Esc sai.
  * Mantém a tela acesa.
  * **Telão em segunda janela:** "Abrir telão" leva o palco para outra janela (arraste para o projetor); quem apresenta controla pelo notebook. A sincronização é feita pelo próprio navegador, sem rede.
* **Páginas públicas**
  * Apresentação do produto, "Como funciona o sorteio" e "Privacidade e termos de uso".
  * Pré-renderizadas, com metadados para buscadores e redes sociais.
* **Acessibilidade**
  * Navegação completa por teclado, foco visível e anúncios para leitores de tela.
  * Contraste WCAG AA verificado automaticamente.
  * Funciona a partir de 320 px de largura.
* **Layout de trabalho**
  * Desktop: lista e regras lado a lado ocupando a tela, sem rolagem dupla; "Sortear" sempre visível.
  * Celular e tablet: seções em abas e "Sortear" na barra do rodapé.

## Tecnologias

| Parte | Escolha |
|---|---|
| Interface | React 19, React Router 8 (SPA com páginas pré-renderizadas), TypeScript 5.9, Vite 8 |
| Estilo | CSS Modules e design tokens próprios; fontes Archivo (interface), Newsreader (títulos editoriais) e IBM Plex Mono, servidas pelo próprio site |
| Sorteio | `crypto.getRandomValues` (Web Crypto) + Fisher–Yates parcial, sem viés |
| Planilhas | leitores próprios de `.xlsx` (com [`fflate`](https://github.com/101arrowz/fflate)) e `.xls`, num Web Worker |
| Lista grande | TanStack Virtual |
| Testes | Vitest e Testing Library; Playwright e axe-core |
| Hospedagem | qualquer hospedagem estática; configurada para a Vercel (`vercel.json`) |

Dependências de execução: React, React DOM, React Router, TanStack Virtual, `fflate` e as fontes.

## Arquitetura

```
Vercel (arquivos estáticos) ──▶ Navegador
                                 ├─ Aba: React · sessão em memória · sorteio · exportação
                                 └─ Web Worker: leitura de texto, CSV, XLSX e XLS
                                 Nenhuma requisição depois do carregamento (CSP connect-src 'none')
```

* `src/services/`: lógica pura, sem React e testada à parte. Contém o motor de sorteio, a normalização de nomes, a importação e a exportação.
* `src/features/`: fluxos da interface (participantes, importação, sorteio, resultado, apresentação, sessão).
* `src/routes/`: as páginas.

Detalhes em [docs/architecture.md](docs/architecture.md). O design system (auditoria, grid, tipografia, cores, movimento e componentes) está em [docs/design.md](docs/design.md).

---

## Como executar localmente

Requisitos:
* [Node.js](https://nodejs.org) 22 LTS (22.12 ou mais nova);
* Git.

```bash
git clone https://github.com/danithomaseto/Sorteador-de-Nomes.git
cd Sorteador-de-Nomes
npm install
npm run dev
```

Abra <http://localhost:5173>, clique em **Criar sorteio**, cole alguns nomes ou importe
`e2e/fixtures/participantes.xlsx` e clique em **Sortear**.

## Build

```bash
npm run build      # gera build/client (site estático) com a CSP embutida em cada página
npm start          # serve o build em http://127.0.0.1:4173, com os mesmos cabeçalhos da Vercel
```

O conteúdo de `build/client` pode ser publicado em qualquer hospedagem estática. As rotas da
aplicação (`/sorteio…`) precisam ser reescritas para `/__spa-fallback.html`, como no `vercel.json`.

## Como publicar na Vercel

1. Crie uma conta em <https://vercel.com> (o login com GitHub é o mais simples).
2. Clique em **Add New… → Project** e importe o repositório `Sorteador-de-Nomes`.
3. Confira a configuração. Ela vem do `vercel.json`, então não precisa mudar nada:
   * Framework Preset: **Other**;
   * Root Directory: a raiz do repositório;
   * Build Command: `npm run build`;
   * Output Directory: `build/client`.
4. Variáveis de ambiente (opcionais), em **Settings → Environment Variables**:
   * `VITE_CONTACT_EMAIL`: e-mail de contato exibido na página de privacidade;
   * `VITE_SITE_URL`: endereço público com domínio próprio (ex.: `https://sorteia.com.br`).
     Sem ela, o domínio de produção da Vercel é usado automaticamente nos links canônicos, no Open
     Graph e no `sitemap.xml`.
5. Clique em **Deploy**. Em cerca de um minuto o site está no ar em `https://<projeto>.vercel.app`.
6. Domínio próprio (opcional): **Settings → Domains**. A Vercel emite o certificado HTTPS
   automaticamente.

A cada `git push` na branch de produção a Vercel publica uma nova versão. Cada pull request ganha um
endereço de prévia.

Pela linha de comando: `npx vercel` (prévia) e `npx vercel --prod` (produção).

> **Privacidade:** não ative o Web Analytics nem o Speed Insights da Vercel. Se ativar, cite-os na
> política de privacidade.

## Testes e verificações

| O quê | Comando |
|---|---|
| Tipos, lint e formatação | `npm run typecheck && npm run lint && npm run format:check` |
| Testes unitários e de componente | `npm test` |
| Ponta a ponta (navegador real) | `npm run build && cd e2e && npm ci && npx playwright install chromium && npx playwright test` |
| Dependências vulneráveis | `npm audit --omit=dev` |

**Testes unitários e de componente (Vitest):**
* motor de sorteio, com testes estatísticos de qui-quadrado;
* normalização de nomes;
* importação de texto, CSV, `.xlsx` e `.xls`, incluindo arquivos inválidos e maliciosos (zip bomb, entidades XML);
* exportação;
* estado da sessão;
* telas.

**Testes de ponta a ponta (Playwright):**
* rodam contra o build de produção servido como na Vercel;
* fluxos completos, exportações, telão em segunda janela, acessibilidade e celular;
* provam que nenhuma requisição de dados sai da página.

O CI (`.github/workflows/ci.yml`) roda tudo isso a cada pull request.

## Estrutura do projeto

```
public/        ícones, imagem de compartilhamento, manifest, robots.txt
scripts/       postbuild.mjs (CSP e sitemap) e serve.mjs (prévia do build)
src/
  components/  design system
  features/    fluxos da interface
  routes/      páginas
  services/    sorteio, nomes, importação e exportação (lógica pura)
  styles/      tokens e estilos globais
  utils/       formatação, SEO, acessibilidade
  config.ts    nome do produto, mensagens e limites
e2e/           testes de ponta a ponta e planilhas de exemplo
docs/          arquitetura, design system, decisões (ADRs) e segurança
vercel.json    configuração de produção
```

## Decisões arquiteturais

As principais estão em [docs/decisions.md](docs/decisions.md):
* **ADR-022:** 100% no navegador, sem backend. React foi mantido porque o frontend já existia, testado e acessível.
* **ADR-023:** leitores próprios de planilha em vez de uma biblioteca com falhas conhecidas na versão do npm.
* **ADR-024:** duplicados ignorados por padrão, com escolha.
* **ADR-025:** hospedagem estática e CSP embutida com `connect-src 'none'`.
* **ADR-026:** experiência do sorteio.
* **ADR-027:** PDF pela impressão do navegador e imagem PNG desenhada em canvas.
* **ADR-028:** telão em segunda janela, sincronizado por `BroadcastChannel`.
* **ADR-029:** por que não há "sorteio verificável" (ainda).
* **ADR-030:** área do sorteio em colunas no desktop e em abas no celular.
* **ADR-031:** roletas múltiplas para vários vencedores.
* **ADR-032:** páginas de apresentação editoriais (serifa nos títulos, bento com recortes reais, fotos só reais).

## Privacidade dos dados

* Os nomes e os arquivos são lidos e processados **no navegador**; o sorteio e a exportação também.
* **Nada é enviado.** A CSP das páginas (`connect-src 'none'`) faz o navegador recusar qualquer envio, inclusive de código de terceiros, e um teste automatizado comprova isso.
* **Nada é guardado.** Não há banco, cookies nem `localStorage`: recarregar ou fechar a página apaga a lista e os resultados. O navegador pede confirmação antes.
* O telão recebe só o que já está na tela, de uma janela para a outra, dentro do navegador (`BroadcastChannel`): não passa pela rede nem grava nada.
* A hospedagem registra dados técnicos de acesso (IP, navegador), como em qualquer site; esses registros nunca incluem nomes ou arquivos.

Mais em [docs/security.md](docs/security.md) e na página `/privacidade` do site.

## Limitações conhecidas

* **Sessão:**
  * Os dados duram só enquanto a aba está aberta: não há link para compartilhar nem histórico entre visitas. Para guardar um registro, exporte o resultado.
  * A data e a hora das rodadas vêm do relógio do dispositivo.
  * Como nada é enviado, o serviço não consegue atestar um resultado depois. Para sorteios com público, use o modo apresentação e exporte o resultado.
* **Planilhas:**
  * Fórmulas valem pelo último resultado salvo no arquivo. Arquivos gerados por programas que não calculam fórmulas aparecem com essas células vazias.
  * Não são aceitas planilhas protegidas por senha, `.ods`, `.xlsb` e arquivos do Excel 95 ou anteriores. Cada caso tem uma mensagem explicando como converter.
* **Tamanho:** até 10 MB por arquivo e 50 mil participantes. Arquivos grandes dependem da memória do dispositivo.
* **Telão:** funciona com as duas janelas no mesmo navegador e no mesmo computador (o projetor como segunda tela). Telão em outro aparelho exigiria um servidor para repassar a cena, o que contraria a regra de não enviar dados.
* **Navegadores:** versões atuais do Chrome, Edge, Firefox e Safari, com JavaScript ativado.
* **Antes de abrir ao público:** a política de privacidade e os termos precisam de revisão jurídica, e o nome "Sorteio360" precisa de busca de marca e de domínio (checklist em [docs/security.md](docs/security.md)).
