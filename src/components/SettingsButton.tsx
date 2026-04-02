'use client';

import { useEffect, useRef, useState } from 'react';

export interface SettingsButtonProps {
  onReplayGuide: () => void;
  onToggleDebug?: () => void;
}

export function SettingsButton({
  onReplayGuide,
  onToggleDebug,
}: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function openPanel() {
    setIsOpen(true);
  }

  function closePanel() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closePanel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    // Move focus into the panel
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Settings panel"
          className="mb-3 rounded-2xl border border-access-accent/40 bg-access-zone px-5 py-5 shadow-[0_0_0_1px_rgba(255,215,0,0.12)] backdrop-blur"
        >
          <h2 className="text-lg font-semibold uppercase tracking-widest text-access-accent">
            About AccessReader
          </h2>
          <p className="mt-2 text-lg text-access-text/70">
            AI-powered accessible eBook reader.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              aria-label="Replay voice guide"
              className="min-h-[44px] rounded-xl border border-access-highlight/40 bg-access-highlight/10 px-4 text-lg font-medium text-access-highlight transition hover:bg-access-highlight/20 focus-visible:outline focus-visible:outline-4 focus-visible:outline-access-highlight"
              onClick={() => {
                closePanel();
                onReplayGuide();
              }}
            >
              Replay voice guide
            </button>

            {onToggleDebug !== undefined ? (
              <button
                type="button"
                aria-label="Toggle debug overlay"
                className="min-h-[44px] rounded-xl border border-access-text/20 px-4 text-lg font-medium text-access-text/70 transition hover:border-access-accent/40 hover:text-access-text focus-visible:outline focus-visible:outline-4 focus-visible:outline-access-highlight"
                onClick={() => {
                  closePanel();
                  onToggleDebug();
                }}
              >
                Toggle debug overlay
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-label="Open settings"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-access-accent/40 bg-access-zone text-2xl text-access-accent shadow-md transition hover:border-access-accent hover:bg-access-accent/10 focus-visible:outline focus-visible:outline-4 focus-visible:outline-access-highlight"
        onClick={() => {
          if (isOpen) {
            closePanel();
          } else {
            openPanel();
          }
        }}
      >
        ⚙
      </button>
    </div>
  );
}
