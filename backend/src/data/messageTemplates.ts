/**
 * Mirrors docs/whatsapp_templates.md exactly. If the wording or variable
 * count changes here, the Meta template submission needs to change too,
 * and vice versa, they have to stay in lockstep or sends will fail.
 */
export interface MessageTemplateDef {
  name: string;
  languageCode: string;
  paramLabels: string[];
}

export const MESSAGE_TEMPLATES: Record<string, MessageTemplateDef> = {
  vendor_confirmation_request: {
    name: "vendor_confirmation_request",
    // Meta's Manage Templates flow submitted these as "en" (English), not
    // "en_US" (English (US)) despite the doc's original instruction — Meta
    // treats them as distinct languages, so sends 404 ("does not exist in
    // the translation") if this doesn't match what's actually APPROVED.
    // Verify with GET /{waba_id}/message_templates before changing this.
    languageCode: "en",
    paramLabels: ["Vendor name", "Planner or business name", "Couple names", "Wedding date", "Deliverable"],
  },
  payment_reminder: {
    name: "payment_reminder",
    languageCode: "en",
    paramLabels: ["Vendor name", "Amount", "Couple names", "Due date"],
  },
  plan_update: {
    name: "plan_update",
    languageCode: "en",
    paramLabels: ["Vendor name", "Couple names", "Update details"],
  },
};
