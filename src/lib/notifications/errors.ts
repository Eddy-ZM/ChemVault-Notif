export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly statusCode = 500
  ) {
    super(message);
    this.name = "NotificationError";
  }
}
