import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, feedbackThemes, themes } from "@/db/schema";
import { eq, and, gte, lte, count, desc, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

export async function GET(request: NextRequest) {
  const { session, error } = await requireRole("VIEWER");
  if (error || !session) return error!;

  const workspaceId = session.user.workspaceId;
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30");

  const startDate = startOfDay(subDays(new Date(), days));
  const endDate = endOfDay(new Date());
  const prevStartDate = startOfDay(subDays(new Date(), days * 2));
  const prevEndDate = startOfDay(subDays(new Date(), days));

  // Volume over time (daily)
  const volumeData = await db
    .select({
      date: sql<string>`DATE(${feedbacks.createdAt})`.as("date"),
      count: count(),
    })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.workspaceId, workspaceId),
        gte(feedbacks.createdAt, startDate),
        lte(feedbacks.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE(${feedbacks.createdAt})`)
    .orderBy(sql`DATE(${feedbacks.createdAt})`);

  // Theme volume in current period
  const themeVolumeCurrent = await db
    .select({
      themeId: themes.id,
      name: themes.name,
      color: themes.color,
      count: count(),
    })
    .from(feedbackThemes)
    .innerJoin(themes, eq(feedbackThemes.themeId, themes.id))
    .innerJoin(feedbacks, eq(feedbackThemes.feedbackId, feedbacks.id))
    .where(
      and(
        eq(themes.workspaceId, workspaceId),
        gte(feedbacks.createdAt, startDate),
        lte(feedbacks.createdAt, endDate)
      )
    )
    .groupBy(themes.id, themes.name, themes.color)
    .orderBy(desc(count()));

  // Theme volume in previous period for spike detection
  const themeVolumePrev = await db
    .select({
      themeId: themes.id,
      count: count(),
    })
    .from(feedbackThemes)
    .innerJoin(themes, eq(feedbackThemes.themeId, themes.id))
    .innerJoin(feedbacks, eq(feedbackThemes.feedbackId, feedbacks.id))
    .where(
      and(
        eq(themes.workspaceId, workspaceId),
        gte(feedbacks.createdAt, prevStartDate),
        lte(feedbacks.createdAt, prevEndDate)
      )
    )
    .groupBy(themes.id);

  const prevMap = new Map(themeVolumePrev.map((t) => [t.themeId, t.count]));

  const themesWithSpike = themeVolumeCurrent.map((t) => {
    const prev = prevMap.get(t.themeId) ?? 0;
    const change = prev > 0 ? ((t.count - prev) / prev) * 100 : null;
    return {
      ...t,
      prevCount: prev,
      changePercent: change !== null ? Math.round(change) : null,
      isSpike: change !== null && change >= 50,
    };
  });

  // Sentiment over time
  const sentimentData = await db
    .select({
      date: sql<string>`DATE(${feedbacks.createdAt})`.as("date"),
      sentiment: feedbacks.sentiment,
      count: count(),
    })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.workspaceId, workspaceId),
        gte(feedbacks.createdAt, startDate),
        lte(feedbacks.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE(${feedbacks.createdAt})`, feedbacks.sentiment)
    .orderBy(sql`DATE(${feedbacks.createdAt})`);

  return NextResponse.json({
    volumeData,
    themes: themesWithSpike,
    sentimentData,
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
  });
}
