# VIAFARM Reinfa Digital Twin — Plan v5 (AU Market, Production-Grade)

> ~18주 (4.5개월) / ~140 PR. **상용화 품질 일관성** + **호주 시장 진출** 기준. Phase 1 디지털 트윈 코어.
>
> v4 → v5 변경: ① Primary market = **Australia** ② Default language = **English (en-AU)** ③ 디자인·법무·TZ·데이터 거주지 모두 호주 컨벤션
>
> 권위 문서:
>
> - 호주 시장·언어·디자인·법무 결정 = [LOCALISATION.md](LOCALISATION.md) **(우선 적용)**
> - 전체 플랫폼 비전 = [ARCHITECTURE.md](ARCHITECTURE.md)
> - 본 PLAN = 실행 계획 (LOCALISATION/ARCHITECTURE와 충돌 시 그 둘이 우선)

---

## 1. 최종 산출물 매니페스트 (Phase 1 끝나면 갖게 되는 것)

### 1.1 운영 중인 서비스 (호주 호스팅)

- **`twin.viafarm.com.au`** 또는 `.au` (예시 도메인 — 확정 필요, .au는 ABN 필요)
- **`sim-bff.viafarm.com.au`** — 시뮬레이터 BFF
- **`assets.viafarm.com.au`** — Cloudflare R2 (APAC) + CDN
- **`docs.viafarm.com.au`** — VitePress 문서
- **Supabase 프로젝트** — `ap-southeast-2` (Sydney). Auth + Postgres + Storage
- **모든 데이터 시드니 거주지** (Privacy Act 준수)
- **Pilot Glasshouse 앞 키오스크 모니터** — 24/7, en-AU 디폴트
- **OBS 송출 환경** — 라이브 데모

### 1.2 코드베이스

- 모노레포 (pnpm + turbo), TypeScript strict 일관 적용
- 3개 앱 (`web`, `sim-bff`, `docs`) + 13개 패키지
- `>80%` 단위 테스트 커버리지 (critical 패키지)
- E2E 테스트 스위트 (Playwright, ko/en 양쪽)
- 시각 회귀 베이스라인 (Babylon 씬·SCADA·UI)
- 성능 벤치마크 베이스라인 (M1/M1 Pro/M1 Max 측정치)

### 1.3 문서 (en-AU primary, ko-KR secondary)

- README + Setup Guide + Contributing Guide
- ARCHITECTURE.md, PLAN.md, LOCALISATION.md
- OpenAPI sapecs × 5 (각 외부 팀에 전달용, English)
- **Operator Manual** (PDF) — 운영자 페르소나용
- **Subscriber Guide** — Plot Subscriber용
- **Administrator Manual** — Admin 페르소나용
- **Runbook** — 인시던트·일상 운영
- **Developer Onboarding** — 신규 합류자
- **Asset Pipeline Guide** — Blender 아티스트
- **Kiosk Installation Manual** — 현장 설치자
- **Simulator Specification** — 모델·파라미터·검증
- **Privacy Policy + Terms of Service + Subscription Terms** — 호주 법무 검토 (Australian Privacy Act + ACCC/ACL 준수)

### 1.4 시각/마케팅 산출물

- 60초 데모 영상 (1080p + 4K)
- 마케팅 스크린샷 세트 (15장)
- 아키텍처 다이어그램 (Excalidraw + SVG)
- 데모 시나리오 ×5 (정상 운영 / 병해 감지 / 펌프 고장 / VIP 데모 / 구독자 수확)

### 1.5 운영 환경

- 모니터링 대시보드 (Grafana 또는 동등): uptime·에러율·성능·비즈니스 KPI
- 알림 라우팅 (Slack + 이메일)
- 백업 + DR 절차 (RTO 2h, RPO 1h)
- SLO 정의 (가용성 99.5%, p95 응답 200ms, FCP 1.5s)
- CI/CD 파이프라인 + PR 프리뷰 배포
- 성능 예산 (CI에서 enforce)
- 보안 헤더 + CSP + rate limit + bot 보호

### 1.6 컴플라이언스/법적 (호주 기준)

- **Privacy Policy** — Privacy Act 1988 + Australian Privacy Principles (APPs) 준수, 호주 변호사 검토
- **Terms of Service** — Australian Consumer Law (ACL) 준수
- **Subscription Terms** — ACCC 가이드라인 준수 (가격·해지·갱신 명확)
- **Subscriber Consent Flow** (이미지 사용·마케팅 별도 동의)
- **Notifiable Data Breaches** 절차 (호주 법적 신고 의무)
- **Security audit report** (외부 또는 내부 pentest)
- **WCAG 2.2 AA** 접근성 감사 보고서
- **Data retention/deletion policy** (사용자 삭제 요청 자동화)
- **Cookie/Tracking Notice**
- 한국 운영팀 데이터는 별도 한국 PIPA 검토 (내부)

### 1.7 시뮬레이터 (단독 가치)

- 5개 외부 시스템(Console/Backend/Robot/Subscription/Growth)을 실재하듯 모방
- 8개 물리·화학·생물 모델 (§6 참조)
- 30일치 시드 시나리오 + 5종 데모 시나리오
- 시간 조작 (일시정지/속도 0.1×–100×/임의 시점 점프)
- 이상 주입 도구 (운영자 훈련용)
- **실 API 도착 시 어댑터만 교체** — 동일 인터페이스

---

## 2. 상용화 품질 바 (Production-Grade Quality Bar)

영역별로 "이게 끝났다"의 기준. 모든 영역이 이 기준을 동시에 충족해야 일관성 있음.

