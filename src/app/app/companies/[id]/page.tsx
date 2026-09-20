import { CompanyDetailClient } from "@/components/app/company-detail-client";

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = await params;
  return <CompanyDetailClient companyId={id} />;
}
