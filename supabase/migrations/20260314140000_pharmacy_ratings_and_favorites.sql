-- Pharmacy ratings and favorites
-- No breaking changes to existing tables

begin;

-- Pharmacy reviews/ratings (patients rate after orders)
create table if not exists public.pharmacy_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  unique (user_id, pharmacy_id)
);

create index if not exists idx_pharmacy_reviews_pharmacy_id on public.pharmacy_reviews (pharmacy_id);
create index if not exists idx_pharmacy_reviews_user_id on public.pharmacy_reviews (user_id);

alter table public.pharmacy_reviews enable row level security;

create policy "pharmacy_reviews_insert_owner"
  on public.pharmacy_reviews for insert to authenticated
  with check (auth.uid() = user_id);

create policy "pharmacy_reviews_select_all"
  on public.pharmacy_reviews for select to authenticated, anon
  using (true);

create policy "pharmacy_reviews_update_owner"
  on public.pharmacy_reviews for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pharmacy_reviews_delete_owner"
  on public.pharmacy_reviews for delete to authenticated
  using (auth.uid() = user_id);

-- User pharmacy favorites
create table if not exists public.user_pharmacy_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc', now()),
  unique (user_id, pharmacy_id)
);

create index if not exists idx_user_pharmacy_favorites_user_id on public.user_pharmacy_favorites (user_id);
create index if not exists idx_user_pharmacy_favorites_pharmacy_id on public.user_pharmacy_favorites (pharmacy_id);

alter table public.user_pharmacy_favorites enable row level security;

create policy "user_pharmacy_favorites_insert_owner"
  on public.user_pharmacy_favorites for insert to authenticated
  with check (auth.uid() = user_id);

create policy "user_pharmacy_favorites_select_owner"
  on public.user_pharmacy_favorites for select to authenticated
  using (auth.uid() = user_id);

create policy "user_pharmacy_favorites_delete_owner"
  on public.user_pharmacy_favorites for delete to authenticated
  using (auth.uid() = user_id);

commit;
