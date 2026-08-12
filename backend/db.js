const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "harmonai.db");

// Make sure the folder for the db file exists (matters for a fresh Render disk mount too).
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    song_key TEXT,
    capo INTEGER DEFAULT 0,
    tempo INTEGER,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const BACKUP_VERSION = 1;

/**
 * Exports the whole songs table as a plain JSON-serializable object.
 * This is the format used both by the /api/backup route and the
 * standalone scripts/backup.js CLI script, so a dump taken one way
 * can always be fed into the other.
 */
function exportData() {
  const songs = db.prepare("SELECT * FROM songs ORDER BY created_at ASC").all();
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    songs,
  };
}

/**
 * Restores songs from a backup object (see exportData()).
 * mode "replace" wipes the table first; mode "merge" upserts by id.
 */
function importData(backup, mode = "replace") {
  if (!backup || !Array.isArray(backup.songs)) {
    throw new Error("Invalid backup file: expected a { songs: [...] } object");
  }

  const insert = db.prepare(`
    INSERT INTO songs (id, title, artist, song_key, capo, tempo, content, created_at, updated_at)
    VALUES (@id, @title, @artist, @song_key, @capo, @tempo, @content, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      artist=excluded.artist,
      song_key=excluded.song_key,
      capo=excluded.capo,
      tempo=excluded.tempo,
      content=excluded.content,
      updated_at=excluded.updated_at
  `);

  const runAll = db.transaction((songs) => {
    if (mode === "replace") {
      db.prepare("DELETE FROM songs").run();
    }
    for (const song of songs) {
      insert.run({
        id: song.id,
        title: song.title,
        artist: song.artist ?? null,
        song_key: song.song_key ?? null,
        capo: song.capo ?? 0,
        tempo: song.tempo ?? null,
        content: song.content,
        created_at: song.created_at ?? new Date().toISOString(),
        updated_at: song.updated_at ?? new Date().toISOString(),
      });
    }
  });

  runAll(backup.songs);
  return { imported: backup.songs.length, mode };
}

module.exports = { db, exportData, importData, DB_PATH };
