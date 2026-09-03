import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, themes, feedbackThemes, embeddings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { parseFeedbackCsv } from "@/utils/csvParser";
import { classifyFeedback } from "@/lib/ai/classification";
import { generateSimpleEmbedding, vectorToString } from "@/lib/ai/embeddings";
import { generateId } from "@/utils/helpers";

const VALID_CHANNELS = ["support", "appstore", "nps", "sales", "community"];

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole("ANALYST");
  if (error || !session) return error!;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const { data, errors } = parseFeedbackCsv(text);

  if (data.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found", parseErrors: errors },
      { status: 400 }
    );
  }

  const workspaceId = session.user.workspaceId;
  let successCount = 0;
  let failCount = 0;
  const rowErrors: string[] = [...errors];

  // Get existing themes for classification
  const existingThemes = await db
    .select({ name: themes.name })
    .from(themes)
    .where(eq(themes.workspaceId, workspaceId));

  for (const row of data) {
    try {
      const channel = VALID_CHANNELS.includes(row.channel)
        ? row.channel
        : "support";

      const createdAt = row.created_at
        ? new Date(row.created_at)
        : new Date();

      const id = generateId();
      await db.insert(feedbacks).values({
        id,
        content: row.content,
        channel,
        customerLabel: row.customer_label,
        workspaceId,
        status: "NEW",
        createdAt,
        updatedAt: new Date(),
      });

      // Classify
      const themeNames = existingThemes.map((t) => t.name);
      const classification = await classifyFeedback(row.content, themeNames);

      await db
        .update(feedbacks)
        .set({
          sentiment: classification.sentiment,
          sentimentScore: classification.sentimentScore,
          featureArea: classification.featureArea,
          updatedAt: new Date(),
        })
        .where(eq(feedbacks.id, id));

      // Themes
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
          existingThemes.push({ name: normalizedName });
        }

        if (existingTheme) {
          await db
            .insert(feedbackThemes)
            .values({ feedbackId: id, themeId: existingTheme.id, confidence: 0.85 })
            .onConflictDoNothing();
        }
      }

      // Embedding
      const vector = generateSimpleEmbedding(row.content);
      await db
        .insert(embeddings)
        .values({ id: generateId(), feedbackId: id, vector: vectorToString(vector) })
        .onConflictDoNothing();

      successCount++;
    } catch (err) {
      console.error("Row error:", err);
      failCount++;
      rowErrors.push(`Failed to process row: ${row.content.slice(0, 50)}...`);
    }
  }

  return NextResponse.json({ successCount, failCount, errors: rowErrors });
}
