"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Contact as ContactIcon,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  CheckSquare,
  MessageSquare,
  History,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { getContactByIdAction, deleteContactAction } from "@/lib/actions/contacts-actions";
import { CreateDealModal } from "./create-deal-modal";

export interface ContactDetailClientProps {
  contactId: string;
}

export function ContactDetailClient({ contactId }: ContactDetailClientProps) {
  const router = useRouter();
  const [contact, setContact] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  const loadContact = useCallback(async () => {
    try {
      const res = await getContactByIdAction(contactId);
      if (!res.success) {
        setError(res.error || "Contact not found");
      } else if (res.data) {
        setContact(res.data);
      }
    } catch {
      setError("Unable to connect to database");
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadContact();
  }, [loadContact]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete contact "${contact.fullName}"?`)) return;
    try {
      const res = await deleteContactAction(contact.id);
      if (res.success) {
        router.push("/app/contacts");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Loading contact profile...</p>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-destructive">{error || "Contact not found"}</p>
        <Link
          href="/app/contacts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Contacts
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
            href="/app/contacts"
            className="p-2 rounded-xl border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              {contact.fullName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {contact.jobTitle || "Contact"} • ID: #{contact.id}
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
            title="Delete Contact"
            className="p-2 rounded-xl border border-border bg-surface text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact Card */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-base border border-emerald-500/20">
                {contact.firstName[0]}
                {contact.lastName ? contact.lastName[0] : ""}
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h2 className="text-sm font-bold text-foreground truncate">
                  {contact.fullName}
                </h2>
                <p className="text-xs text-muted-foreground truncate">{contact.jobTitle || "Individual Contact"}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {contact.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </span>
                  <a
                    href={`mailto:${contact.email}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {contact.email}
                  </a>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </span>
                  <a
                    href={`tel:${contact.phone}`}
                    className="font-mono text-foreground hover:text-primary transition-colors"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-semibold text-foreground">
                  {contact.owner?.name || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Linked Company */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Associated Company
                </span>
                {contact.company && (
                  <Link
                    href={`/app/companies/${contact.company.id}`}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {contact.company ? (
                <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs space-y-1">
                  <p className="font-semibold text-foreground">{contact.company.name}</p>
                  {contact.company.industry && (
                    <p className="text-[11px] text-muted-foreground">{contact.company.industry}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No corporate account linked.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Deals & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Associated Deals */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" /> Opportunities ({contact.deals.length})
              </h3>
              <button
                type="button"
                onClick={() => setIsDealModalOpen(true)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Deal
              </button>
            </div>

            {contact.deals.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No deals associated with this contact yet.
              </div>
            ) : (
              <div className="space-y-2">
                {contact.deals.map((deal: any) => (
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
                href={`/app/invoices/new?contactId=${contact.id}&companyId=${contact.companyId || ""}`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Create Invoice
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate invoices directly addressed to {contact.fullName}.
            </p>
            <Link
              href={`/app/invoices?contactId=${contact.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-foreground transition-colors"
            >
              View Invoices for this Contact
            </Link>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" /> Interaction Timeline
            </h3>

            {contact.activities.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No activity history recorded.
              </p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {contact.activities.map((act: any) => (
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
        onSuccess={loadContact}
      />
    </div>
  );
}
