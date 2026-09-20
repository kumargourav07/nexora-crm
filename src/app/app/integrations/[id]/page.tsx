import { IntegrationDetailClient } from "@/components/app/integration-detail-client";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IntegrationDetailClient providerParam={id} />;
}
