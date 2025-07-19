# ChatPulse - Advanced WhatsApp Web API Library

<div align="center">

![ChatPulse Logo](https://via.placeholder.com/200x200/4CAF50/FFFFFF?text=ChatPulse)

**A powerful, modular, and production-ready WhatsApp Web automation library**

[![npm version](https://badge.fury.io/js/chatpulse.svg)](https://badge.fury.io/js/chatpulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![GitHub Issues](https://img.shields.io/github/issues/DarkSide-Developers/ChatPulse)](https://github.com/DarkSide-Developers/ChatPulse/issues)
[![GitHub Stars](https://img.shields.io/github/stars/DarkSide-Developers/ChatPulse)](https://github.com/DarkSide-Developers/ChatPulse/stargazers)

</div>

## 🚀 Features

### 🔥 **2025 Modern Features**
- **🚀 Advanced Connection Methods** - QR code, pairing code, multi-device, auto-detection
- **⚡ Real-time WebSocket** - Live message updates, presence, typing indicators
- **📱 Multi-Device Support** - WhatsApp's latest multi-device architecture
- **🎯 Modern Message Types** - Polls, reactions, ephemeral messages, editing, forwarding
- **🏢 Business Features** - Products, catalogs, payments, orders, analytics
- **👥 Advanced Group Management** - Complete admin controls and participant management
- **🔌 Plugin-Based Architecture** - Modular command and event handling system
- **📱 Multi-Session Support** - Handle multiple WhatsApp accounts simultaneously
- **🔐 Secure Session Management** - Encrypted session storage with auto-restore
- **📨 Rich Message Types** - Text, media, buttons, lists, contacts, locations
- **🎯 Advanced Event System** - Comprehensive event handling with priorities
- **🌐 Multi-Language Support** - Built-in i18n support (English/Sinhala)
- **📊 Media Processing** - Image, video, audio, document, sticker handling
- **🔄 Auto-Reconnection** - Resilient connection management with fallback strategies
- **📝 Comprehensive Logging** - Advanced logging with file output and rotation
- **🎨 QR Code Management** - Multiple QR code output formats and pairing codes

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
    autoReconnect: true,
    language: 'en'
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
client.initializeAdvanced({
    multiDevice: true,
    websocket: true,
    strategy: 'auto' // auto, qr, pairing, multidevice
}).then(() => {
    console.log('ChatPulse initialized successfully');
}).catch(error => {
    console.error('Failed to initialize:', error);
});
```

## 📖 Documentation

### Basic Usage

#### Advanced Initialization

```javascript
// Initialize with modern features
await client.initializeAdvanced({
    multiDevice: true,        // Enable multi-device support
    websocket: true,          // Enable real-time WebSocket
    strategy: 'auto',         // Connection strategy: auto, qr, pairing
    timeout: 120000,          // Connection timeout
    enableFallback: true      // Enable fallback strategies
});
```

#### Sending Messages

```javascript
// Send text message
await client.sendMessage('1234567890@c.us', 'Hello World!');

// Send message with options
await client.sendMessage('1234567890@c.us', 'Hello!', {
    linkPreview: false,
    mentions: ['1234567890@c.us'],
    ephemeral: true,          // Disappearing message
    ephemeralDuration: 86400  // 24 hours
});

// Send poll
await client.messageHandler.sendPoll(
    '1234567890@c.us',
    'What\'s your favorite color?',
    ['Red', 'Blue', 'Green'],
    { multipleAnswers: false }
);

// Send location
await client.messageHandler.sendLocation(
    '1234567890@c.us',
    40.7128, -74.0060,
    { name: 'New York City' }
);

// Send contact
await client.messageHandler.sendContact(
    '1234567890@c.us',
    {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com'
    }
);

// React to message
await client.messageHandler.reactToMessage(messageId, '👍');

// Edit message
await client.messageHandler.editMessage(messageId, 'Updated text');

// Forward message
await client.messageHandler.forwardMessage(messageId, ['chat1', 'chat2']);
```

#### Modern Message Features

```javascript
// Send ephemeral (disappearing) message
await client.messageHandler.sendEphemeralMessage(
    '1234567890@c.us',
    'This message will disappear',
    604800 // 7 days
);

// Pin/unpin message
await client.messageHandler.pinMessage(messageId, true);

// Star/unstar message
await client.messageHandler.starMessage(messageId, true);
```

#### Business Features

```javascript
// Send product
await client.messageHandler.sendProduct('1234567890@c.us', {
    id: 'prod_123',
    businessJid: 'business@c.us',
    title: 'Amazing Product',
    description: 'Product description',
    price: 99.99,
    currency: 'USD'
});

// Send payment request
await client.messageHandler.sendPayment('1234567890@c.us', {
    amount: 50.00,
    currency: 'USD',
    note: 'Payment for services'
});

// Get business catalog
const catalog = await client.businessHandler.getBusinessCatalog('business@c.us');
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

// Send sticker
await client.mediaHandler.sendSticker('1234567890@c.us', './image.png');

// Send voice note
await client.mediaHandler.sendVoiceNote('1234567890@c.us', './audio.mp3');

// Download media from message
const filePath = await client.mediaHandler.downloadMedia(message, './downloads/');
```

#### Interactive Messages

```javascript
// Send button message
await client.messageHandler.sendButtonMessage(
    '1234567890@c.us',
    'Choose an option:',
    [
        { id: 'btn1', text: 'Option 1' },
        { id: 'btn2', text: 'Option 2' }
    ]
);

// Send list message
await client.messageHandler.sendListMessage(
    '1234567890@c.us',
    'Select from menu:',
    'View Menu',
    [
        {
            title: 'Main Dishes',
            rows: [
                { id: 'dish1', title: 'Pizza', description: 'Delicious pizza' },
                { id: 'dish2', title: 'Burger', description: 'Tasty burger' }
            ]
        }
    ]
);
```

#### Group Management

```javascript
// Create group
const group = await client.groupHandler.createGroup(
    'My Group',
    ['1234567890', '0987654321'],
    { description: 'Group description' }
);

// Add participants
await client.groupHandler.addParticipants(groupId, ['1111111111']);

// Remove participants
await client.groupHandler.removeParticipants(groupId, ['1111111111']);

// Promote to admin
await client.groupHandler.promoteParticipants(groupId, ['1234567890']);

// Update group settings
await client.groupHandler.updateGroupSettings(groupId, {
    name: 'New Group Name',
    description: 'New description',
    restrictedMode: true
});

// Get group invite link
const inviteLink = await client.groupHandler.getGroupInviteLink(groupId);

// Join group by invite
await client.groupHandler.joinGroupByInvite(inviteLink);
```

#### Real-time Features

```javascript
// Subscribe to presence updates
await client.wsHandler.subscribeToPresence('1234567890@c.us');

// Send typing indicator
await client.wsHandler.sendTyping('1234567890@c.us', true);

// Mark message as read
await client.wsHandler.markAsRead(messageId, chatId);

// Handle real-time events
client.on('presence_update', (presence) => {
    console.log(`${presence.from} is ${presence.status}`);
});

client.on('typing', (typing) => {
    console.log(`${typing.from} is typing...`);
});

client.on('message_realtime', (message) => {
    console.log('Real-time message received');
});
```

### Plugin System

ChatPulse features a powerful plugin system for extending functionality.

#### Creating a Plugin

```javascript
// plugins/echo.js
class EchoPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'echo';
        this.version = '1.0.0';
        this.description = 'Echo messages back to sender';
        this.author = 'Your Name';
        
        this.commands = [
            {
                name: 'echo',
                description: 'Echo a message',
                usage: '!echo <message>',
                aliases: ['repeat'],
                handler: this.handleEcho
            }
        ];
        
        this.events = {
            message: this.onMessage
        };
    }
    
    async handleEcho(context) {
        const { args, reply } = context;
        const message = args.join(' ');
        
        if (!message) {
            return reply('Please provide a message to echo!');
        }
        
        await reply(`Echo: ${message}`);
    }
    
    async onMessage(message) {
        // Handle all incoming messages
        console.log(`Message received: ${message.body}`);
    }
    
    async initialize() {
        console.log('Echo plugin initialized');
    }
    
    async cleanup() {
        console.log('Echo plugin cleaned up');
    }
}

module.exports = EchoPlugin;
```

#### Loading Plugins

Plugins are automatically loaded from the `plugins/` directory when ChatPulse starts.

```javascript
// Manually load a plugin
await client.pluginManager.loadPlugin('echo.js');

// Get loaded plugins
const plugins = client.pluginManager.getLoadedPlugins();

// Get available commands
const commands = client.pluginManager.getAvailableCommands();
```

### Advanced Connection Methods

```javascript
// Auto-detect best connection method
await client.connectionManager.connect('auto');

// Use specific connection strategy
await client.connectionManager.connect('pairing'); // or 'qr', 'multidevice'

// Handle pairing code
client.on('pairing_code', (code) => {
    console.log(`Pairing code: ${code}`);
    // Display code to user for pairing
});

// Handle device linking
client.on('device_linked', (device) => {
    console.log(`Device linked: ${device.name}`);
});
```

### Message Formatting

```javascript
const { MessageFormatter } = require('chatpulse');

// Rich text formatting
const formatted = MessageFormatter.multiLine([
    { text: 'Bold Title', bold: true },
    { text: 'Italic subtitle', italic: true },
    { text: 'Strikethrough text', strikethrough: true },
    { text: 'Monospace code', monospace: true }
]);

// Create tables
const table = MessageFormatter.table(
    ['Name', 'Status', 'Score'],
    [
        ['Alice', 'Active', '95'],
        ['Bob', 'Inactive', '87']
    ]
);

// Progress bars
const progress = MessageFormatter.progressBar(75, 20);

// Notifications
const notification = MessageFormatter.notification(
    'success',
    'Task Complete',
    'Your task has been completed successfully!'
);
```

### Session Management

```javascript
// Check if session exists
const exists = await client.sessionManager.sessionExists();

// Create new session
await client.sessionManager.createSession();

// Delete session
await client.sessionManager.deleteSession();

// List all sessions
const sessions = await client.sessionManager.listSessions();

// Backup session
await client.sessionManager.backupSession('./backup.zip');

// Restore session
await client.sessionManager.restoreSession('./backup.zip');
```

### Multi-Device Support

```javascript
// Initialize multi-device
await client.multiDevice.initialize();

// Link new device
const deviceId = await client.multiDevice.linkDevice({
    name: 'My Computer',
    platform: 'web'
});

// Get linked devices
const devices = client.multiDevice.getLinkedDevices();

// Sync data across devices
await client.multiDevice.syncData({
    contacts: contactList,
    settings: userSettings
});
```

### Event Handling

```javascript
// Basic event handling
client.on('message', (message) => {
    console.log('New message:', message);
});

// Event with priority
client.on('message', (message) => {
    console.log('High priority handler');
}, { priority: 10 });

// One-time event
client.once('ready', () => {
    console.log('ChatPulse is ready!');
});

// Event with namespace
client.on('message', handler, { namespace: 'myPlugin' });

// Remove all listeners for namespace
client.removeAllListeners(null, 'myPlugin');
```

### Available Events

- `ready` - ChatPulse is ready to use
- `connected` - Connected to WhatsApp Web
- `disconnected` - Disconnected from WhatsApp Web
- `message` - New message received
- `message_sent` - Message sent successfully
- `media_sent` - Media sent successfully
- `qr_generated` - QR code generated
- `qr_updated` - QR code updated
- `qr_cleared` - QR code cleared
- `pairing_code` - Pairing code generated
- `device_linked` - New device linked
- `device_unlinked` - Device unlinked
- `websocket_connected` - WebSocket connected
- `websocket_disconnected` - WebSocket disconnected
- `message_realtime` - Real-time message received
- `presence_update` - Contact presence updated
- `typing` - Typing indicator received
- `message_receipt` - Message receipt received
- `message_edited` - Message edited
- `message_forwarded` - Message forwarded
- `group_created` - Group created
- `participants_added` - Participants added to group
- `participants_removed` - Participants removed from group
- `error` - Error occurred

## 🔧 Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Session Configuration
SESSION_ENCRYPTION_KEY=your-encryption-key-here
COMMAND_PREFIX=!

# Connection Configuration
CONNECTION_STRATEGY=auto
CONNECTION_TIMEOUT=120000
ENABLE_MULTIDEVICE=true
ENABLE_WEBSOCKET=true

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIR=./logs

# WhatsApp Configuration
HEADLESS=true
AUTO_RECONNECT=true
RECONNECT_INTERVAL=30000
```

### Advanced Configuration

```javascript
const client = new ChatPulse({
    sessionName: 'advanced-bot',
    headless: true,
    userDataDir: './custom-sessions',
    autoReconnect: true,
    reconnectInterval: 30000,
    language: 'en',
    multiDevice: true,
    websocket: true,
    puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});
```

## 🌟 What's New in 2025

ChatPulse has been completely rebuilt for 2025 with cutting-edge WhatsApp features:

### 🚀 **Modern Connection Methods**
- **Auto-Detection**: Automatically chooses the best connection method
- **Pairing Codes**: Faster authentication without QR scanning
- **Multi-Device**: Native support for WhatsApp's multi-device architecture
- **Fallback Strategies**: Automatic fallback if primary method fails

### ⚡ **Real-Time Features**
- **WebSocket Integration**: Live message updates and presence
- **Typing Indicators**: Real-time typing status
- **Presence Updates**: Online/offline status monitoring
- **Message Receipts**: Delivery and read confirmations

### 🎯 **Advanced Message Types**
- **Interactive Polls**: Create polls with multiple options
- **Ephemeral Messages**: Disappearing messages with custom duration
- **Message Reactions**: React to messages with emojis
- **Message Editing**: Edit sent messages (within time limit)
- **Message Forwarding**: Forward messages to multiple chats
- **Live Locations**: Share real-time location updates

### 🏢 **Business Features**
- **Product Catalogs**: Send product listings and catalogs
- **Payment Requests**: Request payments through WhatsApp
- **Order Management**: Handle orders and track status
- **Business Analytics**: Get insights and metrics
- **Away Messages**: Automated responses during off-hours

### 👥 **Group Management 2.0**
- **Advanced Admin Controls**: Complete group administration
- **Participant Management**: Add, remove, promote, demote members
- **Group Settings**: Control restrictions and announcements
- **Invite Management**: Generate and revoke invite links
- **Group Analytics**: Track group activity and engagement

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

# Run tests
npm test

# Build the project
npm run build
```

### Project Structure

```
ChatPulse/
├── lib/
│   ├── core/           # Core ChatPulse functionality
│   │   ├── ChatPulse.js
│   │   ├── ConnectionManager.js
│   │   ├── WebSocketHandler.js
│   │   └── MultiDeviceHandler.js
│   ├── handlers/       # Message and event handlers
│   │   ├── MessageHandler.js
│   │   ├── GroupHandler.js
│   │   └── BusinessHandler.js
│   ├── plugins/        # Plugin management system
│   ├── session/        # Session management
│   ├── media/          # Media handling
│   ├── events/         # Event system
│   ├── utils/          # Utility functions
│   │   ├── Logger.js
│   │   ├── QRHandler.js
│   │   └── MessageFormatter.js
│   └── index.js        # Main exports
├── examples/           # Usage examples
│   ├── basic-bot.js
│   └── advanced-bot.js
├── tests/              # Test files
├── docs/               # Documentation
├── plugins/            # Default plugins
│   ├── help.js
│   ├── system.js
│   └── advanced.js
└── README.md
```

## 🎯 Use Cases

ChatPulse is perfect for building:

### 🤖 **Chatbots & Automation**
- Customer service bots
- Order processing automation
- FAQ and support systems
- Notification systems

### 🏢 **Business Solutions**
- E-commerce integration
- Payment processing
- Inventory management
- Customer relationship management

### 👥 **Community Management**
- Group moderation bots
- Event management
- Announcement systems
- Member engagement tools

### 📊 **Analytics & Monitoring**
- Message analytics
- User engagement tracking
- Business metrics
- Performance monitoring

### 🔧 **Custom Applications**
- Integration with existing systems
- Workflow automation
- Data collection and processing
- Multi-platform messaging

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Guidelines

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Use meaningful commit messages
5. Create pull requests for review

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors & Maintainers

- **DarkWinzo** - *Lead Developer* - [GitHub](https://github.com/DarkWinzo)
- **DarkSide Developer Team** - *Organization* - [GitHub](https://github.com/DarkSide-Developers)

## 📞 Support & Contact

- **Email**: isurulakshan9998@gmail.com
- **GitHub Issues**: [Report Issues](https://github.com/DarkSide-Developers/ChatPulse/issues)
- **GitHub Discussions**: [Join Discussions](https://github.com/DarkSide-Developers/ChatPulse/discussions)

## 🙏 Acknowledgments

- WhatsApp for providing the Web interface
- Puppeteer team for the excellent browser automation library
- All contributors and users of ChatPulse

## ⚠️ Disclaimer

This project is not affiliated with, authorized, maintained, sponsored or endorsed by WhatsApp or any of its affiliates or subsidiaries. This is an independent and unofficial software. Use at your own risk.

WhatsApp is a trademark of Meta Platforms, Inc. This project is an unofficial library and is not endorsed by Meta.

---

<div align="center">

**🚀 Ready for 2025 • Built for Scale • Production Ready**

**Made with ❤️ by [DarkSide Developer Team](https://github.com/DarkSide-Developers)**

© 2025 DarkSide Developer Team. All rights reserved.

</div>