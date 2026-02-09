import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { disableNet, enableNet, envForTests } from "./helpers.js";
import { buildService } from "../src/index.js";
import { AppError } from "../src/domain/errors.js";

describe("UPS rateShop end-to-end logic (with stubbed HTTP)", () => {
  beforeEach(() => {
    envForTests();
    disableNet();
  });

  afterEach(() => {
    nock.cleanAll();
    enableNet();
  });

  it("builds correct UPS payload and normalizes response", async () => {
    nock("https://onlinetools.ups.com")
      .post("/security/v1/oauth/token")
      .reply(200, { access_token: "token-1", expires_in: 300 });

    const rating = nock("https://wwwcie.ups.com")
      .post("/api/rating/v2403/shop", (body) => {
        return Boolean(
          body?.RateRequest?.Shipment?.Shipper?.ShipperNumber === "A1B2C3" &&
          body?.RateRequest?.Shipment?.Package?.Dimensions?.UnitOfMeasurement?.Code === "IN" &&
          body?.RateRequest?.Shipment?.Package?.PackageWeight?.UnitOfMeasurement?.Code === "LBS"
        );
      })
      .query(true)
      .reply(200, {
        RateResponse: {
          RatedShipment: {
            Service: { Code: "03", Description: "" },
            TotalCharges: { CurrencyCode: "USD", MonetaryValue: "15.54" }
          }
        }
      });

    const svc = buildService();
    const resp = await svc.rateShop({
      carrier: "UPS",
      origin: {
        name: "ShipperName",
        addressLine1: "ShipperAddressLine",
        city: "TIMONIUM",
        stateProvinceCode: "MD",
        postalCode: "21093",
        countryCode: "US"
      },
      destination: {
        name: "ShipToName",
        addressLine1: "ShipToAddressLine",
        city: "TIMONIUM",
        stateProvinceCode: "MD",
        postalCode: "21093",
        countryCode: "US"
      },
      packages: [{ lengthIn: 5, widthIn: 5, heightIn: 5, weightLb: 1 }]
    });

    expect(rating.isDone()).toBe(true);
    expect(resp.quotes.length).toBe(1);
    expect(resp.quotes[0].total.amount).toBe("15.54");
    expect(resp.quotes[0].total.currency).toBe("USD");
    expect(resp.quotes[0].serviceCode).toBe("03");
  });

  it("returns structured validation error before any upstream call", async () => {
    const svc = buildService();
    await expect(
      svc.rateShop({
        carrier: "UPS",
        origin: { addressLine1: "", city: "", postalCode: "", countryCode: "US" },
        destination: { addressLine1: "X", city: "Y", postalCode: "Z", countryCode: "US" },
        packages: []
      })
    ).rejects.toMatchObject<AppError>({ code: "VALIDATION_ERROR" });
  });

  it("maps 429 to retryable upstream error", async () => {
    nock("https://onlinetools.ups.com")
      .post("/security/v1/oauth/token")
      .reply(200, { access_token: "token-1", expires_in: 300 });

    nock("https://wwwcie.ups.com")
      .post("/api/rating/v2403/shop")
      .query(true)
      .reply(429, { message: "Too Many Requests" });

    const svc = buildService();
    await expect(
      svc.rateShop({
        carrier: "UPS",
        origin: { addressLine1: "A", city: "C", postalCode: "1", countryCode: "US" },
        destination: { addressLine1: "B", city: "D", postalCode: "2", countryCode: "US" },
        packages: [{ lengthIn: 5, widthIn: 5, heightIn: 5, weightLb: 1 }]
      })
    ).rejects.toMatchObject<AppError>({ code: "UPSTREAM_HTTP_ERROR", status: 429, retryable: true });
  });

  it("detects malformed JSON response as structured error", async () => {
    nock("https://onlinetools.ups.com")
      .post("/security/v1/oauth/token")
      .reply(200, { access_token: "token-1", expires_in: 300 });

    nock("https://wwwcie.ups.com")
      .post("/api/rating/v2403/shop")
      .query(true)
      .reply(200, { totallyNotRateResponse: true });

    const svc = buildService();
    await expect(
      svc.rateShop({
        carrier: "UPS",
        origin: { addressLine1: "A", city: "C", postalCode: "1", countryCode: "US" },
        destination: { addressLine1: "B", city: "D", postalCode: "2", countryCode: "US" },
        packages: [{ lengthIn: 5, widthIn: 5, heightIn: 5, weightLb: 1 }]
      })
    ).rejects.toMatchObject<AppError>({ code: "UPSTREAM_MALFORMED_RESPONSE" });
  });
});
