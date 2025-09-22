# Project Overview

FairyLearn은 **Spring Boot 백엔드 + React/Vite 프론트엔드 + FastAPI AI 서비스**로 구성된 모노레포입니다. 백엔드는 스토리 생성/공유 및 인증을 담당하고, 프론트엔드는 사용자 인터페이스, AI 서비스는 OpenAI 기반 텍스트·이미지·TTS 생성을 맡습니다. 이 문서는 세션을 재시작했을 때 빠르게 컨텍스트를 복구할 수 있도록 구조와 주요 흐름을 요약한 것입니다.

---

## 1. 모노레포 구조 요약

```
find-me2/
├─ backend/        # Spring Boot (Java 17)
├─ frontend/       # Vite + React + TS
├─ ai-python/      # FastAPI + OpenAI SDK
├─ docs/           # 문서 (본 파일)
└─ README.md       # 기존 회고/계획
```

### 백엔드 핵심 모듈 (backend/src/main/java/com/fairylearn/backend)
| 위치 | 설명 |
| --- | --- |
| `controller/StoryController.java` | 인증된 사용자의 기본 스토리 CRUD·AI 호출 진입점 |
| `controller/SharedStoryPublicController.java` | 공유 URL 전용 공개 API (오디오/스토리북 생성 및 조회) |
| `service/StoryService.java` | 스토리 생성/저장/AI TTS 호출. 공유용 `generateAudioForStory` 노출 |
| `service/StoryShareService.java` | 공유 엔티티 관리, 공개 API에서 재사용되는 로직 |
| `dto/StoryDto.java` | 프론트에서 사용하는 스토리 DTO, `shareSlug` `fullAudioUrl` `manageable` 포함 |
| `entity/SharedStory.java` | `stories`와 1:1 관계, 공유 슬러그/제목/생성 시각 유지 |
| `repository/SharedStoryRepository.java` | 공유 엔티티 JPA 리포지토리 |
| `service/StorybookService.java` | 그림책 생성 (FastAPI 이미지 호출)·조회 |
| `util/JwtProvider.java` + `filter/JwtAuthFilter.java` | JWT 발급/검증. (현재 subject가 이메일 string인 토큰에 대해 숫자 파싱 실패 로그 존재)

데이터베이스 마이그레이션은 Flyway로 관리하며, `db/migration/h2`와 `db/migration/postgres`에 각각 동일한 스키마가 위치합니다. `V18__create_shared_stories.sql` 에 공유 테이블 정의가 추가되어 있습니다.

### 프론트엔드 핵심 파일 (frontend/src)
| 위치 | 설명 |
| --- | --- |
| `pages/StoryDetail.tsx` | `/stories/:id`와 `/shared/:slug`를 모두 처리. 공유 여부에 따라 공개 API/소유자 API 분기 |
| `pages/StorybookView.tsx` | `/storybook/:id`, `/shared/:slug/storybook` 두 경로를 지원. 공유 뷰는 공개 API로 페이지 조회 |
| `pages/SharedStoriesBoard.tsx` | 공유 목록 게시판. `shareSlug` 누락 시 필터링 |
| `App.tsx` | 라우팅 정의. 공유 스토리북 경로 추가(`/shared/:slug/storybook`) |
| `components/ui/Modal.tsx` | 공유 모달 UI (overay/blur 적용) |
| `hooks/useApi.ts` | Axios 인스턴스 (Bearer 토큰·401 refresh 처리) |

공유 페이지에서 사용자 동작은 `StoryDetail` 버튼 핸들러에 모두 집중되어 있으며, snake_case 응답을 `normalizeStory` 함수로 camelCase로 정규화한 뒤 상태에 저장합니다.

### AI 서비스 요약 (`ai-python/`)
- `main.py`: `/ai/generate`, `/ai/generate-image`, `/ai/generate-tts` 엔드포인트 제공.
- `service/openai_client.py`: 텍스트/이미지/TTS 생성을 OpenAI SDK로 호출.
- 백엔드 WebClient는 `ai.python.base-url` (기본 `http://localhost:8000`) 로 FastAPI에 접근합니다.

---

## 2. 공유 기능 파이프라인

