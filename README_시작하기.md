# SOXL 7계좌 무료 아침 브리핑 — GitHub Actions + GitHub Pages

**비용:** OpenAI API 없음, 유료 API 키 없음, Python 표준 라이브러리만 사용. 개인용 공개 GitHub 저장소 및 GitHub Pages의 무료 이용 범위 내에서 운영합니다. 외부 데이터 제공처가 접속을 차단하거나 정책을 변경하면 자동 수집이 실패할 수 있습니다.

## 먼저 확인하세요
- 이 프로그램은 **ChatGPT의 오전 8시 예약 브리핑을 가져오지 않습니다.** 별도의 **정형 시장 데이터 브리핑**을 생성합니다.
- **미국 정규장 종가 기반**입니다. 실시간·프리마켓·애프터마켓 가격이 아닙니다.
- SOXL, SOXX, QQQ 및 7개 반도체 기업 종가·전 거래일 대비 등락률: Yahoo Finance 비공식 공개 차트 엔드포인트(별도 키 없음, 무보장).
- VIX: Cboe 공식 일별 CSV. CNN 공포·탐욕 지수는 무료·안정적 수집 경로가 검증되지 않아 **null(미확인)** 처리합니다.
- 경제지표 발표 일정·기업 뉴스·원인 분석은 자동 생성하지 않습니다. 기존 ChatGPT 브리핑은 계속 별도로 받아보세요.
- Yahoo Finance 자료의 접근·재사용 조건을 확인하고 **개인 참고용**으로만 이용하세요. 외부 원천 데이터의 재배포·상업적 이용 권한을 제공하는 프로그램이 아닙니다.

## 1. GitHub 가입
https://github.com/signup 에서 무료 계정을 생성합니다.

## 2. 저장소 생성
GitHub 오른쪽 위 `+` → `New repository` → 이름 `soxl-morning-briefing` → **Public** → `Add a README file` 선택 → `Create repository`.

## 3. 파일 업로드
이 ZIP을 **압축 해제**한 뒤, 저장소 화면의 `Add file` → `Upload files`에서 **`generate_briefing.py`, `tests` 폴더, `.github/workflows/daily-briefing.yml`**을 업로드합니다. 숨김 폴더 `.github`가 누락되지 않도록 주의하세요. ZIP 자체를 올리면 동작하지 않습니다.

브라우저가 폴더 업로드를 지원하지 않으면 저장소에서 `.` 키로 github.dev 편집기를 열어 파일 구조를 그대로 생성하거나, GitHub Desktop으로 폴더 전체를 업로드하세요.

## 4. GitHub Pages 활성화
저장소 → `Settings` → `Pages` → `Build and deployment` → `Source`를 **GitHub Actions**로 선택합니다.

## 5. 첫 수동 실행
저장소 → `Actions` → `SOXL 무료 아침 브리핑` → `Run workflow` → 초록색 성공 표시를 확인합니다.

## 6. 피드 주소 연결
GitHub 계정 이름이 `MYNAME`, 저장소 이름이 `soxl-morning-briefing`이면 주소는 다음과 같습니다.

`https://MYNAME.github.io/soxl-morning-briefing/briefing-latest.json`

브라우저에서 열어 JSON이 표시되는지 확인한 다음, **기존 SOXL 앱 v1.3** → `⑥ SOXL 아침 브리핑` → `브리핑 JSON 주소`에 붙여넣기 → `주소 저장` → `지금 동기화`를 누릅니다.

**주의:** v1.2 이전 앱에는 피드 입력란이 없습니다. 그런 경우에만 v1.3 앱을 기존 Netlify 사이트에 업데이트하세요. 이미 v1.3이면 Netlify 재배포나 아이폰 앱 재설치가 필요 없습니다.

## 7. 예약 실행
워크플로는 매일 **한국시간 오전 8시 15분**에 예약되어 있습니다 (`UTC 23:15`). GitHub는 예약 실행을 지연하거나 건너뛸 수 있으며, 장기간 활동이 없는 공개 저장소에서는 예약 실행이 비활성화될 수 있습니다. 자동 실행 후 앱을 다시 열거나 `지금 동기화`를 누르면 새 데이터가 보입니다.

## 실패 시
- `Actions` 빨간색: 해당 실행을 열고 `Generate feed` 로그에서 데이터 제공처 차단 여부를 확인합니다.
- 모든 외부 데이터가 실패하면 워크플로가 실패하여 **이전 게시물은 그대로 유지**됩니다.
- 일부 항목만 실패하면 브리핑에 **데이터 미확인**으로 표시됩니다. 없는 수치를 추측해 채우지 않습니다.
- `404`: Pages 활성화 여부, 첫 실행 성공 여부, 주소의 GitHub 사용자 이름을 확인합니다.
- CORS 오류: GitHub Pages의 HTTPS JSON 주소를 사용하고, 브라우저에서 JSON이 실제로 열리는지 확인합니다.
- 데이터 기준일은 항목별로 표시되며, 휴장·지연일에는 최신 거래일 데이터를 사용합니다.

## 보안 및 개인정보
공개 GitHub Pages의 JSON은 누구나 볼 수 있습니다. 실계좌 정보, 증권사 비밀번호, API 키, 거래 내역, 개인정보를 업로드하지 마세요. 앱의 로컬 저장 모의거래 데이터는 이 자동화 도구에서 접근하지 않습니다.
