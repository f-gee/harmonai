/**
 * Editable (WYSIWYG) representation of a song — word-slot model.
 *
 * The workflow this is built for: type the lyrics for a line as plain text,
 * then tap a slot above a word to attach a chord to it. So a line is just
 * plain text plus a sparse map of "chord attached to word N":
 *
 *   text:   "These are the lyrics of the song"
 *   chords: { 0: "G", 4: "Am" }   // word 0 = "These", word 4 = "of"
 *
 * Word slots are addressed by their ordinal position in the line (0 = first
 * word), not by character offset, so a slot stays put as a UI target even
 * while the user is still typing. Editing lyric text after chords are
 * placed can shift which word a slot lands on if words are inserted or
 * removed earlier in the line — same trade-off most chord-chart editors
 * make in exchange for a much simpler tap-to-place interaction.
 *
 * `words.length` is used as the index for a trailing slot, for a chord that
 * lands after the last word (e.g. a closing chord hit at the end of a line).
 *
 * `contentFromLines` turns this back into ordinary Harmonai markup text
 * ("[G]lyrics") at any point, e.g. right before saving or previewing.
 */

import { LineType, ParsedLine, parseSong } from "./chordParser";

export interface WordToken {
  start: number;
  end: number;
  text: string;
}

export interface EditableLine {
  id: string;
  type: LineType;
  sectionLabel?: string;
  /** Plain lyric text with no chord markup. Only meaningful when type === "lyrics". */
  text: string;
  /** Word ordinal -> raw chord text (e.g. "Am7"). `words.length` = trailing slot. */
  chords: Record<number, string>;
}

export type EditableSong = EditableLine[];

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

const WORD_PATTERN = /\S+/g;

export function tokenizeWords(text: string): WordToken[] {
  const words: WordToken[] = [];
  WORD_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WORD_PATTERN.exec(text)) !== null) {
    words.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return words;
}

function lineToEditable(line: ParsedLine): EditableLine {
  if (line.type === "blank") {
    return { id: genId("line"), type: "blank", text: "", chords: {} };
  }
  if (line.type === "section") {
    return { id: genId("line"), type: "section", sectionLabel: line.sectionLabel ?? "", text: "", chords: {} };
  }

  const words = tokenizeWords(line.plainText);
  const chords: Record<number, string> = {};
  for (const token of line.chords) {
    let wordIdx: number;
    if (words.length === 0) {
      wordIdx = 0;
    } else if (token.index >= words[words.length - 1].end) {
      wordIdx = words.length; // trailing, after the last word
    } else {
      wordIdx = 0;
      for (let i = 0; i < words.length; i++) {
        if (words[i].start <= token.index) wordIdx = i;
        else break;
      }
    }
    if (!(wordIdx in chords)) chords[wordIdx] = token.chord.raw;
  }

  return { id: genId("line"), type: "lyrics", text: line.plainText, chords };
}

/** Parses raw Harmonai markup text into the editable word-slot model. */
export function linesFromContent(content: string): EditableSong {
  if (content.trim() === "") {
    return [{ id: genId("line"), type: "lyrics", text: "", chords: {} }];
  }
  const parsed = parseSong(content);
  const lines = parsed.lines.map(lineToEditable);
  return lines.length > 0 ? lines : [{ id: genId("line"), type: "lyrics", text: "", chords: {} }];
}

/** Serializes the editable word-slot model back into Harmonai markup text. */
export function contentFromLines(lines: EditableSong): string {
  return lines
    .map((line) => {
      if (line.type === "blank") return "";
      if (line.type === "section") return `{${line.sectionLabel ?? ""}}`;

      const words = tokenizeWords(line.text);
      let out = "";
      let cursor = 0;
      for (let i = 0; i < words.length; i++) {
        out += line.text.slice(cursor, words[i].start);
        if (line.chords[i]) out += `[${line.chords[i]}]`;
        cursor = words[i].start;
      }
      out += line.text.slice(cursor);
      if (line.chords[words.length]) out += `[${line.chords[words.length]}]`;
      return out;
    })
    .join("\n");
}

function mapLine(song: EditableSong, lineId: string, fn: (line: EditableLine) => EditableLine): EditableSong {
  return song.map((line) => (line.id === lineId ? fn(line) : line));
}

export function updateLineText(song: EditableSong, lineId: string, text: string): EditableSong {
  return mapLine(song, lineId, (line) => ({ ...line, text }));
}

export function setWordChord(song: EditableSong, lineId: string, wordIndex: number, chord: string): EditableSong {
  const trimmed = chord.trim();
  return mapLine(song, lineId, (line) => {
    const next = { ...line.chords };
    if (trimmed) next[wordIndex] = trimmed;
    else delete next[wordIndex];
    return { ...line, chords: next };
  });
}

export function removeWordChord(song: EditableSong, lineId: string, wordIndex: number): EditableSong {
  return mapLine(song, lineId, (line) => {
    const next = { ...line.chords };
    delete next[wordIndex];
    return { ...line, chords: next };
  });
}

export function updateSectionLabel(song: EditableSong, lineId: string, label: string): EditableSong {
  return mapLine(song, lineId, (line) => ({ ...line, sectionLabel: label }));
}

function makeLine(type: LineType, keepId?: string): EditableLine {
  const id = keepId ?? genId("line");
  if (type === "lyrics") return { id, type, text: "", chords: {} };
  if (type === "section") return { id, type, sectionLabel: "", text: "", chords: {} };
  return { id, type, text: "", chords: {} };
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
  return next.length > 0 ? next : [makeLine("lyrics")];
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
  return mapLine(song, lineId, (line) => (line.type === type ? line : makeLine(type, line.id)));
}
