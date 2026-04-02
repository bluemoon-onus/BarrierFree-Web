'use client';

export interface NavigationBarProps {
  currentViewLabel: string;
  onReplayGuide: () => void;
}

export default function NavigationBar({
  currentViewLabel,
  onReplayGuide,
}: NavigationBarProps) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 px-4 py-4 sm:px-6">
      <div className="pointer-events-auto mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-access-accent/30 bg-access-bg/88 px-4 py-3 shadow-[0_0_0_1px_rgba(255,215,0,0.12)] backdrop-blur sm:px-6">
        <div className="min-w-0">
          <p className="text-lg uppercase tracking-[0.26em] text-access-accent/80">
            BarrierFree-Web
          </p>
          <p className="mt-1 truncate text-lg text-access-text/78">
            Current view: {currentViewLabel}
          </p>
        </div>

        <button
          type="button"
          aria-label="Replay onboarding guide"
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-full border border-access-highlight/45 bg-access-highlight/10 px-5 text-lg font-medium text-access-highlight transition hover:bg-access-highlight/16 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-access-highlight motion-reduce:transition-none"
          onClick={onReplayGuide}
        >
          Replay Guide
        </button>
      </div>
    </header>
  );
}
