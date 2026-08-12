import Constants from "expo-constants";

const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:4000";

export interface SongSummary {
  id: string;
  title: string;
  artist: string | null;
  song_key: string | null;
  capo: number;
  tempo: number | null;
  created_at: string;
  updated_at: string;
}

export interface Song extends SongSummary {
  content: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listSongs: () => request<SongSummary[]>("/api/songs"),
  getSong: (id: string) => request<Song>(`/api/songs/${id}`),
  createSong: (song: { title: string; artist?: string; key?: string; capo?: number; tempo?: number; content: string }) =>
    request<Song>("/api/songs", { method: "POST", body: JSON.stringify(song) }),
  updateSong: (id: string, song: Partial<Song>) =>
    request<Song>(`/api/songs/${id}`, { method: "PUT", body: JSON.stringify(song) }),
  deleteSong: (id: string) => request<void>(`/api/songs/${id}`, { method: "DELETE" }),
  backup: () => request<{ version: number; exportedAt: string; songs: Song[] }>("/api/backup"),
  restore: (backup: unknown, mode: "replace" | "merge" = "replace") =>
    request<{ ok: boolean; imported: number; mode: string }>(`/api/restore?mode=${mode}`, {
      method: "POST",
      body: JSON.stringify(backup),
    }),
};
