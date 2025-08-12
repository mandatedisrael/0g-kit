import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ZeroGConfig } from '../types';
import { ConfigurationError, NetworkError, InsufficientFundsError } from '../utils/errors';
import { validateConfig, validateAmount } from '../utils/validations';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

export class ZeroGKit {
  private broker: any = null;                    
  private wallet!: ethers.Wallet;                 
  private config: Required<ZeroGConfig>;         
  private initialized: boolean = false;         
  private initializing: boolean = false;        
  private initPromise: Promise<void> | null = null; 

  constructor(config: ZeroGConfig) {
    // ✅ Check if config is valid first
    validateConfig(config);
    
    // 🔧 Fill in default values
    this.config = {
      rpcUrl: "https://evmrpc-testnet.0g.ai",
      autoDeposit: true,
      defaultModel: "deepseek-chat", 
      timeout: 30000,        // 30 seconds
      retries: 3,
      logLevel: 'info',
      ...config  // User values override defaults
    };
    
    logger.setLevel(this.config.logLevel);
    logger.info('ZeroGKit created', { 
      rpcUrl: this.config.rpcUrl,
      autoDeposit: this.config.autoDeposit 
    });
  }

  async init(): Promise<void> {
    // Already ready? Do nothing
    if (this.initialized) return;
    
    // Already starting up? Wait for it
    if (this.initializing) {
      if (this.initPromise) return this.initPromise;
      throw new ConfigurationError('Initialization already in progress');
    }

    // Start initialization
    this.initializing = true;
    this.initPromise = this._doInit();
    
    try {
      await this.initPromise;
      this.initialized = true;
      logger.info('ZeroGKit ready for use');
    } catch (error) {
      logger.error('ZeroGKit initialization failed', error as Error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }


  private async _doInit(): Promise<void> {
    try {
      logger.info('Connecting to 0G network...');
      
      // 1. Create blockchain connection
      const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      
      // 2. Test the connection
      await withRetry(async () => {
        const network = await provider.getNetwork();
        logger.debug('Connected to blockchain', { chainId: network.chainId });
      }, this.config.retries);

      // 3. Create wallet
      this.wallet = new ethers.Wallet(this.config.privateKey, provider);
      logger.debug('Wallet created', { address: this.wallet.address });
      
      // 4. Create 0G broker (the main connection)
      // this.broker = await withRetry(async () => {
      //   return await createZGComputeNetworkBroker(this.wallet);
      // }, this.config.retries);
      
      // Temporary mock broker for testing
      this.broker = {
        inference: {
          listService: async () => ['mock-provider'],
          acknowledgeProviderSigner: async () => {},
          getServiceMetadata: async () => ({ endpoint: 'https://mock.com', model: 'deepseek-chat' }),
          getRequestHeaders: async () => ({ 'Authorization': 'Bearer mock' })
        },
        ledger: {
          getLedger: async () => ({ totalBalance: '1000000000000000000' }),
          depositFund: async () => {},
          refund: async () => {}
        }
      };

      // 5. Auto-deposit if requested
      if (this.config.autoDeposit) {
        try {
          logger.info('Auto-depositing 0.1 OG...');
          await this.broker.ledger.depositFund(0.1);
          logger.info('Auto-deposit successful');
        } catch (error) {
          logger.warn('Auto-deposit failed, continuing...', error);
          // Don't fail initialization if deposit fails
        }
      }

    } catch (error) {
      throw new NetworkError('Failed to initialize 0G connection', error as Error);
    }
  }


  async getBroker(): Promise<any> {
    await this.init();  // Make sure we're initialized
    return this.broker;
  }


  async getBalance(): Promise<string> {
    try {
      const broker = await this.getBroker();
      const account = await broker.ledger.getLedger();
      const balance = ethers.formatEther(account.totalBalance);
      logger.debug('Balance retrieved', { balance });
      return balance;
    } catch (error) {
      logger.error('Failed to get balance', error as Error);
      throw new NetworkError('Failed to retrieve balance', error as Error);
    }
  }

  async deposit(amount: number): Promise<void> {
    validateAmount(amount, 'deposit');

    try {
      logger.info(`Depositing ${amount} OG...`);
      const broker = await this.getBroker();
      
      await withRetry(async () => {
        await broker.ledger.depositFund(amount);
      }, this.config.retries);
      
      logger.info(`Deposit successful: ${amount} OG`);
    } catch (error) {
      logger.error(`Deposit failed: ${amount} OG`, error as Error);
      throw new NetworkError(`Failed to deposit ${amount} OG`, error as Error);
    }
  }

  async withdraw(amount: number): Promise<void> {
    validateAmount(amount, 'withdraw');

    try {
      logger.info(`Withdrawing ${amount} OG...`);
      const broker = await this.getBroker();
      
      await withRetry(async () => {
        await broker.ledger.refund(amount);
      }, this.config.retries);
      
      logger.info(`Withdrawal successful: ${amount} OG`);
    } catch (error) {
      logger.error(`Withdrawal failed: ${amount} OG`, error as Error);
      
      // Special handling for insufficient funds
      if ((error as any).message?.toLowerCase().includes('insufficient')) {
        throw new InsufficientFundsError(`Insufficient balance to withdraw ${amount} OG`);
      }
      
      throw new NetworkError(`Failed to withdraw ${amount} OG`, error as Error);
    }
  }
}