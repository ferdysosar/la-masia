import { supabase } from "@/lib/supabase/client";

export type Player = {
  id: string;
  nickname: string;
  first_name: string;
  last_name: string;
  created_at: string;
};

export async function getPlayers(): Promise<{
  data: Player[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("id, nickname, first_name, last_name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch {
    return {
      data: [],
      error: "No se pudieron cargar los jugadores.",
    };
  }
}
