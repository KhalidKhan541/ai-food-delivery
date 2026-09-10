export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", code: string = "BAD_REQUEST") {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message: string = "Unauthorized",
    code: string = "UNAUTHORIZED"
  ) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", code: string = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Not found", code: string = "NOT_FOUND") {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict", code: string = "CONFLICT") {
    super(message, 409, code);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(
    errors: Record<string, string[]>,
    message: string = "Validation failed"
  ) {
    super(message, 422, "VALIDATION_ERROR");
    this.errors = errors;
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super("Too many requests", 429, "RATE_LIMITED");
    this.retryAfter = retryAfter;
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message?: string) {
    super(
      message ?? `External service error: ${service}`,
      502,
      "EXTERNAL_SERVICE_ERROR"
    );
    this.service = service;
  }
}

export class PaymentError extends AppError {
  constructor(message: string = "Payment processing failed") {
    super(message, 402, "PAYMENT_ERROR");
  }
}

export class DeliveryError extends AppError {
  constructor(message: string = "Delivery operation failed") {
    super(message, 400, "DELIVERY_ERROR");
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, "INTERNAL_ERROR", false);
  }

  return new AppError("An unknown error occurred", 500, "UNKNOWN_ERROR", false);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
