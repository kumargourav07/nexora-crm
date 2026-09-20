import { InvoiceBuilderClient } from "@/components/app/invoice-builder-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Invoice | NEXORA CRM",
  description: "Create a professional customer invoice with GST and live calculations.",
};

export default function NewInvoicePage() {
  return <InvoiceBuilderClient />;
}
