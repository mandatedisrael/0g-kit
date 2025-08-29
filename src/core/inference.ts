import { v4 as uuidv4 } from 'uuid';
import { ZeroGKit } from './client.js';
import { ChatOptions, ZeroGConfig, ChatResponse } from '../types.js';
import { ConfigurationError, NetworkError, InsufficientFundsError } from '../utils/errors.js';
import { validateChatMessage } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import dotenv from 'dotenv';

dotenv.config();



let globalClient: ZeroGKit | null = null;

function loadEnvVars(): void {
  try {
    require('dotenv').config();
  } catch (error) {
    logger.debug('dotenv not available, using existing environment variables');
  }
}

function getDefaultConfig(): ZeroGConfig {
  loadEnvVars();
  
  const privateKey = process.env.PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new ConfigurationError(
      'Private key not found. Please set PRIVATE_KEY or ZEROG_PRIVATE_KEY in your .env file or environment variables.'
    );
  }

  const base: ZeroGConfig = {
    privateKey,
    rpcUrl: process.env.ZEROG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
    autoDeposit: process.env.ZEROG_AUTO_DEPOSIT !== 'false',
    defaultModel: process.env.ZEROG_DEFAULT_MODEL || 'deepseek-chat',
    logLevel: (process.env.ZEROG_LOG_LEVEL as any) || 'info'
  };

  if (process.env.ZEROG_TIMEOUT) {
    base.timeout = parseInt(process.env.ZEROG_TIMEOUT);
  }
  if (process.env.ZEROG_RETRIES) {
    base.retries = parseInt(process.env.ZEROG_RETRIES);
  }

  return base;
}
 
export async function initZeroG(config?: Partial<ZeroGConfig>): Promise<void> {
  const finalConfig = { ...getDefaultConfig(), ...config };
  

  globalClient = await ZeroGKit.getInstance(finalConfig);
  logger.info('ZeroGKit configured successfully');
}

async function ensureInitialized(): Promise<void> {
  if (!globalClient) {
    logger.info('Auto-initializing ZeroGKit with default configuration...');
    await initZeroG();
  }
}

