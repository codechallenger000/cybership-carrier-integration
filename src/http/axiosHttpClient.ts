import axios, { AxiosError } from "axios";
import { HttpClient, HttpRequest, HttpResponse } from "./httpClient.js";
import { AppError } from "../domain/errors.js";

export class AxiosHttpClient implements HttpClient {
  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    try {
      const resp = await axios.request<T>({
        method: req.method,
        url: req.url,
        headers: req.headers,
        params: req.query,
        data: req.body,
        timeout: req.timeoutMs
      });

      return {
        status: resp.status,
        headers: normalizeHeaders(resp.headers),
        data: resp.data
      };
    } catch (e) {
      const err = e as AxiosError;

      if (err.code === "ECONNABORTED") {
        throw new AppError({ code: "UPSTREAM_TIMEOUT", message: "Upstream timeout", retryable: true, details: { url: req.url } });
      }

      if (err.response) {
        throw new AppError({
          code: "UPSTREAM_HTTP_ERROR",
          message: `Upstream HTTP error: ${err.response.status}`,
          status: err.response.status,
          retryable: err.response.status >= 500 || err.response.status === 429,
          details: {
            url: req.url,
            data: err.response.data
          }
        });
      }

      throw new AppError({ code: "UNKNOWN", message: "Network error", retryable: true, details: { url: req.url, cause: String(err.message) } });
    }
  }
}

function normalizeHeaders(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (headers && typeof headers === "object") {
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k.toLowerCase()] = v.join(",");
      else if (typeof v === "string") out[k.toLowerCase()] = v;
      else if (v != null) out[k.toLowerCase()] = String(v);
    }
  }
  return out;
}
