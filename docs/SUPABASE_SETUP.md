# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: prayer-requests (원하는 이름)
   - **Database Password**: 안전한 비밀번호 설정 (나중에 필요할 수 있음)
   - **Region**: Northeast Asia (Seoul) 선택 권장
4. "Create new project" 클릭

## 2. API 키 확인

프로젝트 생성 후:
1. 좌측 메뉴에서 **Settings** → **API** 클릭
2. 다음 정보를 메모:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

## 3. 데이터베이스 테이블 생성

Supabase 대시보드에서 **SQL Editor**로 이동하여 다음 SQL을 실행:

```sql
-- 다락방 테이블
CREATE TABLE small_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 멤버 테이블
CREATE TABLE members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    small_group_id UUID REFERENCES small_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('leader', 'sub_leader')),
    photo_url TEXT,
    photo_position JSONB DEFAULT '{"x": 50, "y": 50}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기도제목 테이블
CREATE TABLE prayer_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 설정 테이블 (비밀번호 등)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 초기 비밀번호 설정 (나중에 변경하세요!)
INSERT INTO settings (key, value) VALUES
    ('site_password', 'prayer2024'),
    ('admin_password', 'admin2024');

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 설정
CREATE TRIGGER update_small_groups_updated_at
    BEFORE UPDATE ON small_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_requests_updated_at
    BEFORE UPDATE ON prayer_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_members_small_group_id ON members(small_group_id);
CREATE INDEX idx_members_updated_at ON members(updated_at DESC);
CREATE INDEX idx_prayer_requests_member_id ON prayer_requests(member_id);
CREATE INDEX idx_prayer_requests_updated_at ON prayer_requests(updated_at DESC);
```

## 4. Storage 버킷 설정 (사진 업로드용)

1. 좌측 메뉴에서 **Storage** 클릭
2. "New Bucket" 클릭
3. 버킷 설정:
   - **Name**: `photos`
   - **Public bucket**: 체크 (공개 접근 허용)
4. "Create bucket" 클릭

### Storage 정책 설정

**Storage** → **photos** 버킷 → **Policies** 탭에서:

1. "New Policy" → "For full customization" 클릭
2. 다음 정책 추가:

**SELECT (읽기) 정책:**
```sql
-- Policy name: Public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');
```

**INSERT (업로드) 정책:**
```sql
-- Policy name: Allow uploads
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos');
```

**UPDATE (수정) 정책:**
```sql
-- Policy name: Allow updates
CREATE POLICY "Allow updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos');
```

**DELETE (삭제) 정책:**
```sql
-- Policy name: Allow deletes
CREATE POLICY "Allow deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos');
```

## 5. Row Level Security (RLS) 설정

Supabase는 기본적으로 RLS가 활성화되어 있습니다.
이 프로젝트는 클라이언트 측 비밀번호 인증을 사용하므로, 간단한 정책을 설정합니다.

**SQL Editor**에서 실행:

```sql
-- RLS 활성화
ALTER TABLE small_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 대해 읽기/쓰기 허용 (anon key 사용)
-- 실제 인증은 클라이언트 측 비밀번호로 처리

CREATE POLICY "Allow all for small_groups" ON small_groups
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for members" ON members
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for prayer_requests" ON prayer_requests
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for settings" ON settings
    FOR ALL USING (true) WITH CHECK (true);
```

## 6. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**주의**: `.env.local` 파일은 절대 Git에 커밋하지 마세요!

## 7. GitHub Pages 배포

### 초기 설정
1. GitHub 저장소 → **Settings** → **Pages**
2. Source: "Deploy from a branch" 선택
3. Branch: `gh-pages` / `/ (root)` 선택 (첫 배포 후 브랜치가 생성됨)

### 배포 방법
```bash
# 환경 변수가 .env.local에 설정되어 있는지 확인 후
npm run deploy
```

이 명령어는:
1. `npm run build`로 프로덕션 빌드 생성 (환경 변수가 빌드에 포함됨)
2. `gh-pages -d dist`로 dist 폴더를 gh-pages 브랜치에 푸시

### 주의사항
- 배포 전 반드시 `.env.local` 파일에 Supabase 환경 변수가 설정되어 있어야 합니다
- 빌드 시 환경 변수가 번들에 포함되므로 GitHub Secrets 설정이 필요 없습니다

## 8. 테스트 데이터 추가 (선택사항)

```sql
-- 테스트 다락방 추가
INSERT INTO small_groups (name) VALUES
    ('1다락방'),
    ('2다락방'),
    ('3다락방');

-- 테스트 멤버 추가
INSERT INTO members (small_group_id, name, role)
SELECT id, '김순장', 'sub_leader' FROM small_groups WHERE name = '1다락방';

INSERT INTO members (small_group_id, name, role)
SELECT id, '이다락', 'leader' FROM small_groups WHERE name = '1다락방';

-- 테스트 기도제목 추가
INSERT INTO prayer_requests (member_id, content)
SELECT id, '가정의 평안을 위해 기도해주세요' FROM members WHERE name = '김순장';

INSERT INTO prayer_requests (member_id, content)
SELECT id, '직장에서의 지혜를 위해' FROM members WHERE name = '김순장';
```

## 문제 해결

### CORS 오류 발생 시
Supabase는 기본적으로 모든 origin을 허용합니다.
로컬 개발 시 `http://localhost:5173`에서 정상 작동해야 합니다.

### 데이터가 보이지 않을 때
1. RLS 정책이 올바르게 설정되었는지 확인
2. Supabase 대시보드에서 테이블 데이터 직접 확인
3. 브라우저 개발자 도구의 Network 탭에서 API 응답 확인

### Storage 업로드 실패 시
1. 버킷이 public으로 설정되었는지 확인
2. Storage 정책이 올바르게 설정되었는지 확인
3. 파일 크기 제한 확인 (기본 50MB)
