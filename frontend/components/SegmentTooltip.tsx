"use client";

interface SegmentTooltipProps {
  x: number;
  y: number;
  heatScore: number;
  floodScore: number;
  canopyPct: number;
  visible: boolean;
}

function heatColor(v: number) {
  if (v <= 40) return "text-green-400";
  if (v <= 70) return "text-orange-400";
  return "text-red-400";
}
function canopyColor(v: number) {
  if (v >= 30) return "text-green-400";
  if (v >= 15) return "text-orange-400";
  return "text-red-400";
}

export default function SegmentTooltip({
  x,
  y,
  heatScore,
  floodScore,
  canopyPct,
  visible,
}: SegmentTooltipProps) {
  return (
    <div
      style={{
        left: x + 12,
        top: y + 12,
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
      }}
      className="fixed bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-sm z-50 transition-opacity"
    >
      <div className="flex justify-between gap-6">
        <span className="text-slate-400">Heat</span>
        <span className={`font-mono ${heatColor(heatScore)}`}>
          {heatScore.toFixed(0)}/100
        </span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-slate-400">Flood</span>
        <span className={`font-mono ${heatColor(floodScore)}`}>
          {floodScore.toFixed(0)}/100
        </span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-slate-400">Canopy</span>
        <span className={`font-mono ${canopyColor(canopyPct)}`}>
          {canopyPct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
