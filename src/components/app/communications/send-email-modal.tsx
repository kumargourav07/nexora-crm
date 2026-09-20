"use client";

import * as React from "react";
import { Mail, Send, Sparkles, AlertCircle, Info, X, Check, FileText } from "lucide-react";
import { sendEmailAction, getTemplatesAction } from "@/lib/actions/communications-actions";

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialLeadId?: string;
  initialContactId?: string;
  initialDealId?: string;
  initialRecipientEmail?: string;
  leads?: Array<{ id: string; name: string; email?: string | null }>;
  deals?: Array<{ id: string; name: string }>;
}

export function SendEmailModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialContactId,
  initialDealId,
  initialRecipientEmail,
  leads = [],
  deals = [],
}: SendEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = React.useState(initialRecipientEmail || "");
  const [subject, setSubject] = React.useState("");
  const [content, setContent] = React.useState("");
  const [selectedLeadId, setSelectedLeadId] = React.useState(initialLeadId || "");
  const [selectedDealId, setSelectedDealId] = React.useState(initialDealId || "");
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [providerNotice, setProviderNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialLeadId) setSelectedLeadId(initialLeadId);
    if (initialDealId) setSelectedDealId(initialDealId);
    if (initialRecipientEmail) setRecipientEmail(initialRecipientEmail);
  }, [initialLeadId, initialDealId, initialRecipientEmail]);

  // Load available templates
  React.useEffect(() => {
    if (isOpen) {
      getTemplatesAction().then((res) => {
        if (res.success && res.data) {
          setTemplates(res.data.filter((t: any) => t.type === "EMAIL"));
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      if (tmpl.subject) setSubject(tmpl.subject);
      if (tmpl.body) setContent(tmpl.body);
    }
  }

  function insertVariable(variable: string) {
    setContent((prev) => prev + ` {{${variable}}} `);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      setError("Please provide recipient email");
      return;
    }
    if (!subject.trim() || !content.trim()) {
      setError("Subject and email body are required");
      return;
    }

    setLoading(true);
    setError(null);
    setProviderNotice(null);

    const res = await sendEmailAction({
      recipientEmail: recipientEmail.trim(),
      subject: subject.trim(),
      content: content.trim(),
      leadId: selectedLeadId || undefined,
      dealId: selectedDealId || undefined,
      templateId: selectedTemplateId || undefined,
    });

    setLoading(false);

    if (res.success) {
      if (res.providerNotice) {
        // Show honest provider notice before closing or in callback
        setProviderNotice(res.providerNotice);
      }
      setTimeout(() => {
        setSubject("");
        setContent("");
        onClose();
        if (onSuccess) onSuccess();
      }, res.providerNotice ? 2500 : 400);
    } else {
      setError(res.error || "Failed to send email");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Mail className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Compose & Send Email</h2>
              <p className="text-xs text-muted-foreground">Variable placeholders & template engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {providerNotice && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2 animate-in fade-in">
              <Info className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Email Logged:</strong> {providerNotice}
              </span>
            </div>
          )}

          {/* Template Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3 w-3 text-emerald-400" />
                Quick Template
              </label>
              <span className="text-[10px] text-muted-foreground">Optional auto-fill</span>
            </div>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">-- Choose a template or write custom --</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recipient Email <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="email"
              placeholder="client@acme.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Associated Entity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Link to Lead
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => {
                  setSelectedLeadId(e.target.value);
                  const found = leads.find((l) => l.id === e.target.value);
                  if (found?.email && !recipientEmail) setRecipientEmail(found.email);
                }}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">-- None / General --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.email ? `(${l.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Link to Deal
              </label>
              <select
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">-- None / General --</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Subject Line <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Next steps regarding proposal for {{lead.company}}"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Variable Chips helper */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Click to insert smart variable tokens:
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["lead.name", "lead.company", "deal.title", "deal.value", "sender.name", "workspace.name"].map(
                (v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 rounded-lg border border-border bg-surface-elevated hover:border-primary/50 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + {`{{${v}}}`}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Email Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email Body <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={5}
              placeholder="Dear {{lead.name}},&#10;&#10;Thank you for taking the time to speak with us..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-none font-sans"
            />
          </div>

          {/* Provider Transparency Warning */}
          <div className="p-2.5 rounded-xl border border-border/80 bg-surface-elevated/50 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              If production SMTP credentials are not configured in environment variables, email will be logged to CRM activity timeline and flagged as <code>NOT_CONFIGURED</code> without fake delivery.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {loading ? "Dispatching..." : "Send Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
