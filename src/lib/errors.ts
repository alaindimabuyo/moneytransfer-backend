export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, "bad_request", message, details);

export const unauthorized = (message = "Unauthorized") =>
  new HttpError(401, "unauthorized", message);

export const forbidden = (message = "Forbidden") =>
  new HttpError(403, "forbidden", message);

export const notFound = (message = "Not found") =>
  new HttpError(404, "not_found", message);

export const conflict = (message: string) =>
  new HttpError(409, "conflict", message);

export const upstreamUnavailable = (message: string) =>
  new HttpError(503, "upstream_unavailable", message);
