# Localisation & Cultural Design — Australia Primary

> 본 문서는 모든 UI·문서·법무·디자인 결정의 권위 문서.
> Primary market = **Australia**. Default language = **English (en-AU)**.
> Korean (ko-KR) is the secondary language for the internal Korean operations team.
>
> 본 문서가 PLAN.md·ARCHITECTURE.md와 충돌하면 LOCALISATION.md가 우선.

작성: 2026-05-28 · 김순 (대표, viasoft.ai)

---

## 1. 기본 원칙

1. **English-first, Korean-fallback**: 모든 새 UI/문서는 en-AU 우선 작성. ko-KR 번역은 내부 팀용으로 100% 제공.
2. **Australian conventions everywhere**: 단순 번역이 아닌 호주 문화·법무·UX 컨벤션 채택.
3. **Code is English-only**: 식별자·주석·커밋 메시지·이슈·PR 제목 = 영어. 본문 한국어 OK (내부 협업).
4. **Tone**: warm professional. 너무 차갑지도 너무 친근하지도 않음. "G'day" 같은 캐주얼 표현은 마케팅 카피에서만, B2B/SaaS UI에는 사용 금지.

---

## 2. Language & Copy Standards

### 2.1 Spelling (Australian English)

호주 영어 우선. 미국 영어 금지. 영국 영어와 대부분 일치하지만 차이 있음.

| ✅ AU                                            | ❌ US                                            |
| ------------------------------------------------ | ------------------------------------------------ |
| centre, organise, recognise, specialise, analyse | center, organize, recognize, specialize, analyze |
| colour, behaviour, favour, labour, harbour       | color, behavior, favor, labor, harbor            |
| fertiliser, sterilise, optimise, customise       | fertilizer, sterilize, optimize, customize       |
| litre, metre, kilometre, centimetre, millimetre  | liter, meter, kilometer, centimeter, millimeter  |
| programme (event/show) / program (software, OK)  | program (always)                                 |
| licence (noun) / license (verb)                  | license (always)                                 |
| practise (verb) / practice (noun)                | practice (always)                                |
| catalogue, dialogue                              | catalog, dialog                                  |
| aluminium                                        | aluminum                                         |
| ageing                                           | aging                                            |

자동 검증: ESLint plugin or markdownlint 또는 자체 사전 룰 (PR 9 i18n PR에 포함).

### 2.2 Tone of Voice (B2B SaaS, Australian)

- 명확하고 직접적, 그러나 차갑지 않게. Atlassian·Canva·Linktree·Afterpay 톤.
- 능동태, 짧은 문장 (평균 15단어 이하)
- "We" / "You" 1인칭/2인칭 사용 OK
- Jargon 최소화. 농업·산업 용어는 사용 가능하나 마케팅 카피에선 풀어 설명
- "Please" 적게 사용 (영어권 SaaS 톤은 더 직접적 — "Save changes" / "Delete plot" / "Cancel subscription")
- 호주 슬랭 금지 (UI). 마케팅 카피에서만 신중히 — "no worries", "fair dinkum" 등 자제 (오해 위험)

### 2.3 Microcopy Vocabulary

프로젝트 전반에 통일된 어휘. 검색·일관성용.

