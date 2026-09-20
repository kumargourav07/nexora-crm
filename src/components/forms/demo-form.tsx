"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, Sparkles, Building2, User, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface DemoFormData {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  message: string;
}

const INITIAL_FORM_DATA: DemoFormData = {
  name: "",
  email: "",
  company: "",
  teamSize: "11–50",
  message: "",
};

const TEAM_SIZE_OPTIONS = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "500+",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DemoForm() {
  const [formData, setFormData] = React.useState<DemoFormData>(INITIAL_FORM_DATA);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success">("idle");
  const teamSizeId = React.useId();

  // Validate form fields
  const validateField = (field: keyof DemoFormData, value: string): string => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Please enter your name.";
        if (value.trim().length < 2) return "Name must be at least 2 characters.";
        return "";
      case "email":
        if (!value.trim()) return "Please enter your work email.";
        if (!EMAIL_REGEX.test(value.trim())) return "Please enter a valid work email address.";
        return "";
      case "company":
        if (!value.trim()) return "Please enter your company name.";
        return "";
      default:
        return "";
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {
      name: validateField("name", formData.name),
      email: validateField("email", formData.email),
      company: validateField("company", formData.company),
    };

    setErrors(newErrors);
    setTouched({
      name: true,
      email: true,
      company: true,
      teamSize: true,
      message: true,
    });

    return !Object.values(newErrors).some(Boolean);
  };

  const handleChange = (
    field: keyof DemoFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  const handleBlur = (field: keyof DemoFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      return;
    }

    setStatus("submitting");

    // Simulate fast client-side submission with realistic response delay
    setTimeout(() => {
      setStatus("success");
    }, 900);
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setTouched({});
    setErrors({});
    setStatus("idle");
  };

  return (
    <div className="relative rounded-2xl border border-border/80 bg-surface/90 p-6 sm:p-8 backdrop-blur-xl shadow-xl shadow-black/20">
      {/* Decorative subtle ambient border glow */}
      <div
        className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-50 pointer-events-none -z-10"
        aria-hidden="true"
      />

      <AnimatePresence mode="wait">
        {status === "success" ? (
          /* ==================== SUCCESS STATE ==================== */
          <motion.div
            key="success-state"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center py-6 sm:py-8 space-y-6"
            role="status"
            aria-live="polite"
          >
            {/* Success Icon Badge */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
              <div
                className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md -z-10"
                aria-hidden="true"
              />
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Demo request recorded
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thanks for exploring NEXORA. Your request details have been simulated and recorded in this interactive product demo.
              </p>
            </div>

            {/* Summary details card */}
            <div className="w-full max-w-sm rounded-xl border border-border/70 bg-card/60 p-4 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Contact</span>
                <span className="font-medium text-foreground">{formData.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Work Email</span>
                <span className="font-mono font-medium text-foreground">{formData.email}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Company</span>
                <span className="font-medium text-foreground">{formData.company}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Team Size</span>
                <span className="font-medium text-foreground">{formData.teamSize} members</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleReset}
              className="text-xs hover:bg-surface-hover"
            >
              Back to form
            </Button>
          </motion.div>
        ) : (
          /* ==================== FORM STATE ==================== */
          <motion.form
            key="form-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4 sm:space-y-5"
          >
            <div className="border-b border-border/60 pb-4 mb-2">
              <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Get a Demo</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Experience the unified 360° CRM platform tailored to your company workflow.
              </p>
            </div>

            {/* Full Name & Work Email in responsive grid on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                placeholder="Sarah Chen"
                leftIcon={<User className="text-muted-foreground/70" />}
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                error={touched.name ? errors.name : undefined}
                disabled={status === "submitting"}
                autoComplete="name"
                required
              />

              <Input
                label="Work Email *"
                type="email"
                placeholder="sarah@company.com"
                leftIcon={<Mail className="text-muted-foreground/70" />}
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                error={touched.email ? errors.email : undefined}
                disabled={status === "submitting"}
                autoComplete="email"
                required
              />
            </div>

            {/* Company Name & Team Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company *"
                placeholder="Acme Inc."
                leftIcon={<Building2 className="text-muted-foreground/70" />}
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                onBlur={() => handleBlur("company")}
                error={touched.company ? errors.company : undefined}
                disabled={status === "submitting"}
                autoComplete="organization"
                required
              />

              {/* Accessible Team Size Select */}
              <div className="w-full space-y-1.5">
                <label
                  htmlFor={teamSizeId}
                  className="block text-xs font-medium text-foreground tracking-wide select-none"
                >
                  Team Size
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground/70 [&>svg]:h-4 [&>svg]:w-4">
                    <Users />
                  </div>
                  <select
                    id={teamSizeId}
                    value={formData.teamSize}
                    onChange={(e) => handleChange("teamSize", e.target.value)}
                    disabled={status === "submitting"}
                    className={cn(
                      "flex h-10 w-full appearance-none rounded-lg border bg-surface pl-9 pr-8 py-2 text-sm text-foreground",
                      "border-border transition-all duration-200 cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    {TEAM_SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-surface text-foreground">
                        {opt} team members
                      </option>
                    ))}
                  </select>
                  {/* Chevron indicator */}
                  <div className="absolute right-3 flex items-center pointer-events-none text-muted-foreground">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Message / Requirements */}
            <div>
              <Textarea
                label="Message (Optional)"
                placeholder="Tell us briefly about your current workflow..."
                rows={4}
                value={formData.message}
                onChange={(e) => handleChange("message", e.target.value)}
                disabled={status === "submitting"}
              />
            </div>

            {/* Submit CTA Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={status === "submitting"}
                rightIcon={<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
                className="w-full group shadow-md shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                {status === "submitting" ? "Booking Demo..." : "Book a Demo"}
              </Button>
            </div>

            {/* Privacy & Prototype indicator note */}
            <p className="text-[11px] text-center text-muted-foreground/80 pt-1">
              No credit card required. Personalized 30-minute interactive walkthrough.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
