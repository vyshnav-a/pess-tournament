const prisma = require("../lib/prisma");


/*
|--------------------------------------------------------------------------
| Get Tournament Groups
|--------------------------------------------------------------------------
*/

async function getTournamentGroups(req, res) {
  try {
    const tournamentId = Number(req.params.id);

    if (!Number.isInteger(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tournament ID"
      });
    }

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
        }
      },

      orderBy: {
        name: "asc"
      }
    });

    return res.json({
      success: true,
      groups
    });

  } catch (error) {
    console.error("Get tournament groups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups"
    });
  }
}


/*
|--------------------------------------------------------------------------
| Generate Groups
|--------------------------------------------------------------------------
|
| Rules:
|
| 2 players
|   -> No group stage.
|
| 3 players
|   -> Exactly ONE group containing all 3 players.
|
| 4+ players
|   -> Use configured group size.
|
|--------------------------------------------------------------------------
*/

async function generateGroups(req, res) {
  try {
    const tournamentId = Number(req.params.id);

    if (!Number.isInteger(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tournament ID"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get tournament
    |--------------------------------------------------------------------------
    */

    const tournament =
      await prisma.tournament.findUnique({
        where: {
          id: tournamentId
        },

        include: {
          players: true
        }
      });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Tournament format
    |--------------------------------------------------------------------------
    */

    if (tournament.format !== "GROUP_KNOCKOUT") {
      return res.status(400).json({
        success: false,
        message:
          "Groups are only available for group knockout tournaments"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Tournament status
    |--------------------------------------------------------------------------
    */

    if (tournament.status !== "UPCOMING") {
      return res.status(400).json({
        success: false,
        message:
          "Groups can only be generated before the tournament starts"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Players
    |--------------------------------------------------------------------------
    */

    const players = tournament.players;

    if (players.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "At least 2 players are required"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | 2 PLAYER RULE
    |--------------------------------------------------------------------------
    |
    | Two players play a direct final.
    | There must be no group stage.
    |
    */

    if (players.length === 2) {
      return res.status(400).json({
        success: false,
        message:
          "A 2-player tournament does not use a group stage. The players go directly to the final."
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Remove existing groups
    |--------------------------------------------------------------------------
    |
    | Tournament is still UPCOMING, so regeneration is allowed.
    |
    */

    await prisma.group.deleteMany({
      where: {
        tournamentId
      }
    });


    /*
    |--------------------------------------------------------------------------
    | 3 PLAYER RULE
    |--------------------------------------------------------------------------
    |
    | Exactly one group containing all 3 players.
    |
    */

    if (players.length === 3) {
      const group =
        await prisma.group.create({
          data: {
            name: "Group A",
            tournamentId
          }
        });

      for (const tournamentPlayer of players) {
        await prisma.groupMember.create({
          data: {
            groupId: group.id,
            tournamentPlayerId:
              tournamentPlayer.id
          }
        });
      }

      const result =
        await prisma.group.findMany({
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
            }
          },

          orderBy: {
            name: "asc"
          }
        });

      return res.status(201).json({
        success: true,

        message:
          "Single group generated for 3-player round robin",

        groups: result
      });
    }


    /*
    |--------------------------------------------------------------------------
    | 4+ PLAYER RULE
    |--------------------------------------------------------------------------
    */

    const groupSize = tournament.groupSize;

    if (
      !groupSize ||
      !Number.isInteger(Number(groupSize)) ||
      Number(groupSize) < 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid group size of at least 2 is required"
      });
    }

    const numericGroupSize = Number(groupSize);


    /*
    |--------------------------------------------------------------------------
    | Make sure the configured size can produce valid groups
    |--------------------------------------------------------------------------
    |
    | Example:
    |
    | 8 players / size 4 -> 4 + 4
    | 7 players / size 4 -> 4 + 3
    | 5 players / size 3 -> 3 + 2
    |
    | But:
    |
    | 5 players / size 2 -> 2 + 2 + 1
    |
    | A one-player group is invalid.
    |
    */

    const numberOfGroups =
      Math.ceil(
        players.length / numericGroupSize
      );

    if (
      players.length <
      numberOfGroups * 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Group size ${numericGroupSize} cannot create valid groups for ${players.length} players. Each group must contain at least 2 players.`
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Shuffle players
    |--------------------------------------------------------------------------
    */

    const shuffledPlayers =
      [...players];

    for (
      let i = shuffledPlayers.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        shuffledPlayers[i],
        shuffledPlayers[j]
      ] = [
        shuffledPlayers[j],
        shuffledPlayers[i]
      ];
    }


    /*
    |--------------------------------------------------------------------------
    | Create groups
    |--------------------------------------------------------------------------
    */

    const groups = [];

    for (
      let i = 0;
      i < numberOfGroups;
      i++
    ) {
      const groupName =
        `Group ${String.fromCharCode(
          65 + i
        )}`;

      const group =
        await prisma.group.create({
          data: {
            name: groupName,
            tournamentId
          }
        });

      groups.push(group);
    }


    /*
    |--------------------------------------------------------------------------
    | Distribute players
    |--------------------------------------------------------------------------
    |
    | Round-robin distribution keeps the groups balanced.
    |
    */

    for (
      let i = 0;
      i < shuffledPlayers.length;
      i++
    ) {
      const groupIndex =
        i % numberOfGroups;

      await prisma.groupMember.create({
        data: {
          groupId:
            groups[groupIndex].id,

          tournamentPlayerId:
            shuffledPlayers[i].id
        }
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Fetch generated groups
    |--------------------------------------------------------------------------
    */

    const result =
      await prisma.group.findMany({
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
          }
        },

        orderBy: {
          name: "asc"
        }
      });


    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message:
        "Groups generated successfully",

      groups: result
    });

  } catch (error) {
    console.error(
      "Generate groups error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate groups"
    });
  }
}


module.exports = {
  getTournamentGroups,
  generateGroups
};