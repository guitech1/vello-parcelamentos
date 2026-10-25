# Integração NexusPag

Documentação oficial consultada: https://nexuspag.com/docs, https://nexuspag.com/docs/create-pix, https://nexuspag.com/docs/get-pix e https://nexuspag.com/docs/webhook-payment.

## Endpoints confirmados

### Criar cobrança Pix

- Método: POST /api/pix/create
- Base URL: https://nexuspag.com
- Autenticação: header x-api-key, somente no servidor.
- Corpo utilizado pela Vello: amount (reais, mínimo R$ 1,00), description, external_id, webhook_url e expiration.
- A resposta documentada contém transaction.id, transaction.status, transaction.pix_copia_cola, transaction.qr_code_base64, transaction.expires_at e transaction.net_amount.
- external_id é a chave de idempotência; uma repetição com o mesmo identificador deve recuperar a cobrança existente em vez de criar outra.

### Consultar cobrança Pix

- Método: GET /api/pix/{id}
- A documentação lista os estados pending, paid, expired e cancelled.
- A rota de consulta ainda não está exposta na aplicação. A reconciliação por consulta/polling continua sendo uma etapa pendente.

## Webhook de pagamento

- Evento de confirmação: payment.confirmed.
- Headers documentados: X-Webhook-Event e X-Webhook-Signature.
- A assinatura usa o formato t=<unix>,v1=<hmac_hex> e HMAC-SHA256 do texto <unix>.<body HTTP bruto>, com o segredo configurado no painel NexusPag.
- A aplicação rejeita assinaturas ausentes/inválidas e timestamps com diferença superior a cinco minutos.
- O handler usa uma função SQL transacional com idempotência, valida o external_id, o ID da transação e o valor antes de marcar pagamento e parcela como pagos.
- A função SQL só pode ser executada por service_role; anon e authenticated não têm permissão de execução.

## Implementação no repositório

- POST /api/checkout/[token]/payment cria a cobrança no servidor, usando external_id estável por parcela e o endpoint documentado.
- POST /api/webhooks/nexuspag verifica a assinatura e encaminha o evento para a função transacional.
- O checkout exibe o Pix retornado pelo provedor; o navegador não marca pagamentos como pagos.
- A cobrança implementada neste estágio é somente da primeira parcela do link.
- A chave da API e o segredo do webhook não são incluídos no frontend nem nos arquivos versionados.

## Bloqueios e limites restantes

- Definir no ambiente de servidor: NEXUSPAG_API_KEY, NEXUSPAG_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY e APP_URL.
- Testar em sandbox com credenciais válidas antes de habilitar pagamentos em produção.
- Implementar consulta/reconciliação de status, expiração/cancelamento do lado do provedor e fluxo de reembolso se necessário.
- Saques aprovados no painel são apenas autorizados para processamento manual; nenhuma transferência Pix é executada.
- Não houve criação de cobrança real durante esta implementação.

Última revisão: outubro de 2026.
