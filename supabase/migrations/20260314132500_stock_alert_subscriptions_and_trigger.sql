begin;

create table if not exists public.stock_alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  radius_km numeric(6, 2) not null default 10,
  is_active boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint stock_alert_subscriptions_latitude_check check (latitude between -90 and 90),
  constraint stock_alert_subscriptions_longitude_check check (longitude between -180 and 180),
  constraint stock_alert_subscriptions_radius_check check (radius_km between 1 and 50),
  unique (user_id, medicine_id, latitude, longitude)
);

create index if not exists idx_stock_alert_subscriptions_medicine_active
  on public.stock_alert_subscriptions (medicine_id, is_active);
create index if not exists idx_stock_alert_subscriptions_user
  on public.stock_alert_subscriptions (user_id);

create trigger set_stock_alert_subscriptions_updated_at
before update on public.stock_alert_subscriptions
for each row execute function public.set_updated_at();

alter table public.stock_alert_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_alert_subscriptions'
      and policyname = 'stock_alert_subscriptions_select_own'
  ) then
    execute $policy$
      create policy "stock_alert_subscriptions_select_own"
      on public.stock_alert_subscriptions
      for select
      to authenticated
      using (auth.uid() = user_id)
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_alert_subscriptions'
      and policyname = 'stock_alert_subscriptions_insert_own'
  ) then
    execute $policy$
      create policy "stock_alert_subscriptions_insert_own"
      on public.stock_alert_subscriptions
      for insert
      to authenticated
      with check (auth.uid() = user_id)
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_alert_subscriptions'
      and policyname = 'stock_alert_subscriptions_update_own'
  ) then
    execute $policy$
      create policy "stock_alert_subscriptions_update_own"
      on public.stock_alert_subscriptions
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id)
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_alert_subscriptions'
      and policyname = 'stock_alert_subscriptions_delete_own'
  ) then
    execute $policy$
      create policy "stock_alert_subscriptions_delete_own"
      on public.stock_alert_subscriptions
      for delete
      to authenticated
      using (auth.uid() = user_id)
    $policy$;
  end if;
end $$;

create or replace function public.handle_inventory_stock_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_available = true and new.quantity > 0 then
    with target_pharmacy as (
      select id, name, latitude::double precision as latitude, longitude::double precision as longitude
      from public.pharmacies
      where id = new.pharmacy_id
        and is_active = true
      limit 1
    ),
    target_medicine as (
      select id, name
      from public.medicines
      where id = new.medicine_id
        and is_active = true
      limit 1
    ),
    matched_subscribers as (
      select
        s.id as subscription_id,
        s.user_id,
        p.name as pharmacy_name,
        m.name as medicine_name
      from public.stock_alert_subscriptions s
      cross join target_pharmacy p
      cross join target_medicine m
      where s.is_active = true
        and s.medicine_id = new.medicine_id
        and (
          s.last_notified_at is null
          or s.last_notified_at < timezone('utc', now()) - interval '12 hours'
        )
        and (
          6371 * acos(
            least(
              1,
              greatest(
                -1,
                cos(radians(s.latitude::double precision))
                * cos(radians(p.latitude))
                * cos(radians(p.longitude) - radians(s.longitude::double precision))
                + sin(radians(s.latitude::double precision))
                * sin(radians(p.latitude))
              )
            )
          )
        ) <= s.radius_km::double precision
    ),
    inserted_notifications as (
      insert into public.notifications (user_id, type, title, message, metadata)
      select
        ms.user_id,
        'stock_available'::public.notification_type,
        'Medicine back in stock',
        ms.medicine_name || ' is now available at ' || ms.pharmacy_name || '.',
        jsonb_build_object(
          'medicine_id', new.medicine_id,
          'pharmacy_id', new.pharmacy_id,
          'inventory_id', new.id
        )
      from matched_subscribers ms
      returning user_id
    )
    update public.stock_alert_subscriptions s
    set last_notified_at = timezone('utc', now())
    where s.user_id in (select user_id from inserted_notifications)
      and s.medicine_id = new.medicine_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_inventory_stock_alerts on public.inventory;

create trigger trigger_inventory_stock_alerts
after insert or update of quantity, is_available on public.inventory
for each row execute function public.handle_inventory_stock_alerts();

commit;
