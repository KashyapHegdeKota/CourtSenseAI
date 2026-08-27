"use client";
import { useEffect, useState } from "react";
import { Download, Loader2, Play, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getClipUrl, searchEvents } from "../../lib/api";
import type { SearchEvent } from "../../lib/types";

const presets = ["tackle near touchline", "counter attack down flank", "corner kick"];
const mock: SearchEvent[] = [
  { frame: 12580, timestamp: 522, confidence: .94, label: "Fast break · right flank" },
  { frame: 25760, timestamp: 1036, confidence: .89, label: "Tackle near touchline" },
  { frame: 46625, timestamp: 1865, confidence: .82, label: "Corner kick setup" },
];
const value = (e: SearchEvent, key: string) => e[key] as string | number | undefined;
const seconds = (e: SearchEvent) => typeof e.timestamp === "number" ? e.timestamp : (typeof e.timestamp === "string" ? Number(e.timestamp) || 0 : Number(value(e,"time_sec") ?? 0));
const clock = (n: number) => `${String(Math.floor(n / 60)).padStart(2,"0")}:${String(Math.floor(n % 60)).padStart(2,"0")}`;

export function EventSearch({ videoPath = "match.mp4" }: { videoPath?: string }) {
  const [query, setQuery] = useState(""); const [events, setEvents] = useState<SearchEvent[]>(mock);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [selected, setSelected] = useState<SearchEvent | null>(null);
  const run = async (q = query) => { if (!q.trim()) return; setQuery(q); setLoading(true); setError(""); try { setEvents(await searchEvents(q.trim(), 8)); } catch { setEvents(mock); setError("Backend unavailable · showing indexed preview"); } finally { setLoading(false); } };
  useEffect(() => { const fn = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null); window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn); }, []);
  return <section className="panel mt-5 p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Multimodal retrieval</p><h3>Find the moment</h3></div><span className="text-xs text-slate-500">VLM + FAISS indexed</span></div>
    <form className="search-box mt-4" onSubmit={e => { e.preventDefault(); void run(); }}><Search size={17}/><input aria-label="Search match events" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search match events in natural language..."/><kbd>⌘ K</kbd></form>
    <div className="mt-3 flex flex-wrap gap-2">{presets.map(p=><button type="button" key={p} onClick={()=>void run(p)} className="preset">{p}</button>)}</div>
    {error && <p className="mt-3 text-xs text-orange-300">{error}</p>}
    <div className="event-grid mt-5">{loading ? <div className="col-span-full flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="animate-spin" size={16}/> Searching event embeddings…</div> : events.length ? events.map((e,i)=>{ const confidence = Number(value(e,"confidence") ?? value(e,"score") ?? 0) <= 1 ? Number(value(e,"confidence") ?? value(e,"score") ?? .8)*100 : Number(value(e,"confidence") ?? value(e,"score") ?? 80); const frame=Number(value(e,"frame") ?? 0); return <motion.article initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.05}} className="event-card" key={`${frame}-${i}`}><div className="event-thumb"><span>{clock(seconds(e))}</span><Play size={17}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{String(value(e,"label") ?? value(e,"description") ?? "Detected match event")}</p><div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>Frame {frame.toLocaleString()}</span><strong className="text-emerald-300">{Math.round(confidence)}% match</strong></div><div className="confidence"><b style={{width:`${Math.min(100,confidence)}%`}}/></div></div><button type="button" aria-label="Play highlight" onClick={()=>setSelected(e)} className="icon-button"><Play size={15}/></button></motion.article> }) : <p className="py-8 text-sm text-slate-500">No matching moments found.</p>}</div>
    <AnimatePresence>{selected && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}><motion.div initial={{scale:.96}} animate={{scale:1}} className="upload-modal relative w-full max-w-2xl"><button aria-label="Close highlight" className="absolute right-4 top-4 text-slate-400" onClick={()=>setSelected(null)}><X size={18}/></button><p className="eyebrow">Highlight reel · {clock(seconds(selected))}</p><h3 className="mt-1 text-xl">{String(value(selected,"label") ?? "Match event")}</h3><video className="mt-5 aspect-video w-full rounded-xl bg-black" controls autoPlay src={getClipUrl(videoPath, Number(value(selected,"frame") ?? 0), 3)} /><a className="accent-button mt-4 inline-flex" download href={getClipUrl(videoPath, Number(value(selected,"frame") ?? 0), 3)}><Download size={15}/> Download clip</a></motion.div></motion.div>}</AnimatePresence>
  </section>;
}
