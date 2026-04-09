import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "./ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";

const PROVIDER_UNITS  = { deepgram: "req", groq: "tokens", elevenlabs: "chars" };
const PROVIDER_LABELS = { deepgram: "Deepgram", groq: "Groq", elevenlabs: "ElevenLabs" };

const chartConfig = {
  deepgram:   { label: "Deepgram",   color: "hsl(var(--chart-1))" },
  groq:       { label: "Groq",       color: "hsl(var(--chart-2))" },
  elevenlabs: { label: "ElevenLabs", color: "hsl(var(--chart-3))" },
};

/**
 * Bucket snapshots into time slots.
 * Use credits_used (actual consumption) — take the LAST value per slot per provider.
 */
function buildBarData(history, bucketMinutes) {
  const bySlot = {};
  for (const snap of history) {
    if (snap.credits_used == null) continue;
    const d = new Date(snap.captured_at);
    const slotMs = Math.floor(d.getTime() / (bucketMinutes * 60000)) * (bucketMinutes * 60000);
    const label = new Date(slotMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!bySlot[slotMs]) bySlot[slotMs] = { time: label, _ms: slotMs };
    bySlot[slotMs][snap.provider] = parseFloat(snap.credits_used);
  }
  return Object.values(bySlot)
    .sort((a, b) => a._ms - b._ms)
    .map(({ _ms, ...rest }) => rest);
}

// Clean light-theme tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && p.value > 0);
  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs min-w-[160px]">
      <p className="text-slate-500 font-medium mb-1.5">{label}</p>
      {rows.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-[2px] shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-slate-600">{PROVIDER_LABELS[p.dataKey] ?? p.dataKey}</span>
          </div>
          <span className="font-mono font-semibold text-slate-800 tabular-nums">
            {Number(p.value).toLocaleString()}
            <span className="text-slate-400 font-normal ml-1">
              {PROVIDER_UNITS[p.dataKey] ?? ""}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function UsageTrendChart({ history }) {
  const [range, setRange] = React.useState("24h");

  const now = Date.now();
  const rangeMs = { "6h": 6, "12h": 12, "24h": 24 }[range] * 3600000;
  const filtered = (history ?? []).filter(
    (h) => now - new Date(h.captured_at).getTime() <= rangeMs
  );
  const bucketMinutes = range === "6h" ? 15 : range === "12h" ? 30 : 60;
  const data = buildBarData(filtered, bucketMinutes);

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Usage by Provider</CardTitle>
          <CardDescription>Credits &amp; tokens consumed per time slot</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center">
          <p className="text-sm text-slate-400">Waiting for data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full pt-0">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b border-slate-100 py-4 px-5">
        <div className="flex-1">
          <CardTitle>Usage by Provider</CardTitle>
          <CardDescription className="mt-0.5">
            Actual consumption per time slot — req / tokens / chars
          </CardDescription>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[120px] h-8 text-xs" aria-label="Select range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="6h">Last 6h</SelectItem>
            <SelectItem value="12h">Last 12h</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-4 sm:pt-4">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(100,116,139,0.1)" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              width={36}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(100,116,139,0.06)", radius: 4 }}
              content={<CustomTooltip />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="deepgram"   stackId="a" fill="var(--color-deepgram)"   radius={[0, 0, 3, 3]} maxBarSize={48} />
            <Bar dataKey="groq"       stackId="a" fill="var(--color-groq)"       radius={[0, 0, 0, 0]} maxBarSize={48} />
            <Bar dataKey="elevenlabs" stackId="a" fill="var(--color-elevenlabs)" radius={[3, 3, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
