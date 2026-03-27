"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth/auth";
import { getPlayers, type Player } from "@/lib/players/getPlayers";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  role: string;
};

export default function AdminJugadoresPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [nickname, setNickname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function loadPlayers() {
    const result = await getPlayers();

    if (result.error) {
      setError(result.error);
      return;
    }

    setPlayers(result.data);
  }

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();

      if (!user) {
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

      if (!profile || profile.role !== "admin") {
        setError("No tienes permisos de administrador.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadPlayers();
      setLoading(false);
    }

    bootstrap();
  }, [router]);

  async function handleCreatePlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("players").insert({
      nickname: nickname.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });

    if (insertError) {
      setError("No se pudo crear el jugador.");
      setSaving(false);
      return;
    }

    setNickname("");
    setFirstName("");
    setLastName("");
    await loadPlayers();
    setSaving(false);
  }

  async function handleDeletePlayer(playerId: string) {
    if (!isAdmin) {
      return;
    }

    setError(null);
    const { error: deleteError } = await supabase.from("players").delete().eq("id", playerId);

    if (deleteError) {
      setError("No se pudo eliminar el jugador.");
      return;
    }

    await loadPlayers();
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
        <p>Cargando panel de administrador...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">Admin - Jugadores</h1>
          <button
            onClick={handleLogout}
            className="w-full rounded-md border border-zinc-700 px-4 py-2 text-sm sm:w-auto"
          >
            Cerrar sesion
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {isAdmin ? (
          <form
            onSubmit={handleCreatePlayer}
            className="mt-5 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <h2 className="text-lg font-semibold">Crear jugador</h2>

            <input
              type="text"
              placeholder="Nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-400"
              required
            />

            <input
              type="text"
              placeholder="Nombre"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-400"
              required
            />

            <input
              type="text"
              placeholder="Apellido"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-400"
              required
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Crear jugador"}
            </button>
          </form>
        ) : null}

        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold">Listado actual</h2>

          {players.length === 0 ? (
            <p className="text-zinc-300">No hay jugadores cargados.</p>
          ) : (
            <ul className="space-y-2">
              {players.map((player) => (
                <li
                  key={player.id}
                  className="flex flex-col gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{player.nickname}</p>
                    <p className="text-zinc-300">
                      {player.first_name} {player.last_name}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="w-full rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 sm:w-auto"
                  >
                    Eliminar
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
