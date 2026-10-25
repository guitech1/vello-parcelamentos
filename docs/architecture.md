# Arquitetura — Vello Parcelamentos

## Visão geral

A aplicação atual é uma SPA autocontida (`public/index.html`) com todos os fluxos do lojista, checkout público e painel administrativo funcionando com dados de demonstração persistidos em `localStorage`.

A estrutura de pastas do repositório já segue a arquitetura alvo em Next.js (App Router + TypeScript + Tailwind) para permitir migração progressiva sem reescrever a lógica de negócio.

## Princípios

1. **Separação de responsabilidades**
   - UI (componentes e páginas)
   - Regras de negócio e cálculos
   - Serviços (contratos)
   - Implementação de demonstração (substituível)
   - Tipos e modelos

2. **Serviços substituíveis**
   - A interface nunca depende diretamente de arrays ou localStorage.
   - Todo acesso a dados passa por uma camada de serviço com contratos claros.
   - A implementação atual (`demo`) pode ser trocada por uma implementação `api` sem alterar as telas.

3. **Dados coerentes**
   - Uma única fonte de verdade para vendas, parcelas, saldos e saques.
   - Atualizações em uma tela refletem nas demais.

4. **Demonstração explícita**
   - Todos os dados são fictícios e claramente identificados.
   - Nenhum fluxo afirma processar pagamento real.

## Design system

Tokens principais:

| Token              | Valor      | Uso                          |
|--------------------|------------|------------------------------|
| primary            | #22C55E    | Ações principais, estados ok |
| primary-dark       | #15803D    | Hover / ênfase               |
| primary-soft       | #DCFCE7    | Fundos suaves                |
| background         | #F7F9F7    | Fundo da aplicação           |
| surface            | #FFFFFF    | Superfícies / cards          |
| text               | #111713    | Texto principal              |
| text-secondary     | #66716A    | Texto secundário             |
| border             | #E5EAE6    | Bordas                       |

Tipografia: Inter / system-ui.

## Responsividade

- Desktop (≥ 821px): sidebar fixa + conteúdo principal.
- Mobile: bottom navigation + formulários em coluna única + tabelas convertidas em cards.

## Segurança (pendente de produção)

- Autenticação real (não implementada).
- Proteção de rotas administrativas.
- Não exposição de API keys no frontend.
- Validação server-side de todos os inputs.
- Rate limiting e auditoria de saques.
- Webhooks com assinatura HMAC (NexusPag).
