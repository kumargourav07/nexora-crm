"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  Users,
  Briefcase,
  Building2,
  Contact,
  Receipt,
  UserCheck,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { globalSearchAction, SearchResultItem } from "@/lib/actions/global-search-actions";

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<string, SearchResultItem[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const performSearch = useCallback(async (text: string) => {
    if (!text || text.trim().length < 2) {
      setResults({});
      setTotalCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await globalSearchAction(text);
      if (res.success && res.data) {
        setResults(res.data.results);
        setTotalCount(res.data.totalCount);
      }
    } catch (err) {
      console.error("Global search failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case "deals":
        return <Briefcase className="w-3.5 h-3.5 text-blue-400" />;
      case "contacts":
        return <Contact className="w-3.5 h-3.5 text-emerald-400" />;
      case "companies":
        return <Building2 className="w-3.5 h-3.5 text-indigo-400" />;
      case "leads":
        return <Users className="w-3.5 h-3.5 text-amber-400" />;
      case "tasks":
        return <CheckSquare className="w-3.5 h-3.5 text-purple-400" />;
      case "invoices":
        return <Receipt className="w-3.5 h-3.5 text-teal-400" />;
      case "employees":
        return <UserCheck className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Search className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-in zoom-in-95">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-border px-4 py-3.5 bg-surface-elevated">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals, contacts, companies, leads, tasks, invoices..."
            autoFocus
            className="w-full bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Stream */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {query.trim().length >= 2 && totalCount === 0 && !isLoading && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching records found for &ldquo;{query}&rdquo; in this workspace.
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-6 px-3 text-center space-y-1">
              <p className="text-xs font-medium text-foreground">Workspace Omnisearch</p>
              <p className="text-[11px] text-muted-foreground">
                Type at least 2 characters to search across all CRM entities with workspace isolation.
              </p>
            </div>
          )}

          {Object.entries(results).map(([category, items]) => {
            if (!items || items.length === 0) return null;

            return (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {getCategoryIcon(category)}
                  <span>{category}</span>
                  <span className="text-[10px] text-muted-foreground/70 font-mono">
                    ({items.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-surface-hover transition-colors group cursor-pointer"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span className="rounded bg-surface-elevated border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-surface-elevated/40 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span>Navigate with mouse or click result</span>
          <span>Workspace Scoped</span>
        </div>
      </div>
    </div>
  );
}
