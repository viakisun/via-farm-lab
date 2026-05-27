# VIAFARM Reinfa Platform — 아키텍처 비전

> "VIAFARM이 만드는 스마트팜 플랫폼"의 장기 비전 문서.
> Primary market = **Australia**. Default language = **English (en-AU)**.
> 시제품(파일럿) 운영 시점엔 디지털 트윈이 가장 가시적이지만, 그 아래 데이터·계약·CV 레이어가 사업 차별화의 본체.
>
> 호주 시장·언어·디자인·법무 세부 결정 = [LOCALISATION.md](LOCALISATION.md) (우선)
> 단기 실행 계획 = [PLAN.md](PLAN.md) (v5)

작성: 2026-05-28 · 김순 (대표, viasoft.ai) · v1.1 (호주 컨텍스트 보강)

---

## 1. 한 줄 정의

> **VIAFARM Reinfa Platform = 농업판 ISA-95 스마트팩토리 + 비정형 생육 데이터 차별화 + 분양 비즈니스 모델**

스마트팩토리 레퍼런스를 그대로 농업으로 가져오되, 농업의 본질적 차이(비정형 생육 데이터·긴 피드백 루프·생물학적 변이) 위에 새로운 비즈니스 레이어(분양 구독 모델)를 얹는다.

---

## 2. ISA-95 매핑

| 레벨 | 스마트팩토리 표준 | VIAFARM Reinfa 구현 | 담당/상태 |
|---|---|---|---|
| **L0** 현장 디바이스 | 센서·액추에이터·모터 | EC/pH/온습도/CO2/광량 센서, 도징펌프, LED, 솔레노이드 밸브, 가습 노즐 | 하드웨어 |
| **L1** 기초 제어 | PLC·RTU·DCS | PLC + 도징 컨트롤러 + LED 컨트롤러 | Backend 팀 |
| **L2** 감시 제어 | SCADA·HMI·Historian | **본 프로젝트 SCADA 뷰** + Backend 시계열 (Historian 역할) | Twin + Backend |
| **L3** 운영 (MES) | 작업지시·배치·QC | Console — 작물·레시피·정식·수확·청소 일정 | 운영팀 |
| **L3.5** ★ 품질·생육 | QMS (정형 측정) | **Growth Analysis — CV·ML 비정형 데이터** | Robot Ops (확장) |
| **L4** 비즈니스 (ERP) | 주문·재고·BOM·CRM | **Subscription — 분양 계약·고객·구독·배송·청구** | 사업개발 (신규) |
| **L5** BI / 데이터 플랫폼 | 분석·예측·R&D | 멀티팜 분석·재배 R&D·품종 비교·LLM 컨설팅 | 미래 |

L3.5와 L4가 우리의 차별화 영역.

---

## 3. 차별화 — 비정형 생육 데이터의 6가지 본질적 어려움

스마트팩토리 도구를 그대로 가져오면 안 되는 이유.

### 3.1 긴 피드백 루프
- 센서 → 밸브: ms 단위
- 정식 → 수확: weeks 단위
- 같은 시스템에 두 시간 스케일의 제어 호라이즌이 공존. 일반 SCADA는 짧은 루프만 가정.

### 3.2 생물학적 변이
- 동일 씨앗·동일 레시피·동일 환경에서도 식물 개체별로 다른 성장.
- 결정론적 프로그래밍 불가. 확률·통계 기반 의사결정 필요.
- ex) "이 작물의 평균 EC가 1.8이라 좋다"가 아니라 "베드 내 EC 분포가 1.5–2.1 범위라 균질하다" 같은 식의 측정.

### 3.3 비정형 측정 (CV/ML 필수)
- 잎 색·형상·자세·캐노피 면적·줄기 두께·병해 흔적 — 이미지에서 추출.
- 측정 자체가 별도의 ML 파이프라인. 모델 학습·재학습·라벨링 운영이 시스템의 일부.
- 단일 측정값이 아닌 confidence interval로 다뤄야 함.

### 3.4 주관적 품질
- "프리미엄 양상추"의 정의가 시장·고객·계절에 따라 다름.
- 라벨링 데이터셋이 필요하고, 인간 검수(HITL)가 운영 사이클의 일부.
- 분양 모델에선 "내가 좋아하는 모양"이 사용자별로 다를 수 있음.

### 3.5 복합 상태 상호작용
- 물·양분·빛·CO2·온도·미생물·유전형이 모두 결합 작용.
- 단일 변수 제어로 단일 결과 보장 불가.
- 디지털 트윈에서 변수 토글 시 즉각 효과 대신 "예측 범위" 표시가 더 정직.

### 3.6 개체 추적의 어려움
- 공장에선 모든 part에 시리얼. 추적 완벽.
- 식물은 가려짐·성장·잎 떨어짐·수확으로 plant-level 추적이 항상 손상됨.
- **분양 모델에서 특히 중요** — "이 사진이 정말 내 식물인가"를 보장하려면 plot(고정 위치) 기반으로 식별. 개체가 아니라 위치 단위.

