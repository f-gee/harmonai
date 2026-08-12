import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { api, SongSummary } from "../lib/api";
import { sampleSong } from "../data/sampleSong";

interface HomeScreenProps {
  onSelectSong: (id: "sample" | string) => void;
}

export function HomeScreen({ onSelectSong }: HomeScreenProps) {
  const { colors } = useTheme();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listSongs()
      .then(setSongs)
      .catch((err) => setBackendError(err.message));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: colors.text }]}>Harmonai</Text>
      <Text style={[styles.subheading, { color: colors.textSecondary }]}>Your songbook</Text>

      {backendError && (
        <Text style={[styles.notice, { color: colors.textSecondary, borderColor: colors.border }]}>
          Backend not reachable yet ({backendError}). Showing the local sample song — start the backend
          and set the API URL in app.json to load your own.
        </Text>
      )}

      <FlatList
        data={[{ id: "sample", title: sampleSong.title, artist: sampleSong.artist }, ...songs]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelectSong(item.id)}
            style={[styles.songRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.songTitle, { color: colors.text }]}>{item.title}</Text>
            {"artist" in item && item.artist ? (
              <Text style={[styles.songArtist, { color: colors.textSecondary }]}>{item.artist}</Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 28, fontWeight: "800" },
  subheading: { fontSize: 14, marginTop: 2 },
  notice: {
    marginTop: 14,
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 12,
    lineHeight: 17,
  },
  songRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  songTitle: { fontSize: 16, fontWeight: "600" },
  songArtist: { fontSize: 13, marginTop: 2 },
});
