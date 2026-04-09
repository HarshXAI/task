import { useEffect, useRef, useState } from "react";
import HeroPage from "./components/HeroPage";
import ProviderInsightCard from "./components/ProviderInsightCard";
import UsageTrendChart from "./components/UsageTrendChart";
import UsageBreakdownChart from "./components/UsageBreakdownChart";
import CostSummaryBar from "./components/CostSummaryBar";
import CreditThresholdSlider from "./components/CreditThresholdSlider";
import RoutingStatus from "./components/RoutingStatus";
import { Badge } from "./components/ui/badge";
import { Mic, ArrowLeft, Settings } from "lucide-react";

const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/live`
    : "ws://localhost:8000/ws/live";

const PROVIDERS = ["deepgram", "groq", "elevenlabs"];
const PROVIDER_SET = new Set(PROVIDERS);

function timeAgo(iso) {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function App() {
  const [view, setView] = useState("hero"); // "hero" | "dashboard"
  const [snapshots, setSnapshots] = useState([]);
  const [history, setHistory] = useState([]);
  const [insights, setInsights] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [routing, setRouting] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [freshness, setFreshness] = useState(null);
  const [threshold, setThreshold] = useState(50);
  const [showSettings, setShowSettings] = useState(false);
  const wsRef = useRef(null);

  // Initial data fetch
  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        setSnapshots(data.snapshots ?? []);
        setHistory(data.history ?? []);
        setLastUpdated(data.last_updated);
      })
      .catch(console.error);

    fetch("/api/usage/insights")
      .then((r) => r.json())
      .then((data) => {
        setInsights(data.providers ?? []);
        if (data.last_updated) setLastUpdated(data.last_updated);
      })
      .catch(console.error);

    fetch("/api/routing")
      .then((r) => r.json())
      .then(setRouting)
      .catch(console.error);

    fetch("/api/settings/threshold")
      .then((r) => r.json())
      .then((data) => setThreshold(data.threshold))
      .catch(console.error);
  }, []);

  // Freshness timer
  useEffect(() => {
    const tick = () => setFreshness(timeAgo(lastUpdated));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // WebSocket live updates
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setSnapshots(data.snapshots ?? []);
          setLastUpdated(data.last_updated);
          if (data.routing) setRouting(data.routing);
          if (data.insights?.providers) setInsights(data.insights.providers);
        } catch {
          // ignore parse errors
        }
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const getInsight = (provider) =>
    insights.find((i) => i.provider === provider) ?? null;

  const hasFailover =
    routing &&
    Object.values(routing).some(
      (r) => r.status === "fallback" || r.status === "outage",
    );

  // ── Hero view ──────────────────────────────────────────────────────────────
  if (view === "hero") {
    return (
      <HeroPage
        onEnterDashboard={() => setView("dashboard")}
        routing={routing}
      />
    );
  }

  // ── Dashboard view ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView("hero")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:text-slate-700 hover:border-slate-300 shadow-sm"
              title="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center shadow-sm">
                <Mic className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800 leading-tight">
                  AI Billing Dashboard
                </h1>
                <p className="text-xs text-slate-400">Adam&apos;s AI &mdash; Usage &amp; Credits</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {freshness && (
              <span className="text-xs text-slate-400">Updated {freshness}</span>
            )}
            {hasFailover && (
              <Badge
                variant="warning"
                className="bg-amber-50 text-amber-700 ring-1 ring-amber-200 border-amber-200"
              >
                Failover Active
              </Badge>
            )}
            <Badge
              variant={wsConnected ? "success" : "default"}
            >
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full ${
                  wsConnected ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              {wsConnected ? "Live" : "Offline"}
            </Badge>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shadow-sm ${
                showSettings
                  ? "border-blue-300 bg-blue-50 text-blue-500"
                  : "border-slate-200 bg-white text-slate-400 hover:text-slate-700"
              }`}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Settings panel (collapsible) */}
        {showSettings && (
          <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
            <CreditThresholdSlider
              currentThreshold={threshold}
              onThresholdChange={setThreshold}
            />
          </div>
        )}

        {/* Insight cards */}
        <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
          {PROVIDERS.map((p) => (
            <ProviderInsightCard key={p} insight={getInsight(p)} />
          ))}
        </div>

        {/* Cost summary bar */}
        {insights.length > 0 && (
          <div className="mb-4">
            <CostSummaryBar
              insights={insights.filter((i) => PROVIDER_SET.has(i.provider))}
            />
          </div>
        )}

        {/* Charts + Routing */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 auto-rows-[minmax(160px,_auto)]">
          <div className="md:col-span-4">
            <UsageTrendChart
              history={history.filter((h) => PROVIDER_SET.has(h.provider))}
            />
          </div>
          <div className="md:col-span-2">
            <UsageBreakdownChart
              snapshots={snapshots.filter((s) => PROVIDER_SET.has(s.provider))}
            />
          </div>
          <div className="md:col-span-6">
            <RoutingStatus routing={routing} />
          </div>
        </div>
      </div>
    </div>
  );
}
