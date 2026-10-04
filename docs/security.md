# Segurança e privacidade

> Seus dados ficam apenas no seu navegador, durante o sorteio. Não recebemos nem armazenamos sua
> lista de participantes ou seus resultados.

Este documento descreve as proteções técnicas. Ele **não** é um parecer jurídico: a adequação à LGPD
e aos termos de uso deve ser validada por assessoria jurídica antes do lançamento público.

## 1. Princípio: não receber, não guardar

A aplicação é um conjunto de arquivos estáticos. Depois que a página carrega, tudo acontece no
dispositivo da pessoa (ADR-022).

| Dado | Onde existe | Por quanto tempo |
|---|---|---|
| Lista de participantes, configurações, rodadas, histórico | memória JavaScript da aba | até recarregar/fechar a aba ou clicar em "Novo sorteio" |
| Arquivo importado (.xlsx, .xls, .csv) | memória da aba e do Web Worker de importação | até montar a pré-visualização |
| Texto colado, nome digitado | memória da aba | até fechar a página |
| Arquivo exportado (TXT, CSV, XLSX, PDF pela impressão, PNG) | gerado na aba e salvo pelo navegador no dispositivo | fica com a pessoa |
| Cena do telão (nome do sorteio, vencedores na tela, amostra da animação) | memória das duas janelas; passa de uma à outra por `BroadcastChannel`, dentro do navegador | até fechar as janelas |
| Dados técnicos de acesso (IP, navegador, página) | registros da hospedagem (Vercel), como em qualquer site | conforme a política da hospedagem; **nunca** incluem nomes ou arquivos |

Não existem: servidor de aplicação, banco de dados, cookies, `localStorage`, `sessionStorage`,
IndexedDB, analytics, rastreadores, fontes ou scripts de terceiros.

Garantias no código:

* **Regra de lint** proíbe `localStorage`, `sessionStorage`, `indexedDB`, `caches` e
  `document.cookie`.
* **CSP com `connect-src 'none'`**: o navegador recusa qualquer `fetch`, XHR, WebSocket ou beacon,
  de qualquer código da página (inclusive dependências). Também `form-action 'none'`.
* **Testes E2E** provam que o fluxo completo (colar, importar, sortear, exportar) só faz requisições
  `GET` aos arquivos do próprio site, que uma tentativa de envio é bloqueada e que nada fica no
  armazenamento do navegador.
* **Testes de componente** substituem `fetch` por uma função que reprova o teste se for chamada.

## 2. Ameaças e mitigações

| Ameaça | Mitigação |
|---|---|
| Vazamento da lista | Não há para onde vazar: nada é enviado (CSP `connect-src 'none'`), nada é guardado |
| XSS (nome malicioso como `<script>`) | React escapa todo texto; lint proíbe `dangerouslySetInnerHTML`; CSP sem `unsafe-inline` (scripts embutidos do build permitidos por hash SHA-256) |
| Injeção de fórmula na planilha exportada | CSV: apóstrofo antes de `= + - @`, tab e CR (OWASP). XLSX: textos gravados como "inline string", nunca como fórmula |
| Planilha maliciosa: zip bomb | Tamanho descompactado declarado verificado antes de descompactar (limite de 80 MB); o `fflate` usa esse tamanho como buffer fixo, então um arquivo que mente o tamanho não aloca mais memória |
| Planilha maliciosa: XML (billion laughs, XXE) | O XML é lido sem DTD: entidades personalizadas e externas nunca são expandidas |
| Planilha maliciosa: `.xls` corrompido | Leitor do Compound File valida setores e cadeias (sem laços nem leitura fora do arquivo); qualquer falha vira mensagem amigável |
| Macros | Nunca executadas: só valores de células são lidos (fórmulas valem pelo resultado salvo) |
| Arquivo de outro tipo renomeado | O conteúdo decide o formato; PDF, imagens, `.ods`, `.xlsb`, `.doc(x)` e Excel 95 recebem mensagens próprias |
| Arquivo ou texto gigantes travando a aba | Limites: 10 MB por arquivo, 2 milhões de caracteres colados, 50 mil participantes, 50 colunas; leitura num Web Worker com tempo máximo de 60 s (o Worker é encerrado) |
| Resultado previsível | `crypto.getRandomValues` (CSPRNG do sistema) com amostragem por rejeição; nunca `Math.random` no sorteio. A amostra de nomes da animação usa `Math.random`, mas não decide nada |
| Clickjacking | `X-Frame-Options: DENY` e `frame-ancestors 'none'` (cabeçalhos) |
| Telão recebendo mensagens de outra origem | `BroadcastChannel` só conecta janelas da mesma origem no mesmo navegador; o nome do canal é aleatório por aba e fica no fragmento do endereço (nunca enviado ao servidor); mensagens fora do protocolo são ignoradas. O telão não tem dados próprios: só desenha a cena recebida |
| Dependências vulneráveis | Uma dependência de execução nova (`fflate`, sem dependências próprias); `npm audit` no CI; versões fixadas no lockfile |

