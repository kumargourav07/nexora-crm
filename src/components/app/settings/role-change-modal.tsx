"use client";

import React, { useState, useTransition } from "react";
import { X, Shield, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { changeRoleAction } from "@/lib/actions/team-actions";
import { Role } from "@prisma/client";

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: {
    userId: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  currentUserRole: Role;
  totalOwners: number;
}

export function RoleChangeModal({
  isOpen,
  onClose,
  onSuccess,
  member,
  currentUserRole,
  totalOwners,
}: RoleChangeModalProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !member) return null;

  const newRole = selectedRole !== null ? selectedRole : member.role;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newRole === member.role) {
      onClose();
      return;
    }

    startTransition(async () => {
      const res = await changeRoleAction({
        targetUserId: member.userId,
        newRole,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to update role");
      }
    });
  };

  const isOwner = currentUserRole === Role.OWNER;
  const isTargetLastOwner = member.role === Role.OWNER && totalOwners <= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm sm:text-base">
            <Shield className="h-4 w-4 text-primary" />
            <span>Change Workspace Role</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Member Info */}
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-foreground">{member.name}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{member.email}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
            Current: {member.role}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isTargetLastOwner && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            ⚠️ This member is the only Owner in the workspace. You must promote another member to Owner before demoting them.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Select New Role</label>
            <select
              value={newRole}
              disabled={isTargetLastOwner}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              <option value={Role.MEMBER}>MEMBER — Normal CRM usage</option>
              <option value={Role.MANAGER}>MANAGER — Leads, tasks, workforce & analytics</option>
              <option value={Role.ADMIN}>ADMIN — Team invites, integrations & settings</option>
              {isOwner && <option value={Role.OWNER}>OWNER — Full workspace ownership</option>}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (isTargetLastOwner && newRole !== Role.OWNER)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating Role...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Role</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
