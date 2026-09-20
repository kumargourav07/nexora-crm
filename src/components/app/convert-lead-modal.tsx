"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Building2,
  Contact as ContactIcon,
  Briefcase,
  AlertCircle,
  Link2,
} from "lucide-react";
import { convertLeadAction } from "@/lib/actions/conversion-actions";
import { getPipelinesAction } from "@/lib/actions/pipelines-actions";
import { checkDuplicateContactAction } from "@/lib/actions/contacts-actions";
import { checkDuplicateCompanyAction } from "@/lib/actions/companies-actions";

export interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    valueNumeric: number;
    source: string;
    notes?: string | null;
    isConverted?: boolean;
  } | null;
  onSuccess?: () => void;
}

interface PipelineOption {
  id: string;
  name: string;
  stages: { id: string; name: string; probability: number }[];
}

export function ConvertLeadModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: ConvertLeadModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [createContact, setCreateContact] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("Decision Maker");

  const [createCompany, setCreateCompany] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");

  const [createDeal, setCreateDeal] = useState(true);
  const [dealName, setDealName] = useState("");
  const [dealValue, setDealValue] = useState<number>(0);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");

  const [pipelines, setPipelines] = useState<PipelineOption[]>([]);
  const [duplicateContact, setDuplicateContact] = useState<{ id: string; fullName: string } | null>(null);
  const [duplicateCompany, setDuplicateCompany] = useState<{ id: string; name: string } | null>(null);

  const [useExistingContact, setUseExistingContact] = useState(true);
  const [useExistingCompany, setUseExistingCompany] = useState(true);

  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversionResult, setConversionResult] = useState<{
    contactId: string | null;
    companyId: string | null;
    dealId: string | null;
  } | null>(null);

  // Initialize form fields when lead opens
  useEffect(() => {
    if (lead) {
      const parts = lead.name.trim().split(" ");
      const first = parts[0] || "";
      const last = parts.slice(1).join(" ") || "";

      setFirstName(first);
      setLastName(last);
      setEmail(lead.email || "");
      setPhone(lead.phone || "");
      setCompanyName(lead.company || "");
      setDealName(`${lead.company || lead.name} - Opportunity`);
      setDealValue(lead.valueNumeric || 0);

      // Default close date = 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setExpectedCloseDate(d.toISOString().split("T")[0]);

      setError(null);
      setConversionResult(null);

      // Check duplicates
      checkDuplicateContactAction({ email: lead.email, phone: lead.phone }).then((res) => {
        if (res.success && res.match) {
          setDuplicateContact(res.match);
        } else {
          setDuplicateContact(null);
        }
      });

      if (lead.company) {
        checkDuplicateCompanyAction(lead.company).then((res) => {
          if (res.success && res.match) {
            setDuplicateCompany(res.match);
          } else {
            setDuplicateCompany(null);
          }
        });
      }
    }
  }, [lead]);

  // Load pipelines
  useEffect(() => {
    if (isOpen) {
      setIsLoadingPipelines(true);
      getPipelinesAction()
        .then((res) => {
          if (res.success && res.data?.pipelines) {
            setPipelines(res.data.pipelines);
            const defaultPipeline =
              res.data.pipelines.find((p) => p.isDefault) || res.data.pipelines[0];
            if (defaultPipeline) {
              setSelectedPipelineId(defaultPipeline.id);
              if (defaultPipeline.stages && defaultPipeline.stages.length > 0) {
                // Select first stage (e.g. New or Qualified)
                setSelectedStageId(defaultPipeline.stages[0].id);
              }
            }
          }
        })
        .finally(() => setIsLoadingPipelines(false));
    }
  }, [isOpen]);

  // When pipeline changes, set default stage
  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    const p = pipelines.find((pipe) => pipe.id === pipelineId);
    if (p && p.stages.length > 0) {
      setSelectedStageId(p.stages[0].id);
    }
  };

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lead.isConverted) {
      setError("This lead is already converted.");
      return;
    }

    if (!createContact && !createCompany && !createDeal) {
      setError("Please select at least one entity to create during conversion.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        leadId: lead.id,
        createContact,
        useExistingContactId: duplicateContact && useExistingContact ? duplicateContact.id : undefined,
        contactData: createContact
          ? {
              firstName,
              lastName: lastName || undefined,
              email: email || undefined,
              phone: phone || undefined,
              jobTitle: jobTitle || undefined,
            }
          : undefined,
        createCompany,
        useExistingCompanyId: duplicateCompany && useExistingCompany ? duplicateCompany.id : undefined,
        companyData: createCompany
          ? {
              name: companyName,
              industry: industry || undefined,
              website: website || undefined,
              email: email || undefined,
              phone: phone || undefined,
            }
          : undefined,
        createDeal,
        dealData: createDeal
          ? {
              name: dealName,
              pipelineId: selectedPipelineId,
              stageId: selectedStageId,
              value: Number(dealValue) || 0,
              expectedCloseDate: expectedCloseDate || undefined,
              description: lead.notes || undefined,
            }
          : undefined,
      };

      const res = await convertLeadAction(payload);

      if (!res.success) {
        setError(res.error || "Failed to convert lead.");
      } else if (res.data) {
        setConversionResult(res.data);
        onSuccess?.();
      }
    } catch {
      setError("An unexpected error occurred during conversion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-elevated">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Convert Lead</h2>
              <p className="text-xs text-muted-foreground">
                Qualify & convert &ldquo;{lead.name}&rdquo; into structured CRM entities
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

        {/* Conversion Form or Success View */}
        {conversionResult ? (
          <div className="p-6 space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Lead Converted Successfully</h3>
              <p className="text-xs text-muted-foreground">
                All records have been synchronized into your PostgreSQL workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {conversionResult.dealId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/app/deals/${conversionResult.dealId}`);
                  }}
                  className="p-3.5 rounded-xl border border-border bg-surface-elevated hover:bg-surface transition-colors space-y-1 group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> Deal
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{dealName}</p>
                </button>
              )}

              {conversionResult.contactId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/app/contacts/${conversionResult.contactId}`);
                  }}
                  className="p-3.5 rounded-xl border border-border bg-surface-elevated hover:bg-surface transition-colors space-y-1 group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <ContactIcon className="w-3.5 h-3.5" /> Contact
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">
                    {firstName} {lastName}
                  </p>
                </button>
              )}

              {conversionResult.companyId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/app/companies/${conversionResult.companyId}`);
                  }}
                  className="p-3.5 rounded-xl border border-border bg-surface-elevated hover:bg-surface transition-colors space-y-1 group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Company
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{companyName}</p>
                </button>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Contact Section */}
            <div className="rounded-xl border border-border/70 bg-surface-elevated/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createContact}
                    onChange={(e) => setCreateContact(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <ContactIcon className="w-4 h-4 text-emerald-400" />
                  <span>Create / Link Contact</span>
                </label>
                {duplicateContact && (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Existing contact found
                  </span>
                )}
              </div>

              {createContact && (
                <>
                  {duplicateContact && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                      <p className="font-semibold">
                        Matched existing contact: {duplicateContact.fullName}
                      </p>
                      <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useExistingContact}
                          onChange={(e) => setUseExistingContact(e.target.checked)}
                          className="rounded border-border text-primary"
                        />
                        <span>Link to existing record instead of creating duplicate</span>
                      </label>
                    </div>
                  )}

                  {(!duplicateContact || !useExistingContact) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 2. Company Section */}
            <div className="rounded-xl border border-border/70 bg-surface-elevated/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createCompany}
                    onChange={(e) => setCreateCompany(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Create / Link Company</span>
                </label>
                {duplicateCompany && (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Existing company found
                  </span>
                )}
              </div>

              {createCompany && (
                <>
                  {duplicateCompany && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                      <p className="font-semibold">
                        Matched existing company: {duplicateCompany.name}
                      </p>
                      <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useExistingCompany}
                          onChange={(e) => setUseExistingCompany(e.target.checked)}
                          className="rounded border-border text-primary"
                        />
                        <span>Link to existing account</span>
                      </label>
                    </div>
                  )}

                  {(!duplicateCompany || !useExistingCompany) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Industry
                        </label>
                        <input
                          type="text"
                          value={industry}
                          placeholder="Real Estate, SaaS, Finance..."
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 3. Deal / Opportunity Section */}
            <div className="rounded-xl border border-border/70 bg-surface-elevated/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createDeal}
                    onChange={(e) => setCreateDeal(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  <span>Create Opportunity / Deal</span>
                </label>
              </div>

              {createDeal && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Deal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={dealName}
                        onChange={(e) => setDealName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Deal Value (INR ₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={dealValue}
                        onChange={(e) => setDealValue(Number(e.target.value))}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Pipeline
                      </label>
                      <select
                        value={selectedPipelineId}
                        onChange={(e) => handlePipelineChange(e.target.value)}
                        disabled={isLoadingPipelines}
                        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        {pipelines.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Initial Stage
                      </label>
                      <select
                        value={selectedStageId}
                        onChange={(e) => setSelectedStageId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        {pipelines
                          .find((p) => p.id === selectedPipelineId)
                          ?.stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.probability}%)
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Expected Close Date
                      </label>
                      <input
                        type="date"
                        value={expectedCloseDate}
                        onChange={(e) => setExpectedCloseDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
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
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Execute Conversion</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
