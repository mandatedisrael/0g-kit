export interface ZeroGConfig {
    privateKey: string;                   
    rpcUrl?: string;                      
    autoDeposit?: boolean;                
    defaultModel?: string;               
    timeout?: number;                    
    retries?: number;                    
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
    indexerRpcUrl?: string;
  }
  
export interface ChatOptions {
    model?: string;          
    provider?: string;       
    temperature?: number;    
    maxTokens?: number;      
    timeout?: number;        
    retries?: number;        
  }
  
export interface ChatResponse {
    content: string;         
    model: string;          
    provider: string;       
    tokensUsed?: number;    
    requestId: string;      
    timestamp: number;      
  }

export interface StorageOptions {
    timeout?: number;
    retries?: number;
    gasPrice?: string; // Custom gas price for upload transactions (in wei as string)
  }

export interface UploadResponse {
    rootHash: string;
    txHash: string;
    fileSize: number;
    timestamp: number;
  }

export interface DownloadOptions {
    timeout?: number;
    retries?: number;
  }

export interface FileInfo {
    rootHash: string;
    fileSize: number;
    uploadTime: number;
    txHash: string;
  }

export interface KeyValueOptions {
    timeout?: number;
    retries?: number;
    gasPrice?: string; // Custom gas price for KV operations (in wei as string)
  }

export interface KeyValueResponse {
    streamId: string;
    key: string;
    txHash: string;
    timestamp: number;
  }

export interface KeyValueData {
    streamId: string;
    key: string;
    value: string;
  }

export interface StreamOptions {
    timeout?: number;
    retries?: number;
    gasPrice?: string; // Custom gas price for stream operations (in wei as string)
    filename?: string; // Optional filename for stream uploads
  }

export interface StreamResponse {
    rootHash: string;
    txHash: string;
    fileSize: number;
    timestamp: number;
    filename?: string;
  }