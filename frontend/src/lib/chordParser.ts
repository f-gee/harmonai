/**
 * Harmonai markup:
 *   "[G]These are the lyrics o[Am]f the song"
 *   "{Verse 1}" on its own line marks a section header
 *
 * This module turns raw markup text into a structured representation
 * that the renderer, transposer, and (later) improv-suggestion features
 * can all share.
 */

export interface ParsedChord {
  raw: string; // original text as typed, e.g. "F#m7/A"
  root: string; // e.g. "F#"
  quality: string; // e.g. "m7", "", "sus4", "maj7" (kept opaque for now)
  bass?: string; // e.g. "A" for slash chords like D/F#
}

export interface ChordToken {
  chord: ParsedChord;
  index: number; // character offset into the chord-stripped lyric line
}

export type LineType = "section" | "lyrics" | "blank";

export interface ParsedLine {
  type: LineType;
  raw: string;
  plainText: string;
  chords: ChordToken[];
  sectionLabel?: string;
}

export interface ParsedSong {
  lines: ParsedLine[];
}

const CHORD_PATTERN = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;
const INLINE_CHORD_PATTERN = /\[([^\]]+)\]/g;
const SECTION_PATTERN = /^\{(.+)\}$/;

/** Parses a single chord symbol, e.g. "F#m7/A" -> { root: "F#", quality: "m7", bass: "A" } */
export function parseChord(text: string): ParsedChord | null {
  const trimmed = text.trim();
  const match = trimmed.match(CHORD_PATTERN);
  if (!match) return null;
  const [, root, quality, bass] = match;
  return { raw: trimmed, root, quality: quality ?? "", bass: bass || undefined };
}

export function chordToString(chord: Pick<ParsedChord, "root" | "quality" | "bass">): string {
  return `${chord.root}${chord.quality}${chord.bass ? "/" + chord.bass : ""}`;
}

/** Parses one line of raw markup into lyric text + positioned chords, or a section header. */
export function parseLine(rawLine: string): ParsedLine {
  if (rawLine.trim() === "") {
    return { type: "blank", raw: rawLine, plainText: "", chords: [] };
  }

  const sectionMatch = rawLine.trim().match(SECTION_PATTERN);
  if (sectionMatch) {
    return {
      type: "section",
      raw: rawLine,
      plainText: "",
      chords: [],
      sectionLabel: sectionMatch[1].trim(),
    };
  }

  let plainText = "";
  const chords: ChordToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_CHORD_PATTERN.lastIndex = 0;
  while ((match = INLINE_CHORD_PATTERN.exec(rawLine)) !== null) {
    plainText += rawLine.slice(lastIndex, match.index);
    const parsed = parseChord(match[1]);
    if (parsed) {
      chords.push({ chord: parsed, index: plainText.length });
    }
    lastIndex = match.index + match[0].length;
  }
  plainText += rawLine.slice(lastIndex);

  return { type: "lyrics", raw: rawLine, plainText, chords };
}

export function parseSong(content: string): ParsedSong {
  return { lines: content.split("\n").map(parseLine) };
}

/**
 * Builds a single text row with each chord's raw text starting at its
 * lyric-aligned column, padding with spaces and pushing overlapping
 * chords to the right so nothing collides.
 */
export function buildChordRow(line: ParsedLine): string {
  const sorted = [...line.chords].sort((a, b) => a.index - b.index);
  let result = "";
  for (const { chord, index } of sorted) {
    const target = Math.max(index, result.length);
    result += " ".repeat(target - result.length) + chord.raw;
  }
  return result;
}

/** Re-serializes a ParsedSong back into Harmonai markup text. */
export function stringifySong(song: ParsedSong): string {
  return song.lines
    .map((line) => {
      if (line.type === "blank") return "";
      if (line.type === "section") return `{${line.sectionLabel}}`;

      const sorted = [...line.chords].sort((a, b) => a.index - b.index);
      let out = "";
      let cursor = 0;
      for (const { chord, index } of sorted) {
        out += line.plainText.slice(cursor, index);
        out += `[${chord.raw}]`;
        cursor = index;
      }
      out += line.plainText.slice(cursor);
      return out;
    })
    .join("\n");
}
