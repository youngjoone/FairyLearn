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
- FairyLearn 프로젝트 리팩토링 계획: 현재의 순차적 AI 호출 방식을, 1단계로 텍스트 스트리밍을 구현하고 2단계로 **이미지 생성 중심의 병렬 처리** 아키텍처로 변경한다. (음성 생성은 추후 버튼 기반 별도 흐름으로 설계)

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
- [ ] **`schemas.py` 수정**: `GenerateResponse` 또는 `StoryOutput` Pydantic 모델에 `reading_plan: List[dict]` 와 같은 필드를 추가하여, 텍스트 생성 결과에 오디오 계획이 포함될 수 있는 구조를 마련합니다. *(보류: 리딩 플랜은 향후 오디오 합성 단계에서 별도로 생성하도록 변경됨)*
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
- **품질 유지 및 개선:** 페이지별 이미지가 먼저 제공되도록 하고, 오디오 생성은 추후 버튼 기반으로 호출해 별도의 `reading_plan`을 생성하도록 한다. (현재 단계에서는 이미지 품질·일관성 확보와 병렬화에 집중)
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
  - `StoryController.java`에 특정 페이지의 에셋(이미지 위주, 필요 시 오디오는 별도 트리거) 생성/조회 API를 구현합니다.
  - **엔드포인트 예시:** `POST /api/stories/{storyId}/pages/{pageNo}/assets`
- **[ ] `StoryService.java` 로직 수정:**
  - `generateAssetsForPage(storyId, pageNo)`와 같은 신규 서비스 메소드를 구현합니다.
  - **로직 상세:**
    1. `storyId`와 `pageNo`로 `StoryPage` 엔티티를 조회합니다.
    2. 페이지 텍스트, 캐릭터 정보 등을 `ai-python` 서비스의 신규 API(아래 참고)로 전달하여 **이미지를 우선 생성**합니다. (오디오는 별도 사용자 요청 시 수행)
    3. 응답으로 받은 `imageUrl`을 `StoryPage` 엔티티에 업데이트하고 저장합니다. 오디오가 필요한 경우에는 별도의 API를 통해 생성·저장합니다.

#### 병렬화 전략 (Spring Boot)
- `StorybookService.generateRemainingImages`는 `CompletableFuture` 또는 Reactor `Flux`를 이용해 여러 페이지 요청을 동시에 전송하도록 리팩터링합니다.
- 고정 크기의 `Executor`(예: 4~6개 스레드)를 주입해 과도한 동시 호출을 방지하고, `CompletableFuture.allOf(...).join()`으로 완료를 대기합니다.
- 각 비동기 작업은 독립 트랜잭션(`@Transactional(propagation = REQUIRES_NEW)`)으로 페이지 저장을 처리하고, 실패한 페이지는 재시도/로깅 정책을 명시합니다.

### 2단계: AI 서비스(Python) 수정
- **[ ] 신규 통합 API 엔드포인트 생성:**
  - `main.py`에 페이지 단위 에셋 생성을 위한 `POST /ai/generate-page-assets` API를 구현합니다.
  - **요청 본문:** `{ "text": "페이지 텍스트", "characters": [...], "art_style": "..." }`
- **[ ] 병렬 처리 로직 구현:**
  - 해당 엔드포인트는 **이미지 생성을 중심으로 하되**, 향후 필요 시 오디오 요청을 함께 받으면 `asyncio.gather`로 결합할 수 있도록 구조화합니다.
  - 기본 응답은 `{ "imageUrl": "...", "imageMetadata": { ... } }` 형태로 이미지 관련 정보만 반환하고, 오디오는 별도 버튼/엔드포인트로 처리합니다.

### 3단계: 프론트엔드(React) 수정
- **[ ] UI/UX 변경:**
  - 동화책을 보는 `StorybookView.tsx`와 같은 컴포넌트에서, 전체 동화를 읽는 버튼을 제거합니다.
  - 대신 각 페이지 내부에 '이 페이지 듣기' (재생/정지) 버튼과 이미지를 표시할 영역을 마련합니다.
