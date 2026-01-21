# 기도제목 공유 사이트 (Prayer Requests)

## 프로젝트 개요
교회 순장님의 기도제목 공유 사이트입니다. GitHub Pages로 배포하고 Supabase를 백엔드로 사용합니다.

## 기술 스택
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS (Material Design 스타일)
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Deployment**: GitHub Pages

## 주요 기능

### 1. 인증 시스템
- 일반 접근용 비밀번호 (사이트 진입)
- 어드민용 비밀번호 (관리 기능 접근)

### 2. 계층 구조
```
다락방 (Small Group)
  └── 멤버 (Member)
       ├── 다락방장 (Leader)
       └── 순장 (Sub-Leader)
```

### 3. 기도제목 구성
- 프로필 사진 (위치 조정 가능)
- 다락방 소속
- 이름
- 여러 개의 기도제목 (수정 가능)

### 4. 어드민 기능
- 다락방 추가/수정/삭제
- 멤버 추가/수정/삭제
- 기도제목 관리

### 5. 정렬 기능
- 최근 2주간 업데이트된 기도제목 우선 표시
- 최근 업데이트된 멤버 상단 배치

## 프로젝트 구조
```
prayer-requests/
├── src/
│   ├── components/     # 재사용 컴포넌트
│   ├── pages/          # 페이지 컴포넌트
│   ├── hooks/          # 커스텀 훅
│   ├── lib/            # 유틸리티 및 Supabase 클라이언트
│   ├── types/          # TypeScript 타입 정의
│   └── styles/         # 글로벌 스타일
├── public/             # 정적 파일
├── supabase/           # Supabase 마이그레이션 및 설정
└── docs/               # 문서
```

## Supabase 데이터베이스 스키마

### Tables

#### `small_groups` (다락방)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | 다락방 이름 |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |

#### `members` (멤버)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| small_group_id | uuid | 다락방 FK |
| name | text | 이름 |
| role | text | 'leader' or 'sub_leader' |
| photo_url | text | 프로필 사진 URL |
| photo_position | jsonb | 사진 위치 {x, y} |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |

#### `prayer_requests` (기도제목)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| member_id | uuid | 멤버 FK |
| content | text | 기도제목 내용 |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |

#### `settings` (설정)
| Column | Type | Description |
|--------|------|-------------|
| key | text | Primary key |
| value | text | 설정 값 |

## 코딩 컨벤션

### 컴포넌트
- 함수형 컴포넌트 사용
- Props 인터페이스 명시적 정의
- 파일명: PascalCase (예: `MemberCard.tsx`)

### 스타일링
- Tailwind CSS 클래스 사용
- 화이트 톤 기반 머터리얼 디자인
- 반응형: mobile-first 접근

### 상태 관리
- React Query (Tanstack Query)로 서버 상태 관리
- Context API로 인증 상태 관리

### 타입스크립트
- `any` 사용 금지
- 모든 Props, State에 타입 정의
- 타입 파일은 `types/` 폴더에 분리

## 환경 변수
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SITE_PASSWORD=site_access_password
VITE_ADMIN_PASSWORD=admin_access_password
```

## Git 브랜치 전략
- `main`: 메인 개발 브랜치
- `gh-pages`: GitHub Pages 배포 브랜치 (자동 생성)
- `feature/*`: 기능 개발 브랜치

## 배포

`gh-pages` 패키지를 사용하여 수동으로 배포합니다.

### 배포 명령어
```bash
npm run deploy
```

### 배포 과정
1. `npm run build` - 프로덕션 빌드 생성
2. `gh-pages -d dist` - dist 폴더를 gh-pages 브랜치에 푸시

### 필요한 package.json 스크립트
```json
{
  "scripts": {
    "build": "vite build",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

### GitHub Pages 설정
1. GitHub 저장소 → Settings → Pages
2. Source: "Deploy from a branch" 선택
3. Branch: `gh-pages` / `/ (root)` 선택
4. Save 클릭

### 주의사항
- 배포 전 `.env.local`에 환경 변수가 설정되어 있어야 합니다
- 첫 배포 시 `gh-pages` 브랜치가 자동으로 생성됩니다
- `vite.config.ts`에 `base` 설정이 필요합니다 (저장소 이름과 동일하게)
