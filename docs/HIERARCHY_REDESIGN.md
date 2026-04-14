# 계층 구조 메모

## 현재 결론

최근에 잠깐 `그룹 리더십`을 별도 소속 단위로 올리는 방향을 검토했지만, 운영 흐름을 다시 확인해보니 그럴 필요는 없었습니다.

핵심 이유:

- `교역자`가 특정 그룹에 안 들어가던 문제는 구조 문제가 아니라 해당 그룹 아래 `교역자` 소속 단위를 아직 만들지 않아서였음
- 따라서 `ministry_units` 구조는 그대로 유지하는 편이 맞음
- 필요한 실제 변경은 `멤버 역할`에 `그룹 리더십`을 하나 추가하는 것

## 유지되는 구조

### `groups`

상위 그룹 탭

### `ministry_units`

멤버가 직접 속하는 단위

- `small_group`
- `pastor_team`
- `mc_team`

규칙:

- `pastor_team`
  - 그룹 소속 가능
  - 공동체 소속 가능
- `mc_team`
  - 공동체 소속
- `small_group`
  - 일반 다락방

### `members`

멤버는 다음 두 축을 유지

- `member_type`
  - `regular | pastor | mc`
- `member_role`
  - `member | leader | sub_leader | group_leadership`

## 의미

### `member_type`

사람의 분류

- `regular`
- `pastor`
- `mc`

### `member_role`

그 사람의 표시 역할

- `member`
- `leader`
- `sub_leader`
- `group_leadership`

표현 예시:

- `regular + leader`
  - 다락방장
- `regular + sub_leader`
  - 순장
- `regular + group_leadership`
  - 그룹 리더십
- `pastor + member`
  - 교역자
- `mc + member`
  - MC

즉, `교역자`, `MC`는 여전히 `member_type`으로 표현하고, 새로 추가되는 `그룹 리더십`만 `member_role`에 들어갑니다.

## 관리자 화면 규칙

- `small_group`
  - 일반 멤버 추가 시 역할 선택:
    - `다락방장`
    - `순장`
    - `그룹 리더십`
- `pastor_team`
  - 기본 `member_type = pastor`
  - 역할은 자동 `member`
- `mc_team`
  - 기본 `member_type = mc`
  - 역할은 자동 `member`

## DB 반영 순서

이미 실행된 [202604140001_group_leadership_role_rework.sql](/Users/juhyeon/prayer-requests/supabase/migrations/202604140001_group_leadership_role_rework.sql)은 임시 재설계 migration이었습니다.

최종 상태를 맞추려면 다음 corrective migration을 이어서 적용합니다.

- [202604140002_restore_member_role_model.sql](/Users/juhyeon/prayer-requests/supabase/migrations/202604140002_restore_member_role_model.sql)

이 migration은:

1. `ministry_unit_type`을 다시 `small_group | pastor_team | mc_team`으로 되돌림
2. `member_role`을 `member | leader | sub_leader | group_leadership`으로 정리
3. 임시로 `pastor`, `mc`로 올라갔던 `member_role` 데이터를 다시 `member`로 복구

## 점검 SQL

```sql
select id, name, group_id, unit_type
from ministry_units
order by group_id nulls first, unit_type, name;
```

```sql
select member_type, member_role, count(*)
from members
group by 1, 2
order by 1, 2;
```
