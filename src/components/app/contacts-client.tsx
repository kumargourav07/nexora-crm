"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Contact as ContactIcon,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Trash2,
} from "lucide-react";
import { getContactsAction, deleteContactAction } from "@/lib/actions/contacts-actions";
import { CreateContactModal } from "./create-contact-modal";

interface FormattedContact {
  id: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  companyId: string | null;
  companyName: string | null;
  ownerName: string | null;
  dealCount: number;
  activityCount: number;
  taskCount: number;
  createdAt: string;
}

export function ContactsClient() {
  const [contacts, setContacts] = useState<FormattedContact[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalCount: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchContacts = useCallback(
    async (page = 1, search = searchQuery) => {
      setError(null);
      try {
        const res = await getContactsAction({
          search,
          page,
          limit: 20,
        });

        if (!res.success) {
          setError(res.error || "Failed to load contacts");
        } else if (res.data) {
          setContacts(res.data.contacts as FormattedContact[]);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch {
        setError("Unable to connect to database");
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete contact "${name}"?`)) return;
    try {
      const res = await deleteContactAction(id);
      if (res.success) {
        fetchContacts(pagination.page);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-2xl p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by name, email, phone, company..."
            className="w-full h-9 rounded-xl border border-border bg-surface-elevated pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Contact</span>
        </button>
      </div>

      {/* Contacts Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
        {isLoading && contacts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-mono">Fetching workspace contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground">
              <ContactIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No contacts found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No contacts match your query. Convert a qualified lead or create a new contact record.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Contact</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-elevated/70 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-center">Deals</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-surface-hover/50 transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <Link
                        href={`/app/contacts/${contact.id}`}
                        className="hover:text-primary transition-colors flex flex-col"
                      >
                        <span className="truncate max-w-[180px]">{contact.fullName}</span>
                        {contact.jobTitle && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {contact.jobTitle}
                          </span>
                        )}
                      </Link>
                    </td>

                    {/* Company */}
                    <td className="py-3 px-4">
                      {contact.companyName ? (
                        <Link
                          href={`/app/companies/${contact.companyId}`}
                          className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate max-w-[160px]"
                        >
                          <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{contact.companyName}</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 text-muted-foreground">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="hover:text-foreground transition-colors flex items-center gap-1 truncate max-w-[180px]"
                        >
                          <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{contact.email}</span>
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{contact.phone}</span>
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Owner */}
                    <td className="py-3 px-4 text-foreground truncate max-w-[120px]">
                      {contact.ownerName || "Unassigned"}
                    </td>

                    {/* Deal Count */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-mono font-bold text-foreground">
                        <Briefcase className="w-2.5 h-2.5 text-blue-400" />
                        {contact.dealCount}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/app/contacts/${contact.id}`}
                          className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-[11px] font-medium text-foreground hover:bg-surface-hover hover:text-primary transition-colors"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(contact.id, contact.fullName)}
                          title="Delete Contact"
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface-elevated/40">
            <span className="text-xs text-muted-foreground">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} contacts)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchContacts(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-hover disabled:opacity-40 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchContacts(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-hover disabled:opacity-40 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateContactModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchContacts(1)}
      />
    </div>
  );
}
