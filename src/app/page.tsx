'use client';

import { useEffect, useRef, useState } from 'react';

import BookReader from '@/components/BookReader';
import MouseZoneOverlay from '@/components/MouseZoneOverlay';
import TypingEditor from '@/components/TypingEditor';
import { type Book, loadBooks } from '@/lib/books';
import { type Zone, useMouseZone } from '@/hooks/useMouseZone';
import { useTTS } from '@/hooks/useTTS';
import voiceDictionary from '@/lib/voiceDictionary';

type ViewState = 'DEFAULT' | 'BOOKS' | 'READING' | 'SEARCH';
type BookLoadState = 'loading' | 'ready' | 'error';

type ZoneCard = {
  title: string;
  subtitle: string;
  positionClassName: string;
  alignClassName: string;
  ariaLabel: string;
};

const ZONE_CARDS: Record<Zone, ZoneCard> = {
  back: {
    title: 'Back',
    subtitle: 'Return to the previous view',
    positionClassName: 'left-0 top-0 h-1/2 w-1/2',
    alignClassName: 'items-start justify-start text-left',
    ariaLabel: 'Back zone. Activate to go to the previous view.',
  },
  forward: {
    title: 'Forward',
    subtitle: 'Move to the next view',
    positionClassName: 'right-0 top-0 h-1/2 w-1/2',
    alignClassName: 'items-end justify-start text-right',
    ariaLabel: 'Forward zone. Activate to go to the next view.',
  },
  books: {
    title: 'Books',
    subtitle: 'Browse the library',
    positionClassName: 'left-0 top-1/2 h-1/2 w-[35%]',
    alignClassName: 'items-start justify-end text-left',
    ariaLabel: 'Books zone. Activate to browse books.',
  },
  search: {
    title: 'Search',
    subtitle: 'Open the typing editor',
    positionClassName: 'right-0 top-1/2 h-1/2 w-[35%]',
    alignClassName: 'items-end justify-end text-right',
    ariaLabel: 'Search zone. Activate to open search.',
  },
  home: {
    title: 'Home',
    subtitle: 'Return to the default view',
    positionClassName: 'left-[35%] top-[70%] h-[30%] w-[30%]',
    alignClassName: 'items-center justify-center text-center',
    ariaLabel: 'Home zone. Activate to return to the main view.',
  },
};

const ZONE_HEADLINES: Record<Zone, string> = {
  back: 'Back zone',
  forward: 'Forward zone',
  books: 'Books zone',
  search: 'Search zone',
  home: 'Home zone',
};

const ZONE_LABELS: Record<Zone, string> = {
  back: 'Back',
  forward: 'Forward',
  books: 'Books',
  search: 'Search',
  home: 'Home',
};

function getGuidanceText(
  nearbyZones: { zone: Zone; direction: string }[],
): string | null {
  if (nearbyZones.length === 0) {
    return null;
  }

  return nearbyZones
    .map(({ zone, direction }) =>
      voiceDictionary.navigation.direction(ZONE_LABELS[zone], direction),
    )
    .join(' ');
}

