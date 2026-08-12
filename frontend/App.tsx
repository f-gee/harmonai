import React, { useState } from "react";
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { ThemeToggle } from "./src/components/ThemeToggle";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SongScreen } from "./src/screens/SongScreen";
import { sampleSong } from "./src/data/sampleSong";
import { api } from "./src/lib/api";

function AppShell() {
  const { colors, mode } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remoteSong, setRemoteSong] = useState<Awaited<ReturnType<typeof api.getSong>> | null>(null);

  const onSelectSong = async (id: string) => {
    setSelectedId(id);
    if (id === "sample") {
      setRemoteSong(null);
      return;
    }
    try {
      const song = await api.getSong(id);
      setRemoteSong(song);
    } catch {
      // Leave remoteSong null; SongScreen will just show nothing useful,
      // which is fine for boilerplate — real error handling comes later.
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View style={[styles.header, { borderColor: colors.border }]}>
        {selectedId ? (
          <Pressable onPress={() => setSelectedId(null)} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backLabel, { color: colors.text }]}>Songs</Text>
          </Pressable>
        ) : (
          <View style={styles.brandRow}>
            <Image source={require("./assets/icon.png")} style={styles.brandMark} />
            <Text style={[styles.brand, { color: colors.text }]}>Harmonai</Text>
          </View>
        )}
        <ThemeToggle />
      </View>

      {selectedId === null && <HomeScreen onSelectSong={onSelectSong} />}

      {selectedId === "sample" && (
        <SongScreen
          title={sampleSong.title}
          artist={sampleSong.artist}
          originalKey={sampleSong.key}
          content={sampleSong.content}
        />
      )}

      {selectedId && selectedId !== "sample" && remoteSong && (
        <SongScreen
          title={remoteSong.title}
          artist={remoteSong.artist ?? undefined}
          originalKey={remoteSong.song_key ?? undefined}
          content={remoteSong.content}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 26, height: 26, borderRadius: 7 },
  brand: { fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  backLabel: { fontSize: 16, fontWeight: "600" },
});
