# find-me

성향 테스트(MBTI 스타일, 테토남/테토녀, 기질/가치관/흥미) + 감정 태깅을 바탕으로 **개인화 글/시/이미지 프롬프트**를 생성·추천하는 서비스.

> 목적: 오락/자기이해 보조. 임상·의학적 진단은 제공하지 않음. MBTI는 MBTI Trust의 등록상표이며 본 프로젝트는 독립적인 ‘유형성’ 스타일 테스트를 자체 설계합니다.

---

## 1. 핵심 가치 제안

* **즉시 재미**: 2\~3분 테스트로 프로필 생성
* **개인화 생성**: 성향+감정(기쁨/행복/벅참 등) 기반 텍스트·시·이미지 프롬프트 즉시 제공
* **소장/공유**: 결과 카드/포스터, 배경화면, SNS 공유 자동화

## 2. 주요 기능

* 테스트 허브(유형/가치/흥미/직업 적합도, 테토남·테토녀 스타일 등)
* 감정 태깅(복수 선택+강도)
* 개인화 생성(글/시/캡션/이미지 프롬프트)
* 추천 피드(무드/히스토리 기반)
* 보관함/즐겨찾기/다운로드

## 3. 아키텍처 (개발단계: Docker **미사용**)

```
[React(Web/PWA)]  ────────────────┐
                               │ GraphQL/REST
[Capacitor(모바일 빌드)]          ─┼──>  API Gateway (Spring Boot)
                               │           │
                               │           ├── Auth (OAuth2, JWT)
                               │           ├── Test/Result 서비스
                               │           ├── Recommendation 서비스
                               │           └── Event 큐(선택)

[Python AI(FastAPI)] <──────────┘
      ├─ Gemini 호출(텍스트/이미지 프롬프트)
      ├─ 프롬프트 템플릿/안전필터
      └─ 생성물 후처리(금칙어, 길이/스타일)

[PostgreSQL]  [Redis]  [Object Storage(S3 호환)]
```

### 기술 스택

* **FE**: React + Vite + TypeScript + Zustand/Redux, Tailwind, PWA
* **BE**: Spring Boot 3(Java 17+), Spring Security(OAuth2: Google/Kakao/Naver), JPA+QueryDSL(or MyBatis)
* **AI**: Python 3.11 + FastAPI, Google Gemini API
* **Data**: PostgreSQL, Redis, MinIO/S3(이미지)
* **Obs**: OpenTelemetry, Grafana/Prometheus, ELK
* **Infra(개발)**: **로컬 네이티브 실행(무Docker)**
* **Infra(운영 후보)**: 컨테이너/Kubernetes(선택)

## 4. 도메인 모델(요약)

* **User**(id, oauth\_provider, nickname, birth\_year\*, gender\*, consent\_flags)
* **Test**(id, code, title, version, visibility)
* **Question**(id, test\_id, body, scale\_type, options)
* **Answer**(id, user\_id, test\_id, payload)
* **Profile**(user\_id, traits JSON, last\_updated)
* **MoodTag**(id, user\_id, tags\[], intensity)
* **GeneratedItem**(id, user\_id, type\[text|poem|img\_prompt|poster], payload, seed, created\_at, visibility)
* **Recommendation**(id, user\_id, source, payload)

\*민감정보 최소화. 비식별화/가명처리 고려.

## 5. API(샘플)

* `POST /api/tests/{code}/submit` → `{answers:[...]}` → `{score:{}, traits:{}, profileDelta:{}}`
* `POST /api/moods` → `{tags:["기쁨","벅참"], intensity:85}`
* `POST /api/generate` → `{profileRef, mood, want:["poem","img_prompt"]}`
* `GET  /api/feed?cursor=...`

## 6. 프롬프트 설계 원칙

* **시스템**: 안전/금칙어, 톤, 길이 제한, 저작권 준수(표절 회피)
* **입력**: `profile(traits) + mood(tags,intensity) + intent(type)`
* **출력**: 구조화 JSON(예: `{poem, caption, img_prompt, rationale}`)
* **후처리**: 금칙어 필터, 중복 패널티, 다양성(temperature/top-p)

## 7. 개인정보/보안

* 한국 PIPA 준수: 최소수집·목적 외 사용 금지·파기주기 명시
* 동의 UI: 저장/공유/추천 범위 및 철회 방법 안내
* 만 14세 미만 별도 처리(가입 차단 또는 보호자 동의)
* 데이터 암호화(전송/저장), 접근제어/권한분리, 로그 비식별화

## 8. 수익모델(개요)

* **구독**: 고급 테스트팩/무제한 생성/고해상도 다운로드/템플릿 번들
* **마이크로 결제**: 포스터/배경화면/궁합 리포트권
* **광고·스폰서**: 네이티브 카드 1슬롯, 브랜드 테스트
* **제휴**: 커리어 코칭/상담 연결 수수료, POD(인쇄/굿즈)
* **B2B**: 화이트라벨 포털(학교/학원 등)
* **마켓플레이스**: 크리에이터 테스트팩/테마 판매(수수료)

