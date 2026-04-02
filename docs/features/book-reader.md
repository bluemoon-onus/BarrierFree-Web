# Feature: Book Reader (BookReader.tsx)

## Overview
정적 eBook 콘텐츠를 TTS로 읽어주는 컴포넌트.
MVP에서는 3-5개의 공개 도메인 영어 단편/발췌를 포함.

## Book Data Structure
```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  paragraphs: string[];
}
```

## Static Content (public/books/)
MVP용 공개 도메인 작품 3개:
1. "Alice's Adventures in Wonderland" — Lewis Carroll (Ch.1 excerpt)
2. "The Gift of the Magi" — O. Henry (short story)
3. "Aesop's Fables" — Selected 5 fables

## Reading Controls
| Key | Action | Voice |
|-----|--------|-------|
| Space | Pause/Resume | "Paused." / "Resuming." |
| Escape | Stop & return | "Stopped reading. Returning to books." |
| → (Right) | Next paragraph | (reads next paragraph) |
| ← (Left) | Previous paragraph | "Going back." (reads previous) |

## TTS Reading Strategy
- 문단(paragraph) 단위로 읽기
- 각 문단을 문장 단위로 분할하여 SpeechSynthesisUtterance 큐에 넣기
- Chrome 15초 제한 우회를 위해 문장별 utterance 생성
- 문단 사이에 500ms 일시정지 (자연스러운 흐름)

## UI States
- `idle`: 책 목록 표시
- `reading`: 현재 읽고 있는 문단 하이라이트 (시각적 + 음성)
- `paused`: 일시정지 상태
