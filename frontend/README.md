이 디렉토리는 React 프로젝트입니다.

## 디자인 시스템 및 공통 UI 컴포넌트

이 프로젝트는 Tailwind CSS를 기반으로 한 디자인 시스템과 재사용 가능한 공통 UI 컴포넌트를 사용하여 일관된 사용자 경험과 빠른 개발 속도를 제공합니다.

### 디자인 토큰

`tailwind.config.ts` 파일에 정의된 주요 디자인 토큰은 다음과 같습니다.

| 토큰 그룹 | 예시 값 | 설명 |
| :-------- | :------ | :--- |
| **컬러**  | `primary`, `background`, `muted`, `card` | 애플리케이션의 주요 색상 팔레트 |
| **폰트**  | `sans` (Inter) | 기본 폰트 패밀리 |
| **라운드값** | `r-2xl` (1rem) | 컴포넌트의 모서리 둥글기 |

### 컴포넌트 사용 예시

#### Button

다양한 스타일과 크기, 로딩 상태를 지원하는 버튼 컴포넌트입니다.

```tsx
import { Button } from './src/components/ui/Button';

function App() {
  return (
    <>
      <Button>기본 버튼</Button>
      <Button variant="outline">외곽선 버튼</Button>
      <Button variant="ghost" size="sm">작은 고스트 버튼</Button>
      <Button isLoading>로딩 중...</Button>
    </>
  );
}
```

#### RadioLikert

리커트 척도(Likert scale)를 위한 라디오 버튼 그룹 컴포넌트입니다.

```tsx
import RadioLikert from './src/components/ui/FormControls/RadioLikert';
import React, { useState } from 'react';

function MyComponent() {
  const [answer, setAnswer] = useState(3);
  return (
    <RadioLikert
      name="question1"
      value={answer}
      onChange={setAnswer}
      options={[1, 2, 3, 4, 5]}
    />
  );
}
```

### 다크모드 토글

애플리케이션은 `html` 태그에 `dark` 클래스를 토글하여 다크/라이트 모드를 전환합니다. 사용자의 시스템 설정(`prefers-color-scheme`)을 초기값으로 사용하며, 테마 선택은 로컬 스토리지에 저장됩니다.

헤더에 있는 토글 버튼을 통해 테마를 변경할 수 있습니다.

### 접근성 (Accessibility, A11y) 체크리스트

*   **의미론적 HTML:** 가능한 한 의미론적인 HTML 태그를 사용합니다.
*   **키보드 접근성:** 모든 인터랙티브 요소는 키보드로 접근 가능하며, `focus-visible` 스타일을 제공합니다.
*   **ARIA 속성:** 필요한 경우 `aria-*` 속성과 `role`을 사용하여 스크린 리더 사용자에게 추가 정보를 제공합니다.
*   **이미지 `alt` 텍스트:** 모든 `<img>` 태그에는 의미 있는 `alt` 텍스트를 포함합니다.
