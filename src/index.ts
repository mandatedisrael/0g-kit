export { ZeroGKit } from './core/client.js';

export { 
  chat, 
  deposit, 
  withdraw, 
  getBalance,
  listServices,
  initZeroG,
  useDeepseek,
  useLlama,
  getAvailableModels,

} from './core/inference.js';

export * from './types.js';

export {
  ZeroGError,
  ConfigurationError,
  NetworkError,
  InsufficientFundsError,
  ValidationError
} from './utils/errors.js';

export { chat as default } from './core/inference.js';