export async function chat(message: string, options: ChatOptions = {}): Promise<string> {
  const startTime = Date.now();
  const requestId = uuidv4();

  const sdkTimeout = (globalClient?.getConfig().timeout) ?? 30000;
  const sdkRetries = (globalClient?.getConfig().retries) ?? 3;
  const timeout = options.timeout ?? sdkTimeout;
  const retries = options.retries ?? sdkRetries;
  
  try {
    validateChatMessage(message);
    await ensureInitialized();

    logger.info('Chat request started', { 
      requestId, 
      messageLength: message.length,
      model: options.model 
    });

    const broker = await globalClient!.getBroker();

    const services = await withRetry(async () => {
      logger.debug('Fetching available services...');
      const serviceList = await broker.inference.listService();
      
      if (!serviceList || serviceList.length === 0) {
        throw new NetworkError('No AI inference services available');
      }
      
      logger.debug(`Found ${serviceList.length} available services`);
      return serviceList;
    }, retries);

    const provider = options.provider || services[0];
    const providerAddress = Array.isArray(provider) ? provider[0] : provider;
    logger.debug(`Selected provider: ${providerAddress}`);

    await withRetry(async () => {
      logger.debug('Acknowledging provider...');
      await broker.inference.acknowledgeProviderSigner(providerAddress);
    }, retries);

    const { endpoint, model } = await withRetry(async () => {
      logger.debug('Getting service metadata...');
      return await broker.inference.getServiceMetadata(providerAddress);
    }, retries);

    const headers = await withRetry(async () => {
      logger.debug('Getting request headers...');
      return await broker.inference.getRequestHeaders(providerAddress, message);
    }, retries);

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
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`HTTP ${response.status}: ${errorText}`, undefined, { requestId });
        
        if (response.status === 402 || response.status === 403) {
          throw new InsufficientFundsError('Insufficient funds for AI inference request');
        }
        
        throw new NetworkError(`AI service error: HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        logger.error('Invalid response format', undefined, { requestId, data });
        throw new NetworkError('Invalid response format from AI service');
      }

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
    
    if ((error as any).name === 'AbortError') {
      throw new NetworkError(`Request timed out after ${timeout}ms`, error as Error);
    }
    
    if (error instanceof ConfigurationError || error instanceof NetworkError || error instanceof InsufficientFundsError) {
      throw error;
    }
    
    throw new NetworkError('Unexpected error during chat request', error as Error);
  }
}

async function findModelProvider(modelName: string): Promise<string> {
  await ensureInitialized();
  const broker = await globalClient!.getBroker();
  
  const services = await withRetry(async () => {
    logger.debug('Fetching available services...');
    const serviceList = await broker.inference.listService();
    
    if (!serviceList || serviceList.length === 0) {
      throw new NetworkError('No AI inference services available');
    }
    
    logger.debug(`Found ${serviceList.length} available services`);
    return serviceList;
  }, (globalClient?.getConfig().retries) ?? 3);

  for (const service of services) {
    const providerAddress = Array.isArray(service) ? service[0] : service;
    try {
      const { model } = await broker.inference.getServiceMetadata(providerAddress);
      if (model.toLowerCase().includes(modelName.toLowerCase())) {
        logger.debug(`Found ${modelName} provider: ${providerAddress}`);
        return providerAddress;
      }
    } catch (error) {
      logger.debug(`Failed to get metadata for provider ${providerAddress}:`, error as Error);
      continue;
    }
  }
  
  throw new NetworkError(`No provider found for model: ${modelName}`);
}

export async function useDeepseek(message: string, options: Omit<ChatOptions, 'model' | 'provider'> = {}): Promise<string> {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  try {
    validateChatMessage(message);
    await ensureInitialized();
    
    logger.info('DeepSeek request started', { 
      requestId, 
      messageLength: message.length
    });

    const providerAddress = await findModelProvider('deepseek');
    
    const broker = await globalClient!.getBroker();
    
    await withRetry(async () => {
      logger.debug('Acknowledging DeepSeek provider...');
      await broker.inference.acknowledgeProviderSigner(providerAddress);
    }, options.retries || 3);

    const { endpoint, model } = await withRetry(async () => {
      logger.debug('Getting DeepSeek service metadata...');
      return await broker.inference.getServiceMetadata(providerAddress);
    }, options.retries || 3);

    const headers = await withRetry(async () => {
      logger.debug('Getting DeepSeek request headers...');
      return await broker.inference.getRequestHeaders(providerAddress, message);
    }, options.retries || 3);

    const sdkTimeout = (globalClient?.getConfig().timeout) ?? 30000;
    const timeout = options.timeout ?? sdkTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.warn('DeepSeek request timeout, aborting...', { requestId, timeout });
      controller.abort();
    }, timeout);

    try {
      logger.debug('Sending DeepSeek inference request...', { endpoint, model });
      
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          model: model, 
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`DeepSeek HTTP ${response.status}: ${errorText}`, undefined, { requestId });
        
        if (response.status === 402 || response.status === 403) {
          throw new InsufficientFundsError('Insufficient funds for DeepSeek inference request');
        }
        
        throw new NetworkError(`DeepSeek service error: HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      
      if (!content || content.trim() === '') {
        logger.warn('DeepSeek returned empty content, checking for alternative response formats', { requestId, data });
        
        const toolCalls = data.choices?.[0]?.message?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          logger.info('DeepSeek response contains tool calls', { requestId, toolCalls });
          return `[Tool calls available: ${toolCalls.length} tools]`;
        }
        
        const reasoningContent = data.choices?.[0]?.message?.reasoning_content;
        if (reasoningContent) {
          logger.info('DeepSeek response contains reasoning content', { requestId });
          return reasoningContent;
        }
        
        logger.warn('DeepSeek returned no usable content, returning default message', { requestId, data });
        return 'I received your message but was unable to generate a response at this time.';
      }

      const duration = Date.now() - startTime;
      logger.info('DeepSeek request completed', { 
        requestId, 
        duration,
        responseLength: content.length,
        provider: providerAddress
      });

      return content;

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('DeepSeek request failed', error as Error, { requestId, duration });
    
    if ((error as any).name === 'AbortError') {
      throw new NetworkError(`DeepSeek request timed out after ${options.timeout || 30000}ms`, error as Error);
    }
    
    if (error instanceof ConfigurationError || error instanceof NetworkError || error instanceof InsufficientFundsError) {
      throw error;
    }
    
    throw new NetworkError('Unexpected error during DeepSeek request', error as Error);
  }
}

