"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Contact, AlertCircle, Plus } from "lucide-react";
import { createContactAction } from "@/lib/actions/contacts-actions";
import { getCompaniesAction } from "@/lib/actions/companies-actions";
import { getWorkspaceTeamAction } from "@/lib/actions/team-actions";

export interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCompanyId?: string;
}

export function CreateContactModal({
  isOpen,
  onClose,
  onSuccess,
  initialCompanyId,
}: CreateContactModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyId, setCompanyId] = useState(initialCompanyId || "");
  const [ownerId, setOwnerId] = useState("");

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCompanyId(initialCompanyId || "");
      Promise.all([
        getCompaniesAction({ limit: 100 }),
        getWorkspaceTeamAction(),
      ]).then(([compRes, teamRes]) => {
        if (compRes.success && compRes.data?.companies) {
          setCompanies(compRes.data.companies);
        }
        if (teamRes.success && teamRes.data?.members) {
          setTeamMembers(
            teamRes.data.members.map((m) => ({ id: m.userId, name: m.name }))
          );
        }
      });
    }
  }, [isOpen, initialCompanyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createContactAction({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        companyId: companyId || undefined,
        ownerId: ownerId || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to create contact.");
      } else {
        onSuccess?.();
        onClose();
      }
    } catch {
      setError("An unexpected error occurred while creating contact.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-elevated">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Contact className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Create New Contact</h2>
              <p className="text-xs text-muted-foreground">
                Add an individual stakeholder or client contact
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Rahul"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sharma"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="VP Engineering, Director..."
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Company
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Contact</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
