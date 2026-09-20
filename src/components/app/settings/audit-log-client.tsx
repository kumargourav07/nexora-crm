"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  ScrollText,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Lock,
  User,
} from "lucide-react";
import { getAuditLogsAction } from "@/lib/actions/audit-actions";
import { AuditDetailModal } from "./audit-detail-modal";

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const ACTION_OPTIONS = [
  { value: "ALL", label: "All Actions" },
  { value: "LEAD_CREATED", label: "Lead Created" },
  { value: "LEAD_UPDATED", label: "Lead Updated" },
  { value: "LEAD_STATUS_CHANGED", label: "Lead Stage Changed" },
  { value: "LEAD_DELETED", label: "Lead Deleted" },
  { value: "INVOICE_CREATED", label: "Invoice Created" },
  { value: "INVOICE_STATUS_CHANGED", label: "Invoice Paid/Status" },
  { value: "EMPLOYEE_CREATED", label: "Employee Added" },
  { value: "EMPLOYEE_UPDATED", label: "Employee Updated" },
  { value: "INTEGRATION_CONFIGURED", label: "Integration Connected" },
  { value: "INTEGRATION_DISCONNECTED", label: "Integration Disconnected" },
  { value: "USER_INVITED", label: "Member Invited" },
  { value: "USER_JOINED", label: "Member Joined" },
  { value: "ROLE_CHANGED", label: "Role Changed" },
  { value: "USER_REMOVED", label: "Member Removed" },
  { value: "WORKSPACE_UPDATED", label: "Workspace Updated" },
  { value: "LOGIN", label: "User Login" },
];

const ENTITY_OPTIONS = [
  { value: "ALL", label: "All Entities" },
  { value: "LEAD", label: "Leads" },
  { value: "INVOICE", label: "Invoices" },
  { value: "EMPLOYEE", label: "Employees" },
  { value: "INTEGRATION", label: "Integrations" },
  { value: "TEAM_MEMBER", label: "Team Members" },
  { value: "INVITATION", label: "Invitations" },
  { value: "WORKSPACE", label: "Workspace" },
  { value: "AUTH_SESSION", label: "Auth Sessions" },
];

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("ALL");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogItem | null>(null);

  const [, startTransition] = useTransition();

  const fetchLogs = React.useCallback(
    (pageNumber = 1) => {
      startTransition(async () => {
        const res = await getAuditLogsAction({
          page: pageNumber,
          limit: 25,
          search: search.trim() || undefined,
          userId: selectedUser !== "ALL" ? selectedUser : undefined,
          action: selectedAction !== "ALL" ? selectedAction : undefined,
          entityType: selectedEntity !== "ALL" ? selectedEntity : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (res.success && res.data) {
          setLogs(res.data.logs);
          setPagination(res.data.pagination);
          if (res.data.users) {
            setUsers(res.data.users);
          }
        } else {
          setError(res.error || "Failed to load audit logs");
        }
        setIsLoading(false);
      });
    },
    [search, selectedUser, selectedAction, selectedEntity, startDate, endDate]
  );

  useEffect(() => {
    let active = true;
    getAuditLogsAction({
      page: 1,
      limit: 25,
      search: search.trim() || undefined,
      userId: selectedUser !== "ALL" ? selectedUser : undefined,
      action: selectedAction !== "ALL" ? selectedAction : undefined,
      entityType: selectedEntity !== "ALL" ? selectedEntity : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }).then((res) => {
      if (active) {
        if (res.success && res.data) {
          setLogs(res.data.logs);
          setPagination(res.data.pagination);
          if (res.data.users) {
            setUsers(res.data.users);
          }
        } else {
          setError(res.error || "Failed to load audit logs");
        }
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [search, selectedUser, selectedAction, selectedEntity, startDate, endDate]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("REMOVED") || action.includes("DISCONNECTED")) {
      return "bg-rose-500/15 border-rose-500/30 text-rose-400";
    }
    if (action.includes("CREATED") || action.includes("JOINED")) {
      return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
    }
    if (action.includes("STATUS") || action.includes("ROLE") || action.includes("UPDATED")) {
      return "bg-sky-500/15 border-sky-500/30 text-sky-400";
    }
    return "bg-indigo-500/15 border-indigo-500/30 text-indigo-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <span>Workspace Audit Trail</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Immutable, cryptographically verified record of all business and security events in this workspace.
          </p>
        </div>

        {/* Immutability Notice */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary">
          <Lock className="h-3.5 w-3.5" />
          <span>Write-Only Ledger (Immutable)</span>
        </div>
      </div>

      {/* Filter Controls Grid */}
      <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" /> Event Action
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full h-8.5 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Entity Type</label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full h-8.5 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Actor User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full h-8.5 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="ALL">All Users / System</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" /> Search Keyword
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions or IDs..."
              className="w-full h-8.5 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Date Filters Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          {(startDate || endDate || selectedAction !== "ALL" || selectedEntity !== "ALL" || selectedUser !== "ALL" || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedAction("ALL");
                setSelectedEntity("ALL");
                setSelectedUser("ALL");
                setSearch("");
                setStartDate("");
                setEndDate("");
              }}
              className="text-[11px] text-primary hover:underline ml-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Audit Entries List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Loading immutable audit logs...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border text-muted-foreground text-xs space-y-1">
          <ScrollText className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="font-semibold text-foreground">No audit activity found.</p>
          <p className="text-[11px]">Try adjusting your search keywords or date range filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-surface-elevated overflow-hidden">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface border border-border mt-0.5 sm:mt-0 font-bold text-xs text-primary">
                    {log.user.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border font-mono ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-surface px-1.5 py-0.5 rounded border border-border/50">
                        {log.entityType}
                      </span>
                      {log.entityId && (
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                          ID: {log.entityId}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      By <strong className="text-foreground">{log.user.name}</strong> ({log.user.email})
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(log)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-surface transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground">
              <span>
                Showing Page <strong className="text-foreground">{pagination.page}</strong> of{" "}
                <strong className="text-foreground">{pagination.totalPages}</strong> (
                {pagination.totalCount} total records)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AuditDetailModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </div>
  );
}
