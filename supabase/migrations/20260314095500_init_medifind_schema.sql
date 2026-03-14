begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  create type public.user_role as enum ('patient', 'pharmacy_owner', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_type as enum ('reservation', 'delivery');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum ('pending', 'confirmed', 'rejected', 'ready', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.delivery_status as enum ('pending', 'accepted', 'in_transit', 'delivered', 'rejected', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_type as enum ('stock_available', 'order_update', 'delivery_update', 'system');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'patient',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete restrict,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'IN',
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  contact_phone text,
  rating numeric(3, 2),
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pharmacies_latitude_check check (latitude between -90 and 90),
  constraint pharmacies_longitude_check check (longitude between -180 and 180),
  constraint pharmacies_rating_check check (rating is null or (rating >= 0 and rating <= 5))
);

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  manufacturer text,
  dosage_form text,
  strength text,
  requires_prescription boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id) on delete restrict,
  quantity integer not null default 0,
  unit_price numeric(10, 2),
  is_available boolean not null default false,
  last_restocked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_quantity_check check (quantity >= 0),
  constraint inventory_price_check check (unit_price is null or unit_price >= 0),
  unique (pharmacy_id, medicine_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete restrict,
  pharmacy_id uuid not null references public.pharmacies (id) on delete restrict,
  medicine_id uuid not null references public.medicines (id) on delete restrict,
  order_type public.order_type not null,
  quantity integer not null,
  status public.order_status not null default 'pending',
  prescription_required boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint orders_quantity_check check (quantity > 0)
);

create table if not exists public.delivery_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete restrict,
  pharmacy_id uuid not null references public.pharmacies (id) on delete restrict,
  delivery_address text not null,
  delivery_latitude numeric(9, 6),
  delivery_longitude numeric(9, 6),
  contact_phone text,
  status public.delivery_status not null default 'pending',
  requested_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint delivery_requests_latitude_check check (delivery_latitude is null or delivery_latitude between -90 and 90),
  constraint delivery_requests_longitude_check check (delivery_longitude is null or delivery_longitude between -180 and 180)
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  file_path text not null,
  verified_by uuid references public.users (id) on delete set null,
  verified_at timestamptz,
  status text not null default 'uploaded',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_pharmacies_owner_user_id on public.pharmacies (owner_user_id);
create index if not exists idx_pharmacies_coordinates on public.pharmacies (latitude, longitude);
create index if not exists idx_medicines_name_lower on public.medicines (lower(name));
create index if not exists idx_medicines_name_trgm on public.medicines using gin (lower(name) gin_trgm_ops);
create index if not exists idx_inventory_medicine_availability on public.inventory (medicine_id, is_available, quantity);
create index if not exists idx_inventory_pharmacy_id on public.inventory (pharmacy_id);
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_pharmacy_id on public.orders (pharmacy_id);
create index if not exists idx_delivery_requests_user_id on public.delivery_requests (user_id);
create index if not exists idx_delivery_requests_pharmacy_id on public.delivery_requests (pharmacy_id);
create index if not exists idx_notifications_user_read on public.notifications (user_id, is_read);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger set_pharmacies_updated_at
before update on public.pharmacies
for each row execute function public.set_updated_at();

create trigger set_medicines_updated_at
before update on public.medicines
for each row execute function public.set_updated_at();

create trigger set_inventory_updated_at
before update on public.inventory
for each row execute function public.set_updated_at();

create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger set_delivery_requests_updated_at
before update on public.delivery_requests
for each row execute function public.set_updated_at();

create trigger set_prescriptions_updated_at
before update on public.prescriptions
for each row execute function public.set_updated_at();

create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.pharmacies enable row level security;
alter table public.medicines enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.delivery_requests enable row level security;
alter table public.prescriptions enable row level security;
alter table public.notifications enable row level security;

create policy "users_select_own" on public.users
for select to authenticated
using (auth.uid() = id);

create policy "users_insert_own" on public.users
for insert to authenticated
with check (auth.uid() = id);

create policy "users_update_own" on public.users
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "pharmacies_read_all" on public.pharmacies
for select to anon, authenticated
using (is_active = true);

create policy "pharmacies_owner_insert" on public.pharmacies
for insert to authenticated
with check (auth.uid() = owner_user_id);

create policy "pharmacies_owner_update" on public.pharmacies
for update to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "medicines_read_all" on public.medicines
for select to anon, authenticated
using (is_active = true);

create policy "inventory_read_available" on public.inventory
for select to anon, authenticated
using (is_available = true and quantity > 0);

create policy "inventory_owner_insert" on public.inventory
for insert to authenticated
with check (
  exists (
    select 1
    from public.pharmacies p
    where p.id = inventory.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
);

create policy "inventory_owner_update" on public.inventory
for update to authenticated
using (
  exists (
    select 1
    from public.pharmacies p
    where p.id = inventory.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pharmacies p
    where p.id = inventory.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
);

create policy "orders_insert_user" on public.orders
for insert to authenticated
with check (auth.uid() = user_id);

create policy "orders_select_participant" on public.orders
for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.pharmacies p
    where p.id = orders.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
);

create policy "orders_update_pharmacy_owner_or_user" on public.orders
for update to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.pharmacies p
    where p.id = orders.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.pharmacies p
    where p.id = orders.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
);

create policy "delivery_requests_insert_user" on public.delivery_requests
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.orders o
    where o.id = delivery_requests.order_id
      and o.user_id = auth.uid()
      and o.order_type = 'delivery'
  )
);

