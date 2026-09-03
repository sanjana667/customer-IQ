import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, feedbackThemes, themes } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { updateFeedbackStatusSchema } from "@/lib/validations/feedback";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireRole("VIEWER");
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

  const themeLinks = await db
    .select({ name: themes.name, color: themes.color, confidence: feedbackThemes.confidence })
    .from(feedbackThemes)
    .innerJoin(themes, eq(feedbackThemes.themeId, themes.id))
    .where(eq(feedbackThemes.feedbackId, id));

  return NextResponse.json({ ...feedback, themes: themeLinks });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireRole("ANALYST");
  if (error || !session) return error!;

  const { id } = await params;
  const workspaceId = session.user.workspaceId;

  const body = await request.json();
  const parsed = updateFeedbackStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [feedback] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(and(eq(feedbacks.id, id), eq(feedbacks.workspaceId, workspaceId)))
    .limit(1);

  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(feedbacks)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(feedbacks.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireRole("ADMIN");
  if (error || !session) return error!;

  const { id } = await params;
  const workspaceId = session.user.workspaceId;

  const [feedback] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(and(eq(feedbacks.id, id), eq(feedbacks.workspaceId, workspaceId)))
    .limit(1);

  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(feedbacks).where(eq(feedbacks.id, id));
  return NextResponse.json({ success: true });
}
