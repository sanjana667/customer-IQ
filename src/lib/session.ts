import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireRole(minRole: "VIEWER" | "ANALYST" | "ADMIN") {
  const { session, error } = await requireAuth();
  if (error || !session) return { session: null, error };

  const roleOrder = { VIEWER: 0, ANALYST: 1, ADMIN: 2 };
  const userRole = session.user.role as "VIEWER" | "ANALYST" | "ADMIN";
  
  if (roleOrder[userRole] < roleOrder[minRole]) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 }),
    };
  }
  return { session, error: null };
}
