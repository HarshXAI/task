import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

const PROVIDER_COLORS = {
  deepgram: {
    ring: "from-blue-500/60 to-blue-500/10",
    text: "text-blue-300",
    value: "text-blue-200",
  },
  groq: {
    ring: "from-orange-500/60 to-orange-500/10",
    text: "text-orange-300",
    value: "text-orange-200",
  },
  elevenlabs: {
    ring: "from-violet-500/60 to-violet-500/10",
    text: "text-violet-300",
    value: "text-violet-200",
  },
};

const PROVIDER_LABELS = {
  deepgram: "Deepgram",
  groq: "Groq",
  elevenlabs: "ElevenLabs",
};

export default function CreditCard({ provider, creditsRemaining, creditsUsed, lastUpdated }) {
  const color = PROVIDER_COLORS[provider] ?? {
    ring: "from-slate-500/60 to-slate-500/10",
    text: "text-slate-300",
    value: "text-slate-200",
  };
  const label = PROVIDER_LABELS[provider] ?? provider;

  const hasData = creditsRemaining != null || creditsUsed != null;

  const fmt = (val) =>
    val == null ? "—" : Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r",
          hasData ? color.ring : "from-slate-700/60 to-slate-700/10"
        )}
      />
      <CardHeader className="pb-1">
        <CardTitle
          className={cn(
            "text-xs uppercase tracking-[0.18em]",
            hasData ? color.text : "text-slate-500"
          )}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Remaining</p>
                <p className={cn("text-2xl font-semibold tabular-nums", color.value)}>
                  {fmt(creditsRemaining)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Used</p>
                <p className={cn("text-2xl font-semibold tabular-nums", color.value)}>
                  {fmt(creditsUsed)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Updated {fmtTime(lastUpdated)}</p>
          </>
        ) : (
          <p className="py-4 text-sm text-slate-500">No data available</p>
        )}
      </CardContent>
    </Card>
  );
}
