"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Shield,
  KeyRound,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  updatePasswordAction,
  getSessionSecurityInfoAction,
} from "@/lib/actions/user-actions";

interface SessionInfo {
  ipAddress: string;
  device: string;
  role: string;
  workspace: string;
  expiresAt: string;
  isCurrent: boolean;
}

export function SecuritySettingsClient() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await getSessionSecurityInfoAction();
      if (res.success && res.data) {
        setSessionInfo(res.data.currentSession);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 8) {
      setFeedback({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setFeedback({
        type: "error",
        text: "New password must contain both letters and numbers.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    startTransition(async () => {
      const res = await updatePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Your password has been changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update password." });
      }
    });
  };

  const hasLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Security & Session Management</h2>
        <p className="text-xs text-muted-foreground">
          Update account credentials, inspect authentication sessions, and review cryptographic security status.
        </p>
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
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Password Change Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-elevated border border-border/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Change Account Password</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{showPasswords ? "Hide" : "Show"} Passwords</span>
          </button>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Current Password</label>
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">New Password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Password Strength Checklist */}
          {newPassword && (
            <div className="p-3 rounded-xl bg-background/50 border border-border/40 space-y-1.5 text-[11px]">
              <span className="font-semibold text-muted-foreground">Password requirements:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
                <span
                  className={`flex items-center gap-1.5 ${
                    hasLength ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  <Check className="h-3 w-3" /> 8+ characters
                </span>
                <span
                  className={`flex items-center gap-1.5 ${
                    hasLetter ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  <Check className="h-3 w-3" /> Includes letters
                </span>
                <span
                  className={`flex items-center gap-1.5 ${
                    hasNumber ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  <Check className="h-3 w-3" /> Includes numbers
                </span>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Active Session Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-elevated border border-border/80 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Laptop className="h-4 w-4 text-emerald-400" />
          <span>Active Authenticated Session</span>
        </div>

        {isLoading ? (
          <div className="py-4 flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Loading session data...</span>
          </div>
        ) : sessionInfo ? (
          <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{sessionInfo.device}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Now
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                IP: {sessionInfo.ipAddress} • Workspace: {sessionInfo.workspace} ({sessionInfo.role})
              </p>
              <p className="text-[10px] text-muted-foreground">
                Session token valid until {new Date(sessionInfo.expiresAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>HTTP-Only JWE</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
