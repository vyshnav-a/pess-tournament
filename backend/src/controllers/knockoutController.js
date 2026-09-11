const prisma = require("../lib/prisma");


/*
|--------------------------------------------------------------------------
| Generate Knockout Bracket
|--------------------------------------------------------------------------
|
| Rules:
|
| 2 players
|   -> Direct final is created by startTournament().
|   -> This endpoint must NOT be used.
|
| 3 players
|   -> Group stage completed.
|   -> 1st and 2nd place play the final.
|   -> 3rd place is the third-place player.
|   -> No third-place match.
|
| 4 players
|   -> Semifinals -> Final.
|
| 8 players
|   -> Quarterfinals -> Semifinals -> Final.
|
| 16 players
|   -> Pre-quarterfinals -> Quarterfinals -> Semifinals -> Final.
|
|--------------------------------------------------------------------------
*/

async function generateKnockout(req, res) {
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
              },

              matches: {
                where: {
                  status:
                    "COMPLETED"
                }
              }
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
    | Validate tournament format
    |--------------------------------------------------------------------------
    */

    if (
      tournament.format !==
      "GROUP_KNOCKOUT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tournament is not a group knockout tournament"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Validate status
    |--------------------------------------------------------------------------
    */

    if (
      tournament.status !==
      "ACTIVE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Knockout can only be generated for an active tournament"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | 2 PLAYER RULE
    |--------------------------------------------------------------------------
    */

    if (
      tournament.players.length === 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A 2-player tournament uses a direct final and does not require knockout generation."
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Groups must exist
    |--------------------------------------------------------------------------
    */

    if (
      tournament.groups.length ===
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No groups found"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Check group fixtures
    |--------------------------------------------------------------------------
    */

    for (
      const group of tournament.groups
    ) {

      const playerCount =
        group.members.length;


      if (playerCount < 2) {
        return res.status(400).json({
          success: false,

          message:
            `${group.name} has fewer than 2 players. Invalid group structure.`
        });
      }


      const expectedMatches =
        (
          playerCount *
          (playerCount - 1)
        ) / 2;


      if (
        group.matches.length !==
        expectedMatches
      ) {
        return res.status(400).json({
          success: false,

          message:
            `${group.name} fixtures are not fully generated`
        });
      }


      if (
        group.matches.some(
          (match) =>
            match.status !==
            "COMPLETED"
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "All group matches must be completed before generating the knockout"
        });
      }
    }


    /*
    |--------------------------------------------------------------------------
    | Check whether knockout already exists
    |--------------------------------------------------------------------------
    */

    const existingStages =
      await prisma.stage.findMany({
        where: {
          tournamentId,

          type: {
            in: [
              "PRE_QUARTERFINAL",
              "QUARTERFINAL",
              "SEMIFINAL",
              "FINAL",
              "THIRD_PLACE"
            ]
          }
        }
      });


    if (
      existingStages.length >
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Knockout stage already exists"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Calculate standings
    |--------------------------------------------------------------------------
    */

    const qualifiedPlayers = [];


    for (
      const group of tournament.groups
    ) {

      const table = {};


      /*
      |--------------------------------------------------------------------------
      | Initialize players
      |--------------------------------------------------------------------------
      */

      for (
        const member of group.members
      ) {

        const id =
          member.tournamentPlayerId;


        table[id] = {
          tournamentPlayerId:
            id,

          playerId:
            member.tournamentPlayer
              .player.id,

          name:
            member.tournamentPlayer
              .player.name,

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


      /*
      |--------------------------------------------------------------------------
      | Apply completed matches
      |--------------------------------------------------------------------------
      */

      for (
        const match of group.matches
      ) {

        if (
          match.homeScore ===
            null ||
          match.awayScore ===
            null
        ) {
          continue;
        }


        const home =
          table[
            match.homePlayerId
          ];

        const away =
          table[
            match.awayPlayerId
          ];


        if (
          !home ||
          !away
        ) {
          continue;
        }


        home.played++;
        away.played++;


        home.goalsFor +=
          match.homeScore;

        home.goalsAgainst +=
          match.awayScore;


        away.goalsFor +=
          match.awayScore;

        away.goalsAgainst +=
          match.homeScore;


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


      /*
      |--------------------------------------------------------------------------
      | Goal difference
      |--------------------------------------------------------------------------
      */

      const players =
        Object.values(table);


      for (
        const player of players
      ) {
        player.goalDifference =
          player.goalsFor -
          player.goalsAgainst;
      }


      /*
      |--------------------------------------------------------------------------
      | Sort standings
      |--------------------------------------------------------------------------
      |
      | Points
      | Goal difference
      | Goals scored
      | Name
      |
      */

      players.sort((a, b) => {

        if (
          b.points !==
          a.points
        ) {
          return (
            b.points -
            a.points
          );
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


        if (
          b.goalsFor !==
          a.goalsFor
        ) {
          return (
            b.goalsFor -
            a.goalsFor
          );
        }


        return a.name.localeCompare(
          b.name
        );
      });


      /*
      |--------------------------------------------------------------------------
      | 3 PLAYER SPECIAL RULE
      |--------------------------------------------------------------------------
      |
      | If there are exactly 3 tournament players,
      | top 2 qualify regardless of the configured
      | playersPerGroupQualify setting.
      |
      */

      let qualifyCount;


      if (tournament.players.length === 3) {
  // 3 players:
  // Round robin -> Top 2 -> Final
  qualifyCount = 2;

} else if (
  tournament.players.length === 4 &&
  tournament.groups.length === 1
) {
  // 4 players in one group:
  // Group stage -> Top 4 -> Semifinals
  qualifyCount = players.length;

} else {
  qualifyCount =
    tournament.playersPerGroupQualify || 1;
}


      /*
      |--------------------------------------------------------------------------
      | Validate qualify count
      |--------------------------------------------------------------------------
      */

      if (
        qualifyCount < 1 ||
        qualifyCount >
          players.length
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Invalid number of qualifiers for ${group.name}`
        });
      }


      const qualifiers =
        players.slice(
          0,
          qualifyCount
        );


      qualifiedPlayers.push(
        ...qualifiers.map(
          (player) => ({
            ...player,

            groupId:
              group.id,

            groupName:
              group.name
          })
        )
      );
    }


    /*
    |--------------------------------------------------------------------------
    | 3 PLAYER TO FINAL
    |--------------------------------------------------------------------------
    |
    | Exactly 3 tournament players:
    |
    | 1st -> Final
    | 2nd -> Final
    | 3rd -> finished third
    |
    | No third-place match.
    |
    */

    if (
      tournament.players.length ===
      3
    ) {

      if (
        qualifiedPlayers.length !==
        2
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Exactly 2 players must qualify from a 3-player round robin"
        });
      }


      /*
      |--------------------------------------------------------------------------
      | Create final stage
      |--------------------------------------------------------------------------
      */

      const finalStage =
        await prisma.stage.create({
          data: {
            name: "Final",

            type: "FINAL",

            order: 2,

            tournamentId
          }
        });


      /*
      |--------------------------------------------------------------------------
      | Create final
      |--------------------------------------------------------------------------
      */

      const finalMatch =
        await prisma.match.create({
          data: {
            stageId:
              finalStage.id,

            roundNumber: 1,

            matchNumber: 1,

            homePlayerId:
              qualifiedPlayers[0]
                .tournamentPlayerId,

            awayPlayerId:
              qualifiedPlayers[1]
                .tournamentPlayerId,

            status:
              "SCHEDULED",

            isTwoLegged:
              false
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
          "3-player tournament final generated successfully",

        bracketSize: 2,

        knockoutFormat:
          "SINGLE",

        qualifiedPlayers,

        thirdPlacePlayer:
          tournament.groups[0]
            ? await getThirdPlacePlayer(
                tournament.groups[0],
                tournament
              )
            : null,

        matches: [
          finalMatch
        ]
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Normal 4+ player knockout
    |--------------------------------------------------------------------------
    */

    if (
      qualifiedPlayers.length <
      2
    ) {
      return res.status(400).json({
        success: false,

        message:
          "At least 2 players must qualify"
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Bracket size
    |--------------------------------------------------------------------------
    */

    const bracketSize =
      qualifiedPlayers.length;


    /*
    |--------------------------------------------------------------------------
    | Only valid football knockout sizes
    |--------------------------------------------------------------------------
    */

    if (
      ![
        4,
        8,
        16
      ].includes(bracketSize)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "The number of qualified players must be exactly 4, 8 or 16 for a 4+ player knockout tournament"
      });
    }


    const players =
      qualifiedPlayers.slice(
        0,
        bracketSize
      );


    /*
    |--------------------------------------------------------------------------
    | Determine whether a round is two-legged
    |--------------------------------------------------------------------------
    |
    | ONLY SEMIFINAL can be two-legged.
    |
    */

    function isTwoLeggedForRound(
      roundType
    ) {
      return (
        roundType ===
          "SEMIFINAL" &&
        tournament
          .knockoutLegFormat ===
          "TWO_LEG"
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Determine rounds
    |--------------------------------------------------------------------------
    */

    const rounds = [];


    if (
      bracketSize === 16
    ) {
      rounds.push({
        type:
          "PRE_QUARTERFINAL",

        name:
          "Pre-Quarterfinal",

        order: 2
      });
    }


    if (
      bracketSize >= 8
    ) {
      rounds.push({
        type:
          "QUARTERFINAL",

        name:
          "Quarterfinal",

        order: 3
      });
    }


    if (
      bracketSize >= 4
    ) {
      rounds.push({
        type:
          "SEMIFINAL",

        name:
          "Semifinal",

        order: 4
      });
    }


    rounds.push({
      type:
        "FINAL",

      name:
        "Final",

      order: 5
    });


    /*
    |--------------------------------------------------------------------------
    | Create stages
    |--------------------------------------------------------------------------
    */

    const stages = {};


    for (
      const round of rounds
    ) {

      stages[
        round.type
      ] =
        await prisma.stage.create({
          data: {
            name:
              round.name,

            type:
              round.type,

            order:
              round.order,

            tournamentId
          }
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Third-place stage
    |--------------------------------------------------------------------------
    */

    let thirdPlaceStage =
      null;


    if (
      tournament.thirdPlaceMatch &&
      bracketSize >= 4
    ) {

      thirdPlaceStage =
        await prisma.stage.create({
          data: {
            name:
              "Third Place",

            type:
              "THIRD_PLACE",

            order: 6,

            tournamentId
          }
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Create Match Legs
    |--------------------------------------------------------------------------
    */

    async function createLegsForMatch(
      matchId,
      twoLegged
    ) {

      if (!twoLegged) {
        return;
      }


      await prisma.matchLeg.createMany({
        data: [
          {
            matchId,

            legNumber: 1,

            status:
              "SCHEDULED"
          },

          {
            matchId,

            legNumber: 2,

            status:
              "SCHEDULED"
          }
        ]
      });
    }


    /*
    |--------------------------------------------------------------------------
    | First round
    |--------------------------------------------------------------------------
    */

    let firstRoundType;


    if (
      bracketSize === 16
    ) {

      firstRoundType =
        "PRE_QUARTERFINAL";

    } else if (
      bracketSize === 8
    ) {

      firstRoundType =
        "QUARTERFINAL";

    } else {

      firstRoundType =
        "SEMIFINAL";
    }


    const firstStage =
      stages[
        firstRoundType
      ];


    const firstRoundMatches =
      [];


    for (
      let i = 0;
      i < players.length / 2;
      i++
    ) {

      const home =
        players[i];

      const away =
        players[
          players.length -
          1 -
          i
        ];


      const twoLegged =
        isTwoLeggedForRound(
          firstRoundType
        );


      const match =
        await prisma.match.create({
          data: {
            stageId:
              firstStage.id,

            roundNumber: 1,

            matchNumber:
              i + 1,

            homePlayerId:
              home.tournamentPlayerId,

            awayPlayerId:
              away.tournamentPlayerId,

            status:
              "SCHEDULED",

            isTwoLegged:
              twoLegged
          }
        });


      await createLegsForMatch(
        match.id,
        twoLegged
      );


      firstRoundMatches.push(
        match
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Future rounds
    |--------------------------------------------------------------------------
    */

    let previousMatches =
      firstRoundMatches;


    const futureRoundTypes =
      rounds
        .filter(
          (round) =>
            round.type !==
            firstRoundType
        )
        .map(
          (round) =>
            round.type
        );


    let roundNumber = 2;


    for (
      const roundType of
        futureRoundTypes
    ) {

      const stage =
        stages[
          roundType
        ];


      const matchCount =
        previousMatches.length /
        2;


      const nextMatches =
        [];


      for (
        let i = 0;
        i < matchCount;
        i++
      ) {

        const twoLegged =
          isTwoLeggedForRound(
            roundType
          );


        const match =
          await prisma.match.create({
            data: {
              stageId:
                stage.id,

              roundNumber,

              matchNumber:
                i + 1,

              homePlayerId:
                null,

              awayPlayerId:
                null,

              status:
                "SCHEDULED",

              isTwoLegged:
                twoLegged
            }
          });


        await createLegsForMatch(
          match.id,
          twoLegged
        );


        nextMatches.push(
          match
        );
      }


      /*
      |--------------------------------------------------------------------------
      | Connect winners
      |--------------------------------------------------------------------------
      */

      for (
        let i = 0;
        i <
        previousMatches.length;
        i++
      ) {

        const nextMatch =
          nextMatches[
            Math.floor(i / 2)
          ];


        await prisma.match.update({
          where: {
            id:
              previousMatches[i]
                .id
          },

          data: {
            winnerNextMatchId:
              nextMatch.id
          }
        });
      }


      previousMatches =
        nextMatches;

      roundNumber++;
    }


    /*
    |--------------------------------------------------------------------------
    | Third-place match
    |--------------------------------------------------------------------------
    */

    if (
      thirdPlaceStage &&
      bracketSize >= 4
    ) {

      const semifinalStage =
        stages[
          "SEMIFINAL"
        ];


      const semifinalMatches =
        await prisma.match.findMany({
          where: {
            stageId:
              semifinalStage.id
          },

          orderBy: {
            matchNumber:
              "asc"
          }
        });


      const thirdPlaceMatch =
        await prisma.match.create({
          data: {
            stageId:
              thirdPlaceStage.id,

            roundNumber: 1,

            matchNumber: 1,

            homePlayerId:
              null,

            awayPlayerId:
              null,

            status:
              "SCHEDULED",

            isTwoLegged:
              false
          }
        });


      for (
        const semifinalMatch of
          semifinalMatches
      ) {

        await prisma.match.update({
          where: {
            id:
              semifinalMatch.id
          },

          data: {
            loserNextMatchId:
              thirdPlaceMatch.id
          }
        });
      }
    }


    /*
    |--------------------------------------------------------------------------
    | Get generated matches
    |--------------------------------------------------------------------------
    */

    const matches =
      await prisma.match.findMany({
        where: {
          stage: {
            tournamentId,

            type: {
              in: [
                "PRE_QUARTERFINAL",
                "QUARTERFINAL",
                "SEMIFINAL",
                "FINAL",
                "THIRD_PLACE"
              ]
            }
          }
        },

        include: {
          stage: true,

          legs: {
            orderBy: {
              legNumber:
                "asc"
            }
          }
        },

        orderBy: [
          {
            stage: {
              order:
                "asc"
            }
          },

          {
            matchNumber:
              "asc"
          }
        ]
      });


    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message:
        "Knockout bracket generated successfully",

      bracketSize,

      knockoutFormat:
        tournament
          .knockoutLegFormat,

      qualifiedPlayers:
        players,

      matches
    });

  } catch (error) {

    console.error(
      "Generate knockout error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to generate knockout bracket",

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
| Get Third Place Player
|--------------------------------------------------------------------------
|
| Used only for a 3-player tournament.
|
| The player finishing third in the group
| is automatically the third-place player.
|
|--------------------------------------------------------------------------
*/

async function getThirdPlacePlayer(
  group,
  tournament
) {

  const members =
    group.members;


  const table = {};


  for (
    const member of members
  ) {

    table[
      member.tournamentPlayerId
    ] = {
      tournamentPlayerId:
        member.tournamentPlayerId,

      player:
        member.tournamentPlayer.player,

      points: 0,

      goalsFor: 0,

      goalsAgainst: 0,

      goalDifference: 0
    };
  }


  const matches =
    await prisma.match.findMany({
      where: {
        groupId:
          group.id,

        status:
          "COMPLETED"
      }
    });


  for (
    const match of matches
  ) {

    if (
      match.homeScore === null ||
      match.awayScore === null
    ) {
      continue;
    }


    const home =
      table[
        match.homePlayerId
      ];

    const away =
      table[
        match.awayPlayerId
      ];


    if (
      !home ||
      !away
    ) {
      continue;
    }


    home.goalsFor +=
      match.homeScore;

    home.goalsAgainst +=
      match.awayScore;


    away.goalsFor +=
      match.awayScore;

    away.goalsAgainst +=
      match.homeScore;


    if (
      match.homeScore >
      match.awayScore
    ) {

      home.points += 3;

    } else if (
      match.homeScore <
      match.awayScore
    ) {

      away.points += 3;

    } else {

      home.points += 1;
      away.points += 1;
    }
  }


  const standings =
    Object.values(table);


  for (
    const player of standings
  ) {

    player.goalDifference =
      player.goalsFor -
      player.goalsAgainst;
  }


  standings.sort((a, b) => {

    if (
      b.points !==
      a.points
    ) {
      return (
        b.points -
        a.points
      );
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


    if (
      b.goalsFor !==
      a.goalsFor
    ) {
      return (
        b.goalsFor -
        a.goalsFor
      );
    }


    return a.player.name.localeCompare(
      b.player.name
    );
  });


  return standings[2] || null;
}


/*
|--------------------------------------------------------------------------
| Get Knockout Bracket
|--------------------------------------------------------------------------
*/

async function getKnockoutBracket(
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


    const stages =
      await prisma.stage.findMany({
        where: {
          tournamentId,

          type: {
            in: [
              "PRE_QUARTERFINAL",
              "QUARTERFINAL",
              "SEMIFINAL",
              "FINAL",
              "THIRD_PLACE"
            ]
          }
        },

        include: {
          matches: {
            include: {
              legs: {
                orderBy: {
                  legNumber:
                    "asc"
                }
              },

              stage: true
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
          order:
            "asc"
        }
      });


    if (
      stages.length === 0
    ) {
      return res.status(404).json({
        success: false,

        message:
          "No knockout bracket found"
      });
    }


    return res.json({
      success: true,

      stages
    });

  } catch (error) {

    console.error(
      "Get knockout bracket error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch knockout bracket"
    });
  }
}


module.exports = {
  generateKnockout,
  getKnockoutBracket
};