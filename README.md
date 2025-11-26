# Find-Me 2.0

AI 기반 동화 제작 서비스의 프론트엔드(React), 백엔드(Spring Boot), AI 파이프라인(FastAPI) 레포지터리입니다.  
사용자는 자신의 사진(또는 원하는 이미지를 기반으로 한) 커스텀 캐릭터를 만들고, 해당 캐릭터를 포함한 동화/표지/페이지/오디오를 자동으로 생성할 수 있습니다.

---

## 1. 레포지터리 구조

```
ai-python/       FastAPI 서비스 (Gemini/OpenAI 연동, 이미지·텍스트·오디오 생성)
backend/         Spring Boot API (사용자/스토리/캐릭터/결제 등 비즈니스 로직)
frontend/        React + Vite 클라이언트
docs/            보조 문서
data/, temp_image 등  로컬 런타임 아티팩트
```

각 서비스는 독립적으로 실행되며 HTTP로 통신합니다. 개발 중에는 모두 로컬에서 실행 후 `http://localhost:{port}`로 연결합니다.

---

## 2. 주요 기능 개요

### 커스텀 캐릭터
- 사용자별 사진(≤5MB)을 업로드 → FastAPI로 참조 이미지를 생성 → `/Users/kyj/testchardir`에 저장.
- 캐릭터 정보(`persona`, `promptKeywords`, `visualDescription` 등)는 Story/커버 생성에 그대로 전달.
- 소유자만 CRUD 가능, 이미지 삭제 시 파일/DB 모두 정리.

### 동화 생성 파이프라인
1. **텍스트**: Spring Boot → FastAPI `/ai/generate` (Gemini) 호출, 최소 10페이지 JSON.
2. **커버/페이지 이미지**: 선택/생성된 캐릭터의 참조 이미지를 모두 전달하여 장면마다 일관성 유지.  
   - 429/Resource Exhausted 시 최대 3회 재시도, 백오프는 8/16/24초.
3. **오디오(TTS)**: 스토리 저장 후 `/ai/generate-audio` 호출. (기본 Gemini TTS, Azure/OpenAI 전환 옵션 준비 중)

### 리전/Rate Limit 처리
- 기본 `GOOGLE_LOCATION=us-central1`.
- `GEMINI_IMAGE_FALLBACK_LOCATIONS` 옵션을 제거하여 중복 리전 호출 대신 단일 리전에 집중.
- 여전히 429가 발생하면 백오프 후 재시도하되, UI 측에서 사용자에게 진행 상황을 안내하도록 설계.

---

## 3. 개발 환경 & 실행

### 선행 요구 사항
- Node.js 20+, pnpm 8+
- JDK 17+, Gradle Wrapper
- Python 3.12 + `uvicorn`, `google-genai`, `openai` 등 (가상환경 사용 권장)
- Redis / PostgreSQL (optional, 개발 중에는 H2 + 로컬 Redis)

### 환경 변수 핵심
| 서비스 | 파일 | 주요 항목 |
| --- | --- | --- |
| Backend | `backend/src/main/resources/application.yml` (또는 `.env`) | `CHARACTER_IMAGE_DIR`, `USER_PICTURE_DIR`, OAuth 클라이언트 키, JWT 시크릿 |
| AI | `ai-python/.env` | `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_PROJECT_ID`, `GOOGLE_LOCATION`, `CHARACTER_IMAGE_DIR`, `IMAGE_GENERATION_*` |
| Frontend | `.env` | `VITE_API_BASE_URL`, `VITE_AI_BASE_URL` 등 API 주소 |

### 로컬 실행 순서 예시
1. **AI 서비스**
    ```bash
    cd ai-python
    source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
    ```
2. **Spring Boot**
    ```bash
    cd backend
    ./gradlew bootRun --args='--spring.profiles.active=local'
    ```
3. **Frontend**
    ```bash
    cd frontend
    pnpm install
    pnpm dev
    ```

---

## 4. 운영 중 주의할 점

1. **이미지 디렉터리**
   - `CHARACTER_IMAGE_DIR=/Users/kyj/testchardir`
   - 업로드 임시 디렉터리 `/Users/kyj/testpicturedir`는 실패 시 파일이 남을 수 있음 → 주기적 정리 필요.

2. **API Rate Limit**
   - Vertex AI/Gemini 호출은 프로젝트 단위로 제한됨. 동시 사용자 수가 늘면 429가 증가하므로 UI에서 재시도/대기 안내 필요.

3. **보안**
   - OAuth/JWT 키는 `.env`나 비밀 저장소에서 관리.
   - FastAPI는 `file://` 경로를 그대로 열어 참조 이미지를 읽으므로, 외부 노출 시 경로 검증/권한 제어 필수.
   - HTTPS, CORS, Rate Limit, 로그 비식별화 정책 등을 배포 전에 점검.

4. **데이터 정합성**
   - Story 저장 시 캐릭터가 3명을 넘지 않도록 백엔드에서 자동 제한.
   - 커버/페이지 생성에 사용된 캐릭터 이미지가 삭제되면 재생성이 필요하므로, 삭제 API 호출 시 안내 메시지 필요.

---

## 5. 향후 개선 가이드

- **UI/UX 재구성**: “내 캐릭터” 페이지, 업로드 진행 표시, 오류 메시지, 새 동화 만들기 플로우를 디자인 가이드에 맞춰 전면 개편.
- **리소스 정리 배치**: modeling 실패/중단 시 남는 `/Users/kyj/testpicturedir` 파일, 생성된 오디오/이미지의 보존 기간을 정의.
- **문서화**: README/TODO 이외에 `docs/`에 API 흐름, 환경 설정, 배포 전략 문서를 추가.
- **보안 강화**: HTTPS 적용, JWT 만료/갱신 전략, 파일 업로드 검사, 사용자 데이터 파기 정책.
- **확장성**: 429 완화를 위해 큐(예: Redis) 도입, 혹은 OpenAI 이미지 모델과의 하이브리드 운영 검토.

---

## 6. 문의

이 레포지터리는 실험적 기능을 빠르게 검증하는 목적입니다. 구조/문서/CI가 지속적으로 변동될 수 있으니, 변경 사항을 발견하면 README/TODO를 함께 업데이트해 주세요. 💡
