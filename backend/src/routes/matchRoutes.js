const express = require("express");

const {
  getTournamentMatches,
  generateGroupFixtures,
  updateMatchScore,
  generateMissingGroupFixtures
} = require("../controllers/matchController");

const {
  requireAuth,
  requireAdmin
} = require("../middleware/authMiddleware");

const router = express.Router();

// --------------------------------------------------
// PUBLIC / VIEWER
// --------------------------------------------------

router.get(
  "/tournament/:id",
  getTournamentMatches
);

// --------------------------------------------------
// ADMIN ONLY
// --------------------------------------------------

router.post(
  "/tournament/:id/generate-missing",
  requireAuth,
  requireAdmin,
  generateMissingGroupFixtures
);

router.post(
  "/tournament/:id/generate",
  requireAuth,
  requireAdmin,
  generateGroupFixtures
);

router.put(
  "/:id/score",
  requireAuth,
  requireAdmin,
  updateMatchScore
);

module.exports = router;