import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  createTournament,
  getAdminTournaments,
  startTournament,
  getTournamentGroups,
  getTournamentMatches,
  generateGroups,
  generateGroupFixtures,
  generateKnockout,
   hideTournament,
  showTournament
} from "../services/api";


function AdminDashboard() {

  const [form, setForm] = useState({
    name: "",
    description: "",
    format: "GROUP_KNOCKOUT",
    groupSize: 4,
    playersPerGroupQualify: 2,
    knockoutLegFormat: "SINGLE",
    thirdPlaceMatch: true
  });


  const [tournaments, setTournaments] =
    useState([]);

  const [groupsByTournament, setGroupsByTournament] =
    useState({});

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [starting, setStarting] =
    useState(null);

  const [generatingGroups, setGeneratingGroups] =
    useState(null);

  const [generatingFixtures, setGeneratingFixtures] =
    useState(null);

  const [generatingKnockout, setGeneratingKnockout] =
    useState(null);

  const [matchesByTournament, setMatchesByTournament] =
  useState({});  

  const [changingVisibility, setChangingVisibility] =
  useState(null);

  // ==================================================
  // LOAD TOURNAMENTS
  // ==================================================

  useEffect(() => {
    loadTournaments();
  }, []);


  async function loadTournaments() {

    try {

      setLoading(true);
      setError("");

      const response =
  await getAdminTournaments();

      const tournamentList =
        response.tournaments || [];

      setTournaments(tournamentList);


      // ----------------------------------------------
      // Load groups for GROUP_KNOCKOUT tournaments
      // ----------------------------------------------

      const groupState = {};
      const matchState = {};

await Promise.all(
  tournamentList.map(
    async (tournament) => {

      // ----------------------------------------------
      // Load groups
      // ----------------------------------------------

      if (
        tournament.format ===
        "GROUP_KNOCKOUT"
      ) {

        try {

          const groupsResponse =
            await getTournamentGroups(
              tournament.id
            );

          groupState[tournament.id] =
            groupsResponse.groups || [];

        } catch (err) {

          console.error(
            `Failed to load groups for tournament ${tournament.id}`,
            err
          );

          groupState[tournament.id] = [];
        }

      } else {

        groupState[tournament.id] = [];

      }


      // ----------------------------------------------
      // Load matches
      // ----------------------------------------------

      try {

        const matchesResponse =
          await getTournamentMatches(
            tournament.id
          );

        matchState[tournament.id] =
          matchesResponse.matches || [];

      } catch (err) {

        console.error(
          `Failed to load matches for tournament ${tournament.id}`,
          err
        );

        matchState[tournament.id] = [];

      }

    }
  )
);


setGroupsByTournament(groupState);
setMatchesByTournament(matchState);


    } catch (err) {

      setError(
        err.message ||
        "Failed to load tournaments."
      );

    } finally {

      setLoading(false);

    }
  }


  // ==================================================
  // FORM CHANGE
  // ==================================================

  function handleChange(event) {

    const {
      name,
      value,
      type,
      checked
    } = event.target;


    setForm((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value
    }));
  }


  // ==================================================
  // CREATE TOURNAMENT
  // ==================================================

  async function handleSubmit(event) {

    event.preventDefault();

    setMessage("");
    setError("");
    setCreating(true);


    try {

      await createTournament({

        ...form,

        groupSize:
          Number(form.groupSize),

        playersPerGroupQualify:
          Number(
            form.playersPerGroupQualify
          )
      });


      setMessage(
        "Tournament created successfully!"
      );


      setForm({
        name: "",
        description: "",
        format: "GROUP_KNOCKOUT",
        groupSize: 4,
        playersPerGroupQualify: 2,
        knockoutLegFormat: "SINGLE",
        thirdPlaceMatch: true
      });


      await loadTournaments();

    } catch (err) {

      setError(
        err.message ||
        "Failed to create tournament."
      );

    } finally {

      setCreating(false);

    }
  }


  // ==================================================
  // GENERATE GROUPS
  // ==================================================

  async function handleGenerateGroups(
    tournamentId
  ) {

    try {

      setError("");
      setMessage("");

      setGeneratingGroups(
        tournamentId
      );


      await generateGroups(
        tournamentId
      );


      setMessage(
        "Groups generated successfully!"
      );


      await loadTournaments();

    } catch (err) {

      setError(
        err.message ||
        "Failed to generate groups."
      );

    } finally {

      setGeneratingGroups(null);

    }
  }


  // ==================================================
  // GENERATE FIXTURES
  // ==================================================

  async function handleGenerateFixtures(
    tournamentId
  ) {

    try {

      setError("");
      setMessage("");

      setGeneratingFixtures(
        tournamentId
      );


      await generateGroupFixtures(
        tournamentId
      );


      setMessage(
        "Fixtures generated successfully!"
      );


      await loadTournaments();

    } catch (err) {

      setError(
        err.message ||
        "Failed to generate fixtures."
      );

    } finally {

      setGeneratingFixtures(null);

    }
  }


