import * as React from "react";
import Link from "next/link";
import { ArrowUp, Sparkles, CheckCircle2, Shield } from "lucide-react";
import { Container } from "@/components/ui/container";

const FOOTER_NAV = {
  product: [
    { label: "Platform Overview", href: "#platform" },
    { label: "Interactive Demo", href: "/demo" },
    { label: "Core Features", href: "#features" },
    { label: "Lead Integrations", href: "#integrations" },
    { label: "Why NEXORA", href: "#benefits" },
  ],
  modules: [
    { label: "Lead Management", href: "#lead-management" },
    { label: "HRMS & Teams", href: "#hrms" },
    { label: "Smart Invoicing", href: "#invoicing" },
    { label: "Lead Connectors", href: "#integrations" },
  ],
  connect: [
    { label: "Book a Demo", href: "#contact" },
    { label: "Explore Demo App", href: "/demo" },
    { label: "Talk to Our Team", href: "#contact" },
    { label: "Workflow Consultation", href: "#contact" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border/70 bg-surface/80 text-foreground pt-16 pb-12 overflow-hidden">
      {/* Subtle background ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-primary/5 blur-3xl pointer-events-none -z-10 rounded-full"
        aria-hidden="true"
      />

      <Container size="xl" className="space-y-12">
        {/* Main Footer Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand Column (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Logo */}
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition-transform duration-200 group-hover:scale-105">
                <span className="text-sm font-black font-mono">◈</span>
              </div>
              <span className="text-lg font-extrabold tracking-wider">
                NEXORA CRM
              </span>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              The 360° CRM platform unifying lead capture, workforce management, and automated invoicing in one powerful workspace.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Zero Siloed Data
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3 py-1">
                <Shield className="h-3.5 w-3.5 text-sky-400" />
                Enterprise Security
              </span>
            </div>
          </div>

          {/* Navigation Columns (7 cols on lg) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Product Column */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Product
              </h4>
              <ul className="space-y-2.5">
                {FOOTER_NAV.product.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modules Column */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Modules
              </h4>
              <ul className="space-y-2.5">
                {FOOTER_NAV.modules.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Get a Demo Column */}
            <div className="space-y-3.5 col-span-2 sm:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Get Started
              </h4>
              <ul className="space-y-2.5">
                {FOOTER_NAV.connect.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Back-to-top Strip */}
        <div className="border-t border-border/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>
              &copy; {currentYear} NEXORA Technologies. Built for modern sales &amp; operations teams.
            </span>
          </div>

          <a
            href="#main-content"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
          >
            <span>Back to top</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </a>
        </div>
      </Container>
    </footer>
  );
}