| Concept                      | en-AU (primary)                        | ko-KR (secondary)      |
| ---------------------------- | -------------------------------------- | ---------------------- |
| (the system)                 | Digital Twin                           | 디지털 트윈            |
| Pilot lab / demo site        | Pilot Glasshouse                       | 데모온실               |
| Growing room                 | Growing Room                           | 재배실                 |
| Rack (3-tier)                | Rack (or Growing Tower)                | 재배 랙                |
| Bed (one tier)               | Bed                                    | 베드                   |
| Plot (subscription unit)     | Plot                                   | 플롯 (구획)            |
| Plant (individual)           | Plant                                  | 식물                   |
| Crop variety                 | Crop / Variety                         | 작물                   |
| Butter lettuce (week 2)      | Butter Lettuce, Week 2                 | 버터헤드, 정식 2주차   |
| Nutrient solution            | Nutrient Solution                      | 양액                   |
| Nutrient doser unit          | Nutrient Doser / Fertigation Unit      | 양액기                 |
| A solution (Ca-based)        | Solution A (Calcium)                   | A액 (칼슘계)           |
| B solution                   | Solution B (Phosphate/Sulphate/Micros) | B액                    |
| pH adjustment                | pH Adjuster                            | pH 조정액              |
| Raw water tank               | Raw Water Tank                         | 원수 탱크              |
| Recovery tank                | Drain / Return Tank                    | 배양액 회수 탱크       |
| Pump                         | Pump                                   | 펌프                   |
| Dosing pump                  | Dosing Pump                            | 도징 펌프              |
| Valve                        | Valve                                  | 밸브                   |
| Mixing chamber               | Mixing Chamber                         | 혼합 챔버              |
| Pipe / hose / line           | Pipe / Hose / Line                     | 배관 / 호스 / 라인     |
| Supply line                  | Supply Line                            | 급액 라인              |
| Drain line                   | Drain Line                             | 배액 라인              |
| Sensor                       | Sensor                                 | 센서                   |
| EC (electrical conductivity) | EC                                     | EC                     |
| pH                           | pH                                     | pH                     |
| Light intensity (PAR/PPFD)   | Light Intensity (PPFD)                 | 광량                   |
| LED grow light               | LED Grow Light                         | LED 그로우라이트       |
| Spectrum (pink)              | Spectrum (Magenta/Pink)                | 핑크 스펙트럼          |
| CO2 cylinder                 | CO₂ Cylinder                           | CO₂ 봄베               |
| NDIR sensor                  | NDIR CO₂ Sensor                        | NDIR 센서              |
| Humidifier (industrial)      | Ultrasonic Humidifier (Industrial)     | 초음파 가습기 (산업용) |
| Mist nozzle                  | Misting Nozzle                         | 분무 노즐              |
| HVAC / aircon                | HVAC / Climate Control                 | 공조                   |
| Building shared HVAC         | Building HVAC                          | 집합건물 공조          |
| Power outlet                 | Power Point                            | 콘센트                 |
| Sink                         | Sink                                   | 싱크대                 |
| Desk (work bench)            | Work Bench / Bench                     | 작업대                 |
| Transplant                   | Transplant                             | 정식                   |
| Sowing / Seeding             | Sowing                                 | 파종                   |
| Harvest                      | Harvest                                | 수확                   |
| Cleaning / Sanitation        | Cleaning                               | 청소                   |
| Cycle / Growing cycle        | Growing Cycle                          | 재배 사이클            |
| Recipe                       | Recipe / Setpoint Schedule             | 레시피                 |
| Setpoint                     | Setpoint                               | 셋포인트               |
| Alarm                        | Alarm                                  | 알람                   |
| Event                        | Event                                  | 이벤트                 |
| Adoption / Subscription      | Plot Adoption / Plot Subscription      | 분양                   |
| Subscriber / Adopter         | Adopter (or Subscriber)                | 분양 고객              |
| Growth report                | Growth Report                          | 성장 리포트            |
| Best photos                  | Featured Photos                        | 베스트 사진            |
| Anomaly / Issue              | Anomaly                                | 이상                   |
| Pest or disease              | Pest / Disease                         | 병해                   |
| Robot scan session           | Scan Session                           | 스캔 세션              |

용어 변경 시 본 표 업데이트 → translation memory 동기화 → UI 일괄 갱신.

---

## 3. Date, Time, Number Formats

### 3.1 Date

- **Display short**: `28/05/2026` (DD/MM/YYYY)
- **Display long**: `28 May 2026`
- **Display with weekday**: `Thursday, 28 May 2026`
- **Storage**: ISO 8601 UTC `2026-05-28T03:42:00Z`
- **First day of week**: Monday
- **Calendar week numbering**: ISO week

### 3.2 Time

- **Subscriber / consumer UI**: 12h `2:30 pm` (lowercase, space before am/pm)
- **Operator / SCADA / technical UI**: 24h `14:30`
- **Storage**: ISO 8601 UTC
- **TZ display**:
  - Default user TZ (browser)
  - 시드니 거점 사용자 = AEDT/AEST (`Australia/Sydney`)
  - 한국 운영자 = KST (`Asia/Seoul`)
  - 표시 시 TZ 약어 같이 (예: `14:30 AEDT`)

### 3.3 Number

- Decimal: `.`
- Thousands separator: `,` (예: `1,250.5 L`)
- Negative: `-1.5` (괄호 안 됨)

### 3.4 Currency

- AUD only in Phase 1. Display as `A$1,250.00` or `AUD 1,250.00` (context dependent)
- KRW 표시 금지 (내부 회계는 별도 시스템)

