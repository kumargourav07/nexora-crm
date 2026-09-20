"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { createEmployeeAction } from "@/lib/actions/employees-actions";
import { Department, EmployeeStatus, AttendanceStatus } from "@prisma/client";

export interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEmployeeModal({ isOpen, onClose, onSuccess }: CreateEmployeeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState<Department>(Department.SALES);
  const [role, setRole] = useState("Account Executive");
  const [location, setLocation] = useState("Mumbai, MH");
  const [leaveBalance, setLeaveBalance] = useState("18");
  const [attendance, setAttendance] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createEmployeeAction({
        name,
        email,
        phone,
        department,
        role,
        status: EmployeeStatus.ACTIVE,
        attendance,
        location,
        leaveBalance: parseInt(leaveBalance, 10) || 18,
        dealsClosed: 0,
        revenueGenerated: 0,
      });

      if (!res.success) {
        setError(res.error || "Failed to add employee.");
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Add Employee to Roster</h3>
                <p className="text-[11px] text-muted-foreground">Register new team member in company HRMS</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kavita Reddy"
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kavita.r@nexora.local"
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98201 55678"
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  className="w-full h-9 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={Department.SALES}>Sales</option>
                  <option value={Department.ENGINEERING}>Engineering</option>
                  <option value={Department.OPERATIONS}>Operations</option>
                  <option value={Department.HR}>HR</option>
                  <option value={Department.FINANCE}>Finance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Role / Job Title *</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Senior Account Executive"
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Location / Office *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Bengaluru, KA"
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Initial Leave Balance (Days)</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={leaveBalance}
                  onChange={(e) => setLeaveBalance(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Current Attendance</label>
                <select
                  value={attendance}
                  onChange={(e) => setAttendance(e.target.value as AttendanceStatus)}
                  className="w-full h-9 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={AttendanceStatus.PRESENT}>Present in Office</option>
                  <option value={AttendanceStatus.REMOTE}>Working Remote</option>
                  <option value={AttendanceStatus.HALF_DAY}>Half Day</option>
                  <option value={AttendanceStatus.ON_LEAVE}>On Leave</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border hover:bg-surface-hover text-xs font-medium text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Employee</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
