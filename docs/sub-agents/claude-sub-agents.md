# Claude CLI Sub-Agents Configuration

## Overview
Claude CLI에서 작업할 때 사용하는 4개 서브에이전트.
Claude Code는 `/chat` 모드에서 서브에이전트 역할 전환 가능.

## Claude CLI에서 서브에이전트 활용법

### 방법 1: 프롬프트 앞에 역할 명시
```bash
claude "As PM, review the current progress in CHANGELOG.md and tell me what's next."
claude "As QA, test the TTS output in the browser and document any issues."
```

### 방법 2: claude.md에 이미 역할이 정의됨
Claude CLI는 프로젝트 루트의 `claude.md`를 자동으로 참조합니다.
각 프롬프트에서 역할을 명시하면 해당 관점에서 응답합니다.

## Sub-Agent 1: PM
- ROADMAP.md 진행 상황 추적
- CHANGELOG.md 업데이트
- Codex ↔ Claude 전환 시점 결정
- 다음 작업 프롬프트 생성

## Sub-Agent 2: UI Designer
- 접근성 색상 토큰 정의
- 컴포넌트 스타일 리뷰
- 고대비 모드 검증
- 레이아웃 접근성 감사

## Sub-Agent 3: Engineer
- API Route 구현 (typo-check)
- 복잡한 훅 로직 설계
- voiceDictionary.ts 콘텐츠 작성
- speechUtils.ts 고급 로직 (큐, 우선순위)

## Sub-Agent 4: QA
- 크로스 브라우저 TTS 테스트
- E2E 플로우 검증
- ARIA/접근성 감사
- 엣지 케이스 문서화

## Handoff 문서 작성 규칙
Claude가 작업을 완료하고 Codex에게 넘길 때:
```markdown
## Handoff to Codex — [날짜/단계]
### Completed
- [완료된 파일/작업 목록]
### Next for Codex
- [Codex가 해야 할 작업]
### Files Modified
- [수정된 파일 경로]
### Notes
- [주의사항, 알려진 이슈]
```
