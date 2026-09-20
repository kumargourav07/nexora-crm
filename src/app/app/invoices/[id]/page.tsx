import { InvoiceDetailClient } from "@/components/app/invoice-detail-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice Details | NEXORA CRM",
  description: "View, manage, and print professional customer invoice.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <InvoiceDetailClient invoiceId={resolvedParams.id} />;
}