| 영역              | 품질 기준                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **기능 완성도**   | 정의된 모든 사용자 시나리오 동작. 예외·실패 경로 처리. 빈 상태·로딩·에러 UI 일관                                                               |
| **성능**          | M1 8GB med 60fps, M1 Pro/Max ultra 60fps, 4K@60 검증. p95 API 응답 200ms. LCP 2.5s 이하                                                        |
| **신뢰성**        | SLO 99.5% 가용성. 무중단 배포. 자동 롤백. 헬스체크 + 자동 폴백 (시뮬레이터→캐시→마지막 알려진 상태)                                            |
| **보안**          | OWASP Top 10 통과. 외부 pentest 또는 동급 내부 감사. JWT 회전·signed URL·rate limit·CSP·bot 보호                                               |
| **개인정보**      | **Privacy Act 1988 + APPs** 준수 (호주). 데이터 매핑. 동의 흐름. 삭제 자동화. 감사 로그. Sydney 거주지                                         |
| **접근성**        | WCAG 2.2 AA 준수. axe + 수동 검수. 키보드 전 화면 조작. 스크린리더 SCADA 값 음독                                                               |
| **i18n**          | **en-AU primary** 100%, ko-KR secondary 100%. Inter primary + Noto KR fallback. RTL 미지원 명시. AU 스펠링 (centre/colour/litre/organise) 준수 |
| **모니터링**      | 에러·메트릭·로그 통합. 비즈니스 KPI 대시보드. 알림 라우팅. 인시던트 트래킹                                                                     |
| **DR**            | 백업·복원 검증. DR 드릴 통과. RTO 2h / RPO 1h                                                                                                  |
| **문서**          | README, 사용자 가이드, 관리자 가이드, 런북, 온보딩, API 사양 — 모두 ko/en                                                                      |
| **테스트**        | 단위 >80% (critical), E2E 핵심 시나리오 커버, 시각 회귀, 성능 회귀, 접근성 검증                                                                |
| **자산 품질**     | 모든 3D 자산 PBR 완성, KTX2 압축, LOD, 일관된 스케일·머티리얼·라이팅                                                                           |
| **데이터 일관성** | 시뮬레이터의 8개 모델이 상호작용 일관. 어떤 시점에 스크럽해도 깨지지 않음                                                                      |

---

## 3. 클라우드 서비스 의존성 + 키 필요 시점

| 서비스               | 첫 필요 시점 | PR            | 용도                                                                                    | 임시 대체             | 키 받으면 전달할 것                 |
| -------------------- | ------------ | ------------- | --------------------------------------------------------------------------------------- | --------------------- | ----------------------------------- |
| **GitHub**           | PR 5         | CI/CD         | 소스·Actions·릴리즈·이슈·PR 리뷰                                                        | 로컬 git만            | org 이름 + 저장소 권한              |
| **Cloudflare**       | PR ~50       | 자산 CDN      | R2 (APAC 우선) 자산, Pages 프리뷰                                                       | BFF에서 정적 서빙     | API 토큰 (R2 + Pages scope)         |
| **Sentry**           | PR 8         | 옵저버빌리티  | 에러 트래킹·성능 모니터링                                                               | 콘솔 로그만           | DSN (EU 리전 권장 — 호주 리전 부재) |
| **Supabase**         | PR ~110      | 인증·DB       | Auth, Postgres, Storage. **`ap-southeast-2` (Sydney) 필수** (Privacy Act 데이터 거주지) | 로컬 Postgres         | 프로젝트 URL + anon + service key   |
| **Vercel**           | PR ~140      | 프로덕션 배포 | 메인 웹앱, PR 프리뷰. 시드니 엣지 활용                                                  | Cloudflare Pages 대체 | 팀 ID + 프로젝트 토큰               |
| **이메일/Kakao API** | Phase 2+     | 구독자 알림   | 본 Phase 1 비범위                                                                       | —                     | —                                   |
| **결제 PG**          | Phase 2+     | 청구          | 본 Phase 1 비범위                                                                       | —                     | —                                   |

**원칙**: 각 서비스 도입 PR 들어가기 **1주 전**에 사용자에게 키 요청. 그 이전엔 로컬 대체 사용. PR 1–4 동안은 어떤 외부 서비스도 불필요.

---

## 4. 작물 — Butter Lettuce, Week 2 Post-Transplant

UI 표기 = **"Butter Lettuce"** (호주 명칭, 식물은 동일).

| Attribute       | Value                                                    |
| --------------- | -------------------------------------------------------- |
| Total age       | ~3 weeks (1 wk germination + 2 wk transplanted)          |
| Leaf count      | 6–10 (true leaves)                                       |
| Canopy diameter | 10–15 cm                                                 |
| Height          | 8–12 cm                                                  |
| Leaf colour     | mid-green, slightly darker veins, pale green new growth  |
| Leaf shape      | rounded, slightly cupped (butter lettuce characteristic) |
| Heading         | none (begins week 4–5)                                   |
| Roots           | 2–4 cm white roots visible at rockwool cube base         |

인스턴스 변이·LOD·셰이더 사양 동일 (스케일 ±5%, Y회전 0–30°, HSV ±5%, mesh 변이 3종, thinInstance, LOD 3단).

---

## 5. 시스템 컨텍스트 — 6시스템

| 시스템          | 소유            | 역할              | Phase 1 상태                                       |
| --------------- | --------------- | ----------------- | -------------------------------------------------- |
| Console         | 운영팀          | L3 MES            | OpenAPI 합의 + **시뮬레이터**                      |
| Backend         | 개발팀          | L1–L2 + Historian | OpenAPI 합의 + **시뮬레이터**                      |
| Robot Ops       | 로봇팀          | L3.5 측정         | OpenAPI 합의 + **시뮬레이터**                      |
| Subscription    | 사업개발 (미래) | L4 ERP            | stub 사양 + **시뮬레이터** + Supabase 일부 실 구현 |
| Growth Analysis | CV/ML팀 (미래)  | L3.5 분석         | stub 사양 + **시뮬레이터** (CV는 mock 결과만 생성) |
| Digital Twin    | **대표**        | 통합 시각화       | **본 프로젝트**                                    |

자세한 6시스템 책임은 [ARCHITECTURE.md §5](ARCHITECTURE.md).

---

## 6. 시뮬레이터 아키텍처 (NEW)

본 프로젝트의 가장 큰 변별점. 단순 mock이 아니라 실제 시스템처럼 동작.

### 6.1 코어 엔진

- **틱 루프**: 시뮬레이션 시간 1Hz (조정 가능 0.1×–100×)
- **시간 제어**: 일시정지 / 임의 시점 점프 / 미래 외삽
- **상태 저장소**: Postgres (sim_state 테이블, 시점별 스냅샷)
- **결정론적**: 같은 시드 + 같은 입력 = 같은 결과 (재현 가능)
- **이벤트 버스**: 모델 간 상호작용 (펌프 ON → flow 모델이 EC 모델에 알림)

### 6.2 8개 물리·화학·생물 모델

