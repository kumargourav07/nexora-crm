"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  UserPlus,
  Mail,
  Shield,
  Loader2,
  Copy,
  Check,
  Info,
  AlertCircle,
} from "lucide-react";
import { inviteMemberAction } from "@/lib/actions/team-actions";
import { Role } from "@prisma/client";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: Role;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserRole,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.MEMBER);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    inviteUrl: string;
    email: string;
    emailDeliveryNote: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await inviteMemberAction({
        email: email.trim(),
        role,
        message: message.trim() || undefined,
      });

      if (res.success && res.data) {
        setInviteResult({
          inviteUrl: `${window.location.origin}${res.data.inviteUrl}`,
          email: res.data.email,
          emailDeliveryNote: res.data.emailDeliveryNote,
        });
        onSuccess();
      } else {
        setError(res.error || "Failed to create invitation");
      }
    });
  };

  const handleCopyLink = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleResetAndClose = () => {
    setEmail("");
    setRole(Role.MEMBER);
    setMessage("");
    setError(null);
    setInviteResult(null);
    onClose();
  };

  const canInviteOwner = currentUserRole === Role.OWNER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm sm:text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            <span>Invite Team Member</span>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {inviteResult ? (
          /* Success Screen with Copy Link */
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
              <span className="font-bold text-xs block">Invitation Created Successfully</span>
              <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                An invitation for <strong className="text-white">{inviteResult.email}</strong> has been generated and expires in 7 days.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{inviteResult.emailDeliveryNote}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Direct Invitation URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteResult.inviteUrl}
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-mono text-foreground select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shrink-0 shadow-sm"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{isCopied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-foreground hover:bg-surface-hover"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Member Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="colleague@company.com"
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                Role & Permissions
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value={Role.MEMBER}>MEMBER — Normal CRM usage & lead management</option>
                <option value={Role.MANAGER}>MANAGER — Full CRM operations, employee & lead management</option>
                <option value={Role.ADMIN}>ADMIN — Team invites, integrations & workspace settings</option>
                {canInviteOwner && (
                  <option value={Role.OWNER}>OWNER — Full workspace ownership & danger zone access</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Optional Welcome Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Hey, please join our team workspace on NEXORA CRM..."
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating Invite...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Send Invitation</span>
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
