# Segurança e privacidade

> Seus dados ficam apenas durante o sorteio. Não armazenamos sua lista de participantes nem seus
> resultados.

Este documento descreve as proteções técnicas. Ele **não** é um parecer jurídico: a adequação à LGPD
(e aos termos de uso) deve ser validada por assessoria jurídica antes do lançamento público.

## 1. Princípio: não guardar

A medida de privacidade mais forte do produto é não ter o que vazar (ADR-017).

| Dado | Onde existe | Por quanto tempo |
|---|---|---|
| Lista de participantes, configurações, rodadas, histórico | memória JavaScript da aba do usuário | até recarregar/fechar a aba ou clicar em "Novo sorteio" |
| Arquivo XLSX/CSV importado | memória do servidor, durante uma requisição | até o fim da requisição; nunca vai para disco |
| Texto colado, nome digitado | memória do servidor, durante uma requisição | até o fim da requisição |
| Pedido de sorteio | servidor recebe só quantidade disponível e quantidade a sortear | até o fim da requisição |
| Pedido de exportação | memória do servidor, durante uma requisição | até o fim da requisição |
| Endereço IP | hash com sal aleatório por processo, no contador de rate limit | até expirar a janela do limite (minutos) |

Não existem: banco de dados, cookies, sessões no servidor, `localStorage`, `sessionStorage`,
IndexedDB, cache HTTP de respostas da API, analytics, rastreadores, fontes ou scripts de terceiros.

Garantias no código:

* **Frontend:** regra de lint proíbe `localStorage`, `sessionStorage`, `indexedDB`, `caches` e
  `document.cookie` em todo o código. Antes de recarregar ou fechar a aba com dados, o navegador pede
  confirmação.
* **Backend:** não há dependência de banco de dados; arquivos são recebidos como corpo bruto (sem o
  parser multipart, que grava partes grandes em arquivos temporários); respostas levam
  `Cache-Control: no-store`.
* **Sorteio:** o servidor nem recebe os nomes — só o tamanho da lista (ADR-018).

## 2. Ameaças e mitigações

| Ameaça | Mitigação |
|---|---|
| Vazamento de dados no servidor | Não há dados persistidos; logs sem conteúdo (ver §4) |
| XSS (nome malicioso como `<script>`) | React escapa todo texto; lint proíbe `dangerouslySetInnerHTML`; CSP estrita no site (sem `unsafe-inline`: só scripts do próprio domínio e os embutidos do build, por hash) e `default-src 'none'` na API |
| Injeção de fórmula em planilha exportada | CSV: apóstrofo antes de `= + - @`, tab e CR (OWASP). XLSX: células de texto gravadas com tipo string explícito |
| Planilha maliciosa (zip bomb, XML bomb, XXE) | Assinatura e estrutura verificadas antes de abrir; limite de 50 MB descompactado (o `zipfile` nunca entrega mais que o tamanho declarado); `openpyxl` somente leitura com `defusedxml`; limites de linhas, colunas e linhas vazias seguidas; qualquer falha do parser vira erro amigável |
| Arquivo de outro tipo renomeado | O conteúdo decide o formato; PDF, imagens, `.ods`, `.docx` e `.xls` recebem mensagens próprias |
| Corpos gigantes / esgotamento de memória | Limite geral de 8 MB (por `Content-Length` e contando bytes em streaming), 5 MB por arquivo, 2 milhões de caracteres por texto, 50 mil participantes, 10 mil vencedores por rodada, 1.000 rodadas por exportação; o proxy também limita o corpo |
| Abuso (automação, DoS de CPU) | Rate limit por IP em importação, sorteio e exportação; leitura de planilha fora do event loop |
| Manipulação do resultado pelo cliente | A API não aceita seed; o sorteio usa o CSPRNG do sistema operacional; o horário vem do servidor. Limite reconhecido: como nada é guardado, o servidor não pode atestar depois um resultado — ver "Como funciona" |
| Clickjacking | `X-Frame-Options: DENY` e `frame-ancestors 'none'` |
| CSRF | Não há cookies nem sessão: não existe credencial para um site terceiro aproveitar |
| Dependências vulneráveis | `pip-audit` e `npm audit` no CI; versões fixadas em lockfiles |

## 3. Cabeçalhos

API (todas as respostas): `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-origin`, `Cache-Control: no-store`,
`Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` (exceto `/api/docs`, desligado
em produção).

