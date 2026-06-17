import {
  findProjectsByNotionSource,
  getNotionWebhookVerificationToken,
  saveIntegrationWebhookToken,
  saveWebhookToken,
  scheduleDebounceSync,
  updateWebhookStatus,
} from "../db.js";
import type { Env } from "../env.js";
import { verifyNotionWebhookSignature } from "./notion-signature.js";

export type WebhookHandleResult = {
  response: Response;
  projectIdsToSync: string[];
};

function extractVerificationToken(
  payload: Record<string, unknown>,
): string | null {
  if (
    typeof payload.verification_token === "string" &&
    payload.verification_token
  ) {
    return payload.verification_token;
  }

  const events = payload.events;
  if (Array.isArray(events)) {
    for (const event of events) {
      if (typeof event !== "object" || event === null) continue;
      const token = (event as Record<string, unknown>).verification_token;
      if (typeof token === "string" && token) return token;
    }
  }

  return null;
}

function extractNotionSourceId(event: Record<string, unknown>): string | null {
  const data = event.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const parent = data.parent as Record<string, unknown> | undefined;
  if (parent) {
    if (typeof parent.data_source_id === "string") return parent.data_source_id;
    if (typeof parent.database_id === "string") return parent.database_id;
  }

  if (typeof data.data_source_id === "string") return data.data_source_id;
  if (typeof data.database_id === "string") return data.database_id;

  return null;
}

export async function registerNotionWebhook(
  env: Env,
  projectId: string,
): Promise<void> {
  await updateWebhookStatus(env, projectId, "awaiting_verification");
}

export async function handleNotionWebhook(
  env: Env,
  rawBody: string,
  signature: string | undefined,
): Promise<WebhookHandleResult> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return {
      response: new Response("Invalid JSON", { status: 400 }),
      projectIdsToSync: [],
    };
  }

  const handshakeToken = extractVerificationToken(payload);
  if (handshakeToken) {
    await saveIntegrationWebhookToken(env, handshakeToken);

    const projects = await env.DB.prepare(`SELECT id FROM projects`).all<{
      id: string;
    }>();
    for (const row of projects.results ?? []) {
      await saveWebhookToken(env, row.id, handshakeToken);
      await updateWebhookStatus(env, row.id, "awaiting_verification");
    }

    console.log(
      "\n========== NOTION WEBHOOK VERIFICATION ==========\n" +
        "verification_token received (stored for signature verification).\n" +
        "Paste this token in Notion → Integration → Webhooks → Verify subscription.\n" +
        "Check the project dashboard or worker logs for the token value.\n" +
        "=================================================\n",
    );
    console.log(`verification_token: ${handshakeToken}`);

    return {
      response: new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      projectIdsToSync: [],
    };
  }

  const verificationToken = await getNotionWebhookVerificationToken(env);
  if (verificationToken) {
    if (!signature) {
      console.warn("Notion webhook rejected: missing X-Notion-Signature");
      return {
        response: new Response("Missing signature", { status: 401 }),
        projectIdsToSync: [],
      };
    }

    const signatureValid = await verifyNotionWebhookSignature(
      verificationToken,
      rawBody,
      signature,
    );
    if (!signatureValid) {
      console.warn(
        "Notion webhook rejected: invalid X-Notion-Signature",
        "(re-add the webhook URL in Notion to receive a fresh verification token)",
      );
      return {
        response: new Response("Invalid signature", { status: 401 }),
        projectIdsToSync: [],
      };
    }
  } else {
    // Bootstrap only: accept until Notion handshake stores a signing secret.
    console.warn(
      "Notion webhook: no signing secret stored yet — processing without signature check",
    );
  }

  const events = Array.isArray(payload.events) ? payload.events : [payload];
  const projectIds = new Set<string>();

    for (const event of events) {
    const sourceId = extractNotionSourceId(event as Record<string, unknown>);
    if (!sourceId) {
      console.warn(
        "Notion webhook event without data_source_id/database_id",
        JSON.stringify(event),
      );
      continue;
    }

    const projects = await findProjectsByNotionSource(env, sourceId);
    for (const project of projects) {
      const shouldEnqueue = await scheduleDebounceSync(env, project.id);
      if (shouldEnqueue) {
        projectIds.add(project.id);
      }
    }
  }

  const ids = [...projectIds];
  if (ids.length > 0) {
    console.log(
      `Notion webhook matched ${ids.length} project(s):`,
      ids.join(", "),
    );
  } else if (verificationToken) {
    console.log("Notion webhook accepted (no matching projects in payload)");
  }

  return {
    response: new Response(
      JSON.stringify({ received: true, projects: ids.length }),
      {
        headers: { "Content-Type": "application/json" },
      },
    ),
    projectIdsToSync: ids,
  };
}