export async function useLlama(message: string, options: Omit<ChatOptions, 'model' | 'provider'> = {}): Promise<string> {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  try {
    validateChatMessage(message);
    await ensureInitialized();
    
    logger.info('Llama request started', { 
      requestId, 
      messageLength: message.length
    });

    const providerAddress = await findModelProvider('llama');
    
    const broker = await globalClient!.getBroker();
    
    await withRetry(async () => {
      logger.debug('Acknowledging Llama provider...');
      await broker.inference.acknowledgeProviderSigner(providerAddress);
    }, options.retries || 3);


    const { endpoint, model } = await withRetry(async () => {
      logger.debug('Getting Llama service metadata...');
      return await broker.inference.getServiceMetadata(providerAddress);
    }, options.retries || 3);


    const headers = await withRetry(async () => {
      logger.debug('Getting Llama request headers...');
      return await broker.inference.getRequestHeaders(providerAddress, message);
    }, options.retries || 3);

    const sdkTimeout = (globalClient?.getConfig().timeout) ?? 30000;
    const timeout = options.timeout ?? sdkTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.warn('Llama request timeout, aborting...', { requestId, timeout });
      controller.abort();
    }, timeout);

    try {
      logger.debug('Sending Llama inference request...', { endpoint, model });
      
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          model: model, 
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Llama HTTP ${response.status}: ${errorText}`, undefined, { requestId });
        
        if (response.status === 402 || response.status === 403) {
          throw new InsufficientFundsError('Insufficient funds for Llama inference request');
        }
        
        throw new NetworkError(`Llama service error: HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      
      if (!content || content.trim() === '') {
        logger.warn('Llama returned empty content, checking for alternative response formats', { requestId, data });
        
        const toolCalls = data.choices?.[0]?.message?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          logger.info('Llama response contains tool calls', { requestId, toolCalls });
          return `[Tool calls available: ${toolCalls.length} tools]`;
        }
        
        const reasoningContent = data.choices?.[0]?.message?.reasoning_content;
        if (reasoningContent) {
          logger.info('Llama response contains reasoning content', { requestId });
          return reasoningContent;
        }
        

        logger.warn('Llama returned no usable content, returning default message', { requestId, data });
        return 'I received your message but was unable to generate a response at this time.';
      }

      const duration = Date.now() - startTime;
      logger.info('Llama request completed', { 
        requestId, 
        duration,
        responseLength: content.length,
        provider: providerAddress
      });

      return content;

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Llama request failed', error as Error, { requestId, duration });
    
    if ((error as any).name === 'AbortError') {
      throw new NetworkError(`Llama request timed out after ${options.timeout || 30000}ms`, error as Error);
    }
    
    if (error instanceof ConfigurationError || error instanceof NetworkError || error instanceof InsufficientFundsError) {
      throw error;
    }
    
    throw new NetworkError('Unexpected error during Llama request', error as Error);
  }
}

export async function deposit(amount: number): Promise<void> {
  await ensureInitialized();
  return await globalClient!.deposit(amount);
}

export async function withdraw(amount: number): Promise<void> {
  await ensureInitialized();
  return await globalClient!.withdraw(amount);
}

export async function getBalance(): Promise<string> {
  await ensureInitialized();
  return await globalClient!.getBalance();
}

export async function getAvailableModels(): Promise<Array<{model: string, provider: string}>> {
  await ensureInitialized();
  const broker = await globalClient!.getBroker();
  
  const services = await withRetry(async () => {
    logger.debug('Fetching available services...');
    const serviceList = await broker.inference.listService();
    
    if (!serviceList || serviceList.length === 0) {
      throw new NetworkError('No AI inference services available');
    }
    
    logger.debug(`Found ${serviceList.length} available services`);
    return serviceList;
  }, 3);

  const models: Array<{model: string, provider: string}> = [];
  
  for (const service of services) {
    const providerAddress = Array.isArray(service) ? service[0] : service;
    try {
      const { model } = await broker.inference.getServiceMetadata(providerAddress);
      models.push({
        model: model,
        provider: providerAddress
      });
    } catch (error) {
      logger.debug(`Failed to get metadata for provider ${providerAddress}:`, error as Error);
      continue;
    }
  }
  
  return models;
}

export async function listServices(): Promise<Array<{
  provider: string;
  serviceType: string;
  url: string;
  inputPrice: bigint;
  outputPrice: bigint;
  updatedAt: bigint;
  model: string;
  verifiability: string;
}>> {
  await ensureInitialized();
  const broker = await globalClient!.getBroker();
  
  const services = await withRetry(async () => {
    logger.debug('Fetching available services...');
    const serviceList = await broker.inference.listService();
    
    if (!serviceList || serviceList.length === 0) {
      throw new NetworkError('No AI inference services available');
    }
    
    logger.debug(`Found ${serviceList.length} available services`);
    return serviceList;
  }, 3);

  const fullServices: Array<{
    provider: string;
    serviceType: string;
    url: string;
    inputPrice: bigint;
    outputPrice: bigint;
    updatedAt: bigint;
    model: string;
    verifiability: string;
  }> = [];
  
  for (const service of services) {
    try {
      fullServices.push({
        provider: service.provider,
        serviceType: service.serviceType,
        url: service.url,
        inputPrice: service.inputPrice,
        outputPrice: service.outputPrice,
        updatedAt: service.updatedAt,
        model: service.model,
        verifiability: service.verifiability
      });
    } catch (error) {
      logger.debug(`Failed to get metadata for provider :`, error as Error);
      continue;
    }
  }
  
  return fullServices;
}

