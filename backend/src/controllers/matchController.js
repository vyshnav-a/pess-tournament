const prisma = require("../lib/prisma");


/*
|--------------------------------------------------------------------------
| Get Tournament Matches
|--------------------------------------------------------------------------
*/

async function getTournamentMatches(req, res) {
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

    const matches =
      await prisma.match.findMany({
        where: {
          stage: {
            tournamentId
          }
        },

        include: {
          stage: true,

          legs: {
            orderBy: {
              legNumber: "asc"
            }
          },

          group: {
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
          }
        },

        orderBy: {
          id: "asc"
        }
      });

    return res.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error(
      "Get tournament matches error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch matches"
    });
  }
}


/*
|--------------------------------------------------------------------------
| Generate Group Fixtures
|--------------------------------------------------------------------------
*/

async function generateGroupFixtures(
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
          groups: {
            include: {
              members: true
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

    if (
      tournament.status !==
      "ACTIVE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Group fixtures can only be generated for an active tournament"
      });
    }

    if (
      tournament.groups.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Generate groups before generating fixtures"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get or create group stage
    |--------------------------------------------------------------------------
    */

    let stage =
      await prisma.stage.findFirst({
        where: {
          tournamentId,
          type: "GROUP"
        }
      });

    if (!stage) {
      stage =
        await prisma.stage.create({
          data: {
            name: "Group Stage",
            type: "GROUP",
            order: 1,
            tournamentId
          }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Remove existing group matches
    |--------------------------------------------------------------------------
    */

    await prisma.match.deleteMany({
      where: {
        stageId: stage.id
      }
    });

    let totalMatches = 0;

    /*
    |--------------------------------------------------------------------------
    | Generate round-robin fixtures
    |--------------------------------------------------------------------------
    */

    for (
      const group
      of tournament.groups
    ) {
      const members =
        group.members;

      for (
        let i = 0;
        i < members.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < members.length;
          j++
        ) {
          await prisma.match.create({
            data: {
              stageId: stage.id,

              groupId: group.id,

              homePlayerId:
                members[i]
                  .tournamentPlayerId,

              awayPlayerId:
                members[j]
                  .tournamentPlayerId,

              status: "SCHEDULED",

              isTwoLegged: false
            }
          });

          totalMatches++;
        }
      }
    }

    return res.status(201).json({
      success: true,

      message:
        "Group fixtures generated successfully",

      totalMatches
    });

  } catch (error) {
    console.error(
      "Generate group fixtures error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate fixtures"
    });
  }
}


/*
|--------------------------------------------------------------------------
| Helper: Advance player
|--------------------------------------------------------------------------
*/

async function placePlayerInNextMatch(
  matchId,
  playerId
) {
  if (!matchId || !playerId) {
    return null;
  }

  const nextMatch =
    await prisma.match.findUnique({
      where: {
        id: matchId
      }
    });

  if (!nextMatch) {
    return null;
  }

  if (
    nextMatch.homePlayerId ===
    playerId ||
    nextMatch.awayPlayerId ===
    playerId
  ) {
    return nextMatch;
  }

  if (
    nextMatch.homePlayerId ===
    null
  ) {
    return prisma.match.update({
      where: {
        id: nextMatch.id
      },

      data: {
        homePlayerId: playerId
      }
    });
  }

  if (
    nextMatch.awayPlayerId ===
    null
  ) {
    return prisma.match.update({
      where: {
        id: nextMatch.id
      },

      data: {
        awayPlayerId: playerId
      }
    });
  }

  return nextMatch;
}


/*
|--------------------------------------------------------------------------
| Helper: Complete tournament if required
|--------------------------------------------------------------------------
*/

async function checkTournamentCompletion(tournamentId) {
  const tournament =
    await prisma.tournament.findUnique({
      where: {
        id: tournamentId
      },

      include: {
        stages: {
          where: {
            type: {
              in: [
                "FINAL",
                "THIRD_PLACE"
              ]
            }
          },

          include: {
            matches: true
          }
        }
      }
    });

  if (!tournament) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | FINAL
  |--------------------------------------------------------------------------
  */

  const finalStage =
    tournament.stages.find(
      (stage) =>
        stage.type === "FINAL"
    );

  if (!finalStage) {
    return;
  }

  const finalMatch =
    finalStage.matches[0];

  /*
  |--------------------------------------------------------------------------
  | Final must exist and be completed
  |--------------------------------------------------------------------------
  */

  if (
    !finalMatch ||
    finalMatch.status !== "COMPLETED"
  ) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | THIRD PLACE
  |--------------------------------------------------------------------------
  |
  | If the tournament has a third-place match,
  | the tournament cannot finish until that
  | match is completed.
  |
  */

  const thirdPlaceStage =
    tournament.stages.find(
      (stage) =>
        stage.type === "THIRD_PLACE"
    );

 if (
  tournament.thirdPlaceMatch &&
  thirdPlaceStage?.matches?.[0]
) {
  const thirdPlaceMatch =
    thirdPlaceStage.matches[0];

  if (
    thirdPlaceMatch.status !==
    "COMPLETED"
  ) {
    return;
  }
}

  /*
  |--------------------------------------------------------------------------
  | TOURNAMENT COMPLETE
  |--------------------------------------------------------------------------
  */

  await prisma.tournament.update({
    where: {
      id: tournamentId
    },

    data: {
      status: "COMPLETED",
      endDate: new Date()
    }
  });
}


/*
|--------------------------------------------------------------------------
| Update Match Score
|--------------------------------------------------------------------------
*/

async function updateMatchScore(
  req,
  res
) {
  try {
    const matchId =
      Number(req.params.id);

    const homeScore =
      Number(req.body.homeScore);

    const awayScore =
      Number(req.body.awayScore);

    const legNumber =
      req.body.legNumber ===
      undefined
        ? null
        : Number(req.body.legNumber);

    /*
    |--------------------------------------------------------------------------
    | 1. Validate match ID
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(matchId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid match ID"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Validate scores
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(
        homeScore
      ) ||
      !Number.isInteger(
        awayScore
      ) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Scores must be non-negative integers"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Validate leg number
    |--------------------------------------------------------------------------
    */

    if (
      legNumber !== null &&
      ![1, 2].includes(
        legNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Leg number must be 1 or 2"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Get match
    |--------------------------------------------------------------------------
    */

    const match =
      await prisma.match.findUnique({
        where: {
          id: matchId
        },

        include: {
          stage: true,

          legs: {
            orderBy: {
              legNumber: "asc"
            }
          }
        }
      });

    if (!match) {
      return res.status(404).json({
        success: false,
        message:
          "Match not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 5. Get tournament
    |--------------------------------------------------------------------------
    */

    const tournament =
      await prisma.tournament.findUnique({
        where: {
          id:
            match.stage.tournamentId
        }
      });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message:
          "Tournament not found"
      });
    }

    if (
      tournament.status !==
      "ACTIVE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Match results can only be entered for an active tournament"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Match must have both players
    |--------------------------------------------------------------------------
    */

    if (
      match.homePlayerId ===
        null ||
      match.awayPlayerId ===
        null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both players must be assigned before entering the result"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 7. Determine knockout
    |--------------------------------------------------------------------------
    */

    const knockoutTypes = [
      "PRE_QUARTERFINAL",
      "QUARTERFINAL",
      "SEMIFINAL",
      "FINAL",
      "THIRD_PLACE"
    ];

    const isKnockout =
      knockoutTypes.includes(
        match.stage.type
      );

    /*
    |--------------------------------------------------------------------------
    | 8. Two-legged match
    |--------------------------------------------------------------------------
    */

    if (match.isTwoLegged) {

      /*
      | legNumber is mandatory
      */

      if (legNumber === null) {
        return res.status(400).json({
          success: false,
          message:
            "Leg number is required for a two-legged match"
        });
      }

      /*
      | Two-legged knockout leg can be drawn.
      */

      const leg =
        match.legs.find(
          (item) =>
            item.legNumber ===
            legNumber
        );

      if (!leg) {
        return res.status(404).json({
          success: false,
          message:
            `Leg ${legNumber} not found`
        });
      }

      if (
        leg.status ===
        "COMPLETED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Leg ${legNumber} is already completed`
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Save leg
      |--------------------------------------------------------------------------
      */

      await prisma.matchLeg.update({
        where: {
          id: leg.id
        },

        data: {
          homeScore,
          awayScore,
          status: "COMPLETED"
        }
      });

      /*
      |--------------------------------------------------------------------------
      | Check both legs
      |--------------------------------------------------------------------------
      */

      const updatedLegs =
        await prisma.matchLeg.findMany({
          where: {
            matchId
          },

          orderBy: {
            legNumber: "asc"
          }
        });

      const leg1 =
        updatedLegs.find(
          (item) =>
            item.legNumber === 1
        );

      const leg2 =
        updatedLegs.find(
          (item) =>
            item.legNumber === 2
        );

      /*
      |--------------------------------------------------------------------------
      | Leg 1 complete, wait for Leg 2
      |--------------------------------------------------------------------------
      */

      if (
        !leg1 ||
        !leg2 ||
        leg1.status !==
          "COMPLETED" ||
        leg2.status !==
          "COMPLETED"
      ) {
        return res.json({
          success: true,

          message:
            `Leg ${legNumber} result saved. Waiting for the other leg.`,

          match,

          legs: updatedLegs,

          tieCompleted: false
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Aggregate score
      |--------------------------------------------------------------------------
      */

      const aggregateHome =
        leg1.homeScore +
        leg2.homeScore;

      const aggregateAway =
        leg1.awayScore +
        leg2.awayScore;

      /*
      |--------------------------------------------------------------------------
      | Aggregate cannot be tied
      |--------------------------------------------------------------------------
      */

      if (
        aggregateHome ===
        aggregateAway
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Aggregate score is tied. Extra-time or penalty handling is required before this tie can be completed."
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Determine aggregate winner
      |--------------------------------------------------------------------------
      */

      let winnerId;
      let loserId;

      if (
        aggregateHome >
        aggregateAway
      ) {
        winnerId =
          match.homePlayerId;

        loserId =
          match.awayPlayerId;
      } else {
        winnerId =
          match.awayPlayerId;

        loserId =
          match.homePlayerId;
      }

      /*
      |--------------------------------------------------------------------------
      | Complete parent match
      |--------------------------------------------------------------------------
      */

      const updatedMatch =
        await prisma.match.update({
          where: {
            id: matchId
          },

          data: {
            homeScore:
              aggregateHome,

            awayScore:
              aggregateAway,

            status: "COMPLETED",

            completedAt:
              new Date()
          },

          include: {
            stage: true,

            legs: {
              orderBy: {
                legNumber: "asc"
              }
            }
          }
        });

      /*
      |--------------------------------------------------------------------------
      | Elimination
      |--------------------------------------------------------------------------
      |
      | A semifinal loser is NOT eliminated if
      | they have a third-place match.
      |--------------------------------------------------------------------------
      */

      if (
        loserId &&
        !(
          match.stage.type ===
            "SEMIFINAL" &&
          match.loserNextMatchId
        )
      ) {
        await prisma.tournamentPlayer.update({
          where: {
            id: loserId
          },

          data: {
            eliminated: true
          }
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Final winner
      |--------------------------------------------------------------------------
      */

      if (
        match.stage.type ===
        "FINAL"
      ) {
        await prisma.tournamentPlayer.update({
          where: {
            id: winnerId
          },

          data: {
            eliminated: false
          }
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Advance winner
      |--------------------------------------------------------------------------
      */

      if (
        winnerId &&
        match.winnerNextMatchId
      ) {
        await placePlayerInNextMatch(
          match.winnerNextMatchId,
          winnerId
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Advance semifinal loser to 3rd place
      |--------------------------------------------------------------------------
      */

      if (
        loserId &&
        match.loserNextMatchId
      ) {
        await placePlayerInNextMatch(
          match.loserNextMatchId,
          loserId
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Check tournament completion
      |--------------------------------------------------------------------------
      */

      await checkTournamentCompletion(
        tournament.id
      );

      return res.json({
        success: true,

        message:
          "Two-legged knockout tie completed",

        match:
          updatedMatch,

        legs:
          updatedLegs,

        aggregate: {
          home:
            aggregateHome,

          away:
            aggregateAway
        },

        winnerId,

        loserId
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 9. Single-leg match
    |--------------------------------------------------------------------------
    */

    if (
      isKnockout &&
      homeScore === awayScore
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Knockout matches cannot end in a draw"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 10. Determine winner / loser
    |--------------------------------------------------------------------------
    */

    let winnerId = null;
    let loserId = null;

    if (
      homeScore >
      awayScore
    ) {
      winnerId =
        match.homePlayerId;

      loserId =
        match.awayPlayerId;

    } else if (
      awayScore >
      homeScore
    ) {
      winnerId =
        match.awayPlayerId;

      loserId =
        match.homePlayerId;
    }

    /*
    |--------------------------------------------------------------------------
    | 11. Update match
    |--------------------------------------------------------------------------
    */

    const updatedMatch =
      await prisma.match.update({
        where: {
          id: matchId
        },

        data: {
          homeScore,
          awayScore,

          status: "COMPLETED",

          completedAt:
            new Date()
        },

        include: {
          stage: true,

          legs: {
            orderBy: {
              legNumber: "asc"
            }
          }
        }
      });

    /*
    |--------------------------------------------------------------------------
    | 12. Group-stage result
    |--------------------------------------------------------------------------
    */

    if (!isKnockout) {
      return res.json({
        success: true,

        message:
          "Match result saved",

        match:
          updatedMatch
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 13. Eliminate loser
    |--------------------------------------------------------------------------
    |
    | Semifinal losers go to third place,
    | therefore they are not eliminated yet.
    |--------------------------------------------------------------------------
    */

    if (
      loserId &&
      !(
        match.stage.type ===
          "SEMIFINAL" &&
        match.loserNextMatchId
      )
    ) {
      await prisma.tournamentPlayer.update({
        where: {
          id: loserId
        },

        data: {
          eliminated: true
        }
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 14. Final winner
    |--------------------------------------------------------------------------
    */

    if (
      match.stage.type ===
      "FINAL"
    ) {
      await prisma.tournamentPlayer.update({
        where: {
          id: winnerId
        },

        data: {
          eliminated: false
        }
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 15. Advance winner
    |--------------------------------------------------------------------------
    */

    if (
      winnerId &&
      match.winnerNextMatchId
    ) {
      await placePlayerInNextMatch(
        match.winnerNextMatchId,
        winnerId
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 16. Advance semifinal loser
    |--------------------------------------------------------------------------
    */

    if (
      loserId &&
      match.loserNextMatchId
    ) {
      await placePlayerInNextMatch(
        match.loserNextMatchId,
        loserId
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 17. Third-place result
    |--------------------------------------------------------------------------
    */

    if (
      match.stage.type ===
      "THIRD_PLACE"
    ) {
      /*
      | Third-place winner is not eliminated.
      */

      await prisma.tournamentPlayer.update({
        where: {
          id: winnerId
        },

        data: {
          eliminated: false
        }
      });

      /*
      | Third-place loser is eliminated.
      */

      await prisma.tournamentPlayer.update({
        where: {
          id: loserId
        },

        data: {
          eliminated: true
        }
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 18. Check tournament completion
    |--------------------------------------------------------------------------
    */

    if (
      match.stage.type ===
        "FINAL" ||
      match.stage.type ===
        "THIRD_PLACE"
    ) {
      await checkTournamentCompletion(
        tournament.id
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 19. Get next matches
    |--------------------------------------------------------------------------
    */

    const nextMatchIds = [
      match.winnerNextMatchId,
      match.loserNextMatchId
    ].filter(Boolean);

    const nextMatches =
      await prisma.match.findMany({
        where: {
          id: {
            in: nextMatchIds
          }
        },

        include: {
          stage: true,

          legs: {
            orderBy: {
              legNumber: "asc"
            }
          }
        },

        orderBy: {
          id: "asc"
        }
      });

    /*
    |--------------------------------------------------------------------------
    | 20. Response
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      message:
        "Knockout result saved and players advanced",

      match:
        updatedMatch,

      winnerId,

      loserId,

      nextMatches
    });

  } catch (error) {
    console.error(
      "Update match score error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to update match score",

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
| Generate Missing Group Fixtures
|--------------------------------------------------------------------------
*/

async function generateMissingGroupFixtures(
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

    const groups =
      await prisma.group.findMany({
        where: {
          tournamentId
        },

        include: {
          members: true,
          matches: true
        },

        orderBy: {
          id: "asc"
        }
      });

    if (
      groups.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No groups found"
      });
    }

    let stage =
      await prisma.stage.findFirst({
        where: {
          tournamentId,
          type: "GROUP"
        }
      });

    if (!stage) {
      stage =
        await prisma.stage.create({
          data: {
            name: "Group Stage",
            type: "GROUP",
            order: 1,
            tournamentId
          }
        });
    }

    let totalMatches = 0;

    for (
      const group of groups
    ) {
      if (
        group.matches.length > 0
      ) {
        continue;
      }

      const members =
        group.members;

      if (
        members.length < 2
      ) {
        continue;
      }

      for (
        let i = 0;
        i < members.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < members.length;
          j++
        ) {
          await prisma.match.create({
            data: {
              stageId:
                stage.id,

              groupId:
                group.id,

              homePlayerId:
                members[i]
                  .tournamentPlayerId,

              awayPlayerId:
                members[j]
                  .tournamentPlayerId,

              status: "SCHEDULED",

              isTwoLegged: false
            }
          });

          totalMatches++;
        }
      }
    }

    return res.status(201).json({
      success: true,

      message:
        "Missing group fixtures generated",

      totalMatches
    });

  } catch (error) {
    console.error(
      "Generate missing fixtures error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to generate missing fixtures"
    });
  }
}


/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  getTournamentMatches,
  generateGroupFixtures,
  generateMissingGroupFixtures,
  updateMatchScore
};