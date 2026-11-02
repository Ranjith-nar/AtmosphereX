import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import {
  AiAtmosphericBriefing,
  AtmosphericBundleResponse,
} from '../types/atmosphere';

interface AiAssistantPanelProps {
  bundle: AtmosphericBundleResponse;
}

const SUGGESTED_QUESTIONS = [
  'Is outdoor endurance exercise safe right now?',
  'Explain current O₃, NO₂, and PM2.5 levels vs WHO limits.',
  'How are wind speed and pressure affecting dispersion?',
  'Which gas values are estimated vs standard reference?',
];

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  bundle,
}) => {
  const [briefing, setBriefing] = useState<AiAtmosphericBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [questionInput, setQuestionInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    setLoadingBriefing(true);
    setBriefingError(null);
    try {
      const res = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to generate atmospheric briefing.');
      }
      setBriefing(data);
    } catch (err: any) {
      setBriefingError(
        err.message || 'Unable to generate AI briefing. Check Settings > Secrets if needed.'
      );
    } finally {
      setLoadingBriefing(false);
    }
  }, [bundle]);

  useEffect(() => {
    setMessages([]);
    fetchBriefing();
  }, [bundle.location.latitude, bundle.location.longitude, fetchBriefing]);

  const handleAsk = async (qText?: string) => {
    const q = (qText ?? questionInput).trim();
    if (!q || asking) return;
    setQuestionInput('');
    setChatError(null);

    const nextHistory = [...messages, { role: 'user' as const, content: q }];
    setMessages(nextHistory);
    setAsking(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle,
          question: q,
          history: messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Atmospheric analyst request failed.');
      }
      setMessages([
        ...nextHistory,
        { role: 'assistant', content: data.answer },
      ]);
    } catch (err: any) {
      setChatError(
        err.message || 'Atmospheric analyst could not respond right now.'
      );
    } finally {
      setAsking(false);
    }
  };

  const riskTone =
    briefing?.riskLevel === 'Nominal'
      ? 'text-emerald-400'
      : briefing?.riskLevel === 'Moderate'
      ? 'text-cyan-400'
      : briefing?.riskLevel === 'Elevated'
      ? 'text-amber-400'
      : 'text-rose-400';

  const riskGlyph =
    briefing?.riskLevel === 'Nominal'
      ? '●'
      : briefing?.riskLevel === 'High'
      ? '✖'
      : '▲';

  return (
    <section className="rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-display font-semibold text-slate-100">
            Atmospheric & Pollution Intelligence Analyst
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Grounded strictly on live Open-Meteo, CAMS trace gases, ML forecast, and station provenance
          </p>
        </div>

        <button
          type="button"
          onClick={fetchBriefing}
          disabled={loadingBriefing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#070B14] hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 transition-colors self-start whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-cyan-400 ${
              loadingBriefing ? 'animate-spin' : ''
            }`}
          />
          Regenerate Briefing
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
        {/* Left: Structured Scientific Briefing */}
        <div className="lg:col-span-7 space-y-4">
          {loadingBriefing ? (
            <div className="space-y-3 py-2">
              <div className="h-5 w-3/4 bg-slate-800/70 rounded animate-pulse" />
              <div className="h-16 w-full bg-slate-800/50 rounded animate-pulse" />
              <div className="h-16 w-full bg-slate-800/50 rounded animate-pulse" />
              <div className="h-12 w-full bg-slate-800/50 rounded animate-pulse" />
            </div>
          ) : briefingError ? (
            <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-200 space-y-2">
              <p className="font-semibold">Unable to load AI Atmospheric Briefing</p>
              <p>{briefingError}</p>
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className={`text-xs font-mono font-semibold ${riskTone}`}>
                  {riskGlyph} Exposure Risk: {briefing.riskLevel}
                </p>
                <h3 className="text-base font-display font-semibold text-slate-100">
                  {briefing.headline}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/70 text-xs leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-200 mb-1">
                    Synoptic & Boundary-Layer Conditions
                  </p>
                  <p className="text-slate-300">{briefing.weatherAnalysis}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-200 mb-1">
                    Particulates & Trace Gas Chemistry
                  </p>
                  <p className="text-slate-300">
                    {briefing.pollutionAndGasAnalysis}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/70 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed">
                <div>
                  <p className="font-semibold text-cyan-300 mb-1">
                    Health & Activity Advisory
                  </p>
                  <p className="text-slate-300">{briefing.outdoorGuidance}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-200 mb-1">
                    Measurement Provenance Audit
                  </p>
                  <p className="text-slate-400">{briefing.provenanceSummary}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: Interactive Contextual Q&A */}
        <div className="lg:col-span-5 lg:border-l border-slate-800/80 lg:pl-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-200">
              Ask the Atmospheric Scientist
            </p>

            {/* Quick Scientific Prompts */}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAsk(q)}
                  disabled={asking}
                  className="px-2.5 py-1 text-[11px] text-left bg-[#070B14] hover:bg-slate-800 border border-slate-800 rounded-md text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Conversation Stream */}
            {messages.length > 0 && (
              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1 pt-1">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`text-xs leading-relaxed p-3 rounded-lg ${
                      m.role === 'user'
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-100'
                        : 'bg-[#070B14] border border-slate-800 text-slate-200 whitespace-pre-line'
                    }`}
                  >
                    <p className="text-[10px] font-mono text-slate-400 mb-1">
                      {m.role === 'user' ? 'Question' : 'Atmospheric Analyst'}
                    </p>
                    {m.content}
                  </div>
                ))}
                {asking && (
                  <div className="text-xs text-slate-400 font-mono px-2">
                    Evaluating chemical and meteorological telemetry...
                  </div>
                )}
              </div>
            )}

            {chatError && (
              <p className="text-xs text-rose-400">{chatError}</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center gap-2 pt-2"
          >
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask about AQI, trace gases, inversions, or rain..."
              className="flex-1 px-3 py-2 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={asking || !questionInput.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Ask
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
