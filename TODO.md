# 신규 기능: 소셜 로그인 연동

## 1. 네이버 로그인

### 백엔드 (Spring Boot)
- [ ] **`application.yml` 설정:**
    - [ ] `spring.security.oauth2.client.registration.naver` 항목 추가 (client-id, client-secret, scope, redirect-uri 등).
    - [ ] `spring.security.oauth2.client.provider.naver` 항목 추가 (authorization-uri, token-uri, user-info-uri 등).
    - [ ] 네이버의 중첩된 응답 처리를 위해 `user-name-attribute`를 `response`로 설정.
- [ ] **사용자 정보 처리 로직 확인/수정:**
    - [ ] `OAuth2SuccessHandler` 또는 관련 서비스에서 네이버 응답(`response.id`, `response.email` 등)을 올바르게 파싱하여 User 엔티티에 저장하는지 확인 및 필요시 수정.

### 프론트엔드 (React)
- [ ] **로그인 페이지 수정 (`Login.tsx`):**
    - [ ] 네이버 로그인 버튼 UI 추가 (네이버 로고 및 색상 적용).
    - [ ] 버튼 클릭 시 백엔드 인증 경로 (`/oauth2/authorization/naver`)로 이동하도록 링크 설정.

---

# 신규 기능: 동화책 오디오(TTS) 기능 개발

## 전체 기능 목표
- 사용자가 '동화책 읽기' 버튼을 누르면 AI가 생성한 음성으로 동화책 내용을 들을 수 있다.
- 한 번 생성된 오디오 파일은 저장하여 중복 생성을 방지한다.

---

### 1. 백엔드 (Spring Boot)
- [ ] **DB/Entity:** `Story.java` Entity에 `fullAudioUrl` 필드가 이미 있는지 최종 확인. (완료 - 확인됨)
- [ ] **Config:** `WebConfig.java`에 `/audio/**` URL 요청을 로컬 디렉토리(`/Users/kyj/testaudiodir/`)로 연결하는 `addResourceHandlers` 설정 추가.
- [ ] **Controller:** `StoryController.java`에 오디오 생성을 요청하는 API 엔드포인트 `POST /api/stories/{id}/audio` 추가.
- [ ] **Service:** `StoryService.java`에 다음 로직 구현:
    - [ ] `storyId`로 `Story` 조회.
    - [ ] `fullAudioUrl` 필드에 값이 있는지 확인.
    - [ ] 값이 있으면, 해당 URL 즉시 반환 (캐싱).
    - [ ] 값이 없으면, Python AI 서비스에 오디오 생성 요청 (HTTP Call).
    - [ ] Python으로부터 받은 파일 경로를 가공하여 (`/audio/파일명.mp3` 형태로) `fullAudioUrl` 필드에 저장 (DB 업데이트).
    - [ ] 새로 저장된 URL을 클라이언트에 반환.

### 2. AI 서비스 (Python)
- [ ] **API:** Spring Boot 백엔드에서 호출할 TTS 생성 API 엔드포인트 구현 (예: `POST /generate-tts`).
- [ ] **AI 연동:** 전달받은 텍스트를 OpenAI TTS API로 보내 오디오 데이터 생성.
- [ ] **파일 저장:** 생성된 오디오 파일(mp3)을 지정된 경로(`/Users/kyj/testaudiodir/`)에 고유한 파일명으로 저장.
- [ ] **응답:** 저장된 파일명을 Spring Boot 백엔드에 반환.

### 3. 프론트엔드 (React)
- [ ] **페이지:** `StoryDetail.tsx` 페이지 수정.
- [ ] **데이터 조회:** 페이지 로드 시 가져오는 `story` 객체에 `fullAudioUrl`이 포함되어 있는지 확인.
- [ ] **조건부 렌더링:**
    - [ ] `story.fullAudioUrl`이 있으면, `<audio>` 태그 등을 이용한 오디오 플레이어 UI 렌더링.
    - [ ] `story.fullAudioUrl`이 없으면, '동화책 읽기' 버튼 렌더링.
- [ ] **API 연동:**
    - [ ] '동화책 읽기' 버튼 클릭 시, 백엔드 API(`POST /api/stories/{id}/audio`) 호출.
    - [ ] API 호출 동안 로딩 상태(스피너, 버튼 비활성화 등) UI 처리.
    - [ ] API 응답 성공 시, 반환된 `fullAudioUrl`로 상태를 업데이트하여 오디오 플레이어가 표시되도록 함.

