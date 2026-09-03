"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { formatDate } from "@/utils/helpers";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-red-400 bg-red-900/30",
  ANALYST: "text-yellow-400 bg-yellow-900/30",
  VIEWER: "text-green-400 bg-green-900/30",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "VIEWER" as "ADMIN" | "ANALYST" | "VIEWER",
    password: "password123",
  });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Redirect non-admins
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    fetch("/api/workspace/members")
      .then((r) => r.json())
      .then((d) => {
        setMembers(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError("");

    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });

    const data = await res.json();

    if (!res.ok) {
      setInviteError(data.error || "Failed to invite");
      setInviting(false);
      return;
    }

    setMembers((prev) => [...prev, data]);
    setInviteForm({ name: "", email: "", role: "VIEWER", password: "password123" });
    setShowInvite(false);
    setInviting(false);
  }

  async function handleRoleChange(userId: string, role: string) {
    const res = await fetch(`/api/workspace/members?userId=${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role: updated.role } : m)));
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the workspace?")) return;
    await fetch(`/api/workspace/members?userId=${userId}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.id !== userId));
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <>
      <Header
        title="Workspace Settings"
        subtitle="Manage team members and permissions"
        actions={
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
          >
            + Invite Member
          </button>
        }
      />

      <main className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Workspace info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Workspace</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-900 rounded-xl flex items-center justify-center">
              <span className="text-indigo-300 font-bold">
                {session?.user?.workspaceName?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-white font-medium">{session?.user?.workspaceName}</div>
              <div className="text-xs text-slate-500">ID: {session?.user?.workspaceId}</div>
            </div>
          </div>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="john@company.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Initial Password</label>
                  <input
                    type="text"
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {inviteError && (
                <div className="text-red-400 text-sm">{inviteError}</div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  {inviting ? "Inviting..." : "Invite"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Members table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-medium text-slate-300">Team Members ({members.length})</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase">Member</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase">Joined</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-300">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {member.id === session?.user?.id ? (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${ROLE_COLORS[member.role] ?? ""}`}>
                          {member.role} (you)
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded font-medium border-0 focus:outline-none cursor-pointer ${ROLE_COLORS[member.role] ?? ""}`}
                        >
                          <option value="VIEWER">VIEWER</option>
                          <option value="ANALYST">ANALYST</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {member.id !== session?.user?.id && (
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Role descriptions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Role Permissions</h3>
          <div className="space-y-3">
            {[
              { role: "ADMIN", color: "text-red-400", desc: "Full access: manage members, generate reports, ingest and manage all feedback" },
              { role: "ANALYST", color: "text-yellow-400", desc: "Can ingest feedback, upload CSVs, change statuses, generate reports. Cannot manage members." },
              { role: "VIEWER", color: "text-green-400", desc: "Read-only: view dashboard, feedback, themes, reports. Cannot make changes." },
            ].map(({ role, color, desc }) => (
              <div key={role} className="flex gap-3">
                <span className={`text-xs font-bold ${color} w-16 mt-0.5`}>{role}</span>
                <span className="text-xs text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
