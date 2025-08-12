// what users can customize
export interface ZeroGConfig {
    privateKey: string;                   
    rpcUrl?: string;                      
    autoDeposit?: boolean;                
    defaultModel?: string;               
    timeout?: number;                    
    retries?: number;                    
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  }
  
  // customize ai calls by users 
  export interface ChatOptions {
    model?: string;          
    provider?: string;       
    temperature?: number;    
    maxTokens?: number;      
    timeout?: number;        
    retries?: number;        
  }
  
  // ai response
  export interface ChatResponse {
    content: string;         
    model: string;          
    provider: string;       
    tokensUsed?: number;    
    requestId: string;      
    timestamp: number;      
  }