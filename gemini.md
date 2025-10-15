--- Context from: ../.gemini/GEMINI.md ---
## Gemini Added Memories
- ## 구글 소셜 로그인 기능 추가 (Google Social Login)

### 1. Google Cloud Platform 설정
- [ ] Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
- [ ] **클라이언트 ID** 및 **클라이언트 보안 비밀** 확보
- [ ] 승인된 리디렉션 URI 추가: `http://localhost:8080/login/oauth2/code/google`

### 2. 백엔드 (Spring Boot) 수정
- **파일**: `backend/src/main/resources/application.yml`
  - [ ] `spring.security.oauth2.client.registration.google` 설정 추가 (클라이언트 ID, 보안 비밀 등)
- **파일**: `backend/src/main/java/com/fairylearn/backend/auth/OAuthAttributes.java`
  - [ ] `of()` 메소드에 `google` case 추가하여 구글 사용자 정보 매핑 로직 구현
- **파일**: `backend/src/main/java/com/fairylearn/backend/config/SecurityConfig.java`
  - [ ] `.oauth2Login()` 설정 검토 및 필요시 수정
- **파일**: `backend/src/main/java/com/fairylearn/backend/auth/OAuth2SuccessHandler.java`
  - [ ] 로그인 성공 후 프론트엔드 콜백 URL (`/auth/callback`)로 정상적으로 리디렉션 되는지 확인

### 3. 프론트엔드 (React) 수정
- [ ] **파일**: `frontend/src/pages/Login.tsx`
  - [ ] "Google로 로그인" 버튼 UI 추가
  - [ ] 버튼 클릭 시 백엔드 로그인 URL (`/oauth2/authorization/google`)로 이동하는 링크 구현
- [ ] **파일**: `frontend/src/pages/AuthCallback.tsx`
  - [ ] URL 쿼리 파라미터에서 JWT 토큰 추출하는 로직 구현
  - [ ] 추출한 토큰을 `localStorage`에 저장
- [ ] **파일**: `frontend/src/contexts/AuthContext.tsx`
  - [ ] 토큰 저장 후, 사용자 인증 상태를 전역적으로 업데이트하는 로직 호출

---

# 구글 소셜 로그인 개발 회고 및 재시도 계획

이번 구글 소셜 로그인 개발 과정에서 여러 문제가 발생하여, 원점에서 다시 시작하기로 결정했습니다. 아래는 문제점 요약 및 향후 권장되는 개발 계획입니다.
- FairyLearn 프로젝트 리팩토링 계획: 현재의 순차적 AI 호출 방식을, 1단계로 텍스트 스트리밍을 구현하고 2단계로 그림/음성 생성을 병렬화하는 '실시간 스트리밍 및 병렬 처리' 아키텍처로 변경하는 것을 목표로 함.

## 문제점 요약

1.  **인증 객체 타입 불일치 (`ClassCastException`)**: 구글(OIDC)과 네이버(OAuth2)는 로그인 후 생성하는 Spring Security의 Principal 객체 타입이 다릅니다. 이로 인해 `OAuth2SuccessHandler`에서 객체 변환 예외가 발생했습니다.
2.  **DB 트랜잭션 경합 (`UsernameNotFoundException`)**: 로그인으로 사용자가 DB에 저장되는 트랜잭션이 끝나기 전에, 후속 API 요청에서 해당 사용자를 조회하려다 실패하는 경합 상태가 지속적으로 발생했습니다. `@Transactional` 어노테이션만으로는 해결되지 않았습니다.
3.  **잘못된 리팩토링으로 인한 부작용**:
    *   경합 문제를 해결하기 위해 `JwtAuthFilter`에서 DB 조회를 없애고 Principal을 `String`으로 변경했으나, 컨트롤러는 `User` 객체를 기대하고 있어 `NullPointerException`이 발생했습니다.
    *   `JwtProvider`의 메소드 시그니처를 변경하면서, 기존 `AuthController`의 코드와 호환성이 깨져 컴파일 에러가 발생했습니다.

## 향후 개발 계획 (피드백)

**핵심 전략**: `JwtAuthFilter`가 DB에 접근하지 않도록 하여, 트랜잭션 경합 문제를 원천적으로 차단합니다. 이를 위해 JWT 토큰이 인증에 필요한 모든 정보를 갖도록 합니다.

