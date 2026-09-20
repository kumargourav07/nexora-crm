"use client";

import React from "react";
import { X, ScrollText, User, Laptop, Calendar, Tag } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface AuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: AuditLogEntry | null;
}

export function AuditDetailModal({ isOpen, onClose, entry }: AuditDetailModalProps) {
  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm sm:text-base">
            <ScrollText className="h-4 w-4 text-primary" />
            <span>Audit Trail Details</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action & Entity Summary */}
        <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground font-mono">
              Action: {entry.action}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary font-mono">
              {entry.entityType}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground border-t border-border/50">
            <div className="flex items-center gap-1.5 truncate">
              <User className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                {entry.user.name} ({entry.user.email})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Additional Technical Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {entry.entityId && (
            <div className="p-2.5 rounded-xl bg-background border border-border/60 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Tag className="h-3 w-3" /> Entity ID
              </span>
              <p className="font-mono text-[11px] text-foreground truncate">{entry.entityId}</p>
            </div>
          )}

          {entry.ipAddress && (
            <div className="p-2.5 rounded-xl bg-background border border-border/60 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Laptop className="h-3 w-3" /> IP / Origin
              </span>
              <p className="font-mono text-[11px] text-foreground">{entry.ipAddress}</p>
            </div>
          )}
        </div>

        {/* Payload / Changes JSON View */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Event Payload & State Delta (Sanitized)
          </label>
          <pre className="p-3.5 rounded-xl bg-background border border-border font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-56 leading-relaxed">
            {entry.metadata
              ? JSON.stringify(entry.metadata, null, 2)
              : "{\n  \"status\": \"No additional delta recorded\"\n}"}
          </pre>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
