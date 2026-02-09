import { Carrier } from "../carrier.js";
import { RateRequest, RateShopResponse } from "../../domain/model.js";
import { UpsRateShopOperation } from "./rateShopOperation.js";

export class UpsCarrier implements Carrier {
  public readonly code = "UPS" as const;

  constructor(private ops: { rateShop: UpsRateShopOperation }) {}

  async rateShop(req: RateRequest): Promise<RateShopResponse> {
    return this.ops.rateShop.execute(req);
  }
}
