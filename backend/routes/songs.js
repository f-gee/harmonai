const express = require("express");
const crypto = require("crypto");
const { db } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const songs = db
    .prepare("SELECT id, title, artist, song_key, capo, tempo, created_at, updated_at FROM songs ORDER BY updated_at DESC")
    .all();
  res.json(songs);
});

router.get("/:id", (req, res) => {
  const song = db.prepare("SELECT * FROM songs WHERE id = ?").get(req.params.id);
  if (!song) return res.status(404).json({ error: "Song not found" });
  res.json(song);
});

router.post("/", (req, res) => {
  const { title, artist, key, capo, tempo, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "title and content are required" });
  }
  const now = new Date().toISOString();
  const song = {
    id: crypto.randomUUID(),
    title,
    artist: artist ?? null,
    song_key: key ?? null,
    capo: capo ?? 0,
    tempo: tempo ?? null,
    content,
    created_at: now,
    updated_at: now,
  };
  db.prepare(`
    INSERT INTO songs (id, title, artist, song_key, capo, tempo, content, created_at, updated_at)
    VALUES (@id, @title, @artist, @song_key, @capo, @tempo, @content, @created_at, @updated_at)
  `).run(song);
  res.status(201).json(song);
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM songs WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Song not found" });

  const { title, artist, key, capo, tempo, content } = req.body;
  const updated = {
    id: req.params.id,
    title: title ?? existing.title,
    artist: artist ?? existing.artist,
    song_key: key ?? existing.song_key,
    capo: capo ?? existing.capo,
    tempo: tempo ?? existing.tempo,
    content: content ?? existing.content,
    updated_at: new Date().toISOString(),
  };
  db.prepare(`
    UPDATE songs SET title=@title, artist=@artist, song_key=@song_key, capo=@capo,
      tempo=@tempo, content=@content, updated_at=@updated_at
    WHERE id=@id
  `).run(updated);
  res.json({ ...existing, ...updated });
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM songs WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Song not found" });
  res.status(204).end();
});

module.exports = router;
