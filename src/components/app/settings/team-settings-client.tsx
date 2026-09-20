"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  UserPlus,
  Search,
  Shield,
  Clock,
  RotateCw,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Calendar,
} from "lucide-react";
import {
  getTeamMembersAction,
  resendInvitationAction,
  cancelInvitationAction,
} from "@/lib/actions/team-actions";
import { Role } from "@prisma/client";
import { InviteMemberModal } from "./invite-member-modal";
import { RoleChangeModal } from "./role-change-modal";
import { RemoveMemberModal } from "./remove-member-modal";

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  initials: string;
  status: "ACTIVE";
  joinedAt: string;
  isCurrentUser: boolean;
}

interface InvitationItem {
  id: string;
  email: string;
  role: Role;
  status: "PENDING" | "EXPIRED";
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export function TeamSettingsClient() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [totalOwners, setTotalOwners] = useState(1);
  const [currentUserRole, setCurrentRole] = useState<Role>(Role.MEMBER);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | Role | "PENDING">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<MemberItem | null>(null);
  const [selectedMemberForRemove, setSelectedMemberForRemove] = useState<MemberItem | null>(null);

  const [isActionPending, startAction] = useTransition();

  const loadTeam = React.useCallback(async () => {
    const res = await getTeamMembersAction({
      search: search.trim() || undefined,
      role: activeFilter,
    });

    if (res.success && res.data) {
      setMembers(res.data.members);
      setInvitations(res.data.invitations);
      setTotalOwners(res.data.totalOwners);
      setCurrentRole(res.data.currentUserRole);
    }
    setIsLoading(false);
  }, [search, activeFilter]);

  useEffect(() => {
    let active = true;
    getTeamMembersAction({
      search: search.trim() || undefined,
      role: activeFilter,
    }).then((res) => {
      if (active && res.success && res.data) {
        setMembers(res.data.members);
        setInvitations(res.data.invitations);
        setTotalOwners(res.data.totalOwners);
        setCurrentRole(res.data.currentUserRole);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [search, activeFilter]);

  const handleResend = (invitationId: string) => {
    setFeedback(null);
    startAction(async () => {
      const res = await resendInvitationAction(invitationId);
      if (res.success && res.data) {
        setFeedback({
          type: "success",
          text: `Invitation refreshed for ${res.data.email}. New link: ${window.location.origin}${res.data.inviteUrl}`,
        });
        loadTeam();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to resend invitation" });
      }
    });
  };

  const handleCancelInvite = (invitationId: string) => {
    setFeedback(null);
    startAction(async () => {
      const res = await cancelInvitationAction(invitationId);
      if (res.success) {
        setFeedback({ type: "success", text: "Invitation cancelled and invalidated." });
        loadTeam();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to cancel invitation" });
      }
    });
  };

  const canInvite = currentUserRole === Role.OWNER || currentUserRole === Role.ADMIN;
  const canManageRoles = currentUserRole === Role.OWNER || currentUserRole === Role.ADMIN;
  const canRemove = currentUserRole === Role.OWNER || currentUserRole === Role.ADMIN;

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case Role.OWNER:
        return "bg-amber-500/15 border-amber-500/30 text-amber-400";
      case Role.ADMIN:
        return "bg-indigo-500/15 border-indigo-500/30 text-indigo-400";
      case Role.MANAGER:
        return "bg-sky-500/15 border-sky-500/30 text-sky-400";
      default:
        return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Team & Workspace Members</h2>
          <p className="text-xs text-muted-foreground">
            Manage authorized collaborators, RBAC access levels, and active onboarding invitations.
          </p>
        </div>

        {canInvite && (
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="break-all">{feedback.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Members" },
            { id: Role.OWNER, label: "Owners" },
            { id: Role.ADMIN, label: "Admins" },
            { id: Role.MANAGER, label: "Managers" },
            { id: Role.MEMBER, label: "Members" },
            { id: "PENDING", label: `Pending (${invitations.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as "ALL" | Role | "PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                activeFilter === tab.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-surface-elevated text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full h-9 rounded-xl border border-border bg-background pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Loading team roster...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Members Table/Cards */}
          {activeFilter !== "PENDING" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active Members ({members.length})
              </h3>

              {members.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border text-muted-foreground text-xs">
                  No active team members matching filter.
                </div>
              ) : (
                <div className="divide-y divide-border/60 rounded-2xl border border-border bg-surface-elevated overflow-hidden">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-xs font-bold text-white shadow-sm">
                            {member.initials}
                          </div>
                        )}

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {member.name}
                            </span>
                            {member.isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[9px] font-bold">
                                You
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${getRoleBadgeStyle(
                                member.role
                              )}`}
                            >
                              <Shield className="h-2.5 w-2.5" />
                              {member.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>

                        {/* Action buttons */}
                        {canManageRoles && !member.isCurrentUser && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedMemberForRole(member)}
                              className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-surface"
                            >
                              Edit Role
                            </button>
                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => setSelectedMemberForRemove(member)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Remove Member"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Invitations Section */}
          {(activeFilter === "ALL" || activeFilter === "PENDING") && invitations.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Pending Invitations ({invitations.length})</span>
              </h3>

              <div className="divide-y divide-border/60 rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground font-mono truncate">
                            {inv.email}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${getRoleBadgeStyle(
                              inv.role
                            )}`}
                          >
                            Role: {inv.role}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              inv.status === "EXPIRED"
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Invited by {inv.invitedBy} • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canInvite && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          disabled={isActionPending}
                          onClick={() => handleResend(inv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-surface disabled:opacity-50"
                        >
                          <RotateCw className="h-3 w-3" />
                          <span>Resend / Refresh</span>
                        </button>
                        <button
                          type="button"
                          disabled={isActionPending}
                          onClick={() => handleCancelInvite(inv.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                          title="Cancel Invitation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={loadTeam}
        currentUserRole={currentUserRole}
      />

      <RoleChangeModal
        isOpen={!!selectedMemberForRole}
        onClose={() => setSelectedMemberForRole(null)}
        onSuccess={loadTeam}
        member={selectedMemberForRole}
        currentUserRole={currentUserRole}
        totalOwners={totalOwners}
      />

      <RemoveMemberModal
        isOpen={!!selectedMemberForRemove}
        onClose={() => setSelectedMemberForRemove(null)}
        onSuccess={loadTeam}
        member={selectedMemberForRemove}
        otherMembers={members.filter((m) => m.userId !== selectedMemberForRemove?.userId)}
        totalOwners={totalOwners}
      />
    </div>
  );
}
