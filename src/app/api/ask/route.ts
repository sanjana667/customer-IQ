import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { answerQuestion } from "@/lib/ai/rag";
import { z } from "zod";

const askSchema = z.object({
  question: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole("VIEWER");
  if (error || !session) return error!;

  const body = await request.json();
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { question } = parsed.data;
  const workspaceId = session.user.workspaceId;

  const result = await answerQuestion(question, workspaceId);
  return NextResponse.json(result);
}