## 3. Cabeçalhos (vercel.json)

`Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Cross-Origin-Opener-Policy: same-origin`, `Strict-Transport-Security`, `Permissions-Policy`
restritiva (com `fullscreen=(self)` e `screen-wake-lock=(self)` para o modo apresentação) e cache
imutável em `/assets/`.

### Content-Security-Policy das páginas

Gerada no build (`scripts/postbuild.mjs`) e embutida numa tag `<meta>` no início de cada página:

```
default-src 'self'; script-src 'self' 'sha256-…'; style-src 'self'; img-src 'self';
font-src 'self'; connect-src 'none'; worker-src 'self'; manifest-src 'self';
object-src 'none'; base-uri 'none'; form-action 'none'
```

* O React Router coloca alguns scripts pequenos no HTML pré-renderizado. Em vez de liberar
  `'unsafe-inline'`, o build calcula o SHA-256 de cada um e só esses ficam permitidos; a política
  muda a cada build e nunca é escrita à mão (cópia em `build/csp.txt`).
* `style-src 'self'` sem exceções: o build falha se o HTML gerado tiver atributo `style`.
* `frame-ancestors` não vale em `<meta>` e por isso vai como cabeçalho.
* Os testes E2E rodam contra o build servido com o mesmo `vercel.json`; qualquer violação de CSP ou
  exceção na página reprova o teste.

## 4. Aleatoriedade e transparência

* `crypto.getRandomValues` (Web Crypto), amostragem por rejeição e Fisher–Yates parcial (ADR-004,
  ADR-022). Testes estatísticos (qui-quadrado) no CI, e um teste que confirma que eles detectam o
  erro clássico do algoritmo.
* Comunicação honesta: "cada participante disponível tem a mesma probabilidade". Não afirmamos
  "comprovadamente justo" nem "impossível de manipular": quem organiza controla a lista e o
  dispositivo, e o serviço, por não receber nada, não consegue atestar um resultado depois. A
  exportação (com horário e regras) é o registro sob controle da própria pessoa.
* Pelo mesmo motivo não há "sorteio verificável" com semente publicada: sem um terceiro que fixe o
  compromisso antes do sorteio, quem organiza poderia testar sementes até obter o resultado
  desejado, e a função prometeria mais do que garante (ADR-029).

## 5. LGPD — pontos para a validação jurídica

* Nomes são dados pessoais, mas não são coletados pelo serviço: o tratamento acontece no dispositivo
  de quem usa. Vale confirmar com a assessoria o enquadramento do serviço nesse cenário.
* Escolas podem inserir nomes de crianças e adolescentes (art. 14 da LGPD): a ausência de coleta
  reduz o risco; a política de privacidade trata do tema.
* A hospedagem registra dados técnicos de acesso (IP, navegador), como qualquer site: citar a
  hospedagem na política de privacidade e avaliar o contrato de tratamento de dados.
* Canal de contato do controlador: `VITE_CONTACT_EMAIL`.
* Sorteios usados como promoção comercial podem exigir autorização prévia do Ministério da Fazenda
  (Lei nº 5.768/1971). Os termos de uso informam que a ferramenta não substitui essa autorização.

## 6. Checklist antes de publicar

- [ ] Domínio próprio configurado na Vercel (HTTPS automático) e `VITE_SITE_URL` definido
- [ ] `VITE_CONTACT_EMAIL` definido; revisão jurídica da política de privacidade e dos termos
- [ ] Busca de marca (INPI) e registro do domínio
- [ ] `npm audit --omit=dev` sem vulnerabilidades altas; CI verde
- [ ] Conferir no navegador (DevTools → Rede) que nenhuma requisição é feita ao importar e sortear
- [ ] Desativar, na Vercel, recursos que coletem dados de visitantes (Web Analytics, Speed Insights)
      ou citá-los na política de privacidade
