# AccessReader — AI-Powered Accessible eBook Reader

## Project Overview

시각장애인이 마우스만으로 웹사이트를 탐색하고, 전자책을 음성으로 들을 수 있는 MVP.
눈을 감고도 마우스 움직임 + 실시간 음성 안내만으로 모든 메뉴를 찾고 조작할 수 있다.

### Core Value Proposition
- **Zero Setup**: 브라우저(Chrome/Safari) + 스피커만 있으면 작동
- **Mouse-Only Navigation**: 화면을 4분면으로 나눠 직관적 음성 안내
- **AI Typo Correction**: 타이핑 → 엔터 → LLM이 오타 교정 → 음성 확인
- **eBook TTS**: 선택한 책을 음성으로 읽어줌

### Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **TTS Engine**: Web Speech API (SpeechSynthesis) — 무료, 플러그인 불요
- **LLM Backend**: Vercel API Route → Claude Haiku (오타 교정)
- **Deployment**: Vercel
- **Database**: Supabase (음성 설정 캐시용, 필요시)
- **Language**: English (v1), Korean (v2 roadmap)

---

## Stages

### Stage 1: Design (설계) — ~3h
- 요구사항 확정, 아키텍처 다이어그램
- 컴포넌트 구조 설계
- TTS 음성 안내 문구 사전(dictionary) 설계
- 마우스 4분면 좌표 로직 설계

### Stage 2: Features (기능 구현) — ~8h
- Next.js 프로젝트 스캐폴딩
- Web Speech API TTS 모듈
- 마우스 트래킹 + 4분면 판정 로직
- 마우스 정지 감지 → 위치 음성 안내
- 키보드 입력 감지 + 실시간 읽기
- 엔터키 → Claude Haiku 오타 교정 API
- 오타 교정 결과 음성 안내 + 확인/재입력 플로우
- eBook 콘텐츠 로딩 + TTS 읽기

### Stage 3: UI (UI 디자인) — ~4h
- 고대비(High Contrast) 접근성 UI
- 4분면 시각적 구분 (디버그/시연용)
- 반응형 데스크탑 레이아웃
- 첫 접속 온보딩 오버레이

### Stage 4: QA (검수) — ~3h
- Chrome (Windows/macOS) TTS 동작 확인
- Safari (macOS) TTS 동작 확인
- 키보드 내비게이션 테스트
- 오타 교정 플로우 E2E 테스트
- 스크린리더 호환성 기본 점검

### Stage 5: Deploy (배포) — ~2h
- Vercel 배포 설정
- 환경변수 (ANTHROPIC_API_KEY)
- 도메인 연결 (선택)
- README 작성

---

## Work Delegation: Codex vs Claude

### 원칙
1. **Codex (OpenAI Codex Mac App)**: 순수 코딩, 파일 생성, 반복적 구현
2. **Claude CLI**: 설계 판단, 복잡한 로직 설계, 문서 생성, QA 검수
3. **순차 실행**: 병렬 아님. 한 에이전트 작업 완료 → 다음 에이전트 시작

### 상세 작업 순서

| # | 작업 | 담당 | 예상시간 | 의존성 |
|---|------|------|----------|--------|
| 1 | 프로젝트 스캐폴딩 + 설정파일 | Codex | 30min | 없음 |
| 2 | TTS 엔진 모듈 (speechUtils.ts) | Codex | 45min | #1 |
| 3 | 마우스 트래킹 + 4분면 로직 (useMouseZone.ts) | Codex | 60min | #1 |
| 4 | 음성 안내 문구 사전 (voiceDictionary.ts) | Claude | 30min | #2 |
| 5 | 키보드 입력 감지 + 읽기 (useKeyboardReader.ts) | Codex | 45min | #2 |
| 6 | Claude Haiku 오타교정 API Route | Claude | 30min | #1 |
| 7 | 오타교정 UI 플로우 (TypingEditor.tsx) | Codex | 60min | #5,#6 |
| 8 | eBook 콘텐츠 + TTS 읽기 (BookReader.tsx) | Codex | 60min | #2 |
| 9 | 메인 레이아웃 + 4분면 UI (page.tsx) | Codex | 60min | #3,#4 |
| 10 | 온보딩 음성 가이드 (Onboarding.tsx) | Codex | 30min | #2,#9 |
| 11 | 고대비 접근성 스타일링 | Claude | 45min | #9 |
| 12 | QA: Chrome + Safari TTS 테스트 | Claude | 60min | #10 |
| 13 | QA: 오타교정 E2E 테스트 | Claude | 30min | #7 |
| 14 | Vercel 배포 + 환경변수 | Codex | 30min | #12,#13 |
| 15 | README + 최종 문서 | Claude | 30min | #14 |

---

## 자동화 vs 수동 작업 분류

### 자동화 (AI가 구현)
- Web Speech API TTS 모듈 전체
- 마우스 4분면 판정 로직
- 키보드 입력 감지 + 읽기
- Claude Haiku API 연동
- 음성 안내 문구 생성
- UI 컴포넌트 전체
- Vercel 배포 설정

### 수동 (사용자가 직접)
- Vercel 프로젝트 생성 + Git 연결
- Anthropic API 키 발급 → Vercel 환경변수 등록
- Supabase 프로젝트 생성 (필요시)
- 최종 브라우저 테스트 (실제 스피커로 음성 확인)
- 도메인 연결 (선택)

### ⚠️ 별도 음성 파일 불요
Web Speech API가 모든 음성을 실시간 생성합니다.
ElevenLabs, 사전 녹음 등 외부 오디오 소스가 필요하지 않습니다.
