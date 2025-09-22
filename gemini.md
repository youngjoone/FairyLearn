# 신규 기능: 구독 기반 결제 시스템 도입

## 1. 비즈니스 목표 및 요구사항

- **목표:** 구독 기반의 '프리미엄' 멤버십 모델을 도입하여 서비스의 핵심 기능을 유료화하고, 지속 가능한 수익 모델을 구축한다.
- **구독 모델:** 월간 구독
- **프리미엄 혜택:**
  - [ ] 동화책(그림 포함) AI 생성 기능 이용
  - [ ] 생성한 동화책 10개 이상 보관 가능
- **결제 수단:**
  - [ ] 국내 사용자: 토스페이, 카카오페이, 모든 신용카드 등
  - [ ] 해외 사용자: Visa, Mastercard 등 해외 발급 카드
- **비용 관리 전략 (단계적 접근):**
  - **1단계 (초기):** '공정 이용 정책' 기반의 소프트 리밋으로 운영. 사용자에게는 '무제한'으로 홍보하되, 백엔드에서 사용량을 로깅하여 데이터 수집.
  - **2단계 (안정기):** 수집된 데이터를 바탕으로 합리적인 '월간 생성 쿼터'를 도입하는 것을 고려.

## 2. 기술 전략: 이중 결제 게이트웨이(Dual PG) 도입

- **국내 결제:** **포트원(PortOne, 구 아임포트)**을 연동하여 토스페이, 카카오페이, 국내 카드 등 모든 결제수단을 한 번에 지원.
- **해외 결제:** **스트라이프(Stripe)**를 연동하여 Visa, Mastercard 등 해외 카드 결제를 안정적으로 지원.
- **구현 방식:** 프론트엔드에서 사용자 지역에 따라 적절한 PG 결제창을 호출하고, 백엔드는 두 PG의 API와 웹훅을 모두 처리할 수 있도록 '전략 패턴'을 사용하여 구현.

## 3. 백엔드 개발 계획 (Spring Boot)

- **[ ] 1. DB 스키마 변경:**
  - [ ] `users` 테이블에 구독 상태 관련 컬럼 추가 (`role`을 `ROLE_PREMIUM`으로 활용, `subscription_end_date` 추가).
  - [ ] `payments` 테이블 신규 생성 (결제 이력 추적).
- **[ ] 2. 핵심 권한 체크 로직 구현:**
  - [ ] 동화책 생성(`StorybookService`), 동화 저장(`StoryService`) 등 프리미엄 기능 사용 시, 사용자의 `role` 및 `subscription_end_date`를 확인하는 권한 체크 로직 추가.
- **[ ] 3. 결제 API 및 구독 생애주기 관리 구현:**
  - [ ] `BillingController` 및 `PaymentService` (인터페이스), `PortonePaymentService`, `StripePaymentService` (구현체) 생성.
  - [ ] 결제 요청 API (`POST /api/billing/request`) 구현.
  - [ ] 결제 성공 처리 API (`GET /api/billing/success`) 구현 (서버사이드 검증 포함).
  - [ ] PG 웹훅 수신 API (`POST /api/billing/webhook/portone`, `POST /api/billing/webhook/stripe`) 구현 (자동 갱신 처리).
  - [ ] 구독 만료 사용자 등급을 자동으로 변경하는 스케줄링 작업 (`@Scheduled`) 구현.

## 4. 프론트엔드 개발 계획 (React)

- **[ ] 1. '구독/결제' 페이지 신규 생성:**
  - [ ] 프리미엄 플랜의 혜택과 가격을 안내하는 UI 구현.
  - [ ] 사용자의 지역(또는 통화 선택)에 따라 포트원 또는 스트라이프 결제 버튼을 렌더링.
- **[ ] 2. 결제 연동 로직 구현:**
  - [ ] 결제 버튼 클릭 시 백엔드에 결제 요청 후, 응답에 따라 포트원 또는 스트라이프의 결제창 SDK 호출.
