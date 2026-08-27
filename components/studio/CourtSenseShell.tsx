"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, BrainCircuit, FileVideo, Radio, Upload, X } from "lucide-react";
import { analyzeVideo, getHealth, resolveBackendUrl } from "../../lib/api";
import { MOCK_TELEMETRY, type HealthStatus, type Telemetry } from "../../lib/types";
import { PitchRadar, type RadarToggles } from "../radar/PitchRadar";
import { EventSearch } from "../search/EventSearch";
import { TelemetryPanel } from "../telemetry/TelemetryPanel";
import { BroadcastPlayer } from "./BroadcastPlayer";

const toggleLabels: Array<[keyof RadarToggles, string]> = [
  ["hulls", "Convex hulls"], ["ids", "Player IDs"], ["vectors", "Speed vectors"], ["heatmap", "Heatmap layer"],
];
const clock = (seconds: number) => new Date(seconds * 1000).toISOString().slice(14, 19);

export function CourtSenseShell() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [video, setVideo] = useState<string>();
  const [videoPath, setVideoPath] = useState("match.mp4");
  const [telemetry, setTelemetry] = useState<Telemetry>(MOCK_TELEMETRY);
  const [currentTime, setCurrentTime] = useState(0);
  const [toggles, setToggles] = useState<RadarToggles>({ hulls: true, ids: true, vectors: false, heatmap: false });

  const refreshHealth = useCallback(() => {
    getHealth().then((result) => { setHealth(result); setOnline(true); }).catch(() => { setHealth(null); setOnline(false); });
  }, []);
  useEffect(() => { refreshHealth(); const timer = window.setInterval(refreshHealth, 30000); return () => window.clearInterval(timer); }, [refreshHealth]);

  const handleFile = async (file?: File) => {
    if (!file || analyzing) return;
    const localUrl = URL.createObjectURL(file);
    setVideo(localUrl); setVideoPath(file.name); setAnalyzing(true); setUploadProgress(8);
    const progressTimer = window.setInterval(() => setUploadProgress((value) => Math.min(92, value + Math.max(1, (92 - value) * .08))), 260);
    try {
      const response = await analyzeVideo(file);
      const backendVideo = resolveBackendUrl(response.annotated_video_url ?? response.video_url);
      if (backendVideo) { setVideo(backendVideo); URL.revokeObjectURL(localUrl); }
      setVideoPath(response.video_path ?? response.annotated_video_url ?? response.video_url ?? file.name);
      if (response.telemetry_json) setTelemetry(typeof response.telemetry_json === "string" ? JSON.parse(response.telemetry_json) : response.telemetry_json);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      window.clearInterval(progressTimer); setUploadProgress(100); setAnalyzing(false);
      window.setTimeout(() => { setUploadOpen(false); setUploadProgress(0); }, 450);
    }
  };

  const device = String(health?.device ?? (health?.gpu ? "GPU" : online ? "CPU" : "Mock preview"));
  const vectors = Number(health?.faiss_vector_count ?? 0);

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 sm:px-7 lg:px-10">
      <header className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="brand-mark"><BrainCircuit size={22}/></div><div><h1 className="text-lg font-semibold">CourtSense <span className="text-emerald-300">AI</span></h1><p className="eyebrow">Tactical intelligence studio</p></div></div>
        <div className="flex items-center gap-3">
          <button onClick={refreshHealth} className="status-pill" aria-label="Refresh backend status"><i className={online === false ? "offline" : ""}/><span>{online === false ? "Backend offline" : online ? "Systems nominal" : "Checking systems"}</span><span className="hidden text-slate-500 sm:inline">{device}{vectors ? ` · ${vectors.toLocaleString()} vectors` : ""}</span></button>
          <button onClick={() => setUploadOpen(true)} className="accent-button"><Upload size={15}/><span className="hidden sm:inline">Upload match</span></button>
        </div>
      </header>

      <div className="mx-auto mt-7 max-w-[1500px]">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow">Match workspace / 01</p><h2 className="mt-1 text-2xl font-semibold">Broadcast analysis</h2></div><div className="flex items-center gap-2 text-xs text-slate-500"><Radio size={13} className="text-emerald-300"/> LIVE TELEMETRY · {clock(currentTime)}</div></div>
        <section className="studio-grid">
          <div className="panel p-5"><div className="panel-head"><div><p className="eyebrow">Broadcast feed</p><h3>Match footage <span className="live-dot"/></h3></div><span className="chip">ANALYSIS READY</span></div><BroadcastPlayer src={video} onTimeChange={setCurrentTime}/></div>
          <div className="panel p-5"><div className="panel-head"><div><p className="eyebrow">Spatial projection</p><h3><Activity size={16} className="inline text-cyan-300"/> Live tactical pitch</h3></div><span className="chip cyan">105 × 68 M</span></div>
            <div className="mt-4 aspect-[105/68] overflow-hidden rounded-xl border border-emerald-300/30 bg-emerald-950/30"><PitchRadar telemetry={telemetry} currentTime={currentTime} toggles={toggles}/></div>
            <div className="toggle-row">{toggleLabels.map(([key, label]) => <button key={key} type="button" aria-pressed={toggles[key]} onClick={() => setToggles((current) => ({ ...current, [key]: !current[key] }))}><span className={`toggle ${toggles[key] ? "on" : ""}`}/>{label}</button>)}</div>
          </div>
        </section>
        <div className="mt-5"><TelemetryPanel telemetry={telemetry}/></div>
        <EventSearch videoPath={videoPath}/>
      </div>

      {uploadOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={(event) => event.target === event.currentTarget && !analyzing && setUploadOpen(false)}><div className="upload-modal relative"><button aria-label="Close upload" disabled={analyzing} className="absolute right-4 top-4 text-slate-500 disabled:opacity-30" onClick={() => setUploadOpen(false)}><X size={18}/></button><FileVideo className="text-emerald-300" size={30}/><h3 id="upload-title" className="mt-4 text-xl">Upload match footage</h3>
        <label className="dropzone mt-6 cursor-pointer" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }}><Upload size={22}/><span>{analyzing ? "Analyzing players, pitch and events…" : <>Drop video here or <u>browse files</u></>}</span><small>MP4, MOV, AVI · max 2 GB</small><input className="hidden" type="file" accept="video/*" disabled={analyzing} onChange={(event) => void handleFile(event.target.files?.[0])}/></label>
        {uploadProgress > 0 && <div className="mt-4"><div className="mb-2 flex justify-between text-[11px] text-slate-400"><span>{uploadProgress < 100 ? "AI pipeline running" : "Analysis ready"}</span><span>{Math.round(uploadProgress)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-orange-300 transition-[width] duration-300" style={{ width: `${uploadProgress}%` }}/></div></div>}
      </div></div>}
    </main>
  );
}
