require("dotenv").config();
const express = require("express");
const cors = require("cors");

const songsRouter = require("./routes/songs");
const backupRouter = require("./routes/backup");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/songs", songsRouter);
app.use("/api/backup", backupRouter);
app.use("/api/restore", backupRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Harmonai backend listening on http://localhost:${PORT}`);
});
