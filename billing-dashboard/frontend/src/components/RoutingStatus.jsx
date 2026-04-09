import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

const SERVICE_LABELS = { stt: "STT", tts: "TTS", llm: "LLM" };

const STATUS_CONFIG = {
  healthy: {
    dot:   "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Healthy",
  },
  fallback: {
    dot:   "bg-amber-400 animate-pulse",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Fallback",
  },
  outage: {
    dot:   "bg-red-400 animate-pulse",
    badge: "bg-red-50 text-red-600 ring-red-200",
    label: "Outage",
  },
};

function RouteRow({ service, route }) {
  const cfg = STATUS_CONFIG[route.status] ?? STATUS_CONFIG.healthy;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className={cn("inline-block h-2 w-2 rounded-full flex-shrink-0", cfg.dot)} />
        <span className="text-xs font-mono font-semibold text-slate-400 w-8">
          {SERVICE_LABELS[service]}
        </span>
        <span className="text-sm font-medium capitalize text-slate-700">
          {route.active}
        </span>
        {route.status === "fallback" && (
          <span className="text-xs text-slate-400">
            (primary: <span className="text-slate-500 capitalize">{route.primary}</span>)
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {route.fallback && (
          <span className="text-xs capitalize text-slate-400">
            fallback: {route.fallback}
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
            cfg.badge
          )}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

export default function RoutingStatus({ routing }) {
  if (!routing) return null;

  const hasIssue = Object.values(routing).some(
    (r) => r.status === "fallback" || r.status === "outage"
  );

  return (
    <Card className={cn(hasIssue && "ring-1 ring-amber-200")}>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-sm">
          Provider Routing
          {hasIssue && (
            <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              Failover Active
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {Object.entries(routing).map(([service, route]) => (
          <RouteRow key={service} service={service} route={route} />
        ))}
        <p className="mt-3 text-xs text-slate-400">
          Switches automatically when credits &lt; threshold or provider fails
        </p>
      </CardContent>
    </Card>
  );
}
