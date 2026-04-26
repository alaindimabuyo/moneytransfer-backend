import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),
  cookieName: optional("COOKIE_NAME", "mtq_session"),
  frontendOrigin: optional("FRONTEND_ORIGIN", "http://localhost:3000"),
  exchangeRateApiKey: optional("EXCHANGE_RATE_API_KEY", ""),
  exchangeRateCacheTtlMinutes: Number(
    optional("EXCHANGE_RATE_CACHE_TTL_MINUTES", "5")
  ),
  googleClientId: optional("GOOGLE_CLIENT_ID", ""),
};

export const isProd = env.nodeEnv === "production";
