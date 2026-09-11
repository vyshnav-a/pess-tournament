import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getPlayers,
  createPlayer,
  getTournamentPlayers,
  addPlayerToTournament,
  removePlayerFromTournament
} from "../services/api";

function PlayerManagement() {
  const { id } = useParams();

  const [players, setPlayers] = useState([]);
  const [tournamentPlayers, setTournamentPlayers] = useState([]);

  const [name, setName] = useState("");
  const [gamerTag, setGamerTag] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setError("");

      const [allPlayers, tournamentPlayersData] =
        await Promise.all([
          getPlayers(),
          getTournamentPlayers(id)
        ]);

      setPlayers(allPlayers.players || []);
      setTournamentPlayers(
        tournamentPlayersData.players || []
      );
    } catch (err) {
      setError(err.message || "Failed to load players.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleCreatePlayer(event) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Player name is required.");
      return;
    }

    try {
      setError("");
      setMessage("");

      await createPlayer({
        name: name.trim(),
        gamerTag: gamerTag.trim()
      });

      setName("");
      setGamerTag("");

      setMessage("Player created successfully.");

      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create player.");
    }
  }

  async function handleAddPlayer(playerId) {
    try {
      setError("");
      setMessage("");

      await addPlayerToTournament(id, playerId);

      setMessage("Player added to tournament.");

      await loadData();
    } catch (err) {
      setError(err.message || "Failed to add player.");
    }
  }

  async function handleRemovePlayer(playerId) {
    try {
      setError("");
      setMessage("");

      await removePlayerFromTournament(id, playerId);

      setMessage("Player removed from tournament.");

      await loadData();
    } catch (err) {
      setError(err.message || "Failed to remove player.");
    }
  }

  const tournamentPlayerIds = tournamentPlayers.map(
    (item) => item.playerId
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-slate-400">
            Loading players...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-6xl px-4 py-10">

        {/* Navigation */}

<div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">

  <Link
    to="/admin"
    className="text-lg font-bold text-white transition hover:text-blue-400"
  >
    eFootball Admin
  </Link>

  <nav className="flex flex-wrap items-center gap-3 text-sm">

    <Link
      to="/admin"
      className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      Dashboard
    </Link>

    <Link
      to={`/tournament/${id}`}
      className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      View Tournament
    </Link>

    <Link
      to={`/admin/tournament/${id}/fixtures`}
      className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      Fixtures
    </Link>

  </nav>

</div>

        {/* Header */}

        <div className="mt-6">
          <h1 className="text-3xl font-bold">
            Player Management
          </h1>

          <p className="mt-2 text-slate-400">
            Add players to this tournament or create new players.
          </p>
        </div>

        {/* Messages */}

        {message && (
          <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
            {error}
          </div>
        )}

        {/* Create Player */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="text-xl font-semibold">
            Create Player
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Create a new player before adding them to the tournament.
          </p>

          <form
            onSubmit={handleCreatePlayer}
            className="mt-6 grid gap-4 md:grid-cols-3"
          >

            <div>
              <label className="mb-2 block text-sm font-medium">
                Player Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Player name"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Gamer Tag
              </label>

              <input
                type="text"
                value={gamerTag}
                onChange={(event) =>
                  setGamerTag(event.target.value)
                }
                placeholder="Gamer tag"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
              >
                Create Player
              </button>
            </div>

          </form>

        </section>

        {/* Tournament Players */}

        <section className="mt-8">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Tournament Players
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {tournamentPlayers.length} player
                {tournamentPlayers.length !== 1 ? "s" : ""} added
              </p>
            </div>
          </div>

          {tournamentPlayers.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
              No players have been added to this tournament.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {tournamentPlayers.map((item) => (
                <div
                  key={item.playerId}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                >

                  <h3 className="font-semibold">
                    {item.player?.name ||
                      `Player ${item.playerId}`}
                  </h3>

                  {item.player?.gamerTag && (
                    <p className="mt-1 text-sm text-slate-400">
                      @{item.player.gamerTag}
                    </p>
                  )}

                  <button
                    onClick={() =>
                      handleRemovePlayer(item.playerId)
                    }
                    className="mt-4 w-full rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    Remove
                  </button>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* All Players */}

        <section className="mt-10">

          <h2 className="text-xl font-semibold">
            All Players
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Add existing players to this tournament.
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

            {players.length === 0 ? (
              <div className="p-6 text-slate-400">
                No players available.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">

                {players.map((player) => {
                  const isAdded =
                    tournamentPlayerIds.includes(player.id);

                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >

                      <div>
                        <h3 className="font-medium">
                          {player.name}
                        </h3>

                        {player.gamerTag && (
                          <p className="text-sm text-slate-400">
                            @{player.gamerTag}
                          </p>
                        )}
                      </div>

                      {isAdded ? (
                        <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            handleAddPlayer(player.id)
                          }
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
                        >
                          Add
                        </button>
                      )}

                    </div>
                  );
                })}

              </div>
            )}

          </div>

        </section>

      </div>

    </div>
  );
}

export default PlayerManagement;