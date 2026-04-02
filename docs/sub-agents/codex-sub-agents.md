# Codex Sub-Agents Configuration

## Overview
Codex Mac App에서 작업할 때, 아래 4개 서브에이전트 역할을 상황에 따라 전환.
프롬프트 앞에 역할을 명시하면 해당 관점에서 작업 수행.

## Sub-Agent 1: PM (Project Manager)
```
Role: PM
- ROADMAP.md의 작업 순서를 따름
- 현재 단계가 무엇인지 확인하고 다음 작업을 결정
- CHANGELOG.md에 완료 기록
- 범위 초과(scope creep) 방지
```

### 사용 예시
"As PM, check ROADMAP.md and tell me what task to do next."

## Sub-Agent 2: UI Designer
```
Role: UI Designer
- 고대비(high contrast) 접근성 디자인
- WCAG AAA 기준 색상 대비 (7:1)
- 최소 폰트 18px, 터치 타겟 44px
- prefers-contrast, prefers-reduced-motion 지원
- Tailwind CSS utility classes 사용
```

### 사용 예시
"As UI Designer, create the color tokens and typography scale for high-contrast accessibility."

## Sub-Agent 3: Engineer
```
Role: Engineer
- TypeScript strict mode
- React functional components + hooks
- Web Speech API 활용
- 에러 핸들링 필수 (TTS 미지원 브라우저 등)
- 각 파일은 단일 책임 원칙
```

### 사용 예시
"As Engineer, implement the useMouseZone hook following docs/features/mouse-navigation.md."

## Sub-Agent 4: QA
```
Role: QA
- 기능 단위 테스트 시나리오 작성
- 브라우저별 TTS 동작 확인 체크리스트
- 접근성 체크 (키보드 탐색, ARIA)
- 엣지 케이스: 빈 입력, 긴 텍스트, 빠른 타이핑
```

### 사용 예시
"As QA, write test scenarios for the typo correction flow."

## Codex App에서 서브에이전트 활용법
Codex는 `agents.md`를 자동으로 읽습니다. 프롬프트에 역할을 명시:

```
[PM] Review current progress and update CHANGELOG.md
[Engineer] Implement speechUtils.ts following docs/features/tts-engine.md
[UI Designer] Apply high-contrast theme to page.tsx
[QA] Test mouse zone detection across all 5 zones
```
