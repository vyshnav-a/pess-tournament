import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getTournament,
  getTournamentStandings,
  getTournamentMatches,
  getKnockoutBracket
} from "../services/api";


function Tournament() {
  const { id } = useParams();

  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [knockout, setKnockout] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");


  // --------------------------------------------------
  // Load tournament
  // --------------------------------------------------

async function loadTournament(showRefresh = false) {
  try {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const [
      tournamentData,
      standingsData,
      matchesData
    ] = await Promise.all([
      getTournament(id),
      getTournamentStandings(id),
      getTournamentMatches(id)
    ]);

    setTournament(
      tournamentData.tournament
    );

    setStandings(
      standingsData.standings || []
    );

    setMatches(
      matchesData.matches || []
    );

    // Knockout is optional.
    // A tournament can legitimately exist in the
    // group stage before the knockout is generated.
    try {
      const knockoutData =
        await getKnockoutBracket(id);

      setKnockout(knockoutData);
    } catch (knockoutError) {
      console.log(
        "No knockout bracket yet:",
        knockoutError.message
      );

      setKnockout(null);
    }

  } catch (err) {
    console.error(err);

    setError(
      err.message ||
      "Failed to load tournament."
    );

  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}


  useEffect(() => {
    loadTournament();
  }, [id]);


  // --------------------------------------------------
  // Player name mapping
  // --------------------------------------------------

  const playerMap = useMemo(() => {
    const map = {};

    if (!tournament?.players) {
      return map;
    }

    tournament.players.forEach((tp) => {
      map[tp.id] =
        tp.player?.name ||
        `Player ${tp.playerId}`;
    });

    return map;
  }, [tournament]);


  function getPlayerName(
    tournamentPlayerId
  ) {
    if (!tournamentPlayerId) {
      return "TBD";
    }

    return (
      playerMap[tournamentPlayerId] ||
      `Player ${tournamentPlayerId}`
    );
  }


  // --------------------------------------------------
  // Status styles
  // --------------------------------------------------

  function getStatusClass(status) {
    if (status === "UPCOMING") {
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    }

    if (status === "ACTIVE") {
      return "border-green-500/30 bg-green-500/10 text-green-400";
    }

    if (status === "COMPLETED") {
      return "border-slate-600 bg-slate-700/20 text-slate-300";
    }

    return "border-slate-700 bg-slate-800 text-slate-300";
  }


  function getMatchStatusClass(status) {
    if (status === "COMPLETED") {
      return "text-green-400";
    }

    return "text-yellow-400";
  }


  // --------------------------------------------------
  // Match groups
  // --------------------------------------------------

  const groupMatches = matches.filter(
    (match) => match.groupId !== null
  );

  const knockoutMatches =
    knockout?.matches ||
    knockout?.stages?.flatMap(
      (stage) => stage.matches || []
    ) ||
    [];

  const semifinalMatches =
    knockoutMatches.filter(
      (match) =>
        match.stage?.type === "SEMIFINAL"
    );

  const finalMatches =
    knockoutMatches.filter(
      (match) =>
        match.stage?.type === "FINAL"
    );

  const thirdPlaceMatches =
    knockoutMatches.filter(
      (match) =>
        match.stage?.type === "THIRD_PLACE"
    );


  // --------------------------------------------------
  // Tournament Results
  // --------------------------------------------------

  const completedFinal =
    finalMatches.find(
      (match) =>
        match.status === "COMPLETED"
    );

  const completedThirdPlace =
    thirdPlaceMatches.find(
      (match) =>
        match.status === "COMPLETED"
    );

  let champion = null;
  let runnerUp = null;
  let thirdPlace = null;


  if (completedFinal) {
    const homeScore =
      Number(completedFinal.homeScore);

    const awayScore =
      Number(completedFinal.awayScore);

    if (homeScore > awayScore) {
      champion =
        completedFinal.homePlayerId;

      runnerUp =
        completedFinal.awayPlayerId;

    } else if (awayScore > homeScore) {
      champion =
        completedFinal.awayPlayerId;

      runnerUp =
        completedFinal.homePlayerId;
    }
  }


  if (completedThirdPlace) {
    const homeScore =
      Number(completedThirdPlace.homeScore);

    const awayScore =
      Number(completedThirdPlace.awayScore);

    if (homeScore > awayScore) {
      thirdPlace =
        completedThirdPlace.homePlayerId;

    } else if (awayScore > homeScore) {
      thirdPlace =
        completedThirdPlace.awayPlayerId;
    }
  }


  // --------------------------------------------------
  // Read-only Match Card
  // --------------------------------------------------

  function renderMatch(match) {
    const isTwoLegged =
      match.isTwoLegged &&
      Array.isArray(match.legs) &&
      match.legs.length > 0;


    /*
     * TWO-LEGGED MATCH
     */

    if (isTwoLegged) {
      return (
        <div
          key={match.id}
          className="rounded-xl border border-slate-800 bg-slate-900 p-4"
        >

          <div className="mb-4">

            <p className="text-xs text-slate-500">
              Match #{match.id}
            </p>

            <p className="mt-1 text-sm font-semibold text-white">

              {getPlayerName(
                match.homePlayerId
              )}

              <span className="mx-2 text-slate-500">
                vs
              </span>

              {getPlayerName(
                match.awayPlayerId
              )}

            </p>

            <p
              className={`mt-1 text-xs font-semibold ${getMatchStatusClass(
                match.status
              )}`}
            >
              {match.status}
            </p>

          </div>


          <div className="space-y-3">

            {match.legs.map((leg) => (

              <div
                key={leg.id}
                className="rounded-lg border border-slate-800 bg-slate-950 p-3"
              >

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-xs font-medium text-slate-400">
                    Leg {leg.legNumber}
                  </span>

                  {leg.status === "COMPLETED" && (
                    <span className="text-xs text-green-400">
                      Completed
                    </span>
                  )}

                </div>


                <div className="flex items-center justify-end gap-3">

                  <span className="text-sm font-semibold text-white">
                    {leg.homeScore ??
                      "—"}
                  </span>

                  <span className="text-slate-500">
                    -
                  </span>

                  <span className="text-sm font-semibold text-white">
                    {leg.awayScore ??
                      "—"}
                  </span>

                </div>

              </div>

            ))}

          </div>

        </div>
      );
    }


    /*
     * NORMAL MATCH
     */

    return (
      <div
        key={match.id}
        className="rounded-xl border border-slate-800 bg-slate-900 p-4"
      >

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs text-slate-500">
              Match #{match.id}
            </p>

            <p className="mt-1 text-sm font-semibold text-white">

              {getPlayerName(
                match.homePlayerId
              )}

              <span className="mx-2 text-slate-500">
                vs
              </span>

              {getPlayerName(
                match.awayPlayerId
              )}

            </p>

            <p
              className={`mt-1 text-xs font-semibold ${getMatchStatusClass(
                match.status
              )}`}
            >
              {match.status}
            </p>

          </div>


          <div className="flex items-center gap-3">

            <span className="text-lg font-bold text-white">
              {match.homeScore ??
                "—"}
            </span>

            <span className="text-slate-500">
              -
            </span>

            <span className="text-lg font-bold text-white">
              {match.awayScore ??
                "—"}
            </span>

          </div>

        </div>

      </div>
    );
  }


  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">

        <div className="mx-auto max-w-6xl">

          Loading tournament...

        </div>

      </div>
    );
  }


  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  if (error && !tournament) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">

        <div className="mx-auto max-w-6xl">

          <p className="text-red-400">
            {error}
          </p>

          <Link
            to="/tournaments"
            className="mt-4 inline-block text-blue-400 hover:text-blue-300"
          >
            ← Back to tournaments
          </Link>

        </div>

      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-950 text-white">


      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="border-b border-slate-800">

  <div className="mx-auto max-w-6xl px-4 py-4">

    {/* Navigation */}

    <div className="flex flex-wrap items-center justify-between gap-4">

      <Link
        to="/"
        className="text-lg font-bold text-white hover:text-blue-400"
      >
        eFootball Tournament Hub
      </Link>

      <nav className="flex items-center gap-4 text-sm">

        <Link
          to="/"
          className="text-slate-300 transition hover:text-white"
        >
          Home
        </Link>

        <Link
          to="/tournaments"
          className="text-slate-300 transition hover:text-white"
        >
          Tournaments
        </Link>

        <Link
          to="/login"
          className="rounded-md border border-slate-700 px-3 py-2 text-slate-300 transition hover:border-blue-500 hover:text-white"
        >
          Admin Login
        </Link>

      </nav>

    </div>


          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h1 className="text-2xl font-bold">
                {tournament.name}
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                {tournament.description ||
                  "No description"}
              </p>

            </div>


            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                tournament.status
              )}`}
            >
              {tournament.status}
            </span>

          </div>

        </div>

      </div>


      <main className="mx-auto max-w-6xl px-4 py-6">


        {/* ==========================================
    TOURNAMENT RESULTS
========================================== */}

{tournament.status === "COMPLETED" &&
  champion &&
  runnerUp && (

  <section className="mb-7 rounded-2xl border border-yellow-500/20 bg-slate-900 p-6">

    <div className="text-center">

      <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">
        Tournament Completed
      </p>

      <h2 className="mt-2 text-2xl font-bold text-white">
        Final Results
      </h2>

    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-3">

      {/* Champion */}

      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-center">

        <div className="text-4xl">
          🥇
        </div>

        <p className="mt-2 text-xs uppercase tracking-wide text-yellow-400">
          Champion
        </p>

        <p className="mt-2 text-lg font-bold text-white">
          {getPlayerName(champion)}
        </p>

      </div>


      {/* Runner Up */}

      <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-5 text-center">

        <div className="text-4xl">
          🥈
        </div>

        <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
          Runner-up
        </p>

        <p className="mt-2 text-lg font-bold text-white">
          {getPlayerName(runnerUp)}
        </p>

      </div>


      {/* Third Place */}

      {thirdPlace && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-5 text-center">

          <div className="text-4xl">
            🥉
          </div>

          <p className="mt-2 text-xs uppercase tracking-wide text-orange-400">
            Third Place
          </p>

          <p className="mt-2 text-lg font-bold text-white">
            {getPlayerName(thirdPlace)}
          </p>

        </div>
      )}

    </div>

  </section>

)}


        {/* ==========================================
            TOURNAMENT INFORMATION
        ========================================== */}

        <div className="grid gap-4 md:grid-cols-3">


          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-xs text-slate-500">
              Format
            </p>

            <p className="mt-2 text-sm font-semibold text-white">

              {tournament.format ===
              "GROUP_KNOCKOUT"
                ? "Groups + Knockout"
                : "Single Table"}

            </p>

          </div>


          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-xs text-slate-500">
              Group Size
            </p>

            <p className="mt-2 text-sm font-semibold text-white">
              {tournament.groupSize || "-"}
            </p>

          </div>


          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-xs text-slate-500">
              Knockout
            </p>

            <p className="mt-2 text-sm font-semibold text-white">

              {tournament.knockoutLegFormat ===
              "TWO_LEG"
                ? "Two Legged"
                : "Single Leg"}

            </p>

          </div>

        </div>


        {/* ==========================================
            REFRESH
        ========================================== */}

        <div className="mt-5 flex justify-end">

          <button
            onClick={() =>
              loadTournament(true)
            }
            disabled={refreshing}
            className="rounded-md border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-medium text-white transition hover:border-slate-500 disabled:opacity-50"
          >

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>

        </div>


        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}


        {/* ==========================================
            GROUP STANDINGS
        ========================================== */}

        {standings.length > 0 && (

          <section className="mt-6">

            <h2 className="mb-4 text-lg font-bold">
              Group Standings
            </h2>


            <div className="space-y-5">

              {standings.map((group) => (

                <div
                  key={group.groupId}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
                >

                  <div className="border-b border-slate-800 px-4 py-3">

                    <h3 className="text-sm font-semibold">
                      {group.groupName}
                    </h3>

                  </div>


                  <div className="overflow-x-auto">

                    <table className="w-full text-left text-xs">

                      <thead className="bg-slate-950 text-slate-400">

                        <tr>

                          <th className="px-3 py-3">
                            #
                          </th>

                          <th className="px-3 py-3">
                            Player
                          </th>

                          <th className="px-3 py-3 text-center">
                            P
                          </th>

                          <th className="px-3 py-3 text-center">
                            W
                          </th>

                          <th className="px-3 py-3 text-center">
                            D
                          </th>

                          <th className="px-3 py-3 text-center">
                            L
                          </th>

                          <th className="px-3 py-3 text-center">
                            GF
                          </th>

                          <th className="px-3 py-3 text-center">
                            GA
                          </th>

                          <th className="px-3 py-3 text-center">
                            GD
                          </th>

                          <th className="px-3 py-3 text-center">
                            Pts
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {group.standings.map(
                          (player, index) => (

                          <tr
                            key={
                              player.tournamentPlayerId
                            }
                            className="border-t border-slate-800"
                          >

                            <td className="px-3 py-3 text-slate-400">
                              {index + 1}
                            </td>

                            <td className="px-3 py-3 font-semibold text-white">
                              {player.name}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {player.played}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {player.won}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {player.drawn}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {player.lost}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {player.goalsFor}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {player.goalsAgainst}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {player.goalDifference}
                            </td>

                            <td className="px-3 py-3 text-center font-bold text-blue-400">
                              {player.points}
                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                </div>

              ))}

            </div>

          </section>

        )}


        {/* ==========================================
            GROUP FIXTURES
        ========================================== */}

        {groupMatches.length > 0 && (

          <section className="mt-7">

            <h2 className="mb-4 text-lg font-bold">
              Group Fixtures & Results
            </h2>

            <div className="space-y-3">

              {groupMatches.map(
                renderMatch
              )}

            </div>

          </section>

        )}


        {/* ==========================================
            KNOCKOUT
        ========================================== */}

        {knockoutMatches.length > 0 && (

          <section className="mt-8">

            <h2 className="mb-4 text-lg font-bold">
              Knockout Stage
            </h2>


            {/* Semifinal */}

            {semifinalMatches.length > 0 && (

              <div className="mb-7">

                <h3 className="mb-3 text-base font-semibold text-slate-200">
                  Semifinals
                </h3>

                <div className="space-y-3">

                  {semifinalMatches.map(
                    renderMatch
                  )}

                </div>

              </div>

            )}


            {/* Final */}

            {finalMatches.length > 0 && (

              <div className="mb-7">

                <h3 className="mb-3 text-base font-semibold text-slate-200">
                  Final
                </h3>

                <div className="space-y-3">

                  {finalMatches.map(
                    renderMatch
                  )}

                </div>

              </div>

            )}


            {/* Third Place */}

            {thirdPlaceMatches.length > 0 && (

              <div className="mb-7">

                <h3 className="mb-3 text-base font-semibold text-slate-200">
                  Third Place
                </h3>

                <div className="space-y-3">

                  {thirdPlaceMatches.map(
                    renderMatch
                  )}

                </div>

              </div>

            )}

          </section>

        )}


        {/* ==========================================
            PLAYERS
        ========================================== */}

        {tournament.players &&
          tournament.players.length > 0 && (

          <section className="mt-8">

            <h2 className="mb-4 text-lg font-bold">
              Players
            </h2>


            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

              {tournament.players.map(
                (tp) => (

                <div
                  key={tp.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4"
                >

                  <p className="text-sm font-semibold text-white">
                    {tp.player?.name ||
                      `Player ${tp.playerId}`}
                  </p>

                </div>

              ))}

            </div>

          </section>

        )}

      </main>

    </div>
  );
}


export default Tournament;