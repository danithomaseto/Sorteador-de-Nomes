# API

Base: `/api/v1` (mesma origem do site). JSON em UTF-8. O contrato completo e atualizado está em
[`backend/openapi.json`](../backend/openapi.json), gerado a partir do código
(`uv run python -m app.cli openapi`); em desenvolvimento, a documentação interativa fica em
`/api/docs`.

**A API não guarda nada.** Não há banco de dados, sessões, cookies nem arquivos em disco: cada
requisição é processada em memória e descartada ao terminar (ADR-017).

## Rotas

| Método | Rota | Para quê | Rate limit (padrão) |
|---|---|---|---|
| `GET` | `/api/health` | Verificar se a API responde | — |
| `GET` | `/api/v1/limits` | Limites do serviço, para a interface validar antes de enviar | — |
| `POST` | `/api/v1/imports/text` | Interpretar texto colado ou um nome digitado/editado | 60/min por IP |
| `POST` | `/api/v1/imports/file` | Interpretar planilha `.xlsx` ou arquivo `.csv` | 60/min por IP |
| `POST` | `/api/v1/rounds` | Executar uma rodada (sorteio) | 120/min por IP |
| `POST` | `/api/v1/exports` | Gerar o arquivo de resultado (CSV ou XLSX) | 60/min por IP |

Corpos de requisição usam tipos estritos (`"3"` não é número) e recusam campos desconhecidos.

---

### `POST /api/v1/imports/text`

```json
{ "text": "João Silva\nMaria\n\njoao silva", "separator": "auto", "header": "auto", "column": null }
```

* `separator`: `auto` | `newline` | `semicolon` | `comma`. Em `auto`: mais de uma linha → uma
  pessoa por linha; senão `;`; senão `,`. Linhas com tab são tratadas como colunas de planilha.
* `header` e `column` só se aplicam quando o texto vira tabela.

Resposta `200` — pré-visualização (mesmo formato para texto e arquivo):

```json
{
  "source": "text",
  "entries": [
    { "row": 1, "name": "João Silva", "key": "joao silva", "repeat_of": null },
    { "row": 2, "name": "Maria", "key": "maria", "repeat_of": null },
    { "row": 4, "name": "joao silva", "key": "joao silva", "repeat_of": 1 }
  ],
  "issues": [],
  "duplicate_groups": [{ "name": "João Silva", "count": 2, "rows": [1, 4] }],
  "stats": { "rows": 4, "valid": 3, "empty": 1, "invalid": 0, "duplicates": 1, "duplicate_groups": 1, "dates": 0 },
  "separator": "newline",
  "has_header": false,
  "columns": [],
  "column": null,
  "sheets": [],
  "sheet": null,
  "max_name_length": 120
}
```

* `entries[].name` já está normalizado; `key` é a chave de duplicidade (sem acentos, maiúsculas e
  espaços extras). Duplicados **nunca** são removidos: `repeat_of` aponta a primeira ocorrência e a
  interface deixa o usuário decidir.
* `issues[].code`: `too_long` (mais de 120 caracteres) ou `cell_error` (`#N/A`, `#REF!`…). Até 100
  itens; o total está em `stats.invalid`.

### `POST /api/v1/imports/file?format=xlsx&sheet=0&column=0&header=auto&delimiter=auto`

O **corpo é o próprio arquivo** (`application/octet-stream`), não multipart — assim nada é gravado
em arquivo temporário. Todas as opções são opcionais:

| Parâmetro | Valores | Observação |
|---|---|---|
| `format` | `xlsx` \| `csv` | Pista vinda da extensão; o conteúdo decide (assinatura do arquivo) |
| `sheet` | índice ≥ 0 | Padrão: primeira aba visível com dados |
| `column` | índice 0–49 | Padrão: coluna com cabeçalho "Nome" (ou similar) ou a que mais parece nomes |
| `header` | `auto` \| `yes` \| `no` | |
| `delimiter` | `auto` \| `semicolon` \| `comma` \| `tab` \| `none` | Só CSV |

Nomes de arquivo e de abas nunca vão na URL. A resposta inclui `sheets`, `columns` (rótulo,
letra, 3 amostras, células preenchidas) e o mesmo conteúdo da importação de texto.

