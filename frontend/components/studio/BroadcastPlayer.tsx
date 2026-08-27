"use client";

import { AlertCircle, Pause, Play, Volume2 } from "lucide-react";
import { useRef, useState } from "react";

type Marker = { time: number; label?: string };
type Props = { src?: string; markers?: Marker[]; onTimeChange?: (time: number) => void };

const defaultMarkers: Marker[] = [
  { time: 522, label: "Fast break" },
  { time: 1036, label: "Touchline tackle" },
  { time: 1865, label: "Corner" },
];

const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().slice(14, 19);

export function BroadcastPlayer({ src, markers = defaultMarkers, onTimeChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const syncTime = (time: number) => {
    setCurrentTime(time);
    onTimeChange?.(time);
  };

  const seek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
    syncTime(time);
  };

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else void videoRef.current.play();
  };

  return (
    <div className="space-y-3">
      <div className="video-stage relative overflow-hidden">
        {src ? <>
          {/* Captions are not emitted by the analysis API. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            key={src}
            ref={videoRef}
            src={src}
            controls
            autoPlay
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(event) => syncTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => { setVideoError(""); setCurrentTime(0); setDuration(event.currentTarget.duration); }}
            onError={() => {
              const message = "Video could not be loaded. Check the backend media URL and CORS policy.";
              setVideoError(message);
              console.error(message, { src });
            }}
          />
          {videoError && <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-lg border border-orange-300/30 bg-slate-950/90 p-3 text-xs text-orange-200"><AlertCircle size={15}/>{videoError}</div>}
        </> : <div className="video-empty"><Play size={26}/><span>Upload a match video to begin</span></div>}
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <button aria-label={playing ? "Pause match" : "Play match"} onClick={togglePlayback}>{playing ? <Pause size={16}/> : <Play size={16} fill="currentColor"/>}</button>
        <span>{formatTime(currentTime)} / {duration ? formatTime(duration) : "90:00"}</span>
        <div className="relative flex-1">
          <input aria-label="Match timeline" className="w-full accent-emerald-300" type="range" min={0} max={duration || 5400} value={currentTime} onChange={(event) => seek(Number(event.target.value))}/>
          {markers.map((marker) => <i title={marker.label} key={marker.time} className="pointer-events-none absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-orange-300" style={{ left: `${(marker.time / (duration || 5400)) * 100}%` }}/>) }
        </div>
        <button aria-label="Change playback speed" onClick={() => { const next = speed === .5 ? 1 : speed === 1 ? 2 : .5; setSpeed(next); if (videoRef.current) videoRef.current.playbackRate = next; }}>{speed}×</button>
        <Volume2 aria-hidden="true" size={15}/>
      </div>
    </div>
  );
}