| #   | 모델                    | 입력                                      | 출력                            | 복잡도                           |
| --- | ----------------------- | ----------------------------------------- | ------------------------------- | -------------------------------- |
| 1   | **유체 흐름** (Flow)    | 펌프 속도, 밸브 상태, 파이프 인벤토리     | 각 노드 유량·압력·인벤토리      | 단순 mass-balance ODE            |
| 2   | **양액 화학** (EC/pH)   | 도징 펌프 적산, 혼합 챔버 부피, 회수 양액 | 베드별 EC·pH (지수 응답)        | mixing tank 모델                 |
| 3   | **식물 생장** (Biomass) | DLI(누적 광량), EC, T, 시간               | plot별 biomass·캐노피 면적·잎수 | logistic growth (작물별 r, K)    |
| 4   | **CO2 분산**            | 봄베 분사율, 환기율, 룸 부피              | 룸 평균 + 그라데이션            | single compartment ODE           |
| 5   | **온/습도**             | HVAC 설정, 분무량, LED 발열               | 룸 T/RH                         | 단순 thermal mass                |
| 6   | **광량 (PAR)**          | LED 위치·강도·스펙트럼                    | 각 plot의 PPFD                  | 거리 + cosine 감쇠               |
| 7   | **로봇 운동**           | 명령 (이동·스캔), 통로 제약               | pose, 배터리, 충돌 회피         | mecanum 운동학 + 단순 dynamics   |
| 8   | **스캔/측정**           | biomass 상태, 노이즈 시드                 | canopy_area, color, anomaly     | biomass의 함수 + 가우시안 노이즈 |

### 6.3 스케줄·이벤트 시뮬레이터

- **재배 일정**: Console schedule → 자동 파종·정식·수확 이벤트 발생
- **레시피 변경**: 작물 단계에 따라 EC/pH 셋포인트 자동 변경
- **알람 생성**: 측정값이 셋포인트에서 벗어나면 자동 알람
- **이상 주입**: 데모/훈련용으로 특정 plot에 병해·영양결핍 시뮬레이션

### 6.4 5종 데모 시나리오

1. **정상 운영 30일** — 무사고 베이스라인
2. **병해 발견** — day 15 plot X 이상 → 알림 → 운영자 개입 → 정상화
3. **펌프 고장** — day 7 급액 펌프 정지 → 알람 → 백업 모드 → 복구
4. **VIP 데모 5분** — 핵심 기능 자동 시연 (라이브 데모용)
5. **구독자 수확** — 특정 plot이 정식 후 6주 도달 → 수확 알림 → 리포트 자동 생성

### 6.5 검증

- 시뮬레이터 출력이 실 데이터(있다면)와 비교 검증
- 단위 테스트: 각 모델 mass balance·에너지 보존
- 시나리오 테스트: 5종 시나리오 endpoint 결과 일관
- 시뮬레이터 사양서 문서화 (모델·파라미터·검증 결과)

---

## 7. 디렉토리 구조 (v4)

```
/DigitalTwin
├── apps/
│   ├── web/                 # Vite + React + Babylon (3D + SCADA 듀얼)
│   ├── sim-bff/             # Fastify + 시뮬레이터 + 5 API 서피스
│   └── docs/                # VitePress
├── packages/
│   ├── api-contracts/       # OpenAPI 3.1 × 5 + 생성 TS
│   ├── sim-core/            # 시뮬레이터 코어 (틱 루프·시간·저장소)
│   ├── sim-models/          # 8개 물리·화학·생물 모델
│   ├── sim-scenarios/       # 5종 데모 시나리오
│   ├── scene/               # Babylon 씬
│   ├── materials/           # PBR + 셰이더
│   ├── effects/             # GPU 파티클·볼류메트릭
│   ├── scada/               # SVG HMI
│   ├── ui/                  # 디자인 시스템
│   ├── data/                # BFF 클라이언트·hooks·stores
│   ├── persona/             # 페르소나·권한·인증
│   ├── i18n/                # ko/en
│   ├── telemetry/           # 에러·메트릭·로그
│   ├── assets/              # glTF·HDR·KTX2 (R2 동기화)
│   └── types/               # 공유 TS
├── tools/
│   ├── asset-pipeline/      # Blender·KTX2·라이트맵
│   ├── sim-bench/           # 시뮬레이터 벤치마크
│   ├── perf-bench/          # GPU 벤치마크
│   └── compliance/          # PIPA·접근성 검증 자동화
└── infra/
    ├── supabase/            # 스키마·마이그레이션·RLS·시드
    ├── cloudflare/          # R2 버킷·Workers·Pages config
    └── vercel/              # 배포 config
```

---

## 8. 21 Phase 마일스톤 (~18주)

| Phase                          | 주차     | PR      | 데모 가능 산출                                              |
| ------------------------------ | -------- | ------- | ----------------------------------------------------------- |
| **1A** 토대                    | W1       | 1–10    | 빈 React + CI 통과 + Sentry 수신 + 디자인시스템 3컴포넌트   |
| **1B** API 계약                | W2       | 11–16   | OpenAPI 5종 합의 가능 상태, TS 타입 생성                    |
| **1C-α** 시뮬레이터 코어       | W3       | 17–22   | 틱 루프 동작, 시간 제어 UI, sim_state 저장                  |
| **1C-β** 시뮬레이터 모델       | W4–W5 초 | 23–32   | 8개 모델 모두 동작, 모델 간 상호작용 검증                   |
| **1C-γ** API 서피스 + 시나리오 | W5       | 33–40   | 5개 API + 5종 시나리오 모두 동작                            |
| **1D** 프론트 데이터           | W6 초    | 41–45   | 사이드패널에 시뮬레이터 실시간 데이터                       |
| **2A** Babylon 코어            | W6       | 46–55   | 빈 룸 + PBR/IBL/그림자/포스트프로세싱                       |
| **2B** 정적 건축               | W7       | 56–64   | 룸 A/B 셸 풀 + 라이트맵 베이크                              |
| **2C** 장비 모델               | W8       | 65–75   | 랙·탱크·양액기·도징펌프 모두 모델                           |
| **2D** 배관 + 흐름             | W8 끝    | 76–79   | 3색 라인 + 시뮬레이터 flow와 sync                           |
| **2E** 식물                    | W9       | 80–86   | 버터헤드 200주 + LED 핑크 글로우                            |
| **2F** 대기 장비               | W9 끝    | 87–91   | CO2 봄베·NDIR·노즐·가습기                                   |
| **3A** SCADA 컴포넌트          | W10      | 92–99   | Tank/Pump/Valve/Pipe/Sensor/Doser/Alarm + Storybook         |
| **3B** SCADA 조립              | W11 초   | 100–105 | 양액기 + 급액 P&ID + 듀얼 sync                              |
| **4A** 효과                    | W11      | 106–112 | 미스트 볼류메트릭 + CO2 분산 + HVAC                         |
| **4B** 로봇                    | W12      | 113–117 | 시뮬레이터 로봇 자율 + POV + 수동                           |
| **5A** 대시보드                | W12 끝   | 118–124 | 5탭 모두 동작, 시뮬레이터 데이터 binding                    |
| **5B** 타임라인 + 투어         | W13 초   | 125–130 | 30일 재생 + 어노테이션 + 가이드 투어 3종                    |
| **6** Plot + 페르소나 + Auth   | W13–W14  | 131–141 | Supabase Auth 실 동작, 구독자 토큰 인증, 갤러리             |
| **7** 키오스크/라이브          | W15      | 142–147 | 터치 키오스크 + 어트랙트 + OBS 송출                         |
| **8** 성능 + SLO + DR          | W16      | 148–155 | 자동 품질 티어 + 4K 검증 + 백업/복원 드릴                   |
| **9** 보안 + 컴플라이언스      | W17      | 156–166 | Pentest 통과 + **Privacy Act + ACCC** + WCAG AA + i18n 100% |
| **10** 런치                    | W18      | 167–174 | 호주 도메인·시드니 배포·en-AU 매뉴얼·en-AU 데모 영상        |

