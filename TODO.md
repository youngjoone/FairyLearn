# TODO — find-me (Docker 미사용 로컬 개발)

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

* [ ] PostgreSQL 15+ 설치 및 DB 생성 `findme`
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
