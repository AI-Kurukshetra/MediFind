begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prescriptions',
  'prescriptions',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'prescriptions_owner_upload'
  ) then
    execute $policy$
      create policy "prescriptions_owner_upload"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'prescriptions'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'prescriptions_owner_read'
  ) then
    execute $policy$
      create policy "prescriptions_owner_read"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'prescriptions'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'prescriptions_owner_update'
  ) then
    execute $policy$
      create policy "prescriptions_owner_update"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'prescriptions'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'prescriptions'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prescriptions'
      and policyname = 'prescriptions_update_pharmacy_owner'
  ) then
    execute $policy$
      create policy "prescriptions_update_pharmacy_owner"
      on public.prescriptions
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.orders o
          join public.pharmacies p on p.id = o.pharmacy_id
          where o.id = prescriptions.order_id
            and p.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.orders o
          join public.pharmacies p on p.id = o.pharmacy_id
          where o.id = prescriptions.order_id
            and p.owner_user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end $$;

commit;
