const prisma = require("../lib/prisma");

async function getTournamentStandings(req, res) {
  try {
    const tournamentId = Number(req.params.id);

    const groups = await prisma.group.findMany({
      where: {
        tournamentId
      },
      include: {
        members: {
          include: {
            tournamentPlayer: {
              include: {
                player: true
              }
            }
          }
        },
        matches: {
          where: {
            status: "COMPLETED"
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    const standings = groups.map((group) => {
      const table = {};

      // Initialize every player
      for (const member of group.members) {
        const playerId =
          member.tournamentPlayerId;

        table[playerId] = {
          tournamentPlayerId: playerId,
          playerId:
            member.tournamentPlayer.player.id,
          name:
            member.tournamentPlayer.player.name,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        };
      }

      // Process completed matches
      for (const match of group.matches) {
        if (
          match.homeScore === null ||
          match.awayScore === null
        ) {
          continue;
        }

        const home =
          table[match.homePlayerId];

        const away =
          table[match.awayPlayerId];

        if (!home || !away) {
          continue;
        }

        home.played++;
        away.played++;

        home.goalsFor += match.homeScore;
        home.goalsAgainst += match.awayScore;

        away.goalsFor += match.awayScore;
        away.goalsAgainst += match.homeScore;

        if (
          match.homeScore >
          match.awayScore
        ) {
          home.won++;
          home.points += 3;
          away.lost++;
        } else if (
          match.homeScore <
          match.awayScore
        ) {
          away.won++;
          away.points += 3;
          home.lost++;
        } else {
          home.drawn++;
          away.drawn++;

          home.points++;
          away.points++;
        }
      }

      // Calculate goal difference
      const players = Object.values(table);

      for (const player of players) {
        player.goalDifference =
          player.goalsFor -
          player.goalsAgainst;
      }

      // Sort standings
      players.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        if (
          b.goalDifference !==
          a.goalDifference
        ) {
          return (
            b.goalDifference -
            a.goalDifference
          );
        }

        if (b.goalsFor !== a.goalsFor) {
          return b.goalsFor - a.goalsFor;
        }

        return a.name.localeCompare(b.name);
      });

      return {
        groupId: group.id,
        groupName: group.name,
        standings: players
      };
    });

    res.json({
      success: true,
      standings
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to calculate standings"
    });
  }
}

module.exports = {
  getTournamentStandings
};