---

# TODO — FairyLearn (Docker 미사용 로컬 개발)

## 0) 리포지토리 초기화

* [x] 모노레포(권장): `frontend`, `backend`, `ai-python`, `packages/sdk`
* [ ] 공통 코드 규칙: EditorConfig, Prettier, ESLint(프론트), Checkstyle/Spotless(백엔드)
* [ ] 커밋 규약: Conventional Commits + commitlint + changelog

## 1) 프론트엔드(React)

* [ ] Vite + React + TypeScript + Tailwind 초기세팅
* [ ] 라우팅 구조(Onboarding/Test/Result/Feed/My)
* [ ] 상태관리(Zustand or Redux Toolkit)
* [ ] PWA 설정(서비스워커, 앱 메타, 오프라인 캐시)
* [ ] 테스트 UI 2종 구현(리커트 5점, 역문항 지원)
* [ ] 감정 태깅 컴포넌트(다중선택+강도 슬라이더)
* [ ] 결과 카드/포스터 공유 카드(OG 이미지 자동 생성 준비)
* [ ] API SDK 패키지(`packages/sdk`) 연동
* [ ] 로그인 후 헤더에 `닉네임님 환영합니다!` 표시 (`/api/me` 연동 및 AuthContext 확장)

## 2) 백엔드(Spring Boot)

* [ ] JDK 17+ 프로젝트 생성, 멀티모듈 구조(optional)
* [ ] DB 마이그레이션: Flyway(또는 Liquibase)
* [ ] 도메인: User/Test/Question/Answer/Profile/MoodTag/GeneratedItem/Recommendation
* [ ] OAuth2 로그인(구글/카카오/네이버) + JWT 발급/갱신
* [ ] 테스트 제출/채점 API
* [ ] 감정 태깅 API
* [ ] 생성 요청 API(→ AI 서비스 프록시)
* [ ] 추천 피드 API(초기: 최근 생성물/무드 기반)
* [ ] 레이트리밋/요청 로깅/감사 로그
* [ ] 에러/예외 표준 응답 스키마

## 3) AI 서비스(Python FastAPI)

* [ ] FastAPI 스켈레톤 + pydantic 스키마
* [ ] Gemini 호출 유틸(키 주입, 타임아웃, 재시도)
* [ ] 프롬프트 템플릿(테스트 문항/채점/시/이미지 프롬프트)
* [ ] 출력 검증(JSON only 강제 프롬프트 + `jsonschema` 검증)
* [ ] 안전필터(금칙어, 길이 제한, 민감주제 가드)
* [ ] 로깅/추적(ID 전파), 성능 메트릭

## 4) 데이터베이스/캐시(로컬 설치)

* [ ] PostgreSQL 15+ 설치 및 DB 생성 `fairylearn`
* [ ] Redis 7+ 설치
* [ ] Spring `application-local.yml` 연결 확인
* [ ] 초기 스키마 마이그레이션(Flyway) 적용
* [ ] 시드 데이터(더미 테스트/문항) 삽입 스크립트

## 5) 인증/보안/개인정보

* [ ] 동의 플로우 UI(저장/공유/추천 범위)
* [ ] 프로필/로그 비식별화 정책 문서화
* [ ] 보관기간/파기 정책 수립 및 자동화 배치
* [ ] CORS/보안 헤더/HTTPS(로컬 mkcert 후 프록시 선택)

## 6) 빌드/실행 스크립트 (무Docker)

* [ ] FE: `pnpm dev` / `pnpm build`
* [ ] API: `./gradlew bootRun` / `bootJar`
* [ ] AI: `uvicorn main:app --reload`
* [ ] 루트 npm/pnpm 스크립트로 일괄 실행(`pnpm -r dev`)

## 7) 품질/관측성

* [ ] FE/BE/AI 각각 유닛 테스트 기본 세트
* [ ] OpenAPI(Swagger) 문서 자동화
* [ ] OpenTelemetry(트레이싱) 스켈레톤 연결
* [ ] Sentry(또는 자체 ELK) 오류 수집 연결(선택)

## 8) PWA → 모바일 확장(Capacitor)

