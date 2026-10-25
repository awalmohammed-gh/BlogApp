import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Development and production share Atlas. Only isolated automated tests may use
// a disposable MONGODB_URI instead of the application's database.
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const mongodbUri = isTest ? process.env.MONGODB_URI : process.env.MONGODB_ATLAS_URI;
const requiredEnvVars = [];
const jwtSecret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;

if (!mongodbUri) {
  requiredEnvVars.push(isTest ? "MONGODB_URI" : "MONGODB_ATLAS_URI");
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
  MONGODB_DB_NAME: isTest ? undefined : "nsemfoa_data",
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  JWT_ISSUER: "newsfront-cms",
  JWT_AUDIENCE: "newsfront-admin",
  FRONTEND_URL: process.env.FRONTEND_SERVICE_URL || process.env.FRONTEND_URL || "http://localhost:5173",
  COOKIE_NAME: process.env.COOKIE_NAME || "newsfront_admin_token",
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
  isProduction,
  IMAGE_KIT_PUBLIC_KEY: process.env.IMAGE_KIT_PUBLIC_KEY || "",
  IMAGE_KIT_PRIVATE_KEY: process.env.IMAGE_KIT_PRIVATE_KEY || "",
  IMAGE_KIT_URL_ENDPOINT: process.env.URL_ENDPOINT || process.env.IMAGE_KIT_URL_ENDPOINT || ""
};

export default env;
