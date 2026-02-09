import { z } from "zod";
import { HttpClient } from "../http/httpClient.js";
import { AppConfig } from "../config.js";
import { AppError } from "../domain/errors.js";

const OAuthTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().positive()
});

export class UpsOAuthClient {
  constructor(private http: HttpClient, private cfg: AppConfig) {}

  async fetchToken(): Promise<{ token: string; expiresInSec: number }> {
    const url = this.cfg.UPS_OAUTH_URL;
    const basic = Buffer.from(`${this.cfg.UPS_CLIENT_ID}:${this.cfg.UPS_CLIENT_SECRET}`).toString("base64");
    const body = new URLSearchParams({ grant_type: "client_credentials" }).toString();
    
    const resp = await this.http.request({
      method: "POST",
      url,
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      timeoutMs: this.cfg.HTTP_TIMEOUT_MS
    });

    try {
      const parsed = OAuthTokenResponseSchema.parse(resp.data);
      return { token: parsed.access_token, expiresInSec: parsed.expires_in };
    } catch (e) {
      throw new AppError({
        code: "UPSTREAM_MALFORMED_RESPONSE",
        message: "Malformed OAuth token response",
        status: resp.status,
        details: { data: resp.data }
      });
    }
  }
}