- **[ ] 3. 결제 결과 페이지 구현:**
  - [ ] 결제 성공/실패 시 결과를 안내하는 UI 페이지 생성.

---

# Refresh Token 기반 자동 인증 갱신 기능 보완 계획

## 1. 문제점 분석

- 현재 이메일/패스워드 로그인은 Access/Refresh Token을 모두 발급하지만, **소셜 로그인(Google 등)은 Access Token만 발급**하고 있습니다. (`OAuth2SuccessHandler.java`)
- 이로 인해 소셜 로그인 사용자는 Refresh Token이 없어, Access Token 만료 시 401 에러가 발생하면 자동 갱신(Silent Refresh)에 실패하고 즉시 로그아웃되는 불편함을 겪고 있습니다.
- 프론트엔드의 API 클라이언트(`useApi.ts`)에는 이미 자동 갱신 로직이 구현되어 있으나, Refresh Token이 없으면 무용지물입니다.

## 2. 해결 목표

- 소셜 로그인 시에도 Refresh Token을 정상적으로 발급하고 프론트엔드에 전달하여, 모든 사용자가 Access Token 만료 시 자동 갱신 혜택을 받을 수 있도록 합니다.

## 3. 상세 수정 계획

### Phase 1: Backend - 소셜 로그인 응답 변경

- **File:** `backend/src/main/java/com/fairylearn/backend/auth/OAuth2SuccessHandler.java`
- **Instructions:**
    1.  기존에 Access Token만 생성하던 로직을 수정합니다.
    2.  `jwtProvider.generateToken(user)`으로 Access Token을 생성합니다.
    3.  `jwtProvider.generateRefreshToken(user.getEmail())` (또는 `user.getId()`)으로 Refresh Token을 생성하고, `RefreshTokenEntity`를 만들어 DB에 저장합니다. (`AuthController`의 로직과 동일하게 구현)
    4.  프론트엔드로 리디렉션하는 URL을 수정합니다. 기존에는 `#token=`으로 Access Token만 전달했지만, 이제 두 토큰을 모두 전달해야 합니다. URL 쿼리 파라미터를 사용하는 것이 더 표준적입니다.
    5.  **변경 후 리디렉션 URL 예시:** `https://<frontend-url>/auth/callback?accessToken=<jwt>&refreshToken=<refresh_jwt>`

### Phase 2: Frontend - 소셜 로그인 콜백 처리 수정

- **File:** `frontend/src/pages/AuthCallback.tsx` (이 파일의 존재를 가정하고 계획을 세웁니다.)
- **Instructions:**
    1.  페이지가 로드될 때, URL의 해시(`#`)가 아닌 **쿼리 파라미터(`?`)**에서 `accessToken`과 `refreshToken`을 추출하도록 로직을 수정합니다.
    2.  `URLSearchParams`를 사용하여 `accessToken`과 `refreshToken` 값을 읽어옵니다.
    3.  `lib/auth.ts`에 있는 `setTokens(accessToken, refreshToken)` 함수를 호출하여 두 토큰을 `localStorage`에 저장합니다.
    4.  `AuthContext`의 `login()` 함수를 호출하여 전역 상태를 '로그인'으로 변경하고, 사용자를 홈 페이지로 리디렉션합니다.

## 4. 기대 효과

- 로그인 방식(이메일, 소셜)에 관계없이 모든 사용자가 Refresh Token을 보유하게 됩니다.
- Access Token이 만료되어 API 요청이 401 에러를 반환하더라도, `useApi.ts`의 인터셉터가 Refresh Token을 사용하여 자동으로 새로운 Access Token을 발급받고 요청을 재시도합니다.
- 사용자는 토큰 만료로 인해 갑자기 로그아웃되는 현상 없이, 끊김 없는 서비스 이용이 가능해집니다.
