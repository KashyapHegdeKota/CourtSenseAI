export interface SampleMatch {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  rawUrl: string;
  annotatedUrl: string;
  telemetryUrl: string;
  accent: "emerald" | "cyan" | "orange";
  quickSearches: string[];
}

export const SAMPLE_MATCHES: SampleMatch[] = [
  {
    id: "corner-setup",
    title: "Corner Setup & Cross",
    subtitle: "Set-piece shape and box occupation",
    duration: "6 sec",
    rawUrl: "https://api.courtsense.kashyaphegde.com/static/videos/corner-setup.mp4",
    annotatedUrl: "https://api.courtsense.kashyaphegde.com/static/videos/annotated_corner-setup.mp4",
    telemetryUrl: "https://api.courtsense.kashyaphegde.com/static/videos/telemetry_corner-setup.mp4.json",
    accent: "emerald",
    quickSearches: ["corner kick", "near-post run", "players inside penalty area"],
  },
  {
    id: "touchline-tackle",
    title: "Touchline Tackle",
    subtitle: "Wide-area pressure and recovery",
    duration: "6 sec",
    rawUrl: "https://api.courtsense.kashyaphegde.com/static/videos/touchline-tackle.mp4",
    annotatedUrl: "https://api.courtsense.kashyaphegde.com/static/videos/annotated_touchline-tackle.mp4",
    telemetryUrl: "https://api.courtsense.kashyaphegde.com/static/videos/telemetry_touchline-tackle.mp4.json",
    accent: "cyan",
    quickSearches: ["tackle", "tackle near touchline", "counter attack down flank"],
  },
  {
    id: "goalkeeper-save",
    title: "Goalkeeper Save",
    subtitle: "Final-third pressure and shot response",
    duration: "6 sec",
    rawUrl: "https://api.courtsense.kashyaphegde.com/static/videos/goalkeeper-save.mp4",
    annotatedUrl: "https://api.courtsense.kashyaphegde.com/static/videos/annotated_goalkeeper-save.mp4",
    telemetryUrl: "https://api.courtsense.kashyaphegde.com/static/videos/telemetry_goalkeeper-save.mp4.json",
    accent: "orange",
    quickSearches: ["goalkeeper save", "shot on goal", "defensive recovery"],
  },
];
