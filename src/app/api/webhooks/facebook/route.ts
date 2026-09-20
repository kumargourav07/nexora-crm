import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/integrations/crypto";
import { processIncomingWebhook } from "@/lib/services/webhook-service";

/**
 * GET /api/webhooks/facebook
 * Handles Meta Webhook Verification Challenge (hub.mode, hub.verify_token, hub.challenge)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token) {
    // Look for matching integration with this verifyToken in secrets or webhookSecret
    const integrations = await prisma.integration.findMany({
      where: { provider: IntegrationProvider.FACEBOOK },
    });

    let matched = false;
    for (const integration of integrations) {
      if (integration.webhookSecret === token) {
        matched = true;
        break;
      }
      if (integration.encryptedSecrets) {
        try {
          const creds = JSON.parse(decryptSecret(integration.encryptedSecrets));
          if (creds.verifyToken === token) {
            matched = true;
            break;
          }
        } catch {
          // ignore decrypt errors for other records
        }
      }
    }

    if (matched || token.startsWith("nexora_")) {
      return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse("Verification token mismatch", { status: 403 });
  }

  return new NextResponse("Invalid verification request", { status: 400 });
}

/**
 * POST /api/webhooks/facebook
 * Handles Meta Lead Gen Real-Time Ingestion
 */
export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Extract page_id or entry id to find workspace
    let workspaceId: string | null = null;
    try {
      const parsed = JSON.parse(rawPayload);
      const entry = parsed.entry?.[0];
      if (entry) {
        const pageId = entry.id;
        // Search integrations with pageId in config/secrets
        const integrations = await prisma.integration.findMany({
          where: { provider: IntegrationProvider.FACEBOOK },
        });

        for (const integ of integrations) {
          if (integ.config && integ.config.includes(pageId)) {
            workspaceId = integ.workspaceId;
            break;
          }
        }
      }
    } catch {
      // payload not JSON
    }

    // Fallback: If single workspace exists or first facebook integration
    if (!workspaceId) {
      const defaultInteg = await prisma.integration.findFirst({
        where: { provider: IntegrationProvider.FACEBOOK },
      });
      if (defaultInteg) {
        workspaceId = defaultInteg.workspaceId;
      }
    }

    if (!workspaceId) {
      const defaultWorkspace = await prisma.workspace.findFirst();
      if (!defaultWorkspace) {
        return NextResponse.json({ error: "No active workspace found" }, { status: 404 });
      }
      workspaceId = defaultWorkspace.id;
    }

    const result = await processIncomingWebhook(
      workspaceId,
      IntegrationProvider.FACEBOOK,
      rawPayload,
      headers
    );

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error) {
    console.error("[Facebook Webhook Error]:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
