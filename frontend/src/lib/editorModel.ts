/**
 * Editable (WYSIWYG) representation of a song.
 *
 * The chord parser already models a line as plain lyric text plus a list of
 * chords positioned at character offsets. That's great for rendering and
 * transposing, but it's awkward to edit directly: moving a chord means
 * recomputing an index, and there's nothing to key a UI element on.
 *
 * This module reshapes each lyric line into an ordered list of "chunks":
 *
 *   [G]These are the lyrics o[Am]f the song
 *   -> [{ chord: "",   lyric: "These are the lyrics o" },
 *       { chord: "Am", lyric: "f the song" }]
 *
 * A chunk pairs one optional chord with the run of lyric text that follows
 * it, up to the next chord (or end of line). The first chunk on a line may
 * have an empty chord if the line starts with plain lyrics. Every other
 * chunk always has a chord, because that's what created the chunk boundary.
 *
 * This lets a WYSIWYG editor render "chord above word" pairs as stable,
 * independently-editable units, and lets edits (retype lyric text, retype
 * chord, split a chunk to insert a new chord mid-run, delete a chord) stay
 * simple, local array operations. `contentFromLines` turns the whole thing
 * back into ordinary Harmonai markup text at any point.
 */

import { ChordToken, ParsedLine, parseSong, LineType } from "./chordParser";

export interface EditableChunk {
  id: string;
  /** Raw chord text, e.g. "Am7". Empty string means "no chord attached". */
  chord: string;
  lyric: string;
}

export interface EditableLine {
  id: string;
  type: LineType;
  sectionLabel?: string;
  chunks: EditableChunk[];
}

export type EditableSong = EditableLine[];

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

function emptyChunk(): EditableChunk {
  return { id: genId("chunk"), chord: "", lyric: "" };
}

function buildChunks(plainText: string, chordTokens: ChordToken[]): EditableChunk[] {
  const sorted = [...chordTokens].sort((a, b) => a.index - b.index);
  const chunks: EditableChunk[] = [];

  if (sorted.length === 0) {
    return [{ id: genId("chunk"), chord: "", lyric: plainText }];
  }

  if (sorted[0].index > 0) {
    chunks.push({ id: genId("chunk"), chord: "", lyric: plainText.slice(0, sorted[0].index) });
  }

  sorted.forEach((token, i) => {
    const end = i + 1 < sorted.length ? sorted[i + 1].index : plainText.length;
    chunks.push({ id: genId("chunk"), chord: token.chord.raw, lyric: plainText.slice(token.index, end) });
  });

  return chunks.length > 0 ? chunks : [emptyChunk()];
}

function lineToEditable(line: ParsedLine): EditableLine {
  if (line.type === "blank") {
    return { id: genId("line"), type: "blank", chunks: [] };
  }
  if (line.type === "section") {
    return { id: genId("line"), type: "section", sectionLabel: line.sectionLabel ?? "", chunks: [] };
  }
  return { id: genId("line"), type: "lyrics", chunks: buildChunks(line.plainText, line.chords) };
}

/** Parses raw Harmonai markup text into the editable chunk model. */
export function linesFromContent(content: string): EditableSong {
  const parsed = parseSong(content);
  const lines = parsed.lines.map(lineToEditable);
  return lines.length > 0 ? lines : [{ id: genId("line"), type: "blank", chunks: [] }];
}

function chunksToRawLine(chunks: EditableChunk[]): string {
  return chunks.map((c) => (c.chord ? `[${c.chord}]${c.lyric}` : c.lyric)).join("");
}

/** Serializes the editable chunk model back into Harmonai markup text. */
export function contentFromLines(lines: EditableSong): string {
  return lines
    .map((line) => {
      if (line.type === "blank") return "";
      if (line.type === "section") return `{${line.sectionLabel ?? ""}}`;
      return chunksToRawLine(line.chunks);
    })
    .join("\n");
}

/** Removes redundant empty (no chord, no lyric) chunks, keeping at least one per line. */
function normalizeChunks(chunks: EditableChunk[]): EditableChunk[] {
  const cleaned = chunks.filter((c) => c.chord !== "" || c.lyric !== "");
  return cleaned.length > 0 ? cleaned : [emptyChunk()];
}

function mapLine(song: EditableSong, lineId: string, fn: (line: EditableLine) => EditableLine): EditableSong {
  return song.map((line) => (line.id === lineId ? fn(line) : line));
}

