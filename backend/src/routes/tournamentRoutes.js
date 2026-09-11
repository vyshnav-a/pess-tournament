const express = require("express");

const {
  getTournaments,
  getAdminTournaments,
  getTournamentById,
  createTournament,
  startTournament,
  getTournamentSummary,
  hideTournament,
  showTournament
} = require("../controllers/tournamentController");

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
  getTournaments
);

router.get(
  "/admin/all",
  requireAuth,
  requireAdmin,
  getAdminTournaments
);

router.get(
  "/:id",
  getTournamentById
);

router.get(
  "/:id/summary",
  getTournamentSummary
);

// --------------------------------------------------
// ADMIN ONLY
// --------------------------------------------------

router.post(
  "/",
  requireAuth,
  requireAdmin,
  createTournament
);

router.post(
  "/:id/start",
  requireAuth,
  requireAdmin,
  startTournament
);

router.patch(
  "/:id/hide",
  requireAuth,
  requireAdmin,
  hideTournament
);

router.patch(
  "/:id/show",
  requireAuth,
  requireAdmin,
  showTournament
);

module.exports = router;