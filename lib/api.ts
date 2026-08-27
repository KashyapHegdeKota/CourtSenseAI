import type {
  AnalyzeResponse,
  HealthResponse,
  PlayerTelemetry,
  SearchResponse,
  Telemetry,
  TelemetryPoint,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.courtsense.kashyaphegde.com";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json() as { detail?: string; message?: string };
      detail = body.detail ?? body.message ?? "";
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new ApiError(detail || `CourtSense API request failed (${response.status})`, response.status);
  }
  return response.json() as Promise<T>;
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson<HealthResponse>(`${API_BASE}/health`, { cache: "no-store", signal });
}

export function normalizeOutputVideoUrl(path?: string): string | undefined {
  if (!path) return undefined;
  try {
    const url = new URL(path, `${API_BASE}/`);
    if (url.protocol === "http:") {
      const api = new URL(API_BASE);
      url.protocol = "https:";
      if (url.pathname.startsWith("/static/videos/")) url.host = api.host;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function searchEvents(query: string, topK = 3, signal?: AbortSignal): Promise<SearchResponse> {
  const params = new URLSearchParams({ query, top_k: String(topK) });
  return requestJson<SearchResponse>(`${API_BASE}/search_events?${params}`, { cache: "no-store", signal });
}

export function getClipUrl(videoPath: string, centerFrame: number, windowSec = 3.0): string {
  const params = new URLSearchParams({
    video_path: videoPath,
    center_frame: String(centerFrame),
    window_sec: String(windowSec),
  });
  return `${API_BASE}/get_clip?${params}`;
}

export async function analyzeVideo(file: File, signal?: AbortSignal): Promise<AnalyzeResponse> {
  const body = new FormData();
  body.append("file", file);
  return requestJson<AnalyzeResponse>(`${API_BASE}/analyze`, { method: "POST", body, signal });
}

function toPlayer(point: TelemetryPoint): PlayerTelemetry {
  return {
    id: point.track_id,
    team: point.team_id === 0 ? "A" : "B",
    x: point.pitch_x,
    y: point.pitch_y,
    speed_kmh: 0,
    distance_m: 0,
  };
}

export function telemetryPointsToRadar(points: TelemetryPoint[], fps = 25): Telemetry {
  const grouped = new Map<number, TelemetryPoint[]>();
  for (const point of points) {
    const framePoints = grouped.get(point.frame) ?? [];
    framePoints.push(point);
    grouped.set(point.frame, framePoints);
  }
  const frames = [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([frame, framePoints]) => ({ frame, time_sec: frame / fps, players: framePoints.map(toPlayer) }));
  return {
    fps,
    duration_sec: frames.length ? frames[frames.length - 1].time_sec : 0,
    players: frames[0]?.players ?? [],
    frames,
  };
}
