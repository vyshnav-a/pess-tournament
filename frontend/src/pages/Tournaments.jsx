import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTournaments } from "../services/api";

function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTournaments() {
      try {
        const data = await getTournaments();
        setTournaments(data.tournaments);
      } catch (err) {
        setError("Failed to load tournaments.");
      } finally {
        setLoading(false);
      }
    }

    loadTournaments();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-5">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <Link
                to="/"
                className="text-xl font-bold hover:text-blue-400 sm:text-2xl"
              >
                eFootball Tournament Hub
              </Link>

              <p className="mt-1 text-sm text-slate-400">
                Follow tournaments, fixtures, standings and results.
              </p>
            </div>

            <nav className="flex items-center gap-3 text-sm">

              <Link
                to="/"
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Home
              </Link>

              <Link
                to="/tournaments"
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
              >
                Tournaments
              </Link>

              <Link
                to="/login"
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Admin Login
              </Link>

            </nav>

          </div>

        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-10">

        <div className="mb-8">

          <h1 className="text-3xl font-bold">
            Tournaments
          </h1>

          <p className="mt-2 text-slate-400">
            Select a tournament to view its details, fixtures,
            standings and results.
          </p>

        </div>

        {/* Loading */}
        {loading && (
          <p className="text-slate-400">
            Loading tournaments...
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400">
            {error}
          </p>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          tournaments.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <p className="text-slate-400">
                No tournaments available.
              </p>
            </div>
          )}

        {/* Tournament Cards */}
        {!loading && !error && tournaments.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {tournaments.map((tournament) => (

              <Link
                key={tournament.id}
                to={`/tournament/${tournament.id}`}
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-blue-500"
              >

                <div className="flex items-start justify-between gap-4">

                  <h2 className="text-xl font-bold group-hover:text-blue-400">
                    {tournament.name}
                  </h2>

                  <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
                    {tournament.status}
                  </span>

                </div>

                <p className="mt-4 text-sm text-slate-400">
                  {tournament.description ||
                    "No description available."}
                </p>

                <div className="mt-6 space-y-2 text-sm text-slate-300">

                  <p>
                    <span className="text-slate-500">
                      Format:
                    </span>{" "}
                    {tournament.format === "GROUP_KNOCKOUT"
                      ? "Groups + Knockout"
                      : "Single Table"}
                  </p>

                  {tournament.groupSize && (
                    <p>
                      <span className="text-slate-500">
                        Group Size:
                      </span>{" "}
                      {tournament.groupSize}
                    </p>
                  )}

                </div>

                <div className="mt-6 text-sm font-medium text-blue-400">
                  View Tournament →
                </div>

              </Link>

            ))}

          </div>
        )}

      </main>

    </div>
  );
}

export default Tournaments;