### 1. JWT 토큰 정보 확장
- 로그인 성공 시 생성되는 JWT 토큰의 Payload에 아래 정보를 필수로 포함시킵니다.
  - **사용자 ID** (예: `userId` claim)
  - **사용자 이메일** (예: `sub` claim)
  - **사용자 역할** (예: `roles` claim)

### 2. 단계별 구현 계획 (재시도)

- **`JwtProvider.java` 수정**:
  - [ ] `generateToken` 메소드가 `User` 객체를 받아, 위 3가지 정보(ID, 이메일, 역할)를 Claim으로 추가하여 토큰을 생성하도록 수정합니다.
  - [ ] 기존 코드와의 호환성을 위해, 이메일(`String`)만 받는 `generateToken` 오버로딩 메소드도 유지합니다.

- **`OAuth2SuccessHandler.java` 수정**:
  - [ ] 로그인 성공 후, `authentication.getPrincipal()`을 통해 얻은 정보로 DB에서 `User` 엔티티를 조회합니다. (이 시점의 DB 조회는 트랜잭션이 완료된 후이므로 안전합니다.)
  - [ ] 조회한 `User` 객체 전체를 위에서 수정한 `jwtProvider.generateToken(user)`에 넘겨 토큰을 생성합니다.

- **`JwtAuthFilter.java` 수정**:
  - [ ] **DB 조회 로직을 완전히 제거합니다.**
  - [ ] 토큰 유효성 검증 후, `jwtProvider`를 통해 토큰에서 `userId`, `email`, `roles` Claim을 직접 추출합니다.
  - [ ] 추출한 정보로 `User` 객체를 **직접 생성**합니다. (DB 조회가 아닌, new 또는 builder 사용)
    - **주의**: `User` 엔티티의 Builder가 `id`를 설정하지 못하므로, `id`를 설정할 수 있는 생성자나 별도의 Setter가 필요할 수 있습니다. 이 부분은 `User` 엔티티 구조 확인 후 진행해야 합니다.
  - [ ] 생성된 `User` 객체를 `UsernamePasswordAuthenticationToken`의 Principal로 설정합니다.

- **`StoryController.java` 및 다른 컨트롤러**:
  - [ ] 기존 코드(롤백된 상태)를 그대로 유지합니다. `@AuthenticationPrincipal User user` 어노테이션이 `JwtAuthFilter`에서 생성한 `User` 객체를 정상적으로 주입받게 됩니다.

이 계획을 따르면, 인증 과정에서 발생하는 모든 DB 경합 문제를 회피하고 안정적이고 효율적인 인증 시스템을 구축할 수 있습니다.
--- End of Context from: ../.gemini/GEMINI.md ---

--- Context from: GEMINI.md ---
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
---

# 대규모 리팩토링: 서비스 모듈 분리 및 LLM 호출 최적화

## 1. 목표
- **관심사 분리**: 단일 클라이언트 구조를 `text`, `image`, `audio` 기능별 서비스로 분리하여 코드의 결합도를 낮추고 유지보수성을 향상시킵니다.
- **성능 및 비용 최적화**: 동화 텍스트 생성과 오디오 읽기 계획 생성을 하나의 LLM 호출로 통합하여, API 호출 횟수를 2회에서 1회로 줄입니다.

## 2. 신규 아키텍처
- `ai-python/service/text_service.py`: **(LLM 호출 O)** 텍스트 생성 및 **오디오 읽기 계획 생성** 전담
- `ai-python/service/image_service.py`: **(LLM 호출 O)** 이미지 생성 전담
- `ai-python/service/audio_service.py`: **(LLM 호출 X)** 미리 생성된 계획에 따라 TTS만 수행

## 3. 단계별 실행 계획

### 1단계: 스키마 및 프롬프트 통합 수정
- [ ] **`schemas.py` 수정**: `GenerateResponse` 또는 `StoryOutput` Pydantic 모델에 `reading_plan: List[dict]` 와 같은 필드를 추가하여, 텍스트 생성 결과에 오디오 계획이 포함될 수 있는 구조를 마련합니다.
- [ ] **프롬프트 수정**: `text_service.py`에서 사용할 프롬프트를 수정하여, Gemini(또는 OpenAI)가 동화 텍스트와 **동시에** 오디오 읽기 계획(세그먼트, 화자, 감정 등)을 함께 생성하도록 요청합니다. JSON 출력 스키마에 대한 설명도 이 변경사항을 반영하여 업데이트합니다.

