"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/Header";
import { sentimentColor, sentimentLabel, formatDate } from "@/utils/helpers";

interface Citation {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  createdAt: string;
  similarity: number;
}

interface QAMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  loading?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What are customers most frustrated about?",
  "What features are users requesting most?",
  "How is the onboarding experience perceived?",
  "What do customers say about pricing?",
  "Are there any performance complaints?",
  "What's the sentiment around mobile experience?",
];

export default function AskPage() {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleAsk(q?: string) {
    const text = q ?? question;
    if (!text.trim() || loading) return;

    setQuestion("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", loading: true },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: data.answer,
          citations: data.citations,
        };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        title="Ask LOOP"
        subtitle="Ask questions about your customer feedback — AI-grounded answers"
      />

      <main className="flex-1 flex flex-col p-6 gap-4 max-w-4xl">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-1">Ask anything about your feedback</h2>
              <p className="text-sm text-slate-400">
                LOOP retrieves relevant feedback and uses AI to answer your questions — with citations.
              </p>
            </div>

            <div className="w-full max-w-xl grid grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleAsk(q)}
                  className="text-left px-4 py-3 bg-slate-900 border border-slate-800 hover:border-indigo-600 rounded-xl text-sm text-slate-300 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-3xl ${msg.role === "user" ? "w-auto" : "w-full"}`}>
                  {msg.role === "user" ? (
                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm p-4">
                      {msg.loading ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          Analyzing feedback...
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>

                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-4 border-t border-slate-800 pt-3">
                              <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
                                Sources ({msg.citations.length})
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {msg.citations.slice(0, 6).map((c, ci) => (
                                  <div key={c.id} className="bg-slate-800/60 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold text-indigo-400">[{ci + 1}]</span>
                                      <span className="text-xs text-slate-500">{c.channel}</span>
                                      {c.sentiment && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sentimentColor(c.sentiment)}`}>
                                          {sentimentLabel(c.sentiment)}
                                        </span>
                                      )}
                                      <span className="text-xs text-slate-600 ml-auto">
                                        {formatDate(c.createdAt)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-300 line-clamp-2">{c.content}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-800 pt-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
              placeholder="Ask a question about your customer feedback..."
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={() => handleAsk()}
              disabled={!question.trim() || loading}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); }}
              className="mt-2 text-xs text-slate-600 hover:text-slate-400 transition"
            >
              Clear conversation
            </button>
          )}
        </div>
      </main>
    </>
  );
}