## 9. 웹→모바일 확장

* **PWA 우선** → **Capacitor 래핑**(IAP/푸시/딥링크)
* 필요 시 **React Native** 혼용/전환

## 10. 개발 로드맵 (MVP → MLP)

**M1: MVP(4주)**

* 테스트 2종 + 감정 태깅 + 개인화 글/시 생성
* OAuth2 로그인 + 저장/공유 + 기본 피드
* 로컬 실행 스크립트/문서화(무Docker)

**M2: 확장(4\~8주)**

* 이미지 프롬프트/포스터 생성 + 다운로드 상점(워터마크 제거 유료)
* 레이트리밋·안전필터·콘텐츠 신고 + A/B 테스트

**M3: 모바일(4주)**

* PWA 품질 향상 + Capacitor 빌드 & 스토어 퍼블리시

## 11. 로컬 개발 (Docker 미사용)

### 11.1 사전 준비

* Node.js 20+, **pnpm**
* JDK 17+ (JAVA\_HOME)
* Python 3.11(venv/uv/poetry 중 택1)
* PostgreSQL 15+, Redis 7+ (로컬 설치)

### 11.2 실행 순서

```bash
# 1) FE
cd apps/web
pnpm i
pnpm dev

# 2) BE(Spring)
cd apps/api
./gradlew bootRun -Dspring.profiles.active=local

# 3) AI(FastAPI)
cd services/ai
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

환경 변수 예시 `.env` (발췌)

```
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/findme
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=secret
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=...
GEMINI_API_KEY=...
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
```

## 12. Gemini CLI 프롬프트 모음(한글)

> **대화형 개발 보조**로 가정. 아래 문장을 그대로 붙여넣어 사용(리눅스 명령어 아님).

**A. 테스트 문항 생성(12문항, 역문항 3개 포함)**

```
역할: 성향 테스트 디자이너.
목표: 12문항의 유형성 테스트를 만들어줘. 각 문항은 5점 리커트(전혀아니다~매우그렇다).
제약: 임상/의학적 표현 금지, 일상 언어 사용, 역문항 3개 포함.
출력형식(JSON): {
  "test": {"code":"trait_v1","title":"유형성 스타일 v1","version":1,
    "questions":[{"id":"Q1","body":"...","reverse":false}, ...] }
}
설명 없이 JSON만 출력해.
```

**B. 채점 규칙 생성(0\~100 정규화, 4개 하위지표)**

```
역할: 심리척도 설계자.
입력: test.code=trait_v1, 12문항(역문항 3개).
요구: 각 문항을 0~4로 점수화(역문항 반전), 4개 하위지표(A,B,C,D) 산출 후 0~100 정규화.
출력(JSON): {
  "scoring": {
    "reverseIds": ["Q?","Q?","Q?"],
    "subscales": {"A":["Q1","Q2","Q3"],"B":["Q4","Q5","Q6"],"C":["Q7","Q8","Q9"],"D":["Q10","Q11","Q12"]},
    "normalize": "minmax"
  }
}
설명 금지. JSON만.
```

**C. 개인화 시 생성**

```
아래 프로필과 감정태그를 반영해 120~180자의 짧은 시 한 편을 만들어줘.
어투: 따뜻하고 고양적. 금칙어·민감주제 회피. 결과만 출력.
PROFILE={"traits":{"A":72,"B":40,"C":65,"D":55},"keywords":["사교적","상상력"]}
MOOD={"tags":["기쁨","벅참"],"intensity":85}
```

**D. 일러스트용 이미지 프롬프트**

```
프로필과 감정태그에 맞는 일러스트 프롬프트를 영어 한 줄로 작성해줘.
카메라/렌즈/브랜드 금지, 색감·구도·분위기 중심.
PROFILE={"A":72,"B":40,"C":65,"D":55}
MOOD=["joy","awe (high arousal)"]
```

**E. JSON 결과만 강제할 때(검증용)**

```
아래 스키마에 맞는 JSON만 출력해. 설명·주석 금지. 형식이 어긋나면 다시 생성해.
SCHEMA={"type":"object","properties":{"poem":{"type":"string"}},"required":["poem"]}
입력=PROFILE+MOOD를 활용해 poem을 생성해.
```

## 13. 품질 지표

* D1: 온보딩→첫 생성까지 시간
* R7: 7일 재방문율
* C1: 생성물 공유/다운로드율
* 전환 퍼널, MRR/ARPPU

## 14. 라이선스/저작권

* 사용자 생성물 사용권 정책 명시(개인 이용 무료, 상업 이용 조건 등)
* 외부 폰트/아이콘/이미지/모델 라이선스 표기
