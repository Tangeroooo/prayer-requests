-- Hierarchy redesign:
-- groups -> ministry_units -> members
-- Keeps legacy small_groups data by copying it into ministry_units.

do $$
begin
  create type ministry_unit_type as enum ('small_group', 'pastor_team', 'mc_team');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type member_type as enum ('regular', 'pastor', 'mc');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type member_role as enum ('member', 'leader', 'sub_leader');
exception
  when duplicate_object then null;
end $$;

create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists ministry_units (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade,
  unit_type ministry_unit_type not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'ministry_units_root_shape'
  ) then
    alter table ministry_units drop constraint ministry_units_root_shape;
  end if;
end $$;

alter table ministry_units
add constraint ministry_units_root_shape check (
  (unit_type = 'mc_team' and group_id is null)
  or
  (unit_type = 'pastor_team')
  or
  (unit_type = 'small_group')
);

alter table members add column if not exists ministry_unit_id uuid;
alter table members add column if not exists member_type member_type;
alter table members add column if not exists member_role member_role;
alter table members add column if not exists sort_order integer not null default 0;
alter table members add column if not exists is_active boolean not null default true;

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_groups_updated_at on groups;
create trigger update_groups_updated_at
before update on groups
for each row
execute function update_updated_at_column();

drop trigger if exists update_ministry_units_updated_at on ministry_units;
create trigger update_ministry_units_updated_at
before update on ministry_units
for each row
execute function update_updated_at_column();

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'small_groups'
  ) then
    insert into ministry_units (id, unit_type, name, sort_order, is_active, created_at, updated_at)
    select
      id,
      'small_group'::ministry_unit_type,
      name,
      0,
      true,
      created_at,
      updated_at
    from small_groups
    on conflict (id) do update
    set
      name = excluded.name,
      updated_at = excluded.updated_at;
  end if;
end $$;

update ministry_units
set
  unit_type = 'pastor_team'::ministry_unit_type,
  group_id = null,
  sort_order = 100
where name = '교역자'
  and group_id is null;

update ministry_units
set
  unit_type = 'mc_team'::ministry_unit_type,
  group_id = null,
  sort_order = 110
where name = 'MC단'
  and group_id is null;

insert into ministry_units (unit_type, name, sort_order)
select 'pastor_team'::ministry_unit_type, '교역자', 100
where not exists (
  select 1
  from ministry_units
  where unit_type = 'pastor_team'
    and name = '교역자'
);

insert into ministry_units (unit_type, name, sort_order)
select 'mc_team'::ministry_unit_type, 'MC단', 110
where not exists (
  select 1
  from ministry_units
  where unit_type = 'mc_team'
    and name = 'MC단'
);

do $$
begin
  with ranked as (
    select
      id,
      unit_type,
      name,
      row_number() over (
        partition by unit_type, name
        order by created_at asc, id asc
      ) as row_number,
      first_value(id) over (
        partition by unit_type, name
        order by created_at asc, id asc
      ) as keep_id
    from ministry_units
    where group_id is null
  ),
  reassigned as (
    update members as member
    set ministry_unit_id = ranked.keep_id
    from ranked
    where member.ministry_unit_id = ranked.id
      and ranked.row_number > 1
    returning member.id
  )
  delete from ministry_units
  using ranked
  where ministry_units.id = ranked.id
    and ranked.row_number > 1;
end $$;

do $$
declare
  pastor_unit_id uuid;
begin
  select id
  into pastor_unit_id
  from ministry_units
  where unit_type = 'pastor_team'
    and name = '교역자'
  order by created_at asc
  limit 1;

  update members
  set
    ministry_unit_id = case
      when role = 'pastor' and pastor_unit_id is not null then pastor_unit_id
      else coalesce(ministry_unit_id, small_group_id)
    end,
    member_type = coalesce(
      member_type,
      case
        when role = 'pastor' then 'pastor'::member_type
        else 'regular'::member_type
      end
    ),
    member_role = coalesce(
      member_role,
      case
        when role = 'leader' then 'leader'::member_role
        when role = 'sub_leader' then 'sub_leader'::member_role
        else 'member'::member_role
      end
    );
end $$;

alter table members alter column small_group_id drop not null;
alter table members alter column role drop not null;

create unique index if not exists idx_groups_name_unique on groups(name);
drop index if exists idx_ministry_units_root_name_unique;
create unique index if not exists idx_ministry_units_root_type_name_unique
on ministry_units(unit_type, name)
where group_id is null;
create unique index if not exists idx_ministry_units_group_name_unique
on ministry_units(group_id, name)
where group_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'members_ministry_unit_id_fkey'
  ) then
    alter table members
      add constraint members_ministry_unit_id_fkey
      foreign key (ministry_unit_id) references ministry_units(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_groups_sort_order on groups(sort_order);
create index if not exists idx_ministry_units_group_id on ministry_units(group_id);
create index if not exists idx_ministry_units_unit_type on ministry_units(unit_type);
create index if not exists idx_members_ministry_unit_id on members(ministry_unit_id);
create index if not exists idx_members_member_type on members(member_type);
create index if not exists idx_members_member_role on members(member_role);

comment on table groups is 'Top-level groups that organize small groups.';
comment on table ministry_units is 'Direct parent units for members: small groups, pastor team, and MC team.';
