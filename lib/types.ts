export interface GameState {
  compliance: number;
  location: string;
  time: string;
  faction: "neutral" | "loyal" | "resistance" | "criminal" | "raderad";
  inNeuralDive: boolean;
  echoAwareness: "low" | "medium" | "high";
  flags: Record<string, boolean>;
  turnCount: number;
}

export interface GameMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GameRequest {
  playerInput: string;
  history: GameMessage[];
  state: GameState;
}

export interface Meta {
  location: string;
  time: string;
  compliance: number;
  inNeuralDive: boolean;
  echoAwareness: string;
}

export interface SaveData {
  id: string;
  user_id: string;
  name: string;
  state: GameState;
  history: GameMessage[];
  scene: string;
  created_at: string;
  updated_at: string;
}
