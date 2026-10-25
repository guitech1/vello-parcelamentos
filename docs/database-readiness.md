# Preparação para Banco de Dados

Esta etapa **não implementa** banco de dados, migrações nem conexões reais.

O objetivo é deixar a aplicação e a arquitetura prontas para receber a persistência definitiva sem reescrever a interface.

## Modelos de dados principais (propostos)

### User (lojista)
- id, name, email, phone, storeName, tiktok?, status, balanceCents, releaseCents, createdAt, updatedAt

### Sale (venda / link)
- id, ownerId, storeName, buyerName, buyerCpf, buyerPhone, totalCents, installments, summary, status, createdAt

### Installment (parcela)
- id, saleId, number, valueCents, dueDate, paidAt?, status

### Withdrawal (saque)
- id, ownerId, amountCents, keyType, key, holder, status, createdAt, processedAt?

### Admin / Platform
- maintenanceMode (boolean)

## Serviços que devem ser implementados no backend

| Serviço              | Operações principais                                      |
|----------------------|-----------------------------------------------------------|
| Auth                 | login, register, session, logout                          |
| Dashboard (merchant) | getKPIs, recentTransactions, upcomingInstallments         |
| Sales                | create, list, getById, updateStatus                       |
| Payments             | list, markPaid (via webhook)                              |
| Withdrawals          | request, list, approve, reject                            |
| Admin                | listUsers, listSales, getPlatformStats, setMaintenance    |
| Profile              | get, update                                               |

## Camada de serviços no frontend

Todos os acessos a dados devem passar por interfaces em `src/services/`.

Implementação atual: `services/demo/*` (localStorage + seed).  
Implementação futura: `services/api/*` (fetch para backend).

A troca deve ser feita por configuração (variável de ambiente ou factory), sem alterar componentes de UI.

## O que NÃO deve ser feito nesta etapa

- Criar tabelas, migrations ou schemas de banco.
- Configurar Prisma, Drizzle, Supabase client de produção, etc.
- Armazenar credenciais ou connection strings.
- Fazer chamadas reais a APIs financeiras.

## Checklist de prontidão

- [x] Separação UI × serviços × dados
- [x] Tipos e modelos documentados
- [x] Dados de demonstração coerentes entre telas
- [x] Contratos de serviço definidos
- [x] Persistência local apenas para demo
- [x] Documentação de pontos de integração
- [ ] Backend + banco real
- [ ] Autenticação e autorização
- [ ] Webhooks e idempotência
