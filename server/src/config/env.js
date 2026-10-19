import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Vercel's Atlas configuration may expose the connection as MONGODB_ATLAS_URI.
// Keep MONGODB_URI as the canonical name used by the rest of the application.
const mongodbUri = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI;
const requiredEnvVars = [];
const jwtSecret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;

if (!mongodbUri) {
  requiredEnvVars.push("MONGODB_URI");
}

if (!jwtSecret) {
  requiredEnvVars.push("JWT_SECRET_KEY");
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] && (envVar !== "JWT_SECRET_KEY" || !jwtSecret)) {
    console.error(`[Env Warning] Missing required environment variable "${envVar}".`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: mongodbUri,
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  JWT_ISSUER: "newsfront-cms",
  JWT_AUDIENCE: "newsfront-admin",
  FRONTEND_URL: process.env.FRONTEND_SERVICE_URL || process.env.FRONTEND_URL || "http://localhost:5173",
  COOKIE_NAME: process.env.COOKIE_NAME || "newsfront_admin_token",
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
  isProduction: process.env.NODE_ENV === "production",
  IMAGE_KIT_PUBLIC_KEY: process.env.IMAGE_KIT_PUBLIC_KEY || "",
  IMAGE_KIT_PRIVATE_KEY: process.env.IMAGE_KIT_PRIVATE_KEY || "",
  IMAGE_KIT_URL_ENDPOINT: process.env.URL_ENDPOINT || process.env.IMAGE_KIT_URL_ENDPOINT || "",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || ""
};

export default env;
