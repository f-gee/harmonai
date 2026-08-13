import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { parseChord } from "../lib/chordParser";
import {
  EditableChunk,
  EditableLine,
  EditableSong,
  appendChunk,
  convertLineType,
  insertLineAfter,
  moveLine,
  removeChunkChord,
  removeLine,
  splitChunkAtCursor,
  updateChunkChord,
  updateChunkLyric,
  updateSectionLabel,
} from "../lib/editorModel";

interface SongEditorProps {
  song: EditableSong;
  onChange: (song: EditableSong) => void;
}

const COMMON_CHORDS = ["C", "G", "D", "A", "E", "F", "Am", "Em", "Dm", "C7", "G7", "D7"];
const QUALITY_SUFFIXES = ["m", "7", "maj7", "m7", "sus4", "dim"];

type PopoverState =
  | { mode: "edit"; lineId: string; chunkId: string; initialValue: string }
  | { mode: "insert"; lineId: string; chunkId: string; cursor: number }
  | null;

function estimateWidth(text: string, minWidth: number): number {
  // Monospace-ish estimate; good enough to keep chunks roughly lyric-width.
  return Math.max(minWidth, text.length * 9.5 + 6);
}

export function SongEditor({ song, onChange }: SongEditorProps) {
  const { colors } = useTheme();
  const [popover, setPopover] = useState<PopoverState>(null);
  const [popoverText, setPopoverText] = useState("");
  const [cursors, setCursors] = useState<Record<string, number>>({});
  const [focusedChunkId, setFocusedChunkId] = useState<string | null>(null);

  const openEditPopover = (lineId: string, chunk: EditableChunk) => {
    setPopover({ mode: "edit", lineId, chunkId: chunk.id, initialValue: chunk.chord });
    setPopoverText(chunk.chord);
  };

  const openInsertPopover = (lineId: string, chunkId: string) => {
    const cursor = cursors[chunkId] ?? 0;
    setPopover({ mode: "insert", lineId, chunkId, cursor });
    setPopoverText("");
  };

  const closePopover = () => {
    setPopover(null);
    setPopoverText("");
  };

  const applyPopover = () => {
    if (!popover) return;
    const chord = popoverText.trim();
    if (popover.mode === "edit") {
      onChange(updateChunkChord(song, popover.lineId, popover.chunkId, chord));
    } else if (chord) {
      onChange(splitChunkAtCursor(song, popover.lineId, popover.chunkId, popover.cursor, chord));
    }
    closePopover();
  };

  const removeChordFromPopover = () => {
    if (!popover) return;
    onChange(removeChunkChord(song, popover.lineId, popover.chunkId));
    closePopover();
  };

  const popoverInvalid = popoverText.trim() !== "" && parseChord(popoverText) === null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {song.map((line, i) => (
          <LineEditor
            key={line.id}
            line={line}
            isFirst={i === 0}
            isLast={i === song.length - 1}
            focusedChunkId={focusedChunkId}
            onFocusChunk={setFocusedChunkId}
            onCursorChange={(chunkId, cursor) => setCursors((prev) => ({ ...prev, [chunkId]: cursor }))}
            onLyricChange={(chunkId, text) => onChange(updateChunkLyric(song, line.id, chunkId, text))}
            onTapChord={(chunk) => openEditPopover(line.id, chunk)}
            onTapInsert={(chunkId) => openInsertPopover(line.id, chunkId)}
            onAppendChunk={() => onChange(appendChunk(song, line.id))}
            onSectionLabelChange={(label) => onChange(updateSectionLabel(song, line.id, label))}
            onMove={(dir) => onChange(moveLine(song, line.id, dir))}
            onDelete={() => onChange(removeLine(song, line.id))}
            onConvert={(type) => onChange(convertLineType(song, line.id, type))}
            onInsertLineAfter={(type) => onChange(insertLineAfter(song, line.id, type))}
          />
        ))}

        <View style={styles.footerRow}>
          <Pressable
            style={[styles.footerButton, { borderColor: colors.border }]}
            onPress={() => onChange(insertLineAfter(song, song[song.length - 1]?.id ?? null, "lyrics"))}
          >
            <Ionicons name="add" size={16} color={colors.text} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>Line</Text>
          </Pressable>
          <Pressable
            style={[styles.footerButton, { borderColor: colors.border }]}
            onPress={() => onChange(insertLineAfter(song, song[song.length - 1]?.id ?? null, "section"))}
          >
            <Ionicons name="pricetag-outline" size={16} color={colors.text} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>Section</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={popover !== null} transparent animationType="fade" onRequestClose={closePopover}>
        <Pressable style={styles.backdrop} onPress={closePopover}>
          <Pressable style={[styles.popoverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.popoverTitle, { color: colors.textSecondary }]}>
              {popover?.mode === "edit" ? "Edit chord" : "Insert chord"}
            </Text>
            <TextInput
              value={popoverText}
              onChangeText={setPopoverText}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. Am7"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.popoverInput,
                {
                  color: colors.chord,
                  borderColor: popoverInvalid ? "#E0555A" : colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            {popoverInvalid && (
              <Text style={styles.popoverError}>Doesn't look like a chord (e.g. G, Am, F#m7, D/F#)</Text>
            )}

            <View style={styles.chipWrap}>
              {COMMON_CHORDS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setPopoverText(c)}
                  style={[styles.chip, { borderColor: colors.border }]}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chipWrap}>
              {QUALITY_SUFFIXES.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => setPopoverText((t) => `${t}${q}`)}
                  style={[styles.chip, { borderColor: colors.border }]}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>+{q}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.popoverActions}>
              {popover?.mode === "edit" && popover.initialValue !== "" && (
                <Pressable onPress={removeChordFromPopover} style={styles.popoverActionButton}>
                  <Text style={{ color: "#E0555A" }}>Remove</Text>
                </Pressable>
              )}
              <Pressable onPress={closePopover} style={styles.popoverActionButton}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={applyPopover}
                disabled={popoverInvalid}
                style={[styles.popoverActionButton, styles.popoverSave, { opacity: popoverInvalid ? 0.5 : 1 }]}
              >
                <Text style={{ color: colors.accent, fontWeight: "700" }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface LineEditorProps {
  line: EditableLine;
  isFirst: boolean;
  isLast: boolean;
  focusedChunkId: string | null;
  onFocusChunk: (chunkId: string | null) => void;
  onCursorChange: (chunkId: string, cursor: number) => void;
  onLyricChange: (chunkId: string, text: string) => void;
  onTapChord: (chunk: EditableChunk) => void;
  onTapInsert: (chunkId: string) => void;
  onAppendChunk: () => void;
  onSectionLabelChange: (label: string) => void;
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
  onConvert: (type: EditableLine["type"]) => void;
  onInsertLineAfter: (type: EditableLine["type"]) => void;
}

function LineEditor(props: LineEditorProps) {
  const { colors } = useTheme();
  const { line } = props;

  return (
    <View style={styles.lineRow}>
      <View style={styles.lineContent}>
        {line.type === "section" && (
          <TextInput
            value={line.sectionLabel ?? ""}
            onChangeText={props.onSectionLabelChange}
            placeholder="Section name (e.g. Chorus)"
            placeholderTextColor={colors.textSecondary}
            style={[styles.sectionInput, { color: colors.accent, borderColor: colors.border }]}
          />
        )}

        {line.type === "blank" && <View style={styles.blankLine} />}

        {line.type === "lyrics" && (
          <View style={styles.chunkRow}>
            {line.chunks.map((chunk) => (
              <ChunkEditor
                key={chunk.id}
                chunk={chunk}
                isFocused={props.focusedChunkId === chunk.id}
                onFocus={() => props.onFocusChunk(chunk.id)}
                onBlur={() => props.onFocusChunk(null)}
                onCursorChange={(cursor) => props.onCursorChange(chunk.id, cursor)}
                onLyricChange={(text) => props.onLyricChange(chunk.id, text)}
                onTapChord={() => props.onTapChord(chunk)}
                onTapInsert={() => props.onTapInsert(chunk.id)}
              />
            ))}
            <Pressable
              onPress={props.onAppendChunk}
              style={[styles.addChunkButton, { borderColor: colors.border }]}
              hitSlop={6}
            >
              <Ionicons name="add" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.lineControls}>
        <Pressable onPress={() => props.onMove("up")} disabled={props.isFirst} hitSlop={4}>
          <Ionicons name="chevron-up" size={15} color={props.isFirst ? colors.border : colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => props.onMove("down")} disabled={props.isLast} hitSlop={4}>
          <Ionicons name="chevron-down" size={15} color={props.isLast ? colors.border : colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => props.onConvert(line.type === "section" ? "lyrics" : "section")}
          hitSlop={4}
          accessibilityLabel="Toggle section header"
        >
          <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={props.onDelete} hitSlop={4} accessibilityLabel="Delete line">
          <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

interface ChunkEditorProps {
  chunk: EditableChunk;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onCursorChange: (cursor: number) => void;
  onLyricChange: (text: string) => void;
  onTapChord: () => void;
  onTapInsert: () => void;
}

function ChunkEditor(props: ChunkEditorProps) {
  const { colors } = useTheme();
  const { chunk } = props;
  const width = estimateWidth(chunk.lyric, 18);

  return (
    <View style={styles.chunk}>
      <Pressable onPress={props.onTapChord} style={styles.chordChip} hitSlop={4}>
        <Text
          style={[
            styles.chordChipText,
            { color: chunk.chord ? colors.chord : colors.border },
          ]}
        >
          {chunk.chord || "+"}
        </Text>
      </Pressable>
      <TextInput
        value={chunk.lyric}
        onChangeText={props.onLyricChange}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        onSelectionChange={(e) => props.onCursorChange(e.nativeEvent.selection.start)}
        style={[
          styles.lyricInput,
          { color: colors.text, width, borderBottomColor: props.isFocused ? colors.accent : "transparent" },
        ]}
      />
      {props.isFocused && chunk.lyric.length > 0 && (
        <Pressable onPress={props.onTapInsert} style={styles.insertButton} hitSlop={6}>
          <Ionicons name="add-circle-outline" size={14} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  lineContent: { flex: 1 },
  lineControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 10,
    paddingTop: 4,
  },
  chunkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  chunk: {
    alignItems: "center",
    marginRight: 2,
    position: "relative",
  },
  chordChip: {
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  chordChipText: {
    fontFamily: "monospace",
    fontWeight: "700",
    fontSize: 13,
  },
  lyricInput: {
    fontFamily: "monospace",
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0,
    paddingHorizontal: 1,
    borderBottomWidth: 2,
  },
  insertButton: {
    position: "absolute",
    right: -16,
    bottom: 4,
  },
  addChunkButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    marginLeft: 4,
  },
  sectionInput: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    paddingVertical: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  blankLine: { height: 18 },
  footerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerButtonText: { fontSize: 13, fontWeight: "600" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  popoverCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  popoverTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  popoverInput: {
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: "700",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  popoverError: { color: "#E0555A", fontSize: 12, marginTop: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 13, fontWeight: "600" },
  popoverActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 16,
  },
  popoverActionButton: { paddingVertical: 6, paddingHorizontal: 4 },
  popoverSave: { paddingHorizontal: 8 },
});
