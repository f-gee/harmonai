# Harmonai

A songbook app: store lyrics with inline chord markup, render chords aligned
above the lyrics, transpose, and (later) get improvisation suggestions.

Markup format:

```
{Verse 1}
[G]These are the lyrics o[Am]f the song
```

renders as:

```
G                    Am
These are the lyrics of the song
```

Section headers use `{Curly Braces}` (kept distinct from `[Chords]` so the
two never collide). Blank lines are preserved as spacing.

## Structure

```
harmonai/
  backend/    Express + better-sqlite3 API
  frontend/   Expo app (React Native + web via react-native-web)
```

## Why these choices

- **Expo**, not bare React Native: one command builds to web, iOS, and
  Android, and there's no native tooling to configure to get started.
  `react-native-web` under the hood is what makes the web target work.
- **better-sqlite3**, not Postgres/Mongo: the whole DB is one file, so
  backup/restore is just "copy or dump the file" — a good fit for hosting
  you might move later. Deploy the backend to **Render** with a persistent
  disk (Vercel's serverless functions have an ephemeral filesystem, so
  SQLite won't survive between requests there — Vercel is still fine for
  hosting the frontend web build).

## Data model

`songs` table / API resource:

| field        | type    | notes                                |
|--------------|---------|---------------------------------------|
| id           | text    | uuid                                  |
| title        | text    |                                        |
| artist       | text?   |                                        |
| song_key     | text?   | e.g. "G", used to bias # vs b spelling on transpose |
| capo         | int     | default 0                             |
| tempo        | int?    |                                        |
| content      | text    | raw Harmonai markup (source of truth) |
| created_at   | text    | ISO timestamp                         |
| updated_at   | text    | ISO timestamp                         |

The markup itself (`content`) is the source of truth — chords aren't
pre-split into a separate table. `frontend/src/lib/chordParser.ts` parses it
on demand into:

```ts
ParsedChord   { raw, root, quality, bass? }
ChordToken    { chord, index }       // index = char offset in stripped lyric line
ParsedLine    { type, plainText, chords, sectionLabel? }
ParsedSong    { lines }
```

`buildChordRow()` turns a line's chord tokens into a single aligned text row
for rendering. `transpose.ts` shifts chord roots/basses by semitones through
a 12-note chromatic table and re-serializes — this is what the transpose
buttons in `SongScreen` use.

## Running locally

The root `package.json` wires `backend` and `frontend` together as npm
workspaces, so one install and one command runs both:

```bash
npm install                # installs both workspaces
cp backend/.env.example backend/.env
npm run dev                 # backend on :4000 + frontend web on :8081, side by side
```

`npm run dev` opens the web target directly (most convenient for day-to-day
work). If you want the Expo QR code / interactive menu to test on a phone
via Expo Go, use `npm run dev:mobile` instead.

Other root scripts, if you want to run things individually or without
`concurrently`:

```bash
npm run backend     # just the API, :4000
npm run frontend    # just the Expo web dev server
npm run backup       # runs backend/scripts/backup.js
npm run restore      # runs backend/scripts/restore.js
```

(Everything still works the old way too — `cd backend && npm install && npm run dev`,
`cd frontend && npm install && npx expo start` — the workspace setup is just
a convenience layer on top.)

The frontend's API URL is read from `app.json` → `expo.extra.apiUrl`. Update
it once you deploy the backend.

## Backup & restore

Three ways to get your data out as plain JSON, in case you switch hosts:

```bash
# While the server is running:
curl http://localhost:4000/api/backup -o harmonai-backup.json
curl -X POST "http://localhost:4000/api/restore?mode=replace" \
  -H "Content-Type: application/json" \
  --data @harmonai-backup.json

# Or directly against the DB file, no server needed:
cd backend
node scripts/backup.js my-backup.json
node scripts/restore.js my-backup.json          # replaces existing songs
node scripts/restore.js my-backup.json --merge  # upserts instead of wiping
```

The backup file is just `{ version, exportedAt, songs: [...] }` — easy to
inspect, diff, or hand-edit if needed.

## Deploying

- **Backend → Render**: New Web Service from this repo's `backend/`
  directory. Add a Render Disk (e.g. 1GB, mounted at `/data`), set
  `DB_PATH=/data/harmonai.db` as an env var. Build command `npm install`,
  start command `npm start`.
- **Frontend web → Vercel**: `npx expo export -p web` produces a static
  `dist/` you can deploy as-is. Update `apiUrl` in `app.json` to your Render
  URL before building.
- **Frontend mobile**: use [EAS Build](https://docs.expo.dev/build/introduction/)
  when you're ready to ship to TestFlight / Play Store — not needed for
  local development, Expo Go covers that.

## What's next

This is boilerplate: dark/light theme, markup parsing, aligned chord
rendering, and working transposition are wired up end-to-end. Not yet built:
song creation/editing UI, real navigation (currently a simple two-screen
state switch, no deep linking), auth, and the improvisation-suggestion
feature — the parser's `quality` field is deliberately left as an opaque
string for now so chord-theory logic (diatonic/pentatonic suggestions) can
be layered on without reshaping the data model.
