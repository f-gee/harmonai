import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SongViewer } from "../components/SongViewer";
import { useTheme } from "../theme/ThemeContext";
import { prefersFlats, transposeSongText } from "../lib/transpose";

interface SongScreenProps {
  title: string;
  artist?: string;
  originalKey?: string;
  content: string;
}

export function SongScreen({ title, artist, originalKey, content }: SongScreenProps) {
  const { colors } = useTheme();
  const [semitones, setSemitones] = useState(0);

  const transposedContent = useMemo(
    () => transposeSongText(content, semitones, prefersFlats(originalKey)),
    [content, semitones, originalKey]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {artist ? <Text style={[styles.artist, { color: colors.textSecondary }]}>{artist}</Text> : null}
      </View>

      <View style={[styles.transposeRow, { borderColor: colors.border }]}>
        <Text style={[styles.transposeLabel, { color: colors.textSecondary }]}>Transpose</Text>
        <Pressable
          onPress={() => setSemitones((s) => s - 1)}
          style={[styles.stepButton, { borderColor: colors.border }]}
          accessibilityLabel="Transpose down a semitone"
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.semitoneValue, { color: colors.accent }]}>
          {semitones > 0 ? `+${semitones}` : semitones}
        </Text>
        <Pressable
          onPress={() => setSemitones((s) => s + 1)}
          style={[styles.stepButton, { borderColor: colors.border }]}
          accessibilityLabel="Transpose up a semitone"
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
        {semitones !== 0 && (
          <Pressable onPress={() => setSemitones(0)} hitSlop={8} style={styles.resetButton}>
            <Text style={{ color: colors.textSecondary }}>reset</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.viewerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SongViewer content={transposedContent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  artist: { fontSize: 14, marginTop: 2 },
  transposeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  transposeLabel: { fontSize: 13, marginRight: 4 },
  stepButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  semitoneValue: { fontSize: 15, fontWeight: "700", minWidth: 28, textAlign: "center" },
  resetButton: { marginLeft: 4 },
  viewerCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
});