**총 ~174 PR / 18주.** 인접 PR 묶음으로 실제 진행 시 ~140–150 PR로 수렴 예상.

---

## 9. PR 상세

> 각 PR: 1–2일 작업, 30분 리뷰, 단일 의도, DoD 명시.
> "💎 키 필요" 마크: 외부 서비스 키 받아야 진행 가능.

### Phase 1A — 토대 (PR 1–10, W1)

| #   | 제목                                                                                  | DoD                                                                                           |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------- |
| 1   | 모노레포 + pnpm workspace + turbo                                                     | `pnpm i`, 워크스페이스 인식                                                                   |
| 2   | TS strict + path aliases                                                              | typecheck 통과                                                                                |
| 3   | ESLint flat + Prettier + EditorConfig                                                 | lint 통과                                                                                     |
| 4   | Git hooks (Husky/lint-staged/commitlint)                                              | 잘못된 commit 거부                                                                            |
| 5   | 💎 GitHub repo + CI 파이프라인                                                        | PR 시 lint/typecheck/test 자동                                                                | **GitHub 키 필요**  |
| 6   | 테스트 인프라 (Vitest+RTL+Playwright+시각회귀)                                        | 샘플 unit + e2e + 시각 회귀                                                                   |
| 7   | 디자인 시스템 (Tailwind v4 + shadcn + Inter typo + Lucide 아이콘 + 호주/서구 SaaS 톤) | Button/Card/Dialog/Input/Toast 5종, 다크모드 1급, 8px grid, Western spacing (LOCALISATION §4) |
| 8   | 💎 옵저버빌리티 (Sentry + 구조화 로그 + Web Vitals)                                   | 에러 발생 시 Sentry 수신                                                                      | **Sentry DSN 필요** |
| 9   | i18n 셋업 (i18next + **en-AU primary + ko-KR secondary**)                             | 토글 즉시 전환, AU 스펠링 lint 통합, glossary.md → translation memory                         |
| 10  | 접근성 도구 (axe CI 통합, eslint-plugin-jsx-a11y)                                     | CI에서 a11y 위반 차단                                                                         |

### Phase 1B — API 계약 (PR 11–16, W2)

| #   | 제목                                               | DoD                  |
| --- | -------------------------------------------------- | -------------------- |
| 11  | OpenAPI 스캐폴드 + 타입 자동 생성 + 린트           | `pnpm gen:types`     |
| 12  | Console API 사양 (작물/베드/Plot/레시피/이벤트)    | yaml 검증, 예시 응답 |
| 13  | Backend API 사양 (센서/장비/알람 + WS)             | WS 메시지 스키마     |
| 14  | Robot Ops API 사양 (텔레메트리/스캔/명령)          | yaml 검증            |
| 15  | Subscription API 사양 (고객/계약/Plot 할당/리포트) | Plot id 체계 통일    |
| 16  | Growth Analysis API 사양 (측정/사진/이상)          | 5개 yaml lint OK     |

### Phase 1C-α — 시뮬레이터 코어 (PR 17–22, W3)

| #   | 제목                                                                         | DoD                          |
| --- | ---------------------------------------------------------------------------- | ---------------------------- |
| 17  | Fastify 스캐폴드 + 헬스/메트릭/로그 + Docker                                 | `/health` `/metrics`         |
| 18  | Postgres + Drizzle ORM + 마이그레이션 시스템                                 | 마이그레이션 1회 적용/롤백   |
| 19  | 시뮬레이터 틱 루프 (1Hz, 가속 0.1×–100×)                                     | 틱 단위 결정론 검증          |
| 20  | 시뮬레이션 시간 제어 (pause/jump/speed) API + WS, **TZ-aware (AEDT 디폴트)** | 시간 조작 동작, TZ 약어 표시 |
| 21  | sim_state 저장소 + 스냅샷 (시점별 복원)                                      | 임의 시점 복원               |
| 22  | 시드 시스템 (재현 가능 랜덤)                                                 | 동일 시드 = 동일 결과        |

### Phase 1C-β — 시뮬레이터 모델 (PR 23–32, W4–W5초)

| #   | 제목                                          | DoD                      |
| --- | --------------------------------------------- | ------------------------ |
| 23  | Flow 모델 (mass balance, 파이프 인벤토리)     | 펌프 ON → 인벤토리 이동  |
| 24  | EC/pH 화학 모델 (mixing tank)                 | 도징 → EC 변화 지수 응답 |
| 25  | 식물 biomass 모델 (logistic growth, DLI 기반) | 30일 지나면 수확 단계    |
| 26  | CO2 분산 모델 (single compartment ODE)        | 환기율 변화에 따른 농도  |
| 27  | 온/습도 모델 (thermal mass + LED 발열)        | 적정 안정화              |
| 28  | PAR/광량 모델 (거리 + cosine 감쇠)            | plot별 PPFD 합리적       |
| 29  | 로봇 운동학 모델 (mecanum, 단순 dynamics)     | 명령 → 자연스러운 운동   |
| 30  | 스캔/측정 모델 (biomass → 측정값 + 노이즈)    | 합리적 측정값 생성       |
| 31  | 이벤트 버스 + 모델 간 상호작용                | 펌프→flow→EC→식물 연쇄   |
| 32  | 시뮬레이터 단위 테스트 (mass/에너지 보존)     | 모든 모델 보존 법칙 검증 |

