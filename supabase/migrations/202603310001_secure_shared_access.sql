-- Shared access accounts for Prayer Requests
-- Replace the email literals below if you use different access emails.

alter table if exists small_groups enable row level security;
alter table if exists members enable row level security;
alter table if exists prayer_requests enable row level security;

drop policy if exists "Allow all for small_groups" on small_groups;
drop policy if exists "Allow all for members" on members;
drop policy if exists "Allow all for prayer_requests" on prayer_requests;
drop policy if exists "Allow all for settings" on settings;

create policy "Site users can read small_groups"
on small_groups
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('site-access@prayer.local', 'admin-access@prayer.local'));

create policy "Admin user can manage small_groups"
on small_groups
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'admin-access@prayer.local')
with check ((auth.jwt() ->> 'email') = 'admin-access@prayer.local');

create policy "Site users can read members"
on members
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('site-access@prayer.local', 'admin-access@prayer.local'));

create policy "Admin user can manage members"
on members
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'admin-access@prayer.local')
with check ((auth.jwt() ->> 'email') = 'admin-access@prayer.local');

create policy "Site users can read prayer_requests"
on prayer_requests
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('site-access@prayer.local', 'admin-access@prayer.local'));

create policy "Admin user can manage prayer_requests"
on prayer_requests
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'admin-access@prayer.local')
with check ((auth.jwt() ->> 'email') = 'admin-access@prayer.local');

drop policy if exists "Public read access" on storage.objects;
drop policy if exists "Allow uploads" on storage.objects;
drop policy if exists "Allow updates" on storage.objects;
drop policy if exists "Allow deletes" on storage.objects;

create policy "Site users can read photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
  and (auth.jwt() ->> 'email') in ('site-access@prayer.local', 'admin-access@prayer.local')
);

create policy "Admin user can upload photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'photos'
  and (auth.jwt() ->> 'email') = 'admin-access@prayer.local'
);

create policy "Admin user can update photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'photos'
  and (auth.jwt() ->> 'email') = 'admin-access@prayer.local'
)
with check (
  bucket_id = 'photos'
  and (auth.jwt() ->> 'email') = 'admin-access@prayer.local'
);

create policy "Admin user can delete photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'photos'
  and (auth.jwt() ->> 'email') = 'admin-access@prayer.local'
);
