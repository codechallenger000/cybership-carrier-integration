import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nock from "nock";
import { disableNet, enableNet, envForTests } from "./helpers.js";
import { buildService } from "../src/index.js";

describe("UPS OAuth token lifecycle (integration test via HTTP stubs)", () => {
  beforeEach(() => {
    envForTests();
    disableNet();
  });

  afterEach(() => {
    nock.cleanAll();
    enableNet();
    vi.useRealTimers();
  });

  it("acquires token once and reuses it until expiry, then refreshes", async () => {
    vi.useFakeTimers();

    const tokenScope = nock("https://onlinetools.ups.com")
      .post("/security/v1/oauth/token")
      .reply(200, { access_token: "token-1", expires_in: 60 });

    const rateScope1 = nock("https://wwwcie.ups.com")
      .post("/api/rating/v2403/shop")
      .query(true)
      .matchHeader("authorization", "Bearer token-1")
      .twice()
      .reply(200, {
        RateResponse: {
          RatedShipment: {
            Service: { Code: "03", Description: "" },
            TotalCharges: { CurrencyCode: "USD", MonetaryValue: "15.54" }
          }
        }
      });

    const svc = buildService();

    await svc.rateShop({
      carrier: "UPS",
      origin: { addressLine1: "A", city: "C", postalCode: "1", countryCode: "US" },
      destination: { addressLine1: "B", city: "D", postalCode: "2", countryCode: "US" },
      packages: [{ lengthIn: 5, widthIn: 5, heightIn: 5, weightLb: 1 }]
    });

    await svc.rateShop({
      carrier: "UPS",
      origin: { addressLine1: "A", city: "C", postalCode: "1", countryCode: "US" },
      destination: { addressLine1: "B", city: "D", postalCode: "2", countryCode: "US" },
      packages: [{ lengthIn: 5, widthIn: 5, heightIn: 5, weightLb: 1 }]
    });

    expect(tokenScope.isDone()).toBe(true);
    expect(rateScope1.isDone()).toBe(true);

    vi.advanceTimersByTime(120_000);

    const tokenScope2 = nock("https://onlinetools.ups.com")
      .post("/security/v1/oauth/token")
      .reply(200, { access_token: "token-2", expires_in: 60 });

    const rateScope2 = nock("https://wwwcie.ups.com")
      .post("/api/rating/v2403/shop")
      .query(true)
      .matchHeader("authorization", "Bearer token-2")
      .reply(200, {
        RateResponse: {
          RatedShipment: {
            Service: { Code: "03", Description: "" },
            TotalCharges: { CurrencyCode: "USD", MonetaryValue: "15.54" }
          }
        }
      });

    await svc.rateShop({
      carrier: "UPS",
      origin: { addressLine1: "A", city: "C", postalCode: "1", countryCode: "US" },
      destination: { addressLine1: "B", city: "D", postalCode: "2", countryCode: "US" },
      packages: [{ lengthIn: 5, widthIn: 5, heightIn: 5, weightLb: 1 }]
    });

    expect(tokenScope2.isDone()).toBe(true);
    expect(rateScope2.isDone()).toBe(true);
  });
});
