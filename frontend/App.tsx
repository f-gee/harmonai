import React, { useState } from "react";
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { ThemeToggle } from "./src/components/ThemeToggle";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SongScreen } from "./src/screens/SongScreen";
import { SongEditScreen } from "./src/screens/SongEditScreen";
import { sampleSong } from "./src/data/sampleSong";
import { api, Song } from "./src/lib/api";

type Route = { name: "home" } | { name: "song"; id: string } | { name: "edit"; song?: Song };

function AppShell() {
  const { colors, mode } = useTheme();
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [remoteSong, setRemoteSong] = useState<Song | null>(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

  const onSelectSong = async (id: string) => {
    setRoute({ name: "song", id });
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

  const onSaved = (saved: Song) => {
    setRemoteSong(saved);
    setHomeRefreshKey((k) => k + 1);
    setRoute({ name: "song", id: saved.id });
  };

  const goHome = () => setRoute({ name: "home" });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View style={[styles.header, { borderColor: colors.border }]}>
        {route.name !== "home" ? (
          <Pressable onPress={goHome} style={styles.backButton} hitSlop={8}>
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

      {route.name === "home" && (
        <HomeScreen
          onSelectSong={onSelectSong}
          onCreateNew={() => setRoute({ name: "edit" })}
          refreshKey={homeRefreshKey}
        />
      )}

      {route.name === "song" && route.id === "sample" && (
        <SongScreen
          title={sampleSong.title}
          artist={sampleSong.artist}
          originalKey={sampleSong.key}
          content={sampleSong.content}
        />
      )}

      {route.name === "song" && route.id !== "sample" && remoteSong && (
        <SongScreen
          title={remoteSong.title}
          artist={remoteSong.artist ?? undefined}
          originalKey={remoteSong.song_key ?? undefined}
          content={remoteSong.content}
          onEdit={() => setRoute({ name: "edit", song: remoteSong })}
        />
      )}

      {route.name === "edit" && (
        <SongEditScreen
          song={route.song}
          onDone={onSaved}
          onCancel={() => setRoute(route.song ? { name: "song", id: route.song.id } : { name: "home" })}
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
