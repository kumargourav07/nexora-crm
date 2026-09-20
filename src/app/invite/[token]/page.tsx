import type { Metadata } from "next";
import { InviteAcceptClient } from "@/components/app/invite-accept-client";

export const metadata: Metadata = {
  title: "Join Workspace | NEXORA CRM",
  description: "Accept team member invitation to join a NEXORA CRM workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteAcceptClient token={token} />;
}
