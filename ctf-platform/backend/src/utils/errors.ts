export class AppError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(429, "Too many requests. Please slow down.", "RATE_LIMITED");
  }
}

export class EventStateError extends AppError {
  constructor(message: string) {
    super(403, message, "EVENT_STATE_ERROR");
  }
}

export class BannedError extends AppError {
  constructor() {
    super(403, "Your account has been banned.", "BANNED");
  }
}
