const prisma = require("../lib/prisma");


/*
|--------------------------------------------------------------------------
| Get Tournaments
|--------------------------------------------------------------------------
*/

async function getTournaments(req, res) {
  try {
    const tournaments =
  await prisma.tournament.findMany({
    where: {
      isVisible: true
    },
    include: {
      players: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

    return res.json({
      success: true,
      tournaments
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch tournaments"
    });
  }
}


/*
|--------------------------------------------------------------------------
| Get All Tournaments - Admin
|--------------------------------------------------------------------------
*/

async function getAdminTournaments(req, res) {
  try {
    const tournaments =
      await prisma.tournament.findMany({
        include: {
          players: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

    return res.json({
      success: true,
      tournaments
    });

  } catch (error) {
    console.error("Get admin tournaments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tournaments"
    });
  }
}

/*
|--------------------------------------------------------------------------
| Get Tournament By ID
|--------------------------------------------------------------------------
*/

async function getTournamentById(req, res) {
  try {
    const tournament =
      await prisma.tournament.findUnique({
        where: {
          id: Number(req.params.id)
        },

        include: {
          players: {
            include: {
              player: true
            }
          },

          groups: {
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
            }
          },

          stages: {
            include: {
              matches: true
            }
          }
        }
      });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found"
      });
    }

    // Hidden tournaments cannot be accessed publicly
    if (tournament.isVisible === false) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found"
      });
    }

    return res.json({
      success: true,
      tournament
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tournament"
    });
  }
}

/*
|--------------------------------------------------------------------------
| Create Tournament
|--------------------------------------------------------------------------
*/

