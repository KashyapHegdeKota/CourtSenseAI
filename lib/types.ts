export interface HealthResponse {
  status: "healthy" | string;
  device: "cpu" | "cuda:0" | string;
  model_loaded: boolean;
  faiss_ready: boolean;
}

export interface SearchResultItem {
  index_id: number;
  video_path: string;
  frame_idx: number;
  timestamp_sec: number;
  active_players: number;
  similarity_score: number;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

export interface TelemetryPoint {
  frame: number;
  track_id: number;
  team_id: number;
  pitch_x: number;
  pitch_y: number;
}

export interface AnalyzeResponse {
  status: "success" | string;
  output_video_url: string;
  telemetry: TelemetryPoint[];
}

export interface PlayerTelemetry {
  id: string | number;
  team: "A" | "B" | string;
  x: number;
  y: number;
  speed_kmh: number;
  distance_m: number;
  vx?: number;
  vy?: number;
}

export interface TelemetryFrame {
  frame: number;
  time_sec: number;
  players: PlayerTelemetry[];
}

export interface Telemetry {
  duration_sec?: number;
  fps?: number;
  players?: PlayerTelemetry[];
  frames?: TelemetryFrame[];
}

export const MOCK_TELEMETRY: Telemetry = {
  duration_sec: 94.2,
  fps: 25,
  players: Array.from({ length: 14 }, (_, index) => ({
    id: index + 1,
    team: index < 7 ? "A" : "B",
    x: 12 + ((index * 17) % 80),
    y: 12 + ((index * 29) % 52),
    speed_kmh: 8 + ((index * 7) % 24),
    distance_m: 4200 + index * 183,
  })),
};
