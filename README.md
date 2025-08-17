# 0G Kit - Simplified SDK for easy integration!

A developer-friendly SDK that makes it easy to interact with the 0G decentralized AI network. Go from multiple lines of complex setup to just 2 lines of code and get any 0G infrastructure integrated into your app!

## What Complexity Does 0G Kit Handle For You? 

The 0G Kit abstracts away the following complex technical details:

• **Broker Initialization** - No need to manually create and configure the 0G Compute Network broker with ethers.js providers, wallets etc

• **Provider Discovery** - Automatic service discovery and provider selection instead of manually calling `broker.inference.listService()`

• **Provider Acknowledgment** - Automatic on-chain provider acknowledgment via `broker.inference.acknowledgeProviderSigner()`

• **Service Metadata Retrieval** - No need to manually fetch endpoint and model information with `broker.inference.getServiceMetadata()`

• **Request Header Generation** - Automatic generation of single-use authenticated headers via `broker.inference.getRequestHeaders()`

• **HTTP Request Management** - Handles all the fetch API calls, error handling, and response parsing

• **Response Verification** - Automatic response processing and verification for TEE-enabled services

• **Fee Settlement** - Automatic micropayment handling and fee settlement

• **Account Management** - Simplified balance checking, deposits, and withdrawals without direct ledger interactions

• **Error Handling** - Comprehensive error handling for network issues, insufficient funds, and provider failures

• **Retry Logic** - Built-in retry mechanisms for failed requests

• **Timeout Management** - Automatic request timeout handling and cleanup

-------

## What You Get With 0G Kit
**TLDR;**
- ✅ **Simple 2-line setup** - instant and easy integration into any project!
- ✅ **Automatic retries** - Built-in resilience for network issues
- ✅ **Balance management** - Easy deposit/withdraw operations without worrying about the technicalities
- ✅ **Multiple AI models** - Support for All providers on 0G inference!
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Error handling** - Clear, actionable error messages
- ✅ **Logging** - Configurable logging for debugging
- ✅ **Timeout protection** - Prevents hanging requests


## Installation

- Install 0G kit `npm install 0g-kit`

- Get some 0G faucet from [Link](https://faucet.0g.ai/)

- Add your EVM private key to .env 


> ⚠️ **Important**: For first time usage, it automatically deposits 0.05 OG to activate your broker account. Subsequent calls won't auto-deposit unless you explicitly call the deposit function!


...and voila that's all, start building on 0G!




### Basic Usage (2 lines!)

```javascript
import { chat } from '0g-kit';
const response = await chat('Hello, how are you?');
```

### Model-Specific Functions

```javascript
// Use DeepSeek model specifically
import { useDeepseek } from '0g-kit';
const response = await useDeepseek('Hello, how are you?')
```

```javascript
// Use Llama model specifically
import { useLlama } from '0g-kit';
const response = await useLlama('Hello, how are you?')
```

### Service Discovery

```javascript
// Get list of available models and providers
import { getAvailableModels } from '0g-kit';
const models = await getAvailableModels();
```

```javascript
// Get detailed service information
import { listServices } from '0g-kit';
const services = await listServices();
console.log('Service details:', services);
```

### Manage Your Balance

```javascript
// check balance
import { getBalance } from '0g-kit';
await getBalance().then(console.log(`Balance: ${balance} OG`));
```

```javascript
// Deposit 0.5 0G 4rm wallet to broker account
import { deposit } from '0g-kit';
await deposit(0.5); 
```

```javascript
// Withdraw 0.2 0G from your broker account to wallet
import { withdraw } from '0g-kit';
await withdraw(0.2); 
```

### Advance User customization
```javascript
import { initZeroG, chat  } from '0g-kit';

// Advanced setup with custom options
initZeroG({
  privateKey: '0x1234567890abcdef...',
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  autoDeposit: true,
  defaultModel: 'deepseek-chat', 
  timeout: 30000,
  retries: 3,
  logLevel: 'info' 
});

```


## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `privateKey` | string | **required** | Your Ethereum private key (0x-prefixed) |
| `rpcUrl` | string | `https://evmrpc-testnet.0g.ai` | 0G network RPC endpoint |
| `autoDeposit` | boolean | `true` | Automatically deposit 0.1 OG on initialization |
| `defaultModel` | string | `deepseek-chat` | Default AI model to use |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `retries` | number | `3` | Number of retry attempts |
| `logLevel` | string | `info` | Logging level (`debug`, `info`, `warn`, `error`, `silent`) |


## 🔧 Error Handling

The SDK provides clear error types:

```javascript
import { ConfigurationError, NetworkError, InsufficientFundsError } from '0g-kit';

try {
  const response = await chat('Hello');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.log('Configuration issue:', error.message);
  } else if (error instanceof InsufficientFundsError) {
    console.log('Need more funds:', error.message);
  } else if (error instanceof NetworkError) {
    console.log('Network issue:', error.message);
  }
}
```

## 🎯 Chat Options 

### will be implemented once 0G activates the feature on each models ⚠️

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | string | `auto` | AI model to use |
| `provider` | string | `auto` | Specific AI provider address |
| `temperature` | number | `0.7` | Response creativity (0.0-1.0) |
| `maxTokens` | number | `1000` | Maximum response length |
| `timeout` | number | `30000` | Request timeout |
| `retries` | number | `3` | Retry attempts |


## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

## 🚀 Future Releases

- 🔄 **0G Storage Support** - Decentralized storage integration coming soon
- 🔄 **0G Data Availability** - Data availability layer support in development

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.