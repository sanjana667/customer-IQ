import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateId } from "@/utils/helpers";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(1).max(255),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, workspaceName } = parsed.data;

  // Check if email already exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const workspaceId = generateId();
  const userId = generateId();

  // Create workspace and admin user
  await db.insert(workspaces).values({
    id: workspaceId,
    name: workspaceName,
  });

  await db.insert(users).values({
    id: userId,
    name,
    email,
    passwordHash,
    role: "ADMIN",
    workspaceId,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
