export type SceneType = "puls" | "scen" | "andning";

export interface GameState {
  compliance: number;
  location: string;
  time: string;
  faction: "neutral" | "loyal" | "resistance" | "criminal" | "raderad";
  inNeuralDive: boolean;
  echoAwareness: "low" | "medium" | "high";
  flags: Record<string, boolean>;
  turnCount: number;
  sceneType?: SceneType;
  ambientHook?: string;
}

export interface GameMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GameRequest {
  playerInput: string;
  history: GameMessage[];
  state: GameState;
  recentAmbientFragments?: string[];
}

export interface Meta {
  location: string;
  time: string;
  compliance: number;
  inNeuralDive: boolean;
  echoAwareness: string;
  hints?: string[];
  sceneType?: SceneType;
  ambientHook?: string;
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

export interface AmbientRequest {
  state: GameState;
  lastSceneSummary: string;
  ambientHook?: string;
  sceneType?: SceneType;
}

export interface AmbientEvent {
  type: "ambient";
  text: string;
  actionable: boolean;
}
