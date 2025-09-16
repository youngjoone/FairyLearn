## 구글 소셜 로그인 기능 추가 (Google Social Login) - 통합 계획

### 0. 문제점 요약 및 핵심 전략 (사용자 피드백 반영)

*   **문제점 요약**:
    *   인증 객체 타입 불일치 (`ClassCastException`): 구글(OIDC)과 네이버(OAuth2)는 로그인 후 생성하는 Spring Security의 Principal 객체 타입이 다름.
    *   DB 트랜잭션 경합 (`UsernameNotFoundException`): 로그인으로 사용자가 DB에 저장되는 트랜잭션이 끝나기 전에, 후속 API 요청에서 해당 사용자를 조회하려다 실패하는 경합 상태 발생.
    *   잘못된 리팩토링으로 인한 부작용: `JwtAuthFilter`에서 DB 조회를 없애고 Principal을 `String`으로 변경했으나, 컨트롤러는 `User` 객체를 기대하여 `NullPointerException` 발생. `JwtProvider` 메소드 시그니처 변경으로 컴파일 에러 발생.
*   **핵심 전략**: `JwtAuthFilter`가 DB에 접근하지 않도록 하여, 트랜잭션 경합 문제를 원천적으로 차단. JWT 토큰이 인증에 필요한 모든 정보를 갖도록 함.

### 1. Google Cloud Platform 설정

*   [ ] Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
*   [ ] **클라이언트 ID** 및 **클라이언트 보안 비밀** 확보
*   [ ] 승인된 리디렉션 URI 추가: `http://localhost:8080/login/oauth2/code/google`

### 2. 백엔드 (Spring Boot) 수정

*   **일반 원칙 (사용자 피드백 반영):**
    *   **Principal DTO 사용**: DB 조회 제거는 OK. 하지만 “무거운 JPA 엔티티”를 Principal로 쓰지 말고, 컨트롤러에서 `@AuthenticationPrincipal User` (JPA 엔티티) 대신 가벼운 Principal DTO (예: `AuthPrincipal(id, email, authorities)`)를 사용. 엔티티는 영속성/지연로딩/동등성 이슈를 유발할 수 있음.
    *   **내부 JWT 발급**: 구글의 `id_token`을 그대로 신뢰하지 말고, 성공 핸들러에서 DB upsert 후 우리 서버가 발급한 내부 JWT를 발급. 이때 claim은 최소화: `sub=내부 userId`, `email`, `roles` 정도.
    *   **권한/계정 상태 변경 전파 문제 해결**:
        *   접근 토큰 TTL을 짧게(예: 10~15분) 설정.
        *   (선택) `tokenVersion` claim을 두고, 리프레시 시 DB의 `token_version`과 비교해 갱신/무효화.
    *   **최초 로그인 upsert 유일성 제약**:
        *   중복 생성 방지를 위해 `User` 엔티티에 `provider`, `provider_id` 필드 추가 및 `UNIQUE (provider, provider_id)` 제약 조건 설정.
        *   `email` 필드에 `UNIQUE INDEX lower(email)` (이메일 소문자 정규화) 설정.
        *   성공 핸들러에서 `saveAndFlush()`로 커밋 보장 후 JWT 생성/리다이렉트.
    *   **OIDC vs OAuth2 차이 처리**: `OAuth2SuccessHandler`에서 `authentication.getPrincipal()`은 **공통 인터페이스 `OAuth2User`**로 다루고, `oauth2Login().userInfoEndpoint()`에 **`oidcUserService(구글)`**와 **`userService(네이버)`**를 각각 등록해서 속성 매핑을 “한 타입으로” 통일 (예: `DefaultOAuth2User`).

*   **파일**: `backend/src/main/resources/application.yml`
    *   [ ] `spring.security.oauth2.client.registration.google` 설정 추가 (클라이언트 ID, 보안 비밀 등)

*   **파일**: `backend/src/main/java/com/fairylearn/backend/auth/OAuthAttributes.java`
    *   [ ] `of()` 메소드에 `google` case 추가하여 구글 사용자 정보 매핑 로직 구현

