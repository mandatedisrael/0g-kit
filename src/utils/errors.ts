export class ZeroGError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ZeroGError';
  }
}

export class ConfigurationError extends ZeroGError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ConfigurationError';
  }
}

export class NetworkError extends ZeroGError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'NetworkError';
  }
}

export class InsufficientFundsError extends ZeroGError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'InsufficientFundsError';
  }
}

export class ValidationError extends ZeroGError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}