- **[ ] API 호출 로직 변경:**
  - 사용자가 페이지를 넘길 때, 해당 페이지의 `imageUrl`이 있는지 확인합니다.
  - 정보가 없다면 로딩 상태를 표시하고 백엔드의 신규 API(`.../assets`)를 호출하여 이미지를 요청합니다.
  - 응답으로 받은 `imageUrl`을 상태에 반영해 이미지를 렌더링합니다. 오디오 생성 버튼은 별도 API(`/stories/{id}/audio` 등)를 호출하도록 유지합니다.

---
### 신규 기능: 캐릭터 일관성 강화 – 최종 실행 계획 (최종 수정)

**최종 목표:** 동화책 생성 중 **예상치 못한 새 캐릭터가 등장**하면, 그 캐릭터의 **참조 이미지를 동적으로 생성(모델링)**하고, 이후 모든 페이지에서 그 캐릭터의 **외형 일관성을 유지**한다. 이 모든 과정은 **병렬 처리**를 통해 사용자 경험을 해치지 않도록 빠르게 동작해야 한다.

#### 1. 데이터베이스 (DB) 수정
*   **`characters` 테이블 확장:**
    *   `image_url` (String): 캐릭터의 참조 이미지 URL (GCS/S3 등).
    *   `visual_description` (Text): 캐릭터의 외형적 특징을 상세하게 묘사하는 텍스트 프롬프트.
    *   **정책:** 두 필드 모두 `NULL`을 허용합니다. 캐릭터가 처음 DB에 등록될 때는 이 값들이 비어있을 수 있기 때문입니다. 서비스 로직에서 `null`일 경우의 기본 동작을 정의합니다.
    *   `modeling_status` (String, e.g., `PENDING`, `COMPLETED`, `FAILED`): 새 캐릭터의 참조 이미지 생성 상태를 추적합니다.

#### 2. 백엔드 (Spring Boot) 로직: '캐릭터 모델링 큐' 구현
*   **`StoryService` 로직 강화:**
    1.  AI가 동화 텍스트를 생성하면, 백엔드는 텍스트에 등장하는 캐릭터 이름(슬러그) 목록을 추출합니다.
        *   **새 캐릭터 판별 방법:** LLM의 출력 스키마에 캐릭터 목록과 각 캐릭터의 `visual_description`을 포함하도록 프롬프트를 설계하는 것을 우선합니다. LLM이 제공한 정보를 기반으로 캐릭터를 판별합니다. LLM의 텍스트 생성 단계 계획(예: `ai-python/service/text_service.py`의 프롬프트 및 스키마)과 동기화하여 캐릭터 목록 및 `visual_description`을 확보하는 방식을 구체화합니다.
    2.  각 캐릭터 이름에 대해 DB의 `characters` 테이블을 조회합니다.
    3.  DB에 없는 **신규 캐릭터**가 발견되면:
        a. `characters` 테이블에 새 레코드를 생성합니다 (`name`만 있고 `image_url`, `visual_description` 등은 `null`, `modeling_status`는 `PENDING`).
            *   **`visual_description` 기본값:** LLM이 제공하지 않을 경우, 캐릭터 이름 기반의 일반적인 묘사(예: "A [character_name] in the story")를 기본값으로 사용합니다.
        b. **비동기 이벤트(Asynchronous Event)를 발행**합니다. (예: Spring의 `@Async` 또는 RabbitMQ/Kafka 같은 메시지 큐 사용) 이 이벤트는 '신규 캐릭터 모델링 요청'을 의미합니다.

*   **`CharacterModelingService` (신규 서비스):**
    *   위에서 발행된 비동기 이벤트를 수신하여 처리합니다.
    *   **중복 이벤트 방지:** 이벤트를 처리하기 전에 해당 캐릭터의 `modeling_status`가 이미 `PENDING` 또는 `COMPLETED`인지 확인하여 중복 모델링 요청을 방지합니다. (DB에 캐릭터 이름에 대한 `UNIQUE` 제약 조건 추가 고려)
    *   AI Python 서비스의 **`POST /ai/create-character-reference-image`** API를 호출합니다. (아래 AI 서비스 계획 참고)
    *   AI 서비스로부터 생성된 참조 이미지의 URL(GCS/S3 등)을 받으면, `characters` 테이블의 해당 캐릭터 레코드에 `image_url`과 `modeling_status` (`COMPLETED`)를 업데이트합니다.
    *   **재시도 전략:** `FAILED` 상태의 캐릭터에 대해서는 일정 시간 후 자동으로 재시도하거나, 관리자가 수동으로 재시도를 트리거할 수 있는 메커니즘을 구현합니다 (예: 지수 백오프(Exponential Backoff) 전략).

