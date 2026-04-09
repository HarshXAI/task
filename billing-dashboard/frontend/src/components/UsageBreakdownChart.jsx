import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
} from "./ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";

const PROVIDER_LABELS = {
  deepgram:   "Deepgram",
  groq:       "Groq",
  elevenlabs: "ElevenLabs",
};

const PROVIDER_UNITS = {
  deepgram:   "req",
  groq:       "tokens",
  elevenlabs: "chars",
};

const chartConfig = {
  deepgram:   { label: "Deepgram",   color: "hsl(var(--chart-1))" },
  groq:       { label: "Groq",       color: "hsl(var(--chart-2))" },
  elevenlabs: { label: "ElevenLabs", color: "hsl(var(--chart-3))" },
};

export default function UsageBreakdownChart({ snapshots }) {
  const valid = (snapshots ?? []).filter(
    (s) => s.credits_used != null && s.credits_used > 0
  );

  const totalUsed = valid.reduce((sum, s) => sum + parseFloat(s.credits_used), 0);

  const dataPoint = { name: "usage" };
  for (const s of valid) {
    dataPoint[s.provider] = parseFloat(s.credits_used);
  }
  const chartData = [dataPoint];

  if (valid.length === 0) {
    return (
      <Card className="h-full min-h-[220px]">
        <CardHeader>
          <CardTitle>Usage Breakdown</CardTitle>
          <CardDescription>Credits consumed per provider</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-sm text-slate-400">No usage data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Usage Breakdown</CardTitle>
        <CardDescription>Credits consumed per provider</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[240px]">
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={70}
            outerRadius={110}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-slate-100 last:fill-slate-50"
            />
            {valid.map((s) => (
              <RadialBar
                key={s.provider}
                dataKey={s.provider}
                fill={`var(--color-${s.provider})`}
                stackId="a"
                cornerRadius={4}
                className="stroke-transparent stroke-2"
              />
            ))}
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs min-w-[150px]">
                    {payload.map((p) => {
                      const name = p.name ?? p.dataKey;
                      const unit = PROVIDER_UNITS[name] ?? "";
                      const label = PROVIDER_LABELS[name] ?? name;
                      return (
                        <div key={name} className="flex items-center justify-between gap-4 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: p.fill }} />
                            <span className="text-slate-600">{label}</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-800 tabular-nums">
                            {Number(p.value).toLocaleString()}
                            <span className="text-slate-400 font-normal ml-1">{unit}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null;
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 14}
                        className="fill-slate-700 text-2xl font-bold tabular-nums"
                      >
                        {totalUsed >= 1000
                          ? `${(totalUsed / 1000).toFixed(1)}k`
                          : Math.round(totalUsed).toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 6}
                        className="fill-slate-400 text-xs"
                      >
                        total used
                      </tspan>
                    </text>
                  );
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <div className="flex justify-center gap-4 pb-4">
        {valid.map((s) => (
          <div key={s.provider} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: chartConfig[s.provider]?.color }}
            />
            <span className="text-xs text-slate-500">
              {PROVIDER_LABELS[s.provider] ?? s.provider}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
