"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Contact as ContactIcon,
  Award,
  TrendingUp,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  History,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { getCompanyByIdAction, deleteCompanyAction } from "@/lib/actions/companies-actions";
import { CreateDealModal } from "./create-deal-modal";
import { CreateContactModal } from "./create-contact-modal";

export interface CompanyDetailClientProps {
  companyId: string;
}

export function CompanyDetailClient({ companyId }: CompanyDetailClientProps) {
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const loadCompany = useCallback(async () => {
    try {
      const res = await getCompanyByIdAction(companyId);
      if (!res.success) {
        setError(res.error || "Company not found");
      } else if (res.data) {
        setCompany(res.data);
      }
    } catch {
      setError("Unable to connect to database");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete company "${company.name}"?`)) return;
    try {
      const res = await deleteCompanyAction(company.id);
      if (res.success) {
        router.push("/app/companies");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Loading corporate profile...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-destructive">{error || "Company not found"}</p>
        <Link
          href="/app/companies"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/companies"
            className="p-2 rounded-xl border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span>{company.name}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {company.industry || "Enterprise Account"} • ID: #{company.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsDealModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Opportunity</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Delete Company"
            className="p-2 rounded-xl border border-border bg-surface text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Company Details & Financial Ledger */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" /> Won Revenue
                </span>
                <p className="text-lg font-bold text-emerald-400 font-mono">
                  {company.wonRevenueFormatted}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-blue-400" /> Open Pipeline
                </span>
                <p className="text-lg font-bold text-foreground font-mono">
                  {company.openPipelineFormatted}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {company.website && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Website
                  </span>
                  <a
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <span>{company.website.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {company.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </span>
                  <a
                    href={`mailto:${company.email}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {company.email}
                  </a>
                </div>
              )}

              {company.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </span>
                  <a
                    href={`tel:${company.phone}`}
                    className="font-mono text-foreground hover:text-primary transition-colors"
                  >
                    {company.phone}
                  </a>
                </div>
              )}

              {company.address && (
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Address
                  </span>
                  <span className="text-foreground text-right max-w-[180px]">{company.address}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">Account Owner</span>
                <span className="font-semibold text-foreground">
                  {company.owner?.name || "Unassigned"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contacts, Deals, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Associated Contacts */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ContactIcon className="w-4 h-4 text-emerald-400" /> Stakeholders & Contacts (
                {company.contacts.length})
              </h3>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Contact
              </button>
            </div>

            {company.contacts.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No contacts registered for this company.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {company.contacts.map((contact: any) => (
                  <Link
                    key={contact.id}
                    href={`/app/contacts/${contact.id}`}
                    className="p-3.5 rounded-xl bg-surface-elevated border border-border hover:border-primary/50 transition-all group block space-y-1"
                  >
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {contact.fullName}
                    </p>
                    {contact.jobTitle && (
                      <p className="text-[11px] text-muted-foreground">{contact.jobTitle}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80 pt-1">
                      {contact.email && <span className="truncate">{contact.email}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Associated Deals */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" /> Deals & Opportunities (
                {company.deals.length})
              </h3>
              <button
                type="button"
                onClick={() => setIsDealModalOpen(true)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Deal
              </button>
            </div>

            {company.deals.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No opportunities created for this account yet.
              </div>
            ) : (
              <div className="space-y-2">
                {company.deals.map((deal: any) => (
                  <Link
                    key={deal.id}
                    href={`/app/deals/${deal.id}`}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated border border-border hover:border-primary/50 transition-all group"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {deal.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {deal.pipeline.name} • Stage: {deal.stage.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-bold text-foreground">
                        {deal.valueFormatted}
                      </span>
                      <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
                        {deal.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Invoices & Billing Section */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" /> Invoices & Billing
              </h3>
              <Link
                href={`/app/invoices/new?companyId=${company.id}`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Create Invoice
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage client invoices and view transaction history for {company.name}.
            </p>
            <Link
              href={`/app/invoices?companyId=${company.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-foreground transition-colors"
            >
              View Invoices for this Account
            </Link>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" /> Account Audit History
            </h3>

            {company.activities.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No activity history recorded.
              </p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {company.activities.map((act: any) => (
                  <div key={act.id} className="relative space-y-1">
                    <span className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{act.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{act.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateDealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSuccess={loadCompany}
      />

      <CreateContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        initialCompanyId={company.id}
        onSuccess={loadCompany}
      />
    </div>
  );
}