#### 3. AI Python 서비스 로직: 역할 분리
*   **스키마:** `schemas.py`의 `CharacterVisual` 모델은 그대로 사용합니다.
*   **신규 엔드포인트 추가:** `main.py`에 캐릭터 모델링을 위한 별도 API를 추가합니다.
    *   **`POST /ai/create-character-reference-image`** (캐릭터 참조 이미지 생성):
        *   **요청:** `{ "character_name": "...", "description_prompt": "..." }`
        *   **기능:** 캐릭터 이름과 기본 설명을 받아, Vertex AI Imagen을 사용해 캐릭터의 **표준 참조 이미지(캐릭터 시트 같은)**를 1장 생성합니다.
        *   **이미지 저장 및 URL 정책:** 생성된 이미지를 GCS/S3와 같은 클라우드 스토리지에 업로드하고, 해당 이미지의 **공개 접근 가능한 URL**을 반환합니다. 운영 환경에서는 GCS/S3와 같은 클라우드 스토리지에 업로드하고 공개 URL을 반환하며, 로컬 개발 환경에서는 로컬 파일 시스템에 저장 후 개발 서버를 통해 접근 가능한 URL을 반환하도록 환경별 설정을 명시합니다.
*   **기존 엔드포인트 수정:** `main.py`의 `POST /ai/generate-page-assets` (페이지별 에셋 생성)
    *   **요청:** 기존과 동일 (`{ "text": "...", "character_visuals": [...] }`)
    *   **로직 수정 (`image_service.py`):**
        1.  `character_visuals` 배열을 순회합니다.
        2.  `image_url`이 있는 캐릭터(기존 캐릭터 또는 모델링이 완료된 새 캐릭터)는 **텍스트 프롬프트 + 이미지 참조(Image Prompting)**를 사용하여 Imagen을 호출합니다.
            *   **이미지 전달 방식:** 백엔드에서 `image_url`을 통해 이미지를 읽어 Base64로 인코딩하여 전달하거나, AI 서비스가 직접 GCS/S3 URL을 통해 이미지를 참조하도록 구현합니다. (운영 환경에서는 GCS/S3 URL 참조가 더 효율적)
        3.  `image_url`이 없는 캐릭터(모델링 중인 새 캐릭터)는 **텍스트 프롬프트(`visual_description`)만으로 임시 이미지를 생성하여 표시하는 것을 기본으로 합니다. (완전히 일반적인 '로딩 중' 이미지보다는 캐릭터의 특징을 반영한 임시 이미지가 UX에 더 유리하다고 판단)**
        4.  이미지 생성 함수 자체는 필요 시 `asyncio.gather`로 확장 가능하도록 유지하되, 기본 경로는 단일 이미지 생성에 집중합니다.



#### 4. 프론트엔드 (React) 로직
*   **`StorybookView.tsx` (동화책 보기 페이지):**
    *   페이지를 넘길 때 `generateAssetsForPage`를 호출하는 현재 로직을 유지합니다.
    *   백엔드의 `POST /api/stories/{storyId}/pages/{pageNo}/assets` API 응답에 해당 페이지에 등장하는 캐릭터들의 `modeling_status`를 포함하도록 합니다.
    *   프론트엔드는 이 `modeling_status`를 활용하여, 아직 모델링이 완료되지 않은 캐릭터에 대해 "캐릭터 구상 중..."과 같은 로딩 상태를 더 정확하게 표시합니다.
    *   불필요한 폴링을 줄이고, `modeling_status`가 `PENDING`인 경우에만 **고정된 간격(예: 4초마다)**으로 `generateAssetsForPage`를 호출하여, 모델링이 완료되면 이미지를 갱신해서 보여주는 로직을 추가합니다. `modeling_status`가 `COMPLETED` 또는 `FAILED`로 변경되면 폴링을 중단합니다.

---
### 이 계획을 개발하기 위해 필요한 것들

이 복잡한 기능을 성공적으로 개발하기 위해서는 다음과 같은 기술 스택, 인프라, 그리고 협업 역량이 필요합니다.

#### **1. 기술 스택 및 지식**