Site (Caddy, em produção): `Strict-Transport-Security`, `Permissions-Policy` restritiva (com
`fullscreen=(self)` e `screen-wake-lock=(self)` para o modo apresentação),
`Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` e a CSP
abaixo. Ver `deploy/Caddyfile`.

### Content-Security-Policy do site

```
default-src 'self'; script-src 'self' 'sha256-…'; style-src 'self'; img-src 'self';
font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self';
frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'
```

* O React Router coloca alguns scripts pequenos dentro do HTML pré-renderizado (dados de hidratação
  e restauração de rolagem). Em vez de liberar `'unsafe-inline'`, o build
  (`frontend/scripts/csp.mjs`, executado por `npm run build`) calcula o SHA-256 de cada um e só
  esses ficam permitidos. A política sai em `frontend/build/csp.caddy` (importada pelo Caddy) e
  `frontend/build/csp.txt`; ela muda a cada build, por isso é gerada e nunca escrita à mão.
* `style-src 'self'` sem exceções: o build falha se o HTML gerado tiver atributo `style`. Estilos
  aplicados pelo React em tempo de execução (CSSOM) não são afetados pela CSP.
* Tudo é servido pelo próprio domínio: fontes auto-hospedadas, nenhuma CDN, nenhum script de
  terceiros, `connect-src 'self'` (o navegador só conversa com a própria API).
* Os testes E2E rodam contra o build de produção servido com essa mesma CSP
  (`frontend/scripts/serve.mjs`); qualquer violação ou exceção na página reprova o teste.

## 4. Logs (observabilidade sem dados pessoais)

Logs em JSON no stdout, uma linha por requisição: `request_id`, método, rota, status e duração.
Eventos técnicos relevantes também são registrados (`app_error` com `code`, `invalid_request` com os
nomes dos campos, `xlsx_unreadable` com o tipo da exceção, `unexpected_error` com stack trace).

Nunca registramos: nomes de participantes, conteúdo de arquivos, nomes de arquivos ou abas, valores
recebidos em validações, query strings, endereços IP. O log de acesso do uvicorn é desligado (ele
registraria a URL completa) e o Caddy não registra acessos (sem diretiva `log`). Um teste
automatizado verifica que um nome enviado à API não aparece em nenhum registro de log.

## 5. Aleatoriedade e transparência

* `secrets.randbelow` (CSPRNG do sistema operacional), amostragem por rejeição, Fisher–Yates parcial
  (ADR-004). Testes estatísticos (qui-quadrado) no CI.
* Comunicação honesta: "cada participante disponível tem a mesma probabilidade". Não afirmamos
  "comprovadamente justo" nem "impossível de manipular": quem organiza controla a lista, e o
  serviço, por não guardar nada, não consegue atestar um resultado depois. A exportação (com horário
  do servidor e metadados) é o registro sob controle do próprio usuário.

## 6. LGPD — pontos para a validação jurídica

* Nomes são dados pessoais; o tratamento é transitório (só durante a requisição no servidor) e a
  sessão fica no dispositivo do usuário.
* Escolas podem inserir nomes de crianças e adolescentes (art. 14 da LGPD): a ausência de
  armazenamento reduz o risco, mas a política de privacidade deve tratar do tema.
* Endereço IP: processado de forma transitória para segurança (rate limit), em hash.
* Avaliar o enquadramento como agente de tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022)
  e o canal de contato do controlador (`VITE_CONTACT_EMAIL`).
* Sorteios usados como promoção comercial podem exigir autorização prévia do Ministério da Fazenda
  (Lei nº 5.768/1971). Os termos de uso informam que a ferramenta não substitui essa autorização.

## 7. Checklist antes de publicar

- [ ] HTTPS com HSTS (Caddy obtém e renova o certificado automaticamente)
- [ ] `APP_ENV=production`, `APP_DOCS_ENABLED=false`
- [ ] Revisão jurídica da política de privacidade e dos termos de uso; `VITE_CONTACT_EMAIL` definido
- [ ] Busca de marca (INPI) e domínio
- [ ] `pip-audit` e `npm audit` sem vulnerabilidades altas
- [ ] Logs de produção verificados: sem nomes, sem IPs, sem query strings
- [ ] Teste de carga leve nas rotas de importação (limites de CPU do servidor)