### 3.5 Units

- Length: mm / cm / m / km
- Volume: mL / L
- Mass: g / kg
- Temperature: °C
- Light: PPFD (μmol/m²/s), DLI (mol/m²/day)
- EC: mS/cm
- pH: dimensionless
- Pressure: kPa or bar (industry context)
- Flow: L/min or L/h
- 표시 시 단위 사이에 공백: `25 °C`, `1.5 mS/cm`, `200 PPFD`

### 3.6 Phone & Address

- Phone: `+61 4xx xxx xxx` (mobile) or `+61 2 xxxx xxxx` (Sydney)
- Address fields (Phase 2 구독자 가입 시):
  ```
  Address Line 1
  Address Line 2 (optional)
  Suburb
  State (NSW / VIC / QLD / SA / WA / TAS / ACT / NT) — dropdown
  Postcode (4 digits)
  Country (default Australia)
  ```

---

## 4. Visual Design Language

### 4.1 Typography

- **Body / UI**: Inter (variable) — system font, en-friendly, 가독성 우수
- **Display / headings**: Inter Tight 또는 Geist
- **Mono / SCADA / 코드**: JetBrains Mono 또는 Geist Mono
- **Korean fallback**: Noto Sans KR (ko 토글 시 자동)
- **No emoji** in B2B UI by default. 마케팅 카피만 절제 사용.

### 4.2 Spacing & Density

- **8px grid** 베이스
- **Western spacing** — 한국 SaaS 대비 여백 더 넉넉
  - 카드 패딩: 24px (한국 SaaS는 16px가 일반)
  - 섹션 간격: 48px (한국은 32px가 일반)
- **Progressive disclosure** — 한 화면에 정보 적게, 클릭으로 확장
- **태블릿/모니터 우선** — Phase 1엔 모바일 폰 비범위

### 4.3 Colour Palette

- **Primary**: 농업·녹색 자연스러움 — `#10B981` (emerald) 또는 `#22C55E` (green-500). 너무 형광 X, 너무 어둡지 X
- **Accent (data positive)**: `#3B82F6` (blue-500)
- **Warning**: `#F59E0B` (amber-500)
- **Danger**: `#EF4444` (red-500) — 한국·중화권에서 빨강은 행운이지만 호주/서구에선 위험. 위험 표시 외 사용 자제
- **Neutral**: zinc / slate scale (Tailwind)
- **Backgrounds**: white / `#FAFAFA` light, `#0A0A0A` dark
- **Dark mode**: 1급 시민 (Australia/Western SaaS 사용자 다수 선호)

### 4.4 SCADA Colours (ISA-101)

운영 화면은 산업 표준 따름. 위와 별도.

- Background: 회색 (`#A0A0A0` 또는 darker)
- Data values: 흑/백 + 색 강조 (alarm 시만)
- Equipment: 회색 (정상), 노랑 (주의), 빨강 (이상), 깜박임 (긴급)
- 본 팔레트는 §4.3 일반 UI와 별도. 의도된 비대칭.

### 4.5 Iconography

- **Lucide React** — Western iconography, 깔끔, 일관
- 산업 SCADA 심볼은 ISA-5.1 표준 SVG (별도 라이브러리)
- 한국식 픽토그램 사용 금지

### 4.6 Imagery (마케팅 / 데모 영상)

- 호주 현지 농업 풍경, 호주식 식재료 스타일링
- 사람 사진: 다양성 (호주 인구 구성 반영 — 백인·아시아인·인도계 등)
- 한국 풍경/한국인 모델은 한국 마케팅 자산에만

### 4.7 Layout Conventions

- **LTR only** — 영어·한국어 모두 LTR. RTL (아랍어) 미지원 명시
- **Top nav** (Atlassian/Canva 스타일) 또는 **left sidebar** (운영 화면) 선택
- 모달은 절제, 사이드 패널 우선 (3D 뷰 가리지 않게)

---

## 5. Legal & Compliance (Australia)

### 5.1 Primary Frameworks

- **Privacy Act 1988** + **Australian Privacy Principles (APPs)** — 13개 원칙
- **Notifiable Data Breaches scheme** — 데이터 침해 시 신고 의무
- **Spam Act 2003** — 알림/이메일 동의
- **Australian Consumer Law (ACL)** — 분양 구독 모델 시 핵심
- **Competition and Consumer Act 2010** — ACCC 관할

### 5.2 GDPR / Other

