import { env } from "../config/env.js";

const GRAPH_API_VERSION = "v21.0";

interface SendTemplateResult {
  waMessageId: string;
}

export class WhatsAppSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppSendError";
  }
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
): Promise<SendTemplateResult> {
  if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId) {
    throw new WhatsAppSendError("WhatsApp is not configured yet, missing access token or phone number ID.");
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.whatsappPhoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: bodyParams.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    const errorMessage = body?.error?.message ?? "WhatsApp rejected the send.";
    throw new WhatsAppSendError(errorMessage);
  }

  const waMessageId = body?.messages?.[0]?.id;
  if (!waMessageId) {
    throw new WhatsAppSendError("WhatsApp accepted the request but returned no message ID.");
  }

  return { waMessageId };
}
