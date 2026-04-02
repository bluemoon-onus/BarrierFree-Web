# AccessReader — AI-Powered Accessible eBook Reader

## Project Overview

시각장애인이 마우스만으로 웹사이트를 탐색하고, 전자책을 음성으로 들을 수 있는 MVP.
눈을 감고도 마우스 움직임 + 실시간 음성 안내만으로 모든 메뉴를 찾고 조작할 수 있다.

### Core Value Proposition
- **Zero Setup**: 브라우저(Chrome/Safari) + 스피커만 있으면 작동
- **Mouse-Only Navigation**: 화면을 5분면으로 나눠 직관적 음성 안내
- **AI Typo Correction**: 타이핑 → 엔터 → LLM이 오타 교정 → 음성 확인
- **eBook TTS**: 선택한 책을 음성으로 읽어줌

### Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **TTS Engine**: Web Speech API (SpeechSynthesis) — 무료, 플러그인 불요
- **LLM Backend**: Vercel API Route → Claude Haiku (오타 교정)
- **Deployment**: Vercel
- **Language**: English (v1), Korean (v1.1 roadmap)

---

## Stages

### ✅ Stage 0: Planning (설계) — Complete
- 요구사항 확정, 아키텍처 다이어그램
- 5-zone navigation model 정의
- TTS 음성 안내 문구 사전(dictionary) 설계
- 15개 작업 위임 계획 수립 (Codex / Claude CLI)

### ✅ Stage 1: Design (스캐폴딩 + 기본 설정) — Complete
- Next.js 14 App Router 초기화 (TypeScript, Tailwind CSS)
- `@anthropic-ai/sdk` 설치
- 고대비 색상 토큰 설정 (bg/text/accent/zone/highlight)
- 프로젝트 문서 구조 정비

### ✅ Stage 2: Features (기능 구현) — Complete
- `speechUtils.ts` — Web Speech API 래퍼 (priority, chunking, voice selection)
- `useTTS.ts` — React TTS 훅
- `useMouseZone.ts` — 5분면 마우스 존 감지 (idle, nearbyZones)
- `voiceDictionary.ts` — 전체 음성 안내 문구 사전
- `useKeyboardReader.ts` — 키보드 입력 + 실시간 TTS
- `/api/typo-check` — Claude Haiku 오타 교정 API Route (Edge Runtime)
- `TypingEditor.tsx` — 전체화면 검색 오버레이 (5-state machine)
- `BookReader.tsx` — 단락 순차 읽기 + 키보드 제어
- `page.tsx` — 메인 5분면 네비게이션 페이지
- `Onboarding.tsx` — 첫 방문 온보딩 TTS 가이드

### ✅ Stage 3: UI (접근성 스타일링) — Complete
- WCAG AAA 색상 대비 (7:1) 검증 및 수정
- Skip-to-content 링크 추가
- 전역 `:focus-visible` 스타일 (4px gold ring)
- `prefers-reduced-motion` / `prefers-contrast` 미디어 쿼리
- 모든 텍스트 최소 18px (text-lg) 적용
- 모든 인터랙티브 요소 44×44px 터치 타겟 보장
- `aria-live` 동적 리전, `role="status"`, `role="dialog"` 추가

### ✅ Stage 4: QA (검수) — Complete
- QA 테스트 플랜 90+ 시나리오 작성 (`docs/qa-test-plan.md`)
- 오타교정 API E2E 검증 (`docs/qa-e2e-report.md`)
- API 입력 검증(빈 값/초과/잘못된 JSON) 라이브 테스트 통과
- 전체 state machine 코드 레벨 추적 완료
- 치명적 버그 없음 확인

### ✅ Stage 5: Deploy (배포) — Complete
- `vercel.json` 생성
- `.env.example` 생성
- `.gitignore` 업데이트 (`.env`, `.env.local`)
- `README.md` 완성
- `docs/DEPLOYMENT.md` 작성

---

## v1.1 Roadmap (Post-MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| 🇰🇷 Korean TTS | `ko-KR` 음성 지원, voiceDictionary 한국어 번역 추가 | High |
| 🗃️ Supabase 사용자 설정 | 음성 속도/피치/볼륨 설정을 Supabase에 저장 | Medium |
| 🎛️ 음성 설정 UI | 속도·피치 슬라이더 오버레이 (Zone: Home 클릭 → 설정 패널) | Medium |
| 📱 모바일/태블릿 탐색 | 터치 제스처 기반 Zone 전환 탐색 | Medium |
| 📚 추가 eBook 콘텐츠 | 공개 도메인 도서 확대 (Project Gutenberg 연동) | Low |
| 🔊 다중 음성 선택 | 사용자가 TTS 음성을 선택하는 UI | Low |

---

## Work Delegation: Codex vs Claude

### 원칙
1. **Codex (OpenAI Codex Mac App)**: 순수 코딩, 파일 생성, 반복적 구현
2. **Claude CLI**: 설계 판단, 복잡한 로직 설계, 문서 생성, QA 검수
3. **순차 실행**: 병렬 아님. 한 에이전트 작업 완료 → 다음 에이전트 시작

### 완료된 작업 순서 (v1.0)

| # | 작업 | 담당 | 상태 |
|---|------|------|------|
| 1 | 프로젝트 스캐폴딩 + 설정파일 | Codex | ✅ |
| 2 | TTS 엔진 모듈 (speechUtils.ts) | Codex | ✅ |
| 3 | 마우스 트래킹 + 5분면 로직 (useMouseZone.ts) | Codex | ✅ |
| 4 | 음성 안내 문구 사전 (voiceDictionary.ts) | Claude CLI | ✅ |
| 5 | 키보드 입력 감지 + 읽기 (useKeyboardReader.ts) | Codex | ✅ |
| 6 | Claude Haiku 오타교정 API Route | Claude CLI | ✅ |
| 7 | 오타교정 UI 플로우 (TypingEditor.tsx) | Codex | ✅ |
| 8 | eBook 콘텐츠 + TTS 읽기 (BookReader.tsx) | Codex | ✅ |
| 9 | 메인 레이아웃 + 5분면 UI (page.tsx) | Codex | ✅ |
| 10 | 온보딩 음성 가이드 (Onboarding.tsx) | Codex | ✅ |
| 11 | 고대비 접근성 스타일링 | Claude CLI | ✅ |
| 12 | QA: 테스트 시나리오 작성 | Claude CLI | ✅ |
| 13 | QA: 오타교정 E2E 검증 | Claude CLI | ✅ |
| 14 | Vercel 배포 설정 + README | Codex | ✅ |
| 15 | 최종 문서 마무리 | Claude CLI | ✅ |

---

## 수동 작업 (사용자가 직접)
- Vercel 프로젝트 생성 + Git 연결
- Anthropic API 키 발급 → `vercel env add ANTHROPIC_API_KEY`
- 최종 브라우저 테스트 (실제 스피커로 음성 확인)
- 도메인 연결 (선택)
