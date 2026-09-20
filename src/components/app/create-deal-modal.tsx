"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Briefcase,
  AlertCircle,
  Plus,
} from "lucide-react";
import { createDealAction } from "@/lib/actions/deals-actions";
import { getPipelinesAction } from "@/lib/actions/pipelines-actions";
import { getContactsAction } from "@/lib/actions/contacts-actions";
import { getCompaniesAction } from "@/lib/actions/companies-actions";
import { getWorkspaceTeamAction } from "@/lib/actions/team-actions";
import { LeadSource, TaskPriority } from "@prisma/client";

export interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPipelineId?: string;
  initialStageId?: string;
}

export function CreateDealModal({
  isOpen,
  onClose,
  onSuccess,
  initialPipelineId,
  initialStageId,
}: CreateDealModalProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState<number>(100000);
  const [currency, setCurrency] = useState("INR");
  const [probability, setProbability] = useState<number>(20);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [pipelineId, setPipelineId] = useState(initialPipelineId || "");
  const [stageId, setStageId] = useState(initialStageId || "");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [source, setSource] = useState<LeadSource>(LeadSource.WEBSITE);
  const [description, setDescription] = useState("");

  const [pipelines, setPipelines] = useState<
    { id: string; name: string; stages: { id: string; name: string; probability: number }[] }[]
  >([]);
  const [contacts, setContacts] = useState<{ id: string; fullName: string; email: string | null }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);

      // Default expected close date = +30 days
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setExpectedCloseDate(d.toISOString().split("T")[0]);

      Promise.all([
        getPipelinesAction(),
        getContactsAction({ limit: 100 }),
        getCompaniesAction({ limit: 100 }),
        getWorkspaceTeamAction(),
      ])
        .then(([pipRes, conRes, compRes, teamRes]) => {
          if (pipRes.success && pipRes.data?.pipelines) {
            setPipelines(pipRes.data.pipelines);
            const activePip =
              pipRes.data.pipelines.find((p) => p.id === initialPipelineId) ||
              pipRes.data.pipelines.find((p) => p.isDefault) ||
              pipRes.data.pipelines[0];

            if (activePip) {
              setPipelineId(activePip.id);
              const activeStage =
                activePip.stages.find((s) => s.id === initialStageId) || activePip.stages[0];
              if (activeStage) {
                setStageId(activeStage.id);
                setProbability(activeStage.probability);
              }
            }
          }

          if (conRes.success && conRes.data?.contacts) {
            setContacts(conRes.data.contacts);
          }

          if (compRes.success && compRes.data?.companies) {
            setCompanies(compRes.data.companies);
          }

          if (teamRes.success && teamRes.data?.members) {
            setTeamMembers(
              teamRes.data.members.map((m) => ({ id: m.userId, name: m.name }))
            );
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, initialPipelineId, initialStageId]);

  if (!isOpen) return null;

  const handlePipelineChange = (newPipId: string) => {
    setPipelineId(newPipId);
    const p = pipelines.find((pipe) => pipe.id === newPipId);
    if (p && p.stages.length > 0) {
      setStageId(p.stages[0].id);
      setProbability(p.stages[0].probability);
    }
  };

  const handleStageChange = (newStageId: string) => {
    setStageId(newStageId);
    const p = pipelines.find((pipe) => pipe.id === pipelineId);
    const stage = p?.stages.find((s) => s.id === newStageId);
    if (stage) {
      setProbability(stage.probability);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Deal name is required.");
      return;
    }
    if (!pipelineId || !stageId) {
      setError("Please select a valid pipeline and stage.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createDealAction({
        name: name.trim(),
        value: Number(value) || 0,
        currency: currency as "INR" | "USD" | "EUR" | "GBP",
        probability: Number(probability),
        priority,
        pipelineId,
        stageId,
        contactId: contactId || undefined,
        companyId: companyId || undefined,
        ownerId: ownerId || undefined,
        expectedCloseDate: expectedCloseDate || undefined,
        source,
        description: description.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to create deal.");
      } else {
        onSuccess?.();
        onClose();
      }
    } catch {
      setError("An unexpected error occurred while creating deal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-elevated">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Create Deal / Opportunity</h2>
              <p className="text-xs text-muted-foreground">
                Track revenue, forecast stage probability, and assign ownership
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Deal Name */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Deal Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Cloud Deployment"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Value & Currency & Probability */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Value *
              </label>
              <input
                type="number"
                min="0"
                required
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Win Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Pipeline & Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Pipeline *
              </label>
              <select
                value={pipelineId}
                onChange={(e) => handlePipelineChange(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Stage *
              </label>
              <select
                value={stageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {pipelines
                  .find((p) => p.id === pipelineId)
                  ?.stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.probability}%)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Priority & Lead Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Lead Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="WEBSITE">Website</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="INDIAMART">IndiaMART</option>
                <option value="NINETY_NINE_ACRES">99acres</option>
                <option value="HOUSING">Housing.com</option>
                <option value="GOOGLE_ADS">Google Ads</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Contact & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Contact (Optional)
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">-- No Contact --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Company (Optional)
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">-- No Company --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Owner & Close Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Owner
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Current User</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Expected Close Date
              </label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key requirements, client scope, proposal summary..."
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Deal...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Deal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
