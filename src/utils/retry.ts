import { logger } from './logger.js';

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        logger.error(`Operation failed after ${maxRetries} attempts`, lastError);
        throw lastError;
      }
      
      const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`, lastError);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}


export async function retryNetworkOperation<T>(
  fn: () => Promise<T>,
  operationName: string
): Promise<T> {
  return withRetry(
    fn,
    3,     
    1000   
  );
}