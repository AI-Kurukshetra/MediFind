begin;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inventory'
      and policyname = 'inventory_owner_select'
  ) then
    execute $policy$
      create policy "inventory_owner_select" on public.inventory
      for select to authenticated
      using (
        exists (
          select 1
          from public.pharmacies p
          where p.id = inventory.pharmacy_id
            and p.owner_user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end $$;

commit;