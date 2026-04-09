import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const PROVIDER_COLORS = {
  deepgram: "#3b82f6",   // blue
  groq: "#f97316",       // orange
  elevenlabs: "#8b5cf6", // violet
};

const PROVIDERS = ["deepgram", "groq", "elevenlabs"];

function buildChartData(history) {
  const byTime = {};
  for (const snap of history) {
    const t = new Date(snap.captured_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!byTime[t]) byTime[t] = { time: t };
    byTime[t][snap.provider] = snap.credits_remaining;
  }
  return Object.values(byTime);
}

export default function UsageLineChart({ history }) {
  const data = buildChartData(history ?? []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Credits Remaining — Last 24h</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
              labelStyle={{ color: "#cbd5e1" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
            {PROVIDERS.map((p) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={PROVIDER_COLORS[p]}
                strokeWidth={2.2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
