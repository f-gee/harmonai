import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { parseChord } from "../lib/chordParser";
import { LineType } from "../lib/chordParser";
import {
  EditableLine,
  EditableSong,
  convertLineType,
  insertLineAfter,
  moveLine,
  removeLine,
  removeWordChord,
  setWordChord,
  tokenizeWords,
  updateLineText,
  updateSectionLabel,
} from "../lib/editorModel";

interface SongEditorProps {
  song: EditableSong;
  onChange: (song: EditableSong) => void;
}

const COMMON_CHORDS = ["C", "G", "D", "A", "E", "F", "Am", "Em", "Dm", "C7", "G7", "D7"];
const QUALITY_SUFFIXES = ["m", "7", "maj7", "m7", "sus4", "dim"];

interface PopoverState {
  lineId: string;
  wordIndex: number;
  initialValue: string;
}

export function SongEditor({ song, onChange }: SongEditorProps) {
  const { colors } = useTheme();
  const [editingIds, setEditingIds] = useState<Set<string>>(
    () => new Set(song.filter((l) => l.type === "lyrics" && l.text === "").map((l) => l.id))
  );
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [popoverText, setPopoverText] = useState("");

  const startEditingText = (lineId: string) => setEditingIds((prev) => new Set(prev).add(lineId));
  const finishEditingText = (lineId: string) =>
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(lineId);
      return next;
    });

  const handleInsertLine = (afterId: string | null, type: LineType) => {
    const nextSong = insertLineAfter(song, afterId, type);
    const newLine = nextSong.find((l) => !song.some((old) => old.id === l.id));
    if (newLine && newLine.type === "lyrics") {
      setEditingIds((prev) => new Set(prev).add(newLine.id));
    }
    onChange(nextSong);
  };

  const openChordPopover = (lineId: string, wordIndex: number, currentValue: string) => {
    setPopover({ lineId, wordIndex, initialValue: currentValue });
    setPopoverText(currentValue);
  };

  const closePopover = () => {
    setPopover(null);
    setPopoverText("");
  };

  const applyPopover = () => {
    if (!popover) return;
    onChange(setWordChord(song, popover.lineId, popover.wordIndex, popoverText));
    closePopover();
  };

  const removeChordFromPopover = () => {
    if (!popover) return;
    onChange(removeWordChord(song, popover.lineId, popover.wordIndex));
    closePopover();
  };

  const popoverInvalid = popoverText.trim() !== "" && parseChord(popoverText) === null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {song.map((line, i) => (
          <LineEditor
            key={line.id}
            line={line}
            isFirst={i === 0}
            isLast={i === song.length - 1}
            isEditingText={editingIds.has(line.id)}
            onStartEditingText={() => startEditingText(line.id)}
            onFinishEditingText={() => finishEditingText(line.id)}
            onTextChange={(text) => onChange(updateLineText(song, line.id, text))}
            onTapSlot={(wordIndex, current) => openChordPopover(line.id, wordIndex, current)}
            onSectionLabelChange={(label) => onChange(updateSectionLabel(song, line.id, label))}
            onMove={(dir) => onChange(moveLine(song, line.id, dir))}
            onDelete={() => onChange(removeLine(song, line.id))}
            onConvert={(type) => onChange(convertLineType(song, line.id, type))}
          />
        ))}

        <View style={styles.footerRow}>
          <Pressable
            style={[styles.footerButton, { borderColor: colors.border }]}
            onPress={() => handleInsertLine(song[song.length - 1]?.id ?? null, "lyrics")}
          >
            <Ionicons name="add" size={16} color={colors.text} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>Line</Text>
          </Pressable>
          <Pressable
            style={[styles.footerButton, { borderColor: colors.border }]}
            onPress={() => handleInsertLine(song[song.length - 1]?.id ?? null, "section")}
          >
            <Ionicons name="pricetag-outline" size={16} color={colors.text} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>Section</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={popover !== null} transparent animationType="fade" onRequestClose={closePopover}>
        <Pressable style={styles.backdrop} onPress={closePopover}>
          <Pressable style={[styles.popoverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.popoverTitle, { color: colors.textSecondary }]}>Chord</Text>
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
              {popover?.initialValue !== "" && (
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
  isEditingText: boolean;
  onStartEditingText: () => void;
  onFinishEditingText: () => void;
  onTextChange: (text: string) => void;
  onTapSlot: (wordIndex: number, currentValue: string) => void;
  onSectionLabelChange: (label: string) => void;
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
  onConvert: (type: LineType) => void;
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

        {line.type === "lyrics" && props.isEditingText && (
          <View style={styles.lyricEditRow}>
            <TextInput
              value={line.text}
              onChangeText={props.onTextChange}
              onBlur={props.onFinishEditingText}
              onSubmitEditing={props.onFinishEditingText}
              autoFocus
              placeholder="Type the lyrics for this line…"
              placeholderTextColor={colors.textSecondary}
              style={[styles.lyricTextInput, { color: colors.text, borderColor: colors.accent }]}
            />
            <Pressable onPress={props.onFinishEditingText} style={styles.doneButton} hitSlop={8}>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            </Pressable>
          </View>
        )}

        {line.type === "lyrics" && !props.isEditingText && (
          <SlotRow line={line} onTapSlot={props.onTapSlot} onEditText={props.onStartEditingText} />
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

interface SlotRowProps {
  line: EditableLine;
  onTapSlot: (wordIndex: number, currentValue: string) => void;
  onEditText: () => void;
}

/** Read-only "type lyrics, then tap a square above a word to attach a chord" view. */
function SlotRow({ line, onTapSlot, onEditText }: SlotRowProps) {
  const { colors } = useTheme();
  const words = tokenizeWords(line.text);

  if (words.length === 0) {
    return (
      <Pressable onPress={onEditText} style={styles.emptyLinePlaceholder}>
        <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.emptyLineText, { color: colors.textSecondary }]}>Tap to add lyrics</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onEditText} style={styles.slotRow}>
      {words.map((word, i) => {
        const chord = line.chords[i] ?? "";
        return (
          <View key={i} style={styles.wordColumn}>
            <Pressable
              onPress={() => onTapSlot(i, chord)}
              style={[
                styles.slot,
                chord
                  ? { backgroundColor: colors.surface, borderColor: colors.chord }
                  : { borderColor: colors.border, borderStyle: "dashed" },
              ]}
              hitSlop={2}
            >
              <Text style={[styles.slotText, { color: chord ? colors.chord : colors.border }]} numberOfLines={1}>
                {chord || "+"}
              </Text>
            </Pressable>
            <Text style={[styles.wordText, { color: colors.text }]}>{word.text}</Text>
          </View>
        );
      })}

      {/* Trailing slot: a chord that lands after the last word in the line. */}
      <View style={styles.wordColumn}>
        <Pressable
          onPress={() => onTapSlot(words.length, line.chords[words.length] ?? "")}
          style={[
            styles.slot,
            styles.trailingSlot,
            line.chords[words.length]
              ? { backgroundColor: colors.surface, borderColor: colors.chord }
              : { borderColor: colors.border, borderStyle: "dashed" },
          ]}
          hitSlop={2}
        >
          <Text
            style={[
              styles.slotText,
              { color: line.chords[words.length] ? colors.chord : colors.border },
            ]}
            numberOfLines={1}
          >
            {line.chords[words.length] || "+"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  lineContent: { flex: 1 },
  lineControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 10,
    paddingTop: 8,
  },
  lyricEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lyricTextInput: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  doneButton: { padding: 2 },
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    paddingVertical: 4,
  },
  wordColumn: {
    alignItems: "center",
    marginRight: 6,
    marginBottom: 4,
  },
  slot: {
    minWidth: 26,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    marginBottom: 2,
  },
  trailingSlot: {
    opacity: 0.7,
  },
  slotText: {
    fontFamily: "monospace",
    fontWeight: "700",
    fontSize: 11,
  },
  wordText: {
    fontFamily: "monospace",
    fontSize: 16,
    lineHeight: 20,
  },
  emptyLinePlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  emptyLineText: { fontSize: 14, fontStyle: "italic" },
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