async function createTournament(req, res) {
  try {
    const {
      name,
      description,
      format,
      startDate,
      endDate,
      groupSize,
      playersPerGroupQualify,
      knockoutLegFormat,
      thirdPlaceMatch
    } = req.body;


    if (!name || !format) {
      return res.status(400).json({
        success: false,
        message:
          "Tournament name and format are required"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Validate format
    |--------------------------------------------------------------------------
    */

    if (
      ![
        "GROUP_KNOCKOUT",
        "SINGLE_TABLE"
      ].includes(format)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid tournament format"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Validate knockout leg format
    |--------------------------------------------------------------------------
    */

    const validLegFormats = [
      "SINGLE",
      "TWO_LEG"
    ];

    const selectedLegFormat =
      knockoutLegFormat || "SINGLE";

    if (
      !validLegFormats.includes(
        selectedLegFormat
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid knockout leg format"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Create tournament
    |--------------------------------------------------------------------------
    */

    const tournament =
      await prisma.tournament.create({
        data: {
          name,
          description,
          format,

          startDate:
            startDate
              ? new Date(startDate)
              : null,

          endDate:
            endDate
              ? new Date(endDate)
              : null,

          groupSize:
            groupSize
              ? Number(groupSize)
              : null,

          playersPerGroupQualify:
            playersPerGroupQualify
              ? Number(
                  playersPerGroupQualify
                )
              : null,

          knockoutLegFormat:
            selectedLegFormat,

          thirdPlaceMatch:
            thirdPlaceMatch ?? true,

          createdById: 1
        }
      });


    return res.status(201).json({
      success: true,
      tournament
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to create tournament"
    });
  }
}


/*
|--------------------------------------------------------------------------
| Start Tournament
|--------------------------------------------------------------------------
|
| Special rules:
|
| 2 players:
|   Automatically create a direct final.
|
| 3+ players:
|   Tournament simply becomes ACTIVE.
|   Groups/fixtures follow the normal workflow.
|
|--------------------------------------------------------------------------
*/

async function startTournament(req, res) {
  try {
    const tournamentId =
      Number(req.params.id);


    if (
      !Number.isInteger(
        tournamentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid tournament ID"
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
          players: true,

          groups: true,

          stages: {
            include: {
              matches: true
            }
          }
        }
      });


    if (!tournament) {
      return res.status(404).json({
        success: false,
        message:
          "Tournament not found"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Status validation
    |--------------------------------------------------------------------------
    */

    if (
      tournament.status ===
      "ACTIVE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tournament is already active"
      });
    }


    if (
      tournament.status ===
      "COMPLETED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tournament is already completed"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Player validation
    |--------------------------------------------------------------------------
    */

    if (
      tournament.players.length < 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least 2 players are required to start the tournament"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | 2 PLAYER DIRECT FINAL
    |--------------------------------------------------------------------------
    */

    if (
      tournament.players.length === 2
    ) {

      /*
      |----------------------------------------------------------------------
      | GROUP_KNOCKOUT with 2 players
      |
      | No groups.
      | No group fixtures.
      | Direct final.
      |----------------------------------------------------------------------
      */

      if (
        tournament.format ===
        "GROUP_KNOCKOUT"
      ) {

        /*
        |--------------------------------------------------------------------------
        | Remove any accidentally created groups
        |--------------------------------------------------------------------------
        */

        if (
          tournament.groups.length >
          0
        ) {
          await prisma.group.deleteMany({
            where: {
              tournamentId
            }
          });
        }


        /*
        |--------------------------------------------------------------------------
        | Find existing final stage
        |--------------------------------------------------------------------------
        */

        let finalStage =
          tournament.stages.find(
            (stage) =>
              stage.type ===
              "FINAL"
          );


        /*
        |--------------------------------------------------------------------------
        | Create final stage
        |--------------------------------------------------------------------------
        */

        if (!finalStage) {
          finalStage =
            await prisma.stage.create({
              data: {
                name: "Final",
                type: "FINAL",
                order: 1,
                tournamentId
              }
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Make sure only one direct final exists
        |--------------------------------------------------------------------------
        */

        let finalMatch =
          finalStage.matches?.[0];


        if (!finalMatch) {

          finalMatch =
            await prisma.match.create({
              data: {
                stageId:
                  finalStage.id,

                roundNumber: 1,

                matchNumber: 1,

                homePlayerId:
                  tournament
                    .players[0]
                    .id,

                awayPlayerId:
                  tournament
                    .players[1]
                    .id,

                status:
                  "SCHEDULED",

                isTwoLegged:
                  false
              }
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Activate tournament
        |--------------------------------------------------------------------------
        */

        const updatedTournament =
          await prisma.tournament.update({
            where: {
              id: tournamentId
            },

            data: {
              status: "ACTIVE",
              startDate: new Date()
            }
          });


        return res.json({
          success: true,

          message:
            "2-player tournament started with a direct final",

          tournament:
            updatedTournament,

          final: finalMatch
        });
      }
    }


    /*
    |--------------------------------------------------------------------------
    | Normal tournament start
    |--------------------------------------------------------------------------
    */

    const updatedTournament =
      await prisma.tournament.update({
        where: {
          id: tournamentId
        },

        data: {
          status: "ACTIVE",
          startDate: new Date()
        }
      });


    return res.json({
      success: true,

      message:
        "Tournament started successfully",

      tournament:
        updatedTournament
    });

  } catch (error) {
    console.error(
      "Start tournament error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to start tournament",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
}


/*
|--------------------------------------------------------------------------
| Get Tournament Summary
|--------------------------------------------------------------------------
*/

async function getTournamentSummary(
  req,
  res
) {
  try {
    const tournamentId =
      Number(req.params.id);


    if (
      !Number.isInteger(
        tournamentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid tournament ID"
      });
    }


    const tournament =
      await prisma.tournament.findUnique({
        where: {
          id: tournamentId
        },

        include: {
          players: {
            include: {
              player: true
            }
          },

          groups: {
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
            }
          },

          stages: {
            include: {
              matches: {
                include: {
                  stage: true,

                  legs: {
                    orderBy: {
                      legNumber: "asc"
                    }
                  }
                },

                orderBy: [
                  {
                    roundNumber:
                      "asc"
                  },

                  {
                    matchNumber:
                      "asc"
                  }
                ]
              }
            },

            orderBy: {
              order: "asc"
            }
          }
        }
      });


    if (!tournament) {
      return res.status(404).json({
        success: false,
        message:
          "Tournament not found"
      });
    }


    return res.json({
      success: true,
      tournament
    });

  } catch (error) {
    console.error(
      "Get tournament summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch tournament summary"
    });
  }
}

/*
|--------------------------------------------------------------------------
| Hide Tournament
|--------------------------------------------------------------------------
*/

async function hideTournament(req, res) {
  try {
    const tournamentId = Number(req.params.id);

    if (!Number.isInteger(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tournament ID"
      });
    }

    const tournament = await prisma.tournament.update({
      where: {
        id: tournamentId
      },
      data: {
        isVisible: false
      }
    });

    return res.json({
      success: true,
      message: "Tournament hidden successfully",
      tournament
    });
  } catch (error) {
    console.error("Hide tournament error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to hide tournament"
    });
  }
}


/*
|--------------------------------------------------------------------------
| Show Tournament
|--------------------------------------------------------------------------
*/

async function showTournament(req, res) {
  try {
    const tournamentId = Number(req.params.id);

    if (!Number.isInteger(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tournament ID"
      });
    }

    const tournament = await prisma.tournament.update({
      where: {
        id: tournamentId
      },
      data: {
        isVisible: true
      }
    });

    return res.json({
      success: true,
      message: "Tournament shown successfully",
      tournament
    });
  } catch (error) {
    console.error("Show tournament error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to show tournament"
    });
  }
}


module.exports = {
  getTournaments,
   getAdminTournaments,
  getTournamentById,
  createTournament,
  startTournament,
  getTournamentSummary,
  hideTournament,
  showTournament
};