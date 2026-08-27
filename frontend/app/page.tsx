import type { Metadata } from "next";
import { CourtSenseShell } from "../components/studio/CourtSenseShell";

export const metadata: Metadata = {
  title: "CourtSense AI | Tactical intelligence",
  description: "AI-powered soccer tracking and tactical telemetry.",
};

export default function Home() {
  return <CourtSenseShell />;
}
