begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  requested_role public.user_role;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' in ('patient', 'pharmacy_owner', 'admin')
      then (new.raw_user_meta_data ->> 'role')::public.user_role
    else 'patient'::public.user_role
  end;

  insert into public.users (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    requested_role
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = excluded.role,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

commit;