---

## 4. 도메인 모델 (Plot이 first-class entity)

```
Farm
└── Site (지점, 멀티팜 확장 대비)
    └── Room (A/B 등 공간)
        └── Rack (3단, 1800×2900)
            └── Bed (랙 1단)
                └── Plot ★ (분양 단위, 4~8셀)
                    └── Plant (개체, 가능한 범위에서)

Crop (작물 마스터)
└── Recipe (작물별 양액·환경 셋포인트)
└── GrowthModel (작물별 성장 단계·예상 일정)

Customer
└── Contract
    └── PlotAssignment[] (계약된 plot들, 기간)

Scan (Robot Ops)
└── ScanImage
└── Measurement[] (plot_id, canopy_area, height, color_index, anomalies[])

GrowthReport (Subscription에서 생성)
├── period (week/month)
├── plot_id, contract_id, customer_id
├── selected_photos[] (best of period)
├── measurements_summary
├── growth_curve
└── delivery_status (email/Kakao/app push)
```

**Plot의 핵심 속성**:
- 위치 고정 (랙·베드·셀 인덱스)
- 분양 가능 단위 (4셀 / 8셀 / 1bed 전체 등 모델 다양화 가능)
- 한 plot 안의 식물은 같은 작물·같은 정식일 (운영 단순화)
- 계약 없는 plot = 회사 내부용 / R&D / 데모

---

## 5. 시스템 컨텍스트 (확장판, 6시스템)

```
                ┌─────────────────────────────────────┐
                │       Customer Portal (구독자용)     │
                │  - 내 plot 3D 뷰 / 성장 사진 / 알림  │
                │  - Digital Twin의 subscriber mode    │
                └─────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────┐
│         Digital Twin (대표 소유 / 본 프로젝트)            │
│   3D Realistic ⇄ SCADA HMI                              │
│   페르소나: operator / subscriber / visitor             │
└─────────────────────────────────────────────────────────┘
        ↑           ↑           ↑          ↑          ↑
   ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐
   │Console │ │ Backend │ │Robot Ops │ │Subscription│ │  Growth  │
   │(운영팀)│ │(개발팀) │ │(로봇팀)  │ │(사업개발)  │ │ Analysis │
   │        │ │         │ │          │ │            │ │(CV/ML팀) │
   │L3 MES  │ │L1-L2    │ │L3.5 측정 │ │L4 ERP      │ │L3.5 분석 │
   └────────┘ └─────────┘ └──────────┘ └────────────┘ └──────────┘
```

**6개 시스템 합의 사항**:
1. 각 시스템은 OpenAPI 3.1 계약을 갖는다.
2. 시스템 간 직접 호출 금지. 모두 자기 API만 노출.
3. 데이터 일관성은 도메인 키(plot_id, contract_id, scan_id)로 유지. 분산 트랜잭션 없음.
4. 이벤트는 시스템 내 publish, 다른 시스템은 pull 또는 webhook 구독.

---

## 6. 외부 API 추가 (PLAN v2 §2에 더해)

### 6.1 Subscription API (`/subscription/v1`) — 신규
```
GET  /customers
GET  /customers/{id}
GET  /contracts?customer&status&from&to
GET  /contracts/{id}                # plots, period, plan, preferences
POST /contracts
GET  /plots                         # 전체 plot + assignment 상태
GET  /plots/{id}/assignment         # 현재 계약·고객 (없으면 null = 회사 내부)
POST /plots/{id}/assign             # 계약에 plot 할당
GET  /reports/contracts/{id}        # 발송된 성장 리포트 목록
POST /reports/preview               # 리포트 미리보기 생성
```

### 6.2 Growth Analysis API (`/growth/v1`) — 신규
```
GET  /scans/{id}/measurements       # plot별 측정값
GET  /plots/{id}/timeline           # plot의 시간순 측정·이미지
GET  /plots/{id}/photos?best=N      # 큐레이션된 best 사진
GET  /anomalies?from&to&severity    # 검출된 이상 (병해·영양결핍 등)
POST /labels                        # HITL 라벨링 (관리자)
GET  /models                        # 사용 중인 CV 모델 목록·버전
```

이 두 API는 PLAN v2에 stub만 (`apps/twin-bff`에서 mock 응답). 본격 구현은 별도 프로젝트.

---

## 7. 디지털 트윈의 페르소나 시스템

같은 디지털 트윈, 다른 청중·다른 권한·다른 UX.

