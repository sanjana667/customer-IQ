import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateId } from "@/utils/helpers";

const inviteSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
  password: z.string().min(8).default("password123"),
});

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error || !session) return error!;

  const workspaceId = session.user.workspaceId;

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.workspaceId, workspaceId));

  return NextResponse.json(members);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error || !session) return error!;

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, role, password } = parsed.data;
  const workspaceId = session.user.workspaceId;

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

  const [newUser] = await db
    .insert(users)
    .values({
      id: generateId(),
      name,
      email,
      passwordHash,
      role,
      workspaceId,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  return NextResponse.json(newUser, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error || !session) return error!;

  const workspaceId = session.user.workspaceId;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Prevent demoting self
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
  }

  const [updated] = await db
    .update(users)
    .set({ role: parsed.data.role })
    .where(and(eq(users.id, userId), eq(users.workspaceId, workspaceId)))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error || !session) return error!;

  const workspaceId = session.user.workspaceId;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 403 });
  }

  await db
    .delete(users)
    .where(and(eq(users.id, userId), eq(users.workspaceId, workspaceId)));

  return NextResponse.json({ success: true });
}
