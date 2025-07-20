# ChatPulse 2.0 - Advanced WhatsApp Web API

[![npm version](https://badge.fury.io/js/chatpulse.svg)](https://badge.fury.io/js/chatpulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

**ChatPulse** is a powerful, lightweight WhatsApp Web API library for Node.js. Build WhatsApp bots and automation tools with ease using our simple yet powerful API.

## 🚀 Features

- **Easy Setup**: Get started in minutes with simple API
- **QR Code Authentication**: Secure WhatsApp Web connection
- **Rich Messages**: Text, buttons, lists, media, polls, contacts, locations
- **Auto Reconnection**: Reliable connection with automatic recovery
- **Session Management**: Persistent sessions across restarts
- **TypeScript Support**: Full type definitions included
- **Event-Driven**: React to messages, button clicks, and more

## 📦 Installation

```bash
npm install chatpulse
```

## 🚀 Quick Start

### Basic Bot Example

```javascript
const { ChatPulse } = require('chatpulse');

const client = new ChatPulse({
    sessionName: 'my-bot'
});

client.on('ready', () => {
    console.log('✅ ChatPulse is ready!');
});

client.on('qr_generated', (qrInfo) => {
    console.log('📱 Scan QR code with WhatsApp');
});

client.on('message', async (message) => {
    // Ignore own messages
    if (message.isFromMe) return;
    
    if (message.body === '!ping') {
        await client.sendMessage(message.from, 'Pong! 🏓');
    }
});

const { ChatPulse } = require('chatpulse');

const client = new ChatPulse({
    sessionName: 'my-bot',
    authStrategy: 'pairing'
});

// Method 1: Auto-pairing (set phone number in options)
const client = new ChatPulse({
    sessionName: 'my-bot',
    authStrategy: 'pairing',
    pairingNumber: '1234567890'
});

// Method 2: Manual pairing
client.on('ready', async () => {
    const pairingCode = await client.requestPairingCode('1234567890');
    console.log('Pairing Code:', pairingCode);
});

client.on('pairing_code', (pairingInfo) => {
    console.log('Enter this code in WhatsApp:', pairingInfo.pairingCode);
});

await client.initialize();
```

### Button Messages

```javascript
const buttons = [
    { id: 'btn1', text: 'Option 1' },
    { id: 'btn2', text: 'Option 2' },
    { id: 'btn3', text: 'Option 3' }
];

await client.sendButtonMessage(
    chatId, 
    'Choose an option:', 
    buttons
);

// Handle button responses
client.on('button_response', async (response) => {
    console.log('Button pressed:', response.selectedButtonId);
    await client.sendMessage(response.from, `You selected: ${response.selectedButtonId}`);
});
```

### List Messages

```javascript
const sections = [
    {
        title: 'Main Menu',
        rows: [
            { id: 'help', title: 'Help', description: 'Get help' },
            { id: 'about', title: 'About', description: 'About us' }
        ]
    }
];

await client.sendListMessage(
    chatId,
    'Select an option:',
    'Menu',
    sections
);
```

## 📚 API Reference

### Constructor Options
```javascript
const client = new ChatPulse({
    sessionName: 'my-session',     // Session name for persistence
    logLevel: 'info',              // 'debug', 'info', 'warn', 'error'
    autoReconnect: true,           // Auto-reconnect on disconnect
    maxReconnectAttempts: 10,      // Max reconnection attempts
    qrCodeOptions: {
        terminal: true,            // Display QR in terminal
        save: true,                // Save QR as image
        format: 'png',             // QR image format
        size: 'medium'             // QR size
    }
});
```

### Core Methods

```javascript
// Initialize client
await client.initialize();

// Send text message
await client.sendMessage(chatId, 'Hello World!');

// Send button message
await client.sendButtonMessage(chatId, 'Choose:', buttons);

// Send list message
await client.sendListMessage(chatId, 'Select:', 'Menu', sections);

// Send contact
await client.sendContact(chatId, { name: 'John', number: '+1234567890' });

// Send location
await client.sendLocation(chatId, latitude, longitude, 'My Location');

// Send poll
await client.sendPoll(chatId, 'Favorite color?', ['Red', 'Blue', 'Green']);
```

### Events

```javascript
// Connection events
client.on('connected', () => console.log('Connected'));
client.on('disconnected', () => console.log('Disconnected'));
client.on('ready', () => console.log('Ready to use'));

// Authentication events  
client.on('qr_generated', (qrInfo) => console.log('Scan QR code'));
client.on('authenticated', () => console.log('Authenticated'));

// Message events
client.on('message', (message) => console.log('New message:', message));
client.on('button_response', (response) => console.log('Button pressed:', response));
client.on('list_response', (response) => console.log('List item selected:', response));

// Error events
client.on('error', (error) => console.error('Error:', error));
```

## 🔧 Examples

### Run Examples

```bash
# Basic bot example
npm run example:basic

# Advanced bot with buttons/lists
npm run example:advanced

# Smart bot with multiple features
npm run example:bot

# Pairing authentication example
npm run example:pairing

# Test functionality
npm test
```

### Example Files

- `examples/basic.js` - Simple bot with basic commands
- `examples/advanced.js` - Advanced bot with buttons and lists  
- `examples/bot.js` - Smart bot with multiple features
- `examples/pairing.js` - Phone number pairing authentication
- `examples/test.js` - Test ChatPulse functionality

## 📋 Requirements

- Node.js 16.0.0 or higher
- WhatsApp account
- Internet connection

## 🔧 Common Use Cases

- **Customer Support Bots**: Automated customer service
- **Notification Systems**: Send alerts and updates
- **Interactive Menus**: Button and list-based interfaces
- **Content Distribution**: Share media and documents
- **Polling Systems**: Create interactive polls
- **Reminder Services**: Time-based notifications

## 🐛 Troubleshooting

### Common Issues

1. **QR Code not appearing**: Check terminal supports images or check saved QR file
2. **Connection issues**: Ensure stable internet and try restarting
3. **Session problems**: Delete session folder and re-authenticate
4. **Message not sending**: Check if client is ready with `client.isReady`

### Debug Mode

```javascript
const client = new ChatPulse({
    logLevel: 'debug'  // Enable detailed logging
});
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### v2.0.0
- Complete rewrite with improved stability
- Simplified API for easier usage
- Better error handling and recovery
- Enhanced TypeScript support
- New examples and documentation

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