// ==================================================
// GENERATE KNOCKOUT
// ==================================================

async function handleGenerateKnockout(
  tournamentId
) {
  try {

    setError("");
    setMessage("");

    setGeneratingKnockout(
      tournamentId
    );

    await generateKnockout(
      tournamentId
    );

    setMessage(
      "Knockout bracket generated successfully!"
    );

    await loadTournaments();

  } catch (err) {

    setError(
      err.message ||
      "Failed to generate knockout bracket."
    );

  } finally {

    setGeneratingKnockout(null);

  }
}

// ==================================================
// HIDE / SHOW TOURNAMENT
// ==================================================

async function handleToggleVisibility(tournament) {
  try {
    setError("");
    setMessage("");

    setChangingVisibility(tournament.id);

    if (tournament.isVisible === false) {
      await showTournament(tournament.id);

      setMessage(
        "Tournament shown successfully!"
      );
    } else {
      await hideTournament(tournament.id);

      setMessage(
        "Tournament hidden successfully!"
      );
    }

    await loadTournaments();

  } catch (err) {
    setError(
      err.message ||
      "Failed to change tournament visibility."
    );
  } finally {
    setChangingVisibility(null);
  }
}

  // ==================================================
  // START TOURNAMENT
  // ==================================================


  
  async function handleStartTournament(
    tournamentId
  ) {

    const groups =
      groupsByTournament[tournamentId] || [];


    const tournament =
      tournaments.find(
        (item) =>
          item.id === tournamentId
      );

    

    // ----------------------------------------------
    // Safety check
    // ----------------------------------------------

    const playerCount =
      tournament?.players?.length || 0;

    const isTwoPlayerTournament =
      playerCount === 2;

    if (
      tournament?.format === "GROUP_KNOCKOUT" &&
      groups.length === 0 &&
      !isTwoPlayerTournament
    ) {

      setError(
        "Generate groups before starting the tournament."
      );

      return;
    }


    try {

      setError("");
      setMessage("");

      setStarting(tournamentId);


      await startTournament(
        tournamentId
      );


      setMessage(
        "Tournament started successfully!"
      );


      await loadTournaments();

    } catch (err) {

      setError(
        err.message ||
        "Failed to start tournament."
      );

    } finally {

      setStarting(null);

    }
  }


  // ==================================================
  // STATUS CLASS
  // ==================================================

  function getStatusClass(status) {

    if (status === "UPCOMING") {

      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    }


    if (status === "ACTIVE") {

      return "border-green-500/30 bg-green-500/10 text-green-400";
    }


    if (status === "COMPLETED") {

      return "border-slate-600 bg-slate-700/30 text-slate-300";
    }


    return "border-slate-700 bg-slate-800 text-slate-300";
  }


  // ==================================================
  // FORMAT HELPERS
  // ==================================================

  function formatTournamentFormat(format) {

    if (format === "GROUP_KNOCKOUT") {
      return "Groups + Knockout";
    }


    if (format === "SINGLE_TABLE") {
      return "Single Table";
    }


    return format;
  }


  function formatKnockoutFormat(format) {

    if (format === "TWO_LEG") {
      return "Two Leg";
    }


    return "Single Leg";
  }


  // ==================================================
  // UI
  // ==================================================

  return (

    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl space-y-10">


        {/* HEADER */}

<div className="border-b border-slate-800 pb-6">

  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

    <div>

      <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        Tournament Management
      </p>

      <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
        Admin Dashboard
      </h1>

      <p className="mt-2 text-slate-400">
        Create and manage your tournaments from one place.
      </p>

    </div>

    <div className="flex flex-wrap gap-3">

      <Link
        to="/"
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
      >
        View Website
      </Link>

      <Link
        to="/tournaments"
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
      >
        Tournaments
      </Link>

    </div>

  </div>

</div>


        {/* CREATE TOURNAMENT */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">

          <div className="mb-6">

            <h2 className="text-xl font-semibold text-white">
              Create Tournament
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Configure the tournament format and knockout rules.
            </p>

          </div>


          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* NAME */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-200">
                Tournament Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="eFootball Championship"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />

            </div>


            {/* DESCRIPTION */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-200">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Tournament description"
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />

            </div>


            {/* FORMAT */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-200">
                Tournament Format
              </label>

              <select
                name="format"
                value={form.format}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              >

                <option value="GROUP_KNOCKOUT">
                  Groups + Knockout
                </option>

                <option value="SINGLE_TABLE">
                  Single Table
                </option>

              </select>

            </div>


            {/* GROUP SETTINGS */}

            {form.format ===
              "GROUP_KNOCKOUT" && (

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">

                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Group & Knockout Settings
                </h3>


                <div className="grid gap-5 sm:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Players per Group
                    </label>

                    <input
                      type="number"
                      min="2"
                      name="groupSize"
                      value={form.groupSize}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Players Qualifying
                    </label>

                    <input
                      type="number"
                      min="1"
                      max={form.groupSize}
                      name="playersPerGroupQualify"
                      value={
                        form.playersPerGroupQualify
                      }
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                    />

                  </div>

                </div>


                <div className="mt-5">

                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Knockout Match Format
                  </label>

                  <select
                    name="knockoutLegFormat"
                    value={
                      form.knockoutLegFormat
                    }
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >

                    <option value="SINGLE">
                      Single Leg
                    </option>

                    <option value="TWO_LEG">
                      Two Leg
                    </option>

                  </select>

                </div>


                <label className="mt-5 flex cursor-pointer items-center gap-3">

                  <input
                    type="checkbox"
                    name="thirdPlaceMatch"
                    checked={
                      form.thirdPlaceMatch
                    }
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />

                  <span className="text-sm text-slate-300">
                    Enable Third Place Match
                  </span>

                </label>

              </div>

            )}


            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {creating
                ? "Creating Tournament..."
                : "Create Tournament"}

            </button>


            {message && (

              <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-center text-sm text-green-400">
                {message}
              </div>

            )}


            {error && (

              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
                {error}
              </div>

            )}

          </form>

        </section>


        {/* TOURNAMENT LIST */}

        <section>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-2xl font-bold text-white">
                Tournaments
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Manage your existing tournaments.
              </p>

            </div>


            <button
              onClick={loadTournaments}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >

              {loading
                ? "Refreshing..."
                : "Refresh"}

            </button>

          </div>


          {loading ? (

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              Loading tournaments...
            </div>

          ) : tournaments.length === 0 ? (

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">

              <p className="text-slate-300">
                No tournaments found.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create your first tournament above.
              </p>

            </div>

          ) : (

            <div className="grid gap-5">

              {tournaments.map(
                (tournament) => {

                  const groups =
                    groupsByTournament[
                      tournament.id
                    ] || [];


                  const hasGroups =
                    groups.length > 0;

                  const playerCount =
                    tournament.players?.length || 0;

                  const isTwoPlayerTournament =
                    playerCount === 2;


                  const isGroupTournament =
                    tournament.format ===
                    "GROUP_KNOCKOUT";


                  const tournamentMatches =
                    matchesByTournament[
                      tournament.id
                    ] || [];

                    const groupMatches =
                    tournamentMatches.filter(
                      (match) =>
                        match.groupId !== null
                    );

                    const knockoutMatches =
                    tournamentMatches.filter(
                      (match) =>
                        match.groupId === null
                    );

                    const hasKnockout =
                    knockoutMatches.length > 0;

                    const allGroupMatchesCompleted =
                    groupMatches.length > 0 &&
                    groupMatches.every(
                      (match) =>
                        match.status === "COMPLETED"
                    );


                  const canStart =
                    tournament.status === "UPCOMING" &&
                    (
                      !isGroupTournament ||
                      isTwoPlayerTournament ||
                      hasGroups
                    );


                  return (

                    <div
                      key={tournament.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition hover:border-slate-700"
                    >


                      {/* TOP */}

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-xl font-semibold text-white">
                              {tournament.name}
                            </h3>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                                tournament.status
                              )}`}
                            >
                              {tournament.status}
                            </span>

                          </div>


                          <p className="mt-2 text-sm text-slate-400">
                            {tournament.description ||
                              "No description"}
                          </p>


                          {/* GROUP STATUS */}

                          {isGroupTournament &&
                            tournament.status ===
                              "UPCOMING" && (

                            <div className="mt-3">

                              {hasGroups ? (

                                <span className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                                  ✓ Groups generated
                                </span>

                              ) : (

                                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">
                                  Groups not generated
                                </span>

                              )}

                            </div>

                          )}

                        </div>


                        {/* DETAILS */}

                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm lg:min-w-[280px]">

                          <div>

                            <span className="text-slate-500">
                              Format
                            </span>

                            <p className="mt-1 text-slate-200">
                              {formatTournamentFormat(
                                tournament.format
                              )}
                            </p>

                          </div>


                          <div>

                            <span className="text-slate-500">
                              Knockout
                            </span>

                            <p className="mt-1 text-slate-200">

                              {tournament.format ===
                              "GROUP_KNOCKOUT"
                                ? formatKnockoutFormat(
                                    tournament.knockoutLegFormat
                                  )
                                : "—"}

                            </p>

                          </div>


                          {tournament.format ===
                            "GROUP_KNOCKOUT" && (

                            <>

                              <div>

                                <span className="text-slate-500">
                                  Group Size
                                </span>

                                <p className="mt-1 text-slate-200">
                                  {
                                    tournament.groupSize
                                  }
                                </p>

                              </div>


                              <div>

                                <span className="text-slate-500">
                                  Qualifying
                                </span>

                                <p className="mt-1 text-slate-200">
                                  {
                                    tournament.playersPerGroupQualify
                                  }
                                </p>

                              </div>

                            </>

                          )}

                        </div>

                      </div>


                      {/* ACTIONS */}

                      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-800 pt-5">


                        {/* VIEW */}

                        <Link
                          to={`/tournament/${tournament.id}`}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          View Tournament
                        </Link>


                          {/* HIDE / SHOW */}

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleVisibility(tournament)
                        }
                        disabled={
                          changingVisibility === tournament.id
                        }
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          tournament.isVisible === false
                            ? "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                            : "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        }`}
                      >
                        {changingVisibility === tournament.id
                          ? "Updating..."
                          : tournament.isVisible === false
                            ? "Show Tournament"
                            : "Hide Tournament"}
                      </button>


                        {/* PLAYERS */}

                        <Link
                          to={`/admin/tournament/${tournament.id}/players`}
                          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                        >
                          Manage Players
                        </Link>


                        {/* GENERATE GROUPS */}

                        {isGroupTournament &&
                          tournament.status === "UPCOMING" &&
                          !isTwoPlayerTournament && (

                          <button
                            type="button"
                            onClick={() =>
                              handleGenerateGroups(
                                tournament.id
                              )
                            }
                            disabled={
                              generatingGroups ===
                              tournament.id
                            }
                            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              hasGroups
                                ? "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                : "bg-purple-600 hover:bg-purple-500"
                            }`}
                          >

                            {generatingGroups ===
                            tournament.id
                              ? "Generating..."
                              : hasGroups
                                ? "Regenerate Groups"
                                : "Generate Groups"}

                          </button>

                        )}


                        {/* START */}

                        {tournament.status ===
                          "UPCOMING" && (

                          <button
                            type="button"
                            onClick={() =>
                              handleStartTournament(
                                tournament.id
                              )
                            }
                            disabled={
                              !canStart ||
                              starting ===
                                tournament.id
                            }
                            title={
                              !canStart
                                ? "Generate groups before starting the tournament"
                                : ""
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >

                            {starting ===
                            tournament.id
                              ? "Starting..."
                              : "Start Tournament"}

                          </button>

                        )}


                        {/* GENERATE FIXTURES */}

                        {tournament.status === "ACTIVE" &&
                          isGroupTournament &&
                          !isTwoPlayerTournament &&
                          groupMatches.length === 0 && (

                          <button
                            type="button"
                            onClick={() =>
                              handleGenerateFixtures(
                                tournament.id
                              )
                            }
                            disabled={
                              generatingFixtures ===
                              tournament.id
                            }
                            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >

                            {generatingFixtures ===
                            tournament.id
                              ? "Generating..."
                              : "Generate Fixtures"}

                          </button>

                        )}


 {/* GENERATE KNOCKOUT */}

{tournament.status === "ACTIVE" &&
  isGroupTournament &&
  allGroupMatchesCompleted &&
  !hasKnockout && (

  <button
    type="button"
    onClick={() =>
      handleGenerateKnockout(
        tournament.id
      )
    }
    disabled={
      generatingKnockout ===
      tournament.id
    }
    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
  >

    {generatingKnockout ===
    tournament.id
      ? "Generating..."
      : "Generate Knockout"}

  </button>

)}

                        {/* FIXTURES */}

                        {tournament.status ===
                          "ACTIVE" && (

                          <Link
                            to={`/admin/tournament/${tournament.id}/fixtures`}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                          >
                            Fixtures
                          </Link>

                        )}

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </section>

      </div>

    </div>

  );
}


export default AdminDashboard;