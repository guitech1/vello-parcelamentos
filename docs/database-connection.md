# Conexão com o Banco de Dados

Este documento descreve o que é necessário para conectar o Vello Parcelamentos ao banco de dados real.

## Variáveis de ambiente necessárias

```env
DATABASE_URL=postgresql://user:password@host:5432/vello
JWT_SECRET=uma-chave-secreta-longa-e-aleatoria
NEXUSPAG_API_KEY=sua-chave-nexuspag
NEXUSPAG_WEBHOOK_SECRET=seu-webhook-secret
APP_URL=https://seu-dominio.com
```

Configure essas variáveis no Netlify (Site settings → Environment variables) ou em `.env.local` para desenvolvimento local. Nunca as coloque no código do frontend.

## Modelos

Os tipos estão em `src/types/domain.ts`:

- User
- Sale
- Installment
- Withdrawal

## Contratos de repositório

Interfaces em `src/repositories/interfaces.ts`:

- UserRepository
- SaleRepository
- WithdrawalRepository
- UnitOfWork

Quando o banco estiver disponível, implemente essas interfaces com o cliente de banco escolhido (Prisma, Drizzle, etc.) e injete a implementação concreta nos serviços.

## Serviços de aplicação

Contratos em `src/services/contracts.ts`:

- AuthService
- MerchantService
- AdminService
- PaymentGatewayService (NexusPag)

A interface do usuário (SPA atual) deverá passar a consumir estes serviços via API routes do Next.js ou backend separado, em vez de localStorage.

## Passos para ativar o banco

1. Fornecer `DATABASE_URL` válida.
2. Criar as tabelas correspondentes aos modelos (migrations).
3. Implementar os repositórios concretos.
4. Criar as API routes / handlers que usam os serviços.
5. Substituir a implementação de demonstração pela implementação real.
6. Configurar autenticação real (JWT / session).
7. Configurar webhooks da NexusPag apontando para o backend.

Até que esses passos sejam concluídos, a aplicação continua operando com dados locais de exemplo.
