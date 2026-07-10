import { env } from "../config/env.js";

// Trailing slash already stripped in config/env.ts — a copy-pasted
// "https://x.netlify.app/" would otherwise stop matching the browser's
// Origin header (which never has one), silently breaking every
// cross-origin request with a CORS error. Only used as a CORS allow-list
// fallback now — see APP_ORIGIN below for the primary, same-origin path.
export const FRONTEND_ORIGIN = env.frontendOrigin;

// Netlify proxies /api/* to this backend server-to-server (see
// netlify.toml) — so from the browser's perspective, every request stays
// on the Netlify origin, including the Google OAuth round trip. That's
// also the only origin this project's shared Supabase instance has
// allow-listed for redirects (not this API's own onrender.com URL). So,
// confusingly, "this app's own public-facing origin" for OAuth purposes
// IS the Netlify frontend's origin, not this server's — hence APP_ORIGIN
// gets set to the Netlify URL in prod (see render.yaml), not Render's.
export const APP_ORIGIN = env.appOrigin;
