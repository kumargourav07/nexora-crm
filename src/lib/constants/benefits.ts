/**
 * Benefits & Value Propositions Constants for NEXORA CRM
 */

export interface Benefit {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  tag: string;
}

export const BENEFITS_LIST: Benefit[] = [
  {
    id: "connected-platform",
    number: "01",
    eyebrow: "ONE CONNECTED PLATFORM",
    title: "One platform. Every workflow.",
    description:
      "Manage leads, people, billing, and connected lead sources without jumping between disconnected systems or spreadsheets.",
    tag: "360° Convergence",
  },
  {
    id: "move-faster",
    number: "02",
    eyebrow: "VELOCITY",
    title: "Move faster from lead to revenue.",
    description:
      "Keep your sales pipeline seamlessly connected from initial inquiry to qualified deal, contract proposal, and automated invoice.",
    tag: "Faster Conversions",
  },
  {
    id: "better-visibility",
    number: "03",
    eyebrow: "VISIBILITY",
    title: "Know what's happening across your business.",
    description:
      "Get a unified real-time view of sales performance, team attendance, cash collection, and pipeline velocity from one workspace.",
    tag: "Real-Time ROI",
  },
  {
    id: "built-to-scale",
    number: "04",
    eyebrow: "SCALABILITY",
    title: "Built to scale with your team.",
    description:
      "Start with the core modules you need today and seamlessly activate enterprise workflows as your headcount and deal volume grow.",
    tag: "Zero Lock-in",
  },
  {
    id: "less-manual-work",
    number: "05",
    eyebrow: "AUTOMATION",
    title: "Less manual work.",
    description:
      "Eliminate copy-pasting and manual data entry by routing lead sources, notifications, and invoicing through smart automated triggers.",
    tag: "10x Productivity",
  },
  {
    id: "unified-operations",
    number: "06",
    eyebrow: "OPERATIONS",
    title: "A clearer way to run operations.",
    description:
      "Give your sales, HR, and finance teams one single source of truth instead of scattered communication channels and siloed tools.",
    tag: "Single Source of Truth",
  },
];
