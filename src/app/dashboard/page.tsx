"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/Header";
import SentimentPie from "@/components/charts/SentimentPie";
import ThemeBarChart from "@/components/charts/ThemeBarChart";
import VolumeChart from "@/components/charts/VolumeChart";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={session?.user?.name ? `Welcome back, ${session.user.name}` : "Overview of your workspace"}
      />
      
      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.error ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            Failed to load dashboard data
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-sm font-medium text-slate-400 mb-1">Total Feedback</div>
                <div className="text-3xl font-bold text-white">{data.stats?.total || 0}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-sm font-medium text-slate-400 mb-1">New This Week</div>
                <div className="text-3xl font-bold text-white">{data.stats?.newThisWeek || 0}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-sm font-medium text-slate-400 mb-1">Negative Sentiment</div>
                <div className="text-3xl font-bold text-red-400">{data.stats?.negPercent || 0}%</div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Sentiment Breakdown</h3>
                <SentimentPie data={data.sentimentData || []} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Top Themes</h3>
                <ThemeBarChart data={data.topThemes || []} />
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Feedback Volume (30 Days)</h3>
              <VolumeChart data={data.volumeData || []} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
