export default function HomePage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      aria-labelledby="barrierfree-web-title"
    >
      <section className="w-full max-w-3xl rounded-3xl border border-access-accent/40 bg-access-zone px-8 py-12 text-center shadow-[0_0_0_1px_rgba(255,215,0,0.12)]">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-access-highlight">
          Accessible Reader
        </p>
        <h1
          id="barrierfree-web-title"
          className="text-4xl font-semibold text-access-text sm:text-5xl"
        >
          BarrierFree-Web
        </h1>
        <p className="mt-6 text-lg leading-8 text-access-text/85">
          A high-contrast, voice-guided reading experience is being prepared here.
        </p>
      </section>
    </main>
  );
}