### Phase 1C-γ — API 서피스 + 시나리오 (PR 33–40, W5)

| #   | 제목                                                                                                   | DoD                                              |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 33  | Console API 서피스 (시뮬레이터 백킹)                                                                   | OpenAPI 일치 응답                                |
| 34  | Backend API 서피스 (REST + WS 1Hz 푸시)                                                                | wscat 검증                                       |
| 35  | Robot Ops API 서피스                                                                                   | 텔레메트리 WS 동작                               |
| 36  | Subscription API 서피스 (Postgres 기반)                                                                | 가상 고객 5명·계약 8건 시드                      |
| 37  | Growth API 서피스 (시뮬레이터 + 가짜 이미지)                                                           | placeholder 이미지 생성                          |
| 38  | 시나리오 플레이어 (시나리오 로드/실행)                                                                 | 시나리오 JSON 포맷 정의                          |
| 39  | 5종 데모 시나리오 (Normal Ops / Pest Alert / Pump Failure / **Stakeholder Demo** / Subscriber Harvest) | 각 시나리오 endpoint 통과, en-AU 시나리오 텍스트 |
| 40  | 시뮬레이터 사양서 문서화 (모델·파라미터·검증)                                                          | docs 사이트 게재                                 |

### Phase 1D — 프론트 데이터 (PR 41–45, W6 초)

| #   | 제목                                  | DoD                         |
| --- | ------------------------------------- | --------------------------- |
| 41  | BFF 클라이언트 + TanStack Query       | 모든 GET hook 동작          |
| 42  | WebSocket 재연결 + 백오프 + 상태 sync | 끊김/재연결 회복            |
| 43  | Zustand 도메인 스토어 8종             | 단위 테스트                 |
| 44  | React hooks + Suspense/에러경계       | 미니 사이드패널 데이터 흐름 |
| 45  | 시간 제어 UI (시뮬레이터 시간 조작)   | 일시정지/속도/점프          |

### Phase 2A — Babylon 코어 (PR 46–55, W6)

| #   | 제목                                                 | DoD                   |
| --- | ---------------------------------------------------- | --------------------- | ---------------------- |
| 46  | Babylon + WebGPU 부트 + WebGL2 폴백                  | 백엔드 종류 콘솔 출력 |
| 47  | 카메라 시스템 (오빗/1인칭/시네마)                    | 3종 토글, 보간        |
| 48  | PBR 머티리얼 라이브러리 (concrete/paint/glass/steel) | 4종 박스              |
| 49  | IBL + HDRI 환경맵 로딩                               | 프리필터 큐브맵       |
| 50  | 💎 자산 호스팅 (Cloudflare R2 + 다운로드 파이프라인) | R2에서 자산 로드      | **Cloudflare 키 필요** |
| 51  | DefaultRenderingPipeline (tonemap/bloom/FXAA)        | 조절 UI               |
| 52  | SSAO2 + 티어 토글                                    | 시각 차이 확인        |
| 53  | SSR (바닥 한정)                                      | 환경 반사             |
| 54  | CSM 그림자 (3 cascade + PCF)                         | 깨끗한 그림자         |
| 55  | 품질 티어 4단 + GPU 사용량 측정                      | 티어별 차이           |

### Phase 2B — 정적 건축 (PR 56–64, W7)

| #   | 제목                                               | DoD                     |
| --- | -------------------------------------------------- | ----------------------- |
| 56  | 룸 A 셸 (4,950×3,550×3,000)                        | 실측 비례               |
| 57  | 창문 + sun directional                             | 시간대별 빛             |
| 58  | 출입문 (단/이중) + hinge 애니메이션                | 클릭 시 열림            |
| 59  | 천장 형광등 ×3                                     | 균등 조명               |
| 60  | 룸 B 확장 (2,900 + 가벽 + 유리벽)                  | A↔B 토글                |
| 61  | 유리벽 절개 패널 시스템                            | 절개 위치 토글          |
| 62  | 가구 (책상·싱크대·작업도구)                        | "사람 일하는 공간" 느낌 |
| 63  | 콘크리트/페인트 텍스처 + UV 셋업                   | 일관 텍스처             |
| 64  | 라이트맵 베이킹 파이프라인 (Blender Cycles → KTX2) | 정적 메시 라이트맵      |

### Phase 2C — 장비 모델 (PR 65–75, W8)

| #   | 제목                                             | DoD                       |
| --- | ------------------------------------------------ | ------------------------- |
| 65  | 재배 랙 모델 (알루미늄 프로파일 + 베드 3단)      | Blender glTF              |
| 66  | 랙 ×2 thinInstance + 위치 검증                   | 도면 정확                 |
| 67  | 베드 양액 표면 셰이더 (잔물결 + 유량)            | 시뮬레이터 유량 binding   |
| 68  | LED 그로우라이트 바 모델 + emissive              | 디테일 정확               |
| 69  | LED 라이트 소스 binding + 광량 슬라이더          | 핑크 스펙트럼             |
| 70  | 원수 탱크 (반투명 PE + 수위)                     | clip plane                |
| 71  | A·B·pH 탱크 ×3                                   | 같은 셰이더 패밀리        |
| 72  | 양액기 도징 펌프 ×3 (외관 + 회전 임펠러)         | 시뮬레이터 도징률 binding |
| 73  | 혼합 챔버 + EC/pH 센서 하우징                    | 혼합 그라데이션           |
| 74  | 회수 탱크 + 배관 fittings (엘보·티·플랜지)       | fittings 라이브러리       |
| 75  | 모든 장비 클릭 → 사이드 카드 (시뮬레이터 데이터) | 클릭 통합                 |

### Phase 2D — 배관 + 흐름 (PR 76–79, W8 끝)

| #   | 제목                                   | DoD              |
| --- | -------------------------------------- | ---------------- |
| 76  | 파이프 지오메트리 (스플라인 → tube)    | 두께 조절        |
| 77  | 원수 라인 (cyan) + 흐름 셰이더         | UV 스크롤        |
| 78  | 급액 (green) + 배액 (magenta)          | 3색 모두 흐름    |
| 79  | A/B 레이아웃별 라우팅 + 절개 패널 통과 | 두 레이아웃 정확 |

### Phase 2E — 식물 (버터헤드 week-2) (PR 80–86, W9)