*   **백엔드 (Spring Boot):**
    *   Java/Kotlin 언어 및 Spring Framework (Spring Boot, Spring Data JPA, Spring Security)
    *   비동기 처리 (Spring `@Async`, 메시지 큐 연동)
    *   RESTful API 설계 및 구현
    *   DB 마이그레이션 도구 (Flyway/Liquibase)
*   **AI 서비스 (Python):**
    *   Python 언어 및 FastAPI 프레임워크
    *   Pydantic (데이터 유효성 검사 및 직렬화)
    *   Google Vertex AI SDK (Imagen 모델 연동)
    *   클라우드 스토리지 SDK (GCS/S3 연동)
    *   비동기 프로그래밍 (`asyncio`)
    *   LLM 프롬프트 엔지니어링 (캐릭터 정보 추출 및 이미지 생성 프롬프트 설계)
*   **프론트엔드 (React):**
    *   React/TypeScript/JavaScript 언어 및 프레임워크
    *   상태 관리 라이브러리 (Recoil, Zustand, Redux 등)
    *   API 연동 (Axios, Fetch API 등)
    *   UI/UX 설계 및 구현 (로딩 상태, 이미지 표시, 폴링 로직)
*   **데이터베이스 (DB):**
    *   SQL (PostgreSQL, H2) 및 데이터 모델링
*   **클라우드 플랫폼:**
    *   Google Cloud Platform (Vertex AI, Cloud Storage, Pub/Sub 등) 또는 AWS (S3, SQS 등)에 대한 이해

#### **2. 인프라 및 도구**

*   **개발 환경:**
    *   IDE (IntelliJ IDEA, VS Code)
    *   버전 관리 시스템 (Git)
    *   컨테이너 (Docker) 및 오케스트레이션 (Kubernetes) (선택 사항이지만 권장)
*   **AI 모델:**
    *   Google Vertex AI Imagen API 접근 권한 및 할당량
*   **클라우드 스토리지:**
    *   Google Cloud Storage (GCS) 또는 AWS S3 버킷
*   **메시지 큐 (선택 사항이지만 권장):**
    *   Google Cloud Pub/Sub, RabbitMQ, Kafka 또는 Spring의 `@Async`를 활용한 경량 큐
*   **CI/CD 파이프라인:**
    *   자동화된 테스트, 빌드, 배포를 위한 시스템 (Jenkins, GitHub Actions, GitLab CI 등)
*   **모니터링 및 로깅:**
    *   시스템 상태, API 호출, 오류 등을 추적하기 위한 도구 (Prometheus, Grafana, ELK Stack, Cloud Logging 등)

#### **3. 문서화 및 협업**

*   **API 명세:** 백엔드 및 AI 서비스의 모든 API에 대한 상세한 OpenAPI/Swagger 문서
*   **기술 설계 문서:** 이미지 저장 정책, 재시도 메커니즘, 환경별 설정 등 복잡한 부분에 대한 별도 문서
*   **프로젝트 관리 도구:** Jira, Trello, Asana 등을 활용한 태스크 관리, 우선순위 지정, 담당자 지정
*   **정기적인 팀 싱크:** 백엔드, AI, 프론트엔드 팀 간의 긴밀한 소통 및 진행 상황 공유

---

# '새 동화 만들기' 기능 개선 아이디어

### 1. "랜덤 캐릭터" 기능 추가 (AI에게 맡기기)
- **아이디어:** 캐릭터 선택을 고민하는 사용자를 위해 "랜덤 캐릭터 선택" 또는 "AI에게 맡기기" 버튼을 추가합니다. 이 버튼을 누르면 시스템에 저장된 '전역(GLOBAL)' 캐릭터 중 1~2명을 임의로 선택하여 이야기에 포함시키는 기능입니다.
- **기대 효과:** 사용자에게 소소한 재미와 기대감을 선사하고, 캐릭터 선택의 부담을 줄여줄 수 있습니다.

### 2. 더 세분화된 동화 생성 옵션 제공
- **아이디어:** '고급 설정' 섹션을 추가하여 사용자가 이야기에 더 깊이 관여할 수 있도록 하는 옵션을 제공합니다.
    - **이야기의 교훈:** 사용자가 원하는 교훈(예: "정직의 중요성", "서로 돕는 마음")을 직접 입력할 수 있습니다.
    - **특정 사물/장소 포함:** "마법 열쇠", "구름 위 성"처럼 이야기에 꼭 포함되었으면 하는 소재를 제안할 수 있습니다.
    - **그림 스타일 선택:** 현재는 기본 스타일로 고정되어 있지만, "수채화", "카툰", "애니메이션" 등 몇 가지 그림 스타일을 사용자가 직접 선택할 수 있게 합니다.
