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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Nexora-Form-Key, X-Form-Key",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Determine target workspace
    // 1. Search for website integration matching form key if provided
    let workspaceId: string | null = null;
    let integrationId: string | null = null;

    const defaultInteg = await prisma.integration.findFirst({
      where: { provider: IntegrationProvider.WEBSITE },
    });

    if (defaultInteg) {
      workspaceId = defaultInteg.workspaceId;
      integrationId = defaultInteg.id;
    } else {
      const defaultWorkspace = await prisma.workspace.findFirst();
      if (!defaultWorkspace) {
        return NextResponse.json({ error: "No active workspace found" }, { status: 404 });
      }
      workspaceId = defaultWorkspace.id;
    }

    const result = await processIncomingWebhook(
      workspaceId,
      IntegrationProvider.WEBSITE,
      rawPayload,
      headers,
      integrationId || undefined
    );

    return NextResponse.json(result, {
      status: result.statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[Website Webhook Error]:", error);
    return NextResponse.json(
      { error: "Internal form processing error" },
      { status: 500 }
    );
  }
}
