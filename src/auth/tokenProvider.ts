import { UpsOAuthClient } from "./upsOAuthClient.js";

export type AccessToken = {
  token: string;
  expiresAtMs: number;
};

export interface TokenProvider {
  getToken(): Promise<string>;
}

export class CachedTokenProvider implements TokenProvider {
  private cached?: AccessToken;
  private inflight?: Promise<string>;

   constructor(
    private oauth: UpsOAuthClient,
    private skewMs: number = 30_000
  ) {}

  async getToken(): Promise<string> {
    const now = Date.now();

    if (this.cached && now < this.cached.expiresAtMs - this.skewMs) {
      return this.cached.token;
    }

    if (!this.inflight) {
      this.inflight = this.refresh().finally(() => {
        this.inflight = undefined;
      });
    }

    return this.inflight;
  }

  private async refresh(): Promise<string> {
    const { token, expiresInSec } = await this.oauth.fetchToken();

    const expiresAtMs = Date.now() + expiresInSec * 1000;

    this.cached = {
      token,
      expiresAtMs
    };

    return token;
  }
}
