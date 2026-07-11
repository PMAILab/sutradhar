import "dotenv/config";

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  isProd: process.env.NODE_ENV === "production",
  port: Number(optional("PORT", "4000")),
  frontendOrigin: optional("FRONTEND_ORIGIN", "http://localhost:5173").replace(/\/+$/, ""),
  // The Netlify frontend's own origin, despite the name — not this API's
  // onrender.com URL. See lib/origins.ts for why.
  appOrigin: optional("APP_ORIGIN").replace(/\/+$/, "") || undefined,
  supabaseUrl: optional("SUPABASE_URL"),
  supabaseAnonKey: optional("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  geminiApiKey: optional("VERTEX_API_KEY"),
  whatsappAccessToken: optional("WHATSAPP_ACCESS_TOKEN"),
  whatsappPhoneNumberId: optional("WHATSAPP_PHONE_NUMBER_ID"),
  whatsappBusinessAccountId: optional("WHATSAPP_BUSINESS_ACCOUNT_ID"),
  whatsappVerifyToken: optional("WHATSAPP_VERIFY_TOKEN"),
};
