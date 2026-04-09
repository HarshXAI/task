import { useState, useEffect } from "react";
import { Minus, Plus, AlertTriangle } from "lucide-react";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { cn } from "../lib/utils";

const MIN = 0;
const MAX = 1000;
const STEP = 10;

export default function CreditThresholdSlider({ currentThreshold, onThresholdChange }) {
  const [value, setValue] = useState([currentThreshold ?? 50]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentThreshold != null) {
      setValue([currentThreshold]);
    }
  }, [currentThreshold]);

  const decrease = () =>
    setValue((prev) => [Math.max(MIN, prev[0] - STEP)]);

  const increase = () =>
    setValue((prev) => [Math.min(MAX, prev[0] + STEP)]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/threshold", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold: value[0] }),
      });
      if (res.ok) {
        setSaved(true);
        onThresholdChange?.(value[0]);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error("Failed to save threshold:", e);
    } finally {
      setSaving(false);
    }
  };

  const hasChanged = value[0] !== (currentThreshold ?? 50);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Credit Alert Threshold
            </CardTitle>
            <CardDescription className="mt-1">
              Trigger failover warnings when credits drop below this value
            </CardDescription>
          </div>
          {hasChanged && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                saved
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-blue-50 text-blue-600 ring-1 ring-blue-200 hover:bg-blue-100",
              )}
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label className="tabular-nums text-lg font-semibold text-slate-700">
            {value[0]} credits
          </Label>
          <div className="flex items-center gap-4">
            <button
              onClick={decrease}
              disabled={value[0] <= MIN}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 shadow-sm"
            >
              <Minus className="h-4 w-4" />
            </button>
            <Slider
              className="grow"
              value={value}
              onValueChange={setValue}
              min={MIN}
              max={MAX}
              step={STEP}
              showTooltip
              tooltipContent={(v) => `${v} credits`}
            />
            <button
              onClick={increase}
              disabled={value[0] >= MAX}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 shadow-sm"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{MIN}</span>
            <span>Low risk</span>
            <span>Medium</span>
            <span>High alert</span>
            <span>{MAX}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
