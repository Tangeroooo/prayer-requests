# 새 계층 구조 재설계안

## 최종 방향

이번 기준에서는 `독립 소속`이라는 표현 대신 `공동체 소속`을 사용합니다.

또한 중요한 변경점은 다음입니다.

- `교역자`는 그룹 안에도 있을 수 있음
- `교역자`는 그룹 밖 `공동체 소속`에도 있을 수 있음
- `MC단`은 `공동체 소속`이 맞음
- 멤버는 여전히 하나의 소속 단위에 속하는 구조를 유지

즉, 핵심 구조는 아래처럼 정리됩니다.

```text
그룹 (optional)
  └── 소속 단위
       ├── 다락방
       ├── 교역자
       └── ...

공동체 소속
  └── 소속 단위
       ├── 교역자
       └── MC단

소속 단위
  └── 멤버
```

`공동체 소속`은 별도 DB 테이블이라기보다, `group_id`가 없는 소속 단위를 모아서 보여주는 **UI/도메인 개념**으로 보는 것이 가장 단순하고 유연합니다.

## 권장 도메인 모델

### 1. `groups`

상위 그룹입니다.

예시:

- 1그룹
- 2그룹

### 2. `ministry_units`

멤버가 직접 속하는 단위입니다.

예시:

- 1다락방
- 2다락방
- 교역자
- MC단

중요한 규칙:

- `group_id`가 있으면 해당 그룹 소속
- `group_id`가 없으면 `공동체 소속`

즉, `공동체 소속`은 `group_id is null`인 소속 단위를 묶어 부르는 이름입니다.

### 3. `members`

멤버는 `ministry_unit_id`를 통해 하나의 소속 단위에 속합니다.

## 왜 이 구조가 맞는가

이 구조면 아래 요구사항을 모두 담을 수 있습니다.

```text
1그룹
  ├─ 1다락방
  └─ 교역자

2그룹
  └─ 2다락방

공동체 소속
  ├─ 교역자
  └─ MC단
```

장점:

- 그룹 소속 교역자 가능
- 공동체 소속 교역자 가능
- MC단은 자연스럽게 공동체 소속으로 분리 가능
- 홈 화면 탭도 `그룹 탭들 + 공동체 소속 탭`으로 정리 가능
- 관리 화면에서도 `소속 단위` 하나만 관리하면 되어 복잡도가 크게 늘지 않음

## 권장 테이블 구조

### `groups`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | 그룹 이름 |
| sort_order | integer | 정렬 순서 |
| is_active | boolean | 활성 여부 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

### `ministry_units`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| group_id | uuid nullable | 그룹 FK. null이면 공동체 소속 |
| unit_type | text | `small_group`, `pastor_team`, `mc_team` |
| name | text | 소속 이름 |
| sort_order | integer | 정렬 순서 |
| is_active | boolean | 활성 여부 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

### `members`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| ministry_unit_id | uuid | 소속 단위 FK |
| name | text | 이름 |
| member_type | text | `regular`, `pastor`, `mc` |
| member_role | text | `member`, `leader`, `sub_leader` |
| photo_url | text | 프로필 사진 URL |
| photo_position | jsonb | `{x, y, zoom}` |
| sort_order | integer | 정렬 순서 |
| is_active | boolean | 활성 여부 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

### `prayer_requests`

현재와 동일합니다.

## 추천 제약 조건

핵심은 `group_id`와 `unit_type`의 조합 규칙입니다.

- `small_group`: 보통 그룹 소속
- `pastor_team`: 그룹 소속 가능 / 공동체 소속 가능
- `mc_team`: 공동체 소속

실무적으로는 아래처럼 생각하면 됩니다.

### 운영 규칙

- `small_group`
  - 최종적으로는 `group_id`가 있는 것이 바람직
  - 다만 마이그레이션 중에는 `group_id null` 상태를 잠시 허용 가능
- `pastor_team`
  - `group_id`가 있어도 됨
  - `group_id`가 없어도 됨
- `mc_team`
  - `group_id`는 `null`

즉, `MC단`은 반드시 공동체 소속이고, `교역자`는 양쪽 모두 허용합니다.

## 권장 SQL 스키마

```sql
create type ministry_unit_type as enum ('small_group', 'pastor_team', 'mc_team');
create type member_type as enum ('regular', 'pastor', 'mc');
create type member_role as enum ('member', 'leader', 'sub_leader');

create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint groups_name_unique unique (name)
);

create table if not exists ministry_units (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade,
  unit_type ministry_unit_type not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ministry_units_shape check (
    (unit_type = 'mc_team' and group_id is null)
    or
    (unit_type = 'pastor_team')
    or
    (unit_type = 'small_group')
  )
);

create unique index if not exists idx_ministry_units_group_name
on ministry_units(group_id, name)
where group_id is not null;

create unique index if not exists idx_ministry_units_root_type_name
on ministry_units(unit_type, name)
where group_id is null;

create table if not exists members (
  id uuid default gen_random_uuid() primary key,
  ministry_unit_id uuid not null references ministry_units(id) on delete cascade,
  name text not null,
  member_type member_type not null default 'regular',
  member_role member_role not null default 'member',
  photo_url text,
  photo_position jsonb not null default '{"x": 50, "y": 50, "zoom": 1}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists prayer_requests (
  id uuid default gen_random_uuid() primary key,
  member_id uuid not null references members(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
```

