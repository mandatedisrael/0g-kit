import { logger } from './logger';

export async function withRetry<T>(
  fn: () => Promise<T>,        
  maxRetries: number = 3,      
  delay: number = 1000,        
  backoffMultiplier: number = 2 // 
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${maxRetries + 1}`);
      
      const result = await fn();
      
      if (attempt > 1) {
        logger.info(`Success on attempt ${attempt}`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error as Error;
      
     
      if (attempt <= maxRetries) {
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: (error as any).message,
          nextDelay: delay * backoffMultiplier
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoffMultiplier; 
      }
    }
  }
  

  logger.error(`All ${maxRetries + 1} attempts failed`);
  throw lastError;
}


export async function retryNetworkOperation<T>(
  fn: () => Promise<T>,
  operationName: string
): Promise<T> {
  return withRetry(
    fn,
    3,     
    1000,  
    2      // Double delay each time: 1s, 2s, 4s
  );
}