# ChatPulse - WhatsApp Web API Library

<div align="center">

**A simple and powerful WhatsApp Web automation library**

[![npm version](https://badge.fury.io/js/chatpulse.svg)](https://badge.fury.io/js/chatpulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

</div>

## 🚀 Features

- **📱 WhatsApp Web Integration** - Connect to WhatsApp Web seamlessly
- **💬 Message Handling** - Send and receive text messages
- **📎 Media Support** - Send and download images, videos, audio, and documents
- **🔐 Session Management** - Secure session storage and restoration
- **📱 QR Code Support** - Multiple QR code output formats
- **🔄 Auto-Reconnection** - Automatic reconnection on disconnect
- **📝 Comprehensive Logging** - Built-in logging system

## 📦 Installation

```bash
npm install chatpulse
```

## 🏃‍♂️ Quick Start

```javascript
const { ChatPulse } = require('chatpulse');

// Initialize ChatPulse
const client = new ChatPulse({
    sessionName: 'my-bot',
    headless: false, // Set to true for production
    autoReconnect: true
});

// Handle incoming messages
client.on('message', (message) => {
    console.log(`Received: ${message.body} from ${message.from}`);
});

// Handle ready event
client.on('ready', () => {
    console.log('ChatPulse is ready!');
});

// Initialize and connect
client.initialize().then(() => {
    console.log('ChatPulse initialized successfully');
}).catch(error => {
    console.error('Failed to initialize:', error);
});
```

## 📖 Documentation

### Basic Usage

#### Sending Messages

```javascript
// Send text message
await client.sendMessage('1234567890@c.us', 'Hello World!');

// Send message with options
await client.sendMessage('1234567890@c.us', 'Hello!', {
    linkPreview: false,
    mentions: ['1234567890@c.us']
});
```

#### Sending Media

```javascript
// Send image
await client.sendMedia('1234567890@c.us', './image.jpg', {
    caption: 'Check this out!'
});

// Send document
await client.sendMedia('1234567890@c.us', './document.pdf', {
    filename: 'Important Document.pdf'
});
```

#### Getting Chat Information

```javascript
// Get chat info
const chatInfo = await client.getChatInfo('1234567890@c.us');
console.log(chatInfo);

// Get all chats
const chats = await client.getChats();
console.log(chats);
```

### Event Handling

```javascript
// Message received
client.on('message', (message) => {
    console.log('New message:', message);
});

// Connected to WhatsApp
client.on('connected', () => {
    console.log('Connected to WhatsApp Web');
});

// Disconnected
client.on('disconnected', () => {
    console.log('Disconnected from WhatsApp Web');
});

// QR code generated
client.on('qr_generated', (qrInfo) => {
    console.log('QR code generated:', qrInfo.formats.png);
});

// Ready to use
client.on('ready', () => {
    console.log('ChatPulse is ready!');
});

// Error occurred
client.on('error', (error) => {
    console.error('Error:', error);
});
```

### Configuration

```javascript
const client = new ChatPulse({
    sessionName: 'my-bot',           // Session identifier
    headless: true,                  // Run browser in headless mode
    userDataDir: './sessions',       // Session storage directory
    autoReconnect: true,             // Enable auto-reconnection
    reconnectInterval: 30000         // Reconnection interval (ms)
});
```

### Environment Variables

Create a `.env` file in your project root:

```env
# Session Configuration
HEADLESS=true

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIR=./logs
```

## 🛠️ Development

### Setting up Development Environment

```bash
# Clone the repository
git clone https://github.com/DarkSide-Developers/ChatPulse.git
cd ChatPulse

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Project Structure

```
ChatPulse/
├── lib/
│   ├── core/           # Core ChatPulse functionality
│   ├── handlers/       # Message and media handlers
│   ├── session/        # Session management
│   ├── media/          # Media handling
│   ├── events/         # Event system
│   ├── utils/          # Utility functions
│   └── index.js        # Main exports
├── examples/           # Usage examples
│   └── basic-bot.js
├── README.md
└── package.json
```

## 🎯 Use Cases

ChatPulse is perfect for building:

- **🤖 Chatbots** - Automated customer service and support
- **📢 Notification Systems** - Send alerts and updates
- **🔄 Automation** - Automate repetitive messaging tasks
- **📊 Data Collection** - Collect responses and feedback
- **🎮 Interactive Bots** - Games and entertainment

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors & Maintainers

- **DarkWinzo** - *Lead Developer* - [GitHub](https://github.com/DarkWinzo)
- **DarkSide Developer Team** - *Organization* - [GitHub](https://github.com/DarkSide-Developers)

## 📞 Support & Contact

- **Email**: isurulakshan9998@gmail.com
- **GitHub Issues**: [Report Issues](https://github.com/DarkSide-Developers/ChatPulse/issues)

## ⚠️ Disclaimer

This project is not affiliated with, authorized, maintained, sponsored or endorsed by WhatsApp or any of its affiliates or subsidiaries. This is an independent and unofficial software. Use at your own risk.

---

<div align="center">

**Made with ❤️ by [DarkSide Developer Team](https://github.com/DarkSide-Developers)**

© 2025 DarkSide Developer Team. All rights reserved.

</div>