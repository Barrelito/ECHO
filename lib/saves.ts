import { getSupabase } from "@/lib/supabase";
import type { GameState, GameMessage, SaveData } from "@/lib/types";

const MAX_SAVES = 10;
const MAX_HISTORY_MESSAGES = 40;

export async function getSaves(): Promise<SaveData[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createSave(
  name: string,
  state: GameState,
  history: GameMessage[],
  scene: string
): Promise<SaveData> {
  const supabase = getSupabase();

  const { count } = await supabase
    .from("game_saves")
    .select("id", { count: "exact", head: true });

  if (count !== null && count >= MAX_SAVES) {
    throw new Error("MAX_SAVES_REACHED");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const { data, error } = await supabase
    .from("game_saves")
    .insert({
      user_id: user.id,
      name,
      state,
      history: history.slice(-MAX_HISTORY_MESSAGES),
      scene,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSave(
  id: string,
  state: GameState,
  history: GameMessage[],
  scene: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("game_saves")
    .update({
      state,
      history: history.slice(-MAX_HISTORY_MESSAGES),
      scene,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteSave(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("game_saves")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