* [ ] Capacitor 초기화, 앱 아이콘/스플래시
* [ ] OAuth 딥링크/리다이렉트 처리
* [ ] In-App Purchase(스토어 연동) 준비
* [ ] 푸시 알림 설정(Firebase)

## 9) 수익모델 MVP

* [ ] 무료 체험(생성 1\~2회) + 워터마크 정책
* [ ] 결제 유형 1개 선정(구독 또는 코인) 후 최소 플로우 구현
* [ ] 가격/온보딩 카피 A/B 초안

## 10) 배포(운영 단계 진입 시)

* [ ] 운영에서만 컨테이너화 고려(선택)
* [ ] CI/CD(GitHub Actions): 빌드/테스트/릴리즈 태그
* [ ] 환경 변수/시크릿 관리(1Password/Secret Manager)

---

## 부록) Gemini CLI 프롬프트 스니펫(한글)

* [ ] **테스트 문항 생성**

```
역할: 성향 테스트 디자이너.
목표: 12문항의 유형성 테스트를 만들어줘. 각 문항은 5점 리커트.
제약: 임상 표현 금지, 역문항 3개 포함.
JSON만 출력: { "test": { ... } }
```

* [ ] **채점 규칙 생성**

```
역할: 심리척도 설계자.
입력: trait_v1 문항 세트.
요구: 4개 하위지표, 0~100 정규화, JSON만 출력.
```

* [ ] **개인화 시 생성**

```
PROFILE={...} MOOD={...}
조건: 120~180자, 따뜻한 톤, 결과만 출력.
```

* [ ] **이미지 프롬프트**

```
PROFILE/MOOD 반영, 영어 한 줄, 색감/구도/분위기 중심, 브랜드/렌즈 금지.
```

---

# 신규 기능: 동화책 생성 개발 계획

## 1. 백엔드: 데이터베이스 및 기반 설정
- [ ] **DB 마이그레이션:**
  - [ ] `V12__create_storybook_page_table.sql` 스크립트 작성 (h2 & postgres)
  - [ ] `storybook_pages` 테이블 생성 (id, story_id, page_number, text, image_url)
- [ ] **JPA 엔티티 생성:**
  - [ ] `StorybookPage.java` 엔티티 클래스 생성
  - [ ] `@ManyToOne` 관계 설정 (StorybookPage -> Story)
- [ ] **`Story.java` 엔티티 업데이트:**
  - [ ] `@OneToMany` 관계 설정 (Story -> StorybookPage)

## 2. 이미지 생성 및 저장 (로컬 개발용)
- [ ] **이미지 저장 디렉토리 생성:**
  - [ ] `/Users/kyj/testimagedir` 디렉토리 생성
- [ ] **AI 파이썬 서비스 (`ai-python`):**
  - [ ] `/ai/generate-image` API 엔드포인트 구현
  - [ ] DALL-E 호출 로직 추가 (`openai_client.py`)
  - [ ] 생성된 이미지를 `/Users/kyj/testimagedir`에 고유한 파일명으로 저장
  - [ ] 저장된 파일의 절대 경로를 API 응답으로 반환

## 3. 백엔드: 동화책 생성 로직 구현
- [ ] **신규 서비스/컨트롤러 생성:**
  - [ ] `StorybookService.java` 및 `StorybookController.java` 생성
- [ ] **동화책 생성 API 구현 (`POST /api/stories/{id}/storybook`):**
  - [ ] `StorybookService`에 메인 로직 구현
  - [ ] 동화 텍스트를 문단별로 분리
  - [ ] **첫 페이지 동기 처리:** 첫 문단에 대한 이미지를 동기적으로 생성 및 저장
  - [ ] **나머지 페이지 비동기 처리:** `@Async`를 사용하여 2페이지부터 끝까지의 이미지를 백그라운드에서 생성 및 저장
- [ ] **동화책 페이지 조회 API 구현 (`GET /api/storybook/{id}/pages`):**
  - [ ] 생성된 페이지와 이미지 경로를 조회하여 반환하는 API

## 4. 프론트엔드: 동화책 보기 UI 구현
- [ ] **신규 페이지 라우팅 설정:**
  - [ ] `App.tsx` 또는 라우터 설정 파일에 `/storybook/:id` 경로 추가
- [ ] **신규 페이지 컴포넌트 생성:**
  - [ ] `src/pages/StorybookView.tsx` 파일 생성
