export type HealthStatus = { status?: string; gpu?: boolean; device?: string; faiss_vector_count?: number; [key: string]: unknown };
export type PlayerTelemetry = {
  id: string | number;
  team: "A" | "B" | string;
  x: number;
  y: number;
  speed_kmh: number;
  distance_m: number;
  vx?: number;
  vy?: number;
};

export type TelemetryFrame = {
  frame?: number;
  time_sec?: number;
  players: PlayerTelemetry[];
};

export type Telemetry = {
  duration_sec?: number;
  fps?: number;
  players?: PlayerTelemetry[];
  frames?: TelemetryFrame[];
  [key: string]: unknown;
};

export type AnalyzeResponse = {
  annotated_video_url?: string;
  video_url?: string;
  video_path?: string;
  telemetry_json?: Telemetry | string;
  [key: string]: unknown;
};
export type SearchEvent = { frame?: number; timestamp?: number | string; confidence?: number; label?: string; [key: string]: unknown };
export type SearchResponse = SearchEvent[] | { results: SearchEvent[]; [key: string]: unknown };

export const MOCK_TELEMETRY: Telemetry = {
  duration_sec: 94.2, fps: 25,
  players: Array.from({ length: 14 }, (_, i) => ({ id: i + 1, team: i < 7 ? 'A' : 'B', x: 12 + ((i * 17) % 80), y: 12 + ((i * 29) % 72), speed_kmh: 8 + ((i * 7) % 24), distance_m: 4200 + i * 183 })),
};
