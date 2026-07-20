# 기업분석 저널

투자 이유, CEO 정보, 가치투자 사이클, 펀더멘탈 업데이트를 기업별로 기록하는
개인용 정적 사이트입니다. **사이트에 직접 로그인해서 화면의 "+ 추가" / "✎ 편집"
버튼으로 내용을 입력**하면, 그 내용이 GitHub 저장소에 자동으로 커밋됩니다.
GitHub 웹 에디터로 JSON 파일을 직접 열어 고칠 필요가 없습니다.

## 1. 사이트 구조

```
index.html                     → 전체 기업 목록 페이지
company.html                   → 기업 상세 페이지 (?slug=xxx 로 어떤 기업인지 결정)
data/companies.json            → 목록 페이지에 보여줄 기업 리스트 (매니페스트)
data/companies/intel.json      → 인텔 상세 데이터
data/companies/_template.json  → (참고용) 새 기업 데이터의 기본 구조
assets/css/style.css           → 디자인
assets/js/app.js               → 목록 페이지 로직
assets/js/company.js           → 상세 페이지 로직 + 편집 기능
assets/js/github.js            → GitHub API로 데이터 파일을 읽고 커밋하는 모듈
assets/js/modal.js             → 입력 폼 모달 공통 컴포넌트
assets/js/admin.js             → 로그인/로그아웃 컨트롤
```

빌드 과정이 없습니다. 브라우저가 JSON 파일을 직접 읽어 화면에 그리고,
관리자 모드에서는 같은 브라우저가 GitHub API로 그 JSON 파일을 다시 씁니다.

## 2. GitHub Pages로 배포하기

1. 이 폴더 전체를 GitHub 저장소에 push 합니다. (예: `CompanyAnalysis`)
2. 저장소의 **Settings → Pages** 로 이동합니다.
3. **Source** 를 `Deploy from a branch` 로 설정하고, 브랜치는 `main`, 폴더는
   `/ (root)` 로 지정한 뒤 저장합니다.
4. 1~2분 뒤 `https://<사용자명>.github.io/<저장소명>/` 주소에서 사이트가 열립니다.

> GitHub Actions 없이 정적 파일만으로 동작하므로 별도 빌드 설정이 필요 없습니다.

## 3. 관리자 로그인 설정 (최초 1회)

사이트에서 직접 내용을 추가/수정하려면 이 저장소에 쓰기 권한이 있는
**GitHub Personal Access Token(PAT)** 이 필요합니다.

1. GitHub 우측 상단 프로필 → **Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token**
2. **Repository access** 를 "Only select repositories" 로 지정하고, 이
   `CompanyAnalysis` 저장소만 선택합니다. (다른 저장소에는 권한을 주지 않는 게 안전합니다)
3. **Permissions → Repository permissions → Contents** 를 `Read and write` 로 설정합니다.
4. 토큰을 생성하고, 표시되는 값을 복사해둡니다. (다시 볼 수 없으니 안전한 곳에 잠깐 저장)
5. 사이트 우측 상단의 **"관리자 로그인"** 버튼을 눌러 다음을 입력합니다.
   - GitHub 사용자명 (owner)
   - 저장소 이름 (repo) — 예: `CompanyAnalysis`
   - 브랜치 — 보통 `main`
   - 방금 만든 토큰
6. "연결하기"를 누르면 저장소 접근을 확인하고, 이후부터 각 섹션에
   "＋ 추가" / "✎ 편집" 버튼이 나타납니다.

**보안 참고사항**
- 토큰은 이 브라우저의 `localStorage`에만 저장됩니다. 서버로 전송되지 않고
  GitHub API 호출에만 사용됩니다.
- 저장소 하나에만 권한을 준 fine-grained 토큰을 쓰면, 토큰이 노출되어도
  피해 범위가 이 저장소로 한정됩니다. 절대 classic token(전체 저장소 권한)을
  쓰지 마세요.
- 공용 컴퓨터나 타인과 공유하는 브라우저에서는 로그인하지 말고, 다 쓴 뒤
  "관리자 계정 → 로그아웃"으로 토큰을 지워주세요.
- 저장소를 Public으로 두면 사이트 내용은 누구나 볼 수 있습니다(편집은
  본인 토큰을 가진 사람만 가능). 비공개로 하려면 저장소를 Private로 만들되,
  GitHub Pages의 Private 저장소 지원은 Pro/Team 이상 플랜에서만 가능합니다.

## 4. 사이트에서 내용 추가/수정하기

로그인 후 각 섹션 제목 옆에 나타나는 버튼을 누르면 폼이 열리고, 저장을
누르면 몇 초 안에 GitHub 저장소에 커밋됩니다.

- **기본 정보 / 투자 이유** — 기업명, 티커, 투자 이유 문단 수정
- **경영진(CEO)** — 이름, 취임일, 학력·커리어(줄바꿈으로 구분), 지분율, 리스크 요소
- **가치투자 사이클** — 최대 5단계, 제목을 비워두면 그 단계는 저장되지 않습니다
- **정량 펀더멘탈** — 먼저 "지표 설정"으로 어떤 항목(매출, FCF 등)을 추적할지
  정의한 뒤, "분기 추가/수정"으로 분기별 숫자를 입력합니다. 같은 분기명을
  다시 입력하면 그 분기 값이 갱신됩니다.
- **펀더멘탈 업데이트** — 날짜/내용/코멘트로 새 항목을 추가하고, 각 항목의
  ✕ 버튼으로 삭제할 수 있습니다.
- **새 기업 추가** — 목록 페이지 상단의 "+ 새 기업 추가"로 slug/기업명/티커/
  투자 이유를 입력하면 새 기업 페이지가 자동 생성됩니다.

> 커밋은 GitHub 저장소에는 즉시 반영되지만, 실제 배포된 사이트(GitHub Pages)에
> 그 변경이 보이려면 Pages가 다시 빌드되는 데 보통 30초~1분 정도 걸립니다.
> 로그인한 상태에서는 항상 GitHub의 최신 데이터를 직접 불러오므로, 저장
> 직후에도 본인 화면에는 바로 반영된 내용이 보입니다.

## 5. 로컬에서 미리보기

```bash
cd CompanyAnalysis
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

로컬 미리보기에서도 관리자 로그인 후 편집하면 실제 GitHub 저장소에 커밋됩니다
(로컬 파일이 아니라 GitHub API를 통해 원격 저장소를 직접 수정하는 방식입니다).

## 6. JSON을 직접 고치고 싶을 때

관리자 UI로 다루지 않는 세부 사항(예: `data/companies/_template.json`의
전체 구조 확인)이 필요하면 GitHub 웹 에디터로 JSON 파일을 직접 열어 고칠
수도 있습니다. 이때는 문법 오류(쉼표 누락 등)에 주의하고, 커밋 전
jsonlint.com 등으로 검증하는 것을 권장합니다.
