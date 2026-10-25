# Integração NexusPag — Plano e Documentação Confirmada

**Fonte oficial consultada:** https://nexuspag.com/

> Esta documentação registra apenas o que está publicamente disponível e confirmado. Nenhum endpoint, parâmetro ou comportamento foi inventado.

## Visão geral confirmada

- Base URL: `https://nexuspag.com`
- API v1.0
- Foco: cobranças PIX, SPEI (MXN), splits, webhooks assinados e integrações server-to-server.
- Autenticação: header `x-api-key` (API key obtida no Dashboard → Integrações → API Keys).
- Webhooks: validação HMAC com secret obtido no Dashboard → Integrações → Webhooks.
- Formato: JSON (`Content-Type: application/json`).
- Datas: ISO 8601, timezone UTC.
- Idempotência: usar `external_id` para evitar cobranças duplicadas no mesmo pedido.

## Endpoints confirmados

### Criar cobrança PIX
- **Método / Path:** `POST /api/pix/create`
- **Descrição:** Gera QR Code PIX para recebimento. Suporta split automático.
- **Uso previsto na Vello:** criar a cobrança da parcela atual no momento em que o comprador confirma a compra no checkout.

### Consultar PIX
- **Método / Path:** `GET /api/pix/{id}`
- **Descrição:** Consulta status e detalhes de uma cobrança PIX (incluindo splits). O `{id}` pode ser o UUID interno, o txid do gateway ou o `external_id` informado na criação.
- **Uso previsto:** polling ou consulta pontual após criação; preferir webhook para atualização de status.

### Criar cobrança MXN (SPEI)
- **Método / Path:** `POST /api/spei/create`
- **Descrição:** Gera instrução SPEI com CLABE.
- **Uso previsto:** fora do escopo inicial da Vello (foco Brasil/Pix).

## O que ainda precisa ser validado / obtido

- Payload exato de `POST /api/pix/create` (campos obrigatórios, opcionais, split).
- Formato da resposta (QR Code, código copia-e-cola, expiração, status inicial).
- Lista completa de status possíveis da cobrança.
- Payload e eventos dos webhooks (quais eventos, estrutura do body, header de assinatura).
- Tratamento de erros e códigos HTTP.
- Limites de taxa (rate limits).
- Ambiente de sandbox / credenciais de teste.

**Ação necessária:** acesso ao painel NexusPag da conta da Vello + documentação completa ou suporte oficial.

## Arquitetura de integração recomendada (futuro)

```
Frontend (checkout)
      ↓  (apenas UI)
Backend Vello (Route Handler / API)
      ↓  x-api-key (nunca no frontend)
NexusPag POST /api/pix/create
      ↓
Armazena external_id + id da cobrança no banco
      ↓
Webhook NexusPag → Backend Vello (valida HMAC)
      ↓
Atualiza status da parcela + saldos + notifica lojista
```

### Regras de segurança obrigatórias

1. API key e webhook secret **somente no backend** (variáveis de ambiente).
2. Nunca gerar ou exibir QR Code / código Pix real no frontend sem confirmação de origem do backend.
3. Sempre enviar `external_id` único por parcela/venda para idempotência.
4. Validar assinatura HMAC de todos os webhooks antes de processar.
5. Tratar status intermediários e finais de forma idempotente no banco.
6. Registrar auditoria de criação de cobrança e mudança de status.

## Status da implementação nesta etapa

- [x] Análise da documentação pública disponível
- [x] Documentação dos endpoints confirmados
- [x] Plano de arquitetura server-to-server
- [ ] Implementação de chamadas reais (pendente de credenciais e backend)
- [ ] Webhooks (pendente)
- [ ] Testes em sandbox (pendente)

---

Última atualização com base em https://nexuspag.com/ (outubro 2026).
