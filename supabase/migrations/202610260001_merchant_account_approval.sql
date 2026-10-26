-- Status de conta do lojista: pending até aprovação do administrador

alter table public.profiles
  add column if not exists status text not null default 'pending';

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'active', 'suspended', 'rejected'));

comment on column public.profiles.status is
  'pending = aguardando aprovação do admin; active = pode usar a plataforma; suspended/rejected = bloqueado';

create or replace function public.handle_new_profile_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is null or new.status = '' then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_default_status on public.profiles;
create trigger trg_profiles_default_status
  before insert on public.profiles
  for each row
  execute function public.handle_new_profile_status();

create or replace function public.admin_set_merchant_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, private
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
  set status = p_status,
      updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'Perfil não encontrado';
  end if;
end;
$$;

revoke all on function public.admin_set_merchant_status(uuid, text, text) from public;
grant execute on function public.admin_set_merchant_status(uuid, text, text) to authenticated;
