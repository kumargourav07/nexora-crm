"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  Building2,
  Tag,
  Calendar,
  PhoneCall,
  Send,
  Sparkles,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { Lead } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConvertLeadModal } from "@/components/app/convert-lead-modal";

export interface LeadDetailPanelProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (leadId: string, newStatus: Lead["status"]) => void;
  onConversionSuccess?: () => void;
}

const STATUS_OPTIONS: Lead["status"][] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

export function LeadDetailPanel({
  lead,
  isOpen,
  onClose,
  onStatusChange,
  onConversionSuccess,
}: LeadDetailPanelProps) {
  const [activeTab, setActiveTab] = React.useState<"activity" | "details">("activity");
  const [isConvertModalOpen, setIsConvertModalOpen] = React.useState(false);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isConvertModalOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isConvertModalOpen]);

  if (!lead || !isOpen) return null;

  const handleStageSelect = (status: Lead["status"]) => {
    onStatusChange?.(lead.id, status);
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-out Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-screen max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-border/70 bg-surface-elevated/60">
                <div className="space-y-1 min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                      {lead.source}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ID: #{lead.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground truncate">
                    {lead.name}
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{lead.company}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConvertModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Convert Lead</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close detail panel"
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Status Stage Bar */}
              <div className="p-4 border-b border-border/60 bg-surface/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Lead Stage:</span>
                  <span className="font-bold text-primary">{lead.status}</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStageSelect(st)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors shrink-0",
                        lead.status === st
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "bg-surface-elevated text-muted-foreground hover:bg-surface hover:text-foreground border border-border/60"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Tabs */}
              <div className="flex border-b border-border/60 px-5">
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={cn(
                    "py-2.5 text-xs font-semibold border-b-2 transition-colors mr-6",
                    activeTab === "activity"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Activity Timeline ({lead.activities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={cn(
                    "py-2.5 text-xs font-semibold border-b-2 transition-colors",
                    activeTab === "details"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Lead Information
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5">
                {activeTab === "activity" ? (
                  <div className="space-y-4">
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {lead.activities.map((act) => (
                        <div key={act.id} className="relative space-y-1">
                          <span className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/40">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">{act.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {act.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{act.description}</p>
                          <span className="text-[10px] text-muted-foreground/70">
                            By {act.author}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-surface-elevated/50 p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">
                          Lead Valuation
                        </span>
                        <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                          {lead.value}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-surface-elevated/50 p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">
                          Assigned Rep
                        </span>
                        <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                          {lead.owner}
                        </p>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="rounded-xl border border-border bg-surface-elevated/50 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Contact Coordinates
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> Email
                          </span>
                          <a
                            href={`mailto:${lead.email}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {lead.email}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> Phone
                          </span>
                          <a
                            href={`tel:${lead.phone}`}
                            className="font-mono text-foreground hover:text-primary transition-colors"
                          >
                            {lead.phone}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" /> Ingested Date
                          </span>
                          <span className="font-mono text-foreground">{lead.createdAt}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-primary" /> Assigned Tags
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {lead.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-md border border-border/80 bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Action Footer */}
              <div className="p-4 border-t border-border/70 bg-surface-elevated/40 flex items-center gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  className="flex-1 text-xs"
                  onClick={() => setIsConvertModalOpen(true)}
                >
                  Convert to Deal & Contact
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                  className="flex-1 text-xs"
                  onClick={() => {
                    alert(`Demo Email Dispatcher: Email draft for ${lead.email}.`);
                  }}
                >
                  Send Email
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatePresence>

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        lead={{
          id: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          valueNumeric: lead.valueNumeric || 0,
          source: lead.source,
          notes: lead.notes,
        }}
        onSuccess={() => {
          setIsConvertModalOpen(false);
          onConversionSuccess?.();
        }}
      />
    </>
  );
}