```
[사용자 A] /stories/{id}
  └─ POST /api/stories/{id}/share → SharedStory(slug) 생성
      └─ 프론트에 shareSlug 제공

[사용자 B] /shared/{slug}
  ├─ GET /api/public/shared-stories/{slug} → StoryDto(shareSlug, manageable=false)
  ├─ “동화책 읽기” →
  │    • 공유자가 이미 생성 → /audio/{file}.mp3 재생 (isAudioVisible=true)
  │    • 없다 → POST /api/public/shared-stories/{slug}/audio
  ├─ “동화책으로 보기” →
  │    • 공유자가 이미 생성 → /shared/{slug}/storybook 바로 이동
  │    • 없다 → POST /api/public/shared-stories/{slug}/storybook,
  │                이어서 GET /api/public/shared-stories/{slug}/storybook/pages
  └─ “공유 배너” → 공유자 로그인 시 `manageable=true`로 삭제/재공유 버튼 노출
```

공유자가 `/shared/{slug}`에 접근하면 JWT principal과 스토리의 `userId`가 비교돼 `manageable=true`가 내려옵니다. 이렇게 되면 삭제/재공유 버튼이 렌더링되고, 동화책/음성 생성 시에도 내부적으로 소유자와 동일한 API를 사용합니다.

주의: `/api/public` 경로도 `JwtAuthFilter`를 통과하므로, 이메일 기반 subject 토큰을 사용할 경우 파싱 오류 로그가 남습니다. 향후 `JwtAuthFilter`에서 `Claims.getSubject()`를 Long 변환하기 전에 이메일 토큰을 분기 처리하거나, 로그인 시 `JwtProvider.generateToken(User)`를 사용해 subject를 userId로 통일하는 것이 필요합니다.

---

## 3. 프론트 요청 분기 요약

| 시나리오 | 버튼 | 호출 API |
| --- | --- | --- |
| 소유자 `/stories/{id}` | 동화책 읽기 | `POST /api/stories/{id}/audio` |
| 공유자/비공유자 `/shared/{slug}` | 동화책 읽기 | `POST /api/public/shared-stories/{slug}/audio` |
| 소유자 `/stories/{id}` | 동화책으로 보기 | `POST /api/stories/{id}/storybook` → 이동 `/storybook/{id}` |
| 공유자/비공유자 `/shared/{slug}` | 동화책으로 보기 | `POST /api/public/shared-stories/{slug}/storybook` → 이동 `/shared/{slug}/storybook` |
| 공유자 `/shared/{slug}` | 공유/삭제 버튼 | `manageable=true`일 때만 렌더링 |

`StoryDetail`는 요청을 보낸 뒤 `setStory`에 `fullAudioUrl`을 업데이트해 플레이어가 렌더링되도록 하거나, 공유 slug를 상태화하여 링크 복사 기능이 항상 유효하도록 합니다.

`StorybookView`는 slug 여부에 따라 API와 뒤로가기 경로를 나눕니다. 공유 시에는 `/shared/{slug}/storybook` URL을 사용해 `/api/public/shared-stories/{slug}/storybook/pages`를 5초마다 폴링합니다.

---

## 4. 자주 필요한 명령/참고

```bash
# 백엔드 실행 (기본 local profile)
cd backend
./gradlew bootRun

# 프론트 실행
cd frontend
npm run dev

# AI 서비스 실행
cd ai-python
uvicorn main:app --reload
```

- 공통 환경: JWT 시크릿과 OAuth 클라이언트는 `backend/src/main/resources/application-local.yml`에서 로컬 값을 사용하며, 실제 운영값은 환경 변수로 교체해야 합니다.
- 음성/이미지 파일은 로컬 디렉토리(`/Users/kyj/testaudiodir`, `/Users/kyj/testimagedir`)에 저장되며, `WebConfig`가 `/api/audio/**`, `/images/**`를 해당 경로에 매핑합니다.
- 테스트는 `./gradlew test`로 수행하지만, 현재 H2 락 문제가 있어 클린업(데이터베이스 파일 삭제 등)이 필요합니다.

---

## 5. 다음 개발 시 체크리스트

1. 공유자의 삭제/재공유 기능이 `/shared/{slug}`에서도 정상 노출되는지 확인 (`story.manageable`).
2. `/api/public/shared-stories/{slug}/storybook/pages`가 대량 호출될 경우 캐시 전략 검토.
3. JWT 필터에서 이메일 기반 토큰 파싱 시 경고가 발생하므로, subject를 userId로 통일하거나 필터 파싱 로직을 보완.
4. FastAPI 호출 실패 시 graceful fallback이 있는지 (`StoryService.createFailsafeStory` 확인) 반복 테스트.

---

이 문서를 업데이트하면서 주요 흐름과 환경 변화를 누적해 두면, 세션을 다시 열었을 때 여기만 살펴보고 필요한 소스 파일을 골라 읽을 수 있습니다.
