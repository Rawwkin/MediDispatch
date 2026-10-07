import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const required = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const optional = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim() !== "" ? value : fallback;
};

export const config = {
  env: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "5000")),
  clientUrl: optional("CLIENT_URL", "http://localhost:3000"),

  databaseUrl: required("DATABASE_URL"),

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "1d"),
    refreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "7d"),
  },

  bcryptSaltRounds: Number(optional("BCRYPT_SALT_ROUNDS", "10")),

  stripe: {
    productKey: optional("STRIPE_PRODUCT_PRICE_ID", "prod_placeholder"),
    secretKey: optional("STRIPE_SECRET_KEY", "sk_test_placeholder"),
    webhookSecret: optional("STRIPE_WEBHOOK_SECRET", "whsec_placeholder"),
    currency: optional("STRIPE_CURRENCY", "usd"),
  },

  isProduction(): boolean {
    return this.env === "production";
  },
};

export default config;