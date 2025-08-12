export class ZeroGError extends Error {
    constructor(
      message: string,
      public code: string,           
      public originalError?: Error   
    ) {
      super(message);
      this.name = 'ZeroGError';
    }
  }
  

  export class ConfigurationError extends ZeroGError {
    constructor(message: string, originalError?: Error) {
      super(message, 'CONFIGURATION_ERROR', originalError);
    }
  }
  

  export class NetworkError extends ZeroGError {
    constructor(message: string, originalError?: Error) {
      super(message, 'NETWORK_ERROR', originalError);
    }
  }
  

  export class InsufficientFundsError extends ZeroGError {
    constructor(message: string = 'Insufficient funds in ledger', originalError?: Error) {
      super(message, 'INSUFFICIENT_FUNDS', originalError);
    }
  }
  
  export class ValidationError extends ZeroGError {
    constructor(message: string, originalError?: Error) {
      super(message, 'VALIDATION_ERROR', originalError);
    }
  }