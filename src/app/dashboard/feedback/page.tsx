"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/Header";
import { sentimentColor, sentimentLabel, statusColor, truncate, formatDate } from "@/utils/helpers";

interface FeedbackItem {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  status: string;
  featureArea: string | null;
  createdAt: string;
  customerLabel: string | null;
  themes: Array<{ name: string; color: string | null }>;
}

interface FeedbackResponse {
  data: FeedbackItem[];
  total: number;
  page: number;
  limit: number;
}

const CHANNELS = ["support", "appstore", "nps", "sales", "community"];
const SENTIMENTS = ["POS", "NEU", "NEG"];
const STATUSES = ["NEW", "REVIEWED", "ACTIONED"];

export default function FeedbackPage() {
  const { data: session } = useSession();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    channel: "",
    sentiment: "",
    status: "",
    search: "",
  });

  // New feedback form
  const [newFeedback, setNewFeedback] = useState({
    content: "",
    channel: "support",
    customerLabel: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // CSV upload
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const limit = 20;

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.sentiment) params.set("sentiment", filters.sentiment);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);

    const res = await fetch(`/api/feedback?${params}`);
    const data: FeedbackResponse = await res.json();
    setFeedbacks(data.data ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, filters]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFeedback),
    });
    setNewFeedback({ content: "", channel: "support", customerLabel: "" });
    setShowForm(false);
    setSubmitting(false);
    fetchFeedback();
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchFeedback();
  }

  async function handleClassify(id: string) {
    await fetch(`/api/feedback/${id}/classify`, { method: "POST" });
    fetchFeedback();
  }

  async function handleSimulate() {
    setSimulating(true);
    const res = await fetch("/api/feedback/simulate", { method: "POST" });
    const data = await res.json();
    setSimulating(false);
    fetchFeedback();
    alert(`Simulated ${data.count} feedback items`);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile) return;
    const formData = new FormData();
    formData.append("file", csvFile);
    const res = await fetch("/api/feedback/upload", { method: "POST", body: formData });
    const result = await res.json();
    setUploadResult(result);
    setCsvFile(null);
    fetchFeedback();
  }

  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "ANALYST";
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Header
        title="Feedback Inbox"
        subtitle={`${total} total items`}
        actions={
          canEdit ? (
            <div className="flex gap-2">
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                {simulating ? "Simulating..." : "⚡ Simulate"}
              </button>
              <button
                onClick={() => { setShowUpload(!showUpload); setShowForm(false); }}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                📤 CSV Upload
              </button>
              <button
                onClick={() => { setShowForm(!showForm); setShowUpload(false); }}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
              >
                + Add Feedback
              </button>
            </div>
          ) : null
        }
      />

      <main className="flex-1 p-6 space-y-4">
        {/* Add feedback form */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Add Feedback</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={newFeedback.content}
                onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
                required
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Customer feedback content..."
              />
              <div className="flex gap-3">
                <select
                  value={newFeedback.channel}
                  onChange={(e) => setNewFeedback({ ...newFeedback, channel: e.target.value })}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="text"
                  value={newFeedback.customerLabel}
                  onChange={(e) => setNewFeedback({ ...newFeedback, customerLabel: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Customer label (optional)"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
                >
                  {submitting ? "Saving..." : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CSV Upload */}
        {showUpload && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Upload CSV</h3>
            <p className="text-xs text-slate-500 mb-4">Columns: content, channel, customer_label (optional), created_at (optional)</p>
            <form onSubmit={handleUpload} className="flex gap-3 items-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-400"
              />
              <button
                type="submit"
                disabled={!csvFile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                Upload
              </button>
            </form>
            {uploadResult && (
              <div className="mt-3 text-sm">
                <span className="text-green-400">✓ {uploadResult.successCount} imported</span>
                {uploadResult.failCount > 0 && <span className="text-red-400 ml-3">✗ {uploadResult.failCount} failed</span>}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search feedback..."
              value={filters.search}
              onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
              className="flex-1 min-w-48 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              value={filters.channel}
              onChange={(e) => { setFilters({ ...filters, channel: e.target.value }); setPage(1); }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All channels</option>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.sentiment}
              onChange={(e) => { setFilters({ ...filters, sentiment: e.target.value }); setPage(1); }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All sentiment</option>
              {SENTIMENTS.map((s) => <option key={s} value={s}>{sentimentLabel(s)}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {(filters.channel || filters.sentiment || filters.status || filters.search) && (
              <button
                onClick={() => { setFilters({ channel: "", sentiment: "", status: "", search: "" }); setPage(1); }}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm">No feedback found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Content</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-24">Channel</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-24">Sentiment</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Themes</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-28">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-24">Date</th>
                    {canEdit && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-20">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {feedbacks.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white">{truncate(item.content, 120)}</div>
                        {item.customerLabel && (
                          <div className="text-xs text-slate-500 mt-0.5">{item.customerLabel}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                          {item.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.sentiment ? (
                          <span className={`text-xs px-2 py-1 rounded font-medium ${sentimentColor(item.sentiment)}`}>
                            {sentimentLabel(item.sentiment)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.themes.slice(0, 3).map((t) => (
                            <span
                              key={t.name}
                              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                              style={{ backgroundColor: t.color ?? "#6366f1" }}
                            >
                              {t.name}
                            </span>
                          ))}
                          {item.themes.length > 3 && (
                            <span className="text-xs text-slate-500">+{item.themes.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded border-0 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 ${statusColor(item.status)}`}
                          >
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor(item.status)}`}>
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(item.createdAt)}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleClassify(item.id)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                            title="Re-classify with AI"
                          >
                            🤖 Re-AI
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 transition"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
