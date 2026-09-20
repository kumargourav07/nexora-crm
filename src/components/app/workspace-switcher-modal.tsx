"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Building2,
  Check,
  Loader2,
  Shield,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import {
  getUserWorkspacesAction,
  switchWorkspaceAction,
} from "@/lib/actions/workspace-actions";
import { Role } from "@prisma/client";

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role: Role;
  isCurrent: boolean;
}

interface WorkspaceSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceSwitcherModal({
  isOpen,
  onClose,
}: WorkspaceSwitcherModalProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    if (isOpen) {
      getUserWorkspacesAction().then((res) => {
        if (active) {
          if (res.success && res.data) {
            setWorkspaces(res.data);
          }
          setIsLoading(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitch = (workspaceId: string) => {
    setSwitchingId(workspaceId);
    startTransition(async () => {
      const res = await switchWorkspaceAction(workspaceId);
      if (res.success && res.data) {
        onClose();
        router.refresh();
        router.push(res.data.redirectUrl);
      }
      setSwitchingId(null);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm sm:text-base">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Switch Workspace</span>
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
          Select an active workspace to switch tenant context and refresh all CRM data.
        </p>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading your workspaces...</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                disabled={ws.isCurrent || isPending}
                onClick={() => handleSwitch(ws.id)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${
                  ws.isCurrent
                    ? "bg-primary/10 border-primary/30 text-foreground cursor-default"
                    : "bg-surface border-border hover:bg-surface-hover hover:border-border/80 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      ws.isCurrent ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">{ws.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="font-mono">slug: {ws.slug}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                        <Shield className="h-2.5 w-2.5" />
                        {ws.role}
                      </span>
                    </div>
                  </div>
                </div>

                {ws.isCurrent ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shrink-0">
                    <Check className="h-3 w-3" />
                    <span>Current</span>
                  </span>
                ) : switchingId === ws.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/signup");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Create New Workspace</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