create policy "delivery_requests_select_participant" on public.delivery_requests
for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.pharmacies p
    where p.id = delivery_requests.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
);

create policy "delivery_requests_update_participant" on public.delivery_requests
for update to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.pharmacies p
    where p.id = delivery_requests.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.pharmacies p
    where p.id = delivery_requests.pharmacy_id
      and p.owner_user_id = auth.uid()
  )
);

create policy "prescriptions_insert_owner" on public.prescriptions
for insert to authenticated
with check (auth.uid() = user_id);

create policy "prescriptions_select_participant" on public.prescriptions
for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.orders o
    join public.pharmacies p on p.id = o.pharmacy_id
    where o.id = prescriptions.order_id
      and p.owner_user_id = auth.uid()
  )
);

create policy "prescriptions_update_owner" on public.prescriptions
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "notifications_insert_owner" on public.notifications
for insert to authenticated
with check (auth.uid() = user_id);

create policy "notifications_select_owner" on public.notifications
for select to authenticated
using (auth.uid() = user_id);

create policy "notifications_update_owner" on public.notifications
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.search_medicines_nearby(
  search_query text,
  user_latitude double precision,
  user_longitude double precision,
  max_distance_km double precision default 10,
  result_limit integer default 50
)
returns table (
  pharmacy_id uuid,
  pharmacy_name text,
  medicine_id uuid,
  medicine_name text,
  quantity integer,
  distance_km numeric
)
language sql
stable
as $$
  with candidate_rows as (
    select
      p.id as pharmacy_id,
      p.name as pharmacy_name,
      m.id as medicine_id,
      m.name as medicine_name,
      i.quantity,
      6371 * acos(
        least(
          1,
          greatest(
            -1,
            cos(radians(user_latitude))
            * cos(radians(p.latitude::double precision))
            * cos(radians(p.longitude::double precision) - radians(user_longitude))
            + sin(radians(user_latitude))
            * sin(radians(p.latitude::double precision))
          )
        )
      ) as distance_km
    from public.inventory i
    join public.medicines m on m.id = i.medicine_id
    join public.pharmacies p on p.id = i.pharmacy_id
    where i.is_available = true
      and i.quantity > 0
      and p.is_active = true
      and m.is_active = true
      and lower(m.name) ilike ('%' || lower(search_query) || '%')
  )
  select
    c.pharmacy_id,
    c.pharmacy_name,
    c.medicine_id,
    c.medicine_name,
    c.quantity,
    round(c.distance_km::numeric, 3) as distance_km
  from candidate_rows c
  where c.distance_km <= max_distance_km
  order by c.distance_km asc, c.quantity desc
  limit greatest(1, result_limit);
$$;

grant execute on function public.search_medicines_nearby(text, double precision, double precision, double precision, integer) to anon, authenticated;

commit;