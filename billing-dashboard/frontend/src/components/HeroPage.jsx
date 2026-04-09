import { Activity, BarChart3, Zap, Shield, ArrowRight, Mic } from "lucide-react";
import HeroChartPreview from "./HeroChartPreview";
import VoiceDemo from "./VoiceDemo";

export default function HeroPage({ onEnterDashboard, routing }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col relative overflow-x-hidden">
      {/* Soft pastel background blobs */}
      <div className="flex gap-[10rem] rotate-[-20deg] absolute top-[-40rem] right-[-30rem] z-[0] blur-[5rem] skew-x-[-40deg] opacity-20">
        <div className="w-[10rem] h-[20rem] bg-gradient-to-r from-blue-300 to-violet-300" />
        <div className="w-[10rem] h-[20rem] bg-gradient-to-r from-blue-300 to-violet-300" />
        <div className="w-[10rem] h-[20rem] bg-gradient-to-r from-blue-300 to-violet-300" />
      </div>
      <div className="flex gap-[10rem] rotate-[-20deg] absolute top-[-50rem] right-[-50rem] z-[0] blur-[5rem] skew-x-[-40deg] opacity-15">
        <div className="w-[10rem] h-[20rem] bg-gradient-to-r from-violet-200 to-orange-200" />
        <div className="w-[10rem] h-[20rem] bg-gradient-to-r from-violet-200 to-orange-200" />
        <div className="w-[10rem] h-[20rem] bg-gradient-to-r from-violet-200 to-orange-200" />
      </div>
      <div className="flex gap-[10rem] rotate-[-20deg] absolute bottom-[-40rem] left-[-30rem] z-[0] blur-[5rem] skew-x-[-40deg] opacity-15">
        <div className="w-[10rem] h-[30rem] bg-gradient-to-r from-blue-200 to-cyan-200" />
        <div className="w-[10rem] h-[30rem] bg-gradient-to-r from-blue-200 to-cyan-200" />
      </div>

      {/* Header */}
      <header className="flex justify-between items-center px-8 py-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center shadow-sm">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800">Adam&apos;s AI</span>
        </div>
        <button
          onClick={onEnterDashboard}
          className="bg-slate-900 text-white hover:bg-slate-700 rounded-full px-5 py-2 text-sm cursor-pointer font-semibold transition-colors shadow-sm"
        >
          Open Dashboard
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <div className="bg-white border border-slate-200 shadow-sm rounded-full px-4 py-2 flex items-center gap-2 w-fit">
              <span className="text-xs flex items-center gap-2 text-slate-500">
                <span className="bg-gradient-to-r from-blue-400 to-violet-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  LIVE
                </span>
                Real-time AI billing &amp; usage monitoring
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold leading-tight text-slate-900">
            Track every{" "}
            <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-orange-400 bg-clip-text text-transparent">
              API credit
            </span>{" "}
            across your AI stack
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Unified billing dashboard for your STT, LLM, and TTS providers.
            Monitor Deepgram, Groq, and ElevenLabs in one place — with live
            WebSocket updates, runway forecasting, and automatic failover.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button
              onClick={onEnterDashboard}
              className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white rounded-full px-8 py-3 text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-violet-200"
            >
              View Analytics
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onEnterDashboard}
              className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-full px-8 py-3 text-sm font-semibold transition-all shadow-sm"
            >
              Try Voice Demo
            </button>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-12 max-w-3xl mx-auto">
            {[
              {
                icon: BarChart3,
                label: "Credits Tracking",
                desc: "Per-provider remaining balance",
                color: "text-blue-400",
                bg: "bg-blue-50",
              },
              {
                icon: Activity,
                label: "Usage Trends",
                desc: "24h history with live charts",
                color: "text-violet-400",
                bg: "bg-violet-50",
              },
              {
                icon: Zap,
                label: "Runway Forecast",
                desc: "Depletion rate & time-to-zero",
                color: "text-orange-400",
                bg: "bg-orange-50",
              },
              {
                icon: Shield,
                label: "Auto Failover",
                desc: "Provider routing on low credits",
                color: "text-emerald-400",
                bg: "bg-emerald-50",
              },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-left shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className={`w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center mb-3`}>
                  <f.icon className={`h-4 w-4 ${f.color}`} />
                </div>
                <p className="text-sm font-semibold text-slate-700">{f.label}</p>
                <p className="text-xs text-slate-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Provider pills */}
          <div className="flex flex-wrap justify-center gap-3 pt-8 pb-16">
            {[
              { name: "Deepgram", role: "STT", color: "border-blue-200 text-blue-600 bg-blue-50" },
              { name: "Groq", role: "LLM", color: "border-orange-200 text-orange-600 bg-orange-50" },
              { name: "ElevenLabs", role: "TTS", color: "border-violet-200 text-violet-600 bg-violet-50" },
            ].map((p) => (
              <span
                key={p.name}
                className={`border rounded-full px-4 py-1.5 text-xs font-medium ${p.color}`}
              >
                {p.role} &middot; {p.name}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-8" />

      {/* Chart preview section */}
      <section className="relative z-10 py-16">
        <HeroChartPreview />
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-8" />

      {/* Voice Demo section */}
      <section className="relative z-10 py-8 px-4">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Try It Live
            </p>
            <h2 className="text-2xl font-bold text-slate-800">
              Experience the full pipeline
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              STT → LLM → TTS — speak and hear Adam&apos;s AI respond in real time
            </p>
          </div>
          <VoiceDemo routing={routing} />
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-8" />

      {/* Bottom CTA */}
      <div className="relative z-10 py-16 flex justify-center">
        <button
          onClick={onEnterDashboard}
          className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white rounded-full px-10 py-3.5 text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-violet-200"
        >
          Open Live Dashboard
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
