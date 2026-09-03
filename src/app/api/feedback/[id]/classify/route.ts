import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, feedbackThemes, themes, embeddings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { classifyFeedback } from "@/lib/ai/classification";
import { generateSimpleEmbedding, vectorToString } from "@/lib/ai/embeddings";
import { generateId } from "@/utils/helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireRole("ANALYST");
  if (error || !session) return error!;

  const { id } = await params;
  const workspaceId = session.user.workspaceId;

  const [feedback] = await db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.id, id), eq(feedbacks.workspaceId, workspaceId)))
    .limit(1);

  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get existing themes
  const existingThemes = await db
    .select({ name: themes.name })
    .from(themes)
    .where(eq(themes.workspaceId, workspaceId));

  const classification = await classifyFeedback(
    feedback.content,
    existingThemes.map((t) => t.name)
  );

  // Update feedback
  await db
    .update(feedbacks)
    .set({
      sentiment: classification.sentiment,
      sentimentScore: classification.sentimentScore,
      featureArea: classification.featureArea,
      updatedAt: new Date(),
    })
    .where(eq(feedbacks.id, id));

  // Remove old theme links
  await db.delete(feedbackThemes).where(eq(feedbackThemes.feedbackId, id));

  // Process themes
  for (const themeName of classification.themes) {
    const normalizedName = themeName.toLowerCase().trim();
    if (!normalizedName) continue;

    let [existingTheme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.workspaceId, workspaceId), eq(themes.name, normalizedName)))
      .limit(1);

    if (!existingTheme) {
      const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
      const [newTheme] = await db
        .insert(themes)
        .values({
          id: generateId(),
          name: normalizedName,
          workspaceId,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
        .returning();
      existingTheme = newTheme;
    }

    if (existingTheme) {
      await db
        .insert(feedbackThemes)
        .values({ feedbackId: id, themeId: existingTheme.id, confidence: 0.9 })
        .onConflictDoNothing();
    }
  }

  // Update embedding
  const vector = generateSimpleEmbedding(feedback.content);
  await db
    .insert(embeddings)
    .values({ id: generateId(), feedbackId: id, vector: vectorToString(vector) })
    .onConflictDoUpdate({
      target: embeddings.feedbackId,
      set: { vector: vectorToString(vector) },
    });

  return NextResponse.json({ success: true, classification });
}
