"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Shield,
  UserCheck,
  Lock,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  validateInvitationTokenAction,
  acceptInvitationAction,
} from "@/lib/actions/team-actions";
import { Role } from "@prisma/client";

interface InvitationInfo {
  email: string;
  role: Role;
  workspaceName: string;
  workspaceSlug: string;
  invitedByName: string;
  isExistingUser: boolean;
  existingUserName: string | null;
  expiresAt: string;
}

export function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const [inviteInfo, setInviteInfo] = useState<InvitationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  useEffect(() => {
    async function validate() {
      setIsLoading(true);
      setError(null);
      const res = await validateInvitationTokenAction(token);
      if (res.success && res.data) {
        setInviteInfo(res.data);
        if (res.data.existingUserName) {
          setName(res.data.existingUserName);
        }
      } else {
        setError(res.error || "Invalid or expired invitation link.");
      }
      setIsLoading(false);
    }
    validate();
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startSubmit(async () => {
      const res = await acceptInvitationAction({
        token,
        name: name.trim() || undefined,
        password: password || undefined,
      });

      if (res.success && res.data) {
        router.push(res.data.redirectUrl);
      } else {
        setFormError(res.error || "Failed to join workspace.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
              <span className="text-sm font-black font-mono">◈</span>
            </div>
            <span className="text-lg font-black tracking-wider">NEXORA CRM</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Workspace Team Invitation
          </h1>
        </div>

        {/* Card Container */}
        <div className="mt-6 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-2xl shadow-black/40">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs font-medium">Validating cryptographic invitation token...</span>
            </div>
          ) : error ? (
            /* Error State */
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Invitation Unavailable</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  className="w-full py-2.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 text-center"
                >
                  Go to Sign In
                </Link>
                <Link
                  href="/"
                  className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground text-center"
                >
                  Return to Homepage
                </Link>
              </div>
            </div>
          ) : inviteInfo ? (
            /* Valid Invitation Form */
            <div className="space-y-6">
              {/* Workspace Invitation Banner */}
              <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>{inviteInfo.workspaceName}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">{inviteInfo.invitedByName}</strong> has invited you to collaborate with role{" "}
                  <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                    <Shield className="h-2.5 w-2.5" />
                    {inviteInfo.role}
                  </span>
                </p>
                <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/50">
                  Invited Email: <span className="text-foreground font-semibold">{inviteInfo.email}</span>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!inviteInfo.isExistingUser && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g. Maya Patel"
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    {inviteInfo.isExistingUser ? "Enter Your Account Password" : "Create Account Password"}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  {!inviteInfo.isExistingUser && (
                    <p className="text-[10px] text-muted-foreground">
                      Minimum 8 characters with letters & numbers.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Joining Workspace...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Accept Invitation & Join</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <p className="text-[11px] text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline font-semibold">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
