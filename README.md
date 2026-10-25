# Vello Parcelamentos

Aplicação Next.js para gestão de links de parcelamento, parcelas, suporte e solicitações de saque com dados persistidos no Supabase.

## Execução local

```bash
cp .env.example .env.local
npm install
npm test
npm run build
npm run dev
```

Abra `http://localhost:3000`. A rota `/index.html` redireciona para a aplicação principal.

## Variáveis de ambiente

Obrigatórias para autenticação no frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Necessárias apenas no servidor para checkout público, saques e administração:

- `SUPABASE_URL` (pode usar a URL pública se for o mesmo projeto)
- `SUPABASE_SERVICE_ROLE_KEY`

Necessárias para criação de cobranças e validação de webhooks NexusPag:

- `NEXUSPAG_API_KEY`
- `NEXUSPAG_WEBHOOK_SECRET`
- `APP_URL` (URL HTTPS pública usada para registrar o webhook)

Nunca defina a chave `service_role` em variáveis `NEXT_PUBLIC_*`, arquivos públicos ou commits.

## Rotas principais

- `/` — cadastro, login, recuperação de senha e painel do lojista.
- `/checkout/[token]` — consulta mínima do link e fluxo de criação de Pix da primeira parcela.
- `/admin` — painel administrativo, acessível somente a usuários incluídos em `private.app_admins`.
- `/api/withdrawals` — solicitação autenticada de saque com validação transacional de saldo líquido confirmado.
- `/api/webhooks/nexuspag` — webhook HMAC verificado, com processamento idempotente no banco.

## Migrações

As migrações incrementais estão em `supabase/migrations/`. As migrações para processamento de webhook, saques, cancelamento de links e ações administrativas foram aplicadas ao projeto Supabase conectado durante a implementação. Confirme sempre o histórico de migrações antes de aplicar os arquivos novamente em outro ambiente.

Consulte [Cadastro seguro do primeiro administrador](docs/admin-bootstrap.md) antes de habilitar a administração.

## Limitações importantes

- A build e os testes são validados pelo workflow GitHub Actions; veja o estado mais recente antes de publicar.
- O checkout gera cobrança real apenas quando as credenciais NexusPag e as variáveis privadas estiverem configuradas no ambiente de servidor.
- A confirmação de pagamento depende de webhook autenticado e da função transacional aplicada ao Supabase.
- Aprovar um saque registra a decisão e o responsável; não executa a transferência Pix. O processamento de transferências permanece manual e não deve ser apresentado como automático.
- O painel administrativo lista até 100 registros por categoria.
- A aplicação ainda não deve ser considerada pronta para produção financeira até que a implantação seja verificada, as credenciais sejam configuradas com segurança e os fluxos de pagamento/saque sejam testados em sandbox com o provedor.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Conexão com banco de dados](docs/database-connection.md)
- [Prontidão do banco](docs/database-readiness.md)
- [Integração NexusPag](docs/nexuspag-integration.md)
- [Cadastro do administrador](docs/admin-bootstrap.md)
