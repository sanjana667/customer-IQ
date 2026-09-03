import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, themes, feedbackThemes, embeddings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { classifyFeedback } from "@/lib/ai/classification";
import { generateSimpleEmbedding, vectorToString } from "@/lib/ai/embeddings";
import { generateId } from "@/utils/helpers";

const SAMPLE_FEEDBACKS = [
  {
    content: "The onboarding flow is confusing. I spent 20 minutes trying to figure out how to connect my first integration.",
    channel: "support",
    customerLabel: "Enterprise Customer",
  },
  {
    content: "Love the new dashboard! The charts are much clearer and the data loads instantly. Great improvement!",
    channel: "appstore",
    customerLabel: "SMB User",
  },
  {
    content: "Billing is a nightmare. I was charged twice this month and it took 3 days to get a response from support.",
    channel: "support",
    customerLabel: "Pro Plan",
  },
  {
    content: "The mobile app crashes every time I try to export a report. This needs to be fixed ASAP.",
    channel: "appstore",
    customerLabel: "Mobile User",
  },
  {
    content: "NPS Score: 9. Overall very happy with the product. The analytics features save us hours every week.",
    channel: "nps",
    customerLabel: "Enterprise Client",
  },
  {
    content: "Would love to see Slack integration. Currently we have to manually check for new feedback.",
    channel: "community",
    customerLabel: "Power User",
  },
  {
    content: "The search functionality is terrible. Can't find anything. Need better filters.",
    channel: "support",
    customerLabel: "Analyst",
  },
  {
    content: "Your pricing just went up 40% with no warning. Considering switching to a competitor.",
    channel: "sales",
    customerLabel: "Mid-market",
  },
];

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole("ANALYST");
  if (error || !session) return error!;

  const workspaceId = session.user.workspaceId;

  // Get existing themes
  const existingThemes = await db
    .select({ name: themes.name })
    .from(themes)
    .where(eq(themes.workspaceId, workspaceId));

  const results = [];

  for (const sample of SAMPLE_FEEDBACKS) {
    try {
      const id = generateId();
      // Add some date variance (last 30 days)
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      await db.insert(feedbacks).values({
        id,
        content: sample.content,
        channel: sample.channel,
        customerLabel: sample.customerLabel,
        workspaceId,
        status: "NEW",
        createdAt,
        updatedAt: new Date(),
      });

      // Classify
      const themeNames = existingThemes.map((t) => t.name);
      const classification = await classifyFeedback(sample.content, themeNames);

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
          const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];
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
            .values({ feedbackId: id, themeId: existingTheme.id, confidence: 0.88 })
            .onConflictDoNothing();
        }
      }

      // Embedding
      const vector = generateSimpleEmbedding(sample.content);
      await db
        .insert(embeddings)
        .values({ id: generateId(), feedbackId: id, vector: vectorToString(vector) })
        .onConflictDoNothing();

      results.push({ id, success: true, content: sample.content.slice(0, 50) });
    } catch (err) {
      console.error("Simulate error:", err);
      results.push({ success: false, content: sample.content.slice(0, 50) });
    }
  }

  return NextResponse.json({ results, count: results.filter((r) => r.success).length });
}
