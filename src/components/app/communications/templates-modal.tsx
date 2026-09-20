"use client";

import * as React from "react";
import { FileText, Plus, Trash2, Edit2, Sparkles, Check, X, AlertCircle } from "lucide-react";
import { CommunicationType } from "@/lib/validations/communications";
import {
  getTemplatesAction,
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "@/lib/actions/communications-actions";

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: any) => void;
}

export function TemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatesModalProps) {
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = React.useState<any | null>(null);
  const [isCreating, setIsCreating] = React.useState<boolean>(false);

  // Form states
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CommunicationType>(CommunicationType.EMAIL);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchTemplates = React.useCallback(async () => {
    setLoading(true);
    const res = await getTemplatesAction();
    if (res.success && res.data) {
      setTemplates(res.data);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  if (!isOpen) return null;

  function startCreate() {
    setEditingTemplate(null);
    setName("");
    setType(CommunicationType.EMAIL);
    setSubject("");
    setBody("");
    setError(null);
    setIsCreating(true);
  }

  function startEdit(tmpl: any) {
    setEditingTemplate(tmpl);
    setName(tmpl.name);
    setType(tmpl.type);
    setSubject(tmpl.subject || "");
    setBody(tmpl.body);
    setError(null);
    setIsCreating(true);
  }

  function insertVariable(v: string) {
    setBody((prev) => prev + ` {{${v}}} `);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) {
      setError("Template name and body content are required");
      return;
    }

    setActionLoading(true);
    setError(null);

    let res;
    if (editingTemplate) {
      res = await updateTemplateAction({
        id: editingTemplate.id,
        name: name.trim(),
        type,
        subject: subject.trim() || undefined,
        body: body.trim(),
        isActive: true,
      });
    } else {
      res = await createTemplateAction({
        name: name.trim(),
        type,
        subject: subject.trim() || undefined,
        body: body.trim(),
        isActive: true,
      });
    }

    setActionLoading(false);

    if (res.success) {
      setIsCreating(false);
      setEditingTemplate(null);
      fetchTemplates();
    } else {
      setError(res.error || "Failed to save template");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    const res = await deleteTemplateAction(id);
    if (res.success) {
      fetchTemplates();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Communication Templates</h2>
              <p className="text-xs text-muted-foreground">Standardize outreach across your sales team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {isCreating ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Back to list
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Template Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Lead Qualification Follow-up"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Channel Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as CommunicationType)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value={CommunicationType.EMAIL}>Email</option>
                    <option value={CommunicationType.WHATSAPP}>WhatsApp</option>
                    <option value={CommunicationType.SMS}>SMS</option>
                  </select>
                </div>
              </div>

              {type === CommunicationType.EMAIL && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Quick follow-up regarding {{lead.company}}"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {/* Variable Helper Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Smart Variable Placeholders
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "lead.name",
                    "lead.company",
                    "contact.name",
                    "deal.title",
                    "deal.value",
                    "invoice.invoiceNumber",
                    "invoice.balanceAmount",
                    "meeting.title",
                    "meeting.start",
                    "sender.name",
                    "workspace.name",
                  ].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2 py-0.5 rounded-lg border border-border bg-surface-elevated hover:border-primary/50 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                    >
                      + {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Template Content <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Hi {{lead.name}},&#10;&#10;Thank you for reaching out..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated p-3 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {actionLoading ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {templates.length} templates available
                </span>
                <button
                  type="button"
                  onClick={startCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Template
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
                  Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No templates found. Click "New Template" to create one.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {templates.map((tmpl) => {
                    const parsedVars = tmpl.variables ? JSON.parse(tmpl.variables) : [];
                    return (
                      <div
                        key={tmpl.id}
                        className="rounded-xl border border-border/80 bg-surface-elevated p-3.5 space-y-2 hover:border-border transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                {tmpl.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-surface border border-border text-muted-foreground">
                                {tmpl.type}
                              </span>
                            </div>
                            {tmpl.subject && (
                              <p className="text-[11px] font-medium text-muted-foreground truncate">
                                Subject: {tmpl.subject}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {onSelectTemplate && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectTemplate(tmpl);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[11px] font-semibold transition-all"
                              >
                                Use
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEdit(tmpl)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tmpl.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 font-mono bg-surface p-2 rounded-lg border border-border/50">
                          {tmpl.body}
                        </p>

                        {parsedVars.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {parsedVars.map((v: string) => (
                              <span
                                key={v}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border/60 text-muted-foreground"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
