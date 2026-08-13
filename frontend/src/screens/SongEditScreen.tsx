import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { SongEditor } from "../components/SongEditor";
import { SongViewer } from "../components/SongViewer";
import { contentFromLines, linesFromContent, EditableSong } from "../lib/editorModel";
import { api, Song } from "../lib/api";

interface SongEditScreenProps {
  /** Pass an existing song to edit it, or omit to create a new one. */
  song?: Song;
  onDone: (savedSong: Song) => void;
  onCancel: () => void;
}

type Tab = "edit" | "preview";

export function SongEditScreen({ song, onDone, onCancel }: SongEditScreenProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>("edit");
  const [title, setTitle] = useState(song?.title ?? "");
  const [artist, setArtist] = useState(song?.artist ?? "");
  const [songKey, setSongKey] = useState(song?.song_key ?? "");
  const [editable, setEditable] = useState<EditableSong>(() => linesFromContent(song?.content ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = useMemo(() => contentFromLines(editable), [editable]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Give the song a title before saving.");
      setTab("edit");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { title: title.trim(), artist: artist.trim() || undefined, key: songKey.trim() || undefined, content };
      const saved = song ? await api.updateSong(song.id, payload) : await api.createSong(payload);
      onDone(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save song");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={onCancel} hitSlop={8} style={styles.cancelButton}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{song ? "Edit song" : "New song"}</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.textSecondary}
          style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
        />
        <TextInput
          value={artist}
          onChangeText={setArtist}
          placeholder="Artist (optional)"
          placeholderTextColor={colors.textSecondary}
          style={[styles.metaInput, { color: colors.text, borderColor: colors.border }]}
        />
        <TextInput
          value={songKey ?? ""}
          onChangeText={setSongKey}
          placeholder="Key (e.g. G)"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          style={[styles.keyInput, { color: colors.text, borderColor: colors.border }]}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={[styles.tabRow, { borderColor: colors.border }]}>
        <Pressable onPress={() => setTab("edit")} style={styles.tabButton}>
          <Text style={[styles.tabLabel, { color: tab === "edit" ? colors.accent : colors.textSecondary }]}>Edit</Text>
        </Pressable>
        <Pressable onPress={() => setTab("preview")} style={styles.tabButton}>
          <Text style={[styles.tabLabel, { color: tab === "preview" ? colors.accent : colors.textSecondary }]}>
            Preview
          </Text>
        </Pressable>
      </View>

      <View style={[styles.body, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {tab === "edit" ? (
          <SongEditor song={editable} onChange={setEditable} />
        ) : (
          <SongViewer content={content} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cancelButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  saveButton: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 64, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  metaRow: { gap: 8, marginBottom: 10 },
  titleInput: { fontSize: 18, fontWeight: "700", borderBottomWidth: 1, paddingVertical: 8 },
  metaInput: { fontSize: 14, borderBottomWidth: 1, paddingVertical: 6 },
  keyInput: { fontSize: 14, borderBottomWidth: 1, paddingVertical: 6, maxWidth: 140 },
  errorText: { color: "#E0555A", fontSize: 13, marginBottom: 8 },
  tabRow: { flexDirection: "row", gap: 20, borderBottomWidth: 1, marginBottom: 12 },
  tabButton: { paddingBottom: 8 },
  tabLabel: { fontSize: 14, fontWeight: "700" },
  body: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 16 },
});
