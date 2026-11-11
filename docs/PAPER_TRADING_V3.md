# SOXL v3.0 — 독립 모의매매 PWA

> DEMO / 고정된 합성 1분봉만 사용합니다. 실제 SOXL 시세, 투자 성과, 메리츠 인증 성공을 의미하지 않습니다. 실제 주문·계좌·인증 API는 이 앱에서 호출하지 않습니다.

## 분리 범위

- 앱: `paper-trading/v3/` (기존 `paper-trading/index.html` 초안도 보존).
- 이 저장소에는 v2.2 운영 PWA 소스나 운영 배포 연결 정보가 없습니다. v2.2와 동일 코드 기반이라는 주장을 하지 않습니다.
- `generate_briefing.py`, 기존 브리핑 테스트, `morning-briefing.yml`, `daily-briefing.yml`, 기존 `meritz-readonly/`는 수정하지 않습니다.
- 개발 브랜치: `feature/soxl-paper-trading-v3`; 기존 draft PR #1에 추가. 자동 병합·운영 DNS·운영 배포 변경 없음.

## 실행 및 검증

```sh
npm ci
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
python -m unittest discover -s tests -v
npm run serve
```

`http://127.0.0.1:4173`에서 앱 실행. `npm run build`는 `.preview/public/`에 허용된 정적 파일만 복사합니다. `.env`, 어댑터, 계좌 파일, 저장소 원본은 배포 대상이 아닙니다. CSP는 외부 API 연결을 차단합니다. 추가 CI는 v3 경로만 대상으로 검증하며 기존 09:00 KST 브리핑 작업과 분리됩니다.

## 데이터·저장 한계

- 40개의 합성 1분봉을 수동으로 진행하는 교육용 시뮬레이터이며 시간 자동 갱신·실시간 수신·백그라운드 매매를 하지 않습니다.
- 기본 계좌 7개 × 가상 USD 10,000. 실제 계좌와 관계없습니다.
- 거래 기록은 해당 브라우저·해당 미리보기 출처에만 저장됩니다. 다른 기기/주소와 동기화되지 않고 Safari 데이터 삭제·비공개 모드·저장 공간 정책으로 소실될 수 있습니다. 중요한 모의 기록은 내보내기를 사용하세요. 서버 저장은 구현하지 않았습니다.
- 미리보기 주소가 달라지면 저장 공간이 분리됩니다. iPhone 홈 화면에 추가한 앱과 일반 탭의 저장 정책은 OS에 따라 다를 수 있습니다.
- 주말·뉴욕 시간대/DST의 정규장·프리·애프터 구분을 사용합니다. 거래소 공휴일·조기폐장 달력, 호가 깊이, 실제 체결 우선순위는 제공하지 않습니다.
- 분봉의 봉내 경로는 알 수 없어 손절 우선·신규 매수 봉의 낙관적 익절 금지 등 보수적 가정을 사용합니다. 실제 체결 보장이 아닙니다. 손절 가상 시장매도에는 수수료·스프레드·슬리피지와 불리한 시가 갭이 적용됩니다.
- PWA 오프라인 캐시는 앱 방문 및 서비스워커 준비 이후 사용할 수 있습니다. Netlify 팀 로그인 보호가 활성화되어 있으면 iPhone Safari에서 소유 팀 계정 로그인이 먼저 필요합니다. 접근 보호를 해제하거나 운영 사이트로 우회 배포하지 않습니다.

## 메리츠 문서 검증 (통신 성공 검증과 구별)

검토 원본: 공식 `meritz-securities/open-api`, commit `a93c6409db73ea97ad15f7b7186f36c9f32ecd89`, `openapi.json` 및 `examples/03_overseas_market.py`.

- 해외 **주식** 분봉: `GET /market/v1/overseas/candles/minutes`. 해외 지수 분봉 어댑터와 구별합니다.
- 요구 파라미터: `mrkt_div_code=OV`, `mrkt_cls_code=OQ`, `iscd=SOXL`, `dely_rltm_cls_code=0`(실시간 요청)/`1`(지연 요청), `hour_cls_code=60`(**초 단위, 1분**). `mac_address` 헤더는 12자리이며 전역 Bearer 인증을 상속합니다.
- 성공 `rsp_cd=0000`, `data[]`의 `korea_date`, `korea_hour`, `oprc`, `hprc`, `lprc`, `prpr`, `cntg_vol`과 공식 응답 예제를 확인했습니다. UI에 공식 응답의 가격을 실시간 자료처럼 전시하지 않습니다.
- 공식 예제는 최신 봉부터 반환하며 요청 간격과 실제 거래 부재에 따라 타임스탬프가 연속하지 않을 수 있습니다. 파서는 시간순 정렬·중복/잘못된 날짜/비정상 OHLC 거부를 합니다.
- Issue #2의 최대 40봉 계약을 앱 파서에서 강제합니다. 검토한 OpenAPI 응답 스키마에는 `maxItems`가 명시되어 있지 않으므로 API의 실제 40봉 제한을 실통신으로 재확인했다고 주장하지 않습니다. 40봉을 장기 백테스트 데이터로 표현하지 않습니다.
- OAuth 문서는 `client_credentials`, `client_id`, `client_secret`, `scope=login`을 요구합니다. 이 앱은 토큰 발급을 포함해 인증 API를 호출하지 않습니다. 기존 어댑터는 서버 측 별도 코드로 남겨두며 프런트 빌드에 넣지 않습니다.
- **미검증:** 실제 인증, SOXL 거래소 매핑/시세 이용 권한, 실시간/지연 가용성, 지연 시간, 실서버 응답. 공식 스펙 검토는 실제 서비스 사용 가능성이나 조회 전용 토큰의 권한 격리를 입증하지 않습니다. 따라서 LIVE 토글·자동 데모 전환이 없고 DEMO만 제공합니다.

## 미리보기 안전

별도의 Netlify 테스트 사이트에 사전 빌드한 정적 파일만 수동 draft 배포합니다. Git 연결·함수·환경 변수·브로커 비밀을 설정하지 않습니다. 기존 사이트의 published deploy ID와 Git 연결 메타데이터를 배포 전후 비교합니다. 저장된 Netlify 인증은 도구 내부에서만 사용하고 소스/브라우저/출력에 복사하지 않습니다. 공개 GitHub 저장소에는 합성 데이터와 코드만 추가합니다.