| 페르소나 | 진입 | 권한 | 핵심 화면 |
|---|---|---|---|
| **Visitor** (방문객/바이어) | 키오스크 | Read-only 전체 뷰, 제어 없음 | 시네마 투어, 어트랙트 모드, 자랑할 만한 데이터 |
| **Operator** (운영자) | 로그인 | 풀 권한, 명령 전송, 알람 ack | SCADA + 알람 + 양액기 상세 + 일정 |
| **Subscriber** (구독자) | 토큰 링크 (이메일/카톡) | 자기 plot만 보임, 다른 plot 익명화 | 내 식물 3D 강조, 성장 사진 갤러리, 예상 수확일 |
| **Researcher** (R&D) | 로그인 | 시계열 raw, 실험 메타, 비교 모드 | 실험군 vs 대조군 분할 뷰, 통계 |
| **Admin** (대표/관리자) | 로그인 | 전체 + 시스템 헬스 + 설정 | 모드 토글, 시나리오 편집, 사용자 관리 |

페르소나는 URL/토큰으로 진입, BFF가 해당 페르소나에 맞게 데이터 필터링·UI 토글 결정.

---

## 8. 플랫폼 확장 5축

| 축 | 확장 시나리오 | 지금 준비할 것 | 나중에 할 것 |
|---|---|---|---|
| **Multi-farm** | 부산점·도쿄점 추가 | API 경로에 `farm_id`/`site_id`, BFF에 `tenant_id` 헤더 | 멀티 테넌트 인증·DB 분리 |
| **Multi-crop** | 토마토·딸기·인삼 | Crop 마스터(Console), 식물 모델 plug-in 인터페이스 | 작물별 GrowthModel 정교화 |
| **Multi-vendor** | 다른 PLC/센서/도징펌프 | Backend가 어댑터 패턴, 디지털 트윈은 표준 API만 봄 | 벤더 인증·SLA |
| **Multi-channel** | 운영·구독·바이어·규제기관 | Persona 시스템 (위 §7), role-based scope | OAuth2/OIDC 통합 |
| **Multi-mode** | 상업·R&D·교육·데모 | 시드 시나리오 모드별 분리, 디지털 트윈 mode 파라미터 | 실험 설계 도구 |

---

## 9. 우리가 지금 의도적으로 안 하는 것 (현 단계)

- ❌ 자체 인증/유저 시스템 — 외부 IdP에 위임 예정 (Auth0/Cognito/자체 SSO 중 결정)
- ❌ 결제·청구 시스템 — Subscription API 단계에서 정의만, 실 구현은 외부 PG 연동
- ❌ 알림 발송 인프라 — Subscription API가 webhook 발송, 실제 채널(이메일/카톡)은 별도 서비스
- ❌ CV 모델 학습 인프라 — Growth Analysis 별도 프로젝트
- ❌ 멀티 테넌트 격리 — 1개 팜 가정. 2팜 확정 시점에 elevation
- ❌ 모바일 네이티브 앱 — 웹(반응형)으로 시작, 필요 시 PWA → 네이티브

이건 "안 한다"가 아니라 "지금은 안 한다" — 나중에 들어올 자리를 비워둔다.

---

## 10. 디지털 트윈이 플랫폼에 기여하는 고유 가치

다른 5개 시스템이 다 있어도 디지털 트윈이 없으면 못 하는 것:

1. **시각적 통합 데모** — 4팀 데이터를 한 화면에 보여줘서 "이게 우리 시스템이다"를 1분 만에 설득
2. **공간 컨텍스트** — 알람·측정값을 위치 기반으로 즉시 이해 ("3번 랙 2단에 이상")
3. **구독자에게 단순 사진을 넘어 공간 경험 제공** — 분양 차별화의 핵심
4. **운영자 훈련** — 실 시스템 만지기 전 시뮬레이션
5. **R&D 시각화** — 실험 조건 비교·과거 시점 재생
6. **현장 안가도 보고 가능** — 임원·바이어·투자자가 어디서나 접근

이게 명확해야 디지털 트윈에 투자하는 이유가 정당화됨. 단순 "이쁘니까"가 아니라 위 6가지가 비즈니스 가치.

---

## 11. 로드맵 (대략)

| Phase | 기간 | 산출물 |
|---|---|---|
| **Phase 1** — 디지털 트윈 코어 | 5–6주 (현재 PLAN.md) | 30 PR. operator/visitor 페르소나 동작. mock subscription/growth API stub |
| **Phase 2** — Subscription 실 구현 | 6–8주 | Customer/Contract DB, plot 할당, 리포트 생성·발송. Subscriber 페르소나 풀 동작 |
| **Phase 3** — Growth Analysis 실 구현 | 8–12주 | CV 파이프라인, 이상 검출, 라벨링 도구, 모델 운영 |
| **Phase 4** — 멀티팜 / Researcher | 4–6주 | site_id·tenant_id 도입, R&D 모드 |
| **Phase 5** — 모바일 PWA + 알림 | 4주 | 구독자 모바일 경험 완성 |
| Phase 6+ | TBD | L5 BI, 멀티벤더 어댑터, 글로벌 |

---

## 12. 변경 이력

- 2026-05-28 v1 — 초안. ISA-95 매핑, 6시스템 구조, Plot 데이터모델, 5축 확장, 5페르소나, 로드맵 6단계.

---

*이 문서는 살아있는 문서. 시스템 합의 사항이 변하면 PR로 수정.*