### 2단계: `text_service.py` 구현
- [ ] `ai-python/service/text_service.py` 파일을 생성합니다.
- [ ] 1단계에서 수정한 통합 프롬프트를 사용하여 LLM을 호출하고, 동화 텍스트와 오디오 읽기 계획이 모두 포함된 단일 JSON 응답을 받는 `generate_story_with_plan(req, id)` 함수를 구현합니다.
- [ ] 이 함수는 내부적으로 `Config.LLM_PROVIDER` 설정에 따라 Gemini 또는 OpenAI를 선택하여 호출합니다.
- [ ] `main.py`의 `/ai/generate` 엔드포인트가 이 새로운 함수를 호출하도록 수정하고, 반환된 결과(텍스트 + 오디오 계획)를 Spring Boot 백엔드로 전달하도록 합니다.

### 3단계: `audio_service.py` 구현 (LLM 호출 제거)
- [ ] `ai-python/service/audio_service.py` 파일을 생성합니다.
- [ ] 이 서비스는 더 이상 LLM을 호출하지 않으므로, `plan_reading_segments`와 같은 함수는 **삭제**합니다.
- [ ] `synthesize_story_from_plan(plan: List[dict])`과 같은 함수를 구현합니다. 이 함수는 인자로 '오디오 읽기 계획'을 직접 받아, Azure TTS 또는 OpenAI TTS를 통해 오디오 파일을 합성하는 역할만 수행합니다.
- [ ] `main.py`의 `/ai/generate-audio` 엔드포인트가 이 함수를 호출하도록 수정합니다. 이 때, 요청 본문(request body)에 오디오 계획 데이터가 포함되어야 합니다.

### 4단계: `image_service.py` 구현
- [ ] `ai-python/service/image_service.py` 파일을 생성합니다.
- [ ] 기존 `openai_client.py`의 이미지 생성 로직을 이 파일로 이전하고, `generate_image(req, id)` 함수를 구현합니다.
- [ ] `main.py`의 `/ai/generate-image` 엔드포인트가 이 함수를 호출하도록 수정합니다.

### 5단계: 기존 클라이언트 파일 정리
- [ ] 모든 기능이 각 서비스 파일로 성공적으로 이전된 것을 확인한 후, 더 이상 필요 없어진 `openai_client.py`와 `gemini_client.py` 파일을 삭제하여 리팩토링을 완료합니다.

### 6단계: ImagenImageProvider 구현 및 연동
- **목표**: Google의 `Imagen` 모델을 사용하여 이미지 생성을 정상적으로 처리하고, `config.py` 설정을 통해 OpenAI의 `DALL-E`와 쉽게 전환할 수 있도록 구현합니다.
- **세부 작업**:
  - [ ] **`image_providers.py` 수정**:
    - `Imagen` 모델의 Vertex AI 엔드포인트를 호출하는 새로운 `ImagenImageProvider` 클래스를 구현합니다.
    - 이 클래스는 `Imagen` API의 요청/응답 JSON 구조에 맞게 데이터를 처리합니다.
  - [ ] **`image_service.py` 수정**:
    - `USE_GEMINI_IMAGE` 설정이 `True`일 때, 기존 `GeminiImageProvider` 대신 새로 만든 `ImagenImageProvider`를 사용하도록 로직을 수정합니다.
  - [ ] **`config.py` 수정**:
    - `DEFAULT_USE_GEMINI_IMAGE` 값을 다시 `True`로 되돌려, 기본적으로 `Imagen` 모델을 사용하도록 설정을 복원합니다.

---

# 신규 아키텍처: 페이지별 에셋(이미지/오디오) 생성 시스템

## 1. 목표
- **사용자 경험(UX) 향상:** 전체 동화 생성을 기다릴 필요 없이, 페이지 단위로 이미지와 오디오를 즉시 생성하고 소비하여 사용자의 대기 시간을 최소화합니다.
- **품질 유지 및 개선:** 페이지별 오디오 생성으로 API 제약(예: Azure TTS 50 세그먼트 제한)을 회피하고, 더욱 상세하고 표현력 풍부한 '오디오 연출 계획(`reading_plan`)'을 적용하여 오디오 품질을 극대화합니다.
- **시스템 안정성 확보:** 자원 소모가 큰 전체 동화 단위의 작업을 페이지 단위의 작은 작업으로 분산하여 시스템 부하를 줄이고 안정성을 높입니다.

