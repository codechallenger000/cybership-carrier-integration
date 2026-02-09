import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  UPS_BASE_URL: z.string().default("https://wwwcie.ups.com"),
  UPS_RATING_VERSION: z.string().default("v2403"),
  UPS_OAUTH_URL: z.string().default("https://onlinetools.ups.com/security/v1/oauth/token"),
  UPS_CLIENT_ID: z.string().min(1),
  UPS_CLIENT_SECRET: z.string().min(1),
  UPS_SHIPPER_NUMBER: z.string().min(1),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000)
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(): AppConfig {
  return EnvSchema.parse(process.env);
}