### `POST /api/v1/rounds`

```json
{ "pool_size": 95, "quantity": 3, "allow_repeat": false }
```

Nenhum nome é enviado (ADR-018): o navegador congela a lista de disponíveis e envia só o tamanho.

```json
{
  "positions": [41, 7, 88],
  "pool_size": 95,
  "quantity": 3,
  "allow_repeat": false,
  "algorithm": "partial-fisher-yates/1+os-csprng",
  "drawn_at": "2026-10-03T21:35:12Z"
}
```

`positions` são índices (a partir de 0) na lista congelada, na ordem do sorteio. `drawn_at` é o
horário oficial (relógio do servidor, UTC).

### `POST /api/v1/exports?format=xlsx`

```json
{
  "draw_name": "Churrasco da equipe",
  "timezone": "America/Sao_Paulo",
  "rounds": [
    {
      "number": 2, "drawn_at": "2026-10-03T21:35:12Z", "quantity": 3,
      "allow_repeat": false, "remove_winners": true,
      "total_participants": 100, "pool_size": 95,
      "algorithm": "partial-fisher-yates/1+os-csprng",
      "winners": [{ "position": 1, "name": "Maria Silva" }]
    }
  ]
}
```

Resposta `200` com o arquivo e `Content-Disposition: attachment; filename="…"`. CSV: UTF-8 com BOM,
separador `;`. XLSX: cabeçalho com metadados e tabela de vencedores. Textos que começam com
`= + - @` são neutralizados contra injeção de fórmula.

## Erros

Formato [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457), `Content-Type: application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Participantes insuficientes",
  "status": 422,
  "detail": "Há 2 participantes disponíveis e 3 foram solicitados. Diminua a quantidade ou permita repetição.",
  "code": "insufficient_participants",
  "params": { "available": 2, "requested": 3 },
  "request_id": "5f0c…"
}
```

A interface traduz `code` em mensagens; `detail` é um texto amigável de reserva. Erros de
validação trazem `errors: [{ "field": "quantity", "type": "greater_than_equal" }]` — o valor
recebido nunca é ecoado.

| `code` | Status | Quando |
|---|---|---|
| `invalid_request` | 422 | Corpo ou parâmetros fora do contrato |
| `invalid_quantity` | 422 | Quantidade menor que 1 |
| `empty_pool` | 422 | Nenhum participante disponível |
| `insufficient_participants` | 422 | Sem repetição e quantidade maior que os disponíveis |
| `limit_exceeded` | 422 | Passou de um limite (`params.limit`: `participants`, `round_quantity`, `export_rounds`) |
| `invalid_name` | 422 | Nome vazio ou com mais de 120 caracteres (exportação) |
| `invalid_timezone` | 422 | Fuso horário desconhecido |
| `empty_file` | 422 | Arquivo vazio |
| `invalid_spreadsheet` | 422 | XLSX corrompido ou ilegível |
| `legacy_or_protected_spreadsheet` | 422 | `.xls` antigo ou planilha protegida por senha |
| `spreadsheet_too_large` | 422 | Planilha grande demais depois de descompactada |
| `invalid_text_file` | 422 | CSV que não é texto |
| `too_many_rows` | 422 | Mais linhas com dados que o limite de participantes |
| `text_too_long` | 422 | Texto colado acima do limite |
| `sheet_not_found` / `column_not_found` | 422 | Aba ou coluna escolhida não existe |
| `file_too_large` | 413 | Arquivo acima de 5 MB |
| `payload_too_large` | 413 | Corpo acima do limite geral (8 MB) |
| `unsupported_file_type` | 415 | Não é XLSX nem CSV (ex.: PDF, imagem, .ods) |
| `rate_limited` | 429 | Muitas requisições; cabeçalho `Retry-After` |
| `not_found` / `method_not_allowed` | 404 / 405 | Rota ou método inexistente |
| `internal_error` | 500 | Erro inesperado (detalhes só no log, com o mesmo `request_id`) |

## Cabeçalhos de resposta

Toda resposta da API leva `X-Request-ID`, `Cache-Control: no-store`, `X-Content-Type-Options:
nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`,
`Cross-Origin-Resource-Policy: same-origin` e CSP `default-src 'none'`.
