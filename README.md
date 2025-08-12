# 0G Kit - Simplified SDK for 0G Decentralized AI Network

A lightweight, developer-friendly SDK that makes it easy to interact with the 0G decentralized AI network. Go from 50+ lines of complex setup to just 2 lines of code!

## 🚀 Quick Start

### Installation

```bash
npm install 0g-kit
```

### Basic Usage (2 lines!)

```javascript
import { initZeroG, chat } from '0g-kit';

// 1. Initialize with your private key
initZeroG({ privateKey: '0x1234...' });

// 2. Start chatting with AI!
const response = await chat('Hello, how are you?');
console.log(response); // "Hello! I'm doing well, thank you for asking..."
```

## 📖 Full Documentation

### Initialization

```javascript
import { initZeroG } from '0g-kit';

// Basic setup
initZeroG({
  privateKey: '0x1234567890abcdef...' // Your Ethereum private key
});

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

### Chat with AI

```javascript
import { chat } from '0g-kit';

// Simple chat
const response = await chat('What is the capital of France?');

// Advanced chat with options
const response = await chat('Write a poem about coding', {
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 500,
  timeout: 60000,
  retries: 5
});
```

### Manage Your Balance

```javascript
import { getBalance, deposit, withdraw } from '0g-kit';

// Check your balance
const balance = await getBalance();
console.log(`Balance: ${balance} OG`);

// Deposit funds
await deposit(0.5); // Deposit 0.5 OG

// Withdraw funds
await withdraw(0.2); // Withdraw 0.2 OG
```

### Advanced Usage

```javascript
import { chatAdvanced } from '0g-kit';

// Get detailed response with metadata
const response = await chatAdvanced('Explain quantum computing', {
  model: 'deepseek-chat',
  temperature: 0.3
});

console.log(response);
// {
//   content: "Quantum computing is...",
//   model: "deepseek-chat",
//   provider: "auto-selected",
//   requestId: "uuid-here",
//   timestamp: 1703123456789
// }
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

## 🎯 Chat Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | string | `auto` | AI model to use |
| `provider` | string | `auto` | Specific AI provider address |
| `temperature` | number | `0.7` | Response creativity (0.0-1.0) |
| `maxTokens` | number | `1000` | Maximum response length |
| `timeout` | number | `30000` | Request timeout |
| `retries` | number | `3` | Retry attempts |

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

## 📦 What's Included

- ✅ **Simple 2-line setup** - Initialize and start chatting
- ✅ **Automatic retries** - Built-in resilience for network issues
- ✅ **Balance management** - Easy deposit/withdraw operations
- ✅ **Multiple AI models** - Support for various AI providers
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Error handling** - Clear, actionable error messages
- ✅ **Logging** - Configurable logging for debugging
- ✅ **Timeout protection** - Prevents hanging requests

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

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**From 50+ lines to 2 lines** - That's the power of 0G Kit! 🚀

# 0g-kit
