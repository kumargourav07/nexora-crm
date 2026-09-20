"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  Filter,
  X,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react";
import {
  getEmployeesAction,
  updateAttendanceAction,
  deleteEmployeeAction,
} from "@/lib/actions/employees-actions";
import { Badge } from "@/components/ui/badge";
import { CreateEmployeeModal } from "./create-employee-modal";
import { AttendanceStatus, Department } from "@prisma/client";

interface DBEmployee {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  status: string;
  attendance: AttendanceStatus;
  location: string;
  joinDate: string;
  leaveBalance: number;
  dealsClosed: number;
  revenueNumeric: number;
  revenueFormatted: string;
}

export function EmployeesClient() {
  const [employees, setEmployees] = useState<DBEmployee[]>([]);
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, onLeave: 0, attendanceRate: "0%" });
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchEmployees = useCallback(async (currentSearch = searchQuery, currentDept = departmentFilter, currentAtt = attendanceFilter) => {
    setError(null);
    try {
      const res = await getEmployeesAction({
        search: currentSearch,
        department: currentDept === "ALL" ? undefined : (currentDept as Department),
        attendance: currentAtt === "ALL" ? undefined : (currentAtt as AttendanceStatus),
      });

      if (!res.success) {
        setError(res.error || "Failed to load employees");
      } else if (res.data) {
        setEmployees((res.data.employees || []) as unknown as DBEmployee[]);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch {
      setError("Unable to load employees from database.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, departmentFilter, attendanceFilter]);

  useEffect(() => {
    let mounted = true;
    getEmployeesAction({
      search: searchQuery,
      department: departmentFilter === "ALL" ? undefined : (departmentFilter as Department),
      attendance: attendanceFilter === "ALL" ? undefined : (attendanceFilter as AttendanceStatus),
    })
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setEmployees((res.data.employees || []) as unknown as DBEmployee[]);
          if (res.data.stats) setStats(res.data.stats);
        } else {
          setError(res.error || "Failed to load employees");
        }
      })
      .catch(() => {
        if (mounted) setError("Unable to load employees from database.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [departmentFilter, attendanceFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    fetchEmployees();
  };

  const handleAttendanceToggle = (employeeId: string, current: AttendanceStatus) => {
    const cycle: Record<AttendanceStatus, AttendanceStatus> = {
      PRESENT: AttendanceStatus.REMOTE,
      REMOTE: AttendanceStatus.HALF_DAY,
      HALF_DAY: AttendanceStatus.ON_LEAVE,
      ON_LEAVE: AttendanceStatus.PRESENT,
    };
    const nextAttendance = cycle[current] || AttendanceStatus.PRESENT;

    // Optimistic UI
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, attendance: nextAttendance } : e))
    );

    startTransition(async () => {
      await updateAttendanceAction(employeeId, nextAttendance);
      fetchEmployees();
    });
  };

  const handleDeleteEmployee = (id: string) => {
    if (!confirm("Are you sure you want to remove this employee record?")) return;

    startTransition(async () => {
      await deleteEmployeeAction(id);
      fetchEmployees();
    });
  };

  const getAttendanceBadge = (att: string) => {
    switch (att) {
      case "PRESENT":
        return { label: "Present in Office", variant: "success" as const };
      case "REMOTE":
        return { label: "Working Remote", variant: "default" as const };
      case "ON_LEAVE":
        return { label: "On Leave", variant: "warning" as const };
      case "HALF_DAY":
        return { label: "Half Day", variant: "default" as const };
      default:
        return { label: att, variant: "default" as const };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <span>HRMS &amp; Workforce Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Database roster, presence sync, and sales revenue attribution per team member
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border">
          <span className="text-xs text-muted-foreground">Total Headcount</span>
          <div className="text-2xl font-black text-foreground mt-1">{stats.totalEmployees}</div>
          <span className="text-[10px] text-muted-foreground">Active workspace roster</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border">
          <span className="text-xs text-muted-foreground">Present Today</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.presentToday}</div>
          <span className="text-[10px] text-emerald-400 font-semibold">{stats.attendanceRate} checked in</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border">
          <span className="text-xs text-muted-foreground">On Leave</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats.onLeave}</div>
          <span className="text-[10px] text-muted-foreground">Approved time-off</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border">
          <span className="text-xs text-muted-foreground">Attendance Sync</span>
          <div className="text-2xl font-black text-primary mt-1">Live DB</div>
          <span className="text-[10px] text-muted-foreground">Click badge to cycle status</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by name, role, email, or office location..."
            className="w-full h-10 rounded-xl border border-border bg-background pl-10 pr-20 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <option value="ALL">All Departments</option>
            <option value="SALES">Sales</option>
            <option value="ENGINEERING">Engineering</option>
            <option value="OPERATIONS">Operations</option>
            <option value="HR">HR</option>
            <option value="FINANCE">Finance</option>
          </select>

          <select
            value={attendanceFilter}
            onChange={(e) => setAttendanceFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="REMOTE">Remote</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>

          {(departmentFilter !== "ALL" || attendanceFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setDepartmentFilter("ALL");
                setAttendanceFilter("ALL");
                setSearchQuery("");
                setIsLoading(true);
                fetchEmployees("", "ALL", "ALL");
              }}
              className="h-10 px-3 rounded-xl border border-border hover:bg-surface-hover text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {isLoading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-2 p-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Loading employee records from PostgreSQL...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-foreground">No employees found in database</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-surface-elevated text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-4 font-semibold">Department &amp; Role</th>
                  <th className="py-3 px-4 font-semibold">Office Location</th>
                  <th className="py-3 px-4 font-semibold">Live Attendance</th>
                  <th className="py-3 px-4 font-semibold text-center">Deals Closed</th>
                  <th className="py-3 px-4 font-semibold text-right">Revenue</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {employees.map((emp) => {
                  const badgeInfo = getAttendanceBadge(emp.attendance);
                  return (
                    <tr key={emp.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary/80 to-indigo-600 text-xs font-bold text-white shadow-sm shrink-0">
                            {emp.initials}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{emp.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">{emp.role}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.department}</div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{emp.location}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleAttendanceToggle(emp.id, emp.attendance)}
                          className="text-left group cursor-pointer"
                          title="Click to cycle attendance status in database"
                        >
                          <Badge variant={badgeInfo.variant} size="sm">
                            {badgeInfo.label}
                          </Badge>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                        {emp.dealsClosed}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                        {emp.revenueFormatted || `₹${(emp.revenueNumeric / 100000).toFixed(1)}L`}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsLoading(true);
          fetchEmployees();
        }}
      />
    </div>
  );
}