- EU 거주 사용자 가능성 있으면 GDPR도 준수 (호주 사업이지만 글로벌 웹)
- PIPA(한국)는 한국 거주 운영팀 데이터 처리 시 일부 적용 가능 — 법무 자문

### 5.3 Data Residency

- **All user data hosted in Australia** (Sydney)
  - Supabase: `ap-southeast-2`
  - Cloudflare R2: APAC (시드니 우선)
  - Vercel: 시드니 엣지 (자동)
  - Sentry: EU 또는 US (호주 리전 부재 — 다만 PII 최소 전송)

### 5.4 Consent Flow (분양 모델)

- 회원가입 시 동의 항목:
  - ☐ Privacy Policy (필수)
  - ☐ Terms of Service (필수)
  - ☐ Image use consent — "Photos of plants in my plot may be used in service communications and (anonymised) marketing" (선택, 불체크 시 마케팅 사용 금지)
  - ☐ Marketing communications (선택)
- 동의 기록 보관 + 철회 절차 자동화

### 5.5 Required Documents (Phase 9 산출)

- Privacy Policy (en) — APP 준수, 호주 변호사 검토
- Privacy Policy (ko) — 내부 한국 팀용
- Terms of Service (en)
- Subscription Terms (en) — 구독 시 추가 약관, ACL 권리 명시
- Acceptable Use Policy
- Data Processing Agreement (B2B 고객 대비)
- Cookie / Tracking Notice
- Australian Business Number (ABN) 표기 (등록 시)

### 5.6 ACCC Subscription Compliance (Phase 2 시 본격, Phase 1 사전 준비)

- 가격·청구주기·해지 조건 명확 표시
- "원클릭 해지" 가능해야 (어려운 해지 = ACCC 위반)
- 자동갱신 안내 사전 통지
- 환불 정책 (호주 소비자 보장 권리 명시)
- 광고 주장 검증 (예: "100% organic", "pesticide-free" 등 — 검증된 것만)
- 분양 모델은 "lay-by"가 아니라 "subscription service"로 명확히

---

## 6. Time Zone & i18n Architecture

### 6.1 Storage

- 모든 시간 = UTC ISO 8601
- DB column type: `timestamp with time zone`
- API 응답: UTC ISO

### 6.2 Display

- Browser TZ 감지 → 사용자 설정으로 override 가능
- 사용자 설정 우선순위: explicit user setting > browser TZ > Australia/Sydney (default)
- 시뮬레이터 시간 표시는 항상 TZ 약어 같이 (운영 명확성)

### 6.3 Locale Files

```
packages/i18n/
├── locales/
│   ├── en-AU/        # primary
│   │   ├── common.json
│   │   ├── dashboard.json
│   │   ├── scada.json
│   │   ├── subscriber.json
│   │   └── kiosk.json
│   └── ko-KR/        # secondary
│       └── (mirror)
├── index.ts          # i18next config
└── glossary.md       # 본 문서 §2.3 미러
```

### 6.4 Translation Workflow

- 새 UI 문자열 추가 시:
  1. en-AU 키 추가 (영어 원문 작성)
  2. CI에서 ko-KR 누락 키 경고 (차단 아님 — PR 머지 가능)
  3. 1주 내 ko-KR 번역 추가
- 번역 도구: Crowdin / Locize / 자체 — Phase 1엔 자체 + PR 리뷰
- 번역 메모리: glossary.md 우선 적용

### 6.5 UI Language Switcher

- 모든 화면 우상단 (kiosk 모드 제외)
- 토글: EN / 한국어
- 사용자 설정으로 영구 저장
- Subscriber 토큰 링크에 언어 파라미터 포함 가능 (`?lang=en-AU`)

---

## 7. Cultural & Market Positioning

### 7.1 Australian Context for Vertical Farming

- **드라이 컨티넨트** — 물 효율은 핵심 가치. UI/마케팅에서 강조
- **에너지 의식** — 태양광·재생 에너지 친화 (Phase 2+ 마케팅)
- **음식 안전 의식** — pesticide-free / traceability 강조 (인증 시)
- **로컬 푸드** — "Reduced food miles" / "Year-round local supply"
- **호주 CEA 시장 선례**: Stacked Farm, InvertiGro, Sprout Stack, Sundrop Farms
- **유통 채널**: Coles, Woolworths, IGA (소매), Marley Spoon, HelloFresh (구독박스), 레스토랑 직거래

