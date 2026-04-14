# 계층 구조 재정리

## 왜 다시 바꾸는가

처음 재설계에서는 다음 요구를 만족시키기 위해 멤버를 두 축으로 나눴습니다.

- `member_type`: `regular | pastor | mc`
- `member_role`: `member | leader | sub_leader`

이 구조는 당시 `교역자`, `MC`가 다락방 멤버가 아니라 별도 소속 단위에 들어가던 흐름을 표현하기엔 편했습니다.

하지만 이후 요구가 바뀌었습니다.

- 교역자는 그룹 안에도 있을 수 있음
- 그룹마다 `그룹 리더십`이 따로 필요함
- 실질적인 멤버 역할은 `다락방장`, `순장`, `교역자`, `MC` 네 가지면 충분함

즉, 사람의 정체성과 역할을 따로 들고 갈 이유가 줄었고, `그룹 리더십`은 멤버 역할이 아니라 **소속 단위**로 보는 편이 더 자연스러워졌습니다.

## 최종 모델

```text
그룹(optional)
  └── 소속 단위
       ├── 그룹 리더십
       ├── 교역자
       └── 다락방

공동체
  └── 소속 단위
       ├── 교역자
       └── MC단

소속 단위
  └── 멤버
```

## 테이블 개념

### `groups`

상위 탭 단위입니다.

### `ministry_units`

멤버가 직접 속하는 단위입니다.

- `small_group`
- `group_leadership`
- `pastor_team`
- `mc_team`

규칙:

- `group_id != null`
  - 그룹 소속
- `group_id == null`
  - 공동체 소속
- `group_leadership`
  - 반드시 그룹 소속
- `mc_team`
  - 반드시 공동체 소속
- `pastor_team`
  - 그룹 소속 가능
  - 공동체 소속 가능

### `members`

멤버는 하나의 `ministry_unit`에 속합니다.

멤버 역할은 `member_role` 하나로 표현합니다.

- `leader`
- `sub_leader`
- `pastor`
- `mc`

`member_type`은 기존 데이터 호환을 위해 잠시 남겨둘 수 있지만, 앱의 실제 표현 기준은 `member_role`입니다.

## UI 규칙

### 그룹 탭

표시 순서:

1. `그룹 리더십`
2. `교역자`
3. `다락방`

### 공동체 탭

- 공동체 소속 `교역자`
- `MC단`
- 필요 시 `그룹 미지정 다락방`

### 멤버 역할 선택 규칙

- `small_group`
  - `다락방장`, `순장`
- `group_leadership`
  - `다락방장`, `순장`, `교역자`, `MC`
- `pastor_team`
  - 자동 `교역자`
- `mc_team`
  - 자동 `MC`

## 이번 변경의 DB 방향

추가 migration: [202604140001_group_leadership_role_rework.sql](/Users/juhyeon/prayer-requests/supabase/migrations/202604140001_group_leadership_role_rework.sql)

이 migration은 다음을 수행합니다.

1. `ministry_unit_type`에 `group_leadership` 추가
2. `member_role`에 `pastor`, `mc` 추가
3. `ministry_units_root_shape` 제약을 새 모델에 맞게 갱신
4. 기존 `member_type/member_role` 데이터를 새 `member_role` 기준으로 백필

## 점검 SQL

```sql
select id, name, group_id, unit_type
from ministry_units
order by group_id nulls first, unit_type, name;

select member_type, member_role, count(*)
from members
group by 1, 2
order by 1, 2;

select
  g.name as group_name,
  mu.name as unit_name,
  mu.unit_type,
  count(m.id) as member_count
from ministry_units mu
left join groups g on g.id = mu.group_id
left join members m on m.ministry_unit_id = mu.id
group by 1, 2, 3
order by 1 nulls first, 3, 2;
```