| #   | 제목                                       | DoD               |
| --- | ------------------------------------------ | ----------------- |
| 80  | 버터헤드 week-2 base 모델 (Blender → glTF) | §4 스펙 충족      |
| 81  | 잎 셰이더 (PBR + 가짜 SSS 백라이트)        | LED 빛 통과 효과  |
| 82  | 록울 큐브 + 뿌리 렌더링                    | 흰 뿌리 노출      |
| 83  | thinInstance + Plot 매핑 (베드당 ~24주)    | 200+ 인스턴스     |
| 84  | LOD 3단 (high/mid/billboard)               | 자동 전환, 60fps  |
| 85  | 인스턴스 변이 시스템 (스케일/회전/색/메시) | 자연스러운 다양성 |
| 86  | 성장 단계 인터페이스 scaffold (week 0~3)   | 인터페이스만      |

### Phase 2F — 대기 장비 (PR 87–91, W9 끝)

| #   | 제목                               | DoD               |
| --- | ---------------------------------- | ----------------- |
| 87  | CO2 봄베 ×2 + 레귤레이터           | 도면 위치         |
| 88  | CO2 분배기 + 타공 호스             | 라우팅 자연스러움 |
| 89  | NDIR 센서 + LED 상태 + 호버 측정값 | 작물 눈높이       |
| 90  | 산업용 초음파 노즐 라인 (랙 상단)  | 노즐 8–12개       |
| 91  | 타워형 가습기 (비교 토글)          | 산업 vs 가정      |

### Phase 3A — SCADA 컴포넌트 (PR 92–99, W10)

| #   | 제목                                      | DoD             |
| --- | ----------------------------------------- | --------------- |
| 92  | ISA-101 디자인 토큰 + SCADA 셸            | 토큰 문서화     |
| 93  | `<Tank>` (수위 fill)                      | level binding   |
| 94  | `<Pump>` (회전 임펠러)                    | running binding |
| 95  | `<Valve>` (3-state)                       | state 시각화    |
| 96  | `<Pipe>` (흐름 dash)                      | flowing binding |
| 97  | `<Sensor>` + `<Doser>` (적산)             | mock 검증       |
| 98  | `<AlarmBanner>` + 알람 리스트 + ack       | Backend forward |
| 99  | 모든 SCADA 컴포넌트 Storybook + 시각 회귀 | 100% 커버       |

### Phase 3B — SCADA 조립 (PR 100–105, W11 초)

| #   | 제목                                   | DoD                |
| --- | -------------------------------------- | ------------------ |
| 100 | 양액기 P&ID (A/B/pH + 혼합 + EC/pH)    | 시뮬레이터 binding |
| 101 | 급액/배액 P&ID (배관 + 베드 + 회수)    | 베드별 작물 아이콘 |
| 102 | SCADA 풀 씬 컴포지션                   | 한 화면에 전체     |
| 103 | 듀얼 뷰 셸 + 양방향 sync               | SCADA↔3D 양방향    |
| 104 | 뷰 모드 (split/3D/SCADA) + 단축키      | URL `?display=`    |
| 105 | 듀얼 디스플레이 모드 (2 인스턴스 sync) | 2 브라우저 sync    |

### Phase 4A — 효과 (PR 106–112, W11)

| #   | 제목                                      | DoD                     |
| --- | ----------------------------------------- | ----------------------- |
| 106 | GPU 파티클 시스템 기반                    | 1만 파티클 60fps        |
| 107 | 초음파 미스트 파티클                      | 노즐 ON 시 분사         |
| 108 | 미스트 볼류메트릭 스캐터링 + god rays     | LED 핑크 god rays       |
| 109 | CO2 파티클 (호스 출구)                    | 봄베 ON 시 분사         |
| 110 | CO2 스칼라 필드 (3D 텍스처) + iso-surface | 시뮬레이터 농도 binding |
| 111 | HVAC 기류 streamline                      | 디퓨저 아래 흐름        |
| 112 | "집합건물 공조 한계" 어노테이션 + 토글    | 한계 시각화             |

### Phase 4B — 로봇 (PR 113–117, W12)

| #   | 제목                                         | DoD              |
| --- | -------------------------------------------- | ---------------- |
| 113 | 로봇 모델 (메카넘 카트 + PT 카메라 + 태블릿) | prox 모델        |
| 114 | 자율 주행 (스플라인 + PTZ 스캔 포즈)         | 두 랙 왕복       |
| 115 | 수동 명령 + Robot Ops POST forward           | 키보드/패드      |
| 116 | POV 카메라 PIP + 스캔 타겟 하이라이트        | PIP 윈도우       |
| 117 | 로봇 상태 UI (배터리/위치/명령 큐)           | 모든 상태 가시화 |

### Phase 5A — 대시보드 (PR 118–124, W12 끝)

| #   | 제목                                                               | DoD                         |
| --- | ------------------------------------------------------------------ | --------------------------- |
| 118 | 대시보드 셸 (도킹/리사이즈/접기)                                   | 태블릿 가로 OK              |
| 119 | Overview 탭 (KPI 4종)                                              | KPI 카드                    |
| 120 | Cultivation 탭 (베드/Plot별 작물)                                  | Plot 단위 표시              |
| 121 | Climate 탭 (시계열 Visx) — °C, PPFD, mS/cm, **DD/MM/YYYY** 날짜 축 | 4종 차트, AU 단위/포맷 일관 |
| 122 | Robot 탭                                                           | POV+경로+배터리+명령        |
| 123 | Settings 탭                                                        | 모든 설정 toggle            |
| 124 | 알람 + 이벤트 패널 통합                                            | 필터/검색                   |

### Phase 5B — 타임라인 + 투어 (PR 125–130, W13 초)

| #   | 제목                                 | DoD                  |
| --- | ------------------------------------ | -------------------- |
| 125 | 타임라인 스크러버 + 재생 컨트롤      | 부드러움             |
| 126 | 시뮬레이터 시간 점프 통합            | 임의 시점 복원       |
| 127 | 30일치 시드 시나리오 재생 검증       | 정식일 → 수확일 점프 |
| 128 | 어노테이션/핫스팟 시스템             | 정보 카드            |
| 129 | 가이드 투어 시나리오 3종 (30s/2m/5m) | JSON 시나리오        |
| 130 | 시나리오 편집 UI (Admin)             | JSON 편집기          |

### Phase 6 — Plot + 페르소나 + Auth (PR 131–141, W13–W14)