- [ ] **`StoryDetail.tsx` 수정:**
  - [ ] '동화책으로 보기' 버튼 `onClick` 핸들러 구현
  - [ ] 로딩 상태 관리 (첫 페이지 생성 대기)
  - [ ] API 호출 후, 생성된 storybook id를 가지고 `/storybook/:id` 페이지로 이동
- [ ] **`StorybookView.tsx` 페이지 상세 구현:**
  - [ ] 첫 페이지 데이터(그림, 글)를 표시
  - [ ] 나머지 페이지들의 그림/글 정보를 주기적으로 폴링(polling)하여 업데이트
  - [ ] UI 레이아웃: 상단에 그림, 하단에 글 배치
  - [ ] 페이지 넘김 기능 (좌/우 버튼 등)

---

## 구글 소셜 로그인 기능 추가 (Google Social Login)

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
- **파일**: `frontend/src/pages/Login.tsx`
  - [ ] "Google로 로그인" 버튼 UI 추가
  - [ ] 버튼 클릭 시 백엔드 로그인 URL (`/oauth2/authorization/google`)로 이동하는 링크 구현
- **파일**: `frontend/src/pages/AuthCallback.tsx`
  - [ ] URL 쿼리 파라미터에서 JWT 토큰 추출하는 로직 구현
  - [ ] 추출한 토큰을 `localStorage`에 저장
- **파일**: `frontend/src/contexts/AuthContext.tsx`
  - [ ] 토큰 저장 후, 사용자 인증 상태를 전역적으로 업데이트하는 로직 호출

---

# 구글 소셜 로그인 개발 회고 및 재시도 계획

이번 구글 소셜 로그인 개발 과정에서 여러 문제가 발생하여, 원점에서 다시 시작하기로 결정했습니다. 아래는 문제점 요약 및 향후 권장되는 개발 계획입니다.

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

---

# 신규 기능: 카카오 소셜 로그인 추가 (수정된 최종 계획)

## 1. 카카오 개발자 설정
- [ ] [카카오 개발자](https://developers.kakao.com/)에서 애플리케이션 생성
- [ ] **REST API 키** 확보
- [ ] 카카오 로그인 활성화 및 Redirect URI 등록: `http://localhost:8080/login/oauth2/code/kakao`
- [ ] 동의항목 설정: **프로필 정보(닉네임)**, **카카오계정(이메일)** 필수 동의

## 2. 백엔드 (Spring Boot) 수정
- **`application-local.yml` 수정:**
  - [ ] `spring.security.oauth2.client.registration.kakao` 설정 추가 (client-id, scope 등)
  - [ ] `spring.security.oauth2.client.provider.kakao` 설정 추가 (URI 정보)
- **`CustomOAuth2UserService.java` 수정:**
  - [ ] `loadUser` 메소드에 `kakao` 분기 추가.
  - [ ] 카카오의 중첩된 응답(`kakao_account`, `properties`)을 정규화하여 `DefaultOAuth2User`에 담아 반환.
- **`OAuthAttributes.java` 수정:**
  - [ ] `of()` 메소드에 `kakao` 분기 추가.
  - [ ] `ofKakao()` 메소드 구현 (정규화된 attributes 사용).

## 3. 프론트엔드 (React) 수정
- **`Login.tsx` 수정:**
- [ ] "카카오로 로그인" 버튼 UI 추가.
- [ ] 백엔드 카카오 로그인 URL (`/oauth2/authorization/kakao`)로 링크.

---

# 신규 기능: 공유 스토리 좋아요/댓글 플로우

## 1. DB 마이그레이션
- [x] `shared_story_likes`, `shared_story_comments`, `shared_story_comment_likes` 테이블 추가 (필드/인덱스 포함)

## 2. 백엔드
- [x] 엔티티/레포지토리/서비스 구현 (좋아요 토글, 댓글 CRUD, 댓글 좋아요)
- [x] `SharedStoryPublicController`에 좋아요/댓글 API 추가 (로그인 사용자만 허용)

## 3. 프론트엔드
- [x] `StoryDetail` 하단에 좋아요 & 댓글 UI 추가
- [x] 댓글 수정/삭제/대댓글/좋아요 UX 구현 및 로딩/오류 상태 처리
- [x] 비로그인 시 상호작용 차단 및 로그인 안내
