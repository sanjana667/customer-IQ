"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface Theme {
  id: string;
  name: string;
  color: string | null;
  feedbackCount: number;
  prevCount?: number;
  changePercent?: number | null;
  isSpike?: boolean;
}

interface TrendsData {
  themes: Theme[];
  volumeData: Array<{ date: string; count: number }>;
}

export default function ThemesPage() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [themeFeedbacks, setThemeFeedbacks] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    fetch("/api/trends?days=30")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function drillIntoTheme(themeName: string) {
    if (selectedTheme === themeName) {
      setSelectedTheme(null);
      setThemeFeedbacks([]);
      return;
    }
    setSelectedTheme(themeName);
    setFeedbackLoading(true);
    const res = await fetch(`/api/feedback?theme=${encodeURIComponent(themeName)}&limit=20`);
    const json = await res.json();
    setThemeFeedbacks(json.data ?? []);
    setFeedbackLoading(false);
  }

  return (
    <>
      <Header title="Themes & Trends" subtitle="AI-clustered feedback themes with trend detection" />

      <main className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Theme cards */}
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
                Active Themes (Last 30 Days)
              </h2>
              {(data?.themes ?? []).length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                  <div className="text-3xl mb-2">🏷️</div>
                  <div className="text-sm">No themes yet. Add some feedback to see themes appear.</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {(data?.themes ?? []).map((theme, index) => (
                    <button
                      key={theme.id ? `${theme.id}-${index}` : `theme-${index}`}
                      onClick={() => drillIntoTheme(theme.name)}
                      className={`text-left bg-slate-900 border rounded-xl p-4 transition hover:border-indigo-600 cursor-pointer ${
                        selectedTheme === theme.name ? "border-indigo-500" : "border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: theme.color ?? "#6366f1" }}
                        />
                        <span className="text-sm font-medium text-white capitalize">{theme.name}</span>
                        {theme.isSpike && (
                          <span className="ml-auto text-xs bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded">
                            🔥 Spike
                          </span>
                        )}
                      </div>
                      <div className="text-2xl font-bold text-white">{theme.feedbackCount}</div>
                      <div className="text-xs text-slate-500 mt-1">feedback items</div>
                      {theme.changePercent !== null && theme.changePercent !== undefined && (
                        <div
                          className={`text-xs mt-1 font-medium ${
                            theme.changePercent > 0 ? "text-red-400" : "text-green-400"
                          }`}
                        >
                          {theme.changePercent > 0 ? "↑" : "↓"} {Math.abs(theme.changePercent)}% vs prev
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drill-down */}
            {selectedTheme && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white capitalize">
                    Feedback for &quot;{selectedTheme}&quot;
                  </h3>
                  <button
                    onClick={() => { setSelectedTheme(null); setThemeFeedbacks([]); }}
                    className="text-xs text-slate-500 hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>
                {feedbackLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : themeFeedbacks.length === 0 ? (
                  <div className="text-slate-500 text-sm py-4 text-center">No feedback found</div>
                ) : (
                  <div className="space-y-3">
                    {themeFeedbacks.map((f, index) => (
                      <div key={f.id ? `${f.id}-${index}` : `feedback-${index}`} className="border border-slate-800 rounded-lg p-3">
                        <div className="text-sm text-slate-200">{f.content}</div>
                        <div className="flex gap-3 mt-2 text-xs text-slate-500">
                          <span>{f.channel}</span>
                          <span>•</span>
                          <span>{f.sentiment ?? "unclassified"}</span>
                          <span>•</span>
                          <span>{format(new Date(f.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Volume trend chart */}
            {(data?.volumeData ?? []).length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-slate-300 mb-4">
                  Daily Feedback Volume (Last 30 Days)
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={(data?.volumeData ?? []).map((d) => ({
                      ...d,
                      label: format(parseISO(d.date), "MMM d"),
                    }))}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} name="Feedback" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}