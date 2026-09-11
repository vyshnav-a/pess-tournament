import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex items-center justify-between">

            <h1 className="text-xl font-bold sm:text-2xl">
              eFootball Tournament Hub
            </h1>

            <Link
              to="/login"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-blue-500 hover:bg-slate-900 hover:text-white"
            >
              Admin Login
            </Link>

          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <main className="flex min-h-[calc(100vh-81px)] items-center justify-center px-4 py-16">

        <div className="mx-auto max-w-3xl text-center">

          {/* Icon / Badge */}
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            ⚽ eFootball Tournament Platform
          </div>

          {/* Main Heading */}
          <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Welcome to the
            <span className="block text-blue-500">
              eFootball Tournament Hub
            </span>
          </h2>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Follow exciting eFootball tournaments, check fixtures,
            view standings, track results and find out who becomes
            the champion.
          </p>

          {/* Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

            <Link
              to="/tournaments"
              className="w-full rounded-xl bg-blue-600 px-7 py-3.5 text-center font-semibold text-white transition hover:bg-blue-500 sm:w-auto"
            >
              🏆 View Tournaments
            </Link>

            <Link
              to="/login"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-7 py-3.5 text-center font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 sm:w-auto"
            >
              🔐 Admin Login
            </Link>

          </div>

          {/* Features */}
          <div className="mt-16 grid gap-4 sm:grid-cols-3">

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-2xl">🏆</div>
              <h3 className="mt-3 font-semibold">
                Tournaments
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Browse available eFootball tournaments.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-2xl">📊</div>
              <h3 className="mt-3 font-semibold">
                Standings
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Follow player standings and tournament progress.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-2xl">⚽</div>
              <h3 className="mt-3 font-semibold">
                Fixtures & Results
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Check upcoming matches and completed results.
              </p>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Home;