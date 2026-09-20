"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  Calendar,
  Award,
  MapPin,
  Clock,
} from "lucide-react";
import { Employee, EmployeeAttendance } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmployeeDetailPanelProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onAttendanceChange?: (id: string, attendance: EmployeeAttendance) => void;
}

export function EmployeeDetailPanel({
  employee,
  isOpen,
  onClose,
  onAttendanceChange,
}: EmployeeDetailPanelProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!employee || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Slide-out Panel */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-screen max-w-md bg-surface border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border/70 bg-surface-elevated/60">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-bold text-base shadow-md">
                  {employee.initials}
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    {employee.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">{employee.role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary">
                      {employee.department}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        employee.attendance === "Present"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : employee.attendance === "Remote"
                          ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {employee.attendance}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close detail panel"
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Sales Metrics if in Sales */}
              {employee.dealsClosed && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-center space-y-0.5">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">
                      Deals Closed
                    </span>
                    <p className="text-lg font-bold text-foreground font-mono">
                      {employee.dealsClosed}
                    </p>
                    <span className="text-[9px] text-emerald-400 font-semibold flex items-center justify-center gap-0.5">
                      <Award className="h-2.5 w-2.5" /> Top Performer
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-center space-y-0.5">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">
                      Revenue Generated
                    </span>
                    <p className="text-lg font-bold text-primary font-mono">
                      {employee.revenueGenerated}
                    </p>
                    <span className="text-[9px] text-primary/80 font-mono">
                      YTD Verified
                    </span>
                  </div>
                </div>
              )}

              {/* General Info Card */}
              <div className="rounded-xl border border-border/70 bg-card/70 divide-y divide-border/60 text-xs">
                <div className="p-3 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Work Email
                  </span>
                  <span className="font-mono text-foreground font-medium">
                    {employee.email}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </span>
                  <span className="font-mono text-foreground font-medium">
                    {employee.phone}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Work Location
                  </span>
                  <span className="text-foreground font-medium">
                    {employee.location}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Joining Date
                  </span>
                  <span className="font-mono text-foreground">
                    {employee.joinDate}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Leave Balance
                  </span>
                  <span className="font-bold text-foreground font-mono">
                    {employee.leaveBalance} days remaining
                  </span>
                </div>
              </div>

              {/* Status Simulation */}
              {onAttendanceChange && (
                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Update Attendance State
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Present", "Remote", "On Leave"] as EmployeeAttendance[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onAttendanceChange(employee.id, st)}
                        className={`py-1.5 px-2 text-[11px] rounded-lg border font-medium transition-colors ${
                          employee.attendance === st
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time Work Presence Info */}
              <div className="rounded-xl border border-border/70 bg-surface-elevated/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Presence &amp; Geo-Checkin</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ● Checked In 09:12 AM
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Automatic biometric and web portal clock-in verified with GPS geofencing radius.
                </p>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-border/70 bg-surface-elevated/40 flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  alert(`Demo Action: Scheduled 1-on-1 with ${employee.name}.`);
                }}
              >
                Schedule 1-on-1
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
