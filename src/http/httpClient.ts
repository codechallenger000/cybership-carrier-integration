export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type HttpRequest = {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
};

export type HttpResponse<T = unknown> = {
  status: number;
  headers: Record<string, string>;
  data: T;
};

export interface HttpClient {
  request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>>;
}
