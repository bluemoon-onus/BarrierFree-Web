# BarrierFree-Web — Project Summary

## 프로젝트 개요 및 의의

**BarrierFree-Web**은 시각 장애인과 저시력 사용자를 위해 설계된 AI 기반 접근성 eBook 리더입니다.

기존 화면 낭독기(Screen Reader)는 OS 수준의 별도 소프트웨어 설치가 필요하고, 비장애인을 대상으로 설계된 일반 웹 UI를 그대로 보조 기술로 처리하는 방식입니다. BarrierFree-Web은 접근성을 처음부터 핵심 UX로 설계했습니다:

- **마우스 5구역 네비게이션**: 화면 좌표 기반 zone 감지 → 마우스를 멈추면 현재 구역과 인접 구역을 음성으로 안내
- **OpenAI 고품질 TTS**: 브라우저 내장 SpeechSynthesis 대신 OpenAI TTS API(nova 보이스)를 사용해 자연스럽고 일관된 음성 제공
- **AI 오타 교정**: 검색 입력 시 Claude Haiku가 오타를 감지하고 수정안을 음성으로 제안
- **소설 순차 낭독**: 단락 → 문장 단위 TTS 재생, 키보드로 완전한 제어 가능

시각적 의존도를 최소화한 "눈을 감고 사용하는 웹"을 목표로 하며, WCAG AAA 기준(7:1 명암비, 44px 터치 타겟, 18px+ 텍스트)을 준수합니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript (strict mode) |
| 스타일링 | Tailwind CSS (고대비 테마) |
| TTS | OpenAI TTS API (`tts-1`, `tts-1-hd`) |
| AI 오타교정 | Anthropic Claude Haiku (`@anthropic-ai/sdk`) |
| 배포 | Vercel (Edge Function + Node Runtime) |
| 분석 | Vercel Analytics |
| 오디오 재생 | HTMLAudioElement + MP3 (blob cache) |

---

## 사용된 AI 기능과 컨셉

### 1. OpenAI TTS — 음성 합성
- **모델**: `tts-1` (기본, 저지연) / `tts-1-hd` (고품질)
- **보이스**: `nova` (기본값), `alloy`, `ash`, `coral`, `echo`, `fable`, `onyx`, `sage`, `shimmer`
- **API Route**: `POST /api/tts` → MP3 바이너리 반환
- **3단계 캐싱**:
  1. 인메모리 blob 캐시 (현재 세션, 즉시)
  2. 정적 사전생성 파일 (`/audio/manifest.json`, CDN 서빙)
  3. 동적 API 호출 (fallback, ~300ms)
- **사전생성 파이프라인**: `scripts/generate-audio.mjs`가 주요 UI 문구와 책 ch1~ch2 문장을 미리 MP3로 변환해 `/public/audio/`에 저장

### 2. Anthropic Claude Haiku — 오타 교정
- **API Route**: `POST /api/typo-check` (Edge Runtime)
- 사용자가 검색창에 입력 후 Enter → 텍스트를 Claude Haiku에 전송 → 오타 여부 + 교정안 반환
- 응답 구조: `{ hasTypo, original, corrected, explanation }`
- 교정 결과는 TTS로 음성 안내: "Did you mean 'apple' instead of 'aplle'?"

### 3. 음성 우선 UX 설계 컨셉
- 모든 인터랙션(마우스 이동, 키 입력, 페이지 전환)에 즉각적 음성 피드백
- `voiceDictionary.ts`에 모든 UI 문구 중앙화 — 컴포넌트에 하드코딩 금지
- `priority: 'high'` 옵션으로 긴급 음성(오류, 네비게이션)이 진행 중 음성을 즉시 중단하고 재생

---

## 하이레벨 디렉토리 구조

