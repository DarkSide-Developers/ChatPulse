# ChatPulse - Advanced WhatsApp Web API Library

<div align="center">

**A powerful and feature-rich WhatsApp Web automation library**

[![npm version](https://badge.fury.io/js/chatpulse.svg)](https://badge.fury.io/js/chatpulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

</div>

## 🚀 Features

### 🔐 **Authentication Options**
- **QR Code Authentication** - Traditional QR scanning
- **Pairing Code Authentication** - Phone number linking
- **Session Management** - Secure session storage and restoration

### 💬 **Advanced Messaging**
- **Text Messages** - Rich text with markdown support
- **Button Messages** - Interactive button interfaces
- **List Messages** - Organized menu selections
- **Poll Messages** - Create polls with multiple options
- **Contact Sharing** - Share contact information
- **Location Sharing** - Send GPS coordinates
- **Message Reactions** - React with emojis
- **Message Editing** - Edit sent messages
- **Message Forwarding** - Forward messages between chats
- **Message Deletion** - Delete for self or everyone

### 📎 **Media Handling**
- **Images, Videos, Audio** - Full media support
- **Documents** - Send any file type
- **Stickers** - Send and create custom stickers
- **Voice Messages** - Send voice recordings
- **Media Download** - Download received media
- **Media Info** - Get media metadata

### 👥 **Group Management**
- **Create Groups** - Create new WhatsApp groups
- **Add/Remove Participants** - Manage group members
- **Group Settings** - Update description, settings
- **Admin Functions** - Full admin capabilities

### 🛠️ **Chat Management**
- **Archive/Unarchive** - Organize chats
- **Pin/Unpin** - Pin important chats
- **Mute/Unmute** - Control notifications
- **Block/Unblock** - Manage contacts
- **Chat Presence** - Set typing, recording status

### 📊 **Information & Monitoring**
- **Chat Information** - Get detailed chat data
- **Contact Management** - Access contact list
- **Device Information** - Monitor device status
- **Presence Updates** - Track online status
- **Call Monitoring** - Handle incoming calls

## 📦 Installation

```bash
npm install chatpulse
```

## 🏃‍♂️ Quick Start

### Basic Setup

```javascript
const { ChatPulse } = require('chatpulse');

// Initialize with QR authentication
const client = new ChatPulse({
    sessionName: 'my-bot',
    headless: false,
    authStrategy: 'qr'
});

// Handle ready event
client.on('ready', () => {
    console.log('ChatPulse is ready!');
});

// Handle messages
client.on('message', (message) => {
    console.log(`Received: ${message.body}`);
});

// Initialize
client.initialize();
```

### Pairing Code Authentication

```javascript
const client = new ChatPulse({
    sessionName: 'my-bot',
    authStrategy: 'pairing',
    pairingNumber: '+1234567890' // Your phone number
});

client.on('pairing_code', (code) => {
    console.log(`Pairing Code: ${code}`);
    // Enter this code in your WhatsApp mobile app
});
```

## 📖 Advanced Usage

### Button Messages

```javascript
await client.sendButtonMessage(chatId, 
    '🎛️ Choose an option:', 
    [
        { id: 'btn1', text: '📊 Get Info' },
        { id: 'btn2', text: '📱 Status' },
        { id: 'btn3', text: '🎮 Games' }
    ],
    { footer: 'ChatPulse Bot' }
);

// Handle button responses
client.on('button_response', (message) => {
    console.log(`Button pressed: ${message.selectedButtonId}`);
});
```

### List Messages

```javascript
await client.sendListMessage(chatId,
    '📋 Bot Menu',
    'Select Option',
    [
        {
            title: '🤖 Bot Commands',
            rows: [
                { id: 'help', title: 'Help', description: 'Show commands' },
                { id: 'info', title: 'Info', description: 'Bot information' }
            ]
        },
        {
            title: '🎮 Entertainment',
            rows: [
                { id: 'joke', title: 'Joke', description: 'Random joke' },
                { id: 'quote', title: 'Quote', description: 'Inspiration' }
            ]
        }
    ]
);

// Handle list responses
client.on('list_response', (message) => {
    console.log(`Selected: ${message.selectedRowId}`);
});
```

### Poll Messages

```javascript
await client.sendPoll(chatId,
    '🗳️ What\'s your favorite language?',
    ['JavaScript', 'Python', 'Java', 'C++'],
    { multipleAnswers: false }
);

// Handle poll updates
client.on('poll_update', (message) => {
    console.log('Poll update:', message);
});
```

### Media Messages

```javascript
// Send image with caption
await client.sendMedia(chatId, './image.jpg', {
    caption: 'Check this out! 📸',
    mentions: ['1234567890@c.us']
});

// Send sticker
await client.sendSticker(chatId, './sticker.webp');

// Send voice message
await client.sendVoiceMessage(chatId, './audio.mp3', {
    duration: 30
});

// Download media
const mediaPath = await client.mediaHandler.downloadMedia(message);
console.log(`Media saved to: ${mediaPath}`);
```

### Contact & Location

```javascript
// Send contact
await client.sendContact(chatId, {
    name: 'John Doe',
    number: '+1234567890',
    organization: 'Company Inc.',
    email: 'john@example.com'
});

// Send location
await client.sendLocation(chatId, 
    40.7128, -74.0060, 
    '📍 New York City'
);
```

### Message Management

```javascript
// React to message
await client.reactToMessage(messageId, '❤️');

// Edit message
await client.editMessage(messageId, 'Updated text');

// Delete message
await client.deleteMessage(messageId, true); // true = for everyone

// Forward message
await client.forwardMessage(targetChatId, messageId);

// Star message
await client.starMessage(messageId, true);
```

### Chat Management

```javascript
// Archive chat
await client.archiveChat(chatId, true);

// Pin chat
await client.pinChat(chatId, true);

// Mute chat (1 hour)
await client.muteChat(chatId, 3600000);

// Set typing indicator
await client.setChatPresence(chatId, 'typing');

// Block contact
await client.blockContact(contactId, true);
```

### Group Management

```javascript
// Create group
const group = await client.createGroup('My Group', [
    '1234567890@c.us',
    '0987654321@c.us'
]);

// Add participants
await client.addParticipants(groupId, ['1111111111@c.us']);

// Remove participants
await client.removeParticipants(groupId, ['1111111111@c.us']);

// Set group description
await client.setGroupDescription(groupId, 'Welcome to our group!');
```

### Information Retrieval

```javascript
// Get chat info
const chatInfo = await client.getChatInfo(chatId);
console.log(chatInfo);

// Get all chats
const chats = await client.getChats();

// Get contacts
const contacts = await client.getContacts();

// Get device info
const deviceInfo = await client.getDeviceInfo();

// Get profile picture
const profileUrl = await client.getProfilePicUrl(contactId);
```

## ⚙️ Configuration Options

```javascript
const client = new ChatPulse({
    sessionName: 'my-bot',              // Session identifier
    headless: true,                     // Browser headless mode
    userDataDir: './sessions',          // Session storage directory
    autoReconnect: true,                // Auto-reconnection
    reconnectInterval: 30000,           // Reconnection interval (ms)
    authStrategy: 'qr',                 // 'qr' or 'pairing'
    pairingNumber: '+1234567890',       // For pairing auth
    markOnlineOnConnect: true,          // Mark as online
    syncFullHistory: false,             // Sync message history
    puppeteerOptions: {                 // Custom Puppeteer options
        args: ['--no-sandbox']
    }
});
```

## 🎯 Event System

```javascript
// Connection events
client.on('ready', () => {});
client.on('connected', () => {});
client.on('disconnected', () => {});
client.on('qr_generated', (qrInfo) => {});
client.on('pairing_code', (code) => {});

// Message events
client.on('message', (message) => {});
client.on('message_sent', (result) => {});
client.on('button_response', (message) => {});
client.on('list_response', (message) => {});
client.on('poll_update', (message) => {});

// Media events
client.on('media_sent', (result) => {});
client.on('sticker_sent', (result) => {});
client.on('voice_sent', (result) => {});

// Chat events
client.on('presence_update', (presence) => {});
client.on('call', (call) => {});
client.on('group_update', (update) => {});

// Error handling
client.on('error', (error) => {});
```

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/DarkSide-Developers/ChatPulse.git
cd ChatPulse

# Install dependencies
npm install

# Run advanced example
npm run dev

# Run basic example
npm run basic
```

## 📁 Project Structure

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
├── examples/
│   ├── basic-bot.js    # Basic bot example
│   └── advanced-bot.js # Advanced features example
└── README.md
```

## 🎯 Use Cases

- **🤖 Advanced Chatbots** - Interactive bots with buttons and menus
- **📢 Notification Systems** - Rich notifications with media
- **🎮 Interactive Applications** - Games and entertainment bots
- **📊 Business Automation** - Customer service and support
- **👥 Group Management** - Automated group administration
- **📱 Multi-device Support** - Cross-platform messaging

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👥 Authors

- **DarkWinzo** - *Lead Developer* - [GitHub](https://github.com/DarkWinzo)
- **DarkSide Developer Team** - [GitHub](https://github.com/DarkSide-Developers)

## 📞 Support

- **Email**: isurulakshan9998@gmail.com
- **Issues**: [GitHub Issues](https://github.com/DarkSide-Developers/ChatPulse/issues)

## ⚠️ Disclaimer

This project is not affiliated with WhatsApp. Use responsibly and in accordance with WhatsApp's Terms of Service.

---

<div align="center">

**Made with ❤️ by [DarkSide Developer Team](https://github.com/DarkSide-Developers)**

© 2025 DarkSide Developer Team. All rights reserved.

</div>