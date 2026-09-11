const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";


// ==================================================
// HELPER
// ==================================================

function getAuthHeaders() {
  const token = localStorage.getItem("pess_token");

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}


async function handleResponse(
  response,
  defaultMessage
) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || defaultMessage
    );
  }

  return data;
}


// ==================================================
// AUTH
// ==================================================

export async function login(
  username,
  password
) {
  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    }
  );

  return handleResponse(
    response,
    "Login failed"
  );
}


export async function getCurrentUser() {
  const response = await fetch(
    `${API_URL}/auth/me`,
    {
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to fetch current user"
  );
}


// ==================================================
// TOURNAMENTS
// ==================================================

export async function getTournaments() {
  const response = await fetch(
    `${API_URL}/tournaments`
  );

  return handleResponse(
    response,
    "Failed to fetch tournaments"
  );
}

export async function getAdminTournaments() {
  const response = await fetch(
    `${API_URL}/tournaments/admin/all`,
    {
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to fetch admin tournaments"
  );
}


export async function getTournament(id) {
  const response = await fetch(
    `${API_URL}/tournaments/${id}`
  );

  return handleResponse(
    response,
    "Failed to fetch tournament"
  );
}


export async function createTournament(data) {
  const response = await fetch(
    `${API_URL}/tournaments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    }
  );

  return handleResponse(
    response,
    "Failed to create tournament"
  );
}


export async function startTournament(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/start`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to start tournament"
  );
}

// ==================================================
// TOURNAMENT VISIBILITY
// ==================================================

export async function hideTournament(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/hide`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to hide tournament"
  );
}


export async function showTournament(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/show`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to show tournament"
  );
}


// ==================================================
// GROUPS
// ==================================================

export async function getTournamentGroups(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/groups/tournament/${tournamentId}`
  );

  return handleResponse(
    response,
    "Failed to fetch tournament groups"
  );
}


export async function generateGroups(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/groups/tournament/${tournamentId}/generate`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to generate groups"
  );
}


// ==================================================
// PLAYERS
// ==================================================

export async function getPlayers() {
  const response = await fetch(
    `${API_URL}/players`
  );

  return handleResponse(
    response,
    "Failed to fetch players"
  );
}


export async function createPlayer(data) {
  const response = await fetch(
    `${API_URL}/players`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    }
  );

  return handleResponse(
    response,
    "Failed to create player"
  );
}


export async function getTournamentPlayers(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/players/tournament/${tournamentId}`
  );

  return handleResponse(
    response,
    "Failed to fetch tournament players"
  );
}


export async function addPlayerToTournament(
  tournamentId,
  playerId
) {
  const response = await fetch(
    `${API_URL}/players/tournament/${tournamentId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        playerId
      })
    }
  );

  return handleResponse(
    response,
    "Failed to add player to tournament"
  );
}


export async function removePlayerFromTournament(
  tournamentId,
  playerId
) {
  const response = await fetch(
    `${API_URL}/players/tournament/${tournamentId}/${playerId}`,
    {
      method: "DELETE",
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to remove player"
  );
}


// ==================================================
// STANDINGS
// ==================================================

export async function getTournamentStandings(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/standings/tournament/${tournamentId}`
  );

  return handleResponse(
    response,
    "Failed to fetch standings"
  );
}


// ==================================================
// MATCHES
// ==================================================

export async function generateGroupFixtures(
  tournamentId
) {
  const response = await fetch(
  `${API_URL}/matches/tournament/${tournamentId}/generate`,
  {
    method: "POST",
    headers: {
      ...getAuthHeaders()
    }
  }
);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      "Failed to generate fixtures"
    );
  }

  return data;
}

export async function getTournamentMatches(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/matches/tournament/${tournamentId}`
  );

  return handleResponse(
    response,
    "Failed to fetch matches"
  );
}





export async function generateMissingGroupFixtures(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/matches/tournament/${tournamentId}/generate-missing`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to generate missing fixtures"
  );
}


export async function updateMatchScore(
  matchId,
  homeScore,
  awayScore,
  legNumber = null
) {
  const body = {
    homeScore: Number(homeScore),
    awayScore: Number(awayScore)
  };

  if (legNumber !== null) {
    body.legNumber = Number(legNumber);
  }

  const response = await fetch(
    `${API_URL}/matches/${matchId}/score`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    }
  );

  return handleResponse(
    response,
    "Failed to save result"
  );
}


// ==================================================
// TOURNAMENT SUMMARY
// ==================================================

export async function getTournamentSummary(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/tournaments/${tournamentId}/summary`
  );

  return handleResponse(
    response,
    "Failed to fetch tournament summary"
  );
}


// ==================================================
// KNOCKOUT
// ==================================================

export async function generateKnockout(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/knockout/tournament/${tournamentId}/generate`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  return handleResponse(
    response,
    "Failed to generate knockout bracket"
  );
}


export async function getKnockoutBracket(
  tournamentId
) {
  const response = await fetch(
    `${API_URL}/knockout/tournament/${tournamentId}`
  );

  return handleResponse(
    response,
    "Failed to fetch knockout bracket"
  );
}


// ==================================================
// LOGOUT
// ==================================================

export function logout() {
  localStorage.removeItem("pess_token");
  localStorage.removeItem("pess_user");
}