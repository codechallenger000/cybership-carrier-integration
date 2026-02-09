export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "UPSTREAM_HTTP_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_MALFORMED_RESPONSE"
  | "UNKNOWN";

export type AppErrorArgs = {
  code: ErrorCode;
  message: string;
  status?: number;
  details?: unknown;
  retryable?: boolean;
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status?: number;
  public readonly details?: unknown;
  public readonly retryable: boolean;

  constructor(args: AppErrorArgs) {
    super(args.message);

    this.name = "AppError";
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
    this.retryable = args.retryable ?? false;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function asAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof Error) {
    return new AppError({
      code: "UNKNOWN",
      message: err.message,
      details: {
        name: err.name,
        stack: err.stack
      }
    });
  }

  return new AppError({
    code: "UNKNOWN",
    message: "Unknown error",
    details: err
  });
}
