"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Building2,
  Globe,
  Mail,
  Phone,
  Briefcase,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { getCompaniesAction, deleteCompanyAction } from "@/lib/actions/companies-actions";
import { CreateCompanyModal } from "./create-company-modal";

interface FormattedCompany {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  ownerId: string | null;
  ownerName: string | null;
  contactsCount: number;
  openDealsCount: number;
  wonRevenue: number;
  wonRevenueFormatted: string;
  createdAt: string;
}

export function CompaniesClient() {
  const [companies, setCompanies] = useState<FormattedCompany[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalCount: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchCompanies = useCallback(
    async (page = 1, search = searchQuery) => {
      setError(null);
      try {
        const res = await getCompaniesAction({
          search,
          page,
          limit: 20,
        });

        if (!res.success) {
          setError(res.error || "Failed to load companies");
        } else if (res.data) {
          setCompanies(res.data.companies as FormattedCompany[]);
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
      fetchCompanies(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete company "${name}"?`)) return;
    try {
      const res = await deleteCompanyAction(id);
      if (res.success) {
        fetchCompanies(pagination.page);
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
            placeholder="Search companies by name, industry, email, website..."
            className="w-full h-9 rounded-xl border border-border bg-surface-elevated pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Company</span>
        </button>
      </div>

      {/* Companies Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
        {isLoading && companies.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-mono">Fetching workspace accounts...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No companies found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No corporate accounts match your query. Convert a lead or add a new corporate entity.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Company</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-elevated/70 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-center">Contacts</th>
                  <th className="py-3 px-4 text-center">Open Deals</th>
                  <th className="py-3 px-4 font-mono text-right">Won Revenue</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {companies.map((comp) => (
                  <tr
                    key={comp.id}
                    className="hover:bg-surface-hover/50 transition-colors group"
                  >
                    {/* Company Name */}
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <Link
                        href={`/app/companies/${comp.id}`}
                        className="hover:text-primary transition-colors flex items-center gap-2"
                      >
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{comp.name}</span>
                      </Link>
                    </td>

                    {/* Industry */}
                    <td className="py-3 px-4 text-muted-foreground">
                      {comp.industry || "—"}
                    </td>

                    {/* Website */}
                    <td className="py-3 px-4 text-muted-foreground">
                      {comp.website ? (
                        <a
                          href={comp.website.startsWith("http") ? comp.website : `https://${comp.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground transition-colors flex items-center gap-1 text-[11px]"
                        >
                          <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[140px]">{comp.website.replace(/^https?:\/\//, "")}</span>
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Owner */}
                    <td className="py-3 px-4 text-foreground truncate max-w-[120px]">
                      {comp.ownerName || "Unassigned"}
                    </td>

                    {/* Contacts Count */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-mono font-bold text-foreground">
                        {comp.contactsCount}
                      </span>
                    </td>

                    {/* Open Deals Count */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-400">
                        {comp.openDealsCount}
                      </span>
                    </td>

                    {/* Won Revenue */}
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-right">
                      {comp.wonRevenueFormatted}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/app/companies/${comp.id}`}
                          className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-[11px] font-medium text-foreground hover:bg-surface-hover hover:text-primary transition-colors"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(comp.id, comp.name)}
                          title="Delete Company"
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
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} companies)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchCompanies(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-hover disabled:opacity-40 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchCompanies(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-hover disabled:opacity-40 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchCompanies(1)}
      />
    </div>
  );
}