```
BarrierFree-Web/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 메인 앱 (WELCOME → LIBRARY → READING 상태 머신)
│   │   ├── layout.tsx                # 전역 레이아웃, Vercel Analytics
│   │   └── api/
│   │       ├── tts/route.ts          # OpenAI TTS API 래퍼
│   │       └── typo-check/route.ts   # Claude Haiku 오타교정 (Edge Function)
│   ├── components/
│   │   ├── BookReader.tsx            # 소설 낭독 UI (문장 단위 TTS + 키보드 제어)
│   │   ├── TypingEditor.tsx          # 검색 입력 + 오타교정 UI
│   │   ├── Onboarding.tsx            # 첫 진입 안내 컴포넌트
│   │   ├── MouseZoneOverlay.tsx      # 5구역 마우스 오버레이 (시각적 디버그)
│   │   ├── NavigationBar.tsx         # 책 목록 네비게이션
│   │   └── SettingsButton.tsx        # 우하단 설정 패널 (보이스/모델 선택)
│   ├── hooks/
│   │   ├── useTTS.ts                 # TTS 상태 + speak/stop/pause React 훅
│   │   ├── useMouseZone.ts           # 5구역 마우스 감지 + 800ms 유휴 감지
│   │   └── useKeyboardReader.ts      # 키스트로크 → TTS 피드백 (4-상태 머신)
│   └── lib/
│       ├── speechUtils.ts            # TTS 핵심 모듈 (캐싱, 재생, 사전생성)
│       ├── voiceDictionary.ts        # 모든 UI 음성 문구 중앙 관리
│       ├── books.ts                  # 책 목록 로더 (books.json)
│       └── bookParser.ts             # .txt 파일 → 챕터/문장 파서
├── public/
│   ├── books/
│   │   ├── books.json                # 책 메타데이터 (4권, 챕터 인덱스)
│   │   └── *.txt                     # 원본 eBook 텍스트
│   └── audio/
│       ├── manifest.json             # 사전생성 MP3 매핑 테이블
│       └── *.mp3                     # 사전생성 오디오 파일
├── scripts/
│   └── generate-audio.mjs            # OpenAI TTS 사전생성 스크립트
├── docs/
│   ├── summary.md                    # 이 파일
│   ├── CHANGELOG.md                  # 스테이지별 변경 이력
│   ├── ROADMAP.md                    # 마스터 로드맵
│   ├── design/architecture.md        # 시스템 아키텍처 + 구역 모델
│   └── features/                     # 기능별 상세 문서
├── AGENTS.md                         # Codex 에이전트 설정
└── claude.md                         # Claude CLI 에이전트 설정
```

---

## 주요 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-02 | **Stage 0**: 프로젝트 기획 · 아키텍처 설계 · 에이전트 역할 정의 |
| 2026-04-02 | **Stage 1**: Next.js 14 스캐폴딩, Tailwind 고대비 테마, 문서 구조 |
| 2026-04-02 | **Stage 2**: TTS 엔진(speechUtils), useMouseZone, 음성 사전(voiceDictionary), useKeyboardReader, /api/typo-check (Claude Haiku) |
| 2026-04-02 | **Stage 3**: 마우스 5구역 네비게이션 UI, BookReader (단락 낭독), TypingEditor (오타교정 플로우) |
| 2026-04-02 | **v1.0**: QA 완료, WCAG AAA 검증, Vercel 배포 설정, 실서비스 준비 |
| 2026-04-02 | **Post-v1.0**: TTS 엔진을 Web Speech API → **OpenAI TTS API**로 전면 교체 · 3단계 오디오 캐싱 구조 도입 · 사전생성 파이프라인 구축 |
| 2026-04-02 | **Post-v1.0**: 베타 제한(ch3+), 문장 분할 알고리즘, 도서관 검색 UI, 화살표 키 네비게이션, 문장 사전 로딩(±3) |

---

## 현재 서비스 상태

- **베타 제한**: 챕터 1~2만 접근 가능 (챕터 3+ → "End of Beta Service" 안내)
- **제공 도서 (4권)**:
  - *Frankenstein; or, the modern prometheus* — Mary Shelley
  - *Alice's Adventures in Wonderland* — Lewis Carroll
  - *The Adventures of Sherlock Holmes* — Arthur Conan Doyle
  - *Pride and Prejudice* — Jane Austen
- **배포**: Vercel (환경변수 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` 필요)