## `member_type`와 `member_role`

이 구조에서는 두 필드를 분리하는 것이 여전히 유효합니다.

### `member_type`

- `regular`
- `pastor`
- `mc`

### `member_role`

- `member`
- `leader`
- `sub_leader`

예시:

- 그룹 안 교역자: `unit_type = pastor_team`, `group_id != null`, `member_type = pastor`
- 공동체 소속 교역자: `unit_type = pastor_team`, `group_id = null`, `member_type = pastor`
- MC단 멤버: `unit_type = mc_team`, `group_id = null`, `member_type = mc`

## 화면 구조 권장안

### 홈 화면

탭 레벨:

- 그룹 1
- 그룹 2
- ...
- 공동체 소속

각 탭 안 내용:

- 그룹 탭
  - 해당 그룹의 다락방
  - 해당 그룹의 교역자 소속 단위
- 공동체 소속 탭
  - 공동체 소속 교역자
  - MC단
  - 필요하면 `그룹 미지정 다락방` 경고 섹션

최근 업데이트:

- 전체 공통이 아니라 **현재 선택한 탭 기준**
- 즉, `1그룹` 탭에서는 `1그룹` 소속만
- `공동체 소속` 탭에서는 공동체 소속만

### 관리자 화면

관리 단위는 아래 3가지입니다.

- 그룹 관리
- 소속 단위 관리
- 멤버 관리

소속 단위 생성/수정 시 필요한 값:

- `name`
- `unit_type`
- `group_id` 선택 또는 없음

운영 UX:

- `small_group` 선택 시 그룹 선택을 강하게 유도
- `pastor_team` 선택 시 그룹 선택 가능
- `mc_team` 선택 시 그룹 선택 비활성화

## 마이그레이션 전략

현재 `small_groups`에서 넘어오는 데이터가 있다면 아래처럼 옮기는 것이 안전합니다.

### 1단계. 기존 `small_groups` 복사

- 일반 다락방은 `unit_type = 'small_group'`
- 이름이 `교역자`면 `unit_type = 'pastor_team'`
- 이름이 `MC단`이면 `unit_type = 'mc_team'`

### 2단계. `group_id`는 보수적으로 채움

- 이미 그룹 정보를 아는 데이터만 `group_id` 채움
- 모르면 일단 `null`

즉:

- 그룹을 아직 모르는 다락방은 임시로 `group_id = null`
- 홈에서는 `공동체 소속` 탭 아래 `그룹 미지정 다락방`으로 노출
- 관리자 화면에서 나중에 그룹 지정

### 3단계. 멤버 매핑

- 기존 `members.small_group_id` -> `members.ministry_unit_id`
- 기존 `role = 'pastor'` -> `member_type = 'pastor'`, `member_role = 'member'`
- 기존 `role = 'leader'` -> `member_type = 'regular'`, `member_role = 'leader'`
- 기존 `role = 'sub_leader'` -> `member_type = 'regular'`, `member_role = 'sub_leader'`

## 구현 영향 범위

### 타입

- [`src/types/index.ts`](/Users/juhyeon/prayer-requests/src/types/index.ts)
- `MinistryUnit`는 `group_id nullable`
- `공동체 소속`은 별도 타입이 아니라 `group_id null`로 판단

### API

- [`src/lib/api.ts`](/Users/juhyeon/prayer-requests/src/lib/api.ts)
- `members` 조회 시 `ministry_unit -> group` join
- 홈에서 `group_id` 유무로 탭 데이터 구성

### 홈

- [`src/pages/HomePage.tsx`](/Users/juhyeon/prayer-requests/src/pages/HomePage.tsx)
- 그룹 탭들 + `공동체 소속` 탭
- 최근 업데이트도 탭 기준으로 필터

### 관리자

- [`src/pages/AdminPage.tsx`](/Users/juhyeon/prayer-requests/src/pages/AdminPage.tsx)
- `공동체 소속`이라는 명칭 사용
- `교역자`는 그룹 소속 가능
- `MC단`은 공동체 소속으로 고정

## 결론

최종적으로 가장 안정적인 구조는 아래입니다.

- `groups`: 상위 그룹
- `ministry_units`: 다락방 / 교역자 / MC단
- `members`: `ministry_unit_id`로 소속
- `group_id is null`인 `ministry_units`를 UI에서 `공동체 소속`으로 묶어서 표시

이 구조면:

- 그룹 안 교역자 가능
- 공동체 소속 교역자 가능
- MC단은 공동체 소속으로 명확하게 유지
- 홈 탭 구조도 자연스럽게 유지
