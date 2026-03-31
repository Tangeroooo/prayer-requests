-- RLS policies for groups and ministry_units introduced by hierarchy redesign.

alter table if exists groups enable row level security;
alter table if exists ministry_units enable row level security;

drop policy if exists "Site users can read groups" on groups;
drop policy if exists "Admin user can manage groups" on groups;
drop policy if exists "Site users can read ministry_units" on ministry_units;
drop policy if exists "Admin user can manage ministry_units" on ministry_units;

create policy "Site users can read groups"
on groups
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('site-access@prayer.local', 'admin-access@prayer.local'));

create policy "Admin user can manage groups"
on groups
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'admin-access@prayer.local')
with check ((auth.jwt() ->> 'email') = 'admin-access@prayer.local');

create policy "Site users can read ministry_units"
on ministry_units
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('site-access@prayer.local', 'admin-access@prayer.local'));

create policy "Admin user can manage ministry_units"
on ministry_units
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'admin-access@prayer.local')
with check ((auth.jwt() ->> 'email') = 'admin-access@prayer.local');