## 2. 핵심 요구사항
- 각 페이지의 오디오는 단순한 텍스트 읽기를 넘어, 문맥에 맞는 감정과 화자(캐릭터)의 목소리 톤을 반영하여 사람이 직접 읽어주는 듯한 높은 품질을 유지해야 합니다.

## 3. 구현 계획

### 1단계: 데이터베이스 및 백엔드(Spring Boot) 수정
- **[ ] DB 스키마 변경:**
  - `StoryPage` 엔티티(`StoryPage.java`)에 `audioUrl` 및 `imageUrl` 컬럼을 추가합니다.
  - 신규 마이그레이션 스크립트(예: `V24__add_assets_to_story_pages.sql`)를 작성하여 `story_pages` 테이블에 `audio_url`, `image_url` 컬럼을 추가합니다.
  - `stories` 테이블의 `full_audio_url`, `reading_plan` 등 이제는 필요 없어진 컬럼을 제거하는 마이그레이션을 진행합니다.
- **[ ] 신규 API 엔드포인트 생성:**
  - `StoryController.java`에 특정 페이지의 에셋(이미지, 오디오)을 생성하고 조회하는 API를 구현합니다.
  - **엔드포인트 예시:** `POST /api/stories/{storyId}/pages/{pageNo}/assets`
- **[ ] `StoryService.java` 로직 수정:**
  - `generateAssetsForPage(storyId, pageNo)`와 같은 신규 서비스 메소드를 구현합니다.
  - **로직 상세:**
    1. `storyId`와 `pageNo`로 `StoryPage` 엔티티를 조회합니다.
    2. 페이지 텍스트, 캐릭터 정보 등을 `ai-python` 서비스의 신규 API(아래 참고)로 전달하여 이미지와 오디오 생성을 동시에 요청합니다.
    3. 응답으로 받은 `imageUrl`과 `audioUrl`을 `StoryPage` 엔티티에 업데이트하고 저장합니다.

### 2단계: AI 서비스(Python) 수정
- **[ ] 신규 통합 API 엔드포인트 생성:**
  - `main.py`에 페이지 단위 에셋 생성을 위한 `POST /ai/generate-page-assets` API를 구현합니다.
  - **요청 본문:** `{ "text": "페이지 텍스트", "characters": [...], "art_style": "..." }`
- **[ ] 병렬 처리 로직 구현:**
  - 해당 엔드포인트는 `asyncio.gather`를 사용하여 `image_service.generate_image`와 `audio_service.plan_and_synthesize_audio`를 **병렬로 동시 호출**하여 처리 시간을 단축합니다.
  - `audio_service.py`에는 페이지 텍스트를 받아 `reading_plan` 생성과 TTS 합성을 순차적으로 처리하는 `plan_and_synthesize_audio` 헬퍼 함수를 구현합니다.
  - **응답:** `{ "imageUrl": "...", "audioUrl": "..." }` 형태로 두 결과물의 URL을 함께 반환합니다.

### 3단계: 프론트엔드(React) 수정
- **[ ] UI/UX 변경:**
  - 동화책을 보는 `StorybookView.tsx`와 같은 컴포넌트에서, 전체 동화를 읽는 버튼을 제거합니다.
  - 대신 각 페이지 내부에 '이 페이지 듣기' (재생/정지) 버튼과 이미지를 표시할 영역을 마련합니다.
- **[ ] API 호출 로직 변경:**
  - 사용자가 페이지를 넘길 때, 해당 페이지의 `imageUrl`과 `audioUrl`이 있는지 확인합니다.
  - 정보가 없다면, 로딩 상태를 표시하고 백엔드의 신규 API(`.../assets`)를 호출하여 생성을 요청합니다.
  - API 응답으로 URL들을 받으면, 상태를 업데이트하여 이미지와 오디오 플레이어를 렌더링합니다.

---
### 신규 기능: 캐릭터 일관성 강화 (전략 2)

**목표:** 사용자가 선택한 캐릭터가 동화책의 모든 페이지에서 일관된 모습으로 표현되도록 이미지 생성 시스템을 개선합니다. `../testchardir/`에 있는 캐릭터 이미지 파일을 활용합니다.