### 7.2 Plot Adoption — 마케팅 어휘 옵션

| 표현                                  | 톤             | 사용 권장                    |
| ------------------------------------- | -------------- | ---------------------------- |
| Plot Adoption                         | 친근, 감성적   | Subscriber-facing UI, 마케팅 |
| Adopt-a-Plot                          | 친근, 캠페인성 | 마케팅 카피                  |
| Plot Subscription                     | 중립, 비즈니스 | 약관·기술 문서               |
| CSA (Community Supported Agriculture) | 업계 표준      | 기존 CSA 사용자 마케팅       |
| Garden Share                          | 친근           | 미스리딩 — 사용 자제         |

**디폴트 권장**: 일반 UI = "Plot Subscription", 마케팅·이메일 = "Adopt-a-Plot"

### 7.3 Messaging Pillars (호주 시장)

1. **Premium quality** — 레스토랑·고급 소매에 어필
2. **Water efficient** — 호주 가치관
3. **Year-round consistency** — 계절 무관 안정 공급
4. **Local & traceable** — paddock-to-plate 트렌드
5. **Tech-forward** — 디지털 트윈 자체가 차별화 (호주 농업 디지털화 초기)

### 7.4 Avoid (호주 컨텍스트에서 부정적/오해)

- 빨간색 단독 강조 (한국에서 좋지만 호주에선 위험 신호)
- 황색·금색 럭셔리 표현 (한국 럭셔리 OK, 호주 SaaS 톤 안 맞음)
- 한자/한글 장식적 사용
- "Made in Korea" 강조 — 호주 농업은 호주산 신뢰. 한국 기술은 별도 신뢰 메시지 필요
- 과한 격식체 (호주는 평등주의 — 너무 formal하면 거리감)
- 슬랭 (호주 슬랭은 호주인만 사용 — 자제)

---

## 8. Operational Implications

### 8.1 Team Communication

- 슬랙·문서 = 영어 우선 (외국인 합류 대비)
- 한국 내부 회의 = 한국어 OK
- 코드·이슈·PR = 영어 only

### 8.2 Customer Support (Phase 2+)

- 영어 지원 시간 — AEST 09:00–17:00 (한국 운영팀 기준 KST 08:00–16:00)
- 한국어 지원은 한국 내부 직원용만
- 응답 시간 SLA — 호주 사용자 평일 24h, 주말 48h
- 채널: 이메일 + 챗 (제3자 도구 도입 시 호주 데이터 거주지 확인)

### 8.3 Demo & Sales (호주 진출 준비)

- 데모는 영어 시나리오 우선 작성 (한국어 버전 별도)
- 데모 영상 영어 자막 (또는 영어 더빙)
- 시연 환경 — 호주 시간대 표시·호주 데이터 사용
- 가격 표 — AUD 우선

### 8.4 Hosting & Domains

- Primary domain: `viafarm.com.au` 또는 `viafarm.au` 또는 `.io` (글로벌)
- 호주 도메인 등록 (.au) — ABN 필요
- 결정 권장: 검토 후 진행

---

## 9. Variance from PLAN/ARCHITECTURE

본 문서가 다른 문서와 충돌 시:

| 항목                   | PLAN.md / ARCHITECTURE.md (이전) | LOCALISATION.md (현재)                |
| ---------------------- | -------------------------------- | ------------------------------------- |
| 기본 언어              | ko primary                       | **en-AU primary**                     |
| 개인정보법             | PIPA                             | **Privacy Act 1988 + APPs**           |
| 데이터 거주지          | 미지정                           | **Sydney (ap-southeast-2)**           |
| 디폴트 TZ              | KST                              | **AEDT/AEST**                         |
| 디자인 톤              | 한국 SaaS                        | **호주/서구 SaaS**                    |
| 작물명 표기            | 버터헤드                         | **Butter Lettuce**                    |
| 분양 어휘              | 분양                             | **Plot Subscription / Plot Adoption** |
| Subscription 약관 검토 | (없음)                           | **ACCC + ACL 준수 필수**              |

PLAN/ARCHITECTURE는 v5에서 본 문서 참조하도록 업데이트.

---

## 10. 변경 이력

- 2026-05-28 v1 — 초안. 호주 시장 진출 결정에 따른 권위 문서 신설.

---

_이 문서는 살아있는 문서. 호주 시장 진출 진행 + 법무 자문 결과에 따라 갱신._
