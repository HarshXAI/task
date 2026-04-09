import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";

const PROVIDER_CONFIG = {
  deepgram:   { label: "Deepgram",   color: "bg-blue-300",   text: "text-blue-600"   },
  groq:       { label: "Groq",       color: "bg-orange-300", text: "text-orange-600" },
  elevenlabs: { label: "ElevenLabs", color: "bg-violet-300", text: "text-violet-600" },
};

const UNIT_FMT = {
  USD:        (v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
  tokens:     (v) => `${Number(v).toLocaleString()} tokens`,
  characters: (v) => `${Number(v).toLocaleString()} chars`,
};

export default function CostSummaryBar({ insights }) {
  if (!insights || insights.length === 0) return null;

  const segments = insights
    .filter((i) => i.credits_used != null && i.credits_used > 0)
    .map((i) => ({
      provider: i.provider,
      value: i.credits_used,
      unit: i.unit,
      config: PROVIDER_CONFIG[i.provider] ?? {
        label: i.provider,
        color: "bg-slate-300",
        text: "text-slate-600",
      },
    }));

  const totalForBar = segments.reduce((s, seg) => s + seg.value, 0);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-slate-500 shrink-0">Usage Summary</span>
          <div className="flex items-center gap-4 flex-wrap justify-end">
            {insights.map((i) => {
              const cfg = PROVIDER_CONFIG[i.provider];
              const fmt = UNIT_FMT[i.unit] ?? ((v) => Number(v).toLocaleString());
              const hasValue = i.credits_used != null;
              return (
                <div key={i.provider} className="flex items-center gap-1.5">
                  <div className={cn("h-2 w-2 rounded-full", cfg?.color ?? "bg-slate-300")} />
                  <span className={cn("text-xs font-medium", cfg?.text ?? "text-slate-600")}>
                    {cfg?.label ?? i.provider}
                  </span>
                  <span className="text-xs text-slate-400">
                    {hasValue ? fmt(i.credits_used) : "\u2014"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stacked bar */}
        {segments.length > 0 && (
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
            {segments.map((seg) => (
              <div
                key={seg.provider}
                className={cn("h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full", seg.config.color)}
                style={{
                  width: `${Math.max((seg.value / totalForBar) * 100, 2)}%`,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