**1. DB 스키마 변경 (Backend - Spring Boot)**
*   **`Character` 엔티티 확장**: `Character` 엔티티(또는 관련 테이블)에 다음 필드를 추가합니다.
    *   `image_url` (String): 캐릭터의 대표 이미지 URL 또는 경로. (현재는 `../testchardir/` 경로를 사용하지만, 실제 서비스에서는 S3 등 스토리지 URL이 될 것임)
    *   `visual_description` (Text): 캐릭터의 외형적 특징을 상세하게 묘사하는 텍스트 프롬프트. (예: "A brave rabbit with long floppy ears, wearing a small blue vest, and carrying a tiny wooden sword.")
*   **마이그레이션 스크립트 생성**: `VXX__add_character_image_and_description.sql` (h2 및 postgres) 스크립트를 생성하여 `characters` 테이블에 `image_url` 및 `visual_description` 컬럼을 추가합니다.

**2. 백엔드 로직 수정 (Spring Boot)**
*   **`CharacterService`**: 캐릭터 정보를 조회할 때 `image_url`과 `visual_description`을 함께 반환하도록 수정합니다.
*   **`StoryService`**:
    *   `generateAssetsForPage(storyId, pageNo)` 메소드에서, 해당 동화에 선택된 캐릭터의 `image_url`과 `visual_description`을 조회합니다.
    *   이 정보를 `ai-python` 서비스의 `generate-page-assets` API 호출 시 요청 본문에 포함하여 전달합니다.
    *   **요청 본문 예시**:
        ```json
        {
            "text": "페이지 텍스트",
            "art_style": "...",
            "character_visuals": [
                {
                    "name": "lulu-rabbit",
                    "visual_description": "A brave rabbit with long floppy ears, wearing a small blue vest, and carrying a tiny wooden sword.",
                    "image_url": "file:///Users/kyj/find-me2/testchardir/lulu-rabbit.png" // 또는 base64 인코딩된 이미지 데이터
                }
            ]
        }
        ```

**3. AI 서비스 수정 (Python)**
*   **`schemas.py` 수정**:
    *   `CharacterVisual` Pydantic 모델에 `image_url: Optional[str]` 필드를 추가합니다.
    *   `GeneratePageAssetsRequest` (가칭) 모델에 `character_visuals: Optional[List[CharacterVisual]]` 필드를 포함합니다.
*   **`main.py` 엔드포인트 수정**:
    *   `POST /ai/generate-page-assets` 엔드포인트가 `character_visuals`를 요청 본문으로 받을 수 있도록 수정합니다.
    *   받은 `character_visuals` 데이터를 `image_service.generate_image` 함수로 전달합니다.
*   **`image_service.py` 수정**:
    *   `generate_image` 함수가 `character_visuals` 리스트를 받으면, 각 캐릭터의 `visual_description`을 프롬프트에 포함시킵니다.
    *   **참조 이미지 활용 로직 추가**:
        *   `GeminiImageProvider` (Imagen)가 이미지 프롬프팅을 지원하는지 확인합니다. (Vertex AI Imagen은 이미지 프롬프팅을 지원합니다.)
        *   만약 지원한다면, `character_visuals`의 `image_url`을 읽어와 이미지 프롬프트로 활용하는 로직을 `GeminiImageProvider` 내부에 구현합니다.
        *   `image_url`이 로컬 파일 경로일 경우, 해당 파일을 읽어 base64로 인코딩하여 모델에 전달해야 합니다. (실제 서비스에서는 S3 URL을 직접 전달할 수 있도록 변경될 수 있음)
        *   **주의**: 현재 `image_service.py`는 `character_images`를 `CharacterProfile` 객체 리스트로 받는데, 이 구조를 `CharacterVisual`로 통일하거나, `CharacterProfile`에 `image_url` 필드를 추가하는 것을 고려합니다. (현재 `CharacterVisual`이 더 적합해 보임)

**4. 프론트엔드 수정 (React)**
*   **캐릭터 선택 시 정보 전달**: 사용자가 캐릭터를 선택하면, 해당 캐릭터의 `image_url`과 `visual_description`을 백엔드 API 호출 시 함께 전달하도록 로직을 수정합니다.