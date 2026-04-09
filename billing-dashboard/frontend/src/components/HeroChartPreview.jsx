import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, Bar, BarChart } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";

// ── Mock data — simulates a real STT/LLM/TTS billing history ─────────────────
function generateMockHistory(days) {
  const data = [];
  const now = new Date("2024-06-30");
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    data.push({
      date: label,
      deepgram: Math.round(190 + Math.random() * 20 - i * 0.05),
      groq:     Math.round(30  + Math.random() * 15 + (days - i) * 0.3),
      elevenlabs: Math.round(9200 - (days - i) * 18 + Math.random() * 60),
    });
  }
  return data;
}

const ALL_DATA = generateMockHistory(90);

const areaConfig = {
  deepgram:   { label: "Deepgram (USD)",     color: "hsl(213, 80%, 68%)" },
  groq:       { label: "Groq (tokens)",      color: "hsl(30, 88%, 68%)"  },
  elevenlabs: { label: "ElevenLabs (chars)", color: "hsl(263, 58%, 72%)" },
};

const barConfig = {
  deepgram:   { label: "Deepgram",   color: "hsl(213, 80%, 68%)" },
  groq:       { label: "Groq",       color: "hsl(30, 88%, 68%)"  },
  elevenlabs: { label: "ElevenLabs", color: "hsl(263, 58%, 72%)" },
};

// ── Interactive Area Chart ────────────────────────────────────────────────────
function InteractiveAreaChart() {
  const [timeRange, setTimeRange] = React.useState("30d");

  const days = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7;
  const filtered = ALL_DATA.slice(-days);

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b border-slate-100 py-4 sm:flex-row px-5">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Credits &amp; Usage Over Time
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            All three providers — live updates every 5 min
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="hidden w-[130px] h-7 text-xs rounded-lg sm:flex">
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d">Last 3 months</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-4 sm:pt-4">
        <ChartContainer config={areaConfig} className="aspect-auto h-[200px] w-full">
          <AreaChart data={filtered}>
            <defs>
              {["deepgram", "groq", "elevenlabs"].map((p) => (
                <linearGradient key={p} id={`fill-hero-${p}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={`var(--color-${p})`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`var(--color-${p})`} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(100,116,139,0.1)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(v) => v}
                />
              }
            />
            <Area dataKey="elevenlabs" type="natural" fill="url(#fill-hero-elevenlabs)" stroke="var(--color-elevenlabs)" strokeWidth={2} stackId="a" />
            <Area dataKey="deepgram"   type="natural" fill="url(#fill-hero-deepgram)"   stroke="var(--color-deepgram)"   strokeWidth={2} stackId="a" />
            <Area dataKey="groq"       type="natural" fill="url(#fill-hero-groq)"       stroke="var(--color-groq)"       strokeWidth={2} stackId="a" />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ── Stacked Bar (last 7 days) ─────────────────────────────────────────────────
function ProviderBarChart() {
  const data = ALL_DATA.slice(-7).map((d) => ({
    date: d.date,
    deepgram: Math.round(d.deepgram * 0.4),
    groq: d.groq,
    elevenlabs: Math.round(d.elevenlabs / 200),
  }));

  return (
    <Card>
      <CardHeader className="pb-2 px-5">
        <CardTitle className="text-sm font-semibold text-slate-700">Daily Usage — Last 7d</CardTitle>
        <CardDescription className="text-xs text-slate-400">Stacked per provider</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-0 sm:px-4">
        <ChartContainer config={barConfig} className="h-[160px] w-full">
          <BarChart data={data} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(100,116,139,0.1)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="deepgram"   stackId="a" fill="var(--color-deepgram)"   radius={[0, 0, 3, 3]} />
            <Bar dataKey="groq"       stackId="a" fill="var(--color-groq)"       radius={[0, 0, 0, 0]} />
            <Bar dataKey="elevenlabs" stackId="a" fill="var(--color-elevenlabs)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ── Stat pills ────────────────────────────────────────────────────────────────
const STATS = [
  { label: "Deepgram",   value: "$199.99", sub: "remaining",   color: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-100" },
  { label: "ElevenLabs", value: "9,403",   sub: "chars left",  color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-100" },
  { label: "Groq",       value: "37",      sub: "tokens today",color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" },
  { label: "Runway",     value: "~5d",     sub: "ElevenLabs",  color: "text-emerald-500",bg: "bg-emerald-50",border: "border-emerald-100" },
];

export default function HeroChartPreview() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-16">
      {/* Section label */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
          Live Dashboard Preview
        </p>
        <h2 className="text-2xl font-bold text-slate-800">Everything in one view</h2>
        <p className="text-sm text-slate-400 mt-2">
          Real API data, refreshed every 5 minutes via Celery workers
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3`}
          >
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className={`text-xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <InteractiveAreaChart />
        </div>
        <div className="md:col-span-1">
          <ProviderBarChart />
        </div>
      </div>
    </div>
  );
}
