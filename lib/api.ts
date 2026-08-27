import type { AnalyzeResponse, HealthStatus, SearchEvent, SearchResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const json = async <T>(res: Response): Promise<T> => { if (!res.ok) throw new Error(`API ${res.status}`); return res.json() as Promise<T>; };

export function resolveBackendUrl(path?: string): string | undefined {
  if (!path) return undefined;
  try { return new URL(path, `${API_BASE}/`).toString(); } catch { return path; }
}

export async function getHealth(): Promise<HealthStatus> {
  return json<HealthStatus>(await fetch(`${API_BASE}/health`, { cache: 'no-store' }));
}
export async function analyzeVideo(file: File, signal?: AbortSignal): Promise<AnalyzeResponse> {
  const body = new FormData(); body.append('file', file);
  return json<AnalyzeResponse>(await fetch(`${API_BASE}/analyze`, { method: 'POST', body, signal }));
}
export async function searchEvents(query: string, topK = 8): Promise<SearchEvent[]> {
  const params = new URLSearchParams({ query, top_k: String(topK) });
  const data = await json<SearchResponse>(await fetch(`${API_BASE}/search_events?${params}`, { cache: 'no-store' }));
  return Array.isArray(data) ? data : data.results;
}
export function getClipUrl(videoPath: string, centerFrame: number, windowSec = 3): string {
  const params = new URLSearchParams({ video_path: videoPath, center_frame: String(centerFrame), window_sec: String(windowSec) });
  return `${API_BASE}/get_clip?${params}`;
}
