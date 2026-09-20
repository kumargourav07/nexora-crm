import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processIncomingWebhook } from "@/lib/services/webhook-service";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Nexora-Signature, X-Signature, X-Api-Key",
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await context.params;

    if (!integrationId) {
      return NextResponse.json({ error: "Missing integrationId" }, { status: 400 });
    }

    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: `Integration not found for ID: ${integrationId}` },
        { status: 404 }
      );
    }

    const rawPayload = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = await processIncomingWebhook(
      integration.workspaceId,
      integration.provider,
      rawPayload,
      headers,
      integration.id
    );

    return NextResponse.json(result, {
      status: result.statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[Custom Webhook Error]:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
