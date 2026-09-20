/**
 * Integrations & Lead Connectors Constants for NEXORA CRM
 */

export interface Integration {
  id: string;
  name: string;
  category: "LEAD SOURCE" | "MARKETPLACE" | "PROPERTY" | "MARKETING" | "WEBSITE" | "COMMUNICATION" | "DEVELOPER";
  description: string;
  shortName: string;
  status: "Connected" | "Ready";
  iconColor: string;
  avatarBg: string;
  accentBorder: string;
}

export const INTEGRATIONS_LIST: Integration[] = [
  {
    id: "facebook-lead-ads",
    name: "Facebook Lead Ads",
    shortName: "FB",
    category: "LEAD SOURCE",
    description: "Capture new leads from Meta Instant Forms and sync custom fields automatically.",
    status: "Connected",
    iconColor: "text-blue-400",
    avatarBg: "from-blue-600 to-indigo-600",
    accentBorder: "border-blue-500/30",
  },
  {
    id: "indiamart",
    name: "IndiaMART",
    shortName: "IM",
    category: "MARKETPLACE",
    description: "Bring B2B buyer enquiries and catalog requests directly into your sales pipeline.",
    status: "Connected",
    iconColor: "text-emerald-400",
    avatarBg: "from-emerald-600 to-teal-600",
    accentBorder: "border-emerald-500/30",
  },
  {
    id: "99acres",
    name: "99acres",
    shortName: "99",
    category: "PROPERTY",
    description: "Sync real estate project inquiries and buyer profiles with instant rep alerts.",
    status: "Connected",
    iconColor: "text-sky-400",
    avatarBg: "from-sky-600 to-blue-600",
    accentBorder: "border-sky-500/30",
  },
  {
    id: "housing",
    name: "Housing.com",
    shortName: "H",
    category: "PROPERTY",
    description: "Centralize incoming property leads and schedule automatic site visits.",
    status: "Connected",
    iconColor: "text-amber-400",
    avatarBg: "from-amber-600 to-orange-600",
    accentBorder: "border-amber-500/30",
  },
  {
    id: "google-ads",
    name: "Google Ads",
    shortName: "G",
    category: "MARKETING",
    description: "Connect Search & Performance Max campaign leads with source attribution.",
    status: "Connected",
    iconColor: "text-rose-400",
    avatarBg: "from-rose-600 to-red-600",
    accentBorder: "border-rose-500/30",
  },
  {
    id: "website-forms",
    name: "Website Forms",
    shortName: "W",
    category: "WEBSITE",
    description: "Turn website visitors and landing page submissions into qualified CRM leads.",
    status: "Connected",
    iconColor: "text-violet-400",
    avatarBg: "from-violet-600 to-purple-600",
    accentBorder: "border-violet-500/30",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    shortName: "WA",
    category: "COMMUNICATION",
    description: "Centralize two-way chats, automated bot triggers, and lead interactions.",
    status: "Connected",
    iconColor: "text-emerald-400",
    avatarBg: "from-emerald-500 to-green-600",
    accentBorder: "border-emerald-500/30",
  },
  {
    id: "custom-api",
    name: "Custom Webhook API",
    shortName: "API",
    category: "DEVELOPER",
    description: "Connect proprietary internal tools, ERPs, and custom lead generation endpoints.",
    status: "Ready",
    iconColor: "text-cyan-400",
    avatarBg: "from-cyan-600 to-blue-600",
    accentBorder: "border-cyan-500/30",
  },
];
