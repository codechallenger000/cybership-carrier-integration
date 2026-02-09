import nock from "nock";

export function disableNet() {
  nock.disableNetConnect();
}

export function enableNet() {
  nock.enableNetConnect();
}

export function envForTests() {
  process.env.UPS_BASE_URL = "https://wwwcie.ups.com";
  process.env.UPS_RATING_VERSION = "v2403";
  process.env.UPS_OAUTH_URL = "https://onlinetools.ups.com/security/v1/oauth/token";
  process.env.UPS_CLIENT_ID = "test_client";
  process.env.UPS_CLIENT_SECRET = "test_secret";
  process.env.UPS_SHIPPER_NUMBER = "A1B2C3";
  process.env.HTTP_TIMEOUT_MS = "2000";
}
