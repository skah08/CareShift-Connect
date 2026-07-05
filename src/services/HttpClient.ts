// Central HTTP middleware. All outbound network calls (fetch wrappers,
// third-party APIs) flow through this module so we have a single place to
// inject headers, log, intercept auth, or swap the transport later.

import { supabase } from "./SupabaseClient";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface HttpRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function buildHeaders(auth: boolean, extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra ?? {}),
  };
  if (auth) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export const httpClient = {
  async request<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const { method = "GET", headers, body, auth = false, signal } = options;
    const finalHeaders = await buildHeaders(auth, headers);
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload: unknown = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      throw new HttpError(response.status, payload, `HTTP ${response.status}`);
    }
    return payload as T;
  },
  get<T>(url: string, options?: Omit<HttpRequestOptions, "method" | "body">) {
    return this.request<T>(url, { ...options, method: "GET" });
  },
  post<T>(url: string, body?: unknown, options?: Omit<HttpRequestOptions, "method">) {
    return this.request<T>(url, { ...options, method: "POST", body });
  },
};