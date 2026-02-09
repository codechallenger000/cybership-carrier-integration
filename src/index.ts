import { loadConfig } from "./config.js";
import { AxiosHttpClient } from "./http/axiosHttpClient.js";
import { UpsOAuthClient } from "./auth/upsOAuthClient.js";
import { CachedTokenProvider } from "./auth/tokenProvider.js";
import { UpsRateShopOperation } from "./carriers/ups/rateShopOperation.js";
import { UpsCarrier } from "./carriers/ups/upsCarrier.js";
import { RateRequest, RateShopResponse } from "./domain/model.js";
import { RateRequestSchema } from "./domain/schemas.js";
import { AppError } from "./domain/errors.js";

export class CarrierService {
  constructor(private carriers: Map<RateRequest["carrier"], { rateShop: (r: RateRequest) => Promise<RateShopResponse> }>) {}

  async rateShop(req: RateRequest): Promise<RateShopResponse> {
    const parsed = RateRequestSchema.safeParse(req);
    if (!parsed.success) {
      throw new AppError({ code: "VALIDATION_ERROR", message: "Invalid rate request", details: parsed.error.flatten() });
    }

    const carrier = this.carriers.get(req.carrier);
    if (!carrier) throw new AppError({ code: "UNKNOWN", message: `Unsupported carrier: ${req.carrier}` });

    return carrier.rateShop(parsed.data);
  }
}

export function buildService(): CarrierService {
  const cfg = loadConfig();
  const http = new AxiosHttpClient();

  const oauth = new UpsOAuthClient(http, cfg);
  const tokenProvider = new CachedTokenProvider(oauth);

  const upsRateShop = new UpsRateShopOperation(http, tokenProvider, cfg);
  const upsCarrier = new UpsCarrier({ rateShop: upsRateShop });

  return new CarrierService(
    new Map([
      ["UPS", { rateShop: (r) => upsCarrier.rateShop(r) }]
    ])
  );
}
