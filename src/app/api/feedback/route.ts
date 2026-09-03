import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, feedbackThemes, themes } from "@/db/schema";
import { eq, and, desc, ilike, gte, lte, inArray, count, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { createFeedbackSchema, feedbackQuerySchema } from "@/lib/validations/feedback";
import { classifyFeedback } from "@/lib/ai/classification";
import { generateSimpleEmbedding, vectorToString } from "@/lib/ai/embeddings";
import { generateId } from "@/utils/helpers";
import { embeddings } from "@/db/schema";

async function processClassification(
  feedbackId: string,
  content: string,
  workspaceId: string
) {
  try {
    // Get existing themes for this workspace
    const existingThemes = await db
      .select({ name: themes.name })
      .from(themes)
      .where(eq(themes.workspaceId, workspaceId));

    const themeNames = existingThemes.map((t) => t.name);
    const classification = await classifyFeedback(content, themeNames);

    // Update feedback with classification
    await db
      .update(feedbacks)
      .set({
        sentiment: classification.sentiment,
        sentimentScore: classification.sentimentScore,
        featureArea: classification.featureArea,
        updatedAt: new Date(),
      })
      .where(eq(feedbacks.id, feedbackId));

    // Process themes
    for (const themeName of classification.themes) {
      const normalizedName = themeName.toLowerCase().trim();
      if (!normalizedName) continue;

      // Find or create theme
      let [existingTheme] = await db
        .select()
        .from(themes)
        .where(
          and(eq(themes.workspaceId, workspaceId), eq(themes.name, normalizedName))
        )
        .limit(1);

      if (!existingTheme) {
        const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const [newTheme] = await db
          .insert(themes)
          .values({
            id: generateId(),
            name: normalizedName,
            workspaceId,
            color,
          })
          .returning();
        existingTheme = newTheme;
      }

      if (existingTheme) {
        // Create feedback-theme association
        await db
          .insert(feedbackThemes)
          .values({
            feedbackId,
            themeId: existingTheme.id,
            confidence: 0.85,
          })
          .onConflictDoNothing();
      }
    }

    // Generate and store embedding
    const vector = generateSimpleEmbedding(content);
    await db
      .insert(embeddings)
      .values({
        id: generateId(),
        feedbackId,
        vector: vectorToString(vector),
      })
      .onConflictDoUpdate({
        target: embeddings.feedbackId,
        set: { vector: vectorToString(vector) },
      });
  } catch (err) {
    console.error("Classification error:", err);
  }
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireRole("VIEWER");
  if (error || !session) return error!;

  const { searchParams } = new URL(request.url);
  const query = feedbackQuerySchema.parse({
    page: searchParams.get("page") ?? 1,
    limit: searchParams.get("limit") ?? 20,
    channel: searchParams.get("channel") ?? undefined,
    sentiment: searchParams.get("sentiment") ?? undefined,
    theme: searchParams.get("theme") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });

  const workspaceId = session.user.workspaceId;
  const offset = (query.page - 1) * query.limit;

  // Build conditions
  const conditions = [eq(feedbacks.workspaceId, workspaceId)];

  if (query.channel) {
    conditions.push(eq(feedbacks.channel, query.channel));
  }
  if (query.sentiment) {
    conditions.push(eq(feedbacks.sentiment, query.sentiment));
  }
  if (query.status) {
    conditions.push(eq(feedbacks.status, query.status));
  }
  if (query.search) {
    conditions.push(ilike(feedbacks.content, `%${query.search}%`));
  }
  if (query.dateFrom) {
    conditions.push(gte(feedbacks.createdAt, new Date(query.dateFrom)));
  }
  if (query.dateTo) {
    conditions.push(lte(feedbacks.createdAt, new Date(query.dateTo)));
  }

  // If filtering by theme, get feedbackIds first
  let feedbackIdFilter: string[] | null = null;
  if (query.theme) {
    const [theme] = await db
      .select({ id: themes.id })
      .from(themes)
      .where(and(eq(themes.workspaceId, workspaceId), eq(themes.name, query.theme)))
      .limit(1);

    if (theme) {
      const themeLinks = await db
        .select({ feedbackId: feedbackThemes.feedbackId })
        .from(feedbackThemes)
        .where(eq(feedbackThemes.themeId, theme.id));
      feedbackIdFilter = themeLinks.map((t) => t.feedbackId);
    } else {
      feedbackIdFilter = [];
    }
  }

  if (feedbackIdFilter !== null) {
    if (feedbackIdFilter.length === 0) {
      return NextResponse.json({ data: [], total: 0, page: query.page, limit: query.limit });
    }
    conditions.push(inArray(feedbacks.id, feedbackIdFilter));
  }

  const whereClause = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(feedbacks)
    .where(whereClause);

  const rows = await db
    .select()
    .from(feedbacks)
    .where(whereClause)
    .orderBy(desc(feedbacks.createdAt))
    .limit(query.limit)
    .offset(offset);

  // Get themes for each feedback
  const feedbackIds = rows.map((r) => r.id);
  let themeMap: Record<string, Array<{ name: string; color: string | null }>> = {};

  if (feedbackIds.length > 0) {
    const themeLinks = await db
      .select({
        feedbackId: feedbackThemes.feedbackId,
        name: themes.name,
        color: themes.color,
      })
      .from(feedbackThemes)
      .innerJoin(themes, eq(feedbackThemes.themeId, themes.id))
      .where(inArray(feedbackThemes.feedbackId, feedbackIds));

    for (const link of themeLinks) {
      if (!themeMap[link.feedbackId]) themeMap[link.feedbackId] = [];
      themeMap[link.feedbackId].push({ name: link.name, color: link.color });
    }
  }

  const data = rows.map((f) => ({
    ...f,
    themes: themeMap[f.id] ?? [],
  }));

  return NextResponse.json({ data, total, page: query.page, limit: query.limit });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole("ANALYST");
  if (error || !session) return error!;

  const body = await request.json();
  const parsed = createFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { content, channel, customerLabel, sourceRef } = parsed.data;
  const id = generateId();

  const [feedback] = await db
    .insert(feedbacks)
    .values({
      id,
      content,
      channel,
      customerLabel,
      sourceRef,
      workspaceId: session.user.workspaceId,
      status: "NEW",
    })
    .returning();

  // Classify asynchronously (fire and forget)
  processClassification(id, content, session.user.workspaceId).catch(console.error);

  return NextResponse.json(feedback, { status: 201 });
}
