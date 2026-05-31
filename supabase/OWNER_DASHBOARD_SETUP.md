**Owner Dashboard Supabase Setup**

Run the migration:

```bash
supabase db push
```

Deploy the Edge Function:

```bash
supabase functions deploy create-agency-user
```

Set required secrets before deploying the function:

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
```

If your local project is not linked yet:

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

What this migration adds:

1. Creates a minimal compatible base schema only when a fresh project is missing the platform tables.
2. Extends `agencies` and `cars` with owner-dashboard-safe additive columns.
3. Creates `traffic_events`, `agency_permissions`, `agency_status_history`, `admin_audit_logs`, and `owner_notifications`.
4. Seeds key Moroccan regions and cities if they do not already exist.
5. Adds `car_stats_view`, `agency_stats_view`, `city_stats_view`, plus compatibility views used by the frontend.
6. Adds owner dashboard RPCs and RLS policies without deleting existing tables.

Assumptions to verify before production:

1. `reservations` has `car_id`, `agency_id`, `user_id`, `status`, `start_date`, and `end_date`.
2. `cars` has `agency_id`, `availability`, `brand`, `model`, `year`, and `price_per_day`.
3. `agencies` has `id`, `name`, `email`, and `city_id`.
4. `cities` has `id`, `name`, `region_id`, `latitude`, and `longitude`.
5. `car_images` has `car_id` and `image_url`.

If those base tables do not exist, the migration now creates a compatible starter schema. If the tables exist but use different column names, update the migration before pushing it.

**Testing Checklist**

1. Run `supabase db push` on a staging project first.
2. Confirm `owner_cities_view`, `owner_agencies_view`, `owner_cars_view`, and `city_traffic_metrics` return rows.
3. Test login with a `super_owner` user and verify the dashboard RPCs resolve.
4. Call the `create-agency-user` function as `super_owner` and confirm:
   `auth.users` gets a new account.
   `public.users` gets role `agency`.
   `public.agencies` gets `owner_user_id`.
   `agency_permissions` row is created.
   `admin_audit_logs` row is created.
5. Call the same function as a non-owner and confirm it returns `403`.
6. Confirm public users can only read active verified agencies and active available cars.
7. Confirm an agency user can only read and mutate its own agency, cars, reservations, images, and documents.
8. Confirm an agency user cannot query `traffic_events` or `admin_audit_logs`.
9. Confirm a client can only read and mutate its own `reservations` and `favorites`.
10. Insert sample `traffic_events` and confirm the traffic views and charts update as expected.