export default function HomePage() {
  const { currentZone, isIdle, mousePosition, nearbyZones } = useMouseZone();
  const { speak } = useTTS();

  const [viewState, setViewState] = useState<ViewState>('DEFAULT');
  const [showDebugOverlay, setShowDebugOverlay] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookLoadState, setBookLoadState] = useState<BookLoadState>('loading');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string | null>(null);

  const lastEnteredZoneRef = useRef<Zone | null>(null);
  const lastIdleZoneRef = useRef<Zone | null>(null);

  const hasPointerMoved = mousePosition.x > 0 || mousePosition.y > 0;
  const isZoneSpeechEnabled = viewState === 'DEFAULT';
  const nearbyGuidanceText = getGuidanceText(nearbyZones);

  useEffect(() => {
    let cancelled = false;

    setBookLoadState('loading');

    void loadBooks()
      .then((loadedBooks) => {
        if (cancelled) {
          return;
        }

        setBooks(loadedBooks);
        setBookLoadState('ready');
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setBookLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (viewState === 'SEARCH' || viewState === 'READING') {
        return;
      }

      if (event.key.toLowerCase() !== 'd') {
        return;
      }

      event.preventDefault();
      setShowDebugOverlay((previousValue) => !previousValue);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewState]);

  useEffect(() => {
    if (!hasPointerMoved || !isZoneSpeechEnabled) {
      return;
    }

    if (lastEnteredZoneRef.current === currentZone) {
      return;
    }

    lastEnteredZoneRef.current = currentZone;
    lastIdleZoneRef.current = null;

    void speak(voiceDictionary.zones[currentZone].enter, {
      priority: 'high',
    });
  }, [currentZone, hasPointerMoved, isZoneSpeechEnabled, speak]);

  useEffect(() => {
    if (!isIdle) {
      lastIdleZoneRef.current = null;
    }
  }, [isIdle]);

  useEffect(() => {
    if (!hasPointerMoved || !isZoneSpeechEnabled || !isIdle) {
      return;
    }

    if (lastIdleZoneRef.current === currentZone) {
      return;
    }

    lastIdleZoneRef.current = currentZone;

    void speak(voiceDictionary.zones[currentZone].idle, {
      priority: 'normal',
    });
  }, [currentZone, hasPointerMoved, isIdle, isZoneSpeechEnabled, speak]);

  function handleZoneActivate(zone: Zone) {
    void speak(voiceDictionary.zones[zone].click, {
      priority: 'high',
    });

    if (zone === 'back') {
      window.history.back();
      return;
    }

    if (zone === 'forward') {
      window.history.forward();
      return;
    }

    if (zone === 'books') {
      setViewState('BOOKS');
      setSelectedBook(null);
      return;
    }

    if (zone === 'search') {
      setViewState('SEARCH');
      return;
    }

    setSelectedBook(null);
    setViewState('DEFAULT');
  }

  function handleBookSelect(book: Book) {
    setSelectedBook(book);
    setViewState('READING');
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-access-bg"
      aria-labelledby="barrierfree-web-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.12),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(0,255,136,0.08),_transparent_30%)]" />

      <section className="absolute inset-0">
        {(Object.entries(ZONE_CARDS) as Array<[Zone, ZoneCard]>).map(
          ([zone, zoneCard]) => {
            const isActive = currentZone === zone;

            return (
              <button
                key={zone}
                type="button"
                aria-label={zoneCard.ariaLabel}
                className={[
                  'absolute flex rounded-[1.75rem] border p-6 transition duration-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-6px] focus-visible:outline-access-highlight',
                  zoneCard.positionClassName,
                  zoneCard.alignClassName,
                  isActive
                    ? 'border-access-highlight/80 bg-access-highlight/12 shadow-[0_0_0_1px_rgba(0,255,136,0.28),0_0_40px_rgba(0,255,136,0.08)]'
                    : 'border-access-text/10 bg-access-zone/65 hover:border-access-accent/45 hover:bg-access-zone/80',
                ].join(' ')}
                onClick={() => {
                  handleZoneActivate(zone);
                }}
              >
                <div className="max-w-[18rem] space-y-3">
                  <p className="text-xs uppercase tracking-[0.34em] text-access-accent/80">
                    {zone === 'back'
                      ? '\u2190 Back'
                      : zone === 'forward'
                      ? 'Forward \u2192'
                      : zoneCard.title}
                  </p>
                  <h2 className="text-2xl font-semibold text-access-text sm:text-3xl">
                    {zoneCard.title}
                  </h2>
                  <p className="max-w-[16rem] text-base leading-7 text-access-text/72">
                    {zoneCard.subtitle}
                  </p>
                </div>
              </button>
            );
          },
        )}
      </section>

      <section className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl rounded-[2rem] border border-access-accent/35 bg-access-bg/82 px-8 py-8 text-center shadow-[0_0_0_1px_rgba(255,215,0,0.15)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.34em] text-access-highlight">
            BarrierFree-Web
          </p>
          <h1
            id="barrierfree-web-title"
            className="mt-4 text-4xl font-semibold text-access-text sm:text-5xl"
          >
            Voice-Guided Reading
          </h1>
          <p className="mt-5 text-lg leading-8 text-access-text/82">
            Move your mouse to explore the navigation zones. Click Books to open
            the library, Search to type with voice feedback, or Home to return to
            this view.
          </p>

          <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-access-text/10 bg-access-zone/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.26em] text-access-accent/80">
                Current Zone
              </p>
              <p className="mt-2 text-2xl font-semibold text-access-text">
                {ZONE_HEADLINES[currentZone]}
              </p>
              <p className="mt-2 text-sm leading-7 text-access-text/72">
                {isIdle
                  ? 'Mouse idle guidance is active.'
                  : 'Move more slowly to hear contextual guidance.'}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-access-text/10 bg-access-zone/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.26em] text-access-accent/80">
                Nearby Guidance
              </p>
              <p className="mt-2 text-lg leading-8 text-access-text">
                {nearbyGuidanceText ?? 'Move to another zone to hear navigation help.'}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-access-text/10 bg-access-zone/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.26em] text-access-accent/80">
                Library Status
              </p>
              <p className="mt-2 text-lg leading-8 text-access-text">
                {bookLoadState === 'loading'
                  ? 'Loading public-domain books.'
                  : bookLoadState === 'error'
                  ? 'Books could not be loaded.'
                  : `${books.length} books ready to explore.`}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-access-text/10 bg-access-zone/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.26em] text-access-accent/80">
                Search
              </p>
              <p className="mt-2 text-lg leading-8 text-access-text">
                {lastSearchQuery
                  ? `Last search: ${lastSearchQuery}`
                  : 'No search has been completed yet.'}
              </p>
            </div>
          </div>

          <p className="mt-8 text-sm uppercase tracking-[0.28em] text-access-text/62">
            Press D to toggle the debug overlay.
          </p>
        </div>
      </section>

      <MouseZoneOverlay
        currentZone={currentZone}
        mousePosition={mousePosition}
        isVisible={showDebugOverlay}
      />

      {viewState === 'BOOKS' ? (
        <section
          className="fixed inset-x-6 top-6 z-30 mx-auto max-w-4xl rounded-[2rem] border border-access-accent/40 bg-access-bg/96 p-6 shadow-[0_0_0_1px_rgba(255,215,0,0.16)] backdrop-blur"
          aria-label="Book list"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-access-highlight">
                Library
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-access-text">
                Choose a book
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-7 text-access-text/76">
                Select one of the available public-domain titles to begin reading.
              </p>
            </div>

            <button
              type="button"
              aria-label="Close book list"
              className="rounded-full border border-access-accent/35 px-5 text-sm font-medium text-access-text transition hover:border-access-accent hover:text-access-accent focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-access-highlight"
              onClick={() => {
                setViewState('DEFAULT');
              }}
            >
              Close
            </button>
          </div>

          <div className="mt-8 grid gap-4">
            {bookLoadState === 'loading' ? (
              <div className="rounded-[1.5rem] border border-access-text/10 bg-access-zone/85 px-5 py-6 text-lg text-access-text/82">
                Loading books...
              </div>
            ) : null}

            {bookLoadState === 'error' ? (
              <div className="rounded-[1.5rem] border border-red-500/40 bg-red-500/10 px-5 py-6 text-lg text-access-text">
                The book library could not be loaded. Please try again.
              </div>
            ) : null}

            {bookLoadState === 'ready'
              ? books.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    aria-label={`Open ${book.title} by ${book.author}`}
                    className="rounded-[1.5rem] border border-access-text/10 bg-access-zone/85 px-5 py-5 text-left transition hover:border-access-accent/45 hover:bg-access-zone focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-access-highlight"
                    onClick={() => {
                      handleBookSelect(book);
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.28em] text-access-highlight">
                      {book.author}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-access-text">
                      {book.title}
                    </h3>
                    <p className="mt-2 text-base leading-7 text-access-text/72">
                      {book.chapters[0]?.title ?? 'Opening chapter'}
                    </p>
                  </button>
                ))
              : null}
          </div>
        </section>
      ) : null}

      <BookReader
        book={viewState === 'READING' ? selectedBook : null}
        onClose={() => {
          setViewState('BOOKS');
        }}
      />

      <TypingEditor
        isOpen={viewState === 'SEARCH'}
        onClose={() => {
          setViewState('DEFAULT');
        }}
        onSearch={(query) => {
          setLastSearchQuery(query);
          setViewState('DEFAULT');
        }}
      />
    </main>
  );
}
