# Estado atual da persistência

Este documento substitui a proposta inicial de prontidão para banco de dados. A aplicação Next.js agora utiliza Supabase Auth e consultas ao banco para as telas do lojista; o frontend antigo de demonstração foi retirado da entrada pública.

## Implementado

- Cliente Supabase browser e server com variáveis de ambiente.
- Cadastro, login, logout e recuperação/atualização de senha.
- Perfil do lojista, links de parcelamento, parcelas, chamados e histórico de saques lidos do banco com RLS.
- Criação de links limitada a 1–10 parcelas e valores monetários convertidos para centavos inteiros.
- Cancelamento de links por operação de servidor, recusado quando já existe qualquer pagamento associado.
- Solicitação de saque por operação transacional com reserva de saldo líquido confirmado, chave Pix do perfil e chave idempotente.
- Checkout público com retorno mínimo de dados.
- Criação de cobrança NexusPag no servidor e verificação HMAC do webhook.
- Processamento atômico e idempotente da confirmação de pagamento em função SQL.
- Administração baseada em private.app_admins, com revisão auditada de saques.

## Limitações não resolvidas

- A aplicação ainda depende de credenciais privadas de servidor para checkout, saques e administração.
- NexusPag ainda precisa ser configurada e testada em sandbox. Não foi criada nem confirmada cobrança real durante a implementação.
- Aprovar um saque não envia uma transferência Pix; o processamento permanece manual.
- O painel lista até 100 registros por categoria e ainda não tem paginação.
- Não há um fluxo automatizado de reembolso, reconciliação financeira ou transferências de saque.
- O build/teste mais recente deve ser confirmado pelo GitHub Actions antes de publicar.

## Testes

O workflow .github/workflows/ci.yml executa os testes de centavos e a build Next.js. Os testes cobrem formatos monetários, rejeição de valores inválidos e soma exata das parcelas; testes de integração isolados para Auth, RLS, webhook e saques ainda são necessários antes de uso financeiro em produção.
