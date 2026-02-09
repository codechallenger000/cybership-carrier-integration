import { z } from "zod";

export const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    RatedShipment: z.union([
      z.object({
        Service: z.object({ Code: z.string() }).optional(),
        TotalCharges: z.object({ CurrencyCode: z.string(), MonetaryValue: z.string() }).optional()
      }),
      z.array(
        z.object({
          Service: z.object({ Code: z.string() }).optional(),
          TotalCharges: z.object({ CurrencyCode: z.string(), MonetaryValue: z.string() }).optional()
        })
      )
    ])
  })
});
