import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ZeroGConfig } from '../types.js';
import { ConfigurationError, NetworkError, InsufficientFundsError } from '../utils/errors.js';
import { validateConfig, validateAmount } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import * as fs from 'fs';
import * as path from 'path';

export class ZeroGKit {
  private static instances: Map<string, ZeroGKit> = new Map();
  private broker: any = null;
  private wallet!: ethers.Wallet;
  private config: Required<ZeroGConfig>;
  private initialized: boolean = false;
  private initializing: boolean = false;
  private initPromise: Promise<void> | null = null;
  private autoDepositCompleted: boolean = false;
  private walletAddress: string = ''; 
 

  static async getInstance(config: ZeroGConfig): Promise<ZeroGKit> {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    const walletAddress = wallet.address;
    
    if (!ZeroGKit.instances.has(walletAddress)) {
      const walletState = ZeroGKit.getWalletState(walletAddress);
      const instance = new ZeroGKit(config);
      instance.autoDepositCompleted = walletState.autoDepositCompleted;
      instance.walletAddress = walletAddress;
      ZeroGKit.setWalletState(walletAddress, {
        ...walletState,
        rpcUrl: config.rpcUrl,
        createdAt: walletState.createdAt || new Date().toISOString()
      });
      
      ZeroGKit.instances.set(walletAddress, instance);
    }
    
    return ZeroGKit.instances.get(walletAddress)!;
  }

  private static getStateFile(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const zerogDir = path.join(homeDir, '.zerog');

    // create dir if we in a writable environment
    if (homeDir !== '/tmp' && !fs.existsSync(zerogDir)) {
      try {
        fs.mkdirSync(zerogDir, { recursive: true });
      } catch (error) {
        // Fallback to /tmp if we can't create the directory
        const tmpZerogDir = path.join('/tmp', '.zerog');
        if (!fs.existsSync(tmpZerogDir)) {
          fs.mkdirSync(tmpZerogDir, { recursive: true });
        }
        return path.join(tmpZerogDir, 'state.json');
      }
    }
    
    return path.join(zerogDir, 'state.json');
  }

  private static loadState(): Record<string, any> {
    try {
      const file = this.getStateFile();
      if (fs.existsSync(file)) {
        try {
          return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (error) {
          logger.warn('Failed to load state file, starting fresh', error as Error);
          return {};
        }
      }
    } catch (error) {
      logger.warn('Failed to access state file, using in-memory state', error as Error);
    }
    return {};
  }

  private static saveState(state: Record<string, any>): void {
    try {
      const file = this.getStateFile();
      fs.writeFileSync(file, JSON.stringify(state, null, 2));
    } catch (error) {
      logger.warn('Failed to save state file, continuing without persistence', error as Error);
    }
  }

  private static getWalletState(walletAddress: string): any {
    const state = this.loadState();
    return state[walletAddress] || {
      autoDepositCompleted: false,
      lastUsed: null,
      createdAt: null,
      rpcUrl: null,
      totalRequests: 0
    };
  }

  private static setWalletState(walletAddress: string, walletState: any): void {
    const state = this.loadState();
    state[walletAddress] = {
      ...walletState,
      lastUsed: new Date().toISOString()
    };
    this.saveState(state);
  }

  constructor(config: ZeroGConfig) {

    validateConfig(config);
    
    this.config = {
      rpcUrl: "https://evmrpc-testnet.0g.ai",
      autoDeposit: true,
      defaultModel: "llama-3.3-70b-instruct",
      timeout: 3000000,
      retries: 3,
      logLevel: 'info',
      ...config
    };
    
    logger.setLevel(this.config.logLevel);
    logger.info('ZeroGKit created', { 
      rpcUrl: this.config.rpcUrl,
      autoDeposit: this.config.autoDeposit 
    });
  }


  public getConfig(): Readonly<Required<ZeroGConfig>> {
    return this.config;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    if (this.initializing) {
      if (this.initPromise) return this.initPromise;
      throw new ConfigurationError('Initialization already in progress');
    }

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
      
      const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      
      await withRetry(async () => {
        const network = await provider.getNetwork();
        logger.debug('Connected to blockchain', { chainId: network.chainId.toString() });
      }, this.config.retries);

      this.wallet = new ethers.Wallet(this.config.privateKey, provider);
      logger.debug('Wallet created', { address: this.wallet.address });
      
      this.broker = await withRetry(async () => {
        return await createZGComputeNetworkBroker(this.wallet);
      }, this.config.retries);

      if (this.config.autoDeposit && !this.autoDepositCompleted) {
        try {
          logger.info('Depositing 0.05 OG to activate the account ( ~ 5,000 requests/0.05 OG)');
          await this.broker.ledger.addLedger(0.05);
          logger.info('Ledger activated successfully');
          this.autoDepositCompleted = true;
          
          const walletState = ZeroGKit.getWalletState(this.walletAddress);
          ZeroGKit.setWalletState(this.walletAddress, {
            ...walletState,
            autoDepositCompleted: true,
            totalRequests: walletState.totalRequests + 1
          });
        } catch (error) {
          logger.warn('Account activation failed!', error as Error);
        }
      }

    } catch (error) {
      throw new NetworkError('Failed to initialize 0G connection', error as Error);
    }
  }


  async getBroker(): Promise<any> {
    await this.init();
    
  
    if (this.walletAddress) {
      const walletState = ZeroGKit.getWalletState(this.walletAddress);
      ZeroGKit.setWalletState(this.walletAddress, {
        ...walletState,
        totalRequests: walletState.totalRequests + 1
      });
    }
    
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

  async getLockedBalance(): Promise<string> {
    
    try {
      const broker = await this.getBroker();
      const account = await broker.ledger.getLedger();
      const lockedBalance = ethers.formatEther(account.locked);
      logger.debug('Locked Balance: ', { lockedBalance });
      return lockedBalance;
    } catch (error) {
      logger.error('Failed to get the locked balance', error as Error);
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
      
      if ((error as any).message?.toLowerCase().includes('insufficient')) {
        throw new InsufficientFundsError(`Insufficient balance to withdraw ${amount} OG`);
      }
      
      throw new NetworkError(`Failed to withdraw ${amount} OG`, error as Error);
    }
  }
  
}