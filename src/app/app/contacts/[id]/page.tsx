import { ContactDetailClient } from "@/components/app/contact-detail-client";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;
  return <ContactDetailClient contactId={id} />;
}
