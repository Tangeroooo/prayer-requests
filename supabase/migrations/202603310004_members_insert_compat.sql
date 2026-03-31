-- Compatibility fix for legacy members table.
-- The app now writes ministry_unit_id/member_type/member_role,
-- so old required columns must become nullable.

alter table members alter column small_group_id drop not null;
alter table members alter column role drop not null;
