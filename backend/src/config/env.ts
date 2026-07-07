import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(optional("PORT", "4000")),
  frontendOrigin: optional("FRONTEND_ORIGIN", "http://localhost:5173"),
  supabaseUrl: optional("SUPABASE_URL"),
  supabaseAnonKey: optional("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  geminiApiKey: optional("GEMINI_API_KEY"),
  whatsappAccessToken: optional("WHATSAPP_ACCESS_TOKEN"),
  whatsappPhoneNumberId: optional("WHATSAPP_PHONE_NUMBER_ID"),
  whatsappBusinessAccountId: optional("WHATSAPP_BUSINESS_ACCOUNT_ID"),
  whatsappVerifyToken: optional("WHATSAPP_VERIFY_TOKEN"),
};

export { required };
