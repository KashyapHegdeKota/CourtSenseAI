"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, BrainCircuit, FileVideo, Radio, Upload, X } from "lucide-react";
import { analyzeVideo, getHealth, normalizeOutputVideoUrl, telemetryPointsToRadar } from "../../lib/api";
import { MOCK_TELEMETRY, type HealthResponse, type Telemetry, type TelemetryPoint } from "../../lib/types";
import type { SampleMatch } from "../../lib/sample-matches";
import { PitchRadar, type RadarToggles } from "../radar/PitchRadar";
import { EventSearch } from "../search/EventSearch";
import { TelemetryPanel } from "../telemetry/TelemetryPanel";
import { BroadcastPlayer } from "./BroadcastPlayer";
import { SampleMatchesDrawer } from "./SampleMatchesDrawer";

const toggleLabels: Array<[keyof RadarToggles, string]> = [
  ["hulls", "Convex hulls"], ["ids", "Player IDs"], ["vectors", "Speed vectors"], ["heatmap", "Heatmap layer"],
];
const clock = (seconds: number) => new Date(seconds * 1000).toISOString().slice(14, 19);

export function CourtSenseShell() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthChecked, setHealthChecked] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [video, setVideo] = useState<string>();
  const [telemetry, setTelemetry] = useState<Telemetry>(MOCK_TELEMETRY);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeDemo, setActiveDemo] = useState<SampleMatch>();
  const [analyzingDemoId, setAnalyzingDemoId] = useState<string>();
  const [demoError, setDemoError] = useState("");
  const demoRequestRef = useRef<AbortController | null>(null);
  const [toggles, setToggles] = useState<RadarToggles>({ hulls: true, ids: true, vectors: false, heatmap: false });

  const onAnalysisComplete = useCallback(({ videoUrl, telemetry: points }: { videoUrl: string; telemetry: TelemetryPoint[] }) => {
    setVideo(videoUrl);
    setTelemetry(telemetryPointsToRadar(points));
    setCurrentTime(0);
  }, []);

  const refreshHealth = useCallback(() => {
    getHealth().then(setHealth).catch(() => setHealth(null)).finally(() => setHealthChecked(true));
  }, []);
  useEffect(() => { refreshHealth(); const timer = window.setInterval(refreshHealth, 30000); return () => { window.clearInterval(timer); demoRequestRef.current?.abort(); }; }, [refreshHealth]);

  const selectDemo = async (sample: SampleMatch) => {
    demoRequestRef.current?.abort();
    const controller = new AbortController();
    demoRequestRef.current = controller;
    setActiveDemo(sample); setVideo(sample.videoUrl); setCurrentTime(0); setAnalyzingDemoId(sample.id); setDemoError(""); setTelemetry(MOCK_TELEMETRY);
    try {
      const localResponse = await fetch(sample.videoUrl, { signal: controller.signal });
      if (!localResponse.ok) throw new Error(`Could not load ${sample.title}.`);
      const blob = await localResponse.blob();
      const file = new File([blob], sample.fileName, { type: blob.type || "video/mp4" });
      const analysis = await analyzeVideo(file, controller.signal);
      if (demoRequestRef.current !== controller) return;
      setTelemetry(telemetryPointsToRadar(analysis.telemetry));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDemoError(error instanceof Error ? error.message : "Live analysis is unavailable; raw demo playback is still ready.");
    } finally {
      if (demoRequestRef.current === controller) setAnalyzingDemoId(undefined);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file || analyzing) return;
    demoRequestRef.current?.abort(); setActiveDemo(undefined); setAnalyzingDemoId(undefined); setDemoError("");
    const localUrl = URL.createObjectURL(file);
    setVideo(localUrl); setAnalyzing(true); setUploadProgress(8); setUploadError("");
    const progressTimer = window.setInterval(() => setUploadProgress((value) => Math.min(92, value + Math.max(1, (92 - value) * .08))), 260);
    try {
      const response = await analyzeVideo(file);
      const videoUrl = normalizeOutputVideoUrl(response.output_video_url ?? response.output_video);
      if (videoUrl) {
        onAnalysisComplete({ videoUrl, telemetry: response.telemetry });
        URL.revokeObjectURL(localUrl);
      } else setTelemetry(telemetryPointsToRadar(response.telemetry));
      setUploadProgress(100);
      window.setTimeout(() => { setUploadOpen(false); setUploadProgress(0); }, 500);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Analysis failed. The local video preview is still available.");
    } finally {
      window.clearInterval(progressTimer); setAnalyzing(false);
    }
  };

  const healthy = health?.status === "healthy";
  const device = health?.device ?? "Unavailable";

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 sm:px-7 lg:px-10">
      <header className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="brand-mark"><BrainCircuit size={22}/></div><div><h1 className="text-lg font-semibold">CourtSense <span className="text-emerald-300">AI</span></h1><p className="eyebrow">Tactical intelligence studio</p></div></div>
        <div className="flex items-center gap-3">
          <button onClick={refreshHealth} className="status-pill" aria-label="Refresh backend status"><i className={!healthy ? "offline" : ""}/><span>{healthy ? "Systems nominal" : healthChecked ? "Backend unavailable" : "Checking systems"}</span><span className="hidden text-slate-500 sm:inline">{device}{health ? ` · Model ${health.model_loaded ? "ready" : "loading"} · FAISS ${health.faiss_ready ? "ready" : "offline"}` : ""}</span></button>
          <button onClick={() => setUploadOpen(true)} className="accent-button"><Upload size={15}/><span className="hidden sm:inline">Upload match</span></button>
        </div>
      </header>

      <div className="mx-auto mt-7 max-w-[1500px]">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow">Match workspace / 01</p><h2 className="mt-1 text-2xl font-semibold">Broadcast analysis</h2></div><div className="flex items-center gap-2 text-xs text-slate-500"><Radio size={13} className="text-emerald-300"/> LIVE TELEMETRY · {clock(currentTime)}</div></div>
        <SampleMatchesDrawer activeId={activeDemo?.id} analyzingId={analyzingDemoId} error={demoError} onSelect={(sample) => void selectDemo(sample)}/>
        <section className="studio-grid">
          <div className="panel p-5"><div className="panel-head"><div><p className="eyebrow">Broadcast feed</p><h3>Match footage <span className="live-dot"/></h3></div><span className="chip">ANALYSIS READY</span></div><BroadcastPlayer src={video} onTimeChange={setCurrentTime}/></div>
          <div className="panel p-5"><div className="panel-head"><div><p className="eyebrow">Spatial projection</p><h3><Activity size={16} className="inline text-cyan-300"/> Live tactical pitch</h3></div><span className="chip cyan">105 × 68 M</span></div>
            <div className="mt-4 aspect-[105/68] overflow-hidden rounded-xl border border-emerald-300/30 bg-emerald-950/30"><PitchRadar telemetry={telemetry} currentTime={currentTime} toggles={toggles}/></div>
            <div className="toggle-row">{toggleLabels.map(([key, label]) => <button key={key} type="button" aria-pressed={toggles[key]} onClick={() => setToggles((current) => ({ ...current, [key]: !current[key] }))}><span className={`toggle ${toggles[key] ? "on" : ""}`}/>{label}</button>)}</div>
          </div>
        </section>
        <div className="mt-5"><TelemetryPanel telemetry={telemetry}/></div>
        <EventSearch presets={activeDemo?.quickSearches} contextLabel={activeDemo?.title}/>
      </div>

      {uploadOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={(event) => event.target === event.currentTarget && !analyzing && setUploadOpen(false)}><div className="upload-modal relative"><button aria-label="Close upload" disabled={analyzing} className="absolute right-4 top-4 text-slate-500 disabled:opacity-30" onClick={() => setUploadOpen(false)}><X size={18}/></button><FileVideo className="text-emerald-300" size={30}/><h3 id="upload-title" className="mt-4 text-xl">Upload match footage</h3>
        <label className="dropzone mt-6 cursor-pointer" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }}><Upload size={22}/><span>{analyzing ? "Analyzing players, pitch and events…" : <>Drop video here or <u>browse files</u></>}</span><small>MP4, MOV, AVI · max 2 GB</small><input className="hidden" type="file" accept="video/*" disabled={analyzing} onChange={(event) => void handleFile(event.target.files?.[0])}/></label>
        {uploadError && <p className="mt-4 rounded-lg border border-orange-300/20 bg-orange-300/5 p-3 text-xs text-orange-200">{uploadError}</p>}
        {uploadProgress > 0 && <div className="mt-4"><div className="mb-2 flex justify-between text-[11px] text-slate-400"><span>{analyzing ? "AI pipeline running" : uploadError ? "Local preview active" : "Analysis ready"}</span><span>{Math.round(uploadProgress)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-orange-300 transition-[width] duration-300" style={{ width: `${uploadProgress}%` }}/></div></div>}
      </div></div>}
    </main>
  );
}
