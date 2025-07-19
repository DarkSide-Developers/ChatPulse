# ChatPulse 2.0 - Advanced WhatsApp Web API

[![npm version](https://badge.fury.io/js/chatpulse.svg)](https://badge.fury.io/js/chatpulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

**ChatPulse** is a powerful, lightweight WhatsApp Web API library built for Node.js. It provides advanced authentication methods, real-time messaging, and professional-grade features for building WhatsApp bots and automation tools.

## 🚀 Features

- **Multiple Authentication Methods**: QR Code, Phone Number, Email, Pairing Code
- **Real-time Messaging**: Send/receive text, media, buttons, lists, polls
- **Advanced Connection**: WebSocket-based, no browser automation
- **Session Management**: Persistent sessions with automatic restoration
- **Rate Limiting**: Built-in protection against spam
- **Error Recovery**: Automatic reconnection and error handling
- **TypeScript Support**: Full type definitions included

## 📦 Installation

```bash
npm install chatpulse
```

## 🔧 Quick Start

### Basic Usage

```javascript
const { ChatPulse } = require('chatpulse');

const client = new ChatPulse({
    sessionName: 'my-bot',
    authStrategy: 'qr'
});

client.on('ready', () => {
    console.log('✅ ChatPulse is ready!');
});

client.on('qr_generated', () => {
    console.log('📱 Scan QR code with WhatsApp');
});

client.on('message', async (message) => {
    if (message.body === '!ping') {
        await client.sendMessage(message.from, 'Pong! 🏓');
    }
});

await client.initialize();
```

### Advanced Authentication

```javascript
// Phone Number Authentication
const client = new ChatPulse({
    sessionName: 'phone-bot',
    authStrategy: 'phone_number'
});

const result = await client.authenticateWithPhoneNumber('+1234567890');
console.log('Verification sent:', result);

// Email Authentication
const emailClient = new ChatPulse({
    sessionName: 'email-bot',
    authStrategy: 'email'
});

const emailResult = await emailClient.authenticateWithEmail('user@example.com');
console.log('Magic link sent:', emailResult);
```

## 📚 API Reference

### ChatPulse Class

#### Constructor Options

```javascript
const client = new ChatPulse({
    sessionName: 'default',        // Session identifier
    authStrategy: 'qr',           // 'qr', 'pairing', 'phone_number', 'email'
    autoReconnect: true,          // Auto-reconnect on disconnect
    maxReconnectAttempts: 10,     // Max reconnection attempts
    logLevel: 'info',             // 'debug', 'info', 'warn', 'error'
    rateLimitPerMinute: 60,       // Rate limit per minute
    qrCodeOptions: {
        terminal: true,           // Display QR in terminal
        save: true,              // Save QR as image
        format: 'png',           // QR image format
        size: 'medium'           // QR size: 'small', 'medium', 'large'
    }
});
```

#### Methods

```javascript
// Initialize client
await client.initialize();

// Send text message
await client.sendMessage(chatId, 'Hello World!');

// Send button message
await client.sendButtonMessage(chatId, 'Choose option:', [
    { id: 'btn1', text: 'Option 1' },
    { id: 'btn2', text: 'Option 2' }
]);

// Send list message
await client.sendListMessage(chatId, 'Select item:', 'Menu', [
    {
        title: 'Section 1',
        rows: [
            { id: 'item1', title: 'Item 1', description: 'Description 1' }
        ]
    }
]);

// Authentication methods
await client.authenticateWithPhoneNumber('+1234567890');
await client.authenticateWithEmail('user@example.com');

// Get QR code
const qrCode = await client.getQRCode('terminal');

// Connection status
const status = client.getConnectionStatus();

// Disconnect
await client.disconnect();
```

### Events

```javascript
// Connection events
client.on('connected', () => console.log('Connected'));
client.on('disconnected', () => console.log('Disconnected'));
client.on('ready', () => console.log('Ready to use'));

// Authentication events
client.on('qr_generated', (qrInfo) => console.log('QR generated'));
client.on('authenticated', () => console.log('Authenticated'));
client.on('pairing_code', (code) => console.log('Pairing code:', code));

// Message events
client.on('message', (message) => console.log('New message:', message));
client.on('button_response', (response) => console.log('Button pressed:', response));
client.on('list_response', (response) => console.log('List item selected:', response));

// Error events
client.on('error', (error) => console.error('Error:', error));
```

## 🔐 Authentication Methods

### 1. QR Code Authentication (Default)
```javascript
const client = new ChatPulse({ authStrategy: 'qr' });
await client.initialize();
// Scan QR code with WhatsApp mobile app
```

### 2. Phone Number Authentication
```javascript
const client = new ChatPulse({ authStrategy: 'phone_number' });
const result = await client.authenticateWithPhoneNumber('+1234567890');
// Enter verification code received via SMS
```

### 3. Email Authentication
```javascript
const client = new ChatPulse({ authStrategy: 'email' });
const result = await client.authenticateWithEmail('user@example.com');
// Click magic link sent to email
```

### 4. Pairing Code Authentication
```javascript
const client = new ChatPulse({ 
    authStrategy: 'pairing',
    pairingNumber: '+1234567890'
});
await client.initialize();
// Enter pairing code in WhatsApp mobile app
```

## 📱 Message Types

### Text Messages
```javascript
await client.sendMessage(chatId, 'Hello World!');
```

### Button Messages
```javascript
await client.sendButtonMessage(chatId, 'Choose an option:', [
    { id: 'yes', text: 'Yes' },
    { id: 'no', text: 'No' }
]);
```

### List Messages
```javascript
await client.sendListMessage(chatId, 'Select item:', 'Menu', [
    {
        title: 'Food',
        rows: [
            { id: 'pizza', title: 'Pizza', description: 'Delicious pizza' },
            { id: 'burger', title: 'Burger', description: 'Tasty burger' }
        ]
    }
]);
```

## 🛠️ Configuration

### Environment Variables
```bash
CHATPULSE_LOG_LEVEL=debug
CHATPULSE_SESSION_DIR=./sessions
CHATPULSE_RATE_LIMIT=100
```

### Advanced Configuration
```javascript
const client = new ChatPulse({
    sessionName: 'production-bot',
    authStrategy: 'qr',
    autoReconnect: true,
    maxReconnectAttempts: 20,
    reconnectInterval: 5000,
    connectionTimeout: 30000,
    rateLimitPerMinute: 100,
    rateLimitPerHour: 2000,
    enablePresenceUpdates: true,
    enableReadReceipts: true,
    enableTypingIndicator: true,
    qrCodeOptions: {
        terminal: true,
        save: true,
        format: 'png',
        size: 'large'
    }
});
```

## 🔧 Examples

Run the included examples:

```bash
# Basic example
npm run basic

# Advanced example with all features
npm run advanced

# Test connection
npm run test
```

## 📋 Requirements

- Node.js 16.0.0 or higher
- WhatsApp account
- Internet connection

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**DarkWinzo**
- GitHub: [@DarkWinzo](https://github.com/DarkWinzo)
- Email: isurulakshan9998@gmail.com

## 🏢 Organization

**DarkSide Developer Team**
- GitHub: [@DarkSide-Developers](https://github.com/DarkSide-Developers)
- Repository: [ChatPulse](https://github.com/DarkSide-Developers/ChatPulse)

## ⭐ Support

If you find this project helpful, please give it a star ⭐ on GitHub!

---

© 2025 DarkSide Developer Team. All rights reserved.