*   **파일**: `backend/src/main/java/com/fairylearn/backend/config/SecurityConfig.java`
    *   [ ] `.oauth2Login()` 설정 검토 및 필요시 수정. 특히 `userInfoEndpoint()` 설정에 `oidcUserService`와 `userService`를 등록하여 `OAuth2User` 타입 통일.

*   **파일**: `backend/src/main/java/com/fairylearn/backend/auth/OAuth2SuccessHandler.java`
    *   [ ] 로그인 성공 후, `authentication.getPrincipal()`을 통해 얻은 정보로 DB에서 `User` 엔티티를 조회합니다. (이 시점의 DB 조회는 트랜잭션이 완료된 후이므로 안전합니다.)
    *   [ ] 조회한 `User` 객체 전체를 `jwtProvider.generateToken(user)`에 넘겨 토큰을 생성합니다.
    *   [ ] 성공 핸들러에서 `saveAndFlush()`로 커밋 보장 후 JWT 생성/리다이렉트.
    *   [ ] 프론트엔드 콜백 URL (`/auth/callback`)로 정상적으로 리다이렉션 되는지 확인.

*   **파일**: `JwtProvider.java`
    *   [ ] `generateToken` 메소드가 `User` 객체를 받아, 사용자 ID, 이메일, 역할을 Claim으로 추가하여 토큰을 생성하도록 수정합니다.
    *   [ ] 기존 코드와의 호환성을 위해, 이메일(`String`)만 받는 `generateToken` 오버로딩 메소드도 유지합니다.
    *   [ ] JWT 토큰의 Payload에 **사용자 ID** (`userId` claim), **사용자 이메일** (`sub` claim), **사용자 역할** (`roles` claim)을 필수로 포함.
    *   [ ] 접근 토큰 TTL을 짧게(예: 10~15분) 설정.

*   **파일**: `JwtAuthFilter.java`
    *   [ ] **DB 조회 로직을 완전히 제거합니다.**
    *   [ ] 토큰 유효성 검증 후, `jwtProvider`를 통해 토큰에서 `userId`, `email`, `roles` Claim을 직접 추출합니다.
    *   [ ] 추출한 정보로 `AuthPrincipal` DTO 객체를 **직접 생성**합니다. (DB 조회가 아닌, new 또는 builder 사용)
        *   **주의**: `User` 엔티티의 Builder가 `id`를 설정하지 못하므로, `id`를 설정할 수 있는 생성자나 별도의 Setter가 필요할 수 있습니다. 이 부분은 `User` 엔티티 구조 확인 후 진행해야 합니다.
    *   [ ] 생성된 `AuthPrincipal` 객체를 `UsernamePasswordAuthenticationToken`의 Principal로 설정합니다.

*   **파일**: `StoryController.java` 및 다른 컨트롤러
    *   [ ] 기존 코드(롤백된 상태)를 그대로 유지합니다. `@AuthenticationPrincipal AuthPrincipal authPrincipal` 어노테이션이 `JwtAuthFilter`에서 생성한 `AuthPrincipal` 객체를 정상적으로 주입받게 됩니다. (여기서 `User` 대신 `AuthPrincipal` 사용)

*   **데이터베이스 스키마 (엔티티/리포지토리)**
    *   [ ] `User` 엔티티에 `provider`, `provider_id` 필드 추가 및 `UNIQUE (provider, provider_id)` 제약 조건 설정.
    *   [ ] `User` 엔티티의 `email` 필드에 `UNIQUE INDEX lower(email)` 설정.

### 3. 프론트엔드 (React) 수정

*   **파일**: `frontend/src/pages/Login.tsx`
    *   [ ] "Google로 로그인" 버튼 UI 추가
    *   [ ] 버튼 클릭 시 백엔드 로그인 URL (`/oauth2/authorization/google`)로 이동하는 링크 구현
*   **파일**: `frontend/src/pages/AuthCallback.tsx`
    *   [ ] URL 쿼리 파라미터에서 JWT 토큰 추출하는 로직 구현
    *   [ ] 추출한 토큰을 `localStorage`에 저장
*   **파일**: `frontend/src/contexts/AuthContext.tsx`
    *   [ ] 토큰 저장 후, 사용자 인증 상태를 전역적으로 업데이트하는 로직 호출