| #   | 제목                                                                                 | DoD                                    |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------- | -------------------- |
| 131 | Plot 데이터 모델 + Postgres 스키마                                                   | 마이그레이션                           |
| 132 | Plot ownership 3D 오버레이                                                           | 색상 경계                              |
| 133 | Plot ownership SCADA 오버레이                                                        | 베드 그리드                            |
| 134 | 페르소나 시스템 + 권한 모델 (5종 정의)                                               | 페르소나 토글                          |
| 135 | 💎 Supabase Auth (Magic Link), **`ap-southeast-2` Sydney 리전**                      | 로그인 동작, 데이터 거주지 Sydney 검증 | **Supabase 키 필요** |
| 136 | RBAC (operator/visitor/subscriber/researcher/admin)                                  | 권한별 UI 분기                         |
| 137 | RLS (Row-Level Security) — 구독자 자기 plot만                                        | 다른 plot 조회 거부                    |
| 138 | 구독자 토큰 인증 + 보안 감사                                                         | JWT 회전·만료·replay 방지              |
| 139 | 구독자 plot 포커스 (카메라 자동)                                                     | "내 식물로 가기"                       |
| 140 | 성장 사진 갤러리 (Growth API + signed URL)                                           | best 사진 표시                         |
| 141 | 구독자 동의 흐름 (Privacy/ToS 필수 + 이미지 사용 별도 + 마케팅 별도, **APP 7 준수**) | 동의 UI, 동의 기록 저장, 철회 절차     |

### Phase 7 — 키오스크/라이브 (PR 142–147, W15)

| #   | 제목                                    | DoD                   |
| --- | --------------------------------------- | --------------------- |
| 142 | 키오스크 모드 (`?mode=kiosk`)           | 풀스크린/큰 터치      |
| 143 | 어트랙트 모드 + 자동 시네마 투어        | 3분 idle 트리거       |
| 144 | 멀티터치 (핀치/회전)                    | Pointer Events        |
| 145 | 세션 격리 + 입력 디바운스               | 새 방문 시 리셋       |
| 146 | OBS 송출 모드 (no chrome)               | 1080p 60fps 캡처      |
| 147 | 라이브 데모 시나리오 자동 재생 (송출용) | VIP 5분 시나리오 자동 |

### Phase 8 — 성능 + SLO + DR (PR 148–155, W16)

| #   | 제목                                  | DoD                      |
| --- | ------------------------------------- | ------------------------ |
| 148 | GPU 벤치마크 + 품질 티어 자동 선택    | M1 8GB med, M1 Max ultra |
| 149 | 성능 HUD + 텔레메트리                 | 실시간 표시 + 로그       |
| 150 | M1 8GB 메모리 최적화 + KTX2 전환      | 메모리 측정              |
| 151 | 4K @ 60fps 검증 + 하드웨어 권고       | M1 vs Mac mini 비교      |
| 152 | SLO 정의 + 모니터링 (가용성/응답/FCP) | Grafana 대시보드         |
| 153 | 백업 자동화 + 복원 절차               | Supabase 백업 + 검증     |
| 154 | DR 드릴 (RTO 2h / RPO 1h)             | 실 드릴 통과             |
| 155 | 성능 회귀 CI (Lighthouse + 성능 예산) | PR 시 자동               |

### Phase 9 — 보안 + 컴플라이언스 (PR 156–166, W17)

호주 시장 컴플라이언스 + 보안.

| #   | 제목                                                              | DoD                                     |
| --- | ----------------------------------------------------------------- | --------------------------------------- |
| 156 | OWASP Top 10 검토 + 보강                                          | 체크리스트 통과                         |
| 157 | Pentest (외부 또는 내부 감사)                                     | 보고서 + High 이슈 0                    |
| 158 | CSP + 보안 헤더 + rate limit + bot 보호                           | observatory.mozilla A+                  |
| 159 | Signed URL 감사 (이미지·자산)                                     | 만료·서명 검증                          |
| 160 | **Privacy Act 1988 + APPs 데이터 매핑** + Privacy Policy (en-AU)  | 호주 변호사 검토, 13 APP 매핑           |
| 161 | Terms of Service + Subscription Terms (en-AU) — **ACCC/ACL 준수** | 1-click 해지, 가격·갱신 명확, 환불 정책 |
| 162 | **Notifiable Data Breaches** 절차 + 자동 알림 흐름                | 침해 시 72h 내 OAIC 신고 절차           |
| 163 | 데이터 보유/삭제 정책 + 자동화 (사용자 삭제 요청)                 | 삭제 요청 자동 처리, 30일 SLA           |
| 164 | 감사 로그 (감사 가능 작업 기록)                                   | 90일 보관                               |
| 165 | 접근성 감사 (WCAG 2.2 AA, axe + 수동 + 스크린리더)                | AA 통과 보고서                          |
| 166 | i18n 100% 검증 (en-AU/ko-KR 누락 0, AU 스펠링 검증)               | 자동 검증 통과, glossary 일치           |

### Phase 10 — 런치 (PR 167–174, W18)

| #   | 제목                                                            | DoD                           |
| --- | --------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| 167 | 💎 Vercel 프로덕션 배포 + `viafarm.com.au` 도메인               | HTTPS, 시드니 엣지 활성       | **Vercel 키 + .au 도메인 필요** |
| 168 | BFF 프로덕션 배포 (호주 호스팅 — Fly.io syd 리전 등)            | 헬스체크 통과, 응답 지연 측정 |
| 169 | 모니터링 대시보드 + 알림 라우팅 (Slack/이메일, AEST 타임)       | 알림 동작                     |
| 170 | 사용자 매뉴얼 ×3 (Operator/Subscriber/Admin) — en-AU + ko-KR    | PDF + docs 사이트             |
| 171 | 런북 (인시던트·일상 운영, en-AU)                                | docs 사이트                   |
| 172 | 키오스크 설치 매뉴얼 + 현장 셋업 검증 (호주 현장)               | 매뉴얼 + 1회 셋업             |
| 173 | 60s 데모 영상 (1080p + 4K, **en-AU narration**) + 스크린샷 15장 | 호주 시장 마케팅 자산         |
| 174 | 런치 체크리스트 + 회고 + Phase 2 킥오프 (분양 모델 실 구현)     | 다음 Phase 준비               |

---

## 10. Phase 간 의존성 (병렬화 가능 영역)

