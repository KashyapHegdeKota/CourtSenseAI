"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2, Play, Search, X } from "lucide-react";
import { getClipUrl, searchEvents } from "../../lib/api";
import type { SearchResultItem } from "../../lib/types";

const presets = ["corner kick", "tackle", "goalkeeper"];
const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function EventSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SearchResultItem | null>(null);
  const [clipLoading, setClipLoading] = useState(false);
  const [clipError, setClipError] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  const clipUrl = useMemo(() => selected ? getClipUrl(selected.video_path, selected.frame_idx, 3.0) : "", [selected]);

  const playResult = (result: SearchResultItem) => {
    setSelected(result);
    setClipError("");
    setClipLoading(true);
  };

  const run = async (nextQuery = query) => {
    const normalized = nextQuery.trim();
    if (!normalized) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setQuery(normalized);
    setLoading(true);
    setError("");
    try {
      const response = await searchEvents(normalized, 3, controller.signal);
      setResults(response.results);
      if (response.results[0]) playResult(response.results[0]);
      else setSelected(null);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setResults([]);
      setSelected(null);
      setError(requestError instanceof Error ? requestError.message : "Event search is temporarily unavailable.");
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", closeOnEscape);
    return () => { window.removeEventListener("keydown", closeOnEscape); requestRef.current?.abort(); };
  }, []);

  return (
    <section className="panel mt-5 p-5">
      <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Multimodal retrieval</p><h3>Find the moment</h3></div><span className="text-xs text-slate-500">VLM + FAISS · Top 3</span></div>
      <form className="search-box mt-4" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        <Search size={17}/><input aria-label="Search match events" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search match events in natural language..."/>
        <button type="submit" disabled={loading || !query.trim()} className="text-xs font-semibold text-emerald-300 disabled:opacity-30">Search</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">{presets.map((preset) => <button type="button" key={preset} onClick={() => void run(preset)} disabled={loading} className="preset disabled:opacity-40">{preset}</button>)}</div>
      <div aria-live="polite">
        {error && <p className="mt-3 rounded-lg border border-orange-300/20 bg-orange-300/5 p-3 text-xs text-orange-200">Search unavailable: {error}</p>}
        <div className="event-grid mt-5">
          {loading ? <div className="col-span-full flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="animate-spin" size={16}/> Searching event embeddings…</div>
            : results.length ? results.map((result, index) => {
              const confidence = Math.max(0, Math.min(100, result.similarity_score * 100));
              return <motion.button type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} onClick={() => playResult(result)} className="event-card text-left" key={result.index_id}>
                <div className="event-thumb"><span>{clock(result.timestamp_sec)}</span><Play size={17}/></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Rank #{index + 1} · {result.active_players} active players</p><div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500"><span>Frame {result.frame_idx.toLocaleString()}</span><strong className="text-emerald-300">{confidence.toFixed(1)}% match</strong></div><div className="confidence"><b style={{ width: `${confidence}%` }}/></div></div>
                <span className="icon-button" aria-hidden="true"><Play size={15}/></span>
              </motion.button>;
            }) : !error && <p className="col-span-full py-8 text-sm text-slate-500">Search a phrase or choose a preset to load the best matching highlight.</p>}
        </div>
      </div>

      <AnimatePresence>{selected && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="highlight-title" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
        <motion.div initial={{ scale: .96 }} animate={{ scale: 1 }} className="upload-modal relative w-full max-w-2xl">
          <button aria-label="Close highlight" className="absolute right-4 top-4 text-slate-400" onClick={() => setSelected(null)}><X size={18}/></button>
          <p className="eyebrow">Highlight reel · {clock(selected.timestamp_sec)}</p><h3 id="highlight-title" className="mt-1 text-xl">Frame {selected.frame_idx.toLocaleString()} · {selected.active_players} players detected</h3>
          <div className="relative mt-5 aspect-video overflow-hidden rounded-xl bg-black">
            {clipLoading && <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 text-sm text-slate-300"><span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> Loading highlight stream…</span></div>}
            <video key={clipUrl} className="h-full w-full" controls autoPlay src={clipUrl} onCanPlay={() => setClipLoading(false)} onError={() => { setClipLoading(false); setClipError("The highlight stream could not be loaded. Try the result again or run another search."); }}/>
          </div>
          {clipError && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-orange-300/20 bg-orange-300/5 p-3 text-xs text-orange-200"><span>{clipError}</span><button type="button" className="font-semibold text-emerald-300" onClick={() => playResult({ ...selected })}>Retry</button></div>}
          <a className="accent-button mt-4 inline-flex" download href={clipUrl}><Download size={15}/> Download clip</a>
        </motion.div>
      </motion.div>}</AnimatePresence>
    </section>
  );
}
