-- Keep legacy profiles.status and canonical profiles.account_status synchronized.
-- account_status is canonical for merchant approval; status remains for compatibility.

create or replace function public.sync_profile_approval_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.account_status is null or new.account_status = '' then
      new.account_status := coalesce(nullif(new.status, ''), 'pending');
    end if;
    if new.status is null or new.status = '' then
      new.status := coalesce(nullif(new.account_status, ''), 'pending');
    end if;
    -- account_status is the canonical value if both were supplied differently.
    new.status := new.account_status;
  elsif new.account_status is distinct from old.account_status then
    new.status := new.account_status;
  elsif new.status is distinct from old.status then
    new.account_status := new.status;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_profile_approval_status() from public, anon, authenticated;

drop trigger if exists profiles_sync_approval_status on public.profiles;
create trigger profiles_sync_approval_status
before insert or update of status, account_status
on public.profiles
for each row
execute function public.sync_profile_approval_status();

-- Repair rows where the two columns drifted apart.
update public.profiles
set status = account_status
where status is distinct from account_status;

comment on function public.sync_profile_approval_status() is
  'Keeps legacy status and canonical account_status aligned for merchant approval.';
