import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, feedbacks, feedbackThemes, themes, users } from "@/db/schema";
import { eq, and, gte, lte, count, desc, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { callClaude } from "@/lib/ai/claude";
import { generateId } from "@/utils/helpers";
import { z } from "zod";

const generateReportSchema = z.object({
  title: z.string().min(1).max(500),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireRole("VIEWER");
  if (error || !session) return error!;

  const workspaceId = session.user.workspaceId;

  const reportList = await db
    .select({
      id: reports.id,
      title: reports.title,
      periodStart: reports.periodStart,
      periodEnd: reports.periodEnd,
      createdAt: reports.createdAt,
      generatedByName: users.name,
    })
    .from(reports)
    .innerJoin(users, eq(reports.generatedById, users.id))
    .where(eq(reports.workspaceId, workspaceId))
    .orderBy(desc(reports.createdAt));

  return NextResponse.json(reportList);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole("ANALYST");
  if (error || !session) return error!;

  const body = await request.json();
  const parsed = generateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, periodStart, periodEnd } = parsed.data;
  const workspaceId = session.user.workspaceId;
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  // Gather stats
  const conditions = [
    eq(feedbacks.workspaceId, workspaceId),
    gte(feedbacks.createdAt, startDate),
    lte(feedbacks.createdAt, endDate),
  ];

  const totalFeedback = await db
    .select({ count: count() })
    .from(feedbacks)
    .where(and(...conditions));

  const sentimentBreakdown = await db
    .select({ sentiment: feedbacks.sentiment, count: count() })
    .from(feedbacks)
    .where(and(...conditions))
    .groupBy(feedbacks.sentiment);

  const topThemes = await db
    .select({ name: themes.name, count: count() })
    .from(feedbackThemes)
    .innerJoin(themes, eq(feedbackThemes.themeId, themes.id))
    .innerJoin(feedbacks, eq(feedbackThemes.feedbackId, feedbacks.id))
    .where(and(...conditions))
    .groupBy(themes.name)
    .orderBy(desc(count()))
    .limit(10);

  // Sample verbatim quotes
  const quotes = await db
    .select({ content: feedbacks.content, sentiment: feedbacks.sentiment, channel: feedbacks.channel })
    .from(feedbacks)
    .where(and(...conditions))
    .limit(6)
    .orderBy(desc(feedbacks.createdAt));

  const total = totalFeedback[0]?.count ?? 0;
  const negCount = sentimentBreakdown.find((s) => s.sentiment === "NEG")?.count ?? 0;
  const posCount = sentimentBreakdown.find((s) => s.sentiment === "POS")?.count ?? 0;
  const neuCount = sentimentBreakdown.find((s) => s.sentiment === "NEU")?.count ?? 0;

  // Previous period comparison
  const prevDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = new Date(startDate.getTime() - prevDays * 24 * 60 * 60 * 1000);

  const prevConditions = [
    eq(feedbacks.workspaceId, workspaceId),
    gte(feedbacks.createdAt, prevStart),
    lte(feedbacks.createdAt, startDate),
  ];

  const prevSentiment = await db
    .select({ sentiment: feedbacks.sentiment, count: count() })
    .from(feedbacks)
    .where(and(...prevConditions))
    .groupBy(feedbacks.sentiment);

  const prevNeg = prevSentiment.find((s) => s.sentiment === "NEG")?.count ?? 0;
  const prevTotal = prevSentiment.reduce((s, r) => s + r.count, 0);

  const negPct = total > 0 ? Math.round((negCount / total) * 100) : 0;
  const prevNegPct = prevTotal > 0 ? Math.round((prevNeg / prevTotal) * 100) : 0;
  const negChange = negPct - prevNegPct;

  const statsData = {
    period: `${startDate.toDateString()} to ${endDate.toDateString()}`,
    totalFeedback: total,
    sentimentBreakdown: {
      positive: posCount,
      neutral: neuCount,
      negative: negCount,
      positivePercent: total > 0 ? Math.round((posCount / total) * 100) : 0,
      negativePercent: negPct,
    },
    sentimentChange: {
      negativeChangePoints: negChange,
      trend: negChange > 5 ? "worsening" : negChange < -5 ? "improving" : "stable",
    },
    topThemes: topThemes.map((t) => ({ name: t.name, count: t.count })),
    sampleQuotes: quotes.map((q) => ({
      content: q.content.slice(0, 200),
      sentiment: q.sentiment,
      channel: q.channel,
    })),
  };

  const systemPrompt = `You are an expert product analyst writing a Voice of Customer (VoC) executive report. 
Write a concise, factual executive summary based ONLY on the provided statistics. 
Do not invent data. Use the exact numbers provided. Write 2-3 paragraphs covering: key insights, top themes, notable patterns, and recommended actions.
Format with clear paragraph breaks.`;

  const userMessage = `Write a VoC executive report for "${title}" based on this data:
${JSON.stringify(statsData, null, 2)}`;

  const narrative = await callClaude(systemPrompt, userMessage, 1024);

  const contentJson = {
    summary: narrative,
    stats: statsData,
    generatedAt: new Date().toISOString(),
  };

  const [report] = await db
    .insert(reports)
    .values({
      id: generateId(),
      title,
      periodStart: startDate,
      periodEnd: endDate,
      contentJson,
      workspaceId,
      generatedById: session.user.id,
    })
    .returning();

  return NextResponse.json(report, { status: 201 });
}
