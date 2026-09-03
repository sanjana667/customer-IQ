"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Link from "next/link";

export default function NewReportPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    periodStart: "",
    periodEnd: "",
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to generate report");
      setGenerating(false);
      return;
    }

    router.push("/dashboard/reports");
  }

  // Quick date presets
  function setPreset(preset: string) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    let start: string;

    switch (preset) {
      case "last7":
        start = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
        break;
      case "last30":
        start = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
        break;
      case "last90":
        start = new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0];
        break;
      default:
        return;
    }

    setForm((f) => ({ ...f, periodStart: start, periodEnd: today }));
  }

  return (
    <>
      <Header
        title="Generate VoC Report"
        subtitle="AI-powered Voice of Customer report"
      />

      <main className="flex-1 p-6 max-w-2xl">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6 bg-indigo-950/40 border border-indigo-900/40 rounded-xl p-4">
            <div className="text-2xl">🤖</div>
            <div>
              <div className="text-sm font-medium text-indigo-300 mb-1">AI Report Generation</div>
              <div className="text-xs text-indigo-400/70">
                LOOP will analyze all feedback in the selected period, compute statistics, and use Claude AI to write
                an executive summary with key insights, top themes, and recommended actions.
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Report Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Q1 2025 Voice of Customer Report"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Quick Select</label>
              <div className="flex gap-2">
                {[
                  { label: "Last 7 days", value: "last7" },
                  { label: "Last 30 days", value: "last30" },
                  { label: "Last 90 days", value: "last90" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPreset(p.value)}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Period Start</label>
                <input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Period End</label>
                <input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800/40 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={generating}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating report...
                  </>
                ) : (
                  "Generate Report"
                )}
              </button>
              <Link
                href="/dashboard/reports"
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-center font-medium text-sm"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
