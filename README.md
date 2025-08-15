# 0G Kit - Simplified SDK for 0G Decentralized AI Network

A lightweight, developer-friendly SDK that makes it easy to interact with the 0G decentralized AI network. Go from + lines of complex setup to just 2 lines of code!


## 📦 What's Included
- ✅ **Simple 2-line setup** - instant and easy integration into any project!
- ✅ **Automatic retries** - Built-in resilience for network issues
- ✅ **Balance management** - Easy deposit/withdraw operations without worrying about the technicalities
- ✅ **Multiple AI models** - Support for All providers on 0G inference!
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Error handling** - Clear, actionable error messages
- ✅ **Logging** - Configurable logging for debugging
- ✅ **Timeout protection** - Prevents hanging requests

### Installation

```bash
npm install 0g-kit
```

### Basic Usage (2 lines!)

```javascript
import { chat } from '0g-kit';

await chat('Hello, how are you?').then(console.log);
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


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.