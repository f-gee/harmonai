const express = require("express");
const { exportData, importData } = require("../db");

const router = express.Router();

// GET /api/backup -> downloads the full DB as JSON
router.get("/", (req, res) => {
  const data = exportData();
  res.setHeader("Content-Disposition", `attachment; filename="harmonai-backup-${Date.now()}.json"`);
  res.json(data);
});

// POST /api/restore?mode=replace|merge -> restores from an uploaded backup JSON body
router.post("/", express.json({ limit: "10mb" }), (req, res) => {
  const mode = req.query.mode === "merge" ? "merge" : "replace";
  try {
    const result = importData(req.body, mode);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
