-- Adds group leadership as a first-class ministry unit type
-- and extends member_role so role alone can represent
-- leader / sub_leader / pastor / mc.
--
-- Important: this migration replaces enum types instead of using
-- ALTER TYPE ... ADD VALUE so it can be executed in a single
-- SQL Editor transaction without "unsafe use of new value" errors.

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

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'ministry_unit_type'
      and e.enumlabel = 'group_leadership'
  ) then
    alter type ministry_unit_type rename to ministry_unit_type_old_20260414;
    create type ministry_unit_type as enum (
      'small_group',
      'group_leadership',
      'pastor_team',
      'mc_team'
    );

    alter table ministry_units
      alter column unit_type
      type ministry_unit_type
      using unit_type::text::ministry_unit_type;

    drop type ministry_unit_type_old_20260414;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'member_role'
      and e.enumlabel = 'pastor'
  ) or not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'member_role'
      and e.enumlabel = 'mc'
  ) then
    alter type member_role rename to member_role_old_20260414;
    create type member_role as enum (
      'member',
      'leader',
      'sub_leader',
      'pastor',
      'mc'
    );

    alter table members
      alter column member_role
      type member_role
      using member_role::text::member_role;

    drop type member_role_old_20260414;
  end if;
end $$;

alter table ministry_units
add constraint ministry_units_root_shape check (
  (unit_type = 'mc_team' and group_id is null)
  or
  (unit_type = 'group_leadership' and group_id is not null)
  or
  (unit_type = 'pastor_team')
  or
  (unit_type = 'small_group')
);

update members
set member_role = case
  when member_type = 'pastor' then 'pastor'::member_role
  when member_type = 'mc' then 'mc'::member_role
  when member_role = 'leader' then 'leader'::member_role
  when member_role = 'sub_leader' then 'sub_leader'::member_role
  else 'sub_leader'::member_role
end
where member_role is null
   or member_role = 'member'
   or member_type in ('pastor', 'mc');

comment on column members.member_type is 'Legacy compatibility column. The app now derives visible roles from members.member_role.';
comment on column members.member_role is 'Visible member role: leader, sub_leader, pastor, or mc.';
