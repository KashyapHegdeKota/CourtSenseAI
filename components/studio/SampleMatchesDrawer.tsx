"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Clapperboard, Loader2, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { SAMPLE_MATCHES, type SampleMatch } from "../../lib/sample-matches";

interface Props {
  activeId?: string;
  analyzingId?: string;
  error?: string;
  onSelect: (sample: SampleMatch) => void;
}

const accents = {
  emerald: "border-emerald-300/30 bg-emerald-300/5 text-emerald-300",
  cyan: "border-cyan-300/30 bg-cyan-300/5 text-cyan-300",
  orange: "border-orange-300/30 bg-orange-300/5 text-orange-300",
};

export function SampleMatchesDrawer({ activeId, analyzingId, error, onSelect }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <section className="panel mb-5 overflow-hidden">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300"><Clapperboard size={17}/></span><span><span className="block text-sm font-semibold">Sample Matches / Quick Demos</span><span className="mt-0.5 block text-[11px] text-slate-500">Load a clip and run the live tracking pipeline in one click</span></span></span>
        <ChevronDown size={17} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      <AnimatePresence initial={false}>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
        <div className="grid gap-3 border-t border-white/5 px-5 py-4 md:grid-cols-3">
          {SAMPLE_MATCHES.map((sample) => {
            const active = sample.id === activeId;
            const analyzing = sample.id === analyzingId;
            return <button key={sample.id} type="button" disabled={Boolean(analyzingId)} onClick={() => onSelect(sample)} className={`group relative min-h-32 overflow-hidden rounded-2xl border p-4 text-left transition-all disabled:cursor-wait disabled:opacity-60 ${active ? accents[sample.accent] : "border-white/10 bg-white/[.025] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.045]"}`}>
              <span className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_85%_15%,currentColor,transparent_35%)]"/>
              <span className="relative flex items-start justify-between"><span className={`grid h-8 w-8 place-items-center rounded-full border ${accents[sample.accent]}`}>{analyzing ? <Loader2 size={14} className="animate-spin"/> : active ? <Check size={14}/> : <Play size={13} fill="currentColor"/>}</span><span className="text-[10px] uppercase tracking-[.16em] text-slate-500">{sample.duration}</span></span>
              <span className="relative mt-6 block text-sm font-semibold text-slate-100">{sample.title}</span><span className="relative mt-1 block text-[11px] text-slate-500">{analyzing ? "Running tracking + pitch projection…" : sample.subtitle}</span>
            </button>;
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-black/10 px-5 py-3 text-[11px] text-slate-500"><span className="flex items-center gap-2"><Sparkles size={13} className="text-emerald-300"/> Selecting a demo previews the raw MP4 immediately, then hydrates the radar from live analysis.</span>{error && <span className="text-orange-300">{error}</span>}</div>
      </motion.div>}</AnimatePresence>
    </section>
  );
}
