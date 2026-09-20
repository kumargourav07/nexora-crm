import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import prisma from "@/lib/prisma";
import { processIncomingWebhook } from "@/lib/services/webhook-service";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Housing-Signature, X-Signature-Sha256",
    },
  });
}

/**
 * POST /api/webhooks/housing
 * Ingests real estate leads from Housing.com & Makaan platforms
 */
export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const searchParams = request.nextUrl.searchParams;
    const workspaceSlug = searchParams.get("workspace");

    let workspaceId: string | null = null;
    if (workspaceSlug) {
      const ws = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
      if (ws) workspaceId = ws.id;
    }

    if (!workspaceId) {
      const integration = await prisma.integration.findFirst({
        where: { provider: IntegrationProvider.HOUSING },
      });
      if (integration) {
        workspaceId = integration.workspaceId;
      }
    }

    if (!workspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      if (!defaultWs) {
        return NextResponse.json({ error: "No workspace configured" }, { status: 404 });
      }
      workspaceId = defaultWs.id;
    }

    const result = await processIncomingWebhook(
      workspaceId,
      IntegrationProvider.HOUSING,
      rawPayload,
      headers
    );

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error) {
    console.error("[Housing Webhook Error]:", error);
    return NextResponse.json({ error: "Internal webhook processing error" }, { status: 500 });
  }
}
