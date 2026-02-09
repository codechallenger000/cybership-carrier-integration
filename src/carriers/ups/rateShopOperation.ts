import { AppConfig } from "../../config.js";
import { HttpClient } from "../../http/httpClient.js";
import { TokenProvider } from "../../auth/tokenProvider.js";
import { RateRequest, RateShopResponse } from "../../domain/model.js";
import { AppError } from "../../domain/errors.js";
import { UpsRateResponseSchema } from "./upsSchemas.js";

export class UpsRateShopOperation {
  constructor(
    private http: HttpClient,
    private tokenProvider: TokenProvider,
    private cfg: AppConfig
  ) {}

  async execute(req: RateRequest): Promise<RateShopResponse> {
    const token = await this.tokenProvider.getToken();

    const url = `${this.cfg.UPS_BASE_URL}/api/rating/${this.cfg.UPS_RATING_VERSION}/${req.serviceLevel ? "rate" : "shop"}`;

    const upsPayload = buildUpsRateRequest(req, this.cfg.UPS_SHIPPER_NUMBER);

    const resp = await this.http.request({
      method: "POST",
      url,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      query: { additionalinfo: "" },
      body: upsPayload,
      timeoutMs: this.cfg.HTTP_TIMEOUT_MS
    });

    if (resp.status < 200 || resp.status >= 300) {
      throw new AppError({
        code: resp.status === 401 ? "AUTH_ERROR" : resp.status === 429 ? "RATE_LIMITED" : "UPSTREAM_HTTP_ERROR",
        message: `UPS rating failed with status ${resp.status}`,
        status: resp.status,
        retryable: resp.status >= 500 || resp.status === 429,
        details: resp.data
      });
    }

    let parsed: ReturnType<typeof UpsRateResponseSchema.parse>;
    try {
      parsed = UpsRateResponseSchema.parse(resp.data);
    } catch {
      throw new AppError({
        code: "UPSTREAM_MALFORMED_RESPONSE",
        message: "Malformed UPS RateResponse",
        status: resp.status,
        details: resp.data
      });
    }

    const rated = parsed.RateResponse.RatedShipment;
    const shipments = Array.isArray(rated) ? rated : [rated];

    const quotes = shipments
      .map((s) => {
        const serviceCode = s.Service?.Code ?? req.serviceLevel ?? "UNKNOWN";
        const total = s.TotalCharges;
        if (!total) return null;
        return {
          carrier: "UPS" as const,
          serviceCode,
          total: { currency: total.CurrencyCode, amount: total.MonetaryValue },
          raw: s
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return { quotes };
  }
}

export function buildUpsRateRequest(req: RateRequest, shipperNumber: string) {
  const pkg = req.packages[0];

  const baseShipment: any = {
    Shipper: {
      Name: req.origin.name ?? "Shipper",
      ShipperNumber: shipperNumber,
      Address: {
        AddressLine: [req.origin.addressLine1, req.origin.addressLine2].filter(Boolean),
        City: req.origin.city,
        StateProvinceCode: req.origin.stateProvinceCode,
        PostalCode: req.origin.postalCode,
        CountryCode: req.origin.countryCode
      }
    },
    ShipTo: {
      Name: req.destination.name ?? "ShipTo",
      Address: {
        AddressLine: [req.destination.addressLine1, req.destination.addressLine2].filter(Boolean),
        City: req.destination.city,
        StateProvinceCode: req.destination.stateProvinceCode,
        PostalCode: req.destination.postalCode,
        CountryCode: req.destination.countryCode
      }
    },
    ShipFrom: {
      Name: req.origin.name ?? "ShipFrom",
      Address: {
        AddressLine: [req.origin.addressLine1, req.origin.addressLine2].filter(Boolean),
        City: req.origin.city,
        StateProvinceCode: req.origin.stateProvinceCode,
        PostalCode: req.origin.postalCode,
        CountryCode: req.origin.countryCode
      }
    },
    PaymentDetails: {
      ShipmentCharge: {
        Type: "01",
        BillShipper: { AccountNumber: shipperNumber }
      }
    },
    NumOfPieces: String(req.packages.length),
    Package: {
      PackagingType: { Code: "02" }, // customer-supplied package
      Dimensions: {
        UnitOfMeasurement: { Code: "IN" },
        Length: String(pkg.lengthIn),
        Width: String(pkg.widthIn),
        Height: String(pkg.heightIn)
      },
      PackageWeight: {
        UnitOfMeasurement: { Code: "LBS" },
        Weight: String(pkg.weightLb)
      }
    }
  };

  if (req.serviceLevel) {
    baseShipment.Service = { Code: req.serviceLevel };
  }

  return {
    RateRequest: {
      Request: {
        TransactionReference: {
          CustomerContext: "cybership-rate-shop",
          TransactionIdentifier: "tx-1"
        }
      },
      Shipment: baseShipment
    }
  };
}
