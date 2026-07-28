export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-green-50 p-6 text-center">
      <section className="max-w-md rounded-3xl border border-green-200 bg-white p-8 shadow-lg">
        <div className="text-6xl" aria-hidden="true">🌾</div>
        <h1 className="mt-4 text-2xl font-bold text-green-900">You are offline</h1>
        <p className="mt-3 text-slate-600">
          AgriAdvisor can show cached screens and your last conversation, but it
          needs an internet connection for new AI, weather, market, and voice requests.
        </p>
        <a
          href="/chat"
          className="mt-6 inline-block rounded-xl bg-green-700 px-5 py-3 font-semibold text-white"
        >
          View last conversation
        </a>
      </section>
    </main>
  );
}
