import { v4 as uuidv4 } from 'uuid';
import { ZeroGKit } from './client';
import { ChatOptions, ZeroGConfig, ChatResponse } from '../types';
import { ConfigurationError, NetworkError, InsufficientFundsError } from '../utils/errors';
import { validateChatMessage } from '../utils/validations';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

// 🌍 Global client instance (shared across your entire app)
let globalClient: ZeroGKit | null = null;

// 🔧 Initialize the SDK (users call this once)
export function initZeroG(config: ZeroGConfig): void {
  if (globalClient) {
    logger.warn('ZeroGKit already initialized, replacing with new config');
  }
  
  globalClient = new ZeroGKit(config);
  logger.info('ZeroGKit configured successfully');
}

// 💬 Main chat function (the magic 2-liner!)
export async function chat(message: string, options: ChatOptions = {}): Promise<string> {
  const startTime = Date.now();
  const requestId = uuidv4();  // Unique ID for tracking
  
  // 2. 🤝 Get the 0G connection
  const timeout = options.timeout || 30000;
  const retries = options.retries || 3;
  
  try {
    // 1. ✅ Validate inputs
    validateChatMessage(message);
    
    if (!globalClient) {
      throw new ConfigurationError('ZeroGKit not initialized. Call initZeroG() first.');
    }

    logger.info('Chat request started', { 
      requestId, 
      messageLength: message.length,
      model: options.model 
    });

    // 3. 🤝 Get the 0G connection
    const broker = await globalClient.getBroker();

    // 3. 🔍 Find available AI services
    const services = await withRetry(async () => {
      logger.debug('Fetching available services...');
      const serviceList = await broker.inference.listService();
      
      if (!serviceList || serviceList.length === 0) {
        throw new NetworkError('No AI inference services available');
      }
      
      logger.debug(`Found ${serviceList.length} available services`);
      return serviceList;
    }, retries);

    // 4. 🎯 Select provider (auto-select or user choice)
    const provider = options.provider || services[0];
    const providerAddress = Array.isArray(provider) ? provider[0] : provider;
    logger.debug(`Selected provider: ${providerAddress}`);

    // 5. 🤝 Connect to the AI provider
    await withRetry(async () => {
      logger.debug('Acknowledging provider...');
      await broker.inference.acknowledgeProviderSigner(providerAddress);
    }, retries);

    // 6. 📊 Get provider info (endpoint, model details)
    const { endpoint, model } = await withRetry(async () => {
      logger.debug('Getting service metadata...');
      return await broker.inference.getServiceMetadata(providerAddress);
    }, retries);

    // 7. 🔐 Get authentication headers
    const headers = await withRetry(async () => {
      logger.debug('Getting request headers...');
      return await broker.inference.getRequestHeaders(providerAddress, message);
    }, retries);

    // 8. 🚀 Make the AI request with timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.warn('Request timeout, aborting...', { requestId, timeout });
      controller.abort();
    }, timeout);

    try {
      logger.debug('Sending inference request...', { endpoint, model });
      
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          model: options.model || model,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }),
        signal: controller.signal  // For timeout cancellation
      });

      clearTimeout(timeoutId);

      // 9. ✅ Check if request succeeded
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`HTTP ${response.status}: ${errorText}`, undefined, { requestId });
        
        // Special handling for payment issues
        if (response.status === 402 || response.status === 403) {
          throw new InsufficientFundsError('Insufficient funds for AI inference request');
        }
        
        throw new NetworkError(`AI service error: HTTP ${response.status}`);
      }

      // 10. 📝 Parse the AI response
      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        logger.error('Invalid response format', undefined, { requestId, data });
        throw new NetworkError('Invalid response format from AI service');
      }

      // 11. 📊 Log success metrics
      const duration = Date.now() - startTime;
      logger.info('Chat request completed', { 
        requestId, 
        duration,
        responseLength: content.length,
        model: options.model || model,
        provider: providerAddress
      });

      return content;

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Chat request failed', error as Error, { requestId, duration });
    
    // Handle specific error types
    if ((error as any).name === 'AbortError') {
      throw new NetworkError(`Request timed out after ${timeout}ms`, error as Error);
    }
    
    // Re-throw our custom errors as-is
    if (error instanceof ConfigurationError || error instanceof NetworkError || error instanceof InsufficientFundsError) {
      throw error;
    }
    
    // Wrap unknown errors
    throw new NetworkError('Unexpected error during chat request', error as Error);
  }
}

// 💰 Simple wrapper functions (users call these)
export async function deposit(amount: number): Promise<void> {
  if (!globalClient) {
    throw new ConfigurationError('ZeroGKit not initialized. Call initZeroG() first.');
  }
  return await globalClient.deposit(amount);
}

export async function withdraw(amount: number): Promise<void> {
  if (!globalClient) {
    throw new ConfigurationError('ZeroGKit not initialized. Call initZeroG() first.');
  }
  return await globalClient.withdraw(amount);
}

export async function getBalance(): Promise<string> {
  if (!globalClient) {
    throw new ConfigurationError('ZeroGKit not initialized. Call initZeroG() first.');
  }
  return await globalClient.getBalance();
}

// 🔧 Advanced function for power users
export async function chatAdvanced(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
  const content = await chat(message, options);
  
  return {
    content,
    model: options.model || 'deepseek-chat',
    provider: options.provider || 'auto-selected',
    requestId: uuidv4(),
    timestamp: Date.now()
  };
}