"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  User,
  Mail,
  Shield,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";
import { getProfileAction, updateProfileAction } from "@/lib/actions/user-actions";
import { Role } from "@prisma/client";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  workspaceName: string;
  workspaceSlug: string;
  createdAt: string;
}

export function ProfileSettingsClient() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await getProfileAction();
      if (res.success && res.data) {
        setProfile(res.data);
        setName(res.data.name);
        setAvatarUrl(res.data.avatarUrl || "");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (name.trim().length < 2) {
      setFeedback({ type: "error", text: "Name must be at least 2 characters long." });
      return;
    }

    startTransition(async () => {
      const res = await updateProfileAction({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Profile details updated successfully." });
        if (profile) {
          setProfile({
            ...profile,
            name: name.trim(),
            avatarUrl: avatarUrl.trim() || null,
          });
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update profile." });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs">Loading profile settings...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
        Failed to load profile details. Please refresh the page.
      </div>
    );
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const getRoleBadgeColor = (role: Role) => {
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
      <div>
        <h2 className="text-lg font-bold text-foreground">Personal Profile</h2>
        <p className="text-xs text-muted-foreground">
          Manage your account identity, display name, and avatar across NEXORA CRM.
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

      {/* Avatar & Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-surface-elevated border border-border/80">
        <div className="relative">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={profile.name}
              className="h-16 w-16 rounded-2xl object-cover border-2 border-primary/30 shadow-md"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-xl font-bold text-white shadow-md">
              {initials}
            </div>
          )}
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">{profile.name}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${getRoleBadgeColor(
                profile.role
              )}`}
            >
              <Shield className="h-3 w-3" />
              {profile.role}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{profile.email}</p>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary" />
              {profile.workspaceName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {new Date(profile.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="e.g. Alex Chen"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email Address
              <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                (Read-only)
              </span>
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full h-9 rounded-xl border border-border/50 bg-muted/40 px-3 text-xs text-muted-foreground cursor-not-allowed font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Avatar Image URL (Optional)
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="https://images.unsplash.com/..."
          />
          <p className="text-[10px] text-muted-foreground">
            Provide a publicly accessible HTTPS image link. Leave blank to use generated initials.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
