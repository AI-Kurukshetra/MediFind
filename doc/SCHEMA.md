# SCHEMA

## Migration History

### 20260314095500_init_medifind_schema.sql
Initial schema baseline for MediFind.

### 20260314103000_add_inventory_owner_select_policy.sql
- Adds `inventory_owner_select` RLS policy on `public.inventory`.
- Allows authenticated pharmacy owners to read all inventory rows for their pharmacies (including unavailable/out-of-stock records).

### 20260314112000_auth_profile_trigger.sql
- Adds trigger function `public.handle_new_auth_user()`.
- Creates trigger `on_auth_user_created` on `auth.users`.
- Automatically creates/updates corresponding rows in `public.users` using `raw_user_meta_data` (`full_name`, `phone`, `role`).

### 20260314124500_prescription_storage_and_owner_verify.sql
- Creates private Supabase Storage bucket `prescriptions` with 10MB file size limit.
- Adds storage object policies so authenticated users can upload/read/update files under their own folder path.
- Adds `prescriptions_update_pharmacy_owner` RLS policy so pharmacy owners can update prescriptions linked to their orders.

### 20260314132500_stock_alert_subscriptions_and_trigger.sql
- Creates `public.stock_alert_subscriptions` table for user medicine alert subscriptions with location and radius.
- Enables RLS + user-owned policies for subscription CRUD.
- Adds inventory trigger function `public.handle_inventory_stock_alerts()` to generate stock-available notifications.

### 20260314140000_pharmacy_ratings_and_favorites.sql
- Creates `public.pharmacy_reviews` table for patient ratings (1-5 stars, optional comment). Unique per user per pharmacy.
- Creates `public.user_pharmacy_favorites` table for saved pharmacies. Unique per user per pharmacy.
- RLS: users can insert/update/delete their own reviews; users can manage their own favorites.

## Extensions
- `pgcrypto` for UUID generation.
- `pg_trgm` for scalable medicine name search.

## Enums
- `user_role`: `patient`, `pharmacy_owner`, `admin`
- `order_type`: `reservation`, `delivery`
- `order_status`: `pending`, `confirmed`, `rejected`, `ready`, `completed`, `cancelled`
- `delivery_status`: `pending`, `accepted`, `in_transit`, `delivered`, `rejected`, `cancelled`
- `notification_type`: `stock_available`, `order_update`, `delivery_update`, `system`

## Tables

### `public.users`
- App-level profile mapped 1:1 to `auth.users`.
- Key fields: `full_name`, `phone`, `role`, `is_active`.

### `public.pharmacies`
- Pharmacy metadata and location.
- Key fields: `owner_user_id`, `name`, address fields, `latitude`, `longitude`, `is_verified`, `is_active`.

### `public.medicines`
- Master medicine catalog.
- Key fields: `name`, `generic_name`, `manufacturer`, `dosage_form`, `strength`, `requires_prescription`.

### `public.inventory`
- Pharmacy-stock relation.
- Key fields: `pharmacy_id`, `medicine_id`, `quantity`, `unit_price`, `is_available`.
- Unique constraint: `(pharmacy_id, medicine_id)`.

### `public.orders`
- Reservation and delivery parent transaction.
- Key fields: `user_id`, `pharmacy_id`, `medicine_id`, `order_type`, `quantity`, `status`.

### `public.delivery_requests`
- Delivery details for `orders` where `order_type = delivery`.
- Key fields: `order_id` (unique), `delivery_address`, geocoordinates, `status`.

### `public.prescriptions`
- Uploaded prescription records with optional order linkage.
- Key fields: `user_id`, `order_id`, `file_path`, verification fields.

### `public.notifications`
- User-facing event notifications.
- Key fields: `user_id`, `type`, `title`, `message`, `is_read`, `metadata`.

### `public.stock_alert_subscriptions`
- User subscriptions for stock-available notifications.
- Key fields: `user_id`, `medicine_id`, `latitude`, `longitude`, `radius_km`, `is_active`, `last_notified_at`.

### `public.pharmacy_reviews`
- Patient ratings of pharmacies after orders.
- Key fields: `user_id`, `pharmacy_id`, `order_id` (optional), `rating` (1-5), `comment`.
- Unique: `(user_id, pharmacy_id)`.

### `public.user_pharmacy_favorites`
- User-saved favorite pharmacies.
- Key fields: `user_id`, `pharmacy_id`.
- Unique: `(user_id, pharmacy_id)`.

## Indexes
- Medicine search indexes:
  - `idx_medicines_name_lower` on `lower(name)`
  - `idx_medicines_name_trgm` GIN trigram on `lower(name)`
- Location and relation indexes:
  - `idx_pharmacies_coordinates`
  - `idx_inventory_medicine_availability`
  - Foreign-key helper indexes on pharmacy/user/order relations
- Alert subscription indexes:
  - `idx_stock_alert_subscriptions_medicine_active`
  - `idx_stock_alert_subscriptions_user`

## Search Function
`public.search_medicines_nearby(search_query, user_latitude, user_longitude, max_distance_km, result_limit)`
- Case-insensitive medicine match via `ILIKE`.
- Filters active pharmacies and available inventory.
- Computes Haversine distance and sorts by distance, then quantity.

## RLS
RLS is enabled on all core tables:
- Users can manage only their own profile, orders, prescriptions, notifications, and stock alert subscriptions.
- Pharmacy owners can manage their pharmacies and inventory.
- Public/anonymous users can read only active pharmacies, active medicines, and available inventory rows.
- Pharmacy owners can additionally read full inventory rows for their own pharmacies.
- Delivery and order records are restricted to request user and pharmacy owner participants.
- Prescription updates are allowed for owners and linked pharmacy owners to support verification workflow.