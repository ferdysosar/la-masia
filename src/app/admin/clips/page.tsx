"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth/auth";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  role: string;
};

type PlayerOption = {
  id: string;
  nickname: string;
  first_name: string;
  last_name: string;
};

type ClipWithPlayer = {
  id: string;
  player_id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  created_at: string;
  players: {
    id: string;
    nickname: string;
    first_name: string;
    last_name: string;
  } | null;
};

export default function AdminClipsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [clips, setClips] = useState<ClipWithPlayer[]>([]);

  const [playerId, setPlayerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function loadPlayers() {
    const { data, error: playersError } = await supabase
      .from("players")
      .select("id, nickname, first_name, last_name")
      .order("created_at", { ascending: false });

    if (playersError) {
      setError("No se pudo cargar la lista de jugadores.");
      return;
    }

    const rows = (data ?? []) as PlayerOption[];
    setPlayers(rows);
    if (rows.length > 0 && playerId === "") {
      setPlayerId(rows[0].id);
    }
  }

  async function loadClips() {
    const { data, error: clipsError } = await supabase
      .from("clips")
      .select(
        "id, player_id, title, description, video_url, created_at, players(id, nickname, first_name, last_name)"
      )
      .order("created_at", { ascending: false });

    if (clipsError) {
      setError("No se pudo cargar la lista de clips.");
      return;
    }

    setClips((data ?? []) as ClipWithPlayer[]);
  }

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);
      setWarning(null);

      const user = await getCurrentUser();

      if (user === null) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, role")
        .eq("id", user.id)
        .single<Profile>();

      if (profileError) {
        setError("No se pudo cargar el perfil del usuario.");
        setLoading(false);
        return;
      }

      if (profile === null || profile.role !== "admin") {
        setError("No tienes permisos de administrador.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadPlayers();
      await loadClips();
      setLoading(false);
    }

    bootstrap();
  }, [router]);

  async function getVideoDurationInSeconds(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);

      video.preload = "metadata";
      video.src = objectUrl;

      video.onloadedmetadata = () => {
        const duration = Number(video.duration);
        URL.revokeObjectURL(objectUrl);
        if (Number.isFinite(duration) === false) {
          reject(new Error("Duracion invalida"));
          return;
        }
        resolve(duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No se pudo leer el video"));
      };
    });
  }

  async function handleFileChange(file: File | null) {
    setError(null);
    setWarning(null);

    if (file === null) {
      setVideoFile(null);
      return;
    }

    if (file.type.startsWith("video/") === false) {
      setError("El archivo debe ser un video.");
      setVideoFile(null);
      return;
    }

    try {
      const duration = await getVideoDurationInSeconds(file);
      if (duration <= 0) {
        setError("La duracion del video es invalida.");
        setVideoFile(null);
        return;
      }
      if (duration > 10) {
        setError("El video supera el maximo de 10 segundos.");
        setVideoFile(null);
        return;
      }
      setVideoFile(file);
    } catch {
      setError("No se pudo validar la duracion del video.");
      setVideoFile(null);
    }
  }

  async function handleCreateClip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAdmin === false) {
      return;
    }

    if (playerId === "") {
      setError("Debes seleccionar un jugador.");
      return;
    }

    if (videoFile === null) {
      setError("Debes seleccionar un archivo de video.");
      return;
    }

    const user = await getCurrentUser();
    if (user === null) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setError(null);
    setWarning(null);

    const safeFileName = videoFile.name.trim().replace(/ /g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
    const finalFileName = safeFileName === "" ? "clip.mp4" : safeFileName;
    const storagePath = `${user.id}/${Date.now()}-${finalFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("clips")
      .upload(storagePath, videoFile, { upsert: false });

    if (uploadError) {
      setError("No se pudo subir el video al storage.");
      setSaving(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("clips")
      .getPublicUrl(storagePath);

    const { error: insertError } = await supabase.from("clips").insert({
      player_id: playerId,
      title: title.trim() === "" ? null : title.trim(),
      description: description.trim() === "" ? null : description.trim(),
      video_url: publicData.publicUrl,
    });

    if (insertError) {
      await supabase.storage.from("clips").remove([storagePath]);
      setError("No se pudo guardar el clip.");
      setSaving(false);
      return;
    }

    setTitle("");
    setDescription("");
    setVideoFile(null);
    await loadClips();
    setSaving(false);
  }

  async function handleDeleteClip(clip: ClipWithPlayer) {
    if (isAdmin === false) {
      return;
    }

    setError(null);
    setWarning(null);

    const { error: deleteError } = await supabase.from("clips").delete().eq("id", clip.id);

    if (deleteError) {
      setError("No se pudo eliminar el clip.");
      return;
    }

    const marker = "/storage/v1/object/public/clips/";
    const markerIndex = clip.video_url.indexOf(marker);

    if (markerIndex >= 0) {
      const pathWithQuery = clip.video_url.slice(markerIndex + marker.length);
      const cleanPath = pathWithQuery.split("?")[0];
      const { error: storageDeleteError } = await supabase.storage.from("clips").remove([cleanPath]);

      if (storageDeleteError) {
        setWarning("Clip eliminado de la base de datos, pero no se pudo borrar el archivo del storage.");
      }
    }

    await loadClips();
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
        <p>Cargando panel de clips...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">Admin - Clips</h1>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => router.push("/admin/jugadores")}
              className="w-full rounded-md border border-zinc-700 px-4 py-2 text-sm sm:w-auto"
            >
              Ir a Jugadores
            </button>
            <button
              onClick={handleLogout}
              className="w-full rounded-md border border-zinc-700 px-4 py-2 text-sm sm:w-auto"
            >
              Cerrar sesion
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {warning ? (
          <p className="mt-4 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-300">
            {warning}
          </p>
        ) : null}

        {isAdmin ? (
          <form
            onSubmit={handleCreateClip}
            className="mt-5 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <h2 className="text-lg font-semibold">Subir clip</h2>

            <select
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-400"
              required
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.nickname} - {player.first_name} {player.last_name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Titulo (opcional)"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-400"
            />

            <textarea
              placeholder="Descripcion (opcional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-24 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-400"
            />

            <input
              type="file"
              accept="video/*"
              onChange={(event) =>
                handleFileChange(event.target.files && event.target.files[0] ? event.target.files[0] : null)
              }
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
              required
            />

            <p className="text-xs text-zinc-400">Maximo permitido: 10 segundos.</p>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 disabled:opacity-60"
            >
              {saving ? "Subiendo..." : "Guardar clip"}
            </button>
          </form>
        ) : null}

        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold">Clips actuales</h2>

          {clips.length === 0 ? (
            <p className="text-zinc-300">No hay clips cargados.</p>
          ) : (
            <ul className="space-y-3">
              {clips.map((clip) => (
                <li key={clip.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                  <p className="font-semibold">
                    {clip.players
                      ? `${clip.players.nickname} - ${clip.players.first_name} ${clip.players.last_name}`
                      : "Jugador no encontrado"}
                  </p>

                  {clip.title ? <p className="mt-1 text-zinc-200">{clip.title}</p> : null}
                  {clip.description ? <p className="mt-1 text-zinc-300">{clip.description}</p> : null}

                  <video src={clip.video_url} controls className="mt-3 w-full rounded-md border border-zinc-700" />

                  <button
                    onClick={() => handleDeleteClip(clip)}
                    className="mt-3 w-full rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 sm:w-auto"
                  >
                    Eliminar clip
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
