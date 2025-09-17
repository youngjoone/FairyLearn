# 신규 기능: 카카오 소셜 로그인 추가 (수정된 최종 계획)

## 1. 사전 준비: 카카오 개발자 설정

*   **[완료]** [카카오 개발자](https://developers.kakao.com/)에서 애플리케이션 생성
*   **[완료]** **REST API 키** 및 **Client Secret** 확보
*   **[확인 필요]** 카카오 로그인 활성화 및 Redirect URI 등록: `http://localhost:8080/login/oauth2/code/kakao`
*   **[확인 필요]** 동의항목 설정: **프로필 정보(닉네임)**, **카카오계정(이메일)** 필수 동의

## 2. 백엔드 개발 계획 (Spring Boot)

*   **`backend/src/main/resources/application-local.yml` 수정:**
    *   [ ] `spring.security.oauth2.client.registration.kakao` 설정 추가
    *   [ ] `spring.security.oauth2.client.provider.kakao` 설정 추가
*   **`backend/src/main/java/com/fairylearn/backend/auth/CustomOAuth2UserService.java` 수정:**
    *   [ ] `loadUser` 메소드에 `kakao` 분기 추가하여 응답 정규화
*   **`backend/src/main/java/com/fairylearn/backend/auth/OAuthAttributes.java` 수정:**
    *   [ ] `of()` 메소드에 `kakao` 분기 추가
    *   [ ] `ofKakao()` 메소드 구현 (정규화된 attributes 사용)

## 3. 프론트엔드 개발 계획 (React)

*   **`frontend/src/pages/Login.tsx` 수정:**
    *   [ ] "카카오로 로그인" 버튼 UI 추가
    *   [ ] 백엔드 카카오 로그인 URL (`/oauth2/authorization/kakao`)로 링크