---

## 구현 포인트 (코드 스니펫 및 상세 설명)

### 1) 가벼운 Principal 정의
```java
public record AuthPrincipal(Long id, String email, Collection<? extends GrantedAuthority> authorities) {}
```

### 2) JwtProvider – 내부 JWT 생성
```java
public String generateToken(User user) {
    Instant now = Instant.now();
    return Jwts.builder()
        .setSubject(String.valueOf(user.getId()))          // sub = 내부 userId
        .claim("email", user.getEmail())
        .claim("roles", user.getRoles())                   // ["USER","ADMIN"] 등
        .setIssuedAt(Date.from(now))
        .setExpiration(Date.from(now.plus(15, ChronoUnit.MINUTES)))
        .signWith(signingKey, SignatureAlgorithm.HS256)    // 키 로테이션 계획 필수
        .compact();
}
```

### 3) JwtAuthFilter – DB 없이 Principal 구성
```java
Claims claims = jwtProvider.parse(token);
Long userId = Long.valueOf(claims.getSubject());
String email = claims.get("email", String.class);
List<String> roles = claims.get("roles", List.class);
var authorities = roles.stream()
    .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
    .toList();

var principal = new AuthPrincipal(userId, email, authorities);
var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);

var ctx = SecurityContextHolder.createEmptyContext();
ctx.setAuthentication(auth);
SecurityContextHolder.setContext(ctx);

filterChain.doFilter(request, response);
```

### 4) OAuth2SuccessHandler – upsert 후 내부 JWT 발급
```java
 @Override
public void onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication authentication) throws IOException {
    var oauthToken = (OAuth2AuthenticationToken) authentication;
    var oauth2User = (OAuth2User) oauthToken.getPrincipal();
    var provider = oauthToken.getAuthorizedClientRegistrationId(); // "google" / "naver"

    String providerId = resolveProviderId(provider, oauth2User);   // google: "sub"
    String email = (String) oauth2User.getAttributes().get("email");

    User user = userService.upsertFromOAuth(provider, providerId, email); // @Transactional + saveAndFlush
    String jwt = jwtProvider.generateToken(user);

    String redirect = frontendBaseUrl + "/auth/callback#token=" + URLEncoder.encode(jwt, StandardCharsets.UTF_8);
    res.sendRedirect(redirect); // 쿼리 대신 fragment 사용 권장(로그/리퍼러 노출 완화)
}
```

### 5) SecurityConfig 요지
```java
http.csrf(csrf -> csrf.disable())
    .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    .securityContext(sc -> sc.securityContextRepository(new NullSecurityContextRepository()))
    .oauth2Login(oauth -> oauth
        .userInfoEndpoint(ui -> ui
            .oidcUserService(customOidcUserService())   // 구글
            .userService(customOAuth2UserService()))    // 네이버
        .successHandler(oAuth2SuccessHandler))
    .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
```

### 프론트/콜백 관련 팁

*   백엔드 리다이렉트 시 쿼리 대신 URL fragment(`/ #token=...`) 사용 → 서버/로그에 토큰 잔류 위험 완화.
*   React AuthCallback에서는 `window.location.hash`에서 토큰 파싱.
*   CORS/리다이렉트 오리진(로컬/운영) 환경변수로 분리.

### DB 스키마/정합성 체크리스트

*   `ALTER TABLE users ADD CONSTRAINT uq_user_provider UNIQUE (provider, provider_id);`
*   `CREATE UNIQUE INDEX uq_user_email_lower ON users (lower(email));`
*   서비스 레벨에서 `email = email.trim().toLowerCase()` 일관화.

### 결론

지금 제안하신 “필터에서 DB 제거 + 내부 JWT로 인증 재구성”은 옳은 방향입니다.

대신 가벼운 Principal, 짧은 토큰 TTL(+선택적 리프레시/버전 관리), 유일성 제약 & `saveAndFlush`, OIDC/OAuth2 통합 매핑을 반드시 곁들이면 안정적으로 돌아갑니다.

컨트롤러는 `@AuthenticationPrincipal AuthPrincipal principal`로 바꾸고, 정말 필요한 곳만 서비스에서 엔티티를 로드하세요.