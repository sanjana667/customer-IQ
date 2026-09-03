import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireRole("VIEWER");
  if (error || !session) return error!;

  const { id } = await params;
  const workspaceId = session.user.workspaceId;

  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.workspaceId, workspaceId)))
    .limit(1);

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireRole("ADMIN");
  if (error || !session) return error!;

  const { id } = await params;
  const workspaceId = session.user.workspaceId;

  await db
    .delete(reports)
    .where(and(eq(reports.id, id), eq(reports.workspaceId, workspaceId)));

  return NextResponse.json({ success: true });
}
