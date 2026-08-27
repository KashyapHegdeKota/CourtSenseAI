export interface SampleMatch {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  videoUrl: string;
  fileName: string;
  accent: "emerald" | "cyan" | "orange";
  quickSearches: string[];
}

export const SAMPLE_MATCHES: SampleMatch[] = [
  {
    id: "corner-setup",
    title: "Corner Setup",
    subtitle: "Set-piece shape and box occupation",
    duration: "6 sec",
    videoUrl: "/sample-matches/corner-setup.mp4",
    fileName: "corner-setup.mp4",
    accent: "emerald",
    quickSearches: ["corner kick", "near-post run", "players inside penalty area"],
  },
  {
    id: "touchline-tackle",
    title: "Touchline Duel",
    subtitle: "Wide-area pressure and recovery",
    duration: "6 sec",
    videoUrl: "/sample-matches/touchline-tackle.mp4",
    fileName: "touchline-tackle.mp4",
    accent: "cyan",
    quickSearches: ["tackle", "tackle near touchline", "counter attack down flank"],
  },
  {
    id: "goalkeeper-save",
    title: "Goalkeeper Action",
    subtitle: "Final-third pressure and shot response",
    duration: "6 sec",
    videoUrl: "/sample-matches/goalkeeper-save.mp4",
    fileName: "goalkeeper-save.mp4",
    accent: "orange",
    quickSearches: ["goalkeeper save", "shot on goal", "defensive recovery"],
  },
];