- **기대 효과:** 사용자가 만들고 싶은 이야기에 더 가까운 결과물을 얻을 수 있어 만족도가 크게 향상됩니다.

### 3. UI/UX 개선
- **로딩 상태 표시:** 현재 '이미지 준비중'으로 표시되는 부분을 캐릭터 모양의 스켈레톤 UI나 귀여운 로딩 애니메이션으로 변경하여 시각적 완성도를 높일 수 있습니다.
- **실시간 피드백:** 사용자가 양식을 채우는 동안, 선택한 옵션을 바탕으로 "용감한 공룡과 우주를 탐험하는 6-7세 아이를 위한 우정에 관한 이야기"와 같이 생성될 동화의 줄거리를 실시간으로 요약해서 보여줍니다.
- **기대 효과:** 사용자가 생성 과정을 더 명확하게 인지하고, 지루함 없이 동화를 만들 수 있습니다.

---

# 인증 시스템 개선 계획

1.  **Refresh Token 저장 방식 보안 강화**
    *   **문제:** 현재 `localStorage`에 Refresh Token을 저장하여 XSS(Cross-Site Scripting) 공격에 취약합니다.
    *   **개선:** Refresh Token을 `HttpOnly`, `Secure`, `SameSite=Strict` 속성을 가진 **쿠키(Cookie)**에 저장하여 자바스크립트 접근을 원천적으로 차단하고 보안을 강화합니다.

2.  **Access Token 저장 방식 보안 강화**
    *   **문제:** Access Token 역시 `localStorage`에 저장되어 XSS 공격에 노출될 위험이 있습니다.
    *   **개선:** Access Token은 **메모리(React state 등)**에만 저장합니다. 페이지 새로고침 시 토큰이 사라지면, `HttpOnly` 쿠키에 담긴 Refresh Token을 사용하여 자동으로 재발급받는 흐름으로 변경합니다.

3.  **서버사이드 로그아웃 기능 구현**
    *   **문제:** 현재 로그아웃은 프론트엔드에서 토큰을 삭제하는 방식이라, 이미 탈취된 Refresh Token은 계속 유효한 상태로 남습니다.
    *   **개선:** 백엔드에 `/api/auth/logout`과 같은 API를 구현합니다. 로그아웃 시 이 API를 호출하여, 서버가 DB에 저장된 해당 Refresh Token을 명시적으로 **폐기(무효화)**하도록 합니다.

4.  **프론트엔드 에러 처리 방식 개선**
    *   **문제:** 로그인/회원가입 실패 시 `alert()`를 사용하여 사용자 경험을 해치고 있습니다.
    *   **개선:** 이미 구현된 `ToastProvider`를 활용하여, 모든 에러 피드백을 일관되고 세련된 **토스트(Toast) UI**로 제공합니다.

5.  **서버사이드 비밀번호 정책 검증 추가**
    *   **문제:** 현재 비밀번호 정책(최소 8자, 영문/숫자 조합)이 프론트엔드에만 적용되어 있어, API로 직접 요청 시 우회될 수 있습니다.
    *   **개선:** `AuthService`의 `signup` 메소드 등 **백엔드 로직**에도 동일한 비밀번호 유효성 검증 로직을 추가하여 보안을 강화합니다.

---

## 하트 결제 시스템 메모

- 백엔드에 `heart_products`, `billing_orders`, `heart_wallets`, `heart_transactions` 도입하고 Story 생성 전에 하트 차감하도록 구조화함.
- `/api/wallets/me`와 `/api/billing/*` REST API로 사용자 잔액/거래/주문 흐름 분리, mock 결제 확정만 붙이면 실제 PG 연동 가능.
- 프론트에 `결제 관리` 페이지를 추가해 하트 잔액·상품·주문·거래를 한 화면에서 관리하고, 하트 부족 시 동화 생성 플로우가 자연스럽게 결제 화면으로 안내되도록 UX 보완.
- 후속 과제: PG 결제 어댑터, 어드민 백오피스, 하트 이상 거래 모니터링 및 알람.
