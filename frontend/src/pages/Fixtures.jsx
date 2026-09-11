import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getTournamentMatches,
  getTournamentSummary,
  getTournament,
  updateMatchScore
} from "../services/api";

function Fixtures() {
  const { id } = useParams();

  const [matches, setMatches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tournament, setTournament] = useState(null);

  const [scores, setScores] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadMatches() {
    try {
      setLoading(true);
      setError("");

      const [
        matchesData,
        summaryData,
        tournamentData
      ] = await Promise.all([
        getTournamentMatches(id),
        getTournamentSummary(id),
        getTournament(id)
      ]);

      setMatches(matchesData.matches || []);
      setSummary(summaryData.tournament || null);
      setTournament(tournamentData.tournament || null);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to load fixtures."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, [id]);

  /*
   * ---------------------------------------------------------
   * Player lookup
   * ---------------------------------------------------------
   */

  function getPlayerName(tournamentPlayerId) {
    if (!tournamentPlayerId) {
      return "TBD";
    }

    const groups = summary?.groups || [];

    for (const group of groups) {
      const member = group.members?.find(
        (item) =>
          item.tournamentPlayerId ===
          tournamentPlayerId
      );

      if (member) {
        return (
          member.tournamentPlayer?.player?.name ||
          `Player ${tournamentPlayerId}`
        );
      }
    }

    /*
     * Some tournament APIs may expose players
     * directly instead of through groups.
     */

    const tournamentPlayer =
      tournament?.players?.find(
        (item) =>
          item.id === tournamentPlayerId
      );

    if (tournamentPlayer) {
      return (
        tournamentPlayer.player?.name ||
        `Player ${tournamentPlayer.playerId}`
      );
    }

    return `Player ${tournamentPlayerId}`;
  }

  /*
   * ---------------------------------------------------------
   * Score state
   * ---------------------------------------------------------
   */

  function getScoreKey(matchId, legNumber = null) {
    if (legNumber === null) {
      return `${matchId}`;
    }

    return `${matchId}-leg-${legNumber}`;
  }

  function handleScoreChange(
    matchId,
    side,
    value,
    legNumber = null
  ) {
    const key = getScoreKey(
      matchId,
      legNumber
    );

    setScores((previous) => ({
      ...previous,

      [key]: {
        ...(previous[key] || {}),
        [side]: value
      }
    }));
  }

  function getScore(
    matchId,
    side,
    legNumber = null
  ) {
    const key = getScoreKey(
      matchId,
      legNumber
    );

    return scores[key]?.[side] ?? "";
  }

  /*
   * ---------------------------------------------------------
   * Save score
   * ---------------------------------------------------------
   */

  async function handleSave(
    match,
    legNumber = null
  ) {
    if (!tournament) {
      return;
    }

    if (tournament.status !== "ACTIVE") {
      setError(
        "Match results can only be entered for an active tournament."
      );
      return;
    }

    const homeScore = getScore(
      match.id,
      "home",
      legNumber
    );

    const awayScore = getScore(
      match.id,
      "away",
      legNumber
    );

    if (
      homeScore === "" ||
      awayScore === ""
    ) {
      setError(
        "Enter both scores."
      );
      return;
    }

    const home = Number(homeScore);
    const away = Number(awayScore);

    if (
      !Number.isInteger(home) ||
      !Number.isInteger(away) ||
      home < 0 ||
      away < 0
    ) {
      setError(
        "Scores must be valid non-negative numbers."
      );
      return;
    }

    const saveKey =
      legNumber === null
        ? `${match.id}`
        : `${match.id}-leg-${legNumber}`;

    try {
      setSaving(saveKey);
      setError("");
      setMessage("");

      await updateMatchScore(
        match.id,
        home,
        away,
        legNumber
      );

      setMessage(
        legNumber === null
          ? "Result saved successfully."
          : `Leg ${legNumber} result saved successfully.`
      );

      await loadMatches();

      setScores((previous) => {
        const updated = {
          ...previous
        };

        delete updated[saveKey];

        return updated;
      });
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to save result."
      );
    } finally {
      setSaving(null);
    }
  }

  /*
   * ---------------------------------------------------------
   * Status
   * ---------------------------------------------------------
   */

  function getStatusClass(status) {
    if (status === "COMPLETED") {
      return "bg-green-500/10 text-green-400";
    }

    if (status === "ACTIVE") {
      return "bg-blue-500/10 text-blue-400";
    }

    return "bg-yellow-500/10 text-yellow-400";
  }

  /*
   * ---------------------------------------------------------
   * Match score display
   * ---------------------------------------------------------
   */

  function ScoreInput({
    match,
    legNumber = null,
    completed = false
  }) {
    const homeScore =
      legNumber === null
        ? match.homeScore
        : match.legs?.find(
            (leg) =>
              leg.legNumber === legNumber
          )?.homeScore;

    const awayScore =
      legNumber === null
        ? match.awayScore
        : match.legs?.find(
            (leg) =>
              leg.legNumber === legNumber
          )?.awayScore;

    const hasSavedScore =
      homeScore !== null &&
      homeScore !== undefined &&
      awayScore !== null &&
      awayScore !== undefined;

    const saveKey =
      legNumber === null
        ? `${match.id}`
        : `${match.id}-leg-${legNumber}`;

    const isSaving =
      saving === saveKey;

    return (
      <div className="mt-4">

        <div className="flex items-center justify-center gap-3 sm:gap-5">

          {/* HOME */}

          <div className="w-28 text-right sm:w-40">
            <p className="truncate font-semibold text-white">
              {getPlayerName(
                match.homePlayerId
              )}
            </p>
          </div>

          {/* SCORE */}

          <div className="flex items-center gap-2">

            <input
              type="number"
              min="0"
              disabled={
                completed ||
                isSaving
              }
              value={
                completed && hasSavedScore
                  ? homeScore
                  : getScore(
                      match.id,
                      "home",
                      legNumber
                    )
              }
              onChange={(event) =>
                handleScoreChange(
                  match.id,
                  "home",
                  event.target.value,
                  legNumber
                )
              }
              className="h-11 w-14 rounded-lg border border-slate-700 bg-slate-950 text-center text-lg font-bold text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            />

            <span className="font-semibold text-slate-500">
              -
            </span>

            <input
              type="number"
              min="0"
              disabled={
                completed ||
                isSaving
              }
              value={
                completed && hasSavedScore
                  ? awayScore
                  : getScore(
                      match.id,
                      "away",
                      legNumber
                    )
              }
              onChange={(event) =>
                handleScoreChange(
                  match.id,
                  "away",
                  event.target.value,
                  legNumber
                )
              }
              className="h-11 w-14 rounded-lg border border-slate-700 bg-slate-950 text-center text-lg font-bold text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            />

          </div>

          {/* AWAY */}

          <div className="w-28 text-left sm:w-40">
            <p className="truncate font-semibold text-white">
              {getPlayerName(
                match.awayPlayerId
              )}
            </p>
          </div>

        </div>

        {/* SAVE */}

        {!completed && (
          <div className="mt-4 flex justify-center">

            <button
              onClick={() =>
                handleSave(
                  match,
                  legNumber
                )
              }
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : "Save Result"}
            </button>

          </div>
        )}

      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * Match card
   * ---------------------------------------------------------
   */

  function MatchCard({ match }) {
    const isTwoLegged =
      match.isTwoLegged === true;

    const completed =
      match.status === "COMPLETED";

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">

        {/* Header */}

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center gap-3">

            <span className="text-xs text-slate-500">
              Match #{match.id}
            </span>

            {match.stage?.name && (
              <span className="text-xs font-medium text-blue-400">
                {match.stage.name}
              </span>
            )}

          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
              match.status
            )}`}
          >
            {match.status}
          </span>

        </div>

        {/* TWO LEG */}

        {isTwoLegged ? (
          <div className="mt-5">

            <div className="mb-4 flex items-center justify-center">

              <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-400">
                TWO LEGS
              </span>

            </div>

            {/* LEG 1 */}

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">

              <div className="mb-3 text-center text-sm font-semibold text-slate-300">
                Leg 1
              </div>

              <ScoreInput
                match={match}
                legNumber={1}
                completed={
                  match.legs?.find(
                    (leg) =>
                      leg.legNumber === 1
                  )?.status === "COMPLETED"
                }
              />

            </div>

            {/* LEG 2 */}

            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">

              <div className="mb-3 text-center text-sm font-semibold text-slate-300">
                Leg 2
              </div>

              <ScoreInput
                match={match}
                legNumber={2}
                completed={
                  match.legs?.find(
                    (leg) =>
                      leg.legNumber === 2
                  )?.status === "COMPLETED"
                }
              />

            </div>

            {/* AGGREGATE */}

            {match.legs?.length === 2 &&
              match.legs.every(
                (leg) =>
                  leg.status === "COMPLETED"
              ) && (
                <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                  <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Aggregate
                  </p>

                  <p className="mt-1 text-center text-lg font-bold text-white">
                    {(
                      Number(
                        match.legs[0]
                          ?.homeScore || 0
                      ) +
                      Number(
                        match.legs[1]
                          ?.homeScore || 0
                      )
                    )}
                    <span className="mx-2 text-slate-600">
                      -
                    </span>
                    {(
                      Number(
                        match.legs[0]
                          ?.awayScore || 0
                      ) +
                      Number(
                        match.legs[1]
                          ?.awayScore || 0
                      )
                    )}
                  </p>

                </div>
              )}

          </div>
        ) : (

          /* SINGLE LEG */

          <ScoreInput
            match={match}
            completed={completed}
          />

        )}

      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * Loading
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">

        <div className="mx-auto max-w-6xl px-4 py-10">

          <p className="text-slate-400">
            Loading fixtures...
          </p>

        </div>

      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * Group matches by stage
   * ---------------------------------------------------------
   */

  const groupedMatches =
    matches.reduce(
      (groups, match) => {
        const stageName =
          match.stage?.name ||
          (match.groupId
            ? "Group Stage"
            : "Other");

        if (!groups[stageName]) {
          groups[stageName] = [];
        }

        groups[stageName].push(match);

        return groups;
      },
      {}
    );

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-6xl px-4 py-10">

        {/* HEADER / NAVIGATION */}

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
      to={`/admin/tournament/${id}/players`}
      className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      Players
    </Link>

    <Link
      to={`/tournament/${id}`}
      className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      View Tournament
    </Link>

  </nav>

</div>

        <div className="mt-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                Match Center
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Fixtures & Results
              </h1>

              <p className="mt-2 text-slate-400">
                View fixtures and enter match results.
              </p>

            </div>

            <button
              onClick={loadMatches}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Refresh
            </button>

          </div>

        </div>

        {/* TOURNAMENT STATUS */}

        {tournament && (
          <div className="mt-6 flex flex-wrap items-center gap-3">

            <span className="text-sm text-slate-500">
              Tournament status:
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                tournament.status
              )}`}
            >
              {tournament.status}
            </span>

          </div>
        )}

        {/* MESSAGES */}

        {message && (
          <div className="mt-6 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400">
            {error}
          </div>
        )}

        {/* FIXTURES */}

        {matches.length === 0 ? (

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">

            <p className="text-slate-300">
              No fixtures available.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Generate the tournament fixtures from the admin area.
            </p>

          </div>

        ) : (

          <div className="mt-8 space-y-10">

            {Object.entries(
              groupedMatches
            ).map(
              ([
                stageName,
                stageMatches
              ]) => (

                <section
                  key={stageName}
                >

                  {/* STAGE HEADER */}

                  <div className="mb-5 flex items-center gap-3">

                    <h2 className="text-xl font-bold">
                      {stageName}
                    </h2>

                    <div className="h-px flex-1 bg-slate-800" />

                    <span className="text-xs text-slate-500">
                      {stageMatches.length}{" "}
                      {stageMatches.length === 1
                        ? "match"
                        : "matches"}
                    </span>

                  </div>

                  {/* MATCHES */}

                  <div className="space-y-4">

                    {stageMatches.map(
                      (match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                        />
                      )
                    )}

                  </div>

                </section>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default Fixtures;