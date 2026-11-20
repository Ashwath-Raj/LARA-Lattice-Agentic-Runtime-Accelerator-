/**
 * LARA API Errors
 * Standardized client-side error handling for LARA runtime API responses.
 * Matches backend LARAError envelope:
 * { "error": { "code": string, "message": string, "request_id": string, "trace_id": string | null, "details": object | null } }
 */

export interface LaraErrorEnvelope {
  error: {
    code: string;
    message: string;
    request_id?: string;
    trace_id?: string | null;
    details?: Record<string, unknown> | null;
  };
}

export class LaraApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly requestId?: string;
  public readonly traceId?: string | null;
  public readonly details?: Record<string, unknown> | null;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    requestId?: string,
    traceId?: string | null,
    details?: Record<string, unknown> | null
  ) {
    super(message);
    this.name = 'LaraApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
    this.traceId = traceId;
    this.details = details;

    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, LaraApiError.prototype);
  }
}

/** Type guard for LaraApiError */
export function isLaraApiError(error: unknown): error is LaraApiError {
  return error instanceof LaraApiError;
}

/** Check if error represents an authentication failure (401) */
export function isAuthError(error: unknown): boolean {
  if (!isLaraApiError(error)) return false;
  return (
    error.statusCode === 401 ||
    error.code === 'UNAUTHENTICATED' ||
    error.code === 'AUTH_UNAUTHORIZED' ||
    error.code === 'SESSION_EXPIRED'
  );
}

/** Check if error represents a policy or separation of duties denial (403) */
export function isPolicyDenied(error: unknown): boolean {
  if (!isLaraApiError(error)) return false;
  return (
    error.statusCode === 403 ||
    error.code === 'POLICY_DENIED' ||
    error.code === 'SEPARATION_OF_DUTIES_VIOLATION' ||
    error.code === 'FORBIDDEN' ||
    error.code === 'INSUFFICIENT_CLEARANCE'
  );
}

/** Check if error represents a resource not found (404) */
export function isNotFoundError(error: unknown): boolean {
  if (!isLaraApiError(error)) return false;
  return error.statusCode === 404 || error.code === 'NOT_FOUND';
}

/** Check if error represents a conflict (409) */
export function isConflictError(error: unknown): boolean {
  if (!isLaraApiError(error)) return false;
  return error.statusCode === 409 || error.code === 'CONFLICT';
}

/** Check if error represents a validation failure (422) */
export function isValidationError(error: unknown): boolean {
  if (!isLaraApiError(error)) return false;
  return error.statusCode === 422 || error.code === 'VALIDATION_ERROR';
}

/** Check if error represents backend sandbox or service unavailability (502/503/504) */
export function isSandboxUnavailable(error: unknown): boolean {
  if (!isLaraApiError(error)) return false;
  return (
    error.statusCode === 502 ||
    error.statusCode === 503 ||
    error.statusCode === 504 ||
    error.code === 'SANDBOX_UNAVAILABLE' ||
    error.code === 'BACKEND_UNAVAILABLE'
  );
}
