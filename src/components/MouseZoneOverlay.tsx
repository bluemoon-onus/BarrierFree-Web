'use client';

import type { Zone } from '@/hooks/useMouseZone';

export interface MouseZoneOverlayProps {
  currentZone: Zone;
  mousePosition: { x: number; y: number };
  isVisible: boolean;
}

const ZONE_LABELS: Record<Zone, string> = {
  back: 'Back',
  forward: 'Forward',
  books: 'Books',
  search: 'Search',
  home: 'Home',
};

const ZONE_POSITIONS: Record<Zone, string> = {
  back: 'left-0 top-0 h-1/2 w-1/2',
  forward: 'right-0 top-0 h-1/2 w-1/2',
  books: 'left-0 top-1/2 h-1/2 w-[35%]',
  search: 'right-0 top-1/2 h-1/2 w-[35%]',
  home: 'left-[35%] top-[70%] h-[30%] w-[30%]',
};

const LABEL_POSITIONS: Record<Zone, string> = {
  back: 'left-[12%] top-[18%]',
  forward: 'right-[12%] top-[18%]',
  books: 'left-[8%] top-[72%]',
  search: 'right-[8%] top-[72%]',
  home: 'left-1/2 top-[84%] -translate-x-1/2',
};

export default function MouseZoneOverlay({
  currentZone,
  mousePosition,
  isVisible,
}: MouseZoneOverlayProps) {
  if (!isVisible) {
    return null;
  }

  const hasPointerMoved = mousePosition.x > 0 || mousePosition.y > 0;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20"
      aria-hidden="true"
    >
      {(Object.keys(ZONE_POSITIONS) as Zone[]).map((zone) => (
        <div
          key={zone}
          className={[
            'absolute rounded-[1.5rem] border transition-colors',
            ZONE_POSITIONS[zone],
            currentZone === zone
              ? 'border-access-highlight/80 bg-access-highlight/5 shadow-[0_0_0_1px_rgba(0,255,136,0.35)]'
              : 'border-access-text/15 bg-transparent',
          ].join(' ')}
        />
      ))}

      {(Object.keys(LABEL_POSITIONS) as Zone[]).map((zone) => (
        <div
          key={`${zone}-label`}
          className={[
            'absolute rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em]',
            LABEL_POSITIONS[zone],
            currentZone === zone
              ? 'border-access-highlight/70 bg-access-highlight/15 text-access-highlight'
              : 'border-access-accent/25 bg-access-bg/60 text-access-accent/85',
          ].join(' ')}
        >
          {ZONE_LABELS[zone]}
        </div>
      ))}

      <div className="absolute right-5 top-5 rounded-full border border-access-highlight/35 bg-access-bg/85 px-4 py-2 text-xs uppercase tracking-[0.24em] text-access-highlight shadow-[0_0_0_1px_rgba(0,255,136,0.18)]">
        Debug Overlay
      </div>

      {hasPointerMoved ? (
        <div
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-access-bg bg-access-highlight shadow-[0_0_18px_rgba(0,255,136,0.55)]"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
          }}
        />
      ) : null}
    </div>
  );
}
