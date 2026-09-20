/**
 * Centralized Brand Configuration for NEXORA CRM
 */

export const SITE_CONFIG = {
  name: "NEXORA",
  productName: "NEXORA CRM",
  tagline: "One CRM. Your entire business, connected.",
  description:
    "NEXORA is a 360° CRM platform for managing leads, HRMS, invoicing, and connected lead sources from one platform.",
  url: "https://nexora.io",
  links: {
    twitter: "https://twitter.com/nexoracrm",
    github: "https://github.com/nexora-crm",
    linkedin: "https://linkedin.com/company/nexora-crm",
  },
  navItems: [
    { label: "Features", href: "#features" },
    { label: "Solutions", href: "#solutions" },
    { label: "Integrations", href: "#integrations" },
    { label: "Pricing", href: "#pricing" },
  ],
} as const;

export type SiteConfig = typeof SITE_CONFIG;
