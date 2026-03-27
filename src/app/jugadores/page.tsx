"use client";

import { useEffect, useState } from "react";
import { getPlayers, type Player } from "@/lib/players/getPlayers";

export default function JugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlayers() {
      const result = await getPlayers();

      if (result.error) {
        setError(result.error);
      } else {
        setPlayers(result.data);
      }

      setLoading(false);
    }

    loadPlayers();
  }, []);

  const showEmpty = loading === false && error === null && players.length === 0;
  const showList = loading === false && error === null && players.length > 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Jugadores</h1>

        {loading ? <p className="mt-6 text-zinc-300">Cargando jugadores...</p> : null}

        {error ? (
          <p className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-red-300">
            {error}
          </p>
        ) : null}

        {showEmpty ? (
          <p className="mt-6 text-zinc-300">Todavia no hay jugadores cargados.</p>
        ) : null}

        {showList ? (
          <ul className="mt-6 space-y-3">
            {players.map((player) => (
              <li key={player.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-lg font-semibold">{player.nickname}</p>
                <p className="text-zinc-300">
                  {player.first_name} {player.last_name}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
