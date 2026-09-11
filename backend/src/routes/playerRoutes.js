const express = require("express");

const {
  getPlayers,
  createPlayer,
  addPlayerToTournament,
  removePlayerFromTournament,
  getTournamentPlayers
} = require("../controllers/playerController");

const {
  requireAuth,
  requireAdmin
} = require("../middleware/authMiddleware");

const router = express.Router();

// --------------------------------------------------
// PUBLIC / VIEWER
// --------------------------------------------------

router.get(
  "/",
  getPlayers
);

router.get(
  "/tournament/:id",
  getTournamentPlayers
);

// --------------------------------------------------
// ADMIN ONLY
// --------------------------------------------------

router.post(
  "/",
  requireAuth,
  requireAdmin,
  createPlayer
);

router.post(
  "/tournament/:id",
  requireAuth,
  requireAdmin,
  addPlayerToTournament
);

router.delete(
  "/tournament/:id/:playerId",
  requireAuth,
  requireAdmin,
  removePlayerFromTournament
);

module.exports = router;