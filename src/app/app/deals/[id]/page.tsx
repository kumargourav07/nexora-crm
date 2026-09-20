import { DealDetailClient } from "@/components/app/deal-detail-client";

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { id } = await params;
  return <DealDetailClient dealId={id} />;
}
