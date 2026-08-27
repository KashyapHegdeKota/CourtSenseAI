"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, BrainCircuit, Radio, Upload } from "lucide-react";
import { analyzeVideo, getHealth, telemetryPointsToRadar } from "../../lib/api";
import { MOCK_TELEMETRY, type HealthResponse, type Telemetry, type TelemetryPoint } from "../../lib/types";
import type { SampleMatch } from "../../lib/sample-matches";
import { PitchRadar, type RadarToggles } from "../radar/PitchRadar";
import { EventSearch } from "../search/EventSearch";
import { TelemetryPanel } from "../telemetry/TelemetryPanel";
import { BroadcastPlayer } from "./BroadcastPlayer";
import { AnalysisModal } from "./AnalysisModal";
import { SampleMatchesDrawer } from "./SampleMatchesDrawer";

const toggleLabels: Array<[keyof RadarToggles, string]> = [
  ["hulls", "Convex hulls"], ["ids", "Player IDs"], ["vectors", "Speed vectors"], ["heatmap", "Heatmap layer"],
];
const clock = (seconds: number) => new Date(seconds * 1000).toISOString().slice(14, 19);

export function CourtSenseShell() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthChecked, setHealthChecked] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>();
  const [telemetry, setTelemetry] = useState<Telemetry>(MOCK_TELEMETRY);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeDemo, setActiveDemo] = useState<SampleMatch>();
  const [analyzingDemoId, setAnalyzingDemoId] = useState<string>();
  const [demoError, setDemoError] = useState("");
  const demoRequestRef = useRef<AbortController | null>(null);
  const [toggles, setToggles] = useState<RadarToggles>({ hulls: true, ids: true, vectors: false, heatmap: false });

  const onAnalysisComplete = useCallback(({ videoUrl, telemetry: points }: { videoUrl: string; telemetry: TelemetryPoint[] }) => {
    demoRequestRef.current?.abort();
    setActiveDemo(undefined);
    setAnalyzingDemoId(undefined);
    setDemoError("");
    setActiveVideoUrl(videoUrl);
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
    setActiveDemo(sample); setActiveVideoUrl(sample.videoUrl); setCurrentTime(0); setAnalyzingDemoId(sample.id); setDemoError(""); setTelemetry(MOCK_TELEMETRY);
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
          <div className="panel p-5"><div className="panel-head"><div><p className="eyebrow">Broadcast feed</p><h3>Match footage <span className="live-dot"/></h3></div><span className="chip">ANALYSIS READY</span></div><BroadcastPlayer key={activeVideoUrl} src={activeVideoUrl} onTimeChange={setCurrentTime}/></div>
          <div className="panel p-5"><div className="panel-head"><div><p className="eyebrow">Spatial projection</p><h3><Activity size={16} className="inline text-cyan-300"/> Live tactical pitch</h3></div><span className="chip cyan">105 × 68 M</span></div>
            <div className="mt-4 aspect-[105/68] overflow-hidden rounded-xl border border-emerald-300/30 bg-emerald-950/30"><PitchRadar telemetry={telemetry} currentTime={currentTime} toggles={toggles}/></div>
            <div className="toggle-row">{toggleLabels.map(([key, label]) => <button key={key} type="button" aria-pressed={toggles[key]} onClick={() => setToggles((current) => ({ ...current, [key]: !current[key] }))}><span className={`toggle ${toggles[key] ? "on" : ""}`}/>{label}</button>)}</div>
          </div>
        </section>
        <div className="mt-5"><TelemetryPanel telemetry={telemetry}/></div>
        <EventSearch presets={activeDemo?.quickSearches} contextLabel={activeDemo?.title}/>
      </div>

      {uploadOpen && <AnalysisModal onAnalysisComplete={onAnalysisComplete} onClose={() => setUploadOpen(false)}/>}
    </main>
  );
}
