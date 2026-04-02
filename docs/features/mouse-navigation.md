# Feature: Mouse Zone Navigation (useMouseZone.ts)

## Overview
뷰포트를 5개 존으로 나누고, 마우스 위치를 실시간 추적하여 음성으로 안내.

## 5 Zones
| Zone | Position | Action | Voice |
|------|----------|--------|-------|
| back | upper-left (x<50%, y<50%) | Navigate back | "Back zone. Click to go back." |
| forward | upper-right (x≥50%, y<50%) | Navigate forward | "Forward zone. Click to go forward." |
| books | lower-left (x<35%, y≥50%) | Book list | "Books zone. Click to browse books." |
| search | lower-right (x≥65%, y≥50%) | Search/typing | "Search zone. Click to search." |
| home | bottom-center (35%≤x<65%, y≥70%) | Home | "Home zone. Click to go home." |

## Hook Interface
```typescript
interface MouseZoneState {
  currentZone: Zone;
  previousZone: Zone | null;
  mouseX: number;
  mouseY: number;
  isIdle: boolean;       // true if mouse hasn't moved for 800ms
  nearbyZones: Zone[];   // adjacent zones for guidance
}

function useMouseZone(): MouseZoneState;
```

## Idle Detection
- `mousemove` 이벤트마다 타이머 리셋
- 800ms 동안 움직임 없으면 `isIdle: true` → 음성 안내 트리거
- 안내 내용: 현재 존 + 인접 존 방향

## Adjacent Zone Guidance
마우스가 멈추면 가장 가까운 다른 존 2개를 안내:
```
"You are in the Books zone.
 Move right for Home. Move up for Back."
```

## Performance
- `mousemove`는 `requestAnimationFrame`으로 스로틀링
- 존 변경시에만 음성 재생 (같은 존에서 반복 안내 방지)
- idle 안내는 한 번만 (마우스가 다시 움직이면 리셋)
