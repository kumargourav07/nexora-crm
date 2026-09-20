"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  Plus,
  Loader2,
  AlertCircle,
  TrendingUp,
  User,
  CheckCircle2,
} from "lucide-react";
import { createDealAction } from "@/lib/actions/deals-actions";
import { getPipelinesAction } from "@/lib/actions/pipelines-actions";
import { getContactsAction } from "@/lib/actions/contacts-actions";
import { getCompaniesAction } from "@/lib/actions/companies-actions";
import { getWorkspaceTeamAction } from "@/lib/actions/team-actions";
import { LeadSource, TaskPriority } from "@prisma/client";

export function CreateDealClient() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [value, setValue] = useState<number>(250000);
  const [currency, setCurrency] = useState("INR");
  const [probability, setProbability] = useState<number>(25);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Default close date = +30 days
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
          const defPip = pipRes.data.pipelines.find((p) => p.isDefault) || pipRes.data.pipelines[0];
          if (defPip) {
            setPipelineId(defPip.id);
            if (defPip.stages.length > 0) {
              setStageId(defPip.stages[0].id);
              setProbability(defPip.stages[0].probability);
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
          setTeamMembers(teamRes.data.members.map((m) => ({ id: m.userId, name: m.name })));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

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
      setError("Please select a pipeline and stage.");
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
      } else if (res.data?.id) {
        router.push(`/app/deals/${res.data.id}`);
      } else {
        router.push("/app/deals");
      }
    } catch {
      setError("An unexpected error occurred while creating deal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const weightedValue = Math.round((Number(value || 0) * Number(probability || 0)) / 100);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Loading deal creator...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/app/deals"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Deals</span>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Create New Deal</h1>
          <p className="text-xs text-muted-foreground">
            Configure pipeline opportunity, expected revenue, and stage progression.
          </p>
        </div>

        {/* Live Forecast Preview Widget */}
        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-surface-elevated border border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                Expected Value
              </p>
              <p className="text-xs font-bold text-foreground font-mono">
                ₹{weightedValue.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Probability</p>
            <p className="text-xs font-bold text-primary font-mono">{probability}%</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deal Basics Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <span>Opportunity Details</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Deal Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enterprise Cloud ERP Implementation"
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Deal Value (₹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pipeline & Stage Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Pipeline & Stage Progression</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Pipeline *
              </label>
              <select
                value={pipelineId}
                onChange={(e) => handlePipelineChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Stage *
              </label>
              <select
                value={stageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
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

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Win Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Association & Assignment Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            <span>Association, Priority & Ownership</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Contact Person (Optional)
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">-- No Linked Contact --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Company / Organization (Optional)
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">-- No Linked Company --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Lead Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
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

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Deal Owner
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
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
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Expected Close Date
              </label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Description / Scope Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key requirements, client pain points, timeline constraints..."
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/app/deals"
            className="px-5 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Deal...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Save & Create Deal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
