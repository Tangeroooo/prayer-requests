-- Reverts the temporary "group leadership as ministry unit" redesign.
-- Final shape after this migration:
-- - ministry_unit_type: small_group | pastor_team | mc_team
-- - member_type: regular | pastor | mc
-- - member_role: member | leader | sub_leader | group_leadership

do $$
begin
  if exists (
    select 1
    from ministry_units
    where unit_type::text = 'group_leadership'
  ) then
    raise exception 'group_leadership ministry units exist. Reassign or delete them before running this migration.';
  end if;
end $$;

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

update members
set member_role = 'member'
where member_role::text in ('pastor', 'mc');

do $$
begin
  alter type ministry_unit_type rename to ministry_unit_type_old_20260414_restore;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'ministry_unit_type'
  ) then
    create type ministry_unit_type as enum (
      'small_group',
      'pastor_team',
      'mc_team'
    );
  end if;
end $$;

alter table ministry_units
  alter column unit_type
  type ministry_unit_type
  using unit_type::text::ministry_unit_type;

drop type if exists ministry_unit_type_old_20260414_restore;

do $$
begin
  alter type member_role rename to member_role_old_20260414_restore;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'member_role'
  ) then
    create type member_role as enum (
      'member',
      'leader',
      'sub_leader',
      'group_leadership'
    );
  end if;
end $$;

alter table members
  alter column member_role
  type member_role
  using member_role::text::member_role;

drop type if exists member_role_old_20260414_restore;

alter table ministry_units
add constraint ministry_units_root_shape check (
  (unit_type = 'mc_team' and group_id is null)
  or
  (unit_type = 'pastor_team')
  or
  (unit_type = 'small_group')
);

comment on column members.member_type is 'Member classification: regular, pastor, or mc.';
comment on column members.member_role is 'Visible role within the site: member, leader, sub_leader, or group_leadership.';
