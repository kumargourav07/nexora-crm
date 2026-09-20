import { InvoiceReportsClient } from "@/components/app/invoice-reports-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoicing & Billing Reports | NEXORA CRM",
  description: "Comprehensive billing analytics, collection rates, and aging invoice metrics.",
};

export default function InvoiceReportsPage() {
  return <InvoiceReportsClient />;
}
