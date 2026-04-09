import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const PROVIDER_COLORS = {
  deepgram: "#3b82f6",   // blue
  groq: "#f97316",       // orange
  elevenlabs: "#8b5cf6", // violet
};

const PROVIDER_LABELS = {
  deepgram: "Deepgram",
  groq: "Groq",
  elevenlabs: "ElevenLabs",
};

export default function ProviderDonut({ snapshots }) {
  const data = (snapshots ?? [])
    .filter((s) => s.credits_used != null && s.credits_used > 0)
    .map((s) => ({
      name: PROVIDER_LABELS[s.provider] ?? s.provider,
      value: parseFloat(s.credits_used),
      provider: s.provider,
    }));

  if (data.length === 0) {
    return (
      <Card className="h-full min-h-[220px]">
        <CardHeader>
          <CardTitle>Usage Breakdown by Provider</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-slate-500 text-sm">No usage data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Usage Breakdown by Provider</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={112}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.provider}
                  fill={PROVIDER_COLORS[entry.provider] ?? "#6b7280"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
              formatter={(val) => Number(val).toLocaleString()}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
