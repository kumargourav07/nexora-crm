import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppLayoutShell } from "@/components/app/app-layout-shell";

export const metadata: Metadata = {
  title: "NEXORA CRM | Workspace",
  description: "Enterprise multi-tenant CRM database platform.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || !session.userId || !session.workspaceId) {
    redirect("/login");
  }

  return <AppLayoutShell session={session}>{children}</AppLayoutShell>;
}
