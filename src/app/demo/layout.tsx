import type { Metadata } from "next";
import { DemoLayoutShell } from "@/components/demo/demo-layout";

export const metadata: Metadata = {
  title: "Interactive CRM Product Demo | NEXORA CRM",
  description:
    "Explore NEXORA CRM with an interactive live prototype. Test lead management, sales deal pipelines, HRMS workforce directory, GST invoicing, integrations, and executive analytics.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DemoLayoutShell>{children}</DemoLayoutShell>;
}
