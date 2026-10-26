-- Merchant account approval uses profiles.account_status as the single source of truth.

alter table public.profiles
  add column if not exists account_status text not null default 'pending';

alter table public.profiles
  alter column account_status set default 'pending';

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('pending', 'active', 'suspended', 'rejected'));

comment on column public.profiles.account_status is
  'pending = aguardando aprovação do admin; active = pode usar a plataforma; suspended/rejected = bloqueado';

create or replace function public.admin_set_merchant_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not exists (
    select 1 from private.app_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Não autorizado';
  end if;

  if p_status not in ('pending', 'active', 'suspended', 'rejected') then
    raise exception 'Status inválido';
  end if;

  update public.profiles
  set account_status = p_status,
      updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'Perfil não encontrado';
  end if;
end;
$$;

revoke all on function public.admin_set_merchant_status(uuid, text, text) from public;
grant execute on function public.admin_set_merchant_status(uuid, text, text) to authenticated;