```
1A → 1B → 1C-α → 1C-β → 1C-γ → 1D ─┐
                                    │
1A → 2A → 2B → 2C → 2D → 2E → 2F ──┤
                                    ├→ 3A → 3B ──┐
                                    │            │
                                    └→ 4A ───────┤
                                                 ├→ 4B → 5A → 5B → 6 → 7 → 8 → 9 → 10
```

**다인 병렬 시 트랙**:

- Track A 시뮬레이터: 1A→1B→1C(α,β,γ)→1D
- Track B 렌더: 1A→2A→2B→2C→2D→2E→2F
- Track C SCADA: 3A→3B (1D+2F 의존)
- Track D 효과: 4A (2A 의존)
- Track E 로봇: 4B (4A 의존)
- Track F 페르소나/Auth: 5+6 (1D+3B+Supabase 의존)
- 마무리: 7→8→9→10 (직렬)

3인 풀타임: 8–10주 가능. 1인: 18주.

---

## 11. 위험 + 완화

| 위험                                | 영향                          | 완화                                                          |
| ----------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| 시뮬레이터 모델 정확도 부족         | 데이터 비현실, 데모 신뢰 손상 | 시뮬레이터 사양서에 가정/한계 명시. 실 데이터 도착 시 보정 PR |
| 18주 일정 — 1인 작업 시 압박        | 일정 슬립                     | 다인 병렬 가능 트랙 분리, 외주 가능 영역 분리 (자산)          |
| 외부 API 사양 미확정                | 통합 깨짐                     | mock-first + 시뮬레이터, OpenAPI 어댑터만 교체                |
| Supabase/Vercel/Cloudflare 비용     | 운영 비용                     | 각 PR 진입 시 비용 추정 + 사용자 승인                         |
| 자산 외주 일정                      | 시각 완성도 지연              | placeholder primitive 시작, 자산 도착 시 교체 PR              |
| WebGPU 브라우저 호환                | 키오스크 미동작               | WebGL2 폴백, Chrome 121+ 고정                                 |
| 보안 사고 (구독자 토큰)             | 신뢰 손상                     | Phase 9 별도 보안 Phase, Pentest 통과 후 런치                 |
| PIPA 미준수                         | 법적 리스크                   | Phase 9 법무 검토 + 자동 삭제 절차                            |
| 키오스크 하드웨어 미확정            | 4K 성능 검증 불가             | Phase 1 중에 사양 확정 필요 (PR 50 즈음)                      |
| 시뮬레이터 성능 (8 모델 1Hz × 30일) | BFF 부하                      | 모델별 벤치마크, 필요 시 worker pool                          |

---

## 12. 비-목표 (Phase 1)

- ❌ VR/AR
- ❌ 멀티 유저 동시 조작
- ❌ SLAM/Nav 직접 통합
- ❌ 실 생리 모델 (시뮬레이터는 합리적 근사)
- ❌ 모바일 폰 세로
- ❌ 직접 하드웨어 제어
- ❌ Subscription/CV 실 구현 (Phase 2/3) — Phase 1엔 시뮬레이터 + UI까지
- ❌ 멀티팜/멀티테넌트 (Phase 4) — API에 자리만
- ❌ Butter Lettuce 외 작물 (Phase 1엔 1종)
- ❌ 성장 단계 변화 애니메이션 (week 2 고정)
- ❌ 결제·청구 (Phase 2)
- ❌ 알림 발송 인프라 (Phase 2)
- ❌ 영어·한국어 외 언어 (en-AU + ko-KR만, Phase 2 이후 검토)
- ❌ 호주 외 시장 (en-US/en-GB 변형은 Phase 2+)
- ❌ Freshcare/HACCP 인증 자체 (Phase 2+, 사업적 결정 후)

---

## 13. 다음 단계 (v4 승인 후)

**즉시 (PR 1–4)**:

- 외부 의존 없이 시작 가능
- 모노레포·TS·lint·git hooks 셋업

**PR 5 이전 (1주 내)**:

- 💎 **GitHub** 저장소 생성 + Actions 권한 확인

**PR 8 이전 (2주 내)**:

- 💎 **Sentry** 프로젝트 생성 + DSN

**Phase 2A 끝 (PR 50 즈음, ~7주차)**:

- 💎 **Cloudflare** API 토큰 (R2 + Pages)
- 키오스크 모니터 하드웨어 확정

**Phase 6 시작 (PR 135 즈음, ~13주차)**:

- 💎 **Supabase** 프로젝트 (`ap-southeast-2` Sydney) + 키
- **호주 변호사 자문 시작** (Privacy Act + Terms + Subscription Terms + APP 데이터 매핑)
- ACCC 가이드라인 자체 검토

**Phase 10 시작 (PR 167 즈음, ~18주차)**:

- 💎 **Vercel** 팀 + 프로젝트
- **`.com.au` 또는 `.au` 도메인** — ABN 등록 필요. 대안 `.io` (글로벌)
- 호주 사업자 등록(ABN) 진행 여부 결정 (.au 도메인·세무·소비자 신뢰 관점)

**자산 조달 병행 (W2–W9)**:

- 버터헤드 모델: 자체 vs 외주
- 산업용 노즐 사양 (PR 90 입력)
- 로봇 실 사양 (PR 113 교체 대비)
- HDRI: Polyhaven CC0

**다른 팀 회람 (W2–W3)**:

- OpenAPI 5종 회람 (운영/개발/로봇팀)
- ARCHITECTURE.md 임원·팀리더

---

## 14. 변경 이력

- v1 (2026-05-28): 초안. 27 PR / 4주
- v2 (2026-05-28): 외부 API 분리 + SCADA 듀얼뷰 + 키오스크. 30 PR / 5주
- v2.1 (2026-05-28): Plot first-class + Subscriber 페르소나 stub. +2 PR
- v3 (2026-05-28): 작물 = 버터헤드 week-2. 32 → ~70 PR / 12주. 누락 횡단 영역 보강
- v4 (2026-05-28): 시뮬레이터 + 상용화 품질 일관성. ~140 PR / 18주. 클라우드 통합. 보안/컴플라이언스/DR/SLO 별도
- **v5 (2026-05-28): 호주 시장 + en-AU 디폴트. Privacy Act/ACCC/APP 컴플라이언스, Sydney 데이터 거주지, 호주 디자인 톤. LOCALISATION.md 권위 문서 신설.**

---

_Plan v5 (AU Market) · 2026-05-28 · Claude (Opus 4.7) for 김순 (viasoft.ai)_
_Authoritative: [LOCALISATION.md](LOCALISATION.md) for language/design/legal/TZ decisions._
