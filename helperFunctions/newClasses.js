export class CustomError extends Error {
  constructor(name, message, status) {
    super(message);
    this.name = name;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }

  logError() {
    console.log(this.stack);
  }
}
