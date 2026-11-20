/**
 * LARA HTTP Transport
 * Centralized typed fetch wrapper for LARA runtime API.
 * Supports explicit data mode (VITE_LARA_DATA_MODE: 'api' | 'mock').
 * Defaults to 'mock' in test runner environments, 'api' in live application environments.
 * Never silently swallows errors or falls back to mock data when in 'api' mode.
 */

import { LaraApiError, LaraErrorEnvelope } from './errors';

export type DataMode = 'api' | 'mock';

// Runtime data mode with default initialized from environment variable
let runtimeDataMode: DataMode =
  (import.meta.env?.VITE_LARA_DATA_MODE as DataMode) ||
  (import.meta.env?.MODE === 'test' ? 'mock' : 'api');

export function getDataMode(): DataMode {
  return runtimeDataMode;
}

export function setDataMode(mode: DataMode): void {
  runtimeDataMode = mode;
}

export function isMockMode(): boolean {
  return runtimeDataMode === 'mock';
}

const DEFAULT_API_BASE = '/api/v1';

export function getApiBaseUrl(): string {
  return (import.meta.env?.VITE_LARA_API_BASE as string) || DEFAULT_API_BASE;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Execute an HTTP request against the LARA backend.
 * Automatically handles credentials, JSON serialization/deserialization,
 * and standardizes LARA backend error envelopes into LaraApiError instances.
 */
export async function httpFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...initOptions } = options;

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const relativePath = `${baseUrl}${cleanEndpoint}`;

  // Ensure absolute URL if running in Node / jsdom environment where native fetch requires absolute URL
  let fullUrl: string;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    fullUrl = relativePath;
  } else if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    window.location.origin !== 'null' &&
    window.location.origin !== 'about:blank'
  ) {
    fullUrl = `${window.location.origin}${relativePath}`;
  } else {
    fullUrl = `http://localhost:3000${relativePath}`;
  }

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = new Headers(customHeaders);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // If a body is present and not FormData/Blob, set JSON Content-Type
  if (initOptions.body && typeof initOptions.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...initOptions,
    headers,
    credentials: 'include', // Always send lara_session cookie
  };

  let response: Response;
  try {
    response = await fetch(fullUrl, fetchOptions);
  } catch (networkError) {
    const errorMsg = networkError instanceof Error ? networkError.message : 'Network request failed';
    throw new LaraApiError(
      `Network error communicating with LARA runtime: ${errorMsg}`,
      0,
      'NETWORK_ERROR'
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as unknown as T;
  }

  // Handle error responses (status >= 400)
  if (!response.ok) {
    let errorCode = `HTTP_${response.status}`;
    let errorMessage = `Request failed with status ${response.status}: ${response.statusText}`;
    let requestId: string | undefined;
    let traceId: string | null = null;
    let details: Record<string, unknown> | null = null;

    try {
      const errorJson = (await response.json()) as LaraErrorEnvelope | Record<string, unknown>;
      if (errorJson && typeof errorJson === 'object') {
        if ('error' in errorJson && errorJson.error && typeof errorJson.error === 'object') {
          const envelope = errorJson as LaraErrorEnvelope;
          errorCode = envelope.error.code || errorCode;
          errorMessage = envelope.error.message || errorMessage;
          requestId = envelope.error.request_id;
          traceId = envelope.error.trace_id ?? null;
          details = envelope.error.details ?? null;
        } else if ('message' in errorJson && typeof errorJson.message === 'string') {
          errorMessage = errorJson.message;
        } else if ('detail' in errorJson) {
          errorMessage =
            typeof errorJson.detail === 'string'
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
          errorCode = 'VALIDATION_ERROR';
        }
      }
    } catch {
      // Non-JSON error body, keep generic status message
    }

    throw new LaraApiError(errorMessage, response.status, errorCode, requestId, traceId, details);
  }

  // Parse successful response JSON
  try {
    const data = await response.json();
    return data as T;
  } catch (parseError) {
    const errorMsg = parseError instanceof Error ? parseError.message : 'Invalid JSON response';
    throw new LaraApiError(
      `Failed to parse response from LARA runtime: ${errorMsg}`,
      response.status,
      'RESPONSE_PARSE_ERROR'
    );
  }
}
