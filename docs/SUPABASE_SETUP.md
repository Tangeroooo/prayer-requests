# Supabase 설정 가이드

이 프로젝트는 공유 비밀번호를 프론트엔드 환경 변수에 두지 않고, **Supabase Auth 계정 비밀번호**로 관리합니다.

> 최신 계층 구조는 `groups -> ministry_units -> members` 기준으로 전환되었습니다.
> 새 구조 설명은 [`docs/HIERARCHY_REDESIGN.md`](/Users/juhyeon/prayer-requests/docs/HIERARCHY_REDESIGN.md), 실제 적용 SQL은
> [`supabase/migrations/202603310002_hierarchy_redesign.sql`](/Users/juhyeon/prayer-requests/supabase/migrations/202603310002_hierarchy_redesign.sql),
> [`supabase/migrations/202603310003_hierarchy_rls.sql`](/Users/juhyeon/prayer-requests/supabase/migrations/202603310003_hierarchy_rls.sql)을 우선 참고하세요.

- 사이트 접속용: 공용 Auth 계정 1개
- 관리자용: 관리자 Auth 계정 1개
- 프론트엔드: `supabase.auth.signInWithPassword()`로 로그인
- 데이터 접근 제어: RLS 정책으로 읽기/쓰기 권한 분리
- 사진 버킷: private 버킷 + signed URL

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. Region은 Seoul을 권장합니다.
3. 프로젝트 생성 후 `Settings -> API`에서 아래 값을 확인합니다.
   - Project URL
   - anon public key

## 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정합니다.

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SITE_ACCESS_EMAIL=site-access@prayer.local
VITE_ADMIN_ACCESS_EMAIL=admin-access@prayer.local
```

- `VITE_SITE_ACCESS_EMAIL`, `VITE_ADMIN_ACCESS_EMAIL`은 비밀값이 아닙니다.
- 실제 비밀번호는 여기에 넣지 않습니다.
- `.env.local`은 Git에 커밋하지 않습니다.

## 3. 데이터베이스 테이블 생성

SQL Editor에서 아래 SQL을 실행합니다.

```sql
create table if not exists small_groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists members (
  id uuid default gen_random_uuid() primary key,
  small_group_id uuid references small_groups(id) on delete cascade,
  name text not null,
  role text not null check (role in ('pastor', 'leader', 'sub_leader')),
  photo_url text,
  photo_position jsonb default '{"x": 50, "y": 50, "zoom": 1}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists prayer_requests (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references members(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_small_groups_updated_at
before update on small_groups
for each row
execute function update_updated_at_column();

create trigger update_members_updated_at
before update on members
for each row
execute function update_updated_at_column();

create trigger update_prayer_requests_updated_at
before update on prayer_requests
for each row
execute function update_updated_at_column();

create index if not exists idx_members_small_group_id on members(small_group_id);
create index if not exists idx_members_updated_at on members(updated_at desc);
create index if not exists idx_prayer_requests_member_id on prayer_requests(member_id);
create index if not exists idx_prayer_requests_updated_at on prayer_requests(updated_at desc);
```

## 4. 공유 비밀번호를 Supabase Auth로 이전

이 프로젝트는 같은 비밀번호를 유지하더라도, 평문을 브라우저에 보내지 않도록 **Supabase Auth 비밀번호**로 저장해야 합니다.

### 권장 계정

- 사이트 접속 계정: `site-access@prayer.local`
- 관리자 계정: `admin-access@prayer.local`

### 생성 방법

1. Supabase Dashboard -> `Authentication -> Users`
2. `Add user`로 아래 두 계정을 생성
   - `site-access@prayer.local` + 현재 사이트 비밀번호
   - `admin-access@prayer.local` + 현재 관리자 비밀번호
3. 이메일 확인이 필요하지 않도록 아래 중 하나를 적용
   - `Add user`에서 자동 확인된 상태로 생성
   - 또는 `Authentication -> Providers -> Email`에서 email confirmation 요구를 끔
4. 공개 회원가입은 끄는 것을 권장
   - `Authentication -> Providers -> Email`에서 sign up 비활성화

## 5. Storage 버킷 설정

1. `Storage`에서 `photos` 버킷을 생성합니다.
2. **Public bucket은 체크하지 않습니다.**
3. 사진은 signed URL로만 제공합니다.

## 6. RLS 정책 적용

이 저장소에는 보안용 SQL 파일이 포함되어 있습니다.

- [`supabase/migrations/202603310001_secure_shared_access.sql`](/Users/juhyeon/prayer-requests/supabase/migrations/202603310001_secure_shared_access.sql)

적용 전, SQL 안에 들어 있는 이메일 문자열이 `.env.local`과 같은지 확인하세요.

기본 정책은 다음 원칙을 따릅니다.

- 사이트 계정 + 관리자 계정: 읽기 가능
- 관리자 계정만: 생성/수정/삭제 가능
- 사진 버킷도 동일하게 적용

### 직접 SQL Editor에서 적용할 때

```sql
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
```

## 7. 테스트 데이터 추가

```sql
insert into small_groups (name) values
  ('1다락방'),
  ('2다락방'),
  ('3다락방');

insert into members (small_group_id, name, role)
select id, '김순장', 'sub_leader' from small_groups where name = '1다락방';

insert into members (small_group_id, name, role)
select id, '이다락', 'leader' from small_groups where name = '1다락방';

insert into prayer_requests (member_id, content)
select id, '가정의 평안을 위해 기도해주세요' from members where name = '김순장';
```

## 8. 배포

```bash
npm run build
npm run deploy
```

GitHub Pages 사용 시 `vite.config.ts`의 `base` 값은 저장소 이름과 맞아야 합니다.

## 9. 점검 체크리스트

아래가 모두 맞아야 현재 코드와 보안 모델이 맞습니다.

- 사이트/관리자 비밀번호가 `.env`가 아니라 Supabase Auth 사용자 비밀번호에 저장되어 있음
- 프론트엔드 번들에 `VITE_SITE_PASSWORD`, `VITE_ADMIN_PASSWORD`가 없음
- `small_groups`, `members`, `prayer_requests`에 `Allow all` 정책이 없음
- `photos` 버킷이 private 상태임
- 관리자 계정이 아니면 insert/update/delete가 실패함
- 공개 회원가입이 꺼져 있음

## 문제 해결

### 로그인은 되는데 데이터가 안 보일 때

1. 현재 로그인한 계정 이메일이 정책의 이메일과 일치하는지 확인
2. `.env.local`의 이메일 값과 SQL의 이메일 값이 같은지 확인
3. `Authentication -> Users`에서 계정이 confirmed 상태인지 확인
4. 브라우저에서 한번 로그아웃 후 다시 로그인

### 사진이 안 보일 때

1. 버킷이 private인지 확인
2. `storage.objects` select 정책이 적용됐는지 확인
3. 기존 public URL을 직접 사용하고 있지 않은지 확인

### 관리자 수정이 안 될 때

1. 현재 세션이 관리자 계정인지 확인
2. `storage.objects`와 테이블 모두 admin 정책이 적용됐는지 확인
3. SQL에 들어간 관리자 이메일이 실제 계정과 같은지 확인
