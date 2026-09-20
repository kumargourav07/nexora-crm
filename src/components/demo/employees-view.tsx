"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  CalendarOff,
  Laptop,
  Search,
  ArrowUpRight,
  MapPin,
  X,
} from "lucide-react";
import { INITIAL_DEMO_EMPLOYEES, DEMO_HRMS_STATS } from "@/lib/demo-data/employees";
import { Employee, EmployeeAttendance } from "@/lib/demo-data/types";
import { Badge } from "@/components/ui/badge";
import { EmployeeDetailPanel } from "@/components/demo/employee-detail-panel";

export function EmployeesView() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_DEMO_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("All");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Attendance badge config
  const getAttendanceBadge = (att: EmployeeAttendance) => {
    switch (att) {
      case "Present":
        return { label: "Present in Office", variant: "success" as const };
      case "Remote":
        return { label: "Working Remote", variant: "default" as const };
      case "On Leave":
        return { label: "On Leave", variant: "warning" as const };
      case "Half Day":
        return { label: "Half Day", variant: "default" as const };
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        searchQuery === "" ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = departmentFilter === "All" || emp.department === departmentFilter;
      const matchesAtt = attendanceFilter === "All" || emp.attendance === attendanceFilter;

      return matchesSearch && matchesDept && matchesAtt;
    });
  }, [employees, searchQuery, departmentFilter, attendanceFilter]);

  const handleOpenEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsPanelOpen(true);
  };

  const handleAttendanceChange = (empId: string, newAttendance: EmployeeAttendance) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === empId) {
          const updated = { ...emp, attendance: newAttendance };
          if (selectedEmployee && selectedEmployee.id === empId) {
            setSelectedEmployee(updated);
          }
          return updated;
        }
        return emp;
      })
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("All");
    setAttendanceFilter("All");
  };

  const stats = [
    {
      label: "Total Employees",
      value: DEMO_HRMS_STATS.totalEmployees,
      sublabel: "Active roster",
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Present Today",
      value: DEMO_HRMS_STATS.presentToday,
      sublabel: "90.6% attendance",
      icon: UserCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "On Leave",
      value: DEMO_HRMS_STATS.onLeave,
      sublabel: "Approved time off",
      icon: CalendarOff,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Working Remote",
      value: DEMO_HRMS_STATS.remote,
      sublabel: "Distributed nodes",
      icon: Laptop,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
  ];

  const departmentOptions: string[] = [
    "All",
    "Sales",
    "Engineering",
    "Operations",
    "HR",
    "Finance",
  ];

  const attendanceOptions: string[] = [
    "All",
    "Present",
    "Remote",
    "On Leave",
    "Half Day",
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            HRMS &amp; Workforce Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time employee presence, role directory, attendance, and commission tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Biometric Sync Active
          </div>
        </div>
      </div>

      {/* HRMS Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-xl border ${stat.bg} ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
              <div className="mt-1 text-xs text-slate-500">{stat.sublabel}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee by name, role, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept} className="bg-slate-900 text-white">
                  Dept: {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {attendanceOptions.map((att) => (
                <option key={att} value={att} className="bg-slate-900 text-white">
                  Attendance: {att}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white font-mono">{filteredEmployees.length}</strong> of{" "}
              <span className="font-mono">{employees.length}</span> staff members
            </span>
            {(searchQuery || departmentFilter !== "All" || attendanceFilter !== "All") && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-emerald-400 hover:text-emerald-300 underline font-medium ml-2"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Click any employee row to inspect leave quota, performance &amp; contact card
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm overflow-hidden">
        {filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-medium">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4">Today&apos;s Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Leave Balance</th>
                  <th className="py-3 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEmployees.map((emp) => {
                  const attBadge = getAttendanceBadge(emp.attendance);

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => handleOpenEmployee(emp)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {emp.initials}
                          </div>
                          <div>
                            <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                              {emp.name}
                            </div>
                            <div className="text-slate-500 text-[11px]">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/5 font-medium">
                          {emp.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">{emp.role}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={attBadge.variant} className="text-[11px]">
                          {attBadge.label}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1 mt-2 sm:mt-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{emp.location}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-200">
                        {emp.leaveBalance} days
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEmployee(emp);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="View Employee Profile"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/10 text-slate-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No employees found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No staff members match &quot;{searchQuery}&quot; or chosen department filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors inline-block"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Employee Detail Slide-out */}
      <EmployeeDetailPanel
        employee={selectedEmployee}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedEmployee(null);
        }}
        onAttendanceChange={handleAttendanceChange}
      />
    </div>
  );
}
