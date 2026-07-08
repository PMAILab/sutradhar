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
    languageCode: "en_US",
    paramLabels: ["Vendor name", "Planner or business name", "Couple names", "Wedding date", "Deliverable"],
  },
  payment_reminder: {
    name: "payment_reminder",
    languageCode: "en_US",
    paramLabels: ["Vendor name", "Amount", "Couple names", "Due date"],
  },
  plan_update: {
    name: "plan_update",
    languageCode: "en_US",
    paramLabels: ["Vendor name", "Couple names", "Update details"],
  },
};
