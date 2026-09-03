import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { themes, feedbackThemes, feedbacks } from "@/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { requireRole } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { session, error } = await requireRole("VIEWER");
  if (error || !session) return error!;

  const workspaceId = session.user.workspaceId;

  const themeList = await db
    .select({
      id: themes.id,
      name: themes.name,
      description: themes.description,
      color: themes.color,
      feedbackCount: count(feedbackThemes.feedbackId),
    })
    .from(themes)
    .leftJoin(feedbackThemes, eq(themes.id, feedbackThemes.themeId))
    .where(eq(themes.workspaceId, workspaceId))
    .groupBy(themes.id, themes.name, themes.description, themes.color)
    .orderBy(desc(count(feedbackThemes.feedbackId)));

  return NextResponse.json(themeList);
}
