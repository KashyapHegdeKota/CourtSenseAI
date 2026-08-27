"use client";

import { useEffect, useRef, useState } from "react";
import { FileVideo, Upload, X } from "lucide-react";
import { analyzeVideo, normalizeOutputVideoUrl } from "../../lib/api";
import type { TelemetryPoint } from "../../lib/types";

interface AnalysisModalProps {
  onClose: () => void;
  onAnalysisComplete: (result: { videoUrl: string; telemetry: TelemetryPoint[] }) => void;
}

export function AnalysisModal({ onClose, onAnalysisComplete }: AnalysisModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const progressTimerRef = useRef<number>();

  useEffect(() => () => {
    if (progressTimerRef.current !== undefined) window.clearInterval(progressTimerRef.current);
  }, []);

  const handleFile = async (file?: File) => {
    if (!file || analyzing) return;

    setAnalyzing(true);
    setProgress(8);
    setError("");
    progressTimerRef.current = window.setInterval(
      () => setProgress((value) => Math.min(92, value + Math.max(1, (92 - value) * .08))),
      260,
    );

    try {
      const data = await analyzeVideo(file);
      const videoUrl = normalizeOutputVideoUrl(data.output_video_url);
      const telemetry = data.telemetry;

      if (!videoUrl || !Array.isArray(telemetry)) {
        throw new Error("The analysis response did not include a video URL and telemetry.");
      }

      onAnalysisComplete({ videoUrl, telemetry });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed. Please try again.");
    } finally {
      if (progressTimerRef.current !== undefined) window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = undefined;
      setAnalyzing(false);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={(event) => event.target === event.currentTarget && !analyzing && onClose()}>
      <div className="upload-modal relative">
        <button aria-label="Close upload" disabled={analyzing} className="absolute right-4 top-4 text-slate-500 disabled:opacity-30" onClick={onClose}><X size={18}/></button>
        <FileVideo className="text-emerald-300" size={30}/>
        <h3 id="upload-title" className="mt-4 text-xl">Upload match footage</h3>
        <label className="dropzone mt-6 cursor-pointer" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }}>
          <Upload size={22}/>
          <span>{analyzing ? "Analyzing players, pitch and events…" : <>Drop video here or <u>browse files</u></>}</span>
          <small>MP4, MOV, AVI · max 2 GB</small>
          <input className="hidden" type="file" accept="video/*" disabled={analyzing} onChange={(event) => void handleFile(event.target.files?.[0])}/>
        </label>
        {error && <p className="mt-4 rounded-lg border border-orange-300/20 bg-orange-300/5 p-3 text-xs text-orange-200">{error}</p>}
        {progress > 0 && <div className="mt-4"><div className="mb-2 flex justify-between text-[11px] text-slate-400"><span>{analyzing ? "AI pipeline running" : "Analysis failed"}</span><span>{Math.round(progress)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-orange-300 transition-[width] duration-300" style={{ width: `${progress}%` }}/></div></div>}
      </div>
    </div>
  );
}
