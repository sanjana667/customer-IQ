import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, feedbackThemes, themes } from "@/db/schema";
import { eq, and, gte, count, desc, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { subDays, startOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const { session, error } = await requireRole("VIEWER");
  if (error || !session) return error!;

  const workspaceId = session.user.workspaceId;
  const now = new Date();
  const weekAgo = startOfDay(subDays(now, 7));
  const monthAgo = startOfDay(subDays(now, 30));

  // Total feedback
  const [{ total }] = await db
    .select({ total: count() })
    .from(feedbacks)
    .where(eq(feedbacks.workspaceId, workspaceId));

  // New this week
  const [{ newThisWeek }] = await db
    .select({ newThisWeek: count() })
    .from(feedbacks)
    .where(and(eq(feedbacks.workspaceId, workspaceId), gte(feedbacks.createdAt, weekAgo)));

  // Sentiment breakdown
  const sentimentData = await db
    .select({ sentiment: feedbacks.sentiment, count: count() })
    .from(feedbacks)
    .where(eq(feedbacks.workspaceId, workspaceId))
    .groupBy(feedbacks.sentiment);

  const negCount = sentimentData.find((s) => s.sentiment === "NEG")?.count ?? 0;
  const negPercent = total > 0 ? Math.round((negCount / total) * 100) : 0;

  // Volume last 30 days
  const volumeData = await db
    .select({
      date: sql<string>`DATE(${feedbacks.createdAt})`.as("date"),
      count: count(),
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.workspaceId, workspaceId), gte(feedbacks.createdAt, monthAgo)))
    .groupBy(sql`DATE(${feedbacks.createdAt})`)
    .orderBy(sql`DATE(${feedbacks.createdAt})`);

  // Top themes
  const topThemes = await db
    .select({ name: themes.name, color: themes.color, count: count() })
    .from(feedbackThemes)
    .innerJoin(themes, eq(feedbackThemes.themeId, themes.id))
    .innerJoin(feedbacks, eq(feedbackThemes.feedbackId, feedbacks.id))
    .where(eq(feedbacks.workspaceId, workspaceId))
    .groupBy(themes.name, themes.color)
    .orderBy(desc(count()))
    .limit(8);

  return NextResponse.json({
    stats: {
      total,
      newThisWeek,
      negPercent,
    },
    sentimentData: sentimentData.map((s) => ({
      name:
        s.sentiment === "POS"
          ? "Positive"
          : s.sentiment === "NEG"
            ? "Negative"
            : s.sentiment === "NEU"
              ? "Neutral"
              : "Unknown",
      value: s.count,
      sentiment: s.sentiment,
    })),
    volumeData,
    topThemes,
  });
}