export function updateChunkLyric(song: EditableSong, lineId: string, chunkId: string, lyric: string): EditableSong {
  return mapLine(song, lineId, (line) => ({
    ...line,
    chunks: line.chunks.map((c) => (c.id === chunkId ? { ...c, lyric } : c)),
  }));
}

export function updateChunkChord(song: EditableSong, lineId: string, chunkId: string, chord: string): EditableSong {
  return mapLine(song, lineId, (line) => ({
    ...line,
    chunks: normalizeChunks(line.chunks.map((c) => (c.id === chunkId ? { ...c, chord: chord.trim() } : c))),
  }));
}

/** Removes the chord from a chunk, merging its lyric text into the run of plain text around it. */
export function removeChunkChord(song: EditableSong, lineId: string, chunkId: string): EditableSong {
  return mapLine(song, lineId, (line) => {
    const next = line.chunks.map((c) => (c.id === chunkId ? { ...c, chord: "" } : c));
    // Merge consecutive no-chord chunks so we don't leave duplicate empty-chord runs.
    const merged: EditableChunk[] = [];
    for (const c of next) {
      const prev = merged[merged.length - 1];
      if (prev && prev.chord === "" && c.chord === "") {
        prev.lyric += c.lyric;
      } else {
        merged.push({ ...c });
      }
    }
    return { ...line, chunks: normalizeChunks(merged) };
  });
}

/**
 * Splits a chunk's lyric text at `cursor`, keeping the original chord on the
 * left half and attaching `chord` to a new chunk on the right half. This is
 * how a chord gets inserted in the middle of a run of lyrics.
 */
export function splitChunkAtCursor(
  song: EditableSong,
  lineId: string,
  chunkId: string,
  cursor: number,
  chord: string
): EditableSong {
  return mapLine(song, lineId, (line) => {
    const idx = line.chunks.findIndex((c) => c.id === chunkId);
    if (idx === -1) return line;
    const target = line.chunks[idx];
    const clampedCursor = Math.max(0, Math.min(cursor, target.lyric.length));
    const left: EditableChunk = { ...target, lyric: target.lyric.slice(0, clampedCursor) };
    const right: EditableChunk = { id: genId("chunk"), chord: chord.trim(), lyric: target.lyric.slice(clampedCursor) };
    const nextChunks = [...line.chunks.slice(0, idx), left, right, ...line.chunks.slice(idx + 1)];
    return { ...line, chunks: normalizeChunks(nextChunks) };
  });
}

/** Appends a fresh, empty chunk to the end of a lyrics line (ready for a chord + text). */
export function appendChunk(song: EditableSong, lineId: string): EditableSong {
  return mapLine(song, lineId, (line) => ({ ...line, chunks: [...line.chunks, emptyChunk()] }));
}

export function updateSectionLabel(song: EditableSong, lineId: string, label: string): EditableSong {
  return mapLine(song, lineId, (line) => ({ ...line, sectionLabel: label }));
}

function makeLine(type: LineType): EditableLine {
  if (type === "lyrics") return { id: genId("line"), type, chunks: [emptyChunk()] };
  if (type === "section") return { id: genId("line"), type, sectionLabel: "", chunks: [] };
  return { id: genId("line"), type, chunks: [] };
}

export function insertLineAfter(song: EditableSong, lineId: string | null, type: LineType): EditableSong {
  const newLine = makeLine(type);
  if (lineId === null) return [...song, newLine];
  const idx = song.findIndex((l) => l.id === lineId);
  if (idx === -1) return [...song, newLine];
  return [...song.slice(0, idx + 1), newLine, ...song.slice(idx + 1)];
}

export function removeLine(song: EditableSong, lineId: string): EditableSong {
  const next = song.filter((l) => l.id !== lineId);
  return next.length > 0 ? next : [makeLine("blank")];
}

export function moveLine(song: EditableSong, lineId: string, direction: "up" | "down"): EditableSong {
  const idx = song.findIndex((l) => l.id === lineId);
  if (idx === -1) return song;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= song.length) return song;
  const next = [...song];
  [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
  return next;
}

export function convertLineType(song: EditableSong, lineId: string, type: LineType): EditableSong {
  return mapLine(song, lineId, (line) => {
    if (line.type === type) return line;
    if (type === "lyrics") {
      return { id: line.id, type, chunks: [emptyChunk()] };
    }
    if (type === "section") {
      return { id: line.id, type, sectionLabel: line.sectionLabel ?? "", chunks: [] };
    }
    return { id: line.id, type: "blank", chunks: [] };
  });
}
