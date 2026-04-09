import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

const PROVIDER_CONFIG = {
  deepgram: {
    label: "Deepgram",
    accent: "text-blue-500",
    accentValue: "text-blue-600",
    gradient: "from-blue-300/50 to-blue-300/0",
    progressBar: "bg-blue-300",
    unitBadge: "bg-blue-50 text-blue-500 ring-blue-100",
    unitPrefix: "$",
  },
  groq: {
    label: "Groq",
    accent: "text-orange-500",
    accentValue: "text-orange-600",
    gradient: "from-orange-300/50 to-orange-300/0",
    progressBar: "bg-orange-300",
    unitBadge: "bg-orange-50 text-orange-500 ring-orange-100",
    unitPrefix: "",
  },
  elevenlabs: {
    label: "ElevenLabs",
    accent: "text-violet-500",
    accentValue: "text-violet-600",
    gradient: "from-violet-300/50 to-violet-300/0",
    progressBar: "bg-violet-300",
    unitBadge: "bg-violet-50 text-violet-500 ring-violet-100",
    unitPrefix: "",
  },
};

const UNIT_LABELS = {
  USD: "USD",
  tokens: "Tokens",
  characters: "Characters",
};

const TREND_CONFIG = {
  increasing: { icon: TrendingUp,   label: "Usage trending up",   color: "text-amber-500" },
  decreasing: { icon: TrendingDown, label: "Usage trending down", color: "text-emerald-500" },
  stable:     { icon: Minus,        label: "Usage stable",        color: "text-slate-400" },
  unknown:    { icon: Minus,        label: "Awaiting data",       color: "text-slate-300" },
};

function formatNumber(val, unit) {
  if (val == null) return "\u2014";
  const num = Number(val);
  if (unit === "USD") {
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatRunway(hours) {
  if (hours == null || hours <= 0) return null;
  if (hours < 1) return `~${Math.round(hours * 60)}m`;
  if (hours < 48) return `~${Math.round(hours)}h`;
  const days = hours / 24;
  if (days > 365) return ">1y";
  if (days > 90) return `~${Math.round(days / 30)}mo`;
  return `~${Math.round(days)}d`;
}

function formatRate(rate, unit) {
  if (rate == null || rate <= 0) return null;
  const num = Number(rate);
  if (unit === "USD") return `$${num.toFixed(2)}/hr`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k/hr`;
  return `${num.toFixed(0)}/hr`;
}

function timeAgo(iso) {
  if (!iso) return "\u2014";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ProviderInsightCard({ insight }) {
  if (!insight) return null;

  const cfg = PROVIDER_CONFIG[insight.provider] ?? {
    label: insight.provider,
    accent: "text-slate-500",
    accentValue: "text-slate-600",
    gradient: "from-slate-300/50 to-slate-300/0",
    progressBar: "bg-slate-300",
    unitBadge: "bg-slate-100 text-slate-500 ring-slate-200",
    unitPrefix: "",
  };

  const trendCfg = TREND_CONFIG[insight.trend] ?? TREND_CONFIG.unknown;
  const TrendIcon = trendCfg.icon;
  const hasRemaining = insight.credits_remaining != null;
  const hasUsed = insight.credits_used != null;
  const hasData = hasRemaining || hasUsed;
  const isFreeTier = !hasRemaining && insight.unit === "tokens";
  const runway = formatRunway(insight.runway_hours);
  const rate = formatRate(insight.depletion_rate_per_hour, insight.unit);

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        insight.threshold_warning && "ring-1 ring-amber-300"
      )}
    >
      {/* Top gradient bar */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r",
          hasData ? cfg.gradient : "from-slate-200/60 to-slate-200/10"
        )}
      />

      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              "text-xs uppercase tracking-[0.18em]",
              hasData ? cfg.accent : "text-slate-400"
            )}
          >
            {cfg.label}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {insight.threshold_warning && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            )}
            {isFreeTier ? (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-500 ring-1 ring-orange-100">
                Free Tier
              </span>
            ) : (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium ring-1", cfg.unitBadge)}>
                {UNIT_LABELS[insight.unit] ?? insight.unit}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {hasData ? (
          <div className="space-y-3">
            {/* Primary metrics row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">
                  {hasRemaining ? "Remaining" : "Used"}
                </p>
                <p className={cn("text-2xl font-semibold tabular-nums", cfg.accentValue)}>
                  {hasRemaining
                    ? formatNumber(insight.credits_remaining, insight.unit)
                    : formatNumber(insight.credits_used, insight.unit)}
                </p>
              </div>
              <div>
                {runway ? (
                  <>
                    <p className="text-xs text-slate-400">Runway</p>
                    <p className={cn("text-2xl font-semibold tabular-nums", cfg.accentValue)}>
                      {runway}
                    </p>
                    {rate && (
                      <p className="text-xs text-slate-400 mt-0.5">at {rate}</p>
                    )}
                  </>
                ) : hasUsed && hasRemaining ? (
                  <>
                    <p className="text-xs text-slate-400">Used</p>
                    <p className={cn("text-2xl font-semibold tabular-nums", cfg.accentValue)}>
                      {formatNumber(insight.credits_used, insight.unit)}
                    </p>
                  </>
                ) : hasUsed && !hasRemaining ? (
                  <>
                    <p className="text-xs text-slate-400">Today</p>
                    <p className={cn("text-lg font-semibold tabular-nums text-slate-600")}>
                      {formatNumber(insight.credits_used, insight.unit)}
                    </p>
                  </>
                ) : null}
              </div>
            </div>

            {/* Progress bar */}
            {insight.usage_pct != null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{insight.usage_pct.toFixed(1)}% used</span>
                  <span>{(100 - insight.usage_pct).toFixed(1)}% remaining</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", cfg.progressBar)}
                    style={{ width: `${Math.min(insight.usage_pct, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer: trend + last updated */}
            <div className="flex items-center justify-between pt-1">
              <div className={cn("flex items-center gap-1 text-xs", trendCfg.color)}>
                <TrendIcon className="h-3 w-3" />
                <span>{trendCfg.label}</span>
              </div>
              <span className="text-[10px] text-slate-300">
                {timeAgo(insight.last_captured)}
              </span>
            </div>
          </div>
        ) : (
          <p className="py-4 text-sm text-slate-400">No data available</p>
        )}
      </CardContent>
    </Card>
  );
}
