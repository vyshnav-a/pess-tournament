const prisma = require("../lib/prisma");

async function getPlayers(req, res) {
  try {
    const players = await prisma.player.findMany({
      orderBy: {
        name: "asc"
      }
    });

    res.json({
      success: true,
      players
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch players"
    });
  }
}

async function createPlayer(req, res) {
  try {
    const {
      name,
      gamerTag,
      image
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Player name is required"
      });
    }

    const player = await prisma.player.create({
      data: {
        name,
        gamerTag: gamerTag || null,
        image: image || null
      }
    });

    res.status(201).json({
      success: true,
      player
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create player"
    });
  }
}

async function addPlayerToTournament(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    const playerId = Number(req.body.playerId);

    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: "Player ID is required"
      });
    }

    const tournamentPlayer =
      await prisma.tournamentPlayer.create({
        data: {
          tournamentId,
          playerId
        },
        include: {
          player: true
        }
      });

    res.status(201).json({
      success: true,
      tournamentPlayer
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to add player to tournament"
    });
  }
}

async function removePlayerFromTournament(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    const playerId = Number(req.params.playerId);

    const tournamentPlayer =
      await prisma.tournamentPlayer.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId
          }
        }
      });

    if (!tournamentPlayer) {
      return res.status(404).json({
        success: false,
        message: "Player is not part of this tournament"
      });
    }

    await prisma.tournamentPlayer.delete({
      where: {
        id: tournamentPlayer.id
      }
    });

    res.json({
      success: true,
      message: "Player removed from tournament"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to remove player"
    });
  }
}

async function getTournamentPlayers(req, res) {
  try {
    const tournamentId = Number(req.params.id);

    const players =
      await prisma.tournamentPlayer.findMany({
        where: {
          tournamentId
        },
        include: {
          player: true
        },
        orderBy: {
          id: "asc"
        }
      });

    res.json({
      success: true,
      players
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch tournament players"
    });
  }
}

module.exports = {
  getPlayers,
  createPlayer,
  addPlayerToTournament,
  removePlayerFromTournament,
  getTournamentPlayers
};