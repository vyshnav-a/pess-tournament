const express = require("express");

const {
  getTournamentStandings
} = require("../controllers/standingsController");

const router = express.Router();

router.get(
  "/tournament/:id",
  getTournamentStandings
);

module.exports = router;