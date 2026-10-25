# Cadastro seguro do primeiro administrador

O painel administrativo não promove automaticamente o primeiro usuário cadastrado. A autorização é verificada no servidor usando a tabela privada `private.app_admins`.

## Procedimento operacional

1. Cadastre uma conta administrativa pela tela de cadastro normal e confirme o e-mail.
2. Abra o SQL Editor do projeto Supabase correto.
3. Confirme que o e-mail identifica exatamente uma conta confirmada:

```sql
select id, email, email_confirmed_at
from auth.users
where lower(email) = lower('EMAIL_CONFIRMADO_DO_ADMIN');
```

4. Confira manualmente o UUID retornado e insira apenas esse UUID na lista privada:

```sql
insert into private.app_admins (user_id)
values ('UUID_CONFIRMADO_DO_ADMIN')
on conflict (user_id) do nothing;
```

5. Verifique a inclusão:

```sql
select user_id, created_at
from private.app_admins
where user_id = 'UUID_CONFIRMADO_DO_ADMIN';
```

Não use um UUID copiado de um perfil não verificado. Não exponha a tabela `private.app_admins` na API pública. Apenas o backend com credenciais de servidor pode consultar a lista.

## Limites atuais do painel

- O painel mostra até 100 registros por lista.
- Aprovar um saque registra o responsável e o horário, mas **não executa uma transferência Pix**.
- A transferência precisa de um processo financeiro separado, auditado e validado antes de entrar em produção.
- A integração NexusPag depende de credenciais privadas configuradas no ambiente do servidor.
