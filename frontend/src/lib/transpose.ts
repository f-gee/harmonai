import { ParsedChord, chordToString, parseChord } from "./chordParser";

const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// A few common enharmonic spellings not already covered above.
const ENHARMONIC_ALIASES: Record<string, string> = {
  Cb: "B",
  "E#": "F",
  Fb: "E",
  "B#": "C",
};

function noteIndex(note: string): number {
  const normalized = ENHARMONIC_ALIASES[note] ?? note;
  let idx = SHARP_NOTES.indexOf(normalized);
  if (idx === -1) idx = FLAT_NOTES.indexOf(normalized);
  return idx;
}

function transposeNote(note: string, semitones: number, preferFlats: boolean): string {
  const idx = noteIndex(note);
  if (idx === -1) return note; // unrecognized note, leave as-is
  const newIndex = (((idx + semitones) % 12) + 12) % 12;
  return preferFlats ? FLAT_NOTES[newIndex] : SHARP_NOTES[newIndex];
}

// Keys that conventionally use flats, used to guess spelling preference from a song key.
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

export function prefersFlats(key?: string | null): boolean {
  if (!key) return false;
  return FLAT_KEYS.has(key.trim());
}

export function transposeChord(chord: ParsedChord, semitones: number, preferFlats = false): ParsedChord {
  const root = transposeNote(chord.root, semitones, preferFlats);
  const bass = chord.bass ? transposeNote(chord.bass, semitones, preferFlats) : undefined;
  const next: ParsedChord = { root, quality: chord.quality, bass, raw: "" };
  next.raw = chordToString(next);
  return next;
}

/** Transposes every inline [Chord] token in raw markup text by N semitones. */
export function transposeSongText(content: string, semitones: number, preferFlats = false): string {
  if (semitones === 0) return content;
  return content.replace(/\[([^\]]+)\]/g, (_match, chordText: string) => {
    const parsed = parseChord(chordText);
    if (!parsed) return `[${chordText}]`;
    return `[${transposeChord(parsed, semitones, preferFlats).raw}]`;
  });
}

export { SHARP_NOTES, FLAT_NOTES };
