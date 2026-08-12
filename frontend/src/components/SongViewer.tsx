import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { buildChordRow, parseSong } from "../lib/chordParser";
import { useTheme } from "../theme/ThemeContext";

interface SongViewerProps {
  content: string;
}

export function SongViewer({ content }: SongViewerProps) {
  const { colors } = useTheme();
  const song = useMemo(() => parseSong(content), [content]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {song.lines.map((line, i) => {
          if (line.type === "blank") {
            return <View key={i} style={styles.blankLine} />;
          }
          if (line.type === "section") {
            return (
              <Text key={i} style={[styles.section, { color: colors.accent }]}>
                {line.sectionLabel}
              </Text>
            );
          }
          const chordRow = buildChordRow(line);
          return (
            <View key={i} style={styles.line}>
              {chordRow.length > 0 && (
                <Text style={[styles.mono, styles.chordRow, { color: colors.chord }]}>{chordRow}</Text>
              )}
              <Text style={[styles.mono, styles.lyricRow, { color: colors.text }]}>{line.plainText || " "}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mono: {
    fontFamily: "monospace",
    fontSize: 16,
  },
  line: {
    marginBottom: 2,
  },
  chordRow: {
    fontWeight: "700",
    lineHeight: 22,
  },
  lyricRow: {
    lineHeight: 22,
  },
  section: {
    fontWeight: "700",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
  },
  blankLine: {
    height: 14,
  },
});
