import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

const PROVIDER_COLORS = {
  deepgram:   "text-blue-600   bg-blue-50   ring-blue-200",
  groq:       "text-orange-600 bg-orange-50 ring-orange-200",
  elevenlabs: "text-violet-600 bg-violet-50 ring-violet-200",
};

const STEP_LABELS = { stt: "STT", llm: "LLM", tts: "TTS" };

function ProviderBadge({ provider }) {
  const color = PROVIDER_COLORS[provider] ?? "text-slate-600 bg-slate-100 ring-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 capitalize", color)}>
      {provider}
    </span>
  );
}

function PipelineStep({ service, provider, latency, isActive }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1.5 rounded-lg border px-4 py-3 min-w-[100px] transition-colors",
      isActive
        ? "border-blue-200 bg-blue-50"
        : "border-slate-200 bg-white"
    )}>
      <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
        {STEP_LABELS[service]}
      </span>
      <ProviderBadge provider={provider} />
      {latency != null && latency > 0 && (
        <span className="text-xs text-slate-400">{latency}ms</span>
      )}
      {isActive && (
        <span className="mt-0.5 h-1 w-1 rounded-full bg-blue-400 animate-ping" />
      )}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center text-slate-300 px-1 mt-3">
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
        <path d="M0 6h17M13 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

export default function VoiceDemo({ routing }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(false);

  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const sttProvider = result?.providers_used?.stt ?? routing?.stt?.active ?? "deepgram";
  const ttsProvider = result?.providers_used?.tts ?? routing?.tts?.active ?? "elevenlabs";

  const runPipeline = async (payload) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveStep("stt");

    try {
      const stepTimer  = setTimeout(() => setActiveStep("llm"), 800);
      const stepTimer2 = setTimeout(() => setActiveStep("tts"), 1800);

      const resp = await fetch("/api/demo/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail ?? "Pipeline failed");
      }

      const data = await resp.json();
      setResult(data);
      setActiveStep(null);

      if (data.audio_b64 && audioRef.current) {
        const mime = data.audio_mime || "audio/mpeg";
        const binary = atob(data.audio_b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(blob);
        const el = audioRef.current;
        el.oncanplay = null;
        el.onloadeddata = null;
        const playOnce = () => {
          el.oncanplay = null;
          el.onloadeddata = null;
          el.play().catch((err) => console.warn("Autoplay blocked:", err));
        };
        el.oncanplay = playOnce;
        el.onloadeddata = playOnce;
        el.src = objectUrlRef.current;
        el.load();
      }
    } catch (e) {
      setError(e.message);
      setActiveStep(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    runPipeline({ text: text.trim() });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) { setError("No audio captured. Please try recording again."); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result?.split(",")[1];
          if (!b64 || !b64.trim()) { setError("Audio capture failed. Please try again."); return; }
          runPipeline({ audio_b64: b64, audio_mime: blob.type || "audio/webm" });
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      setError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          Voice AI Demo
          <span className="ml-auto text-xs text-slate-400 font-normal">
            Generates real API usage → visible in charts above
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline visualization */}
        <div className="flex items-start gap-1">
          <PipelineStep service="stt" provider={sttProvider} latency={result?.latency_ms?.stt} isActive={activeStep === "stt"} />
          <Arrow />
          <PipelineStep service="llm" provider={result?.providers_used?.llm ?? routing?.llm?.active ?? "groq"} latency={result?.latency_ms?.llm} isActive={activeStep === "llm"} />
          <Arrow />
          <PipelineStep service="tts" provider={ttsProvider} latency={result?.latency_ms?.tts} isActive={activeStep === "tts"} />
          {result?.latency_ms?.total && (
            <div className="ml-auto self-center text-xs text-slate-400">
              total {result.latency_ms.total}ms
            </div>
          )}
        </div>

        {/* Input row */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-300 shadow-sm"
            placeholder="Type a message and press Enter…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || recording}
          />
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors border",
              recording
                ? "bg-red-50 text-red-500 ring-1 ring-red-200 border-red-200 animate-pulse"
                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm"
            )}
            title={recording ? "Stop recording" : "Record voice"}
          >
            {recording ? "⏹ Stop" : "🎙"}
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !text.trim() || recording}
            className="rounded-lg bg-blue-500 hover:bg-blue-400 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 transition-colors shadow-sm"
          >
            {loading ? "Running…" : "Send"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            {result.transcript && result.transcript !== text && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-xs text-slate-400 mb-1">Transcript</p>
                <p className="text-sm text-slate-700">{result.transcript}</p>
              </div>
            )}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-xs text-slate-400 mb-1">Response</p>
              <p className="text-sm text-slate-800">{result.response}</p>
            </div>
          </div>
        )}

        {/* Audio player */}
        <audio
          ref={audioRef}
          controls
          className={cn("w-full h-8 opacity-70", !result?.audio_b64 && "hidden")}
          onError={() => setError("Audio decode failed in browser. Try hard refresh once.")}
        />
      </CardContent>
    </Card>
  );
}
