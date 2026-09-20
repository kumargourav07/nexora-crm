"use client";

import React, { useState, useTransition } from "react";
import { X, UserMinus, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { removeMemberAction } from "@/lib/actions/team-actions";
import { Role } from "@prisma/client";

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: {
    userId: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  otherMembers: {
    userId: string;
    name: string;
    email: string;
    role: Role;
  }[];
  totalOwners: number;
}

export function RemoveMemberModal({
  isOpen,
  onClose,
  onSuccess,
  member,
  otherMembers,
  totalOwners,
}: RemoveMemberModalProps) {
  const [reassignToUserId, setReassignToUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !member) return null;

  const isTargetLastOwner = member.role === Role.OWNER && totalOwners <= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await removeMemberAction({
        targetUserId: member.userId,
        reassignToUserId: reassignToUserId || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to remove member");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm sm:text-base">
            <UserMinus className="h-4 w-4" />
            <span>Remove Team Member</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Revoke workspace access for <strong className="text-foreground">{member.name}</strong> ({member.email}). Their user account and historical activity records will be preserved.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isTargetLastOwner ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4" />
              <span>Cannot Remove Last Owner</span>
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              This workspace must always have at least one Owner. Please promote another member to Owner before removing this user.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Reassign Active Leads & Tasks to:
              </label>
              <select
                value={reassignToUserId}
                onChange={(e) => setReassignToUserId(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Leave unassigned</option>
                {otherMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} ({m.role}) — {m.email}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Assigned deals and open tasks will be seamlessly handed over to the selected colleague.
              </p>
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
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="h-3.5 w-3.5" />
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
