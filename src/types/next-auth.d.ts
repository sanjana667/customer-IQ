import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      workspaceId: string;
      workspaceName: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    workspaceId: string;
    workspaceName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    workspaceId?: string;
    workspaceName?: string;
  }
}
