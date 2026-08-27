"use client";

import { useEffect, useRef } from "react";
import type { PlayerTelemetry, Telemetry } from "../../lib/types";

export type RadarToggles = { hulls: boolean; ids: boolean; vectors: boolean; heatmap: boolean };
type Props = { telemetry?: Telemetry; currentTime?: number; toggles?: RadarToggles; className?: string };

const fallback: PlayerTelemetry[] = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1, team: i < 7 ? "A" : "B", x: 12 + ((i * 17) % 80), y: 8 + ((i * 23) % 54),
  speed_kmh: 8 + ((i * 7) % 24), distance_m: 4200 + i * 183,
}));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function convexHull(points: PlayerTelemetry[]) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: PlayerTelemetry, a: PlayerTelemetry, b: PlayerTelemetry) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (items: PlayerTelemetry[]) => {
    const result: PlayerTelemetry[] = [];
    for (const point of items) {
      while (result.length > 1 && cross(result.at(-2)!, result.at(-1)!, point) <= 0) result.pop();
      result.push(point);
    }
    return result;
  };
  return half(sorted).slice(0, -1).concat(half([...sorted].reverse()).slice(0, -1));
}

function polygonArea(points: PlayerTelemetry[]) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2);
}
function centroid(points: PlayerTelemetry[]) {
  const count = Math.max(points.length, 1);
  return { x: points.reduce((sum, point) => sum + point.x, 0) / count, y: points.reduce((sum, point) => sum + point.y, 0) / count };
}
function playersAt(telemetry: Telemetry | undefined, time: number) {
  const frames = telemetry?.frames;
  if (!frames?.length) {
    const base = telemetry?.players?.length ? telemetry.players : fallback;
    return base.map((player) => ({ ...player,
      x: clamp(player.x + Math.sin(time / 3 + Number(player.id)) * .35, 0, 105),
      y: clamp(player.y + Math.cos(time / 3 + Number(player.id)) * .2, 0, 68),
    }));
  }
  const fps = telemetry?.fps ?? 25;
  const currentFrame = Math.floor(time * fps);
  return frames.find((frame) => frame.frame === currentFrame)?.players ?? [];
}

export function PitchRadar({ telemetry, currentTime = 0, toggles = { hulls: true, ids: true, vectors: false, heatmap: false }, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(currentTime);

  useEffect(() => { timeRef.current = currentTime; }, [currentTime]);

  useEffect(() => {
    const canvas = canvasRef.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let animationFrame = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, width = canvas.clientWidth, height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width, height);
      const padding = 10, fieldWidth = width - padding * 2, fieldHeight = fieldWidth * 68 / 105;
      const top = Math.max(padding, (height - fieldHeight) / 2), sx = fieldWidth / 105, sy = fieldHeight / 68;
      const x = (value: number) => padding + value * sx, y = (value: number) => top + value * sy;
      const players = playersAt(telemetry, timeRef.current);

      context.fillStyle = "#092b25"; context.fillRect(padding, top, fieldWidth, fieldHeight);
      context.strokeStyle = "rgba(167,243,208,.48)"; context.lineWidth = 1; context.strokeRect(padding, top, fieldWidth, fieldHeight);
      context.beginPath(); context.moveTo(x(52.5), y(0)); context.lineTo(x(52.5), y(68)); context.stroke();
      context.beginPath(); context.arc(x(52.5), y(34), 9.15 * sx, 0, Math.PI * 2); context.stroke();
      context.beginPath(); context.arc(x(52.5), y(34), 1.3, 0, Math.PI * 2); context.fillStyle = "rgba(167,243,208,.7)"; context.fill();
      for (const rightSide of [false, true]) {
        context.strokeRect(x(rightSide ? 88.5 : 0), y(13.84), 16.5 * sx, 40.32 * sy);
        context.strokeRect(x(rightSide ? 99.2 : 0), y(24.84), 5.8 * sx, 18.32 * sy);
      }
      if (toggles.heatmap) for (const player of players) {
        const radius = Math.max(18, player.speed_kmh * 1.3);
        const gradient = context.createRadialGradient(x(player.x), y(player.y), 1, x(player.x), y(player.y), radius);
        gradient.addColorStop(0, player.team === "A" ? "rgba(52,211,153,.23)" : "rgba(251,146,60,.22)"); gradient.addColorStop(1, "transparent");
        context.fillStyle = gradient; context.fillRect(x(player.x) - radius, y(player.y) - radius, radius * 2, radius * 2);
      }

      const centroids: Array<{ x: number; y: number }> = [];
      for (const team of ["A", "B"]) {
        const group = players.filter((player) => player.team === team), shape = convexHull(group), color = team === "A" ? "#34d399" : "#fb923c";
        const center = centroid(group); centroids.push(center);
        if (toggles.hulls && shape.length > 2) {
          context.beginPath(); shape.forEach((point, index) => index ? context.lineTo(x(point.x), y(point.y)) : context.moveTo(x(point.x), y(point.y))); context.closePath();
          context.fillStyle = team === "A" ? "rgba(52,211,153,.12)" : "rgba(251,146,60,.10)"; context.fill(); context.strokeStyle = color; context.stroke();
          context.fillStyle = color; context.font = "600 9px ui-monospace"; context.fillText(`${team} · ${Math.round(polygonArea(shape)).toLocaleString()} m²`, x(center.x) + 7, y(center.y) - 8);
        }
        context.beginPath(); context.arc(x(center.x), y(center.y), 3, 0, Math.PI * 2); context.fillStyle = color; context.fill();
        group.forEach((player) => {
          const px = x(clamp(player.x, 0, 105)), py = y(clamp(player.y, 0, 68));
          context.beginPath(); context.arc(px, py, 5, 0, Math.PI * 2); context.fillStyle = color; context.shadowColor = color; context.shadowBlur = 10; context.fill(); context.shadowBlur = 0;
          if (toggles.vectors) { const dx = player.vx ?? player.speed_kmh / 4, dy = player.vy ?? -(player.speed_kmh % 6) / 3; context.strokeStyle = color; context.beginPath(); context.moveTo(px, py); context.lineTo(px + dx * sx, py + dy * sy); context.stroke(); }
          if (toggles.ids) { context.fillStyle = "#f8fafc"; context.font = "10px ui-monospace"; context.fillText(`${player.id} · ${player.speed_kmh.toFixed(0)}`, px + 7, py + 3); }
        });
      }
      if (toggles.vectors && centroids.length === 2) {
        context.save(); context.setLineDash([4, 4]); context.strokeStyle = "rgba(226,232,240,.7)"; context.beginPath();
        context.moveTo(x(centroids[0].x), y(centroids[0].y)); context.lineTo(x(centroids[1].x), y(centroids[1].y)); context.stroke(); context.restore();
      }
      animationFrame = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(animationFrame);
  }, [telemetry, toggles]);

  return <canvas ref={canvasRef} className={className ?? "h-full min-h-[280px] w-full"} aria-label="Live tactical pitch radar" />;
}
