import { RateRequest, RateShopResponse } from "../domain/model.js";

export interface Carrier {
  code: RateRequest["carrier"];
  rateShop(req: RateRequest): Promise<RateShopResponse>;
}
